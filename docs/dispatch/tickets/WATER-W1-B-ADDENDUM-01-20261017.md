# WATER-W1-B 补充单01：数组输入不能绕过校验

总控：Codex。2026-10-17。CHANGES_REQUESTED，待用户转贴。本单绑定[原工单](WATER-W1-B-CATALOG-20261017.md)，修复原纯校验API的构造输入边界，不改冻结协议或六工具事实数据。

| 项 | 唯一值 |
|---|---|
| 工作树/分支 | `F:/new/smaltalk/water/.worktrees/b` / `worker/water-w1-b` |
| 原基线 | `e92f39647c91d9ce077d592583c3352626d3402b`，保持不变 |
| 首次续做起点 | `d05eae7b5a0fe5c952744336a776a8c5ee1b2873`，必须精确等于此SHA且干净 |
| 原受测实现 | `dd3f1a19b9b72259fc3e47c2867f6725c7b42430` |
| 权威manifest | 主检出`F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json`的本票字段 |
| 新回执 | `F:/new/smaltalk/water/.worktrees/b/docs/dispatch/reports/WATER-W1-B-ADDENDUM-01-REPORT.md` |
| 新证据 | 本树`docs/acceptance/wave1/b/addendum-01/`；helper仍写原.local目录 |

## 已证实的问题

原check/test由总控独立通过，五测试全执行；另加边界检查复现：`validate.mjs`数组分支仅检查Array.isArray及自有元素，后续却调用输入数组继承的some/forEach。构造数组可以跳过来源与顺序检查，并执行输入提供的方法。

最小例子，在完整合法包的内存克隆上：

```js
let calls = 0;
const refs = ['missing-controller-source'];
Object.setPrototypeOf(refs, Object.create(Array.prototype, {
  forEach: { value() { calls++; } }
}));
entries.pip.assets[0].source_ids = refs;
// 实际：validateCatalog(index, entries)返回valid:true，calls为1。
```

第二例：将index.tools反转，再赋予继承的some返回false，实际也valid:true。普通JSON.parse的数据没有复现此绕过；这是公开JS对象校验入口的具体遗漏，不宣称已发生真实扫描、删除或远程攻击。[总控报告](../../acceptance/wave1/controller/WATER-W1-BC-REVIEW-20261017.md)保留完整输入与结果。

## 必须修复与回归

1. 纯数据数组与非数据数组必须在语义访问前得到可靠处理。可以拒绝自定义数组原型并返回`shape`及固定数据路径，也可采用不会执行输入方法的等价校验；不能依赖输入的some/forEach/迭代方法来决定它是否满足规则。
2. 上述来源悬空和顺序反转必须被拒绝，输入继承方法及继承访问器均不执行。拒绝数组原型时错误指向对应数组；若按真实元素语义判断则使用source_ref/tool_set。不要回显未知值/键。
3. 增加两例和相关数组层级回归，包括null原型数组的明确处理：接受时完整检查真实元素，拒绝时返回结构化错误，不能因缺少方法抛TypeError。普通合法数据、深冻结输入、原24项变体、访问器及全部来源/能力边界继续通过。
4. 仍精确五个顶层测试，在现有`catalog_mutation_rejections`/`catalog_purity`及辅助函数中补充。无需处理任意Proxy陷阱、被全局篡改的JS内建或建立JS执行沙箱；本单范围是上述实际构造数组输入，避免扩成重写整个校验框架。

## 文件、验证与交回

只改原票`packages/tool-catalog/validate.mjs`、现有测试、必要的README，以及本单新报告/新证据。保持index/六JSON事实条目、冻结文件、依赖、helper和原报告/证据原字节。B不依赖A/C补单，不读写其他工作树；主检出只读，禁止merge取票或运行总控验收runner。

首次核准上述起点，不再运行首次baseline，不安装依赖。先新增回归，在未修实现上运行原完整test，保留目标断言红；修复后check/test通过。新增NC-04：临时移除真实数组边界修复，让新增来源/顺序或“不执行方法”断言失败，再原字节恢复、核三个SHA256、完整test通过。不要改测试造红，无需重做原三项负控。

提交实现与测试后，在同一干净实现SHA串行运行：

```powershell
node scripts/parallel-check.mjs --task WATER-W1-B --mode check --final
node scripts/parallel-check.mjs --task WATER-W1-B --mode test --final
```

新回执列受测完整SHA、新用例与原变体覆盖、先红/NC-04/恢复日志及哈希、最终两个receipt、真实引擎、macOS未验证。后加报告/证据提交不夹带产品变更。主manifest只新增本单报告白名单，旧基线和冻结锁不变。

完成通知及新报告第一行：

```text
WATER-W1-B 补充单01 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/b/docs/dispatch/reports/WATER-W1-B-ADDENDUM-01-REPORT.md
```

冲突或起点不符则保存现场并写本单受阻回执，不重置/覆盖、不自行换树。完成停止，由总控复验，不合主线、不push/发布。
