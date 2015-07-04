Functions
=========

Defining functions
------------------

Function definitions have the form

    (define <function name>
      <rules>)

or

    (define <function name>
      <signature>
      <rules>)

(See [Types (functions)](#.learn/types.html) for more on this).

A function name is a symbol beginning in lowercase. Rules have the form

`<arguments> -> <result>`

or

`<arguments> -> <result> where <guard>`

`<-` is used in place of `->` if backtracking is needed (see
[backtracking](#.learn/backtracking.html)).

Arguments can be any atom (string, symbol, number, boolean) or lists or
vectors of such (see **pattern matching** below). Variables are symbols
beginning in uppercase.

    (define zero?
      0 -> true
      X -> false)

    (zero? 0)

---

    (define likes
      tom dick -> yes
      dick harry -> yes
      harry tom -> yes)

---

    (likes tom dick)

---

    (likes dick fred)
    n

---

    (define greater-or-equal
      X Y -> X where (> X Y)
      _ Y -> Y)

Higher order functions
----------------------

Shen supports higher-order functions.

    (define foldl 
      F Z [] -> Z
      F Z [X | Xs] -> (foldl F (F Z X) Xs))

---

    (foldl (function +) 0 [1 2 3])

Pattern matching
----------------

Like most modern functional languages, Shen sustains pattern-matching. A Shen
pattern can be any of the following:

- an atom (symbol, string, boolean or number),
- a tuple or pair using `@p`,
- a list,
- a string construction using `@s`,
- a vector construction using `@v`.

---

    (define rep
      \* replace all occurrences of "Julius Caesar" in a string by
         "Mark Anthony" *\
      "" -> ""
      (@s "Julius Caesar" Ss) -> (@s "Mark Anthony" (rep Ss))
      (@s S Ss) -> (@s S (rep Ss)))

    (rep "Julius Caesar invaded Britain")

---

    (define vector-double
      \* non-destructively double every element in a vector *\
      <> -> <>
      (@v X V) -> (@v (+ X X) (vector-double V)))

    (vector-double (@v 1 2 3 <>))

---

    (define tuple->list
      \* recurse through a tuple converting into a list *\
      (@p X Y) -> [X | (tuple->list Y)]
      X -> [X])

    (tuple->list (@p 1 2 3))

---

    (define remove-duplicates
      \* remove every duplicated element in a list *\
      [] -> []
      [X | Y] -> (remove-duplicates Y) where (element? X Y)
      [X | Y] -> [X | (remove-duplicates X Y)])

    (remove-duplicates [1 1 2 3])
