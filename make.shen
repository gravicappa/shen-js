#!/usr/bin/env shen_run

(define main
  [Dir] -> (do (use-modules [shen-js])
               (dump-module shen-js javascript all "shenjs/")
               true)
  _ -> (error "Usage: make.shen destdir"))
