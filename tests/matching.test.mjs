import test from 'node:test';
import assert from 'node:assert/strict';
import {resumeMatch,tokens} from '../matching.mjs';

test('resume matching compares relevant job and applicant keywords',()=>{
 const result=resumeMatch('Senior Software Engineer React TypeScript Node.js cloud deployment','Senior software engineer with React and TypeScript experience');
 assert.ok(result.score>0&&result.score<100);
 assert.ok(result.matched.includes('react'));
 assert.equal(result.method,'keyword-overlap');
});

test('resume matching returns zero when no relevant terms overlap',()=>{
 const result=resumeMatch('Registered nurse clinical care patient safety','Graphic designer illustrator brand identity');
 assert.equal(result.score,0);
 assert.deepEqual(result.matched,[]);
});

test('resume tokenizer removes common filler words',()=>{
 assert.deepEqual(tokens('the and work experience for React development'),['react','development']);
});
