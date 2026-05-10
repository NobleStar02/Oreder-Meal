@echo off
:: Doyuran Güveç — Tek Tıkla Demo Başlatıcı
:: Bu dosyaya çift tıklayın, tüm servisler başlar.
title Doyuran Güveç Demo
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0start-demo.ps1"
pause
