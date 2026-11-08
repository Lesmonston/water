// STATUS item 112: wave 14 issued (R1, J1, U1 ready; S1 after R1; H1 after S1). Run from the repo root.
import {readFileSync, writeFileSync} from 'node:fs';

const path = 'docs/STATUS.md';
let s = readFileSync(path, 'utf8');
const pairs = [
  ['更新时间：2026-11-08 17:00 JST（',
   '更新时间：2026-11-08 17:30 JST（第十四波出单：英文界面与语言切换、真实体检进度、主页面一屏放下、第十三波遗留；R1、J1、U1 可以开工，S1 等 R1 合入、H1 接在 S1 后面，见第 112 条）；此前 2026-11-08 17:00 JST（'],
  ['   - 第十四波：第十三波验收第 7 节与第十一次整合第 6 节的遗留（跳过后过期提示、显卡缓存 `cache.db`、J1 真实冒烟、测试措辞、J1 契约备注；integration 10 的 host7 子进程后来三次窗口都没再出现），加英文界面与语言切换。计划起草中。\n',
   '   - 第十四波：第十三波验收第 7 节与第十一次整合第 6 节的遗留（跳过后过期提示、显卡缓存 `cache.db`、J1 真实冒烟、测试措辞、J1 契约备注；integration 10 的 host7 子进程后来三次窗口都没再出现），加英文界面与语言切换。计划起草中。\n'
   + '112. **第十四波出单**（11-08 约 17:30 JST）：[计划](dispatch/wave14/PLAN.md)、契约 [W14](../contracts/w14-v1/W14.md)、[清单](dispatch/wave14/manifest.json)。\n'
   + '   - 用户定：第一次打开跟随系统；英文覆盖全部；线索复制跟界面语言；界面改动直接派单。\n'
   + '   - 用户看了装好的 Beta：主页面一屏放下；进度显示“完成”却停在 99%、没有下一步；去掉“每秒一根”这类说明，竖线图换成带颜色的方块。\n'
   + '   - 停在 99% 的原因：规则位置做完后整盘位置还要做一次“空间分布”整盘遍历，没有进度、把整盘字节算进“已发现”（用户 F 盘跑了 6 分钟以上）。扫描包每 50 ms 已报字节，只改服务就能给真实进度（W14 第 3.3 节）。\n'
   + '   - 普查：界面约 300 句、服务约 230 句（有几处逻辑拿中文句子判断）、规则 118 条约 550 句、宿主 6 条错误与安装包；旧记录在英文界面里照旧显示中文。\n'
   + '   - 单子：R1 规则英文（轻门）、J1 扫描遗留（中门）、U1 界面（轻门含浏览器，中英截图）现在开工，底 `d692bd60`，基线预检都过。S1 服务（中门）等 R1 合入，因为要用规则的英文字段；H1 宿主与安装包接在 S1 交回的提交上，两单一起合入（`IpcError` 加英文字段，宿主里构造它的两处要同时改）。\n'
   + '   - 方块图沿用结论页现有方块样式（v3 定稿的天蓝深浅），不新增设计 token：界面检查器要求 `tokens.css` 与设计稿逐字节一致。\n'
   + '   - 两个检查器加认 `WATER-W14-` 单号。\n'],
];
for (const [from, to] of pairs) {
  if (s.split(from).length !== 2) throw Error('expected one ' + JSON.stringify(from.slice(0, 40)));
  s = s.replace(from, to);
}
writeFileSync(path, s);
console.log('STATUS 112 added');
