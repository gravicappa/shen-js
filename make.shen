#!/usr/bin/env shen_run_sbcl

(define js.kl-prefix 
	\\ Path to  KLambda directory relative to this. Must end with /
	-> "../official/Shen 19/KLambda/")

(define js.extra
	\\ Add extra files you want to include in Shen build (like custom
	\\ libraries).
	-> ["../shen-libs/modulesys.shen"])

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
