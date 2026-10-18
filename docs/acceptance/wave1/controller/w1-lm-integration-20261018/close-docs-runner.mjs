import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const replace=(p,a,b)=>{const t=readFileSync(p,'utf8');assert(t.includes(a),p);writeFileSync(p,t.replace(a,b));};
replace('docs/dispatch/wave1/PARALLEL-ASSESSMENT-20261018.md','# K补单期间的并行任务评估','# K补单期间的并行任务评估\n\n最终收口（2026-10-18）：L/M均已VERIFIED，见[验收报告](../../acceptance/wave1/controller/WATER-W1-LM-REVIEW-20261018.md)。下文DRAFT/READY状态为评估及派前时历史，不是待执行工单。');
replace('docs/ROADMAP.md','A–K已验收，受控J→K页面通过；未放行真实用户scope/桌面','A–M已验收，J→K页面及L/M内存侧车通过；未放行真实用户scope/侧车展示/桌面');
