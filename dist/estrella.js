#!/usr/bin/env node
let e$=Object.defineProperty,f$=Object.hasOwnProperty,h$={},j$,k$=a$=>{let b$=h$[a$];return b$||(b$=h$[a$]={exports:{}},j$[a$](b$.exports,b$)),b$.exports},l$=a$=>{if(a$&&a$.__esModule)return a$;let b$={};for(let c$ in a$)f$.call(a$,c$)&&(b$[c$]=a$[c$]);return b$.default=a$,b$},p$=a$=>l$(k$(a$)),q$=(a$,b$)=>{e$(a$,"__esModule",{value:!0});for(let c$ in b$)e$(a$,c$,{get:b$[c$],enumerable:!0})};j$={6(i){q$(i,{clock:()=>l,findInPATH:()=>n,fmtDuration:()=>m,json:()=>k,jsonparse:()=>g,jsonparseFile:()=>o,tildePath:()=>p});const y=l$(require("fs")),z=l$(require("path")),A=l$(require("perf_hooks"));const k=JSON.stringify,l=()=>A.performance.now();function m(a){return a>=59500?(a/60000).toFixed(0)+"min":a>=999.5?(a/1000).toFixed(1)+"s":a.toFixed(2)+"ms"}function n(a){const b=process.platform.startsWith("win")&&!/\.exe$/i.test(a);for(let w of(process.env.PATH||"").split(z.delimiter)){let d=z.join(z.resolve(w),a);for(;;){try{let e=y.statSync(d);if(e.isSymbolicLink()){d=y.realpathSync.native(d);continue}else if(e.isFile()&&e.mode&y.constants.X_OK)return d}catch(e){}break}}return null}function g(a,b){returnrequire("vm").runInNewContext("(()=>("+a+"))()",{},{filename:b,displayErrors:!0})}function o(a){return g(y.readFileSync(a,"utf8"),a)}let c=null;function p(a){const b=z.resolve(a);return c||(c=require("os").homedir()),b.startsWith(c)?"~"+b.substr(c.length):b}},2(g){q$(g,{isMemoized:()=>d,memoize:()=>i});const m=p$(6);const b=new Map();const d=Symbol("isMemoized");function i(j){return function n(...e){let c=e.map(m.json).join("\0");if(!b.has(c)){const f=j(...e);return b.set(c,f),f}let a=b.get(c);return a&&typeof a=="object"&&(a[d]=!0),a}}},4(l){q$(l,{stderrStyle:()=>n,style:()=>m,termStyle:()=>e});function e(j,k){let c=0;if(k==!0){let b=process.env.TERM||"";c=b&&["xterm","screen","vt100"].some(d=>b.indexOf(d)!=-1)?b.indexOf("256color")!=-1?8:4:2}else k!==!1&&j.isTTY&&(c=j.getColorDepth());const a=c>=8?(b,d,f)=>{let g="["+d+"m",h="["+f+"m";return i=>g+i+h}:c>0?(b,d,f)=>{let g="["+b+"m",h="["+f+"m";return i=>g+i+h}:()=>b=>b;return{ncolors:c,reset:"e[0m",bold:a("1","1","22"),italic:a("3","3","23"),underline:a("4","4","24"),inverse:a("7","7","27"),white:a("37","38;2;255;255;255","39"),grey:a("90","38;5;244","39"),black:a("30","38;5;16","39"),blue:a("34","38;5;75","39"),cyan:a("36","38;5;87","39"),green:a("32","38;5;84","39"),magenta:a("35","38;5;213","39"),purple:a("35","38;5;141","39"),pink:a("35","38;5;211","39"),red:a("31","38;2;255;110;80","39"),yellow:a("33","38;5;227","39"),lightyellow:a("93","38;5;229","39"),orange:a("33","38;5;215","39")}}let m=e(process.stdout),n=e(process.stderr)},0(s){q$(s,{chmod:()=>u,editFileMode:()=>p});const z=l$(require("fs")),A=p$(6);const d=z.constants,B=d.S_IRUSR,C=d.S_IWUSR,D=d.S_IXUSR,E=d.S_IRGRP,F=d.S_IWGRP,G=d.S_IXGRP,H=d.S_IROTH,I=d.S_IWOTH,J=d.S_IXOTH,o=String.fromCharCode,t=(a,b)=>a.charCodeAt(b||0);function u(a,b){if(typeof b=="number")return z.chmodSync(a,b),b;let h=z.statSync(a).mode,e=p(h,b);return h!=e&&z.chmodSync(a,e),e}function p(a,b){const h="Expected format: [ugoa]*[+-=][rwx]+",e=(c,g)=>new Error(`${c} in modifier ${A.json(g)}. ${h}`);let m=[];for(let c of Array.isArray(b)?b:[b])m=m.concat(c.trim().split(/\s*,+\s*/));for(let c of m){let g=[],r=!1,k=0,f=0;for(let l=0;l<c.length;l++){let j=t(c,l);if(k==0)switch(j){case 117:case 103:case 111:r||g.push(j);break;case 97:g=[117,103,111],r=!0;break;case 43:case 45:case 61:k=j;break;default:if(k==0)throw e(`Invalid target or operation ${A.json(o(j))}`,c);break}else switch(j){case 114:f|=4;break;case 119:f|=2;break;case 120:f|=1;break;default:throw e(`Invalid permission ${A.json(o(j))}`,c)}}if(k==0)throw e("Missing operation",c);g.length==0&&(g=[117]),f==0&&(f=4|2|1);let i=0;for(let l of g)switch(l){case 117:i|=f<<6;break;case 103:i|=f<<3;break;case 111:i|=f;break}switch(k){case 43:a|=i;break;case 45:a&=~i;break;case 61:a=i;break}}return a}},3(e){q$(e,{screen:()=>b});const c=!!process.stdout.isTTY,f=!!process.stderr.isTTY;const b={width:60,height:20,clear(){},banner(a){return a||(a="-"),a.repeat(Math.floor((b.width-1)/a.length))}};if(c||f){const a=c&&process.stdout||process.stderr,d=()=>{b.width=a.columns,b.height=a.rows};a.on("resize",d),d(),b.clear=()=>{a.write("c")}}},7(q){q$(q,{scandir:()=>s,watchdir:()=>r});const x=l$(require("fs")),y=l$(require("path"));function r(f,c,a,d){d===void 0&&(a===void 0?(d=c,c=null):(d=a,a=null)),a||(a={});const o=a.latency===void 0?100:a.latency,i=!!a.recursive,g=new Set();let b=null;const j=(k,p)=>{if(c&&!c.test(p))return;g.add(p),b===null&&(b=setTimeout(()=>{b=null,d(Array.from(g)),g.clear()},o))};let n=(Array.isArray(f)?f:[f]).map(k=>x.watch(k,{recursive:i},j)),e=!1;const h=()=>{clearTimeout(b),e||(e=!0,n.map(k=>k.close()))};return h}async function s(f,c,a){a||(a={});if(!x.promises||!x.promises.opendir)throw new Error("not implemented for nodejs <12.12.0");const d=[],o=f,i=new Set();async function g(b,j){if(i.has(b))return;i.add(b);const n=await x.promises.opendir(b);for await(const e of n){let h=e.name;e.isDirectory()?a.recursive&&await g(y.join(b,h),y.join(j,h)):(e.isFile()||e.isSymbolicLink())&&(c&&c.test(h)&&d.push(y.join(j,h)))}}return g(y.resolve(f),".").then(()=>d.sort())}},5(S){q$(S,{defaultTSRules:()=>F,findTSConfigFile:()=>G,tslint:()=>Y});const T=l$(require("path")),ma=l$(require("fs")),na=p$(6),oa=p$(4),pa=p$(3);const{dirname:E,basename:qa}=T;const F={6031:"IGNORE",6194:"IGNORE",6133:"WARNING",2531:"WARNING",7006:"WARNING",7015:"WARNING",7053:"WARNING"};function W(a){let d="",e=process.cwd();a&&process.chdir(a);try{d=null.resolve("typescript")}catch(f){}finally{a&&process.chdir(e)}if(d){const f=T.sep+"node_modules"+T.sep;let p=d.indexOf(f);if(p!=-1)return T.join(d.substr(0,p+f.length-T.sep.length),".bin","tsc")}return"tsc"}function G(a){a=T.resolve(a);const d=T.parse(a).root;for(;;){let e=T.join(a,"tsconfig.json");if(ma.existsSync(e))return e;a=E(a);if(a==d)break}return null}const H=0,I=1,J=2,X=3,K={IGNORE:H,INFO:I,WARNING:J,ERROR:X};function L(a,d){for(let e of Object.keys(d)){let f=K[String(d[e]).toUpperCase()];if(f===void 0)throw new Error(`Invalid value for TS rule ${e}: ${na.json(f)} -- expected value to be one of: `+Object.keys(K).map(na.json).join(", "));a[e]=f}}function Y(a){a||(a={});let d={cancelled:!1,cancel(){}},e=new Promise((f,p)=>{if(a.mode=="off")return f(!0);const x=a.quiet?()=>{}:console.log.bind(console),k=a.cwd||process.cwd(),l=a.mode=="on"?null:G(a.srcdir?T.resolve(k,a.srcdir):k);if(a.mode!="on"&&!l)return f(!0);let j=W(a.cwd);if(j=="tsc"&&a.mode!="on"){if(!(j=na.findInPATH(j)))return console.warn(oa.stderrStyle.orange(prog+":")+" tsc not found in node_modules or PATH. However a tsconfig.json file was found in "+T.relative(process.cwd(),E(l))+"."` Set tslint options.tsc="off" or pass -no-diag on the command line.`),f(!0)}const m={};L(m,F),a.rules&&L(m,a.rules);let r=["--noEmit",a.colors&&"--pretty",a.watch&&"--watch"].concat(a.args||[]).filter(b=>b);const{spawn:ca}=require("child_process"),s=ca(j,r,{stdio:["inherit","pipe","inherit"],cwd:k}),O=()=>{try{s.kill()}catch(b){}};process.on("exit",O),d.cancel=()=>{s.kill()};const P=b=>b,y=oa.style.orange,da=oa.style.red,ea=oa.style.green,fa=Buffer.from(" TS"),ga=Buffer.from("Found "),ha=Buffer.from("c"),ia=Buffer.from("Starting compilation"),o=[];let q=0,Q=!1,h={errors:0,warnings:0,other:0,reset(){this.errors=0,this.warnings=0,this.other=0}},z=!1;function t(){if(!a.quiet||h.errors>=0){a.watch&&console.log(pa.screen.banner("—"));let b=[];h.errors>0?b.push(da("TS: "+A("$ error","$ errors",h.errors))):b.push(ea("TS: OK")),h.warnings>0&&b.push(y(A("$ warning","$ warnings",h.warnings))),h.other>0&&b.push(A("$ message","$ messages",h.other)),console.log(b.join("   ")),a.watch&&console.log(pa.screen.banner("—"))}Q=h.errors>0,a.onEnd&&a.onEnd(h),h.reset(),z=!0}function u(b){const g=o.slice();o.length=0;if(q==0){const c=g[0];if(c.includes(ia))return h.reset(),b&&t();if(g.every(i=>i.length<=1))return b&&t()}else{const c=/(?:\x1b\[\d+m|)error(?:\x1b\[\d+m|)/g;let i=g.shift().toString("utf8");switch(m[q]){case H:return b&&t();case I:i=i.replace(c,P("info")),R(g,P),h.other++;break;case J:i=i.replace(c,y("warning")),R(g,y),h.warnings++;break;default:c.test(i)?h.errors++:h.other++;break}process.stdout.write(i)}g.forEach(c=>process.stdout.write(c)),b&&t()}function R(b,g){for(let c=1;c<b.length;c++){let i=b[c];if(i.includes(126)){let n=i.toString("utf8");n=n.replace(/\x1b\[\d+m(\s*~+)/g,g("$1")),b[c]=n}}}function A(b,g,c){return(c==1?b:g).replace(/\$/g,c)}_(s.stdout,(b,g)=>{a.clearScreen||(b=ka(b));if(g){b.length>0&&o.push(b),o.length>0&&u();return}z&&b.length>1&&(z=!1,a.onRestart&&a.onRestart());if(b.includes(ga)){let c=ja(b.toString("utf8"));if(/^(?:\[[^\]]+\] |[\d\:PAM \-]+|)Found \d+ error/.test(c)){u(!0),q=0;return}else u(!1);q=0}else if(b.includes(fa)){const c=b.toString("utf8"),i=/(?:\x1b\[\d+m|)error(?:\x1b\[\d+m\x1b\[\d+m|) TS(\d+)\:/.exec(c);let n=i?parseInt(i[1]):0;n>0&&!isNaN(n)&&(o.length>0&&u(),q=n)}o.push(b)}),s.on("close",b=>{process.removeListener("exit",O),f(!Q)});function ja(b){return b.replace(/\x1b\[\d+m/g,"")}function ka(b){let g=b.indexOf(ha);return g==-1?b:g==0?b.subarray(3):Buffer.concat([b.subarray(0,g),b.subarray(g+3)],b.length-3)}});return e.cancel=()=>(d.cancelled||(d.cancelled=!0,d.cancel()),e),e}const Z=Buffer.allocUnsafe(0);function _(a,d){let e=[],f=0;const p=k=>{let l=0;for(;;){let j=k.indexOf(10,l);if(j==-1){if(l<k.length-1){const r=k.subarray(l);e.push(r),f+=r.length}break}j++;let m=k.subarray(l,j);f>0&&(m=Buffer.concat(e.concat(m),f+m.length),e.length=0,f=0),d(m,!1),l=j}},x=()=>{e.length>0?d(Buffer.concat(e,f),!0):d(Z,!0)};a.on("data",p),a.on("close",x),a.on("end",x)}},1(Ia,L){const Ka=l$(require("esbuild")),La=l$(require("fs")),ha=l$(require("path")),Ma=p$(6),Na=p$(2),Oa=p$(4),Pa=p$(0),Qa=p$(3),Ra=p$(7),Sa=p$(5);const{dirname:A,basename:T}=ha,oa=`
usage: $0 [options]
options:
  -watch, -w          Watch source files for changes and rebuild.
  -debug, -g          Do not optimize and define DEBUG=true.
  -sourcemap          Generate sourcemap.
  -inline-sourcemap   Generate inline sourcemap.
  -color              Color terminal output, regardless of TTY status.
  -no-color           Disable use of colors.
  -no-clear           Disable clearing of the screen, regardless of TTY status.
  -no-diag            Disable TypeScript diagnostics.
  -diag               Only run TypeScript diagnostics (no esbuild.)
  -quiet              Only log warnings and errors but nothing else.
  -h, -help           Print help to stderr and exit 0.
  -estrella-version   Print version of estrella and exit 0.
  -estrella-debug     Enable debug logging of estrella itself.
`,U={w:!1,watch:!1,debug:!1,g:!1,color:!1,"no-color":!1,sourcemap:!1,"inline-sourcemap":!1,"no-clear":!1,"no-diag":!1,diag:!1,quiet:!1,"estrella-debug":!1,"estrella-version":!1},V={helpUsage:"usage: $0 [options] <srcfile> ...",helpExtraText:`
  -bundle             Bundle all dependencies into the output files.
  -minify             Simplify and compress generated code.
  -o, -outfile <file> Write output to <file> instead of stdout.
  -outdir <dir>       Write output to <dir> instead of stdout.
  `,extraOptions:{bundle:!1,minify:!1,outdir:"",outfile:"",o:""}},pa=new Set(["cwd","debug","entry","onEnd","onStart","outfileMode","quiet","title","tsc","tsrules","watch"]),r=(process.env._||"/node").endsWith("/node")?process.argv[1]:process.env._;let W=!1;function I(b){if(!W){W=!0;let a=b||1;process.on("exit",f=>{process.exit(f||a)})}}function qa(b){b.entryPoints||(b.entryPoints=[]),b.entry&&(Array.isArray(b.entry)?b.entryPoints=b.entryPoints.concat(b.entry):b.entryPoints.push(b.entry)),delete b.entry;if(b.entryPoints.length==0)throw new Error("config.entryPoints is empty or not set");b.sourcemap?b.sourcemap!="inline"&&(b.sourcemap="external"):delete b.sourcemap}function ra(b){let a={};for(let f of Object.keys(b))pa.has(f)||(a[f]=b[f]);return a}function B(b,a){b&&console.error(`${r}: ${b}`);let f=oa.trim();a&&(a.helpUsage&&(f=a.helpUsage+f.substr(f.indexOf(`
`))),a.helpExtraText&&(f+=a.helpExtraText)),f=f.replace(/\$0\b/g,r),console.error(f.trim()),process.exit(b?1:0)}function X(b,a,f){f&&(b={...b,...f.extraOptions});const c={...b},s=new Set();let l=[],m=1;function t(g,k,w){let h=b[g];const u=typeof h;if(typeof h=="boolean")c[g]=!h;else{const x=k?k:a[++m];x===void 0&&B(`missing value for option ${w}`,f),Array.isArray(h)?(c[g]||(c[g]=[])).push(x):c[g]=x}}for(;m<a.length;m++){let g=a[m];if(g=="--"){l=l.concat(a.slice(m+1));break}if(g.startsWith("-")&&g!="-"){const[k,w]=g.replace(/^\-+/,"").split("=");(k=="h"||k=="help")&&B(null,f);if(!(k in b)){if(g[1]!="-"&&!w){let h=k.split("");if(h.every(u=>typeof b[u]=="boolean")){h.map(u=>t(u,"",g));continue}}B(`unknown option ${g}`,f)}t(k,w,g)}else l.push(g)}return{opts:c,args:l}}const Y=Symbol("IS_MAIN_CALL");async function Z(b,a){let f=!1;a===Y?(a={},f=!0):(a&&(a={...a}),qa(a));const{opts:c,args:s}=X(U,b,f?V:null);c["estrella-version"]&&(console.log(`estrella ${"1.0.3"}${""}`),process.exit(0));if(f){if(s.length==0){let d=null;try{d=jsonparseFile(Sa.findTSConfigFile(process.cwd()))}catch(e){}if(d){let e=d.files||d.include;if(e)if(!Array.isArray(e))s.push(e);else for(let i of e)s.push(i);c.outfile||(c.outfile=d.outFile),c.outfile||(c.outdir=d.outDir)}s.length==0&&B("missing <srcfile> argument",V)}a.entryPoints=s,a.outfile=c.o||c.outfile||void 0,a.outdir=c.outdir||void 0,a.bundle=c.bundle||void 0,a.minify=c.minify||void 0,a.cwd=process.cwd()}const l=a.watch=c.watch=!!(c.w||c.watch||a.watch),m=a.debug=c.debug=!!(c.debug||c.g||a.debug),t=a.quiet=c.quiet=!!(c.quiet||a.quiet);a.color!==void 0&&(a.color?c.color=!0:c["no-color"]=!0);const g=c.color||(c["no-color"]?!1:void 0);Oa.style=Oa.termStyle(process.stdout,g),Oa.stderrStyle=Oa.termStyle(process.stderr,g);const k=(...d)=>console.error(Oa.stderrStyle.red(`${r}:`),...d),w=console.log.bind(console),h=t?()=>{}:console.log.bind(console),u=t?()=>{}:Na.memoize(h),x=c["estrella-debug"]?d=>{let e=d();Array.isArray(e)||(e=[e]),console.error(Oa.stderrStyle.pink("[DEBUG]"),...e)}:()=>{},ba=!!c.diag;let C=c["no-diag"]?"off":ba?"on":"auto";a.tsc!==void 0&&a.tsc!=="auto"&&(C=a.tsc&&a.tsc!="off"?"on":"off");if(ba&&C=="off")return k("invalid configuration: diagnostics are disabled but only disagnostics was requested."),I(1),!1;const ca=c["inline-sourcemap"]?"inline":c.sourcemap?"external":a.sourcemap;process.stdout.isTTY||(c["no-clear"]=!0);const o=a.cwd?ha.resolve(a.cwd):process.mainModule&&A(process.mainModule.filename)||__dirname;if(o!=process.cwd()){let d=ha.relative(process.cwd(),o);d.startsWith(".."+ha.sep)&&(d=o),u(`Changing working directory to ${d}`)}a.cwd=o,a.title||(a.title=a.name||Ma.tildePath(a.cwd));let da=0;function Aa(){Qa.screen.clear(),da=Ma.clock()}let Ba=a.onStart||(()=>{}),D=a.onEnd?(d,e)=>{const i=a.onEnd(a,d),j=z=>z===void 0?e:z;return i instanceof Promise?i.then(j):j()}:(d,e)=>e;if(a.outfileMode){let d=D;D=(e,i)=>{try{Pa.chmod(a.outfile,a.outfileMode)}catch(j){k("configuration error: outfileMode: "+j.message),I(1)}return d(e,i)}}function Ca(d,{stderr:e,warnings:i}){_(i);const j=a.outfile;if(!j)e=e.replace(/\n$/,""),e.length>0&&h(e);else{const z=/\(([^\)]+)\)\n/.exec(e),Ga=Ma.fmtDuration(Ma.clock()-d);let ga=j;if(ca=="external"){const K=ha.extname(j),Ha=ha.join(ha.dirname(j),ha.basename(j,K));ga=`${Ha}.{${K.substr(1)},${K.substr(1)}.map}`}h(Oa.style.green(`Wrote ${ga}`)+` (${z?z[1]:"?B"}, ${Ga})`)}return D({warnings:i,errors:[]},!0)}function Da(d,{stderr:e,warnings:i,errors:j}){return _(i),console.error(e),j.length==0&&j.push({text:e.trim(),location:null}),/^error: must provide/i.test(e)&&(a||process.exit(1)),D({warnings:i,errors:j},!1)}let E={DEBUG:m,...a.define||{}};for(let d in E)E[d]=Ma.json(E[d]);const Ea={minify:!m,sourcemap:ca,color:Oa.stderrStyle.ncolors>0,...ra(a),define:E};async function ea(){l&&!c["no-clear"]&&Aa();const d=Ba(a);d instanceof Promise&&await d;const e=process.cwd();process.chdir(o);const i=Ka.build(Ea);return process.chdir(e),i.then(Ca.bind(null,Ma.clock()),Da.bind(null,Ma.clock()))}const Fa=c.diag?Promise.resolve():ea();let p=null,J=!1;if(C!="off"){const d=l&&c.diag&&!c["no-clear"];p=Na.memoize(Sa.tslint)({watch:l,quiet:t,clearScreen:d,colors:Oa.style.ncolors>0,cwd:o,mode:C,srcdir:A(a.entryPoints[0]),rules:a.tsrules,onRestart(){!c["no-clear"]&&Ma.clock()-da>5000&&Qa.screen.clear()}}),J=Na.isMemoized in p;if(c.diag)return d&&Qa.screen.clear(),p;J||p.catch(e=>(k(e.stack||String(e)),!1))}let y=await Fa;if(!l){if(p){let d;y?(J||(d=setTimeout(()=>h("Waiting for TypeScript... (^C to skip)"),1000)),y=await p.catch(()=>!1)):p.cancel(),clearTimeout(d)}if(a)return y||I(),y;process.exit(y?0:1)}h("Watching files for changes...");const fa=Array.from(new Set(a.entryPoints.map(d=>A(ha.resolve(ha.join(o,d))))));x(()=>["watching dirs:",fa]),Ra.watchdir(fa,/\.[tj]s$/,{recursive:!0},d=>{h(d.length+" files changed:",d.join(", ")),ea()})}function _(b){b.length>0&&console.log("[warn] "+b.map(a=>a.text).join(`
`))}function sa(){return Z(process.argv.slice(1),Y).catch(b=>{console.error(Oa.stderrStyle.red(r+": "+(b.stack||b))),process.exit(1)}).then(()=>{process.exit(0)})}if(L.id=="."||process.mainModule&&T(process.mainModule.filename||"")=="estrella.js"){sa();return}const{opts:n,args:ta}=X(U,process.argv.slice(1));n.watch=!!(n.watch||n.w),n.debug=!!(n.debug||n.g),L.exports={prog:r,cliopts:n,cliargs:ta,dirname:A,basename:T,watchdir:Ra.watchdir,scandir:Ra.scandir,tslint:Sa.tslint,defaultTSRules:Sa.defaultTSRules,termStyle:Oa.termStyle,chmod:Pa.chmod,editFileMode:Pa.editFileMode,fmtDuration:Ma.fmtDuration,tildePath:Ma.tildePath,findInPATH:Ma.findInPATH,findTSConfigFile:Sa.findTSConfigFile,build(b){return Z(process.argv.slice(1),b).catch(a=>{console.error(Oa.stderrStyle.red(r+": "+(a.stack||a))),process.exit(1)})}}}};module.exports=k$(1);
