# Developing and building Estrella itself

TL;DR

```txt
git clone https://github.com/rsms/estrella.git
cd estrella
npm install
./build.js -gw
```

Requirements:

- Posix system (i.e. macOS, Linux, Windows WSL or Cygwin)
  It might build fine in other environments.
  If you try and it works, please let me know.
- NodeJS version 10.10.0 or later (10.10.0 introduces mkdir -p, used in tests)
- Bash version 2 or later (for testing)

Files:

- [`src`](src) contains estrella source files.
- [`test`](test) contains directories which each is one unit test.
- [`examples`](examples) contains directories of various example setups with estrella.
   These are also built as part of the test suite.
- [`dist`](dist) is the output directory of builds.
- [`misc`](misc) houses scripts and dev tools. You can ignore this.

Testing:

- Run all tests with `./test/test.sh`
- Run one or more specific tests with `./test/test.sh test/watchdir examples/minimal`

Notes:

- After cloning or pulling in changes from git, run `npm install`.
- Estrella builds itself: `./build.js` runs AND produces `dist/estrella.js`.
- If you break `dist/estrella.js`, just `git checkout dist/estrella.js` and
  run `./build.js` again. Alternatively `npm run build-rescue` which uses vanilla esbuild.
- Debug builds are built with `./build.js -g` producing `dist/estrella.g.js`.
