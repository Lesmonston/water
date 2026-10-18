# 总控验收工具勘误与续跑

2026-10-18。均为总控工具问题，不是N/O产品修复；全部失败回执和输出位于integration/，原门复跑位于original-review/。

1. 09:01首次原字节校验发现Git checkout的LF/CRLF转换。恢复工具核相同Git blob和纯换行差异后复制worker原字节。最初逐文件重复Git查询较慢，总控只停止已核实的自有恢复进程，改为批量读取Git树；中间09:05检查因原始stat缓存状态仍显示M而停止。对657个逐项核实路径刷新索引stat，并确认无新增staged blob/diff后通过。主线同样恢复546份原字节。没有使用reset/clean或覆盖他人改动；原树保持。
2. 09:07完整N/O五测试及六项真实负控的红/恢复绿均通过。随后Cargo metadata实际退出0，但新总控包装器把rustEnvironment的第三参数timeout当作expected exit（180000），导致工具错误停止。修包装器，不改旧冻结helper/产品/测试。09:13续跑复核此前控制链和源码字节，三个独立native测试、四项编译拒绝、实际native桥接都通过。
3. 09:13独立页面186项断言完成后，截图调用只传文件名，被冻结browser-lab边界断言拒绝。修正为.local/browser-lab/controller-evidence-reader-900x800.png；只提交该独立验收源码一行至3c604ec，产品与测试目录Git对象和原字节保持。09:14续跑重新核198冻结、657份交付、六项已恢复源码、native独立检查和完整186项模型/HTTP/Chrome断言，成功归档截图。

完整控制链来源：integration/2026-10-18T09-07-08.422Z-36624-result.json。最终成功续跑：integration/2026-10-18T09-14-54.061Z-34792-result.json，其continuation字段绑定前一回执SHA和唯一controller源码差异。不会将中间工具失败、编译拒绝或超时当作产品行为负控通过。

最终仅为N/O证据及本次总控归档添加局部.gitattributes固定字节，根规则/旧锁/旧产品不变。可复跑总控runner的参数包装也已修正，完整源码保存在主线；此次有效证据按上述阶段和SHA如实记录。
