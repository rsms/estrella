// Reference:
// https://github.com/swc-project/swc-node/blob/master/packages/register/register.ts

import esbuild from "esbuild";
import Module from "module";
import sourceMapSupport from "source-map-support";

const Sourcemaps = new Map();

sourceMapSupport.install({
  handleUncaughtExceptions: false,
  environment: "node",
  retrieveSourceMap(file) {
    if (Sourcemaps.has(file)) {
      return {
        url: file,
        map: Sourcemaps.get(file),
      };
    }
    return null;
  },
});

function compileTs(sourcecode, filename) {
  if (filename.endsWith(".d.ts")) {
    return "";
  }

  const { code, map } = esbuild.transformSync(sourcecode, {
    format: "cjs",
    sourcefile: filename,
    minify: false,
    loader: filename.split(".").reverse()[0],
    sourcemap: true,
  });
  Sourcemaps.set(filename, map);

  return code;
}

// Reference:
// https://github.com/danez/pirates/blob/main/src/index.js
const jsLoader = Module["_extensions"][".js"];

for (const ext of [".ts", ".tsx"]) {
  Module["_extensions"][ext] = function newLoader(mod, filename) {
    const oldCompile = mod._compile;
    mod._compile = function newCompile(code) {
      const newCode = compileTs(code, filename);
      mod._compile = oldCompile;
      return mod._compile(newCode, filename);
    };
    jsLoader(mod, filename);
  };
}
