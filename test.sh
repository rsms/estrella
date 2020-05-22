#!/bin/bash -e
#
# usage: test.sh [-debug] [<testdir> ...]
#
cd "$(dirname "$0")"

DEBUG=false
ESTRELLA_BUILD_ARGS=()
ESTRELLA_PROG=estrella.js
if [ "$1" == "-debug" ]; then
  shift
  DEBUG=true
  ESTRELLA_PROG=estrella.g.js
  ESTRELLA_BUILD_ARGS+=( -estrella-debug )
fi


# first build estrella
if $DEBUG; then
  echo "Building estrella in debug mode"
  ./build.js -g
else
  echo "Building estrella in release mode"
  ./build.js
fi


function fn_test_example {
  d=$1
  echo "-----------------------------------------------------"
  echo ">>> $d"
  pushd "$d" >/dev/null

  # link local debug version of estrella into node_modules
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


if [ $# -gt 0 ]; then
  # run tests provided as dirnames to argv
  for d in "$@"; do
    if ! [ -d "$d" ]; then
      echo "$0: '$d' is not a directory" >&2
      exit 1
    fi
    fn_test_example "$d"
  done
else
  # run all tests
  for d in examples/*; do
    if [ -d "$d" ] && [[ "$d" != "."* ]]; then
      fn_test_example "$d"
    fi
  done

  # build examples/minimal using the direct CLI
  echo "-----------------------------------------------------"
  echo ">>> direct cli build of examples/minimal"
  pushd minimal >/dev/null
  ./node_modules/estrella "${ESTRELLA_BUILD_ARGS[@]}" -o out/main.js main.ts
  node out/main.js
fi
