# WATER-W12-P5：规则补缺，按 C 盘只读调查补认不出的大项（轻门）

2026-11-07，正式单，总控（Claude）。默认执行者：sol。状态以[第十二波 manifest](../wave12/manifest.json) 中本单的 `status` 为准。可以新开对话执行。

总控 11-07 对本机 C 盘做了一次只读调查（只看名字、大小与时间，没有读文件内容）：用户目录与 ProgramData 下约 108 GB 里，规则认不出、但可以再生的约 33 GB，其中 VRChat 的缓存一项 26 GB。本单把把握大的几条做成规则。

| 项 | 精确值 |
|---|---|
| 权威单 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W12-P5-RULES-20261107.md |
| 唯一工作树 / 分支 | F:/new/smaltalk/water/.worktrees/w12-p5 / worker/water-w12-p5 |
| 精确首次 HEAD | tag `water-w12-p5-base-20261107`，必须干净；完整 SHA 见 manifest |
| SPEC | F:/new/smaltalk/water/contracts/m35-v1/RULES-M35.md 与 F:/new/smaltalk/water/contracts/checkup-v1/RULES.md（规则的格式、定位器、保护重叠的校验），加上本单第 1 节 |
| 规则 | F:/new/smaltalk/water/docs/dispatch/WORKER-RULES.md 与 F:/new/smaltalk/water/docs/dispatch/W12-WORKER-RULES.md |
| 检查入口 | F:/new/smaltalk/water/scripts/checkup-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/w12-p5/docs/dispatch/reports/WATER-W12-P5-REPORT.md |
| 证据目录 | F:/new/smaltalk/water/.worktrees/w12-p5/docs/acceptance/wave12/p5/ |
| 门 | 轻门：2 条负控 + check、test、real 三个 final |

先读：两份规则、SPEC、本单全文；`packages/junk-rules/rules/windows.json`（照现有规则的写法，特别是 `gpu-shader-cache`、`chrome-cache`、`claude-desktop-old-versions`、`codex-marketplace-staging`）、`README.md`、`tests/rules_v1.rs`。

## 1. 要做的（全部在 `packages/junk-rules/`，只改 `rules/windows.json` 与测试、README）

| rule_id | 分类 | 级别 | 定位（base: segments） | 类型 | 年龄 h | 保留 | 在用 | 依据（调查时的大小） |
|---|---|---|---|---|---|---|---|---|
| `vrchat-cache` | app_leftover | confirm | user_profile: `AppData` `LocalLow` `VRChat` `VRChat` `Cache-WindowsPlayer` `*`；同上 `TextureDiskCache-WindowsPlayer` `*` | dir | 168 | 0 | process_running `VRChat.exe` | 26.4 GB；世界与角色下载缓存，删了下次进入时重新下载 |
| `wecom-upgrade-staging` | app_leftover | confirm | roaming_app_data: `Tencent` `WXWork` `upgrade` `*` | any | 720 | 0 | process_running `WXWork.exe` | 1.2 GB；下载好但没装上的企业微信更新 |
| `npm-global-reify-leftovers` | dev_cache | recommended | roaming_app_data: `npm` `node_modules` `.*-*`；同上 `npm` `node_modules` `@*` `.*-*` | dir | 24 | 0 | none | 0.9 GB；npm 全局升级失败留下的 `.<包名>-<随机>` 副本 |
| `wechat-xlog` | crash_log | recommended | roaming_app_data: `Tencent` `xwechat` `log` `*.xlog` | file | 168 | 0 | none | 0.6 GB；微信每天约 60 MB 的日志 |
| `gpu-shader-cache`（扩充） | gpu_system | 不变 | 在原有定位器后加：user_profile: `AppData` `LocalLow` `Intel` `ShaderCache`；`AppData` `LocalLow` `NVIDIA` `DXCache`；`AppData` `LocalLow` `NVIDIA` `GLCache` | 不变 | 不变 | 不变 | 不变 | 0.7 GB |
| `chromium-component-crx-cache` | browser | recommended | local_app_data: `Google` `Chrome` `User Data` `component_crx_cache`；`Microsoft` `Edge` `User Data` `component_crx_cache`；`BraveSoftware` `Brave-Browser` `User Data` `component_crx_cache` | dir | 24 | 0 | 照 `chrome-cache` 的写法，各浏览器各自的进程名 | 0.35 GB；浏览器组件的下载缓存 |
| `onedrive-logs` | crash_log | recommended | local_app_data: `Microsoft` `OneDrive` `logs` `*` | any | 168 | 0 | none | 0.3 GB |
| `copilot-sdk-runtimes` | agent_tool | recommended | local_app_data: `github-copilot-sdk` `cli` `copilot-sdk-runtime-*` | dir | 24 | 1 | cmdline_references_item（进程名照现有 agent 工具规则填，查不到就用 none） | 0.3 GB 可腾出（保留最新一个） |
| `claude-code-installer-downloads` | agent_tool | recommended | user_profile: `.claude` `downloads` `*` | any | 24 | 0 | none | 0.3 GB；装完留下的安装程序 |

- 每条写齐现有规则的全部字段：`title_zh`、`owner_zh`、`what_zh`、`why_zh`、`after_zh`、`growth`（缓存与日志为 `slow`，升级与安装残留为 `one_off`，npm 副本为 `leak_prone`）、`fix_hint_zh`（没有就照现有规则的空值写法）、`sources`（`{"kind":"local_observation","ref":"2026-11-07 总控 C 盘只读调查","checked_on":"2026-11-07"}`）。文案写 Flick，照第十一波 N4 的口吻：说清是什么、为什么能删、删了会怎样。
- **段内通配只用 `*`**（现有语法）。`npm` 那两条若 `.*-*` 在现有语法下会认到不该认的东西（例如 `.bin`、`.package-lock.json` 这类），在测试里证明不会：`.bin` 没有 `-`，文件被 `item_type: dir` 挡住。
- **和受保护规则冲突时**（规则加载报保护重叠）：这一条不做，在回执里写明是哪条受保护规则、为什么。不得为了放行去改受保护规则。
- `data_version` 改为 `2026-11-07.3`。
- **不做的**（总控已定）：NVIDIA App 的更新包（要管理员权限）、`.claude` 之外的 Claude 桌面版构建、豆包的日志、剪映的模型、Visual Studio 安装包缓存、把内嵌浏览器缓存的标记规则用到 AppData（要改扫描范围）。

## 2. 测试（`tests/rules_v1.rs`，测试个数不变，新断言加在已有函数里）

| 内容 | 放在 | 标记 |
|---|---|---|
| 每条新规则：按 `folders_json` 的夹具解析出的路径、级别、类型、年龄、保留、在用都与第 1 节一致；`gpu-shader-cache` 多了三个定位器、原有的不变 | `m35_seeds`、`m35_resolve` | `RULES_W12_NEW` |
| `npm-global-reify-leftovers` 不认 `node_modules\.bin`、不认 `node_modules\<普通包名>`、不认文件 | `m35_resolve` | `RULES_W12_NEW` |

- **获准修改的旧断言**：第 742、2108 行的规则总数 110 → 新的总数（110 加上新规则条数，扩充 `gpu-shader-cache` 不算新增）；第 700 行 `data_version` `2026-11-07.2` → `2026-11-07.3`；若有断言写死了 `gpu-shader-cache` 的定位器个数，照实改。

## 3. 负控（改 `rules/windows.json`）

| 负控 | 让什么失效 | 标记 |
|---|---|---|
| nc1 | `vrchat-cache` 的级别改成 `recommended` | `RULES_W12_NEW` |
| nc2 | `npm-global-reify-leftovers` 的段改成 `*`（会认到普通包） | `RULES_W12_NEW` |

只改 `rules/windows.json` 一处 → `--mode red-ncN` → `git checkout -- <文件>` 恢复原字节 → 立即 `--mode test`。

## 4. 命令（在工作树根目录执行）

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W12-P5 --mode baseline
```

之后反复用 `lock`、`check`、`test`、`real`，做完负控；提交干净实现后依次跑 `check --final`、`test --final`、`real --final`，再 `archive`。`real` 只看已知目录是否存在，输出只有计数。

## 5. 预算与边界

- 白名单：`packages/junk-rules/` 下的 `rules/windows.json`、`tests/rules_v1.rs`、`README.md`（规则条数若写在里面）；`docs/dispatch/reports/WATER-W12-P5-REPORT.md`；`docs/acceptance/wave12/p5/` 下 `--mode archive` 生成的证据。不改 `src/`。
- 原生窗口 0、选择框 0、浏览器 0；cargo 离线、单线程、私有 target。
- 不 merge、不 rebase，不改台账、契约、检查器、其它包。
- 提交身份、远端与历史、回执编码照通用规则第 7 节。

## 6. 交回

回执第一行与通知完全一致：

```text
WATER-W12-P5 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w12-p5/docs/dispatch/reports/WATER-W12-P5-REPORT.md
```

回执照通用规则第 7 节第 4 条写。受阻则写“WATER-W12-P5 任务受阻”。
