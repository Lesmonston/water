// The v0.1.0-beta pre-release is out: RELEASE doc, STATUS item 110, plan note. Run from the repo root.
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
  ['GitHub CI 全过（第 3 节）。**预发布还没发**（标签、安装包与 zip），发之前先问用户（第 5 节）。',
   'GitHub CI 全过（第 3 节）。用户随后说“发预发布”：[Flick 0.1.0 Beta](https://github.com/Lesmonston/flick/releases/tag/v0.1.0-beta) 已发布（第 5 节）。'],
  ['## 5. 发布（还没做，先问用户）\n\n建标签 `v0.1.0-beta`（指向 `c261e4ef`），在 GitHub Releases 发预发布 “Flick 0.1.0 Beta”，上传 `.local/release/flick-0.1.0-45294836/dist/` 里的安装包、zip 与 `SHA256SUMS.txt`。如果发布时公开仓库的代码比 `c261e4ef` 新，就重打这三个文件。\n',
   '## 5. 发布（11-08 16:38 JST 已发）\n\n'
   + '用户：“发预发布”。用 `gh release create` 建标签 `v0.1.0-beta`（指向 `c261e4ef`），发预发布 “Flick 0.1.0 Beta”，说明用第 6 节的草稿；'
   + '上传 `.local/release/flick-0.1.0-45294836/dist/` 里的安装包、zip 与 `SHA256SUMS.txt`。\n\n'
   + '- 地址：https://github.com/Lesmonston/flick/releases/tag/v0.1.0-beta，标为预发布，不是草稿。\n'
   + '- GitHub 给出的三个文件摘要与本地一致：安装包 `b35889bc…`、zip `7d7fb3d0…`、`SHA256SUMS.txt` `2071dd28…`（记录在 `release-v0.1.0-beta.json`）。\n'
   + '- 以后再发版：公开仓库代码比标签新时重打三样文件，按第 4 节推送、CI 全绿后再发。\n'],
]);

edit('docs/STATUS.md', [
  ['更新时间：2026-11-08 16:40 JST（公开仓库 Lesmonston/flick 已推送，一个提交 c261e4ef，GitHub CI 13 个任务全过；GitHub 账号改名，旧地址都换了，安装包重打；预发布没发，见第 109 条）；此前',
   '更新时间：2026-11-08 16:45 JST（预发布 Flick 0.1.0 Beta 已发，标签 v0.1.0-beta，见第 110 条）；此前 2026-11-08 16:40 JST（公开仓库 Lesmonston/flick 已推送，一个提交 c261e4ef，GitHub CI 13 个任务全过；GitHub 账号改名，旧地址都换了，安装包重打，见第 109 条）；此前'],
  ['   - 还没做：发预发布（标签 `v0.1.0-beta`、传安装包与 zip），先问用户。\n',
   '   - 还没做：发预发布（标签 `v0.1.0-beta`、传安装包与 zip），先问用户。（已做，见第 110 条）\n'
   + '110. **发预发布 Flick 0.1.0 Beta**（11-08 16:38 JST，用户：“发预发布”）：标签 `v0.1.0-beta` 指向 `c261e4ef`，[Releases](https://github.com/Lesmonston/flick/releases/tag/v0.1.0-beta) 里标为预发布，传了安装包、zip 与 `SHA256SUMS.txt`；GitHub 给出的摘要与本地一致。见[发布准备](launch/RELEASE-v0.1.0-beta.md)第 5 节。\n'
   + '   - 留着的：公开仓库里被覆盖的两个旧提交和它们的两次 Actions 运行记录（要删先问用户）；E 盘本地 CI 副本 `E:\\flick-ci`（7.9 GB，下次推送前可直接重跑）；第十三波遗留的几项低严重度问题。\n'],
]);

const planPath = 'docs/PLAN-OPEN-SOURCE-20261107.md';
const plan = readFileSync(planPath, 'utf8');
writeFileSync(planPath, plan.replace(/\n*$/, '\n') + '\n用户随后说“发预发布”：[Flick 0.1.0 Beta](https://github.com/Lesmonston/flick/releases/tag/v0.1.0-beta)（标签 `v0.1.0-beta`）11-08 16:38 JST 发布，开源发布 v0.1 到此完成。\n');
console.log('appended plan note');
