// Controller-only immutable submission audit and independent Rust public-API checks.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
assert.equal(args.length, 4); assert.equal(args[0], '--task'); assert.equal(args[2], '--expected-head');
const id = args[1], expected = args[3]; assert(['WATER-W1-G','WATER-W1-H'].includes(id)); assert.match(expected,/^[a-f0-9]{40}$/);
const slot = id.endsWith('G') ? 'g' : 'h';
const task = JSON.parse(readFileSync(join(root,'docs/dispatch/wave1/manifest.json'),'utf8')).tasks.find(t=>t.id===id);
const worker = resolve(task.worktree), stamp = new Date().toISOString().replaceAll(':','-')+'-'+process.pid;
const relOut = 'docs/acceptance/wave1/controller/w1-gh-review-20261018/'+slot;
for (const part of ['docs/acceptance/wave1/controller/w1-gh-review-20261018',relOut]) if(!existsSync(join(root,part))) mkdirSync(join(root,part));
const out = join(root,relOut);
const sha = bytes=>createHash('sha256').update(bytes).digest('hex');
const hash = path=>sha(readFileSync(path));
const readJSON = path=>JSON.parse(readFileSync(path,'utf8'));
const record = {task:id,expectedHead:expected,startedAt:new Date().toISOString(),commands:[]};
const env={...process.env,GIT_OPTIONAL_LOCKS:'0',RUSTUP_AUTO_INSTALL:'0'};
for(const key of Object.keys(env)) if(/^(?:CARGO_|RUST|NODE_OPTIONS$|NODE_PATH$|WATER_)/i.test(key) && key!=='RUSTUP_AUTO_INSTALL') delete env[key];
function command(binary,argv,cwd=worker,timeout=30000){
  const r=spawnSync(binary,argv,{cwd,env,encoding:'utf8',windowsHide:true,shell:false,timeout,maxBuffer:32*1024*1024});
  const log=stamp+'-'+record.commands.length+'.log', item={binary,argv,cwd,exitCode:r.status,error:r.error?.code??null,log};record.commands.push(item);
  writeFileSync(join(out,log),JSON.stringify(item)+'\n--- stdout ---\n'+(r.stdout??'')+'\n--- stderr ---\n'+(r.stderr??''),{flag:'wx'});
  assert(!r.error&&r.status===0,'Independent command failed: '+argv.join(' '));return r.stdout.trim();
}
const git=argv=>command('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...argv]);
const snapshot=()=>({head:git(['rev-parse','HEAD']),status:git(['status','--porcelain=v1','--untracked-files=all'])});
function copy(base,file){const bytes=readFileSync(join(base,file));if(existsSync(join(out,file)))assert.equal(hash(join(out,file)),sha(bytes));else writeFileSync(join(out,file),bytes,{flag:'wx'});}
let failure;
try{
  record.before=snapshot();assert.equal(record.before.head,expected);assert.equal(record.before.status,'');assert.equal(git(['branch','--show-current']),task.branch);git(['merge-base','--is-ancestor',task.baseCommit,'HEAD']);
  const paths=git(['diff','--name-only','--no-renames',task.baseCommit,'HEAD']).split(/\r?\n/).filter(Boolean);
  assert(paths.every(p=>task.allowedFiles.includes(p)||task.allowedPrefixes.some(prefix=>p.startsWith(prefix))));record.changedFiles=paths.length;
  const implementation=slot==='g'?'4ae559b3c84856994bb09e252834987518982f70':'52748c5895f485aa54f65c6943ab8bf74fd95ddb';
  record.implementation=implementation;
  const later=git(['diff','--name-only',implementation,expected]).split(/\r?\n/).filter(Boolean);assert(later.every(p=>p===task.report||p.startsWith('docs/acceptance/wave1/'+slot+'/')));record.reportOnlyFiles=later.length;
  record.productTree=git(['rev-parse','HEAD:'+task.outputRoot]);
  record.products=paths.filter(p=>p.startsWith(task.outputRoot+'/')).map(path=>({path,sha256:hash(join(worker,path))}));
  const frozen=new Set();
  for(const name of ['v1','parallel-v1','fixture-lab-v1','report-view-v1','scan-lab-v1','parallel-next-v1'])for(const f of readJSON(join(worker,'contracts/'+name+'/freeze.lock.json')).files){assert.equal(hash(join(worker,f.path)),f.sha256);frozen.add(f.path);}
  record.frozenFiles=frozen.size;
  const evidence=join(worker,'docs/acceptance/wave1',slot),checks=join(worker,'.local/checks',id);
  record.workerRawFiles=[];
  for(const file of readdirSync(evidence).filter(n=>/\.log$|-result\.json$/.test(n))){const a=readFileSync(join(evidence,file));assert.equal(sha(a),hash(join(checks,file)));record.workerRawFiles.push({file,bytes:a.length,sha256:sha(a)});}
  const nc=readJSON(join(evidence,'negative-controls.json'));assert.equal(hash(join(worker,nc.file)),nc.submittedSourceSha256);record.negativeControls=[];
  for(const item of nc.controls){
    assert.equal(item.originalSha,nc.submittedSourceSha256);assert.equal(item.restoredSha,item.originalSha);assert.notEqual(item.badSha,item.originalSha);
    const redName=item.failedReceipt.split(/[\\/]/).at(-1),greenName=item.restoredReceipt.split(/[\\/]/).at(-1);
    const red=readJSON(join(evidence,redName)),green=readJSON(join(evidence,greenName));assert.equal(red.status,'failed');assert.equal(green.status,'passed');assert.equal(green.executedTests,5);
    const logOf=r=>{const c=r.commands.find(c=>c.argv.includes('test')&&c.argv.includes(task.testTarget));assert(c&&c.log);return readFileSync(join(evidence,c.log),'utf8');};
    const redText=logOf(red),greenText=logOf(green);assert(/test result: FAILED/.test(redText));assert(!/could not compile|error\[E\d+\]/.test(redText));assert(/5 passed; 0 failed; 0 ignored/.test(greenText));assert(greenText.includes('Compiling '+task.packageName));
    const needles={'last-wins-parse':'duplicate keys must be rejected','unprotected-leaf-file':'leaf file stays protected','summed-totals':'unknown totals stay null','blank-finding-count':'finding count','skip-validate':'illegal DTO must fail','leak-scan-id':'H_SCAN_CANARY','unknown-totals-zero':'unknown totals.logical_bytes must stay null'};
    assert(redText.includes(needles[item.label]),'Target not present: '+item.label);
    record.negativeControls.push({label:item.label,red:redName,green:greenName,hashesAndTargetVerified:true});
  }
  record.finalGates=[];
  const receipts=readdirSync(checks).filter(n=>n.endsWith('-result.json')).map(name=>({name,data:readJSON(join(checks,name))}));
  for(const mode of task.expectedFinalModes){
    const found=receipts.filter(({data:d})=>d.mode===mode&&d.finalGate&&d.status==='passed'&&d.before.head===expected&&d.after.head===expected&&!d.before.status&&!d.after.status).sort((a,b)=>a.name.localeCompare(b.name)).at(-1);assert(found,'Missing current final: '+mode);
    copy(checks,found.name);for(const c of found.data.commands)if(c.log)copy(checks,c.log);record.finalGates.push({mode,receipt:found.name});
  }
  const rustup=join(homedir(),'.cargo/bin/rustup.exe'),rustc=command(rustup,['which','rustc','--toolchain','1.95.0']),cargo=command(rustup,['which','cargo','--toolchain','1.95.0']);
  assert(command(rustc,['--version']).startsWith('rustc 1.95.0 '));
  const home=join(worker,'.local',slot+'-cargo-home'),target=join(worker,'.local',slot+'-target'),temp=join(worker,'.local',slot+'-tmp');
  for(const path of [home,target,temp])assert(lstatSync(path).isDirectory()&&!lstatSync(path).isSymbolicLink());
  Object.assign(env,{RUSTUP_TOOLCHAIN:'1.95.0',RUSTC:rustc,RUSTDOC:join(dirname(rustc),'rustdoc.exe'),CARGO_HOME:home,CARGO_TARGET_DIR:target,CARGO_BUILD_JOBS:'1',CARGO_NET_OFFLINE:'true',CARGO_TERM_COLOR:'never',TEMP:temp,TMP:temp,TMPDIR:temp});
  const key=Object.keys(env).find(k=>k.toLowerCase()==='path')??'PATH';env[key]=dirname(rustc)+';'+(env[key]??'');
  command(cargo,['build','--manifest-path',join(worker,task.outputRoot,'Cargo.toml'),'--offline','--locked','--lib'],worker,180000);
  const deps=join(target,'debug/deps');
  const externs=[task.crateName,'water_contracts','serde_json'].flatMap(name=>{const files=readdirSync(deps).filter(n=>n.startsWith('lib'+name+'-')&&n.endsWith('.rlib'));assert.equal(files.length,1);const path=join(deps,files[0]);(record.linkedArtifacts??=[]).push({path,sha256:hash(path)});return['--extern',name+'='+path];});
  const binary=join(temp,stamp+'-controller-boundaries.exe'),source=join(root,'scripts/acceptance',slot==='g'?'scan-report-boundaries.rs':'summary-export-boundaries.rs');
  command(rustc,['--edition=2024','--crate-name','controller_'+slot+'_boundaries','--test',source,'-L','dependency='+deps,...externs,'-o',binary],worker,180000);
  const result=command(binary,['--test-threads=1','--nocapture'],worker,180000),count=slot==='g'?4:3;
  assert(result.includes(count+' passed; 0 failed; 0 ignored; 0 measured; 0 filtered out'));record.independentTests=count;
}catch(error){failure=error;}
try{record.after=snapshot();assert.deepEqual(record.after,record.before);for(const p of record.products??[])assert.equal(hash(join(worker,p.path)),p.sha256);}catch(error){failure=failure?new Error(failure.message+'; '+error.message):error;}
Object.assign(record,{endedAt:new Date().toISOString(),status:failure?'failed':'passed',error:failure?.message??null});
const receipt=join(out,stamp+'-result.json');writeFileSync(receipt,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:record.status,task:id,changedFiles:record.changedFiles,independentTests:record.independentTests,receipt,error:record.error},null,2));if(failure)process.exitCode=1;
