fn main() {
    let data_dir = std::env::args().nth(1).expect("data dir argument");
    assert!(std::path::Path::new(&data_dir).is_dir());
    println!("{}", water_service::summary_json());
}
