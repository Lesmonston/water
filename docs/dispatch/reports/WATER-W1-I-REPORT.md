WATER-W1-I 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/i/docs/dispatch/reports/WATER-W1-I-REPORT.md

## 身份与范围

- 票：`WATER-W1-I`，权威票 `docs/dispatch/tickets/WATER-W1-I-REPORT-READER-20261017.md`
- 工作树 / 分支：`F:/new/smaltalk/water/.worktrees/i` / `worker/water-w1-i`
- 基线：`045ab4f0d01edd573828fbc8cca988e1ad37efee`（`water-w1-parallel-next-base-20261017`）
- 受测实现 SHA：`8888c26a92ca8f503e63d486d243faa09612042e`
- 实际模型：Cursor Grok 4.7
- 只读辅助：未使用。没有再分派实现者。
- 本回执提交只增加报告和证据，不改受测产品。

开工时 HEAD 等于基线，工作树干净，36 项新冻结与五份旧锁由 helper 核对通过。产品只改 `prototypes/report-reader/` 下八个允许文件。没有改 A–H、根 Cargo、旧 helper、冻结锁、上游或主线登记。

## 逐项需求

| 需求 | 结果 |
|---|---|
| `assertReportView` / `selectFindings` / `formatBytes` / `summarizeView` | 已实现。非法视图与非法字节抛出固定 `Unsupported report view.`，不回显输入 |
| 四份整报告切换 | 默认 `composite_partial`。切换更新 findings、scopes、status、issues、totals |
| 状态、覆盖、问题、来源总量 | 来源方法与精确逻辑字节单独显示，并标明非本页求和 |
| 五项组合筛选与三种排序 | query 为小写字面包含；scope/tool/category/risk 精确 AND；未知大小排在末尾 |
| BigInt | 大小比较与格式化只用 BigInt。`2^53` 与 `2^53+1` 按整数先后，格式都显示 `8 PiB` |
| 来源 37 | `composite_partial` 的来源 `logical_bytes` 保持 `"37"`，不按行相加，null 不当作 0 |
| 工具键与 scope | 筛选值 `all` 不限。`tool:all`、`no_tool`、`tool:no_tool` 按筛选键精确匹配，不与 scope 混用 |
| low / review / high / protected | 四个风险、四种 activity、五种 recoverability 分别显示 |
| 取消报告 | `cancelled` 仍保留原 finding，不把事实清成空报告 |
| 详情 | 原生 dialog。Enter 打开，Esc 或关闭按钮把焦点还给触发按钮。路径、scope、source_tool、size、evidence_items、references、保护原因、rule_version 以文本呈现 |
| 文本安全 | 动态文本走 `textContent`。路径不是链接。没有文件输入、外部字体、图片或网络资源 |
| 服务 | `startServer` 只监听 `127.0.0.1`。精确五条路由，Host 必须为当前 loopback 与端口，GET/HEAD，错误 Host 403，其它方法 405，其余路径 404 `Report resource unavailable.`。CSP 按票面字符串，`nosniff`，无 CORS。import 不监听 |
| 数据 | `/reports.json` 映射本树 `contracts/report-reader-v1/reports.json`，没有另建产品副本 |

## 命令与最终回执

Node `v24.16.0`。baseline 在实现前通过：`F:/new/smaltalk/water/.worktrees/i/.local/checks/WATER-W1-I/2026-10-17T14-14-52.754Z-18688-baseline-result.json`（4 份报告，空白页探针，`newProductTested: false`）。

同一受测 SHA 上串行 `--final`，退出码都是 0，前后工作树干净：

| 门 | 结果 | receipt |
|---|---|---|
| check | passed，语法检查 | `F:/new/smaltalk/water/.worktrees/i/.local/checks/WATER-W1-I/2026-10-17T14-38-34.429Z-32796-check-result.json` |
| test | passed，3/3 | `F:/new/smaltalk/water/.worktrees/i/.local/checks/WATER-W1-I/2026-10-17T14-39-30.337Z-18852-test-result.json` |
| browser | passed，2/2 | `F:/new/smaltalk/water/.worktrees/i/.local/checks/WATER-W1-I/2026-10-17T14-39-53.768Z-18124-browser-result.json` |

五测试名称为 `reader_input_and_preservation`、`reader_bigint_filters`、`reader_totals_and_unknown`、`reader_live_interactions`、`reader_scope_layout_and_readonly`。没有 skip、todo 或失败留存。

最终日志与三张截图副本已按原字节复制到 `docs/acceptance/wave1/i/`，共 34 个文件，与 `.local/checks/WATER-W1-I` 中对应文件 SHA-256 一致。截图：

- `2026-10-17T14-39-53.768Z-18124-reader-1440x1000.png`，87198 字节，`3b48934dc90080b40d2d80c1a31cbe9d57e1a3f2b256643eb0f0f4e10f025418`
- `2026-10-17T14-39-53.768Z-18124-reader-900x800.png`，43949 字节，`5f50ae5c283e03325cc9f839789f8d87305cac93a6b49b9905bc9a2d742f4131`
- `2026-10-17T14-39-53.768Z-18124-reader-detail.png`，114306 字节，`444ea9009a6222664ec3d48a4123fb20435d2cb4774edf212c5cf2c4c487b0e5`

## 实看截图

看的是最终 browser 门写入 `.local/browser-lab/` 的三张图，也就是上面归档的原字节。

- 1440×1000：顶栏右侧有「合成报告 · 只读」。默认组合报告。摘要为 8 条、4 条保护、来源总量 `37 B`，方法 `file_identity_deduplicated` 单独一行，「非本页求和」完整一行，精确逻辑字节 37。覆盖为未完整，scope-1 partial、scope-2 complete。状态 `partial`，问题为 `permission_denied`。搜索、scope、工具键、类别、风险和重置在同一行。列表前几行能读：Unicode 路径与 `%2e%2e/<tag>` 是文本；protected、review、high 颜色分开；大小为 `15.9 EiB` 与 `8 PiB`。没有横向滚动条，也没有破损图片。
- 900×800：只读标识、标题、`37 B`、「非本页求和」、状态和问题都在首屏。搜索框可见，scope 与工具键在视口下沿，更下面的筛选和条目需要纵向滚动。没有横向溢出或右侧被裁切。
- 详情：右侧抽屉。路径 `project/模型 %2e%2e/<tag>` 在文本框里。`<script>literal text</script>` 与 Unicode 句子按字面显示，没有变成图片或脚本。精确字节 `18446744073709551615`、source_tool、scope、保护原因和 rule_version 可见。抽屉盖住背后列表的右缘和风险筛选的一部分，这是叠层，主页面没有横向滚动条。长文本在抽屉内换行。

## 负控与恢复

每项都跑完三个模型测试和两个浏览器测试，再按原字节写回并复跑五测。恢复后两次 SHA-256 相同，五测退出码 0。没有用缺文件、语法错误或超时充当红。

| 负控 | 原 / 坏 / 恢复 SHA-256 | 红断言 | 恢复 |
|---|---|---|---|
| `model.mjs` 大小比较由 BigInt 改为 Number | `bf97d16fc5c770f467e69192f3f156f0c1d1559f6b2801cdde754aa4dd3db859` / `ac7402da7cc09867a96985b645d5bb74750675422c72354d6b156b0efd3c95b3` / 同原值 | `reader_bigint_filters` 与 `reader_live_interactions`：`2^53 must sort before 2^53+1` | 五测绿 |
| `summarizeView` 改为逐行求和，null 计为 0，未知计数改为 0；和超出 u64 时来源逻辑字节写成 `0` | 同一 `model.mjs` 原值 / `d1017161306d7cf8110408b13bc851c5fbb518a4141dd7fcbff9cd987803d44e` / 同原值 | `reader_totals_and_unknown` 断言失败；`reader_live_interactions` 未匹配 `/37/`，页面来源总量变为 `0 B`、精确逻辑字节 `0` | 五测绿 |
| `app.mjs` 动态文本由 `textContent` 改为 `innerHTML` | `a3240d710bad316ccb59d7600e17038bc2c504aee7dcecd0fd58dce0ef085e2f` / `e97354332c7a6c031a5f6841c07856ad046e221d5605f1b5f310f4dcc86b201e` / 同原值 | 两个浏览器测试：HTML 字面创建了 img 或 script 元素。模型测试仍绿，因为它们不渲染 DOM | 五测绿 |

## 失败与未验证

最终 check、test、browser 没有失败。负控中的红是临时改坏后的目标断言，恢复后已重新通过。

未验证：macOS、正式桌面壳、Tauri/IPC、真实用户目录，以及 F 扫描器的真实输出。当前四份报告是总控用真实 E `project_json` 生成的合成视图。本票通过不等于真实扫描或桌面阅读已完成。没有 push、merge、rebase 或发布。
