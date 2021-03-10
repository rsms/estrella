#!/bin/bash
#
# This test attempts to build an invalid input in watch mode.
# Build should fail and report the error and the estrella process should stay alive
# and keep watching for changes.
#
set -e
cd "$(dirname "$0")"

if [ -z "$ESTRELLA_PROGAM" ]; then ESTRELLA_PROGAM=../../dist/estrella.js; fi

rm -f out.*
bash -c "
'$ESTRELLA_PROGAM' -w -quiet -bundle -o=out.js main.js > out.log 2>&1;
echo \$? > out.status
" &
pid=$!

# give it 5 seconds to complete
for i in {1..25}; do
  if sleep 0.01 2>/dev/null; then
    sleep 0.2
  else
    sleep 1
  fi
  if [ -f out.log ] && grep -q "main.js:1:9: error: No matching export" out.log; then
    rm -f out.*
    kill $pid && exit 0
    echo "FAIL: estrella process exited prematurely" >&2
    exit 1
  fi
done

# if it hasn't finished in 5 seconds, kill it and consider this test a failure
kill $pid 2>/dev/null
cat out.log >&2
echo "FAIL (timeout)" >&2
rm -f out.*
exit 1
