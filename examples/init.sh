#!/bin/bash -e
for d in *; do
  if [ -f "$d/build.js" ]; then
    pushd "$d" >/dev/null
    mkdir -p node_modules/estrella
    ln -s ../../../dist/estrella.js node_modules/estrella/index.js
    popd >/dev/null
  fi
done
