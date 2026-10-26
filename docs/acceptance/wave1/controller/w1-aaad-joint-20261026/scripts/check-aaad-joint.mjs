// Bounded real AA -> unchanged AB/AD launcher -> native selection -> R/Z -> same-origin AD report.
// Four native windows, one private Chrome, no desktop/native screenshots, no retries.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,mkdtempSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {openPrivateBrowser} from './native-vw-private-browser.mjs';
const root=resolve('.'),tree=join(root,'.worktrees/integration-aaad-20261026'),out=join(root,'.local/checks/controller-aaad-20261026');mkdirSync(out,{recursive:true});mkdirSync(join(root,'.local/browser-lab'),{recursive:true});
const stamp=new Date().toISOString().replaceAll(':','-')+'-'+process.pid,delay=ms=>new Promise(ok=>setTimeout(ok,ms)),hash=b=>createHash('sha256').update(b).digest('hex');
const record={plan:'docs/acceptance/wave1/controller/WATER-W1-AAAD-JOINT-PLAN-20261026.md',startedAt:new Date().toISOString(),nativeWindowBudget:4,windowsObserved:0,windowAttempts:0,wallClockBudgetSeconds:180,retries:0,cases:[],screenshots:[],downloads:[],evictions:[],manualTermination:0};
const env={...process.env};for(const k of Object.keys(env))if(/^(?:NODE_OPTIONS$|NODE_PATH$|WATER_)/i.test(k))delete env[k];
const runner=spawn(process.execPath,[join(root,'scripts/acceptance/aaad-workspace-runner.mjs')],{cwd:tree,env,windowsHide:true,shell:false,stdio:['ignore','pipe','pipe','ipc']});
let browser,url,stderr='',stdout='',nativePid,watcher,watchText='',watchError='',watchExit,watchReady;
runner.stdout.on('data',b=>stdout+=b);runner.stderr.on('data',b=>stderr+=b);
const exited=new Promise(ok=>runner.once('close',(code,signal)=>ok({code,signal})));
const ready=new Promise((ok,bad)=>{runner.once('error',bad);runner.on('message',m=>{if(m.url){url=m.url;ok();}if(m.error)bad(new Error(m.error));});});
const save=(name,b)=>{const p=join(out,stamp+'-'+name);writeFileSync(p,b,{flag:'wx'});return{path:p,bytes:b.length,sha256:hash(b)};};
const deadline=Date.now()+180000;
async function bounded(p,ms,label){let timer;try{return await Promise.race([p,new Promise((_,bad)=>{timer=setTimeout(()=>bad(new Error(label)),ms);})]);}finally{clearTimeout(timer);}}
async function poll(fn){const end=Math.min(Date.now()+10000,deadline);while(Date.now()<end){const s=await(await fetch(url+'/session.json',{signal:AbortSignal.timeout(2000)})).json();if(fn(s))return s;await delay(15);}throw new Error('AAAD joint state timeout');}
// Navigation destroys the execution context; tolerate that only while settling.
async function settle(expression){const end=Math.min(Date.now()+10000,deadline);while(Date.now()<end){try{if(await browser.evaluate(expression))return;}catch{}await delay(25);}throw new Error('Browser settle timed out: '+expression);}
const status=async target=>(await fetch(target,{signal:AbortSignal.timeout(2000)})).status;
function beginWatch(){watcher=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',join(root,'scripts/acceptance/aaad-watch-exit.ps1'),'-NativeProcessId',String(nativePid)],{cwd:tree,windowsHide:true,stdio:['ignore','pipe','pipe']});watchReady=new Promise((ok,bad)=>{watcher.once('error',bad);watcher.stdout.on('data',b=>{watchText+=b;if(watchText.includes('WATER_AAAD_WATCH_READY'))ok();});});watcher.stderr.on('data',b=>watchError+=b);watchExit=new Promise(ok=>watcher.once('close',(code,signal)=>ok({code,signal})));}
async function ui(action){assert(Date.now()<deadline);assert(++record.windowAttempts<=4);const p=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',join(root,'scripts/acceptance/aaad-picker-action.ps1'),'-OwnerProcessId',String(runner.pid),'-Action',action],{cwd:tree,windowsHide:true,stdio:['ignore','pipe','pipe']});let text='',error='';p.stdout.on('data',b=>text+=b);p.stderr.on('data',b=>error+=b);const timer=setTimeout(()=>p.kill(),20000);const code=await new Promise(ok=>p.once('close',ok));clearTimeout(timer);record.windowsObserved+=(text.match(/^WATER_UI_WINDOW /gm)??[]).length;assert(record.windowsObserved<=4);const m=/WATER_AAAD_CHILD (\d+)/.exec(text);if(m){if(nativePid)assert.equal(nativePid,Number(m[1]));nativePid=Number(m[1]);}record.cases.at(-1).ui=save('ui-'+action+'-'+record.cases.length+'.txt',Buffer.from(text+'\n--- stderr ---\n'+error));assert.equal(code,0);if(!watcher){beginWatch();await bounded(watchReady,5000,'Native exit watcher failed to attach');}}
async function shot(name){record.screenshots.push({name,...save(name+'.png',await browser.screenshot())});}
async function download(selector,filename,expected,scenario){const directory=mkdtempSync(join(root,'.local/browser-lab/aaad-download-'));await browser.downloadDirectory(directory);await browser.click(selector);let names;const end=Date.now()+8000;do{names=readdirSync(directory);if(names.length&&!names.some(n=>n.endsWith('.crdownload')))break;await delay(25);}while(Date.now()<end);assert.deepEqual(names,[filename]);const source=join(directory,filename),bytes=readFileSync(source);assert.deepEqual(bytes,Buffer.from(expected,'utf8'));record.downloads.push({scenario,selector,filename,source,actualMouseClick:true,originalBytesEqual:true,...save(scenario+'-'+filename,bytes)});}
async function backToWorkspace(){await browser.click('.back-link');await settle('location.pathname === "/" && document.body.dataset.ready === "true" && !document.getElementById("start").disabled');}
try{
 await bounded(ready,12000,'AB ready timeout');record.workspaceUrl=url;record.runnerPid=runner.pid;
 browser=await openPrivateBrowser();record.browserProfile=browser.profile;await browser.size(1440,1000);await browser.goto(url);await browser.waitFor('document.body.dataset.ready === "true" && !document.getElementById("start").disabled');
 const html=await(await fetch(url)).text(),token=/<meta name="water-action" content="([a-f0-9]{64})"/.exec(html)?.[1];assert(token);assert.equal((await(await fetch(url+'/session.json')).json()).active,null);
 for(const headers of [{Origin:'https://outside.invalid','X-Water-Action':token},{Origin:url}]){const response=await fetch(url+'/actions/start',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:'{"read_manifest":true}'});assert.equal(response.status,403);assert.equal((await(await fetch(url+'/session.json')).json()).active,null);}record.unauthorizedDeniedWithoutStart=true;
 const jobs={};let defaultQ;
 for(const scenario of ['default_false','explicit_true','selection_cancelled','scan_cancelled']){
  const choice=scenario!=='default_false',c={scenario,choice,startedAt:new Date().toISOString()};record.cases.push(c);
  assert.equal(await browser.evaluate('document.getElementById("read-manifest").checked'),false);if(choice)await browser.click('#read-manifest');assert.equal(await browser.evaluate('document.getElementById("read-manifest").checked'),choice);await browser.click('#start');let s=await poll(s=>s.active!==null);c.job_id=jobs[scenario]=s.active.job_id;assert.equal(s.active.read_manifest,choice);assert.equal(s.active.phase,'selecting');
  assert.equal(await browser.evaluate('document.getElementById("read-manifest").checked'),false);assert.equal(await browser.evaluate('document.getElementById("read-manifest").disabled'),true);
  if(scenario==='scan_cancelled'){await browser.waitFor('!document.getElementById("cancel").disabled');await browser.click('#cancel');s=await poll(s=>s.active?.phase==='cancelling');c.cancellationBeforeConfirmation=true;}
  await ui(scenario==='selection_cancelled'?'cancel':'select');s=await poll(s=>s.active===null&&s.recent[0]?.job_id===c.job_id);assert.equal(s.connection,'ready');const row=s.recent[0],expectStatus=scenario==='selection_cancelled'?'selection_cancelled':scenario==='scan_cancelled'?'cancelled':'completed';assert.equal(row.status,expectStatus);assert.equal(row.read_manifest,choice);c.workspaceState=save(scenario+'-workspace.json',Buffer.from(JSON.stringify(s)));
  await browser.waitFor('!document.getElementById("start").disabled && document.body.dataset.active === "false"');assert.equal(await browser.evaluate('document.getElementById("read-manifest").checked'),false);
  const reportPath='/reports/'+c.job_id+'/';
  if(scenario==='selection_cancelled'){
   assert.equal(row.report_url,null);assert.equal(row.evidence_url,null);assert.deepEqual(row.marker,{status:'skipped',error_code:'selection_cancelled',observation_json:null});
   assert.equal(await browser.evaluate(`document.querySelector('a.project-report-link[href="${reportPath}"]') === null`),true);assert.equal(await status(url+reportPath),404);assert.equal(await status(url+reportPath+'session.json'),404);
   await browser.waitFor('document.getElementById("status-text").textContent.includes("目录选择已取消")');await shot('aaad-workspace-selection-cancelled');
   // Selection cancelled occupies a recent slot: the default report is evicted.
   const d=jobs.default_false,ev={evicted:'default_false',job_id:d,report:await status(url+'/reports/'+d+'/'),session:await status(url+'/reports/'+d+'/session.json'),metadata:await status(url+'/reports/'+d+'/metadata.json')};assert.deepEqual([ev.report,ev.session,ev.metadata],[404,404,404]);await assert.rejects(fetch(record.cases[0].wReportUrl+'/session.json',{signal:AbortSignal.timeout(1000)}));ev.wServerClosed=true;record.evictions.push(ev);
  } else {
   assert(row.report_url);const wBundle=await(await fetch(row.report_url+'/session.json')).json();c.wReportUrl=row.report_url;c.actualBundle=save(scenario+'-native-bundle.json',Buffer.from(JSON.stringify(wBundle)));
   assert.equal(wBundle.session_id,c.job_id);assert.equal(wBundle.selection,'confirmed');const snap=wBundle.snapshots[0];assert.equal(snap.source_kind,'native_scope_metadata');assert.equal(snap.view.status,expectStatus);assert.equal(snap.view.findings.length,expectStatus==='cancelled'?0:1);assert(snap.view.findings.every(f=>f.risk==='protected'));
   if(scenario==='default_false'){assert.deepEqual(row.marker,{status:'not_requested',error_code:null,observation_json:null});assert.equal(row.evidence_url,null);defaultQ=snap.redacted_json;}
   if(scenario==='explicit_true'){assert.equal(row.marker.status,'observed');assert.equal(row.marker.error_code,null);assert.equal(row.evidence_url,'/evidence/'+c.job_id+'.json');assert.equal(snap.redacted_json,defaultQ);}
   if(scenario==='scan_cancelled'){assert.deepEqual(row.marker,{status:'skipped',error_code:'scan_cancelled',observation_json:null});assert.equal(row.evidence_url,null);
    const o=jobs.explicit_true,ev={evicted:'explicit_true',job_id:o,report:await status(url+'/reports/'+o+'/'),session:await status(url+'/reports/'+o+'/session.json'),metadata:await status(url+'/reports/'+o+'/metadata.json'),evidence:await status(url+'/evidence/'+o+'.json')};assert.deepEqual([ev.report,ev.session,ev.metadata,ev.evidence],[404,404,404,404]);await assert.rejects(fetch(record.cases[1].wReportUrl+'/session.json',{signal:AbortSignal.timeout(1000)}));ev.wServerClosed=true;record.evictions.push(ev);}
   if(scenario!=='explicit_true')assert.equal(await status(url+'/evidence/'+c.job_id+'.json'),404);
   // Same-origin AD report: actual mouse click from the workspace row.
   const linkSelector=`a.project-report-link[href="${reportPath}"]`;assert.equal(await browser.evaluate(`document.querySelectorAll('${linkSelector}').length`),1);
   await browser.click(linkSelector);await settle(`location.pathname === ${JSON.stringify(reportPath)} && document.body.dataset.ready === "true"`);
   const packetText=await(await fetch(url+reportPath+'session.json')).text(),packet=JSON.parse(packetText);c.reportSession=save(scenario+'-project-report-session.json',Buffer.from(packetText));
   assert.deepEqual(Object.keys(packet),['report_version','job_id','read_manifest','bundle','marker']);assert.equal(packet.report_version,'water.project-report.v1');assert.equal(packet.job_id,c.job_id);assert.equal(packet.read_manifest,choice);assert.deepEqual(packet.bundle,wBundle);assert.deepEqual(packet.marker,row.marker);
   const title=await browser.evaluate('document.getElementById("report-title").textContent'),marker=await browser.evaluate('document.getElementById("marker-status").textContent');c.reportTitle=title;c.reportMarkerText=marker;
   assert.equal(title,{completed:'扫描完成',cancelled:'扫描已取消'}[expectStatus]);assert.equal(await browser.evaluate('document.getElementById("report-content").hidden'),false);
   assert.equal(marker,{default_false:'未请求读取 · 本次未读取清单',explicit_true:'已读取根清单 · 仅保留结构统计',scan_cancelled:'扫描取消未读 · 未读取清单'}[scenario]);
   assert.equal(await browser.evaluate('document.getElementById("metadata-preview").textContent'),snap.redacted_json);
   assert.equal(await browser.evaluate('document.getElementById("download-metadata").getAttribute("href")'),reportPath+'metadata.json');
   await download('#download-metadata','water-report-1.json',snap.redacted_json,scenario);
   const structureHidden=await browser.evaluate('document.getElementById("structure-panel").hidden');c.structurePanelHidden=structureHidden;
   if(scenario==='explicit_true'){
    assert.equal(structureHidden,false);assert.equal(await browser.evaluate('document.getElementById("evidence-preview").textContent'),row.marker.observation_json);
    assert.equal(await browser.evaluate('document.getElementById("download-evidence").getAttribute("href")'),'/evidence/'+c.job_id+'.json');
    await download('#download-evidence','water-project-evidence.json',row.marker.observation_json,scenario);
    await browser.size(1440,1000);await browser.evaluate('window.scrollTo(0,0)');assert.equal(await browser.evaluate('document.documentElement.scrollWidth>innerWidth'),false);await shot('aaad-report-observed-1440x1000');
    await browser.evaluate('document.getElementById("structure-panel").scrollIntoView({block:"start"})');await shot('aaad-report-observed-structure-1440x1000');
    await browser.size(900,800);await browser.evaluate('window.scrollTo(0,0)');assert.equal(await browser.evaluate('document.documentElement.scrollWidth>innerWidth'),false);await shot('aaad-report-observed-900x800');await browser.size(1440,1000);
   } else {
    assert.equal(structureHidden,true);
    if(scenario==='default_false'){await browser.evaluate('window.scrollTo(0,0)');await shot('aaad-report-default-1440x1000');}
    if(scenario==='scan_cancelled'){await browser.evaluate('window.scrollTo(0,0)');assert.equal(await browser.evaluate('document.documentElement.scrollWidth>innerWidth'),false);await shot('aaad-report-scan-cancelled-1440x1000');}
   }
   await backToWorkspace();
  }
  c.status='passed';c.endedAt=new Date().toISOString();
 }
 record.nativePid=nativePid;assert.equal(record.windowsObserved,4);const final=await(await fetch(url+'/session.json')).json();assert.deepEqual(final.recent.map(r=>r.job_id),[jobs.scan_cancelled,jobs.selection_cancelled]);assert(Date.now()<deadline);
 assert.equal(await status(url+'/reports/'+jobs.scan_cancelled+'/session.json'),200);record.finalRecentJobs=final.recent.map(r=>({job_id:r.job_id,status:r.status}));
 runner.send({action:'close'});record.runnerExit=await bounded(exited,6000,'Workspace runner failed to close');assert.equal(record.runnerExit.code,0);record.nativeWatcherExit=await bounded(watchExit,6000,'Native exit watcher timed out');assert.equal(record.nativeWatcherExit.code,0);assert(watchText.includes('WATER_AAAD_EXIT '+nativePid+' code=0'));assert.equal(watchError,'');record.normalNativeShutdown=true;
 for(const target of [url,...record.cases.flatMap(c=>c.wReportUrl?[c.wReportUrl]:[])])await assert.rejects(fetch(target+'/session.json',{signal:AbortSignal.timeout(1000)}));
 try{process.kill(nativePid,0);assert.fail('Native AA still running');}catch(e){assert.equal(e.code,'ESRCH');}record.nativeProcessExited=true;record.httpPortsClosed=true;assert.equal(stderr,'');assert.equal(stdout,'');record.status='passed';
}catch(e){record.status='failed';record.error=e.stack;process.exitCode=1;}
finally{
 try{await browser?.close();record.privateBrowserCloseReturned=true;}catch(e){record.browserCloseError=String(e);}
 if(runner.connected)runner.send({action:'close'});if(runner.exitCode===null){await bounded(exited,4000,'Final runner close timeout').catch(()=>{});if(runner.exitCode===null){runner.kill();record.manualTermination++;}}if(watcher&&watcher.exitCode===null)await bounded(watchExit,5000,'Final watcher timeout').catch(()=>{watcher.kill();record.manualTermination++;});
 record.runnerLog=save('runner.txt',Buffer.from(stdout+'\n--- stderr ---\n'+stderr));record.nativeExitLog=save('native-exit.txt',Buffer.from(watchText+'\n--- stderr ---\n'+watchError));record.endedAt=new Date().toISOString();record.elapsedMs=Date.parse(record.endedAt)-Date.parse(record.startedAt);const receipt=join(out,stamp+'-joint-result.json');writeFileSync(receipt,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:record.status,error:record.error,windowsObserved:record.windowsObserved,elapsedMs:record.elapsedMs,cases:record.cases.map(c=>({scenario:c.scenario,status:c.status,job_id:c.job_id})),downloads:record.downloads.length,screenshots:record.screenshots.map(s=>s.path),manualTermination:record.manualTermination,receipt}));
}
