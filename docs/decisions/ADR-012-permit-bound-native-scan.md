# ADR-012：P许可到原生遍历、A报告与Q脱敏的纵向链路

2026-10-18，采纳。R独占packages/native-scan，仅Windows x64；原生选择器单独后排，不依赖其在途实现。R必须接真实P RegisteredScope和可变Registry，由R.begin_scan取得本次真实ScanPermit；结束/失败/取消/observer unwind均释放本次attempt，不能影响宿主已有的其它活动attempt。没有序列化权限或接受WebView/LLM任意路径的入口。

R使用真实N候选根检查和P许可根身份，另开只读目录枚举句柄，二次核对实际句柄ID后才列目录。子项只以父目录活句柄+一个经验证的UTF-16名称调用NtCreateFile(FILE_OPEN、OPEN_REPARSE_POINT)，不拼绝对子路径或read_dir递归。只查属性/ID/逻辑长度，不读普通内容/ACL/配置、不写数据/删/移/提权。unsafe仅新的native_windows.rs，两个原生声明NtCreateFile、GetFileInformationByHandleEx，另标准库OpenOptions/last_os_error；其余模块deny/forbid unsafe。

目录记录按实际x64 FILE_ID_BOTH_DIR_INFO字节布局做有界解析，不能把可变长内核buffer直接cast成Rust尾数组引用。公开纯内存decoder/名称validator只返回未授权名称数据，不能生成handle/permission。默认扫描始终真实native，无可由输入/环境切换的假IO；observer只为进程内进度/取消。

新water.native-scan.v1保留Windows128位身份和partial/cancelled/Unknown，直接组装保守unknown/protected的真实A报告；Q作为真实依赖提供默认脱敏内存JSON。不得改写旧F/G/J/K/O实验室协议、把Windows身份伪装Unix、从名字降级保护或声称卷唯一/回收量。新侧车不是匿名数据，默认保存接线以后只使用Q输出。

目录对象在调用时绑定，不承诺稳定快照或被并发移出根后的永久路径包含。race_protection_verified/native_user_gesture_authenticated恒false；P确认仍是可信宿主声明。原生选择器、桌面保存、真实用户目录、恶意竞态/macOS与删除未验收，M1仍未完成。

总控固定一层ABI探针已验证P根身份、Nt相对打开、同文件硬链接ID、14字节逻辑长度、junction自身打开和7个根名称；没有递归或新R产品。派前还需冻结契约/工具/测试、r独立树和实际baseline。全部旧任务/227旧冻结/产品/根Cargo和旧现场保持；新物理fixture仅冻结工具在本次controller和r本树.local创建，全部保留，无自动实现者。
