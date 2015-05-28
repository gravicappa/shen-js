# Running in Node.js

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
