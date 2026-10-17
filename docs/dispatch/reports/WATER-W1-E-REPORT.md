WATER-W1-E 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/e/docs/dispatch/reports/WATER-W1-E-REPORT.md

## 身份

| 项 | 值 |
|---|---|
| 票 | WATER-W1-E |
| 工作树 | `F:/new/smaltalk/water/.worktrees/e` |
| 分支 | `worker/water-w1-e` |
| 基线 | `1fce65323daf79c9f74ff84d86883692e4cb1b3e` |
| 实现提交 | `5b23f9c1f4e2b96cecb55447fda872919e0f85a0` |
| 平台 | Windows。macOS 未运行，未验证 |
| 模型 | Grok 4.7 |
| 工具 | Node v24.16.0，rustc/cargo 1.95.0，MSVC |

实现提交之后工作树是干净的。下面五门 `--final` 的 before/after HEAD 都是这个 SHA，status 为空。本报告提交只追加证据，不改产品和测试。

## 实现

`packages/report-view` 是独立 workspace（resolver 3），包 `water-report-view` 0.1.0，edition 2024，rust-version 1.95，publish false。公开入口是 `water_report_view::v1::project_json` 和 `project_report`。

`project_json` 把原始字符串交给 `water_contracts::v1::parse_report`。`project_report` 先调用 `validate_report`，再按 findings 原顺序投影。scope 标签用 HashMap 索引。空相对路径的标题用所属 scope.label；有路径时用完整原路径。有 tool 时筛选键是 `tool:` 加原 id，无 tool 时是 `no_tool`。证据 summary 用单个 LF 连接。`logical_bytes`、size、totals、保护、引用和枚举按来源克隆。来源 totals 不改成 finding 求和。生产模块不读文件、环境或网络，crate 禁止 unsafe。

## 需求对照

| 需求 | 结果 |
|---|---|
| 四组 golden 从两个公开入口投影，值和字段顺序与 expected 一致 | `view_projection` |
| 66 个原报告、6 个原 raw、6 个本协议 raw 走 `project_json`，错误码与 A 相同；canary 不回显 | `view_validation` |
| 四个手工 DTO 从 base golden 独立变异，`project_report` 与 `validate_report` 的错误相等 | `view_validation` |
| 0、2^53、2^53+1、u64::MAX 和 null 保持十进制字符串或 null；回收字段保持 null；totals 37 不是八条 finding 之和 | `view_precision_and_totals` |
| 输入不变、重复调用一致；scopes/issues/totals/证据/保护/引用保留；同路径跨 scope 仍是不同 id；空 findings 不造行 | `view_preservation_and_purity` |
| `no_tool`、`tool:all`、`tool:unknown`、`tool:no_tool` 不碰撞；四 risk、四 activity、五 recoverability 都出现；HTML、Unicode 和字面 `%2e%2e` 不改写 | `view_mapping_edges` |
| 真实库投影 bridge-input，Serialize 后由 C 的 `selectFindings` / `formatBytes` / `summarize` 断言 | final bridge，9 项通过，`uiConnected: false` |
| 根 Cargo、A/B/C/D、冻结锁、C 页面和 demo-data | 未改 |

测试目标只有 `view_v1` 的五个顶层测试，没有第六个，也没有 ignore。

## 最终门

全部在 `5b23f9c1f4e2b96cecb55447fda872919e0f85a0` 上串行通过。退出码 0。

| 门 | receipt |
|---|---|
| fmt --final | `docs/acceptance/wave1/e/2026-10-17T11-58-29.835Z-12924-fmt-result.json` |
| test --final | `docs/acceptance/wave1/e/2026-10-17T11-58-32.398Z-29260-test-result.json` |
| clippy --final | `docs/acceptance/wave1/e/2026-10-17T11-58-34.519Z-24912-clippy-result.json` |
| metadata --final | `docs/acceptance/wave1/e/2026-10-17T11-58-37.640Z-40176-metadata-result.json` |
| bridge --final | `docs/acceptance/wave1/e/2026-10-17T11-58-40.054Z-12512-bridge-result.json` |

test 汇总是 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out。日志是同名前缀的 `test-6.log`。bridge 先 `cargo build --lib`，再编译冻结的 `scripts/acceptance/report-view-bridge.rs`，运行该程序调用本库 `project_json` 并 Serialize，最后由 Node 导入 `prototypes/readonly-dashboard/model.mjs`。没有用 expected JSON 代替程序输出。对应日志是 `bridge-6.log`、`bridge-7.log`、`bridge-8.log`。

开工 baseline 通过：`docs/acceptance/wave1/e/2026-10-17T11-30-15.577Z-25528-baseline-result.json`。离线 lock 通过：`docs/acceptance/wave1/e/2026-10-17T11-42-03.380Z-13940-lock-result.json`。

## 先红、负控和恢复

行为红发生在库已编译之后。当时投影固定返回空 findings。五测试全部失败：`view_projection` 对 base 的完整 JSON 断言失败，`view_validation` 的 finding 数量断言失败。receipt：`docs/acceptance/wave1/e/2026-10-17T11-45-46.616Z-38224-test-result.json`，日志 `…-test-6.log`。这之前有一次测试编译失败（见下），那一次不算红。

负控改的是提交文件 `packages/report-view/src/v1.rs`。SHA256 见 `docs/acceptance/wave1/e/negative-controls.json`。三次都是完整五测试，命中目标断言后按原字节写回，恢复哈希等于原哈希 `3287c666150a5f3d2dd55aa59d0e1bd7cbefdcc3860810697f0596039752a601`，随后五测试通过。

| 负控 | 坏哈希 | 失败断言 | 失败 receipt | 恢复 receipt |
|---|---|---|---|---|
| 跳过 `project_report` 的 `validate_report` | `95e2a4befec6eb35332b26d28b8e9e5cc8afe6e67ba9cdf7b888e10146cc5df5` | `model_without_protection: illegal DTO must fail view_validation` | `2026-10-17T11-56-04.915Z-20352` | `2026-10-17T11-56-08.784Z-39356` |
| `logical_bytes` 经 f64 再转回整数 | `2a780c21215706994293480327d85de9b4d4ff8a1bd5b7816db2164dc9c3c097` | `2^53+1 must not pass through f64`，得到 9007199254740992 | `2026-10-17T11-56-13.690Z-15628` | `2026-10-17T11-56-18.131Z-40780` |
| 来源未知 `totals.logical_bytes` 改成 0 | `15e088db6ea541672f83c1b966a7b9ce55105d232f098f085db3b671be3efbd1` | `unknown source totals.logical_bytes must stay null` | `2026-10-17T11-56-22.878Z-21616` | `2026-10-17T11-56-28.770Z-27812` |

上表 receipt 都在 `docs/acceptance/wave1/e/`，文件名以该戳开头，测试输出在对应 `test-6.log`。没有用测试开关、缺文件或编译失败充当负控。

## 失败记录

- fmt 首次 `--check` 失败，只因格式。随后用 Rust 1.95 的 rustfmt 写入格式，再跑 helper fmt 通过。receipt：`2026-10-17T11-42-40.468Z-17996-fmt-result.json`。
- 第一次 `test` 编译失败：`Risk`/`Activity`/`Recoverability` 没有 `Ord`，`ContractErrorCode` 被按值取走后再借用。这不是行为红。receipt：`2026-10-17T11-44-21.992Z-41520-test-result.json`。测试改为 `HashSet` 和按引用读取错误码后才进入行为红。
- 原字节恢复后有一次测试仍报空投影失败。原因是复制回来的文件修改时间早于已编译产物，Cargo 沿用了旧 rlib。更新时间戳后同一字节重新编译并通过。那次 receipt 是 `2026-10-17T11-46-48.622Z-19776-test-result.json`，不代表恢复后的源码行为。
- clippy 首次拒绝 `Option<ByteCount>` 上的 `clone`（该类型是 Copy）。去掉 `clone` 后行为不变，clippy 通过。receipt：`2026-10-17T11-51-57.000Z-28504-clippy-result.json`。负控是在去掉 `clone` 之后的提交字节上重做的，所以上面的原哈希就是提交文件的哈希。

没有越界申请。没有改冻结契约、helper、根 Cargo、A/B/C/D 或 C 演示。没有扫描器、分类器、导出器、IPC 或真实用户数据。没有内部实现子代理。负控重复运行使用了 `.local` 里的脚本，它只调用本票 helper。

macOS 未验证。投影通过不等于真实扫描、脱敏导出或桌面应用完成。
