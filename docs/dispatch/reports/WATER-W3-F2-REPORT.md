WATER-W3-F2 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w3-f2/docs/dispatch/reports/WATER-W3-F2-REPORT.md

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
