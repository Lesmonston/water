WATER-W11-N6 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w11-n6/docs/dispatch/reports/WATER-W11-N6-REPORT.md

- 实际模型：Codex（GPT-6；会话未提供更细型号）。未使用子代理。
- 基线：`ccc584b3894e28d1f6bb8f86748d03c143a38e5b`；工作树：`F:/new/smaltalk/water/.worktrees/w11-n6`；分支：`worker/water-w11-n6`。
- 干净实现提交：`533f4be64b8544de226bd4bb75b9fce74ea29309`。全部 final 均绑定此提交；后续只提交本回执和检查器生成的证据。
- 本单为执行者交付，尚待总控独立验收与合入。

## 工单逐项对照

- FILE_NAME 继续为 .water-cleanup.json；新增 FILE_NAME_FLICK 与 FILE_NAMES，数组精确为新声明名在前、旧声明名在后。
- read_manifest 的文件名校验改为在 FILE_NAMES 中做 ASCII 不区分大小写的完整文件名匹配；路径、普通文件、重解析点、大小、打开、读取、编码、解析与哈希逻辑均沿用。
- real_smoke 从 CARGO_MANIFEST_DIR 逐级查找第一个含 .worktrees 目录的祖先，找不到以 expect 失败；工作树计数逻辑不变。根声明按 FILE_NAMES 迭代，各自存在时仅调用 read_manifest 一次，manifest.flick 与 manifest.water 分别输出 present、valid、entries、hash_prefix；缺失时四个字段仍齐全。
- README 写明双名称、优先顺序、冒烟找根与分开的统计；没有新增其他公开接口、依赖、系统函数或修改 Cargo.lock。
- 四个测试名与数量保持；新断言放在 manifest_read_files，覆盖精确常量值/顺序、同内容双名称的完整 Loaded 值（只规范化 path）、混合大小写、两个实际存在的近似文件名的精确拒绝码及未读取状态；全部带 MANIFEST_W11_NAMES。

## 检查命令与结果

每行命令均为 `node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W11-N6 --mode <模式> [--final]`；通过为检查器退出 0。负控通过表示产品测试退出 101 且命中指定标记；没有编译错误或超时造红。

| 模式 | 结果 | 回执 / 日志索引 |
|---|---|---|
| `baseline` | failed | `docs/acceptance/wave11/n6/receipts/2026-11-07T06-42-34.277Z-11272-baseline-result.json` |
| `baseline` | passed | `docs/acceptance/wave11/n6/receipts/2026-11-07T06-44-05.334Z-27140-baseline-result.json` |
| `baseline` | passed | `docs/acceptance/wave11/n6/receipts/2026-11-07T07-09-58.687Z-35208-baseline-result.json` |
| `test` | failed | `docs/acceptance/wave11/n6/receipts/2026-11-07T07-10-59.608Z-31020-test-result.json` |
| `test` | passed | `docs/acceptance/wave11/n6/receipts/2026-11-07T07-12-01.732Z-29848-test-result.json` |
| `lock` | passed | `docs/acceptance/wave11/n6/receipts/2026-11-07T07-12-50.264Z-37008-lock-result.json` |
| `check` | passed | `docs/acceptance/wave11/n6/receipts/2026-11-07T07-12-55.353Z-3460-check-result.json` |
| `red-nc1` | passed | `docs/acceptance/wave11/n6/receipts/2026-11-07T07-13-35.644Z-26436-red-nc1-result.json` |
| `test` | passed | `docs/acceptance/wave11/n6/receipts/2026-11-07T07-13-41.923Z-7420-test-result.json` |
| `red-nc2` | passed | `docs/acceptance/wave11/n6/receipts/2026-11-07T07-14-01.812Z-26388-red-nc2-result.json` |
| `test` | passed | `docs/acceptance/wave11/n6/receipts/2026-11-07T07-14-14.204Z-11556-test-result.json` |
| `check --final` | passed | `docs/acceptance/wave11/n6/receipts/2026-11-07T07-14-31.403Z-34308-check-result.json` |
| `test --final` | passed | `docs/acceptance/wave11/n6/receipts/2026-11-07T07-14-36.494Z-37612-test-result.json` |
| `real --final` | passed | `docs/acceptance/wave11/n6/receipts/2026-11-07T07-14-42.403Z-26864-real-result.json` |
| `archive` | passed | `.local/checks/WATER-W11-N6/2026-11-07T07-14-48.767Z-7380-archive-result.json` |

具体 cargo 命令、退出码及日志文件名在各 JSON 的 `commands` 字段；fmt、clippy、metadata、离线与私有 target 由冻结检查器控制。每次 cargo 前仅按进程名查看 cargo/rustc，未输出命令行；未终止其他任务进程。

## 负控与恢复

- `nc1`：目标红 `2026-11-07T07-13-35.644Z-26436-red-nc1-result.json`；`git checkout -- <本次变异文件>` 后核对原字节，再立即 `test` 绿 `2026-11-07T07-13-41.923Z-7420-test-result.json`。
- `nc2`：目标红 `2026-11-07T07-14-01.812Z-26388-red-nc2-result.json`；`git checkout -- <本次变异文件>` 后核对原字节，再立即 `test` 绿 `2026-11-07T07-14-14.204Z-11556-test-result.json`。

## 旧断言迁移

- 无旧断言迁移。原样例 project: Water、原文件名/大小边界/联接/哈希/gitdir 断言全部保留。

## 执行中的选择与失败记录

- 先新增常量和断言，保留旧读取逻辑跑 test：以 MANIFEST_W11_NAMES 失败（3 通过、1 失败），证明测试能抓住新名称未接入；实现后四测试全绿。
- 真实冒烟直接使用祖先查找表达式，不新增用于找根的公开接口；主线和工作树都按同一逻辑找根。主线路径只静态审阅，实际 real 在指定工作树执行。
- 根声明不存在时输出 present=false、valid=false、entries=0、hash_prefix=null，不额外读取文件。
- nc1 只把 read_manifest 的名称判断退回 FILE_NAME；nc2 只交换 FILE_NAMES 顺序。两次均由 MANIFEST_W11_NAMES 抓住，随后精确恢复并立即跑完整四测试。
- 归档包括总控原有派前 baseline；本次执行从 2026-11-07T07:09:58Z 的 baseline 起。
- 没有计时失败或计时重跑；没有降低断言强度、删除或忽略测试。

## 真实只读冒烟

只运行工单授权的 `real --final` 一次；结果只含计数或组级汇总：

```json
{
  "detached": 0,
  "invalid": 0,
  "manifest": {
    "flick": {
      "entries": 0,
      "hash_prefix": null,
      "present": false,
      "valid": false
    },
    "water": {
      "entries": 6,
      "hash_prefix": "5aaac9bd",
      "present": true,
      "valid": true
    }
  },
  "valid": 46
}
```

## 证据、边界与未验证

- `ARCHIVE.json`：136 个文件，1204881 字节；逐一复算大小和 SHA-256 均一致。archive 本身的结果回执留在 `.local/checks/WATER-W11-N6/`（归档在其生成前完成）。
- 真实读取仅限主仓库 .worktrees 下的 .git 小文件及主仓库根两个约定声明名；不列 gitdir 目标、不输出路径或声明内容，不写真实文件。
- 合成测试仅在本树 .local 下本次新建的受控目录中操作，沿用其父目录与前缀校验及联接回收。
- Windows x64 定向验证；主线中直接运行 real_smoke、macOS、N8 服务双声明选择逻辑及 UI 未实测。
- 未启动本单后台进程、原生窗口、选择框或浏览器；没有本单进程待终止。未合主线、未推送、未改配置、远端、已有历史或主线台账。
