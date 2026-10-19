# V/W 原生会话并行派前回执

2026-10-19，Windows x64，Node 24.16.0，Rust 1.95.0/MSVC。V/W 均已实际 baseline 通过，正式 READY，等待用户分别转贴到两个新执行对话；没有自动启动实现者。A–U及六补单保持 VERIFIED，M1仍未完成。

| 票 | 独占树 / 分支 | 交付 | 当前状态 |
|---|---|---|---|
| [WATER-W1-V](../tickets/WATER-W1-V-NATIVE-SESSION-20261019.md) | `.worktrees/v` / `worker/water-w1-v` | 真实 S→P→R→E/H/Q 会话 API 与单次 CLI | READY / baseline PASSED |
| [WATER-W1-W](../tickets/WATER-W1-W-NATIVE-REVIEW-20261019.md) | `.worktrees/w` / `worker/water-w1-w` | 原生会话页面、原字节流、固定程序启动器 | READY / baseline PASSED |

两树首次 HEAD 均精确为 `30a803537602211ed2a11c106c63fd27cefb260f`，标签 `water-w1-native-host-base-20261019`。两树基线前后干净，产物目录尚不存在，报告和证据父目录存在。正式票及主线 [manifest](manifest.json) 是权威；执行树先于正式票，直接读主检出绝对路径，不合主线取票。`dispatchedAt` / `startedAt` 保持 null，READY不代表已经外贴或运行。

## 冻结与并行条件

[ADR-014](../../decisions/ADR-014-native-session-and-viewer.md)、[原生会话协议](../../../contracts/native-session-v1/SPEC.md)、[页面协议](../../../contracts/native-review-v1/SPEC.md)、[共同规则](../../../contracts/native-host-batch-v1/COMMON.md)和[测试清单](../../../contracts/native-host-batch-v1/TESTS.json)已冻结。[新锁](../../../contracts/native-host-batch-v1/freeze.lock.json)104条目，继承13个锁族，保留旧291唯一文件，共336唯一冻结文件；在主检出、v、w三处逐字节核验通过。新锁自身也与共同基线相符。旧21个任务及槽位对象与 `22778e76ae7f45f9174f171794f41673b3647d0e` 深度相等，旧产品/helper/根Cargo未改。

V/W独占文件无交集，全部代码依赖已VERIFIED。V真实调用既有原生库；W独立消费八份实际原生捕获和旧T24份输入，公共流入口→HTTP→Chrome→真实下载可独立实现。W不依赖尚未交付V的代码，不放假可执行程序，也不开放可注入程序路径。真正固定 `water-native-session.exe`→`launchNative` 的联合链在两单交回后由总控运行；当前没有测过这条产品链。

旧T仅支持原有两个来源标签，保持不变；新协议使用 `native_scope_metadata`，不把原生捕获冒标成 `synthetic_memory`。本波不增加内容读取、真实用户目录、Web路径/扫描/进程入口或删除能力。新W目录有自身冻结LF属性要求，不改旧T的HTML/CSS字节属性。

## 实际基线与原字节证据

- V：[实际baseline回执](../../acceptance/wave1/controller/w1-native-host-preflight-20261019/v/2026-10-19T02-18-01.278Z-12416-baseline-result.json)，UTC `02:18:02.262–02:19:10.115`。私有离线依赖构建、真实S系统窗口取消/确认、P/R/A/E/H/Q八次捕获与冻结cases逐值相等，旧T24份通过。V自己的冻结夹具工厂生成固定4目录/6文件条目（含硬链接/junction），60字面/74逻辑字节；索引SHA256 `b7a196ccdfa5c761538112d8027df9cccc3b58400f0ce749625053f67ae825f8`。Rust不读普通payload，现场全保留。
- W：[实际baseline回执](../../acceptance/wave1/controller/w1-native-host-preflight-20261019/w/2026-10-19T02-18-01.280Z-26808-baseline-result.json)，UTC `02:18:02.551–02:18:07.996`。实际子进程原字节/严格UTF-8平台传输、原生来源保留、真实浏览器鼠标点击attachment下载通过；[下载原文件](../../acceptance/wave1/controller/w1-native-host-preflight-20261019/w/water-report-1.json)5096字节，和完整原生捕获的Q字符串逐字节一致。没有访问物理扫描fixture；私有浏览器profile/下载保留。
- [捕获与来源记录](../../../contracts/native-session-v1/PROVENANCE.json)：当前八份cases的SHA256为 `b00c73a252f68a057d652199c4847a2f3cdcd853936ca7a7be7f9ca9801cd900`。选择取消、完整、深度partial、预取消、observer取消、全局预算partial、深度0及根预算issue均来自实际既有库；源A报告、实际E/H/Q与调用源码哈希可追溯。总控只复用原夹具索引 `cb516913b9b034bc0fb5cbedd44c6445c25057cf5c810335ff319bbc31bcd9ff`。

[ARCHIVE.json](../../acceptance/wave1/controller/w1-native-host-preflight-20261019/ARCHIVE.json)记录69文件、1044145字节的来源、目标、长度和SHA256，所有原始CRLF/日志字节原样保存，采用局部 `-text`。包含两树全部baseline输出、全部controller preparation日志/回执/失败实验源快照、旧六case及旧PROVENANCE和实际W下载；不纳入可执行文件、target、缓存、profile或fixture payload。

总控复核命令 `node scripts/acceptance/ready-native-host-dispatch.mjs --check` 通过：[最终派前审计](../../acceptance/wave1/controller/w1-native-host-preflight-20261019/READINESS-AUDIT.json)记录三树冻结、旧21对象、当前源码来源/20依赖包、实际下载、全部归档字节、票面五测和本地文档链接检查。该审计只验证派前准备，不运行新产品测试。

准备期间三次可选UIA“同窗选择dir”扩展失败，原因 `Controlled dir item unavailable`；冻结前已撤下该扩展，源快照及失败日志保留。这是总控工具准备失败，不是新V/W产品测试失败。其后标准系统按钮流程通过，最终补齐八case并重新捕获；旧六case保留。准备中另有cases生成前平台探针ENOENT，不作为通过证据。实际S的选择结果可不同于起始目录已在原S独立验收，本波使用冻结标准driver和所选根父目录负控。

## 已完成、待执行和联合验收

总控已完成协议/来源/测试/helper冻结、两独立树、实际baseline、证据归档、正式票和READY登记。新V/W产品均未实现；两票各五项新产品测试、行为红与三项生产负控、final门均未执行。当前通过的probe只组合既有依赖，不是V产品实现；W平台探针也不是W页面实现。

执行者按票面先行为红、实现、完整五绿，再实际生产负控逐项恢复和final；一树一次一门，V jobs1，W最多一个私有Chrome。两票可分别先交回/验收，独立阻塞不拖住另一票。总控收单先核SHA/diff/范围/原字节，再独立复测与集成，最后在联合树实际构建V并运行W固定启动器、真实选择与两种取消、HTTP/Chrome和Q下载。实质修复编号回派。

真实用户scope、生产竞态、原生手势鉴真、macOS、桌面壳、打包和删除仍未验收；完整M1用户闭环仍未实现。本波没有额外内容采集授权。

## 两个独立新对话的外贴入口

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-V-NATIVE-SESSION-20261019.md，开始执行任务。
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-W-NATIVE-REVIEW-20261019.md，开始执行任务。
```

逐条复制即可；分别对应 [PASTE-V](PASTE-V.txt) 和 [PASTE-W](PASTE-W.txt)。没有实际启动证据前不记DISPATCHED/RUNNING。
