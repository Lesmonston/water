WATER-W1-V 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/v/docs/dispatch/reports/WATER-W1-V-REPORT.md

状态：SUBMITTED，等待总控独立验收。完成日期：2026-10-19（Asia/Tokyo）；以下证据文件时间为 UTC。本报告不宣称 VERIFIED、W 联合链已完成或 M1 完成。

**提交与范围**

| 项目 | 实际值 |
|---|---|
| 权威工单 | 主检出 `docs/dispatch/tickets/WATER-W1-V-NATIVE-SESSION-20261019.md` |
| 工作树 / 分支 | `F:/new/smaltalk/water/.worktrees/v` / `worker/water-w1-v` |
| 首次精确 HEAD / 基线 | `30a803537602211ed2a11c106c63fd27cefb260f` |
| 基线标签 | `water-w1-native-host-base-20261019` |
| 开工检查 | 主 manifest 为 READY、baselineStatus=PASSED；分支/HEAD 精确、干净、产品目录不存在 |
| 实现及全部 final 受测 SHA | `30875645f03ddc01019eb4b3cb00f9ab7d1c068d` |
| 实现提交 | `feat(native-session): capture native selections with scoped cleanup and CLI` |
| 报告提交定位 | 本分支中紧随上述 SHA 的证据提交，标题 `docs(native-session): submit V report and raw verification evidence`；可用 `git log -1 --format=%H -- docs/dispatch/reports/WATER-W1-V-REPORT.md` 解析完整 SHA |
| 实际执行引擎/模型 | Codex，系统标识 GPT-6；未启用子代理、外部模型或其它实现者 |
| 工具 | Windows x64、Node 24.16.0、Rust 1.95.0/MSVC；私有 offline/locked、jobs=1 |
| 产品改动 | 仅 `packages/native-session/{Cargo.toml,Cargo.lock,README.md,src/lib.rs,src/main.rs,src/v1.rs,tests/session_v1.rs}` |
| 后续提交范围 | 仅本报告和 `docs/acceptance/wave1/v/` 的原字节证据；没有 final 后产品修改 |

独立 workspace，唯一 lib/bin/test，四个 auto=false，9 个指定直接依赖。锁文件只由冻结 helper 的 lock 模式离线生成，没有安装、fetch 或新增依赖。主线台账、旧 A–U 产品/测试、根 Cargo、所有冻结材料/helper、其它树及上游保持只读。未合主线、push、reset、clean、删除或改变全局配置。

**实现与逐项验证**

| 需求 | 实现与实际证据 |
|---|---|
| 真实 S→P→R→E/H/Q | `capture_session` 委托 `NoopObserver`；实际 S 首先打开系统选择器；只从返回的 `SelectedScope.root_path()` 与 scope capability 调用 R。没有 case/id 分支、probe 替代产品或路径 fallback。六种实际扫描预算与独立 P/R 取得的 A 报告及 E/H/Q 逐值比较 |
| 本次登记生命周期 | 私有 `Registration` 持有 registry 借用和 SelectedScope；正常 release 实际 revoke，失败保留未释放状态由 Drop 尽力 revoke。R 自行管理 attempt。错误路径保留原始错误，正常 revoke 失败返回 Registry。实际成功、取消、observer unwind 后检查计数并复用同一 ID/root；宿主 scope 仍可 begin/check/finish |
| 两类取消不同 | 满容量 registry 上真实选择器取消得到七键 wire、snapshots=[]；R 预取消仍真实确认，产生一份真实 cancelled 报告。observer 第一次回调取消保留一条扫描记录；panic 向外展开，scope 被撤销 |
| 错误不撤销别人 | 实际满容量、DuplicateScope、DuplicateRoot、缺失初始目录和 junction 初始目录错误均保留宿主项；后续同 registry 仍可完成真实会话。nc1 实际 R RootMismatch 返回前也通过登记数量断言 |
| 真实来源、策略与未知值 | source_kind 固定为 native_scope_metadata；预算来自 ScanOptions getters；ordinary_content_read / native_user_gesture_authenticated / race_protection_verified 均 false。保留实际 Unknown、保护原因、来源 totals、空串根 issue；completed 仅策略内覆盖 |
| wire 私有边界 | SessionCapture 及所有新增嵌套字段私有；Debug/Clone/PartialEq/Serialize，无 Default/Deserialize/任意构造器/可变 getter。精确 envelope/policy/limits/snapshot 键集合；无完整 R sidecar、root/file ID、绝对根或能力；Q string 与独立 Q 原字符串相等 |
| 字节与大小 | 使用同一 to_json 校验返回值及公开序列化；UTF-8 字节长度上限 envelope 67,108,864、Q string 16,777,216，使用严格大于判断，不截断。实际中文文件名保留，Q 原字符串保持。大输入拒绝分支未用当前小夹具动态触发，见限制 |
| CLI | 仅 args_os 参数、协议 stdout 与固定错误 stderr；一个初始目录只用于 PickerOptions。固定 IDs/容量4/预算8、10000、256。无/多参数64，其它错误2；无 unwrap 输出路径。实际无/多参、相对路径、缺失目录及非 Unicode 参数测试通过，无参数回显 |
| 实际 V.exe | final bridge 直接启动新 V.exe，真实选择成功/取消、精确 UTF-8 紧凑对象+单 LF、stderr 空，并和冻结期望逐值一致；另外实际库取消/完整/预取消逐值匹配并保持已有宿主项 |
| 无额外能力 | 库与 bin forbid unsafe，无新 FFI；库不读取 env/fs/时钟/stdin、不起进程/网络或写文件。测试仅读取冻结索引、编译输出目录元数据；UI 用冻结 driver，编译隐私证明用私有编译环境 |

精确五个顶层 Rust 测试，没有 filter/skip/ignored/嵌套计数：

1. `session_selection_cancelled`：满容量且 token 预取消时仍真实取消窗口，不登记，不产生报告，宿主能力及容量保持。
2. `session_native_capture`：完整、深度1、全局3条预算、深度0、根1条预算、每目录1条预算，实际独立 R/E/H/Q 逐值比较；实际8条完整观察、中文名称、链接 no-follow、Unknown/保护/来源 totals 和根空串 issue。
3. `session_cancellation_and_cleanup`：真实确认后的预取消、observer 取消及 panic；原始 panic 被 catch_unwind 观察，清理完成，原 ID/root 重新登记及新 attempt 成功。
4. `session_errors_preserve_registry`：三个实际 P 登记错误及两个实际 S/N 初始错误、宿主保持与后续成功；普通 capture 辅助在成功/错误返回时都断言实际 registry 数量恢复。
5. `session_public_wire_and_cli`：实际公开 observer API、wire/来源/策略/Q 字符串、错误 Display/trait、7 项编译拒绝和1项成功对照、实际 CLI 错误分支。

隐私编译证明直接用当前私有 target 的实际 rlib；成功对照证明依赖可链接。7 项分别拒绝 snapshots 读取、read_only 修改、policy 修改、空结构构造、Default、Deserialize、new 构造。final test 日志含 `PRIVATE_API_PROOF 0 exit=Some(0)` 及 1–7 的 `exit=Some(1)`，保留完整编译诊断；不是缺包/编译环境失败造红。每套通过的五测都有实际14次 select 和1次 cancel。

**先红、实现与四条当前字节证据链**

先完成完整五测和真实弹窗骨架，lock 后首次 red-behavior 在 UTC 03:26:28–03:26:42 执行，实际5测全部运行，1通过/4失败、进程退出101，命中 V_BEHAVIOR。骨架已真实选择/登记/撤销，但没有调用扫描/投影；随后实现真实链路，03:27 suite 五绿。此首次红保留于 `2026-10-19T03-26-27.687Z-16056-red-behavior-*`，不是实现后倒补的历史声明。

之后格式化、补非 Unicode CLI 参数测试及所有返回的登记计数断言，测试/生产字节已变化，故在稳定版本重放同一“确认后缺少实际扫描/投影”的缺陷。下面 behavior 明确是实现后的稳定字节重放，不能等同首次历史红。每个红都运行完整五测（1通过/4失败、无跳过，测试退出101）；helper 成功观察预期失败而自身退出0。每红后立即从备份恢复 v1.rs 原字节并比较 Buffer equality，随后完整五绿，才开始下一项；未改测试、runner 或超时。

| 链 | 实际缺陷 / 目标 | 红回执前缀 | 立即恢复五绿回执前缀 |
|---|---|---|---|
| behavior（重放） | 去掉真实扫描/投影，确认但无 snapshot；V_BEHAVIOR | `2026-10-19T03-29-51.254Z-1916-red-behavior` | `2026-10-19T03-30-14.716Z-24608-suite` |
| nc1 | 实际传 R 根改成 SelectedScope 根的父目录；保留 R 身份门，真实 Scan(RootMismatch)；V_SELECTED_ROOT | `2026-10-19T03-30-41.877Z-22908-red-nc1` | `2026-10-19T03-31-01.727Z-28864-suite` |
| nc2 | 正常 release 删除实际 revoke，却设 released=true，真实 registry 留一项；V_RELEASED | `2026-10-19T03-31-29.769Z-25788-red-nc2` | `2026-10-19T03-32-04.065Z-30736-suite` |
| nc3 | 实际 Snapshot 构造 source_kind 改为 synthetic_memory；V_NATIVE_SOURCE | `2026-10-19T03-32-23.663Z-3520-red-nc3` | `2026-10-19T03-32-56.053Z-25244-suite` |

各前缀对应本票证据目录中的 `-result.json`、完整日志及生产/测试原字节快照。最终四链都由每个 final 的 proofAudit 核验。原字节备份 `manual-stable-v1.txt` 保留。最终 v1.rs SHA256 为 `2097a416f69830c325f0a27e406b991475ab2059930fbad56dada054e9216674`；测试文件 SHA256 为 `fecb2338a8624838de1844e8cbfa7545c7cc4099d80792c7770b50c460b9a9d5`。helper productionHash 为 `7f51c4183497b2b616824effb6691c123af964218dbff34b800bad6812e9c80f`，testHash 为 `e0242ce82b098ff3209a2b3829357ab944043294fe41da4bea616739c2f9b376`。

**命令、final 与全部失败记录**

所有 helper 命令均为 `node scripts/native-host-check.mjs --task WATER-W1-V --mode <mode>`，final 另带 `--final`；每树一次一门，子命令限180秒。原有 02:18 controller baseline 未冒称本次执行。本次 03:21 baseline 复核实际8份原生捕获、旧T24份与夹具一致，仅证明既有依赖；不计为 V 产品测试。

执行顺序：baseline → lock → 首次 red-behavior → suite → clippy → 稳定 suite → 重放 red-behavior → suite → red-nc1 → suite → red-nc2 → suite → red-nc3 → suite → 提交实现 → fmt/test/clippy/metadata/bridge 五 final。全部 helper 自身退出0；五次预期红测试进程退出101，其余实际测试进程退出0。所有20份 helper 回执（含原 controller baseline）及每条内部命令/退出码/原日志都已归档，详细机器可读索引见 `manual-final-audit.json`。

| 同一干净实现 SHA 的 final | 退出码 / 结果 | 原回执 |
|---|---|---|
| fmt --final | 0；格式与四链 proofAudit 通过 | `2026-10-19T03-33-31.943Z-29788-fmt-result.json` |
| test --final | 0；5 passed、0 failed/ignored/measured/filtered；编译正负证明通过 | `2026-10-19T03-33-47.371Z-26440-test-result.json` |
| clippy --final | 0；all-targets、-D warnings | `2026-10-19T03-34-41.660Z-20408-clippy-result.json` |
| metadata --final | 0；独立 workspace、9指定直接依赖、3 targets、批准离线锁 | `2026-10-19T03-34-56.193Z-4112-metadata-result.json` |
| bridge --final | 0；实际库及真实 V.exe 选择/取消精确协议、错误CLI | `2026-10-19T03-34-58.394Z-17280-bridge-result.json` |

没有未解决的产品测试/编译/helper 失败。预期红的失败细节与 observer 故意 panic 均保留，不能把日志中的 panic 当成未处理的产品失败。辅助操作另有：首次 PowerShell 非 UTF-8 显示乱码后按 UTF-8 重读；两次猜测的 PROVENANCE.md / bridge.mjs 路径不存在，后读取实际 PROVENANCE.json / acceptance/native-session-bridge.rs；rustup 不在 PATH，一次格式化命令未运行，改用已安装的绝对 rustup 路径成功。详 `manual-execution-notes.json`，该文件标明是人工执行摘要，不伪装原始工具输出。没有删除失败证据或修改冻结工具。

归档暂存后一次额外的全范围 `git diff --cached --check` 退出2：17份原始日志中的334条原有行尾空白/CRLF警告。检查诊断按原字节保存到 `manual-archive-whitespace-check.log`，原因、命令及退出码在同名 JSON；这是非工单 final 的归档格式检查，不是产品测试失败。依据原字节归档要求保留这些字节，未改 `.gitattributes` 或日志；仅源码/报告的同项格式检查退出0，证据另按长度/SHA256/Git blob 原字节核对。

**归档、安全与尚未验证**

[ARCHIVE.json](../../acceptance/wave1/v/ARCHIVE.json)列出394份原字节证据，共3,553,918字节，逐项记录本树来源、目标、长度和 SHA256；覆盖全部 helper 回执/日志、首次行为红、稳定版红/恢复快照、稳定备份、执行说明及归档格式检查诊断。包含原树 controller baseline，保持原来源身份。本票 driver 未产图片，因此图片数0，没有伪造截图。目标采用既有冻结 `.gitattributes` 的 -text，log 显式 force add；不纳入 target/cache/binary/profile 或 fixture payload。

[manual-final-audit.json](../../acceptance/wave1/v/manual-final-audit.json)实核14个锁族（新锁+13继承锁）、336唯一冻结文件原字节一致，旧291保持；final 前后工作树均干净且 SHA 相同。产品和证据提交只在票面白名单内。

只复用本树冻结 factory 的4目录、6文件条目（含1硬链接）、1junction，字面60字节/逻辑74字节，索引 SHA256 `b7a196ccdfa5c761538112d8027df9cccc3b58400f0ce749625053f67ae825f8` 在各门前后保持。Rust读取索引及元数据，未读普通 payload；仅冻结 helper 可按原协议校验已知 payload。没有手工造夹具、清理、HOME/盘根/其它项目或真实用户目录扫描。

受控窗口由冻结 driver 对测试 PID 固定 title 的系统按钮操作；这不是自然用户手势鉴真。S 已验收的“实际选择可不同于初始目录”未在本票新增 UIA 子目录手势测试；本实现逐行只消费 SelectedScope.root_path，并以父目录误传负控命中真实身份拒绝。Completed 仅声明预算/no-follow 策略内覆盖，不表示卷唯一空间、回收量或删除授权。

以下保持未验证：真实用户 scope、恶意生产竞态、macOS、桌面壳/打包/发布、V→W 固定启动器→HTTP/Chrome/下载联合链、M1 用户闭环。当前小夹具没有动态触发64 MiB/16 MiB超限、分配失败/serde失败、真实 stdout/stderr I/O故障、正常 P.revoke 失败或投影库返回错误；这些路径按冻结接口显式处理/传播并经静态审阅，不宣称都已运行。没有为触发这些错误扩权、构造假能力或引入生产测试开关。

无接口/权限/依赖补充申请。交回后停止修改，等待总控收单、独立复测与集成。
