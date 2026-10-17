# ADR-008：受控会话库与调用方供数页面

2026-10-18，采纳。A–I已VERIFIED（Windows范围），受控F→G→A→E/H→I模型真实联测通过，但产品尚无可复用会话入口，I页面固定读取四份报告。用户要求继续安排后续任务，并确认是否有旧单漏派。

本批仅两条独立线，由用户外贴，不启动内部实现者：

- J：`packages/lab-session`独立Rust workspace，调用已验收F/G/A/E/H，向可信后端提供受控run_id扫描、同一取消token/observer和不可变会话快照。唯一物理范围仍是本树冻结prepare创建的`.local/fixture-lab/run-*`；不扩到真实用户目录。
- K：`prototypes/lab-reader`零npm依赖页面及loopback服务，只从调用方传入内存bundle。固定会话协议和当前已验收链路的实际合成快照足以独立实现，不等待J crate；复用已验收I模型，通过固定路由提供其模块，不改I源码。

冻结`water.lab-session.v1`六字段快照与`water.lab-reader-bundle.v1`封装。J产物尚不存在；K冻结输入由总控从已验收真实F/G/A/E/H执行结果封装，不能称为J运行产物。两票收单后由总控将真实J结果传入K.startServer并验实际页面，不能用冻结数据或CDP拦截替代该接线。

J允许新建物理夹具的唯一机制是未修改的冻结prepare工具在J自己的.local中创建一批有界合成run；J生产和Rust测试只读，普通文件不读内容，无ACL/移动/删除。K只读固定产品静态文件和内存bundle，不获得物理fixture或真实用户目录权限。两树独立构建/日志/浏览器状态；J jobs1，K最多一个Chrome。

根Cargo、A–I产品、六份旧锁及旧helper保持。新helper/锁/测试清单独立，行为红/三个负控必须保留完整输出及当时源码快照，final门核对当前字节上的恢复证据，避免上一批历史先红和负控原始日志缺口。

根.gitattributes仅新增K的HTML/CSS固定LF属性，使其后续checkout与受测源码字节稳定；既有路径属性和旧锁保持，新属性文件纳入本批新冻结。

这批解决会话复用与页面供数，不等于真实用户scope授权、工具适配/分类、去重容量、桌面/IPC、macOS或删除完成。上述工作另行冻结和派发，M1仍未完成。
