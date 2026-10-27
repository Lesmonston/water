WATER-W4-G7 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w4-g7/docs/dispatch/reports/WATER-W4-G7-REPORT.md

# WATER-W4-G7 执行回执

- 实际模型：Codex GPT-6。
- 首次 HEAD：`4f35c52f5abb3dee22583cc2c86b05da2fc2be93`，工作树 `worker/water-w4-g7` 干净；实现提交：`4e308174b51d6427b68c5b2d6462ef014693a38c`。
- 本票只改 `apps/water/ui/app.mjs` 和 `apps/water/ui/tests/browser.test.mjs`；没有改 IPC、fixture、token、样式或图标。UI-POLISH 第 1 节 11 处冻结文字未改。

## 七项对照

1. 命令捕获发出时的路由版本与 hash；异步失败时只有仍在原页面才调用 `fault`，因此旧页面的错误和 stale 副作用不会落到新页面。`clean_start` 的专门 catch 改为向同一作用域判断抛出保留重试说明的错误。测试延迟 `clean_prepare` 的 stale 错误，真实点击切到趋势、释放失败并回结果页，以 `UI_COMMAND_SCOPE` 检查提示和 stale 状态。
2. 暂停原因单独保存在 `pauseReason`，提示条优先显示该原因与重连按钮。暂停期间发出或返回的普通命令错误不写入提示和状态；路由读取的错误也遵守相同规则。测试在扫描暂停时令停止命令失败，切换页面并恢复，验证暂停原因不变且错误不复现。
3. 在真实 DOM 检查 `#sprite symbol#i-berg` 和 `#sprite symbol#i-pulse`，标记 `UI_BRAND_MARK`，原始 symbol 文本检查保留。
4. 有记录的历史页检查没有任何水滴 use，并检查体检记录行引用 `#i-pulse`，标记 `UI_BRAND_MARK`。
5. 四处等待重连消失或提示隐藏改成 200 次、每次 25ms 的有界查询，最终使用 `UI_NOTICE_SCOPE` 断言原判定条件；保留此前已有的有界恢复检查。
6. 假宿主第一次 progress 返回失败，后续 progress 等待测试显式放行；只消耗一次失败，不触及 20 次暂停阈值。生产代码没有测试开关。
7. 先前暂停截图改名 `paused-1240x820`；重连期间另拍 `reconnecting-1240x820`。

## 检查记录

命令均从本工作树运行，检查入口为 `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W4-G7`：

- `--mode baseline`：通过（09:51:58 UTC；环境原有 08:26 baseline 也由归档保留）。
- `--mode check`、`--mode test`：通过；单元 3/3。
- 首次 `--mode browser`：失败，新增暂停测试尚在趋势页时点击只在体检页存在的停止按钮，浏览器表达式失败；随后增加返回体检页，重新 `--mode browser` 通过 5/5。失败日志与原样源码快照保留在归档。
- `--mode red-nc1`、`red-nc2`、`red-nc3`：均通过有效负控判定；每次立即 checkout 恢复对应生产文件后运行 `--mode test`，三次均通过 3/3。
- 实现提交干净状态下依次 `--mode check --final`、`--mode test --final`、`--mode browser --final` 均通过；单元 3/3、浏览器 5/5。
- `--mode archive`：通过，证据及通过的两次浏览器截图原样归档，索引见 `docs/acceptance/wave4/g7/ARCHIVE.json`。

## 负控

- nc1：在 `run` 的错误处理去掉路由版本/hash 判断。浏览器以 `UI_COMMAND_SCOPE: delayed old-page failure cannot show on the new page` 失败；恢复 `app.mjs` SHA-256 `156eb2f076743bc63452c4c5581dce714d26e3d9075e5ff545ec2bcddb377d56`。
- nc2：在 `reconnectProgress` 中开始重连后留下一个普通错误，令恢复后的提示不隐藏。浏览器以 `UI_NOTICE_SCOPE: paused notice clears after reconnect` 失败；恢复 `app.mjs` SHA-256 同上。
- nc3：`views/history.mjs` 的体检记录图标 `pulse` 改成 `drop`。浏览器以 `UI_BRAND_MARK: populated history: the retired drop is neither in the sprite nor referenced` 失败；恢复该文件 SHA-256 `5a43a1c27decdecc01804d481bbc161a121ec5bff62134a3b938081034b48c76`。
- 三条日志都没有超时，且只改变生产代码各一处，不改测试。

## 截图逐项审阅

最终运行目录为 `screenshots/2026-10-27T10-05-27.841Z-34124/`。既有测试实际每次产生 24 张（包含工单所列 19 张及原测试另外 5 张）；两次通过运行均由 archive 保留。最终 24 张逐一查看；较早一组中 16 张 SHA-256 与最终组相同，另 8 张也逐张查看，呈现同样页面与状态。截图均为假宿主数据。

- `about-1240x820`：关于页冰山品牌、读取和隐私说明。
- `busy-1240x820`：首页顶部显示任务忙提示及关闭入口。
- `cleaning-1240x820`：清理中水位环、当前组与停止按钮。
- `confirm-1240x820`：居中确认框、清理列表和不可恢复警告。
- `detail-1240x820`：右侧分组详情与背景遮罩。
- `done-1240x820`：完成页释放量、磁盘水位和结果清单。
- `history-1240x820`：三条记录，清理完成行勾号、两条体检记录行脉搏线，无水滴。
- `home-1240x820`：未体检首页、磁盘水位与开始按钮。
- `home-last-scan-1240x820`：首页上次结果及增长提示。
- `loading-1240x820`：读取中空态与冰山。
- `locations-1240x820`：分类开关和自定义文件夹列表。
- `notice-results-1240x820`：结果页顶栏显示 M1 原文及关闭提示；滚动内容位于提示条后方。
- `notice-trends-1240x820`：切至增长趋势后无旧提示，折线和增长榜可见。
- `paused-1240x820`：清理进度暂停，显示宿主原因“Water 服务暂时不可用。”及“重新连接”按钮。
- `reconnecting-1240x820`：扫描中顶部显示“正在重新连接 Water 服务…”，没有暂停按钮。
- `results-1040x720`：窄窗口结果页、分组与操作坞。
- `results-1240x820`：结果总量、分级、分组与操作坞。
- `results-bottom-1040x720`：长列表底部末行与操作坞有留白。
- `results-bottom-1240x820`：长列表底部末行与操作坞有留白；测试测量两尺寸间隙约 66px。
- `scan-1240x820`：扫描进度环、分类进度及停止扫描。
- `stale-1240x820`：过期提示及禁用的清理按钮。
- `trends-1240x820`：可用空间折线、增长榜和疑似泄漏说明。
- `trends-empty-1240x820`：趋势空态与冰山。
- `unavailable-1240x820`：无法连接服务的提示及重连入口。

## 范围与未验证

仅执行单个私有 headless Chrome、loopback 假宿主与冻结夹具；没有原生窗口、选择框、真实用户位置扫描、联网或下载，也没有实际清理。未验证真实宿主 IPC、Windows 原生窗口、macOS 或生产竞态；本回执为执行者交付，尚待总控验收。
