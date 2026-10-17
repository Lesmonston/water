# W1：只读内核与fixture验证

状态：A/B/C/D已VERIFIED；E独立内存报告展示投影保持READY待外贴。总控维护冻结契约/基线与验收；正式Rust扫描器与本阶段其余目标仍未实现，扫描接口/测试冻结及派前检查待完成。当前安排见[本批后续](../dispatch/wave1/NEXT-BATCH-20261017.md)。

## 交付

1. 总控先冻结ScanScope、Finding、Evidence、SizeEstimate与状态/错误语义；执行者按其实现，不能自行改契约。无删除/命令执行接口。
2. 独立Rust核心，先命令行fixture入口，不绑定UI与用户HOME。
3. 受控目录遍历：取消、深度/资源限制、显式scope、重叠根去重、链接不跟随、partial与权限错误。
4. Node/Python项目marker只读识别；名称命中保持弱证据，不直接给低风险建议。
5. 已分配空间可测才填；硬链接按身份去重，APFS clone/共享块不明标未知。
6. JSON脱敏导出及稳定测试夹具。

## 不在本工单

真实HOME扫描、依赖安装、包管理器prune、模型删除、Tauri删除IPC、支付/遥测和自动归档。

## 验收用例

- 项目内fixtures：正常Node/Python、同名误匹配、保留资产、未知数据库、重叠scope、未读目录、取消。
- 平台隔离fixture：symlink/junction、hardlink、根替换/文件身份变化、非ASCII与长路径；做不到的平台明确未验证。
- 无路径越界和fixture外写入；结果含证据与扫描覆盖边界；不存在把mtime等同最后使用的逻辑。

## 开始前检查

确认Rust/MSVC工具链、Windows构建依赖和Mac构建环境；锁定依赖并核对许可证。此检查属于开发，不执行真实用户数据清理。
