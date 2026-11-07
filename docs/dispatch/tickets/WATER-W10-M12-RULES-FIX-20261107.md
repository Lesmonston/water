# WATER-W10-M12：规则补修，“安装包”只认安装程序（轻门）

2026-11-07，正式单，总控（Claude）。执行者：astra（用户 11-07 派；后端单默认是 sol）。状态以[第十波 manifest](../wave10/manifest.json) 中本单的 `status` 为准；READY 不代表已外贴。可以新开对话执行。

## 0. 背景

M3.5 收口时总控用 release 版做了真实只读体检，见[收口报告](../../acceptance/wave10/controller/WATER-M35-CLOSE-20261107.md)第 2.3 节 R1：
- “安装包”组可清的 28 项里只有 1 个真安装包。
- 其余都是被第 19 条规则第二个定位器 `*#*.exe`、`*install*.exe` 认进来的，包括：已装软件的卸载程序 `unins000.exe`、`Uninstall.exe`，CPU-Z 本体 `cpuz_x64.exe`，Python 与 setuptools 的启动程序 `cli-32.exe`、`f2py.exe`，代理软件的服务工具 `install-service.exe`。

本单只改这条规则的数据。另外两张单配合：
- M13 收紧扫描里泄漏簇的识别；
- M14 让服务把程序目录里的文件挡在外面。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M12-RULES-FIX-20261107.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w10-m12 / worker/water-w10-m12 |
| 精确首次 HEAD | 98f9678e（tag `water-w10-m12-base-20261107`），必须干净；完整 SHA 见 manifest |
| SPEC | F:/new/smaltalk/water/contracts/m35-v1/RULES-M35.md，加上本单第 1 节的补充（本单优先） |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md；没有预列、却因本单必然要变的旧断言，按 F:/new/smaltalk/water/docs/dispatch/WORKER-RULES.md 第 3 节直接迁移（不得变弱），回执逐条写原值与新值 |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w10-m12/docs/dispatch/reports/WATER-W10-M12-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w10-m12/docs/acceptance/wave10/m12/ |
| 门 | 轻门：2 条负控 + check、test、real 三个 final |

先读：
1. 规则、SPEC 第 6 节（第 19 行与说明第 186 行）、第 9、10 节。
2. `packages/junk-rules/rules/windows.json` 里 `installer-files` 一条（第 5893～5953 行）、`packages/junk-rules/tests/rules_v1.rs`、`packages/junk-rules/README.md`。

下面的行号都指 `98f9678e`。

## 1. 要做的（全部在 `packages/junk-rules/`）

1. **`installer-files` 第二个定位器的模式**改为下面三个，顺序照写：
   - `*setup*.exe`
   - `*installer*.exe`
   - `*#.#*.exe`（名字里有“数字.数字”的版本号，`#` 是一串数字）

   条件 `parent_lacks_file_matching` `*.dll` 不变；`max_depth` 3 不变；第一个定位器不变。这样：
   - 仍然认的：`MostLogin-setup.exe`、`Mirasim-0.0.783.exe`、`WorkBuddy 5.1.0.exe`、`cc-switch_installer.exe`；
   - 不再认的：`unins000.exe`、`Uninstall.exe`、`install-service.exe`、`clash-verge-service-install.exe`、`cpuz_x64.exe`、`cli-32.exe`、`f2py.exe`、`ct2-marian-converter.exe`。

   模式怎么匹配由扫描包决定，M13 会用这些名字测；本单只管数据。
2. **`why_zh`** 改为：`程序文件名要带 setup、installer 或版本号（如 5.1.0），且旁边没有动态库；卸载程序和程序自带的小工具不算。`
3. **`data_version`** 改为 `2026-11-07.1`；README 里写版本的那一行同步。
4. **SPEC 补充**：RULES-M35 第 6 节第 19 行第二个定位器、说明第 186 行，以本条为准。

**不变**：
- 别的规则、校验与计划 JSON 的形状；
- `src/` 不需要改。若发现非改不可，先写受阻回执。

## 2. 白名单

- `packages/junk-rules/` 下的文件（不得改 `Cargo.toml` 的依赖与 `Cargo.lock`）
- `docs/dispatch/reports/WATER-W10-M12-REPORT.md`
- `docs/acceptance/wave10/m12/` 下 `--mode archive` 生成的证据

## 3. 测试

- `packages/junk-rules/tests/rules_v1.rs`，精确 4 个测试，与 M1 相同：`rules_schema_strict`、`rules_protection_precedence`、`rules_resolve_plan`、`rules_seed_coverage`。
- **新断言**（失败信息带 `RULES_M35_SEEDS`，放进 `rules_seed_coverage`）：`installer-files` 第二个定位器正好是第 1 条的三个模式、顺序一致，不含 `*#*.exe` 与 `*install*.exe`；条件仍是 `parent_lacks_file_matching` `*.dll`。
- **获准修改的旧断言**（总控已预列）：
  1. 第 723 行种子表里 `installer-files` 那一行的定位器文字，改成新模式；
  2. 比对 `data_version` 的第 700、2394、2398、2866、2904 行，改成 `2026-11-07.1`。

## 4. 负控

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | `windows.json` 里第二个定位器加回 `*#*.exe` | `RULES_M35_SEEDS` |
| nc2 | `data_version` 退回 `2026-11-02.2` | `RULES_M35_VERSION` |

本单的负控改的是 `rules/windows.json`，不是 `src/`（本单只改数据）。做法：改一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

11-07 12:25 补：检查器原来要求 Rust 负控必须改 `src/`，与上面冲突（执行者受阻回执 `5f2b1885`）。总控已改检查器：按 manifest 里本单的 `negativeControlPaths`（`packages/junk-rules/src` 或 `packages/junk-rules/rules/windows.json`）判断。禁止改测试、失败标记、恢复后变绿等别的核验都不变（原文误写成“不禁止改测试”，执行者按续做句的“不许改测试”执行）。从 `5f2b1885` 续做，不用重跑 baseline。

## 5. 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M12 --mode baseline
```

之后反复用 `lock`、`check`、`test`、`real`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。`real` 只读，照 M1。

## 6. 预算与边界

- 原生窗口 0、选择框 0、浏览器 0；cargo 离线、单线程、私有 target，不下载，不联网。
- 跑测试前按进程名看一眼，没有别的 cargo 检查进程。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 7. 交回

回执第一行与通知完全一致：

```text
WATER-W10-M12 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m12/docs/dispatch/reports/WATER-W10-M12-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- 第 1 节逐条做了什么；
- 每个检查命令与结果；
- 每条改过的旧断言的原值与新值；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则写“WATER-W10-M12 任务受阻”，写清冲突与最小补充需求。
