# W 补单01与真实 V→W 联合验收通过

2026-10-19，Windows受控范围。W补单接收 `df9255b73e1037eda7599098de900bb4705f5921`，受测实现 `020cd89cd592471836cca8fa5d263176348b2165`；V接收 `ec1ee25034185d95279debcd589be49b84458af1`、实现 `30875645f03ddc01019eb4b3cb00f9ab7d1c068d`。隔离集成 `e38b81cf75d0fb65877bbb7d774e4da7b3a09678` 已通过验证并快进主线。W原预算缺陷关闭，W补单01及V/W均记 **VERIFIED（Windows受控范围）**；M1、真实用户scope、生产竞态、macOS与桌面仍未验收。

本次接手已停止的总控对话，从实际分支/报告恢复工作。没有启动实现者或代修产品。原 W 的 CHANGES_REQUESTED、补单 READY 和以前 V 的 INTEGRATED 记录保留为历史；以本报告及最新 manifest 为当前事实。

## 收单与预算修复

- 原 W 树干净、分支及基线祖先正确；补单1153差异路径全部在白名单。实现只增加model的8行和原model测试的90行，无删除行；其余9产品/测试文件、原五顶层及原语义断言保持。报告提交是实现提交的直接子提交，仅报告与证据。
- 原1642归档文件/25872812字节保持；新增1148文件/17060188字节逐项核对来源、归档与接收提交blob的长度/SHA256。新增归档17次wrapper均按预期通过，三道final绑定同一干净020cd89。341冻结保持，原报告/ARCHIVE/RUN-AUDIT三个冻结hash不变。[独立证据审计](w1-w-addendum-vw-review-20261019/controller-w/2026-10-19T07-15-52.902Z-23884-evidence-audit.json)。
- 新guard按最后一个斜线划分每个父目录，计数已记录直接子项，超过max_dir_entries以原固定错误拒绝；completed/partial/cancelled共用校验，无snapshot的选择取消仅保留原预算范围校验。不修改预算、输入、条目、状态或Q，不改来源标签。
- 稳定预算red确实禁用新guard，12个矛盾公开入口观察变红；恢复源码逐字节一致。原behavior/nc1/nc2/nc3分别实改下载、取消UI、strict UTF-8的生产逻辑，当前字节完整五测有效红→恢复五绿，三final的原proofAudit及新budgetProof独立重算通过。没有编译/CDP/超时造红。

## 总控独立复测

独立 `review-w-addendum-20261019` 树精确接收提交，真实禁用新增guard再跑冻结probe，12项矛盾错误接受；立即原字节恢复、语法检查及完整五测5/5通过，无skip/filter。原8捕获、旧24输入、四入口预算回归通过。[原五测及独立负控](w1-w-addendum-vw-review-20261019/controller-w/2026-10-19T07-15-27.391Z-9368-independent-review.json)。

另独立构造14组明确的合成内存报告×4公开入口，共56项通过：跨父目录/相同名称前缀/逆序、深层独立、非根超限、partial/cancelled、Map特殊键、Unicode、单支链及256/257边界。正例真实HTTP/Q原字节核对，反例固定错误，所有server在finally关闭；输入前后相等。[独立边界结果](w1-w-addendum-vw-review-20261019/controller-w/2026-10-19T07-16-49.238Z-10976-independent-review.json)。

本次保留3份控制器检查失败，均明确为总控验收脚本构造/统计问题：第一份把旧派前resume算入新增运行总数18（交付新增实际17）；第二份合成logical_bytes误用数值而协议要求十进制字符串；第三份256正例仍带原全局max_entries=128。修正控制材料后重跑相应审计或独立内存样本通过，没有改产品，也没有重复已绿的完整五测。失败回执全部归档，原五测已绿与附加样本当时未通过分别记录；不能声称本轮从未有失败。

## 真正固定启动器联合链

按[事前有界计划](WATER-W1-VW-JOINT-PLAN-20261019.md)，在e38b81c上以新私有Rust 1.95/MSVC/offline/locked/jobs1环境构建真实V.exe，固定路径为集成树 `.local/next-target/debug/water-native-session.exe`，876544字节，SHA256 `03a541683afcc38e3eb7ff0c197d1369e3ce597db00e96ac22018c207c1ec577`。未复制假exe、没有程序路径注入或生产测试模式。集成原完整五测5/5、冻结预算probe和341冻结通过。[构建与集成复测](w1-w-addendum-vw-review-20261019/joint/2026-10-19T07-18-44.942Z-21268-preparation.json)。

UTC07:22:31–07:22:41实际执行真正W.launchNative→固定V程序→S/P/R/E/H/Q→stdout原字节pipe→W strict readSession→HTTP→私有headless Chrome：

| 实际系统操作 | 生产者PID | 结果 |
|---|---|---|
| 选择取消一次 | 30864 | selection=cancelled、snapshots=[]；页面“未开始扫描”，无报告/预览/下载，导出路由404 |
| 确认一次 | 19796 | native_scope_metadata、completed、8观察/8保护/3大小未知；真实预算8/10000/256，来源总量未知；当次Q实际点击下载原字节相等 |

窗口总数恰2，未循环重开。UI只操作上述控制进程直接启动、精确程序路径、固定标题的系统窗口。每次UI helper上限20秒、生产者上限25秒；两次正常结束，控制runner退出0，真实V在HTTP开始前已退出，两次HTTP端口关闭，无强制终止。[完整联合结果](w1-w-addendum-vw-review-20261019/joint/2026-10-19T07-22-31.341Z-25988-joint-result.json)。

只读复用原主检出60字面/74逻辑字节合成fixture，index SHA256 `cb516913b9b034bc0fb5cbedd44c6445c25057cf5c810335ff319bbc31bcd9ff` 前后保持；本次无新物理fixture、普通payload内容读取或清理。W独立执行树仍无物理fixture权限。页面不接路径/扫描命令，session不带绝对根/原生身份，Q不带自由路径；筛选到0/8后，整份预览与单次实际下载仍为当次Q。

## 实际看图、保留与边界

总控通过图像工具逐张实际查看独立复测三图及真正联合三图。联合1440×1000、900×800可见native-session-cli、预算8/10000/256、8/8/3与Unknown，窄屏正常换行，无水平溢出；取消图显示“目录选择已取消；未开始扫描”，没有伪造completed空报告。图片观察和自动断言分别记录：

- [联合宽屏](w1-w-addendum-vw-review-20261019/joint/2026-10-19T07-22-31.341Z-25988-actual-native-1440x1000.png)
- [联合窄屏](w1-w-addendum-vw-review-20261019/joint/2026-10-19T07-22-31.341Z-25988-actual-native-900x800.png)
- [真正选择取消](w1-w-addendum-vw-review-20261019/joint/2026-10-19T07-22-31.341Z-25988-actual-native-cancel.png)

[总控归档](w1-w-addendum-vw-review-20261019/ARCHIVE.json)含169文件/3771516字节，保留全部新增控制日志/失败、内存输入、好坏源码、截图和实际下载，以及验收脚本快照；binary/cache/profile/fixture payload均不进交付，原地保留。最终字节与台账复核见[FINAL-AUDIT](w1-w-addendum-vw-review-20261019/FINAL-AUDIT.json)。[收尾进程检查](w1-w-addendum-vw-review-20261019/PROCESS-CLOSE-AUDIT.json)按精确原生程序路径和本次私有profile核对，原生及私有浏览器进程均为空，实际终止进程0；没有继续弹窗。旧A–U任务/槽位、产品和根Cargo保持；W原报告/原归档不覆写。

当前无未结外贴票或新READY票，A–W及七补单均VERIFIED，仅指各票Windows受控验收范围。自然手势/来源新鲜度鉴真、恶意生产竞态、真实用户scope、macOS、桌面壳/打包/发布、真实IO与大输出故障等既有限制保留。没有删除/ACL/移动、上游运行或push，M1仍未完成；后续按架构与明确权限再分波出票。
