# S总控独立验收及隔离集成

2026-10-19。WATER-W1-S 已VERIFIED（Windows x64受控范围），实现、原报告和证据已合入主线。原s树、385份交付文件、291冻结、A–Q/R补单/T/U任务对象与旧产品/根Cargo保持。没有实质产品修复或补单。M1尚未完成。

| 项 | 精确值 |
|---|---|
| 接收提交 | fcf422a669f72ef452f3da66a4cb7ce1298247ea |
| 原实现及五final受测 | ececf1ced87eb02cd75886677f330a9c8c72d7be |
| 隔离及快进集成受测 | 9586a75851cc820a49ff25af198b64a90254106b |
| 隔离树/分支 | .worktrees/controller-s-accept-20261019 / controller/water-w1-s-20261019 |

仅七个产品文件；两个后续提交只加报告/证据。372份原helper归档逐份与来源核SHA/长度；五final的干净受测提交、四条当前字节红/逐次恢复和源快照均核对。报告封存SUBMISSION的reportCommit/reportSha也一致。

## 独立实测

原fmt/test/clippy/metadata/bridge五门在接收HEAD复跑全通过。隔离树使用新私有offline/locked/jobs1 Cargo home/target/tmp；原五测试、格式、clippy -D warnings、metadata和S→N/P公开桥接通过。291冻结和依赖图核对保持，未混接其它Cargo图。

三个真实生产负控按worker原坏源码快照逐项重建：取消改Err、P.prepare传错误scope ID、返回前错误revoke。各项完整五测实际失败且命中原目标，立即原字节恢复并完整五绿；测试字节不变，编译/缺窗/超时不算红。三链都在第一次隔离运行通过，后面只改总控COM补测，重用已有有效三链而不重复跑无关检查。

三项独立公开API测试全部通过：实际UI在初始root里选择nested，GetResult确实返回不同目录，真实N/P identity对应nested而非initial；显式MTA宿主收到ApartmentUnavailable且显式类型/限定符与登记均不受损；宿主先建STA再重复取消，嵌套初始化保留宿主，宿主释放后可重新显式初始化MTA，证明没有残留STA引用。

13项实际编译拒绝：PickerOptions/SelectedScope各自Clone/Debug/Default/Serialize/Deserialize（10），两个私有字段构造（2），将只读scope getter当可变引用（1）。另有实际成功编译/运行对照。确认只能由真实选择与P确认创建能力，不能从字段/序列化或可变getter伪造。

## 失败记录、范围与未验证

第一次总控补测错误要求释放后CoGetApartmentType只能返回未初始化，实际系统报告MTA，导致两项断言失败；该次不同目录路径和身份断言已经通过。这不是已证实的产品泄漏。核Microsoft [APTTYPEQUALIFIER](https://learn.microsoft.com/en-us/windows/win32/api/objidl/ne-objidl-apttypequalifier)后，改为同时检查类型与IMPLICIT_MTA限定符，并验证重新显式初始化MTA返回S_OK；原显式宿主仍要求精确类型/限定符保持。更正后的三测通过；未改产品或放宽STA泄漏/宿主过度释放检查。

[CoInitializeEx](https://learn.microsoft.com/en-us/windows/win32/api/combaseapi/nf-combaseapi-coinitializeex)和[CoGetApartmentType](https://learn.microsoft.com/en-us/windows/win32/api/combaseapi/nf-combaseapi-cogetapartmenttype)为探针依据。原失败receipt/log、失败Rust源码原字节及其hash保留；成功receipt引用同产品/测试字节的已通过三条负控核心记录。worker原报告所列索引锁提交失败及编码定位问题同样保留，不抹去历史。

仅新隔离树由原冻结prepare建4空目录/1junction，普通内容0字节；所有原controller/s及其它fixture保留，无手工造夹具/清理/真实用户目录扫描。GUI只定位本次测试PID固定title，选择唯一受控nested项，再向同PID系统按钮发点击；不控制其它窗口。生产仅读原生根元数据与系统目录选择结果，不扫描或读普通内容。

COM创建/分配失败、非法系统UTF-16/P.confirm根变化等错误仍主要依源码审阅，未穷举故障注入；不声称自然用户手势鉴真、恶意生产竞态、其它Windows环境/文件系统、真实用户scope、macOS、桌面保存/壳、R遍历或M1用户闭环通过。R补单/T/U保留原单，下一波纵向宿主接线等R/T验收后按依赖成批出单。

[原门复跑](w1-s-review-20261019/original-review/2026-10-18T15-21-12.708Z-20256-result.json)、[隔离成功记录](w1-s-review-20261019/integration/2026-10-18T15-30-16.458Z-4316-result.json)、[原字节归档](w1-s-review-20261019/ARCHIVE.json)。
