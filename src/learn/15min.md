Shen in 15 minutes
==================

The Shen top level is a read-evaluate-print loop as in all functional
languages. When you start it up, you get something like this (depending on
release and platform).

    Shen 2010, copyright (C) 2010 Mark Tarver
    www.lambdassociates.org, version 1.8
    running under Common Lisp, implementation: CLisp 2.49
    port 1.0 ported by Mark Tarver
    
    
    (0-)

Unlike Lisp the quote (') is not used. Entering `hello` returns `hello`, so
symbols are implicitly quoted. You can run example below in REPL by pressing
<img class="icon_btn btn_bg btn_fg" src="web/run.png"> button on the left side
of code block (it appears when mouse is over the block).

    hello

Functions are applied in prefix form just like Lisp. Unlike some Listps
(Common Lisp, Scheme), Shen is case-sensitive, so b and B are not treated as
the same. `=` is the general equality relation (unlike some Lisps where it is
used for only numbers). Unlike some Lisps, Shen uses true and false as
booleans.

    (and true false)

---

    (or true false)

---

    (not true)

---

    (if true a b)

---

    (= 1 1)

`^` breaks off input.

    (- 10 ^

Shen permits currying, and also partial applications, which both generate
closures.

    ((* 7) 9)

---
    
    (* 7)

In lambda calculus, the identity function is `(λ x x)`. In Shen it is written
`(/. X X)`, and evaluates to a closure. `(/. X Y X)` is acceptable shorthand
for `(λ x (λ y x))`. In Shen an abstraction can always be used in place of a
function.


    (/. X X)

---
    
    ((/. X X) 9)

---
    
    ((/. X Y Y) 6 7)

---

    ((/. X Y (* X Y)) 6 7)

A list begins with a `[` and ends with a `]`. Spaces seperate items. cons,
head and tail are standard. Note that Shen includes an infix `|` that works as
Prolog. `[1 2 | [3]] = [1 2 3]`.


    [1 2 3]
    
---

    (= [1 (+ 1 1) 3] [1 2 3])

---
    
    (head [1])

---
    
    (tail [1])

---
    
    (cons 1 [])

---
    
    [1 2 | [3]]

Suppose we have to define a function f that, if it receives 1 returns 0 and if
it receives 0 returns 1. In Shen this appears as a series of rewrite rules.

    (define invert
      0 -> 1
      1 -> 0)

---
    
    (invert 0)

---
    
    (invert 1)

If all rules fail an error is raised. **Don't forget to answer `n` in REPL**.
    
    (invert 2)

Now lets look at an example using variables. We define `factorial`, this
requires a variable, which in Shen is any symbol beginning in uppercase.

     (define factorial
       0 -> 1
       X -> (* X (factorial (- X 1))))

---
    
    (factorial 6)

Here are two list processing functions in Shen; one that totals a list and the
other that splits a lists into triples.

    (define total
      [] -> 0
      [X | Y] -> (+ X (total Y)))

---
    
    (define triples
      [] -> []
      [W X Y | Z] -> [[W X Y] | (triples Z)])

---
    
    (total [12 45 28])

---
    
    (triples [1 2 3 4 5 6])

Patterns can be non-left linear; repeated variables require equality.

    (define id
      X X -> true
      _ _ -> false)
    
Shen supports guards.

    (define greater
      X Y -> X where (> X Y)
      X Y -> Y where (> Y X)
      _ _ -> ?)

---
    
    (greater 4 5)

---
    
    (greater 14 5)

---
    
    (greater 14 14)

Here is `foldl` in Shen. Note that `function` may be needed to disambiguate
those symbol arguments that denote functions.

    (define foldl
      F Z [] -> Z
      F Z [X | Y] -> (foldl F (F Z X) Y))

---
    
    (foldl (function +) 0 [1 2 3])

`load` will load a Shen program. Shen uses a mutilated C++ convention for
comments.

    \* Here is a comment *\ (load ".examples/factorial.shen")

So far Shen looks like an untyped language (e.g. like SASL). Actually Shen
does have type checking, but you have to switch it on. `(tc +)` does it. The
`+` shows that you are now working in a statically typed environment. Shen
will typecheck everything that is loaded or entered into the image. Like ML,
mixed lists will not now be accepted. `(tc -)` switches the typechecker back
off.

    (tc +)

---
    
    123
    
---
    
    [1 a]

---
    
    (* 7)

---
    
    [1 2 3]

The pair `<1,2>` is represented as `(@p 1 2)` in Shen. The functions `fst` and
`snd` select the first and second elements of a pair. `(@p 1 2 3)` is just
shorthand for `(@p 1 (@p 2 3))`.

    (@p 1 2)

---
    
    (fst (@p 1 2))

---
    
    (snd (@p 1 2))

---
    
    (@p 1 2 3)

Shen is like Hope in requiring explicit types to be attached to functions. It
supports polymorphism and variables are allowed in types. You can use `@p` in
a pattern-directed manner in function definitions.

    (tc +)

    (define total
      {(list number) --> number}
      [] -> 0
      [X | Y] -> (+ X (total Y)))
    
    (define triples
      {(list A) --> (list (list A))}
      [] -> []
      [W X Y | Z] -> [[W X Y] | (triples Z)])
    
    (define swap
      {(A * B) --> (B * A)}
      (@p X Y) -> (@p Y X))

    (tc -)

*Here ends the 15 minute introduction*
