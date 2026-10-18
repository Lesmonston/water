WATER-W1-T 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/t/docs/dispatch/reports/WATER-W1-T-REPORT.md

交付状态为 **SUBMITTED**，待总控独立验收与集成。日期：2026-10-19 Asia/Tokyo；原始运行记录使用 2026-10-18 UTC。本回执未改主线 manifest/registry，不自行宣布 VERIFIED 或 M1 完成。

| 项目 | 实际值 |
|---|---|
| 权威工单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-T-SCAN-REVIEW-20261018.md |
| 工作树 / 分支 | F:/new/smaltalk/water/.worktrees/t / worker/water-w1-t |
| 完整首次基线 | `3d0faefa97267a6aa57f880a315a2cde7fe06e98` |
| 固定 tag | `water-w1-parallel-wave-base-20261018` |
| 实现及全部 final 受测 SHA | `f26f727b715f06d97bd8a5c13e6e40225a2f6d68` |
| 报告 / 证据提交完整 SHA | 见后置提交的 [SUBMISSION.json](../../acceptance/wave1/t/SUBMISSION.json) 中 `report_commit`；该指针避免报告提交自指，指针提交不改产品或本报告 |
| 最终生产源码聚合 SHA256 | `d6d6b0dcd55767101c6d98d21c5db82b0ed95c37a8d79c245007e4864516b720` |
| 最终测试聚合 SHA256 | `dde3fcdce35538c3bf0b84b0d7e377242c0c85582a5f2fc142e561e1d9584f28` |
| 实际环境 | Windows x64，Node v24.16.0；已安装 Chrome 155.0.8059.80，冻结 browser-lab 独立 headless profile |
| 执行引擎 / 模型 | Codex API 会话，GPT-6 系列；会话未暴露更细后端型号。未启动子代理或其它实现 CLI |

**实现与逐项对照**

只新增票面八个 `prototypes/scan-review/` 文件、本回执及 `docs/acceptance/wave1/t/` 内证据。无 package.json、npm 依赖、旧产品或根 Cargo 变更。页面沿用 I/K/O 的本项目样式，没有外部字体或资源。

| 票面要求 | 实现与实际验证 |
|---|---|
| 真实 I 公开模型，24 份实际 A/E/H/Q 供数 | `assertReportView` 实际导入 I；`selectFindings`、`formatBytes` 原函数重导出。worker baseline 重跑真实 A/E/H/Q/I 24 份及 Q 九错误，通过；生产不读冻结 bundle |
| 严格 bundle / summary / Q 一致性 | 严格 1..32、唯一 scan_id、source_kind、对象字段、I view、全部 H 计数/桶/原 totals；Q 紧凑原文本、16MiB UTF-8 上限及 JSON.stringify 恒等，九顶层与全部嵌套字段逐值/原序校验。scope/finding 局部序号、关联、evidence 枚举、project_count、size、Unknown 都与 view 对照 |
| 固定 API 与输入不变 | `assertReviewBundle` 返回原对象；`selectSnapshot` 整包先验证，未知返回 null；`exportText` 返回已校验的原 Q 字符串，未知固定错误。冻结输入、全部 24 份、重命名 ID、重排快照、额外键、重复键、空白、非规范 escape、错误 alias/计数/Unknown、跨快照 Q 拒绝均通过 |
| caller 内存服务与隔离 | import 不自启；`startServer({bundle,port})` 先验证，同步捕获完整 JSON 和各份 Q 字节，再执行异步资源检查。实际启动两组不同 caller（24 份及重排子集 4 份，首 ID 为 caller-alpha/beta），启动后改嵌套对象/文本并 pop 数组，HTTP 与 Chrome 保持完整原捕获 |
| 固定路由与下载 | 仅 127.0.0.1、精确 Host、GET/HEAD、原始 URL 固定白名单；`/exports/1.json`..N 固定 attachment 文件名、Content-Type、精确 UTF-8 Content-Length、HEAD 无正文。HTTP 遍历、编码、query、fragment、重复斜线、路径参数、错 Host、POST、所有固定资源安全头/CSP 均通过 |
| 实际点击保存 Q | 按钮文案“下载脱敏报告”。每轮完整浏览器测试真实点击 24+4 次，每次新建本树 `.local/browser-lab/review-download-*` 私有目录，读取磁盘文件核文件名和 Q bytes，并核原 ID/路径/证据 canary 不泄漏；不是 fetch 替代下载。首 Q 1379 字节，其他快照长度各自核对 |
| 完整页面与来源边界 | 所有快照、状态、来源声明、scope 覆盖、根 issue 与取消空态同步；六种列表筛选/排序及重置，来源 totals 和完整 Q 预览不变。I BigInt 及完整 u64 十进制保留；Unknown 显示“未知” |
| 安全 DOM 与键盘 | 动态文本只使用 DOM/textContent，HTML/脚本文字保持字面；详情呈现完整 E 字段，Enter 打开、Tab 进入可滚动字段区、Escape 关闭并返回原按钮，真实 Chrome 验证通过 |
| 双尺寸与截图 | 1440×1000、900×800 无页面横向溢出；常驻只读/非真实用户目录说明，完整 Q 预览可滚动。已实际查看最终三张截图，内容含未知总量、HTML 字面、来源边界、脱敏预览与下载入口 |

**完整测试与红绿证据**

精确五顶层测试为 `review_bundle_validation`、`review_selection_and_privacy`、`review_export_bytes`、`review_live_input_and_download`、`review_layout_and_safety`。所有 suite/red 均完整运行五项，无 skip/filter/嵌套测试凑数。每条负控只改真正生产逻辑，未修改测试或添加运行开关；每次记录原/坏/恢复哈希，原字节恢复后立即完整五绿。

统一命令为 `node scripts/parallel-wave-check.mjs --task WATER-W1-T --mode <mode>`；下列 final 带 `--final`。全部精确 argv、子进程退出码、时间与日志名见 [RUNS.json](../../acceptance/wave1/t/RUNS.json) 及各原始 receipt/log。红门 helper 退出 0 表示确认完整测试进程退出 1 且命中目标。

| 顺序 / mode | helper 退出码 / 结果 | 原始 receipt 文件名前缀（均在 helper/） |
|---|---|---|
| 总控原 baseline（继承现场，非本会话重跑） | 0，依赖通过、无 T 产品测试 | `2026-10-18T14-33-54.998Z-42184-baseline` |
| worker baseline | 0，依赖及真实点击能力通过 | `2026-10-18T14-58-27.654Z-39676-baseline` |
| 首次 red-behavior | 0，完整五测失败；保留初次骨架现场 | `2026-10-18T15-03-05.907Z-40892-red-behavior` |
| suite（初实现） | 1，4 通过 / 1 失败，Enter 驱动遗漏字符 | `2026-10-18T15-04-24.193Z-26764-suite` |
| suite（修正驱动） | 1，4 通过 / 1 失败，详情 Tab 焦点 | `2026-10-18T15-06-15.031Z-42176-suite` |
| suite（可聚焦字段区） | 0，5 通过 | `2026-10-18T15-07-25.601Z-26388-suite` |
| red-behavior 实现后重放 | 0，五测运行并命中 T_BEHAVIOR | `2026-10-18T15-08-20.158Z-9676-red-behavior` |
| suite 原字节恢复 | 0，5 通过 | `2026-10-18T15-09-07.290Z-39760-suite` |
| red-nc1：下载 route 改发 view | 0，命中 T_REDACTED_ONLY | `2026-10-18T15-09-59.728Z-36548-red-nc1` |
| suite 原字节恢复 | 0，5 通过 | `2026-10-18T15-10-51.050Z-43596-suite` |
| red-nc2：UI ordinal 固定 1 | 0，命中 T_SELECTED_EXPORT | `2026-10-18T15-11-45.274Z-29168-red-nc2` |
| suite 原字节恢复 | 0，5 通过 | `2026-10-18T15-12-19.348Z-13032-suite` |
| red-nc3：Unknown 显示 0 B | 0，命中 T_UNKNOWN_PRESERVED | `2026-10-18T15-13-16.873Z-29312-red-nc3` |
| suite 原字节恢复 | 0，5 通过 | `2026-10-18T15-14-05.453Z-18424-suite` |
| check --final | 0，语法与四条当前字节红/恢复链通过 | `2026-10-18T15-15-20.087Z-37012-check` |
| test --final | 0，模型 3/3 | `2026-10-18T15-15-33.793Z-24712-test` |
| browser --final | 0，Chrome 2/2、28 次真实下载 | `2026-10-18T15-15-38.912Z-40284-browser` |

首次骨架和完整测试先于实现运行，但后续修正了 Enter 驱动，测试字节改变。最终使用 **实现后行为缺陷重放** 绑定当前字节，不把重放声称为历史首次先红。重放恢复原 permissive model（缺校验、始终首快照、导出 view）；其准备脚本尝试同时修改 Unknown 文本时因 PowerShell stdin 编码未匹配而退出 1，实际 app 未改。已按真正运行的模型坏态记录与恢复，详 [mutation-behavior.json](../../acceptance/wave1/t/mutation-behavior.json)。final 的 proofAudit 实际通过四条链。

全部失败日志和各次源码/测试快照均保留。两次 suite 的测试进程实际运行五项；失败时 helper 没有填写 executedTests，其 TAP 明确 4 pass/1 fail，不将 receipt 的缺省 0 当未执行。辅助读文件路径失误、两个键盘诊断、准备脚本退出码和修正经过见 [preparation-notes.txt](../../acceptance/wave1/t/preparation-notes.txt)。没有把语法、缺文件、CDP 或下载超时当有效红。

**归档、范围与未验证项**

[ARCHIVE.json](../../acceptance/wave1/t/ARCHIVE.json) 记录 311 个 helper 原始文件，合计 9,044,274 字节，逐文件 source/destination/length/SHA256；复制后逐字节相等。包含原有总控 baseline、本会话所有门、失败日志、原/坏/恢复源码、每条有效红的当前三截图及最终截图；不含 target/cache/profile/实际下载文件或 fixture payload。私有 profile 和下载目录保留本地，没有清理。

311 份归档在 Git 暂存区的字节/哈希再次逐一核对通过。额外对全部证据运行的 `git diff --cached --check` 返回 2：原始 TAP 失败诊断含缩进空行，原 CRLF 源码快照在 `-text` 归档中也被报告尾部空白。按票面保留原字节，不修剪证据、不改 .gitattributes。该附加格式检查及原输出另存 [STAGING-AUDIT.json](../../acceptance/wave1/t/STAGING-AUDIT.json) 和 `archive-whitespace-check.log`；产品相对基线的 diff --check 与本报告检查均为 0，三个冻结 final 门全部为 0。

已实际查看最终 [1440×1000](../../acceptance/wave1/t/helper/2026-10-18T15-15-38.912Z-40284-browser-scan-review-1440x1000.png)、[900×800](../../acceptance/wave1/t/helper/2026-10-18T15-15-38.912Z-40284-browser-scan-review-900x800.png)、[导出预览](../../acceptance/wave1/t/helper/2026-10-18T15-15-38.912Z-40284-browser-scan-review-export.png)。截图是内容审阅证据；下载正确性另由真实文件字节、HTTP headers 和负控证明。

[SCOPE-AUDIT.json](../../acceptance/wave1/t/SCOPE-AUDIT.json) 确认 94 新锁条目、12 继承锁、291 唯一冻结全部原 SHA 保持；实现提交差异均在白名单，旧产品、旧测试/helper、根 Cargo、主检出票面/台账及其它工作树未修改。三个 final 串行在同一干净受测 SHA 上完成。后续只提交本报告与原字节证据及交付指针，无未复测产品改动，无 merge/rebase/reset/clean/push。

没有越界申请或未解决的任务阻塞。当前结论限 Windows 受控内存报告及本树浏览器下载；真实用户 scope、R/S 纵向接线、macOS、桌面壳/原生保存对话框、真实扫描、删除与 M1 整体闭环均未验收。来源类型是 caller 声明，JS 展示校验不代替 Rust A/Q 验证或来源鉴真；默认导出仍可因精确结构/数量/大小关联，不保证匿名。服务 64MiB 总捕获上限及静态资源 realpath 防链接逃逸已源码审阅，未构造超大合法 bundle 或替换静态资源链接做额外物理试验。
