import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
const root=resolve('.'),worker=join(root,'.worktrees/k'),out=join(root,'docs/acceptance/wave1/controller/w1-k-review-20261018');
mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(readFileSync(p,'utf8'));
const git=(cwd,args)=>{const r=spawnSync('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...args],{cwd,encoding:null,windowsHide:true,maxBuffer:32*1024*1024});assert.equal(r.status,0,r.stderr?.toString());return r.stdout;};
const g=args=>git(worker,args).toString('utf8').trim();
const task=json(join(root,'docs/dispatch/wave1/manifest.json')).tasks.find(t=>t.id==='WATER-W1-K');
const head=g(['rev-parse','HEAD']),impl='7d0035582db8457a47d6c611ff02427296ba641c';
assert.equal(head,'e717519a14f5d561c0ba18aa7d5299870828aa5a');assert.equal(g(['status','--porcelain=v1','--untracked-files=all']),'');assert.equal(g(['branch','--show-current']),task.branch);
g(['merge-base','--is-ancestor',task.baseCommit,impl]);g(['merge-base','--is-ancestor',impl,head]);
const paths=git(worker,['diff','--name-only','-z',task.baseCommit,head]).toString('utf8').split('\0').filter(Boolean);
for(const p of paths)assert(task.allowedFiles.includes(p)||task.allowedPrefixes.some(a=>p.startsWith(a)),p);
assert(g(['diff','--name-status',task.baseCommit,head]).split('\n').every(l=>l.startsWith('A\t')));
assert.equal(g(['rev-parse',impl+':'+task.outputRoot]),g(['rev-parse',head+':'+task.outputRoot]));
const productPaths=paths.filter(p=>p.startsWith(task.outputRoot+'/'));assert.equal(productPaths.length,8);
const frozen=new Map();for(const name of ['v1','parallel-v1','fixture-lab-v1','report-view-v1','scan-lab-v1','parallel-next-v1','session-batch-v1'])for(const f of json(join(root,'contracts',name,'freeze.lock.json')).files){for(const base of [root,worker])assert.equal(hash(readFileSync(join(base,f.path))),f.sha256,f.path);frozen.set(f.path,f.sha256);}assert.equal(frozen.size,132);
const oldRoots=['crates/water-contracts','packages/tool-catalog','prototypes/readonly-dashboard','tools/fs-fixture-kit','packages/report-view','packages/fixture-scan','packages/scan-report','packages/summary-export','prototypes/report-reader'];
for(const p of oldRoots)assert.equal(g(['rev-parse','HEAD:'+p]),g(['rev-parse',task.baseCommit+':'+p]),p);
for(const p of ['Cargo.toml','Cargo.lock'])assert.equal(hash(readFileSync(join(root,p))),hash(readFileSync(join(worker,p))));
const archive=join(worker,'docs/acceptance/wave1/k'),source=join(worker,'.local/checks/WATER-W1-K'),inventory=json(join(archive,'EVIDENCE-INVENTORY.json'));
assert.equal(inventory.files.length,359);let bytes=0;
for(const f of inventory.files){const b=readFileSync(join(archive,f.name));assert.equal(b.length,f.bytes);assert.equal(hash(b),f.sha256);assert.equal(hash(readFileSync(join(source,f.name))),f.sha256);assert.equal(hash(git(worker,['show',head+':docs/acceptance/wave1/k/'+f.name])),f.sha256);bytes+=b.length;}
const results=inventory.files.filter(f=>f.name.endsWith('-result.json')).map(f=>({file:f.name,data:json(join(archive,f.name))}));let logs=0,snapshots=0;
for(const {data:r} of results){for(const c of r.commands){if(!c.log)continue;const raw=readFileSync(join(archive,c.log),'utf8'),header=JSON.parse(raw.split('\n')[0]);assert.deepEqual(header,c);assert(raw.includes('--- stdout ---')&&raw.includes('--- stderr ---'));logs++;}for(const s of r.sourceState?.files??[]){assert.equal(hash(readFileSync(join(archive,s.snapshot))),s.sha256);snapshots++;}}
const final=results.filter(({data:r})=>r.finalGate);assert.equal(final.length,3);const current=final[0].data.sourceState;
for(const {data:r}of final){assert.equal(r.status,'passed');assert.equal(r.before.head,impl);assert.equal(r.after.head,impl);assert.equal(r.before.status,'');assert.equal(r.after.status,'');assert.equal(r.sourceState.productionHash,current.productionHash);assert.equal(r.sourceState.testHash,current.testHash);}
for(const s of current.files)assert.equal(hash(readFileSync(join(worker,s.path))),s.sha256);
const proof=[];
for(const {label,red,restored}of final[0].data.proofAudit){const r=json(join(archive,red)),s=json(join(archive,restored));assert.equal(r.status,'passed');assert.equal(r.observedExpectedFailure,true);assert.equal(r.expectation.testExitCode,1);assert.equal(r.executedTests,5);assert.equal(r.sourceState.testHash,current.testHash);assert.equal(s.status,'passed');assert.equal(s.executedTests,5);assert.equal(s.sourceState.productionHash,current.productionHash);assert.equal(s.sourceState.testHash,current.testHash);assert(Date.parse(s.startedAt)>Date.parse(r.endedAt));const c=r.commands.find(c=>c.log?.endsWith('-expected-red.log'));const text=readFileSync(join(archive,c.log),'utf8');assert(text.includes(task.proofTargets[label]));assert.match(text,/# tests 5\r?\n/);assert.doesNotMatch(text,/SyntaxError|ERR_MODULE_NOT_FOUND|CDP timeout|condition timed out/);proof.push({label,red,restored});}
const first=results.find(r=>r.file==='2026-10-17T16-41-22.271Z-41176-red-behavior-result.json').data;
assert.equal(first.status,'passed');assert.equal(first.sourceState.testHash,current.testHash);assert.equal(first.expectation.testExitCode,1);
assert(Date.parse(first.endedAt)<Date.parse(results.find(r=>r.file==='2026-10-17T16-44-54.457Z-26140-suite-result.json').data.startedAt));
const record={status:'passed',observedAt:new Date().toISOString(),head,implementation:impl,base:task.baseCommit,branch:task.branch,changedFiles:paths.length,productFiles:productPaths,archivedFiles:inventory.files.length,archivedBytes:bytes,fullCommandLogs:logs,sourceSnapshots:snapshots,frozenFiles:frozen.size,oldProductRoots:oldRoots,proof,initialBehaviorRed:{file:'2026-10-17T16-41-22.271Z-41176-red-behavior-result.json',finalTestBytes:true,ordering:'Recorded before first complete green; implementation-time chronology is based on preserved source snapshots and receipt timestamps, not external attestation.'},failures:results.filter(r=>r.data.status!=='passed').map(r=>({file:r.file,error:r.data.error})),paths};
writeFileSync(join(out,'intake-audit.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...record,paths:undefined},null,2));
