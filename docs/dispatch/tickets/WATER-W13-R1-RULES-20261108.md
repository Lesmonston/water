# WATER-W13-R1：规则，依据的写法与条数一处（轻门）

2026-11-08，正式单，总控（Claude）。默认执行者：sol。状态以[第十三波 manifest](../wave13/manifest.json) 中本单的 `status` 为准。可以新开对话执行。

开源发布时，规则数据会原样进公开仓库。现在 119 条“本机观察”的依据里有 88 条：

- 写了“总控”、私有文档路径或本机项目名；
- 或者只写了一个内部编号（如 `C13`）。

另外，规则条数与数据版本在测试里写死了 9 处，贡献者加一条规则要改好几处。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W13-R1-RULES-20261108.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w13-r1 / worker/water-w13-r1 |
| 精确首次 HEAD | tag `water-w13-r1-base-20261108`，必须干净；完整 SHA 见 manifest |
| SPEC | F:/new/smaltalk/water/contracts/w13-v1/W13.md 第 0、3 节；规则格式见 F:/new/smaltalk/water/contracts/m35-v1/RULES-M35.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/WORKER-RULES.md 与 F:/new/smaltalk/water/docs/dispatch/W13-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w13-r1/docs/dispatch/reports/WATER-W13-R1-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w13-r1/docs/acceptance/wave13/r1/ |
| 门 | 轻门：2 条负控 + check、test、real 三个 final |

**先读**：两份规则、W13 第 0、3 节、本单全文；`packages/junk-rules/rules/windows.json`（每条规则的 `sources`）、`tests/rules_v1.rs`、`README.md`。

## 1. 要做的（全部在 `packages/junk-rules/`）

### 1.1 改写“本机观察”的依据

照 W13 第 3.1 节，`kind` 为 `local_observation` 的 `ref` 依次写：

1. 日期（`YYYY-MM-DD`）；
2. “维护者本机只读检查”或“维护者本机清理”；
3. 看到了什么。

| 原来的样子 | 改成 |
|---|---|
| “2026-10-26 总控本机只读摸底” | “2026-10-26 维护者本机只读检查” |
| “2026-11-07 总控 C 盘只读调查” | “2026-11-07 维护者本机只读检查（C 盘）” |
| “… 总控本机只读核查：`.local/share/claude` 共 718 MB，versions 下有 …” | “2026-10-28 维护者本机只读检查：Claude Code 本地目录共 718 MB，versions 下有 …”（路径改为文字，数字照旧） |
| 写了私有文档路径的（清理记录、场景复现报告等） | 去掉文档路径，只写当天看到的现象与数字；日期取原文里的日期或 `checked_on` |
| 只写编号的（`C13`、`C14`、`C17（…）`、“ADR-019 第 5 节、H1”） | 日期取 `checked_on`，写“维护者本机清理时确认：<这条规则所说的现象>”，不写编号，不写括号里的路径 |

- 不写：路径分隔符 `\` 与 `/`、“总控”，以及 W13 第 0 节列的那些（本机用户名、本机路径、本机项目名、私人邮箱、私有流程的引用）。
- 目录名可以写，但不带路径：例如“`.kimi-code` 的 `bin` 里有 `kimi.exe.bak`”可以写成“Kimi Code 程序目录里的 kimi.exe.bak”。
- `official_doc` 的网址、`skill` 的写法、`checked_on` 都不变。
- 规则的条数、`rule_id`、定位、等级、在用、文案都不变。
- `data_version` 改为 `2026-11-08.1`。

### 1.2 条数与版本只断言一处

- `tests/rules_v1.rs` 顶部定义两个常量：规则条数（现为 118）与数据版本（`2026-11-08.1`）。
- 第 988、1105、2485 行一带的 118，第 1063、2771、2775、2779、3309、3347 行一带的数据版本，都改为引用常量。以后加规则只改这两个常量。

### 1.3 公开前的写法（W13 第 0 节）

- `README.md` 里第十波的阶段说法改成功能说明。
- 全目录里若还有工单号、本机路径、私有文档路径，一并改掉，回执列出改了哪些文件。

## 2. 测试（`tests/rules_v1.rs`，测试个数不变，新断言加在已有函数里）

| 内容 | 放在 | 标记 |
|---|---|---|
| 每条规则每个 `local_observation` 的 `ref` 都以 `YYYY-MM-DD` 开头，且不含 `\` 与 `/` | `m35_seeds` | `RULES_W13_SOURCES` |
| 数据版本为 `2026-11-08.1`、条数为常量 | 原处 | 原标记 |

- **获准修改的旧断言**：
  - 第 1.2 节列的 9 处字面值改为引用常量；
  - 依据文字的断言（第 1031、1495、1523、1623、1634、3506～3518、3658～3659 行一带）照新写法迁移。

  回执逐条写原值 → 新值 → 为什么。
- 测试里的依据文字同样照 W13 第 0 节写。

## 3. 负控（改 `rules/windows.json`）

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | 任挑一条 `local_observation` 的 `ref`，去掉开头的日期 | `RULES_W13_SOURCES` |
| nc2 | 任挑一条 `local_observation` 的 `ref`，加进一个 `\` | `RULES_W13_SOURCES` |

每条只改一处 → `--mode red-ncN` → `git checkout -- <文件>` 恢复原字节 → 立即 `--mode test`。

## 4. 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W13-R1 --mode baseline
```

之后反复用 `lock`、`check`、`test`、`real`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。`real` 只看已知目录是否存在，输出只有计数。

## 5. 预算与边界

- **白名单**：
  - `packages/junk-rules/` 下的 `rules/windows.json`、`tests/rules_v1.rs`、`README.md`；
  - `docs/dispatch/reports/WATER-W13-R1-REPORT.md`；
  - `docs/acceptance/wave13/r1/` 下 `--mode archive` 生成的证据。
- **不改** `src/`。
- 原生窗口 0、选择框 0、浏览器 0；cargo 离线、单线程、私有 target。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份、远端与历史、回执编码照通用规则第 7 节。

## 6. 交回

回执第一行与通知完全一致：

```text
WATER-W13-R1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w13-r1/docs/dispatch/reports/WATER-W13-R1-REPORT.md
```

回执照通用规则第 7 节第 4 条写。受阻则写“WATER-W13-R1 任务受阻”。
