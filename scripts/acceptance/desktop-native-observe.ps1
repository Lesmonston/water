# ASCII-only bounded observer; observes and closes only the fixed own window.
param([Parameter(Mandatory=$true)][int]$TestProcessId,[Parameter(Mandatory=$true)][string]$EvidencePath)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$controller = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
. (Join-Path $PSScriptRoot 'desktop-native-text-policy.ps1')
$tree = (Resolve-Path -LiteralPath '.').Path
if ($tree -ine (Join-Path $controller '.worktrees/ac')) { throw 'Unexpected assigned tree' }
$evidenceRoot = [IO.Path]::GetFullPath((Join-Path $tree '.local/checks/WATER-W1-AC-ADDENDUM-04/'))
$fullEvidence = [IO.Path]::GetFullPath($EvidencePath)
if (!$fullEvidence.StartsWith($evidenceRoot,[StringComparison]::OrdinalIgnoreCase) -or [IO.File]::Exists($fullEvidence)) { throw 'Unexpected evidence output' }
$process = Get-Process -Id $TestProcessId
$ownedHandle = $process.Handle
if ($process.Path -ine (Join-Path $tree '.local/desktop-target/debug/water-desktop-preview.exe')) { throw 'Unexpected desktop executable' }
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$deadline = [DateTime]::UtcNow.AddSeconds(15)
$window = $null; $names = @(); $children = @(); $failure = $null; $windowCount = 0; $closed = $false; $exitCode = $null
$record = [ordered]@{ startedAt=[DateTime]::UtcNow.ToString('o'); processId=$TestProcessId; title=$null; systemWindows=$null; directoryDialogs=0; names=@(); required=@(Get-WaterDesktopRequiredText); pageAccepted=$false; screenshotsTaken=0; children=@(); closeRequested=$false; exitCode=$null; error=$null }
function Save-WaterNativeRecord {
    $record['names'] = $names; $record['children'] = $children; $record['updatedAt'] = [DateTime]::UtcNow.ToString('o')
    [IO.File]::WriteAllText($fullEvidence,($record | ConvertTo-Json -Depth 8),(New-Object Text.UTF8Encoding($false)))
}
try {
    while ([DateTime]::UtcNow -lt $deadline) {
        $condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ProcessIdProperty,$TestProcessId)
        $windows = [System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children,$condition)
        $windowCount = $windows.Count
        if ($windowCount -gt 1) { throw 'Unexpected own top-level window count' }
        foreach ($candidate in $windows) { if ($candidate.Current.Name -eq 'Water Desktop Preview') { $window = $candidate } }
        if ($null -ne $window) { break }; Start-Sleep -Milliseconds 100
    }
    $record['systemWindows'] = $windowCount
    if ($null -eq $window) { throw 'Desktop window title not observed' }
    $record['title'] = $window.Current.Name
    while ([DateTime]::UtcNow -lt $deadline) {
        $names = @(); $elements = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition)
        if ($elements.Count -gt 1500) { throw 'Unexpected own automation tree size' }
        foreach ($element in $elements) { if ($element.Current.Name) { $names += $element.Current.Name } }
        if (($names -join "`n").Length -gt 65536) { throw 'Unexpected own automation text size' }
        $record['pageAccepted'] = Test-WaterDesktopPageText -Names $names
        Save-WaterNativeRecord
        if ($record['pageAccepted']) { break }; Start-Sleep -Milliseconds 100
    }
    # Descendants are selected by verified parent PID chains, never unrelated windows.
    $ids = @($TestProcessId)
    for ($depth=0; $depth -lt 6; $depth++) {
        $next = @()
        foreach ($owner in $ids) {
            foreach ($child in @(Get-CimInstance Win32_Process -Filter ('ParentProcessId=' + $owner))) {
                if ($child.Name -notin @('msedgewebview2.exe','conhost.exe')) { throw 'Unexpected desktop child process' }
                if (@($children | Where-Object { $_.processId -eq $child.ProcessId }).Count -eq 0) {
                    $children += [ordered]@{ processId=$child.ProcessId; parentProcessId=$child.ParentProcessId; name=$child.Name; path=$child.ExecutablePath; commandLine=$child.CommandLine; created=$child.CreationDate.ToUniversalTime().ToString('o') }
                    $next += $child.ProcessId
                }
            }
        }
        if ($children.Count -gt 32) { throw 'Unexpected desktop child process count' }
        if ($next.Count -eq 0) { break }; $ids = $next
    }
    Save-WaterNativeRecord
    if (!$record['pageAccepted']) { throw 'Required embedded read-only page text not observed' }
} catch { $failure = $_.Exception.Message; $record['error'] = $failure }
finally {
    Save-WaterNativeRecord
    if ($null -ne $window) {
        try { $record['closeRequested'] = $true; Save-WaterNativeRecord; $pattern = $window.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern); $pattern.Close(); $closed = $true } catch { if (!$failure) { $failure = 'Own window close failed'; $record['error'] = $failure } }
    }
    if ($closed -and $process.WaitForExit(8000)) { $exitCode = $process.ExitCode; $record['exitCode'] = $exitCode } else { if (!$failure) { $failure = 'Desktop normal exit not observed'; $record['error'] = $failure } }
    if ($null -ne $exitCode -and $exitCode -ne 0 -and !$failure) { $failure = 'Desktop exited unsuccessfully'; $record['error'] = $failure }
    $record['endedAt'] = [DateTime]::UtcNow.ToString('o'); Save-WaterNativeRecord
}
$record | ConvertTo-Json -Depth 8 -Compress
if ($failure) { exit 1 }
