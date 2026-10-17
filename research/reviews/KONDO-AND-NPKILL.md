# Kondo 与 npkill：项目识别及执行语义审阅

审阅日期：2026-10-17。负责人：总控。范围：静态源码与测试文件阅读；未安装依赖、运行项目、执行测试或清理。

| 项目 | 固定commit | 许可证 |
|---|---|---|
| Kondo | `1d351ca80b3d3adfad9bbe7db872c27359190210` | 根LICENSE为MIT |
| npkill | `bfc076807dbb4ae051224d991f98194d34b00452` | 根LICENSE为MIT |

上游输入与许可证blob哈希见 [来源锁](../upstreams.lock.json)。下列缺口相对Water的预期安全模型描述，不是已复现漏洞，也不评价产品全部路径。

## Kondo

### 能从源码确认的设计

- 项目marker与产物目录集中定义。Python目录清单包含mypy/pytest/ruff/tox/bytecode等，但当前版本不再包含`.venv`；本次HEAD提交主题正是取消清理`.venv`。[规则与类型](https://github.com/tbillington/kondo/blob/1d351ca80b3d3adfad9bbe7db872c27359190210/kondo-lib/src/lib.rs#L9-L100)
- `last_modified`遍历项目metadata取最新modified；用于年龄筛选，不是工具真实最后使用记录。[修改时间](https://github.com/tbillington/kondo/blob/1d351ca80b3d3adfad9bbe7db872c27359190210/kondo-lib/src/lib.rs#L209-L227)
- CLI提供ignore、follow_symlinks、same_filesystem、older和dry-run选项。默认参数布尔值不等于所有执行入口均具备同样限制。[CLI选项](https://github.com/tbillington/kondo/blob/1d351ca80b3d3adfad9bbe7db872c27359190210/kondo/src/main.rs#L24-L68)
- 核心扫描和CLI/UI分离，库的Project抽象将项目类型映射到artifact_dirs，适合研究“按项目展示”的接口。[Project](https://github.com/tbillington/kondo/blob/1d351ca80b3d3adfad9bbe7db872c27359190210/kondo-lib/src/lib.rs#L157-L207)

### 与Water需求的差异

- `Project::clean`拼接固定目录并调用`remove_dir_all`，错误仅打印，函数无逐项结果返回；另一`clean(project_path)`入口也在打印错误后返回Ok。它们是直接删除，不是回收站或归档恢复协议。[执行器一](https://github.com/tbillington/kondo/blob/1d351ca80b3d3adfad9bbe7db872c27359190210/kondo-lib/src/lib.rs#L316-L329)、[执行器二](https://github.com/tbillington/kondo/blob/1d351ca80b3d3adfad9bbe7db872c27359190210/kondo-lib/src/lib.rs#L536-L584)
- `dir_size`累加metadata.len，遍历和metadata错误被过滤；所读路径没有分配空间/硬链接去重或“不完整统计”的返回状态。不能直接将结果当作预计真正释放空间。[大小统计](https://github.com/tbillington/kondo/blob/1d351ca80b3d3adfad9bbe7db872c27359190210/kondo-lib/src/lib.rs#L505-L512)
- 规则包含Unity MemoryCaptures/Builds、Unreal Saved、Jupyter checkpoints等。名称和生态归属不能证明用户没有保留价值，Water不得原样把这些设成默认回收。[目录清单](https://github.com/tbillington/kondo/blob/1d351ca80b3d3adfad9bbe7db872c27359190210/kondo-lib/src/lib.rs#L47-L78)
- 所读clean函数没有绑定扫描对象身份、已知引用、运行进程、Git资产或恢复前提；扫描的链接选项不能替代执行前重验证。未做路径替换复现，不声称具体平台一定越界。

测试边界：`kondo-lib`内的test模块所见主要验证elapsed格式；并非证明全仓没有其他测试，且本次未运行。[库测试](https://github.com/tbillington/kondo/blob/1d351ca80b3d3adfad9bbe7db872c27359190210/kondo-lib/src/lib.rs#L597-L639)

## npkill

### 能从源码确认的设计

- 扫描worker使用opendir/readdir、任务队列、分块并发；目录发现会跳过符号链接，并尊重排除逻辑。[worker](https://github.com/voidcosmos/npkill/blob/bfc076807dbb4ae051224d991f98194d34b00452/src/core/services/files/files.worker.ts#L203-L286)
- 大小估算优先blocks×512、回退stats.size，目录统一加4096；这比单纯文件长度更接近部分平台的分配空间，但所读路径仍没有hardlink身份去重、APFS独占块证明。异常忽略可导致不完整结果，没有在此处返回覆盖缺口。[容量算法](https://github.com/voidcosmos/npkill/blob/bfc076807dbb4ae051224d991f98194d34b00452/src/core/services/files/files.worker.ts#L217-L265)
- 有库API、CLI交互、profiles与JSON输出相关模块；CLI有dry-run传递。核心`delete$`在dryRun时调用fakeDeleteDir，不执行真正删除。[删除分流](https://github.com/voidcosmos/npkill/blob/bfc076807dbb4ae051224d991f98194d34b00452/src/core/npkill.ts#L114-L136)
- 最近工作区修改时间会避开node_modules、.git、coverage、dist，再取mtime；这是闲置候选排序线索。[时间采样](https://github.com/voidcosmos/npkill/blob/bfc076807dbb4ae051224d991f98194d34b00452/src/core/services/files/files.service.ts#L199-L255)

### 与Water需求的差异

- CLI的`isSafeToDelete`实际上只检查路径basename是否匹配targets，不是文件价值、来源、项目引用或活跃状态的证明。[函数](https://github.com/voidcosmos/npkill/blob/bfc076807dbb4ae051224d991f98194d34b00452/src/utils/is-safe-to-delete.ts#L3-L10)、[调用](https://github.com/voidcosmos/npkill/blob/bfc076807dbb4ae051224d991f98194d34b00452/src/cli/cli.controller.ts#L901-L918)
- Unix执行`execFile('rm', ['-rf', path])`，Windows执行fs.rm(recursive,force)，两者均为直接删除；execFile避免shell文本拼接，但仍不能提供Water所需的范围/身份/恢复协议。[Unix执行](https://github.com/voidcosmos/npkill/blob/bfc076807dbb4ae051224d991f98194d34b00452/src/core/services/files/unix-files.service.ts#L15-L24)、[Windows执行](https://github.com/voidcosmos/npkill/blob/bfc076807dbb4ae051224d991f98194d34b00452/src/core/services/files/windows-files.service.ts#L16-L19)
- 当前core delete API接受path，所读路径未绑定后端生成的清理计划；GUI中若复用此API必须增加Water自己的信任边界，不将它直接暴露给WebView。[core API](https://github.com/voidcosmos/npkill/blob/bfc076807dbb4ae051224d991f98194d34b00452/src/core/npkill.ts#L114-L136)
- 源码目录说明已扩展到多种工具，不能只凭README主标题认定它只支持node_modules；不过描述性文本和警告不等于安全策略实现。[说明清单](https://github.com/voidcosmos/npkill/blob/bfc076807dbb4ae051224d991f98194d34b00452/src/constants/result-descriptions.constants.ts)

测试边界：存在worker、files service、CLI/controller、profiles、JSON output等测试文件，另配置mutation工具；没有执行，不写通过率或将测试存在等同安全通过。[tests目录](https://github.com/voidcosmos/npkill/tree/bfc076807dbb4ae051224d991f98194d34b00452/tests)、[package脚本](https://github.com/voidcosmos/npkill/blob/bfc076807dbb4ae051224d991f98194d34b00452/package.json#L33-L45)

## 对Water的结论

可借鉴：项目marker与目录映射分离、core/CLI分层、进度与取消、按项目解释、年龄用于排序、dry-run和结构化报告。

不直接复用：固定目录等于垃圾、mtime等于不用、basename等于安全、扫描链接过滤等于执行安全、累计字节等于可回收、直接删除等于可恢复。

需要Water自研并验收：用户范围与对象身份、证据/引用/资产保护、版本化工具适配、清理计划/失效、逐项结果与恢复能力、分配空间与共享引用估算。两个项目根LICENSE为MIT，但本轮未复制代码，也未完成依赖树许可审查；许可宽松不是跳过安全审查的理由。
