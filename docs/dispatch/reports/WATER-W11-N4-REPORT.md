WATER-W11-N4 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w11-n4/docs/dispatch/reports/WATER-W11-N4-REPORT.md

- 实际模型：Codex（GPT-6；会话未提供更细型号）。未使用子代理。
- 基线：`ccc584b3894e28d1f6bb8f86748d03c143a38e5b`；工作树：`F:/new/smaltalk/water/.worktrees/w11-n4`；分支：`worker/water-w11-n4`。
- 干净实现提交：`1c427953e9470fe98c2c64b9042e5b72190d885e`。全部 final 均绑定此提交；后续只提交本回执和检查器生成的证据。
- 本单为执行者交付，尚待总控独立验收与合入。

## 工单逐项对照

- windows.json 所有 _zh 文案内 Water → Flick，共 23 处（why_zh 20、after_zh 3），其余句子逐字保留。
- data_version 与 README 版本同步为 2026-11-07.2；非 _zh 字段、ref 来源、规则 ID、定位、条件和计划形状保持。额外静态比对仅发现这 23 处与版本的 JSON 值变化。
- rules_seed_coverage 内递归遍历全部规则的 _zh 字段：不含 Water，Flick 精确 23 次；可空字段保持允许 null。全部新断言标记为 RULES_W11_RENAME，原四个测试名与数量保持。
- 未修改 src/、依赖或 Cargo.lock。

## 检查命令与结果

每行命令均为 `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W11-N4 --mode <模式> [--final]`；通过为检查器退出 0。负控通过表示产品测试退出 101 且命中指定标记；没有编译错误或超时造红。

| 模式 | 结果 | 回执 / 日志索引 |
|---|---|---|
| `baseline` | passed | `docs/acceptance/wave11/n4/receipts/2026-11-07T06-42-25.431Z-30824-baseline-result.json` |
| `baseline` | passed | `docs/acceptance/wave11/n4/receipts/2026-11-07T06-43-56.139Z-3184-baseline-result.json` |
| `baseline` | passed | `docs/acceptance/wave11/n4/receipts/2026-11-07T06-50-26.568Z-33900-baseline-result.json` |
| `test` | failed | `docs/acceptance/wave11/n4/receipts/2026-11-07T06-51-11.859Z-10252-test-result.json` |
| `check` | passed | `docs/acceptance/wave11/n4/receipts/2026-11-07T06-51-51.505Z-32252-check-result.json` |
| `test` | failed | `docs/acceptance/wave11/n4/receipts/2026-11-07T06-52-18.498Z-24936-test-result.json` |
| `test` | passed | `docs/acceptance/wave11/n4/receipts/2026-11-07T06-52-36.624Z-5912-test-result.json` |
| `lock` | passed | `docs/acceptance/wave11/n4/receipts/2026-11-07T06-53-03.817Z-9428-lock-result.json` |
| `check` | passed | `docs/acceptance/wave11/n4/receipts/2026-11-07T06-53-07.111Z-28064-check-result.json` |
| `red-nc1` | passed | `docs/acceptance/wave11/n4/receipts/2026-11-07T06-53-40.188Z-36420-red-nc1-result.json` |
| `test` | passed | `docs/acceptance/wave11/n4/receipts/2026-11-07T06-53-50.071Z-27340-test-result.json` |
| `red-nc2` | passed | `docs/acceptance/wave11/n4/receipts/2026-11-07T06-54-00.203Z-22444-red-nc2-result.json` |
| `test` | passed | `docs/acceptance/wave11/n4/receipts/2026-11-07T06-54-16.845Z-22912-test-result.json` |
| `red-nc3` | passed | `docs/acceptance/wave11/n4/receipts/2026-11-07T06-54-32.226Z-22764-red-nc3-result.json` |
| `test` | passed | `docs/acceptance/wave11/n4/receipts/2026-11-07T06-54-42.223Z-27312-test-result.json` |
| `check --final` | passed | `docs/acceptance/wave11/n4/receipts/2026-11-07T06-55-02.833Z-35520-check-result.json` |
| `test --final` | passed | `docs/acceptance/wave11/n4/receipts/2026-11-07T06-55-07.746Z-10608-test-result.json` |
| `real --final` | passed | `docs/acceptance/wave11/n4/receipts/2026-11-07T06-55-14.918Z-33764-real-result.json` |
| `archive` | passed | `.local/checks/WATER-W11-N4/2026-11-07T06-55-21.386Z-8048-archive-result.json` |

具体 cargo 命令、退出码及日志文件名在各 JSON 的 `commands` 字段；fmt、clippy、metadata、离线与私有 target 由冻结检查器控制。每次 cargo 前仅按进程名查看 cargo/rustc，未输出命令行；未终止其他任务进程。

## 负控与恢复

- `nc1`：目标红 `2026-11-07T06-53-40.188Z-36420-red-nc1-result.json`；`git checkout -- <本次变异文件>` 后核对原字节，再立即 `test` 绿 `2026-11-07T06-53-50.071Z-27340-test-result.json`。
- `nc2`：目标红 `2026-11-07T06-54-00.203Z-22444-red-nc2-result.json`；`git checkout -- <本次变异文件>` 后核对原字节，再立即 `test` 绿 `2026-11-07T06-54-16.845Z-22912-test-result.json`。
- `nc3`：目标红 `2026-11-07T06-54-32.226Z-22764-red-nc3-result.json`；`git checkout -- <本次变异文件>` 后核对原字节，再立即 `test` 绿 `2026-11-07T06-54-42.223Z-27312-test-result.json`。

## 旧断言迁移

- git_worktree_json 的 why_zh：Water → Flick；m3d_fallback_json 的 why_zh 同样迁移，继续精确比较完整文案。
- 原第 700、2394、2398、2402、2904、2942 行：2026-11-07.1 → 2026-11-07.2，继续精确比较嵌入/计划版本。

## 执行中的选择与失败记录

- 首次仅新增断言的 test 及修改数据后的首次 test 均被合法的 null 文案提前拦住（RULES_W11_RENAME: text field）；补上 null 分支后四测试全绿。这两次不是有效负控。
- 第一次 PowerShell 内联 Node 编辑因引号解析使匹配数为 0，在写入前断言终止；改用本树 .local 脚本，保持 UTF-8 与原格式。相关 rg 通配路径也改为目录加 -g 过滤。
- 三条正式负控分别把第一条 why_zh、after_zh 的 Flick 退回 Water，以及 data_version 退回 2026-11-07.1；分别命中 RULES_W11_RENAME、RULES_W11_RENAME、RULES_M35_VERSION。
- 选择保留 README 的 crate 标题与所有非文案字段，只同步指定版本，避免扩大改名范围。
- 没有计时失败或计时重跑；没有降低断言强度、删除或忽略测试。

## 真实只读冒烟

只运行工单授权的 `real --final` 一次；结果只含计数或组级汇总：

```json
{
  "base_present_count": 87,
  "literal_prefix_present_count": 70,
  "rule_count": 110,
  "system_drive_exists": true
}
```

## 证据、边界与未验证

- `ARCHIVE.json`：272 个文件，7122857 字节；逐一复算大小和 SHA-256 均一致。archive 本身的结果回执留在 `.local/checks/WATER-W11-N4/`（归档在其生成前完成）。
- 真实冒烟仅核对已知目录/字面前缀是否存在，没有列真实目录、读内容或进行清理。
- Windows x64 定向验证；macOS、桌面 UI 与服务集成未验证。
- 未启动本单后台进程、原生窗口、选择框或浏览器；没有本单进程待终止。未合主线、未推送、未改配置、远端、已有历史或主线台账。
