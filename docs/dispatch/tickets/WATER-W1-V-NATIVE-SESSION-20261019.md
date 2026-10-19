# WATER-W1-V：真实原生会话API与单次CLI

总控2026-10-19，正式票。只有主manifest本票READY且baselineStatus=PASSED才开工。V/W可同波分别外贴，无自动实现者。

| 项 | 唯一值 |
|---|---|
| 权威票面 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-V-NATIVE-SESSION-20261019.md |
| 唯一树 / 分支 | F:/new/smaltalk/water/.worktrees/v / worker/water-w1-v |
| 精确首次HEAD | 30a803537602211ed2a11c106c63fd27cefb260f |
| tag | water-w1-native-host-base-20261019 |
| manifest | F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json |
| 冻结 | contracts/native-host-batch-v1/freeze.lock.json；104新锁条目/13继承锁，336唯一文件，旧291不变 |
| 实现目录 | packages/native-session |
| 新报告 | F:/new/smaltalk/water/.worktrees/v/docs/dispatch/reports/WATER-W1-V-REPORT.md |
| 证据 | F:/new/smaltalk/water/.worktrees/v/docs/acceptance/wave1/v/ |

先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、ADR-014、W1-NATIVE-HOST-WORKER-RULES、NATIVE-HOST-PLAN及READY-REPORT、contracts/native-host-batch-v1/{COMMON.md,TESTS.json}、native-session-v1/SPEC与cases/PROVENANCE，以及contracts/native-session-v1/SPEC.md。V再读实际S/P/R/E/H/Q接口；W再读ATTRIBUTES及真实I/T模型。主检出票面权威，执行树早于正式票，直接读绝对路径，不merge取票。

首次必须精确HEAD/分支且干净、实现目录不存在、冻结一致；不符保留现场受阻，不reset或换树。总控已在本树实际baseline，开工仍先复核：

```powershell
node scripts/native-host-check.mjs --task WATER-W1-V --mode baseline
```

baseline只测既有依赖、捕获和工具，不代表V/W产品或五测试通过。本树factory已准备固定合成batch，继续复用，禁止清理。

## 实现与行为

本票交付真实S→P→R→E/H/Q会话API及单次CLI，不能按case/id返回预期数据，不能调用controller probe代替产品。真实所选根只从SelectedScope.root_path取得，PickerOptions不是路径授权或可读字段，不能改用CLI参数/cwd。确认之后由私有登记guard在成功/错误/observer unwind都撤销本次scope；R自己结束attempt，不复制P/R权限表，不影响宿主既有scope。

选择器取消输出selection=cancelled/snapshots=[]；传入R的token预取消仍先真实选择，确认后输出真实cancelled报告，不能混成无报告。native_scope_metadata保持真实标签，policy从实际options getter取值，普通内容/手势/竞态标记保持false；默认wire不带NativeScan完整侧车/原生ID/绝对根路径/能力。

库及bin均forbid unsafe，无新FFI。库不读env/fs/时钟/stdin，不起进程或网络；CLI仅args_os解析/协议stdout/固定错误stderr。恰一个初始目录参数、固定scope/session IDs及8/10000/256默认预算按SPEC；stdout恰紧凑UTF-8对象加LF，成功stderr空。无/多参64，其它错误2，不回显argv/路径/OS栈；IO输出失败也不得用unwrap泄漏panic。

五测依次覆盖真实取消不登记/原有scope保持；真实完整会话且与独立R/E/H/Q逐值；预取消/observer取消和panic释放；容量/duplicate等错误不撤销别人；wire/私有有效证据与真实CLI错误。库UI每窗前测试stderr发WATER_PICKER_CASE cancel/select，冻结driver只点击本次测试PID固定title的系统按钮。CLI实际成功/取消由bridge直接启动真实V.exe检查，不放假exe。

实际子目录选择不同于起始目录的S行为已有独立验收；本波不依赖新UIA选子目录工具。V_SELECTED_ROOT负控改真实传R根为所选根的父目录，保留R身份门；V_RELEASED让实际guard漏撤销而真实registry多一项；V_NATIVE_SOURCE改真实构造/Serialize来源标签。均完整五红/恢复五绿，不改S/R或硬编码fixture。

本树冻结adapter只在.local/native-walk-fixtures固定batch调用原R工厂创建/核对4目录、6文件条目含1硬链接/1junction，字面60字节/含硬链接逻辑74。仅工具有限读已知payload校验；Rust仅index/元数据。全部原位保留，不手工重造或清理，不读真实HOME/盘根/其它项目。

## 独占白名单

- packages/native-session/Cargo.toml
- packages/native-session/Cargo.lock
- packages/native-session/README.md
- packages/native-session/tests/session_v1.rs
- docs/dispatch/reports/WATER-W1-V-REPORT.md
- packages/native-session/src/ 内本票新文件（V src仅Rust；证据只json/log/txt/png）
- docs/acceptance/wave1/v/ 内本票新文件（V src仅Rust；证据只json/log/txt/png）

其余只读，包括旧A–U源码/测试/根Cargo、所有契约/冻结输入/helper/锁、台账、上游与其它树。接口/依赖/权限冲突写受阻报告交总控，不问用户临时放宽。本票锁只用helper lock模式离线生成，无新包/dev/build依赖或其它bin。

## 验证、负控和交回

精确五顶层：session_selection_cancelled、session_native_capture、session_cancellation_and_cleanup、session_errors_preserve_registry、session_public_wire_and_cli。无skip/filter/嵌套凑数；一树一次一门，单子命令180秒。Rust1.95/MSVC/private offline/locked/jobs1；driver测试必须同时出现真实cancel/select。

先写完整五测与可运行骨架，骨架真实调用S弹窗但关键会话行为可先缺失；先lock再red-behavior。 目标消息含V_BEHAVIOR；随后实现并suite五绿。

格式/样式/源码和测试字节稳定后，逐项真实改坏生产逻辑，red-nc1、red-nc2、red-nc3命中V_SELECTED_ROOT/V_RELEASED/V_NATIVE_SOURCE。每红立即原字节恢复、核hash、suite完整五绿再下一项。不改测试/runner/超时，不留测试开关。初次行为红保留；如最终字节不同，稳定版重放相同缺陷red-behavior后恢复suite，说明为实现后重放，不能冒称首次先红。四条当前字节链均由final proofAudit核。

统一形态（mode分别为red-behavior、suite、red-nc1/2/3；V另有lock）：

```powershell
node scripts/native-host-check.mjs --task WATER-W1-V --mode suite
```

提交实现/测试得到干净SHA，在同一SHA串行跑全部final：

```powershell
node scripts/native-host-check.mjs --task WATER-W1-V --mode fmt --final
node scripts/native-host-check.mjs --task WATER-W1-V --mode test --final
node scripts/native-host-check.mjs --task WATER-W1-V --mode clippy --final
node scripts/native-host-check.mjs --task WATER-W1-V --mode metadata --final
node scripts/native-host-check.mjs --task WATER-W1-V --mode bridge --final
```

所有输出在本树.local/checks/WATER-W1-V/。原字节归档本票证据目录及ARCHIVE.json（来源/长度/SHA），含全部失败/原好坏恢复快照和图片；不纳target/cache/binary/profile/fixture payload。预置证据.gitattributes冻结不改，log显式-f。显式逐文件add，不全树add/clean/reset/merge/rebase/push。证据/报告提交只追加证据，不夹未复测产品改动。

报告写完整基线/受测SHA/报告提交定位、逐需求/命令退出/全部失败/红绿/实际模型/未验证/物理与来源边界。真实CLI成功/取消与严格stdout在bridge检查；不说W链已接好。 Windows受控不冒充macOS/自然手势鉴真/恶意竞态/真实用户scope/桌面/M1完成。完成仅SUBMITTED，交回后停改。

报告首行及通知：

```text
WATER-W1-V 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/v/docs/dispatch/reports/WATER-W1-V-REPORT.md
```

受阻将“已完成”改为“受阻”，列最小补充需求；不擅自扩权限或接口。
