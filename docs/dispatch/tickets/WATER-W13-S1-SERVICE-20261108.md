# WATER-W13-S1：服务，跳过不过期、跳过的簇、日志收尾（中门）

2026-11-08，正式单，总控（Claude）。默认执行者：sol。状态以[第十三波 manifest](../wave13/manifest.json) 中本单的 `status` 为准。可以新开对话执行。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W13-S1-SERVICE-20261108.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w13-s1 / worker/water-w13-s1 |
| 精确首次 HEAD | tag `water-w13-s1-base-20261108`，必须干净；完整 SHA 见 manifest |
| SPEC | F:/new/smaltalk/water/contracts/w13-v1/W13.md 第 0、2 节；背景 F:/new/smaltalk/water/contracts/w12-v1/W12.md 第 1、4.4 节与 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W12-P2-ADDENDUM-01-20261107.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/WORKER-RULES.md 与 F:/new/smaltalk/water/docs/dispatch/W13-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/desktop-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w13-s1/docs/dispatch/reports/WATER-W13-S1-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w13-s1/docs/acceptance/wave13/s1/ |
| 门 | 中门：3 条负控 + check、test、real 三个 final |

**先读**：

- 两份规则、W13 第 0、2 节、本单全文；
- `packages/water-service/src/service.rs`：`invalidate_skips`（第 949 行一带）、`diagnostics`；
- `src/m35.rs`：`invalidate`；
- `src/conclusion.rs`：第 1960 行一带线索那里的跳过判断、`clusters`、卡片的筛选；
- `src/clean.rs`：`start_with_executor` 里隔离批次的循环（第 600～680 行一带）、`save_result`、`apply_quarantines`（第 1000～1050 行一带）；
- `tests/service_v1.rs`：`m35_clean_split`、`m35_conclusion_cards`、`service_trends_locations`，以及 `SERVICE_W12_SKIP`、`SERVICE_W12_RECORD` 所在的测试。

背景：

- 主线上的执行器已是第十二波 P1 之后的版本：动过之后日志写不进，照样交回带 `journal_error` 的报告；第一条 intent 就写不进时返回 `Err(Journal)`。
- 第十二波 P2 已合入：跳过单位、日志中断后不再跑后面的隔离批次。

## 1. 要做的（全部在 `packages/water-service/`）

1. **跳过之后结论不过期**（W13 第 2.1 节）：
   - `invalidate_skips` 不再调 `m35::invalidate`（它把整次体检标为过期）；
   - 改为只把已准备的计划作废、结论版本加一；
   - 计划作废后 `clean_start` 返回 `stale`，过期原因照旧“跳过名单变了”；
   - 其它调 `m35::invalidate` 的地方不动。
2. **整组被跳过的泄漏簇**（W13 第 2.2 节）：
   - “簇的成员是否都被跳过”改为按跳过记录本身判断（`Skipped::matches`），不再要求成员原本可清；
   - 卡片、线索、趋势页的簇列表都照这个判断；
   - 只有部分成员符合时照原样出。
3. **日志与隔离的收尾**（W13 第 2.3 节）：
   - 后面的隔离批次整次返回 `Err(Journal)` 时：如果之前已做过动作（直接删除或前面的批次有 `deleted`、`partial`、`moved` 的条目，0 字节也算），照补单 01 的做法：这一批与后面的批次都不再调执行器，条目计入 N，记录照存，状态 `stopped`。
   - 判断“做过动作”改看条目状态，不再看 `moved` 的字节数。
   - `journal_note_zh` 在 N = 0 时写“清理日志没写全，这次要清的都已处理”。
   - “没能放进隔离区：<原因>”的原因照 W13 第 2.3 节的表给中文，不再用执行器错误的英文。
   - 一项都没进隔离区时，结果里的 `quarantined` 为 null。
4. **公开前的写法**（W13 第 0 节），本目录里顺手改：
   - `README.md` 第 7 行一带写的是派单时的检查命令与本机路径，改成通用的构建与测试说明；
   - 全目录里若还有工单号、本机路径、私有文档路径，一并改掉，回执列出改了哪些文件。

## 2. 测试（`tests/service_v1.rs`，测试个数不变，新断言加在已有函数里）

照 W13 第 2.4 节：

| 内容 | 放在 | 标记 |
|---|---|---|
| 跳过一张卡后不过期、版本加一、别的卡还能决定；跳过前准备的计划 `clean_start` 返回 `stale`；移除后不过期、条目恢复 | `m35_conclusion_cards` 或跳过单位所在的测试 | `SERVICE_W13_FRESH` |
| 簇里有不到 24 小时的成员时，从卡片跳过整组，线索、卡片与趋势页的簇都没了；只跳过部分成员时线索还在 | 跳过单位所在的测试 | `SERVICE_W13_CLUE` |
| 经过 `clean_start` 调用执行器那一层注入：前一批动过一项、后一批返回 `Err(Journal)`、再后一批；后两批没调执行器，N 精确，记录可读。另三条：前面只动过 0 字节的项；N = 0 的措辞；各错误的中文原因；全部未跑时 `quarantined` 为 null | `m35_clean_split` | `SERVICE_W13_JOURNAL` |

- 注入办法照第十二波 P2 已有的测试替身（`JournalStopsExecutor` 一类），经过 `start_with_executor`，不要只测一个抽出来的小函数。
- **获准修改的旧断言**：
  - 第 5574～5577 行一带：`SERVICE_M35_CONCLUSION: skip stale`，跳过后 `stale_reason_zh` 为“跳过名单变了”。改为结论不过期，跳过前准备的计划作废。
  - 第十二波跳过单位测试里，“跳过后结论过期”的断言同样迁移。
  - 隔离失败说明里写英文原因的断言，改为中文。
  - 全部未跑时 `quarantined` 不为 null 的断言，改为 null。

  回执逐条写原值 → 新值 → 为什么。
- **`service_trends_locations`**（第 1412 行起）：
  - 现状：第二次扫描的结束时间是假时钟加真实耗时，机器忙时会晚于假时钟的“现在”，趋势页把它筛掉，第 1447 行“2 个点”就失败。
  - 改测试，让结果不受真实耗时影响：例如取趋势前把假时钟往后拨一分钟。
  - 不改产品代码，不加墙钟时限；回执写清改法。

## 3. 负控（改 `src/`）

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | `invalidate_skips` 恢复调 `m35::invalidate`（跳过后整次过期） | `SERVICE_W13_FRESH` |
| nc2 | 簇的“都被跳过”恢复按“原本可清且被跳过”判断 | `SERVICE_W13_CLUE` |
| nc3 | 后面批次返回 `Err(Journal)` 时照旧标失败组、继续跑再后面的批次 | `SERVICE_W13_JOURNAL` |

每条只改一处 → `--mode red-ncN` → `git checkout -- <文件>` 恢复原字节 → 立即 `--mode test`。

## 4. 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W13-S1 --mode baseline
```

之后反复用 `lock`、`check`、`test`、`real`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。`real` 是一次只读真实体检，清理关闭，输出只有计数。

## 5. 预算与边界

- **白名单**：
  - `packages/water-service/` 下的 `src/`、`tests/service_v1.rs`、`README.md`；
  - `docs/dispatch/reports/WATER-W13-S1-REPORT.md`；
  - `docs/acceptance/wave13/s1/` 下 `--mode archive` 生成的证据。
- **不改**：IPC 的命令与键、三份 `contracts/*/ui-fixtures*.json`、`Cargo.toml`、`Cargo.lock`、执行器与其它包。
- 原生窗口 0、选择框 0、浏览器 0；cargo 离线、单线程、私有 target。
- 不 merge、不 rebase，不改台账、契约、检查器。
- 提交身份、远端与历史、回执编码照通用规则第 7 节。

## 6. 交回

回执第一行与通知完全一致：

```text
WATER-W13-S1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w13-s1/docs/dispatch/reports/WATER-W13-S1-REPORT.md
```

回执照通用规则第 7 节第 4 条写。受阻则写“WATER-W13-S1 任务受阻”。
