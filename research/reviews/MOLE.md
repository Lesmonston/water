# Mole 静态源码审阅

审阅日期：2026-10-17。范围：Water 的上游研究输入，不是 Water 依赖选型或安全认证。

## 1. 来源、版本与验证边界

| 项目 | 核对结果 |
|---|---|
| 官方仓库 | https://github.com/tw93/Mole |
| 本地 checkout | `research/upstream/mole`，未修改 |
| main 精确 commit | `03e77bec6746fb08588a7ae9188b794feb35e83d`；本次只读 `git ls-remote --heads origin main windows` 的 main 与本地 HEAD 一致 |
| Windows 分支 | 同次远端查询确认 `refs/heads/windows` 存在，commit 为 `78e537bb17a28e9de00c24f84fa1b75be64ddc1d` |
| main 许可证 | LICENSE 开头为 GNU GPL Version 3；README 明确 GPL-3.0，不能继续按历史 MIT 印象评估。[LICENSE](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/LICENSE#L1-L6)、[README](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/README.md#L479-L481) |
| Windows 许可证 | 固定 commit 的 LICENSE 同为 GPL Version 3，README 同样标 GPL-3.0。[Windows LICENSE](https://github.com/tw93/Mole/blob/78e537bb17a28e9de00c24f84fa1b75be64ddc1d/LICENSE#L1-L6)、[Windows README](https://github.com/tw93/Mole/blob/78e537bb17a28e9de00c24f84fa1b75be64ddc1d/README.md#L259-L261) |

已静态阅读主分支的 CLI 入口、清理模块、保护名单、文件操作、日志、Go 分析器及代表性测试。Windows 分支仅经网络只读核对固定版本的 README、LICENSE、TRADEMARK；没有克隆或审查其 PowerShell 执行实现，不能据此宣称两端安全能力相同。没有运行上游脚本、构建、安装、测试、扫描或删除；没有访问真实 HOME/开发数据。上游自述的 SECURITY_AUDIT 是项目自身说明，不作为独立审计结论。

接手已读 Water `AGENTS.md`、`README.md`、`docs/STATUS.md`；开始审阅时 `docs/PROJECT-CHARTER.md` 尚不存在。本任务仅写本文件，不修改上游或共享 Vault，不提交。

## 2. CLI、Windows 分支与原生 App 必须区分

- **macOS 开源 CLI**：main README 的系统要求是 macOS 12+、Intel/Apple Silicon；其 `mo clean`、`purge`、`analyze` 等可从本次源码审阅确认调用路径，但未做运行验证。[平台要求](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/README.md#L19-L32)
- **Windows 开源 CLI**：独立 `windows` 分支，README 声称支持 Windows 10/11、内置 PowerShell 5.1，并有 Go 原生工具；其功能与行为在本次仅属于文档宣称。不能再写“Mole 仅支持 macOS”，也不能把 main Bash 实现当成 Windows 实现。[Windows 身份与要求](https://github.com/tw93/Mole/blob/78e537bb17a28e9de00c24f84fa1b75be64ddc1d/README.md#L19-L32)
- **原生 App**：main 明确 Mac App 是独立 proprietary 产品，README 中“800+ 应用残留测试”“先审阅后删除”“风扇控制”等 App 宣称不能归给开源 CLI。本次没有获取或审查该闭源 App。Windows README 同样把原生 Windows App 作为独立下载；其实现不在本次审阅范围，也不由 CLI 的 GPL 声明推导。[App 区别](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/README.md#L19)、[Mac proprietary 声明](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/README.md#L481)、[Windows App 区别](https://github.com/tw93/Mole/blob/78e537bb17a28e9de00c24f84fa1b75be64ddc1d/README.md#L19)

Water 当前只借鉴可解释的设计思想与测试场景。GPL 代码、规则表、文案不直接搬运；任何实际复用由单独来源与许可证审查决定。名称与图形也有独立商标政策，不能从代码许可推出品牌使用权。[TRADEMARK](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/TRADEMARK.md#L1-L16)

## 3. 规则管理：模块化较成熟，但不是统一的数据规则引擎

主分支主要把规则写在 Bash 函数与路径表达式中：`bin/clean.sh` 编排类别，`lib/clean/dev.sh` 编排开发工具；后者依次调用 Python、Node、Docker、AI Agent、浏览器、IDE 等清理函数。因此“工具专用适配器优先于统一递归删除”值得借鉴，但规则、发现、判断、执行和 UI 仍常共处同一个函数，不能直接视为 Water 所需的跨平台计划协议。[类别编排](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/bin/clean.sh#L1742-L1797)、[开发工具编排](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/clean/dev.sh#L5901-L5936)

风险显示函数 `classify_cleanup_risk` 根据描述中的 system/preference/installer/backup/cache/log/temp 和路径片段输出 HIGH/MEDIUM/LOW。它是显示启发式，不是内容价值或可恢复性证明；特别是“日志可自动重建”的泛化不适用于 AI 会话、实验指标和独有诊断证据。[分级实现](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/bin/clean.sh#L774-L809)

**Water 借鉴与限制**：独立设计带稳定 ID、工具/版本范围、配置来源、对象类型、识别证据、保护条件、可恢复前提、原生命令作用范围、平台实现和测试夹具的适配器。分类、删除风险、可恢复性、活跃状态、识别置信度分开记录；不复制 Mole 的描述正则或路径表作为安全规则。

## 4. AI 工具清理：已保护大量状态，但仍含启发式删除

| 静态确认的行为 | 对 Water 的启发与限制 |
|---|---|
| `clean_codex_cli` 故意不清 `.codex` 的会话、索引、凭证及线程状态；Claude `.claude` 的记忆、插件、hook、上下文也不自动清理 | 把会话、记忆、恢复点与缓存分开，未知状态默认保护。[Codex](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/clean/dev.sh#L5225-L5232)、[Claude](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/clean/dev.sh#L5833-L5835) |
| HF/PyTorch/TensorFlow/W&B 的模型、数据集及 run 产物不按整个缓存根自动删除；Docker daemon 数据默认仅提示人工检查 | 对共享模型和实验资产采取保守策略。本次没有证据表明 Mole 已有 HF repo/revision 引用图或 Docker builder 的对象级计划。[模型资产](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/clean/dev.sh#L828-L833)、[Docker](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/clean/dev.sh#L1330-L1357) |
| Claude/Cursor/Copilot 旧二进制版本有保留数、活动 symlink 解析及无法识别时保留；Claude Desktop 另有 SDK/活动版本保护 | 可借鉴“升级残留”独立对象类型与无法确认时保留。其安装布局和内部版本证据不能作为跨版本官方契约。[入口与保留](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/clean/dev.sh#L4046-L4091) |
| Codex staging 专门检查候选层级、每级 symlink、物理根及归属；daemon 旧版本在安装锁下处理 | 将工具特定锁、当前版本和物理路径复核放入最后执行门，而不是仅扫目录名。[物理边界](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/clean/dev.sh#L4318-L4361)、[锁](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/clean/dev.sh#L4730-L4752) |
| Codex runtime 依据 `runtime.json`、dependencies 及 tmp/incomplete/partial 名称判断“活跃/残留”，再检查进程状态 | 属于特定布局启发式，不是普遍可删证明；目录可能含用户放入内容，Water 未适配版本时应只读。[启发式](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/clean/dev.sh#L5062-L5097)、[未知进程状态保留](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/clean/dev.sh#L5132-L5169) |
| OpenCode 普通 cache 根按路径清，快照和诊断 JSONL 保留；Cursor Agent 下 `*.log` 仍按日志保留天数删除 | 同一模块已经存在强保护与年龄/路径规则两种标准。不能把 `.log` 或 cache 根统一等同低价值；Water 需进一步证明用途。[具体调用](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/clean/dev.sh#L5803-L5835) |

进程探测采用“运行/未运行/未知”，只在明确未运行时允许继续，值得独立实现。但没有发现进程并不证明没有引用；不能替代项目依赖图、安装锁或工具自己的协调协议。[三态门](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/core/base.sh#L1686-L1698)

## 5. 白名单：保护优先、失败关闭值得借鉴

存在两层保护：可替换的便利默认名单，以及必须合并到已有用户配置的安全名单；后者特别保留 Poetry virtualenv、renv 共享包和部分系统状态。用户新建一条白名单不应意外关闭这些强保护，这是有价值的模型。[两类名单](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/core/base.sh#L168-L212)、[无条件合并](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/manage/whitelist.sh#L305-L308)

运行加载器把“不存在”与“读取失败”区别处理；读取失败返回错误，不降级成无保护。对条目进行 HOME 展开、绝对路径/控制字符检查；匹配包含精确、glob、保护项的父目录和子目录，避免删父目录带走受保护子项。[加载](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/core/base.sh#L452-L521)、[匹配](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/core/app_protection.sh#L660-L715)

白名单菜单也明确要求“显示可保护的路径”必须是执行器真正检查的路径，防止 UI 勾选没有效果。[UI/执行对应约束](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/manage/whitelist.sh#L90-L100)

**Water 不能照搬的部分**：现有配置替代便利默认列表的语义需要用户理解；Windows 盘符、UNC、大小写、reparse 与 macOS 卷差异不能用 `/` 字符串匹配覆盖。Water 应持久化对象/根身份与明确的保护理由；安全保护、用户固定、路径排除、工具级排除分别表示。配置损坏、不可读或迁移失败均阻止相关执行。

## 6. dry-run：资格检查一致，但不是冻结执行计划

`--dry-run` 同时设置本地 `DRY_RUN` 与导出的 `MOLE_DRY_RUN`。预览记录器复用保护、白名单、compiled-model、活跃缓存和 SQLite 判定，不只是打印将要调用的命令。[参数处理](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/bin/clean.sh#L2093-L2105)、[预览资格检查](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/bin/clean.sh#L245-L291)

候选使用 NUL 分隔的 ledger，保留 identity、size、size_known、section、path；最终按文件身份和父子覆盖去重。这比按行处理路径或简单汇总多模块尺寸更适合复杂文件名与重复扫描。[ledger](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/bin/clean.sh#L186-L227)、[去重出口](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/bin/clean.sh#L294-L308)

**关键限制**：工具原生命令的 dry-run 分支有时只有“would clean”，实际运行才执行 owner command；不会生成该命令的逐对象冻结清单。正常 `clean` 也不是消费前一次预览导出的计划；会重新发现并执行。当前 `--select/--categories/--exclude` 被明确移除。因此不能从“支持 dry-run”推导“默认所有对象先审阅再删”。[owner command 预览与执行](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/clean/dev.sh#L12-L73)、[clean 入口](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/bin/clean.sh#L2115-L2144)

Water 需要明确区分文件对象计划与工具作用范围计划。执行前重核版本、对象身份、引用和锁；无逐对象接口时如实展示原生命令的动态范围，不能伪装成“只删除刚勾选文件”。dry-run 允许产品自身的受控临时文件和审计写入时，也应与“目标数据不变”分别表述。

## 7. 路径边界、执行与恢复

值得借鉴的防线包括：拒绝空值、相对路径、完整 `..` 组件与控制字符；对 leaf symlink 及 ancestor symlink 的实际目标重新做拒绝策略；绑定物理父目录与目标的 device/inode；测量后重新检查进程、打开文件与 compiled-model；支持工具专用 final sink guard，guard 执行后再次绑定身份。[基础验证](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/core/file_ops.sh#L1138-L1238)、[测量后门](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/core/file_ops.sh#L1626-L1661)、[最终门](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/core/file_ops.sh#L1721-L1786)、[身份结构](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/core/file_ops.sh#L3206-L3241)

这些复核降低 TOCTOU 风险，但最终仍有路径形式的 `rm -rf`，不是按句柄/目录描述符完成整个原子删除；递归目录内也能发生并发变化。本次未证明不存在剩余竞争窗口，不能照抄源码注释中的“closes the rest of the window”作为安全保证。[最终删除调用](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/core/file_ops.sh#L1783-L1791)

`mole_delete` 默认 permanent；显式 trash 模式失败时拒绝降级永久删除，这是应保留的契约。`safe_remove` 的 `safe` 代表进行了若干防护，不代表可撤销。README 还明确 `clean` 默认清空 Trash；上游自己承认大部分清理没有 undo。Water 不应默认清空用户现有回收站，也不应把所有 `safe_*` 包装成可恢复。[默认模式](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/core/file_ops.sh#L2349-L2372)、[Trash 失败关闭](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/core/file_ops.sh#L2541-L2593)、[清 Trash 默认](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/README.md#L147-L149)、[无 undo 限制](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/SECURITY_AUDIT.md#L349-L355)

**另一个不应照搬的退路**：uv 可用时调用 `uv cache dir` 与 `prune`；uv 不可用或版本探测失败时，退回直接清 `~/.cache/uv/*`。工具此刻不可调用不证明缓存没有并发使用、共享引用或新格式；Water 应退化为只读而不是绕过工具协议。pip 获取缓存路径失败后使用默认路径做白名单检查，实际执行仍让 pip 自行选择目录，也说明“检查范围”与“命令实际范围”要绑定到同一配置。[uv 退路](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/clean/dev.sh#L98-L109)、[pip 路径与动作](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/clean/dev.sh#L801-L809)

上游设计文档明确不保证任意用户路径中的数据安全，主要保护系统完整性。Water 的保护对象包括独有模型、会话、记忆、恢复点和数据库，边界更严格，不能把其系统路径防护当作资产安全证明。[上游明确边界](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/docs/SECURITY_DESIGN.md#L234-L250)

## 8. 日志、容量与测试

操作日志有 run ID、开始/结束标记、REMOVED/SKIPPED/FAILED/TRASHED 等状态；dry-run 命令名明确追加 `-dry-run`，避免历史界面误认为真实执行。底层删除日志还区分 unknown size、失败与中断。[会话与操作日志](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/core/log.sh#L250-L358)、[删除日志字段](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/core/file_ops.sh#L2356-L2365)

但原生命令成功有时只记录缓存根和 owner command，标准输出/错误被丢弃，不提供逐对象恢复数据；日志本身不是回滚机制。Water 应独立记录计划 ID、规则版本、执行器、对象结果、不可恢复部分和容量估计依据，并脱敏导出。不能仅凭子进程退出 0 宣称每个候选已删除。[owner 日志和输出处理](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/lib/clean/dev.sh#L34-L59)

Go 分析器按 device/inode 去重 hardlink，也调用 APFS clone ID 与“全部块共享”标记去重；源码明确编辑过的 clone 因无法知道共享多少而全计。因此值得学习“物理统计需平台能力”，不能宣称已精确求出任意 APFS 共享块或删除可释放量。Water 应把逻辑大小、归属占用估计、预计释放区间和宿主盘实测分开；Trash/同盘隔离仍占空间，快照及 VM 回收需另计。[APFS 探测](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/cmd/analyze/clone_darwin.go#L12-L54)、[去重与已知限制](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/cmd/analyze/scanner.go#L1239-L1276)

已确认的测试设计值得重建为 Water 自己的测试用例，**本次未运行、未报告通过率**：

- 临时 HOME、假命令及未 mock 的危险命令报错；夹具特别注明绝对可执行路径可绕过 PATH stub，因此 stub 不是操作系统隔离。[测试隔离基础](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/tests/helpers/common.bash#L15-L33)、[stub 边界](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/tests/helpers/common.bash#L57-L62)
- 验证 Codex 状态保留、fixed cache leaf、进程状态未知保留、symlink 根拒绝、SDK/活动版本在测量后变化、安装锁占用等。[AI 夹具](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/tests/clean_ai_cli_caches.bats#L48-L112)、[活动版本竞争](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/tests/clean_ai_cli_caches.bats#L878-L943)、[锁与 unknown](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/tests/clean_ai_cli_caches.bats#L1419-L1525)
- 白名单读取失败/祖先不可达、子项保护父目录、dry-run 去重与 unknown-size、final guard 后身份替换、symlink 仅移除链接等回归用例。[白名单](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/tests/manage_whitelist.bats#L999-L1116)、[预览 ledger](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/tests/clean_core.bats#L1177-L1267)、[final guard](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/tests/file_ops_mole_delete.bats#L121)、[链接用例](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/tests/file_ops_safe_remove_symlink.bats#L34-L94)
- CI 配置包含 macOS 全量测试、macOS 15/26 兼容性子集，以及危险 rm/find 删除出口检查；静态检查通过需要安全理由注释，不代表已证明理由正确。main 的此 CI 不能用于证明 Windows 分支测试覆盖。[CI](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/.github/workflows/test.yml#L16-L110)、[出口检查器](https://github.com/tw93/Mole/blob/03e77bec6746fb08588a7ae9188b794feb35e83d/scripts/audit_destructive_sinks.py#L1-L23)

## 9. 对 Water 的具体结论

1. **优先借鉴思想**：保护名单分层、白名单失败关闭、未知活跃状态保留、发现与执行两次复核、最后执行门、逐工具协调锁、预览资格与执行资格共用、身份与父子去重、明确结果与 unknown。
2. **不直接复用代码/规则**：GPL 与品牌边界需独立审查；现阶段只写 Water 自己的对象协议、保护策略与夹具，不导入 shell 模块或路径目录表。
3. **不能照搬行为**：默认永久清理/清空 Trash、描述正则定风险、按日志年龄证明可删、工具不可用时递归清内部缓存、用 dry-run 替代冻结计划、把路径复核称作原子安全。
4. **双平台研究仍有缺口**：Windows 分支只核对存在与声明；后续独立工单需静态审查 PowerShell 的 reparse、hardlink、回收站、长路径、权限和原生工具范围。macOS 的 APFS clone 探测仅覆盖一部分共享情况，仍需真实 macOS 环境验收。
5. **下一阶段最小落点**：受控夹具目录中的只读适配器，产出含识别证据、版本、已知引用、扫描边界、风险、恢复前提及容量置信度的计划；暂不接真实删除器。

完成状态：静态研究完成；上游运行行为、测试结果、闭源 App、安全性和双平台兼容性均未实测。只读核对远端 refs/固定文档，不安装、不启动、不清理、不修改上游。
