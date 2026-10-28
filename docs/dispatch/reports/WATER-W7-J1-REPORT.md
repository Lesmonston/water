WATER-W7-J1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w7-j1/docs/dispatch/reports/WATER-W7-J1-REPORT.md

# WATER-W7-J1 宿主补遗执行回执

完成日期：2026-10-29 JST（检查日志使用 UTC，2026-10-28）。执行者实际模型：Codex GPT-6；用户安排为 sol。本任务没有调用子代理。

- 唯一工作树：`F:/new/smaltalk/water/.worktrees/w7-j1`。
- 分支：`worker/water-w7-j1`。
- 首次 HEAD：`282876950df40a14b7abeec6ab27677ea0adc897`，开工时干净。
- 实现提交：`eeea16509125ce9023941ee3c1d3f0463c03bf99`。
- 实现只改 `apps/water/host/src/lib.rs`、`apps/water/host/tests/host_v1.rs`、`apps/water/host/README.md`。
- 三个 final 均在上述干净实现提交上运行；之后只增加本报告和检查器归档证据。提交身份为进程内的 `Codex GPT-6 <codex-gpt-6@localhost>`，没有修改 Git 配置。
- 没有 push、merge、rebase、amend、reset、改远端、改台账、改契约或检查器。没有下载依赖；检查器使用离线缓存、私有 Cargo home/target、单 job。测试仍是精确 5 个原名测试，无忽略或过滤。

## SPEC 第 1～4 节逐条落实

1. **服务没起来时不等。** `Backend` 新增默认返回 `true` 的 `available()`；`UnavailableBackend` 覆盖为 `false`。`BackendSlot` 短暂持锁克隆内部 Arc，在锁外转发 `available()`，空槽返回 `false`。`clean_state` 在不可用时直接返回 `NotCleaning`，不发 `app_state`。`ServiceBackend` 使用默认实现，`service.rs` 无改动。测试分别覆盖直接不可用后端、装着不可用后端的槽、已 take 的槽；两个停止入口均立即返回 `Idle` / `false`，三个调用合计要求小于 500 ms。另用一旦收到任何命令就 panic 的不可用探针，证明不查询、不发停止；默认可用但调用失败的后端仍返回 `Unknown`。
2. **退出计时包含首次查询。** 共用停止函数进入时先记录 `Instant`，然后首次 `clean_state`。若首次结果为 `Cleaning` / `Unknown`，仍先发恰好一次 `clean_stop`，再检查总时限；已过期则直接 `TimedOut`，不再查询。首次确认为 `NotCleaning` 仍返回 `Idle`。未知状态的五秒计时从观察到未知时开始，无总时限入口继续保持连续未知的语义。新增脚本分别让首次查询睡 80 ms 后回答清理中 / 未知，limit 为 40 ms，核对 `TimedOut`、查询 1 次、停止 1 次。
3. **未知计时只算连续的。** 生产中 `Cleaning => unknown_since = None` 的正确逻辑保持。新脚本只在收到停止后开始计时，依次回答约 3 秒未知、一次清理中、约 3 秒未知、最后空闲；断言必须实际读到最后的空闲且只发一次停止。nc3 将这条重置移除时，约 5 秒提前返回，被 `HOST_UNKNOWN_RESET` 抓到。
4. **源码断言补强。** 测试增加忽略注释与字符串的标识符/标点分词及配对花括号读取。退出断言先截取 `run_return` 回调块，再找精确 `Exit = event {` 标识符序列，并仅在配对的分支体内核对停止调用与 200 ms / 10 s。`ExitRequested` 不是 `Exit` 标识符，分支外的调用也不在被检查的块中。关窗断言只检查 `guard_main_close` 块，要求唯一一次 `clean_state` 查询、`== NotCleaning { return; }`，紧接 `api.prevent_close()`，并保留共用等待入口。`!= Cleaning` 或另外加一次查询放行未知均不符合断言。

README 同步说明不可用性、首次查询计时、测试与本票原生检查位置。公开停止函数、状态函数的签名和枚举成员不变，未引入 unsafe、进程启动、网络、额外环境变量读取或 `.setup()`；依赖、锁、配置、权限、图标和 UI 均未改。

## 获准改写的两条旧源码断言

除下面两条外，旧标记与断言未改；新增断言全部放在原 `host_service_wiring` 中。

### `HOST_EXIT_DURING_CLEAN`

原文（连同原有定位代码）：

```rust
let callback = lib
    .split_once("app.run_return(")
    .expect("HOST_EXIT_DURING_CLEAN run_return callback")
    .1
    .split_once("});")
    .expect("HOST_EXIT_DURING_CLEAN callback end")
    .0;
let exit = callback
    .split_once("tauri::RunEvent::Exit")
    .expect("HOST_EXIT_DURING_CLEAN handles Exit inside callback")
    .1;
assert!(
    exit.contains("stop_cleaning_within(")
        && exit.contains("Duration::from_millis(200)")
        && exit.contains("Duration::from_secs(10)"),
    "HOST_EXIT_DURING_CLEAN Exit calls bounded stop at 200 ms / 10 s"
);
```

新文：

```rust
let tokens = wiring_tokens(lib);
let callback = wiring_block(
    &tokens,
    &["app", ".", "run_return", "("],
    "HOST_EXIT_DURING_CLEAN",
);
let exit = wiring_block(
    callback,
    &[
        "if", "let", "tauri", ":", ":", "RunEvent", ":", ":", "Exit", "=", "event", "{",
    ],
    "HOST_EXIT_DURING_CLEAN",
);
assert!(
    exit.windows(2).any(|w| w == ["stop_cleaning_within", "("])
        && exit
            .windows(6)
            .any(|w| w == ["Duration", ":", ":", "from_millis", "(", "200"])
        && exit
            .windows(6)
            .any(|w| w == ["Duration", ":", ":", "from_secs", "(", "10"]),
    "HOST_EXIT_DURING_CLEAN Exit calls bounded stop at 200 ms / 10 s"
);
```

### `HOST_CLOSE_UNKNOWN`

原文：

```rust
let guard = lib
    .split_once("fn guard_main_close(")
    .expect("HOST_CLOSE_UNKNOWN close guard")
    .1
    .split_once("pub fn run<")
    .expect("HOST_CLOSE_UNKNOWN guard end")
    .0;
assert!(
    guard.contains("if clean_state(backend.as_ref()) == CleanState::NotCleaning")
        && guard.contains("stop_cleaning_and_wait("),
    "HOST_CLOSE_UNKNOWN close guard only allows confirmed non-cleaning and uses shared wait"
);
```

新文（`confirmed_idle` 按提交原文列出）：

```rust
let guard = wiring_block(
    &tokens,
    &["fn", "guard_main_close", "("],
    "HOST_CLOSE_UNKNOWN",
);
let confirmed_idle = [
    "if",
    "clean_state",
    "(",
    "backend",
    ".",
    "as_ref",
    "(",
    ")",
    ")",
    "=",
    "=",
    "CleanState",
    ":",
    ":",
    "NotCleaning",
    "{",
    "return",
    ";",
    "}",
    "api",
    ".",
    "prevent_close",
    "(",
    ")",
    ";",
];
assert!(
    guard.iter().filter(|token| **token == "clean_state").count() == 1
        && guard
            .windows(confirmed_idle.len())
            .any(|w| w == confirmed_idle)
        && guard
            .windows(2)
            .any(|w| w == ["stop_cleaning_and_wait", "("]),
    "HOST_CLOSE_UNKNOWN close guard only allows confirmed non-cleaning and uses shared wait"
);
```

## 检查命令与结果

以下所有检查均从唯一工作树根运行，命令固定前缀为：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W7-J1
```

表中“参数”接在该前缀之后；回执/日志都在 [归档 receipts](../../acceptance/wave7/j1/receipts/)。记录前缀之后加 `-result.json` 即完整回执名。每条回执还保存了实际内部命令、退出码、源码快照与哈希。

| 参数 | 结果与退出码 | 门耗时（秒） | 回执前缀 |
|---|---|---:|---|
| `--mode baseline` | 通过，0；首次基线、路径与环境就绪 | 2.018 | `2026-10-28T14-36-14.499Z-40224-baseline` |
| `--mode lock` | 通过，0；395 registry 包与已验收 AC 锁一致，依赖未变 | 9.156 | `2026-10-28T14-38-37.539Z-31452-lock` |
| `--mode test` | 预期先红，1；Cargo 101，五测 4 过 1 败，`HOST_UNSTARTED_SERVICE`（Unknown ≠ NotCleaning）；包含首次离线编译 | 469.996 | `2026-10-28T14-38-59.513Z-27716-test` |
| `--mode test` | 修正后通过，0；五测全过 | 28.967 | `2026-10-28T14-48-11.064Z-43280-test` |
| `--mode check` | 通过，0；源码/依赖政策、fmt、clippy `-D warnings` | 237.650 | `2026-10-28T14-49-12.634Z-7304-check` |
| `--mode red-nc1` | 有效负控通过，检查器 0；Cargo 101，目标断言红 | 10.845 | `2026-10-28T14-54-24.608Z-32236-red-nc1` |
| `--mode test` | nc1 原字节恢复后五测全过，0 | 27.205 | `2026-10-28T14-54-52.791Z-34856-test` |
| `--mode red-nc2` | 有效负控通过，检查器 0；Cargo 101，目标断言红 | 16.243 | `2026-10-28T14-55-29.089Z-9552-red-nc2` |
| `--mode test` | nc2 原字节恢复后五测全过，0 | 21.409 | `2026-10-28T14-56-01.627Z-21800-test` |
| `--mode red-nc3` | 有效负控通过，检查器 0；Cargo 101，目标断言红 | 15.513 | `2026-10-28T14-56-36.460Z-23908-red-nc3` |
| `--mode test` | nc3 原字节恢复后五测全过，0 | 28.208 | `2026-10-28T14-57-18.529Z-9164-test` |
| `--mode check --final` | 通过，0；干净实现提交 | 5.682 | `2026-10-28T14-58-03.078Z-31964-check` |
| `--mode test --final` | 通过，0；精确五测全过，0 ignored/filtered；三条负控红绿与源码哈希核验通过 | 15.096 | `2026-10-28T14-58-17.513Z-42268-test` |
| `--mode native --final` | 通过，0；唯一窗口，九步，Water 退出 0 | 25.902 | `2026-10-28T14-58-54.294Z-23380-native` |
| `--mode archive` | 通过，0；279 个文件、24,500,152 字节按原字节归档 | 3.362 | `2026-10-28T15-00-00.009Z-23376-archive` |

archive 自身完成回执位于本树 `.local/checks/WATER-W7-J1/`；归档索引为 [ARCHIVE.json](../../acceptance/wave7/j1/ARCHIVE.json)。索引也包含总控派前遗留的 `2026-10-28T14-17-36.868Z-35084-baseline-result.json`，这是开工前已有证据，不冒称本执行者运行。

格式化使用 Rust 1.95.0 自带 `rustfmt.exe --edition 2024`，仅指定本票 `lib.rs` 与 `host_v1.rs`，退出 0；`git diff --check` 通过。初次先红时只先增加默认 trait 方法使新增测试可编译，其余可用性修复尚未实施；原始失败日志完整保留。

证据暂存后，全量 `git diff --cached --check` 对原生观察器原始 CRLF 日志/JSON 报 trailing whitespace；这些文件受归档器 `* -text` 约束，必须按原字节保留，未为消除提示改写证据。产品检查已通过，报告本身的空白检查通过；归档文件及源文件的 279 份 SHA-256 与索引全部一致。

## 三条负控及恢复

每条均在实现提交之后只临时改生产文件 `apps/water/host/src/lib.rs` 的一处，不改测试，不加开关；检查器运行完整五测，4 过、1 个服务接线测试以指定标记失败。每次完成后立即 `git checkout -- apps/water/host/src/lib.rs`，核对哈希，再立即 `--mode test`，恢复五测全绿。

| 负控 | 唯一改动 | 实际失败信息 |
|---|---|---|
| nc1 | `UnavailableBackend::available` 的 `false` 改 `true` | `HOST_UNSTARTED_SERVICE unavailable means no cleaning`；left `Unknown` / right `NotCleaning` |
| nc2 | 将 `let started = Instant::now();` 从首次 `clean_state` 之前移到之后 | `HOST_EXIT_DEADLINE initial query consumes the deadline (unknown=false)`；left `Stopped` / right `TimedOut` |
| nc3 | `CleanState::Cleaning => unknown_since = None,` 改为空分支 `CleanState::Cleaning => {},` | `HOST_UNKNOWN_RESET must reach idle after unknown 3 s / cleaning / unknown 3 s` |

三次恢复后的 `lib.rs` SHA-256 完全相同：

```text
d9645e39c07e8720fc98639f44d3cc6d596f4a1514c8a8fe5bba7b0e2076239c
```

恢复后的检查器生产集合哈希为 `4b2e11f9c7b88d3526d1b537bb8d9eb6ebd94f7c1eb87bd2f3007655000f2318`；测试集合哈希为 `a8ab09bdaff4aadfef2a85f64fd36ef9315bfa0ed04b8245484f48149b127826`，与三个 final 一致。红回执、即时恢复绿回执及逐文件快照均在归档中，final 的 `proofAudit` 已逐条核对。

## 唯一一次整机检查与看图

运行期：UTC `2026-10-28T14:58:54.295Z` 至 `14:59:20.197Z`；完整门 25.902 秒，检查器记录 `nativeWallMs=21218`，观察器 `14:58:59.1292721Z` 至 `14:59:18.3563829Z`。原生窗口预算用 1/1、选择框 0；未手动开程序，未重跑。标题 Water、Mica backdrop type 2、私有 WebView 目录均通过。检查器有一次恢复既有窗口（`nativeRestores=1`），不是另开窗口；原始根为 2（含框架事件目标 1），实际主窗口为 1。

夹具由检查器建在本树 `.local/w7-j1-native/2026-10-28T14-58-54.294Z-23380-fixture`，6 个合成文件，设为 72 小时前；七分类全关，只增加该夹具根。受保护位置仅只读统计，不可勾选。检查器通过 Water 应用自己的确认和清理流程删除夹具缓存，没有清理真实用户文件。

| 步 | 动作/等待 | 观察器耗时 ms | 结果 |
|---|---|---:|---|
| 1 | 等首页“开始一次体检”，无连接失败 | 1345 | 通过，home 图 |
| 2 | Invoke“开始体检” | 102 | 通过 |
| 3 | 等结果“本次体检共识别” | 12425 | 通过，results 图 |
| 4 | Invoke“清理所选” | 63 | 通过 |
| 5 | 等永久删除不可恢复确认文字 | 1193 | 通过，confirm 图 |
| 6 | Invoke“永久删除 3 MB” | 23 | 通过 |
| 7 | 等“清理完成” | 1462 | 通过，done 图 |
| 8 | Invoke“查看清理记录” | 41 | 通过 |
| 9 | 等“每一次体检与清理，都有迹可循。” | 894 | 通过，history 图 |

以下五张 1568×1072 窗口截图均已实际打开查看：

- [home](../../acceptance/wave7/j1/receipts/2026-10-28T14-58-54.294Z-23380-home.png)：首页和“开始体检”按钮完整，没有服务无法连接提示。
- [results](../../acceptance/wave7/j1/receipts/2026-10-28T14-58-54.294Z-23380-results.png)：可放心清理 3 MB、已选 1 组 3 MB；受保护合计 19.3 GB，列出的会话组带锁且不可选。该真实占用观察只对应本次机器状态，不是本票删除对象。
- [confirm](../../acceptance/wave7/j1/receipts/2026-10-28T14-58-54.294Z-23380-confirm.png)：只列“带缓存标记的目录”，1 组 1 项 3 MB；明确永久删除、不进回收站、无法恢复，按钮为“永久删除 3 MB”。
- [done](../../acceptance/wave7/j1/receipts/2026-10-28T14-58-54.294Z-23380-done.png)：清理完成、3 MB 已释放，缓存组已清理，没有失败项提示。
- [history](../../acceptance/wave7/j1/receipts/2026-10-28T14-58-54.294Z-23380-history.png)：清理完成 3 MB、跳过 0 项，另有本次体检记录。

检查器核验：

- 缓存 `projA/build-cache` 已删；合成源码 `projA/src/main.rs`、浏览器配置 `lab/profile-a/Local State` 和 `Default/Preferences` 内容原样保留。
- `scans`、`snapshots`、`plans`、`cleans`、`journal` 各 1 份。清理状态 `completed`，1 项 `deleted`，删除前字节和实际释放均为 **3,145,815**，失败数 **0**。
- journal 的事件恰为 `intent`、`result`，记录完整。
- Water PID 32656 正常关闭，`nativeExit.code=0`、signal null；`childClose.remaining=[]`。结束后按本次 PID 核对，Water 及观察器列出的 6 个 WebView 子进程均不存在，没有强制终止。

## 未做及验证边界

- 未试真实系统关机、注销、重启管理器；退出事件接线以源码断言与脚本后端验证。
- 未额外开“服务初始化失败”的真窗口，未试第二实例前台唤起、真实选择框、清理进行中关窗；相关旧行为未扩大本票窗口预算。
- 未清理真实用户数据；仅本次 native 合成缓存经 Water 流程删除。未手动清理 `.local` 构建产物、检查日志或保留夹具。
- 同步后端调用本身无法被强制中断；若其不返回，10 秒限制不能抢占它。本次已验证首次调用返回后的截止判断。
- macOS、release 打包、跨票整合与总控独立验收未做。本执行者的“完成”表示提交待收单，不自行标 VERIFIED 或合主线。

交回后停止本票测试，不再启动窗口或后台任务。
