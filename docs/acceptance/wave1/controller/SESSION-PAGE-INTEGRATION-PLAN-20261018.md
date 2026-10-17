# J→K真实页面总控验收方案

2026-10-18。J已通过[单票验收和隔离集成](WATER-W1-J-REVIEW-20261018.md)，K仍在原单待回执；本方案的真实J→K页面run模式尚未执行。两票原分配、基线、冻结和权限不变。Cargo产物选择已按J总控勘误改为实际构建图，不要求整个deps目录同名rlib唯一。

## 启动条件

先分别收单核SHA/diff/范围/132冻结和完整红绿证据，复跑J五门/五测试与K三门/五测试并看截图。只有单票ACCEPTED后，在Water内新建`.worktrees/integration-jk-20261018`、`controller/water-w1-jk-20261018`，从届时已核主线合入接收SHA，提交干净后运行总控runner的run模式。若有实质实现缺陷，编号回派，不由总控代修。

本验收树的物理范围单独限定：只能由未改的冻结prepare工具在自己的.local新建一批<=24run/1MiB的D合成文件/链接；Rust只读，普通payload不读，无marker/ACL/移动/删除或清理。E旧验收树、K树及真实用户数据权限不变。新树私有离线Cargo home/target、jobs1，Chrome使用该树独立profile、最多一个，保留所有fixture/profile。

## 真正接线

1. 在接收实现上重建J及其固定本地依赖，跑J五测试/格式/clippy/metadata；K原五测试和语法检查另记为单票回归。
2. 同一新fixture index分别运行已验收F/G/A/E/H独立程序和冻结lab-session-bridge，比较13个真实快照全部六字段；原生11case/12scope/39entry按实际链接能力调整，两控制为预取消/注入权限。
3. 把J实际to_json输出在Node解析为bundle，直接调用真实K.startServer({bundle})。GET/sessions.json必须逐值等于本次J结果，不能读contracts样例；启动后改写调用方对象，服务返回保持捕获值。全程不CDP拦截、替换响应或mock J/K。
4. 真Chrome加载K页面，识别包含本次scan_id的语义select，实际触发会话切换。核可见文本中的相对路径、来源case/状态和常驻只读标记；取消空快照应移除上一快照行；两尺寸无横向溢出，记录截图与页面异常/网络请求。
5. 页面细节/键盘/焦点/HTML防线仍结合K既有完整五测、源码与人工截图核对。总控核心runner不新增工单未冻结的DOM id要求；交付后如需细化选择器，只修改控制验收适配，不改worker源码或冻结产品契约。
6. 复核44内容快照、132冻结、旧产品tree、J/K接收tree和工作树/HEAD不变，证据原字节归档，再更新主线与状态。

当前plan模式只核当前台账、工单、锁、已有输入和runner语法；不会创建验收树、运行新J/K或碰物理fixture。run模式要等单票验收后才允许启动。若实际控制集成失败，保存日志并归因，不能把准备工作写成“已真实接线”。

## 后续未派工作

真实用户scope的选择/授权、Windows身份与竞态边界、工具适配/分类、容量去重、桌面IPC/macOS仍需新架构与正式票。本方案不授权这些动作，不能由loopback数据供给接口推导扫描路径或删除权限。K尚未收口时不提前发依赖本批真实页面结果的实现单。
