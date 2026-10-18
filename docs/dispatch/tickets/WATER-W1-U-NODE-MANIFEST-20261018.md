# WATER-W1-U：package.json纯内存结构证据

总控2026-10-18。正式可执行票；状态以主manifest的本票记录为准，只有READY且baselineStatus=PASSED才开工。用户手动外贴，不自动启动实现者。本波R补单/S/T/U可以并行。

| 项 | 唯一值 |
|---|---|
| 权威票面 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-U-NODE-MANIFEST-20261018.md |
| 唯一工作树 | F:/new/smaltalk/water/.worktrees/u |
| 分支 | worker/water-w1-u |
| 精确首次基线 | 3d0faefa97267a6aa57f880a315a2cde7fe06e98 |
| 固定tag | water-w1-parallel-wave-base-20261018 |
| manifest | F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json |
| 冻结锁 | contracts/parallel-wave-v1/freeze.lock.json（继承12旧锁，291唯一冻结） |
| 实现目录 | packages/node-manifest |
| 回执 | F:/new/smaltalk/water/.worktrees/u/docs/dispatch/reports/WATER-W1-U-REPORT.md |
| 证据 | F:/new/smaltalk/water/.worktrees/u/docs/acceptance/wave1/u/ |

先读主检出README、STATUS、AGENTS、CONTROLLER-WORKFLOW、ADR-013、本波PLAN/READY-REPORT、本票、W1-PARALLEL-WAVE-WORKER-RULES、contracts/parallel-wave-v1/COMMON.md及TESTS.json、contracts/node-manifest-v1/SPEC.md。S再读SOURCES/N/P API；T再读PROVENANCE/bundle和真实I/H/Q规格；U再读cases。票面在主检出，直接读权威绝对路径；执行树早于正式票，不merge取票。

首次必须精确HEAD/分支、干净、实现目录不存在。baseline已由总控在此树实际运行，执行者仍先复核一次；不符保留现场回受阻，不自行换树/reset。只在本票树运行：

```powershell
node scripts/parallel-wave-check.mjs --task WATER-W1-U --mode baseline
```

baseline只验证已验收依赖/冻结输入/实际工具，不表示新产品或五测试通过。无物理fixture或真实用户数据权限。

## 实现要求

只提供 analyze_package_json(raw)/to_json 私有有效证据。生产不读磁盘/环境/时钟/配置、无unsafe/进程/网络/脚本执行；本票完全不获取真实package.json。固定输出只含结构标记/声明计数，无名称/版本/依赖/range/scripts/workspace原文、hash或路径；project_membership_verified/tool_version_known保持false、risk protected、display_only，格式有效不提升分类。

五测试职责依次：11完整golden/九字段结构及顺序不变；19原raw错误（含unknown深层/数组/转义重复和语法优先）；动态depth32/33、256KiB边界、每个条目和Unicode字符/字段上限；canary改名/未知元数据变化的相同输出和纯内存边界；真实公开入口/Serialize与to_json一致及严格wire。测试额外动态边界全部在内存生成，不能读项目其它清单或执行scripts。重复键必须在原raw每层检查，不能先Value丢信息；语法坏优先InvalidJson，已知null不是缺失。

先写完整测试和可编译骨架留 U_BEHAVIOR 红，再实现。三负控分别改坏未知metadata重复键检查、真实归属输出标记、真实输出白名单（泄漏输入名称/脚本文本），每次完整五测红后原字节恢复五绿。SPEC中的限值和错误不自行折中，遇到语义冲突先回总控。

## 独占改动白名单

- `packages/node-manifest/Cargo.toml`
- `packages/node-manifest/Cargo.lock`
- `packages/node-manifest/README.md`
- `packages/node-manifest/tests/manifest_v1.rs`
- `docs/dispatch/reports/WATER-W1-U-REPORT.md`
- `packages/node-manifest/src/` 内新文件（src仅Rust；证据只文本/json/log/png）
- `docs/acceptance/wave1/u/` 内新文件（src仅Rust；证据只文本/json/log/png）

此外所有文件只读：根Cargo、旧产品、冻结SPEC/输入/helper/锁、台账、其它树、上游checkout。依赖/接口/文件范围不符写受阻回执，不扩面/安装/fetch/改全局配置。独立workspace及私有Cargo.lock，仅helper lock模式可离线生成；依赖/version/checksum精确按SPEC，不改根锁。

## 五测试、负控与最终门

精确五顶层测试：manifest_structure、manifest_raw_validation、manifest_field_limits、manifest_privacy_and_purity、manifest_public_wire。不得skip/过滤/嵌套凑数/修改runner。最多单子命令180秒，一树一次一门；Rust1.95/MSVC、私有offline/locked/jobs1，不运行上游或整仓全量检查。

先完整写测试及可编译骨架，使用lock模式离线生成本票锁；完整测试的目标行为断言消息必须含 U_BEHAVIOR，再运行 red-behavior 留有效完整五红，随后实现并 suite 五绿。编译/缺文件/窗口/CDP/超时不是有效行为红。稳定最终代码与测试字节后，逐项按SPEC暂时改坏真实生产逻辑，red-nc1、red-nc2、red-nc3（目标 U_DUPLICATE_UNKNOWN/U_NO_OWNERSHIP/U_NO_CONTENT_LEAK），每红之后立即原字节恢复、核哈希并 suite 完整五绿。不能改测试或加测试专用开关造红。

统一命令形态（mode分别取red-behavior、suite、red-nc1、red-nc2、red-nc3；Rust另有lock）：

```powershell
node scripts/parallel-wave-check.mjs --task WATER-W1-U --mode suite
```

final会核四条当前源码/测试字节的有效红与逐次恢复。首次行为红保留；若后续测试/源码改变导致它不能绑定当前字节，最终版上暂时恢复相同行为缺陷，red-behavior重放→原字节恢复suite绿，明确标注为实现后负控重放。不要把重放冒称首次先红。格式/样式变化也影响源码哈希，先稳定再完整留链。所有失败日志和源码原/坏/恢复快照保留。

提交实现/测试得到干净SHA，同一SHA串行跑全部final：

```powershell
node scripts/parallel-wave-check.mjs --task WATER-W1-U --mode fmt --final
node scripts/parallel-wave-check.mjs --task WATER-W1-U --mode test --final
node scripts/parallel-wave-check.mjs --task WATER-W1-U --mode clippy --final
node scripts/parallel-wave-check.mjs --task WATER-W1-U --mode metadata --final
node scripts/parallel-wave-check.mjs --task WATER-W1-U --mode bridge --final
```

全部helper输出在本树.local/checks/WATER-W1-U/。按原字节归档json/log/txt/png及ARCHIVE.json（来源/长度/SHA）到本票证据目录；不纳入target/cache/profile/下载文件或fixture。预置.gitattributes不可改。显式文件名git add（log用-f），仅提交自己的实现/测试/报告/证据，不批量全树add，不clean/reset/merge/rebase/push。最终证据/报告提交不得夹未复测产品修改。

回执逐需求说明、完整基线与受测SHA/报告SHA、实际改动、全部命令/退出码/日志、先红/三负控与恢复、全部失败、边界和未验证、实际引擎/模型。完成只到SUBMITTED，总控另做独立验收集成；Windows不冒充macOS/M1完成。交回后停止修改。

报告首行及通知：

```text
WATER-W1-U 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/u/docs/dispatch/reports/WATER-W1-U-REPORT.md
```

受阻把“已完成”改为“受阻”，说明最小补充需求，不要求用户临时放宽权限。
