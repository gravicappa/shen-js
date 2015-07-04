(define factorial
  0 -> 1
  X -> (* X (factorial (- X 1))))

(define factorial-tail'
  0 Acc -> Acc
  X Acc -> (factorial-tail' (- X 1) (* X Acc)))

(define factorial-tail
  X -> (factorial-tail' X 1))
