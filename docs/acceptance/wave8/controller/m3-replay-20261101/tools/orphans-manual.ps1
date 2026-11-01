# Independent orphan check for the 10-29 replay: same rule as process-scan orphans() with the default
# patterns, written from the contract, not from Water's code path. Read-only; prints JSON (no command lines).
$names = 'node.exe','cmd.exe','powershell.exe','pwsh.exe','bash.exe','python.exe','chrome.exe','msedge.exe'
$patterns = 'jest-worker','vitest','expo start','cursor-agent','codex','grok','playwright','puppeteer','--headless','metro'
$all = @(Get-CimInstance Win32_Process)
$byPid = @{}; foreach ($p in $all) { $byPid[[int]$p.ProcessId] = $p }
$rows = foreach ($p in $all) {
  if ($names -notcontains $p.Name.ToLower()) { continue }
  $parent = $byPid[[int]$p.ParentProcessId]
  $gone = $null -eq $parent
  $reused = (-not $gone) -and $parent.CreationDate -and $p.CreationDate -and ($parent.CreationDate -gt $p.CreationDate)
  if (-not ($gone -or $reused)) { continue }
  $cmd = if ($p.CommandLine) { $p.CommandLine.ToLower() } else { '' }
  $hit = $patterns | Where-Object { $cmd.Contains($_) } | Select-Object -First 1
  if (-not $hit) { continue }
  [ordered]@{ pid = [int]$p.ProcessId; name = $p.Name; matched_pattern = $hit; parent_gone = $gone; parent_reused = [bool]$reused; started_at = $p.CreationDate.ToUniversalTime().ToString('s') + 'Z' }
}
[ordered]@{ at = (Get-Date).ToUniversalTime().ToString('o'); process_count = $all.Count; orphans = @($rows) } | ConvertTo-Json -Depth 4 -Compress
