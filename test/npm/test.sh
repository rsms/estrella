#!/bin/bash -e
#
# This test...
# 1. Packages the estrella npm module (using npm pack => ARCHIVE_FILE)
# 2. Creates a temporary directory outside the estrella src dir
# 3. Creates a new npm project and installs estrella (using npm install ARCHIVE_FILE)
# 4. Generates some source code an run a bunch of tests
#
# This verifies that the npm distribution of estrella works as intended.
#
cd "$(dirname "$0")"

KEEP_TEMP_DIR=false
VERBOSE=false

export ESTRELLA_TEST_VERBOSE=$ESTRELLA_TEST_VERBOSE
if [ "$1" == "-verbose" ]; then
  export ESTRELLA_TEST_VERBOSE=1
fi
if [[ "$ESTRELLA_TEST_VERBOSE" != "" ]]; then
  VERBOSE=true
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
  -keep-tempdir|--keep-tempdir)
    KEEP_TEMP_DIR=true ; shift
    ;;
  -verbose|--verbose)
    VERBOSE=true ; shift
    ;;
  -o|-output|--output)
    if [[ "$2" == "-"* ]]; then
      echo "Missing value for option $1" >&2
      _usage
    fi
    OUTFILE=$2
    shift ; shift
    ;;
  -h|-help|--help)
    echo "usage: $0 [options]"
    echo "options:"
    echo "-keep-tempdir  Don't remove the temporary working directory after finishing."
    echo "-verbose       Verbose logging."
    echo "-h, -help      Print help to stdout and exit."
    exit 0
    ;;
  *)
    echo "$0: Unknown command or option $1 (see $0 -help)" >&2
    exit 1
    ;;
  esac
done


function fail {
  msg=$1 ; shift
  echo "FAIL $msg" >&2
  for line in "$@"; do
    echo "$line" >&2
  done
  exit 1
}

function assertEq {
  actual=$1
  expect=$2
  message=$3
  if [[ "$actual" != "$expect" ]]; then
    if [ -z "$message" ]; then
      message="Assertion error"
    fi
    fail "$message; expected result:" \
         "'$expect'" \
         "-----------------------------------------" \
         "actual result:" \
         "'$actual'" \
         "-----------------------------------------"
  fi
}

rmfilesAtExit=()
pidsToSigtermAtExit=()
function _atexit {
  for f in "${rmfilesAtExit[@]}"; do
    # echo "rm -rf '$f'"
    rm -rf "$f"
  done
  for pid in "${pidsToSigtermAtExit[@]}"; do
    # echo "kill -s TERM $pid"
    kill -s TERM "$pid"
  done
}
trap _atexit EXIT
trap exit SIGINT  # make sure we can ctrl-c in loops

pushd ../.. >/dev/null
ESTRELLA_ROOTDIR=$PWD
popd >/dev/null

echo "$ npm pack '$ESTRELLA_ROOTDIR'"
PACKAGE_ARCHIVE_FILE=$PWD/$(npm --quiet pack "$ESTRELLA_ROOTDIR")
echo "$PACKAGE_ARCHIVE_FILE"
rmfilesAtExit+=( "$PACKAGE_ARCHIVE_FILE" )
# Note: tar -xzf estrella-1.2.5.tgz  # => "package" dir

TEMP_DIR=$(realpath "$TMPDIR")/estrella-test-npm
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"
echo "using tempdir $TEMP_DIR"
if ! $KEEP_TEMP_DIR; then
  rmfilesAtExit+=( "$TEMP_DIR" )
fi
pushd "$TEMP_DIR" >/dev/null

# Rather than 'npm init --yes' write package.json manually so we can include
# fields which npm install otherwise complains about to stderr.
cat <<_JSON_ > package.json
{
  "name": "estrella-test-npm",
  "version": "1.0.0",
  "description": "test",
  "repository": "https://example.com",
  "main": "main.js",
  "keywords": [],
  "author": "estrella",
  "license": "ISC"
}
_JSON_

echo "$ npm install -D '$PACKAGE_ARCHIVE_FILE'"
if $VERBOSE; then
  npm  install -D "$PACKAGE_ARCHIVE_FILE"
else
  npm --quiet install -D "$PACKAGE_ARCHIVE_FILE" >/dev/null
fi

cat <<_JS_ > build.js
const { build } = require("estrella")
build({
  entry: "main.ts",
  outfile: "main.js",
})
_JS_

cat <<_JS_ > main.ts
console.log("hello world")
_JS_

echo "$ node build.js"
node build.js

echo "$ node main.js"
assertEq "$(node main.js)" "hello world"


# test watch, which loads a separate module
echo "console.log('hello1')" > main.ts
echo "$ node build.js -w -no-clear"
node build.js -w -no-clear &
watch_pid=$!
pidsToSigtermAtExit+=( $watch_pid )

sleep 0.5
echo "$ node main.js"
assertEq "$(node main.js)" "hello1"

echo "console.log('hello2')" > main.ts
sleep 0.5
echo "$ node main.js"
assertEq "$(node main.js)" "hello2"


# test run
echo "$ node build.js -quiet -run"
assertEq "$(node build.js -quiet -run)" "hello2"


# test typescript
echo "$ npm install -D 'typescript'"
if $VERBOSE; then
  npm install -D "typescript"
else
  npm --quiet install -D "typescript" >/dev/null
fi
cat <<_JSON_ > tsconfig.json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "target": "es2017",
  },
  "files": [ "main.ts" ]
}
_JSON_


# typecript should detect & warn about unused variable
echo "function a() { let unused = 1 } a()" > main.ts
echo "$ node build.js -diag"
output=$(node build.js -diag)
if [[ "$output" != *"TS6133:"* ]]; then
  fail "expected *TS6133:* but got:" \
       "$output"
fi


echo "OK"
