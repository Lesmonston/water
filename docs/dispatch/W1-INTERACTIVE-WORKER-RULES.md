# X/Y/Z本波执行规则

权威票面/manifest在主检出；三树从相同精确冻结提交开始，首次HEAD必须精确且干净、产品目录不存在。先baseline复核，不能merge主线取票。只在票面唯一树/分支及白名单实现，不改旧A–W/锁/helper/根Cargo/台账。无内部子代理/分包、push/rebase/clean/reset/删除清理。

本波原生窗口上限：X全任务6、Y/Z=0；baseline均0。X仅native门真实3窗，定向负控至多1窗，其余保留额度用于有依据的失败恢复；不得重复跑旧V UI套。不要sleep拖慢扫描制造取消，可在accepted后先发cancel再确认选择，验证真实token已传给V。Y最多一个独立Chrome，私有profile/下载保留；Z只本树新marker工厂，X只本树原R工厂adapter。

目标测试先红→实现→稳定源码后两个真正生产负控，每红立即按保存原字节恢复并跑受影响测试；不改测试/runner/超时/测试开关，不用编译/缺文件/弹窗/CDP/超时造红。允许按新TESTS.json定向只跑对应测试文件，最后完整final一次；不要求再造旧行为红或把每条负控扩成完整原生套。所有历史失败留存。最终源码/测试变动使相关证明失效，须补该证明，不能拿旧hash冒充。

已提交干净实现SHA串行check --final、test --final（Y再browser，X再native）；报告提交仅报告/证据。check核fmt/clippy/精确metadata/锁/当前生产负控源快照。整个产品/测试目录不允许藏额外target、build.rs、npm依赖/脚本、harness=false或skip/ignore/filter。

每子命令180秒，一树一门，Rust jobs1/private offline，Node24。日常仅受影响测试；通过且字节未变不重跑整套。系统UI与启动器只调用冻结driver/固定exe，不运行上游/全盘/HOME/真实项目数据，无删除/ACL/移动。所有输出在.local/checks/<task>，原始日志/失败/好坏恢复快照/实际下载/截图归档本票证据，ARCHIVE逐项source/archive/bytes/SHA，排除target/cache/binary/profile/payload，日志显式-f逐文件add。

报告须写实际模型、精确基线/受测SHA/回执提交定位、逐需求/命令退出、负控和原字节恢复、全部失败与实际看图、窗口计数及结束进程。只完成单票SUBMITTED，不自行合主线或宣称Windows用户scope/macOS/桌面/M1完成。受阻保留现场，固定报告路径写最小补充需求，不向用户索要临时放宽。
