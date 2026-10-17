// Controller std capability probe; arguments are fixed owned fixture paths from the helper.
use std::fs;
fn main() {
    for (index, arg) in std::env::args().skip(1).enumerate() {
        if arg == "UNSUPPORTED" {
            println!("{{\"index\":{index},\"supported\":false}}");
            continue;
        }
        let meta = fs::symlink_metadata(arg).expect("owned synthetic probe path");
        #[cfg(windows)]
        let reparse = {
            use std::os::windows::fs::MetadataExt;
            meta.file_attributes() & 0x400 != 0
        };
        #[cfg(not(windows))]
        let reparse = meta.file_type().is_symlink();
        println!("{{\"index\":{index},\"supported\":true,\"symlink\":{},\"reparse\":{},\"file\":{},\"length\":\"{}\"}}",
            meta.file_type().is_symlink(), reparse, meta.is_file(), meta.len());
    }
}
