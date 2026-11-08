WATER-W14-H1 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w14-h1/docs/dispatch/reports/WATER-W14-H1-REPORT.md

执行日期：2026-11-08。实际执行模型：Codex / GPT-6（本会话标识；未使用子代理）。

工作树：`F:/new/smaltalk/water/.worktrees/w14-h1`；分支：`worker/water-w14-h1`。
首次 HEAD 干净，等于 `water-w14-h1-base-20261108`：`f91a982acbea483df753ce37fe586b53602fcdf1`。
实现提交：`bb87445dea154876cc9aa0fca7c53c29e6c22113`。
实现和下列安全范围内的验证已完成，但缺少 `native --final`，因此整体按受阻交回，不声明整机通过或总控验收通过。

## 受阻项与所需补充

通用规则 `docs/dispatch/WORKER-RULES.md:51` 原文：

> 测试的隔离根一律在本树 `.local/` 下，**不得**在任何盘根建 `.water-quarantine`。

H1 要求运行唯一一次 `native --final`，并限定“只碰本树夹具”，但目前冻结接线会使用盘根的 `.flick-quarantine`：

- 权威检查器 `F:/new/smaltalk/water/scripts/desktop-wave-check.mjs:192` 取本票的 `nativeQuarantineName`；H1 manifest 中该值为 `.flick-quarantine`。
- 同文件第 193 行：`const quarantineRoot = dir => dir.slice(0, 3) + quarantineName();`。本工作树在 F 盘，因此预期根为 `F:\.flick-quarantine`，不在本树 `.local`。
- 第 247–248 行将合成夹具交给正常宿主进程，只设置私有 `WATER_DATA_DIR`，没有注入夹具隔离根。
- 本树 `packages/water-service/src/quarantine.rs:411` 调 `platform.quarantine_base(drive)`，第 414 行缺省为 `format!("{drive}.flick-quarantine")`；`WindowsPlatform` 没有覆盖返回 `None` 的默认 `quarantine_base`。

以上是静态检查得到的冲突，未启动原生进程探测，也没有在盘根新建、检查内容或清理任何隔离目录。原生窗口、选择框和浏览器均为 0；`native-window-reservation.json` 不存在，原生窗口预算未使用。源文件 SHA-256、行号和摘录见 [native-boundary-review.json](../../acceptance/wave14/h1/receipts/native-boundary-review.json)。

最小补充：总控提供与 `.local` 隔离根规则一致的冻结 native 验证入口和输入；若票面的原意是本次 native 另有例外，需要在编号补单中明确该例外及对象所有权、回收边界。执行者未改服务、检查器、manifest 或通用规则，也未绕开检查器另开窗口。

## 工单逐项对照

| 工单项 | 实际结果 |
|---|---|
| 1.1 `IpcFailure.message_en` | 已加 `String` 字段，随 `Serialize` 输出；测试核对恰好三个错误字段。 |
| 服务错误转出 | `ServiceBackend` 原样移动 `code`、`message_zh`、`message_en`；真实 Service 搭配合成 Platform 与错误 Picker，经过 `custom_root_add` 和宿主适配器验证原文保留。 |
| `HostPicker::pick` 两个构造点 | 忙错误有英文；选择错误把 `IpcFailure` 三个字段原样转成 `IpcError`。测试只用 `relative`，在弹框前失败。 |
| 六条宿主错误 | 全部有英文，中文原值保留；覆盖非空、ASCII、精确 JSON 或原样转换断言。 |
| `app_info` | 未改生产代码。原有四个键和值的精确断言保留，新增 `HOST_W14_EN` 精确键集断言；没有 `system_language`。 |
| README | 已说明三个错误字段及英文原样转出。 |
| 1.2 安装包 | English 在 SimpChinese 前；无语言选择框；四组自定义文字各有两种 LangString，消息与完成页使用引用。 |
| 版本资源 | 每种语言各六项；英文 FileDescription 恰好 `Flick Setup`。 |
| 安装行为 | 未改快捷方式名、安装目录、注册表键、`FLICK_TEST` 分支或 `build.ps1`；仅编译测试版，未安装或运行。 |
| 2 测试 | 仍为原来的五个测试函数；新增断言只放在指定的既有函数中，标记为 `HOST_W14_EN` 和 `HOST_W14_NSIS`。 |
| 3 负控 | 两条均仅改一处被调用的生产逻辑，内层 cargo 以 101 退出并命中标记；逐个 checkout 恢复、核对 SHA-256、立即 test 转绿。 |
| 4 final | 干净实现提交上依次通过 check、test 两个 final；native 因上述边界冲突未运行；随后 archive 通过。 |
| 5 范围 | 实现只改七个白名单文件；未改依赖、Cargo.lock、bin 声明、系统函数、capabilities、CSP、窗口或导航安全设置。 |

五个测试仍为：`host_config_boundary`、`host_navigation_boundary`、`host_command_registry`、`host_data_directory`、`host_service_wiring`。没有新增墙钟断言，没有忽略、过滤、删除或减弱测试。

宿主英文如下，中文不变：

| 中文 | 英文 |
|---|---|
| Flick 服务暂时不可用。 | The Flick service is temporarily unavailable. |
| 系统文件夹选择框暂时打不开。 | The system folder picker is temporarily unavailable. |
| 这个文件夹不能加入体检，请换一个。 | This folder cannot be added to the checkup. Choose another folder. |
| 这个隔离区文件夹不能打开。 | This quarantine folder cannot be opened. |
| 隔离区文件夹暂时打不开。 | The quarantine folder is temporarily unavailable. |
| 正在进行另一项任务，请稍候。 | Another task is in progress. Please wait. |

## 检查命令与结果

下表每一行均使用以下实际命令前缀，在本工作树根目录执行；完整参数、退出码、源文件快照和日志见对应归档回执。

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W14-H1
```

归档回执均在 `docs/acceptance/wave14/h1/receipts/`。

| 参数 | 结果 / 退出码 | 回执文件 |
|---|---|---|
| `--mode baseline` | passed / 0；首次 HEAD 干净 | `2026-11-08T13-56-02.387Z-14356-baseline-result.json` |
| `--mode lock` | passed / 0；现有锁无改动 | `2026-11-08T13-56-29.791Z-15004-lock-result.json` |
| `--mode check` | passed / 0；fmt、clippy `-D warnings` | `2026-11-08T14-03-02.315Z-10420-check-result.json` |
| `--mode test` | passed / 0；5 passed | `2026-11-08T14-07-36.079Z-35332-test-result.json` |
| `--mode red-nc1` | passed / 0；预期 cargo 101，4 passed / 1 failed | `2026-11-08T14-14-44.135Z-23200-red-nc1-result.json` |
| `--mode test` | 恢复后 passed / 0；5 passed | `2026-11-08T14-15-42.026Z-22188-test-result.json` |
| `--mode red-nc2` | passed / 0；预期 cargo 101，4 passed / 1 failed | `2026-11-08T14-16-44.154Z-6688-red-nc2-result.json` |
| `--mode test` | 恢复后 passed / 0；5 passed | `2026-11-08T14-17-35.218Z-40604-test-result.json` |
| `--mode check --final` | passed / 0；HEAD = 实现提交，前后干净 | `2026-11-08T14-18-20.983Z-42708-check-result.json` |
| `--mode test --final` | passed / 0；5 passed，两个 proofAudit 均通过，前后干净 | `2026-11-08T14-18-39.269Z-15820-test-result.json` |
| `--mode native --final` | 未运行；受阻，不填写退出码或通过结果 | 无回执、无窗口预约、无截图 |
| `--mode archive` | passed / 0；203 个归档条目，15,436,410 字节 | 执行结果保留于 `.local/checks/WATER-W14-H1/2026-11-08T14-20-04.353Z-40452-archive-result.json`；归档索引见下方 |

所有 cargo 均由指定检查器调用，离线、jobs 1、私有 `.local/w3-cargo-home`、`.local/w3-target`、`.local/w3-tmp`。每次 cargo 前按进程名观察负载；没有输出其他进程的命令行。没有计时失败，计时重跑次数为 0。

证据中另有开工前预置的 `2026-11-08T13-31-50.788Z-31836-baseline-result.json`；由 archive 原样保留，不计作本执行者运行。本次 baseline 是 13:56 的那一份。

归档索引：[ARCHIVE.json](../../acceptance/wave14/h1/ARCHIVE.json)。203 条包括检查日志、源快照、安装包编译日志和静态边界说明；没有用旧原生证据替代缺失的 final。

## 负控细节与恢复

1. nc1：仅将 `apps/water/host/src/service.rs` 的 `ServiceBackend` 错误转换中的 `message_en: error.message_en` 换成 `String::new()`。`host_service_wiring` 在真实服务适配路径上以 `HOST_W14_EN real service adapter preserves code, Chinese and English verbatim` 失败，其余四测通过。不是编译失败或超时。
2. 用 `git -c core.hooksPath=NUL -c core.fsmonitor=false checkout -- apps/water/host/src/service.rs` 恢复。恢复 SHA-256 为 `e548d638c518e15d0647a68ec9f8ed6ef86478478a68c7f56f59130b4d19c609`，与变异前一致；立即 test 五测通过。
3. nc2：仅将 `apps/water/host/src/picker.rs` 的宿主自有“选择框暂时打不开”英文换成 `String::new()`。`host_command_registry` 以 `HOST_W14_EN host error has nonempty English` 失败，其余四测通过。不是编译失败或超时。
4. 用 `git -c core.hooksPath=NUL -c core.fsmonitor=false checkout -- apps/water/host/src/picker.rs` 恢复。恢复 SHA-256 为 `7b0b11280b83edab7653b57d97a441408187466fa369a1b1e073e48fe149dd37`，与变异前一致；立即 test 五测通过。

最终 test 的 proofAudit 又核对两条 red 与其紧随的 green：测试哈希相同，恢复后的生产哈希与最终实现相同，全部源快照的内容哈希正确。没有提交负控变异。

## 旧断言与测试构造迁移

以下行号均指首次 HEAD 中的 `apps/water/host/tests/host_v1.rs`。所有旧的 code、message_zh、精确比较操作和被测调用保留；新值是在原对象上增加下列 `message_en`，没有退化为仅检查存在或非零。

先列十二个必须补字段才能编译的原有 `IpcFailure` 构造；依赖它们的精确原样转发断言同时扩展为比较三字段：

| 基线行 / 位置 | 原值：code / message_zh | 新增 message_en | 原因 |
|---|---|---|---|
| 541 / skip add、remove | invalid / 原样失败。 | The original failure. | 三字段错误结构；继续精确比较返回值。 |
| 618 / skip unit、diagnostics | stale / 原样失败。 | The original failure. | 同上。 |
| 622 / skip unit、diagnostics | busy / 原样忙碌。 | The original busy reply. | 同上。 |
| 672 / exercise 全命令 | stale / 请重新体检。 | Please run the checkup again. | 同上。 |
| 731 / 不打开选择框 | invalid / 这个文件夹不能加入体检，请换一个。 | This folder cannot be added to the checkup. Choose another folder. | 精确期望补齐宿主新字段。 |
| 850 / M35 转发 | stale / 原样转交。 | The original reply. | 三字段结构，继续核对全部返回字段。 |
| 1132 / reveal 服务失败 | not_found / 服务原样未找到。 | The original service record was not found. | 继续核对服务错误原样返回。 |
| 2183 / ScriptedClean | invalid / 不会走到这里。 | This branch is unreachable. | 原有假后端错误须满足结构，不改清理语义。 |
| 2201 / UnknownClean | unavailable / 测试服务无法回答。 | The test service cannot respond. | 同上，原有未知状态断言不变。 |
| 2223 / SlowInitialState | unavailable / 测试状态暂时未知。 | The test state is temporarily unknown. | 同上，计时断言不变。 |
| 2278 / UnknownResetClean | unavailable / 测试状态暂时未知。 | The test state is temporarily unknown. | 同上，重置未知间隔断言不变。 |
| 2482 / clean prepare 排除项 | invalid / 原样失败。 | The original failure. | 继续精确核对错误与参数原样转发。 |

十处原有 JSON 期望也从二字段变为三字段：

| 基线行 / 断言 | 原值 → 新值 | 原因 |
|---|---|---|
| 694 / HOST_COMMANDS unavailable reply | `{unavailable, Flick 服务暂时不可用。}` → 原两值加 `message_en = The Flick service is temporarily unavailable.` | 精确序列化结果新增字段。 |
| 712 / unavailable picker mapping | `{unavailable, 系统文件夹选择框暂时打不开。}` → 加 `message_en = The system folder picker is temporarily unavailable.` | 六种映射中的不可用分支仍逐一精确核对。 |
| 723 / invalid picker mapping | `{invalid, 这个文件夹不能加入体检，请换一个。}` → 加 `message_en = This folder cannot be added to the checkup. Choose another folder.` | 无效选择的三种映射仍逐一精确核对。 |
| 2629 / HOST_BACKEND_RELEASE unavailable value | `{unavailable, Flick 服务暂时不可用。}` → 加 `message_en = The Flick service is temporarily unavailable.` | backend take 后的精确错误形状迁移。 |
| 2881 / cleanup_closed | `{unavailable, 这一版只做体检，清理功能会在下一版开放。}` → 加 `message_en = This version only runs checkups. Cleaning will be available in the next version.` | 保持 assert_ne 对“功能关闭”真实三字段错误的识别，避免只因缺字段便不等的弱化。 |
| 2905 / HOST_STARTUP_VISIBLE | `{unavailable, Flick 服务暂时不可用。}` → 加 `message_en = The Flick service is temporarily unavailable.` | 所有命令启动失败兜底仍精确比较。 |
| 2973 / HOST_CLEAN_ENABLED exact failure | `{unavailable, 这一版只做体检，清理功能会在下一版开放。}` → 加与 2881 相同的精确英文 | 保持 assert_ne 的原有强度。 |
| 2991 / HOST_PICKER busy | `{busy, 正在进行另一项任务，请稍候。}` → 加 `message_en = Another task is in progress. Please wait.` | IpcError 的精确三字段期望。 |
| 2998 / releases after error | `{invalid, 这个文件夹不能加入体检，请换一个。}` → 加与 723 相同的精确英文 | 错误后重复调用仍释放守卫，且字段原样转出。 |
| 3004 / config initial directory | `{invalid, 这个文件夹不能加入体检，请换一个。}` → 加与 723 相同的精确英文 | 生产配置的选择错误同时核对英文。 |

原有 `raw_invalid` 与宿主序列化结果的整对象相等断言未改；由于服务已新增英文，该断言自然比较三个字段。

## 安装包编译

实际包装命令：`node .local/w14-h1-evidence-tools.mjs installer`。该本地记录脚本调用原有 `powershell.exe -NoProfile -File packaging/windows/build.ps1`，传入检查器 test 构建的 `.local/w3-target/debug/flick.exe`、`-Version 0.1.0`、新的 OutDir、现有 NSIS 的路径及 `-Test`；不改变 build.ps1。完整原始参数和输出见 [installer-build.json](../../acceptance/wave14/h1/receipts/installer-build.json) 与 [installer-build.log](../../acceptance/wave14/h1/receipts/installer-build.log)。

- makensis：`v3.11`。
- 编译退出码：0；警告数：0。
- 产物：`F:/new/smaltalk/water/.worktrees/w14-h1/.local/w14-h1-installer-b789b9c0-a467-4800-bd9d-cea32974798f/Flick-Setup-0.1.0-test.exe`。
- 大小：3,954,121 字节。
- SHA-256：`b933c96922bcab57686e2cfbdd13d1ea84468b147353a8be09706a26c46b5723`。
- 安装程序未运行，没有实际安装、卸载、注册表写入或开始菜单改动。

## 自行处理的选择、边界与未验证项

- 按 W14-ADD-02 保留 app_info 四键，不添加原生模块、系统函数或依赖。
- 票面“从 CARGO_MANIFEST_DIR 往上两级”的文字与真实路径层数有小偏差。沿用既有测试的 `.ancestors().nth(3)`：`apps/water/host` → `apps/water` → `apps` → 工作树根，实际读取本树的 NSIS 文件，没有改契约或使用另一棵树的安装脚本。
- service.rs 实际是一处 Service → IpcFailure 的正向转换，以及 HostPicker 内 IpcFailure → IpcError 的反向转换；两处 map_err 均补原样英文，没有人为另加接口。
- 没有新增生产辅助接口；测试通过现有公开适配器、真实 Service 和记录型 Opener。相比改生产接口注入后端，采用已有 ServiceConfig 注入的范围更小。
- 词汇表未单列的译法：系统文件夹选择框为 `system folder picker`，暂时不可用为 `temporarily unavailable`，安装程序按票面为 `Setup`，重试为 `Retry`，运行库为 `Microsoft Edge WebView2 Runtime` / `WebView2 Evergreen Runtime`。checkup 和 quarantine 使用冻结词汇。
- 一次本地只读证据生成的内联 node 命令遇到 PowerShell 原生参数引号问题，未生成文件；改用本树 `.local/w14-h1-evidence-tools.mjs` 以 UTF-8 写证据。该忽略目录中的记录脚本不进入产品提交。
- 本地交付校验曾对原样归档运行 `git diff --cached --check`，因源快照的 CRLF 等行尾字节返回 2（归档目录内 858 条空白提示）。未改归档来消除提示；逐项 SHA-256 校验仍通过，回执的单独空白检查通过，产品的空白、fmt 和 clippy 检查也已通过。这不是产品检查器或产品测试失败。
- 真实整机冒烟、31 步流程、Mica/退出/私有 WebView/子进程关闭及原生截图均未验证；没有浏览器或选择框验证，没有拿旧截图充数。安装包系统语言自动选择仅由脚本断言和 NSIS 编译确认，未运行安装包验证其界面。新英文 UI 与系统语言的联合验证属于后续整合，当前底仍是原中文 UI。
- macOS 未验证；未清理真实用户数据。Rust 合成夹具只在本树 `.local/w3-f3-fixtures` 下按既有随机目录、父路径与前缀校验回收；安装构建产物和证据保留。
- 提交身份仅在提交命令进程内设为 `Codex-GPT-6 <Codex-GPT-6@localhost>`；没有修改 git 配置、远端或既有历史，没有 merge、push、amend、rebase、reset、clean、stash，也没有修改主线台账。
- 回执与证据单独提交；产品保持实现提交字节。交回前校验归档哈希及本回执 UTF-8，无连续问号或 U+FFFD；不再启动测试或后台进程。
