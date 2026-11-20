import test from 'node:test';
import assert from 'node:assert/strict';
import {validateContent,validateSetting,parseAdSenseSnippet} from '../cms.mjs';
test('accepts a published blog post',()=>{let p=validateContent({title:'How to Prepare for Interviews',body:'A useful article',status:'published'},'post');assert.equal(p.slug,'how-to-prepare-for-interviews');assert.equal(p.status,'published')});
test('blocks reserved page slug',()=>assert.throws(()=>validateContent({title:'Malicious route',slug:'staff',body:'Test text'})));
test('validates fetch intervals',()=>{assert.equal(validateSetting('sync_interval_minutes','180'),'180');assert.throws(()=>validateSetting('sync_interval_minutes','1'))});
test('rejects javascript links',()=>assert.throws(()=>validateSetting('logo_url','javascript:alert(1)')));
test('accepts Google Analytics ID',()=>assert.equal(validateSetting('ga_measurement_id','G-ABC123456'),'G-ABC123456'));
test('rejects non-Google externally loaded scripts',()=>assert.throws(()=>validateSetting('header_code','<script src="https://evil.example/track.js"></script>')));
test('accepts allowed Google analytics script',()=>assert.ok(validateSetting('header_code','<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123456"></script>')));
test('footer links validate JSON',()=>{assert.ok(validateSetting('footer_links','[{"label":"About","url":"/about"}]'));assert.throws(()=>validateSetting('footer_links','[{"label":"Bad","url":"javascript:alert(1)"}]'))});

test('header navigation links can be configured',()=>assert.ok(validateSetting('header_links','[{"label":"Jobs","url":"/"}]')));

test('CMS content keeps safe rich text and strips unsafe markup',()=>{const row=validateContent({title:'A useful page',body:'<h2>Welcome</h2><p>Hello <strong>there</strong></p><script>alert(1)</script>',status:'published'});assert.match(row.body,/<h2>Welcome<\/h2>/);assert.doesNotMatch(row.body,/script|alert/);});
test('AdSense snippets extract publisher and slot IDs',()=>{const x=parseAdSenseSnippet('<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456"></script><ins class="adsbygoogle" data-ad-client="ca-pub-1234567890123456" data-ad-slot="1234567890"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script>');assert.equal(x.client,'ca-pub-1234567890123456');assert.equal(x.slot,'1234567890');});
test('AdSense parser rejects non-Google script hosts',()=>{assert.throws(()=>parseAdSenseSnippet('<script src="https://evil.example/script.js"></script><ins data-ad-client="ca-pub-1234567890123456" data-ad-slot="1234567890"></ins>'));});
test('ad rotation interval is restricted to safe choices',()=>{assert.equal(validateSetting('ad_rotation_seconds','30'),'30');assert.throws(()=>validateSetting('ad_rotation_seconds','1'));});

test('CV AI Writer can point to an internal page',()=>assert.equal(validateSetting('ai_writer_url','/cv-writer'),'/cv-writer'));
test('AdSense parser rejects arbitrary inline JavaScript',()=>{assert.throws(()=>parseAdSenseSnippet('<script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456"></script><ins data-ad-client="ca-pub-1234567890123456" data-ad-slot="1234567890"></ins><script>alert(1);(adsbygoogle=window.adsbygoogle||[]).push({});</script>'));});
