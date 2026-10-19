// Frozen bidirectional transcript replay for Y. Never a fake native executable.
import {createInterface} from 'node:readline';
import {readFileSync} from 'node:fs';
const cases=JSON.parse(readFileSync(new URL('../../contracts/interactive-host-v1/CASES.json',import.meta.url))).cases;
const write=x=>process.stdout.write(JSON.stringify({version:'water.interactive-host.v1',...x})+'\n');
let active,ordinal=0;write({kind:'ready'});
const finish=(bundle,id)=>{bundle=structuredClone(bundle);bundle.session_id=id;if(bundle.snapshots.length)bundle.snapshots[0].view.scan_id=id;write({kind:'result',job_id:id,bundle});active=null;};
for await(const line of createInterface({input:process.stdin,crlfDelay:Infinity})) {
 const request=JSON.parse(line);
 if(request.command==='shutdown'){write({kind:'stopped'});break;}
 if(request.command==='cancel') {if(!active||active.id!==request.job_id)write({kind:'failure',job_id:request.job_id,code:'UnknownJob'});else{active.cancelled=true;write({kind:'cancel_ack',job_id:active.id,applied:true});finish(cases[2].bundle,active.id);}continue;}
 if(active){write({kind:'failure',job_id:request.job_id,code:'Busy'});continue;}
 const id=request.job_id,index=ordinal++%3;active={id,cancelled:false};write({kind:'accepted',job_id:id});
 // A delayed fixed replay makes async state observable; this is a test input,
 // not production scan pacing, and it never opens a native window or fixture.
 setTimeout(()=>{if(active?.id!==id)return;write({kind:'progress',job_id:id,visited_entries:index===0?8:0,recorded_entries:index===0?8:0});finish(cases[index].bundle,id);},200);
}
