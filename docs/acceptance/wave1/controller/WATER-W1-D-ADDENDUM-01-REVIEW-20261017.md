# WATER-W1-D 补单01复验与集成记录

2026-10-17，总控Codex。结论：D补单01单票ACCEPTED；隔离集成结果另记，不把单票通过冒充集成通过。A/B/C既有验收及E票的19锁/基线/权限保持。

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

单票通过后在Water内的新D集成树合并已接收提交，再独立复跑五测试和19边界；集成树的物理合成run仅在其自己的.local，权限仅为D验收，不授予E物化权限。最终受测SHA、receipt、实际能力及main推进后续追加。

当前无扫描器、分类器、删除、ACL修改或真实用户数据动作。permission/cancel计划仍是未来扫描输入，不能把目录创建当作这些行为已验收；macOS未运行。D集成通过后才满足扫描票的D前置，新Rust接口/测试/工具基线仍需总控冻结，不自动派出草案。
