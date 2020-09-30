#!/bin/bash -e
cd "$(dirname "$0")"

function fail {
  msg=$1 ; shift
  echo "FAIL $msg" >&2
  for line in "$@"; do
    echo "$line" >&2
  done
  exit 1
}

rm -rf node_modules
mkdir -p node_modules
ln -s ../../..                       node_modules/estrella
ln -s ../../../node_modules/esbuild  node_modules/esbuild

# Note: no need to run "npm install" as only type defs are declared.
# When editing main.tsx it may be helpful to manuall run "npm install" to install react type defs.

export ESTRELLA_TEST_VERBOSE=$ESTRELLA_TEST_VERBOSE
if [ "$1" == "-verbose" ]; then
  export ESTRELLA_TEST_VERBOSE=1
fi

node build.js -quiet

for f in out/*.js; do
  # createElement("h1"
  if [[ "$(cat "$f")" != *'createElement("h1"'* ]]; then
    fail "$f does not contain createElement(\"h1\""
  fi
done
