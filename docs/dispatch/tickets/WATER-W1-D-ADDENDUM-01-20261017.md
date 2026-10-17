# WATER-W1-D 补充单01：拒绝数组上的非索引属性

归档状态（2026-10-18）：本票及所绑补单已完成并VERIFIED（Windows范围），不再外贴。下文“返工/待外贴/首次起点”均为历史；当前以[验收报告](../../acceptance/wave1/controller/WATER-W1-D-ADDENDUM-01-REVIEW-20261017.md)和主manifest为准。

总控：Codex。日期：2026-10-17。CHANGES_REQUESTED，待用户外贴。绑定[原单](WATER-W1-D-FIXTURE-LAB-20261017.md)，不改冻结契约、helper、基线或原五测试名。

当前更新：本补单已完成并通过总控单票及隔离集成，接收HEAD `711c38c9d626c4ceb624a48173356887c913d9c7`，VERIFIED（Windows范围）。见[验收报告](../../acceptance/wave1/controller/WATER-W1-D-ADDENDUM-01-REVIEW-20261017.md)。下文是历史执行票面，不从b92d起点重复执行。

| 项 | 唯一值 |
|---|---|
| 权威补单 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-D-ADDENDUM-01-20261017.md` |
| 工作树 / 分支 | `F:/new/smaltalk/water/.worktrees/d` / `worker/water-w1-d` |
| 原基线 | `7007c65d5845c3fe5938d920e930c8bcb7ffc4e0`，保持不变 |
| 首次续做起点 | `b92d5b8dff8802d1e403e59c08eb1cd4fb175f5f`，精确一致且干净 |
| 原受测实现 | `58fc5973a1d68555bbd41fdf4c6d2990cbff870d` |
| 新回执 | `F:/new/smaltalk/water/.worktrees/d/docs/dispatch/reports/WATER-W1-D-ADDENDUM-01-REPORT.md` |
| 新证据 | 本树 `docs/acceptance/wave1/d/addendum-01/`；helper仍用原`.local/checks/WATER-W1-D/` |

## 已复现

原check与五测试总控复跑均通过，但SPEC要求逐层拒绝未知字段。对冻结清单作内存深拷贝后执行：

```js
Object.defineProperty(copy.cases[0].nodes, '4294967295', {
  value: 'CONTROLLER_UNKNOWN_ARRAY_DATA', enumerable: true
});
validateFixtureManifest(copy); // 当前错误返回 { valid: true, errors: [] }
```

此键是普通属性，不是数组索引，也不改变length。`readArray`接受数字形式键，却只读取`0..length-1`，导致额外数据被忽略。总控在cases、nodes、scopes、canaries、faults、expected_issue_codes六类数组，分别加`4294967295`、`9007199254740992`、`999999999999999999999999999999`，18例全部错误接受。每例预期invalid，errors至少含`{code:"shape",path:该数组pointer}`。

证据与可复核runner见[验收报告](../../acceptance/wave1/controller/WATER-W1-AD-REVIEW-20261017.md)。本问题在纯内存校验中复现，没有使用非法清单物化或越界写。尾换行属性键已被当前实现拒绝，不属于本单缺陷；不扩大到未实证的路径问题。

## 必须修复

1. 所有数组层只允许自身length和规范、真实、落在length内的数组索引。数字形式的普通属性不能被忽略；非索引键统一shape定位数组本身，不回显键或值。继续拒绝稀疏数组、访问器、自定义数组原型及其他未知属性，不调用输入方法或getter。
2. 在现有`fixture_manifest_and_cases`中加入上述18例精确code/path回归；正例仍验证完整冻结清单。保留原18冻结负例、逐层缺字段/未知键、深冻结与纯度断言。仍精确五个顶层测试，不新增测试文件或改冻结材料。
3. 原物化/路径/链接/声明式计划及全部invalid_run_ids测试继续运行；纯校验修复不改变物化API、marker、平台能力、故障计划或写入边界。

## 范围与检查

先读原票、本补单、AGENTS、工作流、D规则、冻结SPEC和总控报告。核对起点、分支、干净状态及8冻结哈希；不要重跑首次baseline/probe、merge主线取票、安装依赖、改helper或锁。主检出`scripts/acceptance/`只作参考，不复制或运行总控runner。

仅改原单的materialize.mjs、现有materialize.test.mjs、必要包README，以及新回执/新证据。旧回执、旧证据和.gitattributes原字节不动。manifest只增加新回执白名单。没有其他树、真实用户数据、扫描/删除/清理权限；历史run继续保留。

先加回归，在未修实现上完整test，留下目标AssertionError；再修实现。新增NC-04：临时撤去真实数组索引范围判断，使至少上述一例被接受，完整test命中新增断言失败；只变纯校验，不运行非法物化。记录原/坏/恢复三个SHA256，按原字节恢复并完整test通过。编译失败、超时或测试专用开关不算负控；不重做原三项历史负控。

提交实现后，在同一干净SHA串行执行：

```powershell
node scripts/fixture-check.mjs --task WATER-W1-D --mode check --final
node scripts/fixture-check.mjs --task WATER-W1-D --mode test --final
```

仍为60秒/最多24run/1MiB，不改helper/超时或清理run。回执写完整受测SHA、18回归、先红、NC-04/恢复、两个最终门receipt、所有失败、实际模型和macOS未验证。后加报告/证据提交不含产品变更。

完成通知及新报告首行：

```text
WATER-W1-D 补充单01 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/d/docs/dispatch/reports/WATER-W1-D-ADDENDUM-01-REPORT.md
```

起点/权限不符则保存现场写受阻回执，不重置/覆盖。不合主线或push；完成后停止，由总控复验。READY或补单准备好不表示用户已外贴。
