# Scope Registry v1 — 可信进程内的范围生命周期

packages/scope-registry，package water-scope-registry/lib water_scope_registry，pub mod v1；独立workspace members=["."]/resolver3，0.1.0/edition2024/rust-version1.95/publish=false，四auto=false；唯一lib与tests/registry_v1.rs。直接依赖恰为water-contracts(path ../../crates/water-contracts)、water-native-root(path ../native-root)，无serde/dev/build/新包/unsafe/bin。锁只用根锁已有registry版本/source/checksum；私有离线home/target/tmp，jobs1。真实N执行所有路径/卷/属性/身份检查，不复制或绕过N。

## 公共API

```rust
pub struct Registry; // 私有字段，无Clone/Debug/Serialize/Deserialize/Default
pub struct PendingSelection; // 同上
pub struct RegisteredScope; // 同上
pub struct ScanPermit; // 同上
impl Registry {
    pub fn new(capacity: usize) -> Result<Self, RegistryError>;
    pub fn len(&self) -> usize;
    pub fn is_empty(&self) -> bool;
    pub fn prepare(&mut self, scope_id: &water_contracts::v1::OpaqueId, path: &str)
        -> Result<PendingSelection, RegistryError>;
    pub fn preview(&self, pending: &PendingSelection)
        -> Result<water_native_root::v1::RootObservation, RegistryError>;
    pub fn confirm(&mut self, pending: &PendingSelection)
        -> Result<RegisteredScope, RegistryError>;
    pub fn decline(&mut self, pending: &PendingSelection) -> Result<(), RegistryError>;
    pub fn begin_scan(&mut self, scope: &RegisteredScope) -> Result<ScanPermit, RegistryError>;
    pub fn check_permit(&self, permit: &ScanPermit)
        -> Result<water_native_root::v1::RootObservation, RegistryError>;
    pub fn finish(&mut self, permit: &ScanPermit) -> Result<(), RegistryError>;
    pub fn cancel(&mut self, scope: &RegisteredScope) -> Result<(), RegistryError>;
    pub fn revoke(&mut self, scope: &RegisteredScope) -> Result<(), RegistryError>;
}
// PendingSelection/RegisteredScope/ScanPermit各有且仅有scope_id(&self)->&OpaqueId getter。
```

RegistryError公开枚举恰为InvalidCapacity、RegistryFull、DuplicateScope、DuplicateRoot、InvalidCapability、WrongState、RootChanged、Native(water_native_root::v1::RootError)，Debug/Clone/PartialEq/Eq/Display/Error。Native的Display与原RootError相同，其余恰为枚举名；不得回显路径、ID、OS错误或指针。Native只包装N错误，不吞掉或降级。

## 状态与所有权

capacity仅1..=16；len计算所有pending/confirmed/active条目，不能超限。prepare先查RegistryFull，再DuplicateScope（同scope_id任何状态），再真实N.open_directory。失败不插槽/不泄露lease。成功保存N自有DirectoryLease、scope_id、独立registration身份和pending状态，不保存路径/原始handle、不自行打开File。按(volume_serial,file_id)判断本registry既有根（含pending）重复，DuplicateRoot；混合分隔/不同scope_id不能绕过。不同祖先/后代根的重叠本版不检测，不汇总范围容量，不宣称scope互斥。

必须用每registry一个独立Arc<()> owner、每条登记一个独立Arc<()> registration、每次begin一个独立Arc<()> attempt，通过Arc::ptr_eq验证身份。能力内字段全部私有，不暴露Arc/指针/索引/构造器；scope_id串、序号、观察JSON不能充当权限。禁止Clone能力、Serde能力、静态counter或只按scope_id查找认证。即使scope_id/根完全相同，两个registry的能力不可互用；撤销后同ID同根重建也不能让旧对象复活。Arc存活避免指针地址被旧能力复用，不把裸指针序列化。

所有涉及能力的入口先验证owner+registration；不符/条目已移除一律InvalidCapability，不做N IO。preview仅pending，调用原lease.refresh，核identity与最初观察相等后返回clone；非pending WrongState。confirm同样仅pending、真实refresh/身份相等后转confirmed，返回唯一RegisteredScope；旧Pending的preview/confirm/decline都WrongState。decline仅pending，移除条目并drop lease；重放InvalidCapability。

begin_scan仅confirmed且无活动attempt，refresh/身份比对后新attempt并转active；再次begin WrongState，不能覆盖或取消已有permit。check_permit验证owner+registration+当前active attempt后refresh/比对，返回N观察；未活动/已finish/已cancel/旧attempt均InvalidCapability。finish先check_permit，成功清attempt回confirmed；同permit第二次finish/check InvalidCapability。cancel只接受有效RegisteredScope且active，成功清attempt回confirmed；无活动WrongState，旧permit失效但scope可begin新attempt。revoke接受有效RegisteredScope的confirmed/active，移除条目/drop lease，所有旧对象失效；再次revoke InvalidCapability。清理一个根不影响其它根或registry。registry drop自动释放其leases；外持能力在其它registry不可验证。

状态检查/owner失败不得改变任何条目或活动permit。native refresh失败/RootChanged不得发新能力、变状态或吞错误；保留原状态，宿主可cancel/revoke。RootChanged仅identity与最初观察不同；本机固定句柄未必能实触此分支，静态覆盖限制如实写，不造假观察入口。

## 产品边界

confirm是可信Rust宿主的进程内声明，不是经过认证的用户手势。没有native picker/IPC/HTTP/CLI/WebView/LLM入口，也不从JSON恢复registry或permit。文档必须明确原生用户确认未接入，不可把本票说成真实scope安全扫描完成。N观察的authorization_granted/traversal_allowed/race_protection_verified仍全部false，P不改写这些字段；P能力也不支持任何遍历操作。

后续原生扫描器需接P的有效ScanPermit及Registry.check_permit，打开根后再比对观察身份，逐子段句柄边界；不能只消费已序列化RootObservation或任意路径。该未来接线本票不实现。无路径保存、枚举、普通内容读取、文件写入、网络、环境、时钟、日志、进程、缓存、额外FFI或旧模块改动。

## 五测试与负控

唯一registry_registration、registry_confirmation、registry_permits_and_replay、registry_revocation_and_owner、registry_public_native_bridge。真实N只访问冻结本树.local的两个正常根/嵌套根/混合分隔alias/一个junction及必要祖先metadata，无真实目录/盘根/HOME。测试不创建/写普通文件/改名/ACL/删除；仅冻结prepare建4空目录+1junction，普通内容0字节，保留全部。

覆盖capacity0/17、full/duplicate检查优先、失败不占槽、同根别名/不同根、pending未授权/确认/拒绝重放、每根单活动attempt、finish/cancel重放、新attempt旧permit无效、跨registry同ID同根、撤销后同ID重建、原N错误/wire flags不变、其余scope不受影响。至少实际prepare→preview→confirm→begin→check_permit→finish/revoke公开链路。实际N身份源不能用模拟IO代替。

行为红P_BEHAVIOR；真实负控nc1关闭单active防护→P_SINGLE_ACTIVE；nc2关闭owner/registration认证→P_OWNER_BOUND；nc3 revoke保留active条目/attempt→P_REVOKED。完整五红与原字节恢复五绿，源码和测试字节证据按scope-export-v1 COMMON。能力不可Clone/Debug/序列化/构造还须编译拒绝/源码证据；无法通过类型系统伪造的状态不加测试后门。
