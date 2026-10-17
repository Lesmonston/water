# WATER-W1-F 总控验收与隔离集成

2026-10-17，总控 Codex。当前结论：单票 ACCEPTED（Windows 范围）；隔离集成尚未运行，暂不标 VERIFIED。接手来源为用户指定的失效对话 `codex:d0fbb74c-aa85-4f95-ad3f-7e55a79d63a0`，以项目文件、Git 和本轮实测为依据，没有恢复旧聊天。

## 接收与范围

接收 HEAD `65e928d3c193e58db758eaf8f0022c975c3ca24d`，`worker/water-w1-f`，工作树干净；实现及执行者五 final 门共同受测提交为 `3f3acbd7cf3726c10f7a759c8fc79301f2a4069e`。精确基线 `fc114eb81125cef7d374deddc95144bcd9aee748` 为祖先。全部差异在正式票白名单：独立包九个产品/测试文件，其余为 F 回执与证据；后加提交没有产品或测试变化。

总控核对 22 项 F 冻结及四份旧锁，并核对 A/B/C/D/E 产品 tree 与原基线一致。未改根 Cargo、旧产品、旧 helper 或冻结锁；未修改执行者源代码。实际模型为执行者自报 Codex / GPT-6，细分版本无独立平台证据。

## 总控单票实测

在同一干净接收 HEAD 串行复跑原 helper 的 fmt、test、clippy、metadata、bridge 五个 final 门，全部首次通过。六个冻结 Rust 测试真实执行，零失败/忽略；真实 Rust 公开入口扫描 11 case、12 scope、39 entry，44 份 marker/内容快照一致，三种链接均实际可用。

[总控独立 receipt](w1-f-review-20261017/2026-10-17T14-24-09.544Z-17504-result.json) 及同目录原始日志记录五项额外测试，链接实际构建的 F/A 库，全部通过：

1. 非法 run_id 的完整词法拒绝、options 边界与错误/Debug 不泄露私有路径。
2. 预取消零 IO；取消优先于同时达到的深度/条目限制；root inspect 后取消阻止枚举；最终平面叶项后取消不伪造未完成工作。
3. 非法名称、重复/超长批次不获得子项 IO；真正 Native NotFound 保留来源并消耗一次访问。
4. 将真实 Link token 直接交给 NativeIo.list_names，独立根/链接防线拒绝，证明并非仅依赖 walker 分类；未遍历目标。
5. 后续 scope 的两种操作、五种故障、两种来源组合共 20 组，保留已完成 scope，精确核对 code/origin/operation 和计数。

这些检查只读冻结 prepare 已创建的受控夹具，没有新增或修改物理夹具。静态审阅全部生产模块：普通文件只取元数据；唯一内容读取是 marker 的 limit+1 有界读取；原始 JSON 严格反序列化、逐层拒绝重复/未知字段及缺失 nullable。NativeIo 逐组件 no-follow，Windows 先判所有 reparse 为 Link，read_dir 创建及各迭代 Result 均显式处理，失败不返回半批名单。Windows 身份恒 Unknown；未把静止夹具复查解释为生产竞态保证。

## 历史证据和失败

327 份执行者原始 receipt/log 的文件长度、SHA256 与现场原件逐一一致。四项负控的原/恢复源码及测试 hash 均与接收提交一致，坏态 hash 不同；红日志均成功编译并命中目标断言，恢复日志均重新编译且六测全绿。未在 worker 树重复写坏产品或夹具。

执行者真实行为红、四负控红和两次已修正 Clippy 失败按原报告保留；原始日志不改写。坏态源码未逐项交付，仅有原源码、坏态 hash、具体修改描述与运行日志，因此不宣称总控亲自重跑四次历史变异。

总控新归档脚本首次因原 helper 的早期审计命令没有 log 字段而失败，产品尚未执行独立测试；仅修正总控归档循环后重新完整运行通过，失败 receipt 同目录保留。原五 final 门未失败，没有修改断言或门槛。

## 集成与限制

计划在 Water 内独立 `integration-f-20261017` 树合并接收提交，使用私有离线 Cargo 缓存、新 target，并仅由冻结 prepare 在该树 `.local` 新建一批有界合成夹具。集成测试结果与精确 SHA 待实际运行后补入。

macOS 未编译/运行；真实 ACL 权限失败、真实 ReadDir 迭代错误、恶意并发替换、真实用户 scope 授权均未实测。无普通文件内容识别、分类、回收量汇总、真实 F→G 链路、E/UI/IPC 接线或删除；M1 尚未完成。G/H/I 原分配、基线、冻结和状态保持，本轮没有自动启动实现者、清理、push 或发布。
