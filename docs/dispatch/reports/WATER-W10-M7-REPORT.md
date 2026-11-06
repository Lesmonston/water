WATER-W10-M7 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m7/docs/dispatch/reports/WATER-W10-M7-REPORT.md

日期：2026-11-06。执行者：Codex（GPT-6，未使用子代理）。这是开工审阅阶段的受阻回执，不是实现完成或验收通过回执。

## 现场与已做检查

- 权威票面：`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M7-SERVICE-20261106.md`。票面不在首次 HEAD 的工作树内，本次直接读取权威路径，未复制、合并或修改它。
- 唯一工作树：`F:/new/smaltalk/water/.worktrees/w10-m7`；分支：`worker/water-w10-m7`。
- 首次 HEAD：`b4b889a9412c47d8227c492eb76ef053fbd2b9c2`，与票面一致；开工时 `git status --short` 为空。
- 实现提交 SHA：无。产品、依赖、锁文件和测试均未修改；本次只新增此受阻回执并作单独提交。
- 已读工作规则、SERVICE-M35 全文、票面总控补充、IPC-M35 全文，以及定位冲突所需的旧 SERVICE／SERVICE-HARDENING／SERVICE-M3C／ADD-01／SERVICE-M3D、IPC 与现有测试。六包接口及服务全部源码的逐项审阅未完成；发现下述阻塞后停止，不能据此声称六包契约已全部核对。

在指定工作树根执行：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W10-M7 --mode baseline
```

退出码 **0**，`status: passed`。检查器回执：

`F:/new/smaltalk/water/.worktrees/w10-m7/.local/checks/WATER-W10-M7/2026-11-06T06-58-48.455Z-30856-baseline-result.json`

SHA-256：`b6eba46945ea9923f6356aed159e532fbb5db5845ecb11c498a6f9de57bab163`。

其中 `realDataRead: false`、`productTestsRun: false`、`nativeWindows: 0`、`directoryDialogs: 0`，检查前后 HEAD 与干净状态一致。baseline 只证明环境及输入就绪。

## 阻塞：M35 新字段与冻结的旧形状断言不相容，未获样例迁移授权

1. `packages/water-service/tests/service_v1.rs:449` 的 `fixtures()` 只叠加 checkup-v1 与 m3c-v1 两份样例；`:490` 的 `shape()` 在对象分支严格比较全部键，不能接受额外字段。
2. 同文件 `service_ipc_contract` 的旧断言直接将 `app_state`、`scan_progress`、`clean_progress`、`group_detail`、`locations_get`、`trends`、`clean_prepare`、`clean_result` 等返回值与这些样例比较。第一处已在 `:572`；`service_trends_locations` 的 `:1268` 也严格比对旧 trends 样例。
3. IPC-M35 明确要求这些命令新增字段。最小矛盾是 `app_state {}`：第 2 节（`:64`）要求增加 `quarantine`，隔离区为空也要返回 `null`；旧 `app_state_fresh` 样例只有 `app_version, platform, busy, drives, last_scan, insights, checkup_due` 七个键。新增一个值为 null 的键，也会先在 `shape()` 对象键集合比较处失败，不会被后面的 null 分支放过。
4. 票面第 5 节（权威票面 `:83`）规定“原有断言只能改 SPEC 第 11 节获准的四类”。SERVICE-M35 `:225`～`:229` 只授权设置版本、scan_start 参数、命令名单、age() 创建时间四类，不包含形状样例或旧形状期望迁移。
5. 工作规则 `docs/dispatch/W10-M35-WORKER-RULES.md:40` 明确要求：**“SPEC 没想到、但因本单改动而必然要改的旧断言：先写受阻回执，不要自行改。”** 本次按此停止。

静态核对到的必然增量如下；这是源码与样例比较，不是已经运行产品测试的失败记录。

| 旧返回值 | IPC-M35 要求新增 | 现有严格形状比对位置（service_v1.rs） |
|---|---|---|
| AppState | `quarantine` | 572、644 |
| ScanProgress | `locations` | 576 |
| CleanProgress | `phase`、`quarantined_bytes` | 580、698 |
| GroupDetail | `rows`、`rows_note_zh` | 648 |
| Locations | `home`、`sessions`、`manifests` | 652、653、670 |
| Trends | `clusters` | 678、1268 |
| CleanPreview | `delete`、`chosen`、`expected_skip` | 691 |
| CleanResultView | `quarantined` | 702 |

只读 PowerShell 将旧两份 JSON 按 `fixtures()` 的顺序叠加后检查键集合，确认 AppState、Locations、Trends、CleanPreview 的新旧键集合均不相等。没有改测试、跑变异或伪造红灯。

另已核对 `contracts/m35-v1/ui-fixtures-m35.json:2`：其说明明确写着 **“It adds keys only (all v2_*), it overrides none.”** 所以单纯再叠加这份文件，也不会替换现有旧断言读取的 `app_state_fresh`、`locations`、`trends` 等键。需要明确的样例映射或增量期望方案，不能只靠现有叠加机制解决。

历史上相同问题在仍有效的 `contracts/m3c-v1/SERVICE-M3C-ADD-01.md` 第 5.1 节曾单独授权，且要求保留 `shape()` 的严格比较与样例非 null 断言；那份授权指定的是 m3c 样例，不能当成此次 m35 迁移授权。

## 最小补充需求

请总控为 M7 出编号补充，明确授权旧接口形状测试迁移到 IPC-M35 的新增字段，并冻结以下处理：

- `fixtures()`／旧 `shape()` 调用中旧样例键到 M35 `v2_*` 样例的具体映射，或等价的旧样例增量期望；其中应涵盖旧 `{groupIds}` 清理预览的新增字段，以及空闲进度的新增字段。
- 保留 `shape()` 的完整键集合校验、原有非 null／样例存在断言和其它旧行为断言，不通过过滤新字段、缺样例返回 null 或按调用场景隐藏新字段绕过检查。
- 将此项列为 SERVICE-M35 第 11 节四类之外额外获准的旧期望变更；其余边界、测试数量和标记保持原要求。

不需要新增产品依赖、系统函数或放宽真实数据权限。此阻塞是旧测试期望与新接口要求的授权缺口，尚不能据此认定六个依赖包有缺陷。

## 未实施与未验证

- SERVICE-M35 第 1～10 节及票面第 2 节六项总控补充：均未实施；未生成实现提交。
- 旧断言：零改动，因而没有原值／新值变更清单。
- 六个包的接口差异：未完成全量核对，不报告“全部一致”。
- `lock`、`check`、`test`、三条负控、三个 final、`archive`：均未运行。没有负控失败消息或恢复哈希。
- `real`：未运行，真实冒烟计数无；没有清理、移动或删除任何真实文件。
- 未创建删除、隔离、声明或查重夹具；未打开窗口、选择框或浏览器；未下载依赖、联网、修改契约／检查器／台账／其它包；未 push、改远端或改写历史。

受阻现场以本回执提交保留在原分支。后续应从该提交接续，先解决上述授权缺口，再继续剩余预读与实现。交回后停止本票检查。
