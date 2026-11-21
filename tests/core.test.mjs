import test from 'node:test';import assert from 'node:assert/strict';
import {classify,clean,slugify,normalizeJob,parseRss,urlOk,applicationUrlOk,sanitizeDescriptionHtml,extractApplicationDestination,fingerprint,eligibility,CATEGORIES} from '../lib.mjs';
test('correct graduate category before bank',()=>assert.equal(classify('Access Bank Graduate Trainee'), 'Graduate Jobs'));
test('technology detection',()=>assert.equal(classify('Senior React Developer'),'Technology Jobs'));
test('remote category by location',()=>assert.equal(classify('Customer Support','','Remote'),'Remote Jobs'));
test('health category',()=>assert.equal(classify('Registered Nurse'),'Healthcare'));
test('finance category',()=>assert.equal(classify('Junior Accountant'),'Banking & Finance'));
test('fallback category',()=>assert.equal(classify('Temporary Opportunity'),'Other Jobs'));
test('html is stripped',()=>assert.equal(clean('<script>alert(1)</script><b>Welcome</b>'),'Welcome'));
test('blocks javascript URL',()=>assert.equal(urlOk('javascript:alert(1)'),false));
test('blocks localhost URL',()=>assert.equal(urlOk('http://localhost:3000'),false));
test('accepts public https URLs',()=>assert.equal(urlOk('https://www.myjobmag.com/jobs'),true));
test('stable fingerprint',()=>assert.equal(fingerprint('a','b','c'),fingerprint('A','B','C')));
test('slug generation',()=>assert.equal(slugify('Access Bank: Digital Lab!'),'access-bank-digital-lab'));
test('global eligibility',()=>assert.equal(eligibility('Worldwide remote'),'global'));
test('restricted eligibility',()=>assert.equal(eligibility('USA only'),'restricted'));
test('rss parser with CDATA',()=>{const r=parseRss('<rss><channel><item><title><![CDATA[Software Developer]]></title><link>https://example.com/job</link><description><![CDATA[<p>React engineer</p>]]></description></item></channel></rss>');assert.equal(r.length,1);assert.equal(r[0].description,'React engineer')});
test('normalizes a Nigeria job',()=>{const j=normalizeJob({title:'Graduate Banking Trainee',company:'Example',location:'Lagos',description:'Open for Nigerian applicants',source_url:'https://example.com/job',source_key:'myjobmag'});assert.equal(j.category,'Graduate Jobs');assert.equal(j.eligibility,'nigeria')});
test('rejects bad links',()=>assert.equal(normalizeJob({title:'test title',source_url:'file:///etc/passwd'}),null));
test('country restrictions take priority over worldwide wording',()=>assert.equal(eligibility('Worldwide remote, but applicants must be based in the United States'),'restricted'));
test('rejects worldwide jobs that exclude a country',()=>assert.equal(eligibility('Work from anywhere worldwide except the United States'),'restricted'));
test('categories are distinct',()=>assert.equal(new Set(CATEGORIES).size,CATEGORIES.length));

test('accepts direct employer email application URLs',()=>assert.equal(applicationUrlOk('mailto:recruitment@example.com?subject=Application'),true));
test('rejects unsafe application URLs',()=>assert.equal(applicationUrlOk('javascript:alert(1)'),false));
test('sanitizes rich job descriptions while preserving lists',()=>{const html=sanitizeDescriptionHtml('<h3>REQUIREMENTS</h3><ul><li>Degree</li></ul><script>alert(1)</script><a href="javascript:alert(1)">bad</a>');assert.match(html,/<h3>REQUIREMENTS<\/h3>/);assert.match(html,/<li>Degree<\/li>/);assert.doesNotMatch(html,/script|javascript|alert/);});

test('accepts free employer ATS jobs explicitly open worldwide',()=>{const j=normalizeJob({title:'Remote Product Designer',company:'Example',location:'Home based - Worldwide',description:'Work from anywhere with our team.',source_url:'https://jobs.example.com/roles/123',apply_url:'https://jobs.example.com/roles/123',source_key:'remote_ats',remote:true});assert.ok(j);assert.equal(j.eligibility,'global');assert.equal(j.apply_url,j.source_url);});
test('rejects free ATS remote jobs with country restrictions even if worldwide is also mentioned',()=>assert.equal(normalizeJob({title:'Remote Engineer',company:'Example',location:'Worldwide',description:'Applicants must be based in the United States.',source_url:'https://jobs.example.com/roles/123',apply_url:'https://jobs.example.com/roles/123',source_key:'remote_ats',remote:true}),null));
test('rejects remote ATS jobs that do not explicitly say worldwide',()=>assert.equal(normalizeJob({title:'Remote Engineer',company:'Example',location:'Remote, United States',description:'Work remotely with our team.',source_url:'https://jobs.example.com/roles/123',apply_url:'https://jobs.example.com/roles/123',source_key:'remote_ats',remote:true}),null));

test('decodes backslash-escaped HTML fragments and removes social controls',()=>{
 const dirty='\\<li>Save\\</a> Share\\</a> Facebook X LinkedIn Email Copy link\\</li>\n\\<p>Register for our free webinar and learn how to get hired.\\</p>\n\\<p>At Example Ltd, we build useful products.\\</p>\n\\<p>View All Jobs at Example Ltd\\</a>\\</p>\n\\<li>Get new UX jobs on Telegram\\</li>\n\\<li>@yahoo.com\\</li>\n\\<li>@outlook.com\\</li>';
 const cleanHtml=sanitizeDescriptionHtml(dirty);
 assert.match(cleanHtml,/At Example Ltd/);
 assert.doesNotMatch(cleanHtml,/Save|Share|Facebook|LinkedIn|Copy link|Telegram|yahoo\.com|outlook\.com|webinar|View All Jobs/);
});
test('extracts a genuine employer application email from method of application',()=>{
 const body='<h2>Method of Application</h2><p>Send your CV and Portfolio to <strong>recruitment@fwcafrica.com</strong> with the subject line: Senior Design &amp; Detailing Architect.</p><li>Get new jobs on Telegram</li>';
 assert.match(extractApplicationDestination(body,'Senior Design & Detailing Architect'),/^mailto:recruitment@fwcafrica\.com/);
});
test('normalizeJob fills an empty application destination from job description',()=>{
 const j=normalizeJob({title:'Senior Design Architect',company:'Example Ltd',location:'Lagos',description:'<h2>Method of Application</h2><p>Send CV to recruitment@example.org</p>',source_url:'https://www.myjobmag.com/jobs/example',source_key:'myjobmag'});
 assert.match(j.apply_url,/^mailto:recruitment@example\.org/);
});
test('extracts Gmail application addresses when they are stated in application instructions',()=>{
 const body='<h2>Method of Application</h2><p>Send your CV to hiringteam@gmail.com to apply.</p>';
 assert.equal(extractApplicationDestination(body,'Support Officer'),'mailto:hiringteam@gmail.com');
});
