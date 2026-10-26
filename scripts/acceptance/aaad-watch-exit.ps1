param([Parameter(Mandatory=$true)][int]$NativeProcessId)
$ErrorActionPreference = 'Stop'
$waterRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$waterExpected = (Get-Item -LiteralPath (Join-Path $waterRoot '.worktrees/integration-aaad-20261026/.local/next-target/debug/water-project-session.exe')).FullName
$waterNative = Get-Process -Id $NativeProcessId
if ($waterNative.Path -ine $waterExpected) { throw 'Unexpected native process path' }
$waterHandle = $waterNative.Handle
Write-Output ('WATER_AAAD_WATCH_READY ' + $NativeProcessId)
if (!$waterNative.WaitForExit(150000)) { throw 'Native exit timeout' }
Write-Output ('WATER_AAAD_EXIT ' + $NativeProcessId + ' code=' + $waterNative.ExitCode)
if ($waterNative.ExitCode -ne 0) { throw 'Native process failed' }
