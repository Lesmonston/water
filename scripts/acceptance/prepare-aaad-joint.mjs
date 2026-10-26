// Controller-only: new candidate tree at main, byte checks, offline fixed-AA build, frozen fixtures.
// Zero native windows. Does not change product files, network or global Cargo configuration.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,statSync,writeFileSync} from 'node:fs';
import {isAbsolute,join,relative,resolve} from 'node:path';
import {rustEnvironment} from '../next-core-runtime.mjs';
import {prepareProjectFixtures} from '../project-wave-fixtures.mjs';
const controller=resolve('.'),root=join(controller,'.worktrees/integration-aaad-20261026'),out=join(controller,'.local/checks/controller-aaad-20261026');mkdirSync(out,{recursive:true});
const base='1d02a6a7206ea01a23f4c9095a47ec7c6103936f',branch='controller/water-w1-aaad-joint-20261026';
const stamp=new Date().toISOString().replaceAll(':','-')+'-'+process.pid,env={...process.env,GIT_OPTIONAL_LOCKS:'0'},hash=b=>createHash('sha256').update(b).digest('hex');
for(const k of Object.keys(env))if(/^(?:CARGO_|RUST|NODE_OPTIONS$|NODE_PATH$|WATER_)/i.test(k))delete env[k];
const record={startedAt:new Date().toISOString(),root,base,branch,systemNativeDialogs:0,commands:[]};let seq=0;
function command(binary,argv,timeout=30000,cwd=root){const r=spawnSync(binary,argv,{cwd,env,encoding:'utf8',windowsHide:true,shell:false,timeout,maxBuffer:64*1024*1024});const item={binary,argv,cwd,exitCode:r.status,error:r.error?.code??null,log:stamp+'-prepare-'+(++seq)+'.log'};writeFileSync(join(out,item.log),JSON.stringify(item)+'\n--- stdout ---\n'+(r.stdout??'')+'\n--- stderr ---\n'+(r.stderr??''),{flag:'wx'});record.commands.push(item);assert(!r.error&&r.status===0,item.log);return(r.stdout??'').trim();}
const git=(args,cwd=root)=>command('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false','-c','maintenance.auto=false','-c','gc.auto=0',...args],60000,cwd);
const quiet=(args,cwd=root)=>{const r=spawnSync('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...args],{cwd,env,encoding:'utf8',windowsHide:true,shell:false,timeout:60000});return r.status;};
try{
 assert.equal(git(['rev-parse','HEAD'],controller),base,'Controller main moved; refreeze the plan');
 assert.equal(git(['status','--porcelain','--untracked-files=no'],controller).split('\n').filter(l=>l&&!l.includes('WATER-W1-AAAD-JOINT-PLAN-20261026.md')&&!l.includes('scripts/acceptance/')).length,0);
 if(!existsSync(root)){git(['worktree','add','-b',branch,root,base],controller);record.treeCreated=true;}else record.treeCreated=false;
 assert.equal(git(['rev-parse','HEAD']),base);assert.equal(git(['status','--porcelain','--untracked-files=no']),'');
 // Product bytes must be exactly what was accepted.
 record.byteChecks={
  ad_vs_3ad5e70:quiet(['diff','--quiet','3ad5e7003d9e9720e85113a47d558738bf06231d','HEAD','--','prototypes/project-workspace']),
  aa_vs_b3a874d:quiet(['diff','--quiet','b3a874d0a1628a7bdce6f3414f234b2b45957152','HEAD','--','packages/project-session/src','packages/project-session/Cargo.toml','packages/project-session/Cargo.lock']),
  products_vs_5b4d77c:quiet(['diff','--quiet','5b4d77c3fff3717ac60277fe67e04444477cea77','HEAD','--','packages','prototypes','crates','tools']),
 };
 assert.deepEqual(record.byteChecks,{ad_vs_3ad5e70:0,aa_vs_b3a874d:0,products_vs_5b4d77c:0});
 const manifest=JSON.parse(readFileSync(join(controller,'docs/dispatch/wave1/manifest.json'))),task=manifest.tasks.find(t=>t.id==='WATER-W1-AA');
 const within=(b,p)=>{const rel=relative(b,p);assert(!rel.startsWith('..')&&!isAbsolute(rel));},local=p=>{const d=join(root,p);within(root,d);mkdirSync(d,{recursive:true});return d;};
 const ctx={root,controller,env,record,task,local,within,command,stamp};
 const rust=rustEnvironment(ctx),fixture=prepareProjectFixtures(ctx);
 record.fixture={indexPath:fixture.indexPath,sha256:fixture.sha256,literalPayloadBytes:fixture.index.literal_payload_bytes,good:fixture.index.roots.good};
 command(rust.cargo,['build','--offline','--locked','--manifest-path',task.outputRoot+'/Cargo.toml','--bin','water-project-session'],600000);
 const exe=join(root,'.local/next-target/debug/water-project-session.exe');assert(statSync(exe).isFile());
 record.fixedProgram={path:exe,bytes:statSync(exe).size,sha256:hash(readFileSync(exe))};
 assert.equal(prepareProjectFixtures(ctx).sha256,fixture.sha256);
 assert.equal(git(['status','--porcelain','--untracked-files=no']),'');record.status='passed';
}catch(e){record.status='failed';record.error=e.stack;process.exitCode=1;}
record.endedAt=new Date().toISOString();const receipt=join(out,stamp+'-prepare-result.json');writeFileSync(receipt,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:record.status,error:record.error,byteChecks:record.byteChecks,fixture:record.fixture,fixedProgram:record.fixedProgram,commands:record.commands.length,receipt}));
