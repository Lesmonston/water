WATER-W6-I3 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w6-i3/docs/dispatch/reports/WATER-W6-I3-REPORT.md

# WATER-W6-I3 执行回执

2026-10-28。执行者交付完成，待总控独立验收；未修改主线台账或自行标记 VERIFIED。

## 身份、基线与交付

- 实际模型：Codex / GPT-6（本会话给定身份；更细的服务端版本字符串未暴露）。没有使用子代理或其它执行者。
- 工作树：`F:/new/smaltalk/water/.worktrees/w6-i3`；分支：`worker/water-w6-i3`。
- 首次 HEAD：`d79fb096ef0557430b7dd43634b4d60e8f2de958`，首次 `git status --short` 为空。
- 实现提交：`c8f367907b8db42ea35ada8969183bbd79e527f8`。
- 实现只改 `apps/water/ui/app.mjs`、`apps/water/ui/views/results.mjs`、`apps/water/ui/tests/browser.test.mjs`。
- 本回执及 `docs/acceptance/wave6/i3/` 由后续单独的证据提交交付，产品与测试字节保持实现提交版本。
- 提交身份仅在提交进程环境中设置为 `Codex GPT-6 <codex-gpt-6@localhost>`；未修改 Git 配置、远端或已有历史，未 push、merge、rebase。

已按票面顺序阅读执行者规则、ADR-018、M3 计划、UI-POLISH、UI 契约、设计说明、指定产品与测试代码；同时读取项目 README、STATUS、PROJECT-CHARTER、CONTROLLER-WORKFLOW、IPC 契约及 H4 验收记录。M3 计划按规则中的相对链接解析为 `docs/M3-PLAN-20261028.md`。权威工单及本波规则从主树只读取得，没有复制或修改冻结文件。

## 工单五条对照

### 1. 测试独立与有界等待

`ui_results_detail_confirm` 先以已有扫描结果复位到结果页；`ui_clean_done_and_pages` 自己复位到首页，经查看结果、准备、确认启动假清理，再测试清理中到完成的行为。两者不消费前一测试遗留的任务状态。原断言保留，包括第 3 测的 `clean_start` 恰好一次。

所有原 `browser.waitFor(expression)`、`pageIs`、`waitText` 的条件不变，改经测试内 `waitFor`：最多 400 次、每次间隔 25ms，失败抛 `UI_TEST_BOUNDS: <原条件>`。原本已有的 `settle`、`noticeSettled` 及暂停的 600 次上限保留。没有增加测试、过滤、跳过或放宽原判定条件。

独立复位会从仍在清理的旧页面导航；初次试跑暴露其 `beforeunload` 会拦住 CDP 导航。假宿主新增一个只在 `reset` 设置 `resetting` 后才生效的捕获监听器，用于放行测试复位。正常场景不设置该值，第 3 测原有两条真实关闭保护断言仍执行且通过。产品没有测试钩子。

### 2. 去了又回来：UI_RETURN_SCOPE

在 `ui_m1_polish` 补充实际鼠标点击用例：拦住 `clean_prepare` 成功，切趋势再回到同一结果地址，确认请求仍未完成，再放行。断言没有旧确认框，第二次点“清理所选”才出现确认框，且累计两次准备请求。

生产 `inScope` 仍同时比较路由版本与原 hash。路由版本现仅在 `routeChanged` 增加，补读当前页不再冒充一次路由变化，因此恢复连接时不会使同一路由的正常在途读取失效。

### 3. 恢复成功后补读：UI_RECONNECT_READ

- 重连按钮只清掉旧错误并恢复进度轮询，不再调用 `loadRoute(true)`。
- 进度失败或进入暂停时记录 `recoveryPending`；其后第一次成功读到进度才清除此标记并调用 `loadRoute(true)`，按 `missingOnly` 补读当前页缺的数据。
- `loadRoute` 普通切回清理记录时也检查展开项；未缓存的详情会补读，暂停时不做这种自动详情补读。现有详情缓存判断不变。
- 新假宿主 `offline` 仅在测试内使用。用例先缓存清理记录列表，暂停后让详情和趋势读取失败，在服务仍离线时点重连，断言按钮没有提前读取趋势；20 次进度失败后再次暂停，再次重连仍保持连接提示。恢复服务后趋势数据出现、提示隐藏，趋势只补读一次；回到记录后保持展开的扫描详情补读成功。断言恢复过程没有启动清理。
- 原有“当前页趋势恢复”与“当前页展开详情恢复”的 H4 断言全部继续通过。

### 4. 清理停止反馈：UI_CLEAN_STOP

生产 `run` 给两个停止动作增加清除旧停止反馈的选项，在第一次 pending 渲染之前清除；停止请求发出时旧行已不在页面。失败时先清空 `#announcer`，再在下一任务中写入原有完整句子，并检查仍属于当前页且反馈仍有效。

新增清理页实际按钮用例：暂停清理、让 `clean_stop` 失败，核对原文“停止请求没有送达，请先重新连接再试。”在 `.cleaning-status` 卡片里、停止按钮下方、提示条外；拍摄 `clean-stop-failed-1240x820.png`。再次停止时拦住请求，核对发出请求前旧行已消失，待命令失败后重新显示；用 MutationObserver 核对 live region 经空字符串后再次写入相同句子。重新连接后此行消失。

停止失败文案、清理页现有 `stopNote` 布局和扫描页原有 `UI_STOP_FEEDBACK` 断言均未改写。

### 5. 过期重复文案

`views/results.mjs` 在提示条正在展示同一句过期错误时不再生成重复的正文 `.note`。关闭提示或离开再返回后，正文说明仍出现，且清理按钮仍禁用；连接提示取代错误时正文也保留。新增 `UI_NOTICE_SCOPE` 断言确认显示过期提示条时正文无重复行。`stale-1240x820.png` 中没有被提示条遮住的半行过期文字。

## 检查命令与证据

以下命令均在本工作树根执行，统一前缀为：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W6-I3
```

表中参数接在此完整前缀后。回执和子命令日志位于 `docs/acceptance/wave6/i3/receipts/`；下表用时间戳前缀定位同名 `-<mode>-result.json` 及其日志。时间戳为检查器 UTC 时间。

| 参数 | 时间戳前缀 | 检查器退出码 / 结果 |
|---|---|---|
| `--mode baseline` | `2026-10-28T09-45-39.254Z-27900` | 0，基线通过 |
| `--mode browser` | `2026-10-28T09-49-15.788Z-24712` | 1，首次新增复位用例暴露关闭确认阻塞，日志保留；不是负控 |
| `--mode browser` | `2026-10-28T09-50-50.523Z-2036` | 1，旧产品准确命中新增 `UI_RECONNECT_READ`，4 过 / 1 失败，无超时 |
| `--mode check` | `2026-10-28T09-53-25.053Z-29396` | 0，政策与全部 mjs 语法通过 |
| `--mode test` | `2026-10-28T09-53-28.548Z-5604` | 0，精确 3 测通过 |
| `--mode browser` | `2026-10-28T09-53-30.738Z-20208` | 0，精确 5 测通过，26 张截图 |
| `--mode red-nc1` | `2026-10-28T09-55-01.191Z-3748` | 0，有效负控；子进程 1，目标断言失败 |
| `--mode test` | `2026-10-28T09-55-57.029Z-20584` | 0，nc1 恢复后 3 测通过 |
| `--mode red-nc2` | `2026-10-28T09-55-59.732Z-37720` | 0，有效负控；子进程 1，目标断言失败 |
| `--mode test` | `2026-10-28T09-57-19.705Z-24976` | 0，nc2 恢复后 3 测通过 |
| `--mode red-nc3` | `2026-10-28T09-57-21.952Z-34620` | 0，有效负控；子进程 1，目标断言失败 |
| `--mode test` | `2026-10-28T09-58-33.844Z-39104` | 0，nc3 恢复后 3 测通过 |
| `--mode check --final` | `2026-10-28T09-58-36.553Z-22868` | 0，干净实现提交上通过 |
| `--mode test --final` | `2026-10-28T09-58-39.501Z-14292` | 0，3 测通过，三对红/恢复字节审计通过 |
| `--mode browser --final` | `2026-10-28T09-58-41.970Z-5692` | 0，5 测通过，0 skip/todo/cancel，61,437.217ms，26 张截图 |
| `--mode archive` | `2026-10-28T09-59-45.132Z-24244` | 0，归档 438 个索引条目 / 30,045,694 字节；本条自己的回执在 `.local/checks/WATER-W6-I3/` |

归档中 `09-31-29.908Z-7316-baseline-result.json` 是开工前已有的派前记录，不计为本执行者运行。首次试跑中的 `CDP timeout: Page.navigate` 及连带失败完整保留；修正测试复位后没有把该失败算作有效负控。

单元测试保持 `ui_format_bytes_time`、`ui_selection_rules`、`ui_ipc_boundary`，文件字节未改。浏览器保持 `ui_home_and_scan`、`ui_results_detail_confirm`、`ui_clean_done_and_pages`、`ui_layout_states_a11y`、`ui_m1_polish`，没有增删测试名。

final 后仅做只读证据复核：重新计算 ARCHIVE 的 438 个文件 SHA-256，全部吻合；核对三条负控日志 `timeout|timed out` 均不匹配；产品改动的 `git diff --check` 无问题。归档暂存后的全量 `git diff --cached --check` 把原字节保留的 CRLF 源码快照判为 trailing whitespace（退出 2），因此未据此改写证据；针对产品与本回执的定向检查通过。没有新增产品检查或重跑已通过的 final。

## 三条有效负控与恢复

三条都只临时改变一个真正调用的产品位置，测试字节不变；每条均只有 `ui_m1_polish` 失败，其余 4 测通过，没有编译错误、模块错误、CDP timeout 或 Browser condition timed out。检查器确认有效后立即 `git checkout -- <该文件>`，再跑上述 `--mode test`，之后才做下一条。

| 负控 | 临时改动 | 实际失败信息 | 原字节恢复后的文件 SHA-256 |
|---|---|---|---|
| nc1 | `app.mjs` 的 `inScope` 从比较版本与地址改为只比较地址 | `UI_RETURN_SCOPE: a preview from an earlier route version cannot open confirmation after returning to the same address` | `9b09bc8991382fd6c2e3836e970d7567e5c534b8c8d467e6481fbadb8c2c84e9` |
| nc2 | `app.mjs` 的恢复成功分支移除 `await loadRoute(true)`，保留清除恢复标记 | `UI_RECONNECT_READ: first successful progress re-reads missing trends and leaves no failed-read error` | `9b09bc8991382fd6c2e3836e970d7567e5c534b8c8d467e6481fbadb8c2c84e9` |
| nc3 | `views/cleaning.mjs` 清理卡片中将 `stopNote(state)` 改为 `null` | `UI_CLEAN_STOP: clean_stop failure is below the cleaning stop button, outside the notice` | `6a007e3491f2a9162cfe511fee5e2f1656535c24b295f41885b9c7b1cac6733b` |

三次恢复绿及所有 final 的聚合 `productionHash` 都是 `84f00e098770c2bf38ba5898022038e1cd9965c64145673cf867c3ebd2fea681`，`testHash` 都是 `570b72059ab0cae3f0acc7169552ec2d56ffc3974a931feee3bbcfd1657a7ecb`。最终 `test --final` 的 `proofAudit` 按序绑定上表三对红/绿回执。

## 逐张看图

两套通过运行的 26 张图均已逐张查看，共 52 张，未修改图像字节。目录为：

- 初次通过：`docs/acceptance/wave6/i3/screenshots/2026-10-28T09-53-30.738Z-20208/`。
- final：`docs/acceptance/wave6/i3/screenshots/2026-10-28T09-58-41.970Z-5692/`。

下表逐一记录两套同名图的共同内容；水面与轮询截图可能处于不同动画帧，布局和状态结论一致。白色磨砂、墨色冰山、脉搏线导航、字号与纯色强调保持既有设计；没有改样式表或图标。

另逐张对照了设计目录 `previews/` 的 home、scan、results、detail、confirm、done、trends、locations 八张参考图，以及 `brand/preview-home-pulse-1240x820.png`。卡片、水环、主数字、浮坞、抽屉和危险确认的视觉结构延续参考；实际体量和条目数取 fixture（例如结果 31.2 GB，静态稿 31.7 GB），不抄静态稿数字。旧 previews 的水滴按设计第 10 节由墨色冰山和脉搏线取代，当前品牌参考与实际首页一致。实际清单较长、确认列表可滚动，设计稿的外框、顶部样稿导航和系统窗口按钮不属于这次浏览器内容截图。

| 文件名 | 实际看到的内容 |
|---|---|
| `home-1240x820.png` | 系统盘 59.8 GB 可用，D/E/F 条形磁盘卡、蓝色开始体检球、未体检说明；侧栏与系统盘说明没有短孤行。 |
| `scan-1240x820.png` | 水环 27.5 GB / 62%，前三类完成、应用更新正在扫描；停止扫描按钮可见。 |
| `results-1240x820.png` | 主数字 31.2 GB，总识别 53.5 GB，洞察、级别过滤、AI 分组与悬浮操作坞；数据由既有 fixture 提供。 |
| `results-1040x720.png` | 窄窗口仍有完整指标、过滤、列表与操作坞，无横向裁切。中途列表从浮坞后经过属于原有布局。 |
| `detail-1240x820.png` | Codex 插件市场残留抽屉，占用 3.6 GB、69,947 文件，三段解释与增长说明，背景模糊，Esc 关闭入口可见。 |
| `confirm-1240x820.png` | 永久删除 31.2 GB，13 组 / 2,250 项、分盘量与占用跳过说明；红色不可恢复警告和带体量的确认按钮完整可读。 |
| `cleaning-1240x820.png` | 已释放 4.2 GB、第 1/13 组、3/2,250 项，右侧停止按钮，无停止失败说明。 |
| `done-1240x820.png` | 实际释放 30.7 GB 与预计 31.2 GB 区分，C/F 水位瓶显示前后量，Chrome 部分完成并说明 6 个配置跳过。 |
| `trends-1240x820.png` | 5 次体检曲线、增长榜、已停止疑似泄漏卡与修复建议，蓝线及橙色说明保持原样。 |
| `history-1240x820.png` | 一条清理完成 30.7 GB，随后两条体检记录 31.2/14.2 GB，按时间倒序；清理是勾、体检是脉搏线，无水滴。此图为未展开列表，缺失详情补读由浏览器断言验证。 |
| `locations-1240x820.png` | 七类开关与自定义文件夹，崩溃与日志关闭；保护说明及浏览器登录数据保护文案可读。路径只是 fixture 显示文字。 |
| `about-1240x820.png` | 墨色冰山、0.1.0，以及读取、不读取、本地数据、用户确认四块说明；不可恢复措辞保持。 |
| `results-bottom-1240x820.png` | 长列表滚到底，三条未识别项全部在浮坞上方；实测最后一行到坞间隔 65.625px。 |
| `results-bottom-1040x720.png` | 窄窗口同样滚到底，未识别末行完整，间隔 66px，均超过 16px 原锁定值。 |
| `notice-results-1240x820.png` | 结果页提示条原样显示 M1 假宿主返回的那句提示，关闭入口可见。 |
| `notice-trends-1240x820.png` | 切趋势后 M1 提示消失，趋势正文及图表正常，没有结果页旧错误。 |
| `trends-empty-1240x820.png` | 墨色冰山空态，“再体检一次就能看到变化”，没有伪造曲线。 |
| `paused-1240x820.png` | 清理页仍显示已释放量与停止按钮；提示条是暂停原因及重新连接按钮，未点停止时没有停止失败行。 |
| `reconnecting-1240x820.png` | 扫描继续保留，顶部只有“正在重新连接 Water 服务…”；没有旧停止错误。 |
| `stop-failed-1240x820.png` | 扫描停止按钮下方红字完整，提示条只有“Water 服务暂时不可用。”与重新连接，红字不混进提示条。 |
| `clean-stop-failed-1240x820.png` | 新增图：清理卡片停止按钮下的原句完整、没有遮挡；上方只显示“未能确认清理状态，请重新连接。”及重新连接按钮。 |
| `stale-1240x820.png` | 滚动结果页顶部过期提示条只有一份该句，没有正文重复的半行过期文字；清理所选禁用。原有 sticky 提示条仍可覆盖经过它的过滤区域，本票没有改全局布局。 |
| `loading-1240x820.png` | 中性“正在读取…”与冰山，尚未返回宿主时没有错误态。 |
| `home-last-scan-1240x820.png` | 系统盘水瓶的浅绿可释放层、增长洞察和上次体检卡；查看结果入口可见。 |
| `busy-1240x820.png` | 显示“正在进行另一项任务，请稍候。”；截图现有滚动位置下 sticky 提示条叠在首页标题前面，本票未改这种全局滚动外观，不能据此宣称所有页面正文都永不遮挡。 |
| `unavailable-1240x820.png` | 顶部无法连接提示，页面为无法连接空态及重新连接按钮，未伪装为已连接或空白崩溃。 |

## 边界与未验证

- 执行者验证范围为 Windows 上单个私有 headless Chrome、测试内 IPC 假宿主；每次运行串行并由测试 after 关闭浏览器与 loopback 服务，所有测试进程已退出。原生 Water 窗口 0、系统选择框 0。
- 未调用真实宿主，未扫描真实用户位置、未读真实文件内容、未清理真实数据；没有运行 Cargo/Tauri、联网、下载或安装依赖。
- IPC 模块、契约、fixture、tokens、其它样式、图标、11 处冻结文字、停止失败句子和单元测试均未改变。只有工单允许的等待调用改写和新增覆盖，原有行为断言未删除或降级。
- 没有验证真实服务重连、原生关闭流程、生产竞态、macOS 或真实辅助技术的发声效果；live region 验证的是 DOM 清空再写的顺序。
- 没有运行总控另行计划的“去掉正在重连文字”变异；本票仅运行指定 nc1/nc2/nc3。最终有效负控均无超时，不将早期测试复位的 CDP 失败算作负控。
- 首页 busy 提示条与滚动标题的既有叠加如上表记录；本票按第 5 条只消除结果页同句过期正文重复，未扩展为提示条全局布局重做。
- 本报告和证据提交后停止本票修改与测试，交总控验收。
