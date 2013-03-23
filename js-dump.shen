(package shenjs- [js-int-funcs js-from-kl js-dump-to-file js-skip-internals]

(define mk-op-defs-n
  F _ [] Acc -> Acc
  F Args [D | Defs] Acc -> (let K (js-from-kl [defun D Args [D | Args]])
                                T1 (pr (make-string "~A~%" K) F)
                             (mk-op-defs-n F Args Defs Acc)))

(define mk-op-defs
  F [] Acc -> Acc
  F [[A | Ops] | R] Acc -> (mk-op-defs F R (mk-op-defs-n F A Ops Acc)))

(define mk-op-defs-to-file
  Filename -> (let F (open file Filename out)
                   S (mk-op-defs F (value js-int-funcs) "")
                   T2 (close F)
                _))

(define unwind-protect
  F End -> (trap-error (let R (thaw F)
                            E (thaw End)
                         R)
                       (/. E (do (thaw End)
                                 (error (error-to-string E))))))

(define call-with-install-flags
  F -> (let Prev (value *maximum-print-sequence-size*)
         (unwind-protect
           (freeze (do (set shen-*installing-kl* true)
                       (set *maximum-print-sequence-size* -1)
                     (thaw F)))
           (freeze (do (set shen-*installing-kl* false)
                       (set *maximum-print-sequence-size* Prev))))))

(define mk-primitives
  Dir -> (call-with-install-flags
           (freeze
             (unwind-protect
               (freeze (do (set js-skip-internals false)
                           (mk-op-defs-to-file (cn Dir "primitives.js"))))
               (freeze (set js-skip-internals true))))))

(define process-file
  Src Dir -> (let Dst (make-string "~A/~A.js" Dir Src)
                  O1 (output "== ~A -> ~A~%" Src Dst)
               (js-dump-to-file (read-file Src) Dst)))

(define translate-shen
  -> (do (output "== Translating Shen~%")
         (call-with-install-flags (freeze (map (function process-file)
                                               (value files))))
         (output "== DONE~%")
         true))
)
