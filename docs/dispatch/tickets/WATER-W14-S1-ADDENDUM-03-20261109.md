# WATER-W14-S1 补单 03：整盘位置别提早显示“统计整盘”、英文单复数与几处措辞（中门）

2026-11-09，总控（Claude）。在原单 [WATER-W14-S1](WATER-W14-S1-SERVICE-20261108.md) 与补单 [01](WATER-W14-S1-ADDENDUM-01-20261108.md)、[02](WATER-W14-S1-ADDENDUM-02-20261108.md) 的基础上续做，原单的规则、边界、门照旧，本补单只写增量。可以新开对话执行。

补单 02 交回的 `47760070` 已经过验收：
- 审计 0 个问题；
- 新验收树三个 final 通过，三条负控重放都抓到；
- 独立审查没有高级问题。

但审查找出一条中级问题，是用户看得见的进度问题，还有几处英文。改完再与 H1 一起合入。

| 项 | 精确值 |
|---|---|
| 权威补单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W14-S1-ADDENDUM-03-20261109.md |
| 工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w14-s1 / worker/water-w14-s1（原树，不新建） |
| 续做起点 | `47760070`（补单 02 交回的 HEAD），必须干净 |
| SPEC | W14 第 0.2、3.3、7 节；W14-ADD-01 第 2 节 |
| 检查入口、回执 | 同原单；回执接在“补单 02（第 B 段）”后面，加一节“补单 03” |
| 门 | 中门：三条负控照原单第 3 节**重做**（代码变了，旧的红绿证明对不上新的 final），check、test、real 三个 final，再 `archive` |

**先读**：本补单全文、W14 第 3.3 节 `locations[].state` 那几行、你的 `update_rule_rows`（`src/service.rs` 第 1600～1630 行一带）与空间统计循环（第 1176 行一带）。

## 1. 要改的（全部在 `packages/water-service/`）

### 1.1 整盘位置在规则阶段不显示 `space`（中级）

- **现在的问题**：`update_rule_rows` 里，整盘位置的规则目标一旦都走完，就标成 `space`（第 1623 行一带）。但扫描是先走浅的根目录，盘根（例如 `D:\`）最先走完。结果是规则阶段还在查别的位置时，这个盘已经显示 `space`，界面写着“正在统计整盘”（Measuring the whole drive），百分比却还在 0～39。
- **W14 第 3.3 节**：`space` 的意思是“这个盘的整盘空间统计正在跑”。
- **改成**：
  - 规则阶段里，整盘位置**不会**是 `space` 或 `done`：它的规则目标都走完了也显示 `running`；一个规则目标都没有的整盘位置，在规则阶段显示 `waiting`；
  - 只有空间统计循环开始统计这个盘时才设 `space`，统计完才 `done`（现有的循环已经这样做）；
  - 有两个整盘位置时，正在统计的那个是 `space`，还没轮到的保持 `running` 或 `waiting`。
- 不改其它位置与类别的状态规则。

### 1.2 英文

- **单复数**：下面几句用 `language::count`（或你已有的同类函数），1 与 2 都要对：
  - 体检记录摘要 `{n} location categories recognized`，以及停止时的那句（`src/service.rs` 第 1967 行一带）；
  - 清理记录摘要 `Cleaned {n} groups, skipped {n} items`，以及 `items failed`、`items moved to quarantine`（第 1995 行一带）。
- **措辞**：照 W14 第 0.2 节，说结果、短句。建议写法如下，你可以更好：

  | 位置 | 现在 | 建议 |
  |---|---|---|
  | `src/quarantine.rs` 第 204 行一带 | Stored for N days; permanently delete after confirming everything is fine | In quarantine for N days. Delete permanently once everything works |
  | `src/clean.rs` 第 1128 行一带 | Moving to quarantine has not freed space. Permanently delete after confirming… | Quarantine does not free space. Delete permanently once everything works |
  | `src/quarantine.rs` 第 603 行一带 | Permanently deleted quarantine · freed … | Deleted from quarantine · freed … |
  | 体检记录停止时 | Stopped; N location categories recognized | Stopped · N location categories recognized |

- **产品名大小写**：`src/views.rs` 第 17～18 行与第 977～978 行一带，`grok` 和 Codex、Claude、Cursor 并列，写的是产品名，中英两边都写 `Grok`。
- **时间**：界面上显示的时间照 W14 第 0.2 节（`Nov 8, 14:05`），不带 ` UTC`；给 agent 复制的线索文字可以保留 `UTC`。查清 `language.rs` 第 103 行一带的输出用在哪些地方，按这条分开，回执写清。
- **没有就是空**：`fix_hint_en` 在中文为空时也为空（`src/service.rs` 第 2031 行一带现在给了 “No repair advice is available”），与第 1.3 节“同有同无”一致。

### 1.3 项目声明的目录不单独成一类

`progress_categories`（第 1444 行一带）现在给每个项目声明的目录都加一行“你加的位置 · <目录>”。结论页是按你加的位置分组的，体检中的方块图应当一致：声明目标归到它所在的、你加的那个位置，不单独成行。

## 2. 测试（测试个数仍是 12，新断言加在已有函数里）

| 内容 | 放在 | 标记 |
|---|---|---|
| 替身**先**报整盘位置的盘根（和真实扫描一样，浅的先走），再报别的根：盘根报完后整盘位置是 `running`，不是 `space`；规则阶段结束、空间统计开始后才是 `space`，统计完 `done`。另一组整盘位置没有规则目标：规则阶段是 `waiting` | `service_scan_views` | `SERVICE_W14_PROGRESS` |
| 项目声明的目标归到它所在的位置：那个位置的完成要等声明目标走完；`categories` 里没有单独的声明目录行 | `service_scan_views` 或声明所在的测试 | `SERVICE_W14_PROGRESS` |
| 第 1.2 节的几句：1 与 2 的英文精确断言；`fix_hint_en` 空对空；界面时间不带 ` UTC` | 相关的已有测试 | `SERVICE_W14_EN` |
| 隔离区放了 7 天以上的提醒，中英各一条精确断言（现在没有测试走到 `reminder_en`） | 隔离区所在的测试 | `SERVICE_W14_EN` |

- **获准修改的旧断言**：补单 02 里“第三根后整盘位置精确为 `space`”那一条，改成本补单的新期望；第 1.2 节几句的旧英文精确值。回执逐条写原值 → 新值 → 为什么。

## 3. 负控

照原单第 3 节，三条定义不变，在新代码上重做：
- nc1：去掉一处 `title_en`；
- nc2：空间字节计入 `found_bytes`；
- nc3：整盘位置不等空间统计就 `done`。

每条只改一处 → `--mode red-ncN` → `git checkout -- <文件>` 恢复原字节 → 立即 `--mode test`。

## 4. 命令

照原单第 4 节：`lock`、`check`、`test`、`real`，三条负控；提交干净实现后依次 `check --final`、`test --final`、`real --final`，再 `archive`。不用再跑 `baseline`。

## 5. 交回

- 回执第一行与通知完全一致：

  ```text
  WATER-W14-S1 补单 03 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w14-s1/docs/dispatch/reports/WATER-W14-S1-REPORT.md
  ```

- 受阻则写“WATER-W14-S1 补单 03 任务受阻”。
