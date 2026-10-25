# AC补单06总控独立验收与集成边界

2026-10-25。总控接收29a895d7efa7f4a547d23ff74eb92729740d289d，worker受测8a3b475，产品实现eb7f801。原06真实native成功、两次raw2/main1/helper1/unknown0/invalid0、四文案/正常exit0/冻结childClose均有原始证据，5510ms；54新归档加旧425共479项/16,293,091字节已独立核对。首次总控审计将PROCESS-END的空数组误当数量断言失败，原记录保留，按真实数组及独立Count字段改正后通过，不改worker或产品。

本控制单只授权总控隔离集成与无UI验收，**0新桌面窗、0目录窗、0像素/截图、0依赖下载、0Cargo/Tauri构建**。不复用已用的03–06共4次窗口allocation，不调用旧native/resume入口。06的worker native证据按相同14产品字节和冻结新计数契约独立审计/回放；不冒称在集成路径重新运行Tauri。旧先红/两负控及每次恢复、03 final check/test复用，不重新执行旧负控或网络门。

唯一集成树F:/new/smaltalk/water/.worktrees/integration-ac-20261025，分支controller/water-w1-ac-integration-20261025，从主线精确69df0d0913259567312a506dbfc50665313364fe创建。使用no-checkout及non-cone sparse checkout，仅落地主.gitattributes、apps/desktop-preview、docs/acceptance/wave1/ac和AC报告；不复制/读取AA排除图像、其它用户/物理fixture内容。依次cherry-pick已审计的8个AC提交：b617b90、ef0b7c4、eb7f801、82d04aa、b7dc830、a333487、8a3b475、29a895d7。完整SHA由成功收单审计固定，不能自动取其它提交或覆盖冲突。只允许正式AC产品/报告/证据范围，主线其余文件树对象保持。

验收先核集成树的14文件、479归档、报告和worker原字节相同、干净SHA固定。Rust1.95直接rustc重新编译实际公开lib/src/v1.rs，显式链接原worker已构建的serde-8a1996bfcefd0ec7和serde_json-07e6f1f08aed812c rlib；不执行Cargo或上游build脚本。记录两rlib/fingerprint的SHA及同一serde_core指纹，借用只读既有依赖，不复制或改它们。编译/测试输出和TEMP仅本集成树.local/acceptance，串行每命令≤180秒。

在该新编译库上首次独立运行原三项公开边界测试，并编译运行desktop-preview-independent.rs的独立配置类型/重复字段/尾随输入/大小上限、导航origin/path/query/Unicode/control/fragment及实际内嵌资产反向输入矩阵。它们是Rustc库/测试复测，不称新Cargo final check/test、Tauri bin或新native。实际main静态接线和权限/私有目录限制另核，不修改生产代码。对既有native06的两份原始快照调用原冻结纯policy复算，并拒绝5个新增数据变体及四文案缺失；这是历史数据回放，不枚举UIA。所有报告只陈述实际通过的边界。

新控制入口scripts/acceptance/review-ac-integration.mjs仅prepare/check两个模式，一次prepare、一次check；失败保存所有日志再处理，不自动重试产品或开窗。三新控制源和本SPEC/旧锁新增5唯一约束，25继承锁共547；旧542与原报告/缓存/profile/失败reservation保持。新的冻结只约束总控验收，不给worker新执行权限或分配产品修复。

定向复测通过且源树无变化后，总控只可快进主线至受测集成提交；没有实际产品修正。更新AC/06为Windows静态桌面基础VERIFIED，并明确native来自worker受测8a3b475，controllerTestedCommit是无UI受测集成提交。原03–05失败状态、其它30任务/槽位对象和所有旧约束保持。真实AA→AD、桌面扫描接线、用户scope/自然同意鉴真、生产竞态、macOS/M1仍未验收。下一波先冻结接口/预算/独占文件再READY；本控制单不自动启动实现者或发布。
