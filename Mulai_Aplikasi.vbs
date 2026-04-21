  Set WshShell = CreateObject("WScript.Shell")
' Menjalankan file batch secara senyap (0 = Hidden)
WshShell.Run chr(34) & "JALANKAN_APLIKASI.bat" & Chr(34), 0
Set WshShell = Nothing
