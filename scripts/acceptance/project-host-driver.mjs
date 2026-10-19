// Public fixed AA/replay wire gate. Four native windows only in native mode.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {assertReviewInput} from '../../prototypes/native-review/model.mjs';
const root=resolve('.'),mode=process.argv[2];assert(['replay','native'].includes(mode));assert.equal(process.argv.length,3);
const cases=JSON.parse(readFileSync('contracts/project-session-v1/CASES.json')).cases,native=mode==='native';
const index=native?JSON.parse(readFileSync(process.env.WATER_MARKER_INDEX)):null;if(index)assert.equal(index.roots.good,join(root,'.local/root-marker-fixtures/batch-v1/good'));
const child=spawn(native?join(root,'.local/next-target/debug/water-project-session.exe'):process.execPath,native?[index.roots.good]:['scripts/acceptance/project-host-replay.mjs'],{cwd:root,stdio:['pipe','pipe','pipe'],shell:false,windowsHide:true});
const closed=new Promise(ok=>child.once('close',(code,signal)=>ok({code,signal}))),events=[],pending=[],waiters=new Set();let buffer=Buffer.alloc(0),stderr='',fault,dialogs=0;
child.stderr.on('data',b=>stderr+=b);child.on('error',e=>{fault=e;for(const w of waiters)w();});child.stdin.on('error',e=>{fault=e;for(const w of waiters)w();});
child.stdout.on('data',b=>{try{buffer=Buffer.concat([buffer,Buffer.from(b)]);assert(buffer.length<=67125248);let at;while((at=buffer.indexOf(10))>=0){const raw=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(buffer.subarray(0,at));buffer=buffer.subarray(at+1);assert(!raw.startsWith('\ufeff'));const e=JSON.parse(raw);assert.equal(JSON.stringify(e),raw);assert.equal(e.version,'water.project-host.v1');events.push(e);pending.push(e);for(const w of waiters)w();}}catch(e){fault=e;child.kill();for(const w of waiters)w();}});
async function wait(fn){const end=Date.now()+20000;while(Date.now()<end){if(fault)throw fault;const i=pending.findIndex(fn);if(i>=0)return pending.splice(i,1)[0];await new Promise((ok,bad)=>{const done=()=>{clearTimeout(t);waiters.delete(done);ok();},t=setTimeout(()=>{waiters.delete(done);bad(new Error('Project event timeout'));},Math.min(20000,end-Date.now()));waiters.add(done);});}throw new Error('Project event timeout');}
const send=x=>child.stdin.write(JSON.stringify(x)+'\n');
async function ui(action){const p=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','scripts/native-session-ui-action.ps1','-TestProcessId',String(child.pid),'-Action',action],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});let text='',error='';p.stdout.on('data',b=>text+=b);p.stderr.on('data',b=>error+=b);const t=setTimeout(()=>p.kill(),20000),code=await new Promise(ok=>p.once('close',ok));clearTimeout(t);dialogs+=(text.match(/^WATER_UI_WINDOW /gm)??[]).length;process.stderr.write(text+error);assert.equal(code,0,'Project native UI failed');assert(text.includes('WATER_UI_ACTION '+child.pid+' '+action));}
const result={startedAt:new Date().toISOString(),mode,newAAProduct:native,systemNativeDialogs:0,completed:[]};
try{
 await wait(e=>e.kind==='ready');
 for(const[name,read,expected,action]of[['default',false,0,'select'],['observed',true,1,'select'],['selection_cancelled',true,6,'cancel'],['scan_cancelled',true,2,'select']]){
  const id='project-check-'+name;send({command:'start',job_id:id,read_manifest:read});const accepted=await wait(e=>e.kind==='accepted'&&e.job_id===id);assert.equal(accepted.read_manifest,read);
  if(name==='scan_cancelled'){send({command:'cancel',job_id:id});assert.equal((await wait(e=>e.kind==='cancel_ack'&&e.job_id===id)).applied,true);}
  if(native)await ui(action);
  const e=await wait(e=>e.kind==='result'&&e.job_id===id);assertReviewInput(e.bundle);assert.equal(e.read_manifest,read);assert.equal(e.bundle.session_id,id);
  const gold=structuredClone(cases[expected]);gold.job_id=gold.bundle.session_id=id;if(gold.bundle.snapshots.length)gold.bundle.snapshots[0].view.scan_id=id;
  assert.deepEqual(e,gold,'Project real result/Q/marker must match dependency-derived frozen values');result.completed.push({name,read_manifest:read,marker:e.marker.status,status:e.bundle.snapshots[0]?.view.status??null});
 }
 send({command:'shutdown'});await wait(e=>e.kind==='stopped');child.stdin.end();let timer;const exit=await Promise.race([closed,new Promise((_,bad)=>{timer=setTimeout(()=>bad(new Error('Project host failed to exit')),5000);})]);clearTimeout(timer);assert.equal(exit.code,0);assert.equal(stderr,'');assert.equal(buffer.length,0);result.exit=exit;result.status='passed';
}catch(e){result.status='failed';result.error=e.stack;process.exitCode=1;}
finally{if(child.exitCode===null){child.kill();await Promise.race([closed,new Promise(ok=>setTimeout(ok,1000))]);}result.systemNativeDialogs=dialogs;result.events=events;result.endedAt=new Date().toISOString();const out=join(root,'.local/checks/project-driver');mkdirSync(out,{recursive:true});const receipt=join(out,new Date().toISOString().replaceAll(':','-')+'-'+process.pid+'-'+mode+'.json');writeFileSync(receipt,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,events:events.length,receipt}));}
