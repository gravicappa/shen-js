(defun eval-kl (X)
  (trap-error (let . (set js.evaluated? true)
                (let R (js.eval (js.from-kl (cons X ())))
                  (let . (set js.evaluated? false)
                    R)))
              (lambda E (do (set js.evaluated? false)
                            (error (error-to-string E))))))

(define eval-str
  S -> (eval [do [] [] | (read-from-string S)]))
