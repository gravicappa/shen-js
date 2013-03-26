(register-module [[name: shen-js]
                  [depends: js-kl]
                  [author: "Ramil Farkshatov"]
                  [license: "Shen license"]
                  [desc: "Shen-JS."]
                  [load: "js-dump.shen"]
                  [dump-fn: js.dump-shen]])

(define js.dump-files
  {A --> (list string)}
  _ -> [
        "t-star.kl"
        "core.kl"
        "declarations.kl"
        "load.kl"
        "macros.kl"
        "prolog.kl"
        "reader.kl"
        "sequent.kl"
        "sys.kl"
        "toplevel.kl"
        "track.kl"
        "types.kl"
        "writer.kl"
        "yacc.kl"])

(define js.dump-shen
  {symbol --> symbol --> string --> string --> boolean}
  javascript _ Sdir Ddir -> (do (js.dump Sdir "shen-js.shen" Ddir)
                                (shenjs.mk-primitives Ddir)
                                (shenjs.call-with-install-flags
                                  (freeze (map (/. X (js.dump Sdir X Ddir))
                                               (js.dump-files _))))
                                true))
