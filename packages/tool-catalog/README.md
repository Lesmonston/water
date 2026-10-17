# Water 工具发现与保护事实包

数据版本：`water.catalog.v1`。核对日期：2026-10-17。冻结接口见 [SPEC](../../contracts/catalog-v1/SPEC.md)、[Schema](../../contracts/catalog-v1/entry.schema.json) 与 [来源策略](../../contracts/catalog-v1/source-policy.json)。

本包包含 pip、uv、npm、pnpm、Hugging Face Hub、Ollama 六项元数据，每项分 Windows 原生和 macOS。它交付发现候选、版本敏感说明、共享引用和保护信息。`discovery_only=true`、`can_scan=false`、`can_delete=false`、资产 `display_only`、`runtime_verified=false` 是固定限制。文档核对不会改变运行验证状态。

`root_candidates` 的顺序不构成跨工具优先级算法。默认路径及环境变量均为展示提示；本包不展开 `~` 或变量，不读取机器环境、解析目录、调用工具或建立网络连接。`key` 是元数据标记；原生查询的 `path_template=null` 显式表示未解析结果。uv 缓存桶、pnpm store 和 Hub blob 的版本差异不能通过默认路径消除。

HF_HOME 混有 token，应保护混合状态根；模型、独有数据、环境、凭证和配置不因位于缓存附近就成为可删对象。pip 内部布局非稳定接口，uv 禁止直接修改缓存，pnpm 具有共享关系，Ollama 可包含自建模型。npm verify 会修改缓存，不能用作只读查询。可重新下载或构建不等于可回滚；本包不估算释放空间。

条目中的“官方事实”由 `sources` / `source_ids` 定位；“Water 策略”表示本项目的保护判断，来源不等于官方对 Water 行为的背书。17 个官方页面的人工打开记录与简明事实对照见 [SOURCE-FACTS](../../docs/acceptance/wave1/b/SOURCE-FACTS.md)。校验通过只证明元数据满足约束，不能证明官方页面内容或本机工具行为。

## 使用校验函数

```js
import { validateCatalog } from './validate.mjs';

// index 和 entries 由调用方提供；entries 为按 tool_id 索引的普通数据字典。
const result = validateCatalog(index, entries);
// { valid: true, errors: [] } 或 { valid: false, errors: [{ code, path }] }
```

没有 CLI；模块在导入和调用时都不读取 JSON、磁盘、环境、网络或启动进程。仅测试加载包内固定 JSON，以及冻结的来源策略用于对照；测试不访问任何工具真实目录。

校验器逐层拒绝未知/缺失字段、不完整工具/平台、无效枚举/日期、非数据对象/访问器、来源悬空/重复和能力提升。来源必须是冻结的精确官方主机，使用 HTTPS、无 URL 凭证，每工具至少两条不同页面；fragment 和 query 不产生额外页面。字段错误位置采用固定字段名及数组下标，未知键和值不进入错误输出。

`path_template` 只接受 `null` 或以 `~` / 已定义变量提示开头的展示语法，不接受命令、替换、glob、URL、未定义变量或 `..` 段。当前变量集合按工具限定为条目使用的 `LOCALAPPDATA`、`PIP_CACHE_DIR`、`UV_CACHE_DIR`、`XDG_CACHE_HOME`、`npm_config_cache`/`NPM_CONFIG_CACHE`、`PNPM_HOME`、`XDG_DATA_HOME`、`HF_HOME`、`HF_HUB_CACHE`、`USERPROFILE`、`OLLAMA_MODELS`。这是元数据语法检查，不是路径授权或执行安全机制。

从本工作树根运行固定检查：

```powershell
node scripts/parallel-check.mjs --task WATER-W1-B --mode check
node scripts/parallel-check.mjs --task WATER-W1-B --mode test
```

测试精确包含五个顶层用例，覆盖六工具正向输入、来源与 lookalike 主机、保护边界、24 项命名内存变体和额外逐层字段变体、深冻结/隔离环境哨兵下的重复调用。有效负控及原字节恢复证据位于 [验收目录](../../docs/acceptance/wave1/b/)。提交后的 `--final` 检查要求同一干净实现 SHA。

当前仅在 Windows / Node 24.16.0 执行元数据单元测试。六工具均未运行，未核对任何真实路径、文件身份、占用、锁、项目引用、容量或恢复。macOS 工具行为与 Node 测试均未实测。本包未接入 Rust/Tauri/扫描器，后续接入及版本适配需要单独工单与总控验收。没有新依赖、安装、真实扫描或清理。
