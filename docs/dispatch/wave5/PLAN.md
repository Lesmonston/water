# 第五波计划：M2 清理 Beta

2026-10-27，总控（Claude）。依据已拍板的 [M2 计划](../../M2-PLAN-20261027.md)：用户 10-27 四条都按推荐。本页只写本波的票与顺序，理由见 M2 计划。

## 票

五张票，目录互不相交，同时派出：

| 单号 | 改哪里 | SPEC | 门 |
|---|---|---|---|
| WATER-W5-H1 清理执行器收尾 | `packages/junk-clean` | [CLEAN-M2](../../../contracts/m2-v1/CLEAN-M2.md) | 重门 |
| WATER-W5-H2 服务收尾 | `packages/water-service` | [SERVICE-M2](../../../contracts/m2-v1/SERVICE-M2.md) | 重门 |
| WATER-W5-H3 宿主打开清理 | `apps/water/host` | [HOST-M2](../../../contracts/m2-v1/HOST-M2.md) | 重门，含夹具清理闭环（1 个窗口） |
| WATER-W5-H4 界面 M2 | `apps/water/ui` | 票内“要做的” | 轻门，截图 |
| WATER-W5-H5 Rust 构建目录规则 | `packages/junk-rules` | [RULES-M2](../../../contracts/m2-v1/RULES-M2.md) | 轻门 |

执行者规则：[W5-M2-WORKER-RULES](../W5-M2-WORKER-RULES.md)。

## 派前准备（总控已做）

1. **两个检查器认第五波清单**：`WATER-W5-*` 读 `docs/dispatch/wave5/manifest.json`。
2. **离线依赖源**：两份复制到 `F:\new\smaltalk\water\.offline-cache\`（逐字节一致），本波清单从那里取。旧波次清单不改。
3. **夹具清理闭环**：
   - 桌面检查器的 native 模式新增：生成合成夹具、预置设置（七个分类关闭，另加夹具文件夹；受保护位置仍只读统计、不可勾选）、结束后核对夹具删留与清理记录；
   - 总控在自检树（只把清理开关打开）里用同一份配置跑通（10-27）：1 个窗口，17 秒，夹具缓存目录 3,145,815 字节删除、失败 0，源码文件与浏览器配置原样，日志有 intent 与 result，退出码 0。证据在 `docs/acceptance/wave5/controller/selftest/h3/`。

## 合入后

1. 五票各自验收：
   - H1～H3 走重门：新树 final、总控负控、独立审查；
   - H1 另跑总控快照与竞态用例；
   - H3 在真窗口里清夹具，开窗前告诉用户。
2. 第三次主线整合检查，含夹具清理闭环。
3. 新的 release 版。
4. M2 计划第 3 节的自清理：用户本人按清理按钮。
5. M2 达成报告与交接。
