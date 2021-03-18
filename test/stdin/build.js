#!/usr/bin/env node

const fs = require('fs')
const { build } = require('estrella')

const incoming = fs.readFileSync(0, 'utf-8')

build({
  stdin: {
    contents: incoming,
    sourcefile: 'stdin'
  },
  outfile: 'out/main.js',
})
