# WATER-W1-AC 补充单02：国内镜像依赖与原树续做

最新（2026-10-24）：补单02受阻已审计，总控控制入口已修订并实际离线通过。只按[补单03](WATER-W1-AC-ADDENDUM-03-20261024.md)回原AC对话，旧入口/旧外贴句为历史；不重复下载。

当前：READY / baselineStatus=PASSED。总控已下载238个Windows依赖包、验证锁与离线完整性，原树唯一差异Cargo.lock SHA `c56b58aa141a85617a59db4de679ff73d69827aee81bda958b1fdee0c9bbbfe8`；不再重复下载。详见[总控回执](../wave1/AC-DESKTOP-ADDENDUM-02-READY-REPORT-20261024.md)。

2026-10-24。用户已授权总控直接使用国内镜像下载，并要求不得修改其网络配置。总控先准备依赖，本补仅在主manifest.addendum02.status=READY且baselineStatus=PASSED后可外贴给原AC执行对话；DRAFT不授权开工。补单01受阻历史保留，本补替代其传输和续做控制入口。

| 项 | 精确值 |
|---|---|
| 唯一树/分支 | F:/new/smaltalk/water/.worktrees/ac / worker/water-w1-ac |
| 首次续做HEAD | ef0b7c4b3a84c434c0cd3b691b79c8a4a37d311c |
| 原静态骨架 | b617b90182d54053091910b8b4e889dd7f614a7d；未产品受测 |
| SPEC/锁 | contracts/desktop-bootstrap-mirror-v1/SPEC.md / freeze.lock.json，均从主检出读取 |
| 唯一控制入口 | F:/new/smaltalk/water/scripts/ac-mirror-check.mjs，主检出绝对路径只读 |
| 下载镜像 | sparse+https://mirrors.ustc.edu.cn/crates.io-index/，仅逐命令Cargo参数 |
| 新报告 | F:/new/smaltalk/water/.worktrees/ac/docs/dispatch/reports/WATER-W1-AC-ADDENDUM-02-REPORT.md |
| 新证据 | 本树docs/acceptance/wave1/ac/addendum-02/ |

先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、原票、原desktop-bootstrap-v1 SPEC、补单01 SPEC的图标/文本勘误、本补SPEC/MIRROR.json/新旧冻结，以及后置总控镜像准备回执。旧514保持，补单02对镜像和入口的明确变更优先。不merge/复制控制提交、不改旧helper或用户/项目/global Cargo配置，不动代理、DNS、证书、服务或系统设置。

从原树先运行：

```powershell
node F:/new/smaltalk/water/scripts/ac-mirror-check.mjs --task WATER-W1-AC --mode resume
```

总控已生成的Cargo.lock由主manifest公布SHA，必须是精确原HEAD下唯一工作区差异。resume核对原13源码和原报告/ARCHIVE/46证据。不要跑原首次baseline、补单01wrapper、旧官方dependencies门、reset或清缓存。总控准备成功的依赖无需重复下载；新入口的产品门带相同镜像cache选择且全部离线/锁定。

实现范围保持原票14产品路径，只新增本报告和addendum-02证据；旧报告及证据只读。完整可运行三测试骨架先red-behavior命中AC_BEHAVIOR，再实现真实配置/导航策略；AC_CAPABILITIES、AC_NAVIGATION两条稳定真实生产负控，逐次原字节/hash恢复并完整三绿。不得以编译/超时/缺依赖造红，不删测试/skip/加生产开关；原配置/CSP/无JS/IPC/插件/任意路径权限、私有WebView profile、未接AA/AB语义全部保持。可选自有ICO≤64KiB、文本LF与.gitignore恰gen/加LF按补单01明确说明执行。

所有门由本绝对入口调用，red-behavior/red-nc1/red-nc2/test模式沿原断言。实现/测试提交为干净SHA后，同一SHA串行：

```powershell
node F:/new/smaltalk/water/scripts/ac-mirror-check.mjs --task WATER-W1-AC --mode check --final
node F:/new/smaltalk/water/scripts/ac-mirror-check.mjs --task WATER-W1-AC --mode test --final
node F:/new/smaltalk/water/scripts/ac-mirror-check.mjs --task WATER-W1-AC --mode native --final
```

三测试清单、每Cargo命令600秒、jobs1、私有home/target/tmp不变。仅一次静态桌面窗口、最多30秒、0目录窗；本补下载阶段窗口0。失败留现场，不循环弹窗或联网重跑。只有后续确实缺失依赖时才用新入口dependencies并保留失败，不能改源/版本/超时；旧通道不用于镜像，Cargo按固定逐命令配置管理连接。下载source/license及crate checksum、锁SHA必须记录，不能称未经独立比较的镜像内容已获官方逐项鉴真。

新回执记录实际模型、受测实现SHA、逐需求、全部命令/退出/失败、源码好坏及即时恢复、实际单窗/退出/看图与未验证边界；source/archive/bytes/SHA原字节归档。缓存/crate包/target/binary/profile不进Git、不清理。后加提交仅本报告/证据，不push/merge/改主台账，不启动子代理或另一实现者；完成仅SUBMITTED。环境可用不等于产品验收，真实桌面扫描、用户scope、macOS/M1仍待后续。

通知与报告首行：

```text
WATER-W1-AC 补充单02 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/ac/docs/dispatch/reports/WATER-W1-AC-ADDENDUM-02-REPORT.md
```

受阻同路径改为任务受阻，记录具体原因与最小条件，停止本票检查与自有后台进程。原树留给原AC对话，不让别人覆盖。
