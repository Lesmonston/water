// Main checkout pre-freeze generation; fixed synthetic factory only.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {isAbsolute,join,relative,resolve} from 'node:path';
import {captureProjectDependencies} from '../project-wave-dependencies.mjs';
import {assertReviewInput} from '../../prototypes/native-review/model.mjs';
const root=resolve('.'),out=join(root,'.local/project-wave-preflight-20261019');mkdirSync(out,{recursive:true});
const env={...process.env},record={startedAt:new Date().toISOString(),commands:[]},stamp=new Date().toISOString().replaceAll(':','-')+'-'+process.pid;
for(const k of Object.keys(env))if(/^(?:CARGO_|RUST|NODE_OPTIONS$|NODE_PATH$|WATER_)/i.test(k))delete env[k];let seq=0;
function command(binary,argv,timeout=30000){const r=spawnSync(binary,argv,{cwd:root,env,encoding:'utf8',windowsHide:true,shell:false,timeout,maxBuffer:64*1024*1024});const item={binary,argv,exitCode:r.status,error:r.error?.code??null,log:stamp+'-'+(++seq)+'.log'};writeFileSync(join(out,item.log),JSON.stringify(item)+'\n--- stdout ---\n'+(r.stdout??'')+'\n--- stderr ---\n'+(r.stderr??''),{flag:'wx'});record.commands.push(item);assert(!r.error&&r.status===0,item.log);return(r.stdout??'').trim();}
const local=p=>{const d=join(root,p);mkdirSync(d,{recursive:true});return d;},within=(b,p)=>{const r=relative(b,p);assert(!r.startsWith('..')&&!isAbsolute(r));};
try{const c=captureProjectDependencies({root,controller:root,env,record,stamp,command,local,within,task:{id:'WATER-W1-AA',cargoCacheSource:join(root,'.worktrees/a/.local/cargo-home/registry')}});
 const previous=JSON.parse(readFileSync('contracts/native-session-v1/cases.json')).cases[0].bundle;previous.session_id='project-selection-cancelled';previous.policy.limits={max_depth:8,max_entries:10000,max_dir_entries:256};
 const cancelled={version:'water.project-host.v1',kind:'result',job_id:previous.session_id,read_manifest:true,bundle:previous,marker:{status:'skipped',error_code:'selection_cancelled',observation_json:null}};
 for(const e of[...c.data.cases,cancelled])assertReviewInput(e.bundle);
 const cases={cases_version:'water.project-session.cases.v1',provenance:{newProductsUsed:false,systemNativeDialogs:0,actual_P_R_E_H_Q_Z:true,envelopeOrigin:c.data.envelopeOrigin,selectionCancelled:'Retained actual S cancellation with synthetic ID/default limits and marker request',fixtureIndex:c.fixtureIndex,fixtureSha256:c.fixtureSha256},cases:[...c.data.cases,cancelled]};
 writeFileSync('contracts/project-session-v1/CASES.json',JSON.stringify(cases,null,2)+'\n');record.capture=c;record.casesSha256=createHash('sha256').update(readFileSync('contracts/project-session-v1/CASES.json')).digest('hex');record.status='passed';
}catch(e){record.status='failed';record.error=e.stack;process.exitCode=1;}
record.endedAt=new Date().toISOString();writeFileSync(join(out,stamp+'-capture-result.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({...record,capture:record.capture?{cases:record.capture.data.cases.length,systemNativeDialogs:0,literalPayloadBytes:record.capture.literalPayloadBytes}:null,commands:record.commands.length}));
