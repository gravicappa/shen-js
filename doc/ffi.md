# Shen-js FFI

## General Javascipt code
`js.'` injects raw Javascript code. Use it with caution. Trying to access
internal interpreter variables (`vm`, `reg`, `sp`) may lead to unexpected
results.

    (let Add (js.' "function(x, y) {
                      return x + y;
                    }")
      (js.call Add 3 7))

## Referencing object properties or array items
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

## Setting values

    (js.set (js. document (js.call getElementById "some_button"))
            (js.' "function() {
                     console.log('click!');
                   }"))

=>

    document.getElementById("some_button") = function() {
      console.log('click!');
    };

## Creating objects

    (js.new Array 3 1 2 3)

=>
    
    new Array(3, 1, 2, 3)

## Creating literal objects

    (js.obj language "Shen" host_language "Javascript" ui "Web")

=>

    {language: "Shen", host_language: "Javascript", ui: "Web")

## Creating arrays

    (js.arr 1 "two" 3 "four" 5)

=>
  
    [1, "two", 3, "four", 5]

## Example
See examples/ffi.shen.
