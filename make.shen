#!/usr/bin/env shen_run_sbcl

(define js.extra
	\\ Add extra files you want to include in Shen build (like custom
	\\ libraries).
	-> [])

(define main
  [Target] -> (let Fs (module.files-to-translate "shen-js" "javascript" "all")
                (js.translate-files-to ["LICENSE.js"
                                        "runtime.js"
                                        "primitives.js"
                                        | (append Fs
																									(js.extra)
                                                  ["patch.shen"])]
                                       Target))
  _ -> (error "Usage: make.shen target"))
