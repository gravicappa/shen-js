# Shen-js internals
## Translating to Javascript
There are several function for translating from different kind of source data
to Javascript code:

    (js.from-file Filename)
    (js.from-files List-of-filenames)
    (js.from-string String)
    (js.from-shen List-of-Shen-code)
    (js.from-kl List-of-Kl-code)
    (js.save-from-files List-of-filenames Target-filename)

## Interrupting vm
Shen-js vm can be stopped at some point of time and resumed later. It can be
useful when dealing with asynchronous Javascript tasks:

    shen.defun("xml-http-req", function(arg) {
      var vm = this;
      xml_http_req(function ondone(result) {
        vm.resume(result);
      }, function onerr(err) {
        vm.resume(vm.fail_obj);
      });
      this.interrupt(); // Note that it should be the last expression
    );

To be used like

    (let Data (xml-http-req Url)
      (if (= Data (fail))
          (error "Request failed")
          (process-response Data)))

## Defining Shen function
Use `shen.defun` to define a Shen function. It has two modes. Called with a
single function argument it takes passed function's name:

    // defines `hello` function in Shen
    shen.defun(function hello(s) {
      console.log("Hello, " + s);
    });

But it is possible to manually specify a name:

    // defines `hello-there` function in Shen
    shen.defun("hello-there", function hello(s) {
      console.log("Hello there, " + s);
    });

The function will be executed with `this` set to current interpreter vm.

## Running Shen code

    shen.call("some-func", [arg1, arg2, ...]);

## Shen objects
### Sym
Represents a symbol.

Creating

    var s = shen.Sym("symbol-name");

Accessing

    console.log(s.str);

### Cons
Represents a cons cell.

Creating

    var a = shen.Cons(head, tail);
    var b = shen.list([a, b, c, ...]);

Accessing

    console.log(a.head, a.tail);
    
### Vector
Creating

    var v = shen.vector(n);

When accessing keep in mind that the first element `v[0]` contains the length
of the vector.

### Fail object

    shen.fail_obj

### Func
A function object.

Creating

    var f = shen.Func(name, arity, func, closure_vars);

**Note:** using `shen.defun` is recommended instead. Bare `Func` objects do
not handle partial application.

### Stream
Creating

    var stream = shen.Stream(read_byte, write_byte, close);

* `read_byte(vm)`: returns next byte from a stream. Returns -1 if stream is
  exhausted.
* `write_byte(byte, vm)`: writes a byte to a stream. Returns the byte written.
* `close`: a function which is called when a stream is closed.

### Other

There are other objects which you can discover in the beginning of `shen.js`
(or in `runtime.js`).
