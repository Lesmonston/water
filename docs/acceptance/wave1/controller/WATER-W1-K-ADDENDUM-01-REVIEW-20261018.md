# WATER-W1-K 补充单01总控复验与真实页面集成

2026-10-18（Asia/Tokyo）。结论VERIFIED，仅Windows受控合成元数据范围；补单单票、隔离负控及重新执行的真实J→K页面全部通过。原失败f16972f及原始日志保留。

接收干净HEAD `886db33fcca265e0c1a06e1e155264c2d4689bb0`，受测实现 `e283d77f2b37c53d337e115e09b7b7219ae7d045`，续做起点e717519、原基线bc409f4保持。补单范围721个变化文件均核准：五个产品/测试/README修改，其余仅本补单报告和证据；后续证据提交没有产品变化。

[收单审计](w1-k-addendum-01-review-20261018/intake-audit.json)逐项核708份helper归档、7369416字节与现场原值；348完整命令日志、273源码/测试快照一致，721个变化文件的接收Git blob与工作树逐字节一致。原369交付中除五个获准文件外364份原字节保持；worker132冻结、主树151冻结一致。补单模型测试只追加回归，entry/root非空、I校验及原路径防线不变。

[原三道门重跑](w1-k-addendum-01-review-20261018/original-gates.json)在干净接收HEAD全部通过：五语法、三模型、两真实浏览器测试。原helper核根路径负控重放及三旧负控的当前字节完整恢复链。收单审计另核首次修复前红：生产五源码逐项等于e717519，两个测试字节与最终一致；后续根路径重放明确是实现后负控，不冒充初次修复前证明。

[独立检查](w1-k-addendum-01-review-20261018/boundaries/2026-10-18T04-27-01.997Z-37640-result.json)通过133项，包括原104 API/HTTP边界、实际13份J快照接受、根issue空串/null/普通与HTML字面路径保留、非法路径拒绝、scope根非空及深层输入变异不影响13份HTTP捕获。生产仅model issue非null且非空时走原path校验、app空串显示scope根两行变动；没有服务文件/入口或任意路径权限变化。

本次四张新图已实看：1440×1000/900×800原caller-alpha场景仍为6/6/2/0、来源总量未知、无横裁；详情字面HTML标题和9007199254740993保持，关闭按钮焦点可见；根issue图显示pipeline-8/entry-budget/partial，2/2/0/1、未完整覆盖、entry_limit/scope-1/scope根/policy/budget。根图来自保留的实际J回归输入，不宣称这张图已由总控重新运行J产生。

Worker四次Page.navigate超时（两次suite、两次browser final）全保留；同字节后来通过，不冒充有效行为红，不声称浏览器工具稳定性已修复。其余后处理TypeError已在原报告说明、恢复hash核过。总控本次原三门首跑均绿。

后续仅总控修改独立验收适配：支持补单归档的四个真实源码负控；实际J runner要求复用现有81717字节/11+6夹具，核151冻结，并真实切换全部13份会话、在双尺寸记录根issue及取消状态截图。原session-batch-check、L/Mhelper和全部冻结不改；没有代修产品。L/M任务对象与分配保持。

macOS、真实用户scope、分类提升、卷唯一分配/可回收量、桌面/IPC、生产竞态及删除未验证；32MiB超限未作专门大样本测试，M1未完成。

## 隔离独立负控与实际J→K闭环

受测提交 `95704fee2710d778f0f822303ce4c084a279e940`，复用原integration-jk树，先合已核主线d4d9571，再无冲突合K接收886db33。独立133项检查及四项归档坏态控制全部通过：根路径回退、截断输入、未知变零、textContent改innerHTML，各完整五测命中目标红并原字节恢复完整五测绿。没有改测试或产品实现。[完整控制回执](w1-k-addendum-01-integration-20261018/controls/2026-10-18T04-31-18.608Z-32188-result.json)含全部stdout/stderr和坏态源码。

[真实run回执](w1-k-addendum-01-integration-20261018/session/2026-10-18T04-36-03.792Z-21556-result.json)绑定同一干净提交：复用私有Cargo home/target，J五Rust测试/fmt/clippy/metadata、K语法/完整五测试通过；实际J13快照与独立F/G/A/E/H全部六字段相等，11原生case/12scope/39entry加两个控制样本。实际J JSON直接传K.startServer，13份HTTP值及嵌套调用方变异隔离通过。两尺寸各真实选择13个scan_id、核相同finding集合和状态，根issue空串显示scope根、取消后空行集合，未拦截或替换响应。

两尺寸根issue及取消页面四图已实看；1440根图可见pipeline-8/partial、2/2/0/1、entry_limit/policy/budget与scope根，900根图同样可见该会话、2/2/0/1、未知总量及scope根/policy/budget问题行，筛选区在下方继续纵向滚动。两张取消图显示pipeline-11/cancelled、空观察结果和未完整覆盖；不把截图未入镜内容冒称肉眼可见。两尺寸无横溢出、无运行时异常或外部请求，保留只读/非真实用户目录提示。

本次run带--reuse-fixtures-only，原index缺失即拒绝，不新造批次；physicalFixturesCreated=false。原11+6、81717内容字节夹具原地复用，44内容快照通过。新实际bundle与原失败捕获的169500字节JSON全值一致，证明修复消费同一合法来源，非改写输入绕过。151冻结保持，L/M任务/槽位对象逐值不变。[主线推进](w1-k-addendum-01-integration-20261018/main-promotion.json)及[交付字节清单](w1-k-addendum-01-integration-20261018/worker-byte-manifest.json)核1085份K和359份J在原worker/隔离树/main的原字节；main先快进到受测95704fe，之后只文档/证据/台账收尾。

A–K及五补单均VERIFIED，L/M保持原票与分配。历史f16972f拒绝合法输入及导航超时均保留，不声称已修复通用浏览器导航稳定性。真实用户scope、分类提升、卷唯一空间/回收量、桌面/IPC、macOS、生产竞态与删除仍未验证，M1未完成。

收尾核验：135份Markdown和610处本地链接通过，五个上游checkout仅查元数据/来源，未运行上游；151冻结、72份集成归档、1085份K及359份J交付字节复核通过，L/M任务及槽位对象逐值保持。受测后无产品变化，最后仅提交文档、证据和台账。
