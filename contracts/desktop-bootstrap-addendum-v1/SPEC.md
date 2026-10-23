# AC补充单01：限定进程的官方registry连接与原树续做

2026-10-23。原交回ef0b7c4b3a84c434c0cd3b691b79c8a4a37d311c、静态骨架b617b90182d54053091910b8b4e889dd7f614a7d；未有Cargo.lock/产品测试/native窗口。原509和所有原报告/46归档保持，不改版本、窗口预算、旧helper、根Cargo、全局网络/证书/代理或其它票。

## 连接范围

新主检出绝对wrapper scripts/ac-resume-check.mjs委托原AC树未改的delivery-wave-check。依赖模式仅给子进程HTTP_PROXY/HTTPS_PROXY设本次临时127.0.0.1端口，清空该子进程NO_PROXY/ALL_PROXY。TLS仍在Cargo与官方服务器之间由Cargo校验，代理只搬运加密TCP，不解密/改证书、不记录正文、不做registry/source替换或镜像，也不改系统配置/用户代理服务。离线门不启用通道。

R1透明TCP已接通，但原Cargo HTTP/2批量稀疏索引仍低速超时，完整失败保留。R2先使用同一Rust1.95 Cargo、同一manifest/私有目录和三个原子命令generate-lockfile、fetch --locked --target Windows、metadata --locked --filter-platform Windows，唯一传输参数增加--config http.multiplexing=false（HTTP/1.1）；随后必须原样调用旧dependencies门复核锁、metadata、精确四依赖/来源/许可证。不得用初始化成功代替旧审计门。每Cargo命令仍600秒，priming三步最多1800秒，随后旧门外层最多1900秒；不重复相同失败参数。R1工具/锁及失败源码快照保留，R2不是产品负控或产品通过。

R2也未完成锁，失败目标是约1MiB的wry索引。之后只读进程/监听检查发现已有verge-mihomo服务实际监听127.0.0.1:7897（旧登记7892未运行），没有读取其配置/凭证、启动进程、切节点或改系统代理。对该已有端口的20秒探针取得HTTP200/证书校验0及778816/996977字节，但未完整接收，不能当完整依赖通过。

R3固定environment-local-proxy门仅让本票受限CONNECT通道经已有127.0.0.1:7897转接，仍只允许三官方host:443，不给Cargo任意新source；Cargo继续自行验证证书。仅其子进程HTTP_TIMEOUT=180（Cargo官方网络请求等待参数），通道已连接闲置上限相应180秒，原Cargo每命令600秒/测试门不变。R3不作HTTP/1.1预热，而完整委托原未改dependencies门，所有版本/锁/source/许可证审计不变。R3独立一次reservation，不循环；原R1/R2及源码快照全保留。若仍不能完整生成锁/fetch/metadata则保持BLOCKED。

R3原HTTP/2门仍在600秒未完成大索引，失败无锁保留。最终R4/environment-local-http1只组合已分别实测的已有7897、网络请求等待180和HTTP/1.1初始化；仍先由相同Cargo/manifest/私有目录生成锁、fetch、metadata，再完整委托原未改dependencies审计，原每命令600秒不变。R4独立一次reservation，不再作相同参数自动重试；若失败则等待新的可靠网络条件。R3源码和失败归档，不追认成功。

通道只接受CONNECT index.crates.io:443、static.crates.io:443、crates.io:443；只用IPv4解析/连接，最多3条同时上游、排队最多16、排队25秒/闲置30秒。未知host、其它端口/方法拒绝，不做通用URL/路径接口。门结束关闭所有自有socket/listener，无常驻服务。原每Cargo子命令600秒、jobs1/私有CARGO_HOME/target/tmp、锁后offline及来源/许可证核查全部保持。官方站不可用则记录失败并停止，不盲目循环、不伪造成功。

## 总控环境预检与恢复

environment/environment-http1是已记录的R1/R2门；environment-local-proxy是总控唯一R3恢复门，分别独立reservation，失败不自动重试。必须精确原交回HEAD、干净树且源码与交回一致；只作上述环境初始化及原dependencies审计，允许写本票新Cargo.lock及现有私有cache/日志，前后13个静态源码/测试/配置原字节一致。不得实现validator/改测试/启动Tauri。此门通过仅表示Cargo依赖可用，绝不记产品通过。

原对话resume必须保留原分支/HEAD及旧报告/ARCHIVE/46证据；若总控环境门已生成锁，只有已公布SHA的Cargo.lock可为唯一工作区变化，否则必须干净。基线已不是原首次4b8a1d，不再跑要求新产品不存在的baseline，不merge主线取控制文件，不reset/清理现场。

续做仍须完整AC_BEHAVIOR先红、实现真实配置/导航策略、AC_CAPABILITIES/AC_NAVIGATION稳定生产负控与逐次原字节恢复/三测试绿，再同一干净实现SHA check/test/native。三测试/静态壳目的、零JS/IPC/插件、私有WebView profile及唯一窗口预算1/目录窗0全部不变；此前和本补环境阶段均0窗口。

原SPEC末行可选图标说明存在编码损坏，本补清楚重述原票已授权语义：icons/icon.ico只可用本项目自有简单资源≤64KiB，不下载第三方logo；自有文本LF，.gitignore恰gen/加LF。原SPEC/509冻结不覆写，未增加产品权限。

新回执docs/dispatch/reports/WATER-W1-AC-ADDENDUM-01-REPORT.md，新证据docs/acceptance/wave1/ac/addendum-01/，原回执和46证据只读。所有实际新命令/失败、受测SHA、恢复字节、socket/进程退出、锁/许可证、最终一窗口证据原字节归档；缓存/下载crate包/target/binary/profile不归档、不清理。完成仅SUBMITTED，真实桌面扫描/macOS/M1未验收。
