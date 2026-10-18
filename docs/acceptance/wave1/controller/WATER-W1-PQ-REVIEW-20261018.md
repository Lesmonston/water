# P/Q总控独立验收及隔离集成

2026-10-18。P、Q均VERIFIED（Windows受控范围），产品和原报告已合入主线，当前无未结外贴票。A–O及五旧补单的任务对象、分配、基线/helper/旧冻结/产品/根Cargo与原树/夹具/日志保持。M1未完成。

| 票 | 接收SHA | 原受测实现SHA | 原门复跑 |
|---|---|---|---|
| WATER-W1-P | 39dfdfd2bdb7f1196cd0f1765b9638c3aa6e7eda | 2e963bba0c6b968299880198eb4f1bb8a8100108 | fmt/test/clippy/metadata/bridge 全通过 |
| WATER-W1-Q | d6e135d35f9b5dbb2a915c0d21a9e2b01a29c8aa | d46b93d652de0ada6d4be0e18cf0d01c06080a75 | fmt/test/clippy/metadata/bridge 全通过 |

隔离受测提交c88c557625630e079870f2b801e2d2fd50215174，controller/water-w1-pq-20261018。P原405份/Q原350份交付均在白名单，实现后产品未改变；755份交付在隔离树、主线和worker原树逐字节一致。P 322份/Q 338份原始helper证据与.local来源和各final绑定SHA核对通过，P另有29项编译拒绝及成功对照的原源码/诊断证据。227唯一冻结全部通过。无实质产品修复或补单。

## 独立实测

两票使用新私有离线Cargo target/home/tmp、Rust1.95/MSVC，依各自成功Cargo图选取库，不混接不同依赖rlib。各完整五测试、格式、clippy -D warnings、metadata和冻结公开桥接通过；P桥接实调P/N，Q桥接实调Q/A/H并比较24完整golden及9 raw错误/canary。Q原五测中的合法超大DTO输出拒绝也重复通过，不冒充精确16MiB成对临界实测。

P原测试加载器将夹具绑定编译期CARGO_MANIFEST_DIR，隔离树最初直接cargo test因该路径断言停止，原失败保留。总控未改原测试：从p原树的同字节测试文件编译完整五测，保持它原有的编译期目录保护，链接每次由隔离树成功Cargo图选出的当前产品/依赖库；变异和恢复时也重新构建、链接。P五测与源码负控因而仍复用p原夹具，实际受测产品来自隔离树。Q仍使用隔离树正常cargo test。实际命令、P测试源SHA与testMethod已记录在隔离回执中，未新建夹具或把路径失败算有效负控。

P三个独立测试：32轮attempt结束/取消/重放、6个同ID同根registry的交叉能力拒绝与原实例有效、撤销同ID重建/别名/容量错误先后及其它scope不受影响。Q三个独立测试：所有自由文本/ID更名不改变输出、scope/finding/issue反序仍正确关联、精确Unknown/u64max与被剔除字段仍受真实A验证。

独立编译检查P 24项拒绝（Clone/Debug/Default/Serialize/Deserialize及私有字段）、Q 3项拒绝（Default/Deserialize/私有summary），并有P实际new成功和Q Clone/Debug/Serialize成功对照。不能从scope ID、JSON或公开字段伪造能力；Q输出无公开任意构造器/可变字段。

六项真实生产负控使用worker归档的坏源码原字节重建，逐项完整五测试命中目标红→原字节恢复→完整五绿。P为单active/owner绑定/revoke失效；Q为原路径泄露/scope关联/Unknown改0。生产与测试原字节及所有stdout/stderr保存，未把编译/缺文件/超时当行为红。

## 范围、失败及限制

仅只读复用p树既有4个合成目录/1junction/index，普通文件/内容均0；冻结工具有界核原结构，未新建、重造、清理或读取真实用户数据。P的确认只是可信Rust宿主声明，N三个authority/race标记仍false，无原生选择器/手势鉴真或遍历；Q仅内存JSON，精确大小/数量/顺序/关联仍可形成指纹，anonymity_guaranteed=false。

首次总控证据审计把编译拒绝限定在有E编号的诊断，遇到Rust未编号的“private fields”构造拒绝而停止。核对真实诊断和原输入后修正审计分类，原失败回执保留；不是放宽产品断言或修改worker源码。其它失败与未验证项按原报告保留，不冒称全部native错误/RootChanged/句柄资源计数/竞态、精确16MiB临界或SerializationFailed分支已实测。

原生用户选择、permit到句柄边界有界遍历、scope重叠互斥、桌面文件保存/详细流程、真实用户scope、macOS、卷唯一与回收量、删除仍未验收。下一阶段按ADR-011和[M1计划](../../../M1-DELIVERY-PLAN.md)准备纵向接线，当前无新的READY票或自动实现者。P/Q原票归档，不需重贴。

[原门复跑](w1-pq-review-20261018/original-review/2026-10-18T10-59-50.989Z-20308-result.json)、[隔离实测](w1-pq-review-20261018/integration/2026-10-18T11-10-36.200Z-43252-result.json)、[原字节归档](w1-pq-review-20261018/ARCHIVE.json)。
