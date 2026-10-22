WATER-W1-AA 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/aa/docs/dispatch/reports/WATER-W1-AA-REPORT.md

状态：**SUBMITTED，待总控复核**。2026-10-20（Asia/Tokyo）。三个 final 通过；本次截图采集无效，不能据此声明原生视觉验收通过。没有更新主线台账、合并、push 或放行真实用户 scope。

## 提交与执行环境

| 项目 | 实际值 |
|---|---|
| 权威工单 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-AA-PROJECT-SESSION-20261019.md` |
| 工作树 / 分支 | `F:/new/smaltalk/water/.worktrees/aa` / `worker/water-w1-aa` |
| 首次 HEAD / tag | `f3b87b7a79ff8fa51882705ecef75f1f02d8af15` / `water-w1-project-consent-base-20261019` |
| 开工状态 | 主 manifest：READY / baselineStatus=PASSED；本树干净，产品目录不存在 |
| 实现及受测 SHA | **`b3a874d0a1628a7bdce6f3414f234b2b45957152`** |
| 回执提交定位 | 本文件所在的后续报告/证据提交，直接父提交为上述实现 SHA；`git log -1 --format=%H -- docs/dispatch/reports/WATER-W1-AA-REPORT.md` 可精确定位 |
| 实际引擎 / 模型 | Codex；会话系统标识为基于 GPT-6。未提供可独立核验的具体服务模型子版本/快照 ID，不冒填其它模型 |
| 工具 | Windows x64，Rust 1.95.0 MSVC，Node v24.16.0；Rust jobs=1，私有 `.local/next-cargo-home`、`.local/next-target`、`.local/next-tmp`，offline/locked |
| 分包 | 无子代理、CLI worker 或实现分包 |

三个 final 的 before/after 都绑定实现 SHA 且工作树干净；其后没有产品、测试或锁文件改动。实现提交包含产品、四测试和当时的负控/观察源码证据；后续提交仅报告和证据。

## 实现及要求对照

| 要求 | 落地与验证 |
|---|---|
| 独立 workspace 与固定依赖 | `packages/project-session` 自有 workspace/锁，lib/bin/test 三 target、四 auto=false、edition2024、rust1.95、publish=false；恰 A/P/S/R/E/H/Q/Z/X、serde/serde_json 依赖。锁仅 `mode lock` 离线生成，未增加 registry/dev/build 依赖。metadata/check 门实际核验 |
| 可信公开入口 | `v1::capture_registered` 接受真实 P 的 `Registry/RegisteredScope`，实际调用 R，固定预算 8/10000/256，job_id 作 scan_id，再实际调用 E/H/Q；无 UI 单测独立运行，未用测试闭包/假能力替代生产读取 |
| 显式内容选择 | `MarkerChoice` 无 Default/Deserialize；start 必须包含 bool `read_manifest`，choice 随本次 NativeJob 移入工作线程，后续 cancel/shutdown 无法携带或修改 choice。默认 Skip 不调用 Z；两条真实负控验证 |
| 同一根与同次选择 | CLI 真实 S.select_scope，工作线程持有 SelectedScope/自己的 P 登记，root 只取 selected.root_path；初始参数只给 PickerOptions。不调用旧 V/X.run，不在释放 scope 后按 UI 路径重建能力 |
| 许可与清理 | R 先结束自己的元数据 attempt，才可能由同一 registry.begin_scan(scope) 开启本次短暂内容 attempt，真实 Z.approve/read/序列化；成功 finish，异常或 unwind guard 只 cancel 自己已成功建立的 attempt。CLI 正常/错误/panic 撤销自己选中的登记 |
| 不影响调用方能力 | 无 UI 测试覆盖成功/错误后 scope 可继续 begin_scan；已经 active 的本 scope permit 不被误 cancel；其它 scope 的 active permit 保持；错误 registry、错误根、非法路径、已 revoke 和 observer panic 均验证 |
| 取消优先 | Skip 优先于任何取消；true 且真实 R 报告 cancelled 或内容前 live token 已取消时 skipped/scan_cancelled；S 取消时 skipped/selection_cancelled 且无 snapshot。四窗 native 验证 S 取消与扫描取消的区别 |
| 结果与隐私 | ConfirmedCapture 私有四字段、无任意构造器/可变 getter/Default/Deserialize；可信 API 不输出 native_directory_dialog envelope。只有 CLI 真正 S 返回后构造原七键 native-session bundle。metadata 的 ordinary_content_read=false 原样保留，Z 的 ordinary_content_read=true 位于独立 marker；不提升 protected/归属/动作权限 |
| 原数据保持 | 六种无 UI 真实新 API 结果与冻结 CASES 的 R/E/H/Q/Z 值逐项一致；native 四种结果也逐值一致。Q 与 Z 原 UTF-8 JSON 字符串不重新格式化 |
| 请求/wire | 同一公开 decoder 服务 stdin，4096 字节、紧凑 UTF-8、LF、严格字段/重复及转义重复键检查。单 input reader、单 writer、单 native worker，复用真实 X.HostState/NativeJob/CancelToken；任务不复用、不排队、最多32个，progress 单调且只含计数 |
| 输出与错误 | bundle 67108864 字节、marker string 8192 字节、事件含 LF 67125248 字节守卫；六种 CLI failure code 复用 X 枚举。ProjectError 五枚举且 Display 固定 `Project session unavailable.`。非法 argv=64，无法继续的 stream/output=2；正常 stderr 空，无路径/原始错误/栈 |
| 代码范围 | lib/bin forbid unsafe；新产品无 FFI、内容文件 IO、shell、网络、环境 fallback 或任意程序路径。内容 payload 读取仅真实 Z；测试只读取本树 factory 的元数据 index。没有修改旧 A–Z、共享锁、helper、根 Cargo、台账、上游或其它工作树 |

公共 API 测试由可信 P 直接确认，没有冒称运行了 S。冻结 CASES 的 R/Z 值来自真实旧依赖，但其 dialog envelope 是明确合成声明；本次新的 S→AA→R/Z 链路证据另由 native final 取得。AA→AB 用户页面联合链仍留总控。

## 定向验证与全部门结果

以下命令统一前缀为：

`node scripts/project-wave-check.mjs --task WATER-W1-AA --mode <mode>`

唯一测试文件 `packages/project-session/tests/project_v1.rs`，恰四个顶层测试：`project_request_boundary`、`project_consent_state`、`project_capture_and_marker`、`project_wire_and_cleanup`。无 skip/ignore/filter/嵌套测试；通过的完整清单为 4 passed / 0 failed / 0 ignored / 0 measured / 0 filtered out。

| UTC 时间 / mode | helper 退出 | 实际结果与证据文件（均在本票证据目录） |
|---|---:|---|
| 08:03 baseline | 0 | 真实既有 P/R/E/H/Q/Z/X baseline，通过；44 子命令、0 窗、新产品未测试；`gates/2026-10-20T08-03-37.224Z-16656-baseline-result.json` |
| 08:09 lock | 0 | 唯一离线 generate-lockfile；`gates/2026-10-20T08-09-34.412Z-10208-lock-result.json` |
| 08:09 red-behavior | 0 | 可运行骨架的完整四测：1绿3红，Rust 实际退出101，命中 AA_BEHAVIOR；`gates/2026-10-20T08-09-44.141Z-31880-red-behavior-result.json` |
| 08:10 test | 1 | 开发期 E0596：读取闭包需要可变绑定，编译失败。改 `let mut read`；**不计行为负控**；`gates/2026-10-20T08-10-51.763Z-23612-test-result.json` |
| 08:11 test | 1 | 3绿1红：自编 observer 用例错误假定 R 必定输出 cancelled，实际最后一项之后取消时仍 completed；见下文；`gates/2026-10-20T08-11-04.416Z-21792-test-result.json` |
| 08:11 test | 0 | 完整四绿；`gates/2026-10-20T08-11-25.624Z-31720-test-result.json` |
| 08:11 check | 1 | Clippy large_enum_variant 两处；将真实 bundle 用 Box 持有以减小消息/事件枚举，不关闭 lint；`gates/2026-10-20T08-11-48.365Z-23860-check-result.json` |
| 08:12 check | 0 | fmt / all-targets clippy -D warnings 通过；`gates/2026-10-20T08-12-30.705Z-7196-check-result.json` |
| 08:13 red-nc1 | 0 | 实际四测2绿2红，Rust退出101，AA_NO_CONTENT_CONSENT；`gates/2026-10-20T08-13-49.804Z-33912-red-nc1-result.json` |
| 08:14 test（nc1 恢复） | 0 | 原字节恢复/hash、完整四绿；`gates/2026-10-20T08-14-06.812Z-31472-test-result.json` |
| 08:14 red-nc2 | 0 | 实际四测1绿3红，Rust退出101，AA_CANCEL_NO_READ；`gates/2026-10-20T08-14-27.110Z-19248-red-nc2-result.json` |
| 08:14 test（nc2 恢复） | 0 | 原字节恢复/hash、完整四绿；`gates/2026-10-20T08-14-49.442Z-14504-test-result.json` |
| 08:17 check --final | 0 | 实现 SHA 干净、fmt/clippy、当前测试与生产 hash 恢复链通过；[final check](../../acceptance/wave1/aa/gates/2026-10-20T08-17-02.768Z-27668-check-result.json) |
| 08:17 test --final | 0 | 同一实现 SHA、完整四绿、类型边界；[final test](../../acceptance/wave1/aa/gates/2026-10-20T08-17-13.982Z-28952-test-result.json) |
| 08:17 native --final | 0 | 同一实现 SHA，四窗一次通过，13事件，正常退出0；[final native](../../acceptance/wave1/aa/gates/2026-10-20T08-17-31.852Z-33824-native-result.json) |

原 observer 断言是“R.status 必为 cancelled”，修正为保留真实 R 的 completed，并增加 `cancel.is_cancelled()==true`、marker 必须 skipped/scan_cancelled 的独立断言。依据 SPEC 明确的“R cancelled **或**内容前 token cancelled”两条条件；未改 R/helper/冻结断言、未放宽 Skip/取消读取保护。此调整发生在稳定测试及两条生产负控之前，原失败完整保留。

四测额外覆盖 missing、trap/private.json 不读、malformed、InvalidUtf8、262144 边界、oversize、directory、junction、hardlink；Z 错误保留真实元数据与 failed sidecar。成功编译对照及六项私有类型拒绝（Default、外部构造、Deserialize、字段修改、choice Default/Deserialize）各有原始 rustc 文本与日志；本次共五组 type-probes。这些编译拒绝是类型证明，不充当生产行为负控。observer 的预期 panic 被测试捕获，完整绿日志中的该条 panic 文本不代表测试失败。

每一实际 helper 子命令的 argv、退出码、超时/error 字段和原始日志映射见 [submission-summary.json](../../acceptance/wave1/aa/submission-summary.json)。没有超时造红、降断言、跳测试、安装新依赖或运行全仓/上游命令。

## 稳定生产负控与恢复

稳定测试 hash：`10e9b05dfeec451918b1a14c5cfd48b69a331a7594f1b413253995fc3635ccdd`。

稳定生产 hash：`1d3703c96b1b528e691139a27fc65f3fe8ba192e34feaa39b66923115e39a2fc`。

| 负控 | 真实改变 | 指定命中与恢复 |
|---|---|---|
| nc1 | 唯一 Skip 条件临时改 false，让 Skip 实际进入同一 begin_scan→Z.approve→Z.read；good 根产生 observed、844字节真实结构证据 | AA_NO_CONTENT_CONSENT；没有只改状态/断言。立即从保存文件恢复，核 hash，再完整四绿，之后才做 nc2 |
| nc2 | 唯一“R cancelled 或 live token cancelled”条件临时改 false；真实 cancelled R 报告后仍调用 Z 并产生 observed | AA_CANCEL_NO_READ；marker 含真实 Z JSON。立即原字节恢复/hash→完整四绿 |

`v1.rs` 保存/恢复 SHA256：`ccfc7f76820ae96f355884cdf2993f72ff4ac9dbe3814e69737d863e1a5ec5fb`。

nc1 坏源码：`9d54ad8bd224748adc4bc963c183dbbe0b9517c789d3a06e7501214737e8cfc3`；nc2 坏源码：`530d6cc38de96ea8a608fbfd44d4f5cca2c8f28a8772ad42d44ed3e6438ed708`。三次 final 实际 proofAudit 通过；完整好/坏源码快照与测试 hash 在各门原始 receipt 中，额外保存 [negative-source](../../acceptance/wave1/aa/negative-source/v1-good.txt) 和 mutation/restoration JSON。没有更改测试、helper、R/Z/X 或超时；负控原生/Chrome 窗口均0。

## 真实 native、字节附件与进程

同一个新 AA 进程 **PID 1860**，只用本树 `.local/root-marker-fixtures/batch-v1/good` 合成根：

| 次序 | start read_manifest / 动作 | 真正返回 |
|---|---|---|
| 1 | false / 确认 | metadata completed；marker not_requested |
| 2 | true / 确认 | metadata completed；marker observed，Z ordinary_content_read=true |
| 3 | true / 取消选择 | selection cancelled，snapshots=[]；marker skipped/selection_cancelled |
| 4 | true / 先 cancel_ack 再确认 | selection confirmed，metadata cancelled；marker skipped/scan_cancelled |

driver 实际按固定 PID/title 操作四个窗口，每项同冻结依赖值逐项比较。正常 native final 共4窗，全单实际4窗，未使用额外4窗预算；baseline/单位/负控0窗，未运行 Chrome。关闭后 stopped/正常退出0，stderr 空；没有强制终止。结束观察未发现本树 AA 进程残留，也未执行 kill：[进程回执](../../acceptance/wave1/aa/observations/end-process-observation.json)。本产品是 stdio，不创建 loopback 服务。

[原始13事件与 native driver 回执](../../acceptance/wave1/aa/native-driver/2026-10-20T08-17-37.776Z-17664-native.json)完整归档。从其中已传输的 UTF-8 字符串逐字节抽出四份附件证据，**没有运行浏览器下载，也不将抽取称作产品保存功能**：

| 原始字符串 | 字节 | SHA256 |
|---|---:|---|
| 默认 metadata Q | 1387 | `688326559e719a0d9099dca6a580d94aaef518d40a4c54872a2b5c7f6ad58550` |
| true metadata Q | 1387 | 同上 |
| true Z 结构证据 | 844 | `3d5ab3ad3916ad49dfe1621ff4e7bbc99dc4103b2ab052884f5571c0bb9b9350` |
| scan_cancelled metadata Q | 902 | `e08ba3bc1e83afc94c7dd5d48e6c31c34e7a1b4f5a662c2b5225106b93ac5c57` |

具体文件、原始事件 JSON Pointer 和来源说明见 [ORIGIN.json](../../acceptance/wave1/aa/wire-attachments/ORIGIN.json)。这里不复制 package.json 正文、内容 hash、包名、依赖名、脚本或能力。

## 实际看图与采集失败

只读观察器在同一次 native final 中按本树 executable/PID/title 匹配到4个 HWND，并保存4张960×600屏幕裁片。该观察器不打开窗口、不发 UI 动作，返回0，但 **实际逐张查看后，4张均为背景应用界面，不是 Water 对话框像素**。因此截图采集判无效，原生视觉渲染未验证，不能把 UIAutomation 的匹配当作看图通过。

这是本执行者使用屏幕坐标截图的错误，意外采到了本任务之外的前台像素；未将其当作产品证据或用户数据样本使用。为避免把无关界面复制进 Git，4张原图不进入提交/像素归档，原位保留于本树 `.local/checks/WATER-W1-AA/native-window-01.png` 至 `04.png`，未删除或清理。只归档匹配 HWND 的元数据，并在 ARCHIVE 的 excludedScreenshots 保留原文件名/字节数/SHA256和排除原因。没有对背景内容作转写或分析，也没有为补截图重新运行已通过的 native 门。

[观察元数据](../../acceptance/wave1/aa/observations/native-screen-observation.json)与[观察器源码](../../acceptance/wave1/aa/native-window-observer.txt)可复核采集方式。协议、自动操作、真实 R/Z 的结果断言仍独立通过；这些不能替代视觉证据。若总控要求有效原生渲染图，需要另给有界截图采集方案，不在本次通过后自行重开窗口。

## 其它执行记录

- 初始读取使用 PowerShell 默认编码，中文显示异常；后续明确 UTF-8 重新读取。探索期间少量 rg/Get-Content 路径猜测不存在，命令返回1；包括 `scan-host/src/v1.rs`、`scan-host/src/host.rs`、不存在的发现候选目录及本树尚无的主线 READY 回执。根据文件清单纠正，并从主检出绝对路径读正式 READY/manifest，未复制控制提交。
- 一次只读 `node -e` 查询 manifest 被 PowerShell 引号传递破坏而 SyntaxError/退出1；改 PowerShell ConvertFrom-Json 读取成功，没有改项目文件。一次 apply_patch 上下文不符，工具拒绝且未修改文件，读取实际格式后重做。
- 格式化命令为 Rust1.95 的 cargo fmt，仅本票 manifest，退出0。首次 `git diff --cached --check` 对原始 PowerShell CRLF/BOM证据报 trailing CR/退出1；保留这些原字节，用 `-c core.whitespace=cr-at-eol` 检查通过，未重写证据或改仓库配置。
- 上述探索工具错误及格式检查记录是会话回执摘要，未伪称另有其进程原始日志。15次正式门（含三次非预期失败）、全部负控/恢复、原始子命令输出和源码快照均已逐字节归档。

## 归档、冻结与交回

[ARCHIVE.json](../../acceptance/wave1/aa/ARCHIVE.json)：**674项 / 3,259,890字节**，逐项 source/archive/bytes/SHA256。归档程序逐文件核对来源和目标原字节，包含15次门、两条真实负控及每次即时恢复、全部失败、五组编译拒绝/成功对照、native原始事件、原始字符串附件、fixture元数据index与观察来源。[归档源码](../../acceptance/wave1/aa/archive-evidence.txt)亦保留。ARCHIVE自身和本报告不做自引用 hash；无效截图的排除单独明示。

未纳入 target/cache/executable/rmeta/profile/普通payload或无关截图像素。所有 fixture、失败日志、构建环境和原始现场保留，没有 reset/clean/递归删除/移动/ACL 操作。证据按明确路径暂存，忽略的 log 使用显式 `git add -f -- <文件>`，不整树 add。

交回前又独立读取674项的 source/archive 校验，字节数与SHA均一致，报告本地链接全部存在，三个 final 的源码/测试快照均与当前实现逐字节相等。ARCHIVE.json 自身SHA256为 `504eb1585f35b10bbf02d7b2c6bc19922d23e29f292dbdfb01fad0d503b284fc`。

各正式门实测保持新228物理条目、16继承锁、5份旧资源Git对象；归档去重为479唯一路径约束，旧426保持。物理 fixture 为本树冻结adapter复用的524474字面合成payload；没有扫描 HOME、整盘或真实用户目录。意外屏幕像素采集的边界错误已在上一节单独披露，不以“未扫描真实目录”掩盖。

未验证：AA→AB真实页面联合链、自然用户内容同意鉴真、生产竞态/恶意替换、真实用户scope、原生视觉渲染、macOS、正式桌面与M1。结构证据保持 protected/display_only/归属未知。无删除执行器、发布或安装。

本票仅交回 **SUBMITTED**；后续由总控复核与联合验收。交回后停止本票测试和产品修改，不占用或改变其它槽位。
