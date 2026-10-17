# WATER-W1-J 总控工具勘误01：Cargo构建产物选择

2026-10-18，总控Codex。J受阻回执接收HEAD为`1dfa82c014cbdb99024b0da48dd4b6bff9f9e3d8`，实现为`b6fd1fe6566ad79dbcca6c420988c9bb40c47d80`。本勘误只修订总控独立验收工具，不授权执行者修改产品、原helper或冻结材料，不需要重新外贴实现单。原bridge final失败记录永久保留；尚未通过新的独立验收时不得接受J。

已核原helper在完成J构建后枚举整个deps目录，要求每个同名前缀rlib恰好一份；现场water_scan确有两份，原bridge在编译比较程序前退出。旧独立workspace与J依赖构建产生不同产物，目录唯一性不能证明当前Cargo构建图。359新增文件均在原白名单，六产品文件自实现提交后未改，350原始证据与来源逐字节一致，132冻结一致。详见[接收审计](w1-j-review-20261018/intake-audit.json)。

原断言：每个crate在整个deps目录只能匹配一份rlib。替代断言：成功的本次`cargo build --message-format=json`与实际metadata解析图中，每个所需crate必须对应唯一可达package_id、lib目标及非test的rlib产物；依赖路径必须留在本验收树私有target/debug/deps，根包另允许Cargo明确报告的固定target/debug/libwater_lab_session.rlib，实际文件必须存在且不是链接。无产物、多解、构建失败或越界都拒绝。保留全部历史产物，不按时间、目录顺序或第一份候选猜测。

以下要求全部保持：真实J公开入口及独立F/G/A/E/H程序、13快照六字段逐值比较、11原生case/12scope/39entry、44内容快照、五产品测试、fmt/clippy/metadata、原行为红与三负控的完整输出和恢复字节证据。选择器还需三项定向测试和真实重复产物回归。原冻结helper及七份锁不变，K任务对象和工作树不变；J→K实际页面仍等K收单后单独验。

独立验收运行于`.worktrees/integration-j-20261018`、`controller/water-w1-j-20261018`，要求显式干净受测SHA。只允许未改冻结prepare在此树.local创建一批有界11+6合成run（不超过24run/1MiB）；Rust只读、普通payload不读、无ACL/移动/删除或清理。私有离线Cargo home/target、jobs1，保留所有产物。先在该target构建旧四workspace，再构建真实J，必须实际留下重复water_scan产物，确认旧断言会拒绝而新选择器能编译运行两条真实链路。

总控复跑原前四final门，并在隔离候选提交运行`node scripts/acceptance/check-lab-session.mjs --expected-head <实际完整SHA>`。该命令不授权外贴执行者运行，票面正式参数将记录在实际receipt；此文中的参数说明不是可外贴模板。若发现产品缺陷则编号回派；仅当独立门通过，才可由总控接受和集成未修改的J实现。准备时仅脚本和选择器三测试通过。后续隔离受测d14e1f1已通过真实重复产物回归和13快照比较，见[J验收报告](WATER-W1-J-REVIEW-20261018.md)。

macOS、真实用户目录、生产竞态、桌面和删除未验证，M1未完成。
