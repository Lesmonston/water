# WATER-W10-M2 补单 02：`.git` 内不出条目、预算问题归属、簇不进条目内部（中门）

2026-11-06，总控（Claude）。M2 补单 01 已交回（回执提交 `68f90263`，实现 `337f41ac`）。补单 01 的五条都做到了：审计 0 问题，新树重跑 lock、check、real 三个 final 通过，总控变异八条抓住六条（含上一轮漏掉的 FNV 乘数）。但独立审查查出**一处高危**：新的单次遍历会在 `.git` 里面产生可清条目，而旧代码从不这样。另有两处与 SPEC 不符、一处问题重复记数、两处测试偏弱。这不是你的受阻，是验收不通过、要续做。可以新开对话执行。开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M2-SCAN-20261105.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/m35-v1/SCAN-M35.md`（全文），以及仍然有效的 `contracts/checkup-v1/SCAN.md` 第 3 节、`contracts/m3c-v1/SCAN-M3C.md` 第 3 节；
4. 补单 01 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M2-ADDENDUM-01-20261105.md`（仍然有效）；
5. 本补单（与原票、规则、SPEC 或补单 01 冲突时以本补单为准）；
6. 你的回执 `F:/new/smaltalk/water/.worktrees/w10-m2/docs/dispatch/reports/WATER-W10-M2-REPORT.md`。

行号按 `337f41ac`。

**耗时不用再管**：总控在同一台机器、同一份计划上热缓存交替跑了旧（`f50da264`）新（`337f41ac`）各两次：普通扫描 18.4/18.8 秒对 18.1/17.7 秒，三开关 33.0/33.4 秒对 19.5/15.8 秒，概览 27.1/30.6 秒对 30.1/29.3 秒。没有变慢，你回执里的变慢是冷缓存与并行负载造成的。本补单不要求性能改动，也不要为性能重写遍历。

## 1. `.git` 里面永远不出条目（高危，必须改）

`src/scan/streaming.rs` 约第 426～433 行决定某个目录是否启用某个 pattern 目标时，没有排除路径段里的 `.git`；marker（约第 412 行）和 `file_name`（约第 698 行）都排除了。而只要有测量没做完（约第 765～775 行 `!measuring.is_empty()`），遍历就会进入 `.git` 目录。于是中间段是 `*` 的 pattern 会在 `.git` 里启用，`.git` 的子项成为命中。例：`C:\Windows\Temp` 既是 discovery root，又是 `claude\*\*` 的 base；测量 discovery 子项 `Temp\claude` 时进入 `Temp\claude\.git`，`[claude, .git]` 与 `[claude, *]` 相符，`.git\objects`、`.git\refs` 等就成了确认级的可清条目。旧代码的 `walk_pattern` 每一层都跳过 `.git`，从不会这样；SPEC 第 6.6 节也写明 `*` 不会匹配到 `.git`。

改为：
- 遍历因为测量而进入名为 `.git`（不分大小写）的目录或它的任何后代时，那里**只做测量**，不启用任何目标的搜索：pattern、marker、`file_name`、discovery、簇候选、项目声明都不在那里找。做法自定，但要覆盖全部目标种类，不能只补 pattern 一处。
- 测量本身照旧（`.git` 在某个条目之内时，它的字节仍计入该条目，这一点不变）。
- `SCAN_M35_CLUSTERS` 或原票指定的五个测试之一里加一例：一个 discovery root 同时是一个三段 pattern（中间段 `*`）的 base，discovery 子项里有 `.git`，`.git` 下有若干目录与文件；结果里**没有任何**路径含 `\.git\` 的条目，也没有路径以 `\.git` 结尾的条目。再加一例：pattern 的第一段就是 `*`、base 下有 `.git` 目录且外层有测量在进行，同样不出条目。把 1～2 行的排除去掉时，这些例子必须失败。

## 2. 预算用完时，问题记到每个没做完的组（SPEC 第 6.4 节）

`streaming.rs` 约第 552～558 行停下时只在第一个（最外层）正在测量的命中的归属组上记 `budget_exhausted`。在 discovery 子项里测量一个 pattern 命中时预算用完，问题记到了 discovery 组（那个条目本来会因被覆盖而丢掉），pattern 组的条目没了却没有问题。旧引擎会在每个没做完的组上都记。改为停下的那一刻：
- 每个**正在测量**的命中，按第 6.4 节在它**最终归属**的组上记 `budget_exhausted`（同一组只记一次）；
- 每个**搜索还没做完**的目标（包括还没走到它的 root 的），在它自己的组上记 `budget_exhausted`，与旧引擎逐个目标停下时一致；
- 已经完整做完、条目已出的组不记。

`SCAN_M35_CLUSTERS` 或原票的预算测试里加一例：预算在测量 discovery 子项里的一个 pattern 命中时用完，pattern 组带 `budget_exhausted`。

## 3. 簇不长在条目里面（SPEC 第 5.2 节）

第 5.2 节：测量一个命中时，任何目标都不再在它里面搜索，它里面不会再出现别的条目。现在 `blocked`（约第 560～575 行）只看 marker 命中，在 pattern 命中与 discovery 条目里面仍会找簇候选（这一条 `f50da264` 就有）。结果是簇成员落在另一个条目里面，字节算两遍。改为：
- 最终成簇的父目录，若等于或位于任何一个最终条目（任何目标的命中，含 discovery 条目与兜底命中）之内，这个簇不成立，不出现在 `groups`、`clusters` 里，它的候选不产生问题。用遍历时不搜索或最后剔除都可以。
- **项目声明不在此列**：声明照补单 01 第 2 条的意思保留，现在找到的照旧交给服务，不必因为位于条目内而删，也不要求在 marker 命中里新增搜索。
- `SCAN_M35_CLUSTERS` 加一例：自选位置里有一个 pattern 命中（或 discovery 条目）目录，里面有 10 个以上同模板的子目录；结果里没有这个簇，那个命中照常是一个条目。

## 4. 两处测试偏弱（总控变异漏掉）

- **c5 漏掉**：把 `hash_extra` 的扩展名比较改成“有扩展名就收”，五测仍全过。你加的无扩展名例子用的是 `blob_notes.md`，它的前缀本来就和模板 `blob_a…` 对不上，碰不到扩展名比较。补一例：无扩展名的 `<h>` 模板，同一层有一个**前缀相同**（能被模板的通配部分匹配）但带扩展名的文件，它不进簇；有扩展名的模板同理放一个前缀相同、扩展名不同的文件。
- **c7 漏掉**：去掉 `scan.rs` 约第 1333～1336 行簇候选循环里的 `emit` 与取消检查，五测仍全过（取消在别处先被查到）。补一例或改造现有例子，使取消恰好发生在 `build_clusters` 的候选循环里，去掉这一处检查时测试失败。

## 5. discovery 处簇成员的问题只记一次

discovery root 的子项成为簇成员时，它测量时的问题先在延后的 discovery 收尾里记到 discovery 组（约第 153～155 行，经第 874～882 行），`build_clusters` 又在 `scan.rs` 约第 1481～1484 行记到 `leak:` 组，记了两遍。按第 5.2、6.4 节，只记在它最终归属的 `leak:` 组。加一例核对计数。

## 不要求（记入总控遗留，不在本单做）

- discovery 子项在知道是否被覆盖之前就先测量（约第 712～727 行），被覆盖时多列了它的子树；
- 取消或预算停下时，已经测量完的 discovery 条目一并丢掉（约第 863～865 行）；
- `row.issues` 按条累积而不是计数；`potential_children` 逐字符分配；单纯测量的目录也走完整搜索步骤带来的 CPU 开销。

如果你在改第 1～3 条时顺手改了其中某条，回执里写明；不改也可以。

## 其余

- 全部照原票、SPEC 与补单 01：精确的测试名单（五测）、三条负控照旧；**原有断言一处不改**（补单 01 新加的断言也不改，只能新增）。提交干净实现后重新做三条红绿与三个 final。
- **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w10-m2`（分支 `worker/water-w10-m2`），从 `68f90263` 续做。已提交的回执与证据保留，不改写，只在其后新增提交。

## 命令（在工作树根目录执行）

照原票：反复用 `lock`、`check`、`test`、`real`，做完三条负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M2 --mode test
```

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W10-M2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m2/docs/dispatch/reports/WATER-W10-M2-REPORT.md
```

原有各节保留，新增“补单 02”一节，写：实际模型、续做起点、实现提交 SHA；本补单五条逐条（第 1 条写清是怎样让 `.git` 内不启用任何搜索的）；新增的测试例；每个检查命令与结果；三条负控与恢复后的哈希；真实冒烟结果；没做或没验证的事。

受阻则写“WATER-W10-M2 任务受阻”，写清冲突与最小补充需求，不要自行变通。

**本单是 A 组的第二张**，在 WATER-W10-M1 补单 04 交回之后做。
