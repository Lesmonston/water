// Bidirectional control replay, explicitly not a native AA executable.
import {createInterface} from 'node:readline';
import {readFileSync} from 'node:fs';
const cases=JSON.parse(readFileSync(new URL('../../contracts/project-session-v1/CASES.json',import.meta.url))).cases;
const write=x=>process.stdout.write(JSON.stringify({version:'water.project-host.v1',...x})+'\n');
let active,ordinal=0;write({kind:'ready'});
function finish(index,job){const event=structuredClone(cases[index]);event.job_id=event.bundle.session_id=job.id;event.read_manifest=job.read;if(event.bundle.snapshots.length)event.bundle.snapshots[0].view.scan_id=job.id;if(!job.read)event.marker={status:'not_requested',error_code:null,observation_json:null};write(event);active=null;}
for await(const raw of createInterface({input:process.stdin,crlfDelay:Infinity})){
 const r=JSON.parse(raw);
 if(r.command==='shutdown'){write({kind:'stopped'});break;}
 if(r.command==='cancel'){if(active?.id===r.job_id){const job=active;write({kind:'cancel_ack',job_id:job.id,applied:true});finish(2,job);}else write({kind:'failure',job_id:r.job_id,code:'UnknownJob'});continue;}
 if(active){write({kind:'failure',job_id:r.job_id,code:'Busy'});continue;}
 active={id:r.job_id,read:r.read_manifest,index:ordinal++%4};const job=active;write({kind:'accepted',job_id:job.id,read_manifest:job.read});
 // Fixed delayed input replay exposes asynchronous states; never production pacing.
 setTimeout(()=>{if(active!==job)return;const index=job.index===2?6:job.read?1:0;write({kind:'progress',job_id:job.id,visited_entries:index===6?0:1,recorded_entries:index===6?0:1});finish(index,job);},180);
}
