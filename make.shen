#!/usr/bin/env shen_run_sbcl

(define main
  [Target] -> (let Fs (module.files-to-translate "shen-js" "javascript" "all")
                (js.translate-files-to ["LICENSE.js"
                                        "runtime/runtime.js"
                                        "primitives.js"
                                        | Fs]
                                       Target))
  _ -> (error "Usage: make.shen target"))
