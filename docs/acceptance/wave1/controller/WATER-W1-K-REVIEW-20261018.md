# WATER-W1-K 总控验收与 J→K 集成

2026-10-18（Asia/Tokyo）。结论 CHANGES_REQUESTED。原单票门通过后暂记 ACCEPTED；真实集成发现K产品缺陷，补充单01已见原执行者启动审计与精确回归输入，记RUNNING，尚未交回。K产品未合主线，未标 VERIFIED；总控未代修产品。

接收干净 HEAD `e717519a14f5d561c0ba18aa7d5299870828aa5a`，受测实现 `7d0035582db8457a47d6c611ff02427296ba641c`，原基线 `bc409f4af8cb2d51b2f67341ad46637cfa5e66f3`。实际执行者 Codex / GPT-6（自报，细分 build 未提供）。

[收单审计](w1-k-review-20261018/intake-audit.json)核 369 个新增文件全部在原白名单：八产品/测试/说明、359 原始证据、一 inventory、一报告。后续证据提交未改八文件。359 份证据共 3341587 字节与 worker 现场及接收 Git blob 一致，180 份完整命令日志、133 份源码/测试快照逐项核验；主树/worker 的 132 唯一冻结、九旧产品及根 Cargo 保持。

[原三道 final 门复跑](w1-k-review-20261018/original-gates.json)在同一干净接收 HEAD 通过：五语法、三模型、两真实 Chrome 测试；原 helper 重新核行为红/三负控与最终字节恢复链。[独立边界回执](w1-k-review-20261018/boundaries/2026-10-18T03-16-47.264Z-38288-result.json)另通过 104 项公开模型/HTTP 检查，包括真实 I 函数/原文件复用、来源 totals 副本、输入捕获、六路由 GET/HEAD/错误 Host/四种非允许方法/查询串及未经正规化的遍历与编码路径。

三张本次新生成截图已实看：1440×1000 的 caller-alpha/completed 显示 6/6/2/0、来源逻辑和分配未知、完整覆盖；900×800 会话选择换到标题下，无横向裁切；详情原生 dialog 显示字面 HTML 标题、scope/evidence、entry-2、精确 9007199254740993，关闭按钮焦点可见。15.9 EiB 为明确的合成内存极值。kind/depth/identity 位于详情下方，截图顶部不冒称展示了全部字段。

历史第一次行为红因测试未释放骨架服务器而超时，无效；之后 16:41 完整五测有效红使用最终测试字节，发生在记录中的首次完整绿之前。16:50 行为红是最终生产修订后的重放，不能冒充初次实现前记录。16:48 恢复 suite 的 ECONNRESET/ECONNREFUSED 失败原样保留；最终服务加 Connection: close 后三负控及逐次完整五测恢复通过。时间顺序依据保留的源码/测试字节及回执时间，不是外部时间见证。原 TAP 尾随空白告警未改动原日志。

本次用户指定 `codex:45f97e7e-8007-4d54-8180-56bfb716433e`。当前工具不提供该会话读取接口，两个本地会话索引也未找到该 ID；没有声称已读到原聊天。接手依据本项目正式交接、状态、manifest、票面及验收材料。一次只读定位尝试发现本机无 python，随后用 Node 内置 SQLite 只读查询，没有安装依赖。

尚未验证 macOS、真实用户 scope、分类/工具适配、去重容量、Tauri/桌面/IPC、生产竞态或删除。32 MiB 超限分支当前仅源码审阅。K 不获物理 fixture 权限；后续真实链路仅在总控独立树按既定验收方案创建有界合成夹具。M1 未完成。

## 隔离负控与真实集成失败

隔离树 `.worktrees/integration-jk-20261018` / `controller/water-w1-jk-20261018`，受测 `f16972f81dab02e2a51ad0e4a408c01a405b9ea6`，从单票ACCEPTED的779b1db无冲突合入K接收SHA。104独立API/HTTP检查再次通过；三项原归档坏态分别完整五测命中K_SERVER_INPUT/K_TOTAL_UNKNOWN/K_TEXT_LITERAL，子进程退出1，逐次原字节恢复后完整五测全绿，测试不变。[完整负控回执](w1-jk-integration-20261018/controls/2026-10-18T03-20-05.996Z-31704-result.json)及原stdout/stderr/坏态源码保留。

[真实run失败回执](w1-jk-integration-20261018/session/2026-10-18T03-22-50.825Z-42740-result.json)：新私有离线Cargo home/target、jobs1重建J及依赖，J五测试/fmt/clippy/metadata、K五语法及完整五测试均通过；实际lab-session-bridge的13快照全部六字段与独立F/G/A/E/H计算逐值相等，原生11case/12scope/39entry和两个控制样本。随后将实际J JSON直接传K.startServer即抛Unsupported lab session.，没有运行真实J→K页面。回执newProductsTested=false是未到完整成功结束，并不抹去原日志中已执行通过的这些检查。

[独立定位证据](w1-k-review-20261018/root-issue-regression.json)证明所有13份view均被真实I接受，K只拒绝index8/pipeline-8/entry-budget。问题位于model.mjs:119，把issue.relative_path空串交给非空entry/root路径校验器。冻结F SPEC允许scope根相对路径为空（预算父目录和普通根错误），G/A/E/H/J完整保持该值。事实、report和view三处均为空串，语义合法且一致。仅在纯内存中同步把此路径改为非空诊断标签后，K接受全bundle；这只是定位，不是修复或新的实测J输出。

[实际J回归输入](w1-k-review-20261018/actual-j-regression-bundle.json)为失败run捕获的169500原始字节，SHA256 d7ba80c113ef357b3ba675a9f51bacd8dc151734a458e6e5b6bdc450e15f9b62，供补单测试复制使用；禁止产品文件读取兜底，K仍无物理fixture权限。

失败后另由冻结prepare模块只读核44内容快照，132冻结在主线/worker/集成树一致；[字节及主线审计](w1-jk-integration-20261018/integration-audit.json)核369份K在worker和隔离树一致，359份J在main/worker/隔离树原字节一致。仅冻结prepare在本次总控树创建一次11+6、81717内容字节合成run，未清理、改marker/ACL或触及真实用户数据。所有fixture/profile和原失败日志保留；main仍不包含K产品。

## 编号回派和后续

[补充单01](../../../dispatch/tickets/WATER-W1-K-ADDENDUM-01-20261018.md)绑定原干净e717519和k槽位，要求仅issue允许空串、页面区分scope根与null，entry/root继续非空，追加真实13份bundle/真实HTTP与Chrome回归，重新收录最终测试字节的完整红绿链。派前路径/起点/132冻结/实际输入hash与既有工具门已核，[补单准备回执](w1-k-review-20261018/addendum-01-preflight.json)明确新回归未实现、未运行、尚未外贴。总控不代修产品；收补单后复用原集成树夹具再验。

当前A–J及四旧补单保持VERIFIED（Windows），K为唯一CHANGES_REQUESTED；真实J→K页面、真实用户scope/分类、桌面/macOS和删除均未验收，M1未完成。一次只读rg查询使用Windows字面glob失败，随后按固定文件路径读取，不当测试失败或行为红。

收尾核验：121份Markdown、489处本地链接及五个上游checkout元数据检查通过，未运行上游。主manifest/registry的11任务状态对齐，A–J任务对象相对779b1db逐值不变；132冻结、两批归档清单与实际J回归输入哈希复核通过。新补单测试未实现/未执行，不能把派前准备记为修复通过。
