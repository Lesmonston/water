WATER-W1-X 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/x/docs/dispatch/reports/WATER-W1-X-REPORT.md

# WATER-W1-X 执行回执

状态：SUBMITTED，等待总控独立收单验收。Windows 受控范围的本票检查通过；不自行标 VERIFIED、M1 或 macOS 通过。

## 身份与提交定位

| 项目 | 实际值 |
|---|---|
| 权威票 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-X-SCAN-HOST-20261019.md` |
| 工作树 / 分支 | `F:/new/smaltalk/water/.worktrees/x` / `worker/water-w1-x` |
| 首次精确 HEAD / 基线 | `1c152a1ed317fb51498503de837bb228c50dc663`，首次干净且产品目录不存在 |
| tag | `water-w1-interactive-base-r2-20261019` |
| 实现及测试提交 / 三道 final 受测 SHA | `abbad6ad60beb56ee69b7d7b3ca711b23cb29859` |
| 引擎 / 模型 | 本会话 Codex；会话提供的模型族为 GPT-6，未提供更细变体标识，未猜测变体 |
| 实现方式 | 本执行对话直接完成；无子代理、分包或另启模型 CLI |
| 工具与资源 | Windows x64、Node `v24.16.0`、Rust `1.95.0` / MSVC；冻结 helper 的私有离线 Cargo home / target、jobs=1、单子命令 180 秒 |
| 回执提交定位 | 本文件首次新增的报告/证据提交。可用 `git log --diff-filter=A --format=%H -- docs/dispatch/reports/WATER-W1-X-REPORT.md` 定位；它相对上述受测 SHA 只新增本报告及本票证据 |

代码提交仅新增 `packages/scan-host/` 下十个票面文件：Cargo.toml、Cargo.lock、README.md、六个 src Rust 文件和唯一测试文件 `tests/host_v1.rs`。根 Cargo、旧 A–W 产品、helper、冻结锁、任务台账及其它工作树均未修改。没有 push、merge、rebase、reset、clean、安装或新增 registry 包。

## 交付与逐项证据

| 要求 | 实际实现与验证 |
|---|---|
| 严格请求边界 | 公开 `decode_request(&[u8])` 与生产 stdin 共用解析；有界 `read_request` 在读取时限制 4096 正文字节。拒绝 BOM、空行、CRLF、非 UTF-8、重复/转义重复键、额外字段/对象、空/路径/超长 ID、非紧凑 JSON、EOF 残行。`host_request_boundary` 同时检查生产解析器、逐字节分段及真实二进制错误退出 |
| 持续单任务宿主 | 输入线程持续读请求；主协调线程独占 stdout writer；每次扫描独立工作线程。`HostState` 限一项活动任务、最多 32 个已接受 ID、不复用旧 ID、不排队弹窗。Busy / ReusedJobId / JobLimit / UnknownJob 及终结后重扫由同一生产状态逻辑测试 |
| 真实 S → V → R | 工作线程创建并持有 Registry / PickerOptions，固定 scope=`interactive-scope`、session=job_id、预算 8/10000/256；调用真实 `V.capture_session_with_observer` 与 `V.to_json`。CLI 参数只给 S 初始位置。没有替代扫描器、可注入执行闭包、测试开关或按 job/fixture 名返回结果 |
| 参数校验 | 参数个数、编码、空串错误及真实 S 的路径语法校验失败均退出 64，stderr 恰为 `Invalid host arguments.` + LF。S 的临时参数校验对象也在自己的线程创建并销毁，校验不打开目录或对话框 |
| 真实计数进度 | R observer 只发送 job_id 和两个计数，不发送 relative_path、根路径或身份。状态机校验绑定、范围及单调性。真实 final 完整扫描输出 8 项进度，从 (1,1) 到 (8,8)，均先 accepted 后 progress、先 progress 后 result，无 sleep 放慢样本 |
| 真实取消接线 | 仅匹配当前 ID 时取消活动任务的共享 R.CancelToken；该对象真实传入 V。无窗口测试将同一状态令牌交真实 R 得到 cancelled；nc2 再以真实 X.exe / V / S 窗口证明生产参数接线，最终 native 恢复为 cancelled |
| 输出与隐私 | 固定 version/kind/字段和六个 failure code；正常 stderr 空，流无法继续退出 2 且只输出固定 `Host unavailable.` + LF。输出经单 writer 紧凑 UTF-8 + LF 序列化并校验行大小。真实 V bundle 对象只解析和封装，不重算报告，Q 原字符串不变 |
| 选择取消与扫描取消 | 真实同一进程三次任务：选择取消时无 snapshot；完整确认后 completed；先 cancel 再确认时 confirmed + 一个 cancelled snapshot。两个有 snapshot 的实际 bundle 经 job/session ID 绑定后与保留真实 V 捕获逐值相同，Q 字符串逐字节相同 |
| shutdown / EOF | idle shutdown / EOF 真实进程输出 ready、stopped，退出 0；活动 shutdown 使用同一状态逻辑合作取消并等待终结。不得假称 cancel 关闭了选择器。活动选择器中的 shutdown / EOF 未额外安排原生窗口验证，明确保留此限制 |

唯一测试文件中恰有 `host_request_boundary`、`host_job_state`、`host_progress_cancellation`、`host_wire_privacy` 四项测试，无 skip / ignore / filter。真实进程单位检查从不发送 start 命令；真实原生 start 只由冻结 native driver 发起。

## 命令、失败与恢复

所有门均从唯一树运行：

```powershell
node scripts/interactive-wave-check-r2.mjs --task WATER-W1-X --mode <下表 mode>
```

`--final` 只用于下表最后三行。完整的 16 次门、每个实际子命令的 argv / exitCode / 原始 stdout / stderr、源快照与开始结束时间见 [RUN-AUDIT.json](../../acceptance/wave1/x/checks/RUN-AUDIT.json) 及 [ARCHIVE.json](../../acceptance/wave1/x/ARCHIVE.json)。没有省略首次红灯或较早源码版本。

| UTC 时间 / mode | 实际结果 |
|---|---|
| 11:17 baseline | 门退出 0；干净精确基线、202 物理冻结条目及 4 个旧资源 Git 对象、既有 P/R/A/V 和共享 token 通过；0 窗口，不是新产品测试 |
| 11:21 lock | 门退出 0；离线生成本票 Cargo.lock，所有 registry 版本/checksum 与根锁一致 |
| 11:21 red-behavior | 门退出 0；四项测试真实执行、Cargo 退出 101，命中 `X_BEHAVIOR`。初始可运行任务准入骨架尚未实现，4 项失败；其中 parser 也暴露 shutdown unit variant 会接受额外字段，随后改为严格 struct variant，未降断言 |
| 11:22 test | 4/4 通过，退出 0，修复准入与解析 |
| 11:22 check；11:23 test | 各退出 0；在原四项测试内补充真实进程的 argv / EOF / 协议输出检查 |
| 11:24 test | 4/4 通过，退出 0；补齐真实 S 参数语法及同一状态 token → 真实 R 的无窗口调用后固定字节 |
| 11:24 red-behavior；11:25 test | 使用最终测试字节再证准入骨架红：1 passed / 3 failed，Cargo 101，命中 `X_BEHAVIOR`；立即原字节恢复并核十文件哈希，4/4 通过、退出 0 |
| 11:25 red-nc1；恢复 test | 临时改坏真实 cancel 的 ID 匹配，3 passed / 1 failed，Cargo 101，命中 `X_JOB_BINDING`；恢复全部十文件哈希后 4/4 通过、退出 0 |
| 11:25 red-nc2；恢复 test | 临时把真实 V 调用参数换成新 CancelToken，真实 native-cancel driver 退出 1，恰一窗，命中 `X_CANCEL_TOKEN`：completed != cancelled；立即恢复全部十文件哈希，4/4 通过、退出 0 |
| 11:26 check --final | 干净 `abbad6a`，退出 0；fmt、clippy all-targets `-D warnings`、精确 metadata/依赖/targets/锁/冻结/当前负控恢复链通过 |
| 11:26 test --final | 同一干净 SHA，退出 0，4 passed / 0 failed / 0 ignored / 0 measured / 0 filtered out |
| 11:26 native --final | 同一干净 SHA，退出 0，真实三个场景通过，宿主退出 code=0 / signal=null，stderr 空，无残余半行 |

除上述主动行为红和生产负控红外，没有编译失败、超时、缺文件或失败门。初始/确认行为骨架都有正常可执行构建及已留档的 unused-field warning；最终 clippy `-D warnings` 通过。所有增补均在负控前完成；当前两条生产负控及三道 final 使用相同测试字节，负控期间未改测试/helper/超时。

另有一次交回材料检查的非产品失败：逐文件暂存后，完整 `git diff --cached --check` 将两份原生输出日志及结束进程 JSON 的原始 CRLF / 末尾空行报为空白问题，工具层返回 1。对同一暂存字节捕获的 Git 直接退出码为 2，见 [相同索引的复现日志](../../acceptance/wave1/x/checks/archive-whitespace-review.log)。首次输出保留在执行会话；此附件明确为复现，未冒称首次原始文件。保留原始日志字节，对产品与报告另行定向检查，不格式化归档证据。

最终源摘要：productionHash=`cda343913f97d39cf0110ef560949090d69e0e72a38e72a0d9fcf6f822102ce7`；testHash=`80ad24f7741ba07fa21a9765aaad36802dc0737c9a0a9d88722a61e6a28dbb9b`。它们按冻结 helper 的路径+SHA 清单计算，非单文件哈希。

## 两条生产负控的可复核链

nc1：`state.rs` 的真实 cancel 从 `.filter(|job| job.job_id == *job_id)` 临时改为不检查 ID；相同测试观察到 stranger 获得 cancel_ack，命中 `X_JOB_BINDING`。坏源码 hash=`198a443e08387426d9f104bfc7ea2d68cf309c5fddb9bf875f39cc016e185f52`；恢复 hash=`ba4ea979bd4b79af3ca89406aa466657646d66141bd84062aacc24634b58f98b`。见 [红灯回执](../../acceptance/wave1/x/checks/2026-10-19T11-25-14.907Z-25148-red-nc1-result.json)、[恢复哈希](../../acceptance/wave1/x/checks/restore-nc1.json)、[紧随恢复的四绿](../../acceptance/wave1/x/checks/2026-10-19T11-25-28.973Z-34532-test-result.json)。

nc2：`runtime.rs` 的真实 `capture_session_with_observer` 参数从 `job.cancel_token()` 临时改为 `&water_native_scan::v1::CancelToken::new()`；accepted 后 cancel，再由冻结 driver 确认真实 S 对话框。它观察到真实 V 的 completed，目标要求 cancelled，命中 `X_CANCEL_TOKEN`，未拿纯 state 测试冒充。坏源码 hash=`7869b74fa801460a451c9d1603444969fa417dd16a18e3047e37405794614307`；恢复 hash=`418d1841f9cb47bb3dce6d14414cf0aaf6e478ff27033240686300d6de2d9f80`。见 [红灯回执](../../acceptance/wave1/x/checks/2026-10-19T11-25-40.648Z-16004-red-nc2-result.json)、[真实失败事件](../../acceptance/wave1/x/native/2026-10-19T11-25-44.231Z-18688-native-cancel.json)、[恢复哈希](../../acceptance/wave1/x/checks/restore-nc2.json)、[紧随恢复的四绿](../../acceptance/wave1/x/checks/2026-10-19T11-25-52.335Z-28340-test-result.json)。

原字节恢复以单文件保存快照完成，逐项核对十个产品/测试/README 文件；未做全树还原。三道 final 又校验当前源码、坏态快照及及时恢复四绿链，恢复后没有产品/测试变化。

## 原生窗口、原始证据与结束状态

总窗口 4/6：nc2 负控 1；最终 native 3；其它命令 0。冻结 driver 仅按本次进程 PID 和固定 title `Water - Select a read-only directory` 操作按钮。负控 PID=`22468`；final PID 及三次窗口/按钮回执见 [native 原始日志](../../acceptance/wave1/x/checks/2026-10-19T11-26-58.534Z-32828-native-10.log)。

[最终真实事件](../../acceptance/wave1/x/native/2026-10-19T11-27-02.134Z-34808-native.json) 共 17 行事件：ready=1、accepted=3、progress=8、cancel_ack=1、result=3、stopped=1。每个 accepted 恰有一个 terminal，无交错 JSON 行或未知 job 进度/结果；完整和扫描取消的 Q 原字符串均保留。选择器取消不生成 snapshot；先请求取消仍等确认，再产生 cancelled snapshot。

final 宿主在 stopped 后正常退出 0。nc2 的主动失败由冻结 driver 走其自有进程结束分支；该失败回执未记录子进程最终退出码，未将它说成正常退出。[结束进程观察](../../acceptance/wave1/x/checks/end-process-observation.json) 于 `2026-10-19T11:27:50Z` 精确匹配本树宿主可执行路径，运行数为 0；没有额外手动终止任何进程，也未把“未发现”写成“已杀掉”。没有自有服务/浏览器后台。

实际看图：0 张。本票冻结 X driver 不生成 raster 截图，本次没有生成或查看截图；UI 证据为上述 PID/title/window/action 原始记录及真实宿主事件，不声称目视验收。

归档 [ARCHIVE.json](../../acceptance/wave1/x/ARCHIVE.json) 逐项列 source/archive/bytes/sha256，499 份原字节附件、共 2,510,118 字节（不含 ARCHIVE 自身）。包括全部 16 次门的原日志/回执、所有好坏源码/测试快照、恢复索引、两份真实 native 事件、fixture 元数据 index、结束进程观察、RUN-AUDIT 及交回材料空白检查复现。未归档 target/cache/binary/profile 或物理 payload；原始 `.local` 文件与 fixture 均保留。

只复用本树既有 R 同形合成 fixture（60 字面 / 74 文件条目逻辑字节，含硬链接及 junction）。各 Rust 实现门前后由冻结工厂校验同一 index/内容，index SHA256 始终 `cb0df725663c9ec321030f1b87e5d6b567438d85e65aed3b4616042e973cea71`；Rust 产品/测试不读取普通文件内容，单位测试只读取已核路径的 fixture 元数据 index。没有新建、移动或清理 fixture，没有访问其它树的 fixture、真实用户目录、HOME/整盘、凭证或上游代码执行。

## 限制与交回

没有越界申请或临时放宽。真实 X → Y 双向 pipe / W 页面与下载整链留给两票收齐后的总控联合验收；本票没有改 Y 或 Z。真实用户 scope、生产恶意竞态、原生手势/来源鉴真、macOS、桌面壳/打包/发布与 M1 均未验收；真实活动选择器中的 shutdown/EOF 只证明状态逻辑，未扩增本票规定的原生三场景。Unknown / protected、ordinary_content_read=false 与容量/恢复未知均保持。

实现测试已固定并提交；随后只新增本报告和原字节证据。回执提交后停止本票测试、修改和自有后台，等待总控收单，不自动合主线。
