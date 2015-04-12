(register-module [[depends: "js-kl"]
                  [author: "Ramil Farkshatov"]
                  [translate-fn: js.translate-shen]])

(define js.translate-shen
  {string --> string --> (list string)}
  "javascript" _ -> (let P (trap-error (js.kl-prefix) (/. _ ""))
                         . (write-to-file "primitives.js"
                                          (js.generate-primitives))
                      ["shen-js.shen"
                       | (map (/. F (cn P F)) ["toplevel.kl"
                                               "core.kl"
                                               "sys.kl"
                                               "sequent.kl"
                                               "yacc.kl"
                                               "reader.kl"
                                               "prolog.kl"
                                               "track.kl"
                                               "load.kl"
                                               "writer.kl"
                                               "macros.kl"
                                               "declarations.kl"
                                               "types.kl"
                                               "t-star.kl"])]))
