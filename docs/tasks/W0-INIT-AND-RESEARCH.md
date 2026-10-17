# W0：正式立项与开源源码研究

状态：已完成。负责人：总控。来源：用户于2026-10-17授权。

## 工作范围

- 建立 `smaltalk/water`、本地Git和协作规则；复制原始调研入项目。
- shallow clone Jharu、Developer Machine Cleaner、Mole、Kondo、npkill；不安装、不运行、不修改上游。
- 锁定origin、HEAD、commit时间、许可证文件哈希；分别审阅扫描、分类、大小、执行和测试。
- 交付立项书、需求、架构、许可策略、源码汇总、下一阶段工单与完成摘要。

## 验收

- 五个checkout保持干净且精确commit匹配lock；没有上游源码纳入Water Git。
- 审阅引用固定源码位置，区分静态证据、README和运行验证；不公开宣称未经验证漏洞。
- 新文档链接、JSON与本地来源校验通过；阶段状态无“已实现”虚报。
- 本轮所有手工项目输出位于water内，没有运行真实数据清理。

## 子任务

Jharu、Developer Machine Cleaner、Mole各一名审阅者；Kondo/npkill、文档整合和本地验收由总控负责。子任务不提交git，不改共享文件。

## 回执

四份审阅覆盖五个上游，固定commit与根许可证哈希已记录；本轮未执行上游代码或真实数据清理。项目校验通过19份Markdown、26处本地链接、182处本地固定源码引用与5个洁净checkout。另4处Windows分支文档引用仅网络核对，不冒充本地代码审阅。交接见 [完成摘要](../COMPLETION-SUMMARY.md)。
