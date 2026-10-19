// Controller private build/tests. No system picker windows.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {rustEnvironment} from '../next-core-runtime.mjs';
import {prepareInteractiveFixtures} from '../interactive-wave-fixtures.mjs';
const controller=resolve('.'),root=join(controller,'.worktrees/integration-xyz-20261019');
const out=join(controller,'.local/checks/controller-xyz-20261019');mkdirSync(out,{recursive:true});
const stamp=new Date().toISOString().replaceAll(':','-')+'-'+process.pid,env={...process.env,GIT_OPTIONAL_LOCKS:'0'};
for(const k of Object.keys(env))if(/^(?:CARGO_|RUST|NODE_OPTIONS$|NODE_PATH$|WATER_)/i.test(k))delete env[k];
const record={startedAt:new Date().toISOString(),root,systemNativeDialogs:0,commands:[]};let seq=0;
const hash=b=>createHash('sha256').update(b).digest('hex');
const resumeZ=process.argv[2]==='--resume-z',resumeY=process.argv[2]==='--resume-y';assert.equal(process.argv.length,resumeZ||resumeY?3:2);
function command(binary,argv,timeout=30000){const r=spawnSync(binary,argv,{cwd:root,env,encoding:'utf8',windowsHide:true,shell:false,timeout,maxBuffer:64*1024*1024});const item={binary,argv,exitCode:r.status,error:r.error?.code??null,log:stamp+'-'+(++seq)+'.log'};writeFileSync(join(out,item.log),JSON.stringify(item)+'\n--- stdout ---\n'+(r.stdout??'')+'\n--- stderr ---\n'+(r.stderr??''),{flag:'wx'});record.commands.push(item);assert(!r.error&&r.status===0,item.log);return(r.stdout??'').trim();}
const git=args=>command('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...args]);
try{
 record.integrationCommit=git(['rev-parse','HEAD']);assert.equal(git(['status','--porcelain','--untracked-files=all']),'');
 const manifest=JSON.parse(readFileSync('docs/dispatch/wave1/manifest.json')),within=(b,p)=>{const r=relative(b,p);assert(!r.startsWith('..')&&!isAbsolute(r));},local=p=>{const dir=join(root,p);within(root,dir);mkdirSync(dir,{recursive:true});return dir;};
 const task=manifest.tasks.find(t=>t.id==='WATER-W1-X'),ctx={root,controller,env,command,record,task,local,within};const rust=rustEnvironment(ctx);
 record.rust={cargo:rust.cargo,rustc:rust.rustc,target:rust.target};record.fixtures={};record.tests=[];
 if(resumeZ){const prior=JSON.parse(readFileSync(join(out,'2026-10-19T13-12-32.986Z-4372-integration-check.json')));assert.equal(prior.integrationCommit,record.integrationCommit);assert.deepEqual(prior.tests,[{lane:'X',passed:4}]);record.tests=prior.tests;record.priorReceipt='2026-10-19T13-12-32.986Z-4372-integration-check.json';}
 if(resumeY){const prior=JSON.parse(readFileSync(join(out,'2026-10-19T13-14-37.884Z-32508-integration-check.json')));assert.equal(prior.integrationCommit,record.integrationCommit);assert.equal(prior.tests.length,2);record.tests=prior.tests;record.fixtures=prior.fixtures;record.binary=prior.binary;record.priorReceipt='2026-10-19T13-14-37.884Z-32508-integration-check.json';}
 for(const lane of resumeY?[]:['X','Z']){
  const t=manifest.tasks.find(t=>t.id==='WATER-W1-'+lane),fixture=prepareInteractiveFixtures({...ctx,task:t});env[lane==='X'?'WATER_NATIVE_WALK_INDEX':'WATER_MARKER_INDEX']=fixture.indexPath;
  record.fixtures[lane]={indexPath:fixture.indexPath,sha256:fixture.sha256,literalPayloadBytes:fixture.index.literal_payload_bytes};const args=['--manifest-path',t.outputRoot+'/Cargo.toml'];
  local('.local/checks/'+t.id);if(resumeZ&&lane==='X')continue;
  if(!resumeZ){command(rust.cargo,['fmt',...args,'--','--check'],180000);command(rust.cargo,['clippy','--offline','--locked',...args,'--all-targets','--','-D','warnings'],180000);}
  const text=command(rust.cargo,['test','--offline','--locked',...args,'--test',t.testTarget,'--','--test-threads=1','--nocapture'],180000);
  assert.deepEqual([...text.matchAll(/^test ([a-z0-9_]+) \.\.\. ok$/gm)].map(m=>m[1]).sort(),[...t.expectedTests].sort());assert(text.includes('4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out'));
  record.tests.push({lane,passed:4});assert.equal(prepareInteractiveFixtures({...ctx,task:t}).sha256,fixture.sha256);
 }
 if(!resumeY)command(rust.cargo,['build','--offline','--locked','--manifest-path','packages/scan-host/Cargo.toml','--bin','water-scan-host'],180000);
 const binary=join(rust.target,'debug/water-scan-host.exe');record.binary={path:binary,bytes:readFileSync(binary).length,sha256:hash(readFileSync(binary))};
 local('.local/checks/WATER-W1-Y');const y=manifest.tasks.find(t=>t.id==='WATER-W1-Y');if(!resumeY)for(const p of [...y.productionFiles,...y.testFiles].filter(p=>p.endsWith('.mjs')))command(process.execPath,['--check',p]);
 const text=command(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap',...y.testFiles],180000);
 assert.deepEqual([...text.matchAll(/^# Subtest: (.+)\r?$/gm)].map(m=>m[1]).sort(),[...y.expectedTests,...y.expectedBrowserTests].sort());assert(text.includes('# pass 5')&&text.includes('# fail 0')&&text.includes('# skipped 0'));record.tests.push({lane:'Y',passed:5});
 assert.equal(git(['status','--porcelain','--untracked-files=all']),'');record.status='passed';
}catch(e){record.status='failed';record.error=e.stack;process.exitCode=1;}
record.endedAt=new Date().toISOString();const receipt=join(out,stamp+'-integration-check.json');writeFileSync(receipt,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...record,commands:record.commands.length,receipt}));
