@echo off
title THE FOOL BOT
color 0A
echo.
echo ==========================================
echo    THE FOOL BOT - CONTINUOUS RUNNING
echo ==========================================
echo.

:START
echo [%date% %time%] Starting THE FOOL Bot...
node .

echo.
echo [%date% %time%] Bot stopped. Restarting in 3 seconds...
timeout /t 3 /nobreak >nul
goto START