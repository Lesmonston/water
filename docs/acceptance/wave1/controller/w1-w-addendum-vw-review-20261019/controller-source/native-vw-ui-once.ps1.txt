param([Parameter(Mandatory=$true)][int]$OwnerProcessId,[Parameter(Mandatory=$true)][ValidateSet('cancel','select')][string]$Action)
$ErrorActionPreference = 'Stop'
$controllerRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$expectedBinary = (Get-Item -LiteralPath (Join-Path $controllerRoot '.worktrees/integration-vw-20261019/.local/next-target/debug/water-native-session.exe')).FullName
$deadline = [DateTime]::UtcNow.AddSeconds(8)
$ownedNative = $null
while ([DateTime]::UtcNow -lt $deadline) {
    $candidates = @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$OwnerProcessId AND Name='water-native-session.exe'")
    if ($candidates.Count -gt 1) { throw 'Multiple native producers for one controller case' }
    if ($candidates.Count -eq 1) {
        if ($candidates[0].ExecutablePath -ine $expectedBinary) { throw 'Native producer path mismatch' }
        $ownedNative = $candidates[0]
        break
    }
    Start-Sleep -Milliseconds 50
}
if ($null -eq $ownedNative) { throw 'Owned native producer not found' }
Write-Output ('WATER_JOINT_CHILD ' + $ownedNative.ProcessId + ' parent=' + $OwnerProcessId)
& (Join-Path $controllerRoot 'scripts/native-session-ui-action.ps1') -TestProcessId $ownedNative.ProcessId -Action $Action
