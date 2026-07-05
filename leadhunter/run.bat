@echo off
REM Cazador de leads Atrio — corre gratis, sin creditos de Claude.
REM Programalo en el Programador de tareas de Windows para que corra solo.
cd /d "%~dp0"
python hunter.py %*
