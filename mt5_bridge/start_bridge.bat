@echo off
echo ============================================
echo  AxyFx Journal - MT5 Python Bridge Setup
echo ============================================
echo.
echo Step 1: Checking Python installation...
python --version 2>nul
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH.
    echo Please install Python from https://python.org and re-run this script.
    pause
    exit /b 1
)

echo.
echo Step 2: Installing required packages...
pip install MetaTrader5 flask flask-cors

echo.
echo ============================================
echo  Setup complete! Starting MT5 Bridge...
echo  Make sure your MT5 terminal is OPEN.
echo ============================================
echo.
python mt5_bridge.py
pause
