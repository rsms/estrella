#!/bin/bash -e
cd "$(dirname "$0")"

rm -rf node_modules
mkdir -p node_modules
ln -s ../../..                       node_modules/estrella
ln -s ../../../node_modules/esbuild  node_modules/esbuild

export ESTRELLA_TEST_VERBOSE=0
if [ "$1" == "-verbose" ]; then
  export ESTRELLA_TEST_VERBOSE=1
fi

echo test-cli.js ; node test-cli.js
echo test-api.js ; node test-api.js
