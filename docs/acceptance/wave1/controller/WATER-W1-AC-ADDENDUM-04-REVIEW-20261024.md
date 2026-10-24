# AC补单04收单与根元素证据缺口复核

2026-10-24。接收a333487，产品实现eb7f801未改、未集成，AC保持BLOCKED。**新增补单05准备一次保存明细的有界取证，根因仍未知。**本轮总控只读审计/无UI策略预检，未启动产品或新的窗口。

## 事实与未知

[收单审计](w1-ac-root-20261024/controller/2026-10-24T07-08-02.257Z-submission-audit.json)核精确干净分支、仅04报告/证据提交，14产品文件与实现/原check/test/负控哈希一致。原46/189/88及04的51份原件共374份/15557570字节，索引/Git字节保持；04的51份/295246字节另核source/archive/Git一致。

[原回执副本](w1-ac-root-20261024/worker/ORIGINAL-REPORT.txt)：resume0、offline build0、observer1。实际错误Unexpected own top-level window count发生在主窗选择和systemWindows赋值之前，UIA文件没有数量/根行/title/names/children，pageAccepted=false/closeRequested=false/exitCode=null。随后外层Owned desktop exit timeout并请求终止，不等于正常退出。nativeWallMs未赋值，整门23.042秒不能冒称精确产品存活时长。

只知道原guard观察到Count>1，不能重建具体数量或元素；不能把空names说成页面空白，也不能把CUI/subsystem3线索当成console/隐藏根的运行证据。两次窗口尝试和两次入口终止请求保留，手动终止0，未见残留不证明正常退出。原04预算耗尽，不重跑原入口。

## 控制修订及独立无UI预检

旧observer在计数guard前没有保存根字段，这是明确的取证缺口。新ASCII根policy/observer先保存真实Count及至多32行PID/name/class/type/handle/offscreen/bounds/runtimeId/读取错误，再保存判定，后执行原Count>1拒绝。唯一已核PID/title/handle/WindowPattern主窗仅用于失败清理；未知/歧义不随意关闭，不根据offscreen/handle0或类名排除额外根。产品如果有真实多窗仍失败。

[来源语义](w1-ac-root-20261024/controller/SOURCE-NOTES.json)参考Microsoft一手[UIA树](https://learn.microsoft.com/en-us/dotnet/framework/ui-automation/ui-automation-tree-overview)、[CacheRequest](https://learn.microsoft.com/en-us/dotnet/framework/ui-automation/use-caching-in-ui-automation)、[NativeWindowHandle](https://learn.microsoft.com/en-us/dotnet/api/system.windows.automation.automationelement.automationelementinformation.nativewindowhandle?view=windowsdesktop-9.0)、[IsOffscreen](https://learn.microsoft.com/en-us/dotnet/api/system.windows.automation.automationelement.automationelementinformation.isoffscreen?view=windowsdesktop-9.0)。这些说明诊断字段，不识别本次缺失元素；cache也不是全应用原子快照。未复制上游实现或修改产品。

[冻结后preflight](w1-ac-root-20261024/preflight/2026-10-24T07-14-35.150Z-29728-preflight-result.json)实际通过3个PS1 ASCII/Parser、10个CacheRequest静态属性绑定、13个合成根/清理目标边界、实际未改HTML四文案和逐项缺失拒绝。额外可见/offscreen/handle0三个双根样本全部失败；错误PID/歧义/属性读取失败不提供任意清理目标。运行与预检调用相同policy。**没有执行UIA枚举、产品或窗口，未证明实际根因、窗口捕获/关闭已修好。**前期纯策略探针记录另保留，不作为最终源码的真实窗口证明。

新wrapper复用原capture/reuse/rustEnv，[控制审计](w1-ac-root-20261024/controller/CONTROL-AUDIT.json)核函数原字节；只增加诊断入口/目录/新冻结、25秒observer上限和分别记录primary/cleanup/实际wall时间，实际静态窗预算仍≤30秒。旧529/原helper/文案policy不改。新resume在干净a333487/相同source-test哈希/535约束通过，不运行build/test/native。

## 续做与预算

[补单05](../../../dispatch/tickets/WATER-W1-AC-ADDENDUM-05-20261024.md)及[READY指令](../../../dispatch/wave1/AC-DESKTOP-ADDENDUM-05-READY-REPORT-20261024.md)只回原AC对话，14产品文件只读，复用check/test/旧先红/两负控。本编号单另增1次静态窗取证allocation/最多30秒、0目录窗，累计分配3次，旧已用2次不删除或恢复；总控未提前消耗。

若仍Count>1，即使主窗安全关闭并正常退出也仍受阻；交回真实明细后再决定计数契约或产品修复。不得在本补忽略根/提高数量/改Rust子系统。严格根唯一、四文案、正常exit0、私有profile/子WebView退出全部实际满足才可记录native通过；诊断完成与产品验收分别记录。

[进程收尾](w1-ac-root-20261024/controller/PROCESS-CLOSE.json)未见相关残留，本轮手动终止0、系统窗0、UIA枚举/下载/产品修改0，网络/Cargo配置未改。原profile/cache/日志保持，无清理。其余30任务/槽位对象保持，未启动worker或实现子代理。

[归档](w1-ac-root-20261024/ARCHIVE.json)含104项/673301字节，保存04完整原件、实际无UI门/14快照、来源与控制源码；排除cache/target/binary/profile/AA像素。原529保持，六新条目/23继承锁共535。[最终审计](w1-ac-root-20261024/FINAL-AUDIT.json)保持AC未验收、根因未知、新native未执行。真实AA→AD、桌面扫描、用户scope、自然同意鉴真、生产竞态、macOS/M1仍未验收。
