# 外贴派单目录

当前模式：总控出单、用户外贴、执行者在独立树交付、总控验收集成。

- [完整工作流](../CONTROLLER-WORKFLOW.md)
- [当前登记](registry.json)：第一轮WATER-W1-A已READY，槽位a已准备，等待用户外贴。
- [第一轮计划](wave1/PLAN.md)与[正式工单](tickets/WATER-W1-A-CONTRACTS-20261017.md)。
- [工单模板](templates/WORK-ORDER.md)
- [回执模板](templates/REPORT.md)

templates只是格式，所有占位符填完、路径实存、基线/依赖/测试通过派前检查后才能生成正式票。总控现已提供worker-check定向验收helper，其baseline已验证；Cargo实现后的模式仍待首单验证，不是自动派单器或OS沙箱。不得把参考项目脚本当作Water工具使用。

正式出票按波次保存manifest、外贴句与总控验收记录；工单和编号补单有稳定路径。第一轮执行树已位于water/.worktrees/a，由总控准备且保持基线干净；当前未运行实现者。
