// Existing AB/W/Q/Z public path only. New AD report product is not imported.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PassThrough,Writable} from 'node:stream';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve('.'),cases=JSON.parse(readFileSync(join(root,'contracts/project-session-v1/CASES.json'))).cases;
const {startFromStreams}=await import(pathToFileURL(join(root,'prototypes/project-workspace/transport.mjs')));
const input=new PassThrough(),commands=[],output=new Writable({write(b,_,done){commands.push(JSON.parse(b));done();}});
const emit=e=>input.write(Buffer.from(JSON.stringify({version:'water.project-host.v1',...e})+'\n'));
let workspace;try{
 emit({kind:'ready'});workspace=await startFromStreams({input,output});const html=await(await fetch(workspace.url)).text(),token=/<meta name="water-action" content="([a-f0-9]{64})"/.exec(html)[1];
 const post=read=>fetch(workspace.url+'/actions/start',{method:'POST',headers:{Origin:workspace.url,'Content-Type':'application/json','X-Water-Action':token},body:JSON.stringify({read_manifest:read})});
 assert.equal((await post(true)).status,202);const id=commands[0].job_id;emit({kind:'accepted',job_id:id,read_manifest:true});const e=structuredClone(cases[1]);e.job_id=e.bundle.session_id=id;e.bundle.snapshots[0].view.scan_id=id;emit(e);
 let state;const end=Date.now()+3000;do{state=await(await fetch(workspace.url+'/session.json')).json();if(state.recent.length)break;await new Promise(ok=>setTimeout(ok,10));}while(Date.now()<end);
 assert.equal(state.connection,'ready');const row=state.recent[0];assert.equal(row.status,'completed');assert.equal(row.marker.status,'observed');const bundle=await(await fetch(row.report_url+'/session.json')).json();assert.deepEqual(bundle,e.bundle);
 const q=Buffer.from(await(await fetch(row.report_url+'/exports/1.json')).arrayBuffer()),z=Buffer.from(await(await fetch(workspace.url+row.evidence_url)).arrayBuffer());assert.deepEqual(q,Buffer.from(e.bundle.snapshots[0].redacted_json));assert.deepEqual(z,Buffer.from(e.marker.observation_json));
 const invalid=await fetch(workspace.url+'/actions/start',{method:'POST',headers:{Origin:'https://outside.invalid','Content-Type':'application/json','X-Water-Action':token},body:'{"read_manifest":false}'});assert.equal(invalid.status,403);assert.equal(commands.length,1);
 console.log(JSON.stringify({status:'passed',existingAB:true,actualW:true,qBytes:q.length,zBytes:z.length,newADProductTested:false,syntheticDialogEnvelope:true,newNativeSelectorRun:false,systemNativeDialogs:0,physicalFixtureAccess:false,attachmentMethod:'HTTP prerequisite byte check, not mouse download'}));
}finally{await workspace?.close();assert(!input.destroyed&&!output.destroyed);input.destroy();output.destroy();}
