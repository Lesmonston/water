WATER-W12-P5 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w12-p5/docs/dispatch/reports/WATER-W12-P5-REPORT.md

## 提交与范围

- 实际模型：Codex（GPT-6；会话未提供更细版本），未使用子代理。
- 工作树：`F:/new/smaltalk/water/.worktrees/w12-p5`；分支：`worker/water-w12-p5`。
- 首次 HEAD：`6fd29e342b76ff2ceecd74e66805300405ef1334`，与 `water-w12-p5-base-20261107` 一致，开工时干净。
- 实现提交：`fec544ccc27349b8564cfec742f7d19fb365254e`。两条负控、恢复和三个 final 均绑定此提交；final 前后工作树干净。
- 产品改动仅 `packages/junk-rules/rules/windows.json`、`tests/rules_v1.rs`、`README.md`。后续提交仅本回执及 archive 生成的证据。
- 提交身份为 `Codex-GPT-6 <codex-gpt-6@localhost>`，仅在提交进程设置环境变量；未修改 Git 配置、远端或历史，未 push、merge、rebase。

## 工单逐项对照

规则总数 110 → 118，数据版本 `2026-11-07.3`。八条规则按工单顺序追加；都写齐中文解释、增长类型、修复提示或 null，以及指定的 2026-11-07 本地调查来源。

| 规则 | 分类 / 级别 | 定位器数 | 类型 / 年龄 h / 保留 | 在用 / 增长 |
|---|---|---:|---|---|
| vrchat-cache | app_leftover / confirm | 2 | dir / 168 / 0 | process_running：vrchat.exe / slow |
| wecom-upgrade-staging | app_leftover / confirm | 1 | any / 720 / 0 | process_running：wxwork.exe / one_off |
| npm-global-reify-leftovers | dev_cache / recommended | 2 | dir / 24 / 0 | none / leak_prone，附修复提示 |
| wechat-xlog | crash_log / recommended | 1 | file / 168 / 0 | none / slow |
| chromium-component-crx-cache | browser / recommended | 3 | dir / 24 / 0 | process_running：chrome.exe、msedge.exe、brave.exe / slow |
| onedrive-logs | crash_log / recommended | 1 | any / 168 / 0 | none / slow |
| copilot-sdk-runtimes | agent_tool / recommended | 1 | dir / 24 / 1 | none / slow |
| claude-code-installer-downloads | agent_tool / recommended | 1 | any / 24 / 0 | none / one_off |

`gpu-shader-cache` 的原六个定位器按原顺序保留，追加 user_profile 下 LocalLow 的 Intel ShaderCache、NVIDIA DXCache 与 GLCache；级别、类型、年龄、保留、在用和文案不变，并追加本次调查来源。与基线逐对象核对：其余 109 条旧规则未变，15 条 protected 规则全部未变。规则加载通过保护重叠校验，没有舍弃任何新规则。

新断言全部放入既有 `m35_seeds` 与 `m35_resolve`，标记为 `RULES_W12_NEW`；精确四个顶层测试及名称不变。检查覆盖每条新增规则的字段、来源、定位器、追加顺序，以及经 `folders_json` → `resolve_plan` 解析出的完整路径、ID、策略和在用检测。GPU 的九个解析路径及旧策略继续精确核对。

npm 两个定位器只用星号通配。通过公开 `RuleSet::from_json` 的保护重叠校验调用产品段匹配器，以具体路径作探针，验证直接与带 scope 的 .bin、普通包名及无连字符隐藏名不命中，隐藏随机副本命中。`.package-lock.json` 名称本身可以命中模式，但两个解析目标经计划 JSON 往返后均严格为 `ItemType::Dir`，因此规则计划排除普通文件。没有在测试中另写 glob，也没有声称已运行真实扫描或执行器文件类型检查。

README 只同步数据版本号。浏览器定位器仅覆盖组件下载缓存，没有扩到登录、Cookies 或网站存储。

## 旧断言迁移

迁移均保留精确值比较，没有放宽断言：

| 原断言（以基线位置定位） | 原值 → 新值 | 原因 |
|---|---|---|
| m35_seeds 第 700 行、rules_resolve_plan 第 2394/2398/2402 行、rules_seed_coverage 第 2932/2970 行 | 2026-11-07.2 → 2026-11-07.3（六处） | 所有嵌入数据与计划版本跟随本单版本 |
| m35_seeds 第 742 行、rules_protection_precedence 第 2108 行 | 110 → 118 | 新增八条规则，GPU 扩充不另计 |
| m35_seeds 全计划条数、rules_resolve_plan 计算后精确条数 | 323 → 338 | 新增 12 个规则目标，加 GPU 的 3 个目标 |
| m35_seeds 全计划末目标 | system-tmp-chrome-profiles#1 → claude-code-installer-downloads#1 | 新规则在末尾追加 |
| m35_seeds 新目标顺序表 | 原 32 条 M3.5 规则生成的序列 → 原序列后追加八条新规则的 12 个目标 | 保持完整、精确的顺序核对 |
| seed_table 的 GPU 定位器表 | 原 6 个 → 同序原 6 个加 LocalLow 3 个 | 保留每个原定位器，精确核对扩充 |

M3.5 的 32 行原规则表及 78 条更早规则表继续核对；custom 规则数、会话开关语义和品牌出现次数 23 都未改。

## 检查命令与证据

以下每行的完整命令均为 `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W12-P5` 加该行参数，全部在本树根目录执行。退出码为检查入口退出码；负控中的 cargo 101 是预期断言失败。

| 命令参数 | 退出码 / 结果 | 汇总 | 证据 |
|---|---|---|---|
| `--mode baseline` | 0 / 通过 | 基线、分支、干净状态与环境通过 | [收据](../../acceptance/wave12/p5/receipts/2026-11-07T12-10-10.029Z-6016-baseline-result.json) |
| `--mode lock` | 0 / 通过 | 离线依赖核对，锁文件未变 | [收据](../../acceptance/wave12/p5/receipts/2026-11-07T12-12-32.713Z-21652-lock-result.json) |
| `--mode test` | 1 / 失败 | 新增断言先红，2 通过 / 2 失败；cargo 101 | [收据](../../acceptance/wave12/p5/receipts/2026-11-07T12-12-45.679Z-35000-test-result.json) |
| `--mode test` | 1 / 失败 | Copilot 文案承诺在用跳过，3 通过 / 1 失败；cargo 101 | [收据](../../acceptance/wave12/p5/receipts/2026-11-07T12-15-58.157Z-29596-test-result.json) |
| `--mode test` | 0 / 通过 | 4 通过，0 失败 / 忽略 / 过滤 | [收据](../../acceptance/wave12/p5/receipts/2026-11-07T12-17-17.063Z-32900-test-result.json) |
| `--mode check` | 0 / 通过 | metadata、fmt、clippy 全通过 | [收据](../../acceptance/wave12/p5/receipts/2026-11-07T12-18-00.510Z-24804-check-result.json) |
| `--mode real` | 0 / 通过 | 已知目录存在性，只输出计数 | [收据](../../acceptance/wave12/p5/receipts/2026-11-07T12-18-27.071Z-28344-real-result.json) |
| `--mode red-nc1` | 0 / 通过 | 捕获有效断言失败，内部 cargo 101 | [收据](../../acceptance/wave12/p5/receipts/2026-11-07T12-19-13.286Z-23456-red-nc1-result.json) |
| `--mode test` | 0 / 通过 | 4 通过，0 失败 / 忽略 / 过滤 | [收据](../../acceptance/wave12/p5/receipts/2026-11-07T12-19-30.128Z-32676-test-result.json) |
| `--mode red-nc2` | 0 / 通过 | 捕获有效断言失败，内部 cargo 101 | [收据](../../acceptance/wave12/p5/receipts/2026-11-07T12-19-54.885Z-39256-red-nc2-result.json) |
| `--mode test` | 0 / 通过 | 4 通过，0 失败 / 忽略 / 过滤 | [收据](../../acceptance/wave12/p5/receipts/2026-11-07T12-20-13.646Z-39588-test-result.json) |
| `--mode check --final` | 0 / 通过 | metadata、fmt、clippy 全通过 | [收据](../../acceptance/wave12/p5/receipts/2026-11-07T12-20-32.039Z-28980-check-result.json) |
| `--mode test --final` | 0 / 通过 | 4 通过，0 失败 / 忽略 / 过滤 | [收据](../../acceptance/wave12/p5/receipts/2026-11-07T12-20-44.260Z-37332-test-result.json) |
| `--mode real --final` | 0 / 通过 | 已知目录存在性，只输出计数 | [收据](../../acceptance/wave12/p5/receipts/2026-11-07T12-20-54.473Z-12140-real-result.json) |
| `--mode archive` | 0 / 通过 | 231 个证据文件归档 | 本地收据 `2026-11-07T12-21-04.546Z-30536-archive-result.json`（归档后生成） |

最终 check 包含离线 metadata、`cargo fmt -- --check` 和 `cargo clippy --all-targets -- -D warnings`；最终 test 跑完整 `rules_v1`，4 通过、0 失败、0 忽略、0 过滤。没有计时失败或计时重跑。实现过程中的两次失败如上保留：先用新断言证实旧数据缺规则，随后修正文案，不改旧文案安全断言。

定向格式化使用本机 Rust 1.95.0 的 `rustfmt --edition 2024 packages/junk-rules/tests/rules_v1.rs`；`git diff --check` 通过。cargo 由冻结检查器准备离线缓存、私有 target 并串行运行；执行前仅查看 cargo/rustc 等进程名与 PID，未读取或输出进程命令行。

## 负控与恢复

- nc1：只把 `vrchat-cache.level` 从 confirm 改成 recommended。`rules_seed_coverage` 以 `RULES_W12_NEW: vrchat-cache frozen policy` 失败，3 通过 / 1 失败，cargo 101；检查器确认有效。
- nc2：只把 npm 第一个定位器末段从 `.*-*` 改成 `*`。解析路径和种子定位器断言都以 `RULES_W12_NEW` 失败，2 通过 / 2 失败，cargo 101；检查器确认有效。
- 两次均立即 `git checkout -- packages/junk-rules/rules/windows.json`，核对 SHA-256 为 `65ffb196746f715a849d7b054379af107366ecb26cbdc1c3df15d7ee39bc3f22`，再立即跑 test 全绿。负控未改测试、src 或其它文件。final test 的 proofAudit 已核对两对红 / 恢复绿、全部源快照及测试哈希一致。

## 自主选择、真实冒烟与限制

- Chromium 当前格式只有规则级 in_use。保留工单要求的一条规则和三个定位器，列出三家进程名；任一家运行即保守跳过整组，比只检查一家清得更少。没有添加接口或拆成额外规则。
- 现有 Agent 规则中找不到 Copilot SDK 的专属进程名单，按工单允许选 none，未猜测 node.exe 或借用 Claude 的进程名。保留策略沿用活动时间，文案明确保留最近活动的一份，没有把它称作版本号最大的一个；运行时副本按现有运行时规则归 slow。
- PowerShell 的 Node 内联引号传递曾使一次只读查看命令失败，改用 UTF-8 here-string 传入 Node 标准输入。权威票在主树，未在本工作树复制或合入；两份规则与两份 SPEC 的主树 / 工作树 SHA-256 一致。
- 最终真实冒烟：`rule_count=118`、`base_present_count=95`、`literal_prefix_present_count=78`、`system_drive_exists=true`。只查已知目录及字面前缀是否存在，输出是计数；未列目录、未读真实文件内容、未删除真实数据。这些计数不证明新增缓存实际大小或每条新路径均存在。
- 原生窗口、目录选择框、浏览器均为 0；未建物理删除夹具，未启动后台进程。未改 src、依赖、锁、契约、检查器、台账、其它包或上游 checkout。工单明确排除的规则未做。
- 未验证 macOS、真实清理、生产竞态、新规则在桌面与扫描器中的集成。Copilot 的 none 在用策略是工单允许的限制，已在文案说明。无阻塞项或越界申请；本回执仅提交完成，待总控验收。

证据索引：[ARCHIVE.json](../../acceptance/wave12/p5/ARCHIVE.json)，由 archive 生成，231 个归档文件、6,388,746 字节，包括原有总控 12:05 baseline（保留原样，不当成本执行者运行）。archive 自己的结果收据在 `.local/checks/WATER-W12-P5/2026-11-07T12-21-04.546Z-30536-archive-result.json`，因在复制完成后生成，不在本次索引中。
