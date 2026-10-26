# Controller read-only cross-check for WATER-W2-B real smoke: measures the same groups as
# contracts/checkup-v1/real-plan-template.json. Names, sizes and attributes only; never reads
# file contents; never enters reparse points. Prints one JSON object with byte totals per group.
$ErrorActionPreference = 'Stop'
$U = $env:USERPROFILE.TrimEnd('\'); $L = $env:LOCALAPPDATA.TrimEnd('\'); $T = (Join-Path $env:SystemRoot 'Temp')
$script:denied = 0

function Size([System.IO.FileSystemInfo]$info) {
  if ($info.Attributes -band [IO.FileAttributes]::ReparsePoint) { return [int64]0 }
  if (-not ($info.Attributes -band [IO.FileAttributes]::Directory)) { return [int64]$info.Length }
  [int64]$sum = 0
  $stack = New-Object System.Collections.Stack; $stack.Push($info)
  while ($stack.Count -gt 0) {
    $d = [IO.DirectoryInfo]$stack.Pop()
    try { $kids = $d.EnumerateFileSystemInfos() | ForEach-Object { $_ } } catch { $script:denied++; continue }
    foreach ($k in $kids) {
      if ($k.Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }
      if ($k.Attributes -band [IO.FileAttributes]::Directory) { $stack.Push($k) } else { $sum += $k.Length }
    }
  }
  return $sum
}
function Items([string]$base, [string[]]$segments) {
  $level = @([IO.DirectoryInfo]::new($base))
  for ($i = 0; $i -lt $segments.Count; $i++) {
    $next = @()
    foreach ($d in $level) {
      if (-not $d.Exists -or ($d.Attributes -band [IO.FileAttributes]::ReparsePoint)) { continue }
      try { $next += @($d.EnumerateFileSystemInfos($segments[$i]) | Where-Object { $i -eq $segments.Count - 1 -or (($_.Attributes -band [IO.FileAttributes]::Directory) -and -not ($_.Attributes -band [IO.FileAttributes]::ReparsePoint)) }) } catch { $script:denied++ }
    }
    $level = $next
  }
  return @($level | Where-Object { -not ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) })
}
function Total($items) { [int64]$s = 0; foreach ($x in $items) { $s += (Size $x) }; return $s }

$staging = @(Get-ChildItem -LiteralPath $U -Directory -Force -Filter '.codex*' -ErrorAction SilentlyContinue | ForEach-Object { Items $_.FullName @('.tmp','marketplaces','.staging','marketplace-upgrade-*') } | ForEach-Object { $_ })
$scratch = Items $T @('claude','*','*')
$installer = Items $T @('vscode-stable-*')
$tempChildren = @([IO.DirectoryInfo]::new($T).EnumerateFileSystemInfos() | Where-Object { -not ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) })
$covered = @($scratch + $installer | ForEach-Object { $_.FullName })
$tempOld = @($tempChildren | Where-Object { $c = $_.FullName; -not ($covered | Where-Object { $_ -eq $c -or $_.StartsWith($c + '\', [StringComparison]::OrdinalIgnoreCase) }) })

$out = [ordered]@{
  measured_at = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
  'npm-cache' = Total (Items $L @('npm-cache'))
  'claude-code-sessions' = Total (Items $U @('.claude','projects'))
  'crash-dumps' = Total (Items $L @('CrashDumps','*.dmp'))
  'codex-marketplace-staging' = Total $staging
  'claude-code-scratchpad' = Total $scratch
  'installer-unpack-temp' = Total $installer
  'chrome-cache' = Total (Items $L @('Google','Chrome','User Data','*','Cache'))
  'system-temp-old' = Total $tempOld
  'system-temp-old_items' = $tempOld.Count
  denied = $script:denied
}
$out | ConvertTo-Json -Compress
