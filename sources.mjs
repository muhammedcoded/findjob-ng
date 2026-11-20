import {db} from './db.mjs';
import {normalizeJob,parseRss,urlOk,applicationUrlOk,clean,textFromHtml,sanitizeDescriptionHtml,extractApplicationDestination,fingerprint,eligibility} from './lib.mjs';

const allowedMyJobMagHosts=new Set(['www.myjobmag.com','myjobmag.com']);

async function fetchMyJobMag(url,accept='text/html',redirects=0){
 const u=new URL(url);
 if(u.protocol!=='https:'||!allowedMyJobMagHosts.has(u.hostname))throw new Error('MyJobMag URL is not on the approved host list');
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
 try{
  const r=await fetch(u.href,{signal:ctrl.signal,redirect:'manual',headers:{'User-Agent':'FindjobNG/2.0 (+https://findjob.ng; job feed reader)','Accept':accept}});
  if([301,302,303,307,308].includes(r.status)){
   if(redirects>=3)throw new Error('Too many MyJobMag redirects');
   const next=new URL(r.headers.get('location')||'',u);
   if(next.protocol!=='https:'||!allowedMyJobMagHosts.has(next.hostname))throw new Error('MyJobMag redirected outside its approved domain');
   return await fetchMyJobMag(next.href,accept,redirects+1);
  }
  if(!r.ok)throw new Error(`MyJobMag HTTP ${r.status}`);
  return (await r.text()).slice(0,2200000);
 }finally{clearTimeout(timer);}
}
function norm(s){return clean(s,500).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function titleCompany(raw){
 const title=clean(raw,180);
 const m=title.match(/^(.*?)\s+at\s+(.+)$/i);
 return m?{title:clean(m[1],160),company:clean(m[2],130)}:{title,company:'Employer not specified'};
}
function headingText(html){return textFromHtml(html).replace(/\s+/g,' ').trim();}
function extractMeta(html,label){
 const lis=html.match(/<li\b[^>]*>[\s\S]*?<\/li>/gi)||[];
 for(const li of lis){
  const t=headingText(li);
  const m=t.match(new RegExp('^'+label+'\\s*[:\\-]?\\s*(.+)$','i'));
  if(m)return clean(m[1],180);
 }
 return '';
}
function applicationFromHtml(html,title){
 const method=html.search(/<h[1-6]\b[^>]*>\s*Method\s+of\s+Application\s*<\/h[1-6]>/i);
 const tail=method>=0?html.slice(method,method+9000):html.slice(-5000);
 const plain=textFromHtml(tail);
 const email=plain.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
 if(email){
  const suppliedSubject=plain.match(/subject\s+line\s*[:\-]\s*([^\n.]+)/i)?.[1]?.trim();
  const subject=encodeURIComponent((suppliedSubject||title).replace(/[.\s]+$/,''));
  return `mailto:${email}?subject=${subject}`;
 }
 const anchors=[...tail.matchAll(/<a\b([^>]*)href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi)];
 for(const a of anchors){
  const href=(a[2]||a[3]||a[4]||'').replace(/&amp;/g,'&').trim();
  if(!urlOk(href))continue;
  const u=new URL(href);
  if(allowedMyJobMagHosts.has(u.hostname)||/doubleclick|googlesyndication|googleadservices|facebook|linkedin|twitter|telegram/i.test(u.hostname))continue;
  const label=headingText(a[5]);
  const context=headingText(tail.slice(Math.max(0,a.index-180),a.index+420));
  if(/apply|career|application|recruit|submit|job/i.test(`${label} ${context}`))return u.href;
 }
 return '';
}
export function parseMyJobMagDetail(html,rawTitle,sourceUrl){
 const h=[...String(html).matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
 const target=norm(rawTitle);
 const start=h.find(x=>{const t=norm(x[2]);return t===target||t.includes(target)||target.includes(t);});
 if(!start)return null;
 const startAt=start.index;
 const later=h.filter(x=>x.index>startAt);
 const stop=later.find(x=>/jobs you might be interested|related jobs|related companies|career advice|featured jobs/i.test(headingText(x[2])));
 let section=String(html).slice(startAt,stop?.index??Math.min(String(html).length,startAt+60000));
 section=section.replace(/^\s*<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/i,'');
 section=section.replace(/Posted\s*:\s*[^<\n]+|Expires\s*:\s*[^<\n]+/gi,'');
 section=section.replace(/<a\b[^>]*>\s*(?:Check how your CV matches this job|Build your CV for free|Download in different templates|View Jobs in [\s\S]*?|Save|Share|Facebook|LinkedIn|Copy link|Report job)[\s\S]*?<\/a>/gi,'');
 section=section.replace(/<[^>]*(?:class|id)=["'][^"']*(?:advert|ads|social|share|subscribe|newsletter|promo)[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi,'');
 const appUrl=extractApplicationDestination(section,rawTitle);
 const details=titleCompany(rawTitle);
 const beforeHeading=textFromHtml(String(html).slice(Math.max(0,startAt-5000),startAt));
 const expiryText=beforeHeading.match(/Expires\s*:\s*([^\n]+)/i)?.[1]?.trim()||'';
 const expires_at=expiryText&&!/not specified|not available|none/i.test(expiryText)&&!Number.isNaN(Date.parse(expiryText))?new Date(expiryText).toISOString():null;
 const location=extractMeta(section,'Location')||'Nigeria';
 const description=sanitizeDescriptionHtml(section,26000);
 if(!description||textFromHtml(description).length<120)return null;
 return {title:details.title,company:details.company,location,description,apply_url:applicationUrlOk(appUrl)?appUrl:'',source_url:sourceUrl,expires_at};
}
async function mapLimit(items,limit,fn){
 const out=new Array(items.length);let next=0;
 await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
  while(true){const i=next++;if(i>=items.length)return;try{out[i]=await fn(items[i],i)}catch{out[i]=null;}}
 }));
 return out;
}
export async function fromMyJobMag(){
 const xml=await fetchMyJobMag('https://www.myjobmag.com/feeds/ng/jobsxml.xml','application/rss+xml, application/xml, text/xml');
 const items=parseRss(xml);
 const enriched=await mapLimit(items,4,async item=>{
  let details=null;
  try{const html=await fetchMyJobMag(item.link);details=parseMyJobMagDetail(html,item.title,item.link);}catch(e){console.warn('MyJobMag detail fetch skipped',item.link,String(e.message).slice(0,120));}
  const split=titleCompany(item.title);
  return normalizeJob({
   title:details?.title||split.title,company:details?.company||split.company,location:details?.location||'Nigeria',
   description:details?.description||item.description,source_url:item.link,apply_url:details?.apply_url||'',expires_at:details?.expires_at||null,
   source_key:'myjobmag',external_id:item.guid||item.link,posted_at:item.pubDate
  });
 });
 return enriched.filter(Boolean);
}
function listEnv(name,fallback=''){
 return String(process.env[name]??fallback).split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).slice(0,30);
}
function humanCompany(slug){
 const known={canonical:'Canonical',weloglobal:'Welo Global',automattic:'Automattic',buffer:'Buffer',zapier:'Zapier',kraken:'Kraken',gitlab:'GitLab',supabase:'Supabase',elevenlabs:'ElevenLabs',appwrite:'Appwrite'};
 return known[slug.toLowerCase()]||slug.replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}
export function explicitWorldwide(value=''){
 const s=clean(value,10000).toLowerCase().replace(/[–—]/g,'-');
 return /\b(worldwide|work from anywhere|anywhere in the world|open to all countries|all countries|globally remote)\b/.test(s);
}
function isRemoteText(value=''){
 return /\b(remote|home[- ]based|work from anywhere|fully distributed)\b/i.test(clean(value,10000));
}
async function fetchJson(url,label){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),15000);
 try{
  const r=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json','User-Agent':'FindjobNG/2.2 (+https://findjob.ng; public employer career feed)'}});
  if(!r.ok)throw new Error(`${label} HTTP ${r.status}`);
  return await r.json();
 }finally{clearTimeout(timer);}
}
function remoteRecord({provider,slug,id,title,company,location,description,source,apply,posted,remote,workplaceType}){
 const evidence=[location,description].join(' ');
 if(!remote||!explicitWorldwide(location)||eligibility(evidence)==='restricted')return null;
 if(!urlOk(source)||!urlOk(apply))return null;
 return normalizeJob({
  title,company:company||humanCompany(slug),location:'Worldwide',description,
  source_url:source,apply_url:apply,source_key:'remote_ats',
  external_id:`${provider}:${slug}:${id||source}`,posted_at:posted,remote:true
 });
}
async function greenhouseBoard(slug){
 const data=await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`,`Greenhouse ${slug}`);
 const jobs=Array.isArray(data.jobs)?data.jobs:[];
 return jobs.map(j=>{
  const location=[j.location?.name,...(j.offices||[]).map(o=>o.location||o.name)].filter(Boolean).join(' / ');
  const description=j.content||j.description||'';
  const remote=isRemoteText(location)||isRemoteText(description.slice(0,5000));
  const url=String(j.absolute_url||'').trim();
  return remoteRecord({provider:'greenhouse',slug,id:j.id,title:j.title,company:humanCompany(slug),location,description,source:url,apply:url,posted:j.first_published||j.updated_at,remote});
 }).filter(Boolean);
}
async function leverBoard(slug){
 const data=await fetchJson(`https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`,`Lever ${slug}`);
 const jobs=Array.isArray(data)?data:[];
 return jobs.map(j=>{
  const cats=j.categories||{};
  const locations=[cats.location,...(Array.isArray(cats.allLocations)?cats.allLocations:[cats.allLocations]),j.workplaceType].filter(Boolean).join(' / ');
  const description=[j.description,j.descriptionBody,j.opening,j.additional,...(j.lists||[]).map(x=>x.content)].filter(Boolean).join('\n');
  const remote=String(j.workplaceType||'').toLowerCase()==='remote'||isRemoteText(locations);
  return remoteRecord({provider:'lever',slug,id:j.id,title:j.text,company:humanCompany(slug),location:locations,description,source:j.hostedUrl,apply:j.applyUrl,posted:j.createdAt?new Date(j.createdAt).toISOString():null,remote});
 }).filter(Boolean);
}
async function ashbyBoard(slug){
 const data=await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`,`Ashby ${slug}`);
 const jobs=Array.isArray(data.jobs)?data.jobs:[];
 return jobs.filter(j=>j.isListed!==false).map(j=>{
  const locations=[j.location,...(j.secondaryLocations||[]).map(x=>x.location),j.workplaceType].filter(Boolean).join(' / ');
  const description=j.descriptionHtml||j.descriptionPlain||'';
  const remote=String(j.workplaceType||'').toLowerCase()==='remote';
  return remoteRecord({provider:'ashby',slug,id:j.id,title:j.title,company:humanCompany(slug),location:locations,description,source:j.jobUrl,apply:j.applyUrl,posted:j.publishedAt,remote});
 }).filter(Boolean);
}
export async function fromFreeRemoteAts(){
 const boards=[
  ...listEnv('REMOTE_GREENHOUSE_BOARDS','canonical').map(slug=>({name:`Greenhouse ${slug}`,run:()=>greenhouseBoard(slug)})),
  ...listEnv('REMOTE_LEVER_SITES','weloglobal').map(slug=>({name:`Lever ${slug}`,run:()=>leverBoard(slug)})),
  ...listEnv('REMOTE_ASHBY_BOARDS','').map(slug=>({name:`Ashby ${slug}`,run:()=>ashbyBoard(slug)}))
 ];
 const settled=await Promise.allSettled(boards.map(b=>b.run()));
 const failures=[];const jobs=[];
 settled.forEach((r,i)=>{if(r.status==='fulfilled')jobs.push(...r.value);else{failures.push(`${boards[i].name}: ${String(r.reason?.message||r.reason).slice(0,160)}`);console.warn('Remote ATS feed skipped',failures.at(-1));}});
 if(!jobs.length&&failures.length===boards.length)throw new Error(failures.join('; ').slice(0,480));
 const unique=new Map();for(const job of jobs)unique.set(job.external_id,job);
 return [...unique.values()];
}
export const ADAPTERS={myjobmag:fromMyJobMag,remote_ats:fromFreeRemoteAts};
let running=false;
export async function syncSources({requestedBy='scheduler',only=null}={}){
 if(running)throw new Error('A sync is already running');
 running=true;const result=[];
 try{
  const sources=await db('sources',{query:'select=*&enabled=eq.true'});
  for(const src of sources){
   if(only&&src.source_key!==only)continue;
   if(!ADAPTERS[src.source_key])continue;
   let imported=0,updated=0,skipped=0,review=0;
   try{
    const jobs=await ADAPTERS[src.source_key]();
    for(const item of jobs){
     try{
      let existing=await db('jobs',{query:`select=id,status,title,company,location,category,description,excerpt,apply_url,source_url,source_key,remote,eligibility,verified&source_key=eq.${item.source_key}&external_id=eq.${encodeURIComponent(item.external_id)}&limit=1`});
      if(!existing.length)existing=await db('jobs',{query:`select=id,status,title,company,location,category,description,excerpt,apply_url,source_url,source_key,remote,eligibility,verified&source_key=eq.${item.source_key}&source_url=eq.${encodeURIComponent(item.source_url)}&limit=1`});
      if(!existing.length)existing=await db('jobs',{query:`select=id,status,title,company,location,category,description,excerpt,apply_url,source_url,source_key,remote,eligibility,verified&fingerprint=eq.${item.fingerprint}&limit=1`});
      if(existing.length){
       const old=existing[0],patch={updated_at:new Date().toISOString()};
       const oldText=textFromHtml(old.description||'');
       const newText=textFromHtml(item.description||'');
       const hasStructure=/<(p|h[2-4]|ul|ol|li)\b/i.test(item.description||'')&&!/<(p|h[2-4]|ul|ol|li)\b/i.test(old.description||'');
       if(newText.length>Math.max(oldText.length+80,oldText.length*1.15)||hasStructure){
        patch.description=item.description;patch.excerpt=item.excerpt;
       }
       if(old.company==='See source'||old.company==='Employer not specified'||!old.company)patch.company=item.company;
       if(old.location==='Nigeria'&&item.location!=='Nigeria')patch.location=item.location;
       if(old.title!==item.title&&/\s+at\s+/i.test(old.title||''))patch.title=item.title;
       if(old.category==='Other Jobs'&&item.category!=='Other Jobs')patch.category=item.category;
       patch.eligibility=item.eligibility;patch.remote=item.remote;
       if(old.apply_url===old.source_url||!old.apply_url)patch.apply_url=item.apply_url||'';
       if(!item.apply_url&&old.apply_url===old.source_url&&old.status==='published')patch.status='pending';
       if(Object.keys(patch).length>1){
        await db('jobs',{method:'PATCH',query:`id=eq.${old.id}`,body:patch,prefer:'return=minimal'});
        updated++;
       }else skipped++;
       continue;
      }
      const hasDirectApplication=Boolean(item.apply_url);
      const auto=src.auto_publish&&hasDirectApplication&&['nigeria','global'].includes(item.eligibility);
      const status=auto?'published':'pending';
      await db('jobs',{method:'POST',body:{...item,status,verified:false,verification_note:hasDirectApplication?'Employer application destination extracted from source record; still requires editorial review.':'No direct employer application destination found. Requires editorial review.',published_at:auto?new Date().toISOString():null},prefer:'return=minimal'});
      imported++;if(!auto)review++;
     }catch(e){skipped++;if(!String(e.message).includes('23505'))console.error('Job import warning',e.message);}
    }
    await db('sources',{method:'PATCH',query:`source_key=eq.${src.source_key}`,body:{last_checked_at:new Date().toISOString(),last_error:null,last_imported:imported+updated},prefer:'return=minimal'});
    result.push({source:src.source_key,imported,updated,review,skipped});
   }catch(e){
    await db('sources',{method:'PATCH',query:`source_key=eq.${src.source_key}`,body:{last_checked_at:new Date().toISOString(),last_error:String(e.message).slice(0,500)},prefer:'return=minimal'});
    result.push({source:src.source_key,error:e.message});
   }
  }
  await db('sync_runs',{method:'POST',body:{triggered_by:requestedBy,result},prefer:'return=minimal'});
  return result;
 }finally{running=false;}
}
