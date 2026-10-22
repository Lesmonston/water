// Frozen AB regression. Memory/loopback only; no native program, fixture or Chrome.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Readable,PassThrough,Writable} from 'node:stream';
import {join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const controller=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const json=p=>JSON.parse(readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
export async function lateCancelProbe(tree){
 const defs=json(join(controller,'contracts/project-workspace-addendum-v1/CASES.json'));
 const source=readFileSync(join(controller,defs.actualCapture.path));assert.equal(hash(source),defs.actualCapture.sha256);
 const {assertMarker,WorkspaceState}=await import(pathToFileURL(join(tree,'prototypes/project-workspace/model.mjs')));
 const {startFromStreams}=await import(pathToFileURL(join(tree,'prototypes/project-workspace/transport.mjs')));
 const {assertReviewInput}=await import(pathToFileURL(join(tree,'prototypes/native-review/model.mjs')));
 const failures=[],observations=[];
 const run=async(name,entry,fn)=>{try{await fn();observations.push({name,entry,accepted:true});}catch(e){observations.push({name,entry,accepted:false,error:e.message});failures.push('AB_LATE_CANCELLED_CONTENT: '+name+' '+entry+' '+e.message);}};
 const frame=e=>Buffer.from(JSON.stringify({version:'water.project-host.v1',...e})+'\n');
 const base=json(join(tree,'contracts/project-session-v1/CASES.json')).cases;
 for(const e of base)assertMarker(e.marker,e.read_manifest,e.bundle.selection,e.bundle.snapshots[0]?.view.status??'selection_cancelled');
 const invalids=[{...structuredClone(base[1]),read_manifest:false},{...structuredClone(base[0]),marker:defs.accept[0].event.marker},{...structuredClone(base[6]),marker:defs.accept[0].event.marker}];
 for(const e of invalids)assert.throws(()=>assertMarker(e.marker,e.read_manifest,e.bundle.selection,e.bundle.snapshots[0]?.view.status??'selection_cancelled'),{message:'Project workspace unavailable.'});
 for(const c of defs.accept){const e=structuredClone(c.event);assertReviewInput(e.bundle);const status=e.bundle.snapshots[0].view.status;
  await run(c.name,'assertMarker',()=>assertMarker(e.marker,true,'confirmed',status));
  await run(c.name,'WorkspaceState',()=>{const s=new WorkspaceState();s.receive({version:'water.project-host.v1',kind:'ready'});const id=s.start(true).job_id;const event=structuredClone(e);event.job_id=event.bundle.session_id=id;event.bundle.snapshots[0].view.scan_id=id;s.receive({version:'water.project-host.v1',kind:'accepted',job_id:id,read_manifest:true});const result=s.receive(event);assert(result);s.finish(result,'http://127.0.0.1:1',null);assert.equal(s.view().connection,'ready');assert.equal(s.view().recent[0].status,status);assert.equal(s.view().recent[0].marker.status,'skipped');});
  await run(c.name,'streams/HTTP',async()=>{
   const input=new PassThrough(),commands=[],output=new Writable({write(bytes,_,done){commands.push(JSON.parse(bytes));done();}});let workspace;
   try{
    input.write(frame({kind:'ready'}));workspace=await startFromStreams({input,output});const html=await(await fetch(workspace.url)).text();const token=/<meta name="water-action" content="([a-f0-9]{64})"/.exec(html)?.[1];assert(token);
    const post=read=>fetch(workspace.url+'/actions/start',{method:'POST',headers:{Origin:workspace.url,'Content-Type':'application/json','X-Water-Action':token},body:JSON.stringify({read_manifest:read})});assert.equal((await post(true)).status,202);const id=commands[0].job_id;input.write(frame({kind:'accepted',job_id:id,read_manifest:true}));
    const event=structuredClone(e);event.job_id=event.bundle.session_id=id;event.bundle.snapshots[0].view.scan_id=id;input.write(frame(event));let state;
    const until=Date.now()+1500;while(Date.now()<until){state=await(await fetch(workspace.url+'/session.json')).json();if(state.connection==='failed'||state.recent.length)break;await new Promise(ok=>setTimeout(ok,5));}
    assert.equal(state.connection,'ready','valid metadata must remain reviewable after content cancellation');assert.equal(state.active,null);const recent=state.recent[0];assert(recent);assert.equal(recent.status,status);assert.deepEqual(recent.marker,e.marker);assert.equal(recent.evidence_url,null);assert(recent.report_url);
    const served=await(await fetch(recent.report_url+'/session.json')).json();assert.deepEqual(served,event.bundle);const q=Buffer.from(await(await fetch(recent.report_url+'/exports/1.json')).arrayBuffer());assert.deepEqual(q,Buffer.from(e.bundle.snapshots[0].redacted_json));assert.equal((await fetch(workspace.url+'/evidence/'+id+'.json')).status,404);assert.equal((await post(false)).status,202);assert.equal(commands.length,2);assert.equal(commands[1].read_manifest,false);
   }finally{await workspace?.close();assert(!input.destroyed&&!output.destroyed);input.destroy();output.destroy();}
  });
 }
 return{target:'AB_LATE_CANCELLED_CONTENT',systemNativeDialogs:0,physicalFixtureAccess:false,originalPositiveCases:base.length,negativeControls:invalids.length,observations,failures};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const tree=process.argv[2]?resolve(process.argv[2]):resolve('.');const result=await lateCancelProbe(tree);console.log(JSON.stringify(result));if(result.failures.length)process.exitCode=1;}
