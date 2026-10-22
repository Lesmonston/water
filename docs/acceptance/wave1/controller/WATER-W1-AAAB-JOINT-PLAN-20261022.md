# AA→AB 补单后的真实联合验收计划

2026-10-22；总控执行，先完成补单收单与隔离五测/late回归，再执行本计划。不是实现者的物理权限扩展。

- 候选树固定为 `F:/new/smaltalk/water/.worktrees/integration-aaab-addendum-20261022`，从主线4365f29合入AB补单接收2fedfeb；AA代码保持已验收b3a874d。
- 只使用冻结工厂在该树`.local/root-marker-fixtures`创建/验证的524474字节合成夹具，初始目录固定`batch-v1/good`，系统选择仅确认此目录或取消。不读真实用户目录、HOME、上游、凭证。
- 本次总控预算 **4次系统目录窗口，总墙钟180秒**；四场景各一次，单个UI helper最多20秒，无自动重试。默认false完整、显式true完整、显式true选择取消、显式true在选择确认前请求扫描取消。超时/失败即保存日志并关闭自有进程；重做前必须记录失败与剩余预算，不能重复弹窗。
- 一个实际AB公开`launchProjectWorkspace`固定启动一个AA程序，同一宿主贯穿四场景。一个私有headless Chrome，明确不使用用户profile。只截该Chrome的受控页面，不截桌面或原生窗口；AA原四张无效截图继续排除，不读取/复制像素。
- 核默认false、每次重置/活动时禁用；真实AA/S→R/Z→AB→W/Q路径、当次结构证据附件鼠标下载原字节、取消无证据、两条历史淘汰关闭W端口/清除证据、跨源/缺token拒绝且不启动任务、正常shutdown及自有进程/端口关闭。两尺寸检查无横向溢出。
- 真实`capture_registered`末条observer取消另在无窗口受控probe验收；该精确边界不以普通UI合作取消冒充。partial仍是冻结协议的同步内存变体。
- 原生选择由有界UIA自动操作。此验收不宣称自然用户手势鉴真、真实用户scope、生产竞态、macOS、桌面打包或M1通过。
- 所有新日志、失败、受测源码快照、受控截图、实际下载和索引保留项目内；不归档缓存、二进制、profile、fixture payload。不清理旧现场，不改产品以修复验收。
