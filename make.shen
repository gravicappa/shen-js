#!/usr/bin/env shen_run_sbcl

(define main
  [Target] -> (let Files (module.files-to-translate
                          "shen-js" "javascript" "all")
                (shenjs.call-with-install-flags
                 (freeze (js.dump ["LICENSE.js"
                                   "runtime/runtime.js"
                                   "primitives.js"
                                   | Files]
                                  Target))))
  _ -> (error "Usage: make.shen target"))
