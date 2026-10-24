# AC国内镜像下载与原树续做准备

2026-10-24。用户明确要求国内镜像并让总控直接下载、不得修改其网络配置。本轮已完成238个Windows依赖包/35514705字节、Cargo.lock、完整source/license清单与offline fetch/metadata/resume；补单02 READY。原AC仍BLOCKED/未产品受测，不把环境成功记产品通过。

## 实际下载与检查

[实际环境门](w1-ac-mirror-20261024/environment/2026-10-24T03-11-17.382Z-32972-environment-result.json)在约48.4秒完成锁生成、Windows fetch、metadata，所有子命令0。中科大与RsProxy探针均完整取得996977字节wry、2336324字节tauri索引，以及329243字节tauri源码包；两镜像同包SHA一致。选择[中科大公开配置](https://mirrors.ustc.edu.cn/help/crates.io-index.html)，按[Cargo标准source replacement](https://doc.rust-lang.org/cargo/reference/source-replacement.html)逐命令添加参数，源身份仍crates.io，版本不变。旧镜像禁令由本次用户明确授权及编号补单覆盖，旧514不修改。

首轮tauri探针因总控预定2MiB上限拒绝响应（curl63），不是镜像网络失败；保留失败JSON/源码，改为该索引8MiB有界探针后通过。无无限重试、TLS放宽或代理服务操作，未读取用户网络配置/凭证。下载只在原AC私有Cargo home发生，不借其它cache、不安装SDK/工具链。

[离线审计](w1-ac-mirror-20261024/controller/2026-10-24T03-13-43.578Z-40636-offline-audit.json)再次以offline/locked运行fetch及Windows metadata，238包逐个压缩包SHA匹配Cargo.lock；395个锁内registry项匹配镜像索引。84项还能与保留的官方索引cache比较，其中包括四个直接依赖；其余311项没有独立官方cache对照，按用户授权信任镜像及Cargo锁/checksum机制，不冒称全部官方逐项鉴真。来源/许可证清单保持原门要求，发布许可证审查仍未完成。

锁SHA `c56b58aa141a85617a59db4de679ff73d69827aee81bda958b1fdee0c9bbbfe8`，只留原树给原执行者提交；[归档锁](w1-ac-mirror-20261024/environment/Cargo.lock.txt)为证据文本，非手工锁或主线产品锁。[依赖清单](w1-ac-mirror-20261024/DEPENDENCY-INVENTORY.json)记录Windows目标238包。其它平台依赖未下载/实测，不称macOS支持。

## 控制、原件与边界

新主检出绝对ac-mirror-check由旧delivery-wave-check派生；[控制审计](w1-ac-mirror-20261024/controller/CONTROL-AUDIT.json)核desktopPolicyAudit/proof/desktopEnv/desktopMetadata/exactTests逐字节保留。变更仅AC入口/补单范围、显式镜像参数、环境reservation/原13源码保持；三测试/原版本/来源许可证/600秒/jobs1/有效负控/final干净同SHA/单窗断言不变。旧helper与补单01wrapper不改，旧46原件保持。

[进程核查](w1-ac-mirror-20261024/controller/PROCESS-CLOSE.json)：同步Node/Cargo均返回，无相关残留，手动强制终止0。系统窗/目录窗/产品测试/构建均0。网络选择只在子进程env和命令行，不创建持久Cargo配置，不改系统代理、节点、服务、DNS、证书、防火墙；没有读取用户网络设置。

[最终审计](w1-ac-mirror-20261024/FINAL-AUDIT.json)与[归档索引](w1-ac-mirror-20261024/ARCHIVE.json)保存35份控制/失败/实际门/离线证据/3004121字节，排除crate/cache、索引原body、target/profile和AA排除图片。5新条目/20继承锁共519唯一约束，原514及其他30任务/槽位保持；原ef0b7c4/13源码不变，唯一工作区差异为已公布锁。

[补单02](../../../dispatch/tickets/WATER-W1-AC-ADDENDUM-02-20261024.md)及[READY原对话续做句](../../../dispatch/wave1/AC-DESKTOP-ADDENDUM-02-READY-REPORT-20261024.md)只回原AC执行对话，补单01失败保持历史。后续产品仍须实现、三测试先红、两稳定生产负控和同SHA三final，预算只剩原1静态窗/0目录窗。没有启动实现者，实际桌面扫描、用户scope、自然同意鉴真、生产竞态、macOS与M1仍未验收。
