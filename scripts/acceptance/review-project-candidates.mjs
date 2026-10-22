// Controller private candidate checks; no native windows or screenshots of desktop.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {rustEnvironment} from '../next-core-runtime.mjs';
import {prepareProjectFixtures} from '../project-wave-fixtures.mjs';
const controller=resolve('.'),root=join(controller,'.worktrees/review-aaab-20261022'),out=join(controller,'.local/checks/controller-aaab-20261022');mkdirSync(out,{recursive:true});
const stamp=new Date().toISOString().replaceAll(':','-')+'-'+process.pid,env={...process.env,GIT_OPTIONAL_LOCKS:'0'};for(const k of Object.keys(env))if(/^(?:CARGO_|RUST|NODE_OPTIONS$|NODE_PATH$|WATER_)/i.test(k))delete env[k];
const record={startedAt:new Date().toISOString(),root,systemNativeDialogs:0,commands:[]};let seq=0;
const resume=process.argv[2]==='--resume';assert.equal(process.argv.length,resume?3:2);
function command(binary,argv,timeout=30000){const r=spawnSync(binary,argv,{cwd:root,env,encoding:'utf8',windowsHide:true,shell:false,timeout,maxBuffer:64*1024*1024});const item={binary,argv,exitCode:r.status,error:r.error?.code??null,log:stamp+'-'+(++seq)+'.log'};writeFileSync(join(out,item.log),JSON.stringify(item)+'\n--- stdout ---\n'+(r.stdout??'')+'\n--- stderr ---\n'+(r.stderr??''),{flag:'wx'});record.commands.push(item);assert(!r.error&&r.status===0,item.log);return(r.stdout??'').trim();}
const git=args=>command('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...args]);
try{
 record.candidateCommit=git(['rev-parse','HEAD']);assert.equal(git(['status','--porcelain','--untracked-files=all']),'');
 const manifest=JSON.parse(readFileSync('docs/dispatch/wave1/manifest.json')),task=manifest.tasks.find(t=>t.id==='WATER-W1-AA');
 const within=(base,p)=>{const rel=relative(base,p);assert(!rel.startsWith('..')&&!isAbsolute(rel));},local=p=>{const d=join(root,p);within(root,d);mkdirSync(d,{recursive:true});return d;};
 const ctx={root,controller,env,record,task,local,within,command,stamp},rust=rustEnvironment(ctx),fixture=prepareProjectFixtures(ctx);env.WATER_MARKER_INDEX=fixture.indexPath;local('.local/checks/WATER-W1-AA');local('.local/checks/WATER-W1-AB');record.fixture={indexPath:fixture.indexPath,sha256:fixture.sha256,literalPayloadBytes:fixture.index.literal_payload_bytes};
 const args=['--manifest-path',task.outputRoot+'/Cargo.toml'];if(!resume){command(rust.cargo,['fmt',...args,'--','--check'],180000);command(rust.cargo,['clippy','--offline','--locked',...args,'--all-targets','--','-D','warnings'],180000);
 const text=command(rust.cargo,['test','--offline','--locked',...args,'--test',task.testTarget,'--','--test-threads=1','--nocapture'],180000);assert.deepEqual([...text.matchAll(/^test ([a-z0-9_]+) \.\.\. ok$/gm)].map(m=>m[1]).sort(),[...task.expectedTests].sort());assert(text.includes('4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out'));record.AATests='4/4';}
 else{const p=join(out,'2026-10-22T07-38-13.915Z-21312-candidate-check.json');const prior=JSON.parse(readFileSync(p));assert.equal(prior.candidateCommit,record.candidateCommit);assert.equal(prior.AATests,'4/4');record.AATests=prior.AATests;record.priorReceipt=p;}
 const artifacts=rust.build(task.outputRoot+'/Cargo.toml',task.packageName,['water_project_session','water_native_scan','water_scope_registry','water_contracts','serde_json']);const exe=join(rust.tmp,stamp+'-late-cancel.exe');
 command(rust.rustc,['--edition=2024','--crate-name','controller_late_cancel',join(controller,'scripts/acceptance/project-late-cancel-producer.rs'),'-L','dependency='+rust.deps,...artifacts.flatMap(a=>['--extern',a.crate+'='+a.filename]),'-o',exe],180000);
 const capture=JSON.parse(command(exe,[],30000));const captureFile=join(out,stamp+'-actual-AA-late-cancel.json');writeFileSync(captureFile,JSON.stringify(capture)+'\n',{flag:'wx'});record.realAALateCancellation={captureFile,metadataStatus:capture.snapshot.view.status,marker:capture.marker,actualPublicAPI:true,syntheticNativeDialogEnvelope:false};
 const y=manifest.tasks.find(t=>t.id==='WATER-W1-AB');for(const p of [...y.productionFiles,...y.testFiles].filter(p=>p.endsWith('.mjs')))command(process.execPath,['--check',p]);
 const tests=command(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap',...y.testFiles],180000);assert.deepEqual([...tests.matchAll(/^# Subtest: (.+)\r?$/gm)].map(m=>m[1]).sort(),[...y.expectedTests,...y.expectedBrowserTests].sort());assert(tests.includes('# pass 5')&&tests.includes('# fail 0')&&tests.includes('# skipped 0'));record.ABTests='5/5';
 assert.equal(prepareProjectFixtures(ctx).sha256,fixture.sha256);assert.equal(git(['status','--porcelain','--untracked-files=all']),'');record.status='passed';
}catch(e){record.status='failed';record.error=e.stack;process.exitCode=1;}
record.endedAt=new Date().toISOString();const receipt=join(out,stamp+'-candidate-check.json');writeFileSync(receipt,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...record,commands:record.commands.length,receipt}));
