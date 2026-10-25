# WATER-W1-AC及补充单06：Windows静态桌面基础验收与集成

2026-10-25，总控。**AC及补单06 VERIFIED（Windows静态桌面基础）**。接收29a895d，产品实现eb7f801的14文件未改；隔离无UI受测提交b417835已快进主线。06真实native成功证据、实际页面文本/双快照/主窗退出/子进程收尾已独立审计，公开库在隔离集成树完成首次总控独立编译和反向输入验证。本轮总控未开新桌面窗口，没有Cargo/Tauri构建、依赖下载、产品修补或网络配置修改。原03–05失败与四次worker窗口历史全部保留，不再外贴旧AC票。

## 提交、范围与原字节

| 项 | 实际核对结果 |
|---|---|
| 接收/worker树 | 29a895d7efa7f4a547d23ff74eb92729740d289d；worker/water-w1-ac，原树干净 |
| native受测干净HEAD | 8a3b475918684a18be318415a9f7a54470c916b8 |
| 产品实现 | eb7f80178191e233068015bbc26dc9798ac8cb22，14文件与本次记录/原提交逐字节一致 |
| 复用unit/check final | 补单03同干净82d04aaeef73030f65bc0a070b99a5517fd5d6a3；先红/两负控/即时恢复复用02有效证据 |
| 本次worker差异 | 仅06报告及addendum-06证据，无产品/控制/共享文件修改 |
| 全部worker归档 | 46/189/88/51/51/54，共479项/16,293,091字节；source/archive/bytes/SHA及提交blob全部核对 |
| 旧快照例外 | 原46中四个历史产品快照对照ef0b7c4原提交，不能误要求等于后续授权演进产品 |
| 生产/测试摘要 | 38c7a927cb30fd79f91e5e52e875a81dcb1585b359390dca50af5b24a2d2139d / 211ba3014991309b2bda94cd422f4496c2ac552fa57507c3bb35283ae2acefe7 |
| Cargo.lock SHA | c56b58aa141a85617a59db4de679ff73d69827aee81bda958b1fdee0c9bbbfe8 |

[成功收单审计](w1-ac-accepted-20261025/controller/2026-10-25T06-44-42.349Z-submission-audit.json)、[worker原报告](../../../dispatch/reports/WATER-W1-AC-ADDENDUM-06-REPORT.md)、[06原归档](../ac/addendum-06/ARCHIVE.json)。原报告/缓存/target/profile/失败reservation均保留，未读取AA排除图像或真实用户/物理fixture。

## 06真实native证据

[原native结果](../ac/addendum-06/raw/2026-10-25T06-21-48.141Z-42780-native-result.json)的工具定位、版本、offline/locked build、observer、冻结childClose及外层launcher全部退出0。PID6856，一次新增allocation，产品启动/关闭及子进程收尾段5510ms；整门含审计和构建的37秒不混称产品窗口时长。

[完整原始UIA](../ac/addendum-06/raw/2026-10-25T06-21-48.141Z-42780-uia.txt)保留初次06:22:19.4264088Z、关闭前06:22:22.7850136Z两份完整快照：均raw2/主窗1/固定Tao目标1/未知0/无效0，无截断或读取错误，原始2没有改成1。

| 字段 | 应用主窗 | 固定框架事件目标 |
|---|---|---|
| name/class | Water Desktop Preview / Tauri Window | 空串 / Tao Thread Event Target |
| type/WindowPattern | Window / true | Pane / false |
| HWND / RuntimeId | 61933540 / [42,61933540] | 29231650 / [42,29231650] |
| offscreen/control/content | false / true / true | false / true / true |
| bounds | [128,83,1268,997] | [0,0,18,18] |

两份主PID/HWND/RuntimeId一致；本次真实主窗后代文本命中“Water”“桌面壳已启动”“尚未接入扫描”“只读开发预览”，pageAccepted=true。finally重新核绑定并关闭主窗，cleanupError=null、observer主进程exitCode0，外层nativeExit={code:0,signal:null}，没有退出超时、终止请求或手动终止。UIA是结构/文本观察，不冒称像素看图。

实际捕获conhost20424、WebView32584及42840/39540/41044/40880/15888，私有user-data-dir位于原树.local/desktop-webview/preview-6856-1792909338074288100/EBWebView。[冻结childClose成功分支](../ac/addendum-06/raw/2026-10-25T06-21-48.141Z-42780-native-6.log)这次实际执行且remaining=[]；[补充结束核查](../ac/addendum-06/raw/PROCESS-END.txt)一致，不再用05的稍后查询替代该门。四次worker allocation全部已用，总控不增加窗口分配。

tao0.37.2锁、压缩包、发布文件SHA及唯一tar成员由冻结06入口在启动前和前后审计通过；元数据与现有[FRAMEWORK.json](../../../../contracts/desktop-bootstrap-window-v1/FRAMEWORK.json)一致。dirty=true的包声明Git SHA不冒称精确发布树，offscreen=false与非零HWND保留。接受的是06已明确冻结的应用窗口计数契约，没有通用忽略Pane、offscreen或handle0。

## 隔离集成与独立无UI验收

唯一树为.worktrees/integration-ac-20261025，分支controller/water-w1-ac-integration-20261025。no-checkout加non-cone sparse只落地AC产品/报告/证据及必要属性文件；没有复制AA排除图片。按原顺序导入八个已审计AC提交，最终无产品冲突或修补，[原提交→集成提交映射及逐字节核对](w1-ac-accepted-20261025/controller/2026-10-25T06-55-13.856Z-index-recovery-prepare-result.json)保留。AC以外树对象未变。

受测及集成HEAD为 **b4178355bbb135ca689fa3924ea267e313184941**。[控制边界](../../../../contracts/desktop-bootstrap-acceptance-v1/SPEC.md)和[547冻结](../../../../contracts/desktop-bootstrap-acceptance-v1/freeze.lock.json)在执行前保存；542旧约束保持、25继承锁、新增5条目。恢复和补充校验脚本另按执行前源SHA固定/归档，旧冻结不改。

总控用Rust1.95直接重新编译实际公开lib/src/v1.rs，显式链接既有已构建的serde及serde_json依赖rlib，记录原文件和fingerprint SHA，前后只读一致；不是复用旧Water二进制。输出/TEMP只在新验收树.local/acceptance。没有Cargo、Tauri bin或上游build脚本执行，也没有重新运行旧负控。

[独立Rust检查原记录](w1-ac-accepted-20261025/controller/2026-10-25T06-56-24.714Z-31768-check-result.json)中，新编译库上的原三项测试全部通过，无skip/ignored；独立矩阵另实际通过137个配置拒绝、73个导航拒绝、2个配置正向、24个导航正向，以及实际内嵌资产/脱敏错误。覆盖类型变化、重复字段、尾随输入与大小上限、精确origin/path/query、Unicode/control、fragment语义。该原检查最后因总控回放工具数组包装错误退出1，不能把整个原记录说成passed；已通过的Rust部分没有重跑。

[补充回放完成记录](w1-ac-accepted-20261025/controller/2026-10-25T06-59-19.851Z-check-completion.json)绑定同一干净b417835及14源码哈希，重用上述已通过Rust部分，只运行纠正后的无UI回放。两份实际06快照经原冻结纯policy独立复算接受，旧Count>1 policy仍拒绝；5个未知/第二主窗/第二helper/读取错误/错PID变体及4个必需文案缺失均拒绝。真实main的配置validator、导航validator、单主窗、私有目录、禁JS/拖放/devtools/新窗/下载/权限和reparse保护静态接线核对通过，生产字节没改。

这里的native成功来自worker受测8a3b475；总控在相同产品字节的集成树做独立公开库测试和保存数据回放，**没有在集成路径重新构建/运行Tauri窗口**，也不称为一次新的Cargo final check/test。两次有限快照不证明全部瞬时窗口或生产竞态。

## 失败保留、快进与范围

[总控修正记录](w1-ac-accepted-20261025/controller/CONTROLLER-CORRECTIONS.json)保留三类工具问题：首次收单误把空PID数组当数量；稀疏no-checkout的空索引及未落地属性文件需显式初始化；PowerShell5管道包装数组造成回放变体克隆失败。全部失败JSON/原始命令/stdout/stderr已归档，不当作产品红或有效生产负控。索引修正仅恢复已核元数据和两个文本属性文件，无reset/clean/删除；回放v2逐项克隆对象，执行前SHA已记录。没有因此重试native、Rust测试或修改产品。

[主线快进记录](w1-ac-accepted-20261025/controller/MAIN-INTEGRATION.json)确认69df0d0→b417835、ff-only，无覆盖他人改动。[当前进程核查](w1-ac-accepted-20261025/controller/PROCESS-CLOSE.json)没有本worker/验收树所属产品及WebView残留，手动终止0，原profile保留。

[总控归档](w1-ac-accepted-20261025/ARCHIVE.json)共172项/5,906,514字节，含Git索引/路径元数据与所有失败记录、定向编译/测试、源快照和快进记录；不包含AA图片内容、依赖rlib/cache/crate、测试二进制/TEMP/profile。worker479项已随原提交集成，不再重复复制。原始日志空白非零保留，手写材料与原证据分别检查。[最终事实](w1-ac-accepted-20261025/FINAL-AUDIT.json)记录当前验收边界。

AC/06及其槽位改为VERIFIED，其余30任务/槽位对象原样保持，02–05的BLOCKED/失败历史不追改。旧票无需重贴，无自动实现者。AC静态桌面前置已解除，但真实AA→AD、桌面→AA/AD扫描整链、用户scope/自然同意鉴真、生产竞态、macOS/M1仍未验收；下一波先冻结接口、独占文件、范围和实际baseline，再出READY票。

[交回暂存审计](w1-ac-accepted-20261025/HANDOFF-VALIDATION.json)实际通过：199个既有暂存路径、229处本地链接、479份worker和172份controller归档原字节、547约束、14产品文件及原两树干净状态均通过；两PS1工作CRLF/Git LF正确。手写空白检查exit0，原证据exit2，保留原始输出；验证记录及两个空白日志随后加入，不建立自引用索引。
