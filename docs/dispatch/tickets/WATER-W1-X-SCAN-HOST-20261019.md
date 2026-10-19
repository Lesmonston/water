# WATER-W1-X：持续原生扫描宿主与真实合作取消

2026-10-19，总控正式票。只在主manifest本票READY且baselineStatus=PASSED时开始；READY不代表已外贴。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-X-SCAN-HOST-20261019.md |
| 唯一树 / 分支 | F:/new/smaltalk/water/.worktrees/x / worker/water-w1-x |
| 精确首次HEAD | 1c152a1ed317fb51498503de837bb228c50dc663，必须干净，产品目录不存在 |
| 基线tag | water-w1-interactive-base-r2-20261019 |
| 主manifest | F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json |
| 冻结 | contracts/interactive-batch-v1/freeze-r2.lock.json；继承旧341，新增数量见lock/READY回执 |
| 产品范围 | packages/scan-host |
| 报告 | F:/new/smaltalk/water/.worktrees/x/docs/dispatch/reports/WATER-W1-X-REPORT.md |
| 证据 | 本树docs/acceptance/wave1/x/ |

先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、ADR-015、M1-INTERACTIVE-WAVE-PLAN、W1-INTERACTIVE-WORKER-RULES、TESTS.json、contracts/interactive-host-v1/SPEC.md；X/Y共同读interactive-host-v1/SPEC及CASES，Y读live-workspace SPEC和真实W API，Z读root-marker SPEC/FIXTURES与真实N/P/U。旧锁/产品/根Cargo/台账只读。权威票在主检出，直接读绝对路径，不merge/复制控制提交。

首次命令（从唯一树）：

```powershell
node scripts/interactive-wave-check-r2.mjs --task WATER-W1-X --mode baseline
```

baseline仅检既有依赖/平台/捕获，不代表新产品完成。只复用本树冻结工厂生成的原R同形60字面/74逻辑字节fixture，不访问其它树或真实用户目录。

按interactive-host-v1实现真实持久宿主；每次调用V.capture_session_with_observer与V.to_json，shared CancelToken真实传入V；真实R observer只输出计数。禁止从CLI initialDirectory代替S结果、重算报告或创建自己的扫描器。无UI四测试后，以native门运行真实X.exe三种窗口场景。

唯一测试文件：packages/scan-host/tests/host_v1.rs。精确测试名：host_request_boundary、host_job_state、host_progress_cancellation、host_wire_privacy；无skip/ignore/filter/嵌套凑数。实现/API内部拆分由执行者在独占src内决定，对外wire/API按SPEC，不改其它票。

先形成可运行骨架和完整指定测试，red-behavior命中X_BEHAVIOR；不能缺文件/编译/超时造红。Rust先mode lock离线生成本票锁，无新包。稳定字节后：nc1：真正取消/任务绑定逻辑忽略ID，让别的job可改活动任务→X_JOB_BINDING；nc2：真实V调用传新CancelToken代替已被取消的那个→X_CANCEL_TOKEN，用red-nc2仅一窗真实pre-cancel确认，不能以纯state测试冒充接线证明。 每次red后立即原字节恢复、核hash、mode test通过再下一项。X native-cancel红1窗，最后native三正例；Y红只模型/HTTP测试、不重复完整Chrome；Z红只本票4测。全部历史失败/源快照保留，不能改测试或检查工具绕过。

允许永久文件：

- packages/scan-host/Cargo.toml
- packages/scan-host/Cargo.lock
- packages/scan-host/README.md
- packages/scan-host/tests/host_v1.rs
- docs/dispatch/reports/WATER-W1-X-REPORT.md
- packages/scan-host/src/ 内本票Rust文件
- docs/acceptance/wave1/x/ 内本票新json/log/txt/png及ARCHIVE.json

其它一律只读，不新加依赖/target或修改旧helper/锁/报告。

实现测试提交得到干净SHA后，串行以下final，不变字节不机械复跑：

```powershell
node scripts/interactive-wave-check-r2.mjs --task WATER-W1-X --mode check --final
node scripts/interactive-wave-check-r2.mjs --task WATER-W1-X --mode test --final
node scripts/interactive-wave-check-r2.mjs --task WATER-W1-X --mode native --final
```

窗口总预算6，每子命令180秒，一树一门，Rust jobs1/private offline；原生driver仅操作本进程固定title，计数和退出要回执。正常结束停止自有后台，不清理profile/下载/fixture。报告写真实模型、精确受测SHA、需求与命令退出/全部失败/两条真实负控恢复/实际看图/未验证项。报告提交仅报告与证据，无产品变化，交回后停测停改、不push/merge/reset/clean。

完成通知和报告第一行：

```text
WATER-W1-X 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/x/docs/dispatch/reports/WATER-W1-X-REPORT.md
```

受阻在同路径写任务受阻及最小补充需求，不索取临时放宽。完成只SUBMITTED，不能自行标VERIFIED/M1或macOS通过。
