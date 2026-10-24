# WATER-W1-AC 补充单01：官方registry连接与原树续做

当前（2026-10-24）：国内镜像依赖已准备，按[补单02](WATER-W1-AC-ADDENDUM-02-20261024.md)回原对话；本票旧入口/外贴句保留为历史，不再使用。未改网络配置。

当前（2026-10-23）：BLOCKED / baselineStatus=FAILED；最终有界依赖验证失败，不授权外贴执行。详见[环境回执](../wave1/AC-DESKTOP-ADDENDUM-01-READY-REPORT-20261023.md)。

2026-10-23。原票BLOCKED，不重贴原票、不新开执行者。本补只在主manifest.addendum01.status=READY且baselineStatus=PASSED时由原AC对话续做。

| 项 | 精确值 |
|---|---|
| 原树/分支 | F:/new/smaltalk/water/.worktrees/ac / worker/water-w1-ac |
| 续做HEAD | ef0b7c4b3a84c434c0cd3b691b79c8a4a37d311c；保留原骨架/报告/现场，不reset |
| 原静态骨架 | b617b90182d54053091910b8b4e889dd7f614a7d；未取得产品测试通过 |
| 新SPEC/锁 | contracts/desktop-bootstrap-addendum-v1/SPEC.md / contracts/desktop-bootstrap-addendum-v1/freeze.lock.json |
| 唯一wrapper | F:/new/smaltalk/water/scripts/ac-resume-check.mjs（主检出只读、绝对调用） |
| 新报告 | F:/new/smaltalk/water/.worktrees/ac/docs/dispatch/reports/WATER-W1-AC-ADDENDUM-01-REPORT.md |
| 新证据 | 本树docs/acceptance/wave1/ac/addendum-01/ |

先读主检出最新README/STATUS/AGENTS/CONTROLLER-WORKFLOW、本补/SPEC/新旧锁和总控受阻复核/环境恢复回执；原SPEC和509保持，补单优先。控制文件只从主检出读，不merge或复制到AC树。

首先从原树运行：

```powershell
node F:/new/smaltalk/water/scripts/ac-resume-check.mjs --task WATER-W1-AC --mode resume
```

原精确HEAD必须保持；若总控环境预检已生成Cargo.lock，唯一工作区差异必须是主manifest所公布SHA的该锁，resume会核对。不得运行原首次baseline（它要求新产品不存在且HEAD=4b8a1d）。原报告/ARCHIVE及全部46索引文件字节保持，新材料只写addendum-01。

环境阶段已由总控实际执行的成功/失败、锁SHA、来源/许可证和无需重复的命令，以后置READY回执为准。若dependencies已完整通过且锁/缓存未变，不机械重复在线fetch；继续完整可运行骨架/三测试AC_BEHAVIOR先红，再完成真实策略、两条稳定负控与即时恢复/三绿。需要补齐依赖时唯一入口是本绝对wrapper的mode dependencies，仍委托原未改helper/相同版本/私有目录/600秒每Cargo命令，官方host受限TCP连接、Cargo端TLS校验、无镜像/证书/全局配置改变。网络再失败保存证据并受阻，不循环。

永久产品白名单保持原票14路径；新增报告及addendum-01证据。原model/测试完整性、无JS/IPC/插件/任意路径权限、私有WebView profile、未接AA/AB及M1口径全部保持。补SPEC清楚重述原末行损坏的可选自有ICO≤64KiB与文本LF/.gitignore=gen/规则，不改原冻结。总控未实现策略或修改测试。

实现后同一干净SHA串行：

```powershell
node F:/new/smaltalk/water/scripts/ac-resume-check.mjs --task WATER-W1-AC --mode check --final
node F:/new/smaltalk/water/scripts/ac-resume-check.mjs --task WATER-W1-AC --mode test --final
node F:/new/smaltalk/water/scripts/ac-resume-check.mjs --task WATER-W1-AC --mode native --final
```

负控/恢复也经本wrapper相应red-behavior/red-nc1/red-nc2/test，仍委托原门，不改helper/测试/超时或造开关。旧receipt的网络失败不是产品红/负控。1个静态桌面窗口预算尚未消耗，仍只允许1次/30秒、0目录窗，失败不循环；本补环境阶段0窗口。

新报告绑定实际模型、受测实现SHA、所有命令/退出/失败、负控好坏恢复、实际native/进程退出、锁/许可证与未验证；原字节source/archive/bytes/SHA归档，不纳cache/crate包/target/binary/profile，不清理原现场。实现/测试提交→同SHA final→仅新报告/证据提交，交回停测停改、不push/merge/主线台账。完成只SUBMITTED。

通知及报告第一行：

```text
WATER-W1-AC 补充单01 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/ac/docs/dispatch/reports/WATER-W1-AC-ADDENDUM-01-REPORT.md
```

受阻同路径写任务受阻与最小条件；留原对话/原树，不让另一实现者覆盖。AD/AE保持独立任务，本补不阻挡它们。
