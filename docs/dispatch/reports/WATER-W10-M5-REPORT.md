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
