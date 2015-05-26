(register-module [[depends: "js-kl"]
                  [author: "Ramil Farkshatov"]
                  [translate-fn: js.translate-shen]])

(define js.translate-shen
  {string --> string --> (list string)}
  "javascript" _ -> (let . (write-to-file "primitives.js"
                                          (js.generate-primitives))
                      ["shen-js.shen"]))
