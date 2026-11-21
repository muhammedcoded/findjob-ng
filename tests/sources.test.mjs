import test from 'node:test';import assert from 'node:assert/strict';
import {parseMyJobMagDetail,explicitWorldwide} from '../sources.mjs';
const page=`<html><body>
<h2>Senior Design &amp; Detailing Architect at First World Communities Ltd</h2>
<ul>
<li>Job Type <a href="https://www.myjobmag.com/jobs-by-type/full-time">Full Time</a></li>
<li>Qualification <a href="https://www.myjobmag.com/jobs-by-education/bsc">BA/BSc/HND</a></li>
<li>Experience 8 - 12 years</li><li>Location <a href="https://www.myjobmag.com/jobs-location/lagos">Lagos</a></li>
<li>Job Field UX, Design and Architecture</li></ul>
<p>At First World Communities, we are building the future of real estate through thriving communities.</p>
<h3>REQUIREMENTS</h3><ul><li>Bachelor's degree in Architecture.</li><li>8 to 12 years of experience.</li></ul>
<h3>KEY RESPONSIBILITIES</h3><ul><li>Develop architectural concepts and detailed designs.</li></ul>
<h2>Method of Application</h2><p>Send your CV and Portfolio to <a href="mailto:recruitment@fwcafrica.com">recruitment@fwcafrica.com</a> with the subject line: Senior Design &amp; Detailing Architect.</p>
<h2>Jobs You Might Be Interested In</h2><p>Unrelated vacancy</p></body></html>`;
test('extracts full MyJobMag job content and employer email application',()=>{
 const job=parseMyJobMagDetail(page,'Senior Design & Detailing Architect at First World Communities Ltd','https://www.myjobmag.com/job/example');
 assert.ok(job);assert.equal(job.title,'Senior Design & Detailing Architect');assert.equal(job.company,'First World Communities Ltd');assert.equal(job.location,'Lagos');
 assert.match(job.description,/KEY RESPONSIBILITIES/);assert.match(job.description,/Bachelor/);assert.doesNotMatch(job.description,/Jobs You Might Be Interested/);
 assert.equal(job.apply_url,'mailto:recruitment@fwcafrica.com');
});

test('recognizes explicit worldwide location wording',()=>{assert.equal(explicitWorldwide('Home based - Worldwide'),true);assert.equal(explicitWorldwide('Remote - Europe'),false);assert.equal(explicitWorldwide('Remote, Worldwide / Remote - Europe'),true);});
