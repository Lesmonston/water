# PROCESS-M3C：进程快照补程序路径与内存（W8-K1）

2026-10-31，总控（Claude）冻结。补充 [PROCESS](../checkup-v1/PROCESS.md) 与 [MODEL](../checkup-v1/MODEL.md) 第 7 节，冲突时以本文为准。只改 `packages/process-scan/`。

依据：10-29 F 盘清理里，Mirasim 的 `codex.exe` 正从一个“几周没动”的 `node_modules` 里运行，年龄门槛放行了它。现在的快照只有进程名，没有程序完整路径，Claude Code 旧版本规则的在用判断也因此失效（第六波验收第 79 行）。

## 1. 快照多记两样（都只在内存里）

1. **程序完整路径**：用已经打开的 `PROCESS_QUERY_LIMITED_INFORMATION` 句柄调用 `QueryFullProcessImageNameW`，取 Win32 形式（flags 为 0）。
   - 取不到时视为空，计入 issue `image_unavailable`（新 code，与 `access_denied` 等并列），不报错。
2. **内存**：用同一句柄调用 `NtQueryInformationProcess`，信息类只允许 `ProcessCommandLineInformation`（60）与新增的 `ProcessVmCounters`（3），取 `WorkingSetSize`。
   - 用 `const _` 断言结构体大小；取不到时为“未知”。

程序路径和命令行一样，**只在内存里使用**：
- 不进入任何 JSON、`Debug`、`Display`、日志或错误信息；
- `ProcessSummary` 的形状不变。

允许的系统函数在原清单上增加 `QueryFullProcessImageNameW`，其余不变。不新增依赖。

## 2. 新的在用方式

```rust
pub enum InUseMode { None, ProcessRunning, CmdlineReferencesItem, RunsFromOrReferencesItem }
// 序列化名依次为 none、process_running、cmdline_references_item、runs_from_or_references_item
impl ProcessSnapshot {
    pub fn runs_from_or_references(&self, path: &str, names: &[&str]) -> Vec<u32>; // names 为空表示不限
}
```

- `runs_from_or_references_item`：在 `processes` 名单内（名单为空表示**任何进程**），只要有一个进程满足下面任一条就命中：
  1. **程序在条目里**：程序完整路径等于条目路径，或位于其内。比较规则同 `references_path` 的归一化：转小写、`/` 换成 `\`、去掉条目结尾的 `\`，按完整段比较，`C:\a\bc\x.exe` 不在 `C:\a\b` 里；
  2. **命令行提到它**：与 `references_path` 的命中规则完全相同。
- 命中时返回的 `InUseHit` 形状不变（`{process_name, pid}`）。
- 程序路径和命令行都取不到的进程，不算命中。快照本身取不到时，调用方按“无法确认”处理，与原来一样。
- 原有三种方式的行为不变。

## 3. 孤儿进程带内存

`OrphanChain` 增加 `memory_bytes`：
- 值为根进程与全部后代的工作集之和，序列化为十进制字符串；
- 只要其中有一个能取到就求和，全部取不到时为 `null`。

其它字段与判定规则不变；输出仍不含命令行和程序路径。

## 4. 测试

`tests/process_v1.rs` 仍是精确四个测试，名字不变。新断言加在已有测试里，失败信息带标记：

| 标记 | 内容 | 放在 |
|---|---|---|
| `PROC_M3C_IMAGE` | 测试把 `C:\Windows\System32\PING.EXE` 复制到本树 `.local/w8-k1-fixtures/<随机名>/bin/` 下，从那里运行。以 `bin` 的上级为条目时，新方式命中；对一个只差一个字符的兄弟目录（如 `bin2` 的上级 `<随机名>2`）不命中 | `process_in_use_and_orphans`、`process_path_reference` |
| `PROC_M3C_ANY` | 名单为空时任何进程都算；名单不含该进程名时不命中；原有三种方式的结果不变 | `process_in_use_and_orphans` |
| `PROC_M3C_MEMORY` | 自制的孤儿链 `memory_bytes` 不为 `null`，且不小于根进程单独的工作集 | `process_in_use_and_orphans` |
| `PROC_M3C_PRIVACY` | summary、InUseHit、OrphanChain 的 JSON 与 `Debug` 都不含夹具路径、程序路径和令牌 | `process_privacy` |

夹具与进程的收尾规则同原 SPEC 第 4 节：
- 只结束自己启动、命令行含本次令牌的进程；
- 只删除本次新建的目录。

## 5. 负控与真实冒烟

- **nc1**：去掉“程序在条目里”的判断，测试以 `PROC_M3C_IMAGE` 失败。
- **nc2**：孤儿链只取根进程的内存、不加后代，测试以 `PROC_M3C_MEMORY` 失败。
- **真实冒烟**（`--mode real`）：在原输出上加两项，都只输出计数，不输出路径与命令行：
  - 取到程序路径的进程数；
  - `image_unavailable` 数。
