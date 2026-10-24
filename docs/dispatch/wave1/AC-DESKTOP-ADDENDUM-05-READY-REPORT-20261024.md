# AC补充单05 READY：保留严格判定，先补真实根元素证据

2026-10-24。原04接收 `a3334875139a3d6b03e1e71aecb6baad7c1c6711`，产品 `eb7f80178191e233068015bbc26dc9798ac8cb22` 未变。**补单05 READY，仅表示无UI预检与原树续做条件已通过**。真实多根原因尚未确定，04失败及两次已用窗口不抹除。

新工具先保存实际数量/有界自有根明细，再按同一Count>1判失败；offscreen/handle0不自动忽略。已明确识别主窗时失败也安全关闭，保留首次错误及退出结果；不代表取证完成就能验收。总控本轮0窗口/0下载，产品14文件未改，check/test与负控照旧复用。

只将以下一句贴回原AC执行对话：

```text
请读取 F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W1-AC-ADDENDUM-05-20261024.md，继续执行 WATER-W1-AC 补充单05。
```

首次HEAD精确a333487且干净。入口F:/new/smaltalk/water/scripts/ac-native-diagnostic-check.mjs；仅一次resume→native --final，不重跑04/check/test/下载。另一次静态窗/≤30秒、0目录窗allocation单独记录，累计分配3次，旧两次保持。如仍多根，保存所有新明细后受阻交回，不能忽略额外根或修产品。

[受阻复核](../../acceptance/wave1/controller/WATER-W1-AC-ADDENDUM-04-REVIEW-20261024.md)与[最终审计](../../acceptance/wave1/controller/w1-ac-root-20261024/FINAL-AUDIT.json)。AC仍BLOCKED、未集成；原529保持，新535，其他30票/槽位不变，真实桌面扫描/用户scope/macOS/M1未验收。
