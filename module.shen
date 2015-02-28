(register-module [[depends: "js-kl"]
                  [author: "Ramil Farkshatov"]
                  [load: "translation.shen"]
                  [translate-fn: js.translate-shen]])

(define js.translate-shen
  {string --> string --> (list string)}
  "javascript" _ -> (do (shenjs.mk-primitives "primitives.js")
                        ["toplevel.kl"
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
                         "t-star.kl"]))
