# Jharu 源码静态审阅

- 审阅日期：2026-10-17。
- 上游：<https://github.com/riponcm/Jharu>。
- 精确 commit：`ca1d2ec22bc5036f615f50f9415aa20a31c01da1`。以下 GitHub 证据链接全部固定到此 commit。
- checkout：`research/upstream/jharu/`；包版本自报 `0.2.0`，见 [Cargo.toml:1–6][cargo]。
- 许可证：仓库 `LICENSE` 为 Apache License 2.0，见 [LICENSE:2–10][license]；README 同样自述 Apache 2.0。此处仅记录仓库许可，不代表已完成第三方依赖、素材、商标或发布复用审查。
- 边界：仅阅读源码、配置、README 和测试定义；未安装依赖、构建、运行扫描、运行测试或执行清理；未修改上游。Windows/macOS 运行行为均未验证。

## 结论

Jharu 可作为产品交互与工具目录清单的研究样本；不宜直接作为 Water 的安全清理内核。它已有 Rust 分类规则、每模型 inventory、Ollama 共享层引用计数和读取失败提示；但执行命令接受前端任意路径，缺少规则绑定与执行前复核。模型使用状态依赖 atime 启发式，不能证明“从未加载”；空间以文件逻辑长度统计，不能证明物理可回收量；转入 Trash 后即累计 `freed_bytes`，不能证明磁盘已经释放。依据见下文 F1–F9，全部为静态结论。

证据标记：**R**＝README/注释/界面自述；**S**＝已沿当前 commit 的源码调用链确认；**I**＝由代码推导的条件场景；**U**＝实际系统行为未验证。本文的“高优先级”指 Water 不应继承的产品安全缺口，不是已经实测或认定的安全漏洞。

## README 宣称与实际覆盖

| 主题 | README 自述（R） | 当前源码证据（S）与边界（U） |
| --- | --- | --- |
| 模型智能 | 每个模型独立展示，区分实际加载与从未加载，Ollama 共享层不会损坏其他模型，见 [README:80–84][readme-models] | `model_scan` 调用 HF、Ollama、Whisper、PyTorch、Keras 适配器；HF 按整个仓库目录展示而非 revision，其他 checkpoint 按后缀识别；没有调用工具自身 inventory API。见 [models.rs:107–126][hf]、[251–267][checkpoint]、[320–349][model-command]。 |
| 25+ 工具规则 | 支持主流模型/包管理器/构建/浏览器工具，见 [README:83–84][readme-models] | `all_rules()` 实际定义 25 条规则；`Rule::paths()` 以用户目录/系统 cache 目录加固定相对路径定位。分类为 `MlModels/DevCache/AppData`，安全等级为 `Safe/Caution/Risky`。见 [rules.rs:4–29][rule-types]、[34–104][rule-paths]、[150–182][rule-list]。 |
| 操作系统保护 | 系统目录永远不能从应用清理，见 [README:88–90][readme-deep] | Deep 页隐藏 `protected` 项的 Clean 按钮，但 `clean_paths` 不重新检查 `protected` 或路径类别。见 [DeepClean.tsx:254–256][deep-button]、[lib.rs:29–50][executor]。 |
| 读取失败透明 | 无法读取的位置会报告，见 [README:137–144][readme-safety] | 通用 scanner 和 deep scan 保存读取错误；模型适配器却对遍历、manifest、metadata 错误使用 `flatten/continue`，没有错误字段。此承诺不能扩展到所有扫描。见 [scanner.rs:50–86][scanner-errors]、[deep.rs:120–158][deep-measure]、[models.rs:41–74][stamps]、[157–175][ollama-read]。 |
| 回收站 | 每次清理都入 Trash/Recycle Bin，从不永久删除，见 [README:137–144][readme-safety] | 本次审阅到的公共清理入口调用 `trash::delete`，无失败后永久删除 fallback；但未审阅依赖源码、实际支持卷及每个平台失败语义，不能把依赖调用当成已验证恢复保证。见 [lib.rs:29–50][executor]、[Cargo.toml:24–32][cargo-deps]。 |

## F1：路径执行边界只在界面，Water 必须在 Rust 端重新建立（高优先级，S/I/U）

公共命令 `clean_paths(paths: Vec<String>)` 注册在 Tauri invoke handler，遍历每个字符串，仅检查 `path.exists()`、估算目录大小，然后 `trash::delete(&path)`。这条完整调用路径中没有扫描结果 ID、规则 ID、允许根目录、受保护路径判定、路径规范化/文件身份验证、去除父子重叠项、计划有效期、进程/锁检查或执行前引用重算。见 [lib.rs:29–50][executor]、[71–95][handler]。

正常 UI 也存在值得注意的可达路径：Deep 默认扫描 Windows `C:\` 或 macOS `/`，`classify` 对未知对象返回 `other,false`；用户目录的祖先（例如 `C:\Users`、`/Users`）未被该分类函数显式保护。列表对 `!protected` 显示 Clean；确认框把除 `user_data` 之外的类别传成 `cache`，而 `risky` 仅对 `user_data/app_data` 为真。因此未知目录/祖先目录可能收到“工具会自动重建”的缓存说明，并进入公共执行器。依据：[deep.rs:29–34][deep-root]、[59–114][deep-classify] → [DeepClean.tsx:112–120][deep-confirm]、[254–256][deep-button] → [lib.rs:29–50][executor]。这是静态可达性与错误分类风险；是否被操作系统权限/Trash 支持拒绝、能否实际移动，未测试，不能声称已成功删除系统或用户目录。

**Water 自研要求：**前端仅提交后端生成的不可伪造计划 ID 和对象 ID；执行器独立验证根目录、路径组件/卷/文件身份、对象用途和保护集，保护 HOME/系统根及其祖先；未知对象只做占用展示。不得以 UI 按钮隐藏充当安全边界。

## F2：同一工具在不同页面走不同清理粒度（高优先级，S/I/U）

- HF 通用规则叫 `hf-hub`，路径却是整个 `~/.cache/huggingface`，而模型适配器只处理其中 `hub/models--*`、`hub/datasets--*`。DevClean 把整个 finding 路径直接提交 `clean_paths`。依据：[rules.rs:41–47][rule-paths]、[models.rs:109–125][hf] → [DevClean.tsx:57–68][dev-clean] → [lib.rs:29–50][executor]。不能因“在 .cache 内”推断整树皆可重下；Water 应核实并保护该根内认证与非目标数据。HF 官方另明确 `HF_HOME` 同时存 token 与缓存，默认 token 位于 `$HF_HOME/token`，这是外部产品契约事实，见 [HF 环境变量文档](https://huggingface.co/docs/huggingface_hub/en/package_reference/environment_variables#hf_home)，不是 Jharu 已做的保护。
- Ollama 模型页按 manifest 与独占 blob 构造路径，但 DevClean 的 Ollama finding 是整个 `.ollama/models`，清理时不经过共享层逻辑。依据：[models.rs:196–245][ollama-plan]、[rules.rs:43][rule-paths] → [DevClean.tsx:57–68][dev-clean]。因此“模型页保护共享层”不能概括成全应用每个清理入口均有同样保护。
- Docker 规则说明“使用 docker system prune 而非删除”，且标 `Risky`；实际 DevClean 没有为它禁用 Clean，确认后依旧把 VM 目录传到通用 Trash 执行器。依据：[rules.rs:122–130][docker-path]、[177][rule-list] → [DevClean.tsx:92–101][dev-confirm]、[215–222][dev-button] → [lib.rs:29–50][executor]。该正常界面调用链未证明会删除成功，但明显没有落实自身“仅用官方 prune”的建议。

**Water 自研要求：**inventory、计划和执行共用适配器；目录级聚合对象默认不可操作，容器/模型仓库通过版本化官方机制或经过验证的引用计划处理。不能把 `Risky` 视为附加一句提醒后即可通用删除。

## F3：“从未加载”其实是时间戳启发式（高优先级，S/I/U）

`stamps` 汇总目录内最大的 mtime 与 atime；`build_entry` 以 `max_atime > max_mtime + 3600 秒` 判定 used，并把 mtime 当下载日期。Ollama 也对各 blob 使用同一公式。全报告只要**任意一个模型**通过公式，`usage_tracking_reliable` 就置为 true。依据：[models.rs:6–8][threshold]、[41–104][stamps-build]、[204–245][ollama-plan]、[337–345][model-reliability]。

这不能证明 atime 来自推理加载，也不能由一份文件的观测推断其他卷/目录的 atime 策略可靠；目录内最大 atime 与最大 mtime 还可能来自不同文件。I：下载后一小时内确实加载、随后某个文件被重新写入、工具或其他读取者访问文件，都可能使判定偏离真实模型使用情况。未做 atime 文件系统实验，不能量化误判率。

UI 在可靠性为 false 时隐藏批量选择与行标签，但 `Never loaded` 筛选及其数量仍可见，筛选条件始终是 `!used_since_download`。依据：[Models.tsx:43–47][models-filter]、[164–176][models-unused]、[202–207][models-badges]。通用 scanner 的 `stale_days` 则基于最新 mtime，界面 90 天后显示 `Unused`，同样不等于无读取/无项目引用。依据：[scanner.rs:142–154][scanner-stale] → [DevClean.tsx:199–200][dev-stale]。

**Water 自研要求：**把“最近修改/观察到读取/工具报告使用”作为不同证据，保留 unknown；atime 只提供弱提示，禁止推出“从未用过”或自动降低删除风险。下载时间必须有对应来源，不从任意 mtime 推断。

## F4：Ollama 引用计数有可借鉴思路，也有必须修正的完整性前提（S/I/U）

已实现：遍历 manifest，收集 layers 与 config digest，构造全局 refcount；每个模型只把 `refcount <= 1` 的 blob 加到删除路径。见 [models.rs:128–194][ollama-read]、[196–247][ollama-plan]。这是正常、完整、静态 manifest 集合下保留未选模型共享层的实际代码依据。

缺口与条件推导：

1. manifest 读取或 JSON 解析失败直接跳过，模型结果没有 incomplete/error 标记。I：若 B 的 manifest 无法读取，而 A/B 实际共用某 blob，扫描可能只统计到 A 的引用；A 的删除路径便含此 blob，确认后公共执行器不重新验证 B。调用链：[models.rs:157–175][ollama-read] → [218–220][ollama-plan] → [Models.tsx:68–76][models-clean] → [lib.rs:29–50][executor]。这是需要故障注入测试的条件风险，未声称已复现。
2. 计划是在扫描时生成的字符串路径，没有版本/mtime/文件身份或仓库锁；扫描至执行期间新建模型/下载可能改变引用，公共执行器不重算。依据同上。Water 必须在无法穷举引用或发现变更时拒绝回收共享对象。
3. A/B 共享 blob 同时被选中时，扫描时的 refcount 仍为 2，因此共享 blob 不在任一模型的删除列表，可能遗留孤儿数据；这是偏保守的少清理，不是“破坏模型”的证据。见 [models.rs:190–220][ollama-plan]。
4. `digest_to_blob` 仅把冒号替换为连字符，没有在此处验证 digest 算法/长度/字符集或生成路径包含关系。见 [models.rs:134–141][digest]。本次没有构造恶意 manifest，也未确认上游下载入口能否写入异常 digest，不作可利用漏洞结论；Water 的适配器不得把外部 metadata 直接升级为可信路径。

## F5：共享存储、链接与空间口径尚未形成通用模型（S/I/U）

Ollama `size_bytes` 为每模型各 digest 的 `meta.len()` 之和，报告 `total_bytes` 再把所有模型相加，故同一共享 blob 可重复计入总量；独占字节仅根据单模型 refcount 估算，也未包含 manifest 的长度。见 [models.rs:196–241][ollama-plan]、[341–343][model-reliability]。HF 则把整个 repo 的 `stamps.size` 直接当 `exclusive_bytes`，没有 revision/blob 引用图或跨仓库共享存储识别，见 [models.rs:88–125][stamps-build]。

通用扫描、模型扫描和执行估算使用 `Metadata::len()` 相加，没有按文件身份去重或查询 allocated bytes；不能将其称为物理独占空间、硬链接/稀疏文件实际占用或最终可回收空间。见 [scanner.rs:68–79][scanner-errors]、[models.rs:41–74][stamps]、[lib.rs:57–68][size]。Deep scan 有根层子项 symlink 过滤和 macOS 特定排除目录，这是扫描侧局部处理，不等于执行器已处理 symlink/junction/reparse/mount 和竞态；依赖默认遍历语义及跨平台实际行为未验证。见 [deep.rs:36–56][deep-excluded]、[167–176][deep-links]、[lib.rs:29–50][executor]。

**Water 自研要求：**分开展示 logical bytes、allocated bytes、共享引用、单次计划独占可回收估算与实测空闲空间变化；用文件 ID+卷标识去重，在组合计划层重算引用；用 fixture 验证 Windows NTFS hard link/junction/reparse 与 macOS symlink/APFS clone/sparse 的口径，不能承诺对所有文件系统精确去重。

## F6：Trash 成功被当成磁盘空间已释放（S/I/U）

`clean_paths` 在 `trash::delete` 返回 Ok 后将操作前的 `dir_size` 累加为 `freed_bytes`；各视图将该字段传给 `onRecovered`，没有执行后查询盘符空闲量。确认框写 `Space reclaimed`。依据：[lib.rs:23–46][executor] → [Models.tsx:68–76][models-clean]、[DevClean.tsx:57–68][dev-clean]；[ConfirmClean.tsx:62–68][confirm-space]。源码证明的是“成功调用回收站并累计逻辑估算”，并不证明物理释放或恢复可用性。

DevClean 收到 outcome 后即使存在逐项 errors，也过滤掉该 finding；这可能让失败项暂时从界面消失。见 [DevClean.tsx:62–68][dev-clean]。Water 需要逐对象结果、状态重扫、恢复记录和失败保留；“已移入回收站”“预计可回收”“已确认释放”必须分开。

## F7：对象身份与配置发现需要独立设计（S/I/U）

模型页的选中状态仅按 `name`，React key 也仅按 `name`；Ollama name 只取 manifest 路径最后两段，省略 registry/namespace。I：不同 registry/namespace 下同名 model:tag 会共享选中键；同名可能跨 provider 冲突。见 [models.rs:178–188][ollama-name] → [Models.tsx:50–65][models-select]、[191–196][models-row]。Water 应使用 provider+canonical resource identity+root+revision/tag 的稳定 ID，展示名不参与权限与选择逻辑。

HF/Ollama/Torch/Keras 模型路径和通用规则都是 home 固定路径，相关函数没有读取 `HF_HOME/HF_HUB_CACHE/OLLAMA_MODELS/TORCH_HOME` 等覆盖值，也没有调用工具获取有效配置；macOS/Windows 一部分 cache 规则做了平台分支，但不能等价为所有自定义目录或便携/服务实例都覆盖。见 [models.rs:109–110][hf]、[145–147][ollama-read]、[320–335][model-command]、[rules.rs:34–148][rule-paths-all]。这里仅确认当前实现的发现能力边界，不代表默认路径在所有机器上都错误。Water 应先发现有效根目录并记录来源，默认路径只是候选。

Python 包重复占用也有相似局限：按规范化目录名归并，不比较版本/ABI/平台/文件哈希；每环境只保留体积最大的 30 项，然后跨环境统计并把总和减最大一份叫 `wasted_bytes`。见 [python.rs:132–150][py-name]、[181–203][py-packages]、[229–254][py-duplicates]。这只能作为多环境占用提示，不能作为可直接合并/删除的真实重复文件证据。

## F8：活动任务保护没有进入清理调用链（S/U）

模型和 DevClean 的 clean 动作均走 `clean_paths`；执行器没有进程枚举、文件句柄检测、下载锁或工具状态查询。`sysinfo` 依赖的存在不意味着已实现运行任务保护；本次完整入口检查见 [lib.rs:29–50][executor]。Browsers 页只有“先退出浏览器”的文字提示，见 [Browsers.tsx:73–76][browser-warning]。运行中被锁文件是否导致失败、部分目录是否能被移动，因平台和工具而异，本次未测试，不能假设 OS 会自动使整个操作安全。

**Water 自研要求：**将“活跃/可能活跃/无法判断”作为适配器证据；未知或活跃时默认阻止相关清理。执行前重新检查下载/构建/模型服务状态及引用；文件锁只是一个信号，不能单独证明无使用者。

## F9：现有测试不足以验收清理安全（S/U）

Rust 源码发现的测试为 scanner/model/python 三个 smoke test，均直接取真实 HOME；model/python 主要打印结果，scanner 只断言磁盘容量大于零。见 [models.rs:270–317][model-test]、[python.rs:154–165][py-test]、[scanner.rs:171–195][scanner-test]。`package.json` 未提供 test 脚本，见 [package.json:6–10][npm-scripts]。本次未执行这些测试；它们会读取 HOME，不能用于 Water 当前受控目录验证。

上述测试未提供隔离目录的共享层引用断言、坏 manifest/读取失败、不同 atime 策略、环境变量覆盖、同名模型身份、扫描后变更、路径根/祖先保护、symlink/junction/hard link、逻辑/物理空间、逐项 Trash 失败或活动任务场景的验证证据。该结论是当前 checkout 中已审阅测试的覆盖边界，不宣称上游从未做过手工测试。

## Water 决策

| 类别 | 建议 | 对应依据 |
| --- | --- | --- |
| 可借鉴 | 按工具与对象显示用途、来源、占用和操作后果；区分缓存/模型/环境；读取错误显式进入结果；Ollama 引用图意识；把耗时扫描放到 blocking runtime，逐项更新 UI。仅借鉴思路，暂不复制代码/规则/文案。 | [规则类型][rule-types]、[scanner 错误字段][scanner-errors]、[Ollama 引用计数][ollama-read]、[deep scan 事件][deep-events]。 |
| 不应复制 | 任意路径通用执行器、目录名即清理授权、HF 根整树清理、Docker VM 目录清理、atime 推出从未加载、mtime 推出未使用、所有模型都能自动重下的承诺、Trash 即释放空间、包同名即浪费。 | F1–F8 的固定源码证据。 |
| 需要自研 | 版本化工具适配器与有效配置发现；只读 inventory；置信度与未知状态；文件身份/真实占用口径；完整引用图与组合计划；后端签发的操作计划；保护集与执行前复核；活动任务保护；逐项结果/恢复能力记录；隔离 fixture 与 Windows/macOS 验收。 | F1–F9 暴露的能力边界；这是 Water 需求建议，并非 Jharu 已有功能。 |

下阶段优先建立只读 fixture 原型；真实清理执行器单独立工单。本报告不包含实现或清理授权。

[license]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/LICENSE#L2-L10
[cargo]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/Cargo.toml#L1-L6
[cargo-deps]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/Cargo.toml#L24-L32
[readme-models]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/README.md#L80-L84
[readme-deep]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/README.md#L88-L90
[readme-safety]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/README.md#L137-L144
[rule-types]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/rules.rs#L4-L29
[rule-paths]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/rules.rs#L34-L104
[rule-paths-all]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/rules.rs#L34-L148
[rule-list]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/rules.rs#L150-L182
[docker-path]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/rules.rs#L122-L130
[executor]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/lib.rs#L23-L50
[handler]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/lib.rs#L71-L95
[size]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/lib.rs#L57-L68
[threshold]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/models.rs#L6-L8
[stamps]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/models.rs#L41-L74
[stamps-build]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/models.rs#L41-L125
[hf]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/models.rs#L107-L126
[checkpoint]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/models.rs#L251-L267
[digest]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/models.rs#L134-L141
[ollama-read]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/models.rs#L128-L194
[ollama-name]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/models.rs#L178-L188
[ollama-plan]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/models.rs#L190-L247
[model-command]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/models.rs#L320-L349
[model-reliability]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/models.rs#L337-L345
[model-test]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/models.rs#L270-L317
[scanner-errors]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/scanner.rs#L50-L86
[scanner-stale]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/scanner.rs#L142-L154
[scanner-test]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/scanner.rs#L171-L195
[deep-root]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/deep.rs#L29-L34
[deep-excluded]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/deep.rs#L36-L56
[deep-classify]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/deep.rs#L59-L114
[deep-measure]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/deep.rs#L120-L158
[deep-links]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/deep.rs#L167-L176
[deep-events]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/deep.rs#L183-L205
[deep-confirm]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src/views/DeepClean.tsx#L112-L120
[deep-button]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src/views/DeepClean.tsx#L254-L256
[dev-clean]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src/views/DevClean.tsx#L57-L68
[dev-confirm]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src/views/DevClean.tsx#L92-L101
[dev-button]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src/views/DevClean.tsx#L215-L222
[dev-stale]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src/views/DevClean.tsx#L199-L200
[models-filter]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src/views/Models.tsx#L43-L47
[models-select]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src/views/Models.tsx#L50-L65
[models-clean]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src/views/Models.tsx#L68-L76
[models-unused]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src/views/Models.tsx#L164-L176
[models-row]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src/views/Models.tsx#L191-L196
[models-badges]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src/views/Models.tsx#L202-L207
[confirm-space]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src/components/ConfirmClean.tsx#L62-L68
[browser-warning]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src/views/Browsers.tsx#L73-L76
[py-name]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/python.rs#L132-L150
[py-packages]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/python.rs#L181-L203
[py-duplicates]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/python.rs#L229-L254
[py-test]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/src-tauri/src/python.rs#L154-L165
[npm-scripts]: https://github.com/riponcm/Jharu/blob/ca1d2ec22bc5036f615f50f9415aa20a31c01da1/package.json#L6-L10
