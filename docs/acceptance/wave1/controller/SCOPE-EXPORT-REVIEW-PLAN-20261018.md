# P/Q收单独立验收

2026-10-18，总控。P接收39dfdfd/实现2e963bb；Q接收d6e135d/实现d46b93d。完成通知使两票进入SUBMITTED/IN_REVIEW，不自动通过。

先核基线祖先、分支/干净状态、白名单、实现后产品不变、227冻结、全部worker原证据与.local字节；复跑各五final，不改worker产品/报告/既有证据，仅追加.local日志。P原29项编译拒绝和成功对照另核源码/诊断及绑定SHA。

隔离controller/water-w1-pq-20261018树组装产品，使用新私有离线Rust1.95/MSVC target/home/tmp，各完整五测试/格式/clippy/metadata/真实公开桥接通过后，重建每票三个真实生产负控，完整五红、原字节恢复、完整五绿。新source/restore哈希和全部stdout/stderr保留；不把编译/缺文件/超时算行为红。

P仅只读复用p树现有4个合成目录/1junction/index，普通文件/内容均0；冻结工具有界核原结构，无新建/清理/移动/ACL/真实用户数据或遍历。独立测试补充32轮permit epoch、6 registry同ID跨用、注册复建/别名/容量错误先后。Q独立测试补充全部自由字段/ID变化不变性、scope/finding/issue反序关联、精确未知/最大值、被移除字段仍由A拒绝。两票分别按各自成功Cargo图选择产物，不把不同依赖构建的rlib混接。

补做公共能力/输出的编译拒绝与成功对照，核不可Clone/Debug/Default/Serde/公开构造或读私有字段。Q合法超大DTO的输出拒绝原测试重复验证；精确16MiB成对临界和SerializationFailed、P native错误/RootChanged不可达分支、句柄计数/竞态不冒称实测。

通过后才更新主线和VERIFIED；失败发编号补单，实质修复回派。进程内宿主确认不是原生用户手势，Q只导出内存JSON；原生选择器/permit到有界遍历、桌面文件保存、真实scope/macOS/删除及M1闭环仍待后续。
