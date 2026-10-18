# ADR-010：原生目录身份基础与证据页面

2026-10-18，采纳。用户要求继续推进M1，A–M及五补单已收口。新增N Windows目录元数据/句柄身份基础和O L/M证据页面，两票独立、用户分别外贴，不启动内部实现者。

N以标准库OpenOptionsExt仅请求FILE_READ_ATTRIBUTES、共享读写删除、BACKUP_SEMANTICS/OPEN_REPARSE_POINT/SQOS身份级别，获取自有File句柄；使用窄FFI查询GetDriveTypeW、GetFileInformationByHandleEx的属性/tag和128位File ID。不读内容、不枚举目录，不提供递归扫描/授权/原始句柄出口；私有Lease通过std::fs::File管理寿命。路径词法与非跟随祖先检查为当前观测，不宣称解决并发替换。N仅测试本树冻结合成目录，旧F/G的Windows Unknown和所有A–M契约不变。

O独占prototypes/evidence-reader，零npm，以真实K模型复用验证六字段session，再核L/M侧车与来源关联，展示候选、观察字节、Unknown/冲突组和覆盖。入口仅调用方内存，7个固定loopback路由，未校验来源真实性或扫描权限。真实保留捕获与人工内存变体分开标记；不改K、L/M或触及物理fixture。

总控先冻结协议/测试/来源/工具，实际验证Win32 ABI能力、旧链路供数和独立Chrome，再分配精确基线/新树并跑baseline。N/O通过只缩小M1缺口；原生用户目录选择、授权与安全遍历和桌面接线后续单独放行，见M1-DELIVERY-PLAN。
