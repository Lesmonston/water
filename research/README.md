# 研究输入与可复现性

本目录用于Water立项研究，不是产品源码vendor目录。

- [来源锁](upstreams.lock.json)：五个上游的origin、精确commit、提交时间、根许可证Git blob及SHA-256、对应审阅。
- [源码结论](OPEN-SOURCE-ANALYSIS.md)：总控汇总与研发决策。
- `reviews/`：限定commit的静态审阅；没有运行或实测声明。
- `sources/`：原始调研快照；原文件从smaltalk/docs复制，未删除原件。
- `upstream/`：本地shallow checkout，已被Water Git忽略，不作为submodule或产品依赖。

## 本轮来源

Jharu、Developer Machine Cleaner、Mole main、Kondo、npkill，均从官方GitHub仓库克隆，depth=1、无tags、无submodules。clone时禁用hooks；未执行上游install、build、scan、test或clean。机器的Git传输重写配置可改变实际网络路由，因此lock记录clone时配置的origin，未记录私人代理配置。

本次的Mole研究主体是main分支的CLI。Windows CLI存在的远端分支事实与独立付费原生App功能分别注明，不当成主checkout已审过的代码。

## 验证

本项目辅助脚本仅依赖Node内置模块和Git，不需要npm install：

```text
node scripts/verify-project.mjs
node scripts/verify-project.mjs --with-upstreams
```

第一条检查文档及存在的本地checkout；第二条要求五个checkout均存在且HEAD、origin、许可证blob与lock一致。均检查本地文档链接和研究源码未混入Water Git，不验证远端网页可用性或上游运行安全。

`node scripts/record-upstreams.mjs`会有意重写lock，仅在总控决定更新全部研究快照后使用，不能当普通检查命令。更新研究需同时更新固定commit引用与评审，不允许用main的变化静默替代原结论。

新机器可用lock的仓库URL克隆后checkout对应commit；如果shallow clone没有该commit，需要定向fetch该commit或完整历史。不要为了复现分析运行上游安装器。
