# B/C补充单01复验与集成

日期：2026-10-17。当前结论：**B、C单票ACCEPTED，独立集成验证待执行**。A保持原单独状态，不在本次复验范围。最终主线集成结果在本报告末尾更新。

## 已复核提交

| 项 | B | C |
|---|---|---|
| 原补单起点 | `d05eae7b5a0fe5c952744336a776a8c5ee1b2873` | `93e2509882f3090883c8ccaedf2fb30e83dba49a` |
| 本单受测实现 | `22dd6c41b6d75edba027cfc9ab4f36b6f6dfc84f` | `973020e3027e99085be514d38523a5a88954df3e` |
| 交回/接收提交 | `5b88fd0c5f306df5586e8c8445d45f39940e8597` | `d8cc6979813ecf2ff03898d40b8ae217b1df29f8` |

两树干净，原基线仍为祖先，各9项冻结材料不变。B只改校验器/现有测试/README，C只改模型/现有模型测试；旧数据、旧报告/证据以及冻结工具没有变化。实现后的收尾提交只有新报告和证据。执行者通用模型自述为GPT-6；用户提供的完成截图标题显示gpt-6.1-sol · xhigh，台账保留来源区别。

B在统一数组分支、读取语义之前拒绝非当前Array.prototype的数组；自定义/null原型返回固定路径shape，不调用继承行为。原24项变体保留，新增15个数组位置的45项普通/15项冻结拒绝与两项目标回归，共62次诊断。C先区分已知/未知组，组内名称比较按普通JS字符串进行；大小排序未知仍稳定、已知仍BigInt，回归覆盖两组同名稳定、双向排序与输入不变。

三条内部辅助只读复核源码、测试和证据，未运行产品或修改文件，均未发现阻断问题：B37份保护哈希及3产品哈希、11条封装日志原字节对照；C25份证据大小/哈希、源码及冻结哈希一致。两项NC-04可从真实源码在内存重建相同坏态哈希，日志均命中约定目标AssertionError；恢复哈希与当前产品相符。总控没有改worker产品，也没有重复破坏性变异。

## 总控独立运行

下列在原分配树、各自交回HEAD上串行运行，Node v24.16.0 / Windows，前后SHA及干净状态一致：

| 命令 | 结果 | receipt |
|---|---|---|
| B `parallel-check.mjs --task WATER-W1-B --mode check --final` | 0 | [语法](w1-bc-addendum-01-20261017/b-2026-10-17T08-06-35.579Z-38128-check-result.json) |
| B `--mode test --final` | 0，5 passed，零跳过 | [测试](w1-bc-addendum-01-20261017/b-2026-10-17T08-06-38.706Z-10460-test-result.json) |
| C `parallel-check.mjs --task WATER-W1-C --mode check --final` | 0 | [语法](w1-bc-addendum-01-20261017/c-2026-10-17T08-06-43.038Z-38436-check-result.json) |
| C `--mode test --final` | 0，5 passed，零跳过 | [模型](w1-bc-addendum-01-20261017/c-2026-10-17T08-06-48.872Z-35368-test-result.json) |
| C `--mode browser --final` | 0，2 passed，零跳过；本轮首次通过 | [浏览器](w1-bc-addendum-01-20261017/c-2026-10-17T08-06-52.023Z-26992-browser-result.json) |

复用[原独立边界检查](../../../../scripts/acceptance/review-bc-boundaries.mjs)，只增加证据目录参数以保留历史归档，不改变任何断言：

```powershell
node scripts/acceptance/review-bc-boundaries.mjs --b-head 5b88fd0c5f306df5586e8c8445d45f39940e8597 --c-head d8cc6979813ecf2ff03898d40b8ae217b1df29f8 --evidence-dir docs/acceptance/wave1/controller/w1-bc-addendum-01-20261017
```

[实际receipt](w1-bc-addendum-01-20261017/2026-10-17T08-08-29.506Z-35596-boundary-result.json)：退出0，六项全部通过。合法包通过；两例构造数组均返回shape且继承调用数0；未知名称顺序为known,a,z；900宽详情滚动及八条固定提示文字均可见。产品文件前后哈希、SHA与干净状态复核通过。

总控实际查看本轮[1440页面](w1-bc-addendum-01-20261017/c-dashboard-1440x1000.png)、[900页面](w1-bc-addendum-01-20261017/c-dashboard-900x800.png)和[详情](w1-bc-addendum-01-20261017/c-detail-1440x1000.png)：布局与只读标识清楚、未知/待去重/未估算口径保留，900宽筛选换行、无横向裁切。当前固定画面只有一项未知，名称修复由真实公开model入口证明。

## 集成安排与边界

总控将从当前主线创建`controller/water-w1-bc-20261017`独立树，仅合入上述两个接收提交。使用[集成门](../../../../scripts/acceptance/check-bc-integration.mjs)核对目录Git tree与接收提交一致，复跑7项模块语法、B五测试/C五模型/两浏览器，以及真实公开入口反例和文档元数据。通过前不推进main、不改worker树。

这次集成仅指元数据包与固定数据原型纳入同一仓库，二者尚未互相接线，也未接Rust、真实扫描或清理。Windows检查不代表macOS；历史浏览器导航偶发超时未因本轮通过而被宣布修复。六工具运行、文件身份、实际容量/回收/恢复、打包签名及发布仍未验证。

## 集成结果

待独立集成树验证完成后由总控补记真实提交与receipt。
