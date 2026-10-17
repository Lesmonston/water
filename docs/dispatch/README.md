# 外贴派单目录

当前模式：总控出单、用户外贴、执行者在独立树交付、总控验收集成。

- [完整工作流](../CONTROLLER-WORKFLOW.md)
- [当前登记](registry.json)：尚无活动波次、槽位或任务。
- [工单模板](templates/WORK-ORDER.md)
- [回执模板](templates/REPORT.md)

templates只是格式，所有占位符填完、路径实存、基线/依赖/测试通过派前检查后才能生成正式票。暂未提供自动派单器、测试helper或可执行命令；不得把参考项目的脚本当作Water工具使用。

正式出票时按波次建立子目录，保存manifest、外贴句与总控验收记录；工单和编号补单必须有稳定路径。执行者工作树未来放在water/.worktrees内，由总控在实际发单前准备，当前未创建。
