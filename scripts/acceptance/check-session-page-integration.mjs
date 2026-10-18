// Controller acceptance preparation and guarded future real J -> K page integration.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync,existsSync,lstatSync,mkdirSync,readFileSync,readdirSync,realpathSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname,isAbsolute,join,relative,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {selectCargoArtifacts} from './cargo-artifacts.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),args=process.argv.slice(2);
assert.equal(args[0],'--mode');assert(['plan','run'].includes(args[1]));const run=args[1]==='run';
const reuseOnly=args.includes('--reuse-fixtures-only');assert.equal(args.length,run?4+Number(reuseOnly):2);if(run){assert.equal(args[2],'--expected-head');assert.match(args[3],/^[a-f0-9]{40}$/);if(reuseOnly)assert.equal(args[4],'--reuse-fixtures-only');}
assert.equal(realpathSync(root).toLowerCase(),realpathSync(process.cwd()).toLowerCase());
const json=p=>JSON.parse(readFileSync(join(root,p),'utf8')),sha=p=>createHash('sha256').update(readFileSync(join(root,p))).digest('hex');
function local(parts){let p=root;for(const part of parts.split('/')){assert(part&&!['.','..'].includes(part));p=join(p,part);if(!existsSync(p))mkdirSync(p);assert(lstatSync(p).isDirectory()&&!lstatSync(p).isSymbolicLink());const rel=relative(realpathSync(root),realpathSync(p));assert(rel&&!rel.startsWith('..')&&!isAbsolute(rel));}return p;}
const stamp=new Date().toISOString().replaceAll(':','-')+'-'+process.pid;
const out=local(run?'.local/checks/controller-session-page':'docs/acceptance/wave1/controller/w1-session-page-plan-20261018');
const record={mode:args[1],startedAt:new Date().toISOString(),commands:[],newProductsTested:false,physicalFixturesCreated:false};
const env={...process.env,GIT_OPTIONAL_LOCKS:'0',RUSTUP_AUTO_INSTALL:'0'};for(const key of Object.keys(env))if(/^(?:CARGO_|RUST|NODE_OPTIONS$|NODE_PATH$|WATER_)/i.test(key)&&key!=='RUSTUP_AUTO_INSTALL')delete env[key];
function command(binary,argv,timeout=30000){const r=spawnSync(binary,argv,{cwd:root,env,encoding:'utf8',windowsHide:true,shell:false,timeout,maxBuffer:32*1024*1024});const log=stamp+'-'+record.commands.length+'.log',item={binary,argv,exitCode:r.status,error:r.error?.code??null,log};record.commands.push(item);writeFileSync(join(out,log),JSON.stringify(item)+'\n--- stdout ---\n'+(r.stdout??'')+'\n--- stderr ---\n'+(r.stderr??''),{flag:'wx'});assert(!r.error&&r.status===0,'Controller command failed: '+argv.join(' '));return r.stdout.trim();}
const git=argv=>command('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...argv]);
const snapshot=()=>({head:git(['rev-parse','HEAD']),status:git(['status','--porcelain=v1','--untracked-files=all'])});
const equalJSON=(a,b)=>assert.deepEqual(a,b);
async function http(server){const url=new URL(server.url);assert.equal(url.protocol,'http:');assert.equal(url.hostname,'127.0.0.1');assert(url.port&&!url.search&&!url.hash);const response=await fetch(server.url+'/sessions.json',{redirect:'error'});assert.equal(response.status,200);assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(response.headers.get('access-control-allow-origin'),null);return response.json();}
let failure;
try{
  const manifest=json('docs/dispatch/wave1/manifest.json'),j=manifest.tasks.find(t=>t.id==='WATER-W1-J'),k=manifest.tasks.find(t=>t.id==='WATER-W1-K');assert(j&&k);
  record.before=snapshot();record.tasks=[j,k].map(t=>({id:t.id,status:t.status,baseCommit:t.baseCommit,acceptedCommit:t.acceptedCommit??null}));
  const frozen=new Map(),hasEvidenceLock=existsSync(join(root,'contracts/evidence-batch-v1/freeze.lock.json'));for(const name of ['v1','parallel-v1','fixture-lab-v1','report-view-v1','scan-lab-v1','parallel-next-v1','session-batch-v1',...(hasEvidenceLock?['evidence-batch-v1']:[])])for(const f of json('contracts/'+name+'/freeze.lock.json').files){assert.equal(sha(f.path),f.sha256,f.path);frozen.set(f.path,f.sha256);}assert.equal(frozen.size,hasEvidenceLock?151:132);record.frozenFiles=frozen.size;
  if(!run){
    assert.equal(git(['branch','--show-current']),'main');
    assert(existsSync(join(root,j.ticket))&&existsSync(join(root,k.ticket)));
    const bundle=json('contracts/lab-reader-v1/sessions.json'),model=await import(pathToFileURL(join(root,'prototypes/report-reader/model.mjs')));for(const s of bundle.snapshots){model.assertReportView(s.view);assert.equal(s.summary.counts.findings,s.view.findings.length);}
    record.currentInputSnapshots=bundle.snapshots.length;record.acceptancePlanReady=true;record.realIntegrationRun=false;record.requiredBeforeRun='J and K independently ACCEPTED, controller integration branch and clean explicit tested HEAD.';
  }else{
    assert.equal(process.platform,'win32');assert.equal(git(['branch','--show-current']),'controller/water-w1-jk-20261018');
    const controller=dirname(git(['rev-parse','--path-format=absolute','--git-common-dir']));assert.equal(relative(controller,root).replaceAll('\\','/'),'.worktrees/integration-jk-20261018');
    assert.equal(record.before.head,args[3]);assert.equal(record.before.status,'');
    for(const t of [j,k]){assert(['ACCEPTED','INTEGRATED','VERIFIED'].includes(t.status));assert(t.acceptedCommit);git(['merge-base','--is-ancestor',t.acceptedCommit,'HEAD']);assert.equal(git(['rev-parse','HEAD:'+t.outputRoot]),git(['rev-parse',t.acceptedCommit+':'+t.outputRoot]));}
    for(const path of ['crates/water-contracts','packages/fixture-scan','packages/scan-report','packages/report-view','packages/summary-export','prototypes/report-reader'])assert.equal(git(['rev-parse','HEAD:'+path]),git(['rev-parse','8d19dfa5af0266bd1dae2cbaa9b8983125bfb8e1:'+path]));
    const home=local('.local/session-integration-cargo-home'),target=local('.local/session-integration-target'),temp=local('.local/session-integration-tmp');
    for(let p=root;;p=dirname(p)){for(const n of ['config','config.toml'])assert(!existsSync(join(p,'.cargo',n)));if(dirname(p)===p)break;}for(const n of ['config','config.toml'])assert(!existsSync(join(home,n)));
    const cache=join(controller,'.worktrees/a/.local/cargo-home/registry');assert(lstatSync(cache).isDirectory()&&!lstatSync(cache).isSymbolicLink());const inside=relative(realpathSync(controller),realpathSync(cache));assert(inside&&!inside.startsWith('..')&&!isAbsolute(inside));if(!existsSync(join(home,'registry')))cpSync(cache,join(home,'registry'),{recursive:true,force:false,errorOnExist:true});
    const rustup=join(homedir(),'.cargo/bin/rustup.exe'),rustc=command(rustup,['which','rustc','--toolchain','1.95.0']),cargo=command(rustup,['which','cargo','--toolchain','1.95.0']);assert(command(rustc,['--version']).startsWith('rustc 1.95.0 '));
    Object.assign(env,{RUSTUP_TOOLCHAIN:'1.95.0',RUSTC:rustc,RUSTDOC:join(dirname(rustc),'rustdoc.exe'),CARGO_HOME:home,CARGO_TARGET_DIR:target,CARGO_BUILD_JOBS:'1',CARGO_NET_OFFLINE:'true',CARGO_TERM_COLOR:'never',TEMP:temp,TMP:temp,TMPDIR:temp});const pathKey=Object.keys(env).find(key=>key.toLowerCase()==='path')??'PATH';env[pathKey]=dirname(rustc)+';'+(env[pathKey]??'');
    const prepare=await import(pathToFileURL(join(root,'scripts/prepare-scan-fixtures.mjs'))),hasIndex=existsSync(join(root,'.local/checks/WATER-W1-F/active-fixtures.json'));
    assert(!reuseOnly||hasIndex,'Required retained fixture index missing; do not create a replacement batch');const state=hasIndex?prepare.readActiveFixtures():await prepare.prepareScanFixtures();record.physicalFixturesCreated=!hasIndex;record.reuseFixturesOnly=reuseOnly;record.fixtures={runs:state.index.runs.length,negatives:state.index.negative.length,contentBytes:state.index.content_bytes};env.WATER_SESSION_FIXTURE_INDEX=state.active;
    const cargoArgs=['--manifest-path',join(root,j.outputRoot,'Cargo.toml')];
    const meta=JSON.parse(command(cargo,['metadata','--offline','--locked','--format-version','1',...cargoArgs],180000));assert.equal(meta.workspace_members.length,1);assert(meta.packages.some(p=>p.name==='water-lab-session'));
    command(cargo,['fmt',...cargoArgs,'--','--check'],180000);const rustTests=command(cargo,['test','--offline','--locked',...cargoArgs,'--test','session_v1','--','--test-threads=1','--format','pretty'],180000);assert.deepEqual([...rustTests.matchAll(/^test ([a-z0-9_]+) \.\.\. ok$/gm)].map(m=>m[1]).sort(),[...j.expectedTests].sort());assert(rustTests.includes('5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out'));
    command(cargo,['clippy','--offline','--locked',...cargoArgs,'--all-targets','--','-D','warnings'],180000);const buildOutput=command(cargo,['build','--offline','--locked',...cargoArgs,'--lib','--message-format=json'],180000);
    const deps=join(target,'debug/deps'),names=['water_lab_session','water_scan','water_scan_report','water_report_view','water_summary_export','water_contracts','serde_json'];record.cargoArtifacts=selectCargoArtifacts(meta,buildOutput,'water-lab-session',names,deps);const externs=record.cargoArtifacts.flatMap(a=>['--extern',a.crate+'='+a.filename]);
    const compile=(source,name)=>{const binary=join(temp,stamp+'-'+name+'.exe');command(rustc,['--edition=2024','--crate-name',name,join(root,'scripts/acceptance',source),'-L','dependency='+deps,...externs,'-o',binary],180000);return JSON.parse(command(binary,[state.active]));};
    const known=compile('scan-report-summary-pipeline.rs','controller_known_session'),actual=compile('lab-session-bridge.rs','controller_actual_session');assert.equal(actual.snapshots.length,13);
    const expected=known.cases.map(c=>({session_version:'water.lab-session.v1',data_kind:'controlled_fixture_metadata',source_facts:c.facts,report:c.bundle.report,view:c.view,summary:c.summary}));equalJSON(actual.snapshots,expected);
    record.native=prepare.verifyNativeFacts(known.cases.filter(c=>c.native).map(c=>c.facts),state.index);record.controlledCases=2;
    for(const path of k.syntaxFiles)command(process.execPath,['--check',path]);const nodeTests=command(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap',...k.testFiles],150000);assert.deepEqual([...nodeTests.matchAll(/^# Subtest: (.+)$/gm)].map(m=>m[1].replace(/\r$/,'')).sort(),[...k.expectedTests,...k.expectedBrowserTests].sort());for(const [key,value]of [['tests',5],['pass',5],['fail',0],['skipped',0],['cancelled',0],['todo',0]])assert(new RegExp('^# '+key+' '+value+'\\r?$','m').test(nodeTests));
    const originalBundle={bundle_version:'water.lab-reader-bundle.v1',snapshots:actual.snapshots};writeFileSync(join(out,stamp+'-actual-j-bundle.json'),JSON.stringify(originalBundle,null,2)+'\n',{flag:'wx'});
    const supplied=structuredClone(originalBundle),{startServer}=await import(pathToFileURL(join(root,k.outputRoot,'server.mjs'))),server=await startServer({bundle:supplied});
    const {openBrowser}=await import(pathToFileURL(join(root,'scripts/browser-lab.mjs')));let browser;
    try{
      equalJSON(await http(server),originalBundle);supplied.snapshots[0].view.findings[0].relative_path='caller-mutation-after-start';supplied.snapshots.length=1;equalJSON(await http(server),originalBundle);
      record.pages=[];const allIds=originalBundle.snapshots.map(s=>s.view.scan_id);
      for(const [width,height]of [[1440,1000],[900,800]]){
        browser=await openBrowser({width,height});const requests=[],exceptions=[];browser.onEvent(e=>{if(e.method==='Network.requestWillBeSent')requests.push(e.params.request.url);if(e.method==='Runtime.exceptionThrown')exceptions.push(e.params.exceptionDetails.text);});await browser.send('Network.enable');await browser.goto(server.url);
        const picker=`Array.from(document.querySelectorAll('select')).find(s=>${JSON.stringify(allIds)}.every(id=>Array.from(s.options).some(o=>o.value===id)))`;
        await browser.waitFor(`document.readyState==='complete' && Boolean(${picker})`);
        const visibleText=`Array.from(document.querySelectorAll('body *')).filter(e=>!e.closest('select,option,script,style')&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>Array.from(e.childNodes).filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('')).join('\\n')`;
        const selected=[];for(const index of [...Array.from({length:11},(_,i)=>i),12,11]){
          const s=originalBundle.snapshots[index];await browser.evaluate(`(()=>{const s=${picker};s.value=${JSON.stringify(s.view.scan_id)};s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
          const expectedPaths=s.view.findings.map(f=>f.relative_path),previousPaths=originalBundle.snapshots[12].view.findings.map(f=>f.relative_path);
          await browser.waitFor(`(()=>{const t=${visibleText};return ${index===11?JSON.stringify(previousPaths)+'.every(p=>!t.includes(p))':JSON.stringify(expectedPaths)+'.every(p=>t.includes(p))'};})()`);
          const text=await browser.evaluate(visibleText);assert(text.includes('受控夹具扫描')&&text.includes('只读'));
          const rows=await browser.evaluate('Array.from(document.querySelectorAll("[data-finding-id]"),e=>e.dataset.findingId)');assert.equal(rows.length,s.view.findings.length);assert.deepEqual([...rows].sort(),s.view.findings.map(f=>f.id).sort());assert(text.includes(s.view.scan_id)&&text.includes(s.view.status)&&text.includes(s.source_facts.case_id));selected.push({scanId:s.view.scan_id,status:s.view.status,rows:rows.length});
          if(index===8){assert(text.includes('scope 根')&&text.includes('entry_limit')&&text.includes('origin=policy')&&text.includes('operation=budget'));const file='.local/browser-lab/'+stamp+'-actual-root-issue-'+width+'x'+height+'.png';await browser.screenshot(file);record.rootIssueScreenshots??=[];record.rootIssueScreenshots.push(file);}
          if(index!==11)for(const f of s.view.findings)assert(text.includes(f.relative_path),'Actual J path missing from page: '+f.relative_path);
          else for(const f of originalBundle.snapshots[12].view.findings)assert(!text.includes(f.relative_path),'Cancelled empty J snapshot retained previous rows');
        }
        const layout=await browser.evaluate('({width:innerWidth,client:document.documentElement.clientWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth})');assert.equal(layout.width,width);assert(layout.document<=layout.client&&layout.body<=layout.client);assert.deepEqual(exceptions,[]);assert(requests.every(url=>url.startsWith(server.url+'/')));
        const file='.local/browser-lab/'+stamp+'-actual-session-'+width+'x'+height+'.png';await browser.screenshot(file);record.pages.push({width,height,screenshot:file,layout,requestCount:requests.length,actualJInput:true,selected});await browser.close();browser=undefined;
      }
      record.directCallerBundlePreserved=true;record.actualJtoKPage=true;record.noResponseInterception=true;
    }finally{try{await browser?.close();}finally{await server.close();}}
    record.snapshotFiles=prepare.verifyScanSnapshots(state.index);for(const [path,expected]of frozen)assert.equal(sha(path),expected);record.newProductsTested=true;
  }
}catch(error){failure=error;}
try{record.after=snapshot();assert.equal(record.after.head,record.before.head);if(run)assert.equal(record.after.status,'');}catch(error){failure=failure?new Error(failure.message+'; post-check: '+error.message):error;}
Object.assign(record,{endedAt:new Date().toISOString(),status:failure?'failed':run?'passed':'plan-ready',error:failure?.message??null});const receipt=join(out,stamp+'-result.json');writeFileSync(receipt,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:record.status,receipt,newProductsTested:record.newProductsTested,actualJtoKPage:record.actualJtoKPage??false,error:record.error},null,2));if(failure)process.exitCode=1;
