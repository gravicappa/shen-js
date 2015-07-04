# Types
## Basic

The basic datatypes and types of Shen are 

* symbols,
* strings,
* booleans,
* numbers,
* lists,
* tuples,
* vectors,
* lazy objects,
* abstractions.

Typing 

    (tc +)

to the REPL activates type checking. Here are a few examples.

    a

---
  
    "hello world"

---
  
    (= 4 5)

---
  
    (* 2.3 2)

---
  
    [1 2 3]

---
  
    (@v 1 2 3 <>)

---
  
    (@p 1 2 a)

---
  
    (@s "10" " green" " bottles")

---
  
    (freeze (* 7 8))

---
  
    (* 7)


## Functions

Shen is an explicitly typed polymorphic language in the manner of Hope; it
requires that functions be entered with their types. `A --> B --> C` is
shorthand for `A --> (B --> C)`.

    (define member?
      {A --> (list A) --> boolean}
      _ [] -> false
      X [X | _] -> true
      X [_ | Y] -> (member X Y))

---
  
    (define square
      {number --> number}
      X -> (* X X))

---
  
    (define swap
      {(A * B) --> (B * A)}
      (@p X Y) -> (@p Y X))

---
  
    (define unit-vector?
      {(vector A) --> boolean}
      (@v _ <>) -> true
      _ -> false)

---
  
    (define unit-string?
      {string --> boolean}
      (@s X "") -> true
      _ -> false)

---
  
    (member? 1 [1 2 3])

---
  
    (square 4)

---
  
    (swap (@p 1 2))

---
  
    (unit-vector? (@v 1 <>))

---
  
    (unit-string? "a")


## Sequent calculus

In Shen, datatypes are formalised in a series of (single conclusion) `sequent
calculus`_ rules. If we want to introduce a new type t, then we have to write
down a series of deduction rules describing the conditions under which an
object x can be proved to be an inhabitant of t. For clarity, these rules are
organised into datatypes usually named after the type defined. For instance,
we want to create a type colour in which red, yellow and green are colours. In
sequent format, we write:

    ____________
    red : colour; 
  
    ___________
    yellow : colour; 
    
    ____________
    green : colour;
  
In Shen
  
    (datatype colour
    
      ____________
      yellow : colour;
    
      __________
      red : colour;
    
      ___________
      green : colour;)

---
  
    red

---
  
    red : colour

---
  
    blue : colour

The term red is now overloaded — it is both a symbol and a colour. Shen plumps
for the base type first when overloading is present.

The use of 3 deduction rules is otiose — only one is needed if a *side
condition* is placed before the rule. A side condition is signalled by the use
of *if* , followed by some boolean expression, or *let* followed by a variable
and an expression.

    (datatype colour
      if (element? X [red yellow green])
      __________________________________
      X : colour;)

Let's suppose we were writing a card game and we want to use lists like `[ace
spades] [10 hearts] [5 diamonds] [jack clubs]` as cards. If we were to enter
[5 diamonds] to Shen it would come back with a type error. So we want to
define a type card which is the type of all cards. A card is a 2-element list;
the first element being a rank and the second a suit.

    (datatype rank
      
      if (element? X [ace 2 3 4 5 6 7 8 9 10 jack queen king])
      ________
      X : rank;)

    (datatype suit
  
      if (element? Suit [spades hearts diamonds clubs])
      _________
      Suit : suit;)
  
    (datatype card
  
      Rank : rank; Suit : suit;
      _________________
      [Rank Suit] : card;
  
      Rank : rank, Suit : suit >> P;
      _____________________
      [Rank Suit] : card >> P;)

The first rule says that a two-element list can be proved to be of the type
`card` provided the first and second elements can be proved to be a `rank`
and a `suit` respectively. The second rule says that given any proof in
which it is assumed a two element list is a card, we can replace this
assumption by the assumptions that the first and second elements are a
`rank` and a `suit`. We need both rules to complete the identification of
cards with pairs of ranks and suits f we do not use *synonyms* (see left).

Shen permits a shorthand for expressing this type;

    (datatype card
  
      Rank : rank; Suit : suit;
      =========================
      [Rank Suit] : card;)

Note that semi-colons separate individual goals to be proved; `>>` is the Shen
turnstile `|-` and commas are used to separate individual formulae in the list
of assumptions to the left of `>>`. Here are some sample inputs.

    [5 spades]

---
  
    [king hearts]
  
---

    [king hearts] : card

---
  
    (define get-suit
      {card --> suit}
      [Rank Suit] -> Suit)


## Synonyms

Synonyms allow the use of shorthands for types. All types are normalised to
their definiens.

    (synonyms coor (number * number))

---

    (@p 1 2) : coor
