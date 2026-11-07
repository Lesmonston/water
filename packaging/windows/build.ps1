# Builds the Flick release files for Windows from an already built flick.exe:
#   Flick-Setup-<version>.exe            per-user installer (packaging/windows/flick.nsi)
#   flick-<version>-windows-x64.zip      portable: flick.exe only
#   SHA256SUMS.txt                       checksums of the two files above
# Usage (repo root):
#   powershell -NoProfile -File packaging/windows/build.ps1 -Exe <flick.exe> -Version 0.1.0 -OutDir <empty or new folder> [-Nsis <makensis.exe>] [-Test]
# -Test builds only a test installer (Flick-Setup-<version>-test.exe) that installs files without a Start menu
# shortcut or an uninstall entry, for trying it in a scratch folder.
# makensis is looked up in -Nsis, $env:NSIS_HOME, PATH, %LOCALAPPDATA%\tauri\NSIS and Program Files (x86)\NSIS.
param(
    [Parameter(Mandatory = $true)][string]$Exe,
    [Parameter(Mandatory = $true)][string]$Version,
    [Parameter(Mandatory = $true)][string]$OutDir,
    [string]$Nsis,
    [switch]$Test
)
$ErrorActionPreference = 'Stop'
if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw "Version must look like 0.1.0" }
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$exePath = (Resolve-Path -LiteralPath $Exe).Path
$icon = Join-Path $repo 'docs\design\flick-brand\flick-app-icon.ico'
$script = Join-Path $PSScriptRoot 'flick.nsi'
foreach ($p in @($exePath, $icon, $script)) { if (-not (Test-Path -LiteralPath $p -PathType Leaf)) { throw "Missing $p" } }
if ((Split-Path -Leaf $exePath) -ne 'flick.exe') { throw "The executable must be named flick.exe (it goes into the zip as is)" }

$candidates = @($Nsis)
if ($env:NSIS_HOME) { $candidates += (Join-Path $env:NSIS_HOME 'makensis.exe') }
$onPath = Get-Command makensis.exe -ErrorAction SilentlyContinue
if ($onPath) { $candidates += $onPath.Source }
$candidates += (Join-Path $env:LOCALAPPDATA 'tauri\NSIS\makensis.exe')
if (${env:ProgramFiles(x86)}) { $candidates += (Join-Path ${env:ProgramFiles(x86)} 'NSIS\makensis.exe') }
$makensis = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
if (-not $makensis) { throw "makensis.exe not found; install NSIS 3 or pass -Nsis" }

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$out = (Resolve-Path -LiteralPath $OutDir).Path
$setupName = if ($Test) { "Flick-Setup-$Version-test.exe" } else { "Flick-Setup-$Version.exe" }
$setup = Join-Path $out $setupName
$zip = Join-Path $out "flick-$Version-windows-x64.zip"
$sums = Join-Path $out 'SHA256SUMS.txt'
$targets = if ($Test) { @($setup) } else { @($setup, $zip, $sums) }
foreach ($p in $targets) { if (Test-Path -LiteralPath $p) { throw "Refusing to overwrite $p" } }

$defines = @("/DVERSION=$Version", "/DEXE=$exePath", "/DICON=$icon", "/DOUTFILE=$setup")
if ($Test) { $defines += '/DFLICK_TEST' }
& $makensis /V2 /INPUTCHARSET UTF8 @defines $script
if ($LASTEXITCODE -ne 0) { throw "makensis failed with exit code $LASTEXITCODE" }
if ($Test) { Write-Output "test installer $setup"; return }

Compress-Archive -LiteralPath $exePath -DestinationPath $zip

$lines = foreach ($p in @($setup, $zip)) { '{0}  {1}' -f (Get-FileHash -Algorithm SHA256 -LiteralPath $p).Hash.ToLowerInvariant(), (Split-Path -Leaf $p) }
# LF line ends, so `sha256sum -c SHA256SUMS.txt` works as is (CRLF leaves a carriage return in each file name).
[IO.File]::WriteAllText($sums, (([string[]]$lines -join "`n") + "`n"), (New-Object Text.UTF8Encoding($false)))
foreach ($p in $targets) { Write-Output ('{0}  {1} bytes' -f $p, (Get-Item -LiteralPath $p).Length) }
