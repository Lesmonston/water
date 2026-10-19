# WATER-W1-W：原生会话页面、原字节流与固定启动器

总控2026-10-19，正式票。只有主manifest本票READY且baselineStatus=PASSED才开工。V/W可同波分别外贴，无自动实现者。

| 项 | 唯一值 |
|---|---|
| 权威票面 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-W-NATIVE-REVIEW-20261019.md |
| 唯一树 / 分支 | F:/new/smaltalk/water/.worktrees/w / worker/water-w1-w |
| 精确首次HEAD | 30a803537602211ed2a11c106c63fd27cefb260f |
| tag | water-w1-native-host-base-20261019 |
| manifest | F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json |
| 冻结 | contracts/native-host-batch-v1/freeze.lock.json；104新锁条目/13继承锁，336唯一文件，旧291不变 |
| 实现目录 | prototypes/native-review |
| 新报告 | F:/new/smaltalk/water/.worktrees/w/docs/dispatch/reports/WATER-W1-W-REPORT.md |
| 证据 | F:/new/smaltalk/water/.worktrees/w/docs/acceptance/wave1/w/ |

先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、ADR-014、W1-NATIVE-HOST-WORKER-RULES、NATIVE-HOST-PLAN及READY-REPORT、contracts/native-host-batch-v1/{COMMON.md,TESTS.json}、native-session-v1/SPEC与cases/PROVENANCE，以及contracts/native-review-v1/SPEC.md。V再读实际S/P/R/E/H/Q接口；W再读ATTRIBUTES及真实I/T模型。主检出票面权威，执行树早于正式票，直接读绝对路径，不merge取票。

首次必须精确HEAD/分支且干净、实现目录不存在、冻结一致；不符保留现场受阻，不reset或换树。总控已在本树实际baseline，开工仍先复核：

```powershell
node scripts/native-host-check.mjs --task WATER-W1-W --mode baseline
```

baseline只测既有依赖、捕获和工具，不代表V/W产品或五测试通过。W baseline只读冻结捕获并做平台stream/HTTP/下载探针，没有访问原controller/r物理fixture。

## 实现与行为

本票是新的prototypes/native-review；不改T/I或其它产品。开工先按contracts/native-review-v1/ATTRIBUTES.json创建本目录.gitattributes，HTML/CSS/MJS固定LF，不改根/旧属性。旧water.scan-review-bundle.v1必须真实委托T模型并保持原标签；新native-session协议按独立原生规则验证，不改tag后调用T。

原生确认单快照的未知/保护、实际祖先原因、源totals、Q白名单/alias/计数/尺寸都严格一致；native Windows名字规则遵守R。HTML字面用旧协议的合法文本样本，不放宽原生路径。源policy和no-follow/预算可见，Completed只代表策略内覆盖；选择取消无报告/无下载，确认后扫描取消有真实报告和Q下载，scope根空串与None分明。

host readSession只收Uint8Array/Buffer，每块复制，严格UTF-8/64MiB+可选单LF/单紧凑对象/无BOM/无重复键，错误固定；旧协议不从native stream进入。startFromStream必须真实readSession→startServer，在首次await前同步捕获服务器输入，不能文件/env/样例fallback。

launch.mjs固定本树.local/next-target/debug/water-native-session.exe，经realpath/普通文件/项目内校验，args恰[initialDirectory]、shell=false、stdin ignore/stdout+stderr raw pipe；不接受binaryPath/env/PATH/Cargo/任意命令。初始目录仅可信本机CLI/Node参数，页面/HTTP没有路径/扫描/进程入口。等退出0且完整合法bundle才开页；仅杀自有child，诊断stderr不回显，启动失败固定净化错误。

独立W树没有V产品。关键实际组装用公开startFromStream消费保留的实际S/P/R/E/H/Q捕获，再走HTTP/Chrome/真实下载。测试可运行冻结scripts/acceptance/native-session-stream-probe.mjs输出某一保留捕获（argv是0..7的固定case index），明确是回放；不能放假water-native-session.exe或加生产测试模式。真实V程序的固定launchNative整链由总控收两单后联合验收，回执不得冒称本票已运行该链。

五测试为模型/协议、原字节流及启动器无效参数、HTTP/隐私三项，以及原生/旧输入实际页面下载、双尺寸/两种取消/安全两项。覆盖八份真实捕获与旧T24份，两份合成重命名原生变体（不冒称新扫描）；严格UTF-8负控应破坏合法自由路径及对应title中的字节，使宽松解码仍能过模型，真实观察W_STREAM_BOUNDARY。

实际系统鼠标事件点击下载到本树.local/browser-lab新私有目录，逐文件与当前Q原字节、固定attachment名/headers比较；选择/筛选不能改变整份导出。失败仍执行其它独立样本并保存native-review-1440x1000.png、native-review-900x800.png、native-review-cancel.png三当前图，实际查看后记录，不把png存在当正确。最多一个独立Chrome，profiles/下载保留，无物理扫描fixture或真实用户目录权限。

## 独占白名单

- prototypes/native-review/.gitattributes
- prototypes/native-review/index.html
- prototypes/native-review/styles.css
- prototypes/native-review/model.mjs
- prototypes/native-review/app.mjs
- prototypes/native-review/server.mjs
- prototypes/native-review/host.mjs
- prototypes/native-review/launch.mjs
- prototypes/native-review/tests/model.test.mjs
- prototypes/native-review/tests/browser.test.mjs
- prototypes/native-review/README.md
- docs/dispatch/reports/WATER-W1-W-REPORT.md
- docs/acceptance/wave1/w/ 内本票新文件（V src仅Rust；证据只json/log/txt/png）

其余只读，包括旧A–U源码/测试/根Cargo、所有契约/冻结输入/helper/锁、台账、上游与其它树。接口/依赖/权限冲突写受阻报告交总控，不问用户临时放宽。零npm，不建package.json，不安装/下载依赖。

## 验证、负控和交回

精确五顶层：native_review_protocol、native_review_stream_and_launcher、native_review_http_and_privacy、native_review_live_inputs_and_download、native_review_layout_cancel_and_safety。无skip/filter/嵌套凑数；一树一次一门，单子命令180秒。最多一个独立Chrome，不加载真实用户profile。

先写完整五测与可运行骨架，骨架需完成服务/页面ready和三图握手，不能缺文件或CDP超时造红。 目标消息含W_BEHAVIOR；随后实现并suite五绿。

格式/样式/源码和测试字节稳定后，逐项真实改坏生产逻辑，red-nc1、red-nc2、red-nc3命中W_Q_ONLY/W_SELECTION_CANCELLED/W_STREAM_BOUNDARY。每红立即原字节恢复、核hash、suite完整五绿再下一项。不改测试/runner/超时，不留测试开关。初次行为红保留；如最终字节不同，稳定版重放相同缺陷red-behavior后恢复suite，说明为实现后重放，不能冒称首次先红。四条当前字节链均由final proofAudit核。

统一形态（mode分别为red-behavior、suite、red-nc1/2/3；V另有lock）：

```powershell
node scripts/native-host-check.mjs --task WATER-W1-W --mode suite
```

提交实现/测试得到干净SHA，在同一SHA串行跑全部final：

```powershell
node scripts/native-host-check.mjs --task WATER-W1-W --mode check --final
node scripts/native-host-check.mjs --task WATER-W1-W --mode test --final
node scripts/native-host-check.mjs --task WATER-W1-W --mode browser --final
```

所有输出在本树.local/checks/WATER-W1-W/。原字节归档本票证据目录及ARCHIVE.json（来源/长度/SHA），含全部失败/原好坏恢复快照和图片；不纳target/cache/binary/profile/fixture payload。预置证据.gitattributes冻结不改，log显式-f。显式逐文件add，不全树add/clean/reset/merge/rebase/push。证据/报告提交只追加证据，不夹未复测产品改动。

报告写完整基线/受测SHA/报告提交定位、逐需求/命令退出/全部失败/红绿/实际模型/未验证/物理与来源边界。固定启动器真实V链未运行需明确写出；总控必须在联合树用真正V.exe再验。 Windows受控不冒充macOS/自然手势鉴真/恶意竞态/真实用户scope/桌面/M1完成。完成仅SUBMITTED，交回后停改。

报告首行及通知：

```text
WATER-W1-W 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w/docs/dispatch/reports/WATER-W1-W-REPORT.md
```

受阻将“已完成”改为“受阻”，列最小补充需求；不擅自扩权限或接口。
