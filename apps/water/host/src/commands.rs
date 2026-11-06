//! Thin synchronous adapters: backend replies are returned without interpretation.
use crate::{Backend, ExplorerOpener, IpcFailure, Opener};
use serde_json::{Value, json};
use std::sync::Arc;
use tauri::State;

pub const COMMANDS: [&str; 36] = [
    "app_state",
    "scan_start",
    "scan_cancel",
    "scan_progress",
    "scan_result",
    "group_detail",
    "clean_prepare",
    "clean_start",
    "clean_stop",
    "clean_progress",
    "clean_result",
    "trends",
    "history_list",
    "locations_get",
    "locations_set_category",
    "custom_root_add",
    "custom_root_remove",
    "skip_add",
    "skip_remove",
    "conclusion_get",
    "conclusion_decide",
    "detail_get",
    "group_items",
    "quarantine_list",
    "quarantine_restore",
    "quarantine_delete",
    "quarantine_progress",
    "quarantine_reveal",
    "dedupe_start",
    "dedupe_progress",
    "dedupe_cancel",
    "dedupe_result",
    "dedupe_decide",
    "locations_set_session_cleanup",
    "manifest_trust",
    "cluster_mark_fixed",
];

pub fn cmd_app_state(backend: &dyn Backend) -> Result<Value, IpcFailure> {
    backend.call("app_state", json!({}))
}

#[tauri::command]
pub(crate) fn app_state(backend: State<'_, Arc<dyn Backend>>) -> Result<Value, IpcFailure> {
    cmd_app_state(backend.inner().as_ref())
}

pub fn cmd_scan_start(
    backend: &dyn Backend,
    location_ids: Option<Vec<String>>,
) -> Result<Value, IpcFailure> {
    let args = match location_ids {
        None => json!({}),
        Some(ids) => json!({"locationIds": ids}),
    };
    backend.call("scan_start", args)
}

#[tauri::command]
pub(crate) fn scan_start(
    backend: State<'_, Arc<dyn Backend>>,
    location_ids: Option<Vec<String>>,
) -> Result<Value, IpcFailure> {
    cmd_scan_start(backend.inner().as_ref(), location_ids)
}

pub fn cmd_scan_cancel(backend: &dyn Backend, scan_id: String) -> Result<Value, IpcFailure> {
    backend.call("scan_cancel", json!({"scanId": scan_id}))
}

#[tauri::command]
pub(crate) fn scan_cancel(
    backend: State<'_, Arc<dyn Backend>>,
    scan_id: String,
) -> Result<Value, IpcFailure> {
    cmd_scan_cancel(backend.inner().as_ref(), scan_id)
}

pub fn cmd_scan_progress(backend: &dyn Backend) -> Result<Value, IpcFailure> {
    backend.call("scan_progress", json!({}))
}

#[tauri::command]
pub(crate) fn scan_progress(backend: State<'_, Arc<dyn Backend>>) -> Result<Value, IpcFailure> {
    cmd_scan_progress(backend.inner().as_ref())
}

pub fn cmd_scan_result(backend: &dyn Backend, scan_id: String) -> Result<Value, IpcFailure> {
    backend.call("scan_result", json!({"scanId": scan_id}))
}

#[tauri::command]
pub(crate) fn scan_result(
    backend: State<'_, Arc<dyn Backend>>,
    scan_id: String,
) -> Result<Value, IpcFailure> {
    cmd_scan_result(backend.inner().as_ref(), scan_id)
}

pub fn cmd_group_detail(backend: &dyn Backend, group_id: String) -> Result<Value, IpcFailure> {
    backend.call("group_detail", json!({"groupId": group_id}))
}

#[tauri::command]
pub(crate) fn group_detail(
    backend: State<'_, Arc<dyn Backend>>,
    group_id: String,
) -> Result<Value, IpcFailure> {
    cmd_group_detail(backend.inner().as_ref(), group_id)
}

pub fn cmd_clean_prepare(
    backend: &dyn Backend,
    group_ids: Option<Vec<String>>,
    exclude_item_ids: Option<Vec<String>>,
    conclusion_version: Option<String>,
    chosen_mode: Option<String>,
    dedupe_id: Option<String>,
    dedupe_version: Option<String>,
) -> Result<Value, IpcFailure> {
    let mut args = json!({});
    if let Some(ids) = group_ids {
        args["groupIds"] = json!(ids);
    }
    if let Some(ids) = exclude_item_ids.filter(|ids| !ids.is_empty()) {
        args["excludeItemIds"] = json!(ids);
    }
    for (key, value) in [
        ("conclusionVersion", conclusion_version),
        ("chosenMode", chosen_mode),
        ("dedupeId", dedupe_id),
        ("dedupeVersion", dedupe_version),
    ] {
        if let Some(value) = value {
            args[key] = json!(value);
        }
    }
    backend.call("clean_prepare", args)
}

#[tauri::command]
pub(crate) fn clean_prepare(
    backend: State<'_, Arc<dyn Backend>>,
    group_ids: Option<Vec<String>>,
    exclude_item_ids: Option<Vec<String>>,
    conclusion_version: Option<String>,
    chosen_mode: Option<String>,
    dedupe_id: Option<String>,
    dedupe_version: Option<String>,
) -> Result<Value, IpcFailure> {
    cmd_clean_prepare(
        backend.inner().as_ref(),
        group_ids,
        exclude_item_ids,
        conclusion_version,
        chosen_mode,
        dedupe_id,
        dedupe_version,
    )
}

pub fn cmd_clean_start(
    backend: &dyn Backend,
    plan_id: String,
    confirm_token: String,
) -> Result<Value, IpcFailure> {
    backend.call(
        "clean_start",
        json!({"planId": plan_id, "confirmToken": confirm_token}),
    )
}

#[tauri::command]
pub(crate) fn clean_start(
    backend: State<'_, Arc<dyn Backend>>,
    plan_id: String,
    confirm_token: String,
) -> Result<Value, IpcFailure> {
    cmd_clean_start(backend.inner().as_ref(), plan_id, confirm_token)
}

pub fn cmd_clean_stop(backend: &dyn Backend) -> Result<Value, IpcFailure> {
    backend.call("clean_stop", json!({}))
}

#[tauri::command]
pub(crate) fn clean_stop(backend: State<'_, Arc<dyn Backend>>) -> Result<Value, IpcFailure> {
    cmd_clean_stop(backend.inner().as_ref())
}

pub fn cmd_clean_progress(backend: &dyn Backend) -> Result<Value, IpcFailure> {
    backend.call("clean_progress", json!({}))
}

#[tauri::command]
pub(crate) fn clean_progress(backend: State<'_, Arc<dyn Backend>>) -> Result<Value, IpcFailure> {
    cmd_clean_progress(backend.inner().as_ref())
}

pub fn cmd_clean_result(backend: &dyn Backend, clean_id: String) -> Result<Value, IpcFailure> {
    backend.call("clean_result", json!({"cleanId": clean_id}))
}

#[tauri::command]
pub(crate) fn clean_result(
    backend: State<'_, Arc<dyn Backend>>,
    clean_id: String,
) -> Result<Value, IpcFailure> {
    cmd_clean_result(backend.inner().as_ref(), clean_id)
}

pub fn cmd_trends(backend: &dyn Backend) -> Result<Value, IpcFailure> {
    backend.call("trends", json!({}))
}

#[tauri::command]
pub(crate) fn trends(backend: State<'_, Arc<dyn Backend>>) -> Result<Value, IpcFailure> {
    cmd_trends(backend.inner().as_ref())
}

pub fn cmd_history_list(backend: &dyn Backend) -> Result<Value, IpcFailure> {
    backend.call("history_list", json!({}))
}

#[tauri::command]
pub(crate) fn history_list(backend: State<'_, Arc<dyn Backend>>) -> Result<Value, IpcFailure> {
    cmd_history_list(backend.inner().as_ref())
}

pub fn cmd_locations_get(backend: &dyn Backend) -> Result<Value, IpcFailure> {
    backend.call("locations_get", json!({}))
}

#[tauri::command]
pub(crate) fn locations_get(backend: State<'_, Arc<dyn Backend>>) -> Result<Value, IpcFailure> {
    cmd_locations_get(backend.inner().as_ref())
}

pub fn cmd_locations_set_category(
    backend: &dyn Backend,
    category: String,
    enabled: bool,
) -> Result<Value, IpcFailure> {
    backend.call(
        "locations_set_category",
        json!({"category": category, "enabled": enabled}),
    )
}

#[tauri::command]
pub(crate) fn locations_set_category(
    backend: State<'_, Arc<dyn Backend>>,
    category: String,
    enabled: bool,
) -> Result<Value, IpcFailure> {
    cmd_locations_set_category(backend.inner().as_ref(), category, enabled)
}

pub fn cmd_custom_root_add(backend: &dyn Backend) -> Result<Value, IpcFailure> {
    backend.call("custom_root_add", json!({}))
}

#[tauri::command]
pub(crate) fn custom_root_add(backend: State<'_, Arc<dyn Backend>>) -> Result<Value, IpcFailure> {
    cmd_custom_root_add(backend.inner().as_ref())
}

pub fn cmd_custom_root_remove(backend: &dyn Backend, root_id: String) -> Result<Value, IpcFailure> {
    backend.call("custom_root_remove", json!({"rootId": root_id}))
}

#[tauri::command]
pub(crate) fn custom_root_remove(
    backend: State<'_, Arc<dyn Backend>>,
    root_id: String,
) -> Result<Value, IpcFailure> {
    cmd_custom_root_remove(backend.inner().as_ref(), root_id)
}

pub fn cmd_skip_add(backend: &dyn Backend, item_id: String) -> Result<Value, IpcFailure> {
    backend.call("skip_add", json!({"itemId": item_id}))
}

#[tauri::command]
pub(crate) fn skip_add(
    backend: State<'_, Arc<dyn Backend>>,
    item_id: String,
) -> Result<Value, IpcFailure> {
    cmd_skip_add(backend.inner().as_ref(), item_id)
}

pub fn cmd_skip_remove(backend: &dyn Backend, skip_id: String) -> Result<Value, IpcFailure> {
    backend.call("skip_remove", json!({"skipId": skip_id}))
}

#[tauri::command]
pub(crate) fn skip_remove(
    backend: State<'_, Arc<dyn Backend>>,
    skip_id: String,
) -> Result<Value, IpcFailure> {
    cmd_skip_remove(backend.inner().as_ref(), skip_id)
}

pub fn cmd_conclusion_get(backend: &dyn Backend) -> Result<Value, IpcFailure> {
    backend.call("conclusion_get", json!({}))
}

#[tauri::command]
pub(crate) fn conclusion_get(backend: State<'_, Arc<dyn Backend>>) -> Result<Value, IpcFailure> {
    cmd_conclusion_get(backend.inner().as_ref())
}

pub fn cmd_conclusion_decide(
    backend: &dyn Backend,
    version: String,
    decision: Value,
) -> Result<Value, IpcFailure> {
    backend.call(
        "conclusion_decide",
        json!({"version": version, "decision": decision}),
    )
}

#[tauri::command]
pub(crate) fn conclusion_decide(
    backend: State<'_, Arc<dyn Backend>>,
    version: String,
    decision: Value,
) -> Result<Value, IpcFailure> {
    cmd_conclusion_decide(backend.inner().as_ref(), version, decision)
}

pub fn cmd_detail_get(
    backend: &dyn Backend,
    version: String,
    mode: String,
) -> Result<Value, IpcFailure> {
    backend.call("detail_get", json!({"version": version, "mode": mode}))
}

#[tauri::command]
pub(crate) fn detail_get(
    backend: State<'_, Arc<dyn Backend>>,
    version: String,
    mode: String,
) -> Result<Value, IpcFailure> {
    cmd_detail_get(backend.inner().as_ref(), version, mode)
}

pub fn cmd_group_items(
    backend: &dyn Backend,
    group_id: String,
    row_id: Option<String>,
    query: Option<String>,
) -> Result<Value, IpcFailure> {
    backend.call(
        "group_items",
        json!({"groupId": group_id, "rowId": row_id, "query": query}),
    )
}

#[tauri::command]
pub(crate) fn group_items(
    backend: State<'_, Arc<dyn Backend>>,
    group_id: String,
    row_id: Option<String>,
    query: Option<String>,
) -> Result<Value, IpcFailure> {
    cmd_group_items(backend.inner().as_ref(), group_id, row_id, query)
}

pub fn cmd_quarantine_list(backend: &dyn Backend) -> Result<Value, IpcFailure> {
    backend.call("quarantine_list", json!({}))
}

#[tauri::command]
pub(crate) fn quarantine_list(backend: State<'_, Arc<dyn Backend>>) -> Result<Value, IpcFailure> {
    cmd_quarantine_list(backend.inner().as_ref())
}

pub fn cmd_quarantine_restore(
    backend: &dyn Backend,
    quarantine_id: String,
    beside: bool,
) -> Result<Value, IpcFailure> {
    backend.call(
        "quarantine_restore",
        json!({"quarantineId": quarantine_id, "beside": beside}),
    )
}

#[tauri::command]
pub(crate) fn quarantine_restore(
    backend: State<'_, Arc<dyn Backend>>,
    quarantine_id: String,
    beside: bool,
) -> Result<Value, IpcFailure> {
    cmd_quarantine_restore(backend.inner().as_ref(), quarantine_id, beside)
}

pub fn cmd_quarantine_delete(
    backend: &dyn Backend,
    quarantine_id: String,
) -> Result<Value, IpcFailure> {
    backend.call("quarantine_delete", json!({"quarantineId": quarantine_id}))
}

#[tauri::command]
pub(crate) fn quarantine_delete(
    backend: State<'_, Arc<dyn Backend>>,
    quarantine_id: String,
) -> Result<Value, IpcFailure> {
    cmd_quarantine_delete(backend.inner().as_ref(), quarantine_id)
}

pub fn cmd_quarantine_progress(backend: &dyn Backend) -> Result<Value, IpcFailure> {
    backend.call("quarantine_progress", json!({}))
}

#[tauri::command]
pub(crate) fn quarantine_progress(
    backend: State<'_, Arc<dyn Backend>>,
) -> Result<Value, IpcFailure> {
    cmd_quarantine_progress(backend.inner().as_ref())
}

pub fn cmd_dedupe_start(backend: &dyn Backend, location_id: String) -> Result<Value, IpcFailure> {
    backend.call("dedupe_start", json!({"locationId": location_id}))
}

#[tauri::command]
pub(crate) fn dedupe_start(
    backend: State<'_, Arc<dyn Backend>>,
    location_id: String,
) -> Result<Value, IpcFailure> {
    cmd_dedupe_start(backend.inner().as_ref(), location_id)
}

pub fn cmd_dedupe_progress(backend: &dyn Backend) -> Result<Value, IpcFailure> {
    backend.call("dedupe_progress", json!({}))
}

#[tauri::command]
pub(crate) fn dedupe_progress(backend: State<'_, Arc<dyn Backend>>) -> Result<Value, IpcFailure> {
    cmd_dedupe_progress(backend.inner().as_ref())
}

pub fn cmd_dedupe_cancel(backend: &dyn Backend, dedupe_id: String) -> Result<Value, IpcFailure> {
    backend.call("dedupe_cancel", json!({"dedupeId": dedupe_id}))
}

#[tauri::command]
pub(crate) fn dedupe_cancel(
    backend: State<'_, Arc<dyn Backend>>,
    dedupe_id: String,
) -> Result<Value, IpcFailure> {
    cmd_dedupe_cancel(backend.inner().as_ref(), dedupe_id)
}

pub fn cmd_dedupe_result(
    backend: &dyn Backend,
    dedupe_id: String,
    expand: bool,
) -> Result<Value, IpcFailure> {
    backend.call(
        "dedupe_result",
        json!({"dedupeId": dedupe_id, "expand": expand}),
    )
}

#[tauri::command]
pub(crate) fn dedupe_result(
    backend: State<'_, Arc<dyn Backend>>,
    dedupe_id: String,
    expand: bool,
) -> Result<Value, IpcFailure> {
    cmd_dedupe_result(backend.inner().as_ref(), dedupe_id, expand)
}

pub fn cmd_dedupe_decide(
    backend: &dyn Backend,
    dedupe_id: String,
    version: String,
    group_id: String,
    include: bool,
) -> Result<Value, IpcFailure> {
    backend.call(
        "dedupe_decide",
        json!({"dedupeId": dedupe_id, "version": version, "groupId": group_id, "include": include}),
    )
}

#[tauri::command]
pub(crate) fn dedupe_decide(
    backend: State<'_, Arc<dyn Backend>>,
    dedupe_id: String,
    version: String,
    group_id: String,
    include: bool,
) -> Result<Value, IpcFailure> {
    cmd_dedupe_decide(
        backend.inner().as_ref(),
        dedupe_id,
        version,
        group_id,
        include,
    )
}

pub fn cmd_locations_set_session_cleanup(
    backend: &dyn Backend,
    tool: String,
    enabled: bool,
    days: u32,
) -> Result<Value, IpcFailure> {
    backend.call(
        "locations_set_session_cleanup",
        json!({"tool": tool, "enabled": enabled, "days": days}),
    )
}

#[tauri::command]
pub(crate) fn locations_set_session_cleanup(
    backend: State<'_, Arc<dyn Backend>>,
    tool: String,
    enabled: bool,
    days: u32,
) -> Result<Value, IpcFailure> {
    cmd_locations_set_session_cleanup(backend.inner().as_ref(), tool, enabled, days)
}

pub fn cmd_manifest_trust(
    backend: &dyn Backend,
    manifest_id: String,
    trusted: bool,
) -> Result<Value, IpcFailure> {
    backend.call(
        "manifest_trust",
        json!({"manifestId": manifest_id, "trusted": trusted}),
    )
}

#[tauri::command]
pub(crate) fn manifest_trust(
    backend: State<'_, Arc<dyn Backend>>,
    manifest_id: String,
    trusted: bool,
) -> Result<Value, IpcFailure> {
    cmd_manifest_trust(backend.inner().as_ref(), manifest_id, trusted)
}

pub fn cmd_cluster_mark_fixed(
    backend: &dyn Backend,
    group_id: String,
    fixed: bool,
) -> Result<Value, IpcFailure> {
    backend.call(
        "cluster_mark_fixed",
        json!({"groupId": group_id, "fixed": fixed}),
    )
}

#[tauri::command]
pub(crate) fn cluster_mark_fixed(
    backend: State<'_, Arc<dyn Backend>>,
    group_id: String,
    fixed: bool,
) -> Result<Value, IpcFailure> {
    cmd_cluster_mark_fixed(backend.inner().as_ref(), group_id, fixed)
}

pub fn cmd_quarantine_reveal(
    backend: &dyn Backend,
    opener: &dyn Opener,
    target_id: String,
) -> Result<Value, IpcFailure> {
    let located = backend.call("quarantine_locate", json!({"targetId": target_id}))?;
    let path = located
        .get("path")
        .and_then(Value::as_str)
        .filter(|path| crate::opener::valid_quarantine_path(path))
        .ok_or_else(|| IpcFailure {
            code: "invalid".into(),
            message_zh: "这个隔离区文件夹不能打开。".into(),
        })?;
    opener.open_folder(path).map_err(|_| IpcFailure {
        code: "unavailable".into(),
        message_zh: "隔离区文件夹暂时打不开。".into(),
    })?;
    Ok(json!({}))
}

#[tauri::command]
pub(crate) fn quarantine_reveal(
    backend: State<'_, Arc<dyn Backend>>,
    target_id: String,
) -> Result<Value, IpcFailure> {
    cmd_quarantine_reveal(backend.inner().as_ref(), &ExplorerOpener, target_id)
}
