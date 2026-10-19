WATER-W1-Z 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/z/docs/dispatch/reports/WATER-W1-Z-REPORT.md

状态：SUBMITTED，等待总控收单与独立验收。2026-10-19，Windows x64 受控合成范围；未自行标记 VERIFIED。

## 提交与执行身份

| 项目 | 实际值 |
|---|---|
| 权威票面 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-Z-ROOT-MARKER-20261019.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/z / worker/water-w1-z |
| 首次干净 HEAD / 精确基线 | 1c152a1ed317fb51498503de837bb228c50dc663 |
| 基线 tag | water-w1-interactive-base-r2-20261019 |
| 实现及测试提交 / 两道 final 受测 SHA | f853a78560c91cbc3241f61ad5526ff096530948 |
| 报告与证据提交 | 上述实现提交的直接子提交，仅本报告与本票证据；其精确 SHA 由 `git log -1 --format=%H -- docs/dispatch/reports/WATER-W1-Z-REPORT.md` 定位，无自引用 SHA |
| 实际引擎 / 模型 | 本会话 Codex，经 OpenAI API；开发者提供的模型说明为基于 GPT-6。未向本会话暴露精确 API 模型 ID/版本，未猜填更具体型号 |
| 子代理 / 其它模型调用 | 0 / 0 |
| 工具链 | Node v24.16.0；Rust 1.95.0，x86_64-pc-windows-msvc；私有 offline Cargo home/target，jobs1 |

启动时直接读取主检出权威票面、manifest、项目规则、ADR-015、M1 波次计划、执行规则、TESTS、root-marker SPEC/FIXTURES 及实际 N/P/U/R API。主 manifest 的 Z 为 READY、baselineStatus=PASSED；首次在指定树执行 baseline，确认精确 HEAD、干净状态和产品目录不存在。未复制或合入控制提交。

## 实际交付

实现提交只含 7 个票面文件：独立 Cargo.toml/Cargo.lock/README、src/lib.rs、src/v1.rs、src/native_windows.rs、唯一 tests/marker_v1.rs。无其它 target、新 registry 包、dev/build 依赖或根 Cargo 改动。

| 要求 | 实现与证据 |
|---|---|
| 额外同意与真实许可 | `approve_package_json` 调用真实 P.check_permit；私有借用对象持有真实 Registry/ScanPermit，不从 JSON、HTTP 或环境构造。许可失效、错误注册表、finish/cancel/revoke/re-registration 均由公开入口拒绝 |
| 同意借用生命周期 | marker_public_types 对真实编译产物运行 1 个成功对照、11 个编译拒绝；包括 Clone/Default/构造/序列化/反序列化、借用中 finish/revoke/drop permit，以及观察对象的构造/Default/反序列化 |
| 注册根与新句柄绑定 | 真实 N.validate_windows_path/open_directory 与 P.check_permit 身份一致后，私有原生层另开拥有的根 File，查 class9/18/1 并直接匹配同一注册根。后验再次核真实 P/N 和拥有根句柄；nc1 证明两个实际绑定保护失效会读到 other 根 |
| 固定子对象与只读打开 | 唯一 `package.json`，NtCreateFile 相对拥有根句柄、OBJ_CASE_INSENSITIVE、FILE_OPEN、同步、NON_DIRECTORY_FILE、OPEN_REPARSE_POINT；READ_DATA/READ_ATTRIBUTES/SYNCHRONIZE、仅 FILE_SHARE_READ。无子路径参数、路径拼接读取、canonicalize 重开、遍历或链接回退 |
| 普通文件、链接与状态 | class9 类型/设备/reparse、class1 NumberOfLinks=1/DeletePending=false/EOF、class18 身份。固定目录和 junction 拒绝；双硬链接在读取前拒绝。nc2 证明移除实际链接保护会错误产生证据 |
| 有界读取与前后验 | 已知 EOF 超过 262144 在内容读取前拒绝；同一 File 另用 take(262145) 硬界限，核字节数、前后文件身份/EOF、根及许可后验，变化失败不产生观察。exact/oversize 固定边界已运行；未模拟恶意生产竞态 |
| 严格原文交真实 U | 严格 UTF-8，不替换坏字节、不移除 BOM、不先 Value 化；直接 U.analyze_package_json(raw)，U 错误统一 InvalidManifest。本票物理覆盖 malformed 与坏 UTF-8；空/BOM/重复/深层/shape 分支通过真实 U 委托保持，未另造物理 payload 宣称这些为新增物理实测 |
| 缺文件语义 | missing 和仅有 private.json 的 trap 返回 Ok(None)，不读取其它名字，不判定“不是项目” |
| 完整来源与隐私 | good(140)、exact(262144)、other(2) 的真实 U.to_json 与嵌套 evidence 逐值相等；精确外层 12 字段，外层 native_root_package_json、内层 caller_supplied_text。无原文、内容 hash、路径、原生 ID、包字段名值或脚本内容；JSON/Debug 均检查 canary 不外泄 |
| 保护语义 | 仍 protected/display_only；用户手势鉴真、生产竞态保护、项目归属均 false。未向 V/W、旧报告或分类写回；精确长度/计数不保证匿名 |
| 固定错误与公开类型 | 13 个冻结错误枚举的 Clone/Eq/Error/Display 已核，Display 只 `<Variant> at /root_marker`，无错误 source 正文。观察对象私有字段、只读 Serialize、无 Deserialize/Default/任意构造器/可变 getter |
| ABI 与平台 | unsafe 仅私有 native_windows.rs 局部允许；每个调用有 SAFETY，repr(C) 和 x64 大小/对齐断言。其它平台明确 UnsupportedPlatform；未运行 macOS 或其它架构 |

原生布局依据本项目冻结规格、已审阅 R ABI 与 root-marker-abi-probe，无复制或修改旧权限表。尝试在线读取规格所指 Microsoft 文档时，浏览工具返回 HTTP 503（本会话 web search unavailable）；未取得网页内容，不冒称本次完成了在线核实。

## 全部检查、失败与恢复

所有门使用 `node scripts/interactive-wave-check-r2.mjs --task WATER-W1-Z --mode <mode>`，最后两项追加 `--final`。下表链接为该次原始回执；具体子命令、参数、退出码及原日志由回执 commands 字段和 [session-audit.json](../../acceptance/wave1/z/raw/session-audit.json) 逐项给出。

| 次序 / mode | wrapper 退出 | 实际结果与原回执 |
|---|---|---|
| 1 baseline | 0 | [实际启动基线](../../acceptance/wave1/z/raw/2026-10-19T11-15-48.251Z-25152-baseline-result.json)：真实 P/N/U、ABI 探针、新 factory、0 窗；不是新 Z 产品测试 |
| 2 lock | 0 | [私有离线生成本票锁](../../acceptance/wave1/z/raw/2026-10-19T11-19-37.123Z-30956-lock-result.json)，无新 registry 包 |
| 3 red-behavior | 0 | [首次实现前行为红](../../acceptance/wave1/z/raw/2026-10-19T11-19-43.518Z-23788-red-behavior-result.json)：cargo=101，1 pass/3 fail；可运行骨架真实命中 Z_BEHAVIOR，非编译/缺文件/超时 |
| 4 test | 0 | [主体实现后首次绿](../../acceptance/wave1/z/raw/2026-10-19T11-22-19.235Z-19736-test-result.json)：4/4 |
| 5 check | 0 | [根后验错误映射收敛后](../../acceptance/wave1/z/raw/2026-10-19T11-23-00.619Z-31812-check-result.json)：fmt/clippy -D warnings/metadata/锁通过；源码此后稳定 |
| 6 red-behavior | 0 | [当前测试字节行为复核](../../acceptance/wave1/z/raw/2026-10-19T11-23-48.298Z-30312-red-behavior-result.json)：恢复原骨架运行，cargo=101，1 pass/3 fail，Z_BEHAVIOR |
| 7 test | 0 | [立即恢复稳定原字节](../../acceptance/wave1/z/raw/2026-10-19T11-23-53.051Z-6296-test-result.json)：hash 核对，4/4 |
| 8 red-nc1 | 0 | [实际根绑定负控](../../acceptance/wave1/z/raw/2026-10-19T11-24-14.881Z-34112-red-nc1-result.json)：cargo=101，3 pass/1 fail，Z_SCOPE_BINDING |
| 9 test | 0 | [nc1 立即恢复](../../acceptance/wave1/z/raw/2026-10-19T11-24-20.078Z-31340-test-result.json)：hash 核对，4/4，早于 nc2 |
| 10 red-nc2 | 0 | [实际单链接负控](../../acceptance/wave1/z/raw/2026-10-19T11-24-37.824Z-31532-red-nc2-result.json)：cargo=101，3 pass/1 fail，Z_SINGLE_LINK |
| 11 test | 0 | [nc2 立即恢复](../../acceptance/wave1/z/raw/2026-10-19T11-24-42.454Z-22236-test-result.json)：hash 核对，4/4 |
| 12 check --final | 0 | [干净 f853a785 上 final check](../../acceptance/wave1/z/raw/2026-10-19T11-25-20.320Z-24520-check-result.json)：fmt/clippy/精确 metadata/锁/当前生产负控链通过 |
| 13 test --final | 0 | [同一干净 SHA 上 final test](../../acceptance/wave1/z/raw/2026-10-19T11-25-35.519Z-15992-test-result.json)：4 pass、0 fail/ignored/measured/filtered，0.88 秒，未改字节重跑 |

最终唯一清单恰 `marker_consent_and_binding`、`marker_native_limits_and_links`、`marker_real_u_and_privacy`、`marker_public_types`，没有额外测试 target、skip/ignore/filter 或嵌套测试凑数。[最终 cargo 原日志](../../acceptance/wave1/z/raw/2026-10-19T11-25-35.519Z-15992-test-9.log) 同时保留真实编译运行及四个结果。

首次红后测试只移除未使用的 json 导入并 rustfmt，未改任何断言或行为；因此同时保留首次历史红和当前精确测试字节下的第二次行为红，不把后者冒称首次历史。首次 unused import 警告及全部预期失败原日志均保留。没有未解释的产品编译、超时、环境失败或失败 gate。各轮公开类型编译拒绝属于预期安全证明，其 stderr/source 全保留。

收尾另有一次文档暂存检查失败：608 个报告/证据文件已逐文件 `git add -f -- <exact-file>` 完成，随后未限定路径的 `git diff --cached --check` 因原始诊断/PowerShell 记录中的空白或 CRLF 退出 2，外层暂存 Node 脚本退出 1。未改写任何证据原字节；单独限定产品和报告的 whitespace 检查退出 0。原 wrapper 没保存 git stdout，故另存[失败审计](../../acceptance/wave1/z/raw/evidence-stage-failure.json)与明确标为后续只读复现的[诊断日志](../../acceptance/wave1/z/raw/evidence-whitespace-reproduction.log)，不把复现冒充初次原日志。此为证据编辑检查问题，无产品/测试/冻结 helper 或锁变更，无重跑产品测试。

nc1 临时禁用 `verify_binding` 的真实身份比较，以及原生 `root_state` 对真实 P 身份的比较。运行仍成功读取并调用 U，other 根返回 `Ok(Some(... bytes_read:2 ...))`；指定测试期望 RootMismatch，精确失败。nc2 只禁用 `standard.number_of_links != 1` 的生产拒绝；硬链接文件返回 `Ok(Some(... bytes_read:30 ...))`；指定测试期望 MultipleLinks，精确失败。两次均为可运行但语义错误的生产变化，无测试开关、runner 修改或测试降级。

[nc1 原日志](../../acceptance/wave1/z/raw/2026-10-19T11-24-14.881Z-34112-red-nc1-negative.log) / [恢复记录](../../acceptance/wave1/z/raw/manual-nc1-restore.json)，[nc2 原日志](../../acceptance/wave1/z/raw/2026-10-19T11-24-37.824Z-31532-red-nc2-negative.log) / [恢复记录](../../acceptance/wave1/z/raw/manual-nc2-restore.json) 绑定坏态快照与立即原字节恢复。最终门自己审计了两条红→恢复四绿链及各快照 hash。

稳定生产聚合 hash：`3b99307f68b1be8180a2df706574f990dee5695424e610e92ea9c0f500573391`。最终测试聚合 hash：`59ff7db048387f5afd9e330d1934f13dfd8175f063df54fb1ef3cdc75e66cb44`。逐文件 SHA256 见 final sourceState；nc1/nc2 恢复后、两个 final 完全相同。

## 证据、权限与结束状态

[ARCHIVE.json](../../acceptance/wave1/z/ARCHIVE.json) 记录 **609 文件 / 2,373,412 字节**，逐项 source/archive/bytes/SHA256，复制后逐字节核实 source 和 archive。ARCHIVE 自身 SHA256 为 `d879e85c94ab19ec2fd1d5df7088239d317bd0069d6094c2b595b002f1d56737`，清单不自纳自身。包含本次 13 门、所有行为红和负控的日志/源码快照、原字节备份/恢复、全部类型探针源/编译 stderr、结束观察、fixture 元数据 index，以及文档暂存检查的失败/复现记录与补记前清单原字节；也保留本树原 08:56 控制者 baseline，未冒称为本次执行者运行。9 个编译 probe .rmeta 未归档；未归档 target/cache/binary/profile 或物理 payload。

本次仅复用本树新 marker factory：524474 字面 payload 字节，index SHA256=`d3e676e6c7a68ab56064087cb64e8bea1ddbd820629657a8699f30b69dbda418`，各门前后由冻结 factory 校验，不新增或清理夹具。该数字是工厂 payload 总量，不是本次累计读取量。测试读取 index 元数据；普通内容测试只走新同意 API；冻结 factory/probe 按票面进行受限 payload 校验。无旧 N–W fixture/真实用户项目/HOME/整盘内容读取。

旧 341 与 r2 的 202 物理条目、4 份旧资产 Git 对象、15 继承锁/426 唯一约束在各门保持；旧产品/helper/锁、根 Cargo、主线台账、X/Y 树均未修改。无越界申请、依赖安装、上游脚本、删除/移动/ACL 或发布操作。

原生系统窗口 **0**，Chrome/服务/后台 helper **0**；没有调用原生 UI driver。实际看图 **0**，本票不需截图或视觉验收，未借其它票图片冒充。[结束进程观察](../../acceptance/wave1/z/raw/end-process-observation.json) 于 11:26:16 UTC 记录本树 .local 可执行进程残留 0；所有 cargo/rustc/test 同步退出，无强制终止、无清理现场。

真实用户 scope、恶意生产竞态、自然用户额外同意/手势鉴真、macOS/其它架构、桌面/打包、Z→页面新来源接线和 M1 均未验收。当前提交完成单票实现与受控验证；交回后停测停改，不 push/merge/reset/clean，由总控收单。
