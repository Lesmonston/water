# 开源研究与复用策略

状态：立项基线。Water发布许可证、收费方式及代码开放范围未定。本轮无第三方产品代码复用。

## 输入与职责

| 项目 | 本轮根许可证 | 使用方式 |
|---|---|---|
| Jharu | Apache-2.0 | 静态研究模型/缓存识别、桌面交互与执行边界 |
| Developer Machine Cleaner | MIT | 静态研究项目扫描、会话候选校验、Tauri后端 |
| Mole main CLI | GPL-3.0 | 静态研究保护策略、规则组织与执行检查；不纳入产品 |
| Kondo | MIT | 静态研究项目marker、目录与core/CLI拆分 |
| npkill | MIT | 静态研究交互扫描、worker、profiles与报告 |

许可标签以 [固定来源锁](../research/upstreams.lock.json) 中的根LICENSE为准；未覆盖每个依赖、资源或未来版本的许可证。上游许可宽松不等于规则正确或可安全发布。

## 后续允许的路径

1. 独立实现公开机制和需求，保留参考记录；不复制源码、规则库或UI文案。
2. 对拟复用的具体组件先列文件、commit、改动方式、许可证/NOTICE、依赖与资源，再评审后引入。MIT/Apache仍需保留相应通知；Apache还涉及修改声明及适用NOTICE等条件，不授予上游商标权。[Apache条款](https://www.apache.org/licenses/LICENSE-2.0)
3. 基于GPL代码分发衍生程序需承担对应许可与源码提供等义务，不能将其直接当作普通闭源组件。本阶段Mole只作阅读，不复制代码、规则或文档实现；后续如选GPL路径另立ADR。[Mole固定LICENSE](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/LICENSE)

不能仅因把GPL程序放到子进程就断言没有义务；发布前以实际组合和分发方式复核。Water暂无商用依赖选型完成或法律清理完成的声明。

## 商业方向

免费竞品已覆盖大部分基础清理交互，收费假设集中在可靠性、项目归属、复杂共享空间、资产管理、迁移归档与支持。已有付费产品仅证明市场有人提供报价，不证明销量或Water的付款意愿。

2026-10-17价格观察：[Mole](https://mole.fit/) Mac US$19买断、Windows独立销售；[DevCleaner](https://devcleaner.app/pricing) Pro US$19.99/年或US$59买断；[LLM Cleaner](https://getllmcleaner.com/) US$19早期买断、含v1.x更新。标价、促销、税及授权条件会变化；本项目不据此冻结售价。

先验证Windows/macOS真实样本与少量用户付款，再做授权体系。安全说明、计划预览与必要保护不能成为付费后才有的基础防线。不会为了差异加入模型API或上传用户目录内容。
