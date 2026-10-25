# WATER-W1-AC 补充单05：保留严格判定的单窗取证

最新（2026-10-25）：补单05受阻已交回，旧三次窗口已用；仅按[补单06](WATER-W1-AC-ADDENDUM-06-20261025.md)在原对话续做，不执行旧native或重复check/test。下列旧READY/外贴句为历史。

当前：READY / baselineStatus=PASSED。无UI Parser/共享根策略/13合成边界/文案及精确干净resume通过，0窗口；尚未验证真实UIA/关闭，不宣称已修复native根因。[正式回执](../wave1/AC-DESKTOP-ADDENDUM-05-READY-REPORT-20261024.md)。

2026-10-24。只有主manifest.addendum05.status=READY且baselineStatus=PASSED时才可由用户贴回原AC执行对话；不启动另一实现者。补单04受阻已交回，两次窗口历史和reservation保持，不能重跑04。

| 项 | 精确值 |
|---|---|
| 唯一树/分支 | F:/new/smaltalk/water/.worktrees/ac / worker/water-w1-ac |
| 首次及本次受测干净HEAD | a3334875139a3d6b03e1e71aecb6baad7c1c6711 |
| 产品/测试/锁实现 | eb7f80178191e233068015bbc26dc9798ac8cb22，14文件只读 |
| SPEC/锁 | 主检出contracts/desktop-bootstrap-root-v1/SPEC.md / freeze.lock.json |
| 唯一入口 | F:/new/smaltalk/water/scripts/ac-native-diagnostic-check.mjs，绝对路径只读 |
| 新报告 | F:/new/smaltalk/water/.worktrees/ac/docs/dispatch/reports/WATER-W1-AC-ADDENDUM-05-REPORT.md |
| 新证据 | 本树docs/acceptance/wave1/ac/addendum-05/ |

先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、原desktop SPEC、本补SPEC/锁、04原受阻报告/取证缺口与本补总控复核/READY回执。旧529冻结、旧46/189/88/51原件及报告只读；新六条目/23继承锁共535。不得merge或复制控制提交、reset或清理旧现场。

本补**先补齐真实取证，不预判根因，也不放宽Count>1失败**。无论额外根是否offscreen、handle0或CUI线索，都不自动忽略。新observer在断言前持久化真实数量、至多32个自有根的PID/name/class/type/handle/offscreen/bounds/runtimeId/读取错误；明确主窗可安全关闭时，在失败finally重新核绑定后关闭，原失败仍保留。外层分别记录首次helper错误、退出/清理错误与wall时间，不以后续timeout覆盖根错误。

先运行一次resume：

```powershell
node F:/new/smaltalk/water/scripts/ac-native-diagnostic-check.mjs --task WATER-W1-AC --mode resume
```

必须精确a333487且干净、14产品文件与eb7f801一致。复用03同干净82d04aa final check/test及02有效先红/两负控/恢复；source/test哈希38c7a927cb30fd79f91e5e52e875a81dcb1585b359390dca50af5b24a2d2139d/211ba3014991309b2bda94cd422f4496c2ac552fa57507c3bb35283ae2acefe7不变。不重跑下载、check/test、Clippy、负控或先红。新入口不执行Tauri CLI/安装，不改网络、代理、证书或持久Cargo配置。

然后仅一次：

```powershell
node F:/new/smaltalk/water/scripts/ac-native-diagnostic-check.mjs --task WATER-W1-AC --mode native --final
```

本编号单明确**另增1次静态窗取证/验收allocation，最多30秒、0目录窗**；03/04已用两次不抹除，累计分配3次，新日志目录单次reservation，失败不循环。总控本轮派前0窗，正式额外尝试由用户外贴后的原对话执行。只有严格根唯一、四文案、正常exit0、私有profile/子WebView退出全部真实满足才能记录native通过；有完整诊断但Count>1仍必须受阻。判定产品修复或更改计数语义另交总控，不能在本补现场忽略根或改Rust子系统。

运行只用既有私有home/target/tmp，Rust1.95/jobs1/offline/locked、Cargo build600秒；observer命令25秒为退出收尾留余量，实际产品墙钟仍≤30秒，不是延长预算。禁止手工试开产品、其它窗口、AA/AD接线、用户数据/物理fixture、桌面或AA像素。WindowPattern只用于已确认的本票精确主窗，未知/歧义不随便关闭。失败时保留原error/cleanup和外层实际终止请求；终止不算正常退出。

永久写入范围只有本报告与addendum-05新json/log/txt/md、ARCHIVE.json，产品14文件只读。运行输出只在本树.local，cache/crate/target/binary/profile不纳Git、不清理。报告绑定模型、受测SHA、每条原命令/退出、复用证明哈希、真实根明细或无法采集的具体原因、主窗/关闭/子进程/profile、预算和未验证项。实际Count和field值不得由旧失败猜测；UIA不是像素看图。

后加提交仅新报告/证据，交回停测停改，不push/merge/改主台账、不启动子代理或另一实现者。完成仅SUBMITTED，产品独立集成由总控决定。若仍失败，不直接修产品、不再开窗，回执交回即可。Windows桌面扫描整链、用户scope、生产竞态、macOS/M1未验收。

通知及报告首行：

```text
WATER-W1-AC 补充单05 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/ac/docs/dispatch/reports/WATER-W1-AC-ADDENDUM-05-REPORT.md
```

受阻同路径改为“任务受阻”，保存原字节source/archive/bytes/SHA，手写/原始日志空白检查分别记录，不清洗失败或覆盖旧回执。
