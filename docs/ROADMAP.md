# 里程碑与总控任务板

按验收推进，不承诺未验证的日历日期。主控：Codex。

| 阶段 | 产出 | 放行条件 | 当前状态 |
|---|---|---|---|
| M0 正式立项 | 本地仓库、立项书、需求、安全架构、五个源码审阅、许可和来源锁定 | 文档一致；固定commit可追溯；无上游代码混入 | 已完成 |
| M1 只读 Alpha | 用户选择目录、只读盘点、证据/保护原因/容量解释与脱敏导出 | 范围不越界、未知保护、容量含义准确、取消/权限错误可见 | A–AB及八补单VERIFIED（Windows受控）；AC桌面基础/AD同源合并报告/AE Mac研究已READY，见[本波](dispatch/wave1/DELIVERY-WAVE-READY-REPORT-20261023.md)。真实桌面扫描/用户scope/macOS与M1未完成 |
| M2 受控清理 | 原生工具动作、具体计划、执行前复核、journal与恢复说明 | 安全矩阵通过；小范围闭环；无任意路径或shell能力 | 待开始 |
| M3 双平台 Beta | Windows/macOS实机、签名分发方案、升级与恢复验证 | 两平台真实证据；已知风险和支持边界明确 | 待开始 |
| M4 收费验证 | 小规模目标用户试用和真实付款实验 | 明确价值、支持成本、退款/授权方案与发布授权 | 待开始 |

## 工单顺序

| 工单 | 任务 | 依赖 | 验收归属 |
|---|---|---|---|
| W0 | [立项与源码研究](tasks/W0-INIT-AND-RESEARCH.md) | 用户授权 | 总控 |
| W1 | [只读内核与fixture](tasks/W1-READONLY-CORE.md)，[AB补单与AA→AB联合验收](acceptance/wave1/controller/WATER-W1-AB-ADDENDUM-01-REVIEW-20261022.md) | A–AB及八补单VERIFIED；同次选择的额外同意、结构证据及独立附件已接通 | Windows受控通过；真实用户scope/桌面/macOS与M1未完成 |
| W2 | 版本化规则注册表、pip/uv/npm/pnpm只读发现 | W1契约 | 规则与内核分别审阅 |
| W3 | HF/Ollama/LM Studio只读inventory与共享空间视图 | W1/W2 | 模型资产保护验收 |
| W4 | [AC桌面基础与AD报告、AE Mac研究](dispatch/wave1/DELIVERY-WAVE-READY-REPORT-20261023.md) | 本波前置已验收；真正桌面扫描后续依赖AC/AD接受 | 当前三票READY；非桌面整链/双平台验收 |
| W5 | 具体计划与单一原生清理闭环 | M1放行 | 安全矩阵、独立复核 |

未完成依赖不得标为READY。多代理协作按文件/模块分工，契约由总控维护；每次回执说明改变、验证、未验证、风险和后续。不以测试数量代替验证有效性。

## 执行方式（用户2026-10-17确认）

总控负责架构/契约/规划/验收，实现单由用户分别外贴。A–I已验收集成（Windows范围）；受控F→G→A→E/H→I模型真实联测通过，I页面仍读冻结合成报告。实质修复继续回派；分类、真实scope安全、Tauri/macOS与发布另排。见[总控流程](CONTROLLER-WORKFLOW.md)、[ADR-007](decisions/ADR-007-parallel-report-export-reader.md)和[登记](dispatch/registry.json)。
