# Water 状态与交接

更新时间：2026-10-17。

## 已确认

- 用户授权正式立项，项目根为 `F:/new/smaltalk/water`，总控为 Codex。
- 首版服务 Windows、macOS AI 开发者，覆盖 AI 编程、包管理器、本地模型与开发基础设施。
- 本阶段完成目录与版本管理、范围定义、开源源码静态分析和下一阶段工单；不启用真实清理。

## 已完成：M0 / W0

- 建立独立本地Git、AGENTS协作规则、立项书、首版需求、安全架构、ADR、里程碑及W0/W1工单。
- 克隆并锁定Jharu、Developer Machine Cleaner、Mole main、Kondo、npkill；四份静态审阅与总控汇总已完成。
- 原始调研已复制到research/sources；第三方checkout在research/upstream，未修改、未跟踪进Water Git。
- 首轮校验通过：19份Markdown、26处本地文档链接、182处固定commit源码引用；5个checkout的HEAD、origin、许可证哈希及洁净状态一致。
- 另有4处Mole Windows固定commit文档引用没有本地checkout，只做了网络核对；未把它们算作本地实现验证。
- 暂定独立Rust内核 + Tauri 2 + TypeScript/React。尚未实现产品代码，尚未运行竞品或真实清理。

## 下一步

[W1只读内核与fixture](tasks/W1-READONLY-CORE.md) 为下一工单：确认工具链和双平台构建条件，冻结数据契约，先在项目内受控目录验证。真实清理执行器属于后续单独验收的里程碑。

## 未完成与验证限制

- 当前PATH未发现cargo/rustc；没有安装工具链，下一阶段先确认安装位置或准备开发环境。
- 当前机器为Windows；macOS行为、签名、安装包、真实容量及恢复能力均未验证。
- 产品许可证、定价、品牌与远程仓库尚未冻结；没有公开发布、推送、收款或联系上游。
- 各上游的静态风险均不是已复现漏洞；Water也没有因此获得安全认证或独有功能证明。
- 会话平台的目录切换接口尚未将新仓库识别为observed worktree，切换未成功；当前会话环境根仍是smaltalk。所有项目命令必须显式设置workdir为water，所有文件仍只写water；不要声称平台会话目录已经切换。

本轮完成记录见 [COMPLETION-SUMMARY.md](COMPLETION-SUMMARY.md)。全部后续项目工作继续在water内，由总控统一分派与验收。
