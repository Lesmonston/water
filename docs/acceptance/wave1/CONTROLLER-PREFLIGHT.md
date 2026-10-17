# 第一轮架构与派前验收记录

日期：2026-10-17。负责人：总控。阶段：架构基线冻结，实际实现由用户外贴后开始。

## 已验证

- Rust不在本会话PATH，但默认cargo目录里的rustup代理及精确1.95.0工具链可用；rustfmt/clippy均已安装。
- Visual Studio 2022 BuildTools存在；使用1.95.0在water/.local内编译并运行独立链接探针成功。没有安装或升级任何全局工具。
- scan v1 Schema、Rust API与语义已写明；9个冻结文件记录SHA-256。架构静态复核修正了完整字符串边界、祖先资产保护、各scope取消状态对应、重复JSON键、手工DTO验证和资源边界。
- 总控资产检查验证66组报告输入、基础值模式及原始JSON材料的结构；另外准备6组原始JSON、6组手工DTO与2组资源边界用例，Rust的语义与入口行为尚未运行。
- worker-check已实际存在；preflight工具链探针通过。只读审查后补了Cargo环境/配置限制、本地状态目录边界、命令后复核、非空且无ignored测试门、前后提交/脏树记录及stdout与stderr分离。

## 尚未验证

没有Cargo workspace、water-contracts实现或Rust合同测试结果。helper的Cargo模式将在外贴实现后验证；当前baseline只验证工具链、仓库身份和冻结材料，不是产品测试。

macOS、真实扫描、用户数据保护执行、清理、UI、打包和收费均不属于本轮派前验证。helper不是OS沙箱，源代码与依赖仍需总控审阅。

## 基线与权威票面

先将架构与helper提交为精确基线P，再在主检出写明含P完整SHA的正式票/manifest；工作树从P建立。worker读取主检出的权威票面，helper通过git-common-dir定位同一manifest，无须merge main取票。READY表示可转贴，不表示用户已转贴或执行者已启动。
