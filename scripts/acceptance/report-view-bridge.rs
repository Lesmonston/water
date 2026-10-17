// Controller-owned synthetic bridge, not a product CLI.
fn main() {
    let input = include_str!("../../contracts/report-view-v1/bridge-input.json");
    let view = water_report_view::v1::project_json(input).expect("frozen synthetic report");
    println!("{}", serde_json::to_string(&view).expect("serialize projected view"));
}
