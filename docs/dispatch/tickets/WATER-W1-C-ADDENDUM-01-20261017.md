# WATER-W1-C 补充单01：未知容量组内的名称排序

总控：Codex。2026-10-17。CHANGES_REQUESTED，待用户转贴。本单绑定[原工单](WATER-W1-C-PROTOTYPE-20261017.md)，修复公开model API的排序边界，不改变冻结fixture和界面方向。

后续状态：本补单已交回并经总控独立复验及集成门通过，VERIFIED（当前Windows范围）；不再按首次续做段重复执行。最新状态见主manifest及[复验报告](../../acceptance/wave1/controller/WATER-W1-BC-ADDENDUM-01-REVIEW-20261017.md)，下文保留原派单约束。

| 项 | 唯一值 |
|---|---|
| 工作树/分支 | `F:/new/smaltalk/water/.worktrees/c` / `worker/water-w1-c` |
| 原基线 | `e92f39647c91d9ce077d592583c3352626d3402b`，保持不变 |
| 首次续做起点 | `93e2509882f3090883c8ccaedf2fb30e83dba49a`，必须精确等于此SHA且干净 |
| 原受测实现 | `5b16904000e5102227a4b8ff166c284227688310` |
| 权威manifest | 主检出`F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json`的本票字段 |
| 新回执 | `F:/new/smaltalk/water/.worktrees/c/docs/dispatch/reports/WATER-W1-C-ADDENDUM-01-REPORT.md` |
| 新证据 | 本树`docs/acceptance/wave1/c/addendum-01/`；截图先写原.local/browser-lab |

## 已证实的问题

总控独立check、五模型测试通过，真实浏览器两测试在同一干净提交重跑后通过；常规界面及截图已实际查看。详情内滚动的只读标识候选经八条固定数据实测排除，不要求为此修改CSS或布局。

实际缺陷位于`model.mjs`第7行：两个logical_bytes=null的项提前return 0，使name_asc无法对未知组按名称排序。构造三个合法同形finding，输入顺序为`unknown-z/title=z/null`、`unknown-a/title=a/null`、`known/title=m/"1"`，实际ID为`known,unknown-z,unknown-a`；冻结SPEC要求未知末尾且name_asc按名称比较，预期`known,unknown-a,unknown-z`。

固定八条fixture只有一个null，因此现有画面不暴露该缺陷；原测试也在同形构造数据上验证排序，公开函数边界仍须满足。[总控报告](../../acceptance/wave1/controller/WATER-W1-BC-REVIEW-20261017.md)保留输入和真实结果。

## 必须修复与回归

1. name_asc先保证未知容量组在末尾，已知组与未知组内均按title.toLowerCase()普通JS字符串升序；同名项稳定保留原序。不使用locale、Number或浮点转换。
2. size_asc/size_desc的null末尾、未知之间稳定、BigInt双向精度与等值稳定继续保持。筛选、输入不变性、空间不累加及安全展示语义保持。
3. 在现有`prototype_bigint_order`及辅助函数中增加至少两个未知项的名称升序、同名稳定、两个大小方向未知稳定回归；仍精确五个模型与两个浏览器顶层测试。不得改冻结fixture掩盖边界。

## 文件、验证与交回

仅改原票`model.mjs`、现有`tests/model.test.mjs`、必要README，以及本单新回执/新证据；本修复无需修改HTML/CSS/app/server/browser测试。发现额外必须改动先报总控。不修改旧报告/旧证据、冻结材料、helper、浏览器工具或其他树，不安装依赖/浏览器，不接真实扫描或Rust。

首次核准上述起点，不再运行baseline。先加回归，在未修model上运行完整test留下目标红。修复后新增NC-04：在真正比较器临时恢复两个null提前相等的行为，确认新增名称断言红，原字节恢复核三个SHA256，完整test通过；无需重做原三项负控。

提交实现/测试后，同一干净实现SHA串行运行：

```powershell
node scripts/parallel-check.mjs --task WATER-W1-C --mode check --final
node scripts/parallel-check.mjs --task WATER-W1-C --mode test --final
node scripts/parallel-check.mjs --task WATER-W1-C --mode browser --final
```

当前冻结浏览器工具曾在首次Page.navigate偶发超时，总控同提交重跑也观察到一次；这不是本单已证明的UI缺陷。不得改冻结工具/超时、加静默重试或跳过浏览器断言。若遇同类环境失败，保留失败receipt，在确认干净且源码未变后允许原命令手动重试一次；仍失败则写受阻回执。不得把导航超时算先红或负控。

最终门后再复制新截图/日志到本单目录，实际查看截图并记录。新回执包含受测SHA、模型新断言、先红/NC-04/恢复哈希与日志、三个最终receipt、全部失败尝试、实际引擎及macOS未验证。后加报告/证据提交不夹带产品改动；原基线、冻结锁、测试名不变。

完成通知及新报告第一行：

```text
WATER-W1-C 补充单01 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/c/docs/dispatch/reports/WATER-W1-C-ADDENDUM-01-REPORT.md
```

B/C补单互不依赖，也不依赖A补单。起点不符或范围冲突则写本单受阻回执，不重置/覆盖。交回后停止，总控再验收，不自行合主线或发布。
