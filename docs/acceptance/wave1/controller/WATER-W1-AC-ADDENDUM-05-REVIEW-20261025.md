# WATER-W1-AC 补充单05受阻复核与补充单06派前验收

2026-10-25，总控。**05的取证交付已接收，原native严格失败保留，AC仍BLOCKED。** 完整真实根和固定依赖来源说明：当前计数把Tao事件目标也算作应用窗口。总控另冻结06计数契约，精确区分唯一应用主窗与固定框架事件根；无UI预检和干净resume通过，06 READY只回原AC对话一次验证。页面四文案和完整native成功门仍未验收。本轮0产品窗口、0构建、0依赖下载、产品未改，没有自动执行者。

## 接收与原字节

| 项 | 独立核对结果 |
|---|---|
| 接收提交 | 8a3b475918684a18be318415a9f7a54470c916b8，原worker/water-w1-ac干净 |
| 父提交/实际受测 | a3334875139a3d6b03e1e71aecb6baad7c1c6711 |
| 产品实现 | eb7f80178191e233068015bbc26dc9798ac8cb22；14文件diff为空、生产/测试摘要保持 |
| 本次diff范围 | 仅05报告及addendum-05证据；未改产品/控制文件/主台账 |
| 旧归档 | 46/77,278字节、189/10,666,362、88/4,518,684、51/295,246 |
| 新05归档 | 51项/348,184字节，source/archive/bytes/SHA与提交Git blob逐字节一致 |
| 合计 | 425项/15,905,754字节；原46的四个历史产品快照对照ef0b7c4原提交，不能误要求等于后续授权演进的产品 |
| 旧冻结 | 535唯一约束、23继承锁全部保持；原报告/归档索引哈希保持 |
| 生产摘要 | 38c7a927cb30fd79f91e5e52e875a81dcb1585b359390dca50af5b24a2d2139d |
| 测试摘要 | 211ba3014991309b2bda94cd422f4496c2ac552fa57507c3bb35283ae2acefe7 |
| Cargo.lock SHA | c56b58aa141a85617a59db4de679ff73d69827aee81bda958b1fdee0c9bbbfe8 |

[独立接收审计](w1-ac-window-20261025/controller/2026-10-25T05-48-45.439Z-submission-audit.json)、[原报告副本](w1-ac-window-20261025/worker/ORIGINAL-REPORT.txt)、[原05索引](w1-ac-window-20261025/worker/ARCHIVE.json)、[总控109项/782,189字节归档](w1-ac-window-20261025/ARCHIVE.json)。旧374项就地核验，不重复复制。未读取AA排除图片、真实用户或物理fixture。

## 真实native05的精确结论

只启动PID43004一次，Rust定位/版本/offline locked build退出0，observer与外层gate退出1。旧共享policy按Count2拒绝，mainCount1/mainIndex0，原错误为`Unexpected own top-level window count`。reported/captured=2/2、快照1次、未截断、两项readError均null；不是两个已由像素确认的用户可见窗口。

| 字段 | 自有根0 | 自有根1 |
|---|---|---|
| name/class | Water Desktop Preview / Tauri Window | 空串 / Tao Thread Event Target |
| type/WindowPattern | Window / true | Pane / false |
| HWND / RuntimeId | 27788410 / [42,27788410] | 38930730 / [42,38930730] |
| offscreen/control/content | false / true / true | false / true / true |
| bounds | [224,83,1268,997] | [0,0,18,18] |

[真实完整UIA及清理](w1-ac-window-20261025/worker/raw/2026-10-24T08-45-11.554Z-32552-uia.txt)、[外层native结果](w1-ac-window-20261025/worker/raw/2026-10-24T08-45-11.554Z-32552-native-result.json)。unique主窗在finally重新核PID/title/handle后由WindowPattern关闭，cleanupError=null、observer process exitCode0、外层nativeExit={code:0,signal:null}，wall=2176ms，无退出超时或终止请求。旧03/04超时/终止历史不抹除。

Count guard先失败，names=[]/pageAccepted=false，**四文案检查未到达**，不能说页面空白或已经通过。捕获1个conhost与6个WebView、真实本树私有profile命令行；存在conhost不代表这个额外UIA根是console。冻结childClose成功分支未执行；[稍后只读结束查询](w1-ac-window-20261025/worker/raw/PROCESS-END.txt)确认主/子8个捕获PID均已不存在，这是另一条证据，不记为原childClose门通过。三次allocation全部已用，不重试05。

## 固定来源与计数修订依据

对现有tao0.37.2压缩包独立校SHA，并在有界内存tar中找到唯一event_loop.rs，与既有展开文件逐字节比较，没有解包落盘、运行上游或下载依赖。Apache-2.0，仓库为https://github.com/tauri-apps/tao。实际依据是[冻结来源元数据](../../../../contracts/desktop-bootstrap-window-v1/FRAMEWORK.json)中的发布包与文件哈希：

- crate SHA：d5777b06fe6435126ae8d816eba269e050e1e10d302cf5461e9c49eccabc3548。
- event_loop.rs SHA：bfe777ba15f00b9ca2a1fdd5093b2b02102dbafb5d23eca9f002d1f0c40eaf8a。
- 发布文件188行调用、628行函数、629行类名、650–672行创建、680–687行样式更新，支持这是框架事件投递目标的判断。

包声明Git SHA2d9b2ba15247879787878ae565e350bcc1b9f622且**dirty=true**。已查阅[固定Git文本的对应函数](https://github.com/tauri-apps/tao/blob/2d9b2ba15247879787878ae565e350bcc1b9f622/src/platform_impl/windows/event_loop.rs#L586)，远程函数位于586行、类名587行，与发布文件行号不同；它只作上下文，未声称等于发布树或完成在线字节哈希比较。[Microsoft layered-window说明](https://learn.microsoft.com/en-us/windows/win32/winmsg/window-features#layered-windows)支持理解创建和显示机制；源码中的layered意图不等于本次像素不可见证明。该创建函数未建立可要求alpha0读回的设置，本轮不加入这种假设。[来源复核记录](w1-ac-window-20261025/controller/SOURCE-REVIEW.json)保留界限；worker首次可选checksum文件读取ENOENT仍保留于原始证据。

总控据此**明确把验收语义改为一个应用主窗，至多一个精确固定框架事件目标，未知/无效根0**，详见[新SPEC](../../../../contracts/desktop-bootstrap-window-v1/SPEC.md)。原始数量2和全部行仍保存，不普遍忽略Pane/offscreen/handle0，也不让任意Count2通过。helper要求同自有PID、空name、精确class/type/WindowPattern、非零独立HWND、[42,HWND] RuntimeId、完整布尔字段，bounds原点0、宽高0–64，且包/锁/源码SHA吻合。64是保守验收界限，超出即停，不推断有害或自行扩宽。

初次与页面观察后的关闭前快照都须满足新契约，主PID/HWND/RuntimeId保持一致。新增第二主窗/helper、未知根、属性读取错误、不完整或重复身份仍失败。finally只清理精确已知主窗，原失败、清理与外层终止分别记录。两次有限采样不冒称覆盖全部瞬时窗口或生产竞态。

## 实际无UI派前验证

| 检查 | 实际结果与界限 |
|---|---|
| 三新PS1 ASCII/Parser | 均通过；工作文件CRLF，Git规范化LF；原helper冻结保持 |
| 静态UIA属性 | 十个CacheRequest绑定通过，不调用RootElement、不枚举窗口 |
| 历史05快照回放 | 旧规则仍拒绝；新规则分出raw2/main1/helper1/unknown0。只回放已归档数据，没有新的native通过 |
| 41分类边界 | 5个合法形态、36个拒绝，包括额外根/主窗/helper、pin失败、offscreen/handle0、各属性变化、bounds超界、重复/缺失/错误 |
| 4个主窗绑定检查 | 同一身份接受，PID/HWND/RuntimeId变化拒绝；运行共享同一函数 |
| 文案 | 未改HTML四文案存在；共享policy逐一缺失均拒绝。不是实际渲染证明 |
| 依赖来源 | 锁、crate、源码SHA及唯一tar成员逐字节一致，resume/preflight均通过；native保留启动前门 |
| 既有证明 | capture/reuse/rustEnv函数逐字相同；03同干净82d04aa final check/test与02先红/两负控/恢复复用，所有非计数native成功断言保留 |
| 原树resume | 干净8a3b475，542约束及14文件通过；0窗口、无新reservation |

[冻结预检](w1-ac-window-20261025/preflight/2026-10-25T05-55-13.968Z-28028-preflight-result.json)、[干净resume](w1-ac-window-20261025/preflight/2026-10-25T05-57-56.671Z-23648-resume-result.json)、[控制差异审计](w1-ac-window-20261025/controller/CONTROL-AUDIT.json)、[结束进程查询](w1-ac-window-20261025/controller/PROCESS-CLOSE.json)。没有再执行旧check/test/Clippy/负控/构建或新native。

总控第一次汇总归档因重复列入已在05索引内的handoff文件而退出1，发生在成功resume之后。保留[该归档错误记录](w1-ac-window-20261025/controller/FINALIZE-FIRST-FAILURE.json)和已经复制的字节；修订归档去重及现有字节比较后只恢复汇总，不重跑resume或产品。它不是native失败、负控或安全策略放宽。

## 派发与未完成范围

[补单06](../../../dispatch/tickets/WATER-W1-AC-ADDENDUM-06-20261025.md)已READY，新增7条目、24继承锁共542；其余30任务/槽位对象保持，AD/AE不重贴。旧425归档/全部失败/缓存/profile/reservation不清理。本单只回原AC对话，另增一次静态启动≤30秒/0目录窗，累计allocation4；总控本轮未使用新分配。运行来源pin、四文案、两份快照、同一主窗、正常exit0、实际profile及冻结childClose都须真实满足，才可交SUBMITTED待独立验收。

AC产品尚未集成验收；真实AA→AD、桌面扫描、真实用户scope/自然同意鉴真、生产竞态、macOS/M1仍未通过。后续强依赖接线不伪造READY。网络/代理/DNS/证书与持久Cargo配置不变，无自动子代理或另一实现者。[最终事实](w1-ac-window-20261025/FINAL-AUDIT.json)及manifest/正式票优先。

交回前[暂存与链接审计](w1-ac-window-20261025/HANDOFF-VALIDATION.json)实际通过：138个既有暂存路径、227处本地链接、109归档source/暂存字节一致、三PS1工作CRLF/Git LF正确，其余30任务/槽位及原树干净SHA保持。手写空白检查exit0，原始证据exit2，保留[原输出](w1-ac-window-20261025/RAW-WHITESPACE.log)，不清洗日志/PS1快照；验证记录及两个空白日志随后暂存，不做自引用索引。
