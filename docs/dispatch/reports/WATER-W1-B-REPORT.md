WATER-W1-B 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/b/docs/dispatch/reports/WATER-W1-B-REPORT.md

# WATER-W1-B 执行回执

状态：实现已提交，按票面为 SUBMITTED，等待总控独立验收。没有自行更新主线台账、验收或集成状态。无补充单。

## 基线、范围与提交

- 权威票面：`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-B-CATALOG-20261017.md`；任务级 manifest 从主检出只读核对。
- 工作树：`F:/new/smaltalk/water/.worktrees/b`；分支：`worker/water-w1-b`。
- 精确基线：`e92f39647c91d9ce077d592583c3352626d3402b`；tag：`water-w1-parallel-base-20261017`。baseline 检查通过且开工树干净，产物目录不存在，冻结文件一致。
- 受测实现完整 SHA：`dd3f1a19b9b72259fc3e47c2867f6725c7b42430`，提交标题 `WATER-W1-B: add discovery-only tool catalog and pure validation`。最终 check/test 均在这一干净 SHA 上通过；之后仅补本报告与最终证据。
- 实际执行引擎：Codex；本会话提供的模型标识为 GPT-6，具体模型后缀及服务端路由未暴露，未猜填。未使用子代理、其他实现 CLI 或外部模型调用。
- 沿用已有 Git 身份，提交禁用 hooks 和签名；未修改全局配置。未 push、merge、rebase 或切换分支。

实际改动严格位于 `packages/tool-catalog/` 的 index、六份指定 entries、validate.mjs、tests/catalog.test.mjs、README，以及本报告和 `docs/acceptance/wave1/b/` 文本/JSON 证据。未改 contracts、总控脚本/台账、根配置或锁，未读取 A/C 在途代码，未写其他工作树、上游、其他项目或共享 Vault。

## 需求对照

| 票面要求 | 实际交付及证据 |
|---|---|
| index 与六工具、两平台 | 固定顺序 pip/uv/npm/pnpm/huggingface/ollama；每项分 windows/macos；结构与引用校验通过。 |
| 每工具至少两页官方来源，实际打开 | 共 17 页，工具分别 3/5/2/3/2/2 页；逐页浏览正文，见 [SOURCE-FACTS](../../acceptance/wave1/b/SOURCE-FACTS.md)。不是以离线校验冒充来源事实已证实。 |
| 发现候选与保护边界 | 默认/环境/配置/查询均为提示；notes 解释各工具覆盖规则与进程环境限制。HF_HOME 标 mixed_state 并保护 token、共享 blob/revision 和模型；uv 禁止手动改删及环境边界；pnpm 共享/跨盘/版本差异；pip 非稳定布局；Ollama 自建模型资产。 |
| 纯 validateCatalog(index, entries) | 无导入、文件/环境/网络/进程读取，不实现 CLI；返回固定 code/path。逐层未知/缺键、六工具顺序/身份、平台、引用/域名、日期及能力限制均检查。无依赖安装。 |
| 禁止能力提升 | discovery_only=true、can_scan=false、can_delete=false、display_only、runtime_verified=false；均有真实拒绝断言和 can_delete 负控。 |
| 五项固定测试、至少 12 内存变体 | 精确五个顶层测试；24 个命名变体及逐层缺键/未知键、域名与能力补充变体；只改内存输入，不改实际 JSON 制造失败。 |
| 纯度验证 | 深冻结、调用前后字节表示不变、重复结果一致；同一实现进入隔离 VM，以 process/网络/require 访问哨兵检查无环境依赖。测试 VM 只作测试，不进入校验器或产品。 |
| README 与限制 | 数据版本、来源/策略区分、元数据模板语法、调用方式、运行未验证、后续接线边界均已说明。 |
| 实现提交后干净最终门 | 两个 --final 回执 before/after HEAD 一致、status 空；本次最终 5 passed，0 failed/skipped/todo/cancelled。 |

## 实际检查

以下命令均在 B 工作树执行，使用既有 Node `v24.16.0`，没有安装依赖。helper 语法门只检查指定两个文件；测试门只运行本票 testFile，串行执行。

| 命令 | 退出码 / 结果 | 归档证据 |
|---|---|---|
| `node scripts/parallel-check.mjs --task WATER-W1-B --mode baseline` | 0；精确基线、分支、洁净、冻结锁及 Node 24 通过 | [baseline.json](../../acceptance/wave1/b/baseline.json) |
| `node scripts/parallel-check.mjs --task WATER-W1-B --mode test`（先红） | 1；1 passed / 4 failed，命中拒绝断言 | [initial-red.json](../../acceptance/wave1/b/initial-red.json)、[TAP](../../acceptance/wave1/b/initial-red.txt) |
| `node scripts/parallel-check.mjs --task WATER-W1-B --mode check`（恢复后） | 0；指定两个文件语法通过 | [precommit-check.json](../../acceptance/wave1/b/precommit-check.json) |
| `node scripts/parallel-check.mjs --task WATER-W1-B --mode test`（恢复后） | 0；5 passed / 0 failed | [precommit-test.json](../../acceptance/wave1/b/precommit-test.json)、[TAP](../../acceptance/wave1/b/precommit-test.txt) |
| `node scripts/parallel-check.mjs --task WATER-W1-B --mode check --final` | 0；干净实现 SHA 上语法通过 | [final-check.json](../../acceptance/wave1/b/final-check.json) |
| `node scripts/parallel-check.mjs --task WATER-W1-B --mode test --final` | 0；5 passed / 0 failed/skipped/todo/cancelled | [final-test.json](../../acceptance/wave1/b/final-test.json)、[TAP](../../acceptance/wave1/b/final-test.txt) |

先红时所有数据/测试文件及可导入的占位校验器均已存在，四项失败分别来自缺工具、lookalike 来源、runtime_verified 提升及缺平台被接受；不是编译错误、缺文件或超时。实现后五项通过。中间另有一次 check 和 test 的成功回执，保留在 `.local/checks/WATER-W1-B/`，最终证据为准。

最终五个测试名：`catalog_shape_and_tools`、`catalog_platforms_and_sources`、`catalog_protection_boundaries`、`catalog_mutation_rejections`、`catalog_purity`。真正组装的完整包通过公开 `validateCatalog` 入口，不在测试里补生产配置。

原始命令日志均在 `F:/new/smaltalk/water/.worktrees/b/.local/checks/WATER-W1-B/`，各 JSON 的 commands[].log 保存绝对定位。最终语法日志为 `2026-10-17T06-22-49.668Z-31196-check-{0,1}.log`；最终测试日志为 `2026-10-17T06-23-14.350Z-34048-test-0.log`。提交的 TAP 文本副本仅规范行尾和去除行尾空白，原始日志保留。

## 内存变体与错误位置

下表 P 为 `/entries/pip`。各例均验证 `valid=false` 且 errors 中存在所列 code/path，所有错误项严格只有 code/path。

| 变体 | code | path |
|---|---|---|
| missing_platform | platforms | P/platforms/macos |
| missing_tool | tool_set | /entries/uv |
| duplicate_tool | tool_set | /index/tools |
| index_version | version | /index/catalog_version |
| entry_version | version | P/catalog_version |
| unknown_field | shape | P |
| missing_explicit_null | shape | P/platforms/windows/root_candidates/0/path_template |
| dangling_source | source_ref | P/assets/0/source_ids/0 |
| duplicate_source_ref | source_ref | P/assets/0/source_ids/1 |
| duplicate_source_id | source_ref | P/sources/1/id |
| runtime_claim | unsafe_capability | P/runtime_verified |
| delete_capability | unsafe_capability | P/constraints/can_delete |
| executable_field | unsafe_capability | P |
| asset_action | unsafe_capability | P/assets/0/default_action |
| empty_root_list | shape | P/platforms/windows/root_candidates |
| bad_date | shape | P/reviewed_on |
| root_command | unsafe_capability | P/platforms/windows/root_candidates/0/path_template |
| shell_substitution | unsafe_capability | P/platforms/windows/root_candidates/0/path_template |
| undefined_variable | unsafe_capability | P/platforms/windows/root_candidates/0/path_template |
| extra_platform | platforms | P/platforms |
| wrong_type | shape | P/assets |
| missing_constraint | shape | P/constraints/can_scan |
| no_sources | shape | P/sources |
| prototype_object | shape | P |

此外逐层测试 index/entry/platform/root/protected_subpath/asset/source/constraints 的未知与缺键；每个工具都拒绝两个 lookalike 主机、HTTP、URL 凭证及无效 URL，验证 fragment/query 不增加页面数；每工具都拒绝 runtime_verified/can_scan/can_delete/discovery_only 提升；覆盖可执行字段、错误工具身份/顺序、非对象输入、访问器不执行及错误不回显未知键值。

## 三项有效负控与恢复

每项只临时修改真实校验逻辑，不改测试/JSON、不使用测试开关。以 try/finally 保存和恢复原字节，恢复后比较 SHA-256。共同原始与恢复哈希：`8664203c9e0a36ab7d7f6b4e5d64622731febc61542a92e7c9c5c0afab93d9d7`。

| 临时改坏逻辑 | 真正失败断言 / helper 退出码 | 变体 SHA-256 | 证据 |
|---|---|---|---|
| 禁用未知字段拒绝 | `unknown_field: invalid input must be rejected`；1；4 passed / 1 failed | `f7fe03c64494b343a6f9bc21b5974ec4417af377f1f8f76f7ba1ab1d8f1678f7` | [JSON](../../acceptance/wave1/b/negative-unknown.json)、[TAP](../../acceptance/wave1/b/negative-unknown.txt) |
| 禁用 source_ids 悬空/重复检查 | `dangling_source: invalid input must be rejected`；1；4 passed / 1 failed | `9beb1cee4a2350a4f84dee36e1f73afd38259dd72b209c33135228fd00cf38a2` | [JSON](../../acceptance/wave1/b/negative-source-refs.json)、[TAP](../../acceptance/wave1/b/negative-source-refs.txt) |
| can_delete 改为允许 false/true | `pip can_delete: invalid input must be rejected`，另命中 delete_capability；1；3 passed / 2 failed | `c966d774a21de8b65293d873027cadf588f559a0a2b90e1727bf2232104d964c` | [JSON](../../acceptance/wave1/b/negative-delete-capability.json)、[TAP](../../acceptance/wave1/b/negative-delete-capability.txt) |

执行纠正记录：一次 can_delete 尝试在前一进程恢复完毕前启动，造成该尝试 5 passed，不能构成有效负控；明确废弃，保留 [原回执](../../acceptance/wave1/b/negative-invalid-attempt.json) 和 [日志](../../acceptance/wave1/b/negative-invalid-attempt.txt)。随后先恢复上述原始哈希，再单独执行 can_delete 负控，得到表中目标失败，再恢复并重跑全部固定检查。没有把无效尝试计为通过。最终产品文件字节与 [implementation-hashes.json](../../acceptance/wave1/b/implementation-hashes.json) 的十个文件哈希一致。

## 假设、未验证与后续

没有越界申请、契约/测试清单调整或新增依赖。路径模板的变量集合是对冻结规范“已定义环境提示”的保守实现，具体允许项记录在包 README；它不是路径解析器或删除授权机制。

仅 Windows 的 Node 元数据测试已运行；六工具均没有被启动，所有实际版本、默认目录存在性、覆盖配置、服务环境、权限/链接/锁、进程活跃、项目引用、模型唯一性、容量及恢复行为均未实测。macOS 的 Node 测试和工具行为都未运行，不将两平台文档条目写成两平台运行验证。

未扫描 HOME、整盘或真实工具/用户目录；未读取凭证，未安装/运行上游程序，没有清理动作。来源主机策略只是来源筛选，17 个页面的事实对照仍待总控独立复核。本包没有接 Rust、Tauri、扫描器或执行器，也没有产品集成或发布验收。后续实际接入、版本适配与真实目录验证需独立工单；本票无未完成交付项，现等待总控收单。
