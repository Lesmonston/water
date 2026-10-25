// Read-only blocked receipt audit. No product, live UIA, pixels or network.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {isAbsolute,join,relative,resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
const root=resolve('.'),worker=join(root,'.worktrees/ac'),out=join(root,'.local/checks/controller-ac-window-20261025');
mkdirSync(out,{recursive:true});
const json=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,'')),hash=b=>createHash('sha256').update(b).digest('hex');
function git(argv,cwd=worker,input,encoding='utf8'){
 const r=spawnSync('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...argv],{cwd,input,encoding,windowsHide:true,timeout:30000,maxBuffer:32*1024*1024});
 assert(!r.error&&r.status===0,String(r.stderr));return encoding?r.stdout.trim():r.stdout;
}
const submitted='8a3b475918684a18be318415a9f7a54470c916b8',tested='a3334875139a3d6b03e1e71aecb6baad7c1c6711';
const record={startedAt:new Date().toISOString(),submitted,tested,implementation:'eb7f80178191e233068015bbc26dc9798ac8cb22',systemWindows:0,productTestsRun:false,UIAEnumerationRun:false,downloads:0,networkChanges:false,productSourceChanges:[],excludedAAPixelsRead:false};
try{
 assert.equal(git(['rev-parse','HEAD']),submitted);assert.equal(git(['rev-parse','HEAD^']),tested);assert.equal(git(['status','--porcelain','--untracked-files=all']),'');assert.equal(git(['branch','--show-current']),'worker/water-w1-ac');
 const task=json('docs/dispatch/wave1/manifest.json').tasks.find(t=>t.id==='WATER-W1-AC');
 record.submissionPaths=git(['diff','--name-only','-z',tested,submitted]).split('\0').filter(Boolean);
 for(const p of record.submissionPaths)assert(p===task.addendum05.report||p.startsWith(task.addendum05.evidencePrefix),p);
 assert.equal(git(['diff','--name-only',record.implementation,'HEAD','--','apps/desktop-preview']),'');
 record.archives=[];record.historicalSources=[];
 for(const suffix of['','/addendum-02','/addendum-03','/addendum-04','/addendum-05']){
  const index='docs/acceptance/wave1/ac'+suffix+'/ARCHIVE.json',a=json(join(worker,index)),entries=a.entries;
  const batch=git(['cat-file','--batch'],worker,entries.map(f=>submitted+':'+f.archive+'\n').join(''),null);let cursor=0,bytes=0;
  for(const f of entries){
   assert(!/\.png$/i.test(f.archive));const b=readFileSync(join(worker,f.archive));assert.equal(hash(b),f.sha256);assert.equal(b.length,f.bytes);
   const source=resolve(isAbsolute(f.source)?f.source:join(worker,f.source));assert(!relative(root,source).startsWith('..'));
   const live=readFileSync(source);
   if(!b.equals(live)){
    assert.equal(suffix,'');assert(['README.md','src/main.rs','src/v1.rs','tests/bootstrap_v1.rs'].some(p=>f.source==='apps/desktop-preview/'+p));
    assert.deepEqual(b,git(['show','ef0b7c4b3a84c434c0cd3b691b79c8a4a37d311c:'+f.source],worker,undefined,null));
    record.historicalSources.push({path:f.source,sha256:f.sha256,sourceCommit:'ef0b7c4b3a84c434c0cd3b691b79c8a4a37d311c',currentProductEvolutionAuthorized:true});
   }
   const end=batch.indexOf(10,cursor),header=batch.subarray(cursor,end).toString().split(' ');assert.equal(header[1],'blob');const n=Number(header[2]);assert.deepEqual(batch.subarray(end+1,end+1+n),b);cursor=end+n+2;bytes+=n;
  }
  assert.equal(cursor,batch.length);assert.equal(bytes,a.totalBytes);record.archives.push({index,files:entries.length,bytes,indexSha256:hash(readFileSync(join(worker,index))),sourceArchiveGitEqual:true,historicalSourceExceptions:!suffix?record.historicalSources.length:0});
 }
 assert.deepEqual(record.archives.map(a=>a.files),[46,189,88,51,51]);assert.equal(record.historicalSources.length,4);
 assert.equal(record.archives.reduce((n,a)=>n+a.bytes,0),15905754);
 const lock=json('contracts/desktop-bootstrap-root-v1/freeze.lock.json'),physical=new Map(),objects=new Map();
 for(const p of lock.inheritedLocks){const l=json(p);for(const f of l.files){if(physical.has(f.path))assert.equal(physical.get(f.path),f.sha256);physical.set(f.path,f.sha256);}for(const f of l.gitObjects??[])objects.set(f.path,f.objectId);}
 for(const f of lock.files)physical.set(f.path,f.sha256);assert.equal(new Set([...physical.keys(),...objects.keys()]).size,535);
 for(const[p,sha]of physical){assert(!/\.png$/i.test(p));assert.equal(hash(readFileSync(join(root,p))),sha,p);}for(const[p,obj]of objects){assert(!/\.png$/i.test(p));assert.equal(git(['hash-object','--path='+p,p],root),obj,p);}for(const f of lock.preservedSubmissionFiles)assert.equal(hash(readFileSync(join(worker,f.path))),f.sha256);
 const dir=join(worker,'docs/acceptance/wave1/ac/addendum-05/raw'),name=readdirSync(dir).find(n=>n.endsWith('-native-result.json')),native=json(join(dir,name)),u=native.native;
 assert.equal(native.status,'failed');assert.equal(native.windowAttempts,1);assert(native.final);assert.deepEqual(native.before,{head:tested,status:''});assert.deepEqual(native.after,native.before);assert.equal(native.allFrozenUniqueFiles,535);
 assert.equal(u.error,'Unexpected own top-level window count');assert.equal(u.rootCount,2);assert.equal(u.rootSnapshots,1);assert.equal(u.roots.length,2);assert.equal(u.rootMetadataTruncated,false);
 assert.deepEqual(u.roots.map(r=>({pid:r.processId,name:r.name,className:r.className,type:r.controlType,offscreen:r.isOffscreen,pattern:r.windowPatternAvailable,bounds:r.rectangle,readError:r.readError})),[
  {pid:43004,name:'Water Desktop Preview',className:'Tauri Window',type:'ControlType.Window',offscreen:false,pattern:true,bounds:[224,83,1268,997],readError:null},
  {pid:43004,name:'',className:'Tao Thread Event Target',type:'ControlType.Pane',offscreen:false,pattern:false,bounds:[0,0,18,18],readError:null}
 ]);
 assert.equal(u.rootDecision.mainCount,1);assert.equal(u.rootDecision.mainIndex,0);assert.equal(u.rootDecision.accepted,false);assert.equal(u.names.length,0);assert.equal(u.pageAccepted,false);
 assert(u.mainSelectedForCleanup&&u.closeRequested);assert.equal(u.cleanupError,null);assert.equal(u.exitCode,0);assert.deepEqual(native.nativeExit,{code:0,signal:null});assert.equal(native.nativeWallMs,2176);assert(!native.ownedTerminationRequested);assert(!native.nativeExitError);assert(!native.childClose);
 assert.equal(native.commands.find(c=>c.argv.includes('build')).exitCode,0);assert.equal(native.observerExitCode,1);assert.equal(native.observerError,null);
 assert.equal(u.children.length,7);assert.equal(u.children.filter(p=>p.name==='conhost.exe').length,1);assert.equal(u.children.filter(p=>p.name==='msedgewebview2.exe').length,6);
 assert(u.children.some(p=>p.commandLine?.toLowerCase().includes(join(worker,'.local/desktop-webview').toLowerCase())));
 for(const f of native.sourceState.files){assert.equal(hash(readFileSync(join(worker,f.path))),f.sha256);assert.equal(hash(readFileSync(join(dir,f.snapshot))),f.sha256);}
 assert.equal(native.sourceState.files.length,14);assert.equal(native.sourceState.productionHash,task.addendum05.preservedProductionHash);assert.equal(native.sourceState.testHash,task.addendum05.preservedTestHash);
 for(const f of native.reusedFinals){const r=json(join(worker,f.path));assert.equal(hash(readFileSync(join(worker,f.path))),f.sha256);assert.equal(r.status,'passed');assert.equal(r.before.head,'82d04aaeef73030f65bc0a070b99a5517fd5d6a3');assert.deepEqual(r.before,r.after);assert.equal(r.sourceState.productionHash,native.sourceState.productionHash);assert.equal(r.sourceState.testHash,native.sourceState.testHash);}
 const reservation=json(join(dir,'native-window-reservation.json'));assert.equal(reservation.additionalStaticWindows,1);assert.equal(reservation.previousAttempts,2);
 const end=json(join(dir,'PROCESS-END.txt'));assert.equal(end.capturedPidsRemaining,0);assert.equal(end.ownedProcessMatchesRemaining,0);assert.equal(end.manualTerminations,0);assert.equal(end.helperTerminationRequested,false);assert.equal(end.frozenChildCloseGateRan,false);
 record.workerNative={receipt:name,buildExit:0,observerExit:1,firstError:u.error,roots:u.roots,rootDecision:u.rootDecision,rootSnapshotComplete:true,pageCheckReached:false,normalMainExitVerified:true,childCloseGatePassed:false,separateLaterReadOnlyProcessQueryRemaining:0,terminationRequested:false,nativeWallMs:2176,attemptsThisSupplement:1,totalAttempts:3};
 record.productionHash=native.sourceState.productionHash;record.testHash=native.sourceState.testHash;record.original14Files=14;record.frozenUniqueFiles=535;record.previousWindowsConsumed=3;record.noWindowBudgetRemaining=true;
 // Independent comparison of the existing locked package's tar member, without extraction.
 const cache='.local/desktop-cargo-home/registry/',registry='mirrors.ustc.edu.cn-38d0e5eb5da2abae',archivePath=cache+'cache/'+registry+'/tao-0.37.2.crate',member='tao-0.37.2/src/platform_impl/windows/event_loop.rs',sourcePath=cache+'src/'+registry+'/tao-0.37.2/src/platform_impl/windows/event_loop.rs';
 const archive=readFileSync(join(worker,archivePath)),archiveSha=hash(archive);assert.equal(archiveSha,'d5777b06fe6435126ae8d816eba269e050e1e10d302cf5461e9c49eccabc3548');
 const cargoLock=readFileSync(join(worker,'apps/desktop-preview/Cargo.lock'));assert.equal(hash(cargoLock),'c56b58aa141a85617a59db4de679ff73d69827aee81bda958b1fdee0c9bbbfe8');assert(cargoLock.toString().includes('name = "tao"\nversion = "0.37.2"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "'+archiveSha+'"'));
 const tar=gunzipSync(archive,{maxOutputLength:16*1024*1024}),members=new Map();let count=0;
 for(let cursor=0;cursor+512<=tar.length;){const h=tar.subarray(cursor,cursor+512);if(h.every(b=>b===0))break;assert(++count<=4096);const str=(a,b)=>h.subarray(a,b).toString().replace(/\0.*$/s,'');const prefix=str(345,500),path=(prefix?prefix+'/':'')+str(0,100),size=parseInt(str(124,136).trim(),8);assert(Number.isSafeInteger(size)&&size>=0&&cursor+512+size<=tar.length);if([member,'tao-0.37.2/.cargo_vcs_info.json','tao-0.37.2/Cargo.toml'].includes(path)){assert(!members.has(path));members.set(path,tar.subarray(cursor+512,cursor+512+size));}cursor+=512+Math.ceil(size/512)*512;}
 const source=readFileSync(join(worker,sourcePath));assert.deepEqual(source,members.get(member));const sourceSha=hash(source);assert.equal(sourceSha,'bfe777ba15f00b9ca2a1fdd5093b2b02102dbafb5d23eca9f002d1f0c40eaf8a');
 const vcs=JSON.parse(members.get('tao-0.37.2/.cargo_vcs_info.json'));assert.equal(vcs.git.sha1,'2d9b2ba15247879787878ae565e350bcc1b9f622');assert.equal(vcs.git.dirty,true);assert(members.get('tao-0.37.2/Cargo.toml').toString().includes('license = "Apache-2.0"'));
 const lines=source.toString().split('\n');assert(lines[628].includes('Tao Thread Event Target'));assert(lines[627].includes('fn create_event_target_window'));assert(lines.slice(649,672).join('\n').includes('WS_EX_LAYERED'));assert(lines.slice(679,687).join('\n').includes('WS_VISIBLE | WS_POPUP'));
 record.framework={status:'passed',archivePath,archiveSha256:archiveSha,sourcePath,sourceSha256:sourceSha,archiveMember:member,exactTarMemberMatch:true,crate:'tao',version:'0.37.2',repository:'https://github.com/tauri-apps/tao',license:'Apache-2.0',declaredVcs:vcs,declaredCommitNotAnExactPublishedTreeProof:true,lines:{eventLoopCall:188,functionStart:628,classLiteral:629,createWindowEx:[650,672],styleUpdate:[680,687]},physicalVisibilityVerified:false};
 record.rootCountCause='Raw UIA includes the pinned Tao thread event target as well as the unique Tauri application main. Count semantics require explicit controller revision; original native remains failed.';
 record.status='passed_blocked_handoff_audit';
}catch(e){record.status='failed';record.error=e.stack;process.exitCode=1;}
record.endedAt=new Date().toISOString();const receipt=join(out,new Date().toISOString().replaceAll(':','-')+'-submission-audit.json');writeFileSync(receipt,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:record.status,receipt,error:record.error??null,archives:record.archives,framework:record.framework,productHash:record.productionHash,testHash:record.testHash}));
