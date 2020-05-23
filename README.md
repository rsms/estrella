<img src="misc/estrella-logo.png" width="320" align="center">

Estrella is a light-weight runner for the fantastic
[esbuild](https://github.com/evanw/esbuild) TypeScript and JavaScript compiler.

- Watch file system for changes and rebuild automatically.
- TypeScript diagnostics run in parallel.
- Can build multiple projects at once, in parallel.
- Scriptable: invoke from your own build script with any imaginable customizations.
- Ability to remap TSXXXX TypeScript diagnostic severity levels, for example to
  treat some issues as warnings instead of errors.

See [estrella.d.ts](estrella.d.ts) for API documentation.


## Example use

1. Add to your project with `npm install -D estrella`
2. Create a `build.js` file in your project directory:

```js
#!/usr/bin/env node
const { build } = require("estrella")
build({
  entry: "src/main.ts",
  outfile: "out/foo.js",
  bundle: true,
  // pass any options to esbuild here...
})
```

Invoke your build script: (assumes `chmod +x build.js` has been set)

```txt
$ ./build.js -watch
Wrote out/foo.js (419 bytes, 6.84ms)
Watching files for changes...
```

And that's it for basic use.

[See the `examples` directory](examples) for more examples
which you can use as templates for new projects.


## TypeScript diagnostics

If there is a tsconfig.json file in the project directory,
or if `build({tsc:true})` is set,
TypeScript's `tsc` is run in parallel to esbuild, checking types and providing diagnostics:

```txt
$ ./build.js
Wrote out/foo.js (419 bytes, 7.11ms)
src/main.ts:2:7 - warning TS6133: 'count' is declared but its value is never read.

2   let count = 4
        ~~~~~

TS: OK   1 warning
```

What `tsc` program is run? estrella will ask nodejs to find typescript in node_modules.
If found, `tsc` from that package is used. Otherwise, `tsc` from the environment PATH is used.
This way there is no hard dependeny on typescript for estrella.

estrella allows remapping the severity of TypeScript diagnostics and even filtering
things out completely.
This is particularly useful when you are converting a codebase to a stricter set of rules
but don't want your build to fail. For example, let's say that you enable `noImplicitAny` in
your tsconfig.json file. If you just run `tsc` on your project, it will fail with errors.
Using estrella these errors can be treated as warnings instead, still making a loud
appearance on screen but not causing an error exit code.

```txt
$ ./build.js
Wrote out/foo.js (14.6kb, 11.07ms)
src/main.ts:212:24 - error TS7006: Parameter 'ev' implicitly has an 'any' type.

212   window.onmousemove = ev => { grid.origin = [ev.clientX, ev.clientY] }
                           ~~
TS: 1 error
$ echo $?
1
```

To make this a warning, add a rule to `build()` in your build script:

```js
#!/usr/bin/env node
const { build } = require("estrella")
build({
  entry: "src/main.ts",
  outfile: "out/foo.js",
  bundle: true,
  tsrules: {
    7006: "WARNING",
  }
})
```

Now if we try to build again:

```txt
$ ./build.js
Wrote out/foo.js (14.6kb, 10.42ms)
src/main.ts:212:24 - warning TS7006: Parameter 'ev' implicitly has an 'any' type.

212   window.onmousemove = ev => { grid.origin = [ev.clientX, ev.clientY] }
                           ~~
TS: OK   1 warning
$ echo $?
0
```

The program exits successfully while still logging the issue.

`tsrules` is an object of type `{ [tscode:number] : "IGNORE"|"INFO"|"WARN"|"ERROR" }` which
maps TS diagnostic codes to:

- `"IGNORE"` completely ignore and don't even log it.
- `"INFO"` log it as information, unless the -quiet flag is set.
- `"WARN"` log it as a warning
- `"ERROR"` log it as an error, causing the program's exit code to be !0.

`"ERROR"` is the default for most issues.
Too list predefined tsrules, run: `node -p 'require("estrella").defaultTSRules'`.
Rules which you provide take precedence, so if there are any predefined rules you'd
like to change, simply set those in your `tsrules` object.


## Other uses

### Your build script becomes a CLI program

When using estrella as a library from a build script, your build script becomes a program
with command-line options:

```txt
$ ./build.js -help
usage: ./build.js [options]
options:
  -w, -watch          Watch source files for changes and rebuild.
  -g, -debug          Do not optimize and define DEBUG=true.
  -sourcemap          Generate sourcemap.
  -inline-sourcemap   Generate inline sourcemap.
  -color              Color terminal output, regardless of TTY status.
  -no-color           Disable use of colors.
  -no-clear           Disable clearing of the screen, regardless of TTY status.
  -no-diag            Disable TypeScript diagnostics.
  -diag               Only run TypeScript diagnostics (no esbuild.)
  -quiet              Only log warnings and errors but nothing else.
  -h, -help           Print help to stderr and exit 0.
```


### Building multiple products at once

estrella can build multiple variants of your program at once.
Example `build.js` script:

```js
#!/usr/bin/env node
const { build } = require("estrella")
const common = {
  entry: "src/main.ts",
  bundle: true,
}
build({
  ...common,
  outfile: "out/foo.min.js",
})
build({
  ...common,
  outfile: "out/foo.debug.js",
  sourcemap: true,
  debug: true,
})
```

Then run the script to build both an optimized product and a debug product:

```txt
$ ./build.js
Wrote out/foo.min.js (445 bytes, 6.67ms)
Wrote out/foo.debug.{js,js.map} (2.4kb, 10.59ms)
TS: OK
```

TypeScript diagnostics are run for all unique entry points, so in this case we get just
one report, as is expected.

In fact, since estrella is just a simple library, you can really do whatever you want
in your build script.


### Pre-processing and post-processing

Setting `onStart` and/or `onEnd` in a build config allows you to hook into the esbuild cycle.
`onStart(config)` is called when a build starts and `onEnd(config, result)` when a build finishes.
This works in both `-watch` mode and regular "one shot" mode.

These callbacks can optionally be async (i.e. return a Promise) which estrella will await.
This gives you the ability to perform detailed pre-processing and post-processing,
like requesting some stuff from the internet.

Example build script using `onEnd` to show desktop notifications with
[node-notifier](https://github.com/mikaelbr/node-notifier) in watch mode:

```js
#!/usr/bin/env node
const { build } = require("estrella")
const notifier = require("node-notifier")
build({
  entry: "src/main.ts",
  outfile: "out/foo.js",
  onEnd(config, result) {
    config.watch && notifier.notify({
      title: config.title,
      message: result.errors.length > 0 ?
        `Build failed with ${result.errors.length} errors` :
        `Build succeeded`
    })
  },
})
```



### Watching arbitrary files for changes

estrella comes with functions for scanning and watching any files or directories for changes,
making it easy to work with other source files not handled by esbuild.
Like for example CSS or code generation.

Example build script:

```js
#!/usr/bin/env node
const { build, scandir, watchdir, cliopts } = require("estrella")

build({
  entry: "src/main.ts",
  outfile: "out/foo.js",
})

function generateCode(file) {
  console.log(`generate ${file} -> ${file}.js`)
  // replace with actual logic
}

// generate all files initially
const dir = "src", filter = /\..*$/i, options = {recursive:true}
scandir(dir, filter, options).then(files => {
  files.map(generateCode)
  // in watch mode, generate files as they change
  cliopts.watch && watchdir(dir, filter, options, files => {
    files.map(generateCode)
  })
})
```


### Running a livereload webserver

Say you are building a website. You may want to run a HTTP server while in watch mode
which automatically reloads your website as you develop it.
Simply run a web server like [serve-http](https://www.npmjs.com/package/serve-http)
in your build script:

```js
#!/usr/bin/env node
const { build, cliopts } = require("estrella")
build({
  entry: "src/main.ts",
  outfile: "docs/app.js",
})
// Run a local web server with livereload when -watch is set
cliopts.watch && require("serve-http").createServer({
  port: 8181,
  pubdir: require("path").join(__dirname, "docs"),
})
```

Now when you run your build script in watch mode a web server is run as well:

```txt
$ ./build.js -w
serving ./ at http://localhost:8181/
Wrote docs/app.js (914 bytes, 12.44ms)
TS: OK
```


### estrella as a program

estrella can also be used directly as a program:

```txt
$ estrella src/foo.ts -o foo.js
Wrote foo.js (222 bytes, 7.91ms)
TS: OK
```

```txt
$ estrella -h
usage: estrella [options] <srcfile> ...
options:
  -w, -watch          Watch source files for changes and rebuild.
  -g, -debug          Do not optimize and define DEBUG=true.
  -sourcemap          Generate sourcemap.
  -inline-sourcemap   Generate inline sourcemap.
  -color              Color terminal output, regardless of TTY status.
  -no-color           Disable use of colors.
  -no-clear           Disable clearing of the screen, regardless of TTY status.
  -no-diag            Disable TypeScript diagnostics.
  -diag               Only run TypeScript diagnostics (no esbuild.)
  -quiet              Only log warnings and errors but nothing else.
  -h, -help           Print help to stderr and exit 0.
  -bundle             Bundle all dependencies into the output files.
  -minify             Simplify and compress generated code.
  -o, -outfile <file> Write output to <file> instead of stdout.
  -outdir <dir>       Write output to <dir> instead of stdout.
```
