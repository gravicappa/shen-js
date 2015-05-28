(package thread-test [js.sleep-ms js.make-thread js.chan js.chan-read
                      js.chan-write js.chan-close]

  (define show-numbers
    _ N N -> true
    Who I N -> (do (output "~A: ~A~%" Who I)
                   (js.sleep-ms 500)
                   (show-numbers Who (+ I 1) N)))
    
  (define f1-func
    Who -> (show-numbers Who 0 10))

  (define f1
    -> (do (js.make-thread (freeze (f1-func "A")))
           (js.make-thread (freeze (f1-func "B")))
           (js.sleep-ms 6000)))

  (define walk-tree
    [L R] Ch -> (do (walk-tree L Ch)
                    (walk-tree R Ch))
    X Ch -> (do (js.chan-write X Ch)
                (js.sleep-ms 100)))

  (define collect-result
    Ch Acc -> (let X (js.chan-read Ch)
                (if (= (fail) X)
                    (reverse Acc)
                    (collect-result Ch [X | Acc]))))

  (define f2
    -> (let Tree [[[1 2] [[3 4] 5]] [6 [[7 [8 9]] 10]]]
            Ch (js.chan)
            . (js.make-thread (freeze (do (walk-tree Tree Ch)
                                          (js.chan-close Ch))))
            R (collect-result Ch [])
            . (output "R: ~R~%" R)
         true)))

(thread-test.f1)
(thread-test.f2)
