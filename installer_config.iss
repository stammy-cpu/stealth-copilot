; ============================================================================
; installer_config.iss — Inno Setup Script
; Stealth Copilot v2 — Cloud-Synced Desktop Client
;
; Requirements:
;   1. Run build_installer.py first to produce dist\StealthCopilot\
;   2. Install Inno Setup 6.x from https://jrsoftware.org/isdl.php
;   3. Compile this script:  iscc.exe installer_config.iss
;   4. Output: dist\StealthCopilot_Setup.exe
;
; Optional: Place icon.ico next to this file to use a custom installer icon.
; ============================================================================

#define AppName      "Stealth Copilot"
#define AppVersion   "2.0.0"
#define AppPublisher "Stealth Copilot"
#define AppURL       "http://localhost:3000"
#define AppExeName   "StealthCopilot.exe"
#define SourceDir    "dist\StealthCopilot"

[Setup]
; Unique GUID — regenerate if you fork this project
AppId={{6A3F8B2E-1D4C-4A7F-9E0B-5C2D8F1A3E6B}}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
AllowNoIcons=yes
; Output location (relative to this .iss file)
OutputDir=dist
OutputBaseFilename=StealthCopilot_Setup
; Compression
Compression=lzma2/ultra64
SolidCompression=yes
; Require Windows 10+ (needed for SetWindowDisplayAffinity WDA_EXCLUDEFROMCAPTURE)
MinVersion=10.0
; 64-bit only
ArchitecturesInstallIn64BitMode=x64compatible
; Require admin for system-level install
PrivilegesRequired=admin
; Icon (comment out if icon.ico is not present)
; SetupIconFile=icon.ico
; Wizard style
WizardStyle=modern
WizardResizable=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon";     Description: "{cm:CreateDesktopIcon}";     GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startupentry";   Description: "Launch Stealth Copilot on Windows startup"; GroupDescription: "Startup:"; Flags: unchecked

[Files]
; Main application folder (output of PyInstaller --onedir)
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}";          Filename: "{app}\{#AppExeName}"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}";    Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Registry]
; Run on startup (optional task)
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
    ValueType: string; ValueName: "{#AppName}"; \
    ValueData: """{app}\{#AppExeName}"""; \
    Flags: uninsdeletevalue; Tasks: startupentry

[Run]
; Launch after install
Filename: "{app}\{#AppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(AppName, '&', '&&')}}"; \
    Flags: nowait postinstall skipifsilent

[UninstallRun]
; Nothing special needed — files removed by Inno Setup automatically

[Code]
// ── Pre-install check: Windows 10 or later ──────────────────────────────────
function InitializeSetup(): Boolean;
var
  Version: TWindowsVersion;
begin
  GetWindowsVersionEx(Version);
  if Version.Major < 10 then
  begin
    MsgBox(
      'Stealth Copilot requires Windows 10 or later.'#13#10 +
      'Please upgrade your operating system.',
      mbError, MB_OK
    );
    Result := False;
  end
  else
    Result := True;
end;
