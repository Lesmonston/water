// Final metadata/byte checks for the 2026-10-19 S receipt.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
const json=p=>JSON.parse(readFileSync(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
function git(args){const r=spawnSync('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...args],{encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024});assert.equal(r.status,0,r.stderr);return r.stdout.trim();}
const m=json('docs/dispatch/wave1/manifest.json'),r=json('docs/dispatch/registry.json');
const old=JSON.parse(git(['show','89a68d1:docs/dispatch/wave1/manifest.json']));
const oldRegistry=JSON.parse(git(['show','89a68d1:docs/dispatch/registry.json']));
const s=m.tasks.find(t=>t.id==='WATER-W1-S'),out='docs/acceptance/wave1/controller/w1-s-review-20261019';
assert.equal(s.status,'VERIFIED');assert.deepEqual(s,r.tasks.find(t=>t.id===s.id));
for(const t of old.tasks.filter(t=>t.id!==s.id)){
 assert.deepEqual(m.tasks.find(x=>x.id===t.id),t);
 assert.deepEqual(r.tasks.find(x=>x.id===t.id),oldRegistry.tasks.find(x=>x.id===t.id));
 assert.deepEqual(r.slots.find(x=>x.id===t.slot),oldRegistry.slots.find(x=>x.id===t.slot));
}
const lock=json(s.contractLock),frozen=new Map();
for(const p of [...lock.inheritedLocks,s.contractLock])for(const f of json(p).files)frozen.set(f.path,f.sha256);
assert.equal(frozen.size,291);for(const[p,h]of frozen)assert.equal(hash(readFileSync(p)),h,p);
let archived=0;for(const f of json(out+'/ARCHIVE.json').files){
 assert.equal(hash(readFileSync(f.path)),f.sha256);assert.equal(hash(readFileSync(f.source)),f.sha256);archived++;
}
const accepted=json(s.integrationReceipt);assert.equal(accepted.status,'passed');assert.equal(accepted.independentTests,3);
assert.equal(accepted.compileGuards.length,13);assert(accepted.controls.every(c=>c.red.exitCode===101&&c.green.exitCode===0&&c.original===c.restored));
assert.equal(git(['rev-parse','HEAD:'+s.outputRoot]),git(['rev-parse',s.testedImplementationCommit+':'+s.outputRoot]));
const review=json(s.controllerReviewReceipt);for(const f of review.delivered){
 assert.equal(hash(readFileSync(f.path)),f.sha256);assert.equal(hash(readFileSync(join(s.worktree,f.path))),f.sha256);
}
let links=0;for(const p of [s.controllerReview,s.ticket,'README.md','docs/STATUS.md','docs/dispatch/wave1/PLAN.md']){
 for(const m of readFileSync(p,'utf8').matchAll(/\]\(([^)]+)\)/g)){
  if(/^(https?:|#)/.test(m[1]))continue;
  assert(existsSync(resolve(dirname(p),m[1].split('#')[0])),'Broken link '+p+' '+m[1]);links++;
 }
}
const result={status:'passed',archivedFilesVerified:archived,workerFilesRetained:review.delivered.length,frozenFiles:frozen.size,localLinks:links,otherTaskObjectsAndSlotsUnchanged:true,integratedProductTreeMatchesTestedImplementation:true};
writeFileSync(out+'/FINAL-VERIFY.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
