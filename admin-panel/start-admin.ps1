# start-admin.ps1
Write-Host "🧠 Admin Panel (Vite) başlatılıyor..." -ForegroundColor Cyan

# Proje klasörüne geç
Set-Location "C:\Users\iliya\admin-panel"

# Vite portu
$port = 5174
$url = "http://localhost:$port"

# Eski süreçleri kontrol et ve kapat
$oldPid = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue)
if ($oldPid) {
    Write-Host "⚠️ Port $port kullanımda, eski süreç kapatılıyor (PID: $oldPid)..." -ForegroundColor Yellow
    Stop-Process -Id $oldPid -Force
    Start-Sleep -Seconds 1
}

# Vite dev sunucusunu başlat
Write-Host "🚀 Vite başlatılıyor (http://localhost:$port)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "npm run dev" -WorkingDirectory "C:\Users\iliya\admin-panel"

# Birkaç saniye bekle ki Vite başlasın
Start-Sleep -Seconds 5

# Chrome'u aç
Write-Host "🌐 Tarayıcı açılıyor: $url" -ForegroundColor Cyan
Start-Process "chrome.exe" $url
