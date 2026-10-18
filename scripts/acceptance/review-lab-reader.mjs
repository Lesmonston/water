// Controller public API/HTTP checks and exact archived-source negative controls.
// No product changes survive a control; no physical fixtures are used here.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {request} from 'node:http';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),args=process.argv.slice(2);
assert.equal(args[0],'--expected-head');assert.match(args[1],/^[a-f0-9]{40}$/);
const integration=args.includes('--integration'),controls=args.includes('--controls'),addendum=args.includes('--addendum-01');
assert.equal(args.length,2+Number(integration)+Number(controls)+Number(addendum));assert(!controls||integration);
const worker=integration?root:join(root,'.worktrees/k'),output=join(root,'.local/checks',integration?'controller-k-integration':'controller-k-review');
mkdirSync(output,{recursive:true});
const stamp=new Date().toISOString().replaceAll(':','-')+'-'+process.pid;
const hash=b=>createHash('sha256').update(b).digest('hex');
const record={startedAt:new Date().toISOString(),integration,controls,addendum,cases:[],commands:[]};
function command(binary,argv,timeout=30000,expected=0){const r=spawnSync(binary,argv,{cwd:worker,encoding:'utf8',shell:false,windowsHide:true,timeout,maxBuffer:32*1024*1024,env:{...process.env,NODE_OPTIONS:'',NODE_PATH:'',GIT_OPTIONAL_LOCKS:'0'}});const item={binary,argv,exitCode:r.status,error:r.error?.code??null,log:stamp+'-'+record.commands.length+'.log'};record.commands.push(item);writeFileSync(join(output,item.log),JSON.stringify(item)+'\n--- stdout ---\n'+(r.stdout??'')+'\n--- stderr ---\n'+(r.stderr??''),{flag:'wx'});assert(!r.error&&r.status===expected,'Command failed: '+argv.join(' '));return (r.stdout??'').trim();}
const git=args=>command('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...args]);
const snapshot=()=>({head:git(['rev-parse','HEAD']),status:git(['status','--porcelain=v1','--untracked-files=all'])});
async function check(id,f){try{await f();record.cases.push({id,status:'passed'});}catch(e){record.cases.push({id,status:'failed',error:e.message});}}
function raw(url,path,{method='GET',host}={}){const u=new URL(url);return new Promise((accept,reject)=>{const req=request({hostname:'127.0.0.1',port:u.port,path,method,headers:{Host:host??u.host}},res=>{const parts=[];res.on('data',p=>parts.push(p));res.on('end',()=>accept({status:res.statusCode,headers:res.headers,body:Buffer.concat(parts)}));});req.on('error',reject);req.end();});}
let failure;
try{
  record.before=snapshot();assert.equal(record.before.head,args[1]);assert.equal(record.before.status,'');
  const model=await import(pathToFileURL(join(worker,'prototypes/lab-reader/model.mjs'))),original=await import(pathToFileURL(join(worker,'prototypes/report-reader/model.mjs'))),{startServer}=await import(pathToFileURL(join(worker,'prototypes/lab-reader/server.mjs')));
  const bundle=JSON.parse(readFileSync(join(worker,'contracts/lab-reader-v1/sessions.json'),'utf8'));
  const rejected={name:'Error',message:'Unsupported lab session.'};
  await check('actual-I-function-identity',()=>{assert.equal(model.selectFindings,original.selectFindings);assert.equal(model.formatBytes,original.formatBytes);});
  for(const s of bundle.snapshots)await check('source-preserved:'+s.view.scan_id,()=>{const b=structuredClone(bundle);model.assertSessionBundle(b);assert.equal(model.selectSnapshot(b,s.view.scan_id),b.snapshots.find(x=>x.view.scan_id===s.view.scan_id));const summary=model.summarizeSnapshot(s);assert.deepEqual(Object.keys(summary).sort(),['finding_count','protected_count','unknown_size_count','issue_count','source_totals'].sort());assert.equal(summary.finding_count,s.view.findings.length);assert.equal(summary.protected_count,s.view.findings.length);assert.equal(summary.unknown_size_count,s.view.findings.filter(f=>f.logical_bytes===null).length);assert.deepEqual(summary.source_totals,s.view.totals);summary.source_totals.scanned_entries=-1;assert.deepEqual(b,bundle);});
  const mutations=[
    ['bundle-version',b=>b.bundle_version='future'],['snapshot-count-zero',b=>b.snapshots=[]],['snapshot-count-65',b=>b.snapshots=Array.from({length:65},()=>b.snapshots[0])],['duplicate-id',b=>b.snapshots.push(structuredClone(b.snapshots[0]))],
    ['snapshot-extra',b=>b.snapshots[0].extra=1],['data-kind',b=>b.snapshots[0].data_kind='real-data'],['facts-count',b=>b.snapshots[0].source_facts.recorded_entries++],['facts-scope',b=>b.snapshots[0].source_facts.scopes[0].scope_id='wrong'],
    ['report-id',b=>b.snapshots[0].report.scan_id='wrong'],['summary-count',b=>b.snapshots[0].summary.counts.findings++],['summary-extra',b=>b.snapshots[0].summary.extra=1],['risk-zero-bucket',b=>delete b.snapshots[0].summary.risk_counts.low],['category-zero-bucket',b=>b.snapshots[0].summary.category_counts.source=1],['read-only',b=>b.snapshots[0].summary.read_only=false],['totals-null-to-zero',b=>b.snapshots[0].summary.totals.logical_bytes='0'],
    ['entry-depth',b=>b.snapshots[0].source_facts.scopes[0].entries[0].depth++],['entry-identity',b=>b.snapshots[0].source_facts.scopes[0].entries[0].identity.device='1'],['entry-traversal',b=>b.snapshots[0].source_facts.scopes[0].entries[0].relative_path='../secret'],['protected-risk',b=>b.snapshots[0].view.findings[0].risk='low']
  ];
  for(const [id,mutate]of mutations)await check('reject:'+id,()=>{const b=structuredClone(bundle);mutate(b);assert.throws(()=>model.assertSessionBundle(b),rejected);});
  for(const id of ['missing',null,undefined,'../file'])await check('reject-selection:'+String(id),()=>assert.throws(()=>model.selectSnapshot(bundle,id),rejected));
  for(const port of [-1,65536,1.2,'0',null])await check('reject-port:'+String(port),()=>assert.rejects(startServer({bundle,port}),{name:'RangeError',message:'Invalid local port'}));
  await check('missing-bundle-no-fallback',()=>assert.rejects(startServer(),rejected));
  const supplied=structuredClone(bundle),server=await startServer({bundle:supplied});
  try{
    supplied.snapshots[0].view.findings[0].title='changed';supplied.snapshots.reverse();supplied.snapshots.pop();
    await check('deep-caller-capture',async()=>assert.deepEqual(JSON.parse((await raw(server.url,'/sessions.json')).body),bundle));
    for(const route of ['/','/styles.css','/app.mjs','/model.mjs','/report-reader/model.mjs','/sessions.json']){
      const get=await raw(server.url,route),head=await raw(server.url,route,{method:'HEAD'});
      await check('get-head-headers:'+route,()=>{assert.equal(get.status,200);assert.equal(head.status,200);assert.equal(head.body.length,0);assert.equal(head.headers['content-length'],String(get.body.length));assert.equal(get.headers['content-security-policy'],"default-src 'none';script-src 'self';style-src 'self';connect-src 'self';form-action 'none';frame-ancestors 'none';base-uri 'none'");assert.equal(get.headers['x-content-type-options'],'nosniff');assert.equal(get.headers['cache-control'],'no-store');assert.equal(get.headers['access-control-allow-origin'],undefined);});
      if(route==='/report-reader/model.mjs')await check('I-model-exact-served-bytes',()=>assert.deepEqual(get.body,readFileSync(join(worker,'prototypes/report-reader/model.mjs'))));
      for(const method of ['POST','PUT','DELETE','OPTIONS'])await check('method:'+method+':'+route,async()=>{const r=await raw(server.url,route,{method});assert.equal(r.status,405);assert.equal(r.body.toString(),'Report resource unavailable.');assert.equal(r.headers.allow,'GET, HEAD');});
      for(const host of ['localhost:'+new URL(server.url).port,'attacker.example','127.0.0.1:1'])await check('host:'+host+':'+route,async()=>{const r=await raw(server.url,route,{host});assert.equal(r.status,403);assert.equal(r.body.toString(),'Report resource unavailable.');});
      await check('query:'+route,async()=>assert.equal((await raw(server.url,route+'?x=1')).status,404));
    }
    for(const path of ['//sessions.json','/x/../sessions.json','/%73essions.json','/sessions.json/','/sessions.json%3fx','/../README.md','/%2e%2e/README.md','/..%5cREADME.md','/app.mjs#fragment','/contracts/lab-reader-v1/sessions.json','/server.mjs','/favicon.ico','/sessions.json\\x'])await check('raw-reject:'+path,async()=>{const r=await raw(server.url,path);assert.equal(r.status,404);assert.equal(r.body.toString(),'Report resource unavailable.');});
  }finally{await server.close();}
  await check('closed-server-refused',()=>assert.rejects(raw(server.url,'/sessions.json'),{code:'ECONNREFUSED'}));
  if(addendum){
    const actual=JSON.parse(readFileSync(join(worker,'docs/acceptance/wave1/k/addendum-01/actual-j-regression-bundle.json'),'utf8'));
    for(const s of actual.snapshots)await check('actual-J-accepted:'+s.view.scan_id,()=>{original.assertReportView(s.view);model.assertSessionBundle({bundle_version:actual.bundle_version,snapshots:[s]});});
    const root=actual.snapshots.find(s=>s.source_facts.case_id==='entry-budget');assert(root);
    const variant=path=>{const s=structuredClone(root);for(const issue of [s.source_facts.scopes[0].issues[0],s.report.issues[0],s.view.issues[0]])issue.relative_path=path;return {bundle_version:actual.bundle_version,snapshots:[s]};};
    for(const path of ['',null,'nested/root.txt','literal/<img src=x onerror=literal>'])await check('root-issue-accepted:'+String(path),()=>{const b=variant(path),before=structuredClone(b);model.assertSessionBundle(b);assert.deepEqual(b,before);});
    for(const path of ['/absolute','C:/absolute','a\\b','.', '..','a/../b','a//b','a/','a\nb','\u0000'])await check('root-issue-invalid:'+JSON.stringify(path),()=>assert.throws(()=>model.assertSessionBundle(variant(path)),rejected));
    await check('scope-root-still-nonempty',()=>{const b=variant('');b.snapshots[0].source_facts.scopes[0].relative_root='';assert.throws(()=>model.assertSessionBundle(b),rejected);});
    const supplied=structuredClone(actual),s=await startServer({bundle:supplied});try{const captured=structuredClone(supplied);supplied.snapshots[0].view.findings[0].relative_path='mutated';supplied.snapshots.length=1;await check('actual-J-all-13-captured',async()=>assert.deepEqual(JSON.parse((await raw(s.url,'/sessions.json')).body),captured));}finally{await s.close();}
  }
  if(controls){
    const archive=join(root,'docs/acceptance/wave1/k',...(addendum?['addendum-01']:[])),receipts=readdirSync(archive).filter(f=>f.endsWith('-result.json')).map(f=>({file:f,data:JSON.parse(readFileSync(join(archive,f),'utf8'))}));
    const final=addendum?JSON.parse(readFileSync(join(archive,JSON.parse(readFileSync(join(archive,'FINAL-GATES.json'),'utf8')).finals.find(f=>f.mode==='browser').name),'utf8')):receipts.find(r=>r.data.finalGate&&r.data.mode==='browser').data;
    record.controls=[];
    for(const {label,red}of final.proofAudit.filter(p=>addendum||p.label!=='behavior')){
      const state=JSON.parse(readFileSync(join(archive,red),'utf8')).sourceState,changed=state.files.filter(f=>!f.test&&f.sha256!==final.sourceState.files.find(s=>s.path===f.path).sha256);assert.equal(changed.length,1);
      const f=changed[0];assert.equal(f.path,label==='behavior'?'prototypes/lab-reader/model.mjs':label==='nc1'?'prototypes/lab-reader/server.mjs':'prototypes/lab-reader/app.mjs');const path=join(root,f.path),saved=readFileSync(path),bad=readFileSync(join(archive,f.snapshot));assert.equal(hash(bad),f.sha256);assert.equal(hash(saved),final.sourceState.files.find(s=>s.path===f.path).sha256);
      const control={label,path:f.path,original:hash(saved),bad:hash(bad)};writeFileSync(join(output,stamp+'-'+label+'-bad-source.txt'),bad,{flag:'wx'});
      try{writeFileSync(path,bad);const text=command(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap','prototypes/lab-reader/tests/model.test.mjs','prototypes/lab-reader/tests/browser.test.mjs'],150000,1);assert.match(text,/# tests 5\r?\n/);assert.match(text,/# skipped 0\r?\n/);assert(text.includes({behavior:'K_ROOT_ISSUE_PATH',nc1:'K_SERVER_INPUT',nc2:'K_TOTAL_UNKNOWN',nc3:'K_TEXT_LITERAL'}[label]));assert(!/SyntaxError|ERR_MODULE_NOT_FOUND|CDP timeout|condition timed out/.test(text));control.red=true;}
      finally{writeFileSync(path,saved);control.restored=hash(readFileSync(path));assert.equal(control.restored,control.original);}
      const text=command(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap','prototypes/lab-reader/tests/model.test.mjs','prototypes/lab-reader/tests/browser.test.mjs'],150000);assert.match(text,/# pass 5\r?\n/);assert.match(text,/# fail 0\r?\n/);control.green=true;record.controls.push(control);console.log(JSON.stringify({control:label,status:'red-restored-green'}));
    }
  }
  assert(record.cases.every(c=>c.status==='passed'),'Independent checks failed');
}catch(error){failure=error;}
try{record.after=snapshot();assert.equal(record.after.head,record.before.head);assert.equal(record.after.status,'');}catch(error){failure=failure?new Error(failure.message+'; post-check: '+error.message):error;}
Object.assign(record,{endedAt:new Date().toISOString(),status:failure?'failed':'passed',error:failure?.message??null});
const receipt=join(output,stamp+'-result.json');writeFileSync(receipt,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:record.status,cases:record.cases.length,controls:record.controls?.length??0,error:record.error,receipt},null,2));if(failure)process.exitCode=1;
