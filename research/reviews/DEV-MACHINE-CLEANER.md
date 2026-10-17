# Developer Machine Cleaner 静态源码审阅

审阅日期：2026-10-17。供 Water 立项与独立实现参考，不是上游运行验收、漏洞复现或安全认证。

## 来源、版本与边界

| 项目 | 记录 |
|---|---|
| 正式上游 | https://github.com/Maks417/DevMachineCleaner |
| 本地 checkout | `research/upstream/dev-machine-cleaner` |
| 精确 commit | `77b279513e6a2271960312d9b4068a33bd84394c` |
| 包版本 | `0.5.0`，见 [Cargo.toml:1–9][package] |
| 许可证 | MIT；版权声明为 Max Davydov，2026，见 [LICENSE:1–21][license] |
| 来源核对 | 本地 `git rev-parse HEAD`；origin 是映射到上述 GitHub 仓库的 relay 地址；开始审阅时 `git status --short` 无输出 |
| 审阅入口 | Rust 扫描器、规则、状态、清理器、IPC 注册；必要的前端确认/结果路径及 CI 配置 |
| 执行边界 | 只读本地源码与相关官方文档；没有执行上游安装、构建、测试、扫描、清理、更新或发布程序，没有安装依赖，没有编辑上游 |

已阅读 Water 的 `AGENTS.md`、`README.md`、`docs/STATUS.md`，并在主控创建后补读 `docs/PROJECT-CHARTER.md`、`docs/ARCHITECTURE.md`。本任务只新增本审阅文件，不改共享 Vault，不提交。

本文区分三个证据等级：**源码确认**表示固定 commit 中存在相应路径；**静态推导**表示可由分支和数据流得出的风险或限制；**未验证**表示没有实测平台行为、依赖实现或竞态复现。源码存在测试，不表示本轮运行过测试或上游 CI 已通过。MIT 授权不替代依赖、图标等具体材料的来源审查；Water 本阶段不直接复制代码或规则。

## 总体判断

这是值得借鉴的小型 Rust/Tauri 案例：扫描产生后端候选集，清理要求匹配会话；候选根上的链接被拒绝；扫描错误、取消和逐项清理结果没有完全隐藏；规则与 UI 说明也分离。**这些是实际存在的防线，不应忽略。**

但它还不能直接作为 Water 的安全执行基础：候选生成依赖名称和固定目录，部分候选根混有配置与凭证；会话只绑定路径而非对象；末级链接检查没有覆盖父级重定向及 TOCTOU；容量是文件逻辑长度合计，成功横幅却称已释放空间。应借鉴流程与数据契约，独立实现身份、保护、引用与容量层。

## 实际调用链与能力边界

1. `lib.rs:19–25` 注册 `scan_projects`、`scan_ai_caches`、`cancel_scan`、`clean_paths`，因此并非只有未接线的库函数。[IPC 注册][entrypoints]
2. 项目扫描接受前端 `root: String`，检查存在及目录，深度限制为 1–12；之后进入 `spawn_blocking`，返回项目候选，将所有 `cleanable.path` 存入 session。[commands.rs:13–16、47–101][scan-project-command]
3. AI 扫描解析一组固定目录并计算大小；所有 `exists` 条目的路径进入 session。[commands.rs:103–132][scan-ai-command]
4. 清理命令从 session 克隆 `HashSet<PathBuf>`，再在 blocking task 中逐项清理；未知/已淘汰会话整体拒绝，合法会话内的非法项按项失败。[commands.rs:143–162][clean-command]
5. `clean_one` 调用 `std::path::absolute`，匹配完整路径，检查末级链接/reparse，最后调用 `trash::delete`；返回值只有 path、ok、error。[cleaner.rs:5–89][cleaner]

**能力边界：**这条路径是“按固定规则选出文件系统根并移至系统回收站”，不是包管理器 GC、模型 revision 管理、引用图分析、Docker/WSL 资源管理或物理空间核验。Rust 扫描/清理核心中未见原生工具对象枚举、活跃进程检查、文件身份比较、Git 跟踪保护或恢复 journal。此结论限定于所审阅核心，不等于评价所有产品版本或未来上游。

## 可借鉴的实际优点

| 已有实现 | 证据与价值 | 边界 |
|---|---|---|
| 后端会话白名单 | [commands.rs:84–91、143–162][clean-command]、[state.rs:12–77][sessions]：前端随意拼一个未入候选集的路径会被拒绝 | 候选身份与用户同意仍需另建边界 |
| 清理根链接拒绝 | [cleaner.rs:45–89][cleaner]：`symlink_metadata` 检查符号链接；Windows 还检查 `FILE_ATTRIBUTE_REPARSE_POINT` | 只检查最终路径对象；元数据错误返回 false |
| 扫描避免跟随链接 | [stacks.rs:267–277][project-walk]、[scanner/mod.rs:21–45][sizing] 的 WalkDir 配置为 `follow_links(false)`；AI/项目候选根也拒绝链接 | 不能据此声称所有祖先、挂载边界或删除竞态都已处理 |
| 工作与 UI 线程分离 | [commands.rs:68–82、113–115、159–161][clean-command] 使用 blocking task；[stacks.rs:318–392][project-sizing]、[ai_caches.rs:331–390][ai-enumeration] 用 Rayon 按候选并行测量 | 大目录内部计量尚不可中途取消 |
| 候选带类别和重建说明 | [stacks.rs:21–29][project-types]、[ai_caches.rs:11–22][ai-types]；表驱动的 TOML 编译进二进制 | category 不等于 risk；重建说明不是恢复证明 |
| 错误/部分结果可见 | [stacks.rs:42–50][project-types]、[ai_caches.rs:25–29][ai-types] 返回 scan_errors/cancelled；[cleaner.rs:19–20、56–66][cleaner] 保留逐项结果 | 仍有部分错误被 `exists()`、`filter_map` 或链接跳过隐藏 |
| 正常 UI 有确认且默认不选 | [useCleanPanel.ts:64–69、82–106][ui-scan] 初始/重扫清空选择；[ConfirmCleanDialog.tsx:128–183][dialog] 展示数量、分类、路径与回收站提示 | “Select all” 不按风险限制；确认本身在 WebView 中 |
| 前端处理过时扫描结果 | [useCleanPanel.ts:67–113][ui-scan] 使用递增序号丢弃旧结果 | 只是显示状态防线，不撤销后端保留的 session |
| CSP 与较小插件面 | [tauri.conf.json:22–32][tauri-config] 限制脚本/连接源并配置更新公钥；[capabilities/default.json:6–10][capabilities] 未暴露通用 shell/fs 插件 | 当前还有 updater/process 权限，不能照搬 SECURITY.md 的“只有 core/dialog”描述 |

## 安全与准确性限制

### F1：混合数据根被整体授权，保护声明不足以覆盖真实规则

**源码确认：**`huggingface_paths` 返回整个 `~/.cache/huggingface`；`tensorflow_paths` 返回整个 `~/.keras`；Ollama、LM Studio、Jan 等也以模型根为一个候选。随后 `scan_ai_caches` 将存在的整根路径直接授权给通用 trash 清理器，没有按目录内部对象区分配置、token、下载缓存、用户导入模型或独有成果。[ai_caches.rs:60–120][model-roots]、[commands.rs:117–123][scan-ai-command]

这不只是“未来可能有人乱放文件”的假设：

- Hugging Face 官方规定，默认 `HF_HOME=~/.cache/huggingface`，其内同时保存 token 和 cache，默认 token 路径为 `$HF_HOME/token`。所以删除上游候选整根会覆盖这一官方凭证位置；本轮没有读取或删除任何真实 token。[HF 环境变量文档](https://huggingface.co/docs/huggingface_hub/en/package_reference/environment_variables)
- Keras 官方规定，`~/.keras/keras.json` 保存用户配置，datasets/models 另在子目录。整根 `.keras` 不能等同于纯模型下载缓存。[Keras FAQ](https://keras.io/getting_started/faq/)
- 项目规则将 Ruby `.bundle` 归为 cache；自己的测试 fixture 还放入了 `.bundle/config`，却只断言识别到 Ruby，并不验证该配置受保护。[project_rules.toml:282–295][ruby-rules]、[stacks.rs:649–686][project-tests-extra]
- `.terraform` 整根也归为 cache。HashiCorp 明确说明其中保留 backend 配置，并可能含认证参数；Water 不能无条件按纯缓存处理。[project_rules.toml:307–315][terraform-rule]、[Terraform backend 文档](https://developer.hashicorp.com/terraform/language/backend)

**静态结论：**README/SECURITY 中“仅 volatile caches、配置/源码不触碰”的承诺与这几条实际候选范围不相符；这不代表本轮已观察到真实误删。模型统一归 `model weights` 有解释价值，但不能证明全部可重下载；例如本地导入或自建模型的唯一性没有检查。[README:125–138][readme-safety]、[SECURITY.md:32–46][security-assets]

**Water 要求：**先识别受保护资产，再拆分可操作对象；HF token/config/独有成果优先保护。模型先做盘点，不能把模型根整体默认推荐。规则应有保护证据、适用工具版本、恢复成本和原生动作，而非只有目录、category、note。

### F2：scan_id 是候选成员资格，不是对象身份或用户同意

**源码确认：**session 内容只有 `HashSet<PathBuf>`。清理读取的是路径集合的克隆，没有对象 ID、体积/内容快照、规则版本、有效期或已执行标记。保留最近 **8 个**会话，达到数量上限后才淘汰；新扫描不会使所有旧会话立即失效，成功清理也不消费授权。[state.rs:12–77][sessions]、[commands.rs:143–162][clean-command]

**静态推导：**同一路径在扫描后被重建为另一目录，旧 session 仍可匹配；重复请求也可再次作用于后来生成的同路径对象。README 中“旧扫描路径会被拒绝”的表述，应准确限定为“未知/已淘汰会话，或该会话未列出的路径被拒绝”。没有时间过期机制不能称为短时授权。[README:65–69、129–132][readme-session]

正常 UI 有逐项选择和确认，且扫描后不自动勾选，是优点。但 `scan_projects(root)` 与 `clean_paths` 都是暴露给 WebView 的命令；后端没有独立记录“用户已确认某个具体计划”。**被控 WebView 可先请求扫描某根，再请求清理规则允许的候选**。白名单减少可达范围，却不能单独证明用户同意，也没有阻止前端主动生成新候选。这里是信任边界分析，未实施攻击。[lib.rs:19–25][entrypoints]、[commands.rs:47–101][scan-project-command]

**Water 要求：**IPC 使用 scope/finding/plan ID，展示路径不作为删除请求；扫描阶段不给执行权限。计划绑定对象身份、规则版本、选中集合、失效条件与独立执行状态，并明确原生确认/应用 UI 的信任假设。一次性/短期计划也不能替代执行前复核。

### F3：末级链接拒绝不能覆盖父链及 TOCTOU

**源码确认：**`clean_one` 顺序为 absolute → allowlist → `is_reparse_or_symlink(normalized)` → `trash::delete(normalized)`。`is_reparse_or_symlink` 只查询最终路径对象，元数据失败会返回 false。没有父组件检查、稳定句柄、卷/文件身份快照或原子验证执行协议。[cleaner.rs:23–89][cleaner]

`std::path::absolute` 不访问文件系统、不解析链接，POSIX 上还会保留 `..`；它不是 canonicalize，更不是身份验证。state 注释使用“canonicalized”不能当成实际行为证据。[state.rs:20–26][sessions]、[Rust absolute 文档](https://doc.rust-lang.org/std/path/fn.absolute.html)

**静态风险路径，未做运行复现：**

1. 扫描 `project/target` 后，`project` 被换成指向另一棵目录的链接；最终 `target` 可以是普通目录，末级检测不会证明其祖先未重定向。
2. Ruby `vendor/bundle` 本身就是含多组件的规则；即使 `vendor` 已是链接，最终 `bundle` 也可能是普通目录。[project_rules.toml:292–295][ruby-rules]
3. 即使检测时最终对象不是链接，检测与按路径调用 trash 之间仍有可替换间隙；普通目录替换同样不是 symlink 检测能发现的事。
4. 元数据权限/I/O 错误在链接检查中按 false 继续，不符合 Water 的“未知即跳过”。此后 trash 可能失败，也可能成功，实际平台行为未验证。

不在此断言 `trash` 的每个平台后端一定跟随被替换链接或必然误删目标：本轮未审计依赖实现，也没有竞态试验。能确认的是上游自身未提供上述身份/父链保证。

**Water 要求：**平台专有对象身份、父链/挂载边界策略、执行前再验证，以及尽可能基于稳定句柄的操作；实现不能只增加 canonicalize+前缀比较后宣称竞态已解决。无法建立安全语义的动作暂不开放。

### F4：项目识别证明工具栈，不能证明子目录可删

**源码确认：**`detect_stacks_in` 从目录项名称判断 marker 或后缀，不解析项目配置，也不验证 marker 类型。候选构造只做 `root.join(name)`、exists 和末级链接拒绝，没有要求候选确为目录。规则包括 `build`、`dist`、`env`、`bin`、`vendor` 等通用名称。[stacks.rs:119–140][detection]、[stacks.rs:321–390][project-sizing]、[project_rules.toml:57–195][project-rules]

因此空的 `package.json` 或名为该名称的目录也可命中；项目中的普通文件 `build` 也可能成为候选。现有测试恰用空 marker 文件证明的是识别路径，不是项目可重建性。[stacks.rs:487–521][project-tests-basic]

未见 Git tracked/untracked 检查、lockfile 完整性、环境 `pyvenv.cfg` 形状、手动修改、私有已下架依赖、活跃构建或进程句柄检查。发现阶段跳过 `.git` 是性能/发现剪枝，不是“保护所有受 Git 跟踪数据”；将一个含源码的 `dist` 整根送回收站，仍会包含源码。README 的“源码不触碰”不能由静态名称规则推导。[project_rules.toml:29–55][skip-rules]、[SECURITY.md:41–46][security-assets]

**Water 要求：**目录名仅用于发现；候选形状、工具配置、重建材料、版本控制/本地修改、独有文件与使用状态共同决定风险。未知冲突默认保护，不把活跃环境统一称为垃圾。

### F5：逻辑文件长度、可回收空间和已释放空间混用

**源码确认：**`dir_size` 对普通文件 `metadata.len()` 求和，局部使用饱和加法，保留遍历错误数；没有 allocated blocks、文件身份去重、APFS clone/snapshot、稀疏文件、压缩或共享引用计算。项目聚合直接 sum 每个候选大小。[scanner/mod.rs:21–45][sizing]、[stacks.rs:212–240][grouping]

**可确定的静态后果：**

- hardlink 多个目录项会按多份逻辑长度计数；APFS clone/共享块等不能由这些数值推导删除后的独占释放量。Windows/macOS 都要分别实现容量语义。
- 同一项目的规则仅按名称去重，不消除祖先/后代重叠。兼有 Composer 与 Ruby marker 的目录可同时命中 `vendor` 和 `vendor/bundle`，其内容会重复计入；清理父项后子项还可能失败。[stacks.rs:325–335][project-sizing]、[project_rules.toml:272–295][ruby-rules]
- 清理结果没有返回字节数或 trash receipt；前端把成功条目的**扫描时估算**相加，显示 `Freed ...`。没有测量宿主卷前后空间。[cleaner.rs:5–10][cleaner]、[useCleanPanel.ts:179–194][ui-clean]
- 移入同卷回收站通常仍占该卷空间，不能把“路径已从原位消失”当成“物理空间已释放”；本轮没有测试具体平台/卷行为。

**Water 要求：**分别报告 logical、allocated、共享关系、reclaimable 区间、转移到回收站/隔离的状态、宿主可用空间变化；不可测时返回 unknown。父子资源与同身份文件去重，禁止通过扫描总量拼出虚假的实际释放值。

### F6：mtime 缓存与取消/错误边界影响可信度

- SizeCache 仅以路径和根目录自己的 mtime 判断命中，进程生命周期内复用；深层文件改写而根 mtime 未变时大小可长期过时。源码注释已如实承认此限制，这是优点；Water 需要将缓存年龄、有效性、估算状态写入结果，而不是显示为最新事实。[scanner/mod.rs:48–101][size-cache]
- 限深只作用于项目发现；一个发现到的 `node_modules`/模型根仍会被 `dir_size` 完整递归。`dir_size` 没有 cancel 参数或每项取消检查；外层只在一个单位开始前检查。取消可能等待一个很大的根测量结束。[stacks.rs:267–269、347–372][project-sizing]、[ai_caches.rs:347–366][ai-enumeration]、[scanner/mod.rs:21–45][sizing]
- `begin_scan` 替换一个全局 cancel flag，不会取消旧 flag；自己的测试也断言旧扫描未收到取消。并发 IPC 调用或两个 panel 扫描时，只有最后一个 scan 可通过该槽取消。[state.rs:80–100、170–179][cancel-state]
- `detect_stacks_in` 对 read_dir 内部项错误 `filter_map(e.ok())` 静默丢弃；候选 `p.exists()` 也未区分不存在与访问失败；缺失返回 `SizeStats::default()`。因此 scan_errors 有价值，但不能称覆盖所有不可读对象。[stacks.rs:119–128][detection]、[scanner/mod.rs:21–24][sizing]、[ai_caches.rs:353–369][ai-enumeration]

**Water 要求：**按扫描任务 ID 取消；深入遍历也有取消/预算；每项保留 unreadable、missing、skipped-link、partial 等不同状态。缓存仅用于显示优化，不能让执行前证据复用过期测量。

### F7：发现路径与分类粒度不足以做双平台精准适配

**源码确认：**模型路径主要由 home 加固定后缀组成；Electron 路径主要由 `dirs::config_dir` 加产品名；使用 `dirs` 有跨平台基础，但解析器未读 HF_HOME/HF_HUB_CACHE/OLLAMA_MODELS、工具配置、CLI 自定义目录、portable/user-data-dir、工具版本或多个实例。[ai_caches.rs:45–218][path-resolvers]

不能据此断言所有 macOS 路径都错，也不能把“用了 dirs”当成两平台覆盖已经实测。已确认的限制是自定义路径/多实例解析缺失和整根粒度。Xcode 规则只识别项目内 `build`、`DerivedData`，不是解析 Xcode 全局/自定义 derived data、runtime、archive。[project_rules.toml:257–270][xcode-rules]

AI 类型只有 cache/model weights/logs；`CleanableDir` 也只有路径、大小、category、note，没有 risk、confidence、protected、activity、tool_version 或 reference 字段。正常 UI 不默认勾选候选，但 Select all 将可见项全部选入，不区分模型/日志风险。[stacks.rs:21–29][project-types]、[ai_caches.rs:11–22][ai-types]、[AiCachesPanel.tsx:99–145][ai-selection]

**Water 要求：**Windows/macOS 同等建立配置来源链、工具实例/版本、引用与风险状态；平台默认目录只提供候选，不独立授权动作。当前 Windows 静态审阅不能冒充 macOS 验收。

## 测试审阅与证据边界

Rust 源码中可数到 30 个 `#[test]`：cleaner 4、state 6、目录计量 4、项目扫描 11、AI 扫描 5。此为静态计数，没有执行。[cleaner 测试][cleaner-tests]、[state 测试][state-tests]、[计量测试][size-tests]、[项目测试][project-tests-basic]、[AI 测试][ai-tests]

| 测试已有覆盖 | 没有由此证明的事项 |
|---|---|
| 清理拒绝非白名单、空路径；合法临时目录入 trash；Unix 末级 symlink 被拒绝 | Windows junction/reparse、父级链接、对象替换、TOCTOU、失败元数据、卷边界、特殊路径 |
| session ID 唯一、精确集合、未知 ID、超过 8 个淘汰；取消 flag 传播/替换 | TTL、一次性执行、扫描变更失效、并发清理、后端计划同意、重启恢复 |
| 临时 fixture 项目识别、多栈合并、monorepo 展示、剪枝、category/note、预取消与进度 | Git 跟踪源码保护、配置/凭证保护、候选文件类型、可重建性、活跃锁、名称误匹配 |
| 文件长度求和和根 mtime 变化后重新计算 | 深层内容改写缓存失效、hardlink/clone/sparse/压缩、重叠候选、真实释放容量 |
| AI 候选数量/元数据/类别存在、预取消 | 工具特定语义、配置覆盖、多实例路径、模型引用/唯一性、凭证排除 |

特别注意：AI 测试调用实际 `list_ai_caches(never_cancel(), ...)`，路径解析依赖真实 `dirs::home_dir/config_dir/cache_dir`，并非注入临时目录；运行这些测试可能实际遍历开发者 HOME 中的已知目录。cleaner 的一个测试实际调用 trash 移动临时目录。**因此本轮没有为了“验证”执行 cargo test。**Water 的测试必须默认只访问受控 fixture，并用假执行器替代真实回收站，真实平台集成测试另立明确范围。[ai_caches.rs:413–469][ai-tests]、[cleaner.rs:122–132][cleaner-tests]

CI 配置中 fmt/clippy/cargo test 的任务跑在 Ubuntu；另有 Linux/macOS/Windows 的 cargo check/build 矩阵。配置存在不表示本轮核验运行记录，也不能把 cargo check 当成 Windows/macOS 清理行为测试。[ci.yml:38–84、86–143][ci]

## Water 可采用的协议与必须自研部分

### 可以借鉴，按 Water 契约重写

1. **扫描响应与任务生命周期**：独立 task/scan ID，progress、cancelled、partial、逐项错误；UI 丢弃旧结果，但后端仍自行管理任务与有效性。
2. **候选来源白名单**：后端存候选集，IPC 用对象 ID；白名单仅证明候选来源，不能被当作用户同意或真实对象身份。
3. **声明式规则与说明**：维护可审查规则表和 category/note；Water 增加工具版本/平台、官方来源、结构约束、保护排除、风险与恢复成本。规则模式要验证相对路径、根禁止项、冲突和祖先/后代覆盖；当前上游表是编译期可信输入，不能把未来远程可变规则风险称为现有注入漏洞。
4. **逐项结果**：保留成功、失败、跳过与原因；不因一项失败隐去其他结果。移动到回收站、原生 GC、永久移除使用不同状态。
5. **安全文案对照代码检查**：威胁模型中每项承诺都挂可执行验收用例，不让文案比实现更强。

### Water 必须独立完成，不能由此上游继承保证

| 领域 | Water 需要的协议/验收方向 |
|---|---|
| 只读阶段 | M1 没有删除 IPC/执行器；fixture、工具元数据与扫描预算可注入；不为发现启动项目/服务 |
| 资产保护 | 凭证/设置/会话/记忆/源码/数据库/checkpoint 默认保护；混合根拆分；未知不得自动归安全 |
| 文件身份 | Windows 卷与文件身份、macOS 文件身份与卷/挂载策略；全路径父链风险；变更使计划失效；句柄级执行方案与未解决限制透明 |
| 执行计划 | 后端生成精确计划；包含对象/规则版本、动作、前提、用户选择、期限/消费状态；批量去重与父子互斥；执行前逐项复核 |
| 使用与引用 | 项目归属、重建材料、Git/local 修改、锁/进程/官方引用；缺少证据显示 unknown，不宣称“没有使用” |
| 原生工具 | shared store、模型 revision、Docker 对象用版本适配的官方机制；不为了回收站语义整根搬走；远程/不明 backend 只读 |
| 容量 | logical/allocated/reclaimable/observed 分离；hardlink、APFS clone/snapshot、稀疏文件及父容器避免重复；可用空间变化声明其他进程干扰 |
| 恢复与审计 | 变更前 intent、变更后结果/receipt、崩溃未知状态；恢复不覆盖新文件；重下载不等于可回滚；移入回收站不等于释放空间 |
| 双平台验收 | Windows reparse/junction/大小写/UNC/权限与 macOS symlink/挂载/APFS/Trash 分别用真实平台验证；上游静态检查不提供这些保证 |

建议把本审阅作为 Water 架构与 fixture 设计的输入，而不是把本仓库当现成产品内核。首批原型先验证“正确识别和保护”，再为少量对象建立计划—执行前复核—结果证据闭环。

## 固定证据链接

以下 GitHub 链接全部固定到审阅 commit，不使用 main 分支作为结论依据。外部官方文档链接用于核对工具数据语义，属于 2026-10-17 读取的在线说明，可能后续变化。

[license]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/LICENSE#L1-L21
[package]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/Cargo.toml#L1-L34
[entrypoints]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/lib.rs#L9-L27
[scan-project-command]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/commands.rs#L13-L101
[scan-ai-command]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/commands.rs#L103-L132
[clean-command]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/commands.rs#L68-L162
[cleaner]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/cleaner.rs#L5-L89
[sessions]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/state.rs#L8-L77
[cancel-state]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/state.rs#L80-L179
[sizing]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/mod.rs#L10-L45
[size-cache]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/mod.rs#L48-L101
[project-types]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/stacks.rs#L20-L50
[detection]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/stacks.rs#L108-L140
[grouping]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/stacks.rs#L159-L243
[project-walk]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/stacks.rs#L263-L315
[project-sizing]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/stacks.rs#L267-L412
[skip-rules]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/project_rules.toml#L29-L55
[project-rules]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/project_rules.toml#L57-L195
[ruby-rules]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/project_rules.toml#L272-L295
[terraform-rule]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/project_rules.toml#L307-L315
[xcode-rules]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/project_rules.toml#L257-L270
[ai-types]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/ai_caches.rs#L10-L42
[model-roots]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/ai_caches.rs#L60-L120
[path-resolvers]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/ai_caches.rs#L45-L218
[ai-enumeration]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/ai_caches.rs#L331-L405
[cleaner-tests]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/cleaner.rs#L92-L153
[state-tests]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/state.rs#L103-L181
[size-tests]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/mod.rs#L105-L176
[project-tests-basic]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/stacks.rs#L416-L646
[project-tests-extra]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/stacks.rs#L648-L725
[ai-tests]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/src/scanner/ai_caches.rs#L408-L471
[ui-scan]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src/lib/useCleanPanel.ts#L64-L125
[ui-clean]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src/lib/useCleanPanel.ts#L164-L208
[dialog]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src/components/ConfirmCleanDialog.tsx#L128-L183
[ai-selection]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src/components/AiCachesPanel.tsx#L99-L145
[capabilities]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/capabilities/default.json#L1-L12
[tauri-config]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/src-tauri/tauri.conf.json#L22-L44
[readme-safety]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/README.md#L125-L138
[readme-session]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/README.md#L65-L69
[security-assets]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/SECURITY.md#L32-L46
[ci]: https://github.com/Maks417/DevMachineCleaner/blob/77b279513e6a2271960312d9b4068a33bd84394c/.github/workflows/ci.yml#L38-L143
