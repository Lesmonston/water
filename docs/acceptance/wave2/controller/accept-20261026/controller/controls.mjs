// Controller negative controls in an acceptance tree: mutate, red, exact restore, green, then test --final.
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
const slot=process.argv[2],ctl='F:/new/smaltalk/water',muts=JSON.parse(readFileSync(ctl+'/.local/w2-accept/mutations.json','utf8'))[process.argv[3]??slot];
const tree=slot==='d2'?ctl+'/.local/w2-accept/d-tree/.worktrees/w2-d':ctl+'/.worktrees/accept-w2-'+slot,id='WATER-W2-ACCEPT-'+slot.toUpperCase(),log=ctl+'/.local/w2-accept/logs/'+slot+'-controls.txt';
const env={...process.env,WATER_W2_SELFTEST_MANIFEST:ctl+'/.local/w2-accept/manifest.json'};
const say=s=>{appendFileSync(log,s+'\n');console.log(s);};
const gate=(mode,fin)=>{const r=spawnSync(process.execPath,[ctl+'/scripts/checkup-wave-check.mjs','--task',id,'--mode',mode,...(fin?['--final']:[])],{cwd:tree,env,encoding:'utf8',windowsHide:true});const line=r.stdout.trim().split('\n').at(-1);say(slot+' '+mode+(fin?' --final':'')+' rc='+r.status+' '+line);return r.status===0;};
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const m of muts){
  const p=join(tree,m.file),src=readFileSync(p,'utf8');if(src.split(m.old).length!==2){say(slot+' '+m.label+' ANCHOR NOT UNIQUE');process.exit(1);}
  writeFileSync(p,src.replace(m.old,m.new));say(slot+' '+m.label+' mutated '+m.file+': '+m.why+' (mutated sha '+sha(readFileSync(p))+')');
  gate('red-'+m.label,false);
  const g=spawnSync('git',['-c','core.hooksPath=NUL','checkout','--',m.file],{cwd:tree});const head=spawnSync('git',['show','HEAD:'+m.file],{cwd:tree,maxBuffer:64*1024*1024}).stdout;
  const ok=g.status===0&&sha(readFileSync(p))===sha(head);say(slot+' '+m.label+' restored exact bytes='+ok+' sha '+sha(readFileSync(p)));if(!ok)process.exit(1);
  gate('test',false);
}
gate('test',true);
