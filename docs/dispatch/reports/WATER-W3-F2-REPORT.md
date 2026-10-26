WATER-W3-F2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w3-f2/docs/dispatch/reports/WATER-W3-F2-REPORT.md

当前交付为原票及补单 01，待总控复核，不自行标记 VERIFIED。实现提交 `056f8895318e7db33467f828bda00446a5002323`。原票受阻记录如下保留；当前实现、测试和原生窗口结果见末尾“补单 01”。

## 原票受阻历史（99766f6，以下历史结论已由补单解除）

日期：2026-10-26。执行者：Codex，运行环境标识为基于 GPT-6；未获得更细的模型版本标识。没有启动子代理。

工作树 `F:/new/smaltalk/water/.worktrees/w3-f2`，分支 `worker/water-w3-f2`。首次 HEAD 精确为 `197dfdaecc94dc8b84e94aa8d91ee5cb1c0d965e`，首次工作区干净，`apps/water/host` 不存在。实现提交 SHA：无；本次只提交受阻回执及检查器归档的证据，没有产品实现。

## 阻塞：选择框公开接口与允许依赖不匹配

已按票阅读规则、第三波计划、HOST、IPC、AC 的 main/v1；另读项目必读文档、ADR-018、共享 MODEL、检查器以及 native-picker 的公开接口和现有调用样例。

HOST 第 1 节只允许 Tauri、serde、serde_json、water-native-picker 及 build 依赖 tauri-build；第 4 节同时要求 `pick_folder()` 实际使用 water_native_picker 打开目录选择框。现有接口是：

```rust
pub fn select_scope(
    registry: &mut Registry,
    scope_id: &OpaqueId,
    options: &PickerOptions,
) -> Result<Option<SelectedScope>, PickerError>
```

可复核依据（均为基线中的现有文件，只读）：

- `packages/native-picker/src/v1.rs:5` 与 `:7` 对 `OpaqueId`、`Registry` 使用私有 `use`，没有 `pub use`；`:59` 的 `select_scope` 是唯一公开的选择操作。
- `packages/native-picker/src/lib.rs:7` 只公开 `v1` 模块；内部 Windows `choose` 函数不是对外接口。
- `packages/scope-registry/src/v1.rs:30` 的 `Registry` 字段私有，`:105` 通过 `Registry::new(capacity)` 创建；没有 Default 或反序列化构造入口。
- `crates/water-contracts/src/v1.rs:99` 定义 `OpaqueId`，`:102` 提供构造函数。
- `packages/native-picker/tests/picker_v1.rs:4`、`:7` 的已有调用者分别直接依赖 water-contracts 与 water-scope-registry，才能创建所需参数。
- `scripts/desktop-wave-check.mjs` 的 dependencyPolicy 将直接依赖与主线 manifest 的 expectedDependencies 精确比较，不能擅自添加这两个路径依赖。

传递依赖不自动成为宿主可导入的直接依赖；尤其 Registry 无法通过当前 picker 公开接口构造。因此，在冻结依赖和只读 packages 的边界内，无法完成要求的真实选择框接线点。仅返回 unavailable 的空实现也不能满足 HOST 的真实选择框要求。

依据 `docs/dispatch/W3-DESKTOP-WORKER-RULES.md:18`：“契约冲突或缺东西时写受阻回执，不要自行变通。”本次在实现前停止，未改冻结契约、检查器、台账或既有包。

## 最小补充需求

建议总控出编号补单，允许宿主增加以下两个已经存在于 picker 传递依赖树中的直接路径依赖，并同步 HOST 第 1 节、manifest 的 expectedDependencies 与相关冻结哈希：

```toml
water-contracts = { path = "../../../crates/water-contracts" }
water-scope-registry = { path = "../../../packages/scope-registry" }
```

这项调整无需修改 native-picker，也不要求新增 registry 包或联网。实际离线锁核对仍须在补单后由 `--mode lock` 证明。补单需指定从本次仅文档提交继续的起点，明确已通过 baseline 可复用或新的基线检查方式。上述是建议，未自行实施。

## 检查命令与结果

以下命令均在指定工作树根目录运行：

| 命令 | 结果 |
|---|---|
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F2 --mode baseline` | exit 0，passed；2026-10-26T08:51:58.150Z 至 08:52:01.682Z；分支、基点、干净状态、冻结输入及缓存检查通过。只证明环境就绪。 |
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F2 --mode archive` | exit 0，passed；归档 12 个文件、14,047 字节，索引 `docs/acceptance/wave3/f2/ARCHIVE.json`。 |

本次 baseline 回执为 `docs/acceptance/wave3/f2/receipts/2026-10-26T08-51-58.149Z-21944-baseline-result.json`，SHA-256 `72a92c00a89baf8683f5ef45e3af6442664ac76f3ed30a72dc3a560e2103b076`。检查器归档同时保留本次开工前已存在的 08:31:18 与 08:31:48 两组派前记录；它们不是本执行者运行的检查。archive 本轮自身回执按检查器既有行为保留在 `.local/checks/WATER-W3-F2/2026-10-26T08-53-12.740Z-28544-archive-result.json`，不在其当次生成的索引中。

## SPEC 第 1～6 节对照

| 节 | 状态 |
|---|---|
| 1 crate 形状 | 发现上述依赖冲突；crate 和锁未创建。 |
| 2 文件白名单 | 仅本回执与 archive 生成的证据；产品、UI、packages、契约、检查器、台账未修改。 |
| 3 配置与窗口 | 未实现、未验证。 |
| 4 命令与后端 | 未实现；选择框接线所需类型无法通过冻结依赖构造。 |
| 5 四个测试与两条负控 | 未运行；nc1/nc2 未改源码，无失败标记或恢复哈希可报告。 |
| 6 原生窗口检查 | 未运行；窗口 0/1，选择框 0，浏览器 0，没有截图，窗口预算未使用。 |

没有运行 lock、check、test、red-nc1、red-nc2 或任何 final；没有 Cargo 构建、真实数据扫描、清理、联网、下载、网络或全局配置修改；没有 push、merge、rebase。未验证 Windows 产品行为、macOS、F1/F3 接线或整机验收。没有启动本票后台应用进程。受阻交回后停止执行，等待总控修订；不将 baseline 或静态接口审阅表述为产品已完成。

## 补单 01

续做起点 `99766f6261958009a90c5b4fb7f0fa2db18cec7d`，开工时分支与工作树符合票面且干净。按补单指定顺序读原票、规则、SPEC、受阻回执与补单；未重跑 baseline。实际执行者仍为 Codex（环境标识为基于 GPT-6，未提供更细版本），无子代理。实现提交为 `056f8895318e7db33467f828bda00446a5002323`；该提交之后只交回本回执与归档证据。

### SPEC 第 1～6 节的当前交付

| 节 | 实现及验证 |
|---|---|
| 1 crate | 独立 workspace，包 `water-desktop`、lib `water_desktop`、bin `water`；edition 2024、rust 1.95、publish false、四项自动发现关闭。原五项依赖加补单的两个路径依赖；lock 由检查器从 AC 锁生成。锁中 395 个 registry 包逐项同名、同版本、同 checksum，无新增 registry 包。lib/main forbid unsafe；宿主无 FFI、进程启动或联网代码，仅读取 WATER_DATA_DIR。 |
| 2 文件 | 新增票面允许的 15 个宿主文件。自有 ICO 为 32×32 蓝底白色水滴、4,286 字节。UI、AC 壳、packages、契约、检查器、台账保持只读。 |
| 3 配置及窗口 | 配置与 capability 精确匹配 SPEC。启动前 validate_config 同时校验嵌入 capability；类型化解析拒绝重复、缺失及未知字段。setup 创建 main/Water，1240×820、最小 1040×720、居中、透明、Mica、保留系统标题栏；JS 开启，devtools/拖放关闭，AC 导航白名单及新窗口/下载/权限拒绝已接入。数据覆盖或 Tauri local_data_dir/Water 逐级元数据核对，拒绝重解析点，WebView 位于 webview 子目录。四测覆盖覆盖值、缺失目录创建、默认目录、相对/上跳路径、普通文件、联接祖先和联接末端。原生观察确认私有 WebView 路径及 Mica 类型 2。 |
| 4 命令与后端 | 17 个同步 Tauri 命令全部注册，每个经对应公开 cmd_* 把 camelCase 参数对象转交同一 Arc<dyn Backend>，无参数为 {}。成功值与 IpcFailure 原样返回；main 以 UnavailableBackend 启动。release 隐藏控制台属性已写入，run 失败只打印固定中文并 exit 1。选择框依补单实现，见下。 |
| 5 四测及负控 | 唯一测试文件 host_v1.rs、精确四个指定测试，最终 4 passed、0 failed、0 ignored、0 filtered。COMMANDS 同冻结 IPC 表逐项比较；17 个转发逐项核对参数与两类返回值，全部 unavailable 行为也逐项核对。nc1/nc2 各仅修改 policy.rs 一行，指定断言失败后立即 checkout 恢复、核 SHA-256、四测变绿，final proofAudit 通过。 |
| 6 原生窗口 | native --final 一次通过。1 个主窗口、1 个固定 Tao 隐藏事件目标；页面文字、标题、Mica、截图、正常退出和子进程收尾均符合冻结检查。整个执行周期原生应用窗 1/1，选择框 0，浏览器 0。 |

### 选择框接线与映射

`pick_folder(initial_directory)` 先调用 PickerOptions::new；再为本次调用创建 Registry::new(1) 与 OpaqueId::new("water-pick-folder")，调用已验收 select_scope，取消返回 None、成功返回 selected.root_path 的字符串。Registry 是局部变量，不持久化任何选择状态。该函数没有连接任何 Tauri command，run/main 不调用它。

`picker_failure` 的 match 逐个列出全部六个变体：UnsupportedPlatform、ApartmentUnavailable、DialogFailed → unavailable /“系统文件夹选择框暂时打不开。”；Root、Source、InvalidSelection → invalid /“这个文件夹不能加入体检，请换一个。”。Registry/ID 构造失败也映射第一组 unavailable。

host_command_registry 对全部六个变体逐项核对 code 和 message_zh。Root 从相对路径的 PickerOptions 错误取得，Source 使用 RegistryFull。实际调用 `pick_folder("relative")` 验证在开框前返回 invalid；没有用合法路径调用选择框。

### 所有检查命令与结果

每行模式均使用同一完整命令前缀，cwd 始终是本票工作树根：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W3-F2 --mode <下表模式及后缀>
```

下表回执位于 `docs/acceptance/wave3/f2/receipts/`，均为检查器原字节；archive 当次自身回执按工具行为仅存在 `.local/checks/WATER-W3-F2/`，不在当次归档中。

| 模式及后缀 | 回执名 | 结果 |
|---|---|---|
| lock | 2026-10-26T09-13-44.913Z-26032-lock-result.json | exit 0 / passed，离线锁和七项依赖校验通过。 |
| check | 2026-10-26T09-16-56.242Z-41112-check-result.json | exit 0 / passed；初次 fmt 与 Clippy 通过，约 220 秒。 |
| test | 2026-10-26T09-21-43.104Z-28200-test-result.json | 检查器 exit 1，Cargo exit 101；3 通过、1 失败，HOST_DATA_DIRECTORY junction creation。测试夹具路径含 Cargo 保留的正斜杠，mklink 未创建联接；不是有效负控。 |
| test | 2026-10-26T09-26-54.216Z-8536-test-result.json | exit 0 / passed，修正测试传给 mklink 的斜杠后四测通过。 |
| red-nc1 | 2026-10-26T09-27-34.243Z-25100-red-nc1-result.json | 检查器 exit 0 / passed，内部 Cargo 101，3 绿 1 红，命中 HOST_CONFIG。 |
| test | 2026-10-26T09-27-57.100Z-43256-test-result.json | exit 0 / passed，nc1 原字节恢复后四测全绿。 |
| red-nc2 | 2026-10-26T09-28-23.714Z-6280-red-nc2-result.json | 检查器 exit 0 / passed，内部 Cargo 101，3 绿 1 红，命中 HOST_NAVIGATION。 |
| test | 2026-10-26T09-28-45.113Z-27144-test-result.json | exit 0 / passed，nc2 原字节恢复后四测全绿。 |
| check --final | 2026-10-26T09-29-05.499Z-38980-check-result.json | exit 0 / passed，干净实现提交，最终格式与 Clippy 无警告。 |
| test --final | 2026-10-26T09-29-22.057Z-7648-test-result.json | exit 0 / passed；四测全绿，两条负控和逐次恢复哈希审核通过。 |
| native --final | 2026-10-26T09-29-34.271Z-29056-native-result.json | exit 0 / passed；唯一一次应用窗检查通过。 |
| archive | 2026-10-26T09-29-56.168Z-17908-archive-result.json（仅 .local） | exit 0 / passed；累计归档 217 文件、17,671,124 字节，保留旧派前记录和本轮首次失败。 |

初次 check 后为测试创建联接的 cmd.exe 加了 CREATE_NO_WINDOW；随后修正其 Windows 路径分隔符，两次均仅改测试。最终 check/test 已覆盖最终测试字节。每次测试用随机目录，正常或断言失败都只清理本次新建目录；先验证父目录、前缀、规范路径及祖先属性，先解除自己的 junction，再删除自己的 fixture。测试结束 fixture 父目录为空，没有手工额外清理。

### 两条有效负控与恢复

两条负控都在实现提交之后进行，唯一改动文件 `apps/water/host/src/policy.rs`，未修改测试。nc1 在第 107 行把 `if capability.permissions != ["core:window:allow-start-dragging"] {` 改为 `if capability.permissions.is_empty() {`，使额外权限被放过。host_config_boundary 失败信息为 `HOST_CONFIG reject capability /permissions`。nc2 在第 122 行的导航 matches! 表达式后加 `|| base.starts_with("https://")`，host_navigation_boundary 失败信息为 `HOST_NAVIGATION reject https://example.com/`。

每条运行后立即 `git checkout -- apps/water/host/src/policy.rs` 并核对恢复 SHA-256，均为 `86929f2960c7952f0ccfc878e7fce68081611cd137163c88d3ee9801433667a0`，再跑上表对应绿 test。两次均实际执行四测、3 通过 1 失败，非编译错误、超时或测试开关。

最终及两次恢复绿的 productionHash 一致：`c31d5f0a5f2f14852e7777973229221df8532c192c8a9b244669237a35e8abb9`；testHash 一致：`388d07049276ee6bf8fced3c248f52955437da59a02356e7ae4d2ae01c8b2b7c`。负控源码快照和逐步日志已由 archive 保存。

### 原生窗口与逐张看图

唯一截图：`docs/acceptance/wave3/f2/receipts/2026-10-26T09-29-34.271Z-29056-window.png`，SHA-256 `8d004ca82cd20e1f743fcc7fd3bc3cddfe04146961acb62567cd813e6142922a`。已实际打开该归档图检查：左上系统标题栏为 Water，蓝底白滴自有图标可见，最小化/最大化/关闭按钮保留；白色磨砂界面完整，侧栏有 Water、磁盘体检及五个导航项，主区有“这台电脑的空间，去了哪里”、顶部“Water 服务暂时不可用。”提示、居中“无法连接 Water 服务”及“重新连接”按钮。没有空白 WebView 或错误页，也没有展示真实扫描数据。

Mica 依据系统读取 `DWMWA_SYSTEMBACKDROP_TYPE = 2`，不是单凭图片判断。观察器记录 rawWindows 2、eventTargets 1、systemWindows 1，标题 Water、pageAccepted true。主进程 PID 27640 正常 exit 0，signal null；nativeWallMs 3818。记录到 6 个 msedgewebview2 子进程，退出核对 remaining=[]；无强制终止。privateWebviewObserved=true，目录为本树 `.local/w3-f2-native/2026-10-26T09-29-34.271Z-29056/webview`。命令行只由冻结观察器在内存比对，没有写入证据。窗口预算已用完，没有重跑。

### 未做与限制

- F1 服务与 F3 接线尚未接入；本票后端所有命令返回 unavailable，真实扫描和清理未运行。
- 选择框真实取消/选择、实际 COM 故障未运行；本票只验证接线编译与六类错误映射，合法目录开框次数为 0。
- 只验证本机 Windows debug 宿主；macOS、release 构建/安装包、签名、发布、窗口缩放操作及不支持 Mica 的系统没有实测。
- 数据目录保护是逐级元数据检查与创建前复查，没有宣称抵抗并发恶意目录替换的句柄级竞态保证；设备/网络路径命名空间被拒绝。
- 所有 registry 依赖离线复用，未下载、升级或改全局/网络配置。现有 UI 的 tests 随 frontendDist 打包，以及保留系统标题栏，均沿用 HOST 第 7 节取舍。
- 未 push、merge、rebase，未修改主线台账和其它任务。全部检查已结束，自有应用及子进程已正常退出；交回后不再运行测试或窗口。最终状态由总控验收决定。
