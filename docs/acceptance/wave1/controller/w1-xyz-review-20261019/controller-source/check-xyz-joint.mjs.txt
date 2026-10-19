// True fixed X -> Y -> native picker -> V/R -> W/Q. Exactly three windows.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,mkdtempSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {openPrivateBrowser} from './native-vw-private-browser.mjs';
const root=resolve('.'),tree=join(root,'.worktrees/integration-xyz-20261019'),out=join(root,'.local/checks/controller-xyz-20261019');mkdirSync(out,{recursive:true});
const stamp=new Date().toISOString().replaceAll(':','-')+'-'+process.pid,delay=ms=>new Promise(ok=>setTimeout(ok,ms)),hash=b=>createHash('sha256').update(b).digest('hex');
const record={startedAt:new Date().toISOString(),nativeWindowBudget:3,windowsObserved:0,cases:[],screenshots:[],downloads:[]};
const env={...process.env};for(const k of Object.keys(env))if(/^(?:NODE_OPTIONS$|NODE_PATH$|WATER_)/i.test(k))delete env[k];
const runner=spawn(process.execPath,[join(root,'scripts/acceptance/xyz-workspace-runner.mjs')],{cwd:tree,env,windowsHide:true,shell:false,stdio:['ignore','pipe','pipe','ipc']});
let browser,url,stderr='',stdout='',nativePid;
runner.stdout.on('data',b=>stdout+=b);runner.stderr.on('data',b=>stderr+=b);
const exited=new Promise(ok=>runner.once('close',(code,signal)=>ok({code,signal})));
const ready=new Promise((ok,bad)=>{runner.once('error',bad);runner.on('message',m=>{if(m.url){url=m.url;ok();}if(m.error)bad(new Error(m.error));});});
const save=(name,b)=>{const p=join(out,stamp+'-'+name);writeFileSync(p,b,{flag:'wx'});return{path:p,bytes:b.length,sha256:hash(b)};};
async function poll(fn){const end=Date.now()+10000;while(Date.now()<end){const s=await(await fetch(url+'/session.json')).json();if(fn(s))return s;await delay(15);}throw new Error('Joint state timed out');}
async function ui(action){const p=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',join(root,'scripts/acceptance/xyz-picker-action.ps1'),'-OwnerProcessId',String(runner.pid),'-Action',action],{cwd:tree,windowsHide:true,stdio:['ignore','pipe','pipe']});let text='',error='';p.stdout.on('data',b=>text+=b);p.stderr.on('data',b=>error+=b);const timer=setTimeout(()=>p.kill(),20000);const code=await new Promise(ok=>p.once('close',ok));clearTimeout(timer);record.windowsObserved+=(text.match(/^WATER_UI_WINDOW /gm)??[]).length;assert(record.windowsObserved<=3);const m=/WATER_XYZ_CHILD (\d+)/.exec(text);if(m){if(nativePid)assert.equal(nativePid,Number(m[1]));nativePid=Number(m[1]);}record.cases.at(-1).ui=save('ui-'+action+'-'+record.cases.length+'.txt',Buffer.from(text+'\n--- stderr ---\n'+error));assert.equal(code,0);}
async function shot(name){record.screenshots.push(save(name+'.png',await browser.screenshot()));}
try{
 await Promise.race([ready,delay(12000).then(()=>{throw new Error('Y ready timeout');})]);record.workspaceUrl=url;record.runnerPid=runner.pid;
 browser=await openPrivateBrowser();record.browserProfile=browser.profile;await browser.size(1440,1000);await browser.goto(url);await browser.waitFor('document.body.dataset.ready === "true" && !document.getElementById("start").disabled');
 const html=await(await fetch(url)).text(),token=/<meta name="water-action" content="([a-f0-9]{64})"/.exec(html)?.[1];assert(token);
 const initial=await(await fetch(url+'/session.json')).json();assert.equal(initial.active,null);
 const unauthorized=await fetch(url+'/actions/start',{method:'POST',headers:{Origin:'https://outside.invalid','Content-Type':'application/json','X-Water-Action':token},body:'{}'});assert.equal(unauthorized.status,403);assert.equal((await(await fetch(url+'/session.json')).json()).active,null);record.crossOriginDeniedWithoutStart=true;
 let completeUrl;
 for(const scenario of ['selection_cancelled','complete','scan_cancelled']){
  const c={scenario,startedAt:new Date().toISOString()};record.cases.push(c);await browser.click('#start');let s=await poll(s=>s.active!==null);c.job_id=s.active.job_id;assert.equal(s.active.phase,'selecting');
  if(scenario==='scan_cancelled'){await browser.waitFor('!document.getElementById("cancel").disabled');await browser.click('#cancel');s=await poll(s=>s.active?.phase==='cancelling');assert.equal(s.recent[0].report_url,completeUrl);c.cancellationRequestedBeforeConfirmation=true;}
  await ui(scenario==='selection_cancelled'?'cancel':'select');s=await poll(s=>s.active===null&&s.recent[0]?.job_id===c.job_id);assert.equal(s.connection,'ready');assert.equal(s.recent[0].status,scenario==='complete'?'completed':scenario==='selection_cancelled'?'selection_cancelled':'cancelled');c.workspaceState=save(scenario+'-workspace.json',Buffer.from(JSON.stringify(s)));
  await browser.waitFor('!document.getElementById("start").disabled');
  if(scenario==='selection_cancelled'){assert.equal(s.recent[0].report_url,null);await browser.waitFor('document.getElementById("status-text").textContent.includes("目录选择已取消")');await shot('xyz-selection-cancelled');}
  else{
   const reportUrl=s.recent[0].report_url;assert(reportUrl);if(scenario==='complete')completeUrl=reportUrl;
   const b=await(await fetch(reportUrl+'/session.json')).json();assert.equal(b.session_id,c.job_id);assert.equal(b.snapshots[0].source_kind,'native_scope_metadata');assert.equal(b.selection,'confirmed');assert.equal(b.snapshots[0].view.status,scenario==='complete'?'completed':'cancelled');
   const snap=b.snapshots[0];if(scenario==='complete'){assert.equal(snap.view.findings.length,8);assert(snap.view.findings.every(f=>f.risk==='protected'));}else assert.equal(snap.view.findings.length,0);
   c.actualBundle=save(scenario+'-native-bundle.json',Buffer.from(JSON.stringify(b)));
   await browser.goto(reportUrl);await browser.waitFor('document.body.dataset.ready === "true"');assert.equal(await browser.evaluate('document.getElementById("export-preview").textContent'),snap.redacted_json);
   const dir=mkdtempSync(join(root,'.local/browser-lab/xyz-download-'));await browser.downloadDirectory(dir);await browser.click('#download');const until=Date.now()+8000;let names;
   while(Date.now()<until){names=readdirSync(dir);if(names.length&&!names.some(n=>n.endsWith('.crdownload')))break;await delay(30);}assert.deepEqual(names,['water-report-1.json']);const source=join(dir,names[0]),bytes=readFileSync(source);assert.deepEqual(bytes,Buffer.from(snap.redacted_json));record.downloads.push({scenario,source,...save(scenario+'-actual-q.json',bytes)});
   await browser.goto(url);await browser.waitFor('document.body.dataset.ready === "true" && !document.getElementById("start").disabled');
   if(scenario==='complete'){await browser.size(1440,1000);await shot('xyz-workspace-1440x1000');await browser.size(900,800);assert.equal(await browser.evaluate('document.documentElement.scrollWidth>innerWidth'),false);await shot('xyz-workspace-900x800');}
  }
  c.status='passed';c.endedAt=new Date().toISOString();
 }
 record.nativePid=nativePid;assert.equal(record.windowsObserved,3);assert.equal((await(await fetch(url+'/session.json')).json()).recent.length,2);
 runner.send({action:'close'});const ending=await Promise.race([exited,delay(5000).then(()=>{throw new Error('Workspace runner failed to close');})]);assert.equal(ending.code,0);record.runnerExit=ending;record.normalShutdown=true;
 for(const target of [url,...record.cases.flatMap(c=>c.actualBundle?[JSON.parse(readFileSync(c.workspaceState.path)).recent[0].report_url]:[])]){await assert.rejects(fetch(target+'/session.json',{signal:AbortSignal.timeout(1000)}));}
 try{process.kill(nativePid,0);assert.fail('Native X still running');}catch(e){assert.equal(e.code,'ESRCH');}record.nativeProcessExited=true;record.httpPortsClosed=true;assert.equal(stderr,'');assert.equal(stdout,'');record.status='passed';
}catch(e){record.status='failed';record.error=e.stack;process.exitCode=1;}
finally{
 await browser?.close();if(runner.connected)runner.send({action:'close'});if(runner.exitCode===null){await Promise.race([exited,delay(4000)]);if(runner.exitCode===null)runner.kill();}
 record.runnerLog=save('runner.txt',Buffer.from(stdout+'\n--- stderr ---\n'+stderr));record.endedAt=new Date().toISOString();const receipt=join(out,stamp+'-joint-result.json');writeFileSync(receipt,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...record,cases:record.cases.map(c=>({scenario:c.scenario,status:c.status,job_id:c.job_id})),receipt}));
}
