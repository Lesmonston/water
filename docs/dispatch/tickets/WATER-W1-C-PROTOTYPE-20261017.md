# WATER-W1-C：只读桌面交互原型

总控：Codex。独立并行票，用户安排模型。只做示例数据原型，不依赖A的Rust输出或B未完成的catalog。

2026-10-17收单后，总控复跑原门并查看截图，独立模型名称排序边界失败，当前CHANGES_REQUESTED；续做以[补充单01](WATER-W1-C-ADDENDUM-01-20261017.md)的起点/范围/新回执为准，其余冻结规则不变。

| 项 | 值 |
|---|---|
| 权威票面 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-C-PROTOTYPE-20261017.md` |
| 工作树/分支 | `F:/new/smaltalk/water/.worktrees/c` / `worker/water-w1-c` |
| 精确基线 | `e92f39647c91d9ce077d592583c3352626d3402b`，tag `water-w1-parallel-base-20261017` |
| 协议/冻结锁 | `contracts/prototype-v1/SPEC.md`、`demo-data.json` / `contracts/parallel-v1/freeze.lock.json` |
| helper/纪律 | `scripts/parallel-check.mjs`、`scripts/browser-lab.mjs` / `docs/dispatch/PARALLEL-WORKER-RULES.md` |
| 报告 | `F:/new/smaltalk/water/.worktrees/c/docs/dispatch/reports/WATER-W1-C-REPORT.md` |
| 证据 | 本树`docs/acceptance/wave1/c/`；测试截图先写`.local/browser-lab/` |

## 开工

先读AGENTS、总控工作流、ADR-003、本票、PARALLEL-WORKER-RULES及prototype-v1冻结材料。不要使用A专属Rust helper，不改Rust协议、目录或冻结文件，不merge主线取票。

```powershell
node scripts/parallel-check.mjs --task WATER-W1-C --mode baseline
node scripts/browser-lab.mjs
```

baseline核对本树/分支/精确SHA/洁净/Node24/冻结材料；browser-lab只启动既有Chrome的新隔离profile作空白探针，已经由总控试过，不是原型UI验收。失败报告总控，不装浏览器或npm包。

## 要实现的原型

交付一页可交互的桌面工具界面：示例总览、搜索、工具/类别/风险组合筛选、按大小/名称排序、占用列表与详情面板；支持空结果、重置、partial/cancelled状态选择与提示。

页面持续显示“示例数据 · 只读演示”。8条冻结虚构finding覆盖包缓存、模型、历史、向量库、未知容量和大整数边界。演示fixture使用water.prototype.v1展示形状，不是A的ScanReport输出；不要求真实后端，不因未接Rust受阻。

逻辑大小必须标明口径；未知显示“未知”，不当0B。总览不累加可能重叠/共享项，保留“待去重/未估算”，不显示虚假的已释放量。所有操作都是查看、筛选、切换示例；没有可执行的清理/删除/迁移/扫描目录/上传入口。

视觉是清晰、可信、适度密度的开发工具。没有营销hero或价格区，无大面积光效/水波/玻璃；系统字体、少量强调色、明确层级与对齐，风险以文字表达，控件有label和可见焦点。不要为了“精致”牺牲列表可读性。不套用明确不适用dashboard的落地页技能。

按SPEC的真实data-testid接线。详情可键盘打开，Esc关闭并回焦触发按钮；用安全DOM处理文本。浏览器CSP/资源必须限制为本地，不用外部字体、图片、图标、脚本、分析或CDN。

## 唯一文件范围

`prototypes/readonly-dashboard/`内：index.html、styles.css、app.mjs、model.mjs、server.mjs、demo-data.json（与冻结fixture同值）、tests/model.test.mjs、tests/browser.test.mjs、README。允许自建目录，禁止其他包/可执行文件/vendor依赖。

另可写本票REPORT及`docs/acceptance/wave1/c/`的PNG/文本/JSON证据。禁止改根Cargo/锁/package.json、contracts、总控脚本、A/B树、研究上游或全局环境。不得读取真实HOME、选择用户目录、调用扫描/清理/API/模型服务。

## 模型与服务接口

- model.mjs按SPEC实现selectFindings、formatBytes、summarize纯函数，保持输入不变。大整数排序用BigInt，null始终末尾；必须验证size_asc时边界B排在边界A前，不能只测desc导致Number精度缺陷漏过。
- server.mjs只用Node内置HTTP与fs，导出startServer({port:0})，仅绑定127.0.0.1并只提供原型目录，返回{url,close}，close可await。拒绝目录穿越，不暴露仓库根、环境、源码之外目录或目录列表。
- README给出启动与停止演示方法，但验收进程必须自己关闭，不后台常驻、不启动用户普通浏览器。测试使用本树.local隔离profile，无--no-sandbox，不下载浏览器。

## 定向验证

model.test.mjs精确5个顶层Node测试名：prototype_bigint_order、prototype_filters、prototype_format_and_unknown、prototype_no_mutation、prototype_no_false_reclaim。覆盖大小双向和等值稳定、全部组合筛选、搜索不是regex、null/0/大字节格式、冻结输入不修改、summary两项空间均null。

browser.test.mjs精确2个顶层测试名：prototype_live_interactions、prototype_scope_and_layout。import冻结openBrowser，启动自己的临时server，try/finally关闭二者。真正浏览器操作搜索、筛选、大小排序、详情与Esc回焦、空状态及重置、partial/cancelled切换；检查没有横向溢出和真实清理入口，HTTP服务不能读取仓库父目录。

1440×1000和900×800分别截图，写`.local/browser-lab/`；**最终门后**复制到证据目录并提交，不让测试改脏受测源码树。必须实际查看截图，描述实际画面而非预期；无法视觉检查如实记录，不能假装看过。不要把Windows Chrome演示说成macOS/Tauri实机验证。

```powershell
node scripts/parallel-check.mjs --task WATER-W1-C --mode check
node scripts/parallel-check.mjs --task WATER-W1-C --mode test
node scripts/parallel-check.mjs --task WATER-W1-C --mode browser
```

helper只做点名语法与Node目标，不安装依赖。test要求5 passed，browser要求2 passed，均0 skipped/todo/cancelled。先留有效行为红，再实现。负控3项：BigInt排序改Number应让asc边界断言红、原地sort应让不修改输入断言红、summary伪造回收字节应让null断言红；逐项真正逻辑、哈希和原字节恢复，不植入开关。

## 提交与回执

实现提交后，干净树依次check/test/browser并加--final；测试日志和截图在.local不提交，之后复制选定证据与报告做纯文档收尾提交，绑定完整受测SHA。不改冻结协议/检查器、不push/merge/rebase、不批量add。

报告写：实现与需求逐项、5+2测试与真实DOM结果、截图实际查看结论、截图/日志路径、3项负控及恢复哈希、静态服务边界、原型假设/未验证平台、实际模型。缺Git身份可用单命令Water Worker (external)/water-worker@localhost，不改global。

报告和对话首句：`WATER-W1-C 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/c/docs/dispatch/reports/WATER-W1-C-REPORT.md`，受阻改“任务受阻”。完成后停止，等总控源码/交互/视觉独立验收。
