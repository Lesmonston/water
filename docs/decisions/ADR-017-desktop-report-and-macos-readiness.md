# ADR-017：桌面基础、同源项目报告与macOS移植准备

2026-10-23。A–AB及八补单Windows受控验收不改，d2a1365为本波之前的已收口主线。本波三票分别有独占文件和已验收前置，可以一起准备/外贴；READY只在实际baseline后给出。

| 票 | 本次交付 | 前置 | 文件归属 | 不依赖在途实现的验收 |
|---|---|---|---|---|
| AC | Windows Tauri依赖锁、许可证清单及最小静态桌面壳 | 已有Rust/MSVC、机器WebView2 | apps/desktop-preview | 真实编译、配置/导航validator、单窗口UIA和正常退出 |
| AD | 现有AB中的同源合并项目报告与原字节Q/Z下载 | 已验收AA/AB/W/Q/Z及late输入 | AB app/styles/server/transport/README及新project-report资产/测试 | 冻结pipe→新HTTP路由→私有Chrome实际点击/附件 |
| AE | macOS N/P/R/S/Z/AA/桌面差异、来源及实机验收计划 | 现有公开API/安全契约 | docs/research/macos-port-20261023 | 来源/当前源码SHA/差异矩阵/计划一致性，非Mac实现 |

AC没有本票AA/AB运行接线，避免把依赖缺失伪装成桌面已可用。AC唯一有新增registry依赖权限，AD零npm/新Rust，AE不安装/编译/远程登录。AC Tauri新workspace/锁自有，旧root Cargo/485约束不改。

AD保持原workspace精确API与W/Q/Z内容，新增同源报告不新增权限，当前metadata/结构的保护与来源语义原样。AB model/launch/旧五测试、新规格和依赖作为只读冻结，AD只改分配文件。

三票之间无产品写入冲突；实现收单后可分别验收。桌面→真实扫描/同源报告整链是下一波强依赖工作，须AC/AD验收后冻结，不能现在标READY。macOS产品实现/实机要AE方案和实际机器/范围，继续未验收。M2删除仍不在本波。

本波不访问真实用户数据、HOME、旧fixture或AA排除截图。派前0系统窗口；AC仅一次桌面窗口/0目录窗，AD单私有Chrome/0原生，AE无UI。未自动启动实现者，不签名/发布。
