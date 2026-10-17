# WATER-W1-D：受控文件系统夹具工厂

归档状态（2026-10-18）：本票及所绑补单已完成并VERIFIED（Windows范围），不再外贴。下文“返工/待外贴/首次起点”均为历史；当前以[验收报告](../../acceptance/wave1/controller/WATER-W1-D-ADDENDUM-01-REVIEW-20261017.md)和主manifest为准。

总控：Codex。正式状态看主检出manifest。这是与A补单并行的独立实现票；不依赖未验收A，不实现扫描内核。

当前更新：补单01已通过总控单票复验及隔离集成，D为VERIFIED（Windows范围），见[验收报告](../../acceptance/wave1/controller/WATER-W1-D-ADDENDUM-01-REVIEW-20261017.md)。本页派前与退回说明保留为历史，不再外贴重做。

2026-10-17总控收单复验：原check/五测试通过，独立数组未知属性边界失败，CHANGES_REQUESTED。续做先读[补单01](WATER-W1-D-ADDENDUM-01-20261017.md)，替代本票首次baseline/probe与回执规则；其余冻结契约和权限不变。

| 项 | 唯一值 |
|---|---|
| 权威票 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-D-FIXTURE-LAB-20261017.md` |
| 工作树/分支 | `F:/new/smaltalk/water/.worktrees/d` / `worker/water-w1-d` |
| 精确基线 | `7007c65d5845c3fe5938d920e930c8bcb7ffc4e0`，tag `water-w1-fixture-base-20261017-r1` |
| 冻结协议 | `contracts/fixture-lab-v1/`；freeze.lock.json共8项哈希，只读 |
| 权威manifest | `F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json`中本票字段 |
| helper/纪律 | `scripts/fixture-check.mjs` / `docs/dispatch/W1-FIXTURE-WORKER-RULES.md` |
| 回执 | `F:/new/smaltalk/water/.worktrees/d/docs/dispatch/reports/WATER-W1-D-REPORT.md` |
| 新证据 | 本树`docs/acceptance/wave1/d/`；原始日志`.local/checks/WATER-W1-D/` |

## 开工

先读主检出AGENTS/STATUS/CONTROLLER-WORKFLOW、本票、D纪律、ADR-004及fixture-lab-v1全部材料。D树是冻结架构提交，主检出之后追加权威票/登记；不要merge主线取票，不改旧STATUS。任何路径/分支/SHA/既有修改不符，保存现场并写受阻回执，不换树或重置。

在本树先执行：

```powershell
node scripts/fixture-check.mjs --task WATER-W1-D --mode baseline
node scripts/fixture-check.mjs --task WATER-W1-D --mode probe
```

baseline只检查干净精确基线、Node24、冻结哈希和产物目录未存在；probe只在本树.local创建小型合成能力探针，不是工厂实现或扫描器测试通过。Windows当前预检支持hardlink/目录symlink/junction，不把它当作macOS证明。unsupported按冻结规范报告，不装工具/提权/改ACL。其他意外错误原样报告总控。

## 实现

1. 在唯一模块实现SPEC的纯validateFixtureManifest和显式materializeCase、FixtureError。manifest来自冻结JSON，验证后构建11类真实合成目录；不导入总控verifier来替代产品实现。
2. 输出严格限定本树.local/fixture-lab的新run；完整run_id语法、独立直接子目录边界、真实父目录、排他创建和旧run collision均要落实。模块import不写文件，caseId/options getter不执行，不接受任意根或环境覆盖。
3. 真实硬链接与目录链接按能力创建，始终指向同run拥有的目标。supported/unsupported及错误码真实；不复制代替硬链接、不用普通目录替代链接。普通IO失败不伪装unsupported。
4. marker只在成功complete/partial返回时与对象一致；致命失败可留下唯一run但不复用、不删除。fault/cancel/budget计划原样返回，scanner_executed始终false；不改真实ACL、不运行扫描、不产出ScanReport。
5. README说明API、目录范围、标记/partial/失败、资源与无回收入口、未验证平台；源事实与未来计划分开。

## 唯一文件范围

仅允许新建：

- `tools/fs-fixture-kit/materialize.mjs`
- `tools/fs-fixture-kit/tests/materialize.test.mjs`
- `tools/fs-fixture-kit/README.md`
- 本票REPORT及`docs/acceptance/wave1/d/`的文本/JSON证据。

本票证据目录.gitattributes为冻结控制文件，不可编辑。禁止根Cargo/锁/package.json、新依赖、其他模块、上游、其他树或全局配置。物理fixture只在本树.local，永不提交；不要清理历史run或执行任何通用递归删除/rename/unlink。

## 五测试与行为红

唯一测试文件用Node内置test，严格五个顶层名，具体断言按SPEC：

| 名称 | 关键证明 |
|---|---|
| fixture_manifest_and_cases | 11组有效数据及全部18个冻结内存变体、精确code/path、未知/缺字段/纯度 |
| fixture_materialization | 11case的真实普通节点/UTF-8内容/scopes/marker；仅created节点与marker存在，unsupported路径不存在 |
| fixture_paths_and_collisions | 全部invalid_run_ids含尾换行、unknown case/options、getter不执行、旧run不覆盖、独立根边界 |
| fixture_link_capabilities | 实际硬链接身份和目录链接目标、合法unsupported、canary保持 |
| fixture_declarative_faults | 计划/预算保留、实际可读权限不变、scanner_executed=false |

测试只读本包/冻结契约及自己创建的run，最多24run与1MiB内容，不扫描HOME/用户项目。能力结果写固定`.local/checks/WATER-W1-D/capabilities.json`，完成后再复制到证据目录。无test skip/filter/todo/cancelled。

先建立可导入的实现与完整测试，留下能命中真实需求断言的行为红；缺文件/语法/超时不能冒充。不能通过case id预置校验结果、降低断言、改冻结输入或增加测试专用分支。

## 三项负控、检查与回执

逐项临时修改真正逻辑：

- NC-01仅放宽run_id真实大小写约束，让`run-UPPER`的invalid_run_id断言失败，保持独立路径边界；不禁用全部路径检查，不进行越界写。
- NC-02让既有run被复用/返回（无需覆盖任何文件），让collision断言失败。
- NC-03将真实非空fault/cancel计划丢失，让declarative_faults字段断言失败。

每项运行完整五测试，证明目标AssertionError；记录源文件/行、命令、日志、退出码、原/坏/恢复三个SHA256，逐项原字节恢复，再完整test通过。不要改测试造红，不清理run来掩盖collision。

唯一检查命令：

```powershell
node scripts/fixture-check.mjs --task WATER-W1-D --mode check
node scripts/fixture-check.mjs --task WATER-W1-D --mode test
```

一次一个检查。test超时60秒，不改helper/超时；失败按证据定位。helper检查scope/冻结与TAP，不是OS沙箱，守规和源码复核仍必要。

实现/测试提交后，在同一干净SHA串行运行check/test并加`--final`；都通过后再复制能力、原始日志和报告作纯证据提交，不夹带新产品变更。原始证据TXT/JSON已设字节保留，.log需显式git add -f指定文件；不要批量add，不提交.local或二进制程序。

回执绑定受测完整SHA，列11组/18负例/5测试、能力结果、先红与3负控/恢复、所有失败尝试、未验证平台、实际引擎。缺Git身份用单命令Water Worker (external)/water-worker@localhost并禁hooks/签名，不改global。无push/merge/rebase/发布授权。

完成通知及报告第一行：

```text
WATER-W1-D 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/d/docs/dispatch/reports/WATER-W1-D-REPORT.md
```

受阻改“任务受阻”。交回后停止，由总控独立验收；目录创建通过不等于真实扫描/分类或macOS验收通过。
