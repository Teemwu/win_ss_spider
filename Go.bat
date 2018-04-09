@echo off
CHCP 65001
echo 服务已启动！
npm run start
if "%1" == "h" goto begin
mshta vbscript:createobject("wscript.shell").run("""%~nx0"" h",0)(window.close)&&exit
:begin
REM