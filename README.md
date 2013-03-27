Shen-js
=======

## Running console REPL

Type in your terminal (choose a line depending on your js interpreter):

    d8 -e 'load("shen.js"); Shen.console_repl()'
    js -e 'load("shen.js"); Shen.console_repl()'

## Running provided REPL in browser

Put `shen.html`, `shen.css`, `shen.js`, `shen-repl-html.js`, `fileio-html5,js`
into a directory of your choice. Then open `shen.html` in your browser. It's
been tested in Firefox and WebKit-based browsers (Chrome and Surf).

Working with files is a bit clumsy. It requires manual interventions and has
limited filesize. Shen-js maintains list of files it has access to directly on
a page. To add local files into it use button under `Filesystem` title. To
download written file to your local drive press on that file in a list.
Currently only Chrome supports naming such files. On firefox specify correct
name manually.

## JS integration

To define a Shen function from javascript use `Shen.mkfunction`.

`Shen.mkfunction` takes three arguments:

  - name of a function
  - number of arguments
  - function

`function` takes a vector as an argument and must check its length.
If length is less than expected it must return function object which is
a four element vector with elements:

    1. `Shen.type_func`,
    2. function object,
    3. number of arguments,
    4. closure vector.

Example:

    Shen.mkfunction("plus", 2, function f(args) {
      if (args.length < 2) return [Shen.type_func, f, 2, args]
      return args[0] + args[1]
    })

To load javascript file from Shen use `shenjs.load` function.
To call Shen function `(some-func Arg1 Arg2)` from javascript use
`Shen.call_by_name("some-func", [Arg1, Arg2])`.

## Making your own REPL and I/O

To write your own Shen-js REPL and I/O you have to pass your io class to
`Shen.init`. Your class must have the following members:

  * init — called from `Shen.init`. Initializes IO class instance. It also
    initializes `*stinput*` and `*stoutput*` streams.
  * puts — prints a line. It must not implicitely add a trailing newline.
  * gets — reads a line from repl.
  * open — is a `function(type, name, direction)` and is a direct mapping of
    shen's `open` function.

### Stream type
Objects (stream in) or a (stream out) are represented in Shen-js as following.

  * (stream in) — `[Shen.type_stream_in, read_byte(), close()]`
  * (stream out) — `[Shen.type_stream_out, write_byte(byte), close()]`

  * `read_byte` function returns numeric value of a next byte from a stream or
     -1 as end of file marker.
  * `write_byte` function writes a byte to a stream. `byte` is a number.
  * `close` closes a stream.

You can look at `Shen.console_io` object and `Shen.console_repl` function as a
references.

Current implementation sets `*stinput*` as in/out stream as a workaround of
Shen using `*stinput*` for output.
