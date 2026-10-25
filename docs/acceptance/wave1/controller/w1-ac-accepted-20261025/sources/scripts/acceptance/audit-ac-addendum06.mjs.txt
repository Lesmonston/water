// Receive the successful native supplement. Read-only, with no UI or product run.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {isAbsolute,join,relative,resolve} from 'node:path';
const root=resolve('.'),worker=join(root,'.worktrees/ac'),out=join(root,'.local/checks/controller-ac-acceptance-20261025');mkdirSync(out,{recursive:true});
const json=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,'')),hash=b=>createHash('sha256').update(b).digest('hex');
function git(argv,cwd=worker,input,encoding='utf8'){const r=spawnSync('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...argv],{cwd,input,encoding,windowsHide:true,timeout:30000,maxBuffer:32*1024*1024});assert(!r.error&&r.status===0,String(r.stderr));return encoding?r.stdout.trim():r.stdout;}
const submitted='29a895d7efa7f4a547d23ff74eb92729740d289d',tested='8a3b475918684a18be318415a9f7a54470c916b8',implementation='eb7f80178191e233068015bbc26dc9798ac8cb22',controllerBase='69df0d0913259567312a506dbfc50665313364fe';
const record={startedAt:new Date().toISOString(),submitted,tested,implementation,controllerBase,systemWindows:0,UIAEnumeration:false,productRun:false,downloads:0,networkChanges:false,excludedAAPixelsRead:false};
try{
 assert.equal(git(['rev-parse','HEAD'],root),controllerBase);assert.equal(git(['rev-parse','HEAD']),submitted);assert.equal(git(['rev-parse','HEAD^']),tested);assert.equal(git(['status','--porcelain','--untracked-files=all']),'');assert.equal(git(['branch','--show-current']),'worker/water-w1-ac');
 const task=json('docs/dispatch/wave1/manifest.json').tasks.find(t=>t.id==='WATER-W1-AC');
 record.submissionPaths=git(['diff','--name-only','-z',tested,submitted]).split('\0').filter(Boolean);for(const p of record.submissionPaths)assert(p===task.addendum06.report||p.startsWith(task.addendum06.evidencePrefix),p);
 const allChanges=git(['diff','--name-only','-z',task.baseCommit,submitted]).split('\0').filter(Boolean);for(const p of allChanges)assert(task.allowedFiles.includes(p)||task.allowedPrefixes.some(q=>p.startsWith(q)),p);
 assert.equal(git(['diff','--name-only',implementation,'HEAD','--',task.outputRoot]),'');
 record.importCommits=git(['rev-list','--reverse',task.baseCommit+'..'+submitted]).split('\n');assert.equal(record.importCommits.length,8);
 record.archives=[];record.historicalSourceExceptions=[];
 for(const suffix of['','/addendum-02','/addendum-03','/addendum-04','/addendum-05','/addendum-06']){
  const index='docs/acceptance/wave1/ac'+suffix+'/ARCHIVE.json',a=json(join(worker,index)),batch=git(['cat-file','--batch'],worker,a.entries.map(f=>submitted+':'+f.archive+'\n').join(''),null);let cursor=0,bytes=0;
  for(const f of a.entries){
   assert(!/\.(png|jpg|jpeg|bmp|webp)$/i.test(f.archive));const b=readFileSync(join(worker,f.archive));assert.equal(hash(b),f.sha256);assert.equal(b.length,f.bytes);
   const source=resolve(isAbsolute(f.source)?f.source:join(worker,f.source));assert(!relative(root,source).startsWith('..'));const current=readFileSync(source);
   if(!b.equals(current)){assert.equal(suffix,'');assert(['README.md','src/main.rs','src/v1.rs','tests/bootstrap_v1.rs'].some(p=>f.source==='apps/desktop-preview/'+p));assert.deepEqual(b,git(['show','ef0b7c4b3a84c434c0cd3b691b79c8a4a37d311c:'+f.source],worker,undefined,null));record.historicalSourceExceptions.push({path:f.source,sourceCommit:'ef0b7c4b3a84c434c0cd3b691b79c8a4a37d311c'});}
   const end=batch.indexOf(10,cursor),header=batch.subarray(cursor,end).toString().split(' ');assert.equal(header[1],'blob');const n=Number(header[2]);assert.deepEqual(batch.subarray(end+1,end+1+n),b);cursor=end+n+2;bytes+=n;
  }
  assert.equal(cursor,batch.length);assert.equal(bytes,a.totalBytes);record.archives.push({index,files:a.entries.length,bytes,indexSha256:hash(readFileSync(join(worker,index))),sourceArchiveGitEqual:true});
 }
 assert.deepEqual(record.archives.map(a=>a.files),[46,189,88,51,51,54]);assert.equal(record.archives.reduce((n,a)=>n+a.bytes,0),16293091);assert.equal(record.historicalSourceExceptions.length,4);
 const lock=json(task.addendum06.contractLock),physical=new Map(),objects=new Map();assert.equal(hash(readFileSync(task.addendum06.contractLock)),task.addendum06.lockSha256);
 for(const p of lock.inheritedLocks){const l=json(p);for(const f of l.files){if(physical.has(f.path))assert.equal(physical.get(f.path),f.sha256);physical.set(f.path,f.sha256);}for(const f of l.gitObjects??[])objects.set(f.path,f.objectId);}
 for(const f of lock.files)physical.set(f.path,f.sha256);assert.equal(new Set([...physical.keys(),...objects.keys()]).size,542);
 for(const[p,h]of physical){assert(!/\.png$/i.test(p));assert.equal(hash(readFileSync(p)),h,p);}for(const[p,h]of objects){assert(!/\.png$/i.test(p));assert.equal(git(['hash-object','--path='+p,p],root),h,p);}for(const f of lock.preservedSubmissionFiles)assert.equal(hash(readFileSync(join(worker,f.path))),f.sha256);
 const dir=join(worker,'docs/acceptance/wave1/ac/addendum-06/raw'),name=readdirSync(dir).find(n=>n.endsWith('-native-result.json')),n=json(join(dir,name)),u=n.native;
 assert.equal(n.status,'passed');assert.equal(n.supplement,6);assert.equal(n.final,true);assert.equal(n.windowAttempts,1);assert.equal(n.allFrozenUniqueFiles,542);assert.deepEqual(n.before,{head:tested,status:''});assert.deepEqual(n.after,n.before);
 assert(n.commands.every(c=>c.exitCode===0&&c.error===null));assert.equal(n.commands.length,6);assert(n.commands.find(c=>c.argv.includes('build')).argv.includes('--offline'));assert(n.commands.find(c=>c.argv.includes('build')).argv.includes('--locked'));
 assert.equal(n.observerExitCode,0);assert.equal(n.observerError,null);assert.equal(n.observerPrimaryError,null);assert(!n.nativeExitError);assert(!n.ownedTerminationRequested);assert.deepEqual(n.nativeExit,{code:0,signal:null});assert.equal(n.nativeWallMs,5510);assert.equal(u.error,null);assert.equal(u.cleanupError,null);assert.equal(u.exitCode,0);assert(u.closeRequested&&u.pageAccepted&&u.frameworkVerified);assert.equal(u.countingContract,'water.desktop-bootstrap-window.v1');assert.equal(u.rootSnapshots,2);
 assert.deepEqual(JSON.parse(readFileSync(join(dir,name.replace('-native-result.json','-uia.txt')),'utf8')),u);
 for(const s of[u.initialSnapshot,u.preCloseSnapshot]){assert.equal(s.rawRootCount,2);assert.equal(s.roots.length,2);assert.equal(s.metadataTruncated,false);assert.deepEqual(s.decision,{rawRootCount:2,capturedCount:2,applicationWindowCount:1,frameworkEventTargetCount:1,unclassifiedRootCount:0,invalidRootCount:0,mainIndex:0,frameworkVerified:true,accepted:true,error:null});assert(s.roots.every(r=>r.processId===6856&&r.readError===null));}
 assert.deepEqual(u.initialSnapshot.roots,u.preCloseSnapshot.roots);assert.equal(u.initialSnapshot.roots[0].nativeHandle,61933540);assert.deepEqual(u.initialSnapshot.roots[0].runtimeId,[42,61933540]);assert.equal(u.initialSnapshot.roots[1].className,'Tao Thread Event Target');assert.equal(u.initialSnapshot.roots[1].nativeHandle,29231650);assert.deepEqual(u.initialSnapshot.roots[1].runtimeId,[42,29231650]);
 for(const text of['Water','桌面壳已启动','尚未接入扫描','只读开发预览'])assert(u.names.includes(text));assert.equal(u.directoryDialogs,0);assert.equal(u.screenshotsTaken,0);
 assert.equal(u.children.length,7);assert.equal(u.children.filter(p=>p.name==='conhost.exe').length,1);assert.equal(u.children.filter(p=>p.name==='msedgewebview2.exe').length,6);assert(u.children.some(p=>p.commandLine?.includes(join(worker,'.local/desktop-webview/preview-6856-1792909338074288100'))));
 assert.deepEqual(n.childClose,{remaining:[]});assert(n.commands[5].argv.includes('-Command'));for(const p of u.children)assert(n.commands[5].argv.at(-1).includes('ProcessId='+p.processId));
 const end=json(join(dir,'PROCESS-END.txt'));assert.deepEqual(end.capturedPidsRemaining,[]);assert.equal(end.capturedPidsRemainingCount,0);assert.deepEqual(end.additionalOwnedMatches,[]);assert.equal(end.additionalOwnedMatchesCount,0);assert.equal(end.manualTerminations,0);assert.equal(end.helperTerminationRequested,false);
 const reservation=json(join(dir,'native-window-reservation.json'));assert.equal(reservation.previousAttempts,3);assert.equal(reservation.additionalStaticWindows,1);
 for(const f of n.sourceState.files){assert.equal(hash(readFileSync(join(worker,f.path))),f.sha256);assert.equal(hash(readFileSync(join(dir,f.snapshot))),f.sha256);assert.deepEqual(readFileSync(join(worker,f.path)),git(['show',implementation+':'+f.path],worker,undefined,null));}
 assert.equal(n.sourceState.files.length,14);assert.equal(n.sourceState.productionHash,task.addendum06.preservedProductionHash);assert.equal(n.sourceState.testHash,task.addendum06.preservedTestHash);
 for(const f of n.reusedFinals){const b=readFileSync(join(worker,f.path)),r=JSON.parse(b);assert.equal(hash(b),f.sha256);assert.equal(r.status,'passed');assert.equal(r.before.head,'82d04aaeef73030f65bc0a070b99a5517fd5d6a3');assert.deepEqual(r.before,r.after);assert.equal(r.sourceState.productionHash,n.sourceState.productionHash);assert.equal(r.sourceState.testHash,n.sourceState.testHash);assert.equal(r.proofAudit.length,2);}
 record.native={receipt:name,testedCommit:tested,pid:6856,rawRoots:2,applicationWindows:1,frameworkTargets:1,unknownAndInvalid:0,bothSnapshotsComplete:true,sameMainIdentity:true,fourTextsObserved:true,normalExitCode:0,childCloseGatePassed:true,childRecords:7,terminationRequested:false,wallMs:5510,attemptsThisSupplement:1,totalWorkerAllocationsConsumed:4};
 record.productionHash=n.sourceState.productionHash;record.testHash=n.sourceState.testHash;record.original14Files=n.sourceState.files;record.frameworkVerification=n.frameworkVerification;assert(n.frameworkVerification.exactTarMemberMatch);record.frozenUniqueFiles=542;record.status='passed_successful_submission_audit';
}catch(e){record.status='failed';record.error=e.stack;process.exitCode=1;}
record.endedAt=new Date().toISOString();const receipt=join(out,new Date().toISOString().replaceAll(':','-')+'-submission-audit.json');writeFileSync(receipt,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:record.status,receipt,error:record.error??null,archives:record.archives,native:record.native}));
