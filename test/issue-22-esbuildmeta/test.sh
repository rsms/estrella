#!/bin/bash
set -e
cd "$(dirname "$0")"

if [ -z "$ESTRELLA_PROGAM" ]; then ESTRELLA_PROGAM=../../dist/estrella.js; fi

rm -f out.*
bash -c "'$ESTRELLA_PROGAM' -w -quiet -bundle -no-clear -o=out.js main.js > out.log 2>&1;\
  echo \$? > out.status" &
pid=$!

# give it 5 seconds to complete
for i in {1..25}; do
  if sleep 0.01; then
    sleep 0.2
  else
    sleep 1
  fi
  if stat out.status >/dev/null 2>&1; then
    status=$(cat out.status)
    if [ $status -eq 0 ]; then
      echo "PASS OK"
    else
      cat out.log >&2
      echo "FAIL" >&2
    fi
    rm -f out.*
    exit $status
  fi
done

# if it hasn't finished in 5 seconds, kill it and consider this test a failure
kill $pid 2>/dev/null
cat out.log >&2
echo "FAIL (timeout)" >&2
rm -f out.*
exit 1
