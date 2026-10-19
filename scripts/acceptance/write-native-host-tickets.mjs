// Concrete authority tickets; no placeholders, no worker launch.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const root='F:/new/smaltalk/water',m=JSON.parse(readFileSync('docs/dispatch/wave1/manifest.json','utf8')),freeze=JSON.parse(readFileSync('contracts/native-host-batch-v1/freeze.lock.json','utf8'));
for(const lane of ['V','W']){const t=m.tasks.find(t=>t.id==='WATER-W1-'+lane),isV=lane==='V';assert(t&&existsSync(t.worktree));const tests=[...t.expectedTests,...t.expectedBrowserTests];const notes=isV?[
'本票交付真实S→P→R→E/H/Q会话API及单次CLI，不能按case/id返回预期数据，不能调用controller probe代替产品。真实所选根只从SelectedScope.root_path取得，PickerOptions不是路径授权或可读字段，不能改用CLI参数/cwd。确认之后由私有登记guard在成功/错误/observer unwind都撤销本次scope；R自己结束attempt，不复制P/R权限表，不影响宿主既有scope。',
'选择器取消输出selection=cancelled/snapshots=[]；传入R的token预取消仍先真实选择，确认后输出真实cancelled报告，不能混成无报告。native_scope_metadata保持真实标签，policy从实际options getter取值，普通内容/手势/竞态标记保持false；默认wire不带NativeScan完整侧车/原生ID/绝对根路径/能力。',
'库及bin均forbid unsafe，无新FFI。库不读env/fs/时钟/stdin，不起进程或网络；CLI仅args_os解析/协议stdout/固定错误stderr。恰一个初始目录参数、固定scope/session IDs及8/10000/256默认预算按SPEC；stdout恰紧凑UTF-8对象加LF，成功stderr空。无/多参64，其它错误2，不回显argv/路径/OS栈；IO输出失败也不得用unwrap泄漏panic。',
'五测依次覆盖真实取消不登记/原有scope保持；真实完整会话且与独立R/E/H/Q逐值；预取消/observer取消和panic释放；容量/duplicate等错误不撤销别人；wire/私有有效证据与真实CLI错误。库UI每窗前测试stderr发WATER_PICKER_CASE cancel/select，冻结driver只点击本次测试PID固定title的系统按钮。CLI实际成功/取消由bridge直接启动真实V.exe检查，不放假exe。',
'实际子目录选择不同于起始目录的S行为已有独立验收；本波不依赖新UIA选子目录工具。V_SELECTED_ROOT负控改真实传R根为所选根的父目录，保留R身份门；V_RELEASED让实际guard漏撤销而真实registry多一项；V_NATIVE_SOURCE改真实构造/Serialize来源标签。均完整五红/恢复五绿，不改S/R或硬编码fixture。',
'本树冻结adapter只在.local/native-walk-fixtures固定batch调用原R工厂创建/核对4目录、6文件条目含1硬链接/1junction，字面60字节/含硬链接逻辑74。仅工具有限读已知payload校验；Rust仅index/元数据。全部原位保留，不手工重造或清理，不读真实HOME/盘根/其它项目。'
]:[
'本票是新的prototypes/native-review；不改T/I或其它产品。开工先按contracts/native-review-v1/ATTRIBUTES.json创建本目录.gitattributes，HTML/CSS/MJS固定LF，不改根/旧属性。旧water.scan-review-bundle.v1必须真实委托T模型并保持原标签；新native-session协议按独立原生规则验证，不改tag后调用T。',
'原生确认单快照的未知/保护、实际祖先原因、源totals、Q白名单/alias/计数/尺寸都严格一致；native Windows名字规则遵守R。HTML字面用旧协议的合法文本样本，不放宽原生路径。源policy和no-follow/预算可见，Completed只代表策略内覆盖；选择取消无报告/无下载，确认后扫描取消有真实报告和Q下载，scope根空串与None分明。',
'host readSession只收Uint8Array/Buffer，每块复制，严格UTF-8/64MiB+可选单LF/单紧凑对象/无BOM/无重复键，错误固定；旧协议不从native stream进入。startFromStream必须真实readSession→startServer，在首次await前同步捕获服务器输入，不能文件/env/样例fallback。',
'launch.mjs固定本树.local/next-target/debug/water-native-session.exe，经realpath/普通文件/项目内校验，args恰[initialDirectory]、shell=false、stdin ignore/stdout+stderr raw pipe；不接受binaryPath/env/PATH/Cargo/任意命令。初始目录仅可信本机CLI/Node参数，页面/HTTP没有路径/扫描/进程入口。等退出0且完整合法bundle才开页；仅杀自有child，诊断stderr不回显，启动失败固定净化错误。',
'独立W树没有V产品。关键实际组装用公开startFromStream消费保留的实际S/P/R/E/H/Q捕获，再走HTTP/Chrome/真实下载。测试可运行冻结scripts/acceptance/native-session-stream-probe.mjs输出某一保留捕获（argv是0..7的固定case index），明确是回放；不能放假water-native-session.exe或加生产测试模式。真实V程序的固定launchNative整链由总控收两单后联合验收，回执不得冒称本票已运行该链。',
'五测试为模型/协议、原字节流及启动器无效参数、HTTP/隐私三项，以及原生/旧输入实际页面下载、双尺寸/两种取消/安全两项。覆盖八份真实捕获与旧T24份，两份合成重命名原生变体（不冒称新扫描）；严格UTF-8负控应破坏合法自由路径及对应title中的字节，使宽松解码仍能过模型，真实观察W_STREAM_BOUNDARY。',
'实际系统鼠标事件点击下载到本树.local/browser-lab新私有目录，逐文件与当前Q原字节、固定attachment名/headers比较；选择/筛选不能改变整份导出。失败仍执行其它独立样本并保存native-review-1440x1000.png、native-review-900x800.png、native-review-cancel.png三当前图，实际查看后记录，不把png存在当正确。最多一个独立Chrome，profiles/下载保留，无物理扫描fixture或真实用户目录权限。'
];
const allowed=t.allowedFiles.map(p=>'- '+p).concat(t.allowedPrefixes.map(p=>'- '+p+' 内本票新文件（V src仅Rust；证据只json/log/txt/png）')).join('\n');
const text=[
'# '+t.id+'：'+t.title,'',
'总控2026-10-19，正式票。只有主manifest本票READY且baselineStatus=PASSED才开工。V/W可同波分别外贴，无自动实现者。','',
'| 项 | 唯一值 |','|---|---|',
'| 权威票面 | '+root+'/'+t.ticket+' |','| 唯一树 / 分支 | '+t.worktree+' / '+t.branch+' |',
'| 精确首次HEAD | '+t.baseCommit+' |','| tag | water-w1-native-host-base-20261019 |',
'| manifest | '+root+'/docs/dispatch/wave1/manifest.json |',
'| 冻结 | '+t.contractLock+'；'+freeze.files.length+'新锁条目/13继承锁，'+freeze.uniqueFiles+'唯一文件，旧291不变 |',
'| 实现目录 | '+t.outputRoot+' |','| 新报告 | '+t.worktree+'/'+t.report+' |',
'| 证据 | '+t.worktree+'/docs/acceptance/wave1/'+t.slot+'/ |','',
'先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、ADR-014、W1-NATIVE-HOST-WORKER-RULES、NATIVE-HOST-PLAN及READY-REPORT、contracts/native-host-batch-v1/{COMMON.md,TESTS.json}、native-session-v1/SPEC与cases/PROVENANCE，以及'+t.spec+'。V再读实际S/P/R/E/H/Q接口；W再读ATTRIBUTES及真实I/T模型。主检出票面权威，执行树早于正式票，直接读绝对路径，不merge取票。','',
'首次必须精确HEAD/分支且干净、实现目录不存在、冻结一致；不符保留现场受阻，不reset或换树。总控已在本树实际baseline，开工仍先复核：','',
'\x60\x60\x60powershell','node scripts/native-host-check.mjs --task '+t.id+' --mode baseline','\x60\x60\x60','',
'baseline只测既有依赖、捕获和工具，不代表V/W产品或五测试通过。'+(isV?'本树factory已准备固定合成batch，继续复用，禁止清理。':'W baseline只读冻结捕获并做平台stream/HTTP/下载探针，没有访问原controller/r物理fixture。'),'',
'## 实现与行为','',...notes.map(x=>x+'\n'),
'## 独占白名单','',allowed,'',
'其余只读，包括旧A–U源码/测试/根Cargo、所有契约/冻结输入/helper/锁、台账、上游与其它树。接口/依赖/权限冲突写受阻报告交总控，不问用户临时放宽。'+(isV?'本票锁只用helper lock模式离线生成，无新包/dev/build依赖或其它bin。':'零npm，不建package.json，不安装/下载依赖。'),'',
'## 验证、负控和交回','',
'精确五顶层：'+tests.join('、')+'。无skip/filter/嵌套凑数；一树一次一门，单子命令180秒。'+(isV?'Rust1.95/MSVC/private offline/locked/jobs1；driver测试必须同时出现真实cancel/select。':'最多一个独立Chrome，不加载真实用户profile。'),'',
'先写完整五测与可运行骨架，'+(isV?'骨架真实调用S弹窗但关键会话行为可先缺失；先lock再red-behavior。':'骨架需完成服务/页面ready和三图握手，不能缺文件或CDP超时造红。')+' 目标消息含'+t.proofTargets.behavior+'；随后实现并suite五绿。','',
'格式/样式/源码和测试字节稳定后，逐项真实改坏生产逻辑，red-nc1、red-nc2、red-nc3命中'+t.proofTargets.nc1+'/'+t.proofTargets.nc2+'/'+t.proofTargets.nc3+'。每红立即原字节恢复、核hash、suite完整五绿再下一项。不改测试/runner/超时，不留测试开关。初次行为红保留；如最终字节不同，稳定版重放相同缺陷red-behavior后恢复suite，说明为实现后重放，不能冒称首次先红。四条当前字节链均由final proofAudit核。','',
'统一形态（mode分别为red-behavior、suite、red-nc1/2/3；V另有lock）：','',
'\x60\x60\x60powershell','node scripts/native-host-check.mjs --task '+t.id+' --mode suite','\x60\x60\x60','',
'提交实现/测试得到干净SHA，在同一SHA串行跑全部final：','',
'\x60\x60\x60powershell',...t.expectedFinalModes.map(mode=>'node scripts/native-host-check.mjs --task '+t.id+' --mode '+mode+' --final'),'\x60\x60\x60','',
'所有输出在本树.local/checks/'+t.id+'/。原字节归档本票证据目录及ARCHIVE.json（来源/长度/SHA），含全部失败/原好坏恢复快照和图片；不纳target/cache/binary/profile/fixture payload。预置证据.gitattributes冻结不改，log显式-f。显式逐文件add，不全树add/clean/reset/merge/rebase/push。证据/报告提交只追加证据，不夹未复测产品改动。','',
'报告写完整基线/受测SHA/报告提交定位、逐需求/命令退出/全部失败/红绿/实际模型/未验证/物理与来源边界。'+(isV?'真实CLI成功/取消与严格stdout在bridge检查；不说W链已接好。':'固定启动器真实V链未运行需明确写出；总控必须在联合树用真正V.exe再验。')+' Windows受控不冒充macOS/自然手势鉴真/恶意竞态/真实用户scope/桌面/M1完成。完成仅SUBMITTED，交回后停改。','',
'报告首行及通知：','',
'\x60\x60\x60text',t.id+' 任务已完成，任务报告在 '+t.worktree+'/'+t.report,'\x60\x60\x60','',
'受阻将“已完成”改为“受阻”，列最小补充需求；不擅自扩权限或接口。',''
].join('\n');writeFileSync(t.ticket,text);writeFileSync('docs/dispatch/wave1/PASTE-'+lane+'.txt','请读取 '+root+'/'+t.ticket+'，开始执行任务。\n');
}
console.log(JSON.stringify({tickets:2,base:m.tasks.at(-1).baseCommit}));
