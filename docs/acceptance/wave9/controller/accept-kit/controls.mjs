// Controller negative controls in a wave 9 (M3 close fixes) acceptance tree: mutate, red with token, exact restore, green; then test --final.
// Usage (repo root): node .local/w8-accept/controls.mjs <l1..l4> [<first label>]
// "red-ncN" mutations are judged by the gate (exit 0 = expected failure with the ticket's token);
// "test"/"browser" mutations must fail the real tests with the token in a command log, never by a build or syntax error.
// A mutation with "noTimeout": true also fails if any command log mentions a timeout (UI no-cascade check).
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
const slot=process.argv[2],ctl='F:/new/smaltalk/water',muts=JSON.parse(readFileSync(ctl+'/.local/w9-accept/mutations.json','utf8'))[slot];
const tree=ctl+'/.worktrees/accept-w9-'+slot,id='WATER-W9-ACCEPT-'+slot.toUpperCase(),logs=ctl+'/.local/w9-accept/logs',log=logs+'/'+slot+'-controls.txt';
const manifest=ctl+'/.local/w9-accept/manifest.json',[script,envName]=(slot==='l3')?['desktop-wave-check.mjs','WATER_W3_OVERRIDE_MANIFEST']:['checkup-wave-check.mjs','WATER_W2_SELFTEST_MANIFEST'];
mkdirSync(logs,{recursive:true});
const env={...process.env,[envName]:manifest};
const say=s=>{appendFileSync(log,s+'\n');console.log(s);};
const sha=b=>createHash('sha256').update(b).digest('hex');
const gate=(mode,fin)=>{const r=spawnSync(process.execPath,[ctl+'/scripts/'+script,'--task',id,'--mode',mode,...(fin?['--final']:[])],{cwd:tree,env,encoding:'utf8',windowsHide:true,timeout:1800000});const line=(r.stdout??'').trim().split('\n').at(-1);say(slot+' '+mode+(fin?' --final':'')+' rc='+r.status+' '+line);let receipt=null;try{receipt=JSON.parse(line).receipt;}catch{}return {rc:r.status,receipt,line};};
// The UI slot (K6) fails by "# fail N" from node:test; Rust slots by cargo's "test result: FAILED".
const failedRun=t=>slot!=='ui'?/test result: FAILED/.test(t)&&!/error\[E\d+\]|could not compile/.test(t):/^# fail [1-9]/m.test(t)&&!/SyntaxError|ERR_MODULE_NOT_FOUND|CDP timeout/.test(t);
const commandLogs=receipt=>{const r=JSON.parse(readFileSync(receipt,'utf8'));const dir=receipt.replace(/[^\\/]+$/,'');return r.commands.filter(c=>c.log).map(c=>readFileSync(join(dir,c.log),'utf8'));};
const tokenInLogs=(receipt,token)=>commandLogs(receipt).some(t=>t.includes(token)&&failedRun(t));
const timeoutInLogs=receipt=>commandLogs(receipt).some(t=>/timed out|CDP timeout/i.test(t));
// A surviving mutant is recorded, restored and followed by a green run; it never stops the restore.
const from=process.argv[3]??null;let started=from===null,survived=[];
for(const m of muts){
  if(!started){if(m.label!==from)continue;started=true;}
  const p=join(tree,m.file),src=readFileSync(p,'utf8');if(src.split(m.old).length!==2){say(slot+' '+m.label+' ANCHOR NOT UNIQUE');process.exit(1);}
  const before=sha(readFileSync(p));writeFileSync(p,src.replace(m.old,m.new));say(slot+' '+m.label+' mutated '+m.file+': '+m.why+' (mutated sha '+sha(readFileSync(p))+')');
  const red=gate(m.mode,false);
  let killed=m.mode.startsWith('red-')?red.rc===0:m.mode==='check'?red.rc!==0&&String(red.line).includes(m.token):red.rc!==0&&red.receipt&&tokenInLogs(red.receipt,m.token);
  if(m.noTimeout&&red.receipt){const t=timeoutInLogs(red.receipt);say(slot+' '+m.label+' timeout in logs='+t);if(t)killed=false;}
  say(slot+' '+m.label+(killed?' KILLED':' SURVIVED')+' (expected '+m.token+')');if(!killed)survived.push(m.label);
  const g=spawnSync('git',['-c','core.hooksPath=NUL','checkout','--',m.file],{cwd:tree});
  const after=sha(readFileSync(p)),ok=g.status===0&&after===before;say(slot+' '+m.label+' restored exact bytes='+ok+' sha '+after);if(!ok)process.exit(1);
  if(gate('test',false).rc!==0)process.exit(1);
}
say(slot+' survived: '+(survived.join(',')||'none'));
gate('test',true);
