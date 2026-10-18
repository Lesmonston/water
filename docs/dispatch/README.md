# 外贴派单目录

当前模式：总控出单、用户外贴、执行者在独立树交付、总控验收集成。

- [完整工作流](../CONTROLLER-WORKFLOW.md)
- [当前登记](registry.json)：A–Q及五补单VERIFIED（Windows受控范围），无未结外贴票，原票不重贴；见[P/Q验收报告](../acceptance/wave1/controller/WATER-W1-PQ-REVIEW-20261018.md)。
- [第一轮计划](wave1/PLAN.md)与[正式工单](tickets/WATER-W1-A-CONTRACTS-20261017.md)。
- [工单模板](templates/WORK-ORDER.md)
- [回执模板](templates/REPORT.md)

templates只是格式，所有占位符填完、路径实存、基线/依赖/测试通过派前检查后才能生成正式票。总控已提供各票独立定向helper，证据见对应验收报告；helper用于范围与资源检查，不是自动派单器或OS沙箱。不得把参考项目脚本当作Water工具使用。

正式出票按波次保存manifest、外贴句与总控验收记录；工单和编号补单有稳定路径。各原执行树和集成现场保留；当前没有待贴/在途票，没有自动启动实现者，旧派前文字为历史。
