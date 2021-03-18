#!/bin/bash -e
cd "$(dirname "$0")"

_fail() {
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

export ESTRELLA_TEST_VERBOSE=$ESTRELLA_TEST_VERBOSE
if [ "$1" == "-verbose" ]; then
  export ESTRELLA_TEST_VERBOSE=1
fi

echo "testing stdin via build.js"
./build.js -quiet <<< 'export function working() { return "works" }'

for f in out/*.js; do
  # working()
  if [[ "$(cat "$f")" != *'working()'* ]]; then
    _fail "$f does not contain working()"
  fi
done

# test cli
echo "testing stdin via CLI"
EXPECTED='console.log("hello");'
ACTUAL="$(../../dist/estrella.js <<< 'console.log("hello")')"
[ "$ACTUAL" == "$EXPECTED" ] ||
  _fail "cli stdin: expected $EXPECTED but got $ACTUAL"
