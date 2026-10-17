# WATER-W1-B：工具发现与保护规则数据包

归档状态（2026-10-18）：本票及所绑补单已完成并VERIFIED（Windows范围），不再外贴。下文“返工/待外贴/首次起点”均为历史；当前以[验收报告](../../acceptance/wave1/controller/WATER-W1-BC-ADDENDUM-01-REVIEW-20261017.md)和主manifest为准。

总控：Codex。独立并行票，用户安排模型。当前状态以主检出wave1 manifest为准；不依赖A实现，也不读取A在途代码。

2026-10-17收单后，原门总控复跑通过，独立构造数组边界失败，当前CHANGES_REQUESTED；续做以[补充单01](WATER-W1-B-ADDENDUM-01-20261017.md)的起点/范围/新回执为准，其余冻结规则不变。

| 项 | 值 |
|---|---|
| 权威票面 | `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-B-CATALOG-20261017.md` |
| 工作树/分支 | `F:/new/smaltalk/water/.worktrees/b` / `worker/water-w1-b` |
| 精确基线 | `e92f39647c91d9ce077d592583c3352626d3402b`，tag `water-w1-parallel-base-20261017` |
| 协议/冻结锁 | `contracts/catalog-v1/` / `contracts/parallel-v1/freeze.lock.json`，只读 |
| 权威manifest | `F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json` 的本票任务级字段 |
| helper/纪律 | `scripts/parallel-check.mjs` / `docs/dispatch/PARALLEL-WORKER-RULES.md` |
| 报告 | `F:/new/smaltalk/water/.worktrees/b/docs/dispatch/reports/WATER-W1-B-REPORT.md` |
| 证据 | 本树`docs/acceptance/wave1/b/`；日志在`.local/checks/WATER-W1-B/` |

## 开工

先读AGENTS、总控工作流、ADR-003、本票、PARALLEL-WORKER-RULES、catalog-v1全部协议/Schema/source-policy、原始调研中对应工具资料。权威票/manifest在主检出，只读即可，不merge取票，不改分支。旧STATUS不代表当前全项目只有A。

在本工作树运行：

```powershell
node scripts/parallel-check.mjs --task WATER-W1-B --mode baseline
```

要求本树精确基线、分支正确、干净、冻结材料一致、Node24，且本票产物目录尚不存在。失败写受阻回执，不自行改helper或重新同步工作树。

## 交付

1. `packages/tool-catalog/index.json`及6个entries：pip、uv、npm、pnpm、huggingface、ollama。每项分Windows/macOS，字段、约束、来源按冻结SPEC/Schema；至少两条不同官方页面支撑每工具，实际打开核对并保留简明事实对照证据。
2. 数据只描述发现候选、版本边界、共享引用和受保护资产。默认路径只是提示；HF_HOME的token、模型唯一性、uv缓存协议、pnpm共享store等边界必须落实，不能把整根目录变成可删清单。
3. `validate.mjs`导出冻结的纯`validateCatalog(index,entries)`，不import时读取文件/环境，不执行工具、不联网、不使用eval或任意shell。拒绝未知/缺字段、不完整工具/平台、无效来源引用和能力提升；官方域名按source-policy精确匹配。
4. README说明数据版本、适用/未知边界、来源事实与产品建议分离、校验用法与未实测。没有来源证明的能力不标支持，runtime_verified始终false。

## 唯一文件范围

- `packages/tool-catalog/index.json`、`entries/`内6个指定JSON、`validate.mjs`、`tests/catalog.test.mjs`、README。
- 本票REPORT和`docs/acceptance/wave1/b/`的文本/JSON证据。

禁止改A/C树、根Cargo/锁/package.json、任何contracts、总控脚本/台账、其他项目和上游代码。没有新依赖、包安装、扫描/清理或真实目录解析权限。人工浏览官方文档获授权，校验/测试过程禁止联网。

## 五个测试

在`packages/tool-catalog/tests/catalog.test.mjs`使用Node内置test，精确五个顶层测试名：

- `catalog_shape_and_tools`：完整6工具与index正确。
- `catalog_platforms_and_sources`：两平台齐全、至少两页面、source引用与域名；包含lookalike主机名拒绝。
- `catalog_protection_boundaries`：HF混合根、模型资产等说明存在；can_scan/can_delete=false、discovery_only=true、display_only、runtime_verified=false不可提升。
- `catalog_mutation_rejections`：SPEC至少12种内存变体逐项拒绝，并核对适当错误码/字段位置；不得改实际数据文件造错。
- `catalog_purity`：输入深度冻结，校验前后不变；没有环境依赖/网络请求，重复调用结果一致。不要扫描HOME来证明纯度。

先留目标断言红再实现。负控三项：去掉未知字段拒绝、去掉source_ids有效性检查、允许can_delete=true，各自应命中对应真实断言；原字节/哈希恢复，不造测试开关。

## 检查与提交

只用：

```powershell
node scripts/parallel-check.mjs --task WATER-W1-B --mode check
node scripts/parallel-check.mjs --task WATER-W1-B --mode test
```

helper语法检查只点名validate.mjs与测试文件；test核对五个实际测试名、5 passed且0 skipped/todo/cancelled。source核对是人工证据，不以离线校验通过冒充事实已证明。

实现/证据提交后，干净树再运行check/test并加`--final`。报告补记可以另做纯文档提交，列受测实现完整SHA、命令/退出码/日志、12种变体、三项负控和恢复哈希、来源事实表、未验证平台及实际模型。显式git add，本分支提交，禁止push/merge/rebase和批量add。

无Git身份时可用单命令Water Worker (external)/water-worker@localhost，禁改global。报告和对话首句：`WATER-W1-B 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/b/docs/dispatch/reports/WATER-W1-B-REPORT.md`，受阻改“任务受阻”。回执后停止，等待总控验收。
