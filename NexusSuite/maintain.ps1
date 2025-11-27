Write-Host "=== Cleaning workspace ===" -ForegroundColor Cyan

# Remove cache / builds safely
Remove-Item -Recurse -Force "client\node_modules" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "client\dist" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "client\.vite" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "client\coverage" -ErrorAction SilentlyContinue

Write-Host "=== Reinstalling dependencies ===" -ForegroundColor Yellow
Set-Location client
npm install

Write-Host "=== Running ESLint and Prettier auto-fix ===" -ForegroundColor Green
npm run lint -- --fix
npm run format

Write-Host "=== Maintenance complete ===" -ForegroundColor Magenta
Set-Location ..