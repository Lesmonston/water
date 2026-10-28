# Clean the leftovers that Water's own checkers and controller runs leave under .local (ASCII-only, PowerShell 5.1).
# Preview by default; -Go deletes. Follows the vault skill agent-era-disk-junk-cleanup section 4: preview first,
# age threshold, never through a junction, the user runs the delete. Every run writes a record:
#   <LogDir>\run-<UTC stamp>-<preview|go>\items.csv     one row per candidate directory
#   <LogDir>\run-<UTC stamp>-<preview|go>\summary.json  options chosen, per-category totals, free space before/after
# Only these places are looked at (one level deep, plus the nested controller folders named below):
#   <Repo>\.worktrees\<tree>\.local\<child>  and  <Repo>\.local\<child>
# Never touched: .offline-cache, .local\release, kits and records (w*-accept*, w*-integ*, selfclean-*), sources, .git.
param(
    [switch]$Go,
    [string[]]$Include = @('build', 'cargo', 'browser', 'tmp', 'fixtures', 'checks'),
    [string]$Repo = 'F:\new\smaltalk\water',
    [string]$LogDir = 'F:\new\smaltalk\water\.local\cleanup-logs',
    [int]$MinAgeHours = 1
)
$ErrorActionPreference = 'Stop'
$categories = [ordered]@{
    build    = 'Rust build directories (*target)'
    cargo    = 'Private cargo homes (*cargo-home*)'
    browser  = 'Test browser profiles (browser-lab)'
    tmp      = 'Checker temporary directories (*tmp)'
    fixtures = 'Test fixtures and smoke data directories'
    checks   = 'Checker receipts (checks; archived in git)'
}
# "powershell -File ... -Include build,cargo" passes one string; accept commas either way.
$Include = @($Include | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ })
foreach ($c in $Include) { if (-not $categories.Contains($c)) { throw "Unknown category '$c'. Use: $($categories.Keys -join ', ')" } }
function Category([string]$name) {
    $n = $name.ToLowerInvariant()
    if ($n -match '(^|-)target$') { return 'build' }
    if ($n -match 'cargo-home') { return 'cargo' }
    if ($n -eq 'browser-lab') { return 'browser' }
    if ($n -match '(^|-)tmp$') { return 'tmp' }
    if ($n -match 'fixtures$' -or $n -in @('fixture-lab', 'fixture-probe', 'w6-i2-close', 'ui-shots') -or $n -match '-native$' -or $n -match '-real$' -or $n -match '^w7-close-' -or $n -match '-second$') { return 'fixtures' }
    if ($n -eq 'checks') { return 'checks' }
    return $null
}
$repoFull = [IO.Path]::GetFullPath($Repo)
$containers = New-Object System.Collections.Generic.List[string]
$wt = Join-Path $repoFull '.worktrees'
foreach ($t in [IO.Directory]::GetDirectories($wt)) { $l = Join-Path $t '.local'; if ([IO.Directory]::Exists($l)) { $containers.Add($l) } }
$main = Join-Path $repoFull '.local'
$containers.Add($main)
foreach ($d in [IO.Directory]::GetDirectories($main)) {
    $n = [IO.Path]::GetFileName($d)
    if ($n -eq 'controller-parallel-next' -or $n -match '^(report-view-|view-input-check-|interactive-wave-preflight-|project-wave-preflight-)') { $containers.Add($d) }
}
$keep = @('release', 'offline-cache', '.offline-cache')
$candidates = New-Object System.Collections.Generic.List[object]
foreach ($c in $containers) {
    foreach ($d in [IO.Directory]::GetDirectories($c)) {
        $n = [IO.Path]::GetFileName($d)
        if ($n -in $keep -or $n -match '^selfclean-' -or $n -eq 'cleanup-logs') { continue }
        $cat = Category $n
        if ($null -ne $cat) { $candidates.Add([pscustomobject]@{ Category = $cat; Path = $d }) }
    }
}
# Size with .NET, never descending into a reparse point; record whether one was met.
function Measure-Dir([string]$path) {
    $bytes = [int64]0; $files = [int64]0; $newest = [DateTime]::MinValue; $reparse = 0; $errors = 0
    $root = New-Object IO.DirectoryInfo('\\?\' + $path)
    if (($root.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { return @{ Bytes = 0; Files = 0; Newest = $root.LastWriteTimeUtc; Reparse = 1; Errors = 0 } }
    $newest = $root.LastWriteTimeUtc
    $stack = New-Object System.Collections.Generic.Stack[IO.DirectoryInfo]; $stack.Push($root)
    while ($stack.Count -gt 0) {
        $dir = $stack.Pop()
        try {
            foreach ($e in $dir.EnumerateFileSystemInfos()) {
                if ($e.LastWriteTimeUtc -gt $newest) { $newest = $e.LastWriteTimeUtc }
                if (($e.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { $reparse++; continue }
                if ($e -is [IO.DirectoryInfo]) { $stack.Push($e) } else { $bytes += $e.Length; $files++ }
            }
        } catch { $errors++ }
    }
    return @{ Bytes = $bytes; Files = $files; Newest = $newest; Reparse = $reparse; Errors = $errors }
}
function Free-Bytes { return (New-Object IO.DriveInfo([IO.Path]::GetPathRoot($repoFull))).AvailableFreeSpace }
$stamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$runDir = Join-Path $LogDir ('run-' + $stamp + '-' + $(if ($Go) { 'go' } else { 'preview' }))
[void][IO.Directory]::CreateDirectory($runDir)
$startedAt = [DateTime]::UtcNow
$freeBefore = Free-Bytes
# Guard: nothing may be building, running Water or driving a test browser while deleting.
$busy = @()
foreach ($p in Get-CimInstance Win32_Process -Filter "Name='cargo.exe' or Name='rustc.exe' or Name='water.exe' or Name='chrome.exe'") {
    if ($p.Name -ne 'chrome.exe') { $busy += $p.Name } elseif ($p.CommandLine -and $p.CommandLine.IndexOf('browser-lab', [StringComparison]::OrdinalIgnoreCase) -ge 0) { $busy += 'chrome.exe (test profile)' }
}
$busy = @($busy | Sort-Object -Unique)
if ($Go -and $busy.Count -gt 0) { Write-Host ('Refusing to delete while running: ' + ($busy -join ', ')); exit 2 }
$cut = [DateTime]::UtcNow.AddHours(-$MinAgeHours)
# Age alone does not prove a directory is unused: skip any item a running process executes from or names.
$procs = Get-CimInstance Win32_Process | Select-Object Name, ExecutablePath, CommandLine
function In-Use([string]$p) { $prefix = $p.TrimEnd('\') + '\'; return @($procs | Where-Object { ($_.ExecutablePath -and $_.ExecutablePath.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) -or ($_.CommandLine -and $_.CommandLine.IndexOf($p, [StringComparison]::OrdinalIgnoreCase) -ge 0) }).Count -gt 0 }
$rows = New-Object System.Collections.Generic.List[object]
$i = 0
foreach ($c in $candidates) {
    $i++
    Write-Progress -Activity 'Measuring' -Status $c.Path -PercentComplete ([int](100 * $i / [Math]::Max(1, $candidates.Count)))
    $m = Measure-Dir $c.Path
    $action = 'delete'
    if ($Include -notcontains $c.Category) { $action = 'not_selected' }
    elseif ($m.Reparse -gt 0) { $action = 'skip_junction' }
    elseif ($m.Newest -gt $cut) { $action = 'skip_recent' }
    elseif (In-Use $c.Path) { $action = 'skip_in_use' }
    $result = ''; $remaining = ''; $attempts = 0
    if ($Go -and $action -eq 'delete') {
        # rd removes a junction itself and never its target; items holding one were skipped above anyway.
        # Its stderr must not stop the script (PowerShell 5.1 turns redirected native stderr into errors), and a
        # transient "directory is not empty" while Windows finishes pending deletes gets two more tries.
        $ErrorActionPreference = 'Continue'
        while ($attempts -lt 3 -and [IO.Directory]::Exists($c.Path)) {
            $attempts++
            & cmd.exe /d /c rd /s /q ('\\?\' + $c.Path) 2>&1 | Out-Null
            if ([IO.Directory]::Exists($c.Path)) { Start-Sleep -Milliseconds 500 }
        }
        $ErrorActionPreference = 'Stop'
        if ([IO.Directory]::Exists($c.Path)) { $left = Measure-Dir $c.Path; $result = 'partial'; $remaining = $left.Bytes } else { $result = 'deleted' }
    }
    $row = [pscustomobject]@{ category = $c.Category; path = $c.Path; bytes = $m.Bytes; files = $m.Files; newest_utc = $m.Newest.ToString('o'); reparse_points = $m.Reparse; enum_errors = $m.Errors; action = $action; result = $result; remaining_bytes = $remaining; attempts = $attempts }
    $rows.Add($row)
    # Append as we go, so an interrupted run still shows how far it got.
    $row | Export-Csv -LiteralPath (Join-Path $runDir 'items-progress.csv') -NoTypeInformation -Encoding UTF8 -Append
}
Write-Progress -Activity 'Measuring' -Completed
$freeAfter = Free-Bytes
$rows | Export-Csv -LiteralPath (Join-Path $runDir 'items.csv') -NoTypeInformation -Encoding UTF8
$totals = foreach ($k in $categories.Keys) {
    $r = @($rows | Where-Object { $_.category -eq $k }); $del = @($r | Where-Object { $_.action -eq 'delete' })
    [ordered]@{ category = $k; description = $categories[$k]; selected = ($Include -contains $k); dirs = $r.Count; bytes = [int64](($r | Measure-Object bytes -Sum).Sum); to_delete = $del.Count; to_delete_bytes = [int64](($del | Measure-Object bytes -Sum).Sum); skipped_recent = @($r | Where-Object { $_.action -eq 'skip_recent' }).Count; skipped_junction = @($r | Where-Object { $_.action -eq 'skip_junction' }).Count; skipped_in_use = @($r | Where-Object { $_.action -eq 'skip_in_use' }).Count; deleted = @($r | Where-Object { $_.result -eq 'deleted' }).Count; partial = @($r | Where-Object { $_.result -eq 'partial' }).Count }
}
$summary = [ordered]@{
    mode = $(if ($Go) { 'go' } else { 'preview' }); startedAt = $startedAt.ToString('o'); endedAt = [DateTime]::UtcNow.ToString('o')
    computer = $env:COMPUTERNAME; user = $env:USERNAME; script = $MyInvocation.MyCommand.Path; scriptSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $MyInvocation.MyCommand.Path).Hash
    options = [ordered]@{ include = @($Include); notIncluded = @($categories.Keys | Where-Object { $Include -notcontains $_ }); minAgeHours = $MinAgeHours; repo = $repoFull }
    busyProcesses = $busy; containers = $containers.Count; candidates = $candidates.Count
    freeBytesBefore = $freeBefore; freeBytesAfter = $freeAfter; freedBytesByDrive = ($freeAfter - $freeBefore)
    categories = @($totals)
}
[IO.File]::WriteAllText((Join-Path $runDir 'summary.json'), ($summary | ConvertTo-Json -Depth 5), (New-Object Text.UTF8Encoding($false)))
'{0,-9} {1,6} {2,10} {3,10} {4,8}' -f 'category', 'dirs', 'GB', 'delete GB', 'skipped'
foreach ($t in $totals) { '{0,-9} {1,6} {2,10:N2} {3,10:N2} {4,8}' -f $t.category, $t.dirs, ($t.bytes / 1GB), ($t.to_delete_bytes / 1GB), ($t.skipped_recent + $t.skipped_junction + $t.skipped_in_use) }
'Mode {0}; free on drive {1:N2} GB -> {2:N2} GB; record {3}' -f $summary.mode, ($freeBefore / 1GB), ($freeAfter / 1GB), $runDir
