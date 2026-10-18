# 本波正式派前回执：R补单01 + S/T/U

最新2026-10-19：R补单01/S/T/U均已VERIFIED（Windows受控范围），本波全部收口，不再外贴；当前以manifest及RTU总控验收为准。下文是原派前历史。


最新2026-10-19：S已独立验收并合入主线（Windows受控范围），无需重贴；R补单01/T/U按原分配等待回执。下文保留2026-10-18派前计划，当前以manifest与S总控验收为准。


2026-10-18，总控；Windows x64 / Node24.16 / Rust1.95 MSVC。用户要求按波次一次出齐独立任务，本波四份可同时外贴，无自动实现者。全部新产品及五测试尚未实现/运行，M1未完成。

| 票 | 状态/给谁 | 基线/起点 | 实际派前结果 |
|---|---|---|---|
| R补单01 | READY，原r对话 | 原dd09c3b；受阻acefcf1；总控追加c0e2025 | resume通过；真实A旧两原因拒绝/第三原因接受，真实Q和原ABI依赖通过 |
| S 原生选择 | READY，新s对话 | 3d0faefa97267a6aa57f880a315a2cde7fe06e98 | 真实系统窗口取消/GetResult实际路径→真实N/P，固定空目录，无扫描 |
| T 脱敏预览下载 | READY，新t对话 | 同上 | 实际A/E/H/Q/I 24报告、Q 9原错误，真实点击attachment保存1379字节与Q逐字节一致 |
| U 内存清单 | READY，新u对话 | 同上 | 既有serde离线锁与11合成golden/19原raw输入可用，非U解析实现验证 |

共同tag water-w1-parallel-wave-base-20261018，s/t/u分支worker/water-w1-s/t/u，均独立树、精确HEAD干净，产品目录不存在。94新锁条目、12继承锁，291唯一冻结；原255不变；R单独附加16锁条目/261唯一，不改原61锁/helper/基线/夹具/报告。总控在r仅追加六个控制材料文件，完整起点 c0e20252c87b22fde8c83c4487d24e7a5ca06011，受阻完整SHA acefcf1f5fa16ff7580a219f1a2d06baaf9fdb2e 保留。

## 外贴入口

R补单发原执行对话，S/T/U各开一个新对话，可同时执行：

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-R-ADDENDUM-01-20261018.md，继续执行 WATER-W1-R 补充单01。
```

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-S-NATIVE-PICKER-20261018.md，开始执行任务。
```

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-T-SCAN-REVIEW-20261018.md，开始执行任务。
```

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-U-NODE-MANIFEST-20261018.md，开始执行任务。
```

## 原始证据和诚实边界

- R [2026-10-18T14-33-55.065Z-36388-resume-result.json](../../acceptance/wave1/controller/w1-parallel-wave-preflight-20261018/r/2026-10-18T14-33-55.065Z-36388-resume-result.json)：c0e20252c87b22fde8c83c4487d24e7a5ca06011，2026-10-18T14:33:58.611Z → 2026-10-18T14:34:17.684Z，退出0。
- S [2026-10-18T14-33-54.991Z-34804-baseline-result.json](../../acceptance/wave1/controller/w1-parallel-wave-preflight-20261018/s/2026-10-18T14-33-54.991Z-34804-baseline-result.json)：3d0faefa97267a6aa57f880a315a2cde7fe06e98，2026-10-18T14:33:58.653Z → 2026-10-18T14:34:46.798Z，退出0。
- T [2026-10-18T14-33-54.998Z-42184-baseline-result.json](../../acceptance/wave1/controller/w1-parallel-wave-preflight-20261018/t/2026-10-18T14-33-54.998Z-42184-baseline-result.json)：3d0faefa97267a6aa57f880a315a2cde7fe06e98，2026-10-18T14:33:57.857Z → 2026-10-18T14:35:06.989Z，退出0。
- U [2026-10-18T14-33-55.027Z-29604-baseline-result.json](../../acceptance/wave1/controller/w1-parallel-wave-preflight-20261018/u/2026-10-18T14-33-55.027Z-29604-baseline-result.json)：3d0faefa97267a6aa57f880a315a2cde7fe06e98，2026-10-18T14:33:58.596Z → 2026-10-18T14:34:44.029Z，退出0。

原始json/log/txt归档于[证据目录](../../acceptance/wave1/controller/w1-parallel-wave-preflight-20261018/ARCHIVE.json)，逐源路径/长度/SHA已核。冻结及范围审计见[freeze-and-scope-audit.json](../../acceptance/wave1/controller/w1-parallel-wave-preflight-20261018/freeze-and-scope-audit.json)。原受阻报告及24份原交付文件逐字节保留；A–Q任务对象、旧产品/根Cargo与255旧冻结未变，S/T/U本树291冻结一致。

S派前UIA只找固定系统按钮的尝试失败三次：早期传windowsHide=true且未找到按钮；改为可见窗口后，日志中UIA Button列表仍没有确认/取消按钮。均保留日志，不当产品红，也未将初次失败归因为已证实的隐藏机制。最终冻结driver对实际测试进程允许可见窗口，仅UIA定位同PID固定title，再GetDlgItem/复核按钮PID/PostMessage(BM_CLICK)驱动系统取消/确认，controller与s实际通过。没有安装、真实用户目录读取或任意窗口控制；失败旧窗口随本次探针进程结束，fixtures/logs/profiles均未清理。

S仅controller/s各自4空目录/1junction，0普通内容；R复用原60字面/74逻辑字节夹具，原工具有限检查不扩大权限。T下载1379字节仅已验收Q的受控报告、私有新目录，不是桌面原生保存或R扫描。U仅合成内存输入，baseline不声称重复键/深度等新算法已实现。原生自然用户手势鉴真、真实用户scope、生产竞态、macOS/桌面/M1/删除仍未验收。

文档最终审计曾发现总控误将最新内容写入旧冻结M1计划，已从原Git blob恢复旧字节，最新计划另存[M1追加计划](../../M1-PARALLEL-WAVE-PLAN-20261018.md)；修正记录和最终全部291哈希/145份归档/四票一致性结果同存证据目录。没有改旧锁来迁就文档变更。

下一波依本波独立收单验收结果出齐可并行项，纵向宿主接线须等R/S/T真正交付；见[依赖计划](PARALLEL-WAVE-PLAN-20261018.md)。
