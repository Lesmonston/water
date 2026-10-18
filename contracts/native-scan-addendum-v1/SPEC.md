# R 补充契约01：已记录受保护后代的祖先

绑定 WATER-W1-R、原基线 dd09c3b8801b86a0059f3fb73fe8a250acb1d89e 和 R-001。原 SPEC/锁/helper 原字节保留。本文件仅替代原 SPEC 的 protection_reasons 固定两项规则；其它 API、许可、原生边界、权限、预算、五测试及三负控均不变。

先完成本次实际记录的 findings，再计算原因。每项 risk=protected，原因先按顺序 unknown_ownership、incomplete_evidence；仅当同 scope 的已记录 findings 中存在受保护后代，按第三项追加 protected_descendant。后代判断与真实 A 一致：空串是根，非空路径按 path + '/' 的分段前缀判断，不能把 dir2 当 dir 的后代。不根据未访问磁盘、未记录条目、目录类型或仅有 issue 推测后代；不能重复追加或给叶子乱加。

完整八项中 findings[2] dir 的原因恰三项，其余两项。max_depth=1 没有记录 dir/inner.txt 时 dir 恰两项。partial/cancelled 同样依据实际记录集合；所有报告仍真实 A.validate_report，所有默认导出仍委托 Q。不得改 A、Q、丢弃后代、降低保护或跳过校验。

现有 native_report_and_redaction 测试补上述完整/深度/partial/取消对照，保留另外四测试与全部原断言。公开入口附加 bridge 再核完整/深度报告与 Q；内存实际 A/Q probe 证明旧两项被拒、正确第三项被接受及叶子无后代仍通过，不把 probe 当 R 实现通过。
