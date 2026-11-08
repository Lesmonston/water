// STATUS item 109 and the plan's section 7 after the public push (11-08 afternoon). Run from the repo root.
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

edit('docs/STATUS.md', [
  ['更新时间：2026-11-08 13:30 JST（',
   '更新时间：2026-11-08 16:40 JST（公开仓库 Lesmonston/flick 已推送，一个提交 c261e4ef，GitHub CI 13 个任务全过；GitHub 账号改名，旧地址都换了，安装包重打；预发布没发，见第 109 条）；此前 2026-11-08 13:30 JST（'],
  ['   - 以后出宿主单：清单里宿主任务的 `expectedConfig` 要带上 `bundle.copyright`。\n',
   '   - 以后出宿主单：清单里宿主任务的 `expectedConfig` 要带上 `bundle.copyright`。\n'
   + '109. **公开仓库推送与 CI**（11-08 下午，用户：“可以推送公开仓库了。需要我做什么嘛？”）：经过见[发布准备](launch/RELEASE-v0.1.0-beta.md)第 3 节，证据在 [public-push-20261108](acceptance/wave13/controller/public-push-20261108/)。\n'
   + '   - 第一次推送 `0b74f2e5` 后 CI 13 个任务 6 个没过：导出漏了根目录 Cargo 文件，water-service 测试默认在 F 盘，process-scan 测试目录重名。用户选“总控直接改”：`c60e89c1`、`5b1792b1`（只改测试、导出脚本和 CI），新增 `scripts/release/ci-local.mjs`，在 E 盘按 CI 步骤跑通。\n'
   + '   - 用户把 GitHub 账号 `dfan0519-tech` 改名为 `Lesmonston`（“我刚改了ID，lesmonstons是原仓库”），CI 因写死旧名字全部跳过。用户定：旧地址都换（`45294836`：CI 条件改看仓库是否私有，关于页、安装包卸载项、README、issue 模板），公开仓库重做成一个用新邮箱的提交。\n'
   + '   - 重编 release 并重打安装包与 zip（`.local/release/flick-0.1.0-45294836/`），用临时数据目录验了关于页的新地址；强推 `c261e4ef`，CI 全过。私下报告漏洞已打开；私有仓库 `origin` 改为 `Lesmonston/water`。\n'
   + '   - 编译脚本副本没改到日志路径，覆盖过第十一次整合在 `.local` 里的编译日志，已从提交的证据恢复。\n'
   + '   - 还没做：发预发布（标签 `v0.1.0-beta`、传安装包与 zip），先问用户。\n'],
]);

edit('docs/PLAN-OPEN-SOURCE-20261107.md', [
  ['新建干净的公开仓库 [`dfan0519-tech/flick`](https://github.com/dfan0519-tech/flick)，11-07 已建，**空的，不放代码**。',
   '新建干净的公开仓库 [`Lesmonston/flick`](https://github.com/Lesmonston/flick)（11-08 账号改名前叫 `dfan0519-tech/flick`），11-07 已建，**空的，不放代码**；11-08 下午推送，见第 7 节末。'],
  ['| 公开仓库的提交身份 | 名字 Deford，邮箱 GitHub noreply `293710681+dfan0519-tech@users.noreply.github.com` |',
   '| 公开仓库的提交身份 | 名字 Deford，邮箱 GitHub noreply；11-08 账号改名后为 `293710681+Lesmonston@users.noreply.github.com` |'],
]);
const plan = readFileSync('docs/PLAN-OPEN-SOURCE-20261107.md', 'utf8');
writeFileSync('docs/PLAN-OPEN-SOURCE-20261107.md', plan.replace(/\n*$/, '\n') + '\n'
  + '11-08 下午用户说“可以推送公开仓库了”。CI 第一次没过，用户选“总控直接改”。随后用户把 GitHub 账号改名为 `Lesmonston`，又定了：旧地址都换成 `Lesmonston/flick`（安装包重打），公开仓库重做成一个用新邮箱的提交（强推）。'
  + '现在公开仓库只有 `c261e4ef` 一个提交，CI 全过；预发布还没发。经过见[发布准备](launch/RELEASE-v0.1.0-beta.md)第 3 节。\n');
console.log('appended plan note');
