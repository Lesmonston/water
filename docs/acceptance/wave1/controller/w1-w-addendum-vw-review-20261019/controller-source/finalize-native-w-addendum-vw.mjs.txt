// Controller archival and status changes after the tested integration fast-forward.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {basename,dirname,join,relative,resolve} from 'node:path';
const root=resolve('.'),before='50d783d2338448a3b03934dc5a41231118707b1d',tested='e38b81cf75d0fb65877bbb7d774e4da7b3a09678';
const worker=join(root,'.worktrees/w'),integration=join(root,'.worktrees/integration-vw-20261019');
const out='docs/acceptance/wave1/controller/w1-w-addendum-vw-review-20261019';
const review='docs/acceptance/wave1/controller/WATER-W1-W-ADDENDUM-01-REVIEW-20261019.md';
const json=p=>JSON.parse(readFileSync(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
function git(argv,encoding='utf8',input) {const r=spawnSync('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...argv],{cwd:root,encoding,input,windowsHide:true,timeout:30000,maxBuffer:96*1024*1024});assert(!r.error&&r.status===0,String(r.stderr));return encoding?r.stdout.trim():r.stdout;}
assert.equal(git(['rev-parse','HEAD']),tested);
assert.equal(git(['-C',worker,'rev-parse','HEAD']),'df9255b73e1037eda7599098de900bb4705f5921');
assert.equal(git(['-C',worker,'status','--porcelain','--untracked-files=all']),'');
assert.equal(git(['-C',integration,'status','--porcelain','--untracked-files=all']),'');
const receiptDir=join(root,'.local/checks/controller-w-addendum-20261019'),jointDir=join(root,'.local/checks/controller-vw-joint-20261019');
const audit=json(join(receiptDir,'2026-10-19T07-15-52.902Z-23884-evidence-audit.json'));
const independent=json(join(receiptDir,'2026-10-19T07-16-49.238Z-10976-independent-review.json'));
const prep=json(join(jointDir,'2026-10-19T07-18-44.942Z-21268-preparation.json'));
const joint=json(join(jointDir,'2026-10-19T07-22-31.341Z-25988-joint-result.json'));
for(const r of [audit,independent,prep,joint]) assert.equal(r.status,'passed');
assert.equal(independent.independentExamples.length,56);assert.equal(joint.nativeDialogsObserved,2);assert.equal(joint.integrationCommit,tested);
assert(joint.cases.every(c=>c.status==='passed'&&c.nativeProcessRemaining===false&&c.httpPortClosed&&c.runnerExit.code===0));
const freeze=json('contracts/native-review-addendum-v1/freeze.lock.json'),frozen=new Map();
for(const p of freeze.inheritedLocks) for(const f of json(p).files) frozen.set(f.path,f.sha256);
for(const f of freeze.files) frozen.set(f.path,f.sha256);assert.equal(frozen.size,341);
for(const dir of [root,integration]) for(const [p,sha] of frozen) assert.equal(hash(readFileSync(join(dir,p))),sha,p);
for(const f of freeze.preservedSubmissionFiles) assert.equal(hash(readFileSync(f.path)),f.sha256);
const delivered=git(['diff','--name-only','-z',before,tested]).split('\0').filter(Boolean);
assert.equal(delivered.length,2807);
const batch=git(['cat-file','--batch'],null,delivered.map(p=>'df9255b73e1037eda7599098de900bb4705f5921:'+p+'\n').join(''));
let cursor=0;
for(const p of delivered) {
  assert(p.startsWith('prototypes/native-review/')||p.startsWith('docs/acceptance/wave1/w/')||p.startsWith('docs/dispatch/reports/WATER-W1-W'));
  const end=batch.indexOf(10,cursor),size=Number(batch.subarray(cursor,end).toString().split(' ')[2]);assert(Number.isInteger(size));
  const bytes=batch.subarray(end+1,end+1+size);cursor=end+2+size;
  for(const tree of [root,integration,worker]) assert.deepEqual(readFileSync(join(tree,p)),bytes,p+': retained committed bytes');
}
assert.equal(cursor,batch.length);
mkdirSync(out,{recursive:true});writeFileSync(join(out,'.gitattributes'),'*.json -text\n*.log -text\n*.txt -text\n*.png -text\n*.md -text\n');
const entries=[];
function archive(source,target) {
  const p=resolve(source);assert(!relative(root,p).startsWith('..'));assert(lstatSync(p).isFile()&&!lstatSync(p).isSymbolicLink());
  const bytes=readFileSync(p),dest=join(out,target);assert(!existsSync(dest),dest);
  mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,bytes,{flag:'wx'});assert.deepEqual(readFileSync(dest),bytes);
  entries.push({source:relative(root,p).replaceAll('\\','/'),archive:dest.replaceAll('\\','/'),bytes:bytes.length,sha256:hash(bytes)});
}
function walk(dir,prefix) {
  for(const f of readdirSync(dir,{withFileTypes:true})) {assert(!f.isSymbolicLink());const p=join(dir,f.name),dest=prefix+'/'+f.name;
    if(f.isDirectory()) walk(p,dest);else {assert(/\.(json|log|txt|png)$/.test(f.name));archive(p,dest);}}
}
walk(receiptDir,'controller-w');walk(jointDir,'joint');
for(const [tree,label] of [[join(root,'.worktrees/review-w-addendum-20261019'),'browser-review'],[integration,'browser-integration']]) {
  const base=join(tree,'.local/browser-lab');
  for(const f of readdirSync(base,{withFileTypes:true})) {
    if(f.isDirectory()&&/^native-review-(download|screenshots)-/.test(f.name)) walk(join(base,f.name),label+'/'+f.name);
    else if(f.isFile()&&/^native-review-(1440x1000|900x800|cancel)\.png$/.test(f.name)) archive(join(base,f.name),label+'/'+f.name);
  }
}
for(const c of joint.cases) if(c.download) archive(c.download.source,'joint-download/'+basename(c.download.source));
for(const p of ['docs/dispatch/reports/WATER-W1-W-ADDENDUM-01-REPORT.md','docs/acceptance/wave1/w/addendum-01/ARCHIVE.json','docs/acceptance/wave1/w/addendum-01/RUN-AUDIT.json']) archive(join(worker,p),'submitted/'+basename(p));
for(const p of ['audit-native-w-addendum-submission.mjs','review-native-w-addendum.mjs','prepare-native-vw-integration.mjs','native-vw-launch-once.mjs','native-vw-ui-once.ps1','native-vw-private-browser.mjs','check-native-vw-joint.mjs','finalize-native-w-addendum-vw.mjs']) archive(join(root,'scripts/acceptance',p),'controller-source/'+p+'.txt');
entries.sort((a,b)=>a.archive.localeCompare(b.archive));
writeFileSync(join(out,'ARCHIVE.json'),JSON.stringify({archive_version:'water.controller.w-addendum-vw.v1',totalFiles:entries.length,totalBytes:entries.reduce((n,e)=>n+e.bytes,0),entries},null,2)+'\n');
const summary='A–W及七补单均VERIFIED（Windows受控范围）。W补单接收df9255b/受测020cd89，隔离集成e38b81c已快进主线；预算修复、独立五测/56项入口检查及真实V→W固定启动器/HTTP/Chrome/实际下载通过。本次原生系统窗口恰2（取消/确认各一次），复用原总控60字面/74逻辑字节夹具，无新fixture或普通payload内容读取，进程正常结束、端口关闭。341冻结及全部旧W归档保持。当前无未结外贴票或新READY票；真实用户scope、生产竞态、自然手势鉴真、macOS和桌面未验收，M1仍未完成。';
const oldSummary=readFileSync('README.md','utf8').match(/\*\*当前阶段：(.*?)\*\*/s)[1];
function update(path,fn) {assert(!frozen.has(path),'Do not edit frozen control '+path);const old=readFileSync(path,'utf8'),next=fn(old);assert.notEqual(next,old,path);writeFileSync(path,next);}
for(const p of ['README.md','docs/STATUS.md','docs/CONTROLLER-WORKFLOW.md','docs/dispatch/README.md']) update(p,s=>s.replaceAll(oldSummary,summary));
update('README.md',s=>s.replace(/\[R补单01\/T\/U已验收并集成\][^\n]+下面为历史批次。/,'[W补单01与真实V→W联合验收](docs/acceptance/wave1/controller/WATER-W1-W-ADDENDUM-01-REVIEW-20261019.md)已通过并集成，A–W及七补单VERIFIED（Windows受控范围），没有待重贴的旧票。真实用户scope、macOS、桌面与M1仍未完成。下面为历史批次。').replace(/A–U及六补单均已VERIFIED（Windows受控范围）；当前W原票返修、补单01 READY。V已集成、W待补单交回，完整宿主用户闭环仍待联合验收。/,'A–W及七补单均已VERIFIED（Windows受控范围）；真实V→W开发预览链已通过，真实用户scope、macOS、桌面与M1仍未完成。'));
update('AGENTS.md',s=>s.replace(/^最新状态（2026-10-19）：[^\n]+/m,'最新状态（2026-10-19）：'+summary+' 共同基线30a803537602211ed2a11c106c63fd27cefb260f，旧336与补单5条目/14继承锁合计341冻结保持，原W报告/ARCHIVE/RUN-AUDIT哈希保持。W原执行树仍无物理fixture权限；新wrapper继续从主检出绝对路径读取，不往W树追加控制提交。正式票/manifest及docs/acceptance/wave1/controller/WATER-W1-W-ADDENDUM-01-REVIEW-20261019.md优先于以下历史；旧票与本补单均不重贴。'));
update('docs/STATUS.md',s=>s.replace('## W正式收单返修，补单01 READY（2026-10-19，最新）','## W补单01与真实V→W联合验收完成（2026-10-19，最新）\n\n[总控验收](acceptance/wave1/controller/WATER-W1-W-ADDENDUM-01-REVIEW-20261019.md)：接收df9255b/实现020cd89，集成e38b81c已纳主线；旧1642及新1148份worker归档保持，三final/五条稳定负控链审计、独立完整五测与56项公开入口检查通过。集成新私有离线V构建、完整五测及真实V→W两窗/HTTP/浏览器/实际Q下载通过；两原生PID退出、端口关闭，无强制终止。受控Windows验收通过，M1及真实用户scope/macOS/桌面仍未完成，下一波须先明确范围与权限。\n\n## W正式收单返修，补单01 READY（2026-10-19，历史）'));
update('docs/CONTROLLER-WORKFLOW.md',s=>s.replace(/^最新2026-10-19：A–W及七补单[^\n]+/m,'最新2026-10-19：'+summary+' [W补单及真实联合验收](acceptance/wave1/controller/WATER-W1-W-ADDENDUM-01-REVIEW-20261019.md)与manifest为当前状态，以下为历史。'));
update('docs/dispatch/README.md',s=>s.replace('- [W补单01 READY与原对话续做句]','- [W补单01与真实V→W联合验收已通过](../acceptance/wave1/controller/WATER-W1-W-ADDENDUM-01-REVIEW-20261019.md)\n- [W补单01派前READY与续做句（历史）]'));
update('docs/ROADMAP.md',s=>s.replace(/A–U及六补单VERIFIED（Windows受控范围）；V已集成、W收单发现预算回归[^|]+/,'A–W及七补单VERIFIED（Windows受控范围）；W预算修复及真实V→W两窗/HTTP/Chrome/下载已验收集成。真实用户scope/macOS/桌面未验收，M1未完成，见[联合验收](acceptance/wave1/controller/WATER-W1-W-ADDENDUM-01-REVIEW-20261019.md) '));
update('docs/dispatch/wave1/PLAN.md',s=>s.replace(/^\*\*当前（2026-10-19）：[^\n]+/m,'**当前（2026-10-19）：'+summary+'** 详[W补单与联合验收](../../acceptance/wave1/controller/WATER-W1-W-ADDENDUM-01-REVIEW-20261019.md)，以下为派前历史。'));
update('docs/dispatch/tickets/WATER-W1-W-NATIVE-REVIEW-20261019.md',s=>s.replace(/^当前收单状态（2026-10-19）：[^\n]+/m,'当前收单状态（2026-10-19）：补单01接收df9255b/受测020cd89，真实V→W联合验收通过，VERIFIED（Windows受控范围），已集成主线e38b81c。详[总控最终验收](../../acceptance/wave1/controller/WATER-W1-W-ADDENDUM-01-REVIEW-20261019.md)。以下为原派前要求，原预算失败保留为历史；不重贴原票。'));
update('docs/dispatch/tickets/WATER-W1-W-ADDENDUM-01-20261019.md',s=>s.replace(/\n2026-10-19。原W票CHANGES_REQUESTED/,'\n当前状态（2026-10-19）：VERIFIED（Windows受控范围），接收df9255b/受测020cd89，集成e38b81c及真实V→W两窗联合验收通过。详[总控验收](../../acceptance/wave1/controller/WATER-W1-W-ADDENDUM-01-REVIEW-20261019.md)。无需重贴或继续实现；以下保留原补单派前要求。\n\n派前历史：2026-10-19。原W票CHANGES_REQUESTED'));
const now=new Date().toISOString(),mp='docs/dispatch/wave1/manifest.json',rp='docs/dispatch/registry.json';
for(const p of [mp,rp]) {
  const d=json(p),oldTasks=d.tasks.filter(t=>!['WATER-W1-V','WATER-W1-W'].includes(t.id));
  for(const t of d.tasks.filter(t=>['WATER-W1-V','WATER-W1-W'].includes(t.id))) {
    t.status='VERIFIED';t.verifiedAt=now;t.jointReview=review;t.jointIntegrationCommit=tested;
    t.deferredJointValidation='Completed: actual fixed V executable -> W.launchNative -> HTTP/private headless Chrome/actual Q attachment. Two native dialogs (cancel/select), original controller synthetic fixture only.';
    t.verificationScope='Windows controlled acceptance only; actual fixed-launcher joint chain passed. Real user scopes, hostile races, natural gesture authentication, macOS, desktop packaging and M1 remain unverified/incomplete.';
    if(t.id==='WATER-W1-W') {
      t.originalSubmittedCommit??=t.submittedCommit;t.originalImplementationCommit??=t.implementationCommit;t.originalControllerReview??=t.controllerReview;
      Object.assign(t,{submittedCommit:'df9255b73e1037eda7599098de900bb4705f5921',implementationCommit:'020cd89cd592471836cca8fa5d263176348b2165',reviewedCommit:'020cd89cd592471836cca8fa5d263176348b2165',acceptedCommit:'df9255b73e1037eda7599098de900bb4705f5921',acceptedAt:now,controllerReview:review,revisionDispatchStatus:'VERIFIED',integrationCommit:tested,integrationBranch:'controller/water-w1-vw-integration-20261019',integrationWorktree:integration.replaceAll('\\','/'),integratedAt:now,activityEvidence:'Addendum receipt and original/new archives audited; standalone 5/5, 56 independent checks, integrated 5/5 and actual V-W joint chain passed.'});
      Object.assign(t.addendum01,{status:'VERIFIED',submittedCommit:t.submittedCommit,implementationCommit:t.implementationCommit,reviewedCommit:t.reviewedCommit,acceptedCommit:t.acceptedCommit,verifiedAt:now,controllerReview:review,integrationCommit:tested,startedAt:'2026-10-19T04:32:27.745Z',startEvidence:'docs/acceptance/wave1/w/addendum-01/wrapper/2026-10-19T04-32-27.744Z-30280-resume-result.json'});
    }
  }
  assert.deepEqual(d.tasks.filter(t=>!['WATER-W1-V','WATER-W1-W'].includes(t.id)),oldTasks);
  const oldSlots=d.slots?.filter(s=>!['v','w'].includes(s.id));if(d.slots) {for(const s of d.slots.filter(s=>['v','w'].includes(s.id))) s.state='verified-preserved';assert.deepEqual(d.slots.filter(s=>!['v','w'].includes(s.id)),oldSlots);}
  if(p===mp) {d.previousAcceptedBatch=d.lastAcceptedBatch;d.lastAcceptedBatch={tasks:['WATER-W1-V','WATER-W1-W','WATER-W1-W-ADDENDUM-01'],status:'VERIFIED',review,integrationCommit:tested,date:'2026-10-19',scope:'Windows controlled; M1 remains incomplete'};d.nativeHostJointStatus='PASSED';d.nativeHostJointReview=review;}
  else {d.stage='wave1-a-w-verified-windows-controlled';d.note=summary;}
  writeFileSync(p,JSON.stringify(d,null,2)+'\n');
}
const final={status:'passed',completedAt:now,submittedW:audit.submitted,testedW:audit.implementation,testedIntegrationCommit:tested,mainFastForwarded:true,deliveredPathsRetained:delivered.length,originalArchive:audit.originalArchive,addendumArchive:audit.addendumArchive,frozenFiles:341,independentEntranceChecks:56,standaloneFiveTests:'5/5',integratedFiveTests:'5/5',actualJointNativeDialogs:2,actualQDownload:true,newPhysicalFixtures:0,ordinaryPayloadContentReads:0,allOtherTaskObjectsAndSlotsUnchanged:true,productChangesOnlyAcceptedWorkerSubmissions:true,controllerArchivedFiles:entries.length,controllerArchivedBytes:entries.reduce((n,e)=>n+e.bytes,0),screenshotsActuallyViewed:6,knownControllerAuditFailuresPreserved:3,macOS:'unverified',realUserScope:'unverified',desktop:'unverified',M1:'incomplete'};
writeFileSync(join(out,'FINAL-AUDIT.json'),JSON.stringify(final,null,2)+'\n');
console.log(JSON.stringify({...final,report:review}));
