@echo off
title SmashTeam Local Dev Launcher
echo ===================================================
echo   KHOI DONG HE THONG QUAN LY CLB SMASH TEAM (LOCAL)
echo ===================================================
echo.

echo [1/2] Dang kiem tra va khoi dong Backend Server (Port 5000)...
start "SmashTeam Backend" cmd /k "cd backend && (if not exist node_modules (echo Dang cai dat node_modules backend... && npm install)) && node index.js"

echo [2/2] Dang kiem tra va khoi dong Frontend Server (Port 3000)...
start "SmashTeam Frontend" cmd /k "cd frontend && (if not exist node_modules (echo Dang cai dat node_modules frontend... && npm install)) && npm run dev"

echo.
echo ===================================================
echo HE THONG DANG DUOC KHOI DONG!
echo.
echo - Backend api dang chay tai: http://localhost:5000
echo - Giao dien web dang chay tai: http://localhost:3000
echo - De truy cap trang ca nhan, hay login va vao: http://localhost:3000/profile
echo ===================================================
echo.
echo Nhan phim bat ky de dong cua so trinh khoi dong nay (hai cua so console cua server van se tiep tuc chay).
pause > null
