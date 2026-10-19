// Private offline build and integrated W checks; never opens a native dialog.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {isAbsolute,join,relative,resolve} from 'node:path';
import {rustEnvironment} from '../next-core-runtime.mjs';
import {budgetProbe} from './native-review-budget-probe.mjs';
const controller=resolve('.'),root=join(controller,'.worktrees/integration-vw-20261019');
const out=join(controller,'.local/checks/controller-vw-joint-20261019');mkdirSync(out,{recursive:true});
const stamp=new Date().toISOString().replaceAll(':','-')+'-'+process.pid;
const record={startedAt:new Date().toISOString(),root,systemNativeDialogsLaunched:0,commands:[]};
const env={...process.env,GIT_OPTIONAL_LOCKS:'0',RUSTUP_AUTO_INSTALL:'0'};
for(const k of Object.keys(env)) if(/^(?:CARGO_|RUST|NODE_OPTIONS$|NODE_PATH$|WATER_)/i.test(k)&&k!=='RUSTUP_AUTO_INSTALL') delete env[k];
let seq=0;
function command(binary,argv,timeout=30000) {
  const r=spawnSync(binary,argv,{cwd:root,env,encoding:'utf8',shell:false,windowsHide:true,timeout,maxBuffer:32*1024*1024});
  const item={binary,argv,exitCode:r.status,error:r.error?.code??null,log:stamp+'-'+(++seq)+'.log'};
  writeFileSync(join(out,item.log),JSON.stringify(item)+'\n--- stdout ---\n'+(r.stdout??'')+'\n--- stderr ---\n'+(r.stderr??''),{flag:'wx'});
  record.commands.push(item);assert(!r.error,item.log);assert.equal(r.status,0,item.log);return (r.stdout??'').trim();
}
const git=args=>command('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...args]);
const hash=b=>createHash('sha256').update(b).digest('hex');
try {
  record.integrationCommit=git(['rev-parse','HEAD']);assert.equal(git(['status','--porcelain','--untracked-files=all']),'');
  for(const sha of ['50d783d2338448a3b03934dc5a41231118707b1d','df9255b73e1037eda7599098de900bb4705f5921','ec1ee25034185d95279debcd589be49b84458af1']) git(['merge-base','--is-ancestor',sha,'HEAD']);
  const task=JSON.parse(readFileSync('docs/dispatch/wave1/manifest.json')).tasks.find(t=>t.id==='WATER-W1-V');
  const within=(base,p)=>{const rel=relative(base,p);assert(!rel.startsWith('..')&&!isAbsolute(rel));};
  const local=p=>{const dir=join(root,p);within(root,dir);mkdirSync(dir,{recursive:true});return dir;};
  const ctx={root,controller,env,command,record,task,local,within};
  const rust=rustEnvironment(ctx);
  command(rust.cargo,['build','--offline','--locked','--manifest-path','packages/native-session/Cargo.toml','--bin','water-native-session'],180000);
  record.binary={path:join(rust.target,'debug/water-native-session.exe')};
  const binary=readFileSync(record.binary.path);Object.assign(record.binary,{bytes:binary.length,sha256:hash(binary)});
  const suite=command(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap','prototypes/native-review/tests/model.test.mjs','prototypes/native-review/tests/browser.test.mjs'],180000);
  for(const line of ['# tests 5','# pass 5','# fail 0','# skipped 0','# cancelled 0']) assert(suite.includes(line));
  record.integratedFiveTests='passed';record.budgetProbe=await budgetProbe(root);assert.equal(record.budgetProbe.failures.length,0);
  const lock=JSON.parse(readFileSync('contracts/native-review-addendum-v1/freeze.lock.json')),frozen=new Map();
  for(const p of lock.inheritedLocks) for(const f of JSON.parse(readFileSync(p)).files) frozen.set(f.path,f.sha256);
  for(const f of lock.files) frozen.set(f.path,f.sha256);
  assert.equal(frozen.size,341);
  for(const [p,expected] of frozen) assert.equal(hash(readFileSync(join(root,p))),expected,p);
  record.frozenFiles=frozen.size;assert.equal(git(['status','--porcelain','--untracked-files=all']),'');record.status='passed';
} catch(e) {record.status='failed';record.error=e.stack;process.exitCode=1;}
record.endedAt=new Date().toISOString();const receipt=join(out,stamp+'-preparation.json');
writeFileSync(receipt,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...record,commands:record.commands.length,receipt}));
