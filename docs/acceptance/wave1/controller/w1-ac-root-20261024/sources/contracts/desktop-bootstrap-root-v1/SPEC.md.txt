# AC补充单05：先保存自有根元素，再判定与清理

2026-10-24。补单04接收a3334875139a3d6b03e1e71aecb6baad7c1c6711，产品eb7f801未变。旧46/189/88/51证据、529冻结保持。补单04实际构建0、observer在自有根UIA Count>1时失败；它在保存具体数量和元素前抛错、尚未选定主窗，外层随后等退出超时/请求终止。真实元素/可见性、页面四文案、正常退出均未知，CUI/subsystem3仅线索，不能认定console无害或产品多窗已确诊。

本补只改总控取证/收尾工具，产品14文件只读。新desktop-native-root-policy/probe/observe由运行与无UI预检共享根判定；始终保留原严格Count>1失败，无论offscreen、handle0或类名如何，不自动排除隐藏元素，不提高允许数量。唯一已知主窗仅当精确PID/title、非零handle、Window类型和WindowPattern可用且无歧义时用于安全清理，不用于绕过额外根失败。无法读取/超界根快照失败，不能因元素缺失判成功。

新observer使用限定自有PID的UIA根子项和CacheRequest属性快照，实际先持久化reported count和至多32项的PID/name/class/type/handle/offscreen/control/content/window-pattern/bounds/runtimeId/读取失败，再计算共享判定并保存。name≤1024、class≤256、runtimeId≤32，截断或不完整必须失败。只读取自有PID，不查看无关窗口或像素；IsOffscreen只作诊断，不解释为可忽略根。旧04不存在的明细不重建。

先识别明确主窗再执行原严格根数量断言；即使Count>1失败，已确认主窗也由finally重新核PID/title/handle后请求关闭，保持失败结果。无明确目标不关闭任意根；外层只可在有界退出失败时终止自己启动的根进程并记录请求，不能写成正常exit0。根/子进程元数据和helper原始error、清理error、实际wall时间独立保留，后续超时不覆盖首次根错误。沿已核父PID链/创建时间收集至多6层32个本票WebView/conhost，未知子进程失败并保存现场，不读取其它进程内容。成功仍要求严格根唯一、四文案、正常exit0、私有profile与子WebView退出；取证完成不等于native通过。

无UIpreflight只做三PS1的ASCII/Parser、共享根policy合成边界（含额外可见/offscreen/handle0仍失败、歧义/错误PID/属性缺失不任意清理）、实际未改HTML四文案与逐项缺失拒绝、保存发生在count断言前的接线检查。它不枚举真实窗口、不执行产品/构建/下载/旧测试，不冒称真实多根故障已复现或修好。

首次及受测HEAD精确a333487且干净，14文件与eb7f801及原production/test哈希一致。原03的82d04aa check/test、02先红/两稳定负控/恢复继续复用，不重复check/test/下载/冷构建或改产品。新绝对入口scripts/ac-native-diagnostic-check.mjs，日志.local/checks/WATER-W1-AC-ADDENDUM-05；旧helper/529冻结/失败reservation不修改，新535约束。

本补给原AC执行对话**另一次且仅一次静态窗取证/验收allocation**，最多30秒、0目录窗。03和04已用两次保持，累计分配3次，不恢复旧预算。总控本轮派前0窗口。新门不得循环native；若仍Count>1，交回所有新明细和关闭结果，原因分析后另决定产品修复或严格有据的判定修订；本补不提前允许忽略任何额外根。

Rust1.95/jobs1/原镜像私有cache与offline/locked保持；每Cargo build仍600秒，native helper命令最多25秒以预留退出收尾，实际产品墙钟仍≤30秒。无持久Cargo或网络/代理/证书修改。只使用既有自有bin/profile/日志，不扫描真实数据/物理fixture，不接AA/AD，不截桌面或AA图片。

新报告docs/dispatch/reports/WATER-W1-AC-ADDENDUM-05-REPORT.md，新证据docs/acceptance/wave1/ac/addendum-05/。永久写范围仅这两类；14产品/测试/锁只读，旧报告/归档374项保持。实际命令/退出/根记录/primary与cleanup错误/正常或强制退出/预算等按原字节source/archive/bytes/SHA保留，不进Git cache/target/binary/profile，不清理、不push/merge/改台账或启动其它实现者。AC仍未验收，桌面扫描、用户scope、生产竞态、macOS与M1未通过。
