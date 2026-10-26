// Controller receipt audit for wave 3 submissions. Read-only on the worker trees.
// Usage: node scripts/acceptance/w3-receipt-audit.mjs WATER-W3-F2 [WATER-W3-F1]  > audit.json
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {join,relative,sep} from 'node:path';

const controller=process.cwd(),manifest=JSON.parse(readFileSync(join(controller,'docs/dispatch/wave3/manifest.json'),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=(cwd,args,enc='utf8')=>{const r=spawnSync('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...args],{cwd,encoding:enc,windowsHide:true,maxBuffer:256*1024*1024});assert.equal(r.status,0,String(r.stderr));return enc?r.stdout.trim():r.stdout;};
const walk=d=>existsSync(d)?readdirSync(d).flatMap(n=>{const p=join(d,n);return statSync(p).isDirectory()?walk(p):[p];}):[];

function audit(id){
  const t=manifest.tasks.find(t=>t.id===id);assert(t,'Unknown task '+id);const root=t.worktree,out={task:id,problems:[]};
  const bad=m=>out.problems.push(m);
  out.branch=git(root,['branch','--show-current']);if(out.branch!==t.branch)bad('branch '+out.branch);
  out.head=git(root,['rev-parse','HEAD']);if(git(root,['status','--porcelain','--untracked-files=all'])!=='')bad('worker tree dirty');
  if(spawnSync('git',['merge-base','--is-ancestor',t.baseCommit,'HEAD'],{cwd:root}).status!==0)bad('base is not an ancestor');
  for(const a of t.addenda??[])if(spawnSync('git',['merge-base','--is-ancestor',a.resumeFromCommit,'HEAD'],{cwd:root}).status!==0)bad('addendum resume commit is not an ancestor '+a.id);
  const inScope=p=>t.allowedFiles.includes(p)||t.allowedPrefixes.some(q=>p.startsWith(q));
  out.changedPaths=git(root,['diff','--no-renames','--name-only',t.baseCommit,'HEAD']).split('\n').filter(Boolean);
  for(const p of out.changedPaths)if(!inScope(p))bad('out of scope '+p);
  for(const f of [...(manifest.frozenFiles??[]),...(t.frozenFiles??[])])if(hash(readFileSync(join(root,f.path)))!==f.sha256)bad('frozen changed '+f.path);
  const ev=join(root,t.evidenceDir),rdir=join(ev,'receipts');
  const receipts=readdirSync(rdir).filter(n=>n.endsWith('-result.json')).sort().map(file=>({file,r:JSON.parse(readFileSync(join(rdir,file),'utf8'))}));
  out.receiptCount=receipts.length;out.final={};
  out.budget={nativeWindows:receipts.reduce((s,x)=>s+(x.r.nativeWindows??0),0),directoryDialogs:receipts.reduce((s,x)=>s+(x.r.directoryDialogs??0),0),nativeRuns:receipts.filter(x=>x.r.mode==='native').length};
  if(out.budget.directoryDialogs!==0)bad('directory dialogs used');
  if(t.kind==='host'&&(out.budget.nativeWindows!==1||out.budget.nativeRuns!==1))bad('native window budget '+JSON.stringify(out.budget));
  if(t.kind!=='host'&&out.budget.nativeWindows!==0)bad('service task opened windows');
  for(const mode of t.expectedFinalModes){const f=receipts.filter(x=>x.r.mode===mode&&x.r.finalGate&&x.r.status==='passed').at(-1);if(!f){bad('no passed final '+mode);continue;}
    const r=f.r;out.final[mode]={file:f.file,head:r.before?.head,productionHash:r.sourceState?.productionHash,testHash:r.sourceState?.testHash};
    if(r.before?.head!==r.after?.head||r.before?.status!==''||r.after?.status!=='')bad('final '+mode+' not clean/stable');
    if(r.sourceState)for(const s of r.sourceState.files){const b=spawnSync('git',['show',r.before.head+':'+s.path],{cwd:root,maxBuffer:64*1024*1024});if(b.status!==0||hash(b.stdout)!==s.sha256)bad('final '+mode+' source differs from commit: '+s.path);}
  }
  const heads=[...new Set(Object.values(out.final).map(x=>x.head))];out.implementationCommit=heads.length===1?heads[0]:null;if(heads.length!==1)bad('final heads differ '+heads.join(','));
  if(new Set(Object.values(out.final).map(x=>x.productionHash)).size!==1)bad('final production hashes differ');
  if(out.implementationCommit){out.afterImplementation=git(root,['diff','--no-renames','--name-only',out.implementationCommit,'HEAD']).split('\n').filter(Boolean);for(const p of out.afterImplementation)if(!(p===t.report||p.startsWith(t.evidenceDir)))bad('non-evidence change after implementation '+p);}
  const ft=out.final.test&&receipts.find(x=>x.file===out.final.test.file).r;
  if(ft){out.proofAudit=ft.proofAudit;const labels=(ft.proofAudit??[]).map(p=>p.label).sort();if(JSON.stringify(labels)!==JSON.stringify(Object.keys(t.proofTargets??{}).sort()))bad('proof labels '+labels);
    for(const p of ft.proofAudit??[]){const red=receipts.find(x=>x.file===p.red),green=receipts.find(x=>x.file===p.restored);if(!red||!red.r.observedExpectedFailure||red.r.expectation?.target!==t.proofTargets[p.label])bad('red receipt missing or wrong target '+p.label);if(!green||green.r.status!=='passed'||green.r.sourceState?.productionHash!==ft.sourceState?.productionHash)bad('restore receipt missing or not restored '+p.label);}}
  const idx=JSON.parse(readFileSync(join(ev,'ARCHIVE.json'),'utf8'));let bytes=0;const listed=new Set();
  for(const e of idx.entries){listed.add(e.archive);const p=join(root,e.archive);if(!existsSync(p)){bad('archived file missing '+e.archive);continue;}const b=readFileSync(p);bytes+=b.length;if(b.length!==e.bytes||hash(b)!==e.sha256)bad('archive bytes differ '+e.archive);}
  out.archive={entries:idx.entries.length,bytes};
  out.unlisted=walk(ev).map(p=>relative(root,p).split(sep).join('/')).filter(p=>!listed.has(p)&&!/\/(ARCHIVE\.json|\.gitattributes)$/.test(p));
  const fn=out.final.native&&receipts.find(x=>x.file===out.final.native.file).r;
  if(fn){const n=fn.native??{},shot=join(rdir,n.screenshot??'-');
    out.native={title:n.title,systemWindows:n.systemWindows,rawWindows:n.rawWindows,eventTargets:n.eventTargets,pageAccepted:n.pageAccepted,backdropType:n.backdropType,exitCode:n.exitCode,children:(n.children??[]).length,remaining:fn.childClose?.remaining,privateWebviewObserved:n.privateWebviewObserved,wallMs:fn.nativeWallMs,screenshot:t.evidenceDir+'receipts/'+n.screenshot};
    if(n.title!=='Water'||n.systemWindows!==1||!n.pageAccepted||n.backdropType!==2||n.exitCode!==0||n.error!==null||!n.privateWebviewObserved)bad('native observation '+JSON.stringify(out.native));
    if(!Array.isArray(fn.childClose?.remaining)||fn.childClose.remaining.length!==0)bad('webview children not closed');
    if(!existsSync(shot)||hash(readFileSync(shot))!==fn.screenshotSha256)bad('screenshot not archived');}
  const fr=out.final.real&&receipts.find(x=>x.file===out.final.real.file).r;if(fr)out.realSummary=fr.realSummary;
  return out;
}
console.log(JSON.stringify(process.argv.slice(2).map(audit),null,2));
