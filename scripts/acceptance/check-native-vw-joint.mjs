// Exactly two native picker windows through the unchanged production launcher.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {lstatSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,realpathSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {openPrivateBrowser} from './native-vw-private-browser.mjs';
const controller=resolve('.'),tree=join(controller,'.worktrees/integration-vw-20261019');
const out=join(controller,'.local/checks/controller-vw-joint-20261019');mkdirSync(out,{recursive:true});
const stamp=new Date().toISOString().replaceAll(':','-')+'-'+process.pid;
const env={...process.env};for(const k of Object.keys(env)) if(/^(?:NODE_OPTIONS$|NODE_PATH$|WATER_)/i.test(k)) delete env[k];
const hash=b=>createHash('sha256').update(b).digest('hex');
const delay=ms=>new Promise(ok=>setTimeout(ok,ms));
const result={startedAt:new Date().toISOString(),tree,integrationCommit:'e38b81cf75d0fb65877bbb7d774e4da7b3a09678',nativeDialogBudget:2,nativeDialogsObserved:0,newPhysicalFixtures:0,ordinaryPayloadContentReads:0,cases:[],screenshots:[]};
let browser;
function git(argv) {
  const r=spawnSync('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...argv],{cwd:tree,env,encoding:'utf8',windowsHide:true,timeout:10000});
  assert.equal(r.status,0);return r.stdout.trim();
}
function alive(pid) {try {process.kill(pid,0);return true;} catch(e) {if(e.code==='ESRCH') return false;throw e;}}
function save(name,bytes) {const path=join(out,stamp+'-'+name);writeFileSync(path,bytes,{flag:'wx'});return {path,bytes:bytes.length,sha256:hash(bytes)};}
async function screenshot(name) {result.screenshots.push(save(name+'.png',await browser.screenshot()));}
async function runCase(action,fixture) {
  const c={action,startedAt:new Date().toISOString()};result.cases.push(c);
  const runner=spawn(process.execPath,[join(controller,'scripts/acceptance/native-vw-launch-once.mjs')],{cwd:tree,env,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});
  c.runnerPid=runner.pid;let stdout='',stderr='',uiout='',uierr='',url,timer;
  runner.stdout.on('data',b=>{stdout+=b;});runner.stderr.on('data',b=>{stderr+=b;});
  const exited=new Promise(ok=>runner.once('close',(code,signal)=>ok({code,signal})));
  const opened=new Promise((ok,bad)=>{runner.on('message',m=>{if(m.url) {url=m.url;ok(m.url);}else if(m.error) bad(new Error(m.error));});runner.once('error',bad);runner.once('close',code=>{if(!url) bad(new Error('Launcher closed before service: '+code));});});
  opened.catch(()=>{});
  const ui=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',join(controller,'scripts/acceptance/native-vw-ui-once.ps1'),'-OwnerProcessId',String(runner.pid),'-Action',action],{cwd:tree,env,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
  ui.stdout.on('data',b=>{uiout+=b;const m=/WATER_JOINT_CHILD (\d+) parent=(\d+)/.exec(uiout);if(m) {assert.equal(Number(m[2]),runner.pid);c.nativePid=Number(m[1]);}});ui.stderr.on('data',b=>{uierr+=b;});
  const uiTimer=setTimeout(()=>ui.kill(),20000);
  const uiDone=new Promise((ok,bad)=>{ui.once('error',bad);ui.once('close',(code,signal)=>{clearTimeout(uiTimer);c.uiExitCode=code;c.uiSignal=signal;code===0?ok():bad(new Error('Native UI action failed'));});});
  uiDone.catch(()=>{});
  try {
    const deadline=new Promise((_,bad)=>{timer=setTimeout(()=>bad(new Error('Native producer exceeded 25 seconds')),25000);});
    await Promise.race([Promise.all([opened,uiDone]),deadline]);clearTimeout(timer);
    assert.equal((uiout.match(/^WATER_UI_WINDOW /gm)??[]).length,1);result.nativeDialogsObserved++;
    assert(uiout.includes('WATER_UI_ACTION '+c.nativePid+' '+action));assert(result.nativeDialogsObserved<=2);
    assert.equal(alive(c.nativePid),false,'V must have exited before W serves data');
    c.nativeExitedBeforeHttp=true;c.url=url;
    const response=await fetch(url+'/session.json');assert.equal(response.status,200);
    assert(response.headers.get('content-security-policy').includes("default-src 'none'"));
    const bytes=Buffer.from(await response.arrayBuffer()),bundle=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    c.session=save(action+'-session.json',bytes);
    assert.equal(bundle.bundle_version,'water.native-session-bundle.v1');assert.equal(bundle.session_id,'native-session-cli');assert.equal(bundle.read_only,true);
    assert.deepEqual(bundle.policy,{platform:'windows',traversal:'handle_relative_no_follow',ordinary_content_read:false,native_user_gesture_authenticated:false,race_protection_verified:false,coverage_basis:'declared_policy',limits:{max_depth:8,max_entries:10000,max_dir_entries:256}});
    assert.equal(bundle.confirmation_source,'native_directory_dialog');
    assert(!bytes.toString().includes(controller)&&!bytes.toString().includes(controller.replaceAll('\\','\\\\')));
    for(const field of ['root_identity','root_path','file_id','volume_serial','capability']) assert(!bytes.toString().includes('"'+field+'"'));
    await browser.size(1440,1000);await browser.goto(url);await browser.waitFor('document.body.dataset.ready === "true"');
    const dom=await browser.evaluate(`(()=>{const t=id=>document.getElementById(id);return {status:t('status-banner').dataset.status,banner:t('status-banner').textContent,reportHidden:t('report-content').hidden,download:t('download').getAttribute('href'),preview:t('export-preview').textContent,policy:t('native-policy').textContent,count:t('summary-count').textContent,protected:t('protected-count').textContent,unknown:t('unknown-count').textContent,source:t('source-totals').textContent,visible:t('visible-count').textContent,overflow:document.documentElement.scrollWidth>innerWidth};})()`);
    c.dom=dom;assert.equal(dom.overflow,false);assert(dom.policy.includes('max_entries=10000')&&dom.policy.includes('max_dir_entries=256'));
    if(action==='cancel') {
      assert.equal(bundle.selection,'cancelled');assert.deepEqual(bundle.snapshots,[]);assert.equal(dom.status,'selection-cancelled');assert(dom.banner.includes('未开始扫描'));
      assert.equal(dom.reportHidden,true);assert.equal(dom.download,null);assert.equal(dom.preview,'');assert.equal((await fetch(url+'/exports/1.json')).status,404);
      await screenshot('actual-native-cancel');c.cancelWithoutSnapshot=true;
    } else {
      assert.equal(bundle.selection,'confirmed');assert.equal(bundle.snapshots.length,1);
      const s=bundle.snapshots[0],v=s.view;assert.equal(s.source_kind,'native_scope_metadata');assert.equal(v.status,'completed');
      assert.deepEqual(v.findings.map(f=>f.relative_path).sort(),fixture.expected_entries.map(e=>e[0]).sort());
      assert.equal(v.findings.length,8);assert(v.findings.every(f=>f.risk==='protected'&&f.category==='unknown'));assert.equal(v.findings.filter(f=>f.logical_bytes===null).length,3);
      assert.equal(v.totals.logical_bytes,null);assert.equal(v.totals.allocated_bytes,null);assert.equal(v.totals.scanned_entries,8);
      assert.equal(dom.status,'completed');assert.equal(dom.count,'8');assert.equal(dom.protected,'8');assert.equal(dom.unknown,'3');assert(dom.source.includes('未知'));
      assert.equal(dom.preview,s.redacted_json);assert.equal(dom.download,'/exports/1.json');
      const q=await fetch(url+'/exports/1.json');assert.equal(q.status,200);assert.equal(q.headers.get('content-disposition'),'attachment; filename="water-report-1.json"');
      assert.deepEqual(Buffer.from(await q.arrayBuffer()),Buffer.from(s.redacted_json));
      await screenshot('actual-native-1440x1000');await browser.size(900,800);
      assert.equal(await browser.evaluate('document.documentElement.scrollWidth>innerWidth'),false);await screenshot('actual-native-900x800');
      await browser.evaluate(`(()=>{const e=document.getElementById('search');e.value='no-controller-match';e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
      assert.equal(await browser.evaluate('document.getElementById("visible-count").textContent'),'0 / 8');
      assert.equal(await browser.evaluate('document.getElementById("export-preview").textContent'),s.redacted_json);
      const dir=mkdtempSync(join(controller,'.local/browser-lab/native-vw-download-'));c.downloadDirectory=dir;await browser.downloadDirectory(dir);await browser.click('#download');
      const until=Date.now()+8000;let names;
      while(Date.now()<until) {names=readdirSync(dir);if(names.length&&!names.some(n=>n.endsWith('.crdownload'))) break;await delay(40);}
      assert.deepEqual(names,['water-report-1.json'],'One actual click must create one complete attachment');
      const downloaded=readFileSync(join(dir,names[0]));assert.deepEqual(downloaded,Buffer.from(s.redacted_json));
      c.download={actualMouseClick:true,source:join(dir,names[0]),...save('actual-downloaded-q.json',downloaded)};
      for(const [name] of fixture.expected_entries) assert(!downloaded.toString().includes(name));
      c.actualNativeSource=true;c.filterPreservedFullExport=true;
    }
    c.status='passed';
  } catch(e) {c.status='failed';c.error=e.stack;throw e;}
  finally {
    clearTimeout(timer);clearTimeout(uiTimer);if(ui.exitCode===null) ui.kill();
    if(runner.connected) runner.send({action:'close'});
    const end=await Promise.race([exited,delay(5000).then(()=>null)]);
    if(!end) {
      const killed=spawnSync('taskkill.exe',['/PID',String(runner.pid),'/T','/F'],{encoding:'utf8',windowsHide:true,timeout:5000});
      c.ownedRunnerForcedTermination={exitCode:killed.status,stdout:killed.stdout,stderr:killed.stderr};
    } else {c.runnerExit=end;assert.equal(end.code,0,'Controller launcher runner must exit normally');}
    c.uiLog=save(action+'-ui.txt',Buffer.from(uiout+'\n--- stderr ---\n'+uierr));
    c.launcherLog=save(action+'-launcher.txt',Buffer.from(stdout+'\n--- stderr ---\n'+stderr));
    if(c.nativePid) c.nativeProcessRemaining=alive(c.nativePid);
    if(url) {let closed=false;try {await fetch(url+'/session.json',{signal:AbortSignal.timeout(1000)});}catch {closed=true;}c.httpPortClosed=closed;assert(closed);}
    c.endedAt=new Date().toISOString();
  }
}
try {
  assert.equal(git(['rev-parse','HEAD']),result.integrationCommit);assert.equal(git(['status','--porcelain','--untracked-files=all']),'');
  const prep=JSON.parse(readFileSync(join(out,'2026-10-19T07-18-44.942Z-21268-preparation.json')));
  assert.equal(prep.status,'passed');assert.equal(prep.integrationCommit,result.integrationCommit);
  assert.equal(hash(readFileSync(prep.binary.path)),prep.binary.sha256);result.binary=prep.binary;
  const indexPath=join(controller,'.local/native-walk-fixtures/index.json'),indexBytes=readFileSync(indexPath),fixture=JSON.parse(indexBytes);
  assert.equal(fixture.fixture_version,'water.native-walk-fixtures.v1');assert.equal(fixture.root,join(controller,'.local/native-walk-fixtures/batch-v1/root'));
  assert.equal(fixture.literal_payload_bytes,60);assert.equal(fixture.logical_file_entry_bytes,74);
  assert(lstatSync(fixture.root).isDirectory()&&!lstatSync(fixture.root).isSymbolicLink());assert.equal(realpathSync(fixture.root),fixture.root);
  assert.deepEqual(readdirSync(fixture.root).sort(),[...fixture.root_names].sort());
  result.fixture={indexPath,indexSha256:hash(indexBytes),root:fixture.root,reused:true,ordinaryPayloadContentReads:0};
  browser=await openPrivateBrowser();result.browserProfile=browser.profile;
  await runCase('cancel',fixture);await runCase('select',fixture);
  assert.equal(result.nativeDialogsObserved,2);assert(result.cases.every(c=>c.nativeProcessRemaining===false&&c.httpPortClosed&&c.runnerExit.code===0));
  assert.equal(hash(readFileSync(indexPath)),result.fixture.indexSha256);assert.deepEqual(readdirSync(fixture.root).sort(),[...fixture.root_names].sort());
  assert.equal(git(['status','--porcelain','--untracked-files=all']),'');result.status='passed';
} catch(e) {result.status='failed';result.error=e.stack;process.exitCode=1;}
finally {await browser?.close();result.endedAt=new Date().toISOString();const receipt=join(out,stamp+'-joint-result.json');writeFileSync(receipt,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,cases:result.cases.map(c=>({action:c.action,status:c.status,nativePid:c.nativePid,runnerExit:c.runnerExit,httpPortClosed:c.httpPortClosed,error:c.error})),receipt}));}
