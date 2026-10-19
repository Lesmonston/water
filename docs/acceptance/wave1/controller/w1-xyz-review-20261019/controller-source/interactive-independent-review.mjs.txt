// Extra controller public-boundary cases. Memory/loopback/idle executable only.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {PassThrough,Writable} from 'node:stream';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve('.'),tree=join(root,'.worktrees/integration-xyz-20261019'),out=join(root,'.local/checks/controller-xyz-20261019');mkdirSync(out,{recursive:true});
const stamp=new Date().toISOString().replaceAll(':','-')+'-'+process.pid,result={startedAt:new Date().toISOString(),systemNativeDialogs:0,cases:[]},handles=[];
const {startFromStreams}=await import(pathToFileURL(join(tree,'prototypes/live-workspace/transport.mjs')));
const line=object=>Buffer.from(JSON.stringify({version:'water.interactive-host.v1',...object})+'\n');
async function handle(){const input=new PassThrough(),commands=[],output=new Writable({write(b,_,cb){commands.push(JSON.parse(b));cb();}});input.write(line({kind:'ready'}));const h=await startFromStreams({input,output});handles.push({h,input,output,commands});const token=/<meta name="water-action" content="([a-f0-9]{64})"/.exec(await(await fetch(h.url)).text())[1];return{h,input,output,commands,token};}
try{
 const binary=join(tree,'.local/next-target/debug/water-scan-host.exe'),initial=join(tree,'.local/native-walk-fixtures/batch-v1/root');
 for(const [name,body,code] of [['escaped-duplicate','{"command":"cancel","job_id":"a","job_\\u0069d":"b"}\n',0],['shutdown-extra','{"command":"shutdown","payload":"private"}\n',0],['crlf','{"command":"shutdown"}\r\n',0],['bom','\ufeff{"command":"shutdown"}\n',0],['bound','x'.repeat(4097)+'\n',2],['eof-fragment','{"command":',2],['idle-end','',0]]){
  const r=spawnSync(binary,[initial],{cwd:tree,input:Buffer.from(body),encoding:'utf8',windowsHide:true,timeout:5000});assert.equal(r.status,code,name);assert.equal(r.stderr,code?'Host unavailable.\n':'',name);const events=r.stdout.trim().split('\n').map(s=>JSON.parse(s));assert.equal(events[0].kind,'ready');assert.equal(events.at(-1).kind,'stopped');assert(!events.some(e=>['accepted','result','progress'].includes(e.kind)));if(name!=='idle-end')assert(events.some(e=>e.kind==='failure'&&e.code==='InvalidRequest'));result.cases.push({name,exit:code,events});
 }
 const a=await handle(),b=await handle(),post=(h,token,body,origin=h.url)=>fetch(h.url+'/actions/start',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Water-Action':token},body});
 assert.notEqual(a.token,b.token);assert.equal((await post(b.h,a.token,'{}')).status,403);assert.equal(b.commands.length,0);result.cases.push({name:'cross-instance-token',rejected:true,noCommands:true});
 assert.equal((await post(a.h,a.token,'{"path":"F:/private"}')).status,400);assert.equal(a.commands.length,0);result.cases.push({name:'no-path-action',rejected:true,noCommands:true});
 assert.equal((await post(a.h,a.token,'{}')).status,202);assert.equal(a.commands.length,1);const id=a.commands[0].job_id;a.input.write(line({kind:'accepted',job_id:id}));
 a.input.write(line({kind:'progress',job_id:id,visited_entries:4,recorded_entries:3}));a.input.write(line({kind:'progress',job_id:id,visited_entries:3,recorded_entries:3}));
 for(let i=0;i<20;i++){const s=await(await fetch(a.h.url+'/session.json')).json();if(s.connection==='failed')break;await new Promise(ok=>setTimeout(ok,5));}
 assert.equal((await(await fetch(a.h.url+'/session.json')).json()).connection,'failed');assert.equal((await post(a.h,a.token,'{}')).status,503);assert.equal(a.commands.length,1);result.cases.push({name:'regressed-progress-stops-commands',rejected:true});
 const c=await handle();c.input.write(line({kind:'ready'}));for(let i=0;i<20;i++){if((await(await fetch(c.h.url+'/session.json')).json()).connection==='failed')break;await new Promise(ok=>setTimeout(ok,5));}assert.equal((await(await fetch(c.h.url+'/session.json')).json()).connection,'failed');result.cases.push({name:'duplicate-ready-fails',rejected:true});
 result.status='passed';
}catch(e){result.status='failed';result.error=e.stack;process.exitCode=1;}
finally{for(const {h,input,output}of handles){await h.close();assert(!input.destroyed&&!output.destroyed);input.destroy();output.destroy();}result.endedAt=new Date().toISOString();const receipt=join(out,stamp+'-independent-result.json');writeFileSync(receipt,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,cases:result.cases.length,receipt}));}
