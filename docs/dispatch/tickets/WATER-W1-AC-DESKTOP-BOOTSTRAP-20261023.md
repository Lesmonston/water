# WATER-W1-AC：Windows桌面依赖与最小只读壳

最新（2026-10-24）：03已受阻交回，原窗口预算已用；仅按[补单04](WATER-W1-AC-ADDENDUM-04-20261024.md)回原对话。旧入口/外贴句为历史，不重复check/test或旧native。

最新（2026-10-24）：补单02受阻已审计，总控控制入口已修订并实际离线通过。只按[补单03](WATER-W1-AC-ADDENDUM-03-20261024.md)回原AC对话，旧入口/旧外贴句为历史；不重复下载。

当前（2026-10-24）：国内镜像依赖已准备，按[补单02](WATER-W1-AC-ADDENDUM-02-20261024.md)回原对话；本票旧入口/外贴句保留为历史，不再使用。未改网络配置。

当前（2026-10-23）：BLOCKED。[补充单01](WATER-W1-AC-ADDENDUM-01-20261023.md)仍BLOCKED；依赖未恢复，当前不外贴或启动实现者。不要重贴本票或跑原首次baseline。以下保留原要求。

2026-10-23，正式票。只有主manifest本票status=READY且baselineStatus=PASSED才开工，READY不代表已外贴。

| 项 | 精确值 |
|---|---|
| 权威票 | F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-AC-DESKTOP-BOOTSTRAP-20261023.md |
| 唯一工作树/分支 | F:/new/smaltalk/water/.worktrees/ac / worker/water-w1-ac |
| 精确首次HEAD | 4b8a1de2ad49664546547256cd3d55def7c31a49，必须干净 |
| tag | water-w1-delivery-base-20261023 |
| SPEC | contracts/desktop-bootstrap-v1/SPEC.md |
| 冻结/执行器 | contracts/delivery-batch-v1/freeze.lock.json / scripts/delivery-wave-check.mjs |
| 回执 | F:/new/smaltalk/water/.worktrees/ac/docs/dispatch/reports/WATER-W1-AC-REPORT.md |
| 新证据 | 本树docs/acceptance/wave1/ac/ |

先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、ADR-017、M1-DELIVERY-WAVE-PLAN-20261023、本票SPEC与delivery-batch TESTS/SOURCES/锁、W1-DELIVERY-WORKER-RULES。材料在base中可读；正式票/后置READY回执以主检出绝对路径为准，不merge/复制主线控制提交。首次不存在的本票新文件由执行者实现，不修改其它票/上游。

本票只交Windows依赖锁/许可证和静态桌面壳，不运行Node/AA/AB、不扫描、不加Rust IPC或plugins；后续真正桌面扫描另票，不能冒称已完成。AC是本波唯一环境依赖初始化者，exact Tauri2.12.5/tauri-build2.7.4和serde旧版锁自有；必须用dependencies模式、新私有CARGO_HOME/target/临时目录，禁止全局Cargo/npm/SDK安装、根锁/旧cache改写。

首先从唯一树执行：

```powershell
node scripts/delivery-wave-check.mjs --task WATER-W1-AC --mode baseline
```

baseline只实测既有依赖/输入/工具，不是新产品测试。已有Rust/MSVC/WebView2可用；新Tauri还未fetch/build。创建本票完整Cargo/config/源/测试后用mode dependencies，获得exact新锁和许可证清单，再全程offline。

测试/文档检查清单：desktop_config_boundary、desktop_navigation_boundary、desktop_embedded_page。tests/bootstrap_v1.rs恰三顶层，Cargo autotests等全false，lib/main forbid unsafe。

先完整可运行骨架/指定测试red-behavior，命中AC_BEHAVIOR；不能用缺文件/编译/timeout造红。 稳定nc1真正绕过配置权限拒绝→AC_CAPABILITIES，恢复原字节/hash→test三绿；nc2真正让导航放行外部URL→AC_NAVIGATION，恢复→test三绿。运行时必须调用相同validator。 所有失败与源码好坏/恢复必须归档。

永久白名单（精确文件，无其它产品前缀）：

- apps/desktop-preview/Cargo.toml
- apps/desktop-preview/Cargo.lock
- apps/desktop-preview/.gitattributes
- apps/desktop-preview/.gitignore
- apps/desktop-preview/build.rs
- apps/desktop-preview/tauri.conf.json
- apps/desktop-preview/README.md
- apps/desktop-preview/src/lib.rs
- apps/desktop-preview/src/main.rs
- apps/desktop-preview/src/v1.rs
- apps/desktop-preview/frontend/index.html
- apps/desktop-preview/frontend/styles.css
- apps/desktop-preview/icons/icon.ico
- apps/desktop-preview/tests/bootstrap_v1.rs
- docs/dispatch/reports/WATER-W1-AC-REPORT.md
- docs/acceptance/wave1/ac/内本票新json/log/txt/png/md、ARCHIVE.json（不覆写别票证据）

其它只读：旧485/新增控制冻结、A–AB所有非分配文件、根Cargo/锁、既有helper/CASE、台账、其他树/旧fixture/AA排除截图/真实用户目录。可选icons/icon.ico只允许本项目自有简单资源≤64KiB，如构建确需，不下载竞品/第三方logo；.gitignore只gen/，.gitattributes固定自有文本LF。

完整实现/材料先提交为干净SHA，再串行以下final各一次：

```powershell
node scripts/delivery-wave-check.mjs --task WATER-W1-AC --mode check --final
node scripts/delivery-wave-check.mjs --task WATER-W1-AC --mode test --final
node scripts/delivery-wave-check.mjs --task WATER-W1-AC --mode native --final
```

整票只有1个静态桌面窗口、0目录窗，30秒墙钟；冻结native helper只看自有PID/title/文本并关闭，无桌面像素截图，失败不自动重跑。WebView数据目录必须在本树.local/desktop-webview/新私有目录，结束正常exit0/核子进程。 一树一门、jobs1；普通命令180秒，AC冷构建/依赖上限600秒，禁止watch/整仓/coverage。通过且字节未变不机械重跑。

回执必须记录实际模型/实现与受测SHA、逐需求、命令退出/所有失败、负控恢复或文档检查、窗口/进程/原字节证据/实际看图/未知平台；source/archive/bytes/SHA逐项索引，排除cache/target/binary/profile/payload。报告/原始日志分别检查空白并如实记退出，逐个显式文件暂存（日志-f），禁止整树add/reset/clean。

后续提交仅报告/证据；交回后停止产品改动/测试与自有后台进程，不push/merge/自行改主台账。完成只SUBMITTED，不宣称VERIFIED、真实用户scope、macOS、桌面整链或M1完成。受阻同路径写任务受阻/具体冲突与最小需求，不向用户索取临时放宽、不让另一个实现者接脏树。

报告第一行与完成通知必须是：

```text
WATER-W1-AC 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/ac/docs/dispatch/reports/WATER-W1-AC-REPORT.md
```
