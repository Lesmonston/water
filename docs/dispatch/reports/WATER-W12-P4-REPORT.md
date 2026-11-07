WATER-W12-P4 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w12-p4/docs/dispatch/reports/WATER-W12-P4-REPORT.md

# WATER-W12-P4 回执：整组跳过、关于与诊断、第一次打开、几处小修

| 项 | 值 |
|---|---|
| 工单 | `WATER-W12-P4`（`docs/dispatch/tickets/WATER-W12-P4-UI-20261107.md`） |
| 工作树 / 分支 | `F:/new/smaltalk/water/.worktrees/w12-p4` / `worker/water-w12-p4` |
| 首次 HEAD | `6fd29e342b76ff2ceecd74e66805300405ef1334`（tag `water-w12-p4-base-20261107`，开工时 `git status` 干净） |
| 实现提交 | `5a2eccfdd120bcaa1fdebc0a90c9eebfcc573cd6`（`WATER-W12-P4: skip units, about and diagnostics, first-run page, small fixes`） |
| 实际模型 | Claude Opus 5.5（`claude-opus-5-5`），提交身份 `claude-opus-5-5 <claude-opus-5-5@localhost>`，只在提交命令的进程里设置 |
| 平台 | Windows 11 x64；Node v24.16.0；检查器开的私有 Chrome |
| macOS | 未验证 |

## 1. 读取与范围

按“先读”顺序读了：`WORKER-RULES.md`、`W12-WORKER-RULES.md`；契约 `W12.md` 第 1.4、1.5、1.7、2、4.3、4.4 节（实际通读了全文）；本单全文；仍然有效的 UI-M35、IPC-M35、设计 v3 `DESIGN.md`、`BRAND.md`、第十波 M6 补单 02；代码 `app.mjs`、`ipc.mjs`、`model.mjs`、`views/results.mjs`、`detail.mjs`、`locations.mjs`、`trends.mjs`、`charts.mjs`、`done.mjs`、`common.mjs`（另读了 `about.mjs`、`history.mjs`、`home.mjs`、`cleaning.mjs`、`format.mjs`、`index.html`、`styles/app.css` 中相关部分），测试 `unit.test.mjs`、`browser.test.mjs`，以及检查器与浏览器夹具 `native-vw-private-browser.mjs`。

改动只在 `apps/water/ui/`（14 个文件，其中新增 `views/intro.mjs`），另有本回执与 `docs/acceptance/wave12/p4/` 下 `--mode archive` 生成的证据。没有改 `package.json`、依赖、契约、冻结样例、检查器、台账或别的包。

## 2. 逐条对照工单第 1 节

| # | 工单要求 | 实现 |
|---|---|---|
| 1 | IPC 三个新命令 | `ipc.mjs` 末尾依次加 `skip_unit_add(conclusionVersion, unitId)`（`version()` + `id()` 校验，键恰好 `conclusionVersion`、`unitId`）、`diagnostics_get()`、`app_info()`（无参数，永远发 `{}`）。共 39 个，与 W12 第 5 节宿主的顺序一致。 |
| 2 | 判断卡“⋯” | `results.mjs`：`menu` 有 `skip` 时第一项为“以后都跳过”，点后 `a.skipUnit(card_id)`；`app.mjs` 的 `skipUnit` 发 `skip_unit_add(当前结论 version, unitId)`，成功后 `readConclusion()` 重读结论并关掉浮层；`stale` 等错误按 `'conclusion'` 范围处理。 |
| 3 | 抽屉行“⋯” | `detail.mjs`：`r.skip === 'item'` 发 `skip_add {itemId: row_id}`，`'unit'` 发 `skip_unit_add`，没有或 null 不显示。不再调用 `itemRow()` 按“不超过 8 项”判断。展开后的单项照旧。 |
| 4 | 跳过名单页 | `locations.mjs`：标题用 `display_zh`，没有时退回 `display_path`；副行“加入于 YYYY-MM-DD”（`localDateKey`，本地日期），“移除”照旧。 |
| 5 | 趋势页 `new` | 状态文字移到 `model.clusterStates`，加 `new:'新发现'`；只有 `growing` 加 `hot`，`new` 不加。 |
| 6 | “关于”页 | `about.mjs` 顶部一张品牌卡（BRAND.md 的 42px 墨色标志）：`Flick <version>`、`许可证 <license>`、`项目地址 <homepage>` + “复制”；卡底“复制诊断信息”。`app_info` 在进入 `settings/about` 时读一次；“复制诊断信息”点击时现取 `app_info` 与 `diagnostics_get`，复制 `Flick 诊断信息\n` + `JSON.stringify({app, platform:navigator.userAgent, service}, null, 2)`，复制方式与“复制线索给 agent”相同（`a.copy`，失败时弹只读文本框）。 |
| 7 | 第一次打开 | 启动时 `localStorage.getItem('flick.intro.v1') === null` 才显示说明页（读出错时不显示）；标题“Flick 怎么用”、SPEC 的三行、黑色主卡里唯一主按钮“开始”；点后写入 `flick.intro.v1`（写出错也照常进首页）并进首页。 |
| 8 | 清理结果提醒 | `done.mjs`：`journal_note_zh` 有值时在“部分完成”提醒之后加一行，同为 `p.warning`。 |
| 9a | 热力图 `NaN` | `charts.mjs heatmap()`：时间读不出的条目跳过；全部读不出时只返回空容器；“最近一次”改为第一条读得出的条目。 |
| 9b | 排队的“体检”点击 | `routeChanged()` 清掉 `checkupQueued`；`run()` 收尾重放前若 `s.modal` 有值就不重放。 |

## 3. 测试（个数不变：unit 3 个、browser 6 个）

新断言都加在已有测试里，失败信息带工单标记：

| 标记 | 测试 | 内容 |
|---|---|---|
| `UI_W12_SKIP` | `ui_v2_conclusion` | 夹具复制 `v2_conclusion_typical` 后去掉第二张卡的 `skip`；五张卡逐个核对“以后都跳过”出现与否等于 `menu` 是否含 `skip`；点一张卡后 `skip_unit_add` 的命令与参数恰好是 `{conclusionVersion: 结论 version, unitId: card_id}`，没有任何 `skip_add`，并重读了结论（`conclusion_get` 次数增加、出现过期提示） |
| `UI_W12_SKIP` | `ui_v2_drawer_details` | 逐项抽屉（`item` 与 null 行）与汇总抽屉（`unit` 与 null 行）逐行核对菜单；`item` 行发恰好 `skip_add {itemId: row_id}` 且无 `skip_unit_add`；`unit` 行发恰好 `skip_unit_add {conclusionVersion, unitId: row_id}` 且无新的 `skip_add`；合并卡抽屉的组行（`unit`）发 `skip_unit_add`，`unitId` 为该行组 ID |
| `UI_W12_SKIP` | `ui_v2_pages_layout_a11y` | 跳过名单五条（两条 `path`、`group`、`template`、`folder`）显示 `display_zh` 与“加入于 本地日期”；旧形状（没有 `display_zh`）退回 `display_path` |
| `UI_W12_SKIP` | `ui_ipc_boundary` | `skip_unit_add` 对卡片 ID、`card:m:`、`r:`、组 ID 的精确形状；拒绝路径、`..`、空、非字符串的 `unitId` 与不合规的 `conclusionVersion`，且不到宿主；`diagnostics_get`、`app_info` 即使被传了参数也只发 `{}` |
| `UI_W12_ABOUT` | `ui_v2_pages_layout_a11y` | 关于页三行文字精确等于 `app_info`；“复制”复制项目地址；“复制诊断信息”首行“Flick 诊断信息”，全文逐字等于 `app_info`、`navigator.userAgent`、`diagnostics_get` 三部分的 `JSON.stringify(…, null, 2)` |
| `UI_W12_INTRO` | `ui_v2_home_scan` | 新环境出现说明页（标题、三行、唯一主按钮“开始”）；点“开始”进首页；`Page.reload` 后直接是首页；`localStorage` 访问抛 `SecurityError` 时直接进可用的首页 |
| `UI_W12_FIXES` | `ui_v2_view_rules` | `model.clusterStates` 四种状态的文字，`new` 为“新发现” |
| `UI_W12_FIXES` | `ui_v2_pages_layout_a11y` | 趋势页 `state:"new"` 的簇标签“新发现”且没有 `hot`；历史里插入一条 `at:"not-a-time"`，热力图在有界探测下画完，格子里没有 `NaN` 与该条，最新一格仍唯一，读得出的那天与原来相同 |
| `UI_W12_FIXES` | `ui_v2_confirm_done` | `journal_note_zh` 为 null 时只有“部分完成”，有值时多一行同样 `warning` 样式的提醒；完成页上排队的“体检”点击在换页后被清掉（回来后释放挂起的请求，仍在完成页、没有多读结论）；查重页“清理所选”挂起时排队的“体检”点击，在确认框打开后不重放 |

夹具：都在测试里由冻结样例复制后补上 W12 的新键（`w12_group_detail_*` 的行 `skip`、`w12_locations.skipped` 的 `kind`/`display_zh`、`w12_clean_result.journal_note_zh`、`w12_app_info`、`w12_diagnostics`、趋势 `state:"new"`），没有改冻结样例文件。假宿主加了 `skip_unit_add`（版本不对回 `stale`）、`diagnostics_get`、`app_info`。

### 迁移过的旧断言（原值 → 新值 → 为什么必然要变）

1. `browser.test.mjs` 原第 229 行（工单预列 1）：`UI_V2_CONCLUSION: ignore every card skip menu`，五张卡都不得出现“以后都跳过” → 五张卡逐个断言“出现与否 == `menu` 含 `skip`”（夹具里有一张不含），并加点击后命令与参数的精确断言，标记 `UI_W12_SKIP`。原因：SPEC 1.7 作废了补单 02 的“卡片忽略 `skip`”。新断言同时覆盖“有”和“没有”，不比原来弱。
2. 原第 267～268 行（预列 2）：逐项抽屉第一行发 `skip_add {itemId:row_id}` → 先逐行核对菜单（`item` 有、null 无），再对 `skip === 'item'` 的第一行核对完整调用 `{command:'skip_add', args:{itemId}}` 与没有 `skip_unit_add`。原因：显示条件从“不超过 8 项”改为行的 `skip` 键；夹具 `i-000304`（不可选）设为 null。
3. 原第 275 行（预列 2）：汇总抽屉每一行都没有“以后都跳过” → 每行“出现与否 == `skip` 非 null”，另断言夹具同时含 `unit` 与 null，并加 `unit` 行发 `skip_unit_add` 的精确断言。原因：SPEC 1.4 的同模板、同父目录行为 `unit`。
4. 原第 294 行（预列 2）：合并卡抽屉的组行没有“以后都跳过” → 有，并且点后发恰好 `skip_unit_add {conclusionVersion, unitId: 该行组 ID}`。原因同上（合并卡抽屉里的组行为 `unit`）。原来紧跟的两次 `Escape`（关菜单、关抽屉）随之去掉：跳过成功后抽屉已关，改为等待抽屉关闭。
5. 原第 296 行（`skip_add` 的 `itemId` 从不以 `r:`、`m:` 开头、不等于组 ID）保留未动。
6. `unit.test.mjs` 第 95、97 行（预列 3）：命令与参数表、键表加三个新命令；同一处的第 118 行 `Object.keys(ipc).length` 36 → 39（工单写“第 95、97 行一带”，命令数随新增必然变化；仍是精确值）。
7. 第一次打开（预列 4）：假宿主在每个新文档开始时写好 `flick.intro.v1`，只有 `UI_W12_INTRO` 那段（`intro:'fresh'`、`intro:'blocked'`）不写。
8. 假宿主默认的 `locations`、`clean_result`、`group_detail` 改用上面的 W12 复制件（新形状），不是断言变化；`settings/skip` 原有“移除 `s-000001`”的断言不变。

## 4. 截图（28 张，`browser --final` 校验）

原有 25 张之外新增工单要求的三张：`v3-intro-1240x820.png`（说明页：标题、居中黑卡三行、主按钮“开始”）、`v3-settings-about-1240x820.png`（品牌卡三行、“复制”、“复制诊断信息”，下面原有四张说明卡）、`v3-settings-skip-1240x820.png`（五条：两条路径、组、模板、父目录，各带“加入于”日期与“移除”）。

与第十一波 N1 归档的同名截图逐字节比较，原有 25 张里 22 张完全相同，3 张不同：
- `v3-menu`：卡片“⋯”多了第一项“以后都跳过”（本单要求）。
- `v3-drawer`：Codex 旧运行时抽屉第 4 行（0.98，正在使用、不可选，测试夹具里 `skip` 为 null 且不可展开）不再有“⋯”；前三行仍有。
- `v3-results-decided`：与旧图并排看不出差别，属像素级差异（该测试前面多了打开卡片菜单与重读结论的步骤）。

## 5. 负控

三条都只改 `apps/water/ui/` 生产代码的一处、不动测试，跑 `--mode red-ncN` 后立即 `git checkout -- <文件>` 恢复原字节（`git status` 干净），再跑 `test` 与 `browser`，都绿。审计采用的是第二轮（见第 6 节说明）：

| 负控 | 改了什么 | red 结果 | 恢复后 |
|---|---|---|---|
| nc1 | `views/results.mjs` 删去 `if (c.menu.includes('skip')) entries.push(…)`（卡片又忽略 `skip`） | `2026-11-07T12-35-38.564Z-30804-red-nc1`：只有 `ui_v2_conclusion` 失败，`UI_W12_SKIP: a card offers 以后都跳过 exactly when its menu has skip`；其余 5 个通过 | `12-36-21.876Z-32524-test` 绿，`12-36-26.125Z-37104-browser` 绿 |
| nc2 | `app.mjs` 的 `startIntro` 去掉写入 `flick.intro.v1` | `12-37-22.412Z-24816-red-nc2`：只有 `ui_v2_home_scan` 失败，`UI_W12_INTRO: after 开始 a refresh goes straight to the home page` | `12-38-10.721Z-39920-test` 绿，`12-38-15.305Z-27776-browser` 绿 |
| nc3 | `views/charts.mjs` 删去 `if (Number.isNaN(date.getTime())) continue;`（热力图又死循环） | `12-39-08.570Z-33580-red-nc3`：只有 `ui_v2_pages_layout_a11y` 失败，`UI_W12_FIXES: the heatmap finishes drawing when one history time cannot be read`（`'late' !== 'drawn'`）；该测试总用时约 3.8 秒，输出里没有 `CDP timeout` 或 `timed out` | `12-39-57.641Z-39456-test` 绿，`12-40-02.181Z-33512-browser` 绿 |

nc3 的有界等待：测试先挂住 `history_list`，释放与之后的探测都通过 `bounded()` 发 `Runtime.evaluate` 并与 3 秒计时赛跑；超时就发 CDP `Runtime.terminateExecution` 终止页面里失控的脚本，返回 `'late'`，由带标记的断言报失败。这样页面恢复可用，`afterEach` 照常执行，不会拖成 CDP 超时，也不会被检查器判为超时类失败。这是抓死循环的上限，不是对产品速度的计时断言；绿的时候探测几毫秒就返回。

## 6. 检查命令与结果

都在工作树根执行 `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W12-P4 --mode <模式>`，回执在 `.local/checks/WATER-W12-P4/`，已归档：

| 时间（UTC） | 模式 | 结果 |
|---|---|---|
| 12:09:53 | `baseline` | passed（`12-05-10` 那份 baseline 是派单前总控的预检，不是本次执行） |
| 12:25:42 / 12:25:47 / 12:25:57 | `check` / `test` / `browser` | passed / passed / passed |
| 12:27:36 → 12:31:26 | 第一轮 `red-nc1`、`red-nc2`、`red-nc3`，每条之后跑 `browser` | 三条都按预期红；恢复后的 `browser` 前两次绿，第三次见下 |
| 12:32:24 | `browser` | **failed**：`ui_v2_quarantine_dedupe` 的旧等待（第 532 行，`UI_V2_QUARANTINE: window.__waterTest.quarantineHeld`，本单没有改这段）10 秒内没等到；这个测试这次用了 41.2 秒，平时约 16 秒，重跑前看了一眼，机器上有 23 个 cargo、rustc、chrome 进程（别的单在跑） |
| 12:34:04 | `browser`（原样重跑，第 1 次） | passed |
| 12:35:06 / 12:35:13 | `check --final` / `test --final` | passed / **failed**：`Missing immediate exact-byte restore and green test after nc1`。第一轮每条 red 之后我按通用规则第 6 节只跑了 `browser`，而检查器审计要的是工单第 3 节写的 `test` |
| 12:35:38 → 12:40:02 | 第二轮 nc1、nc2、nc3：red → 恢复 → `test` → `browser` | 见第 5 节，全部按预期 |
| 12:41:04 | `check --final` | passed |
| 12:41:09 | `test --final` | passed；审计 nc1、nc2、nc3 各对上一条 red 与恢复后的 `test` |
| 12:41:14 | `browser --final` | passed；6 个测试，28 张截图（含三张必需的新图） |
| 12:42:19 | `archive` | passed；`docs/acceptance/wave12/p4/ARCHIVE.json` 记 984 个文件、34,724,520 字节 |

`test --final` 记录的哈希：`productionHash=670fddffbc71334c46f827b0f69eea32ddae91d652b17578196229a3878e9d72`，`testHash=fb434826ded114b1b3af2e3248b2d4a8fe8ff6cca2f6e997db42260b35a3bea3`。

**计时与重跑（通用规则第 3 节第 2 条）**：只有上面 12:32:24 那一次，`ui_v2_quarantine_dedupe` 的一个旧 `wait`（有界轮询 10 秒）没等到，原样重跑 1 次即通过，之后的 7 次浏览器运行（3 次 red、3 次恢复后的 `browser`、`browser --final`）这段都通过。我把它当作负载造成的等待超时处理，没有改时限、断言或检查器；如果总控认为这不算计时类，这一条请复核。

## 7. 自己做的选择（通用规则第 3 节第 3～5 条）

1. **卡片菜单的顺序**：“以后都跳过”放第一项，照设计 v2 第 3.3 节（“`以后都跳过`、`查看明细`”）与 IPC-M35 `menu` 的“依次对应”。另一种是追加在最后，没选，因为与两处文字都不符。
2. **`model.itemRow` 保留**：产品代码不再用它，但 `ui_v2_view_rules` 第 87～89 行仍测它；删函数就得删断言，按“删得更少”保留。
3. **趋势状态文字移进 `model.clusterStates`**：与 `levels` 同样放在 model，单元测试 `ui_v2_view_rules` 因此能带 `UI_W12_FIXES` 断言（工单表里列了这个测试）。另一种是只在 `trends.mjs` 的对象里加一项，没选，因为那样单元测试无从覆盖。
4. **加入日期的写法**：“加入于 YYYY-MM-DD”，用已有的 `localDateKey`（与记录页热力图同一本地日期）。另一种是 `relativeTime`（“2 小时前”），没选，因为工单写的是“日期”。
5. **`app_info` 读不到时**：关于页不显示三行，也不报错（旧宿主没有这个命令时不挡用户）；“复制诊断信息”按钮照常在，读失败时按普通命令失败显示 `message_zh`。
6. **诊断信息现取**：点击时重新调 `app_info` 与 `diagnostics_get`，不用缓存，保证复制的是当时的状态。复制失败的后备文本框沿用线索复制的那个（标题“选中文字复制线索”），因为 SPEC 要求“复制方式与复制线索相同”；没有为诊断另加标题。
7. **说明页覆盖任何路由**：`flick.intro.v1` 不存在时，不论地址是哪一页都先显示说明页，顶栏照常显示；点“开始”写入 `'1'` 后进首页。另一种是只在 `#home` 时显示，没选，因为上次停留页记在 `water-last-page`，第一次打开也可能落在别的页。
8. **`skipUnit` 的错误范围**：用 `'conclusion'`，`stale` 时把结论标为过期并关掉浮层（与 `decide`、`detail` 一致）；原有 `skipItem` 未改。
9. **关于页的样式**：品牌卡用 BRAND.md 写的“关于与隐私页的品牌卡 42px 墨色”标志；`app.css` 末尾加了一行三条小规则（标志尺寸、卡底间距、说明页行字重 400）。

## 8. 真实冒烟

W12 规则第 3 节：P4 不读真实数据，浏览器只用夹具。本单没有读任何真实数据，也没有开检查器之外的浏览器。

## 9. 没做或没验证的事

- 没有与真实宿主、服务联调：`skip_unit_add`、`diagnostics_get`、`app_info` 由 P2、P3 实现，合入前只在假宿主上验证。
- Tauri WebView 里，等待 IPC 之后再调 `navigator.clipboard.writeText` 是否仍有用户激活没有验证；不行时会落到只读文本框后备。
- `app_info` 失败时关于页不显示三行、`diagnostics_get` 失败时的提示，没有专门的测试。
- 说明页显示期间点顶栏导航的行为（说明页仍在）没有专门的测试。
- macOS 未验证。
