# Extending Shen-js

## Implementing own I/O
It's easier to look into `web/embed.js` to see how to set up custom I/O. It
consists of defining I/O initialisation function and passing it to `shen.init`
by `io` key:
  
      function io(vm) {
        var io_obj = {};
        io_obj.open = function(name, direction, vm) {
          …
        };
        vm.glob["*stoutput*"] = vm.Stream("w" out_write_byte, out_close);

        /* you can either directly assign a stream as an input */
        vm.glob["*stinput*"] = vm.Stream("r", in_read_byte, in_close);
        /*
          or you can initialise input channel:

            vm.ensure_chan_input();

          and then use 
        
            vm.send_str(some_string);

          to pass data to it
        */
      }

      shen.init({io: io, …});

### Stream class
Objects (stream in) or a (stream out) are represented in Shen-js as objects of
Stream class. Output streams has "w" character in their `dir` member and input
streams has "r" character.

    /* defining output stream */
    var out = vm.Stream("w",
                        function write_byte(byte, vm) {
                          …
                        },
                        function close(vm) {
                          …
                        });

    /* defining input stream */
    var inp = vm.Stream("r",
                        function read_byte(vm) {
                          …
                        },
                        function close(vm) {
                          …
                        });

Notes:

  * `vm` parameter is a reference to shen-js thread that is calling
    corresponding methods.
  * `read_byte` should return -1 when end of file is reached.
