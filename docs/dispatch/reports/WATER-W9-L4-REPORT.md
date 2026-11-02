WATER-W9-L4 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w9-l4/docs/dispatch/reports/WATER-W9-L4-REPORT.md

2026-11-02，执行者 Codex（本会话系统标识为基于 GPT-6，未提供更细型号标识）；未使用子代理。此回执表示交回执行成果，待总控独立验收。

- 工作树：`F:/new/smaltalk/water/.worktrees/w9-l4`；分支：`worker/water-w9-l4`。
- 首次 HEAD：`57ecd7ce42a98f9932faecc69e5d82c648991669`，开工时干净；按票面使用主树权威规则、契约与检查入口。
- 实现提交：`3967b1ebfd3103457245c558d8fab37501796751`。三个 final 均在该干净提交上依次通过，之后只添加回执与归档证据。
- 仅修改 `packages/process-scan/src/lib.rs`、`tests/process_v1.rs`、`examples/real_smoke.rs` 三个产品/测试文件；依赖、锁、原生模块和其它包不变。

SPEC 对照：

| 要求 | 实现与验证 |
|---|---|
| 第 1 节：原 Windows 写法之外，再认 MSYS 写法 | `command_references_path` 先查原路径；规整后的路径以 ASCII 盘符及 `:\` 开始且后面非空时，再生成 `\<盘符>\<其余>`。命令行沿用原有斜杠转换和小写处理。 |
| 前后边界完全相同 | 将原匹配循环原样提取为私有 `contains_bounded_path`，两种写法共用原 `prev_boundary_ok`、`next_boundary_ok`；保留 UTF-8 安全的继续查找。`c:/f/...`、相邻字母、后缀扩展与 `=1` 均拒绝。 |
| 不把 `/f` 开关当盘根 | 盘根规整为 `f:`，不会进入 MSYS 候选分支。用不携带 F 盘夹具绝对路径的独立令牌进程覆盖 `taskkill /f /im node.exe`，先断言该进程确实在快照内，再断言两种路径查询均不命中。 |
| 所有按命令行判断的方式适用 | 通过公开 `references_path`、`runs_from_or_references` 验证每个样例，并验证两个命令行相关 `InUseMode`。程序路径判断函数未改。 |
| 第 2 节：表内样例、四个测试、指定失败标记 | 表内全部样例加入原 `process_path_reference`；额外覆盖反斜杠 MSYS 写法、单引号、空格、相邻字符、后续有效匹配、查询大小写/尾分隔符与名称过滤。仍精确四测，所有旧断言、旧标记与测试名不变。新断言均含 `PROCESS_M3D_MSYS`。 |
| 第 3 节：两条负控与计数冒烟 | nc1、nc2 分别命中新标记，并立即 checkout 恢复、核 SHA-256、全量四测变绿。原 `real_smoke` 还带旧版孤儿名称/模式列表；按本票“输出只有计数”删除该示例的列表字段，保留九项计数，公开进程摘要形状未改。 |

全部检查在上述工作树根目录串行运行，命令前缀为：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W9-L4 --mode <下表参数>
```

下表时间为 UTC，回执位于[归档目录](../../acceptance/wave9/l4/receipts/)，文件名为“时间戳-PID-模式-result.json”；相应命令日志及源码快照一并原字节归档。

| 时间戳-PID | 参数 | 结果 |
|---|---|---|
| 2026-11-02T03-43-59.961Z-41352 | baseline | 开工前已有的总控预检，passed；由归档器一并收录，不算本次新跑。 |
| 2026-11-02T03-52-10.135Z-42104 | baseline | passed，退出 0，环境与离线输入就绪。 |
| 2026-11-02T03-53-43.779Z-22056 | test | 预期的首次红：新测试配旧实现，3 通过、1 失败；`PROCESS_M3D_MSYS: command reference case 0`，cargo 101、检查器 1。 |
| 2026-11-02T03-54-52.568Z-14836 | lock | passed，退出 0；只核对已有依赖与锁。 |
| 2026-11-02T03-55-01.723Z-28256 | check | 退出 1；fmt 要求将新增样例的长行换行，修正后重跑。 |
| 2026-11-02T03-55-19.139Z-31156 | check | passed，退出 0；fmt、离线 clippy 与政策检查通过。 |
| 2026-11-02T03-56-04.867Z-23452 | test | 3 通过、1 失败；新增盘根用例误用自动附带 F 盘绝对路径的 helper，自身导致命中。仅修正这条新夹具，旧断言不变。cargo 101、检查器 1。 |
| 2026-11-02T03-58-00.482Z-21128 | check | passed，退出 0。 |
| 2026-11-02T03-58-16.989Z-15272 | test | passed，退出 0，4 通过。 |
| 2026-11-02T03-59-24.978Z-42560 | check | 冒烟示例改为纯计数后 passed，退出 0。 |
| 2026-11-02T04-00-12.090Z-25752 | red-nc1 | 有效负控 passed，检查器 0；cargo 101，3 通过、1 个指定标记失败。 |
| 2026-11-02T04-00-53.661Z-2504 | test | nc1 原字节恢复后立即运行，passed，退出 0，4 通过。 |
| 2026-11-02T04-01-39.074Z-33020 | red-nc2 | 有效负控 passed，检查器 0；cargo 101，3 通过、1 个指定标记失败。 |
| 2026-11-02T04-02-26.664Z-32360 | test | nc2 原字节恢复后立即运行，passed，退出 0，4 通过。 |
| 2026-11-02T04-03-09.483Z-24312 | check --final | passed，退出 0；干净实现提交，fmt、clippy `-D warnings`、依赖和源码政策通过。 |
| 2026-11-02T04-03-52.501Z-4896 | test --final | passed，退出 0；4 通过、0 失败/忽略/过滤，24.72 秒；两条负控的红/原字节恢复绿审计通过。 |
| 2026-11-02T04-04-44.706Z-15816 | real --final | passed，退出 0；只读一次本机快照，输出九项计数，见下文。 |
| 2026-11-02T04-05-01.793Z-29852 | archive | passed，退出 0；185 个原始文件、2,023,588 字节，另生成索引和 `.gitattributes`。本次 archive 自身回执留在 `.local/checks/WATER-W9-L4/`，不在其先生成的索引中。 |

最终测试名：`process_snapshot_contract`、`process_path_reference`、`process_in_use_and_orphans`、`process_privacy`。没有修改或放宽任何旧断言；没有新增测试、过滤或 ignore。

负控详情：

- nc1 只将别名生成语句改成 `let msys_path = path_norm.to_string();`，实际不再查找 MSYS 候选。[原始日志](../../acceptance/wave9/l4/receipts/2026-11-02T04-00-12.090Z-25752-red-nc1-5.log)失败为 `PROCESS_M3D_MSYS: command reference case 0`，实际 false、预期 true；无编译错误或超时。坏态 `src/lib.rs` SHA-256：`e661f134d1a12a0770905879e5462716add556f93fdfacdcd2419b58ef314194`。
- nc2 只将公共边界条件改为 `(path_norm.starts_with('\\') || prev_boundary_ok(prev)) && next_boundary_ok(next)`，使 MSYS 候选不检查前边界。[原始日志](../../acceptance/wave9/l4/receipts/2026-11-02T04-01-39.074Z-33020-red-nc2-5.log)失败为 `PROCESS_M3D_MSYS: command reference case 5`，`c:/f/...` 实际 true、预期 false；无编译错误或超时。坏态 SHA-256：`5837960d34e50e7ced04e708983ebf83067e034bb5324218f68e1fe64012ebc6`。
- 每条红后立即执行 `git checkout -- packages/process-scan/src/lib.rs`，核 SHA-256 后马上运行表内对应的 `--mode test`。两次恢复后 `src/lib.rs` 都是 `e92f0c8204ab1830c065d8170519ba5041b0dd1c3e9d433aef11f63d5b0767a5`，与干净实现字节相同。负控期间未改测试，坏态均未提交。
- final 回执中生产源码集合摘要为 `b7f6b099b98b683512f5d670ed4891688ee26fd968d3dbd688a13317a542e0e0`，测试集合摘要为 `b91eb8ac0d9aa6465d80cb69dc69b15221757592e18f7960cb89a5d63a194364`。检查器的集合摘要未覆盖示例；`examples/real_smoke.rs` 的独立 SHA-256 为 `031ccf43958f162fd1b00be29738dbc1a5b34a8a18d33c737cf42d174bd1bea2`，由干净提交、final 全目标 clippy 和真实冒烟绑定。

[真实冒烟回执](../../acceptance/wave9/l4/receipts/2026-11-02T04-04-44.706Z-15816-real-result.json)的单次结果：

```json
{"process_count":434,"access_denied":5,"exited":7,"image_path_count":424,"image_unavailable":7,"chrome.exe":19,"msedge.exe":11,"node.exe":7,"orphan_count":0}
```

这些是当时快照计数；权限不足和退出进程照原语义记录，不表示全部进程的命令行都可读。真实命令行和程序路径只在内存使用，未输出到报告、JSON、日志或证据；命令日志里的编译路径是本工作树路径。归档中的测试源码包含合成字符串，不是实际采集的命令行。

边界与未验证项：

- 本次仅验证 Windows。未验证 macOS、完整桌面集成、实际 Git Bash 启动的业务负载或生产竞态；MSYS 样例作为自建 `cmd` 进程 `rem` 后的合成命令行文本进行公开入口测试，没有运行表中的 Bash、Node、tool 或 taskkill 命令。
- 复用既有测试进程/夹具安全收尾；新增进程登记到本次 Session，夹具仅在本树 `.local/w8-k1-fixtures/` 的随机目录中。测试的 `stop` 复核本次令牌进程为空。没有真实数据删除或真实目录扫描，没有新增系统函数，没有启动原生窗口、选择框或浏览器。
- Cargo 全程由权威检查器使用离线缓存、单构建任务及本树私有 target；未下载、安装依赖或修改网络、Git 身份配置、远端与主线台账。两次提交身份只通过提交命令进程的四个 `GIT_*` 环境变量设置为 `Codex GPT-6 <codex-gpt6@localhost>`；未 push、merge 或改写历史。
- 所有历史失败与有效负控均保留在[ARCHIVE.json](../../acceptance/wave9/l4/ARCHIVE.json)所列原始证据中。实现提交后的提交仅含本回执与归档器生成的本票证据；交回后不再运行测试或保留自有后台任务。
