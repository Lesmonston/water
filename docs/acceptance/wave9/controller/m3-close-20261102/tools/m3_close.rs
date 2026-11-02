#![forbid(unsafe_code)]
// Controller-only F1/F2 recheck for the M3 close (wave 9 plan §2.3). Lives only in the integration tree for the run and
// is never committed to the package. It never calls clean_start.
//   location <data_dir> <root>   categories off, cleaning off: one location (drive root or folder) as custom root
//   fixture  <data_dir> <root>   categories off, cleaning on: the synthetic fixture as custom root, plus clean_prepare
//                                on each node_modules / browser group to show which ones a plan accepts
//   trends   <data_dir>          no scan: the forecast and checkup reminder from records already in data_dir (a copy
//                                of the user's default data directory, so the original is never opened)
// location and fixture list every item of the four groups the wave 9 fix touches.
use serde_json::{Value, json};
use std::{
    path::PathBuf,
    sync::Mutex,
    time::{Duration, Instant},
};
use water_service::{FolderPicker, IpcError, Service, ServiceConfig, WindowsPlatform};

const WATCHED: [&str; 4] = ["node-modules", "bundled-node-modules", "test-browser-profiles", "browser-data-dirs"];

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

fn scan(s: &Service, limit: Duration) -> Value {
    let id = call(s, "scan_start", json!({}))["scan_id"].clone();
    let started = Instant::now();
    loop {
        std::thread::sleep(Duration::from_millis(250));
        if call(s, "scan_progress", json!({}))["state"] != "running" {
            break;
        }
        assert!(started.elapsed() < limit, "scan did not finish");
    }
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

fn items(s: &Service, group: &str) -> Vec<Value> {
    call(s, "group_detail", json!({"groupId":group}))["items"]
        .as_array()
        .expect("items")
        .iter()
        .map(|i| json!({"path":i["display_path"],"total_bytes":i["total_bytes"],"eligible":i["eligible"],"reason_zh":i["reason_zh"],"in_use":i["in_use"]}))
        .collect()
}

fn open(data: &str, clean: bool, pick: Option<&str>) -> Service {
    Service::new(ServiceConfig {
        data_dir: PathBuf::from(data),
        app_version: env!("CARGO_PKG_VERSION").into(),
        clean_enabled: clean,
        platform: Box::new(WindowsPlatform::new()),
        picker: Box::new(Picker(Mutex::new(pick.map(Into::into)))),
    })
    .unwrap_or_else(|e| panic!("service: {}", e.code))
}

fn trends(data: &str) -> Value {
    let s = open(data, false, None);
    let app = call(&s, "app_state", json!({}));
    let t = call(&s, "trends", json!({}));
    json!({"checkup_due":app["checkup_due"],"last_scan":app["last_scan"]["scan_id"],"points":t["points"],"forecast":t["forecast"]})
}

fn run(data: &str, root_path: &str, clean: bool) -> Value {
    let s = open(data, clean, Some(root_path));
    for c in call(&s, "locations_get", json!({}))["categories"].as_array().expect("categories") {
        call(&s, "locations_set_category", json!({"category":c["category"],"enabled":false}));
    }
    let added = call(&s, "custom_root_add", json!({}));
    let root = added["added"]["root_id"].as_str().expect("root id").to_owned();
    let view = scan(&s, Duration::from_secs(1800));
    let prefix = format!("custom:{root}:");
    let all: Vec<_> = groups(&view)
        .into_iter()
        .filter(|g| g["group_id"].as_str().is_some_and(|id| id.starts_with(&prefix)))
        .collect();
    let watched: Vec<_> = WATCHED
        .iter()
        .map(|rule| {
            let id = format!("{prefix}{rule}");
            let g = all.iter().find(|g| g["group_id"] == id.as_str());
            let plan = clean.then(|| match s.call("clean_prepare", json!({"groupIds":[id]})) {
                Ok(p) => json!({"ok":{"item_count":p["item_count"],"total_bytes":p["total_bytes"]}}),
                Err(e) => json!({"error":e.code}),
            });
            json!({"rule":rule,"present":g.is_some(),"level":g.map(|g|g["level"].clone()),"selectable":g.map(|g|g["selectable"].clone()),
                "default_selected":g.map(|g|g["default_selected"].clone()),"total_bytes":g.map(|g|g["total_bytes"].clone()),
                "item_count":g.map(|g|g["item_count"].clone()),"eligible_count":g.map(|g|g["eligible_count"].clone()),
                "title_zh":g.map(|g|g["title_zh"].clone()),"in_use":g.map(|g|g["in_use"].clone()),
                "items":if g.is_some() { items(&s, &id) } else { vec![] },"clean_prepare":plan})
        })
        .collect();
    let others: Vec<_> = all
        .iter()
        .filter(|g| !WATCHED.iter().any(|r| g["group_id"] == format!("{prefix}{r}").as_str()))
        .map(|g| json!({"group_id":g["group_id"],"level":g["level"],"total_bytes":g["total_bytes"],"item_count":g["item_count"]}))
        .collect();
    json!({"added":added["added"],"scan":{"scan_id":view["scan_id"],"status":view["status"],"duration_ms":view["duration_ms"],"totals":view["totals"]},
        "watched":watched,"other_groups":others})
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let out = match args.iter().map(String::as_str).collect::<Vec<_>>().as_slice() {
        ["location", data, root] => run(data, root, false),
        ["fixture", data, root] => run(data, root, true),
        ["trends", data] => trends(data),
        _ => panic!("usage: location <data> <root> | fixture <data> <root> | trends <data>"),
    };
    println!("{}", serde_json::to_string_pretty(&out).expect("json"));
}
