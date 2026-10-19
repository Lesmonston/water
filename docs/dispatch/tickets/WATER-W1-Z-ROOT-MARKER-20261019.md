# WATER-W1-Z：显式额外同意的根package.json读取

当前收单状态（2026-10-19）：VERIFIED（Windows受控范围），接收6f1f775/受测f853a78，隔离集成a9f6472已纳主线。[总控验收](../../acceptance/wave1/controller/WATER-W1-XYZ-REVIEW-20261019.md)。无需重贴；以下保留原派前要求。

2026-10-19，总控正式票。只在主manifest本票READY且baselineStatus=PASSED时开始；READY不代表已外贴。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-Z-ROOT-MARKER-20261019.md |
| 唯一树 / 分支 | F:/new/smaltalk/water/.worktrees/z / worker/water-w1-z |
| 精确首次HEAD | 1c152a1ed317fb51498503de837bb228c50dc663，必须干净，产品目录不存在 |
| 基线tag | water-w1-interactive-base-r2-20261019 |
| 主manifest | F:/new/smaltalk/water/docs/dispatch/wave1/manifest.json |
| 冻结 | contracts/interactive-batch-v1/freeze-r2.lock.json；继承旧341，新增数量见lock/READY回执 |
| 产品范围 | packages/root-marker |
| 报告 | F:/new/smaltalk/water/.worktrees/z/docs/dispatch/reports/WATER-W1-Z-REPORT.md |
| 证据 | 本树docs/acceptance/wave1/z/ |

先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、ADR-015、M1-INTERACTIVE-WAVE-PLAN、W1-INTERACTIVE-WORKER-RULES、TESTS.json、contracts/root-marker-v1/SPEC.md；X/Y共同读interactive-host-v1/SPEC及CASES，Y读live-workspace SPEC和真实W API，Z读root-marker SPEC/FIXTURES与真实N/P/U。旧锁/产品/根Cargo/台账只读。权威票在主检出，直接读绝对路径，不merge/复制控制提交。

首次命令（从唯一树）：

```powershell
node scripts/interactive-wave-check-r2.mjs --task WATER-W1-Z --mode baseline
```

baseline仅检既有依赖/平台/捕获，不代表新产品完成。只本树新root-marker合成夹具，普通内容读取须经新同意API；不读旧N–W夹具/真实用户项目。

按root-marker-v1实现借用P许可的额外ManifestReadConsent、句柄相对固定package.json读取及真实U分析。只读本树新factory；根ID、无跟随、单hardlink与大小前后验必须在内容读取前/后真实生效。不能向旧V/W来源或分类写回。

唯一测试文件：packages/root-marker/tests/marker_v1.rs。精确测试名：marker_consent_and_binding、marker_native_limits_and_links、marker_real_u_and_privacy、marker_public_types；无skip/ignore/filter/嵌套凑数。实现/API内部拆分由执行者在独占src内决定，对外wire/API按SPEC，不改其它票。

先形成可运行骨架和完整指定测试，red-behavior命中Z_BEHAVIOR；不能缺文件/编译/超时造红。Rust先mode lock离线生成本票锁，无新包。稳定字节后：nc1：禁用实际注册根/新根句柄身份绑定，让other-root数据被接受→Z_SCOPE_BINDING；nc2：禁用实际NumberOfLinks==1保护，让固定hardlink package.json返回证据→Z_SINGLE_LINK。两个都必须是运行成功但语义错误的真实生产变化。 每次red后立即原字节恢复、核hash、mode test通过再下一项。X native-cancel红1窗，最后native三正例；Y红只模型/HTTP测试、不重复完整Chrome；Z红只本票4测。全部历史失败/源快照保留，不能改测试或检查工具绕过。

允许永久文件：

- packages/root-marker/Cargo.toml
- packages/root-marker/Cargo.lock
- packages/root-marker/README.md
- packages/root-marker/tests/marker_v1.rs
- docs/dispatch/reports/WATER-W1-Z-REPORT.md
- packages/root-marker/src/ 内本票Rust文件
- docs/acceptance/wave1/z/ 内本票新json/log/txt/png及ARCHIVE.json

其它一律只读，不新加依赖/target或修改旧helper/锁/报告。

实现测试提交得到干净SHA后，串行以下final，不变字节不机械复跑：

```powershell
node scripts/interactive-wave-check-r2.mjs --task WATER-W1-Z --mode check --final
node scripts/interactive-wave-check-r2.mjs --task WATER-W1-Z --mode test --final
```

窗口总预算0，每子命令180秒，一树一门，Rust jobs1/private offline；原生driver仅操作本进程固定title，计数和退出要回执。正常结束停止自有后台，不清理profile/下载/fixture。报告写真实模型、精确受测SHA、需求与命令退出/全部失败/两条真实负控恢复/实际看图/未验证项。报告提交仅报告与证据，无产品变化，交回后停测停改、不push/merge/reset/clean。

完成通知和报告第一行：

```text
WATER-W1-Z 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/z/docs/dispatch/reports/WATER-W1-Z-REPORT.md
```

受阻在同路径写任务受阻及最小补充需求，不索取临时放宽。完成只SUBMITTED，不能自行标VERIFIED/M1或macOS通过。
