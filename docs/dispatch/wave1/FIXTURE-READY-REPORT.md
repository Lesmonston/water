# A/D下一批派前回执

2026-10-17，总控Codex。结论：D可READY；A既有补单01保持可续做。没有自动启动实现者，B/C已验收状态不变。

## 实际预检

- D唯一树`F:/new/smaltalk/water/.worktrees/d`，分支worker/water-w1-d，精确基线`7007c65d5845c3fe5938d920e930c8bcb7ffc4e0`，tag water-w1-fixture-base-20261017-r1。目录/权威票/报告父目录均真实存在，产品目录尚未创建。
- D干净baseline实际退出0：Node24、8冻结哈希、分支/精确SHA及11case/57节点/575字节/18负例元数据通过，前后树保持干净。见[baseline原记录](../../acceptance/wave1/controller/w1-next-batch-20261017/d-baseline.json)。这不是产品五测试通过。
- 本树probe实际退出0：hardlink、目录symlink、junction均supported；硬链接nlink=2且身份非零。所有合成小文件与链接仅在本树.local/fixture-probe，未清理。见[能力原记录](../../acceptance/wave1/controller/w1-next-batch-20261017/d-probe.json)。macOS未运行；不承诺其他机器能力。
- A仍旧提交475c470，干净，9冻结一致，未见补单报告；未重复旧产品测试，也未改A树。见[A续做审计](../../acceptance/wave1/controller/w1-next-batch-20261017/a-resume-audit.json)。原A补单01无需重编号或新起点。

## 预备过程修正

最初架构基线1f2299b在新checkout中将D证据.gitattributes换成CRLF，导致冻结校验失败（期望c8c4932d…、实际d9d94a1d…）；当时尚未READY或给用户发执行句，未运行任何D产品测试。总控给该属性文件自身固定LF并更新D锁，单独提交7007c65；保留原tag，创建r1新tag，准备中的d树只快进，无reset/删除。随后上述两项最终预检实际通过。原A/B/C锁和工具未改。

正式票与manifest给出了唯一3项产品文件、固定5测试名、60秒/24run资源、无清理与只在本树.local写入的边界；负控保留独立路径防线。18个数据变体、非法run_id完整匹配/尾换行、options数据属性、失败marker及平台unsupported均已在契约固定。只读规划与正式票复核未发现内容阻断；按其建议已将实际通过的baseline/probe证据登记，并从DRAFT/PENDING改为READY/PASSED。未执行工厂产品测试。

下一张Rust扫描票保持DRAFT；A/D通过验收前不派依赖其在途代码的正式扫描器/分类器/桌面接线票。本批仅A修复+D测试资产，详见[NEXT-BATCH](NEXT-BATCH-20261017.md)。
