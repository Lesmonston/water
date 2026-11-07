# WATER-W11-N4：规则说明里的 Water 改为 Flick（轻门）

2026-11-07，正式单，总控（Claude）。默认执行者：sol；N4～N7 由同一个执行者按顺序做，本单第一张。状态以[第十一波 manifest](../wave11/manifest.json) 中本单的 `status` 为准；READY 不代表已外贴。可以新开对话执行。

用户 11-07 把软件改名 Flick（“看得见的全改”）。规则数据里给用户看的说明有 23 处写着 “Water”。本单只改这些文字与数据版本。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W11-N4-RULES-20261107.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w11-n4 / worker/water-w11-n4 |
| 精确首次 HEAD | ccc584b3（tag `water-w11-n4-base-20261107`），必须干净；完整 SHA 见 manifest |
| SPEC | F:/new/smaltalk/water/contracts/w11-v1/RENAME-FLICK.md 第 2 节，与 F:/new/smaltalk/water/contracts/m35-v1/RULES-M35.md，加上本单第 1 节 |
| 规则 | F:/new/smaltalk/water/docs/dispatch/WORKER-RULES.md 与 F:/new/smaltalk/water/docs/dispatch/W11-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w11-n4/docs/dispatch/reports/WATER-W11-N4-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w11-n4/docs/acceptance/wave11/n4/ |
| 门 | 轻门：3 条负控 + check、test、real 三个 final |

先读：两份规则、SPEC 第 2 节、本单全文；`packages/junk-rules/rules/windows.json`、`packages/junk-rules/tests/rules_v1.rs`、`packages/junk-rules/README.md`。下面的行号都指 `ccc584b3`。

## 1. 要做的（全部在 `packages/junk-rules/`）

1. `rules/windows.json` 里所有以 `_zh` 结尾的字段，把 “Water” 改为 “Flick”，句子别的部分一字不动。现在有 23 处：`why_zh` 20 处、`after_zh` 3 处。
2. **不改**：非 `_zh` 字段（例如第 4091 行一带的 `ref` 来源说明里的 “Water 各工作树”）、规则 ID、模式、条件与计划 JSON 的形状。
3. `data_version` 改为 `2026-11-07.2`；`README.md` 第 7 行写版本的地方同步。
4. `src/` 不需要改。

## 2. 测试

- `packages/junk-rules/tests/rules_v1.rs`，精确 4 个测试，与 M12 相同：`rules_schema_strict`、`rules_protection_precedence`、`rules_resolve_plan`、`rules_seed_coverage`。
- **新断言**（放进 `rules_seed_coverage`，失败信息带 `RULES_W11_RENAME`）：遍历全部规则，所有 `_zh` 字段都不含 “Water”；`_zh` 字段里 “Flick” 一共出现 23 次。
- **获准修改的旧断言**（总控已预列）：
  1. 第 1142 行（`git_worktree_json` 样例的 `why_zh`）与第 1244 行（`m3d_fallback_json` 样例的 `why_zh`）里的 “Water” → “Flick”；
  2. 比对 `data_version` 的第 700、2394、2398、2402、2904、2942 行：`2026-11-07.1` → `2026-11-07.2`。

## 3. 负控

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | 任选一条规则的 `why_zh` 退回 “Water” | `RULES_W11_RENAME` |
| nc2 | 任选一条 `after_zh` 退回 “Water” | `RULES_W11_RENAME` |
| nc3 | `data_version` 退回 `2026-11-07.1` | `RULES_M35_VERSION` |

本单负控改的是 `rules/windows.json`（数据），检查器按 manifest 的 `negativeControlPaths` 认。做法：改一处 → `--mode red-ncN` → `git checkout -- <文件>` 恢复原字节 → 立即 `--mode test`。

## 4. 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W11-N4 --mode baseline
```

之后反复用 `lock`、`check`、`test`、`real`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。`real` 只读，照 M1。

## 5. 预算与边界

- 白名单：`packages/junk-rules/` 下的文件（不得改 `Cargo.toml` 的依赖与 `Cargo.lock`）；`docs/dispatch/reports/WATER-W11-N4-REPORT.md`；`docs/acceptance/wave11/n4/` 下 `--mode archive` 生成的证据。
- 原生窗口 0、选择框 0、浏览器 0；cargo 离线、单线程、私有 target。跑 cargo 前按进程名看一眼。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份、远端与历史、回执编码照通用规则第 7 节。

## 6. 交回

回执第一行与通知完全一致：

```text
WATER-W11-N4 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w11-n4/docs/dispatch/reports/WATER-W11-N4-REPORT.md
```

回执照通用规则第 7 节第 4 条写。受阻则写“WATER-W11-N4 任务受阻”。交回后接着做 N5。
