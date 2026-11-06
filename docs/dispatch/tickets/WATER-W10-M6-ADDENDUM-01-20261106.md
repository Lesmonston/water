# WATER-W10-M6 补单 01：看设计稿不用开浏览器（轻门）

2026-11-06，总控（Claude）。你的受阻回执（`920afafa`）成立，责任在总控：原单“先读”第 2 项要你在浏览器里点开设计稿十一屏，而同一张单又规定浏览器只在 `browser` 模式由检查器启动。`browser` 模式在 `tokens.css` 换成 v3 之前一定会被源码政策拦下，所以开工前没有合规的办法打开设计稿。你停下来是对的。可以新开对话执行。

开工前依次读：
1. 原单 `F:/new/smaltalk/water/docs/dispatch/tickets/WATER-W10-M6-UI-20261106.md`（仍然有效，只有下面两条改动）；
2. 本补单；
3. 你的回执 `F:/new/smaltalk/water/.worktrees/w10-m6/docs/dispatch/reports/WATER-W10-M6-REPORT.md`。

## 1. 原单“先读”第 2 项改为

读设计 v3 的 DESIGN 全文，再：
- **看十一张截图**：`docs/design/water-ui-v3/previews/` 下的 `home.png`、`scan.png`、`results.png`、`drawer.png`、`confirm.png`、`done.png`、`quarantine.png`、`trends.png`、`history.png`、`settings.png`、`dedupe.png`。它们就是设计稿在 1300×900 下的完整渲染，十一屏一屏不少。
- **读 `docs/design/water-ui-v3/mockup.html` 的源码**。尺寸、颜色、圆角、间距、字号都在三段 `<style>` 里；每屏的结构在 `<section class="screen" data-s="…">` 里，抽屉与确认框在 `<!-- ov:drawer -->`、`<!-- ov:confirm -->` 之间；刻度圆表、圆点竖线、方块条、热力格子、矩形树图的画法在末尾的脚本里，可以照着写进 `views/`。设计稿里的 `style=` 与内联脚本只是设计稿的写法，产品源码仍照 SPEC 第 1 节的政策：不得有 `style=`、`innerHTML` 与内联脚本。

**不需要、也不允许为看设计稿另开浏览器**。浏览器预算不变：只在 `browser` 模式由检查器启动。

## 2. 先换令牌，`browser` 模式才能跑

`browser`、`test`、`check` 模式开头都会核对 `apps/water/ui/styles/tokens.css` 与 `docs/design/water-ui-v3/tokens.css` 逐字节相同，这是 SPEC 第 1 节的要求，不是新问题。所以动手的第一步就是把 `styles/tokens.css` 换成 v3 那份（原样复制，字节相同），之后这些模式就能正常运行。换完令牌、旧样式还没改时，页面会难看甚至测试变红，这是实现过程中的正常状态，继续往下做即可，不算受阻。

## 其余

- 全部照原单与 SPEC：精确测试名单、25 张截图、三条负控、白名单、预算都不变。
- **续做起点**：同一工作树 `F:/new/smaltalk/water/.worktrees/w10-m6`（分支 `worker/water-w10-m6`），从 `920afafa` 续做。已提交的回执与证据保留，不改写，只在其后新增提交。

## 交回

改写同一份回执，第一行与原单一致：

```text
WATER-W10-M6 任务已完成，任务报告在 F:/new/smaltalk/water/.worktrees/w10-m6/docs/dispatch/reports/WATER-W10-M6-REPORT.md
```

原有各节保留，新增“补单 01”一节，按原单“交回”一节逐项写。受阻则写“WATER-W10-M6 任务受阻”，写清冲突与最小补充需求，不要自行变通。
