// STATUS item 113: wave 14 first acceptance batch (R1, J1 verified and merged; U1 addendum 01; S1 issued). Repo root.
import {readFileSync, writeFileSync} from 'node:fs';

const path = 'docs/STATUS.md';
let s = readFileSync(path, 'utf8');
const pairs = [
  ['更新时间：2026-11-08 17:30 JST（',
   '更新时间：2026-11-08 19:40 JST（第十四波第一批收单：R1、J1 验收合入，U1 功能通过但出补单 01，S1 出单，见第 113 条）；此前 2026-11-08 17:30 JST（'],
  ['   - 两个检查器加认 `WATER-W14-` 单号。\n',
   '   - 两个检查器加认 `WATER-W14-` 单号。\n'
   + '113. **第十四波第一批收单**（11-08 约 19:40 JST，用户：“收活”）：[验收记录](acceptance/wave14/controller/WATER-W14-REVIEW-20261108.md)。\n'
   + '   - R1 规则英文 VERIFIED（轻门），合入 `3693a6b2`；118 个标题与三条全文读过，通顺准确。\n'
   + '   - J1 扫描 VERIFIED（中门），合入 `985222a0`；新验收树三个 final 过，三条负控重放与三条总控变异都抓到，独立审查无高中级。\n'
   + '   - U1 界面：功能通过（新验收树三个 final 与负控重放都过；审计 3 条只是 `app.css` 工作区混合换行）。独立审查中级一条（英文没有单复数），加上方块图 0 字节类别与图例被切、第一屏闪语言、未知状态停轮询、结论页文字被切等，出补单 01 在原树续做，补完再合入。\n'
   + '   - S1 服务出单（底为本条所在提交），H1 接在 S1 交回的提交上。\n'],
];
for (const [from, to] of pairs) {
  if (s.split(from).length !== 2) throw Error('expected one ' + JSON.stringify(from.slice(0, 40)));
  s = s.replace(from, to);
}
writeFileSync(path, s);
console.log('STATUS 113 added');
