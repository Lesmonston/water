WATER-W1-AC 补充单03 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/ac/docs/dispatch/reports/WATER-W1-AC-ADDENDUM-03-REPORT.md

2026-10-24，**BLOCKED**。同一干净 HEAD 的 final check 与 final test 均通过；唯一一次 native 验收失败，窗口预算已占用，未重试。静态检查确认冻结 Windows PowerShell helper 的中文正则被错误解码，但实际 UIA 文本未被失败路径保存，页面显示和正常关闭仍未验收。产品源码没有改动。

## 身份、基线和范围

| 项 | 实际值 |
|---|---|
| 执行者/模型 | 原 AC 对话，Codex / GPT-6；会话未暴露更细模型 ID |
| 工作树/分支 | F:/new/smaltalk/water/.worktrees/ac / worker/water-w1-ac |
| 首次干净续做 HEAD / 三 final 受测 HEAD | **82d04aaeef73030f65bc0a070b99a5517fd5d6a3** |
| 产品/测试/锁实现 | eb7f80178191e233068015bbc26dc9798ac8cb22；14 个文件与其原字节一致 |
| 锁 SHA | c56b58aa141a85617a59db4de679ff73d69827aee81bda958b1fdee0c9bbbfe8 |
| source/test 证明复用哈希 | productionHash `38c7a927cb30fd79f91e5e52e875a81dcb1585b359390dca50af5b24a2d2139d`；testHash `211ba3014991309b2bda94cd422f4496c2ac552fa57507c3bb35283ae2acefe7` |
| 本补变更 | 仅本报告和 addendum-03 新证据；后加提交不夹带产品字节，以 worker/water-w1-ac 的最终 HEAD 定位 |
| 原件/边界 | 原报告/46及补单02报告/189证据只读；523约束保持，无子代理/worker、push/merge、台账/主检出/其它票修改 |

## 实际命令与退出

从原树仅调用绝对控制入口 `node F:/new/smaltalk/water/scripts/ac-final-check.mjs --task WATER-W1-AC --mode <mode>`，三个产品门加 `--final`。resume 直接执行；三 final 的隐藏非交互 launcher 仅调用同一入口并记录实际退出，不更改环境或断言。没有运行旧入口、下载/preflight/先红/负控，也没有提前打开预览。

| 时刻/模式 | 实际结果 | 原始证据 |
|---|---|---|
| 04:33:17 resume | Node exit0 / passed；精确干净82d04aa，14源码/锁保持，523约束通过 | [resume](../../acceptance/wave1/ac/addendum-03/raw/2026-10-24T04-33-17.720Z-24524-resume-result.json) |
| 04:33:56 check --final | metadata/配置策略/旧proof/范围/fmt/clippy均通过；Cargo/helper/launcher exit0。clippy实用相同镜像参数位于子命令之后，offline/locked/all-targets/-D warnings不变 | [check](../../acceptance/wave1/ac/addendum-03/raw/2026-10-24T04-33-56.602Z-43316-check-result.json)、[clippy日志](../../acceptance/wave1/ac/addendum-03/raw/2026-10-24T04-33-56.602Z-43316-check-6.log) |
| 04:35:09 test --final | metadata/Cargo/helper/launcher exit0；desktop_config_boundary、desktop_navigation_boundary、desktop_embedded_page 三项全绿，0 ignored/measured/filtered | [test](../../acceptance/wave1/ac/addendum-03/raw/2026-10-24T04-35-09.874Z-24884-test-result.json) |
| 04:36:01 native --final | metadata/build exit0；原UIA helper exit1，外层helper/launcher exit1。固定title窗口已找到，但 required-page-text断言失败；正常桌面exit为null，外层记录终止自有PID41836。全门28.723秒，无第二次启动 | [native失败](../../acceptance/wave1/ac/addendum-03/raw/2026-10-24T04-36-01.313Z-28360-native-result.json)、[UIA stderr](../../acceptance/wave1/ac/addendum-03/raw/2026-10-24T04-36-01.313Z-28360-native-6.log)、[自有进程记录](../../acceptance/wave1/ac/addendum-03/raw/2026-10-24T04-36-01.313Z-28360-native-process.json) |

三个 final 的 before/after 均为相同干净82d04aa，source/test 哈希与获准复用的旧证明完全一致，源代码未改。旧有效 AC_BEHAVIOR、nc1/AC_CAPABILITIES、nc2/AC_NAVIGATION 与每次即时恢复/完整三绿，由新冻结 proof 从补单02已提交归档读取并逐字节复核；不机械重复，也不将本次UIA失败计为新负控。旧失败仍保持。

## 逐需求状态

| 要求 | 当前结果 |
|---|---|
| 精确workspace/四依赖/feature/独立锁/来源许可证 | 三门metadata均核对通过；Rust1.95、私有home/target/tmp、jobs1/600秒保持，无补下载或全局/项目Cargo配置写入 |
| 配置/CSP/窗口/权限边界 | 静态policy、真实公开validator三测试、fmt及clippy全通过；空capabilities/windows/plugins、禁asset/global Tauri/IPC/JS/拖放/下载/权限请求语义不变 |
| 导航与生产接线 | 原公开导航validator与main/on_navigation接线保持，外部/混淆URL拒绝与两条真实生产负控证明已复用；不接AA/AD或扫描 |
| 四文案和自有静态资产 | 源文件与三测试证明保持；**实际WebView/UIA文案未验收**。无新增资源、第三方logo或截图 |
| 私有profile | 新建了本树.local/desktop-webview/preview-41836-1792816571798023900；只读目录元数据，未读profile内容或清理。源码显式data_directory保持；进程观察未捕获运行中的子WebView参数，不冒称实际profile链路完全验证 |
| 唯一静态窗口与退出 | 已启动一次native并找到固定title窗口；required-page-text失败、强制终止自有进程，**非正常exit0通过**。窗口reservation已用，不自动重置；目录选择器调用0 |
| 未知/后续范围 | Windows真实桌面扫描整链、用户scope/自然同意/生产竞态、macOS/M1仍未验收，无真实用户目录/物理fixture/AA旧图片访问 |

## 已证实的控制编码问题与仍未知的页面

[静态parser取证](../../acceptance/wave1/ac/addendum-03/raw/native-helper-encoding-inspection.txt) 记录原PS1 SHA `11ea5436c13b9a0c9aa77305eb6570f2fc60c5ca24215e8e64acedad1fbc6363`、无UTF-8 BOM，以及本机 Windows PowerShell5.1.26100.8875/默认Windows-1252。按UTF-8解码的文件含正确中文，实际 Parser.ParseFile 得到的两条中文正则却是乱码，码点不一致。

[无UI内存复现](../../acceptance/wave1/ac/addendum-03/raw/native-helper-no-ui-proof.txt) 用码点构造完全正确的“桌面壳已启动”“尚未接入扫描”，两条实际解析正则均无法匹配。此取证不执行原helper或产品、不打开窗口，证实检查器误解码，不是第二次native验收。

失败UIA helper在断言通过后才输出采集文本，所以本次实际页面文本没有保存。不能从编码缺陷反推页面显示正确、也不能将合成字符串当真实UIA证据。`record.systemNativeDialogs` 保持初始化0，是因为成功分支未执行；并不表示没有打开窗口。固定title搜索已通过、原1次窗口预算已消耗。

最小条件：总控编号新增/冻结明确编码的native helper与入口（可用ASCII码点构造相同文案），保持原PID/title/文案断言、30秒与无像素边界，失败前也保存有界自有UIA文本；然后明示新续做基线、旧check/test证明复用及新的有界单窗授权。候选方案见 [NATIVE-CONTROL-BLOCKER.md](../../acceptance/wave1/ac/addendum-03/NATIVE-CONTROL-BLOCKER.md)。本执行者没有修改原helper/编码/全局设置、放宽断言或重开窗口，没有申请聊天临时放宽。

## 进程、归档与结束

[PROCESS-END.txt](../../acceptance/wave1/ac/addendum-03/raw/PROCESS-END.txt) 实际核到自有桌面/检查器/Cargo/子WebView残留0；helper记录强制终止桌面1次，手动终止0，正常exit未知。profile与日志保留。额外18秒只读进程观察启动在原桌面退出后，样本为空，不能拿它证明运行时子进程/profile或正常关闭。

截图/像素读取/实际看图均0；不将UIA静态检查描述为看图或截图通过。原WebView profile/cache/crate/target/binary不纳Git、不清理，网络/代理/证书与任何持久Cargo配置未改。

[ARCHIVE.json](../../acceptance/wave1/ac/addendum-03/ARCHIVE.json) 逐项source/archive/bytes/SHA原字节归档本次resume/三final、源码快照、launcher参数/退出、native reservation/失败、编码/内存复现、进程与限制。[HANDOFF-AUDIT.json](../../acceptance/wave1/ac/addendum-03/HANDOFF-AUDIT.json) 再核523冻结、旧46/189原件以及产品与测试不变。原报告/证据不复制覆盖，索引与报告自身不做自引用hash。全部逐路径暂存，日志显式-f；手写报告与原始日志空白检查分别记录真实退出。

[逐文件暂存与空白记录](../../acceptance/wave1/ac/addendum-03/raw/EVIDENCE-STAGE-CHECKS.json)：手写报告/证据 exit0；原始日志 exit2，来自native-6.log的原始PowerShell CRLF/末尾空行，逐行原字节保留，不清洗。[HANDOFF-VALIDATION.json](../../acceptance/wave1/ac/addendum-03/HANDOFF-VALIDATION.json) 记录来源/归档/暂存blob、本地报告链接、产品字节不变核对；该验证记录随后纳入最终索引，不做自引用hash。

受阻交回后停止本票产品改动和测试，不push/merge/改主台账，不记SUBMITTED/VERIFIED。当前可确认新final check/test通过，native失败且无法据现有文本证据验收页面/正常关闭，等待总控编号修订。
