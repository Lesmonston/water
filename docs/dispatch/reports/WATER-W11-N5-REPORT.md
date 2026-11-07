WATER-W11-N5 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w11-n5/docs/dispatch/reports/WATER-W11-N5-REPORT.md

- 实际模型：Codex（GPT-6；会话未提供更细型号）。未使用子代理。
- 基线：`ccc584b3894e28d1f6bb8f86748d03c143a38e5b`；工作树：`F:/new/smaltalk/water/.worktrees/w11-n5`；分支：`worker/water-w11-n5`。
- 干净实现提交：`46fc5b5bfd51fb6e656cd6717430668fd1237633`。全部 final 均绑定此提交；后续只提交本回执和检查器生成的证据。
- 本单为执行者交付，尚待总控独立验收与合入。

## 工单逐项对照

- scan.rs 的 Engine::listing 在 include_quarantine 为 false 时同时过滤新旧隔离目录；ignored_root 的任意路径段判断也同时识别两者，均不区分 ASCII 大小写。
- scan/streaming.rs 的 declared 判断与声明位置上报均识别两个声明名，仍只用已有目录清单与 Kind::File，不读内容。最终列表继续按 ASCII 小写路径排序、去重和截断 256，因此同一目录 Flick 在 Water 前。
- 全 src 搜索只找到上述四处名称判断；没有其他只认旧名称的分支。README 补齐双名称兼容、声明顺序与空间概览行为，产品文案 Water 改为 Flick。
- 新断言均在既有 scan_v1.rs 五测试里，带 SCAN_W11_RENAME。覆盖规范/混合大小写隔离名、不进入/不命中/不成簇、visited_entries 只多一、发现根与其后代被静默跳过；空间概览继续计入两个名字。
- scan_full 真实公开入口覆盖无声明、旧声明、新声明、混合大小写新声明、双声明五种合成情形；双声明精确按新在前输出；有声明时从十个候选中排除一个，无声明对照仍成簇。声明用非 JSON 内容并持有独占句柄，证明识别位置与簇保护无需读取内容。
- 公开接口、类型、字段、枚举、依赖、Cargo.lock 和系统函数不变。

## 检查命令与结果

每行命令均为 `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W11-N5 --mode <模式> [--final]`；通过为检查器退出 0。负控通过表示产品测试退出 101 且命中指定标记；没有编译错误或超时造红。

| 模式 | 结果 | 回执 / 日志索引 |
|---|---|---|
| `baseline` | passed | `docs/acceptance/wave11/n5/receipts/2026-11-07T06-42-30.136Z-23268-baseline-result.json` |
| `baseline` | passed | `docs/acceptance/wave11/n5/receipts/2026-11-07T06-44-00.871Z-10392-baseline-result.json` |
| `baseline` | passed | `docs/acceptance/wave11/n5/receipts/2026-11-07T06-58-38.696Z-34224-baseline-result.json` |
| `test` | failed | `docs/acceptance/wave11/n5/receipts/2026-11-07T07-00-26.635Z-16396-test-result.json` |
| `test` | failed | `docs/acceptance/wave11/n5/receipts/2026-11-07T07-01-30.969Z-32124-test-result.json` |
| `test` | passed | `docs/acceptance/wave11/n5/receipts/2026-11-07T07-01-49.571Z-37808-test-result.json` |
| `lock` | passed | `docs/acceptance/wave11/n5/receipts/2026-11-07T07-02-49.132Z-31044-lock-result.json` |
| `check` | passed | `docs/acceptance/wave11/n5/receipts/2026-11-07T07-02-52.412Z-29612-check-result.json` |
| `red-nc1` | passed | `docs/acceptance/wave11/n5/receipts/2026-11-07T07-03-18.414Z-31048-red-nc1-result.json` |
| `test` | passed | `docs/acceptance/wave11/n5/receipts/2026-11-07T07-03-35.060Z-36192-test-result.json` |
| `red-nc2` | passed | `docs/acceptance/wave11/n5/receipts/2026-11-07T07-04-03.276Z-33312-red-nc2-result.json` |
| `test` | passed | `docs/acceptance/wave11/n5/receipts/2026-11-07T07-04-15.811Z-29820-test-result.json` |
| `red-nc3` | passed | `docs/acceptance/wave11/n5/receipts/2026-11-07T07-04-27.655Z-22188-red-nc3-result.json` |
| `test` | passed | `docs/acceptance/wave11/n5/receipts/2026-11-07T07-04-37.327Z-1776-test-result.json` |
| `check --final` | passed | `docs/acceptance/wave11/n5/receipts/2026-11-07T07-05-02.457Z-1664-check-result.json` |
| `test --final` | passed | `docs/acceptance/wave11/n5/receipts/2026-11-07T07-05-09.638Z-36520-test-result.json` |
| `real --final` | passed | `docs/acceptance/wave11/n5/receipts/2026-11-07T07-05-22.999Z-31636-real-result.json` |
| `archive` | passed | `.local/checks/WATER-W11-N5/2026-11-07T07-06-54.455Z-33116-archive-result.json` |

具体 cargo 命令、退出码及日志文件名在各 JSON 的 `commands` 字段；fmt、clippy、metadata、离线与私有 target 由冻结检查器控制。每次 cargo 前仅按进程名查看 cargo/rustc，未输出命令行；未终止其他任务进程。

## 负控与恢复

- `nc1`：目标红 `2026-11-07T07-03-18.414Z-31048-red-nc1-result.json`；`git checkout -- <本次变异文件>` 后核对原字节，再立即 `test` 绿 `2026-11-07T07-03-35.060Z-36192-test-result.json`。
- `nc2`：目标红 `2026-11-07T07-04-03.276Z-33312-red-nc2-result.json`；`git checkout -- <本次变异文件>` 后核对原字节，再立即 `test` 绿 `2026-11-07T07-04-15.811Z-29820-test-result.json`。
- `nc3`：目标红 `2026-11-07T07-04-27.655Z-22188-red-nc3-result.json`；`git checkout -- <本次变异文件>` 后核对原字节，再立即 `test` 绿 `2026-11-07T07-04-37.327Z-1776-test-result.json`。

## 旧断言迁移

- 无旧断言迁移；旧名称的原断言全部保留。

## 执行中的选择与失败记录

- 初次新增测试的 test 和首次实现后的 test 均遇到 E0618：原 helper 内 let target 遮蔽了辅助函数；仅将两处新增调用写为 crate::target 修正，未改旧代码或旧断言。这两次编译失败不计负控。
- 保持原有声明排序，比新增排序接口或优先级结构改动更少；新旧文件名本身的 ASCII 排序满足新在前。
- 三条负控分别移除目录过滤的新名、ignored_root 新名、声明上报的新名（保留 declared 判断的新名），每次只改一个生产调用处；均要求新标记 SCAN_W11_RENAME。
- 只在 clean 实现提交上进行正式负控与 final；每次恢复均核对文件原字节，final test 另由 proofAudit 核对生产与测试哈希。
- 归档中的开工前 baseline 是总控派前记录；本次执行从 2026-11-07T06:58:38Z 的 baseline 起。真实冒烟的完整组级汇总在 real 归档 JSON 中，此回执仅列总计。
- 没有计时失败或计时重跑；没有降低断言强度、删除或忽略测试。

## 真实只读冒烟

只运行工单授权的 `real --final` 一次；结果只含计数或组级汇总：

```json
{
  "scan": {
    "status": "completed",
    "visited_entries": 276335,
    "elapsed_ms": 26802,
    "group_count": 12
  },
  "full": {
    "summary": {
      "status": "completed",
      "visited_entries": 276335,
      "elapsed_ms": 12646,
      "group_count": 20
    },
    "cluster_count": 8,
    "confirm_cluster_count": 8,
    "advisory_cluster_count": 0,
    "junction_count": 23,
    "junctions_truncated": false,
    "declaration_count": 0
  },
  "overview": {
    "status": "completed",
    "elapsed_ms": 44926,
    "visited_entries": 671027,
    "disk_bytes": "108022973072",
    "total_bytes": "107608103394",
    "file_count": 573828,
    "top_count": 10,
    "others_count": 229,
    "others_disk_bytes": "7401350016",
    "issues": []
  }
}
```

## 证据、边界与未验证

- `ARCHIVE.json`：305 个文件，5359948 字节；逐一复算大小和 SHA-256 均一致。archive 本身的结果回执留在 `.local/checks/WATER-W11-N5/`（归档在其生成前完成）。
- 真实冒烟仅经冻结 real_smoke：一次原有 scan、一次全开 extras 的 scan_full、一次用户目录空间概览；只读名字/元数据/重解析点，未打开真实文件内容，未清理。
- 合成目录与既有链接测试仅由本树 .local 下的 Fixture 管理；未在盘根新建隔离目录。
- Windows x64 定向验证；macOS、真实服务 N8 接线及桌面 UI 未验证。
- 未启动本单后台进程、原生窗口、选择框或浏览器；没有本单进程待终止。未合主线、未推送、未改配置、远端、已有历史或主线台账。
