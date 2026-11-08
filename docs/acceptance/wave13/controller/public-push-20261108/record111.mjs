// 11-08 evening: Flick installed with a desktop shortcut, old runs deleted, public repo deleted by the user and recreated
// empty, wave 14 decided (all leftovers as tickets, plus an English UI with a language switch). Run from the repo root.
import {readFileSync, writeFileSync} from 'node:fs';

const edit = (path, pairs) => {
  let s = readFileSync(path, 'utf8');
  for (const [from, to] of pairs) {
    if (s.split(from).length !== 2) throw Error(`${path}: expected one ${JSON.stringify(from.slice(0, 50))}`);
    s = s.replace(from, to);
  }
  writeFileSync(path, s);
  console.log('edited', path);
};

edit('docs/launch/RELEASE-v0.1.0-beta.md', [
  ['用户随后说“发预发布”：[Flick 0.1.0 Beta](https://github.com/Lesmonston/flick/releases/tag/v0.1.0-beta) 已发布（第 5 节）。',
   '用户随后说“发预发布”：Flick 0.1.0 Beta 发布过（第 5 节）。\n\n'
   + '**11-08 晚上更新**：用户删掉了那个公开仓库（连同预发布与旧提交），并定了“这一轮还需要做英文界面，做语言切换。做完了再提交，你可以先去建新的仓库”。'
   + '总控新建了同名的空公开仓库 `Lesmonston/flick`，私下报告漏洞已打开，**没有推代码**。'
   + '英文界面做完后，按第 4 节重新导出、推送，再重新发布（版本与标签到时再定）；第 1 节的文件届时要重打。'],
]);

edit('docs/STATUS.md', [
  ['更新时间：2026-11-08 16:45 JST（预发布 Flick 0.1.0 Beta 已发，标签 v0.1.0-beta，见第 110 条）；此前',
   '更新时间：2026-11-08 17:00 JST（用户删掉公开仓库，总控重建空仓库；第十四波定为全部遗留出单，加英文界面与语言切换，做完再推，见第 111 条）；此前 2026-11-08 16:45 JST（预发布 Flick 0.1.0 Beta 已发，标签 v0.1.0-beta，见第 110 条）；此前'],
  ['   - 留着的：公开仓库里被覆盖的两个旧提交和它们的两次 Actions 运行记录（要删先问用户）；E 盘本地 CI 副本 `E:\\flick-ci`（7.9 GB，下次推送前可直接重跑）；第十三波遗留的几项低严重度问题。\n',
   '   - 留着的：公开仓库里被覆盖的两个旧提交和它们的两次 Actions 运行记录（要删先问用户）；E 盘本地 CI 副本 `E:\\flick-ci`（7.9 GB，下次推送前可直接重跑）；第十三波遗留的几项低严重度问题。\n'
   + '111. **装上 Flick、清遗留、重建公开仓库、定第十四波**（11-08 约 17:00 JST，用户：“打开软件吧。我看一眼。帮我创建桌面快捷方式，遗留的三项都处理一下。”）\n'
   + '   - 用发布的安装包（sha256 `b35889bc…`）静默装到 `%LOCALAPPDATA%\\Programs\\Flick`，卸载项地址是新的；桌面建了 `Flick.lnk`，从它打开，用真实数据目录，窗口留给用户。\n'
   + '   - 公开仓库里旧提交的两条 Actions 运行记录已删。\n'
   + '   - `E:\\flick-ci` 用 `cmd /c rd` 删除时被运行环境的保护规则拦下（“no command may remove”），没有绕过，留给用户自己删；里面的三个目录联接都指向文件夹内部。\n'
   + '   - 用户：遗留“全部出第十四波工单”；“旧仓库已经删掉了，然后这一轮还需要做英文界面，做语言切换。做完了再提交，你可以先去建新的仓库。”'
   + '旧仓库连同预发布与旧提交都没了；总控新建空的公开仓库 `Lesmonston/flick`（11-08 07:46 UTC），私下报告漏洞已打开，没有推代码。\n'
   + '   - 第十四波：第十三波验收第 7 节与第十一次整合第 6 节的遗留（跳过后过期提示、显卡缓存 `cache.db`、J1 真实冒烟、测试措辞、J1 契约备注；integration 10 的 host7 子进程后来三次窗口都没再出现），加英文界面与语言切换。计划起草中。\n'],
]);

const planPath = 'docs/PLAN-OPEN-SOURCE-20261107.md';
const plan = readFileSync(planPath, 'utf8');
writeFileSync(planPath, plan.replace(/\n*$/, '\n') + '\n'
  + '11-08 晚上用户删掉了公开仓库（连同预发布），要求这一轮先做英文界面与语言切换，“做完了再提交”。总控已重建空的 `Lesmonston/flick`，私下报告漏洞已打开；第十四波做完后重新推送与发布。\n');
console.log('appended plan note');
