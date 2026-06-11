#!/bin/bash
# MapQuiz 一條龍：build -> validate -> test -> zip
# 用法：./make.sh [版本號]   有給版本號時先 bump
set -e
cd "$(dirname "$0")"
[ -n "$1" ] && python3 tools/bump.py "$1"
python3 tools/build.py
python3 tools/validate.py
node tests/run-tests.js
V=$(grep -o 'VERSION = "[\d.0-9]*"' js/app.js | grep -o '[0-9.]*')
( cd .. && rm -f "MapQuiz V$V.zip" && zip -r -q "MapQuiz V$V.zip" MapQuiz -x "MapQuiz/node_modules/*" && echo "[make] MapQuiz V$V.zip" )
