; Flick installer for Windows (per-user, no administrator rights).
; Build with packaging/windows/build.ps1, which passes:
;   /DVERSION=<x.y.z>  /DEXE=<path to flick.exe>  /DICON=<path to .ico>  /DOUTFILE=<installer path>
;   /DLICENCEDIR=<folder with LICENSE-MIT, LICENSE-APACHE and THIRD-PARTY-LICENSES.md>
; and /DFLICK_TEST for a test build that installs files only (no Start menu shortcut, no uninstall entry),
; so it can be installed and removed inside a scratch folder.
; The installer and uninstaller never touch Flick's data folder (%LOCALAPPDATA%\Flick) or any quarantine folder.

Unicode true
!ifndef VERSION
  !error "VERSION is required, e.g. /DVERSION=0.1.0"
!endif
!ifndef EXE
  !error "EXE is required: the path of the built flick.exe"
!endif
!ifndef ICON
  !error "ICON is required: the path of flick-app-icon.ico"
!endif
!ifndef LICENCEDIR
  !error "LICENCEDIR is required: the folder with the licence files"
!endif
!ifndef OUTFILE
  !define OUTFILE "Flick-Setup-${VERSION}.exe"
!endif
!define UNINSTKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Flick"
; WebView2 Evergreen Runtime client id (the same for per-machine and per-user installs).
!define WEBVIEW2_ID "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"

Name "Flick"
OutFile "${OUTFILE}"
RequestExecutionLevel user
InstallDir "$LOCALAPPDATA\Programs\Flick"
SetCompressor /SOLID lzma
ShowInstDetails nevershow
ShowUninstDetails nevershow

!include "MUI2.nsh"
!define MUI_ICON "${ICON}"
!define MUI_UNICON "${ICON}"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\flick.exe"
!define MUI_FINISHPAGE_RUN_TEXT "打开 Flick"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "SimpChinese"

VIProductVersion "${VERSION}.0"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "ProductName" "Flick"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "CompanyName" "Flick"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "FileDescription" "Flick 安装程序"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "ProductVersion" "${VERSION}"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "LegalCopyright" "Copyright (c) 2026 Flick contributors"

Function .onInit
  ; Flick runs on WebView2. Windows 11 ships it; on older systems point the user to Microsoft's installer.
  ReadRegStr $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\${WEBVIEW2_ID}" "pv"
  StrCmp $0 "" 0 done
  ReadRegStr $0 HKCU "Software\Microsoft\EdgeUpdate\Clients\${WEBVIEW2_ID}" "pv"
  StrCmp $0 "" 0 done
  MessageBox MB_OK|MB_ICONINFORMATION "这台电脑上没有找到 Microsoft Edge WebView2 运行库，Flick 需要它才能打开。$\r$\n安装完成后，请从微软官网下载“WebView2 运行库”（Evergreen）装上。" /SD IDOK
  done:
FunctionEnd

Section "Flick"
  SetOutPath "$INSTDIR"
  retry:
    ClearErrors
    Delete "$INSTDIR\flick.exe"
    IfErrors 0 copy
    MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Flick 正在运行。请先关闭它，然后点“重试”。" /SD IDCANCEL IDRETRY retry
    Abort
  copy:
  File "/oname=flick.exe" "${EXE}"
  File "${LICENCEDIR}\LICENSE-MIT"
  File "${LICENCEDIR}\LICENSE-APACHE"
  File "${LICENCEDIR}\THIRD-PARTY-LICENSES.md"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
!ifndef FLICK_TEST
  CreateShortCut "$SMPROGRAMS\Flick.lnk" "$INSTDIR\flick.exe"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayName" "Flick"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINSTKEY}" "Publisher" "Flick"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayIcon" "$INSTDIR\flick.exe"
  WriteRegStr HKCU "${UNINSTKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTKEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "${UNINSTKEY}" "QuietUninstallString" '"$INSTDIR\Uninstall.exe" /S'
  WriteRegStr HKCU "${UNINSTKEY}" "URLInfoAbout" "https://github.com/dfan0519-tech/flick"
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoRepair" 1
!endif
SectionEnd

Section "Uninstall"
  ClearErrors
  Delete "$INSTDIR\flick.exe"
  IfErrors 0 removed
    MessageBox MB_OK|MB_ICONEXCLAMATION "Flick 正在运行。请先关闭它，再卸载。" /SD IDOK
    Abort
  removed:
  Delete "$INSTDIR\LICENSE-MIT"
  Delete "$INSTDIR\LICENSE-APACHE"
  Delete "$INSTDIR\THIRD-PARTY-LICENSES.md"
  Delete "$INSTDIR\Uninstall.exe"
  ; Only removes the folder when it is empty; files the user put there stay.
  RMDir "$INSTDIR"
!ifndef FLICK_TEST
  Delete "$SMPROGRAMS\Flick.lnk"
  DeleteRegKey HKCU "${UNINSTKEY}"
!endif
SectionEnd
