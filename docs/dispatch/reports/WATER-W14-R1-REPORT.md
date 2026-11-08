WATER-W14-R1 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w14-r1/docs/dispatch/reports/WATER-W14-R1-REPORT.md

## 交付身份与提交

- 实际执行模型：Codex / GPT-6（本会话）。未启动子代理、外部模型或后台实现者；票面默认名称 sol 不作为精确运行型号的证明。
- 日期：2026-11-08。任务仅交回待总控验收，未自行标为 VERIFIED。
- 唯一工作树：`F:/new/smaltalk/water/.worktrees/w14-r1`。
- 分支：`worker/water-w14-r1`。
- 首次 HEAD / 基线 tag：`d692bd60cd8ab3fe4d0201afacd8a29fcfc8265a` / `water-w14-r1-base-20261108`；开工时工作树干净。
- 实现提交：`ead1defd3b4f2a0439d5d59f16a649e521032021`，`Add English rule text and validate bilingual fields`。
- 三个 final 均绑定上述实现提交、干净工作树。后续提交仅放本报告和检查器归档证据。
- 提交身份为本进程设置的 `Codex-GPT-6 <codex-gpt-6@localhost>`；未改 Git 配置、远端或已有历史，未 push、merge、rebase、amend、reset。

## 工单逐项对照

| 工单项 | 交付 |
|---|---|
| 先读与基线 | 按两份执行规则、W14 第 0/2/7 节、工单、解析器、规则数据、指定测试的顺序阅读；另读规则格式与项目接手材料。baseline 通过 |
| 1.1 Rule | 增加五个必填英文 `String` 与四个可选英文 `Option<String>`，名字与工单一致 |
| 1.1 RuleText | 只为现有六个中文成员配 `title_en`、`owner_en`、`what_en`、`why_en`、`after_en`、`fix_hint_en`；`Rule::text()` 克隆对应值 |
| 1.2 解析 | 九个英文键进入白名单，按字符数检查 2–48 / 1–64 / 4–320；可选文案中英文配对。拒绝控制字符、不可见格式控制符、CJK 统一及兼容表意文字与中文标点；使用现有 `RULES_INVALID_TEXT`，必填缺键沿用 `RULES_MISSING_FIELD` |
| 1.3 数据 | 118 条全部有五个必填英文；`fix_hint_en` 3 条字符串、115 条 null，`in_use_en` 41 条，`advice_en` 3 条，`retention_en` 2 条。共 754 个英文键，其中 639 个字符串。中英文键相邻 |
| 1.3 归属与版本 | 原本是英文的 owner 原样保留；中文归属与中文分隔符改成英文。`data_version` 为 `2026-11-08.2` |
| 1.4 公开前写法 | 新内容未写入本机用户名、真实路径、私人邮箱、其它本机项目或私有流程引用；英文用美式拼写、句子式大小写，无表情或感叹号。产品字段未添加工单号或验收路径 |
| 2 测试 | 保持精确四个测试及原名称。`m35_seeds` 检查全部 118 条、长度、配对、可打印英文、英文 owner 原样、Rule 与 RuleText 的值；`rules_schema_strict` 经 `RuleSet::from_json` 覆盖全部九个字段的边界、缺键、类型、中文及控制字符、可选字段双向配对 |
| 3 负控 | 两条均只改工单指定的一处生产数据/逻辑，底层测试退出 101 且包含 `RULES_W14_EN`；立即 checkout、核对 SHA-256，再 test 变绿 |
| 4 检查与归档 | baseline、lock、check、test、real、两条负控、三个 final、archive 全部通过 |
| 5 范围 | 实现仅改 `src/rules.rs`、`rules/windows.json`、`tests/rules_v1.rs`、`README.md`；回执和证据在指定位置 |

用 Node 对比基线 JSON：移除新增 `_en` 键后，118 条规则对象与基线逐字段深度相等。规则数量、顺序、rule_id、定位、等级、在用配置、全部中文、sources 及其它原字段均未改变。Cargo.toml、Cargo.lock、其它包、契约、台账和检查器未改。

## 检查命令与结果

以下所有命令均在指定工作树根目录执行，完整前缀为：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W14-R1
```

每行参数接在该前缀后，结果列为检查器退出码。回执和所引用的完整子命令日志均在 `docs/acceptance/wave14/r1/receipts/`。测试始终是 `rules_schema_strict`、`rules_protection_precedence`、`rules_resolve_plan`、`rules_seed_coverage`，无 ignore 或过滤。

| 参数 | 结果 | 归档回执 |
|---|---|---|
| `--mode baseline` | 0，环境与离线输入就绪 | `2026-11-08T08-39-41.427Z-23680-baseline-result.json` |
| `--mode lock` | 0，依赖策略通过，未更改锁文件 | `2026-11-08T08-48-34.641Z-33112-lock-result.json` |
| `--mode test` | 0，4 passed | `2026-11-08T08-49-07.490Z-30028-test-result.json` |
| `--mode check` | 0，fmt 与 Clippy -D warnings 通过 | `2026-11-08T08-50-09.213Z-33384-check-result.json` |
| `--mode real` | 0，只读冒烟通过 | `2026-11-08T08-50-37.515Z-15448-real-result.json` |
| `--mode test` | 0，最终文案调整后 4 passed | `2026-11-08T08-51-08.437Z-10212-test-result.json` |
| `--mode red-nc1` | 0，捕获预期红；cargo 101 | `2026-11-08T08-52-17.098Z-22648-red-nc1-result.json` |
| `--mode test` | 0，nc1 恢复后 4 passed | `2026-11-08T08-52-46.495Z-29560-test-result.json` |
| `--mode red-nc2` | 0，捕获预期红；cargo 101 | `2026-11-08T08-53-25.782Z-8996-red-nc2-result.json` |
| `--mode test` | 0，nc2 恢复后 4 passed | `2026-11-08T08-53-46.174Z-20668-test-result.json` |
| `--mode check --final` | 0，干净实现上 fmt 与 Clippy 通过 | `2026-11-08T08-54-24.885Z-37504-check-result.json` |
| `--mode test --final` | 0，4 passed；两条负控的源快照及紧随恢复链审核通过 | `2026-11-08T08-54-39.745Z-40564-test-result.json` |
| `--mode real --final` | 0，只读冒烟通过 | `2026-11-08T08-54-52.103Z-20376-real-result.json` |
| `--mode archive` | 0，归档 213 项、6,718,898 字节 | `docs/acceptance/wave14/r1/ARCHIVE.json` |

归档模式的自身回执留在本树 `.local/checks/WATER-W14-R1/2026-11-08T08-55-12.080Z-21040-archive-result.json`；归档索引包含此前的检查回执、日志和源快照。目录中还原有一份 `2026-11-08T08-28-10.057Z-34488-baseline-result.json`，属于总控派前检查，不冒充本会话运行。归档后已重新逐项计算 213 项的字节数与 SHA-256，均与索引一致。

另运行了 Rust 1.95.0 的 `cargo fmt --manifest-path packages/junk-rules/Cargo.toml` 来应用格式；实际 cargo 检查和测试均走指定检查器，使用离线缓存、jobs=1、单线程测试及本树私有 target。开工与首次测试启动前观察了 cargo/rustc 进程名，未输出进程命令行。`git diff --check` 通过。

计时重跑：无。检查器与产品测试无失败重试。查看工具曾遇到 PowerShell 传 Node 双引号参数及 rg 原生通配路径的小问题，分别改用保留 UTF-8 的 here-string 输入或 rg `-g`；未修改检查器、扩大权限或增加依赖。

## 负控与恢复

| 负控 | 临时变更 | 实际红 | 恢复 |
|---|---|---|---|
| nc1 | 仅删除第一条 `codex-marketplace-staging` 的 `title_en` | `rules_seed_coverage` 报 `RULES_W14_EN: English string present`；四个测试运行完，1 passed / 3 failed，cargo 101；另两项因自带规则无效而失败 | `git checkout -- packages/junk-rules/rules/windows.json`；恢复 SHA-256 `0a2e79645f578b847a84d0578dcd00bd8de0a6c2fba32cd0424fa89a58ecbfee`，立即 test 4 passed |
| nc2 | 仅移除 `read_english` 中拒绝中文字符的 if 块，保留长度和控制字符检查 | `rules_schema_strict` 经真实解析入口接受了 `abc中`，触发 `RULES_W14_EN: Chinese and nonprinting characters rejected`；3 passed / 1 failed，cargo 101 | `git checkout -- packages/junk-rules/src/rules.rs`；恢复 SHA-256 `654f6c52da60241216b54d099d3171449c921a79d56e06507c2fa306f83c1072`，立即 test 4 passed |

未改测试造红，未用编译失败或超时造红。负控均在实现提交后进行，恢复后无产品残余改动。

## 旧断言与手写规则迁移

| 位置 | 原值 → 新值 | 原因 |
|---|---|---|
| `EXPECTED_DATA_VERSION` | `2026-11-08.1` → `2026-11-08.2` | 工单要求规则数据升级版本，所有原有精确版本断言继续引用同一常量 |
| `sample_rule` | 无英文 → `Sample cache folder`、`Example`、对应三段英文，`fix_hint_en: null` | 英文必填；原样保留中文和其它字段，为全部依赖此构造器的旧用例提供有效输入 |
| `git_worktree_json` | 无英文 → 与自带 Git worktree 规则含义相同的五段英文、`fix_hint_en: null` | 保持旧有效手写规则及精确比较有效 |
| `m3d_fallback_json` | 两条兜底规则无英文 → 各自对应的英文 title/owner/what/why/after、`fix_hint_en: null` | 保持两条既有手写规则有效，不改变其中文、定位与兜底行为 |
| `m35_schema` 的 `legal` | 只有 `in_use_zh`、`retention_zh` → 加 `in_use_en`、`retention_en` | 可选文案现在必须中英文配对；原有非法值断言、错误验证不变 |
| `m35_schema` 的 `advisory` | 只有 `advice_zh` → 加 `advice_en` | 同上，保留原有级别及长度反例 |

未删除、放松任何旧断言，未改变测试名称、个数或其它精确数量。

## 自行选择与说明

- `RuleText` 只扩充现有六项的英文；没有把仅在 `Rule` 上的 advice/in_use/retention 加进 RuleText，也未新增其它公开接口。按工单更具体的字段表执行。
- `fix_hint_zh: null` 时英文可以缺省或为 null，数据与样例统一写 null；其余三项中文可选键不存在时英文键也不得存在。中文有字符串时英文必须有合格字符串，不接受英文 null。
- 字符长度沿用现有 `chars().count()`；中文检查包含补充平面的统一表意文字、兼容表意文字、全角和竖排标点。没有新增依赖或系统调用。
- 把原来较晚调用的 `m35_seeds()` 提到 `rules_seed_coverage` 入口，以便在 embedded 构造因缺英文失败前，先给出工单指定的 `RULES_W14_EN`。原有全部检查仍执行。
- 英文归属用各产品本身的名称；“剪映”译为 Jianying，避免把中国版名称直接替换为另一地区的产品名。中文集合分隔符改为英文逗号和 and。
- 对“没装上的更新”用 `Updates not installed` / `WeCom updates not installed`，保留“下载了但未安装”的意思；没有增加可清理保证。

## 词汇表之外采用的译法

| 中文 | 本单采用的英文 |
|---|---|
| 缓存 / 网页缓存 / 代码缓存 | cache / web cache / code cache |
| 下载缓存 / 构建缓存 / 编译缓存 / 转换缓存 | download cache / build cache / compile cache / transform cache |
| 显卡 / 着色器缓存 | GPU / shader cache |
| 后台脚本缓存 / 端侧模型 | service worker cache / on-device model |
| 会话 / 聊天 / 文件历史 / 记忆 | sessions / chats / file history / memory |
| 会话临时目录 / 临时目录 / 运行时副本 | session scratch folders / temporary folders / runtime copies |
| 安装包 / 更新包 / 解包残留 / 暂存 | installers / update packages / unpacking leftovers / staging |
| 旧版本 / 旧备份 / 快照 | old versions / old backups / snapshots |
| 登录状态 / 登录信息 / 网站存储 | sign-in state / sign-in information / website storage |
| 项目源码 / 编译产物 / 项目依赖 / 共享仓库 | project source code / build output / project dependencies / shared store |
| 内置或内嵌浏览器 / 无头浏览器 | embedded browser / headless browser |
| 运行日志 / 崩溃报告 / 转储 | runtime logs / crash reports / dumps |
| 页面文件 / 虚拟内存 / 传递优化 | page file / virtual memory / Delivery Optimization |
| 波形缓存 / 转换音频 / 渲染缓存 / 代理 / 优化媒体 | waveform cache / conformed audio / render caches / proxies / optimized media |
| 分段文件 / 续传 / 稀疏文件 | download fragments / resume a download / sparse files |
| 你添加的文件夹 / 自选位置 | folders you add / a location you chose |
| 自动重新生成 / 重新下载 / 永久删除 | recreate or regenerate / download again / permanently delete |
| 桌面应用或桌面程序 / 测试工具 / 显卡驱动 | Desktop apps / Test tools / Graphics drivers |
| 项目目录 / Rust 工具链 / 多个 Agent 工具 | Project folders / Rust toolchain / Various agent tools |
| 下载目录 / 下载工具 / 软件安装程序 / 临时文件夹 / 视频软件 | Downloads / Download tools / Software installers / Temporary folders / Video apps |
| 剪映 / 安卓模拟器 / 夸克 / 英雄联盟 / 企业微信 / 微信 / 达芬奇 | Jianying / Android Emulator / Quark / League of Legends / WeCom / WeChat / DaVinci Resolve |
| 微信开发者工具 / 资源管理器 | WeChat Developer Tools / File Explorer |

保留 Chrome、Edge、Brave、Firefox、Claude、Codex 等原有英文专名；原 owner 中的 `dsh` 原样保留。第 7 节已有的 junction、quarantine、move to quarantine、in use、keep growing 等按统一词汇写，重新下载没有表述为可撤销或可还原清理。

## 真实冒烟与未验证范围

普通 real 与 final real 输出相同：

```json
{"base_present_count":95,"literal_prefix_present_count":78,"rule_count":118,"system_drive_exists":true}
```

这只证明规则已知目录及字面前缀的存在检查通过；上述 count 是示例定义的计数，并非唯一目录数或扫描大小。没有列目录、读真实文件内容、输出真实路径或名字，也没有删除、移动、隔离真实数据。

Windows x64、Rust 1.95.0、Node 24 的本包定向检查已做。原生窗口 0、目录选择框 0、浏览器 0；未建物理删除夹具，未启动应用清理。macOS、服务消费英文的整条接线、宿主、UI 语言切换与其它包的集成均未在本单验证。无阻塞；最终验收与集成由总控进行。
