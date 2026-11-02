# PROCESS-M3D：命令行里的 Git Bash 写法（W9-L4）

2026-11-02，总控（Claude）冻结。补充 [PROCESS](../checkup-v1/PROCESS.md) 与 [PROCESS-M3C](../m3c-v1/PROCESS-M3C.md)，冲突时以本文为准。只改 `packages/process-scan/`。

来由：11-02 清理 `denglou` 时，它的服务器脚本用 `bash -l /f/new/denglou/_ctl/…` 启动（[清理记录](../../docs/maintenance/CLEANUP-20261101.md)启发第 26 条）。`command_references_path` 比对前只把 `/` 换成 `\`，所以 `F:/new/x` 认得出，`/f/new/x` 认不出。

## 1. 要认的写法

判断命令行是否引用路径 P 时，P 规整后（小写、去掉结尾的 `\`）形如 `<盘符>:\<其余>`，且 `<其余>` 非空：
- 除了原来的写法，再找 `\<盘符>\<其余>`。命令行照旧先把 `/` 换成 `\` 并转小写，所以 `/f/new/x` 与 `\f\new\x` 都能命中。
- 前后边界的规则与原来完全相同：前面是开头、空格、`"`、`'`、`=`；后面是结尾、空格、`"`、`'`、`\`。
- P 是盘根（`<其余>` 为空）时**不找**这种写法，免得把 `taskkill /f` 里的 `/f` 认成 F 盘。

适用于所有按命令行判断的在用方式（`cmdline_references_item`、`runs_from_or_references_item` 的命令行部分）。按程序路径判断的部分不变（程序路径总是 Windows 写法）。

## 2. 测试

`tests/process_v1.rs` 仍是精确四个测试，名字不变。新断言加在 `process_path_reference` 里，失败信息带 `PROCESS_M3D_MSYS`。P 为 `F:\new\denglou\_ctl`：

| 命令行 | 预期 |
|---|---|
| `bash -l /f/new/denglou/_ctl/server_up.sh` | 引用 |
| `node "/f/new/denglou/_ctl/x.js"` | 引用 |
| `tool --dir=/f/new/denglou/_ctl` | 引用 |
| `bash /F/New/Denglou/_CTL/a.sh` | 引用（不分大小写） |
| `bash /f/new/denglou/_ctlx/a.sh` | 不引用（后边界） |
| `bash c:/f/new/denglou/_ctl/a.sh` | 不引用（前边界：这是 C 盘的路径） |
| `bash /g/new/denglou/_ctl/a.sh` | 不引用（盘符不同） |
| `taskkill /f /im node.exe`，P 为 `F:\` | 不引用 |
| 原有的 `F:\…`、`F:/…` 写法 | 结果不变 |

本文预计不需要改任何原有断言。若有必然要改的，先写受阻回执。

## 3. 负控与真实冒烟

- **nc1**：不找 `\<盘符>\<其余>` 这种写法，测试以 `PROCESS_M3D_MSYS` 失败。
- **nc2**：这种写法不检查前边界，`c:/f/new/…` 被认成引用，测试以 `PROCESS_M3D_MSYS` 失败。
- 负控只认 `src/` 里的改动。
- **真实冒烟**（`--mode real`）与第八波 K1 相同：只读本机进程列表，输出只有计数。
