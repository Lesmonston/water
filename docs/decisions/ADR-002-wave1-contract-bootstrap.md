# ADR-002：第一轮先交付契约工程底座

日期：2026-10-17。状态：采纳。总控维护。

## 决策

1. 第一轮只发WATER-W1-A一张实现票：创建Rust workspace与water-contracts，完成固定DTO、序列化、验证及定向测试。没有扫描器、桌面壳、删除器或用户目录遍历。
2. 总控先冻结 `contracts/v1/scan-report.schema.json`、示例、语义规则和Rust公开API。执行者实现代码，不重新定接口。
3. 使用本机已安装的精确Rust 1.95.0、MSVC目标、serde 1.0.229与serde_json 1.0.151。项目不改全局PATH、rustup默认工具链或其他项目；Cargo下载及构建输出进入本工作树`.local/`。
4. 本轮没有工程骨架是预期基线，不把它当已有Rust测试通过。先跑总控已存在的baseline门；实现后再跑合同测试、格式和clippy。空清单不得触发全仓测试。
5. 通过验收后再派扫描器、分类器和报告等依赖该契约的任务。强依赖不伪装成并行票。

## 理由

工具链探测发现Rust不在当前PATH，但用户默认cargo目录内代理和完整1.95.0工具链存在，Visual Studio BuildTools也存在；不需要先外派安装。Rust链接运行探针只用于开发环境验收，产物在`.local/preflight/`，不是产品代码。

纯数据契约可以独立编译和验证，适合先建立可复现基线。DTO不读取文件、不生成扫描权限、不把风险标签变成删除授权；将来扫描/执行能力另行设计。

## 版本与限制

本机稳定别名当前为1.97.1，但精确已装工具链1.95.0同时包含rustfmt/clippy，因此选择后者避免自动安装或stable漂移。macOS真实构建仍未验证；跨平台语义不等于跨平台验收。

Serde官方支持字段与容器属性，但未知字段、缺字段、空值及跨字段关系的具体保证必须由实现和验收证明，不能仅凭derive推断。[Serde](https://serde.rs/attributes.html)、[Rustup工具链环境](https://rust-lang.github.io/rustup/environment-variables.html)、[Cargo配置](https://doc.rust-lang.org/cargo/reference/config.html)
