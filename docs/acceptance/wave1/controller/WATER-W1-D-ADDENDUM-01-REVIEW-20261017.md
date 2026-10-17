# WATER-W1-D 补单01复验与集成记录

2026-10-17，总控Codex。结论：D补单01单票及隔离集成全部通过，VERIFIED（Windows范围）。A/B/C既有验收及E票的19锁/基线/权限保持。

## 接收和范围

- 接收HEAD `711c38c9d626c4ceb624a48173356887c913d9c7`，分支worker/water-w1-d，树干净。执行者受测实现`ff99fb2aae6e1edec84f818415167d821940af26`；其后仅12项新增报告/证据。
- 原基线7007c65与续做起点b92d5b8均为祖先。总41文件在原白名单；补单15项改动为materialize.mjs、原测试、README三产品文件与12项新增记录；旧回执、旧证据、helper、8冻结及.gitattributes未改。
- 8项冻结实际字节哈希一致，三产品哈希与新回执一致。执行者Cursor / Grok 4.7为自报；无独立模型平台验证。

详见[提交审计、产品哈希与归档来源](w1-d-addendum-01-20261017/submission-audit.json)。本轮一个只读辅助检查材料，无实现/发单/写入权限，未触碰E。

## 实测

在同一干净接收HEAD串行复跑原fixture-check的check/test --final，均首次通过：两项语法检查与五项TAP（tests/pass=5、fail/skipped/cancelled/todo=0）。测试只在D自己的.local生成合成run，保留历史，不清理。

原总控独立runner不改输入或断言，重新运行同一组18个非索引数据属性与1个getter对照，19项全部通过，getter调用数0。见[独立边界receipt](w1-ad-handoff-20261017/2026-10-17T11-35-40.768Z-fixture-boundary-result.json)。六类数组均返回shape和数组pointer，不回显未知键/值；没有把非法清单交给物化入口。

生产修复用规范字符串往返、0..2^32-2和小于length共同确认真实索引。读取仅用descriptor，symbol/非索引先拒绝，保持稀疏数组、自定义原型与getter拒绝。

先红和NC-04均是`/cases 4294967295`的真实AssertionError，其他四测试通过；不是语法/超时失败。只读审计在内存按记录重构坏态，SHA256精确匹配`63e5f59c3204c52883bcdf7f04f573f6ca4363d1317de65b2654a6b6d3fdfdf1`，恢复后源hash为`55b89260532c4b6434b8c9114d4ba9de69c9a9a013118b76fe0b55dee981830e`。归档与原日志逐字节一致；执行者仅归档恢复receipt，总控额外复制仍在.local的真实恢复日志并记录来源/hash，确认恢复五测试通过。原三项历史负控/证据不变，未机械重跑。

## 隔离集成与限制

单票通过后在`.worktrees/integration-d-20261017`、分支controller/water-w1-d-20261017合并已接收提交，无冲突。实际受测提交`4e44ee6d3eca2cfd691bc30f298dff3c606e14f9`，前后干净不变；[集成receipt](w1-d-integration-20261017/2026-10-17T11-42-12.106Z-13988-result.json)的19个命令全部退出0：两语法、五测试、19独立边界及冻结资产检查通过。

本次在集成树自己的.local产生20个合成run，符合最多24run预算，历史run无删除；没有其他树写入或清理。Windows实际hardlink身份非零、dev/ino相同、nlink=2；symlink与junction真实目标一致。这仅为当前Windows能力，不授予E物化权限。

43个唯一冻结文件（四个锁合并去重）全部一致，D目录Git tree与接收提交一致，A/B/C产品tree保持原接收版本，E的19冻结与分配不变。未重复运行未改变的A/B/C产品测试，E产品仍未实现。全部37份worker原证据逐字节一致，无换行修复；[20项集成日志归档](w1-d-integration-20261017/archive-manifest.json)记录hash。受测提交后只追加文档/证据，不变产品与测试；main仅在上述检查完成后快进，推进记录单独保留。

当前无扫描器、分类器、删除、ACL修改或真实用户数据动作。permission/cancel计划仍是未来扫描输入，不能把目录创建当作这些行为已验收；macOS未运行。D集成通过后才满足扫描票的D前置，新Rust接口/测试/工具基线仍需总控冻结，不自动派出草案。
