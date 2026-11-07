# WATER-W11-N8：服务改名与新隔离区、只列存在的隔离区、几处说法（中门）

2026-11-07，正式单，总控（Claude）。默认执行者：sol。**第二批**：N3（执行器）、N5（扫描）、N6（项目声明）已于 11-07 合入；总控从合入后的主线 `4e411896` 建了工作树，复核过本单行号与预列旧断言（`packages/water-service/` 自 `ccc584b3` 起没有改动，行号不变），重算了冻结哈希。状态以[第十一波 manifest](../wave11/manifest.json) 中本单的 `status` 为准。可以新开对话执行。

用户 11-07 把软件改名 Flick，并“按计划出单”收掉服务的几条遗留。服务要把新隔离区交给执行器、要用项目声明包的两个文件名，所以排在第二批。

**11-07 验收 N3 后补了第 1.8 节**：N3 让执行器拒绝“一项包住另一项”的计划，工单当时假定扫描只给互不包含的条目。验收时的独立审查发现这个前提不成立：不同规则各自查找，`node_modules` 里的 `__pycache__` 这类会同时成为两组的条目，用户两组都选时整次清理会被拒。所以由服务在生成计划时去掉里层（第 1.8 节），nc3 也改为它。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W11-N8-SERVICE-20261107.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w11-n8 / worker/water-w11-n8 |
| 精确首次 HEAD | 4e411896（tag `water-w11-n8-base-20261107`，N3 合入主线的提交），必须干净；完整 SHA 见 manifest |
| SPEC | F:/new/smaltalk/water/contracts/w11-v1/RENAME-FLICK.md（第 2、3.2、4 节）与 F:/new/smaltalk/water/contracts/m35-v1/SERVICE-M35.md，加上本单第 1 节 |
| 仍然有效、要读的 | M14 原单 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M14-SERVICE-FIX-20261107.md；收口报告 F:/new/smaltalk/water/docs/acceptance/wave10/controller/WATER-M35-CLOSE-20261107.md 第 2.3、2.5、4 节 |
| 规则 | F:/new/smaltalk/water/docs/dispatch/WORKER-RULES.md 与 F:/new/smaltalk/water/docs/dispatch/W11-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/desktop-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w11-n8/docs/dispatch/reports/WATER-W11-N8-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w11-n8/docs/acceptance/wave11/n8/ |
| 门 | 中门：3 条负控 + check、test、real 三个 final |

先读：两份规则、SPEC、本单全文；代码 `packages/water-service/src/` 全部与 `tests/service_v1.rs`，以及执行器 `packages/junk-clean/src/model.rs` 的 `validate_disjoint_items`（第 1.8 节要与它同一口径）。下面的行号指 `ccc584b3`；服务包在 `4e411896` 上与它相同。

## 1. 要做的（全部在 `packages/water-service/`）

### 1.1 文案改名

用户看得见的 “Water” 改为 “Flick”，已知：`lib.rs` 第 53 行、`m35.rs` 第 361 行、`quarantine.rs` 第 269、272、273 行、`service.rs` 第 1799 行。改完在 `src/` 里查 `Water`，只能剩注释、类型名与内部版本串（如 `water.scan-result.v1`）。

### 1.2 新隔离区与旧名兼容（SPEC 第 3.2 节）

1. 新移入交给执行器 `<盘>\.flick-quarantine`（`quarantine.rs` 第 380～383 行的默认，`lib.rs` 第 133～137 行的候选根）。测试注册的 `quarantine_base` 照旧优先。
2. 旧名字下已有的批次照旧能列出、复原、永久删除、打开文件夹。
3. 空间分布（`conclusion.rs` 第 1961 行）两个名字都标成“隔离区”。

### 1.3 只列确实存在的隔离区（第七次整合遗留 1）

- 现状：隔离区页的“打开 X 盘隔离区”列出每个固定盘，包括没有隔离区的盘。
- 要求：每个固定盘查两个名字，只有确实存在而且是普通目录的才列出、才计入常驻入口与隔离区页的总量；一个都没有时不列。新移入不受影响：目标根不存在时照旧由执行器新建。

### 1.4 两个声明文件名（SPEC 第 4 节第 3 条）

- 用项目声明包的 `FILE_NAMES` 找声明（`m35.rs` 第 231～239 行），扫描报来的两个名字的位置都收（`service.rs` 第 924～933 行）。
- 同一目录两个都有：只读新名字那个；旧的不读、不信任、不进信任列表，扫描记录的声明列表里记一行 `valid: false`、`error_code: "MANIFEST_SHADOWED"`。
- 按所在目录配对，不要假设两条在扫描报来的列表里相邻：列表按小写路径排序，同一目录新名字一定在前，但中间可能夹着别的目录的声明。扫描最多报 256 条，截断时可能留下新名字、丢掉旧名字；这时照常读新名字，不补 `MANIFEST_SHADOWED` 那一行。

### 1.5 “还在长 / 已经不长了”只在能比较时说（收口复验新低项）

- 现状：没有更早的体检可比时，泄漏卡标题写“已经不长了”，同一组的线索却写“最近 14 天新增 52 个”（`conclusion.rs` 第 765～782 行）。
- 要求：
  - 这一组与更早的体检比过（`growth` 里有它）：照旧“还在长”“已经不长了”；
  - 没比过：写“最近 14 天新增 k 个”（k 与线索里同一组的数一致），k 为 0 写“最近 14 天没有新增”。

### 1.6 “自定义”改为“你加的位置”（收口报告 R6）

- 类别名 `自定义`（`views.rs` 第 58 行，以及第 824 行、`service.rs` 第 1239、1290 行的 `自定义 · …`）改为 `你加的位置`。
- 计划摘要（`conclusion.rs` 第 664～673 行）里这个类别那一段，金额后面加括号，写这个类别里所选体量最大的一两组的标题，用“、”连接，例如 `你加的位置 96 MB（内置浏览器的网页缓存）`。别的类别不变。

### 1.7 计时放宽（只改测试）

`skip_add`、`skip_remove`、`clean_prepare` 的规模断言从 50 ms 放宽到 200 ms，与另外 11 个写盘命令一致（用户 11-06 的要求）：`tests/service_v1.rs` 第 3376、3833、3852、3981 行。标记与失败信息照旧。

### 1.8 计划里去掉被包住的条目（11-07 验收 N3 后补）

- 现状：生成清理计划时（`clean.rs` 第 108～197 行）把所选各组的条目照单放进去，不看彼此是否包含。扫描允许嵌套：一条规则在测量的目录里，别的规则照样往里找（`junk-scan` 的 `streaming.rs` 第 469～471、852～877 行），`classify_reason` 只看和受保护条目的嵌套。合入 N3 后，执行器对“路径相同或一项包住另一项”的计划整体返回 `InvalidPlan`（`junk-clean` 的 `model.rs` 中 `validate_disjoint_items`）。
- 要求：
  - 生成计划时，路径相同或在另一条已选条目里面的条目（按路径段比较，ASCII 不分大小写，与执行器同一口径）不进计划，只留最外层；
  - 它的字节不再计入计划、确认框各组的数与总量和按盘统计；
  - 两层分属“直接清理”与“先放进隔离区”时，按外层那条的方式处理；
  - 只选了里层那组时，里层照常进计划。
- 别的照旧：受保护、跳过、令牌与过期的处理不变；不改执行器。

### 1.9 已知不在本单的

- 隔离模式下，直接清理的部分先做完，隔离那一批若返回错误，`clean.rs` 第 428 行的 `?` 会让这次清理记录不保存。1.8 做完后嵌套不再触发它；别的触发途径记为遗留，本单不改。

## 2. 测试

- `packages/water-service/tests/service_v1.rs`，精确 12 个测试，与 M14 相同：`service_ipc_contract`、`service_scan_views`、`service_clean_flow`、`service_trends_locations`、`service_storage_safety`、`service_hardening`、`m35_scope_and_plan`、`m35_conclusion_cards`、`m35_rows_and_detail`、`m35_clean_split`、`m35_quarantine`、`m35_trends_history`。
- **新断言**：

  | 改动 | 放进的测试 | 标记 |
  |---|---|---|
  | 1.1 错误与说明文字是 Flick | `service_hardening` | `SERVICE_W11_RENAME` |
  | 1.2 新移入进 `.flick-quarantine`，并核对交给执行器的根就是它（执行器默认根没有测试能抓，服务这边要抓）；旧名字下的批次能列出、复原、永久删除 | `m35_quarantine`、`m35_clean_split` | `SERVICE_W11_QUARANTINE` |
  | 1.3 没有隔离区的盘不列；只有旧名字、只有新名字、两个都有三种都对 | `m35_quarantine` | `SERVICE_W11_QUARANTINE` |
  | 1.4 只有新名字、只有旧名字、两个都有三种 | `m35_scope_and_plan` | `SERVICE_W11_DECL` |
  | 1.5 没比过与比过两种；k 为 0 | `m35_conclusion_cards` | `SERVICE_W11_WORDING` |
  | 1.6 类别名与摘要括号 | `m35_conclusion_cards` | `SERVICE_W11_WORDING` |
  | 1.8 两组嵌套（外层一组、里层一组，例如 `node_modules` 与它里面的 `__pycache__`）都选：计划只有外层、字节只算一次，清理在直接清理与先放进隔离区两种方式下都完成、记录完整；只选里层那组时里层照常清；两层分属两种方式时按外层。走公开入口（准备、开始清理），用真实的执行器 | `m35_clean_split` | `SERVICE_W11_NESTED` |

- **获准修改的旧断言**（总控已按 `4e411896` 复核，行号不变）：
  1. 第 73、1904、1970 行 `Water 服务暂时不可用。` → `Flick …`；第 4192 行 `Water 能删` → `Flick 能删`；第 6724 行 `Water 以外的清理之后重新起算` → `Flick …`。
  2. 第 4912、4959 行（`m14_conclusion_text`）：这个夹具没有更早的体检，标题 `…，已经不长了` → 按 1.5 的新说法。
  3. 表示**新移入目的地**的 `.water-quarantine`（第 5601、5821、5919～5920、6209、6335 行一带）→ `.flick-quarantine`；表示**旧批次**的保持旧名字，并用它证明 1.2 第 2 条。
  4. 第 3376、3833、3852、3981 行的 50 ms → 200 ms（1.7）。

## 3. 负控

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | 新移入又交给 `.water-quarantine` | `SERVICE_W11_QUARANTINE` |
| nc2 | 两个声明都在时又读旧的 | `SERVICE_W11_DECL` |
| nc3 | 被包住的里层又进计划 | `SERVICE_W11_NESTED` |

只改 `packages/water-service/src/` 的生产代码一处 → `--mode red-ncN` → `git checkout -- <文件>` 恢复原字节 → 立即 `--mode test`。

## 4. 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W11-N8 --mode baseline
```

之后反复用 `lock`、`check`、`test`、`real`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。`real` 是一次只读真实体检，清理关闭，照 M14。

## 5. 预算与边界

- 白名单：`packages/water-service/` 下的文件（不得改 `Cargo.toml` 的依赖与 `Cargo.lock`）；`docs/dispatch/reports/WATER-W11-N8-REPORT.md`；`docs/acceptance/wave11/n8/` 下 `--mode archive` 生成的证据。
- IPC 命令名、JSON 字段名与错误码不变（`MANIFEST_SHADOWED` 只进扫描记录，不进 IPC 错误码）。系统函数照旧，不新增。
- 原生窗口 0、选择框 0、浏览器 0；cargo 离线、单线程、私有 target。服务测试带计时断言，跑测试时机器上不跑别的重活。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份、远端与历史、回执编码照通用规则第 7 节。

## 6. 交回

回执第一行与通知完全一致：

```text
WATER-W11-N8 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w11-n8/docs/dispatch/reports/WATER-W11-N8-REPORT.md
```

回执照通用规则第 7 节第 4 条写。受阻则写“WATER-W11-N8 任务受阻”。
