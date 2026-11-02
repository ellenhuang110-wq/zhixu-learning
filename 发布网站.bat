@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   知序学习网站 · 一键发布
echo ============================================
echo.
echo [1/3] 收集本地改动...
git add -A
git commit -m "update: %date% %time%" >nul 2>&1
echo [2/3] 推送到 GitHub...
git push
if %errorlevel% neq 0 (
  echo.
  echo [!] 推送失败：通常是网络问题。
  echo     请确认 FlClash 代理已开启，然后重新双击本文件。
  echo.
  pause
  exit /b 1
)
echo.
echo [3/3] 推送成功！GitHub 正在自动重新发布。
echo     等 1-2 分钟后刷新网站即可看到更新：
echo     https://ellenhuang110-wq.github.io/zhixu-learning/
echo.
pause
