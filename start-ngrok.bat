@echo off
echo ================================================
echo   GPS Tracker - Ngrok Tunnel Starter
echo ================================================
echo.

REM Check if ngrok is installed
where ngrok >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Ngrok not found!
    echo.
    echo Please install ngrok first:
    echo 1. Download from: https://ngrok.com/download
    echo 2. Extract to C:\ngrok\ or add to PATH
    echo 3. Run: ngrok auth token YOUR_TOKEN_HERE
    echo.
    pause
    exit /b 1
)

echo [INFO] Starting ngrok tunnel...
echo [INFO] Exposing local port 8080 for WebSocket
echo.
echo ================================================
echo   Your server URLs will appear below:
echo ================================================
echo.

REM Start ngrok for WebSocket port 8080
ngrok http 8080

pause
