// Controller isolated integration of AD report behavior and AE research only.
// No Cargo, dependency fetch, native dialog, physical fixture or real user data.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
const controller=resolve('.'),root=join(controller,'.worktrees/integration-adae-20261024'),out=join(controller,'.local/checks/controller-adae-20261024');mkdirSync(out,{recursive:true});
const mode=process.argv[2];assert(['prepare','check','negative'].includes(mode));assert.equal(process.argv.length,3);
const hash=b=>createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(readFileSync(p));
const stamp=new Date().toISOString().replaceAll(':','-')+'-'+process.pid,record={mode,root,startedAt:new Date().toISOString(),systemNativeDialogs:0,directoryDialogs:0,physicalFixtureAccess:false,excludedAAPixelsRead:false,commands:[]};
const env={...process.env,GIT_OPTIONAL_LOCKS:'0'};for(const k of Object.keys(env))if(/^(?:NODE_OPTIONS$|NODE_PATH$|WATER_|CARGO_|RUST)/i.test(k))delete env[k];
function command(binary,argv,timeout=180000,expected=0){const r=spawnSync(binary,argv,{cwd:root,env,encoding:null,shell:false,windowsHide:true,timeout,maxBuffer:32*1024*1024});const name=stamp+'-'+mode+'-'+record.commands.length,item={binary,argv,exitCode:r.status,error:r.error?.code??null,stdout:name+'-stdout.log',stderr:name+'-stderr.log'};for(const[k,b]of[['stdout',r.stdout],['stderr',r.stderr]])writeFileSync(join(out,item[k]),b??Buffer.alloc(0),{flag:'wx'});record.commands.push(item);assert(!r.error&&r.status===expected,JSON.stringify(item));return r.stdout.toString('utf8');}
const git=args=>command('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false','-c','maintenance.auto=false','-c','gc.auto=0','-c','user.name=Riku Toto','-c','user.email=usr_40dd3b2f69f149f6afc972157278189d@noreply.mirasim.ai',...args],30000).trim();
function tests(text,names,passed=true){assert.deepEqual([...text.matchAll(/^# Subtest: (.+)\r?$/gm)].map(m=>m[1]).sort(),names.slice().sort());for(const k of['skipped','cancelled','todo'])assert(new RegExp('^# '+k+' 0\\r?$','m').test(text));if(passed){assert(text.includes('# pass '+names.length));assert(text.includes('# fail 0'));}}
const manifest=json('docs/dispatch/wave1/manifest.json'),ad=manifest.tasks.find(t=>t.id==='WATER-W1-AD'),ae=manifest.tasks.find(t=>t.id==='WATER-W1-AE');
function sourceState(){return Object.fromEntries([...ad.productionFiles,...ad.testFiles,...ae.productionFiles].map(p=>[p,hash(readFileSync(join(root,p)))]));}
try{
 assert.equal(git(['branch','--show-current']),'controller/water-w1-adae-integration-20261024');assert.equal(git(['status','--porcelain','--untracked-files=all']),'');record.before=git(['rev-parse','HEAD']);
 if(mode==='prepare'){
  assert.equal(record.before,'7d8e1dbb541c3c3d416984c179e5149165c72b71');
  const originals=['3ad5e7003d9e9720e85113a47d558738bf06231d','753c8018fd7e8effd423db86495079fdc8cd0d08','3182286f8c2df25ed940f8f0dc8a71507bb24a4e','07ae41c18459dd2450622944466c20a80856e456'];record.imported=[];
  for(const sha of originals){git(['cherry-pick',sha]);record.imported.push({original:sha,integrated:git(['rev-parse','HEAD'])});}
  for(const task of[ad,ae]){const tree=resolve(task.worktree),a=json(join(tree,'docs/acceptance/wave1',task.slot,'ARCHIVE.json'));for(const f of a.entries??a.files)assert.deepEqual(readFileSync(join(root,f.archive)),readFileSync(join(tree,f.archive)),f.archive);for(const p of [...task.productionFiles,...task.testFiles])assert.deepEqual(readFileSync(join(root,p)),readFileSync(join(tree,p)),p);}
  record.allWorkerProductAndArchiveBytesPreserved=true;
 }else{
  const prepared=readdirSync(out).filter(n=>n.endsWith('-prepare-result.json')).map(n=>json(join(out,n))).find(r=>r.status==='passed');assert(prepared);assert.equal(record.before,prepared.after);record.sourceBefore=sourceState();
  if(mode==='check'){
   for(const p of [...ad.productionFiles,...ad.testFiles].filter(p=>p.endsWith('.mjs')))command(process.execPath,['--check',p],30000);
   assert(!existsSync(join(root,ad.outputRoot,'package.json')));
   const unit=command(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap',...ad.unitTestFiles]);tests(unit,ad.expectedTests);record.unitTests='5/5';
   const browser=command(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap',...ad.browserTestFiles]);tests(browser,ad.expectedBrowserTests);record.browserTests='3/3';
   const dirs=[...browser.matchAll(/"directory":"([^"]*project-report-[^"]*)"/g)].map(m=>m[1].replaceAll('\\\\','\\'));assert.equal(dirs.length,1);record.projectReportBrowserDirectory=dirs[0];assert(!relative(root,dirs[0]).startsWith('..'));const close=json(join(dirs[0],'close.json'));assert.equal(close.downloads.length,8);assert.equal(close.portsClosed,true);record.downloads=close.downloads;record.portsClosed=close.portsClosed;
   const base=join(root,ae.outputRoot),s=json(join(base,'SOURCES.json')),g=json(join(base,'GAP-MATRIX.json')),plan=readFileSync(join(base,'ACCEPTANCE-PLAN.md'),'utf8');assert.equal(s.version,'water.macos-sources.v1');assert.equal(s.research_only,true);assert.equal(s.real_macos_executed,false);assert.equal(g.implemented,false);assert.equal(g.real_macos_executed,false);assert.deepEqual(g.entries.map(e=>e.component).sort(),['N','P','R','S','Z','AA','desktop'].sort());
   const ids=new Map(s.sources.map(x=>[x.id,x]));assert.equal(ids.size,s.sources.length);const refs=new Map();let cases=0;
   for(const x of s.sources){assert(['read','unavailable'].includes(x.access));if(x.access==='read'){assert(x.evidence);const b=readFileSync(join(root,x.evidence.path));assert.equal(b.length,x.evidence.bytes);assert.equal(hash(b),x.evidence.sha256);}}
   for(const e of g.entries){assert.equal(e.macos_status,'not_implemented_not_tested');assert(e.unresolved_questions.length>0);for(const id of e.source_ids)assert.equal(ids.get(id)?.access,'read');assert(e.acceptance_cases.length>=2);for(const c of e.acceptance_cases){assert.equal(c.execution,'planned_not_executed');assert(plan.includes(c.name));cases++;}for(const f of e.current_sources){const b=readFileSync(join(root,f.path));assert.equal(hash(b),f.sha256);assert.equal(b.length,f.bytes);assert.deepEqual(b,readFileSync(join(root,f.archive)));for(const[start,end]of f.line_ranges)assert(start>=1&&end>=start&&end<=b.toString('utf8').split('\n').length);assert.equal(git(['rev-parse',f.commit+':'+f.path]),git(['hash-object','--path='+f.path,f.path]));refs.set(f.path,f);}}
   assert.equal(refs.size,15);assert.equal(s.sources.filter(x=>x.access==='read').length,14);assert.equal(s.sources.filter(x=>x.access==='unavailable').length,7);record.ae={documentChecks:ae.expectedTests,components:g.entries.length,readSources:14,unavailableSources:7,fixedCurrentSourceFiles:refs.size,matrixAcceptanceCases:cases,realMacOSExecuted:false,productTestsRun:false};
  }else{
   record.negatives=[];for(const[label,file,snapshot,target]of[
    ['nc1','transport.mjs','2026-10-23T11-43-58.207Z-22916-red-nc1-source-3.txt','AD_REPORT_BINDING'],
    ['nc2','server.mjs','2026-10-23T11-47-04.437Z-11824-red-nc2-source-2.txt','AD_REPORT_CONSENT'],
   ]){const p=join(root,'prototypes/project-workspace',file),good=readFileSync(p),bad=readFileSync(join(controller,'.worktrees/ad/docs/acceptance/wave1/ad/raw/delivery-checks',snapshot));assert.notEqual(hash(bad),hash(good));writeFileSync(join(out,stamp+'-'+label+'-good-source.txt'),good,{flag:'wx'});writeFileSync(join(out,stamp+'-'+label+'-bad-source.txt'),bad,{flag:'wx'});
    try{writeFileSync(p,bad);const red=command(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap',...ad.unitTestFiles],180000,1);tests(red,ad.expectedTests,false);assert(red.includes(target));assert(!/SyntaxError|ERR_MODULE_NOT_FOUND|timed out|result transition/.test(red));}
    finally{writeFileSync(p,good);assert.equal(hash(readFileSync(p)),hash(good));}
    const green=command(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap',...ad.unitTestFiles]);tests(green,ad.expectedTests);assert.deepEqual(sourceState(),record.sourceBefore);record.negatives.push({label,target,goodSha256:hash(good),badSha256:hash(bad),exactBytesRestored:true,allFiveRestoredTestsPass:true});
   }
  }
  assert.deepEqual(sourceState(),record.sourceBefore);
 }
 record.after=git(['rev-parse','HEAD']);if(mode!=='prepare')assert.equal(record.after,record.before);assert.equal(git(['status','--porcelain','--untracked-files=all']),'');record.status='passed';
}catch(e){record.status='failed';record.error=e.stack;process.exitCode=1;}
record.endedAt=new Date().toISOString();const receipt=join(out,stamp+'-'+mode+'-result.json');writeFileSync(receipt,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...record,commands:record.commands.length,sourceBefore:record.sourceBefore?Object.keys(record.sourceBefore).length:undefined,receipt}));
