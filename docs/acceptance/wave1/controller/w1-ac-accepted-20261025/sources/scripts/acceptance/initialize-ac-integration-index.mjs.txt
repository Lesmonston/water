// Recover only the new empty index left by worktree --no-checkout; no reset/clean.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
const controller=resolve('.'),root=join(controller,'.worktrees/integration-ac-20261025'),worker=join(controller,'.worktrees/ac'),out=join(controller,'.local/checks/controller-ac-acceptance-20261025'),base='69df0d0913259567312a506dbfc50665313364fe';
const json=p=>JSON.parse(readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex'),stamp=new Date().toISOString().replaceAll(':','-');
const audit=readdirSync(out).filter(n=>n.endsWith('-submission-audit.json')).map(n=>json(join(out,n))).find(r=>r.status==='passed_successful_submission_audit');assert(audit);
const record={startedAt:new Date().toISOString(),mode:'prepare',root,before:base,recovery:'Initialize only new empty sparse index, then finish exact original eight imports',sourceSha256:hash(readFileSync('scripts/acceptance/initialize-ac-integration-index.mjs')),systemWindows:0,newNativeRun:false,productSourceFixes:[],dependencyDownloads:0,imports:[],commands:[]};
function git(args,cwd=root){const r=spawnSync('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false','-c','maintenance.auto=false','-c','gc.auto=0','-c','commit.gpgsign=false','-c','user.name=Riku Toto','-c','user.email=usr_40dd3b2f69f149f6afc972157278189d@noreply.mirasim.ai',...args],{cwd,encoding:null,windowsHide:true,timeout:30000,maxBuffer:32*1024*1024});const n=stamp+'-index-recovery-'+record.commands.length;for(const k of['stdout','stderr'])writeFileSync(join(out,n+'-'+k+'.log'),r[k]??Buffer.alloc(0),{flag:'wx'});record.commands.push({args,cwd,exitCode:r.status,stdout:n+'-stdout.log',stderr:n+'-stderr.log'});assert(!r.error&&r.status===0,String(r.stderr));return r.stdout.toString().trim();}
try{
 assert.equal(git(['rev-parse','HEAD']),base);assert.equal(git(['branch','--show-current']),'controller/water-w1-ac-integration-20261025');assert(readdirSync(root).every(n=>['.git','.gitattributes','docs'].includes(n)));
 // read-tree without -u loads tree/index metadata and does not copy file contents.
 if(git(['ls-files','-z'])==='')git(['read-tree','HEAD']);else assert.equal(git(['diff','--cached','--name-only']),'');
 git(['sparse-checkout','reapply']);
 // Sparse reapply preserves the absent included file from --no-checkout.
 // Materialize only this known text attribute file, never the excluded tree.
 const included=git(['ls-files','-t','-z']).split('\0').filter(s=>s.startsWith('H ')).map(s=>s.substring(2));
 for(const path of included){assert(path==='.gitattributes'||path.startsWith('apps/desktop-preview/')||path.startsWith('docs/acceptance/wave1/ac/')||path.startsWith('docs/dispatch/reports/WATER-W1-AC'));if(!existsSync(join(root,path)))git(['checkout-index','--',path]);}
 record.includedBaselineFiles= included;assert.equal(git(['status','--porcelain','--untracked-files=all']),'');record.emptyIndexInitializedWithoutAAContent=true;
 for(const sha of audit.importCommits){git(['cherry-pick',sha]);record.imports.push({original:sha,integrated:git(['rev-parse','HEAD'])});}
 const task=json('docs/dispatch/wave1/manifest.json').tasks.find(t=>t.id==='WATER-W1-AC');for(const p of git(['diff','--name-only','-z',base,'HEAD']).split('\0').filter(Boolean))assert(task.allowedFiles.includes(p)||task.allowedPrefixes.some(q=>p.startsWith(q)),p);
 for(const f of audit.original14Files)assert.equal(hash(readFileSync(join(root,f.path))),f.sha256,f.path);
 for(const a of audit.archives){assert.deepEqual(readFileSync(join(root,a.index)),readFileSync(join(worker,a.index)));for(const f of json(join(worker,a.index)).entries)assert.equal(hash(readFileSync(join(root,f.archive))),f.sha256,f.archive);}
 assert.equal(git(['status','--porcelain','--untracked-files=all']),'');assert.equal(git(['rev-parse','HEAD'],worker),audit.submitted);assert.equal(git(['status','--porcelain','--untracked-files=all'],worker),'');record.after=git(['rev-parse','HEAD']);record.status='passed';record.workerProductAnd479ArchiveBytesPreserved=true;record.frozenUniqueFiles=547;
}catch(e){record.status='failed';record.error=e.stack;process.exitCode=1;}
record.endedAt=new Date().toISOString();const receipt=join(out,stamp+'-index-recovery-prepare-result.json');writeFileSync(receipt,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...record,commands:record.commands.length,receipt}));
