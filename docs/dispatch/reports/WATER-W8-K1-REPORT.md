WATER-W8-K1 任务受阻，任务报告在 F:/new/smaltalk/water/.worktrees/w8-k1/docs/dispatch/reports/WATER-W8-K1-REPORT.md

2026-10-31。执行者：Codex（GPT-6；运行环境未提供更细的模型版本）。本回执仅记录派前阅读发现的契约与旧断言冲突，不表示产品已实现或验收通过。

## 起点与范围

- 工作树：`F:/new/smaltalk/water/.worktrees/w8-k1`。
- 分支：`worker/water-w8-k1`。
- 初始 HEAD：`912eba100ba342c3eeb21ba555c6d589b91e6b4f`，初始工作树干净。
- 权威工单：`F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W8-K1-PROCESS-20261031.md`。
- 实现提交 SHA：无；尚未修改产品源码、测试、依赖或锁文件。本次仅新增本受阻回执。

## 阻塞证据

1. `contracts/m3c-v1/PROCESS-M3C.md:10` 要求程序路径取不到时计入新的 issue `image_unavailable`，与 `access_denied` 等并列；第 5 节还要求真实冒烟输出该 issue 的计数。
2. 基线 `packages/process-scan/tests/process_v1.rs:363` 的 `process_snapshot_contract` 对摘要中每个 issue 执行原有断言：

   ```rust
   assert!(code == "access_denied" || code == "exited");
   ```

   按新 SPEC 输出 `image_unavailable` 后，此原有断言必然拒绝该 code。这是静态可确定的冲突；尚未运行改动后的测试，不声称已取得失败日志。
3. `docs/dispatch/W8-M3C-WORKER-RULES.md:44` 明确规定：

   > **旧断言**：只有 SPEC 写明“获准修改”的才能改，并在回执里逐条写出原值与新值；其余原有断言与标记不变。SPEC 没想到、但因本单改动而必然要改的旧断言：**先写受阻回执**，不要自行改。

   当前 PROCESS-M3C 没有明确授权修改上述旧断言。因此不能自行放宽断言，也不能省略新 issue 或从 summary 中隐藏它来过门。

## 最小补充需求

请总控通过正式补充单及对应冻结材料，明确授权仅将第 363 行的 issue code 白名单扩为：

```rust
assert!(code == "access_denied" || code == "exited" || code == "image_unavailable");
```

其余原有断言与标记保持。补充单需绑定本回执提交后的实际续做 HEAD，并同步必要的契约与 manifest；这些文件不在本执行者可修改范围。

## 已执行检查

在指定工作树根目录运行：

```powershell
node F:/new/smaltalk/water/scripts/checkup-wave-check.mjs --task WATER-W8-K1 --mode baseline
```

- 退出码：0；`status: passed`；`offlineCache: complete`。
- 回执：`.local/checks/WATER-W8-K1/2026-10-31T14-15-00.211Z-25840-baseline-result.json`。
- 开始：`2026-10-31T14:15:00.213Z`；结束：`2026-10-31T14:15:04.194Z`。
- 检查器报告 `productTestsRun: false`、`realDataRead: false`，只证明基线、环境与输入就绪。
- 人工核对 `git rev-parse HEAD`、`git branch --show-current`、`git status --short` 与票面一致。

## 未做或未验证

- SPEC 第 1～3 节均未实现；没有新增系统调用或结构体大小断言。
- 未运行 lock、check、test、real、负控或任何 final；没有真实冒烟计数、负控恢复哈希。
- 未运行 archive：当前缺少实现、负控与 final，不能归档为完成证据。
- 未启动测试进程、窗口、选择框；未新建物理测试夹具，未执行删除。
- 未下载、安装、修改检查器、契约、台账、其它包或 Git 配置；未 merge、改写历史或 push。
- 未验证 Windows 新功能、生产竞态、真实链路或 macOS。等待总控补充单后再继续。
