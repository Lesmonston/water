# WATER-W1-K 补充单01：接受并展示 scope 根上的合法问题

归档状态（2026-10-18）：本补单已VERIFIED（Windows受控合成范围），不再外贴或从e717519重做。以下为原票面约束；当前以主manifest和[总控复验报告](../../acceptance/wave1/controller/WATER-W1-K-ADDENDUM-01-REVIEW-20261018.md)为准。

总控 Codex，2026-10-18。CHANGES_REQUESTED，补单已准备、待用户外贴。绑定[原 K 工单](WATER-W1-K-LAB-READER-20261018.md)。原基线、分支、132 冻结、helper、五测试名及物理权限不变。

| 项 | 唯一值 |
|---|---|
| 权威补单 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-K-ADDENDUM-01-20261018.md` |
| 唯一树 / 分支 | `F:/new/smaltalk/water/.worktrees/k` / `worker/water-w1-k` |
| 原基线 | `bc409f4af8cb2d51b2f67341ad46637cfa5e66f3`，保持 |
| 首次续做起点 | `e717519a14f5d561c0ba18aa7d5299870828aa5a`，必须精确 HEAD 且干净 |
| 原受测实现 | `7d0035582db8457a47d6c611ff02427296ba641c` |
| 权威 manifest | `F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json` |
| 新回执 | `F:/new/smaltalk/water/.worktrees/k/docs/dispatch/reports/WATER-W1-K-ADDENDUM-01-REPORT.md` |
| 新证据 | 本树 `docs/acceptance/wave1/k/addendum-01/`；原 helper 输出仍在 `.local/checks/WATER-W1-K/` |
| 回归输入源 | 主检出 `docs/acceptance/wave1/controller/w1-k-review-20261018/actual-j-regression-bundle.json` |
| 输入长度 / SHA-256 | `169500` 字节 / `d7ba80c113ef357b3ba675a9f51bacd8dc151734a458e6e5b6bdc450e15f9b62` |

先读主检出 README/STATUS/AGENTS/工作流、原票、本补单、原纪律、[K验收报告](../../acceptance/wave1/controller/WATER-W1-K-REVIEW-20261018.md)、冻结 lab-reader/lab-session SPEC、scan-lab SPEC 的遍历与错误段及 scan-report SPEC。权威票面在主检出，直接读，不 merge 主线取票。不运行首次 baseline，不重置/切树/改旧证据或 helper；起点不符则保留现场交受阻回执。

## 已复现与正确语义

总控在隔离 `f16972f81dab02e2a51ad0e4a408c01a405b9ea6` 重建真实 J/F/G/A/E/H：J 五测试及格式/clippy/metadata、K 原五测试均通过；13 个真实 J 快照全部六字段与独立 F/G/A/E/H 逐值一致，真实 I 接受全部13个 view。将这13个快照直接传给 K.startServer 时却抛出 `Unsupported lab session.`，没有启动实际 J→K 页面。

唯一被 K 单份拒绝的是 `pipeline-8 / entry-budget / partial`：`source_facts.scopes[0].issues[0].relative_path`、report/view 对应 issue 路径均为 `""`。这是冻结 F 的 scope 根相对路径，且已通过 G/A/E/H/J，不是无效数据。`null` 是没有具体条目路径；`""` 是 scope 根；普通相对路径指条目。冻结 F SPEC 明确根错误用空串，预算问题可指当前父目录。不得把空串转成 null、伪造目录名、删除问题或去掉该快照。

根因已定位 K `model.mjs:119`：把 issue 路径交给要求非空的 entry/root 校验器。保持同一真实 bundle，其余字段不变，仅在内存中同步把三处空串改为一个非空诊断标签后 K 接受；此诊断只用于定位，不是修复或新的 J 实测值。原失败和定位证据见总控报告。

## 必须修复和回归

1. 仅 issue.relative_path 接受 `null`、`""` 和原先合法的非空相对路径；完整保留原值及 facts/report/view 的对应关系。entry.relative_path、scope.relative_root 仍须非空；绝对路径、盘符、反斜杠、控制字符、点段/父段等继续拒绝。不能全局放宽 path 校验或关闭真实 I 校验。
2. 来源问题区明确将 `""` 显示为“scope 根”，与 `null` 的“无相对路径”区分；普通路径按文本显示。保留 code/origin/operation、scope ID、来源状态和完整 facts，不改 totals/计数或造扫描动作。动态内容仍为 textContent，不形成 URL/HTML。
3. 只复制上表那份总控实际 J bundle 到本树 `docs/acceptance/wave1/k/addendum-01/actual-j-regression-bundle.json`，复制前后核169500字节与指定SHA；不读取任何 J/F 物理 fixture 或其它树 .local。该 JSON 是保留的真实受控 J 输出，不是新物理扫描。仅测试可读此证据输入，生产仍只接受调用方内存 bundle，不能硬编码该路径/scan_id或从文件兜底。
4. 在现有 `reader_session_contract` 内增加完整13份 bundle 和逐份快照接受/输入不变、根 issue 空串完整保留；同时回归 entry/root 空串及 issue 非法路径拒绝。用至少空串/null/普通路径三个合法内存变体区分语义，变体在facts/report/view同步修改并注明并非新的物理捕获。
5. 在现有 `reader_session_live_input` 内把实际回归 bundle 通过真实 startServer/HTTP/Chrome，HTTP 全值等于原输入；选择 pipeline-8，页面 partial、两条 finding/两条 protected、一项 entry_limit/policy/budget、“scope 根”、来源总量未知可见，再切其它实际 scan_id。不能拦截响应或用 expected 替代服务。保留原两份调用方 bundle、精度/HTML、键盘/焦点及双尺寸用例。仍精确三模型、两浏览器顶层测试，无 skip/降断言或新依赖。

## 范围与验证

仅允许修改原票 `prototypes/lab-reader/model.mjs`、`app.mjs`、现有两个测试文件、必要 `README.md`，以及本补单新回执和 `docs/acceptance/wave1/k/addendum-01/` 新证据。不需要改 HTML/CSS/server、I、J或旧模块；确需额外修改则回受阻，不自行扩面。原报告/旧证据原字节保持。manifest仅增加本补单报告白名单，其它原范围不扩大。

先写完整回归测试，在未修生产源码上运行完整 suite 留有效行为红：

```powershell
node scripts/session-batch-check.mjs --task WATER-W1-K --mode red-behavior
```

新增目标断言消息同时含 `K_BEHAVIOR` 和 `K_ROOT_ISSUE_PATH`。这次红必须来自合法根 issue 被拒绝/错误展示；完整五测实际执行、子进程退出1，不能是缺证据文件、语法/超时等。随后修产品并 suite 五测绿。最终测试字节变化，因此按未改 helper 的 proofAudit 规则，必须重新在稳定最终生产/测试字节上完成原 red-nc1/2/3，每次只改原对应真正逻辑、命中原目标标记，立即原字节恢复并普通 suite 五测绿；完整原日志/源码/测试快照保留。原 nc 规则不变，不用更改测试/测试开关造红。

补充根路径修复也要反向验证：在最终生产 model 中暂时恢复“非 null issue 一律要求非空”的真实逻辑，在测试不变时通过原 `red-behavior` 再录 `K_BEHAVIOR/K_ROOT_ISSUE_PATH` 红，原字节恢复后立即完整 suite 绿；明确此条为实现后的负控重放，不能称首次修复前红。报告同时引用首次修复前记录与该重放，并记录原/坏/恢复SHA。后续若再改生产/测试字节，重建受影响的完整红/恢复链，不改helper避开校验。

提交实现/测试后，同一干净 SHA 串行运行：

```powershell
node scripts/session-batch-check.mjs --task WATER-W1-K --mode check --final
node scripts/session-batch-check.mjs --task WATER-W1-K --mode test --final
node scripts/session-batch-check.mjs --task WATER-W1-K --mode browser --final
```

沿用模型30秒/浏览器120秒/suite150秒，一次一门、最多一个独立 Chrome，保留 profiles。按原票真实查看三张新截图并记录内容；补单可另存一张显示 pipeline-8 根问题的页面截图作证据。不要改最后两张尺寸截图为不符合原测试目的的替身。

原 helper 本树所有 JSON/log/txt/png 按原字节归档本补单目录；首次提交前核 source fixture 与全部证据哈希，显式文件名 add（日志用-f，不批量整个目录）。新回执写实现完整SHA、根路径与路径拒绝用例、真实供数页面、首次红/根路径负控重放/三原负控及恢复/最终门完整日志、全部失败、截图与实际模型。后加证据提交不得夹未复测产品修改。

无物理fixture、真实用户数据、npm、扫描/删除/执行器权限；不清理日志/旧run/profile、不合主线或push。总控保留已失败的原集成树与81717字节夹具，补单交回后由总控复用该批夹具再验真实 J→K；执行者不得进入该树修复或运行总控runner。补单准备好不代表已外贴或正在执行。

报告首行及完成通知：

```text
WATER-W1-K 补充单01 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/k/docs/dispatch/reports/WATER-W1-K-ADDENDUM-01-REPORT.md
```
