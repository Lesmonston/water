WATER-W1-Y 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/y/docs/dispatch/reports/WATER-W1-Y-REPORT.md

交付状态：**SUBMITTED，待总控独立验收**。没有修改主 manifest/registry，也不宣称 VERIFIED、真实用户 scope、macOS、桌面或 M1 已通过。

执行者为本会话 Codex，系统提供的模型身份为 GPT-6；本会话没有暴露可核对的更细后端模型 ID。没有使用子代理、内部 worker 或外部分包实现者。界面使用已读取的 minimalist-ui 技能，仍以本票沿用 W 的视觉约束为准。

| 定位 | 精确值 |
|---|---|
| 工作树 / 分支 | `F:/new/smaltalk/water/.worktrees/y` / `worker/water-w1-y` |
| 首次及共同基线 | `1c152a1ed317fb51498503de837bb228c50dc663`，初始干净、产品目录不存在 |
| tag | `water-w1-interactive-base-r2-20261019` |
| 实现与最终受测提交 | `657f84d52c02857aec0639af82a7dac59373b47e` |
| 回执提交定位 | 实现提交的直接子提交，主题 `docs(live-workspace): submit Y report and original evidence`；用 `git log -1 --format=%H -- docs/dispatch/reports/WATER-W1-Y-REPORT.md` 定位包含本报告的精确提交 |
| 当前生产源码集合 SHA-256 | `6793963494e49b87cff9f8d08c48b22991120c952cf39e7e519e77e732b0b208` |
| 两份测试集合 SHA-256 | `edce678320cdb0dcacc925e707962381bb7f89fe69bf58b03ca0de5bb8a72525` |
| 环境 | Windows x64，Node `v24.16.0`；零新增 npm/Rust 依赖、零本票 target |

**交付与需求对照**

实现提交只新增票面允许的 11 个文件，位于 `prototypes/live-workspace/`。报告提交只包含本报告和本票新证据。既有 A–W 产品、helper、冻结、根 Cargo、第三方 checkout 和主线台账均只读；没有 merge、push、reset、clean 或清理动作。

| 需求 | 实际实现与证明 |
|---|---|
| 原始双向 streams | `transport.mjs` 公开 `startFromStreams({input,output,port=0})`；同步复制每个输入块后才进入异步队列，输出是真实 Writable 的紧凑 UTF-8 JSON+LF。仅 ready 后启动 HTTP。测试接冻结回放进程真实 stdout/stdin，保留原始 stdout transcript 和退出记录。 |
| 严格协议 | `model.mjs` 检查逐行长度、LF、UTF-8/BOM、紧凑对象、任意层级解码后重复键、字段、事件先后、当前 job、计数范围与单调性；过期/其它 job/重复 terminal 均 failed，不能替换结果。 |
| 开始/取消/再扫 | 后端随机生成合法 OpaqueId，最多 32 个唯一 start；活动时 start=409，未知/过期 cancel=409，正确 cancel 才写实际 pipe。取消请求保留 cancelling，不声称系统窗口已经关闭；最终状态以真实 bundle 为准。 |
| 严格 HTTP 权限 | 只绑定 127.0.0.1，精确 Host、Origin、每实例 randomBytes(32) token；重复权限头拒绝。POST body 上限 1024 UTF-8 字节，重复/转义重复键、字段和类型严格校验，固定错误文本。GET/HEAD 不触发选择，路径/query 不映射文件。 |
| token 与资源 | token 只在首页 meta bootstrap 提供，脚本读后移除 meta；动作响应、轮询、错误和下载不包含 token。CSP/default-src none/self 脚本样式连接、no-store、nosniff、no-referrer。固定 UI 资源预先经 realpath/树内/普通文件检查。 |
| 真实 W 报告 | 结果必须是 native bundle，session_id 匹配 job，8/10000/256 策略，并通过真实 `W.assertReviewInput`；确认后委托真实 `W.startServer({bundle})`。不复制 W 展示/下载逻辑、不重算 Q、不用 iframe。 |
| 最近两份结果 | 最近在前，选择取消无 report_url；确认后的扫描取消有实际 W 报告。第三条到来即关闭淘汰记录所属 W server。新 start 不产生新报告，也不将旧 Q 标为新结果。 |
| 生命周期 | EOF/错误/非法事件停用动作；NativeFailure 无可信 bundle 时保留旧报告并 failed，不猜测选择结果。close 幂等，关闭全部自有报告和 HTTP，保留调用方 streams 与外部 W 服务。测试验证淘汰端口及工作台关闭后不可访问。 |
| 固定启动器 | `launchWorkspace({initialDirectory,port=0})` 只检查并启动本树固定 `.local/next-target/debug/water-scan-host.exe`，args 恰 `[initialDirectory]`，shell=false、原始 pipe。拒绝 binaryPath/env/未知选项与 getter；本树没有真实 X，因此启动正常返回净化错误。没有放假 exe 或生产测试模式。自有子进程关闭先 shutdown+stdin EOF，2 秒未退出仅终止该子进程，stderr 不回显。 |
| 页面与键盘 | 暖白/墨色/细线；一个主要“选择目录并扫描”动作、活动计数、取消、最近结果、错误/取消空态、普通报告新页链接。真实键盘 Enter/Tab 与焦点轮廓、1440×1000/900×800 无横向溢出均通过。 |

**完整命令历史**

以下每行命令均为 `node scripts/interactive-wave-check-r2.mjs --task WATER-W1-Y --mode <模式>`；仅最后三行加 `--final`。完整结果与子命令 stdout/stderr 在 [checks](../../acceptance/wave1/y/checks/)；每次源码与测试快照均保留，没有删改失败、修改 runner、跳过测试或放宽超时。

| 时间 UTC / 结果文件前缀 | 模式 | helper / 测试子进程退出 | 结果 |
|---|---|---|---|
| `11-15-35.556Z-31968` | baseline | 0 / 0 | PASSED；精确初始 HEAD、既有 W/双向回放/平台实际下载依赖复核，0 原生窗，不算新产品测试 |
| `11-22-28.850Z-28616` | red-behavior | 0 / 1 | 可运行骨架、完整指定测试；3 个模型测试均命中 `Y_BEHAVIOR`，不是缺文件/编译/超时红 |
| `11-27-45.755Z-32024` | test | 1 / 1 | **失败保留**：2/3 先通过，回放关闭 stdin 的收尾问题，详见下文 |
| `11-30-43.819Z-29976` | test | 0 / 0 | 修正自有回放收尾后 3/3 |
| `11-31-21.618Z-35220` | browser | 0 / 0 | 2/2，首次三图、完成及扫描取消两份实际鼠标下载 |
| `11-34-21.752Z-23680` | test | 0 / 0 | 最后一次稳定化后 3/3；随后冻结源码与完整测试字节 |
| `11-35-08.685Z-8600` | red-nc1 | 0 / 1 | `Y_ACTION_AUTH`；2 绿/1 目标红 |
| `11-35-39.664Z-27612` | test | 0 / 0 | nc1 立即原字节恢复、核全部 10 个源/测试 hash，3/3 |
| `11-36-51.840Z-29964` | red-nc2 | 0 / 1 | `Y_STALE_RESULT`；2 绿/1 目标红 |
| `11-37-15.484Z-31996` | test | 0 / 0 | nc2 立即原字节恢复、核全部 10 个源/测试 hash，3/3 |
| `11-38-36.677Z-3896` | check --final | 0 / 0 | 干净实现 SHA；Node 语法、冻结/范围、当前生产负控与恢复证据审计通过 |
| `11-38-47.329Z-15460` | test --final | 0 / 0 | 干净同 SHA，精确 3/3 模型/HTTP测试 |
| `11-39-06.885Z-29060` | browser --final | 0 / 0 | 干净同 SHA，精确 2/2 浏览器测试、当次三图与两份实际新下载 |

指定测试名保持精确五项，无 skip/ignore/filter/嵌套凑数：`workspace_protocol_state`、`workspace_http_authority`、`workspace_lifecycle_and_reports`、`workspace_actions_and_download`、`workspace_layout_and_cancel`。最终三门严格串行、每门只跑一次，均核同一生产/测试集合 hash；final 后没有改产品或测试，也没有机械重跑。

基线与 final 均完成 r2 冻结审计：202 物理条目、4 个旧资产工作文件的 Git 对象身份、15 继承锁，主回执登记的 426 唯一约束/旧 341 保持。Y 不运行 Rust 构建或任何原生 picker。

**两个实际生产负控与立即恢复**

nc1 只删掉 `server.mjs` 实际 POST 动作入口的精确 Origin 拒绝。正确 token 加跨 Origin 的请求因此被允许写到实际 output Writable；断言观察到命令数 `1 !== 0`，命中 `Y_ACTION_AUTH`。原始 server hash 为 `a46b675afb2ecebe6552fc36a57ac91a2cc0e80feaa027e64325bd6af4c425c7`，坏态为 `f6d67e0179bf0fab0a5b41d4ad58b063c63b22adc83212866401fc7f492308f0`。立即从 [稳定原始快照](../../acceptance/wave1/y/checks/stable-source/sources.json) 恢复后核所有 10 个源/测试文件，再执行 mode test 3/3；测试没有变化。

nc2 修改 `model.mjs` 真正使用的 result 接收与归属路径：放过旧 job terminal，并将其错误地归于当前活动 job，使旧 bundle 实际创建 W 报告并完成当前任务。异步测试在另一任务活动时注入上一任务结果，观察到 `ready !== failed`，命中 `Y_STALE_RESULT`。原始 model hash 为 `9df8e8bc49029203d1ee4d1c3968a76a58656dfc10bf1afc03e511474967e63c`，坏态为 `7c88a8677e25200a9010716bab5081402c51a08302543bb7efc5e19ee056d11b`。立即原字节恢复、核全部 10 个 hash、mode test 3/3，再进入实现提交。两次负控都只运行模型/HTTP 文件，没有重跑 Chrome 或打开原生窗。

详见 [nc1 修改](../../acceptance/wave1/y/checks/nc1-mutation.json)、[nc1 恢复](../../acceptance/wave1/y/checks/nc1-restored.json)、[nc2 修改](../../acceptance/wave1/y/checks/nc2-mutation.json)、[nc2 恢复](../../acceptance/wave1/y/checks/nc2-restored.json)，以及各 red 的 `*-negative.log`、完整源快照与相邻恢复结果。

**全部异常及其处理**

唯一非预期失败门是首次 mode test：两个测试先通过，生命周期测试的调用方发送 shutdown 后没有结束自己拥有的回放 stdin，冻结 Node/readline 回放未退出。保留约 105 秒失败全过程与源码快照；核实父子关系后只停止本次自有回放 PID **25472**（父 PID 24992），退出记录为 code=4294967295、signal=null，测试/helper 都按失败留档，未计作负控。随后将自有回放及固定启动器的关闭改为 shutdown 后 stdin EOF，后续所有回放正常退出 0。[人工停止原始记录](../../acceptance/wave1/y/checks/first-model-replay-stop.json) 和首次 `test-result.json`/子命令日志均保留。

准备阶段两次只读路径查找未命中（M1 计划的目录、W 不存在的 transport.mjs），随后读取实际计划文件和 W host.mjs，没有改票面或工具。Git add 提示新 `.gitattributes` 在后续 Git checkout 可能转换为 CRLF；本次文件实际为冻结 helper 要求的三行 LF，稳定快照、提交前及三 final 均保持原字节。总控在新验收树应核该文件物理字节；本票没有修改冻结 helper 或根属性。

冻结平台 baseline 的实际点击 5096 字节断言通过，但结束后 `native-probe-download-P6CoEn` 目录为空；原日志保留，不从 Q 重构附件。下面交付的是最终新 Y→W 测试留下的实际浏览器附件文件，不以基线目录冒充。

final 后整理证据时另有一次核验脚本退出 1：PowerShell 管道将脚本内的中文预期常量转成问号，正确 UTF-8 报告首行与错误常量不等；发生在任何 staging 之前。改用 ASCII Unicode 转义后继续核验，没有改产品/测试或重跑 final。[整理异常回执](../../acceptance/wave1/y/checks/post-final-evidence-preparation.json) 明确标注来自工具返回错误的转录记录，不冒充原始 stdout/stderr 文件；原三 final 与全部产品测试证据保持。

随后可选的全体 `git diff --cached --check` 对原始 TAP 诊断空白、PowerShell CRLF 证据返回 2，核验包装脚本因此退出 1；预期文件已经暂存。按工单保留原始证据字节，以 source/archive/索引 SHA 和暂存 Git blob 字节相等核验这些证据，仅对手写报告检查空白；没有修改证据、冻结 runner 或产品测试。[原始空白检查异常回执](../../acceptance/wave1/y/checks/post-final-raw-whitespace-audit.json) 同样明确标注为工具返回诊断的转录记录。

**实际下载、看图与资源结束**

最终浏览器使用一个私有 headless Chrome/独立 context，经冻结双向回放完成“完整→选择取消→确认后扫描取消→再次完整”；访问真实 W 页面后用系统鼠标事件点击其下载按钮，读取附件文件，并与该次页面的完整 Q 原文本及冻结原捕获逐字节相同。无 Q 重新序列化或替代保存。

| 当次实际附件 | 字节 / SHA-256 |
|---|---|
| [完成报告附件](../../acceptance/wave1/y/browser/live-workspace-download-J8wcWf/water-report-1.json) | 5096 / `36eeffcbf50b66453bceca5b9297a4704deb1fed8b569997fc9bd5b17416254a` |
| [扫描取消报告附件](../../acceptance/wave1/y/browser/live-workspace-download-XUvzbh/water-report-1.json) | 902 / `e08ba3bc1e83afc94c7dd5d48e6c31c34e7a1b4f5a662c2b5225106b93ac5c57` |

初次和最终的三图均已实际调用 view_image 查看；最终 [1440×1000](../../acceptance/wave1/y/checks/2026-10-19T11-39-06.885Z-29060-browser-live-workspace-1440x1000.png)、[900×800](../../acceptance/wave1/y/checks/2026-10-19T11-39-06.885Z-29060-browser-live-workspace-900x800.png)、[选择取消](../../acceptance/wave1/y/checks/2026-10-19T11-39-06.885Z-29060-browser-live-workspace-cancel.png) 可见主要动作、最近结果、可见键盘焦点和明确取消状态，未见横向溢出或技术日志/token/内部路径。[逐图记录](../../acceptance/wave1/y/checks/final-visual-review.json) 绑定最终截图 hash。

本票原生窗口预算/实际均 **0**；无物理 fixture 权限，也没有创建、遍历或读取物理扫描 fixture。Chrome 最大并发 **1**，私有 profile 与下载原位置保留。最终模型回放 PID **18708**，最终浏览器回放 PID **19152 / 24820** 均 exit=0、signal=null；私有 Chrome 已关闭。[结束进程检查](../../acceptance/wave1/y/checks/end-resource-check.json) 未见本树自有 Chrome/原生宿主进程或上述回放及原停止 PID 残留，本次结束检查没有终止任何进程。测试验证工作台/淘汰报告服务关闭；没有 cleanup/profile/下载/fixture 清理。

**证据与未验证项**

[ARCHIVE.json](../../acceptance/wave1/y/ARCHIVE.json) 逐项记录 **411 份、2,417,251 字节**证据的 source/archive/bytes/SHA-256，复制后逐项核源文件、归档文件与记录相同。包括 409 份原始证据，以及上方明确标注的两份整理异常转录回执；含本次 baseline、全部失败和预期红、好/坏/恢复源快照、两次真实回放/浏览器阶段、实际附件、截图及最终摘要；排除已有旧派前输出、profile、target/cache/binary/payload。索引本身 SHA-256 为 `7fe16df30272a83cf3d9ed9b46f358b4644d4bf16379c2daf6d22ba69bed3269`。[机器摘要](../../acceptance/wave1/y/checks/final-summary.json) 绑定受测 SHA、全部 13 门、附件 hash 和边界。

没有运行新 X 产品。本树固定 exe 不存在时的正常拒绝已测；真实 X 固定程序→Y 双向 pipe→原生选择/进度/合作取消→W/Q 的联合检查须由总控收齐两票后另做。没有假 exe、生产测试开关、任意执行路径或真实用户目录授权。Windows 受控回放/HTTP/浏览器单票测试通过；真实用户 scope、生产恶意竞态、自然手势/来源鉴真、macOS、桌面壳/打包/发布及 M1 均未验收。报告提交后停测停改，交回总控。
