WATER-W10-M10 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m10/docs/dispatch/reports/WATER-W10-M10-REPORT.md

2026-11-07（JST）。实际模型：GPT-6（Codex；运行时未提供更细型号标识）。本回执为执行者提交，待总控独立验收。

## 提交与范围

- 唯一工作树：`F:/new/smaltalk/water/.worktrees/w10-m10`；分支：`worker/water-w10-m10`。
- 首次 HEAD：`51d851914c5845ac9b818f0e9053051b0cb88b1a`，开工时干净，baseline 通过。
- 干净实现提交：`df22c25c39a1c3145644847371f691a252c1c684`（`fix(junk-clean): reconcile occupied quarantine directories safely`）。三项 final 全部绑定此 SHA。
- 实现仅改 `packages/junk-clean/` 的 README、lib.rs、native_windows.rs、quarantine.rs、tests/clean_v1.rs，并新增内部模块 move_checks.rs。后续交付提交仅含本回执与归档器生成的证据。
- 公开函数签名、结构字段及枚举不变；Cargo.toml、Cargo.lock、model.rs、quarantine_model.rs 对基线差异为零。系统函数仍为原十个，生产代码没有增加按路径文件操作。
- 提交进程使用 `Codex GPT-6 <codex@localhost>` 的作者及提交者身份。未改 git 配置/远端/已有历史，未 push、merge、rebase、amend、reset、squash。
- 未使用子代理；没有改台账、契约、检查器、其它包或其它工作树。遵循项目规则，本项目摘要只保留在本回执，没有写共享 Vault。

## 工单第 1 节逐条对照

| 要求 | 实现与验证 |
|---|---|
| 1. 被占用子目录先清内容、只留空目录 | purge 的子目录 DELETE 打开失败后，按原父句柄无跟随地重新申请列目录/读属性权限。继续核对 FileId、类型和重解析属性，后序清除其内容；待该目录为空时，以原打开错误记录根因，父目录不重复报遗留。新用例在持有无删除共享的子目录句柄时，删掉直接文件及更深子目录，释放 17 字节，只剩 `terminal` 目录一项、0 字节、`in_use`；关闭占用后重试删净。nc1 抓住移除该退路的变异。 |
| 2. 编号目录独占/DELETE 句柄占用 | 初次句柄链遇到 32/33 时，重新核对上级整链及上级枚举中的末项，只有已确认的普通编号目录才转为根级遗留；不进入、不删除。新用例覆盖共享方式 0 和另一个带 DELETE 权限的句柄，均返回报告、根级 `in_use`、完整 intent/done，数据保留；释放句柄后重试成功。原共享读写占用用例保持通过。非法路径和重解析入口仍拒绝为 `InvalidPlan`。nc2 抓住统一回报 InvalidPlan 的变异。 |
| 3. 设备名编号在创建前拒绝 | `valid_id` 在原长度/字符/首字符规则后复用 path::validate 的设备名检查。对 CON/PRN/AUX/NUL、COM1–9、LPT1–9，大写、小写、带扩展名和结尾点分别断言 InvalidPlan，并断言隔离根未建立、日志未写、源数据完好。原服务格式 `YYYYMMDD-HHMMSS` 的真实移入用例继续通过。nc3 抓住移除设备名拒绝的变异。 |
| 4a. 最终核对不丢部分报告与 done | 保留原编号目录已验证的句柄，在停止或目录删除失败后按该句柄进行残余检查；复用 inspect 的元数据遍历，避免重新打开被替换的路径。末次核对异常转为报告遗留，仍走结束回调及 done 行。新用例在 256 次实际移除后，将编号目录改名并在原名放联接、置停止；报告保留释放 256 字节、原对象剩 1 项/1 字节、stopped，以及 done，联接外部数据完好。 |
| 4b. 预检后条目消失为 Gone | source 上级链 Missing 与最终源打开/改名的 2/3 映射为 skipped/Gone。日志 flush 回调删除合成源后，公开 quarantine 返回 skipped/Gone，不遗留新骨架。 |
| 4c. 全跳过/全失败清理新空骨架 | tracked directory chain 只记录本次实际创建的目录及身份；MoveSkeleton 在其后创建的句柄链关闭后，逆序无跟随重新打开、核对身份、确认空，再设置删除标志。移入成功则保留骨架。断言覆盖锁目录全失败、flush 取消、身份变化、Gone、intent 写失败；新隔离根/编号/中间层被清掉，预先存在的空编号目录保留。现存/并发创建/非空/身份不同目录均不作为本次所有物清理。 |
| 4d. 注释 | 将过时的“八个函数”改成十个及补单来源；为 NtCreateFile 错误转换补齐 SAFETY。 |
| 5. 缺失断言 | 在原对应测试内新增下列断言，原 11 个测试名称和旧断言保留。 |

新增断言的具体范围：

- `quarantine_unlock_pair`：解锁路径虽列在 protected_paths 但不包含条目时拒绝；另一条不属于解锁对的受保护上级通过联接别名按身份阻止执行。
- `quarantine_move_contract`：真实 NT 冲突返回 183 且映射 DestinationExists；条目包住隔离根时 guarded 且不建目录；目录无删除共享占用时 Locked 且内容不变；源在 intent flush 时换身份，公开入口拒绝移动。move_checks::source_matches 是生产最终源句柄身份门，另用真实新旧身份与 None 检验其拒绝/接受语义。
- `quarantine_restore_contract`：真实同名冲突的 error_code 精确为 183，同时保留已有不覆盖断言。
- `quarantine_purge_contract`：含文件的占用子目录、共享方式 0/DELETE 的编号目录、末次核对路径替换、硬链接释放量。外部硬链接保留的数据不计回收，目录内部最后一个硬链接只计一次，加普通文件合计 14 字节。
- 第二隔离根门使用生产实际调用的 `move_checks::second_root`，在两个本树随机夹具根字符串上断言拒绝第二根、放行第一根及大小写等价根。测试通过路径包含生产纯门函数；没有为了覆盖它在真实盘根建立隔离区。

旧断言修改：**无**。`git diff --numstat 51d85191 HEAD -- packages/junk-clean/tests/clean_v1.rs` 为新增 526 行、删除 0 行。测试仍精确 11 个，无 ignore、过滤或新增墙钟时限断言。

## 检查命令、结果与历史失败

除格式化和 Git 核对外，下表各行的完整命令前缀均为：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M10 --mode <表内模式>
```

表内 `--final` 原样追加。全部在指定 M10 工作树根执行，Cargo 离线、jobs=1、私有 cargo home/target；每次测试前按进程名查看 cargo/node，没有另一个在跑的检查进程。没有调整检查器时限或下载依赖。

| 模式 | 入口退出码 | 最后一条 Cargo 退出码 | 结果 | 原始回执 |
|---|---:|---:|---|---|
| `baseline` | 0 | — | 通过 | [2026-11-06T15-39-53.166Z-33620-baseline-result.json](../../acceptance/wave10/m10/receipts/2026-11-06T15-39-53.166Z-33620-baseline-result.json) |
| `test` | 1 | 101 | 失败（原因见下文） | [2026-11-06T15-42-32.523Z-28912-test-result.json](../../acceptance/wave10/m10/receipts/2026-11-06T15-42-32.523Z-28912-test-result.json) |
| `lock` | 0 | 0 | 通过 | [2026-11-06T15-48-19.723Z-36444-lock-result.json](../../acceptance/wave10/m10/receipts/2026-11-06T15-48-19.723Z-36444-lock-result.json) |
| `check` | 1 | 101 | 失败（原因见下文） | [2026-11-06T15-48-29.700Z-38076-check-result.json](../../acceptance/wave10/m10/receipts/2026-11-06T15-48-29.700Z-38076-check-result.json) |
| `check` | 0 | 0 | 通过 | [2026-11-06T15-48-59.393Z-21252-check-result.json](../../acceptance/wave10/m10/receipts/2026-11-06T15-48-59.393Z-21252-check-result.json) |
| `test` | 1 | 101 | 失败（原因见下文） | [2026-11-06T15-49-14.501Z-21016-test-result.json](../../acceptance/wave10/m10/receipts/2026-11-06T15-49-14.501Z-21016-test-result.json) |
| `check` | 0 | 0 | 通过 | [2026-11-06T15-52-26.235Z-35208-check-result.json](../../acceptance/wave10/m10/receipts/2026-11-06T15-52-26.235Z-35208-check-result.json) |
| `test` | 0 | 0 | 通过 | [2026-11-06T15-52-44.281Z-38256-test-result.json](../../acceptance/wave10/m10/receipts/2026-11-06T15-52-44.281Z-38256-test-result.json) |
| `real` | 0 | 0 | 通过 | [2026-11-06T15-54-10.377Z-37688-real-result.json](../../acceptance/wave10/m10/receipts/2026-11-06T15-54-10.377Z-37688-real-result.json) |
| `red-nc1` | 0 | 101 | 通过：有效目标红，测试 10 过 / 1 败 | [2026-11-06T15-54-51.979Z-5924-red-nc1-result.json](../../acceptance/wave10/m10/receipts/2026-11-06T15-54-51.979Z-5924-red-nc1-result.json) |
| `test` | 0 | 0 | 通过 | [2026-11-06T15-56-31.084Z-18728-test-result.json](../../acceptance/wave10/m10/receipts/2026-11-06T15-56-31.084Z-18728-test-result.json) |
| `red-nc2` | 0 | 101 | 通过：有效目标红，测试 10 过 / 1 败 | [2026-11-06T15-57-49.009Z-24688-red-nc2-result.json](../../acceptance/wave10/m10/receipts/2026-11-06T15-57-49.009Z-24688-red-nc2-result.json) |
| `test` | 0 | 0 | 通过 | [2026-11-06T15-58-42.976Z-30408-test-result.json](../../acceptance/wave10/m10/receipts/2026-11-06T15-58-42.976Z-30408-test-result.json) |
| `red-nc3` | 0 | 101 | 通过：有效目标红，测试 10 过 / 1 败 | [2026-11-06T15-59-41.189Z-24008-red-nc3-result.json](../../acceptance/wave10/m10/receipts/2026-11-06T15-59-41.189Z-24008-red-nc3-result.json) |
| `test` | 0 | 0 | 通过 | [2026-11-06T16-00-51.018Z-9868-test-result.json](../../acceptance/wave10/m10/receipts/2026-11-06T16-00-51.018Z-9868-test-result.json) |
| `check --final` | 0 | 0 | 通过 | [2026-11-06T16-01-57.022Z-23112-check-result.json](../../acceptance/wave10/m10/receipts/2026-11-06T16-01-57.022Z-23112-check-result.json) |
| `test --final` | 0 | 0 | 通过 | [2026-11-06T16-02-12.350Z-16584-test-result.json](../../acceptance/wave10/m10/receipts/2026-11-06T16-02-12.350Z-16584-test-result.json) |
| `real --final` | 0 | 0 | 通过 | [2026-11-06T16-03-21.801Z-28268-real-result.json](../../acceptance/wave10/m10/receipts/2026-11-06T16-03-21.801Z-28268-real-result.json) |
| `archive` | 0 | — | 通过 | 2026-11-06T16-03-27.220Z-8016-archive-result.json |

表内 archive 回执位于本树 `.local/checks/WATER-W10-M10/`；归档器的此次结果回执在复制完成后才生成，因此不在自身的 ARCHIVE.json 内。其它表内原始回执和日志均在证据目录。证据还保留开工前已存在的总控 baseline 回执 `2026-11-06T15-36-15.888Z-10448-baseline-result.json`，未冒称为本执行者运行。

历史失败全部保留：

1. `15-42-32.523Z`：先加回归断言、保持原产品逻辑，9 过/2 败；精确命中 `device id accepted: CON` 与 `occupied child contents retained`，证明新增断言能发现原缺陷。
2. `15-48-29.700Z`：Clippy 抓住新增代码中的两处 needless_borrow；去掉多余引用后 `15-48-59.393Z` 的 check 通过。
3. `15-49-14.501Z`：10 过/1 败；新增竞态夹具试图在子文件仍持无删除共享句柄时改名父目录，Windows 返回 5。仅修正本单新加的夹具，改为在进度回调中无子文件占用时改名并停止；生产端改用原句柄核对，之后完整测试通过。未修改任何基线旧断言。
4. 三次 red 模式的内部 Cargo 101 均为预期目标断言红，检查入口退出 0；无编译错误、超时或测试开关造红。

另执行固定 1.95.0 Cargo 的 `fmt --manifest-path packages/junk-clean/Cargo.toml`；最终 fmt --check 与 Clippy -D warnings 已由 check --final 通过。Git diff --check、接口/依赖文件对基线差异核对、逐条恢复 SHA-256 均通过。

## 三条负控与原字节恢复

均在实现提交 df22c25c 之后，只改一个被调用的生产分支；测试字节不变。每次 red 完成立即 `git checkout -- <该文件>`，核对 SHA-256，然后马上运行完整 test，变绿后才开始下一项。

| 负控 | 单处变异 | 实际失败信息 | 紧随恢复测试 |
|---|---|---|---|
| nc1 | 子目录无 DELETE 退路的匹配条件追加 `&& code == 0`，让真实占用错误不再进入退路 | `CLEAN_M35_PURGE: occupied child contents retained`，left 2 / right 0 | `2026-11-06T15-56-31.084Z-18728-test-result.json`，11/11 |
| nc2 | 根目录 32/33 特判追加 `if code == 0`，使其重新落入 InvalidPlan | `CLEAN_M35_PURGE: occupied root became InvalidPlan Err(InvalidPlan)` | `2026-11-06T15-58-42.976Z-30408-test-result.json`，11/11 |
| nc3 | 删除 valid_id 末尾的 path::validate 设备名检查 | `CLEAN_M35_MOVE: device id accepted: CON` | `2026-11-06T16-00-51.018Z-9868-test-result.json`，11/11 |

恢复后的文件 SHA-256：

- native_windows.rs（nc1、nc2）：`9944fbab0cf0a0a1722f877f39e7605f01c51a92f198f3c6971ff0bc98a7201a`。
- quarantine.rs（nc3）：`82424083e3f4ec98d018cf6e32bcde6c55de99cd9fb46157137ea946fdde3d1a`。
- clean_v1.rs：`566aa735494ac6748720ff134eb9e39e39807005e227f9a363f24650f3e83df5`。

test --final 的 proofAudit 核实三组红/恢复绿的先后顺序、原字节源码快照及哈希。三个 final 的 productionHash 同为 `55f0a651da5c9859ca39421c5dab6e55f67f32cbaead1131d8ee5a87a2b2ce6d`，testHash 同为 `4efb8fcc984362f90eb5ba3c8779bd73aa09ac80d07bf3d2208c7bc5ca946f13`。

## 真实只读冒烟、证据与边界

按仍有效的 M4 补单 01，real_smoke 仅查询系统盘与本仓库所在盘，去重；没有枚举所有固定盘。首次 real 与 real --final 的输出相同：

```json
{"absent":2,"checked":2,"present":0,"quarantines":0,"unavailable":0}
```

只读取隔离根状态及直接编号目录计数，不读取真实文件内容，不移动、复原或删除真实数据。原生窗口/选择框/浏览器均为 0。

[ARCHIVE.json](../../acceptance/wave10/m10/ARCHIVE.json) 由 archive 生成，收录 320 个原字节文件、5,341,805 字节，另有索引及归档器生成的 .gitattributes。归档后独立逐一复算了全部 320 对 source/archive SHA-256，均与索引一致。保留全部历史失败、有效红控、恢复绿及 final 证据。

尚未做或未验证：

- macOS、非 Windows 实际运行、任意外部进程竞态调度未验证；本次为 Windows 受控句柄与合成夹具验证。
- 本轮没有建立真实盘根隔离区，也未做跨两个真实盘根的同批移动；第二根的限制在实际生产纯门上测试。最终身份门的纯逻辑及 intent 后替换通过测试，未穷尽最终原生打开与改名之间任意线程调度。
- 检查器将私有 TEMP 配在本树同卷；按既有测试逻辑，该情况走 `CLEAN_M35_CROSS_VOLUME n/a` 分支（成功测试的单项输出由 Rust 测试器捕获，不单列在日志中）。本轮未新增跨卷复制/移动实验。
- 没有执行 M7 服务整合测试、发布、GUI 或其它包测试；待总控按原接口集成验收。
- 按票面保持：日志写失败仍返回 Journal，不调整返回类型；计划内祖先/子项的重叠政策不扩展。
- 所有自有检查进程均已正常结束；未启动后台服务。交回检查未发现 cargo/clean_v1，后出现的其它 node 进程未干预。

报告与证据提交后停止本票修改和测试；完成不代表总控已验收。
