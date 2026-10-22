# AA单票集成、AB补单01待原对话续做

2026-10-22，Windows受控范围。AA接收82e066cf8f475d3e9c1e44e6461327c391fe0f3f/受测b3a874d0a1628a7bdce6f3414f234b2b45957152，单票收单合格并隔离集成 `0f1e5d7235f86fac16e05e6106d56085d04876de` 后快进主线，保持 **INTEGRATED**。AB接收7b5bdec2fd1af1bf988443d22eb91f504e5bba55/受测fa71a82696f123fd33c3514d99ef0b5c681c5780，新增独立回归失败，**CHANGES_REQUESTED，不集成AB**。补单01已实际resume通过并READY，只回原AB对话；真实AA→AB固定程序联合链未完成，AA/AB不记VERIFIED，M1仍未完成。

## 收单通过的部分

- 原两树分支/共同基线/clean HEAD/1109差异路径及白名单通过，报告提交均为实现的直接子提交，final后没有产品改动。1085份原归档/5162781字节与来源、提交blob逐字节一致；AA674/3259890、AB411/1902891。原6道final均绑定各自干净实现SHA，4条稳定生产负控及立即恢复/当前字节hash链独立核算通过。AA原native真实四窗wire通过，AB原浏览器实际W/Q及Z附件通过。[原提交审计](w1-aaab-review-20261022/controller/2026-10-22T07-35-54.338Z-31532-submission-audit.json)。
- 在新私有离线Rust1.95/MSVC/jobs1候选树，AA fmt/clippy/all-targets、四项公开测试及类型成功/拒绝通过；AB七个MJS语法与原完整五测5/5通过，无skip。候选组装81faca62a4ec2068b14107209d3d85e6a7c6aab0只供独立审阅，未推主线。[候选结果](w1-aaab-review-20261022/controller/2026-10-22T07-39-29.385Z-25628-candidate-check.json)。
- AA主线/独立集成0f1e5d7的685交付路径与原worker提交及候选树逐字节一致，所有本地依赖由旧479冻结保护；原AA类型/扫描测试在候选图实际运行，AB代码不在AA Cargo依赖图。未为相同字节再次运行完整四测/原native。主线不含prototypes/project-workspace。

上述原五测通过不能覆盖新发现的跨模块回归。

## 阻断AB：AB_LATE_CANCELLED_CONTENT

原project-session-v1明确“真实R报告cancelled **或**内容阶段前token cancelled”跳过内容读取。总控独立程序真正调用AA.capture_registered，在固定good根的末条observer中取消同一token，实际取得 `snapshot.view.status=completed`、marker `skipped/scan_cancelled/null`，P登记/下一attempt仍可用。没有运行选择器、改AA或读取UI路径。该真实公开API返回在[原输出](w1-aaab-review-20261022/controller/2026-10-22T07-39-29.385Z-25628-actual-AA-late-cancel.json)，新附加契约按SHA复制；synthetic dialog envelope只为桥接测试，未冒称本轮S。

原AB assertMarker仅当selection cancelled或metadata status cancelled才接受skipped；completed时落入missing/failed/observed分支而拒绝。这导致真实合法结果在独立模型、WorkspaceState及公开startFromStreams/HTTP均失败，/session.json.connection=failed，无W报告。partial变体同步修改status/summary/Q并明确标合成内存，三入口也拒绝，共6项失败。原7正例和3个false/取消负对照保持。[最终原树resume](w1-aaab-review-20261022/resume/2026-10-22T07-47-13.226Z-2004-resume-result.json)可复核。

这不是要求弱化同意校验或改变AA的真实metadata状态；应仅接受read_manifest=true/同job/confirmed/合法completed或partial+skipped/scan_cancelled，保留W报告与Q、无结构附件、连接继续ready且能下一次默认false。false+observed、选择取消错误code/过期job/正文与全部原负例继续拒绝。页面必须将“完成或部分元数据”和“取消内容读取”分别说明。

## 安全/证据边界与历史

AA原生截图观察器采到背景应用像素，原执行者已披露无效、原文件未提交。总控只读报告/排除元数据，**没有查看、读取或复制那4张像素，也没有为补截图重开原生窗**。AA原native证据只用于真实PID/title/按钮/wire，不当作视觉通过；自然用户手势和视觉渲染仍未验证。

总控只在候选树由冻结factory创建524474字面合成payload；公开AA调用实际R/Z，普通内容读取限该固定工厂/真实受限API，不访问用户目录或旧树fixture。AB独立测试只内存/loopback/headless，最多一个私有Chrome。总控实际原生窗口0、无删除/移动/ACL/上游运行；进程[收尾检查](w1-aaab-review-20261022/controller/process-close.json)为空、实际终止0。

AA三次开发失败（编译闭包、最后observer仍completed的自写断言、Clippy大枚举）及恢复完整保留，稳定负控前调整符合规范，不追认失败为有效负控。AB原报告末尾连续问号的附注无可读性；原STAGING-AUDIT显示显式暂存412路径、Git原证据空白检查退出2、仅手写报告检查0及索引字节保持。原归档411文件与当前接收blob实测一致。原乱码不覆写，补单新回执另行清楚补充，不能拿乱码当完整说明。

本轮总控两次merge因续接环境缺Git committer配置而未执行，后续仅本次git调用复用此前提交身份，不改global/local配置或凭证。候选检查在AA四测已通过后，控制器probe相对源码路径不在新树导致编译失败；改用主检出绝对路径编译，只继续probe和AB五测，没有改产品/测试或复跑AA四测。工具返回转录与原失败回执分别保留于[CONTROLLER-NOTES](w1-aaab-review-20261022/CONTROLLER-NOTES.json)。

## 当前处置与补单READY

[AB补充单01](../../../dispatch/tickets/WATER-W1-AB-ADDENDUM-01-20261022.md)在原clean7b5bdec上实际resume，6次应接受却拒绝按预期观察；PASSED仅表示已知回归复现。新增控制6条目/17继承锁/485唯一约束，旧479保持，原AB报告/ARCHIVE hash保持。新wrapper从主检出绝对路径调用，不给AB树追加控制提交。仅本补白名单model/app/现有两测试、新报告和addendum-01证据；原server只负控临时改、立即原字节恢复。真实逻辑修复由原AB执行者完成。

[READY回执](../../../dispatch/wave1/AB-PROJECT-WORKSPACE-ADDENDUM-01-READY-REPORT-20261022.md)给出唯一续做句，补单完成后再验真正AA固定程序→AB同次选择/默认false/true/取消/内容附件整链。原AA四窗已足以单票收单，本次没有以普通回放/无窗口public API冒称原生整链。

[总控归档](w1-aaab-review-20261022/ARCHIVE.json)含166文件/1477340字节，保留本轮所有成功/失败日志、实际AA输出、公开HTTP回归、原报告索引、原树两次resume、源码、候选AB新截图/实际附件；不纳binary/cache/profile/payload/无关背景像素。[最终审计](w1-aaab-review-20261022/FINAL-AUDIT.json)记录主线只AA、旧任务/范围及冻结。
总控通过view_image实际查看候选AB的宽屏/窄屏/选择取消三图：原基本布局、默认unchecked、限制说明/证据面板可读，窄屏无横向溢出；这三图未覆盖late取消缺陷，不能放行本票。macOS、自然内容同意/来源鉴真、恶意生产竞态、真实用户scope、桌面/打包/发布及M1未验收。
