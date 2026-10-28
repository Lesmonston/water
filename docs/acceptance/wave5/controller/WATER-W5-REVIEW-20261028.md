# 第五波（M2）收单验收：五张全部合入（2026-10-28）

总控（Claude）。五张票 10-27 约 22:36 派出，基点 `3f907897`（标签 `water-w5-m2-base-20261027`）。五份回执都写“任务已完成”，用户 10-28 约 00:40 转来；验收 10-28 凌晨做到一半后暂停，进度见 [10-28 凌晨的进度记录](WATER-W5-ACCEPT-PROGRESS-20261028.md)，当天上午接着做完。

| 票 | 执行者自报 | 实现提交 | 交回 HEAD | 结论 |
|---|---|---|---|---|
| [WATER-W5-H1 清理执行器收尾](../../../dispatch/tickets/WATER-W5-H1-CLEAN-M2-20261027.md) | Codex GPT-6（接手原 Cursor 对话） | `0dc44d45`、补单 `ed138729` | `77fac6c5` | 第一轮要求修改（[补单 01](../../../dispatch/tickets/WATER-W5-H1-ADDENDUM-01-20261028.md)）；补单后 **VERIFIED**，合入 `b3168cb7` |
| [WATER-W5-H2 服务收尾](../../../dispatch/tickets/WATER-W5-H2-SERVICE-M2-20261027.md) | Cursor Grok 4.6 | `17cab09c` | `5fcbe2a3` | **VERIFIED**，合入 `f58eeb2c` |
| [WATER-W5-H3 宿主打开清理](../../../dispatch/tickets/WATER-W5-H3-HOST-M2-20261027.md) | Grok 4.7 | `19d32a33` | `06662d68` | **VERIFIED**，合入 `a9f97325` |
| [WATER-W5-H4 界面 M2](../../../dispatch/tickets/WATER-W5-H4-UI-M2-20261027.md) | Claude Opus 5.5 | `8ec13f1e` | `e91a8ddf` | **VERIFIED**，合入 `de472412` |
| [WATER-W5-H5 Rust 构建目录规则](../../../dispatch/tickets/WATER-W5-H5-RULES-M2-20261027.md) | Codex GPT-6（用户安排为 sol），补单 01 后 | `1e3fc3b6` | `c8dca495` | **VERIFIED**，合入 `38d240d0` |

合入都用 `--no-ff`。五棵树都只在首次 HEAD 之后新增提交，没有合并提交，也没有改写历史。

## 收单审计

`w2-receipt-audit.mjs`（清单 `docs/dispatch/wave5/manifest.json`）五张都没有问题，`unlisted` 为空，final 都落在实现提交上，执行者负控都红绿成对（[audit-h1～h5](accept-20261028/controller/)）。改动都在白名单内：
- H1 只改 `packages/junk-clean/src/native_windows.rs` 与 `tests/clean_v1.rs`；
- H2 只改 `packages/water-service/` 下已有的 4 个文件；
- H3 改 `apps/water/host/` 的 5 个文件，`Cargo.toml`、`Cargo.lock`、`tauri.conf.json`、权限与图标都没动；
- H4 改 `apps/water/ui/` 的 6 个文件，`ipc.mjs`、`model.mjs`、`format.mjs`、样式变量与夹具都没动；
- H5 只改 `rules/windows.json` 与 `tests/rules_v1.rs`。

验收工具在 `.local/w5-accept/`（脚本副本 [accept-kit](accept-kit/)），五棵验收树 `.worktrees/accept-w5-h1～h5` 停在各自交回 HEAD，另有 `.worktrees/accept-w5-h1-cases` 专跑 H1 的总控用例。覆盖清单与每次运行的一行结果在 [controller](accept-20261028/controller/)。

## 独立审查

四张代码票各交一个只读代理，只给代码、契约与票，不给回执与总控结论。都没有阻断级问题；中级问题见各节。

## H1 清理执行器收尾：补单后 VERIFIED

### 新树重跑与总控负控

`lock`、`check`、`test`、`check --final`、`test --final` 都通过。总控负控三条都被抓到，位置都与执行者不同：

| 编号 | 变异 | 结果 |
|---|---|---|
| nc1 | `FileStandardInfo` 读出的链接数换成 1 | 抓到，`CLEAN_FREED_EXACT` |
| nc2 | 无效名字的私有键改成有损转换，两个不同的孤立代理名撞键 | 抓到，`CLEAN_UNPAIRED_NAME` |
| nc3 | 快照遍历超过 1024 层不再展开 | 抓到，`CLEAN_DEEP_TREE` |

### 总控用例

- [w5-h1-controller-unit.rs](../../../../scripts/acceptance/w5-h1-controller-unit.rs)（先快照、再改磁盘、再删除，直接调 crate 的 `snapshot` 与 `delete`）：H1 上 9 个全过；在第五波以前的源码上 8 个失败（“上级被换成同名新条目”原来就安全）。
  - 上级、祖父目录在删除前被移走 → `skipped/gone`，释放 0，失败 0，移走的内容完好；
  - 上级被换成同名新条目 → `skipped/changed`，两边都不动；
  - 硬链接在条目外 → 不计（300 而不是 600）；两个链接名都在条目里 → 数据只计一次（300）；
  - 文件快照后变大 → 按删除时计（5000，大于 `bytes_before` 50）；变小 → 10；
  - 应用立刻重建同名文件（竞态）→ 失败 0、`partial`、重建的文件完好，释放 5003；
  - 名字含孤立代理项的目录 → 不进入、内容完好、不报 `deleted`，失败 2（跳过 1 个，残余无法统计再 1 个；契约只要求至少 1）。
- 第四波用例照跑，计数不变：G5 的 7 个、G1 的 12 个竞态与组合用例全过；十万个文件 15.5 秒（第四波 23 秒）。
- 深树：
  - [w5-h1-deep-unit.rs](../../../../scripts/acceptance/w5-h1-deep-unit.rs)：4000 层、256 KiB 栈，H1 上删除完成（25 秒）；第五波以前的源码进程崩溃，`STATUS_STACK_OVERFLOW`；
  - [w5-h1-controller-cases.rs](../../../../scripts/acceptance/w5-h1-controller-cases.rs) 的 `h1_deep_tree_residual_small_stack`：底部文件被占用，残余统计走完 4000 层，`partial`、失败 1、释放 3。

### 审查发现与补单

- **中级，要求修改**：快照里，名字不能无损转换的非重解析目录被当成叶子，不展开。整项的否决（非链接重解析点、`min_age_hours`、守卫与受保护身份）看不到它里面，条目里其它对象照删。
  - 总控用例 `h1_recent_content_in_unpaired_directory_vetoes` 复现：目录下 `sub\new.bin` 刚写入，条目最小年龄 1 小时；目录名普通时整项 `skipped/too_recent`，目录名含孤立代理项时 `ok.bin` 被删、`partial`。
  - 第五波以前的源码遇到这种目录整项 `changed`，什么都不删。CLEAN-M2 开头写明“链接与重解析点规则、守卫与保护路径一律不变”。
  - [补单 01](../../../dispatch/tickets/WATER-W5-H1-ADDENDUM-01-20261028.md)：整项跳过（A，推荐）或按原始名字展开（B），加目录的断言，三条负控重做。
- 低级（不要求改）：这种目录计 2 个失败；无效名字的忽略大小写查找只把十六进制转大写；父句柄改为裸指针传递（现在正确）。
- 另记：刚建好的深目录树，第一次 `execute` 常被跳过为 `changed`（两次预检的快照不一致，新目录的元数据还在落定），两秒后再跑就正常。第五波以前的源码在 200 层时一样，是原有行为，方向安全。

### 补单 01 验收

10-28 派给 sol（新对话），执行者自报 Codex GPT-6。实现提交 `ed138729`，交回 HEAD `77fac6c5`。

- 选的是 A：快照遇到名字不能无损转换的非重解析目录，返回 `changed`，整项跳过，什么都不删（`consider_entry` 目录分支，5 行）。文件与链接不变。
- 测试：`clean_handle_hardening` 里加了目录的情形（`CLEAN_UNPAIRED_NAME`）：整项 `skipped/changed`、释放 0、兄弟文件、那个目录与其中文件都完好。执行者先只加断言，在旧源码上红，修复后绿。执行者 nc2 改的正是新分支（改回当叶子）。
- 审计：没有问题，final 落在 `ed138729`，三条负控红绿成对。
- 验收树（快进到 `77fac6c5`）：`lock`、`check`、`test`、`check --final`、`test --final` 都通过；总控三条负控照旧全部抓到（nc3 深树也抓到）。另加 x1：把新检查整个绕开，结果“存活”，测试仍通过——绕开后这个目录会被压栈展开，用私有键打开必然失败，快照照样报 `changed`。这是第二道防线，记下。
- 总控用例：
  - `h1_recent_content_in_unpaired_directory_vetoes`：上一轮兄弟被删，现在整项 `skipped/changed`，什么都不删；
  - `h1_unpaired_directory_name` 与新加的 `h1_unpaired_directory_nested`（这种目录在两层以下）：快照都返回 `changed`，内容完好；
  - 其余新用例 8 个、第四波 G5 的 7 个与 G1 的 12 个、4000 层深树（删除与残余统计）都照旧通过；十万个文件 20.5 秒（与检查器同时在跑）。
- 同一个审查代理复核：修复覆盖顶层与嵌套、两次预检、所有整项否决；不再有“这种目录计 2 个失败”。剩下低级：新断言只测了顶层（总控用 `h1_unpaired_directory_nested` 补上）；快照之后才出现的这种目录在残余统计里按“残余未知”计 1；无效名字的忽略大小写查找。

## H2 服务收尾：VERIFIED

### 新树重跑与总控负控

`lock`、`check`、`test`、`check --final`、`test --final`、`real --final` 都通过。总控负控：

| 编号 | 变异 | 结果 |
|---|---|---|
| nc1 | 清理线程 panic 后不把进度置为空闲 | 抓到，`SERVICE_PANIC_IDLE` |
| nc2 | 已完成的扫描写盘失败时仍当作写好了 | 抓到，`SERVICE_SCAN_RECORD` |
| nc3 | 第一次：文字形式与规范形式改成“都包含才算” | 被旧标记 `SERVICE_CANONICAL_ROOT` 先抓到，检查器不认 |
| nc3 | 第二次：文字形式的比较方向反过来 | 抓到，`SERVICE_CUSTOM_ROOT` |

### 审查

- 清理安全：确认令牌在检查通过后立即作废、永不恢复；检查、作废、置忙在同一次加锁里，不会开始两次；`busy` 在每条退出路径上都回到空闲。
- 中级（都出在总控自己的契约，执行者照做，接受）：
  - 清理线程 panic 后 `clean_progress` 报空闲而不是 failed：SERVICE-M2 §5 写的是“clean_progress 为空闲”，与 SERVICE-HARDENING §2.3 不同，以 M2 为准。界面两种情况最后都进暂停。
  - 联接夹具在 `symlink_dir` 失败时用 `cmd /D /C mklink /J`：SERVICE-HARDENING §5 说测试不启动进程，但 SERVICE-M2 §5 要求联接夹具，标准库建不出联接；其它包的测试同样做法。
- 低级：`SERVICE_PANIC_IDLE` 的准备阶段断言与 `SERVICE_SCAN_RECORD` 的大部分断言在旧代码上也通过（进程内撤回那条能区分，总控 nc2 也抓到）；写盘失败时快照文件成孤儿。
- 内存先公布 `last` 再写盘的窗口：只读命令能短暂看到，能动手的命令都被 `busy` 挡住。

## H3 宿主打开清理：VERIFIED

### 新树重跑与总控负控

`lock`、`check`、`test`、`check --final`、`test --final` 都通过。总控负控：

| 编号 | 变异 | 结果 |
|---|---|---|
| nc1 | `take` 多留一个引用（`forget` 一份克隆），服务永不释放 | 抓到，`HOST_BACKEND_RELEASE` |
| nc2 | 关窗等待只等一次轮询，不等清理真正停下 | 抓到，`HOST_CLOSE_DURING_CLEAN` |
| nc3 | 生产配置把清理开关取反 | 抓到，`HOST_CLEAN_ENABLED` |

### 真窗口：夹具清理闭环

`native --final` 开 1 个窗口，选择框 0，9 步全过，墙钟 11.5 秒，退出码 0：
- 体检 → 只有夹具组可选 → 清理所选 → 确认“永久删除 3 MB” → 清理完成 → 清理记录；
- 夹具 3,145,815 字节删除，该项 `deleted`，失败 0；守卫文件与浏览器配置样本都还在；
- 存储里五类记录各 1 份，日志有 intent 与 result；
- 完成页截图：“3 MB 已释放”，预计 3 MB、实际 3 MB，“带缓存标记的目录 · 已清理”。

### 审查

- 释放顺序正确：`run_return` 之后先等停清理的线程，再取出并丢掉后端，再停激活线程，最后放实例锁；其它强引用都只指向槽，不指向服务。
- 关窗时正在清理：先挡住关闭，后台线程调一次 `clean_stop` 并等到不再清理，再关窗；等待中再次关窗只挡住，不重复停止；没有死锁。
- 信号文件只更新时间；`on_lock_result` 三种情况与 `run` 的接线；`\\?\` 去前缀后再规范化并核对，结尾带点、空格的目录被拒，不存在时检查与创建的是同一个目录。
- 中级（契约外，记下）：系统关机或重启管理器（`WM_ENDSESSION`）时 tao 直接 `exit(0)`，绕过关窗保护，正在进行的清理被中途杀掉，清理记录不写，日志只有 intent。不会删错东西。以后在 `RunEvent::Exit` 上也调 `stop_cleaning_and_wait`。
- 低级：`app_state` 出错时当成“没在清理”；`HOST_CLOSE_DURING_CLEAN` 的脚本后端不管有没有收到停止都会倒数到空闲；`\\?\` 那条新断言在比较之前就因规范化失败而报错；`run` 的释放顺序只靠审查；扫描中关窗时扫描线程仍持有服务核心直到进程退出（微秒级）。
- 真窗口还没试过“清理进行中关窗”与默认数据目录（检查器用 `WATER_DATA_DIR`）。

## H4 界面 M2：VERIFIED

### 新树重跑与总控负控

`check`、`test`、`browser`、`check --final`、`browser --final`、`test --final` 都通过。总控负控：

| 编号 | 变异 | 结果 |
|---|---|---|
| nc1 | `inScope` 恒为真 | 抓到，`UI_CLEAN_SCOPE` |
| nc2 | 重新连接时永远不重读 | 抓到，`UI_NOTICE_SCOPE` |
| nc3 | 离开页面不清掉停止失败的那行字 | 抓到，`UI_STOP_FEEDBACK` |

### 截图

看了 `browser --final` 的 stop-failed、confirm、history、paused、stale、done：
- stop-failed：红字在“停止扫描”下方，提示条只有暂停原因与“重新连接”；
- confirm：标题“永久删除 31.2 GB?”，写明“不进入回收站，无法恢复”，有分盘量；
- history：“清理完成”行是勾号，“体检记录”行是脉搏线，没有水滴；
- done：两个水位瓶与前后可用空间；
- paused：没有点过停止，停止按钮下没有说明；
- stale：提示条盖住正文里同一句的上半部分，与 G7 验收时的截图相同，不是本票带来的（记下）。

### 审查

- 删除流程安全：迟到的 `clean_prepare` 不开确认框；命令进行中选择与结果不能变；双击与旧计划都挡住。
- 中级（测试）：第 2、3 个测试开头仍有无标记的 10 秒等待，第 1 个测试回归时会连锁超时，总控负控会被检查器拒收。条文本身满足。
- 低级：重新连接只重读当前页；重读发生在点按钮时；`loadRoute(true)` 会丢掉正在进行的普通读取；“回去又回来”与清理页的停止没有测试。
- 说明：确认后到 `clean_start` 返回之间若切页，不再跳回体检页，删除照常进行。符合票的第 1 条，记下以后定。

## H5 Rust 构建目录规则：VERIFIED

- `lock`、`check`、`test`、`check --final`、`real --final`、`test --final` 都通过。
- 总控负控：第一次只改规则数据（标记文件名），检查器拒收“A negative control needs an uncommitted change under packages/junk-rules/src”；票上写“只改规则数据或生产代码”，是票面疏漏。改为 `src/plan.rs` 把 marker 深度截到 8 → 抓到，`RULES_RUST_BUILD`。
- 总控读完整差异：新规则字段、顺序、来源与 RULES-M2 一致；三处获准改动的旧断言与补单 01 一致；数据版本 `2026-10-27.1`；`rules_version` 不变。

## 记下、不挡合入的

- H3：系统关机时的清理保护；`app_state` 出错放行关窗；三处测试缺口（见 H3 一节）。
- H4：第 2、3 个测试开头的无标记等待；重读的时机与范围；切页后不跳回体检页；stale 截图的提示条重叠。
- H2：两处断言区分力弱；孤儿快照文件。
- 票面：负控只能改 `src`（H5）；以后的执行者规则写明提交身份用执行者自己的名字（H3、H4 借用了仓库已有的人类身份 Riku Toto，只在命令进程里设，没有改配置）。
- `execute` 对刚建好的深目录树第一次常报 `changed`（原有行为）。
- H1：无效名字的忽略大小写查找不折叠十六进制键；快照之后才出现的这种目录按“残余未知”计 1；帧之间以裸指针传父句柄（现在正确）。

## 下一步

1. 第三次主线整合检查（含夹具清理闭环，开窗先告诉用户）→ 新 release 版 → 自清理（用户按按钮）→ M2 达成。
