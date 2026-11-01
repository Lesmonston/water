fn main() {
    let path = std::env::args().nth(1).expect("plan path");
    let text = std::fs::read_to_string(path).expect("plan");
    let v: serde_json::Value = serde_json::from_str(&text).expect("json");
    let n = v["targets"].as_array().map(|a| a.len()).unwrap_or(0);
    println!("{{\"targets\":{n},\"has_guard\":{}}}", v["hard_guards"].as_array().map(|a| !a.is_empty()).unwrap_or(false));
}
