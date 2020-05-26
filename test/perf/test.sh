#!/bin/bash -e
cd "$(dirname "$0")"

node --unhandled-rejections=strict test-startup-perf.js
