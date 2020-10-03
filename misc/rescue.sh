#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

export PATH=$PWD/node_modules/.bin:$PATH

esbuild \
  --platform=node \
  --minify-whitespace \
  --bundle \
  --sourcemap \
  --outfile=dist/estrella.js \
  --external:esbuild \
  --external:fsevents \
  --external:typescript \
  --define:DEBUG=1 \
  --define:VERSION='"0.0.0-rescue"' \
  src/estrella.js

esbuild \
  --platform=node \
  --minify-whitespace \
  --bundle \
  --sourcemap \
  --outfile=dist/debug.js \
  --external:esbuild \
  --external:fsevents \
  --external:typescript \
  --define:DEBUG=1 \
  --define:VERSION='"0.0.0-rescue"' \
  src/debug/debug.ts

esbuild \
  --platform=node \
  --minify-whitespace \
  --bundle \
  --sourcemap \
  --outfile=dist/watch.js \
  --external:esbuild \
  --external:fsevents \
  --external:typescript \
  --define:DEBUG=1 \
  --define:VERSION='"0.0.0-rescue"' \
  src/watch/watch.ts

chmod +x dist/estrella.js
echo 'Wrote to dist/'
