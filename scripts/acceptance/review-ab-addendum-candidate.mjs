// Controller isolated integration, offline fixed-AA build and AB regression checks.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {isAbsolute,join,relative,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {PassThrough,Writable} from 'node:stream';
import {rustEnvironment} from '../next-core-runtime.mjs';
import {prepareProjectFixtures} from '../project-wave-fixtures.mjs';
import {lateCancelProbe} from './project-late-cancel-probe.mjs';
const controller=resolve('.'),root=join(controller,'.worktrees/integration-aaab-addendum-20261022'),out=join(controller,'.local/checks/controller-aaab-addendum-20261022');mkdirSync(out,{recursive:true});
const stamp=new Date().toISOString().replaceAll(':','-')+'-'+process.pid,env={...process.env,GIT_OPTIONAL_LOCKS:'0'},hash=b=>createHash('sha256').update(b).digest('hex');
for(const k of Object.keys(env))if(/^(?:CARGO_|RUST|NODE_OPTIONS$|NODE_PATH$|WATER_)/i.test(k))delete env[k];
const record={startedAt:new Date().toISOString(),root,systemNativeDialogs:0,commands:[]};let seq=0;
function command(binary,argv,timeout=30000,cwd=root){const r=spawnSync(binary,argv,{cwd,env,encoding:'utf8',windowsHide:true,shell:false,timeout,maxBuffer:64*1024*1024});const item={binary,argv,exitCode:r.status,error:r.error?.code??null,log:stamp+'-'+(++seq)+'.log'};writeFileSync(join(out,item.log),JSON.stringify(item)+'\n--- stdout ---\n'+(r.stdout??'')+'\n--- stderr ---\n'+(r.stderr??''),{flag:'wx'});record.commands.push(item);assert(!r.error&&r.status===0,item.log);return(r.stdout??'').trim();}
const git=(args,cwd=root)=>command('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false','-c','maintenance.auto=false','-c','gc.auto=0',...args],30000,cwd);
try{
 assert(!existsSync(root),'New candidate tree must not already exist');assert.equal(git(['rev-parse','HEAD'],controller),'4365f29148a3fbee86f916436d960e14818e9b01');
 const identity=git(['show','-s','--format=%cn%n%ce','d2a06dd'],controller).split('\n');assert.equal(identity.length,2);
 git(['worktree','add','-b','controller/water-w1-aaab-addendum-20261022',root,'4365f29148a3fbee86f916436d960e14818e9b01'],controller);
 git(['-c','user.name='+identity[0],'-c','user.email='+identity[1],'merge','--no-ff','2fedfeb2d6fbaf6064e6483b728b31a4242ba080','-m','Integrate AB addendum 01 for controlled AA to AB acceptance']);
 record.candidateCommit=git(['rev-parse','HEAD']);assert.equal(git(['status','--porcelain','--untracked-files=all']),'');
 const manifest=JSON.parse(readFileSync(join(controller,'docs/dispatch/wave1/manifest.json'))),task=manifest.tasks.find(t=>t.id==='WATER-W1-AA');
 const within=(base,p)=>{const rel=relative(base,p);assert(!rel.startsWith('..')&&!isAbsolute(rel));},local=p=>{const d=join(root,p);within(root,d);mkdirSync(d,{recursive:true});return d;};
 const ctx={root,controller,env,record,task,local,within,command,stamp};local('.local/checks/WATER-W1-AA');local('.local/checks/WATER-W1-AB');
 const rust=rustEnvironment(ctx),fixture=prepareProjectFixtures(ctx);env.WATER_MARKER_INDEX=fixture.indexPath;record.fixture={indexPath:fixture.indexPath,sha256:fixture.sha256,literalPayloadBytes:fixture.index.literal_payload_bytes};
 command(rust.cargo,['build','--offline','--locked','--manifest-path',task.outputRoot+'/Cargo.toml','--bin','water-project-session'],180000);
 const artifacts=rust.build(task.outputRoot+'/Cargo.toml',task.packageName,['water_project_session','water_native_scan','water_scope_registry','water_contracts','serde_json']),exe=join(rust.tmp,stamp+'-late-cancel.exe');
 command(rust.rustc,['--edition=2024','--crate-name','controller_late_cancel',join(controller,'scripts/acceptance/project-late-cancel-producer.rs'),'-L','dependency='+rust.deps,...artifacts.flatMap(a=>['--extern',a.crate+'='+a.filename]),'-o',exe],180000);
 const capture=JSON.parse(command(exe,[],30000)),captureFile=join(out,stamp+'-actual-AA-late-cancel.json');writeFileSync(captureFile,JSON.stringify(capture)+'\n',{flag:'wx'});record.actualCapture={path:captureFile,sha256:hash(readFileSync(captureFile)),status:capture.snapshot.view.status,marker:capture.marker};
 assert.equal(capture.snapshot.view.status,'completed');assert.deepEqual(capture.marker,{status:'skipped',error_code:'scan_cancelled',observation_json:null});
 const y=manifest.tasks.find(t=>t.id==='WATER-W1-AB');for(const p of [...y.productionFiles,...y.testFiles].filter(p=>p.endsWith('.mjs')))command(process.execPath,['--check',p]);
 const tests=command(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap',...y.testFiles],180000);assert.deepEqual([...tests.matchAll(/^# Subtest: (.+)\r?$/gm)].map(m=>m[1]).sort(),[...y.expectedTests,...y.expectedBrowserTests].sort());assert(tests.includes('# pass 5')&&tests.includes('# fail 0')&&tests.includes('# skipped 0'));record.ABTests='5/5';
 record.frozenLateCancel=await lateCancelProbe(root);assert.deepEqual(record.frozenLateCancel.failures,[]);
 const {startFromStreams}=await import(pathToFileURL(join(root,'prototypes/project-workspace/transport.mjs'))),input=new PassThrough(),commands=[],output=new Writable({write(b,_,done){commands.push(JSON.parse(b));done();}});let workspace;
 const emit=e=>input.write(Buffer.from(JSON.stringify({version:'water.project-host.v1',...e})+'\n'));
 try{emit({kind:'ready'});workspace=await startFromStreams({input,output});const html=await(await fetch(workspace.url)).text(),token=/<meta name="water-action" content="([a-f0-9]{64})"/.exec(html)[1];
  const post=read=>fetch(workspace.url+'/actions/start',{method:'POST',headers:{Origin:workspace.url,'Content-Type':'application/json','X-Water-Action':token},body:JSON.stringify({read_manifest:read})});assert.equal((await post(true)).status,202);const id=commands[0].job_id;emit({kind:'accepted',job_id:id,read_manifest:true});
  const event=structuredClone(JSON.parse(readFileSync(join(controller,'contracts/project-workspace-addendum-v1/CASES.json'))).accept[0].event);event.job_id=event.bundle.session_id=id;event.bundle.snapshots=[structuredClone(capture.snapshot)];event.bundle.snapshots[0].view.scan_id=id;event.marker=structuredClone(capture.marker);emit(event);
  let s;const until=Date.now()+3000;while(Date.now()<until){s=await(await fetch(workspace.url+'/session.json')).json();if(s.recent.length||s.connection==='failed')break;await new Promise(ok=>setTimeout(ok,10));}assert.equal(s.connection,'ready');assert.equal(s.active,null);assert.equal(s.recent[0].status,'completed');assert.equal(s.recent[0].evidence_url,null);
  const report=s.recent[0].report_url;assert.deepEqual(await(await fetch(report+'/session.json')).json(),event.bundle);assert.deepEqual(Buffer.from(await(await fetch(report+'/exports/1.json')).arrayBuffer()),Buffer.from(capture.snapshot.redacted_json));assert.equal((await fetch(workspace.url+'/evidence/'+id+'.json')).status,404);assert.equal((await post(false)).status,202);assert.equal(commands[1].read_manifest,false);
  const file=join(out,stamp+'-fresh-AA-to-AB-http.json');writeFileSync(file,JSON.stringify({captureFile,source:'Actual AA public capture; synthetic dialog envelope only',state:s,event,commands},null,2)+'\n',{flag:'wx'});record.freshAAtoAB={passed:true,path:file};
 }finally{await workspace?.close();assert(!input.destroyed&&!output.destroyed);input.destroy();output.destroy();}
 assert.equal(prepareProjectFixtures(ctx).sha256,fixture.sha256);assert.equal(git(['status','--porcelain','--untracked-files=all']),'');record.status='passed';
}catch(e){record.status='failed';record.error=e.stack;process.exitCode=1;}
record.endedAt=new Date().toISOString();const receipt=join(out,stamp+'-candidate-check.json');writeFileSync(receipt,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...record,commands:record.commands.length,receipt}));
