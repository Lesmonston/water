WATER-W1-R 补充单01 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/r/docs/dispatch/reports/WATER-W1-R-ADDENDUM-01-REPORT.md

# R 补充单01执行回执

执行日期：2026-10-18/19（Asia/Tokyo）；原始日志使用 UTC。交付状态：完成本票实现与自测，交总控独立验收；不自行标记 VERIFIED，不代表 M1 完成。

## 提交、范围与来源

- 实际执行器：OpenAI Codex，按本会话配置说明基于 GPT-6；更细的模型版本未提供。没有子代理、其它实现者或外部服务调用。
- 唯一工作树：`F:/new/smaltalk/water/.worktrees/r`；分支：`worker/water-w1-r`。
- 原基线：`dd09c3b8801b86a0059f3fb73fe8a250acb1d89e`；原受阻提交：`acefcf1f5fa16ff7580a219f1a2d06baaf9fdb2e`。
- 首次续做 HEAD：`c0e20252c87b22fde8c83c4487d24e7a5ca06011`，精确匹配且干净，产品目录尚不存在；总控追加六文件只读保留，没有 merge/reset。
- **完整受测实现提交：`a7cbe2bf6311282bc33f291122a31fb907577b41`**。五 final 门全部绑定此提交，前后状态均干净。
- 实现提交只新增 `packages/native-scan/` 十文件：Cargo.toml/lock、README、六个 Rust 源模块、唯一 `tests/native_scan_v1.rs`。证据/报告后续提交不夹产品改动。
- Cargo 锁由补单 wrapper 的 `lock` 模式离线生成；六直接依赖恰 A/N/P/Q、固定 serde/serde_json，H 仅 Q 间接依赖。独立 workspace，唯一 lib/test，无 dev/build/bin、新 registry 包或根 Cargo 变更。
- [PRESERVATION.json](../../acceptance/wave1/r/addendum-01/PRESERVATION.json) 核对原受阻交付 24 文件与原 commit 的 Git 字节一致、总控追加六文件与续做 commit 一致，以及十产品文件与受测 commit 的 Git 字节一致。旧 A–Q/根 Cargo 未变；未改其它工作树、主线台账、上游或共享规则。
- [FREEZE-AUDIT.json](../../acceptance/wave1/r/addendum-01/FREEZE-AUDIT.json) 实核附加锁 16 条目、11 继承锁中 255 个唯一旧冻结，合计 261 个唯一冻结文件全部哈希一致；原 61 条目/255 冻结与 helper 原字节保持。

权威来源为主检出原票、补充单01、manifest、本批纪律、原 SPEC 与附加 SPEC；原受阻报告与 blocked-r001 证据保留。本次不再运行要求原基线的首次 baseline。

## 实现与需求逐项对应

| 要求 | 实现与证据 |
|---|---|
| 真实 P 生命周期和根绑定 | `walk.rs:36` 先真实 begin/check。begin 失败不建 guard，不取消宿主已有 active attempt；成功后 guard 持有本次 permit 和独占 registry 借用。N 候选身份、实际枚举根 class18 身份均与许可比较；不符 RootMismatch，枚举前拒绝。 |
| 清理本次 attempt | `walk.rs:9` 的私有 Attempt：Completed/Partial 调用真实 finish，Cancelled 调用真实 cancel；Err、A/输出失败、finish 刷新失败和 observer unwind 都经 Drop cancel。finish 错误按 Source 保留。测试核错根/缺失根/junction 根/取消/panic 后能重新 begin，且 revoke/重建后旧 scope 拒绝。 |
| 原生只读、不跟随 | `native_windows.rs:161` 根只开目录枚举/属性/SYNCHRONIZE、share7、BACKUP_SEMANTICS/OPEN_REPARSE_POINT/SECURITY_IDENTIFICATION。子项 `:170` 只以活父句柄和验证单名称 NtCreateFile(FILE_OPEN)；attrs=0、security/EA=null，严格类型提示，不拼子绝对路径、不 read_dir 回退。普通文件不申请 READ_DATA。 |
| 真实属性、ID、逻辑长度 | class9 判断所有 reparse 为 Link、device 为 Other；Link/Other 不查询 ID/长度且不深入。正常 File/Directory class18 获取卷序列与 128 位 ID；File class1 仅取非负 EndOfFile。硬链接保留每路径事实但 ID 相同，观察逻辑和为 58 不充当来源总量。未知 ID 的目录不深入，跨卷跳过为 outside_scope。 |
| 完整有界目录名单 | `native_windows.rs:232`：16384 字节初始化/8 对齐 buffer，class11 首批/class10 后续，18 正常结束；每目录最多 `2*max_dir_entries+4` 次。整名单过滤 dot、原始 UTF-16 去重/排序，超限或 malformed/无进展/IO 失败整批丢弃，不打开半批。 |
| decoder/名称 | `decode.rs:7` 检查 104..65536、固定头、正偶数名字节长、checked 边界、next 对齐/最小跨度/下一完整头；安全字节读取，保留 UTF-16。`:58` 严格 UTF-16、1..255 单元、控制符/分隔/保留 stem/尾点空格拒绝，再真实 A 单组件校验；不解码百分号或正规化。公开内存对象不授予 IO/句柄权限。 |
| 顺序、预算、取消 | `walk.rs:147` 前序原 UTF-16 顺序；根 depth0 不作 finding。候选在 validator/open 前计 visited，仅成功事实计 recorded。取消优先于候选预算和目录深度；depth0/1 保留 issue，名单超限不消耗 visited；总量仅存在下一候选时超限，刚好八项不造 issue。observer 每成功追加一次调用，可取消同一真实 token；最后文件后无新操作时仍 Completed。 |
| 补单祖先规则 | `output.rs:7` 先完成实际记录 findings，再按与 A 相同的分段前缀查记录集合：基础原因顺序恒为 unknown_ownership、incomplete_evidence，有已记录 protected 后代才追加第三项 protected_descendant。完整八项仅 dir 有第三项；深度1、预算3/4、observer 取消3/4 分别检查有/无后代，不猜未访问磁盘。 |
| 真实 A/Q | 每 finding unknown/protected，无工具、固定 evidence、references unknown/[]。实际调用 A.validate_report。report 只读 getter；默认 JSON 实际 Q.redact_report + Q.to_json，未复制 Q 算法。原冻结桥接及附加桥接均通过。 |
| wire 与未知值 | 完整 native JSON 顶层16字段、entry7字段、ID规范十进制卷号/32小写hex；File逻辑已知才 logical_sum/measured，其余 unknown；所有 allocated/reclaimable null。来源 totals logical/allocated null、unavailable，scanned=recorded、skipped=visited-recorded；保留根空串/取消 None。to_json 与返回前同一 33554432 UTF-8 字节上限。 |
| 平台与输出边界 | 无环境模拟 IO、按 fixture/case 返回预期、任意值构造器、Deserialize/权限反序列化或可变 getter。非 Windows x64 原生入口为 UnsupportedPlatform。完整侧车仍含相对路径/原生 ID，不是默认公开导出；宿主声明与竞态标记均 false。无 picker/UI/CLI/HTTP/WebView/文件保存/上传/删除。 |

## 五测试与真实公开链路

只有下列五个顶层测试；每次 suite/red/test 都完整执行五个，单线程、0 ignored/0 filtered，没有新增测试后门或削弱断言。

| 测试 | 覆盖 |
|---|---|
| native_scope_and_identity (`tests/native_scan_v1.rs:154`) | options 边界与 getter、全错误显示、真实 P 外来/active 保持、错 trap 根、缺失根/junction 根的 guard 恢复、N/P 实际根 ID、revoke 和同 ID 重建后的旧 capability 拒绝。 |
| native_directory_decoding (`:307`) | 全部冻结 5 正例/10 反例、逐码元/属性比较、9 合法/22 非法名称；另检查255单元边界、保留名/控制符及全部短于头的输入。仅纯内存。 |
| native_metadata_no_follow (`:377`) | 完整八项逐路径/kind/深度/长度/ID；硬链接 ID 相同、零文件、Unicode、junction Link/无身份/无 TRAP_OUTSIDE 后代、空目录、重复扫描一致、无绝对路径泄漏。 |
| native_budgets_and_cancellation (`:453`) | depth0/1、全局1/3/4/7/8、名单1/6超限与7刚好；token clone；missing 路径预取消避免候选 IO；observer1/3/4/7/8；取消优先深度/预算；最后entry取消仍完成；panic unwind 后重新 begin。 |
| native_report_and_redaction (`:588`) | 严格顶层/entry wire、完整 A 报告逐值、A roundtrip、真实 Q 输出相等与去路径/原ID；完整/深度0/1/partial3/4/cancelled3/4 的祖先原因与 issue 关联、根空串和取消 None，真实 A/Q 通过。 |

冻结原 bridge 实际走 P.prepare/confirm → R.scan_registered → A.validate/to_json/parse → R.redacted_json/真实 Q，复核八项、错根/attempt 释放/预取消/revoke、全部 decoder 和名称 case。结果 `actual_P_R_A_Q=true`、entries8、decoder5/10、names9/22；附加 bridge `actual_R_A_Q=true`、完整/深度1及原因精确顺序均通过。

## 命令、先红后绿与四条当前字节链

全部检查入口均为 `node scripts/native-scan-addendum-check.mjs --task WATER-W1-R --mode <mode>`；final 另加 `--final`。wrapper 原样委托冻结原 helper，没有修改检查工具。资源为私有 offline/locked、jobs1、单子命令180秒，每线串行，无全仓/watch/coverage。rustfmt 只作为显式产品文件编辑使用。

- `resume` 退出0：`2026-10-18T14-57-54.244Z-22304-resume-result.json`；既有 fixture/原 ABI/Q 能力及实际 A/Q 旧错误/第三原因/叶子对照通过。这不是 R 产品验证。
- `lock` 退出0；首次可编译骨架 + 完整五测试在实现前运行 `red-behavior`，原 helper `2026-10-18T15-01-19.393Z-25900-red-behavior-result.json`：命中 R_BEHAVIOR/Rust101，没有编译失败。随后首次真实实现 suite 五绿。
- 格式和两次 Clippy 修订后，测试加入更早的 reparse 分类断言以直接定位 no-follow 失败；所有原断言保留。重新以最终测试字节运行行为红/恢复绿，原实现前骨架记录仍完整归档，二者不混称同一测试字节。
- 四条当前字节链的全部生产/测试源码快照、stdout/stderr、精确 receipt/日志名与三哈希见 [PROOF-CHAINS.json](../../acceptance/wave1/r/addendum-01/PROOF-CHAINS.json)。各红完整执行五测试、Rust退出101、无过滤；恢复均5通过/0失败/退出0。不是要求五项均失败。

| 链/目标 | 实际临时生产修改 | 红结果（通过/失败） | 原字节恢复 |
|---|---|---|---|
| behavior / R_BEHAVIOR | 公开扫描入口替为可运行 NativeIo 骨架 | 1/4 | 5/0 |
| nc1 / R_ROOT_BINDING | 关闭候选/实际根及 list 前根与permit身份门，固定同批 trap 确实得到扫描结果 | 4/1 | 5/0 |
| nc2 / R_NO_FOLLOW | 实际 reparse 属性分类为 Directory 并允许进入，保留 OPEN_REPARSE_POINT | 3/2 | 5/0 |
| nc3 / R_CANCELLED | 关闭真实共享 token 的生产取消检查 | 3/2 | 5/0 |

最终测试聚合 hash：`f25e20a2e17f418535c42409e628afdf24745f60fe9584d858c38d89da78dca7`。
四条链恢复后的相同生产聚合 hash：`adb65f91733918acee7e7e723e3d14d010aa95bfd427ca3d8c51747646b57008`。原/坏/恢复单文件 SHA-256：

| 链/文件 | 原 | 坏 | 恢复 |
|---|---|---|---|
| behavior / v1.rs | d4adae555d6e080266a9bc3aff75d9f557ebf37c4e4084cd8949476f96d410e0 | 7ec9ff4a545e6510bff28b5d89ee2477453a10b085dcbaf3fe35cdf78ae21ad1 | d4adae555d6e080266a9bc3aff75d9f557ebf37c4e4084cd8949476f96d410e0 |
| nc1 / walk.rs | 52b0f077cbf57913c151ef0652b75b8894c91293a757b44efd0bf150a6a46255 | 38a7a30e3a4979eeb314d12b6d65983c8043bdabd16483836f9214ca704a9c23 | 52b0f077cbf57913c151ef0652b75b8894c91293a757b44efd0bf150a6a46255 |
| nc2 / native_windows.rs | 67ee4f2437d37593bbcb39c18f49d4ed2eead73023f87c31fb28d32cbc6499d3 | dd7c5318ced0ff0c446d8f1fa576fdcad37929e556df70e574ff88e54f7c5d31 | 67ee4f2437d37593bbcb39c18f49d4ed2eead73023f87c31fb28d32cbc6499d3 |
| nc3 / walk.rs | 52b0f077cbf57913c151ef0652b75b8894c91293a757b44efd0bf150a6a46255 | 359f147c0fd1e32cd08a0b3e96b041dd476bf05a6920a75aa3dee5ba55baa4c6 | 52b0f077cbf57913c151ef0652b75b8894c91293a757b44efd0bf150a6a46255 |

五个 final 的原 helper 都自行验证四条当前源码/测试恢复链，不仅依赖报告中的手写哈希。

## 同一干净实现 SHA 的五 final

完整信息和双层原始回执见 [FINAL-GATES.json](../../acceptance/wave1/r/addendum-01/FINAL-GATES.json)，顺序均在 `a7cbe2bf6311282bc33f291122a31fb907577b41`，各 wrapper/子门退出0。

| mode --final | 原helper UTC时间 | 结果 |
|---|---|---|
| fmt | 15:12:50.724–15:12:52.518 | 格式通过、四链通过 |
| test | 15:13:02.083–15:13:03.854 | 完整五测试5通过/0失败/0忽略/0过滤 |
| clippy | 15:13:15.172–15:13:19.856 | all-targets，-D warnings 通过 |
| metadata | 15:13:32.476–15:13:37.075 | 唯一workspace/lib/test、依赖/锁审计通过 |
| bridge | 15:13:57.041–15:14:00.553 | 原实际 P/R/A/Q 通过；wrapper附加实际 R/A/Q 于15:14:06.063前完成 |

wrapper 顶层 `productTestsRun` 是未改工具的默认 false；真实产品执行记录在子 helper 的 `productTestsRun=true`、executedTests/bridge 字段和 Rust 完整 stdout 中。不能把 wrapper 默认字段当作“未跑产品”，也没有为修正显示而改冻结工具。

## 窄 unsafe 审阅

仅 `native_windows.rs` 可包含 unsafe；lib deny，v1/decode/output/walk 四模块 forbid。系统声明恰 NtCreateFile/GetFileInformationByHandleEx，无额外 FFI、进程、shell、网络、备份权限或 CloseHandle 实现。

- `:58` 编译期断言 x64 大小/对齐：UnicodeString16/8、ObjectAttributes48/8、IoStatus16/8、Tag8/4、Identity24/8、Standard24/8。Standard 使用两个 i64、DWORD、两个 u8 BOOLEAN，没有把 Windows BOOLEAN 当 Rust bool。
- `:117` 固定 info 泛型仅私有三种 repr(C)/整数结构实现，class1/9/18与结构绑定、全初始化，借用活 File 不接管所有权；每个调用处 SAFETY 说明尺寸/对齐/生命周期。
- `:170` 再验证单组件，UTF-16存储在同步调用内存活，最长510字节可放u16；OA父句柄借用、无绝对子路径、null security/EA、FILE_OPEN及严格访问/类型flag。
- `:223` 只在 NT成功且返回HANDLE非null/非INVALID后转 File，RAII 唯一关闭；失败和未初始化值不接管。
- `:238` 初始化的 `[u64;2048]` 提供16KiB/8对齐，仅转为安全owned字节后交decoder，从未将变长尾数组cast为Rust引用。Win32/NT错误映射为固定IssueCode，不把OS自由文本或数值错误放输出。

## 失败、未触发分支与验证限制

本次两次普通 Clippy 失败（各有wrapper/子helper回执，共四个 failed receipts）完整保留：第一次 collapsible_if，第二次测试 err().expect；分别用 let-chain 和 expect_err 修正，没有 allow 关闭lint或删断言。之后普通及最终 Clippy 通过。四个红门的 Rust101 是预期行为失败，helper退出0；没有编译/缺文件/超时造红，没有失败的 final。

另一次工具编排代码因 Markdown 反引号造成 JS SyntaxError，发生在工具执行前，无文件写入或产品命令执行；修正后正常继续。探索性读取曾查不存在的附加 TESTS.json；本补单复用原 TESTS.json，未新建/修改清单或放宽测试。

归档复核脚本首次在报告首行断言处因 PowerShell 原生管道把脚本中文字面量编码成问号而终止，尚未暂存文件；改用 Unicode 转义比较后通过。随后一次将708条显式路径直接传给git的调用超过Windows命令行长度，进程未启动；改为NUL分隔的同一显式文件清单再暂存，不使用目录通配或全树add。最终归档/范围核对通过。报告本身由 apply_patch 以正确 Unicode 写入，产品和原始证据未受影响；这些不是产品门失败。

由于仅授权固定fixture，没有制造真实ACL拒绝、native API失败/不支持字段、其它卷/设备、实际坏UTF-16磁盘名/超长组合路径、生产重复/无进展/malformed内核buffer、并发替换或P.finish刷新失败。这些分支仅按源码审阅保守处理，不能描述成运行覆盖。decoder反例是纯内存验证，不冒充恶意内核/磁盘故障。超大输出/serde错误/非Windows入口也未动态触发，未伪造句柄或扩大fixture来造覆盖。

本次复用原 r 固定batch：4子目录、6文件名条目含1硬链接、1junction，字面payload60字节/含硬链接逻辑74字节。只有冻结 prepare 的 Node 有界核结构/已知合成payload哈希；Rust生产/测试只读index和原生元数据、不读普通payload、不写fixture。所有fixture/缓存/日志原位保留，负控所能涉及的trap仅本batch；没有重建/清理/删除/移动/ACL操作或真实用户数据扫描。

本机 Windows x64 受控合成范围自测通过。原生用户手势/选择器、真实用户scope、其它Windows/文件系统、恶意生产竞态、重命名后永久包含/一致快照、卷唯一/回收量、macOS、桌面保存/上传/删除未验收。race_protection_verified/native_user_gesture_authenticated仍false，Q不保证匿名，M1仍未完成。

## 归档与交回

[ARCHIVE.json](../../acceptance/wave1/r/addendum-01/ARCHIVE.json) 逐文件记录来源/长度/SHA-256：本次resume起所有698份helper/wrapper json/log/txt原字节，加四份原/坏/恢复hash记录，共702份来源文件、4155260字节；另有FINAL-GATES/PROOF-CHAINS/FREEZE-AUDIT/PRESERVATION等派生核对材料。原始失败、初次骨架红和最终测试字节的补录均保留；不纳二进制、cache或fixture payload。

报告/证据只追加在本票白名单。实现提交后产品字节未再改动，未合主线或push。正式接受、集成和VERIFIED状态由总控独立复测决定；交回后停止修改。
