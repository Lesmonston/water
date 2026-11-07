# Adds the S1 and U1 entries to record-data.json (run from the repo root; merge SHAs as arguments).
import json, sys
s1m, u1m = sys.argv[1], sys.argv[2]
p = '.local/w13-accept/record-data.json'
d = json.load(open(p, encoding='utf-8'))
d['s1'] = {'head': 'e7ea9a9e3eb2aac5fa0634e32c65ea9a4ecdf49e', 'impl': 'cc238b6a158b29082677d9f955ded47ba16575ab', 'merge': s1m, 'self': 'Codex GPT-6',
  'summary': 'medium gate: audit 0 problems; fresh tree lock, check, real and test finals; three ticket controls replayed and caught; controller mutations c1 (N = 0 wording reverted), c2 (quarantined summary written with nothing moved) and c3 (English native failure reason) all caught, no timing rerun; independent review found no high or medium issue; on main after all four merges the service tests pass 12/12 (79 s, then 95 s after the test-data tidy)',
  'later': ['an old plan prepared before a skip returns stale with the generic "结果已过期，请重新体检后再清理。"; the UI then marks the whole (fresh) conclusion stale although re-preparing the plan is enough; check in integration 11 and fix in the UI or the stale code',
    'tests/service_v1.rs keeps two ticket-era comments ("Addendum 05", "Before W10-M12 ... since M12"); tidy with the post-merge public wording pass',
    'the new card filter for fully skipped leak units is redundant with the eligible-size check; the cluster test protects clue and trends, not the card',
    'service_trends_locations moves the fake clock 60 s past the second scan; a scan slower than 60 s real time would still race (an hour would remove it)',
    'the not-run batch stores journal_error from e.to_string() (English); it never reaches the UI (diagnostics only checks presence)',
    'callers still extend stale_plans after invalidate_skips did the same (harmless duplicate)']}
d['u1'] = {'head': 'a6b84bcae0f81cad0bed899a1c5a89dbc6d4363a', 'impl': '631cb4096c2f8ab0be7916de406ccdcf3bdc77b7', 'merge': u1m, 'self': 'Codex GPT-6 (user dispatched to astra)',
  'summary': r'light gate: audit 0 problems; check, test and browser finals on 631cb409; 28 screenshots retaken, made-up paths only (D:\code\flick, C:\Users\alice, Acme); two browser controls on removeSkip red then green (worker discounted one nc2 round with an unrelated dedupe wait failure and reran it); public export scan finds no error in the UI or the fixtures',
  'later': ['fixture clue copy_text still says "Water 只看了..." (old product name) in ui-fixtures-m35.json; the service no longer emits these strings; tidy with the public wording pass',
    'UI and fixture behaviour against the real service after S1 (skip keeps the conclusion fresh) is checked in integration 11']}
json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(sorted(d))
