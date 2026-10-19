# WATER-W1-Y：可开始、取消、再扫的交互工作台

2026-10-19，总控正式票。只在主manifest本票READY且baselineStatus=PASSED时开始；READY不代表已外贴。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-Y-LIVE-WORKSPACE-20261019.md |
| 唯一树 / 分支 | F:/new/smaltalk/water/.worktrees/y / worker/water-w1-y |
| 精确首次HEAD | 8e73790dc11d01593cbc92772eab429f4b42e468，必须干净，产品目录不存在 |
| 基线tag | water-w1-interactive-base-20261019 |
| 主manifest | F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json |
| 冻结 | contracts/interactive-batch-v1/freeze-r2.lock.json；继承旧341，新增数量见lock/READY回执 |
| 产品范围 | prototypes/live-workspace |
| 报告 | F:/new/smaltalk/water/.worktrees/y/docs/dispatch/reports/WATER-W1-Y-REPORT.md |
| 证据 | 本树docs/acceptance/wave1/y/ |

先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、ADR-015、M1-INTERACTIVE-WAVE-PLAN、W1-INTERACTIVE-WORKER-RULES、TESTS.json、contracts/live-workspace-v1/SPEC.md；X/Y共同读interactive-host-v1/SPEC及CASES，Y读live-workspace SPEC和真实W API，Z读root-marker SPEC/FIXTURES与真实N/P/U。旧锁/产品/根Cargo/台账只读。权威票在主检出，直接读绝对路径，不merge/复制控制提交。

首次命令（从唯一树）：

```powershell
node scripts/interactive-wave-check-r2.mjs --task WATER-W1-Y --mode baseline
```

baseline仅检既有依赖/平台/捕获，不代表新产品完成。无物理fixture权限；只保留回放/loopback/私有Chrome/实际下载。

按live-workspace-v1实现开始/进度/取消/再扫/最近两份报告，真实委托W.startServer。X未实现时，用公开streams连接冻结interactive-host-replay.mjs做真实双向pipe/HTTP/Chrome测试，不放假exe或生产测试模式。固定launch在独立树没有真实X时应正常拒绝；总控后续联合。

唯一测试文件：prototypes/live-workspace/tests/model.test.mjs、prototypes/live-workspace/tests/browser.test.mjs。精确测试名：workspace_protocol_state、workspace_http_authority、workspace_lifecycle_and_reports、workspace_actions_and_download、workspace_layout_and_cancel；无skip/ignore/filter/嵌套凑数。实现/API内部拆分由执行者在独占src内决定，对外wire/API按SPEC，不改其它票。

先形成可运行骨架和完整指定测试，red-behavior命中Y_BEHAVIOR；不能缺文件/编译/超时造红。Rust先mode lock离线生成本票锁，无新包。稳定字节后：nc1：移除真实HTTP动作入口的一项Origin/token校验，使未授权POST写入实际pipe→Y_ACTION_AUTH；nc2：允许过期/其它job terminal覆盖活动状态或创建报告→Y_STALE_RESULT。必须改真实使用路径，不能只改未被用到的辅助函数。 每次red后立即原字节恢复、核hash、mode test通过再下一项。X native-cancel红1窗，最后native三正例；Y红只模型/HTTP测试、不重复完整Chrome；Z红只本票4测。全部历史失败/源快照保留，不能改测试或检查工具绕过。

允许永久文件：

- prototypes/live-workspace/.gitattributes
- prototypes/live-workspace/index.html
- prototypes/live-workspace/styles.css
- prototypes/live-workspace/app.mjs
- prototypes/live-workspace/model.mjs
- prototypes/live-workspace/server.mjs
- prototypes/live-workspace/transport.mjs
- prototypes/live-workspace/launch.mjs
- prototypes/live-workspace/tests/model.test.mjs
- prototypes/live-workspace/tests/browser.test.mjs
- prototypes/live-workspace/README.md
- docs/dispatch/reports/WATER-W1-Y-REPORT.md
- docs/acceptance/wave1/y/ 内本票新json/log/txt/png及ARCHIVE.json

其它一律只读，不新加依赖/target或修改旧helper/锁/报告。实际查看本次三图live-workspace-1440x1000.png/900x800.png/cancel.png，单个私有Chrome，下载要系统鼠标点击并与当次Q原字节比较。

实现测试提交得到干净SHA后，串行以下final，不变字节不机械复跑：

```powershell
node scripts/interactive-wave-check-r2.mjs --task WATER-W1-Y --mode check --final
node scripts/interactive-wave-check-r2.mjs --task WATER-W1-Y --mode test --final
node scripts/interactive-wave-check-r2.mjs --task WATER-W1-Y --mode browser --final
```

窗口总预算0，每子命令180秒，一树一门，Rust jobs1/private offline；原生driver仅操作本进程固定title，计数和退出要回执。正常结束停止自有后台，不清理profile/下载/fixture。报告写真实模型、精确受测SHA、需求与命令退出/全部失败/两条真实负控恢复/实际看图/未验证项。报告提交仅报告与证据，无产品变化，交回后停测停改、不push/merge/reset/clean。

完成通知和报告第一行：

```text
WATER-W1-Y 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/y/docs/dispatch/reports/WATER-W1-Y-REPORT.md
```

受阻在同路径写任务受阻及最小补充需求，不索取临时放宽。完成只SUBMITTED，不能自行标VERIFIED/M1或macOS通过。
