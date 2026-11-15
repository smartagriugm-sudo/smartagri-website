' Menjalankan go2rtc dan gerbang CCTV tanpa jendela. Taruh pintasan file ini
' di folder Startup (Win+R, ketik shell:startup) agar jalan setiap login.
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = dir
sh.Run "cmd /c """ & dir & "\start-go2rtc.cmd""", 0, False
sh.Run "cmd /c """ & dir & "\start-gateway.cmd""", 0, False
