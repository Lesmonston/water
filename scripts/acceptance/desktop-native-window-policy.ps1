# Pure classification of a complete owned snapshot for the pinned Windows framework.
function Test-WaterDesktopRootMetadata {
    param([object]$Row)
    if ($null -eq $Row) { return $false }
    $fields = @('processId','name','className','controlType','nativeHandle','isOffscreen','isControlElement','isContentElement','windowPatternAvailable','rectangle','runtimeId','readError')
    $keys = $(if ($Row -is [Collections.IDictionary]) { @($Row.Keys) } else { @($Row.PSObject.Properties.Name) })
    foreach ($field in $fields) { if ($field -cnotin $keys) { return $false } }
    if ($null -ne $Row.readError -or $Row.processId -isnot [int] -or $Row.processId -le 0) { return $false }
    if ($Row.name -isnot [string] -or $Row.name.Length -gt 1024 -or $Row.className -isnot [string] -or $Row.className.Length -gt 256 -or $Row.controlType -isnot [string]) { return $false }
    if (($Row.nativeHandle -isnot [int] -and $Row.nativeHandle -isnot [long]) -or $Row.nativeHandle -eq 0) { return $false }
    foreach ($field in @('isOffscreen','isControlElement','isContentElement','windowPatternAvailable')) { if ($Row.$field -isnot [bool]) { return $false } }
    if (@($Row.rectangle).Count -ne 4 -or @($Row.runtimeId).Count -lt 2 -or @($Row.runtimeId).Count -gt 32) { return $false }
    foreach ($number in $Row.rectangle) {
        if (($number -isnot [int] -and $number -isnot [long] -and $number -isnot [double]) -or [double]::IsNaN($number) -or [double]::IsInfinity($number) -or [Math]::Abs($number) -gt 10000000) { return $false }
    }
    if ($Row.rectangle[2] -lt 0 -or $Row.rectangle[3] -lt 0) { return $false }
    foreach ($number in $Row.runtimeId) { if ($number -isnot [int] -and $number -isnot [long]) { return $false } }
    return $true
}

function Resolve-WaterDesktopWindowSnapshot {
    param([object[]]$Roots,[int]$ReportedCount,[int]$ExpectedProcessId,[bool]$FrameworkVerified=$false)
    $mainIndexes = @(); $helperIndexes = @(); $unknownIndexes = @(); $invalidIndexes = @()
    $handles = @(); $runtimeIds = @(); $duplicate = $false
    for ($index = 0; $index -lt $Roots.Count; $index++) {
        $row = $Roots[$index]
        if (!(Test-WaterDesktopRootMetadata -Row $row) -or $row.processId -ne $ExpectedProcessId) { $invalidIndexes += $index; continue }
        $id = $row.runtimeId -join ','
        if ($row.nativeHandle -in $handles -or $id -in $runtimeIds) { $duplicate = $true }
        $handles += $row.nativeHandle; $runtimeIds += $id
        if ($row.name -ceq 'Water Desktop Preview' -and $row.className -ceq 'Tauri Window' -and
            $row.controlType -ceq 'ControlType.Window' -and $row.windowPatternAvailable -and
            !$row.isOffscreen -and $row.isControlElement -and $row.isContentElement -and
            $row.rectangle[2] -gt 0 -and $row.rectangle[3] -gt 0) {
            $mainIndexes += $index
        } elseif ($row.name -ceq '' -and $row.className -ceq 'Tao Thread Event Target' -and
            $row.controlType -ceq 'ControlType.Pane' -and !$row.windowPatternAvailable -and
            !$row.isOffscreen -and $row.isControlElement -and $row.isContentElement -and
            $row.rectangle[0] -eq 0 -and $row.rectangle[1] -eq 0 -and
            $row.rectangle[2] -ge 0 -and $row.rectangle[2] -le 64 -and
            $row.rectangle[3] -ge 0 -and $row.rectangle[3] -le 64 -and
            @($row.runtimeId).Count -eq 2 -and $row.runtimeId[0] -eq 42 -and
            $row.runtimeId[1] -eq $row.nativeHandle) {
            $helperIndexes += $index
        } else { $unknownIndexes += $index }
    }
    $complete = $ReportedCount -ge 0 -and $ReportedCount -le 32 -and $Roots.Count -eq $ReportedCount
    $mainIndex = $null
    if ($FrameworkVerified -and $complete -and !$duplicate -and $invalidIndexes.Count -eq 0 -and $mainIndexes.Count -eq 1) { $mainIndex = $mainIndexes[0] }
    $reason = $null
    if (!$FrameworkVerified) { $reason = 'Pinned framework provenance not verified' }
    elseif (!$complete) { $reason = 'Own root snapshot exceeds bounds or is incomplete' }
    elseif ($invalidIndexes.Count -gt 0) { $reason = 'Own root metadata or process binding unavailable' }
    elseif ($duplicate) { $reason = 'Duplicate owned root identity' }
    elseif ($unknownIndexes.Count -gt 0) { $reason = 'Unclassified own top-level root' }
    elseif ($helperIndexes.Count -gt 1) { $reason = 'Unexpected framework event target count' }
    elseif ($mainIndexes.Count -eq 0) { $reason = 'Desktop window title not observed' }
    elseif ($mainIndexes.Count -ne 1) { $reason = 'Ambiguous own main window' }
    [ordered]@{ rawRootCount=$ReportedCount; capturedCount=$Roots.Count; applicationWindowCount=$mainIndexes.Count; frameworkEventTargetCount=$helperIndexes.Count; unclassifiedRootCount=$unknownIndexes.Count; invalidRootCount=$invalidIndexes.Count; mainIndex=$mainIndex; frameworkVerified=$FrameworkVerified; accepted=($null -eq $reason); error=$reason }
}

function Test-WaterDesktopMainBinding {
    param([object]$Before,[object]$After)
    return ($null -ne $Before -and $null -ne $After -and $Before.processId -eq $After.processId -and $Before.nativeHandle -eq $After.nativeHandle -and ($Before.runtimeId -join ',') -ceq ($After.runtimeId -join ','))
}
