# WATER-W10-M4 补单 01：真实冒烟改为查系统盘与本仓库所在盘（重门）

2026-11-05，总控（Claude）。回应 WATER-W10-M4 的受阻回执（回执提交 `07dc6209`）。可以新开对话执行。开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M4-CLEAN-20261105.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/m35-v1/CLEAN-M35.md`（全文），以及原票列出的仍然有效的契约；
4. 本补单（与原票、规则或 SPEC 冲突时以本补单为准）；
5. 上一轮回执 `F:/new/smaltalk/water/.worktrees/w10-m4/docs/dispatch/reports/WATER-W10-M4-REPORT.md`。

## 受阻判断

受阻成立，是总控写 SPEC 第 9 节时的疏漏：“对每个固定盘调用 `list_quarantines`”需要枚举盘符与盘的类型，而执行器的系统函数里没有这种能力，检查器的 `real` 模式（`env-only`）也不传盘符。你没有私加 `GetLogicalDrives`、`GetDriveTypeW`，也没有在示例里起 PowerShell，做法正确。真实环境里“列出各固定盘”由服务做（它已有 `Platform::drives`），执行器的冒烟不需要覆盖全部盘。

## 改动（取代 CLEAN-M35 第 9 节“真实冒烟”那一条与原票的真实冒烟描述）

- **不加任何系统函数**；系统函数仍只有原票列出的 9 个。
- `examples/real_smoke.rs`（在 `Cargo.toml` 用 `[[example]]` 登记）只查两处：
  1. 系统盘：读环境变量 `SystemDrive`（形如 `C:`），拼成 `<盘>:\.water-quarantine`；
  2. 本仓库所在的盘：取 `env!("CARGO_MANIFEST_DIR")` 的盘符，拼成 `<盘>:\.water-quarantine`；
  两者是同一个盘时只查一次。示例读这两个环境量是本补单明确允许的（规则第 2 节“生产代码不得读未列出的环境变量”管的是 `src/`，示例另按本条）。
- 对每一处调用 `list_quarantines`，输出一行 JSON：查了几处、`absent`/`present`/`unavailable` 各几处、编号目录合计几个。**不输出盘符、路径与名字**（检查器会拒收含绝对路径的输出）。
- 仍然**不移入、不复原、不删除任何真实文件**。

## 其余

- 全部照原票与 SPEC：CLEAN-M35 第 1～8 节（含精确 11 个测试），第 9 节的三条负控；没有新的获准修改项。
- **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w10-m4`（分支 `worker/water-w10-m4`），从 `07dc6209` 续做。你上一轮已把草稿撤回、源码回到首次 HEAD 的字节；归档里保存的草稿快照可以参考，但不要直接恢复那份未通过 clippy 的草稿而不复查。baseline 已通过，不用重跑。已提交的受阻回执与证据保留，不改写，只在其后新增提交。

## 命令（在工作树根目录执行）

照原票：反复用 `lock`、`check`、`test`、`real`，做完三条负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M4 --mode test
```

## 交回

改写同一份回执，第一行与原票一致：

```text
WATER-W10-M4 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m4/docs/dispatch/reports/WATER-W10-M4-REPORT.md
```

原有的受阻一节保留，新增“补单 01”一节，写：实际模型、续做起点、实现提交 SHA；SPEC 第 1～8 节逐条；每个检查命令与结果；负控（改了哪一处、失败信息、恢复后的哈希）；真实冒烟的输出；没做或没验证的事。

受阻则写“WATER-W10-M4 任务受阻”，写清冲突与最小补充需求，不要自行变通。

**本单是 C 组的第一张**：交回后接着做 C 组第二张 WATER-W10-M5（原派单句与原票不变）。
