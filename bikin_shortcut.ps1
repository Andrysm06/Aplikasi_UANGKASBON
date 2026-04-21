$WshShell = New-Object -ComObject WScript.Shell
# Get the correct desktop path even with OneDrive or redirection
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "KASBONPRO.lnk"
$TargetPath = "c:\Users\ASUS\OneDrive\Documents\Andry\project sendiri\Aplikasi_UANGKASBON\Mulai_Aplikasi.vbs"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = "c:\Users\ASUS\OneDrive\Documents\Andry\project sendiri\Aplikasi_UANGKASBON"
$Shortcut.Description = "Sistem Kasbon Internal Standalone"
$Shortcut.IconLocation = "shell32.dll, 149" 
$Shortcut.Save()

echo "--- IKON DESKTOP BERHASIL DIBUAT (Versi OneDrive Fixed) ---"
echo "Path: $DesktopPath"
 echo "Silakan cek layar desktop Anda!"
