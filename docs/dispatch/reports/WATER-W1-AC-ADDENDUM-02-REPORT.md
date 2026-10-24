WATER-W1-AC 补充单02 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/ac/docs/dispatch/reports/WATER-W1-AC-ADDENDUM-02-REPORT.md

2026-10-24，状态 **BLOCKED**。配置/导航真实实现、完整三测试先红、两条生产负控及逐次即时原字节恢复/三绿均已完成；最终 check 在冻结控制入口的 clippy 离线源选择处失败，final test/native 尚未运行。没有使用唯一桌面窗口预算，不记 SUBMITTED/VERIFIED 或桌面产品验收通过。

## 执行身份、基线与 SHA

| 项 | 实际值 |
|---|---|
| 执行者/模型 | 原 AC 对话，Codex / GPT-6；会话没有更细模型 ID，不推定变体 |
| 树/分支 | F:/new/smaltalk/water/.worktrees/ac / worker/water-w1-ac |
| 续做基线 | ef0b7c4b3a84c434c0cd3b691b79c8a4a37d311c；初次仅总控已公布的 Cargo.lock 未跟踪，其余干净 |
| 原骨架 | b617b90182d54053091910b8b4e889dd7f614a7d；历史未产品受测，不追认 |
| 实现/测试/锁提交 | **eb7f80178191e233068015bbc26dc9798ac8cb22** |
| 实际受测绑定 | 三次完整测试绿在 ef0b7c4 的工作区运行；最终源/测试逐字节哈希与 eb7f801 的 final check 快照一致。final check 确实运行于干净 eb7f801；**没有该提交上 final test/native 的通过记录** |
| 交回提交 | 后加提交仅补单02报告/证据，以 worker/water-w1-ac 最终 HEAD 定位；产品保持 eb7f801 原字节 |
| 其它权限 | 无子代理/worker、push/merge、主台账编辑；原报告/46证据、冻结工具、其它票和主检出只读 |

## 已实现与未验证项

| 需求 | 实际结果 |
|---|---|
| 独立 workspace / 精确版本 | Rust1.95/edition2024，publish=false，四项 auto=false，唯一显式 lib/bin/bootstrap_v1/build.rs；四直接依赖及 Tauri 两 feature 均通过每次真实 metadata 校验。根 Cargo/锁未改 |
| 私有依赖与锁 | 提交总控实际生成的 Cargo.lock，SHA `c56b58aa141a85617a59db4de679ff73d69827aee81bda958b1fdee0c9bbbfe8`；未重新下载。全部产品门使用绝对 ac-mirror-check、offline/locked、原私有 Cargo home/target/tmp、jobs1/600秒 |
| 配置 validator | `validate_preview_config` 用 typed 必填字段与 deny_unknown_fields，拒绝重复/未知/错类型/缺字段、权限及资源矛盾。固定 product/version/id/frontendDist；空 windows/capabilities/plugins，关闭 global Tauri/asset protocol/bundle；八项 CSP 精确校验并拒绝重复或额外宽松指令。错误仅 `Desktop preview unavailable.` |
| 导航 validator | `is_bundled_navigation` 只接受精确 tauri://localhost 或 http://tauri.localhost 的规范根、/index.html，可带 fragment；拒绝外部 origin、凭证/端口/query、lookalike、编码/遍历路径及控制/空白字符。运行回调传入框架解析后的 URL，源码没有声称恢复原始导航字符串 |
| 真实运行接线 | main 在 setup 前调用同一配置 validator，on_navigation 调用同一导航 validator；新窗口/下载/权限请求拒绝，禁用 JavaScript、拖放与 devtools，无 invoke handler/插件。该路径已随 integration test 的正常 bin 构建编译；**窗口运行行为未 native 验证** |
| 窗口与 profile | 保持唯一 main、title Water Desktop Preview、1000×760。创建前显式选择本树 .local/desktop-webview 新私有目录，父目录拒绝符号链接和 Windows reparse point；本次未启动，不宣称 profile/关闭生命周期或生产竞态已实测 |
| 自有静态资产 | 原 HTML/CSS 与 Water/桌面壳已启动/尚未接入扫描/只读开发预览保持；无 JS、远程资源/链接、iframe、假扫描结果或已支持 macOS 宣称。原1150字节纯色 ICO 不变，未引入第三方资源 |
| 安全边界 | Rust lib/main forbid unsafe，build.rs 仅 tauri_build::build；不运行 Node/AA/AB 作为产品子进程、不扫描或选择真实/物理 fixture 目录、无内容读取/导出能力 |
| 验证与交回 | 原三测试精确计数、实际先红和稳定两负控/恢复已完成；check 未完整通过，final test/native 未运行。当前为控制门受阻，不能当完整桌面交付 |

## 实际门、退出与原字节

所有门从 AC 树执行 `node F:/new/smaltalk/water/scripts/ac-mirror-check.mjs --task WATER-W1-AC --mode <mode>`；final check 加 `--final`。隐藏非交互 evidence launcher 只调用这条冻结入口并记录实际 OS exit，不修改环境、超时或断言。一树一门，没有额外下载、watch/全仓/coverage 或直接替代 clippy 命令。

| 时刻/模式 | 实际退出与结果 | 原始回执 |
|---|---|---|
| 03:34:27 resume | Node 0，preparedLockAccepted/sourceCodeUnchanged；519约束、原13源码/报告/46证据保持 | [resume](../../acceptance/wave1/ac/addendum-02/raw/2026-10-24T03-34-27.671Z-28384-resume-result.json) |
| 03:35:08 red-behavior | metadata 0、冷编译成功（5m29s）；Cargo 三测试 101、AC_BEHAVIOR 命中，helper/launcher 0。是有效预期红，不是测试绿 | [先红](../../acceptance/wave1/ac/addendum-02/raw/2026-10-24T03-35-08.929Z-40504-red-behavior-result.json) |
| 03:42:03 test | metadata/Cargo/helper/launcher 0，三测试全绿、0 ignored/filtered | [首次三绿](../../acceptance/wave1/ac/addendum-02/raw/2026-10-24T03-42-03.525Z-36072-test-result.json) |
| 03:43:19 red-nc1 | 真正移除生产 capability 拒绝；Cargo 101，仅 config 测试红，命中 AC_CAPABILITIES；helper/launcher 0。临时 unused-field warning 如实保留，非编译失败 | [nc1](../../acceptance/wave1/ac/addendum-02/raw/2026-10-24T03-43-19.453Z-42740-red-nc1-result.json) |
| 03:43:57 test | 即时按原字节/hash恢复，metadata/Cargo/helper/launcher 0，完整三绿 | [nc1恢复绿](../../acceptance/wave1/ac/addendum-02/raw/2026-10-24T03-43-57.782Z-37176-test-result.json)、[恢复哈希](../../acceptance/wave1/ac/addendum-02/raw/nc1-restored.json) |
| 03:44:35 red-nc2 | 真实生产导航函数放行 HTTPS；Cargo 101，仅 navigation 测试红，命中 AC_NAVIGATION: https://example.com；helper/launcher 0 | [nc2](../../acceptance/wave1/ac/addendum-02/raw/2026-10-24T03-44-35.454Z-31596-red-nc2-result.json) |
| 03:45:13 test | 即时按原字节/hash恢复，metadata/Cargo/helper/launcher 0，完整三绿 | [nc2恢复绿](../../acceptance/wave1/ac/addendum-02/raw/2026-10-24T03-45-13.429Z-32560-test-result.json)、[恢复哈希](../../acceptance/wave1/ac/addendum-02/raw/nc2-restored.json) |
| 03:46:28 check --final | 干净 eb7f801；冻结/范围/原件/proof/metadata 通过；fmt 0，clippy 101，helper/launcher 1。before/after Git status 均为空 | [final check失败](../../acceptance/wave1/ac/addendum-02/raw/2026-10-24T03-46-28.381Z-29680-check-result.json)、[clippy stderr](../../acceptance/wave1/ac/addendum-02/raw/2026-10-24T03-46-28.381Z-29680-check-6.log) |
| test --final / native --final | **未运行**，没有伪造通过或启动窗口 |

稳定恢复/最终快照的 productionHash 均为 `38c7a927cb30fd79f91e5e52e875a81dcb1585b359390dca50af5b24a2d2139d`，testHash 均为 `211ba3014991309b2bda94cd422f4496c2ac552fa57507c3bb35283ae2acefe7`。两个负控只改生产逻辑，没有删/skip/过滤测试或生产测试开关。好/坏/恢复源码、命令、stdout/stderr/退出及原件 SHA 已完整索引。

## 具体阻塞与最小修订

clippy 报 `no matching package named version_check found`，但 [只读缓存检查](../../acceptance/wave1/ac/addendum-02/raw/BLOCKER-INSPECTION.json) 证明镜像缓存中该包/index/source 完整，crate SHA 与现有锁一致；旧官方缓存没有该索引。无需再下载同一镜像包。

冻结 entry 的参数形状是 `cargo <镜像--config> clippy ...`。结合 [Cargo 1.95 external 分派](https://raw.githubusercontent.com/rust-lang/cargo/rust-1.95.0/src/bin/cargo/cli.rs) 与 [Clippy 1.95 的内部 Cargo 启动](https://raw.githubusercontent.com/rust-lang/rust/1.95.0/src/tools/clippy/src/main.rs)，推断前置参数未转入 Clippy 的内部 Cargo，导致离线使用未准备的 canonical cache。这是有日志/源码支持的根因推断；未捕获失败内部进程 argv，未执行修正后重跑，不能写成修复已获验证。

总控最小编号修订：让 clippy 仍用相同镜像参数，但放到 `clippy` 后、`--` 前，保留 offline/locked/all-targets/deny-warnings/版本/私有目录/预算；更新冻结和续做基线后授权受影响 final check 与剩余门。具体候选写在 [CONTROL-FIX-PROPOSAL.txt](../../acceptance/wave1/ac/addendum-02/CONTROL-FIX-PROPOSAL.txt)，**未应用、未执行**；分析见 [CONTROL-BLOCKER.md](../../acceptance/wave1/ac/addendum-02/CONTROL-BLOCKER.md)。执行者没有权限修改被冻结的控制文件，没有要求用户临时放宽权限、写 Cargo 配置或复制缓存绕过检查。

## 来源许可证、证据与结束状态

锁/source/license 清单沿用已准备的238个 Windows 包、35514705字节，canonical source 仍 `registry+https://github.com/rust-lang/crates.io-index`；本票每次 metadata 继续检查四精确依赖、feature/target 与所有 Windows 来源/许可证。完整 [DEPENDENCY-INVENTORY.json](../../acceptance/wave1/ac/addendum-02/controller-preparation/DEPENDENCY-INVENTORY.json) 与 [总控checksum离线审计](../../acceptance/wave1/ac/addendum-02/controller-preparation/controller/2026-10-24T03-13-43.578Z-40636-offline-audit.json) 已原字节纳入归档。总控238包匹配锁、395锁项匹配镜像索引；84项可对照保留的官方cache（含四直接依赖），其余311项未独立官方对照，依用户授权信任镜像及 Cargo checksum。不是全部官方逐项鉴真或发布许可证审查通过。

[ARCHIVE.json](../../acceptance/wave1/ac/addendum-02/ARCHIVE.json) 逐项 source/archive/bytes/SHA-256：8次实际门、所有源码好坏/恢复、命令/失败、完整 source/license/checksum、scope/proof/进程和控制修订建议。只读 [HANDOFF-AUDIT.json](../../acceptance/wave1/ac/addendum-02/HANDOFF-AUDIT.json) 再核519约束、旧46原件及 eb7f801 产品字节保持。排除 cache/crate/source包、target/binary/tmp/profile、真实数据和AA旧图片；索引与报告自身不做自引用 hash。所有日志逐路径 `add -f`，其它文件逐路径暂存，原日志/手写报告空白检查分开记录，不美化失败。

[分类空白与逐文件暂存记录](../../acceptance/wave1/ac/addendum-02/raw/EVIDENCE-STAGE-CHECKS.json)：补单02原始日志检查 exit 0、手写报告/证据检查 exit 0；与旧回执中的原始日志 exit 2 分别记录，不更改历史。[HANDOFF-VALIDATION.json](../../acceptance/wave1/ac/addendum-02/HANDOFF-VALIDATION.json) 记录来源/归档/暂存 blob 原字节与本报告本地链接检查；验证记录随后自身加入最终索引，不作自引用 hash。

[PROCESS-END.txt](../../acceptance/wave1/ac/addendum-02/raw/PROCESS-END.txt)：实际自有进程0、强制终止0；静态桌面窗口0、目录窗0、截图/像素查看0，未创建 WebView profile、没有 native reservation。没有“实际看图”或 UIA/正常窗口 exit0/子WebView退出通过的证据。所有原缓存与日志保留；不改系统代理、网络、证书或全局/项目 Cargo 配置。

交回后停止产品改动与测试。Windows单元行为/边界有上述实测，clippy/final/native未验收，真实桌面→AA/AD扫描整链、真实用户scope、自然同意鉴真、生产竞态、macOS/M1均未验收。旧受阻/补单01历史及其它30任务/槽位保持，当前只能 BLOCKED 等待总控编号修订。
