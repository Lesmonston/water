# AI 开发者电脑清理助手：产品与技术调研

调研日期：2026-10-17。第一版目标：Windows、macOS 双平台。

本报告根据官方文档、官方源码及项目自述整理。工具机制为调研事实；风险等级、架构、首版范围和验证门槛为产品建议。本次没有扫描用户电脑的开发数据，也没有执行清理；尚无真实用户样本、容量基准、兼容性实测或付费意愿证据。文档中的命令是实现适配器时的参考，不是建议用户现在批量执行。

## 1. 产品判断

可以做。建议定位为“理解 AI 开发工作流的存储管理与安全清理助手”。核心问题是：哪些空间可回收、属于哪个工具和项目、删后有什么影响、如何恢复、实际能释放多少。

“AI 垃圾”没有通用文件特征。同一个 `.safetensors` 可能是公共下载模型，也可能是唯一的微调成果；同一个 SQLite 数据库可能是可重建索引，也可能保存 Agent 记忆。应先识别“占用项”，再判断其中哪些符合回收条件。

本次核对的 2026 Stack Overflow 调查中，AI 编码相关语言包括 Python、JavaScript、TypeScript 等，因此应覆盖语言工具链，而不能只关注 AI 应用目录。该调查不等于本产品目标客户的工具装机率；以下工具清单是代表性工作流地图，不是市场份额排行。[2026 Developer Survey](https://survey.stackoverflow.co/2026/)

已有直接相邻产品：Jharu 自述支持开发者与机器学习缓存识别、风险说明及回收站；Kondo 聚焦项目依赖和构建产物；Mole 覆盖系统与开发缓存。它们证明同类产品已经存在，不能据此证明需求规模或其安全实现已通过审计。本产品应重点验证“项目归属、共享引用、恢复条件和实际释放量”能否形成优势。[Jharu](https://github.com/riponcm/Jharu)、[Kondo](https://github.com/tbillington/kondo)、[Mole](https://github.com/tw93/Mole)

## 2. 用户与工具地图

| 工作方式 | 代表工具 | 常见本地产物 | 产品关注点 |
|---|---|---|---|
| 使用 AI 编程 | Cursor、VS Code + Copilot/Cline、Claude Code、Codex、Aider | 会话、附件、日志、索引、回滚快照、Git worktree；Agent 发起构建和安装产生的依赖与产物 | 缓存与历史资产混存；多个试验项目累积 |
| 开发 AI 应用与 Agent | Python、uv/pip/conda、Node/npm/pnpm/Yarn、LangChain/LlamaIndex、Playwright、Docker | 包缓存、环境、node_modules、浏览器二进制、镜像层、日志 | 跨项目共享；环境重建成本；临时应用是否仍使用 |
| 本地模型推理 | Hugging Face、Transformers/Diffusers、Ollama、LM Studio、llama.cpp | 模型版本、量化版本、下载残留、共享权重 | 模型是依赖或资产；同名不同量化不是重复 |
| 训练与实验 | PyTorch、Datasets、Jupyter、TensorBoard、W&B、MLflow | 数据转换缓存、编译缓存、checkpoint、实验记录、模型产物 | 编译缓存可重建，实验成果可能不可再生 |
| 图像与视频工作流 | ComfyUI 等 | 模型、LoRA、素材、工作流、临时预览、最终输出 | temp 与 input/output/user/models 的边界 |
| 本地 RAG/服务 | Chroma 等向量库、数据库、容器卷 | embedding、索引、原始文档、数据库、运行数据 | 可能是唯一业务数据，不能归为普通缓存 |

云端推理的 token、提示词缓存、API 账单不属于本机磁盘垃圾；卸载已加载模型释放的是内存/显存，也应与磁盘清理分开呈现。Ollama 的 `stop` 与 `rm`、LM Studio 的 `unload` 与模型文件管理各有不同职责。[Ollama CLI](https://docs.ollama.com/cli)、[LM Studio CLI](https://lmstudio.ai/docs/cli/local-models/ls)

## 3. 按产物分类，而不是按扩展名分类

| 语义类别 | 典型内容 | 默认处理 |
|---|---|---|
| 可重取下载缓存 | 包管理器下载归档、HTTP cache | 已识别且满足使用条件时列入回收候选 |
| 可重建计算缓存 | 编译缓存、测试缓存、部分构建中间结果 | 说明重建成本，避开活跃任务 |
| 安装依赖与开发环境 | node_modules、venv、conda env、托管 Python | 列为“环境管理”，不能混入普通缓存 |
| 公共模型与数据副本 | HF revision、GGUF、下载的数据集 | 用户选择；核对来源、版本、权限和离线需求 |
| 独有模型与实验资产 | 微调权重、LoRA、checkpoint、评估集、实验指标 | 默认保护，可做归档建议 |
| 历史与应用状态 | Agent 对话、记忆、回滚点、IDE 历史、数据库 | 默认保护，应用内管理优先 |
| 临时与诊断数据 | 已结束任务的临时文件、过期调试日志、崩溃转储 | 识别归属和任务状态后按保留策略处理 |
| 凭证、配置及未知文件 | token、auth、.env、工作流、无法识别对象 | 保护，不进入一键清理 |

日志也不天然低风险：实验 event 文件可能是唯一指标，离线 run 可能尚未上传；临时目录里的附件也可能被历史会话引用。必须继续判定用途。

## 4. 关键工具的精准扫描与清理策略

### 4.1 Python、Node 与浏览器工具链

| 工具 | 定位和识别 | 可回收对象与官方机制 | 必须保护或升级风险的情况 |
|---|---|---|---|
| pip | 对可信解释器使用 `python -m pip cache dir/info`，去重共享缓存根 | `pip cache remove` 管 wheel；`purge` 清 wheel 和 HTTP cache | 离线工作、昂贵的本地编译 wheel；cache 内部布局不是稳定接口。[官方缓存文档](https://pip.pypa.io/en/stable/topics/caching/) |
| uv | `uv cache dir`，解析 `UV_CACHE_DIR` 和配置 | 适配版本后使用 `uv cache prune/clean` | 官方明确禁止直接修改 cache；prune 还可能移除集中式项目环境。原生命令管理锁，不能强行忽略。[uv cache](https://docs.astral.sh/uv/concepts/cache/) |
| conda | `conda info --json` 与环境清单，解析 pkgs_dirs/envs_dirs | 优先下载归档、索引和日志；支持 `clean --dry-run --json` 预览 | 当前文档提示：未列入 `conda info --envs` 的环境不受 symlink 检查覆盖；`--force-pkgs-dirs` 可破坏链接环境，不能默认启用。[conda clean](https://docs.conda.io/projects/conda/en/stable/commands/clean.html) |
| venv | `pyvenv.cfg` + 项目清单 + 解释器路径 + 进程 | 仅对用户确认停用且可重建的环境提供删除 | 锁文件不保证私有依赖可获取，也不保证环境中没有用户自写文件。[Python venv](https://docs.python.org/3/library/venv.html) |
| npm | `npm config get cache`，区分全局缓存与项目依赖 | `npm cache verify` 校验并回收无用条目；全清要单独说明影响 | `verify` 会修改缓存，不能在“只读扫描”阶段运行；清空后安装需重新准备。[npm cache](https://docs.npmjs.com/cli/v11/commands/npm-cache/) |
| pnpm | `pnpm store path` + 版本 + workspace 配置 | 通过 `pnpm store prune` 管理未引用内容 | store、项目依赖可能有 hardlink/symlink 与共享关系；不用文件年龄手工清内部数据。[pnpm store](https://pnpm.io/cli/store) |
| Yarn | 分开适配 Yarn major，读取 cacheFolder/globalFolder 等配置 | 使用对应版本的 cache 管理动作 | `.yarn/cache` 可能已提交 Git，属于 Zero-Installs 资产。[Yarn 缓存策略](https://yarnpkg.com/features/caching) |
| node_modules | package.json + 锁文件 + workspace/link 关系 + 项目归属 | 作为“闲置项目可重建依赖”逐项目展示 | 手工修改、私有包、原生编译、软链接；不能仅凭目录名全盘删除 |
| Playwright | 当前受支持 CLI 的 `install --list` + `PLAYWRIGHT_BROWSERS_PATH` | 官方维护浏览器 client 关系并回收旧版本 | `uninstall --all` 会影响其他安装；清理器不应为了列清单用 npx 临时下载代码。[浏览器管理](https://playwright.dev/docs/browsers) |

`.next`、`dist`、`build`、`.pytest_cache`、`__pycache__` 只能作为发现线索。`dist` 可能是唯一交付包，Python bytecode 也可能是无源码分发的一部分。应要求相应构建配置、源文件和项目规则共同匹配，且保护版本控制中的文件与用户标记资产。

### 4.2 模型、数据集与生成工具

| 工具 | 扫描单位 | 推荐动作 | 核心边界 |
|---|---|---|---|
| HF Hub / Transformers / Diffusers | 实际 cache 根、repo、revision、refs、blob 引用 | 受支持版本下原生列举、按对象 dry-run，再选择回收 | revision 之间及新布局的仓库之间可能共享 blob；不能把目录大小直接相加。[缓存结构](https://huggingface.co/docs/huggingface_hub/guides/manage-cache) |
| ModelScope / 魔搭 | 检测 SDK/Hub 版本、MODELSCOPE_CACHE、下载调用的 cache_dir 和模型元数据 | 首版盘点模型、版本与下载残留，尚未验证稳定清理契约的布局只读 | 模型同样可能是运行依赖或唯一副本，不能套用 HF 的内部删除规则。[官方配置源码](https://github.com/modelscope/modelscope_hub/blob/main/src/modelscope_hub/constants.py)、[官方 CLI 文档](https://github.com/modelscope/modelscope/blob/master/docs/source/command.md) |
| HF Datasets | 原始 Hub 数据与 Arrow/fingerprint 转换缓存分开 | 展示转换关系与重算条件，复杂清理先由用户管理 | `cleanup_cache_files()` 要求确保其他进程未使用相应缓存；当前对象不用不代表其他任务不用。[Datasets 缓存](https://huggingface.co/docs/datasets/en/cache)、[API](https://huggingface.co/docs/datasets/en/package_reference/main_classes#datasets.Dataset.cleanup_cache_files) |
| PyTorch | 区分 Hub 权重、Inductor/Triton 编译 cache、自训产物 | 编译 cache 在任务停止后可列为条件回收项 | 权重不能按 `.pt/.pth` 删除；编译 cache 的重建会增加冷启动成本。[torch.hub](https://docs.pytorch.org/docs/stable/hub.html)、[编译缓存](https://docs.pytorch.org/tutorials/recipes/torch_compile_caching_configuration_tutorial.html) |
| Ollama | `ollama ls/ps` + OLLAMA_MODELS + manifest | 对用户选择的具体模型调用 `ollama rm` | 自定义模型可能没有备份；不手删内部 blob。[FAQ](https://docs.ollama.com/faq#where-are-models-stored)、[CLI](https://docs.ollama.com/cli) |
| LM Studio | `lms ls --json --detailed` + 实际模型目录 | 模型 inventory、来源与引用展示；应用内模型管理优先 | 导入可使用 copy、hardlink 或 symlink；多路径不代表多份实际占用。[列举](https://lmstudio.ai/docs/cli/local-models/ls)、[导入机制](https://lmstudio.ai/docs/cli/local-models/import) |
| ComfyUI | 启动参数、base、extra_model_paths.yaml、工作流引用 | 已完成任务的临时预览可列候选 | models/input/output/user 分别可能保存模型、素材、作品和工作流，默认保护。[官方路径源码](https://github.com/Comfy-Org/ComfyUI/blob/master/folder_paths.py)、[启动参数处理](https://github.com/Comfy-Org/ComfyUI/blob/master/main.py) |

HF 的 detached revision 仅表示没有 branch/tag 引用，并不证明某个项目没有按 commit 固定使用。当前 `hf cache prune` 的能力与旧教程已有差异，包含中断下载残留及无人引用共享 blob 的处理；具体动作必须以本机版本和帮助信息为准。[HF CLI](https://huggingface.co/docs/huggingface_hub/guides/cli)

不要清空 HF_HOME：它也可存放认证 token；应限定到已识别缓存子树。[HF 环境变量](https://huggingface.co/docs/huggingface_hub/en/package_reference/environment_variables)

模型去重先做“已验证相同内容”的候选提示。量化位宽、架构、分片、格式、revision 不同的模型不能因名称相似合并；即使内容相同，也要检查工具是否要求固定路径及是否已共享物理数据。首版不自动改写模型存储结构。

### 4.3 AI 编程工具：历史数据与缓存混存

| 工具 | 已确认机制 | 首版建议 |
|---|---|---|
| Claude Code | `.claude` 及可配置根包含 transcript、memory、任务、debug、恢复快照等。当前 `claude purge PATH --dry-run` 可预览，但 purge 会包含自动记忆和历史恢复能力 | 只清已验证可重取缓存与符合保留策略的诊断日志；会话、记忆和 file-history 独立管理。不能把 purge 包装为普通清缓存。[官方目录职责](https://code.claude.com/docs/en/claude-directory) |
| Codex | CODEX_HOME 默认 `.codex`，官方配置支持历史大小上限；运行状态、配置、认证及 SQLite 状态需区分 | 保护配置、认证、skills、rules、会话及运行状态。不能用 history.max_bytes 推导全部会话都已被限额；没有已验证清理接口的目录先只读。[官方高级配置](https://developers.openai.com/codex/config-advanced)、[配置参考](https://developers.openai.com/codex/config-reference) |
| Cursor / VS Code 扩展 | 用户数据可能包括会话、工作区状态、扩展数据库、未保存文件、历史。目录可被参数与便携模式改变 | 不整目录清 User、globalStorage、workspaceStorage、History、Backups；内部数据库缺少稳定契约时只显示占用并引导应用内管理。[Cursor 官方排障](https://docs.cursor.com/en/troubleshooting/troubleshooting-guide)、[VS Code CLI](https://code.visualstudio.com/docs/configure/command-line) |
| Cline | checkpoint 为任务保留恢复能力，大仓库可产生明显存储开销 | 归为恢复资产，需用户决定任务是否归档。[官方 checkpoint 文档](https://github.com/cline/cline/blob/main/docs/core-workflows/checkpoints.mdx) |
| Aider | 默认 chat/input history 文件及可配置路径有官方定义 | 对话历史保护；另行验证可重建索引，不按 `.aider*` 批量删除。[官方选项](https://aider.chat/docs/config/options.html) |

Agent 创建的 Git worktree 要通过 Git 清单关联主仓库、分支和工作区。检查未提交、未跟踪、忽略文件、未推送提交、任务占用和锁定状态；用户选择移除时走 Git 原生命令并保留其保护行为。`git worktree prune` 主要清理已消失 worktree 的管理信息，不能宣传为删除所有闲置工作目录。[Git worktree](https://git-scm.com/docs/git-worktree)

### 4.4 Docker、虚拟磁盘与数据库

Docker 扫描必须先确认当前 context/daemon 是否为用户选择的本机实例。Buildx builder 可另行选择节点，因此执行清理前还须核对所选 builder 的 driver、全部 node endpoint 和实际目标；远端或无法确认的节点在本产品的本机清理流程中保持只读。使用 Docker 对象清单、inspect、builder inventory 和 `docker system df -v`，不要解析虚拟磁盘内的底层文件当普通目录。[Buildx inspect](https://docs.docker.com/reference/cli/docker/buildx/inspect/)

| 对象 | 判断与建议 |
|---|---|
| BuildKit 缓存 | 按 builder 显示使用情况和可重建成本；通过适配版本的 builder/buildx prune 管理。其清理也会影响后续构建速度。[Buildx prune](https://docs.docker.com/reference/cli/docker/buildx/prune/) |
| 镜像 | 检查标签、容器引用、共享层和是否仅本地存在；dangling 仍可能是有价值的本地构建结果 |
| 停止的容器 | 可能包含唯一的可写层、notebook 或结果文件，默认不选。system prune 会包含停止容器，不能做“安全清缓存”快捷按钮。[system prune](https://docs.docker.com/reference/cli/docker/system/prune/) |
| Volume | 没有容器引用只是一种引用状态；可能保存数据库、向量库和模型，默认保护。逐卷明确归属与备份后再由用户决定。[volume prune](https://docs.docker.com/reference/cli/docker/volume/prune/) |
| Windows VHDX / WSL | 整个 Linux 文件系统资产；先在内部用相应工具清理，再视 backend 做独立的空间回收维护；不删除 VHDX 或 unregister 发行版。[WSL 磁盘管理](https://learn.microsoft.com/en-us/windows/wsl/disk-space) |
| macOS Docker.raw | Docker VM 磁盘文件；逻辑上限和实际占用不同，通过 Docker 设置识别实际位置，不直接在 Finder 移动或删除。降低磁盘上限也可能触发数据重建，不能作为普通压缩按钮。[Docker Mac FAQ](https://docs.docker.com/desktop/troubleshoot-and-support/faqs/macfaqs/) |

镜像层的共享空间不能重复计入释放量；VM 内清出空间和宿主盘可用空间增加需要分别报告。[Docker system df](https://docs.docker.com/reference/cli/docker/system/df/)

MLflow artifacts 会保存模型和实验结果，其 `gc` 可永久删除 metadata 与 artifacts，且当前文档明确其不会检查 pin、registered model 等保护意图。不能只见 deleted 状态就自动执行 GC。[MLflow CLI](https://mlflow.org/docs/latest/api_reference/cli.html)

Chroma PersistentClient 的目录保存持久数据；向量库只有在源材料、切分方法、embedding 模型版本、必要元数据和重建流程均可用时，才可能被视为“有成本可重建”。产品默认仍按数据库保护。[Chroma Client](https://docs.trychroma.com/reference/python/client)

Open WebUI 等本地 AI 应用会同时保存数据库、上传附件和向量数据。只备份数据库不等于备份了相关文件，清理器应把关联数据看作一个资产集合。[Open WebUI 数据库迁移](https://docs.openwebui.com/tutorials/maintenance/database/)

W&B 的本地 run 也不能统一当日志：离线或未完整同步的记录需要后续 sync。先确认上传与资产完整性，再讨论本地副本保留策略；目录名含 wandb 不是可删依据。[W&B 官方 CLI 源码](https://github.com/wandb/wandb/blob/main/wandb/cli/cli.py)

MCP 是连接方式，不能视作一种统一缓存格式。扫描应落实到实际 server/子进程和它使用的包缓存、浏览器 profile、下载目录、数据库与凭证；归属不明确的 server 数据默认保护。用户未主动连接的服务不为扫描而自动启动。

## 5. Windows、macOS 的发现策略

默认路径只用于候选发现。优先级应由各工具自己的配置解析规则决定，通常需要综合运行参数、配置、环境变量、CLI 报告路径及默认值。清理助手的进程环境不能代表 IDE、后台服务或 WSL 中工具的真实环境。

| 对象 | Windows 常见线索 | macOS 常见线索 | 可靠定位方式 |
|---|---|---|---|
| pip | `%LOCALAPPDATA%\pip\Cache` | `~/Library/Caches/pip` | 每个可信安装的 cache dir，按解析后根目录去重 |
| uv | `%LOCALAPPDATA%\uv\cache` | Unix/XDG 配置下常见 `~/.cache/uv`，可重定向 | uv cache dir；以实际版本配置为准 |
| HF Hub | 用户目录下 `.cache/huggingface/hub` | `~/.cache/huggingface/hub` | HF_HOME/HF_HUB_CACHE、调用级 cache_dir 及实际结构 |
| Ollama | `%USERPROFILE%\.ollama\models` | `~/.ollama/models` | OLLAMA_MODELS、服务环境和模型清单 |
| Claude Code / Codex | 用户目录下 `.claude` / `.codex` | `~/.claude` / `~/.codex` | 自定义根、配置与应用运行方式 |
| VS Code / Cursor | Roaming/Local、便携版目录 | `~/Library/Application Support/<产品>` | 产品身份、启动参数、portable data 与版本适配 |
| Playwright | `%LOCALAPPDATA%\ms-playwright` | `~/Library/Caches/ms-playwright` | 安装清单与 PLAYWRIGHT_BROWSERS_PATH |
| Docker | WSL/Hyper-V backend、可迁移 VHDX | 可迁移 Docker.raw 等 VM 文件 | Docker 配置、已选本地 context 与 backend |

目录依据见各工具上文文档、[uv storage](https://docs.astral.sh/uv/reference/storage/)、[Playwright](https://playwright.dev/docs/browsers)、[Docker 设置](https://docs.docker.com/desktop/settings-and-maintenance/settings/)。安装目录变化、多个用户、多安装及远程环境都可能改变结果。

Windows 还需处理 NTFS hardlink、junction/reparse point、长路径和文件占用；macOS 需处理应用权限、大小写敏感卷、APFS clone、共享空间与快照。APFS 的多个 volume 可共享容器空闲空间，因此不应把每卷显示的 available 简单累加。[Microsoft 链接机制](https://learn.microsoft.com/en-us/windows/win32/fileio/hard-links-and-junctions)、[Apple APFS](https://support.apple.com/guide/disk-utility/file-system-formats-dsku19ed921c/mac)

macOS 的 Homebrew 缓存可作为平台增强模块，优先 `brew cleanup --dry-run` 展示原生计划；Xcode Archives、模拟器和设备支持数据需要专门生命周期适配，首版不按目录通配删除。[Homebrew](https://docs.brew.sh/Manpage)

## 6. 分级：五个维度分别记录

| 维度 | 推荐取值 | 用途 |
|---|---|---|
| 数据用途 | 下载缓存 / 计算缓存 / 环境 / 模型 / 实验 / 历史状态 / 临时诊断 / 未知 | 告诉用户“这是什么” |
| 删除风险 | 低 / 中 / 高 / 保护 | 决定是否可推荐与如何确认 |
| 可恢复性 | 本地重建 / 可重下载 / 条件性或昂贵恢复 / 不可确认 | 解释代价和恢复前提 |
| 活跃状态 | 正在使用 / 近期有使用证据 / 长期未观察到使用 / 未知 | 影响候选顺序，不单独决定安全 |
| 识别置信度 | 原生工具确认 / 结构与元数据匹配 / 仅路径推测 / 未知 | 说明规则能证明到哪一步 |

面向用户的操作等级建议如下，属于产品策略，并非工具官方评级：

| 等级 | 条件与示例 | 默认行为 |
|---|---|---|
| A 可推荐回收 | 归属明确、支持的工具版本、可恢复条件明确、无活跃使用证据；例如过期诊断日志、合适的包缓存 | 首版仍由用户查看计划后执行；自动化需另行选择策略 |
| B 需选择 | 恢复要下载、编译或重建环境；例如闲置项目依赖、明确选中的公共模型旧版本 | 不默认勾选；展示受影响项目及成本 |
| C 需资产管理 | 对话、恢复点、实验记录、模型成果、停止容器的可写层 | 默认保护；提供打开、导出、备份、归档或应用内管理 |
| P 保护/未知 | 凭证、源码、工作流、数据库、活跃对象、未适配格式、归属不明对象 | 不进入批量清理 |

“30/90 天未使用”只能作为可配置的候选排序条件。文件 mtime 不代表最近使用时间；Windows LastAccessTime 还可禁用或延迟更新。推荐使用工具元数据、受支持的访问记录、项目清单、进程、锁和用户固定状态组合判断。没有观察到使用不等于确认不会再使用。[Microsoft fsutil behavior](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/fsutil-behavior)

重要否决条件优先于收益评分：存在唯一数据、未知引用、运行任务、恢复前提不足时，大体积和长期闲置都不能把它降成低风险。模型、配置、文件名等相同也不能作为价值或重复判定。

## 7. 精准扫描引擎的建议结构

```mermaid
flowchart LR
    A[发现工具与实际配置] --> B[按版本识别对象]
    B --> C[关联项目和共享引用]
    C --> D[检查活跃与恢复条件]
    D --> E[生成具体清理计划]
    E --> F[用户选择]
    F --> G[执行前重新验证]
    G --> H[适配器执行并核验]
    H --> I[审计与恢复记录]
```

每种工具一个适配器，至少实现：身份与版本发现、配置路径解析、对象清单、已知引用分析、使用状态、容量估算、计划生成、受限执行、结果核验、恢复说明。

建议扫描分三层：

1. **快速盘点**：查已安装工具、已配置路径、用户选择的项目根；统计目录元数据和工具报告的空间，不读取所有文件内容。
2. **语义分析**：识别锁文件、模型 manifest/revision、环境信息、Docker labels 与引用图；同一根目录只扫一次。`.gitignore` 是线索，不能证明内容可删。
3. **可选深度分析**：在用户选择的范围计算重复文件哈希、查孤儿关系和增长趋势。扫描结果明确标“仅覆盖已扫描项目”，无法对动态加载和未扫描项目宣称全局无引用。

候选对象建议记录：

```text
对象ID、工具/版本、规则版本、配置来源、实际路径/资源ID、项目归属
语义类别、识别依据、已知引用、扫描覆盖边界、活跃状态
逻辑大小、去重后分配空间、预计释放区间、容量估算置信度
风险等级、重建条件、网络/权限依赖、清理动作、恢复能力
扫描时间、执行前校验信息、用户固定/排除状态
```

优先记录能够解释的证据，不制造未经校准的“99% 安全”概率。默认只读元数据和必要配置字段，敏感 token 字段不进入日志；不对未知 `.pt/.pkl` 使用会执行反序列化代码的方式识别。

## 8. 安全清理的执行约束

**扫描器与执行器分离。** 扫描器生成待处理对象和理由；执行器只接受具体且仍有效的计划，不接受 AI 输出的任意 shell 字符串或任意路径。

执行顺序：

1. 生成预览：具体对象、作用范围、预估收益、受影响项目、恢复方法与不可撤销部分。
2. 执行前重新核对工具版本、文件/对象身份、路径边界、引用和锁。对象发生变化就跳过或重新预览。
3. 优先调用已验证的工具原生清理机制；官方命令仍要逐选项评估，例如不能统一使用 broad prune、all、force。
4. 普通临时文件可进入回收站/隔离区；受管理共享缓存不强行套用目录移动，以免破坏内部引用。
5. 核对退出状态、逐项结果、剩余对象和磁盘空间；区分完成、跳过、部分成功和失败，不隐藏错误。
6. 留下本地审计与恢复记录。恢复遇到同名新文件不得覆盖；重新下载与原样回滚分别标注。

原生命令可能是按状态/过滤条件实时选择对象，且未必支持冻结对象列表或 dry-run。这类动作不能伪装成“只删除刚才勾选的文件”：需要工具锁或静止条件、明确范围及变化复核；做不到就保持只读或引导用户在工具内处理。

文件系统防护建议：

- 普通用户权限为默认；不自动提权、夺取权限、杀进程或移除锁来完成清理。
- 不默认跨 symlink、junction、reparse point、挂载点递归；链接例外由工具适配器明确管理。
- 不只做字符串路径前缀比较；Windows 可结合最终路径与文件身份，减少路径替换造成的检查与使用竞争。[最终路径 API](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getfinalpathnamebyhandlew)
- 执行可信工具的已验证绝对路径，使用结构化参数；不运行项目脚本、安装钩子，或为了扫描自动下载 CLI。Python/Node 的启动与插件加载也需纳入可信运行策略。
- 不单独删除 SQLite 的 WAL/SHM；应用状态清理必须考虑数据库一致性。
- LLM 适合解释用途、整理报告和帮助用户检索；文件是否可删由可审计规则、工具接口及用户选择决定。项目文本和工具元数据按不可信输入处理。

## 9. 不能混淆的四种容量

| 数值 | 含义 |
|---|---|
| 逻辑大小 | 所有文件内容长度，可能多处指向同一数据 |
| 实际占用 | 去重后的分配空间；clone、压缩、快照等仍可造成测量限制 |
| 预计可释放 | 考虑共享引用、链接、回收策略后，计划可能释放的保守量或区间 |
| 实测变化 | 操作前后宿主盘可用空间差，可能受其他任务并发写入影响 |

硬链接按卷与文件身份去重，只有最后的相关引用被释放才可能回收数据；APFS clone 不能仅靠相同 inode 发现共享块。无法精确判断独占块时标上限、区间或未知，不用伪精确数。Windows 的文件标准信息可取得 allocation 和 link count 等信息。[FILE_STANDARD_INFO](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/ns-fileapi-file_standard_info)

同盘隔离或移入回收站仍占磁盘，只有最终回收后才能计入释放量；打开句柄也可能延迟真正回收。[DeleteFileW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-deletefilew)

VM 是父容器：不能把“Docker VM 占用”和“其内部缓存”相加。应展示内部清出了多少、宿主盘实际增加多少、是否仍待 backend 回收。APFS 快照等也会影响存储归属；首版可以解释并展示，不自动删除系统快照。[Apple 快照](https://support.apple.com/guide/disk-utility/view-apfs-snapshots-dskuf82354dc/mac)

保护模式与直接清理模式应明确分开：前者可提供恢复窗口但空间可能尚未归还；后者不保留恢复窗口，对原生 GC 等不可逆动作必须如实说明。两种模式是否以及何时增加宿主盘可用空间都以实际回收情况为准。不能统一承诺“全部可撤销”或“立即释放”。

## 10. 双平台首版范围

两端共享分类、分级、适配器协议与规则版本；路径发现、权限、文件身份、回收站、变化监听、容量统计和 VM 接口由各平台实现。不能只替换路径后就宣称跨平台支持。

| 模块 | Windows 首版 | macOS 首版 | 首版动作边界 |
|---|---|---|---|
| pip/uv/npm/pnpm 缓存 | 支持 | 支持 | 原生清理计划、风险解释、受支持动作 |
| Conda | 支持 | 支持 | 优先归档/索引/日志；环境与复杂链接先盘点 |
| HF Hub | 支持 | 支持 | repo/revision 与共享空间；适配版本后用户选择 |
| Ollama/LM Studio | 支持 | 支持 | 模型盘点、来源与引用提示、明确选择后管理 |
| Claude Code/Codex/Cursor | 支持 | 支持 | 缓存与历史分开；未知 schema、记忆和恢复点保护 |
| Docker Desktop | 支持 | 支持 | 本机对象与 builder cache；卷和 VM 文件保护 |
| 项目环境与构建产物 | 支持 | 支持 | 用户选择项目，展示归属和重建条件；少量充分验证规则开放清理 |
| 平台特有增强 | WSL 只读容量视图 | Homebrew 预览、APFS 容量解释 | 不自动压缩/注销 WSL，不自动清系统快照或 Xcode 资产 |
| 通用能力 | 支持 | 支持 | dry-run/作用范围预览、保护清单、脱敏报告、审计、恢复能力说明 |

首版交互建议用五个入口：空间总览、可推荐回收、项目与环境、模型与历史资产、恢复与记录。每项清理建议必须能展开查看“来源、理由、影响、成本、恢复和空间估算”。

展示示例（虚构数据，仅说明交互）：

> Hugging Face 的一个旧 revision：逻辑大小 12 GB，与另一个 revision 共用 9 GB；预计最多释放 3 GB。已扫描项目中未发现引用，仍可能被未扫描项目使用。清理后重新使用需要下载，离线期间不可恢复。默认未勾选。

首版不建议纳入全盘自动删除、自动去重改写模型、容器卷批量清理、训练 checkpoint 自动择优删除、AI 会话数据库直接改写或虚拟盘离线维护。它们需要更完整的上下文、备份和兼容性验证。

## 11. 上线前验证与待解决问题

应先验证技术安全，再验证真实收益。建议采集经用户同意且脱敏的双平台样本，覆盖三类用户：AI 编程为主、AI 应用开发、本地模型/训练。不要提前假定每人都有几十或几百 GB 垃圾。

需要验证的指标：

- 识别正确性：人工标注对象的工具归属、类别、风险与活跃情况，特别检查低风险建议中的错误项。
- 实际价值：被用户接受的候选空间、真正释放量、恢复下载/重建时间、清理后下一次开发是否受阻。
- 性能与覆盖：首次和增量扫描耗时、磁盘 IO、受权限限制比例、未支持工具版本、未覆盖目录。
- 恢复能力：普通文件还原、同名冲突、应用已重新生成缓存、部分执行失败与中途退出。
- 用户信任：是否看懂解释、哪些操作愿意交给自动化、是否愿意为项目归属和恢复能力付费。

必要兼容性场景包括：多版本 Python/包管理器、自定义路径、离线/私有源、共享缓存、运行中的下载/训练、同盘 hardlink、APFS clone、junction 替换、未挂载外盘、远程 Docker context、未推送 worktree、未登记 conda 环境、损坏 metadata 和超长/非 ASCII 文件名。

发布门槛建议：受保护资产用例不得被列入默认清理；任何对象无法确认归属或执行范围都安全跳过；空间不重复计数；无法恢复的动作清楚标注；Windows 与 macOS 分别具备真实环境验证结果。文档调研不能替代这些验收。

用户访谈优先问最近一次真实磁盘不足事件、当时最大的目录、是否曾误删环境/对话/模型、恢复耗时、现有清理方法，以及哪些数据宁可占空间也不愿冒险删除。基于实测结果再确定付费功能和规则优先级。

## 完成记录

- 结果：完成面向 Windows/macOS 的工具地图、产物分类、风险分级、精准扫描、安全执行、容量统计与首版范围调研。
- 交付文件：`docs/ai-developer-cleaner-research-2026-10-17.zh-CN.md`。
- 验证：核对官方文档与官方源码；未执行清理、未实现扫描器、未做跨平台兼容性或容量实测。
- 决策：未知项保护；模型、历史与独有成果分开管理；原生命令按版本及选项适配；磁盘收益按实际回收能力说明。
- 后续：目标用户访谈与授权样本盘点，形成规则清单和交互原型，再实现只读扫描及少量已验证执行器。
