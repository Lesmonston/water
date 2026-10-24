# AC/AD/AE三独立任务READY

最新：补单04已受阻，新增[补单05有界取证](AC-DESKTOP-ADDENDUM-05-READY-REPORT-20261024.md)，只回原AC对话，不重贴旧票或重跑04。

???AC03??????check/test???????????[??04 READY](AC-DESKTOP-ADDENDUM-04-READY-REPORT-20261024.md)??AC?????????????AD/AE????

最新：AC补单02受阻已修订控制入口，按[补单03 READY](AC-DESKTOP-ADDENDUM-03-READY-REPORT-20261024.md)回原对话；AD/AE已收口，不重贴。

最新（2026-10-24）：[AC镜像依赖已准备、补单02 READY](AC-DESKTOP-ADDENDUM-02-READY-REPORT-20261024.md)，只回原AC对话继续产品实现，不重复下载或重贴原票/补单01。[AD/AE已验收集成](../../acceptance/wave1/controller/WATER-W1-ADAE-REVIEW-20261024.md)，无需重贴。下列三票原外贴句均为历史。

当前更新（2026-10-23）：AC已受阻交回，[补单01回执](AC-DESKTOP-ADDENDUM-01-READY-REPORT-20261023.md)仍BLOCKED，当前不外贴；AD/AE保持原独立分配。下方三票READY与AC首次外贴句为历史，勿重贴原AC票。

2026-10-23。共同精确基线 **`4b8a1de2ad49664546547256cd3d55def7c31a49`**，tag `water-w1-delivery-base-20261023`。三棵独立树/分支干净、本票新产物不存在，真实baseline已通过，三票均 **READY，待用户分别转贴**。没有自动启动外部执行者、内部worker或子代理；AC/AD新产品及AE研究材料尚未交付。原A–AB及八补单继续VERIFIED（Windows受控），旧票无需重贴。

| 票 | 本次可并行交付 | 精确独占范围 | 开工前实际检查 |
|---|---|---|---|
| AC | Windows Tauri环境、独立锁/许可证清单、最小静态只读桌面壳 | apps/desktop-preview | Rust1.95/MSVC真实编译与执行无UI探针，定位已装WebView2；尚未下载/构建Tauri |
| AD | AB同源项目报告、元数据/结构并列、原字节Q/Z附件 | AB分配的5个旧文件+4新资产/2新测试 | 真实既有AB公开streams→W/Q/Z HTTP1387/844字节及六项late入口通过 |
| AE | Mac原生API差异/固定来源/实机验收计划 | docs/research/macos-port-20261023 | 当前N/P/R/S/Z/AA源码与官方来源种子可读；没有Mac实现或执行 |

三票不互相依赖/争写，可以一起外贴。AC唯一允许新crates.io依赖初始化，精确Tauri2.12.5/tauri-build2.7.4已由registry版本接口查实（Rust要求1.90，本机1.95），任务内用新私有CARGO_HOME/target；未安装全局CLI/SDK或修改根锁。AD零npm、零新Rust/物理fixture；AE只读研究，JS空页不当已读文档、Unix内存样本不当Mac验证。

## 直接转贴给三个独立对话

WATER-W1-AC：Windows桌面依赖与最小只读壳

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-AC-DESKTOP-BOOTSTRAP-20261023.md，开始执行 WATER-W1-AC。
```

WATER-W1-AD：同源合并项目报告与原字节附件

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-AD-PROJECT-REPORT-20261023.md，开始执行 WATER-W1-AD。
```

WATER-W1-AE：macOS原生移植差异与实机验收准备

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-AE-MACOS-READINESS-20261023.md，开始执行 WATER-W1-AE。
```

每张正式票已含唯一树/分支/精确首次HEAD、前置、范围、SPEC、检查与回执绝对路径，无占位符。首次从各自树跑本票delivery-wave-check baseline；不merge/复制主线后置控制提交。READY不表示已经转贴，dispatchedAt/startedAt仍null。

## 原始证据与边界

- [WATER-W1-AC实际baseline](../../acceptance/wave1/controller/w1-delivery-preflight-20261023/ac/2026-10-23T02-36-00.416Z-34364-baseline-result.json)：PASSED，新产品测试false、系统窗口0。
- [WATER-W1-AD实际baseline](../../acceptance/wave1/controller/w1-delivery-preflight-20261023/ad/2026-10-23T02-36-00.427Z-33712-baseline-result.json)：PASSED，新产品测试false、系统窗口0。
- [WATER-W1-AE实际baseline](../../acceptance/wave1/controller/w1-delivery-preflight-20261023/ae/2026-10-23T02-36-00.442Z-36420-baseline-result.json)：PASSED，新产品测试false、系统窗口0。

[总控索引](../../acceptance/wave1/controller/w1-delivery-preflight-20261023/ARCHIVE.json)：19文件/54463字节，含原始命令/退出、源码种子和准备说明；来源/归档与暂存blob逐项验证。旧485+24新条目/18继承锁=509唯一约束，在主树及三树逐项核SHA/Git对象；28旧任务和槽位对象原样。

[派前勘误01](DELIVERY-PREFLIGHT-ERRATUM-01-20261023.md)保留首个控制草案PS1/LF与根CRLF工作区策略不一致的纠正。AC worktree创建命令曾到30秒工具超时，独立复核实际树已精确/完整/干净，保留该树并继续AD/AE，未reset/清理。未运行新产品/系统窗口，不拿这类工具问题当产品负控。

本波执行预算：AC最多1个静态桌面窗口、0目录窗/30秒，无失败循环；AD原生0、最多同时一私有Chrome；AE无UI。所有原profile/下载/fixture保留，AA排除截图不读像素。现阶段强依赖的真正桌面→AA/AB/AD扫描报告链尚未冻结为READY，要AC/AD验收后下一波；真实用户scope、自然同意鉴真、生产竞态、macOS、打包/发布与M1未验收。
