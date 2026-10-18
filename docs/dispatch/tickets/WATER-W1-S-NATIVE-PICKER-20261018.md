# WATER-W1-S：Windows原生单目录选择与真实N/P登记

归档状态（2026-10-19）：本票已VERIFIED并集成（Windows受控范围），不要再次外贴或执行首次baseline。当前以manifest及[S总控验收](../../acceptance/wave1/controller/WATER-W1-S-REVIEW-20261019.md)为准，以下为原票历史。


总控2026-10-18。正式可执行票；状态以主manifest的本票记录为准，只有READY且baselineStatus=PASSED才开工。用户手动外贴，不自动启动实现者。本波R补单/S/T/U可以并行。

| 项 | 唯一值 |
|---|---|
| 权威票面 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-S-NATIVE-PICKER-20261018.md |
| 唯一工作树 | F:/new/smaltalk/water/.worktrees/s |
| 分支 | worker/water-w1-s |
| 精确首次基线 | 3d0faefa97267a6aa57f880a315a2cde7fe06e98 |
| 固定tag | water-w1-parallel-wave-base-20261018 |
| manifest | F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json |
| 冻结锁 | contracts/parallel-wave-v1/freeze.lock.json（继承12旧锁，291唯一冻结） |
| 实现目录 | packages/native-picker |
| 回执 | F:/new/smaltalk/water/.worktrees/s/docs/dispatch/reports/WATER-W1-S-REPORT.md |
| 证据 | F:/new/smaltalk/water/.worktrees/s/docs/acceptance/wave1/s/ |

先读主检出README、STATUS、AGENTS、CONTROLLER-WORKFLOW、ADR-013、本波PLAN/READY-REPORT、本票、W1-PARALLEL-WAVE-WORKER-RULES、contracts/parallel-wave-v1/COMMON.md及TESTS.json、contracts/native-picker-v1/SPEC.md。S再读SOURCES/N/P API；T再读PROVENANCE/bundle和真实I/H/Q规格；U再读cases。票面在主检出，直接读权威绝对路径；执行树早于正式票，不merge取票。

首次必须精确HEAD/分支、干净、实现目录不存在。baseline已由总控在此树实际运行，执行者仍先复核一次；不符保留现场回受阻，不自行换树/reset。只在本票树运行：

```powershell
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode baseline
```

baseline只验证已验收依赖/冻结输入/实际工具，不表示新产品或五测试通过。本树受控fixture索引已由冻结工具创建，保留并复用。

## 实现要求

实现必须是真实 IFileOpenDialog 的 Show/GetResult，不把初始目录当所选结果。先纯词法/真实N初始目录检查，STA/COM/CoTaskMemFree全路径RAII；取消无登记，成功使用所选实际路径真实P.prepare/confirm，确认失败decline本次pending。没有R扫描、HTTP/IPC或任意路径SelectedScope构造器。

五测试职责依次：纯构造/错误和初始非法/junction无弹窗；实际取消无槽占用；实际选择返回scope_id/root身份；实际full/duplicate失败无额外槽泄漏；公开SelectedScope到P.begin/check/finish/revoke链。GUI用本票固定index（WATER_PICKER_INDEX），stderr逐窗口标记 WATER_PICKER_CASE cancel/select，冻结driver只点击当前测试PID固定title按钮，真实root来源不得硬编码expected。baseline控制工具本身不是产品实现。

初次行为红也必须走实际模态交互的可运行骨架，不能因无窗口/无marker/驱动失败造红；全部suite至少包含真实cancel和select动作。S三负控按SPEC分别改坏真实取消映射、scope ID传递、返回前错误撤销。unsafe仅native_windows.rs并逐处SAFETY，其余模块禁止unsafe。只有冻结prepare可建本树4空目录/1junction，普通内容0字节，无清理。实际模态窗口短暂可见为本票验证所需，不浏览真实用户目录。

## 独占改动白名单

- `packages/native-picker/Cargo.toml`
- `packages/native-picker/Cargo.lock`
- `packages/native-picker/README.md`
- `packages/native-picker/tests/picker_v1.rs`
- `docs/dispatch/reports/WATER-W1-S-REPORT.md`
- `packages/native-picker/src/` 内新文件（src仅Rust；证据只文本/json/log/png）
- `docs/acceptance/wave1/s/` 内新文件（src仅Rust；证据只文本/json/log/png）

此外所有文件只读：根Cargo、旧产品、冻结SPEC/输入/helper/锁、台账、其它树、上游checkout。依赖/接口/文件范围不符写受阻回执，不扩面/安装/fetch/改全局配置。独立workspace及私有Cargo.lock，仅helper lock模式可离线生成；依赖/version/checksum精确按SPEC，不改根锁。

## 五测试、负控与最终门

精确五顶层测试：picker_options_and_errors、picker_native_cancel、picker_native_confirm、picker_registry_failures、picker_public_lifecycle。不得skip/过滤/嵌套凑数/修改runner。最多单子命令180秒，一树一次一门；Rust1.95/MSVC、私有offline/locked/jobs1，不运行上游或整仓全量检查。

先完整写测试及可编译骨架，使用lock模式离线生成本票锁；完整测试的目标行为断言消息必须含 S_BEHAVIOR，再运行 red-behavior 留有效完整五红，随后实现并 suite 五绿。编译/缺文件/窗口/CDP/超时不是有效行为红。稳定最终代码与测试字节后，逐项按SPEC暂时改坏真实生产逻辑，red-nc1、red-nc2、red-nc3（目标 S_CANCELLED/S_SCOPE_ID/S_REGISTERED），每红之后立即原字节恢复、核哈希并 suite 完整五绿。不能改测试或加测试专用开关造红。

统一命令形态（mode分别取red-behavior、suite、red-nc1、red-nc2、red-nc3；Rust另有lock）：

```powershell
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode suite
```

final会核四条当前源码/测试字节的有效红与逐次恢复。首次行为红保留；若后续测试/源码改变导致它不能绑定当前字节，最终版上暂时恢复相同行为缺陷，red-behavior重放→原字节恢复suite绿，明确标注为实现后负控重放。不要把重放冒称首次先红。格式/样式变化也影响源码哈希，先稳定再完整留链。所有失败日志和源码原/坏/恢复快照保留。

提交实现/测试得到干净SHA，同一SHA串行跑全部final：

```powershell
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode fmt --final
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode test --final
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode clippy --final
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode metadata --final
node scripts/parallel-wave-check.mjs --task WATER-W1-S --mode bridge --final
```

全部helper输出在本树.local/checks/WATER-W1-S/。按原字节归档json/log/txt/png及ARCHIVE.json（来源/长度/SHA）到本票证据目录；不纳入target/cache/profile/下载文件或fixture。预置.gitattributes不可改。显式文件名git add（log用-f），仅提交自己的实现/测试/报告/证据，不批量全树add，不clean/reset/merge/rebase/push。最终证据/报告提交不得夹未复测产品修改。

回执逐需求说明、完整基线与受测SHA/报告SHA、实际改动、全部命令/退出码/日志、先红/三负控与恢复、全部失败、边界和未验证、实际引擎/模型。完成只到SUBMITTED，总控另做独立验收集成；Windows不冒充macOS/M1完成。交回后停止修改。

报告首行及通知：

```text
WATER-W1-S 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/s/docs/dispatch/reports/WATER-W1-S-REPORT.md
```

受阻把“已完成”改为“受阻”，说明最小补充需求，不要求用户临时放宽权限。
