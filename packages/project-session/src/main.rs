#![forbid(unsafe_code)]
use std::{io::Write, process::ExitCode};

fn fail(message: &str, code: u8) -> ExitCode {
    let _ = writeln!(std::io::stderr().lock(), "{message}");
    ExitCode::from(code)
}

fn main() -> ExitCode {
    std::panic::set_hook(Box::new(|_| {}));
    let mut args = std::env::args_os().skip(1);
    let Some(initial) = args.next().and_then(|s| s.into_string().ok()) else {
        return fail("Invalid project arguments.", 64);
    };
    if args.next().is_some() || water_native_picker::v1::PickerOptions::new(&initial).is_err() {
        return fail("Invalid project arguments.", 64);
    }
    match water_project_session::v1::run(initial) {
        Ok(()) => ExitCode::SUCCESS,
        Err(_) => fail("Project session unavailable.", 2),
    }
}
