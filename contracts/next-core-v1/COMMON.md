# N/O共同执行与证据

总控冻结，外贴实现；旧A–M任务对象、冻结/helper/产物不改。独立n/o树，新协议/测试/辅助锁继承八旧锁。权威票面/manifest在主检出，执行树基线早于票面，不merge取票。

scripts/next-core-check.mjs负责范围、冻结、资源和字节证据，非OS沙箱。baseline只测已存在工具/输入/Win32 ABI或空白Chrome，新N/O产品不存在、五产品测试未运行。N仅由scripts/prepare-native-root-fixtures.mjs在本树.local创建一次有界fixture（两正常目录、嵌套普通文件、trap目录/小文件、终项和祖先junction），复用既有index，不清理/重造。生产/测试Rust只读；O无物理fixture权限。非项目目录/HOME/盘根/真实数据、ACL/删除/移动/上游/联网安装禁用。

每票精确五顶层，完整test/suite及所有red不得删/过滤/skip。先完整测试+可编译骨架red-behavior，再实现，suite绿；完成fmt/clippy稳定后逐项临时改坏真实生产逻辑red-nc1/2/3，立即原字节恢复并suite全五绿。编译/缺文件/超时/测试开关不算红。helper保存生产/测试源码原字节SHA和完整输出；final核每项最新有效红在下一个有效红前有当前源码/测试字节的恢复suite。若后续字节改变，相应重录，不把事后负控描述成已证实历史先红。

私有.local构建/log/profile全部保留，一树一次一个门，Rust jobs1/offline/locked，O最多一个Chrome；单子命令180秒。实现提交后同一干净SHA逐门--final，随后仅追加报告/证据。归档helper json/log/txt/png原字节；不纳二进制、缓存、fixture内容。显式文件名add，log用-f，无批量git add、reset/clean/merge/push。报告逐需求、完整SHA/命令/退出码/日志/负控哈希/实际模型/未验证项。Windows不是macOS，ABI基础不是扫描授权，页面不代表真实扫描，M1未完成。
