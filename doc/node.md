# Running in Node.js

The current Node.js port support compiling, executing source files as well as
REPL.

For REPL execute `shen-node.js` script

    ./shen-node.js

To load a list of files do

    ./shen-node.js file1.shen ... fileN.shen

To compile files into .js

    ./shen-node.js -c target.js file1.shen ... fileN.shen
