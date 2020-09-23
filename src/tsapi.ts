import { json, tildePath } from "./util"
import log from "./log"
import { TypeScriptAPI, TSInterface, TSTypeProp } from "../estrella"

// hack to make tsc work vanilla with our weird srcdir-based tsconfig (needed for examples to work)
import * as TS from "../node_modules/typescript/lib/typescript.d"

// type Program = TS.Program
type CompilerOptions = TS.CompilerOptions
type InterfaceDeclaration = TS.InterfaceDeclaration
type SourceFile = TS.SourceFile

export function createTSAPI(tsapi? :typeof TS) :TypeScriptAPI | null {
  let ts = tsapi as typeof TS
  if (!ts) {
    // load typescript module if available, or return null
    log.debug("typescript API requested; attempting to load typescript module")
    try {
      const X = require  // work around an issue in esbuild with require.X()
      ts = X("typescript") as typeof TS
      if (parseFloat(ts.versionMajorMinor) < 3.5) {
        // typescript too old
        log.warn(
          `typescript ${ts.version} is too old; disabling "ts" API.\n` +
          `  You are seeing this message because you are importing the ts API.\n` +
          `  Either install a more recent version of typescript or remove the ts import.`
        )
        return null
      }
      log.debug(() =>
        `loaded typescript ${ts.version} from ${tildePath(X.resolve("typescript"))}`)
    } catch (_) {
      // API unavailable
      log.debug(() => `failed to load typescript; module unavailable`)
      return null
    }
  }

  const compilerHostCache = new Map<string,[TS.CompilerHost,CompilerOptions]>()

  function getCompilerHost(options: CompilerOptions) :[TS.CompilerHost,CompilerOptions] {
    const cacheKey = json(Object.keys(options).sort().map(k => [k,options[k]]))
    const cacheEntry = compilerHostCache.get(cacheKey)
    if (cacheEntry) {
      log.debug("ts.getCompilerHost cache hit")
      return cacheEntry
    }
    options = {
      newLine: ts.NewLineKind.LineFeed, // TS 4.0.3 crashes if not set
      ...options
    }
    const host = ts.createCompilerHost(options, /*setParentNodes*/true)
    const result :[TS.CompilerHost,CompilerOptions] = [host, options]
    compilerHostCache.set(cacheKey, result)
    log.debug("ts.getCompilerHost cache miss")
    return result
  }


  async function parse(source :string, options?: CompilerOptions) :Promise<SourceFile>

  async function parse(
    source :{[filename:string]:string},
    options?: CompilerOptions,
  ) :Promise<{[filename:string]:SourceFile}>

  async function parse(
    source :string | {[filename:string]:string},
    options?: CompilerOptions,
  ) :Promise<SourceFile|{[filename:string]:SourceFile}> {
    const sources = typeof source == "string" ? {"/<source>/a.ts":source} : source
    const filenames = Object.keys(sources)

    const [host, compilerOptions] = getCompilerHost(options||{})

    const readFile = host.readFile
    host.readFile = (filename: string) => {
      // console.log("readFile", filename)
      if (filename in sources) {
        return sources[filename]
      }
      return readFile(filename)
    }

    // This is SLOW. Usually around 500ms for even a single empty file
    const prog = ts.createProgram(filenames, compilerOptions, host)

    if (typeof source == "string") {
      return prog.getSourceFile(filenames[0])!
    }
    const nodes :{[filename:string]:SourceFile} = {}
    for (let fn of filenames) {
      nodes[fn] = prog.getSourceFile(fn)!
    }
    return nodes
  }


  async function parseFile(srcfile :string, options?: CompilerOptions) :Promise<SourceFile> {
    // TODO worker
    return _parsefile(srcfile, options)
  }


  function _parsefile(srcfile :string, options?: CompilerOptions) :SourceFile {
    const [host, compilerOptions] = getCompilerHost(options || {})
    const prog = ts.createProgram([srcfile], compilerOptions, host)
    return prog.getSourceFile(srcfile)!
  }


  function interfaceInfo(
    srcfile :string,
    interfaceName :string,
    options?: CompilerOptions,
  ) :Promise<TSInterface|null> {
    return interfacesInfo(srcfile, [interfaceName], options).then(v => v[0])
  }

  async function interfacesInfo(
    srcfile :string,
    interfaceNames :string[] | null,
    options?: CompilerOptions,
  ) :Promise<(TSInterface|null)[]> {
    // TODO move ts to subprocess/worker
    const file = _parsefile(srcfile, options)
    return interfacesInfoAST(file, interfaceNames)
  }


  function interfacesInfoAST(
    file :SourceFile,
    interfaceNames :string[] | null,
  ) :(TSInterface|null)[] {
    const ifdecls = topLevelInterfaceDeclarations(file)

    const shortCircuit = new Map<InterfaceDeclaration,TSInterface>()
    const infov :(TSInterface|null)[] = []

    for (let name of (interfaceNames || ifdecls.keys())) {
      const node = ifdecls.get(name)
      if (!node) {
        infov.push(null)
        continue
      }
      infov.push(createTSInterface(file, node, ifdecls, shortCircuit))
    }

    return infov
  }


  function createTSInterface(
    file         :SourceFile,
    ifnode       :InterfaceDeclaration,
    ifdecls      :Map<string,InterfaceDeclaration>,
    shortCircuit :Map<InterfaceDeclaration,TSInterface>,
  ) :TSInterface {
    const info1 = shortCircuit.get(ifnode)
    if (info1) {
      return info1
    }

    const info :TSInterface = {
      heritage: [],
      name:     ifnode.name.escapedText as string,
      props    :{},
      computedProps() {
        const props :{[name:string]:TSTypeProp} = {}
        for (let h of info.heritage) {
          Object.assign(props, h.props)
        }
        Object.assign(props, info.props)
        return props
      },
      lookupProp(name :string) :TSTypeProp|null {
        let p :TSTypeProp|null = info.props[name]
        if (!p) {
          for (let h of info.heritage) {
            if (p = h.lookupProp(name)) {
              break
            }
          }
        }
        return p
      },
    }

    shortCircuit.set(ifnode, info)

    // heritage types (i.e. from "Bar" in "interface Foo extends Bar")
    if (ifnode.heritageClauses) for (let hc of ifnode.heritageClauses) { // hc :HeritageClause
      for (let t of hc.types) { // t :ExpressionWithTypeArguments
        const expr = t.expression
        if (ts.isIdentifier(expr)) {
          const heritageNode = ifdecls.get(expr.escapedText as string)
          if (heritageNode) {
            info.heritage.push(createTSInterface(file, heritageNode, ifdecls, shortCircuit))
          } // else just ignore it
        }
      }
    }

    // build info.props
    ifnode.forEachChild(n => {
      if (ts.isPropertySignature(n)) {
        const prop = createTSTypeProp(n, file, info)
        info.props[prop.name] = prop
      }
    })

    return info
  }


  function createTSTypeProp(
    n :TS.PropertySignature,
    file :SourceFile,
    parent :TSInterface,
  ) :TSTypeProp {
    // console.log("PropertySignature", n.name.escapedText, n)
    const pos = ts.getLineAndCharacterOfPosition(file, n.pos)

    let _typestr :string|null = null
    const _type = n.type
    const name = propName(n.name)

    const typeprop = {
      name,
      type: _type,
      get typestr() :string {
        if (_typestr === null) {
          _typestr = _type ? fmt(_type, file) : "any"
        }
        Object.defineProperty(typeprop, "typestr", {enumerable:true, value:_typestr})
        return _typestr
      },
      srcfile: file.fileName,
      srcline: pos.line,
      srccol:  pos.character,
      parent,
    }
    return typeprop
  }


  function propName(n :TS.PropertyName) :string {
    switch (n.kind) {

    case ts.SyntaxKind.Identifier:
    case ts.SyntaxKind.PrivateIdentifier:
      return n.escapedText as string

    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NumericLiteral:
      return n.text

    case ts.SyntaxKind.ComputedPropertyName:
      // TODO printer
      return "[computed]"

    default:
      return "?"
    }
  }


  // returns all top-level interface declarations in file
  function topLevelInterfaceDeclarations(file :SourceFile) :Map<string,InterfaceDeclaration> {
    const m = new Map<string,InterfaceDeclaration>()
    ts.forEachChild(file, n => {
      if (n.kind == ts.SyntaxKind.InterfaceDeclaration) {
        m.set(
          (n as InterfaceDeclaration).name.escapedText as string,
          n as InterfaceDeclaration,
        )
      } else {
        // console.log("unhandled n in switch:", ts.SyntaxKind[n.kind])
      }
    })
    return m
  }


  const basicPrinter = ts.createPrinter({
    removeComments: true,
    newLine: ts.NewLineKind.LineFeed,
    omitTrailingSemicolon: true,
    noEmitHelpers: true,
  })


  /*EXPORT*/ function fmt(node :TS.Node, file? :SourceFile) :string {
    if (!file) {
      // find source file by walking up the AST
      let n = node
      while (n.kind != ts.SyntaxKind.SourceFile) {
        n = n.parent
        if (!n) {
          throw new Error("node without SourceFile parent (provide file to ts.fmt)")
        }
      }
      file = n as TS.SourceFile
    }
    return basicPrinter.printNode(ts.EmitHint.Unspecified, node, file)
  }

  return {
    ts,
    getCompilerHost,
    parse,
    parseFile,
    interfaceInfo,
    interfacesInfo,
    interfacesInfoAST,
    fmt,
  }

}

// const programCache = new Map<string,Program>() // {srcfile:{options:program}}
// function getProgram(srcfiles :string[], options: CompilerOptions) {
//   const cacheKey = srcfiles.map(f => Path.resolve(f)).join(":") + "\n" + (
//     Object.keys(options).sort().map(k => `${options[k]}\n`)
//   )
//   let prog = programCache.get(cacheKey)
//   if (!prog) {
//     prog = ts.createProgram(srcfiles, options)
//     programCache.set(cacheKey, prog)
//   }
//   return prog
// }
