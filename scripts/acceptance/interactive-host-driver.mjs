// Fixed X/replay contract driver. At most 3 native dialogs (or one cancel proof).
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {assertReviewInput} from '../../prototypes/native-review/model.mjs';
const mode=process.argv[2];assert(['replay','native','native-cancel'].includes(mode));assert.equal(process.argv.length,3);
const root=resolve('.'),native=mode!=='replay',index=native?JSON.parse(readFileSync(process.env.WATER_NATIVE_WALK_INDEX)):null;
if(index) assert.equal(index.root,join(root,'.local/native-walk-fixtures/batch-v1/root'));
const child=spawn(native?join(root,'.local/next-target/debug/water-scan-host.exe'):process.execPath,native?[index.root]:[join(root,'scripts/acceptance/interactive-host-replay.mjs')],{cwd:root,stdio:['pipe','pipe','pipe'],windowsHide:true,shell:false});
const events=[],seen=[],waiters=new Set();let buffer=Buffer.alloc(0),stderr='',fault,dialogs=0;
const exited=new Promise(ok=>child.once('close',(code,signal)=>ok({code,signal})));
child.on('error',e=>{fault=e;for(const w of waiters)w();});child.stderr.on('data',b=>stderr+=b);
child.stdin.on('error',e=>{fault=e;for(const w of waiters)w();});
child.stdout.on('data',b=>{
 try {buffer=Buffer.concat([buffer,Buffer.from(b)]);assert(buffer.length<=67109888);let at;
 while((at=buffer.indexOf(10))>=0){const bytes=buffer.subarray(0,at);buffer=buffer.subarray(at+1);const raw=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);assert(!raw.startsWith('\ufeff'));const e=JSON.parse(raw);assert.equal(JSON.stringify(e),raw);assert.equal(e.version,'water.interactive-host.v1');events.push(e);seen.push(e);for(const w of waiters)w();}}
 catch(e){fault=e;for(const w of waiters)w();child.kill();}
});
async function wait(predicate) {
 const until=Date.now()+20000;
 while(Date.now()<until) {if(fault)throw fault;const n=events.findIndex(predicate);if(n>=0)return events.splice(n,1)[0];
  await new Promise((ok,bad)=>{const done=()=>{clearTimeout(t);waiters.delete(done);ok();};const t=setTimeout(()=>{waiters.delete(done);bad(new Error('Host event timeout'));},Math.min(20000,until-Date.now()));waiters.add(done);});}
 throw new Error('Host event timeout');
}
const send=x=>child.stdin.write(JSON.stringify(x)+'\n');
async function ui(action) {assert(native);const p=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',join(root,'scripts/native-session-ui-action.ps1'),'-TestProcessId',String(child.pid),'-Action',action],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});let out='',err='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);const t=setTimeout(()=>p.kill(),20000);const code=await new Promise(ok=>p.once('close',ok));clearTimeout(t);process.stderr.write(out+err);dialogs+=(out.match(/^WATER_UI_WINDOW /gm)??[]).length;assert.equal(code,0);assert(out.includes('WATER_UI_ACTION '+child.pid+' '+action));}
const result={mode,newXProduct:native,nativeDialogs:0,completed:[]};
let failure;
try {
 await wait(e=>e.kind==='ready');
 const scenarios=mode==='native-cancel'?['pre_cancel']:native?['selection_cancelled','complete','pre_cancel']:['complete','selection_cancelled','pre_cancel'];
 for(const scenario of scenarios) {
  const id='check-'+scenario;send({command:'start',job_id:id});await wait(e=>e.kind==='accepted'&&e.job_id===id);
  if(scenario==='pre_cancel') {send({command:'cancel',job_id:id});assert.equal((await wait(e=>e.kind==='cancel_ack'&&e.job_id===id)).applied,true);}
  if(native)await ui(scenario==='selection_cancelled'?'cancel':'select');
  const e=await wait(e=>e.kind==='result'&&e.job_id===id);assertReviewInput(e.bundle);assert.equal(e.bundle.session_id,id);
  if(scenario==='selection_cancelled') {assert.equal(e.bundle.selection,'cancelled');assert.equal(e.bundle.snapshots.length,0);}
  else {assert.equal(e.bundle.selection,'confirmed');assert.equal(e.bundle.snapshots.length,1);assert.equal(e.bundle.snapshots[0].source_kind,'native_scope_metadata');
   if(scenario==='pre_cancel')assert.equal(e.bundle.snapshots[0].view.status,'cancelled','X_CANCEL_TOKEN: actual V must receive the cancelled shared token');
   else {assert.equal(e.bundle.snapshots[0].view.status,'completed');assert.equal(e.bundle.snapshots[0].view.findings.length,8);}}
  result.completed.push({job_id:id,scenario,selection:e.bundle.selection,status:e.bundle.snapshots[0]?.view.status??null});
 }
 send({command:'shutdown'});await wait(e=>e.kind==='stopped');child.stdin.end();
 const ending=await Promise.race([exited,new Promise((_,bad)=>setTimeout(()=>bad(new Error('Host failed to exit')),5000))]);assert.equal(ending.code,0);assert.equal(stderr,'');assert.equal(buffer.length,0);
 result.exit=ending;result.status='passed';
} catch(e) {failure=e;result.status='failed';result.error=e.message;process.exitCode=1;}
finally {
 if(child.exitCode===null)child.kill();
 result.nativeDialogs=dialogs;result.events=seen;
 const dir=join(root,'.local/checks/interactive-driver');mkdirSync(dir,{recursive:true});const receipt=join(dir,new Date().toISOString().replaceAll(':','-')+'-'+process.pid+'-'+mode+'.json');
 writeFileSync(receipt,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,events:seen.length,receipt}));
 if(failure)process.stderr.write(failure.message+'\n');
}
