# ASCII-only. Raw owned roots survive both classification and page failures.
param([Parameter(Mandatory=$true)][int]$TestProcessId,[Parameter(Mandatory=$true)][string]$EvidencePath)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$controllerRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
. (Join-Path $PSScriptRoot 'desktop-native-text-policy.ps1')
. (Join-Path $PSScriptRoot 'desktop-native-window-policy.ps1')
$tree = (Resolve-Path -LiteralPath '.').Path
if ($tree -ine (Join-Path $controllerRoot '.worktrees/ac')) { throw 'Unexpected assigned tree' }
$evidenceRoot = [IO.Path]::GetFullPath((Join-Path $tree '.local/checks/WATER-W1-AC-ADDENDUM-06/'))
$fullEvidence = [IO.Path]::GetFullPath($EvidencePath)
if (!$fullEvidence.StartsWith($evidenceRoot,[StringComparison]::OrdinalIgnoreCase) -or [IO.File]::Exists($fullEvidence)) { throw 'Unexpected evidence output' }
# Wrapper verifies exact tar membership before launch. Recheck pinned physical bytes here.
$framework = [IO.File]::ReadAllText((Join-Path $controllerRoot 'contracts/desktop-bootstrap-window-v1/FRAMEWORK.json')) | ConvertFrom-Json
foreach ($file in @(@{path='apps/desktop-preview/Cargo.lock'; sha=$framework.cargoLockSha256},@{path=$framework.archivePath; sha=$framework.archiveSha256},@{path=$framework.sourcePath; sha=$framework.sourceSha256})) {
    if ((Get-FileHash -LiteralPath (Join-Path $tree $file.path) -Algorithm SHA256).Hash -ine $file.sha) { throw 'Pinned framework provenance changed' }
}
$ownedProcess = Get-Process -Id $TestProcessId
$ownedProcessHandle = $ownedProcess.Handle
if ($ownedProcess.Path -ine (Join-Path $tree '.local/desktop-target/debug/water-desktop-preview.exe')) { throw 'Unexpected desktop executable' }
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$deadline = [DateTime]::UtcNow.AddSeconds(14)
$mainWindow = $null; $mainBinding = $null; $failure = $null; $closed = $false
$record = [ordered]@{ startedAt=[DateTime]::UtcNow.ToString('o'); processId=$TestProcessId; processCreated=$ownedProcess.StartTime.ToUniversalTime().ToString('o'); countingContract='water.desktop-bootstrap-window.v1'; frameworkVerified=$true; title=$null; rawRootCount=$null; applicationWindowCount=$null; frameworkEventTargetCount=$null; roots=@(); rootDecision=$null; rootSnapshots=0; rootMetadataTruncated=$false; initialSnapshot=$null; preCloseSnapshot=$null; latestSnapshot=$null; names=@(); required=@(Get-WaterDesktopRequiredText); pageAccepted=$false; directoryDialogs=0; screenshotsTaken=0; children=@(); childSnapshotError=$null; mainSelectedForCleanup=$false; closeRequested=$false; closeReason=$null; cleanupError=$null; exitCode=$null; error=$null }
function Save-WaterWindowRecord {
    $record['updatedAt'] = [DateTime]::UtcNow.ToString('o')
    [IO.File]::WriteAllText($fullEvidence,($record | ConvertTo-Json -Depth 12),(New-Object Text.UTF8Encoding($false)))
}
function Get-WaterOwnedChildren {
    $rows = @(); $owners = @($TestProcessId)
    for ($depth = 0; $depth -lt 6; $depth++) {
        $next = @()
        foreach ($owner in $owners) {
            foreach ($child in @(Get-CimInstance Win32_Process -Filter ('ParentProcessId=' + $owner))) {
                if ($child.CreationDate.ToUniversalTime() -lt $ownedProcess.StartTime.ToUniversalTime()) { throw 'Child creation predates owned process' }
                if (@($rows | Where-Object { $_.processId -eq $child.ProcessId }).Count -eq 0) {
                    $rows += [ordered]@{ processId=$child.ProcessId; parentProcessId=$child.ParentProcessId; name=$child.Name; path=$child.ExecutablePath; commandLine=$child.CommandLine; created=$child.CreationDate.ToUniversalTime().ToString('o') }
                    $record['children'] = $rows; Save-WaterWindowRecord
                    if ($child.Name -notin @('msedgewebview2.exe','conhost.exe')) { throw 'Unexpected desktop child process' }
                    $next += $child.ProcessId
                }
                if ($rows.Count -gt 32) { throw 'Unexpected desktop child process count' }
            }
        }
        if ($next.Count -eq 0) { break }; $owners = $next
    }
    return $rows
}
function Read-WaterWindowSnapshot {
    param([string]$Phase)
    $cache = New-Object System.Windows.Automation.CacheRequest
    $cache.TreeScope = [System.Windows.Automation.TreeScope]::Element
    foreach ($property in @('Name','ClassName','ControlType','NativeWindowHandle','ProcessId','IsOffscreen','IsControlElement','IsContentElement','BoundingRectangle','IsWindowPatternAvailable')) {
        $cache.Add([System.Windows.Automation.AutomationElement]::($property + 'Property'))
    }
    $activeCache = $cache.Activate()
    try {
        $condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ProcessIdProperty,$TestProcessId)
        $script:currentRootElements = [System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children,$condition)
    } finally { $activeCache.Dispose() }
    $snapshot = [ordered]@{ phase=$Phase; at=[DateTime]::UtcNow.ToString('o'); rawRootCount=$script:currentRootElements.Count; metadataTruncated=($script:currentRootElements.Count -gt 32); roots=@(); decision=$null }
    $record['rootSnapshots'] = $record['rootSnapshots'] + 1
    $record['latestSnapshot'] = $snapshot; Save-WaterWindowRecord
    $rootRows = @()
    for ($index = 0; $index -lt [Math]::Min(32,$script:currentRootElements.Count); $index++) {
        $row = [ordered]@{ index=$index; processId=$null; name=$null; className=$null; controlType=$null; nativeHandle=$null; isOffscreen=$null; isControlElement=$null; isContentElement=$null; windowPatternAvailable=$null; rectangle=$null; runtimeId=@(); readError=$null }
        try {
            $candidate = $script:currentRootElements.Item($index); $info = $candidate.Cached
            $row['processId'] = $info.ProcessId; $row['name'] = $info.Name; $row['className'] = $info.ClassName
            $row['controlType'] = $info.ControlType.ProgrammaticName; $row['nativeHandle'] = $info.NativeWindowHandle
            $row['isOffscreen'] = $info.IsOffscreen; $row['isControlElement'] = $info.IsControlElement; $row['isContentElement'] = $info.IsContentElement
            $row['windowPatternAvailable'] = $candidate.GetCachedPropertyValue([System.Windows.Automation.AutomationElement]::IsWindowPatternAvailableProperty)
            if (!$info.BoundingRectangle.IsEmpty) { $row['rectangle'] = @($info.BoundingRectangle.X,$info.BoundingRectangle.Y,$info.BoundingRectangle.Width,$info.BoundingRectangle.Height) }
            $row['runtimeId'] = @($candidate.GetRuntimeId())
            if ($row['name'].Length -gt 1024 -or $row['className'].Length -gt 256 -or $row['runtimeId'].Count -gt 32) { throw 'Own root property exceeds bounds' }
        } catch { $row['readError'] = 'Own root property snapshot unavailable' }
        $rootRows += $row; $snapshot['roots'] = $rootRows; Save-WaterWindowRecord
    }
    # All raw rows are saved before the shared acceptance decision.
    $decision = Resolve-WaterDesktopWindowSnapshot -Roots $rootRows -ReportedCount $snapshot.rawRootCount -ExpectedProcessId $TestProcessId -FrameworkVerified $true
    $snapshot['decision'] = $decision
    $record['rawRootCount'] = $snapshot.rawRootCount; $record['roots'] = $rootRows; $record['rootMetadataTruncated'] = $snapshot.metadataTruncated
    $record['rootDecision'] = $decision; $record['applicationWindowCount'] = $decision.applicationWindowCount; $record['frameworkEventTargetCount'] = $decision.frameworkEventTargetCount
    Save-WaterWindowRecord
    return $snapshot
}
Save-WaterWindowRecord
try {
    while ([DateTime]::UtcNow -lt $deadline) {
        $snapshot = Read-WaterWindowSnapshot -Phase 'initial'
        $record['initialSnapshot'] = $snapshot
        $decision = $snapshot.decision
        if ($null -ne $decision.mainIndex) {
            $mainWindow = $script:currentRootElements.Item([int]$decision.mainIndex); $mainBinding = $snapshot.roots[$decision.mainIndex]
            $record['mainSelectedForCleanup'] = $true; $record['title'] = $mainBinding.name
        }
        Save-WaterWindowRecord
        if ($snapshot.rawRootCount -gt 0) {
            try { $record['children'] = @(Get-WaterOwnedChildren) } catch { $record['childSnapshotError'] = $_.Exception.Message }
            Save-WaterWindowRecord
        }
        if (!$decision.accepted -and $decision.error -ne 'Desktop window title not observed') { throw $decision.error }
        if ($decision.accepted) { break }; Start-Sleep -Milliseconds 100
    }
    if (!$record['rootDecision'].accepted -or $null -eq $mainWindow) { throw 'Desktop window title not observed' }
    if ($record['childSnapshotError']) { throw 'Owned child snapshot failed' }
    while ([DateTime]::UtcNow -lt $deadline) {
        $elements = $mainWindow.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition)
        $record['descendantCount'] = $elements.Count; Save-WaterWindowRecord
        if ($elements.Count -gt 1500) { throw 'Unexpected own automation tree size' }
        $names = @()
        foreach ($element in $elements) { if ($element.Current.Name) { $names += $element.Current.Name } }
        $record['names'] = $names; Save-WaterWindowRecord
        if (($names -join "`n").Length -gt 65536) { throw 'Unexpected own automation text size' }
        $record['pageAccepted'] = Test-WaterDesktopPageText -Names $names
        Save-WaterWindowRecord
        if ($record['pageAccepted']) { break }; Start-Sleep -Milliseconds 100
    }
    if (!$record['pageAccepted']) { throw 'Required embedded read-only page text not observed' }
    $record['children'] = @(Get-WaterOwnedChildren); Save-WaterWindowRecord
    $mainWindow = $null
    $last = Read-WaterWindowSnapshot -Phase 'before-close'
    $record['preCloseSnapshot'] = $last; Save-WaterWindowRecord
    if ($null -ne $last.decision.mainIndex -and (Test-WaterDesktopMainBinding -Before $mainBinding -After $last.roots[$last.decision.mainIndex])) {
        $mainWindow = $script:currentRootElements.Item([int]$last.decision.mainIndex)
    }
    if (!$last.decision.accepted) { throw $last.decision.error }
    if ($null -eq $mainWindow) { throw 'Main identity changed before close' }
} catch { $failure = $_.Exception.Message; $record['error'] = $failure }
finally {
    Save-WaterWindowRecord
    if ($null -ne $mainWindow) {
        try {
            $current = $mainWindow.Current
            if ($current.ProcessId -ne $TestProcessId -or $current.Name -cne 'Water Desktop Preview' -or $current.ClassName -cne 'Tauri Window' -or $current.ControlType.ProgrammaticName -cne 'ControlType.Window' -or $current.NativeWindowHandle -ne $mainBinding.nativeHandle -or (@($mainWindow.GetRuntimeId()) -join ',') -cne ($mainBinding.runtimeId -join ',')) { throw 'Main binding changed before cleanup' }
            $pattern = $mainWindow.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern)
            $record['closeRequested'] = $true
            $record['closeReason'] = $(if ($failure) { 'Known main cleanup after failure' } else { 'Accepted static preview close' })
            Save-WaterWindowRecord
            $pattern.Close(); $closed = $true
        } catch { $record['cleanupError'] = 'Own main close failed' }
    }
    if ($closed -and $ownedProcess.WaitForExit(8000)) { $record['exitCode'] = $ownedProcess.ExitCode }
    else { $record['cleanupError'] = 'Desktop normal exit not observed' }
    if ($null -ne $record['exitCode'] -and $record['exitCode'] -ne 0) { $record['cleanupError'] = 'Desktop exited unsuccessfully' }
    if (!$failure -and $record['cleanupError']) { $failure = $record['cleanupError']; $record['error'] = $failure }
    $record['endedAt'] = [DateTime]::UtcNow.ToString('o'); Save-WaterWindowRecord
}
$record | ConvertTo-Json -Depth 12 -Compress
if ($failure) { exit 1 }
