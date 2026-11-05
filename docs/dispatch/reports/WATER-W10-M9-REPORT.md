WATER-W10-M9 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m9/docs/dispatch/reports/WATER-W10-M9-REPORT.md

实际执行模型：Codex GPT-6。只读辅助 m9_readonly_review 仅审阅 APPS-M35 与检查器，没有写文件、运行检查或取得实现权限。

工作树：F:/new/smaltalk/water/.worktrees/w10-m9；分支 worker/water-w10-m9；首次 HEAD f93afb8e3c5cf4114927fe2ab6c14dbb033c7ffe，开工干净。
实现提交：9bf847f725d863f5c9914e4767025022fe27cce9。实现之后仅提交本回执与归档证据。

## SPEC 对照

1. 新建独立 workspace，edition 2024、rust-version 1.95、禁止自动发现目标及发布，仅两个冻结依赖，无构建脚本。Cargo.lock 由 lock 离线生成。lib deny unsafe，仅 native_windows.rs 使用四个 advapi32 函数，打开权限为 KEY_READ 加视图标志。仅三处卸载登记、每个子键三个允许字段；不读应用文件、不展开变量、不写注册表。
2. 实现所有公开类型、纯函数、JSON 接口；类型均派生指定 traits、结构拒绝未知字段；有效条目上限 5000，按不分大小写名称、scope、key 排序；根打不开视为空、子键打不开记 unreadable_keys。collected_at 为调用方时间的 Unix 秒字符串。
3. parse_entry 校验缺名、空白、类型、结尾 NUL、首尾空白与 1024 字符边界；ExpandSz 原样保留；位置剥一对引号和末尾反斜杠，只接受盘符绝对路径且拒绝百分号；跨 scope 条目保留。
4. installer_tokens 处理完整/下载中后缀与停用词、纯数字；name_tokens 仅切词/小写/去单字符；find 要求每个查询词命中，前缀方向与长度、数字限制符合契约。测试覆盖中文、大小写、MiniMax Hub、RX 版本、Photo 前缀方向。
5. 精确三个集成测试，全部通过。apps_read_real 两次读取固定同一 now，并与 PowerShell Get-ItemProperty 三处计数及 scope/key 集合相等；对照管道强制 UTF-8。所有真实断言仅输出固定标记，不输出差集、名称或位置。
6. 两条有效生产负控均抓住，原字节恢复后立即完整三测通过。real_smoke 已登记为 example，final 仅输出计数/标志。

没有旧测试或旧断言，未改任何其它包。没有创建物理夹具、原生窗口、选择框或浏览器。仅 Windows 验证，macOS 未验证；未接服务或桌面、未做删除。

## 负控与恢复

- nc1：native_windows.rs 在打开根前跳过 machine_32；有效 red 08:48:28，以 APPS_READ: per-scope count differs 失败。随后 git checkout -- 该文件，08:48:33 三测绿。
- nc2：lib.rs 将查询词的 .all(|q| ...) 改为 .any(|q| ...)；有效 red 08:49:36，以 APPS_MATCH: installer query 失败。随后 git checkout -- 该文件，08:49:40 三测绿。
- 两次恢复后的检查器 productionHash 均为 425c03e450ba41891fd899494c180f1aad93f0babf99bea417e7038606fc6912，与实现及 final 一致；每个源文件 SHA-256、负控快照与 testHash 在归档 result.json 内。final test 的 proofAudit 通过两条负控与即时恢复核对。

## 真实冒烟

real --final：machine 119、machine_32 135、user 26，truncated=false，unreadable_keys=0。不输出程序名、键名或绝对位置。三处只读对照测试也通过。

## 开发期失败记录

首次 check 抓到 Clippy is_multiple_of 写法，首次 test 抓到测试闭包缺少 Vec 类型标注；均已修正。随后 PowerShell 默认输出编码使真实键集合不等，固定 UTF-8 后通过。
nc2 首次替换未命中 rustfmt 拆行后的字符串，未形成生产改动，red 被检查器拒收；提前的 final test 因缺有效 nc2 被拒收。这两条失败不计有效负控；随后修改正确位置，完成有效 red、原字节恢复与完整绿测，再通过 final test/real。所有失败原始日志保留，未改检查器或放宽断言。

## 检查清单

所有 checker 命令都从本树根运行，前缀为 `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W10-M9`，下表列出后缀及回执。格式化另用固定 1.95.0 cargo fmt；提交前 git diff --check 通过。依赖未下载；检查串行、私有 target、单线程。08:18 的 baseline 为开工前总控已有记录，其余为本次执行。

| 回执（UTC 时间文件名） | 命令后缀 | 结果 |
|---|---|---|
| 2026-11-05T08-18-39.645Z-7892-baseline-result.json | --mode baseline | passed |
| 2026-11-05T08-42-56.899Z-21488-baseline-result.json | --mode baseline | passed |
| 2026-11-05T08-46-26.894Z-19268-lock-result.json | --mode lock | passed |
| 2026-11-05T08-46-30.310Z-21892-check-result.json | --mode check | failed |
| 2026-11-05T08-46-52.999Z-16768-test-result.json | --mode test | failed |
| 2026-11-05T08-47-22.949Z-12944-check-result.json | --mode check | passed |
| 2026-11-05T08-47-26.113Z-4168-test-result.json | --mode test | failed |
| 2026-11-05T08-47-55.503Z-32996-test-result.json | --mode test | passed |
| 2026-11-05T08-48-28.362Z-3592-red-nc1-result.json | --mode red-nc1 | passed |
| 2026-11-05T08-48-33.050Z-33436-test-result.json | --mode test | passed |
| 2026-11-05T08-48-51.691Z-23340-red-nc2-result.json | --mode red-nc2 | failed |
| 2026-11-05T08-48-54.264Z-28112-test-result.json | --mode test | passed |
| 2026-11-05T08-48-57.083Z-12768-check-result.json | --mode check --final | passed |
| 2026-11-05T08-49-00.120Z-33576-test-result.json | --mode test --final | failed |
| 2026-11-05T08-49-36.240Z-14104-red-nc2-result.json | --mode red-nc2 | passed |
| 2026-11-05T08-49-40.348Z-2756-test-result.json | --mode test | passed |
| 2026-11-05T08-49-44.373Z-9492-test-result.json | --mode test --final | passed |
| 2026-11-05T08-49-47.042Z-29216-real-result.json | --mode real --final | passed |
| 2026-11-05T08-50-01.568Z-21396-archive-result.json | --mode archive | passed |
