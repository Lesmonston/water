# 第五波收单验收进度（2026-10-28 凌晨，未完）

总控（Claude）。用户 10-28 约 00:40 转告“外部任务都做完了”，约 01:00 说“记录一下状态，今天就到这儿”。本页记下做到哪一步、查到什么、明天从哪里接着做。**没有合入任何一票。**

## 0. 一句话

- 五张回执都是“已完成”，五份审计都干净。
- H1、H4、H5 的验收树检查全部通过，总控负控全部杀死；H2、H3 的验收树检查还没跑。
- 四份独立审查（H1～H4）都没有阻断级问题。
- **H1 要出补单 01**：名字不是合法 UTF-16 的目录在快照里不展开，整项的安全否决（重解析点、太新、受保护身份）看不到它里面，于是同一条目的其它文件会被删掉；原来的代码遇到这种目录会整项跳过。见第 4.1 节。
- H2～H5 可以合入（H2、H3 先跑完验收树检查，H4 先看截图）。

## 1. 回执

| 单号 | 执行者自报 | 实现提交 | 交回 HEAD | 备注 |
|---|---|---|---|---|
| WATER-W5-H1 | Codex GPT-6（接手原 Cursor 对话的未提交改动） | `0dc44d458bffc0b4e8bfbae929d9fe7e8585a276` | `9f49e8b9215f4fab0fb555314d356b40f4676ad1` | 作者 `Codex <codex@local.invalid>`（进程内环境变量） |
| WATER-W5-H2 | Cursor Grok 4.6 | `17cab09cdd744a893edff2c495a378a81e0a380c` | `5fcbe2a3fd834646e08fb29a88ee6e8e18c6aef0` | 第一次 `test --final` 因 50 ms 预算超时失败，原样重跑通过 |
| WATER-W5-H3 | Grok 4.7 | `19d32a33bb6d79085230a9e989f211065760c644` | `06662d68c4d9191e4baf52094f10523d5e6caad2` | 提交作者借用了仓库已有的人类身份 Riku Toto（进程内环境变量，未改配置） |
| WATER-W5-H4 | Claude Opus 5.5 | `8ec13f1e093ed89d5acc42c530a5b9c2eae5a61a` | `e91a8ddf5ffb20458fb9051566974cf26cf8c3da` | 同上，借用 Riku Toto 身份 |
| WATER-W5-H5 | Codex GPT-6（用户安排为 sol） | `1e3fc3b6b399d503abe0b7478a551fbf0ed011d5` | `c8dca495e74461d97c4509476cb017dd8f791e2e` | 补单 01 续做；作者 `Codex <codex@localhost>` |

五棵树都以 `3f907897` 为祖先，没有改写历史。

**审计**（`WATER_W2_AUDIT_MANIFEST=docs/dispatch/wave5/manifest.json node scripts/acceptance/w2-receipt-audit.mjs WATER-W5-H*`）：五份都退出 0，`problems` 为空，`unlisted` 为空，final 都落在实现提交上，负控都配好了恢复后的绿。

## 2. 验收工具与树

- 工具 `.local/w5-accept/`（`.local` 不进仓库；脚本副本在 [accept-kit](accept-kit/)，日志只在 `.local`）：
  - `make-manifest.mjs`：生成 `manifest.json`，任务名 `WATER-W5-ACCEPT-H*`，证据目录 `docs/acceptance/wave5/controller/accept-20261028/<slot>/`；
  - `run.sh <slot> <mode>…`：H2、H3 走桌面检查器，H1、H4、H5 走 checkup；
  - `controls.mjs <slot>`：总控负控（变异 → 红 → 原字节恢复 → 绿），最后 `test --final`；
  - `mutations.json`：每票三条（H5 一条），位置都与执行者的不同；
  - `h1-unit.sh`、`h1-cases.sh`、`h1-deep-old.sh`：H1 的总控用例；
  - `logs/`：每次运行的一行结果与用例日志。
- 验收树 `.worktrees/accept-w5-h1`～`h5`（分支 `controller/accept-w5-h*`，在各自交回 HEAD 上），另有 `.worktrees/accept-w5-h1-cases`（分离 HEAD，同 H1，专跑总控用例，私有 Cargo 目录从 `.offline-cache/core` 复制）。记录时全部干净。
- 总控用例源码进了仓库：`scripts/acceptance/w5-h1-controller-unit.rs`（9 个）、`scripts/acceptance/w5-h1-deep-unit.rs`（深树）。

## 3. 已跑的结果

### 3.1 H1 清理执行器

- 验收树：`lock`、`check`、`test`、`check --final` 通过；总控负控三条都杀死，`test --final` 通过（proofAudit 认总控的三条）：
  - nc1 `CLEAN_FREED_EXACT`：`FileStandardInfo` 读出的链接数换成 1；
  - nc2 `CLEAN_UNPAIRED_NAME`：无效名字的私有键改成有损转换，两个不同的孤立代理名撞键；
  - nc3 `CLEAN_DEEP_TREE`：快照遍历超过 1024 层不再展开。
- 总控新用例（`w5-h1-controller-unit.rs`，先快照、再改磁盘、再删除）：H1 上 9 个全过；在第五波以前的源码上 8 个失败（“上级被换成同名新条目”一项原来就安全）：
  - 上级、祖父目录在删除前被移走 → `skipped/gone`，释放 0，失败 0，移走的内容完好；
  - 上级被换成同名新条目 → `skipped/changed`，两边都不动；
  - 硬链接在条目外 → 只计另外两个文件（300）；两个链接名都在条目里 → 数据只计一次（300）；
  - 文件在快照后变大 → 按删除时的大小计（5000，大于 `bytes_before` 50）；变小 → 10；
  - 重建同名（竞态）：`aaa\f00000.bin` 被删后立刻重建，`aaa` 删不掉 → 失败 0，`partial`，重建的文件完好，释放 5003；
  - 名字含孤立代理项的目录 → 不进入、内容完好、不报 `deleted`；H1 报 2 个失败（跳过时 1 个，残余无法统计时再 1 个），契约只要求至少 1。
- 第四波总控用例照跑，计数不变：G5 的 7 个全过；G1 的 12 个竞态与组合用例全过；十万个文件删除用时 15.5 秒（第四波 23 秒），没有变慢。
- 深树（`w5-h1-deep-unit.rs`）：4000 层、256 KiB 栈，H1 上删除完成，释放 4，用时 25 秒；第五波以前的递归源码进程直接崩溃，`STATUS_STACK_OVERFLOW`（0xc00000fd）。

### 3.2 H4 界面

- 验收树：`check`、`test`、`browser`、`check --final`、`browser --final` 通过；总控负控三条都杀死，`test --final` 通过：
  - nc1 `UI_CLEAN_SCOPE`：`inScope` 恒为真；
  - nc2 `UI_NOTICE_SCOPE`：重新连接时永远不重读；
  - nc3 `UI_STOP_FEEDBACK`：离开页面不清掉停止失败的那行字。
- **还没看截图**（`browser --final` 的 20 张在验收树 `.local/checks/WATER-W5-ACCEPT-H4/` 下）。

### 3.3 H5 规则

- 验收树：`lock`、`check`、`test`、`check --final`、`real --final` 通过。
- 总控负控：第一次改规则数据（标记文件名）被检查器拒收：“A negative control needs an uncommitted change under packages/junk-rules/src”。票上写“只改规则数据或生产代码里一处”，与检查器不一致，是总控票面的疏漏。改为 `src/plan.rs` 把 marker 深度截到 8 → 杀死，`test --final` 通过。
- 总控已读完整差异：新规则字段、顺序、来源与 RULES-M2 一致；三处获准改动的旧断言与补单 01 一致；数据版本 `2026-10-27.1`。

### 3.4 H2、H3

只做了审计与独立审查，验收树检查还没跑。

## 4. 独立审查（只读代理，只给代码、契约与票）

### 4.1 H1：一条中级，要出补单

- **中级**：快照里，名字不能无损转换的非重解析目录被当成叶子，不展开（`native_windows.rs` 约 818～828 行，目录分支返回 `Ok(raw.name_ok)`）。
  - 后果：整项的否决看不到它里面——非链接重解析点（整项 reparse）、`min_age_hours` 的“太新”、守卫与受保护身份。条目里其它文件照删，这个目录只计 1 个失败。
  - 原来的代码打开有损名字得到错误 2，整项 `changed`，什么都不删。CLEAN-M2 开头写明“链接与重解析点规则、守卫与保护路径一律不变”，§5 没有允许快照不完整。
  - 它里面的东西本身不会被打开或删除；坏处是本该整项否决时删了它的兄弟。
  - 总控用例已旁证：这种目录里的文件不进 `bytes_before`（报 4 of 4），兄弟文件被删。
- 低级：
  - 这种目录计 2 个失败（见 3.1）；
  - 无效名字的忽略大小写查找只把十六进制转大写，改名只差大小写的竞态里会漏计失败（不会多删）；
  - `CLEAN_DEEP_TREE` 只走到删除，没走到残余统计的循环（总控可另加“深树底部文件被占用”的用例补上）；
  - `CLEAN_UNPAIRED_NAME` 只测了文件；
  - 父句柄改为裸指针传递，现在正确，以后改动要小心。
- 其余逐条核对通过：三处都不递归，按句柄相对打开的父句柄正确，停止检查点与先子后父的顺序不变，§2～§5 的做法都在代码里。

### 4.2 H2：无阻断，可合入

- 中级（都出在总控自己的契约）：
  - 清理线程 panic 后 `clean_progress` 报空闲而不是 failed：SERVICE-M2 §5 的 `SERVICE_PANIC_IDLE` 一行要求“clean_progress 为空闲”，执行者照做；与仍有效的 SERVICE-HARDENING §2.3（state 为 failed）不一致，以 M2 为准。界面两种情况最后都进暂停，安全不受影响。
  - 新测试夹具在 `symlink_dir` 失败时用 `cmd /D /C mklink /J` 建联接：SERVICE-HARDENING §5 说测试不启动进程，但 SERVICE-M2 §5 要求联接夹具，标准库建不出联接；其它包的测试也这样做。
- 低级：`SERVICE_PANIC_IDLE` 的“准备阶段失败”与 `SERVICE_SCAN_RECORD` 的大部分断言在旧代码上也通过（只有进程内撤回那条能区分）；写盘失败时快照文件成孤儿；`plan` 解析失败存 `null` 不可达。
- 内存先公布 `last`、再写盘的窗口：只读命令能短暂看到，任何能动手的命令都被 `busy` 挡住，`clean_prepare` 用不到这份扫描。

### 4.3 H3：无阻断，可合入

- 中级（契约外）：系统关机或重启管理器（`WM_ENDSESSION`）时 tao 直接 `exit(0)`，绕过关窗保护；正在进行的清理被中途杀掉，清理记录不写，日志只有 intent。不会删错东西。留到以后：在 `RunEvent::Exit` 上也调 `stop_cleaning_and_wait`。
- 低级：
  - `app_state` 出错时当成“没在清理”（放行关窗）；
  - `HOST_CLOSE_DURING_CLEAN` 的脚本后端不管有没有收到 `clean_stop` 都会倒数到空闲，“先等完再停止”的错误实现也能通过；
  - `\\?\` 那条新断言在比较之前就因规范化失败而报错，删掉比较也能通过；
  - `run` 里的释放顺序只靠审查（审查确认顺序正确）；
  - 扫描进行中关窗时扫描线程仍持有服务核心，直到进程退出（微秒级）。
- 释放顺序、关窗时先停清理再关、信号文件只更新时间、`on_lock_result`、`\\?\` 去前缀后再核对，都核对通过。
- 真窗口还没试过“清理进行中关窗”和默认数据目录。

### 4.4 H4：无阻断，可合入

- 删除流程：迟到的 `clean_prepare` 不开确认框；选择、结果在命令进行中不能变；双击、停留旧计划都挡住了。
- 中级（测试）：第 2、3 个测试开头仍有无标记的 10 秒等待（`pageIs`），第 1 个测试的“正在重新连接”一旦回归，后两个测试会连锁超时，总控负控会被检查器拒收。条文本身满足。
- 低级：重新连接只重读“当前页”，在别的页按重新连接后回到清理记录，展开的详情仍停在“正在读取详情…”；重读发生在点按钮时而不是恢复成功时；`loadRoute(true)` 会丢掉正在进行的普通读取结果；“回去又回来”和清理页的“停止”没有测试。
- 说明：确认后到 `clean_start` 返回之间若切页，不再跳回体检页，删除照常进行（`busy` 为 cleaning，关窗保护有效）。这符合票的第 1 条，但与 UI.md 的“清理中 → 完成页”流程不同，记下由总控以后定。

## 5. 明天接着做

1. **H1 补单 01**（写好再给用户派单句）：
   - 快照遇到名字不能无损转换的非重解析目录：整项 `skipped`，原因 `changed`，什么都不删（与原来的行为相同）。也可以按原始 UTF-16 名字相对打开、照常展开与复核；两者选一，回执写清。
   - `CLEAN_UNPAIRED_NAME` 里加目录的断言：条目里有这种目录时，兄弟文件不删，整项 `skipped`。
   - 三条负控按新源码重做，两个 final 与 archive 重跑。
   - 总控先在 `w5-h1-controller-unit.rs` 加一个用例旁证：这种目录里藏一个“太新”的文件，H1 上兄弟被删（应整项跳过）；补单后用它验收。另加“深树底部文件被占用”的残余统计用例。
2. **H2**：`run.sh h2 lock check test` → `controls.mjs h2` → `run.sh h2 check:final real:final`。50 ms 预算在机器忙时会偶发失败，H2 单独跑。
3. **H3**：`run.sh h3 lock check test` → `controls.mjs h3` → `run.sh h3 check:final`，然后 `native:final`（**开 1 个窗口，先告诉用户**）。
4. **H4**：看 20 张截图，重点 `stop-failed`、`confirm`、`stale`、`paused`、`reconnecting`、`history`。
5. 合入 H5、H4、H2、H3（`--no-ff`），证据复制进 `docs/acceptance/wave5/controller/accept-20261028/<slot>/`（`*.log` 用 `git add -f`），清单写 `controllerReview`，更新 STATUS。
6. H1 补单回来后验收合入，然后第三次主线整合检查 → 新 release 版 → 自清理（用户按按钮）→ M2 达成。

## 6. 记下、不挡合入的

- H3：关机时的清理保护；`app_state` 出错放行关窗；三处测试缺口。
- H4：第 2、3 个测试开头的无标记等待；重读的时机与范围；切页后不跳回体检页的流程取舍。
- H2：两处断言区分力弱；孤儿快照文件。
- H5 票面：负控只能改 `src`，以后票面写准。
- 执行者提交身份：H3、H4 借用了仓库已有的人类身份 Riku Toto；以后的执行者规则写明用自己的身份（只在命令进程里设），不借用人类身份。
