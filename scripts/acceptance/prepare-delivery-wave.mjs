// Controller creates contracts and evidence rules, never AC/AD product source.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
const root=resolve('.'),hash=b=>createHash('sha256').update(b).digest('hex');
const put=(p,s)=>{assert(!existsSync(p),p);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,s.endsWith('\n')?s:s+'\n',{flag:'wx'});};
const json=(p,v)=>put(p,JSON.stringify(v,null,2)+'\n');
const specs={
'contracts/desktop-bootstrap-v1/SPEC.md':`# Desktop Bootstrap v1 — AC

2026-10-23。目标是Windows桌面依赖/最小只读壳的可复现基础，尚未接AA/AB，不宣称M1完成。唯一新增依赖初始化者AC；AD/AE不等待它。强依赖的桌面扫描整链另波，须等AC验收后正式冻结。

## 产品与依赖

独立workspace apps/desktop-preview，crate water-desktop-preview，lib water_desktop_preview，bin water-desktop-preview。edition2024/rust-version1.95/publish=false，autobins/autotests/autoexamples/autobenches=false。只有一个lib、一个显式bin、一个显式test bootstrap_v1和build.rs；不加其它targets。直接依赖tauri=2.12.5（default-features=false，features恰wry/common-controls-v6）、serde=1.0.229（derive）、serde_json=1.0.151，唯一build dependency tauri-build=2.7.4。不得加入npm、Tauri CLI、插件、git/path dependencies或改根Cargo。build.rs仅调用tauri_build::build()。配置文件/自有代码可实现上述语义，不复制第三方应用代码。

AC的mode dependencies是全波唯一允许crates.io在线resolve/fetch入口，受CARGO_HOME=.local/desktop-cargo-home、target=.local/desktop-target、TEMP/TMP=.local/desktop-tmp、Rust1.95/jobs1约束；不安装系统软件/全局CLI、不改global config、不下载SDK/运行upstream研究脚本。新锁生成后fetch --locked；缺失许可证/GPL类无可选宽松许可则受阻，记录精确crate与最小需求，不临时换版本。新传递依赖锁/来源/许可证清单入回执。锁后check/test/native离线，禁止root锁或旧cache改写。

## 桌面边界

tauri.conf.json为应用id dev.water.desktop.preview、version0.1.0、productName Water Desktop Preview。build.frontendDist=frontend；bundle.active=false；app.windows=[]，Rust在setup中创建唯一main窗口，title严格Water Desktop Preview、默认1000x760。withGlobalTauri=false；security.capabilities=[]；assetProtocol.enable=false；plugins={}；无capabilities文件/远程权限、invoke_handler、shell/fs/dialog/opener/updater插件、任意命令/路径/网络功能。自有Rust代码forbid unsafe。

固定CSP至少精确包含default-src 'self';script-src 'none';style-src 'self';img-src 'self';connect-src 'none';form-action 'none';frame-ancestors 'none';base-uri 'none'。frontend只有自有静态index.html/styles.css，无JavaScript、iframe、远程字体、资源、链接或文件拖放。正文可见“Water”“桌面壳已启动”“尚未接入扫描”“只读开发预览”；不出现假扫描结果/权限或已支持macOS的宣称。默认系统装饰与现有Water暖色/字样即可，不开展全产品设计或造logo。

公开v1::validate_preview_config(raw:&str)->Result<(),PreviewError>，拒绝上述权限/CSP/窗口/资源矛盾，错误Display仅Desktop preview unavailable.；v1::is_bundled_navigation(url:&str)->bool只接受无用户名/口令/端口/query、精确tauri://localhost或http://tauri.localhost的/index.html（允许规范内部根/fragment），其它http(s)、127.0.0.1、file、data、javascript、about及lookalike全部拒绝。main真正调用同一配置validator，on_navigation真正调用同一导航validator，拒绝新窗口/外部导航。不能只在测试中检而生产不接。

WebView2数据目录在窗口创建之前显式设为该工作树.local/desktop-webview/下新私有目录（不使用用户profile/默认AppData）；TEMP等由helper限定。不扫描、选择或读取任何真实用户目录；没有Node子进程/AA/AB启动或报告下载。本票是桌面初始化，不是产品完整闭环。关闭main时正常退出，子WebView进程和自有资源结束，原profile/日志不清理。

## 验证

tests/bootstrap_v1.rs恰desktop_config_boundary、desktop_navigation_boundary、desktop_embedded_page三顶层，通过真实公开validator、拒绝变体以及真实内嵌资产/配置保持证明。先完整可运行骨架+三测试命中AC_BEHAVIOR，不能缺文件/编译红。稳定nc1真正绕过配置权限拒绝→AC_CAPABILITIES，恢复原字节/test绿；nc2真正让导航放行外部URL→AC_NAVIGATION，恢复原字节/test绿。编译/超时/假生产开关不算负控。

同一干净实现SHA final check/test/native。check fmt+clippy all-targets，test三测。native总票只允许一个桌面窗口、0目录对话框、一次最多30秒，冻结UIA仅观察自有PID/固定title和嵌入文本并关闭、正常exit0；不截桌面像素、不再跑一轮弹窗。失败保留日志并受阻，无自动重试。baseline只编译/运行无UI MSVC小探针及检查已装WebView2，不build Tauri、不运行新壳，不能当产品通过。首次冷构建每命令600秒、单jobs1；普通命令180秒。
`,
'contracts/project-report-v1/SPEC.md':`# Project Report v1 — AD

2026-10-23。在现有AB同一工作台增加一份同源项目报告，将真实元数据与当次可选结构证据并列。只修改本票AB文件；不等待AC，不用Tauri，不改AA/P/R/Q/Z/W、AB model/launch或旧五测试。旧API、水位/确认/同意、安全和取消语义原样，原5测试继续全绿。

## 路由与内存捕获

公开startFromStreams/launchProjectWorkspace API、workspace v1/session.json精确字段和report_url/evidence_url保持；原W报告链接与原结构附件继续存在。主页面每个confirmed最近结果另加class project-report-link、label“查看项目报告”，href精确/reports/<job_id>/；选择取消无新链接。新增assets为project-report.html/css/mjs，另有Node侧project-report-model.mjs，只从固定本目录加载，无iframe或跨源fetch。

project-report-model.mjs公开captureProjectReport(result)，输入为原WorkspaceState.receive返回的六字段job_id/read_manifest/marker/selection/status/bundle；只允许confirmed、同job单项native metadata及合法marker，实际委托旧assertReviewInput/assertMarker并检查关联。输出为本次独立捕获{session:Buffer,metadata:Buffer,evidence:Buffer|null}，session恰下述五字段packet，metadata/evidence为原字符串UTF-8副本，不保存输入对象/Buffer引用。该函数实际用于transport的生产路径，非测试替代实现；不向浏览器暴露Node模块或Buffer。

transport在原严格WorkspaceState.receive已经验证同job/选择/元数据/marker的真实result后，同步复制一份独立内存捕获，必须在随后首个await之前取得原值，不能保存调用者可变引用。内部传给server的projectReports Map只属于本实例。不得新增入站HTTP上传/路径/程序参数或重新读取package.json。只对confirmed结果建立报告，最大仍最近两结果；原selection_cancelled也占最近槽，淘汰/close同时删除该job报告路由/元数据附件并保持原W/evidence清理。

GET/HEAD /reports/<job_id>/返回固定HTML；/reports/<job_id>/session.json恰{report_version:"water.project-report.v1",job_id,read_manifest,bundle,marker}。bundle/marker恰该次已验证原内容；只从捕获生成响应，禁止根据URL索引到另一job或调用方对象。confirmed的snapshot一项，bundle.session_id和snapshot.view.scan_id与job_id绑定。新路由精确匹配，不接受query、额外斜杠、percent绕过、相对穿越、其它方法、未知job/选择取消/淘汰；相应404/405，固定净化错误沿原server。

GET/HEAD /reports/<job_id>/metadata.json：application/json;charset=utf-8、attachment; filename="water-report-1.json"、准确length，正文恰当次snapshots[0].redacted_json的UTF-8原字节，不重新serialize、不捆绑marker。结构证据仍链接/evidence/<job_id>.json，仅observed可见/可下载，恰原observation_json；其它状态包括late completed/partial skipped都404且页面无结构附件。session JSON不是默认脱敏导出，不得称匿名。新固定资产可用根下/project-report.css、/project-report.mjs、可选/project-report-model.mjs，无任意文件服务。

保留精确Host、Origin/token动作校验、CSP/no-store/nosniff、大小预算、严格UTF-8/重复键/模式/旧job拒绝、队列序列化和借用streams生命周期。server只读固定自有静态资源、内存捕获和下载；新UI没有启动/取消/上传/删除或原生权限。不得引入npm/package.json、env、动态文件路径、网络来源或logger泄漏。

## 页面

同一报告页同时展示metadata完成/partial/取消与覆盖边界、protected原因、观察逻辑长度以及allocated/reclaimable未知，保留原E/H真实值及来源；不把结构统计当项目归属/依赖已装/缓存可删，不按名称改risk/category，不展示未提供的统计。Z observed展示原bytes_read和U声明/存在标志/六计数，零值与false/null不丢，醒目“仅结构统计；归属和版本未知，不证明可删”。

未请求/选择取消/扫描取消/内容前取消/未发现/读取失败分别表达。late metadata completed/partial必须保留“扫描完成/保留部分结果”，独立说明“已取消内容读取 · 未读取清单”；真metadata cancelled仍扫描取消。默认false不出现结构面板或附件。只用textContent等安全DOM，不拼接来自报告的HTML/脚本；报告下载metadata/evidence必须分开，label明确。

视觉沿现有AB字体/颜色/限制说明，1440x1000和900x800无横向溢出，可滚动查看全部元数据/结构/未知说明。回到工作台链接固定“/”；新报告不让旧job链接指向新job内容。主工作台默认复选框复位/禁用和现有W链接不变。

## 定向验证

旧tests/model.test.mjs与browser.test.mjs原字节冻结。新增tests/project-report.test.mjs恰project_report_capture_and_routes、project_report_privacy_and_eviction；新增tests/project-report-browser.test.mjs恰project_report_layout_and_downloads。test模式运行旧3+新2=5顶层，browser模式旧2+新1=3顶层，串行并最多同时一个私有Chrome。用冻结原7case与真实AA late捕获+明确partial内存变体；可以冻结回放实际pipe，但不得构造/运行新AA或物理fixture。dialog envelope始终是合成适配，不冒称新原生选择。

至少走真实公开streams→server→新路由→报告页；覆盖default false、observed、真cancel、late completed/partial、missing/failed、选择取消、错误job/false+observed/正文canary拒绝、两结果淘汰与close。在输入事件后首await前修改调用方对象/Buffer，已捕获输出和Q/Z不得变化。新/旧report与evidence错误路由/Host/方法/动作Origin拒绝；一实例不能提供另一实例内容。

新浏览器测试通过系统鼠标点击主页面“查看项目报告”进入同源报告、实际鼠标下载metadata和evidence并按当次原字符串比字节。default/observed/late complete/late partial/cancel Q均核，observed原Z附件核；fetch不冒充下载。两尺寸及late/取消/结构可见性留本次新截图实际view_image看图，原AB便利文件只会被旧测试写其.local，所有唯一截图/下载目录保留。

先完整可运行骨架/全部测试red-behavior→AD_BEHAVIOR。稳定nc1真正移除新路由job键绑定或淘汰删除，让旧job可读取其它/已淘汰内容→AD_REPORT_BINDING，立即原字节恢复/test五绿；nc2真正绕过结构附件选择/marker授权，使false/late结果可取结构内容→AD_REPORT_CONSENT，立即原字节恢复/test五绿。只改本票真正被调用的生产分支，原model拒绝不可改，不靠重写测试/未执行helper/静态开关造红。final同一干净实现SHA check/test/browser一次，产品字节不变不重复浏览器。系统原生窗口0，无物理fixture/普通内容权限。真实AA→AD与桌面接线由总控收单后另验。
`,
'contracts/macos-readiness-v1/SPEC.md':`# macOS Port Readiness v1 — AE

2026-10-23。设计/研究票，无产品实现、依赖安装、SDK/工具链下载、远程登录或macOS运行权限。Windows上形成可核验移植清单，不把Unix内存例/交叉编译/文档阅读当macOS验证。和AC/AD无产品写入冲突，无前置在途依赖。

在docs/research/macos-port-20261023/生成SOURCES.json、GAP-MATRIX.json、DESIGN.md、ACCEPTANCE-PLAN.md。只读现有N/P/R/S/Z/AA和桌面公开契约；不改其代码/错误/flags、根Cargo或旧契约，不运行research/upstream脚本/子模块/依赖，不访问真实数据。

SOURCES.json version=water.macos-sources.v1，checked_at、sources数组；每项id/url/accessed_at/access/title/summary，access只read或unavailable。只主要一手Apple、Rust、Tauri资料，官方apple-oss-distributions可作固定commit源码来源。至少6条实际阅读来源，无法读取明确标unavailable且不能用于支持事实；JS空页不算已读API内容。Archive manpage注明历史版本边界，不能当最新SDK实测。保留来源/公开定义固定文件行与SHA；页面引用和实现推断分开，不大段复制文档/代码。

GAP-MATRIX.json version=water.macos-gap-matrix.v1、implemented=false、real_macos_executed=false、entries恰N/P/R/S/Z/AA/desktop七项。每项component、current_sources[{path,sha256}]、macos_status固定not_implemented_not_tested、proposed_api（设计文字）、unresolved_questions非空、source_ids非空且对应read来源、acceptance_cases至少2项{name,expected}。源路径只当前分配的本项目packages/或冻结contracts/，不扫描其他目录。哪些通用内存API已可用与哪些Mac系统API未实现分别说明；不得将当前Windows公开类型已实现说成Mac实现。

DESIGN至少覆盖NSOpenPanel和AppKit主线程/用户取消、host声明与自然手势证明区别、security-scoped URL/bookmark/sandbox对选中能力的影响；dev/inode身份和mount/case/Unicode边界；逐父fd openat/fstat/O_NOFOLLOW、祖先symlink、hardlink、权限/消失/替换/目录并发变化、同句柄内容读cap与取消、生命周期/错误净化和原Q/Z信息边界。逐处指明未经证实的SDK常量/ABI/OS版本，不猜FFI布局；不得以canonicalize+前缀或O_NOFOLLOW终项检查宣称解决全部竞态。

APFS clone/snapshot/稀疏/压缩/allocated与reclaimable保持未知，不能拿inode去重冒充物理回收量。提出最小文件归属/后续接口变更候选与独立票顺序，但不改冻契约或把强依赖新实现标READY。普通metadata默认不读正文，Z额外内容同意独立、取消和partial不得丢失。

ACCEPTANCE-PLAN列必须在真实macOS的OS/架构/文件系统/SDK信息和独立新树.local合成样本，GUI窗口/墙钟预算、权限不足、symlink/hardlink、大小限制、精确late取消、panic/attempt释放和整链条件；mock/纯内存与真实实机分开。至少写明签名/notarization/采购/发布另行决定，不要求用户此时提供Mac、Apple账户或凭证。本票不宣称macOS、桌面扫描或M1验收。

helper check做三项文档一致性/来源索引/验收计划检查，非产品测试，无机械负控；最终干净报告前提交四材料，同SHA check --final。必须人工核对每个来源确实支持结论、每个current_sources路径和行号可读且SHA精确，报告记录未解决问题。受阻保留成果，本路径交回，不擅自扩大系统/真实用户权限。
`
};
for(const[p,s]of Object.entries(specs))put(p,s);
const sources=[
{id:'tauri-prerequisites',url:'https://v2.tauri.app/start/prerequisites/',checked:'read',fact:'Windows desktop build requires C++ Build Tools and WebView2; this is a prerequisite claim, not local Tauri build evidence.'},
{id:'tauri-capabilities',url:'https://v2.tauri.app/security/capabilities/',checked:'read',fact:'Remote command grants are separate from bundled frontend permissions; capabilities do not validate arbitrary Rust behavior.'},
{id:'tauri-config',url:'https://v2.tauri.app/reference/config/',checked:'read',fact:'Configuration references frontendDist, capabilities and WebView settings; chosen AC restrictions are Water policy.'},
{id:'tauri-crate',url:'https://docs.rs/tauri/2.12.5/tauri/',checked:'read_via_latest_page_version_2.12.5',fact:'Pinned runtime crate version from the primary crate documentation; registry dependency resolution still belongs to AC.'},
{id:'tauri-build-crate',url:'https://docs.rs/tauri-build/2.7.4/tauri_build/',checked:'read_via_latest_page_version_2.7.4',fact:'The application build.rs calls tauri_build::build; AC will resolve exact registry packages.'},
{id:'webview-distribution',url:'https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution',checked:'read',fact:'Runtime installation must be detected separately; an installed browser is not the runtime test.'},
{id:'apple-open-historical',url:'https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/open.2.html',checked:'read_historical_archive',fact:'Historical Apple manpage describes open flags, including O_NOFOLLOW. It is not evidence of current SDK ABI or race freedom.'},
{id:'apple-nsopenpanel',url:'https://developer.apple.com/documentation/appkit/nsopenpanel',checked:'unavailable_js_shell',fact:'Browser extraction returned only a JavaScript shell; API semantics not treated as read. AE must obtain official readable documentation.'},
{id:'rust-owned-fd',url:'https://doc.rust-lang.org/std/os/fd/struct.OwnedFd.html',checked:'seed_for_AE_not_reviewed',fact:'Research seed, not a verified conclusion.'},
{id:'rust-unix-metadata',url:'https://doc.rust-lang.org/std/os/unix/fs/trait.MetadataExt.html',checked:'seed_for_AE_not_reviewed',fact:'Research seed, not macOS execution evidence.'}
];
json('contracts/delivery-batch-v1/SOURCES.json',{version:'water.delivery-source-seed.v1',checked_at:'2026-10-23',sources,localObservation:{node:'24.16.0',webview2:'155.0.4283.62',tauriCached:false,macOSExecuted:false},licenseNote:'Primary documentation read only, no third-party application source copied; crate dependency/license inventory is an AC deliverable.'});
const tests={AC:{unit:['desktop_config_boundary','desktop_navigation_boundary','desktop_embedded_page'],browser:[],final:['check','test','native'],negatives:{nc1:'AC_CAPABILITIES',nc2:'AC_NAVIGATION'},systemWindowBudget:1,directoryDialogBudget:0},AD:{unit:['project_workspace_protocol','project_workspace_authority','project_workspace_consent_and_exports','project_report_capture_and_routes','project_report_privacy_and_eviction'],browser:['project_workspace_actions_and_evidence','project_workspace_layout_and_privacy','project_report_layout_and_downloads'],final:['check','test','browser'],negatives:{nc1:'AD_REPORT_BINDING',nc2:'AD_REPORT_CONSENT'},systemWindowBudget:0,directoryDialogBudget:0},AE:{unit:['macos-source-index','macos-gap-matrix','macos-acceptance-plan'],browser:[],final:['check'],negatives:{},systemWindowBudget:0,directoryDialogBudget:0}};
json('contracts/delivery-batch-v1/TESTS.json',{version:'water.delivery-batch.v1',tasks:tests,nodeMajor:24,rust:'1.95.0',jobs:1,normalCommandTimeoutMs:180000,desktopColdBuildTimeoutMs:600000,oneTreeOneGate:true,maximumConcurrentPrivateChrome:1,baselineSystemWindows:0});
put('docs/decisions/ADR-017-desktop-report-and-macos-readiness.md',`# ADR-017：桌面基础、同源项目报告与macOS移植准备

2026-10-23。A–AB及八补单Windows受控验收不改，d2a1365为本波之前的已收口主线。本波三票分别有独占文件和已验收前置，可以一起准备/外贴；READY只在实际baseline后给出。

| 票 | 本次交付 | 前置 | 文件归属 | 不依赖在途实现的验收 |
|---|---|---|---|---|
| AC | Windows Tauri依赖锁、许可证清单及最小静态桌面壳 | 已有Rust/MSVC、机器WebView2 | apps/desktop-preview | 真实编译、配置/导航validator、单窗口UIA和正常退出 |
| AD | 现有AB中的同源合并项目报告与原字节Q/Z下载 | 已验收AA/AB/W/Q/Z及late输入 | AB app/styles/server/transport/README及新project-report资产/测试 | 冻结pipe→新HTTP路由→私有Chrome实际点击/附件 |
| AE | macOS N/P/R/S/Z/AA/桌面差异、来源及实机验收计划 | 现有公开API/安全契约 | docs/research/macos-port-20261023 | 来源/当前源码SHA/差异矩阵/计划一致性，非Mac实现 |

AC没有本票AA/AB运行接线，避免把依赖缺失伪装成桌面已可用。AC唯一有新增registry依赖权限，AD零npm/新Rust，AE不安装/编译/远程登录。AC Tauri新workspace/锁自有，旧root Cargo/485约束不改。

AD保持原workspace精确API与W/Q/Z内容，新增同源报告不新增权限，当前metadata/结构的保护与来源语义原样。AB model/launch/旧五测试、新规格和依赖作为只读冻结，AD只改分配文件。

三票之间无产品写入冲突；实现收单后可分别验收。桌面→真实扫描/同源报告整链是下一波强依赖工作，须AC/AD验收后冻结，不能现在标READY。macOS产品实现/实机要AE方案和实际机器/范围，继续未验收。M2删除仍不在本波。

本波不访问真实用户数据、HOME、旧fixture或AA排除截图。派前0系统窗口；AC仅一次桌面窗口/0目录窗，AD单私有Chrome/0原生，AE无UI。未自动启动实现者，不签名/发布。
`);
put('docs/M1-DELIVERY-WAVE-PLAN-20261023.md',`# M1下一波：推进桌面基础与项目报告

2026-10-23，总控。A–AB与八补单Windows受控通过，原工单无需重贴。此轮AC/AD/AE各自只依赖已具备输入，无互相写入或在途实现依赖。具体接口和冻结以ADR-017、三SPEC、TESTS与manifest为准。

交付顺序：本波三线并行 → 单票收单/隔离复测 → AC/AD接受后另票连接真正桌面和扫描/合并报告 → 明确授权有界真实scope再测Windows Alpha。AE同时提供Mac移植差异，实机和SDK未具备前不伪造Mac READY。新增工具分类/规则与M2仍另排，模块数量不等于M1放行。

本波状态初始DRAFT。总控会建三棵全新工作树、冻结精确基线/文件归属、实际执行各自baseline并归档后置READY；用户得到三个完整的一行外贴句。不会等待桌面依赖安装才允许AD或AE开工，也不启动本地worker/子代理。

派前：AC只真实MSVC无UI小探针+WebView2定位，尚不下载/编译Tauri；AD走真实既有AB/W/Q/Z HTTP及late公开入口；AE核当前源码/契约/来源种子可读，不假称做了macOS。AC本票首次Tauri resolve/fetch只用新私有CARGO_HOME/target，不改旧cache或全局环境。

派后：AC同SHA check/test/native，1个静态桌面窗口/0目录窗；AD同SHA check/test/browser，旧5+新3顶层都保持且实际鼠标Q/Z下载；AE同SHA文档check，不机械做负控。最终真实桌面扫描尚未运行，真实用户scope/自然同意鉴真/竞态/macOS/M1仍未放行。
`);
put('docs/dispatch/W1-DELIVERY-WORKER-RULES.md',`# AC/AD/AE执行纪律

2026-10-23。本票唯一树/分支/首次精确干净HEAD、SPEC、白名单、测试和资源预算见正式票和主manifest。只实现自己票，不启动写代码子代理/worker，不merge/push/rebase/重置/clean；主检出和其它树只读，用户外贴是唯一执行分配。

从唯一树调用base内scripts/delivery-wave-check.mjs；该工具只做范围/契约/资源检查，不是OS沙箱。首次baseline之后读报告确认已有依赖可用，不把它当新产品通过。锁定控制/SPEC/TESTS/输入/helper不得改；需要变化交受阻报告，总控编号补单。

AC唯一dependencies模式允许新Tauri registry fetch，私有目录/jobs1/锁后offline，禁止root Cargo、全局安装、系统改动和npm。AD只内存回放/loopback/最多一个私有headless Chrome，不运行AA/系统选择器或访问物理fixture。AE只读研究和文档，不装SDK/环境、不远程联系别人或编译Mac产品。

实现票先完整指定测试/可运行骨架red-behavior；稳定生产和测试字节后两条真生产负控，各自立即原字节恢复/hash→完整test绿，然后同一干净SHA指定final各一次。文档AE不强造负控。未指定测试、skip/过滤、编译/超时/缺文件/CDP红、只改未调用validator和生产测试开关均不接受。通过无新变化不机械重复。

系统窗口预算在票面：AC只一个静态壳窗口/最多30秒、0目录窗，失败无自动重试；AD/AE零。不得截图桌面或无关窗口，AA旧四张排除图片连读取像素都禁止。自有profile/下载/fixture/日志保留，不清理。结束核自有进程/端口，记录实际强制终止数，不把未发现写成已杀掉。

报告记录实际模型/实现SHA/逐需求/命令退出/所有失败/负控与恢复/原字节附件/实际看图/平台限制；源码好坏和恢复字节、日志、下载/受控截图按source/archive/bytes/SHA原字节归档。本票新增ARCHIVE排除cache/target/binary/profile/payload，.log逐路径-f、其余逐路径add，禁止整树add；原始日志空白检查非零如实记录，手写文件单独check。

先提交受测实现，再同SHAfinal；后续报告提交只能报告/证据。第一行与完成通知为“<本票号> 任务已完成，任务报告在 <票面绝对路径>”；受阻改为任务受阻，写最小补充需求，不问用户临时放宽。完成只SUBMITTED，报告后停测停改，不自行标VERIFIED或宣称真实用户scope/macOS/完整桌面/M1通过。
`);
for(const lane of['ac','ad','ae'])put('docs/acceptance/wave1/'+lane+'/.gitattributes','.gitattributes text eol=lf\n*.json -text\n*.log -text\n*.txt -text\n*.png -text\n*.md -text\n');
const oldPath='contracts/project-workspace-addendum-v1/freeze.lock.json',old=JSON.parse(readFileSync(oldPath)),inheritedLocks=[...old.inheritedLocks,oldPath],physical=new Map(),objects=new Map();for(const p of inheritedLocks){const l=JSON.parse(readFileSync(p));for(const f of l.files)physical.set(f.path,f.sha256);for(const f of l.gitObjects??[])objects.set(f.path,f.objectId);}assert.equal(new Set([...physical.keys(),...objects.keys()]).size,485);
const frozen=[...Object.keys(specs),'contracts/delivery-batch-v1/SOURCES.json','contracts/delivery-batch-v1/TESTS.json','scripts/delivery-wave-check.mjs','scripts/acceptance/delivery-msvc-probe.rs','scripts/acceptance/delivery-environment.ps1','scripts/acceptance/delivery-base-probe.mjs','scripts/acceptance/delivery-desktop-native.ps1','docs/dispatch/W1-DELIVERY-WORKER-RULES.md','packages/project-session/Cargo.toml','packages/project-session/Cargo.lock','packages/project-session/src/lib.rs','packages/project-session/src/main.rs','packages/project-session/src/request.rs','packages/project-session/src/runtime.rs','packages/project-session/src/v1.rs','packages/project-session/tests/project_v1.rs','prototypes/project-workspace/.gitattributes','prototypes/project-workspace/model.mjs','prototypes/project-workspace/launch.mjs','prototypes/project-workspace/tests/model.test.mjs','prototypes/project-workspace/tests/browser.test.mjs'];
const files=frozen.map(path=>({path,sha256:hash(readFileSync(path))}));for(const f of files)physical.set(f.path,f.sha256);const uniqueFiles=new Set([...physical.keys(),...objects.keys()]).size;
json('contracts/delivery-batch-v1/freeze.lock.json',{freeze_version:'water.delivery-batch.freeze.v1',inheritedLocks,inheritedUniqueFiles:485,uniqueFiles,files,mutableExistingADFiles:['prototypes/project-workspace/app.mjs','prototypes/project-workspace/styles.css','prototypes/project-workspace/server.mjs','prototypes/project-workspace/transport.mjs','prototypes/project-workspace/README.md'],note:'AC/AE never write any AB source. AD may write only these five existing files plus its new report assets/tests; AB model/launch/old tests and all old485 remain frozen.'});
console.log(JSON.stringify({status:'DRAFT',oldFrozenUnique:485,newFrozenUnique:uniqueFiles,newPhysicalEntries:files.length,inheritedLocks:inheritedLocks.length,productsImplemented:false,systemWindows:0}));
