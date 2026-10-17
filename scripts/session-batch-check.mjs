// Controller-owned J/K gates. Resource/contract discipline, not an OS sandbox.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname,join,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {setup,copyCache} from './parallel-next-common.mjs';
const modes=['baseline','fixtures','lock','fmt','check','test','browser','suite','clippy','metadata','bridge','red-behavior','red-nc1','red-nc2','red-nc3'];
const ctx=setup(['WATER-W1-J','WATER-W1-K'],modes),{root,controller,task,mode,env,command,record}=ctx;
const isJ=task.id==='WATER-W1-J',red=mode.startsWith('red-');
assert.equal(process.platform,'win32','This dispatched preflight is Windows-only; macOS remains unverified.');
assert((isJ?['baseline','fixtures','lock','fmt','test','suite','clippy','metadata','bridge','red-behavior','red-nc1','red-nc2','red-nc3']:['baseline','check','test','browser','suite','red-behavior','red-nc1','red-nc2','red-nc3']).includes(mode));
assert(!ctx.finalGate||task.expectedFinalModes.includes(mode));
const hash=b=>createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(readFileSync(p,'utf8'));
function productionPaths(){
  if(!isJ)return task.productionFiles.filter(p=>existsSync(join(root,p)));
  const found=[];const visit=p=>{if(!existsSync(join(root,p)))return;for(const e of readdirSync(join(root,p),{withFileTypes:true})){assert(!e.isSymbolicLink());const child=p+'/'+e.name;if(e.isDirectory())visit(child);else {assert(e.isFile()&&child.endsWith('.rs'));found.push(child);}}};visit(task.outputRoot+'/src');return found.sort();
}
function capture(){
  const sources=productionPaths(),tests=task.testFiles;
  assert(sources.length&&sources.length<=128&&tests.every(p=>existsSync(join(root,p))));
  const records=[];let total=0;
  for(const [i,p]of [...sources,...tests].entries()){const b=readFileSync(join(root,p));total+=b.length;assert(total<=4*1024*1024);const file=ctx.stamp+'-'+mode+'-source-'+i+'.txt';writeFileSync(join(ctx.output,file),b,{flag:'wx'});records.push({path:p,sha256:hash(b),mtimeMs:statSync(join(root,p)).mtimeMs,snapshot:file,test:tests.includes(p)});}
  const digest=items=>hash(Buffer.from(JSON.stringify(items.map(({path,sha256})=>({path,sha256})))));
  return {files:records,productionHash:digest(records.filter(r=>!r.test)),testHash:digest(records.filter(r=>r.test))};
}
function proofAudit(current){
  const receipts=readdirSync(ctx.output).filter(n=>n.endsWith('-result.json')).map(file=>({file,data:json(join(ctx.output,file))}));const proofs=[];
  for(const label of ['behavior','nc1','nc2','nc3']){
    const candidates=receipts.filter(({data:r})=>r.mode==='red-'+label&&r.status==='passed'&&r.observedExpectedFailure===true&&r.sourceState?.testHash===current.testHash).sort((a,b)=>a.file.localeCompare(b.file));
    const red=candidates.at(-1);assert(red,'Missing valid complete behavior/negative red: '+label);
    assert.notEqual(red.data.sourceState.productionHash,current.productionHash,'Red source must differ from final code');
    const nextRed=receipts.filter(({data:r})=>r.mode.startsWith('red-')&&r.status==='passed'&&r.observedExpectedFailure&&Date.parse(r.startedAt)>Date.parse(red.data.endedAt)).sort((a,b)=>a.data.startedAt.localeCompare(b.data.startedAt))[0];
    const green=receipts.filter(({data:r})=>r.mode==='suite'&&r.status==='passed'&&r.sourceState?.productionHash===current.productionHash&&r.sourceState?.testHash===current.testHash&&Date.parse(r.startedAt)>Date.parse(red.data.endedAt)&&(!nextRed||Date.parse(r.endedAt)<Date.parse(nextRed.data.startedAt))).sort((a,b)=>a.file.localeCompare(b.file)).at(-1);
    assert(green,'Missing complete restored suite on current bytes after '+label);proofs.push({label,red:red.file,restored:green.file});
  }
  record.proofAudit=proofs;
}
function checkRustResult(text,allPassed){
  const observed=[...text.matchAll(/^test ([a-z0-9_]+) \.\.\. (?:ok|FAILED)$/gm)].map(m=>m[1]).sort();assert.deepEqual(observed,[...task.expectedTests].sort());
  assert(/5 (?:passed|failed)|test result:/.test(text));assert(/0 ignored; 0 measured; 0 filtered out/.test(text));
  if(allPassed)assert(text.includes('5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out'));
}
function checkNodeResult(text,names,allPassed){
  assert.deepEqual([...text.matchAll(/^# Subtest: (.+)$/gm)].map(m=>m[1].replace(/\r$/,'')).sort(),[...names].sort());
  for(const [k,v]of [['tests',names.length],['cancelled',0],['skipped',0],['todo',0]])assert(new RegExp('^# '+k+' '+v+'\\r?$','m').test(text));
  if(allPassed)assert(new RegExp('^# pass '+names.length+'\\r?$','m').test(text));
}
function expectedFailure(binary,argv,timeout){
  const r=spawnSync(binary,argv,{cwd:root,env,encoding:'utf8',windowsHide:true,shell:false,timeout,maxBuffer:32*1024*1024});
  const log=ctx.stamp+'-'+mode+'-expected-red.log',entry={binary,argv,exitCode:r.status,error:r.error?.code??null,log};record.commands.push(entry);
  writeFileSync(join(ctx.output,log),JSON.stringify(entry)+'\n--- stdout ---\n'+(r.stdout??'')+'\n--- stderr ---\n'+(r.stderr??''),{flag:'wx'});
  assert(!r.error&&r.status===(isJ?101:1),'Expected a successfully launched full failing test suite');
  const text=(r.stdout??'')+'\n'+(r.stderr??'');assert(!/could not compile|error\[E\d+\]|SyntaxError|ERR_MODULE_NOT_FOUND|CDP timeout|condition timed out|test timed out/.test(text),'Compile/missing-file/timeout is not behavior red');
  if(isJ)checkRustResult(r.stdout,false);else checkNodeResult(r.stdout,[...task.expectedTests,...task.expectedBrowserTests],false);
  const label=mode.slice(4),needle=task.proofTargets[label];assert(needle&&text.includes(needle),'Missing target assertion: '+needle);
  record.observedExpectedFailure=true;record.expectation={label,target:needle,testExitCode:r.status};record.executedTests=5;
}
function screenshots(){record.screenshots=[];for(const name of ['lab-reader-1440x1000.png','lab-reader-900x800.png','lab-reader-detail.png']){const source=join(root,'.local/browser-lab',name);assert(existsSync(source));assert(statSync(source).mtimeMs>=Date.parse(record.startedAt)-1000,'Stale screenshot');const file=ctx.stamp+'-'+mode+'-'+name;writeFileSync(join(ctx.output,file),readFileSync(source),{flag:'wx'});record.screenshots.push(file);}}
async function assets(){
  const bundle=json(join(root,'contracts/lab-reader-v1/sessions.json')),p=json(join(root,'contracts/session-batch-v1/PROVENANCE.json'));
  assert.equal(bundle.bundle_version,'water.lab-reader-bundle.v1');assert.equal(bundle.snapshots.length,4);assert(p.actualFNativeCapture&&p.actualEProjection&&p.actualHTwoEntries&&!p.newJImplementationUsed);
  assert.equal(hash(readFileSync(join(root,p.sourceLog))),p.sourceLogSha256);
  const model=await import(pathToFileURL(join(root,'prototypes/report-reader/model.mjs')));
  for(const s of bundle.snapshots){assert.equal(s.session_version,'water.lab-session.v1');assert.equal(s.data_kind,'controlled_fixture_metadata');model.assertReportView(s.view);assert.equal(s.summary.counts.findings,s.view.findings.length);assert.deepEqual(s.summary.totals,s.view.totals);}
  return {actualCaptures:4,provenance:p.sourceLogSha256,newJImplementationTested:false,newKProductTested:false};
}
let failure;
try{
  record.assets=await assets();
  if(!isJ){
    if(mode==='baseline'){command(process.execPath,['scripts/acceptance/reader-browser-probe.mjs'],60000);record.browserBlankPageOnly=true;}
    else{
      record.sourceState=capture();if(ctx.finalGate)proofAudit(record.sourceState);
      if(mode==='check'){for(const p of task.syntaxFiles)command(process.execPath,['--check',p]);}
      else{
        record.productTestsRun=true;const full=mode==='suite'||red,files=full?task.testFiles:[mode==='test'?task.testFiles[0]:task.testFiles[1]],names=full?[...task.expectedTests,...task.expectedBrowserTests]:mode==='test'?task.expectedTests:task.expectedBrowserTests;
        const argv=['--test','--test-concurrency=1','--test-reporter=tap',...files];
        if(red)expectedFailure(process.execPath,argv,150000);
        else {const result=command(process.execPath,argv,full?150000:mode==='test'?30000:120000);checkNodeResult(result,names,true);record.executedTests=names.length;if(full||mode==='browser')screenshots();}
      }
    }
  }else{
    const home=ctx.local('.local/j-cargo-home'),target=ctx.local('.local/j-target'),temp=ctx.local('.local/j-tmp');
    for(let p=root;;p=dirname(p)){for(const n of ['config','config.toml'])assert(!existsSync(join(p,'.cargo',n)));if(dirname(p)===p)break;}for(const n of ['config','config.toml'])assert(!existsSync(join(home,n)));copyCache(ctx,home);
    const rustup=join(homedir(),'.cargo/bin/rustup.exe'),rustc=command(rustup,['which','rustc','--toolchain','1.95.0']),cargo=command(rustup,['which','cargo','--toolchain','1.95.0']);assert(isAbsolute(rustc)&&isAbsolute(cargo));assert(command(rustc,['--version']).startsWith('rustc 1.95.0 '));
    Object.assign(env,{RUSTUP_TOOLCHAIN:'1.95.0',RUSTC:rustc,RUSTDOC:join(dirname(rustc),'rustdoc.exe'),CARGO_HOME:home,CARGO_TARGET_DIR:target,CARGO_BUILD_JOBS:'1',CARGO_NET_OFFLINE:'true',CARGO_TERM_COLOR:'never',TEMP:temp,TMP:temp,TMPDIR:temp});const key=Object.keys(env).find(k=>k.toLowerCase()==='path')??'PATH';env[key]=dirname(rustc)+';'+(env[key]??'');
    const prepare=await import(pathToFileURL(join(root,'scripts/prepare-scan-fixtures.mjs')));
    const state=existsSync(join(root,'.local/checks/WATER-W1-F/active-fixtures.json'))?prepare.readActiveFixtures():await prepare.prepareScanFixtures();
    env.WATER_SESSION_FIXTURE_INDEX=state.active;record.fixtures={runs:state.index.runs.length,negatives:state.index.negative.length,contentBytes:state.index.content_bytes,active:state.active};
    if(mode==='baseline'||mode==='fixtures'){const file=ctx.stamp+'-'+mode+'-fixture-index.json';const bytes=readFileSync(state.active);writeFileSync(join(ctx.output,file),bytes,{flag:'wx'});record.fixtureIndex={file,sha256:hash(bytes)};}
    const deps=join(target,'debug/deps'),externs=names=>names.flatMap(name=>{const list=readdirSync(deps).filter(n=>n.startsWith('lib'+name+'-')&&n.endsWith('.rlib'));assert.equal(list.length,1,name);return['--extern',name+'='+join(deps,list[0])];});
    const oldNames=['water_scan','water_scan_report','water_report_view','water_summary_export','water_contracts','serde_json'];
    const knownPipeline=()=>{const binary=join(temp,ctx.stamp+'-known-pipeline.exe');command(rustc,['--edition=2024','--crate-name','session_known_pipeline',join(root,'scripts/acceptance/scan-report-summary-pipeline.rs'),'-L','dependency='+deps,...externs(oldNames),'-o',binary],180000);return JSON.parse(command(binary,[state.active]));};
    if(mode==='baseline'||mode==='fixtures'){
      for(const name of ['fixture-scan','scan-report','report-view','summary-export'])command(cargo,['build','--manifest-path','packages/'+name+'/Cargo.toml','--offline','--locked','--lib'],180000);
      const actual=knownPipeline();assert.equal(actual.cases.length,13);record.dependencyPipeline={...prepare.verifyNativeFacts(actual.cases.filter(c=>c.native).map(c=>c.facts),state.index),controlledCases:2,newJProductTested:false};record.snapshotFiles=prepare.verifyScanSnapshots(state.index);
    }else{
      const manifest=join(root,task.outputRoot,'Cargo.toml'),text=readFileSync(manifest,'utf8');assert(!/\[(?:patch|replace)(?:[.\]])|^\s*(?:git|registry|build|rustc-wrapper|runner)\s*=/mi.test(text));const args=['--manifest-path',manifest];
      if(mode==='lock'){assert(task.allowLockfileGeneration);command(cargo,['generate-lockfile','--offline',...args],180000);}
      const meta=JSON.parse(command(cargo,['metadata','--offline','--locked','--format-version','1',...args],180000)),pkg=meta.packages.find(p=>p.name==='water-lab-session');assert(pkg&&pkg.version==='0.1.0'&&pkg.edition==='2024'&&['1.95','1.95.0'].includes(pkg.rust_version));assert.deepEqual(pkg.publish,[]);assert.equal(meta.workspace_members.length,1);assert(meta.workspace_members.includes(pkg.id));assert.equal(pkg.targets.length,2);assert(pkg.targets.some(t=>t.name==='water_lab_session'&&t.kind.includes('lib')));assert(pkg.targets.some(t=>t.name==='session_v1'&&t.kind.includes('test')));assert.equal(pkg.dependencies.length,7);assert(pkg.dependencies.every(d=>d.kind===null&&!d.optional&&d.uses_default_features));
      const localDeps={'water-contracts':'crates/water-contracts','water-scan':'packages/fixture-scan','water-scan-report':'packages/scan-report','water-report-view':'packages/report-view','water-summary-export':'packages/summary-export'};
      for(const [name,path]of Object.entries(localDeps)){const d=pkg.dependencies.find(d=>d.name===name);assert(d&&d.source===null&&d.path&&ctx.same(d.path,join(root,path)));}
      for(const [name,req,features]of [['serde','=1.0.229',['derive']],['serde_json','=1.0.151',[]]]){const d=pkg.dependencies.find(d=>d.name===name);assert(d&&d.req===req&&!d.path&&d.source==='registry+https://github.com/rust-lang/crates.io-index');assert.deepEqual(d.features,features);}
      assert.deepEqual(meta.packages.filter(p=>p.source===null).map(p=>p.name).sort(),['water-lab-session',...Object.keys(localDeps)].sort());
      const entries=p=>readFileSync(p,'utf8').split('[[package]]').map(b=>({name:/^name = "([^"]+)"/m.exec(b)?.[1],version:/^version = "([^"]+)"/m.exec(b)?.[1],source:/^source = "([^"]+)"/m.exec(b)?.[1],checksum:/^checksum = "([^"]+)"/m.exec(b)?.[1]}));const approved=entries(join(root,'Cargo.lock')),own=entries(join(root,task.outputRoot,'Cargo.lock'));
      for(const p of meta.packages.filter(p=>p.source!==null)){const f=own.find(l=>l.name===p.name&&l.version===p.version&&l.source===p.source);assert(f&&approved.some(a=>a.name===f.name&&a.version===f.version&&a.source===f.source&&a.checksum===f.checksum));}
      record.sourceState=capture();if(ctx.finalGate)proofAudit(record.sourceState);
      if(mode==='fmt')command(cargo,['fmt',...args,'--','--check'],180000);
      if(mode==='clippy')command(cargo,['clippy','--offline','--locked',...args,'-p','water-lab-session','--all-targets','--','-D','warnings'],180000);
      if(mode==='test'||mode==='suite'||red){record.productTestsRun=true;const argv=['test','--offline','--locked',...args,'-p','water-lab-session','--test','session_v1','--','--test-threads=1','--format','pretty'];if(red)expectedFailure(cargo,argv,180000);else{checkRustResult(command(cargo,argv,180000),true);record.executedTests=5;}record.snapshotFiles=prepare.verifyScanSnapshots(state.index);}
      if(mode==='bridge'){
        record.productTestsRun=true;command(cargo,['build','--offline','--locked',...args,'--lib'],180000);const actual=knownPipeline();const binary=join(temp,ctx.stamp+'-j-bridge.exe');command(rustc,['--edition=2024','--crate-name','controller_j_bridge',join(root,'scripts/acceptance/lab-session-bridge.rs'),'-L','dependency='+deps,...externs(['water_lab_session',...oldNames]),'-o',binary],180000);const result=JSON.parse(command(binary,[state.active]));
        const expected=actual.cases.map(c=>({session_version:'water.lab-session.v1',data_kind:'controlled_fixture_metadata',source_facts:c.facts,report:c.bundle.report,view:c.view,summary:c.summary}));assert.deepEqual(result.snapshots,expected);record.bridge={snapshots:13,nativeCases:11,controlledCases:2,actualJPublicEntry:true,actualExistingPipelineComparison:true,kPageConnected:false};record.snapshotFiles=prepare.verifyScanSnapshots(state.index);
      }
    }
  }
}catch(error){failure=error;}
ctx.finish(failure);
