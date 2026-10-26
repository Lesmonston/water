WATER-W3-F3 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w3-f3/docs/dispatch/reports/WATER-W3-F3-REPORT.md

2026-10-26，执行者回执。实现、五测、三条有效负控及三个 final 命令均已通过；本票仍受阻：真实窗口检查生成的六张截图中，只有首页包含页面，其余五张均为 199×34 的标题栏图片，不能交作对应页面的视觉证据。唯一一次窗口预算已使用，未重跑、补拍、改图或修改检查器。检查器的原始 passed 回执保持原样，不把机械通过写成六图验收完成。

**身份与基线**

- 实际执行引擎：Codex；当前会话可见的模型标识为 GPT-6，未向执行者暴露更细的版本名。manifest 中的用户调度名 sol 不据此扩写成未经验证的精确型号。
- 工作树：`F:/new/smaltalk/water/.worktrees/w3-f3`；分支：`worker/water-w3-f3`。
- 初次 HEAD：`d56ebc66becc02e855ffda0edbf36a2e82470c2d`，精确匹配票面且 Git 干净。
- 实现提交：`2a1e4560596e75b501500b4b012084ff432230c5`。负控均在该提交上暂改一行，再 `git checkout -- <指定文件>` 恢复。最后的三个 final 绑定此提交；之后仅增加本回执及 archive 生成的证据。
- 先读 F3 正式票，再核对 README、STATUS、PROJECT-CHARTER、CONTROLLER-WORKFLOW；按票面顺序读 W3 规则、PLAN 的 F3 节、WIRING、HOST、F2 补单 01、宿主源码和原四测、服务公开 API，并参考服务测试的合成 Platform 写法；另读 ADR-018、IPC、MODEL、SERVICE。
- 使用一个只读辅助 `f3_contract_review`，复核契约、实现和截图缺口。它未写文件、运行检查、访问真实扫描记录或打开窗口，不取得正式实现权限。全部实现与检查由本执行者完成。

**受阻原因与最小补充需求**

本次 `native --final` 的 11 个 UIA 步骤均通过，窗口正常退出，服务目录数量也通过。但 `results`、`clean-disabled`、`trends`、`history`、`locations` 五张原图仅含标题栏，没有页面内容。逐张已实际查看，详见后表。无法从这些图片核对结果、错误提示和三个页面的视觉呈现。

只读查看权威观察器发现，`scripts/acceptance/w3-wired-native-observe.ps1:60` 的 `Shot` 只要求 GetWindowRect 的宽高大于零、至多 8000，并要求 PrintWindow 返回成功；未检查是否最小化、是否离屏，也未要求包含页面或达到正常窗口尺寸。因此这批 199×34 图片会机械通过。这个尺寸符合最小化后标题栏的表现，但现有证据不能确定窗口为何变成该状态，也不能认定由谁触发。宿主没有新增最小化调用。未把此推测写成已证实的产品缺陷。

最小补充需求由总控选择并正式说明：在既定的独立验收窗口中补足五页视觉证据，或发编号补单，明确观察器修订范围和一次有界补证窗口/真实扫描额度。本执行者不借用总控额度，不自行调整既有预算，也不请求绕开工单继续开窗。

**WIRING 第 1～6 节逐条对照**

| 节 | 实现与核对 | 结论及限制 |
|---|---|---|
| 1 crate 与文件 | 保留 crate/workspace/工具链形状、forbid unsafe；在原七项依赖之外恰好增加 water-service、water-junk-rules、water-process-scan 三个路径依赖。后两者只在宿主测试中引用类型。lock 只补本地包和依赖边；395 个当前平台 registry 包与 AC 同版本同 checksum。 | check/lock 通过。仅改宿主八个文件；config、capability、icon、UI、packages、契约、脚本、台账保持。 |
| 2 启动顺序 | `run<F>` 依次验证配置、Builder 注册 17 命令并 build、准备目录、持锁、解析 home、构造后端、manage、按原设置建窗、run。没有 setup。所有显式可失败步骤映射 StartupError；启动代码未用 unwrap/expect/索引。main 打印 Display 并 exit 1，release 隐藏控制台保持。 | check 及正常 native 启动通过。未额外启动故障进程或窗口；各类启动错误的独立进程级故障注入未做。 |
| 3 单实例 | `startup.rs` 的 OpenOptions 读写/create/truncate(false)/share_mode(0)，不写锁内容，退出不删锁文件；OS32 映射 AlreadyRunning，其余 Failed。锁绑定一直保留到 app.run 返回。两句 Display 固定。 | 合成测试证明持锁时第二次冲突、释放后重获、空锁文件保留、其它错误 Failed；nc2 有效。未额外开第二个真实实例。 |
| 4 服务接线 | `ServiceBackend` 直接转发 Value，并逐字段移动错误；CLEAN_ENABLED=false。`service_config` 用同一 data_dir、包版本、WindowsPlatform::new 和 ctx.home_dir 构造 HostPicker；service_backend 用 Service::new。HostPicker 以原子状态和 RAII PickGuard 防重入，结束和出错均释放，错误原样转成 IpcError。 | 合成真实 Service 及 native UIA 验证通过；清理保持关闭。真实选择框未打开。 |
| 5 五个测试 | 保留 config/navigation/原命令转发和六种 picker 错误映射；新增实际 Tauri wrapper 参数 camelCase 和 generate_handler 源码核对；数据目录测试补默认来源联接拒绝和锁核对；第五测用真实 Service + 合成 Platform。 | 精确五测，全部通过，无 ignore/filter。三条负控均为真实 src 单行变异，目标断言失败，原字节恢复后五测均绿。 |
| 6 整机检查 | 一次 native、一次真实只读扫描；UIA 11 步全过，清理不可用，Mica=2，exit0，私有 WebView、子进程退出和服务目录计数通过。 | 机械通过；六图中五图缺页面，视觉证据不足，本票受阻。未重跑。 |

**实现文件**

- `apps/water/host/Cargo.toml`、`Cargo.lock`：上述依赖及离线锁。
- `apps/water/host/src/lib.rs`、`main.rs`：启动顺序、固定错误出口、实际服务入口；原窗口尺寸、系统标题栏、Mica、私有 WebView、导航/新窗口/下载/权限拒绝保留。
- `apps/water/host/src/startup.rs`：HostContext、StartupError、单实例锁。
- `apps/water/host/src/service.rs`：ServiceBackend、HostPicker/PickGuard、配置和服务工厂。
- `apps/water/host/tests/host_v1.rs`：精确五测；每次仅在本树 `.local/w3-f3-fixtures/` 新建随机根，删除前核对父目录、前缀、规范路径及祖先。仅解除自身夹具联接并回收本次新建根。合成平台提供全部已知目录、固定磁盘/时间/占用结果，不读取真实位置。
- `apps/water/host/README.md`：说明当前接线、清理关闭和验证边界。

**检查命令和结果**

下表每行的 mode/flags 完整接到统一命令之后，均在本树根执行：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F3 --mode <下表 mode/flags>
```

所有日志与回执前缀均在 [receipts](../../acceptance/wave3/f3/receipts/)；表中编号直接对应文件名前缀，`-result.json` 为回执。所有门命令的进程退出码均为 0；负控中的 Cargo 退出码为预期的 101。

| mode/flags | 回执前缀 | 结果 |
|---|---|---|
| baseline | `2026-10-26T11-48-21.947Z-36288-baseline` | passed，仅环境/输入核对；窗口0、真实读取false。 |
| lock | `2026-10-26T11-49-39.018Z-14344-lock` | passed，离线补锁与依赖政策通过；只运行一次。 |
| check | `2026-10-26T11-51-34.859Z-20544-check` | passed，依赖/源码政策、fmt、clippy -D warnings 通过。首次 clippy 构建 6m17s。 |
| test | `2026-10-26T11-58-06.336Z-41120-test` | passed，5 passed，0 failed/ignored/measured/filtered。 |
| red-nc1 | `2026-10-26T12-04-00.068Z-4512-red-nc1` | 有效；Cargo101，4 passed/1 failed，HOST_CLEAN_DISABLED。 |
| test（恢复 nc1） | `2026-10-26T12-04-22.641Z-33648-test` | passed，原字节恢复，五测绿。 |
| red-nc2 | `2026-10-26T12-04-46.545Z-7904-red-nc2` | 有效；Cargo101，4 passed/1 failed，HOST_SINGLE_INSTANCE。 |
| test（恢复 nc2） | `2026-10-26T12-05-10.928Z-6096-test` | passed，原字节恢复，五测绿。 |
| red-nc3 | `2026-10-26T12-05-35.487Z-29860-red-nc3` | 有效；Cargo101，4 passed/1 failed，HOST_COMMANDS。 |
| test（恢复 nc3） | `2026-10-26T12-06-00.102Z-39704-test` | passed，原字节恢复，五测绿。 |
| check --final | `2026-10-26T12-06-29.933Z-32588-check` | passed，干净实现提交；所有静态门通过。 |
| test --final | `2026-10-26T12-07-00.206Z-5676-test` | passed，五测绿，proofAudit 核对三组有效负控/即时恢复、源码快照及哈希通过。 |
| native --final | `2026-10-26T12-07-15.182Z-33648-native` | 检查器 passed/exit0；只运行一次，视觉缺口见下。 |
| archive | `2026-10-26T12-09-04.531Z-17844-archive` | passed，259 条归档、19,507,055 字节。 |

归档也保留了开工前已存在的总控预检 `2026-10-26T11-25-54.564Z-32832-baseline-result.json`，不是本执行者另跑一次 baseline。archive 在返回前复制既有文件，因此该次 archive 自己的结果回执留在 `.local/checks/WATER-W3-F3/`，不在本次 ARCHIVE 索引中。

格式化命令为 `C:/Users/37310/.cargo/bin/rustfmt.exe +1.95.0 --edition 2024 apps/water/host/src/lib.rs apps/water/host/src/main.rs apps/water/host/tests/host_v1.rs`（退出0，自动格式化关联模块）。首次 check 后仅调整测试中重获锁的绑定，先显式释放再查锁文件元数据，避免在独占持锁期间依赖元数据访问语义；随后五测、所有负控和 final 均使用最终测试字节。没有通过删除测试、降断言或改超时解决问题。

另做只读 Git 范围/diff 核对、截图尺寸核对及 ARCHIVE 全条目核对：每条归档文件和对应 `.local` 原件的 SHA-256、文件字节数均与索引一致。未运行额外产品测试或真实扫描。

**三条负控及恢复哈希**

| 负控 | 真实单行变异 | 实际失败信息 | git checkout 恢复后的该文件 SHA-256 |
|---|---|---|---|
| nc1 | `src/service.rs:9` 的 `pub const CLEAN_ENABLED: bool = false;` 改 true | `HOST_CLEAN_DISABLED production config`，host_service_wiring 失败 | `52a5414db6a5857c7b246e050a75c7c5efab87a75b564f61c0830ffb79e694ab` |
| nc2 | `src/startup.rs:38` 的 `options.share_mode(0);` 改为 `options.share_mode(3);` | `HOST_SINGLE_INSTANCE rejects second lock while held`，host_data_directory 失败 | `19b6905267c6d7eae2eaf90a8f8c41a43141ea2b15c015dbe7370a51d3fd94fd` |
| nc3 | 从 `src/lib.rs:77` 的 generate_handler 中删除单行 `commands::custom_root_remove,` | `HOST_COMMANDS actual handler registration`，host_command_registry 失败 | `c7bf4c95feb2c98376b32a0665e594f802665d46ea74d6ff36015478eba21884` |

失败日志分别为对应 `red-ncN-5.log`，不是编译错误、超时或测试改坏。每次红后立即 checkout 恢复指定的一个文件并跑完整五测，没有在两条负控之间改测试。三次恢复及 final 的 productionHash 均为 `c1ac6fd75219a23092eb7824a8ffff6a02a7efaa12b63a65736910037a6bc3ab`，testHash 均为 `0047566e715e55015913f033403189c19c4f1e89594ed8567f21cabb7c3f5cc9`。

**一次真实整机检查的结果**

权威原始证据：[native 回执](../../acceptance/wave3/f3/receipts/2026-10-26T12-07-15.182Z-33648-native-result.json)、[UIA 观察记录](../../acceptance/wave3/f3/receipts/2026-10-26T12-07-15.182Z-33648-uia.json)、[进程退出记录](../../acceptance/wave3/f3/receipts/2026-10-26T12-07-15.182Z-33648-native-process.json)。

- 本票原生窗口1、目录选择框0、浏览器0；唯一真实读取为这次经 UI 开始的只读扫描。没有手工运行 water.exe，没有任何真实清理。
- 窗口生命周期 `nativeWallMs=94239`，即 94.239 秒；结果等待阶段为 86.351 秒，含观察器等待/截图延迟，约 1 分 26 秒。未读取含真实路径的扫描记录来提取更精确的 duration_ms，不把观察阶段时长冒充扫描器精确耗时。
- systemWindows=1，rawWindows=2，固定 Tao event target=1；标题 Water，Mica backdropType=2。
- UIA 首页匹配“开始一次体检”，且未发现“无法连接 Water 服务”；调用“开始体检”；匹配“本次体检共识别”，未匹配失败文案；调用“清理所选”并匹配精确关闭文案；依次调用增长趋势、清理记录、扫描位置并匹配各自副标题。11 个 wait/invoke 步骤全部 passed。UIA 的匹配不能代替丢失的页面截图。
- 正常关闭 exit0/signal=null；私有 WebView 目录观察为 true；6 个已识别 WebView 子进程结束，childClose.remaining 为空；没有请求强制终止。
- 数据目录仅有 `cleans`、`journal`、`plans`、`scans`、`snapshots`、`water.lock`、`webview`；本次未生成 settings.json（契约允许无）。scans=1、snapshots=1、plans=0、cleans=0、journal=0。没有清理计划、清理记录或清理日志。

逐张实际看图如下。所有原图均原字节归档，未裁剪或重建：

| 截图 | 尺寸/字节 | 实际看到的内容与可支持的结论 |
|---|---|---|
| [home](../../acceptance/wave3/f3/receipts/2026-10-26T12-07-15.182Z-33648-home.png) | 1568×1072 / 844,297 | 完整 Water 窗口、系统标题栏、白色磨砂/浅蓝背景、左侧导航、体检首页、“开始一次体检”和开始按钮。系统盘可用52.5GB，右侧D/E/F盘卡片可见；尚未体检，无服务不可用提示。能核对首页实际呈现。 |
| [results](../../acceptance/wave3/f3/receipts/2026-10-26T12-07-15.182Z-33648-results.png) | 199×34 / 774 | 只有小标题栏、水滴图标及窗口按钮，没有结果页或体量数据。不能视觉核对扫描结果。 |
| [clean-disabled](../../acceptance/wave3/f3/receipts/2026-10-26T12-07-15.182Z-33648-clean-disabled.png) | 199×34 / 828 | 只有小标题栏和窗口按钮，没有清理关闭提示。关闭文案仅由本次 UIA 和合成测试证明，图片不能证明。 |
| [trends](../../acceptance/wave3/f3/receipts/2026-10-26T12-07-15.182Z-33648-trends.png) | 199×34 / 828 | 只有小标题栏，没有趋势页、图表或副标题。不能视觉核对。 |
| [history](../../acceptance/wave3/f3/receipts/2026-10-26T12-07-15.182Z-33648-history.png) | 199×34 / 774 | 只有小标题栏，没有记录列表。不能视觉核对。 |
| [locations](../../acceptance/wave3/f3/receipts/2026-10-26T12-07-15.182Z-33648-locations.png) | 199×34 / 774 | 只有小标题栏，没有分类开关或位置页。不能视觉核对。 |

**未做、未验证与交回边界**

- 没有重跑 native、补拍截图或耗用总控的独立窗口额度；没有修改观察器以让失效图片过关。现有原始记录如实保留，截图问题的触发来源未证实。
- 没有开放清理、删除真实数据、读真实文件内容、输出进程命令行；没有调用服务 real 冒烟或任何额外扫描。合成测试的回收仅针对本次新建夹具。
- 未在原基点先运行新增接线测试；三条有效负控发生于实现之后，只证明最终实现的测试能抓住这些真实变异，不声称已有实施前先红的历史证据。
- 没有真实选择框测试、第二真实实例、全部启动失败的进程级注入、生产目录竞态、macOS、release 打包/签名或用户亲手试用验证。WIRING 第7节的 M1 已知限制保持，不把本票称为 M1 已验收。
- 没有联网、下载、升级依赖、改网络/全局配置、修改 packages/UI/冻结契约/检查器/台账，没有 push、merge、rebase。已停止本票产品检查，原窗口和所识别子进程已正常退出，无本执行者另起的自有后台进程。
- [ARCHIVE.json](../../acceptance/wave3/f3/ARCHIVE.json) 记录归档259项/19,507,055字节；后续提交只含这批证据、归档属性与本回执。实现和机械通过可供总控复核，但五页视觉证据不足，保留受阻状态，不自行标 VERIFIED。
