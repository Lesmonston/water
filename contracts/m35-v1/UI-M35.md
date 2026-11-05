# UI-M35：界面按设计 v2 重做（W10-M6，界面单）

2026-11-05，总控（Claude）冻结（11-02 起草，11-05 按通读结果修订）。取代 [UI-M3C](../m3c-v1/UI-M3C.md) 与 [UI-POLISH](../hardening-v1/UI-POLISH.md) 里关于页面结构、文案与测试的条款；材质、颜色、字体、动效、品牌照旧。只改 `apps/water/ui/`。

依据：[设计 v2](../../docs/design/water-ui-v2/DESIGN.md)（用户 11-02 认可：“可以”）与可点的[设计稿](../../docs/design/water-ui-v2/mockup.html)；形状见 [IPC-M35](IPC-M35.md)。用户对现有界面的原话：“太复杂了”“不知道怎么用”“每次扫描之后列表都太多了，用户逐项要去看几百条”。

**派单时机**：契约冻结后即可派（第一批），用测试里的假宿主与样例做；最后一个合入（等服务 M7 与宿主 M5）。

## 1. 不变的硬约束

- 仍是原生 ES 模块，没有 npm、框架、运行时依赖、内置演示数据；仓库里不得出现 `package.json`、锁文件、`node_modules`。
- `index.html` 只有一个 `<script type="module" src="app.mjs">`；源码（测试之外）不得有 `innerHTML`、`eval`、`http(s)://`、内联脚本、`on*=`、`style=`；`__TAURI__` 只出现在 `ipc.mjs`。
- 文件名：`app.mjs`、`ipc.mjs`、`model.mjs`、`format.mjs`，`views/<小写字母>.mjs`，`styles/<小写字母>.css`；不加别的目录。
- `styles/tokens.css` 与清单的 `tokensSource` 逐字节相同；第十波的 `tokensSource` 改为 `docs/design/water-ui-v2/tokens.css`（与 v1 是同一份内容）。
- **界面永远不传路径**：参数只有服务给的 ID、决定、开关、天数与搜索词；搜索词不含 `\`、`/`、`:`（IPC-M35 第 1 节）。`display_path` 只用来显示。
- 界面不合并、不排序、不截断服务给的列表，不自己推算选择状态与体量（设计 v2 第 1 节第 5 条、第 3.12 节第 8 条）。服务给几张卡就显示几张。

## 2. 结构

- 侧栏四项：**体检**（`#home`）、**隔离区**（`#quarantine`）、**趋势**（`#trends`）、**记录**（`#history`）；底部齿轮 **设置**（`#settings`，子页 `#settings/content`、`#settings/skip`、`#settings/decl`、`#settings/about`）；底部一行“本地只读扫描”。
- 隔离区导航旁显示 `AppState.quarantine.bytes`（为 null 时不显示）。
- 旧地址重定向：`#results` → `#home`，`#locations` → `#settings/content`，`#about` → `#settings/about`。
- “体检”一项按状态切换：选位置（3.1）→ 体检中（3.2）→ 结论（3.3）→ 清理中、完成（3.7）。

## 3. 页面与数据

下表的“节”指设计 v2 的小节；字段都来自 IPC-M35。实现与设计稿逐页对照（第 7 节）。

| 节 | 界面 | 用到的数据与命令 |
|---|---|---|
| 3.1 | 隔离区条；磁盘行；位置胶囊（点一下切换，新加的文件夹单独选中）；胶囊“⋯”：`查重复文件`、文件夹另有 `从列表移除`；主按钮“开始体检”；最多两条提醒 | `app_state`（`drives`、`quarantine`、`last_scan`、`checkup_due`）、`locations_get`（`home`）、`custom_root_add`、`custom_root_remove`、`scan_start {locationIds}` |
| 3.2 | 进度环；每个所选位置一行等待 / 扫描中 / 完成；“停止” | `scan_progress`（`locations`）、`scan_cancel` |
| 3.3 | 页头范围与“重新体检”；主结论数字、`plan.summary_zh`、主按钮“清理推荐项 X”与“包含什么”（就地展开 `plan.categories` 的开关）；0～5 张卡；`more_cards`、`kept_before` 各一行；线索（3 条与“还有 N 条 ›”）；`folds` 各一行，点开就地展开；页脚“查看全部明细” | `conclusion_get`、`conclusion_decide`、`clean_prepare {conclusionVersion, chosenMode}` |
| 3.4 | 右侧抽屉 480px：标题、两行要点、最多 8 行汇总（复选框 + “⋯”：`以后都跳过`、`展开看每一项`）、顶部搜索、底部一行合计 | `group_detail`（`rows`）、`group_items`、`conclusion_decide {row}`/`{item}`、`skip_add` |
| 3.5 | 分段控件“按类别 / 按位置”与搜索；一节一行、同时只展开一节；合并行写“3 个位置”；“和上次一样的 N 组”折叠；底部“清理所选 X” | `detail_get`、`conclusion_decide {group}` |
| 3.6 | 浮层“清理 X？”；“直接删除”一块；“你选的”一块与二选一（缺省“先放进隔离区”，选“直接删除”时主按钮变红“删除 X”）；预计跳过一行；“取消”“开始清理” | `clean_prepare`（切换二选一时重新调用）、`clean_start` |
| 3.7 | 清理中沿用 v1；完成页“已腾出 X”、隔离的一行、每盘一个小水位瓶、部分完成一行、“完成”“去隔离区” | `clean_progress`、`clean_result`（`quarantined`） |
| 3.8 | 页头与“打开文件夹”；每次一张卡（还原、红字“永久删除”二次确认、“⋯”：`打开文件夹`；设计 v2 里的 `查看全部条目` 本波没有接口，不做）；没有记录的卡（`restorable` 为假）不显示“还原”；7 天提醒；删了还剩的原因与“再试一次” | `quarantine_list`、`quarantine_restore`（冲突时问“还原到旁边或放弃”，选前者以 `beside: true` 再调）、`quarantine_delete`、`quarantine_progress`、`quarantine_reveal` |
| 3.9 | 几天后满（盘块里点开看曲线）；一直在长的（“⋯”：`标记为已修`、`复制线索给 agent`）；残留进程收成一行 | `trends`（`forecast`、`clusters`、`orphans`）、`cluster_mark_fixed` |
| 3.10 | 时间倒序一行一句话；点开看详情 | `history_list` |
| 3.11 | 扫描内容（7 个开关 + 会话记录一节，开关与天数 7 / 30 / 90）；跳过名单；项目声明（信任 / 不信任，显示声明了什么）；关于与隐私 | `locations_get`、`locations_set_category`、`locations_set_session_cleanup`、`skip_remove`、`manifest_trust` |
| 3.13 | 胶囊“⋯”进入：说明浮层“开始查重”；进度环（文件数、发现的重复体量、停止）；结果“多出来 X”、最多 8 组、其余一行、“另有 N 组同名不同内容”；勾上的组“清理所选”进隔离区 | `dedupe_start`、`dedupe_progress`、`dedupe_cancel`、`dedupe_result`、`dedupe_decide`、`clean_prepare {dedupeId, dedupeVersion}` |

补充：
- **决定**：卡片“清理 / 保留”、包含什么的开关、明细与抽屉的复选框，都只发 `conclusion_decide`，用返回的整份 ConclusionView 重画；不在本地改数字。决定后的卡片收成一行“已加入清理 · X · 撤销”或“已保留 · 撤销”。
- **过期**：`stale` 为真时页头一行“结果已过期 · 重新体检”，主按钮停用；任何命令回 `stale` 时同样处理。
- **空状态**：`plan.bytes` 为 0 时主结论写“没有可以放心清理的东西”，不显示主按钮；没有卡就不出现“需要你看一眼”。
- **复制线索**：`navigator.clipboard.writeText(copy_text)`；失败时弹一个只读文本框让人自己选中复制，不报错。
- **在用**：灰显并写服务给的 `release_zh` / `reason_zh`。
- **失败提示**：命令失败只显示 `message_zh`，不显示 code；`clean_prepare` 的失败显示在结论页上。
- **关闭窗口**：正在清理或永久删除时先问（沿用 v1 的做法）。

## 4. 按钮、菜单与键盘

照设计 v2 第 4 节：每屏最多一个主按钮；“⋯”菜单最多 4 项、动词开头、危险项在最后且红字；复选框只在明细与抽屉；一页最多一个分段控件；红色只给隔离区的永久删除与确认框里选了“直接删除”。键盘：Tab 顺序与视觉一致；卡片上 `Enter` 为清理、`Delete` 为保留；`Esc` 关菜单、抽屉、浮层；菜单用方向键。

## 5. 整机检查依赖的文字（新冻结）

第十波起，整机观察器按下面的文字找控件、等文字出现，一个字都不能动（取代 UI-POLISH 第 1 节那 11 处）：

| 种类 | 文字 |
|---|---|
| 导航 | 体检、隔离区、趋势、记录、设置 |
| 按钮 | 开始体检、重新体检、开始清理、完成、取消 |
| 页面文字 | 这次检查哪里？；可以放心清理；没有可以放心清理的东西；每一次体检与清理，都有迹可循。；扫描内容 |
| 失败提示 | 体检未能完成，请重新体检。 |

整机步骤由总控按这张表重写（第十波清单的 `nativeSteps`），派单时给出。

## 6. 样例

- `contracts/m35-v1/ui-fixtures-m35.json` 冻结时由总控给出；测试照旧按 `{...ui-fixtures, ...m3c, ...m35}` 顶层叠加。
- 至少含这些场景：首页（有隔离区条 / 没有；新加文件夹）；体检中；结论（典型：5 张卡 + `more_cards` + `kept_before` + 3 条线索与“还有 N 条” + 4 行收起；空；过期；只看了一个文件夹；决定之后）；明细两种模式；抽屉（8 行以内逐项 / 汇总行 / 合并行 / 搜索）；确认（先隔离 / 直接删除；只有直接删除一块）；完成（含隔离）；隔离区（有、删了还剩、没有记录的、空、还原冲突）；查重（说明、进行中、结果、更多）；趋势（三种状态）；记录；设置四页（会话开关、声明三种状态）。

## 7. 测试与截图

- `tests/unit.test.mjs` 精确三个测试：`ui_format_bytes_time`（不变）、`ui_v2_view_rules`（取代 `ui_selection_rules`）、`ui_ipc_boundary`（命令 36 个）。
- `tests/browser.test.mjs` 精确六个测试，取代原有五个：

| 测试 | 标记 | 内容 |
|---|---|---|
| `ui_v2_home_scan` | `UI_V2_HOME` | 隔离区条有无；胶囊切换；新文件夹单独选中；`scan_start` 发出的 `locationIds` 等于所选；体检中每个位置一行 |
| `ui_v2_conclusion` | `UI_V2_CONCLUSION` | 卡片数等于样例给的数、顺序不变；决定后整页按返回值重画；包含什么的开关；收起行就地展开；线索复制（假剪贴板）与失败时的文本框；过期与空状态；结论页可见行数（不含展开）不超过 20 |
| `ui_v2_drawer_details` | `UI_V2_DRAWER` | 抽屉汇总行不超过 8、逐项与汇总两种、搜索词校验（含 `\` 的不发）；明细两种模式、同时只展开一节、合并行与“和上次一样” |
| `ui_v2_confirm_done` | `UI_V2_CONFIRM` | 二选一缺省“先放进隔离区”；选“直接删除”时主按钮变红且文案变“删除 X”、重新调用 `clean_prepare`；预计跳过一行；完成页含隔离的一行 |
| `ui_v2_quarantine_dedupe` | `UI_V2_QUARANTINE`、`UI_V2_DEDUPE` | 隔离区卡片、7 天提醒、永久删除二次确认、删了还剩与再试一次、没有记录的卡没有“还原”、还原冲突的两步；`quarantine_reveal` 只发编号；查重四个阶段与勾选 |
| `ui_v2_pages_layout_a11y` | `UI_V2_PAGES`、`UI_IPC_NO_PATH` | 趋势、记录、设置四页；旧地址重定向；每屏主按钮不超过一个；1040×720 不横向溢出；键盘与焦点；任何命令参数里都没有路径 |

- 原有的五个浏览器测试与 `ui_selection_rules` **获准删除**（它们测的是被取代的 v1 页面）；`ui_ipc_boundary` 的命令数 19 → 36 获准修改（`ui_m1_polish` 整个删除，它读 `water-ui-v1/DESIGN.md` 的部分一并去掉）。
- **截图**：设计稿的 22 个画面各一张，名字为 `v2-<画面 ID>-1240x820.png`（画面 ID 见设计稿，如 `home`、`results-decided`、`confirm-direct`、`dedupe-result`），另加 `v2-results-stale-1240x820.png`、`v2-results-empty-1240x820.png`、`v2-quarantine-leftover-1240x820.png`、`v2-home-narrow-1040x720.png`。回执里每张与 `docs/design/water-ui-v2/previews/<画面 ID>.png` 并排对照，逐张写差异；总控验收时逐张看。

## 8. 负控

- **nc1**：界面把卡片按体量重新排序，测试以 `UI_V2_CONCLUSION` 失败。
- **nc2**：二选一缺省为“直接删除”，测试以 `UI_V2_CONFIRM` 失败。
- **nc3**：抽屉的搜索把 `display_path` 作为参数发出，测试以 `UI_IPC_NO_PATH` 失败。
- 负控只认生产代码的改动；三条都在浏览器里跑（标记都在浏览器测试里）。
