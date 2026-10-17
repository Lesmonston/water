# WATER-W1-B 官方来源事实核对

核对日期：2026-10-17。方式：本执行会话使用 Web 工具逐一实际打开下列 17 个官方 HTTPS 页面，并阅读相关段落；全部返回页面正文，未以搜索摘要代替打开。以下为简明转述，未复制整套规则、目录表或文案。来源按各 entry 内 ID 对应，Windows/macOS 分别写入数据；未运行任何工具，`runtime_verified` 始终为 false。

在线文档是核对日快照，可继续变化，并非固定发布承诺。pip 页面显示 26.2.1；npm 使用 v11 页面（cache 页显示 11.21.0）；pnpm 当前文档涉及 v11/v12，均没有由此推定支持版本上界。uv/HF/Ollama 的内部布局同样需后续按实际版本复核。

| 工具 / source ID | 实际打开的官方页面与段落 | 核对的事实 / 对应数据 |
|---|---|---|
| pip / caching | [Caching](https://pip.pypa.io/en/stable/topics/caching/)，Where is the cache stored、What is cached | HTTP 与 wheel 缓存；内部结构随版本变化；cache dir 自 20.1 提供；Windows/macOS 默认位置；macOS 自 26.2 支持 XDG_CACHE_HOME。对应 root_candidates、缓存资产和版本说明。 |
| pip / configuration | [Configuration](https://pip.pypa.io/en/stable/topics/configuration/)，Configuration Files、Precedence | 全局/用户/环境及 PIP_CONFIG_FILE；命令行覆盖环境、环境覆盖配置。对应配置候选、保护配置及 notes。 |
| pip / options | [pip options](https://pip.pypa.io/en/stable/cli/pip/)，cache-dir | cache-dir 和 PIP_CACHE_DIR 可改变缓存位置。对应 environment/configuration 候选。 |
| uv / cache | [Caching](https://docs.astral.sh/uv/concepts/cache/)，Cache safety、Clearing the cache、Cache versioning | 不可直接修改缓存；桶带版本，存在锁和共享使用；prune 还涉及集中项目环境。对应保护范围、cache/environment 资产和版本 notes。 |
| uv / storage | [Storage](https://docs.astral.sh/uv/reference/storage/)，Storage directories、Types of data | Windows/macOS 缓存默认线索不同；缓存、持久数据、配置、Python 和环境职责分开。对应平台 roots 及环境保护。 |
| uv / settings | [Settings](https://docs.astral.sh/uv/reference/settings/)，cache-dir | uv.toml 可设缓存位置；默认按平台/XDG 推导。对应配置标记。 |
| uv / environment | [Environment variables](https://docs.astral.sh/uv/reference/environment/)，UV_CACHE_DIR | 自 0.0.5 记录该变量，作用为改变默认缓存目录。对应环境候选；不是兼容版本上界。 |
| uv / configuration | [Configuration files](https://docs.astral.sh/uv/concepts/configuration-files/)，配置合并及优先级 | 项目/用户/系统配置合并；命令行覆盖环境，环境覆盖持久配置。对应 notes。 |
| npm / cache | [npm-cache v11](https://docs.npmjs.com/cli/v11/commands/npm-cache/)，Description、Details、Configuration | 缓存默认位置、不透明内容寻址存储；verify 包含垃圾回收；缓存不保证持久可靠。对应平台 roots、cache 资产、保护及 notes。 |
| npm / config | [Config v11](https://docs.npmjs.com/cli/v11/using-npm/config/)，Description、Environment Variables、npmrc Files、auth | 命令行/环境/npmrc/默认配置优先级；变量不区分大小写；npmrc 涉及认证。对应配置/环境候选、凭证保护。 |
| pnpm / store | [pnpm store](https://pnpm.io/cli/store)，path、prune | 活动 store 查询；包供多个项目使用，分支切换可能再次需要旧内容；当前文档有版本化项目注册和共享虚拟 store。对应 native_query、共享 notes 及保护。 |
| pnpm / store_settings | [Store settings](https://pnpm.io/settings/store)，storeDir | 默认参考 PNPM_HOME、XDG_DATA_HOME 和平台目录；store 受磁盘/硬链接条件影响，跨盘会复制。对应平台候选及共享容量边界。 |
| pnpm / settings | [Settings](https://pnpm.io/settings)，配置来源 | 当前文档区分普通配置与 npmrc 的认证/registry 项；旧版本需另适配。对应配置候选和保护说明。 |
| huggingface / cache | [Understand caching](https://huggingface.co/docs/huggingface_hub/guides/manage-cache)，File-based caching、Snapshots、Shared blobs across repos、Limitations | cache_dir 可改调用位置；revision 共享 blob，新布局可跨仓共享；Windows 链接能力影响布局；下游资产与 Xet 有独立用途。对应根、模型/未知资产及保护。 |
| huggingface / environment | [Environment variables](https://huggingface.co/docs/huggingface_hub/en/package_reference/environment_variables)，HF_HOME、HF_HUB_CACHE、HF_TOKEN_PATH、XDG_CACHE_HOME | HF_HOME 可混存 token 和缓存；Hub/assets/Xet 可另设；HF_HOME 未设时才采用 XDG 派生默认。对应 mixed_state、环境/default_hint 与凭证保护。 |
| ollama / faq | [FAQ](https://docs.ollama.com/faq)，Where are models stored、How do I configure Ollama server | Windows/macOS 默认模型位置；OLLAMA_MODELS 重定向；应用/服务继承环境的方式不同。对应两平台候选与进程环境 notes。 |
| ollama / modelfile | [Modelfile reference](https://docs.ollama.com/modelfile)，FROM、PARAMETER、TEMPLATE | 可基于现有模型及本地 Safetensors/GGUF 自建模型；定义包含模板与参数。对应 model/configuration 资产及保护。 |

Water 的判断：上述来源说明工具机制，不证明数据可删除、已备份、无人使用、可再下载或可回滚。独有模型/训练成果、混合状态根、环境、配置和未知对象默认保护；模型可能是唯一资产是保护性假设，并非来源声称每个本地模型都唯一。HF 无分支/tag 引用不代表外部项目无固定 commit 引用；store/blob 共享意味着不能将逻辑容量直接叠加成释放空间。

事实边界：没有静态引用竞品代码，也没有读取第三方 checkout；没有扫描 HOME、用户工具目录或整盘。离线校验只验证形状、来源链接结构与限制，不证明页面事实、工具可用性或产品集成。后续由总控独立复核来源与语义。
