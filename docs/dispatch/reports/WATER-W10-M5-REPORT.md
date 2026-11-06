WATER-W10-M5 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m5/docs/dispatch/reports/WATER-W10-M5-REPORT.md

2026-11-05。实际模型：GPT-6（Codex；未获更细的运行时型号标识）。本回执为受阻交回，不是实现完成或总控验收通过。

## 起点与前置顺序

- 已先完成 C 组 M4 补单 02 并交回：实现 `b1017bd73cf63183e84cc7f09c368ff1b5ead5b5`，完成回执 `6c30062c130e77322e0e99b161108a4499b095c2`；M4 三个 final 与三条负控/恢复绿测均通过，完成交回后不再运行 M4 检查。
- 随后才读取 M5 原票及其规则、HOST-M35、IPC-M35、指定旧 HOST/IPC 契约、SERVICE-M35 第 7 节与指定源码/测试。M5 尚按假后端实施，不要求未派出的 M7 已实现。
- 唯一工作树：`F:/new/smaltalk/water/.worktrees/w10-m5`；分支 `worker/water-w10-m5`。
- 首次 HEAD：`f93afb8e3c5cf4114927fe2ab6c14dbb033c7ffe`，开工时干净。
- 实现提交 SHA：无。阻塞发现于读票/静态核对阶段；没有修改宿主源码、测试、README、配置、依赖或锁。`git diff --exit-code f93afb8e -- apps/water/host` 通过。

## 阻塞：scan_start 包装参数的旧断言未在豁免项内

新契约 [HOST-M35 第 2 节](../../../contracts/m35-v1/HOST-M35.md)第 20 行明确要求 `scan_start` 收 `location_ids: Option<Vec<String>>`，并在有值时转发 `locationIds`。第 1 节还要求包装参数转成 camelCase 后与 IPC 键一致，因此包装应包含 `location_ids`。

但当前旧测试 [host_v1.rs](../../../apps/water/host/tests/host_v1.rs) 的约束为：

1. 第 259 行旧 `expected` 数组中，`scan_start` 参数为 `{}`。
2. 第 365～377 行从该对象的键生成 `expected_wrappers`，因此 `scan_start` 的旧期望是 `[]`。
3. 第 378～381 行目前只对 `clean_prepare` 额外加入 `excludeItemIds`、`groupIds`。
4. 第 383～384 行以 `HOST_COMMANDS actual Tauri camelCase parameters` 比较实际包装键与该旧期望。按新 SPEC 加入 `location_ids` 后，实际键会是 `["locationIds"]`，无法与旧 `[]` 同时成立。

HOST-M35 第 5 节第 61～64 行明确说“获准修改，其余不变”，列出的仅为：计数/skip 位置、**命令名**与 IPC 表的比对、`clean_prepare` 参数断言，没有列出 `scan_start` 包装参数这一处。它与给旧 helper 调用补 `None` 不同：helper 补 `None` 仍验证旧请求 `{}`；包装参数期望则必须实质从 `[]` 改成 `["locationIds"]`。

[执行者规则第 2 节](../W10-M35-WORKER-RULES.md)第 40 行明确要求：“只有 SPEC 写明‘获准修改’的才能改……SPEC 没想到、但因本单改动而必然要改的旧断言：先写受阻回执，不要自行改。”因此本票在实现前停止，不把“命令名比对”的豁免扩大解释为参数键比对，也不通过改扫描器/隐藏包装参数来绕过旧断言。

**最小补充需求**：总控补准这一处旧期望值变更，保持旧零参数请求/返回断言与其它断言原样。例如允许在旧 `expected_wrappers` 中增加：

```rust
expected_wrappers.insert(
    "scan_start".to_owned(),
    vec!["locationIds".to_owned()],
);
```

旧值为 `[]`，新值为 `["locationIds"]`；无需因此修改生产接口契约、依赖、配置、安全策略或测试数量。本回执没有将以上代码写入测试。

## SPEC 各节状态

| 节 | 实际状态 |
|---|---|
| 1 命令表 | 未实施；产品保持 19 个命令和原 handler。新 17 命令尚未登记。 |
| 2 转发 | 未实施；scan_start 和 clean_prepare 保持基线签名/形状。发现上述旧包装断言授权缺口。 |
| 3 reveal/opener | 未实施；没有创建 opener.rs，没有添加起进程路径；未调用 quarantine_locate、Opener 或 explorer.exe。 |
| 4 退出 | 未实施；没有改 clean_state 或退出/关窗接线。 |
| 5 测试 | 原五测的名称、断言、标记和字节全部不变；没有运行测试。三处原有豁免亦尚未使用。 |
| 6 负控/整机 | 两条负控、恢复绿测与三个 final 均未运行；原生窗口、选择框、浏览器均为 0，没有占用 native 一窗预算。 |

## 检查命令与结果

均在本票工作树根目录执行：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W10-M5 --mode baseline
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W10-M5 --mode archive
```

- baseline：passed；回执 `2026-11-05T10-34-04.111Z-33584-baseline-result.json`。它证明起点/输入/环境就绪，不证明产品已实现或测试通过。
- archive：passed；回执 `2026-11-05T10-39-46.112Z-22980-archive-result.json`，自身保留于本树 `.local/checks/WATER-W10-M5/`。其它日志/回执由检查器按原字节归档，索引为 [ARCHIVE.json](../../acceptance/wave10/m5/ARCHIVE.json)，逐条长度与 SHA-256 已复算。
- lock、check、test、native、red-nc1/red-nc2 与所有 final：未运行。没有下载、编译、安装依赖、改超时或启动 GUI。
- 旧断言修改：无；不存在已实施的原值/新值更改。
- 负控恢复哈希：无，负控未运行；不把静态矛盾或 baseline 当负控。
- 整机结果：未运行；没有创建清理测试夹具，没有扫描或删除真实数据。

## 交回范围

仅提交本回执及 `archive` 生成的证据；产品与测试保持首次 HEAD。没有修改主线台账、契约、检查器、其它包或其它工作树，没有修改 git 配置/远端，也没有 push、merge、rebase、reset、amend。

用了一个只读辅助审阅代理，未授予实现、测试、提交权限；它只读 M5 契约/源码，未修改文件或运行检查、测试、GUI。交回时没有本任务后台进程。新命令、资源管理器打开、永久删除退出保护、整机接线和 macOS 均未验证。

等待总控补充上述单处旧断言授权后再续做 M5；当前按 C 组受阻即停规则停止。

## 补单 01

2026-11-06。以上为上一轮受阻历史，保留不删。本轮按补单 01 续做，实际模型为 GPT-6（Codex；运行时未提供更细型号标识），未使用辅助代理。

- 续做起点：`2d516c46de2660f0b4f77f15a0374ec138469ca5`，工作树干净，分支仍为 `worker/water-w10-m5`；未重跑 baseline。
- 实现提交：`e6f7fa673294715b86abc3dde7a12b156f9aa801`。只改宿主 README、`src/commands.rs`、`src/lib.rs`、新增 `src/opener.rs` 与指定的 `tests/host_v1.rs`。
- 初次 lock、check、五测及两条负控/逐次恢复五测已通过。最终结果见下文完成记录；本段在 final 前提交，不代表 final 已通过。

### 原生窗口预算（打开前记录）

只运行一次 `native --final`：原生主窗口最多 1 个，选择框 0、浏览器 0、Explorer 0；不手工启动程序，不点“打开文件夹”。沿用冻结基线界面与检查器步骤；观察期限 300 秒，检查器给辅助进程 360 秒，随后退出等待 20 秒，启动后的整门核对上限 390 秒，不修改这些时限。夹具与私有数据目录只在本树 `.local/w10-m5-native/`，七分类全部关闭，只能清理本次合成夹具。失败不重开窗口，保留证据并交受阻回执。截至本段写入，窗口预算尚未使用。

### HOST-M35 第 1～6 节对照

| 节 | 实现与验证 |
|---|---|
| 1 命令表 | `COMMANDS` 和 `generate_handler!` 均为原 19 个后追加 IPC-M35 的 17 个，顺序一致，共 36 个。每个有公开 `cmd_*` 和 Tauri 包装；README 命令数同步。`HOST_M35_COMMANDS` 对完整契约表、实际包装参数和 handler 逐个比对，且确认内部 locate 不暴露。配置、capabilities、权限、CSP、窗口策略、依赖和锁未改。 |
| 2 转发 | `scan_start(None)` 仍为 `{}`；Some（含空数组）原样转 `locationIds`。`clean_prepare` 六个可选参数，只写收到的键，空排除省略；旧组请求与有排除请求逐字节不变。结论、查重两种新请求及混合无效值原样转交服务。`group_items` 的 None 为 null。其余 15 个新增转发命令逐项核对名字、键、值，成功对象和失败对象均不改写，标记 `HOST_M35_FORWARD`；新增 reveal 单独验证。 |
| 3 reveal/opener | `cmd_quarantine_reveal` 只用 target ID 调内部 `quarantine_locate`，失败原样返回。路径先核盘符绝对路径、危险字符/段、隔离根或 1～48 字符编号、目录元数据与非重解析属性，再调 Opener；成功 `{}`、打开失败 `unavailable`、非法路径 `invalid`。额外拒绝 Win32 歧义拼写、冒号流与通配符。`src/opener.rs` 独占一处 `Command::new`，读取唯一新增环境值 `SystemRoot`，检查普通 `explorer.exe`，只传一个路径参数，spawn 后不等、不经 shell、无新增系统函数。真实包装固定接 `ExplorerOpener`，测试核对该接线。假 Opener 验证隔离根/编号、大小写、服务失败、非隔离目录、遍历、逗号、UNC、文件、缺失目录、畸形字段、编号边界及本树 mklink 联接拒绝。元数据检查不宣称能消除并发替换竞态。 |
| 4 退出 | `clean_state` 同时把 cleaning/purging 判作 Cleaning，deduping 不算；退出与关窗继续走原 stop 逻辑。假后端只有收到 `clean_stop` 才由 purging 变 idle；有界退出回 Stopped、关窗等待回 true，各恰好一次停止；deduping 不发停止，标记 `HOST_M35_PURGE_EXIT`。原三态断言原样保留。 |
| 5 五测 | 仍只有 `host_config_boundary`、`host_navigation_boundary`、`host_command_registry`、`host_data_directory`、`host_service_wiring`，没有忽略或过滤。新覆盖归入后两测；旧断言只作下表获准调整，旧请求、返回、错误与标记不放松。新增夹具复用有父目录/随机前缀/规范路径核对的 WiringFixture，仅删本次新建目录，联接先单独解除。 |
| 6 负控与整机 | nc1/nc2 均只改一处生产代码，检查器观测到目标失败，立即 checkout 原字节并各自跑绿五测；详见下文。整机只按上述一窗预算运行，最终结果另记。 |

### 旧断言与调用逐处调整（原文 → 新文）

以下位置使用原始 `f93afb8e` 的行号；可在实现提交 diff 中逐处复核。新增辅助函数及四个 `HOST_M35_*` 标记不属于删改旧断言。

| 原位置 | 原文 | 新文 |
|---|---|---|
| 198 | `cmd_scan_start(backend)` | `cmd_scan_start(backend, None)`；旧 `("scan_start", json!({}))` 不动。 |
| 203 | `cmd_clean_prepare(backend, vec!["g1".into(), "g2".into()], None)` | `cmd_clean_prepare(backend, Some(vec!["g1".into(), "g2".into()]), None, None, None, None, None)`；旧请求不动。 |
| 285 fixed registry | `COMMANDS.as_slice(), names` | `&COMMANDS[..19], names`；标记仍为 `HOST_COMMANDS fixed registry`。 |
| 286～302 IPC 来源 | checkup IPC 表，chain M3C 的 skip 两项，然后 `.collect()` | 原链后增加 `.chain(m35_command_table().iter().map(|(name, _)| name.as_str())).map(str::to_owned)`；helper 只解析 IPC-M35 第 1 节新增表。 |
| 302 IPC 比对 | `names, contract_names` | `names, &contract_names[..19]`；标记仍为 `HOST_COMMANDS IPC table`；完整 36 项另由 `HOST_M35_COMMANDS` 核对。 |
| 365～377 scan 包装键 | 由旧 `{}` 导出的 `scan_start: []` | 对 expected_wrappers 显式插入 `scan_start: ["locationIds"]`；旧请求 JSON 未改。 |
| 378～381 clean 包装键 | `["excludeItemIds", "groupIds"]` | `["chosenMode", "conclusionVersion", "dedupeId", "dedupeVersion", "excludeItemIds", "groupIds"]`，按字母排序。 |
| 383～385 包装比对 | `wrappers, expected_wrappers` | `wrappers.iter().filter(|(name, _)| names.contains(&name.as_str())).map(|(name, keys)| (name.clone(), keys.clone())).collect::<BTreeMap<_, _>>(), expected_wrappers`（源码用完整 std 路径）；仍保留 `HOST_COMMANDS actual Tauri camelCase parameters`；新 17 包装另与 IPC-M35 键集比对，并核总包装数 36。 |
| 399 计数 | `COMMANDS.len(), 19` | `COMMANDS.len(), 36`；`HOST_M3C_SKIP command count` 不变。 |
| 401 skip 切片 | `&COMMANDS[17..]` | `&COMMANDS[17..19]`；skip 名字、顺序与标记不变。 |
| 405～408 handler 全表 | `handlers, COMMANDS` | 未改（包括历史文字 `matches all 19 commands`），实际两边都是 36 项。 |
| 439 handler 旧表 | `handlers, names` | `&handlers[..19], names`；`HOST_COMMANDS actual handler registration` 不变。 |
| 1434～1440 排除用例调用 | 第二参数 `vec!["g1".into(), "g2".into()]`，第三参数原 excluded 映射，无其它参数 | 第二参数改 `Some(vec!["g1".into(), "g2".into()])`；原 excluded 映射不变，其后增加四个 `None`。旧 `HOST_M3C_EXCLUDE` 两条 payload/逐字节断言完全不动。 |
| 1823 真实后端旧调用 | `cmd_clean_prepare(direct.as_ref(), vec!["g1".into()], None).unwrap_err()` | `cmd_clean_prepare(direct.as_ref(), Some(vec!["g1".into()]), None, None, None, None, None).unwrap_err()`；原错误断言不动。 |
| 1890 真实服务旧调用 | `cmd_clean_prepare(&backend, vec!["g1".into()], None).unwrap_err()` | `cmd_clean_prepare(&backend, Some(vec!["g1".into()]), None, None, None, None, None).unwrap_err()`；原错误断言不动。 |

没有改原 1635～1651 行的三态断言，没有改原有请求、原样返回、错误映射或任何旧标记。SPEC 第 5 节三类豁免及补单各处均在上表体现。

### 负控与恢复

- nc1：`src/opener.rs` 唯一改动为 `let quarantine = last.eq_ignore_ascii_case(".water-quarantine")` → `let quarantine = !last.is_empty()`；放过隔离目录名限制。`red-nc1` 有效，五测实际为 4 绿 1 红，仅 `host_service_wiring` 的新增断言失败：`HOST_M35_REVEAL reject oversized ID: Object {}`。不是编译错误或超时。随后立即 `git checkout -- apps/water/host/src/opener.rs` 并跑 test，5/5 通过。
- nc1 恢复后文件 SHA-256：`d833fa4e5747bfc896b869a610d87c62125d6d056c77c31720c7d1173db4b6c7`，与实现提交前后的工作字节一致。
- nc2：原票允许“SPEC 给的例子，可选更窄的一处”。选择只破坏 Some 分支：`Some(ids) => json!({"locationIds": ids})` → `Some(_ids) => json!({"locationIds": null})`。None 仍为 `{}`，因此旧 HOST_COMMANDS 不会先失败；有值位置列表转 null 由新覆盖捕获。`red-nc2` 有效，4 绿 1 红，仅新增 `HOST_M35_FORWARD scan exact bytes including None omission` 失败；左值为 `{"locationIds":null}`，右值为原位置数组。随后立即 `git checkout -- apps/water/host/src/commands.rs` 并跑 test，5/5 通过。
- nc2 恢复后文件 SHA-256：`27b67b48afceb9dac6196a399e92f3308383973623dda7fc7f2bac1251779795`，与实现提交前后的工作字节一致。
- 两次负控都未修改测试，恢复后工作树干净。四项新覆盖保留，没有为了负控放松旧请求断言；final 的 proofAudit 还会核对完整生产/test 哈希及负控后的立即恢复绿测。

### 检查命令与结果（final 前）

全部在唯一工作树根目录执行，命令前缀均为 `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W10-M5`。

| 参数 | 回执（位于本树 `.local/checks/WATER-W10-M5/`，archive 后同名归档） | 结果 |
|---|---|---|
| `--mode lock` | `2026-11-06T04-13-20.632Z-31260-lock-result.json` | passed，依赖与锁不变。 |
| `--mode check` | `2026-11-06T04-14-07.829Z-8160-check-result.json` | passed，政策、fmt、Clippy；之后仅完善新增测试失败标记和隔离目录大小写夹具，final 再核最终字节。 |
| `--mode test` | `2026-11-06T04-24-33.708Z-12216-test-result.json` | passed，精确五测全绿。 |
| `--mode red-nc1` | `2026-11-06T04-37-56.772Z-16004-red-nc1-result.json` | passed，观测到预期测试失败（cargo exit 101）。 |
| `--mode test` | `2026-11-06T04-38-41.347Z-7240-test-result.json` | passed，nc1 立即原字节恢复后的五测。 |
| `--mode red-nc2` | `2026-11-06T04-39-31.632Z-25020-red-nc2-result.json` | passed，观测到预期测试失败（cargo exit 101）。 |
| `--mode test` | `2026-11-06T04-40-12.430Z-940-test-result.json` | passed，nc2 立即原字节恢复后的五测。 |

另执行 `rustup run 1.95.0 cargo fmt --manifest-path apps/water/host/Cargo.toml` 格式化，及 `git diff --check`，均成功。一次用于生成追加适配器的 Python 命令因本机无 python 而未执行，随后直接用 apply_patch 完成；没有安装 Python 或下载依赖。没有测试失败或超时重跑。

### 未做与未验证

尚不宣称总控验收通过。新命令的真实 M7 服务接线、真实 Explorer 打开、真实隔离/永久删除、真实 purging 中关窗与系统关机、macOS、发布打包均未验证。没有删除、移动任何真实用户数据，没有改其它包、台账、契约、检查器、共享规则、Git 配置或远端；没有 push、merge 或改写历史。本轮无辅助代理。
