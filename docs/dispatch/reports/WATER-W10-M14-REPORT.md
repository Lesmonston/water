WATER-W10-M14 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m14/docs/dispatch/reports/WATER-W10-M14-REPORT.md

## 身份与交付

- 实际模型：GPT-6（Codex 当前会话）；未启动子代理或其他执行者。
- 工作树：`F:/new/smaltalk/water/.worktrees/w10-m14`。
- 分支：`worker/water-w10-m14`。
- 首次 HEAD：`98f9678e6a49bb63b87272644dae15c721384d9c`；开工时干净，baseline 通过。
- 实现提交：`b35ca69475f68f18633700f2712081659e0be6f9`。
- 实现仅修改 `packages/water-service/src/m35.rs`、`src/conclusion.rs`、`tests/service_v1.rs`。本报告及归档证据另行提交。
- 提交身份只在提交命令的进程内设置为 `Codex-GPT-6 <codex-gpt-6@localhost>`；未修改 Git 配置、远端或既有历史，未 push、merge、rebase。

## 工单第 1 节逐项对照

1. **已装程序整名匹配**：`m35.rs:447` 的 `installer_app` 使用文件名 `installer_tokens` 与程序名 `name_tokens`，忽略程序名中的纯数字词，要求其余词全部 ASCII 不分大小写精确相等，并至少有一个词达到 3 个字符；按列表顺序取第一个。安装包备注不再调用 `water_installed_apps::find`，其他原有用途仍保留。假平台测试覆盖 `install-service.exe` / Xbox Service、`cli-arm64.exe` / GitHub CLI 不误配，MostLogin 与 Git 正确配对及首个匹配。
2. **程序目录保护**：`m35.rs:267` 的补充流程只对 `installer-files` 规则及带 cluster 的组生效。`program_directory`（第 464 行）先按 `util::contains(安装位置, 条目路径)` 核对安装位置，盘根不算；然后从文件所在目录或 `cluster.parent` 开始检查当前目录及上面五级，盘根不枚举。仅枚举目录项、检查匹配卸载程序名的普通文件元数据，不读取内容；排除 reparse 文件。一次补充共用 ASCII 小写目录键的缓存，失败记为未发现，不重复枚举。程序目录原因置于 `reason` 和备注最前，原来已不可清的条目也保留此优先原因。全部成员因本条受阻的簇由 `program_directory_blocked` 与 `clues` 联动移除线索。
   - `m14_program_directories`（`service_v1.rs:4211`）走真实服务扫描入口、自选位置与假平台名单，验证 Bar 安装位置（含大小写差异）、Barley 不被前缀误拦、盘根安装位置忽略、同目录 App 安装包及卸载程序受保护、Foo 仍可清。
   - 工单所列 `prog/App/cache` 中 12 个簇成员全部受阻，不出卡片或线索；名单为 None 时仍能通过卸载程序保护。
   - 夹具使用既有随机 `.local/w3-f1-fixtures/service-*` 工厂，安装包位于自选位置三层以内，时间统一改为八天前；回收仅使用原有、校验父目录和前缀的 Fixture Drop。
3. **联接线索合并**：`conclusion.rs:1661` 的 `clues` 按首个 `referenced_by` 的 ASCII 小写值分组，按各项 `unique_bytes` 总和参与排序；文案写项数与总量。ID 为 `cl-ref-` 加该键 SHA-256 前 12 位。复制文本附前 20 个条目路径，超过时末行为 `…等 N 项`。测试精确比较四项合一的 ID、文字和复制文本，混用路径大小写，并验证 21 项时复制文本上限。特殊名字和 detached git 线索逻辑未改。
4. **实际新增数**：泄漏线索按本次记录的 `finished_at - 14 天` 比较成员创建时间；缺创建时间时用 `newest_activity`，截止点相等算新增。测试覆盖创建时间优先、截止点相等、前一秒不算、修改时间回退，共新增 2 个，以及全部较旧时“最近 14 天没有新增”。原复制检查清单的生成逻辑未改。
5. **泄漏卡标题**：`conclusion.rs:755` 的 `card` 按 `cluster.kind` 区分文件和目录；`tail2`（第 895 行）把 UUID、至少七位纯十六进制、至少八位纯数字段换为 `…`，保留最后两级结构。测试通过扫描产生的簇注入文件类型与父目录元数据，精确核对 UUID、十六进制、数字、普通 `en/image`、短十六进制及无效 UUID 的标题。现有目录簇测试仍通过。
6. **证据文字**：时间只取前十位日期，同一天只写一次；备注按第一次出现的顺序去重，只展示前两条，其余计为不同备注的剩余数。测试精确核对同一天不同秒、重复备注及“等 2 条”，并保留原路径段。
7. **折叠位置与名字**：`conclusion.rs:1831` 的 `folds` 从扫描记录 scope 获取位置标签；仅 `custom:<location_id>:…` 且 ID 命中时写 `note_zh`，否则为 null。摘要标题先去重再取前三个。合成记录测试对 advisory 与 protected 均验证两个同名组分别显示位置一、位置二，未知位置为 null，摘要标题仅出现一次。
8. **契约边界**：按本工单补充解释 SERVICE-M35 第 4.2、5 节，没有修改契约文件、IPC 命令或形状。未改依赖、锁、FFI、其他包、检查器或台账；计划、清理、隔离区流程与计时断言保持。

## 旧断言迁移

仅迁移工单预列的一处输入（当前 `service_v1.rs:5211`）：

| 原值 | 新值 | 原因与保留强度 |
|---|---|---|
| 四个条目都使用 `synthetic-reference` | 依序使用 `synthetic-reference-0` 至 `synthetic-reference-3` | 四个不同联接仍应给前三条线索、剩余 1 条；原 `exactly three of four clues == 3` 与 `remaining clue count == 1` 断言原样保留。相邻的新辅助用例另行精确核对同一联接四项合一。 |

其余旧断言、标记与阈值未改。仍精确 12 个测试，无 ignore、过滤或额外测试名。新增辅助函数由原有 `m35_scope_and_plan` 与 `m35_conclusion_cards` 调用。

## 检查命令与结果

所有检查均在指定工作树根目录执行。以下各行的完整命令为：

```text
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W10-M14 <下表参数>
```

回执文件名时间为 UTC；均位于归档的 `docs/acceptance/wave10/m14/receipts/`。

| 参数 | 回执文件名前缀（后接 `-<mode>-result.json`） | 结果 |
|---|---|---|
| `--mode baseline` | `2026-11-07T03-14-18.038Z-31540` | 通过，精确基线且干净 |
| `--mode test` | `2026-11-07T03-17-51.328Z-31116` | 新断言验证基线为红：9 过、3 失败；程序目录保护及联接合并两条目标断言失败，另有旧 `SERVICE_RETURN_BUDGET: scan_result` 计时失败；未作为负控证据 |
| `--mode lock` | `2026-11-07T03-22-19.748Z-23768` | 通过，依赖及锁未变 |
| `--mode check` | `2026-11-07T03-22-31.205Z-30608` | 通过，源码政策、fmt、全目标 Clippy `-D warnings` |
| `--mode test` | `2026-11-07T03-23-00.698Z-20640` | 11 过、仅旧计时失败：`SERVICE_M3C_EXCLUDE: scale prepare 218.9102ms`，上限 50ms |
| `--mode test` | `2026-11-07T03-24-50.715Z-30484` | 原样重跑一次，12/12 通过 |
| `--mode red-nc1` | `2026-11-07T03-26-29.527Z-18372` | 有效负控，目标失败、其余 11 过；检查器退出 0 |
| `--mode test` | `2026-11-07T03-28-16.542Z-29780` | 恢复后 12/12 通过 |
| `--mode red-nc2` | `2026-11-07T03-29-57.559Z-30208` | 有效负控，目标失败、其余 11 过；检查器退出 0 |
| `--mode test` | `2026-11-07T03-31-16.558Z-6104` | 恢复后 12/12 通过 |
| `--mode red-nc3` | `2026-11-07T03-32-51.828Z-2740` | 目标失败，另有旧计时失败 57.4145ms / 50ms；检查器退出 0，但不选作最终 nc3 证据 |
| `--mode test` | `2026-11-07T03-34-18.931Z-21900` | 立即恢复后 12/12 通过 |
| `--mode red-nc3` | `2026-11-07T03-36-05.909Z-21592` | 同一负控原样重跑一次，仅目标失败、其余 11 过；检查器退出 0 |
| `--mode test` | `2026-11-07T03-37-58.807Z-7292` | 立即恢复后 12/12 通过 |
| `--mode check --final` | `2026-11-07T03-40-13.304Z-10148` | 通过，干净实现提交 |
| `--mode test --final` | `2026-11-07T03-40-38.639Z-22228` | 通过，12/12；三组 red→原字节 green 配对审计通过 |
| `--mode real --final` | `2026-11-07T03-43-18.133Z-25820` | 通过，清理关闭的真实只读冒烟 |
| `--mode archive` | `2026-11-07T03-45-19.257Z-10068` | 通过；该模式的结果回执写在归档动作之后，原件在 `.local/checks/WATER-W10-M14/` |

此外用 Rust 1.95.0 的 rustfmt 对上述三个修改文件格式化，`--edition 2024 --config skip_children=true`，退出 0；`git diff --check` 通过。每次启动测试前仅按进程名核对 cargo/rustc/clippy，未发现其他检查进程。全部 Cargo 命令由检查器执行，离线、单线程、私有 home/target，未下载、联网或调大时限。

计时重跑未改任何产品或测试字节：修复后的普通测试重跑一次通过；nc3 在立即恢复并绿测后，原样再做一次取得仅目标失败的记录。最初新断言验证红同时有计时失败，随后实现功能修复，未将它冒充“只因计时重跑”。

工作树 `.local/checks` 另有开工前已有的 `2026-11-07T03-03-23.835Z-21532-baseline-result.json`。归档器一并保留，非本会话执行，不计入上表本次命令。

## 负控与原字节恢复

每次只改一个实际调用到的生产位置，未改测试、未加开关。红测 Cargo 退出 101；检查器因观察到预期失败退出 0。每次随后执行单文件 `git checkout -- <文件>`，立即全量运行本票 12 个测试。

| 负控 | 生产变异 | 目标失败信息 | 最终采用的恢复绿测 |
|---|---|---|---|
| nc1 | 将 `installer_app` 函数体改回 `water_installed_apps::find(installer_tokens)` | `SERVICE_M35_SCOPE: partial app name selected/downloads/install-service.exe` | `03-28-16.542Z-29780` |
| nc2 | 移除发现卸载程序后返回保护原因的分支，安装位置保护保留 | `SERVICE_M35_SCOPE: program file selected/prog/App/App-setup.exe`（实际 true、预期 false） | `03-31-16.558Z-6104` |
| nc3 | 联接分组键附加 item_id，使同一联接重新按条目出线索 | `SERVICE_M35_CONCLUSION: four references merge case insensitively` | `03-37-58.807Z-7292`；采用第二次 nc3 |

恢复后文件 SHA-256：

- nc1、nc2 的 `src/m35.rs`：`d1047aa5dd8a11c79c47e07a9dffa6e030de5b7f924a7561b8f26dba7e75aa9c`。
- nc3 的 `src/conclusion.rs`：`b94c8d5d7838127fd3410ff0d765ba67e417ddff1e455cacc74901f10da727ce`。
- 所有恢复绿测及三个 final 的检查器 productionHash：`98ab0d2cce722d040cd72f1215280c976f484f107cac956fc726ad1cdfcb0701`。
- 对应 testHash：`6d01596bfb4bdc0af11fc8e441173b37f40b2397eb153872bf1d6ac6a79972b1`。

最终 test 回执的 `proofAudit` 精确引用 nc1 `03-26-29`→`03-28-16`、nc2 `03-29-57`→`03-31-16`、nc3 `03-36-05`→`03-37-58`，并重新核对源码快照哈希。

## 真实冒烟与归档

真实冒烟只运行原有 `service_smoke`：WindowsPlatform、`locationIds:["common"]`、`clean_enabled:false`、NoPicker。`clean_prepare` 被确认拒绝；仅获取结论及隔离区列表。输出汇总为：

```json
{"cards":5,"clues":3,"conclusion_rows":13,"drives":4,"folds":3,"quarantine_cards":0}
```

原生窗口 0、选择框 0、浏览器 0。未输出真实路径、程序名或命令行。三个 final 的前后 HEAD 均为实现提交，状态均干净。

归档索引：`docs/acceptance/wave10/m14/ARCHIVE.json`。归档器按原字节复制 345 份日志、源码快照及回执，共 9,742,648 字节；另有索引及归档器生成的 `.gitattributes`。归档后逐项复算所有索引条目的 SHA-256 与大小，全部一致。没有手工修改归档证据。收尾按进程名检查 cargo、rustc、clippy-driver、service_smoke、service_v1，剩余 0 个。

## 选择与未验证事项

- 同时命中安装位置与卸载程序时按工单 a→b 顺序，以名单中的首个安装位置匹配作为优先原因；只做收紧资格的调整。
- UI 文案通过服务结论输出断言验证；未启动界面或浏览器，不宣称完成视觉验收。
- 日期、UUID、文件簇、折叠位置等难以固定的元数据由既有私有测试记录注入验证；未给生产增加测试接口或路径入口。目录枚举缓存和六级边界通过代码核对，未增加枚举计数钩子，也未逐一构造全部层级边界。
- 未验证 macOS、M12/M13 后续合入后的整合树、真实删除/隔离/还原、生产竞态；真实冒烟只证明工单指定入口成功，不声明已复现并验证所有真实问题目录。
- 实现提交后产品字节未再变化，后续提交仅含本回执与归档证据。总控集成、验收与发布由总控另行处理。
