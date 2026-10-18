WATER-W1-U 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/u/docs/dispatch/reports/WATER-W1-U-REPORT.md

交付状态：SUBMITTED，待总控独立验收和集成；没有自行更新主 manifest/registry 或声明 VERIFIED。执行日期为 2026-10-19（Asia/Tokyo）；下文日志文件名/时间使用 UTC，日期为 2026-10-18。

执行引擎为本次 Codex 会话，模型为 GPT-6 系列（会话指令描述；更细子型号与推理档位未暴露）。未启动子代理、额外模型或实现 CLI。

## 基线与提交

| 项目 | 核实结果 |
|---|---|
| 唯一工作树 | `F:/new/smaltalk/water/.worktrees/u` |
| 分支 | `worker/water-w1-u` |
| 首次精确基线 | `3d0faefa97267a6aa57f880a315a2cde7fe06e98` |
| 固定 tag | `water-w1-parallel-wave-base-20261018` |
| 主检出权威票/manifest | 按票面绝对路径只读；U 为 READY、baselineStatus=PASSED |
| 首次状态 | HEAD/分支精确符合，工作树干净，`packages/node-manifest` 不存在 |
| 实现及最终受测 SHA | `39ea9ff30426d4c211f0eada6d85f3d3a87dd43d` |
| 报告/证据提交完整 SHA | 见 [SUBMISSION.json](../../acceptance/wave1/u/SUBMISSION.json) 的 `report_commit`；该后续交接记录只追加元数据，不改本报告或产品 |

实现提交包含六个产品/测试/说明文件，以及用于原字节恢复的 `final-v1-original.txt`。五个 final 均在上述同一实现 SHA 上执行，前后 status 均为空。报告与归档提交不含产品或测试修改。

## 实现与逐需求核对

| 要求 | 实际交付与证据 |
|---|---|
| 独立 workspace、精确依赖 | `water-node-manifest` 0.1.0，edition 2024，Rust 1.95，resolver 3，members=["."]、publish=false、四 auto=false；唯一 lib 和指定测试 target。仅 serde =1.0.229/derive、serde_json =1.0.151，无 path/dev/build 依赖。Cargo.lock 仅 helper lock 离线生成；metadata 每次校验版本/checksum 与根锁一致，根锁未改。 |
| 公开 API | `water_node_manifest::v1::{analyze_package_json,to_json}`；前者只接 `&str`，后者只接有效 `ManifestEvidence`。真实公开 bridge 已运行。 |
| 私有有效证据 | ManifestEvidence/ManifestCounts 字段全部私有，Debug/Clone/PartialEq/Eq/Serialize；无 Deserialize/Default/任意构造器或可变 getter。 |
| 完整 raw 检查 | 先检查 262144 UTF-8 字节上限，再通过迭代 Serde 忽略访问路径验证完整语法，并对字符串/数字 token 验证 Unicode 解码及 serde_json 支持范围。随后自定义递归 Serde visitor 直接读取原 raw，逐对象检查解码后的重复键及深度，不先转 Value。 |
| 语法/深度优先级 | 语法坏始终 InvalidJson，先于重复/深度/字段错误；根容器深度 1，32 通过、33 拒绝。数千层合法/损坏输入也先走无递归语法检查，再由有界 visitor 停止。数字不保存在证据中，不进行应用浮点运算。 |
| 九字段语义 | name/version/private/scripts/四依赖/workspaces 严格类型；显式 null 拒绝，false 真实保留；缺字段计 0，无已知字段的对象合法、recognized_field_count=0。未知元数据仍接受完整语法/重复/深度校验。 |
| 条目/字符上限 | scripts 128、四依赖各 4096、workspaces 128；各边界及加一拒绝均实测。name/version/依赖 key/workspace 按 Unicode scalar 计 1..256；依赖值 1..2048，scripts 值 0..4096。规定字段拒绝 ASCII 控制/DEL，scripts 内容允许空与控制文本。未添加额外包名/semver/glob 或 scripts key 语义限制。 |
| 结构 wire 与计数 | 顶层精确 15 字段，counts 精确六个 u32；所有固定标记/Option/布尔和实际声明数与 11 份完整 golden 一致。optionalDependencies 与 dependencies 同名分别计数，不总去重。 |
| 保护边界 | project_membership_verified=false、tool_version_known=false、risk=protected、action=display_only。读取格式不证明项目归属、安装版本、本地引用或可删性，不改变已有分类。 |
| 隐私/纯内存 | JSON/Debug/错误不含输入 name/version/脚本/依赖/range/workspace/未知原文、hash 或路径。canary 改名、顺序和未知元数据变化输出一致；不读磁盘/环境/配置/时钟，不执行进程/scripts、不联网；crate forbid unsafe。测试只 include 冻结合成 cases 及本票源码，动态输入全在内存生成，没有获取真实 package.json。 |
| 错误 | 恰八个冻结变体；Debug/Clone/PartialEq/Eq/Display/Error；固定 `<Variant> at /manifest`，无 serde 内部错误或 caller 原文/字段回显。 |

实现文件为 `packages/node-manifest/{Cargo.toml,Cargo.lock,README.md,src/lib.rs,src/v1.rs,tests/manifest_v1.rs}`。其它新增文件只在本报告及 `docs/acceptance/wave1/u/`。旧产品、根 Cargo、契约/helper/锁/台账、其它树与上游未修改。

## 五测试与真实接线

| 精确顶层测试 | 覆盖 |
|---|---|
| manifest_structure | 全 11 完整 golden、九字段逐个提供、明确 false/空集合、字段顺序与自由文本变化不变、两种依赖同名分别计数 |
| manifest_raw_validation | 全 19 原 raw 错误；unknown 深层/数组/转义及 surrogate-pair 等价键重复；各已知 map 重复；非对象根；null/类型错误；重复/深度之后损坏语法优先；异常数字/Unicode/尾随文本 |
| manifest_field_limits | depth 32/33，262144/262145 字节及多字节精确边界；scripts 128/129，四依赖各 4096/4097，workspaces 128/129；全部字符串上下界、错误 item 类型、33 种 ASCII 控制/DEL 及允许的脚本文本 |
| manifest_privacy_and_purity | canary 名称/脚本/range/路径隐藏，未知元数据与改名同输出，Debug/错误无原文，输入不变、重复调用稳定，生产源码无 I/O/进程/网络/时钟入口并 forbid unsafe |
| manifest_public_wire | 真实公开 API、全部 golden 的 Serialize/to_json 字节一致，精确白名单/类型/固定保护标记，以及八错误的固定 Display/安全 Error source |

每次 suite、red 和最终 test 都执行完整五项，0 ignored、0 filtered；没有跳过、测试专用后门、改 runner 或弱化断言。静态纯内存检查与确定性测试只覆盖本票源码和调用行为，不声称 OS 沙箱保证。

总控冻结的 `node-manifest-bridge.rs` 实际链接新库，结果为 `actual_U_public_API=true, valid=11, errors=19, dynamic_limits=true, filesystem_scanned=false`，并直接验证 Serialize 一致、动态深度/字节/映射上限和隐私等价。

## 初次先红、负控与恢复

先写完整五测试和可编译 InvalidJson 骨架，再运行真正的初次先红：`2026-10-18T15-02-10.060Z-38360-red-behavior-result.json`，底层测试退出 101，0 通过/5 失败，命中 U_BEHAVIOR；随后实现，suite 5 通过。

首次 NC1 的底层测试已拒绝坏代码，但最早 expect_err 的消息缺目标标签，helper 拒收。已立即恢复原字节并 suite 五绿。只为 expect_err 增加诊断标签，没有减少样本或改变期望；该消息修改改变测试 SHA，因此按票面在最终测试字节上重放原 InvalidJson 骨架，再恢复完整实现五绿。**最终 proofAudit 绑定的 behavior 是实现后重放，不冒称最初先红。** 两次行为红、拒收的 NC1 和所有恢复日志均保留。

下表文件均在 [helper 归档](../../acceptance/wave1/u/ARCHIVE.json)；每次 helper 的红模式退出 0 表示确认预期行为失败，底层测试均退出 101。完整五项执行不等于五项全部失败。

| 负控 | 真正生产修改 | 有效红 result | 底层通过/失败 | 原字节恢复五绿 result |
|---|---|---|---|---|
| behavior 重放 | 暂将公开 analyze 函数恢复为原骨架，返回 InvalidJson | `2026-10-18T15-06-46.366Z-12688-red-behavior-result.json` | 0/5 | `2026-10-18T15-07-02.087Z-2572-suite-result.json` |
| nc1 / U_DUPLICATE_UNKNOWN | 将重复检查改为仅根层生效，实际 unknown 元数据/数组内对象的重复键因此漏检（也会影响其它嵌套 map） | `2026-10-18T15-07-18.021Z-20640-red-nc1-result.json` | 4/1 | `2026-10-18T15-07-34.585Z-41888-suite-result.json` |
| nc2 / U_NO_OWNERSHIP | 实际证据构造把 project_membership_verified 改 true | `2026-10-18T15-07-49.368Z-39624-red-nc2-result.json` | 2/3 | `2026-10-18T15-08-03.371Z-14148-suite-result.json` |
| nc3 / U_NO_CONTENT_LEAK | 实际证据新增可序列化 name 字段，构造时从 caller name 克隆原文 | `2026-10-18T15-08-15.822Z-41532-red-nc3-result.json` | 2/3 | `2026-10-18T15-08-31.956Z-25284-suite-result.json` |

每项坏/好源码、Cargo 和测试快照均由原 helper 保存；每次写回好源码后先 Get-FileHash 核 SHA，再完整 suite。汇总和逐快照复核见 [RESTORATIONS.json](../../acceptance/wave1/u/RESTORATIONS.json)。生产没有保留任何负控分支。

最终 `src/v1.rs` 原/恢复 SHA256 均为 `ab824c920abf7945fc02f78970d991f9d281a9b0ccbee83058ac8fbe6679e156`；最终测试 SHA256 为 `f5214fcbb5b3f023bdb528a0f154198f2e193ef3bf5bce9dbcfbbe8576071a1c`。四条有效红与逐次恢复都由五个 final 的 proofAudit 验证，最终 productionHash=`ebfca70f7831115586dfbf87d2b20bd8067f9088bf71db02450c9459a8b01609`，testHash=`83c4f4ea9d186b9648801d1af718d9397c40708a0f099e2e902da7d9f394ff6f`。

## 全部 helper 命令、退出码与日志

全部在 U 树运行。统一前缀为 `node scripts/parallel-wave-check.mjs --task WATER-W1-U --mode`，下表“参数”补在前缀之后。完整展开命令、底层 binary/argv/退出码和逐条日志路径见 [EXECUTION.json](../../acceptance/wave1/u/EXECUTION.json)，各原始 result 的 commands 也保留这些信息。下表 result 名均在 `docs/acceptance/wave1/u/helper/`。

| 参数 | helper 退出 | result 文件 |
|---|---|---|
| baseline（派前旧记录，非本执行者命令） | 0 | `2026-10-18T14-33-55.027Z-29604-baseline-result.json` |
| baseline | 0 | `2026-10-18T14-58-46.373Z-33424-baseline-result.json` |
| lock | 0 | `2026-10-18T15-01-57.895Z-26260-lock-result.json` |
| red-behavior（初次先红） | 0，底层 101 | `2026-10-18T15-02-10.060Z-38360-red-behavior-result.json` |
| suite | 0，5 绿 | `2026-10-18T15-03-36.725Z-25736-suite-result.json` |
| clippy | 0 | `2026-10-18T15-03-46.891Z-41556-clippy-result.json` |
| red-nc1（缺标签拒收，不计有效证据） | 1，底层 101 | `2026-10-18T15-05-19.024Z-30804-red-nc1-result.json` |
| suite（立即恢复） | 0，5 绿 | `2026-10-18T15-05-45.045Z-35700-suite-result.json` |
| red-behavior（实现后重放） | 0，底层 101 | `2026-10-18T15-06-46.366Z-12688-red-behavior-result.json` |
| suite | 0，5 绿 | `2026-10-18T15-07-02.087Z-2572-suite-result.json` |
| red-nc1 | 0，底层 101 | `2026-10-18T15-07-18.021Z-20640-red-nc1-result.json` |
| suite | 0，5 绿 | `2026-10-18T15-07-34.585Z-41888-suite-result.json` |
| red-nc2 | 0，底层 101 | `2026-10-18T15-07-49.368Z-39624-red-nc2-result.json` |
| suite | 0，5 绿 | `2026-10-18T15-08-03.371Z-14148-suite-result.json` |
| red-nc3 | 0，底层 101 | `2026-10-18T15-08-15.822Z-41532-red-nc3-result.json` |
| suite | 0，5 绿 | `2026-10-18T15-08-31.956Z-25284-suite-result.json` |
| clippy（确认诊断消息修改后无警告） | 0 | `2026-10-18T15-09-13.300Z-23676-clippy-result.json` |
| fmt --final | 0 | `2026-10-18T15-09-34.078Z-33160-fmt-result.json` |
| test --final | 0，5 绿 | `2026-10-18T15-09-41.526Z-36188-test-result.json` |
| clippy --final | 0 | `2026-10-18T15-09-51.407Z-40296-clippy-result.json` |
| metadata --final | 0 | `2026-10-18T15-10-00.859Z-10016-metadata-result.json` |
| bridge --final | 0 | `2026-10-18T15-10-10.698Z-32792-bridge-result.json` |

工具链为 Node v24.16.0、Rust 1.95.0/MSVC/Windows x64；Cargo 全部私有 offline/locked/jobs1。只有 lock 模式生成本票锁。未运行整仓全量、上游或额外负载；单树串行，每个子命令均未达 180 秒上限。仅另运行已安装工具链的 rustfmt 格式化本票三个 Rust 文件（初次及测试诊断消息改动后），均退出 0；没有绕过 helper 运行 Cargo 测试。Git 操作使用 hooksPath=NUL/fsmonitor=false，显式逐文件 add，log 显式 -f；未 clean/reset/merge/rebase/push。

## 归档、范围和全部失败

[ARCHIVE.json](../../acceptance/wave1/u/ARCHIVE.json) 记录 390 个 helper 原始输出、共 2365821 字节的源绝对路径/长度/SHA256；复制后逐字节比对。包括 22 个 result：1 个派前已有、21 个本执行者实际运行。没有归档 target、依赖缓存、二进制、profile、下载文件或 fixture payload。证据目录预置 `.gitattributes` 未改。

[FREEZE-SCOPE-AUDIT.json](../../acceptance/wave1/u/FREEZE-SCOPE-AUDIT.json) 独立重核 94 新锁条目、12 继承锁、291 唯一冻结文件全部 SHA 一致；各 final 亦分别核冻结与白名单。最终追加证据与报告时再核源字节与受测 SHA 一致，提交差异仅归档/报告/交接元数据。

唯一非预期 helper 失败为上述首轮 NC1 的诊断标签遗漏，已保留原始日志、立即恢复、改消息并重录最终证据。不存在好代码 suite、编译、超时或最终门失败。行为重放时未调用的私有解析函数出现普通 dead-code 警告，其原始日志保留，恢复后的 clippy -D warnings 通过。

探索性读取曾有终端编码/截断、一次 node -e 引号导致 SyntaxError、一次 rg 中间路径通配符错误；一次负控准备的 String.Split 守卫误报在变更前停止。均已修正，无产品/权限影响。这些非 helper 工具输出的转录说明单独列于 [OPERATION-NOTES.txt](../../acceptance/wave1/u/OPERATION-NOTES.txt)，不冒称原字节验证证据。

归档暂存命令尚在后台会话时，曾过早启动后续 commit，导致本树 Git index.lock 竞争，暂存与该次 commit 均失败。已等待该会话结束，确认锁自然释放，未删锁或终止进程；随后严格串行重做显式暂存与提交。该操作失败及退出码解释也记录于 OPERATION-NOTES；没有因此变更产品或重跑/覆盖原始验证证据。

## 边界与未验证

本票完成的是 caller-supplied text 的内存结构证据。未获取真实 package.json、未扫 HOME/整盘/其它项目，未访问物理夹具或真实用户数据，未执行脚本、解析引用或进行清理/删除/移动/ACL 操作。未安装/fetch 依赖或修改全局配置。

结构有效不证明内容来自磁盘、Node 项目归属、工具版本、包语义、引用存在或分类可提升；精确计数可关联，不保证匿名。内容授权采集、R/S/T 纵向宿主接线、生产竞态、真实用户 scope、桌面/macOS/M1/删除均未验证。没有剩余本票已知失败或越界申请；后续由总控独立验收，交回后停止修改。
