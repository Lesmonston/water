# V→W 总控有界联合验收

2026-10-19。本计划落实 ADR-014 和 V/W 原票要求，在 W 补单01独立验收通过后运行真正固定启动器；不派新实现者。总控只写验收材料，不修改产品。

- 隔离集成树：`F:/new/smaltalk/water/.worktrees/integration-vw-20261019`；从主线 `50d783d` 合入 W 接收 `df9255b`，包含 V 接收 `ec1ee25`。精确集成 SHA 由实际 merge 及回执记录。
- 先以既有私有离线 Rust 1.95/MSVC/cache/target、jobs=1 构建真实 `packages/native-session` CLI 到固定 `.local/next-target/debug/water-native-session.exe`。不运行 V 的整套 UI 测试。W 原完整五测、冻结预算 probe、341 冻结在集成提交复核。
- 原生系统窗口总预算 **2**：选择取消、确认当前受控目录各一次。每次只调用真实 W `launchNative({initialDirectory})`；只操作由该控制进程直接启动、路径精确匹配上述真实 CLI、固定标题的系统窗口。冻结按钮工具负责实际点击，单次 UI helper 最多20秒，单次生产者最多25秒；失败保存现场，不循环重开窗口。
- 初始目录仅复用主检出原有 `F:/new/smaltalk/water/.local/native-walk-fixtures/batch-v1/root`；只读已有 `index.json` 和元数据核目录边界。无 fixture 创建、清理或普通 payload 内容读取。源 fixture 是此前冻结工厂的60字面/74逻辑字节批次，不是用户数据。
- 真实链路：V 系统取消/确认→S/P/R/E/H/Q→真实 stdout pipe→W strict readSession→固定 loopback HTTP→最多一个私有 headless Chrome→系统鼠标点击下载。取消应无快照/报告/下载；确认应真实来源、8条观察、8保护、3大小未知、预算8/10000/256、总量未知、无绝对根路径/原生身份/Q自由路径。下载与当次 Q 字符串原字节相等，筛选不能改变整份导出。
- 逐个关闭自有服务和浏览器，核 HTTP 端口关闭与本次原生 PID 退出。不终止无关进程，不枚举或清理用户浏览器资料。新增 profiles/下载/日志留原位，提交证据仅 json/log/txt/png，不提交 binary/cache/profile/payload。
- 日志写主检出 `.local/checks/controller-vw-joint-20261019`，归档到本项目 `docs/acceptance/wave1/controller/`；保留全部失败。最终记录实际窗口数、原 SHA 与集成 SHA、退出码、来源、截图实际查看和未验证项。

本次仅 Windows 受控链路，不认证自然手势/来源新鲜度、不覆盖恶意生产竞态、真实用户 scope、macOS、桌面打包/发布、删除或完整 M1。
