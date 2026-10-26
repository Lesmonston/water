# WATER-W3-F1 补单 01：设置与记录的容错、重启后的占用提示、两处测试补强

2026-10-26，总控（Claude）。依据 [第三波收单验收](../../acceptance/wave3/controller/WATER-W3-F1F2-REVIEW-20261026.md) F1 小节。**可以新开对话执行。** 新执行者开工前依次读：

1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W3-F1-WATER-SERVICE-20261026.md`
2. 执行者规则 `F:/new/smaltalk/water/docs/dispatch/W3-DESKTOP-WORKER-RULES.md`
3. SPEC `F:/new/smaltalk/water/contracts/desktop-v1/SERVICE.md`
4. 本票原回执 `F:/new/smaltalk/water/.worktrees/w3-f1/docs/dispatch/reports/WATER-W3-F1-REPORT.md`
5. 最后读本补单

工作树、分支、检查入口都不变。文中的“你”指本票执行者，包括接手的新对话。

## 验收结果

清理安全这条主线做得扎实，以下几项总控都已独立核实：

- **机械审计全过**：三个 final 在同一实现提交上，负控红绿成对，归档逐字节一致。
- **新树重跑**：`check --final`、`test --final`、`real --final` 都通过。总控换了三处不同位置做负控，都打红并精确恢复。
- **真实冒烟**：与你的结果一致。总控单独测了系统临时目录，同口径相差不到 0.1%。
- **清理打开时的合成验证**：总控自己写夹具，独立跑了扫描、计划、清理全流程。
  - 只删计划内条目，释放字节数与实际删除的字节数相等；
  - 占用项按规则跳过，联接只解除链接、目标完好；
  - 令牌重放和关闭开关后重启都被拒绝。

需要改的是下面四处容错与提示问题，以及两处测试缺口。前三处会被 M1 用户直接碰到。

## 覆盖条款（冻结的 SERVICE.md 不改，以本补单为准）

### 1. 设置读取：只丢坏的自定义位置

现状：启动时只要有一个自定义位置校验不过，整份设置就换回默认，分类开关与其它自定义位置一起丢失。比如用户删掉了那个文件夹，下次启动就会这样。

改为：

- `settings.json` 能解析、版本正确、7 个分类键齐全时，**分类开关一律保留**。
- `custom_roots` 逐个校验，不合格的（不存在、变成重解析点、ID 不合格或重复、超出 16 个）只去掉那一个，其余保留。
- 有去掉时，用原子写立即回写一次 settings。
- 只有整份文件解析失败、版本不对或分类键不齐时，才回到默认。

### 2. 记录保留：读不进来的跳过，删不掉的不致命

SERVICE 第 4 节要求“读取遇到损坏文件时跳过该文件并继续，不让整个服务失败”。现状有两处不符：

- 名字与 ID 格式相符、但没读进来的记录会被删掉，与它新旧无关；
- 任何一个文件删除失败（被占用、只读、是目录），都会让 `Service::new` 每次启动返回 unavailable，或把刚完成的扫描标为 failed。

改为：

- 删除只针对**已成功读入、且排在最近 60 条之外**的记录。快照只在对应的扫描记录被删时一并删除。
- 读不进来的文件（损坏、格式版本不认识、读时被占用）跳过并原地保留，不删除。
- 单个文件删除失败只跳过该文件，继续处理其余文件。它不得让 `Service::new` 失败，也不得改变扫描或清理的结果状态。
- 删除范围的其余限制不变：只限这几个目录下、文件名与 ID 格式相符的普通 `.json` 文件，不递归、不跟随链接。

### 3. 占用提示：扫描时确定，之后沿用

SERVICE 第 6 节第 140 行要求构建视图时调用 `Platform::in_use`，但没考虑重启：重启后没有进程快照，`WindowsPlatform` 返回“无法确认占用状态”，视图就拼成了“无法确认占用状态 正在运行，将跳过占用的项”。这是总控契约的漏洞。

改为：

- 组的占用结果在扫描时确定，即该次扫描调用 `begin_in_use_batch` 之后，并随扫描记录保存。之后所有视图（包括重启后重建的视图与 `group_detail`）都用保存的结果，**不再调用 `Platform::in_use`**。
- 旧记录里没有保存结果时，`in_use` 为 null。
- 扫描时拿不到进程快照的，仍保守视为在用，但视图写为 `{"process_label_zh":"暂时无法确认是否在运行，清理时会再次检查"}`。不得出现“无法确认占用状态 正在运行”一类拼接。
- 清理执行时的占用判断不变：`clean_start` 仍先调用 `begin_in_use_batch`，再逐项调用 `in_use`。

### 4. 清理开关先于参数校验

SERVICE 第 8 节第 1 条：开关关闭时，`clean_prepare` 与 `clean_start` 都只返回 unavailable 句子。现状是先校验参数，所以参数不合格时返回 invalid。

改为：开关关闭时，这两个命令在参数校验之前就返回 unavailable 句子。

## 测试补强（仍是原五个测试名，不加不减）

1. **`service_clean_flow`**：
   - 在所选的一个组里放一个有身份、但不可清理的条目（例如刚改动、未到 `min_age_hours`）。断言计划条目集合**恰好等于**所选组里 eligible 且有身份的条目，并且这一条被排除在外。失败信息含 `SERVICE_PLAN_ITEMS`。总控把计划阶段的 eligible 筛选去掉做过一次变异，原有五个测试全部仍然通过。
   - 开关打开时生成一个真实计划。换成开关关闭重新创建服务，用这个计划和令牌调用 `clean_start`，必须返回 unavailable 句子，且文件不变。
   - 开关关闭时，参数不合格的 `clean_prepare` 也必须返回 unavailable 句子。
   - 以上两条的失败信息含 `SERVICE_CLEAN_DISABLED`。
2. **`service_storage_safety`**：
   - 一个排在最近 60 条之内的损坏记录，经重启和一次新扫描后仍在原处。
   - 在 scans 下放一个名字像记录 ID 的目录，`Service::new` 与随后的扫描都不受影响，该目录也原样保留。
   - settings 里有两个自定义位置并关掉一个分类，删掉其中一个位置的目录后重启：分类开关和另一个位置保留，被删的那个去掉，settings 文件已回写。
3. **`service_scan_views` 或 `service_trends_locations`（任选其一）**：
   - 重启后 `scan_result` 与 `group_detail` 的占用提示与重启前相同；
   - 测试平台记录调用次数，证明重启后构建视图时没有调用 `in_use`。

## 不在本补单范围（已记录，M2 打开清理前另行处理）

审查还发现以下几点。本版清理关闭，它们不影响 M1，你不用改：
- 任务线程 panic 后 busy 可能卡住或锁中毒；
- 计划文件以 data_dir 为信任边界；
- 旧扫描的“已消耗”标记异步写入；
- 残留 `.tmp` 文件，plans 与 journal 没有上限；
- 自定义位置只按文本比较路径（subst 盘、8.3 短名）；
- 部分完成（partial）的扫描能否作为清理来源。

## 续做与检查

- 同一工作树 `F:/new/smaltalk/water/.worktrees/w3-f1`、分支 `worker/water-w3-f1`，从你的回执提交 `06182d6baeb620c5345f6e2eead085ccad0bfe01` 接着做。**不要重跑 baseline。**
- 改动范围不变：只限 `packages/water-service/`、本票回执与 `docs/acceptance/wave3/f1/`。不改 A–D 四个已验收 crate。
- 命令顺序：
  1. 反复使用 `check` 与 `test`；
  2. 三条负控 nc1、nc2、nc3 都要在新字节上**重做**。final 审计只认绑定当前测试哈希的红绿，旧的不再有效。每条只改生产代码一行，红后立即用 `git checkout` 恢复原字节，再跑一次 `test`；
  3. 提交干净实现后，依次跑 `check --final`、`test --final`、`real --final`（一次真实只读冒烟，清理仍关闭）、`archive`。

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W3-F1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w3-f1/docs/dispatch/reports/WATER-W3-F1-REPORT.md
```

新增“补单 01”一节，写清：
- 续做起点与新实现提交；
- 四处改动各自的做法；
- 新增断言的位置与失败信息；
- 三条新负控的红绿回执与恢复哈希；
- 真实冒烟摘要的变化；
- 没做或没验证的事。

仍然受阻时，第一行写“WATER-W3-F1 任务受阻”。
