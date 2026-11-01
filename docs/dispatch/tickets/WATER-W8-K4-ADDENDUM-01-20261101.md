# WATER-W8-K4 补单 01：跳过只写设置，视图按“扫描结果 + 当前跳过名单”算（重门）

2026-11-01，总控（Claude）。回应 WATER-W8-K4 的受阻回执（实现提交 `c5ae026c`，回执提交 `e2fbc784`）。可以新开对话执行。开工前依次读：
1. 原单 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W8-K4-SERVICE-20261101.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W8-M3C-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/m3c-v1/SERVICE-M3C.md` 与 `F:/new/smaltalk/water/contracts/m3c-v1/SERVICE-M3C-ADD-01.md`；
4. 本补单（与原单、SPEC、补充 01 冲突时以本补单为准）；
5. 上一轮回执 `F:/new/smaltalk/water/.worktrees/w8-k4/docs/dispatch/reports/WATER-W8-K4-REPORT.md`。

## 受阻判断

受阻成立，根子在总控的补充 01 第 1 条。它要求 `skip_add` 立即作用于最新扫描，并“随扫描记录一起保存”。照此实现，每次跳过都要在 IPC 调用里同步完成：
- 写设置；
- 克隆整份记录、全量重算视图；
- 重写整份扫描记录并刷盘。

这样逼近原有的 50 ms 返回预算，在测试夹具上就偶尔超时。真实扫描有上万项，会更糟。你在连续两次失败后停下，做法正确；没有放宽预算或断言，也正确。

你的实现读取记录时已经会应用当前的跳过名单，所以重写扫描记录是多余的。

## 要做的（全部在 `packages/water-service/`）

### 1. 最新扫描的视图 = 扫描结果 + 当前跳过名单

本条取代补充 01 第 1 条的“随扫描记录一起保存”和“`skip_remove` 不改回”两句：
- 扫描记录照原样保存扫描当时的结果，**`skip_add`、`skip_remove` 都不重写扫描记录**。
- 最新扫描的视图、详情、合计、按盘推荐量，一律由“扫描结果 + 当前设置里的跳过名单”算出。这条规则在扫描刚结束时、`skip_add` / `skip_remove` 之后、服务重启读入记录时都一样。
  - 重启后视图仍然反映跳过，靠的是跳过名单存在设置里。
- `skip_add`：写设置后，最新扫描里路径（不区分大小写）相同的可清理项立即显示为不可清理（`user_skipped`，“已设为以后都跳过”），并从合计中扣除。
- `skip_remove`：写设置后，这一项立即恢复为扫描当时的状态（扫描时可清理就恢复可清理）。真正清理前，执行器照旧逐项复核。
- 两者成功后，都把已有的清理计划标为过期（你的实现已有）。
- `clean_prepare` 按当前跳过名单再挡一次（补充 01 第 1 条第三点）、排除里的已跳过项忽略（补充 01 第 3 条），都不变。

### 2. 返回预算

`skip_add`、`skip_remove` 必须在原有的 50 ms 预算内返回，并且耗时不能随整次扫描的条目数线性增长：
- 只写设置文件（小文件，与 `locations_set_category` 同样的原子写法）；
- 内存里只重算受影响的组、它的详情，以及汇总合计与按盘推荐量，不对整次扫描调用全量的视图重建；
- 不在调用里写扫描记录。

### 3. 测试

- 现有的 64 次 `skip_add` 用例保留，预算断言不放宽。
- 新增一个规模用例，标记 `SERVICE_M3C_SKIP`：
  - 用合成扫描记录构造一次至少 10,000 项的最新扫描（只写记录 JSON，不建真实文件，写法同你在第 8 节、预测用例里的合成记录）；
  - 对其中一项连续做 `skip_add`、`skip_remove` 各 5 次，每次都在 50 ms 内返回；
  - 每次之后 `group_detail` 与合计都正确。
- 重启用例：跳过后重启服务，视图仍显示该项为 `user_skipped`；`skip_remove` 后重启，该项恢复。
- 扫描记录文件在 `skip_add` / `skip_remove` 前后字节不变（标记 `SERVICE_M3C_SKIP`）。

### 4. 负控

三条负控都按改后的代码重做（nc1 `SERVICE_M3C_EXCLUDE`、nc2 `SERVICE_M3C_SKIP`、nc3 `SERVICE_M3C_DRIVE_ROOT`），每条只改 `src/` 一处。nc2 可选“视图不应用当前跳过名单”。上一轮的 nc1、nc2 是在旧字节上做的，不再算数。

## 不变

- SERVICE-M3C 与补充 01 的其余全部要求；补充 01 第 5 节获准修改的旧断言；
- 原有的 50 ms 返回预算与其它旧断言；
- 依赖与锁文件；唯一新增的系统函数仍只有 `GetVolumeInformationW`；
- 白名单、三个 final（check、test、real）。

## 续做与检查

- 同一工作树 `F:/new/smaltalk/water/.worktrees/w8-k4`、分支 `worker/water-w8-k4`，从回执提交 `e2fbc784` 接着做（产品与测试字节即 `c5ae026c`）。开工时树应干净且 HEAD 为该提交。**不要重跑 baseline。**
- 命令同原单（在工作树根目录执行），例如：
  ```powershell
  node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W8-K4 --mode test
  ```
  反复用 `lock`、`check`、`test`；负控：只改 `packages/water-service/src/` 一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。
- 同一检查连续两次失败仍要停下写受阻回执（规则第 4 节）。
- 提交身份照规则第 5 节：只在提交命令的进程里设作者与提交者环境变量，不写任何 git 配置，不借用人类作者身份。
- 原生窗口 0、选择框 0；cargo 离线、单线程、私有 target，不下载。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在 `e2fbc784` 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

改写同一份回执，第一行与原单一致：

```text
WATER-W8-K4 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k4/docs/dispatch/reports/WATER-W8-K4-REPORT.md
```

原有的受阻一节保留，新增“补单 01”一节，写：
- 实际模型、续做起点、实现提交 SHA；
- 本补单第 1～3 条逐条：改了哪里、怎么满足；`skip_add` / `skip_remove` 在规模用例上的实际耗时；
- 原单其余各节相对上一轮有无变化；
- 改过的旧断言（补充 01 第 5 节那些）：原值与新值；
- 每个检查命令与结果，`real` 的分类汇总；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则写“WATER-W8-K4 任务受阻”，写清冲突与最小补充需求，不要自行变通。
