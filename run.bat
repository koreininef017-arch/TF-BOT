@echo off
title THE FOOL BOT - التشغيل السريع
color 0A

echo.
echo ==========================================
echo          THE FOOL BOT
echo          نظام التشغيل السريع
echo ==========================================
echo.

REM فحص وجود Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js غير مثبت أو غير موجود في PATH
    echo يرجى تثبيت Node.js من https://nodejs.org
    pause
    exit /b 1
)

REM عرض إصدار Node.js
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION%

REM فحص وجود npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm غير موجود
    pause
    exit /b 1
)

echo ✅ npm موجود

REM التأكد من تثبيت dependencies
if not exist "node_modules" (
    echo 📦 تثبيت المكاتب المطلوبة...
    npm install --silent
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ فشل في تثبيت المكاتب
        pause
        exit /b 1
    )
)

echo.
echo 🚀 بدء تشغيل البوت...
echo.

REM تشغيل البوت (الطريقة السريعة)
node quick.js

REM إذا توقف البوت، السؤال عن إعادة التشغيل
:restart
echo.
set /p "restart=هل تريد إعادة تشغيل البوت؟ (y/n): "
if /i "%restart%"=="y" goto :run_bot
if /i "%restart%"=="yes" goto :run_bot
if /i "%restart%"=="نعم" goto :run_bot
goto :end

:run_bot
echo.
echo 🔄 إعادة تشغيل البوت...
node start.js
goto :restart

:end
echo.
echo 👋 وداعاً!
pause
exit /b 0
