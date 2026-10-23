# 未来 macOS 实机验收计划

2026-10-23，WATER-W1-AE。所有下列用例均为未执行、未验证的计划，不是当前测试结果；本票只运行 Windows 上的三项文档检查。对应组件与来源见 [GAP-MATRIX.json](GAP-MATRIX.json)、[SOURCES.json](SOURCES.json) 和 [DESIGN.md](DESIGN.md)。

## 开工条件与环境记录

总控须另发正式票，冻结新版契约、唯一工作树/分支/精确基线、全部文件归属、可运行测试清单和合成工厂；本计划不授权创建样本或打开窗口。依赖安装/SDK/远程机器权限属于之后的单独环境单。本票不要求此时提供 Mac、Apple 账户、证书或凭证。

每台实机记录：macOS 产品版本/精确 build、硬件型号、Apple Silicon arm64 或 Intel x86_64、是否 Rosetta、进程实际架构、Rust/cargo 版本和目标 triple、Xcode/CLT 精确版本、SDK 版本与路径、部署 target、Tauri/Wry/ObjC 绑定依赖锁 SHA；记录是否原生编译/执行。至少一台 arm64 真机与一台 x86_64 真机各自通过才可声明两架构实测；Rosetta/交叉编译不替代缺失平台。若只获一台，范围据实收窄。

记录测试卷类型、APFS 大小写模式、是否加密/只读、本地或外部、mount 身份与可用卷能力；使用 APFS 大小写敏感/不敏感各一组。未提供的 HFS+/网络/外置文件系统均未验证，初期拒绝不支持卷。SDK 字段/flags/ABI 根据该环境 headers 或成熟绑定核验，保存固定来源/版本，不根据 XNU main 的 man 快照猜测支持版本。

记录 sandbox 开启与否、签名方式/entitlements 摘要（不含身份私密材料）、测试账号权限和已存在的访问许可。sandbox 与非 sandbox 分开运行，默认不启用全盘访问或 sudo；权限不足测试失败后不自动更改系统权限。签名/notarization、Developer ID 采购、公证上传、商店/DMG 发布另行决定，均不作为本票授权或已完成事项。

## 合成样本及资源预算候选

每票全新独立树，只用其 `.local/macos-fixtures/<run-id>/`，工厂提前校验绝对边界、无 symlink 祖先、唯一新 run、预定精确对象数/字节上限；验收只读，全部样本和日志保留，不递归清理。各票不得访问旧 Windows fixture、其它树、HOME、用户项目或凭证。挂载映像、权限拒绝样本和并发写入器也须由后票明确授权，不能顺手扩权。

候选工厂清单：正常根/子目录；根内与根外的空 trap 目录；祖先/根/子 symlink、环与断链；两个名字指向同一合成文件的 hardlink；只读/无 search 或无 list/read 权限目录；预定名称替换/移走的对象；大小写变体和 Unicode 组合/分解及不能表示为当前 RelativePath 的名字；固定 package.json 的缺失、空、有效、重复键、坏 UTF-8/BOM、深层/错误 shape、目录、symlink、hardlink，以及 262144/262145 字节边界。所有正文都由工厂合成，不从真实项目复制。

预算候选须在正式票落地：一树一检查、jobs=1，无 watch/coverage/整仓测试；普通命令最多 180 秒，冷依赖构建需环境单单独定限。元数据测试 max_depth=8/max_entries=10000/max_dir_entries=256，超限样本精确有界。每个并发写入器至多 100 次操作或 5 秒，超时记失败、停止该用例，不无限重试。大小、枚举缓冲和 fd 峰值均记录实值。

本票实际窗口=0。未来 S 原生单候选最多 4 次面板，每次最多 30 秒，覆盖取消、选中非初始子目录、重复根、容量满；错误自动化不自动重开。未来 AA/桌面联合单候选单次 1 桌面窗、4 次顺序目录面板、总墙钟 180 秒，每窗仍最多 30 秒，另开正式票预算，不挪用 S 配额。无意外系统授权窗预算；出现额外权限提示即停止记录，交总控界定。人工选择与自动化选择分别标注，任何一种都不冒称自然同意鉴真。

## 分层用例与预期（全部待测）

| ID / 层次 | 输入或触发 | 必须观察的结果 |
|---|---|---|
| N-identity / 真实 fd | 同根重复打开、不同根、重命名后刷新、关闭再开 | 同一活对象候选身份一致、不同对象不混淆；重开不能沿用旧能力；身份不是授权 |
| N-ancestor / 实机 | 祖先、根、子链接分别指向工厂外 trap；选择到打开间替换 | 不跟随，不遍历 trap；拒绝/Changed 或受保护 link；不能只检查终项 |
| N-volume / 实机 | 不支持卷、跨 mount/device、卷消失 | 有界失败或 OutsideScope/对应冻结错误，无 fallback；无合成 mount 时该项记未测 |
| N-names / 两类 APFS | case 变体、组合/分解 Unicode、不可表示字节 | 不按展示字符串合并身份；不偷偷规范化后重开；不能表示时记覆盖缺口 |
| P-capabilities / 纯内存逻辑+真实租约 | 错 registry/scope、陈旧 permit、finish 后使用、revoke 后使用、active 时再次 begin | 拒绝；失败 begin 不取消已有 attempt；关闭仅自己的 fd/scope |
| S-cancel / 真 GUI | 从新受控初始目录取消/关闭面板，随后开始新 job | None/选择取消，不读取/注册/扫描；不回用上次路径，事件只一个 terminal |
| S-selection / 真 GUI | 实际选中与 initial 不同的受控 nested | 仅 selected URL 绑定到真实 N/P 根；后台调用不创建 AppKit 面板，主线程可响应取消 |
| S-registry / 真 GUI | 已满、重复根、confirm 刷新失败 | 本次 pending/租约释放，已有登记不受损，系统面板关闭，不弹重试循环 |
| S-scope / sandbox 实机 | 标准面板隐式 scope、显式 bookmark 的候选单独用例、拒绝访问 | 来源与 start/stop 所有权可追踪；失效/stale 不授予能力；文件权限拒绝仍可出现 |
| R-metadata / 实机 | 普通文件、子目录、link、特殊类型（正式工厂批准后） | 正文读取 0；父 fd 单名打开；仅逻辑长度/身份观察，未知仍保护 |
| R-limits / 实机 | 深度/条目/每目录上限与超一；无 search/list 权限 | 明确 partial/issues，已有结果保留，内存和 I/O 有界；不把拒绝当空目录成功 |
| R-mutation / 实机并发 | 消失、目录移走、名字被文件/链接替换、枚举中增删 | 跳过/不完整/拒绝，trap 无访问；不声称原子快照或全部恶意竞态已防护 |
| Z-consent / 类型边界+实机 | 未取得额外 consent、错/已撤销 permit、默认 Skip | 无内容 I/O、不能从 JSON 构造 capability，编译拒绝有正例对照 |
| Z-content / 实机 | 固定清单正常/缺失/目录/links、精确 cap/超 cap、坏编码/结构 | 仅同 fd 有界读取；多链接/链接/特殊对象拒绝；missing 与 failed 区分；U 收原文本 |
| Z-change / 实机并发 | 读前后长度或对象替换、同长度原地改写、读中 hardlink 变化 | 有证据的变化必须拒绝；不能检测的同长度改写如实记录剩余风险，不能冒称 race verified |
| AA-choice / 实机组合 | true/false 每次显式选择、不同 job 切换 | choice 不跨 job 继承；metadata 与额外内容 sidecar 分离，失败保留 metadata |
| AA-late / 实机捕获+消费者回放分开 | 最后 observer 或 partial 后内容前取消 | 精确时序见下节；completed/partial 元数据保持，额外内容 skipped/scan_cancelled |
| AA-release / 实机+受控 Rust harness | observer panic、输出失败、begin 失败、finish 刷新失败、正常结束 | 已有 caller scope/attempt 保留；新 attempt 结束，新登记撤销；无 fd/security scope 泄漏；下一次任务可开始 |
| Desktop-boundary / 真 Mac WebView | 内嵌页面、外部/近似 host/file URL、脚本/IPC 越界输入 | 真实生产导航/CSP/IPC 拒绝；无任意路径/shell，私有 WebView 数据目录，关闭后正常退出 |
| Export-boundary / 真整链 | 同一次选择的 Q 与 Z 附件下载 | 原字符串 UTF-8 bytes/SHA 精确相等；取消无结构附件；不出现路径/dev/inode/bookmark/正文/hash/原 errno |
| Capacity / 实机观察 | APFS clone/sparse/压缩/snapshot 场景，仅另获工厂权限后 | 逻辑大小与物理分开，allocated/reclaimable 仍 unknown；不写回收量、不执行删除 |

UI 错误净化还应使用带“伪凭证/伪路径”哨兵的合成错误输入，检验 stderr/HTTP/DOM/下载只含冻结错误码；不得以查看真实凭证验证脱敏。

## 精确取消时序与 partial 保留

以下使用真实 R/AA 的公开 observer/token，测试记录最后已进入的生产步骤与读取计数；mock 只可验证协议状态，不能替代原生文件访问证据。不得为制造期望结果在消费者改写 metadata 状态。

1. **预取消**：start 后选择确认前 token 已取消；选择可正常收束，R 已取消或没有正文读取；true marker skipped/scan_cancelled，false not_requested。
2. **非末条取消**：在存在真实下一候选的 observer 内取消；下一检查应感知，R cancelled，保留已记录项，Z 零读取。
3. **最后文件 observer 取消**：固定目录只有一个末条文件且没有真实后续枚举步骤；R 可以 completed，AA 内容前 token 门返回 skipped/scan_cancelled。不得追加虚假最终 R 操作把它改成 cancelled。
4. **partial 后内容前取消**：真实权限/预算造成 partial 后、内容开始前取消；保持该 partial 元数据和 Q，Z 零读取。若要冻结同步 seam，应先审阅接口，不向生产加入测试后门。纯内存 partial 变体只记消费者回放。
5. **内容前后的竞态取消**：记录 consent 取得、首字节与取消顺序；首字节之前已观察取消必须不读；读取已经开始后不承诺 v1 无此参数的即时中断，不把已读的事实抹掉。需要逐块取消须先接受新版语义。
6. **终态/释放后迟到取消**：一次 terminal、active 清空、旧 job cancel 不影响新 job；shutdown/EOF 不回用 scope，也不阻塞主线程 run loop。

completed/partial+skipped 两类结果各通过 assertMarker、WorkspaceState、真实同源 HTTP 三入口，共六项消费者检查；原 Q bytes 与已记录 status/summary 保持，证据附件 404，下一次默认 false 不继承同意。该消费者回放与真实 Mac AA 捕获分别留证，不能用适配的 dialog envelope 冒称真的开过 S。

## 生命周期与整链放行

每例记录命令/退出码、精确产品与测试提交、SDK/锁哈希、source/archive/bytes/SHA、原始 stdout/stderr、fd 峰值/前后计数、隐式/显式 scope acquire/release、attempt 创建/结束/撤销和进程/端口。日志只含合成 ID。资源计数允许框架固定开销，须预先定义比较基线；不假设 GUI 框架退出前 fd 总数归零。普通 panic 与 abort/强杀分开：Drop 的 unwind 用例要求正常释放，abort 记录 OS 回收/宿主重启行为，不计为 Drop 通过。

先单票 N/P、S、R、Z；再 AA 实机组合；最后等待 AC/AD 必要前置接受并冻结新桌面整链票，运行真实 Mac panel→P lease→R→Q/Z→同源报告→桌面显示/实际点击下载。捕获来源/job/同意必须属于同一次选择，不向测试补运行时缺失配置；原始附件独立比对，不仅比较 JSON 重解析对象。真实用户 scope 是之后另一个明确授权范围的验收，不以合成整链替代。

无 Mac/缺 SDK/权限或 API 契约冲突时保留现场与未验证项，交受阻回执和最小需求，不临时放宽、不换机器偷偷续测。意外窗口/超时/后台子进程未结束时停止，不循环重试；只终止可证明为本票所有的进程，记录实际终止数。验收截图仅自有固定窗口，未看图不得写已看；不截整个桌面。

只有总控在独立受测提交复验后更新平台状态；单元/mock、交叉编译、macOS 单票、完整桌面、真实用户 scope、M1 和可发布是分别的门槛。本票结束时这些均未通过。
