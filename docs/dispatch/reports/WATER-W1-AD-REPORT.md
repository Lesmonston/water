WATER-W1-AD 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/ad/docs/dispatch/reports/WATER-W1-AD-REPORT.md

状态：SUBMITTED，等待总控独立收单与验收。2026-10-23，Windows 受控回放范围。

工作树 `F:/new/smaltalk/water/.worktrees/ad`，分支 `worker/water-w1-ad`。
首次干净 HEAD 和 tag 基线为 `4b8a1de2ad49664546547256cd3d55def7c31a49`
（`water-w1-delivery-base-20261023`）；主 manifest 开工时 READY/PASSED。
实现提交和三道 final 的同一受测 SHA：`3ad5e7003d9e9720e85113a47d558738bf06231d`。
随后提交只含本报告及 AD 新证据，产品/测试字节保持该 SHA。

执行者为本会话 Codex；会话开发指令标识为基于 GPT-6，环境未提供可独立核验的更细模型型号。
单执行者，无子代理、worker、其它 CLI 实现者。未修改主台账、主检出或其它票。

交付在现有工作台的每个 confirmed 最近结果下增加“查看项目报告”，同源打开
`/reports/<job_id>/`，同时展示元数据和本次可选结构证据。保留原 W 链接和精确
workspace/session API；选择取消不生成新报告。修改白名单中五个既有文件，新增
四个报告资产和两个测试文件，共 11 个实现文件，零 npm/新 Rust 依赖。

| 冻结需求 | 实现与验证 |
|---|---|
| 六字段同步捕获 | `project-report-model.mjs` 导出 `captureProjectReport`，实际由 transport 在 W 创建首 await 前调用；委托旧 assertReviewInput/assertMarker，检查 confirmed、单项 native metadata、job/scan/status 关联及固定 limits。根字段拒绝 accessor/额外属性，输出三个独立 Buffer，不保存输入引用。 |
| 精确 packet 与原字节 | session 恰 report_version/job_id/read_manifest/bundle/marker；metadata 为原 redacted_json UTF-8，结构为原 observation_json UTF-8。独立捕获间修改 Buffer 不互相影响；data 事件后首 await 前修改原 chunk/调用方对象，公开路由与旧 W/Q/Z 值保持。 |
| 同源固定路由 | GET/HEAD HTML、session、metadata，metadata 下载名 water-report-1.json，准确类型/长度。仅固定 HTML/CSS/MJS 资产；Node capture 模块不对浏览器开放。拒绝未知 job、query、额外斜杠、percent、穿越、错误方法和错误 Host，沿旧净化错误/CSP/no-store/nosniff。 |
| 结构授权 | 仅本 job 捕获的 observed 可下载原 `/evidence/<job_id>.json`，保留 water-project-evidence.json。默认 false、真取消、late skipped、missing/failed 无结构附件；错误 job、false+observed 和正文 canary 结果由公开 streams 拒绝。 |
| 生命周期 | projectReports 为每实例私有 Map，最近两结果包含选择取消；淘汰删除新路由/Q/Z 并关闭旧 W，close 关闭服务、清空捕获且保留借用 streams。两实例不能互取报告，旧 job 不会指向新内容。 |
| 元数据与未知保护 | 页面保留 E/H 来源和真实计数、coverage/status/limits/issues、protected/category/protection_reasons、观察逻辑长度、allocated/reclaimable 未知。没有记录条目不推断为空；结构统计不升级归属、版本、安装、风险或可删性。 |
| 独立内容结果 | default、missing、failed、scan_cancelled 分别表达；late completed 显示扫描完成，late partial 显示保留部分结果，另显示“已取消内容读取 · 未读取清单”。只有 observed 展示原 bytes_read、U 存在标志/private 声明/六计数；textContent 安全 DOM，未丢失零值或 false/null 分支。 |
| 页面与下载 | 1440x1000、900x800 无横向溢出，可滚动至全部内容，固定返回 `/`。鼠标从主工作台进入新报告，实际点击 Q/Z 下载后与原字符串逐字节比对；默认复选框复位/禁用和旧 W 链接保持。 |

所有门均从本树运行，固定前缀：
`node scripts/delivery-wave-check.mjs --task WATER-W1-AD --mode`。
以下为本次全部 14 次调用；原参数、子命令退出和来源哈希在
[GATES.json](../../acceptance/wave1/ad/GATES.json)，每条原始 result/log/source
在 [ARCHIVE.json](../../acceptance/wave1/ad/ARCHIVE.json) 逐项索引。

| UTC 时间 | mode / final | 门退出 / 产品子命令退出 | 结果 |
|---|---|---|---|
| 11:32:07 | baseline | 0 / 两探针均 0 | 既有 AB/W/Q/Z 与六 late 入口通过，509 冻结；非新产品验证 |
| 11:37:05 | red-behavior | 0 / 1 | helper 接受，但旧版测试修改 paused chunk 早于 data 事件；等待失败不作有效 red，原证据保留 |
| 11:39:04 | test | 1 / 1 | 五项中 4 通过，新增测试仍受同一 mutation 时序问题影响 |
| 11:40:08 | red-behavior | 0 / 1 | 修正测试后完整可运行骨架，新报告 HTTP 404 对 200，明确 AD_BEHAVIOR；旧三项通过 |
| 11:40:38 | test | 0 / 0 | 接回真实生产路径，五项全绿 |
| 11:41:47 | browser | 1 / 1 | 旧两项通过；新测试在开始操作 pending 时过早点取消，期望 cancel 实得 start；非产品或有效负控证明 |
| 11:42:53 | browser | 0 / 0 | 等待取消按钮可用及真实服务端 cancelling 后，三项全绿 |
| 11:43:58 | red-nc1 | 0 / 1 | 真移除淘汰 Map 删除，新旧 job 隔离断言 AD_REPORT_BINDING 命中 |
| 11:46:26 | test | 0 / 0 | nc1 原字节/hash 恢复，五项全绿 |
| 11:47:04 | red-nc2 | 0 / 1 | 真绕过本 job 的结构授权，false 结果误取前次 observed 字节；AD_REPORT_CONSENT 命中 |
| 11:47:55 | test | 0 / 0 | nc2 原字节/hash 恢复，五项全绿 |
| 11:51:01 | check --final | 0 / 所有 node --check 均 0 | 干净受测 SHA，509 冻结与负控恢复审计通过 |
| 11:51:44 | test --final | 0 / 0 | 同 SHA，旧 3 + 新 2 = 5，通过，无 skipped/cancelled/todo |
| 11:52:22 | browser --final | 0 / 0 | 同 SHA，旧 2 + 新 1 = 3，通过，无 skipped/cancelled/todo |

test 精确顶层：project_workspace_protocol、project_workspace_authority、
project_workspace_consent_and_exports、project_report_capture_and_routes、
project_report_privacy_and_eviction。browser 精确顶层：
project_workspace_actions_and_evidence、project_workspace_layout_and_privacy、
project_report_layout_and_downloads。每门串行，一树一门，最多一个私有 Chrome；
本次每个命令均在普通 180 秒预算内，未做 watch/整仓/coverage。

负控没有修改旧 model/launch/旧测试，也没有生产测试开关。
nc1 仅去掉 transport 真实淘汰分支中的 `projectReports.delete(removed.job_id)`；
恢复 transport SHA256 为 `3bfb43c43155cd1246b7e2c6954cebf9584e2de9d3574fa851896d25babd1c16`。
nc2 仅让真实 evidence 路由在本 job 无内容时回退到其它 observed 捕获；
恢复 server SHA256 为 `8c7637a81a680434ae6cbed788089fa2664a8d64f4f0ba4c5dc9fd73da3f8d9b`。
两次立即恢复均与当前/受测字节相同，完整五测随后恢复；测试整体哈希未变。
坏态/恢复源码、日志和绑定见 [PROOFS.json](../../acceptance/wave1/ad/PROOFS.json)。

最终新浏览器测试的 default、observed、late-completed、late-partial、cancelled、
missing、failed 共七类 Q 鼠标下载，以及 observed Z 鼠标下载，全部按当次原字符串
比对；选择取消无链接。新测试共八次实际下载，旧浏览器测试另保留其原下载证据。
Q completed/default/observed/late-completed 为 1387 字节，late-partial 1385，
cancelled 902，missing 858，failed 1386；observed Z 为 844 字节。
每份下载原文件和 receipt 含 source/bytes/SHA256/actualMouseClick，独立目录保留。

本次 final 新截图位于 `.local/browser-lab/project-report-OfHA2n/`，七状态 × 两尺寸 ×
顶部/内容视口 = 28 张，已实际逐张调用 view_image 查看；来源、结论见
[VISUAL-REVIEW.json](../../acceptance/wave1/ad/VISUAL-REVIEW.json)。内容可读、可滚动，
未知保护和结构警示明确；late metadata 结果与内容取消分别表达。另查看首次失败
浏览器的八张新图，以及预检成功轮的四张 late 内容图；其余预检图如实仅保留，
不冒称逐张看过。没有读取/复制 AA 排除截图或桌面无关窗口。

系统原生窗口/目录窗口均 0，未启动 AA/S、新原生程序或物理 fixture 扫描。
浏览器和 W/工作台服务都通过各自 close 结束；新测试逐实例确认原端口 fetch 失败，
旧冻结测试保留子进程正常退出回执。结束的进程核查未发现命令行属于本工作树的
Chrome/Node；见 [PROCESS-CHECK.json](../../acceptance/wave1/ad/PROCESS-CHECK.json)。
执行者没有额外强制终止进程，计数 0；冻结 Chrome helper 内部的 child.kill 兜底
分支没有单独观测计数，不能声称该分支未触发。profile、下载、日志保持原位，无清理。

所有实际产品门失败和诊断错误见 [FAILURES.json](../../acceptance/wave1/ad/FAILURES.json)。
包括早期 UTF-8/截断重读、SOURCES 扩展名误查、Node 单行引号错误、一次原子 patch
上下文失败、两次猜测日志名读取错误、一次会话内存键失效，以及首次空白检查采集
误判 no-index 差异退出码；这些没有被用作测试证明。
诊断条目是如实会话记述，未伪造为原始 stdout。两次产品门失败、被替代的 red、
有效 red、两个稳定负控及所有恢复/最终日志均按原字节归档，未删改失败记录。

归档先复制 411 份原材料，再加入本报告/生成索引和检查结果；最终逐文件总数与
字节量以 ARCHIVE.json 为准。排除 cache/target/binary/Chrome profile/fixture payload
及历史 baseline。报告与生成说明、原始日志分别做空白检查，逐文件退出保留在
[WHITESPACE.json](../../acceptance/wave1/ad/WHITESPACE.json)；原日志即使检查非零也
不改写。首轮共检查 54 个文本文件（含 48 份原始日志），五份 red/浏览器失败日志
有 TAP 空白行，no-index --check 实际退出 3；报告退出 1 且无诊断，表示与 NUL 有
文件差异，不能把退出 1 单独当作空白错误。实现提交前 staged whitespace 检查
退出 0；收尾显式逐路径暂存，日志 -f，
并核暂存对象原字节及实现 SHA 后产品树无变化。

范围限制：本票只用冻结原七 case、实际 AA late 捕获及明确 partial 内存变体，
dialog envelope 始终为合成适配，不是新系统选择或自然用户同意鉴真。未访问真实
用户目录、HOME、旧 fixture、凭证或普通正文；未改上游/共享 Vault/根 Cargo/旧锁。
未安装依赖、运行新 AA、push、merge、发布或自行修改主 manifest/registry。
真实 AA→AD 新链、真正桌面接线、用户 scope、生产竞态、macOS/M1 均未验收。
无待实现的票内功能或临时放宽申请；最终为 SUBMITTED，不宣称 VERIFIED。
