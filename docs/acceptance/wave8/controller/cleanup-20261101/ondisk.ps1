# Real on-disk size (after sparse ranges and NTFS compression) of the files under each given folder, read-only.
param([Parameter(Mandatory)][string[]]$Paths)
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class Disk {
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern uint GetCompressedFileSizeW(string name, out uint high);
  public static long OnDisk(string path) {
    uint high; uint low = GetCompressedFileSizeW(@"\\?\" + path, out high);
    if (low == 0xFFFFFFFF && Marshal.GetLastWin32Error() != 0) return -1;
    return ((long)high << 32) + low;
  }
}
'@
foreach ($p in $Paths) {
  $logical = [int64]0; $disk = [int64]0; $sparse = 0; $compressed = 0; $n = 0
  foreach ($f in Get-ChildItem -LiteralPath $p -Recurse -Force -File -ErrorAction SilentlyContinue) {
    $n++; $logical += $f.Length
    $d = [Disk]::OnDisk($f.FullName); if ($d -ge 0) { $disk += $d }
    if ($f.Attributes -band [IO.FileAttributes]::SparseFile) { $sparse++ }
    if ($f.Attributes -band [IO.FileAttributes]::Compressed) { $compressed++ }
  }
  '{0,8:N2} GB logical {1,8:N2} GB on disk  files {2} sparse {3} compressed {4}  {5}' -f ($logical / 1e9), ($disk / 1e9), $n, $sparse, $compressed, $p
}
