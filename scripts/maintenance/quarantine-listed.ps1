# Move the paths of a user-approved cleanup plan into a quarantine folder on the same volume; the user
# deletes that folder afterwards (the controller never hard-deletes). Preview by default; -Go moves.
# A path is skipped when it is missing, is a link or junction, sits on another volume than the quarantine,
# or when a running process has its executable or command line inside it (age is not proof of disuse).
# One JSON line per path is appended to -Log. Plan: UTF-8 JSON {quarantine, items:[{n, label, paths:[{path}]}]}.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File quarantine-listed.ps1 -Plan p.json -Log l.jsonl [-Only 3,7] [-Go]
param(
  [Parameter(Mandatory)][string]$Plan,
  [Parameter(Mandatory)][string]$Log,
  [int[]]$Only,
  [switch]$Go
)
$ErrorActionPreference = 'Continue'
$p = Get-Content -LiteralPath $Plan -Raw -Encoding UTF8 | ConvertFrom-Json
$q = $p.quarantine
$procs = @(Get-CimInstance Win32_Process | Select-Object ProcessId, Name, ExecutablePath, CommandLine)

function Get-Users([string]$path) {
  $pre = $path.TrimEnd('\') + '\'
  @($procs | Where-Object {
      ($_.ExecutablePath -and ($_.ExecutablePath.Equals($path, [StringComparison]::OrdinalIgnoreCase) -or
        $_.ExecutablePath.StartsWith($pre, [StringComparison]::OrdinalIgnoreCase))) -or
      ($_.CommandLine -and $_.CommandLine.IndexOf($path, [StringComparison]::OrdinalIgnoreCase) -ge 0)
    } | ForEach-Object { '{0}#{1}' -f $_.Name, $_.ProcessId })
}

function Get-Bytes($item) {
  if (-not $item.PSIsContainer) { return [int64]$item.Length }
  $sum = [int64]0
  foreach ($f in Get-ChildItem -LiteralPath $item.FullName -Recurse -Force -File -ErrorAction SilentlyContinue) { $sum += $f.Length }
  $sum
}

function Write-Row($row) {
  $row.at = (Get-Date).ToUniversalTime().ToString('o')
  Add-Content -LiteralPath $Log -Value ($row | ConvertTo-Json -Compress -Depth 4) -Encoding UTF8
}

$totals = @{}
foreach ($it in $p.items) {
  if ($Only -and ($Only -notcontains [int]$it.n)) { continue }
  foreach ($entry in $it.paths) {
    $src = [string]$entry.path
    $row = [ordered]@{ n = [int]$it.n; path = $src; dest = $null; bytes = $null; status = $null; reason = $null; users = @() }
    $item = Get-Item -LiteralPath $src -Force -ErrorAction SilentlyContinue
    if (-not $item) { $row.status = 'skipped'; $row.reason = 'missing'; Write-Row $row; continue }
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { $row.status = 'skipped'; $row.reason = 'link'; Write-Row $row; continue }
    if (-not [IO.Path]::GetPathRoot($src).Equals([IO.Path]::GetPathRoot($q), [StringComparison]::OrdinalIgnoreCase)) { $row.status = 'skipped'; $row.reason = 'other volume'; Write-Row $row; continue }
    $row.users = Get-Users $src
    $row.bytes = Get-Bytes $item
    if ($row.users.Count -gt 0) { $row.status = 'skipped'; $row.reason = 'in use'; Write-Row $row; continue }
    $dest = Join-Path (Join-Path $q ('{0:D2}' -f [int]$it.n)) $src.Substring([IO.Path]::GetPathRoot($src).Length)
    $row.dest = $dest
    if (-not $Go) { $row.status = 'preview'; Write-Row $row; $totals[[int]$it.n] += $row.bytes; continue }
    try {
      New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
      if (Test-Path -LiteralPath $dest) { throw 'destination exists' }
      Move-Item -LiteralPath $src -Destination $dest -ErrorAction Stop
      $row.status = 'moved'; $totals[[int]$it.n] += $row.bytes
    } catch {
      # A partly moved directory stays where it was: Move-Item renames on one volume, so a failure moves nothing.
      $row.status = 'skipped'; $row.reason = $_.Exception.Message
    }
    Write-Row $row
  }
}
foreach ($k in ($totals.Keys | Sort-Object)) { '{0,3} {1,8:N2} GB' -f $k, ($totals[$k] / 1e9) }
