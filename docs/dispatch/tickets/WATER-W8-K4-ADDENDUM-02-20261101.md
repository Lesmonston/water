# WATER-W8-K4 补单 02：旧体检也按当前跳过名单算、排除检查用索引，以及几处加固（重门）

2026-11-01，总控（Claude）。回应 WATER-W8-K4 补单 01 的完成回执（实现提交 `9f7b6efe`，回执提交 `fc36140d`）。可以新开对话执行。开工前依次读：
1. 原单 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W8-K4-SERVICE-20261101.md`；
2. 补单 01 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W8-K4-ADDENDUM-01-20261101.md`；
3. 规则 `F:/new/smaltalk/water/docs/dispatch/W8-M3C-WORKER-RULES.md`；
4. SPEC `F:/new/smaltalk/water/contracts/m3c-v1/SERVICE-M3C.md` 与 `F:/new/smaltalk/water/contracts/m3c-v1/SERVICE-M3C-ADD-01.md`；
5. 本补单（与以上冲突时以本补单为准）；
6. 上一轮回执 `F:/new/smaltalk/water/.worktrees/w8-k4/docs/dispatch/reports/WATER-W8-K4-REPORT.md`。

## 验收结论

补单 01 已验收通过（VERIFIED），总控已把 `fc36140d` 合入主线：
- 回执审计 0 问题；
- 总控新树重跑 `lock`、`check --final`、`real --final` 都通过；
- 总控变异与独立审查都没有发现高级问题，已跳过、已排除、受保护的项与非 NTFS/ReFS 盘根上的项都进不了清理计划。

审查找出三条中级与几处低级，都不影响清理，但会让显示前后不一致，或在极端输入下超出返回预算。界面单这一轮还要再改一次，本补单与它并行，修完再合入一次。

## 要做的（全部在 `packages/water-service/`）

### 1. 旧体检也按当前跳过名单算（中）

**问题**：每条记录各有一份 `Projection`，但 `skip_add` / `skip_remove` 只刷新最新一条（`s.last_record()`）。于是：
- 清理记录里旧体检的“可放心清理”（`history` 的 `bytes`）和旧体检的 `scan_result`，在本次运行中不反映刚做的跳过或恢复；
- 重启后，旧记录的投影按启动时的名单重建，数字又变了。
同一个旧体检的数字会随“有没有重启过”而不同。

**改为**：所有已载入记录的视图规则一律与最新扫描相同，都是“扫描结果 + 当前跳过名单”：
- `skip_add` / `skip_remove` 写完设置后，对每条已载入记录的投影都按该路径刷新。每条刷新仍是按索引、只动受影响的项与合计，不全量重建、不写记录。
- 记录条数有上限，整体仍要在 50 ms 返回预算内，且不随单次扫描的条目数线性增长。
- 首页“上次体检”用的是最新扫描的投影，已经一致；趋势、预测、“上次识别”用总量，不看可清理。这几处行为都不变。

### 2. `clean_prepare` 的排除检查用索引（中）

**问题**：`clean.rs` 对每个排除 ID 在 `r.result.items` 里线性查找，生成计划时又对每个条目在排除列表里线性查找。允许的上限 5,000 个排除，加上万项的扫描，就是上亿次字符串比较，可能超过 50 ms 返回预算。

**改为**：
- 排除 ID 的查找用投影已有的条目 ID 索引；
- 生成计划时的“是否被排除”用集合判断。
校验规则不变：ID 不存在、不属于所选组、不可清理（已跳过的除外）、重复、超过 5,000 个，仍返回 `invalid`。

### 3. 加固（低）

1. **先作废计划，再刷新视图**：`skip_add` / `skip_remove` 在设置写入成功后，**立即**把已有计划标为过期，然后再刷新投影。这样即使刷新中途出错，带着刚跳过那一项的旧计划也不能再执行。
2. **`recommended_by_drive` 的零字节行**：`build` 会为只含零字节推荐项的盘建一行 `"0"`，`refresh_path` 却会删掉所有零字节行，于是跳过别的项后这一行消失、重启后又出现。两边规则改成一致，回执写明采用哪条规则。
3. **“几天后满”不要显示“-0”**：速度在 -1～0 之间时，`bytes_per_day` 不能格式化成“-0”。
4. **可能受负载影响的两条测试**：
   - `SERVICE_M3C_DUE` 的“七天”：`ended_at` 是假时钟加上真实耗时，机器忙时 fixture 扫描超过 1 秒就会算成 6 天。改为不依赖真实耗时。
   - `SERVICE_SNAPSHOT_REMOVE_FAIL`：要抢在服务删除快照之前打开文件。能做成确定性的就做；做不到就在回执里说明为什么它不会偶发失败。
   - 两条都只改测试写法，不改期望值，也不放宽任何断言。

## 测试

新增断言加在已有测试里，沿用原标记：
- 第 1 条 `SERVICE_M3C_SKIP`：
  - 至少两次体检都含同一个推荐项；
  - `skip_add` 后，旧体检的 `history` 行与 `scan_result` 都扣除该项；`skip_remove` 后都恢复；
  - 重启前后同一个旧体检的数字相同。
- 第 2 条 `SERVICE_M3C_EXCLUDE`：在至少 10,000 项的合成记录上（写法同补单 01 的规模用例），传 5,000 个合法排除 ID 调 `clean_prepare`，在 50 ms 内返回，计划与 `excluded_count` 都正确。
- 第 3 条第 1 项 `SERVICE_M3C_SKIP`：跳过后已有计划不能再执行（现有断言可沿用）。
- 补测试缺口，都用 `SERVICE_M3C_DRIVE_ROOT` 或 `SERVICE_M3C_SKIP`：
  - **含已知文件夹的非系统固定盘盘根被拒**：现有用例里含已知文件夹的盘都是系统盘，去掉已知文件夹检查也不会失败；
  - **扫描时就不可清理的项**（例如过新）：跳过再恢复后，仍不可清理；
  - **设置里的跳过路径大小写与扫描路径不同时**，最新视图与旧记录视图都按已跳过显示。
- 原有的 64 次与万项预算断言、补单 01 的所有断言保留，不放宽。

## 负控

三条都在本补单的代码上重做：nc1 `SERVICE_M3C_EXCLUDE`、nc2 `SERVICE_M3C_SKIP`、nc3 `SERVICE_M3C_DRIVE_ROOT`，每条只改 `src/` 一处。
- nc2 可选“旧记录不随跳过刷新”；
- nc3 可选“去掉盘根的已知文件夹检查”。
上一轮的负控不再算数。

## 不变

- SERVICE-M3C、补充 01、补单 01 的其余全部要求；补充 01 第 5 节获准修改的旧断言；
- 原有的 50 ms 返回预算与其它旧断言；IPC 形状；
- 依赖与锁文件；唯一新增的系统函数仍只有 `GetVolumeInformationW`；`DriveInfo` 不变，`Platform` 新方法都带默认实现；
- 白名单、三个 final（check、test、real）。
- 以下审查发现**不在本补单范围**，留作以后：
  - 设置文件里一条跳过记录坏掉时整份设置退回默认；
  - `skip_id` 复用最小空号；
  - 大小写不敏感只对 ASCII；
  - 进程快照取不到时残留进程显示为“没有”；
  - 清理结果 `estimate_bytes` 的循环；
  - 全被跳过的组在 `clean_prepare` 里被默默去掉。

## 续做与检查

- 同一工作树 `F:/new/smaltalk/water/.worktrees/w8-k4`、分支 `worker/water-w8-k4`，从回执提交 `fc36140dc9abd8329c3c77a1625789b8dfccf68f` 接着做。开工时树应干净且 HEAD 为该提交。**不要重跑 baseline。**
- 命令同原单（在工作树根目录执行），例如：
  ```powershell
  node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W8-K4 --mode test
  ```
  反复用 `lock`、`check`、`test`。负控流程：只改 `packages/water-service/src/` 一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。
- 同一检查连续两次失败仍要停下写受阻回执（规则第 4 节）。
- 提交身份照规则第 5 节：只在提交命令的进程里设作者与提交者环境变量，不写任何 git 配置，不借用人类作者身份。
- 原生窗口 0、选择框 0；cargo 离线、单线程、私有 target，不下载。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在 `fc36140d` 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

改写同一份回执，第一行与原单一致：

```text
WATER-W8-K4 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k4/docs/dispatch/reports/WATER-W8-K4-REPORT.md
```

原有内容保留，新增“补单 02”一节，写：
- 实际模型、续做起点、实现提交 SHA；
- 本补单第 1～3 条逐条：改了哪里、怎么满足；第 1 条的 `skip_add` / `skip_remove` 与第 2 条的 `clean_prepare` 在规模用例上的实际耗时；
- 新增与改过的断言（改过的写原文）；
- 每个检查命令与结果，`real` 的分类汇总；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则写“WATER-W8-K4 任务受阻”，写清冲突与最小补充需求，不要自行变通。
