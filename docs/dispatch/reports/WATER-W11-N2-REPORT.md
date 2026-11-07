WATER-W11-N2 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w11-n2/docs/dispatch/reports/WATER-W11-N2-REPORT.md

# WATER-W11-N2 执行回执

- 实际模型：Codex（GPT-6；环境未提供更细的运行时子型号）。单执行者，未使用子代理。
- 工作树：`F:/new/smaltalk/water/.worktrees/w11-n2`；分支：`worker/water-w11-n2`。
- 首次干净 HEAD：`ccc584b3894e28d1f6bb8f86748d03c143a38e5b`。本轮 baseline 先于任何编辑通过。
- 实现提交：`490c8e02d31e37dc2a3a04ccd09075a29d0ebbdf`，10 个宿主文件。三个 final 均绑定该干净提交；回执与检查器归档单独提交，不夹带产品改动。
- 五测、三条负控及各自立即恢复复测、check/test/native 三个 final 均通过。没有计时断言失败或计时重试。

## 工单逐项对照

| 工单 | 实现与验证 |
|---|---|
| 1.1 程序名 | Cargo.toml 只改 `[[bin]] name` 为 `flick`，package/lib/依赖不变。测试精确比较 bin 段；native 实际构建、运行 flick.exe。 |
| 1.1 配置、窗口、文案 | tauri.conf.json 只改 productName 为 Flick，policy.rs 同步接受 Flick、拒绝 Water；窗口标题与 data/lib/startup 四处用户文案同步。HOST_W11_RENAME 核对精确值。 |
| 1.1 图标 | 直接复制指定 ICO，11,509 字节；SHA-256 `7e5f864ab2ec13be0981886c162c0c49566bbcbc578c07fa3dc25c66788709b1`。测试从 CARGO_MANIFEST_DIR 上三级定位品牌源文件并逐字节比较；截图可见新图标。 |
| 1.2 数据目录 | 无覆盖时先检查 Flick；仅其不存在且 Water 为普通目录时尝试一次同父目录 fs::rename。失败后依次检查新目录、旧目录，允许这次退回旧目录。WebView、锁、激活信号随所选根。 |
| 1.2 安全 | 迁移只读元数据并改名，不复制、合并、删除或跟随旧联接。私有目录创建函数增加 existing_root 参数：回退后旧根或祖先消失就报错，准备 webview 时也不重建旧根。公开签名、返回类型与字段保持。 |
| 1.3 打开隔离区 | valid_quarantine_path 用同一名称谓词接受两个根名及合法编号子目录，ASCII 大小写无关。其它路径/目录/重解析点检查不变。实际走 cmd_quarantine_reveal 与记录型 Opener，不启动 Explorer。 |
| 2 测试 | 只在 tests/host_v1.rs，精确保留 host_config_boundary、host_navigation_boundary、host_command_registry、host_data_directory、host_service_wiring 五测。新断言分别带三个 HOST_W11 标记。 |
| 3～5 验证、范围 | 只用指定检查器，离线、单 job、私有 target；每次启动 cargo 前按名称查看进程。原生窗口 1、选择框 0、外部浏览器 0。README 同步本票行为和命令。依赖、锁、UI、其它包、台账、契约、检查器未改。 |

## 数据目录七种情况

新迁移用例从 host_data_directory 调用，使用本树 `.local/w3-f3-fixtures/wiring-<随机数>/` 单次自建根，local_data_dir 传其下各情形的 base。普通合成目录快照精确比较排序后的相对目录/文件列表及每个文件完整字节。测试只清理该次新建根，验证父目录、前缀和规范化身份，先解除本次联接。

| 情形 | 夹具与入口 | 结果 |
|---|---|---|
| 1 只有旧目录 | only-old/Water 有 settings.json、webview/profile.bin，含 NUL 与非 UTF-8 合成字节；调用 prepare_data_directories(None, base)。 | 返回 Flick 和 Flick/webview；Water 消失；完整列表和字节不变。 |
| 2 新旧都有 | both/Water 与 both/Flick 各有上述内容，新根额外有 new-only。 | 选择 Flick；旧、新完整快照均保持，没有合并。 |
| 3 旧文件被占用 | 测试进程以允许共享读取、不共享删除的句柄持有 held-old/Water/settings.json。 | 返回 Water 和 Water/webview，没有创建 Flick，旧快照不变。关闭句柄再调用，搬到 Flick，Water 消失，字节不变。 |
| 4 旧根是联接 | 用现有 `cmd.exe /D /C mklink /J` 助手把 junction-base/Water 指向随机根内合成目标。 | 创建普通 Flick/webview；原 Water 联接仍在、有 0x400 属性；目标快照不变；新根只有 webview，未复制。 |
| 5 给覆盖目录 | override-base/Water 有合成数据，传 Some(chosen-override)。 | 使用覆盖目录，旧快照不变，没有创建默认 Flick。另给覆盖目录和不存在的 unused-base，后者完全未创建。 |
| 6 新旧都没有 | neither 基目录起初也不存在，传 None。 | 创建 Flick/webview，精确只有 webview 子目录；没有 Water。 |
| 7 不新建旧目录 | 1、3 搬完和 6 核对 Water 不存在；2、5 比较旧快照；4 核对原联接保留；覆盖且 base 缺失时核对 base 未创建。 | 全部通过。existing_root 还在创建流程中禁止重建消失的旧根。 |

## 迁移的旧断言

原行号均按 ccc584b3。只有以下 20 处 Water→Flick 迁移；其它原断言未删除、放松或改变语义，新覆盖另行追加。

| 原行 | 原值 → 新值 | 原因与保持的证明 |
|---|---|---|
| 32 | 合法配置 productName Water → Flick | 改名后的合法配置；仍整对象精确相等。 |
| 122 | 重复键样例中的 productName Water → Flick | 保持只因重复键而被拒，不靠错误产品名假通过。 |
| 501 | Water 服务暂时不可用。→ Flick 服务暂时不可用。 | 完整 unavailable JSON 精确比较保持。 |
| 1157 | local-app-data/Water/activate.signal → local-app-data/Flick/activate.signal | 信号路径仍定位实际默认根；全部信号/锁检查保持。 |
| 1158 | linked-water-base/Water → linked-water-base/Flick | 在当前默认根本身造联接，仍证明其被拒；旧根联接忽略行为另加新用例。 |
| 1159 | linked-webview-base/Water/webview → linked-webview-base/Flick/webview | 在当前 WebView 路径造联接，保持子目录保护测试。 |
| 1191 | fallback.join("Water") → fallback.join("Flick") | 精确核对新默认数据根。 |
| 1192 | default Water directory → default Flick directory | 仅同步上一条的失败诊断文字。 |
| 1196 | fallback.join("Water/webview") → fallback.join("Flick/webview") | 精确核对新默认 WebView。 |
| 1336 | Water 已经在运行。→ Flick 已经在运行。 | 启动错误完整文字比较保持。 |
| 1341 | Water 暂时无法启动。→ Flick 暂时无法启动。 | 同上。 |
| 1399 | target.join("Water") → target.join("Flick") | 基目录联接仍规范化到真实目标，再在其下选择新根。 |
| 1404 | target.join("Water/webview") → target.join("Flick/webview") | 同一真实目标下精确比较 WebView 路径。 |
| 1440 | !ordinary.join("Water").exists() → !ordinary.join("Flick").exists() | 双次规范化含义变化仍报错，并核对未在错误普通拼写下写新根。 |
| 1441 | does not create Water in the stripped directory → does not create Flick in the stripped directory | 仅同步上一条的失败诊断文字。 |
| 1444 | 覆盖路径 junction.join("Water") → junction.join("Flick") | 覆盖路径经过联接祖先仍被拒，未放宽校验。 |
| 1458 | Water itself remains protected → Flick itself remains protected | 1158 的拒绝断言保持，仅同步诊断文字。 |
| 1462 | linked Water target untouched → linked Flick target untouched | 目标仍精确要求无任何子项，仅同步诊断文字。 |
| 2156 | Water 服务暂时不可用。→ Flick 服务暂时不可用。 | 后端槽 take 后仍精确比较完整 unavailable 值。 |
| 2432 | Water 服务暂时不可用。→ Flick 服务暂时不可用。 | 初始化失败仍逐命令比较完整错误值。 |

## 检查命令与结果

全部在指定工作树根运行。公共命令前缀为下行，接表内参数：

```powershell
node F:/new/smaltalk/water/scripts/desktop-wave-check.mjs --task WATER-W11-N2
```

所有检查器退出码均为 0。三个 red 内部 cargo test 预期退出 101，均精确为 4 通过、1 目标失败；所有正常 test 均为 5 通过、0 失败、0 ignored、0 filtered。check 包括 fmt 与 clippy -D warnings。

| UTC 开始 | 参数 | 结果 | 证据（位于 docs/acceptance/wave11/n2/receipts/） |
|---|---|---|---|
| 06:50:38 | --mode baseline | 通过，干净精确基线 | 2026-11-07T06-50-38.072Z-33004-baseline-result.json |
| 06:52:49 | --mode lock | 通过，依赖锁未变 | 2026-11-07T06-52-49.594Z-27988-lock-result.json |
| 06:53:38 | --mode test | 五测通过，首次编译约 9 分 26 秒 | 2026-11-07T06-53-38.372Z-13072-test-result.json |
| 07:03:51 | --mode check | 通过，首轮约 3 分 43 秒 | 2026-11-07T07-03-51.893Z-12320-check-result.json |
| 07:07:42 | --mode test | 加固旧根不可重建后五测通过 | 2026-11-07T07-07-42.627Z-29864-test-result.json |
| 07:09:18 | --mode red-nc1 | 目标失败被接受 | 2026-11-07T07-09-18.368Z-8724-red-nc1-result.json |
| 07:09:45 | --mode test | 原字节恢复后五测通过 | 2026-11-07T07-09-45.036Z-35368-test-result.json |
| 07:10:32 | --mode red-nc2 | 目标失败被接受 | 2026-11-07T07-10-32.118Z-28504-red-nc2-result.json |
| 07:10:49 | --mode test | 原字节恢复后五测通过 | 2026-11-07T07-10-49.829Z-29068-test-result.json |
| 07:11:30 | --mode red-nc3 | 目标失败被接受 | 2026-11-07T07-11-30.139Z-17876-red-nc3-result.json |
| 07:11:56 | --mode test | 原字节恢复后五测通过 | 2026-11-07T07-11-56.651Z-33888-test-result.json |
| 07:12:47 | --mode check --final | 通过，绑定实现 SHA | 2026-11-07T07-12-47.697Z-35712-check-result.json |
| 07:13:04 | --mode test --final | 通过，绑定实现 SHA | 2026-11-07T07-13-04.259Z-4360-test-result.json |
| 07:13:49 | --mode native --final | 通过，17/17、6 张截图 | 2026-11-07T07-13-49.694Z-8156-native-result.json |
| 07:14:31 | --mode archive | 通过，296 文件 / 22,439,973 字节 | [ARCHIVE.json](../../acceptance/wave11/n2/ARCHIVE.json) |

首次五测通过后，增加旧根不可重建限制、格式化并更新宿主说明；再通过 check/test 后提交实现。没有计时断言失败，没有计时重试，没有下载。

归档同时保留开工前已有的 06:42:08、06:43:48 两份总控 baseline，不计作本执行者检查。archive 自身结果在 `.local/checks/WATER-W11-N2/2026-11-07T07-14-31.390Z-26288-archive-result.json`；归档内 296 项均按 ARCHIVE.json 逐个复算大小与 SHA-256，全部一致。

额外的 `git diff --cached --check` 返回 2：仅原生 native-6.log、native-7.log、uia.json 三份原始证据因 CRLF 被识别为尾空白，没有行末空格或制表符。归档指定保留原字节，因此未规范化这些文件；产品和报告单独做空白检查通过。这不是工单门或产品测试失败。

## 三条负控及恢复

每条只改 src 下一个生产位置，不改测试、不加开关。red 后立即 `git checkout -- <指定文件>`、核对 SHA-256，再立即 test。三个 final 的 proofAudit 均接受对应红绿证据，生产与测试哈希一致。

| 负控 | 实际变异与命中 | 恢复后 SHA-256 |
|---|---|---|
| nc1 | data.rs 将失败回退 `(old, true)` 改为 `(new, false)`，让创建流程建空 Flick。host_data_directory 命中 `HOST_W11_DATA_MOVE rename failure uses old this time`。 | b7aa5211f60491cde954b67398d3e6976f1ac676d542c07ac56c3ecc576e9ecc |
| nc2 | opener.rs 名称谓词移除新名字，只认 .water-quarantine。host_service_wiring 命中 `HOST_W11_REVEAL new mixed-case root or numbered directory`。 | 4f221b67e39cc7f7b712c9f6ce428b193c78e0217054019fe9e95be9e26a55f5 |
| nc3 | lib.rs 实际 builder 的 `.title("Flick")` 改回 `.title("Water")`。host_config_boundary 命中 `HOST_W11_RENAME window title`。 | d754f056b5da1cd585a6be1ea6100b63d17e54455ee8428a0fd9c67dc21fbbe8 |

三次均只有目标测试失败，其余四测通过；没有编译错误或超时造红。恢复后五测均绿。

## 整机 17 步与截图

检查器只运行一次 flick.exe。系统主窗口 1，目录选择框 0，外部浏览器 0；Mica backdropType=2。观察器另计固定框架事件根 1（rawWindows=2 / eventTargets=1），没有额外业务窗口。未点击任何“打开文件夹/打开盘隔离区”按钮。

| 步 | 检查器动作 | 结果 / 耗时 ms | 截图 |
|---|---|---|---|
| 1 | 等“这次检查哪里？”，排除“无法连接 Water 服务” | 通过 / 1999 | [home](../../acceptance/wave11/n2/receipts/2026-11-07T07-13-49.694Z-8156-home.png) |
| 2 | 点“常用位置” | 通过 / 261 | — |
| 3 | 点匹配 -fixture 的位置 | 通过 / 138 | — |
| 4 | 点“开始体检” | 通过 / 195 | — |
| 5 | 等“可以放心清理” | 通过 / 4740 | [results](../../acceptance/wave11/n2/receipts/2026-11-07T07-13-49.694Z-8156-results.png) |
| 6 | 点“清理” | 通过 / 53 | — |
| 7 | 等“已加入清理” | 通过 / 469 | — |
| 8 | 点以“清理 ”开头的按钮 | 通过 / 85 | — |
| 9 | 等“先放进隔离区” | 通过 / 1248 | [confirm](../../acceptance/wave11/n2/receipts/2026-11-07T07-13-49.694Z-8156-confirm.png) |
| 10 | 点“开始清理” | 通过 / 33 | — |
| 11 | 等“清理完成” | 通过 / 1177 | [done](../../acceptance/wave11/n2/receipts/2026-11-07T07-13-49.694Z-8156-done.png) |
| 12 | 点“去隔离区” | 通过 / 38 | — |
| 13 | 等“隔离区里有 1 批” | 通过 / 1153 | [quarantine](../../acceptance/wave11/n2/receipts/2026-11-07T07-13-49.694Z-8156-quarantine.png) |
| 14 | 点“永久删除” | 通过 / 55 | — |
| 15 | 等“不进入回收站，无法恢复。” | 通过 / 48 | — |
| 16 | 点最后一个“永久删除”按钮 | 通过 / 90 | — |
| 17 | 等“隔离区是空的” | 通过 / 1180 | [purged](../../acceptance/wave11/n2/receipts/2026-11-07T07-13-49.694Z-8156-purged.png) |

六张 1568×1072 截图已逐张查看：系统标题、图标为 Flick；页面仍为本票冻结的 Water 基线，确认、完成、隔离、清空状态均可见。本票没有页面设计修改或与界面票合并。results 由检查器恢复窗口后拍摄（restores=1），其余无需恢复，没有额外开窗。

- 夹具：`.local/w11-n2-native/2026-11-07T07-13-49.694Z-8156-fixture`；数据根为同前缀下对应时间戳目录，由 WATER_DATA_DIR 指定。没有触碰真实 LOCALAPPDATA 下 Water/Flick 的搬家。
- 本次选中且可清理的只有本树夹具；七类常用位置关闭，冻结流程只读盘容量等元数据。没有清理真实用户数据。
- 缓存直接删除 3,145,815 字节，completed，deleted，failed_entries=0。安装包 1,048,576 字节完成移入，再永久删除相同字节。源码及两份浏览器配置守卫文件保留，均由检查器核对。
- 服务记录 scans=1、plans=1、cleans=1、quarantine=0、dedupes=0；clean/purge 两份 journal，clean 含 intent/result；purge 事件恰好 1 份。
- 基线服务使用旧隔离名。检查器记录 F:/.water-quarantine 跑前不存在、跑后仍不存在。执行者没有手工建盘根目录或删除空根。
- 原生阶段墙钟 16,930 ms，正常 exit=0、signal=null；privateWebviewObserved=true，六个观察到的 WebView 子进程全部结束，childClose.remaining=[]。交回前没有本票 flick/Water 常驻进程。

## 自主选择、工具小障碍与未验证项

- 复用现有 WiringFixture、junction 助手；合成目录都在随机自建根中。共享读取句柄既阻止改名又允许核对合成文件字节。未新增生产进程启动位置或系统函数。
- 退回旧根后选择“旧根必须继续存在”，通过私有参数限制创建，不扩大公开接口；旧根消失时报错，避免重建空旧根。
- PowerShell 下只读 node -e 引号被剥离，manifest 读取改用 ConvertFrom-Json。报告初稿经 PowerShell 管道时中文被转为问号，编码检查拦截且未提交；已直接用 apply_patch 重写为 UTF-8，提交前整份读回并检查无连续问号、无 U+FFFD。
- 另一实例恰在 rename 失败期间建成新根、新旧同时失效等并发时机，没有可注入时机且本票不加公开接口，所以只有代码审查覆盖，没有声明并发实测。existing_root 的删除竞态限制也未注入竞争进程实测。
- 未启动真实旧版或第二个原生实例。单实例和激活信号沿用原测试及运行时接线。真实用户默认目录搬家、生产恶意路径替换竞态、真实系统关机、实际 Explorer 打开、真实选择框、macOS、发布打包及签名均未验证。
- 没有 merge/rebase/reset/amend/push，没有修改 git 配置、远端或历史；提交身份仅设置在提交进程，使用 Codex / codex@localhost。本票测试与原生进程已结束，交回后不再启动检查。
