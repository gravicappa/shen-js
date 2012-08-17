(define shenjs-repl-split-input-aux
  [] Acc Ret -> Ret
  [B | Bytes] Acc Ret -> (let Acc [B | Acc]
                              Buf (reverse Acc)
                              X (compile (function shen-<st_input>) Buf)
                           (shenjs-repl-split-input-aux
                             Bytes
                             Acc
                             (if (or (= X (fail)) (empty? X))
                                 Ret
                                 (@p Buf Bytes)))))

(define shenjs-repl-split-input
  Bytes -> (shenjs-repl-split-input-aux Bytes [] []))
