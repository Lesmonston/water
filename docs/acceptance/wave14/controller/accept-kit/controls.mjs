// Controller negative controls in a wave 13 acceptance tree: mutate, red with token, exact restore, green after ticket controls; then test --final.
// Usage (repo root): node .local/w14-accept/controls.mjs <j1|s1|r1|u1> [<first label>]
// "red-ncN" mutations are judged by the gate (exit 0 = expected failure with the ticket's token);
// "test"/"browser" mutations must fail the real tests with the token in a command log, never by a build or syntax error.
// A mutation with "noTimeout": true also fails if any command log mentions a timeout (UI no-cascade check).
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
const slot=process.argv[2],ctl='F:/new/smaltalk/water',muts=JSON.parse(readFileSync(ctl+'/.local/w14-accept/mutations.json','utf8'))[slot];
const tree=ctl+'/.worktrees/accept-w14-'+slot,id='WATER-W14-ACCEPT-'+slot.toUpperCase(),logs=ctl+'/.local/w14-accept/logs',log=logs+'/'+slot+'-controls.txt';
const manifest=ctl+'/.local/w14-accept/manifest.json',[script,envName]=slot==='s1'?['desktop-wave-check.mjs','WATER_W3_OVERRIDE_MANIFEST']:['checkup-wave-check.mjs','WATER_W2_SELFTEST_MANIFEST'];
mkdirSync(logs,{recursive:true});
const ui=JSON.parse(readFileSync(manifest,'utf8')).tasks.find(t=>t.id===id)?.kind==='ui';
const env={...process.env,[envName]:manifest};
const say=s=>{appendFileSync(log,s+'\n');console.log(s);};
const sha=b=>createHash('sha256').update(b).digest('hex');
const gate=(mode,fin)=>{const r=spawnSync(process.execPath,[ctl+'/scripts/'+script,'--task',id,'--mode',mode,...(fin?['--final']:[])],{cwd:tree,env,encoding:'utf8',windowsHide:true,timeout:1800000});const line=(r.stdout??'').trim().split('\n').at(-1);say(slot+' '+mode+(fin?' --final':'')+' rc='+r.status+' '+line);let receipt=null;try{receipt=JSON.parse(line).receipt;}catch{}return {rc:r.status,receipt,line};};
// UI slots (kind ui: M6, M11) fail by "# fail N" from node:test; Rust slots by cargo's "test result: FAILED".
const failedRun=t=>!ui?/test result: FAILED/.test(t)&&!/error\[E\d+\]|could not compile/.test(t):/^# fail [1-9]/m.test(t)&&!/SyntaxError|ERR_MODULE_NOT_FOUND|CDP timeout/.test(t);
const commandLogs=receipt=>{const r=JSON.parse(readFileSync(receipt,'utf8'));const dir=receipt.replace(/[^\\/]+$/,'');return r.commands.filter(c=>c.log).map(c=>readFileSync(join(dir,c.log),'utf8'));};
const tokenInLogs=(receipt,token)=>commandLogs(receipt).some(t=>t.includes(token)&&failedRun(t));
// User 11-06: timing-only failures may be rerun (up to 3 times) instead of stopping.
const panics=receipt=>commandLogs(receipt).flatMap(t=>[...t.matchAll(/panicked at [^\r\n]*\r?\n([^\r\n]*)/g)].map(m=>m[1]));
const timingOnly=receipt=>{const p=panics(receipt);return p.length>0&&p.every(x=>/SERVICE_RETURN_BUDGET|took [0-9.]+ ?ms|[0-9.]+ms\s*$/.test(x));};
const green=(fin)=>{let g=gate('test',fin);for(let i=0;i<3&&g.rc!==0&&g.receipt&&timingOnly(g.receipt);i++){say(slot+' test'+(fin?' --final':'')+' timing-only failure, rerun '+(i+1));g=gate('test',fin);}return g;};
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
  // Ticket controls need the immediate green for the final proofAudit; a controller "test" mutation is
  // restored byte-exactly (sha checked above) and covered by the closing test --final.
  if(m.mode.startsWith('red-')&&green(false).rc!==0)process.exit(1);
}
say(slot+' survived: '+(survived.join(',')||'none'));
green(true);
