# WATER-W4-G1 补单 02：删除时的停止判断与结果报告（重门）

2026-10-27，总控（Claude）。依据 [G1 收单验收](../../acceptance/wave4/controller/WATER-W4-G1-REVIEW-20261027.md)的“第二轮”一节。**这是删除路径上的特殊票，可以新开对话执行。** 新执行者开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W4-G1-CLEAN-HARDENING-20261026.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W4-HARDENING-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/hardening-v1/CLEAN-HARDENING.md`（全文）与原契约 `F:/new/smaltalk/water/contracts/checkup-v1/CLEAN.md`；
4. 补单 01 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W4-G1-ADDENDUM-01-20261027.md`；
5. 本补单（与前面冲突时以本补单为准）；
6. 上一轮回执 `F:/new/smaltalk/water/.worktrees/w4-g1/docs/dispatch/reports/WATER-W4-G1-REPORT.md` 与上面的验收报告。

## 验收结果

补单 01 的 11 条大部分已经做到，下面这些通过，不要改：
- 机械检查、两个 final、三条负控、总控负控；
- 链接删除前从链接自己的句柄复核属性、名称代理位与 FileId（第 1 条）；
- 身份从走到条目的句柄比对（第 2 条）；
- 枚举只认错误 18 为结束，残余未知绝不报 `deleted`（第 3 条）；
- 快照二分查找（第 7 条）：十万个文件的条目删除用时 23 秒；
- 名字长度、时间换算、unsafe 边界、祖先身份（第 8～11 条）；
- 三项新断言。

总控另用“删除进行中替换对象”的竞态用例在真实磁盘上验证：链接被就地改成非链接标签、子目录被换成另一个目录、文件被替换、快照后新出现的文件，以及非 ASCII 大小写不同的残余统计，都符合要求。

要改的是下面 4 条，加 2 处小修，**全部在 `packages/junk-clean/src/native_windows.rs`**。

## 要改的

### 1. 计划里的目录被替换，按快照判断是否停止（中级）

SPEC 第 4 节第 7 步说的是“确认它**仍是**非重解析目录，且 FileId 等于快照里的那一项，否则本项停止继续删除”。判断依据是**快照里这一项是什么**，不是现在磁盘上的对象是什么。

- 现在删除时枚举父目录，遇到名字在快照里、但 FileId 不同的子项，用的是**当前对象**的属性（`kid.attr`）决定是否停止。
- 后果：快照里是目录、删除时已被换成文件或链接，现在只计 1 个失败，然后继续删它后面的兄弟项。总控用例已在真实磁盘上复现：目录 `zzz\mmm` 被换成同名文件后，排在它后面的 `zzz\nnn.bin` 仍被删除。
- 改为：名字在快照里、对象变了（FileId 不同，或类型、重解析状态与快照不符）时，按**快照项**判断：
  - 快照项是非重解析目录 → 计 1 个 failed_entries，**停止本项**。替换进来的不论是目录、文件、链接还是其它重解析点，都一样处理。
  - 快照项是文件或链接 → 不删，计 1 个 failed_entries，继续下一个。
- `node()` 里打开后从句柄复核的那一段已经按快照项（`exp_attr`）判断，保持不变。

### 2. 目录残余从核对过 FileId 的句柄统计（低级）

- 现在第 8 步先用一个句柄核对 FileId，再**按名字重新打开**一个可枚举的句柄求和，第二个句柄的 FileId 没有核对。两次打开之间条目若被改名、换成同名空目录，残余会算成 0。
- 改为：求和用的句柄必须核对过 FileId。可以直接用可枚举的访问方式打开一次，也可以在第二个句柄上再核对一次 FileId。
  - 第二个句柄 FileId 不同，按第 4 条处理。
  - 第二个句柄返回错误 2 或 3，按第 4 条处理。

### 3. 空目录删不掉要计失败（低级）

- 补单 01 第 6 条：目录设删除标记失败后再枚举一次，**剩下的全是**快照之后才出现的项时才不计失败。
- 现在剩下为空时也算“全是”，不计失败。空目录删不掉（例如系统拒绝）时，failed_entries 可能是 0。
- 改为：剩下至少一项、而且全部是快照之后才出现的，才不计失败；剩下为空或再枚举失败，计 1 个 failed_entries。

### 4. 条目本身被替换时不报 `deleted`（低级，修正补单 01 第 4 条）

补单 01 第 4 条写的是“FileId 不等于快照里条目本身 → 原条目已不在，残余 0”。这条有漏洞，以本条为准。

- **漏洞**：快照之后、删除开始之前，若条目整个被改名移走、原名下放了一个新目录，那么：
  - 删除时第一次打开就发现 FileId 不同，停止本项，什么都没删；
  - 统计残余时 FileId 不同，残余算 0，结果报 `deleted`，`bytes_freed` 等于 `bytes_before`。
  - 实际上一个字节都没释放，原来的数据还在别的名字下面。
- **改为**：残余统计时 FileId 不等于快照里的条目本身：
  - 本次运行**成功给条目本身设置了删除标记** → 原条目确已删除，残余 0；
  - 否则 → 残余按 `bytes_before` 计，不报 `deleted`。不额外计 failed_entries（删除时已为这次停止计过 1 个）。
- 做法不限，例如在删除上下文里记一个“条目本身已设删除标记”的标志。
- 第 2 条里第二个句柄 FileId 不同或返回 2、3 时，也按本条处理。

### 5. 两处小修

- `nt_open` 拒绝**空名字**，与超过 255 单元一样返回错误。长度为 0 时打开的是父目录本身。
- 枚举里把名字切成 `u16` 切片的那段 SAFETY 说明，补上对齐依据：`off` 总是 8 的倍数，88 是偶数。

## 测试

- 仍是精确 6 个测试，原有名字与已有断言不变。**本补单不要求新增断言。**
- 第 1～4 条都只在删除进行中被并发替换时才走到，不要为此在生产代码里加测试开关。
- 总控会用自己的竞态用例验收：在条目里放一个有几千个文件的目录先删，删除开始后由另一个线程替换后面的对象。用例在主检出的 `scripts/acceptance/w4-g1-controller-cases.rs`，你可以读，但**不要**把它加进本树的 `Cargo.toml` 或测试目录。

## 负控

源码变了，三条负控按新源码重做，标记与原票相同：
- nc1 `CLEAN_REPARSE_KIND`
- nc2 `CLEAN_GUARD_ID`
- nc3 `CLEAN_NO_FOLLOW`

每条只改 `src/` 里真正被调用的一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 续做与检查

- 同一工作树 `F:/new/smaltalk/water/.worktrees/w4-g1`、分支 `worker/water-w4-g1`，从回执提交 `23a6434d1e5308b0ff1893114c3c8d3f1d9f42e0` 接着做。**不要重跑 baseline。** 开工时树应干净且 HEAD 为该提交。
- 检查入口与命令同原票，例如：
  ```powershell
  node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G1 --mode test
  ```
  另有 `lock`、`check`、`red-nc1..3`。提交干净实现后依次跑 `check --final`、`test --final`，再 `archive`。
- 范围、依赖、允许的 8 个系统函数、`forbidPatterns` 都不变。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在 `23a6434d` 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。
- 不碰任何真实用户位置；夹具只在本树 `.local` 下。

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W4-G1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w4-g1/docs/dispatch/reports/WATER-W4-G1-REPORT.md
```

新增“补单 02”一节，写：
- 实际模型、续做起点、新实现提交 SHA；
- 第 1～5 条逐条：改了哪里、怎么满足（第 1、4 条写清判断依据与计数）；
- 三条负控的改动、失败信息、恢复后的哈希；
- 两个 final 与 archive 的回执。

受阻则写“WATER-W4-G1 任务受阻”，写清冲突与最小补充需求，不要自行变通。
