#!/usr/bin/env bash
# Выкладка в ветку gh-pages (GitHub Pages) без стирания чужой части. Два адреса живут в одной ветке:
#   корень  — обычная веб-версия (из pre, web.yml)
#   show/   — витрина, полная копия dev (из main, showcase.yml)
# Каждая выкладка заменяет только свою часть, чужая остаётся. История ветки — один коммит (как раньше: сборки не копятся).
# Параллельные выкладки исключены общей очередью workflows (concurrency: web-pages).
# Использование: PAGES_REMOTE=<url> build/pages-deploy.sh <папка-сборки> <show|root> "<сообщение>"
set -euo pipefail
SRC=${1:?папка сборки}; PART=${2:?show|root}; MSG=${3:-"Выкладка"}; REMOTE=${PAGES_REMOTE:?PAGES_REMOTE}
[ -d "$SRC" ] || { echo "нет папки $SRC" >&2; exit 1; }
SRC=$(cd "$SRC" && pwd)
W=$(mktemp -d); trap 'rm -rf "$W"' EXIT
cd "$W"
# что уже выложено: берём ветку целиком (если её ещё нет — начинаем с пустой)
if git ls-remote --exit-code --heads "$REMOTE" gh-pages >/dev/null 2>&1; then git clone -q --depth 1 --branch gh-pages "$REMOTE" pages; else mkdir pages; git -C pages init -q -b gh-pages; git -C pages remote add origin "$REMOTE"; fi
cd pages
git config user.name "github-actions[bot]"; git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
if [ "$PART" = show ]; then
  rm -rf show; mkdir show; cp -a "$SRC"/. show/
else
  find . -mindepth 1 -maxdepth 1 ! -name .git ! -name show -exec rm -rf {} +
  cp -a "$SRC"/. .
  [ -d "$SRC/show" ] && { echo "в сборке корня не должно быть show/" >&2; exit 1; }
fi
touch .nojekyll
# один коммит: свежее дерево без истории
git checkout -q --orphan fresh
git add -A
git commit -q -m "$MSG"
git push -q -f origin fresh:gh-pages
echo "выложено: $PART"
