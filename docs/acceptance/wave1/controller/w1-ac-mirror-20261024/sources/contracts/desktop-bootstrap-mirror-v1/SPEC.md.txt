# AC补充单02：国内镜像依赖与原树续做

2026-10-24。用户明确要求使用国内镜像，并要求总控直接完成下载、不得修改用户网络配置，下载好后再由用户外贴原AC续做。本补优先于原票/补单01中仅官方host、禁止镜像及旧wrapper约定；仅改变AC的依赖传输和对应离线cache选择，产品需求、精确四依赖、测试/许可证/来源校验和资源预算不变。

唯一树/分支仍为 F:/new/smaltalk/water/.worktrees/ac / worker/water-w1-ac，精确交回HEAD ef0b7c4b3a84c434c0cd3b691b79c8a4a37d311c。原13静态源码、报告/ARCHIVE/46归档和原514冻结保持；不重置、不清缓存、不启动另一实现者。

国内镜像按本目录MIRROR.json固定，使用Cargo标准source replacement：canonical source仍为registry+https://github.com/rust-lang/crates.io-index，下载来自已验证的国内镜像。仅每条Cargo命令添加显式--config，不创建/修改任何用户、全局或项目.cargo/config；不动系统代理、服务、节点、DNS、证书或防火墙。下载子进程单独不使用显式代理，不将该选择写回环境。不开启镜像发布、搜索、登录或凭证操作。Cargo保持HTTPS证书验证及crate checksum校验。

Rust1.95、Windows x64 target、原四依赖精确版本、tauri features、私有CARGO_HOME/target/tmp、jobs1、每Cargo命令600秒保持。只使用现有AC私有目录，不借其它cache。controller environment只生成锁、fetch、metadata与来源/许可证清单，不编译/测试/实现Tauri或打开窗口。原13文件前后逐字节核对；锁是唯一允许的新工作区文件。命令失败保留完整日志/部分cache，停止本次门，不循环。镜像需切换时另记录来源和编号修订，不在冻结后默换。

scripts/ac-mirror-check.mjs为主检出绝对控制入口，由原delivery-wave-check派生并保存所有既有AC配置策略、三测试精确计数、有效先红/稳定负控即时恢复、final干净同SHA与单窗验收断言。旧helper、旧wrapper和旧锁不改。新增resume/environment及补单冻结/原报告归档保持检查；environment单次reservation防止重复。离线产品门保留相同source replacement，仅为选中已经下载的私有mirror cache，全部--offline/--locked，不再在线下载。

environment成功必须有真实generate-lockfile/fetch/metadata退出0、完整Windows依赖source/license清单、Cargo.lock SHA和原13源码保持；单个HTTP探针成功不够。总控再运行offline metadata与resume核验后，才可将本补READY；原AC仍BLOCKED/未产品验收。Cargo.lock由原树Cargo生成，不手工拼接，不提交到主线；留原执行者随后提交。

原测试三项/AC_BEHAVIOR先红、真实validator/导航策略、AC_CAPABILITIES/AC_NAVIGATION两条生产负控与即时原字节恢复/完整三绿、同一干净实现SHA的check/test/native全部保持。原窗口预算尚余1个静态桌面窗、0目录窗、最多30秒；本补环境阶段0窗口。禁止把下载或文档当产品通过。

新报告 docs/dispatch/reports/WATER-W1-AC-ADDENDUM-02-REPORT.md，新证据 docs/acceptance/wave1/ac/addendum-02/。原回执/46证据不可覆写，补单01失败保留。本补只允许原对话续做产品，不启动worker/子代理、不merge/push或改主台账。下载cache/源码包/target/profile不纳Git归档、不清理；实际门与清单/锁hash/失败/进程退出及产品负控证据原字节归档。
