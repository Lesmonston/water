// Build docs/dispatch/wave10/manifest.json and the eight first-batch tickets from earlier wave task entries.
// Usage: node make-w10.mjs <base commit sha>
import fs from 'node:fs';
import crypto from 'node:crypto';
const repo = 'F:/new/smaltalk/water';
const BASE = process.argv[2];
if (!/^[0-9a-f]{40}$/.test(BASE ?? '')) throw new Error('base commit sha required');
const DAY = '20261105', READY = '2026-11-05';
const TAG = 'water-w10-m35-base-' + DAY;
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(repo + '/' + p)).digest('hex');
const frozen = paths => [...new Set(paths)].map(path => ({ path, sha256: sha(path) }));
const clone = v => JSON.parse(JSON.stringify(v));
const load = w => JSON.parse(fs.readFileSync(repo + '/docs/dispatch/' + w + '/manifest.json', 'utf8'));
const W5 = load('wave5'), W8 = load('wave8'), W9 = load('wave9');
const pick = (m, id) => { const t = m.tasks.find(t => t.id === id); if (!t) throw new Error(id); return clone(t); };
const DROP = ['dispatchReportedAt', 'dispatchEvidence', 'startEvidence', 'submittedHead', 'implementationCommit', 'controllerReview', 'controllerReview2',
  'addenda', 'verifiedAt', 'acceptedCommit', 'integrationCommit', 'integrationBranch', 'addendumModel', 'verificationScope', 'mergeCommit', 'mergeCommits',
  'carryOverLater', 'carryOverM2', 'acceptance', 'blockedAt', 'blockedCommit', 'blockedReason', 'workerSelfReport', 'preflightEvidence'];
const RULES = 'docs/dispatch/W10-M35-WORKER-RULES.md';
const PLAN = 'docs/dispatch/wave10/PLAN.md';
const ADR19 = 'docs/decisions/ADR-019-project-declarations-and-quarantine.md';
const C = n => 'contracts/m35-v1/' + n + '.md';
const NEW_CRATE = { outputRootExists: false, nativeModule: null, allowedFfi: undefined, forbidPatterns: undefined, realMode: 'env-only',
  allowedModes: ['baseline', 'lock', 'check', 'test', 'archive', 'real', 'red-nc1', 'red-nc2', 'red-nc3'], expectedFinalModes: ['check', 'test', 'real'] };

const specs = [
  { n: 'm1', tpl: pick(W9, 'WATER-W9-L1'), short: 'RULES', title: '规则：新字段、新定位、会话开关与新规则', root: 'packages/junk-rules', gate: 'light', gateZh: '轻门',
    spec: C('RULES-M35'), also: ['contracts/checkup-v1/RULES.md', 'contracts/checkup-v1/MODEL.md', 'contracts/m3c-v1/RULES-M3C.md', 'contracts/m3d-v1/RULES-M3D.md'],
    alsoNote: '计划 JSON 的新键也要被扫描读回，见 SCAN-M35 第 1 节（只读，扫描由 M2 实现）', alsoRead: [C('SCAN-M35')],
    rows: '第 4～20、36、38、53、55、56 行与第 9 行（卸载残留）',
    code: ['packages/junk-rules/src/types.rs', 'packages/junk-rules/src/rules.rs', 'packages/junk-rules/src/plan.rs', 'packages/junk-rules/src/folders.rs', 'packages/junk-rules/rules/windows.json', 'packages/junk-rules/tests/rules_v1.rs'],
    todo: ['SPEC 第 1 节：规则的新字段与校验（含 `installed_names`）', '第 2 节：`root_levels`', '第 3 节：两种新 marker、四个新条件、`custom_discovery`、`system_drive`', '第 4 节：`unlocks` 与会话开关 `resolve_plan_with`', '第 5、6 节：改动的已有规则与 32 条新规则', '第 7、8 节：计划 JSON 的键顺序与数据版本'],
    keep: '不给 `MatchSpec`、`InUseMode` 加成员；不用新字段时计划 JSON 与改动前逐字节相同；`KnownFolders` 的字段与 JSON 不变。',
    testFile: 'packages/junk-rules/tests/rules_v1.rs', tests: ['rules_schema_strict', 'rules_protection_precedence', 'rules_resolve_plan', 'rules_seed_coverage'],
    markers: ['RULES_M35_FIELDS', 'RULES_M35_SEEDS', 'RULES_M35_SESSIONS', 'RULES_M35_VERSION'], authorized: 'SPEC 第 9 节获准的三类',
    ncs: [['nc1', '`resolve_plan` 也为带 `session_tool` 的规则生成目标', 'RULES_M35_SESSIONS'], ['nc2', '`custom_discovery` 对任何 custom root 都生成目标', 'RULES_M35_FIELDS']],
    finals: ['check', 'test', 'real'], real: '`real --final` 只读已知目录是否存在，输出只有计数。', ffi: '不新增系统函数',
    hint: 'Rules data, validator and plan JSON; light gate; no web access needed.', extra: {} },
  { n: 'm2', tpl: pick(W9, 'WATER-W9-L2'), short: 'SCAN', title: '扫描：新定位、分配大小、泄漏簇、联接索引与空间分布', root: 'packages/junk-scan', gate: 'medium', gateZh: '中门',
    spec: C('SCAN-M35'), also: ['contracts/checkup-v1/SCAN.md', 'contracts/checkup-v1/MODEL.md', 'contracts/m3c-v1/SCAN-M3C.md', 'contracts/m3d-v1/SCAN-M3D.md', 'contracts/m3d-v1/RULES-M3D.md'],
    alsoNote: '新键与新条件的 JSON 定义见 RULES-M35 第 1～3、7 节（只读，规则由 M1 实现）', alsoRead: [C('RULES-M35')],
    rows: '第 1～3、6～8、10～11、23（只到“交给 MANIFEST”为止）、25、26、33、37～39、43、46、62 行',
    code: ['packages/junk-scan/src/plan.rs', 'packages/junk-scan/src/scan.rs', 'packages/junk-scan/src/model.rs', 'packages/junk-scan/src/native_windows.rs', 'packages/junk-scan/src/snapshot.rs', 'packages/junk-scan/src/lib.rs', 'packages/junk-scan/examples/real_smoke.rs', 'packages/junk-scan/tests/scan_v1.rs'],
    todo: ['SPEC 第 1 节：计划 JSON 的新键、新 marker、新条件与校验', '第 2 节：分配大小与年龄口径', '第 3、4 节：新规则字段、marker 与条件的判断', '第 5 节：名字模板与泄漏簇', '第 6 节：贵重件名、怪名、`.water-quarantine`、兜底问题的归属', '第 7 节：`scan_full`、联接索引、声明文件', '第 8 节：`space_overview`'],
    keep: '`scan()` 的签名与结果不变（等于缺省的 `scan_full().0`）；`ScanResult`、`ScanOptions` 不加字段；不读文件内容；每个目录只列一次。',
    testFile: 'packages/junk-scan/tests/scan_v1.rs', tests: ['scan_plan_contract', 'scan_pattern_marker_discovery', 'scan_overlap_and_guards', 'scan_reparse_budget_cancel', 'scan_snapshot_growth_keys'],
    markers: ['SCAN_M35_PLAN', 'SCAN_M35_TEMPLATE', 'SCAN_M35_MARKERS', 'SCAN_M35_CLUSTERS', 'SCAN_M35_RULES', 'SCAN_M35_NAMES', 'SCAN_M35_QUARANTINE', 'SCAN_M35_JUNCTIONS', 'SCAN_M35_FALLBACK_ISSUES', 'SCAN_M35_OVERVIEW', 'SCAN_M35_SIZES', 'SCAN_M35_COMPAT'], authorized: 'SPEC 第 9 节获准的三类',
    ncs: [['nc1', '成簇门槛改成 2', 'SCAN_M35_CLUSTERS'], ['nc2', '忽略 `unlocks_target_ids`', 'SCAN_M35_RULES'], ['nc3', '`disk_bytes` 改用逻辑长度', 'SCAN_M35_SIZES']],
    finals: ['check', 'test', 'real'], real: '`real --final` 是一次只读真实扫描（含 `scan_full` 三个开关与用户目录的空间分布），只输出组级汇总与个数，不含路径与名字；回执写用时与访问条目数。',
    ffi: '新增 `DeviceIoControl`，只用于 `FSCTL_GET_REPARSE_POINT`（SPEC 开头的原则）',
    hint: 'Rust scan engine: plan JSON, allocation sizes, leak clusters, junction index and space overview; medium gate with a read-only real scan.',
    extra: { allowedFfi: ['CloseHandle', 'CoTaskMemFree', 'CreateFileW', 'DeviceIoControl', 'GetFileInformationByHandleEx', 'GetVolumeInformationByHandleW', 'SHGetKnownFolderPath'],
      allowedModes: ['baseline', 'lock', 'check', 'test', 'archive', 'real', 'red-nc1', 'red-nc2', 'red-nc3'] } },
  { n: 'm3', tpl: pick(W9, 'WATER-W9-L2'), short: 'MANIFEST', title: '新包：项目清理声明与工作树登记', root: 'packages/cleanup-manifest', gate: 'medium', gateZh: '中门（新包）',
    spec: C('MANIFEST-M35'), also: [ADR19], alsoNote: '转出的扫描目标要符合 SCAN-M35 第 1 节（只读）', alsoRead: [C('SCAN-M35')],
    rows: '第 23、57、58、60、61 行', code: ['packages/junk-scan/src/plan.rs（只读：计划 JSON 的目标格式与段语法）'],
    todo: ['SPEC 第 1 节：新建包与边界', '第 2、3 节：声明文件第一版与路径模式', '第 4 节：`to_targets`', '第 5 节：`protects`', '第 6 节：`read_git_link`', '第 7 节：读文件、`parse`、自己实现的 `sha256_hex`'],
    keep: '只读 `.water-cleanup.json` 与 `.git` 小文件；不写、不建、不删、不起进程、不联网；依赖只有 serde 与 serde_json。',
    testFile: 'packages/cleanup-manifest/tests/manifest_v1.rs', tests: ['manifest_parse_contract', 'manifest_targets_and_protect', 'manifest_read_files', 'manifest_git_link'],
    markers: ['MANIFEST_FORMAT', 'MANIFEST_TARGETS', 'MANIFEST_PROTECT', 'MANIFEST_READ', 'MANIFEST_GITDIR'], authorized: null,
    ncs: [['nc1', '路径模式放行 `..`', 'MANIFEST_FORMAT'], ['nc2', '`to_targets` 不看 `trusted`', 'MANIFEST_TARGETS']],
    finals: ['check', 'test', 'real'], real: '`real --final` 只读本仓库 `.worktrees\\` 下 `.git` 小文件的三种状态个数；仓库根有声明文件时读一次，只输出有效与否、条目数与哈希前 8 位。',
    ffi: '没有系统函数（`#![forbid(unsafe_code)]`）', hint: 'New std-only Rust crate: strict JSON schema, path patterns, SHA-256, git link reading; medium gate.',
    extra: { ...NEW_CRATE, allowedModes: ['baseline', 'lock', 'check', 'test', 'archive', 'real', 'red-nc1', 'red-nc2'], packageName: 'water-cleanup-manifest', testTarget: 'manifest_v1' } },
  { n: 'm4', tpl: pick(W5, 'WATER-W5-H1'), short: 'CLEAN', title: '执行器：解锁对与隔离区', root: 'packages/junk-clean', gate: 'heavy', gateZh: '重门',
    spec: C('CLEAN-M35'), also: ['contracts/checkup-v1/CLEAN.md', 'contracts/hardening-v1/CLEAN-HARDENING.md', ADR19], alsoNote: '解锁对的来由见 RULES-M35 第 4.1 节（只读）', alsoRead: [C('RULES-M35')],
    rows: '第 39、40、42～45、47、64、65 行',
    code: ['packages/junk-clean/src/lib.rs', 'packages/junk-clean/src/model.rs', 'packages/junk-clean/src/native_windows.rs', 'packages/junk-clean/src/path.rs', 'packages/junk-clean/tests/clean_v1.rs'],
    todo: ['SPEC 第 2 节：`unlocked_paths`', '第 3 节：`quarantine`（同盘改名、从不跨盘复制）', '第 4 节：`restore`（从不覆盖、可还原到旁边）', '第 5 节：`purge`（链接只删链接本身、逐个报遗留）', '第 6 节：`list_quarantines`、`inspect` 与序列化', '新建 `examples/real_smoke.rs`（在 `Cargo.toml` 登记）'],
    keep: '`execute` 除解锁对外行为不变；不给已有枚举加成员；`src/` 里没有 `std::fs`；系统函数只按 SPEC 第 1 节。',
    testFile: 'packages/junk-clean/tests/clean_v1.rs', tests: ['clean_plan_contract', 'clean_revalidation_skips', 'clean_no_follow', 'clean_partial_stop_journal', 'clean_report_volume', 'clean_handle_hardening', 'quarantine_unlock_pair', 'quarantine_move_contract', 'quarantine_restore_contract', 'quarantine_purge_contract', 'quarantine_inspect_and_list'],
    markers: ['CLEAN_M35_UNLOCK', 'CLEAN_M35_MOVE', 'CLEAN_M35_RESTORE', 'CLEAN_M35_PURGE', 'CLEAN_M35_INSPECT'], authorized: null,
    ncs: [['nc1', '`rename_at` 的 `ReplaceIfExists` 改为 1', 'CLEAN_M35_RESTORE'], ['nc2', '`purge` 打开子项时去掉不跟随重解析点', 'CLEAN_M35_PURGE'], ['nc3', '`from_json` 忽略 `unlocked_paths`', 'CLEAN_M35_UNLOCK']],
    finals: ['check', 'test', 'real'], real: '`real --final` 只读：各固定盘 `<盘>:\\.water-quarantine` 的状态与编号目录个数；**不移入、不复原、不删除任何真实文件**。',
    ffi: '在原有 8 个上新增 `NtCreateFile`（只在 `create_dir_at` 里、只许 `FILE_CREATE`）；`SetFileInformationByHandle` 只许类 3、4、21',
    hint: 'Rust handle-based deletion engine: quarantine move, restore, purge; heavy gate; deletes only test fixtures.',
    extra: { allowedFfi: ['CreateFileW', 'GetFileInformationByHandleEx', 'SetFileInformationByHandle', 'GetVolumeInformationByHandleW', 'GetDiskFreeSpaceExW', 'CloseHandle', 'NtOpenFile', 'NtCreateFile', 'RtlNtStatusToDosError'],
      realMode: 'env-only', allowedModes: ['baseline', 'lock', 'check', 'test', 'archive', 'real', 'red-nc1', 'red-nc2', 'red-nc3'], expectedFinalModes: ['check', 'test', 'real'], testTarget: 'clean_v1' } },
  { n: 'm5', tpl: pick(W8, 'WATER-W8-K5'), short: 'HOST', title: '宿主：转发第十波命令，打开隔离区文件夹', root: 'apps/water/host', gate: 'heavy-native', gateZh: '中门（含整机检查）',
    spec: C('HOST-M35'), also: [C('IPC-M35'), 'contracts/m3c-v1/HOST-M3C.md', 'contracts/m3c-v1/IPC-M3C.md', 'contracts/m3-v1/HOST-M3-FIX.md', 'contracts/m3-v1/HOST-M3.md', 'contracts/m2-v1/HOST-M2.md', 'contracts/desktop-v1/HOST.md', 'contracts/checkup-v1/IPC.md'],
    alsoNote: '`quarantine_locate` 由服务提供（SERVICE-M35 第 7 节，服务第二批才做），本单按假后端做', alsoRead: [C('SERVICE-M35')],
    rows: '第 64 行（打开隔离区文件夹）', code: ['apps/water/host/src/commands.rs', 'apps/water/host/src/lib.rs', 'apps/water/host/src/service.rs', 'apps/water/host/tests/host_v1.rs'],
    todo: ['SPEC 第 1 节：命令表 19 → 36', '第 2 节：转发规则（`scan_start`、`clean_prepare`、`group_items` 与其余新命令）', '第 3 节：`quarantine_reveal` 与 `src/opener.rs`', '第 4 节：`clean_state` 把 `purging` 也算正在清理'],
    keep: '薄转发；capabilities、CSP、导航与窗口安全设置不变；`plugins` 为空；不加依赖；不加系统函数（仍然 `forbid(unsafe_code)`）。',
    testFile: 'apps/water/host/tests/host_v1.rs', tests: ['host_config_boundary', 'host_navigation_boundary', 'host_command_registry', 'host_data_directory', 'host_service_wiring'],
    markers: ['HOST_M35_COMMANDS', 'HOST_M35_FORWARD', 'HOST_M35_REVEAL', 'HOST_M35_PURGE_EXIT'], authorized: 'SPEC 第 5 节获准的三处',
    ncs: [['nc1', '`quarantine_reveal` 不核对服务给的路径', 'HOST_M35_REVEAL'], ['nc2', '`scan_start` 没有位置时发 `{"locationIds": null}`', 'HOST_M35_FORWARD']],
    finals: ['check', 'test', 'native'], real: '`native --final` 同第八波 K5：本树 `.local/w10-m5-native/` 的夹具，七个分类全部关闭，只清理夹具；原生窗口 1 个、选择框 0 个；界面仍是基线版本；**不点“打开文件夹”**。',
    ffi: '不加系统函数；只有 `src/opener.rs` 可以启动 `explorer.exe`（检查器核对恰好一处 `Command::new`），环境变量只多读 `SystemRoot`',
    hint: 'Tauri host thin adapters, one guarded Explorer opener, host tests; one native window in the final.',
    extra: { allowedEnv: ['"WATER_DATA_DIR"', '"SystemRoot"'], spawnFile: 'src/opener.rs', nativeDataPrefix: '.local/w10-m5-native/', allowedModes: ['baseline', 'lock', 'check', 'test', 'native', 'red-nc1', 'red-nc2', 'archive'] } },
  { n: 'm6', tpl: pick(W8, 'WATER-W8-K6'), short: 'UI', title: '界面：按设计 v2 重做（界面单）', root: 'apps/water/ui', gate: 'light', gateZh: '中门（浏览器测试与逐页截图）',
    spec: C('UI-M35'), also: [C('IPC-M35'), 'contracts/m35-v1/ui-fixtures-m35.json', 'contracts/m3c-v1/IPC-M3C.md', 'contracts/m3c-v1/ui-fixtures-m3c.json', 'contracts/checkup-v1/IPC.md', 'contracts/checkup-v1/ui-fixtures.json', 'contracts/checkup-v1/UI.md', 'docs/design/water-ui-v2/DESIGN.md', 'docs/design/water-ui-v2/mockup.html', 'docs/design/water-ui-v2/tokens.css'],
    alsoNote: '设计稿的 22 张预览在 `docs/design/water-ui-v2/previews/`，截图逐张对照', alsoRead: [],
    rows: '第 28、32、33、41、48、49、51～56、64～67 行的显示', code: ['apps/water/ui/index.html', 'apps/water/ui/app.mjs', 'apps/water/ui/ipc.mjs', 'apps/water/ui/model.mjs', 'apps/water/ui/format.mjs', 'apps/water/ui/views/', 'apps/water/ui/styles/', 'apps/water/ui/tests/unit.test.mjs', 'apps/water/ui/tests/browser.test.mjs'],
    todo: ['SPEC 第 2 节：导航与路由（含旧地址重定向）', '第 3 节：每一页按表接上 IPC-M35 的字段与命令', '第 4 节：按钮、菜单与键盘', '第 5 节：整机检查依赖的新冻结文字', '第 7 节：重写测试与 26 张截图'],
    keep: '原生 ES 模块，没有 npm；界面永远不传路径；不合并、不排序、不截断服务给的列表；材质、颜色、字体、动效、品牌照 v1 第 2、10 节与 v2。',
    testFile: 'apps/water/ui/tests/unit.test.mjs、apps/water/ui/tests/browser.test.mjs', tests: ['ui_format_bytes_time', 'ui_v2_view_rules', 'ui_ipc_boundary'],
    browserTests: ['ui_v2_home_scan', 'ui_v2_conclusion', 'ui_v2_drawer_details', 'ui_v2_confirm_done', 'ui_v2_quarantine_dedupe', 'ui_v2_pages_layout_a11y'],
    markers: ['UI_V2_HOME', 'UI_V2_CONCLUSION', 'UI_V2_DRAWER', 'UI_V2_CONFIRM', 'UI_V2_QUARANTINE', 'UI_V2_DEDUPE', 'UI_V2_PAGES', 'UI_IPC_NO_PATH'], authorized: 'SPEC 第 7 节获准的删除与修改',
    ncs: [['nc1', '界面把卡片按体量重新排序', 'UI_V2_CONCLUSION'], ['nc2', '确认框的二选一缺省为“直接删除”', 'UI_V2_CONFIRM'], ['nc3', '抽屉的搜索把 `display_path` 作为参数发出', 'UI_IPC_NO_PATH']],
    finals: ['check', 'test', 'browser'], real: '没有真实数据；全部用样例。',
    ffi: '无', hint: 'UI ticket: rebuild to design v2 (frosted white glass, conclusion first); browser tests and 26 screenshots compared page by page with the mockup.',
    extra: { tokensSource: 'docs/design/water-ui-v2/tokens.css', fixtures: 'contracts/m35-v1/ui-fixtures-m35.json', expectedBrowserTests: null, browserProofs: ['nc1', 'nc2', 'nc3'] } },
  { n: 'm8', tpl: pick(W9, 'WATER-W9-L2'), short: 'DUP', title: '新包：用户发起的逐字节查重', root: 'packages/dup-finder', gate: 'medium', gateZh: '中门（新包）',
    spec: C('DUP-M35'), also: [ADR19], alsoNote: null, alsoRead: [], rows: '第 58、66 行', code: ['packages/junk-scan/src/native_windows.rs（只读：句柄信息类的写法可参考）'],
    todo: ['SPEC 第 1 节：新建包与边界', '第 2 节：接口', '第 3 节：列目录、按大小分组、认硬链接、先比开头、完整哈希、读完复查、取消', '第 4 节：建议留哪一份', '第 5 节：结果（含 `same_name_different`）'],
    keep: '只在调用时读、只为算哈希读，按块读完即丢；不写、不建、不删、不起进程、不联网；不读云占位与离线文件。',
    testFile: 'packages/dup-finder/tests/dup_v1.rs', tests: ['dup_contract', 'dup_skips_and_change', 'dup_cancel_and_budget', 'dup_sha256_vectors'],
    markers: ['DUP_GROUPS', 'DUP_KEEP', 'DUP_SKIPS', 'DUP_CANCEL', 'DUP_SHA256'], authorized: null,
    ncs: [['nc1', '按大小与名字分组、不算哈希', 'DUP_GROUPS'], ['nc2', '不认硬链接（不读身份）', 'DUP_GROUPS'], ['nc3', '不跳过带 `Offline` 属性的文件', 'DUP_SKIPS']],
    finals: ['check', 'test', 'real'], real: '`real --final` 只对本仓库 `docs/` 查一次重，只输出列出的文件数、候选数、组数与可腾出字节数，不输出路径。',
    ffi: '只有 `GetFileInformationByHandleEx`（类 1、9、18）与 `GetVolumeInformationByHandleW`（只取卷序列号），放在 `src/native_windows.rs`',
    hint: 'New Rust crate: duplicate finder with own SHA-256, hard-link identity and cancel; medium gate.',
    extra: { ...NEW_CRATE, nativeModule: 'native_windows.rs', allowedFfi: ['GetFileInformationByHandleEx', 'GetVolumeInformationByHandleW'], packageName: 'water-dup-finder', testTarget: 'dup_v1' } },
  { n: 'm9', tpl: pick(W9, 'WATER-W9-L2'), short: 'APPS', title: '新包：读已安装程序列表', root: 'packages/installed-apps', gate: 'light', gateZh: '轻门（新包）',
    spec: C('APPS-M35'), also: [ADR19], alsoNote: null, alsoRead: [], rows: '第 9 行', code: [],
    todo: ['SPEC 第 1 节：新建包与边界（三处卸载登记、三个值）', '第 2、3 节：接口与一条登记怎么取', '第 4 节：认名字（`installer_tokens`、`find`）'],
    keep: '只读注册表，打开权限只有 `KEY_READ`（可加视图标志）；不读别的值与键；不展开环境变量。',
    testFile: 'packages/installed-apps/tests/apps_v1.rs', tests: ['apps_read_real', 'apps_entry_rules', 'apps_match'],
    markers: ['APPS_READ', 'APPS_ENTRY', 'APPS_MATCH'], authorized: null,
    ncs: [['nc1', '不读 32 位视图', 'APPS_READ'], ['nc2', '`find` 改成任一词匹配即可', 'APPS_MATCH']],
    finals: ['check', 'test', 'real'], real: '`real --final` 只输出三处各几条、`truncated` 与 `unreadable_keys`，不输出程序名。',
    ffi: '只有 `RegOpenKeyExW`、`RegEnumKeyExW`、`RegQueryValueExW`、`RegCloseKey`，放在 `src/native_windows.rs`',
    hint: 'New Rust crate: read-only registry Uninstall listing and name matching; light gate.',
    extra: { ...NEW_CRATE, allowedModes: ['baseline', 'lock', 'check', 'test', 'archive', 'real', 'red-nc1', 'red-nc2'], nativeModule: 'native_windows.rs', allowedFfi: ['RegOpenKeyExW', 'RegEnumKeyExW', 'RegQueryValueExW', 'RegCloseKey'], packageName: 'water-installed-apps', testTarget: 'apps_v1' } },
];

const ticketPath = s => 'docs/dispatch/tickets/WATER-W10-' + s.n.toUpperCase() + '-' + s.short + '-' + DAY + '.md';
const checker = s => (s.n === 'm5' ? 'desktop' : 'checkup') + '-wave-check.mjs';
const SHOTS = ['home', 'home-new', 'scan', 'results', 'results-open', 'results-decided', 'results-folds', 'menu', 'drawer', 'drawer-big', 'details', 'confirm', 'confirm-direct', 'done', 'quarantine', 'dedupe-menu', 'dedupe-intro', 'dedupe-result', 'trends', 'records', 'settings', 'settings-decl']
  .map(s => 'v2-' + s + '-1240x820.png').concat(['v2-results-stale-1240x820.png', 'v2-results-empty-1240x820.png', 'v2-quarantine-leftover-1240x820.png', 'v2-home-narrow-1040x720.png']);

function task(s) {
  const t = s.tpl;
  for (const k of DROP) delete t[k];
  const slot = 'w10-' + s.n, id = 'WATER-W10-' + s.n.toUpperCase();
  Object.assign(t, {
    id, title: s.title, slot, worktree: repo + '/.worktrees/' + slot, branch: 'worker/water-w10-' + s.n,
    baseCommit: BASE, snapshotRef: 'refs/tags/' + TAG, status: 'READY', readyOn: READY, dispatchedAt: null, startedAt: null, model: null,
    modelAssignment: 'user-arranged; report actual engine/model', purpose: 'M3.5 conclusion first', macOS: 'unverified',
    outputRoot: s.root, report: 'docs/dispatch/reports/' + id + '-REPORT.md', evidenceDir: 'docs/acceptance/wave10/' + s.n + '/',
    allowedFiles: ['docs/dispatch/reports/' + id + '-REPORT.md'], allowedPrefixes: [s.root + '/', 'docs/acceptance/wave10/' + s.n + '/'],
    ticket: ticketPath(s), spec: s.spec, proofTargets: Object.fromEntries(s.ncs.map(([n, , m]) => [n, m])), modelHint: s.hint,
    mustRead: [RULES, s.spec, ...s.also, ...s.alsoRead, PLAN, ...s.code.map(c => c.split('（')[0])],
    frozenFiles: frozen([s.spec, ...s.also, ...s.alsoRead]), gate: s.gate, baselineStatus: null, baselineEvidence: null, outputRootExists: true,
    expectedTests: s.tests
  }, clone(s.extra));
  if (t.kind === 'rust' && !s.extra.packageName) t.packageName ??= t.packageName;
  if (t.kind === 'rust' && s.extra.outputRootExists === false) {
    t.productionFiles = [s.root + '/Cargo.toml', s.root + '/Cargo.lock', s.root + '/README.md'];
    t.testFiles = [s.testFile];
  }
  if (s.n === 'm4') t.productionFiles = ['packages/junk-clean/Cargo.toml', 'packages/junk-clean/Cargo.lock', 'packages/junk-clean/README.md', 'packages/junk-clean/examples/real_smoke.rs'];
  if (s.n === 'm6') { t.expectedBrowserTests = s.browserTests; t.requiredScreenshots = SHOTS; }
  for (const k of Object.keys(t)) if (t[k] === undefined) delete t[k];
  return t;
}
const tasks = specs.map(task);

const abs = p => repo + '/' + p;
function ticket(s, t) {
  const L = [];
  const ids = t.id, wt = t.worktree;
  L.push('# ' + ids + '：' + s.title + '（' + s.gateZh + '）', '');
  L.push('2026-11-05，正式单，总控（Claude）。以[第十波 manifest](../wave10/manifest.json) 中本单 `status` 为准；READY 不代表已外贴。可以新开对话执行。本单与第一批另外七张单同时进行，各改各的目录。', '');
  L.push('| 项 | 精确值 |', '|---|---|');
  L.push('| 权威单 | ' + abs(t.ticket) + ' |');
  L.push('| 唯一工作树 / 分支 | ' + wt + ' / ' + t.branch + ' |');
  L.push('| 精确首次 HEAD | ' + BASE + '，必须干净 |');
  L.push('| SPEC | ' + abs(s.spec) + '（本单的全部要求） |');
  L.push('| 仍然有效、要读的 | ' + s.also.map(abs).join('；') + (s.alsoNote ? '；' + s.alsoNote + '：' + s.alsoRead.map(abs).join('；') : '') + ' |');
  L.push('| 规则 | ' + abs(RULES) + ' |');
  L.push('| 检查入口 | ' + repo + '/scripts/' + checker(s) + ' |');
  L.push('| 回执 | ' + wt + '/' + t.report + ' |');
  L.push('| 证据目录 | ' + wt + '/' + t.evidenceDir + ' |');
  L.push('| 门 | ' + s.gateZh + '：' + s.ncs.length + ' 条负控 + ' + s.finals.join('、') + ' 三个 final |', '');
  L.push('先读：');
  L.push('1. 规则与 SPEC 全文，再读上表“仍然有效”的契约；[第十波计划](../wave10/PLAN.md)第 2 节' + s.rows + '（来由）；');
  if (s.code.length) L.push('2. 代码：' + s.code.map(c => '`' + c.replace(/（.*$/, '') + '`' + (c.includes('（') ? c.slice(c.indexOf('（')) : '')).join('、') + '。');
  L.push('');
  L.push('## 要做的（全部在 `' + s.root + '/`）', '');
  s.todo.forEach((x, i) => L.push((i + 1) + '. ' + x + '；'));
  L.push('', '**不变**：' + s.keep, '');
  L.push('## 白名单', '');
  L.push('- `' + s.root + '/` 下的文件' + (s.extra.outputRootExists === false ? '（新包：`Cargo.toml` 照规则第 2 节自己写，锁文件用 `--mode lock` 生成）' : (t.kind === 'rust' || t.kind === 'service' || t.kind === 'host') ? '（不得改 `Cargo.toml` 的依赖、`Cargo.lock`）' : ''));
  L.push('- `docs/dispatch/reports/' + ids + '-REPORT.md`');
  L.push('- `docs/acceptance/wave10/' + s.n + '/` 下 `--mode archive` 生成的证据', '');
  L.push('## 测试', '');
  if (s.n === 'm6') {
    L.push('- `apps/water/ui/tests/unit.test.mjs` 精确 3 个：' + s.tests.map(x => '`' + x + '`').join('、') + '；');
    L.push('- `apps/water/ui/tests/browser.test.mjs` 精确 6 个：' + s.browserTests.map(x => '`' + x + '`').join('、') + '；');
    L.push('- 截图 26 张，名字见 SPEC 第 7 节（检查器按名字核对）；回执逐张与 `docs/design/water-ui-v2/previews/<画面 ID>.png` 并排写差异。');
  } else {
    L.push('`' + s.testFile + '`，精确 ' + s.tests.length + ' 个测试：' + s.tests.map(x => '`' + x + '`').join('、') + '。');
  }
  L.push('- 新断言照 SPEC 的测试一节放进指定的测试，失败信息带 ' + s.markers.map(x => '`' + x + '`').join('、') + '。');
  L.push('- 夹具照规则第 3 节：只在本树 `.local/` 下，用完只删本次新建的那一个目录。');
  L.push(s.authorized ? '- 旧断言只能改' + s.authorized + '，回执逐条写原值与新值。' : '- 没有获准修改的旧断言' + (s.extra.outputRootExists === false ? '（新包）' : '') + '。', '');
  L.push('## 负控', '', '| 负控 | 让什么失效（SPEC 给的例子，可选更窄的一处） | 标记 |', '|---|---|---|');
  for (const [n, d, m] of s.ncs) L.push('| ' + n + ' | ' + d + ' | `' + m + '` |');
  L.push('', '只改 `' + s.root + '/` 的生产代码一处 → `--mode red-ncN` → `git checkout` 恢复原字节 → 立即 `--mode ' + (s.n === 'm6' ? 'browser' : 'test') + '`。要找只有新断言才抓得到的位置。', '');
  L.push('## 命令（在工作树根目录执行）', '', '```powershell', 'node ' + repo + '/scripts/' + checker(s) + ' --task ' + ids + ' --mode baseline', '```', '');
  L.push('之后反复用 ' + t.allowedModes.filter(m => !['baseline', 'archive'].includes(m) && !m.startsWith('red-')).map(m => '`' + m + '`').join('、') + '，做完负控；提交干净实现后依次跑 ' + s.finals.map(m => '`' + m + ' --final`').join('、') + '，再 `archive`。', '');
  L.push(s.real, '');
  L.push('## 预算与边界', '');
  L.push('- 系统函数：' + s.ffi + '。');
  L.push('- 原生窗口 ' + (s.n === 'm5' ? '1（只在 `native --final`）' : '0') + '、选择框 0、浏览器 ' + (s.n === 'm6' ? '1（只在 `browser` 模式，检查器启动）' : '0') + '。');
  L.push('- cargo 离线、单线程、私有 target，不下载；不需要联网查资料。');
  L.push('- 不 merge、不 rebase，不改台账、契约、检查器、其它包。');
  L.push('- 提交身份照规则第 5 节：只在提交命令的进程里设，用你自己的名字，不借用人类作者身份。');
  L.push('- **远端与历史**：不 push 到任何远端，不添加或修改 git 远端与配置；不改写已有提交（不 amend、reset、squash 或任何强制操作），只在首次 HEAD 之后新增提交；提交信息写错就在回执里说明，不要改写。', '');
  L.push('## 交回', '', '回执第一行与通知完全一致：', '', '```text', ids + ' 任务已完成，任务报告在 ' + wt + '/' + t.report, '```', '');
  L.push('回执要写：实际模型、实现提交 SHA；SPEC 逐节：改了哪里、怎么满足；改过的旧断言（原值与新值）；每个检查命令与结果；负控（改了哪一处、失败信息、恢复后的哈希）；' + (s.n === 'm6' ? '逐张截图与设计稿的差异；' : '真实冒烟或整机检查的结果；') + '没做或没验证的事。');
  return L.join('\n') + '\n';
}
specs.forEach((s, i) => fs.writeFileSync(abs(ticketPath(s)), ticket(s, tasks[i])));

const manifest = {
  schemaVersion: 1, wave: 'water-wave10-m35', status: 'READY', controller: 'Claude', controllerRoot: repo, controllerBranch: 'main',
  helpers: Object.fromEntries(specs.map(s => [s.n.toUpperCase(), 'scripts/' + checker(s)])),
  baseCommit: BASE, baseTag: TAG, plan: PLAN, workerRules: RULES,
  userDecision: '2026-11-02: wave 10 plan approved as recommended ("全部按推荐"); design v2 approved ("可以"); the five new items approved (sessions with a switch and a delete-or-quarantine choice, dedupe, installed programs, system advice, space overview). First batch M1-M6, M8, M9 together; M1 and M2 share the plan JSON and merge together; M7 service is dispatched after M1-M4, M8, M9 merge; M6 merges last.',
  offlineCache: clone(W9.offlineCache),
  frozenFiles: frozen(['docs/decisions/ADR-018-device-junk-checkup-and-in-app-cleanup.md', ADR19, 'contracts/checkup-v1/MODEL.md', 'contracts/checkup-v1/IPC.md',
    'contracts/m3c-v1/IPC-M3C.md', C('IPC-M35'), 'contracts/desktop-bootstrap-mirror-v1/MIRROR.json', RULES]),
  readyReport: PLAN,
  laterTasks: [{ id: 'WATER-W10-M7', title: '服务：结论视图、两块清理、隔离区与查重', spec: C('SERVICE-M35'), dispatch: 'after M1-M4, M8, M9 are merged; ticket written then with the merged HEAD' }],
  tasks
};
fs.writeFileSync(abs('docs/dispatch/wave10/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
for (const t of tasks) console.log(t.id, t.kind, t.gate, t.outputRoot, t.packageName ?? '-', t.testTarget ?? '-', t.expectedTests.length, JSON.stringify(t.proofTargets), (t.allowedFfi ?? []).length, t.frozenFiles.length, t.outputRootExists);
