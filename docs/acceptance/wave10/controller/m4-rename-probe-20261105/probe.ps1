# Controller probe for W10-M4: which handle-relative rename forms work on this machine.
# Synthetic files only, inside the probe's own scratch folder.
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot ('run-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $root | Out-Null
$src = Join-Path $root 'src'; $dst = Join-Path $root 'dst'
New-Item -ItemType Directory -Path $src, $dst | Out-Null

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class RenameProbe {
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern IntPtr CreateFileW(string name, uint access, uint share, IntPtr sa, uint disp, uint flags, IntPtr tmpl);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool SetFileInformationByHandle(IntPtr h, int cls, byte[] buf, uint size);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr h);
    [DllImport("ntdll.dll")]
    public static extern int NtSetInformationFile(IntPtr h, byte[] iosb, byte[] buf, uint len, int cls);

    const uint DELETE = 0x00010000, SYNCHRONIZE = 0x00100000, FILE_READ_ATTRIBUTES = 0x80;
    const uint FILE_LIST_DIRECTORY = 1, FILE_TRAVERSE = 0x20, FILE_ADD_FILE = 2, FILE_ADD_SUBDIRECTORY = 4;
    const uint SHARE_ALL = 7, OPEN_EXISTING = 3, BACKUP = 0x02000000, NO_REPARSE = 0x00200000;

    public static IntPtr Open(string p, uint access) {
        IntPtr h = CreateFileW(p, access, SHARE_ALL, IntPtr.Zero, OPEN_EXISTING, BACKUP | NO_REPARSE, IntPtr.Zero);
        if (h == new IntPtr(-1)) throw new Exception("open failed " + Marshal.GetLastWin32Error());
        return h;
    }
    public static IntPtr OpenSource(string p) { return Open(p, DELETE | FILE_READ_ATTRIBUTES | SYNCHRONIZE); }
    public static IntPtr OpenDir(string p, bool add) {
        return Open(p, FILE_LIST_DIRECTORY | FILE_TRAVERSE | SYNCHRONIZE | (add ? (FILE_ADD_FILE | FILE_ADD_SUBDIRECTORY) : 0));
    }
    // x64 FILE_RENAME_INFO / FILE_RENAME_INFORMATION: flags@0 (4), pad, root@8, len@16, name@20, size 24 + name bytes.
    public static byte[] Buf(IntPtr root, string name, uint flags) {
        byte[] n = System.Text.Encoding.Unicode.GetBytes(name);
        byte[] b = new byte[24 + n.Length];
        BitConverter.GetBytes(flags).CopyTo(b, 0);
        BitConverter.GetBytes(root.ToInt64()).CopyTo(b, 8);
        BitConverter.GetBytes((uint)n.Length).CopyTo(b, 16);
        n.CopyTo(b, 20);
        return b;
    }
    public static string Win32(IntPtr h, int cls, byte[] b) {
        bool ok = SetFileInformationByHandle(h, cls, b, (uint)b.Length);
        return ok ? "ok" : ("error " + Marshal.GetLastWin32Error());
    }
    [DllImport("ntdll.dll")]
    public static extern uint RtlNtStatusToDosError(int status);
    public static uint Dos(int status) { return RtlNtStatusToDosError(status); }
    public static string Nt(IntPtr h, int cls, byte[] b) {
        byte[] iosb = new byte[16];
        int st = NtSetInformationFile(h, iosb, b, (uint)b.Length, cls);
        return st == 0 ? "ok" : ("status 0x" + st.ToString("X8"));
    }
}
'@

function Case([string]$label, [bool]$isDir, [scriptblock]$call) {
    $name = 'item-' + $label
    $p = Join-Path $src $name
    if ($isDir) { New-Item -ItemType Directory -Path $p | Out-Null; Set-Content -Path (Join-Path $p 'inner.txt') -Value 'x' }
    else { Set-Content -Path $p -Value 'x' }
    $h = [RenameProbe]::OpenSource($p)
    $d = [RenameProbe]::OpenDir($dst, $true)
    try { $r = & $call $h $d $name } finally { [void][RenameProbe]::CloseHandle($h); [void][RenameProbe]::CloseHandle($d) }
    $moved = Test-Path (Join-Path $dst $name)
    '{0,-34} {1,-5} result={2,-22} moved={3}' -f $label, $(if ($isDir) { 'dir' } else { 'file' }), $r, $moved
}

foreach ($isDir in @($false, $true)) {
    $k = if ($isDir) { 'd' } else { 'f' }
    Case "A-win32-cls3-root-relative-$k" $isDir { param($h, $d, $n) [RenameProbe]::Win32($h, 3, [RenameProbe]::Buf($d, $n, 0)) }
    Case "B-win32-cls3-null-fullpath-$k" $isDir { param($h, $d, $n) [RenameProbe]::Win32($h, 3, [RenameProbe]::Buf([IntPtr]::Zero, (Join-Path $dst $n), 0)) }
    Case "C-nt-cls10-root-relative-$k" $isDir { param($h, $d, $n) [RenameProbe]::Nt($h, 10, [RenameProbe]::Buf($d, $n, 0)) }
    Case "D-win32-cls22-root-relative-$k" $isDir { param($h, $d, $n) [RenameProbe]::Win32($h, 22, [RenameProbe]::Buf($d, $n, 0)) }
    Case "E-nt-cls65-root-relative-$k" $isDir { param($h, $d, $n) [RenameProbe]::Nt($h, 65, [RenameProbe]::Buf($d, $n, 0)) }
}
# F: destination name already exists -> must fail without replacing; G: parent handle without add rights;
# H: destination parent on another volume (controller .local on F:).
function Status([string]$s) { if ($s -match '^status 0x([0-9A-F]{8})$') { $v = [Convert]::ToInt32($Matches[1], 16); "$s dos=$([RenameProbe]::Dos($v))" } else { $s } }
Set-Content -Path (Join-Path $src 'collide') -Value 'new'; Set-Content -Path (Join-Path $dst 'collide') -Value 'old'
$h = [RenameProbe]::OpenSource((Join-Path $src 'collide')); $d = [RenameProbe]::OpenDir($dst, $true)
$r = [RenameProbe]::Nt($h, 10, [RenameProbe]::Buf($d, 'collide', 0)); [void][RenameProbe]::CloseHandle($h); [void][RenameProbe]::CloseHandle($d)
'{0,-34} result={1} kept-old={2} src-still-there={3}' -f 'F-nt-cls10-collision', (Status $r), ((Get-Content (Join-Path $dst 'collide')) -eq 'old'), (Test-Path (Join-Path $src 'collide'))
Set-Content -Path (Join-Path $src 'noadd') -Value 'x'
$h = [RenameProbe]::OpenSource((Join-Path $src 'noadd')); $d = [RenameProbe]::OpenDir($dst, $false)
$r = [RenameProbe]::Nt($h, 10, [RenameProbe]::Buf($d, 'noadd', 0)); [void][RenameProbe]::CloseHandle($h); [void][RenameProbe]::CloseHandle($d)
'{0,-34} result={1} moved={2}' -f 'G-nt-cls10-parent-without-add', (Status $r), (Test-Path (Join-Path $dst 'noadd'))
$other = 'F:\new\smaltalk\water\.local\m4-rename-probe-' + [guid]::NewGuid().ToString('N').Substring(0, 8)
New-Item -ItemType Directory -Path $other | Out-Null
Set-Content -Path (Join-Path $src 'xvol') -Value 'x'
$h = [RenameProbe]::OpenSource((Join-Path $src 'xvol')); $d = [RenameProbe]::OpenDir($other, $true)
$r = [RenameProbe]::Nt($h, 10, [RenameProbe]::Buf($d, 'xvol', 0)); [void][RenameProbe]::CloseHandle($h); [void][RenameProbe]::CloseHandle($d)
'{0,-34} result={1} moved={2}' -f 'H-nt-cls10-other-volume', (Status $r), (Test-Path (Join-Path $other 'xvol'))
'other-volume folder: ' + $other
'probe folder: ' + $root
