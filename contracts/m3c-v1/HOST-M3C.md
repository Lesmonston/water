# HOST-M3C：宿主转发排除与“以后都跳过”（W8-K5）

2026-10-31，总控（Claude）冻结。补充 [HOST](../desktop-v1/HOST.md)、[HOST-M2](../m2-v1/HOST-M2.md)、[HOST-M3](../m3-v1/HOST-M3.md) 与 [HOST-M3-FIX](../m3-v1/HOST-M3-FIX.md)，冲突时以本文为准。只改 `apps/water/host/`。

宿主只做薄转发，不解释服务的返回值（`commands.rs` 第 1 行的原则不变）。命令形状见 [IPC-M3C](IPC-M3C.md)。

## 1. `clean_prepare` 带排除

- 命令签名增加可选参数 `exclude_item_ids: Option<Vec<String>>`，前端键为 `excludeItemIds`。
- 转发给服务：
  - 排除列表非空时，发 `{"groupIds": [...], "excludeItemIds": [...]}`；
  - 没传或为空数组时，只发 `{"groupIds": [...]}`，与原来逐字节相同。
  这样新宿主配旧服务时，不排除的清理照常可用。
- 宿主不校验 ID 内容，校验在服务里。

## 2. 新命令 `skip_add`、`skip_remove`

- `skip_add(item_id: String)` 转发 `{"itemId": ...}`；`skip_remove(skip_id: String)` 转发 `{"skipId": ...}`。
- 加进：
  - `COMMANDS`（数组长度 17 → 19，两个新名字排在最后，顺序为 `skip_add`、`skip_remove`）；
  - `generate_handler!`；
  - `cmd_*` 适配函数。
- README 里两处“17 个命令”改为 19。
- 不改 capabilities、CSP、导航与窗口安全设置。

## 3. 第七波遗留（J1）

1. **Exit 接线的源码断言**：在测试里按顺序整段匹配，不再只看三个记号是否出现。顺序为：先 `stop_cleaning_within`，再轮询间隔 200 ms，再上限 10 s。把轮询间隔与上限对调时，测试必须失败。
2. **`HOST_EXIT_DEADLINE` 补一个用例**：第一次状态查询用掉一部分时限（而不是全部）时，余下的等待不超过总时限。
3. **测试里的分词器**：
   - 认字符字面量和原始字符串；
   - 字符串之外遇到非 ASCII 字符时不 panic，而是给出明确的失败信息。
4. **README**：第 31、32 行之间补空行。
5. **`BackendSlot`**：在 `available()` 与 `call()` 处加注释，说明两次加锁之间被取走只会多等一次 5 秒，今天的调用路径走不到。只加注释，不改逻辑。

## 4. 测试

`tests/host_v1.rs` 仍是精确五个测试，名字不变。新断言加在已有测试里，失败信息带标记：

| 标记 | 内容 | 放在 |
|---|---|---|
| `HOST_M3C_EXCLUDE` | 假后端收到的 `clean_prepare` 参数：不传或传空数组时恰好是 `{"groupIds":[...]}`；非空时为 `{"groupIds":[...],"excludeItemIds":[...]}`，原样转发 | `host_service_wiring` |
| `HOST_M3C_SKIP` | 两个新命令登记在 `COMMANDS` 与 `generate_handler!` 中，转发的键分别为 `itemId`、`skipId`；命令总数为 19 | `host_command_registry` |
| `HOST_EXIT_WIRING`（已有，加强） | 第 3 节第 1 条 | 原位置 |
| `HOST_EXIT_DEADLINE`（已有，补用例） | 第 3 节第 2 条 | 原位置 |
| `HOST_TEST_TOKENIZER` | 第 3 节第 3 条：分词器的单元用例 | `host_command_registry` |

原有断言中，命令总数 17 的期望值**获准改为 19**，其余不变。

## 5. 负控与整机检查

- **nc1**：`clean_prepare` 不转发 `excludeItemIds`，测试以 `HOST_M3C_EXCLUDE` 失败。
- **nc2**：`skip_remove` 转发错键（如 `itemId`），测试以 `HOST_M3C_SKIP` 失败。
- **整机检查**（`native --final`）与第七波 J1 相同：
  - 检查器在本树 `.local/w8-k5-native/` 下生成夹具，七个分类全部关闭，只清理夹具；
  - 原生窗口 1 个，选择框 0 个；
  - 界面仍是基线版本，所以排除功能不在整机检查里验证，由合入后的整合检查验证。
