import test from 'node:test';
import assert from 'node:assert/strict';
import {validateContent,validateSetting} from '../cms.mjs';
test('accepts a published blog post',()=>{let p=validateContent({title:'How to Prepare for Interviews',body:'A useful article',status:'published'},'post');assert.equal(p.slug,'how-to-prepare-for-interviews');assert.equal(p.status,'published')});
test('blocks reserved page slug',()=>assert.throws(()=>validateContent({title:'Malicious route',slug:'staff',body:'Test text'})));
test('validates fetch intervals',()=>{assert.equal(validateSetting('sync_interval_minutes','180'),'180');assert.throws(()=>validateSetting('sync_interval_minutes','1'))});
test('rejects javascript links',()=>assert.throws(()=>validateSetting('logo_url','javascript:alert(1)')));
test('accepts Google Analytics ID',()=>assert.equal(validateSetting('ga_measurement_id','G-ABC123456'),'G-ABC123456'));
test('rejects non-Google externally loaded scripts',()=>assert.throws(()=>validateSetting('header_code','<script src="https://evil.example/track.js"></script>')));
test('accepts allowed Google analytics script',()=>assert.ok(validateSetting('header_code','<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123456"></script>')));
test('footer links validate JSON',()=>{assert.ok(validateSetting('footer_links','[{"label":"About","url":"/about"}]'));assert.throws(()=>validateSetting('footer_links','[{"label":"Bad","url":"javascript:alert(1)"}]'))});

test('header navigation links can be configured',()=>assert.ok(validateSetting('header_links','[{"label":"Jobs","url":"/"}]')));
