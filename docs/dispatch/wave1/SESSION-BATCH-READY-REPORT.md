# J/K派前完成回执

派发更新（2026-10-18）：用户已确认刚外贴；J/K两树均已出现实现文件，均记RUNNING待回执。J新增锁检查及K新增baseline已归档。下文READY和产品不存在是本回执形成时的派前事实，不要重复派单。

2026-10-18（Asia/Tokyo），总控Codex。J/K均READY待用户分别外贴，未启动实现者。A–I九单及A/B/C/D四补单已收口，没有旧漏派/在途单；[旧台账审计](../../acceptance/wave1/controller/w1-session-batch-preflight-20261018/old-task-audit.json)核九树接收HEAD/干净及13份原票/补单。旧B/C/D票和被F替代的草案已加归档提示，不再重复外贴。

## 精确分配

两树：F:/new/smaltalk/water/.worktrees/j、.../.worktrees/k；分支worker/water-w1-j、worker/water-w1-k。共同最终基线bc409f4af8cb2d51b2f67341ad46637cfa5e66f3，tag water-w1-session-batch-base-20261018-r1；新冻结65项与六旧锁83唯一文件一致，合计132唯一文件。根Cargo、A–I产品、旧任务/槽位/锁/helper均保持。只为K新路径添加固定LF属性，纳入新冻结，不改变旧路径。

初版基线4d1bc5e的两次baseline均通过；审票收紧J lib/test目标路径及Rust默认harness后，在未READY/未外贴、无新产品的两树快进至r1，重新baseline通过。旧tag/日志/夹具保留，未重置或清理。准备阶段scratch注册/收尾脚本语法检查发现拼写与模板定界错误，执行前修正；不是行为红或产品失败。

| 线 | 当前baseline receipt | 实际结果 |
|---|---|---|
| J | [J baseline](../../acceptance/wave1/controller/w1-session-batch-preflight-20261018/j/2026-10-17T16-07-56.055Z-39632-baseline-result.json) | Node24/Rust1.95/MSVC、私有离线缓存/target；现有F/G/A/E/H链路11原生+2控制，12scope/39entry；44快照一致 |
| K | [K baseline](../../acceptance/wave1/controller/w1-session-batch-preflight-20261018/k/2026-10-17T16-07-56.009Z-25504-baseline-result.json) | Node24、四份实际旧链路捕获及I模型校验，现有Chrome独立profile空白页探针 |

J的冻结prepare只在j树.local创建一批11正常+6负例，81057内容字节；r1复用同一active index（hash fa4480250bcfe18dd264a58fe628e1508f2a777f7e7faa0bc21eec4f9f00cb69），没有二次造批。Rust生产/测试只读，普通文件内容不读。K没有物理fixture权限，.local仅浏览器/日志。所有run/profile保留。

K的[输入来源](../../../contracts/session-batch-v1/PROVENANCE.json)为已验收e383ece真实F/G/A/E/H执行日志封装，hash已冻结。它不是J运行产物。J/K生产目录均不存在；新产品五测、三个负控、最终产品门以及J→K页面接线尚未运行。helper baseline只核依赖/资产/环境；红/恢复/产品模式有完整实现和冻结清单，待执行者在真实实现上运行，不能称为新产品已通过。

## 外贴与后验收

- [J正式票](../tickets/WATER-W1-J-LAB-SESSION-20261018.md)：真实受控会话库，默认NativeIo/NoopObserver、同一取消token、完整有界快照。
- [K正式票](../tickets/WATER-W1-K-LAB-READER-20261018.md)：调用方内存bundle页面，固定六路由/I模型复用，不自动读取冻结数据兜底。

两线无产品文件重叠，J jobs1、K最多一个Chrome，各次一个门。helper保存行为红/三负控、每次恢复完整五测和源码快照，final绑定当前字节。完成后总控先核提交/范围/证据，再独立验收；双票通过后真实J输出直接传K.startServer验页面，不以拦截响应/expected假装接线。READY不等于用户已贴。

Mac、真实用户scope授权/生产竞态、工具适配/分类/去重容量、桌面/IPC与删除均另排，M1未完成。没有安装依赖、运行上游、真实数据扫描、自动实现者、push、发布或清理。
