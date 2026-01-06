@echo off
echo Starting SmartRecruit AI Platform...

echo Starting Backend Server...
start "Backend Server" /d "backend" cmd /k "npm run dev"

echo Starting AI Server...
start "AI Server" /d "ai-server" cmd /k "python server.py"

echo Starting Frontend Application...
start "Frontend App" cmd /k "npm run dev"

echo All services are starting in separate windows.
echo Frontend: http://localhost:3000
echo Backend: http://localhost:5002
echo AI Server: http://localhost:5001
