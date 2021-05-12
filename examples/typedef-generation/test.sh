#!/bin/sh
set -e
rm -rf out
./build.js -no-diag
head -n3 out/main.d.ts
