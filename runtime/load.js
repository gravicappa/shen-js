function shenjs_load_files() {
  var dir = "/home/ramil/dev/shen/shenjs/"
  var shen_src_js = ["reg-kl.shen.js",
                     "js-kl.shen.js",
                     "core.kl.js",
                     "sys.kl.js",
                     "sequent.kl.js",
                     "yacc.kl.js",
                     "writer.kl.js",
                     "reader.kl.js",
                     "prolog.kl.js",
                     "track.kl.js",
                     "declarations.kl.js",
                     "load.kl.js",
                     "macros.kl.js",
                     "types.kl.js",
                     "t-star.kl.js",
                     "toplevel.kl.js"]

  var dir1 = ""
  load(dir1 + "runtime.js")
  load(dir1 + "io-cli.js")
  load(dir1 + "io.js")
  load(dir + "primitives.js")
  load(dir1 + "dbg.js")
  load(dir1 + "dummy.js")

  //shenjs_globals['shen_shen-*show-eval-js*'] = true
  for (var i = 0; i < shen_src_js.length; ++i) {
    var f = dir + shen_src_js[i]
    shenjs_puts("# loading " + f + "\n")
    load(f)
  }
}

function shenjs_start_shen() {
  shenjs_globals["shen_shen-*exit-from-repl*"] = false
  shenjs_call(shen_shen, [])
}

shenjs_load_files()
shenjs_globals['shen_shen-*show-eval-js*'] = false
shenjs_start_shen()
