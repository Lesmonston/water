# WATER-W4-G1：清理执行器加固（`water-junk-clean` 第 2 版，重门）

2026-10-26，正式票，总控（Claude）。以 [第四波 manifest](../wave4/manifest.json) 中本票 `status` 为准；READY 不代表已外贴。**特殊票：可以在新对话里执行，要写较多 Windows NT 系统调用，建议交给 Rust 与 Windows 底层能力强的模型。** 本票与 F3、G2、G3 同时进行，各改各的目录。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W4-G1-CLEAN-HARDENING-20261026.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w4-g1 / worker/water-w4-g1 |
| 精确首次 HEAD | 0ca42f8e8038a5a7816802c5a7f175a966b0625c（标签 water-w4-hardening-base-20261026），必须干净；`packages/junk-clean` 是已验收的第二波 D |
| SPEC | F:/new/smaltalk/water/contracts/hardening-v1/CLEAN-HARDENING.md |
| 被覆盖的原契约 | F:/new/smaltalk/water/contracts/checkup-v1/CLEAN.md 与 D 补单 01：F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W2-D-ADDENDUM-01-20261026.md |
| 共享模型 | F:/new/smaltalk/water/contracts/checkup-v1/MODEL.md |
| 规则 | F:/new/smaltalk/water/docs/dispatch/W4-HARDENING-WORKER-RULES.md |
| 计划 | F:/new/smaltalk/water/docs/dispatch/wave4/PLAN.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w4-g1/docs/dispatch/reports/WATER-W4-G1-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w4-g1/docs/acceptance/wave4/g1/ |
| 门 | 重门：3 条负控 + 总控独立复核 |

先读规则、计划、SPEC（**特别是第 11 节附录**：总控已在本机实测过的结构体布局、常量与两处坑），再读 CLEAN 与 D 补单 01，然后读已验收的代码：`packages/junk-clean/src/`（`lib.rs`、`native_windows.rs`、`path.rs`）与 `tests/clean_v1.rs`。

## 本票要点（重门）

- **按句柄删除**：
  - `src/` 里**不得出现 `std::fs`、`Path`、`PathBuf` 与任何按路径的文件操作**，检查器会拒绝；
  - 从盘根逐级相对打开到条目，按句柄快照、按句柄删除；
  - 目录用不含删除共享的句柄持有，删除前用 FileId 复核。
- **非链接型重解析点不删**：
  - 只有名称代理位为 1 的链接（联接、符号链接）只删链接本身；
  - 其它标签（云文件占位符等）出现在条目里，整项 `reparse`，一个字节都不删。
- **守卫与保护路径按身份比对**：执行开始时跟随链接解析硬守卫与保护路径的身份；子树或祖先命中即跳过。文本判断照旧保留。
- **删除方式**：扩展删除标记（POSIX、忽略只读），不再改只读属性；不支持时退回普通标记。
- **长路径**：现有 D 遇到超过 260 个字符的路径会整项失败（总控自测实测）。按句柄相对打开不受此限；仍按路径打开的三处要加 `\\?\` 前缀。
- **系统函数白名单**：只能声明 SPEC 第 8 节的 8 个函数，检查器逐个核对。
- **公开 API、计划校验、报告与日志格式都不变**。服务（G2）按原接口编译。
- 用户用联接搬过的配置目录维持“不进入、不清理”（`outside_root`），本票不改。

## 白名单

- `packages/junk-clean/` 下已有的文件（`Cargo.toml` 的依赖不改；`Cargo.lock` 不应变化）
- `docs/dispatch/reports/WATER-W4-G1-REPORT.md`
- `docs/acceptance/wave4/g1/` 下 `--mode archive` 生成的证据

其余一律只读，包括契约、检查入口、台账、其它 packages、apps 与其它工作树。

## 唯一测试

`packages/junk-clean/tests/clean_v1.rs`，测试目标名 `clean_v1`，精确 6 个：
- 原有 5 个：`clean_plan_contract`、`clean_revalidation_skips`、`clean_no_follow`、`clean_partial_stop_journal`、`clean_report_volume`；
- 新增：`clean_handle_hardening`，内容按 SPEC 第 9 节。

**测试计划里的 root 一律位于本树 `.local/w2-d-fixtures/` 下本次新建的随机目录之内；任何真实用户位置都不得出现在测试代码里。** 测试只可启动 SPEC 第 9 节列出的两种进程：`cmd /D /C mklink /J` 造联接，PowerShell 设置自定义标签，都只作用于本次夹具。

## 命令顺序（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G1 --mode baseline
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G1 --mode lock
```

1. 反复使用 `--mode check` 与 `--mode test`。`check` 会拒绝 `src/` 里的路径式文件操作与白名单外的系统函数。
2. 三条负控，每条只改 `src/` 里真正被调用的一处，失败信息必须含目标标记；然后立即 `git checkout` 恢复原字节，再跑一次 `--mode test`：

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | 把任何重解析点都当链接（不看名称代理位） | `CLEAN_REPARSE_KIND` |
| nc2 | 去掉按身份比对守卫与保护路径 | `CLEAN_GUARD_ID` |
| nc3 | 删除时进入名称代理链接而不是只删链接本身 | `CLEAN_NO_FOLLOW` |

提交干净实现后依次运行：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G1 --mode check --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G1 --mode test --final
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G1 --mode archive
```

## 预算与边界

- 原生窗口 0、选择框 0、浏览器 0。
- Rust 离线、jobs 1、私有目录。
- 不下载，不改网络与全局配置，不读取任何真实用户位置。
- 不 push、不 merge、不 rebase，不改主线台账。

## 交回

回执第一行与通知完全一致：

```text
WATER-W4-G1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w4-g1/docs/dispatch/reports/WATER-W4-G1-REPORT.md
```

回执要写：
- 实际模型；
- 实现提交 SHA；
- 逐条对照 SPEC 第 3～10 节；
- 实际声明的系统函数清单；
- 每个检查命令与结果；
- 三条负控：改了哪一处、失败信息、恢复后的哈希；
- 做不到确定构造、只能靠审代码的部分（例如删除阶段的竞态窗口），写清做法与理由；
- 没做或没验证的事。

受阻则同一路径写“WATER-W4-G1 任务受阻”，写清具体冲突与最小补充需求，不要自行变通。完成只进入 SUBMITTED，由总控复核后才算 VERIFIED。
