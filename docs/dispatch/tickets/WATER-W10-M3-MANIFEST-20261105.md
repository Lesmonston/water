# WATER-W10-M3：新包：项目清理声明与工作树登记（中门（新包））

2026-11-05，正式单，总控（Claude）。以[第十波 manifest](../wave10/manifest.json) 中本单 `status` 为准；READY 不代表已外贴。可以新开对话执行。本单与第一批另外七张单同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M3-MANIFEST-20261105.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w10-m3 / worker/water-w10-m3 |
| 精确首次 HEAD | f93afb8e3c5cf4114927fe2ab6c14dbb033c7ffe，必须干净 |
| SPEC | F:/new/smaltalk/water/contracts/m35-v1/MANIFEST-M35.md（本单的全部要求） |
| 仍然有效、要读的 | F:/new/smaltalk/water/docs/decisions/ADR-019-project-declarations-and-quarantine.md；转出的扫描目标要符合 SCAN-M35 第 1 节（只读）：F:/new/smaltalk/water/contracts/m35-v1/SCAN-M35.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w10-m3/docs/dispatch/reports/WATER-W10-M3-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w10-m3/docs/acceptance/wave10/m3/ |
| 门 | 中门（新包）：2 条负控 + check、test、real 三个 final |

先读：
1. 规则与 SPEC 全文，再读上表“仍然有效”的契约；[第十波计划](../wave10/PLAN.md)第 2 节第 23、57、58、60、61 行（来由）；
2. 代码：`packages/junk-scan/src/plan.rs`（只读：计划 JSON 的目标格式与段语法）。

## 要做的（全部在 `packages/cleanup-manifest/`）

1. SPEC 第 1 节：新建包与边界；
2. 第 2、3 节：声明文件第一版与路径模式；
3. 第 4 节：`to_targets`；
4. 第 5 节：`protects`；
5. 第 6 节：`read_git_link`；
6. 第 7 节：读文件、`parse`、自己实现的 `sha256_hex`；
7. 新建 `examples/real_smoke.rs`（在 `Cargo.toml` 用 `[[example]]` 登记；检查器的 `real` 模式不带参数运行它，输出一行 JSON，不得含绝对路径）；

**不变**：只读 `.water-cleanup.json` 与 `.git` 小文件；不写、不建、不删、不起进程、不联网；依赖只有 serde 与 serde_json。

## 白名单

- `packages/cleanup-manifest/` 下的文件（新包：`Cargo.toml` 照规则第 2 节自己写，锁文件用 `--mode lock` 生成）
- `docs/dispatch/reports/WATER-W10-M3-REPORT.md`
- `docs/acceptance/wave10/m3/` 下 `--mode archive` 生成的证据

## 测试

`packages/cleanup-manifest/tests/manifest_v1.rs`，精确 4 个测试：`manifest_parse_contract`、`manifest_targets_and_protect`、`manifest_read_files`、`manifest_git_link`。
- 新断言照 SPEC 的测试一节放进指定的测试，失败信息带 `MANIFEST_FORMAT`、`MANIFEST_TARGETS`、`MANIFEST_PROTECT`、`MANIFEST_READ`、`MANIFEST_GITDIR`。
- 夹具照规则第 3 节：只在本树 `.local/` 下，用完只删本次新建的那一个目录。
- 没有获准修改的旧断言（新包）。

## 负控

| 负控 | 让什么失效（SPEC 给的例子，可选更窄的一处） | 标记 |
|---|---|---|
| nc1 | 路径模式放行 `..` | `MANIFEST_FORMAT` |
| nc2 | `to_targets` 不看 `trusted` | `MANIFEST_TARGETS` |

只改 `packages/cleanup-manifest/` 的生产代码一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。要找只有新断言才抓得到的位置。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M3 --mode baseline
```

之后反复用 `lock`、`check`、`test`、`real`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

`real --final` 只读本仓库 `.worktrees\` 下 `.git` 小文件的三种状态个数；仓库根有声明文件时读一次，只输出有效与否、条目数与哈希前 8 位。

## 预算与边界

- 系统函数：没有系统函数（`#![forbid(unsafe_code)]`）。
- 原生窗口 0、选择框 0、浏览器 0。
- cargo 离线、单线程、私有 target，不下载；不需要联网查资料。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字，不借用人类作者身份。
- **远端与历史**：不 push 到任何远端，不添加或修改 git 远端与配置；不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W10-M3 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m3/docs/dispatch/reports/WATER-W10-M3-REPORT.md
```

回执要写：实际模型、实现提交 SHA；SPEC 逐节：改了哪里、怎么满足；改过的旧断言（原值与新值）；每个检查命令与结果；负控（改了哪一处、失败信息、恢复后的哈希）；真实冒烟或整机检查的结果；没做或没验证的事。
