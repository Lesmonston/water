WATER-W8-K4 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k4/docs/dispatch/reports/WATER-W8-K4-REPORT.md

2026-11-01，执行者 Codex（GPT-6；运行环境没有提供更细的模型快照标识）。

## 状态与续做需要

本单未完成，不能标为 SUBMITTED/VERIFIED。首次基线为 `232bc2982228f5d99f42017de6db3caa5912a8ab`，工作树 `F:/new/smaltalk/water/.worktrees/w8-k4`，分支 `worker/water-w8-k4`，首次 HEAD 与分支正确、树干净。

实现已保存为两个新增提交：

- `8d6aeaac`：服务功能与测试实现。
- `c5ae026ca05f91a6163212e229857f8ca23172c0`：给新增的排除拒绝断言补 `expect_err` 失败标记。这是当前完整实现提交；没有改产品逻辑。

停止原因：第三条负控恢复原字节之后，完整六测连续两次失败，都是新增的 64 次 `skip_add` 用例越过原有 50ms IPC 返回预算：

- `2026-11-01T02-53-02.768Z-10416-test-5.log`：`SERVICE_M3C_SKIP: add "i-000027" took 50.6541ms`，5 通过、1 失败。
- `2026-11-01T02-53-56.403Z-30488-test-5.log`：`SERVICE_M3C_SKIP: add "i-000044" took 51.306ms`，5 通过、1 失败。

[执行者规则第 4 节](../W8-M3C-WORKER-RULES.md)明确要求：“连续两次失败就停下写受阻回执。”因此停止产品修改和测试，没有继续尝试 final 或 real。此前相同产品与测试字节有过完整六测通过，但不能用此前绿色覆盖最后的连续失败，也不能把它认定为纯环境问题。两个同步写入、克隆与重建全扫描视图的耗时需要进一步定位。

最小补充需求：总控发续做补单，允许从 `c5ae026c` 继续定位并优化 `skip_add` 的即时更新/持久化成本，保持立即保护、落盘、原子替换和 50ms 预算，不放宽断言；之后重做负控及逐次恢复，完成三项 final 和真实只读体检。现阶段不请求修改冻结契约、依赖或其它包。

## 实现对照（尚未通过最终验收）

| 契约 | 修改与现有证据 |
|---|---|
| SERVICE-M3C §1 去重体量 | `views.rs` 的项、组、排序、分类、合计、推荐分盘使用 unique 字段，组另给 logical_bytes；服务的 found、位置统计、7日增量及增长快照使用去重口径。`clean.rs` 的预览、分盘和结果 estimate 使用去重字节，计划项 total_bytes 保持逻辑值。新增硬链接用例：组 unique=300、logical=600，计划仍为600，预览300；旧格式缺字段回退300。 |
| §2 逐项在用 | 四种模式穷举映射；扫描对所有可清理项判断，保存 `in_use` 和可独立缺省的 `item_in_use`；组带计数，详情逐项提示，产品名映射保持；快照不可用使用原固定句子。清理 Guard 仍逐项重新判断。新增用例及原重启用例通过过。补充01已取消未知模式降级要求，原未知模式记录拒读断言保持。 |
| §3 整盘位置 | `valid_custom` 盘根分支只依赖注入的固定盘列表及已知目录文字/规范路径包含检查；系统盘拒绝；盘根不做目录存在性与 canonicalize。root_id 为 drive-x、display_path 大写盘根，新增 is_drive_root。普通文件夹校验保持。扫描预算未改。 |
| §4 按盘拆分 | 每组按条目所在盘汇总 item_count 与 eligible unique 字节，BTreeMap 按 root 排序；drive_root 为最大去重项的盘。跨 X/Y 的展示用例通过过，只改合成扫描记录，不访问这些盘。 |
| §5 排除与跳过 | 参数精确接受两种形状；排除最多5000、无重复、最新扫描且属于所选组、可清理；排空的组不进计划，全空 invalid。settings v2 增加 skipped，读 v1 补空且保留分类；最多64条、序号ID；skip_add 路径从最新扫描条目取，skip_remove 只改设置。扫描结束应用完全匹配、ASCII大小写不敏感的跳过，不扩及上下级。 |
| §6 孤儿进程 | Platform 新增有默认空实现的 orphan_chains；Windows 实现使用同一批进程快照调用默认 patterns 的 orphans；保存脱敏字段，按内存降序最多50；趋势找最近带键的完成记录，未知内存合计为null。没有结束/挂起入口。 |
| §7 提醒与预测 | checkup_due 覆盖从未扫描、6天、7天；forecast按当前固定盘与30天扫描点计算，扣除首末间清理造成的正向可用空间跳变；不足数据、无减少、十年外固定文案。合成手算100字节/天、8天、basis4.0通过过。 |
| §8 快照删除失败 | 仅在测试中建立1000个合成旧临时项；用不含 FILE_SHARE_DELETE 的句柄锁扫描记录目的文件，使大记录原子替换失败，同时在快照落盘后持有其不共享删除的句柄。验证删除失败后快照保留、扫描failed、服务idle、last_scan回退，重启仍是前次扫描。没有新增产品挂点。多轮完整六测中该用例通过。 |
| 补充01 §1 即时跳过 | 成功写设置后克隆最新记录、应用跳过、重算视图和详情、保存记录；更新占用计数也沿用原快照的逐项结果；已有计划标stale以防跳过前预览仍可执行。读取时也应用当前设置。prepare合并内存和磁盘跳过名单，只能缩小本地授权扫描，计入excluded_count。同步行为在64次用例中存在50ms超时，未验收。 |
| 补充01 §2 NTFS/ReFS | Platform::volume_file_system 默认None；DriveInfo及AppState.drives形状不改。其它盘根检查先做，只有通过后才返回文件系统特定错误；NTFS/ReFS大小写不敏感通过，exFAT/FAT32/未知拒绝。 |
| 补充01 §3 已跳过排除 | 所选组内 user_skipped 项接受并忽略，不计excluded_count；其它不可清理项拒绝。新增用例通过过。 |

`storage.rs` 只把 JSON 序列化为内存字节后一次 write_all，保留同目录新临时文件、sync_all、复核路径、rename顺序。用于减少即时跳过写大记录时的细碎文件写入；这还未充分解决返回预算。

唯一新增系统函数为 `src/native_windows.rs` 的裸 `extern "system" GetVolumeInformationW`，仅取文件系统名，未使用的可选输出传null，固定长度UTF-16缓冲区与NUL结尾根路径均在调用期间有效，unsafe处有安全注释。NativeTime增加16字节编译断言。没有其它新增unsafe、依赖、环境变量读取、网络或产品进程启动。

## 获准修改的旧断言

1. fixtures：原只读checkup-v1样本，现读它后按顶层整条覆盖m3c增量，并新增SERVICE_M3C_SHAPE检查；shape算法不变。custom_root_add样本原 `custom_root_add_added`，现 `custom_root_add_drive`。原各项shape调用仍在。
2. SERVICE_IN_USE_SAVED：原 `Chrome 正在运行，将跳过占用的项`，现 `Chrome 正在运行，将跳过 1 个占用的项`；只有 Profile Busy 一项命中。
3. SERVICE_PRODUCT_NAME edge-cache：原 `Edge 正在运行，将跳过占用的项`，现 `Edge 正在运行，将跳过 1 个占用的项`；夹具一个Edge缓存项。
4. SERVICE_PRODUCT_NAME chrome-cache：原 `Chrome 正在运行，将跳过占用的项`，现 `Chrome 正在运行，将跳过 2 个占用的项`；测试名称映射覆盖Default与Profile Busy两项。
5. SERVICE_PRODUCT_NAME headless-browser-profiles：原 `Chrome 无头浏览器 正在运行，将跳过占用的项`，现 `Chrome 无头浏览器 正在运行，将跳过 1 个占用的项`；一个hrender项。
6. SERVICE_PRODUCT_NAME brave-cache：原 `other 正在运行，将跳过占用的项`，现 `other 正在运行，将跳过 1 个占用的项`；一个Brave缓存项。
7. 测试盘由返回固定Vec改为可注入共享Vec，默认仍只有系统盘F、total1000000/free800000。旧 points.len()==2 与F盘根固定拒绝文案未改。

没有更改旧字节数期望，没有放宽旧断言/超时，没有改六个测试名或数量，没有ignore/过滤。新增辅助函数仅由原六个测试调用。测试硬链接使用标准库fs::hard_link，未启动新测试进程；原联接夹具辅助保持。

## 检查记录

统一命令前缀（执行目录始终为指定工作树根）：

`node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W8-K4 --mode <下表模式>`

| UTC 开始时间/回执前缀 | 模式 | 结果 |
|---|---|---|
| 02-25-05.834Z-12784 | baseline | passed/0，精确基线与干净树 |
| 02-31-26.976Z-15632 | lock | passed/0，依赖与锁未改 |
| 02-32-10.487Z-39460 | check | failed/1，正在编辑的测试文件未fmt；后续格式化修复 |
| 02-36-32.303Z-24188 | test | failed/1，新增文案在PowerShell向node管道传递时变问号，及新增skip_add预算失败；已用UTF-8 apply_patch修复文案 |
| 02-38-35.023Z-3748 | test | failed/1，只有skip_add预算失败 |
| 02-39-35.201Z-2648 | test | failed/1，缓冲写入后仍有skip_add预算失败；这两次之间产品字节改变 |
| 02-41-29.650Z-4992 | check | passed/0，fmt/source policy/Clippy all-targets -D warnings |
| 02-42-20.502Z-35788 | test | passed/0，6/6 |
| 02-45-39.198Z-15292 | check | passed/0，占用提示收缩更新后的产品字节 |
| 02-45-59.455Z-42520 | test | passed/0，6/6 |
| 02-47-24.111Z-37156 | red-nc1 | 无效，虽然行为变坏，但unwrap_err提前失败无目标标记；检查器failed/1 |
| 02-47-53.980Z-35556 | test | passed/0，原字节恢复6/6 |
| 02-48-49.607Z-11628 | red-nc1 | 目标标记命中，检查器passed/0，测试5绿1红 |
| 02-49-29.853Z-33996 | test | failed/1，原字节恢复后skip_add 55.1141ms |
| 02-50-12.025Z-40280 | test | 原样重跑passed/0，6/6；nc1恢复证据 |
| 02-50-56.078Z-33672 | red-nc2 | 目标标记命中，检查器passed/0，测试5绿1红 |
| 02-51-29.502Z-21884 | test | passed/0，原字节恢复6/6；nc2恢复证据 |
| 02-52-04.836Z-36400 | red-nc3 | 检查器passed/0，但另一个测试更早预算失败，此次不能认作合格负控，详见下文 |
| 02-53-02.768Z-10416 | test | failed/1，5绿1红，skip_add 50.6541ms |
| 02-53-56.403Z-30488 | test | 原样重跑failed/1，5绿1红，skip_add 51.306ms；依规则停下 |
| 02-54-40.758Z-29888 | archive | passed/0，363个原字节证据，5938271字节 |

archive同时保留本树原先已有的总控派前02:17 baseline、02:19 lock/check回执，它们不是本执行对话运行。完整命令、退出码、源码快照与文件哈希见 [ARCHIVE.json](../../acceptance/wave8/k4/ARCHIVE.json) 及 receipts。编译和测试全部离线、单jobs、私有target。

## 负控与恢复

- nc1：仅将clean.rs排除校验的“ID属于所选组”判断改为 `ids.is_empty()`；已知未选npm条目被错误接受。首轮缺标记无效，恢复测试后只给新增断言增加expect_err标记并新增提交，再做负控。第二轮以 `SERVICE_M3C_EXCLUDE: invalid exclusion accepted` 失败。用 `git checkout -- packages/water-service/src/clean.rs` 恢复；一次预算失败后原样重跑6/6。恢复文件SHA256 `ffdf1606d9eaea75b82a5fa14c2754e90221a98d45c4e2d633ca211b2835f305`。
- nc2：仅将add_skip对最新结果的apply_skips参数换成Settings::default()。以 `SERVICE_M3C_SKIP: immediate eligibility`（true而非false）失败。用git checkout恢复service.rs，立即完整6/6。恢复文件SHA256 `7ad0d8853d68c56dd8715f41d2edc11356ba4090f6ab9377b2862461762b05c9`。
- nc3：仅去掉valid_custom盘根分支的 `!d.is_system`。注入的系统盘W被错误接受，命中 `SERVICE_M3C_DRIVE_ROOT: system/nonfixed/known W:\`。但同轮service_clean_flow更早以skip_add 52.1916ms失败；按规则不把本轮算有效负控。恢复service.rs原SHA后，两次完整测试均预算失败，因此没有合格nc3恢复绿色，不具备final前置。

当前恢复后的productionHash为 `92647635c6fabdecb4640a4c501a0c6701e69af5033760f4a71143376377be03`，testHash为 `0f84a22e89574969b8b2080e93e1b3f0080b676c239c56ccffd0087a640c5488`。没有未提交产品变异。

## 未做与边界

- 三项 `check --final` / `test --final` / `real --final` 均未运行；没有真实分类汇总，本对话没有真实目录或真实进程扫描。
- 没有原生窗口、选择框，没有真实数据清理；物理夹具全部在本工作树.local随机新建目录，沿用父目录/前缀校验后由测试删除本次自己的目录。
- 没有改其它包、Cargo.toml/Cargo.lock、工单、契约、检查器或台账；没有merge/rebase/reset/amend/push，没有git配置或远端变更，没有子代理。
- 尚未验证macOS、宿主/UI接线、真实盘根扫描、生产规模性能与竞态。本实现不能作为M3已收口的证据。
- 所有本次命令均已结束，没有启动任何长期后台服务；交回后停止测试与产品修改。
