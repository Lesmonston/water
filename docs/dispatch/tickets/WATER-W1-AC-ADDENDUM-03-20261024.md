# WATER-W1-AC 补充单03：Clippy转发与最终验证

当前：READY / baselineStatus=PASSED。总控已在干净82d04aa对相同产品/测试字节运行修订后metadata/策略/fmt/clippy，实际全通过，resume通过；产品未验收。[正式回执](../wave1/AC-DESKTOP-ADDENDUM-03-READY-REPORT-20261024.md)。

2026-10-24。本补修订总控控制入口，补单02失败及全部189原件保留。只有主manifest.addendum03.status=READY且baselineStatus=PASSED时，用户才可贴回原AC对话；不新开实现者。

| 项 | 精确值 |
|---|---|
| 唯一树/分支 | F:/new/smaltalk/water/.worktrees/ac / worker/water-w1-ac |
| 首次续做干净HEAD | 82d04aaeef73030f65bc0a070b99a5517fd5d6a3 |
| 产品/测试/锁实现 | eb7f80178191e233068015bbc26dc9798ac8cb22，后加报告未改产品 |
| SPEC/锁 | 主检出contracts/desktop-bootstrap-clippy-v1/SPEC.md / freeze.lock.json |
| 唯一控制入口 | F:/new/smaltalk/water/scripts/ac-final-check.mjs，绝对路径只读 |
| 新报告 | F:/new/smaltalk/water/.worktrees/ac/docs/dispatch/reports/WATER-W1-AC-ADDENDUM-03-REPORT.md |
| 新证据 | 本树docs/acceptance/wave1/ac/addendum-03/ |

先读主检出README/STATUS/AGENTS/CONTROLLER-WORKFLOW、原票及补单02/03 SPEC、新旧锁、总控受阻复核/实际Clippy修订预检回执。旧519保持，新增4条目共523；旧helper、镜像定义和ac-mirror-check不改。不要merge主线取控制文件、重置树或清理旧日志/缓存。

从原树先运行一次：

```powershell
node F:/new/smaltalk/water/scripts/ac-final-check.mjs --task WATER-W1-AC --mode resume
```

首次必须精确82d04aa且干净，原14产品/测试/锁保持。总控新preflight只复跑受影响check（metadata/策略/fmt/clippy，无测试/窗口），完整实际结果以后置READY回执为准。修正只使相同镜像--config位于clippy之后、--之前，不再指向错误cache；相同offline/locked/all-targets/-D warnings、jobs1/600秒保持。禁止补下载、改网络/代理/证书、写Cargo配置或复制cache别名绕过。

若产品/测试字节未变，补单02已审计的有效AC_BEHAVIOR先红、两条生产负控/即时恢复/三绿直接复用，proof从已提交旧原字节归档读取；不机械重复。若实际仍需修改产品或测试，保持原白名单与完整三测/稳定生产负控规则，新稳定哈希重新取得对应红/即时恢复/三绿；不删断言、skip、过滤或使用生产测试开关。

随后在同一干净HEAD串行完成剩余三final，新失败/成功另留记录，不覆盖02失败：

```powershell
node F:/new/smaltalk/water/scripts/ac-final-check.mjs --task WATER-W1-AC --mode check --final
node F:/new/smaltalk/water/scripts/ac-final-check.mjs --task WATER-W1-AC --mode test --final
node F:/new/smaltalk/water/scripts/ac-final-check.mjs --task WATER-W1-AC --mode native --final
```

窗口预算尚余原1静态桌面窗/最多30秒、0目录窗，失败不循环；总控本轮不使用窗口。不得提前另行启动产品预览。原无JS/IPC/插件/任意路径权限、私有profile、四文案和未知平台语义保持；不接AA/AD，不访问真实用户目录/物理fixture或AA旧图片。

新报告记录实际模型、受测提交、旧证明复用的精确source/test哈希、所有新命令/退出/失败、check/test/native分别结果、窗口/关闭/子进程与实际看图。原字节source/archive/bytes/SHA归档，仅新report/evidence后加提交；缓存/crate/target/binary/profile不纳Git、不清理。旧报告/ARCHIVE/189及原46证据只读，不push/merge/改主台账或启动其它实现者；总控检查绿不等于产品已验收。

交回通知和报告首行：

```text
WATER-W1-AC 补充单03 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/ac/docs/dispatch/reports/WATER-W1-AC-ADDENDUM-03-REPORT.md
```

受阻同路径改为任务受阻，停止本票检查/自有后台进程，保留现场。真实Windows桌面扫描整链、用户scope、自然同意鉴真、生产竞态、macOS/M1未验收。
