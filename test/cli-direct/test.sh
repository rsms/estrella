#!/bin/bash -e
cd "$(dirname "$0")"

rm -rf node_modules
mkdir -p node_modules
ln -s ../../..                       node_modules/estrella
ln -s ../../../node_modules/esbuild  node_modules/esbuild

function fail {
  echo "FAIL $1" >&2
  exit 1
}

estrella=$PWD/node_modules/estrella/dist/estrella.g.js

# should print to stdout when no outfile is given
expect='console.log("Hello world");'
actual=$("$estrella" main.ts)
if [[ "$actual" != "$expect" ]]; then
  fail "Unexpected output to stdout. Expected [$expect] but got [$actual]"
fi

# should write to outfile
rm -f out.js
"$estrella" -outfile=out.js main.ts -quiet
expect='console.log("Hello world");'
actual=$(cat out.js)
rm -f out.js
if [[ "$("$estrella" main.ts)" != "$expect" ]]; then
  fail "Unexpected output to out.js. Expected [$expect] but got [$actual]"
fi

# should fail to infer input files
set +e
actual=$("$estrella" 2>&1)
set -e
if [[ "$actual" != *"missing <srcfile>"* ]]; then
  fail "Should have failed with no inputs, with '... missing <srcfile> ...'. Got $actual"
fi
