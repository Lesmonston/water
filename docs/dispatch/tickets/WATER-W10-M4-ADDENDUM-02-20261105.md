# WATER-W10-M4 补单 02：句柄相对改名改用 `NtSetInformationFile` 类 10（重门）

2026-11-05，总控（Claude）。回应 WATER-W10-M4 补单 01 之后的再次受阻（回执提交 `12c6c556`）。可以新开对话执行。开工前依次读：
1. 原票 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M4-CLEAN-20261105.md`；
2. 规则 `F:/new/smaltalk/water/docs/dispatch/W10-M35-WORKER-RULES.md`；
3. SPEC `F:/new/smaltalk/water/contracts/m35-v1/CLEAN-M35.md`（全文），以及原票列出的仍然有效的契约；
4. 补单 01 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M4-ADDENDUM-01-20261105.md`（真实冒烟只查系统盘与本仓库所在盘，仍然有效）；
5. 本补单（与原票、规则、SPEC 或补单 01 冲突时以本补单为准）；
6. 上一轮回执 `F:/new/smaltalk/water/.worktrees/w10-m4/docs/dispatch/reports/WATER-W10-M4-REPORT.md`；
7. 总控的核对脚本与输出 `F:/new/smaltalk/water/docs/acceptance/wave10/controller/m4-rename-probe-20261105/`（`probe.ps1`、`probe-output.txt`）。

## 受阻判断

受阻成立，是 SPEC 第 1 节选错了原语。总控在本机用合成文件核对（脚本与输出见上面第 7 项）：

| 写法 | 文件 | 目录 |
|---|---|---|
| `SetFileInformationByHandle` 类 3，目录句柄 + 单段名 | 错误 87 | 错误 87 |
| `SetFileInformationByHandle` 类 22，目录句柄 + 单段名 | 错误 87 | 错误 87 |
| `SetFileInformationByHandle` 类 3，无目录句柄 + 完整路径 | 成功 | 成功 |
| `NtSetInformationFile` 类 10（FileRenameInformation），目录句柄 + 单段名 | **成功** | **成功** |

也就是说，Win32 这一层只要 `RootDirectory` 不为空就拒收，与你的缓冲区布局无关；你的布局（标志在 0、父句柄在 8、名字字节数在 16、名字在 20、8 字节对齐）是对的。同一缓冲区交给 ntdll 的类 10 就能用。完整路径的写法回到了按路径改名，不采用。

## 改动（取代 CLEAN-M35 第 1 节关于改名的两条）

1. **`rename_at` 改用 `NtSetInformationFile`**，信息类恒为 **10**（FileRenameInformation）：
   - 缓冲区就是你现有的那份：`ReplaceIfExists` 在偏移 0、恒为 0；`RootDirectory` 在偏移 8，填目的地上级的句柄；`FileNameLength` 在偏移 16，是名字的字节数（不含结尾零）；单段 UTF-16 名字从偏移 20 开始；长度用 `24 + 名字字节数`，缓冲区 8 字节对齐。
   - 状态不为 0 时用已有的 `RtlNtStatusToDosError` 换成 Win32 错误码，再按 SPEC 第 3 节第 8 步原样对应。总控核对过：同名已存在得 183（→ `destination_exists`，原有的那个不动、源也不动），跨盘得 17（→ `not_same_volume`）。
   - 目的地上级句柄不需要“添加文件/子目录”的访问权限，按你现在打开上级链的方式即可。
2. **系统函数清单加一个**：`NtSetInformationFile`（总控已在第十波清单的本单 `allowedFfi` 里加上，共 10 个）。它在 `src/` 里**只出现在 `rename_at` 一个函数里**，只传类 10。
3. `SetFileInformationByHandle` 不再用于改名，只剩类 4、21（删除标志）；**不得**再传类 3，也不得传别的类。
4. 其余仍然禁止：`DeleteFileW`、`RemoveDirectoryW`、`MoveFile*`、`CopyFile*`、`DeviceIoControl`、`FindFirstFile*`、`CreateDirectory*`、`WriteFile`，以及 `NtSetInformationFile` 的任何其它类。不用完整路径改名，也不跨盘复制。
5. 草稿里为定位 87 加的 `eprintln!("CLEAN_M35_RENAME_NATIVE …")` 去掉：生产代码不往标准错误打印。测试里给失败断言附带的完整报告可以保留。
6. **负控 nc1 不变**：把 `rename_at` 缓冲区偏移 0 的 `ReplaceIfExists` 改为 1，测试以 `CLEAN_M35_RESTORE` 失败。

## 其余

- 全部照原票、SPEC 与补单 01：CLEAN-M35 第 1～8 节（精确 11 个测试，原六测断言不改）、第 9 节三条负控、补单 01 的真实冒烟。
- 你回执里列出的两处未完成：`purge` 时编号目录本身被占用要记为根级 `in_use` 遗留而不是入口错误；最后一个编号目录删除后的进度回调若置停止，清理空隔离根前要再看一次停止。这两条仍是 SPEC 第 5 节的要求，本轮一并做完，能在现有 11 测里加断言的就加。
- **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w10-m4`（分支 `worker/water-w10-m4`），从 `12c6c556` 续做。WIP 提交 `9a689f86` 里的草稿可以接着改。已提交的回执与证据保留，不改写，只在其后新增提交；实现提交要是一个干净的、不带 wip 字样的提交，三个 final 都绑定它。baseline 已通过，不用重跑。

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

原有各节保留，新增“补单 02”一节，写：实际模型、续做起点、实现提交 SHA；SPEC 第 1～8 节逐条（第 3、4 节写清实际跑到的移入与复原断言）；每个检查命令与结果；三条负控（改了哪一处、失败信息、恢复后的哈希）；真实冒烟的输出；没做或没验证的事。

受阻则写“WATER-W10-M4 任务受阻”，写清冲突与最小补充需求，不要自行变通。

**本单是 C 组的第一张**：交回后接着做 C 组第二张 WATER-W10-M5（原派单句与原票不变）。
