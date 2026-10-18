#!/bin/sh
# E-Book tests. Run this before every publish; publish only when the last line says ALL PASS.
#   sh tests/run.sh
# Needs node, playwright (NODE_PATH) and python3. Starts its own local server on port 8765.
cd "$(dirname "$0")/.." || exit 1
export NODE_PATH="${NODE_PATH:-/opt/npm-tools/node_modules}"
fail=0
for f in rooms/field/*.js core/*.js lists/*.js; do node --check "$f" || fail=1; done
cp server/core.gs /tmp/ebook-core-check.js && node --check /tmp/ebook-core-check.js || fail=1
[ "$fail" = 1 ] && { echo "FAIL syntax"; exit 1; }
echo "PASS syntax"
if ! curl -s -o /dev/null http://localhost:8765/index.html; then
  python3 -m http.server 8765 >/dev/null 2>&1 & srv=$!; sleep 1
fi
out=$(mktemp -d)
for t in tests/*.spec.js; do
  echo "== $t"
  timeout 180 node "$t" "$out" 2>&1 | grep -E "^(PASS|FAIL)|Error" || { echo "FAIL $t (no result)"; fail=1; }
  timeout 180 node "$t" "$out" >/dev/null 2>&1 || fail=1
done
[ -n "$srv" ] && kill $srv 2>/dev/null
if [ "$fail" = 1 ]; then echo "SOME FAILED — do not publish"; exit 1; fi
echo "ALL PASS"
