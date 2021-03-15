#!/bin/bash
#
# usage: test.sh [-debug] [<testdir> ...]
#
# environment variables:
#   ESTRELLA_TEST_VERBOSE
#   If set to any value, some tests will log details
#
cd "$(dirname "$0")/.."
set -e

DEBUG=false
ESTRELLA_BUILD_ARGS=()
ESTRELLA_PROG=estrella.js
if [ "$1" == "-debug" ]; then
  shift
  DEBUG=true
  ESTRELLA_PROG=estrella.g.js
  ESTRELLA_BUILD_ARGS+=( -estrella-debug )
fi
export ESTRELLA_PROGAM=$PWD/dist/$ESTRELLA_PROG


# first build estrella
BUILD_OK=false
if $DEBUG; then
  echo "Building estrella in debug mode"
  if ./build.js -g ; then
    BUILD_OK=true
  fi
else
  echo "Building estrella in release mode"
  if ./build.js ; then
    BUILD_OK=true
  fi
fi
if ! $BUILD_OK; then
  echo "building with dist/estrella.js failed."
  echo "Attempt rescue build?"
  echo "  y = attempt resuce build"
  echo "  r = revert to last git version of dist/estrella.js"
  echo "  * = cancel & exit"
  echo -n "[Y/r/n] "
  read ANSWER
  if [[ "$ANSWER" == "" ]] || [[ "$ANSWER" == "y"* ]]; then
    echo "Running bash misc/rescue.sh"
    bash misc/rescue.sh
  elif [[ "$ANSWER" == "r"* ]]; then
    echo "Running git checkout -- dist/estrella.js dist/estrella.g.js"
    git checkout -- dist/estrella.js dist/estrella.g.js
  else
    exit 1
  fi
  echo "Retrying with new build and argument -estrella-debug"
  if $DEBUG; then
    ./build.js -g -estrella-debug
  else
    ./build.js -estrella-debug
  fi
fi


function fn_test_example {
  d=$1
  echo "———————————————————————————————————————————————————————————————————————"
  echo "$d"
  if [ -f "$d/NO_TEST" ]; then
    echo "SKIP (found NO_TEST file)"
    return 0
  fi
  pushd "$d" >/dev/null

  # link local debug version of estrella into node_modules
  rm -rf node_modules
  if [ -f package.json ]; then
    npm install >/dev/null 2>&1
  fi
  mkdir -p node_modules
  rm -rf node_modules/estrella
  pushd node_modules >/dev/null
  ln -s ../../../dist/$ESTRELLA_PROG estrella
  popd >/dev/null

  # build example, assuming ./out is the product output directory
  rm -rf out
  ./build.js "${ESTRELLA_BUILD_ARGS[@]}"

  # assume first js file in out/*.js is the build product
  for f in out/*.js; do
    if [ -f "$f" ]; then
      node "$f"
    fi
    break
  done

  # # extract outfile from build script
  # outfile=$(node -p 'const m = /\boutfile:\s*("[^"]+"|'"'"'[^\'"'"']+\'"'"')/.exec(require("fs").readFileSync("build.js", "utf8")) ; (m ? JSON.parse(m[1] || m[1]) : "")')
  # if [ "$outfile" != "" ]; then
  #   node "$outfile"
  # else
  #   echo "Can not find outfile for example $PWD" >&2
  # fi

  popd >/dev/null
}

FAILED=true
function _atexit {
  if $FAILED; then
    echo "FAIL" >&2
  fi
}
trap _atexit EXIT
trap exit SIGINT


if [ $# -gt 0 ]; then
  # only run tests provided as dirnames to argv
  for d in "$@"; do
    if ! [ -d "$d" ]; then
      echo "$0: '$d' is not a directory" >&2
      exit 1
    fi
    if [[ "$d" == "examples/"* ]]; then
      fn_test_example "$d"
    else
      echo "———————————————————————————————————————————————————————————————————————"
      echo "$d"
      "$d/test.sh"
    fi
  done
  exit 0
fi


# run all tests

for d in test/*; do
  if [ -d "$d" ] && [[ "$d" != "."* ]]; then
    if [ -f "$d/test.sh" ]; then
      echo "———————————————————————————————————————————————————————————————————————"
      echo "$d"
      "$d/test.sh"
    else
      echo "$0: $d/test.sh not found -- ignoring" >&2
    fi
  fi
done

for d in examples/*; do
  if [ -d "$d" ] && [[ "$d" != "."* ]]; then
    fn_test_example "$d"
  fi
done


# # build examples/minimal using the direct CLI
# # TODO: move into test dir (like test/types)
# echo "———————————————————————————————————————————————————————————————————————"
# echo ">>> direct cli build of examples/minimal"
# pushd examples/minimal >/dev/null
# ./node_modules/estrella "${ESTRELLA_BUILD_ARGS[@]}" -o out/main.js main.ts
# node out/main.js
# popd >/dev/null

FAILED=false
echo "ALL PASS OK"
