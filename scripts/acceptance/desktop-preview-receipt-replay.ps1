# Replay saved native06 data through frozen pure policies; never enumerate UIA.
param([Parameter(Mandatory=$true)][string]$ControllerRoot,[Parameter(Mandatory=$true)][string]$IntegrationRoot)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
. (Join-Path $ControllerRoot 'scripts/acceptance/desktop-native-window-policy.ps1')
. (Join-Path $ControllerRoot 'scripts/acceptance/desktop-native-root-policy.ps1')
. (Join-Path $ControllerRoot 'scripts/acceptance/desktop-native-text-policy.ps1')
$path = Join-Path $IntegrationRoot 'docs/acceptance/wave1/ac/addendum-06/raw/2026-10-25T06-21-48.141Z-42780-uia.txt'
$record = [IO.File]::ReadAllText($path,[Text.Encoding]::UTF8) | ConvertFrom-Json
$decisions = @()
foreach ($snapshot in @($record.initialSnapshot,$record.preCloseSnapshot)) {
    $actual = Resolve-WaterDesktopWindowSnapshot -Roots $snapshot.roots -ReportedCount $snapshot.rawRootCount -ExpectedProcessId $record.processId -FrameworkVerified $true
    $old = Resolve-WaterDesktopRootSnapshot -Roots $snapshot.roots -ReportedCount $snapshot.rawRootCount -ExpectedProcessId $record.processId
    if (!$actual.accepted -or $old.accepted -or $actual.rawRootCount -ne 2 -or $actual.applicationWindowCount -ne 1 -or $actual.frameworkEventTargetCount -ne 1) { throw 'Recorded snapshot replay mismatch' }
    $decisions += $actual
}
$first = $record.initialSnapshot.roots[$decisions[0].mainIndex]
$last = $record.preCloseSnapshot.roots[$decisions[1].mainIndex]
if (!(Test-WaterDesktopMainBinding -Before $first -After $last)) { throw 'Recorded main identity mismatch' }
if (!(Test-WaterDesktopPageText -Names $record.names)) { throw 'Actual recorded text rejected' }
$mutations = @()
foreach ($kind in @('unknown-root','second-main','second-helper','unreadable-root','wrong-process')) {
    $rows = @($record.initialSnapshot.roots | ConvertTo-Json -Depth 8 | ConvertFrom-Json)
    if ($kind -eq 'unknown-root') { $rows[1].className = 'Unknown' }
    elseif ($kind -eq 'unreadable-root') { $rows[1].readError = 'unavailable' }
    elseif ($kind -eq 'wrong-process') { $rows[1].processId = 12345 }
    else {
        $index = $(if ($kind -eq 'second-main') { 0 } else { 1 })
        $extra = $record.initialSnapshot.roots[$index] | ConvertTo-Json -Depth 8 | ConvertFrom-Json
        $extra.nativeHandle = 123456; $extra.runtimeId = @(42,123456); $rows += $extra
    }
    $decision = Resolve-WaterDesktopWindowSnapshot -Roots $rows -ReportedCount $rows.Count -ExpectedProcessId $record.processId -FrameworkVerified $true
    if ($decision.accepted) { throw ('Unsafe recorded-data mutation accepted: ' + $kind) }
    $mutations += [ordered]@{ name=$kind; accepted=$decision.accepted; error=$decision.error }
}
$omissions = @()
foreach ($required in @(Get-WaterDesktopRequiredText)) {
    $names = @($record.names | Where-Object { !$_.Contains($required) })
    if (Test-WaterDesktopPageText -Names $names) { throw 'Required text omission accepted' }
    $omissions += [ordered]@{ missing=$required; accepted=$false }
}
$tokens = $null; $errors = $null
$null = [System.Management.Automation.Language.Parser]::ParseFile($PSCommandPath,[ref]$tokens,[ref]$errors)
if (@($errors).Count -gt 0) { throw 'Replay script parse failure' }
[ordered]@{ status='passed'; kind='recorded-native06-data-replay'; decisions=$decisions; sameMainIdentity=$true; recordedFourTextsAccepted=$true; rejectedMutations=$mutations; missingTextNegatives=$omissions; oldStrictPolicyStillRefuses=$true; systemWindows=0; UIAEnumeration=$false; newNativeRun=$false; parserErrors=0 } | ConvertTo-Json -Depth 10 -Compress
