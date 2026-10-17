# WATER-W1-A：Rust工程底座与scan v1契约实现

总控：Codex。日期：2026-10-17。正式状态看主检出 `docs/dispatch/wave1/manifest.json`。这是一张实现票，模型由用户安排。

| 项 | 值 |
|---|---|
| 权威票面 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-A-CONTRACTS-20261017.md` |
| 唯一工作树 | `F:/new/smaltalk/water/.worktrees/a` |
| 唯一分支 | `worker/water-w1-a` |
| 精确基线 | `a1e68364d47e137f8b66543eb95d35bb04424c78`，tag `water-w1-base-20261017` |
| 契约 | `contracts/v1/`，`freeze.lock.json`记录9个总控文件；只读 |
| 权威manifest | `F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json`，只读 |
| 回执 | `F:/new/smaltalk/water/.worktrees/a/docs/dispatch/reports/WATER-W1-A-REPORT.md` |
| 证据 | 本工作树 `docs/acceptance/wave1/a/`；执行日志由helper写`.local/checks/WATER-W1-A/` |
| 资源 | 一次一个检查进程，Cargo jobs=1；当前无其他并行实现票 |

## 0. 开工

先读本票、`AGENTS.md`、`docs/CONTROLLER-WORKFLOW.md`、`docs/dispatch/W1-WORKER-RULES.md`、`docs/decisions/ADR-002-wave1-contract-bootstrap.md`及contracts/v1全部冻结材料。主检出除票面/manifest/冻结锁外也只读，不复制上游源码。

本工作树来自架构基线P，主检出之后才登记票面与任务，因此工作树里的旧STATUS/registry不是派单实况；**不要merge main取票，不用修改工作树里的旧状态**。helper通过git-common-dir读取主检出的本票分配，核对完整基线与本树冻结哈希。

在唯一工作树运行：

```powershell
node scripts/worker-check.mjs --task WATER-W1-A --mode baseline
node scripts/verify-contract-assets.mjs
```

baseline要求HEAD精确等于基线、分支正确、初始干净、冻结文件一致，并在本树.local内编译运行工具链探针。失败则停止写受阻回执，不自行切树/重置/安装。**本次没有已有Cargo工程，baseline通过不是Rust合同测试通过。**

## 1. 要实现什么

1. 根Cargo workspace只包含`crates/water-contracts`；edition 2024、Rust 1.95、publish=false。`rust-toolchain.toml`精确channel 1.95.0，含已安装的rustfmt/clippy。crate只有lib及`contract_v1`集成测试目标，不建CLI/example/bench/build脚本。
2. 依赖严格为serde `=1.0.229`（derive）与serde_json `=1.0.151`，不加dev/build依赖。Cargo.lock提交；除这张票外没人同时改依赖。helper隔离Cargo状态与target到本树.local，禁止裸cargo和全局配置变化。
3. 按SEMANTICS实现公共`water_contracts::v1`：所有Schema DTO与枚举、ByteCount/OpaqueId/RelativePath、ContractError/ErrorCode、parse_report、validate_report、to_json。newtype内部私有，crate禁止unsafe。
4. 必填nullable属性不能缺失；未知字段/枚举、重复JSON键、字节字符串不规范/溢出、非规范相对路径都必须拒绝。数字精度到u64::MAX，不能经f64；Unicode标量计数与U+2028/U+2029按契约处理。
5. 语义校验覆盖ID唯一、scope引用、每个scope的取消一致性、未知测量不当成0、M1不报告回收字节、未知/独有/活跃对象与资产祖先保护。直接构造DTO再validate/to_json也要拒绝非法状态；不能只在parse验证。
6. parse/to_json遵守8MiB边界；错误不回显原始输入。合同只处理内存数据，不访问文件系统/用户目录、不调用进程/网络、不产生扫描授权或删除能力。

Schema、SEMANTICS和conformance是总控契约。若发现不一致或不可实现，报告具体例子与最小修订需求，不改冻结材料来绕过。

## 2. 唯一文件范围

允许新建/修改：

- 根`Cargo.toml`、`Cargo.lock`、`rust-toolchain.toml`。
- `crates/water-contracts/Cargo.toml`、`README.md`、`src/`内实现文件。
- `crates/water-contracts/tests/contract_v1.rs`。
- 本票回执`docs/dispatch/reports/WATER-W1-A-REPORT.md`。
- 本票文本日志/JSON证据`docs/acceptance/wave1/a/`，不得夹带可执行程序、用户数据或依赖vendor。

只读/禁止改：contracts、总控脚本、架构、manifest/registry、根README/AGENTS、research/upstream、其他项目/工作树、全局工具与配置。`.local`仅用于本票工具状态和日志，不提交。没有需要删除的现有文件，不执行递归删除或清缓存。

## 3. 测试目标与输入

只在`tests/contract_v1.rs`创建下面**五个顶层测试函数**，名字必须精确；不得ignored/skip/过滤。辅助函数可以在本测试文件内，测试从已冻结数据读入（建议include_str!），不读取真实HOME或用户目录。

| 函数名 | 必须证明 |
|---|---|
| `conformance_reports` | 遍历全部66个report cases，按JSON pointer的add/replace/remove生成输入；断言成功或精确ContractErrorCode，断言消息带case id；每个成功报告to_json后再parse语义相等 |
| `byte_count_round_trip` | 0、2^53+1、u64::MAX都以字符串无损往返，u64::MAX不能变数字/浮点；new/get/FromStr接口正确 |
| `primitive_validation` | primitiveCases全部有效/无效输入，精确构造错误码；包含末尾换行、Unicode路径分隔字符与literal百分号 |
| `constructed_report_validation` | constructedCases六项，在原始DTO上制造非法值，分别validate_report和to_json拒绝；包括空evidence、65 scopes、65 evidence、model review、M1非null回收量与未知scope |
| `raw_json_and_resource_limits` | rawJsonCases六项包含坏JSON、错误根类型和重复键；resourceCases两项（超限输入、20000条唯一ID的合法finding复制后输出超限）；将category设为`DO_NOT_ECHO_CANARY_7f98`时返回InvalidShape且Display不出现该原文 |

JSON Patch仅需冻结用例中的add/replace/remove，不引入依赖。测试不得按case id预置结果、跳过某个case、改fixture、把本应失败分支做成测试开关或只验证序列化输出存在。正常语义必须来自真实生产函数。

先记录能打到目标断言的行为红，再实现；工程初起的缺文件/编译错误可报告，但不能冒充行为先红。所有基线材料是虚构metadata，不是真的磁盘占用。

## 4. 定向命令

运行位置固定为本工作树根，全部命令真实helper已存在。先创建本票Cargo清单、lib和测试文件，然后依次准备锁和依赖：

```powershell
node scripts/worker-check.mjs --task WATER-W1-A --mode lock
node scripts/worker-check.mjs --task WATER-W1-A --mode fetch
node scripts/worker-check.mjs --task WATER-W1-A --mode fmt
node scripts/worker-check.mjs --task WATER-W1-A --mode test
node scripts/worker-check.mjs --task WATER-W1-A --mode clippy
node scripts/worker-check.mjs --task WATER-W1-A --mode metadata
```

`lock`只授权这张底座票生成固定依赖的锁；仅Cargo访问官方registry下载这两项及传递依赖，不能装Rust/VS/别的依赖、改代理或读取其他配置里的凭证。网络/环境失效原样重试一次仍不行就受阻。

fmt是check，不自动改写；需要调整自己的源码格式可编辑，不改helper。test会先核对五个测试名，再要求实际5 passed、0 failed/ignored/measured/filtered。clippy限定water-contracts的targets；不是全仓门。每命令有stdout/stderr日志与最终result.json，记录前后SHA和脏树。

## 5. 六项有效负控

在自己的真正实现上临时改坏一处，运行本票test模式，确认指定测试因目标断言失败。记录改坏文件/行、预期case、实际失败断言、退出码和修改前/坏/恢复三个哈希；逐项原字节恢复，不用全树还原。下面是目标，不要求采用某个实现形态。

1. ByteCount序列化为JSON数字 → `byte_count_round_trip`红。
2. ByteCount允许前导零 → `primitive_validation`中的`01`红。
3. 跳过未知scope引用检查 → `conformance_reports`的`unknown_scope`红。
4. 跳过protected后代的祖先保护 → `conformance_reports`的`protected_descendant_missing_propagation`红。
5. 允许缺失allocated_bytes当null → `conformance_reports`的`missing_nullable_field`红。
6. to_json跳过validate → `constructed_report_validation`的非法分类/容量项红。

编译失败、缺fixture、超时或仅断言一个测试专用开关都不算有效负控。恢复后跑本票完整test；测试体量很小但仍一次一个进程，不另开全仓/coverage/watch。

## 6. 交付与最终门

- 实现和首轮证据提交在自己的分支，提交首行`WATER-W1-A: ...`，显式git add允许文件并检查staged清单及diff --check。没有许可修改其他分支或push。
- 若本机没有Git提交身份，使用本项目中性的单命令身份，不修改global配置：`git -c core.hooksPath=NUL -c commit.gpgsign=false -c user.name="Water Worker (external)" -c user.email="water-worker@localhost" commit -m "WATER-W1-A: implement frozen scan contracts"`。后续报告提交也可使用同样的局部参数；不得冒用用户身份。
- 提交后工作树干净，再依次运行以下最终门（`--final`要求前后同一干净提交）：

```powershell
node scripts/worker-check.mjs --task WATER-W1-A --mode fmt --final
node scripts/worker-check.mjs --task WATER-W1-A --mode test --final
node scripts/worker-check.mjs --task WATER-W1-A --mode clippy --final
node scripts/worker-check.mjs --task WATER-W1-A --mode metadata --final
```

- 最终门后的日志复制与报告补记可另提交，仅限文档证据；不夹带产品代码。最终报告给出实际受测实现SHA，不用“见HEAD”代替。报告后停止修改。
- 报告逐项写INV结果、Cargo版本/依赖、66+6+6+2及primitive测试覆盖、先红、六项负控、原始命令/退出码/日志与receipt、代码是否纯内存、平台未验证项及引擎模型。macOS未实测必须写未验证。
- 完成第一句及报告首行：`WATER-W1-A 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/a/docs/dispatch/reports/WATER-W1-A-REPORT.md`。受阻把“任务已完成”改“任务受阻”，保留现场，列最小补单需求，不请用户裁决范围。

worker完成只是SUBMITTED；总控还会读diff、复跑并抽查独立输入，不等于已验收合入。
