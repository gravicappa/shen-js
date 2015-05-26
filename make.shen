#!/usr/bin/env shen_run

(define js.extra
  \\ Add extra files you want to include in Shen build (like custom
  \\ libraries).
  -> ["../shen-libs/modulesys.shen"])

(define kl.files
  -> ["toplevel.kl" "core.kl" "sys.kl" "sequent.kl" "yacc.kl" "reader.kl"
      "prolog.kl" "track.kl" "load.kl" "writer.kl" "macros.kl"
      "declarations.kl" "types.kl" "t-star.kl"])

(define main
  [Target] -> (let Fs (module.files-to-translate "shen-js" "javascript" "all")
                (js.save-from-files ["LICENSE.js"
                                     "runtime.js"
                                     "primitives.js"
                                     | (append (kl.files)
                                               Fs
                                               (js.extra)
                                               ["patch.shen"])]
                                    Target))
  _ -> (error "Usage: make.shen target"))
