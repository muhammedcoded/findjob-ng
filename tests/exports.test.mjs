import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {makeXlsx,makeZip} from '../exports.mjs';

test('application export creates a valid XLSX archive',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'findjob-xlsx-'));try{const file=path.join(dir,'applications.xlsx');const bytes=makeXlsx([['Ada','ada@example.com',92]],['Name','Email','Match']);await import('node:fs/promises').then(fs=>fs.writeFile(file,bytes));assert.equal(bytes.subarray(0,2).toString(),'PK');const check=spawnSync('unzip',['-t',file],{encoding:'utf8'});assert.equal(check.status,0,check.stderr||check.stdout);const sheet=spawnSync('unzip',['-p',file,'xl/worksheets/sheet1.xml'],{encoding:'utf8'});assert.match(sheet.stdout,/ada@example\.com/);}finally{await rm(dir,{recursive:true,force:true});}
});

test('CV export creates a valid ZIP archive',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'findjob-cvs-'));try{const file=path.join(dir,'cvs.zip');const bytes=makeZip([{name:'applicant-cv.pdf',data:Buffer.from('%PDF-1.4 sample')}]);await import('node:fs/promises').then(fs=>fs.writeFile(file,bytes));const check=spawnSync('unzip',['-t',file],{encoding:'utf8'});assert.equal(check.status,0,check.stderr||check.stdout);assert.match(check.stdout,/applicant-cv\.pdf/);}finally{await rm(dir,{recursive:true,force:true});}
});
