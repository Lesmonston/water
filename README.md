# Water

面向 Windows、macOS AI 开发者的本地存储分析与安全清理助手。

**当前阶段（2026-10-26）：方向调整为 Windows 设备垃圾体检与应用内选择性清理的一体化桌面应用（ADR-018）。第二波 A 规则、B 扫描、C 进程、D 清理执行器、E 桌面界面五票 READY。第一波 31 票保持 VERIFIED，真实 AA→AD 联合验收已通过。**

用户指定本项目所有后续开发均位于 `smaltalk/water`，由 Codex 担任总控。

## 从这里开始

- [总控交接报告（2026-10-26 第 2 份，当前入口）](docs/CONTROLLER-HANDOFF-20261026-2.md)
- [方向调整决定 ADR-018（2026-10-26）](docs/decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md)
- [第二波派前回执：A–E READY](docs/dispatch/wave2/READY-REPORT-20261026.md)
- [界面设计稿（白色磨砂玻璃）](docs/design/water-ui-v1/mockup.html)
- [计划重订草案（已由 ADR-018 落定）](docs/REPLAN-20261026-AGENT-ERA-CHECKUP.md)
- [真实AA→AD联合验收（2026-10-26）](docs/acceptance/wave1/controller/WATER-W1-AAAD-JOINT-REVIEW-20261026.md)
- [上一份交接报告（2026-10-26 上午，历史）](docs/CONTROLLER-HANDOFF-20261026.md)
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

已纳入的独立产物：[Rust契约库](crates/water-contracts/README.md)、[六工具规则数据包](packages/tool-catalog/README.md)、[固定数据只读原型](prototypes/readonly-dashboard/README)、[合成夹具工厂](tools/fs-fixture-kit/README.md)、[内存报告展示投影](packages/report-view/README.md)、[受控夹具元数据扫描](packages/fixture-scan/README.md)、[合成报告阅读界面](prototypes/report-reader/README.md)、[保守报告组装](packages/scan-report/README.md)、[白名单汇总](packages/summary-export/README.md)、[受控会话库](packages/lab-session/README.md)、[调用方供数会话页面](prototypes/lab-reader/README.md)、[项目标记候选证据](packages/project-evidence/README.md)、[容量观察账本](packages/size-ledger/README.md)。[B/C复验](docs/acceptance/wave1/controller/WATER-W1-BC-ADDENDUM-01-REVIEW-20261017.md)、[D补单复验](docs/acceptance/wave1/controller/WATER-W1-D-ADDENDUM-01-REVIEW-20261017.md)与[E复验](docs/acceptance/wave1/controller/WATER-W1-E-REVIEW-20261017.md)记录Windows范围和未验证项；F仅遍历受控合成夹具，产物尚未接真实用户目录扫描或正式桌面界面。

[当前F验收记录](docs/acceptance/wave1/controller/WATER-W1-F-REVIEW-20261017.md)与[并行安排](docs/dispatch/wave1/PARALLEL-NEXT-PLAN-20261017.md)：A–F无需重复外贴。I已通过[单票与隔离集成](docs/acceptance/wave1/controller/WATER-W1-I-REVIEW-20261017.md)，G/H也已[验收并完成受控真实库/模型链路](docs/acceptance/wave1/controller/WATER-W1-GH-REVIEW-20261018.md)。A–I旧票不重复外贴；实际I页面/桌面与真实用户scope后排。

新增已验收产物：[Windows原生目录观察](packages/native-root/README.md)、[原生目录选择](packages/native-picker/README.md)、[项目证据与容量页面](prototypes/evidence-reader/README.md)。另有[目录范围登记](packages/scope-registry/README.md)和[默认脱敏内存报告](packages/redacted-report/README.md)。另有[原生有界元数据遍历](packages/native-scan/README.md)、[脱敏预览下载](prototypes/scan-review/README.md)和[内存Node清单证据](packages/node-manifest/README.md)。当前仍限受控只读范围。

## 研究输入

第三方项目保留在 `research/upstream/`，该目录被 Water Git 忽略。精确来源、commit 与许可证摘要记录在 [upstreams.lock.json](research/upstreams.lock.json)，审阅结论记录在 `research/reviews/`。它们不是产品依赖，也没有被复制到产品源码中。

本阶段不运行第三方安装、构建、扫描或删除命令；不扫描 HOME、整盘或项目之外的开发数据。已有报告从原位置复制入本项目，原文件保留。

Water 的发布许可证、定价与商标名称尚未最终确定；`water` 是工作代号。Git 只在本机：`F:/git-central/water.git` 是 `central` 远端（本机中央裸仓库库房），异盘镜像在 `E:/git-central-mirror/water.git`；没有网络远端、发布包或上线动作。

## 当前验收与下一波

[AC补单06已验收集成](docs/acceptance/wave1/controller/WATER-W1-AC-ADDENDUM-06-REVIEW-20261025.md)：Windows静态桌面基础VERIFIED，[源码说明](apps/desktop-preview/README.md)。原AC/补单06不重贴；桌面真实扫描和macOS未完成。以下READY记录均为历史。

[AC补单05收单与补单06](docs/dispatch/wave1/AC-DESKTOP-ADDENDUM-06-READY-REPORT-20261025.md)：固定框架事件根已识别，应用窗口计数契约明确修订；无UI检查通过，真实页面/退出整门待原对话。下列旧派单为历史。

[AC补单04受阻复核与补单05取证（历史）](docs/dispatch/wave1/AC-DESKTOP-ADDENDUM-05-READY-REPORT-20261024.md)：该轮缺少根明细，已由05补齐；不重复执行旧窗口。

[AC补单04原回执（历史）](docs/dispatch/wave1/AC-DESKTOP-ADDENDUM-04-READY-REPORT-20261024.md)：该次native已失败，按补单05先补取证；[AD/AE已验收](docs/acceptance/wave1/controller/WATER-W1-ADAE-REVIEW-20261024.md)，不重贴。

[AB补单01与真实AA→AB联合验收](docs/acceptance/wave1/controller/WATER-W1-AB-ADDENDUM-01-REVIEW-20261022.md)已通过并集成，无需重贴旧票。

[X/Y/Z收单及真实交互链验收](docs/acceptance/wave1/controller/WATER-W1-XYZ-REVIEW-20261019.md)已通过并集成，三票无需重贴。持续宿主、工作台与受限清单读取分别可用；Z额外同意已由AA/AB接入页面并通过受控联合验收，真实用户scope/桌面/M1仍待后续。

[W补单01与真实V→W联合验收](docs/acceptance/wave1/controller/WATER-W1-W-ADDENDUM-01-REVIEW-20261019.md)已通过并集成，A–W及七补单VERIFIED（Windows受控范围），没有待重贴的旧票。真实用户scope、macOS、桌面与M1仍未完成。下面为历史批次。

[本次J/K安排](docs/dispatch/wave1/SESSION-BATCH-PLAN-20261018.md)及[实际派前回执](docs/dispatch/wave1/SESSION-BATCH-READY-REPORT.md)：两树独立、同一冻结r1基线；J已通过[独立验收及集成](docs/acceptance/wave1/controller/WATER-W1-J-REVIEW-20261018.md)，K[补充单01已通过独立复验及真实J→K页面集成](docs/acceptance/wave1/controller/WATER-W1-K-ADDENDUM-01-REVIEW-20261018.md)，原失败历史保留。J只组合现有受控链路，K从调用方接内存快照。A–I及四补单无需重贴；W2–W5/真实scope/桌面/macOS属于后续规划，未伪装成待派READY单。

## 后续协作

Codex负责架构、规划、契约、工单和验收；用户把总控准备好的一行指令转贴给执行者；执行者在独立工作树提交代码与回执，总控复核后集成。见 [派单登记](docs/dispatch/registry.json) 与 [本轮计划](docs/dispatch/wave1/PLAN.md)：A–I已验收集成，总控没有自动代替用户启动实现者或修产品代码。

[L/M单票及隔离集成验收](docs/acceptance/wave1/controller/WATER-W1-LM-REVIEW-20261018.md)已完成，原正式票无需重贴。A–W及七补单均已VERIFIED（Windows受控范围）；真实V→W开发预览链已通过，真实用户scope、macOS、桌面与M1仍未完成。
