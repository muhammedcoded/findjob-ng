import {createHash} from 'node:crypto';

export const CATEGORIES=['Graduate Jobs','Remote Jobs','Technology Jobs','Banking & Finance','Administration','Customer Service','Sales & Marketing','Engineering','Healthcare','Education','NGO & Government','Creative & Media','Logistics','Other Jobs'];

export function decodeEntities(value=''){
 return String(value??'')
  .replace(/&nbsp;|&#160;/gi,' ')
  .replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
  .replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
  .replace(/&#(\d+);/g,(_,x)=>String.fromCodePoint(Math.min(1114111,Number(x))))
  .replace(/&#x([a-f\d]+);/gi,(_,x)=>String.fromCodePoint(Math.min(1114111,parseInt(x,16))));
}

export function normalizeEscapedMarkup(value=''){
 return decodeEntities(String(value??''))
  .replace(/\\(?=<|>)/g,'')
  .replace(/\\n/g,'\n').replace(/\\r/g,'')
  .replace(/\\\s*(?=\r?\n)/g,'')
  .replace(/&nbsp;|&#160;/gi,' ');
}

export const textFromHtml=(html='')=>normalizeEscapedMarkup(html)
 .replace(/<!--[\s\S]*?-->/g,' ')
 .replace(/<(script|style|noscript|svg|iframe|object|form|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ')
 .replace(/<br\s*\/?\s*>/gi,'\n')
 .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi,'\n')
 .replace(/<[^>]*>/g,' ')
 .replace(/\u00a0/g,' ')
 .replace(/[ \t]+\n/g,'\n')
 .replace(/\n[ \t]+/g,'\n')
 .replace(/\n{3,}/g,'\n\n')
 .replace(/[ \t]{2,}/g,' ')
 .trim();

export const clean=(s,n=12000)=>textFromHtml(s).replace(/\s+/g,' ').trim().slice(0,n);

export function urlOk(value){
 try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password&&!['localhost','127.0.0.1','0.0.0.0','::1'].includes(u.hostname)&&!u.hostname.endsWith('.local')&&u.hostname.includes('.');}catch{return false;}
}
export function applicationUrlOk(value){
 const raw=String(value??'').trim();
 if(!raw)return true;
 if(urlOk(raw))return true;
 if(!/^mailto:/i.test(raw)||/[\r\n]/.test(raw))return false;
 try{
  const u=new URL(raw);
  return u.protocol==='mailto:'&&/^[^@\s?]+@[^@\s?]+\.[^@\s?]+$/.test(decodeURIComponent(u.pathname));
 }catch{return false;}
}

export function sanitizeDescriptionHtml(input='',max=30000){
 let html=normalizeEscapedMarkup(input).slice(0,max*3);
 if(!/<[a-z][\s\S]*>/i.test(html)){
  const lines=html.replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
  const blocks=[];let bullets=[];
  const flush=()=>{if(bullets.length){blocks.push('<ul>'+bullets.map(x=>`<li>${escapeHtml(x.replace(/^[-*•]\s*/,''))}</li>`).join('')+'</ul>');bullets=[];}};
  for(const line of lines){
   if(/^(?:save\s+share\s+facebook\s+x\s+linkedin\s+email\s+copy link|get new .* jobs on telegram|signup and complete your profile|@(?:yahoo|outlook)\.com)$/i.test(line))continue;
   if(/free webinar|view all jobs at|report job|copy link/i.test(line))continue;
   if(/^[-*•]\s+/.test(line)){bullets.push(line);continue;}
   flush();
   if(/^([A-Z][A-Z\s&/()-]{2,}|requirements|responsibilities|benefits|method of application|key responsibilities|why join us)\s*:?\s*$/i.test(line))blocks.push(`<h3>${escapeHtml(line.replace(/:$/,''))}</h3>`);
   else blocks.push(`<p>${escapeHtml(line)}</p>`);
  }
  flush();html=blocks.join('');
 }
 html=html
  .replace(/<!--[\s\S]*?-->/g,'')
  .replace(/<(script|style|noscript|iframe|object|embed|form|svg|math|template|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'')
  .replace(/<(script|style|noscript|iframe|object|embed|form|svg|math|template)\b[^>]*\/?\s*>/gi,'')
  .replace(/<(?:div|section|aside)[^>]*(?:class|id)=["'][^"']*(?:ad|advert|promo|social|share|newsletter|subscribe|related|telegram)[^"']*["'][^>]*>[\s\S]*?<\/(?:div|section|aside)\s*>/gi,'')
  .replace(/<(li|p|div)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,block=>/(?:Get new [\s\S]{0,300}?jobs on Telegram|Signup and complete your profile|View All Jobs at|free webinar|@(?:yahoo|outlook)\.com|Report job)/i.test(textFromHtml(block))?'':block)
  .replace(/<a\b[^>]*(?:href=["'](?:https?:)?\/\/(?:www\.)?(?:facebook|linkedin|twitter|x\.com|t\.me|telegram)\.[^"']*["'])[^>]*>[\s\S]*?<\/a>/gi,'')
  .replace(/Save\s*<\/a>\s*Share\s*<\/a>[\s\S]{0,240}?(?:Copy link|Report job)/gi,'')
  .replace(/Save\s+Share\s+Facebook\s+X\s+LinkedIn\s+Email\s+Copy link/gi,'')
  .replace(/<li\b[^>]*>\s*@(?:yahoo|outlook)\.com\s*<\/li>/gi,'')
  .replace(/(?:Advertisement|Sponsored Advertisement|Build your CV for free\.?)/gi,'');
 const allowed=new Set(['p','br','strong','b','em','i','u','ul','ol','li','h2','h3','h4','blockquote','a']);
 const stack=[];
 html=html.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi,(whole,rawTag,attrs)=>{
  const tag=rawTag.toLowerCase();if(!allowed.has(tag))return '';
  if(whole.startsWith('</')){
   const index=stack.lastIndexOf(tag);if(index<0)return '';
   let close='';for(let i=stack.length-1;i>=index;i--)close+=`</${stack[i]}>`;
   stack.length=index;return close;
  }
  if(tag==='br')return '<br>';
  if(tag==='a'){
   const href=attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
   const raw=normalizeEscapedMarkup(href?.[1]||href?.[2]||href?.[3]||'').trim();
   if(!applicationUrlOk(raw))return '';
   try{if(['myjobmag.com','www.myjobmag.com'].includes(new URL(raw).hostname))return '';}catch{}
   stack.push(tag);return `<a href="${escapeHtml(raw)}" target="_blank" rel="noopener noreferrer nofollow">`;
  }
  stack.push(tag);return `<${tag}>`;
 });
 for(let i=stack.length-1;i>=0;i--)html+=`</${stack[i]}>`;
 return html.trim().slice(0,max);
}

export function extractApplicationDestination(description='',title=''){
 const html=normalizeEscapedMarkup(description);
 const plain=textFromHtml(html);
 const heading=/method of application|how to apply|application instructions|application process|to apply\b/i;
 const match=heading.exec(plain);
 let textRegion=match?plain.slice(match.index,match.index+5000):'';
 let htmlRegion=html;
 if(match){
  const terms=html.search(/method\s+of\s+application|how\s+to\s+apply|application\s+instructions|application\s+process/i);
  if(terms>=0)htmlRegion=html.slice(terms,terms+12000);
 }else{
  const emailContext=/(?:send|email|forward|submit|apply|application|cv|resume|portfolio)[^\n]{0,180}[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.exec(plain);
  if(emailContext)textRegion=plain.slice(Math.max(0,emailContext.index-100),emailContext.index+700);
  else textRegion='';
 }
 const social=/facebook|linkedin|twitter|x\.com|telegram|t\.me|doubleclick|googlesyndication|googleadservices|myjobmag/i;
 const emailCandidates=[...textRegion.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)];
 for(const found of emailCandidates){
  const email=found[0].toLowerCase(),nearby=textRegion.slice(Math.max(0,found.index-150),Math.min(textRegion.length,found.index+180));
  if(social.test(email)||/^(?:noreply|no-reply|example)@/.test(email)||/@(?:yahoo|outlook|gmail)\.com$/i.test(email)&&!/(?:send|email|forward|submit|apply|application|cv|resume|portfolio)/i.test(nearby))continue;
  return `mailto:${email}`;
 }
 const anchorRegion=match?htmlRegion:html;
 const anchors=[...anchorRegion.matchAll(/<a\b([^>]*)href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi)];
 for(const a of anchors){
  const href=normalizeEscapedMarkup(a[2]||a[3]||a[4]||'').trim();
  const label=textFromHtml(a[5]);
  if(!urlOk(href)||social.test(href)||!/apply|application|career|recruit|submit|vacancy|job/i.test(label))continue;
  try{if(social.test(new URL(href).hostname))continue;}catch{continue;}
  return href;
 }
 return '';
}

function escapeHtml(s=''){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");}

export function classify(title='',body='',location=''){
 const s=`${title} ${textFromHtml(body).slice(0,700)}`.toLowerCase(),t=title.toLowerCase();
 if(/graduate|trainee|intern(ship)?|nysc|entry.level/.test(t))return 'Graduate Jobs';
 if(/remote|work.from.home|anywhere/.test(location.toLowerCase())||/\bremote\b/.test(t))return 'Remote Jobs';
 const groups=[['Technology Jobs',/developer|software|programmer|frontend|backend|full.stack|cyber|data analy|data sci|devops|cloud engineer|information technology|\bit support\b|\bict\b|product designer|ux\/ui|qa engineer/],['Banking & Finance',/accountant|banking|banker|finance|audit|financial|credit officer|treasury|bookkeep/],['Administration',/admin|office assist|reception|secretar|human resource|\bhr\b|personal assistant|executive assistant/],['Customer Service',/customer|call cent|client support|helpdesk|customer success/],['Sales & Marketing',/sales|marketing|business development|seo|brand manager|growth/],['Engineering',/mechanical|civil engineer|electrical engineer|structural engineer|technician|petroleum/],['Healthcare',/nurse|medical|pharma|health|doctor|clinical|caregiver/],['Education',/teacher|lecturer|tutor|school|education/],['NGO & Government',/ngo|nonprofit|non.profit|government|public sector|program officer/],['Creative & Media',/graphic|writer|journalis|content creat|editor|video|media|photograph/],['Logistics',/logistic|supply chain|procure|driver|warehouse|delivery/]];
 for(const [c,re] of groups)if(re.test(t))return c;
 for(const [c,re] of groups)if(re.test(s))return c;
 return 'Other Jobs';
}
export const slugify=s=>clean(s,120).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'job';
export const fingerprint=(title,company,location)=>createHash('sha256').update([title,company,location].map(x=>clean(x,200).toLowerCase()).join('|')).digest('hex');
export function eligibility(text=''){
 const s=text.toLowerCase();
 const regions='(?:us|usa|united states|uk|united kingdom|europe|european union|eu|emea|north america|americas|latin america|latam|apac|asia pacific|africa|middle east|canada|india|australia|new zealand|singapore|germany|france|spain|ireland|netherlands)';
 const restricted=new RegExp(`\\b${regions}\\s+only\\b|\\bonly\\s+(?:open to\\s+)?(?:applicants|candidates|people|residents)\\s+(?:located|based|living|residing)?\\s*(?:in|within|from)\\s+(?:the\\s+)?${regions}\\b|\\b(?:must be|must reside|must live|applicants? must be|candidates? must be)\\s+(?:(?:based|located|resident|living)\\s+)?(?:in|within|from)\\s+(?:the\\s+)?${regions}\\b|\\b${regions}[- ]based\\s+(?:applicants|candidates|employees)\\s+only\\b|\\b(?:worldwide|anywhere|all countries|work from anywhere)[^.;\\n]{0,80}\\b(?:except|excluding|not available in|cannot hire in)\\s+(?:the\\s+)?${regions}\\b|\\b(?:not open to|not available to|cannot employ)\\s+(?:applicants|candidates|people)?\\s*(?:from|in|within)\\s+(?:the\\s+)?${regions}\\b`);
 if(restricted.test(s))return 'restricted';
 if(/\b(worldwide|anywhere|global remote|work from anywhere|anywhere in the world|all countries)\b/.test(s))return 'global';
 if(/\b(nigeria|nigerian|lagos|abuja|ibadan|kano|port harcourt|ogun|enugu)\b/.test(s))return 'nigeria';
 return 'unknown';
}
export const excerpt=(body,n=150)=>{const s=clean(body,1500);return s.length>n?s.slice(0,n).replace(/\s+\S*$/,'')+'…':s;};
export function normalizeJob({title,company,location,description,apply_url,source_url,source_key,external_id,posted_at,expires_at,remote=false}){
 title=clean(title,180);company=clean(company||'Employer not specified',130);location=clean(location||'Nigeria',130);
 const safeDescription=sanitizeDescriptionHtml(description||'',24000);
 const suppliedApply=String(apply_url||'').trim(),source=String(source_url||'').trim();
 const sourceListing=source_key==='myjobmag'||source_key==='jobicy';
 const apply=(suppliedApply&&applicationUrlOk(suppliedApply)&&!(sourceListing&&suppliedApply===source)?suppliedApply:extractApplicationDestination(safeDescription,title));
 if(!title||title.length<5||!urlOk(source)||!applicationUrlOk(apply))return null;
 let available=eligibility([location,textFromHtml(safeDescription).slice(0,1800),title].join(' '));
 if(source_key==='myjobmag')available='nigeria';
 if(source_key==='remote_ats'){
  const evidence=[location,textFromHtml(safeDescription).slice(0,9000)].join(' ');
  if(!remote||eligibility(evidence)!=='global')return null;
  available='global';
 }
 const category=classify(title,safeDescription,remote?'Remote':location);
 const posted=posted_at&&!Number.isNaN(Date.parse(posted_at))?new Date(posted_at).toISOString():null;
 return {title,company,location,description:safeDescription,excerpt:excerpt(safeDescription||`${title} at ${company}`),category,source_key,external_id:String(external_id||source).slice(0,240),source_url:source,apply_url:apply,posted_at:posted,expires_at:expires_at&&!Number.isNaN(Date.parse(expires_at))?new Date(expires_at).toISOString():null,remote:remote||category==='Remote Jobs',fingerprint:fingerprint(title,company,location),eligibility:available};
}
export function xmlField(x,tag){const m=x.match(new RegExp('<'+tag.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'>','i'));return m?m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').trim():'';}
export function parseRss(xml){
 const items=xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)||[];
 return items.slice(0,150).map(x=>({title:clean(xmlField(x,'title')),description:clean(xmlField(x,'description')||xmlField(x,'content:encoded')),link:clean(xmlField(x,'link')||xmlField(x,'guid')),guid:clean(xmlField(x,'guid')),pubDate:clean(xmlField(x,'pubDate'))})).filter(x=>x.title&&urlOk(x.link));
}
