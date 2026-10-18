# N/O总控验收及隔离集成

2026-10-18。N、O均VERIFIED（Windows受控范围），产品及报告已集成主线，无未结外贴票。A–M及五旧补单的任务对象、冻结、旧产品、根Cargo和原现场保持。M1仍未完成。

| 票 | 接收SHA | 原受测实现SHA | 原门复跑 |
|---|---|---|---|
| WATER-W1-N | d3fd65f67ba6a9f2d60b702d411dcff07687fbb7 | f894d64f88f69efda1ddfa78cb9dc31255a8b5e3 | fmt/test/clippy/metadata/bridge 通过 |
| WATER-W1-O | 5a4ad207d988be32bf14f192b1745436b097fefc | 62a8ef12eae55f8414a1c24a774905f4769e6a26 | check/test/browser 通过 |

隔离受测提交：3c604ec5660c2bc8502ad9c1b99ef2f83a524ea5，controller/water-w1-no-20261018。N原362份/O原295份交付的范围、实现后产品未变、全部worker证据与.local来源原字节已核；隔离和主线657份交付字节保持。198唯一冻结通过。没有代修产品代码、新建/清理物理fixture或访问真实用户数据。

## 实际验证

N：新私有离线Cargo target/home、Rust1.95/MSVC，完整五测试/格式/clippy/metadata/真实公开API桥接通过。复用n树原35字节/两个junction/index，只读元数据；同目录身份稳定、A/B/nested不同、refresh原句柄、三reparse输入、普通file/missing及路径/错误/wire验证通过。三个独立Rust测试补充保留名/混合分隔/UTF-16/错误先后矩阵；四个独立编译拒绝验证lease无Clone/Debug和identity/authority字段私有。窄unsafe仅Win32两个函数/class9和18，缓冲布局/对齐/借用句柄/成功后读取经审阅；没有句柄计数、并发替换或TOCTOU保证实验。

O：隔离完整五测试与语法通过。独立186项断言包含头/版本/关联/Unknown和u128反向用例、7 raw路由/HEAD/Host/方法与穿越、调用方突变隔离，18份重命名snapshot经真实startServer→HTTP→Chrome显示。大整数36893488147419103230 B、冲突组与Unknown不改0，保留scope根issue/取消空观察及来源声明含义。复核新1440×1000、900×800和详情截图；显示不代表真实扫描或来源鉴真。

N/O各三项真实生产负控从worker坏源码原字节重建，六项均完整五测命中目标红，逐次恢复原字节后完整五绿。缺文件/编译/超时不计有效红。N为重解析拒绝/常量身份/授权提升；O为服务截短/Unknown显示0/动态HTML。源码、全部stdout/stderr和哈希原样保存。

## 工具失败与保留限制

隔离首次在原字节校验阶段停止：Git checkout自动LF→CRLF改变部分文本日志（见checkout-bytes回执），未执行产品测试。恢复工具只在先核相同Git blob和纯CRLF差异后复制worker原字节，Git状态仍干净；失败receipt和恢复清单保留。此为总控检出字节问题，不是产品修复或测试放宽。

worker曾记录O导航间歇超时，原失败保留；最终原门及本次有效隔离门实际结果见receipt，不把环境失败算负控。64MiB临界和物理资源替换、非固定卷/权限/句柄查询/序列化原生失败分支未强制触发；依源码证据记录。macOS及其它Windows/文件系统、真实用户scope、选择授权/范围注册、句柄边界遍历、生产竞态、详细脱敏导出、桌面、卷唯一空间/回收量与删除仍未验收。

总控工具还有两处独立失败：Cargo metadata实际退出0，但包装器把180秒超时参数当成期望退出码；独立页面检查完成全部断言后，截图路径未带browser-lab要求的.local前缀。均只修总控工具并保存失败回执，没有改产品或弱化断言。完整五测和六项负控实际在767fd66通过；最终3c604ec只比该提交改了独立验收截图路径一行，产品与测试字节不变。续跑回执绑定此前完整控制链，并重新验证交付字节、三个native测试、四项编译拒绝及186项真实服务/HTTP/Chrome断言。详[工具勘误](w1-no-review-20261018/TOOL-ERRATA.md)。

主线仅在N/O证据与本次总控归档目录新增局部.gitattributes，使json/log/txt原字节不再经检出换行转换；根.gitattributes及198冻结保持。没有修改worker原树。

## 后续

N/O原票归档，无需重贴。按[M1计划](../../../M1-DELIVERY-PLAN.md)下一步先冻结选择授权/范围注册和句柄边界有界元数据遍历的纵向工单，再推进导出与桌面用户闭环。新单未准备为READY，不自动启动实现者。

[原单复跑](w1-no-review-20261018/original-review/2026-10-18T08-56-51.390Z-16028-result.json)、[隔离实测](w1-no-review-20261018/integration/2026-10-18T09-14-54.061Z-34792-result.json)、[原字节归档](w1-no-review-20261018/ARCHIVE.json)。
