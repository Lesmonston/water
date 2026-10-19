// Controller dispatch readiness, archival and handoff. Never starts implementers.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {basename,dirname,join,relative,resolve} from 'node:path';
const root=resolve('.'),mp='docs/dispatch/wave1/manifest.json',rp='docs/dispatch/registry.json';
const base='1c152a1ed317fb51498503de837bb228c50dc663',oldHead='8ce55f2';
const out='docs/acceptance/wave1/controller/w1-interactive-preflight-20261019';
const report='docs/dispatch/wave1/INTERACTIVE-READY-REPORT-20261019.md';
const json=p=>JSON.parse(readFileSync(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
function git(args,cwd=root,encoding='utf8',input) {const r=spawnSync('git',['-c','core.hooksPath=NUL','-c','core.fsmonitor=false',...args],{cwd,encoding,input,windowsHide:true,timeout:30000,maxBuffer:64*1024*1024});assert(!r.error&&r.status===0,String(r.stderr));return encoding?r.stdout.trim():r.stdout;}
const m=json(mp),registry=json(rp),oldM=JSON.parse(git(['show',oldHead+':'+mp])),oldR=JSON.parse(git(['show',oldHead+':'+rp]));
assert.deepEqual(m.tasks.slice(0,23),oldM.tasks);assert.deepEqual(registry.tasks.slice(0,23),oldR.tasks);assert.deepEqual(registry.slots.slice(0,23),oldR.slots);
const lockPath='contracts/interactive-batch-v1/freeze-r2.lock.json',lock=json(lockPath),prior=new Map(),all=new Map();
for(const p of lock.inheritedLocks)for(const f of json(p).files){prior.set(f.path,f.sha256);all.set(f.path,f.sha256);}assert.equal(prior.size,341);
for(const f of lock.files)all.set(f.path,f.sha256);assert.equal(new Set([...all.keys(),...lock.gitObjects.map(f=>f.path)]).size,426);
for(const tree of [root,...['x','y','z'].map(s=>join(root,'.worktrees',s))]) {
 for(const [p,expected] of all)assert.equal(hash(readFileSync(join(tree,p))),expected,p);
 for(const f of lock.gitObjects)assert.equal(git(['hash-object','--path='+f.path,f.path],tree),f.objectId);
}
mkdirSync(out,{recursive:true});writeFileSync(join(out,'.gitattributes'),'.gitattributes text eol=lf\n*.json -text\n*.log -text\n*.txt -text\n*.png -text\n');
const entries=[];
function archive(source,target){const p=resolve(source);assert(!relative(root,p).startsWith('..'));assert(lstatSync(p).isFile()&&!lstatSync(p).isSymbolicLink());const b=readFileSync(p),to=join(out,target);mkdirSync(dirname(to),{recursive:true});if(existsSync(to))assert.deepEqual(readFileSync(to),b);else writeFileSync(to,b,{flag:'wx'});assert.deepEqual(readFileSync(to),b);entries.push({source:relative(root,p).replaceAll('\\','/'),archive:to.replaceAll('\\','/'),bytes:b.length,sha256:hash(b)});}
function walk(dir,prefix){for(const f of readdirSync(dir,{withFileTypes:true})){assert(!f.isSymbolicLink());const path=join(dir,f.name),to=prefix+'/'+f.name;if(f.isDirectory())walk(path,to);else{assert(/\.(json|log|txt|png)$/.test(path));archive(path,to);}}}
walk('.local/interactive-wave-preflight-20261019/initial-freeze-failures','initial-failure-reproductions');
const readiness=[];
for(const lane of ['X','Y','Z']) {
 const task=m.tasks.find(t=>t.id==='WATER-W1-'+lane),tree=task.worktree,dir=join(tree,'.local/checks',task.id);
 assert.equal(task.baseCommit,base);assert.equal(task.helper,'scripts/interactive-wave-check-r2.mjs');assert.equal(task.contractLock,lockPath);
 assert.equal(git(['rev-parse','HEAD'],tree),base);assert.equal(git(['status','--porcelain','--untracked-files=all'],tree),'');assert(!existsSync(join(tree,task.outputRoot)));
 const results=readdirSync(dir).filter(n=>n.endsWith('-baseline-result.json')).sort();assert.equal(results.length,1);const r=json(join(dir,results[0]));
 assert.equal(r.status,'passed');assert.deepEqual(r.before,{head:base,status:''});assert.deepEqual(r.after,r.before);assert.equal(r.nativeDialogs,0);assert.equal(r.productTestsRun,false);
 walk(dir,lane.toLowerCase());
 if(lane==='Y'){walk(join(tree,'.local/checks/interactive-driver'),'y-driver');const recapture=json('.local/interactive-wave-preflight-20261019/private-download/result.json');assert.equal(recapture.status,'passed');assert(recapture.actualMouseClick&&recapture.actualWServer);walk('.local/interactive-wave-preflight-20261019/private-download','y-private-download');assert.equal(r.baseline.browser.downloadBytes,5096);}
 else{archive(r.baseline.fixtureIndex,lane.toLowerCase()+'-fixture/index.json');}
 const evidence=out+'/'+lane.toLowerCase()+'/'+results[0];readiness.push({task:task.id,title:task.title,baseline:evidence,head:base,nativeDialogs:0,newProductTested:false});
 for(const d of [m,registry]){const t=d.tasks.find(t=>t.id===task.id);Object.assign(t,{status:'READY',baselineStatus:'PASSED',baselineEvidence:evidence,preflightEvidence:report,readyOn:'2026-10-19',newProductTestsRun:false});}
 registry.slots.find(s=>s.id===lane.toLowerCase()).state='ready';
}
for(const p of ['scripts/acceptance/ready-interactive-dispatch.mjs','scripts/acceptance/revise-interactive-preflight.mjs','scripts/interactive-wave-check-r2.mjs','scripts/acceptance/recapture-interactive-platform-download.mjs','scripts/acceptance/native-vw-private-browser.mjs'])archive(p,'controller-source/'+basename(p)+'.txt');
entries.sort((a,b)=>a.archive.localeCompare(b.archive));
const totalBytes=entries.reduce((n,f)=>n+f.bytes,0);writeFileSync(join(out,'ARCHIVE.json'),JSON.stringify({archive_version:'water.interactive.preflight.v1',totalFiles:entries.length,totalBytes,entries},null,2)+'\n');
m.status='A_W_VERIFIED_INTERACTIVE_XYZ_READY';m.interactivePreflightStatus='PASSED';m.interactivePreflightEvidence=report;m.interactiveFreeze=lockPath;
registry.stage='wave1-interactive-xyz-ready';registry.updatedOn='2026-10-19';
const summary='A–W及七补单保持VERIFIED（Windows受控范围）。下一波X持续原生宿主、Y可操作扫描工作台、Z另行同意的根package.json读取，三独立树/分支已冻结并实际baseline通过，READY待分别外贴，尚未启动实现者。共同精确基线1c152a1ed317fb51498503de837bb228c50dc663；r2冻结202物理锁条目+4份旧资产Git对象校验/15继承锁/426唯一约束，旧341保持。派前原生系统窗口0；X本树原工厂60字面/74逻辑字节，Z本树新合成payload524474字节，Y无物理fixture。未做新产品测试；真实用户scope、生产竞态、macOS、桌面与M1仍未验收。';
registry.note=summary;writeFileSync(mp,JSON.stringify(m,null,2)+'\n');writeFileSync(rp,JSON.stringify(registry,null,2)+'\n');
const oldSummary=readFileSync('README.md','utf8').match(/\*\*当前阶段：(.*?)\*\*/s)[1];
for(const p of ['README.md','docs/STATUS.md','docs/CONTROLLER-WORKFLOW.md','docs/dispatch/README.md','docs/dispatch/wave1/PLAN.md']) {let s=readFileSync(p,'utf8');assert(s.includes(oldSummary),p);s=s.replaceAll(oldSummary,summary);writeFileSync(p,s);}
let agents=readFileSync('AGENTS.md','utf8');agents=agents.replace(/^最新状态（2026-10-19）：[^\n]+/m,'最新状态（2026-10-19）：'+summary+' 正式票/manifest、docs/dispatch/wave1/INTERACTIVE-READY-REPORT-20261019.md及派前勘误01优先。旧W报告/归档哈希及其执行树无物理fixture权限保持；旧票/补单不重贴，X/Y/Z各交独立执行对话。');writeFileSync('AGENTS.md',agents);
let status=readFileSync('docs/STATUS.md','utf8');status=status.replace('## W补单01与真实V→W联合验收完成（2026-10-19，最新）','## X/Y/Z三票派前完成（2026-10-19，最新）\n\n[正式READY回执](dispatch/wave1/INTERACTIVE-READY-REPORT-20261019.md)：三票共同精确1c152a1基线，各自干净且产品目录不存在；X既有P/R/A/V与共享token、Y双向回放/W模型/平台实际Q下载、Z P/N/U与原生单名句柄读取通过。0原生窗口，所有新产品仍未实现/未测试。按用户要求一次外贴三条独立线，不等待X实现才让Y开工，Z同波独立推进；实现后真实X→Y整链由总控验收。派前换行失败与r2纠正均归档，旧锁/产品未改。\n\n## W补单01与真实V→W联合验收完成（2026-10-19，已收口）');writeFileSync('docs/STATUS.md',status);
let readme=readFileSync('README.md','utf8');readme=readme.replace('## 当前验收与下一波','## 当前验收与下一波\n\n[X/Y/Z本波READY与三条外贴指令](docs/dispatch/wave1/INTERACTIVE-READY-REPORT-20261019.md)：分别安排持续扫描宿主、可操作工作台、额外同意的项目清单读取。三票无产品文件争写，已实际基线，不自动启动执行者。');writeFileSync('README.md',readme);
let dispatch=readFileSync('docs/dispatch/README.md','utf8');dispatch=dispatch.replace('- [W补单01与真实V→W联合验收已通过]','- [X/Y/Z三票READY与外贴指令](wave1/INTERACTIVE-READY-REPORT-20261019.md)\n- [W补单01与真实V→W联合验收已通过]');writeFileSync('docs/dispatch/README.md',dispatch);
const rows=readiness.map(r=>{const t=m.tasks.find(t=>t.id===r.task);return '| '+t.id+' | '+t.title+' | '+t.slot+' / '+t.branch+' | PASSED / READY |';}).join('\n');
const lines=[
'# X/Y/Z 正式READY：三条独立任务一次外贴','',
'2026-10-19。用户要求加快并按波次一次安排。三票已冻结、独立建树、实际baseline通过，现在READY；dispatchedAt/startedAt仍null，没有自动实现者或子代理。READY不代表产品已实现。','',
'| 票 | 本次交付目标 | 唯一槽位/分支 | 派前结果 |','|---|---|---|---|',rows,'',
'共同精确基线 `'+base+'`，tag `water-w1-interactive-base-r2-20261019`；每树干净且产品目录不存在。检查入口统一 `scripts/interactive-wave-check-r2.mjs`，本波冻结 `contracts/interactive-batch-v1/freeze-r2.lock.json`：202物理锁条目+4份旧O/T资源Git对象身份、15继承锁、426唯一约束；旧341及A–W任务/槽位/产品/根Cargo均保持。','',
'## 分别贴入三个执行对话','',
...m.tasks.slice(-3).flatMap(t=>['**'+t.id+'：'+t.title+'**','', '```text','请读取 F:/new/smaltalk/water/'+t.ticket+'，开始执行任务。','```','']),
'## 实际基线与范围','',
'- X：私有离线Rust1.95/MSVC/jobs1构建真实既有V/R/S/P/N/A/U；真实P→R→A得到8条观察，R共享CancelToken预取消得到真实cancelled，V API链接通过；未调用S对话框。X本树原工厂4目录/6文件条目含硬链接及junction，60字面/74逻辑字节，全部留存。',
'- Y：新协议真实双向pipe回放完整/选择取消/确认后取消，经真实W模型校验；独立平台loopback与headless Chrome系统鼠标点击下载当次Q 5096字节。该平台probe是依赖/工具检查，尚未运行新X或新Y，也不把回放冒充真实新宿主。Y没有物理扫描fixture权限。',
'- Z：真实P/N注册根与许可及真实U通过；实际Windows单名NtCreateFile、class1/9/18、只读共享、同句柄有界读取及U分析通过。ABI probe读取262284字节，仅来自新good/exact合成文件；oversize/hardlink在读前拒绝，directory/junction/missing边界通过。新factory固定524474字面payload字节，元数据index与payload保留；该probe不代表新Z同意API已实现。','',
'三条基线并行各jobs1/独立target与cache，Y最多一个私有Chrome，派前原生窗口总数0。无真实用户数据/旧fixture内容读取、无安装/下载依赖、删除/ACL/移动或上游运行。','',
'## 明确提速方式','',
'接口和文件归属提前冻结，Y凭冻结双向回放可独立实现，不等待X产品；Z不依赖X/Y。负控按风险定向跑，不再把每个负控扩大成整套原生UI；稳定字节两个生产负控→逐次原字节恢复，干净SHA完整final一次。X整单窗口上限6（native最终3窗，真正token接线红1窗），Y/Z原生窗0。资源与结束检查写入票面。','',
'X→Y实际固定程序/开始/进度/合作取消/再扫/W报告下载在两单收齐后由总控做联合验收。Z与页面的额外内容同意/新来源侧车是明确后续依赖，不能塞回旧V/W ordinary_content_read=false协议。','',
'## 派前失败与证据','',
'归档首次运行另遇平台baseline默认浏览器上下文的已下载文件在关闭后不存在：原probe在运行时的实际字节断言通过，原目录原样保留；没有用冻结Q重构冒充附件。总控独立再跑一次私有context→真实W服务→实际鼠标下载，关闭context前保存原字节副本及新回执，归档该份真实新下载。无新X/Y实现或原生窗口。归档重入只允许已存在目标逐字节相同，不覆盖差异文件。','',
'[勘误01](INTERACTIVE-PREFLIGHT-ERRATUM-01-20261019.md)记录初版8e73790三门在最前冻结审计失败（未构建/未fixture/未UI），及随后3次0窗文件日志复现。没有把重放日志冒称首轮原始文件；首轮工具输出保留于会话。只修正新证据.gitattributes自有LF和新锁中的4份此前未物理冻结旧资源之Git对象校验，旧341/产品/原锁/helper不改；原freeze.lock与原提交保持历史。准备分支由总控只快进到r2新共同SHA，之后三门完整实际通过。','',
'[总控原字节归档](../../acceptance/wave1/controller/w1-interactive-preflight-20261019/ARCHIVE.json)含'+entries.length+'文件/'+totalBytes+'字节，逐项source/archive/bytes/SHA核对，含所有基线日志、失败复现、回放与实际下载、fixture index，不纳target/cache/binary/profile/physical payload。','',
...readiness.map(r=>'- ['+r.task+'实际PASSED](../../acceptance/wave1/controller/w1-interactive-preflight-20261019/'+r.task.slice(-1).toLowerCase()+'/'+basename(r.baseline)+')'),'',
'新产品测试数仍为0；A–W及七补单只是原Windows受控验收保持。真实用户scope、恶意竞态、自然手势/来源鉴真、macOS、桌面壳/打包/发布与M1仍未验收。后续以单票实际回执收单、独立验收后集成，旧票不重复外贴。',''
];writeFileSync(report,lines.join('\n'));
const audits={status:'READY',createdAt:new Date().toISOString(),baseCommit:base,readiness,oldTasksPreserved:23,oldSlotsPreserved:23,newImplementersStarted:0,newProductTestsRun:false,systemNativeDialogs:0,newFreezeUnique:426,physicalLockEntries:202,legacyGitObjects:4,inheritedLocks:15,originalInheritedFrozen:341,archivedFiles:entries.length,archivedBytes:totalBytes};
writeFileSync(join(out,'READY-AUDIT.json'),JSON.stringify(audits,null,2)+'\n');
console.log(JSON.stringify({...audits,report}));
