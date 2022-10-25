#!/bin/bash -e
cd "$(dirname "$0")"

rm -rf node_modules
mkdir -p node_modules
ln -s ../../..                       node_modules/estrella

OUT=`node --unhandled-rejections=strict -r 'estrella/register' entry.ts`

if [ "$OUT" != "hello world" ]; then
	echo "FAIL: register didn't work." >&2
	exit 1
fi
