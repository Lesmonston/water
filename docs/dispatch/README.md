# 外贴派单目录

总控出单，用户外贴，执行者独立树交付，总控验收集成。当前A–Q、S/五补单VERIFIED；R补单01/T/U保持原波次，等待各自回执。S已收口，不再外贴。

- [本波四份入口及实际派前证据](wave1/PARALLEL-WAVE-READY-REPORT.md)
- [依赖/冲突与下一波计划](wave1/PARALLEL-WAVE-PLAN-20261018.md)
- [当前登记](registry.json)、[manifest](wave1/manifest.json)、[完整工作流](../CONTROLLER-WORKFLOW.md)

用户要求后续按波次一次出齐所有具备前置的独立票；强依赖等验收再派。READY不等于已外贴，无自动实现者。R补单给原对话；T/U原分配保持，S已验收不重贴。模板含占位符不能执行，所有正式票要真实树/基线/冻结/非空测试和实际baseline。helper不是OS沙箱。
