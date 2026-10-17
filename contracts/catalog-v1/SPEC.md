# 工具发现与保护事实包 v1

总控冻结的独立数据协议；不依赖water-contracts Rust实现。B负责数据和校验实现，不做扫描、执行或路径解析器。

## 文件与接口

产物目录`packages/tool-catalog/`，包括`index.json`、`entries/{pip,uv,npm,pnpm,huggingface,ollama}.json`、`validate.mjs`、`tests/catalog.test.mjs`、README。

index严格为`{catalog_version:"water.catalog.v1",tools:["pip","uv","npm","pnpm","huggingface","ollama"]}`，无其他键，顺序固定。entries每项严格含以下键：

- `catalog_version`同上；`tool_id`与文件名一致；`name`非空；`reviewed_on`为实际核对的YYYY-MM-DD；`runtime_verified`必须false。
- `platforms`严格为`windows`和`macos`两个对象。每个平台包含`root_candidates`、`protected_subpaths`、`notes`。
- `root_candidates`为非空数组；每项`source`枚举native_query/environment/configuration/default_hint，`key`非空标记、`path_template`为string或null、`purpose`枚举download_cache/build_cache/shared_store/model_store/mixed_state、`evidence_confidence`枚举documented/version_sensitive/unknown、`version_note`非空、`source_ids`为有效来源ID数组。
- `protected_subpaths`为数组，每项`path_hint`为可读提示、`reason`非空、`source_ids`有效。提示不是删除glob，不参与任何执行。
- `assets`非空数组；每项`kind`枚举cache/environment/model/credential/configuration/history/database/unknown、`description`非空、`default_action`必须display_only、`risk_note`非空、`source_ids`有效。
- `sources`非空数组，每项`id`工具内唯一、`url`官方HTTPS文档/源码页面、`supports`非空字符串数组、`verified_on`实际核对日期。
- `constraints`严格为`{discovery_only:true,can_scan:false,can_delete:false}`。

每一级拒绝未知键/缺键，path_template的null必须显式出现。source_ids不得悬空、不得重复；平台对象缺一项即不完整。默认路径只是线索，不能覆盖配置；root_candidates是候选清单，**不是一条所有工具共用的优先级算法**，notes应解释原生工具自己的优先级与进程环境限制。

禁止`command`、`shell`、`delete_glob`、`auto_clean`、`executable`等任何可执行字段；不把清理命令塞入path_template。path_template仅允许已定义的环境变量提示，例如`%LOCALAPPDATA%`、`$HF_HOME`、`~`，不展开，不读取本机环境，不执行原生命令。

## 校验API与错误

`validateCatalog(index, entries)`为纯函数，index为JS对象、entries为普通字典`Record<string, ToolEntry>`，返回`{valid:boolean,errors:[{code,path}]}`。code枚举`shape,version,tool_set,platforms,source_ref,unsafe_capability`；错误path只表示数据内位置，不回显敏感原文。validate.mjs不读取HOME/磁盘/环境/网络，也不在import时产生这些副作用，不修改输入；本轮不实现CLI。仅测试文件加载包内固定JSON。

JSON加载只发生在测试/CLI针对包内的固定输入中。runtime_verified=false不能因“文档看过”改true。来源事实与产品建议分开，不虚构当前支持版本上界；没有证据的路径标unknown并解释。

## 必须覆盖的事实

pip的cache内部布局非稳定接口；uv缓存不能手动改删；pnpm store共享与版本差异；HF_HOME混有token且Hub revision/blob共享；Ollama模型含可自建资产；配置/环境覆盖不能只看默认路径。不得复制上游整套目录表或把其README当官方契约。

至少每工具2条不同页面的官方来源（fragment不同不算第二页），域名按冻结的source-policy.json精确匹配、只允许HTTPS且无URL用户名密码；复用已有调研链接后要实际打开核对，每条资产和位置都有source_ids。该域名检查只筛来源，不证明具体事实已被页面支持；事实仍需总控复核。Windows/macOS分开，WSL不能冒充Windows原生目录。实现不接Rust、不改Cargo，不引入npm依赖。

## 五个定向测试名

`catalog_shape_and_tools`、`catalog_platforms_and_sources`、`catalog_protection_boundaries`、`catalog_mutation_rejections`、`catalog_purity`。

正向校验完整6工具。反向至少12种内存变体：缺平台/工具、工具重复、版本错、未知字段、缺显式null字段、悬空/重复source、runtime_verified=true、can_delete=true、可执行字段、资产非display_only。纯函数测试冻结输入/环境哨兵，不能用扫描真实HOME来证明“无副作用”。网络事实核对属于人工证据，不写成可用性测试通过。
