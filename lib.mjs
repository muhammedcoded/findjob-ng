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

export const textFromHtml=(html='')=>decodeEntities(String(html??'')
 .replace(/<!--[\s\S]*?-->/g,' ')
 .replace(/<(script|style|noscript|svg|iframe|object|form|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ')
 .replace(/<br\s*\/?>/gi,'\n')
 .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi,'\n')
 .replace(/<[^>]*>/g,' '))
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
 let html=String(input??'').slice(0,max*3);
 if(!/<[a-z][\s\S]*>/i.test(html)){
  const lines=decodeEntities(html).replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
  const blocks=[];let bullets=[];
  const flush=()=>{if(bullets.length){blocks.push('<ul>'+bullets.map(x=>`<li>${escapeHtml(x.replace(/^[-*•]\s*/,''))}</li>`).join('')+'</ul>');bullets=[];}};
  for(const line of lines){
   if(/^[-*•]\s+/.test(line)){bullets.push(line);continue;}
   flush();
   if(/^([A-Z][A-Z\s&/()-]{2,}|requirements|responsibilities|benefits|method of application)\s*:?\s*$/i.test(line))blocks.push(`<h3>${escapeHtml(line.replace(/:$/,''))}</h3>`);
   else blocks.push(`<p>${escapeHtml(line)}</p>`);
  }
  flush();html=blocks.join('');
 }
 html=html
  .replace(/<!--[\s\S]*?-->/g,'')
  .replace(/<(script|style|noscript|iframe|object|embed|form|svg|math|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'')
  .replace(/<(script|style|noscript|iframe|object|embed|form|svg|math|template)\b[^>]*\/?>/gi,'')
  .replace(/<\s*(ins|div)[^>]*(?:ad|advert|promo|social|share)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi,'');
 const allowed=new Set(['p','br','strong','b','em','i','u','ul','ol','li','h2','h3','h4','blockquote','a']);
 html=html.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi,(whole,tag,attrs)=>{
  tag=tag.toLowerCase();
  if(!allowed.has(tag))return '';
  if(whole.startsWith('</'))return `</${tag}>`;
  if(tag==='br')return '<br>';
  if(tag==='a'){
   const href=attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
   const raw=decodeEntities(href?.[1]||href?.[2]||href?.[3]||'').trim();
   if(!applicationUrlOk(raw))return '<span>';
   try{if(['myjobmag.com','www.myjobmag.com'].includes(new URL(raw).hostname))return '<span>';}catch{}
   return `<a href="${escapeHtml(raw)}" target="_blank" rel="noopener noreferrer nofollow">`;
  }
  return `<${tag}>`;
 });
 html=html.replace(/<\/span>/gi,'</span>').replace(/<span>/gi,'');
 html=html.replace(/(?:Advertisement|Sponsored Advertisement|Build your CV for free\.?)/gi,'');
 return html.trim().slice(0,max);
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
 const apply=String(apply_url||'').trim(),source=String(source_url||'').trim();
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
