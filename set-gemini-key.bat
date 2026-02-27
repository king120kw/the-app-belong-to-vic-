@echo off
if "%~1"=="" (
    echo Usage: set-gemini-key.bat YOUR_API_KEY
    exit /b 1
)
echo Setting GEMINI_API_KEY...
call supabase secrets set GEMINI_API_KEY=%~1
echo Done! Please wait 30 seconds for the function to reload.
pause
