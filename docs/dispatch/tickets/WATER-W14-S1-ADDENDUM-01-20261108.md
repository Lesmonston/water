# WATER-W14-S1 补单 01：第 A 段，除规则阶段计数以外的全部做完、测试全绿（中门单的中间段）

2026-11-08，总控（Claude）。在原单 [WATER-W14-S1](WATER-W14-S1-SERVICE-20261108.md) 的基础上续做，原单的规则、边界照旧，本补单只写增量。可以新开对话执行。

原单交回受阻（`1587c1cc`）：扫描包的进度回调分不出“哪个目标走完了”，W14 第 3.3 节要求的“按完成的目标数”做不到。总控核实属实，处理是：

- 补充契约 [W14-ADD-01](../../../contracts/w14-v1/W14-ADD-01.md)：扫描包加 `on_root_done`（另一张单 J2 做），服务按“根目录走完”算规则阶段；
- 本单分两段：**本补单是第 A 段**，做除规则阶段计数以外的全部；J2 合入后，总控把它合进你的分支，再出补单 02 做规则阶段计数、负控与 final。

你在受阻回执里的分析、保存现场的做法、没有擅自改扫描包与契约，都是对的。

| 项 | 精确值 |
|---|---|
| 权威补单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W14-S1-ADDENDUM-01-20261108.md |
| 原单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W14-S1-SERVICE-20261108.md |
| 工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w14-s1 / worker/water-w14-s1（原树，不新建） |
| 续做起点 | `1587c1cc`（受阻交回的 HEAD，其中 `78acd3b6` 是保存的现场），必须干净 |
| SPEC | F:/new/smaltalk/water/contracts/w14-v1/W14.md 第 0、1、3、7 节；F:/new/smaltalk/water/contracts/w14-v1/W14-ADD-01.md 第 0、3 节（第 2 节留给补单 02） |
| 检查入口、回执 | 同原单；回执写在原回执后面，加一节“补单 01（第 A 段）” |
| 门 | 本段不过门：`check`、`test` 非 final 全过即交回；负控、final、`archive` 都留给补单 02 |

**先读**：本补单全文、W14-ADD-01 全文、原单第 1～3 节、你的受阻回执。

## 1. 要做的（全部在 `packages/water-service/`）

### 1.1 原单里除规则阶段计数以外的全部

照原单第 1.1～1.5 节与你回执里的“已保存的工作与未完成项”做完：

- 双语字段补齐：所有命令的返回（含错误）`_zh` 都有 `_en`，`copy_text` 有 `copy_text_en`；规则带来的文字取规则的英文字段；
- 新记录两种语言都存，旧记录读出来 `_en` 等于 `_zh`；
- 去掉拿中文句子做判断的逻辑（代码与旧写法两条路结果一致）；
- 两份大小格式化的英文版本；
- 整盘位置：空间统计阶段 40～94、位置 `space`、位置名不变、`found_bytes` 不含空间统计字节、`finishing` 95、最终 100（你已做的部分照契约核对）；
- 第十三波趋势测试的假时钟（你已改成按扫描实际结束时间）；
- 公开前的写法全目录看一遍。

### 1.2 规则阶段先用过渡做法（W14-ADD-01 第 3 节第 1 条）

- `scan_full` 跑着的时候 `percent` 停在 0；`scan_full` 返回，到这一段的终点（没有整盘位置时 90，有时 40）。
- 位置：`scan_full` 跑着的时候规则位置都是 `running`；返回后照 W14 第 3.3 节（普通位置 `done`，整盘位置进 `space`）。
- 不再按 `on_progress` 的回调次数算任何“完成”。你加的那条复现（同一目标重复回调不推进进度）在过渡做法下应当是绿的，保留。
- 测试不要把过渡做法写成精确断言（例如“规则阶段一直是 0”“所有位置同时 `running`”），补单 02 会换掉它。只断言契约里不变的部分（只增不减、阶段顺序、范围、`found_bytes`、位置名、空间统计前不 `done`）。

### 1.3 第 A 段交回后不能再变的

第 A 段交回的提交会作为宿主单 H1 的底。下面这些在补单 02 里不能再改：

- `IpcError` 的字段：`code`、`message_zh`、`message_en`；
- `water-service` 的公开函数与类型的签名；
- IPC 的命令名与键。

## 2. 测试

- 原单第 2 节的各条，除规则阶段计数以外都做完，标记照原单（`SERVICE_W14_EN`、`SERVICE_W14_CODES`、`SERVICE_W14_PROGRESS`）。
- 你回执里列的 6 条失败（`m35_clean_split`、`service_hardening`、`m35_conclusion_cards`、`m35_scope_and_plan`、`service_storage_safety`、`service_trends_locations`）都要修好：
  - 是实现缺的（例如无选择时 `summary_en` 为空），改实现；
  - 是旧精确断言要加 `_en` 键的，照原单“获准修改的旧断言”迁移，回执逐条写原值 → 新值 → 为什么；
  - `m35_scope_and_plan` 的 `referenced_count` 查清原因再定，不降低强度。
- 测试个数仍是 12，不新增测试函数。

## 3. 命令

- 只跑 `lock`、`check`、`test`（可以跑一次 `real`），直到 `check`、`test` 都过。
- **不跑** `red-nc1/2/3`、任何 `--final`、`archive`，不往 `docs/acceptance/wave14/s1/` 写证据。
- 提交干净后，最后再跑一次 `check` 与 `test`，回执写这两次的回执文件名与结果。

## 4. 交回

- 回执第一行与通知完全一致：

  ```text
  WATER-W14-S1 补单 01 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w14-s1/docs/dispatch/reports/WATER-W14-S1-REPORT.md
  ```

- 回执里写：第 A 段的实现提交、最后一次 `check` 与 `test` 的结果、迁移的旧断言、补单 02 要接的事（至少：规则阶段按根目录计数、位置与类别按目标走完、负控、final、archive）。
- 受阻则写“WATER-W14-S1 补单 01 任务受阻”。

## 5. 补充（11-08 21:00，白名单漏了示例文件）

第 A 段第一次交回受阻（`67dffed7`，现场 `a9a87ad1`）：服务测试 12/12 全绿，但检查器的 Clippy 带 `--all-targets`，会编译 `packages/water-service/examples/service_smoke.rs`，而原单第 5 节的白名单没有列这份文件。总控核实属实：清单本来就把它列在 `productionFiles` 里，是工单漏写。

- **白名单加上** `packages/water-service/examples/service_smoke.rs`，本段与补单 02 都适用。只改回执里说的三处：
  1. 第 27 行一带的错误补 `message_en: "A data directory is required".into()`；
  2. 第 49 行一带的错误补 `message_en: "The checkup did not finish".into()`；
  3. 第 45 行一带的轮询：`running` 与 `finishing` 都继续等，到最终状态才退出。
- **续做起点**：`67dffed7`（你第二次交回的 HEAD），必须干净。
- 改完提交后，照第 3 节最后一条在干净提交上再跑一次 `check` 与 `test`，两次都过即交回。仍不跑负控、final、`archive`。
- 回执在“补单 01（第 A 段）”一节后面接着写这次的提交与两次结果，通知第一行照第 4 节。
