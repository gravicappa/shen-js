# Shen-js FFI

## Javascript from Shen
### General Javascipt code
`js.'` injects raw Javascript code. Use it with caution. Trying to access
internal interpreter variables (`vm`, `reg`, `sp`) may lead to unexpected
results.

    (let Add (js.' "function(x, y) {
                      return x + y;
                    }")
      (js.call Add 3 7))

### Referencing object properties or array items
Use `js.` to reference object's property:

    (js. document body children 0)

that will be translated to

    document.body.children[0]

Keep in mind that `js.` primitive will strip package names from symbols to
simplify using it inside packages. But it also means that the code
`(js. document.body children)` may not do that is expected to.

### Calling native code
`js.call` wraps it's arguments to a function call:
    
    (js. console (js.call log "Yellow pants! Double qu!"))

is expanded to

    console.log("Yellow pants! Double qu!")

### Setting values

    (js.set (js. document (js.call getElementById "some_button"))
            (js.' "function() {
                     console.log('click!');
                   }"))

=>

    document.getElementById("some_button") = function() {
      console.log('click!');
    };

### Creating objects

    (js.new (protect Array) 3 1 2 3)

=>
    
    new Array(3, 1, 2, 3)

### Creating literal objects

    (js.obj language "Shen" host_language "Javascript" ui "Web")

=>

    {language: "Shen", host_language: "Javascript", ui: "Web")

### Creating arrays

    (js.arr 1 "two" 3 "four" 5)

=>
  
    [1, "two", 3, "four", 5]

### Example
Some simple [example](#.examples/ffi.shen).

## Shen from Javascript
It is more complicated so here is a short

### Defining Shen function
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

### Running Shen code

    shen.call("some-func", [arg1, arg2, ...]);

### Shen objects
#### Sym
Represents a symbol.

Creating

    var s = shen.Sym("symbol-name");

Accessing

    console.log(s.str);

#### Cons
Represents a cons cell.

Creating

    var a = shen.Cons(head, tail);
    var b = shen.list([a, b, c, ...]);

Accessing

    console.log(a.head, a.tail);
    
#### Vector
Creating

    var v = shen.vector(n);

When accessing keep in mind that the first element `v[0]` contains the length
of the vector.

#### Fail object

    shen.fail_obj

#### Func
A function object.

Creating

    var f = shen.Func(name, arity, func, closure_vars);

**Note:** using `shen.defun` is recommended instead. Bare `Func` objects do
not handle partial application.

#### Stream
Creating

    var stream = shen.Stream(read_byte, write_byte, close);

* `read_byte(vm)`: returns next byte from a stream. Returns -1 if stream is
  exhausted.
* `write_byte(byte, vm)`: writes a byte to a stream. Returns the byte written.
* `close`: a function which is called when a stream is closed.

#### Other

There are other objects which you can discover in the beginning of `shen.js`
(or in `runtime.js`).
