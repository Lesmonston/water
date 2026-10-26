# WATER-W2-C 进程快照与在用判断 SPEC

2026-10-26 冻结。新 crate `packages/process-scan`（`water-process-scan`）：只读取当前进程列表、父子关系、创建时间与命令行，用于判断某个待清理条目是否正被程序使用，以及列出 agent 停止后遗留的孤儿进程。**只读，不结束、不挂起、不注入任何进程。**

## 1. crate 形状

- 独立 workspace，edition 2024，rust 1.95，publish false，auto 发现关闭；lib `water_process_scan`。
- 依赖只允许 `serde =1.0.229`（derive）、`serde_json =1.0.151`。
- FFI 只在 `src/native_windows.rs`，写法同 [SCAN](SCAN.md) 第 1 节。允许的系统函数：`CreateToolhelp32Snapshot`、`Process32FirstW`、`Process32NextW`、`OpenProcess`（只 `PROCESS_QUERY_LIMITED_INFORMATION`）、`NtQueryInformationProcess`（只 `ProcessCommandLineInformation` = 60）、`GetProcessTimes`、`CloseHandle`。

## 2. 公开 API

```rust
pub fn snapshot() -> Result<ProcessSnapshot, ProcError>;
impl ProcessSnapshot {
    pub fn summary(&self) -> ProcessSummary;                 // MODEL 第 7 节，绝不含命令行
    pub fn running(&self, names: &[&str]) -> Vec<u32>;       // 进程名 ASCII 大小写不敏感精确匹配
    pub fn references_path(&self, path: &str, names: &[&str]) -> Vec<u32>; // names 为空表示不限
}
pub fn summary_to_json(s: &ProcessSummary) -> String;
pub struct InUseSpec { pub mode: InUseMode, pub processes: Vec<String> }  // MODEL 第 4 节 in_use
pub fn in_use(snapshot: &ProcessSnapshot, spec: &InUseSpec, item_path: &str) -> Option<InUseHit>;
pub fn orphans(snapshot: &ProcessSnapshot, patterns: &[&str]) -> Vec<OrphanChain>;
pub const DEFAULT_ORPHAN_PATTERNS: &[&str];
```

`ProcessSnapshot` 不实现 Serialize、Debug 输出不含命令行；命令行只存在内存中，快照被丢弃即释放。`ProcError` 固定枚举，Display 不含系统原文。

## 3. 语义

- **命令行取不到**（权限不足、进程已退出、系统进程）：该进程照常列出，命令行视为空，计入 issue `access_denied` 或 `exited`，不报错。
- **references_path**：把命令行与 path 都转成小写、`/` 换成 `\`、去掉 path 结尾的 `\`。命中条件：命令行中出现 path，且其前一个字符是开头、空格、引号 `"`、`'` 或 `=`，后一个字符是结尾、空格、引号或 `\`（后者表示引用了条目内部的路径）。`C:\a\bc` 不得命中 `C:\a\b`。
- **in_use**：mode `none` 恒为 None；`process_running` 时 processes 中任一在运行即命中；`cmdline_references_item` 时 processes 中（为空则全部）任一命令行引用条目路径即命中。InUseHit = `{process_name, pid}`，序列化形状见 MODEL 第 7 节。
- **orphans**：进程的父 PID 不在快照里，或父进程创建时间晚于子进程（PID 被复用），且进程名属于 `node.exe`、`cmd.exe`、`powershell.exe`、`pwsh.exe`、`bash.exe`、`python.exe`、`chrome.exe`、`msedge.exe`，且命令行包含 patterns 中任一子串（ASCII 大小写不敏感）。每条结果 `{root_pid, name, created_at, matched_pattern, descendant_pids}`，descendant_pids 为该进程在快照中的全部后代。输出不含命令行。
- `DEFAULT_ORPHAN_PATTERNS` 至少包含：`jest-worker`、`vitest`、`expo start`、`cursor-agent`、`codex`、`grok`、`playwright`、`puppeteer`、`--headless`、`metro`。

## 4. 测试与检查

唯一测试文件 `packages/process-scan/tests/process_v1.rs`，精确四个测试：`process_snapshot_contract`、`process_path_reference`、`process_in_use_and_orphans`、`process_privacy`。

- 测试可以启动自己的子进程，命令行中带本次随机令牌与本树 `.local/w2-c-fixtures/` 下的路径（如 `cmd.exe /d /c "ping -n 30 127.0.0.1 >NUL & rem --user-data-dir=<路径>"`）；孤儿用 `cmd /d /c start "" /b cmd /d /c "ping -n 30 127.0.0.1 >NUL & rem <令牌>"` 制造。测试结束**只结束自己启动且命令行含本次令牌的进程**，并复核为空。
- snapshot contract：自身进程在快照中；summary JSON 形状严格符合 MODEL；系统进程不导致失败。
- path reference：边界字符规则全部样例，含 `C:\a\bc` 不命中 `C:\a\b`、引用条目内部路径命中、大小写与斜杠归一。
- in_use/orphans：三种 mode；自制孤儿被列出且 descendant 正确；父进程仍在的不算孤儿。
- privacy：summary、InUseHit、OrphanChain 的 JSON 与 Debug 输出都不包含测试令牌和路径。

有效负控 nc1：真实去掉 references_path 的后边界检查，使 `C:\a\bc` 误命中 `C:\a\b`，测试失败信息含 `PROC_PATH_BOUNDARY`；立即原字节恢复后全绿。

真实只读冒烟（`--mode real`）：`examples/real_smoke.rs` 取一次本机快照，输出进程总数、access_denied 数、`chrome.exe`/`msedge.exe`/`node.exe` 的个数、默认模式下孤儿条数（只给 name 与 matched_pattern）。不输出命令行。
