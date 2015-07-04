Backtracking is invoked in a Shen function by using `<-` in place of `->`. The
effect is that the expression after the `<- `is returned only if it does not
evaluate to the failure object `(fail)`. If `(fail)` is returned; then the
next rule is applied.

    (define foo
      X <- (if (integer? X)
               0
               (fail))
      X -> X)

---

    (foo 102)

---

    (foo a)
