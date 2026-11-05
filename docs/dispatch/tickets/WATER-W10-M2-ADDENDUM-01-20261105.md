# WATER-W10-M2 补单 01：簇成员、项目声明、名字命中、扫描开销（中门）

2026-11-05，总控（Claude）。M2 已交回完成（回执提交 `f50da264`），总控验收时复跑通过，但独立审查查出三处与 SCAN-M35 不符、一处契约空白，以及整盘扫描时的开销问题。这不是你的受阻，是验收不通过、要续做。可以新开对话执行。开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M2-SCAN-20261105.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/m35-v1/SCAN-M35.md`（全文）；
4. 本补单（与原票、规则或 SPEC 冲突时以本补单为准）；
5. 你的回执 `F:/new/smaltalk/water/.worktrees/w10-m2/docs/dispatch/reports/WATER-W10-M2-REPORT.md`。

行号按你交回的 `f50da264`。

## 1. `<h>` 文件簇只收同扩展名的文件（SPEC 第 5.2 节）

`scan.rs` 约第 1930 行用 `{prefix}*{extension}` 做通配：模板没有扩展名时就成了 `prefix*`，会把 `blob_notes.md` 这种别的扩展名的文件也收成成员。改为：额外成员的扩展名必须与模板的扩展名**完全相同**（不分大小写）；模板没有扩展名时，只收同样没有扩展名的文件。`SCAN_M35_CLUSTERS` 加两例：模板有扩展名时，别的扩展名不收；模板没有扩展名时，带扩展名的不收。

## 2. 项目声明不因成簇而丢（SPEC 第 7.3 节与 ADR-019 的空白）

`scan.rs` 约第 2025 行把簇成员里面的 `.water-cleanup.json` 从 `declarations` 里删掉了。按 SPEC 第 5.2 节“测量它时不再在它里面搜索”，这样做有字面依据，但 ADR-019 要求项目声明永远生效：一个声明了“这些不能碰”的项目，不能因为恰好和九个兄弟目录名字像就被整块判成泄漏。改为：
- 一个目录候选，自己的清单里直接有名为 `.water-cleanup.json` 的普通文件（不是重解析点）时，**不算候选**，不计入 S1；
- 已经找到的声明路径（第 7.3 节的深度与 256 个上限照旧）**不再因为位于簇成员之内而删掉**，原样交给服务；
- `SCAN_M35_CLUSTERS` 加一例：10 个同模板目录里有一个带 `.water-cleanup.json`，那一个不进簇（剩 9 个时整簇不成立），它的声明出现在 `declarations` 里。

## 3. 只命中名字、条件不成立的目录仍要搜索（SPEC 第 5.2、7.3 节）

`scan.rs` 约第 1120 行用 `measuring.is_empty()` 判断，把“名字命中 marker 但条件不成立、也没有兜底”的目录也当成“正在测量”，于是它里面不再找簇、不再找声明。这种目录不是命中，按 SPEC 应当照常**搜索**。改为：只有真正成为命中（或兜底命中）的目录才算正在测量。`SCAN_M35_CLUSTERS` 加一例：名字命中但条件不成立的目录里有 12 个同模板子目录，成簇；同一目录里深度允许范围内的 `.water-cleanup.json` 进 `declarations`。

## 4. 扫描开销：不随条目总数无界增长

这次新加的清单缓存（约第 263 行）把每个目录的清单保留到扫描结束，`cached_child`（约第 267 行）每次按父目录清单线性查找，簇候选比对（约第 1873、1891 行）对每个子项和每个命中两两比较且循环里不查取消与预算。在整盘位置（上百万条目）上会占大量内存、出现平方级耗时。改为：
- `cached_child` 按名字索引查找（不分大小写），不再线性扫；
- 簇候选比对的循环里检查取消与预算，与其它遍历一致；
- 清单缓存只保留还要用的：当前路径上的目录、以及还没做完成簇判断的搜索目录；做完就释放。内存应当与路径深度和待判断目录数相关，而不是与扫描过的条目总数相关；
- `SCAN_M35_CLUSTERS` 或现有的取消测试里加一例：在一个有大量候选的目录做成簇判断时取消，扫描以 `cancelled` 结束、不留下这个簇；
- 回执里写清缓存何时放入、何时释放，以及真实冒烟前后的耗时对比。

## 5. 两处小的

- 因预算用完而放弃的簇，不要留下挂在一个不出现在 `groups` 里的 `leak:` 组上的 `budget_exhausted` 问题：改挂到该父目录所属的位置组（自选位置的 marker 组或 discovery 组）。
- `SCAN_M35_CLUSTERS` 加一条独立核对：在测试里按 SPEC 的写法（父路径转小写、换行、种类、换行、模板，FNV-1a 64 位）算出一个簇的 `group_id`，与结果逐字相同，前缀是 `leak:`。

## 其余

- 全部照原票与 SPEC：精确的测试名单、三条负控照旧；原有断言一处不改。提交干净实现后重新做三条红绿与三个 final。
- **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w10-m2`（分支 `worker/water-w10-m2`），从 `f50da264` 续做。已提交的回执与证据保留，不改写，只在其后新增提交。

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

原有各节保留，新增“补单 01”一节，写：实际模型、续做起点、实现提交 SHA；本补单五条逐条；新增的测试例；每个检查命令与结果；三条负控与恢复后的哈希；真实冒烟结果与耗时；没做或没验证的事。

受阻则写“WATER-W10-M2 任务受阻”，写清冲突与最小补充需求，不要自行变通。

**本单是 A 组的第二张**，在 WATER-W10-M1 补单 03 交回之后做。
