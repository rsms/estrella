<img src="misc/estrella-logo.png" width="320" align="center">

Estrella is a lightweight and versatile build tool based on the fantastic
[esbuild](https://github.com/evanw/esbuild) TypeScript and JavaScript compiler.

- Rebuild automatically when source files change
- Build multiple projects at once, in parallel
- TypeScript diagnostics run in parallel
- TypeScript diagnostics are optional even for TypeScript projects
- Ability to remap TSXXXX TypeScript diagnostic severity levels, for example to
  treat some issues as warnings instead of errors
- Scriptable — run any JavaScript you want as part of your build process
- Can run your program automatically when it's rebuilt
- [Well-tested](https://github.com/rsms/estrella/tree/master/test) code
- Fast!

See [estrella.d.ts](estrella.d.ts) for API documentation.

Estrella tries hard to retain the blazing startup speed of esbuild.
Being just a single file, with only a dependency on esbuild,
estrella starts very quickly.
`time estrella -help` completes in about 50ms with NodeJS 12.
Building a simple example with `time examples/minimal/build.js` completes in about 65ms.

Unlike some other "builders" Estrella does not use a config file or require you to make changes
to your package.json file. Instead, Estrella recognizes & embraces the fact that most projects
have unique build requirements. You run Estrella from a script (instead of Estrella running a
script or config file.) Essentially you create a "build.js",
or lolcat.js—name it whatever you want—script in which you invoke estrella. This turns your script
into a fully-features CLI program with access to a
[rich API exposed by the estrella module](estrella.d.ts).


## Example use

1. Add Estrella to your project: `npm install -D estrella`
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

See [evanw/esbuild/lib/types.ts](https://github.com/evanw/esbuild/blob/master/lib/types.ts)
for documentation of esbuild options.


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
This way there is no hard dependency on typescript for estrella.

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


## Examples and feature documentation


### Your build script becomes a CLI program

When using estrella as a library from a build script, your build script becomes a program
with command-line options:

```txt
$ ./build.js -help
usage: ./build.js [options]
options:
  -w, -watch         Watch source files for changes and rebuild.
  -g, -debug         Do not optimize and define DEBUG=true.
  -r, -run           Run the output file after a successful build.
  -sourcemap         Generate sourcemap.
  -inline-sourcemap  Generate inline sourcemap.
  -no-color          Disable use of colors.
  -no-clear          Disable clearing of the screen, regardless of TTY status.
  -no-diag           Disable TypeScript diagnostics.
  -color             Color terminal output, regardless of TTY status.
  -diag              Only run TypeScript diagnostics (no esbuild.)
  -quiet             Only log warnings and errors but nothing else.
  -silent            Don't log anything, not even errors.
  -estrella-version  Print version of estrella and exit 0.
  -estrella-debug    Enable debug logging of estrella itself.
```

You can define your own custom CLI options and parse arbitrary arguments using the `cliopts` object
exported by the estrella module:

```js
#!/usr/bin/env node
const { build, cliopts, file } = require("estrella")
const [ opts, args ] = cliopts.parse(
  ["c, cat" , "Prints a nice cat."],
  ["file"   , "Show contents of <file>.", "<file>"],
)
opts.cat && console.log(stdoutStyle.pink(ASCII_cat))
if (opts.file) {
  console.log(`contents of file ${opts.file}:`)
  console.log(await file.read(opts.file, "utf8"))
}
build({ ... })
```

Ask for help to see your options documented:

```
./build.js -h
usage: ./build.js [options]
options:
  [...common estrella options here...]
  -c, -cat           Prints a nice cat.
  -file=<file>       Show contents of <file>.
```

For a full example, see [examples/custom-cli-options](examples/custom-cli-options)



### Watching source files for changes

One of the key features of Estrella is its ability to watch source files for changes and rebuild
only the products needed. It does this in cooperation with esbuild which provides "perfect"
information about the source file graph for a given build product (via esbuild.metafile).
Estrella then uses this information to watch the relevant source files for changes and trigger a
rebuild. Either set `watch` in your config or pass `-watch` on the command line:

```
$ ./build.js -watch
Wrote out/main.js (341B, 8.03ms)
Watching files for changes...

# [make an edit to a source file]
1 file changed: foo.ts
Wrote out/main.js (341B, 10.18ms)
...
```


### Running your program

Estrella can run and manage sub processes, making it easy to run and restart your program
upon a successful build. Simply set `run` in your config or pass `-run` on the command line:

```
$ ./build.js -run
Hello world
```

Combining `-run` with `-watch` makes for a powerful "exploratory programming" setup where
changes to your source files are compiled and the results of running the program shown.

```
$ ./build.js -watch -run
Wrote out/main.js (341B, 8.21ms)
Running out/main.js [98609]
Hello world
out/main.js exited (0)

# [make an edit to a source file]
1 file changed: message.ts
Wrote out/main.js (341B, 8.21ms)
Running out/main.js [98609]
Hello future
```

Estrella is good at handling processes and can make a few valuable guarantees:

- A running process is always terminated before Estrella terminates.
  The only exception to this is if the estrella process is killed with an uncapturable signal
  like SIGKILL.
- A running process that is restarted is always terminates before a new instance is launched.
  This is important if your program relies on exclusive access to resources like TCP ports or
  UNIX sockets.
- Secondary subprocesses spawned by a running process are always terminated when the process
  Estrella controls is terminated. This guarantee only applies to OSes that support signaling
  process groups (most POSIX OSes like Linux, macOS, BSD, etc.)

"run" can be configured to run arbitrary commands by specifying `run` in your config.

Examples: (effective process invocation in comment)

```js
// build config               // effective program invocation
run: true                     // [node, outfile] (same as `-run` on the command line)
run: ["deno", "file name.js"] // ["deno", "file name.js"]
run: "./prettier foo.js"      // runs script "./prettier foo.js" in a shell
```

When `run` is set in your config, the product will be run no matter how you invoke your build
script. If you want to execute a more complex command that just `node outfile` while still
only running it when `-run` is passed on the command line, conditionally enable `run` in your
build script like this:

```js
#!/usr/bin/env node
const { build, cliopts } = require("estrella")
const p = build({
  entry: "main.ts",
  outfile: "out/main.js",
  run: cliopts.run && ["/bin/zsh", "-e", "-c", "echo **/*.ts"],
})
```

`./build.js -run` will run your command as specified
while simply `./build.js` won't cause the program to run.



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

TypeScript diagnostics are run for all unique tsconfig.json files
(or project directory in the absence of a tsconfig.json file), so in this case we get just
one report, as is expected.

In fact, since estrella is just a simple library, you can really do whatever you want
in your build script.



### Pre-processing and post-processing

Setting `onStart` and/or `onEnd` in a build config allows you to hook into the esbuild cycle.
`onStart(config, changedFiles)` is called when a build starts and `onEnd(config, result)`
when a build finishes.
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
const { build, scandir, watch, cliopts } = require("estrella")

build({
  entry: "src/main.ts",
  outfile: "out/foo.js",
})

function generateCode(file) {
  console.log(`generate ${file} -> ${file}.js`)
  // replace with actual logic
}

// generate all files initially
const dir = "src", filter = /\..*$/i
scandir(dir, filter, {recursive:true}).then(files => {
  files.map(generateCode)
  // in watch mode, generate files as they change
  cliopts.watch && watch(dir, {filter, recursive:true}, changes => {
    changes.map(c => generateCode(c.name))
  })
})
```


### Running a livereload web server

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
  -w, -watch           Watch source files for changes and rebuild.
  -g, -debug           Do not optimize and define DEBUG=true.
  -r, -run             Run the output file after a successful build.
  -sourcemap           Generate sourcemap.
  -inline-sourcemap    Generate inline sourcemap.
  -no-color            Disable use of colors.
  -no-clear            Disable clearing of the screen, regardless of TTY status.
  -no-diag             Disable TypeScript diagnostics.
  -color               Color terminal output, regardless of TTY status.
  -diag                Only run TypeScript diagnostics (no esbuild.)
  -quiet               Only log warnings and errors but nothing else.
  -silent              Don't log anything, not even errors.
  -estrella-version    Print version of estrella and exit 0.
  -estrella-debug      Enable debug logging of estrella itself.
  -o=,-outfile=<file>  Write output to <file> instead of stdout.
  -bundle              Include all dependencies.
  -minify              Simplify and compress generated code.
  -outdir=<dir>        Write output to <dir> instead of stdout.
  -esbuild=<json>      Pass arbitrary JSON to esbuild's build function.

<srcfile> is a filename, or "-" for stdin.
```

See `estrella -h` for more details.


### Developing for Estrella

Like any respectable compiler, Estrella of course builds itself.

Setup instructions:

```
git clone https://github.com/rsms/estrella.git
cd estrella
npm install
```

Build instructions:

- Build debug products: `./build.js -g` (add `-w` for incremental compilation)
- Build release products: `./build.js` (add `-w` for incremental compilation)
- Build release products and run all tests: `./test/test.sh` (or `npm test`)
- Build debug products and run all tests: `./test/test.sh -debug`



### Contributing to Estrella

Contributions are very welcome!
When contributing, please follow these guidelines:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

Types of contributions and how best to make them:

- **Proposal for a new feature:**
  [Open an issue and start a conversion.](https://github.com/rsms/estrella/issues)
  Please do not create a PR until we've had time to discuss how to best approach the change.

- **Fix for a bug:**
  [Please open a PR with your fix](https://github.com/rsms/estrella/pulls)
  and if you can, include a test that fails without your change but passes with it.

- **Minor changes like spelling mistakes:**
  [Open an issue](https://github.com/rsms/estrella/issues) and point out the concern.
  Please do not create a PR for small things like spelling mistakes.

Thank you for being a great person & contributor!
