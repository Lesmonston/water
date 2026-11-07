// Controller-owned gate for wave 2 (device junk checkup) and the wave 4 hardening tickets G1 (junk-clean)
// and G3 (UI), wave 5 (M2), wave 6 (M3), wave 7 (M3 fixes), wave 8 (M3 close), wave 9 (M3 close fixes) and wave 10 (M3.5). Not an OS sandbox. WATER-W4-* to WATER-W10-* task IDs read docs/dispatch/wave4|...|wave10/manifest.json.
// Usage from the task worktree root:
//   node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W2-A --mode <mode> [--final]
// Modes: baseline | lock | check | test | browser | real | red-nc1 | red-nc2 | red-nc3 | archive
// Rust negative controls change <outputRoot>/src unless the task lists negativeControlPaths (W10-M12: rules data only).
// UI browser runs write screenshots to WATER_W2_SHOTS_DIR under .local/checks; archive copies them into the evidence dir.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {copyFileSync,cpSync,existsSync,lstatSync,mkdirSync,readFileSync,readdirSync,realpathSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname,isAbsolute,join,relative,resolve,sep} from 'node:path';

const root=resolve('.'),argv=process.argv.slice(2);
assert.equal(argv[0],'--task','Usage: --task <id> --mode <mode> [--final]');assert.equal(argv[2],'--mode');
const id=argv[1],mode=argv[3],finalGate=argv[4]==='--final';assert.equal(argv.length,finalGate?5:4,'Unexpected arguments');
const MODES=['baseline','lock','check','test','browser','real','red-nc1','red-nc2','red-nc3','archive'];assert(MODES.includes(mode),'Unknown mode');
const gitRaw=(args,cwd=root)=>{const r=spawnSync('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...args],{cwd,encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:64*1024*1024});assert(!r.error&&r.status===0,String(r.stderr));return r.stdout.trim();};
const controller=dirname(gitRaw(['rev-parse','--path-format=absolute','--git-common-dir']));
const manifestOverride=process.env.WATER_W2_SELFTEST_MANIFEST??null;
const wave=id.startsWith('WATER-W10-')?'wave10':id.startsWith('WATER-W9-')?'wave9':id.startsWith('WATER-W8-')?'wave8':id.startsWith('WATER-W7-')?'wave7':id.startsWith('WATER-W6-')?'wave6':id.startsWith('WATER-W5-')?'wave5':id.startsWith('WATER-W4-')?'wave4':'wave2';
if(manifestOverride){assert(['WATER-W2-SELFTEST','WATER-W2-ACCEPT-','WATER-W4-SELFTEST','WATER-W4-ACCEPT-','WATER-W5-SELFTEST','WATER-W5-ACCEPT-','WATER-W6-SELFTEST','WATER-W6-ACCEPT-','WATER-W7-SELFTEST','WATER-W7-ACCEPT-','WATER-W8-SELFTEST','WATER-W8-ACCEPT-','WATER-W9-SELFTEST','WATER-W9-ACCEPT-','WATER-W10-SELFTEST','WATER-W10-ACCEPT-'].some(p=>id.startsWith(p)),'Override manifest is only for controller self-test or acceptance tasks');const rel=relative(join(controller,'.local'),resolve(manifestOverride));assert(!rel.startsWith('..')&&!isAbsolute(rel),'Self-test manifest must live under controller .local');}
const manifestPath=manifestOverride?resolve(manifestOverride):join(controller,'docs/dispatch/'+wave+'/manifest.json');
const manifest=JSON.parse(readFileSync(manifestPath)),task=manifest.tasks.find(t=>t.id===id);assert(task,'Unknown task');
assert.equal(realpathSync(task.worktree).toLowerCase(),realpathSync(root).toLowerCase(),'Run from the task worktree root');
assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(Number(process.versions.node.split('.')[0]),24,'Node 24 required');
assert((task.allowedModes??[]).includes(mode),'Mode not assigned to this task');
if(finalGate)assert((task.expectedFinalModes??[]).includes(mode),'Mode has no final gate');

const hash=b=>createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(readFileSync(p));
const env={...process.env,GIT_OPTIONAL_LOCKS:'0',RUSTUP_AUTO_INSTALL:'0'};
for(const k of Object.keys(env))if(/^(?:CARGO_|RUST|NODE_OPTIONS$|NODE_PATH$|WATER_|WEBVIEW2_)/i.test(k)&&k!=='RUSTUP_AUTO_INSTALL')delete env[k];
function local(p){const d=join(root,p);const rel=relative(root,d);assert(!rel.startsWith('..')&&!isAbsolute(rel));mkdirSync(d,{recursive:true});assert(lstatSync(d).isDirectory()&&!lstatSync(d).isSymbolicLink());return d;}
const stamp=new Date().toISOString().replaceAll(':','-')+'-'+process.pid,out=local('.local/checks/'+id);
const record={task:id,mode,finalGate,manifest:relative(controller,manifestPath).split(sep).join('/'),startedAt:new Date().toISOString(),realDataRead:false,productTestsRun:false,commands:[]};let seq=0;
function git(args){const r=gitRaw(args);record.commands.push({binary:'git',argv:args,exitCode:0});return r;}
function command(binary,args,{timeout=600000,expected=0,cwd=root,extraEnv={}}={}){const r=spawnSync(binary,args,{cwd,env:{...env,...extraEnv},encoding:'utf8',shell:false,windowsHide:true,timeout,maxBuffer:128*1024*1024});const log=stamp+'-'+mode+'-'+(++seq)+'.log';writeFileSync(join(out,log),JSON.stringify({binary,args,exitCode:r.status,error:r.error?.code??null})+'\n--- stdout ---\n'+(r.stdout??'')+'\n--- stderr ---\n'+(r.stderr??''),{flag:'wx'});record.commands.push({binary,argv:args,exitCode:r.status,error:r.error?.code??null,log});assert(!r.error,'Command error '+log);if(expected!==null)assert.equal(r.status,expected,'Unexpected exit, see '+log);return{status:r.status,stdout:r.stdout??'',stderr:r.stderr??'',text:(r.stdout??'')+'\n'+(r.stderr??''),log};}
const state=()=>({head:git(['rev-parse','HEAD']),status:git(['status','--porcelain','--untracked-files=all'])});

function audit(){
  assert.equal(git(['branch','--show-current']),task.branch,'Wrong branch');
  git(['merge-base','--is-ancestor',task.baseCommit,'HEAD']);
  const changes=[git(['diff','--no-renames','--name-only','-z',task.baseCommit,'HEAD']),git(['diff','--no-renames','--name-only','-z','HEAD']),git(['ls-files','--others','--exclude-standard','-z'])].flatMap(s=>s.split('\0').filter(Boolean));
  for(const p of new Set(changes))assert(task.allowedFiles.includes(p)||task.allowedPrefixes.some(q=>p.startsWith(q)),'Out of scope: '+p);
  for(const f of [...(manifest.frozenFiles??[]),...(task.frozenFiles??[])])assert.equal(hash(readFileSync(join(root,f.path))),f.sha256,'Frozen file changed: '+f.path);
  record.changedPaths=[...new Set(changes)].sort();
}
function rustEnv(){
  const rustup=join(homedir(),'.cargo/bin/rustup.exe');
  const cargo=command(rustup,['which','cargo','--toolchain','1.95.0']).stdout.trim(),rustc=command(rustup,['which','rustc','--toolchain','1.95.0']).stdout.trim();
  assert(isAbsolute(cargo)&&isAbsolute(rustc));assert(command(rustc,['--version']).stdout.startsWith('rustc 1.95.0 '));
  for(let p=root;;p=dirname(p)){for(const n of['config','config.toml'])assert(!existsSync(join(p,'.cargo',n)),'Unexpected cargo config at '+p);if(dirname(p)===p)break;}
  // One target directory per package: every package's real smoke is an example named real_smoke, and in a tree that
  // holds several packages (integration tree A) a fresh unit is not relinked, so a shared target ran another
  // package's real_smoke.exe (seventh integration, 2026-11-07).
  const home=local('.local/w2-cargo-home'),target=local('.local/w2-target/'+task.outputRoot.split('/').pop()),tmp=local('.local/w2-tmp');
  for(const n of['config','config.toml'])assert(!existsSync(join(home,n)));
  if(!existsSync(join(home,'registry'))){const src=resolve(task.cargoCacheSource);const rel=relative(controller,src);assert(!rel.startsWith('..')&&!isAbsolute(rel));cpSync(src,join(home,'registry'),{recursive:true,force:false,errorOnExist:true});record.cacheCopiedFrom=src;}
  Object.assign(env,{RUSTUP_TOOLCHAIN:'1.95.0',RUSTC:rustc,RUSTDOC:join(dirname(rustc),'rustdoc.exe'),CARGO_HOME:home,CARGO_TARGET_DIR:target,CARGO_BUILD_JOBS:'1',CARGO_NET_OFFLINE:'true',CARGO_TERM_COLOR:'never',TEMP:tmp,TMP:tmp,TMPDIR:tmp});
  const k=Object.keys(env).find(k=>k.toLowerCase()==='path')??'PATH';env[k]=dirname(rustc)+';'+(env[k]??'');
  return{cargo,rustc,home,target,tmp,manifestArgs:['--manifest-path',task.outputRoot+'/Cargo.toml']};
}
const ALLOWED_REGISTRY={itoa:'1.0.18',memchr:'2.8.3','proc-macro2':'1.0.107',quote:'1.0.47',serde:'1.0.229',serde_core:'1.0.229',serde_derive:'1.0.229',serde_json:'1.0.151',syn:'3.0.9','unicode-ident':'1.0.27',zmij:'1.0.23'};
function dependencyPolicy(rust){
  const m=JSON.parse(command(rust.cargo,['metadata','--offline','--locked','--format-version','1',...rust.manifestArgs]).stdout);
  const p=m.packages.find(p=>p.name===task.packageName);assert(p,'Package name must be '+task.packageName);
  assert.deepEqual(m.workspace_members,[p.id],'Workspace must contain only this package');
  assert.equal(p.edition,'2024');assert(['1.95','1.95.0'].includes(p.rust_version));assert.deepEqual(p.publish,[]);
  const want={serde:['=1.0.229',null],serde_json:['=1.0.151',null]};assert.equal(p.dependencies.length,2,'Only serde and serde_json are allowed');
  for(const d of p.dependencies){assert(want[d.name],'Dependency not allowed: '+d.name);assert.deepEqual([d.req,d.kind],want[d.name]);assert.equal(d.optional,false);}
  assert.deepEqual(p.dependencies.find(d=>d.name==='serde').features,['derive']);
  for(const q of m.packages.filter(q=>q.source)){assert.equal(q.source,'registry+https://github.com/rust-lang/crates.io-index');assert.equal(ALLOWED_REGISTRY[q.name],q.version,'Registry package not allowed: '+q.name+' '+q.version);}
  const toml=readFileSync(join(root,task.outputRoot,'Cargo.toml'),'utf8');
  for(const n of['autobins','autotests','autoexamples','autobenches'])assert(new RegExp('^'+n+'\\s*=\\s*false\\s*$','m').test(toml),n+' = false required');
  assert(!/^\s*build\s*=/m.test(toml)&&!existsSync(join(root,task.outputRoot,'build.rs')),'No build script');
  assert(!/\[(dev-|build-)dependencies\]/.test(toml),'No dev/build dependencies');
  record.dependencyInventory=m.packages.filter(q=>q.source).map(q=>q.name+'@'+q.version).sort();
}
function unsafePolicy(){
  const src=join(root,task.outputRoot,'src'),files=[];
  const walk=d=>{for(const n of readdirSync(d)){const p=join(d,n),s=lstatSync(p);assert(!s.isSymbolicLink());if(s.isDirectory())walk(p);else if(n.endsWith('.rs'))files.push(p);}};walk(src);
  const lib=readFileSync(join(src,'lib.rs'),'utf8');
  const native=task.nativeModule?join(src,task.nativeModule):null;
  if(native){assert(existsSync(native),'Native module missing: '+task.nativeModule);assert(/#!\[deny\(unsafe_code\)\]/.test(lib),'lib.rs must deny(unsafe_code)');assert(/#!\[deny\(unsafe_op_in_unsafe_fn\)\]/.test(readFileSync(native,'utf8')),'native module must deny(unsafe_op_in_unsafe_fn)');}
  else assert(/#!\[forbid\(unsafe_code\)\]/.test(lib),'lib.rs must forbid(unsafe_code)');
  for(const f of files){if(native&&resolve(f)===resolve(native))continue;const t=readFileSync(f,'utf8').replace(/\/\/.*$/gm,'');if(f!==join(src,'lib.rs'))assert(!/\bunsafe\b/.test(t),'unsafe outside native module: '+relative(root,f));else assert(!/\bunsafe\s*(\{|fn|impl|extern)/.test(t),'unsafe code in lib.rs');}
  for(const f of files)assert(!/remove_dir_all/.test(readFileSync(f,'utf8'))||task.allowRemoveDirAll,'remove_dir_all is not allowed: '+relative(root,f));
  for(const f of files)assert(!/std::process::Command|Command::new/.test(readFileSync(f,'utf8')),'Production code must not spawn processes: '+relative(root,f));
  for(const f of files)assert(!/std::net|TcpStream|UdpSocket/.test(readFileSync(f,'utf8')),'No networking: '+relative(root,f));
  // Wave 4 G1: every file-system access goes through handles in the native module, using listed system functions only.
  for(const f of files){const code=readFileSync(f,'utf8').replace(/\/\/.*$/gm,'');for(const[source,why]of task.forbidPatterns??[])assert(!new RegExp(source).test(code),why+': '+relative(root,f));}
  if(native&&task.allowedFfi){
    const text=readFileSync(native,'utf8').replace(/\/\/.*$/gm,''),blocks=[...text.matchAll(/extern\s+"system"\s*\{([\s\S]*?)\n\s*\}/g)];assert(blocks.length>0,'No extern "system" block in the native module');
    const names=blocks.flatMap(b=>[...b[1].matchAll(/\bfn\s+([A-Za-z0-9_]+)\s*\(/g)].map(m=>m[1]));for(const n of names)assert(task.allowedFfi.includes(n),'System function not allowed: '+n);record.ffi=[...new Set(names)].sort();
  }
}
function capture(){const uiFiles=task.kind==='ui'?walkFiles(join(root,task.outputRoot)).map(p=>relative(root,p).split(sep).join('/')):[];const files=[...(task.productionFiles??[]).filter(p=>existsSync(join(root,p))),...(task.kind==='ui'?uiFiles:walkFiles(join(root,task.outputRoot,'src')).map(p=>relative(root,p).split(sep).join('/'))),...task.testFiles].filter((v,i,a)=>a.indexOf(v)===i).map((path,i)=>{const b=readFileSync(join(root,path));const snapshot=stamp+'-'+mode+'-source-'+i+'.txt';writeFileSync(join(out,snapshot),b,{flag:'wx'});return{path,snapshot,sha256:hash(b),test:task.testFiles.includes(path)};});const digest=xs=>hash(Buffer.from(JSON.stringify(xs.map(({path,sha256})=>({path,sha256})))));return{files,productionHash:digest(files.filter(f=>!f.test)),testHash:digest(files.filter(f=>f.test))};}
function walkFiles(d){if(!existsSync(d))return[];const r=[];for(const n of readdirSync(d)){const p=join(d,n),s=lstatSync(p);if(s.isDirectory())r.push(...walkFiles(p));else r.push(p);}return r.sort();}
function exactTests(text,names,passed){const found=[...text.matchAll(/^test ([a-z0-9_]+) \.\.\. (?:ok|FAILED)\r?$/gm)].map(m=>m[1]);assert.deepEqual(found.sort(),[...names].sort(),'Test names must match exactly');assert(text.includes('0 ignored; 0 measured; 0 filtered out'),'No ignored or filtered tests');if(passed)assert(text.includes('test result: ok. '+names.length+' passed; 0 failed;'),'All tests must pass');}
function proofAudit(current){
  const all=readdirSync(out).filter(n=>n.endsWith('-result.json')).map(file=>({file,data:json(join(out,file))}));record.proofAudit=[];
  for(const label of Object.keys(task.proofTargets??{})){
    const reds=all.filter(({data:r})=>r.mode==='red-'+label&&r.status==='passed'&&r.observedExpectedFailure&&r.sourceState?.testHash===current.testHash&&r.sourceState.productionHash!==current.productionHash).sort((a,b)=>a.file.localeCompare(b.file));
    const red=reds.at(-1);assert(red,'Missing valid negative control '+label);
    const next=all.filter(({data:r})=>r.mode.startsWith('red-')&&Date.parse(r.startedAt)>Date.parse(red.data.endedAt)).sort((a,b)=>a.file.localeCompare(b.file))[0];
    const green=all.filter(({data:r})=>r.mode==='test'&&r.status==='passed'&&r.sourceState?.productionHash===current.productionHash&&r.sourceState.testHash===current.testHash&&Date.parse(r.startedAt)>Date.parse(red.data.endedAt)&&(!next||Date.parse(r.endedAt)<Date.parse(next.data.startedAt))).sort((a,b)=>a.file.localeCompare(b.file)).at(-1);
    assert(green,'Missing immediate exact-byte restore and green test after '+label);
    for(const x of[red,green])for(const f of x.data.sourceState.files)assert.equal(hash(readFileSync(join(out,f.snapshot))),f.sha256);
    record.proofAudit.push({label,red:red.file,restored:green.file});
  }
}
function realEnvFolders(){
  const need=['USERPROFILE','LOCALAPPDATA','APPDATA','ProgramData','SystemRoot','SystemDrive'];const v={};for(const k of need){const val=process.env[k];assert(val&&(k==='SystemDrive'?/^[A-Za-z]:$/.test(val):isAbsolute(val)),'Missing '+k);v[k]=val.replace(/[\\/]+$/,'');}
  return{user_profile:v.USERPROFILE,local_app_data:v.LOCALAPPDATA,roaming_app_data:v.APPDATA,user_temp:v.LOCALAPPDATA+'\\Temp',system_temp:v.SystemRoot+'\\Temp',windows:v.SystemRoot,program_data:v.ProgramData,downloads:v.USERPROFILE+'\\Downloads',system_drive:v.SystemDrive+'\\'};
}
function archive(){
  const dest=local(task.evidenceDir+'receipts'),index=join(root,task.evidenceDir,'ARCHIVE.json');const prior=existsSync(index)?json(index):{archive_version:'water.worker-archive.v1',entries:[]};const known=new Set(prior.entries.map(e=>e.archive));
  for(const n of readdirSync(out).sort()){const from=join(out,n),to=join(dest,n),rel=relative(root,to).split(sep).join('/');if(known.has(rel))continue;if(lstatSync(from).isDirectory())continue;copyFileSync(from,to);const b=readFileSync(to);assert.equal(hash(b),hash(readFileSync(from)));prior.entries.push({source:relative(root,from).split(sep).join('/'),archive:rel,bytes:b.length,sha256:hash(b)});}
  for(const n of readdirSync(out).sort().filter(n=>n.endsWith(SHOTS_SUFFIX))){
    const s=n.slice(0,-SHOTS_SUFFIX.length),rp=join(out,s+'-browser-result.json');if(!existsSync(rp))continue;const r=json(rp);if(r.status!=='passed'||!r.screenshots)continue;
    const to=local(task.evidenceDir+'screenshots/'+s);
    for(const f of r.screenshots.files){const from=join(out,n,f.name),a=join(to,f.name),rel=relative(root,a).split(sep).join('/');if(known.has(rel))continue;const b=readFileSync(from);assert.equal(hash(b),f.sha256,'Screenshot changed after its browser gate: '+n+'/'+f.name);writeFileSync(a,b,{flag:'wx'});prior.entries.push({source:relative(root,from).split(sep).join('/'),archive:rel,bytes:b.length,sha256:f.sha256});}
  }
  prior.updatedAt=new Date().toISOString();prior.files=prior.entries.length;prior.bytes=prior.entries.reduce((n,e)=>n+e.bytes,0);writeFileSync(index,JSON.stringify(prior,null,2)+'\n');
  const ga=join(root,task.evidenceDir,'.gitattributes');if(!existsSync(ga))writeFileSync(ga,'* -text\n.gitattributes text eol=lf\n');record.archived={files:prior.files,bytes:prior.bytes};
}

function uiPolicy(){
  const base=join(root,task.outputRoot);assert(existsSync(base),'Output root missing');
  const all=walkFiles(base).map(p=>relative(root,p).split(sep).join('/'));
  assert(!all.some(p=>/(^|\/)(package\.json|package-lock\.json|node_modules)(\/|$)/.test(p)),'No npm files');
  assert.equal(hash(readFileSync(join(base,'styles/tokens.css'))),hash(readFileSync(join(root,task.tokensSource))),'styles/tokens.css must equal the design tokens byte for byte');
  const html=readFileSync(join(base,'index.html'),'utf8');
  assert.deepEqual([...html.matchAll(/<script\b[^>]*>/gi)].map(m=>m[0]),['<script type="module" src="app.mjs">'],'index.html must have exactly one module script app.mjs');
  assert(!/<script\b[^>]*>[^<\s]/i.test(html),'No inline script content');
  assert(!/\son[a-z]+\s*=/i.test(html),'No inline event handlers');assert(!/\sstyle\s*=/i.test(html),'No style attributes');
  for(const p of all.filter(p=>!p.startsWith(task.outputRoot+'/tests/'))){
    const t=readFileSync(join(root,p),'utf8');
    for(const[re,why]of[[/innerHTML|outerHTML|insertAdjacentHTML|document\.write/,'HTML injection API'],[/\beval\s*\(|new\s+Function\b/,'dynamic code'],[/https?:\/\//,'network URL']])assert(!re.test(t),why+' in '+p);
    if(!p.endsWith('/ipc.mjs'))assert(!/__TAURI__/.test(t),'__TAURI__ outside ipc.mjs: '+p);
  }
  record.uiFiles=all.length;
}
function exactNodeTests(text,names,passed){const found=[...text.matchAll(/^# Subtest: (.+?)\r?$/gm)].map(m=>m[1]);assert.deepEqual(found.sort(),[...names].sort(),'Top-level test names must match exactly');for(const k of['skipped','todo','cancelled'])assert(new RegExp('^# '+k+' 0\\r?$','m').test(text),'No '+k+' tests');if(passed){assert(new RegExp('^# pass '+names.length+'\\r?$','m').test(text),'All tests must pass');assert(/^# fail 0\r?$/m.test(text),'No failures');}}
const SHOTS_SUFFIX='-browser-shots',PNG_MAGIC=Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
function screenshotPolicy(d){
  const files=[];
  for(const n of readdirSync(d).sort()){const p=join(d,n),s=lstatSync(p);assert(s.isFile()&&!s.isSymbolicLink(),'Screenshots must be plain files: '+n);assert(/^[a-z0-9][a-z0-9_-]*\.png$/.test(n),'Screenshot names are lowercase [a-z0-9_-] .png: '+n);const b=readFileSync(p);assert(b.length>8&&b.subarray(0,8).equals(PNG_MAGIC),'Not a PNG: '+n);files.push({name:n,bytes:b.length,sha256:hash(b)});}
  for(const n of task.requiredScreenshots??[])assert(files.some(f=>f.name===n),'Missing screenshot '+n);
  assert(files.length>0,'Browser tests must save screenshots to WATER_W2_SHOTS_DIR');
  return{dir:relative(root,d).split(sep).join('/'),files};
}
function uiGate(){
  record.sourceState=capture();uiPolicy();
  if(mode==='check'){for(const p of walkFiles(join(root,task.outputRoot)).filter(p=>p.endsWith('.mjs')))command(process.execPath,['--check',relative(root,p)]);return;}
  assert(mode==='test'||mode==='browser'||mode.startsWith('red-'),'Mode not supported for UI tasks');
  const red=mode.startsWith('red-');
  if(red){assert(!finalGate);assert(task.proofTargets?.[mode.slice(4)],'No such negative control');const changed=git(['diff','--name-only','HEAD','--',task.outputRoot]).split('\n').filter(Boolean);assert(changed.length,'A negative control needs an uncommitted production change');assert(!changed.some(p=>p.startsWith(task.outputRoot+'/tests/')),'Negative controls must not edit tests');}
  if(finalGate&&mode==='test')proofAudit(record.sourceState);
  // Wave 4 G3: layout negative controls listed in browserProofs are proven by the browser tests.
  const browser=mode==='browser'||(red&&(task.browserProofs??[]).includes(mode.slice(4))),files=browser?task.browserTestFiles:task.unitTestFiles,names=browser?task.expectedBrowserTests:task.expectedTests;
  const shots=browser?local('.local/checks/'+id+'/'+stamp+SHOTS_SUFFIX):null;
  const r=command(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap',...files],{expected:red?1:0,timeout:browser?900000:300000,extraEnv:shots?{WATER_W2_SHOTS_DIR:shots}:{}});
  exactNodeTests(r.text,names,!red);record.productTestsRun=true;if(browser){record.browserUsed=true;if(!red)record.screenshots=screenshotPolicy(shots);}
  if(red){assert(!/SyntaxError|ERR_MODULE_NOT_FOUND|CDP timeout|timed out/i.test(r.text),'Syntax, module or timeout failures are not proof');const target=task.proofTargets[mode.slice(4)];assert(r.text.includes(target),'Missing failure token '+target);record.observedExpectedFailure=true;record.expectation={target};}
}

let fault;
try{
  audit();record.before=state();if(finalGate)assert.equal(record.before.status,'','Final gates need a clean committed tree');
  if(mode==='baseline'){
    assert.deepEqual(record.before,{head:task.baseCommit,status:''},'Baseline runs on the untouched base commit');
    if(task.outputRootExists)assert(existsSync(join(root,task.outputRoot,task.kind==='ui'?'index.html':'Cargo.lock')),'Verified output root missing');
    else assert(!existsSync(join(root,task.outputRoot)),'Output root must not exist yet');
    for(const f of task.mustRead)assert(existsSync(join(root,f)),'Missing required reading '+f);
    if(task.kind==='rust'){const rust=rustEnv();const cache=readdirSync(join(rust.home,'registry','cache')).flatMap(d=>readdirSync(join(rust.home,'registry','cache',d)));for(const[n,v]of Object.entries(ALLOWED_REGISTRY))assert(cache.includes(n+'-'+v+'.crate'),'Offline cache lacks '+n+'-'+v);record.offlineCache='complete';}
    if(task.kind==='ui'){record.browserExecutable=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>existsSync(p))??null;assert(record.browserExecutable,'No trusted local Chrome/Edge');for(const f of[task.browserHelper,task.fixtures,task.tokensSource])assert(existsSync(join(root,f)),'Missing '+f);}
    if(task.realMode){record.realFoldersPresent=Object.fromEntries(Object.entries(realEnvFolders()).map(([k,v])=>[k,existsSync(v)]));}
    record.meaning=task.outputRootExists?'Environment and verified inputs only; no change made yet':'Environment and inputs only; no product exists yet';
  }else if(mode==='archive'){archive();}
  else if(task.kind==='ui'){uiGate();}
  else{
    assert.equal(task.kind,'rust');const rust=rustEnv();
    if(mode==='lock'){assert(!finalGate);assert(existsSync(join(root,task.outputRoot,'Cargo.toml')));if(!existsSync(join(root,task.outputRoot,'Cargo.lock')))command(rust.cargo,['generate-lockfile','--offline',...rust.manifestArgs]);dependencyPolicy(rust);}
    else{
      record.sourceState=capture();dependencyPolicy(rust);unsafePolicy();
      if(mode==='check'){command(rust.cargo,['fmt',...rust.manifestArgs,'--','--check']);command(rust.cargo,['clippy','--offline','--locked',...rust.manifestArgs,'--all-targets','--','-D','warnings']);}
      else if(mode==='test'||mode.startsWith('red-')){
        const red=mode.startsWith('red-');if(red){assert(!finalGate);assert(task.proofTargets?.[mode.slice(4)],'No such negative control');const ncPaths=task.negativeControlPaths??[task.outputRoot+'/src'];assert.notEqual(git(['diff','--name-only','HEAD','--',...ncPaths]),'','A negative control needs an uncommitted change under '+ncPaths.join(' or '));assert.equal(git(['diff','--name-only','HEAD','--',...task.testFiles]),'','Negative controls must not edit tests');}
        if(finalGate)proofAudit(record.sourceState);
        const r=command(rust.cargo,['test','--offline','--locked',...rust.manifestArgs,'--test',task.testTarget,'--','--test-threads=1'],{expected:red?101:0});
        exactTests(r.text,task.expectedTests,!red);record.productTestsRun=true;
        if(red){assert(!/could not compile|error\[E\d+\]|panicked at .*(timeout|timed out)/i.test(r.text),'Compilation or timeout failures are not proof');const target=task.proofTargets[mode.slice(4)];assert(r.text.includes(target),'Missing failure token '+target);record.observedExpectedFailure=true;record.expectation={target};}
      }else if(mode==='real'){
        assert(task.realMode,'This task has no real mode');const folders=realEnvFolders();let args=[];
        if(task.realMode==='scan-plan'){const tplPath=join(controller,'contracts/checkup-v1/real-plan-template.json'),tpl=readFileSync(tplPath,'utf8');const frozenTpl=(manifest.frozenFiles??[]).find(f=>f.path==='contracts/checkup-v1/real-plan-template.json');if(frozenTpl)assert.equal(hash(Buffer.from(tpl)),frozenTpl.sha256,'Real plan template changed');record.realPlanTemplateSha256=hash(Buffer.from(tpl));const filled=tpl.replace(/\{\{([a-z_]+)\}\}/g,(_,k)=>{if(k==='created_at')return new Date().toISOString().replace(/\.\d{3}Z$/,'Z');assert(folders[k],'Unknown placeholder '+k);return JSON.stringify(folders[k]).slice(1,-1);});const plan=join(local('.local/w2-real'),stamp+'-real-plan.json');writeFileSync(plan,filled,{flag:'wx'});args=[plan];record.realPlan=relative(root,plan).split(sep).join('/');}
        const r=command(rust.cargo,['run','--offline','--locked',...rust.manifestArgs,'--example','real_smoke','--',...args],{timeout:900000});
        const outJson=JSON.parse(r.stdout);assert(!/[A-Za-z]:\\\\/.test(r.stdout),'Real smoke output must not contain absolute paths');record.realDataRead=true;record.realSummary=outJson;
      }
    }
  }
}catch(e){fault=e;}
try{audit();record.after=state();if(record.before&&mode!=='archive')assert.equal(record.after.head,record.before.head,'HEAD changed during the gate');if(finalGate)assert.equal(record.after.status,'','Gate left the tree dirty');}catch(e){fault??=e;}
record.status=fault?'failed':'passed';record.error=fault?.stack??null;record.endedAt=new Date().toISOString();
const receipt=join(out,stamp+'-'+mode+'-result.json');writeFileSync(receipt,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({task:id,mode,finalGate,status:record.status,error:record.error?.split('\n')[0]??null,receipt}));if(fault)process.exitCode=1;
