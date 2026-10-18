# Water

面向 Windows、macOS AI 开发者的本地存储分析与安全清理助手。

**当前阶段：A–J及四旧补单已VERIFIED（Windows）。K原门通过，但真实J→K集成发现合法根issue路径被拒绝，已发补充单01待外贴；K产品未合主线。真实页面、真实用户目录、分类、桌面/macOS和删除未验收，M1未完成。**

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

已纳入的独立产物：[Rust契约库](crates/water-contracts/README.md)、[六工具规则数据包](packages/tool-catalog/README.md)、[固定数据只读原型](prototypes/readonly-dashboard/README)、[合成夹具工厂](tools/fs-fixture-kit/README.md)、[内存报告展示投影](packages/report-view/README.md)、[受控夹具元数据扫描](packages/fixture-scan/README.md)、[合成报告阅读界面](prototypes/report-reader/README.md)、[保守报告组装](packages/scan-report/README.md)、[白名单汇总](packages/summary-export/README.md)、[受控会话库](packages/lab-session/README.md)。[B/C复验](docs/acceptance/wave1/controller/WATER-W1-BC-ADDENDUM-01-REVIEW-20261017.md)、[D补单复验](docs/acceptance/wave1/controller/WATER-W1-D-ADDENDUM-01-REVIEW-20261017.md)与[E复验](docs/acceptance/wave1/controller/WATER-W1-E-REVIEW-20261017.md)记录Windows范围和未验证项；F仅遍历受控合成夹具，产物尚未接真实用户目录扫描或正式桌面界面。

[当前F验收记录](docs/acceptance/wave1/controller/WATER-W1-F-REVIEW-20261017.md)与[并行安排](docs/dispatch/wave1/PARALLEL-NEXT-PLAN-20261017.md)：A–F无需重复外贴。I已通过[单票与隔离集成](docs/acceptance/wave1/controller/WATER-W1-I-REVIEW-20261017.md)，G/H也已[验收并完成受控真实库/模型链路](docs/acceptance/wave1/controller/WATER-W1-GH-REVIEW-20261018.md)。A–I旧票不重复外贴；实际I页面/桌面与真实用户scope后排。

## 研究输入

第三方项目保留在 `research/upstream/`，该目录被 Water Git 忽略。精确来源、commit 与许可证摘要记录在 [upstreams.lock.json](research/upstreams.lock.json)，审阅结论记录在 `research/reviews/`。它们不是产品依赖，也没有被复制到产品源码中。

本阶段不运行第三方安装、构建、扫描或删除命令；不扫描 HOME、整盘或项目之外的开发数据。已有报告从原位置复制入本项目，原文件保留。

Water 的发布许可证、定价与商标名称尚未最终确定；`water` 是工作代号。没有远程仓库、发布包或上线动作。

## 下一批

[本次J/K安排](docs/dispatch/wave1/SESSION-BATCH-PLAN-20261018.md)及[实际派前回执](docs/dispatch/wave1/SESSION-BATCH-READY-REPORT.md)：两树独立、同一冻结r1基线；J已通过[独立验收及集成](docs/acceptance/wave1/controller/WATER-W1-J-REVIEW-20261018.md)，K集成失败，已准备[补充单01](docs/dispatch/tickets/WATER-W1-K-ADDENDUM-01-20261018.md)待转贴给原执行者，详见[K验收报告](docs/acceptance/wave1/controller/WATER-W1-K-REVIEW-20261018.md)。J只组合现有受控链路，K从调用方接内存快照。A–I及四补单无需重贴；W2–W5/真实scope/桌面/macOS属于后续规划，未伪装成待派READY单。

## 后续协作

Codex负责架构、规划、契约、工单和验收；用户把总控准备好的一行指令转贴给执行者；执行者在独立工作树提交代码与回执，总控复核后集成。见 [派单登记](docs/dispatch/registry.json) 与 [本轮计划](docs/dispatch/wave1/PLAN.md)：A–I已验收集成，总控没有自动代替用户启动实现者或修产品代码。
