WATER-W1-B 补充单01 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/b/docs/dispatch/reports/WATER-W1-B-ADDENDUM-01-REPORT.md

# WATER-W1-B 补充单01 回执

已完成补单交付，提交总控复验；本回执只表示 SUBMITTED，不自行标记 ACCEPTED/INTEGRATED。未修改主检出台账。

## 续做与受测提交

- 权威票面：`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-B-ADDENDUM-01-20261017.md`，绑定原 WATER-W1-B。
- 工作树/分支：`F:/new/smaltalk/water/.worktrees/b` / `worker/water-w1-b`。
- 首次续做 HEAD 精确为 `d05eae7b5a0fe5c952744336a776a8c5ee1b2873`，开工树干净。原基线 `e92f39647c91d9ce077d592583c3352626d3402b` 仍为祖先，九项冻结哈希一致，Node `v24.16.0`。按补单未重跑首次 baseline。
- 本次受测完整实现 SHA：`22dd6c41b6d75edba027cfc9ab4f36b6f6dfc84f`，标题 `WATER-W1-B ADDENDUM-01: reject custom array prototypes before semantics`。
- 两个最终门在同一干净实现 SHA 上串行通过；之后只补本报告与最终日志证据，不含产品变更。
- 实际引擎：Codex；本会话模型标识 GPT-6，具体后缀/服务端路由未暴露。未使用子代理、其他实现 CLI 或外部模型调用。

## 实际修复与要求对照

根因是结构检查接受自定义原型数组，语义阶段随后调用输入继承的 some/forEach。现于统一数组分支、任何语义访问之前要求 `Array.isArray(value)` 且原型精确为当前校验域的 `Array.prototype`；不符合时返回 `shape` 和对应数组的数据路径。

产品逻辑只变更这一处数组边界，保留原有元素描述符、未知键、来源引用及固定工具顺序检查。普通 JSON 数组和深冻结输入继续通过。自定义及 null 原型数组明确拒绝，不执行其继承方法/迭代器/访问器，也不因缺少数组方法抛 TypeError。没有扩成 Proxy 沙箱或全局内建防篡改框架。

| 补单要求 | 实现与回归 |
|---|---|
| 悬空来源 + 继承 forEach | 使用内存输入 `['missing-controller-source']` 和自定义数组原型；修复后 `shape` 指向 `/entries/pip/assets/0/source_ids`，继承调用数零。 |
| 工具反序 + 继承 some | 真实反转 index.tools 后安装继承方法；修复后 `shape` 指向 `/index/tools`，继承调用数零。此输入还经深冻结。 |
| 各数组层级、继承访问器 | 15 个数组位置分别检查继承方法、继承访问器、null 原型；15 个位置另以深冻结继承访问器输入检查。所有拒绝均核对 code/path，继承调用数零，数组原型和自有描述符不变。 |
| null 原型明确处理 | 统一拒绝并返回对应数组的 shape，所有 15 个位置均验证不抛异常。 |
| 五测试与历史边界保持 | 原 24 个命名变体、普通合法包、深冻结正向输入、自有访问器、来源/域名/能力拒绝和隔离环境哨兵继续执行并通过。未删除、skip 或降低原断言。 |
| 先红与 NC-04 | 未改实现前两个目标断言真实失败；临时移除真实边界检查又使两个断言失败，恢复原字节并核哈希，再完整 check/test 通过。 |
| 原数据和历史材料不变 | 仅修改 validate.mjs、现有测试与必要 README；只新增本单报告/证据。index、六 JSON、冻结文件、helper、原报告/证据未编辑，保留哈希核对。 |

15 个位置包括 index.tools，pip 的 assets、assets[0].source_ids、sources、sources[0].supports，以及 windows/macos 各自的 root_candidates、protected_subpaths、notes、root_candidates[0].source_ids、protected_subpaths[0].source_ids。新增诊断共 62 次：两例已证实问题，45 次普通构造数组拒绝，15 次冻结构造数组拒绝。它们仍放在原 `catalog_mutation_rejections` / `catalog_purity` 内，没有新增顶层测试。

README 明确了当前校验域原型策略和 null 原型处理。原来源事实、数据版本及运行未验证状态均未改变；本单不需要重新核对官方页面或运行工具。

## 检查、先红与恢复

所有测试均由原 helper 运行，未运行总控验收 runner。下列归档均在本树 `docs/acceptance/wave1/b/addendum-01/`；JSON 日志中的 utf8 字段保留原始日志文本，配有原字节 SHA256，并已验证解码重建后的哈希一致。没有清理或改写原 `.local` 日志、原报告或旧证据。

| 完整命令 | 退出码 / 结果 | 回执与日志 |
|---|---|---|
| `node scripts/parallel-check.mjs --task WATER-W1-B --mode test`（只加回归，未修实现） | 1；3 passed / 2 failed；两个继承方法各执行一次且结果 valid=true | [先红回执](../../acceptance/wave1/b/addendum-01/initial-red-receipt.json)、[原始日志内容](../../acceptance/wave1/b/addendum-01/initial-red-logs.json) |
| `node scripts/parallel-check.mjs --task WATER-W1-B --mode check`（初次修复） | 0；两个指定文件语法通过 | [回执](../../acceptance/wave1/b/addendum-01/first-check-receipt.json)、[日志](../../acceptance/wave1/b/addendum-01/first-check-logs.json) |
| `node scripts/parallel-check.mjs --task WATER-W1-B --mode test`（初次修复） | 0；5 passed / 0 failed | [回执](../../acceptance/wave1/b/addendum-01/first-green-receipt.json)、[日志](../../acceptance/wave1/b/addendum-01/first-green-logs.json) |
| `node scripts/parallel-check.mjs --task WATER-W1-B --mode test`（NC-04） | 1；3 passed / 2 failed；命中同两项“不执行继承行为”断言 | [回执](../../acceptance/wave1/b/addendum-01/nc-04-test-receipt.json)、[日志](../../acceptance/wave1/b/addendum-01/nc-04-test-logs.json) |
| `node scripts/parallel-check.mjs --task WATER-W1-B --mode check`（原字节恢复后） | 0 | [回执](../../acceptance/wave1/b/addendum-01/restored-check-receipt.json)、[日志](../../acceptance/wave1/b/addendum-01/restored-check-logs.json) |
| `node scripts/parallel-check.mjs --task WATER-W1-B --mode test`（原字节恢复后） | 0；5 passed / 0 failed | [回执](../../acceptance/wave1/b/addendum-01/restored-test-receipt.json)、[日志](../../acceptance/wave1/b/addendum-01/restored-test-logs.json) |
| `node scripts/parallel-check.mjs --task WATER-W1-B --mode check --final` | 0；同一干净实现 SHA | [最终回执](../../acceptance/wave1/b/addendum-01/final-check-receipt.json)、[日志](../../acceptance/wave1/b/addendum-01/final-check-logs.json) |
| `node scripts/parallel-check.mjs --task WATER-W1-B --mode test --final` | 0；5 passed，0 failed/skipped/todo/cancelled；同一干净实现 SHA | [最终回执](../../acceptance/wave1/b/addendum-01/final-test-receipt.json)、[日志](../../acceptance/wave1/b/addendum-01/final-test-logs.json) |

最终语法 receipt 原路径：`F:/new/smaltalk/water/.worktrees/b/.local/checks/WATER-W1-B/2026-10-17T08-01-04.948Z-36080-check-result.json`。

最终测试 receipt 原路径：`F:/new/smaltalk/water/.worktrees/b/.local/checks/WATER-W1-B/2026-10-17T08-01-17.666Z-42240-test-result.json`。

最终五个顶层名称仍严格为 `catalog_shape_and_tools`、`catalog_platforms_and_sources`、`catalog_protection_boundaries`、`catalog_mutation_rejections`、`catalog_purity`。最终日志含原 24 项变体诊断及 62 次新增数组诊断，均通过。关键回归直接调用实际导出的 `validateCatalog`，没有补生产配置或调用替代校验器。

## NC-04 三个 SHA256

只临时移除 `Object.getPrototypeOf(value) !== Array.prototype` 条件，使真正数组结构分支恢复旧检查。测试文件、数据文件不改，未植入开关；try/finally 恢复完整原字节。

| 状态 | validate.mjs SHA256 |
|---|---|
| 负控前 | `7ac515f15ebbdf42f66a6d3fcb80f6c4140e70ecfbc986cabb1b599b6f293c92` |
| 移除数组边界后 | `56d538c832f6d836cdf2c5c90fa6946459a65f56d28b28b8b8df596c7cd63146` |
| 原字节恢复后 | `7ac515f15ebbdf42f66a6d3fcb80f6c4140e70ecfbc986cabb1b599b6f293c92` |

两项实际失败断言为 `inherited_source_forEach: inherited input behavior must not run` 与 `inherited_tools_some: inherited input behavior must not run`，均 actual=1 / expected=0。不是缺文件、语法失败、超时或测试开关。测试文件负控前后同为 `ac19eac3e7d8d49dda61626c340c8cd9330d3660abd36db982f32e44dcc219ea`。见 [NC-04 元数据](../../acceptance/wave1/b/addendum-01/nc-04.json)。按补单无需重做原三项负控，原证据原字节保留。

## 范围、未验证与交接

[续做及保护哈希记录](../../acceptance/wave1/b/addendum-01/resume-and-preservation.json)覆盖 index/六 JSON、冻结材料、helper、原报告和旧验收证据；[本次三个产品文件哈希](../../acceptance/wave1/b/addendum-01/implementation-hashes.json)绑定受测实现。最终门后再次核对全部哈希一致；后加报告提交仅含新报告及四份最终证据。

没有契约/依赖/测试清单变更、越界申请或未完成的本单交付项。主检出只读，未读写 A/C 工作树，未合主线、push、发布、安装依赖或运行上游程序，未扫描 HOME/整盘或读取真实用户数据和凭证。没有真实扫描、清理、空间回收、Rust/Tauri 接线或运行六工具。

本次验证为 Windows / Node 24.16.0 的纯元数据测试；macOS 未验证。任意 Proxy 陷阱和被全局篡改的 JS 内建明确不在本单范围。普通 JSON 输入原行为不变，公开 JS 对象入口现在对上述非数据数组结构化拒绝。完成后停止修改，等待总控独立复验与集成决定。
