[Setup]
AppName=BunglonWIKI
AppVersion=2.0.0
AppPublisher=bawapi-katak
DefaultDirName={autopf}\BunglonWIKI
DefaultGroupName=BunglonWIKI
OutputDir=.
OutputBaseFilename=BunglonWIKI-Setup
Compression=lzma2
SolidCompression=yes
SetupIconFile=assets/img/icon.ico
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\BunglonWIKI.exe

[Tasks]
Name: "desktopicon"; Description: "Buat shortcut di Desktop"; GroupDescription: "Shortcut:"

[Files]
Source: "dist\BunglonWIKI.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\BunglonWIKI"; Filename: "{app}\BunglonWIKI.exe"
Name: "{commondesktop}\BunglonWIKI"; Filename: "{app}\BunglonWIKI.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\BunglonWIKI.exe"; Description: "Buka BunglonWIKI"; Flags: nowait postinstall skipifsilent
