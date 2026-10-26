param([Parameter(Mandatory=$true)][int]$OwnerProcessId,[Parameter(Mandatory=$true)][ValidateSet('cancel','select')][string]$Action)
$ErrorActionPreference = 'Stop'
$waterRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$waterExpected = (Get-Item -LiteralPath (Join-Path $waterRoot '.worktrees/integration-aaad-20261026/.local/next-target/debug/water-project-session.exe')).FullName
$waterNative = @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$OwnerProcessId AND Name='water-project-session.exe'")
if ($waterNative.Count -ne 1 -or $waterNative[0].ExecutablePath -ine $waterExpected) { throw 'Owned fixed AA host not found' }
Write-Output ('WATER_AAAD_CHILD ' + $waterNative[0].ProcessId + ' parent=' + $OwnerProcessId)
& (Join-Path $waterRoot 'scripts/native-session-ui-action.ps1') -TestProcessId $waterNative[0].ProcessId -Action $Action
