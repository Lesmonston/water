WATER-W8-K4 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k4/docs/dispatch/reports/WATER-W8-K4-REPORT.md

2026-11-01，执行者 Codex（GPT-6；运行环境没有提供更细的模型快照标识）。

## 原单受阻记录（历史，补单 01 结果见后文）

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

## 补单 01（2026-11-01，已完成并交回，待总控验收）

实际模型：Codex GPT-6（运行环境没有提供更细快照标识）。续做起点 `e2fbc784ea18dd2774cb16bf957df731bf942e6f`，树干净、分支 `worker/water-w8-k4` 正确，没有重跑 baseline。补单实现提交为 **`9f7b6efe07392fc36f0820dab431ed327bb61005`**。最终三门绑定这个干净提交；后续提交只含本回执与检查器归档证据。

### 补单 01 第 1～3 条

1. **扫描事实与当前展示分开。** Record 保留扫描时原始 result/saved，不在扫描结束或读入时写入当前跳过状态。新增内存 Projection，由原始扫描事实和当前设置构造。扫描刚完成和服务重启使用同一构造函数。skip_add / skip_remove 只原子写 settings.json，然后按当前名单更新最新记录的 Projection；都将已有计划标为stale（重复skip_add成功也作废已有计划）。移除立即恢复原扫描的可清理状态和占用信息。跳过前后及重启后的扫描记录文件字节完全不变。
2. **有界更新。** Projection 在加载/扫描完成时建立条目ID→下标、大小写折叠路径→下标、组位置、可见详情位置、占用项集合等索引。跳过路径不扫描整次扫描的条目，不克隆Record，不调用全量build，不写扫描记录；只增减匹配项在该组的可清理计数/字节、该盘可清理量、推荐总量/按盘推荐量，并更新该项可见详情和组占用提示。详情仍至多200项，扫描结果原始项数不受截断影响。保护、不足身份、过新等原始不可清理状态不会被移除跳过操作提升。
3. **测试。** 原64次skip_add及50ms断言原样保留；新增10,000项合成扫描记录（只写测试JSON，不建立对应真实文件），对同一项连续添加/移除各5次，每次均断言≤50ms，逐次核对详情、组计数/体量、组分盘、首页总量、scan_result总量及按盘推荐量。另验证添加后重启保持、移除后重启恢复，整个过程原扫描文件字节不变；补充清理计划在添加和移除后失效、占用计数随跳过收缩并在移除后恢复的断言。

公开IPC参数与返回形状、Platform/DriveInfo、依赖、锁、系统函数清单均没有相对上轮新增变化。clean_prepare继续检查原始扫描的本地授权、所选组、排除ID归属、可清理性，并按当前Projection跳过项；视图已跳过的项不计excluded_count。磁盘设置独立过滤仍保留作第二道保险，只能缩小范围。

规模用例实际耗时（毫秒；同一个完整六测程序加 `--show-output` 运行，证据 `receipts/addendum01-scale-timings.log`）：

| 次数 | skip_add | skip_remove |
|---|---:|---:|
| 1 | 4.9215 | 5.8035 |
| 2 | 5.8594 | 5.0410 |
| 3 | 5.5412 | 6.0319 |
| 4 | 5.6017 | 6.0698 |
| 5 | 5.7079 | 5.1427 |

该显示输出运行仍为六测全部通过、0忽略/过滤，27.31秒。没有提高返回预算、没有过滤或重复只跑某一个测试。

### 原单其它要求与断言

原单§1去重体量、§2逐项在用、§3整盘/NTFS/ReFS、§4按盘、§6孤儿进程、§7提醒/预测、§8快照删除失败，及补充01§2文件系统与§3排除已跳过项均保留，六测和三项final通过。原单§5与补充01§1仅按本补单改变持久化与移除时机，详见上文。新增系统函数仍只有原轮GetVolumeInformationW，安全说明仍见原轮实现对照，没有增加unsafe或产品进程/网络/环境变量读取。

相对本补单起点，修改了上一轮新增测试里的两条冲突期望（本补单显式授权）：

- 下次扫描保存结果的ineligible_reason：原 `user_skipped` → `null`，因为记录存原始扫描事实；另断言最新详情仍显示“已设为以后都跳过”。
- 移除后的chrome-cache eligible_bytes：原 `200`（等待下次扫描）→ `300`（立即恢复原扫描状态），标记改为remove restores immediately。

补充01§5授权的旧断言变化仍与原轮逐条清单一致：

| 旧断言/样本 | 原值 | 最终值 |
|---|---|---|
| fixtures | 只有checkup-v1样本 | 顶层叠加m3c样本，增加非null形状检查；shape算法不变 |
| custom_root_add样本 | custom_root_add_added | custom_root_add_drive |
| SERVICE_IN_USE_SAVED | Chrome 正在运行，将跳过占用的项 | Chrome 正在运行，将跳过 1 个占用的项 |
| SERVICE_PRODUCT_NAME edge-cache | Edge 正在运行，将跳过占用的项 | Edge 正在运行，将跳过 1 个占用的项 |
| SERVICE_PRODUCT_NAME chrome-cache | Chrome 正在运行，将跳过占用的项 | Chrome 正在运行，将跳过 2 个占用的项 |
| SERVICE_PRODUCT_NAME headless-browser-profiles | Chrome 无头浏览器 正在运行，将跳过占用的项 | Chrome 无头浏览器 正在运行，将跳过 1 个占用的项 |
| SERVICE_PRODUCT_NAME brave-cache | other 正在运行，将跳过占用的项 | other 正在运行，将跳过 1 个占用的项 |
| 测试盘辅助 | 固定Vec | 可注入，默认仍只有系统盘F、total1000000/free800000 |

N的来源保持原轮说明。没有其它旧断言修改，也没有更改旧字节值期望。

### 本补单检查命令与结果

所有检查从指定工作树根执行，命令前缀仍为 `node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W8-K4 --mode`。

| UTC回执前缀 | 模式/附加参数 | 结果 |
|---|---|---|
| 03-33-27.713Z-1880 | lock | passed/0 |
| 03-34-00.893Z-21260 | check | failed/1，Clippy collapsible_if一条；修复该结构后再检查 |
| 03-35-05.040Z-27280 | test | passed/0，6/6 |
| 03-37-19.619Z-30356 | check | passed/0，fmt/源码政策/Clippy all-targets -D warnings |
| 03-38-22.914Z-21264 | test | passed/0，6/6 |
| addendum01-scale-timings.log | 已构建的service_v1程序 `--test-threads=1 --show-output` | passed/0，6/6，实际规模耗时见上表 |
| 03-40-44.596Z-16828 | red-nc1 | 指定目标唯一失败，检查器passed/0 |
| 03-41-26.883Z-37504 | test | 原字节恢复passed/0，6/6 |
| 03-42-35.357Z-20464 | red-nc2 | 指定目标唯一失败，检查器passed/0 |
| 03-43-30.214Z-32172 | test | 原字节恢复passed/0，6/6 |
| 03-44-41.533Z-35844 | red-nc3 | 指定目标唯一失败，检查器passed/0 |
| 03-45-59.550Z-31500 | test | 原字节恢复passed/0，6/6 |
| 03-47-19.356Z-28720 | check --final | passed/0，干净实现提交 |
| 03-48-27.730Z-15080 | test --final | passed/0，6/6，三组负控/恢复哈希审核通过 |
| 03-49-53.501Z-18236 | real --final | passed/0，扫描completed，104833ms |
| 03-52-27.735Z-25504 | archive | passed/0，累计607份、10741902字节；含原轮363份，不覆盖旧证据 |

编译离线、单jobs、私有target；没有baseline重跑、下载、窗口或选择框。

### 本补单负控

三条全在9f7b6efe产品/测试字节上重新执行，没有复用原轮负控：

- nc1：clean.rs只把排除ID“属于所选组”的判断改为ids.is_empty()。service_clean_flow以 `SERVICE_M3C_EXCLUDE: invalid exclusion accepted` 唯一失败，另外5测通过；原字节checkout恢复后立即6/6。恢复文件SHA256 `76064c909b00a41d62c89c5dc9672a9befff89334e518cb6d3143d6a54eddd2f`。
- nc2：views.rs的refresh_path只把 `let after = skipped(item, settings)` 改成false。service_clean_flow以 `SERVICE_M3C_SKIP: immediate eligibility`（true而非false）唯一失败，另外5测通过；原字节恢复后立即6/6。恢复SHA256 `4e737f5aa1252a7cf68d87c1c4808a469b9d1c68a7665d94333a74c4b5c34580`。
- nc3：service.rs只去掉valid_custom的!d.is_system。service_trends_locations以 `SERVICE_M3C_DRIVE_ROOT: system/nonfixed/known W:\` 唯一失败，另外5测通过；原字节恢复后立即6/6。恢复SHA256 `ec051abd91c3b94a69e0ecaef6271c6739467312b58fb0d2f423f59133d2709a`。

最终 productionHash `e6118af4eb7160828f53cdf03826273dfde34e5e6b8df739e8e251e37523cff9`，testHash `b7790b08ee650739e093a8534daf863fd6ce1fbcde8462a132b0a7822bfbbce6`。final test回执proofAudit精确绑定以上三红和各自随后的恢复绿色。没有编译错误或其它测试抢先失败，负控变异未留在树中。

### 真实只读体检分类汇总

状态completed，扫描duration_ms=104833；整个real门含编译约130.3秒。4个固定盘、0条insight，清理关闭返回unavailable。输出不含文件路径、程序路径或命令行。

| 分类 | 组数 | 去重后total_bytes |
|---|---:|---:|
| agent_tool | 24 | 34655087979 |
| browser | 14 | 11369814296 |
| system_temp | 2 | 803391380 |
| app_leftover | 8 | 11058222368 |
| dev_cache | 13 | 8137390815 |
| crash_log | 7 | 889563824 |
| gpu_system | 2 | 663008505 |

合计：recognized=67576479167，recommended=13359455892，confirm=9311545603，advisory=6706415695，protected=21043392290，unrecognized=0（字节）。在用提示为Chrome 15/36/7项、Edge 1/2/8项，没有命令行或程序路径。

### 交付边界与未验证

本轮仅改water-service的clean.rs/service.rs/views.rs及唯一测试文件，报告与证据按白名单交付；Cargo.toml/Cargo.lock、其它包、工单、契约、检查器、台账不改。没有merge/rebase/reset/amend/push、远端或git配置变化，没有子代理。

真实数据只按规则登记位置读取名字/属性/大小/时间与进程快照；未读真实普通文件内容、未清理真实数据、未结束/挂起进程。删除测试仍仅限本树.local本次新建合成目录；规模项只存在于合成JSON。没有原生窗口或选择框。

未验证macOS、宿主/UI集成、真实自定义盘根全盘扫描、全部生产规模与竞态，也没有完成总控M3联合验收或真实自清理里程碑。本单完成仅代表执行者已交付并跑过票面检查，不自行标VERIFIED。所有自有命令均已结束，交回后不再运行测试或后台进程。

## 补单 02（2026-11-01，执行者已完成，待总控验收）

实际模型：Codex（GPT-6；运行环境未提供更细的模型快照标识）。指定树 `F:/new/smaltalk/water/.worktrees/w8-k4`、分支 `worker/water-w8-k4`，续做起点为干净的 `fc36140dc9abd8329c3c77a1625789b8dfccf68f`。没有重跑 baseline。补单 01 的 VERIFIED 状态来自补单 02 票面；本节不自行宣告补单 02 VERIFIED。

**本补单实现提交：`f55d969d0d73fdbffd2377418af2f155cbdd8f0a`。** 三个 final 均绑定此干净提交。后续提交仅含本回执和归档器生成的证据。

### 需求逐条对照

1. **所有已载入记录应用当前跳过名单。** `service.rs` 的 `add_skip` / `remove_skip` 写设置成功后，遍历有 60 条上限的 `s.records`，逐条调用现有 `Projection::refresh_path`。每条只查大小写折叠路径索引、修改匹配项及其组/详情/合计/分盘推荐量；未调用全量 `build`、未克隆整份 Record、未写扫描记录。首页仍取最新投影；趋势、预测和位置页上次识别的总量算法未改。
2. **排除检查使用索引和集合。** `clean.rs::prepare` 用已有 `Projection::item_index` 取得排除 ID 对应条目，以 `BTreeSet<&str>` 保存排除集合并判断计划项是否被排除。所选组归属、原始可清理性、已跳过项的例外、重复/5000 上限、保护与本地扫描授权检查都保留；排除只缩小计划。
3. **加固。**
   - 两个跳过操作均在设置落盘、更新内存设置后，先把当前计划加入 `stale_plans`，再刷新任何投影。幂等添加的原有失效处理保留。
   - `recommended_by_drive` 采用“**不显示零字节行**”的统一规则：`build` 过滤零字节，增量刷新沿用删除零字节行的规则。组自己的 `by_drive` 计数不受此规则影响。
   - 预测对截断后等于零的 rate 明确输出 `"0"`，避免负小数生成 `"-0"`；其余速度、天数和文案规则不变。
   - 提醒测试改用真实扫描结果的 `finished_at` 加 6/7 天作为假时钟，从计算中消除扫描实际耗时；期望仍是六天 `null`、七天 `{days_since_last:7}`。
   - 快照删除失败测试改为确定性同步：测试侧适配器委托真实 `Store::write` 完成快照原子写入后，通过通道暂停；测试持有不带 `FILE_SHARE_DELETE` 的快照句柄，再恢复服务，让真实的扫描记录写入失败和快照删除失败依次发生。原有 failed/idle/回退上次扫描/快照保留/重启回退断言全部保留，10 秒同步上限不放宽。

产品仅修改 `src/service.rs`、`src/clean.rs`、`src/views.rs`。未新增系统函数、unsafe、运行时挂点或公开接口；唯一获准新增的系统函数仍是前轮的 `GetVolumeInformationW`。Platform 默认实现、DriveInfo、IPC、依赖与锁文件均不变。

### 测试写法与新增断言

测试仍只在 `tests/service_v1.rs`，仍精确六个原测试，无 ignore、过滤或拆分。原有 64 次 skip_add 和万项用例的每次 50 ms 预算均保留。

- `SERVICE_M3C_SKIP` 规模用例扩展为 **60 条载入记录，其中最新与一条旧记录各有 10,000 项**，其余 58 条为小记录；只写合成记录 JSON。保留连续添加/移除各 5 次及逐次预算、最新详情/组计数/体量/分盘/首页/扫描合计/原扫描文件字节断言，新增逐次核对旧 `scan_result` 和 `history_list` 的扣减与恢复。添加和移除后分别重启，比较同一个旧体检的完整视图和历史行。
- 重启前把设置中跳过路径改成大写，断言最新详情及旧记录仍为已跳过；移除该大写路径后两者立即恢复。新增过新项的添加/移除前后详情完全相等断言，防止原始不可清理项被提升。
- `SERVICE_M3C_SKIP` 零字节用例：X 盘只有零字节推荐项，Y 盘有正字节推荐项；初建省略 X，跳过 Y 后两行都省略，重启结果相同，恢复只重建 Y 的正字节行。
- `SERVICE_M3C_EXCLUDE` 新规模用例：超过 10,000 项的记录中，chrome-cache 有 10,000 项，其中 4,999 项过新、5,001 项可清理；传尾部 5,000 个合法排除 ID，断言 50 ms 内返回、excluded_count=5000、预览 1 项/100 字节、计划只含 `i-104999`。这同时覆盖大量 ID 索引查找和计划生成时的集合判断。
- `SERVICE_M3C_DRIVE_ROOT` 显式把含夹具已知文件夹的 F 盘注入为**非系统固定盘、NTFS**，仍断言固定拒绝文案；W 系统盘、V 非固定盘和原文件系统断言保留。默认测试盘列表不变。
- `SERVICE_M3C_FORECAST` 新增 4 天可用空间增加 1 字节的点，rate=-0.25，期望 bytes_per_day=`"0"`，无减少文案照旧。

两个需要访问私有状态的用例在唯一测试文件中用 `#[path]` 编译现有 service/clean/views/util/storage 源码。普通契约测试仍使用公开库 `water_service::Service`。测试内存中的本地授权仅用于合成 JSON 的 `clean_prepare` 规模测试：先断言加载记录返回 stale，再在测试实例内登记该合成 scan_id，从未调用 clean_start。快照同步适配器位于测试文件，委托真实存储写入、读取、删除和 journal；产品源码无测试开关。测试辅助的 IpcError 边界转接、TestService 泛型只为复用现有预算/轮询函数，断言本身未变。

**改过的测试写法原文：**

- 原 `f.fake.now.store(NOW + 6 * 86400, Ordering::SeqCst);`、`f.fake.now.store(NOW + 7 * 86400, Ordering::SeqCst);`；现先从 `result["finished_at"]` 解析 `ended`，再分别写 `ended + 6 * 86400`、`ended + 7 * 86400`。原六天/七天断言文字和期望不变。
- 快照原写法：`let s = f.service(false);`，放开扫描后循环尝试打开快照，直到打开成功或扫描结束；现用 `source_service(&f, false)` 编译同一服务源码，通过存储适配器通道在快照写完后暂停，成功持有句柄才恢复。原 `held.is_some()`、快照存在、failed、idle、last_scan 回退及重启断言全部原样保留。
- `call` / `wait` / `scanned` / `settle` 的参数由 `&Service` 改为 `&impl TestService`；返回预算仍原样 `Duration::from_millis(50)`，轮询超时及期望未改。Fake 的错误类型仅改导入别名 `PublicIpcError`，仍是原公开类型。

没有修改任何旧断言的期望值、文案或预算。补充 01 第 5 节曾获准的旧断言变更与上节清单完全相同，本补单没有再次改变它们。

### 实际规模耗时

下面是同一最终 source/test 哈希下的实际测量，来自 `06-53-07.555Z-11220-test-5.log`。这些规模断言均通过；该轮在后续原有 clean_prepare 调用预算处失败，因此此表只作为规模计时证据，不冒充整轮绿色。最终整轮通过由 `07-13-12.435Z-17980-test-result.json` 证明。

| 次数 | skip_add（ms，60 条载入记录） | skip_remove（ms，60 条载入记录） |
|---|---:|---:|
| 1 | 5.1476 | 5.7102 |
| 2 | 5.6271 | 6.0848 |
| 3 | 5.8821 | 5.9899 |
| 4 | 5.5417 | 6.4169 |
| 5 | 5.6988 | 5.1027 |

同轮 **clean_prepare（5000 个排除 ID）为 29.9134 ms**。另一份 `07-06-00.948Z-37296-test-5.log` 的对应值为 28.9832 ms，skip_add 最大 7.0443 ms、skip_remove 最大 8.0476 ms；该轮也因后续旧调用预算失败，未认作整轮通过。

### 补单 02 检查命令与结果

执行目录始终为指定工作树。统一命令前缀：

`node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W8-K4 --mode`

| UTC 回执前缀 | 模式与参数 | 结果 |
|---|---|---|
| 06-44-13.877Z-32804 | lock | passed/0 |
| 06-52-33.721Z-39908 | check | passed/0，格式/源码政策/Clippy all-targets -D warnings |
| 06-53-07.555Z-11220 | test | failed/1，5/6，后续原有 SERVICE_RETURN_BUDGET: clean_prepare；新增规模断言通过 |
| 06-56-14.172Z-17544 | test | 原样重跑 passed/0，6/6 |
| 06-58-40.703Z-20752 | red-nc1 | 目标唯一失败，检查器 passed/0 |
| 06-59-39.569Z-24696 | test | 原字节恢复 passed/0，6/6 |
| 07-01-50.044Z-15328 | red-nc2 | 检查器 passed/0，但另有后续 SERVICE_RETURN_BUDGET: scan_start；本回执不采用此轮作为正式负控证据 |
| 07-03-10.720Z-18476 | test | 原字节恢复 passed/0，6/6 |
| 07-04-42.665Z-43652 | red-nc2 | 重做，目标唯一失败，检查器 passed/0 |
| 07-06-00.948Z-37296 | test | 原字节恢复 failed/1，5/6，后续原有 SERVICE_RETURN_BUDGET: clean_prepare；新增规模断言通过 |
| 07-07-47.860Z-25008 | test | 原样重跑 passed/0，6/6，正式 nc2 恢复证据 |
| 07-09-23.182Z-7912 | red-nc3 | 目标唯一失败，检查器 passed/0 |
| 07-11-19.567Z-32756 | test | 原字节恢复 passed/0，6/6 |
| 07-12-56.343Z-35348 | check --final | passed/0，绑定干净 f55d969d |
| 07-13-12.435Z-17980 | test --final | passed/0，6/6，48.38 秒；proofAudit 绑定三红/恢复 |
| 07-14-43.910Z-33928 | real --final | passed/0，completed，扫描 73022 ms，门总计 82.129 秒 |
| 07-16-39.333Z-22260 | archive | passed/0，累计 885 份、16,832,145 字节 |

另执行 `C:/Users/37310/.cargo/bin/rustup.exe run 1.95.0 cargo fmt --manifest-path packages/water-service/Cargo.toml`，退出 0；提交前 `git diff --check` 退出 0。未连续两次失败后继续检查，没有放宽任何断言。两次普通测试预算失败的根因未确定，原样重跑通过不等于证明其不会再发生；这些失败均保留在归档中。

归档 [ARCHIVE.json](../../acceptance/wave8/k4/ARCHIVE.json) 保留既有 607 份证据并增加 278 份（包含前轮归档命令回执），未覆盖既有条目。本轮未直接编辑归档内容。所有编译离线、jobs=1、私有 Cargo home/target；没有下载或 baseline 重跑。

### 本补单负控与恢复哈希

三条均仅改 `src/` 一个逻辑位置，测试文件字节不变；每次红后立即 `git checkout -- <该文件>` 并运行完整 test。

- **nc1**：`clean.rs` 将排除项所选组归属判断改为 `ids.is_empty()`。service_clean_flow 唯一以 `SERVICE_M3C_EXCLUDE: invalid exclusion accepted` 失败，其余 5 测通过。恢复 SHA256 `2d64ddaeaa228fb7b7da4b8c25fe652792aa834a6786f6f22e61ef91aa5172a5`；06:59 恢复完整 6/6。
- **nc2**：`service.rs` 的 add_skip 刷新循环只保留最新 scan_id，旧记录不刷新。正式 07:04 轮 service_clean_flow 唯一以 `SERVICE_M3C_SKIP: old scan total` 失败：实际 `1000240`，期望 `1000140`；其余 5 测通过。恢复 SHA256 `92f6866cdcfaba2315a2e9516b56b39655570559e941dea3827235009659a557`；07:06 恢复遇到旧预算红，07:07 原样重跑完整 6/6。07:01 的混合失败轮另行保留、不充正式证据。
- **nc3**：`service.rs::valid_custom` 仅把盘根的已知文件夹包含检查换成恒不命中。service_trends_locations 唯一以 `SERVICE_M3C_DRIVE_ROOT: system/nonfixed/known F:\` 失败，证明非系统固定盘的已知目录保护被独立测试；其余 5 测通过。恢复 SHA256 同 nc2；07:11 恢复完整 6/6。

最终 productionHash **`36e37f3febccbc0742eaf087f78c73a6e9542daca87cff2847023d0c4a9d7ee2`**，testHash **`dd3d4ea11367ec63e2009b20e4c925f922389f8759e57755dab7c8751f674412`**。final test 的 proofAudit 精确选择 06:58→06:59（nc1）、07:04→07:07（nc2）、07:09→07:11（nc3）。变异均已恢复，没有将编译错误或超时代替目标负控。

### 本补单真实只读分类汇总

`completed`；4 个固定盘；0 条 insight；duration_ms=73022。清理关闭，clean_prepare 返回 unavailable。输出无文件路径、程序路径或命令行。

| 分类 | 组数 | 去重后 total_bytes |
|---|---:|---:|
| agent_tool | 24 | 34718743844 |
| browser | 14 | 11166993167 |
| system_temp | 2 | 1106750354 |
| app_leftover | 8 | 11016328895 |
| dev_cache | 13 | 8481937637 |
| crash_log | 7 | 889599911 |
| gpu_system | 2 | 664082499 |

合计（字节）：recognized=68044436307，recommended=13809191441，confirm=9302766365，advisory=6667379153，protected=21120342273，unrecognized=0。在用提示：Chrome 15/36/8 项，Edge 1/2/8 项。

### 未做与交付边界

- 未改 Cargo.toml/Cargo.lock、其它包、原生函数、工单、契约、检查器或主线台账；没有 merge/rebase/reset/amend/push、git 配置或远端变更，没有子代理。
- 原生窗口 0、选择框 0；没有结束/挂起真实进程、读取真实普通文件内容或清理真实数据。实际体检仅按既定规则读取元数据和进程快照；合成夹具仍只由测试在本树 .local 新建，并校验父目录与前缀后删除本次自身目录。规模条目只存在于 JSON 中。
- 未验证 macOS、UI/宿主集成、真实自选盘根全盘扫描、全部生产负载/竞态或 M3 联合验收、自清理里程碑。票面列为以后处理的六项问题未修改。旧 IPC 调用的偶发 50 ms 预算失败仍需继续观察，本补单没有消除或掩盖此风险。
- 全部自有测试和真实体检命令已结束；归档与回执提交后停止测试和产品修改。
