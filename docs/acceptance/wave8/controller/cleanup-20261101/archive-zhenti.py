# denglou C3 (user, 11-02: "C3压缩归档"): zip each subfolder of _review\zhenti into <out>\<name>.zip
# (a subfolder over --split-gb is zipped per child, its loose files in one more zip), then reopen every zip,
# compare names and sizes with what was read and run testzip() (CRC of every entry). A zip is written as
# .partial and renamed only after it verifies. Top-level files of _review\zhenti stay in place. Never deletes
# or moves sources; the verified folders are quarantined afterwards by the controller.
# usage: python archive-zhenti.py <src> <out dir> <report.json> [--workers 4] [--min-age-hours 48] [--split-gb 8]
import argparse, json, os, stat, sys, time, zipfile
from concurrent.futures import ProcessPoolExecutor


def is_link(p):
    # Python 3.10's islink() is false for junctions; zhenti\final holds one into a live worktree's node_modules.
    st = os.lstat(p)
    return os.path.islink(p) or bool(getattr(st, 'st_file_attributes', 0) & stat.FILE_ATTRIBUTE_REPARSE_POINT)


def walk_files(root):
    for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
        dirnames[:] = [d for d in dirnames if not is_link(os.path.join(dirpath, d))]
        if not dirnames and not filenames:
            yield dirpath, True
        for f in filenames:
            p = os.path.join(dirpath, f)
            if not is_link(p):
                yield p, False


def tree_stats(p):
    size, newest = 0, os.lstat(p).st_mtime
    for q, is_dir in (walk_files(p) if os.path.isdir(p) else [(p, False)]):
        st = os.lstat(q)
        newest = max(newest, st.st_mtime)
        if not is_dir:
            size += st.st_size
    return size, newest


def build(job):
    name, src, sources, out = job
    final = os.path.join(out, name + '.zip')
    part = final + '.partial'
    expected = {}
    t0 = time.time()
    with zipfile.ZipFile(part, 'w', zipfile.ZIP_DEFLATED, allowZip64=True, compresslevel=6) as z:
        for s in sources:
            for q, is_dir in (walk_files(s) if os.path.isdir(s) else [(s, False)]):
                arc = os.path.relpath(q, src).replace(os.sep, '/')
                if is_dir:
                    z.writestr(arc + '/', b'')
                    expected[arc + '/'] = 0
                else:
                    z.write(q, arc)
                    expected[arc] = os.lstat(q).st_size
    with zipfile.ZipFile(part) as z:
        got = {i.filename: i.file_size for i in z.infolist()}
        bad = z.testzip()
    ok = got == expected and bad is None
    if ok:
        os.replace(part, final)
    return {'name': name, 'sources': sources, 'zip': final if ok else part, 'files': len(expected),
            'src_bytes': sum(expected.values()), 'zip_bytes': os.path.getsize(final if ok else part),
            'ok': ok, 'bad_entry': bad, 'name_size_match': got == expected, 'seconds': round(time.time() - t0)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('report')
    ap.add_argument('--workers', type=int, default=4)
    ap.add_argument('--min-age-hours', type=float, default=48)
    ap.add_argument('--split-gb', type=float, default=8)
    ap.add_argument('--only', action='append', help='archive just these subfolders (repeatable)')
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding='utf-8')  # the console code page here is cp1252; folder names are Chinese
    os.makedirs(a.out, exist_ok=True)
    jobs, skipped = [], []
    for d in sorted(os.listdir(a.src)):
        p = os.path.join(a.src, d)
        if not os.path.isdir(p) or is_link(p) or (a.only and d not in a.only):
            continue
        size, newest = tree_stats(p)
        if time.time() - newest < a.min_age_hours * 3600:
            skipped.append({'dir': p, 'reason': 'changed recently'})
            continue
        if size > a.split_gb * 2**30:
            loose = [os.path.join(p, c) for c in sorted(os.listdir(p)) if not os.path.isdir(os.path.join(p, c))]
            for c in sorted(os.listdir(p)):
                if os.path.isdir(os.path.join(p, c)):
                    jobs.append((d + '__' + c, a.src, [os.path.join(p, c)], a.out))
            if loose:
                jobs.append((d + '__files', a.src, loose, a.out))
        else:
            jobs.append((d, a.src, [p], a.out))
    jobs.sort(key=lambda j: -sum(tree_stats(s)[0] for s in j[2]))
    results = []
    with ProcessPoolExecutor(a.workers) as ex:
        for r in ex.map(build, jobs):
            results.append(r)
            print(('OK  ' if r['ok'] else 'BAD ') + f"{r['name']}: {r['files']} files {r['src_bytes'] / 2**30:.2f} GB -> {r['zip_bytes'] / 2**30:.2f} GB in {r['seconds']} s", flush=True)
    with open(a.report, 'w', encoding='utf-8') as f:
        json.dump({'src': a.src, 'out': a.out, 'skipped': skipped, 'results': results}, f, ensure_ascii=False, indent=1)
    ok = all(r['ok'] for r in results)
    print('all verified' if ok else 'SOME ZIPS FAILED', 'skipped', len(skipped))
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
