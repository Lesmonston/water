// AA/AB focused gates. Contract/resource discipline, not an operating-system sandbox.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync,writeFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {setup} from './parallel-next-common.mjs';
import {rustEnvironment} from './next-core-runtime.mjs';
import {capture} from './scope-export-proof.mjs';
import {prepareProjectFixtures} from './project-wave-fixtures.mjs';
import {projectBaseline} from './project-wave-baseline.mjs';
const modes=['baseline','lock','check','test','browser','native','red-behavior','red-nc1','red-nc2'];
const ctx=setup(['WATER-W1-AA','WATER-W1-AB'],modes);
const {root,task,mode,record,command,env}=ctx,lane=task.id.slice(-2),node=lane==='AB',red=mode.startsWith('red-');
const hash=b=>createHash('sha256').update(b).digest('hex');let fault,fixture;
function checkoutObjects(){const lock=JSON.parse(readFileSync(join(ctx.controller,task.contractLock)));for(const l of [...lock.inheritedLocks.map(p=>JSON.parse(readFileSync(join(ctx.controller,p)))),lock])for(const f of l.gitObjects??[])assert.equal(ctx.git(['hash-object','--path='+f.path,f.path]),f.objectId,'Verified legacy Git content changed: '+f.path);}
function sourceState() {
 if(!node)return capture(ctx);
 const files=[...task.productionFiles,...task.testFiles].map((path,i)=>{const bytes=readFileSync(join(root,path));assert(bytes.length<1048576);const snapshot=ctx.stamp+'-'+mode+'-source-'+i+'.txt';writeFileSync(join(ctx.output,snapshot),bytes,{flag:'wx'});return{path,sha256:hash(bytes),snapshot,test:task.testFiles.includes(path)};});
 const digest=list=>hash(Buffer.from(JSON.stringify(list.map(({path,sha256})=>({path,sha256})))));
 return{files,productionHash:digest(files.filter(f=>!f.test)),testHash:digest(files.filter(f=>f.test))};
}
function proofAudit(current) {
 const all=readdirSync(ctx.output).filter(n=>n.endsWith('-result.json')).map(file=>({file,data:JSON.parse(readFileSync(join(ctx.output,file)))}));
 assert(all.some(({data:r})=>r.mode==='red-behavior'&&r.status==='passed'&&r.observedExpectedFailure),'Missing first runnable behavior red');
 record.proofAudit=[];
 for(const label of ['nc1','nc2']) {
  const bad=all.filter(({data:r})=>r.mode==='red-'+label&&r.status==='passed'&&r.observedExpectedFailure&&r.sourceState?.testHash===current.testHash).sort((a,b)=>a.file.localeCompare(b.file)).at(-1);
  assert(bad,'Missing current-test production negative '+label);assert.notEqual(bad.data.sourceState.productionHash,current.productionHash);
  const next=all.filter(({data:r})=>r.mode.startsWith('red-')&&r.status==='passed'&&Date.parse(r.startedAt)>Date.parse(bad.data.endedAt)).sort((a,b)=>a.file.localeCompare(b.file))[0];
  const good=all.filter(({data:r})=>r.mode==='test'&&r.status==='passed'&&r.sourceState?.testHash===current.testHash&&r.sourceState.productionHash===current.productionHash&&Date.parse(r.startedAt)>Date.parse(bad.data.endedAt)&&(!next||Date.parse(r.endedAt)<Date.parse(next.data.startedAt))).sort((a,b)=>a.file.localeCompare(b.file)).at(-1);
  assert(good,'Missing immediate byte restore and affected tests '+label);
  for(const x of [bad,good]) for(const f of x.data.sourceState.files)assert.equal(hash(readFileSync(join(ctx.output,f.snapshot))),f.sha256);
  record.proofAudit.push({label,red:bad.file,restored:good.file});
 }
}
function resultTests(text,names,passed) {
 const found=node?[...text.matchAll(/^# Subtest: (.+)\r?$/gm)].map(m=>m[1]):[...text.matchAll(/^test ([a-z0-9_]+) \.\.\. (?:ok|FAILED)$/gm)].map(m=>m[1]);
 assert.deepEqual(found.sort(),[...names].sort(),'Exact assigned test list');
 if(node) {for(const k of ['cancelled','skipped','todo'])assert(new RegExp('^# '+k+' 0\\r?$','m').test(text));if(passed)assert(new RegExp('^# pass '+names.length+'\\r?$','m').test(text));}
 else {assert(text.includes('0 ignored; 0 measured; 0 filtered out'));if(passed)assert(text.includes(names.length+' passed; 0 failed;'));}
}
function execute(binary,argv,expected,names) {
 if(expected===0){const text=command(binary,argv,180000);if(names)resultTests(text,names,true);return text;}
 const r=spawnSync(binary,argv,{cwd:root,env,encoding:'utf8',windowsHide:true,shell:false,timeout:180000,maxBuffer:96*1024*1024});
 const log=ctx.stamp+'-'+mode+'-negative.log',text=(r.stdout??'')+'\n'+(r.stderr??'');
 writeFileSync(join(ctx.output,log),JSON.stringify({binary,argv,exitCode:r.status,error:r.error?.code??null})+'\n'+text,{flag:'wx'});record.commands.push({binary,argv,exitCode:r.status,error:r.error?.code??null,log});
 assert(!r.error&&r.status===expected,'Need runnable target red');assert(!/could not compile|error\[E\d+\]|SyntaxError|ERR_MODULE_NOT_FOUND|CDP timeout|Host event timeout|Host failed to exit|download timed out|Native UI action failed/i.test(text),'Infrastructure failure is not a negative proof');
 const target=mode==='red-behavior'?lane+'_BEHAVIOR':task.proofTargets[mode.slice(4)];assert(text.includes(target),'Missing target '+target);if(names)resultTests(text,names,false);
 record.observedExpectedFailure=true;record.expectation={target,exitCode:r.status};return r.stdout;
}
function nativeBudget(estimate) {
 const count=readdirSync(ctx.output).filter(n=>n.endsWith('-result.json')).map(n=>{const r=JSON.parse(readFileSync(join(ctx.output,n)));return r.nativeDialogReservations??r.nativeDialogs??0;}).reduce((a,b)=>a+b,0);
 assert(count+estimate<=task.nativeDialogBudget,'Native dialog budget exhausted; retain evidence and report');
}
try {
 checkoutObjects();
 assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert(!ctx.finalGate||task.expectedFinalModes.includes(mode));
 if(mode==='baseline'){record.baseline=projectBaseline(ctx);record.newProductTested=false;record.nativeDialogs=0;}
 else {
  let rust,manifest,args,meta,pkg;
  if(!node) {
   fixture=prepareProjectFixtures(ctx);env.WATER_MARKER_INDEX=fixture.indexPath;record.fixtureSha256=fixture.sha256;
   rust=rustEnvironment(ctx);manifest=task.outputRoot+'/Cargo.toml';args=['--manifest-path',manifest];
   const text=readFileSync(join(root,manifest),'utf8');assert(!/\[(?:patch|replace)(?:[.\]])|^\s*(?:git|registry|build|harness|rustc-wrapper|runner)\s*=/mi.test(text));
   for(const k of ['autobins','autotests','autoexamples','autobenches'])assert(new RegExp('^'+k+'\\s*=\\s*false\\s*$','m').test(text));
   if(mode==='lock')command(rust.cargo,['generate-lockfile','--offline',...args],180000);
   meta=JSON.parse(command(rust.cargo,['metadata','--offline','--locked','--format-version','1',...args],180000));pkg=meta.packages.find(p=>p.name===task.packageName);
   assert(pkg&&pkg.version==='0.1.0'&&pkg.edition==='2024'&&['1.95','1.95.0'].includes(pkg.rust_version));assert.deepEqual(pkg.publish,[]);assert.deepEqual(meta.workspace_members,[pkg.id]);assert.equal(pkg.targets.length,3);
   assert.deepEqual(pkg.dependencies.map(d=>d.name).sort(),[...task.directDependencies].sort());assert(pkg.dependencies.every(d=>d.kind===null&&!d.optional));
   for(const d of pkg.dependencies) {if(d.source){assert.equal(d.source,'registry+https://github.com/rust-lang/crates.io-index');assert(['serde','serde_json'].includes(d.name));assert.equal(d.req,d.name==='serde'?'=1.0.229':'=1.0.151');assert.deepEqual(d.features,d.name==='serde'?['derive']:[]);}else{assert.equal(d.path.replaceAll('\\','/'),join(root,task.dependencyPaths[d.name]).replaceAll('\\','/'));}}
   for(const [name,path,kind] of [[task.crateName,task.outputRoot+'/src/lib.rs','lib'],[task.testTarget,task.testFiles[0],'test'],['water-project-session',task.outputRoot+'/src/main.rs','bin']]) {const t=pkg.targets.find(t=>t.name===name&&t.kind.includes(kind));assert(t&&ctx.same(t.src_path,join(root,path)));}
   assert(readFileSync(join(root,task.outputRoot,'src/main.rs'),'utf8').includes('#![forbid(unsafe_code)]'));
   const approved=readFileSync(join(root,'Cargo.lock'),'utf8').split('[[package]]');
   for(const p of readFileSync(join(root,task.outputRoot,'Cargo.lock'),'utf8').split('[[package]]')) if(p.includes('source = "registry+'))assert(approved.some(a=>/^name = "([^"\n]+)"/m.exec(a)?.[1]===/^name = "([^"\n]+)"/m.exec(p)?.[1]&&/^version = "([^"\n]+)"/m.exec(a)?.[1]===/^version = "([^"\n]+)"/m.exec(p)?.[1]&&/^checksum = "([^"\n]+)"/m.exec(a)?.[1]===/^checksum = "([^"\n]+)"/m.exec(p)?.[1]));
   const attrs=readFileSync(join(root,task.outputRoot,'src/lib.rs'),'utf8');assert(attrs.includes('#![forbid(unsafe_code)]'));
  } else {assert.equal(readFileSync(join(root,task.outputRoot,'.gitattributes'),'utf8'),'.gitattributes text eol=lf\n*.mjs text eol=lf\n*.html text eol=lf\n*.css text eol=lf\n');assert(!existsSync(join(root,task.outputRoot,'package.json')));}
  record.sourceState=sourceState();if(ctx.finalGate)proofAudit(record.sourceState);
  if(mode==='check') {
   if(node) for(const p of [...task.productionFiles,...task.testFiles].filter(p=>p.endsWith('.mjs')))command(process.execPath,['--check',p],180000);
   else {command(rust.cargo,['fmt',...args,'--','--check'],180000);command(rust.cargo,['clippy','--offline','--locked',...args,'--all-targets','--','-D','warnings'],180000);}
  } else if(mode==='native') {
   assert.equal(lane,'AA');const estimate=4;nativeBudget(estimate);record.nativeDialogReservations=estimate;command(rust.cargo,['build','--offline','--locked',...args,'--bin','water-project-session'],180000);
   const text=execute(process.execPath,['scripts/acceptance/project-host-driver.mjs','native'],red?1:0);
   const summary=JSON.parse(text.trim());record.nativeDialogs=summary.systemNativeDialogs;assert.equal(summary.systemNativeDialogs,4);record.native=summary;record.productTestsRun=true;
  } else if(mode!=='lock') {
   const names=mode==='browser'?task.expectedBrowserTests:task.expectedTests;
   assert(mode!=='browser'||node);
   const binary=node?process.execPath:rust.cargo,argv=node?['--test','--test-concurrency=1','--test-reporter=tap',task.testFiles[mode==='browser'?1:0]]:['test','--offline','--locked',...args,'--test',task.testTarget,'--','--test-threads=1','--nocapture'];
   execute(binary,argv,red?(node?1:101):0,names);record.productTestsRun=true;
   if(mode==='browser') {record.screenshots=[];for(const name of ['project-workspace-1440x1000.png','project-workspace-900x800.png','project-workspace-cancel.png']) {const path=join(root,'.local/browser-lab',name);assert(statSync(path).mtimeMs>=Date.parse(record.startedAt)-1000);const snapshot=ctx.stamp+'-'+mode+'-'+name;writeFileSync(join(ctx.output,snapshot),readFileSync(path),{flag:'wx'});record.screenshots.push(snapshot);}}
  }
 }
} catch(e){fault=e;}
if(fixture)try{assert.equal(prepareProjectFixtures(ctx).sha256,fixture.sha256);}catch(e){fault??=e;}
try{checkoutObjects();}catch(e){fault??=e;}
ctx.finish(fault);
