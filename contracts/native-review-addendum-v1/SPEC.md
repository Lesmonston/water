# Native Review 补充单01：每目录预算与实际记录一致

2026-10-19。绑定W原票、受测实现63db62b020efff4601a03da7dc561549dcb1f762、接收提交b65902d8f702bf34097adffd7fbaa7daddabe934。原native-session/native-review协议、原五测试/三负控/final和336冻结保持，不更改旧SPEC、helper或输入；本补单明确原“按真实R契约校验limits/来源”的一项必要一致性。

对已确认的原生snapshot，按每个finding.relative_path的最后一个 `/` 分组，前缀为父目录相对路径；无 `/` 时父目录为根 `""`。同一父目录的**已记录直接子项数**必须小于或等于policy.limits.max_dir_entries。该下界检查适用于completed/partial/cancelled，不把孙辈算作父目录的直接子项，不根据未记录内容、issue或目录名补造条目。选择器取消且无snapshot时没有此项计数约束，仍按原规范验证预算范围。

理由：R的walk.rs在列目录时传入max_dir_entries；list返回Limit则记EntryLimit并结束该目录，不会产生超过该上限的同目录finding。完整冻结捕获有根的7个直接子项、dir的1个直接子项；原模型接受将限值32改成1但仍completed的输入，属于可由公开流/HTTP实际观察的协议矛盾。

不一致输入必须在模型验证阶段抛原固定Error('Unsupported native review.')，readSession/startFromStream/startServer不得服务该输入；不得修正caller预算、截断findings、降成partial/Unknown后接受、重算Q或改用legacy tag。校验不认证来源或新鲜度，只拒绝从已提供数据即可证明的矛盾。旧24份legacy数据仍真实委托T，不补造原生policy或套新计数规则。

保持所有原键、标签、Q原字符串、数组顺序、Unknown/保护、取消区分、来源总量和隐私。保持8份实际原生捕获、两份ID合成变体、旧T24份、合法64MiB/加LF/超限、严格UTF-8和所有原断言。允许在现有native_review_protocol等顶层中追加回归，仍恰五顶层。

至少覆盖：完整与partial同目录超限拒绝；根/非根父目录分别计数；等于上限接受；多个父目录的合法总条目数可以大于单目录上限；选择取消无snapshot且limit=1接受；三个公开入口拒绝原矛盾输入且无server遗留。非根及跨目录对照可以是明确合成的内存报告，必须同步原有summary/Q/祖先保护等语义，不冒充新扫描。不得为此开放物理fixture或启动V。

原稳定版behavior与nc1/2/3四条完整红绿及三final仍由冻结原helper执行/审计；新wrapper不放宽它们。另用冻结budget probe验证修复本身：稳定字节下临时禁用真实新增预算guard，red-budget命中W_DIR_BUDGET，立即原字节恢复并regression通过。首次修复前的已提交缺陷也留red-budget，但新增测试后必须在稳定字节补上述负控，不能把旧测试哈希当当前证明。

本补无原生系统窗口、V构建/程序调用、内容采集、真实用户目录或其它产品修改。最多一个私有headless Chrome，一树一次一门；通过且字节不变不重复整套。V→W真正启动器联合链待本补交回后由总控另做有界验收。
