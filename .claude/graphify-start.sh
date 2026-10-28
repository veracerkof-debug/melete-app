#!/bin/sh
# Начало сессии Claude Code: поставить Graphify (если его нет) и построить граф кода в фоне — сессия не ждёт.
# Нет сети или pip — тихо ничего не делает. Проба с 28.10.2026 (.claude/CLAUDE.md).
cd "$(dirname "$0")/.." || exit 0
(
  command -v graphify >/dev/null 2>&1 || python3 -m pip install --user -q graphifyy==0.9.97 >/dev/null 2>&1
  command -v graphify >/dev/null 2>&1 || PATH="$HOME/.local/bin:$PATH"
  command -v graphify >/dev/null 2>&1 && graphify update . >/dev/null 2>&1
) </dev/null >/dev/null 2>&1 &
exit 0
