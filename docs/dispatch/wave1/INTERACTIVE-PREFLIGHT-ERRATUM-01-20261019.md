# X/Y/Z 派前勘误01：检出字节边界

2026-10-19。三票仍DRAFT，未外贴、无实现者。初版基线8e73790的首次三道baseline在任何构建/fixture/UI前拒绝：新x/y/z证据.gitattributes本身未声明eol，检出为CRLF；新增保护的旧O/T HTML/CSS主检出与新树的物理换行也不同。旧341冻结文件无差异。

本勘误不修改旧产品、旧锁或初版freeze.lock.json。初版提交/锁/helper完整保留为派前失败历史。新证据.gitattributes增加只作用自身的LF属性，使用freeze-r2.lock.json与interactive-wave-check-r2.mjs：原物理hash保护保持；仅四个此前未纳入341物理锁的旧O/T HTML/CSS按精确Git blob身份验证，允许仓库既定的检出换行，scope仍不授权改动。不能删除校验或宽泛忽略HTML/CSS。

新helper在门前后核这四份工作文件经现有text属性得到的Git对象ID；不是仅看HEAD。主检出与三个干净新树都必须通过。总控将未派出的三条准备分支仅快进到含本勘误的共同新提交，manifest/票面同步新SHA与r2 helper/lock，重新实际baseline；不reset/清理或代实现者吞改动。

初版冻结和首次失败不作为任何新产品测试/验收。只有r2新树实际baseline通过才READY。本勘误优先于原派前helper/lock路径；接口、测试、权限、窗口预算和旧341保持。
