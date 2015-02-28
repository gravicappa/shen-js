Shen-js
=======

## Running in Node.js

The current Node.js port support compiling, executing source files as well as REPL.

To use it, navigate to this repository in your console, then do:

```
> npm install -g
> shen-js --help

  Usage: shen-js [options] <file ...>

  Options:

    -h, --help         output usage information
    -V, --version      output the version number
    -c, --compile      Compile to JavaScript and save as .js files
    -i, --interactive  Run an interactive Shen REPL
    -p, --print        Print compiled JavaScript instead of writing to file

```

`shen-js [filename]` will execute the specified source file. Executing `shen-js`
without args will drop you to the REPL

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

To call a javascript function from Shen you need to create a binding by using
`Shen.defun` function.

`Shen.defun` takes three arguments:

  - name of a function
  - number of arguments
  - function

`function` takes a vector as an arguments.

Example:

    Shen.defun("plus", 2, function(args) {
      return args[0] + args[1]
    })

You can put such definitions in some file which can be loaded by `shenjs.load`
function or for browser shen-js such file can be loaded using standard methods
(<script>).

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

## Building shen.js from sources
Fist ensure that you have latest shen-libs[1], klvm[2], js-kl[3] and
shen-js[4]. Then if you have shen_run[5] you can just call 'make.shen
new_shen.js' have Shen-js built into new_shen.js file.

1. https://github.com/vasil-sd/shen-libs
2. https://github.com/gravicappa/klvm
3. https://github.com/gravicappa/js-kl
4. https://github.com/gravicappa/shen-js
t. https://github.com/gravicappa/shen_run
