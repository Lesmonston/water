//! Exactly one initial-directory argument; stdout contains only host events.
#![forbid(unsafe_code)]

use std::{io::Write, process::ExitCode};

fn fail(message: &str, code: u8) -> ExitCode {
    let _ = writeln!(std::io::stderr().lock(), "{message}");
    ExitCode::from(code)
}

fn main() -> ExitCode {
    // Do not print panic payloads, implementation paths, or native errors on the wire.
    std::panic::set_hook(Box::new(|_| {}));
    let mut arguments = std::env::args_os().skip(1);
    let Some(initial) = arguments.next().and_then(|value| value.into_string().ok()) else {
        return fail("Invalid host arguments.", 64);
    };
    if initial.is_empty() || arguments.next().is_some() {
        return fail("Invalid host arguments.", 64);
    }
    // Reuse S's lexical argument validation without opening any directory or UI.
    // Even this temporary PickerOptions is constructed and dropped on its thread.
    let validation = std::thread::Builder::new()
        .name("host-arguments".into())
        .spawn(move || {
            let valid = water_native_picker::v1::PickerOptions::new(&initial).is_ok();
            (initial, valid)
        });
    let Ok(validation) = validation else {
        return fail("Host unavailable.", 2);
    };
    let Ok((initial, valid)) = validation.join() else {
        return fail("Host unavailable.", 2);
    };
    if !valid {
        return fail("Invalid host arguments.", 64);
    }
    match water_scan_host::run(initial) {
        Ok(()) => ExitCode::SUCCESS,
        Err(_) => fail("Host unavailable.", 2),
    }
}
