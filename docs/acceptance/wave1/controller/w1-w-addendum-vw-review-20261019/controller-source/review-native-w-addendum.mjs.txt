// Independent controller checks in a private tree. Memory/loopback/headless only.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Readable} from 'node:stream';
import {budgetProbe} from './native-review-budget-probe.mjs';

const root=resolve('.'), tree=join(root,'.worktrees/review-w-addendum-20261019');
const submitted='df9255b73e1037eda7599098de900bb4705f5921';
const out=join(root,'.local/checks/controller-w-addendum-20261019');mkdirSync(out,{recursive:true});
const stamp=new Date().toISOString().replaceAll(':','-')+'-'+process.pid;
const independentOnly=process.argv[2]==='--independent-only';
assert.equal(process.argv.length,independentOnly?3:2);
const env={...process.env,GIT_OPTIONAL_LOCKS:'0'};
for(const k of Object.keys(env)) if(/^(?:NODE_OPTIONS$|NODE_PATH$|WATER_)/i.test(k)) delete env[k];
const hash=b=>createHash('sha256').update(b).digest('hex');
const result={startedAt:new Date().toISOString(),tree,submitted,systemNativeDialogsLaunched:0,physicalFixtureAccess:false,commands:[]};
let seq=0;
function command(binary,argv,expected=0,timeout=30000) {
  const r=spawnSync(binary,argv,{cwd:tree,env,encoding:'utf8',windowsHide:true,shell:false,timeout,maxBuffer:32*1024*1024});
  const item={binary,argv,exitCode:r.status,error:r.error?.code??null,log:stamp+'-'+(++seq)+'.log'};
  writeFileSync(join(out,item.log),JSON.stringify(item)+'\n--- stdout ---\n'+(r.stdout??'')+'\n--- stderr ---\n'+(r.stderr??''),{flag:'wx'});
  result.commands.push(item);assert(!r.error,item.log);assert.equal(r.status,expected,item.log);return r.stdout;
}
const git=args=>command('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...args]).trim();
try {
  assert.equal(git(['rev-parse','HEAD']),submitted);assert.equal(git(['status','--porcelain','--untracked-files=all']),'');
  const model=join(tree,'prototypes/native-review/model.mjs'), original=readFileSync(model);
  if(!independentOnly) {
  const guard='    if (count > limits.max_dir_entries) fail();';assert.equal(original.toString().split(guard).length,2);
  writeFileSync(join(out,stamp+'-good-model.txt'),original,{flag:'wx'});
  const bad=Buffer.from(original.toString().replace(guard,'    // Controller temporary negative: reject guard disabled.'));
  writeFileSync(join(out,stamp+'-bad-model.txt'),bad,{flag:'wx'});
  try {
    writeFileSync(model,bad);
    const red=JSON.parse(command(process.execPath,[join(root,'scripts/acceptance/native-review-budget-probe.mjs')],1));
    assert.equal(red.failures.length,12);assert(red.failures.every(f=>f.startsWith('W_DIR_BUDGET:')));
    result.independentBudgetRed={observations:red.observations.length,acceptedContradictions:red.failures.length,badModelSha256:hash(bad)};
  } finally {writeFileSync(model,original);assert.equal(hash(readFileSync(model)),hash(original));}
  for(const f of ['model.mjs','app.mjs','server.mjs','host.mjs','launch.mjs','tests/model.test.mjs','tests/browser.test.mjs']) command(process.execPath,['--check','prototypes/native-review/'+f]);
  const suite=command(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap','prototypes/native-review/tests/model.test.mjs','prototypes/native-review/tests/browser.test.mjs'],0,180000);
  const task=JSON.parse(readFileSync('docs/dispatch/wave1/manifest.json')).tasks.find(t=>t.id==='WATER-W1-W');
  assert.deepEqual([...suite.matchAll(/^# Subtest: (.+)\r?$/gm)].map(m=>m[1]).sort(),[...task.expectedTests,...task.expectedBrowserTests].sort());
  for(const text of ['# tests 5','# pass 5','# fail 0','# skipped 0','# cancelled 0']) assert(suite.includes(text));
  result.originalFiveTests='passed';
  result.budgetProbe=await budgetProbe(tree);assert.equal(result.budgetProbe.failures.length,0);
  } else {
    const prior=join(out,'2026-10-19T07-15-27.391Z-9368-independent-review.json');
    const r=JSON.parse(readFileSync(prior));assert.equal(r.submitted,submitted);
    assert.equal(r.originalFiveTests,'passed');assert.equal(r.budgetProbe.failures.length,0);
    result.priorSuiteReceipt=prior;result.originalFiveTests='passed in prior receipt, unchanged product bytes';
  }
  const {assertReviewInput}=await import(pathToFileURL(model));
  const {readSession,startFromStream}=await import(pathToFileURL(join(tree,'prototypes/native-review/host.mjs')));
  const {startServer}=await import(pathToFileURL(join(tree,'prototypes/native-review/server.mjs')));
  const cases=JSON.parse(readFileSync(join(tree,'contracts/native-session-v1/cases.json'))).cases;
  // Construct semantic reports independently; expected outcomes below are explicit.
  function make(name,paths,limit,status='completed') {
    const b=structuredClone(cases[1].bundle),s=b.snapshots[0],v=s.view,q=JSON.parse(s.redacted_json);
    b.session_id=v.scan_id='controller-'+name;b.policy.limits.max_dir_entries=limit;b.policy.limits.max_entries=10000;
    const sample=v.findings[0],qs=q.findings[0];
    v.status=status;v.scopes[0].coverage=status==='completed'?'complete':status;
    v.findings=paths.map((p,i)=>{
      const f=structuredClone(sample),directory=paths.some(other=>other.startsWith(p+'/'));
      f.id='entry-'+(i+1);f.title=f.relative_path=p;f.logical_bytes=directory?null:'3';
      f.size={logical_bytes:f.logical_bytes,allocated_bytes:null,reclaimable_lower_bytes:null,reclaimable_upper_bytes:null,method:directory?'unknown':'logical_sum',confidence:directory?'unknown':'measured',shared:'unknown'};
      f.protection_reasons=['unknown_ownership','incomplete_evidence',...(directory?['protected_descendant']:[])];return f;
    });
    v.issues=[];v.totals={logical_bytes:null,allocated_bytes:null,method:'unavailable',coverage_complete:status==='completed',scanned_entries:paths.length,skipped_entries:0};
    s.summary.status=status;s.summary.counts={scopes:1,findings:paths.length,issues:0};
    for(const k of Object.keys(s.summary.risk_counts)) s.summary.risk_counts[k]=k==='protected'?paths.length:0;
    for(const k of Object.keys(s.summary.category_counts)) s.summary.category_counts[k]=k==='unknown'?paths.length:0;
    s.summary.totals=structuredClone(v.totals);q.summary=structuredClone(s.summary);q.scopes[0].coverage=v.scopes[0].coverage;
    q.findings=v.findings.map((f,i)=>({...structuredClone(qs),finding_ref:'finding-'+(i+1),protection_reasons:f.protection_reasons,size:f.size}));
    q.issues=[];s.redacted_json=JSON.stringify(q);return b;
  }
  const pairs=['a','a/one','a/two','ab','ab/one','ab/two'];
  const nested=['a','a/b','a/b/one','a/b/two','z','z/one','z/two'];
  const variants=[
    ['cross-prefix',pairs,2,true],['cross-prefix-reverse',[...pairs].reverse(),2,true],
    ['deep-independent',nested,2,true],['deep-over',[...nested,'a/b/three'],2,false],
    ['deep-equal',[...nested,'a/b/three'],3,true],['nonroot-over',[...pairs,'ab/three'],2,false],
    ['all-status-partial',[...pairs,'a/three'],2,false,'partial'],['all-status-cancelled',[...pairs,'a/three'],2,false,'cancelled'],
    ['map-keys',['__proto__','__proto__/one','__proto__/two','constructor','constructor/one','constructor/two'],2,true],
    ['unicode',['資料','資料/一','資料/二','別','別/一','別/二'],2,true],
    ['chain',['a','a/b','a/b/c'],1,true],['chain-over',['a','a/b','a/b/c','a/b/d'],1,false],
    ['maximum-equal',Array.from({length:256},(_,i)=>'f'+i),256,true],
    ['maximum-over',Array.from({length:257},(_,i)=>'f'+i),256,false],
  ];
  result.independentExamples=[];
  for(const [name,paths,limit,accepted,status] of variants) {
    const b=make(name,paths,limit,status),before=structuredClone(b),bytes=Buffer.from(JSON.stringify(b));
    writeFileSync(join(out,stamp+'-input-'+name+'.json'),bytes,{flag:'wx'});
    for(const entry of ['model','readSession','startServer','startFromStream']) {
      let server;
      const action=async()=>{
        if(entry==='model') return assertReviewInput(b);
        if(entry==='readSession') return readSession(Readable.from([bytes.subarray(0,19),bytes.subarray(19)]));
        server=await(entry==='startServer'?startServer({bundle:b}):startFromStream({stream:Readable.from([bytes])}));
        const response=await fetch(server.url+'/session.json');assert.equal(response.status,200);assert.deepEqual(await response.json(),before);
        const q=await fetch(server.url+'/exports/1.json');assert.equal(q.status,200);assert.equal(q.headers.get('content-disposition'),'attachment; filename="water-report-1.json"');
        assert.deepEqual(Buffer.from(await q.arrayBuffer()),Buffer.from(b.snapshots[0].redacted_json));
      };
      try {if(accepted) await action();else await assert.rejects(action,{message:'Unsupported native review.'});}
      finally {await server?.close();}
      assert.deepEqual(b,before);result.independentExamples.push({name,entry,accepted});
    }
  }
  result.headlessScreenshots=['native-review-1440x1000.png','native-review-900x800.png','native-review-cancel.png'].map(name=>{
    const source=join(tree,'.local/browser-lab',name),bytes=readFileSync(source),copy=stamp+'-'+name;
    writeFileSync(join(out,copy),bytes,{flag:'wx'});
    assert.deepEqual(bytes,readFileSync(join(root,'.worktrees/w/docs/acceptance/wave1/w/addendum-01/current',name)));
    return{source,copy,bytes:bytes.length,sha256:hash(bytes)};
  });
  assert.equal(git(['status','--porcelain','--untracked-files=all']),'');result.status='passed';
} catch(error) {result.status='failed';result.error=error.stack;process.exitCode=1;}
result.endedAt=new Date().toISOString();const receipt=join(out,stamp+'-independent-review.json');
writeFileSync(receipt,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...result,commands:result.commands.length,independentExamples:result.independentExamples?.length,receipt}));
