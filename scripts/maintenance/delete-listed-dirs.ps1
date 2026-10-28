# Delete a reviewed list of dependency and cache directories (ASCII-only, PowerShell 5.1). Each line of -List:
#   <item number><TAB><minimum age in hours><TAB><absolute directory path>
# Guards per line: the name must be node_modules or a Python cache name; the directory must exist and not be a
# link itself; nothing inside may be newer than the age; every junction or symlink inside must point inside the
# directory (rd never follows links, this only keeps a link-to-elsewhere item for a human look). Preview by
# default; -Go deletes with rd (up to 3 tries). Writes <LogDir>\list-<UTC stamp>-<preview|go>\items.csv.
param([Parameter(Mandatory=$true)][string]$List, [switch]$Go, [string]$LogDir = 'F:\new\smaltalk\water\.local\cleanup-logs')
$ErrorActionPreference = 'Stop'
$allowed = @('node_modules', '__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache')
function Measure-Dir([string]$path) {
    $bytes = [int64]0; $files = [int64]0; $links = New-Object System.Collections.Generic.List[string]; $errors = 0
    $root = New-Object IO.DirectoryInfo('\\?\' + $path)
    $newest = $root.LastWriteTimeUtc
    $stack = New-Object System.Collections.Generic.Stack[IO.DirectoryInfo]; $stack.Push($root)
    while ($stack.Count -gt 0) {
        $dir = $stack.Pop()
        try {
            foreach ($e in $dir.EnumerateFileSystemInfos()) {
                if ($e.LastWriteTimeUtc -gt $newest) { $newest = $e.LastWriteTimeUtc }
                if (($e.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { $links.Add($e.FullName.Substring(4)); continue }
                if ($e -is [IO.DirectoryInfo]) { $stack.Push($e) } else { $bytes += $e.Length; $files++ }
            }
        } catch { $errors++ }
    }
    return @{ Bytes = $bytes; Files = $files; Newest = $newest; Links = $links; Errors = $errors }
}
# A link is inside when its resolved target lies under the item; an unreadable target counts as outside.
function Links-Outside([string]$item, $links) {
    $prefix = $item.TrimEnd('\') + '\'; $outside = 0
    foreach ($l in $links) {
        try {
            $t = @((Get-Item -LiteralPath $l -Force).Target)[0]
            if (-not $t) { $outside++; continue }
            $full = [IO.Path]::GetFullPath([IO.Path]::Combine([IO.Path]::GetDirectoryName($l), $t))
            if (-not $full.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { $outside++ }
        } catch { $outside++ }
    }
    return $outside
}
$stamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$runDir = Join-Path $LogDir ('list-' + $stamp + '-' + $(if ($Go) { 'go' } else { 'preview' }))
[void][IO.Directory]::CreateDirectory($runDir)
Copy-Item -LiteralPath $List -Destination (Join-Path $runDir 'list.tsv')
$drive = New-Object IO.DriveInfo('F:\'); $freeBefore = $drive.AvailableFreeSpace
$out = Join-Path $runDir 'items.csv'
# An old directory can still be in use (2026-10-29: a running codex.exe lived in a node_modules untouched for weeks).
$procs = Get-CimInstance Win32_Process | Select-Object Name, ExecutablePath, CommandLine
function In-Use([string]$p) { $prefix = $p.TrimEnd('\') + '\'; return @($procs | Where-Object { ($_.ExecutablePath -and $_.ExecutablePath.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) -or ($_.CommandLine -and $_.CommandLine.IndexOf($p, [StringComparison]::OrdinalIgnoreCase) -ge 0) }).Count -gt 0 }
foreach ($line in [IO.File]::ReadAllLines([IO.Path]::GetFullPath($List), (New-Object Text.UTF8Encoding($false)))) {
    if (-not $line.Trim()) { continue }
    $f = $line.Split("`t")
    if ($f.Count -lt 3) { [pscustomobject]@{ item = $f[0]; path = $line; action = 'bad_line' } | Export-Csv -LiteralPath $out -NoTypeInformation -Encoding UTF8 -Append -Force; continue }
    $no = $f[0]; $age = [int]$f[1]; $p = $f[2].Trim()
    $action = 'delete'; $m = $null; $outside = 0
    $name = [IO.Path]::GetFileName($p)
    if (-not [IO.Path]::IsPathRooted($p) -or $allowed -notcontains $name) { $action = 'refused_name' }
    elseif (-not [IO.Directory]::Exists($p)) { $action = 'missing' }
    elseif (((New-Object IO.DirectoryInfo($p)).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { $action = 'skip_is_link' }
    elseif (In-Use $p) { $action = 'skip_in_use' }
    else {
        $m = Measure-Dir $p
        if ($m.Newest -gt [DateTime]::UtcNow.AddHours(-$age)) { $action = 'skip_recent' }
        elseif ($m.Links.Count -gt 0) { $outside = Links-Outside $p $m.Links; if ($outside -gt 0) { $action = 'skip_link_outside' } }
    }
    $result = ''; $remaining = ''; $attempts = 0
    if ($Go -and $action -eq 'delete') {
        $ErrorActionPreference = 'Continue'
        while ($attempts -lt 3 -and [IO.Directory]::Exists($p)) {
            $attempts++
            & cmd.exe /d /c rd /s /q ('\\?\' + $p) 2>&1 | Out-Null
            if ([IO.Directory]::Exists($p)) { Start-Sleep -Milliseconds 500 }
        }
        $ErrorActionPreference = 'Stop'
        if ([IO.Directory]::Exists($p)) { $result = 'partial'; $remaining = (Measure-Dir $p).Bytes } else { $result = 'deleted' }
    }
    [pscustomobject]@{ item = $no; path = $p; min_age_hours = $age; bytes = $(if ($m) { $m.Bytes } else { '' }); files = $(if ($m) { $m.Files } else { '' }); newest_utc = $(if ($m) { $m.Newest.ToString('o') } else { '' }); links = $(if ($m) { $m.Links.Count } else { '' }); links_outside = $outside; action = $action; result = $result; remaining_bytes = $remaining; attempts = $attempts } |
        Export-Csv -LiteralPath $out -NoTypeInformation -Encoding UTF8 -Append
}
$freeAfter = (New-Object IO.DriveInfo('F:\')).AvailableFreeSpace
$rows = Import-Csv -LiteralPath $out
$summary = [ordered]@{ mode = $(if ($Go) { 'go' } else { 'preview' }); stamp = $stamp; freeBytesBefore = $freeBefore; freeBytesAfter = $freeAfter
    byItem = @($rows | Group-Object item | ForEach-Object { [ordered]@{ item = $_.Name; dirs = $_.Count; bytes = [int64](($_.Group | Where-Object { $_.bytes } | Measure-Object bytes -Sum).Sum); delete = @($_.Group | Where-Object action -eq 'delete').Count; deleted = @($_.Group | Where-Object result -eq 'deleted').Count; skipped = @($_.Group | Where-Object action -ne 'delete').Count } }) }
[IO.File]::WriteAllText((Join-Path $runDir 'summary.json'), ($summary | ConvertTo-Json -Depth 4), (New-Object Text.UTF8Encoding($false)))
foreach ($b in $summary.byItem) { 'item {0,-3} dirs {1,4}  {2,8:N2} GB  delete {3,4}  deleted {4,4}  skipped {5,3}' -f $b.item, $b.dirs, ($b.bytes / 1GB), $b.delete, $b.deleted, $b.skipped }
'free F: {0:N2} GB -> {1:N2} GB; record {2}' -f ($freeBefore / 1GB), ($freeAfter / 1GB), $runDir
