(package shen []
  (define resolve-macro-functions
    [] Acc -> (reverse Acc)
    [X | Xs] Acc -> (resolve-macro-functions
                     Xs (trap-error [(function X) | Acc] (/. E Acc)))
                    where (symbol? X)
    [X | Xs] Acc -> (resolve-macro-functions Xs [X | Acc]))

  (define macroexpand'
    X -> (let Y (compose (value *macros*) X)
           (if (= X Y)
               X
               (walk (/. Z (macroexpand' Z)) Y))))

  \*
  (define macroexpand
    X -> (do (set *macros* (resolve-macro-functions (value *macros*)))
             (macroexpand' X)))
  *\

  (defun macroexpand (X)
    (do (set *macros* (resolve-macro-functions (value *macros*) []))
        (macroexpand' X)))

  (define add-macro
    F -> (let MacroReg (value *macroreg*)
              NewMacroReg (set *macroreg* (adjoin F (value *macroreg*)))
           (if (= MacroReg NewMacroReg)
               skip
               (set *macros* [F | (value *macros*)])))))
