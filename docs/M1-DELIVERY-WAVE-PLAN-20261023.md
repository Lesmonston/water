# M1下一波：推进桌面基础与项目报告

2026-10-23，总控。A–AB与八补单Windows受控通过，原工单无需重贴。此轮AC/AD/AE各自只依赖已具备输入，无互相写入或在途实现依赖。具体接口和冻结以ADR-017、三SPEC、TESTS与manifest为准。

交付顺序：本波三线并行 → 单票收单/隔离复测 → AC/AD接受后另票连接真正桌面和扫描/合并报告 → 明确授权有界真实scope再测Windows Alpha。AE同时提供Mac移植差异，实机和SDK未具备前不伪造Mac READY。新增工具分类/规则与M2仍另排，模块数量不等于M1放行。

本波状态初始DRAFT。总控会建三棵全新工作树、冻结精确基线/文件归属、实际执行各自baseline并归档后置READY；用户得到三个完整的一行外贴句。不会等待桌面依赖安装才允许AD或AE开工，也不启动本地worker/子代理。

派前：AC只真实MSVC无UI小探针+WebView2定位，尚不下载/编译Tauri；AD走真实既有AB/W/Q/Z HTTP及late公开入口；AE核当前源码/契约/来源种子可读，不假称做了macOS。AC本票首次Tauri resolve/fetch只用新私有CARGO_HOME/target，不改旧cache或全局环境。

派后：AC同SHA check/test/native，1个静态桌面窗口/0目录窗；AD同SHA check/test/browser，旧5+新3顶层都保持且实际鼠标Q/Z下载；AE同SHA文档check，不机械做负控。最终真实桌面扫描尚未运行，真实用户scope/自然同意鉴真/竞态/macOS/M1仍未放行。
