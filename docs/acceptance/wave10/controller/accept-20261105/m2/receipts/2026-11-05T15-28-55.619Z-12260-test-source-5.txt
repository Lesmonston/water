#![forbid(unsafe_code)]

fn is_hex(c: u8) -> bool {
    c.is_ascii_hexdigit()
}

fn is_guid_body(text: &str) -> bool {
    let b = text.as_bytes();
    if b.len() != 36 {
        return false;
    }
    let dashes = [8usize, 13, 18, 23];
    for (i, ch) in b.iter().enumerate() {
        if dashes.contains(&i) {
            if *ch != b'-' {
                return false;
            }
        } else if !is_hex(*ch) {
            return false;
        }
    }
    true
}

fn is_alnum_token(text: &str) -> bool {
    !text.is_empty() && text.bytes().all(|c| c.is_ascii_alphanumeric())
}

fn token_qualifies(token: &str) -> bool {
    if token.len() < 6 || !is_alnum_token(token) {
        return false;
    }
    let has_digit = token.bytes().any(|c| c.is_ascii_digit());
    let has_upper = token.bytes().any(|c| c.is_ascii_uppercase());
    let has_lower = token.bytes().any(|c| c.is_ascii_lowercase());
    has_digit || (has_upper && has_lower)
}

fn last_separator(text: &str) -> Option<usize> {
    text.rfind(['-', '_', '.'])
}

fn replace_digit_runs(text: &str) -> String {
    let mut out = String::new();
    let chars: Vec<char> = text.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        if chars[i] == '{' && chars[i..].starts_with(&['{', 'g', 'u', 'i', 'd', '}']) {
            out.push_str("{guid}");
            i += 6;
            continue;
        }
        if chars[i] == '*' {
            out.push('*');
            i += 1;
            continue;
        }
        if chars[i].is_ascii_digit() {
            out.push('#');
            while i < chars.len() && chars[i].is_ascii_digit() {
                i += 1;
            }
            continue;
        }
        out.push(chars[i]);
        i += 1;
    }
    out
}

pub fn normalize_key(name: &str) -> String {
    let trimmed = name
        .strip_prefix('{')
        .and_then(|s| s.strip_suffix('}'))
        .unwrap_or(name);
    // `trimmed` is the body of `{guid}` or the whole name when it carries no braces.
    if is_guid_body(trimmed) {
        return "{guid}".to_string();
    }
    let mut work = name.to_string();
    if let Some(idx) = last_separator(&work) {
        let tail = work.get(idx + 1..).unwrap_or("");
        if token_qualifies(tail) {
            work.replace_range(idx + 1.., "*");
        }
    } else if work.len() >= 12 && is_alnum_token(&work) && work.bytes().any(|c| c.is_ascii_digit())
    {
        return "*".to_string();
    }
    replace_digit_runs(&work)
}
