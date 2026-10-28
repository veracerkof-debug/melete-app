# Graphify — граф кода (проба с 28.10.2026, решение автора: оставить, если удобно; мешает — убрать)

Граф проекта: `graphify-out/` (в репозиторий не кладётся, строится сам при начале сессии — `.claude/graphify-start.sh`,
по коду, без нейросети, ~20 с; что не разбирать — `.graphifyignore`). Навык — `.claude/skills/graphify/SKILL.md` (`/graphify`).

- Вопрос «кто вызывает / что затронет / откуда берётся» — сначала `graphify explain "<имя>"`, `graphify path "<A>" "<B>"`
  или `graphify query "<вопрос>"`, потом читать только найденные строки. Обзор архитектуры — `graphify-out/GRAPH_REPORT.md`.
- Связи между языками (JS ↔ Java/Rust через имя плагина или команды) граф не видит — их искать как раньше.
- После правок кода — `graphify update .` (без нейросети, бесплатно), чтобы граф не устаревал.
- Нет `graphify-out/graph.json` (сборка не прошла, нет сети) — работать как обычно, без графа.
- Убрать: `graphify uninstall`, затем удалить `.claude/graphify-start.sh`, `.graphifyignore`, этот файл и хуки в `.claude/settings.json`.
