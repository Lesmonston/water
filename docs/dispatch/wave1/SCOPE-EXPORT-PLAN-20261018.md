# P/Q：范围许可与详细脱敏报告

2026-10-18，总控。用户要求继续，按ADR-011推进两个独立缺口。A–O原票不重做。

| 线 | 用户价值与本票边界 | 已验收前置 |
|---|---|---|
| P | 显式目录准备/确认/取消/撤销和进程内permit生命周期，绑定真实N身份；不给前端JSON或路径充当权限 | A、N |
| Q | 默认不含源ID、路径和自由文本的逐项报告，仍保留分类/保护/容量与覆盖含义 | A、H；冻结真实J报告作输入 |

P确认只代表可信Rust宿主调用，原生选择器和真实用户手势未接入；Q只返回内存JSON，不写文件/打开保存对话框。两票通过后才冻结“原生选择→P→句柄边界遍历→会话/页面”的纵向集成。M1尚未完成，不以继续增加模块数量替代用户闭环。

总控已核官方[NtCreateFile](https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntcreatefile)的RootDirectory相对名称语义及FILE_OPEN打开既有对象、OPEN_REPARSE_POINT对终项的处理；[目录信息结构](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_id_both_dir_info)要求FILE_LIST_DIRECTORY。由此推断：N现有仅属性句柄不足以直接复用为完整枚举器，后续需独立窄原生接口/ABI探针、逐段边界和竞态证据。此次仅静态研究，不调用NtCreateFile、不枚举、不扩大N权限、不声称竞态已解决。

具体基线、工作树和READY事实以manifest及SCOPE-EXPORT-READY-REPORT为准。没有自动执行者或依赖未交付模块的派单。
