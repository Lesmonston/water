# Release prep (11-08): the installer and the portable zip carry LICENSE-MIT, LICENSE-APACHE and THIRD-PARTY-LICENSES.md
# (cargo-about output); build.ps1 takes an optional -Label (e.g. beta) that only goes into the file names.
import sys

BUILD = 'packaging/windows/build.ps1'
NSI = 'packaging/windows/flick.nsi'
OLD_SCRIPT = 'scripts/release/third-party-licenses.mjs'
EDITS = {
    BUILD: [
        ('#   Flick-Setup-<version>.exe            per-user installer (packaging/windows/flick.nsi)\n'
         '#   flick-<version>-windows-x64.zip      portable: flick.exe only\n',
         '#   Flick-Setup-<version>[-<label>].exe          per-user installer (packaging/windows/flick.nsi)\n'
         '#   flick-<version>[-<label>]-windows-x64.zip    portable: flick.exe and the three licence files\n', 1),
        ('#   powershell -NoProfile -File packaging/windows/build.ps1 -Exe <flick.exe> -Version 0.1.0 -OutDir <empty or new folder> [-Nsis <makensis.exe>] [-Test]\n',
         '#   powershell -NoProfile -File packaging/windows/build.ps1 -Exe <flick.exe> -Version 0.1.0 -OutDir <empty or new folder> [-Label beta] [-Nsis <makensis.exe>] [-Test]\n'
         '# -Label goes into the file names only; the version resources stay numeric (Windows file versions are x.y.z.w).\n'
         '# Both packages carry LICENSE-MIT, LICENSE-APACHE and THIRD-PARTY-LICENSES.md, taken from the repository root (the\n'
         '# public tree) or packaging/public/root (the working repository).\n', 1),
        ('    [Parameter(Mandatory = $true)][string]$OutDir,\n',
         '    [Parameter(Mandatory = $true)][string]$OutDir,\n    [string]$Label,\n', 1),
        ("if ($Version -notmatch '^\\d+\\.\\d+\\.\\d+$') { throw \"Version must look like 0.1.0\" }\n",
         "if ($Version -notmatch '^\\d+\\.\\d+\\.\\d+$') { throw \"Version must look like 0.1.0\" }\n"
         "if ($Label -and $Label -notmatch '^[a-z][a-z0-9.]*$') { throw \"Label must look like beta or rc.1\" }\n"
         "$suffix = if ($Label) { \"-$Label\" } else { '' }\n", 1),
        ("foreach ($p in @($exePath, $icon, $script)) { if (-not (Test-Path -LiteralPath $p -PathType Leaf)) { throw \"Missing $p\" } }\n",
         "$licenceDir = if (Test-Path -LiteralPath (Join-Path $repo 'LICENSE-MIT') -PathType Leaf) { $repo } else { Join-Path $repo 'packaging\\public\\root' }\n"
         "$licences = @('LICENSE-MIT', 'LICENSE-APACHE', 'THIRD-PARTY-LICENSES.md') | ForEach-Object { Join-Path $licenceDir $_ }\n"
         "foreach ($p in @($exePath, $icon, $script) + $licences) { if (-not (Test-Path -LiteralPath $p -PathType Leaf)) { throw \"Missing $p\" } }\n", 1),
        ('$setupName = if ($Test) { "Flick-Setup-$Version-test.exe" } else { "Flick-Setup-$Version.exe" }\n',
         '$setupName = if ($Test) { "Flick-Setup-$Version$suffix-test.exe" } else { "Flick-Setup-$Version$suffix.exe" }\n', 1),
        ('$zip = Join-Path $out "flick-$Version-windows-x64.zip"\n', '$zip = Join-Path $out "flick-$Version$suffix-windows-x64.zip"\n', 1),
        ('$defines = @("/DVERSION=$Version", "/DEXE=$exePath", "/DICON=$icon", "/DOUTFILE=$setup")\n',
         '$defines = @("/DVERSION=$Version", "/DEXE=$exePath", "/DICON=$icon", "/DOUTFILE=$setup", "/DLICENCEDIR=$licenceDir")\n', 1),
        ('Compress-Archive -LiteralPath $exePath -DestinationPath $zip\n',
         'Compress-Archive -LiteralPath (@($exePath) + $licences) -DestinationPath $zip\n', 1),
    ],
    NSI: [
        (';   /DVERSION=<x.y.z>  /DEXE=<path to flick.exe>  /DICON=<path to .ico>  /DOUTFILE=<installer path>\n',
         ';   /DVERSION=<x.y.z>  /DEXE=<path to flick.exe>  /DICON=<path to .ico>  /DOUTFILE=<installer path>\n'
         ';   /DLICENCEDIR=<folder with LICENSE-MIT, LICENSE-APACHE and THIRD-PARTY-LICENSES.md>\n', 1),
        ('!ifndef ICON\n  !error "ICON is required: the path of flick-app-icon.ico"\n!endif\n',
         '!ifndef ICON\n  !error "ICON is required: the path of flick-app-icon.ico"\n!endif\n'
         '!ifndef LICENCEDIR\n  !error "LICENCEDIR is required: the folder with the licence files"\n!endif\n', 1),
        ('  File "/oname=flick.exe" "${EXE}"\n',
         '  File "/oname=flick.exe" "${EXE}"\n'
         '  File "${LICENCEDIR}\\LICENSE-MIT"\n'
         '  File "${LICENCEDIR}\\LICENSE-APACHE"\n'
         '  File "${LICENCEDIR}\\THIRD-PARTY-LICENSES.md"\n', 1),
        ('  removed:\n  Delete "$INSTDIR\\Uninstall.exe"\n',
         '  removed:\n'
         '  Delete "$INSTDIR\\LICENSE-MIT"\n'
         '  Delete "$INSTDIR\\LICENSE-APACHE"\n'
         '  Delete "$INSTDIR\\THIRD-PARTY-LICENSES.md"\n'
         '  Delete "$INSTDIR\\Uninstall.exe"\n', 1),
    ],
    OLD_SCRIPT: [
        ('// Writes the third-party licence list for flick.exe from `cargo metadata` (offline; nothing is downloaded).\n',
         '// Superseded 11-08 by cargo-about (packaging/windows/about.toml), which resolves features the way the build does:\n'
         '// this walk over `cargo metadata` also counts crates that only dev-dependency features pull in (238 here against\n'
         '// the 217 the release build compiles). Kept for the quick list only.\n'
         '// Writes the third-party licence list for flick.exe from `cargo metadata` (offline; nothing is downloaded).\n', 1),
    ],
}
out = {}
for path, edits in EDITS.items():
    raw = open(path, 'rb').read()
    crlf = b'\r\n' in raw
    text = raw.decode('utf-8').replace('\r\n', '\n')
    for old, new, n in edits:
        if text.count(old) != n:
            sys.exit(f'{path}: expected {n} of {old[:70]!r}, found {text.count(old)}')
        text = text.replace(old, new)
    out[path] = text.replace('\n', '\r\n') if crlf else text
for path, text in out.items():
    open(path, 'wb').write(text.encode('utf-8'))
    print('edited', path)
