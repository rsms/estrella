#!/bin/bash
set -e
cd "$(dirname "$0")"

if [ -z "$ESTRELLA_PROGAM" ]; then ESTRELLA_PROGAM=../../dist/estrella.js; fi
export ESTRELLA_PROGAM

# test 1/2 -- API output
node build.js

# test 2/2 -- stout output
OUTPUT=$(TEST_OUTPUT_TO_STDOUT=1 node build.js)
if [ "$OUTPUT" != '"use strict";console.log("a");' ]; then
  echo "unexpected output on stdout: $OUTPUT" >&2
  exit 1
fi

echo "PASS OK"
