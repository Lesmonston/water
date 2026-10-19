// Read-only controller receipt/source/proof audit. No native windows or fixtures.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {isAbsolute,join,relative,resolve} from 'node:path';
import {mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
const root=resolve('.'),out=join(root,'.local/checks/controller-xyz-20261019');mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(readFileSync(p));
const commits={X:['c159297473a8ade534eaf0add9c1063fc0ec79f6','abbad6ad60beb56ee69b7d7b3ca711b23cb29859'],Y:['f1c5260c40c5fab4d797b145e36d1354e4dc2d85','657f84d52c02857aec0639af82a7dac59373b47e'],Z:['6f1f77550262d017de12fbe9b4c201dbd57809c1','f853a78560c91cbc3241f61ad5526ff096530948']};
const result={startedAt:new Date().toISOString(),systemNativeDialogs:0,physicalFixtureAccess:false,lanes:[]};
function git(tree,args,encoding='utf8',input) {const r=spawnSync('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...args],{cwd:tree,encoding,input,windowsHide:true,timeout:30000,maxBuffer:96*1024*1024});assert(!r.error&&r.status===0,String(r.stderr));return encoding?r.stdout.trim():r.stdout;}
function state(state,dir,tree,sha) {
 for(const f of state.files){const b=readFileSync(join(dir,f.snapshot));assert.equal(hash(b),f.sha256);if(sha)assert.deepEqual(b,git(tree,['show',sha+':'+f.path],null),f.path);}
 const digest=a=>hash(Buffer.from(JSON.stringify(a.map(({path,sha256})=>({path,sha256})))));
 assert.equal(state.productionHash,digest(state.files.filter(f=>!f.test)));assert.equal(state.testHash,digest(state.files.filter(f=>f.test)));
}
try {
 const lock=json('contracts/interactive-batch-v1/freeze-r2.lock.json'),frozen=new Map();for(const p of lock.inheritedLocks)for(const f of json(p).files)frozen.set(f.path,f.sha256);assert.equal(frozen.size,341);for(const f of lock.files)frozen.set(f.path,f.sha256);
 for(const lane of ['X','Y','Z']) {
  const task=json('docs/dispatch/wave1/manifest.json').tasks.find(t=>t.id==='WATER-W1-'+lane),tree=resolve(task.worktree),[submitted,implementation]=commits[lane],item={lane,submitted,implementation};result.lanes.push(item);
  assert.equal(git(tree,['rev-parse','HEAD']),submitted);assert.equal(git(tree,['branch','--show-current']),task.branch);assert.equal(git(tree,['status','--porcelain','--untracked-files=all']),'');assert.equal(git(tree,['rev-parse',submitted+'^']),implementation);git(tree,['merge-base','--is-ancestor',task.baseCommit,implementation]);
  const changed=git(tree,['diff','--name-only','-z',task.baseCommit,submitted]).split('\0').filter(Boolean);
  for(const p of changed)assert(task.allowedFiles.includes(p)||task.allowedPrefixes.some(a=>p.startsWith(a)),p);
  for(const p of git(tree,['diff','--name-only','-z',implementation,submitted]).split('\0').filter(Boolean))assert(p===task.report||p.startsWith('docs/acceptance/wave1/'+lane.toLowerCase()+'/'),p);
  const archivePath='docs/acceptance/wave1/'+lane.toLowerCase()+'/ARCHIVE.json',archive=json(join(tree,archivePath)),entries=archive.files;
  assert.equal(entries.length,archive.fileCount??archive.totalFiles);
  const batch=git(tree,['cat-file','--batch'],null,entries.map(f=>submitted+':'+f.archive+'\n').join(''));let cursor=0,total=0;
  for(const f of entries){assert(f.archive.startsWith('docs/acceptance/wave1/'+lane.toLowerCase()+'/')&&!f.archive.includes('..'));const source=isAbsolute(f.source)?f.source:join(tree,f.source);assert(!relative(join(tree,'.local'),source).startsWith('..'));
   const bytes=readFileSync(source);assert.deepEqual(bytes,readFileSync(join(tree,f.archive)),f.archive);assert.equal(bytes.length,f.bytes);assert.equal(hash(bytes),f.sha256);
   const end=batch.indexOf(10,cursor),size=Number(batch.subarray(cursor,end).toString().split(' ')[2]);assert.equal(size,f.bytes);assert.deepEqual(batch.subarray(end+1,end+1+size),bytes);cursor=end+2+size;total+=size;}
  assert.equal(cursor,batch.length);assert.equal(total,archive.totalBytes);Object.assign(item,{changedPaths:changed.length,archiveFiles:entries.length,archiveBytes:total,archiveIndexSha256:hash(readFileSync(join(tree,archivePath)))});
  for(const dir of [root,tree]) {for(const [p,sha] of frozen)assert.equal(hash(readFileSync(join(dir,p))),sha,p);for(const f of lock.gitObjects)assert.equal(git(dir,['hash-object','--path='+f.path,f.path]),f.objectId);}
  const dir=join(tree,'.local/checks',task.id),receipts=readdirSync(dir).filter(n=>n.endsWith('-result.json')).map(file=>({file,data:json(join(dir,file))}));item.finals=[];
  for(const mode of task.expectedFinalModes){const hits=receipts.filter(({data:r})=>r.mode===mode&&r.finalGate&&r.status==='passed'&&r.before.head===implementation);assert.equal(hits.length,1);const f=hits[0],r=f.data;
   assert.deepEqual(r.before,{head:implementation,status:''});assert.deepEqual(r.after,r.before);state(r.sourceState,dir,tree,implementation);
   for(const label of ['nc1','nc2']) {const proof=r.proofAudit.find(p=>p.label===label);assert(proof);const bad=json(join(dir,proof.red)),good=json(join(dir,proof.restored));
    assert(bad.status==='passed'&&bad.observedExpectedFailure);assert.equal(bad.sourceState.testHash,r.sourceState.testHash);assert.notEqual(bad.sourceState.productionHash,r.sourceState.productionHash);state(bad.sourceState,dir,tree);state(good.sourceState,dir,tree,implementation);assert.equal(good.mode,'test');assert.equal(good.status,'passed');assert(Date.parse(good.startedAt)>Date.parse(bad.endedAt));
    const text=bad.commands.filter(c=>c.log).map(c=>readFileSync(join(dir,c.log),'utf8')).join('\n');assert(text.includes(task.proofTargets[label]));assert(!/could not compile|SyntaxError|CDP timeout|Host event timeout|Native UI action failed/.test(text));
   }
   item.finals.push({mode,file:f.file,proof:r.proofAudit,nativeDialogs:r.nativeDialogs??0});
  }
  item.historicalFailedGates=receipts.filter(r=>r.data.status==='failed').map(r=>r.file);item.workerNativeDialogs=receipts.reduce((n,r)=>n+(r.data.nativeDialogs??0),0);assert(item.workerNativeDialogs<=task.nativeDialogBudget);
  const report=readFileSync(join(tree,task.report),'utf8');assert(report.includes(implementation));item.model=/GPT-6/.test(report)?'Codex / GPT-6 (worker self-report)':'See submitted report';item.status='passed';
 }
 result.frozenUniqueFiles=426;result.status='passed';
}catch(e){result.status='failed';result.error=e.stack;process.exitCode=1;}
result.endedAt=new Date().toISOString();const receipt=join(out,new Date().toISOString().replaceAll(':','-')+'-'+process.pid+'-submission-audit.json');writeFileSync(receipt,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,receipt}));
