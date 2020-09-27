#!/bin/bash -e
cd "$(dirname "$0")"

rm -rf node_modules
mkdir -p node_modules
ln -s ../../..                       node_modules/estrella
ln -s ../../../node_modules/esbuild  node_modules/esbuild

export ESTRELLA_TEST_VERBOSE=$ESTRELLA_TEST_VERBOSE
if [ "$1" == "-verbose" ]; then
  export ESTRELLA_TEST_VERBOSE=1
fi

node build.js

for f in test-*.js; do
  echo "running $f"
  node --unhandled-rejections=strict "$f"
done
