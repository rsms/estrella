#!/bin/bash -e
cd "$(dirname "$0")"

rm -rf node_modules
mkdir -p node_modules
ln -s ../../..                       node_modules/estrella
ln -s ../../../node_modules/esbuild  node_modules/esbuild
if ! (which tsc >/dev/null); then
  echo "tsc not found in PATH -- installing temporarily in $PWD"
  npm install --no-save typescript 2>/dev/null
  PATH=$PWD/node_modules/.bin:$PATH
fi
tsc -p .
echo "OK"
