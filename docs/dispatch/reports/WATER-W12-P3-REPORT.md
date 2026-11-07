WATER-W12-P3 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w12-p3/docs/dispatch/reports/WATER-W12-P3-REPORT.md

日期：2026-11-07。正式单：`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W12-P3-HOST-20261107.md`。本回执交总控验收，不自行标记 VERIFIED。

## 执行身份与提交

- 实际执行者：Codex（系统标识 GPT-6，未提供更细的运行时型号）；未使用子代理、其他模型或外部执行者。
- 唯一工作树：`F:/new/smaltalk/water/.worktrees/w12-p3`；分支：`worker/water-w12-p3`。
- 首次 HEAD、标签 `water-w12-p3-base-20261107` 均为 `6fd29e342b76ff2ceecd74e66805300405ef1334`，开工时干净。
- 实现提交：`ff0f9530d3a6950a88593d6265151039ee547240`（`feat(host): add W12 forwarding and Flick app information`）。三个 final 均在该干净提交上执行，开始与结束 HEAD 一致。
- 提交作者与提交者仅通过提交进程的四个 `GIT_*` 环境变量设置为 `Codex GPT-6 <codex-gpt-6@localhost>`；未修改 Git 配置或远端，未 push、merge、rebase、amend、reset 或改写历史。
- 实现仅改六个文件：宿主 `src/commands.rs`、`src/lib.rs`、`src/policy.rs`、`tauri.conf.json`、`README.md`、`tests/host_v1.rs`。之后的提交仅含本回执与检查器归档证据。

## 逐条对照工单

| 要求 | 实际结果 |
|---|---|
| `skip_unit_add` | 新增 `cmd_skip_unit_add(backend, conclusion_version, unit_id)`，只转发 `{"conclusionVersion": ..., "unitId": ...}`；Tauri 包装调用同一适配器，不校验内容。 |
| `diagnostics_get` | 新增适配器与 Tauri 包装，转发命令名 `diagnostics_get` 和空对象 `{}`；回复或失败原样返回。 |
| `app_info` | `cmd_app_info()` 直接返回 JSON，Tauri 包装不注入 Backend；四个字段恰好为 `Flick`、编译时 `env!("CARGO_PKG_VERSION")`、`MIT OR Apache-2.0`、`https://github.com/dfan0519-tech/flick`。 |
| 登记、顺序与计数 | `COMMANDS` 为 39 项；前 36 项顺序不变，最后依次为 `skip_unit_add`、`diagnostics_get`、`app_info`；`generate_handler!` 完全同序。 |
| 公司名 | 增加 `bundle.publisher: "Flick"`，`bundle.active` 为 false；严格配置校验同步要求 publisher 为 Flick。实际生成的 exe 的 `CompanyName`、`ProductName` 均为 Flick，`FileVersion`、`ProductVersion` 均为 0.1.0。 |
| README | 两处命令数改为 39；注明 37 个薄转发与宿主处理的 `quarantine_reveal`、`app_info`。同步本票检查命令、夹具前缀和隔离根名称。 |
| 测试 | 仍为精确五个原测试，未增加、删除、忽略或过滤测试。新断言放在 `host_command_registry`、`host_config_boundary`；失败信息包含 `HOST_W12_FORWARD` / `HOST_W12_INFO`。 |

`host_command_registry` 核对三处新包装的 camelCase 参数、实际包装函数到适配器的接线、COMMANDS 与 handler 的尾部顺序；用假后端逐字核对两个转发命令的名称、完整键集合及值，并覆盖 Unicode、空值、无效值、未知返回字段、stale 与 busy 失败的原样透传。`app_info` 比较整个四字段对象，version 对照包版本。配置测试保留整份配置精确相等及旧安全拒绝用例，并增加 publisher 的精确值、错误值、缺失与重复键拒绝。

## 检查命令与结果

以下命令全部在指定工作树根目录执行，检查器退出码均为 0。日志与结果位于 `docs/acceptance/wave12/p3/receipts/`；下表结果文件名均为该目录下的文件。

| 完整命令 | 结果 | 结果文件 |
|---|---|---|
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W12-P3 --mode baseline` | passed；实现前环境与输入就绪 | `2026-11-07T12-10-07.366Z-27092-baseline-result.json` |
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W12-P3 --mode lock` | passed；未修改 Cargo.lock | `2026-11-07T12-10-33.158Z-26188-lock-result.json` |
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W12-P3 --mode check` | passed；fmt、Clippy 全目标且 warnings 为错误 | `2026-11-07T12-12-39.987Z-24304-check-result.json` |
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W12-P3 --mode test` | passed；5 passed，0 failed、ignored、filtered | `2026-11-07T12-19-41.167Z-20752-test-result.json` |
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W12-P3 --mode red-nc1` | passed；观察到指定断言失败，产品测试退出 101 | `2026-11-07T12-25-52.241Z-10276-red-nc1-result.json` |
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W12-P3 --mode test` | nc1 恢复后立即执行，5 passed | `2026-11-07T12-26-36.306Z-12128-test-result.json` |
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W12-P3 --mode red-nc2` | passed；观察到指定断言失败，产品测试退出 101 | `2026-11-07T12-27-20.137Z-12816-red-nc2-result.json` |
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W12-P3 --mode test` | nc2 恢复后立即执行，5 passed | `2026-11-07T12-27-57.604Z-3392-test-result.json` |
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W12-P3 --mode check --final` | passed；干净实现提交 | `2026-11-07T12-28-42.402Z-37172-check-result.json` |
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W12-P3 --mode test --final` | passed；5 passed；两条负控及精确恢复链审计通过 | `2026-11-07T12-28-55.946Z-35708-test-result.json` |
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W12-P3 --mode native --final` | passed；单窗口、17 步全部通过、正常退出 | `2026-11-07T12-29-21.257Z-27800-native-result.json` |
| `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W12-P3 --mode archive` | passed；归档 226 文件、17,755,697 字节 | 归档索引 `../ARCHIVE.json`；archive 自身的结果留在下述 `.local` 路径 |

Archive 命令在复制证据之后才生成自己的结果，该结果位于 `.local/checks/WATER-W12-P3/2026-11-07T12-30-02.490Z-32916-archive-result.json`。归档内另有开工前既存的总控派前 baseline（`2026-11-07T12-04-56.858Z-31440-baseline-result.json`），保留原样，不计为本执行者重跑。本执行者的 baseline 是上表 12:10:07 那次。

全部 Cargo 检查由冻结入口配置 Rust 1.95.0、offline、locked（lock 模式按入口处理）、jobs 1、私有 CARGO_HOME / target / tmp。运行前按进程名观察机器负载；未运行额外 Cargo 检查、下载或自行复制缓存。首次 fmt / Clippy 和测试构建耗时较长，但没有计时失败，没有计时重跑，也没有放宽时限。

## 负控与恢复

1. nc1：实现提交后，仅将 `src/commands.rs` 中真正转发的 `unitId` 改为 `unitID`。`host_command_registry` 以 `HOST_W12_FORWARD exact command names, keys and unvalidated values` 失败，其余四测通过。
2. 立即执行 `git -c core.hooksPath=NUL checkout -- apps/water/host/src/commands.rs`，核对文件 SHA-256，然后立即 `--mode test`，五测全绿。
3. nc2：仅将 `cmd_app_info()` 中的 `env!("CARGO_PKG_VERSION")` 改为字面量 `"9.9.9"`。`host_command_registry` 以 `HOST_W12_INFO exact host-owned app info including package version` 失败，其余四测通过。
4. 再次按同一命令恢复并核对 SHA-256，立即 `--mode test`，五测全绿。未修改测试制造负控，也无编译错误或超时造红。

两次恢复后 `commands.rs` 的 SHA-256 均为 `db5023456bd54a09ad8afafa394ea093f7504e7b4d0693063adc86df2c5f8577`。最终生产集合哈希为 `ef932845d982ce8ee811ef129b47d40205d698e4261408ee0a18ff7d4f334ada`，测试集合哈希为 `17bb6773d26a444dafaf93e0c0409ba2ff7c6745ea5aa3063ba20e9dec778272`；初次绿测、两次恢复绿测与三个 final 的相应哈希一致，final test 的 `proofAudit` 已核实这两条恢复链。

## 迁移的旧断言

| 原断言 | 新断言 | 必然变更的原因与强度 |
|---|---|---|
| `HOST_M3C_SKIP command count`: 36 | 39 | 工单新增三个命令；仍为精确计数。 |
| `HOST_M35_COMMANDS count`: 36 | 39 | 同上，仍为精确计数。 |
| `HOST_M35_COMMANDS no extra IPC wrappers`: 36 | 39 | 增加三个 Tauri 包装；仍精确拒绝额外包装。 |
| `HOST_M35_COMMANDS exact addition order`: `COMMANDS[19..]` 等于原 17 项 | `COMMANDS[19..36]` 精确等于原 17 项 | W12 在尾部追加；新尾部三项另以 `HOST_W12_FORWARD` 精确校验，原区间顺序保护完整保留。 |
| `HOST_M35_COMMANDS complete IPC table`: 全部 COMMANDS 等于旧契约表 | `COMMANDS[..36]` 精确等于旧契约表 | 旧表仍只有 36 项；结合总数 39、新三项精确尾序与完整 handler 相等，保持全表约束。 |
| `HOST_CONFIG exact config`: bundle 恰为 `{active:false}` | bundle 恰为 `{active:false,publisher:"Flick"}` | 工单明确添加 publisher；整份配置仍精确比较，未知字段拒绝、CSP、权限与安全项均保留。 |

原 `HOST_M3C_SKIP` 的 handler 相等断言未改比较对象或强度，只把已过时的错误文案 “all 19 commands” 改为 “all commands”。

## 自主选择与小障碍

- `app_info` 选择不接收 Backend、直接返回 `Value` 的无失败入口；相比沿用转发函数的 Backend / Result 外形，接口依赖更少，且明确保持宿主本地回答。转发命令沿用现有 Result 形状。
- `policy.rs` 原 Bundle 类型启用 `deny_unknown_fields`，只改 JSON 会使正常启动失败，因此在宿主白名单内同步增加必需的 publisher 字段与精确 Flick 校验；未放宽成可选字段或任意字符串，未改变窗口安全策略。
- 旧 M35 契约表保留原样，通过固定旧区间加 W12 尾部精确断言迁移，未修改冻结契约或把精确比较降为存在性检查。
- 工单行号随新增断言移动，按断言标记定位。README 的旧检查命令与 native 前缀同步为本票；旧隔离根说明同步为基线实际使用的 Flick 名称。
- 初次 PowerShell 默认编码读取中文工单出现显示乱码后，立即以 `Get-Content -Encoding utf8` 重读；没有通过该输出写文件。一次 Node `-e` 只读查询被 Windows PowerShell 原生命令参数转义影响，改用 `Get-Content -Encoding utf8 | ConvertFrom-Json` 查询同一字段；未改文件或环境。格式化使用固定 1.95.0 rustfmt，最终由检查器 fmt 复核。
- 暂存后的附加 `git diff --cached --check` 把原始 PowerShell UIA JSON 和两份 native 日志的 CRLF 报为尾随空白，退出非零。这不是工单检查器或产品测试失败；保留证据原字节与归档哈希，对回执单独做空白检查，不编辑原始证据或重跑产品门。
- 没有越界申请、未解决冲突或受阻事项。

## 原生冒烟、证据与未验证项

原生冒烟仅运行一次，由冻结检查器启动一个 Flick 窗口；选择框 0、浏览器 0，最大预算 300 秒，实际窗口流程 11,679 ms。17 步全部通过，Mica backdropType 为 2，页面接受、窗口数为 1，正常退出码 0。使用本树 `.local/w12-p3-native/` 下的全新夹具与私有 WATER_DATA_DIR，七类开关关闭；真实位置仅由基线应用做获准的只读元数据观察，因此 receipt 的 `realDataRead` 为 true，不将它写成完全没有读取真实数据。真实进程的命令行未输出或写入回执。

- 夹具直接清理：completed，实际释放 3,145,815 字节，失败条目 0。
- 夹具隔离：completed，移入 1,048,576 字节；随后一次 purge 永久删除同样 1,048,576 字节。隔离本身未称为释放空间。
- 保护夹具保留；本次创建的隔离根经应用 purge 后消失，旧名称隔离根未出现。P3 的盘根隔离行为仅使用波次规则明确允许的检查器例外，没有手工清理目录。
- 数据目录核对：scans 1、plans 1、cleans 1、quarantine 0、dedupes 0；检查器核对了快照、clean / purge 日志、purge 事件和私有 WebView profile。
- WebView `childClose.remaining` 为空；归档后再次只读核对本次原生 PID 及所有记录的 child PID 均已退出。本执行者没有遗留测试、浏览器或后台辅助进程，未终止其它任务的进程。
- 检查器保存 home、results、confirm、done、quarantine、purged 六张截图，均为 1568×1072。本票不是界面单，没有 UI 代码改动或与设计稿的截图差异验收；这些截图是原生流程证据。
- 在不启动新窗口的情况下读取本次构建 `flick.exe` 的 VersionInfo，核实 CompanyName 为 Flick。该二进制 SHA-256 为 `02f0b0c73111eb518c94aab29002d0ee3777f160a2225ad2bf2f42a7c6ceb313`，未作为发布包提交。

证据由 `--mode archive` 生成到 `docs/acceptance/wave12/p3/`，索引记录 226 文件、17,755,697 字节；逐文件重新计算长度与 SHA-256，全部与索引一致。证据文件逐个暂存，包含被忽略的日志与 PNG；回执以 UTF-8 写入并整份读回，检查连续问号与 U+FFFD。证据提交不含产品修改。

未验证：macOS；release / NSIS 打包或签名；真实目录选择框；真实用户数据清理；真实关机或清理中关窗；W12 新服务与新界面的完整联合链路。两个新转发命令在本票由假后端验证，native 使用基线服务与界面完成既有夹具流程，未冒充已完成 W12 跨票集成。未改依赖、Cargo.lock、bin 声明、capabilities、CSP、导航、窗口拒绝策略、系统函数、其它包、契约、检查器或主线台账；未发布或推送。
