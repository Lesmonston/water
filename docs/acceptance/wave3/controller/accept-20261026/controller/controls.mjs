// Controller negative controls in a wave 3 acceptance tree: mutate, red with token, exact restore, green; then test --final.
// Usage: node .local/w3-accept/controls.mjs <slot>
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
const slot=process.argv[2],ctl='F:/new/smaltalk/water',muts=JSON.parse(readFileSync(ctl+'/.local/w3-accept/mutations.json','utf8'))[slot];
const tree=ctl+'/.worktrees/accept-w3-'+slot,id='WATER-W3-ACCEPT-'+slot.toUpperCase(),logs=ctl+'/.local/w3-accept/logs',log=logs+'/'+slot+'-controls.txt';
mkdirSync(logs,{recursive:true});
const env={...process.env,WATER_W3_OVERRIDE_MANIFEST:ctl+'/.local/w3-accept/manifest.json'};
const say=s=>{appendFileSync(log,s+'\n');console.log(s);};
const sha=b=>createHash('sha256').update(b).digest('hex');
const gate=(mode,fin)=>{const r=spawnSync(process.execPath,[ctl+'/scripts/desktop-wave-check.mjs','--task',id,'--mode',mode,...(fin?['--final']:[])],{cwd:tree,env,encoding:'utf8',windowsHide:true,timeout:900000});const line=r.stdout.trim().split('\n').at(-1);say(slot+' '+mode+(fin?' --final':'')+' rc='+r.status+' '+line);let receipt=null;try{receipt=JSON.parse(line).receipt;}catch{}return {rc:r.status,receipt};};
// For plain test-mode controls, the red must be a real assertion failure carrying the token, not a build error.
const tokenInLogs=(receipt,token)=>{const r=JSON.parse(readFileSync(receipt,'utf8'));const dir=receipt.replace(/[^\\/]+$/,'');return r.commands.filter(c=>c.log).some(c=>{const t=readFileSync(join(dir,c.log),'utf8');return t.includes(token)&&/test result: FAILED/.test(t)&&!/error\[E\d+\]/.test(t);});};
// A surviving mutant is recorded, restored and followed by a green run; it never stops the restore.
const from=process.argv[3]??null;let started=from===null,survived=[];
for(const m of muts){
  if(!started){if(m.label!==from)continue;started=true;}
  const p=join(tree,m.file),src=readFileSync(p,'utf8');if(src.split(m.old).length!==2){say(slot+' '+m.label+' ANCHOR NOT UNIQUE');process.exit(1);}
  const before=sha(readFileSync(p));writeFileSync(p,src.replace(m.old,m.new));say(slot+' '+m.label+' mutated '+m.file+': '+m.why+' (mutated sha '+sha(readFileSync(p))+')');
  const red=gate(m.mode,false);
  const killed=m.mode==='test'?red.rc!==0&&red.receipt&&tokenInLogs(red.receipt,m.token):red.rc===0;
  say(slot+' '+m.label+(killed?' KILLED':' SURVIVED')+' (expected '+m.token+')');if(!killed)survived.push(m.label);
  const g=spawnSync('git',['-c','core.hooksPath=NUL','checkout','--',m.file],{cwd:tree});const head=spawnSync('git',['show','HEAD:'+m.file],{cwd:tree,maxBuffer:64*1024*1024}).stdout;
  const after=sha(readFileSync(p)),ok=g.status===0&&after===sha(head)&&after===before;say(slot+' '+m.label+' restored exact bytes='+ok+' sha '+after);if(!ok)process.exit(1);
  if(gate('test',false).rc!==0)process.exit(1);
}
say(slot+' survived: '+(survived.join(',')||'none'));
gate('test',true);
