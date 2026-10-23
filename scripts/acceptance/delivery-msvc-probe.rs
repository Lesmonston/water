// Controller prerequisite check. No Water product, native UI or filesystem IO.
#![forbid(unsafe_code)]
fn main() {
    assert!(cfg!(all(target_os = "windows", target_arch = "x86_64")));
    println!("water.desktop-prerequisite.v1");
}
