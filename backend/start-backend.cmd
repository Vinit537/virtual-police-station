@echo off
cd /d "%~dp0"
"D:\Virtual Police station\.tools\apache-maven-3.9.9\bin\mvn.cmd" -s "D:\Virtual Police station\backend\local-maven-settings.xml" -f "D:\Virtual Police station\backend\pom.xml" spring-boot:run
