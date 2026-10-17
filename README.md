# Water

面向 Windows、macOS AI 开发者的本地存储分析与安全清理助手。

**当前阶段：第一轮契约底座工单已READY，等待用户外贴。立项、源码分析和架构冻结已完成；Rust实现尚未交付，没有应用或真实删除能力。**

用户指定本项目所有后续开发均位于 `smaltalk/water`，由 Codex 担任总控。

## 从这里开始

- [当前状态与交接](docs/STATUS.md)
- [总控与人工外贴工作流](docs/CONTROLLER-WORKFLOW.md)
- [立项书](docs/PROJECT-CHARTER.md)
- [首版需求与验收](docs/MVP-REQUIREMENTS.md)
- [架构与安全边界](docs/ARCHITECTURE.md)
- [里程碑与任务](docs/ROADMAP.md)
- [开源研究结论](research/OPEN-SOURCE-ANALYSIS.md)
- [开源复用策略](docs/OPEN-SOURCE-STRATEGY.md)
- [原始调研](research/sources/ai-developer-cleaner-research-2026-10-17.zh-CN.md)
- [代理协作规则](AGENTS.md)

## 研究输入

第三方项目保留在 `research/upstream/`，该目录被 Water Git 忽略。精确来源、commit 与许可证摘要记录在 [upstreams.lock.json](research/upstreams.lock.json)，审阅结论记录在 `research/reviews/`。它们不是产品依赖，也没有被复制到产品源码中。

本阶段不运行第三方安装、构建、扫描或删除命令；不扫描 HOME、整盘或项目之外的开发数据。已有报告从原位置复制入本项目，原文件保留。

Water 的发布许可证、定价与商标名称尚未最终确定；`water` 是工作代号。没有远程仓库、发布包或上线动作。

## 后续协作

Codex负责架构、规划、契约、工单和验收；用户把总控准备好的一行指令转贴给执行者；执行者在独立工作树提交代码与回执，总控复核后集成。当前 [派单登记](docs/dispatch/registry.json) 中只有WATER-W1-A为READY；[正式票面](docs/dispatch/tickets/WATER-W1-A-CONTRACTS-20261017.md)已存在，模板仍不可执行，没有自动启动实现者。
