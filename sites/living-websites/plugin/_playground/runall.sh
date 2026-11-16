#!/bin/sh
# Run every Playground test in order; one summary line per test plus any FAIL lines. Server from start.sh must be up.
cd "$(dirname "$0")"
for t in "$@"; do
  echo "== $t"
  node $t.js 2>&1 | grep -E "^FAIL|passed|Error|    at " | cut -c1-500
done
echo "== stats-check"
node ../spark-living/tests/stats-check.js | grep -E "FAIL|passed"
echo ALLDONE
