WATER-W1-AE 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/ae/docs/dispatch/reports/WATER-W1-AE-REPORT.md

状态：SUBMITTED，等待总控独立验收。完成的是研究/设计材料，未实现或验证 macOS 系统能力，未完成真实用户 scope、完整桌面扫描或 M1；不更新主 manifest/registry，不 merge/push。

执行引擎：Codex（GPT-6；会话未暴露更细后端型号，未猜测服务变体）。本票没有子代理、外部实现者或后台 worker。执行日期 2026-10-23，Windows x64，Node 24.16.0。

## 提交与范围

- 唯一树/分支：`F:/new/smaltalk/water/.worktrees/ae` / `worker/water-w1-ae`。
- 初始干净 HEAD / tag：`4b8a1de2ad49664546547256cd3d55def7c31a49` / `water-w1-delivery-base-20261023`。
- 实现和最终受测 SHA 相同：`3182286f8c2df25ed940f8f0dc8a71507bb24a4e`。四份研究文件在此提交后未改变；后续提交只含本报告和 AE 证据。
- 主检出正式票和 manifest 开工条件已读：AE status=READY、baselineStatus=PASSED。主检出保持只读，无合并/复制控制提交；已有 AE evidence `.gitattributes` 保持原字节。
- 只新增四份指定材料、指定报告和 `docs/acceptance/wave1/ae/` 内允许扩展名证据。未改产品、冻契约、helper、根 Cargo/锁、台账或其它树；没有依赖/SDK 安装、上游脚本运行、Mac 远程访问、真实数据或物理 fixture 操作。

## 交付与逐项对照

| 要求 | 本次产物与核对结果 |
|---|---|
| 四份材料 | [SOURCES.json](../../research/macos-port-20261023/SOURCES.json)、[GAP-MATRIX.json](../../research/macos-port-20261023/GAP-MATRIX.json)、[DESIGN.md](../../research/macos-port-20261023/DESIGN.md)、[ACCEPTANCE-PLAN.md](../../research/macos-port-20261023/ACCEPTANCE-PLAN.md) 均提交 |
| 至少六条已读一手来源 | 实际 read=14，unavailable=7；Apple 官方 DocC 正文、历史归档、Rust 与 Tauri。JS 壳及不可访问页面单列，不用于事实支持；Rust 在线文档自报 1.99.1，未冒充项目 1.95 Mac 验证 |
| 七项矩阵 | 恰 N/P/R/S/Z/AA/desktop，implemented=false、real_macos_executed=false，每项 not_implemented_not_tested；19 项用例与计划名称对应 |
| 源码固定引用 | 15 个唯一当前文件，固定基线 commit、精确 SHA-256/字节和行号范围，逐项读过；原字节归档。XNU man 固定 f6217f891ac0bb64f3d375211650a4c1ff8ca1ea，并记录许可头/行号/哈希及非 SDK 实测边界 |
| 选择/同意 | NSOpenPanel/AppKit 主线程方案、取消/迟到回调、host 声明与自然手势区别、隐式/显式 security-scoped URL、bookmark/sandbox 生命周期；不宣称鉴真 |
| 文件系统安全 | dev/inode 身份域、mount/case/Unicode、逐父 fd openat/fstat/O_NOFOLLOW、祖先链接、hardlink、权限/消失/替换/并发变化。未猜常量/FFI 布局或声称全部竞态解决 |
| 内容与信息 | 元数据默认零正文；Z 独立额外同意、固定文件/同句柄/262144 cap 与 262145 探测界限，保留错误净化和 Q/Z 信息边界；明确 Unix 同长度改写与取消参数缺口 |
| 取消/生命周期 | 最后 observer 可 completed+skipped，partial 保留；六消费者入口列计划；begin 失败不取消别人的 attempt、panic/unwind/abort 分开、登记/fd/scope 释放 |
| 容量 | APFS clone/snapshot/稀疏/压缩及共享空间不推导回收量，allocated/reclaimable 保持未知；不执行删除 |
| 未来实机 | OS/build/两架构/APFS 模式/SDK/锁/权限、独立新树 .local 工厂、窗口/墙钟/并发预算、精确取消和真实整链分别列明；签名/notarization/采购/发布另决，不索取机器或凭证 |
| 后续依赖 | 六类 DRAFT 候选的最小文件归属/接口变更与顺序；强依赖等前置接受，未虚构 READY 或改旧 API |

人工已核对资料正文支持相应结论、当前源码平台门/行号与问题边界。补充 [REFERENCE-AUDIT.json](../../acceptance/wave1/ae/REFERENCE-AUDIT.json) 记录 36 项来源证据/当前引用哈希检查；此自动核对只补强文档审阅，不证明 OS 行为。

## 实际命令与退出

| 实际命令 | 退出/含义 | 原始 helper 回执 |
|---|---|---|
| `node scripts/delivery-wave-check.mjs --task WATER-W1-AE --mode baseline` | 0 / passed；11:32Z，本执行者首次干净基线；只核研究输入和冻结 | [baseline](../../acceptance/wave1/ae/gate-2026-10-23T11-32-11.755Z-14768-baseline-result.json) |
| `node scripts/delivery-wave-check.mjs --task WATER-W1-AE --mode check` | 0 / passed；11:43Z，提交前文档一致性检查 | [check](../../acceptance/wave1/ae/gate-2026-10-23T11-43-10.516Z-31056-check-result.json) |
| `node scripts/delivery-wave-check.mjs --task WATER-W1-AE --mode check --final` | 0 / passed；11:51:57–11:52:05Z，仅一次；前后 HEAD=3182286、状态均为空 | [final](../../acceptance/wave1/ae/gate-2026-10-23T11-51-57.745Z-36196-check-result.json) |

三项清单精确为 macos-source-index、macos-gap-matrix、macos-acceptance-plan，全部是**文档检查**。三次本执行者 gate 均 productTestsRun=false、realMacOSExecuted=false、冻结唯一文件=509。未运行 Rust/浏览器/GUI 产品测试，不机械造行为红或生产负控。源码好坏/恢复负控不适用于本票。

同目录另存 02:36Z controller 派前 baseline 的新归档副本，明确是继承记录，没有算作本执行者新运行。[START-AUDIT.json](../../acceptance/wave1/ae/START-AUDIT.json) 绑定的是 11:32Z 实际启动记录。

## 失败、勘误与证据性质

所有已发生的 gate 均无失败。准备过程的非零退出和资料访问失败另存 [RESEARCH-ACCESS-LOG.json](../../acceptance/wave1/ae/RESEARCH-ACCESS-LOG.json)、[SUBMISSION-PREPARATION.json](../../acceptance/wave1/ae/SUBMISSION-PREPARATION.json)，不当作产品负控：

1. 初读 PowerShell 默认解码出现乱码，改 UTF8 重新读取；大批输出截断后对所需源码分段读取。
2. 一次 `rg` 的 Windows 通配路径操作数退出 1；改目录加 `--glob` 的只读命令退出 0。
3. 首次矩阵生成因 Z SPEC 引用到第 27 行、实际仅 26 行退出 1；读实际行号修正到 23，同时修正 AA SPEC 末行范围，重新生成退出 0。已生成的来源和原字节快照保留，没有恢复/删除他人文件。
4. 首次暂存包装器误纳入已有 `.gitattributes`，自身扩展名断言退出 1；保留已暂存四材料和该旧文件，后续逐个显式路径继续。一次工具调用被中断后，先复核仍在基线且归档/部分暂存存在，再完成提交，没有重复执行最终 gate。
5. XNU 许可描述在读完整头前过早写 BSD；提交前改为文件含 APSL 2.0 与 UC BSD 条款。最初 START 归因误选了已有 preflight，提交前明确改绑执行者 baseline，两份原记录都保留。
6. 收尾空白检查包装器把“诊断日志中保留的来源尾空格”也预期为零，组合日志检查实际退出 2、该包装器断言退出 1。保留诊断日志原字节，单列检查真正的 gate stdout/stderr，不把空白提示当产品失败或改洗日志。

非 gate 准备错误仅保留工具可见结果的忠实摘要，未保存当时 native stderr 原始字节；不声称摘要是原始流。实际 check/final stdout/stderr 用子进程 Buffer 原字节保存，helper 回执/快照从本树 `.local/checks/WATER-W1-AE` 原字节复制；原始 baseline helper JSON 也按字节保存。官方 DocC 证据是明确标识的投影、HTML 是有界文本摘取，记录了实际 HTTP 原 body 的 byte count/SHA，但未冒称这些投影与 HTTP body 字节相同。当前 Water 源码/XNU man 的 txt 则是原字节快照。

四材料暂存空白检查退出 0；原始来源证据检查退出 2，恰 XNU man 的七处既有尾空格，见 [implementation-evidence-whitespace.log](../../acceptance/wave1/ae/implementation-evidence-whitespace.log)。保留这些来源字节；包含上述诊断的组合日志空白检查也退出 2。报告及实际 gate stdout/stderr 分别检查，结果存于 FINAL-STAGING.json 及相应日志，不把它们和来源快照混为一项。

## 归档、进程与未验证项

[ARCHIVE.json](../../acceptance/wave1/ae/ARCHIVE.json) 逐文件列 source/archive/bytes/SHA，含报告、研究材料、来源证据、三次本执行者 gate 与继承 preflight、副本、最终四材料快照、空白检查及准备说明。索引自身不自哈希；终端暂存审计另行记录，避免循环。排除 cache/target/binary/profile/应用 payload 和无关证据。各文件单独 add，`.log` 单独 `-f`；已核暂存 blob 与工作文件原字节相同。

系统窗口 0、目录窗 0、Chrome 0、服务器 0、远程 Mac 0。没有截图或读图，不读取 AA 排除截图像素；实际看图数 0，非视觉任务。同步 Node/Git 命令已返回，曾有的源资料读取会话已 exit 0，没有常驻进程。[PROCESS-END.json](../../acceptance/wave1/ae/PROCESS-END.json) 的限定名称/本树命令行查询匹配数 0，实际强制终止数 0；未将该查询扩张成能识别无路径进程 cwd 的证明。

主要未决问题：sandbox 下安全取得根与祖先验证；SDK/OS/两架构 ABI 和 no-follow flags；被移走目录的权限定义；Unix 同长度内容改写；主线程 AppKit 与现 AA worker 的桥接；scope 所有权/持久 bookmark；Mac WebView/导航/资源隔离；两架构实机、生产竞态、真实用户 scope 和完整桌面联合链。全部保持未实现/未验证，后续由总控另冻独立工单。

提交后停止本票材料改动与测试，不合主线、不发布，也不自行标 VERIFIED。
