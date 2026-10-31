# WATER-W8-K3：去重体量、一次遍历与新在用方式（轻门，final 含只读真实扫描）

2026-10-31，正式单，总控（Claude）。以[第八波 manifest](../wave8/manifest.json) 中本单 `status` 为准；READY 不代表已外贴。可以新开对话执行。本单与 K1、K2、K5、K6 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W8-K3-SCAN-20261031.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w8-k3 / worker/water-w8-k3 |
| 精确首次 HEAD | 912eba100ba342c3eeb21ba555c6d589b91e6b4f，必须干净 |
| SPEC | F:/new/smaltalk/water/contracts/m3c-v1/SCAN-M3C.md（本单的全部要求） |
| 仍然有效的契约 | F:/new/smaltalk/water/contracts/checkup-v1/SCAN.md；F:/new/smaltalk/water/contracts/checkup-v1/MODEL.md 第 4、5 节；新方式的名字见 F:/new/smaltalk/water/contracts/m3c-v1/PROCESS-M3C.md 第 2 节 |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W8-M3C-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w8-k3/docs/dispatch/reports/WATER-W8-K3-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w8-k3/docs/acceptance/wave8/k3/ |
| 门 | 轻门：2 条负控 + check、test、real 三个 final |

先读：
1. 规则与 SPEC SCAN-M3C 全文，再读 SCAN 第 1、3、4 节与 MODEL 第 5 节；
2. 代码：
   - `packages/junk-scan/src/scan.rs`：`measure`（约 279～337 行）、`walk_marker`（约 444～489 行）、`merge_hits`；
   - `src/plan.rs`：`in_use` 取值校验，约第 103 行；
   - `src/native_windows.rs`：已有的 `identity_of` 与 FFI 写法；
3. 参考写法（只读）：`packages/junk-clean/src/native_windows.rs` 约 410～430 行，按目录句柄枚举、取 `FileIdExtdDirectoryInfo` 的现成做法；
4. `tests/scan_v1.rs`：现有夹具、联接与预算测试。

## 要做的（全部在 `packages/junk-scan/`）

SPEC 第 1～3 节：
1. 扫描计划认 `runs_from_or_references_item`，名单可以为空；
2. 每项去重后的体量 `unique_bytes`，组的 `unique_bytes` 与 `eligible_unique_bytes`：
   - Windows 上按目录句柄枚举取文件 ID，不逐个打开文件；
   - 旧记录读回时补齐；
3. 同一 root 上的 marker target 一次遍历，结果与原来逐个遍历完全相同。

**不变**：`total_bytes`、`file_count`、`newest_activity` 的口径，合并与可清理判定，排序，预算与取消，结果版本号，依赖。

## 白名单

- `packages/junk-scan/` 下的文件（不得改 `Cargo.toml` 的依赖、`Cargo.lock`）
- `docs/dispatch/reports/WATER-W8-K3-REPORT.md`
- `docs/acceptance/wave8/k3/` 下 `--mode archive` 生成的证据

## 测试

`packages/junk-scan/tests/scan_v1.rs`，仍是精确 5 个测试，名字不变：`scan_plan_contract`、`scan_pattern_marker_discovery`、`scan_overlap_and_guards`、`scan_reparse_budget_cancel`、`scan_snapshot_growth_keys`。新断言照 SPEC 第 4 节加在已有测试里，失败信息带 `SCAN_M3C_MODE`、`SCAN_M3C_UNIQUE`、`SCAN_M3C_SINGLE_WALK`、`SCAN_M3C_COMPAT`。原有断言不变。

## 负控

| 负控 | 让什么失效（举例，选一处） | 标记 |
|---|---|---|
| nc1 | 去重不生效，每个文件都按长度计入 | `SCAN_M3C_UNIQUE` |
| nc2 | `result_from_json` 要求新字段必须存在 | `SCAN_M3C_COMPAT` |

只改 `packages/junk-scan/src/` 里一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode test`。

## 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K3 --mode baseline
```

之后反复用 `lock`、`check`、`test`，做完两条负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

`real --final` 按检查器生成的真实计划对本机做一次只读扫描，只输出组级汇总，不含路径；用时与访问条目数写入回执，并与改动前的基线对比。

## 预算与边界

- 原生窗口 0、选择框 0。
- cargo 离线、单线程、私有 target，不下载。
- 硬链接夹具用 `cmd /c mklink /H`；不创建符号链接；只删除本次新建的夹具目录。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字，不借用人类作者身份。
- **远端与历史**：
  - 不 push 到任何远端，不添加或修改 git 远端与配置；
  - 不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；
  - 提交信息写错就在回执里说明，不要改写。

## 交回

回执第一行与通知完全一致：

```text
WATER-W8-K3 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k3/docs/dispatch/reports/WATER-W8-K3-REPORT.md
```

回执要写：
- 实际模型、实现提交 SHA；
- SPEC 第 1～3 节逐条：改了哪里、怎么满足；
- 新增的系统调用、访问权限与信息类；
- 每个检查命令与结果；
- `real` 的组级汇总、用时、访问条目数，以及与基线的对比；
- 负控：改了哪一处、失败信息、恢复后的哈希；
- 没做或没验证的事。

受阻则同一路径写“WATER-W8-K3 任务受阻”，写清冲突与最小补充需求，不要自行变通。
