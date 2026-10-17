# Fixture Lab v1：扫描前置测试资产

总控冻结协议，版本`water.fixture.v1`。只定义合成测试目录的构建与描述，不实现Rust扫描器、分类器、ScanReport或清理。Node仅用于测试资产准备；生产内核继续Rust。

## 唯一API与文件

`tools/fs-fixture-kit/materialize.mjs`导出：

```js
validateFixtureManifest(value); // {valid:boolean, errors:[{code,path}]}
await materializeCase(caseId, options); // options可省略，或{} / {run_id:string}
```

FixtureError需继承Error，公开`code`和`field`，message/stack首行不回显输入。code为`invalid_manifest|invalid_case|invalid_run_id|unsafe_root|collision|io_error`。未知case、非字符串caseId返回invalid_case，field=/case_id；未知options/非法run_id返回invalid_run_id，field=/options或/options/run_id，均在创建目录前拒绝。field只用固定字段名/JSON pointer，不能包含原生IO绝对路径、未知键或输入值。options仅接受普通或null原型的数据对象，字段先验描述符，访问器不能执行；{}视为省略run_id。模块导入只能定义函数，不能创建目录或执行case；写入只能由显式materializeCase调用发起。无CLI、参数路径、环境输出根覆盖或回收函数。materializeCase每次从模块相对位置读取本仓库冻结cases.json并验证；不导入总控verifier替代自己的实现。

`validateFixtureManifest`纯函数，只处理普通数据对象/数组，不读环境、磁盘、网络，不修改输入。拒绝逐层未知/缺字段、访问器、自定义数组原型及非数据对象，不调用输入提供的方法；不要求处理任意Proxy或全局内建篡改。错误严格只有code/path；code为`shape|unsafe_path|reference|limit`，path只含固定字段名及索引，不回显未知键/原值。纯校验错误由materializeCase转为invalid_manifest。

## 冻结清单

cases.json根严格为`{fixture_version,cases}`，version精确匹配。必须包含既有11个case_id且顺序一致；不得更名、增删或修改冻结输入来过测试。

每case严格包含`case_id,description,nodes,scopes,canaries,scanner_plan`。description非空字符串；case_id工具内唯一。nodes数组1..64，整个清单不超过16个case；单case所有file的UTF-8内容合计<=65536字节。只处理测试小文件，不生成稀疏大文件。

每node严格为`{kind,path,content,target}`，nullable字段必填。kind为directory/file/hardlink/symlink_dir/junction_dir。directory的content/target均null；file的content为字符串、target为null；链接content为null、target为非空相对路径。空文件允许。path唯一、不能等于`.water-fixture-run.json`；必须相对、用单个`/`分段，禁止空段、`.`、`..`、绝对路径、反斜杠、冒号、ASCII控制字符及尾斜杠。path与target最多512个Unicode标量；保留Unicode和字面百分号，不解码或正规化。

所有父目录须在nodes中显式声明为directory，不可在任何链接路径下面再建节点。hardlink目标必须是同case已声明的普通file；两种目录链接目标必须是同case已声明的directory，不允许目标再是链接。target允许处于scope之外，但只能处于同一run，禁止指向真实用户文件。

scopes非空，每项严格`{scope_id,path}`，ID ASCII `[a-z][a-z0-9-]{0,47}`完整字符串匹配（尾LF/CR也拒绝）、唯一；path引用普通directory。重叠scope保留各自ID，工厂不输出扫描去重结果。canaries为无重复的已声明普通file路径，可为空。

scanner_plan严格`{max_depth,max_entries,cancel_after_entries,faults,expected_issue_codes}`。max_depth为0..64整数，max_entries为1..10000整数；cancel_after_entries为null或0..10000整数。faults各项严格`{operation:"read_dir",path,code:"permission_denied"}`，path引用普通目录；expected_issue_codes无重复，只允许depth_limit/entry_limit/permission_denied/cancelled。它们是未来扫描验收输入，工厂只原样返回，不执行扫描/取消/权限修改。

未来计数口径：scope根depth=0，不计入entries；子目录项访问前计一次，按各目录UTF-8字节顺序处理；cancel_after_entries=N表示记录N项后、访问下一项之前取消。该计划不冻结Rust ScanFact公共接口；下一张Rust票需由总控单独定义消费方式。

## 写入边界

输出根只能由模块位置推导为当前Water工作树的`.local/fixture-lab/<run_id>/`。run_id省略时生成`run-`加UUID；给定时必须完整匹配`run-[a-z0-9][a-z0-9-]{0,47}`，尾LF/CR/U+2028/U+2029均拒绝，不依赖JS的裸$结束锚。不接受任何绝对输出路径、cwd派生任意根、用户HOME或环境变量覆盖；options其他键拒绝。独立于run_id词法校验，解析后的候选路径还必须是已核对fixture-lab的直接子目录且非base本身，失败unsafe_root；不能只靠一个正则作为写入边界。

逐级检查`.local`与fixture-lab已有路径为真实目录而非链接，并验证realpath仍位于当前工作树。run目录必须新建；已存在一律collision，不覆盖、不复用、不修补。文件采用排他创建wx；目录先建，普通文件其次，所有链接最后；写入前拒绝非普通父目录。致命失败可以留下该唯一run目录和已写文件，即使marker尚未产生也禁止复用，禁止递归删除、unlink、rename、chmod/ACL变更。单写入者和无外部恶意竞态是实验室前提；这些检查不冒充生产执行器的TOCTOU保证。

只有成功返回complete/partial时，run内才要求写`.water-fixture-run.json`并与返回对象同值（UTF-8 JSON）；marker自己不出现在nodes。不能覆盖旧marker。公开返回对象严格为：

```text
{fixture_version,case_id,run_id,run_root,status,scopes,nodes,canaries,scanner_plan,scanner_executed:false}
```

run_root为绝对路径；status为complete或partial。scopes各项`{scope_id,path,absolute_path}`；nodes逐条按冻结声明顺序返回`{path,kind,status,error_code}`，status为created或unsupported；created的error_code为null。canaries各项`{path,bytes,sha256}`，bytes为非负整数，sha256为实际创建字节的SHA256。scanner_plan深拷贝保留；不能伪造扫描状态或读取权限。

## 平台能力与失败

普通目录/文件失败不是unsupported，必须抛FixtureError(io_error)。链接只在实际Node link/symlink调用返回EPERM/EACCES/ENOSYS/ENOTSUP/EOPNOTSUPP时记录unsupported，并保留该原始error_code；不吞EEXIST/ENOENT/EINVAL或其他意外错误。非Windows的junction_dir直接unsupported，error_code=`PLATFORM_UNSUPPORTED`，不能在macOS创建普通symlink然后声称junction成功。任何unsupported使run.status=partial；所有节点created才是complete。没有skip测试来掩盖能力结果。

目录符号链接使用显式dir类型；Windows junction使用显式junction与已核对的run内绝对目标。Node对type及junction绝对目标的说明见[官方fs文档](https://nodejs.org/docs/latest-v24.x/api/fs.html#fspromisessymlinktarget-path-type)。hardlink仅用原生link创建，不能复制内容假装硬链接。测试对成功链接检查实际lstat/realpath，对硬链接检查bigint stat的dev/ino/nlink；无法提供身份依据必须如实记录，不当成物理容量验证。

本轮无真实ACL失败、竞态替换、macOS特有冒号文件名、任意长路径与真实HOME夹具；后续按平台独立放行。能力unsupported与macOS未运行必须在报告中分别列出。

## 五测试与负控

唯一测试文件`tools/fs-fixture-kit/tests/materialize.test.mjs`，Node内置test，精确五个顶层名：

- fixture_manifest_and_cases：11case/拓扑及纯校验；遍历全部[18项冻结非法变体](negative-cases.json)，逐项断言invalid及errors包含expected code/path；逐层缺字段/未知键和深冻结输入。operations用JSON pointer的add/replace/remove；value_generator仅ascii_x，展开count个x。assert消息带id，不能按id预置结果。数值预算错误为limit，悬空/重复/非普通父目标为reference；多错误时允许返回多项，但必须包含预期位置。
- fixture_materialization：真实普通目录/内容/UTF-8字节、marker、scopes、11种case的数据；生成树只期待created节点和marker，unsupported链接路径必须不存在；不跟随链接做递归。构建成功不算扫描正确。
- fixture_paths_and_collisions：遍历negative-cases.json全部invalid_run_ids（含尾换行），未知case/options、options getter与caseId对象不执行、已有run不覆盖、canary不变；新文件实际位于指定当前树内；不扫描其他目录。
- fixture_link_capabilities：成功时真实拓扑/身份，失败时只允许上述unsupported分类；外部目标仅指run内scope之外canary，验证不变。每个平台能力结果存本树.local，保持无跳过测试。
- fixture_declarative_faults：depth/entry/cancel/permission计划原样返回，scanner_executed=false；blocked目录仍可读，未改权限，没有执行扫描。

单次test最多创建24个run，不清理；总文件内容<=1MiB。先用真实目标断言留红。三项负控分别在真实逻辑临时允许非法run_id、接受旧run复用、将非空fault/cancel计划丢失；指定测试必须因目标断言红，不能只编译错/缺文件；原字节恢复、核三个哈希并重跑。负控非法run_id用无越界效果的`run-UPPER`：只放宽真实大小写约束，保持独立路径边界及其他语法限制。不得禁用全部路径检查后运行../或绝对路径写入，不植入case专用开关。
