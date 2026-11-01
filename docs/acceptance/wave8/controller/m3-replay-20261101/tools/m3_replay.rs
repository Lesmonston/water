#![forbid(unsafe_code)]
// Controller-only replay of the 2026-10-29 F: cleanup scenarios for the M3 close (handoff 12 §4.3).
// Lives only in the integration tree and is never committed. It never calls clean_start.
//   fixture <data_dir> <fixture_root>  categories off, fixture as custom root: dedup, worktree, skip, exclusion
//   real <data_dir>                    default categories, read-only: in-use items, orphans, forecast, cancelled scan
//   drive <data_dir> <drive_root>      categories off, a non-system drive root as custom root: by_drive
use serde_json::{Value, json};
use std::{
    path::PathBuf,
    sync::Mutex,
    time::{Duration, Instant},
};
use water_service::{FolderPicker, IpcError, Service, ServiceConfig, WindowsPlatform};

struct Picker(Mutex<Option<String>>);
impl FolderPicker for Picker {
    fn pick(&self) -> Result<Option<String>, IpcError> {
        Ok(self.0.lock().expect("picker").take())
    }
}

fn call(s: &Service, command: &str, args: Value) -> Value {
    s.call(command, args.clone())
        .unwrap_or_else(|e| panic!("{command} {args} failed: {} {}", e.code, e.message_zh))
}

fn wait_idle(s: &Service, limit: Duration) {
    let started = Instant::now();
    loop {
        std::thread::sleep(Duration::from_millis(250));
        if call(s, "scan_progress", json!({}))["state"] != "running" {
            return;
        }
        assert!(started.elapsed() < limit, "scan did not finish");
    }
}

fn scan(s: &Service, limit: Duration) -> Value {
    let id = call(s, "scan_start", json!({}))["scan_id"].clone();
    wait_idle(s, limit);
    call(s, "scan_result", json!({"scanId":id}))
}

fn groups(view: &Value) -> Vec<Value> {
    view["categories"]
        .as_array()
        .expect("categories")
        .iter()
        .flat_map(|c| c["groups"].as_array().expect("groups").clone())
        .collect()
}

fn brief(g: &Value) -> Value {
    json!({"group_id":g["group_id"],"level":g["level"],"total_bytes":g["total_bytes"],"logical_bytes":g["logical_bytes"],
        "item_count":g["item_count"],"eligible_count":g["eligible_count"],"eligible_bytes":g["eligible_bytes"],
        "by_drive":g["by_drive"],"selectable":g["selectable"],"default_selected":g["default_selected"],"in_use":g["in_use"]})
}

fn items(s: &Service, group: &str) -> Vec<Value> {
    call(s, "group_detail", json!({"groupId":group}))["items"]
        .as_array()
        .expect("items")
        .iter()
        .map(|i| json!({"item_id":i["item_id"],"path":i["display_path"],"total_bytes":i["total_bytes"],"eligible":i["eligible"],"reason_zh":i["reason_zh"],"in_use":i["in_use"]}))
        .collect()
}

fn categories_off(s: &Service) {
    for c in call(s, "locations_get", json!({}))["categories"].as_array().expect("categories") {
        call(s, "locations_set_category", json!({"category":c["category"],"enabled":false}));
    }
}

fn open(data: &str, clean: bool, pick: Option<String>) -> Service {
    Service::new(ServiceConfig {
        data_dir: PathBuf::from(data),
        app_version: env!("CARGO_PKG_VERSION").into(),
        clean_enabled: clean,
        platform: Box::new(WindowsPlatform::new()),
        picker: Box::new(Picker(Mutex::new(pick))),
    })
    .unwrap_or_else(|e| panic!("service: {}", e.code))
}

fn custom_view(s: &Service, view: &Value, root: &str) -> Vec<Value> {
    groups(view)
        .into_iter()
        .filter(|g| g["group_id"].as_str().is_some_and(|id| id.starts_with(&format!("custom:{root}:"))))
        .map(|g| {
            let id = g["group_id"].as_str().expect("id").to_owned();
            json!({"group":brief(&g),"items":items(s, &id)})
        })
        .collect()
}

fn fixture(data: &str, root_path: &str) -> Value {
    let s = open(data, true, Some(root_path.into()));
    categories_off(&s);
    let added = call(&s, "custom_root_add", json!({}));
    let root = added["added"]["root_id"].as_str().expect("root id").to_owned();
    let first = scan(&s, Duration::from_secs(120));
    let before = custom_view(&s, &first, &root);
    let py = format!("custom:{root}:python-tool-caches");
    let cache = format!("custom:{root}:cachedir-tagged");
    let py_items = items(&s, &py);
    let find = |name: &str| {
        py_items
            .iter()
            .find(|i| i["path"].as_str().is_some_and(|p| p.contains(name)))
            .map(|i| i["item_id"].as_str().expect("item").to_owned())
            .expect("fixture item")
    };
    let (skip_item, manual_item) = (find("\\pyproj\\"), find("\\pyproj2\\"));
    let plan_full = call(&s, "clean_prepare", json!({"groupIds":[cache,py]}));
    let skipped = call(&s, "skip_add", json!({"itemId":skip_item}));
    let skip_id = skipped["skipped"][0]["skip_id"].as_str().expect("skip id").to_owned();
    let after_skip = call(&s, "scan_result", json!({"scanId":first["scan_id"]}));
    let py_after_skip = groups(&after_skip).into_iter().find(|g| g["group_id"] == py).map(|g| brief(&g));
    let py_items_after_skip = items(&s, &py);
    let plan_skip_manual =
        call(&s, "clean_prepare", json!({"groupIds":[cache,py],"excludeItemIds":[manual_item]}));
    let restored = call(&s, "skip_remove", json!({"skipId":skip_id}));
    let after_restore = call(&s, "scan_result", json!({"scanId":first["scan_id"]}));
    let py_after_restore = groups(&after_restore).into_iter().find(|g| g["group_id"] == py).map(|g| brief(&g));
    let plan_restored = call(&s, "clean_prepare", json!({"groupIds":[cache,py]}));
    let plan = |p: &Value| json!({"item_count":p["item_count"],"total_bytes":p["total_bytes"],"excluded_count":p["excluded_count"],"groups":p["groups"]});
    json!({"root":root,"scan":{"scan_id":first["scan_id"],"status":first["status"],"totals":first["totals"]},"groups":before,
        "skip":{"item":skip_item,"skip_id":skip_id,"skipped_list":skipped["skipped"],"python_group_after_skip":py_after_skip,"python_items_after_skip":py_items_after_skip},
        "manual_exclusion":manual_item,
        "plans":{"full":plan(&plan_full),"skip_and_manual":plan(&plan_skip_manual),"after_restore":plan(&plan_restored)},
        "restore":{"skipped_list":restored["skipped"],"python_group_after_restore":py_after_restore}})
}

fn real(data: &str) -> Value {
    let s = open(data, false, None);
    let started = Instant::now();
    let view = scan(&s, Duration::from_secs(1000));
    let elapsed_ms = started.elapsed().as_millis() as u64;
    let in_use: Vec<_> = groups(&view)
        .into_iter()
        .filter(|g| !g["in_use"].is_null())
        .map(|g| {
            let id = g["group_id"].as_str().expect("id").to_owned();
            let rows = items(&s, &id);
            let busy: Vec<_> = rows.iter().filter(|i| !i["in_use"].is_null()).take(3).cloned().collect();
            json!({"group_id":id,"in_use":g["in_use"],"eligible_count":g["eligible_count"],"items_listed":rows.len(),
                "items_in_use":rows.iter().filter(|i| !i["in_use"].is_null()).count(),"sample":busy})
        })
        .collect();
    let app = call(&s, "app_state", json!({}));
    let trends = call(&s, "trends", json!({}));
    // Stop the next scan early: the cancelled scan must not replace the completed one.
    let next = call(&s, "scan_start", json!({}))["scan_id"].clone();
    std::thread::sleep(Duration::from_secs(3));
    let cancel = s.call("scan_cancel", json!({"scanId":next})).map(|_| "ok").unwrap_or("not_running");
    wait_idle(&s, Duration::from_secs(120));
    let cancelled = s.call("scan_result", json!({"scanId":next}));
    let app_after = call(&s, "app_state", json!({}));
    let any_group = groups(&view).into_iter().find(|g| g["item_count"].as_u64().unwrap_or(0) > 0).expect("a group");
    let detail_after = s.call("group_detail", json!({"groupId":any_group["group_id"]})).is_ok();
    json!({"scan":{"scan_id":view["scan_id"],"status":view["status"],"duration_ms":view["duration_ms"],"elapsed_ms":elapsed_ms,"totals":view["totals"]},
        "in_use_groups":in_use,"checkup_due":app["checkup_due"],"recommended_by_drive":app["last_scan"]["recommended_by_drive"],
        "drives":app["drives"],"orphans":trends["orphans"],"forecast":trends["forecast"],"points":trends["points"],
        "cancel":{"scan_id":next,"cancel":cancel,"result":cancelled.as_ref().map(|v|json!({"status":v["status"],"stale":v["stale"]})).unwrap_or_else(|e|json!({"error":e.code})),
            "last_scan_after":app_after["last_scan"]["scan_id"],"group_detail_after":detail_after,"history":call(&s,"history_list",json!({}))}})
}

fn drive(data: &str, root_path: &str) -> Value {
    let s = open(data, false, Some(root_path.into()));
    categories_off(&s);
    let added = s.call("custom_root_add", json!({}));
    let Ok(added) = added else {
        return json!({"custom_root_add":added.err().map(|e|json!({"code":e.code,"message_zh":e.message_zh}))});
    };
    let root = added["added"]["root_id"].as_str().expect("root id").to_owned();
    let view = scan(&s, Duration::from_secs(1800));
    let custom: Vec<_> = groups(&view)
        .into_iter()
        .filter(|g| g["group_id"].as_str().is_some_and(|id| id.starts_with(&format!("custom:{root}:"))))
        .map(|g| brief(&g))
        .collect();
    json!({"added":added["added"],"scan":{"status":view["status"],"duration_ms":view["duration_ms"],"totals":view["totals"]},"groups":custom,
        "recommended_by_drive":call(&s,"app_state",json!({}))["last_scan"]["recommended_by_drive"]})
}

// Categories off, no roots: the scan only takes the process snapshot, so orphans can be compared with a
// hand check taken seconds apart.
fn orphans(data: &str) -> Value {
    let s = open(data, false, None);
    categories_off(&s);
    let view = scan(&s, Duration::from_secs(120));
    json!({"scan":{"scan_id":view["scan_id"],"status":view["status"]},"orphans":call(&s,"trends",json!({}))["orphans"]})
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let out = match args.iter().map(String::as_str).collect::<Vec<_>>().as_slice() {
        ["fixture", data, root] => fixture(data, root),
        ["real", data] => real(data),
        ["orphans", data] => orphans(data),
        ["drive", data, root] => drive(data, root),
        _ => panic!("usage: fixture <data> <root> | real <data> | drive <data> <root>"),
    };
    println!("{}", serde_json::to_string_pretty(&out).expect("json"));
}
