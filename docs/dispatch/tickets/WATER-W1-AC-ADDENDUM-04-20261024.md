# WATER-W1-AC 补充单04：编码修订后的有界桌面验收

最新（2026-10-24）：补单04已受阻/窗口已用；只按[补单05](WATER-W1-AC-ADDENDUM-05-20261024.md)回原对话取证，原根因未知，不重跑04。

当前：READY / baselineStatus=PASSED；无UI预检与干净resume实际通过，0窗口。正式回执见[补单04 READY](../wave1/AC-DESKTOP-ADDENDUM-04-READY-REPORT-20261024.md)。

2026-10-24，总控正式票。只有主manifest.addendum04.status=READY且baselineStatus=PASSED才可由用户贴回原AC对话；不新开实现者。旧03已失败并交回，不能重贴03或删除旧窗口reservation。

| 项 | 精确值 |
|---|---|
| 唯一树/分支 | F:/new/smaltalk/water/.worktrees/ac / worker/water-w1-ac |
| 首次及受测干净HEAD | b7dc83085a5edd9f38c12e70a53658ba6ae9cfa2 |
| 产品/测试/锁实现 | eb7f80178191e233068015bbc26dc9798ac8cb22，14文件只读 |
| SPEC/锁 | 主检出contracts/desktop-bootstrap-native-v1/SPEC.md / freeze.lock.json |
| 唯一入口 | F:/new/smaltalk/water/scripts/ac-native-check.mjs，绝对路径只读 |
| 新报告 | F:/new/smaltalk/water/.worktrees/ac/docs/dispatch/reports/WATER-W1-AC-ADDENDUM-04-REPORT.md |
| 新证据 | 本树docs/acceptance/wave1/ac/addendum-04/ |

先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、本SPEC/锁、原产品SPEC、03受阻报告及本补READY/总控复核。主检出新控制不merge/复制成工作树产品文件，旧所有helper/契约与46/189/88报告原件只读。旧523不变，六新条目/22继承锁共529约束。

本补不改产品，只完成被总控helper编码缺陷阻断的验收。运行时与预检共享ASCII-only文案policy；新helper实际观察原产品SPEC的四文案，保存失败前UIA文本，并关闭自有窗口/核正常exit0及子WebView结束。不以静态文案或合成字符串代替实际UIA。

从原树先运行一次：

```powershell
node F:/new/smaltalk/water/scripts/ac-native-check.mjs --task WATER-W1-AC --mode resume
```

必须精确b7dc830且干净，14产品/测试/锁与eb7f801保持。复用已经审计的先红/两负控/恢复以及03同干净82d04aa的final check/test；新入口验证原字节和引用。source/test哈希分别38c7a927cb30fd79f91e5e52e875a81dcb1585b359390dca50af5b24a2d2139d/211ba3014991309b2bda94cd422f4496c2ac552fa57507c3bb35283ae2acefe7。不重复下载、check/test、负控或冷构建，不用旧入口。

然后只运行一次剩余final：

```powershell
node F:/new/smaltalk/water/scripts/ac-native-check.mjs --task WATER-W1-AC --mode native --final
```

本编号单明确新增 **1次静态桌面窗口/最多30秒、0目录窗**；03已经使用的1次保持历史，累计分配2次，不是重置旧预算。新入口在ADDENDUM-04目录独立一次reservation，失败不循环。总控本轮0窗口，未提前试开。仍只构建/运行原静态壳，Rust1.95、私有home/target/tmp、jobs1、offline/locked、单Cargo命令600秒；不接AA/AD/扫描、真实用户目录、物理fixture或AA图片，不改网络/代理/证书/Cargo配置或创建cache别名。

永久写入白名单只有本报告及addendum-04内新json/log/txt/md、ARCHIVE.json；14产品/测试/锁全部只读。运行输出仅本树.local私有构建/日志/profile，不清理、不纳Git。产品若仍有实质问题，停止并报告，不能借本补修产品；不启动worker/子代理、push/merge或自行改主台账。

三个结果分清：复用check/test通过；本次native实际成功或失败；全部产品/独立集成尚待总控验收。记录实际模型、受测SHA、source/test哈希、命令退出、真实UIA四文案/窗口/关闭/子进程/私有profile、截图/实际看图是否发生、所有失败及原字节source/archive/bytes/SHA；不把UIA当截图或实际看图。手写报告/原始日志分开空白检查并保留真实退出，逐路径暂存（日志-f）。后加提交仅报告/证据，提交前保持受测b7dc830干净，提交后停测停改/核自有进程。

完成仅SUBMITTED，不宣称VERIFIED/真实桌面扫描整链/用户scope/macOS/M1通过。通知及报告首行：

```text
WATER-W1-AC 补充单04 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/ac/docs/dispatch/reports/WATER-W1-AC-ADDENDUM-04-REPORT.md
```

受阻同路径改“任务受阻”，写明实际现场和最小条件，不问用户临时放宽，不再开窗口、不让另一人覆盖原树。
