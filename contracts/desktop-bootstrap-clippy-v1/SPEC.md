# AC补充单03：Clippy参数转发与剩余final

2026-10-24。补单02已接收82d04aaeef73030f65bc0a070b99a5517fd5d6a3，产品/测试/锁实现eb7f80178191e233068015bbc26dc9798ac8cb22未集成。三测试先红、三次完整绿、两条稳定生产负控及即时原字节恢复已实际发生；原final check在Clippy错误选择canonical cache时失败，final test/native未运行，窗口预算未消耗。

总控修订自己的控制入口，不修改产品实现。Cargo1.95对external clippy仅转发其后参数，原镜像参数前置未进入内部Cargo。新入口scripts/ac-final-check.mjs继续原镜像参数，唯独Clippy以cargo clippy <相同--config> ... -- -D warnings转发；其它Cargo命令参数顺序不变。仍offline/locked、all-targets、deny-warnings、jobs1、每Cargo命令600秒、Rust1.95、相同私有home/target/tmp，无下载、持久Cargo配置、用户网络或证书变更。

新独立日志目录.local/checks/WATER-W1-AC-ADDENDUM-03，旧补单02原报告/ARCHIVE/189索引与原46证据只读。总控先在原干净交回HEAD运行preflight（仅原check的metadata/策略/fmt/clippy，不运行测试或窗口）实际核验修订，再resume。不得将旧final失败替换成成功。旧519全部保持，新冻结523；旧helper、旧mirror入口与镜像定义不改。

首次resume HEAD精确82d04aaeef73030f65bc0a070b99a5517fd5d6a3且干净，14个产品/测试/锁快照须与实际交回一致。公开测试生产哈希38c7a927cb30fd79f91e5e52e875a81dcb1585b359390dca50af5b24a2d2139d、测试哈希211ba3014991309b2bda94cd422f4496c2ac552fa57507c3bb35283ae2acefe7对应的有效先红/两负控/恢复，可从已提交补单02归档复用，不机械重跑。proof仅增加从旧已冻结原字节目录读历史的能力，原红绿/测试哈希/生产哈希/顺序断言不改；若后续产品/测试字节改变，仍须按新稳定字节补齐负控和恢复。

产品要求及白名单不变。原对话继续剩余同干净SHA final check/test/native，仅一次静态桌面窗口、0目录窗、最多30秒，失败不循环。总控preflight为控制复核，不替代执行者final或产品验收。新报告docs/dispatch/reports/WATER-W1-AC-ADDENDUM-03-REPORT.md，新证据docs/acceptance/wave1/ac/addendum-03/；旧报告/证据不可修改，不reset/清缓存/merge主线或改根Cargo，不启动另一实现者。

实际源码/坏态/恢复、所有失败、命令参数/退出、平台与窗口/进程证据原字节归档。原源码不改时不重新下载、冷构建或先红；无JS/IPC/插件/任意路径、私有profile和未知平台语义保持。编译/Clippy/test/native分别记录，未完成三final及独立集成仍不记VERIFIED。真实桌面扫描/AA/AD接线、用户scope、macOS与M1未验收。
