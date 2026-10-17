# fs-fixture-kit

Water 测试夹具工厂。它只在当前工作树里创建合成目录，供以后的扫描验收使用。这里没有扫描器、分类器、ScanReport 或清理实现。

## API

唯一实现文件是 `materialize.mjs`。导入本身不读盘写盘，也不执行任何 case。

```js
import { validateFixtureManifest, materializeCase, FixtureError } from './materialize.mjs';

validateFixtureManifest(value);
await materializeCase(caseId);
await materializeCase(caseId, {});
await materializeCase(caseId, { run_id });
```

`validateFixtureManifest` 是纯函数。它只接受普通数据对象和数组，不读环境、磁盘或网络，也不改输入。成功时返回 `{ valid: true, errors: [] }`。失败时 `valid` 为 false，`errors` 每项只有 `code` 和 `path`。`code` 为 `shape`、`unsafe_path`、`reference` 或 `limit`。

`materializeCase` 每次从本文件位置读取 `contracts/fixture-lab-v1/cases.json`，先做同一套校验，再写入一个新 run。`caseId` 必须是冻结清单里的字符串。`options` 可以省略，也可以是 `{}` 或仅含 `run_id` 的普通数据对象；访问器不会被执行。省略 `run_id` 时生成 `run-` 加 UUID。给定的 `run_id` 必须完整匹配 `run-[a-z0-9][a-z0-9-]{0,47}`，尾部换行一律拒绝。

`FixtureError` 继承 `Error`，公开 `code` 和 `field`。`code` 为 `invalid_manifest`、`invalid_case`、`invalid_run_id`、`unsafe_root`、`collision` 或 `io_error`。`message` 和堆栈首行不回显调用方传入的值。

没有命令行入口，没有环境变量输出根，也没有回收函数。

## 目录范围

输出根只由模块位置推导：

```text
<当前工作树>/.local/fixture-lab/<run_id>/
```

`.local` 和 `fixture-lab` 必须是工作树内的真实目录，不能是链接。`run_id` 通过词法校验之后，解析结果还必须是 `fixture-lab` 的直接子目录，且不能是 `fixture-lab` 自身，否则抛 `unsafe_root`。已存在的 run 抛 `collision`，不覆盖、不复用、不修补。

物理文件只写在本工作树的 `.local/fixture-lab/`。这些目录被 Git 忽略，不能提交。

## 标记、partial 和失败

节点顺序是：先建声明过的普通目录，再排他创建普通文件，最后创建链接。硬链接只用系统 link。目录符号链接使用 `dir` 类型。Windows junction 使用 `junction` 和 run 内的绝对目标。非 Windows 的 `junction_dir` 不尝试创建，记为 `unsupported`，`error_code` 为 `PLATFORM_UNSUPPORTED`。

链接只有在实际调用返回 `EPERM`、`EACCES`、`ENOSYS`、`ENOTSUP` 或 `EOPNOTSUPP` 时记为 `unsupported`，并保留原始错误码。普通文件或目录失败抛 `io_error`，不会伪装成 unsupported。其它意外链接错误也不吞掉。

全部节点 `created` 时，返回 `status: "complete"`。任一链接 `unsupported` 时，返回 `status: "partial"`，且该路径不留下文件。只有这两种成功返回会写入 `.water-fixture-run.json`，内容与返回对象同值。`scanner_executed` 固定为 false。`scanner_plan` 原样深拷贝，包括 depth、entry、cancel 和 permission 计划；工厂不执行这些计划，也不修改 ACL 或权限位。

致命失败可以留下这个新建 run 和已经写入的文件。即使标记还没写出来，这个 run 也不能再次使用。工厂不会递归删除、unlink、rename 或修改 ACL。

## 资源

单次产品测试最多创建 24 个 run，全部文件内容不超过 1MiB。冻结清单本身是 11 个 case、57 个节点、575 个内容字节。工厂不生成稀疏大文件，不扫描 HOME、盘符或真实项目。

## 已验证和未验证

源码事实：本模块在调用 `materializeCase` 之前不写文件；成功结果只描述合成目录和声明式计划。

当前 Windows 工作树的预检和产品测试已实际创建硬链接、目录符号链接和 junction。这只说明这一台 Windows 机器当时的能力，不是 macOS 结果，也不是容量或扫描正确性的证明。macOS 尚未运行。能力会随机器变化，调用方应读取每次返回的 `created` / `unsupported`，不要把这次 Windows 结果写成永久能力。

未来计划：Rust 扫描器以后可以消费这些目录和 `scanner_plan`。扫描计数口径写在冻结 SPEC 里，但本工厂不实现扫描，也不把它冻结成 ScanReport 接口。
