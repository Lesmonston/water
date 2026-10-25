// Final byte/index/document audit, never product execution or live UIA.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {dirname,join,relative,resolve} from 'node:path';
const root=resolve('.'),worker=join(root,'.worktrees/ac'),out='docs/acceptance/wave1/controller/w1-ac-window-20261025',base='ea1069a5d0fed5557e3db2725fa8bcf90db29941';
const json=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,'')),hash=b=>createHash('sha256').update(b).digest('hex');
function git(argv,{cwd=root,input,encoding='utf8',check=true}={}){const r=spawnSync('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...argv],{cwd,input,encoding,windowsHide:true,timeout:30000,maxBuffer:32*1024*1024});if(check)assert(!r.error&&r.status===0,String(r.stderr));return r;}
const stdout=(args,options)=>git(args,options).stdout.trim();
assert.equal(stdout(['rev-parse','HEAD']),base);assert.equal(stdout(['rev-parse','HEAD'],{cwd:worker}),'8a3b475918684a18be318415a9f7a54470c916b8');assert.equal(stdout(['status','--porcelain','--untracked-files=all'],{cwd:worker}),'');
assert.equal(stdout(['diff','--name-only','eb7f80178191e233068015bbc26dc9798ac8cb22','HEAD','--','apps/desktop-preview'],{cwd:worker}),'');
const mp='docs/dispatch/wave1/manifest.json',rp='docs/dispatch/registry.json',m=json(mp),r=json(rp),task=m.tasks.find(t=>t.id==='WATER-W1-AC');
for(const[path,current]of[[mp,m],[rp,r]]){
 const old=JSON.parse(stdout(['show',base+':'+path]));assert.deepEqual(current.tasks.filter(t=>t.id!=='WATER-W1-AC'),old.tasks.filter(t=>t.id!=='WATER-W1-AC'));assert.equal(current.tasks.length,31);
 if(current.slots)assert.deepEqual(current.slots.filter(s=>s.id!=='ac'),old.slots.filter(s=>s.id!=='ac'));
 const t=current.tasks.find(t=>t.id==='WATER-W1-AC');assert.equal(t.status,'BLOCKED');assert.equal(t.addendum05.status,'BLOCKED');assert.equal(t.addendum05.native,'FAILED');assert.equal(t.addendum05.additionalStaticWindowBudgetRemaining,0);assert.equal(t.addendum06.status,'READY');assert.equal(t.addendum06.baselineStatus,'PASSED');assert.equal(t.addendum06.additionalStaticWindowBudgetRemaining,1);assert.equal(t.addendum06.dispatchedAt,null);assert.equal(t.addendum06.startedAt,null);
}
assert.deepEqual(task.addendum06,r.tasks.find(t=>t.id==='WATER-W1-AC').addendum06);
const l=json(task.addendum06.contractLock),physical=new Map(),objects=new Map();assert.equal(hash(readFileSync(task.addendum06.contractLock)),task.addendum06.lockSha256);assert.equal(l.inheritedLocks.length,24);
for(const p of l.inheritedLocks){const a=json(p);for(const f of a.files){if(physical.has(f.path))assert.equal(physical.get(f.path),f.sha256);physical.set(f.path,f.sha256);}for(const f of a.gitObjects??[])objects.set(f.path,f.objectId);}
for(const f of l.files)physical.set(f.path,f.sha256);assert.equal(new Set([...physical.keys(),...objects.keys()]).size,542);
for(const[p,h]of physical){assert(!/\.png$/i.test(p));assert.equal(hash(readFileSync(p)),h,p);}for(const[p,h]of objects){assert(!/\.png$/i.test(p));assert.equal(stdout(['hash-object','--path='+p,p]),h,p);}for(const f of l.preservedSubmissionFiles)assert.equal(hash(readFileSync(join(worker,f.path))),f.sha256);
const a=json(out+'/ARCHIVE.json');assert.equal(a.count,109);assert.equal(a.totalBytes,782189);assert.equal(new Set(a.entries.map(e=>e.archive)).size,a.count);let archivedBytes=0;
for(const f of a.entries){assert(!/\.(png|jpg|jpeg|bmp|webp)$/i.test(f.source));assert(!relative(root,resolve(f.source)).startsWith('..'));const b=readFileSync(f.archive);assert.equal(b.length,f.bytes);assert.equal(hash(b),f.sha256);assert.deepEqual(b,readFileSync(f.source),f.source);archivedBytes+=b.length;}
assert.equal(archivedBytes,a.totalBytes);
for(const name of['2026-10-25T05-55-13.968Z-28028-preflight-result.json','2026-10-25T05-57-56.671Z-23648-resume-result.json']){const result=json(out+'/preflight/'+name);assert.equal(result.status,'passed');assert.equal(result.windowAttempts,0);assert.equal(result.productTestsRun,false);assert.deepEqual(result.before,result.after);assert.equal(result.before.head,task.addendum06.resumeCommit);assert(result.frameworkVerification.exactTarMemberMatch);}
assert(!existsSync(join(worker,'.local/checks/WATER-W1-AC-ADDENDUM-06/native-window-reservation.json')));
const authored=[
 'AGENTS.md','README.md','docs/STATUS.md','docs/CONTROLLER-WORKFLOW.md','docs/dispatch/README.md',mp,rp,
 'docs/dispatch/wave1/PLAN.md','docs/dispatch/wave1/AFTER-AC-NATIVE-PLAN-20261024.md',
 'docs/dispatch/tickets/WATER-W1-AC-DESKTOP-BOOTSTRAP-20261023.md','docs/dispatch/tickets/WATER-W1-AC-ADDENDUM-05-20261024.md',task.addendum06.ticket,
 'docs/dispatch/wave1/AC-DESKTOP-ADDENDUM-05-READY-REPORT-20261024.md','docs/dispatch/wave1/AC-DESKTOP-ADDENDUM-06-READY-REPORT-20261025.md',task.controllerReview,
 'contracts/desktop-bootstrap-window-v1/SPEC.md','contracts/desktop-bootstrap-window-v1/FRAMEWORK.json','contracts/desktop-bootstrap-window-v1/freeze.lock.json',
 'scripts/ac-window-check.mjs','scripts/acceptance/audit-ac-addendum05.mjs','scripts/acceptance/prepare-ac-window.mjs','scripts/acceptance/finalize-ac-window-review.mjs','scripts/acceptance/validate-ac-window-handoff.mjs',
 'scripts/acceptance/desktop-native-window-policy.ps1','scripts/acceptance/desktop-native-window-probe.ps1','scripts/acceptance/desktop-native-window-observe.ps1',out+'/.gitattributes',out+'/ARCHIVE.json',out+'/FINAL-AUDIT.json'
];
let links=0;
for(const p of authored.filter(p=>p.endsWith('.md'))){const text=readFileSync(p,'utf8');for(const match of text.matchAll(/(?<!!)\[[^\]\n]+\]\(([^)\n]+)\)/g)){const target=match[1].replace(/^<|>$/g,'');if(/^(https?:|mailto:|#)/i.test(target))continue;const path=resolve(dirname(p),decodeURI(target.split('#')[0]));assert(existsSync(path),p+' -> '+target);links++;}}
const staged=stdout(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean);assert(staged.length>0);
for(const p of staged)assert(authored.includes(p)||p.startsWith(out+'/'),p);
for(const p of authored)assert(staged.includes(p),p);
const batch=git(['cat-file','--batch'],{input:staged.map(p=>':'+p+'\n').join(''),encoding:null}).stdout;let cursor=0,normalizedPS1=0;
for(const p of staged){
 const end=batch.indexOf(10,cursor),header=batch.subarray(cursor,end).toString().split(' ');assert.equal(header[1],'blob',p);const bytes=Number(header[2]),blob=batch.subarray(end+1,end+1+bytes),working=readFileSync(p);
 if(p.endsWith('.ps1')){assert(working.includes(Buffer.from('\r\n')));assert(!working.toString().replaceAll('\r\n','').includes('\n'));assert.deepEqual(blob,Buffer.from(working.toString().replaceAll('\r\n','\n')),p);normalizedPS1++;}
 else assert.deepEqual(blob,working,p);
 cursor=end+bytes+2;
}
assert.equal(cursor,batch.length);assert.equal(normalizedPS1,3);
const authoredWhitespace=git(['diff','--cached','--check','--',...authored],{check:false}),rawWhitespace=git(['diff','--cached','--check','--',...a.entries.map(e=>e.archive)],{check:false});assert.equal(authoredWhitespace.status,0,authoredWhitespace.stdout);assert([0,2].includes(rawWhitespace.status));
writeFileSync(out+'/AUTHORED-WHITESPACE.log',authoredWhitespace.stdout+authoredWhitespace.stderr,{flag:'wx'});writeFileSync(out+'/RAW-WHITESPACE.log',rawWhitespace.stdout+rawWhitespace.stderr,{flag:'wx'});
const facts={at:new Date().toISOString(),status:'passed',stagedPathsAudited:staged.length,localLinks:links,otherTaskAndSlotObjectsPreserved:30,frozenUniqueFiles:542,physicalPS1CRLFGitBlobLF:normalizedPS1,controllerArchiveEntries:a.count,controllerArchiveBytes:a.totalBytes,allArchiveSourceAndStagedBytesEqual:true,workerCleanAt:task.addendum06.resumeCommit,workerProductDiffEmpty:true,original425PreservedByCleanReceiptAndIndexes:true,authoredWhitespaceExit:authoredWhitespace.status,rawWhitespaceExit:rawWhitespace.status,rawWhitespacePreserved:true,originalArchiveMarkdownBytesPreservedByLocalAttributes:true,rawWhitespaceLogSha256:hash(readFileSync(out+'/RAW-WHITESPACE.log')),authoredWhitespaceLogSha256:hash(readFileSync(out+'/AUTHORED-WHITESPACE.log')),nativeActuallyRun:false,windowsOpened:0,builds:0,dependencyDownloads:0,networkChanges:false,productAccepted:false,metadataExclusion:'This validation and its two whitespace logs are added after the indexed archive; no self-referential hashes or rewriting of the 109 archived entries.'};
writeFileSync(out+'/HANDOFF-VALIDATION.json',JSON.stringify(facts,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(facts));
