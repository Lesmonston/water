WATER-W4-G6 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w4-g6/docs/dispatch/reports/WATER-W4-G6-REPORT.md

2026-10-27。执行者交回，待总控验收；本报告不改变 manifest 状态。

## 起点、范围与模型

| 项目 | 实际值 |
|---|---|
| 实际引擎 / 模型 | Codex，系统标识为基于 GPT-6；未提供更细版本，不把派单标签 `sol` 当作可核实的具体型号 |
| 工作树 | `F:/new/smaltalk/water/.worktrees/w4-g6` |
| 分支 | `worker/water-w4-g6` |
| 首次 HEAD | `4f35c52f5abb3dee22583cc2c86b05da2fc2be93`，开工时干净 |
| 实现提交 | `c114d777a71fe2c5a370192e2c679d54572ce1d2` |
| 产品改动 | 宿主 README、`src/{lib,data,startup,service}.rs`、`tests/host_v1.rs`，共 6 个文件 |
| 工具链 | Rust 1.95.0；检查器提供私有 Cargo home、target、临时目录；离线、单 job；不下载 |
| 原生预算 | 1/1，全部用于 `native --final`；目录选择框 0/0 |

已按票面阅读两份 worker 规则、HOST-FINISHING、WIRING、HOST、F3 验收的四条观察及指定代码；另读项目入口四文档、ADR-018、第四波计划、IPC 和共享模型。首次核对绝对路径、分支、HEAD 与干净状态后先跑 baseline，成功后才改代码。

未改 Cargo.toml、Cargo.lock、tauri.conf.json、capabilities、icons、其它包、界面、契约、检查器或台账。未添加依赖、unsafe、网络、生产进程启动或新的环境变量读取。无 push、merge、历史改写、远端或 Git 配置修改；提交时用命令级 `core.hooksPath=NUL` 关闭 hooks。

## SPEC 第 1～5 节落实

1. **正常退出**：`src/lib.rs` 用 `app.run_return`。事件循环返回后发送停止消息、join 激活线程，再释放实例锁，返回 `Ok(())`。停止消息能立即唤醒等待中的线程；线程持有的窗口句柄随线程结束释放，不再保留后端。原生检查实际以 0 正常退出，未强制结束。
2. **实例唤起**：公开并实际使用 `signal_activation`、`take_activation`。第二实例遇到 `AlreadyRunning` 时写空 `activate.signal`，成功后返回 `Ok(())`。窗口构建完成、事件循环开始前启动后台线程，每 300 ms 查询；信号成功删除后在主线程依次 `unminimize`、`show`、`set_focus`。目录、符号链接及带重解析属性的对象均被忽略、保留；信号写入还使用 `FILE_FLAG_OPEN_REPARSE_POINT` 并检查打开句柄的元数据后才清空、更新时间，不读取内容。读取或删除失败不产生激活。
3. **后端失败可见**：公开并在 `run` 中调用 `backend_or_unavailable`；工厂失败替换为 `UnavailableBackend` 后继续构建窗口，成功保留原来的 Arc。数据目录、锁与 Tauri 本身失败仍返回启动错误。单元测试检查全部 17 个命令及未知命令的 unavailable 值、工厂上下文与成功后端的 Arc 身份。
4. **默认基目录联接**：`prepare_data_directories` 签名不变；仅默认分支调用 `resolve_default_base`，用 canonicalize 解析基目录，将 `VerbatimDisk` 前缀转换为普通盘符路径，再走原有逐级目录检查。覆盖路径不解析，`Water` 与 `webview` 仍不得为链接。保留默认基目录尚不存在时的安全创建行为。最终路径仍经过原有本地盘符校验，UNC、设备命名空间等不获放行。
5. **三处测试问题**：共享 `fixture_parent` 容忍并行创建时的 AlreadyExists，并重新检查普通目录；直接在夹具目录调用 `service_backend`，检查 `app_state`、`service_config.clean_enabled == false` 和真实后端的清理拒绝；`WiringFixture::Drop` 只记录清理错误，不 assert、unwrap 或 panic，测试主体显式调用并检查清理结果。清理仍核对父目录、前缀、规范路径与祖先，且只删除本次新建的随机根。

仍精确五测，名字不变：`host_config_boundary`、`host_navigation_boundary`、`host_command_registry`、`host_data_directory`、`host_service_wiring`。原有命令、配置、导航、选择框与清理关闭断言继续执行。新增断言均放在这两个已有测试的相应位置，使用票面四个新标记。

原 `prepare_data_directories(None, &junction)` 的“默认路径联接必须拒绝”断言，按新 SPEC 第 4 节改为成功并落在真实路径下；覆盖路径的联接拒绝、无越界写入断言保留。新增 `Water` 本身、`webview` 本身为联接时的拒绝检查。信号测试包括重复更新、消费一次、删除后消失、普通目录与联接保留、缺失父目录及独占句柄造成的读写/删除失败。

## 实际检查命令与结果

全部在本工作树根目录运行。下表每行命令均使用此前缀：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W4-G6
```

证据链接均指向检查器 `archive` 按原字节生成的归档；回执内部包含每条 Cargo / 观察器命令、退出码和对应原始日志名。所有检查入口退出码均为 0；负控内部 Cargo 的 101 是预期失败。

| 顺序 | 后续参数 | 结果 / 用时 | 原始回执 |
|---|---|---|---|
| 1 | `--mode baseline` | passed，15.672 s，环境及冻结输入就绪 | [baseline](../../acceptance/wave4/g6/receipts/2026-10-27T09-54-37.640Z-248-baseline-result.json) |
| 2 | `--mode lock` | passed，13.745 s，锁与依赖核对，无锁变化 | [lock](../../acceptance/wave4/g6/receipts/2026-10-27T10-00-29.072Z-32348-lock-result.json) |
| 3 | `--mode check` | passed，462.513 s，首次离线 Clippy 构建 | [check](../../acceptance/wave4/g6/receipts/2026-10-27T10-01-27.138Z-34228-check-result.json) |
| 4 | `--mode test` | passed，434.146 s，5/5，首次测试构建 | [test](../../acceptance/wave4/g6/receipts/2026-10-27T10-10-40.870Z-21244-test-result.json) |
| 5 | `--mode red-nc1` | passed，26.462 s，内部 4 绿 1 红 / 101 | [nc1](../../acceptance/wave4/g6/receipts/2026-10-27T10-20-23.547Z-35960-red-nc1-result.json) |
| 6 | `--mode test` | passed，18.666 s，恢复后 5/5 | [nc1 恢复](../../acceptance/wave4/g6/receipts/2026-10-27T10-21-11.206Z-26908-test-result.json) |
| 7 | `--mode red-nc2` | passed，15.754 s，内部 4 绿 1 红 / 101 | [nc2](../../acceptance/wave4/g6/receipts/2026-10-27T10-21-39.699Z-4136-red-nc2-result.json) |
| 8 | `--mode test` | passed，17.015 s，恢复后 5/5 | [nc2 恢复](../../acceptance/wave4/g6/receipts/2026-10-27T10-22-08.910Z-15852-test-result.json) |
| 9 | `--mode red-nc3` | passed，35.376 s，内部 4 绿 1 红 / 101 | [nc3](../../acceptance/wave4/g6/receipts/2026-10-27T10-22-32.810Z-25088-red-nc3-result.json) |
| 10 | `--mode test` | passed，37.200 s，恢复后 5/5 | [nc3 恢复](../../acceptance/wave4/g6/receipts/2026-10-27T10-23-26.976Z-20576-test-result.json) |
| 11 | `--mode check --final` | passed，8.879 s，fmt、Clippy -D warnings、政策通过 | [final check](../../acceptance/wave4/g6/receipts/2026-10-27T10-24-16.634Z-28856-check-result.json) |
| 12 | `--mode test --final` | passed，6.840 s，5/5，三条负控与恢复审计通过 | [final test](../../acceptance/wave4/g6/receipts/2026-10-27T10-24-30.214Z-37432-test-result.json) |
| 13 | `--mode native --final` | passed，检查门 111.105 s；应用观察 104.879 s | [final native](../../acceptance/wave4/g6/receipts/2026-10-27T10-24-48.529Z-24432-native-result.json) |
| 14 | `--mode archive` | passed，3.863 s；259 个原始文件 / 23,789,401 字节 | [归档索引](../../acceptance/wave4/g6/ARCHIVE.json) |

归档包含开工前已有的 [08:26 总控派前 baseline](../../acceptance/wave4/g6/receipts/2026-10-27T08-26-00.495Z-23464-baseline-result.json)，它不是本执行者运行，不用它代替本次 09:54 baseline。`archive` 自身的事后回执在 `.local/checks/WATER-W4-G6/2026-10-27T10-27-40.166Z-20888-archive-result.json`，按检查器既有机制不在本次复制的索引内。

另执行两次 `rustup.exe run 1.95.0 cargo fmt --manifest-path apps/water/host/Cargo.toml`，均退出 0；Git diff 空白检查通过。首次 check 之后补充了错误消费、webview 联接断言及 README，最终三个 final 均绑定下列同一干净实现提交与哈希：

```text
HEAD: c114d777a71fe2c5a370192e2c679d54572ce1d2
productionHash: 45af51a4a462ed257859e8595c62a198fe46120e93f5d918f9e9a0c12e92fc2f
testHash: 6b51d6aa329eedd406e84ca1bbf7ad385ef143c7b53074454bcc419a9f035694
```

## 三条负控与原字节恢复

每条只临时改已提交生产源码的一处，不改测试，不提交变异，不添加开关。红测后立即 `git checkout -- <该文件>`，用 SHA-256 核对下表原字节，再运行表中的完整 `--mode test`。三次测试哈希均未变化，恢复的 productionHash 均为上面的 `45af51...`。

| 负控 | 实际变异 | 实际失败信息 | 恢复文件 SHA-256 |
|---|---|---|---|
| nc1 | `src/startup.rs`，`take_activation` 的普通文件分支由删除并返回结果改成 `false` | `HOST_SINGLE_INSTANCE consume signal` | `b5d881d657de6ff59753109cedc55ec01b8e2a7e8cb311fa50ecab45d3fea85e` |
| nc2 | `src/service.rs`，后端失败时的 fallback 改成 `panic!("{error}")`，使服务失败中止启动；测试捕获这个 panic 后用目标标记报错 | `HOST_STARTUP_VISIBLE backend failure must not abort startup: Any { .. }` | `0399b19fb19f35a012702b402023df86fdb3ef680468bdcee9907d10efc9d0b2` |
| nc3 | `src/data.rs`，默认分支由 `resolve_default_base(local_data_dir)?.join("Water")` 改为直接 `local_data_dir.join("Water")` | `HOST_DATA_JUNCTION resolve default base: DataDirectoryError` | `a86c66cda6bc68faa592703242285d2b75af1377f6d97a5d50eeef99e5458474` |

三次均真实跑齐五测、4 passed / 1 failed / 0 ignored / 0 filtered，非编译错误或超时。nc2 产品中的 panic 不含测试目标标记，标记来自测试对“失败工厂不得中止宿主”的断言。原始变异源码、失败日志、恢复源码与绿测日志都在归档中，final test 的 proofAudit 配对齐全。

## 唯一一次整机原生检查

实际运行区间约为 19:24:53～19:26:37 JST，完整应用观察耗时 **104,879 ms**。UI 结果显示扫描用时 94 秒；观察器等待结果耗时 **96,961 ms**，包含界面等待开销。

| 指标 | 结果 |
|---|---|
| 窗口 | 标题 Water，1 个主窗口；框架 rawWindows=2、eventTargets=1 |
| 目录选择框 | 0 |
| Mica | backdropType=2 |
| 退出 | 0，signal=null，未强制结束 |
| 子进程 | 6 个 msedgewebview2.exe，结束后 remaining=[] |
| WebView 数据 | 观察器确认在本树 `.local/w4-g6-native/2026-10-27T10-24-48.529Z-24432/webview` |
| 存储计数 | scans=1、snapshots=1、plans=0、cleans=0、journal=0 |
| 顶层内容 | cleans、journal、plans、scans、snapshots、water.lock、webview |
| 截图 | 6 张，每张 1568×1072；无最小化恢复，restores=0 |

11 步逐项通过，未改观察器步骤或文字：

| 步 | 自动操作 / 等待 | 用时 ms |
|---|---|---|
| 1 | 首页“开始一次体检”，且无“无法连接 Water 服务”，截 home | 1303 |
| 2 | Invoke“开始体检” | 84 |
| 3 | 等待“本次体检共识别”，截 results | 96961 |
| 4 | Invoke“清理所选” | 50 |
| 5 | 等待清理关闭文案，截 clean-disabled | 1119 |
| 6 | Invoke“增长趋势” | 24 |
| 7 | 等待趋势副标题，截 trends | 881 |
| 8 | Invoke“清理记录” | 36 |
| 9 | 等待记录副标题，截 history | 884 |
| 10 | Invoke“扫描位置” | 34 |
| 11 | 等待位置副标题，截 locations | 870 |

随后由观察器关闭窗口。逐张实际查看后的内容如下，没有打开详情抽屉、没有文件路径截图：

| 截图 | 实际所见 |
|---|---|
| [home](../../acceptance/wave4/g6/receipts/2026-10-27T10-24-48.529Z-24432-home.png) | 冰山标志及标题栏新图标；系统盘 C: 可用 59.6 GB，右侧 D/E/F；“开始一次体检”，无服务连接错误。 |
| [results](../../acceptance/wave4/g6/receipts/2026-10-27T10-24-48.529Z-24432-results.png) | 本次识别 44.1 GB，可放心清理 9.5 GB；分级汇总、AI 编程工具分组、复选框及底部操作坞；扫描于 19:26，用时 94 秒，已选 16 组。 |
| [clean-disabled](../../acceptance/wave4/g6/receipts/2026-10-27T10-24-48.529Z-24432-clean-disabled.png) | 顶部完整显示“这一版只做体检，清理功能会在下一版开放。”，下方仍为结果页；无清理确认框。 |
| [trends](../../acceptance/wave4/g6/receipts/2026-10-27T10-24-48.529Z-24432-trends.png) | 增长趋势页，冰山空态与“再体检一次就能看到变化”；清理关闭提示已随页面切换消失。 |
| [history](../../acceptance/wave4/g6/receipts/2026-10-27T10-24-48.529Z-24432-history.png) | 清理记录页仅一条“体检记录”，10 月 27 日 19:26，识别 7 类位置，可放心清理 9.5 GB。 |
| [locations](../../acceptance/wave4/g6/receipts/2026-10-27T10-24-48.529Z-24432-locations.png) | 七类扫描开关、保护说明、自定义文件夹区域及“添加文件夹”按钮；没有点击按钮或打开选择框。 |

## 未做、未验证与已知边界

- **第二个实例在真实窗口中唤起第一个窗口未试。** 文件协议、独占锁和消费保护有单元测试，主线程唤起顺序有代码复核；唯一 native 预算用于正常服务的整机流程，没有额外启动第二实例或手工窗口。
- 后端失败时的真实窗口画面未注入验证；fallback 与全部命令的返回值经过单元测试，真实 native 只覆盖正常后端。
- 两个测试并行争建一个全新父目录未额外运行；检查器固定 `--test-threads=1`。实现已显式处理 AlreadyExists，未将单线程绿测声称为并发实测。
- 联接反例全部仅在本树 `.local/w3-f3-fixtures/` 当次随机根内创建、回收；没有额外创建普通文件符号链接、UNC 或卷 GUID 夹具。生产对重解析属性与命名空间的拒绝经过源码复核，不声称覆盖了所有实际标签或生产竞态。
- 没有真实垃圾删除。真实读取仅 native 的一次只读体检；普通文件内容与进程命令行不进入输出或证据。单元测试的服务存储均在合成夹具；直接后端的 `app_state` 使用 Windows 已知目录 / 磁盘空间 API，但不发起扫描。
- release 构建、打包、macOS、真实选择框及其父窗口、WebView2 环境覆盖、Tauri 本身启动失败的 release 提示均未验证或不在本票。清理开关保持 false。
- final 之后只新增本回执和检查器归档证据，产品字节不再改变。检查器和自有原生进程均已自然退出，停止本票后续测试；主线集成与验收由总控进行。
