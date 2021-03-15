#!/bin/bash
set -e
cd "$(dirname "$0")"

estrella=$PWD/node_modules/estrella/dist/estrella.js
if [ -n "$ESTRELLA_PROGAM" ]; then
  estrella=$ESTRELLA_PROGAM
fi
outfile=.out.js

rm -rf node_modules
mkdir -p node_modules
ln -s ../../..                       node_modules/estrella
ln -s ../../../node_modules/esbuild  node_modules/esbuild

_fail() {
  echo "FAIL $1" >&2
  exit 1
}

_test() {
  echo "run test $1"
}

_clean() {
  rm -f "$outfile"
}
trap _clean EXIT
trap exit SIGINT  # make sure we can ctrl-c in loops

_clean


_test "should write to outfile"
"$estrella" "-outfile=$outfile" main.ts -quiet
expect='console.log("Hello world")'
actual=$(cat "$outfile")
if [[ "$("$estrella" main.ts)" != "$expect"* ]]; then
  _fail "Unexpected output to $outfile. Expected [${expect}*] but got [$actual]"
fi
echo "PASS"

_test "should run outfile when -run is set"
expect='Hello world'
actual=$("$estrella" "-outfile=$outfile" main.ts -quiet -run)
if [[ "$actual" != "$expect" ]]; then
  _fail "Unexpected output (-run). Expected [$expect] but got [$actual]"
fi
echo "PASS"

_test "Should print to stdout when no outfile is given."
# Also there should be no "Wrote" log message.
expect='console.log("Hello world")'
actual=$("$estrella" main.ts)
if [[ "$actual" != "$expect"* ]]; then
  _fail "Unexpected output to stdout. Expected [${expect}*] but got [$actual]"
fi
echo "PASS"

_test "Should run rather than print to stdout when no outfile is given and -run is set"
# Also there should be no "Wrote" log message.
expect='Hello world'
actual=$("$estrella" main.ts -run)
if [[ "$actual" != "$expect" ]]; then
  _fail "Unexpected stdout (-run). Expected [$expect] but got [$actual]"
fi
echo "PASS"

# ------------------------
# infile inference

_test "should fail to infer input files (no tsconfig.json)"
set +e
actual=$("$estrella" 2>&1)
set -e
if [[ "$actual" != *"missing <srcfile>"* ]]; then
  _fail "Should have failed with no inputs, with '... missing <srcfile> ...'. Got $actual"
fi
echo "PASS"


pushd ts-files >/dev/null
_test "(ts-files) infile inference from tsconfig.json:files; -run"
expect='Hello world'
actual=$("$estrella" "-outfile=../$outfile" -quiet -run -no-diag)
if [[ "$actual" != "$expect" ]]; then
  _fail "Unexpected output (-run). Expected [$expect] but got [$actual]"
fi
echo "PASS"
popd >/dev/null


pushd ts-include >/dev/null
_test "(ts-include) infile inference from tsconfig.json:include (glob); -run"
expect='Hello world'
actual=$("$estrella" "-outfile=../$outfile" -quiet -run -no-diag)
if [[ "$actual" != "$expect" ]]; then
  _fail "Unexpected output (-run). Expected [$expect] but got [$actual]"
fi
echo "PASS"
popd >/dev/null


pushd ts-diag >/dev/null

_test "(ts-diag) infile inference from tsconfig.json:files; -diag should report an error"
expect="TS2304: Cannot find name 'not_exist'"
actual=$("$estrella" -diag 2>&1)
if [[ "$actual" != *"$expect"* ]]; then
  _fail "Unexpected output (-run). Expected [*${expect}*] but got [$actual]"
fi
echo "PASS"
popd >/dev/null

