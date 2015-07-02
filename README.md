Shen-js
=======
Javascript port of [Shen](http://shenlanguage.org) language. You may want to
try it [online](http://gravicappa.github.io/shen-js/shen.html#.doc/welcome.html).

## Running console REPL

Type in your terminal (choose a line depending on your js interpreter):

    d8 -e 'load("shen.js"); shen.console_repl()'
    js -e 'load("shen.js"); shen.console_repl()'

If you want to carry console Shen-js around, you need only `shen.js` file.

## Running in Node.js
See `doc/node.md`.

## Running in a browser

Just open `shen.html` in a browser. 

If you want to set up your own web REPL then copy `shen.html`, `shen.js` and
`web` directory somewhere to your webroot. Also see `doc/web.md`.

## JS integration
See `doc/ffi.md`

## Making your own REPL and I/O
See `doc/extend.md`.

## Building shen.js from sources
First ensure that you have latest
[modulesys and shen-libs](https://github.com/vasil-sd/shen-libs),
[klvm](https://github.com/gravicappa/klvm),
[js-kl](https://github.com/gravicappa/js-kl) and
[shen-js](https://github.com/gravicappa/shen-js). Then if you have
[shen_run](https://github.com/gravicappa/shen_run) and have set up your
`modulesys` correctly you can just call

    ./make.shen new_shen.js && ./boot
    
to have shen-js built into new_shen.js file. The `boot` step is unneccessary
and it makes file twice as big, but it significantly decreases start time.
