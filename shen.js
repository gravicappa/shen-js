/*
The License
-----------
The user is free to produce commercial applications with the software, to
distribute these applications in source or binary form, and to charge monies
for them as he sees fit and in concordance with the laws of the land subject
to the following license.

1. The license applies to all the software and all derived software and must
   appear on such.

2. It is illegal to distribute the software without this license attached to
   it and use of the software implies agreement with the license as such. It
   is illegal for anyone who is not the copyright holder to tamper with or
   change the license.

3. Neither the names of Lambda Associates or the copyright holder may be used
   to endorse or promote products built using the software without specific
   prior written permission from the copyright holder.

4. That possession of this license does not confer on the copyright holder any
   special contractual obligation towards the user. That in no event shall the
   copyright holder be liable for any direct, indirect, incidental, special,
   exemplary or consequential damages (including but not limited to
   procurement of substitute goods or services, loss of use, data, or profits;
   or business interruption), however caused and on any theory of liability,
   whether in contract, strict liability or tort (including negligence)
   arising in any way out of the use of the software, even if advised of the
   possibility of such damage.

5. It is permitted for the user to change the software, for the purpose of
   improving performance, correcting an error, or porting to a new platform,
   and distribute the modified version of Shen (hereafter the modified
   version) provided the resulting program conforms in all respects to the
   Shen standard and is issued under that title. The user must make it clear
   with his distribution that he/she is the author of the changes and what
   these changes are and why.

6. Derived versions of this software in whatever form are subject to the same
   restrictions. In particular it is not permitted to make derived copies of
   this software which do not conform to the Shen standard or appear under a
   different title.

7. It is permitted to distribute versions of Shen which incorporate libraries,
   graphics or other facilities which are not part of the Shen standard.

For an explication of this license see
[http://www.lambdassociates.org/News/june11/license.htm] which explains this
license in full.
*/

Shen = {};

Shen.globals = {};

Shen.globals["*language*"] = "Javascript";
Shen.globals["*implementation*"] = "cli";
Shen.globals["*port*"] = Shen.version = "13.0.2";
Shen.globals["*porters*"] = Shen.author = "Ramil Farkhshatov";

Shen.Tag = function(name) {
  this.toString = function() {
    return "#<Shen.Tag " + name + ">";
  }
}

Shen.fail_obj = new Shen.Tag('fail_obj');
Shen.fns = {};

Shen.type_func = new Shen.Tag('func');
Shen.type_symbol = new Shen.Tag('sym');
Shen.type_cons = new Shen.Tag('cons');
Shen.type_stream_in = new Shen.Tag('stream_in');
Shen.type_stream_out = new Shen.Tag('stream_out');
Shen.type_stream_inout = new Shen.Tag('stream_inout');
Shen.type_error = new Shen.Tag('error');

Shen.mkfunction = function(name, nargs, fn) {
  var x = [Shen.type_func, fn, nargs, [], name]
  Shen.fns[name] = x
  return x
}

Shen.defun = function(name, arity, func) {
  function f(args) {
    if (args.length < arity) return [Shen.type_func, f, arity, args]
    return func(args)
  }
  return Shen.mkfunction(name, arity, f)
}

Shen.call_tail = function(x, args) {
  var j = 0, nargs = args.length;
  for (;;) {
    if (typeof(x) == "function") {
      x = x([args[j++]]);
    } else if (x[0] == Shen.type_func) {
      var c = x[3], n = c.length, arity = x[2], a;
      if (!j && !n && nargs <= arity) {
        a = args;
        j += nargs;
      } else {
        if (arity > n + nargs) {
          arity = n + nargs;
          e = nargs;
        } else {
          e = arity - n;
        }
        a = c.concat(args.slice(j, e));
        j = e;
      }
      x = (x[1])(a);
    } else if (x[0] == Shen.type_symbol) {
      x = Shen.get_fn(x);
    } else
      return Shen.error("Shen.call: Wrong function: '" + x + "'");
    if (j >= nargs)
      return x;
    while (typeof(x) == "function")
      x = x();
  }
  return x;
}

Shen.call = function(x, args) {
  var x = Shen.call_tail(x, args)
  while (typeof(x) == "function")
    x = x()
  return x
}

Shen.call_by_name = function(x, args) {
  return Shen.call(Shen.fns[x], args)
}

Shen.call_toplevel = function(fn) {
  return Shen.call(fn, [])
}

Shen.unwind_tail = function(x) {
  while(typeof(x) == "function")
    x = x()
  return x
}

Shen.get_fn = function(x) {
  if (typeof(x) == "function")
    Shen.error("passed function into get_fn")
  switch (x[0]) {
  case Shen.type_func: return x
  case Shen.type_symbol:
    var v = Shen.fns[x[1]]
    if (v != undefined)
      return v
    Shen.error("Cannot find '" + x[1] + "'")
    return Shen.fail_obj
  }
  throw new Error("function " + x[1] + " not found")
}

Shen.thaw = function(f) {
  return f.fn(f.vars)
}

Shen.thaw = function(f) {return this.call(f, []);}

Shen.error = function(s) {
  if (Shen.is_true(Shen.globals['shenjs.*show-error-js*']))
    Shen.io.puts("# err: " + s + "\n")
  throw new Error(s);
  return Shen.fail_obj
}

Shen.error_to_string = function(s) {
  var stack = s.stack;
  var show = (stack !== undefined);
  show &= Shen.is_true(Shen.globals["shenjs.*show-error-stack*"]);
  return (show) ? ("" + s + " " + stack) : ("" + s);
}

Shen.get_time = function(x) {
  return (new Date()).getTime() / 1000.0;
}

Shen.simple_error = Shen.error;
Shen.log_eq = false;

Shen.trap_error = function(fn, handler) {
  try {
    return Shen.call(fn, []);
  } catch (e) {
    return Shen.call(handler, [e]);
  }
}

Shen.notrap_error = function(fn, handler) {
  return fn();
}

Shen.equal_boolean = function(b, x) {
  return ((x instanceof Array)
          && x[0] == Shen.type_symbol
          && ((x[1] == "true" && b === true)
              || (x[1] == "false" && b === false)));
}

Shen.equal_function = function(f, x) {
  return (x[0] == Shen.type_symbol && f[0] == Shen.type_func && x[1] == f[4])
}

Shen.is_equal = function(x, y) {
  if (x === y)
    return true
  var tx = typeof(x), ty = typeof(y)
  if (tx != ty)
    return ((tx == "boolean" && Shen.equal_boolean(x, y))
            || (ty == "boolean" && Shen.equal_boolean(y, x)))
  switch (tx) {
  case "number":
  case "boolean":
  case "function":
  case "string":
    return x == y;

  case "object":
    if (x == y)
      return true

    if ((x instanceof Array) ^ (y instanceof Array))
      return false

    if (Shen.equal_function(x, y) || Shen.equal_function(y, x))
      return true
    if (x.length != y.length)
      return false
    if (x.length == 0)
      return true
    if (x == Shen.fail_obj && y == Shen.fail_obj)
      return true
    if (x[0] != y[0])
      return false
    switch (x[0]) {
    case Shen.type_func:
     if (x[1] != y[1] || x[2] != y[2])
        return false
      var n = x[3].length
      if (n != y[3].length)
        return false
      for (var i = 0; i < n; ++i)
        if (x[3][i] != y[3][i])
          return false
      return true
    case Shen.type_symbol: return x[1] == y[1];
    case Shen.type_cons:
      var r = Shen.$eq$(x[1], y[1])
      while (typeof(r) == "function")
        r = r()
      if (!r)
        return false
      return (function() {
        var r = Shen.$eq$(x[2], y[2])
        while (typeof(r) == "function")
          r = r()
        return r
      });
    case Shen.type_stream_out:
    case Shen.type_stream_in: return x[1] == y[1] && x[2] == y[2];
    default:
      for (var i = 1; i < x.length; ++i) {
        var r = Shen.$eq$(x[i], y[i])
        while (typeof(r) == "function")
          r = r()
        if (!r)
          return false;
      }
      return true;
    }
    break;
  default: return false;
  }
}

Shen.$eq$ = Shen.is_equal;

Shen.empty$question$ = function(x) {
  return ((x instanceof Array) && !x.length)
}

Shen.is_type = function(x, type) {
  if (type == Shen.type_symbol && (x === true || x === false))
    return true
  return ((x instanceof Array) && x[0] == type)
}

Shen.boolean$question$ = function(x) {
  return (typeof(x) == "boolean") || (Shen.is_type(x, Shen.type_symbol)
                                      && (x[1] == "true" || x[1] == "false"))
}

Shen.vector$question$ = function(x) {
  return ((x instanceof Array) && x[0] > 0)
}

Shen.absvector$question$ = function(x) {
  return ((x instanceof Array) && x.length > 0
          && (!(x[0] instanceof Shen.Tag)))
}

Shen.absvector = function(n) {
  var ret = new Array(n)
  for (var i = 0; i < n; ++i)
    ret[i] = Shen.fail_obj
  return ret
}

Shen.dbg_princ = function(s, x) {
  dbg_print(" " + s + x)
  return x
}

Shen.dbg_print = function(s) {
  if (Shen.is_true(Shen.globals['shenjs.*show-error-js*']))
    Shen.io.puts(s + "\n")
}

Shen.is_true = function(x) {
  return x != false || ((x instanceof Array)
                        && (x[0] == Shen.type_symbol)
                        && (x[1] != "false"))
}

Shen.absvector_ref = function(x, i) {
  if (x.length <= i || i < 0)
    Shen.error("out of range")
  return x[i]
}

Shen.absvector_set = function(x, i, v) {
  if (x.length <= i || i < 0)
    Shen.error("out of range")
  x[i] = v
  return x
}

Shen.value = function(x) {
  var y = Shen.globals[s[1]]
  if (y === undefined)
    Shen.error("The variable " + x + " is unbound.")
  else
    return y
}

Shen.vector = function(n) {
  var r = new Array(n + 1)
  r[0] = n
  for (var i = 1; i <= n; ++i)
    r[i] = Shen.fail_obj
  return r
}

Shen.esc = function(x) {
  var ret = ""
  for (var i = 0; i < x.length; ++i)
    switch (x[i]) {
      case '"': ret += '\\"'; break;
      default: ret += x[i]; break
    }
  return ret
}

Shen.str = function(x) {
  var err = " is not an atom in Shen; str cannot print it to a string."
  switch (typeof(x)) {
    case "string": return "\"" + Shen.esc(x) + "\""
    case "number":
    case "boolean": return "" + x
    case "function":
      return "#<function>"
    case "object":
      if (x == Shen.fail_obj)
        return "fail!"
      if (x instanceof Array) {
        if (x.length <= 0) {
          Shen.error("[]" + err)
          return Shen.fail_obj
        }
        switch (x[0]) {
          case Shen.type_symbol: return x[1]
          case Shen.type_func:
            if (!x[3].length && x[4] != undefined)
              return x[4]
            if (Shen.is_true(Shen.globals['shenjs.*show-func-js*']))
              Shen.io.puts("\n func: " + x + "\n\n")
            return (x[3].length == 0) ? "#<function>" : "#<closure>"
        }
      }
  }
  Shen.error([x + err])
  return Shen.fail_obj
}

Shen.intern = function(x) {
  switch (x) {
  case "true": return true
  case "false": return false
  default: return [Shen.type_symbol, x]
  }
}

Shen.tlstr = function(x) {
  if (x == "")
    return [Shen.type_symbol, "shen_eos"]
  return x.substring(1, x.length)
}

Shen.n_$gt$string = function(x) {
  return String.fromCharCode(x)
}

Shen.string_$gt$n = function(x) {
  return x.charCodeAt(0)
}

Shen.eval_kl = function(x) {
  var log = false
  if (Shen.is_true(Shen.globals['shenjs.*show-eval-js*']))
    log = true
  if (log)
    Shen.io.puts("# eval-kl[KL]: " + "\n" + Shen.shenstr(x) + "\n\n")
  var js = Shen.call_by_name("js-from-kl", [x])
  if (log)
    Shen.io.puts("eval-kl[JS]:\n" + js + "\n\n")
  var ret = eval(js)
  if (log)
    Shen.io.puts("eval-kl => '" + ret + "'\n\n")
  if (ret === undefined)
    Shen.error("evaluated '" + js + "' to undefined")
  return ret
}

Shen.eval_string = function(str) {
  var x = Shen.call_by_name("read-from-string", [str])
  if (Shen.empty$question$(x))
    return []
  if (!Shen.is_type(x, Shen.type_cons)) {
    Shen.error("Broken read-from-string return value")
    return Shen.fail_obj
  }
  var js = Shen.call_by_name("js-from-shen", [x[1]])
  return eval(js)
}

Shen.mkfunction("shenjs.load", 1, function self(x) {
  if (x.length < 1) return [Shen.type_func, self, 1, x]
  return (function() {
    load(x)
    return []
  })
})

Shen.Utf8_reader = function (str) {
  this.str = (str == null) ? "" : str
  this.strpos = 0
  this.bytes = Array(6)
  this.bytepos = 0
  this.nbytes = 0
  this.read_byte = function () {
    if (this.bytepos < this.nbytes)
      return this.bytes[this.bytepos++]
    if (this.strpos >= this.str.length)
      return -1
    var c = this.str.charCodeAt(this.strpos++)
    this.bytepos = 0
    this.nbytes = 0
    if (c <= 0x7f)
      return c
    if (c <= 0x7ff) {
      var n = 1
      var c0 = (c >> 6) | 192
    } else if (c <= 0xffff) {
      var n = 2
      var c0 = (c >> 12) | 224
    } else if (c <= 0x1fffff) {
      var n = 3
      var c0 = (c >> 18) | 240
    } else if (c <= 0x3ffffff) {
      var n = 4
      var c0 = (c >> 24) | 248
    } else if (c <= 0x7fffffff) {
      var n = 5
      var c0 = (c >> 30) | 252
    } else {
      return Shen.error('Character ' + c + ' cannot be coded to UTF-8')
    }
    this.nbytes = n
    var shift = (n - 1) * 6
    for (i = 0; i < n; ++i, shift -= 6)
      this.bytes[i] = ((c >> shift) & 63) | 128
    return c0
  }
}

Shen.Utf8_writer = function(char_fn) {
  this.nbytes = 0
  this.char = 0
  this.bytespos = 0
  this.write_byte = function(byte) {
    if (!(byte & 0x80)) {
      char_fn(byte)
      this.bytespos = 0
    } else if ((byte & 224) == 192) {
      this.char = byte & 31
      this.nbytes = 2
      this.bytespos = 1
    } else if ((byte & 240) == 224) {
      this.char = byte & 15
      this.nbytes = 3
      this.bytespos = 1
    } else if ((byte & 248) == 240) {
      this.char = byte & 7
      this.nbytes = 4
      this.bytespos = 1
    } else if ((byte & 252) == 248) {
      this.char = byte & 3
      this.nbytes = 5
      this.bytespos = 1
    } else if ((byte & 254) == 252) {
      this.char = byte & 1
      this.nbytes = 6
      this.bytespos = 1
    } else {
      this.char = (this.char << 6) | (byte & 0x7f)
      this.bytespos++
      if (this.bytespos >= this.nbytes) {
        char_fn(this.char)
        this.bytespos = 0
        this.nbytes = 0
      }
    }
  }
}

Shen.str_from_utf8 = function(s) {
  var ret = ""
  function emit(x) {ret += String.fromCharCode(x)}
  var w = new Shen.Utf8_writer(emit)
  var n = s.length
  for (var i = 0; i < n; ++i)
    w.write_byte(s[i])
  return ret
}

Shen.file_instream_get_buf = function(stream, buf, pos) {
  if (buf.byteLength <= pos) {
    stream[1] = (function() {return -1})
    return -1
  }
  stream[1] = (function() {
    return Shen.file_instream_get_buf(stream, buf, pos + 1)
  })
  return buf[pos]
}

Shen.read_byte = function(stream) {
 switch (stream[0]) {
    case Shen.type_stream_in: return stream[1]()
    case Shen.type_stream_inout: return Shen.read_byte(stream[1])
    default:
      Shen.error("read-byte: Wrong stream type.")
      return -1;
  }
}

Shen.write_byte = function(byte, stream) {
 switch (stream[0]) {
    case Shen.type_stream_out: stream[1](byte); break;
    case Shen.type_stream_inout: Shen.write_byte(byte, stream[2]); break;
    default: Shen.error("write-byte: Wrong stream type.")
  }
  return []
}

Shen.close = function(stream) {
  switch (stream[0]) {
    case Shen.type_stream_in:
      stream[2]()
      stream[1] = (function() {return -1});
      break;
    case Shen.type_stream_out:
      stream[2]()
      stream[1] = (function(_) {return []});
      break;
    case Shen.type_stream_inout:
      Shen.close(stream[1])
      Shen.close(stream[2])
      break;
  }
  return []
}

Shen.open = function() {
  return this.io.open.apply(this.io, arguments)
}

Shen.repl_read_byte = function (stream, strbuf) {
  var x = strbuf.read_byte()
  if (x >= 0)
    return x
  var str = Shen.io.gets()
  if (str == null) {
    quit()
    return -1
  }
  strbuf = new Shen.Utf8_reader(str + '\n')
  stream[1] = (function() {
    return Shen.repl_read_byte(stream, strbuf)
  })
  return stream[1]()
}

Shen.pr = function(s, stream) {
  for (i = 0; i < s.length; ++i)
    Shen.write_byte(s.charCodeAt(i), stream)
  return s
}

Shen.shenstr = function(x) {
  return Shen.call_by_name("shen.app", [x, "", [Shen.type_symbol, "shen.s"]])
}

Shen.mkfunction("shenjs.exit", 1, function self(x) {quit()})
Shen.globals["js.skip-internals"] = true

Shen.globals["shenjs.*show-error-js*"] = false
Shen.globals["shenjs.*show-error-stack*"] = false
Shen.globals["shenjs.*show-eval-js*"] = false
Shen.globals["shenjs.*show-func-js*"] = false
Shen.globals["shenjs.*dbg-js*"] = false
Shen.globals["*home-directory*"] = ""

/* dummy functions to bypass defstruct's declarations */
Shen.mkfunction("shen.process-datatype", 2, function(_) {return []})
Shen.mkfunction("compile", 3, function(_) {return []})
Shen.mkfunction("declare", 2, function(_) {return []})

Shen.console_io = {
  open: function(name, dir) {
    var filename = Shen.globals["*home-directory*"] + name
    if (dir[1] == "in") {
      try {
        var buf = readbuffer(filename)
      } catch(e) {
        try {
          var buf = read(filename, 'binary')
        } catch (e) {
          Shen.error(e)
          return Shen.fail_obj
        }
      }
      var stream = [Shen.type_stream_in, null, function(){}]
      if (buf.byteLength !== undefined) {
        stream[1] = (function() {
          return Shen.file_instream_get_buf(stream, buf, 0)
        })
      } else {
        var strbuf = new Shen.Utf8_reader(buf)
        stream[1] = (function() {return strbuf.read_byte()})
      }
      return stream
    } else if (dir[1] == "out") {
      Shen.error("Writing files is not supported in cli interpreter")
      return Shen.fail_obj
    }
    Shen.error("Unsupported open flags")
    return Shen.fail_obj
  },

  init: function() {
    try {
      this.puts = putstr;
    } catch (e) {
      this.puts = write;
    }
    this.gets = readline;
    var writer = new Shen.Utf8_writer(function(char) {
       Shen.io.puts(String.fromCharCode(char))
    })
    var fout = [Shen.type_stream_out,
                function(byte) {return writer.write_byte(byte)},
                function() {}]
    Shen.globals["*stoutput*"] = fout
    
    var fin = [Shen.type_stream_in, null, quit]
    var strbuf = new Shen.Utf8_reader(null)
    fin[1] = (function() {
      return Shen.repl_read_byte(fin, strbuf)
    })
    
    var finout = [Shen.type_stream_inout, fin, fout]
    Shen.globals["*stinput*"] = finout
  }
}

Shen.init = function(conf) {
  Shen.io = conf.io
  Shen.io.init()
  function assert_io(func) {
    if (Shen.io[func] === undefined)
      throw new Error("Shen: IO has no method " + func)
  }
  assert_io('gets')
  assert_io('puts')
  assert_io('open')
  if (conf.start_repl)
    Shen.call_by_name("shen.shen", [])
}

Shen.console_repl = function () {
  Shen.init({io: Shen.console_io, start_repl: true});
}

Shen.xstr_list = function(x) {
  var lst = [];
  while (!this.empty$question$(x)) {
    lst.push(this.xstr(x[1]));
    x = x[2];
  }
  return "[" + lst.join(" ") + "]";
}

Shen.xstr = function(x) {
  switch (typeof(x)) {
    case 'string': return x;
    case 'number': return '' + x;
    case 'boolean': return '' + x;
  }
  if (this.is_type(x, this.type_symbol))
    return x[1];
  if (this.is_type(x, this.type_cons))
    return this.xstr_list(x);
  if (this.empty$question$(x))
    return "[]";
  function str(x) {
    return Shen.xstr(x);
  }
  if (this.vector$question$(x))
    return "<" + x.map(str).join(" ") + ">";
  if (x instanceof Array)
    return "<<" + x.map(str).join(" ") + ">>";
  return '' + x;
}

Shen.list = function(x) {
  var ret = [];
  for (var i = x.length - 1; i >= 0; --i)
    ret = [Shen.type_cons, x[i], ret];
  return ret;
}

try {
  module.exports = Shen
} catch (e) {}


Shen.fns["hd"] = [Shen.type_func, function shen_user_lambda6206(Arg6205) {
  if (Arg6205.length < 1) return [Shen.type_func, shen_user_lambda6206, 1, Arg6205];
  var Arg6205_0 = Arg6205[0];
  return Arg6205_0[1]}, 1, [], "hd"];






Shen.fns["tl"] = [Shen.type_func, function shen_user_lambda6208(Arg6207) {
  if (Arg6207.length < 1) return [Shen.type_func, shen_user_lambda6208, 1, Arg6207];
  var Arg6207_0 = Arg6207[0];
  return Arg6207_0[2]}, 1, [], "tl"];






Shen.fns["not"] = [Shen.type_func, function shen_user_lambda6210(Arg6209) {
  if (Arg6209.length < 1) return [Shen.type_func, shen_user_lambda6210, 1, Arg6209];
  var Arg6209_0 = Arg6209[0];
  return (!Arg6209_0)}, 1, [], "not"];






Shen.fns["thaw"] = [Shen.type_func, function shen_user_lambda6212(Arg6211) {
  if (Arg6211.length < 1) return [Shen.type_func, shen_user_lambda6212, 1, Arg6211];
  var Arg6211_0 = Arg6211[0];
  return Shen.thaw(Arg6211_0)}, 1, [], "thaw"];






Shen.fns["string?"] = [Shen.type_func, function shen_user_lambda6214(Arg6213) {
  if (Arg6213.length < 1) return [Shen.type_func, shen_user_lambda6214, 1, Arg6213];
  var Arg6213_0 = Arg6213[0];
  return (typeof(Arg6213_0) == 'string')}, 1, [], "string?"];






Shen.fns["number?"] = [Shen.type_func, function shen_user_lambda6216(Arg6215) {
  if (Arg6215.length < 1) return [Shen.type_func, shen_user_lambda6216, 1, Arg6215];
  var Arg6215_0 = Arg6215[0];
  return (typeof(Arg6215_0) == 'number')}, 1, [], "number?"];






Shen.fns["symbol?"] = [Shen.type_func, function shen_user_lambda6218(Arg6217) {
  if (Arg6217.length < 1) return [Shen.type_func, shen_user_lambda6218, 1, Arg6217];
  var Arg6217_0 = Arg6217[0];
  return Shen.is_type(Arg6217_0, Shen.type_symbol)}, 1, [], "symbol?"];






Shen.fns["cons?"] = [Shen.type_func, function shen_user_lambda6220(Arg6219) {
  if (Arg6219.length < 1) return [Shen.type_func, shen_user_lambda6220, 1, Arg6219];
  var Arg6219_0 = Arg6219[0];
  return Shen.is_type(Arg6219_0, Shen.type_cons)}, 1, [], "cons?"];






Shen.fns["vector?"] = [Shen.type_func, function shen_user_lambda6222(Arg6221) {
  if (Arg6221.length < 1) return [Shen.type_func, shen_user_lambda6222, 1, Arg6221];
  var Arg6221_0 = Arg6221[0];
  return (function() {
  return Shen.vector$question$(Arg6221_0);})}, 1, [], "vector?"];






Shen.fns["absvector?"] = [Shen.type_func, function shen_user_lambda6224(Arg6223) {
  if (Arg6223.length < 1) return [Shen.type_func, shen_user_lambda6224, 1, Arg6223];
  var Arg6223_0 = Arg6223[0];
  return (function() {
  return Shen.absvector$question$(Arg6223_0);})}, 1, [], "absvector?"];






Shen.fns["value"] = [Shen.type_func, function shen_user_lambda6226(Arg6225) {
  if (Arg6225.length < 1) return [Shen.type_func, shen_user_lambda6226, 1, Arg6225];
  var Arg6225_0 = Arg6225[0];
  return (Shen.globals[Arg6225_0[1]])}, 1, [], "value"];






Shen.fns["intern"] = [Shen.type_func, function shen_user_lambda6228(Arg6227) {
  if (Arg6227.length < 1) return [Shen.type_func, shen_user_lambda6228, 1, Arg6227];
  var Arg6227_0 = Arg6227[0];
  return (function() {
  return Shen.intern(Arg6227_0);})}, 1, [], "intern"];






Shen.fns["vector"] = [Shen.type_func, function shen_user_lambda6230(Arg6229) {
  if (Arg6229.length < 1) return [Shen.type_func, shen_user_lambda6230, 1, Arg6229];
  var Arg6229_0 = Arg6229[0];
  return (function() {
  return Shen.vector(Arg6229_0);})}, 1, [], "vector"];






Shen.fns["read-byte"] = [Shen.type_func, function shen_user_lambda6232(Arg6231) {
  if (Arg6231.length < 1) return [Shen.type_func, shen_user_lambda6232, 1, Arg6231];
  var Arg6231_0 = Arg6231[0];
  return (function() {
  return Shen.read_byte(Arg6231_0);})}, 1, [], "read-byte"];






Shen.fns["close"] = [Shen.type_func, function shen_user_lambda6234(Arg6233) {
  if (Arg6233.length < 1) return [Shen.type_func, shen_user_lambda6234, 1, Arg6233];
  var Arg6233_0 = Arg6233[0];
  return (function() {
  return Shen.close(Arg6233_0);})}, 1, [], "close"];






Shen.fns["absvector"] = [Shen.type_func, function shen_user_lambda6236(Arg6235) {
  if (Arg6235.length < 1) return [Shen.type_func, shen_user_lambda6236, 1, Arg6235];
  var Arg6235_0 = Arg6235[0];
  return (function() {
  return Shen.absvector(Arg6235_0);})}, 1, [], "absvector"];






Shen.fns["str"] = [Shen.type_func, function shen_user_lambda6238(Arg6237) {
  if (Arg6237.length < 1) return [Shen.type_func, shen_user_lambda6238, 1, Arg6237];
  var Arg6237_0 = Arg6237[0];
  return (function() {
  return Shen.str(Arg6237_0);})}, 1, [], "str"];






Shen.fns["tlstr"] = [Shen.type_func, function shen_user_lambda6240(Arg6239) {
  if (Arg6239.length < 1) return [Shen.type_func, shen_user_lambda6240, 1, Arg6239];
  var Arg6239_0 = Arg6239[0];
  return (function() {
  return Shen.tlstr(Arg6239_0);})}, 1, [], "tlstr"];






Shen.fns["n->string"] = [Shen.type_func, function shen_user_lambda6242(Arg6241) {
  if (Arg6241.length < 1) return [Shen.type_func, shen_user_lambda6242, 1, Arg6241];
  var Arg6241_0 = Arg6241[0];
  return (function() {
  return Shen.n_$gt$string(Arg6241_0);})}, 1, [], "n->string"];






Shen.fns["string->n"] = [Shen.type_func, function shen_user_lambda6244(Arg6243) {
  if (Arg6243.length < 1) return [Shen.type_func, shen_user_lambda6244, 1, Arg6243];
  var Arg6243_0 = Arg6243[0];
  return (function() {
  return Shen.string_$gt$n(Arg6243_0);})}, 1, [], "string->n"];






Shen.fns["empty?"] = [Shen.type_func, function shen_user_lambda6246(Arg6245) {
  if (Arg6245.length < 1) return [Shen.type_func, shen_user_lambda6246, 1, Arg6245];
  var Arg6245_0 = Arg6245[0];
  return (function() {
  return Shen.empty$question$(Arg6245_0);})}, 1, [], "empty?"];






Shen.fns["get-time"] = [Shen.type_func, function shen_user_lambda6248(Arg6247) {
  if (Arg6247.length < 1) return [Shen.type_func, shen_user_lambda6248, 1, Arg6247];
  var Arg6247_0 = Arg6247[0];
  return (function() {
  return Shen.get_time(Arg6247_0);})}, 1, [], "get-time"];






Shen.fns["error"] = [Shen.type_func, function shen_user_lambda6250(Arg6249) {
  if (Arg6249.length < 1) return [Shen.type_func, shen_user_lambda6250, 1, Arg6249];
  var Arg6249_0 = Arg6249[0];
  return (function() {
  return Shen.error(Arg6249_0);})}, 1, [], "error"];






Shen.fns["simple-error"] = [Shen.type_func, function shen_user_lambda6252(Arg6251) {
  if (Arg6251.length < 1) return [Shen.type_func, shen_user_lambda6252, 1, Arg6251];
  var Arg6251_0 = Arg6251[0];
  return (function() {
  return Shen.simple_error(Arg6251_0);})}, 1, [], "simple-error"];






Shen.fns["eval-kl"] = [Shen.type_func, function shen_user_lambda6254(Arg6253) {
  if (Arg6253.length < 1) return [Shen.type_func, shen_user_lambda6254, 1, Arg6253];
  var Arg6253_0 = Arg6253[0];
  return (function() {
  return Shen.eval_kl(Arg6253_0);})}, 1, [], "eval-kl"];






Shen.fns["error-to-string"] = [Shen.type_func, function shen_user_lambda6256(Arg6255) {
  if (Arg6255.length < 1) return [Shen.type_func, shen_user_lambda6256, 1, Arg6255];
  var Arg6255_0 = Arg6255[0];
  return (function() {
  return Shen.error_to_string(Arg6255_0);})}, 1, [], "error-to-string"];






Shen.fns["js.call-js"] = [Shen.type_func, function shen_user_lambda6258(Arg6257) {
  if (Arg6257.length < 1) return [Shen.type_func, shen_user_lambda6258, 1, Arg6257];
  var Arg6257_0 = Arg6257[0];
  return (function() {
  return Shen.js$dot$call_js(Arg6257_0);})}, 1, [], "js.call-js"];






Shen.fns["+"] = [Shen.type_func, function shen_user_lambda6260(Arg6259) {
  if (Arg6259.length < 2) return [Shen.type_func, shen_user_lambda6260, 2, Arg6259];
  var Arg6259_0 = Arg6259[0], Arg6259_1 = Arg6259[1];
  return (Arg6259_0 + Arg6259_1)}, 2, [], "+"];






Shen.fns["-"] = [Shen.type_func, function shen_user_lambda6262(Arg6261) {
  if (Arg6261.length < 2) return [Shen.type_func, shen_user_lambda6262, 2, Arg6261];
  var Arg6261_0 = Arg6261[0], Arg6261_1 = Arg6261[1];
  return (Arg6261_0 - Arg6261_1)}, 2, [], "-"];






Shen.fns["*"] = [Shen.type_func, function shen_user_lambda6264(Arg6263) {
  if (Arg6263.length < 2) return [Shen.type_func, shen_user_lambda6264, 2, Arg6263];
  var Arg6263_0 = Arg6263[0], Arg6263_1 = Arg6263[1];
  return (Arg6263_0 * Arg6263_1)}, 2, [], "*"];






Shen.fns["/"] = [Shen.type_func, function shen_user_lambda6266(Arg6265) {
  if (Arg6265.length < 2) return [Shen.type_func, shen_user_lambda6266, 2, Arg6265];
  var Arg6265_0 = Arg6265[0], Arg6265_1 = Arg6265[1];
  return (Arg6265_0 / Arg6265_1)}, 2, [], "/"];






Shen.fns["and"] = [Shen.type_func, function shen_user_lambda6268(Arg6267) {
  if (Arg6267.length < 2) return [Shen.type_func, shen_user_lambda6268, 2, Arg6267];
  var Arg6267_0 = Arg6267[0], Arg6267_1 = Arg6267[1];
  return (Arg6267_0 && Arg6267_1)}, 2, [], "and"];






Shen.fns["or"] = [Shen.type_func, function shen_user_lambda6270(Arg6269) {
  if (Arg6269.length < 2) return [Shen.type_func, shen_user_lambda6270, 2, Arg6269];
  var Arg6269_0 = Arg6269[0], Arg6269_1 = Arg6269[1];
  return (Arg6269_0 || Arg6269_1)}, 2, [], "or"];






Shen.fns["="] = [Shen.type_func, function shen_user_lambda6272(Arg6271) {
  if (Arg6271.length < 2) return [Shen.type_func, shen_user_lambda6272, 2, Arg6271];
  var Arg6271_0 = Arg6271[0], Arg6271_1 = Arg6271[1];
  return Shen.$eq$(Arg6271_0, Arg6271_1)}, 2, [], "="];






Shen.fns[">"] = [Shen.type_func, function shen_user_lambda6274(Arg6273) {
  if (Arg6273.length < 2) return [Shen.type_func, shen_user_lambda6274, 2, Arg6273];
  var Arg6273_0 = Arg6273[0], Arg6273_1 = Arg6273[1];
  return (Arg6273_0 > Arg6273_1)}, 2, [], ">"];






Shen.fns[">="] = [Shen.type_func, function shen_user_lambda6276(Arg6275) {
  if (Arg6275.length < 2) return [Shen.type_func, shen_user_lambda6276, 2, Arg6275];
  var Arg6275_0 = Arg6275[0], Arg6275_1 = Arg6275[1];
  return (Arg6275_0 >= Arg6275_1)}, 2, [], ">="];






Shen.fns["<"] = [Shen.type_func, function shen_user_lambda6278(Arg6277) {
  if (Arg6277.length < 2) return [Shen.type_func, shen_user_lambda6278, 2, Arg6277];
  var Arg6277_0 = Arg6277[0], Arg6277_1 = Arg6277[1];
  return (Arg6277_0 < Arg6277_1)}, 2, [], "<"];






Shen.fns["<="] = [Shen.type_func, function shen_user_lambda6280(Arg6279) {
  if (Arg6279.length < 2) return [Shen.type_func, shen_user_lambda6280, 2, Arg6279];
  var Arg6279_0 = Arg6279[0], Arg6279_1 = Arg6279[1];
  return (Arg6279_0 <= Arg6279_1)}, 2, [], "<="];






Shen.fns["cons"] = [Shen.type_func, function shen_user_lambda6282(Arg6281) {
  if (Arg6281.length < 2) return [Shen.type_func, shen_user_lambda6282, 2, Arg6281];
  var Arg6281_0 = Arg6281[0], Arg6281_1 = Arg6281[1];
  return [Shen.type_cons, Arg6281_0, Arg6281_1]}, 2, [], "cons"];






Shen.fns["set"] = [Shen.type_func, function shen_user_lambda6284(Arg6283) {
  if (Arg6283.length < 2) return [Shen.type_func, shen_user_lambda6284, 2, Arg6283];
  var Arg6283_0 = Arg6283[0], Arg6283_1 = Arg6283[1];
  return (Shen.globals[Arg6283_0[1]] = Arg6283_1)}, 2, [], "set"];






Shen.fns["<-address"] = [Shen.type_func, function shen_user_lambda6286(Arg6285) {
  if (Arg6285.length < 2) return [Shen.type_func, shen_user_lambda6286, 2, Arg6285];
  var Arg6285_0 = Arg6285[0], Arg6285_1 = Arg6285[1];
  return Shen.absvector_ref(Arg6285_0, Arg6285_1)}, 2, [], "<-address"];






Shen.fns["cn"] = [Shen.type_func, function shen_user_lambda6288(Arg6287) {
  if (Arg6287.length < 2) return [Shen.type_func, shen_user_lambda6288, 2, Arg6287];
  var Arg6287_0 = Arg6287[0], Arg6287_1 = Arg6287[1];
  return (Arg6287_0 + Arg6287_1)}, 2, [], "cn"];






Shen.fns["pos"] = [Shen.type_func, function shen_user_lambda6290(Arg6289) {
  if (Arg6289.length < 2) return [Shen.type_func, shen_user_lambda6290, 2, Arg6289];
  var Arg6289_0 = Arg6289[0], Arg6289_1 = Arg6289[1];
  return Arg6289_0[Arg6289_1]}, 2, [], "pos"];






Shen.fns["@p"] = [Shen.type_func, function shen_user_lambda6292(Arg6291) {
  if (Arg6291.length < 2) return [Shen.type_func, shen_user_lambda6292, 2, Arg6291];
  var Arg6291_0 = Arg6291[0], Arg6291_1 = Arg6291[1];
  return [Shen.fns['shen.tuple'], Arg6291_0, Arg6291_1]}, 2, [], "@p"];






Shen.fns["open"] = [Shen.type_func, function shen_user_lambda6294(Arg6293) {
  if (Arg6293.length < 2) return [Shen.type_func, shen_user_lambda6294, 2, Arg6293];
  var Arg6293_0 = Arg6293[0], Arg6293_1 = Arg6293[1];
  return (function() {
  return Shen.open(Arg6293_0, Arg6293_1);})}, 2, [], "open"];






Shen.fns["write-byte"] = [Shen.type_func, function shen_user_lambda6296(Arg6295) {
  if (Arg6295.length < 2) return [Shen.type_func, shen_user_lambda6296, 2, Arg6295];
  var Arg6295_0 = Arg6295[0], Arg6295_1 = Arg6295[1];
  return (function() {
  return Shen.write_byte(Arg6295_0, Arg6295_1);})}, 2, [], "write-byte"];






Shen.fns["address->"] = [Shen.type_func, function shen_user_lambda6298(Arg6297) {
  if (Arg6297.length < 3) return [Shen.type_func, shen_user_lambda6298, 3, Arg6297];
  var Arg6297_0 = Arg6297[0], Arg6297_1 = Arg6297[1], Arg6297_2 = Arg6297[2];
  return Shen.absvector_set(Arg6297_0, Arg6297_1, Arg6297_2)}, 3, [], "address->"];






Shen.call_toplevel(function js$dot$shen_js_toplevel4289(Arg4287) {
  if (Arg4287.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel4289, 0, Arg4287];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.process-datatype"], [[Shen.type_symbol, "regkl.type#context"], Shen.call(Shen.fns["compile"], [[Shen.type_symbol, "shen.<datatype-rules>"], [Shen.type_cons, [Shen.type_symbol, "Nregs"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "Toplevel"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "regkl.s-expr"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "_________"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "@v"], [Shen.type_cons, [Shen.type_symbol, "Toplevel"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "@v"], [Shen.type_cons, [Shen.type_symbol, "Nregs"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, 0, []]], []]]], []]]], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "regkl.context"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "regkl.context"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "_______________________"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "<-vector"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, 2, []]]], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "regkl.context"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "B"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "_______________________"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector->"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "B"], []]]]], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "regkl.context"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "regkl.context"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "_______________________"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "<-vector"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, 1, []]]], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "regkl.s-expr"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "regkl.context"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "B"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "regkl.s-expr"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "_______________________"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector->"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "B"], []]]]], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "regkl.context"], [Shen.type_cons, [Shen.type_symbol, ";"], []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]], [Shen.type_symbol, "shen.datatype-error"]])]);})});




Shen.fns["regkl.mk-context"] = [Shen.type_func, function shen_user_lambda4293(Arg4292) {
  if (Arg4292.length < 2) return [Shen.type_func, shen_user_lambda4293, 2, Arg4292];
  var Arg4292_0 = Arg4292[0], Arg4292_1 = Arg4292[1];
  return (function() {
  return Shen.call_tail(Shen.fns["@v"], [Arg4292_0, Shen.call(Shen.fns["@v"], [Arg4292_1, Shen.vector(0)])]);})}, 2, [], "regkl.mk-context"];





Shen.fns["regkl.context-nregs->"] = [Shen.type_func, function shen_user_lambda4297(Arg4296) {
  if (Arg4296.length < 2) return [Shen.type_func, shen_user_lambda4297, 2, Arg4296];
  var Arg4296_0 = Arg4296[0], Arg4296_1 = Arg4296[1];
  return (function() {
  return Shen.call_tail(Shen.fns["vector->"], [Arg4296_0, 2, Arg4296_1]);})}, 2, [], "regkl.context-nregs->"];





Shen.fns["regkl.context-toplevel->"] = [Shen.type_func, function shen_user_lambda4301(Arg4300) {
  if (Arg4300.length < 2) return [Shen.type_func, shen_user_lambda4301, 2, Arg4300];
  var Arg4300_0 = Arg4300[0], Arg4300_1 = Arg4300[1];
  return (function() {
  return Shen.call_tail(Shen.fns["vector->"], [Arg4300_0, 1, Arg4300_1]);})}, 2, [], "regkl.context-toplevel->"];





Shen.fns["regkl.context-nregs"] = [Shen.type_func, function shen_user_lambda4304(Arg4303) {
  if (Arg4303.length < 1) return [Shen.type_func, shen_user_lambda4304, 1, Arg4303];
  var Arg4303_0 = Arg4303[0];
  return (function() {
  return Shen.call_tail(Shen.fns["<-vector"], [Arg4303_0, 2]);})}, 1, [], "regkl.context-nregs"];





Shen.fns["regkl.context-toplevel"] = [Shen.type_func, function shen_user_lambda4307(Arg4306) {
  if (Arg4306.length < 1) return [Shen.type_func, shen_user_lambda4307, 1, Arg4306];
  var Arg4306_0 = Arg4306[0];
  return (function() {
  return Shen.call_tail(Shen.fns["<-vector"], [Arg4306_0, 1]);})}, 1, [], "regkl.context-toplevel"];





Shen.fns["regkl.var-idx-aux"] = [Shen.type_func, function shen_user_lambda4317(Arg4316) {
  if (Arg4316.length < 3) return [Shen.type_func, shen_user_lambda4317, 3, Arg4316];
  var Arg4316_0 = Arg4316[0], Arg4316_1 = Arg4316[1], Arg4316_2 = Arg4316[2];
  return ((Shen.empty$question$(Arg4316_2))
  ? (function() {
  return Shen.simple_error(("Unknown var: " + Shen.call(Shen.fns["shen.app"], [Arg4316_0, "\x0a", [Shen.type_symbol, "shen.a"]])));})
  : (((Shen.is_type(Arg4316_2, Shen.type_cons) && (Shen.is_type(Arg4316_2[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(Arg4316_2[1][1], Arg4316_0)))))
  ? Arg4316_2[1][2]
  : ((Shen.is_type(Arg4316_2, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.var-idx-aux"], [Arg4316_0, (Arg4316_1 + 1), Arg4316_2[2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "regkl.var-idx-aux"]]);}))))}, 3, [], "regkl.var-idx-aux"];





Shen.fns["regkl.var-idx"] = [Shen.type_func, function shen_user_lambda4321(Arg4320) {
  if (Arg4320.length < 2) return [Shen.type_func, shen_user_lambda4321, 2, Arg4320];
  var Arg4320_0 = Arg4320[0], Arg4320_1 = Arg4320[1];
  return (function() {
  return Shen.call_tail(Shen.fns["regkl.var-idx-aux"], [Arg4320_0, 0, Arg4320_1]);})}, 2, [], "regkl.var-idx"];





Shen.fns["regkl.new-var-idx-aux"] = [Shen.type_func, function shen_user_lambda4334(Arg4333) {
  if (Arg4333.length < 3) return [Shen.type_func, shen_user_lambda4334, 3, Arg4333];
  var Arg4333_0 = Arg4333[0], Arg4333_1 = Arg4333[1], Arg4333_2 = Arg4333[2];
  return ((Shen.empty$question$(Arg4333_2))
  ? Arg4333_1
  : (((Shen.is_type(Arg4333_2, Shen.type_cons) && (Shen.is_type(Arg4333_2[1], Shen.type_cons) && (Arg4333_2[1][2] < 0))))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.new-var-idx-aux"], [Arg4333_0, Arg4333_1, Arg4333_2[2]]);})
  : (((Shen.is_type(Arg4333_2, Shen.type_cons) && (Shen.is_type(Arg4333_2[1], Shen.type_cons) && (Arg4333_2[1][2] >= Arg4333_1))))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.new-var-idx-aux"], [Arg4333_0, (Arg4333_2[1][2] + 1), Arg4333_2[2]]);})
  : ((Shen.is_type(Arg4333_2, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.new-var-idx-aux"], [Arg4333_0, Arg4333_1, Arg4333_2[2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "regkl.new-var-idx-aux"]]);})))))}, 3, [], "regkl.new-var-idx-aux"];





Shen.fns["regkl.new-var-idx"] = [Shen.type_func, function shen_user_lambda4338(Arg4337) {
  if (Arg4337.length < 2) return [Shen.type_func, shen_user_lambda4338, 2, Arg4337];
  var Arg4337_0 = Arg4337[0], Arg4337_1 = Arg4337[1];
  return (function() {
  return Shen.call_tail(Shen.fns["regkl.new-var-idx-aux"], [Arg4337_0, 0, Arg4337_1]);})}, 2, [], "regkl.new-var-idx"];





Shen.fns["regkl.var-defined?"] = [Shen.type_func, function shen_user_lambda4356(Arg4355) {
  if (Arg4355.length < 2) return [Shen.type_func, shen_user_lambda4356, 2, Arg4355];
  var Arg4355_0 = Arg4355[0], Arg4355_1 = Arg4355[1];
  return ((Shen.empty$question$(Arg4355_1))
  ? false
  : (((Shen.is_type(Arg4355_1, Shen.type_cons) && (Shen.is_type(Arg4355_1[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(Arg4355_1[1][1], Arg4355_0)))))
  ? true
  : (((Shen.is_type(Arg4355_1, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(Arg4355_1[1], Arg4355_0))))
  ? true
  : ((Shen.is_type(Arg4355_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.var-defined?"], [Arg4355_0, Arg4355_1[2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "regkl.var-defined?"]]);})))))}, 2, [], "regkl.var-defined?"];





Shen.fns["regkl.used-vars-aux"] = [Shen.type_func, function shen_user_lambda4374(Arg4373) {
  if (Arg4373.length < 4) return [Shen.type_func, shen_user_lambda4374, 4, Arg4373];
  var Arg4373_0 = Arg4373[0], Arg4373_1 = Arg4373[1], Arg4373_2 = Arg4373[2], Arg4373_3 = Arg4373[3];
  var R0;
  return (((Shen.is_type(Arg4373_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "let"], Arg4373_0[1])) && (Shen.is_type(Arg4373_0[2], Shen.type_cons) && (Shen.is_type(Arg4373_0[2][2], Shen.type_cons) && (Shen.is_type(Arg4373_0[2][2][2], Shen.type_cons) && Shen.empty$question$(Arg4373_0[2][2][2][2])))))))
  ? ((R0 = Shen.call(Shen.fns["regkl.used-vars-aux"], [Arg4373_0[2][2][2][1], Arg4373_1, [Shen.type_cons, Arg4373_0[2][1], Arg4373_2], Arg4373_3])),
  (function() {
  return Shen.call_tail(Shen.fns["regkl.used-vars-aux"], [Arg4373_0[2][2][1], Arg4373_1, Arg4373_2, R0]);}))
  : (((Shen.is_type(Arg4373_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "lambda"], Arg4373_0[1])) && (Shen.is_type(Arg4373_0[2], Shen.type_cons) && (Shen.is_type(Arg4373_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg4373_0[2][2][2]))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.used-vars-aux"], [Arg4373_0[2][2][1], Arg4373_1, [Shen.type_cons, Arg4373_0[2][1], Arg4373_2], Arg4373_3]);})
  : ((Shen.is_type(Arg4373_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.used-vars-aux"], [Arg4373_0[1], Arg4373_1, Arg4373_2, Shen.call(Shen.fns["regkl.used-vars-aux"], [Arg4373_0[2], Arg4373_1, Arg4373_2, Arg4373_3])]);})
  : (((Shen.is_type(Arg4373_0, Shen.type_symbol) && ((!Shen.call(Shen.fns["regkl.var-defined?"], [Arg4373_0, Arg4373_2])) && Shen.call(Shen.fns["regkl.var-defined?"], [Arg4373_0, Arg4373_1]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["adjoin"], [Arg4373_0, Arg4373_3]);})
  : Arg4373_3))))}, 4, [], "regkl.used-vars-aux"];





Shen.fns["regkl.used-vars"] = [Shen.type_func, function shen_user_lambda4378(Arg4377) {
  if (Arg4377.length < 2) return [Shen.type_func, shen_user_lambda4378, 2, Arg4377];
  var Arg4377_0 = Arg4377[0], Arg4377_1 = Arg4377[1];
  return (function() {
  return Shen.call_tail(Shen.fns["regkl.used-vars-aux"], [Arg4377_0, Arg4377_1, [], []]);})}, 2, [], "regkl.used-vars"];





Shen.fns["regkl.remove-do"] = [Shen.type_func, function shen_user_lambda4381(Arg4380) {
  if (Arg4380.length < 1) return [Shen.type_func, shen_user_lambda4381, 1, Arg4380];
  var Arg4380_0 = Arg4380[0];
  return (((Shen.is_type(Arg4380_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "do"], Arg4380_0[1]))))
  ? Arg4380_0[2]
  : [Shen.type_cons, Arg4380_0, []])}, 1, [], "regkl.remove-do"];





Shen.fns["regkl.remove-duplicates-aux"] = [Shen.type_func, function shen_user_lambda4385(Arg4384) {
  if (Arg4384.length < 2) return [Shen.type_func, shen_user_lambda4385, 2, Arg4384];
  var Arg4384_0 = Arg4384[0], Arg4384_1 = Arg4384[1];
  return ((Shen.empty$question$(Arg4384_0))
  ? (function() {
  return Shen.call_tail(Shen.fns["reverse"], [Arg4384_1]);})
  : ((Shen.is_type(Arg4384_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.remove-duplicates-aux"], [Arg4384_0[2], Shen.call(Shen.fns["adjoin"], [Arg4384_0[1], Arg4384_1])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "regkl.remove-duplicates-aux"]]);})))}, 2, [], "regkl.remove-duplicates-aux"];





Shen.fns["regkl.remove-duplicates"] = [Shen.type_func, function shen_user_lambda4388(Arg4387) {
  if (Arg4387.length < 1) return [Shen.type_func, shen_user_lambda4388, 1, Arg4387];
  var Arg4387_0 = Arg4387[0];
  return (function() {
  return Shen.call_tail(Shen.fns["regkl.remove-duplicates-aux"], [Arg4387_0, []]);})}, 1, [], "regkl.remove-duplicates"];





Shen.fns["regkl.used-vars-cascade-aux"] = [Shen.type_func, function shen_user_lambda4398(Arg4397) {
  if (Arg4397.length < 4) return [Shen.type_func, shen_user_lambda4398, 4, Arg4397];
  var Arg4397_0 = Arg4397[0], Arg4397_1 = Arg4397[1], Arg4397_2 = Arg4397[2], Arg4397_3 = Arg4397[3];
  var R0;
  return ((Shen.empty$question$(Arg4397_0))
  ? Arg4397_3
  : ((Shen.is_type(Arg4397_0, Shen.type_cons))
  ? ((R0 = Shen.call(Shen.fns["regkl.used-vars-aux"], [Arg4397_0[1], Arg4397_1, [], Arg4397_2])),
  (function() {
  return Shen.call_tail(Shen.fns["regkl.used-vars-cascade-aux"], [Arg4397_0[2], Arg4397_1, R0, [Shen.type_cons, R0, Arg4397_3]]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "regkl.used-vars-cascade-aux"]]);})))}, 4, [], "regkl.used-vars-cascade-aux"];





Shen.fns["regkl.used-vars-cascade"] = [Shen.type_func, function shen_user_lambda4403(Arg4402) {
  if (Arg4402.length < 3) return [Shen.type_func, shen_user_lambda4403, 3, Arg4402];
  var Arg4402_0 = Arg4402[0], Arg4402_1 = Arg4402[1], Arg4402_2 = Arg4402[2];
  return (function() {
  return Shen.call_tail(Shen.fns["regkl.used-vars-cascade-aux"], [Shen.call(Shen.fns["reverse"], [Arg4402_0]), Arg4402_1, Arg4402_2, []]);})}, 3, [], "regkl.used-vars-cascade"];





Shen.fns["regkl.mk-set-reg"] = [Shen.type_func, function shen_user_lambda4408(Arg4407) {
  if (Arg4407.length < 2) return [Shen.type_func, shen_user_lambda4408, 2, Arg4407];
  var Arg4407_0 = Arg4407[0], Arg4407_1 = Arg4407[1];
  return (((Arg4407_0 < 0))
  ? (function() {
  return Shen.simple_error("Cannot set function argument\x0a");})
  : [Shen.type_cons, [Shen.type_symbol, "regkl.reg->"], [Shen.type_cons, Arg4407_0, [Shen.type_cons, Arg4407_1, []]]])}, 2, [], "regkl.mk-set-reg"];





Shen.fns["regkl.mk-get-reg"] = [Shen.type_func, function shen_user_lambda4411(Arg4410) {
  if (Arg4410.length < 1) return [Shen.type_func, shen_user_lambda4411, 1, Arg4410];
  var Arg4410_0 = Arg4410[0];
  return (((Arg4410_0 < 0))
  ? [Shen.type_cons, [Shen.type_symbol, "regkl.arg"], [Shen.type_cons, ((0 - Arg4410_0) - 1), []]]
  : [Shen.type_cons, [Shen.type_symbol, "regkl.reg"], [Shen.type_cons, Arg4410_0, []]])}, 1, [], "regkl.mk-get-reg"];





Shen.fns["regkl.reuse-idx"] = [Shen.type_func, function shen_user_lambda4420(Arg4419) {
  if (Arg4419.length < 2) return [Shen.type_func, shen_user_lambda4420, 2, Arg4419];
  var Arg4419_0 = Arg4419[0], Arg4419_1 = Arg4419[1];
  return ((Shen.empty$question$(Arg4419_1))
  ? Shen.fail_obj
  : (((Shen.is_type(Arg4419_1, Shen.type_cons) && (Shen.is_type(Arg4419_1[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$(Arg4419_1[1][1], Arg4419_0)) && (Arg4419_1[1][2] >= 0)))))
  ? Arg4419_1[1][2]
  : ((Shen.is_type(Arg4419_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.reuse-idx"], [Arg4419_0, Arg4419_1[2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "regkl.reuse-idx"]]);}))))}, 2, [], "regkl.reuse-idx"];





Shen.fns["regkl.new-var-idx-or-reuse"] = [Shen.type_func, function shen_user_lambda4425(Arg4424) {
  if (Arg4424.length < 3) return [Shen.type_func, shen_user_lambda4425, 3, Arg4424];
  var Arg4424_0 = Arg4424[0], Arg4424_1 = Arg4424[1], Arg4424_2 = Arg4424[2];
  var R0, R1;
  return ((Shen.empty$question$(Arg4424_2))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.new-var-idx"], [Arg4424_0, Arg4424_1]);})
  : ((R0 = [Shen.type_func, function shen_user_lambda4427(Arg4426) {
  if (Arg4426.length < 3) return [Shen.type_func, shen_user_lambda4427, 3, Arg4426];
  var Arg4426_0 = Arg4426[0], Arg4426_1 = Arg4426[1], Arg4426_2 = Arg4426[2];
  return ((Shen.is_type(Arg4426_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.new-var-idx-or-reuse"], [Arg4426_0, Arg4426_2, Arg4426_1[2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "regkl.new-var-idx-or-reuse"]]);}))}, 3, [Arg4424_0, Arg4424_2, Arg4424_1], undefined]),
  ((Shen.is_type(Arg4424_2, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["regkl.reuse-idx"], [Arg4424_2[1], Arg4424_1])),
  ((Shen.unwind_tail(Shen.$eq$(R1, Shen.fail_obj)))
  ? Shen.thaw(R0)
  : R1))
  : Shen.thaw(R0))))}, 3, [], "regkl.new-var-idx-or-reuse"];





Shen.fns["regkl.add-var-aux"] = [Shen.type_func, function shen_user_lambda4434(Arg4433) {
  if (Arg4433.length < 4) return [Shen.type_func, shen_user_lambda4434, 4, Arg4433];
  var Arg4433_0 = Arg4433[0], Arg4433_1 = Arg4433[1], Arg4433_2 = Arg4433[2], Arg4433_3 = Arg4433[3];
  return ((Shen.empty$question$(Arg4433_2))
  ? [Shen.type_cons, [Shen.type_cons, Arg4433_0, Arg4433_1], Shen.call(Shen.fns["reverse"], [Arg4433_3])]
  : (((Shen.is_type(Arg4433_2, Shen.type_cons) && (Shen.is_type(Arg4433_2[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(Arg4433_2[1][2], Arg4433_1)))))
  ? (function() {
  return Shen.call_tail(Shen.fns["append"], [Shen.call(Shen.fns["reverse"], [[Shen.type_cons, [Shen.type_cons, Arg4433_0, Arg4433_2[1][2]], Arg4433_3]]), Arg4433_2[2]]);})
  : ((Shen.is_type(Arg4433_2, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.add-var-aux"], [Arg4433_0, Arg4433_1, Arg4433_2[2], [Shen.type_cons, Arg4433_2[1], Arg4433_3]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "regkl.add-var-aux"]]);}))))}, 4, [], "regkl.add-var-aux"];





Shen.fns["regkl.add-var"] = [Shen.type_func, function shen_user_lambda4439(Arg4438) {
  if (Arg4438.length < 3) return [Shen.type_func, shen_user_lambda4439, 3, Arg4438];
  var Arg4438_0 = Arg4438[0], Arg4438_1 = Arg4438[1], Arg4438_2 = Arg4438[2];
  return (function() {
  return Shen.call_tail(Shen.fns["regkl.add-var-aux"], [Arg4438_0, Arg4438_1, Arg4438_2, []]);})}, 3, [], "regkl.add-var"];





Shen.fns["regkl.max"] = [Shen.type_func, function shen_user_lambda4447(Arg4446) {
  if (Arg4446.length < 2) return [Shen.type_func, shen_user_lambda4447, 2, Arg4446];
  var Arg4446_0 = Arg4446[0], Arg4446_1 = Arg4446[1];
  return (((Arg4446_0 > Arg4446_1))
  ? Arg4446_0
  : Arg4446_1)}, 2, [], "regkl.max"];





Shen.fns["regkl.setreg-unexpr"] = [Shen.type_func, function shen_user_lambda4452(Arg4451) {
  if (Arg4451.length < 3) return [Shen.type_func, shen_user_lambda4452, 3, Arg4451];
  var Arg4451_0 = Arg4451[0], Arg4451_1 = Arg4451[1], Arg4451_2 = Arg4451[2];
  return (((Shen.is_type(Arg4451_1, Shen.type_cons) && Shen.empty$question$(Arg4451_1[2])))
  ? (function() {
  return Shen.call_tail(Shen.fns["reverse"], [[Shen.type_cons, Shen.call(Shen.fns["regkl.mk-set-reg"], [Arg4451_0, Arg4451_1[1]]), Arg4451_2]]);})
  : ((Shen.is_type(Arg4451_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.setreg-unexpr"], [Arg4451_0, Arg4451_1[2], [Shen.type_cons, Arg4451_1[1], Arg4451_2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["regkl.mk-set-reg"], [Arg4451_0, Arg4451_1]);})))}, 3, [], "regkl.setreg-unexpr"];





Shen.fns["regkl.setreg-do-expr"] = [Shen.type_func, function shen_user_lambda4461(Arg4460) {
  if (Arg4460.length < 3) return [Shen.type_func, shen_user_lambda4461, 3, Arg4460];
  var Arg4460_0 = Arg4460[0], Arg4460_1 = Arg4460[1], Arg4460_2 = Arg4460[2];
  return ((Shen.empty$question$(Arg4460_1))
  ? (function() {
  return Shen.simple_error("Broken `do` expression.");})
  : (((Shen.is_type(Arg4460_1, Shen.type_cons) && Shen.empty$question$(Arg4460_1[2])))
  ? (function() {
  return Shen.call_tail(Shen.fns["reverse"], [[Shen.type_cons, Shen.call(Shen.fns["regkl.mk-set-reg-unexpr"], [Arg4460_0, Arg4460_1[1]]), Arg4460_2]]);})
  : ((Shen.is_type(Arg4460_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.setreg-do-expr"], [Arg4460_0, Arg4460_1[2], [Shen.type_cons, Arg4460_1[1], Arg4460_2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "regkl.setreg-do-expr"]]);}))))}, 3, [], "regkl.setreg-do-expr"];





Shen.fns["regkl.mk-set-reg-unexpr"] = [Shen.type_func, function shen_user_lambda4465(Arg4464) {
  if (Arg4464.length < 2) return [Shen.type_func, shen_user_lambda4465, 2, Arg4464];
  var Arg4464_0 = Arg4464[0], Arg4464_1 = Arg4464[1];
  var R0, R1;
  return (((Shen.is_type(Arg4464_1, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "do"], Arg4464_1[1]))))
  ? [Shen.type_cons, [Shen.type_symbol, "do"], Shen.call(Shen.fns["regkl.setreg-do-expr"], [Arg4464_0, Arg4464_1[2], []])]
  : (((Shen.is_type(Arg4464_1, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "if"], Arg4464_1[1])) && (Shen.is_type(Arg4464_1[2], Shen.type_cons) && (Shen.is_type(Arg4464_1[2][2], Shen.type_cons) && (Shen.is_type(Arg4464_1[2][2][2], Shen.type_cons) && Shen.empty$question$(Arg4464_1[2][2][2][2])))))))
  ? ((R0 = Shen.call(Shen.fns["regkl.mk-set-reg-unexpr"], [Arg4464_0, Arg4464_1[2][2][1]])),
  (R1 = Shen.call(Shen.fns["regkl.mk-set-reg-unexpr"], [Arg4464_0, Arg4464_1[2][2][2][1]])),
  [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, Arg4464_1[2][1], [Shen.type_cons, R0, [Shen.type_cons, R1, []]]]])
  : (function() {
  return Shen.call_tail(Shen.fns["regkl.mk-set-reg"], [Arg4464_0, Arg4464_1]);})))}, 2, [], "regkl.mk-set-reg-unexpr"];





Shen.fns["regkl.walk-let-expr"] = [Shen.type_func, function shen_user_lambda4483(Arg4482) {
  if (Arg4482.length < 8) return [Shen.type_func, shen_user_lambda4483, 8, Arg4482];
  var Arg4482_0 = Arg4482[0], Arg4482_1 = Arg4482[1], Arg4482_2 = Arg4482[2], Arg4482_3 = Arg4482[3], Arg4482_4 = Arg4482[4], Arg4482_5 = Arg4482[5], Arg4482_6 = Arg4482[6], Arg4482_7 = Arg4482[7];
  var R0, R1, R2;
  return ((Shen.unwind_tail(Shen.$eq$(true, Arg4482_7)))
  ? ((R0 = Shen.call(Shen.fns["remove"], [Arg4482_0, Arg4482_3])),
  (R0 = Shen.call(Shen.fns["append"], [R0, Arg4482_5])),
  (R1 = Shen.call(Shen.fns["difference"], [Shen.call(Shen.fns["map"], [[Shen.type_symbol, "head"], Arg4482_2]), R0])),
  (R1 = Shen.call(Shen.fns["regkl.new-var-idx-or-reuse"], [Arg4482_0, Arg4482_2, R1])),
  Shen.call(Shen.fns["regkl.context-nregs->"], [Arg4482_6, Shen.call(Shen.fns["regkl.max"], [(R1 + 1), Shen.call(Shen.fns["regkl.context-nregs"], [Arg4482_6])])]),
  (R2 = Shen.call(Shen.fns["regkl.add-var"], [Arg4482_0, R1, Arg4482_2])),
  (R0 = Shen.call(Shen.fns["regkl.walk-expr"], [Arg4482_1, Arg4482_2, Arg4482_4, R0, Arg4482_6])),
  [Shen.fns['shen.tuple'], Shen.call(Shen.fns["regkl.mk-set-reg-unexpr"], [R1, R0]), R2])
  : ((Shen.unwind_tail(Shen.$eq$(false, Arg4482_7)))
  ? [Shen.fns['shen.tuple'], Shen.call(Shen.fns["regkl.walk-expr"], [Arg4482_1, Arg4482_2, Arg4482_4, Arg4482_5, Arg4482_6]), Arg4482_2]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "regkl.walk-let-expr"]]);})))}, 8, [], "regkl.walk-let-expr"];





Shen.fns["regkl.walk-let"] = [Shen.type_func, function shen_user_lambda4492(Arg4491) {
  if (Arg4491.length < 7) return [Shen.type_func, shen_user_lambda4492, 7, Arg4491];
  var Arg4491_0 = Arg4491[0], Arg4491_1 = Arg4491[1], Arg4491_2 = Arg4491[2], Arg4491_3 = Arg4491[3], Arg4491_4 = Arg4491[4], Arg4491_5 = Arg4491[5], Arg4491_6 = Arg4491[6];
  var R0, R1, R2;
  return ((R0 = Shen.call(Shen.fns["regkl.used-vars"], [Arg4491_2, [Shen.type_cons, Arg4491_0, Arg4491_3]])),
  (R1 = Shen.call(Shen.fns["element?"], [Arg4491_0, R0])),
  (R1 = Shen.call(Shen.fns["regkl.walk-let-expr"], [Arg4491_0, Arg4491_1, Arg4491_3, R0, Arg4491_4, Arg4491_5, Arg4491_6, R1])),
  (R2 = Shen.call(Shen.fns["fst"], [R1])),
  (R1 = Shen.call(Shen.fns["snd"], [R1])),
  (R1 = Shen.call(Shen.fns["regkl.remove-do"], [Shen.call(Shen.fns["regkl.walk-expr"], [Arg4491_2, R1, Shen.call(Shen.fns["append"], [R0, Arg4491_5]), Arg4491_5, Arg4491_6])])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? (R2 = [Shen.type_cons, R2, R1])
  : (R2 = R1)),
  [Shen.type_cons, [Shen.type_symbol, "do"], R2])}, 7, [], "regkl.walk-let"];





Shen.fns["regkl.walk-do-aux"] = [Shen.type_func, function shen_user_lambda4506(Arg4505) {
  if (Arg4505.length < 6) return [Shen.type_func, shen_user_lambda4506, 6, Arg4505];
  var Arg4505_0 = Arg4505[0], Arg4505_1 = Arg4505[1], Arg4505_2 = Arg4505[2], Arg4505_3 = Arg4505[3], Arg4505_4 = Arg4505[4], Arg4505_5 = Arg4505[5];
  var R0, R1;
  return (((Shen.empty$question$(Arg4505_0) && Shen.empty$question$(Arg4505_2)))
  ? Arg4505_5
  : (((Shen.is_type(Arg4505_0, Shen.type_cons) && (Shen.empty$question$(Arg4505_0[2]) && (Shen.is_type(Arg4505_2, Shen.type_cons) && Shen.empty$question$(Arg4505_2[2])))))
  ? ((R0 = Shen.call(Shen.fns["regkl.walk-expr"], [Arg4505_0[1], Arg4505_1, Arg4505_2[1], Arg4505_3, Arg4505_4])),
  (R0 = Shen.call(Shen.fns["append"], [Arg4505_5, Shen.call(Shen.fns["regkl.remove-do"], [R0])])),
  (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-do-aux"], [[], Arg4505_1, [], Arg4505_3, Arg4505_4, R0]);}))
  : (((Shen.is_type(Arg4505_0, Shen.type_cons) && (Shen.is_type(Arg4505_2, Shen.type_cons) && Shen.is_type(Arg4505_2[2], Shen.type_cons))))
  ? ((R0 = Shen.call(Shen.fns["regkl.walk-expr"], [Arg4505_0[1], Arg4505_1, Arg4505_2[1], Arg4505_2[2][1], Arg4505_4])),
  (R0 = Shen.call(Shen.fns["append"], [Arg4505_5, Shen.call(Shen.fns["regkl.remove-do"], [R0])])),
  (R1 = Arg4505_2[2]),
  (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-do-aux"], [Arg4505_0[2], Arg4505_1, R1, Arg4505_3, Arg4505_4, R0]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "regkl.walk-do-aux"]]);}))))}, 6, [], "regkl.walk-do-aux"];





Shen.fns["regkl.walk-do"] = [Shen.type_func, function shen_user_lambda4513(Arg4512) {
  if (Arg4512.length < 5) return [Shen.type_func, shen_user_lambda4513, 5, Arg4512];
  var Arg4512_0 = Arg4512[0], Arg4512_1 = Arg4512[1], Arg4512_2 = Arg4512[2], Arg4512_3 = Arg4512[3], Arg4512_4 = Arg4512[4];
  var R0;
  return ((R0 = Shen.call(Shen.fns["regkl.used-vars-cascade"], [Arg4512_0, Arg4512_1, Arg4512_2])),
  (R0 = Shen.call(Shen.fns["regkl.walk-do-aux"], [Arg4512_0, Arg4512_1, R0, Arg4512_3, Arg4512_4, []])),
  [Shen.type_cons, [Shen.type_symbol, "do"], R0])}, 5, [], "regkl.walk-do"];





Shen.fns["regkl.walk-apply-aux"] = [Shen.type_func, function shen_user_lambda4527(Arg4526) {
  if (Arg4526.length < 6) return [Shen.type_func, shen_user_lambda4527, 6, Arg4526];
  var Arg4526_0 = Arg4526[0], Arg4526_1 = Arg4526[1], Arg4526_2 = Arg4526[2], Arg4526_3 = Arg4526[3], Arg4526_4 = Arg4526[4], Arg4526_5 = Arg4526[5];
  var R0;
  return (((Shen.empty$question$(Arg4526_0) && Shen.empty$question$(Arg4526_2)))
  ? (function() {
  return Shen.call_tail(Shen.fns["reverse"], [Arg4526_5]);})
  : (((Shen.is_type(Arg4526_0, Shen.type_cons) && (Shen.empty$question$(Arg4526_0[2]) && (Shen.is_type(Arg4526_2, Shen.type_cons) && Shen.empty$question$(Arg4526_2[2])))))
  ? ((R0 = Shen.call(Shen.fns["regkl.walk-expr"], [Arg4526_0[1], Arg4526_1, Arg4526_2[1], Arg4526_3, Arg4526_4])),
  (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-apply-aux"], [[], Arg4526_1, [], Arg4526_3, Arg4526_4, [Shen.type_cons, R0, Arg4526_5]]);}))
  : (((Shen.is_type(Arg4526_0, Shen.type_cons) && (Shen.is_type(Arg4526_2, Shen.type_cons) && Shen.is_type(Arg4526_2[2], Shen.type_cons))))
  ? ((R0 = Shen.call(Shen.fns["regkl.walk-expr"], [Arg4526_0[1], Arg4526_1, Arg4526_2[1], Arg4526_2[2][1], Arg4526_4])),
  (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-apply-aux"], [Arg4526_0[2], Arg4526_1, Arg4526_2[2], Arg4526_3, Arg4526_4, [Shen.type_cons, R0, Arg4526_5]]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "regkl.walk-apply-aux"]]);}))))}, 6, [], "regkl.walk-apply-aux"];





Shen.fns["regkl.walk-apply"] = [Shen.type_func, function shen_user_lambda4534(Arg4533) {
  if (Arg4533.length < 5) return [Shen.type_func, shen_user_lambda4534, 5, Arg4533];
  var Arg4533_0 = Arg4533[0], Arg4533_1 = Arg4533[1], Arg4533_2 = Arg4533[2], Arg4533_3 = Arg4533[3], Arg4533_4 = Arg4533[4];
  var R0;
  return ((R0 = Shen.call(Shen.fns["regkl.used-vars-cascade"], [Arg4533_0, Arg4533_1, Arg4533_2])),
  (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-apply-aux"], [Arg4533_0, Arg4533_1, R0, Arg4533_3, Arg4533_4, []]);}))}, 5, [], "regkl.walk-apply"];





Shen.fns["regkl.walk-if"] = [Shen.type_func, function shen_user_lambda4543(Arg4542) {
  if (Arg4542.length < 7) return [Shen.type_func, shen_user_lambda4543, 7, Arg4542];
  var Arg4542_0 = Arg4542[0], Arg4542_1 = Arg4542[1], Arg4542_2 = Arg4542[2], Arg4542_3 = Arg4542[3], Arg4542_4 = Arg4542[4], Arg4542_5 = Arg4542[5], Arg4542_6 = Arg4542[6];
  var R0, R1, R2;
  return ((R0 = Shen.call(Shen.fns["regkl.used-vars-aux"], [Arg4542_1, Arg4542_3, [], Arg4542_5])),
  (R1 = Shen.call(Shen.fns["regkl.used-vars-aux"], [Arg4542_2, Arg4542_3, [], Arg4542_5])),
  (R2 = Shen.call(Shen.fns["append"], [R0, R1])),
  (R2 = Shen.call(Shen.fns["regkl.walk-expr"], [Arg4542_0, Arg4542_3, Arg4542_4, R2, Arg4542_6])),
  (R0 = Shen.call(Shen.fns["regkl.walk-expr"], [Arg4542_1, Arg4542_3, R0, Arg4542_5, Arg4542_6])),
  (R1 = Shen.call(Shen.fns["regkl.walk-expr"], [Arg4542_2, Arg4542_3, R1, Arg4542_5, Arg4542_6])),
  [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, R2, [Shen.type_cons, R0, [Shen.type_cons, R1, []]]]])}, 7, [], "regkl.walk-if"];





Shen.fns["regkl.walk-cond"] = [Shen.type_func, function shen_user_lambda4558(Arg4557) {
  if (Arg4557.length < 5) return [Shen.type_func, shen_user_lambda4558, 5, Arg4557];
  var Arg4557_0 = Arg4557[0], Arg4557_1 = Arg4557[1], Arg4557_2 = Arg4557[2], Arg4557_3 = Arg4557[3], Arg4557_4 = Arg4557[4];
  var R0, R1, R2;
  return ((Shen.empty$question$(Arg4557_0))
  ? [Shen.type_cons, [Shen.type_symbol, "error"], [Shen.type_cons, "error: cond failure", []]]
  : (((Shen.is_type(Arg4557_0, Shen.type_cons) && (Shen.is_type(Arg4557_0[1], Shen.type_cons) && (Shen.is_type(Arg4557_0[1][2], Shen.type_cons) && Shen.empty$question$(Arg4557_0[1][2][2])))))
  ? ((R0 = Shen.call(Shen.fns["regkl.used-vars-aux"], [Arg4557_0[1][2][1], Arg4557_1, [], Arg4557_3])),
  (R1 = Shen.call(Shen.fns["regkl.used-vars-aux"], [Arg4557_0[2], Arg4557_1, [], Arg4557_3])),
  (R0 = Shen.call(Shen.fns["regkl.used-vars-aux"], [Arg4557_0[1][1], Arg4557_1, [], Shen.call(Shen.fns["append"], [R0, R1])])),
  (R2 = Shen.call(Shen.fns["regkl.walk-cond"], [Arg4557_0[2], Arg4557_1, Arg4557_2, Arg4557_3, Arg4557_4])),
  (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-if"], [Arg4557_0[1][1], Arg4557_0[1][2][1], R2, Arg4557_1, R0, R1, Arg4557_4]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "regkl.walk-cond"]]);})))}, 5, [], "regkl.walk-cond"];





Shen.fns["regkl.mk-closure-args-init"] = [Shen.type_func, function shen_user_lambda4565(Arg4564) {
  if (Arg4564.length < 3) return [Shen.type_func, shen_user_lambda4565, 3, Arg4564];
  var Arg4564_0 = Arg4564[0], Arg4564_1 = Arg4564[1], Arg4564_2 = Arg4564[2];
  var R0;
  return ((Shen.empty$question$(Arg4564_0))
  ? (function() {
  return Shen.call_tail(Shen.fns["reverse"], [Arg4564_2]);})
  : ((Shen.is_type(Arg4564_0, Shen.type_cons))
  ? ((R0 = Shen.call(Shen.fns["regkl.mk-get-reg"], [Shen.call(Shen.fns["regkl.var-idx"], [Arg4564_0[1], Arg4564_1])])),
  (function() {
  return Shen.call_tail(Shen.fns["regkl.mk-closure-args-init"], [Arg4564_0[2], Arg4564_1, [Shen.type_cons, R0, Arg4564_2]]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "regkl.mk-closure-args-init"]]);})))}, 3, [], "regkl.mk-closure-args-init"];





Shen.fns["regkl.mk-closure-env"] = [Shen.type_func, function shen_user_lambda4569(Arg4568) {
  if (Arg4568.length < 2) return [Shen.type_func, shen_user_lambda4569, 2, Arg4568];
  var Arg4568_0 = Arg4568[0], Arg4568_1 = Arg4568[1];
  return ((Shen.empty$question$(Arg4568_0))
  ? Arg4568_1
  : ((Shen.is_type(Arg4568_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.mk-closure-env"], [Arg4568_0[2], [Shen.type_cons, [Shen.type_cons, Arg4568_0[1], Shen.call(Shen.fns["regkl.new-var-idx"], [Arg4568_0[1], Arg4568_1])], Arg4568_1]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "regkl.mk-closure-env"]]);})))}, 2, [], "regkl.mk-closure-env"];





Shen.fns["regkl.mk-closure-list"] = [Shen.type_func, function shen_user_lambda4576(Arg4575) {
  if (Arg4575.length < 5) return [Shen.type_func, shen_user_lambda4576, 5, Arg4575];
  var Arg4575_0 = Arg4575[0], Arg4575_1 = Arg4575[1], Arg4575_2 = Arg4575[2], Arg4575_3 = Arg4575[3], Arg4575_4 = Arg4575[4];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["regkl.mk-closure-env"], [Arg4575_3, []])),
  (R1 = Shen.call(Shen.fns["regkl.mk-closure-args-init"], [Arg4575_3, Arg4575_2, []])),
  (R0 = Shen.call(Shen.fns["regkl.mk-function-kl"], [Arg4575_0, Arg4575_1, R0, Arg4575_4])),
  [Shen.type_cons, R1, [Shen.type_cons, R0, []]])}, 5, [], "regkl.mk-closure-list"];





Shen.fns["regkl.walk-lambda-aux"] = [Shen.type_func, function shen_user_lambda4584(Arg4583) {
  if (Arg4583.length < 6) return [Shen.type_func, shen_user_lambda4584, 6, Arg4583];
  var Arg4583_0 = Arg4583[0], Arg4583_1 = Arg4583[1], Arg4583_2 = Arg4583[2], Arg4583_3 = Arg4583[3], Arg4583_4 = Arg4583[4], Arg4583_5 = Arg4583[5];
  var R0, R1;
  return (((Shen.is_type(Arg4583_1, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "lambda"], Arg4583_1[1])) && (Shen.is_type(Arg4583_1[2], Shen.type_cons) && (Shen.is_type(Arg4583_1[2][2], Shen.type_cons) && Shen.empty$question$(Arg4583_1[2][2][2]))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-lambda-aux"], [Arg4583_1[2][1], Arg4583_1[2][2][1], [Shen.type_cons, Arg4583_0, Arg4583_2], Arg4583_3, Arg4583_4, Arg4583_5]);})
  : ((R0 = Shen.call(Shen.fns["reverse"], [[Shen.type_cons, Arg4583_0, Arg4583_2]])),
  (R1 = Shen.call(Shen.fns["append"], [Arg4583_4, R0])),
  (R1 = Shen.call(Shen.fns["regkl.mk-closure-list"], [R1, Arg4583_1, Arg4583_3, Arg4583_4, Arg4583_5])),
  [Shen.type_cons, [Shen.type_symbol, "regkl.closure"], [Shen.type_cons, R0, [Shen.type_cons, Shen.call(Shen.fns["regkl.context-nregs"], [Arg4583_5]), R1]]]))}, 6, [], "regkl.walk-lambda-aux"];





Shen.fns["regkl.walk-lambda"] = [Shen.type_func, function shen_user_lambda4591(Arg4590) {
  if (Arg4590.length < 5) return [Shen.type_func, shen_user_lambda4591, 5, Arg4590];
  var Arg4590_0 = Arg4590[0], Arg4590_1 = Arg4590[1], Arg4590_2 = Arg4590[2], Arg4590_3 = Arg4590[3], Arg4590_4 = Arg4590[4];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["regkl.used-vars"], [[Shen.type_cons, [Shen.type_symbol, "lambda"], [Shen.type_cons, Arg4590_0, [Shen.type_cons, Arg4590_1, []]]], Arg4590_3])),
  (R1 = Shen.call(Shen.fns["regkl.mk-context"], [Shen.call(Shen.fns["regkl.context-toplevel"], [Arg4590_4]), 0])),
  (R0 = Shen.call(Shen.fns["regkl.walk-lambda-aux"], [Arg4590_0, Arg4590_1, Arg4590_2, Arg4590_3, R0, R1])),
  Shen.call(Shen.fns["regkl.context-toplevel->"], [Arg4590_4, Shen.call(Shen.fns["regkl.context-toplevel"], [R1])]),
  R0)}, 5, [], "regkl.walk-lambda"];





Shen.fns["regkl.walk-freeze"] = [Shen.type_func, function shen_user_lambda4597(Arg4596) {
  if (Arg4596.length < 4) return [Shen.type_func, shen_user_lambda4597, 4, Arg4596];
  var Arg4596_0 = Arg4596[0], Arg4596_1 = Arg4596[1], Arg4596_2 = Arg4596[2], Arg4596_3 = Arg4596[3];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["regkl.mk-context"], [Shen.call(Shen.fns["regkl.context-toplevel"], [Arg4596_3]), 0])),
  (R1 = Shen.call(Shen.fns["regkl.mk-closure-list"], [Arg4596_2, Arg4596_0, Arg4596_1, Arg4596_2, R0])),
  Shen.call(Shen.fns["regkl.context-toplevel->"], [Arg4596_3, Shen.call(Shen.fns["regkl.context-toplevel"], [R0])]),
  [Shen.type_cons, [Shen.type_symbol, "regkl.freeze"], [Shen.type_cons, Shen.call(Shen.fns["regkl.context-nregs"], [R0]), R1]])}, 4, [], "regkl.walk-freeze"];





Shen.fns["regkl.lift-defun"] = [Shen.type_func, function shen_user_lambda4603(Arg4602) {
  if (Arg4602.length < 4) return [Shen.type_func, shen_user_lambda4603, 4, Arg4602];
  var Arg4602_0 = Arg4602[0], Arg4602_1 = Arg4602[1], Arg4602_2 = Arg4602[2], Arg4602_3 = Arg4602[3];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["regkl.mk-context"], [Shen.call(Shen.fns["regkl.context-toplevel"], [Arg4602_3]), 0])),
  (R1 = Shen.call(Shen.fns["regkl.mk-defun-kl"], [Arg4602_0, Arg4602_1, Arg4602_2, [], R0])),
  Shen.call(Shen.fns["regkl.context-toplevel->"], [Arg4602_3, [Shen.type_cons, R1, Shen.call(Shen.fns["regkl.context-toplevel"], [R0])]]),
  [Shen.type_cons, [Shen.type_symbol, "function"], [Shen.type_cons, Arg4602_0, []]])}, 4, [], "regkl.lift-defun"];





Shen.fns["regkl.walk-trap"] = [Shen.type_func, function shen_user_lambda4611(Arg4610) {
  if (Arg4610.length < 6) return [Shen.type_func, shen_user_lambda4611, 6, Arg4610];
  var Arg4610_0 = Arg4610[0], Arg4610_1 = Arg4610[1], Arg4610_2 = Arg4610[2], Arg4610_3 = Arg4610[3], Arg4610_4 = Arg4610[4], Arg4610_5 = Arg4610[5];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "Shenkl."]])),
  (R1 = Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "Shenkl."]])),
  (R1 = [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, R0, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "freeze"], [Shen.type_cons, Arg4610_0, []]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, R1, [Shen.type_cons, Arg4610_1, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "regkl.trap-error"], [Shen.type_cons, R0, [Shen.type_cons, R1, []]]], []]]]], []]]]]),
  (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-expr"], [R1, Arg4610_2, Arg4610_3, Arg4610_4, Arg4610_5]);}))}, 6, [], "regkl.walk-trap"];





Shen.fns["regkl.walk-expr"] = [Shen.type_func, function shen_user_lambda4649(Arg4648) {
  if (Arg4648.length < 5) return [Shen.type_func, shen_user_lambda4649, 5, Arg4648];
  var Arg4648_0 = Arg4648[0], Arg4648_1 = Arg4648[1], Arg4648_2 = Arg4648[2], Arg4648_3 = Arg4648[3], Arg4648_4 = Arg4648[4];
  return (((Shen.is_type(Arg4648_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "let"], Arg4648_0[1])) && (Shen.is_type(Arg4648_0[2], Shen.type_cons) && (Shen.is_type(Arg4648_0[2][2], Shen.type_cons) && (Shen.is_type(Arg4648_0[2][2][2], Shen.type_cons) && Shen.empty$question$(Arg4648_0[2][2][2][2])))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-let"], [Arg4648_0[2][1], Arg4648_0[2][2][1], Arg4648_0[2][2][2][1], Arg4648_1, Arg4648_2, Arg4648_3, Arg4648_4]);})
  : (((Shen.is_type(Arg4648_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "if"], Arg4648_0[1])) && (Shen.is_type(Arg4648_0[2], Shen.type_cons) && (Shen.is_type(Arg4648_0[2][2], Shen.type_cons) && (Shen.is_type(Arg4648_0[2][2][2], Shen.type_cons) && Shen.empty$question$(Arg4648_0[2][2][2][2])))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-if"], [Arg4648_0[2][1], Arg4648_0[2][2][1], Arg4648_0[2][2][2][1], Arg4648_1, Arg4648_2, Arg4648_3, Arg4648_4]);})
  : (((Shen.is_type(Arg4648_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cond"], Arg4648_0[1]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-cond"], [Arg4648_0[2], Arg4648_1, Arg4648_2, Arg4648_3, Arg4648_4]);})
  : (((Shen.is_type(Arg4648_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "do"], Arg4648_0[1]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-do"], [Arg4648_0[2], Arg4648_1, Arg4648_2, Arg4648_3, Arg4648_4]);})
  : (((Shen.is_type(Arg4648_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "lambda"], Arg4648_0[1])) && (Shen.is_type(Arg4648_0[2], Shen.type_cons) && (Shen.is_type(Arg4648_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg4648_0[2][2][2]))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-lambda"], [Arg4648_0[2][1], Arg4648_0[2][2][1], [], Arg4648_1, Arg4648_4]);})
  : (((Shen.is_type(Arg4648_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "freeze"], Arg4648_0[1])) && (Shen.is_type(Arg4648_0[2], Shen.type_cons) && Shen.empty$question$(Arg4648_0[2][2])))))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-freeze"], [Arg4648_0[2][1], Arg4648_1, Arg4648_2, Arg4648_4]);})
  : (((Shen.is_type(Arg4648_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "defun"], Arg4648_0[1])) && (Shen.is_type(Arg4648_0[2], Shen.type_cons) && (Shen.is_type(Arg4648_0[2][2], Shen.type_cons) && (Shen.is_type(Arg4648_0[2][2][2], Shen.type_cons) && Shen.empty$question$(Arg4648_0[2][2][2][2])))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.lift-defun"], [Arg4648_0[2][1], Arg4648_0[2][2][1], Arg4648_0[2][2][2][1], Arg4648_4]);})
  : (((Shen.is_type(Arg4648_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "trap-error"], Arg4648_0[1])) && (Shen.is_type(Arg4648_0[2], Shen.type_cons) && (Shen.is_type(Arg4648_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg4648_0[2][2][2]))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-trap"], [Arg4648_0[2][1], Arg4648_0[2][2][1], Arg4648_1, Arg4648_2, Arg4648_3, Arg4648_4]);})
  : ((Shen.is_type(Arg4648_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-apply"], [Arg4648_0, Arg4648_1, Arg4648_2, Arg4648_3, Arg4648_4]);})
  : (((Shen.call(Shen.fns["regkl.var-defined?"], [Arg4648_0, Arg4648_1]) && Shen.is_type(Arg4648_0, Shen.type_symbol)))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.mk-get-reg"], [Shen.call(Shen.fns["regkl.var-idx"], [Arg4648_0, Arg4648_1])]);})
  : Arg4648_0))))))))))}, 5, [], "regkl.walk-expr"];





Shen.fns["regkl.mk-defun-env"] = [Shen.type_func, function shen_user_lambda4654(Arg4653) {
  if (Arg4653.length < 3) return [Shen.type_func, shen_user_lambda4654, 3, Arg4653];
  var Arg4653_0 = Arg4653[0], Arg4653_1 = Arg4653[1], Arg4653_2 = Arg4653[2];
  return ((Shen.empty$question$(Arg4653_0))
  ? Arg4653_2
  : ((Shen.is_type(Arg4653_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.mk-defun-env"], [Arg4653_0[2], (Arg4653_1 - 1), [Shen.type_cons, [Shen.type_cons, Arg4653_0[1], Arg4653_1], Arg4653_2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "regkl.mk-defun-env"]]);})))}, 3, [], "regkl.mk-defun-env"];





Shen.fns["regkl.mk-function-kl"] = [Shen.type_func, function shen_user_lambda4660(Arg4659) {
  if (Arg4659.length < 4) return [Shen.type_func, shen_user_lambda4660, 4, Arg4659];
  var Arg4659_0 = Arg4659[0], Arg4659_1 = Arg4659[1], Arg4659_2 = Arg4659[2], Arg4659_3 = Arg4659[3];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["regkl.remove-duplicates"], [Arg4659_0])),
  (R1 = Shen.call(Shen.fns["regkl.mk-defun-env"], [R0, -1, Arg4659_2])),
  (R0 = Shen.call(Shen.fns["regkl.used-vars"], [Arg4659_1, R0])),
  (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-expr"], [Arg4659_1, R1, R0, [], Arg4659_3]);}))}, 4, [], "regkl.mk-function-kl"];





Shen.fns["regkl.defun-hdr"] = [Shen.type_func, function shen_user_lambda4663(Arg4662) {
  if (Arg4662.length < 1) return [Shen.type_func, shen_user_lambda4663, 1, Arg4662];
  var Arg4662_0 = Arg4662[0];
  return ((Shen.unwind_tail(Shen.$eq$(true, Arg4662_0)))
  ? [Shen.type_symbol, "regkl.toplevel"]
  : ((Shen.unwind_tail(Shen.$eq$(false, Arg4662_0)))
  ? [Shen.type_symbol, "regkl.func"]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "regkl.defun-hdr"]]);})))}, 1, [], "regkl.defun-hdr"];





Shen.fns["regkl.mk-defun-kl"] = [Shen.type_func, function shen_user_lambda4671(Arg4670) {
  if (Arg4670.length < 6) return [Shen.type_func, shen_user_lambda4671, 6, Arg4670];
  var Arg4670_0 = Arg4670[0], Arg4670_1 = Arg4670[1], Arg4670_2 = Arg4670[2], Arg4670_3 = Arg4670[3], Arg4670_4 = Arg4670[4], Arg4670_5 = Arg4670[5];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["regkl.mk-context"], [Shen.call(Shen.fns["regkl.context-toplevel"], [Arg4670_5]), 0])),
  (R1 = Shen.call(Shen.fns["regkl.mk-function-kl"], [Arg4670_1, Arg4670_2, Arg4670_3, R0])),
  Shen.call(Shen.fns["regkl.context-toplevel->"], [Arg4670_5, Shen.call(Shen.fns["regkl.context-toplevel"], [R0])]),
  [Shen.type_cons, Shen.call(Shen.fns["regkl.defun-hdr"], [Arg4670_4]), [Shen.type_cons, Arg4670_0, [Shen.type_cons, Arg4670_1, [Shen.type_cons, Shen.call(Shen.fns["regkl.context-nregs"], [R0]), [Shen.type_cons, R1, []]]]]])}, 6, [], "regkl.mk-defun-kl"];





Shen.fns["regkl.walk-defun"] = [Shen.type_func, function shen_user_lambda4678(Arg4677) {
  if (Arg4677.length < 5) return [Shen.type_func, shen_user_lambda4678, 5, Arg4677];
  var Arg4677_0 = Arg4677[0], Arg4677_1 = Arg4677[1], Arg4677_2 = Arg4677[2], Arg4677_3 = Arg4677[3], Arg4677_4 = Arg4677[4];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["regkl.mk-context"], [Arg4677_4, 0])),
  (R1 = Shen.call(Shen.fns["regkl.mk-defun-kl"], [Arg4677_0, Arg4677_1, Arg4677_2, [], Arg4677_3, R0])),
  [Shen.type_cons, R1, Shen.call(Shen.fns["regkl.context-toplevel"], [R0])])}, 5, [], "regkl.walk-defun"];





Shen.fns["regkl.walk-toplevel"] = [Shen.type_func, function shen_user_lambda4691(Arg4690) {
  if (Arg4690.length < 3) return [Shen.type_func, shen_user_lambda4691, 3, Arg4690];
  var Arg4690_0 = Arg4690[0], Arg4690_1 = Arg4690[1], Arg4690_2 = Arg4690[2];
  var R0;
  return (((Shen.is_type(Arg4690_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "defun"], Arg4690_0[1])) && (Shen.is_type(Arg4690_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "fail"], Arg4690_0[2][1])) && (Shen.is_type(Arg4690_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg4690_0[2][2][1])))))))
  ? Arg4690_2
  : (((Shen.is_type(Arg4690_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "defun"], Arg4690_0[1])) && (Shen.is_type(Arg4690_0[2], Shen.type_cons) && (Shen.is_type(Arg4690_0[2][2], Shen.type_cons) && (Shen.is_type(Arg4690_0[2][2][2], Shen.type_cons) && Shen.empty$question$(Arg4690_0[2][2][2][2])))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-defun"], [Arg4690_0[2][1], Arg4690_0[2][2][1], Arg4690_0[2][2][2][1], false, Arg4690_2]);})
  : ((Shen.is_type(Arg4690_0, Shen.type_cons))
  ? ((R0 = Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "regkl.shen-toplevel-"]])),
  (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-defun"], [R0, [], Arg4690_0, true, Arg4690_2]);}))
  : ((Shen.unwind_tail(Shen.$eq$(true, Arg4690_1)))
  ? Arg4690_2
  : ((Shen.unwind_tail(Shen.$eq$(false, Arg4690_1)))
  ? [Shen.type_cons, Arg4690_0, Arg4690_2]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "regkl.walk-toplevel"]]);}))))))}, 3, [], "regkl.walk-toplevel"];





Shen.fns["regkl.walk-aux"] = [Shen.type_func, function shen_user_lambda4698(Arg4697) {
  if (Arg4697.length < 3) return [Shen.type_func, shen_user_lambda4698, 3, Arg4697];
  var Arg4697_0 = Arg4697[0], Arg4697_1 = Arg4697[1], Arg4697_2 = Arg4697[2];
  return ((Shen.empty$question$(Arg4697_0))
  ? (function() {
  return Shen.call_tail(Shen.fns["reverse"], [Arg4697_2]);})
  : ((Shen.is_type(Arg4697_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-aux"], [Arg4697_0[2], Arg4697_1, Shen.call(Shen.fns["regkl.walk-toplevel"], [Arg4697_0[1], Arg4697_1, Arg4697_2])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "regkl.walk-aux"]]);})))}, 3, [], "regkl.walk-aux"];





Shen.fns["regkl.walk"] = [Shen.type_func, function shen_user_lambda4702(Arg4701) {
  if (Arg4701.length < 2) return [Shen.type_func, shen_user_lambda4702, 2, Arg4701];
  var Arg4701_0 = Arg4701[0], Arg4701_1 = Arg4701[1];
  return (function() {
  return Shen.call_tail(Shen.fns["regkl.walk-aux"], [Arg4701_0, Arg4701_1, []]);})}, 2, [], "regkl.walk"];





Shen.call_toplevel(function js$dot$shen_js_toplevel5469(Arg5467) {
  if (Arg5467.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel5469, 0, Arg5467];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.process-datatype"], [[Shen.type_symbol, "js.type#context"], Shen.call(Shen.fns["compile"], [[Shen.type_symbol, "shen.<datatype-rules>"], [Shen.type_cons, [Shen.type_symbol, "Varname"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "Argname"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "Toplevel"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "Nregs"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "_________"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "@v"], [Shen.type_cons, [Shen.type_symbol, "Nregs"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "@v"], [Shen.type_cons, [Shen.type_symbol, "Toplevel"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "@v"], [Shen.type_cons, [Shen.type_symbol, "Argname"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "@v"], [Shen.type_cons, [Shen.type_symbol, "Varname"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, 0, []]], []]]], []]]], []]]], []]]], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "js.context"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "js.context"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "_______________________"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "<-vector"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, 4, []]]], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "js.context"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "B"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "_______________________"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector->"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, 4, [Shen.type_cons, [Shen.type_symbol, "B"], []]]]], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "js.context"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "js.context"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "_______________________"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "<-vector"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, 3, []]]], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "js.context"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "B"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "_______________________"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector->"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, 3, [Shen.type_cons, [Shen.type_symbol, "B"], []]]]], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "js.context"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "js.context"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "_______________________"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "<-vector"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, 2, []]]], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "js.context"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "B"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "_______________________"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector->"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "B"], []]]]], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "js.context"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "js.context"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "_______________________"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "<-vector"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, 1, []]]], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "js.context"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "B"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, "_______________________"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector->"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "B"], []]]]], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "js.context"], [Shen.type_cons, [Shen.type_symbol, ";"], []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]], [Shen.type_symbol, "shen.datatype-error"]])]);})});




Shen.fns["js.mk-context"] = [Shen.type_func, function shen_user_lambda5475(Arg5474) {
  if (Arg5474.length < 4) return [Shen.type_func, shen_user_lambda5475, 4, Arg5474];
  var Arg5474_0 = Arg5474[0], Arg5474_1 = Arg5474[1], Arg5474_2 = Arg5474[2], Arg5474_3 = Arg5474[3];
  return (function() {
  return Shen.call_tail(Shen.fns["@v"], [Arg5474_0, Shen.call(Shen.fns["@v"], [Arg5474_1, Shen.call(Shen.fns["@v"], [Arg5474_2, Shen.call(Shen.fns["@v"], [Arg5474_3, Shen.vector(0)])])])]);})}, 4, [], "js.mk-context"];





Shen.fns["js.context-varname->"] = [Shen.type_func, function shen_user_lambda5479(Arg5478) {
  if (Arg5478.length < 2) return [Shen.type_func, shen_user_lambda5479, 2, Arg5478];
  var Arg5478_0 = Arg5478[0], Arg5478_1 = Arg5478[1];
  return (function() {
  return Shen.call_tail(Shen.fns["vector->"], [Arg5478_0, 4, Arg5478_1]);})}, 2, [], "js.context-varname->"];





Shen.fns["js.context-argname->"] = [Shen.type_func, function shen_user_lambda5483(Arg5482) {
  if (Arg5482.length < 2) return [Shen.type_func, shen_user_lambda5483, 2, Arg5482];
  var Arg5482_0 = Arg5482[0], Arg5482_1 = Arg5482[1];
  return (function() {
  return Shen.call_tail(Shen.fns["vector->"], [Arg5482_0, 3, Arg5482_1]);})}, 2, [], "js.context-argname->"];





Shen.fns["js.context-toplevel->"] = [Shen.type_func, function shen_user_lambda5487(Arg5486) {
  if (Arg5486.length < 2) return [Shen.type_func, shen_user_lambda5487, 2, Arg5486];
  var Arg5486_0 = Arg5486[0], Arg5486_1 = Arg5486[1];
  return (function() {
  return Shen.call_tail(Shen.fns["vector->"], [Arg5486_0, 2, Arg5486_1]);})}, 2, [], "js.context-toplevel->"];





Shen.fns["js.context-nregs->"] = [Shen.type_func, function shen_user_lambda5491(Arg5490) {
  if (Arg5490.length < 2) return [Shen.type_func, shen_user_lambda5491, 2, Arg5490];
  var Arg5490_0 = Arg5490[0], Arg5490_1 = Arg5490[1];
  return (function() {
  return Shen.call_tail(Shen.fns["vector->"], [Arg5490_0, 1, Arg5490_1]);})}, 2, [], "js.context-nregs->"];





Shen.fns["js.context-varname"] = [Shen.type_func, function shen_user_lambda5494(Arg5493) {
  if (Arg5493.length < 1) return [Shen.type_func, shen_user_lambda5494, 1, Arg5493];
  var Arg5493_0 = Arg5493[0];
  return (function() {
  return Shen.call_tail(Shen.fns["<-vector"], [Arg5493_0, 4]);})}, 1, [], "js.context-varname"];





Shen.fns["js.context-argname"] = [Shen.type_func, function shen_user_lambda5497(Arg5496) {
  if (Arg5496.length < 1) return [Shen.type_func, shen_user_lambda5497, 1, Arg5496];
  var Arg5496_0 = Arg5496[0];
  return (function() {
  return Shen.call_tail(Shen.fns["<-vector"], [Arg5496_0, 3]);})}, 1, [], "js.context-argname"];





Shen.fns["js.context-toplevel"] = [Shen.type_func, function shen_user_lambda5500(Arg5499) {
  if (Arg5499.length < 1) return [Shen.type_func, shen_user_lambda5500, 1, Arg5499];
  var Arg5499_0 = Arg5499[0];
  return (function() {
  return Shen.call_tail(Shen.fns["<-vector"], [Arg5499_0, 2]);})}, 1, [], "js.context-toplevel"];





Shen.fns["js.context-nregs"] = [Shen.type_func, function shen_user_lambda5503(Arg5502) {
  if (Arg5502.length < 1) return [Shen.type_func, shen_user_lambda5503, 1, Arg5502];
  var Arg5502_0 = Arg5502[0];
  return (function() {
  return Shen.call_tail(Shen.fns["<-vector"], [Arg5502_0, 1]);})}, 1, [], "js.context-nregs"];





Shen.fns["js.max"] = [Shen.type_func, function shen_user_lambda5511(Arg5510) {
  if (Arg5510.length < 2) return [Shen.type_func, shen_user_lambda5511, 2, Arg5510];
  var Arg5510_0 = Arg5510[0], Arg5510_1 = Arg5510[1];
  return (((Arg5510_0 > Arg5510_1))
  ? Arg5510_0
  : Arg5510_1)}, 2, [], "js.max"];





Shen.fns["js.str-js-from-shen*"] = [Shen.type_func, function shen_user_lambda5515(Arg5514) {
  if (Arg5514.length < 2) return [Shen.type_func, shen_user_lambda5515, 2, Arg5514];
  var Arg5514_0 = Arg5514[0], Arg5514_1 = Arg5514[1];
  return ((Shen.unwind_tail(Shen.$eq$("", Arg5514_0)))
  ? Arg5514_1
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("-", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "_")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("_", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$_")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("$", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("'", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$quote$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("`", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$bquote$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("/", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$slash$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("*", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$asterisk$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("+", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$plus$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("%", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$percent$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("=", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$eq$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("?", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$question$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("!", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$excl$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$(">", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$gt$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("<", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$lt$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$(".", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$dot$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("|", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$bar$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("#", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$sharp$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("~", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$tilde$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$(":", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$colon$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$(";", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$sc$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("@", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$at$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("&", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$amp$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("{", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$cbraceopen$")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]) && Shen.unwind_tail(Shen.$eq$("}", Arg5514_0[0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + "$cbraceclose$")]);})
  : ((Shen.call(Shen.fns["shen.+string?"], [Arg5514_0]))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Shen.tlstr(Arg5514_0), (Arg5514_1 + Arg5514_0[0])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "js.str-js-from-shen*"]]);})))))))))))))))))))))))))))}, 2, [], "js.str-js-from-shen*"];





Shen.fns["js.str-js-from-shen"] = [Shen.type_func, function shen_user_lambda5518(Arg5517) {
  if (Arg5517.length < 1) return [Shen.type_func, shen_user_lambda5518, 1, Arg5517];
  var Arg5517_0 = Arg5517[0];
  return (function() {
  return Shen.call_tail(Shen.fns["js.str-js-from-shen*"], [Arg5517_0, ""]);})}, 1, [], "js.str-js-from-shen"];





Shen.fns["js.sym-js-from-shen"] = [Shen.type_func, function shen_user_lambda5521(Arg5520) {
  if (Arg5520.length < 1) return [Shen.type_func, shen_user_lambda5521, 1, Arg5520];
  var Arg5520_0 = Arg5520[0];
  return (function() {
  return Shen.intern(Shen.call(Shen.fns["js.str-js-from-shen"], [Shen.str(Arg5520_0)]));})}, 1, [], "js.sym-js-from-shen"];





Shen.fns["js.backslash"] = [Shen.type_func, function shen_user_lambda5523(Arg5522) {
  if (Arg5522.length < 0) return [Shen.type_func, shen_user_lambda5523, 0, Arg5522];
  return (function() {
  return Shen.n_$gt$string(92);})}, 0, [], "js.backslash"];





Shen.fns["js.dquote"] = [Shen.type_func, function shen_user_lambda5525(Arg5524) {
  if (Arg5524.length < 0) return [Shen.type_func, shen_user_lambda5525, 0, Arg5524];
  return (function() {
  return Shen.n_$gt$string(34);})}, 0, [], "js.dquote"];





Shen.fns["js.esc-string"] = [Shen.type_func, function shen_user_lambda5529(Arg5528) {
  if (Arg5528.length < 2) return [Shen.type_func, shen_user_lambda5529, 2, Arg5528];
  var Arg5528_0 = Arg5528[0], Arg5528_1 = Arg5528[1];
  return ((Shen.unwind_tail(Shen.$eq$("", Arg5528_0)))
  ? Arg5528_1
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5528_0]) && (Shen.unwind_tail(Shen.$eq$(Arg5528_0[0], Shen.call(Shen.fns["js.backslash"], []))) || Shen.unwind_tail(Shen.$eq$(Arg5528_0[0], Shen.call(Shen.fns["js.dquote"], []))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.esc-string"], [Shen.tlstr(Arg5528_0), (Arg5528_1 + (Shen.call(Shen.fns["js.backslash"], []) + Arg5528_0[0]))]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5528_0]) && Shen.unwind_tail(Shen.$eq$(Shen.string_$gt$n(Arg5528_0[0]), 10))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.esc-string"], [Shen.tlstr(Arg5528_0), (Arg5528_1 + "\\x0a")]);})
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg5528_0]) && Shen.unwind_tail(Shen.$eq$(Shen.string_$gt$n(Arg5528_0[0]), 13))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.esc-string"], [Shen.tlstr(Arg5528_0), (Arg5528_1 + "\\x0d")]);})
  : ((Shen.call(Shen.fns["shen.+string?"], [Arg5528_0]))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.esc-string"], [Shen.tlstr(Arg5528_0), (Arg5528_1 + Arg5528_0[0])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "js.esc-string"]]);}))))))}, 2, [], "js.esc-string"];





Shen.fns["js.func-name"] = [Shen.type_func, function shen_user_lambda5532(Arg5531) {
  if (Arg5531.length < 1) return [Shen.type_func, shen_user_lambda5532, 1, Arg5531];
  var Arg5531_0 = Arg5531[0];
  return ((Shen.is_type(Arg5531_0, Shen.type_symbol))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.sym-js-from-shen"], [Arg5531_0]);})
  : Arg5531_0)}, 1, [], "js.func-name"];





Shen.fns["js.intfunc-name"] = [Shen.type_func, function shen_user_lambda5535(Arg5534) {
  if (Arg5534.length < 1) return [Shen.type_func, shen_user_lambda5535, 1, Arg5534];
  var Arg5534_0 = Arg5534[0];
  return (((Shen.call(Shen.fns["shen.sysfunc?"], [Arg5534_0]) || (Shen.globals["shen.*installing-kl*"])))
  ? (function() {
  return Shen.intern(("Shen." + Shen.call(Shen.fns["js.str-js-from-shen"], [Shen.str(Arg5534_0)])));})
  : ((Shen.is_type(Arg5534_0, Shen.type_symbol))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.sym-js-from-shen"], [Arg5534_0]);})
  : Arg5534_0))}, 1, [], "js.intfunc-name"];





Shen.call_toplevel(function js$dot$shen_js_toplevel5538(Arg5536) {
  if (Arg5536.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel5538, 0, Arg5536];
  return (Shen.globals["js.int-funcs"] = [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "X"], []], [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, [Shen.type_symbol, "tl"], [Shen.type_cons, [Shen.type_symbol, "not"], [Shen.type_cons, [Shen.type_symbol, "thaw"], [Shen.type_cons, [Shen.type_symbol, "string?"], [Shen.type_cons, [Shen.type_symbol, "number?"], [Shen.type_cons, [Shen.type_symbol, "symbol?"], [Shen.type_cons, [Shen.type_symbol, "cons?"], [Shen.type_cons, [Shen.type_symbol, "vector?"], [Shen.type_cons, [Shen.type_symbol, "absvector?"], [Shen.type_cons, [Shen.type_symbol, "value"], [Shen.type_cons, [Shen.type_symbol, "intern"], [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, [Shen.type_symbol, "read-byte"], [Shen.type_cons, [Shen.type_symbol, "close"], [Shen.type_cons, [Shen.type_symbol, "absvector"], [Shen.type_cons, [Shen.type_symbol, "str"], [Shen.type_cons, [Shen.type_symbol, "tlstr"], [Shen.type_cons, [Shen.type_symbol, "n->string"], [Shen.type_cons, [Shen.type_symbol, "string->n"], [Shen.type_cons, [Shen.type_symbol, "empty?"], [Shen.type_cons, [Shen.type_symbol, "get-time"], [Shen.type_cons, [Shen.type_symbol, "error"], [Shen.type_cons, [Shen.type_symbol, "simple-error"], [Shen.type_cons, [Shen.type_symbol, "eval-kl"], [Shen.type_cons, [Shen.type_symbol, "error-to-string"], [Shen.type_cons, [Shen.type_symbol, "js.call-js"], []]]]]]]]]]]]]]]]]]]]]]]]]]]]], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "X"], [Shen.type_cons, [Shen.type_symbol, "Y"], []]], [Shen.type_cons, [Shen.type_symbol, "+"], [Shen.type_cons, [Shen.type_symbol, "-"], [Shen.type_cons, [Shen.type_symbol, "*"], [Shen.type_cons, [Shen.type_symbol, "/"], [Shen.type_cons, [Shen.type_symbol, "and"], [Shen.type_cons, [Shen.type_symbol, "or"], [Shen.type_cons, [Shen.type_symbol, "="], [Shen.type_cons, [Shen.type_symbol, ">"], [Shen.type_cons, [Shen.type_symbol, ">="], [Shen.type_cons, [Shen.type_symbol, "<"], [Shen.type_cons, [Shen.type_symbol, "<="], [Shen.type_cons, [Shen.type_symbol, "cons"], [Shen.type_cons, [Shen.type_symbol, "set"], [Shen.type_cons, [Shen.type_symbol, "<-address"], [Shen.type_cons, [Shen.type_symbol, "cn"], [Shen.type_cons, [Shen.type_symbol, "pos"], [Shen.type_cons, [Shen.type_symbol, "@p"], [Shen.type_cons, [Shen.type_symbol, "open"], [Shen.type_cons, [Shen.type_symbol, "write-byte"], []]]]]]]]]]]]]]]]]]]]], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "X"], [Shen.type_cons, [Shen.type_symbol, "Y"], [Shen.type_cons, [Shen.type_symbol, "Z"], []]]], [Shen.type_cons, [Shen.type_symbol, "address->"], []]], []]]])});




Shen.call_toplevel(function js$dot$shen_js_toplevel5541(Arg5539) {
  if (Arg5539.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel5541, 0, Arg5539];
  return (Shen.globals["js.internals"] = [Shen.type_cons, [Shen.type_symbol, "get-time"], [Shen.type_cons, [Shen.type_symbol, "="], [Shen.type_cons, [Shen.type_symbol, "empty?"], [Shen.type_cons, [Shen.type_symbol, "boolean?"], [Shen.type_cons, [Shen.type_symbol, "vector?"], [Shen.type_cons, [Shen.type_symbol, "absvector?"], [Shen.type_cons, [Shen.type_symbol, "absvector"], [Shen.type_cons, [Shen.type_symbol, "value"], [Shen.type_cons, [Shen.type_symbol, "set"], [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, [Shen.type_symbol, "str"], [Shen.type_cons, [Shen.type_symbol, "intern"], [Shen.type_cons, [Shen.type_symbol, "n->string"], [Shen.type_cons, [Shen.type_symbol, "string->n"], [Shen.type_cons, [Shen.type_symbol, "eval-kl"], [Shen.type_cons, [Shen.type_symbol, "open"], [Shen.type_cons, [Shen.type_symbol, "write-byte"], [Shen.type_cons, [Shen.type_symbol, "read-byte"], [Shen.type_cons, [Shen.type_symbol, "close"], [Shen.type_cons, [Shen.type_symbol, "tlstr"], [Shen.type_cons, [Shen.type_symbol, "error"], [Shen.type_cons, [Shen.type_symbol, "simple-error"], [Shen.type_cons, [Shen.type_symbol, "error-to-string"], [Shen.type_cons, [Shen.type_symbol, "js.shenjs-call-js"], []]]]]]]]]]]]]]]]]]]]]]]]])});




Shen.call_toplevel(function js$dot$shen_js_toplevel5544(Arg5542) {
  if (Arg5542.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel5544, 0, Arg5542];
  return (Shen.globals["js.tail-internals"] = [Shen.type_cons, [Shen.type_symbol, "="], [Shen.type_cons, [Shen.type_symbol, "js.shenjs-call-js"], []]])});




Shen.fns["js.int-func-args*"] = [Shen.type_func, function shen_user_lambda5556(Arg5555) {
  if (Arg5555.length < 2) return [Shen.type_func, shen_user_lambda5556, 2, Arg5555];
  var Arg5555_0 = Arg5555[0], Arg5555_1 = Arg5555[1];
  return ((Shen.empty$question$(Arg5555_1))
  ? []
  : (((Shen.is_type(Arg5555_1, Shen.type_cons) && (Shen.is_type(Arg5555_1[1], Shen.type_cons) && Shen.call(Shen.fns["element?"], [Arg5555_0, Arg5555_1[1][2]]))))
  ? Arg5555_1[1][1]
  : (((Shen.is_type(Arg5555_1, Shen.type_cons) && Shen.is_type(Arg5555_1[1], Shen.type_cons)))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.int-func-args*"], [Arg5555_0, Arg5555_1[2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "js.int-func-args*"]]);}))))}, 2, [], "js.int-func-args*"];





Shen.fns["js.int-func-args"] = [Shen.type_func, function shen_user_lambda5559(Arg5558) {
  if (Arg5558.length < 1) return [Shen.type_func, shen_user_lambda5559, 1, Arg5558];
  var Arg5558_0 = Arg5558[0];
  return (function() {
  return Shen.call_tail(Shen.fns["js.int-func-args*"], [Arg5558_0, (Shen.globals["js.int-funcs"])]);})}, 1, [], "js.int-func-args"];





Shen.fns["js.int-func?"] = [Shen.type_func, function shen_user_lambda5562(Arg5561) {
  if (Arg5561.length < 1) return [Shen.type_func, shen_user_lambda5562, 1, Arg5561];
  var Arg5561_0 = Arg5561[0];
  return ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "fail"], Arg5561_0)))
  ? true
  : (!Shen.empty$question$(Shen.call(Shen.fns["js.int-func-args"], [Arg5561_0]))))}, 1, [], "js.int-func?"];





Shen.fns["js.esc-obj"] = [Shen.type_func, function shen_user_lambda5565(Arg5564) {
  if (Arg5564.length < 1) return [Shen.type_func, shen_user_lambda5565, 1, Arg5564];
  var Arg5564_0 = Arg5564[0];
  return (((typeof(Arg5564_0) == 'string'))
  ? ("\"" + (Shen.call(Shen.fns["js.esc-string"], [Arg5564_0, ""]) + "\""))
  : ((Shen.is_type(Arg5564_0, Shen.type_symbol))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.sym-js-from-shen"], [Arg5564_0]);})
  : (function() {
  return Shen.simple_error(("Object " + Shen.call(Shen.fns["shen.app"], [Arg5564_0, " cannot be escaped", [Shen.type_symbol, "shen.r"]])));})))}, 1, [], "js.esc-obj"];





Shen.fns["js.str-join*"] = [Shen.type_func, function shen_user_lambda5570(Arg5569) {
  if (Arg5569.length < 3) return [Shen.type_func, shen_user_lambda5570, 3, Arg5569];
  var Arg5569_0 = Arg5569[0], Arg5569_1 = Arg5569[1], Arg5569_2 = Arg5569[2];
  return ((Shen.empty$question$(Arg5569_0))
  ? Arg5569_2
  : (((Shen.is_type(Arg5569_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$("", Arg5569_2))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-join*"], [Arg5569_0[2], Arg5569_1, Shen.call(Shen.fns["shen.app"], [Arg5569_0[1], "", [Shen.type_symbol, "shen.a"]])]);})
  : ((Shen.is_type(Arg5569_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.str-join*"], [Arg5569_0[2], Arg5569_1, (Arg5569_2 + (Arg5569_1 + Shen.call(Shen.fns["shen.app"], [Arg5569_0[1], "", [Shen.type_symbol, "shen.a"]])))]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "js.str-join*"]]);}))))}, 3, [], "js.str-join*"];





Shen.fns["js.str-join"] = [Shen.type_func, function shen_user_lambda5574(Arg5573) {
  if (Arg5573.length < 2) return [Shen.type_func, shen_user_lambda5574, 2, Arg5573];
  var Arg5573_0 = Arg5573[0], Arg5573_1 = Arg5573[1];
  return (function() {
  return Shen.call_tail(Shen.fns["js.str-join*"], [Arg5573_0, Arg5573_1, ""]);})}, 2, [], "js.str-join"];





Shen.fns["js.arg-list"] = [Shen.type_func, function shen_user_lambda5577(Arg5576) {
  if (Arg5576.length < 1) return [Shen.type_func, shen_user_lambda5577, 1, Arg5576];
  var Arg5576_0 = Arg5576[0];
  return (function() {
  return Shen.call_tail(Shen.fns["js.str-join"], [Arg5576_0, ", "]);})}, 1, [], "js.arg-list"];





Shen.fns["js.arg-name"] = [Shen.type_func, function shen_user_lambda5581(Arg5580) {
  if (Arg5580.length < 2) return [Shen.type_func, shen_user_lambda5581, 2, Arg5580];
  var Arg5580_0 = Arg5580[0], Arg5580_1 = Arg5580[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.context-argname"], [Arg5580_1]), ("_" + Shen.call(Shen.fns["shen.app"], [Arg5580_0, "", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]]);})}, 2, [], "js.arg-name"];





Shen.fns["js.tail-call-ret"] = [Shen.type_func, function shen_user_lambda5584(Arg5583) {
  if (Arg5583.length < 1) return [Shen.type_func, shen_user_lambda5584, 1, Arg5583];
  var Arg5583_0 = Arg5583[0];
  return ("(function() {\x0a  return " + Shen.call(Shen.fns["shen.app"], [Arg5583_0, ";})", [Shen.type_symbol, "shen.a"]]))}, 1, [], "js.tail-call-ret"];





Shen.fns["js.tail-call-expr"] = [Shen.type_func, function shen_user_lambda5588(Arg5587) {
  if (Arg5587.length < 2) return [Shen.type_func, shen_user_lambda5588, 2, Arg5587];
  var Arg5587_0 = Arg5587[0], Arg5587_1 = Arg5587[1];
  return (function() {
  return Shen.call_tail(Shen.fns["js.js-from-kl-expr"], [Arg5587_0, false, Arg5587_1]);})}, 2, [], "js.tail-call-expr"];





Shen.fns["js.cond-case"] = [Shen.type_func, function shen_user_lambda5592(Arg5591) {
  if (Arg5591.length < 2) return [Shen.type_func, shen_user_lambda5592, 2, Arg5591];
  var Arg5591_0 = Arg5591[0], Arg5591_1 = Arg5591[1];
  return (function() {
  return Shen.call_tail(Shen.fns["js.tail-call-expr"], [Arg5591_0, Arg5591_1]);})}, 2, [], "js.cond-case"];





Shen.fns["js.emit-cond*"] = [Shen.type_func, function shen_user_lambda5597(Arg5596) {
  if (Arg5596.length < 3) return [Shen.type_func, shen_user_lambda5597, 3, Arg5596];
  var Arg5596_0 = Arg5596[0], Arg5596_1 = Arg5596[1], Arg5596_2 = Arg5596[2];
  return ((Shen.empty$question$(Arg5596_0))
  ? (function() {
  return Shen.simple_error("cond failure: no default branch");})
  : (((Shen.is_type(Arg5596_0, Shen.type_cons) && (Shen.is_type(Arg5596_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$(true, Arg5596_0[1][1])) && (Shen.is_type(Arg5596_0[1][2], Shen.type_cons) && Shen.empty$question$(Arg5596_0[1][2][2]))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.js-from-kl-expr"], [Arg5596_0[1][2][1], Arg5596_1, Arg5596_2]);})
  : (((Shen.is_type(Arg5596_0, Shen.type_cons) && (Shen.is_type(Arg5596_0[1], Shen.type_cons) && (Shen.is_type(Arg5596_0[1][2], Shen.type_cons) && Shen.empty$question$(Arg5596_0[1][2][2])))))
  ? ("((" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.cond-case"], [Arg5596_0[1][1], Arg5596_2]), (")\x0a  ? " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5596_0[1][2][1], Arg5596_1, Arg5596_2]), ("\x0a  : " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.emit-cond*"], [Arg5596_0[2], Arg5596_1, Arg5596_2]), ")", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]]))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "js.emit-cond*"]]);}))))}, 3, [], "js.emit-cond*"];





Shen.fns["js.emit-cond"] = [Shen.type_func, function shen_user_lambda5602(Arg5601) {
  if (Arg5601.length < 3) return [Shen.type_func, shen_user_lambda5602, 3, Arg5601];
  var Arg5601_0 = Arg5601[0], Arg5601_1 = Arg5601[1], Arg5601_2 = Arg5601[2];
  return (function() {
  return Shen.call_tail(Shen.fns["js.emit-cond*"], [Arg5601_0, Arg5601_1, Arg5601_2]);})}, 3, [], "js.emit-cond"];





Shen.fns["js.emit-trap-error"] = [Shen.type_func, function shen_user_lambda5608(Arg5607) {
  if (Arg5607.length < 4) return [Shen.type_func, shen_user_lambda5608, 4, Arg5607];
  var Arg5607_0 = Arg5607[0], Arg5607_1 = Arg5607[1], Arg5607_2 = Arg5607[2], Arg5607_3 = Arg5607[3];
  var R0, R1;
  return ((Shen.unwind_tail(Shen.$eq$(false, Arg5607_2)))
  ? ((R0 = Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5607_0, false, Arg5607_3])),
  (R1 = Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5607_1, false, Arg5607_3])),
  ("Shen.trap_error(" + Shen.call(Shen.fns["shen.app"], [R0, (", " + Shen.call(Shen.fns["shen.app"], [R1, ")", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])))
  : ((Shen.unwind_tail(Shen.$eq$(true, Arg5607_2)))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.tail-call-ret"], [Shen.call(Shen.fns["js.emit-trap-error"], [Arg5607_0, Arg5607_1, false, Arg5607_3])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "js.emit-trap-error"]]);})))}, 4, [], "js.emit-trap-error"];





Shen.fns["js.predicate-op"] = [Shen.type_func, function shen_user_lambda5652(Arg5651) {
  if (Arg5651.length < 4) return [Shen.type_func, shen_user_lambda5652, 4, Arg5651];
  var Arg5651_0 = Arg5651[0], Arg5651_1 = Arg5651[1], Arg5651_2 = Arg5651[2], Arg5651_3 = Arg5651[3];
  return (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "number?"], Arg5651_0)) && (typeof(Arg5651_1) == 'number')))
  ? "true"
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "string?"], Arg5651_0)) && (typeof(Arg5651_1) == 'string')))
  ? "true"
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "boolean?"], Arg5651_0)) && Shen.unwind_tail(Shen.$eq$(true, Arg5651_1))))
  ? "true"
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "boolean?"], Arg5651_0)) && Shen.unwind_tail(Shen.$eq$(false, Arg5651_1))))
  ? "true"
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "boolean?"], Arg5651_0)))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.int-funcall"], [[Shen.type_symbol, "boolean?"], [Shen.type_cons, Arg5651_1, []], Arg5651_2, Arg5651_3]);})
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "string?"], Arg5651_0)))
  ? ("(typeof(" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5651_1, false, Arg5651_3]), ") == 'string')", [Shen.type_symbol, "shen.a"]]))
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "number?"], Arg5651_0)))
  ? ("(typeof(" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5651_1, false, Arg5651_3]), ") == 'number')", [Shen.type_symbol, "shen.a"]]))
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "symbol?"], Arg5651_0)))
  ? ("Shen.is_type(" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5651_1, false, Arg5651_3]), (", " + Shen.call(Shen.fns["shen.app"], ["Shen.type_symbol", ")", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]]))
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cons?"], Arg5651_0)))
  ? ("Shen.is_type(" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5651_1, false, Arg5651_3]), (", " + Shen.call(Shen.fns["shen.app"], ["Shen.type_cons", ")", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]]))
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "tuple?"], Arg5651_0)))
  ? ("Shen.is_type(" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5651_1, false, Arg5651_3]), (", " + Shen.call(Shen.fns["shen.app"], ["Shen.fns['shen.tuple']", ")", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]]))
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "vector?"], Arg5651_0)))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.int-funcall"], [[Shen.type_symbol, "vector?"], [Shen.type_cons, Arg5651_1, []], Arg5651_2, Arg5651_3]);})
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "empty?"], Arg5651_0)))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.int-funcall"], [[Shen.type_symbol, "empty?"], [Shen.type_cons, Arg5651_1, []], Arg5651_2, Arg5651_3]);})
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "absvector?"], Arg5651_0)))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.int-funcall"], [[Shen.type_symbol, "absvector?"], [Shen.type_cons, Arg5651_1, []], Arg5651_2, Arg5651_3]);})
  : Shen.fail_obj)))))))))))))}, 4, [], "js.predicate-op"];





Shen.fns["js.math-op"] = [Shen.type_func, function shen_user_lambda5682(Arg5681) {
  if (Arg5681.length < 4) return [Shen.type_func, shen_user_lambda5682, 4, Arg5681];
  var Arg5681_0 = Arg5681[0], Arg5681_1 = Arg5681[1], Arg5681_2 = Arg5681[2], Arg5681_3 = Arg5681[3];
  return (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "+"], Arg5681_0)) && (Shen.is_type(Arg5681_1, Shen.type_cons) && (Shen.is_type(Arg5681_1[2], Shen.type_cons) && (Shen.empty$question$(Arg5681_1[2][2]) && ((typeof(Arg5681_1[1]) == 'number') && (typeof(Arg5681_1[2][1]) == 'number')))))))
  ? (function() {
  return Shen.str((Arg5681_1[1] + Arg5681_1[2][1]));})
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "-"], Arg5681_0)) && (Shen.is_type(Arg5681_1, Shen.type_cons) && (Shen.is_type(Arg5681_1[2], Shen.type_cons) && (Shen.empty$question$(Arg5681_1[2][2]) && ((typeof(Arg5681_1[1]) == 'number') && (typeof(Arg5681_1[2][1]) == 'number')))))))
  ? (function() {
  return Shen.str((Arg5681_1[1] - Arg5681_1[2][1]));})
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "*"], Arg5681_0)) && (Shen.is_type(Arg5681_1, Shen.type_cons) && (Shen.is_type(Arg5681_1[2], Shen.type_cons) && (Shen.empty$question$(Arg5681_1[2][2]) && ((typeof(Arg5681_1[1]) == 'number') && (typeof(Arg5681_1[2][1]) == 'number')))))))
  ? (function() {
  return Shen.str((Arg5681_1[1] * Arg5681_1[2][1]));})
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "/"], Arg5681_0)) && (Shen.is_type(Arg5681_1, Shen.type_cons) && (Shen.is_type(Arg5681_1[2], Shen.type_cons) && (Shen.empty$question$(Arg5681_1[2][2]) && ((typeof(Arg5681_1[1]) == 'number') && ((typeof(Arg5681_1[2][1]) == 'number') && (!Shen.unwind_tail(Shen.$eq$(Arg5681_1[2][1], 0))))))))))
  ? (function() {
  return Shen.str((Arg5681_1[1] / Arg5681_1[2][1]));})
  : (((Shen.is_type(Arg5681_1, Shen.type_cons) && (Shen.is_type(Arg5681_1[2], Shen.type_cons) && (Shen.empty$question$(Arg5681_1[2][2]) && Shen.call(Shen.fns["element?"], [Arg5681_0, [Shen.type_cons, [Shen.type_symbol, "+"], [Shen.type_cons, [Shen.type_symbol, "-"], [Shen.type_cons, [Shen.type_symbol, "*"], [Shen.type_cons, [Shen.type_symbol, "/"], []]]]]])))))
  ? ("(" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5681_1[1], false, Arg5681_3]), (" " + Shen.call(Shen.fns["shen.app"], [Arg5681_0, (" " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5681_1[2][1], false, Arg5681_3]), ")", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]]))
  : Shen.fail_obj)))))}, 4, [], "js.math-op"];





Shen.fns["js.equality-op"] = [Shen.type_func, function shen_user_lambda5705(Arg5704) {
  if (Arg5704.length < 3) return [Shen.type_func, shen_user_lambda5705, 3, Arg5704];
  var Arg5704_0 = Arg5704[0], Arg5704_1 = Arg5704[1], Arg5704_2 = Arg5704[2];
  return (((Shen.is_type(Arg5704_0, Shen.type_cons) && (Shen.is_type(Arg5704_0[2], Shen.type_cons) && (Shen.empty$question$(Arg5704_0[2][2]) && ((typeof(Arg5704_0[1]) == 'number') && (typeof(Arg5704_0[2][1]) == 'number'))))))
  ? (function() {
  return Shen.str(Shen.unwind_tail(Shen.$eq$(Arg5704_0[1], Arg5704_0[2][1])));})
  : (((Shen.is_type(Arg5704_0, Shen.type_cons) && (Shen.is_type(Arg5704_0[2], Shen.type_cons) && (Shen.empty$question$(Arg5704_0[2][2]) && ((typeof(Arg5704_0[1]) == 'string') && (typeof(Arg5704_0[2][1]) == 'string'))))))
  ? (function() {
  return Shen.str(Shen.unwind_tail(Shen.$eq$(Arg5704_0[1], Arg5704_0[2][1])));})
  : (((Shen.is_type(Arg5704_0, Shen.type_cons) && (Shen.is_type(Arg5704_0[2], Shen.type_cons) && (Shen.empty$question$(Arg5704_0[2][2]) && (Shen.boolean$question$(Arg5704_0[1]) && Shen.boolean$question$(Arg5704_0[2][1]))))))
  ? (function() {
  return Shen.str(Shen.unwind_tail(Shen.$eq$(Arg5704_0[1], Arg5704_0[2][1])));})
  : (((Shen.is_type(Arg5704_0, Shen.type_cons) && (Shen.is_type(Arg5704_0[2], Shen.type_cons) && (Shen.empty$question$(Arg5704_0[2][1]) && Shen.empty$question$(Arg5704_0[2][2])))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.int-funcall"], [[Shen.type_symbol, "empty?"], [Shen.type_cons, Arg5704_0[1], []], Arg5704_1, Arg5704_2]);})
  : (((Shen.is_type(Arg5704_0, Shen.type_cons) && (Shen.empty$question$(Arg5704_0[1]) && (Shen.is_type(Arg5704_0[2], Shen.type_cons) && Shen.empty$question$(Arg5704_0[2][2])))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.int-funcall"], [[Shen.type_symbol, "empty?"], Arg5704_0[2], Arg5704_1, Arg5704_2]);})
  : (((Shen.is_type(Arg5704_0, Shen.type_cons) && (Shen.is_type(Arg5704_0[2], Shen.type_cons) && Shen.empty$question$(Arg5704_0[2][2]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.int-funcall"], [[Shen.type_symbol, "="], Arg5704_0, Arg5704_1, Arg5704_2]);})
  : Shen.fail_obj))))))}, 3, [], "js.equality-op"];





Shen.fns["js.order-op"] = [Shen.type_func, function shen_user_lambda5728(Arg5727) {
  if (Arg5727.length < 4) return [Shen.type_func, shen_user_lambda5728, 4, Arg5727];
  var Arg5727_0 = Arg5727[0], Arg5727_1 = Arg5727[1], Arg5727_2 = Arg5727[2], Arg5727_3 = Arg5727[3];
  var R0, R1;
  return (((Shen.is_type(Arg5727_1, Shen.type_cons) && (Shen.is_type(Arg5727_1[2], Shen.type_cons) && (Shen.empty$question$(Arg5727_1[2][2]) && Shen.call(Shen.fns["element?"], [Arg5727_0, [Shen.type_cons, [Shen.type_symbol, ">"], [Shen.type_cons, [Shen.type_symbol, "<"], [Shen.type_cons, [Shen.type_symbol, ">="], [Shen.type_cons, [Shen.type_symbol, "<="], []]]]]])))))
  ? ((R0 = Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5727_1[1], false, Arg5727_3])),
  (R1 = Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5727_1[2][1], false, Arg5727_3])),
  ("(" + Shen.call(Shen.fns["shen.app"], [R0, (" " + Shen.call(Shen.fns["shen.app"], [Arg5727_0, (" " + Shen.call(Shen.fns["shen.app"], [R1, ")", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])))
  : Shen.fail_obj)}, 4, [], "js.order-op"];





Shen.fns["js.logic-op"] = [Shen.type_func, function shen_user_lambda5772(Arg5771) {
  if (Arg5771.length < 4) return [Shen.type_func, shen_user_lambda5772, 4, Arg5771];
  var Arg5771_0 = Arg5771[0], Arg5771_1 = Arg5771[1], Arg5771_2 = Arg5771[2], Arg5771_3 = Arg5771[3];
  return (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "not"], Arg5771_0)) && (Shen.is_type(Arg5771_1, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$(false, Arg5771_1[1])) && Shen.empty$question$(Arg5771_1[2])))))
  ? "true"
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "not"], Arg5771_0)) && (Shen.is_type(Arg5771_1, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$(true, Arg5771_1[1])) && Shen.empty$question$(Arg5771_1[2])))))
  ? "false"
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "not"], Arg5771_0)) && (Shen.is_type(Arg5771_1, Shen.type_cons) && Shen.empty$question$(Arg5771_1[2]))))
  ? ("(!" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5771_1[1], false, Arg5771_3]), ")", [Shen.type_symbol, "shen.a"]]))
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "and"], Arg5771_0)) && (Shen.is_type(Arg5771_1, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$(false, Arg5771_1[1])) && (Shen.is_type(Arg5771_1[2], Shen.type_cons) && Shen.empty$question$(Arg5771_1[2][2]))))))
  ? "false"
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "or"], Arg5771_0)) && (Shen.is_type(Arg5771_1, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$(true, Arg5771_1[1])) && (Shen.is_type(Arg5771_1[2], Shen.type_cons) && Shen.empty$question$(Arg5771_1[2][2]))))))
  ? "true"
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "and"], Arg5771_0)) && (Shen.is_type(Arg5771_1, Shen.type_cons) && (Shen.is_type(Arg5771_1[2], Shen.type_cons) && Shen.empty$question$(Arg5771_1[2][2])))))
  ? ("(" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5771_1[1], false, Arg5771_3]), (" && " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5771_1[2][1], false, Arg5771_3]), ")", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]]))
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "or"], Arg5771_0)) && (Shen.is_type(Arg5771_1, Shen.type_cons) && (Shen.is_type(Arg5771_1[2], Shen.type_cons) && Shen.empty$question$(Arg5771_1[2][2])))))
  ? ("(" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5771_1[1], false, Arg5771_3]), (" || " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5771_1[2][1], false, Arg5771_3]), ")", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]]))
  : Shen.fail_obj)))))))}, 4, [], "js.logic-op"];





Shen.fns["js.emit-set*"] = [Shen.type_func, function shen_user_lambda5778(Arg5777) {
  if (Arg5777.length < 4) return [Shen.type_func, shen_user_lambda5778, 4, Arg5777];
  var Arg5777_0 = Arg5777[0], Arg5777_1 = Arg5777[1], Arg5777_2 = Arg5777[2], Arg5777_3 = Arg5777[3];
  var R0;
  return ((Shen.unwind_tail(Shen.$eq$(true, Arg5777_3)))
  ? ((R0 = Shen.call(Shen.fns["js.esc-obj"], [Shen.str(Arg5777_0)])),
  ("(Shen.globals[" + Shen.call(Shen.fns["shen.app"], [R0, ("] = " + Shen.call(Shen.fns["shen.app"], [Arg5777_1, ")", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])))
  : ((Shen.unwind_tail(Shen.$eq$(false, Arg5777_3)))
  ? ((R0 = Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5777_0, false, Arg5777_2])),
  ("(Shen.globals[" + Shen.call(Shen.fns["shen.app"], [R0, ("[1]] = " + Shen.call(Shen.fns["shen.app"], [Arg5777_1, ")", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "js.emit-set*"]]);})))}, 4, [], "js.emit-set*"];





Shen.fns["js.emit-set"] = [Shen.type_func, function shen_user_lambda5783(Arg5782) {
  if (Arg5782.length < 3) return [Shen.type_func, shen_user_lambda5783, 3, Arg5782];
  var Arg5782_0 = Arg5782[0], Arg5782_1 = Arg5782[1], Arg5782_2 = Arg5782[2];
  return (function() {
  return Shen.call_tail(Shen.fns["js.emit-set*"], [Arg5782_0, Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5782_1, false, Arg5782_2]), Arg5782_2, Shen.is_type(Arg5782_0, Shen.type_symbol)]);})}, 3, [], "js.emit-set"];





Shen.fns["js.emit-value"] = [Shen.type_func, function shen_user_lambda5788(Arg5787) {
  if (Arg5787.length < 3) return [Shen.type_func, shen_user_lambda5788, 3, Arg5787];
  var Arg5787_0 = Arg5787[0], Arg5787_1 = Arg5787[1], Arg5787_2 = Arg5787[2];
  var R0;
  return ((Shen.unwind_tail(Shen.$eq$(true, Arg5787_2)))
  ? ("(Shen.globals[" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.esc-obj"], [Shen.str(Arg5787_0)]), "])", [Shen.type_symbol, "shen.a"]]))
  : ((Shen.unwind_tail(Shen.$eq$(false, Arg5787_2)))
  ? ((R0 = Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5787_0, false, Arg5787_1])),
  ("(Shen.globals[" + Shen.call(Shen.fns["shen.app"], [R0, "[1]])", [Shen.type_symbol, "shen.a"]])))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "js.emit-value"]]);})))}, 3, [], "js.emit-value"];





Shen.fns["js.basic-op"] = [Shen.type_func, function shen_user_lambda5842(Arg5841) {
  if (Arg5841.length < 4) return [Shen.type_func, shen_user_lambda5842, 4, Arg5841];
  var Arg5841_0 = Arg5841[0], Arg5841_1 = Arg5841[1], Arg5841_2 = Arg5841[2], Arg5841_3 = Arg5841[3];
  var R0, R1;
  return (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "intern"], Arg5841_0)) && (Shen.is_type(Arg5841_1, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$("true", Arg5841_1[1])) && Shen.empty$question$(Arg5841_1[2])))))
  ? "true"
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "intern"], Arg5841_0)) && (Shen.is_type(Arg5841_1, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$("false", Arg5841_1[1])) && Shen.empty$question$(Arg5841_1[2])))))
  ? "false"
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "intern"], Arg5841_0)) && (Shen.is_type(Arg5841_1, Shen.type_cons) && (Shen.empty$question$(Arg5841_1[2]) && (typeof(Arg5841_1[1]) == 'string')))))
  ? ("[Shen.type_symbol, " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.esc-obj"], [Arg5841_1[1]]), "]", [Shen.type_symbol, "shen.a"]]))
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "intern"], Arg5841_0)) && (Shen.is_type(Arg5841_1, Shen.type_cons) && Shen.empty$question$(Arg5841_1[2]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.int-funcall"], [[Shen.type_symbol, "intern"], Arg5841_1, Arg5841_2, Arg5841_3]);})
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cons"], Arg5841_0)) && (Shen.is_type(Arg5841_1, Shen.type_cons) && (Shen.is_type(Arg5841_1[2], Shen.type_cons) && Shen.empty$question$(Arg5841_1[2][2])))))
  ? ((R0 = Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5841_1[1], false, Arg5841_3])),
  (R1 = Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5841_1[2][1], false, Arg5841_3])),
  ("[Shen.type_cons, " + Shen.call(Shen.fns["shen.app"], [R0, (", " + Shen.call(Shen.fns["shen.app"], [R1, "]", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])))
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "@p"], Arg5841_0)) && (Shen.is_type(Arg5841_1, Shen.type_cons) && (Shen.is_type(Arg5841_1[2], Shen.type_cons) && Shen.empty$question$(Arg5841_1[2][2])))))
  ? ((R0 = Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5841_1[1], false, Arg5841_3])),
  (R1 = Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5841_1[2][1], false, Arg5841_3])),
  ("[Shen.fns['shen.tuple'], " + Shen.call(Shen.fns["shen.app"], [R0, (", " + Shen.call(Shen.fns["shen.app"], [R1, "]", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])))
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "set"], Arg5841_0)) && (Shen.is_type(Arg5841_1, Shen.type_cons) && (Shen.is_type(Arg5841_1[2], Shen.type_cons) && Shen.empty$question$(Arg5841_1[2][2])))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.emit-set"], [Arg5841_1[1], Arg5841_1[2][1], Arg5841_3]);})
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "value"], Arg5841_0)) && (Shen.is_type(Arg5841_1, Shen.type_cons) && Shen.empty$question$(Arg5841_1[2]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.emit-value"], [Arg5841_1[1], Arg5841_3, Shen.is_type(Arg5841_1[1], Shen.type_symbol)]);})
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "thaw"], Arg5841_0)) && (Shen.is_type(Arg5841_1, Shen.type_cons) && Shen.empty$question$(Arg5841_1[2]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.emit-thaw"], [Arg5841_1[1], Arg5841_2, Arg5841_3]);})
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "function"], Arg5841_0)) && (Shen.is_type(Arg5841_1, Shen.type_cons) && Shen.empty$question$(Arg5841_1[2]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.js-from-kl-expr"], [Arg5841_1[1], true, Arg5841_3]);})
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "hd"], Arg5841_0)) && (Shen.is_type(Arg5841_1, Shen.type_cons) && Shen.empty$question$(Arg5841_1[2]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5841_1[1], false, Arg5841_3]), "[1]", [Shen.type_symbol, "shen.a"]]);})
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "tl"], Arg5841_0)) && (Shen.is_type(Arg5841_1, Shen.type_cons) && Shen.empty$question$(Arg5841_1[2]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5841_1[1], false, Arg5841_3]), "[2]", [Shen.type_symbol, "shen.a"]]);})
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cn"], Arg5841_0)) && (Shen.is_type(Arg5841_1, Shen.type_cons) && (Shen.is_type(Arg5841_1[2], Shen.type_cons) && Shen.empty$question$(Arg5841_1[2][2])))))
  ? ("(" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5841_1[1], false, Arg5841_3]), (" + " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5841_1[2][1], false, Arg5841_3]), ")", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]]))
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "pos"], Arg5841_0)) && (Shen.is_type(Arg5841_1, Shen.type_cons) && (Shen.is_type(Arg5841_1[2], Shen.type_cons) && Shen.empty$question$(Arg5841_1[2][2])))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5841_1[1], false, Arg5841_3]), ("[" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5841_1[2][1], false, Arg5841_3]), "]", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]]);})
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "address->"], Arg5841_0)) && (Shen.is_type(Arg5841_1, Shen.type_cons) && (Shen.is_type(Arg5841_1[2], Shen.type_cons) && (Shen.is_type(Arg5841_1[2][2], Shen.type_cons) && Shen.empty$question$(Arg5841_1[2][2][2]))))))
  ? ("Shen.absvector_set(" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5841_1[1], false, Arg5841_3]), (", " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5841_1[2][1], false, Arg5841_3]), (", " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5841_1[2][2][1], false, Arg5841_3]), ")", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]]))
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "<-address"], Arg5841_0)) && (Shen.is_type(Arg5841_1, Shen.type_cons) && (Shen.is_type(Arg5841_1[2], Shen.type_cons) && Shen.empty$question$(Arg5841_1[2][2])))))
  ? ("Shen.absvector_ref(" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5841_1[1], false, Arg5841_3]), (", " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5841_1[2][1], false, Arg5841_3]), ")", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]]))
  : Shen.fail_obj))))))))))))))))}, 4, [], "js.basic-op"];





Shen.fns["js.int-funcall*"] = [Shen.type_func, function shen_user_lambda5849(Arg5848) {
  if (Arg5848.length < 5) return [Shen.type_func, shen_user_lambda5849, 5, Arg5848];
  var Arg5848_0 = Arg5848[0], Arg5848_1 = Arg5848[1], Arg5848_2 = Arg5848[2], Arg5848_3 = Arg5848[3], Arg5848_4 = Arg5848[4];
  var R0;
  return (((Shen.unwind_tail(Shen.$eq$(true, Arg5848_2)) && Shen.unwind_tail(Shen.$eq$(true, Arg5848_3))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.int-funcall*"], [Arg5848_0, Arg5848_1, false, false, Arg5848_4]);})
  : (((Shen.unwind_tail(Shen.$eq$(true, Arg5848_2)) && Shen.unwind_tail(Shen.$eq$(false, Arg5848_3))))
  ? ((R0 = Shen.call(Shen.fns["js.int-funcall*"], [Arg5848_0, Arg5848_1, false, false, Arg5848_4])),
  ("Shen.unwind_tail(" + Shen.call(Shen.fns["shen.app"], [R0, ")", [Shen.type_symbol, "shen.a"]])))
  : (((Shen.unwind_tail(Shen.$eq$(false, Arg5848_2)) && Shen.unwind_tail(Shen.$eq$(false, Arg5848_3))))
  ? ((R0 = Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda5851(Arg5850) {
  if (Arg5850.length < 2) return [Shen.type_func, shen_user_lambda5851, 2, Arg5850];
  var Arg5850_0 = Arg5850[0], Arg5850_1 = Arg5850[1];
  return (function() {
  return Shen.call_tail(Shen.fns["js.js-from-kl-expr"], [Arg5850_1, false, Arg5850_0]);})}, 2, [Arg5848_4], undefined], Arg5848_1])),
  (R0 = Shen.call(Shen.fns["js.str-join"], [R0, ", "])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.intfunc-name"], [Arg5848_0]), ("(" + Shen.call(Shen.fns["shen.app"], [R0, ")", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]]);}))
  : (((Shen.unwind_tail(Shen.$eq$(false, Arg5848_2)) && Shen.unwind_tail(Shen.$eq$(true, Arg5848_3))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.tail-call-ret"], [Shen.call(Shen.fns["js.int-funcall*"], [Arg5848_0, Arg5848_1, false, false, Arg5848_4])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "js.int-funcall*"]]);})))))}, 5, [], "js.int-funcall*"];





Shen.fns["js.int-funcall"] = [Shen.type_func, function shen_user_lambda5857(Arg5856) {
  if (Arg5856.length < 4) return [Shen.type_func, shen_user_lambda5857, 4, Arg5856];
  var Arg5856_0 = Arg5856[0], Arg5856_1 = Arg5856[1], Arg5856_2 = Arg5856[2], Arg5856_3 = Arg5856[3];
  var R0;
  return ((R0 = Shen.call(Shen.fns["element?"], [Arg5856_0, (Shen.globals["js.tail-internals"])])),
  (function() {
  return Shen.call_tail(Shen.fns["js.int-funcall*"], [Arg5856_0, Arg5856_1, R0, Arg5856_2, Arg5856_3]);}))}, 4, [], "js.int-funcall"];





Shen.fns["js.int-curry"] = [Shen.type_func, function shen_user_lambda5863(Arg5862) {
  if (Arg5862.length < 4) return [Shen.type_func, shen_user_lambda5863, 4, Arg5862];
  var Arg5862_0 = Arg5862[0], Arg5862_1 = Arg5862[1], Arg5862_2 = Arg5862[2], Arg5862_3 = Arg5862[3];
  var R0, R1;
  return ((R0 = ("Shen.fns[\"" + Shen.call(Shen.fns["shen.app"], [Arg5862_0, "\"][1]", [Shen.type_symbol, "shen.a"]]))),
  (R1 = Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda5865(Arg5864) {
  if (Arg5864.length < 2) return [Shen.type_func, shen_user_lambda5865, 2, Arg5864];
  var Arg5864_0 = Arg5864[0], Arg5864_1 = Arg5864[1];
  return (function() {
  return Shen.call_tail(Shen.fns["js.js-from-kl-expr"], [Arg5864_1, false, Arg5864_0]);})}, 2, [Arg5862_3], undefined], Arg5862_2])),
  (function() {
  return Shen.call_tail(Shen.fns["js.emit-func-obj"], [Shen.call(Shen.fns["length"], [Arg5862_1]), R0, R1, []]);}))}, 4, [], "js.int-curry"];





Shen.fns["js.internal-op*"] = [Shen.type_func, function shen_user_lambda5876(Arg5875) {
  if (Arg5875.length < 5) return [Shen.type_func, shen_user_lambda5876, 5, Arg5875];
  var Arg5875_0 = Arg5875[0], Arg5875_1 = Arg5875[1], Arg5875_2 = Arg5875[2], Arg5875_3 = Arg5875[3], Arg5875_4 = Arg5875[4];
  return ((Shen.unwind_tail(Shen.$eq$(Shen.call(Shen.fns["length"], [Arg5875_1]), Shen.call(Shen.fns["length"], [Arg5875_2]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.int-funcall"], [Arg5875_0, Arg5875_2, Arg5875_3, Arg5875_4]);})
  : (function() {
  return Shen.call_tail(Shen.fns["js.int-curry"], [Arg5875_0, Arg5875_1, Arg5875_2, Arg5875_4]);}))}, 5, [], "js.internal-op*"];





Shen.fns["js.internal-op"] = [Shen.type_func, function shen_user_lambda5882(Arg5881) {
  if (Arg5881.length < 4) return [Shen.type_func, shen_user_lambda5882, 4, Arg5881];
  var Arg5881_0 = Arg5881[0], Arg5881_1 = Arg5881[1], Arg5881_2 = Arg5881[2], Arg5881_3 = Arg5881[3];
  var R0;
  return ((R0 = Shen.call(Shen.fns["js.int-func-args"], [Arg5881_0])),
  Shen.call(Shen.fns["js.intfunc-name"], [Arg5881_0]),
  ((Shen.empty$question$(R0))
  ? Shen.fail_obj
  : (function() {
  return Shen.call_tail(Shen.fns["js.internal-op*"], [Arg5881_0, R0, Arg5881_1, Arg5881_2, Arg5881_3]);})))}, 4, [], "js.internal-op"];





Shen.fns["js.emit-do"] = [Shen.type_func, function shen_user_lambda5888(Arg5887) {
  if (Arg5887.length < 4) return [Shen.type_func, shen_user_lambda5888, 4, Arg5887];
  var Arg5887_0 = Arg5887[0], Arg5887_1 = Arg5887[1], Arg5887_2 = Arg5887[2], Arg5887_3 = Arg5887[3];
  var R0, R1;
  return (((Shen.is_type(Arg5887_0, Shen.type_cons) && Shen.empty$question$(Arg5887_0[2])))
  ? ((R0 = Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda5890(Arg5889) {
  if (Arg5889.length < 2) return [Shen.type_func, shen_user_lambda5890, 2, Arg5889];
  var Arg5889_0 = Arg5889[0], Arg5889_1 = Arg5889[1];
  return (function() {
  return Shen.call_tail(Shen.fns["js.js-from-kl-expr"], [Arg5889_1, false, Arg5889_0]);})}, 2, [Arg5887_2], undefined], Shen.call(Shen.fns["reverse"], [Arg5887_3])])),
  (R1 = ",\x0a  "),
  ("(" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.str-join"], [R0, R1]), (",\x0a  " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5887_0[1], Arg5887_1, Arg5887_2]), ")", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])))
  : ((Shen.is_type(Arg5887_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.emit-do"], [Arg5887_0[2], Arg5887_1, Arg5887_2, [Shen.type_cons, Arg5887_0[1], Arg5887_3]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "js.emit-do"]]);})))}, 4, [], "js.emit-do"];





Shen.fns["js.std-op"] = [Shen.type_func, function shen_user_lambda5916(Arg5915) {
  if (Arg5915.length < 4) return [Shen.type_func, shen_user_lambda5916, 4, Arg5915];
  var Arg5915_0 = Arg5915[0], Arg5915_1 = Arg5915[1], Arg5915_2 = Arg5915[2], Arg5915_3 = Arg5915[3];
  var R0, R1;
  return ((R0 = [Shen.type_func, function shen_user_lambda5918(Arg5917) {
  if (Arg5917.length < 4) return [Shen.type_func, shen_user_lambda5918, 4, Arg5917];
  var Arg5917_0 = Arg5917[0], Arg5917_1 = Arg5917[1], Arg5917_2 = Arg5917[2], Arg5917_3 = Arg5917[3];
  var R0, R1, R2, R3, R4;
  return ((R4 = Shen.call(Shen.fns["js.math-op"], [Arg5917_0, Arg5917_1, Arg5917_2, Arg5917_3])),
  ((Shen.unwind_tail(Shen.$eq$(R4, Shen.fail_obj)))
  ? ((R4 = [Shen.type_func, function shen_user_lambda5920(Arg5919) {
  if (Arg5919.length < 4) return [Shen.type_func, shen_user_lambda5920, 4, Arg5919];
  var Arg5919_0 = Arg5919[0], Arg5919_1 = Arg5919[1], Arg5919_2 = Arg5919[2], Arg5919_3 = Arg5919[3];
  var R0, R1, R2, R3, R4;
  return ((R4 = Shen.call(Shen.fns["js.logic-op"], [Arg5919_0, Arg5919_1, Arg5919_2, Arg5919_3])),
  ((Shen.unwind_tail(Shen.$eq$(R4, Shen.fail_obj)))
  ? ((R4 = Shen.call(Shen.fns["js.order-op"], [Arg5919_0, Arg5919_1, Arg5919_2, Arg5919_3])),
  ((Shen.unwind_tail(Shen.$eq$(R4, Shen.fail_obj)))
  ? ((R4 = Shen.call(Shen.fns["js.basic-op"], [Arg5919_0, Arg5919_1, Arg5919_2, Arg5919_3])),
  ((Shen.unwind_tail(Shen.$eq$(R4, Shen.fail_obj)))
  ? ((R4 = [Shen.type_func, function shen_user_lambda5922(Arg5921) {
  if (Arg5921.length < 4) return [Shen.type_func, shen_user_lambda5922, 4, Arg5921];
  var Arg5921_0 = Arg5921[0], Arg5921_1 = Arg5921[1], Arg5921_2 = Arg5921[2], Arg5921_3 = Arg5921[3];
  return (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "regkl.trap-error"], Arg5921_0)) && (Shen.is_type(Arg5921_1, Shen.type_cons) && (Shen.is_type(Arg5921_1[2], Shen.type_cons) && Shen.empty$question$(Arg5921_1[2][2])))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.emit-trap-error"], [Arg5921_1[1], Arg5921_1[2][1], Arg5921_2, Arg5921_3]);})
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "do"], Arg5921_0)))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.emit-do"], [Arg5921_1, Arg5921_2, Arg5921_3, []]);})
  : (((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "fail"], Arg5921_0)) && Shen.empty$question$(Arg5921_1)))
  ? "Shen.fail_obj"
  : Shen.fail_obj)))}, 4, [Arg5919_0, Arg5919_1, Arg5919_2, Arg5919_3], undefined]),
  ((Shen.is_type(Arg5919_0, Shen.type_symbol))
  ? ((R3 = Shen.call(Shen.fns["js.internal-op"], [Arg5919_0, Arg5919_1, Arg5919_2, Arg5919_3])),
  ((Shen.unwind_tail(Shen.$eq$(R3, Shen.fail_obj)))
  ? Shen.thaw(R4)
  : R3))
  : Shen.thaw(R4)))
  : R4))
  : R4))
  : R4))}, 4, [Arg5917_0, Arg5917_1, Arg5917_2, Arg5917_3], undefined]),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "="], Arg5917_0)))
  ? ((R3 = Shen.call(Shen.fns["js.equality-op"], [Arg5917_1, Arg5917_2, Arg5917_3])),
  ((Shen.unwind_tail(Shen.$eq$(R3, Shen.fail_obj)))
  ? Shen.thaw(R4)
  : R3))
  : Shen.thaw(R4)))
  : R4))}, 4, [Arg5915_0, Arg5915_1, Arg5915_2, Arg5915_3], undefined]),
  (((Shen.is_type(Arg5915_1, Shen.type_cons) && Shen.empty$question$(Arg5915_1[2])))
  ? ((R1 = Shen.call(Shen.fns["js.predicate-op"], [Arg5915_0, Arg5915_1[1], Arg5915_2, Arg5915_3])),
  ((Shen.unwind_tail(Shen.$eq$(R1, Shen.fail_obj)))
  ? Shen.thaw(R0)
  : R1))
  : Shen.thaw(R0)))}, 4, [], "js.std-op"];





Shen.fns["js.mk-regs-aux"] = [Shen.type_func, function shen_user_lambda5934(Arg5933) {
  if (Arg5933.length < 5) return [Shen.type_func, shen_user_lambda5934, 5, Arg5933];
  var Arg5933_0 = Arg5933[0], Arg5933_1 = Arg5933[1], Arg5933_2 = Arg5933[2], Arg5933_3 = Arg5933[3], Arg5933_4 = Arg5933[4];
  var R0;
  return ((Shen.unwind_tail(Shen.$eq$(Arg5933_1, Arg5933_0)))
  ? Arg5933_4
  : ((R0 = Shen.call(Shen.fns["@s"], [Arg5933_4, Shen.call(Shen.fns["@s"], [Arg5933_3, Shen.call(Shen.fns["@s"], [Shen.str(Shen.call(Shen.fns["js.context-varname"], [Arg5933_2])), Shen.str(Arg5933_0)])])])),
  (function() {
  return Shen.call_tail(Shen.fns["js.mk-regs-aux"], [(Arg5933_0 + 1), Arg5933_1, Arg5933_2, ", ", R0]);})))}, 5, [], "js.mk-regs-aux"];





Shen.fns["js.mk-regs"] = [Shen.type_func, function shen_user_lambda5937(Arg5936) {
  if (Arg5936.length < 1) return [Shen.type_func, shen_user_lambda5937, 1, Arg5936];
  var Arg5936_0 = Arg5936[0];
  return (function() {
  return Shen.call_tail(Shen.fns["js.mk-regs-aux"], [0, Shen.call(Shen.fns["js.context-nregs"], [Arg5936_0]), Arg5936_0, "var ", ""]);})}, 1, [], "js.mk-regs"];





Shen.fns["js.mk-regs-str"] = [Shen.type_func, function shen_user_lambda5940(Arg5939) {
  if (Arg5939.length < 1) return [Shen.type_func, shen_user_lambda5940, 1, Arg5939];
  var Arg5939_0 = Arg5939[0];
  return ((Shen.unwind_tail(Shen.$eq$(Shen.call(Shen.fns["js.context-nregs"], [Arg5939_0]), 0)))
  ? ""
  : (function() {
  return Shen.call_tail(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.mk-regs"], [Arg5939_0]), ";\x0a  ", [Shen.type_symbol, "shen.a"]]);}))}, 1, [], "js.mk-regs-str"];





Shen.fns["js.mk-args-str-aux"] = [Shen.type_func, function shen_user_lambda5952(Arg5951) {
  if (Arg5951.length < 5) return [Shen.type_func, shen_user_lambda5952, 5, Arg5951];
  var Arg5951_0 = Arg5951[0], Arg5951_1 = Arg5951[1], Arg5951_2 = Arg5951[2], Arg5951_3 = Arg5951[3], Arg5951_4 = Arg5951[4];
  var R0, R1, R2;
  return ((Shen.unwind_tail(Shen.$eq$(Arg5951_1, Arg5951_0)))
  ? Arg5951_4
  : ((R0 = "~A~A~A = ~A[~A]"),
  (R1 = Shen.call(Shen.fns["js.context-argname"], [Arg5951_2])),
  (R2 = Shen.call(Shen.fns["js.arg-name"], [Arg5951_1, Arg5951_2])),
  (R2 = Shen.call(Shen.fns["shen.insert"], [Arg5951_1, Shen.call(Shen.fns["shen.insert"], [R1, Shen.call(Shen.fns["shen.insert"], [R2, Shen.call(Shen.fns["shen.insert"], [Arg5951_3, Shen.call(Shen.fns["shen.insert"], [Arg5951_4, Shen.call(Shen.fns["shen.proc-nl"], [R0])])])])])])),
  (function() {
  return Shen.call_tail(Shen.fns["js.mk-args-str-aux"], [Arg5951_0, (Arg5951_1 + 1), Arg5951_2, ", ", R2]);})))}, 5, [], "js.mk-args-str-aux"];





Shen.fns["js.mk-args-str"] = [Shen.type_func, function shen_user_lambda5958(Arg5957) {
  if (Arg5957.length < 2) return [Shen.type_func, shen_user_lambda5958, 2, Arg5957];
  var Arg5957_0 = Arg5957[0], Arg5957_1 = Arg5957[1];
  return ((Shen.unwind_tail(Shen.$eq$(0, Arg5957_0)))
  ? ""
  : (function() {
  return Shen.call_tail(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.mk-args-str-aux"], [Arg5957_0, 0, Arg5957_1, "var ", ""]), ";\x0a  ", [Shen.type_symbol, "shen.a"]]);}))}, 2, [], "js.mk-args-str"];





Shen.fns["js.emit-func-obj"] = [Shen.type_func, function shen_user_lambda5964(Arg5963) {
  if (Arg5963.length < 4) return [Shen.type_func, shen_user_lambda5964, 4, Arg5963];
  var Arg5963_0 = Arg5963[0], Arg5963_1 = Arg5963[1], Arg5963_2 = Arg5963[2], Arg5963_3 = Arg5963[3];
  var R0, R1;
  return ((((Shen.unwind_tail(Shen.$eq$(Arg5963_3, "")) || Shen.empty$question$(Arg5963_3)))
  ? (R0 = "undefined")
  : (R0 = Arg5963_3)),
  (R1 = Shen.call(Shen.fns["@s"], ["[", Shen.call(Shen.fns["@s"], [Shen.call(Shen.fns["js.str-join"], [Arg5963_2, ", "]), "]"])])),
  (function() {
  return Shen.call_tail(Shen.fns["@s"], ["[", Shen.call(Shen.fns["@s"], ["S", Shen.call(Shen.fns["@s"], ["h", Shen.call(Shen.fns["@s"], ["e", Shen.call(Shen.fns["@s"], ["n", Shen.call(Shen.fns["@s"], [".", Shen.call(Shen.fns["@s"], ["t", Shen.call(Shen.fns["@s"], ["y", Shen.call(Shen.fns["@s"], ["p", Shen.call(Shen.fns["@s"], ["e", Shen.call(Shen.fns["@s"], ["_", Shen.call(Shen.fns["@s"], ["f", Shen.call(Shen.fns["@s"], ["u", Shen.call(Shen.fns["@s"], ["n", Shen.call(Shen.fns["@s"], ["c", Shen.call(Shen.fns["@s"], [",", Shen.call(Shen.fns["@s"], [" ", Shen.call(Shen.fns["@s"], [Shen.call(Shen.fns["js.str-join"], [[Shen.type_cons, Arg5963_1, [Shen.type_cons, Shen.str(Arg5963_0), [Shen.type_cons, R1, [Shen.type_cons, R0, []]]]], ", "]), "]"])])])])])])])])])])])])])])])])])]);}))}, 4, [], "js.emit-func-obj"];





Shen.fns["js.emit-func-closure"] = [Shen.type_func, function shen_user_lambda5969(Arg5968) {
  if (Arg5968.length < 3) return [Shen.type_func, shen_user_lambda5969, 3, Arg5968];
  var Arg5968_0 = Arg5968[0], Arg5968_1 = Arg5968[1], Arg5968_2 = Arg5968[2];
  var R0, R1;
  return ((R0 = "[~A, ~A, ~A, ~A]"),
  (R1 = "Shen.type_func"),
  (function() {
  return Shen.call_tail(Shen.fns["shen.insert"], [Arg5968_2, Shen.call(Shen.fns["shen.insert"], [Arg5968_0, Shen.call(Shen.fns["shen.insert"], [Arg5968_1, Shen.call(Shen.fns["shen.insert"], [R1, Shen.call(Shen.fns["shen.proc-nl"], [R0])])])])]);}))}, 3, [], "js.emit-func-closure"];





Shen.fns["js.emit-func-body"] = [Shen.type_func, function shen_user_lambda5975(Arg5974) {
  if (Arg5974.length < 4) return [Shen.type_func, shen_user_lambda5975, 4, Arg5974];
  var Arg5974_0 = Arg5974[0], Arg5974_1 = Arg5974[1], Arg5974_2 = Arg5974[2], Arg5974_3 = Arg5974[3];
  var R0, R1, R2, R3, R4, R5, R6;
  return ((R0 = Shen.call(Shen.fns["js.func-name"], [Arg5974_0])),
  (R1 = Shen.call(Shen.fns["js.context-argname"], [Arg5974_3])),
  (R2 = Shen.call(Shen.fns["js.emit-func-closure"], [Arg5974_1, R0, R1])),
  (R2 = ("if (" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.context-argname"], [Arg5974_3]), (".length < " + Shen.call(Shen.fns["shen.app"], [Arg5974_1, (") return " + Shen.call(Shen.fns["shen.app"], [R2, "", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]]))),
  (R3 = "function ~A(~A) {~%  ~A;~%  ~A~Areturn ~A}"),
  (R4 = Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5974_2, true, Arg5974_3])),
  (R5 = Shen.call(Shen.fns["js.mk-regs-str"], [Arg5974_3])),
  (R6 = Shen.call(Shen.fns["js.mk-args-str"], [Arg5974_1, Arg5974_3])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.insert"], [R4, Shen.call(Shen.fns["shen.insert"], [R5, Shen.call(Shen.fns["shen.insert"], [R6, Shen.call(Shen.fns["shen.insert"], [R2, Shen.call(Shen.fns["shen.insert"], [R1, Shen.call(Shen.fns["shen.insert"], [R0, Shen.call(Shen.fns["shen.proc-nl"], [R3])])])])])])]);}))}, 4, [], "js.emit-func-body"];





Shen.fns["js.emit-mk-func"] = [Shen.type_func, function shen_user_lambda5981(Arg5980) {
  if (Arg5980.length < 4) return [Shen.type_func, shen_user_lambda5981, 4, Arg5980];
  var Arg5980_0 = Arg5980[0], Arg5980_1 = Arg5980[1], Arg5980_2 = Arg5980[2], Arg5980_3 = Arg5980[3];
  var R0, R1, R2;
  return ((R0 = Shen.call(Shen.fns["js.esc-obj"], [Shen.str(Arg5980_0)])),
  Shen.call(Shen.fns["js.func-name"], [Arg5980_0]),
  (R1 = Shen.call(Shen.fns["length"], [Arg5980_1])),
  (R2 = Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "shen-user-lambda"]])),
  (R2 = Shen.call(Shen.fns["js.emit-func-body"], [R2, R1, Arg5980_2, Arg5980_3])),
  (R2 = Shen.call(Shen.fns["js.emit-func-obj"], [R1, R2, [], R0])),
  ("Shen.fns[" + Shen.call(Shen.fns["shen.app"], [R0, ("] = " + Shen.call(Shen.fns["shen.app"], [R2, ";\x0a", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])))}, 4, [], "js.emit-mk-func"];





Shen.fns["js.emit-mk-closure"] = [Shen.type_func, function shen_user_lambda5987(Arg5986) {
  if (Arg5986.length < 4) return [Shen.type_func, shen_user_lambda5987, 4, Arg5986];
  var Arg5986_0 = Arg5986[0], Arg5986_1 = Arg5986[1], Arg5986_2 = Arg5986[2], Arg5986_3 = Arg5986[3];
  var R0, R1, R2;
  return ((R0 = Shen.call(Shen.fns["js.context-toplevel"], [Arg5986_3])),
  (R1 = [Shen.type_symbol, "Arg"]),
  (R2 = (Shen.call(Shen.fns["length"], [Arg5986_1]) + Shen.call(Shen.fns["length"], [Arg5986_0]))),
  (R1 = Shen.call(Shen.fns["js.mk-context"], [0, R0, Shen.call(Shen.fns["gensym"], [R1]), [Shen.type_symbol, "R"]])),
  (R0 = Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "shen-user-lambda"]])),
  (R0 = Shen.call(Shen.fns["js.emit-func-body"], [R0, R2, Arg5986_2, R1])),
  Shen.call(Shen.fns["js.context-toplevel->"], [Arg5986_3, Shen.call(Shen.fns["js.context-toplevel"], [R1])]),
  (R1 = Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda5989(Arg5988) {
  if (Arg5988.length < 2) return [Shen.type_func, shen_user_lambda5989, 2, Arg5988];
  var Arg5988_0 = Arg5988[0], Arg5988_1 = Arg5988[1];
  return (function() {
  return Shen.call_tail(Shen.fns["js.js-from-kl-expr"], [Arg5988_1, false, Arg5988_0]);})}, 2, [Arg5986_3], undefined], Arg5986_1])),
  (function() {
  return Shen.call_tail(Shen.fns["js.emit-func-obj"], [R2, R0, R1, []]);}))}, 4, [], "js.emit-mk-closure"];





Shen.fns["js.emit-mk-toplevel"] = [Shen.type_func, function shen_user_lambda5993(Arg5992) {
  if (Arg5992.length < 2) return [Shen.type_func, shen_user_lambda5993, 2, Arg5992];
  var Arg5992_0 = Arg5992[0], Arg5992_1 = Arg5992[1];
  var R0;
  return ((R0 = Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "js.shen-js-toplevel"]])),
  (R0 = Shen.call(Shen.fns["js.emit-func-body"], [R0, 0, Arg5992_0, Arg5992_1])),
  ("Shen.call_toplevel(" + (R0 + ");")))}, 2, [], "js.emit-mk-toplevel"];





Shen.fns["js.emit-thaw"] = [Shen.type_func, function shen_user_lambda5998(Arg5997) {
  if (Arg5997.length < 3) return [Shen.type_func, shen_user_lambda5998, 3, Arg5997];
  var Arg5997_0 = Arg5997[0], Arg5997_1 = Arg5997[1], Arg5997_2 = Arg5997[2];
  return ((Shen.unwind_tail(Shen.$eq$(false, Arg5997_1)))
  ? ("Shen.unwind_tail(" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.emit-thaw"], [Arg5997_0, true, Arg5997_2]), ")", [Shen.type_symbol, "shen.a"]]))
  : ((Shen.unwind_tail(Shen.$eq$(true, Arg5997_1)))
  ? ("Shen.thaw(" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg5997_0, false, Arg5997_2]), ")", [Shen.type_symbol, "shen.a"]]))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "js.emit-thaw"]]);})))}, 3, [], "js.emit-thaw"];





Shen.fns["js.emit-freeze"] = [Shen.type_func, function shen_user_lambda6003(Arg6002) {
  if (Arg6002.length < 3) return [Shen.type_func, shen_user_lambda6003, 3, Arg6002];
  var Arg6002_0 = Arg6002[0], Arg6002_1 = Arg6002[1], Arg6002_2 = Arg6002[2];
  return (function() {
  return Shen.call_tail(Shen.fns["js.emit-mk-closure"], [[], Arg6002_0, Arg6002_1, Arg6002_2]);})}, 3, [], "js.emit-freeze"];





Shen.fns["js.emit-get-arg"] = [Shen.type_func, function shen_user_lambda6007(Arg6006) {
  if (Arg6006.length < 2) return [Shen.type_func, shen_user_lambda6007, 2, Arg6006];
  var Arg6006_0 = Arg6006[0], Arg6006_1 = Arg6006[1];
  return (function() {
  return Shen.call_tail(Shen.fns["js.arg-name"], [Arg6006_0, Arg6006_1]);})}, 2, [], "js.emit-get-arg"];





Shen.fns["js.emit-set-reg"] = [Shen.type_func, function shen_user_lambda6012(Arg6011) {
  if (Arg6011.length < 3) return [Shen.type_func, shen_user_lambda6012, 3, Arg6011];
  var Arg6011_0 = Arg6011[0], Arg6011_1 = Arg6011[1], Arg6011_2 = Arg6011[2];
  var R0;
  return ((R0 = Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg6011_1, false, Arg6011_2])),
  Shen.call(Shen.fns["js.context-nregs->"], [Arg6011_2, Shen.call(Shen.fns["js.max"], [(Arg6011_0 + 1), Shen.call(Shen.fns["js.context-nregs"], [Arg6011_2])])]),
  ("(" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.context-varname"], [Arg6011_2]), Shen.call(Shen.fns["shen.app"], [Arg6011_0, (" = " + Shen.call(Shen.fns["shen.app"], [R0, ")", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]]), [Shen.type_symbol, "shen.a"]])))}, 3, [], "js.emit-set-reg"];





Shen.fns["js.emit-get-reg"] = [Shen.type_func, function shen_user_lambda6016(Arg6015) {
  if (Arg6015.length < 2) return [Shen.type_func, shen_user_lambda6016, 2, Arg6015];
  var Arg6015_0 = Arg6015[0], Arg6015_1 = Arg6015[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.context-varname"], [Arg6015_1]), Shen.call(Shen.fns["shen.app"], [Arg6015_0, "", [Shen.type_symbol, "shen.a"]]), [Shen.type_symbol, "shen.a"]]);})}, 2, [], "js.emit-get-reg"];





Shen.fns["js.func-arg"] = [Shen.type_func, function shen_user_lambda6020(Arg6019) {
  if (Arg6019.length < 2) return [Shen.type_func, shen_user_lambda6020, 2, Arg6019];
  var Arg6019_0 = Arg6019[0], Arg6019_1 = Arg6019[1];
  return (function() {
  return Shen.call_tail(Shen.fns["js.js-from-kl-expr"], [Arg6019_1, false, Arg6019_0]);})}, 2, [], "js.func-arg"];





Shen.fns["js.emit-funcall*"] = [Shen.type_func, function shen_user_lambda6026(Arg6025) {
  if (Arg6025.length < 4) return [Shen.type_func, shen_user_lambda6026, 4, Arg6025];
  var Arg6025_0 = Arg6025[0], Arg6025_1 = Arg6025[1], Arg6025_2 = Arg6025[2], Arg6025_3 = Arg6025[3];
  var R0, R1;
  return ((Shen.unwind_tail(Shen.$eq$(true, Arg6025_2)))
  ? ((R0 = Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda6028(Arg6027) {
  if (Arg6027.length < 2) return [Shen.type_func, shen_user_lambda6028, 2, Arg6027];
  var Arg6027_0 = Arg6027[0], Arg6027_1 = Arg6027[1];
  return (function() {
  return Shen.call_tail(Shen.fns["js.js-from-kl-expr"], [Arg6027_1, false, Arg6027_0]);})}, 2, [Arg6025_3], undefined], Arg6025_1])),
  (R0 = Shen.call(Shen.fns["js.str-join"], [R0, ", "])),
  (R1 = "Shen.call_tail"),
  (function() {
  return Shen.call_tail(Shen.fns["js.tail-call-ret"], [Shen.call(Shen.fns["shen.app"], [R1, ("(" + Shen.call(Shen.fns["shen.app"], [Arg6025_0, (", [" + Shen.call(Shen.fns["shen.app"], [R0, "])", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])]);}))
  : ((Shen.unwind_tail(Shen.$eq$(false, Arg6025_2)))
  ? ((R0 = Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda6030(Arg6029) {
  if (Arg6029.length < 2) return [Shen.type_func, shen_user_lambda6030, 2, Arg6029];
  var Arg6029_0 = Arg6029[0], Arg6029_1 = Arg6029[1];
  return (function() {
  return Shen.call_tail(Shen.fns["js.js-from-kl-expr"], [Arg6029_1, false, Arg6029_0]);})}, 2, [Arg6025_3], undefined], Arg6025_1])),
  (R0 = Shen.call(Shen.fns["js.str-join"], [R0, ", "])),
  ("Shen.call(" + Shen.call(Shen.fns["shen.app"], [Arg6025_0, (", [" + Shen.call(Shen.fns["shen.app"], [R0, "])", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "js.emit-funcall*"]]);})))}, 4, [], "js.emit-funcall*"];





Shen.fns["js.emit-funcall"] = [Shen.type_func, function shen_user_lambda6036(Arg6035) {
  if (Arg6035.length < 4) return [Shen.type_func, shen_user_lambda6036, 4, Arg6035];
  var Arg6035_0 = Arg6035[0], Arg6035_1 = Arg6035[1], Arg6035_2 = Arg6035[2], Arg6035_3 = Arg6035[3];
  var R0;
  return ((R0 = Shen.call(Shen.fns["js.esc-obj"], [Shen.str(Arg6035_0)])),
  (R0 = ("Shen.fns[" + Shen.call(Shen.fns["shen.app"], [R0, "]", [Shen.type_symbol, "shen.a"]]))),
  (function() {
  return Shen.call_tail(Shen.fns["js.emit-funcall*"], [R0, Arg6035_1, Arg6035_2, Arg6035_3]);}))}, 4, [], "js.emit-funcall"];





Shen.fns["js.js-from-kl-expr"] = [Shen.type_func, function shen_user_lambda6041(Arg6040) {
  if (Arg6040.length < 3) return [Shen.type_func, shen_user_lambda6041, 3, Arg6040];
  var Arg6040_0 = Arg6040[0], Arg6040_1 = Arg6040[1], Arg6040_2 = Arg6040[2];
  var R0;
  return ((R0 = Shen.call(Shen.fns["js.js-from-kl-expr*"], [Arg6040_0, Arg6040_1, Arg6040_2])),
  (((typeof(R0) == 'string'))
  ? R0
  : (function() {
  return Shen.simple_error(("ERROR: expr " + Shen.call(Shen.fns["shen.app"], [Arg6040_0, (" => " + Shen.call(Shen.fns["shen.app"], [R0, "", [Shen.type_symbol, "shen.r"]])), [Shen.type_symbol, "shen.r"]])));})))}, 3, [], "js.js-from-kl-expr"];





Shen.fns["js.js-from-kl-expr*"] = [Shen.type_func, function shen_user_lambda6108(Arg6107) {
  if (Arg6107.length < 3) return [Shen.type_func, shen_user_lambda6108, 3, Arg6107];
  var Arg6107_0 = Arg6107[0], Arg6107_1 = Arg6107[1], Arg6107_2 = Arg6107[2];
  var R0, R1;
  return ((Shen.empty$question$(Arg6107_0))
  ? "[]"
  : (((typeof(Arg6107_0) == 'number'))
  ? (function() {
  return Shen.str(Arg6107_0);})
  : ((Shen.unwind_tail(Shen.$eq$(Arg6107_0, Shen.fail_obj)))
  ? "shen_fail_obj"
  : ((Shen.unwind_tail(Shen.$eq$(true, Arg6107_0)))
  ? "true"
  : ((Shen.unwind_tail(Shen.$eq$(false, Arg6107_0)))
  ? "false"
  : ((Shen.is_type(Arg6107_0, Shen.type_symbol))
  ? ("[Shen.type_symbol, " + Shen.call(Shen.fns["shen.app"], [Shen.str(Arg6107_0), "]", [Shen.type_symbol, "shen.s"]]))
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "bar!"], Arg6107_0)))
  ? ("[Shen.type_symbol, " + Shen.call(Shen.fns["shen.app"], ["|", "]", [Shen.type_symbol, "shen.s"]]))
  : (((Shen.is_type(Arg6107_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cons"], Arg6107_0[1])) && (Shen.is_type(Arg6107_0[2], Shen.type_cons) && (Shen.is_type(Arg6107_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg6107_0[2][2][2]))))))
  ? ("[Shen.type_cons, " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg6107_0[2][1], false, Arg6107_2]), (", " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg6107_0[2][2][1], false, Arg6107_2]), "]", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]]))
  : (((Shen.is_type(Arg6107_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "type"], Arg6107_0[1])) && (Shen.is_type(Arg6107_0[2], Shen.type_cons) && (Shen.is_type(Arg6107_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg6107_0[2][2][2]))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.js-from-kl-expr"], [Arg6107_0[2][1], Arg6107_1, Arg6107_2]);})
  : (((Shen.is_type(Arg6107_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cond"], Arg6107_0[1]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.emit-cond"], [Arg6107_0[2], Arg6107_1, Arg6107_2]);})
  : (((Shen.is_type(Arg6107_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "if"], Arg6107_0[1])) && (Shen.is_type(Arg6107_0[2], Shen.type_cons) && (Shen.is_type(Arg6107_0[2][2], Shen.type_cons) && (Shen.is_type(Arg6107_0[2][2][2], Shen.type_cons) && Shen.empty$question$(Arg6107_0[2][2][2][2])))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.emit-cond"], [[Shen.type_cons, [Shen.type_cons, Arg6107_0[2][1], [Shen.type_cons, Arg6107_0[2][2][1], []]], [Shen.type_cons, [Shen.type_cons, true, Arg6107_0[2][2][2]], []]], Arg6107_1, Arg6107_2]);})
  : (((Shen.is_type(Arg6107_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "freeze"], Arg6107_0[1])) && (Shen.is_type(Arg6107_0[2], Shen.type_cons) && Shen.empty$question$(Arg6107_0[2][2])))))
  ? (function() {
  return Shen.simple_error("Wrong freeze code!");})
  : (((Shen.is_type(Arg6107_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "regkl.freeze"], Arg6107_0[1])) && (Shen.is_type(Arg6107_0[2], Shen.type_cons) && (Shen.is_type(Arg6107_0[2][2], Shen.type_cons) && (Shen.is_type(Arg6107_0[2][2][2], Shen.type_cons) && Shen.empty$question$(Arg6107_0[2][2][2][2])))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.emit-freeze"], [Arg6107_0[2][2][1], Arg6107_0[2][2][2][1], Arg6107_2]);})
  : (((Shen.is_type(Arg6107_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "regkl.arg"], Arg6107_0[1])) && (Shen.is_type(Arg6107_0[2], Shen.type_cons) && Shen.empty$question$(Arg6107_0[2][2])))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.emit-get-arg"], [Arg6107_0[2][1], Arg6107_2]);})
  : (((Shen.is_type(Arg6107_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "regkl.reg"], Arg6107_0[1])) && (Shen.is_type(Arg6107_0[2], Shen.type_cons) && Shen.empty$question$(Arg6107_0[2][2])))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.emit-get-reg"], [Arg6107_0[2][1], Arg6107_2]);})
  : (((Shen.is_type(Arg6107_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "regkl.reg->"], Arg6107_0[1])) && (Shen.is_type(Arg6107_0[2], Shen.type_cons) && (Shen.is_type(Arg6107_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg6107_0[2][2][2]))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.emit-set-reg"], [Arg6107_0[2][1], Arg6107_0[2][2][1], Arg6107_2]);})
  : (((Shen.is_type(Arg6107_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "regkl.func"], Arg6107_0[1])) && (Shen.is_type(Arg6107_0[2], Shen.type_cons) && (Shen.is_type(Arg6107_0[2][2], Shen.type_cons) && (Shen.is_type(Arg6107_0[2][2][2], Shen.type_cons) && (Shen.is_type(Arg6107_0[2][2][2][2], Shen.type_cons) && Shen.empty$question$(Arg6107_0[2][2][2][2][2]))))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.emit-mk-func"], [Arg6107_0[2][1], Arg6107_0[2][2][1], Arg6107_0[2][2][2][2][1], Arg6107_2]);})
  : (((Shen.is_type(Arg6107_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "regkl.closure"], Arg6107_0[1])) && (Shen.is_type(Arg6107_0[2], Shen.type_cons) && (Shen.is_type(Arg6107_0[2][2], Shen.type_cons) && (Shen.is_type(Arg6107_0[2][2][2], Shen.type_cons) && (Shen.is_type(Arg6107_0[2][2][2][2], Shen.type_cons) && Shen.empty$question$(Arg6107_0[2][2][2][2][2]))))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.emit-mk-closure"], [Arg6107_0[2][1], Arg6107_0[2][2][2][1], Arg6107_0[2][2][2][2][1], Arg6107_2]);})
  : (((Shen.is_type(Arg6107_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "regkl.toplevel"], Arg6107_0[1])) && (Shen.is_type(Arg6107_0[2], Shen.type_cons) && (Shen.is_type(Arg6107_0[2][2], Shen.type_cons) && (Shen.is_type(Arg6107_0[2][2][2], Shen.type_cons) && (Shen.is_type(Arg6107_0[2][2][2][2], Shen.type_cons) && Shen.empty$question$(Arg6107_0[2][2][2][2][2]))))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.emit-mk-toplevel"], [Arg6107_0[2][2][2][2][1], Arg6107_2]);})
  : ((R0 = [Shen.type_func, function shen_user_lambda6110(Arg6109) {
  if (Arg6109.length < 3) return [Shen.type_func, shen_user_lambda6110, 3, Arg6109];
  var Arg6109_0 = Arg6109[0], Arg6109_1 = Arg6109[1], Arg6109_2 = Arg6109[2];
  var R0, R1, R2, R3;
  return (((Shen.is_type(Arg6109_0, Shen.type_cons) && Shen.is_type(Arg6109_0[1], Shen.type_cons)))
  ? ((R3 = Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg6109_0[1], false, Arg6109_2])),
  (function() {
  return Shen.call_tail(Shen.fns["js.emit-funcall*"], [R3, Arg6109_0[2], Arg6109_1, Arg6109_2]);}))
  : ((Shen.is_type(Arg6109_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.emit-funcall"], [Arg6109_0[1], Arg6109_0[2], Arg6109_1, Arg6109_2]);})
  : (function() {
  return Shen.call_tail(Shen.fns["js.esc-obj"], [Arg6109_0]);})))}, 3, [Arg6107_0, Arg6107_1, Arg6107_2], undefined]),
  ((Shen.is_type(Arg6107_0, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["js.std-op"], [Arg6107_0[1], Arg6107_0[2], Arg6107_1, Arg6107_2])),
  ((Shen.unwind_tail(Shen.$eq$(R1, Shen.fail_obj)))
  ? Shen.thaw(R0)
  : R1))
  : Shen.thaw(R0))))))))))))))))))))))}, 3, [], "js.js-from-kl-expr*"];





Shen.fns["js.js-from-kl-toplevel-expr"] = [Shen.type_func, function shen_user_lambda6114(Arg6113) {
  if (Arg6113.length < 2) return [Shen.type_func, shen_user_lambda6114, 2, Arg6113];
  var Arg6113_0 = Arg6113[0], Arg6113_1 = Arg6113[1];
  var R0, R1;
  return (((typeof(Arg6113_0) == 'string'))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg6113_0, false, Arg6113_1]), ";\x0a", [Shen.type_symbol, "shen.a"]]);})
  : ((R0 = Shen.call(Shen.fns["js.js-from-kl-expr"], [Arg6113_0, false, Arg6113_1])),
  (R1 = Shen.call(Shen.fns["js.mk-regs-str"], [Arg6113_1])),
  (((Shen.call(Shen.fns["js.context-nregs"], [Arg6113_1]) > 0))
  ? ("((function() {\x0a  " + Shen.call(Shen.fns["shen.app"], [R1, ("return " + Shen.call(Shen.fns["shen.app"], [R0, "})());\x0a", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]]))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.app"], [R0, ";", [Shen.type_symbol, "shen.a"]]);}))))}, 2, [], "js.js-from-kl-toplevel-expr"];





Shen.fns["js.js-from-kl-toplevel"] = [Shen.type_func, function shen_user_lambda6134(Arg6133) {
  if (Arg6133.length < 3) return [Shen.type_func, shen_user_lambda6134, 3, Arg6133];
  var Arg6133_0 = Arg6133[0], Arg6133_1 = Arg6133[1], Arg6133_2 = Arg6133[2];
  return (((Shen.is_type(Arg6133_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "set"], Arg6133_0[1])) && (Shen.is_type(Arg6133_0[2], Shen.type_cons) && (Shen.is_type(Arg6133_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg6133_0[2][2][2]))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["@s"], [Shen.call(Shen.fns["js.emit-set"], [Arg6133_0[2][1], Arg6133_0[2][2][1], Arg6133_2]), ";\x0a"]);})
  : (((Shen.is_type(Arg6133_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "regkl.func"], Arg6133_0[1])) && (Shen.is_type(Arg6133_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$(true, Arg6133_1)) && Shen.call(Shen.fns["js.int-func?"], [Arg6133_0[2][1]]))))))
  ? ""
  : (((Shen.is_type(Arg6133_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "regkl.func"], Arg6133_0[1]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.js-from-kl-expr"], [Arg6133_0, true, Arg6133_2]);})
  : (((Shen.is_type(Arg6133_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "regkl.toplevel"], Arg6133_0[1]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["js.js-from-kl-expr"], [Arg6133_0, true, Arg6133_2]);})
  : (((Shen.is_type(Arg6133_0, Shen.type_cons) && (Shen.empty$question$(Arg6133_0[2]) && Shen.is_type(Arg6133_0[1], Shen.type_symbol))))
  ? ("Shen.call_toplevel(" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["js.esc-obj"], [Shen.str(Arg6133_0[1])]), ")\x0a", [Shen.type_symbol, "shen.a"]]))
  : (((Shen.is_type(Arg6133_0, Shen.type_cons) && Shen.empty$question$(Arg6133_0[2])))
  ? (function() {
  return Shen.simple_error(("Unexpected toplevel expression: " + Shen.call(Shen.fns["shen.app"], [Arg6133_0[1], "\x0a", [Shen.type_symbol, "shen.r"]])));})
  : (function() {
  return Shen.call_tail(Shen.fns["js.js-from-kl-toplevel-expr"], [Arg6133_0, Arg6133_2]);})))))))}, 3, [], "js.js-from-kl-toplevel"];





Shen.fns["js.js-from-kl-toplevel-forms"] = [Shen.type_func, function shen_user_lambda6142(Arg6141) {
  if (Arg6141.length < 4) return [Shen.type_func, shen_user_lambda6142, 4, Arg6141];
  var Arg6141_0 = Arg6141[0], Arg6141_1 = Arg6141[1], Arg6141_2 = Arg6141[2], Arg6141_3 = Arg6141[3];
  var R0;
  return ((Shen.empty$question$(Arg6141_0))
  ? (function() {
  return Shen.call_tail(Shen.fns["@s"], [Shen.call(Shen.fns["js.context-toplevel"], [Arg6141_2]), Shen.call(Shen.fns["@s"], ["\x0a", Shen.call(Shen.fns["@s"], [Arg6141_3, "\x0a"])])]);})
  : ((Shen.is_type(Arg6141_0, Shen.type_cons))
  ? ((R0 = Shen.call(Shen.fns["js.js-from-kl-toplevel"], [Arg6141_0[1], Arg6141_1, Arg6141_2])),
  (R0 = (Arg6141_3 + (R0 + "\x0a"))),
  (function() {
  return Shen.call_tail(Shen.fns["js.js-from-kl-toplevel-forms"], [Arg6141_0[2], Arg6141_1, Arg6141_2, R0]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "js.js-from-kl-toplevel-forms"]]);})))}, 4, [], "js.js-from-kl-toplevel-forms"];





Shen.fns["js.js-from-kl*"] = [Shen.type_func, function shen_user_lambda6147(Arg6146) {
  if (Arg6146.length < 3) return [Shen.type_func, shen_user_lambda6147, 3, Arg6146];
  var Arg6146_0 = Arg6146[0], Arg6146_1 = Arg6146[1], Arg6146_2 = Arg6146[2];
  return (function() {
  return Shen.call_tail(Shen.fns["js.js-from-kl-toplevel"], [Arg6146_0, Arg6146_1, Arg6146_2]);})}, 3, [], "js.js-from-kl*"];





Shen.fns["js-from-kl"] = [Shen.type_func, function shen_user_lambda6150(Arg6149) {
  if (Arg6149.length < 1) return [Shen.type_func, shen_user_lambda6150, 1, Arg6149];
  var Arg6149_0 = Arg6149[0];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["js.mk-context"], [0, "", Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "Arg"]]), [Shen.type_symbol, "R"]])),
  (R1 = Shen.call(Shen.fns["regkl.walk"], [[Shen.type_cons, Arg6149_0, []], false])),
  (R1 = Shen.call(Shen.fns["js.js-from-kl-toplevel-forms"], [R1, (Shen.globals["js.skip-internals"]), R0, ""])),
  (function() {
  return Shen.call_tail(Shen.fns["@s"], [Shen.call(Shen.fns["js.context-toplevel"], [R0]), Shen.call(Shen.fns["@s"], ["\x0a", Shen.call(Shen.fns["@s"], [R1, "\x0a"])])]);}))}, 1, [], "js-from-kl"];





Shen.fns["js.js-from-kl-all"] = [Shen.type_func, function shen_user_lambda6153(Arg6152) {
  if (Arg6152.length < 1) return [Shen.type_func, shen_user_lambda6153, 1, Arg6152];
  var Arg6152_0 = Arg6152[0];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["regkl.walk"], [Arg6152_0, false])),
  (R1 = Shen.call(Shen.fns["js.mk-context"], [0, "", Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "Arg"]]), [Shen.type_symbol, "R"]])),
  (function() {
  return Shen.call_tail(Shen.fns["js.js-from-kl-toplevel-all"], [R0, (Shen.globals["js.skip-internals"]), R1, ""]);}))}, 1, [], "js.js-from-kl-all"];





Shen.call_toplevel(function js$dot$shen_js_toplevel6156(Arg6154) {
  if (Arg6154.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6156, 0, Arg6154];
  return (Shen.globals["js.skip-internals"] = true)});




Shen.fns["js.dump-exprs-to-file"] = [Shen.type_func, function shen_user_lambda6162(Arg6161) {
  if (Arg6161.length < 2) return [Shen.type_func, shen_user_lambda6162, 2, Arg6161];
  var Arg6161_0 = Arg6161[0], Arg6161_1 = Arg6161[1];
  var R0;
  return ((Shen.empty$question$(Arg6161_0))
  ? true
  : ((Shen.is_type(Arg6161_0, Shen.type_cons))
  ? ((R0 = Shen.call(Shen.fns["js.kl-from-shen"], [Arg6161_0[1]])),
  (R0 = Shen.call(Shen.fns["js-from-kl"], [R0])),
  (((typeof(R0) == 'string'))
  ? [Shen.type_symbol, "_"]
  : Shen.simple_error(Shen.call(Shen.fns["shen.app"], [R0, " is not a string", [Shen.type_symbol, "shen.a"]]))),
  Shen.call(Shen.fns["pr"], [R0, Arg6161_1]),
  (function() {
  return Shen.call_tail(Shen.fns["js.dump-exprs-to-file"], [Arg6161_0[2], Arg6161_1]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "js.dump-exprs-to-file"]]);})))}, 2, [], "js.dump-exprs-to-file"];





Shen.fns["js.dump-to-file"] = [Shen.type_func, function shen_user_lambda6166(Arg6165) {
  if (Arg6165.length < 2) return [Shen.type_func, shen_user_lambda6166, 2, Arg6165];
  var Arg6165_0 = Arg6165[0], Arg6165_1 = Arg6165[1];
  var R0;
  return ((R0 = Shen.open(Arg6165_1, [Shen.type_symbol, "out"])),
  Shen.call(Shen.fns["js.dump-exprs-to-file"], [Arg6165_0, R0]),
  Shen.close(R0),
  true)}, 2, [], "js.dump-to-file"];





Shen.fns["js.kl-from-shen"] = [Shen.type_func, function shen_user_lambda6169(Arg6168) {
  if (Arg6168.length < 1) return [Shen.type_func, shen_user_lambda6169, 1, Arg6168];
  var Arg6168_0 = Arg6168[0];
  var R0;
  return ((R0 = Shen.call(Shen.fns["shen.walk"], [[Shen.type_func, function shen_user_lambda6171(Arg6170) {
  if (Arg6170.length < 1) return [Shen.type_func, shen_user_lambda6171, 1, Arg6170];
  var Arg6170_0 = Arg6170[0];
  return (function() {
  return Shen.call_tail(Shen.fns["macroexpand"], [Arg6170_0]);})}, 1, [], undefined], Arg6168_0])),
  ((Shen.call(Shen.fns["shen.packaged?"], [R0]))
  ? (R0 = Shen.call(Shen.fns["js.package-contents"], [R0]))
  : (R0 = R0)),
  (function() {
  return Shen.call_tail(Shen.fns["shen.elim-def"], [Shen.call(Shen.fns["shen.proc-input+"], [R0])]);}))}, 1, [], "js.kl-from-shen"];





Shen.fns["js-from-shen"] = [Shen.type_func, function shen_user_lambda6174(Arg6173) {
  if (Arg6173.length < 1) return [Shen.type_func, shen_user_lambda6174, 1, Arg6173];
  var Arg6173_0 = Arg6173[0];
  return (function() {
  return Shen.call_tail(Shen.fns["js-from-kl"], [Shen.call(Shen.fns["js.kl-from-shen"], [Arg6173_0])]);})}, 1, [], "js-from-shen"];





Shen.call_toplevel(function js$dot$shen_js_toplevel6177(Arg6175) {
  if (Arg6175.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6177, 0, Arg6175];
  return (Shen.globals["js.*silence*"] = false)});




Shen.fns["js.dump"] = [Shen.type_func, function shen_user_lambda6182(Arg6181) {
  if (Arg6181.length < 3) return [Shen.type_func, shen_user_lambda6182, 3, Arg6181];
  var Arg6181_0 = Arg6181[0], Arg6181_1 = Arg6181[1], Arg6181_2 = Arg6181[2];
  var R0, R1, R2;
  return ((R0 = Shen.call(Shen.fns["shen.app"], [Arg6181_2, Shen.call(Shen.fns["shen.app"], [Arg6181_1, ".js", [Shen.type_symbol, "shen.a"]]), [Shen.type_symbol, "shen.a"]])),
  (R1 = Shen.call(Shen.fns["shen.app"], [Arg6181_0, Shen.call(Shen.fns["shen.app"], [Arg6181_1, "", [Shen.type_symbol, "shen.a"]]), [Shen.type_symbol, "shen.a"]])),
  (R2 = Shen.call(Shen.fns["read-file"], [R1])),
  (((Shen.globals["js.*silence*"]))
  ? [Shen.type_symbol, "_"]
  : Shen.call(Shen.fns["shen.prhush"], [("== " + Shen.call(Shen.fns["shen.app"], [R1, (" -> " + Shen.call(Shen.fns["shen.app"], [R0, "\x0a", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])), Shen.call(Shen.fns["stoutput"], [])])),
  (function() {
  return Shen.call_tail(Shen.fns["js.dump-to-file"], [R2, R0]);}))}, 3, [], "js.dump"];





Shen.call_toplevel(function js$dot$shen_js_toplevel6185(Arg6183) {
  if (Arg6183.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6185, 0, Arg6183];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "js.dump"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel6190(Arg6186) {
  if (Arg6186.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6190, 0, Arg6186];
  var R0, R1;
  return ((R0 = [Shen.type_func, function shen_user_lambda6192(Arg6191) {
  if (Arg6191.length < 0) return [Shen.type_func, shen_user_lambda6192, 0, Arg6191];
  return (function() {
  return Shen.call_tail(Shen.fns["register-dumper"], [[Shen.type_symbol, "javascript"], [Shen.type_symbol, "all"], [Shen.type_symbol, "js.dump"]]);})}, 0, [], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda6194(Arg6193) {
  if (Arg6193.length < 1) return [Shen.type_func, shen_user_lambda6194, 1, Arg6193];
  var Arg6193_0 = Arg6193[0];
  return [Shen.type_symbol, "_"]}, 1, [], undefined]),
  (function() {
  return Shen.trap_error(R0, R1);}))});




Shen.fns["shenjs.repl-split-input-aux"] = [Shen.type_func, function shen_user_lambda6199(Arg6198) {
  if (Arg6198.length < 3) return [Shen.type_func, shen_user_lambda6199, 3, Arg6198];
  var Arg6198_0 = Arg6198[0], Arg6198_1 = Arg6198[1], Arg6198_2 = Arg6198[2];
  var R0, R1, R2;
  return ((Shen.empty$question$(Arg6198_0))
  ? Arg6198_2
  : ((Shen.is_type(Arg6198_0, Shen.type_cons))
  ? ((R0 = [Shen.type_cons, Arg6198_0[1], Arg6198_1]),
  (R1 = Shen.call(Shen.fns["reverse"], [R0])),
  (R2 = Shen.call(Shen.fns["compile"], [[Shen.type_symbol, "shen.<st_input>"], R1, [Shen.type_func, function shen_user_lambda6201(Arg6200) {
  if (Arg6200.length < 1) return [Shen.type_func, shen_user_lambda6201, 1, Arg6200];
  var Arg6200_0 = Arg6200[0];
  return Shen.fail_obj}, 1, [], undefined]])),
  (function() {
  return Shen.call_tail(Shen.fns["shenjs.repl-split-input-aux"], [Arg6198_0[2], R0, (((Shen.unwind_tail(Shen.$eq$(R2, Shen.fail_obj)) || Shen.empty$question$(R2)))
  ? Arg6198_2
  : [Shen.fns['shen.tuple'], R1, Arg6198_0[2]])]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.f_error"], [[Shen.type_symbol, "shenjs.repl-split-input-aux"]]);})))}, 3, [], "shenjs.repl-split-input-aux"];





Shen.fns["shenjs.repl-split-input"] = [Shen.type_func, function shen_user_lambda6204(Arg6203) {
  if (Arg6203.length < 1) return [Shen.type_func, shen_user_lambda6204, 1, Arg6203];
  var Arg6203_0 = Arg6203[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shenjs.repl-split-input-aux"], [Arg6203_0, [], []]);})}, 1, [], "shenjs.repl-split-input"];










Shen.fns["shen.shen->kl"] = [Shen.type_func, function shen_user_lambda6634(Arg6633) {
  if (Arg6633.length < 2) return [Shen.type_func, shen_user_lambda6634, 2, Arg6633];
  var Arg6633_0 = Arg6633[0], Arg6633_1 = Arg6633[1];
  return (function() {
  return Shen.call_tail(Shen.fns["compile"], [[Shen.type_func, function shen_user_lambda6636(Arg6635) {
  if (Arg6635.length < 1) return [Shen.type_func, shen_user_lambda6636, 1, Arg6635];
  var Arg6635_0 = Arg6635[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.<define>"], [Arg6635_0]);})}, 1, [], undefined], [Shen.type_cons, Arg6633_0, Arg6633_1], [Shen.type_func, function shen_user_lambda6638(Arg6637) {
  if (Arg6637.length < 2) return [Shen.type_func, shen_user_lambda6638, 2, Arg6637];
  var Arg6637_0 = Arg6637[0], Arg6637_1 = Arg6637[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.shen-syntax-error"], [Arg6637_0, Arg6637_1]);})}, 2, [Arg6633_0], undefined]]);})}, 2, [], "shen.shen->kl"];





Shen.fns["shen.shen-syntax-error"] = [Shen.type_func, function shen_user_lambda6640(Arg6639) {
  if (Arg6639.length < 2) return [Shen.type_func, shen_user_lambda6640, 2, Arg6639];
  var Arg6639_0 = Arg6639[0], Arg6639_1 = Arg6639[1];
  return (function() {
  return Shen.simple_error(("syntax error in " + Shen.call(Shen.fns["shen.app"], [Arg6639_0, (" here:\x0d\x0a\x0d\x0a " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["shen.next-50"], [50, Arg6639_1]), "\x0d\x0a", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])));})}, 2, [], "shen.shen-syntax-error"];





Shen.fns["shen.<define>"] = [Shen.type_func, function shen_user_lambda6642(Arg6641) {
  if (Arg6641.length < 1) return [Shen.type_func, shen_user_lambda6642, 1, Arg6641];
  var Arg6641_0 = Arg6641[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<name>"], [Arg6641_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<signature>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? ((R1 = Shen.call(Shen.fns["shen.<rules>"], [R1])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], Shen.call(Shen.fns["shen.compile_to_machine_code"], [Shen.call(Shen.fns["shen.hdtl"], [R0]), Shen.call(Shen.fns["shen.hdtl"], [R1])])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<name>"], [Arg6641_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<rules>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], Shen.call(Shen.fns["shen.compile_to_machine_code"], [Shen.call(Shen.fns["shen.hdtl"], [R0]), Shen.call(Shen.fns["shen.hdtl"], [R1])])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<define>"];





Shen.fns["shen.<name>"] = [Shen.type_func, function shen_user_lambda6644(Arg6643) {
  if (Arg6643.length < 1) return [Shen.type_func, shen_user_lambda6644, 1, Arg6643];
  var Arg6643_0 = Arg6643[0];
  var R0;
  return (((Shen.is_type(Arg6643_0[1], Shen.type_cons))
  ? ((R0 = Arg6643_0[1][1]),
  (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg6643_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg6643_0])])[1], (((Shen.is_type(R0, Shen.type_symbol) && (!Shen.call(Shen.fns["shen.sysfunc?"], [R0]))))
  ? R0
  : Shen.simple_error(Shen.call(Shen.fns["shen.app"], [R0, " is not a legitimate function name.\x0d\x0a", [Shen.type_symbol, "shen.a"]])))])))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<name>"];





Shen.fns["shen.sysfunc?"] = [Shen.type_func, function shen_user_lambda6646(Arg6645) {
  if (Arg6645.length < 1) return [Shen.type_func, shen_user_lambda6646, 1, Arg6645];
  var Arg6645_0 = Arg6645[0];
  return (function() {
  return Shen.call_tail(Shen.fns["element?"], [Arg6645_0, Shen.call(Shen.fns["get"], [[Shen.type_symbol, "shen"], [Shen.type_symbol, "shen.external-symbols"], (Shen.globals["*property-vector*"])])]);})}, 1, [], "shen.sysfunc?"];





Shen.fns["shen.<signature>"] = [Shen.type_func, function shen_user_lambda6648(Arg6647) {
  if (Arg6647.length < 1) return [Shen.type_func, shen_user_lambda6648, 1, Arg6647];
  var Arg6647_0 = Arg6647[0];
  var R0;
  return ((((Shen.is_type(Arg6647_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "{"], Arg6647_0[1][1]))))
  ? ((R0 = Shen.call(Shen.fns["shen.<signature-help>"], [Shen.call(Shen.fns["shen.pair"], [Arg6647_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg6647_0])])])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (((Shen.is_type(R0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "}"], R0[1][1]))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [R0[1][2], Shen.call(Shen.fns["shen.hdtl"], [R0])])[1], Shen.call(Shen.fns["shen.demodulate"], [Shen.call(Shen.fns["shen.curry-type"], [Shen.call(Shen.fns["shen.hdtl"], [R0])])])]))
  : (R0 = Shen.fail_obj))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<signature>"];





Shen.fns["shen.curry-type"] = [Shen.type_func, function shen_user_lambda6650(Arg6649) {
  if (Arg6649.length < 1) return [Shen.type_func, shen_user_lambda6650, 1, Arg6649];
  var Arg6649_0 = Arg6649[0];
  return (((Shen.is_type(Arg6649_0, Shen.type_cons) && (Shen.is_type(Arg6649_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "-->"], Arg6649_0[2][1])) && (Shen.is_type(Arg6649_0[2][2], Shen.type_cons) && (Shen.is_type(Arg6649_0[2][2][2], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "-->"], Arg6649_0[2][2][2][1]))))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.curry-type"], [[Shen.type_cons, Arg6649_0[1], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, Arg6649_0[2][2], []]]]]);})
  : (((Shen.is_type(Arg6649_0, Shen.type_cons) && (Shen.is_type(Arg6649_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "*"], Arg6649_0[2][1])) && (Shen.is_type(Arg6649_0[2][2], Shen.type_cons) && (Shen.is_type(Arg6649_0[2][2][2], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "*"], Arg6649_0[2][2][2][1]))))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.curry-type"], [[Shen.type_cons, Arg6649_0[1], [Shen.type_cons, [Shen.type_symbol, "*"], [Shen.type_cons, Arg6649_0[2][2], []]]]]);})
  : ((Shen.is_type(Arg6649_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda6652(Arg6651) {
  if (Arg6651.length < 1) return [Shen.type_func, shen_user_lambda6652, 1, Arg6651];
  var Arg6651_0 = Arg6651[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.curry-type"], [Arg6651_0]);})}, 1, [], undefined], Arg6649_0]);})
  : Arg6649_0)))}, 1, [], "shen.curry-type"];





Shen.fns["shen.<signature-help>"] = [Shen.type_func, function shen_user_lambda6654(Arg6653) {
  if (Arg6653.length < 1) return [Shen.type_func, shen_user_lambda6654, 1, Arg6653];
  var Arg6653_0 = Arg6653[0];
  var R0, R1;
  return (((Shen.is_type(Arg6653_0[1], Shen.type_cons))
  ? ((R0 = Arg6653_0[1][1]),
  (R1 = Shen.call(Shen.fns["shen.<signature-help>"], [Shen.call(Shen.fns["shen.pair"], [Arg6653_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg6653_0])])])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (((!Shen.call(Shen.fns["element?"], [R0, [Shen.type_cons, [Shen.type_symbol, "{"], [Shen.type_cons, [Shen.type_symbol, "}"], []]]])))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], [Shen.type_cons, R0, Shen.call(Shen.fns["shen.hdtl"], [R1])]]))
  : (R0 = Shen.fail_obj))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["<e>"], [Arg6653_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], []]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<signature-help>"];





Shen.fns["shen.<rules>"] = [Shen.type_func, function shen_user_lambda6656(Arg6655) {
  if (Arg6655.length < 1) return [Shen.type_func, shen_user_lambda6656, 1, Arg6655];
  var Arg6655_0 = Arg6655[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<rule>"], [Arg6655_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<rules>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], [Shen.type_cons, Shen.call(Shen.fns["shen.linearise"], [Shen.call(Shen.fns["shen.hdtl"], [R0])]), Shen.call(Shen.fns["shen.hdtl"], [R1])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<rule>"], [Arg6655_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_cons, Shen.call(Shen.fns["shen.linearise"], [Shen.call(Shen.fns["shen.hdtl"], [R0])]), []]]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<rules>"];





Shen.fns["shen.<rule>"] = [Shen.type_func, function shen_user_lambda6658(Arg6657) {
  if (Arg6657.length < 1) return [Shen.type_func, shen_user_lambda6658, 1, Arg6657];
  var Arg6657_0 = Arg6657[0];
  var R0, R1, R2;
  return (((R0 = Shen.call(Shen.fns["shen.<patterns>"], [Arg6657_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (((Shen.is_type(R0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "->"], R0[1][1]))))
  ? ((R1 = Shen.call(Shen.fns["shen.<action>"], [Shen.call(Shen.fns["shen.pair"], [R0[1][2], Shen.call(Shen.fns["shen.hdtl"], [R0])])])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (((Shen.is_type(R1[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "where"], R1[1][1]))))
  ? ((R2 = Shen.call(Shen.fns["shen.<guard>"], [Shen.call(Shen.fns["shen.pair"], [R1[1][2], Shen.call(Shen.fns["shen.hdtl"], [R1])])])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R2))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R2[1], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "where"], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R2]), [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R1]), []]]], []]]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<patterns>"], [Arg6657_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (((Shen.is_type(R0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "->"], R0[1][1]))))
  ? ((R1 = Shen.call(Shen.fns["shen.<action>"], [Shen.call(Shen.fns["shen.pair"], [R0[1][2], Shen.call(Shen.fns["shen.hdtl"], [R0])])])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R1]), []]]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<patterns>"], [Arg6657_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (((Shen.is_type(R0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "<-"], R0[1][1]))))
  ? ((R1 = Shen.call(Shen.fns["shen.<action>"], [Shen.call(Shen.fns["shen.pair"], [R0[1][2], Shen.call(Shen.fns["shen.hdtl"], [R0])])])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (((Shen.is_type(R1[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "where"], R1[1][1]))))
  ? ((R2 = Shen.call(Shen.fns["shen.<guard>"], [Shen.call(Shen.fns["shen.pair"], [R1[1][2], Shen.call(Shen.fns["shen.hdtl"], [R1])])])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R2))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R2[1], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "where"], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R2]), [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.choicepoint!"], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R1]), []]], []]]], []]]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<patterns>"], [Arg6657_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (((Shen.is_type(R0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "<-"], R0[1][1]))))
  ? ((R1 = Shen.call(Shen.fns["shen.<action>"], [Shen.call(Shen.fns["shen.pair"], [R0[1][2], Shen.call(Shen.fns["shen.hdtl"], [R0])])])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.choicepoint!"], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R1]), []]], []]]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))
  : R0))
  : R0))}, 1, [], "shen.<rule>"];





Shen.fns["shen.fail_if"] = [Shen.type_func, function shen_user_lambda6660(Arg6659) {
  if (Arg6659.length < 2) return [Shen.type_func, shen_user_lambda6660, 2, Arg6659];
  var Arg6659_0 = Arg6659[0], Arg6659_1 = Arg6659[1];
  return ((Shen.call(Arg6659_0, [Arg6659_1]))
  ? Shen.fail_obj
  : Arg6659_1)}, 2, [], "shen.fail_if"];





Shen.fns["shen.succeeds?"] = [Shen.type_func, function shen_user_lambda6662(Arg6661) {
  if (Arg6661.length < 1) return [Shen.type_func, shen_user_lambda6662, 1, Arg6661];
  var Arg6661_0 = Arg6661[0];
  return ((Shen.unwind_tail(Shen.$eq$(Arg6661_0, Shen.fail_obj)))
  ? false
  : true)}, 1, [], "shen.succeeds?"];





Shen.fns["shen.<patterns>"] = [Shen.type_func, function shen_user_lambda6664(Arg6663) {
  if (Arg6663.length < 1) return [Shen.type_func, shen_user_lambda6664, 1, Arg6663];
  var Arg6663_0 = Arg6663[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<pattern>"], [Arg6663_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<patterns>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), Shen.call(Shen.fns["shen.hdtl"], [R1])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["<e>"], [Arg6663_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], []]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<patterns>"];





Shen.fns["shen.<pattern>"] = [Shen.type_func, function shen_user_lambda6666(Arg6665) {
  if (Arg6665.length < 1) return [Shen.type_func, shen_user_lambda6666, 1, Arg6665];
  var Arg6665_0 = Arg6665[0];
  var R0, R1;
  return ((((Shen.is_type(Arg6665_0[1], Shen.type_cons) && Shen.is_type(Arg6665_0[1][1], Shen.type_cons)))
  ? (R0 = Shen.call(Shen.fns["shen.snd-or-fail"], [(((Shen.is_type(Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "@p"], Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1][1]))))
  ? ((R0 = Shen.call(Shen.fns["shen.<pattern1>"], [Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1][2], Shen.call(Shen.fns["shen.hdtl"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])])])])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<pattern2>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? Shen.call(Shen.fns["shen.pair"], [R1[1], Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1], [Shen.type_cons, [Shen.type_symbol, "@p"], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R1]), []]]]])])
  : Shen.fail_obj))
  : Shen.fail_obj))
  : Shen.fail_obj)]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? ((((Shen.is_type(Arg6665_0[1], Shen.type_cons) && Shen.is_type(Arg6665_0[1][1], Shen.type_cons)))
  ? (R0 = Shen.call(Shen.fns["shen.snd-or-fail"], [(((Shen.is_type(Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cons"], Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1][1]))))
  ? ((R0 = Shen.call(Shen.fns["shen.<pattern1>"], [Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1][2], Shen.call(Shen.fns["shen.hdtl"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])])])])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<pattern2>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? Shen.call(Shen.fns["shen.pair"], [R1[1], Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1], [Shen.type_cons, [Shen.type_symbol, "cons"], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R1]), []]]]])])
  : Shen.fail_obj))
  : Shen.fail_obj))
  : Shen.fail_obj)]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? ((((Shen.is_type(Arg6665_0[1], Shen.type_cons) && Shen.is_type(Arg6665_0[1][1], Shen.type_cons)))
  ? (R0 = Shen.call(Shen.fns["shen.snd-or-fail"], [(((Shen.is_type(Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "@v"], Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1][1]))))
  ? ((R0 = Shen.call(Shen.fns["shen.<pattern1>"], [Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1][2], Shen.call(Shen.fns["shen.hdtl"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])])])])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<pattern2>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? Shen.call(Shen.fns["shen.pair"], [R1[1], Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1], [Shen.type_cons, [Shen.type_symbol, "@v"], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R1]), []]]]])])
  : Shen.fail_obj))
  : Shen.fail_obj))
  : Shen.fail_obj)]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? ((((Shen.is_type(Arg6665_0[1], Shen.type_cons) && Shen.is_type(Arg6665_0[1][1], Shen.type_cons)))
  ? (R0 = Shen.call(Shen.fns["shen.snd-or-fail"], [(((Shen.is_type(Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "@s"], Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1][1]))))
  ? ((R0 = Shen.call(Shen.fns["shen.<pattern1>"], [Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1][2], Shen.call(Shen.fns["shen.hdtl"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])])])])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<pattern2>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? Shen.call(Shen.fns["shen.pair"], [R1[1], Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1], [Shen.type_cons, [Shen.type_symbol, "@s"], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R1]), []]]]])])
  : Shen.fail_obj))
  : Shen.fail_obj))
  : Shen.fail_obj)]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? ((((Shen.is_type(Arg6665_0[1], Shen.type_cons) && Shen.is_type(Arg6665_0[1][1], Shen.type_cons)))
  ? (R0 = Shen.call(Shen.fns["shen.snd-or-fail"], [(((Shen.is_type(Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "vector"], Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1][1]))))
  ? (((Shen.is_type(Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1][2], Shen.call(Shen.fns["shen.hdtl"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])])])[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(0, Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1][2], Shen.call(Shen.fns["shen.hdtl"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])])])[1][1]))))
  ? Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1][2], Shen.call(Shen.fns["shen.hdtl"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])])])[1][2], Shen.call(Shen.fns["shen.hdtl"], [Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1][2], Shen.call(Shen.fns["shen.hdtl"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][1], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])])])])])[1], Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1], [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, 0, []]]])])
  : Shen.fail_obj)
  : Shen.fail_obj)]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((Shen.is_type(Arg6665_0[1], Shen.type_cons))
  ? ((R0 = Arg6665_0[1][1]),
  ((Shen.is_type(R0, Shen.type_cons))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg6665_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg6665_0])])[1], Shen.call(Shen.fns["shen.constructor-error"], [R0])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<simple_pattern>"], [Arg6665_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["shen.hdtl"], [R0])]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))}, 1, [], "shen.<pattern>"];





Shen.fns["shen.constructor-error"] = [Shen.type_func, function shen_user_lambda6668(Arg6667) {
  if (Arg6667.length < 1) return [Shen.type_func, shen_user_lambda6668, 1, Arg6667];
  var Arg6667_0 = Arg6667[0];
  return (function() {
  return Shen.simple_error(Shen.call(Shen.fns["shen.app"], [Arg6667_0, " is not a legitimate constructor\x0d\x0a", [Shen.type_symbol, "shen.a"]]));})}, 1, [], "shen.constructor-error"];





Shen.fns["shen.<simple_pattern>"] = [Shen.type_func, function shen_user_lambda6670(Arg6669) {
  if (Arg6669.length < 1) return [Shen.type_func, shen_user_lambda6670, 1, Arg6669];
  var Arg6669_0 = Arg6669[0];
  var R0;
  return (((Shen.is_type(Arg6669_0[1], Shen.type_cons))
  ? ((R0 = Arg6669_0[1][1]),
  ((Shen.unwind_tail(Shen.$eq$(R0, [Shen.type_symbol, "_"])))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg6669_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg6669_0])])[1], Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "Parse_Y"]])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((Shen.is_type(Arg6669_0[1], Shen.type_cons))
  ? ((R0 = Arg6669_0[1][1]),
  (((!Shen.call(Shen.fns["element?"], [R0, [Shen.type_cons, [Shen.type_symbol, "->"], [Shen.type_cons, [Shen.type_symbol, "<-"], []]]])))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg6669_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg6669_0])])[1], R0]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<simple_pattern>"];





Shen.fns["shen.<pattern1>"] = [Shen.type_func, function shen_user_lambda6672(Arg6671) {
  if (Arg6671.length < 1) return [Shen.type_func, shen_user_lambda6672, 1, Arg6671];
  var Arg6671_0 = Arg6671[0];
  var R0;
  return (((R0 = Shen.call(Shen.fns["shen.<pattern>"], [Arg6671_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["shen.hdtl"], [R0])]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<pattern1>"];





Shen.fns["shen.<pattern2>"] = [Shen.type_func, function shen_user_lambda6674(Arg6673) {
  if (Arg6673.length < 1) return [Shen.type_func, shen_user_lambda6674, 1, Arg6673];
  var Arg6673_0 = Arg6673[0];
  var R0;
  return (((R0 = Shen.call(Shen.fns["shen.<pattern>"], [Arg6673_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["shen.hdtl"], [R0])]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<pattern2>"];





Shen.fns["shen.<action>"] = [Shen.type_func, function shen_user_lambda6676(Arg6675) {
  if (Arg6675.length < 1) return [Shen.type_func, shen_user_lambda6676, 1, Arg6675];
  var Arg6675_0 = Arg6675[0];
  var R0;
  return (((Shen.is_type(Arg6675_0[1], Shen.type_cons))
  ? ((R0 = Arg6675_0[1][1]),
  (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg6675_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg6675_0])])[1], R0])))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<action>"];





Shen.fns["shen.<guard>"] = [Shen.type_func, function shen_user_lambda6678(Arg6677) {
  if (Arg6677.length < 1) return [Shen.type_func, shen_user_lambda6678, 1, Arg6677];
  var Arg6677_0 = Arg6677[0];
  var R0;
  return (((Shen.is_type(Arg6677_0[1], Shen.type_cons))
  ? ((R0 = Arg6677_0[1][1]),
  (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg6677_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg6677_0])])[1], R0])))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<guard>"];





Shen.fns["shen.compile_to_machine_code"] = [Shen.type_func, function shen_user_lambda6680(Arg6679) {
  if (Arg6679.length < 2) return [Shen.type_func, shen_user_lambda6680, 2, Arg6679];
  var Arg6679_0 = Arg6679[0], Arg6679_1 = Arg6679[1];
  var R0;
  return ((R0 = Shen.call(Shen.fns["shen.compile_to_lambda+"], [Arg6679_0, Arg6679_1])),
  (R0 = Shen.call(Shen.fns["shen.compile_to_kl"], [Arg6679_0, R0])),
  Shen.call(Shen.fns["shen.record-source"], [Arg6679_0, R0]),
  R0)}, 2, [], "shen.compile_to_machine_code"];





Shen.fns["shen.record-source"] = [Shen.type_func, function shen_user_lambda6682(Arg6681) {
  if (Arg6681.length < 2) return [Shen.type_func, shen_user_lambda6682, 2, Arg6681];
  var Arg6681_0 = Arg6681[0], Arg6681_1 = Arg6681[1];
  return (((Shen.globals["shen.*installing-kl*"]))
  ? [Shen.type_symbol, "shen.skip"]
  : (function() {
  return Shen.call_tail(Shen.fns["put"], [Arg6681_0, [Shen.type_symbol, "shen.source"], Arg6681_1, (Shen.globals["*property-vector*"])]);}))}, 2, [], "shen.record-source"];





Shen.fns["shen.compile_to_lambda+"] = [Shen.type_func, function shen_user_lambda6684(Arg6683) {
  if (Arg6683.length < 2) return [Shen.type_func, shen_user_lambda6684, 2, Arg6683];
  var Arg6683_0 = Arg6683[0], Arg6683_1 = Arg6683[1];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["shen.aritycheck"], [Arg6683_0, Arg6683_1])),
  Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda6686(Arg6685) {
  if (Arg6685.length < 2) return [Shen.type_func, shen_user_lambda6686, 2, Arg6685];
  var Arg6685_0 = Arg6685[0], Arg6685_1 = Arg6685[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.free_variable_check"], [Arg6685_0, Arg6685_1]);})}, 2, [Arg6683_0], undefined], Arg6683_1]),
  (R0 = Shen.call(Shen.fns["shen.parameters"], [R0])),
  (R1 = Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda6688(Arg6687) {
  if (Arg6687.length < 1) return [Shen.type_func, shen_user_lambda6688, 1, Arg6687];
  var Arg6687_0 = Arg6687[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.strip-protect"], [Arg6687_0]);})}, 1, [], undefined], Arg6683_1])),
  (R1 = Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda6690(Arg6689) {
  if (Arg6689.length < 1) return [Shen.type_func, shen_user_lambda6690, 1, Arg6689];
  var Arg6689_0 = Arg6689[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.abstract_rule"], [Arg6689_0]);})}, 1, [], undefined], R1])),
  (R1 = Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda6692(Arg6691) {
  if (Arg6691.length < 2) return [Shen.type_func, shen_user_lambda6692, 2, Arg6691];
  var Arg6691_0 = Arg6691[0], Arg6691_1 = Arg6691[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.application_build"], [Arg6691_0, Arg6691_1]);})}, 2, [R0], undefined], R1])),
  [Shen.type_cons, R0, [Shen.type_cons, R1, []]])}, 2, [], "shen.compile_to_lambda+"];





Shen.fns["shen.free_variable_check"] = [Shen.type_func, function shen_user_lambda6694(Arg6693) {
  if (Arg6693.length < 2) return [Shen.type_func, shen_user_lambda6694, 2, Arg6693];
  var Arg6693_0 = Arg6693[0], Arg6693_1 = Arg6693[1];
  var R0;
  return (((Shen.is_type(Arg6693_1, Shen.type_cons) && (Shen.is_type(Arg6693_1[2], Shen.type_cons) && Shen.empty$question$(Arg6693_1[2][2]))))
  ? ((R0 = Shen.call(Shen.fns["shen.extract_vars"], [Arg6693_1[1]])),
  (R0 = Shen.call(Shen.fns["shen.extract_free_vars"], [R0, Arg6693_1[2][1]])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.free_variable_warnings"], [Arg6693_0, R0]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.free_variable_check"]]);}))}, 2, [], "shen.free_variable_check"];





Shen.fns["shen.extract_vars"] = [Shen.type_func, function shen_user_lambda6696(Arg6695) {
  if (Arg6695.length < 1) return [Shen.type_func, shen_user_lambda6696, 1, Arg6695];
  var Arg6695_0 = Arg6695[0];
  return ((Shen.call(Shen.fns["variable?"], [Arg6695_0]))
  ? [Shen.type_cons, Arg6695_0, []]
  : ((Shen.is_type(Arg6695_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["union"], [Shen.call(Shen.fns["shen.extract_vars"], [Arg6695_0[1]]), Shen.call(Shen.fns["shen.extract_vars"], [Arg6695_0[2]])]);})
  : []))}, 1, [], "shen.extract_vars"];





Shen.fns["shen.extract_free_vars"] = [Shen.type_func, function shen_user_lambda6698(Arg6697) {
  if (Arg6697.length < 2) return [Shen.type_func, shen_user_lambda6698, 2, Arg6697];
  var Arg6697_0 = Arg6697[0], Arg6697_1 = Arg6697[1];
  return (((Shen.is_type(Arg6697_1, Shen.type_cons) && (Shen.is_type(Arg6697_1[2], Shen.type_cons) && (Shen.empty$question$(Arg6697_1[2][2]) && Shen.unwind_tail(Shen.$eq$(Arg6697_1[1], [Shen.type_symbol, "protect"]))))))
  ? []
  : (((Shen.call(Shen.fns["variable?"], [Arg6697_1]) && (!Shen.call(Shen.fns["element?"], [Arg6697_1, Arg6697_0]))))
  ? [Shen.type_cons, Arg6697_1, []]
  : (((Shen.is_type(Arg6697_1, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "lambda"], Arg6697_1[1])) && (Shen.is_type(Arg6697_1[2], Shen.type_cons) && (Shen.is_type(Arg6697_1[2][2], Shen.type_cons) && Shen.empty$question$(Arg6697_1[2][2][2]))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.extract_free_vars"], [[Shen.type_cons, Arg6697_1[2][1], Arg6697_0], Arg6697_1[2][2][1]]);})
  : (((Shen.is_type(Arg6697_1, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "let"], Arg6697_1[1])) && (Shen.is_type(Arg6697_1[2], Shen.type_cons) && (Shen.is_type(Arg6697_1[2][2], Shen.type_cons) && (Shen.is_type(Arg6697_1[2][2][2], Shen.type_cons) && Shen.empty$question$(Arg6697_1[2][2][2][2])))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["union"], [Shen.call(Shen.fns["shen.extract_free_vars"], [Arg6697_0, Arg6697_1[2][2][1]]), Shen.call(Shen.fns["shen.extract_free_vars"], [[Shen.type_cons, Arg6697_1[2][1], Arg6697_0], Arg6697_1[2][2][2][1]])]);})
  : ((Shen.is_type(Arg6697_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["union"], [Shen.call(Shen.fns["shen.extract_free_vars"], [Arg6697_0, Arg6697_1[1]]), Shen.call(Shen.fns["shen.extract_free_vars"], [Arg6697_0, Arg6697_1[2]])]);})
  : [])))))}, 2, [], "shen.extract_free_vars"];





Shen.fns["shen.free_variable_warnings"] = [Shen.type_func, function shen_user_lambda6700(Arg6699) {
  if (Arg6699.length < 2) return [Shen.type_func, shen_user_lambda6700, 2, Arg6699];
  var Arg6699_0 = Arg6699[0], Arg6699_1 = Arg6699[1];
  return ((Shen.empty$question$(Arg6699_1))
  ? [Shen.type_symbol, "_"]
  : (function() {
  return Shen.simple_error(("error: the following variables are free in " + Shen.call(Shen.fns["shen.app"], [Arg6699_0, (": " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["shen.list_variables"], [Arg6699_1]), "", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])));}))}, 2, [], "shen.free_variable_warnings"];





Shen.fns["shen.list_variables"] = [Shen.type_func, function shen_user_lambda6702(Arg6701) {
  if (Arg6701.length < 1) return [Shen.type_func, shen_user_lambda6702, 1, Arg6701];
  var Arg6701_0 = Arg6701[0];
  return (((Shen.is_type(Arg6701_0, Shen.type_cons) && Shen.empty$question$(Arg6701_0[2])))
  ? (Shen.str(Arg6701_0[1]) + ".")
  : ((Shen.is_type(Arg6701_0, Shen.type_cons))
  ? (Shen.str(Arg6701_0[1]) + (", " + Shen.call(Shen.fns["shen.list_variables"], [Arg6701_0[2]])))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.list_variables"]]);})))}, 1, [], "shen.list_variables"];





Shen.fns["shen.strip-protect"] = [Shen.type_func, function shen_user_lambda6704(Arg6703) {
  if (Arg6703.length < 1) return [Shen.type_func, shen_user_lambda6704, 1, Arg6703];
  var Arg6703_0 = Arg6703[0];
  return (((Shen.is_type(Arg6703_0, Shen.type_cons) && (Shen.is_type(Arg6703_0[2], Shen.type_cons) && (Shen.empty$question$(Arg6703_0[2][2]) && Shen.unwind_tail(Shen.$eq$(Arg6703_0[1], [Shen.type_symbol, "protect"]))))))
  ? Arg6703_0[2][1]
  : ((Shen.is_type(Arg6703_0, Shen.type_cons))
  ? [Shen.type_cons, Shen.call(Shen.fns["shen.strip-protect"], [Arg6703_0[1]]), Shen.call(Shen.fns["shen.strip-protect"], [Arg6703_0[2]])]
  : Arg6703_0))}, 1, [], "shen.strip-protect"];





Shen.fns["shen.linearise"] = [Shen.type_func, function shen_user_lambda6706(Arg6705) {
  if (Arg6705.length < 1) return [Shen.type_func, shen_user_lambda6706, 1, Arg6705];
  var Arg6705_0 = Arg6705[0];
  return (((Shen.is_type(Arg6705_0, Shen.type_cons) && (Shen.is_type(Arg6705_0[2], Shen.type_cons) && Shen.empty$question$(Arg6705_0[2][2]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.linearise_help"], [Shen.call(Shen.fns["shen.flatten"], [Arg6705_0[1]]), Arg6705_0[1], Arg6705_0[2][1]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.linearise"]]);}))}, 1, [], "shen.linearise"];





Shen.fns["shen.flatten"] = [Shen.type_func, function shen_user_lambda6708(Arg6707) {
  if (Arg6707.length < 1) return [Shen.type_func, shen_user_lambda6708, 1, Arg6707];
  var Arg6707_0 = Arg6707[0];
  return ((Shen.empty$question$(Arg6707_0))
  ? []
  : ((Shen.is_type(Arg6707_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["append"], [Shen.call(Shen.fns["shen.flatten"], [Arg6707_0[1]]), Shen.call(Shen.fns["shen.flatten"], [Arg6707_0[2]])]);})
  : [Shen.type_cons, Arg6707_0, []]))}, 1, [], "shen.flatten"];





Shen.fns["shen.linearise_help"] = [Shen.type_func, function shen_user_lambda6710(Arg6709) {
  if (Arg6709.length < 3) return [Shen.type_func, shen_user_lambda6710, 3, Arg6709];
  var Arg6709_0 = Arg6709[0], Arg6709_1 = Arg6709[1], Arg6709_2 = Arg6709[2];
  var R0, R1;
  return ((Shen.empty$question$(Arg6709_0))
  ? [Shen.type_cons, Arg6709_1, [Shen.type_cons, Arg6709_2, []]]
  : ((Shen.is_type(Arg6709_0, Shen.type_cons))
  ? (((Shen.call(Shen.fns["variable?"], [Arg6709_0[1]]) && Shen.call(Shen.fns["element?"], [Arg6709_0[1], Arg6709_0[2]])))
  ? ((R0 = Shen.call(Shen.fns["gensym"], [Arg6709_0[1]])),
  (R1 = [Shen.type_cons, [Shen.type_symbol, "where"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "="], [Shen.type_cons, Arg6709_0[1], [Shen.type_cons, R0, []]]], [Shen.type_cons, Arg6709_2, []]]]),
  (R0 = Shen.call(Shen.fns["shen.linearise_X"], [Arg6709_0[1], R0, Arg6709_1])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.linearise_help"], [Arg6709_0[2], R0, R1]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.linearise_help"], [Arg6709_0[2], Arg6709_1, Arg6709_2]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.linearise_help"]]);})))}, 3, [], "shen.linearise_help"];





Shen.fns["shen.linearise_X"] = [Shen.type_func, function shen_user_lambda6712(Arg6711) {
  if (Arg6711.length < 3) return [Shen.type_func, shen_user_lambda6712, 3, Arg6711];
  var Arg6711_0 = Arg6711[0], Arg6711_1 = Arg6711[1], Arg6711_2 = Arg6711[2];
  var R0;
  return ((Shen.unwind_tail(Shen.$eq$(Arg6711_2, Arg6711_0)))
  ? Arg6711_1
  : ((Shen.is_type(Arg6711_2, Shen.type_cons))
  ? ((R0 = Shen.call(Shen.fns["shen.linearise_X"], [Arg6711_0, Arg6711_1, Arg6711_2[1]])),
  ((Shen.unwind_tail(Shen.$eq$(R0, Arg6711_2[1])))
  ? [Shen.type_cons, Arg6711_2[1], Shen.call(Shen.fns["shen.linearise_X"], [Arg6711_0, Arg6711_1, Arg6711_2[2]])]
  : [Shen.type_cons, R0, Arg6711_2[2]]))
  : Arg6711_2))}, 3, [], "shen.linearise_X"];





Shen.fns["shen.aritycheck"] = [Shen.type_func, function shen_user_lambda6714(Arg6713) {
  if (Arg6713.length < 2) return [Shen.type_func, shen_user_lambda6714, 2, Arg6713];
  var Arg6713_0 = Arg6713[0], Arg6713_1 = Arg6713[1];
  return (((Shen.is_type(Arg6713_1, Shen.type_cons) && (Shen.is_type(Arg6713_1[1], Shen.type_cons) && (Shen.is_type(Arg6713_1[1][2], Shen.type_cons) && (Shen.empty$question$(Arg6713_1[1][2][2]) && Shen.empty$question$(Arg6713_1[2]))))))
  ? (Shen.call(Shen.fns["shen.aritycheck-action"], [Arg6713_1[1][2][1]]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.aritycheck-name"], [Arg6713_0, Shen.call(Shen.fns["arity"], [Arg6713_0]), Shen.call(Shen.fns["length"], [Arg6713_1[1][1]])]);}))
  : (((Shen.is_type(Arg6713_1, Shen.type_cons) && (Shen.is_type(Arg6713_1[1], Shen.type_cons) && (Shen.is_type(Arg6713_1[1][2], Shen.type_cons) && (Shen.empty$question$(Arg6713_1[1][2][2]) && (Shen.is_type(Arg6713_1[2], Shen.type_cons) && (Shen.is_type(Arg6713_1[2][1], Shen.type_cons) && (Shen.is_type(Arg6713_1[2][1][2], Shen.type_cons) && Shen.empty$question$(Arg6713_1[2][1][2][2])))))))))
  ? ((Shen.unwind_tail(Shen.$eq$(Shen.call(Shen.fns["length"], [Arg6713_1[1][1]]), Shen.call(Shen.fns["length"], [Arg6713_1[2][1][1]]))))
  ? (Shen.call(Shen.fns["shen.aritycheck-action"], [Arg6713_1[1][2][1]]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.aritycheck"], [Arg6713_0, Arg6713_1[2]]);}))
  : (function() {
  return Shen.simple_error(("arity error in " + Shen.call(Shen.fns["shen.app"], [Arg6713_0, "\x0d\x0a", [Shen.type_symbol, "shen.a"]])));}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.aritycheck"]]);})))}, 2, [], "shen.aritycheck"];





Shen.fns["shen.aritycheck-name"] = [Shen.type_func, function shen_user_lambda6716(Arg6715) {
  if (Arg6715.length < 3) return [Shen.type_func, shen_user_lambda6716, 3, Arg6715];
  var Arg6715_0 = Arg6715[0], Arg6715_1 = Arg6715[1], Arg6715_2 = Arg6715[2];
  return ((Shen.unwind_tail(Shen.$eq$(-1, Arg6715_1)))
  ? Arg6715_2
  : ((Shen.unwind_tail(Shen.$eq$(Arg6715_2, Arg6715_1)))
  ? Arg6715_2
  : (Shen.call(Shen.fns["shen.prhush"], [("\x0d\x0awarning: changing the arity of " + Shen.call(Shen.fns["shen.app"], [Arg6715_0, " can cause errors.\x0d\x0a", [Shen.type_symbol, "shen.a"]])), Shen.call(Shen.fns["stoutput"], [])]),
  Arg6715_2)))}, 3, [], "shen.aritycheck-name"];





Shen.fns["shen.aritycheck-action"] = [Shen.type_func, function shen_user_lambda6718(Arg6717) {
  if (Arg6717.length < 1) return [Shen.type_func, shen_user_lambda6718, 1, Arg6717];
  var Arg6717_0 = Arg6717[0];
  return ((Shen.is_type(Arg6717_0, Shen.type_cons))
  ? (Shen.call(Shen.fns["shen.aah"], [Arg6717_0[1], Arg6717_0[2]]),
  (function() {
  return Shen.call_tail(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda6720(Arg6719) {
  if (Arg6719.length < 1) return [Shen.type_func, shen_user_lambda6720, 1, Arg6719];
  var Arg6719_0 = Arg6719[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.aritycheck-action"], [Arg6719_0]);})}, 1, [], undefined], Arg6717_0]);}))
  : [Shen.type_symbol, "shen.skip"])}, 1, [], "shen.aritycheck-action"];





Shen.fns["shen.aah"] = [Shen.type_func, function shen_user_lambda6722(Arg6721) {
  if (Arg6721.length < 2) return [Shen.type_func, shen_user_lambda6722, 2, Arg6721];
  var Arg6721_0 = Arg6721[0], Arg6721_1 = Arg6721[1];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["arity"], [Arg6721_0])),
  (R1 = Shen.call(Shen.fns["length"], [Arg6721_1])),
  ((((R0 > -1) && (R1 > R0)))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.prhush"], [("warning: " + Shen.call(Shen.fns["shen.app"], [Arg6721_0, (" might not like " + Shen.call(Shen.fns["shen.app"], [R1, (" argument" + Shen.call(Shen.fns["shen.app"], [(((R1 > 1))
  ? "s"
  : ""), ".\x0d\x0a", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])), Shen.call(Shen.fns["stoutput"], [])]);})
  : [Shen.type_symbol, "shen.skip"]))}, 2, [], "shen.aah"];





Shen.fns["shen.abstract_rule"] = [Shen.type_func, function shen_user_lambda6724(Arg6723) {
  if (Arg6723.length < 1) return [Shen.type_func, shen_user_lambda6724, 1, Arg6723];
  var Arg6723_0 = Arg6723[0];
  return (((Shen.is_type(Arg6723_0, Shen.type_cons) && (Shen.is_type(Arg6723_0[2], Shen.type_cons) && Shen.empty$question$(Arg6723_0[2][2]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.abstraction_build"], [Arg6723_0[1], Arg6723_0[2][1]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.abstract_rule"]]);}))}, 1, [], "shen.abstract_rule"];





Shen.fns["shen.abstraction_build"] = [Shen.type_func, function shen_user_lambda6726(Arg6725) {
  if (Arg6725.length < 2) return [Shen.type_func, shen_user_lambda6726, 2, Arg6725];
  var Arg6725_0 = Arg6725[0], Arg6725_1 = Arg6725[1];
  return ((Shen.empty$question$(Arg6725_0))
  ? Arg6725_1
  : ((Shen.is_type(Arg6725_0, Shen.type_cons))
  ? [Shen.type_cons, [Shen.type_symbol, "/."], [Shen.type_cons, Arg6725_0[1], [Shen.type_cons, Shen.call(Shen.fns["shen.abstraction_build"], [Arg6725_0[2], Arg6725_1]), []]]]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.abstraction_build"]]);})))}, 2, [], "shen.abstraction_build"];





Shen.fns["shen.parameters"] = [Shen.type_func, function shen_user_lambda6728(Arg6727) {
  if (Arg6727.length < 1) return [Shen.type_func, shen_user_lambda6728, 1, Arg6727];
  var Arg6727_0 = Arg6727[0];
  return ((Shen.unwind_tail(Shen.$eq$(0, Arg6727_0)))
  ? []
  : [Shen.type_cons, Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "V"]]), Shen.call(Shen.fns["shen.parameters"], [(Arg6727_0 - 1)])])}, 1, [], "shen.parameters"];





Shen.fns["shen.application_build"] = [Shen.type_func, function shen_user_lambda6730(Arg6729) {
  if (Arg6729.length < 2) return [Shen.type_func, shen_user_lambda6730, 2, Arg6729];
  var Arg6729_0 = Arg6729[0], Arg6729_1 = Arg6729[1];
  return ((Shen.empty$question$(Arg6729_0))
  ? Arg6729_1
  : ((Shen.is_type(Arg6729_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.application_build"], [Arg6729_0[2], [Shen.type_cons, Arg6729_1, [Shen.type_cons, Arg6729_0[1], []]]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.application_build"]]);})))}, 2, [], "shen.application_build"];





Shen.fns["shen.compile_to_kl"] = [Shen.type_func, function shen_user_lambda6732(Arg6731) {
  if (Arg6731.length < 2) return [Shen.type_func, shen_user_lambda6732, 2, Arg6731];
  var Arg6731_0 = Arg6731[0], Arg6731_1 = Arg6731[1];
  var R0, R1;
  return (((Shen.is_type(Arg6731_1, Shen.type_cons) && (Shen.is_type(Arg6731_1[2], Shen.type_cons) && Shen.empty$question$(Arg6731_1[2][2]))))
  ? (Shen.call(Shen.fns["shen.store-arity"], [Arg6731_0, Shen.call(Shen.fns["length"], [Arg6731_1[1]])]),
  (R0 = Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda6734(Arg6733) {
  if (Arg6733.length < 1) return [Shen.type_func, shen_user_lambda6734, 1, Arg6733];
  var Arg6733_0 = Arg6733[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.reduce"], [Arg6733_0]);})}, 1, [], undefined], Arg6731_1[2][1]])),
  (R0 = Shen.call(Shen.fns["shen.cond-expression"], [Arg6731_0, Arg6731_1[1], R0])),
  (((Shen.globals["shen.*optimise*"]))
  ? (R1 = Shen.call(Shen.fns["shen.typextable"], [Shen.call(Shen.fns["shen.get-type"], [Arg6731_0]), Arg6731_1[1]]))
  : (R1 = [Shen.type_symbol, "shen.skip"])),
  (((Shen.globals["shen.*optimise*"]))
  ? (R1 = Shen.call(Shen.fns["shen.assign-types"], [Arg6731_1[1], R1, R0]))
  : (R1 = R0)),
  (R1 = [Shen.type_cons, [Shen.type_symbol, "defun"], [Shen.type_cons, Arg6731_0, [Shen.type_cons, Arg6731_1[1], [Shen.type_cons, R1, []]]]]),
  R1)
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.compile_to_kl"]]);}))}, 2, [], "shen.compile_to_kl"];





Shen.fns["shen.get-type"] = [Shen.type_func, function shen_user_lambda6736(Arg6735) {
  if (Arg6735.length < 1) return [Shen.type_func, shen_user_lambda6736, 1, Arg6735];
  var Arg6735_0 = Arg6735[0];
  var R0;
  return ((Shen.is_type(Arg6735_0, Shen.type_cons))
  ? [Shen.type_symbol, "shen.skip"]
  : ((R0 = Shen.call(Shen.fns["assoc"], [Arg6735_0, (Shen.globals["shen.*signedfuncs*"])])),
  ((Shen.empty$question$(R0))
  ? [Shen.type_symbol, "shen.skip"]
  : R0[2])))}, 1, [], "shen.get-type"];





Shen.fns["shen.typextable"] = [Shen.type_func, function shen_user_lambda6738(Arg6737) {
  if (Arg6737.length < 2) return [Shen.type_func, shen_user_lambda6738, 2, Arg6737];
  var Arg6737_0 = Arg6737[0], Arg6737_1 = Arg6737[1];
  return (((Shen.is_type(Arg6737_0, Shen.type_cons) && (Shen.is_type(Arg6737_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "-->"], Arg6737_0[2][1])) && (Shen.is_type(Arg6737_0[2][2], Shen.type_cons) && (Shen.empty$question$(Arg6737_0[2][2][2]) && Shen.is_type(Arg6737_1, Shen.type_cons)))))))
  ? ((Shen.call(Shen.fns["variable?"], [Arg6737_0[1]]))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.typextable"], [Arg6737_0[2][2][1], Arg6737_1[2]]);})
  : [Shen.type_cons, [Shen.type_cons, Arg6737_1[1], Arg6737_0[1]], Shen.call(Shen.fns["shen.typextable"], [Arg6737_0[2][2][1], Arg6737_1[2]])])
  : [])}, 2, [], "shen.typextable"];





Shen.fns["shen.assign-types"] = [Shen.type_func, function shen_user_lambda6740(Arg6739) {
  if (Arg6739.length < 3) return [Shen.type_func, shen_user_lambda6740, 3, Arg6739];
  var Arg6739_0 = Arg6739[0], Arg6739_1 = Arg6739[1], Arg6739_2 = Arg6739[2];
  var R0;
  return (((Shen.is_type(Arg6739_2, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "let"], Arg6739_2[1])) && (Shen.is_type(Arg6739_2[2], Shen.type_cons) && (Shen.is_type(Arg6739_2[2][2], Shen.type_cons) && (Shen.is_type(Arg6739_2[2][2][2], Shen.type_cons) && Shen.empty$question$(Arg6739_2[2][2][2][2])))))))
  ? [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, Arg6739_2[2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.assign-types"], [Arg6739_0, Arg6739_1, Arg6739_2[2][2][1]]), [Shen.type_cons, Shen.call(Shen.fns["shen.assign-types"], [[Shen.type_cons, Arg6739_2[2][1], Arg6739_0], Arg6739_1, Arg6739_2[2][2][2][1]]), []]]]]
  : (((Shen.is_type(Arg6739_2, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "lambda"], Arg6739_2[1])) && (Shen.is_type(Arg6739_2[2], Shen.type_cons) && (Shen.is_type(Arg6739_2[2][2], Shen.type_cons) && Shen.empty$question$(Arg6739_2[2][2][2]))))))
  ? [Shen.type_cons, [Shen.type_symbol, "lambda"], [Shen.type_cons, Arg6739_2[2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.assign-types"], [[Shen.type_cons, Arg6739_2[2][1], Arg6739_0], Arg6739_1, Arg6739_2[2][2][1]]), []]]]
  : (((Shen.is_type(Arg6739_2, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cond"], Arg6739_2[1]))))
  ? [Shen.type_cons, [Shen.type_symbol, "cond"], Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda6742(Arg6741) {
  if (Arg6741.length < 3) return [Shen.type_func, shen_user_lambda6742, 3, Arg6741];
  var Arg6741_0 = Arg6741[0], Arg6741_1 = Arg6741[1], Arg6741_2 = Arg6741[2];
  return [Shen.type_cons, Shen.call(Shen.fns["shen.assign-types"], [Arg6741_0, Arg6741_1, Arg6741_2[1]]), [Shen.type_cons, Shen.call(Shen.fns["shen.assign-types"], [Arg6741_0, Arg6741_1, Arg6741_2[2][1]]), []]]}, 3, [Arg6739_0, Arg6739_1], undefined], Arg6739_2[2]])]
  : ((Shen.is_type(Arg6739_2, Shen.type_cons))
  ? ((R0 = Shen.call(Shen.fns["shen.typextable"], [Shen.call(Shen.fns["shen.get-type"], [Arg6739_2[1]]), Arg6739_2[2]])),
  [Shen.type_cons, Arg6739_2[1], Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda6744(Arg6743) {
  if (Arg6743.length < 4) return [Shen.type_func, shen_user_lambda6744, 4, Arg6743];
  var Arg6743_0 = Arg6743[0], Arg6743_1 = Arg6743[1], Arg6743_2 = Arg6743[2], Arg6743_3 = Arg6743[3];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.assign-types"], [Arg6743_0, Shen.call(Shen.fns["append"], [Arg6743_1, Arg6743_2]), Arg6743_3]);})}, 4, [Arg6739_0, Arg6739_1, R0], undefined], Arg6739_2[2]])])
  : ((R0 = Shen.call(Shen.fns["assoc"], [Arg6739_2, Arg6739_1])),
  ((Shen.is_type(R0, Shen.type_cons))
  ? [Shen.type_cons, [Shen.type_symbol, "type"], [Shen.type_cons, Arg6739_2, [Shen.type_cons, R0[2], []]]]
  : ((Shen.call(Shen.fns["element?"], [Arg6739_2, Arg6739_0]))
  ? Arg6739_2
  : (function() {
  return Shen.call_tail(Shen.fns["shen.atom-type"], [Arg6739_2]);}))))))))}, 3, [], "shen.assign-types"];





Shen.fns["shen.atom-type"] = [Shen.type_func, function shen_user_lambda6746(Arg6745) {
  if (Arg6745.length < 1) return [Shen.type_func, shen_user_lambda6746, 1, Arg6745];
  var Arg6745_0 = Arg6745[0];
  return (((typeof(Arg6745_0) == 'string'))
  ? [Shen.type_cons, [Shen.type_symbol, "type"], [Shen.type_cons, Arg6745_0, [Shen.type_cons, [Shen.type_symbol, "string"], []]]]
  : (((typeof(Arg6745_0) == 'number'))
  ? [Shen.type_cons, [Shen.type_symbol, "type"], [Shen.type_cons, Arg6745_0, [Shen.type_cons, [Shen.type_symbol, "number"], []]]]
  : ((Shen.boolean$question$(Arg6745_0))
  ? [Shen.type_cons, [Shen.type_symbol, "type"], [Shen.type_cons, Arg6745_0, [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]
  : ((Shen.is_type(Arg6745_0, Shen.type_symbol))
  ? [Shen.type_cons, [Shen.type_symbol, "type"], [Shen.type_cons, Arg6745_0, [Shen.type_cons, [Shen.type_symbol, "symbol"], []]]]
  : Arg6745_0))))}, 1, [], "shen.atom-type"];





Shen.fns["shen.store-arity"] = [Shen.type_func, function shen_user_lambda6748(Arg6747) {
  if (Arg6747.length < 2) return [Shen.type_func, shen_user_lambda6748, 2, Arg6747];
  var Arg6747_0 = Arg6747[0], Arg6747_1 = Arg6747[1];
  return (((Shen.globals["shen.*installing-kl*"]))
  ? [Shen.type_symbol, "shen.skip"]
  : (function() {
  return Shen.call_tail(Shen.fns["put"], [Arg6747_0, [Shen.type_symbol, "arity"], Arg6747_1, (Shen.globals["*property-vector*"])]);}))}, 2, [], "shen.store-arity"];





Shen.fns["shen.reduce"] = [Shen.type_func, function shen_user_lambda6750(Arg6749) {
  if (Arg6749.length < 1) return [Shen.type_func, shen_user_lambda6750, 1, Arg6749];
  var Arg6749_0 = Arg6749[0];
  var R0;
  return ((Shen.globals["shen.*teststack*"] = []),
  (R0 = Shen.call(Shen.fns["shen.reduce_help"], [Arg6749_0])),
  [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "shen.tests"], Shen.call(Shen.fns["reverse"], [(Shen.globals["shen.*teststack*"])])]], [Shen.type_cons, R0, []]])}, 1, [], "shen.reduce"];





Shen.fns["shen.reduce_help"] = [Shen.type_func, function shen_user_lambda6752(Arg6751) {
  if (Arg6751.length < 1) return [Shen.type_func, shen_user_lambda6752, 1, Arg6751];
  var Arg6751_0 = Arg6751[0];
  var R0;
  return (((Shen.is_type(Arg6751_0, Shen.type_cons) && (Shen.is_type(Arg6751_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "/."], Arg6751_0[1][1])) && (Shen.is_type(Arg6751_0[1][2], Shen.type_cons) && (Shen.is_type(Arg6751_0[1][2][1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cons"], Arg6751_0[1][2][1][1])) && (Shen.is_type(Arg6751_0[1][2][1][2], Shen.type_cons) && (Shen.is_type(Arg6751_0[1][2][1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg6751_0[1][2][1][2][2][2]) && (Shen.is_type(Arg6751_0[1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg6751_0[1][2][2][2]) && (Shen.is_type(Arg6751_0[2], Shen.type_cons) && Shen.empty$question$(Arg6751_0[2][2]))))))))))))))
  ? (Shen.call(Shen.fns["shen.add_test"], [[Shen.type_cons, [Shen.type_symbol, "cons?"], Arg6751_0[2]]]),
  (R0 = [Shen.type_cons, [Shen.type_symbol, "/."], [Shen.type_cons, Arg6751_0[1][2][1][2][1], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "/."], [Shen.type_cons, Arg6751_0[1][2][1][2][2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.ebr"], [Arg6751_0[2][1], Arg6751_0[1][2][1], Arg6751_0[1][2][2][1]]), []]]], []]]]),
  (R0 = [Shen.type_cons, [Shen.type_cons, R0, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], Arg6751_0[2]], []]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "tl"], Arg6751_0[2]], []]]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.reduce_help"], [R0]);}))
  : (((Shen.is_type(Arg6751_0, Shen.type_cons) && (Shen.is_type(Arg6751_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "/."], Arg6751_0[1][1])) && (Shen.is_type(Arg6751_0[1][2], Shen.type_cons) && (Shen.is_type(Arg6751_0[1][2][1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "@p"], Arg6751_0[1][2][1][1])) && (Shen.is_type(Arg6751_0[1][2][1][2], Shen.type_cons) && (Shen.is_type(Arg6751_0[1][2][1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg6751_0[1][2][1][2][2][2]) && (Shen.is_type(Arg6751_0[1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg6751_0[1][2][2][2]) && (Shen.is_type(Arg6751_0[2], Shen.type_cons) && Shen.empty$question$(Arg6751_0[2][2]))))))))))))))
  ? (Shen.call(Shen.fns["shen.add_test"], [[Shen.type_cons, [Shen.type_symbol, "tuple?"], Arg6751_0[2]]]),
  (R0 = [Shen.type_cons, [Shen.type_symbol, "/."], [Shen.type_cons, Arg6751_0[1][2][1][2][1], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "/."], [Shen.type_cons, Arg6751_0[1][2][1][2][2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.ebr"], [Arg6751_0[2][1], Arg6751_0[1][2][1], Arg6751_0[1][2][2][1]]), []]]], []]]]),
  (R0 = [Shen.type_cons, [Shen.type_cons, R0, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "fst"], Arg6751_0[2]], []]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "snd"], Arg6751_0[2]], []]]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.reduce_help"], [R0]);}))
  : (((Shen.is_type(Arg6751_0, Shen.type_cons) && (Shen.is_type(Arg6751_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "/."], Arg6751_0[1][1])) && (Shen.is_type(Arg6751_0[1][2], Shen.type_cons) && (Shen.is_type(Arg6751_0[1][2][1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "@v"], Arg6751_0[1][2][1][1])) && (Shen.is_type(Arg6751_0[1][2][1][2], Shen.type_cons) && (Shen.is_type(Arg6751_0[1][2][1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg6751_0[1][2][1][2][2][2]) && (Shen.is_type(Arg6751_0[1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg6751_0[1][2][2][2]) && (Shen.is_type(Arg6751_0[2], Shen.type_cons) && Shen.empty$question$(Arg6751_0[2][2]))))))))))))))
  ? (Shen.call(Shen.fns["shen.add_test"], [[Shen.type_cons, [Shen.type_symbol, "shen.+vector?"], Arg6751_0[2]]]),
  (R0 = [Shen.type_cons, [Shen.type_symbol, "/."], [Shen.type_cons, Arg6751_0[1][2][1][2][1], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "/."], [Shen.type_cons, Arg6751_0[1][2][1][2][2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.ebr"], [Arg6751_0[2][1], Arg6751_0[1][2][1], Arg6751_0[1][2][2][1]]), []]]], []]]]),
  (R0 = [Shen.type_cons, [Shen.type_cons, R0, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hdv"], Arg6751_0[2]], []]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "tlv"], Arg6751_0[2]], []]]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.reduce_help"], [R0]);}))
  : (((Shen.is_type(Arg6751_0, Shen.type_cons) && (Shen.is_type(Arg6751_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "/."], Arg6751_0[1][1])) && (Shen.is_type(Arg6751_0[1][2], Shen.type_cons) && (Shen.is_type(Arg6751_0[1][2][1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "@s"], Arg6751_0[1][2][1][1])) && (Shen.is_type(Arg6751_0[1][2][1][2], Shen.type_cons) && (Shen.is_type(Arg6751_0[1][2][1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg6751_0[1][2][1][2][2][2]) && (Shen.is_type(Arg6751_0[1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg6751_0[1][2][2][2]) && (Shen.is_type(Arg6751_0[2], Shen.type_cons) && Shen.empty$question$(Arg6751_0[2][2]))))))))))))))
  ? (Shen.call(Shen.fns["shen.add_test"], [[Shen.type_cons, [Shen.type_symbol, "shen.+string?"], Arg6751_0[2]]]),
  (R0 = [Shen.type_cons, [Shen.type_symbol, "/."], [Shen.type_cons, Arg6751_0[1][2][1][2][1], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "/."], [Shen.type_cons, Arg6751_0[1][2][1][2][2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.ebr"], [Arg6751_0[2][1], Arg6751_0[1][2][1], Arg6751_0[1][2][2][1]]), []]]], []]]]),
  (R0 = [Shen.type_cons, [Shen.type_cons, R0, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "pos"], [Shen.type_cons, Arg6751_0[2][1], [Shen.type_cons, 0, []]]], []]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "tlstr"], Arg6751_0[2]], []]]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.reduce_help"], [R0]);}))
  : (((Shen.is_type(Arg6751_0, Shen.type_cons) && (Shen.is_type(Arg6751_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "/."], Arg6751_0[1][1])) && (Shen.is_type(Arg6751_0[1][2], Shen.type_cons) && (Shen.is_type(Arg6751_0[1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg6751_0[1][2][2][2]) && (Shen.is_type(Arg6751_0[2], Shen.type_cons) && (Shen.empty$question$(Arg6751_0[2][2]) && (!Shen.call(Shen.fns["variable?"], [Arg6751_0[1][2][1]])))))))))))
  ? (Shen.call(Shen.fns["shen.add_test"], [[Shen.type_cons, [Shen.type_symbol, "="], [Shen.type_cons, Arg6751_0[1][2][1], Arg6751_0[2]]]]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.reduce_help"], [Arg6751_0[1][2][2][1]]);}))
  : (((Shen.is_type(Arg6751_0, Shen.type_cons) && (Shen.is_type(Arg6751_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "/."], Arg6751_0[1][1])) && (Shen.is_type(Arg6751_0[1][2], Shen.type_cons) && (Shen.is_type(Arg6751_0[1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg6751_0[1][2][2][2]) && (Shen.is_type(Arg6751_0[2], Shen.type_cons) && Shen.empty$question$(Arg6751_0[2][2])))))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.reduce_help"], [Shen.call(Shen.fns["shen.ebr"], [Arg6751_0[2][1], Arg6751_0[1][2][1], Arg6751_0[1][2][2][1]])]);})
  : (((Shen.is_type(Arg6751_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "where"], Arg6751_0[1])) && (Shen.is_type(Arg6751_0[2], Shen.type_cons) && (Shen.is_type(Arg6751_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg6751_0[2][2][2]))))))
  ? (Shen.call(Shen.fns["shen.add_test"], [Arg6751_0[2][1]]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.reduce_help"], [Arg6751_0[2][2][1]]);}))
  : (((Shen.is_type(Arg6751_0, Shen.type_cons) && (Shen.is_type(Arg6751_0[2], Shen.type_cons) && Shen.empty$question$(Arg6751_0[2][2]))))
  ? ((R0 = Shen.call(Shen.fns["shen.reduce_help"], [Arg6751_0[1]])),
  ((Shen.unwind_tail(Shen.$eq$(Arg6751_0[1], R0)))
  ? Arg6751_0
  : (function() {
  return Shen.call_tail(Shen.fns["shen.reduce_help"], [[Shen.type_cons, R0, Arg6751_0[2]]]);})))
  : Arg6751_0))))))))}, 1, [], "shen.reduce_help"];





Shen.fns["shen.+string?"] = [Shen.type_func, function shen_user_lambda6754(Arg6753) {
  if (Arg6753.length < 1) return [Shen.type_func, shen_user_lambda6754, 1, Arg6753];
  var Arg6753_0 = Arg6753[0];
  return ((Shen.unwind_tail(Shen.$eq$("", Arg6753_0)))
  ? false
  : (typeof(Arg6753_0) == 'string'))}, 1, [], "shen.+string?"];





Shen.fns["shen.+vector"] = [Shen.type_func, function shen_user_lambda6756(Arg6755) {
  if (Arg6755.length < 1) return [Shen.type_func, shen_user_lambda6756, 1, Arg6755];
  var Arg6755_0 = Arg6755[0];
  return ((Shen.unwind_tail(Shen.$eq$(Arg6755_0, Shen.vector(0))))
  ? false
  : (function() {
  return Shen.vector$question$(Arg6755_0);}))}, 1, [], "shen.+vector"];





Shen.fns["shen.ebr"] = [Shen.type_func, function shen_user_lambda6758(Arg6757) {
  if (Arg6757.length < 3) return [Shen.type_func, shen_user_lambda6758, 3, Arg6757];
  var Arg6757_0 = Arg6757[0], Arg6757_1 = Arg6757[1], Arg6757_2 = Arg6757[2];
  return ((Shen.unwind_tail(Shen.$eq$(Arg6757_2, Arg6757_1)))
  ? Arg6757_0
  : (((Shen.is_type(Arg6757_2, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "/."], Arg6757_2[1])) && (Shen.is_type(Arg6757_2[2], Shen.type_cons) && (Shen.is_type(Arg6757_2[2][2], Shen.type_cons) && (Shen.empty$question$(Arg6757_2[2][2][2]) && (Shen.call(Shen.fns["occurrences"], [Arg6757_1, Arg6757_2[2][1]]) > 0)))))))
  ? Arg6757_2
  : (((Shen.is_type(Arg6757_2, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "let"], Arg6757_2[1])) && (Shen.is_type(Arg6757_2[2], Shen.type_cons) && (Shen.is_type(Arg6757_2[2][2], Shen.type_cons) && (Shen.is_type(Arg6757_2[2][2][2], Shen.type_cons) && (Shen.empty$question$(Arg6757_2[2][2][2][2]) && Shen.unwind_tail(Shen.$eq$(Arg6757_2[2][1], Arg6757_1)))))))))
  ? [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, Arg6757_2[2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.ebr"], [Arg6757_0, Arg6757_2[2][1], Arg6757_2[2][2][1]]), Arg6757_2[2][2][2]]]]
  : ((Shen.is_type(Arg6757_2, Shen.type_cons))
  ? [Shen.type_cons, Shen.call(Shen.fns["shen.ebr"], [Arg6757_0, Arg6757_1, Arg6757_2[1]]), Shen.call(Shen.fns["shen.ebr"], [Arg6757_0, Arg6757_1, Arg6757_2[2]])]
  : Arg6757_2))))}, 3, [], "shen.ebr"];





Shen.fns["shen.add_test"] = [Shen.type_func, function shen_user_lambda6760(Arg6759) {
  if (Arg6759.length < 1) return [Shen.type_func, shen_user_lambda6760, 1, Arg6759];
  var Arg6759_0 = Arg6759[0];
  return (Shen.globals["shen.*teststack*"] = [Shen.type_cons, Arg6759_0, (Shen.globals["shen.*teststack*"])])}, 1, [], "shen.add_test"];





Shen.fns["shen.cond-expression"] = [Shen.type_func, function shen_user_lambda6762(Arg6761) {
  if (Arg6761.length < 3) return [Shen.type_func, shen_user_lambda6762, 3, Arg6761];
  var Arg6761_0 = Arg6761[0], Arg6761_1 = Arg6761[1], Arg6761_2 = Arg6761[2];
  var R0;
  return ((R0 = Shen.call(Shen.fns["shen.err-condition"], [Arg6761_0])),
  (R0 = Shen.call(Shen.fns["shen.case-form"], [Arg6761_2, R0])),
  (R0 = Shen.call(Shen.fns["shen.encode-choices"], [R0, Arg6761_0])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.cond-form"], [R0]);}))}, 3, [], "shen.cond-expression"];





Shen.fns["shen.cond-form"] = [Shen.type_func, function shen_user_lambda6764(Arg6763) {
  if (Arg6763.length < 1) return [Shen.type_func, shen_user_lambda6764, 1, Arg6763];
  var Arg6763_0 = Arg6763[0];
  return (((Shen.is_type(Arg6763_0, Shen.type_cons) && (Shen.is_type(Arg6763_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$(true, Arg6763_0[1][1])) && (Shen.is_type(Arg6763_0[1][2], Shen.type_cons) && Shen.empty$question$(Arg6763_0[1][2][2]))))))
  ? Arg6763_0[1][2][1]
  : [Shen.type_cons, [Shen.type_symbol, "cond"], Arg6763_0])}, 1, [], "shen.cond-form"];





Shen.fns["shen.encode-choices"] = [Shen.type_func, function shen_user_lambda6766(Arg6765) {
  if (Arg6765.length < 2) return [Shen.type_func, shen_user_lambda6766, 2, Arg6765];
  var Arg6765_0 = Arg6765[0], Arg6765_1 = Arg6765[1];
  return ((Shen.empty$question$(Arg6765_0))
  ? []
  : (((Shen.is_type(Arg6765_0, Shen.type_cons) && (Shen.is_type(Arg6765_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$(true, Arg6765_0[1][1])) && (Shen.is_type(Arg6765_0[1][2], Shen.type_cons) && (Shen.is_type(Arg6765_0[1][2][1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.choicepoint!"], Arg6765_0[1][2][1][1])) && (Shen.is_type(Arg6765_0[1][2][1][2], Shen.type_cons) && (Shen.empty$question$(Arg6765_0[1][2][1][2][2]) && (Shen.empty$question$(Arg6765_0[1][2][2]) && Shen.empty$question$(Arg6765_0[2])))))))))))
  ? [Shen.type_cons, [Shen.type_cons, true, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, [Shen.type_symbol, "Result"], [Shen.type_cons, Arg6765_0[1][2][1][2][1], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "="], [Shen.type_cons, [Shen.type_symbol, "Result"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "fail"], []], []]]], [Shen.type_cons, (((Shen.globals["shen.*installing-kl*"]))
  ? [Shen.type_cons, [Shen.type_symbol, "shen.sys-error"], [Shen.type_cons, Arg6765_1, []]]
  : [Shen.type_cons, [Shen.type_symbol, "shen.f_error"], [Shen.type_cons, Arg6765_1, []]]), [Shen.type_cons, [Shen.type_symbol, "Result"], []]]]], []]]]], []]], []]
  : (((Shen.is_type(Arg6765_0, Shen.type_cons) && (Shen.is_type(Arg6765_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$(true, Arg6765_0[1][1])) && (Shen.is_type(Arg6765_0[1][2], Shen.type_cons) && (Shen.is_type(Arg6765_0[1][2][1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.choicepoint!"], Arg6765_0[1][2][1][1])) && (Shen.is_type(Arg6765_0[1][2][1][2], Shen.type_cons) && (Shen.empty$question$(Arg6765_0[1][2][1][2][2]) && Shen.empty$question$(Arg6765_0[1][2][2]))))))))))
  ? [Shen.type_cons, [Shen.type_cons, true, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, [Shen.type_symbol, "Result"], [Shen.type_cons, Arg6765_0[1][2][1][2][1], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "="], [Shen.type_cons, [Shen.type_symbol, "Result"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "fail"], []], []]]], [Shen.type_cons, Shen.call(Shen.fns["shen.cond-form"], [Shen.call(Shen.fns["shen.encode-choices"], [Arg6765_0[2], Arg6765_1])]), [Shen.type_cons, [Shen.type_symbol, "Result"], []]]]], []]]]], []]], []]
  : (((Shen.is_type(Arg6765_0, Shen.type_cons) && (Shen.is_type(Arg6765_0[1], Shen.type_cons) && (Shen.is_type(Arg6765_0[1][2], Shen.type_cons) && (Shen.is_type(Arg6765_0[1][2][1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.choicepoint!"], Arg6765_0[1][2][1][1])) && (Shen.is_type(Arg6765_0[1][2][1][2], Shen.type_cons) && (Shen.empty$question$(Arg6765_0[1][2][1][2][2]) && Shen.empty$question$(Arg6765_0[1][2][2])))))))))
  ? [Shen.type_cons, [Shen.type_cons, true, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, [Shen.type_symbol, "Freeze"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "freeze"], [Shen.type_cons, Shen.call(Shen.fns["shen.cond-form"], [Shen.call(Shen.fns["shen.encode-choices"], [Arg6765_0[2], Arg6765_1])]), []]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, Arg6765_0[1][1], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, [Shen.type_symbol, "Result"], [Shen.type_cons, Arg6765_0[1][2][1][2][1], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "="], [Shen.type_cons, [Shen.type_symbol, "Result"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "fail"], []], []]]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "thaw"], [Shen.type_cons, [Shen.type_symbol, "Freeze"], []]], [Shen.type_cons, [Shen.type_symbol, "Result"], []]]]], []]]]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "thaw"], [Shen.type_cons, [Shen.type_symbol, "Freeze"], []]], []]]]], []]]]], []]], []]
  : (((Shen.is_type(Arg6765_0, Shen.type_cons) && (Shen.is_type(Arg6765_0[1], Shen.type_cons) && (Shen.is_type(Arg6765_0[1][2], Shen.type_cons) && Shen.empty$question$(Arg6765_0[1][2][2])))))
  ? [Shen.type_cons, Arg6765_0[1], Shen.call(Shen.fns["shen.encode-choices"], [Arg6765_0[2], Arg6765_1])]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.encode-choices"]]);}))))))}, 2, [], "shen.encode-choices"];





Shen.fns["shen.case-form"] = [Shen.type_func, function shen_user_lambda6768(Arg6767) {
  if (Arg6767.length < 2) return [Shen.type_func, shen_user_lambda6768, 2, Arg6767];
  var Arg6767_0 = Arg6767[0], Arg6767_1 = Arg6767[1];
  return ((Shen.empty$question$(Arg6767_0))
  ? [Shen.type_cons, Arg6767_1, []]
  : (((Shen.is_type(Arg6767_0, Shen.type_cons) && (Shen.is_type(Arg6767_0[1], Shen.type_cons) && (Shen.is_type(Arg6767_0[1][1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":"], Arg6767_0[1][1][1])) && (Shen.is_type(Arg6767_0[1][1][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.tests"], Arg6767_0[1][1][2][1])) && (Shen.empty$question$(Arg6767_0[1][1][2][2]) && (Shen.is_type(Arg6767_0[1][2], Shen.type_cons) && (Shen.is_type(Arg6767_0[1][2][1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.choicepoint!"], Arg6767_0[1][2][1][1])) && (Shen.is_type(Arg6767_0[1][2][1][2], Shen.type_cons) && (Shen.empty$question$(Arg6767_0[1][2][1][2][2]) && Shen.empty$question$(Arg6767_0[1][2][2]))))))))))))))
  ? [Shen.type_cons, [Shen.type_cons, true, Arg6767_0[1][2]], Shen.call(Shen.fns["shen.case-form"], [Arg6767_0[2], Arg6767_1])]
  : (((Shen.is_type(Arg6767_0, Shen.type_cons) && (Shen.is_type(Arg6767_0[1], Shen.type_cons) && (Shen.is_type(Arg6767_0[1][1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":"], Arg6767_0[1][1][1])) && (Shen.is_type(Arg6767_0[1][1][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.tests"], Arg6767_0[1][1][2][1])) && (Shen.empty$question$(Arg6767_0[1][1][2][2]) && (Shen.is_type(Arg6767_0[1][2], Shen.type_cons) && Shen.empty$question$(Arg6767_0[1][2][2]))))))))))
  ? [Shen.type_cons, [Shen.type_cons, true, Arg6767_0[1][2]], []]
  : (((Shen.is_type(Arg6767_0, Shen.type_cons) && (Shen.is_type(Arg6767_0[1], Shen.type_cons) && (Shen.is_type(Arg6767_0[1][1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":"], Arg6767_0[1][1][1])) && (Shen.is_type(Arg6767_0[1][1][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.tests"], Arg6767_0[1][1][2][1])) && (Shen.is_type(Arg6767_0[1][2], Shen.type_cons) && Shen.empty$question$(Arg6767_0[1][2][2])))))))))
  ? [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.embed-and"], [Arg6767_0[1][1][2][2]]), Arg6767_0[1][2]], Shen.call(Shen.fns["shen.case-form"], [Arg6767_0[2], Arg6767_1])]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.case-form"]]);})))))}, 2, [], "shen.case-form"];





Shen.fns["shen.embed-and"] = [Shen.type_func, function shen_user_lambda6770(Arg6769) {
  if (Arg6769.length < 1) return [Shen.type_func, shen_user_lambda6770, 1, Arg6769];
  var Arg6769_0 = Arg6769[0];
  return (((Shen.is_type(Arg6769_0, Shen.type_cons) && Shen.empty$question$(Arg6769_0[2])))
  ? Arg6769_0[1]
  : ((Shen.is_type(Arg6769_0, Shen.type_cons))
  ? [Shen.type_cons, [Shen.type_symbol, "and"], [Shen.type_cons, Arg6769_0[1], [Shen.type_cons, Shen.call(Shen.fns["shen.embed-and"], [Arg6769_0[2]]), []]]]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.embed-and"]]);})))}, 1, [], "shen.embed-and"];





Shen.fns["shen.err-condition"] = [Shen.type_func, function shen_user_lambda6772(Arg6771) {
  if (Arg6771.length < 1) return [Shen.type_func, shen_user_lambda6772, 1, Arg6771];
  var Arg6771_0 = Arg6771[0];
  return [Shen.type_cons, true, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.f_error"], [Shen.type_cons, Arg6771_0, []]], []]]}, 1, [], "shen.err-condition"];





Shen.fns["shen.sys-error"] = [Shen.type_func, function shen_user_lambda6774(Arg6773) {
  if (Arg6773.length < 1) return [Shen.type_func, shen_user_lambda6774, 1, Arg6773];
  var Arg6773_0 = Arg6773[0];
  return (function() {
  return Shen.simple_error(("system function " + Shen.call(Shen.fns["shen.app"], [Arg6773_0, ": unexpected argument\x0d\x0a", [Shen.type_symbol, "shen.a"]])));})}, 1, [], "shen.sys-error"];















Shen.fns["eval"] = [Shen.type_func, function shen_user_lambda7569(Arg7568) {
  if (Arg7568.length < 1) return [Shen.type_func, shen_user_lambda7569, 1, Arg7568];
  var Arg7568_0 = Arg7568[0];
  var R0;
  return ((R0 = Shen.call(Shen.fns["shen.walk"], [[Shen.type_func, function shen_user_lambda7571(Arg7570) {
  if (Arg7570.length < 1) return [Shen.type_func, shen_user_lambda7571, 1, Arg7570];
  var Arg7570_0 = Arg7570[0];
  return (function() {
  return Shen.call_tail(Shen.fns["macroexpand"], [Arg7570_0]);})}, 1, [], undefined], Arg7568_0])),
  ((Shen.call(Shen.fns["shen.packaged?"], [R0]))
  ? (function() {
  return Shen.call_tail(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7573(Arg7572) {
  if (Arg7572.length < 1) return [Shen.type_func, shen_user_lambda7573, 1, Arg7572];
  var Arg7572_0 = Arg7572[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.eval-without-macros"], [Arg7572_0]);})}, 1, [], undefined], Shen.call(Shen.fns["shen.package-contents"], [R0])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.eval-without-macros"], [R0]);})))}, 1, [], "eval"];





Shen.fns["shen.eval-without-macros"] = [Shen.type_func, function shen_user_lambda7575(Arg7574) {
  if (Arg7574.length < 1) return [Shen.type_func, shen_user_lambda7575, 1, Arg7574];
  var Arg7574_0 = Arg7574[0];
  return (function() {
  return Shen.eval_kl(Shen.call(Shen.fns["shen.elim-def"], [Shen.call(Shen.fns["shen.proc-input+"], [Arg7574_0])]));})}, 1, [], "shen.eval-without-macros"];





Shen.fns["shen.proc-input+"] = [Shen.type_func, function shen_user_lambda7577(Arg7576) {
  if (Arg7576.length < 1) return [Shen.type_func, shen_user_lambda7577, 1, Arg7576];
  var Arg7576_0 = Arg7576[0];
  return (((Shen.is_type(Arg7576_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "input+"], Arg7576_0[1])) && (Shen.is_type(Arg7576_0[2], Shen.type_cons) && (Shen.is_type(Arg7576_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg7576_0[2][2][2]))))))
  ? [Shen.type_cons, [Shen.type_symbol, "input+"], [Shen.type_cons, Shen.call(Shen.fns["shen.rcons_form"], [Arg7576_0[2][1]]), Arg7576_0[2][2]]]
  : (((Shen.is_type(Arg7576_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "read+"], Arg7576_0[1])) && (Shen.is_type(Arg7576_0[2], Shen.type_cons) && (Shen.is_type(Arg7576_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg7576_0[2][2][2]))))))
  ? [Shen.type_cons, [Shen.type_symbol, "read+"], [Shen.type_cons, Shen.call(Shen.fns["shen.rcons_form"], [Arg7576_0[2][1]]), Arg7576_0[2][2]]]
  : ((Shen.is_type(Arg7576_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7579(Arg7578) {
  if (Arg7578.length < 1) return [Shen.type_func, shen_user_lambda7579, 1, Arg7578];
  var Arg7578_0 = Arg7578[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.proc-input+"], [Arg7578_0]);})}, 1, [], undefined], Arg7576_0]);})
  : Arg7576_0)))}, 1, [], "shen.proc-input+"];





Shen.fns["shen.elim-def"] = [Shen.type_func, function shen_user_lambda7581(Arg7580) {
  if (Arg7580.length < 1) return [Shen.type_func, shen_user_lambda7581, 1, Arg7580];
  var Arg7580_0 = Arg7580[0];
  var R0;
  return (((Shen.is_type(Arg7580_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "define"], Arg7580_0[1])) && Shen.is_type(Arg7580_0[2], Shen.type_cons))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.shen->kl"], [Arg7580_0[2][1], Arg7580_0[2][2]]);})
  : (((Shen.is_type(Arg7580_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "defmacro"], Arg7580_0[1])) && Shen.is_type(Arg7580_0[2], Shen.type_cons))))
  ? ((R0 = [Shen.type_cons, [Shen.type_symbol, "X"], [Shen.type_cons, [Shen.type_symbol, "->"], [Shen.type_cons, [Shen.type_symbol, "X"], []]]]),
  (R0 = Shen.call(Shen.fns["shen.elim-def"], [[Shen.type_cons, [Shen.type_symbol, "define"], [Shen.type_cons, Arg7580_0[2][1], Shen.call(Shen.fns["append"], [Arg7580_0[2][2], R0])]]])),
  Shen.call(Shen.fns["shen.add-macro"], [Arg7580_0[2][1]]),
  R0)
  : (((Shen.is_type(Arg7580_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "defcc"], Arg7580_0[1])) && Shen.is_type(Arg7580_0[2], Shen.type_cons))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.elim-def"], [Shen.call(Shen.fns["shen.yacc"], [Arg7580_0])]);})
  : ((Shen.is_type(Arg7580_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7583(Arg7582) {
  if (Arg7582.length < 1) return [Shen.type_func, shen_user_lambda7583, 1, Arg7582];
  var Arg7582_0 = Arg7582[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.elim-def"], [Arg7582_0]);})}, 1, [], undefined], Arg7580_0]);})
  : Arg7580_0))))}, 1, [], "shen.elim-def"];





Shen.fns["shen.add-macro"] = [Shen.type_func, function shen_user_lambda7585(Arg7584) {
  if (Arg7584.length < 1) return [Shen.type_func, shen_user_lambda7585, 1, Arg7584];
  var Arg7584_0 = Arg7584[0];
  return (Shen.globals["*macros*"] = Shen.call(Shen.fns["adjoin"], [Arg7584_0, (Shen.globals["*macros*"])]))}, 1, [], "shen.add-macro"];





Shen.fns["shen.packaged?"] = [Shen.type_func, function shen_user_lambda7587(Arg7586) {
  if (Arg7586.length < 1) return [Shen.type_func, shen_user_lambda7587, 1, Arg7586];
  var Arg7586_0 = Arg7586[0];
  return (((Shen.is_type(Arg7586_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "package"], Arg7586_0[1])) && (Shen.is_type(Arg7586_0[2], Shen.type_cons) && Shen.is_type(Arg7586_0[2][2], Shen.type_cons)))))
  ? true
  : false)}, 1, [], "shen.packaged?"];





Shen.fns["external"] = [Shen.type_func, function shen_user_lambda7591(Arg7588) {
  if (Arg7588.length < 1) return [Shen.type_func, shen_user_lambda7591, 1, Arg7588];
  var Arg7588_0 = Arg7588[0];
  var R0, R1;
  return ((R0 = [Shen.type_func, function shen_user_lambda7593(Arg7592) {
  if (Arg7592.length < 1) return [Shen.type_func, shen_user_lambda7593, 1, Arg7592];
  var Arg7592_0 = Arg7592[0];
  return (function() {
  return Shen.call_tail(Shen.fns["get"], [Arg7592_0, [Shen.type_symbol, "shen.external-symbols"], (Shen.globals["*property-vector*"])]);})}, 1, [Arg7588_0], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda7595(Arg7594) {
  if (Arg7594.length < 2) return [Shen.type_func, shen_user_lambda7595, 2, Arg7594];
  var Arg7594_0 = Arg7594[0], Arg7594_1 = Arg7594[1];
  return (function() {
  return Shen.simple_error(("package " + Shen.call(Shen.fns["shen.app"], [Arg7594_0, " has not been used.\x0d\x0a", [Shen.type_symbol, "shen.a"]])));})}, 2, [Arg7588_0], undefined]),
  (function() {
  return Shen.trap_error(R0, R1);}))}, 1, [], "external"];





Shen.fns["shen.package-contents"] = [Shen.type_func, function shen_user_lambda7597(Arg7596) {
  if (Arg7596.length < 1) return [Shen.type_func, shen_user_lambda7597, 1, Arg7596];
  var Arg7596_0 = Arg7596[0];
  return (((Shen.is_type(Arg7596_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "package"], Arg7596_0[1])) && (Shen.is_type(Arg7596_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "null"], Arg7596_0[2][1])) && Shen.is_type(Arg7596_0[2][2], Shen.type_cons))))))
  ? Arg7596_0[2][2][2]
  : (((Shen.is_type(Arg7596_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "package"], Arg7596_0[1])) && (Shen.is_type(Arg7596_0[2], Shen.type_cons) && Shen.is_type(Arg7596_0[2][2], Shen.type_cons)))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.packageh"], [Arg7596_0[2][1], Arg7596_0[2][2][1], Arg7596_0[2][2][2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.package-contents"]]);})))}, 1, [], "shen.package-contents"];





Shen.fns["shen.walk"] = [Shen.type_func, function shen_user_lambda7599(Arg7598) {
  if (Arg7598.length < 2) return [Shen.type_func, shen_user_lambda7599, 2, Arg7598];
  var Arg7598_0 = Arg7598[0], Arg7598_1 = Arg7598[1];
  return ((Shen.is_type(Arg7598_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Arg7598_0, [Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7601(Arg7600) {
  if (Arg7600.length < 2) return [Shen.type_func, shen_user_lambda7601, 2, Arg7600];
  var Arg7600_0 = Arg7600[0], Arg7600_1 = Arg7600[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.walk"], [Arg7600_0, Arg7600_1]);})}, 2, [Arg7598_0], undefined], Arg7598_1])]);})
  : (function() {
  return Shen.call_tail(Arg7598_0, [Arg7598_1]);}))}, 2, [], "shen.walk"];





Shen.fns["compile"] = [Shen.type_func, function shen_user_lambda7603(Arg7602) {
  if (Arg7602.length < 3) return [Shen.type_func, shen_user_lambda7603, 3, Arg7602];
  var Arg7602_0 = Arg7602[0], Arg7602_1 = Arg7602[1], Arg7602_2 = Arg7602[2];
  var R0;
  return ((R0 = Shen.call(Arg7602_0, [[Shen.type_cons, Arg7602_1, [Shen.type_cons, [], []]]])),
  (((Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0)) || (!Shen.empty$question$(R0[1]))))
  ? (function() {
  return Shen.call_tail(Arg7602_2, [R0]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.hdtl"], [R0]);})))}, 3, [], "compile"];





Shen.fns["fail-if"] = [Shen.type_func, function shen_user_lambda7605(Arg7604) {
  if (Arg7604.length < 2) return [Shen.type_func, shen_user_lambda7605, 2, Arg7604];
  var Arg7604_0 = Arg7604[0], Arg7604_1 = Arg7604[1];
  return ((Shen.call(Arg7604_0, [Arg7604_1]))
  ? Shen.fail_obj
  : Arg7604_1)}, 2, [], "fail-if"];





Shen.fns["@s"] = [Shen.type_func, function shen_user_lambda7607(Arg7606) {
  if (Arg7606.length < 2) return [Shen.type_func, shen_user_lambda7607, 2, Arg7606];
  var Arg7606_0 = Arg7606[0], Arg7606_1 = Arg7606[1];
  return (Arg7606_0 + Arg7606_1)}, 2, [], "@s"];





Shen.fns["tc?"] = [Shen.type_func, function shen_user_lambda7609(Arg7608) {
  if (Arg7608.length < 0) return [Shen.type_func, shen_user_lambda7609, 0, Arg7608];
  return (Shen.globals["shen.*tc*"])}, 0, [], "tc?"];





Shen.fns["ps"] = [Shen.type_func, function shen_user_lambda7613(Arg7610) {
  if (Arg7610.length < 1) return [Shen.type_func, shen_user_lambda7613, 1, Arg7610];
  var Arg7610_0 = Arg7610[0];
  var R0, R1;
  return ((R0 = [Shen.type_func, function shen_user_lambda7615(Arg7614) {
  if (Arg7614.length < 1) return [Shen.type_func, shen_user_lambda7615, 1, Arg7614];
  var Arg7614_0 = Arg7614[0];
  return (function() {
  return Shen.call_tail(Shen.fns["get"], [Arg7614_0, [Shen.type_symbol, "shen.source"], (Shen.globals["*property-vector*"])]);})}, 1, [Arg7610_0], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda7617(Arg7616) {
  if (Arg7616.length < 2) return [Shen.type_func, shen_user_lambda7617, 2, Arg7616];
  var Arg7616_0 = Arg7616[0], Arg7616_1 = Arg7616[1];
  return (function() {
  return Shen.simple_error(Shen.call(Shen.fns["shen.app"], [Arg7616_0, " not found.\x0d\x0a", [Shen.type_symbol, "shen.a"]]));})}, 2, [Arg7610_0], undefined]),
  (function() {
  return Shen.trap_error(R0, R1);}))}, 1, [], "ps"];





Shen.fns["stinput"] = [Shen.type_func, function shen_user_lambda7619(Arg7618) {
  if (Arg7618.length < 0) return [Shen.type_func, shen_user_lambda7619, 0, Arg7618];
  return (Shen.globals["*stinput*"])}, 0, [], "stinput"];





Shen.fns["shen.+vector?"] = [Shen.type_func, function shen_user_lambda7621(Arg7620) {
  if (Arg7620.length < 1) return [Shen.type_func, shen_user_lambda7621, 1, Arg7620];
  var Arg7620_0 = Arg7620[0];
  return (Shen.absvector$question$(Arg7620_0) && (Shen.absvector_ref(Arg7620_0, 0) > 0))}, 1, [], "shen.+vector?"];










Shen.fns["shen.fillvector"] = [Shen.type_func, function shen_user_lambda7624(Arg7623) {
  if (Arg7623.length < 4) return [Shen.type_func, shen_user_lambda7624, 4, Arg7623];
  var Arg7623_0 = Arg7623[0], Arg7623_1 = Arg7623[1], Arg7623_2 = Arg7623[2], Arg7623_3 = Arg7623[3];
  return ((Shen.unwind_tail(Shen.$eq$(Arg7623_2, Arg7623_1)))
  ? Shen.absvector_set(Arg7623_0, Arg7623_2, Arg7623_3)
  : (function() {
  return Shen.call_tail(Shen.fns["shen.fillvector"], [Shen.absvector_set(Arg7623_0, Arg7623_1, Arg7623_3), (1 + Arg7623_1), Arg7623_2, Arg7623_3]);}))}, 4, [], "shen.fillvector"];










Shen.fns["vector->"] = [Shen.type_func, function shen_user_lambda7629(Arg7628) {
  if (Arg7628.length < 3) return [Shen.type_func, shen_user_lambda7629, 3, Arg7628];
  var Arg7628_0 = Arg7628[0], Arg7628_1 = Arg7628[1], Arg7628_2 = Arg7628[2];
  return ((Shen.unwind_tail(Shen.$eq$(Arg7628_1, 0)))
  ? (function() {
  return Shen.simple_error("cannot access 0th element of a vector\x0d\x0a");})
  : Shen.absvector_set(Arg7628_0, Arg7628_1, Arg7628_2))}, 3, [], "vector->"];





Shen.fns["<-vector"] = [Shen.type_func, function shen_user_lambda7631(Arg7630) {
  if (Arg7630.length < 2) return [Shen.type_func, shen_user_lambda7631, 2, Arg7630];
  var Arg7630_0 = Arg7630[0], Arg7630_1 = Arg7630[1];
  var R0;
  return ((Shen.unwind_tail(Shen.$eq$(Arg7630_1, 0)))
  ? (function() {
  return Shen.simple_error("cannot access 0th element of a vector\x0d\x0a");})
  : ((R0 = Shen.absvector_ref(Arg7630_0, Arg7630_1)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (function() {
  return Shen.simple_error("vector element not found\x0d\x0a");})
  : R0)))}, 2, [], "<-vector"];





Shen.fns["shen.posint?"] = [Shen.type_func, function shen_user_lambda7633(Arg7632) {
  if (Arg7632.length < 1) return [Shen.type_func, shen_user_lambda7633, 1, Arg7632];
  var Arg7632_0 = Arg7632[0];
  return (Shen.call(Shen.fns["integer?"], [Arg7632_0]) && (Arg7632_0 >= 0))}, 1, [], "shen.posint?"];





Shen.fns["limit"] = [Shen.type_func, function shen_user_lambda7635(Arg7634) {
  if (Arg7634.length < 1) return [Shen.type_func, shen_user_lambda7635, 1, Arg7634];
  var Arg7634_0 = Arg7634[0];
  return Shen.absvector_ref(Arg7634_0, 0)}, 1, [], "limit"];










Shen.fns["shen.analyse-symbol?"] = [Shen.type_func, function shen_user_lambda7640(Arg7639) {
  if (Arg7639.length < 1) return [Shen.type_func, shen_user_lambda7640, 1, Arg7639];
  var Arg7639_0 = Arg7639[0];
  return ((Shen.call(Shen.fns["shen.+string?"], [Arg7639_0]))
  ? (Shen.call(Shen.fns["shen.alpha?"], [Arg7639_0[0]]) && Shen.call(Shen.fns["shen.alphanums?"], [Shen.tlstr(Arg7639_0)]))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.analyse-symbol?"]]);}))}, 1, [], "shen.analyse-symbol?"];





Shen.fns["shen.alpha?"] = [Shen.type_func, function shen_user_lambda7642(Arg7641) {
  if (Arg7641.length < 1) return [Shen.type_func, shen_user_lambda7642, 1, Arg7641];
  var Arg7641_0 = Arg7641[0];
  return (function() {
  return Shen.call_tail(Shen.fns["element?"], [Arg7641_0, [Shen.type_cons, "A", [Shen.type_cons, "B", [Shen.type_cons, "C", [Shen.type_cons, "D", [Shen.type_cons, "E", [Shen.type_cons, "F", [Shen.type_cons, "G", [Shen.type_cons, "H", [Shen.type_cons, "I", [Shen.type_cons, "J", [Shen.type_cons, "K", [Shen.type_cons, "L", [Shen.type_cons, "M", [Shen.type_cons, "N", [Shen.type_cons, "O", [Shen.type_cons, "P", [Shen.type_cons, "Q", [Shen.type_cons, "R", [Shen.type_cons, "S", [Shen.type_cons, "T", [Shen.type_cons, "U", [Shen.type_cons, "V", [Shen.type_cons, "W", [Shen.type_cons, "X", [Shen.type_cons, "Y", [Shen.type_cons, "Z", [Shen.type_cons, "a", [Shen.type_cons, "b", [Shen.type_cons, "c", [Shen.type_cons, "d", [Shen.type_cons, "e", [Shen.type_cons, "f", [Shen.type_cons, "g", [Shen.type_cons, "h", [Shen.type_cons, "i", [Shen.type_cons, "j", [Shen.type_cons, "k", [Shen.type_cons, "l", [Shen.type_cons, "m", [Shen.type_cons, "n", [Shen.type_cons, "o", [Shen.type_cons, "p", [Shen.type_cons, "q", [Shen.type_cons, "r", [Shen.type_cons, "s", [Shen.type_cons, "t", [Shen.type_cons, "u", [Shen.type_cons, "v", [Shen.type_cons, "w", [Shen.type_cons, "x", [Shen.type_cons, "y", [Shen.type_cons, "z", [Shen.type_cons, "=", [Shen.type_cons, "*", [Shen.type_cons, "/", [Shen.type_cons, "+", [Shen.type_cons, "-", [Shen.type_cons, "_", [Shen.type_cons, "?", [Shen.type_cons, "$", [Shen.type_cons, "!", [Shen.type_cons, "@", [Shen.type_cons, "~", [Shen.type_cons, ">", [Shen.type_cons, "<", [Shen.type_cons, "&", [Shen.type_cons, "%", [Shen.type_cons, "{", [Shen.type_cons, "}", [Shen.type_cons, ":", [Shen.type_cons, ";", [Shen.type_cons, "`", [Shen.type_cons, "#", [Shen.type_cons, "'", [Shen.type_cons, ".", []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]);})}, 1, [], "shen.alpha?"];





Shen.fns["shen.alphanums?"] = [Shen.type_func, function shen_user_lambda7644(Arg7643) {
  if (Arg7643.length < 1) return [Shen.type_func, shen_user_lambda7644, 1, Arg7643];
  var Arg7643_0 = Arg7643[0];
  return ((Shen.unwind_tail(Shen.$eq$("", Arg7643_0)))
  ? true
  : ((Shen.call(Shen.fns["shen.+string?"], [Arg7643_0]))
  ? (Shen.call(Shen.fns["shen.alphanum?"], [Arg7643_0[0]]) && Shen.call(Shen.fns["shen.alphanums?"], [Shen.tlstr(Arg7643_0)]))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.alphanums?"]]);})))}, 1, [], "shen.alphanums?"];





Shen.fns["shen.alphanum?"] = [Shen.type_func, function shen_user_lambda7646(Arg7645) {
  if (Arg7645.length < 1) return [Shen.type_func, shen_user_lambda7646, 1, Arg7645];
  var Arg7645_0 = Arg7645[0];
  return (Shen.call(Shen.fns["shen.alpha?"], [Arg7645_0]) || Shen.call(Shen.fns["shen.digit?"], [Arg7645_0]))}, 1, [], "shen.alphanum?"];





Shen.fns["shen.digit?"] = [Shen.type_func, function shen_user_lambda7648(Arg7647) {
  if (Arg7647.length < 1) return [Shen.type_func, shen_user_lambda7648, 1, Arg7647];
  var Arg7647_0 = Arg7647[0];
  return (function() {
  return Shen.call_tail(Shen.fns["element?"], [Arg7647_0, [Shen.type_cons, "1", [Shen.type_cons, "2", [Shen.type_cons, "3", [Shen.type_cons, "4", [Shen.type_cons, "5", [Shen.type_cons, "6", [Shen.type_cons, "7", [Shen.type_cons, "8", [Shen.type_cons, "9", [Shen.type_cons, "0", []]]]]]]]]]]]);})}, 1, [], "shen.digit?"];





Shen.fns["variable?"] = [Shen.type_func, function shen_user_lambda7652(Arg7649) {
  if (Arg7649.length < 1) return [Shen.type_func, shen_user_lambda7652, 1, Arg7649];
  var Arg7649_0 = Arg7649[0];
  var R0, R1;
  return (((Shen.boolean$question$(Arg7649_0) || ((typeof(Arg7649_0) == 'number') || (typeof(Arg7649_0) == 'string'))))
  ? false
  : ((R0 = [Shen.type_func, function shen_user_lambda7654(Arg7653) {
  if (Arg7653.length < 1) return [Shen.type_func, shen_user_lambda7654, 1, Arg7653];
  var Arg7653_0 = Arg7653[0];
  var R0;
  return ((R0 = Shen.str(Arg7653_0)),
  (function() {
  return Shen.call_tail(Shen.fns["shen.analyse-variable?"], [R0]);}))}, 1, [Arg7649_0], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda7656(Arg7655) {
  if (Arg7655.length < 1) return [Shen.type_func, shen_user_lambda7656, 1, Arg7655];
  var Arg7655_0 = Arg7655[0];
  return false}, 1, [], undefined]),
  (function() {
  return Shen.trap_error(R0, R1);})))}, 1, [], "variable?"];





Shen.fns["shen.analyse-variable?"] = [Shen.type_func, function shen_user_lambda7658(Arg7657) {
  if (Arg7657.length < 1) return [Shen.type_func, shen_user_lambda7658, 1, Arg7657];
  var Arg7657_0 = Arg7657[0];
  return ((Shen.call(Shen.fns["shen.+string?"], [Arg7657_0]))
  ? (Shen.call(Shen.fns["shen.uppercase?"], [Arg7657_0[0]]) && Shen.call(Shen.fns["shen.alphanums?"], [Shen.tlstr(Arg7657_0)]))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.analyse-variable?"]]);}))}, 1, [], "shen.analyse-variable?"];





Shen.fns["shen.uppercase?"] = [Shen.type_func, function shen_user_lambda7660(Arg7659) {
  if (Arg7659.length < 1) return [Shen.type_func, shen_user_lambda7660, 1, Arg7659];
  var Arg7659_0 = Arg7659[0];
  return (function() {
  return Shen.call_tail(Shen.fns["element?"], [Arg7659_0, [Shen.type_cons, "A", [Shen.type_cons, "B", [Shen.type_cons, "C", [Shen.type_cons, "D", [Shen.type_cons, "E", [Shen.type_cons, "F", [Shen.type_cons, "G", [Shen.type_cons, "H", [Shen.type_cons, "I", [Shen.type_cons, "J", [Shen.type_cons, "K", [Shen.type_cons, "L", [Shen.type_cons, "M", [Shen.type_cons, "N", [Shen.type_cons, "O", [Shen.type_cons, "P", [Shen.type_cons, "Q", [Shen.type_cons, "R", [Shen.type_cons, "S", [Shen.type_cons, "T", [Shen.type_cons, "U", [Shen.type_cons, "V", [Shen.type_cons, "W", [Shen.type_cons, "X", [Shen.type_cons, "Y", [Shen.type_cons, "Z", []]]]]]]]]]]]]]]]]]]]]]]]]]]]);})}, 1, [], "shen.uppercase?"];





Shen.fns["gensym"] = [Shen.type_func, function shen_user_lambda7662(Arg7661) {
  if (Arg7661.length < 1) return [Shen.type_func, shen_user_lambda7662, 1, Arg7661];
  var Arg7661_0 = Arg7661[0];
  return (function() {
  return Shen.call_tail(Shen.fns["concat"], [Arg7661_0, (Shen.globals["shen.*gensym*"] = (1 + (Shen.globals["shen.*gensym*"])))]);})}, 1, [], "gensym"];





Shen.fns["concat"] = [Shen.type_func, function shen_user_lambda7664(Arg7663) {
  if (Arg7663.length < 2) return [Shen.type_func, shen_user_lambda7664, 2, Arg7663];
  var Arg7663_0 = Arg7663[0], Arg7663_1 = Arg7663[1];
  return (function() {
  return Shen.intern((Shen.str(Arg7663_0) + Shen.str(Arg7663_1)));})}, 2, [], "concat"];










Shen.fns["fst"] = [Shen.type_func, function shen_user_lambda7667(Arg7666) {
  if (Arg7666.length < 1) return [Shen.type_func, shen_user_lambda7667, 1, Arg7666];
  var Arg7666_0 = Arg7666[0];
  return Shen.absvector_ref(Arg7666_0, 1)}, 1, [], "fst"];





Shen.fns["snd"] = [Shen.type_func, function shen_user_lambda7669(Arg7668) {
  if (Arg7668.length < 1) return [Shen.type_func, shen_user_lambda7669, 1, Arg7668];
  var Arg7668_0 = Arg7668[0];
  return Shen.absvector_ref(Arg7668_0, 2)}, 1, [], "snd"];





Shen.fns["tuple?"] = [Shen.type_func, function shen_user_lambda7673(Arg7670) {
  if (Arg7670.length < 1) return [Shen.type_func, shen_user_lambda7673, 1, Arg7670];
  var Arg7670_0 = Arg7670[0];
  var R0, R1;
  return ((R0 = [Shen.type_func, function shen_user_lambda7675(Arg7674) {
  if (Arg7674.length < 1) return [Shen.type_func, shen_user_lambda7675, 1, Arg7674];
  var Arg7674_0 = Arg7674[0];
  return (Shen.absvector$question$(Arg7674_0) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.tuple"], Shen.absvector_ref(Arg7674_0, 0))))}, 1, [Arg7670_0], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda7677(Arg7676) {
  if (Arg7676.length < 1) return [Shen.type_func, shen_user_lambda7677, 1, Arg7676];
  var Arg7676_0 = Arg7676[0];
  return false}, 1, [], undefined]),
  (function() {
  return Shen.trap_error(R0, R1);}))}, 1, [], "tuple?"];





Shen.fns["append"] = [Shen.type_func, function shen_user_lambda7679(Arg7678) {
  if (Arg7678.length < 2) return [Shen.type_func, shen_user_lambda7679, 2, Arg7678];
  var Arg7678_0 = Arg7678[0], Arg7678_1 = Arg7678[1];
  return ((Shen.empty$question$(Arg7678_0))
  ? Arg7678_1
  : ((Shen.is_type(Arg7678_0, Shen.type_cons))
  ? [Shen.type_cons, Arg7678_0[1], Shen.call(Shen.fns["append"], [Arg7678_0[2], Arg7678_1])]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "append"]]);})))}, 2, [], "append"];





Shen.fns["@v"] = [Shen.type_func, function shen_user_lambda7681(Arg7680) {
  if (Arg7680.length < 2) return [Shen.type_func, shen_user_lambda7681, 2, Arg7680];
  var Arg7680_0 = Arg7680[0], Arg7680_1 = Arg7680[1];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["limit"], [Arg7680_1])),
  (R1 = Shen.vector((R0 + 1))),
  (R1 = Shen.call(Shen.fns["vector->"], [R1, 1, Arg7680_0])),
  ((Shen.unwind_tail(Shen.$eq$(R0, 0)))
  ? R1
  : (function() {
  return Shen.call_tail(Shen.fns["shen.@v-help"], [Arg7680_1, 1, R0, R1]);})))}, 2, [], "@v"];





Shen.fns["shen.@v-help"] = [Shen.type_func, function shen_user_lambda7683(Arg7682) {
  if (Arg7682.length < 4) return [Shen.type_func, shen_user_lambda7683, 4, Arg7682];
  var Arg7682_0 = Arg7682[0], Arg7682_1 = Arg7682[1], Arg7682_2 = Arg7682[2], Arg7682_3 = Arg7682[3];
  return ((Shen.unwind_tail(Shen.$eq$(Arg7682_2, Arg7682_1)))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.copyfromvector"], [Arg7682_0, Arg7682_3, Arg7682_2, (Arg7682_2 + 1)]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.@v-help"], [Arg7682_0, (Arg7682_1 + 1), Arg7682_2, Shen.call(Shen.fns["shen.copyfromvector"], [Arg7682_0, Arg7682_3, Arg7682_1, (Arg7682_1 + 1)])]);}))}, 4, [], "shen.@v-help"];





Shen.fns["shen.copyfromvector"] = [Shen.type_func, function shen_user_lambda7687(Arg7684) {
  if (Arg7684.length < 4) return [Shen.type_func, shen_user_lambda7687, 4, Arg7684];
  var Arg7684_0 = Arg7684[0], Arg7684_1 = Arg7684[1], Arg7684_2 = Arg7684[2], Arg7684_3 = Arg7684[3];
  var R0, R1;
  return ((R0 = [Shen.type_func, function shen_user_lambda7689(Arg7688) {
  if (Arg7688.length < 4) return [Shen.type_func, shen_user_lambda7689, 4, Arg7688];
  var Arg7688_0 = Arg7688[0], Arg7688_1 = Arg7688[1], Arg7688_2 = Arg7688[2], Arg7688_3 = Arg7688[3];
  return (function() {
  return Shen.call_tail(Shen.fns["vector->"], [Arg7688_3, Arg7688_0, Shen.call(Shen.fns["<-vector"], [Arg7688_1, Arg7688_2])]);})}, 4, [Arg7684_3, Arg7684_0, Arg7684_2, Arg7684_1], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda7691(Arg7690) {
  if (Arg7690.length < 2) return [Shen.type_func, shen_user_lambda7691, 2, Arg7690];
  var Arg7690_0 = Arg7690[0], Arg7690_1 = Arg7690[1];
  return Arg7690_0}, 2, [Arg7684_1], undefined]),
  (function() {
  return Shen.trap_error(R0, R1);}))}, 4, [], "shen.copyfromvector"];





Shen.fns["hdv"] = [Shen.type_func, function shen_user_lambda7695(Arg7692) {
  if (Arg7692.length < 1) return [Shen.type_func, shen_user_lambda7695, 1, Arg7692];
  var Arg7692_0 = Arg7692[0];
  var R0, R1;
  return ((R0 = [Shen.type_func, function shen_user_lambda7697(Arg7696) {
  if (Arg7696.length < 1) return [Shen.type_func, shen_user_lambda7697, 1, Arg7696];
  var Arg7696_0 = Arg7696[0];
  return (function() {
  return Shen.call_tail(Shen.fns["<-vector"], [Arg7696_0, 1]);})}, 1, [Arg7692_0], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda7699(Arg7698) {
  if (Arg7698.length < 2) return [Shen.type_func, shen_user_lambda7699, 2, Arg7698];
  var Arg7698_0 = Arg7698[0], Arg7698_1 = Arg7698[1];
  return (function() {
  return Shen.simple_error(("hdv needs a non-empty vector as an argument; not " + Shen.call(Shen.fns["shen.app"], [Arg7698_0, "\x0d\x0a", [Shen.type_symbol, "shen.s"]])));})}, 2, [Arg7692_0], undefined]),
  (function() {
  return Shen.trap_error(R0, R1);}))}, 1, [], "hdv"];





Shen.fns["tlv"] = [Shen.type_func, function shen_user_lambda7701(Arg7700) {
  if (Arg7700.length < 1) return [Shen.type_func, shen_user_lambda7701, 1, Arg7700];
  var Arg7700_0 = Arg7700[0];
  var R0;
  return ((R0 = Shen.call(Shen.fns["limit"], [Arg7700_0])),
  ((Shen.unwind_tail(Shen.$eq$(R0, 0)))
  ? (function() {
  return Shen.simple_error("cannot take the tail of the empty vector\x0d\x0a");})
  : ((Shen.unwind_tail(Shen.$eq$(R0, 1)))
  ? (function() {
  return Shen.vector(0);})
  : (Shen.vector((R0 - 1)),
  (function() {
  return Shen.call_tail(Shen.fns["shen.tlv-help"], [Arg7700_0, 2, R0, Shen.vector((R0 - 1))]);})))))}, 1, [], "tlv"];





Shen.fns["shen.tlv-help"] = [Shen.type_func, function shen_user_lambda7703(Arg7702) {
  if (Arg7702.length < 4) return [Shen.type_func, shen_user_lambda7703, 4, Arg7702];
  var Arg7702_0 = Arg7702[0], Arg7702_1 = Arg7702[1], Arg7702_2 = Arg7702[2], Arg7702_3 = Arg7702[3];
  return ((Shen.unwind_tail(Shen.$eq$(Arg7702_2, Arg7702_1)))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.copyfromvector"], [Arg7702_0, Arg7702_3, Arg7702_2, (Arg7702_2 - 1)]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.tlv-help"], [Arg7702_0, (Arg7702_1 + 1), Arg7702_2, Shen.call(Shen.fns["shen.copyfromvector"], [Arg7702_0, Arg7702_3, Arg7702_1, (Arg7702_1 - 1)])]);}))}, 4, [], "shen.tlv-help"];





Shen.fns["assoc"] = [Shen.type_func, function shen_user_lambda7705(Arg7704) {
  if (Arg7704.length < 2) return [Shen.type_func, shen_user_lambda7705, 2, Arg7704];
  var Arg7704_0 = Arg7704[0], Arg7704_1 = Arg7704[1];
  return ((Shen.empty$question$(Arg7704_1))
  ? []
  : (((Shen.is_type(Arg7704_1, Shen.type_cons) && (Shen.is_type(Arg7704_1[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(Arg7704_1[1][1], Arg7704_0)))))
  ? Arg7704_1[1]
  : ((Shen.is_type(Arg7704_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["assoc"], [Arg7704_0, Arg7704_1[2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "assoc"]]);}))))}, 2, [], "assoc"];





Shen.fns["boolean?"] = [Shen.type_func, function shen_user_lambda7707(Arg7706) {
  if (Arg7706.length < 1) return [Shen.type_func, shen_user_lambda7707, 1, Arg7706];
  var Arg7706_0 = Arg7706[0];
  return ((Shen.unwind_tail(Shen.$eq$(true, Arg7706_0)))
  ? true
  : ((Shen.unwind_tail(Shen.$eq$(false, Arg7706_0)))
  ? true
  : false))}, 1, [], "boolean?"];





Shen.fns["nl"] = [Shen.type_func, function shen_user_lambda7709(Arg7708) {
  if (Arg7708.length < 1) return [Shen.type_func, shen_user_lambda7709, 1, Arg7708];
  var Arg7708_0 = Arg7708[0];
  return ((Shen.unwind_tail(Shen.$eq$(0, Arg7708_0)))
  ? 0
  : (Shen.call(Shen.fns["shen.prhush"], ["\x0d\x0a", Shen.call(Shen.fns["stoutput"], [])]),
  (function() {
  return Shen.call_tail(Shen.fns["nl"], [(Arg7708_0 - 1)]);})))}, 1, [], "nl"];





Shen.fns["difference"] = [Shen.type_func, function shen_user_lambda7711(Arg7710) {
  if (Arg7710.length < 2) return [Shen.type_func, shen_user_lambda7711, 2, Arg7710];
  var Arg7710_0 = Arg7710[0], Arg7710_1 = Arg7710[1];
  return ((Shen.empty$question$(Arg7710_0))
  ? []
  : ((Shen.is_type(Arg7710_0, Shen.type_cons))
  ? ((Shen.call(Shen.fns["element?"], [Arg7710_0[1], Arg7710_1]))
  ? (function() {
  return Shen.call_tail(Shen.fns["difference"], [Arg7710_0[2], Arg7710_1]);})
  : [Shen.type_cons, Arg7710_0[1], Shen.call(Shen.fns["difference"], [Arg7710_0[2], Arg7710_1])])
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "difference"]]);})))}, 2, [], "difference"];





Shen.fns["do"] = [Shen.type_func, function shen_user_lambda7713(Arg7712) {
  if (Arg7712.length < 2) return [Shen.type_func, shen_user_lambda7713, 2, Arg7712];
  var Arg7712_0 = Arg7712[0], Arg7712_1 = Arg7712[1];
  return Arg7712_1}, 2, [], "do"];





Shen.fns["element?"] = [Shen.type_func, function shen_user_lambda7715(Arg7714) {
  if (Arg7714.length < 2) return [Shen.type_func, shen_user_lambda7715, 2, Arg7714];
  var Arg7714_0 = Arg7714[0], Arg7714_1 = Arg7714[1];
  return ((Shen.empty$question$(Arg7714_1))
  ? false
  : (((Shen.is_type(Arg7714_1, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(Arg7714_1[1], Arg7714_0))))
  ? true
  : ((Shen.is_type(Arg7714_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["element?"], [Arg7714_0, Arg7714_1[2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "element?"]]);}))))}, 2, [], "element?"];










Shen.fns["fix"] = [Shen.type_func, function shen_user_lambda7718(Arg7717) {
  if (Arg7717.length < 2) return [Shen.type_func, shen_user_lambda7718, 2, Arg7717];
  var Arg7717_0 = Arg7717[0], Arg7717_1 = Arg7717[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.fix-help"], [Arg7717_0, Arg7717_1, Shen.call(Arg7717_0, [Arg7717_1])]);})}, 2, [], "fix"];





Shen.fns["shen.fix-help"] = [Shen.type_func, function shen_user_lambda7720(Arg7719) {
  if (Arg7719.length < 3) return [Shen.type_func, shen_user_lambda7720, 3, Arg7719];
  var Arg7719_0 = Arg7719[0], Arg7719_1 = Arg7719[1], Arg7719_2 = Arg7719[2];
  return ((Shen.unwind_tail(Shen.$eq$(Arg7719_2, Arg7719_1)))
  ? Arg7719_2
  : (function() {
  return Shen.call_tail(Shen.fns["shen.fix-help"], [Arg7719_0, Arg7719_2, Shen.call(Arg7719_0, [Arg7719_2])]);}))}, 3, [], "shen.fix-help"];





Shen.fns["put"] = [Shen.type_func, function shen_user_lambda7724(Arg7721) {
  if (Arg7721.length < 4) return [Shen.type_func, shen_user_lambda7724, 4, Arg7721];
  var Arg7721_0 = Arg7721[0], Arg7721_1 = Arg7721[1], Arg7721_2 = Arg7721[2], Arg7721_3 = Arg7721[3];
  var R0, R1, R2;
  return ((R0 = Shen.call(Shen.fns["hash"], [Arg7721_0, Shen.call(Shen.fns["limit"], [Arg7721_3])])),
  ((R1 = [Shen.type_func, function shen_user_lambda7726(Arg7725) {
  if (Arg7725.length < 5) return [Shen.type_func, shen_user_lambda7726, 5, Arg7725];
  var Arg7725_0 = Arg7725[0], Arg7725_1 = Arg7725[1], Arg7725_2 = Arg7725[2], Arg7725_3 = Arg7725[3], Arg7725_4 = Arg7725[4];
  return (function() {
  return Shen.call_tail(Shen.fns["<-vector"], [Arg7725_0, Arg7725_1]);})}, 5, [Arg7721_3, R0, Arg7721_0, Arg7721_1, Arg7721_2], undefined]),
  (R2 = [Shen.type_func, function shen_user_lambda7728(Arg7727) {
  if (Arg7727.length < 1) return [Shen.type_func, shen_user_lambda7728, 1, Arg7727];
  var Arg7727_0 = Arg7727[0];
  return []}, 1, [], undefined]),
  (R1 = Shen.trap_error(R1, R2))),
  Shen.call(Shen.fns["vector->"], [Arg7721_3, R0, Shen.call(Shen.fns["shen.change-pointer-value"], [Arg7721_0, Arg7721_1, Arg7721_2, R1])]),
  Arg7721_2)}, 4, [], "put"];





Shen.fns["shen.change-pointer-value"] = [Shen.type_func, function shen_user_lambda7730(Arg7729) {
  if (Arg7729.length < 4) return [Shen.type_func, shen_user_lambda7730, 4, Arg7729];
  var Arg7729_0 = Arg7729[0], Arg7729_1 = Arg7729[1], Arg7729_2 = Arg7729[2], Arg7729_3 = Arg7729[3];
  return ((Shen.empty$question$(Arg7729_3))
  ? [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, Arg7729_0, [Shen.type_cons, Arg7729_1, []]], Arg7729_2], []]
  : (((Shen.is_type(Arg7729_3, Shen.type_cons) && (Shen.is_type(Arg7729_3[1], Shen.type_cons) && (Shen.is_type(Arg7729_3[1][1], Shen.type_cons) && (Shen.is_type(Arg7729_3[1][1][2], Shen.type_cons) && (Shen.empty$question$(Arg7729_3[1][1][2][2]) && (Shen.unwind_tail(Shen.$eq$(Arg7729_3[1][1][2][1], Arg7729_1)) && Shen.unwind_tail(Shen.$eq$(Arg7729_3[1][1][1], Arg7729_0)))))))))
  ? [Shen.type_cons, [Shen.type_cons, Arg7729_3[1][1], Arg7729_2], Arg7729_3[2]]
  : ((Shen.is_type(Arg7729_3, Shen.type_cons))
  ? [Shen.type_cons, Arg7729_3[1], Shen.call(Shen.fns["shen.change-pointer-value"], [Arg7729_0, Arg7729_1, Arg7729_2, Arg7729_3[2]])]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.change-pointer-value"]]);}))))}, 4, [], "shen.change-pointer-value"];





Shen.fns["get"] = [Shen.type_func, function shen_user_lambda7734(Arg7731) {
  if (Arg7731.length < 3) return [Shen.type_func, shen_user_lambda7734, 3, Arg7731];
  var Arg7731_0 = Arg7731[0], Arg7731_1 = Arg7731[1], Arg7731_2 = Arg7731[2];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["hash"], [Arg7731_0, Shen.call(Shen.fns["limit"], [Arg7731_2])])),
  ((R0 = [Shen.type_func, function shen_user_lambda7736(Arg7735) {
  if (Arg7735.length < 4) return [Shen.type_func, shen_user_lambda7736, 4, Arg7735];
  var Arg7735_0 = Arg7735[0], Arg7735_1 = Arg7735[1], Arg7735_2 = Arg7735[2], Arg7735_3 = Arg7735[3];
  return (function() {
  return Shen.call_tail(Shen.fns["<-vector"], [Arg7735_0, Arg7735_1]);})}, 4, [Arg7731_2, R0, Arg7731_0, Arg7731_1], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda7738(Arg7737) {
  if (Arg7737.length < 1) return [Shen.type_func, shen_user_lambda7738, 1, Arg7737];
  var Arg7737_0 = Arg7737[0];
  return (function() {
  return Shen.simple_error("pointer not found\x0d\x0a");})}, 1, [], undefined]),
  (R0 = Shen.trap_error(R0, R1))),
  (R0 = Shen.call(Shen.fns["assoc"], [[Shen.type_cons, Arg7731_0, [Shen.type_cons, Arg7731_1, []]], R0])),
  ((Shen.empty$question$(R0))
  ? (function() {
  return Shen.simple_error("value not found\x0d\x0a");})
  : R0[2]))}, 3, [], "get"];





Shen.fns["hash"] = [Shen.type_func, function shen_user_lambda7740(Arg7739) {
  if (Arg7739.length < 2) return [Shen.type_func, shen_user_lambda7740, 2, Arg7739];
  var Arg7739_0 = Arg7739[0], Arg7739_1 = Arg7739[1];
  var R0;
  return ((R0 = Shen.call(Shen.fns["shen.mod"], [Shen.call(Shen.fns["sum"], [Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7742(Arg7741) {
  if (Arg7741.length < 1) return [Shen.type_func, shen_user_lambda7742, 1, Arg7741];
  var Arg7741_0 = Arg7741[0];
  return (function() {
  return Shen.string_$gt$n(Arg7741_0);})}, 1, [], undefined], Shen.call(Shen.fns["explode"], [Arg7739_0])])]), Arg7739_1])),
  ((Shen.unwind_tail(Shen.$eq$(0, R0)))
  ? 1
  : R0))}, 2, [], "hash"];





Shen.fns["shen.mod"] = [Shen.type_func, function shen_user_lambda7744(Arg7743) {
  if (Arg7743.length < 2) return [Shen.type_func, shen_user_lambda7744, 2, Arg7743];
  var Arg7743_0 = Arg7743[0], Arg7743_1 = Arg7743[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.modh"], [Arg7743_0, Shen.call(Shen.fns["shen.multiples"], [Arg7743_0, [Shen.type_cons, Arg7743_1, []]])]);})}, 2, [], "shen.mod"];





Shen.fns["shen.multiples"] = [Shen.type_func, function shen_user_lambda7746(Arg7745) {
  if (Arg7745.length < 2) return [Shen.type_func, shen_user_lambda7746, 2, Arg7745];
  var Arg7745_0 = Arg7745[0], Arg7745_1 = Arg7745[1];
  return (((Shen.is_type(Arg7745_1, Shen.type_cons) && (Arg7745_1[1] > Arg7745_0)))
  ? Arg7745_1[2]
  : ((Shen.is_type(Arg7745_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.multiples"], [Arg7745_0, [Shen.type_cons, (2 * Arg7745_1[1]), Arg7745_1]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.multiples"]]);})))}, 2, [], "shen.multiples"];





Shen.fns["shen.modh"] = [Shen.type_func, function shen_user_lambda7748(Arg7747) {
  if (Arg7747.length < 2) return [Shen.type_func, shen_user_lambda7748, 2, Arg7747];
  var Arg7747_0 = Arg7747[0], Arg7747_1 = Arg7747[1];
  return ((Shen.unwind_tail(Shen.$eq$(0, Arg7747_0)))
  ? 0
  : ((Shen.empty$question$(Arg7747_1))
  ? Arg7747_0
  : (((Shen.is_type(Arg7747_1, Shen.type_cons) && (Arg7747_1[1] > Arg7747_0)))
  ? ((Shen.empty$question$(Arg7747_1[2]))
  ? Arg7747_0
  : (function() {
  return Shen.call_tail(Shen.fns["shen.modh"], [Arg7747_0, Arg7747_1[2]]);}))
  : ((Shen.is_type(Arg7747_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.modh"], [(Arg7747_0 - Arg7747_1[1]), Arg7747_1]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.modh"]]);})))))}, 2, [], "shen.modh"];





Shen.fns["sum"] = [Shen.type_func, function shen_user_lambda7750(Arg7749) {
  if (Arg7749.length < 1) return [Shen.type_func, shen_user_lambda7750, 1, Arg7749];
  var Arg7749_0 = Arg7749[0];
  return ((Shen.empty$question$(Arg7749_0))
  ? 0
  : ((Shen.is_type(Arg7749_0, Shen.type_cons))
  ? (Arg7749_0[1] + Shen.call(Shen.fns["sum"], [Arg7749_0[2]]))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "sum"]]);})))}, 1, [], "sum"];





Shen.fns["head"] = [Shen.type_func, function shen_user_lambda7752(Arg7751) {
  if (Arg7751.length < 1) return [Shen.type_func, shen_user_lambda7752, 1, Arg7751];
  var Arg7751_0 = Arg7751[0];
  return ((Shen.is_type(Arg7751_0, Shen.type_cons))
  ? Arg7751_0[1]
  : (function() {
  return Shen.simple_error("head expects a non-empty list");}))}, 1, [], "head"];





Shen.fns["tail"] = [Shen.type_func, function shen_user_lambda7754(Arg7753) {
  if (Arg7753.length < 1) return [Shen.type_func, shen_user_lambda7754, 1, Arg7753];
  var Arg7753_0 = Arg7753[0];
  return ((Shen.is_type(Arg7753_0, Shen.type_cons))
  ? Arg7753_0[2]
  : (function() {
  return Shen.simple_error("tail expects a non-empty list");}))}, 1, [], "tail"];





Shen.fns["hdstr"] = [Shen.type_func, function shen_user_lambda7756(Arg7755) {
  if (Arg7755.length < 1) return [Shen.type_func, shen_user_lambda7756, 1, Arg7755];
  var Arg7755_0 = Arg7755[0];
  return Arg7755_0[0]}, 1, [], "hdstr"];





Shen.fns["intersection"] = [Shen.type_func, function shen_user_lambda7758(Arg7757) {
  if (Arg7757.length < 2) return [Shen.type_func, shen_user_lambda7758, 2, Arg7757];
  var Arg7757_0 = Arg7757[0], Arg7757_1 = Arg7757[1];
  return ((Shen.empty$question$(Arg7757_0))
  ? []
  : ((Shen.is_type(Arg7757_0, Shen.type_cons))
  ? ((Shen.call(Shen.fns["element?"], [Arg7757_0[1], Arg7757_1]))
  ? [Shen.type_cons, Arg7757_0[1], Shen.call(Shen.fns["intersection"], [Arg7757_0[2], Arg7757_1])]
  : (function() {
  return Shen.call_tail(Shen.fns["intersection"], [Arg7757_0[2], Arg7757_1]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "intersection"]]);})))}, 2, [], "intersection"];





Shen.fns["reverse"] = [Shen.type_func, function shen_user_lambda7760(Arg7759) {
  if (Arg7759.length < 1) return [Shen.type_func, shen_user_lambda7760, 1, Arg7759];
  var Arg7759_0 = Arg7759[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.reverse_help"], [Arg7759_0, []]);})}, 1, [], "reverse"];





Shen.fns["shen.reverse_help"] = [Shen.type_func, function shen_user_lambda7762(Arg7761) {
  if (Arg7761.length < 2) return [Shen.type_func, shen_user_lambda7762, 2, Arg7761];
  var Arg7761_0 = Arg7761[0], Arg7761_1 = Arg7761[1];
  return ((Shen.empty$question$(Arg7761_0))
  ? Arg7761_1
  : ((Shen.is_type(Arg7761_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.reverse_help"], [Arg7761_0[2], [Shen.type_cons, Arg7761_0[1], Arg7761_1]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.reverse_help"]]);})))}, 2, [], "shen.reverse_help"];





Shen.fns["union"] = [Shen.type_func, function shen_user_lambda7764(Arg7763) {
  if (Arg7763.length < 2) return [Shen.type_func, shen_user_lambda7764, 2, Arg7763];
  var Arg7763_0 = Arg7763[0], Arg7763_1 = Arg7763[1];
  return ((Shen.empty$question$(Arg7763_0))
  ? Arg7763_1
  : ((Shen.is_type(Arg7763_0, Shen.type_cons))
  ? ((Shen.call(Shen.fns["element?"], [Arg7763_0[1], Arg7763_1]))
  ? (function() {
  return Shen.call_tail(Shen.fns["union"], [Arg7763_0[2], Arg7763_1]);})
  : [Shen.type_cons, Arg7763_0[1], Shen.call(Shen.fns["union"], [Arg7763_0[2], Arg7763_1])])
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "union"]]);})))}, 2, [], "union"];





Shen.fns["y-or-n?"] = [Shen.type_func, function shen_user_lambda7766(Arg7765) {
  if (Arg7765.length < 1) return [Shen.type_func, shen_user_lambda7766, 1, Arg7765];
  var Arg7765_0 = Arg7765[0];
  var R0;
  return (Shen.call(Shen.fns["shen.prhush"], [Shen.call(Shen.fns["shen.proc-nl"], [Arg7765_0]), Shen.call(Shen.fns["stoutput"], [])]),
  Shen.call(Shen.fns["shen.prhush"], [" (y/n) ", Shen.call(Shen.fns["stoutput"], [])]),
  (R0 = Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["read"], [Shen.call(Shen.fns["stinput"], [])]), "", [Shen.type_symbol, "shen.s"]])),
  ((Shen.unwind_tail(Shen.$eq$("y", R0)))
  ? true
  : ((Shen.unwind_tail(Shen.$eq$("n", R0)))
  ? false
  : (Shen.call(Shen.fns["shen.prhush"], ["please answer y or n\x0d\x0a", Shen.call(Shen.fns["stoutput"], [])]),
  (function() {
  return Shen.call_tail(Shen.fns["y-or-n?"], [Arg7765_0]);})))))}, 1, [], "y-or-n?"];










Shen.fns["subst"] = [Shen.type_func, function shen_user_lambda7769(Arg7768) {
  if (Arg7768.length < 3) return [Shen.type_func, shen_user_lambda7769, 3, Arg7768];
  var Arg7768_0 = Arg7768[0], Arg7768_1 = Arg7768[1], Arg7768_2 = Arg7768[2];
  return ((Shen.unwind_tail(Shen.$eq$(Arg7768_2, Arg7768_1)))
  ? Arg7768_0
  : ((Shen.is_type(Arg7768_2, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7771(Arg7770) {
  if (Arg7770.length < 3) return [Shen.type_func, shen_user_lambda7771, 3, Arg7770];
  var Arg7770_0 = Arg7770[0], Arg7770_1 = Arg7770[1], Arg7770_2 = Arg7770[2];
  return (function() {
  return Shen.call_tail(Shen.fns["subst"], [Arg7770_0, Arg7770_1, Arg7770_2]);})}, 3, [Arg7768_0, Arg7768_1], undefined], Arg7768_2]);})
  : Arg7768_2))}, 3, [], "subst"];





Shen.fns["explode"] = [Shen.type_func, function shen_user_lambda7773(Arg7772) {
  if (Arg7772.length < 1) return [Shen.type_func, shen_user_lambda7773, 1, Arg7772];
  var Arg7772_0 = Arg7772[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.explode-h"], [Shen.call(Shen.fns["shen.app"], [Arg7772_0, "", [Shen.type_symbol, "shen.a"]])]);})}, 1, [], "explode"];





Shen.fns["shen.explode-h"] = [Shen.type_func, function shen_user_lambda7775(Arg7774) {
  if (Arg7774.length < 1) return [Shen.type_func, shen_user_lambda7775, 1, Arg7774];
  var Arg7774_0 = Arg7774[0];
  return ((Shen.unwind_tail(Shen.$eq$("", Arg7774_0)))
  ? []
  : ((Shen.call(Shen.fns["shen.+string?"], [Arg7774_0]))
  ? [Shen.type_cons, Arg7774_0[0], Shen.call(Shen.fns["shen.explode-h"], [Shen.tlstr(Arg7774_0)])]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.explode-h"]]);})))}, 1, [], "shen.explode-h"];





Shen.fns["cd"] = [Shen.type_func, function shen_user_lambda7777(Arg7776) {
  if (Arg7776.length < 1) return [Shen.type_func, shen_user_lambda7777, 1, Arg7776];
  var Arg7776_0 = Arg7776[0];
  return (Shen.globals["*home-directory*"] = ((Shen.unwind_tail(Shen.$eq$(Arg7776_0, "")))
  ? ""
  : Shen.call(Shen.fns["shen.app"], [Arg7776_0, "/", [Shen.type_symbol, "shen.a"]])))}, 1, [], "cd"];





Shen.fns["map"] = [Shen.type_func, function shen_user_lambda7779(Arg7778) {
  if (Arg7778.length < 2) return [Shen.type_func, shen_user_lambda7779, 2, Arg7778];
  var Arg7778_0 = Arg7778[0], Arg7778_1 = Arg7778[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.map-h"], [Arg7778_0, Arg7778_1, []]);})}, 2, [], "map"];





Shen.fns["shen.map-h"] = [Shen.type_func, function shen_user_lambda7781(Arg7780) {
  if (Arg7780.length < 3) return [Shen.type_func, shen_user_lambda7781, 3, Arg7780];
  var Arg7780_0 = Arg7780[0], Arg7780_1 = Arg7780[1], Arg7780_2 = Arg7780[2];
  return ((Shen.empty$question$(Arg7780_1))
  ? (function() {
  return Shen.call_tail(Shen.fns["reverse"], [Arg7780_2]);})
  : ((Shen.is_type(Arg7780_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.map-h"], [Arg7780_0, Arg7780_1[2], [Shen.type_cons, Shen.call(Arg7780_0, [Arg7780_1[1]]), Arg7780_2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.map-h"]]);})))}, 3, [], "shen.map-h"];





Shen.fns["length"] = [Shen.type_func, function shen_user_lambda7783(Arg7782) {
  if (Arg7782.length < 1) return [Shen.type_func, shen_user_lambda7783, 1, Arg7782];
  var Arg7782_0 = Arg7782[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.length-h"], [Arg7782_0, 0]);})}, 1, [], "length"];





Shen.fns["shen.length-h"] = [Shen.type_func, function shen_user_lambda7785(Arg7784) {
  if (Arg7784.length < 2) return [Shen.type_func, shen_user_lambda7785, 2, Arg7784];
  var Arg7784_0 = Arg7784[0], Arg7784_1 = Arg7784[1];
  return ((Shen.empty$question$(Arg7784_0))
  ? Arg7784_1
  : (function() {
  return Shen.call_tail(Shen.fns["shen.length-h"], [Arg7784_0[2], (Arg7784_1 + 1)]);}))}, 2, [], "shen.length-h"];





Shen.fns["occurrences"] = [Shen.type_func, function shen_user_lambda7787(Arg7786) {
  if (Arg7786.length < 2) return [Shen.type_func, shen_user_lambda7787, 2, Arg7786];
  var Arg7786_0 = Arg7786[0], Arg7786_1 = Arg7786[1];
  return ((Shen.unwind_tail(Shen.$eq$(Arg7786_1, Arg7786_0)))
  ? 1
  : ((Shen.is_type(Arg7786_1, Shen.type_cons))
  ? (Shen.call(Shen.fns["occurrences"], [Arg7786_0, Arg7786_1[1]]) + Shen.call(Shen.fns["occurrences"], [Arg7786_0, Arg7786_1[2]]))
  : 0))}, 2, [], "occurrences"];





Shen.fns["nth"] = [Shen.type_func, function shen_user_lambda7789(Arg7788) {
  if (Arg7788.length < 2) return [Shen.type_func, shen_user_lambda7789, 2, Arg7788];
  var Arg7788_0 = Arg7788[0], Arg7788_1 = Arg7788[1];
  return (((Shen.unwind_tail(Shen.$eq$(1, Arg7788_0)) && Shen.is_type(Arg7788_1, Shen.type_cons)))
  ? Arg7788_1[1]
  : ((Shen.is_type(Arg7788_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["nth"], [(Arg7788_0 - 1), Arg7788_1[2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "nth"]]);})))}, 2, [], "nth"];





Shen.fns["integer?"] = [Shen.type_func, function shen_user_lambda7791(Arg7790) {
  if (Arg7790.length < 1) return [Shen.type_func, shen_user_lambda7791, 1, Arg7790];
  var Arg7790_0 = Arg7790[0];
  var R0;
  return ((typeof(Arg7790_0) == 'number') && ((R0 = Shen.call(Shen.fns["shen.abs"], [Arg7790_0])),
  Shen.call(Shen.fns["shen.integer-test?"], [R0, Shen.call(Shen.fns["shen.magless"], [R0, 1])])))}, 1, [], "integer?"];





Shen.fns["shen.abs"] = [Shen.type_func, function shen_user_lambda7793(Arg7792) {
  if (Arg7792.length < 1) return [Shen.type_func, shen_user_lambda7793, 1, Arg7792];
  var Arg7792_0 = Arg7792[0];
  return (((Arg7792_0 > 0))
  ? Arg7792_0
  : (0 - Arg7792_0))}, 1, [], "shen.abs"];





Shen.fns["shen.magless"] = [Shen.type_func, function shen_user_lambda7795(Arg7794) {
  if (Arg7794.length < 2) return [Shen.type_func, shen_user_lambda7795, 2, Arg7794];
  var Arg7794_0 = Arg7794[0], Arg7794_1 = Arg7794[1];
  var R0;
  return ((R0 = (Arg7794_1 * 2)),
  (((R0 > Arg7794_0))
  ? Arg7794_1
  : (function() {
  return Shen.call_tail(Shen.fns["shen.magless"], [Arg7794_0, R0]);})))}, 2, [], "shen.magless"];





Shen.fns["shen.integer-test?"] = [Shen.type_func, function shen_user_lambda7797(Arg7796) {
  if (Arg7796.length < 2) return [Shen.type_func, shen_user_lambda7797, 2, Arg7796];
  var Arg7796_0 = Arg7796[0], Arg7796_1 = Arg7796[1];
  var R0;
  return ((Shen.unwind_tail(Shen.$eq$(0, Arg7796_0)))
  ? true
  : (((1 > Arg7796_0))
  ? false
  : ((R0 = (Arg7796_0 - Arg7796_1)),
  (((0 > R0))
  ? (function() {
  return Shen.call_tail(Shen.fns["integer?"], [Arg7796_0]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.integer-test?"], [R0, Arg7796_1]);})))))}, 2, [], "shen.integer-test?"];





Shen.fns["mapcan"] = [Shen.type_func, function shen_user_lambda7799(Arg7798) {
  if (Arg7798.length < 2) return [Shen.type_func, shen_user_lambda7799, 2, Arg7798];
  var Arg7798_0 = Arg7798[0], Arg7798_1 = Arg7798[1];
  return ((Shen.empty$question$(Arg7798_1))
  ? []
  : ((Shen.is_type(Arg7798_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["append"], [Shen.call(Arg7798_0, [Arg7798_1[1]]), Shen.call(Shen.fns["mapcan"], [Arg7798_0, Arg7798_1[2]])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "mapcan"]]);})))}, 2, [], "mapcan"];





Shen.fns["=="] = [Shen.type_func, function shen_user_lambda7801(Arg7800) {
  if (Arg7800.length < 2) return [Shen.type_func, shen_user_lambda7801, 2, Arg7800];
  var Arg7800_0 = Arg7800[0], Arg7800_1 = Arg7800[1];
  return ((Shen.unwind_tail(Shen.$eq$(Arg7800_1, Arg7800_0)))
  ? true
  : false)}, 2, [], "=="];





Shen.fns["abort"] = [Shen.type_func, function shen_user_lambda7803(Arg7802) {
  if (Arg7802.length < 0) return [Shen.type_func, shen_user_lambda7803, 0, Arg7802];
  return (function() {
  return Shen.simple_error("");})}, 0, [], "abort"];





Shen.fns["bound?"] = [Shen.type_func, function shen_user_lambda7807(Arg7804) {
  if (Arg7804.length < 1) return [Shen.type_func, shen_user_lambda7807, 1, Arg7804];
  var Arg7804_0 = Arg7804[0];
  var R0, R1;
  return (Shen.is_type(Arg7804_0, Shen.type_symbol) && (((R0 = [Shen.type_func, function shen_user_lambda7809(Arg7808) {
  if (Arg7808.length < 1) return [Shen.type_func, shen_user_lambda7809, 1, Arg7808];
  var Arg7808_0 = Arg7808[0];
  return (Shen.globals[Arg7808_0[1]])}, 1, [Arg7804_0], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda7811(Arg7810) {
  if (Arg7810.length < 1) return [Shen.type_func, shen_user_lambda7811, 1, Arg7810];
  var Arg7810_0 = Arg7810[0];
  return [Shen.type_symbol, "shen.this-symbol-is-unbound"]}, 1, [], undefined]),
  (R0 = Shen.trap_error(R0, R1))),
  ((Shen.unwind_tail(Shen.$eq$(R0, [Shen.type_symbol, "shen.this-symbol-is-unbound"])))
  ? false
  : true)))}, 1, [], "bound?"];





Shen.fns["shen.string->bytes"] = [Shen.type_func, function shen_user_lambda7813(Arg7812) {
  if (Arg7812.length < 1) return [Shen.type_func, shen_user_lambda7813, 1, Arg7812];
  var Arg7812_0 = Arg7812[0];
  return ((Shen.unwind_tail(Shen.$eq$("", Arg7812_0)))
  ? []
  : [Shen.type_cons, Shen.string_$gt$n(Arg7812_0[0]), Shen.call(Shen.fns["shen.string->bytes"], [Shen.tlstr(Arg7812_0)])])}, 1, [], "shen.string->bytes"];





Shen.fns["maxinferences"] = [Shen.type_func, function shen_user_lambda7815(Arg7814) {
  if (Arg7814.length < 1) return [Shen.type_func, shen_user_lambda7815, 1, Arg7814];
  var Arg7814_0 = Arg7814[0];
  return (Shen.globals["shen.*maxinferences*"] = Arg7814_0)}, 1, [], "maxinferences"];





Shen.fns["inferences"] = [Shen.type_func, function shen_user_lambda7817(Arg7816) {
  if (Arg7816.length < 0) return [Shen.type_func, shen_user_lambda7817, 0, Arg7816];
  return (Shen.globals["shen.*infs*"])}, 0, [], "inferences"];





Shen.fns["protect"] = [Shen.type_func, function shen_user_lambda7819(Arg7818) {
  if (Arg7818.length < 1) return [Shen.type_func, shen_user_lambda7819, 1, Arg7818];
  var Arg7818_0 = Arg7818[0];
  return Arg7818_0}, 1, [], "protect"];





Shen.fns["stoutput"] = [Shen.type_func, function shen_user_lambda7821(Arg7820) {
  if (Arg7820.length < 0) return [Shen.type_func, shen_user_lambda7821, 0, Arg7820];
  return (Shen.globals["*stoutput*"])}, 0, [], "stoutput"];





Shen.fns["string->symbol"] = [Shen.type_func, function shen_user_lambda7823(Arg7822) {
  if (Arg7822.length < 1) return [Shen.type_func, shen_user_lambda7823, 1, Arg7822];
  var Arg7822_0 = Arg7822[0];
  var R0;
  return ((R0 = Shen.intern(Arg7822_0)),
  ((Shen.is_type(R0, Shen.type_symbol))
  ? R0
  : (function() {
  return Shen.simple_error(("cannot intern " + Shen.call(Shen.fns["shen.app"], [Arg7822_0, " to a symbol", [Shen.type_symbol, "shen.s"]])));})))}, 1, [], "string->symbol"];





Shen.fns["shen.optimise"] = [Shen.type_func, function shen_user_lambda7825(Arg7824) {
  if (Arg7824.length < 1) return [Shen.type_func, shen_user_lambda7825, 1, Arg7824];
  var Arg7824_0 = Arg7824[0];
  return ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "+"], Arg7824_0)))
  ? (Shen.globals["shen.*optimise*"] = true)
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "-"], Arg7824_0)))
  ? (Shen.globals["shen.*optimise*"] = false)
  : (function() {
  return Shen.simple_error("optimise expects a + or a -.\x0d\x0a");})))}, 1, [], "shen.optimise"];





Shen.fns["os"] = [Shen.type_func, function shen_user_lambda7827(Arg7826) {
  if (Arg7826.length < 0) return [Shen.type_func, shen_user_lambda7827, 0, Arg7826];
  return (Shen.globals["*os*"])}, 0, [], "os"];





Shen.fns["language"] = [Shen.type_func, function shen_user_lambda7829(Arg7828) {
  if (Arg7828.length < 0) return [Shen.type_func, shen_user_lambda7829, 0, Arg7828];
  return (Shen.globals["*language*"])}, 0, [], "language"];





Shen.fns["version"] = [Shen.type_func, function shen_user_lambda7831(Arg7830) {
  if (Arg7830.length < 0) return [Shen.type_func, shen_user_lambda7831, 0, Arg7830];
  return (Shen.globals["*version*"])}, 0, [], "version"];





Shen.fns["port"] = [Shen.type_func, function shen_user_lambda7833(Arg7832) {
  if (Arg7832.length < 0) return [Shen.type_func, shen_user_lambda7833, 0, Arg7832];
  return (Shen.globals["*port*"])}, 0, [], "port"];





Shen.fns["porters"] = [Shen.type_func, function shen_user_lambda7835(Arg7834) {
  if (Arg7834.length < 0) return [Shen.type_func, shen_user_lambda7835, 0, Arg7834];
  return (Shen.globals["*porters*"])}, 0, [], "porters"];





Shen.fns["implementation"] = [Shen.type_func, function shen_user_lambda7837(Arg7836) {
  if (Arg7836.length < 0) return [Shen.type_func, shen_user_lambda7837, 0, Arg7836];
  return (Shen.globals["*implementation*"])}, 0, [], "implementation"];





Shen.fns["release"] = [Shen.type_func, function shen_user_lambda7839(Arg7838) {
  if (Arg7838.length < 0) return [Shen.type_func, shen_user_lambda7839, 0, Arg7838];
  return (Shen.globals["*release*"])}, 0, [], "release"];










Shen.fns["shen.datatype-error"] = [Shen.type_func, function shen_user_lambda7439(Arg7438) {
  if (Arg7438.length < 1) return [Shen.type_func, shen_user_lambda7439, 1, Arg7438];
  var Arg7438_0 = Arg7438[0];
  return (((Shen.is_type(Arg7438_0, Shen.type_cons) && (Shen.is_type(Arg7438_0[2], Shen.type_cons) && Shen.empty$question$(Arg7438_0[2][2]))))
  ? (function() {
  return Shen.simple_error(("datatype syntax error here:\x0d\x0a\x0d\x0a " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["shen.next-50"], [50, Arg7438_0[1]]), "\x0d\x0a", [Shen.type_symbol, "shen.a"]])));})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.datatype-error"]]);}))}, 1, [], "shen.datatype-error"];





Shen.fns["shen.<datatype-rules>"] = [Shen.type_func, function shen_user_lambda7441(Arg7440) {
  if (Arg7440.length < 1) return [Shen.type_func, shen_user_lambda7441, 1, Arg7440];
  var Arg7440_0 = Arg7440[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<datatype-rule>"], [Arg7440_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<datatype-rules>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), Shen.call(Shen.fns["shen.hdtl"], [R1])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["<e>"], [Arg7440_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], []]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<datatype-rules>"];





Shen.fns["shen.<datatype-rule>"] = [Shen.type_func, function shen_user_lambda7443(Arg7442) {
  if (Arg7442.length < 1) return [Shen.type_func, shen_user_lambda7443, 1, Arg7442];
  var Arg7442_0 = Arg7442[0];
  var R0, R1, R2;
  return (((R0 = Shen.call(Shen.fns["shen.<side-conditions>"], [Arg7442_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<premises>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? ((R2 = Shen.call(Shen.fns["shen.<singleunderline>"], [R1])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R2))))
  ? ((R2 = Shen.call(Shen.fns["shen.<conclusion>"], [R2])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R2))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R2[1], Shen.call(Shen.fns["shen.sequent"], [[Shen.type_symbol, "shen.single"], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R1]), [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R2]), []]]]])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<side-conditions>"], [Arg7442_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<premises>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? ((R2 = Shen.call(Shen.fns["shen.<doubleunderline>"], [R1])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R2))))
  ? ((R2 = Shen.call(Shen.fns["shen.<conclusion>"], [R2])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R2))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R2[1], Shen.call(Shen.fns["shen.sequent"], [[Shen.type_symbol, "shen.double"], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R1]), [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R2]), []]]]])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<datatype-rule>"];





Shen.fns["shen.<side-conditions>"] = [Shen.type_func, function shen_user_lambda7445(Arg7444) {
  if (Arg7444.length < 1) return [Shen.type_func, shen_user_lambda7445, 1, Arg7444];
  var Arg7444_0 = Arg7444[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<side-condition>"], [Arg7444_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<side-conditions>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), Shen.call(Shen.fns["shen.hdtl"], [R1])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["<e>"], [Arg7444_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], []]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<side-conditions>"];





Shen.fns["shen.<side-condition>"] = [Shen.type_func, function shen_user_lambda7447(Arg7446) {
  if (Arg7446.length < 1) return [Shen.type_func, shen_user_lambda7447, 1, Arg7446];
  var Arg7446_0 = Arg7446[0];
  var R0, R1;
  return ((((Shen.is_type(Arg7446_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "if"], Arg7446_0[1][1]))))
  ? ((R0 = Shen.call(Shen.fns["shen.<expr>"], [Shen.call(Shen.fns["shen.pair"], [Arg7446_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7446_0])])])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), []]]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? ((((Shen.is_type(Arg7446_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "let"], Arg7446_0[1][1]))))
  ? ((R0 = Shen.call(Shen.fns["shen.<variable?>"], [Shen.call(Shen.fns["shen.pair"], [Arg7446_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7446_0])])])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<expr>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R1]), []]]]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<side-condition>"];





Shen.fns["shen.<variable?>"] = [Shen.type_func, function shen_user_lambda7449(Arg7448) {
  if (Arg7448.length < 1) return [Shen.type_func, shen_user_lambda7449, 1, Arg7448];
  var Arg7448_0 = Arg7448[0];
  var R0;
  return (((Shen.is_type(Arg7448_0[1], Shen.type_cons))
  ? ((R0 = Arg7448_0[1][1]),
  ((Shen.call(Shen.fns["variable?"], [R0]))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7448_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7448_0])])[1], R0]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<variable?>"];





Shen.fns["shen.<expr>"] = [Shen.type_func, function shen_user_lambda7451(Arg7450) {
  if (Arg7450.length < 1) return [Shen.type_func, shen_user_lambda7451, 1, Arg7450];
  var Arg7450_0 = Arg7450[0];
  var R0;
  return (((Shen.is_type(Arg7450_0[1], Shen.type_cons))
  ? ((R0 = Arg7450_0[1][1]),
  (((!(Shen.call(Shen.fns["element?"], [R0, [Shen.type_cons, [Shen.type_symbol, ">>"], [Shen.type_cons, [Shen.type_symbol, ";"], []]]]) || (Shen.call(Shen.fns["shen.singleunderline?"], [R0]) || Shen.call(Shen.fns["shen.doubleunderline?"], [R0])))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7450_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7450_0])])[1], Shen.call(Shen.fns["shen.remove-bar"], [R0])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<expr>"];





Shen.fns["shen.remove-bar"] = [Shen.type_func, function shen_user_lambda7453(Arg7452) {
  if (Arg7452.length < 1) return [Shen.type_func, shen_user_lambda7453, 1, Arg7452];
  var Arg7452_0 = Arg7452[0];
  return (((Shen.is_type(Arg7452_0, Shen.type_cons) && (Shen.is_type(Arg7452_0[2], Shen.type_cons) && (Shen.is_type(Arg7452_0[2][2], Shen.type_cons) && (Shen.empty$question$(Arg7452_0[2][2][2]) && Shen.unwind_tail(Shen.$eq$(Arg7452_0[2][1], [Shen.type_symbol, "bar!"])))))))
  ? [Shen.type_cons, Arg7452_0[1], Arg7452_0[2][2][1]]
  : ((Shen.is_type(Arg7452_0, Shen.type_cons))
  ? [Shen.type_cons, Shen.call(Shen.fns["shen.remove-bar"], [Arg7452_0[1]]), Shen.call(Shen.fns["shen.remove-bar"], [Arg7452_0[2]])]
  : Arg7452_0))}, 1, [], "shen.remove-bar"];





Shen.fns["shen.<premises>"] = [Shen.type_func, function shen_user_lambda7455(Arg7454) {
  if (Arg7454.length < 1) return [Shen.type_func, shen_user_lambda7455, 1, Arg7454];
  var Arg7454_0 = Arg7454[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<premise>"], [Arg7454_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<semicolon-symbol>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? ((R1 = Shen.call(Shen.fns["shen.<premises>"], [R1])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), Shen.call(Shen.fns["shen.hdtl"], [R1])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["<e>"], [Arg7454_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], []]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<premises>"];





Shen.fns["shen.<semicolon-symbol>"] = [Shen.type_func, function shen_user_lambda7457(Arg7456) {
  if (Arg7456.length < 1) return [Shen.type_func, shen_user_lambda7457, 1, Arg7456];
  var Arg7456_0 = Arg7456[0];
  var R0;
  return (((Shen.is_type(Arg7456_0[1], Shen.type_cons))
  ? ((R0 = Arg7456_0[1][1]),
  ((Shen.unwind_tail(Shen.$eq$(R0, [Shen.type_symbol, ";"])))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7456_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7456_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<semicolon-symbol>"];





Shen.fns["shen.<premise>"] = [Shen.type_func, function shen_user_lambda7459(Arg7458) {
  if (Arg7458.length < 1) return [Shen.type_func, shen_user_lambda7459, 1, Arg7458];
  var Arg7458_0 = Arg7458[0];
  var R0, R1;
  return ((((Shen.is_type(Arg7458_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "!"], Arg7458_0[1][1]))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7458_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7458_0])])[1], [Shen.type_symbol, "!"]]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<formulae>"], [Arg7458_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (((Shen.is_type(R0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ">>"], R0[1][1]))))
  ? ((R1 = Shen.call(Shen.fns["shen.<formula>"], [Shen.call(Shen.fns["shen.pair"], [R0[1][2], Shen.call(Shen.fns["shen.hdtl"], [R0])])])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], Shen.call(Shen.fns["shen.sequent"], [Shen.call(Shen.fns["shen.hdtl"], [R0]), Shen.call(Shen.fns["shen.hdtl"], [R1])])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<formula>"], [Arg7458_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["shen.sequent"], [[], Shen.call(Shen.fns["shen.hdtl"], [R0])])]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))
  : R0))}, 1, [], "shen.<premise>"];





Shen.fns["shen.<conclusion>"] = [Shen.type_func, function shen_user_lambda7461(Arg7460) {
  if (Arg7460.length < 1) return [Shen.type_func, shen_user_lambda7461, 1, Arg7460];
  var Arg7460_0 = Arg7460[0];
  var R0, R1, R2;
  return (((R0 = Shen.call(Shen.fns["shen.<formulae>"], [Arg7460_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (((Shen.is_type(R0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ">>"], R0[1][1]))))
  ? ((R1 = Shen.call(Shen.fns["shen.<formula>"], [Shen.call(Shen.fns["shen.pair"], [R0[1][2], Shen.call(Shen.fns["shen.hdtl"], [R0])])])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? ((R2 = Shen.call(Shen.fns["shen.<semicolon-symbol>"], [R1])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R2))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R2[1], Shen.call(Shen.fns["shen.sequent"], [Shen.call(Shen.fns["shen.hdtl"], [R0]), Shen.call(Shen.fns["shen.hdtl"], [R1])])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<formula>"], [Arg7460_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<semicolon-symbol>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], Shen.call(Shen.fns["shen.sequent"], [[], Shen.call(Shen.fns["shen.hdtl"], [R0])])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<conclusion>"];





Shen.fns["shen.sequent"] = [Shen.type_func, function shen_user_lambda7463(Arg7462) {
  if (Arg7462.length < 2) return [Shen.type_func, shen_user_lambda7463, 2, Arg7462];
  var Arg7462_0 = Arg7462[0], Arg7462_1 = Arg7462[1];
  return [Shen.fns['shen.tuple'], Arg7462_0, Arg7462_1]}, 2, [], "shen.sequent"];





Shen.fns["shen.<formulae>"] = [Shen.type_func, function shen_user_lambda7465(Arg7464) {
  if (Arg7464.length < 1) return [Shen.type_func, shen_user_lambda7465, 1, Arg7464];
  var Arg7464_0 = Arg7464[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<formula>"], [Arg7464_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<comma-symbol>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? ((R1 = Shen.call(Shen.fns["shen.<formulae>"], [R1])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), Shen.call(Shen.fns["shen.hdtl"], [R1])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<formula>"], [Arg7464_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), []]]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["<e>"], [Arg7464_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], []]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))
  : R0))}, 1, [], "shen.<formulae>"];





Shen.fns["shen.<comma-symbol>"] = [Shen.type_func, function shen_user_lambda7467(Arg7466) {
  if (Arg7466.length < 1) return [Shen.type_func, shen_user_lambda7467, 1, Arg7466];
  var Arg7466_0 = Arg7466[0];
  var R0;
  return (((Shen.is_type(Arg7466_0[1], Shen.type_cons))
  ? ((R0 = Arg7466_0[1][1]),
  ((Shen.unwind_tail(Shen.$eq$(R0, [Shen.type_symbol, ","])))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7466_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7466_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<comma-symbol>"];





Shen.fns["shen.<formula>"] = [Shen.type_func, function shen_user_lambda7469(Arg7468) {
  if (Arg7468.length < 1) return [Shen.type_func, shen_user_lambda7469, 1, Arg7468];
  var Arg7468_0 = Arg7468[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<expr>"], [Arg7468_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (((Shen.is_type(R0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":"], R0[1][1]))))
  ? ((R1 = Shen.call(Shen.fns["shen.<type>"], [Shen.call(Shen.fns["shen.pair"], [R0[1][2], Shen.call(Shen.fns["shen.hdtl"], [R0])])])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], [Shen.type_cons, Shen.call(Shen.fns["shen.curry"], [Shen.call(Shen.fns["shen.hdtl"], [R0])]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.demodulate"], [Shen.call(Shen.fns["shen.hdtl"], [R1])]), []]]]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<expr>"], [Arg7468_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["shen.hdtl"], [R0])]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<formula>"];





Shen.fns["shen.<type>"] = [Shen.type_func, function shen_user_lambda7471(Arg7470) {
  if (Arg7470.length < 1) return [Shen.type_func, shen_user_lambda7471, 1, Arg7470];
  var Arg7470_0 = Arg7470[0];
  var R0;
  return (((R0 = Shen.call(Shen.fns["shen.<expr>"], [Arg7470_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["shen.curry-type"], [Shen.call(Shen.fns["shen.hdtl"], [R0])])]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<type>"];





Shen.fns["shen.<doubleunderline>"] = [Shen.type_func, function shen_user_lambda7473(Arg7472) {
  if (Arg7472.length < 1) return [Shen.type_func, shen_user_lambda7473, 1, Arg7472];
  var Arg7472_0 = Arg7472[0];
  var R0;
  return (((Shen.is_type(Arg7472_0[1], Shen.type_cons))
  ? ((R0 = Arg7472_0[1][1]),
  ((Shen.call(Shen.fns["shen.doubleunderline?"], [R0]))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7472_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7472_0])])[1], R0]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<doubleunderline>"];





Shen.fns["shen.<singleunderline>"] = [Shen.type_func, function shen_user_lambda7475(Arg7474) {
  if (Arg7474.length < 1) return [Shen.type_func, shen_user_lambda7475, 1, Arg7474];
  var Arg7474_0 = Arg7474[0];
  var R0;
  return (((Shen.is_type(Arg7474_0[1], Shen.type_cons))
  ? ((R0 = Arg7474_0[1][1]),
  ((Shen.call(Shen.fns["shen.singleunderline?"], [R0]))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7474_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7474_0])])[1], R0]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<singleunderline>"];





Shen.fns["shen.singleunderline?"] = [Shen.type_func, function shen_user_lambda7477(Arg7476) {
  if (Arg7476.length < 1) return [Shen.type_func, shen_user_lambda7477, 1, Arg7476];
  var Arg7476_0 = Arg7476[0];
  return (Shen.is_type(Arg7476_0, Shen.type_symbol) && Shen.call(Shen.fns["shen.sh?"], [Shen.str(Arg7476_0)]))}, 1, [], "shen.singleunderline?"];





Shen.fns["shen.sh?"] = [Shen.type_func, function shen_user_lambda7479(Arg7478) {
  if (Arg7478.length < 1) return [Shen.type_func, shen_user_lambda7479, 1, Arg7478];
  var Arg7478_0 = Arg7478[0];
  return ((Shen.unwind_tail(Shen.$eq$("_", Arg7478_0)))
  ? true
  : (Shen.unwind_tail(Shen.$eq$(Arg7478_0[0], "_")) && Shen.call(Shen.fns["shen.sh?"], [Shen.tlstr(Arg7478_0)])))}, 1, [], "shen.sh?"];





Shen.fns["shen.doubleunderline?"] = [Shen.type_func, function shen_user_lambda7481(Arg7480) {
  if (Arg7480.length < 1) return [Shen.type_func, shen_user_lambda7481, 1, Arg7480];
  var Arg7480_0 = Arg7480[0];
  return (Shen.is_type(Arg7480_0, Shen.type_symbol) && Shen.call(Shen.fns["shen.dh?"], [Shen.str(Arg7480_0)]))}, 1, [], "shen.doubleunderline?"];





Shen.fns["shen.dh?"] = [Shen.type_func, function shen_user_lambda7483(Arg7482) {
  if (Arg7482.length < 1) return [Shen.type_func, shen_user_lambda7483, 1, Arg7482];
  var Arg7482_0 = Arg7482[0];
  return ((Shen.unwind_tail(Shen.$eq$("=", Arg7482_0)))
  ? true
  : (Shen.unwind_tail(Shen.$eq$(Arg7482_0[0], "=")) && Shen.call(Shen.fns["shen.dh?"], [Shen.tlstr(Arg7482_0)])))}, 1, [], "shen.dh?"];





Shen.fns["shen.process-datatype"] = [Shen.type_func, function shen_user_lambda7485(Arg7484) {
  if (Arg7484.length < 2) return [Shen.type_func, shen_user_lambda7485, 2, Arg7484];
  var Arg7484_0 = Arg7484[0], Arg7484_1 = Arg7484[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.remember-datatype"], [Shen.call(Shen.fns["shen.s-prolog"], [Shen.call(Shen.fns["shen.rules->horn-clauses"], [Arg7484_0, Arg7484_1])])]);})}, 2, [], "shen.process-datatype"];





Shen.fns["shen.remember-datatype"] = [Shen.type_func, function shen_user_lambda7487(Arg7486) {
  if (Arg7486.length < 1) return [Shen.type_func, shen_user_lambda7487, 1, Arg7486];
  var Arg7486_0 = Arg7486[0];
  return ((Shen.is_type(Arg7486_0, Shen.type_cons))
  ? ((Shen.globals["shen.*datatypes*"] = Shen.call(Shen.fns["adjoin"], [Arg7486_0[1], (Shen.globals["shen.*datatypes*"])])),
  (Shen.globals["shen.*alldatatypes*"] = Shen.call(Shen.fns["adjoin"], [Arg7486_0[1], (Shen.globals["shen.*alldatatypes*"])])),
  Arg7486_0[1])
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.remember-datatype"]]);}))}, 1, [], "shen.remember-datatype"];





Shen.fns["shen.rules->horn-clauses"] = [Shen.type_func, function shen_user_lambda7489(Arg7488) {
  if (Arg7488.length < 2) return [Shen.type_func, shen_user_lambda7489, 2, Arg7488];
  var Arg7488_0 = Arg7488[0], Arg7488_1 = Arg7488[1];
  return ((Shen.empty$question$(Arg7488_1))
  ? []
  : (((Shen.is_type(Arg7488_1, Shen.type_cons) && (Shen.is_type(Arg7488_1[1], Shen.fns['shen.tuple']) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.single"], Shen.call(Shen.fns["fst"], [Arg7488_1[1]]))))))
  ? [Shen.type_cons, Shen.call(Shen.fns["shen.rule->horn-clause"], [Arg7488_0, Shen.call(Shen.fns["snd"], [Arg7488_1[1]])]), Shen.call(Shen.fns["shen.rules->horn-clauses"], [Arg7488_0, Arg7488_1[2]])]
  : (((Shen.is_type(Arg7488_1, Shen.type_cons) && (Shen.is_type(Arg7488_1[1], Shen.fns['shen.tuple']) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.double"], Shen.call(Shen.fns["fst"], [Arg7488_1[1]]))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.rules->horn-clauses"], [Arg7488_0, Shen.call(Shen.fns["append"], [Shen.call(Shen.fns["shen.double->singles"], [Shen.call(Shen.fns["snd"], [Arg7488_1[1]])]), Arg7488_1[2]])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.rules->horn-clauses"]]);}))))}, 2, [], "shen.rules->horn-clauses"];





Shen.fns["shen.double->singles"] = [Shen.type_func, function shen_user_lambda7491(Arg7490) {
  if (Arg7490.length < 1) return [Shen.type_func, shen_user_lambda7491, 1, Arg7490];
  var Arg7490_0 = Arg7490[0];
  return [Shen.type_cons, Shen.call(Shen.fns["shen.right-rule"], [Arg7490_0]), [Shen.type_cons, Shen.call(Shen.fns["shen.left-rule"], [Arg7490_0]), []]]}, 1, [], "shen.double->singles"];





Shen.fns["shen.right-rule"] = [Shen.type_func, function shen_user_lambda7493(Arg7492) {
  if (Arg7492.length < 1) return [Shen.type_func, shen_user_lambda7493, 1, Arg7492];
  var Arg7492_0 = Arg7492[0];
  return [Shen.fns['shen.tuple'], [Shen.type_symbol, "shen.single"], Arg7492_0]}, 1, [], "shen.right-rule"];





Shen.fns["shen.left-rule"] = [Shen.type_func, function shen_user_lambda7495(Arg7494) {
  if (Arg7494.length < 1) return [Shen.type_func, shen_user_lambda7495, 1, Arg7494];
  var Arg7494_0 = Arg7494[0];
  var R0, R1;
  return (((Shen.is_type(Arg7494_0, Shen.type_cons) && (Shen.is_type(Arg7494_0[2], Shen.type_cons) && (Shen.is_type(Arg7494_0[2][2], Shen.type_cons) && (Shen.is_type(Arg7494_0[2][2][1], Shen.fns['shen.tuple']) && (Shen.empty$question$(Shen.call(Shen.fns["fst"], [Arg7494_0[2][2][1]])) && Shen.empty$question$(Arg7494_0[2][2][2])))))))
  ? ((R0 = Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "Qv"]])),
  (R1 = [Shen.fns['shen.tuple'], [Shen.type_cons, Shen.call(Shen.fns["snd"], [Arg7494_0[2][2][1]]), []], R0]),
  (R0 = [Shen.type_cons, [Shen.fns['shen.tuple'], Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7497(Arg7496) {
  if (Arg7496.length < 1) return [Shen.type_func, shen_user_lambda7497, 1, Arg7496];
  var Arg7496_0 = Arg7496[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.right->left"], [Arg7496_0]);})}, 1, [], undefined], Arg7494_0[2][1]]), R0], []]),
  [Shen.fns['shen.tuple'], [Shen.type_symbol, "shen.single"], [Shen.type_cons, Arg7494_0[1], [Shen.type_cons, R0, [Shen.type_cons, R1, []]]]])
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.left-rule"]]);}))}, 1, [], "shen.left-rule"];





Shen.fns["shen.right->left"] = [Shen.type_func, function shen_user_lambda7499(Arg7498) {
  if (Arg7498.length < 1) return [Shen.type_func, shen_user_lambda7499, 1, Arg7498];
  var Arg7498_0 = Arg7498[0];
  return (((Shen.is_type(Arg7498_0, Shen.fns['shen.tuple']) && Shen.empty$question$(Shen.call(Shen.fns["fst"], [Arg7498_0]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["snd"], [Arg7498_0]);})
  : (function() {
  return Shen.simple_error("syntax error with ==========\x0d\x0a");}))}, 1, [], "shen.right->left"];





Shen.fns["shen.rule->horn-clause"] = [Shen.type_func, function shen_user_lambda7501(Arg7500) {
  if (Arg7500.length < 2) return [Shen.type_func, shen_user_lambda7501, 2, Arg7500];
  var Arg7500_0 = Arg7500[0], Arg7500_1 = Arg7500[1];
  return (((Shen.is_type(Arg7500_1, Shen.type_cons) && (Shen.is_type(Arg7500_1[2], Shen.type_cons) && (Shen.is_type(Arg7500_1[2][2], Shen.type_cons) && (Shen.is_type(Arg7500_1[2][2][1], Shen.fns['shen.tuple']) && Shen.empty$question$(Arg7500_1[2][2][2]))))))
  ? [Shen.type_cons, Shen.call(Shen.fns["shen.rule->horn-clause-head"], [Arg7500_0, Shen.call(Shen.fns["snd"], [Arg7500_1[2][2][1]])]), [Shen.type_cons, [Shen.type_symbol, ":-"], [Shen.type_cons, Shen.call(Shen.fns["shen.rule->horn-clause-body"], [Arg7500_1[1], Arg7500_1[2][1], Shen.call(Shen.fns["fst"], [Arg7500_1[2][2][1]])]), []]]]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.rule->horn-clause"]]);}))}, 2, [], "shen.rule->horn-clause"];





Shen.fns["shen.rule->horn-clause-head"] = [Shen.type_func, function shen_user_lambda7503(Arg7502) {
  if (Arg7502.length < 2) return [Shen.type_func, shen_user_lambda7503, 2, Arg7502];
  var Arg7502_0 = Arg7502[0], Arg7502_1 = Arg7502[1];
  return [Shen.type_cons, Arg7502_0, [Shen.type_cons, Shen.call(Shen.fns["shen.mode-ify"], [Arg7502_1]), [Shen.type_cons, [Shen.type_symbol, "Context_1957"], []]]]}, 2, [], "shen.rule->horn-clause-head"];





Shen.fns["shen.mode-ify"] = [Shen.type_func, function shen_user_lambda7505(Arg7504) {
  if (Arg7504.length < 1) return [Shen.type_func, shen_user_lambda7505, 1, Arg7504];
  var Arg7504_0 = Arg7504[0];
  return (((Shen.is_type(Arg7504_0, Shen.type_cons) && (Shen.is_type(Arg7504_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":"], Arg7504_0[2][1])) && (Shen.is_type(Arg7504_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg7504_0[2][2][2]))))))
  ? [Shen.type_cons, [Shen.type_symbol, "mode"], [Shen.type_cons, [Shen.type_cons, Arg7504_0[1], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "mode"], [Shen.type_cons, Arg7504_0[2][2][1], [Shen.type_cons, [Shen.type_symbol, "+"], []]]], []]]], [Shen.type_cons, [Shen.type_symbol, "-"], []]]]
  : Arg7504_0)}, 1, [], "shen.mode-ify"];





Shen.fns["shen.rule->horn-clause-body"] = [Shen.type_func, function shen_user_lambda7507(Arg7506) {
  if (Arg7506.length < 3) return [Shen.type_func, shen_user_lambda7507, 3, Arg7506];
  var Arg7506_0 = Arg7506[0], Arg7506_1 = Arg7506[1], Arg7506_2 = Arg7506[2];
  var R0, R1, R2;
  return ((R0 = Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7509(Arg7508) {
  if (Arg7508.length < 1) return [Shen.type_func, shen_user_lambda7509, 1, Arg7508];
  var Arg7508_0 = Arg7508[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.extract_vars"], [Arg7508_0]);})}, 1, [], undefined], Arg7506_2])),
  (R1 = Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7511(Arg7510) {
  if (Arg7510.length < 1) return [Shen.type_func, shen_user_lambda7511, 1, Arg7510];
  var Arg7510_0 = Arg7510[0];
  return (function() {
  return Shen.call_tail(Shen.fns["gensym"], [[Shen.type_symbol, "shen.cl"]]);})}, 1, [], undefined], Arg7506_2])),
  (R2 = Shen.call(Shen.fns["shen.construct-search-literals"], [R1, R0, [Shen.type_symbol, "Context_1957"], [Shen.type_symbol, "Context1_1957"]])),
  Shen.call(Shen.fns["shen.construct-search-clauses"], [R1, Arg7506_2, R0]),
  (R1 = Shen.call(Shen.fns["shen.construct-side-literals"], [Arg7506_0])),
  (R0 = Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7513(Arg7512) {
  if (Arg7512.length < 2) return [Shen.type_func, shen_user_lambda7513, 2, Arg7512];
  var Arg7512_0 = Arg7512[0], Arg7512_1 = Arg7512[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.construct-premiss-literal"], [Arg7512_1, Shen.empty$question$(Arg7512_0)]);})}, 2, [Arg7506_2], undefined], Arg7506_1])),
  (function() {
  return Shen.call_tail(Shen.fns["append"], [R2, Shen.call(Shen.fns["append"], [R1, R0])]);}))}, 3, [], "shen.rule->horn-clause-body"];





Shen.fns["shen.construct-search-literals"] = [Shen.type_func, function shen_user_lambda7515(Arg7514) {
  if (Arg7514.length < 4) return [Shen.type_func, shen_user_lambda7515, 4, Arg7514];
  var Arg7514_0 = Arg7514[0], Arg7514_1 = Arg7514[1], Arg7514_2 = Arg7514[2], Arg7514_3 = Arg7514[3];
  return (((Shen.empty$question$(Arg7514_0) && Shen.empty$question$(Arg7514_1)))
  ? []
  : (function() {
  return Shen.call_tail(Shen.fns["shen.csl-help"], [Arg7514_0, Arg7514_1, Arg7514_2, Arg7514_3]);}))}, 4, [], "shen.construct-search-literals"];





Shen.fns["shen.csl-help"] = [Shen.type_func, function shen_user_lambda7517(Arg7516) {
  if (Arg7516.length < 4) return [Shen.type_func, shen_user_lambda7517, 4, Arg7516];
  var Arg7516_0 = Arg7516[0], Arg7516_1 = Arg7516[1], Arg7516_2 = Arg7516[2], Arg7516_3 = Arg7516[3];
  return (((Shen.empty$question$(Arg7516_0) && Shen.empty$question$(Arg7516_1)))
  ? [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "bind"], [Shen.type_cons, [Shen.type_symbol, "ContextOut_1957"], [Shen.type_cons, Arg7516_2, []]]], []]
  : (((Shen.is_type(Arg7516_0, Shen.type_cons) && Shen.is_type(Arg7516_1, Shen.type_cons)))
  ? [Shen.type_cons, [Shen.type_cons, Arg7516_0[1], [Shen.type_cons, Arg7516_2, [Shen.type_cons, Arg7516_3, Arg7516_1[1]]]], Shen.call(Shen.fns["shen.csl-help"], [Arg7516_0[2], Arg7516_1[2], Arg7516_3, Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "Context"]])])]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.csl-help"]]);})))}, 4, [], "shen.csl-help"];





Shen.fns["shen.construct-search-clauses"] = [Shen.type_func, function shen_user_lambda7519(Arg7518) {
  if (Arg7518.length < 3) return [Shen.type_func, shen_user_lambda7519, 3, Arg7518];
  var Arg7518_0 = Arg7518[0], Arg7518_1 = Arg7518[1], Arg7518_2 = Arg7518[2];
  return (((Shen.empty$question$(Arg7518_0) && (Shen.empty$question$(Arg7518_1) && Shen.empty$question$(Arg7518_2))))
  ? [Shen.type_symbol, "shen.skip"]
  : (((Shen.is_type(Arg7518_0, Shen.type_cons) && (Shen.is_type(Arg7518_1, Shen.type_cons) && Shen.is_type(Arg7518_2, Shen.type_cons))))
  ? (Shen.call(Shen.fns["shen.construct-search-clause"], [Arg7518_0[1], Arg7518_1[1], Arg7518_2[1]]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.construct-search-clauses"], [Arg7518_0[2], Arg7518_1[2], Arg7518_2[2]]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.construct-search-clauses"]]);})))}, 3, [], "shen.construct-search-clauses"];





Shen.fns["shen.construct-search-clause"] = [Shen.type_func, function shen_user_lambda7521(Arg7520) {
  if (Arg7520.length < 3) return [Shen.type_func, shen_user_lambda7521, 3, Arg7520];
  var Arg7520_0 = Arg7520[0], Arg7520_1 = Arg7520[1], Arg7520_2 = Arg7520[2];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.s-prolog"], [[Shen.type_cons, Shen.call(Shen.fns["shen.construct-base-search-clause"], [Arg7520_0, Arg7520_1, Arg7520_2]), [Shen.type_cons, Shen.call(Shen.fns["shen.construct-recursive-search-clause"], [Arg7520_0, Arg7520_1, Arg7520_2]), []]]]);})}, 3, [], "shen.construct-search-clause"];





Shen.fns["shen.construct-base-search-clause"] = [Shen.type_func, function shen_user_lambda7523(Arg7522) {
  if (Arg7522.length < 3) return [Shen.type_func, shen_user_lambda7523, 3, Arg7522];
  var Arg7522_0 = Arg7522[0], Arg7522_1 = Arg7522[1], Arg7522_2 = Arg7522[2];
  return [Shen.type_cons, [Shen.type_cons, Arg7522_0, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.mode-ify"], [Arg7522_1]), [Shen.type_symbol, "In_1957"]], [Shen.type_cons, [Shen.type_symbol, "In_1957"], Arg7522_2]]], [Shen.type_cons, [Shen.type_symbol, ":-"], [Shen.type_cons, [], []]]]}, 3, [], "shen.construct-base-search-clause"];





Shen.fns["shen.construct-recursive-search-clause"] = [Shen.type_func, function shen_user_lambda7525(Arg7524) {
  if (Arg7524.length < 3) return [Shen.type_func, shen_user_lambda7525, 3, Arg7524];
  var Arg7524_0 = Arg7524[0], Arg7524_1 = Arg7524[1], Arg7524_2 = Arg7524[2];
  return [Shen.type_cons, [Shen.type_cons, Arg7524_0, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "Assumption_1957"], [Shen.type_symbol, "Assumptions_1957"]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "Assumption_1957"], [Shen.type_symbol, "Out_1957"]], Arg7524_2]]], [Shen.type_cons, [Shen.type_symbol, ":-"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, Arg7524_0, [Shen.type_cons, [Shen.type_symbol, "Assumptions_1957"], [Shen.type_cons, [Shen.type_symbol, "Out_1957"], Arg7524_2]]], []], []]]]}, 3, [], "shen.construct-recursive-search-clause"];





Shen.fns["shen.construct-side-literals"] = [Shen.type_func, function shen_user_lambda7527(Arg7526) {
  if (Arg7526.length < 1) return [Shen.type_func, shen_user_lambda7527, 1, Arg7526];
  var Arg7526_0 = Arg7526[0];
  return ((Shen.empty$question$(Arg7526_0))
  ? []
  : (((Shen.is_type(Arg7526_0, Shen.type_cons) && (Shen.is_type(Arg7526_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "if"], Arg7526_0[1][1])) && (Shen.is_type(Arg7526_0[1][2], Shen.type_cons) && Shen.empty$question$(Arg7526_0[1][2][2]))))))
  ? [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "when"], Arg7526_0[1][2]], Shen.call(Shen.fns["shen.construct-side-literals"], [Arg7526_0[2]])]
  : (((Shen.is_type(Arg7526_0, Shen.type_cons) && (Shen.is_type(Arg7526_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "let"], Arg7526_0[1][1])) && (Shen.is_type(Arg7526_0[1][2], Shen.type_cons) && (Shen.is_type(Arg7526_0[1][2][2], Shen.type_cons) && Shen.empty$question$(Arg7526_0[1][2][2][2])))))))
  ? [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "is"], Arg7526_0[1][2]], Shen.call(Shen.fns["shen.construct-side-literals"], [Arg7526_0[2]])]
  : ((Shen.is_type(Arg7526_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.construct-side-literals"], [Arg7526_0[2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.construct-side-literals"]]);})))))}, 1, [], "shen.construct-side-literals"];





Shen.fns["shen.construct-premiss-literal"] = [Shen.type_func, function shen_user_lambda7529(Arg7528) {
  if (Arg7528.length < 2) return [Shen.type_func, shen_user_lambda7529, 2, Arg7528];
  var Arg7528_0 = Arg7528[0], Arg7528_1 = Arg7528[1];
  return ((Shen.is_type(Arg7528_0, Shen.fns['shen.tuple']))
  ? [Shen.type_cons, [Shen.type_symbol, "shen.t*"], [Shen.type_cons, Shen.call(Shen.fns["shen.recursive_cons_form"], [Shen.call(Shen.fns["snd"], [Arg7528_0])]), [Shen.type_cons, Shen.call(Shen.fns["shen.construct-context"], [Arg7528_1, Shen.call(Shen.fns["fst"], [Arg7528_0])]), []]]]
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "!"], Arg7528_0)))
  ? [Shen.type_cons, [Shen.type_symbol, "cut"], [Shen.type_cons, [Shen.type_symbol, "Throwcontrol"], []]]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.construct-premiss-literal"]]);})))}, 2, [], "shen.construct-premiss-literal"];





Shen.fns["shen.construct-context"] = [Shen.type_func, function shen_user_lambda7531(Arg7530) {
  if (Arg7530.length < 2) return [Shen.type_func, shen_user_lambda7531, 2, Arg7530];
  var Arg7530_0 = Arg7530[0], Arg7530_1 = Arg7530[1];
  return (((Shen.unwind_tail(Shen.$eq$(true, Arg7530_0)) && Shen.empty$question$(Arg7530_1)))
  ? [Shen.type_symbol, "Context_1957"]
  : (((Shen.unwind_tail(Shen.$eq$(false, Arg7530_0)) && Shen.empty$question$(Arg7530_1)))
  ? [Shen.type_symbol, "ContextOut_1957"]
  : ((Shen.is_type(Arg7530_1, Shen.type_cons))
  ? [Shen.type_cons, [Shen.type_symbol, "cons"], [Shen.type_cons, Shen.call(Shen.fns["shen.recursive_cons_form"], [Arg7530_1[1]]), [Shen.type_cons, Shen.call(Shen.fns["shen.construct-context"], [Arg7530_0, Arg7530_1[2]]), []]]]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.construct-context"]]);}))))}, 2, [], "shen.construct-context"];





Shen.fns["shen.recursive_cons_form"] = [Shen.type_func, function shen_user_lambda7533(Arg7532) {
  if (Arg7532.length < 1) return [Shen.type_func, shen_user_lambda7533, 1, Arg7532];
  var Arg7532_0 = Arg7532[0];
  return ((Shen.is_type(Arg7532_0, Shen.type_cons))
  ? [Shen.type_cons, [Shen.type_symbol, "cons"], [Shen.type_cons, Shen.call(Shen.fns["shen.recursive_cons_form"], [Arg7532_0[1]]), [Shen.type_cons, Shen.call(Shen.fns["shen.recursive_cons_form"], [Arg7532_0[2]]), []]]]
  : Arg7532_0)}, 1, [], "shen.recursive_cons_form"];





Shen.fns["preclude"] = [Shen.type_func, function shen_user_lambda7535(Arg7534) {
  if (Arg7534.length < 1) return [Shen.type_func, shen_user_lambda7535, 1, Arg7534];
  var Arg7534_0 = Arg7534[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.preclude-h"], [Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7537(Arg7536) {
  if (Arg7536.length < 1) return [Shen.type_func, shen_user_lambda7537, 1, Arg7536];
  var Arg7536_0 = Arg7536[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.intern-type"], [Arg7536_0]);})}, 1, [], undefined], Arg7534_0])]);})}, 1, [], "preclude"];





Shen.fns["shen.preclude-h"] = [Shen.type_func, function shen_user_lambda7539(Arg7538) {
  if (Arg7538.length < 1) return [Shen.type_func, shen_user_lambda7539, 1, Arg7538];
  var Arg7538_0 = Arg7538[0];
  return ((Shen.globals["shen.*datatypes*"] = Shen.call(Shen.fns["difference"], [(Shen.globals["shen.*datatypes*"]), Arg7538_0])),
  (Shen.globals["shen.*datatypes*"]))}, 1, [], "shen.preclude-h"];





Shen.fns["include"] = [Shen.type_func, function shen_user_lambda7541(Arg7540) {
  if (Arg7540.length < 1) return [Shen.type_func, shen_user_lambda7541, 1, Arg7540];
  var Arg7540_0 = Arg7540[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.include-h"], [Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7543(Arg7542) {
  if (Arg7542.length < 1) return [Shen.type_func, shen_user_lambda7543, 1, Arg7542];
  var Arg7542_0 = Arg7542[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.intern-type"], [Arg7542_0]);})}, 1, [], undefined], Arg7540_0])]);})}, 1, [], "include"];





Shen.fns["shen.include-h"] = [Shen.type_func, function shen_user_lambda7545(Arg7544) {
  if (Arg7544.length < 1) return [Shen.type_func, shen_user_lambda7545, 1, Arg7544];
  var Arg7544_0 = Arg7544[0];
  var R0;
  return ((R0 = Shen.call(Shen.fns["intersection"], [Arg7544_0, (Shen.globals["shen.*alldatatypes*"])])),
  (Shen.globals["shen.*datatypes*"] = Shen.call(Shen.fns["union"], [R0, (Shen.globals["shen.*datatypes*"])])),
  (Shen.globals["shen.*datatypes*"]))}, 1, [], "shen.include-h"];





Shen.fns["preclude-all-but"] = [Shen.type_func, function shen_user_lambda7547(Arg7546) {
  if (Arg7546.length < 1) return [Shen.type_func, shen_user_lambda7547, 1, Arg7546];
  var Arg7546_0 = Arg7546[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.preclude-h"], [Shen.call(Shen.fns["difference"], [(Shen.globals["shen.*alldatatypes*"]), Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7549(Arg7548) {
  if (Arg7548.length < 1) return [Shen.type_func, shen_user_lambda7549, 1, Arg7548];
  var Arg7548_0 = Arg7548[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.intern-type"], [Arg7548_0]);})}, 1, [], undefined], Arg7546_0])])]);})}, 1, [], "preclude-all-but"];





Shen.fns["include-all-but"] = [Shen.type_func, function shen_user_lambda7551(Arg7550) {
  if (Arg7550.length < 1) return [Shen.type_func, shen_user_lambda7551, 1, Arg7550];
  var Arg7550_0 = Arg7550[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.include-h"], [Shen.call(Shen.fns["difference"], [(Shen.globals["shen.*alldatatypes*"]), Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7553(Arg7552) {
  if (Arg7552.length < 1) return [Shen.type_func, shen_user_lambda7553, 1, Arg7552];
  var Arg7552_0 = Arg7552[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.intern-type"], [Arg7552_0]);})}, 1, [], undefined], Arg7550_0])])]);})}, 1, [], "include-all-but"];





Shen.fns["shen.synonyms-help"] = [Shen.type_func, function shen_user_lambda7555(Arg7554) {
  if (Arg7554.length < 1) return [Shen.type_func, shen_user_lambda7555, 1, Arg7554];
  var Arg7554_0 = Arg7554[0];
  var R0;
  return ((Shen.empty$question$(Arg7554_0))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.demodulation-function"], [(Shen.globals["shen.*tc*"]), Shen.call(Shen.fns["mapcan"], [[Shen.type_func, function shen_user_lambda7557(Arg7556) {
  if (Arg7556.length < 1) return [Shen.type_func, shen_user_lambda7557, 1, Arg7556];
  var Arg7556_0 = Arg7556[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.demod-rule"], [Arg7556_0]);})}, 1, [], undefined], (Shen.globals["shen.*synonyms*"])])]);})
  : (((Shen.is_type(Arg7554_0, Shen.type_cons) && Shen.is_type(Arg7554_0[2], Shen.type_cons)))
  ? ((R0 = Shen.call(Shen.fns["difference"], [Shen.call(Shen.fns["shen.extract_vars"], [Arg7554_0[2][1]]), Shen.call(Shen.fns["shen.extract_vars"], [Arg7554_0[1]])])),
  ((Shen.empty$question$(R0))
  ? (Shen.call(Shen.fns["shen.pushnew"], [[Shen.type_cons, Arg7554_0[1], [Shen.type_cons, Arg7554_0[2][1], []]], [Shen.type_symbol, "shen.*synonyms*"]]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.synonyms-help"], [Arg7554_0[2][2]]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.free_variable_warnings"], [Arg7554_0[2][1], R0]);})))
  : (function() {
  return Shen.simple_error("odd number of synonyms\x0d\x0a");})))}, 1, [], "shen.synonyms-help"];





Shen.fns["shen.pushnew"] = [Shen.type_func, function shen_user_lambda7559(Arg7558) {
  if (Arg7558.length < 2) return [Shen.type_func, shen_user_lambda7559, 2, Arg7558];
  var Arg7558_0 = Arg7558[0], Arg7558_1 = Arg7558[1];
  return ((Shen.call(Shen.fns["element?"], [Arg7558_0, (Shen.globals[Arg7558_1[1]])]))
  ? (Shen.globals[Arg7558_1[1]])
  : (Shen.globals[Arg7558_1[1]] = [Shen.type_cons, Arg7558_0, (Shen.globals[Arg7558_1[1]])]))}, 2, [], "shen.pushnew"];





Shen.fns["shen.demod-rule"] = [Shen.type_func, function shen_user_lambda7561(Arg7560) {
  if (Arg7560.length < 1) return [Shen.type_func, shen_user_lambda7561, 1, Arg7560];
  var Arg7560_0 = Arg7560[0];
  return (((Shen.is_type(Arg7560_0, Shen.type_cons) && (Shen.is_type(Arg7560_0[2], Shen.type_cons) && Shen.empty$question$(Arg7560_0[2][2]))))
  ? [Shen.type_cons, Shen.call(Shen.fns["shen.rcons_form"], [Arg7560_0[1]]), [Shen.type_cons, [Shen.type_symbol, "->"], [Shen.type_cons, Shen.call(Shen.fns["shen.rcons_form"], [Arg7560_0[2][1]]), []]]]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.demod-rule"]]);}))}, 1, [], "shen.demod-rule"];





Shen.fns["shen.demodulation-function"] = [Shen.type_func, function shen_user_lambda7563(Arg7562) {
  if (Arg7562.length < 2) return [Shen.type_func, shen_user_lambda7563, 2, Arg7562];
  var Arg7562_0 = Arg7562[0], Arg7562_1 = Arg7562[1];
  return (Shen.call(Shen.fns["tc"], [[Shen.type_symbol, "-"]]),
  Shen.call(Shen.fns["eval"], [[Shen.type_cons, [Shen.type_symbol, "define"], [Shen.type_cons, [Shen.type_symbol, "shen.demod"], Shen.call(Shen.fns["append"], [Arg7562_1, Shen.call(Shen.fns["shen.default-rule"], [])])]]]),
  ((Arg7562_0)
  ? Shen.call(Shen.fns["tc"], [[Shen.type_symbol, "+"]])
  : [Shen.type_symbol, "shen.skip"]),
  [Shen.type_symbol, "synonyms"])}, 2, [], "shen.demodulation-function"];





Shen.fns["shen.default-rule"] = [Shen.type_func, function shen_user_lambda7565(Arg7564) {
  if (Arg7564.length < 0) return [Shen.type_func, shen_user_lambda7565, 0, Arg7564];
  return [Shen.type_cons, [Shen.type_symbol, "X"], [Shen.type_cons, [Shen.type_symbol, "->"], [Shen.type_cons, [Shen.type_symbol, "X"], []]]]}, 0, [], "shen.default-rule"];










Shen.fns["shen.yacc"] = [Shen.type_func, function shen_user_lambda8492(Arg8491) {
  if (Arg8491.length < 1) return [Shen.type_func, shen_user_lambda8492, 1, Arg8491];
  var Arg8491_0 = Arg8491[0];
  return (((Shen.is_type(Arg8491_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "defcc"], Arg8491_0[1])) && (Shen.is_type(Arg8491_0[2], Shen.type_cons) && (Shen.is_type(Arg8491_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "{"], Arg8491_0[2][2][1])) && (Shen.is_type(Arg8491_0[2][2][2], Shen.type_cons) && (Shen.is_type(Arg8491_0[2][2][2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "==>"], Arg8491_0[2][2][2][2][1])) && (Shen.is_type(Arg8491_0[2][2][2][2][2], Shen.type_cons) && (Shen.is_type(Arg8491_0[2][2][2][2][2][2], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "}"], Arg8491_0[2][2][2][2][2][2][1])))))))))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.yacc"], [[Shen.type_cons, [Shen.type_symbol, "defcc"], [Shen.type_cons, Arg8491_0[2][1], Arg8491_0[2][2][2][2][2][2][2]]]]);})
  : (((Shen.is_type(Arg8491_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "defcc"], Arg8491_0[1])) && Shen.is_type(Arg8491_0[2], Shen.type_cons))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.yacc->shen"], [Arg8491_0[2][1], Arg8491_0[2][2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.yacc"]]);})))}, 1, [], "shen.yacc"];





Shen.fns["shen.yacc->shen"] = [Shen.type_func, function shen_user_lambda8494(Arg8493) {
  if (Arg8493.length < 2) return [Shen.type_func, shen_user_lambda8494, 2, Arg8493];
  var Arg8493_0 = Arg8493[0], Arg8493_1 = Arg8493[1];
  var R0;
  return ((R0 = Shen.call(Shen.fns["shen.split_cc_rules"], [true, Arg8493_1, []])),
  (R0 = Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda8496(Arg8495) {
  if (Arg8495.length < 1) return [Shen.type_func, shen_user_lambda8496, 1, Arg8495];
  var Arg8495_0 = Arg8495[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.cc_body"], [Arg8495_0]);})}, 1, [], undefined], R0])),
  (R0 = Shen.call(Shen.fns["shen.yacc_cases"], [R0])),
  [Shen.type_cons, [Shen.type_symbol, "define"], [Shen.type_cons, Arg8493_0, [Shen.type_cons, [Shen.type_symbol, "Stream"], [Shen.type_cons, [Shen.type_symbol, "->"], [Shen.type_cons, Shen.call(Shen.fns["shen.kill-code"], [R0]), []]]]]])}, 2, [], "shen.yacc->shen"];





Shen.fns["shen.kill-code"] = [Shen.type_func, function shen_user_lambda8498(Arg8497) {
  if (Arg8497.length < 1) return [Shen.type_func, shen_user_lambda8498, 1, Arg8497];
  var Arg8497_0 = Arg8497[0];
  return (((Shen.call(Shen.fns["occurrences"], [[Shen.type_symbol, "kill"], Arg8497_0]) > 0))
  ? [Shen.type_cons, [Shen.type_symbol, "trap-error"], [Shen.type_cons, Arg8497_0, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "lambda"], [Shen.type_cons, [Shen.type_symbol, "E"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.analyse-kill"], [Shen.type_cons, [Shen.type_symbol, "E"], []]], []]]], []]]]
  : Arg8497_0)}, 1, [], "shen.kill-code"];





Shen.fns["kill"] = [Shen.type_func, function shen_user_lambda8500(Arg8499) {
  if (Arg8499.length < 0) return [Shen.type_func, shen_user_lambda8500, 0, Arg8499];
  return (function() {
  return Shen.simple_error("yacc kill");})}, 0, [], "kill"];





Shen.fns["shen.analyse-kill"] = [Shen.type_func, function shen_user_lambda8502(Arg8501) {
  if (Arg8501.length < 1) return [Shen.type_func, shen_user_lambda8502, 1, Arg8501];
  var Arg8501_0 = Arg8501[0];
  var R0;
  return ((R0 = Shen.error_to_string(Arg8501_0)),
  ((Shen.unwind_tail(Shen.$eq$(R0, "yacc kill")))
  ? Shen.fail_obj
  : Arg8501_0))}, 1, [], "shen.analyse-kill"];





Shen.fns["shen.split_cc_rules"] = [Shen.type_func, function shen_user_lambda8504(Arg8503) {
  if (Arg8503.length < 3) return [Shen.type_func, shen_user_lambda8504, 3, Arg8503];
  var Arg8503_0 = Arg8503[0], Arg8503_1 = Arg8503[1], Arg8503_2 = Arg8503[2];
  return (((Shen.empty$question$(Arg8503_1) && Shen.empty$question$(Arg8503_2)))
  ? []
  : ((Shen.empty$question$(Arg8503_1))
  ? [Shen.type_cons, Shen.call(Shen.fns["shen.split_cc_rule"], [Arg8503_0, Shen.call(Shen.fns["reverse"], [Arg8503_2]), []]), []]
  : (((Shen.is_type(Arg8503_1, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ";"], Arg8503_1[1]))))
  ? [Shen.type_cons, Shen.call(Shen.fns["shen.split_cc_rule"], [Arg8503_0, Shen.call(Shen.fns["reverse"], [Arg8503_2]), []]), Shen.call(Shen.fns["shen.split_cc_rules"], [Arg8503_0, Arg8503_1[2], []])]
  : ((Shen.is_type(Arg8503_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.split_cc_rules"], [Arg8503_0, Arg8503_1[2], [Shen.type_cons, Arg8503_1[1], Arg8503_2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.split_cc_rules"]]);})))))}, 3, [], "shen.split_cc_rules"];





Shen.fns["shen.split_cc_rule"] = [Shen.type_func, function shen_user_lambda8506(Arg8505) {
  if (Arg8505.length < 3) return [Shen.type_func, shen_user_lambda8506, 3, Arg8505];
  var Arg8505_0 = Arg8505[0], Arg8505_1 = Arg8505[1], Arg8505_2 = Arg8505[2];
  return (((Shen.is_type(Arg8505_1, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":="], Arg8505_1[1])) && (Shen.is_type(Arg8505_1[2], Shen.type_cons) && Shen.empty$question$(Arg8505_1[2][2])))))
  ? [Shen.type_cons, Shen.call(Shen.fns["reverse"], [Arg8505_2]), Arg8505_1[2]]
  : (((Shen.is_type(Arg8505_1, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":="], Arg8505_1[1])) && (Shen.is_type(Arg8505_1[2], Shen.type_cons) && (Shen.is_type(Arg8505_1[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "where"], Arg8505_1[2][2][1])) && (Shen.is_type(Arg8505_1[2][2][2], Shen.type_cons) && Shen.empty$question$(Arg8505_1[2][2][2][2]))))))))
  ? [Shen.type_cons, Shen.call(Shen.fns["reverse"], [Arg8505_2]), [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "where"], [Shen.type_cons, Arg8505_1[2][2][2][1], [Shen.type_cons, Arg8505_1[2][1], []]]], []]]
  : ((Shen.empty$question$(Arg8505_1))
  ? (Shen.call(Shen.fns["shen.semantic-completion-warning"], [Arg8505_0, Arg8505_2]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.split_cc_rule"], [Arg8505_0, [Shen.type_cons, [Shen.type_symbol, ":="], [Shen.type_cons, Shen.call(Shen.fns["shen.default_semantics"], [Shen.call(Shen.fns["reverse"], [Arg8505_2])]), []]], Arg8505_2]);}))
  : ((Shen.is_type(Arg8505_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.split_cc_rule"], [Arg8505_0, Arg8505_1[2], [Shen.type_cons, Arg8505_1[1], Arg8505_2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.split_cc_rule"]]);})))))}, 3, [], "shen.split_cc_rule"];





Shen.fns["shen.semantic-completion-warning"] = [Shen.type_func, function shen_user_lambda8508(Arg8507) {
  if (Arg8507.length < 2) return [Shen.type_func, shen_user_lambda8508, 2, Arg8507];
  var Arg8507_0 = Arg8507[0], Arg8507_1 = Arg8507[1];
  return ((Shen.unwind_tail(Shen.$eq$(true, Arg8507_0)))
  ? (Shen.call(Shen.fns["shen.prhush"], ["warning: ", Shen.call(Shen.fns["stoutput"], [])]),
  Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda8510(Arg8509) {
  if (Arg8509.length < 1) return [Shen.type_func, shen_user_lambda8510, 1, Arg8509];
  var Arg8509_0 = Arg8509[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.prhush"], [Shen.call(Shen.fns["shen.app"], [Arg8509_0, " ", [Shen.type_symbol, "shen.a"]]), Shen.call(Shen.fns["stoutput"], [])]);})}, 1, [], undefined], Shen.call(Shen.fns["reverse"], [Arg8507_1])]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.prhush"], ["has no semantics.\x0d\x0a", Shen.call(Shen.fns["stoutput"], [])]);}))
  : [Shen.type_symbol, "shen.skip"])}, 2, [], "shen.semantic-completion-warning"];





Shen.fns["shen.default_semantics"] = [Shen.type_func, function shen_user_lambda8512(Arg8511) {
  if (Arg8511.length < 1) return [Shen.type_func, shen_user_lambda8512, 1, Arg8511];
  var Arg8511_0 = Arg8511[0];
  return ((Shen.empty$question$(Arg8511_0))
  ? []
  : (((Shen.is_type(Arg8511_0, Shen.type_cons) && (Shen.empty$question$(Arg8511_0[2]) && Shen.call(Shen.fns["shen.grammar_symbol?"], [Arg8511_0[1]]))))
  ? Arg8511_0[1]
  : (((Shen.is_type(Arg8511_0, Shen.type_cons) && Shen.call(Shen.fns["shen.grammar_symbol?"], [Arg8511_0[1]])))
  ? [Shen.type_cons, [Shen.type_symbol, "append"], [Shen.type_cons, Arg8511_0[1], [Shen.type_cons, Shen.call(Shen.fns["shen.default_semantics"], [Arg8511_0[2]]), []]]]
  : ((Shen.is_type(Arg8511_0, Shen.type_cons))
  ? [Shen.type_cons, [Shen.type_symbol, "cons"], [Shen.type_cons, Arg8511_0[1], [Shen.type_cons, Shen.call(Shen.fns["shen.default_semantics"], [Arg8511_0[2]]), []]]]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.default_semantics"]]);})))))}, 1, [], "shen.default_semantics"];





Shen.fns["shen.grammar_symbol?"] = [Shen.type_func, function shen_user_lambda8514(Arg8513) {
  if (Arg8513.length < 1) return [Shen.type_func, shen_user_lambda8514, 1, Arg8513];
  var Arg8513_0 = Arg8513[0];
  var R0;
  return (Shen.is_type(Arg8513_0, Shen.type_symbol) && ((R0 = Shen.call(Shen.fns["shen.strip-pathname"], [Shen.call(Shen.fns["explode"], [Arg8513_0])])),
  (Shen.unwind_tail(Shen.$eq$(R0[1], "<")) && Shen.unwind_tail(Shen.$eq$(Shen.call(Shen.fns["reverse"], [R0])[1], ">")))))}, 1, [], "shen.grammar_symbol?"];





Shen.fns["shen.yacc_cases"] = [Shen.type_func, function shen_user_lambda8516(Arg8515) {
  if (Arg8515.length < 1) return [Shen.type_func, shen_user_lambda8516, 1, Arg8515];
  var Arg8515_0 = Arg8515[0];
  var R0;
  return (((Shen.is_type(Arg8515_0, Shen.type_cons) && Shen.empty$question$(Arg8515_0[2])))
  ? Arg8515_0[1]
  : ((Shen.is_type(Arg8515_0, Shen.type_cons))
  ? ((R0 = [Shen.type_symbol, "YaccParse"]),
  [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, R0, [Shen.type_cons, Arg8515_0[1], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "="], [Shen.type_cons, R0, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "fail"], []], []]]], [Shen.type_cons, Shen.call(Shen.fns["shen.yacc_cases"], [Arg8515_0[2]]), [Shen.type_cons, R0, []]]]], []]]]])
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.yacc_cases"]]);})))}, 1, [], "shen.yacc_cases"];





Shen.fns["shen.cc_body"] = [Shen.type_func, function shen_user_lambda8518(Arg8517) {
  if (Arg8517.length < 1) return [Shen.type_func, shen_user_lambda8518, 1, Arg8517];
  var Arg8517_0 = Arg8517[0];
  return (((Shen.is_type(Arg8517_0, Shen.type_cons) && (Shen.is_type(Arg8517_0[2], Shen.type_cons) && Shen.empty$question$(Arg8517_0[2][2]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.syntax"], [Arg8517_0[1], [Shen.type_symbol, "Stream"], Arg8517_0[2][1]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.cc_body"]]);}))}, 1, [], "shen.cc_body"];





Shen.fns["shen.syntax"] = [Shen.type_func, function shen_user_lambda8520(Arg8519) {
  if (Arg8519.length < 3) return [Shen.type_func, shen_user_lambda8520, 3, Arg8519];
  var Arg8519_0 = Arg8519[0], Arg8519_1 = Arg8519[1], Arg8519_2 = Arg8519[2];
  return (((Shen.empty$question$(Arg8519_0) && (Shen.is_type(Arg8519_2, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "where"], Arg8519_2[1])) && (Shen.is_type(Arg8519_2[2], Shen.type_cons) && (Shen.is_type(Arg8519_2[2][2], Shen.type_cons) && Shen.empty$question$(Arg8519_2[2][2][2])))))))
  ? [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, Shen.call(Shen.fns["shen.semantics"], [Arg8519_2[2][1]]), [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.pair"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, Arg8519_1, []]], [Shen.type_cons, Shen.call(Shen.fns["shen.semantics"], [Arg8519_2[2][2][1]]), []]]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "fail"], []], []]]]]
  : ((Shen.empty$question$(Arg8519_0))
  ? [Shen.type_cons, [Shen.type_symbol, "shen.pair"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, Arg8519_1, []]], [Shen.type_cons, Shen.call(Shen.fns["shen.semantics"], [Arg8519_2]), []]]]
  : ((Shen.is_type(Arg8519_0, Shen.type_cons))
  ? ((Shen.call(Shen.fns["shen.grammar_symbol?"], [Arg8519_0[1]]))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.recursive_descent"], [Arg8519_0, Arg8519_1, Arg8519_2]);})
  : ((Shen.call(Shen.fns["variable?"], [Arg8519_0[1]]))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.variable-match"], [Arg8519_0, Arg8519_1, Arg8519_2]);})
  : ((Shen.call(Shen.fns["shen.jump_stream?"], [Arg8519_0[1]]))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.jump_stream"], [Arg8519_0, Arg8519_1, Arg8519_2]);})
  : ((Shen.call(Shen.fns["shen.terminal?"], [Arg8519_0[1]]))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.check_stream"], [Arg8519_0, Arg8519_1, Arg8519_2]);})
  : ((Shen.is_type(Arg8519_0[1], Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.list-stream"], [Shen.call(Shen.fns["shen.decons"], [Arg8519_0[1]]), Arg8519_0[2], Arg8519_1, Arg8519_2]);})
  : (function() {
  return Shen.simple_error(Shen.call(Shen.fns["shen.app"], [Arg8519_0[1], " is not legal syntax\x0d\x0a", [Shen.type_symbol, "shen.a"]]));}))))))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.syntax"]]);}))))}, 3, [], "shen.syntax"];





Shen.fns["shen.list-stream"] = [Shen.type_func, function shen_user_lambda8522(Arg8521) {
  if (Arg8521.length < 4) return [Shen.type_func, shen_user_lambda8522, 4, Arg8521];
  var Arg8521_0 = Arg8521[0], Arg8521_1 = Arg8521[1], Arg8521_2 = Arg8521[2], Arg8521_3 = Arg8521[3];
  var R0, R1, R2;
  return ((R0 = [Shen.type_cons, [Shen.type_symbol, "and"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "cons?"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, Arg8521_2, []]], []]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "cons?"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, Arg8521_2, []]], []]], []]], []]]]),
  (R1 = Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "shen.place"]])),
  (R2 = Shen.call(Shen.fns["shen.syntax"], [Arg8521_1, [Shen.type_cons, [Shen.type_symbol, "shen.pair"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "tl"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, Arg8521_2, []]], []]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "tl"], [Shen.type_cons, Arg8521_2, []]], []]], []]]], Arg8521_3])),
  (R2 = Shen.call(Shen.fns["shen.insert-runon"], [R2, R1, Shen.call(Shen.fns["shen.syntax"], [Arg8521_0, [Shen.type_cons, [Shen.type_symbol, "shen.pair"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, Arg8521_2, []]], []]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "tl"], [Shen.type_cons, Arg8521_2, []]], []]], []]]], R1])])),
  [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, R0, [Shen.type_cons, R2, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "fail"], []], []]]]])}, 4, [], "shen.list-stream"];





Shen.fns["shen.decons"] = [Shen.type_func, function shen_user_lambda8524(Arg8523) {
  if (Arg8523.length < 1) return [Shen.type_func, shen_user_lambda8524, 1, Arg8523];
  var Arg8523_0 = Arg8523[0];
  return (((Shen.is_type(Arg8523_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cons"], Arg8523_0[1])) && (Shen.is_type(Arg8523_0[2], Shen.type_cons) && (Shen.is_type(Arg8523_0[2][2], Shen.type_cons) && (Shen.empty$question$(Arg8523_0[2][2][1]) && Shen.empty$question$(Arg8523_0[2][2][2])))))))
  ? [Shen.type_cons, Arg8523_0[2][1], []]
  : (((Shen.is_type(Arg8523_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cons"], Arg8523_0[1])) && (Shen.is_type(Arg8523_0[2], Shen.type_cons) && (Shen.is_type(Arg8523_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg8523_0[2][2][2]))))))
  ? [Shen.type_cons, Arg8523_0[2][1], Shen.call(Shen.fns["shen.decons"], [Arg8523_0[2][2][1]])]
  : Arg8523_0))}, 1, [], "shen.decons"];





Shen.fns["shen.insert-runon"] = [Shen.type_func, function shen_user_lambda8526(Arg8525) {
  if (Arg8525.length < 3) return [Shen.type_func, shen_user_lambda8526, 3, Arg8525];
  var Arg8525_0 = Arg8525[0], Arg8525_1 = Arg8525[1], Arg8525_2 = Arg8525[2];
  return (((Shen.is_type(Arg8525_2, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.pair"], Arg8525_2[1])) && (Shen.is_type(Arg8525_2[2], Shen.type_cons) && (Shen.is_type(Arg8525_2[2][2], Shen.type_cons) && (Shen.empty$question$(Arg8525_2[2][2][2]) && Shen.unwind_tail(Shen.$eq$(Arg8525_2[2][2][1], Arg8525_1))))))))
  ? Arg8525_0
  : ((Shen.is_type(Arg8525_2, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda8528(Arg8527) {
  if (Arg8527.length < 3) return [Shen.type_func, shen_user_lambda8528, 3, Arg8527];
  var Arg8527_0 = Arg8527[0], Arg8527_1 = Arg8527[1], Arg8527_2 = Arg8527[2];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.insert-runon"], [Arg8527_0, Arg8527_1, Arg8527_2]);})}, 3, [Arg8525_0, Arg8525_1], undefined], Arg8525_2]);})
  : Arg8525_2))}, 3, [], "shen.insert-runon"];





Shen.fns["shen.strip-pathname"] = [Shen.type_func, function shen_user_lambda8530(Arg8529) {
  if (Arg8529.length < 1) return [Shen.type_func, shen_user_lambda8530, 1, Arg8529];
  var Arg8529_0 = Arg8529[0];
  return (((!Shen.call(Shen.fns["element?"], [".", Arg8529_0])))
  ? Arg8529_0
  : ((Shen.is_type(Arg8529_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.strip-pathname"], [Arg8529_0[2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.strip-pathname"]]);})))}, 1, [], "shen.strip-pathname"];





Shen.fns["shen.recursive_descent"] = [Shen.type_func, function shen_user_lambda8532(Arg8531) {
  if (Arg8531.length < 3) return [Shen.type_func, shen_user_lambda8532, 3, Arg8531];
  var Arg8531_0 = Arg8531[0], Arg8531_1 = Arg8531[1], Arg8531_2 = Arg8531[2];
  var R0, R1, R2;
  return ((Shen.is_type(Arg8531_0, Shen.type_cons))
  ? ((R0 = [Shen.type_cons, Arg8531_0[1], [Shen.type_cons, Arg8531_1, []]]),
  (R1 = Shen.call(Shen.fns["shen.syntax"], [Arg8531_0[2], Shen.call(Shen.fns["concat"], [[Shen.type_symbol, "Parse_"], Arg8531_0[1]]), Arg8531_2])),
  (R2 = [Shen.type_cons, [Shen.type_symbol, "fail"], []]),
  [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, Shen.call(Shen.fns["concat"], [[Shen.type_symbol, "Parse_"], Arg8531_0[1]]), [Shen.type_cons, R0, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "not"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "="], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "fail"], []], [Shen.type_cons, Shen.call(Shen.fns["concat"], [[Shen.type_symbol, "Parse_"], Arg8531_0[1]]), []]]], []]], [Shen.type_cons, R1, [Shen.type_cons, R2, []]]]], []]]]])
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.recursive_descent"]]);}))}, 3, [], "shen.recursive_descent"];





Shen.fns["shen.variable-match"] = [Shen.type_func, function shen_user_lambda8534(Arg8533) {
  if (Arg8533.length < 3) return [Shen.type_func, shen_user_lambda8534, 3, Arg8533];
  var Arg8533_0 = Arg8533[0], Arg8533_1 = Arg8533[1], Arg8533_2 = Arg8533[2];
  var R0, R1, R2;
  return ((Shen.is_type(Arg8533_0, Shen.type_cons))
  ? ((R0 = [Shen.type_cons, [Shen.type_symbol, "cons?"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, Arg8533_1, []]], []]]),
  (R1 = [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, Shen.call(Shen.fns["concat"], [[Shen.type_symbol, "Parse_"], Arg8533_0[1]]), [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, Arg8533_1, []]], []]], [Shen.type_cons, Shen.call(Shen.fns["shen.syntax"], [Arg8533_0[2], [Shen.type_cons, [Shen.type_symbol, "shen.pair"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "tl"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, Arg8533_1, []]], []]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.hdtl"], [Shen.type_cons, Arg8533_1, []]], []]]], Arg8533_2]), []]]]]),
  (R2 = [Shen.type_cons, [Shen.type_symbol, "fail"], []]),
  [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, R0, [Shen.type_cons, R1, [Shen.type_cons, R2, []]]]])
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.variable-match"]]);}))}, 3, [], "shen.variable-match"];





Shen.fns["shen.terminal?"] = [Shen.type_func, function shen_user_lambda8536(Arg8535) {
  if (Arg8535.length < 1) return [Shen.type_func, shen_user_lambda8536, 1, Arg8535];
  var Arg8535_0 = Arg8535[0];
  return ((Shen.is_type(Arg8535_0, Shen.type_cons))
  ? false
  : ((Shen.call(Shen.fns["variable?"], [Arg8535_0]))
  ? false
  : true))}, 1, [], "shen.terminal?"];





Shen.fns["shen.jump_stream?"] = [Shen.type_func, function shen_user_lambda8538(Arg8537) {
  if (Arg8537.length < 1) return [Shen.type_func, shen_user_lambda8538, 1, Arg8537];
  var Arg8537_0 = Arg8537[0];
  return ((Shen.unwind_tail(Shen.$eq$(Arg8537_0, [Shen.type_symbol, "_"])))
  ? true
  : false)}, 1, [], "shen.jump_stream?"];





Shen.fns["shen.check_stream"] = [Shen.type_func, function shen_user_lambda8540(Arg8539) {
  if (Arg8539.length < 3) return [Shen.type_func, shen_user_lambda8540, 3, Arg8539];
  var Arg8539_0 = Arg8539[0], Arg8539_1 = Arg8539[1], Arg8539_2 = Arg8539[2];
  var R0, R1, R2;
  return ((Shen.is_type(Arg8539_0, Shen.type_cons))
  ? ((R0 = [Shen.type_cons, [Shen.type_symbol, "and"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "cons?"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, Arg8539_1, []]], []]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "="], [Shen.type_cons, Arg8539_0[1], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, Arg8539_1, []]], []]], []]]], []]]]),
  (R1 = Shen.call(Shen.fns["shen.syntax"], [Arg8539_0[2], [Shen.type_cons, [Shen.type_symbol, "shen.pair"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "tl"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, Arg8539_1, []]], []]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.hdtl"], [Shen.type_cons, Arg8539_1, []]], []]]], Arg8539_2])),
  (R2 = [Shen.type_cons, [Shen.type_symbol, "fail"], []]),
  [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, R0, [Shen.type_cons, R1, [Shen.type_cons, R2, []]]]])
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.check_stream"]]);}))}, 3, [], "shen.check_stream"];





Shen.fns["shen.jump_stream"] = [Shen.type_func, function shen_user_lambda8542(Arg8541) {
  if (Arg8541.length < 3) return [Shen.type_func, shen_user_lambda8542, 3, Arg8541];
  var Arg8541_0 = Arg8541[0], Arg8541_1 = Arg8541[1], Arg8541_2 = Arg8541[2];
  var R0, R1, R2;
  return ((Shen.is_type(Arg8541_0, Shen.type_cons))
  ? ((R0 = [Shen.type_cons, [Shen.type_symbol, "cons?"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, Arg8541_1, []]], []]]),
  (R1 = Shen.call(Shen.fns["shen.syntax"], [Arg8541_0[2], [Shen.type_cons, [Shen.type_symbol, "shen.pair"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "tl"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, Arg8541_1, []]], []]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.hdtl"], [Shen.type_cons, Arg8541_1, []]], []]]], Arg8541_2])),
  (R2 = [Shen.type_cons, [Shen.type_symbol, "fail"], []]),
  [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, R0, [Shen.type_cons, R1, [Shen.type_cons, R2, []]]]])
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.jump_stream"]]);}))}, 3, [], "shen.jump_stream"];





Shen.fns["shen.semantics"] = [Shen.type_func, function shen_user_lambda8544(Arg8543) {
  if (Arg8543.length < 1) return [Shen.type_func, shen_user_lambda8544, 1, Arg8543];
  var Arg8543_0 = Arg8543[0];
  return ((Shen.empty$question$(Arg8543_0))
  ? []
  : ((Shen.call(Shen.fns["shen.grammar_symbol?"], [Arg8543_0]))
  ? [Shen.type_cons, [Shen.type_symbol, "shen.hdtl"], [Shen.type_cons, Shen.call(Shen.fns["concat"], [[Shen.type_symbol, "Parse_"], Arg8543_0]), []]]
  : ((Shen.call(Shen.fns["variable?"], [Arg8543_0]))
  ? (function() {
  return Shen.call_tail(Shen.fns["concat"], [[Shen.type_symbol, "Parse_"], Arg8543_0]);})
  : ((Shen.is_type(Arg8543_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda8546(Arg8545) {
  if (Arg8545.length < 1) return [Shen.type_func, shen_user_lambda8546, 1, Arg8545];
  var Arg8545_0 = Arg8545[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.semantics"], [Arg8545_0]);})}, 1, [], undefined], Arg8543_0]);})
  : Arg8543_0))))}, 1, [], "shen.semantics"];





Shen.fns["shen.snd-or-fail"] = [Shen.type_func, function shen_user_lambda8548(Arg8547) {
  if (Arg8547.length < 1) return [Shen.type_func, shen_user_lambda8548, 1, Arg8547];
  var Arg8547_0 = Arg8547[0];
  return (((Shen.is_type(Arg8547_0, Shen.type_cons) && (Shen.is_type(Arg8547_0[2], Shen.type_cons) && Shen.empty$question$(Arg8547_0[2][2]))))
  ? Arg8547_0[2][1]
  : Shen.fail_obj)}, 1, [], "shen.snd-or-fail"];









Shen.fns["shen.pair"] = [Shen.type_func, function shen_user_lambda8551(Arg8550) {
  if (Arg8550.length < 2) return [Shen.type_func, shen_user_lambda8551, 2, Arg8550];
  var Arg8550_0 = Arg8550[0], Arg8550_1 = Arg8550[1];
  return [Shen.type_cons, Arg8550_0, [Shen.type_cons, Arg8550_1, []]]}, 2, [], "shen.pair"];





Shen.fns["shen.hdtl"] = [Shen.type_func, function shen_user_lambda8553(Arg8552) {
  if (Arg8552.length < 1) return [Shen.type_func, shen_user_lambda8553, 1, Arg8552];
  var Arg8552_0 = Arg8552[0];
  return Arg8552_0[2][1]}, 1, [], "shen.hdtl"];





Shen.fns["<!>"] = [Shen.type_func, function shen_user_lambda8555(Arg8554) {
  if (Arg8554.length < 1) return [Shen.type_func, shen_user_lambda8555, 1, Arg8554];
  var Arg8554_0 = Arg8554[0];
  return (((Shen.is_type(Arg8554_0, Shen.type_cons) && (Shen.is_type(Arg8554_0[2], Shen.type_cons) && Shen.empty$question$(Arg8554_0[2][2]))))
  ? [Shen.type_cons, [], [Shen.type_cons, Arg8554_0[1], []]]
  : Shen.fail_obj)}, 1, [], "<!>"];





Shen.fns["<e>"] = [Shen.type_func, function shen_user_lambda8557(Arg8556) {
  if (Arg8556.length < 1) return [Shen.type_func, shen_user_lambda8557, 1, Arg8556];
  var Arg8556_0 = Arg8556[0];
  return (((Shen.is_type(Arg8556_0, Shen.type_cons) && (Shen.is_type(Arg8556_0[2], Shen.type_cons) && Shen.empty$question$(Arg8556_0[2][2]))))
  ? [Shen.type_cons, Arg8556_0[1], [Shen.type_cons, [], []]]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "<e>"]]);}))}, 1, [], "<e>"];










Shen.fns["pr"] = [Shen.type_func, function shen_user_lambda8409(Arg8406) {
  if (Arg8406.length < 2) return [Shen.type_func, shen_user_lambda8409, 2, Arg8406];
  var Arg8406_0 = Arg8406[0], Arg8406_1 = Arg8406[1];
  var R0, R1;
  return ((R0 = [Shen.type_func, function shen_user_lambda8411(Arg8410) {
  if (Arg8410.length < 2) return [Shen.type_func, shen_user_lambda8411, 2, Arg8410];
  var Arg8410_0 = Arg8410[0], Arg8410_1 = Arg8410[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.prh"], [Arg8410_1, Arg8410_0, 0]);})}, 2, [Arg8406_1, Arg8406_0], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda8413(Arg8412) {
  if (Arg8412.length < 2) return [Shen.type_func, shen_user_lambda8413, 2, Arg8412];
  var Arg8412_0 = Arg8412[0], Arg8412_1 = Arg8412[1];
  return Arg8412_0}, 2, [Arg8406_0], undefined]),
  (function() {
  return Shen.trap_error(R0, R1);}))}, 2, [], "pr"];





Shen.fns["shen.prh"] = [Shen.type_func, function shen_user_lambda8415(Arg8414) {
  if (Arg8414.length < 3) return [Shen.type_func, shen_user_lambda8415, 3, Arg8414];
  var Arg8414_0 = Arg8414[0], Arg8414_1 = Arg8414[1], Arg8414_2 = Arg8414[2];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.prh"], [Arg8414_0, Arg8414_1, Shen.call(Shen.fns["shen.write-char-and-inc"], [Arg8414_0, Arg8414_1, Arg8414_2])]);})}, 3, [], "shen.prh"];





Shen.fns["shen.write-char-and-inc"] = [Shen.type_func, function shen_user_lambda8417(Arg8416) {
  if (Arg8416.length < 3) return [Shen.type_func, shen_user_lambda8417, 3, Arg8416];
  var Arg8416_0 = Arg8416[0], Arg8416_1 = Arg8416[1], Arg8416_2 = Arg8416[2];
  return (Shen.write_byte(Shen.string_$gt$n(Arg8416_0[Arg8416_2]), Arg8416_1),
  (Arg8416_2 + 1))}, 3, [], "shen.write-char-and-inc"];





Shen.fns["print"] = [Shen.type_func, function shen_user_lambda8419(Arg8418) {
  if (Arg8418.length < 1) return [Shen.type_func, shen_user_lambda8419, 1, Arg8418];
  var Arg8418_0 = Arg8418[0];
  var R0;
  return ((R0 = Shen.call(Shen.fns["shen.insert"], [Arg8418_0, "~S"])),
  Shen.call(Shen.fns["shen.prhush"], [R0, Shen.call(Shen.fns["stoutput"], [])]),
  Arg8418_0)}, 1, [], "print"];





Shen.fns["shen.prhush"] = [Shen.type_func, function shen_user_lambda8421(Arg8420) {
  if (Arg8420.length < 2) return [Shen.type_func, shen_user_lambda8421, 2, Arg8420];
  var Arg8420_0 = Arg8420[0], Arg8420_1 = Arg8420[1];
  return (((Shen.globals["*hush*"]))
  ? Arg8420_0
  : (function() {
  return Shen.call_tail(Shen.fns["pr"], [Arg8420_0, Arg8420_1]);}))}, 2, [], "shen.prhush"];





Shen.fns["shen.mkstr"] = [Shen.type_func, function shen_user_lambda8423(Arg8422) {
  if (Arg8422.length < 2) return [Shen.type_func, shen_user_lambda8423, 2, Arg8422];
  var Arg8422_0 = Arg8422[0], Arg8422_1 = Arg8422[1];
  return (((typeof(Arg8422_0) == 'string'))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.mkstr-l"], [Shen.call(Shen.fns["shen.proc-nl"], [Arg8422_0]), Arg8422_1]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.mkstr-r"], [[Shen.type_cons, [Shen.type_symbol, "shen.proc-nl"], [Shen.type_cons, Arg8422_0, []]], Arg8422_1]);}))}, 2, [], "shen.mkstr"];





Shen.fns["shen.mkstr-l"] = [Shen.type_func, function shen_user_lambda8425(Arg8424) {
  if (Arg8424.length < 2) return [Shen.type_func, shen_user_lambda8425, 2, Arg8424];
  var Arg8424_0 = Arg8424[0], Arg8424_1 = Arg8424[1];
  return ((Shen.empty$question$(Arg8424_1))
  ? Arg8424_0
  : ((Shen.is_type(Arg8424_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.mkstr-l"], [Shen.call(Shen.fns["shen.insert-l"], [Arg8424_1[1], Arg8424_0]), Arg8424_1[2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.mkstr-l"]]);})))}, 2, [], "shen.mkstr-l"];





Shen.fns["shen.insert-l"] = [Shen.type_func, function shen_user_lambda8427(Arg8426) {
  if (Arg8426.length < 2) return [Shen.type_func, shen_user_lambda8427, 2, Arg8426];
  var Arg8426_0 = Arg8426[0], Arg8426_1 = Arg8426[1];
  return ((Shen.unwind_tail(Shen.$eq$("", Arg8426_1)))
  ? ""
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg8426_1]) && (Shen.unwind_tail(Shen.$eq$("~", Arg8426_1[0])) && (Shen.call(Shen.fns["shen.+string?"], [Shen.tlstr(Arg8426_1)]) && Shen.unwind_tail(Shen.$eq$("A", Shen.tlstr(Arg8426_1)[0]))))))
  ? [Shen.type_cons, [Shen.type_symbol, "shen.app"], [Shen.type_cons, Arg8426_0, [Shen.type_cons, Shen.tlstr(Shen.tlstr(Arg8426_1)), [Shen.type_cons, [Shen.type_symbol, "shen.a"], []]]]]
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg8426_1]) && (Shen.unwind_tail(Shen.$eq$("~", Arg8426_1[0])) && (Shen.call(Shen.fns["shen.+string?"], [Shen.tlstr(Arg8426_1)]) && Shen.unwind_tail(Shen.$eq$("R", Shen.tlstr(Arg8426_1)[0]))))))
  ? [Shen.type_cons, [Shen.type_symbol, "shen.app"], [Shen.type_cons, Arg8426_0, [Shen.type_cons, Shen.tlstr(Shen.tlstr(Arg8426_1)), [Shen.type_cons, [Shen.type_symbol, "shen.r"], []]]]]
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg8426_1]) && (Shen.unwind_tail(Shen.$eq$("~", Arg8426_1[0])) && (Shen.call(Shen.fns["shen.+string?"], [Shen.tlstr(Arg8426_1)]) && Shen.unwind_tail(Shen.$eq$("S", Shen.tlstr(Arg8426_1)[0]))))))
  ? [Shen.type_cons, [Shen.type_symbol, "shen.app"], [Shen.type_cons, Arg8426_0, [Shen.type_cons, Shen.tlstr(Shen.tlstr(Arg8426_1)), [Shen.type_cons, [Shen.type_symbol, "shen.s"], []]]]]
  : ((Shen.call(Shen.fns["shen.+string?"], [Arg8426_1]))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.factor-cn"], [[Shen.type_cons, [Shen.type_symbol, "cn"], [Shen.type_cons, Arg8426_1[0], [Shen.type_cons, Shen.call(Shen.fns["shen.insert-l"], [Arg8426_0, Shen.tlstr(Arg8426_1)]), []]]]]);})
  : (((Shen.is_type(Arg8426_1, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cn"], Arg8426_1[1])) && (Shen.is_type(Arg8426_1[2], Shen.type_cons) && (Shen.is_type(Arg8426_1[2][2], Shen.type_cons) && Shen.empty$question$(Arg8426_1[2][2][2]))))))
  ? [Shen.type_cons, [Shen.type_symbol, "cn"], [Shen.type_cons, Arg8426_1[2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.insert-l"], [Arg8426_0, Arg8426_1[2][2][1]]), []]]]
  : (((Shen.is_type(Arg8426_1, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.app"], Arg8426_1[1])) && (Shen.is_type(Arg8426_1[2], Shen.type_cons) && (Shen.is_type(Arg8426_1[2][2], Shen.type_cons) && (Shen.is_type(Arg8426_1[2][2][2], Shen.type_cons) && Shen.empty$question$(Arg8426_1[2][2][2][2])))))))
  ? [Shen.type_cons, [Shen.type_symbol, "shen.app"], [Shen.type_cons, Arg8426_1[2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.insert-l"], [Arg8426_0, Arg8426_1[2][2][1]]), Arg8426_1[2][2][2]]]]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.insert-l"]]);}))))))))}, 2, [], "shen.insert-l"];





Shen.fns["shen.factor-cn"] = [Shen.type_func, function shen_user_lambda8429(Arg8428) {
  if (Arg8428.length < 1) return [Shen.type_func, shen_user_lambda8429, 1, Arg8428];
  var Arg8428_0 = Arg8428[0];
  return (((Shen.is_type(Arg8428_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cn"], Arg8428_0[1])) && (Shen.is_type(Arg8428_0[2], Shen.type_cons) && (Shen.is_type(Arg8428_0[2][2], Shen.type_cons) && (Shen.is_type(Arg8428_0[2][2][1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cn"], Arg8428_0[2][2][1][1])) && (Shen.is_type(Arg8428_0[2][2][1][2], Shen.type_cons) && (Shen.is_type(Arg8428_0[2][2][1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg8428_0[2][2][1][2][2][2]) && (Shen.empty$question$(Arg8428_0[2][2][2]) && ((typeof(Arg8428_0[2][1]) == 'string') && (typeof(Arg8428_0[2][2][1][2][1]) == 'string')))))))))))))
  ? [Shen.type_cons, [Shen.type_symbol, "cn"], [Shen.type_cons, (Arg8428_0[2][1] + Arg8428_0[2][2][1][2][1]), Arg8428_0[2][2][1][2][2]]]
  : Arg8428_0)}, 1, [], "shen.factor-cn"];





Shen.fns["shen.proc-nl"] = [Shen.type_func, function shen_user_lambda8431(Arg8430) {
  if (Arg8430.length < 1) return [Shen.type_func, shen_user_lambda8431, 1, Arg8430];
  var Arg8430_0 = Arg8430[0];
  return ((Shen.unwind_tail(Shen.$eq$("", Arg8430_0)))
  ? ""
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg8430_0]) && (Shen.unwind_tail(Shen.$eq$("~", Arg8430_0[0])) && (Shen.call(Shen.fns["shen.+string?"], [Shen.tlstr(Arg8430_0)]) && Shen.unwind_tail(Shen.$eq$("%", Shen.tlstr(Arg8430_0)[0]))))))
  ? (Shen.n_$gt$string(10) + Shen.call(Shen.fns["shen.proc-nl"], [Shen.tlstr(Shen.tlstr(Arg8430_0))]))
  : ((Shen.call(Shen.fns["shen.+string?"], [Arg8430_0]))
  ? (Arg8430_0[0] + Shen.call(Shen.fns["shen.proc-nl"], [Shen.tlstr(Arg8430_0)]))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.proc-nl"]]);}))))}, 1, [], "shen.proc-nl"];





Shen.fns["shen.mkstr-r"] = [Shen.type_func, function shen_user_lambda8433(Arg8432) {
  if (Arg8432.length < 2) return [Shen.type_func, shen_user_lambda8433, 2, Arg8432];
  var Arg8432_0 = Arg8432[0], Arg8432_1 = Arg8432[1];
  return ((Shen.empty$question$(Arg8432_1))
  ? Arg8432_0
  : ((Shen.is_type(Arg8432_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.mkstr-r"], [[Shen.type_cons, [Shen.type_symbol, "shen.insert"], [Shen.type_cons, Arg8432_1[1], [Shen.type_cons, Arg8432_0, []]]], Arg8432_1[2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.mkstr-r"]]);})))}, 2, [], "shen.mkstr-r"];





Shen.fns["shen.insert"] = [Shen.type_func, function shen_user_lambda8435(Arg8434) {
  if (Arg8434.length < 2) return [Shen.type_func, shen_user_lambda8435, 2, Arg8434];
  var Arg8434_0 = Arg8434[0], Arg8434_1 = Arg8434[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.insert-h"], [Arg8434_0, Arg8434_1, ""]);})}, 2, [], "shen.insert"];





Shen.fns["shen.insert-h"] = [Shen.type_func, function shen_user_lambda8437(Arg8436) {
  if (Arg8436.length < 3) return [Shen.type_func, shen_user_lambda8437, 3, Arg8436];
  var Arg8436_0 = Arg8436[0], Arg8436_1 = Arg8436[1], Arg8436_2 = Arg8436[2];
  return ((Shen.unwind_tail(Shen.$eq$("", Arg8436_1)))
  ? Arg8436_2
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg8436_1]) && (Shen.unwind_tail(Shen.$eq$("~", Arg8436_1[0])) && (Shen.call(Shen.fns["shen.+string?"], [Shen.tlstr(Arg8436_1)]) && Shen.unwind_tail(Shen.$eq$("A", Shen.tlstr(Arg8436_1)[0]))))))
  ? (Arg8436_2 + Shen.call(Shen.fns["shen.app"], [Arg8436_0, Shen.tlstr(Shen.tlstr(Arg8436_1)), [Shen.type_symbol, "shen.a"]]))
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg8436_1]) && (Shen.unwind_tail(Shen.$eq$("~", Arg8436_1[0])) && (Shen.call(Shen.fns["shen.+string?"], [Shen.tlstr(Arg8436_1)]) && Shen.unwind_tail(Shen.$eq$("R", Shen.tlstr(Arg8436_1)[0]))))))
  ? (Arg8436_2 + Shen.call(Shen.fns["shen.app"], [Arg8436_0, Shen.tlstr(Shen.tlstr(Arg8436_1)), [Shen.type_symbol, "shen.r"]]))
  : (((Shen.call(Shen.fns["shen.+string?"], [Arg8436_1]) && (Shen.unwind_tail(Shen.$eq$("~", Arg8436_1[0])) && (Shen.call(Shen.fns["shen.+string?"], [Shen.tlstr(Arg8436_1)]) && Shen.unwind_tail(Shen.$eq$("S", Shen.tlstr(Arg8436_1)[0]))))))
  ? (Arg8436_2 + Shen.call(Shen.fns["shen.app"], [Arg8436_0, Shen.tlstr(Shen.tlstr(Arg8436_1)), [Shen.type_symbol, "shen.s"]]))
  : ((Shen.call(Shen.fns["shen.+string?"], [Arg8436_1]))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.insert-h"], [Arg8436_0, Shen.tlstr(Arg8436_1), (Arg8436_2 + Arg8436_1[0])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.insert-h"]]);}))))))}, 3, [], "shen.insert-h"];





Shen.fns["shen.app"] = [Shen.type_func, function shen_user_lambda8439(Arg8438) {
  if (Arg8438.length < 3) return [Shen.type_func, shen_user_lambda8439, 3, Arg8438];
  var Arg8438_0 = Arg8438[0], Arg8438_1 = Arg8438[1], Arg8438_2 = Arg8438[2];
  return (Shen.call(Shen.fns["shen.arg->str"], [Arg8438_0, Arg8438_2]) + Arg8438_1)}, 3, [], "shen.app"];





Shen.fns["shen.arg->str"] = [Shen.type_func, function shen_user_lambda8441(Arg8440) {
  if (Arg8440.length < 2) return [Shen.type_func, shen_user_lambda8441, 2, Arg8440];
  var Arg8440_0 = Arg8440[0], Arg8440_1 = Arg8440[1];
  return ((Shen.unwind_tail(Shen.$eq$(Arg8440_0, Shen.fail_obj)))
  ? "..."
  : ((Shen.call(Shen.fns["shen.list?"], [Arg8440_0]))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.list->str"], [Arg8440_0, Arg8440_1]);})
  : (((typeof(Arg8440_0) == 'string'))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.str->str"], [Arg8440_0, Arg8440_1]);})
  : ((Shen.absvector$question$(Arg8440_0))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.vector->str"], [Arg8440_0, Arg8440_1]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.atom->str"], [Arg8440_0]);})))))}, 2, [], "shen.arg->str"];





Shen.fns["shen.list->str"] = [Shen.type_func, function shen_user_lambda8443(Arg8442) {
  if (Arg8442.length < 2) return [Shen.type_func, shen_user_lambda8443, 2, Arg8442];
  var Arg8442_0 = Arg8442[0], Arg8442_1 = Arg8442[1];
  return ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.r"], Arg8442_1)))
  ? (function() {
  return Shen.call_tail(Shen.fns["@s"], ["(", Shen.call(Shen.fns["@s"], [Shen.call(Shen.fns["shen.iter-list"], [Arg8442_0, [Shen.type_symbol, "shen.r"], Shen.call(Shen.fns["shen.maxseq"], [])]), ")"])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["@s"], ["[", Shen.call(Shen.fns["@s"], [Shen.call(Shen.fns["shen.iter-list"], [Arg8442_0, Arg8442_1, Shen.call(Shen.fns["shen.maxseq"], [])]), "]"])]);}))}, 2, [], "shen.list->str"];





Shen.fns["shen.maxseq"] = [Shen.type_func, function shen_user_lambda8445(Arg8444) {
  if (Arg8444.length < 0) return [Shen.type_func, shen_user_lambda8445, 0, Arg8444];
  return (Shen.globals["*maximum-print-sequence-size*"])}, 0, [], "shen.maxseq"];





Shen.fns["shen.iter-list"] = [Shen.type_func, function shen_user_lambda8447(Arg8446) {
  if (Arg8446.length < 3) return [Shen.type_func, shen_user_lambda8447, 3, Arg8446];
  var Arg8446_0 = Arg8446[0], Arg8446_1 = Arg8446[1], Arg8446_2 = Arg8446[2];
  return ((Shen.empty$question$(Arg8446_0))
  ? ""
  : ((Shen.unwind_tail(Shen.$eq$(0, Arg8446_2)))
  ? "... etc"
  : (((Shen.is_type(Arg8446_0, Shen.type_cons) && Shen.empty$question$(Arg8446_0[2])))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.arg->str"], [Arg8446_0[1], Arg8446_1]);})
  : ((Shen.is_type(Arg8446_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["@s"], [Shen.call(Shen.fns["shen.arg->str"], [Arg8446_0[1], Arg8446_1]), Shen.call(Shen.fns["@s"], [" ", Shen.call(Shen.fns["shen.iter-list"], [Arg8446_0[2], Arg8446_1, (Arg8446_2 - 1)])])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["@s"], ["|", Shen.call(Shen.fns["@s"], [" ", Shen.call(Shen.fns["shen.arg->str"], [Arg8446_0, Arg8446_1])])]);})))))}, 3, [], "shen.iter-list"];





Shen.fns["shen.str->str"] = [Shen.type_func, function shen_user_lambda8449(Arg8448) {
  if (Arg8448.length < 2) return [Shen.type_func, shen_user_lambda8449, 2, Arg8448];
  var Arg8448_0 = Arg8448[0], Arg8448_1 = Arg8448[1];
  return ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.a"], Arg8448_1)))
  ? Arg8448_0
  : (function() {
  return Shen.call_tail(Shen.fns["@s"], [Shen.n_$gt$string(34), Shen.call(Shen.fns["@s"], [Arg8448_0, Shen.n_$gt$string(34)])]);}))}, 2, [], "shen.str->str"];





Shen.fns["shen.vector->str"] = [Shen.type_func, function shen_user_lambda8451(Arg8450) {
  if (Arg8450.length < 2) return [Shen.type_func, shen_user_lambda8451, 2, Arg8450];
  var Arg8450_0 = Arg8450[0], Arg8450_1 = Arg8450[1];
  return ((Shen.call(Shen.fns["shen.print-vector?"], [Arg8450_0]))
  ? (function() {
  return Shen.call_tail(Shen.absvector_ref(Arg8450_0, 0), [Arg8450_0]);})
  : ((Shen.vector$question$(Arg8450_0))
  ? (function() {
  return Shen.call_tail(Shen.fns["@s"], ["<", Shen.call(Shen.fns["@s"], [Shen.call(Shen.fns["shen.iter-vector"], [Arg8450_0, 1, Arg8450_1, Shen.call(Shen.fns["shen.maxseq"], [])]), ">"])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["@s"], ["<", Shen.call(Shen.fns["@s"], ["<", Shen.call(Shen.fns["@s"], [Shen.call(Shen.fns["shen.iter-vector"], [Arg8450_0, 0, Arg8450_1, Shen.call(Shen.fns["shen.maxseq"], [])]), ">>"])])]);})))}, 2, [], "shen.vector->str"];





Shen.fns["shen.print-vector?"] = [Shen.type_func, function shen_user_lambda8453(Arg8452) {
  if (Arg8452.length < 1) return [Shen.type_func, shen_user_lambda8453, 1, Arg8452];
  var Arg8452_0 = Arg8452[0];
  var R0;
  return ((R0 = Shen.absvector_ref(Arg8452_0, 0)),
  ((Shen.unwind_tail(Shen.$eq$(R0, [Shen.type_symbol, "shen.tuple"])))
  ? true
  : ((Shen.unwind_tail(Shen.$eq$(R0, [Shen.type_symbol, "shen.pvar"])))
  ? true
  : (((!(typeof(R0) == 'number')))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.fbound?"], [R0]);})
  : false))))}, 1, [], "shen.print-vector?"];





Shen.fns["shen.fbound?"] = [Shen.type_func, function shen_user_lambda8457(Arg8454) {
  if (Arg8454.length < 1) return [Shen.type_func, shen_user_lambda8457, 1, Arg8454];
  var Arg8454_0 = Arg8454[0];
  var R0, R1;
  return ((R0 = [Shen.type_func, function shen_user_lambda8459(Arg8458) {
  if (Arg8458.length < 1) return [Shen.type_func, shen_user_lambda8459, 1, Arg8458];
  var Arg8458_0 = Arg8458[0];
  return (Shen.call(Shen.fns["ps"], [Arg8458_0]),
  true)}, 1, [Arg8454_0], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda8461(Arg8460) {
  if (Arg8460.length < 1) return [Shen.type_func, shen_user_lambda8461, 1, Arg8460];
  var Arg8460_0 = Arg8460[0];
  return false}, 1, [], undefined]),
  (function() {
  return Shen.trap_error(R0, R1);}))}, 1, [], "shen.fbound?"];





Shen.fns["shen.tuple"] = [Shen.type_func, function shen_user_lambda8463(Arg8462) {
  if (Arg8462.length < 1) return [Shen.type_func, shen_user_lambda8463, 1, Arg8462];
  var Arg8462_0 = Arg8462[0];
  return ("(@p " + Shen.call(Shen.fns["shen.app"], [Shen.absvector_ref(Arg8462_0, 1), (" " + Shen.call(Shen.fns["shen.app"], [Shen.absvector_ref(Arg8462_0, 2), ")", [Shen.type_symbol, "shen.s"]])), [Shen.type_symbol, "shen.s"]]))}, 1, [], "shen.tuple"];





Shen.fns["shen.iter-vector"] = [Shen.type_func, function shen_user_lambda8469(Arg8464) {
  if (Arg8464.length < 4) return [Shen.type_func, shen_user_lambda8469, 4, Arg8464];
  var Arg8464_0 = Arg8464[0], Arg8464_1 = Arg8464[1], Arg8464_2 = Arg8464[2], Arg8464_3 = Arg8464[3];
  var R0, R1, R2;
  return ((Shen.unwind_tail(Shen.$eq$(0, Arg8464_3)))
  ? "... etc"
  : ((R0 = [Shen.type_func, function shen_user_lambda8471(Arg8470) {
  if (Arg8470.length < 4) return [Shen.type_func, shen_user_lambda8471, 4, Arg8470];
  var Arg8470_0 = Arg8470[0], Arg8470_1 = Arg8470[1], Arg8470_2 = Arg8470[2], Arg8470_3 = Arg8470[3];
  return Shen.absvector_ref(Arg8470_0, Arg8470_1)}, 4, [Arg8464_0, Arg8464_1, Arg8464_2, Arg8464_3], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda8473(Arg8472) {
  if (Arg8472.length < 1) return [Shen.type_func, shen_user_lambda8473, 1, Arg8472];
  var Arg8472_0 = Arg8472[0];
  return [Shen.type_symbol, "shen.out-of-bounds"]}, 1, [], undefined]),
  (R0 = Shen.trap_error(R0, R1)),
  (R1 = [Shen.type_func, function shen_user_lambda8475(Arg8474) {
  if (Arg8474.length < 5) return [Shen.type_func, shen_user_lambda8475, 5, Arg8474];
  var Arg8474_0 = Arg8474[0], Arg8474_1 = Arg8474[1], Arg8474_2 = Arg8474[2], Arg8474_3 = Arg8474[3], Arg8474_4 = Arg8474[4];
  return Shen.absvector_ref(Arg8474_1, (Arg8474_2 + 1))}, 5, [R0, Arg8464_0, Arg8464_1, Arg8464_2, Arg8464_3], undefined]),
  (R2 = [Shen.type_func, function shen_user_lambda8477(Arg8476) {
  if (Arg8476.length < 1) return [Shen.type_func, shen_user_lambda8477, 1, Arg8476];
  var Arg8476_0 = Arg8476[0];
  return [Shen.type_symbol, "shen.out-of-bounds"]}, 1, [], undefined]),
  (R1 = Shen.trap_error(R1, R2)),
  ((Shen.unwind_tail(Shen.$eq$(R0, [Shen.type_symbol, "shen.out-of-bounds"])))
  ? ""
  : ((Shen.unwind_tail(Shen.$eq$(R1, [Shen.type_symbol, "shen.out-of-bounds"])))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.arg->str"], [R0, Arg8464_2]);})
  : (function() {
  return Shen.call_tail(Shen.fns["@s"], [Shen.call(Shen.fns["shen.arg->str"], [R0, Arg8464_2]), Shen.call(Shen.fns["@s"], [" ", Shen.call(Shen.fns["shen.iter-vector"], [Arg8464_0, (Arg8464_1 + 1), Arg8464_2, (Arg8464_3 - 1)])])]);})))))}, 4, [], "shen.iter-vector"];





Shen.fns["shen.atom->str"] = [Shen.type_func, function shen_user_lambda8481(Arg8478) {
  if (Arg8478.length < 1) return [Shen.type_func, shen_user_lambda8481, 1, Arg8478];
  var Arg8478_0 = Arg8478[0];
  var R0, R1;
  return ((R0 = [Shen.type_func, function shen_user_lambda8483(Arg8482) {
  if (Arg8482.length < 1) return [Shen.type_func, shen_user_lambda8483, 1, Arg8482];
  var Arg8482_0 = Arg8482[0];
  return (function() {
  return Shen.str(Arg8482_0);})}, 1, [Arg8478_0], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda8485(Arg8484) {
  if (Arg8484.length < 1) return [Shen.type_func, shen_user_lambda8485, 1, Arg8484];
  var Arg8484_0 = Arg8484[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.funexstring"], []);})}, 1, [], undefined]),
  (function() {
  return Shen.trap_error(R0, R1);}))}, 1, [], "shen.atom->str"];





Shen.fns["shen.funexstring"] = [Shen.type_func, function shen_user_lambda8487(Arg8486) {
  if (Arg8486.length < 0) return [Shen.type_func, shen_user_lambda8487, 0, Arg8486];
  return (function() {
  return Shen.call_tail(Shen.fns["@s"], ["", Shen.call(Shen.fns["@s"], ["f", Shen.call(Shen.fns["@s"], ["u", Shen.call(Shen.fns["@s"], ["n", Shen.call(Shen.fns["@s"], ["e", Shen.call(Shen.fns["@s"], [Shen.call(Shen.fns["shen.arg->str"], [Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "x"]]), [Shen.type_symbol, "shen.a"]]), ""])])])])])]);})}, 0, [], "shen.funexstring"];





Shen.fns["shen.list?"] = [Shen.type_func, function shen_user_lambda8489(Arg8488) {
  if (Arg8488.length < 1) return [Shen.type_func, shen_user_lambda8489, 1, Arg8488];
  var Arg8488_0 = Arg8488[0];
  return (Shen.empty$question$(Arg8488_0) || Shen.is_type(Arg8488_0, Shen.type_cons))}, 1, [], "shen.list?"];










Shen.fns["read-file-as-bytelist"] = [Shen.type_func, function shen_user_lambda7248(Arg7247) {
  if (Arg7247.length < 1) return [Shen.type_func, shen_user_lambda7248, 1, Arg7247];
  var Arg7247_0 = Arg7247[0];
  var R0, R1;
  return ((R0 = Shen.open(Arg7247_0, [Shen.type_symbol, "in"])),
  (R1 = Shen.read_byte(R0)),
  (R1 = Shen.call(Shen.fns["shen.read-file-as-bytelist-help"], [R0, R1, []])),
  Shen.close(R0),
  (function() {
  return Shen.call_tail(Shen.fns["reverse"], [R1]);}))}, 1, [], "read-file-as-bytelist"];





Shen.fns["shen.read-file-as-bytelist-help"] = [Shen.type_func, function shen_user_lambda7250(Arg7249) {
  if (Arg7249.length < 3) return [Shen.type_func, shen_user_lambda7250, 3, Arg7249];
  var Arg7249_0 = Arg7249[0], Arg7249_1 = Arg7249[1], Arg7249_2 = Arg7249[2];
  return ((Shen.unwind_tail(Shen.$eq$(-1, Arg7249_1)))
  ? Arg7249_2
  : (function() {
  return Shen.call_tail(Shen.fns["shen.read-file-as-bytelist-help"], [Arg7249_0, Shen.read_byte(Arg7249_0), [Shen.type_cons, Arg7249_1, Arg7249_2]]);}))}, 3, [], "shen.read-file-as-bytelist-help"];





Shen.fns["read-file-as-string"] = [Shen.type_func, function shen_user_lambda7252(Arg7251) {
  if (Arg7251.length < 1) return [Shen.type_func, shen_user_lambda7252, 1, Arg7251];
  var Arg7251_0 = Arg7251[0];
  var R0;
  return ((R0 = Shen.open(Arg7251_0, [Shen.type_symbol, "in"])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.rfas-h"], [R0, Shen.read_byte(R0), ""]);}))}, 1, [], "read-file-as-string"];





Shen.fns["shen.rfas-h"] = [Shen.type_func, function shen_user_lambda7254(Arg7253) {
  if (Arg7253.length < 3) return [Shen.type_func, shen_user_lambda7254, 3, Arg7253];
  var Arg7253_0 = Arg7253[0], Arg7253_1 = Arg7253[1], Arg7253_2 = Arg7253[2];
  return ((Shen.unwind_tail(Shen.$eq$(-1, Arg7253_1)))
  ? (Shen.close(Arg7253_0),
  Arg7253_2)
  : (function() {
  return Shen.call_tail(Shen.fns["shen.rfas-h"], [Arg7253_0, Shen.read_byte(Arg7253_0), (Arg7253_2 + Shen.n_$gt$string(Arg7253_1))]);}))}, 3, [], "shen.rfas-h"];





Shen.fns["input"] = [Shen.type_func, function shen_user_lambda7256(Arg7255) {
  if (Arg7255.length < 1) return [Shen.type_func, shen_user_lambda7256, 1, Arg7255];
  var Arg7255_0 = Arg7255[0];
  return (function() {
  return Shen.eval_kl(Shen.call(Shen.fns["read"], [Arg7255_0]));})}, 1, [], "input"];





Shen.fns["input+"] = [Shen.type_func, function shen_user_lambda7258(Arg7257) {
  if (Arg7257.length < 2) return [Shen.type_func, shen_user_lambda7258, 2, Arg7257];
  var Arg7257_0 = Arg7257[0], Arg7257_1 = Arg7257[1];
  var R0;
  return (Shen.call(Shen.fns["shen.monotype"], [Arg7257_0]),
  (R0 = Shen.call(Shen.fns["read"], [Arg7257_1])),
  ((Shen.unwind_tail(Shen.$eq$(false, Shen.call(Shen.fns["shen.typecheck"], [R0, Shen.call(Shen.fns["shen.demodulate"], [Arg7257_0])]))))
  ? (function() {
  return Shen.simple_error(("type error: " + Shen.call(Shen.fns["shen.app"], [R0, (" is not of type " + Shen.call(Shen.fns["shen.app"], [Arg7257_0, "\x0d\x0a", [Shen.type_symbol, "shen.r"]])), [Shen.type_symbol, "shen.r"]])));})
  : (function() {
  return Shen.eval_kl(R0);})))}, 2, [], "input+"];





Shen.fns["shen.monotype"] = [Shen.type_func, function shen_user_lambda7260(Arg7259) {
  if (Arg7259.length < 1) return [Shen.type_func, shen_user_lambda7260, 1, Arg7259];
  var Arg7259_0 = Arg7259[0];
  return ((Shen.is_type(Arg7259_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7262(Arg7261) {
  if (Arg7261.length < 1) return [Shen.type_func, shen_user_lambda7262, 1, Arg7261];
  var Arg7261_0 = Arg7261[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.monotype"], [Arg7261_0]);})}, 1, [], undefined], Arg7259_0]);})
  : ((Shen.call(Shen.fns["variable?"], [Arg7259_0]))
  ? (function() {
  return Shen.simple_error(("input+ expects a monotype: not " + Shen.call(Shen.fns["shen.app"], [Arg7259_0, "\x0d\x0a", [Shen.type_symbol, "shen.a"]])));})
  : Arg7259_0))}, 1, [], "shen.monotype"];





Shen.fns["read"] = [Shen.type_func, function shen_user_lambda7264(Arg7263) {
  if (Arg7263.length < 1) return [Shen.type_func, shen_user_lambda7264, 1, Arg7263];
  var Arg7263_0 = Arg7263[0];
  return (Shen.globals["shen.*it*"] = Shen.call(Shen.fns["shen.read-loop"], [Arg7263_0, Shen.read_byte(Arg7263_0), []])[1])}, 1, [], "read"];





Shen.fns["it"] = [Shen.type_func, function shen_user_lambda7266(Arg7265) {
  if (Arg7265.length < 0) return [Shen.type_func, shen_user_lambda7266, 0, Arg7265];
  return (Shen.globals["shen.*it*"])}, 0, [], "it"];





Shen.fns["shen.read-loop"] = [Shen.type_func, function shen_user_lambda7268(Arg7267) {
  if (Arg7267.length < 3) return [Shen.type_func, shen_user_lambda7268, 3, Arg7267];
  var Arg7267_0 = Arg7267[0], Arg7267_1 = Arg7267[1], Arg7267_2 = Arg7267[2];
  var R0, R1;
  return ((Shen.unwind_tail(Shen.$eq$(94, Arg7267_1)))
  ? (function() {
  return Shen.simple_error("read aborted");})
  : ((Shen.unwind_tail(Shen.$eq$(-1, Arg7267_1)))
  ? ((Shen.empty$question$(Arg7267_2))
  ? (function() {
  return Shen.simple_error("error: empty stream");})
  : (function() {
  return Shen.call_tail(Shen.fns["compile"], [[Shen.type_func, function shen_user_lambda7270(Arg7269) {
  if (Arg7269.length < 1) return [Shen.type_func, shen_user_lambda7270, 1, Arg7269];
  var Arg7269_0 = Arg7269[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.<st_input>"], [Arg7269_0]);})}, 1, [], undefined], Arg7267_2, [Shen.type_func, function shen_user_lambda7272(Arg7271) {
  if (Arg7271.length < 1) return [Shen.type_func, shen_user_lambda7272, 1, Arg7271];
  var Arg7271_0 = Arg7271[0];
  return Arg7271_0}, 1, [], undefined]]);}))
  : ((Shen.call(Shen.fns["shen.terminator?"], [Arg7267_1]))
  ? ((R0 = Shen.call(Shen.fns["append"], [Arg7267_2, [Shen.type_cons, Arg7267_1, []]])),
  (R1 = Shen.call(Shen.fns["compile"], [[Shen.type_func, function shen_user_lambda7274(Arg7273) {
  if (Arg7273.length < 1) return [Shen.type_func, shen_user_lambda7274, 1, Arg7273];
  var Arg7273_0 = Arg7273[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.<st_input>"], [Arg7273_0]);})}, 1, [], undefined], R0, [Shen.type_func, function shen_user_lambda7276(Arg7275) {
  if (Arg7275.length < 1) return [Shen.type_func, shen_user_lambda7276, 1, Arg7275];
  var Arg7275_0 = Arg7275[0];
  return [Shen.type_symbol, "shen.nextbyte"]}, 1, [], undefined]])),
  (((Shen.unwind_tail(Shen.$eq$(R1, [Shen.type_symbol, "shen.nextbyte"])) || Shen.empty$question$(R1)))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.read-loop"], [Arg7267_0, Shen.read_byte(Arg7267_0), R0]);})
  : R1))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.read-loop"], [Arg7267_0, Shen.read_byte(Arg7267_0), Shen.call(Shen.fns["append"], [Arg7267_2, [Shen.type_cons, Arg7267_1, []]])]);}))))}, 3, [], "shen.read-loop"];





Shen.fns["shen.terminator?"] = [Shen.type_func, function shen_user_lambda7278(Arg7277) {
  if (Arg7277.length < 1) return [Shen.type_func, shen_user_lambda7278, 1, Arg7277];
  var Arg7277_0 = Arg7277[0];
  return (function() {
  return Shen.call_tail(Shen.fns["element?"], [Arg7277_0, [Shen.type_cons, 9, [Shen.type_cons, 10, [Shen.type_cons, 13, [Shen.type_cons, 32, [Shen.type_cons, 34, [Shen.type_cons, 41, [Shen.type_cons, 93, []]]]]]]]]);})}, 1, [], "shen.terminator?"];





Shen.fns["lineread"] = [Shen.type_func, function shen_user_lambda7280(Arg7279) {
  if (Arg7279.length < 1) return [Shen.type_func, shen_user_lambda7280, 1, Arg7279];
  var Arg7279_0 = Arg7279[0];
  return (Shen.globals["shen.*it*"] = Shen.call(Shen.fns["shen.lineread-loop"], [Shen.read_byte(Arg7279_0), [], Arg7279_0]))}, 1, [], "lineread"];





Shen.fns["shen.lineread-loop"] = [Shen.type_func, function shen_user_lambda7282(Arg7281) {
  if (Arg7281.length < 3) return [Shen.type_func, shen_user_lambda7282, 3, Arg7281];
  var Arg7281_0 = Arg7281[0], Arg7281_1 = Arg7281[1], Arg7281_2 = Arg7281[2];
  var R0;
  return ((Shen.unwind_tail(Shen.$eq$(-1, Arg7281_0)))
  ? ((Shen.empty$question$(Arg7281_1))
  ? (function() {
  return Shen.simple_error("empty stream");})
  : (function() {
  return Shen.call_tail(Shen.fns["compile"], [[Shen.type_func, function shen_user_lambda7284(Arg7283) {
  if (Arg7283.length < 1) return [Shen.type_func, shen_user_lambda7284, 1, Arg7283];
  var Arg7283_0 = Arg7283[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.<st_input>"], [Arg7283_0]);})}, 1, [], undefined], Arg7281_1, [Shen.type_func, function shen_user_lambda7286(Arg7285) {
  if (Arg7285.length < 1) return [Shen.type_func, shen_user_lambda7286, 1, Arg7285];
  var Arg7285_0 = Arg7285[0];
  return Arg7285_0}, 1, [], undefined]]);}))
  : ((Shen.unwind_tail(Shen.$eq$(Arg7281_0, Shen.call(Shen.fns["shen.hat"], []))))
  ? (function() {
  return Shen.simple_error("line read aborted");})
  : ((Shen.call(Shen.fns["element?"], [Arg7281_0, [Shen.type_cons, Shen.call(Shen.fns["shen.newline"], []), [Shen.type_cons, Shen.call(Shen.fns["shen.carriage-return"], []), []]]]))
  ? ((R0 = Shen.call(Shen.fns["compile"], [[Shen.type_func, function shen_user_lambda7288(Arg7287) {
  if (Arg7287.length < 1) return [Shen.type_func, shen_user_lambda7288, 1, Arg7287];
  var Arg7287_0 = Arg7287[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.<st_input>"], [Arg7287_0]);})}, 1, [], undefined], Arg7281_1, [Shen.type_func, function shen_user_lambda7290(Arg7289) {
  if (Arg7289.length < 1) return [Shen.type_func, shen_user_lambda7290, 1, Arg7289];
  var Arg7289_0 = Arg7289[0];
  return [Shen.type_symbol, "shen.nextline"]}, 1, [], undefined]])),
  (((Shen.unwind_tail(Shen.$eq$(R0, [Shen.type_symbol, "shen.nextline"])) || Shen.empty$question$(R0)))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.lineread-loop"], [Shen.read_byte(Arg7281_2), Shen.call(Shen.fns["append"], [Arg7281_1, [Shen.type_cons, Arg7281_0, []]]), Arg7281_2]);})
  : R0))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.lineread-loop"], [Shen.read_byte(Arg7281_2), Shen.call(Shen.fns["append"], [Arg7281_1, [Shen.type_cons, Arg7281_0, []]]), Arg7281_2]);}))))}, 3, [], "shen.lineread-loop"];





Shen.fns["read-file"] = [Shen.type_func, function shen_user_lambda7292(Arg7291) {
  if (Arg7291.length < 1) return [Shen.type_func, shen_user_lambda7292, 1, Arg7291];
  var Arg7291_0 = Arg7291[0];
  var R0;
  return ((R0 = Shen.call(Shen.fns["read-file-as-bytelist"], [Arg7291_0])),
  (function() {
  return Shen.call_tail(Shen.fns["compile"], [[Shen.type_func, function shen_user_lambda7294(Arg7293) {
  if (Arg7293.length < 1) return [Shen.type_func, shen_user_lambda7294, 1, Arg7293];
  var Arg7293_0 = Arg7293[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.<st_input>"], [Arg7293_0]);})}, 1, [], undefined], R0, [Shen.type_func, function shen_user_lambda7296(Arg7295) {
  if (Arg7295.length < 1) return [Shen.type_func, shen_user_lambda7296, 1, Arg7295];
  var Arg7295_0 = Arg7295[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.read-error"], [Arg7295_0]);})}, 1, [], undefined]]);}))}, 1, [], "read-file"];





Shen.fns["read-from-string"] = [Shen.type_func, function shen_user_lambda7298(Arg7297) {
  if (Arg7297.length < 1) return [Shen.type_func, shen_user_lambda7298, 1, Arg7297];
  var Arg7297_0 = Arg7297[0];
  var R0;
  return ((R0 = Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7300(Arg7299) {
  if (Arg7299.length < 1) return [Shen.type_func, shen_user_lambda7300, 1, Arg7299];
  var Arg7299_0 = Arg7299[0];
  return (function() {
  return Shen.string_$gt$n(Arg7299_0);})}, 1, [], undefined], Shen.call(Shen.fns["explode"], [Arg7297_0])])),
  (function() {
  return Shen.call_tail(Shen.fns["compile"], [[Shen.type_func, function shen_user_lambda7302(Arg7301) {
  if (Arg7301.length < 1) return [Shen.type_func, shen_user_lambda7302, 1, Arg7301];
  var Arg7301_0 = Arg7301[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.<st_input>"], [Arg7301_0]);})}, 1, [], undefined], R0, [Shen.type_func, function shen_user_lambda7304(Arg7303) {
  if (Arg7303.length < 1) return [Shen.type_func, shen_user_lambda7304, 1, Arg7303];
  var Arg7303_0 = Arg7303[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.read-error"], [Arg7303_0]);})}, 1, [], undefined]]);}))}, 1, [], "read-from-string"];





Shen.fns["shen.read-error"] = [Shen.type_func, function shen_user_lambda7306(Arg7305) {
  if (Arg7305.length < 1) return [Shen.type_func, shen_user_lambda7306, 1, Arg7305];
  var Arg7305_0 = Arg7305[0];
  return (((Shen.is_type(Arg7305_0, Shen.type_cons) && (Shen.is_type(Arg7305_0[1], Shen.type_cons) && (Shen.is_type(Arg7305_0[2], Shen.type_cons) && Shen.empty$question$(Arg7305_0[2][2])))))
  ? (function() {
  return Shen.simple_error(("read error here:\x0d\x0a\x0d\x0a " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["shen.compress-50"], [50, Arg7305_0[1]]), "\x0d\x0a", [Shen.type_symbol, "shen.a"]])));})
  : (function() {
  return Shen.simple_error("read error\x0d\x0a");}))}, 1, [], "shen.read-error"];





Shen.fns["shen.compress-50"] = [Shen.type_func, function shen_user_lambda7308(Arg7307) {
  if (Arg7307.length < 2) return [Shen.type_func, shen_user_lambda7308, 2, Arg7307];
  var Arg7307_0 = Arg7307[0], Arg7307_1 = Arg7307[1];
  return ((Shen.empty$question$(Arg7307_1))
  ? ""
  : ((Shen.unwind_tail(Shen.$eq$(0, Arg7307_0)))
  ? ""
  : ((Shen.is_type(Arg7307_1, Shen.type_cons))
  ? (Shen.n_$gt$string(Arg7307_1[1]) + Shen.call(Shen.fns["shen.compress-50"], [(Arg7307_0 - 1), Arg7307_1[2]]))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.compress-50"]]);}))))}, 2, [], "shen.compress-50"];





Shen.fns["shen.<st_input>"] = [Shen.type_func, function shen_user_lambda7310(Arg7309) {
  if (Arg7309.length < 1) return [Shen.type_func, shen_user_lambda7310, 1, Arg7309];
  var Arg7309_0 = Arg7309[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<lsb>"], [Arg7309_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<st_input1>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<rsb>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? ((R1 = Shen.call(Shen.fns["shen.<st_input2>"], [R1])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], [Shen.type_cons, Shen.call(Shen.fns["macroexpand"], [Shen.call(Shen.fns["shen.cons_form"], [Shen.call(Shen.fns["shen.hdtl"], [R0])])]), Shen.call(Shen.fns["shen.hdtl"], [R1])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<lrb>"], [Arg7309_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<st_input1>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<rrb>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? ((R1 = Shen.call(Shen.fns["shen.<st_input2>"], [R1])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], Shen.call(Shen.fns["shen.package-macro"], [Shen.call(Shen.fns["macroexpand"], [Shen.call(Shen.fns["shen.hdtl"], [R0])]), Shen.call(Shen.fns["shen.hdtl"], [R1])])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<lcurly>"], [Arg7309_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<st_input>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_cons, [Shen.type_symbol, "{"], Shen.call(Shen.fns["shen.hdtl"], [R0])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<rcurly>"], [Arg7309_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<st_input>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_cons, [Shen.type_symbol, "}"], Shen.call(Shen.fns["shen.hdtl"], [R0])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<bar>"], [Arg7309_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<st_input>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_cons, [Shen.type_symbol, "bar!"], Shen.call(Shen.fns["shen.hdtl"], [R0])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<semicolon>"], [Arg7309_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<st_input>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_cons, [Shen.type_symbol, ";"], Shen.call(Shen.fns["shen.hdtl"], [R0])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<colon>"], [Arg7309_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<equal>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<st_input>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_cons, [Shen.type_symbol, ":="], Shen.call(Shen.fns["shen.hdtl"], [R0])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<colon>"], [Arg7309_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<minus>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<st_input>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_cons, [Shen.type_symbol, ":-"], Shen.call(Shen.fns["shen.hdtl"], [R0])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<colon>"], [Arg7309_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<st_input>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_cons, [Shen.type_symbol, ":"], Shen.call(Shen.fns["shen.hdtl"], [R0])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<comma>"], [Arg7309_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<st_input>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_cons, [Shen.type_symbol, ","], Shen.call(Shen.fns["shen.hdtl"], [R0])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<comment>"], [Arg7309_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<st_input>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["shen.hdtl"], [R0])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<atom>"], [Arg7309_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<st_input>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], [Shen.type_cons, Shen.call(Shen.fns["macroexpand"], [Shen.call(Shen.fns["shen.hdtl"], [R0])]), Shen.call(Shen.fns["shen.hdtl"], [R1])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<whitespaces>"], [Arg7309_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<st_input>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["shen.hdtl"], [R0])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["<e>"], [Arg7309_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], []]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))}, 1, [], "shen.<st_input>"];





Shen.fns["shen.<lsb>"] = [Shen.type_func, function shen_user_lambda7312(Arg7311) {
  if (Arg7311.length < 1) return [Shen.type_func, shen_user_lambda7312, 1, Arg7311];
  var Arg7311_0 = Arg7311[0];
  var R0;
  return ((((Shen.is_type(Arg7311_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(91, Arg7311_0[1][1]))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7311_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7311_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<lsb>"];





Shen.fns["shen.<rsb>"] = [Shen.type_func, function shen_user_lambda7314(Arg7313) {
  if (Arg7313.length < 1) return [Shen.type_func, shen_user_lambda7314, 1, Arg7313];
  var Arg7313_0 = Arg7313[0];
  var R0;
  return ((((Shen.is_type(Arg7313_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(93, Arg7313_0[1][1]))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7313_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7313_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<rsb>"];





Shen.fns["shen.<lcurly>"] = [Shen.type_func, function shen_user_lambda7316(Arg7315) {
  if (Arg7315.length < 1) return [Shen.type_func, shen_user_lambda7316, 1, Arg7315];
  var Arg7315_0 = Arg7315[0];
  var R0;
  return ((((Shen.is_type(Arg7315_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(123, Arg7315_0[1][1]))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7315_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7315_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<lcurly>"];





Shen.fns["shen.<rcurly>"] = [Shen.type_func, function shen_user_lambda7318(Arg7317) {
  if (Arg7317.length < 1) return [Shen.type_func, shen_user_lambda7318, 1, Arg7317];
  var Arg7317_0 = Arg7317[0];
  var R0;
  return ((((Shen.is_type(Arg7317_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(125, Arg7317_0[1][1]))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7317_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7317_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<rcurly>"];





Shen.fns["shen.<bar>"] = [Shen.type_func, function shen_user_lambda7320(Arg7319) {
  if (Arg7319.length < 1) return [Shen.type_func, shen_user_lambda7320, 1, Arg7319];
  var Arg7319_0 = Arg7319[0];
  var R0;
  return ((((Shen.is_type(Arg7319_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(124, Arg7319_0[1][1]))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7319_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7319_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<bar>"];





Shen.fns["shen.<semicolon>"] = [Shen.type_func, function shen_user_lambda7322(Arg7321) {
  if (Arg7321.length < 1) return [Shen.type_func, shen_user_lambda7322, 1, Arg7321];
  var Arg7321_0 = Arg7321[0];
  var R0;
  return ((((Shen.is_type(Arg7321_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(59, Arg7321_0[1][1]))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7321_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7321_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<semicolon>"];





Shen.fns["shen.<colon>"] = [Shen.type_func, function shen_user_lambda7324(Arg7323) {
  if (Arg7323.length < 1) return [Shen.type_func, shen_user_lambda7324, 1, Arg7323];
  var Arg7323_0 = Arg7323[0];
  var R0;
  return ((((Shen.is_type(Arg7323_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(58, Arg7323_0[1][1]))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7323_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7323_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<colon>"];





Shen.fns["shen.<comma>"] = [Shen.type_func, function shen_user_lambda7326(Arg7325) {
  if (Arg7325.length < 1) return [Shen.type_func, shen_user_lambda7326, 1, Arg7325];
  var Arg7325_0 = Arg7325[0];
  var R0;
  return ((((Shen.is_type(Arg7325_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(44, Arg7325_0[1][1]))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7325_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7325_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<comma>"];





Shen.fns["shen.<equal>"] = [Shen.type_func, function shen_user_lambda7328(Arg7327) {
  if (Arg7327.length < 1) return [Shen.type_func, shen_user_lambda7328, 1, Arg7327];
  var Arg7327_0 = Arg7327[0];
  var R0;
  return ((((Shen.is_type(Arg7327_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(61, Arg7327_0[1][1]))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7327_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7327_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<equal>"];





Shen.fns["shen.<minus>"] = [Shen.type_func, function shen_user_lambda7330(Arg7329) {
  if (Arg7329.length < 1) return [Shen.type_func, shen_user_lambda7330, 1, Arg7329];
  var Arg7329_0 = Arg7329[0];
  var R0;
  return ((((Shen.is_type(Arg7329_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(45, Arg7329_0[1][1]))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7329_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7329_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<minus>"];





Shen.fns["shen.<lrb>"] = [Shen.type_func, function shen_user_lambda7332(Arg7331) {
  if (Arg7331.length < 1) return [Shen.type_func, shen_user_lambda7332, 1, Arg7331];
  var Arg7331_0 = Arg7331[0];
  var R0;
  return ((((Shen.is_type(Arg7331_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(40, Arg7331_0[1][1]))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7331_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7331_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<lrb>"];





Shen.fns["shen.<rrb>"] = [Shen.type_func, function shen_user_lambda7334(Arg7333) {
  if (Arg7333.length < 1) return [Shen.type_func, shen_user_lambda7334, 1, Arg7333];
  var Arg7333_0 = Arg7333[0];
  var R0;
  return ((((Shen.is_type(Arg7333_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(41, Arg7333_0[1][1]))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7333_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7333_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<rrb>"];





Shen.fns["shen.<atom>"] = [Shen.type_func, function shen_user_lambda7336(Arg7335) {
  if (Arg7335.length < 1) return [Shen.type_func, shen_user_lambda7336, 1, Arg7335];
  var Arg7335_0 = Arg7335[0];
  var R0;
  return (((R0 = Shen.call(Shen.fns["shen.<str>"], [Arg7335_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["shen.control-chars"], [Shen.call(Shen.fns["shen.hdtl"], [R0])])]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<number>"], [Arg7335_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["shen.hdtl"], [R0])]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<sym>"], [Arg7335_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], ((Shen.unwind_tail(Shen.$eq$(Shen.call(Shen.fns["shen.hdtl"], [R0]), "<>")))
  ? [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, 0, []]]
  : Shen.intern(Shen.call(Shen.fns["shen.hdtl"], [R0])))]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))
  : R0))}, 1, [], "shen.<atom>"];





Shen.fns["shen.control-chars"] = [Shen.type_func, function shen_user_lambda7338(Arg7337) {
  if (Arg7337.length < 1) return [Shen.type_func, shen_user_lambda7338, 1, Arg7337];
  var Arg7337_0 = Arg7337[0];
  var R0, R1;
  return ((Shen.empty$question$(Arg7337_0))
  ? ""
  : (((Shen.is_type(Arg7337_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$("c", Arg7337_0[1])) && (Shen.is_type(Arg7337_0[2], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$("#", Arg7337_0[2][1]))))))
  ? ((R0 = Shen.call(Shen.fns["shen.code-point"], [Arg7337_0[2][2]])),
  (R1 = Shen.call(Shen.fns["shen.after-codepoint"], [Arg7337_0[2][2]])),
  (function() {
  return Shen.call_tail(Shen.fns["@s"], [Shen.n_$gt$string(Shen.call(Shen.fns["shen.decimalise"], [R0])), Shen.call(Shen.fns["shen.control-chars"], [R1])]);}))
  : ((Shen.is_type(Arg7337_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["@s"], [Arg7337_0[1], Shen.call(Shen.fns["shen.control-chars"], [Arg7337_0[2]])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.control-chars"]]);}))))}, 1, [], "shen.control-chars"];





Shen.fns["shen.code-point"] = [Shen.type_func, function shen_user_lambda7340(Arg7339) {
  if (Arg7339.length < 1) return [Shen.type_func, shen_user_lambda7340, 1, Arg7339];
  var Arg7339_0 = Arg7339[0];
  return (((Shen.is_type(Arg7339_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(";", Arg7339_0[1]))))
  ? ""
  : (((Shen.is_type(Arg7339_0, Shen.type_cons) && Shen.call(Shen.fns["element?"], [Arg7339_0[1], [Shen.type_cons, "0", [Shen.type_cons, "1", [Shen.type_cons, "2", [Shen.type_cons, "3", [Shen.type_cons, "4", [Shen.type_cons, "5", [Shen.type_cons, "6", [Shen.type_cons, "7", [Shen.type_cons, "8", [Shen.type_cons, "9", [Shen.type_cons, "0", []]]]]]]]]]]]])))
  ? [Shen.type_cons, Arg7339_0[1], Shen.call(Shen.fns["shen.code-point"], [Arg7339_0[2]])]
  : (function() {
  return Shen.simple_error(("code point parse error " + Shen.call(Shen.fns["shen.app"], [Arg7339_0, "\x0d\x0a", [Shen.type_symbol, "shen.a"]])));})))}, 1, [], "shen.code-point"];





Shen.fns["shen.after-codepoint"] = [Shen.type_func, function shen_user_lambda7342(Arg7341) {
  if (Arg7341.length < 1) return [Shen.type_func, shen_user_lambda7342, 1, Arg7341];
  var Arg7341_0 = Arg7341[0];
  return ((Shen.empty$question$(Arg7341_0))
  ? []
  : (((Shen.is_type(Arg7341_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(";", Arg7341_0[1]))))
  ? Arg7341_0[2]
  : ((Shen.is_type(Arg7341_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.after-codepoint"], [Arg7341_0[2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.after-codepoint"]]);}))))}, 1, [], "shen.after-codepoint"];





Shen.fns["shen.decimalise"] = [Shen.type_func, function shen_user_lambda7344(Arg7343) {
  if (Arg7343.length < 1) return [Shen.type_func, shen_user_lambda7344, 1, Arg7343];
  var Arg7343_0 = Arg7343[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.pre"], [Shen.call(Shen.fns["reverse"], [Shen.call(Shen.fns["shen.digits->integers"], [Arg7343_0])]), 0]);})}, 1, [], "shen.decimalise"];





Shen.fns["shen.digits->integers"] = [Shen.type_func, function shen_user_lambda7346(Arg7345) {
  if (Arg7345.length < 1) return [Shen.type_func, shen_user_lambda7346, 1, Arg7345];
  var Arg7345_0 = Arg7345[0];
  return (((Shen.is_type(Arg7345_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$("0", Arg7345_0[1]))))
  ? [Shen.type_cons, 0, Shen.call(Shen.fns["shen.digits->integers"], [Arg7345_0[2]])]
  : (((Shen.is_type(Arg7345_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$("1", Arg7345_0[1]))))
  ? [Shen.type_cons, 1, Shen.call(Shen.fns["shen.digits->integers"], [Arg7345_0[2]])]
  : (((Shen.is_type(Arg7345_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$("2", Arg7345_0[1]))))
  ? [Shen.type_cons, 2, Shen.call(Shen.fns["shen.digits->integers"], [Arg7345_0[2]])]
  : (((Shen.is_type(Arg7345_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$("3", Arg7345_0[1]))))
  ? [Shen.type_cons, 3, Shen.call(Shen.fns["shen.digits->integers"], [Arg7345_0[2]])]
  : (((Shen.is_type(Arg7345_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$("4", Arg7345_0[1]))))
  ? [Shen.type_cons, 4, Shen.call(Shen.fns["shen.digits->integers"], [Arg7345_0[2]])]
  : (((Shen.is_type(Arg7345_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$("5", Arg7345_0[1]))))
  ? [Shen.type_cons, 5, Shen.call(Shen.fns["shen.digits->integers"], [Arg7345_0[2]])]
  : (((Shen.is_type(Arg7345_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$("6", Arg7345_0[1]))))
  ? [Shen.type_cons, 6, Shen.call(Shen.fns["shen.digits->integers"], [Arg7345_0[2]])]
  : (((Shen.is_type(Arg7345_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$("7", Arg7345_0[1]))))
  ? [Shen.type_cons, 7, Shen.call(Shen.fns["shen.digits->integers"], [Arg7345_0[2]])]
  : (((Shen.is_type(Arg7345_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$("8", Arg7345_0[1]))))
  ? [Shen.type_cons, 8, Shen.call(Shen.fns["shen.digits->integers"], [Arg7345_0[2]])]
  : (((Shen.is_type(Arg7345_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$("9", Arg7345_0[1]))))
  ? [Shen.type_cons, 9, Shen.call(Shen.fns["shen.digits->integers"], [Arg7345_0[2]])]
  : []))))))))))}, 1, [], "shen.digits->integers"];





Shen.fns["shen.<sym>"] = [Shen.type_func, function shen_user_lambda7348(Arg7347) {
  if (Arg7347.length < 1) return [Shen.type_func, shen_user_lambda7348, 1, Arg7347];
  var Arg7347_0 = Arg7347[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<alpha>"], [Arg7347_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<alphanums>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], Shen.call(Shen.fns["@s"], [Shen.call(Shen.fns["shen.hdtl"], [R0]), Shen.call(Shen.fns["shen.hdtl"], [R1])])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<sym>"];





Shen.fns["shen.<alphanums>"] = [Shen.type_func, function shen_user_lambda7350(Arg7349) {
  if (Arg7349.length < 1) return [Shen.type_func, shen_user_lambda7350, 1, Arg7349];
  var Arg7349_0 = Arg7349[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<alphanum>"], [Arg7349_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<alphanums>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], Shen.call(Shen.fns["@s"], [Shen.call(Shen.fns["shen.hdtl"], [R0]), Shen.call(Shen.fns["shen.hdtl"], [R1])])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["<e>"], [Arg7349_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], ""]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<alphanums>"];





Shen.fns["shen.<alphanum>"] = [Shen.type_func, function shen_user_lambda7352(Arg7351) {
  if (Arg7351.length < 1) return [Shen.type_func, shen_user_lambda7352, 1, Arg7351];
  var Arg7351_0 = Arg7351[0];
  var R0;
  return (((R0 = Shen.call(Shen.fns["shen.<alpha>"], [Arg7351_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["shen.hdtl"], [R0])]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<num>"], [Arg7351_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["shen.hdtl"], [R0])]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<alphanum>"];





Shen.fns["shen.<num>"] = [Shen.type_func, function shen_user_lambda7354(Arg7353) {
  if (Arg7353.length < 1) return [Shen.type_func, shen_user_lambda7354, 1, Arg7353];
  var Arg7353_0 = Arg7353[0];
  var R0;
  return (((Shen.is_type(Arg7353_0[1], Shen.type_cons))
  ? ((R0 = Arg7353_0[1][1]),
  ((Shen.call(Shen.fns["shen.numbyte?"], [R0]))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7353_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7353_0])])[1], Shen.n_$gt$string(R0)]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<num>"];





Shen.fns["shen.numbyte?"] = [Shen.type_func, function shen_user_lambda7356(Arg7355) {
  if (Arg7355.length < 1) return [Shen.type_func, shen_user_lambda7356, 1, Arg7355];
  var Arg7355_0 = Arg7355[0];
  return ((Shen.unwind_tail(Shen.$eq$(48, Arg7355_0)))
  ? true
  : ((Shen.unwind_tail(Shen.$eq$(49, Arg7355_0)))
  ? true
  : ((Shen.unwind_tail(Shen.$eq$(50, Arg7355_0)))
  ? true
  : ((Shen.unwind_tail(Shen.$eq$(51, Arg7355_0)))
  ? true
  : ((Shen.unwind_tail(Shen.$eq$(52, Arg7355_0)))
  ? true
  : ((Shen.unwind_tail(Shen.$eq$(53, Arg7355_0)))
  ? true
  : ((Shen.unwind_tail(Shen.$eq$(54, Arg7355_0)))
  ? true
  : ((Shen.unwind_tail(Shen.$eq$(55, Arg7355_0)))
  ? true
  : ((Shen.unwind_tail(Shen.$eq$(56, Arg7355_0)))
  ? true
  : ((Shen.unwind_tail(Shen.$eq$(57, Arg7355_0)))
  ? true
  : false))))))))))}, 1, [], "shen.numbyte?"];





Shen.fns["shen.<alpha>"] = [Shen.type_func, function shen_user_lambda7358(Arg7357) {
  if (Arg7357.length < 1) return [Shen.type_func, shen_user_lambda7358, 1, Arg7357];
  var Arg7357_0 = Arg7357[0];
  var R0;
  return (((Shen.is_type(Arg7357_0[1], Shen.type_cons))
  ? ((R0 = Arg7357_0[1][1]),
  ((Shen.call(Shen.fns["shen.symbol-code?"], [R0]))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7357_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7357_0])])[1], Shen.n_$gt$string(R0)]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<alpha>"];





Shen.fns["shen.symbol-code?"] = [Shen.type_func, function shen_user_lambda7360(Arg7359) {
  if (Arg7359.length < 1) return [Shen.type_func, shen_user_lambda7360, 1, Arg7359];
  var Arg7359_0 = Arg7359[0];
  return (Shen.unwind_tail(Shen.$eq$(Arg7359_0, 126)) || (((Arg7359_0 > 94) && (Arg7359_0 < 123)) || (((Arg7359_0 > 59) && (Arg7359_0 < 91)) || (((Arg7359_0 > 41) && ((Arg7359_0 < 58) && (!Shen.unwind_tail(Shen.$eq$(Arg7359_0, 44))))) || (((Arg7359_0 > 34) && (Arg7359_0 < 40)) || Shen.unwind_tail(Shen.$eq$(Arg7359_0, 33)))))))}, 1, [], "shen.symbol-code?"];





Shen.fns["shen.<str>"] = [Shen.type_func, function shen_user_lambda7362(Arg7361) {
  if (Arg7361.length < 1) return [Shen.type_func, shen_user_lambda7362, 1, Arg7361];
  var Arg7361_0 = Arg7361[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<dbq>"], [Arg7361_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<strcontents>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<dbq>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], Shen.call(Shen.fns["shen.hdtl"], [R0])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<str>"];





Shen.fns["shen.<dbq>"] = [Shen.type_func, function shen_user_lambda7364(Arg7363) {
  if (Arg7363.length < 1) return [Shen.type_func, shen_user_lambda7364, 1, Arg7363];
  var Arg7363_0 = Arg7363[0];
  var R0;
  return (((Shen.is_type(Arg7363_0[1], Shen.type_cons))
  ? ((R0 = Arg7363_0[1][1]),
  ((Shen.unwind_tail(Shen.$eq$(R0, 34)))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7363_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7363_0])])[1], R0]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<dbq>"];





Shen.fns["shen.<strcontents>"] = [Shen.type_func, function shen_user_lambda7366(Arg7365) {
  if (Arg7365.length < 1) return [Shen.type_func, shen_user_lambda7366, 1, Arg7365];
  var Arg7365_0 = Arg7365[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<strc>"], [Arg7365_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<strcontents>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), Shen.call(Shen.fns["shen.hdtl"], [R1])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["<e>"], [Arg7365_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], []]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<strcontents>"];





Shen.fns["shen.<byte>"] = [Shen.type_func, function shen_user_lambda7368(Arg7367) {
  if (Arg7367.length < 1) return [Shen.type_func, shen_user_lambda7368, 1, Arg7367];
  var Arg7367_0 = Arg7367[0];
  var R0;
  return (((Shen.is_type(Arg7367_0[1], Shen.type_cons))
  ? ((R0 = Arg7367_0[1][1]),
  (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7367_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7367_0])])[1], Shen.n_$gt$string(R0)])))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<byte>"];





Shen.fns["shen.<strc>"] = [Shen.type_func, function shen_user_lambda7370(Arg7369) {
  if (Arg7369.length < 1) return [Shen.type_func, shen_user_lambda7370, 1, Arg7369];
  var Arg7369_0 = Arg7369[0];
  var R0;
  return (((Shen.is_type(Arg7369_0[1], Shen.type_cons))
  ? ((R0 = Arg7369_0[1][1]),
  (((!Shen.unwind_tail(Shen.$eq$(R0, 34))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7369_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7369_0])])[1], Shen.n_$gt$string(R0)]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<strc>"];





Shen.fns["shen.<number>"] = [Shen.type_func, function shen_user_lambda7372(Arg7371) {
  if (Arg7371.length < 1) return [Shen.type_func, shen_user_lambda7372, 1, Arg7371];
  var Arg7371_0 = Arg7371[0];
  var R0, R1, R2;
  return (((R0 = Shen.call(Shen.fns["shen.<minus>"], [Arg7371_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<number>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], (0 - Shen.call(Shen.fns["shen.hdtl"], [R0]))]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<plus>"], [Arg7371_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<number>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["shen.hdtl"], [R0])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<predigits>"], [Arg7371_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<stop>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? ((R1 = Shen.call(Shen.fns["shen.<postdigits>"], [R1])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? ((R2 = Shen.call(Shen.fns["shen.<E>"], [R1])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R2))))
  ? ((R2 = Shen.call(Shen.fns["shen.<log10>"], [R2])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R2))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R2[1], (Shen.call(Shen.fns["shen.expt"], [10, Shen.call(Shen.fns["shen.hdtl"], [R2])]) * (Shen.call(Shen.fns["shen.pre"], [Shen.call(Shen.fns["reverse"], [Shen.call(Shen.fns["shen.hdtl"], [R0])]), 0]) + Shen.call(Shen.fns["shen.post"], [Shen.call(Shen.fns["shen.hdtl"], [R1]), 1])))]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<digits>"], [Arg7371_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<E>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? ((R1 = Shen.call(Shen.fns["shen.<log10>"], [R1])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], (Shen.call(Shen.fns["shen.expt"], [10, Shen.call(Shen.fns["shen.hdtl"], [R1])]) * Shen.call(Shen.fns["shen.pre"], [Shen.call(Shen.fns["reverse"], [Shen.call(Shen.fns["shen.hdtl"], [R0])]), 0]))]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<predigits>"], [Arg7371_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<stop>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? ((R1 = Shen.call(Shen.fns["shen.<postdigits>"], [R1])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], (Shen.call(Shen.fns["shen.pre"], [Shen.call(Shen.fns["reverse"], [Shen.call(Shen.fns["shen.hdtl"], [R0])]), 0]) + Shen.call(Shen.fns["shen.post"], [Shen.call(Shen.fns["shen.hdtl"], [R1]), 1]))]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<digits>"], [Arg7371_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["shen.pre"], [Shen.call(Shen.fns["reverse"], [Shen.call(Shen.fns["shen.hdtl"], [R0])]), 0])]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))}, 1, [], "shen.<number>"];





Shen.fns["shen.<E>"] = [Shen.type_func, function shen_user_lambda7374(Arg7373) {
  if (Arg7373.length < 1) return [Shen.type_func, shen_user_lambda7374, 1, Arg7373];
  var Arg7373_0 = Arg7373[0];
  var R0;
  return ((((Shen.is_type(Arg7373_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(101, Arg7373_0[1][1]))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7373_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7373_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<E>"];





Shen.fns["shen.<log10>"] = [Shen.type_func, function shen_user_lambda7376(Arg7375) {
  if (Arg7375.length < 1) return [Shen.type_func, shen_user_lambda7376, 1, Arg7375];
  var Arg7375_0 = Arg7375[0];
  var R0;
  return (((R0 = Shen.call(Shen.fns["shen.<minus>"], [Arg7375_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<digits>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], (0 - Shen.call(Shen.fns["shen.pre"], [Shen.call(Shen.fns["reverse"], [Shen.call(Shen.fns["shen.hdtl"], [R0])]), 0]))]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<digits>"], [Arg7375_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["shen.pre"], [Shen.call(Shen.fns["reverse"], [Shen.call(Shen.fns["shen.hdtl"], [R0])]), 0])]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<log10>"];





Shen.fns["shen.<plus>"] = [Shen.type_func, function shen_user_lambda7378(Arg7377) {
  if (Arg7377.length < 1) return [Shen.type_func, shen_user_lambda7378, 1, Arg7377];
  var Arg7377_0 = Arg7377[0];
  var R0;
  return (((Shen.is_type(Arg7377_0[1], Shen.type_cons))
  ? ((R0 = Arg7377_0[1][1]),
  ((Shen.unwind_tail(Shen.$eq$(R0, 43)))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7377_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7377_0])])[1], R0]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<plus>"];





Shen.fns["shen.<stop>"] = [Shen.type_func, function shen_user_lambda7380(Arg7379) {
  if (Arg7379.length < 1) return [Shen.type_func, shen_user_lambda7380, 1, Arg7379];
  var Arg7379_0 = Arg7379[0];
  var R0;
  return (((Shen.is_type(Arg7379_0[1], Shen.type_cons))
  ? ((R0 = Arg7379_0[1][1]),
  ((Shen.unwind_tail(Shen.$eq$(R0, 46)))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7379_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7379_0])])[1], R0]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<stop>"];





Shen.fns["shen.<predigits>"] = [Shen.type_func, function shen_user_lambda7382(Arg7381) {
  if (Arg7381.length < 1) return [Shen.type_func, shen_user_lambda7382, 1, Arg7381];
  var Arg7381_0 = Arg7381[0];
  var R0;
  return (((R0 = Shen.call(Shen.fns["shen.<digits>"], [Arg7381_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["shen.hdtl"], [R0])]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["<e>"], [Arg7381_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], []]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<predigits>"];





Shen.fns["shen.<postdigits>"] = [Shen.type_func, function shen_user_lambda7384(Arg7383) {
  if (Arg7383.length < 1) return [Shen.type_func, shen_user_lambda7384, 1, Arg7383];
  var Arg7383_0 = Arg7383[0];
  var R0;
  return (((R0 = Shen.call(Shen.fns["shen.<digits>"], [Arg7383_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["shen.hdtl"], [R0])]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<postdigits>"];





Shen.fns["shen.<digits>"] = [Shen.type_func, function shen_user_lambda7386(Arg7385) {
  if (Arg7385.length < 1) return [Shen.type_func, shen_user_lambda7386, 1, Arg7385];
  var Arg7385_0 = Arg7385[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<digit>"], [Arg7385_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<digits>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), Shen.call(Shen.fns["shen.hdtl"], [R1])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<digit>"], [Arg7385_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), []]]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<digits>"];





Shen.fns["shen.<digit>"] = [Shen.type_func, function shen_user_lambda7388(Arg7387) {
  if (Arg7387.length < 1) return [Shen.type_func, shen_user_lambda7388, 1, Arg7387];
  var Arg7387_0 = Arg7387[0];
  var R0;
  return (((Shen.is_type(Arg7387_0[1], Shen.type_cons))
  ? ((R0 = Arg7387_0[1][1]),
  ((Shen.call(Shen.fns["shen.numbyte?"], [R0]))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7387_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7387_0])])[1], Shen.call(Shen.fns["shen.byte->digit"], [R0])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<digit>"];





Shen.fns["shen.byte->digit"] = [Shen.type_func, function shen_user_lambda7390(Arg7389) {
  if (Arg7389.length < 1) return [Shen.type_func, shen_user_lambda7390, 1, Arg7389];
  var Arg7389_0 = Arg7389[0];
  return ((Shen.unwind_tail(Shen.$eq$(48, Arg7389_0)))
  ? 0
  : ((Shen.unwind_tail(Shen.$eq$(49, Arg7389_0)))
  ? 1
  : ((Shen.unwind_tail(Shen.$eq$(50, Arg7389_0)))
  ? 2
  : ((Shen.unwind_tail(Shen.$eq$(51, Arg7389_0)))
  ? 3
  : ((Shen.unwind_tail(Shen.$eq$(52, Arg7389_0)))
  ? 4
  : ((Shen.unwind_tail(Shen.$eq$(53, Arg7389_0)))
  ? 5
  : ((Shen.unwind_tail(Shen.$eq$(54, Arg7389_0)))
  ? 6
  : ((Shen.unwind_tail(Shen.$eq$(55, Arg7389_0)))
  ? 7
  : ((Shen.unwind_tail(Shen.$eq$(56, Arg7389_0)))
  ? 8
  : ((Shen.unwind_tail(Shen.$eq$(57, Arg7389_0)))
  ? 9
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.byte->digit"]]);})))))))))))}, 1, [], "shen.byte->digit"];





Shen.fns["shen.pre"] = [Shen.type_func, function shen_user_lambda7392(Arg7391) {
  if (Arg7391.length < 2) return [Shen.type_func, shen_user_lambda7392, 2, Arg7391];
  var Arg7391_0 = Arg7391[0], Arg7391_1 = Arg7391[1];
  return ((Shen.empty$question$(Arg7391_0))
  ? 0
  : ((Shen.is_type(Arg7391_0, Shen.type_cons))
  ? ((Shen.call(Shen.fns["shen.expt"], [10, Arg7391_1]) * Arg7391_0[1]) + Shen.call(Shen.fns["shen.pre"], [Arg7391_0[2], (Arg7391_1 + 1)]))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.pre"]]);})))}, 2, [], "shen.pre"];





Shen.fns["shen.post"] = [Shen.type_func, function shen_user_lambda7394(Arg7393) {
  if (Arg7393.length < 2) return [Shen.type_func, shen_user_lambda7394, 2, Arg7393];
  var Arg7393_0 = Arg7393[0], Arg7393_1 = Arg7393[1];
  return ((Shen.empty$question$(Arg7393_0))
  ? 0
  : ((Shen.is_type(Arg7393_0, Shen.type_cons))
  ? ((Shen.call(Shen.fns["shen.expt"], [10, (0 - Arg7393_1)]) * Arg7393_0[1]) + Shen.call(Shen.fns["shen.post"], [Arg7393_0[2], (Arg7393_1 + 1)]))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.post"]]);})))}, 2, [], "shen.post"];





Shen.fns["shen.expt"] = [Shen.type_func, function shen_user_lambda7396(Arg7395) {
  if (Arg7395.length < 2) return [Shen.type_func, shen_user_lambda7396, 2, Arg7395];
  var Arg7395_0 = Arg7395[0], Arg7395_1 = Arg7395[1];
  return ((Shen.unwind_tail(Shen.$eq$(0, Arg7395_1)))
  ? 1
  : (((Arg7395_1 > 0))
  ? (Arg7395_0 * Shen.call(Shen.fns["shen.expt"], [Arg7395_0, (Arg7395_1 - 1)]))
  : (1 * (Shen.call(Shen.fns["shen.expt"], [Arg7395_0, (Arg7395_1 + 1)]) / Arg7395_0))))}, 2, [], "shen.expt"];





Shen.fns["shen.<st_input1>"] = [Shen.type_func, function shen_user_lambda7398(Arg7397) {
  if (Arg7397.length < 1) return [Shen.type_func, shen_user_lambda7398, 1, Arg7397];
  var Arg7397_0 = Arg7397[0];
  var R0;
  return (((R0 = Shen.call(Shen.fns["shen.<st_input>"], [Arg7397_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["shen.hdtl"], [R0])]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<st_input1>"];





Shen.fns["shen.<st_input2>"] = [Shen.type_func, function shen_user_lambda7400(Arg7399) {
  if (Arg7399.length < 1) return [Shen.type_func, shen_user_lambda7400, 1, Arg7399];
  var Arg7399_0 = Arg7399[0];
  var R0;
  return (((R0 = Shen.call(Shen.fns["shen.<st_input>"], [Arg7399_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["shen.hdtl"], [R0])]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<st_input2>"];





Shen.fns["shen.<comment>"] = [Shen.type_func, function shen_user_lambda7402(Arg7401) {
  if (Arg7401.length < 1) return [Shen.type_func, shen_user_lambda7402, 1, Arg7401];
  var Arg7401_0 = Arg7401[0];
  var R0;
  return (((R0 = Shen.call(Shen.fns["shen.<singleline>"], [Arg7401_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<multiline>"], [Arg7401_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<comment>"];





Shen.fns["shen.<singleline>"] = [Shen.type_func, function shen_user_lambda7404(Arg7403) {
  if (Arg7403.length < 1) return [Shen.type_func, shen_user_lambda7404, 1, Arg7403];
  var Arg7403_0 = Arg7403[0];
  var R0;
  return (((R0 = Shen.call(Shen.fns["shen.<backslash>"], [Arg7403_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<backslash>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<anysingle>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<return>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<singleline>"];





Shen.fns["shen.<backslash>"] = [Shen.type_func, function shen_user_lambda7406(Arg7405) {
  if (Arg7405.length < 1) return [Shen.type_func, shen_user_lambda7406, 1, Arg7405];
  var Arg7405_0 = Arg7405[0];
  var R0;
  return ((((Shen.is_type(Arg7405_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(92, Arg7405_0[1][1]))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7405_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7405_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<backslash>"];





Shen.fns["shen.<anysingle>"] = [Shen.type_func, function shen_user_lambda7408(Arg7407) {
  if (Arg7407.length < 1) return [Shen.type_func, shen_user_lambda7408, 1, Arg7407];
  var Arg7407_0 = Arg7407[0];
  var R0;
  return (((R0 = Shen.call(Shen.fns["shen.<non-return>"], [Arg7407_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<anysingle>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["<e>"], [Arg7407_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<anysingle>"];





Shen.fns["shen.<non-return>"] = [Shen.type_func, function shen_user_lambda7410(Arg7409) {
  if (Arg7409.length < 1) return [Shen.type_func, shen_user_lambda7410, 1, Arg7409];
  var Arg7409_0 = Arg7409[0];
  var R0;
  return (((Shen.is_type(Arg7409_0[1], Shen.type_cons))
  ? ((R0 = Arg7409_0[1][1]),
  (((!Shen.call(Shen.fns["element?"], [R0, [Shen.type_cons, 10, [Shen.type_cons, 13, []]]])))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7409_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7409_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<non-return>"];





Shen.fns["shen.<return>"] = [Shen.type_func, function shen_user_lambda7412(Arg7411) {
  if (Arg7411.length < 1) return [Shen.type_func, shen_user_lambda7412, 1, Arg7411];
  var Arg7411_0 = Arg7411[0];
  var R0;
  return (((Shen.is_type(Arg7411_0[1], Shen.type_cons))
  ? ((R0 = Arg7411_0[1][1]),
  ((Shen.call(Shen.fns["element?"], [R0, [Shen.type_cons, 10, [Shen.type_cons, 13, []]]]))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7411_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7411_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<return>"];





Shen.fns["shen.<multiline>"] = [Shen.type_func, function shen_user_lambda7414(Arg7413) {
  if (Arg7413.length < 1) return [Shen.type_func, shen_user_lambda7414, 1, Arg7413];
  var Arg7413_0 = Arg7413[0];
  var R0;
  return (((R0 = Shen.call(Shen.fns["shen.<backslash>"], [Arg7413_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<times>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<anymulti>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<multiline>"];





Shen.fns["shen.<times>"] = [Shen.type_func, function shen_user_lambda7416(Arg7415) {
  if (Arg7415.length < 1) return [Shen.type_func, shen_user_lambda7416, 1, Arg7415];
  var Arg7415_0 = Arg7415[0];
  var R0;
  return ((((Shen.is_type(Arg7415_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(42, Arg7415_0[1][1]))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7415_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7415_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<times>"];





Shen.fns["shen.<anymulti>"] = [Shen.type_func, function shen_user_lambda7418(Arg7417) {
  if (Arg7417.length < 1) return [Shen.type_func, shen_user_lambda7418, 1, Arg7417];
  var Arg7417_0 = Arg7417[0];
  var R0;
  return (((R0 = Shen.call(Shen.fns["shen.<comment>"], [Arg7417_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<anymulti>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<times>"], [Arg7417_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<backslash>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((Shen.is_type(Arg7417_0[1], Shen.type_cons))
  ? (Arg7417_0[1][1],
  (R0 = Shen.call(Shen.fns["shen.<anymulti>"], [Shen.call(Shen.fns["shen.pair"], [Arg7417_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7417_0])])])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))
  : R0))}, 1, [], "shen.<anymulti>"];





Shen.fns["shen.<whitespaces>"] = [Shen.type_func, function shen_user_lambda7420(Arg7419) {
  if (Arg7419.length < 1) return [Shen.type_func, shen_user_lambda7420, 1, Arg7419];
  var Arg7419_0 = Arg7419[0];
  var R0;
  return (((R0 = Shen.call(Shen.fns["shen.<whitespace>"], [Arg7419_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R0 = Shen.call(Shen.fns["shen.<whitespaces>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["shen.<whitespace>"], [Arg7419_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<whitespaces>"];





Shen.fns["shen.<whitespace>"] = [Shen.type_func, function shen_user_lambda7422(Arg7421) {
  if (Arg7421.length < 1) return [Shen.type_func, shen_user_lambda7422, 1, Arg7421];
  var Arg7421_0 = Arg7421[0];
  var R0;
  return (((Shen.is_type(Arg7421_0[1], Shen.type_cons))
  ? ((R0 = Arg7421_0[1][1]),
  ((((R0 = R0),
  (Shen.unwind_tail(Shen.$eq$(R0, 32)) || (Shen.unwind_tail(Shen.$eq$(R0, 13)) || (Shen.unwind_tail(Shen.$eq$(R0, 10)) || Shen.unwind_tail(Shen.$eq$(R0, 9)))))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7421_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7421_0])])[1], [Shen.type_symbol, "shen.skip"]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<whitespace>"];





Shen.fns["shen.cons_form"] = [Shen.type_func, function shen_user_lambda7424(Arg7423) {
  if (Arg7423.length < 1) return [Shen.type_func, shen_user_lambda7424, 1, Arg7423];
  var Arg7423_0 = Arg7423[0];
  return ((Shen.empty$question$(Arg7423_0))
  ? []
  : (((Shen.is_type(Arg7423_0, Shen.type_cons) && (Shen.is_type(Arg7423_0[2], Shen.type_cons) && (Shen.is_type(Arg7423_0[2][2], Shen.type_cons) && (Shen.empty$question$(Arg7423_0[2][2][2]) && Shen.unwind_tail(Shen.$eq$(Arg7423_0[2][1], [Shen.type_symbol, "bar!"])))))))
  ? [Shen.type_cons, [Shen.type_symbol, "cons"], [Shen.type_cons, Arg7423_0[1], Arg7423_0[2][2]]]
  : ((Shen.is_type(Arg7423_0, Shen.type_cons))
  ? [Shen.type_cons, [Shen.type_symbol, "cons"], [Shen.type_cons, Arg7423_0[1], [Shen.type_cons, Shen.call(Shen.fns["shen.cons_form"], [Arg7423_0[2]]), []]]]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.cons_form"]]);}))))}, 1, [], "shen.cons_form"];





Shen.fns["shen.package-macro"] = [Shen.type_func, function shen_user_lambda7426(Arg7425) {
  if (Arg7425.length < 2) return [Shen.type_func, shen_user_lambda7426, 2, Arg7425];
  var Arg7425_0 = Arg7425[0], Arg7425_1 = Arg7425[1];
  var R0, R1;
  return (((Shen.is_type(Arg7425_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "$"], Arg7425_0[1])) && (Shen.is_type(Arg7425_0[2], Shen.type_cons) && Shen.empty$question$(Arg7425_0[2][2])))))
  ? (function() {
  return Shen.call_tail(Shen.fns["append"], [Shen.call(Shen.fns["explode"], [Arg7425_0[2][1]]), Arg7425_1]);})
  : (((Shen.is_type(Arg7425_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "package"], Arg7425_0[1])) && (Shen.is_type(Arg7425_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "null"], Arg7425_0[2][1])) && Shen.is_type(Arg7425_0[2][2], Shen.type_cons))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["append"], [Arg7425_0[2][2][2], Arg7425_1]);})
  : (((Shen.is_type(Arg7425_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "package"], Arg7425_0[1])) && (Shen.is_type(Arg7425_0[2], Shen.type_cons) && Shen.is_type(Arg7425_0[2][2], Shen.type_cons)))))
  ? ((R0 = Shen.call(Shen.fns["shen.eval-without-macros"], [Arg7425_0[2][2][1]])),
  Shen.call(Shen.fns["shen.record-exceptions"], [R0, Arg7425_0[2][1]]),
  (R1 = Shen.intern((Shen.str(Arg7425_0[2][1]) + "."))),
  (function() {
  return Shen.call_tail(Shen.fns["append"], [Shen.call(Shen.fns["shen.packageh"], [R1, R0, Arg7425_0[2][2][2]]), Arg7425_1]);}))
  : [Shen.type_cons, Arg7425_0, Arg7425_1])))}, 2, [], "shen.package-macro"];





Shen.fns["shen.record-exceptions"] = [Shen.type_func, function shen_user_lambda7430(Arg7427) {
  if (Arg7427.length < 2) return [Shen.type_func, shen_user_lambda7430, 2, Arg7427];
  var Arg7427_0 = Arg7427[0], Arg7427_1 = Arg7427[1];
  var R0, R1;
  return (((R0 = [Shen.type_func, function shen_user_lambda7432(Arg7431) {
  if (Arg7431.length < 2) return [Shen.type_func, shen_user_lambda7432, 2, Arg7431];
  var Arg7431_0 = Arg7431[0], Arg7431_1 = Arg7431[1];
  return (function() {
  return Shen.call_tail(Shen.fns["get"], [Arg7431_1, [Shen.type_symbol, "shen.external-symbols"], (Shen.globals["*property-vector*"])]);})}, 2, [Arg7427_0, Arg7427_1], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda7434(Arg7433) {
  if (Arg7433.length < 1) return [Shen.type_func, shen_user_lambda7434, 1, Arg7433];
  var Arg7433_0 = Arg7433[0];
  return []}, 1, [], undefined]),
  (R0 = Shen.trap_error(R0, R1))),
  (R0 = Shen.call(Shen.fns["union"], [Arg7427_0, R0])),
  (function() {
  return Shen.call_tail(Shen.fns["put"], [Arg7427_1, [Shen.type_symbol, "shen.external-symbols"], R0, (Shen.globals["*property-vector*"])]);}))}, 2, [], "shen.record-exceptions"];





Shen.fns["shen.packageh"] = [Shen.type_func, function shen_user_lambda7436(Arg7435) {
  if (Arg7435.length < 3) return [Shen.type_func, shen_user_lambda7436, 3, Arg7435];
  var Arg7435_0 = Arg7435[0], Arg7435_1 = Arg7435[1], Arg7435_2 = Arg7435[2];
  return ((Shen.is_type(Arg7435_2, Shen.type_cons))
  ? [Shen.type_cons, Shen.call(Shen.fns["shen.packageh"], [Arg7435_0, Arg7435_1, Arg7435_2[1]]), Shen.call(Shen.fns["shen.packageh"], [Arg7435_0, Arg7435_1, Arg7435_2[2]])]
  : (((Shen.call(Shen.fns["shen.sysfunc?"], [Arg7435_2]) || (Shen.call(Shen.fns["variable?"], [Arg7435_2]) || (Shen.call(Shen.fns["element?"], [Arg7435_2, Arg7435_1]) || (Shen.call(Shen.fns["shen.doubleunderline?"], [Arg7435_2]) || Shen.call(Shen.fns["shen.singleunderline?"], [Arg7435_2]))))))
  ? Arg7435_2
  : (((Shen.is_type(Arg7435_2, Shen.type_symbol) && (!Shen.call(Shen.fns["shen.prefix?"], [[Shen.type_cons, "s", [Shen.type_cons, "h", [Shen.type_cons, "e", [Shen.type_cons, "n", [Shen.type_cons, ".", []]]]]], Shen.call(Shen.fns["explode"], [Arg7435_2])]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["concat"], [Arg7435_0, Arg7435_2]);})
  : Arg7435_2)))}, 3, [], "shen.packageh"];










Shen.fns["shen.<defprolog>"] = [Shen.type_func, function shen_user_lambda7007(Arg7006) {
  if (Arg7006.length < 1) return [Shen.type_func, shen_user_lambda7007, 1, Arg7006];
  var Arg7006_0 = Arg7006[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<predicate*>"], [Arg7006_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<clauses*>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], Shen.call(Shen.fns["shen.prolog->shen"], [Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7009(Arg7008) {
  if (Arg7008.length < 2) return [Shen.type_func, shen_user_lambda7009, 2, Arg7008];
  var Arg7008_0 = Arg7008[0], Arg7008_1 = Arg7008[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.insert-predicate"], [Shen.call(Shen.fns["shen.hdtl"], [Arg7008_0]), Arg7008_1]);})}, 2, [R0], undefined], Shen.call(Shen.fns["shen.hdtl"], [R1])])])[1]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<defprolog>"];





Shen.fns["shen.prolog-error"] = [Shen.type_func, function shen_user_lambda7011(Arg7010) {
  if (Arg7010.length < 2) return [Shen.type_func, shen_user_lambda7011, 2, Arg7010];
  var Arg7010_0 = Arg7010[0], Arg7010_1 = Arg7010[1];
  return (((Shen.is_type(Arg7010_1, Shen.type_cons) && (Shen.is_type(Arg7010_1[2], Shen.type_cons) && Shen.empty$question$(Arg7010_1[2][2]))))
  ? (function() {
  return Shen.simple_error(("prolog syntax error in " + Shen.call(Shen.fns["shen.app"], [Arg7010_0, (" here:\x0d\x0a\x0d\x0a " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["shen.next-50"], [50, Arg7010_1[1]]), "\x0d\x0a", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])));})
  : (function() {
  return Shen.simple_error(("prolog syntax error in " + Shen.call(Shen.fns["shen.app"], [Arg7010_0, "\x0d\x0a", [Shen.type_symbol, "shen.a"]])));}))}, 2, [], "shen.prolog-error"];





Shen.fns["shen.next-50"] = [Shen.type_func, function shen_user_lambda7013(Arg7012) {
  if (Arg7012.length < 2) return [Shen.type_func, shen_user_lambda7013, 2, Arg7012];
  var Arg7012_0 = Arg7012[0], Arg7012_1 = Arg7012[1];
  return ((Shen.empty$question$(Arg7012_1))
  ? ""
  : ((Shen.unwind_tail(Shen.$eq$(0, Arg7012_0)))
  ? ""
  : ((Shen.is_type(Arg7012_1, Shen.type_cons))
  ? (Shen.call(Shen.fns["shen.decons-string"], [Arg7012_1[1]]) + Shen.call(Shen.fns["shen.next-50"], [(Arg7012_0 - 1), Arg7012_1[2]]))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.next-50"]]);}))))}, 2, [], "shen.next-50"];





Shen.fns["shen.decons-string"] = [Shen.type_func, function shen_user_lambda7015(Arg7014) {
  if (Arg7014.length < 1) return [Shen.type_func, shen_user_lambda7015, 1, Arg7014];
  var Arg7014_0 = Arg7014[0];
  return (((Shen.is_type(Arg7014_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cons"], Arg7014_0[1])) && (Shen.is_type(Arg7014_0[2], Shen.type_cons) && (Shen.is_type(Arg7014_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg7014_0[2][2][2]))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.app"], [Shen.call(Shen.fns["shen.eval-cons"], [Arg7014_0]), " ", [Shen.type_symbol, "shen.s"]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.app"], [Arg7014_0, " ", [Shen.type_symbol, "shen.r"]]);}))}, 1, [], "shen.decons-string"];





Shen.fns["shen.insert-predicate"] = [Shen.type_func, function shen_user_lambda7017(Arg7016) {
  if (Arg7016.length < 2) return [Shen.type_func, shen_user_lambda7017, 2, Arg7016];
  var Arg7016_0 = Arg7016[0], Arg7016_1 = Arg7016[1];
  return (((Shen.is_type(Arg7016_1, Shen.type_cons) && (Shen.is_type(Arg7016_1[2], Shen.type_cons) && Shen.empty$question$(Arg7016_1[2][2]))))
  ? [Shen.type_cons, [Shen.type_cons, Arg7016_0, Arg7016_1[1]], [Shen.type_cons, [Shen.type_symbol, ":-"], Arg7016_1[2]]]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.insert-predicate"]]);}))}, 2, [], "shen.insert-predicate"];





Shen.fns["shen.<predicate*>"] = [Shen.type_func, function shen_user_lambda7019(Arg7018) {
  if (Arg7018.length < 1) return [Shen.type_func, shen_user_lambda7019, 1, Arg7018];
  var Arg7018_0 = Arg7018[0];
  var R0;
  return (((Shen.is_type(Arg7018_0[1], Shen.type_cons))
  ? ((R0 = Arg7018_0[1][1]),
  (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7018_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7018_0])])[1], R0])))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<predicate*>"];





Shen.fns["shen.<clauses*>"] = [Shen.type_func, function shen_user_lambda7021(Arg7020) {
  if (Arg7020.length < 1) return [Shen.type_func, shen_user_lambda7021, 1, Arg7020];
  var Arg7020_0 = Arg7020[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<clause*>"], [Arg7020_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<clauses*>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), Shen.call(Shen.fns["shen.hdtl"], [R1])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["<e>"], [Arg7020_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["append"], [Shen.call(Shen.fns["shen.hdtl"], [R0]), []])]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<clauses*>"];





Shen.fns["shen.<clause*>"] = [Shen.type_func, function shen_user_lambda7023(Arg7022) {
  if (Arg7022.length < 1) return [Shen.type_func, shen_user_lambda7023, 1, Arg7022];
  var Arg7022_0 = Arg7022[0];
  var R0, R1, R2;
  return (((R0 = Shen.call(Shen.fns["shen.<head*>"], [Arg7022_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (((Shen.is_type(R0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "<--"], R0[1][1]))))
  ? ((R1 = Shen.call(Shen.fns["shen.<body*>"], [Shen.call(Shen.fns["shen.pair"], [R0[1][2], Shen.call(Shen.fns["shen.hdtl"], [R0])])])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? ((R2 = Shen.call(Shen.fns["shen.<end*>"], [R1])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R2))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R2[1], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R1]), []]]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<clause*>"];





Shen.fns["shen.<head*>"] = [Shen.type_func, function shen_user_lambda7025(Arg7024) {
  if (Arg7024.length < 1) return [Shen.type_func, shen_user_lambda7025, 1, Arg7024];
  var Arg7024_0 = Arg7024[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<term*>"], [Arg7024_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<head*>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), Shen.call(Shen.fns["shen.hdtl"], [R1])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["<e>"], [Arg7024_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["append"], [Shen.call(Shen.fns["shen.hdtl"], [R0]), []])]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<head*>"];





Shen.fns["shen.<term*>"] = [Shen.type_func, function shen_user_lambda7027(Arg7026) {
  if (Arg7026.length < 1) return [Shen.type_func, shen_user_lambda7027, 1, Arg7026];
  var Arg7026_0 = Arg7026[0];
  var R0;
  return (((Shen.is_type(Arg7026_0[1], Shen.type_cons))
  ? ((R0 = Arg7026_0[1][1]),
  ((((!Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "<--"], R0))) && Shen.call(Shen.fns["shen.legitimate-term?"], [R0])))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7026_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7026_0])])[1], Shen.call(Shen.fns["shen.eval-cons"], [R0])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<term*>"];





Shen.fns["shen.legitimate-term?"] = [Shen.type_func, function shen_user_lambda7029(Arg7028) {
  if (Arg7028.length < 1) return [Shen.type_func, shen_user_lambda7029, 1, Arg7028];
  var Arg7028_0 = Arg7028[0];
  return (((Shen.is_type(Arg7028_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cons"], Arg7028_0[1])) && (Shen.is_type(Arg7028_0[2], Shen.type_cons) && (Shen.is_type(Arg7028_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg7028_0[2][2][2]))))))
  ? (Shen.call(Shen.fns["shen.legitimate-term?"], [Arg7028_0[2][1]]) && Shen.call(Shen.fns["shen.legitimate-term?"], [Arg7028_0[2][2][1]]))
  : (((Shen.is_type(Arg7028_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "mode"], Arg7028_0[1])) && (Shen.is_type(Arg7028_0[2], Shen.type_cons) && (Shen.is_type(Arg7028_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "+"], Arg7028_0[2][2][1])) && Shen.empty$question$(Arg7028_0[2][2][2])))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.legitimate-term?"], [Arg7028_0[2][1]]);})
  : (((Shen.is_type(Arg7028_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "mode"], Arg7028_0[1])) && (Shen.is_type(Arg7028_0[2], Shen.type_cons) && (Shen.is_type(Arg7028_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "-"], Arg7028_0[2][2][1])) && Shen.empty$question$(Arg7028_0[2][2][2])))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.legitimate-term?"], [Arg7028_0[2][1]]);})
  : ((Shen.is_type(Arg7028_0, Shen.type_cons))
  ? false
  : true))))}, 1, [], "shen.legitimate-term?"];





Shen.fns["shen.eval-cons"] = [Shen.type_func, function shen_user_lambda7031(Arg7030) {
  if (Arg7030.length < 1) return [Shen.type_func, shen_user_lambda7031, 1, Arg7030];
  var Arg7030_0 = Arg7030[0];
  return (((Shen.is_type(Arg7030_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cons"], Arg7030_0[1])) && (Shen.is_type(Arg7030_0[2], Shen.type_cons) && (Shen.is_type(Arg7030_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg7030_0[2][2][2]))))))
  ? [Shen.type_cons, Shen.call(Shen.fns["shen.eval-cons"], [Arg7030_0[2][1]]), Shen.call(Shen.fns["shen.eval-cons"], [Arg7030_0[2][2][1]])]
  : (((Shen.is_type(Arg7030_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "mode"], Arg7030_0[1])) && (Shen.is_type(Arg7030_0[2], Shen.type_cons) && (Shen.is_type(Arg7030_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg7030_0[2][2][2]))))))
  ? [Shen.type_cons, [Shen.type_symbol, "mode"], [Shen.type_cons, Shen.call(Shen.fns["shen.eval-cons"], [Arg7030_0[2][1]]), Arg7030_0[2][2]]]
  : Arg7030_0))}, 1, [], "shen.eval-cons"];





Shen.fns["shen.<body*>"] = [Shen.type_func, function shen_user_lambda7033(Arg7032) {
  if (Arg7032.length < 1) return [Shen.type_func, shen_user_lambda7033, 1, Arg7032];
  var Arg7032_0 = Arg7032[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<literal*>"], [Arg7032_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<body*>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), Shen.call(Shen.fns["shen.hdtl"], [R1])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((R0 = Shen.call(Shen.fns["<e>"], [Arg7032_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R0[1], Shen.call(Shen.fns["append"], [Shen.call(Shen.fns["shen.hdtl"], [R0]), []])]))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<body*>"];





Shen.fns["shen.<literal*>"] = [Shen.type_func, function shen_user_lambda7035(Arg7034) {
  if (Arg7034.length < 1) return [Shen.type_func, shen_user_lambda7035, 1, Arg7034];
  var Arg7034_0 = Arg7034[0];
  var R0;
  return ((((Shen.is_type(Arg7034_0[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "!"], Arg7034_0[1][1]))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7034_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7034_0])])[1], [Shen.type_cons, [Shen.type_symbol, "cut"], [Shen.type_cons, [Shen.type_symbol, "Throwcontrol"], []]]]))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (((Shen.is_type(Arg7034_0[1], Shen.type_cons))
  ? ((R0 = Arg7034_0[1][1]),
  ((Shen.is_type(R0, Shen.type_cons))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7034_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7034_0])])[1], R0]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))
  : R0))}, 1, [], "shen.<literal*>"];





Shen.fns["shen.<end*>"] = [Shen.type_func, function shen_user_lambda7037(Arg7036) {
  if (Arg7036.length < 1) return [Shen.type_func, shen_user_lambda7037, 1, Arg7036];
  var Arg7036_0 = Arg7036[0];
  var R0;
  return (((Shen.is_type(Arg7036_0[1], Shen.type_cons))
  ? ((R0 = Arg7036_0[1][1]),
  ((Shen.unwind_tail(Shen.$eq$(R0, [Shen.type_symbol, ";"])))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [Shen.call(Shen.fns["shen.pair"], [Arg7036_0[1][2], Shen.call(Shen.fns["shen.hdtl"], [Arg7036_0])])[1], R0]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<end*>"];





Shen.fns["cut"] = [Shen.type_func, function shen_user_lambda7039(Arg7038) {
  if (Arg7038.length < 3) return [Shen.type_func, shen_user_lambda7039, 3, Arg7038];
  var Arg7038_0 = Arg7038[0], Arg7038_1 = Arg7038[1], Arg7038_2 = Arg7038[2];
  var R0;
  return ((R0 = Shen.unwind_tail(Shen.thaw(Arg7038_2))),
  ((Shen.unwind_tail(Shen.$eq$(R0, false)))
  ? Arg7038_0
  : R0))}, 3, [], "cut"];





Shen.fns["shen.insert_modes"] = [Shen.type_func, function shen_user_lambda7041(Arg7040) {
  if (Arg7040.length < 1) return [Shen.type_func, shen_user_lambda7041, 1, Arg7040];
  var Arg7040_0 = Arg7040[0];
  return (((Shen.is_type(Arg7040_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "mode"], Arg7040_0[1])) && (Shen.is_type(Arg7040_0[2], Shen.type_cons) && (Shen.is_type(Arg7040_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg7040_0[2][2][2]))))))
  ? Arg7040_0
  : ((Shen.empty$question$(Arg7040_0))
  ? []
  : ((Shen.is_type(Arg7040_0, Shen.type_cons))
  ? [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "mode"], [Shen.type_cons, Arg7040_0[1], [Shen.type_cons, [Shen.type_symbol, "+"], []]]], [Shen.type_cons, [Shen.type_symbol, "mode"], [Shen.type_cons, Shen.call(Shen.fns["shen.insert_modes"], [Arg7040_0[2]]), [Shen.type_cons, [Shen.type_symbol, "-"], []]]]]
  : Arg7040_0)))}, 1, [], "shen.insert_modes"];





Shen.fns["shen.s-prolog"] = [Shen.type_func, function shen_user_lambda7043(Arg7042) {
  if (Arg7042.length < 1) return [Shen.type_func, shen_user_lambda7043, 1, Arg7042];
  var Arg7042_0 = Arg7042[0];
  return (function() {
  return Shen.call_tail(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7045(Arg7044) {
  if (Arg7044.length < 1) return [Shen.type_func, shen_user_lambda7045, 1, Arg7044];
  var Arg7044_0 = Arg7044[0];
  return (function() {
  return Shen.call_tail(Shen.fns["eval"], [Arg7044_0]);})}, 1, [], undefined], Shen.call(Shen.fns["shen.prolog->shen"], [Arg7042_0])]);})}, 1, [], "shen.s-prolog"];





Shen.fns["shen.prolog->shen"] = [Shen.type_func, function shen_user_lambda7047(Arg7046) {
  if (Arg7046.length < 1) return [Shen.type_func, shen_user_lambda7047, 1, Arg7046];
  var Arg7046_0 = Arg7046[0];
  return (function() {
  return Shen.call_tail(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7049(Arg7048) {
  if (Arg7048.length < 1) return [Shen.type_func, shen_user_lambda7049, 1, Arg7048];
  var Arg7048_0 = Arg7048[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.compile_prolog_procedure"], [Arg7048_0]);})}, 1, [], undefined], Shen.call(Shen.fns["shen.group_clauses"], [Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7051(Arg7050) {
  if (Arg7050.length < 1) return [Shen.type_func, shen_user_lambda7051, 1, Arg7050];
  var Arg7050_0 = Arg7050[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.s-prolog_clause"], [Arg7050_0]);})}, 1, [], undefined], Shen.call(Shen.fns["mapcan"], [[Shen.type_func, function shen_user_lambda7053(Arg7052) {
  if (Arg7052.length < 1) return [Shen.type_func, shen_user_lambda7053, 1, Arg7052];
  var Arg7052_0 = Arg7052[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.head_abstraction"], [Arg7052_0]);})}, 1, [], undefined], Arg7046_0])])])]);})}, 1, [], "shen.prolog->shen"];





Shen.fns["shen.s-prolog_clause"] = [Shen.type_func, function shen_user_lambda7055(Arg7054) {
  if (Arg7054.length < 1) return [Shen.type_func, shen_user_lambda7055, 1, Arg7054];
  var Arg7054_0 = Arg7054[0];
  return (((Shen.is_type(Arg7054_0, Shen.type_cons) && (Shen.is_type(Arg7054_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":-"], Arg7054_0[2][1])) && (Shen.is_type(Arg7054_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg7054_0[2][2][2]))))))
  ? [Shen.type_cons, Arg7054_0[1], [Shen.type_cons, [Shen.type_symbol, ":-"], [Shen.type_cons, Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7057(Arg7056) {
  if (Arg7056.length < 1) return [Shen.type_func, shen_user_lambda7057, 1, Arg7056];
  var Arg7056_0 = Arg7056[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.s-prolog_literal"], [Arg7056_0]);})}, 1, [], undefined], Arg7054_0[2][2][1]]), []]]]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.s-prolog_clause"]]);}))}, 1, [], "shen.s-prolog_clause"];





Shen.fns["shen.head_abstraction"] = [Shen.type_func, function shen_user_lambda7059(Arg7058) {
  if (Arg7058.length < 1) return [Shen.type_func, shen_user_lambda7059, 1, Arg7058];
  var Arg7058_0 = Arg7058[0];
  var R0, R1;
  return (((Shen.is_type(Arg7058_0, Shen.type_cons) && (Shen.is_type(Arg7058_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":-"], Arg7058_0[2][1])) && (Shen.is_type(Arg7058_0[2][2], Shen.type_cons) && (Shen.empty$question$(Arg7058_0[2][2][2]) && (Shen.call(Shen.fns["shen.complexity_head"], [Arg7058_0[1]]) < (Shen.globals["shen.*maxcomplexity*"]))))))))
  ? [Shen.type_cons, Arg7058_0, []]
  : (((Shen.is_type(Arg7058_0, Shen.type_cons) && (Shen.is_type(Arg7058_0[1], Shen.type_cons) && (Shen.is_type(Arg7058_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":-"], Arg7058_0[2][1])) && (Shen.is_type(Arg7058_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg7058_0[2][2][2])))))))
  ? ((R0 = Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7061(Arg7060) {
  if (Arg7060.length < 1) return [Shen.type_func, shen_user_lambda7061, 1, Arg7060];
  var Arg7060_0 = Arg7060[0];
  return (function() {
  return Shen.call_tail(Shen.fns["gensym"], [[Shen.type_symbol, "V"]]);})}, 1, [], undefined], Arg7058_0[1][2]])),
  (R1 = Shen.call(Shen.fns["shen.rcons_form"], [Shen.call(Shen.fns["shen.remove_modes"], [Arg7058_0[1][2]])])),
  (R1 = [Shen.type_cons, [Shen.type_symbol, "unify"], [Shen.type_cons, Shen.call(Shen.fns["shen.cons_form"], [R0]), [Shen.type_cons, R1, []]]]),
  (R1 = [Shen.type_cons, [Shen.type_cons, Arg7058_0[1][1], R0], [Shen.type_cons, [Shen.type_symbol, ":-"], [Shen.type_cons, [Shen.type_cons, R1, Arg7058_0[2][2][1]], []]]]),
  [Shen.type_cons, R1, []])
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.head_abstraction"]]);})))}, 1, [], "shen.head_abstraction"];





Shen.fns["shen.complexity_head"] = [Shen.type_func, function shen_user_lambda7063(Arg7062) {
  if (Arg7062.length < 1) return [Shen.type_func, shen_user_lambda7063, 1, Arg7062];
  var Arg7062_0 = Arg7062[0];
  return ((Shen.is_type(Arg7062_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.product"], [Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7065(Arg7064) {
  if (Arg7064.length < 1) return [Shen.type_func, shen_user_lambda7065, 1, Arg7064];
  var Arg7064_0 = Arg7064[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.complexity"], [Arg7064_0]);})}, 1, [], undefined], Arg7062_0[2]])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.complexity_head"]]);}))}, 1, [], "shen.complexity_head"];





Shen.fns["shen.complexity"] = [Shen.type_func, function shen_user_lambda7067(Arg7066) {
  if (Arg7066.length < 1) return [Shen.type_func, shen_user_lambda7067, 1, Arg7066];
  var Arg7066_0 = Arg7066[0];
  return (((Shen.is_type(Arg7066_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "mode"], Arg7066_0[1])) && (Shen.is_type(Arg7066_0[2], Shen.type_cons) && (Shen.is_type(Arg7066_0[2][1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "mode"], Arg7066_0[2][1][1])) && (Shen.is_type(Arg7066_0[2][1][2], Shen.type_cons) && (Shen.is_type(Arg7066_0[2][1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg7066_0[2][1][2][2][2]) && (Shen.is_type(Arg7066_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg7066_0[2][2][2])))))))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.complexity"], [Arg7066_0[2][1]]);})
  : (((Shen.is_type(Arg7066_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "mode"], Arg7066_0[1])) && (Shen.is_type(Arg7066_0[2], Shen.type_cons) && (Shen.is_type(Arg7066_0[2][1], Shen.type_cons) && (Shen.is_type(Arg7066_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "+"], Arg7066_0[2][2][1])) && Shen.empty$question$(Arg7066_0[2][2][2]))))))))
  ? (2 * (Shen.call(Shen.fns["shen.complexity"], [[Shen.type_cons, [Shen.type_symbol, "mode"], [Shen.type_cons, Arg7066_0[2][1][1], Arg7066_0[2][2]]]]) * Shen.call(Shen.fns["shen.complexity"], [[Shen.type_cons, [Shen.type_symbol, "mode"], [Shen.type_cons, Arg7066_0[2][1][2], Arg7066_0[2][2]]]])))
  : (((Shen.is_type(Arg7066_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "mode"], Arg7066_0[1])) && (Shen.is_type(Arg7066_0[2], Shen.type_cons) && (Shen.is_type(Arg7066_0[2][1], Shen.type_cons) && (Shen.is_type(Arg7066_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "-"], Arg7066_0[2][2][1])) && Shen.empty$question$(Arg7066_0[2][2][2]))))))))
  ? (Shen.call(Shen.fns["shen.complexity"], [[Shen.type_cons, [Shen.type_symbol, "mode"], [Shen.type_cons, Arg7066_0[2][1][1], Arg7066_0[2][2]]]]) * Shen.call(Shen.fns["shen.complexity"], [[Shen.type_cons, [Shen.type_symbol, "mode"], [Shen.type_cons, Arg7066_0[2][1][2], Arg7066_0[2][2]]]]))
  : (((Shen.is_type(Arg7066_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "mode"], Arg7066_0[1])) && (Shen.is_type(Arg7066_0[2], Shen.type_cons) && (Shen.is_type(Arg7066_0[2][2], Shen.type_cons) && (Shen.empty$question$(Arg7066_0[2][2][2]) && Shen.call(Shen.fns["variable?"], [Arg7066_0[2][1]])))))))
  ? 1
  : (((Shen.is_type(Arg7066_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "mode"], Arg7066_0[1])) && (Shen.is_type(Arg7066_0[2], Shen.type_cons) && (Shen.is_type(Arg7066_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "+"], Arg7066_0[2][2][1])) && Shen.empty$question$(Arg7066_0[2][2][2])))))))
  ? 2
  : (((Shen.is_type(Arg7066_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "mode"], Arg7066_0[1])) && (Shen.is_type(Arg7066_0[2], Shen.type_cons) && (Shen.is_type(Arg7066_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "-"], Arg7066_0[2][2][1])) && Shen.empty$question$(Arg7066_0[2][2][2])))))))
  ? 1
  : (function() {
  return Shen.call_tail(Shen.fns["shen.complexity"], [[Shen.type_cons, [Shen.type_symbol, "mode"], [Shen.type_cons, Arg7066_0, [Shen.type_cons, [Shen.type_symbol, "+"], []]]]]);})))))))}, 1, [], "shen.complexity"];





Shen.fns["shen.product"] = [Shen.type_func, function shen_user_lambda7069(Arg7068) {
  if (Arg7068.length < 1) return [Shen.type_func, shen_user_lambda7069, 1, Arg7068];
  var Arg7068_0 = Arg7068[0];
  return ((Shen.empty$question$(Arg7068_0))
  ? 1
  : ((Shen.is_type(Arg7068_0, Shen.type_cons))
  ? (Arg7068_0[1] * Shen.call(Shen.fns["shen.product"], [Arg7068_0[2]]))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.product"]]);})))}, 1, [], "shen.product"];





Shen.fns["shen.s-prolog_literal"] = [Shen.type_func, function shen_user_lambda7071(Arg7070) {
  if (Arg7070.length < 1) return [Shen.type_func, shen_user_lambda7071, 1, Arg7070];
  var Arg7070_0 = Arg7070[0];
  return (((Shen.is_type(Arg7070_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "is"], Arg7070_0[1])) && (Shen.is_type(Arg7070_0[2], Shen.type_cons) && (Shen.is_type(Arg7070_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg7070_0[2][2][2]))))))
  ? [Shen.type_cons, [Shen.type_symbol, "bind"], [Shen.type_cons, Arg7070_0[2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.insert_deref"], [Arg7070_0[2][2][1]]), []]]]
  : (((Shen.is_type(Arg7070_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "when"], Arg7070_0[1])) && (Shen.is_type(Arg7070_0[2], Shen.type_cons) && Shen.empty$question$(Arg7070_0[2][2])))))
  ? [Shen.type_cons, [Shen.type_symbol, "fwhen"], [Shen.type_cons, Shen.call(Shen.fns["shen.insert_deref"], [Arg7070_0[2][1]]), []]]
  : (((Shen.is_type(Arg7070_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "bind"], Arg7070_0[1])) && (Shen.is_type(Arg7070_0[2], Shen.type_cons) && (Shen.is_type(Arg7070_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg7070_0[2][2][2]))))))
  ? [Shen.type_cons, [Shen.type_symbol, "bind"], [Shen.type_cons, Arg7070_0[2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.insert_lazyderef"], [Arg7070_0[2][2][1]]), []]]]
  : (((Shen.is_type(Arg7070_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "fwhen"], Arg7070_0[1])) && (Shen.is_type(Arg7070_0[2], Shen.type_cons) && Shen.empty$question$(Arg7070_0[2][2])))))
  ? [Shen.type_cons, [Shen.type_symbol, "fwhen"], [Shen.type_cons, Shen.call(Shen.fns["shen.insert_lazyderef"], [Arg7070_0[2][1]]), []]]
  : ((Shen.is_type(Arg7070_0, Shen.type_cons))
  ? [Shen.type_cons, Shen.call(Shen.fns["shen.m_prolog_to_s-prolog_predicate"], [Arg7070_0[1]]), Arg7070_0[2]]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.s-prolog_literal"]]);}))))))}, 1, [], "shen.s-prolog_literal"];





Shen.fns["shen.insert_deref"] = [Shen.type_func, function shen_user_lambda7073(Arg7072) {
  if (Arg7072.length < 1) return [Shen.type_func, shen_user_lambda7073, 1, Arg7072];
  var Arg7072_0 = Arg7072[0];
  return ((Shen.call(Shen.fns["variable?"], [Arg7072_0]))
  ? [Shen.type_cons, [Shen.type_symbol, "shen.deref"], [Shen.type_cons, Arg7072_0, [Shen.type_cons, [Shen.type_symbol, "ProcessN"], []]]]
  : ((Shen.is_type(Arg7072_0, Shen.type_cons))
  ? [Shen.type_cons, Shen.call(Shen.fns["shen.insert_deref"], [Arg7072_0[1]]), Shen.call(Shen.fns["shen.insert_deref"], [Arg7072_0[2]])]
  : Arg7072_0))}, 1, [], "shen.insert_deref"];





Shen.fns["shen.insert_lazyderef"] = [Shen.type_func, function shen_user_lambda7075(Arg7074) {
  if (Arg7074.length < 1) return [Shen.type_func, shen_user_lambda7075, 1, Arg7074];
  var Arg7074_0 = Arg7074[0];
  return ((Shen.call(Shen.fns["variable?"], [Arg7074_0]))
  ? [Shen.type_cons, [Shen.type_symbol, "shen.lazyderef"], [Shen.type_cons, Arg7074_0, [Shen.type_cons, [Shen.type_symbol, "ProcessN"], []]]]
  : ((Shen.is_type(Arg7074_0, Shen.type_cons))
  ? [Shen.type_cons, Shen.call(Shen.fns["shen.insert_lazyderef"], [Arg7074_0[1]]), Shen.call(Shen.fns["shen.insert_lazyderef"], [Arg7074_0[2]])]
  : Arg7074_0))}, 1, [], "shen.insert_lazyderef"];





Shen.fns["shen.m_prolog_to_s-prolog_predicate"] = [Shen.type_func, function shen_user_lambda7077(Arg7076) {
  if (Arg7076.length < 1) return [Shen.type_func, shen_user_lambda7077, 1, Arg7076];
  var Arg7076_0 = Arg7076[0];
  return ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "="], Arg7076_0)))
  ? [Shen.type_symbol, "unify"]
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "=!"], Arg7076_0)))
  ? [Shen.type_symbol, "unify!"]
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "=="], Arg7076_0)))
  ? [Shen.type_symbol, "identical"]
  : Arg7076_0)))}, 1, [], "shen.m_prolog_to_s-prolog_predicate"];





Shen.fns["shen.group_clauses"] = [Shen.type_func, function shen_user_lambda7079(Arg7078) {
  if (Arg7078.length < 1) return [Shen.type_func, shen_user_lambda7079, 1, Arg7078];
  var Arg7078_0 = Arg7078[0];
  var R0, R1;
  return ((Shen.empty$question$(Arg7078_0))
  ? []
  : ((Shen.is_type(Arg7078_0, Shen.type_cons))
  ? ((R0 = Shen.call(Shen.fns["shen.collect"], [[Shen.type_func, function shen_user_lambda7081(Arg7080) {
  if (Arg7080.length < 2) return [Shen.type_func, shen_user_lambda7081, 2, Arg7080];
  var Arg7080_0 = Arg7080[0], Arg7080_1 = Arg7080[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.same_predicate?"], [Arg7080_0[1], Arg7080_1]);})}, 2, [Arg7078_0], undefined], Arg7078_0])),
  (R1 = Shen.call(Shen.fns["difference"], [Arg7078_0, R0])),
  [Shen.type_cons, R0, Shen.call(Shen.fns["shen.group_clauses"], [R1])])
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.group_clauses"]]);})))}, 1, [], "shen.group_clauses"];





Shen.fns["shen.collect"] = [Shen.type_func, function shen_user_lambda7083(Arg7082) {
  if (Arg7082.length < 2) return [Shen.type_func, shen_user_lambda7083, 2, Arg7082];
  var Arg7082_0 = Arg7082[0], Arg7082_1 = Arg7082[1];
  return ((Shen.empty$question$(Arg7082_1))
  ? []
  : ((Shen.is_type(Arg7082_1, Shen.type_cons))
  ? ((Shen.call(Arg7082_0, [Arg7082_1[1]]))
  ? [Shen.type_cons, Arg7082_1[1], Shen.call(Shen.fns["shen.collect"], [Arg7082_0, Arg7082_1[2]])]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.collect"], [Arg7082_0, Arg7082_1[2]]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.collect"]]);})))}, 2, [], "shen.collect"];





Shen.fns["shen.same_predicate?"] = [Shen.type_func, function shen_user_lambda7085(Arg7084) {
  if (Arg7084.length < 2) return [Shen.type_func, shen_user_lambda7085, 2, Arg7084];
  var Arg7084_0 = Arg7084[0], Arg7084_1 = Arg7084[1];
  return (((Shen.is_type(Arg7084_0, Shen.type_cons) && (Shen.is_type(Arg7084_0[1], Shen.type_cons) && (Shen.is_type(Arg7084_1, Shen.type_cons) && Shen.is_type(Arg7084_1[1], Shen.type_cons)))))
  ? Shen.$eq$(Arg7084_0[1][1], Arg7084_1[1][1])
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.same_predicate?"]]);}))}, 2, [], "shen.same_predicate?"];





Shen.fns["shen.compile_prolog_procedure"] = [Shen.type_func, function shen_user_lambda7087(Arg7086) {
  if (Arg7086.length < 1) return [Shen.type_func, shen_user_lambda7087, 1, Arg7086];
  var Arg7086_0 = Arg7086[0];
  var R0;
  return ((R0 = Shen.call(Shen.fns["shen.procedure_name"], [Arg7086_0])),
  (R0 = Shen.call(Shen.fns["shen.clauses-to-shen"], [R0, Arg7086_0])),
  R0)}, 1, [], "shen.compile_prolog_procedure"];





Shen.fns["shen.procedure_name"] = [Shen.type_func, function shen_user_lambda7089(Arg7088) {
  if (Arg7088.length < 1) return [Shen.type_func, shen_user_lambda7089, 1, Arg7088];
  var Arg7088_0 = Arg7088[0];
  return (((Shen.is_type(Arg7088_0, Shen.type_cons) && (Shen.is_type(Arg7088_0[1], Shen.type_cons) && Shen.is_type(Arg7088_0[1][1], Shen.type_cons))))
  ? Arg7088_0[1][1][1]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.procedure_name"]]);}))}, 1, [], "shen.procedure_name"];





Shen.fns["shen.clauses-to-shen"] = [Shen.type_func, function shen_user_lambda7091(Arg7090) {
  if (Arg7090.length < 2) return [Shen.type_func, shen_user_lambda7091, 2, Arg7090];
  var Arg7090_0 = Arg7090[0], Arg7090_1 = Arg7090[1];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7093(Arg7092) {
  if (Arg7092.length < 1) return [Shen.type_func, shen_user_lambda7093, 1, Arg7092];
  var Arg7092_0 = Arg7092[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.linearise-clause"], [Arg7092_0]);})}, 1, [], undefined], Arg7090_1])),
  (R1 = Shen.call(Shen.fns["shen.prolog-aritycheck"], [Arg7090_0, Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7095(Arg7094) {
  if (Arg7094.length < 1) return [Shen.type_func, shen_user_lambda7095, 1, Arg7094];
  var Arg7094_0 = Arg7094[0];
  return (function() {
  return Shen.call_tail(Shen.fns["head"], [Arg7094_0]);})}, 1, [], undefined], Arg7090_1])])),
  (R1 = Shen.call(Shen.fns["shen.parameters"], [R1])),
  (R0 = Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7097(Arg7096) {
  if (Arg7096.length < 2) return [Shen.type_func, shen_user_lambda7097, 2, Arg7096];
  var Arg7096_0 = Arg7096[0], Arg7096_1 = Arg7096[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.aum"], [Arg7096_1, Arg7096_0]);})}, 2, [R1], undefined], R0])),
  (R0 = Shen.call(Shen.fns["shen.catch-cut"], [Shen.call(Shen.fns["shen.nest-disjunct"], [Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7099(Arg7098) {
  if (Arg7098.length < 1) return [Shen.type_func, shen_user_lambda7099, 1, Arg7098];
  var Arg7098_0 = Arg7098[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.aum_to_shen"], [Arg7098_0]);})}, 1, [], undefined], R0])])])),
  (R1 = [Shen.type_cons, [Shen.type_symbol, "define"], [Shen.type_cons, Arg7090_0, Shen.call(Shen.fns["append"], [R1, Shen.call(Shen.fns["append"], [[Shen.type_cons, [Shen.type_symbol, "ProcessN"], [Shen.type_cons, [Shen.type_symbol, "Continuation"], []]], [Shen.type_cons, [Shen.type_symbol, "->"], [Shen.type_cons, R0, []]]])])]]),
  R1)}, 2, [], "shen.clauses-to-shen"];





Shen.fns["shen.catch-cut"] = [Shen.type_func, function shen_user_lambda7101(Arg7100) {
  if (Arg7100.length < 1) return [Shen.type_func, shen_user_lambda7101, 1, Arg7100];
  var Arg7100_0 = Arg7100[0];
  return (((!Shen.call(Shen.fns["shen.occurs?"], [[Shen.type_symbol, "cut"], Arg7100_0])))
  ? Arg7100_0
  : [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, [Shen.type_symbol, "Throwcontrol"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.catchpoint"], []], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.cutpoint"], [Shen.type_cons, [Shen.type_symbol, "Throwcontrol"], [Shen.type_cons, Arg7100_0, []]]], []]]]])}, 1, [], "shen.catch-cut"];





Shen.fns["shen.catchpoint"] = [Shen.type_func, function shen_user_lambda7103(Arg7102) {
  if (Arg7102.length < 0) return [Shen.type_func, shen_user_lambda7103, 0, Arg7102];
  return (Shen.globals["shen.*catch*"] = (1 + (Shen.globals["shen.*catch*"])))}, 0, [], "shen.catchpoint"];





Shen.fns["shen.cutpoint"] = [Shen.type_func, function shen_user_lambda7105(Arg7104) {
  if (Arg7104.length < 2) return [Shen.type_func, shen_user_lambda7105, 2, Arg7104];
  var Arg7104_0 = Arg7104[0], Arg7104_1 = Arg7104[1];
  return ((Shen.unwind_tail(Shen.$eq$(Arg7104_1, Arg7104_0)))
  ? false
  : Arg7104_1)}, 2, [], "shen.cutpoint"];





Shen.fns["shen.nest-disjunct"] = [Shen.type_func, function shen_user_lambda7107(Arg7106) {
  if (Arg7106.length < 1) return [Shen.type_func, shen_user_lambda7107, 1, Arg7106];
  var Arg7106_0 = Arg7106[0];
  return (((Shen.is_type(Arg7106_0, Shen.type_cons) && Shen.empty$question$(Arg7106_0[2])))
  ? Arg7106_0[1]
  : ((Shen.is_type(Arg7106_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.lisp-or"], [Arg7106_0[1], Shen.call(Shen.fns["shen.nest-disjunct"], [Arg7106_0[2]])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.nest-disjunct"]]);})))}, 1, [], "shen.nest-disjunct"];





Shen.fns["shen.lisp-or"] = [Shen.type_func, function shen_user_lambda7109(Arg7108) {
  if (Arg7108.length < 2) return [Shen.type_func, shen_user_lambda7109, 2, Arg7108];
  var Arg7108_0 = Arg7108[0], Arg7108_1 = Arg7108[1];
  return [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, [Shen.type_symbol, "Case"], [Shen.type_cons, Arg7108_0, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "="], [Shen.type_cons, [Shen.type_symbol, "Case"], [Shen.type_cons, false, []]]], [Shen.type_cons, Arg7108_1, [Shen.type_cons, [Shen.type_symbol, "Case"], []]]]], []]]]]}, 2, [], "shen.lisp-or"];





Shen.fns["shen.prolog-aritycheck"] = [Shen.type_func, function shen_user_lambda7111(Arg7110) {
  if (Arg7110.length < 2) return [Shen.type_func, shen_user_lambda7111, 2, Arg7110];
  var Arg7110_0 = Arg7110[0], Arg7110_1 = Arg7110[1];
  return (((Shen.is_type(Arg7110_1, Shen.type_cons) && Shen.empty$question$(Arg7110_1[2])))
  ? (Shen.call(Shen.fns["length"], [Arg7110_1[1]]) - 1)
  : (((Shen.is_type(Arg7110_1, Shen.type_cons) && Shen.is_type(Arg7110_1[2], Shen.type_cons)))
  ? ((Shen.unwind_tail(Shen.$eq$(Shen.call(Shen.fns["length"], [Arg7110_1[1]]), Shen.call(Shen.fns["length"], [Arg7110_1[2][1]]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.prolog-aritycheck"], [Arg7110_0, Arg7110_1[2]]);})
  : (function() {
  return Shen.simple_error(("arity error in prolog procedure " + Shen.call(Shen.fns["shen.app"], [[Shen.type_cons, Arg7110_0, []], "\x0d\x0a", [Shen.type_symbol, "shen.a"]])));}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.prolog-aritycheck"]]);})))}, 2, [], "shen.prolog-aritycheck"];





Shen.fns["shen.linearise-clause"] = [Shen.type_func, function shen_user_lambda7113(Arg7112) {
  if (Arg7112.length < 1) return [Shen.type_func, shen_user_lambda7113, 1, Arg7112];
  var Arg7112_0 = Arg7112[0];
  var R0;
  return (((Shen.is_type(Arg7112_0, Shen.type_cons) && (Shen.is_type(Arg7112_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":-"], Arg7112_0[2][1])) && (Shen.is_type(Arg7112_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg7112_0[2][2][2]))))))
  ? ((R0 = Shen.call(Shen.fns["shen.linearise"], [[Shen.type_cons, Arg7112_0[1], Arg7112_0[2][2]]])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.clause_form"], [R0]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.linearise-clause"]]);}))}, 1, [], "shen.linearise-clause"];





Shen.fns["shen.clause_form"] = [Shen.type_func, function shen_user_lambda7115(Arg7114) {
  if (Arg7114.length < 1) return [Shen.type_func, shen_user_lambda7115, 1, Arg7114];
  var Arg7114_0 = Arg7114[0];
  return (((Shen.is_type(Arg7114_0, Shen.type_cons) && (Shen.is_type(Arg7114_0[2], Shen.type_cons) && Shen.empty$question$(Arg7114_0[2][2]))))
  ? [Shen.type_cons, Shen.call(Shen.fns["shen.explicit_modes"], [Arg7114_0[1]]), [Shen.type_cons, [Shen.type_symbol, ":-"], [Shen.type_cons, Shen.call(Shen.fns["shen.cf_help"], [Arg7114_0[2][1]]), []]]]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.clause_form"]]);}))}, 1, [], "shen.clause_form"];





Shen.fns["shen.explicit_modes"] = [Shen.type_func, function shen_user_lambda7117(Arg7116) {
  if (Arg7116.length < 1) return [Shen.type_func, shen_user_lambda7117, 1, Arg7116];
  var Arg7116_0 = Arg7116[0];
  return ((Shen.is_type(Arg7116_0, Shen.type_cons))
  ? [Shen.type_cons, Arg7116_0[1], Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7119(Arg7118) {
  if (Arg7118.length < 1) return [Shen.type_func, shen_user_lambda7119, 1, Arg7118];
  var Arg7118_0 = Arg7118[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.em_help"], [Arg7118_0]);})}, 1, [], undefined], Arg7116_0[2]])]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.explicit_modes"]]);}))}, 1, [], "shen.explicit_modes"];





Shen.fns["shen.em_help"] = [Shen.type_func, function shen_user_lambda7121(Arg7120) {
  if (Arg7120.length < 1) return [Shen.type_func, shen_user_lambda7121, 1, Arg7120];
  var Arg7120_0 = Arg7120[0];
  return (((Shen.is_type(Arg7120_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "mode"], Arg7120_0[1])) && (Shen.is_type(Arg7120_0[2], Shen.type_cons) && (Shen.is_type(Arg7120_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg7120_0[2][2][2]))))))
  ? Arg7120_0
  : [Shen.type_cons, [Shen.type_symbol, "mode"], [Shen.type_cons, Arg7120_0, [Shen.type_cons, [Shen.type_symbol, "+"], []]]])}, 1, [], "shen.em_help"];





Shen.fns["shen.cf_help"] = [Shen.type_func, function shen_user_lambda7123(Arg7122) {
  if (Arg7122.length < 1) return [Shen.type_func, shen_user_lambda7123, 1, Arg7122];
  var Arg7122_0 = Arg7122[0];
  return (((Shen.is_type(Arg7122_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "where"], Arg7122_0[1])) && (Shen.is_type(Arg7122_0[2], Shen.type_cons) && (Shen.is_type(Arg7122_0[2][1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "="], Arg7122_0[2][1][1])) && (Shen.is_type(Arg7122_0[2][1][2], Shen.type_cons) && (Shen.is_type(Arg7122_0[2][1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg7122_0[2][1][2][2][2]) && (Shen.is_type(Arg7122_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg7122_0[2][2][2])))))))))))
  ? [Shen.type_cons, [Shen.type_cons, (((Shen.globals["shen.*occurs*"]))
  ? [Shen.type_symbol, "unify!"]
  : [Shen.type_symbol, "unify"]), Arg7122_0[2][1][2]], Shen.call(Shen.fns["shen.cf_help"], [Arg7122_0[2][2][1]])]
  : Arg7122_0)}, 1, [], "shen.cf_help"];





Shen.fns["occurs-check"] = [Shen.type_func, function shen_user_lambda7125(Arg7124) {
  if (Arg7124.length < 1) return [Shen.type_func, shen_user_lambda7125, 1, Arg7124];
  var Arg7124_0 = Arg7124[0];
  return ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "+"], Arg7124_0)))
  ? (Shen.globals["shen.*occurs*"] = true)
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "-"], Arg7124_0)))
  ? (Shen.globals["shen.*occurs*"] = false)
  : (function() {
  return Shen.simple_error("occurs-check expects + or -\x0d\x0a");})))}, 1, [], "occurs-check"];





Shen.fns["shen.aum"] = [Shen.type_func, function shen_user_lambda7127(Arg7126) {
  if (Arg7126.length < 2) return [Shen.type_func, shen_user_lambda7127, 2, Arg7126];
  var Arg7126_0 = Arg7126[0], Arg7126_1 = Arg7126[1];
  var R0;
  return (((Shen.is_type(Arg7126_0, Shen.type_cons) && (Shen.is_type(Arg7126_0[1], Shen.type_cons) && (Shen.is_type(Arg7126_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":-"], Arg7126_0[2][1])) && (Shen.is_type(Arg7126_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg7126_0[2][2][2])))))))
  ? ((R0 = Shen.call(Shen.fns["shen.make_mu_application"], [[Shen.type_cons, [Shen.type_symbol, "shen.mu"], [Shen.type_cons, Arg7126_0[1][2], [Shen.type_cons, Shen.call(Shen.fns["shen.continuation_call"], [Arg7126_0[1][2], Arg7126_0[2][2][1]]), []]]], Arg7126_1])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.mu_reduction"], [R0, [Shen.type_symbol, "+"]]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.aum"]]);}))}, 2, [], "shen.aum"];





Shen.fns["shen.continuation_call"] = [Shen.type_func, function shen_user_lambda7129(Arg7128) {
  if (Arg7128.length < 2) return [Shen.type_func, shen_user_lambda7129, 2, Arg7128];
  var Arg7128_0 = Arg7128[0], Arg7128_1 = Arg7128[1];
  var R0, R1;
  return ((R0 = [Shen.type_cons, [Shen.type_symbol, "ProcessN"], Shen.call(Shen.fns["shen.extract_vars"], [Arg7128_0])]),
  (R1 = Shen.call(Shen.fns["shen.extract_vars"], [Arg7128_1])),
  (R1 = Shen.call(Shen.fns["remove"], [[Shen.type_symbol, "Throwcontrol"], Shen.call(Shen.fns["difference"], [R1, R0])])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.cc_help"], [R1, Arg7128_1]);}))}, 2, [], "shen.continuation_call"];





Shen.fns["remove"] = [Shen.type_func, function shen_user_lambda7131(Arg7130) {
  if (Arg7130.length < 2) return [Shen.type_func, shen_user_lambda7131, 2, Arg7130];
  var Arg7130_0 = Arg7130[0], Arg7130_1 = Arg7130[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.remove-h"], [Arg7130_0, Arg7130_1, []]);})}, 2, [], "remove"];





Shen.fns["shen.remove-h"] = [Shen.type_func, function shen_user_lambda7133(Arg7132) {
  if (Arg7132.length < 3) return [Shen.type_func, shen_user_lambda7133, 3, Arg7132];
  var Arg7132_0 = Arg7132[0], Arg7132_1 = Arg7132[1], Arg7132_2 = Arg7132[2];
  return ((Shen.empty$question$(Arg7132_1))
  ? (function() {
  return Shen.call_tail(Shen.fns["reverse"], [Arg7132_2]);})
  : (((Shen.is_type(Arg7132_1, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(Arg7132_1[1], Arg7132_0))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.remove-h"], [Arg7132_1[1], Arg7132_1[2], Arg7132_2]);})
  : ((Shen.is_type(Arg7132_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.remove-h"], [Arg7132_0, Arg7132_1[2], [Shen.type_cons, Arg7132_1[1], Arg7132_2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.remove-h"]]);}))))}, 3, [], "shen.remove-h"];





Shen.fns["shen.cc_help"] = [Shen.type_func, function shen_user_lambda7135(Arg7134) {
  if (Arg7134.length < 2) return [Shen.type_func, shen_user_lambda7135, 2, Arg7134];
  var Arg7134_0 = Arg7134[0], Arg7134_1 = Arg7134[1];
  return (((Shen.empty$question$(Arg7134_0) && Shen.empty$question$(Arg7134_1)))
  ? [Shen.type_cons, [Shen.type_symbol, "shen.pop"], [Shen.type_cons, [Shen.type_symbol, "shen.the"], [Shen.type_cons, [Shen.type_symbol, "shen.stack"], []]]]
  : ((Shen.empty$question$(Arg7134_1))
  ? [Shen.type_cons, [Shen.type_symbol, "shen.rename"], [Shen.type_cons, [Shen.type_symbol, "shen.the"], [Shen.type_cons, [Shen.type_symbol, "shen.variables"], [Shen.type_cons, [Shen.type_symbol, "in"], [Shen.type_cons, Arg7134_0, [Shen.type_cons, [Shen.type_symbol, "and"], [Shen.type_cons, [Shen.type_symbol, "shen.then"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.pop"], [Shen.type_cons, [Shen.type_symbol, "shen.the"], [Shen.type_cons, [Shen.type_symbol, "shen.stack"], []]]], []]]]]]]]]
  : ((Shen.empty$question$(Arg7134_0))
  ? [Shen.type_cons, [Shen.type_symbol, "call"], [Shen.type_cons, [Shen.type_symbol, "shen.the"], [Shen.type_cons, [Shen.type_symbol, "shen.continuation"], [Shen.type_cons, Arg7134_1, []]]]]
  : [Shen.type_cons, [Shen.type_symbol, "shen.rename"], [Shen.type_cons, [Shen.type_symbol, "shen.the"], [Shen.type_cons, [Shen.type_symbol, "shen.variables"], [Shen.type_cons, [Shen.type_symbol, "in"], [Shen.type_cons, Arg7134_0, [Shen.type_cons, [Shen.type_symbol, "and"], [Shen.type_cons, [Shen.type_symbol, "shen.then"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "call"], [Shen.type_cons, [Shen.type_symbol, "shen.the"], [Shen.type_cons, [Shen.type_symbol, "shen.continuation"], [Shen.type_cons, Arg7134_1, []]]]], []]]]]]]]])))}, 2, [], "shen.cc_help"];





Shen.fns["shen.make_mu_application"] = [Shen.type_func, function shen_user_lambda7137(Arg7136) {
  if (Arg7136.length < 2) return [Shen.type_func, shen_user_lambda7137, 2, Arg7136];
  var Arg7136_0 = Arg7136[0], Arg7136_1 = Arg7136[1];
  return (((Shen.is_type(Arg7136_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.mu"], Arg7136_0[1])) && (Shen.is_type(Arg7136_0[2], Shen.type_cons) && (Shen.empty$question$(Arg7136_0[2][1]) && (Shen.is_type(Arg7136_0[2][2], Shen.type_cons) && (Shen.empty$question$(Arg7136_0[2][2][2]) && Shen.empty$question$(Arg7136_1))))))))
  ? Arg7136_0[2][2][1]
  : (((Shen.is_type(Arg7136_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.mu"], Arg7136_0[1])) && (Shen.is_type(Arg7136_0[2], Shen.type_cons) && (Shen.is_type(Arg7136_0[2][1], Shen.type_cons) && (Shen.is_type(Arg7136_0[2][2], Shen.type_cons) && (Shen.empty$question$(Arg7136_0[2][2][2]) && Shen.is_type(Arg7136_1, Shen.type_cons))))))))
  ? [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.mu"], [Shen.type_cons, Arg7136_0[2][1][1], [Shen.type_cons, Shen.call(Shen.fns["shen.make_mu_application"], [[Shen.type_cons, [Shen.type_symbol, "shen.mu"], [Shen.type_cons, Arg7136_0[2][1][2], Arg7136_0[2][2]]], Arg7136_1[2]]), []]]], [Shen.type_cons, Arg7136_1[1], []]]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.make_mu_application"]]);})))}, 2, [], "shen.make_mu_application"];





Shen.fns["shen.mu_reduction"] = [Shen.type_func, function shen_user_lambda7139(Arg7138) {
  if (Arg7138.length < 2) return [Shen.type_func, shen_user_lambda7139, 2, Arg7138];
  var Arg7138_0 = Arg7138[0], Arg7138_1 = Arg7138[1];
  var R0;
  return (((Shen.is_type(Arg7138_0, Shen.type_cons) && (Shen.is_type(Arg7138_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.mu"], Arg7138_0[1][1])) && (Shen.is_type(Arg7138_0[1][2], Shen.type_cons) && (Shen.is_type(Arg7138_0[1][2][1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "mode"], Arg7138_0[1][2][1][1])) && (Shen.is_type(Arg7138_0[1][2][1][2], Shen.type_cons) && (Shen.is_type(Arg7138_0[1][2][1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg7138_0[1][2][1][2][2][2]) && (Shen.is_type(Arg7138_0[1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg7138_0[1][2][2][2]) && (Shen.is_type(Arg7138_0[2], Shen.type_cons) && Shen.empty$question$(Arg7138_0[2][2]))))))))))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.mu_reduction"], [[Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.mu"], [Shen.type_cons, Arg7138_0[1][2][1][2][1], Arg7138_0[1][2][2]]], Arg7138_0[2]], Arg7138_0[1][2][1][2][2][1]]);})
  : (((Shen.is_type(Arg7138_0, Shen.type_cons) && (Shen.is_type(Arg7138_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.mu"], Arg7138_0[1][1])) && (Shen.is_type(Arg7138_0[1][2], Shen.type_cons) && (Shen.is_type(Arg7138_0[1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg7138_0[1][2][2][2]) && (Shen.is_type(Arg7138_0[2], Shen.type_cons) && (Shen.empty$question$(Arg7138_0[2][2]) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "_"], Arg7138_0[1][2][1])))))))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.mu_reduction"], [Arg7138_0[1][2][2][1], Arg7138_1]);})
  : (((Shen.is_type(Arg7138_0, Shen.type_cons) && (Shen.is_type(Arg7138_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.mu"], Arg7138_0[1][1])) && (Shen.is_type(Arg7138_0[1][2], Shen.type_cons) && (Shen.is_type(Arg7138_0[1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg7138_0[1][2][2][2]) && (Shen.is_type(Arg7138_0[2], Shen.type_cons) && (Shen.empty$question$(Arg7138_0[2][2]) && Shen.call(Shen.fns["shen.ephemeral_variable?"], [Arg7138_0[1][2][1], Arg7138_0[2][1]]))))))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["subst"], [Arg7138_0[2][1], Arg7138_0[1][2][1], Shen.call(Shen.fns["shen.mu_reduction"], [Arg7138_0[1][2][2][1], Arg7138_1])]);})
  : (((Shen.is_type(Arg7138_0, Shen.type_cons) && (Shen.is_type(Arg7138_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.mu"], Arg7138_0[1][1])) && (Shen.is_type(Arg7138_0[1][2], Shen.type_cons) && (Shen.is_type(Arg7138_0[1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg7138_0[1][2][2][2]) && (Shen.is_type(Arg7138_0[2], Shen.type_cons) && (Shen.empty$question$(Arg7138_0[2][2]) && Shen.call(Shen.fns["variable?"], [Arg7138_0[1][2][1]]))))))))))
  ? [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, Arg7138_0[1][2][1], [Shen.type_cons, [Shen.type_symbol, "shen.be"], [Shen.type_cons, Arg7138_0[2][1], [Shen.type_cons, [Shen.type_symbol, "in"], [Shen.type_cons, Shen.call(Shen.fns["shen.mu_reduction"], [Arg7138_0[1][2][2][1], Arg7138_1]), []]]]]]]
  : (((Shen.is_type(Arg7138_0, Shen.type_cons) && (Shen.is_type(Arg7138_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.mu"], Arg7138_0[1][1])) && (Shen.is_type(Arg7138_0[1][2], Shen.type_cons) && (Shen.is_type(Arg7138_0[1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg7138_0[1][2][2][2]) && (Shen.is_type(Arg7138_0[2], Shen.type_cons) && (Shen.empty$question$(Arg7138_0[2][2]) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "-"], Arg7138_1)) && Shen.call(Shen.fns["shen.prolog_constant?"], [Arg7138_0[1][2][1]])))))))))))
  ? ((R0 = Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "V"]])),
  [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, R0, [Shen.type_cons, [Shen.type_symbol, "shen.be"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.the"], [Shen.type_cons, [Shen.type_symbol, "shen.result"], [Shen.type_cons, [Shen.type_symbol, "shen.of"], [Shen.type_cons, [Shen.type_symbol, "shen.dereferencing"], Arg7138_0[2]]]]], [Shen.type_cons, [Shen.type_symbol, "in"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, [Shen.type_cons, R0, [Shen.type_cons, [Shen.type_symbol, "is"], [Shen.type_cons, [Shen.type_symbol, "identical"], [Shen.type_cons, [Shen.type_symbol, "shen.to"], [Shen.type_cons, Arg7138_0[1][2][1], []]]]]], [Shen.type_cons, [Shen.type_symbol, "shen.then"], [Shen.type_cons, Shen.call(Shen.fns["shen.mu_reduction"], [Arg7138_0[1][2][2][1], [Shen.type_symbol, "-"]]), [Shen.type_cons, [Shen.type_symbol, "shen.else"], [Shen.type_cons, [Shen.type_symbol, "shen.failed!"], []]]]]]], []]]]]]])
  : (((Shen.is_type(Arg7138_0, Shen.type_cons) && (Shen.is_type(Arg7138_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.mu"], Arg7138_0[1][1])) && (Shen.is_type(Arg7138_0[1][2], Shen.type_cons) && (Shen.is_type(Arg7138_0[1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg7138_0[1][2][2][2]) && (Shen.is_type(Arg7138_0[2], Shen.type_cons) && (Shen.empty$question$(Arg7138_0[2][2]) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "+"], Arg7138_1)) && Shen.call(Shen.fns["shen.prolog_constant?"], [Arg7138_0[1][2][1]])))))))))))
  ? ((R0 = Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "V"]])),
  [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, R0, [Shen.type_cons, [Shen.type_symbol, "shen.be"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.the"], [Shen.type_cons, [Shen.type_symbol, "shen.result"], [Shen.type_cons, [Shen.type_symbol, "shen.of"], [Shen.type_cons, [Shen.type_symbol, "shen.dereferencing"], Arg7138_0[2]]]]], [Shen.type_cons, [Shen.type_symbol, "in"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, [Shen.type_cons, R0, [Shen.type_cons, [Shen.type_symbol, "is"], [Shen.type_cons, [Shen.type_symbol, "identical"], [Shen.type_cons, [Shen.type_symbol, "shen.to"], [Shen.type_cons, Arg7138_0[1][2][1], []]]]]], [Shen.type_cons, [Shen.type_symbol, "shen.then"], [Shen.type_cons, Shen.call(Shen.fns["shen.mu_reduction"], [Arg7138_0[1][2][2][1], [Shen.type_symbol, "+"]]), [Shen.type_cons, [Shen.type_symbol, "shen.else"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, [Shen.type_cons, R0, [Shen.type_cons, [Shen.type_symbol, "is"], [Shen.type_cons, [Shen.type_symbol, "shen.a"], [Shen.type_cons, [Shen.type_symbol, "shen.variable"], []]]]], [Shen.type_cons, [Shen.type_symbol, "shen.then"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "bind"], [Shen.type_cons, R0, [Shen.type_cons, [Shen.type_symbol, "shen.to"], [Shen.type_cons, Arg7138_0[1][2][1], [Shen.type_cons, [Shen.type_symbol, "in"], [Shen.type_cons, Shen.call(Shen.fns["shen.mu_reduction"], [Arg7138_0[1][2][2][1], [Shen.type_symbol, "+"]]), []]]]]]], [Shen.type_cons, [Shen.type_symbol, "shen.else"], [Shen.type_cons, [Shen.type_symbol, "shen.failed!"], []]]]]]], []]]]]]], []]]]]]])
  : (((Shen.is_type(Arg7138_0, Shen.type_cons) && (Shen.is_type(Arg7138_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.mu"], Arg7138_0[1][1])) && (Shen.is_type(Arg7138_0[1][2], Shen.type_cons) && (Shen.is_type(Arg7138_0[1][2][1], Shen.type_cons) && (Shen.is_type(Arg7138_0[1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg7138_0[1][2][2][2]) && (Shen.is_type(Arg7138_0[2], Shen.type_cons) && (Shen.empty$question$(Arg7138_0[2][2]) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "-"], Arg7138_1))))))))))))
  ? ((R0 = Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "V"]])),
  [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, R0, [Shen.type_cons, [Shen.type_symbol, "shen.be"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.the"], [Shen.type_cons, [Shen.type_symbol, "shen.result"], [Shen.type_cons, [Shen.type_symbol, "shen.of"], [Shen.type_cons, [Shen.type_symbol, "shen.dereferencing"], Arg7138_0[2]]]]], [Shen.type_cons, [Shen.type_symbol, "in"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, [Shen.type_cons, R0, [Shen.type_cons, [Shen.type_symbol, "is"], [Shen.type_cons, [Shen.type_symbol, "shen.a"], [Shen.type_cons, [Shen.type_symbol, "shen.non-empty"], [Shen.type_cons, [Shen.type_symbol, "list"], []]]]]], [Shen.type_cons, [Shen.type_symbol, "shen.then"], [Shen.type_cons, Shen.call(Shen.fns["shen.mu_reduction"], [[Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.mu"], [Shen.type_cons, Arg7138_0[1][2][1][1], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.mu"], [Shen.type_cons, Arg7138_0[1][2][1][2], Arg7138_0[1][2][2]]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.the"], [Shen.type_cons, [Shen.type_symbol, "tail"], [Shen.type_cons, [Shen.type_symbol, "shen.of"], [Shen.type_cons, R0, []]]]], []]], []]]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.the"], [Shen.type_cons, [Shen.type_symbol, "head"], [Shen.type_cons, [Shen.type_symbol, "shen.of"], [Shen.type_cons, R0, []]]]], []]], [Shen.type_symbol, "-"]]), [Shen.type_cons, [Shen.type_symbol, "shen.else"], [Shen.type_cons, [Shen.type_symbol, "shen.failed!"], []]]]]]], []]]]]]])
  : (((Shen.is_type(Arg7138_0, Shen.type_cons) && (Shen.is_type(Arg7138_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.mu"], Arg7138_0[1][1])) && (Shen.is_type(Arg7138_0[1][2], Shen.type_cons) && (Shen.is_type(Arg7138_0[1][2][1], Shen.type_cons) && (Shen.is_type(Arg7138_0[1][2][2], Shen.type_cons) && (Shen.empty$question$(Arg7138_0[1][2][2][2]) && (Shen.is_type(Arg7138_0[2], Shen.type_cons) && (Shen.empty$question$(Arg7138_0[2][2]) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "+"], Arg7138_1))))))))))))
  ? ((R0 = Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "V"]])),
  [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, R0, [Shen.type_cons, [Shen.type_symbol, "shen.be"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.the"], [Shen.type_cons, [Shen.type_symbol, "shen.result"], [Shen.type_cons, [Shen.type_symbol, "shen.of"], [Shen.type_cons, [Shen.type_symbol, "shen.dereferencing"], Arg7138_0[2]]]]], [Shen.type_cons, [Shen.type_symbol, "in"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, [Shen.type_cons, R0, [Shen.type_cons, [Shen.type_symbol, "is"], [Shen.type_cons, [Shen.type_symbol, "shen.a"], [Shen.type_cons, [Shen.type_symbol, "shen.non-empty"], [Shen.type_cons, [Shen.type_symbol, "list"], []]]]]], [Shen.type_cons, [Shen.type_symbol, "shen.then"], [Shen.type_cons, Shen.call(Shen.fns["shen.mu_reduction"], [[Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.mu"], [Shen.type_cons, Arg7138_0[1][2][1][1], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.mu"], [Shen.type_cons, Arg7138_0[1][2][1][2], Arg7138_0[1][2][2]]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.the"], [Shen.type_cons, [Shen.type_symbol, "tail"], [Shen.type_cons, [Shen.type_symbol, "shen.of"], [Shen.type_cons, R0, []]]]], []]], []]]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.the"], [Shen.type_cons, [Shen.type_symbol, "head"], [Shen.type_cons, [Shen.type_symbol, "shen.of"], [Shen.type_cons, R0, []]]]], []]], [Shen.type_symbol, "+"]]), [Shen.type_cons, [Shen.type_symbol, "shen.else"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, [Shen.type_cons, R0, [Shen.type_cons, [Shen.type_symbol, "is"], [Shen.type_cons, [Shen.type_symbol, "shen.a"], [Shen.type_cons, [Shen.type_symbol, "shen.variable"], []]]]], [Shen.type_cons, [Shen.type_symbol, "shen.then"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.rename"], [Shen.type_cons, [Shen.type_symbol, "shen.the"], [Shen.type_cons, [Shen.type_symbol, "shen.variables"], [Shen.type_cons, [Shen.type_symbol, "in"], [Shen.type_cons, Shen.call(Shen.fns["shen.extract_vars"], [Arg7138_0[1][2][1]]), [Shen.type_cons, [Shen.type_symbol, "and"], [Shen.type_cons, [Shen.type_symbol, "shen.then"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "bind"], [Shen.type_cons, R0, [Shen.type_cons, [Shen.type_symbol, "shen.to"], [Shen.type_cons, Shen.call(Shen.fns["shen.rcons_form"], [Shen.call(Shen.fns["shen.remove_modes"], [Arg7138_0[1][2][1]])]), [Shen.type_cons, [Shen.type_symbol, "in"], [Shen.type_cons, Shen.call(Shen.fns["shen.mu_reduction"], [Arg7138_0[1][2][2][1], [Shen.type_symbol, "+"]]), []]]]]]], []]]]]]]]], [Shen.type_cons, [Shen.type_symbol, "shen.else"], [Shen.type_cons, [Shen.type_symbol, "shen.failed!"], []]]]]]], []]]]]]], []]]]]]])
  : Arg7138_0))))))))}, 2, [], "shen.mu_reduction"];





Shen.fns["shen.rcons_form"] = [Shen.type_func, function shen_user_lambda7141(Arg7140) {
  if (Arg7140.length < 1) return [Shen.type_func, shen_user_lambda7141, 1, Arg7140];
  var Arg7140_0 = Arg7140[0];
  return ((Shen.is_type(Arg7140_0, Shen.type_cons))
  ? [Shen.type_cons, [Shen.type_symbol, "cons"], [Shen.type_cons, Shen.call(Shen.fns["shen.rcons_form"], [Arg7140_0[1]]), [Shen.type_cons, Shen.call(Shen.fns["shen.rcons_form"], [Arg7140_0[2]]), []]]]
  : Arg7140_0)}, 1, [], "shen.rcons_form"];





Shen.fns["shen.remove_modes"] = [Shen.type_func, function shen_user_lambda7143(Arg7142) {
  if (Arg7142.length < 1) return [Shen.type_func, shen_user_lambda7143, 1, Arg7142];
  var Arg7142_0 = Arg7142[0];
  return (((Shen.is_type(Arg7142_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "mode"], Arg7142_0[1])) && (Shen.is_type(Arg7142_0[2], Shen.type_cons) && (Shen.is_type(Arg7142_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "+"], Arg7142_0[2][2][1])) && Shen.empty$question$(Arg7142_0[2][2][2])))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.remove_modes"], [Arg7142_0[2][1]]);})
  : (((Shen.is_type(Arg7142_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "mode"], Arg7142_0[1])) && (Shen.is_type(Arg7142_0[2], Shen.type_cons) && (Shen.is_type(Arg7142_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "-"], Arg7142_0[2][2][1])) && Shen.empty$question$(Arg7142_0[2][2][2])))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.remove_modes"], [Arg7142_0[2][1]]);})
  : ((Shen.is_type(Arg7142_0, Shen.type_cons))
  ? [Shen.type_cons, Shen.call(Shen.fns["shen.remove_modes"], [Arg7142_0[1]]), Shen.call(Shen.fns["shen.remove_modes"], [Arg7142_0[2]])]
  : Arg7142_0)))}, 1, [], "shen.remove_modes"];





Shen.fns["shen.ephemeral_variable?"] = [Shen.type_func, function shen_user_lambda7145(Arg7144) {
  if (Arg7144.length < 2) return [Shen.type_func, shen_user_lambda7145, 2, Arg7144];
  var Arg7144_0 = Arg7144[0], Arg7144_1 = Arg7144[1];
  return (Shen.call(Shen.fns["variable?"], [Arg7144_0]) && Shen.call(Shen.fns["variable?"], [Arg7144_1]))}, 2, [], "shen.ephemeral_variable?"];





Shen.fns["shen.prolog_constant?"] = [Shen.type_func, function shen_user_lambda7147(Arg7146) {
  if (Arg7146.length < 1) return [Shen.type_func, shen_user_lambda7147, 1, Arg7146];
  var Arg7146_0 = Arg7146[0];
  return ((Shen.is_type(Arg7146_0, Shen.type_cons))
  ? false
  : true)}, 1, [], "shen.prolog_constant?"];





Shen.fns["shen.aum_to_shen"] = [Shen.type_func, function shen_user_lambda7149(Arg7148) {
  if (Arg7148.length < 1) return [Shen.type_func, shen_user_lambda7149, 1, Arg7148];
  var Arg7148_0 = Arg7148[0];
  return (((Shen.is_type(Arg7148_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "let"], Arg7148_0[1])) && (Shen.is_type(Arg7148_0[2], Shen.type_cons) && (Shen.is_type(Arg7148_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.be"], Arg7148_0[2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2], Shen.type_cons) && (Shen.is_type(Arg7148_0[2][2][2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "in"], Arg7148_0[2][2][2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2][2][2], Shen.type_cons) && Shen.empty$question$(Arg7148_0[2][2][2][2][2][2])))))))))))
  ? [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, Arg7148_0[2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.aum_to_shen"], [Arg7148_0[2][2][2][1]]), [Shen.type_cons, Shen.call(Shen.fns["shen.aum_to_shen"], [Arg7148_0[2][2][2][2][2][1]]), []]]]]
  : (((Shen.is_type(Arg7148_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.the"], Arg7148_0[1])) && (Shen.is_type(Arg7148_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.result"], Arg7148_0[2][1])) && (Shen.is_type(Arg7148_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.of"], Arg7148_0[2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.dereferencing"], Arg7148_0[2][2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2][2], Shen.type_cons) && Shen.empty$question$(Arg7148_0[2][2][2][2][2])))))))))))
  ? [Shen.type_cons, [Shen.type_symbol, "shen.lazyderef"], [Shen.type_cons, Shen.call(Shen.fns["shen.aum_to_shen"], [Arg7148_0[2][2][2][2][1]]), [Shen.type_cons, [Shen.type_symbol, "ProcessN"], []]]]
  : (((Shen.is_type(Arg7148_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "if"], Arg7148_0[1])) && (Shen.is_type(Arg7148_0[2], Shen.type_cons) && (Shen.is_type(Arg7148_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.then"], Arg7148_0[2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2], Shen.type_cons) && (Shen.is_type(Arg7148_0[2][2][2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.else"], Arg7148_0[2][2][2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2][2][2], Shen.type_cons) && Shen.empty$question$(Arg7148_0[2][2][2][2][2][2])))))))))))
  ? [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, Shen.call(Shen.fns["shen.aum_to_shen"], [Arg7148_0[2][1]]), [Shen.type_cons, Shen.call(Shen.fns["shen.aum_to_shen"], [Arg7148_0[2][2][2][1]]), [Shen.type_cons, Shen.call(Shen.fns["shen.aum_to_shen"], [Arg7148_0[2][2][2][2][2][1]]), []]]]]
  : (((Shen.is_type(Arg7148_0, Shen.type_cons) && (Shen.is_type(Arg7148_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "is"], Arg7148_0[2][1])) && (Shen.is_type(Arg7148_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.a"], Arg7148_0[2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.variable"], Arg7148_0[2][2][2][1])) && Shen.empty$question$(Arg7148_0[2][2][2][2])))))))))
  ? [Shen.type_cons, [Shen.type_symbol, "shen.pvar?"], [Shen.type_cons, Arg7148_0[1], []]]
  : (((Shen.is_type(Arg7148_0, Shen.type_cons) && (Shen.is_type(Arg7148_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "is"], Arg7148_0[2][1])) && (Shen.is_type(Arg7148_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.a"], Arg7148_0[2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.non-empty"], Arg7148_0[2][2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "list"], Arg7148_0[2][2][2][2][1])) && Shen.empty$question$(Arg7148_0[2][2][2][2][2])))))))))))
  ? [Shen.type_cons, [Shen.type_symbol, "cons?"], [Shen.type_cons, Arg7148_0[1], []]]
  : (((Shen.is_type(Arg7148_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.rename"], Arg7148_0[1])) && (Shen.is_type(Arg7148_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.the"], Arg7148_0[2][1])) && (Shen.is_type(Arg7148_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.variables"], Arg7148_0[2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "in"], Arg7148_0[2][2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2][2], Shen.type_cons) && (Shen.empty$question$(Arg7148_0[2][2][2][2][1]) && (Shen.is_type(Arg7148_0[2][2][2][2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "and"], Arg7148_0[2][2][2][2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2][2][2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.then"], Arg7148_0[2][2][2][2][2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2][2][2][2][2], Shen.type_cons) && Shen.empty$question$(Arg7148_0[2][2][2][2][2][2][2][2])))))))))))))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.aum_to_shen"], [Arg7148_0[2][2][2][2][2][2][2][1]]);})
  : (((Shen.is_type(Arg7148_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.rename"], Arg7148_0[1])) && (Shen.is_type(Arg7148_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.the"], Arg7148_0[2][1])) && (Shen.is_type(Arg7148_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.variables"], Arg7148_0[2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "in"], Arg7148_0[2][2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2][2], Shen.type_cons) && (Shen.is_type(Arg7148_0[2][2][2][2][1], Shen.type_cons) && (Shen.is_type(Arg7148_0[2][2][2][2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "and"], Arg7148_0[2][2][2][2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2][2][2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.then"], Arg7148_0[2][2][2][2][2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2][2][2][2][2], Shen.type_cons) && Shen.empty$question$(Arg7148_0[2][2][2][2][2][2][2][2])))))))))))))))))
  ? [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, Arg7148_0[2][2][2][2][1][1], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.newpv"], [Shen.type_cons, [Shen.type_symbol, "ProcessN"], []]], [Shen.type_cons, Shen.call(Shen.fns["shen.aum_to_shen"], [[Shen.type_cons, [Shen.type_symbol, "shen.rename"], [Shen.type_cons, [Shen.type_symbol, "shen.the"], [Shen.type_cons, [Shen.type_symbol, "shen.variables"], [Shen.type_cons, [Shen.type_symbol, "in"], [Shen.type_cons, Arg7148_0[2][2][2][2][1][2], Arg7148_0[2][2][2][2][2]]]]]]]), []]]]]
  : (((Shen.is_type(Arg7148_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "bind"], Arg7148_0[1])) && (Shen.is_type(Arg7148_0[2], Shen.type_cons) && (Shen.is_type(Arg7148_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.to"], Arg7148_0[2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2], Shen.type_cons) && (Shen.is_type(Arg7148_0[2][2][2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "in"], Arg7148_0[2][2][2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2][2][2], Shen.type_cons) && Shen.empty$question$(Arg7148_0[2][2][2][2][2][2])))))))))))
  ? [Shen.type_cons, [Shen.type_symbol, "do"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.bindv"], [Shen.type_cons, Arg7148_0[2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.chwild"], [Arg7148_0[2][2][2][1]]), [Shen.type_cons, [Shen.type_symbol, "ProcessN"], []]]]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, [Shen.type_symbol, "Result"], [Shen.type_cons, Shen.call(Shen.fns["shen.aum_to_shen"], [Arg7148_0[2][2][2][2][2][1]]), [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "do"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.unbindv"], [Shen.type_cons, Arg7148_0[2][1], [Shen.type_cons, [Shen.type_symbol, "ProcessN"], []]]], [Shen.type_cons, [Shen.type_symbol, "Result"], []]]], []]]]], []]]]
  : (((Shen.is_type(Arg7148_0, Shen.type_cons) && (Shen.is_type(Arg7148_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "is"], Arg7148_0[2][1])) && (Shen.is_type(Arg7148_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "identical"], Arg7148_0[2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.to"], Arg7148_0[2][2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2][2], Shen.type_cons) && Shen.empty$question$(Arg7148_0[2][2][2][2][2]))))))))))
  ? [Shen.type_cons, [Shen.type_symbol, "="], [Shen.type_cons, Arg7148_0[2][2][2][2][1], [Shen.type_cons, Arg7148_0[1], []]]]
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.failed!"], Arg7148_0)))
  ? false
  : (((Shen.is_type(Arg7148_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.the"], Arg7148_0[1])) && (Shen.is_type(Arg7148_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "head"], Arg7148_0[2][1])) && (Shen.is_type(Arg7148_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.of"], Arg7148_0[2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2], Shen.type_cons) && Shen.empty$question$(Arg7148_0[2][2][2][2])))))))))
  ? [Shen.type_cons, [Shen.type_symbol, "hd"], Arg7148_0[2][2][2]]
  : (((Shen.is_type(Arg7148_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.the"], Arg7148_0[1])) && (Shen.is_type(Arg7148_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "tail"], Arg7148_0[2][1])) && (Shen.is_type(Arg7148_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.of"], Arg7148_0[2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2], Shen.type_cons) && Shen.empty$question$(Arg7148_0[2][2][2][2])))))))))
  ? [Shen.type_cons, [Shen.type_symbol, "tl"], Arg7148_0[2][2][2]]
  : (((Shen.is_type(Arg7148_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.pop"], Arg7148_0[1])) && (Shen.is_type(Arg7148_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.the"], Arg7148_0[2][1])) && (Shen.is_type(Arg7148_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.stack"], Arg7148_0[2][2][1])) && Shen.empty$question$(Arg7148_0[2][2][2]))))))))
  ? [Shen.type_cons, [Shen.type_symbol, "do"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.incinfs"], []], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "thaw"], [Shen.type_cons, [Shen.type_symbol, "Continuation"], []]], []]]]
  : (((Shen.is_type(Arg7148_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "call"], Arg7148_0[1])) && (Shen.is_type(Arg7148_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.the"], Arg7148_0[2][1])) && (Shen.is_type(Arg7148_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.continuation"], Arg7148_0[2][2][1])) && (Shen.is_type(Arg7148_0[2][2][2], Shen.type_cons) && Shen.empty$question$(Arg7148_0[2][2][2][2])))))))))
  ? [Shen.type_cons, [Shen.type_symbol, "do"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.incinfs"], []], [Shen.type_cons, Shen.call(Shen.fns["shen.call_the_continuation"], [Shen.call(Shen.fns["shen.chwild"], [Arg7148_0[2][2][2][1]]), [Shen.type_symbol, "ProcessN"], [Shen.type_symbol, "Continuation"]]), []]]]
  : Arg7148_0))))))))))))))}, 1, [], "shen.aum_to_shen"];





Shen.fns["shen.chwild"] = [Shen.type_func, function shen_user_lambda7151(Arg7150) {
  if (Arg7150.length < 1) return [Shen.type_func, shen_user_lambda7151, 1, Arg7150];
  var Arg7150_0 = Arg7150[0];
  return ((Shen.unwind_tail(Shen.$eq$(Arg7150_0, [Shen.type_symbol, "_"])))
  ? [Shen.type_cons, [Shen.type_symbol, "shen.newpv"], [Shen.type_cons, [Shen.type_symbol, "ProcessN"], []]]
  : ((Shen.is_type(Arg7150_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7153(Arg7152) {
  if (Arg7152.length < 1) return [Shen.type_func, shen_user_lambda7153, 1, Arg7152];
  var Arg7152_0 = Arg7152[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.chwild"], [Arg7152_0]);})}, 1, [], undefined], Arg7150_0]);})
  : Arg7150_0))}, 1, [], "shen.chwild"];





Shen.fns["shen.newpv"] = [Shen.type_func, function shen_user_lambda7155(Arg7154) {
  if (Arg7154.length < 1) return [Shen.type_func, shen_user_lambda7155, 1, Arg7154];
  var Arg7154_0 = Arg7154[0];
  var R0, R1;
  return ((R0 = (Shen.absvector_ref((Shen.globals["shen.*varcounter*"]), Arg7154_0) + 1)),
  Shen.absvector_set((Shen.globals["shen.*varcounter*"]), Arg7154_0, R0),
  (R1 = Shen.absvector_ref((Shen.globals["shen.*prologvectors*"]), Arg7154_0)),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.call(Shen.fns["limit"], [R1]))))
  ? Shen.call(Shen.fns["shen.resizeprocessvector"], [Arg7154_0, R0])
  : [Shen.type_symbol, "shen.skip"]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.mk-pvar"], [R0]);}))}, 1, [], "shen.newpv"];





Shen.fns["shen.resizeprocessvector"] = [Shen.type_func, function shen_user_lambda7157(Arg7156) {
  if (Arg7156.length < 2) return [Shen.type_func, shen_user_lambda7157, 2, Arg7156];
  var Arg7156_0 = Arg7156[0], Arg7156_1 = Arg7156[1];
  var R0;
  return ((R0 = Shen.absvector_ref((Shen.globals["shen.*prologvectors*"]), Arg7156_0)),
  (R0 = Shen.call(Shen.fns["shen.resize-vector"], [R0, (Arg7156_1 + Arg7156_1), [Shen.type_symbol, "shen.-null-"]])),
  Shen.absvector_set((Shen.globals["shen.*prologvectors*"]), Arg7156_0, R0))}, 2, [], "shen.resizeprocessvector"];





Shen.fns["shen.resize-vector"] = [Shen.type_func, function shen_user_lambda7159(Arg7158) {
  if (Arg7158.length < 3) return [Shen.type_func, shen_user_lambda7159, 3, Arg7158];
  var Arg7158_0 = Arg7158[0], Arg7158_1 = Arg7158[1], Arg7158_2 = Arg7158[2];
  var R0;
  return ((R0 = Shen.absvector_set(Shen.absvector((1 + Arg7158_1)), 0, Arg7158_1)),
  (function() {
  return Shen.call_tail(Shen.fns["shen.copy-vector"], [Arg7158_0, R0, Shen.call(Shen.fns["limit"], [Arg7158_0]), Arg7158_1, Arg7158_2]);}))}, 3, [], "shen.resize-vector"];





Shen.fns["shen.copy-vector"] = [Shen.type_func, function shen_user_lambda7161(Arg7160) {
  if (Arg7160.length < 5) return [Shen.type_func, shen_user_lambda7161, 5, Arg7160];
  var Arg7160_0 = Arg7160[0], Arg7160_1 = Arg7160[1], Arg7160_2 = Arg7160[2], Arg7160_3 = Arg7160[3], Arg7160_4 = Arg7160[4];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.copy-vector-stage-2"], [(1 + Arg7160_2), (Arg7160_3 + 1), Arg7160_4, Shen.call(Shen.fns["shen.copy-vector-stage-1"], [1, Arg7160_0, Arg7160_1, (1 + Arg7160_2)])]);})}, 5, [], "shen.copy-vector"];





Shen.fns["shen.copy-vector-stage-1"] = [Shen.type_func, function shen_user_lambda7163(Arg7162) {
  if (Arg7162.length < 4) return [Shen.type_func, shen_user_lambda7163, 4, Arg7162];
  var Arg7162_0 = Arg7162[0], Arg7162_1 = Arg7162[1], Arg7162_2 = Arg7162[2], Arg7162_3 = Arg7162[3];
  return ((Shen.unwind_tail(Shen.$eq$(Arg7162_3, Arg7162_0)))
  ? Arg7162_2
  : (function() {
  return Shen.call_tail(Shen.fns["shen.copy-vector-stage-1"], [(1 + Arg7162_0), Arg7162_1, Shen.absvector_set(Arg7162_2, Arg7162_0, Shen.absvector_ref(Arg7162_1, Arg7162_0)), Arg7162_3]);}))}, 4, [], "shen.copy-vector-stage-1"];





Shen.fns["shen.copy-vector-stage-2"] = [Shen.type_func, function shen_user_lambda7165(Arg7164) {
  if (Arg7164.length < 4) return [Shen.type_func, shen_user_lambda7165, 4, Arg7164];
  var Arg7164_0 = Arg7164[0], Arg7164_1 = Arg7164[1], Arg7164_2 = Arg7164[2], Arg7164_3 = Arg7164[3];
  return ((Shen.unwind_tail(Shen.$eq$(Arg7164_1, Arg7164_0)))
  ? Arg7164_3
  : (function() {
  return Shen.call_tail(Shen.fns["shen.copy-vector-stage-2"], [(Arg7164_0 + 1), Arg7164_1, Arg7164_2, Shen.absvector_set(Arg7164_3, Arg7164_0, Arg7164_2)]);}))}, 4, [], "shen.copy-vector-stage-2"];





Shen.fns["shen.mk-pvar"] = [Shen.type_func, function shen_user_lambda7167(Arg7166) {
  if (Arg7166.length < 1) return [Shen.type_func, shen_user_lambda7167, 1, Arg7166];
  var Arg7166_0 = Arg7166[0];
  return Shen.absvector_set(Shen.absvector_set(Shen.absvector(2), 0, [Shen.type_symbol, "shen.pvar"]), 1, Arg7166_0)}, 1, [], "shen.mk-pvar"];





Shen.fns["shen.pvar?"] = [Shen.type_func, function shen_user_lambda7171(Arg7168) {
  if (Arg7168.length < 1) return [Shen.type_func, shen_user_lambda7171, 1, Arg7168];
  var Arg7168_0 = Arg7168[0];
  var R0, R1;
  return ((R0 = [Shen.type_func, function shen_user_lambda7173(Arg7172) {
  if (Arg7172.length < 1) return [Shen.type_func, shen_user_lambda7173, 1, Arg7172];
  var Arg7172_0 = Arg7172[0];
  return (Shen.absvector$question$(Arg7172_0) && Shen.unwind_tail(Shen.$eq$(Shen.absvector_ref(Arg7172_0, 0), [Shen.type_symbol, "shen.pvar"])))}, 1, [Arg7168_0], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda7175(Arg7174) {
  if (Arg7174.length < 1) return [Shen.type_func, shen_user_lambda7175, 1, Arg7174];
  var Arg7174_0 = Arg7174[0];
  return false}, 1, [], undefined]),
  (function() {
  return Shen.trap_error(R0, R1);}))}, 1, [], "shen.pvar?"];





Shen.fns["shen.bindv"] = [Shen.type_func, function shen_user_lambda7177(Arg7176) {
  if (Arg7176.length < 3) return [Shen.type_func, shen_user_lambda7177, 3, Arg7176];
  var Arg7176_0 = Arg7176[0], Arg7176_1 = Arg7176[1], Arg7176_2 = Arg7176[2];
  var R0;
  return ((R0 = Shen.absvector_ref((Shen.globals["shen.*prologvectors*"]), Arg7176_2)),
  Shen.absvector_set(R0, Shen.absvector_ref(Arg7176_0, 1), Arg7176_1))}, 3, [], "shen.bindv"];





Shen.fns["shen.unbindv"] = [Shen.type_func, function shen_user_lambda7179(Arg7178) {
  if (Arg7178.length < 2) return [Shen.type_func, shen_user_lambda7179, 2, Arg7178];
  var Arg7178_0 = Arg7178[0], Arg7178_1 = Arg7178[1];
  var R0;
  return ((R0 = Shen.absvector_ref((Shen.globals["shen.*prologvectors*"]), Arg7178_1)),
  Shen.absvector_set(R0, Shen.absvector_ref(Arg7178_0, 1), [Shen.type_symbol, "shen.-null-"]))}, 2, [], "shen.unbindv"];





Shen.fns["shen.incinfs"] = [Shen.type_func, function shen_user_lambda7181(Arg7180) {
  if (Arg7180.length < 0) return [Shen.type_func, shen_user_lambda7181, 0, Arg7180];
  return (Shen.globals["shen.*infs*"] = (1 + (Shen.globals["shen.*infs*"])))}, 0, [], "shen.incinfs"];





Shen.fns["shen.call_the_continuation"] = [Shen.type_func, function shen_user_lambda7183(Arg7182) {
  if (Arg7182.length < 3) return [Shen.type_func, shen_user_lambda7183, 3, Arg7182];
  var Arg7182_0 = Arg7182[0], Arg7182_1 = Arg7182[1], Arg7182_2 = Arg7182[2];
  var R0;
  return (((Shen.is_type(Arg7182_0, Shen.type_cons) && (Shen.is_type(Arg7182_0[1], Shen.type_cons) && Shen.empty$question$(Arg7182_0[2]))))
  ? [Shen.type_cons, Arg7182_0[1][1], Shen.call(Shen.fns["append"], [Arg7182_0[1][2], [Shen.type_cons, Arg7182_1, [Shen.type_cons, Arg7182_2, []]]])]
  : (((Shen.is_type(Arg7182_0, Shen.type_cons) && Shen.is_type(Arg7182_0[1], Shen.type_cons)))
  ? ((R0 = Shen.call(Shen.fns["shen.newcontinuation"], [Arg7182_0[2], Arg7182_1, Arg7182_2])),
  [Shen.type_cons, Arg7182_0[1][1], Shen.call(Shen.fns["append"], [Arg7182_0[1][2], [Shen.type_cons, Arg7182_1, [Shen.type_cons, R0, []]]])])
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.call_the_continuation"]]);})))}, 3, [], "shen.call_the_continuation"];





Shen.fns["shen.newcontinuation"] = [Shen.type_func, function shen_user_lambda7185(Arg7184) {
  if (Arg7184.length < 3) return [Shen.type_func, shen_user_lambda7185, 3, Arg7184];
  var Arg7184_0 = Arg7184[0], Arg7184_1 = Arg7184[1], Arg7184_2 = Arg7184[2];
  return ((Shen.empty$question$(Arg7184_0))
  ? Arg7184_2
  : (((Shen.is_type(Arg7184_0, Shen.type_cons) && Shen.is_type(Arg7184_0[1], Shen.type_cons)))
  ? [Shen.type_cons, [Shen.type_symbol, "freeze"], [Shen.type_cons, [Shen.type_cons, Arg7184_0[1][1], Shen.call(Shen.fns["append"], [Arg7184_0[1][2], [Shen.type_cons, Arg7184_1, [Shen.type_cons, Shen.call(Shen.fns["shen.newcontinuation"], [Arg7184_0[2], Arg7184_1, Arg7184_2]), []]]])], []]]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.newcontinuation"]]);})))}, 3, [], "shen.newcontinuation"];





Shen.fns["return"] = [Shen.type_func, function shen_user_lambda7187(Arg7186) {
  if (Arg7186.length < 3) return [Shen.type_func, shen_user_lambda7187, 3, Arg7186];
  var Arg7186_0 = Arg7186[0], Arg7186_1 = Arg7186[1], Arg7186_2 = Arg7186[2];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.deref"], [Arg7186_0, Arg7186_1]);})}, 3, [], "return"];





Shen.fns["shen.measure&return"] = [Shen.type_func, function shen_user_lambda7189(Arg7188) {
  if (Arg7188.length < 3) return [Shen.type_func, shen_user_lambda7189, 3, Arg7188];
  var Arg7188_0 = Arg7188[0], Arg7188_1 = Arg7188[1], Arg7188_2 = Arg7188[2];
  return (Shen.call(Shen.fns["shen.prhush"], [Shen.call(Shen.fns["shen.app"], [(Shen.globals["shen.*infs*"]), " inferences\x0d\x0a", [Shen.type_symbol, "shen.a"]]), Shen.call(Shen.fns["stoutput"], [])]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.deref"], [Arg7188_0, Arg7188_1]);}))}, 3, [], "shen.measure&return"];





Shen.fns["unify"] = [Shen.type_func, function shen_user_lambda7191(Arg7190) {
  if (Arg7190.length < 4) return [Shen.type_func, shen_user_lambda7191, 4, Arg7190];
  var Arg7190_0 = Arg7190[0], Arg7190_1 = Arg7190[1], Arg7190_2 = Arg7190[2], Arg7190_3 = Arg7190[3];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.lzy="], [Shen.call(Shen.fns["shen.lazyderef"], [Arg7190_0, Arg7190_2]), Shen.call(Shen.fns["shen.lazyderef"], [Arg7190_1, Arg7190_2]), Arg7190_2, Arg7190_3]);})}, 4, [], "unify"];





Shen.fns["shen.lzy="] = [Shen.type_func, function shen_user_lambda7193(Arg7192) {
  if (Arg7192.length < 4) return [Shen.type_func, shen_user_lambda7193, 4, Arg7192];
  var Arg7192_0 = Arg7192[0], Arg7192_1 = Arg7192[1], Arg7192_2 = Arg7192[2], Arg7192_3 = Arg7192[3];
  return ((Shen.unwind_tail(Shen.$eq$(Arg7192_1, Arg7192_0)))
  ? Shen.thaw(Arg7192_3)
  : ((Shen.call(Shen.fns["shen.pvar?"], [Arg7192_0]))
  ? (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg7192_0, Arg7192_1, Arg7192_2, Arg7192_3]);})
  : ((Shen.call(Shen.fns["shen.pvar?"], [Arg7192_1]))
  ? (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg7192_1, Arg7192_0, Arg7192_2, Arg7192_3]);})
  : (((Shen.is_type(Arg7192_0, Shen.type_cons) && Shen.is_type(Arg7192_1, Shen.type_cons)))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.lzy="], [Shen.call(Shen.fns["shen.lazyderef"], [Arg7192_0[1], Arg7192_2]), Shen.call(Shen.fns["shen.lazyderef"], [Arg7192_1[1], Arg7192_2]), Arg7192_2, [Shen.type_func, function shen_user_lambda7195(Arg7194) {
  if (Arg7194.length < 4) return [Shen.type_func, shen_user_lambda7195, 4, Arg7194];
  var Arg7194_0 = Arg7194[0], Arg7194_1 = Arg7194[1], Arg7194_2 = Arg7194[2], Arg7194_3 = Arg7194[3];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.lzy="], [Shen.call(Shen.fns["shen.lazyderef"], [Arg7194_0[2], Arg7194_2]), Shen.call(Shen.fns["shen.lazyderef"], [Arg7194_1[2], Arg7194_2]), Arg7194_2, Arg7194_3]);})}, 4, [Arg7192_0, Arg7192_1, Arg7192_2, Arg7192_3], undefined]]);})
  : false))))}, 4, [], "shen.lzy="];





Shen.fns["shen.deref"] = [Shen.type_func, function shen_user_lambda7197(Arg7196) {
  if (Arg7196.length < 2) return [Shen.type_func, shen_user_lambda7197, 2, Arg7196];
  var Arg7196_0 = Arg7196[0], Arg7196_1 = Arg7196[1];
  var R0;
  return ((Shen.is_type(Arg7196_0, Shen.type_cons))
  ? [Shen.type_cons, Shen.call(Shen.fns["shen.deref"], [Arg7196_0[1], Arg7196_1]), Shen.call(Shen.fns["shen.deref"], [Arg7196_0[2], Arg7196_1])]
  : ((Shen.call(Shen.fns["shen.pvar?"], [Arg7196_0]))
  ? ((R0 = Shen.call(Shen.fns["shen.valvector"], [Arg7196_0, Arg7196_1])),
  ((Shen.unwind_tail(Shen.$eq$(R0, [Shen.type_symbol, "shen.-null-"])))
  ? Arg7196_0
  : (function() {
  return Shen.call_tail(Shen.fns["shen.deref"], [R0, Arg7196_1]);})))
  : Arg7196_0))}, 2, [], "shen.deref"];





Shen.fns["shen.lazyderef"] = [Shen.type_func, function shen_user_lambda7199(Arg7198) {
  if (Arg7198.length < 2) return [Shen.type_func, shen_user_lambda7199, 2, Arg7198];
  var Arg7198_0 = Arg7198[0], Arg7198_1 = Arg7198[1];
  var R0;
  return ((Shen.call(Shen.fns["shen.pvar?"], [Arg7198_0]))
  ? ((R0 = Shen.call(Shen.fns["shen.valvector"], [Arg7198_0, Arg7198_1])),
  ((Shen.unwind_tail(Shen.$eq$(R0, [Shen.type_symbol, "shen.-null-"])))
  ? Arg7198_0
  : (function() {
  return Shen.call_tail(Shen.fns["shen.lazyderef"], [R0, Arg7198_1]);})))
  : Arg7198_0)}, 2, [], "shen.lazyderef"];





Shen.fns["shen.valvector"] = [Shen.type_func, function shen_user_lambda7201(Arg7200) {
  if (Arg7200.length < 2) return [Shen.type_func, shen_user_lambda7201, 2, Arg7200];
  var Arg7200_0 = Arg7200[0], Arg7200_1 = Arg7200[1];
  return Shen.absvector_ref(Shen.absvector_ref((Shen.globals["shen.*prologvectors*"]), Arg7200_1), Shen.absvector_ref(Arg7200_0, 1))}, 2, [], "shen.valvector"];





Shen.fns["unify!"] = [Shen.type_func, function shen_user_lambda7203(Arg7202) {
  if (Arg7202.length < 4) return [Shen.type_func, shen_user_lambda7203, 4, Arg7202];
  var Arg7202_0 = Arg7202[0], Arg7202_1 = Arg7202[1], Arg7202_2 = Arg7202[2], Arg7202_3 = Arg7202[3];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.lzy=!"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg7202_0, Arg7202_2]), Shen.call(Shen.fns["shen.lazyderef"], [Arg7202_1, Arg7202_2]), Arg7202_2, Arg7202_3]);})}, 4, [], "unify!"];





Shen.fns["shen.lzy=!"] = [Shen.type_func, function shen_user_lambda7205(Arg7204) {
  if (Arg7204.length < 4) return [Shen.type_func, shen_user_lambda7205, 4, Arg7204];
  var Arg7204_0 = Arg7204[0], Arg7204_1 = Arg7204[1], Arg7204_2 = Arg7204[2], Arg7204_3 = Arg7204[3];
  return ((Shen.unwind_tail(Shen.$eq$(Arg7204_1, Arg7204_0)))
  ? Shen.thaw(Arg7204_3)
  : (((Shen.call(Shen.fns["shen.pvar?"], [Arg7204_0]) && (!Shen.call(Shen.fns["shen.occurs?"], [Arg7204_0, Shen.call(Shen.fns["shen.deref"], [Arg7204_1, Arg7204_2])]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg7204_0, Arg7204_1, Arg7204_2, Arg7204_3]);})
  : (((Shen.call(Shen.fns["shen.pvar?"], [Arg7204_1]) && (!Shen.call(Shen.fns["shen.occurs?"], [Arg7204_1, Shen.call(Shen.fns["shen.deref"], [Arg7204_0, Arg7204_2])]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg7204_1, Arg7204_0, Arg7204_2, Arg7204_3]);})
  : (((Shen.is_type(Arg7204_0, Shen.type_cons) && Shen.is_type(Arg7204_1, Shen.type_cons)))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.lzy=!"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg7204_0[1], Arg7204_2]), Shen.call(Shen.fns["shen.lazyderef"], [Arg7204_1[1], Arg7204_2]), Arg7204_2, [Shen.type_func, function shen_user_lambda7207(Arg7206) {
  if (Arg7206.length < 4) return [Shen.type_func, shen_user_lambda7207, 4, Arg7206];
  var Arg7206_0 = Arg7206[0], Arg7206_1 = Arg7206[1], Arg7206_2 = Arg7206[2], Arg7206_3 = Arg7206[3];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.lzy=!"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg7206_0[2], Arg7206_2]), Shen.call(Shen.fns["shen.lazyderef"], [Arg7206_1[2], Arg7206_2]), Arg7206_2, Arg7206_3]);})}, 4, [Arg7204_0, Arg7204_1, Arg7204_2, Arg7204_3], undefined]]);})
  : false))))}, 4, [], "shen.lzy=!"];





Shen.fns["shen.occurs?"] = [Shen.type_func, function shen_user_lambda7209(Arg7208) {
  if (Arg7208.length < 2) return [Shen.type_func, shen_user_lambda7209, 2, Arg7208];
  var Arg7208_0 = Arg7208[0], Arg7208_1 = Arg7208[1];
  return ((Shen.unwind_tail(Shen.$eq$(Arg7208_1, Arg7208_0)))
  ? true
  : ((Shen.is_type(Arg7208_1, Shen.type_cons))
  ? (Shen.call(Shen.fns["shen.occurs?"], [Arg7208_0, Arg7208_1[1]]) || Shen.call(Shen.fns["shen.occurs?"], [Arg7208_0, Arg7208_1[2]]))
  : false))}, 2, [], "shen.occurs?"];





Shen.fns["identical"] = [Shen.type_func, function shen_user_lambda7211(Arg7210) {
  if (Arg7210.length < 4) return [Shen.type_func, shen_user_lambda7211, 4, Arg7210];
  var Arg7210_0 = Arg7210[0], Arg7210_1 = Arg7210[1], Arg7210_2 = Arg7210[2], Arg7210_3 = Arg7210[3];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.lzy=="], [Shen.call(Shen.fns["shen.lazyderef"], [Arg7210_0, Arg7210_2]), Shen.call(Shen.fns["shen.lazyderef"], [Arg7210_1, Arg7210_2]), Arg7210_2, Arg7210_3]);})}, 4, [], "identical"];





Shen.fns["shen.lzy=="] = [Shen.type_func, function shen_user_lambda7213(Arg7212) {
  if (Arg7212.length < 4) return [Shen.type_func, shen_user_lambda7213, 4, Arg7212];
  var Arg7212_0 = Arg7212[0], Arg7212_1 = Arg7212[1], Arg7212_2 = Arg7212[2], Arg7212_3 = Arg7212[3];
  return ((Shen.unwind_tail(Shen.$eq$(Arg7212_1, Arg7212_0)))
  ? Shen.thaw(Arg7212_3)
  : (((Shen.is_type(Arg7212_0, Shen.type_cons) && Shen.is_type(Arg7212_1, Shen.type_cons)))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.lzy=="], [Shen.call(Shen.fns["shen.lazyderef"], [Arg7212_0[1], Arg7212_2]), Shen.call(Shen.fns["shen.lazyderef"], [Arg7212_1[1], Arg7212_2]), Arg7212_2, [Shen.type_func, function shen_user_lambda7215(Arg7214) {
  if (Arg7214.length < 4) return [Shen.type_func, shen_user_lambda7215, 4, Arg7214];
  var Arg7214_0 = Arg7214[0], Arg7214_1 = Arg7214[1], Arg7214_2 = Arg7214[2], Arg7214_3 = Arg7214[3];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.lzy=="], [Arg7214_0[2], Arg7214_1[2], Arg7214_2, Arg7214_3]);})}, 4, [Arg7212_0, Arg7212_1, Arg7212_2, Arg7212_3], undefined]]);})
  : false))}, 4, [], "shen.lzy=="];





Shen.fns["shen.pvar"] = [Shen.type_func, function shen_user_lambda7217(Arg7216) {
  if (Arg7216.length < 1) return [Shen.type_func, shen_user_lambda7217, 1, Arg7216];
  var Arg7216_0 = Arg7216[0];
  return ("Var" + Shen.call(Shen.fns["shen.app"], [Shen.absvector_ref(Arg7216_0, 1), "", [Shen.type_symbol, "shen.a"]]))}, 1, [], "shen.pvar"];





Shen.fns["bind"] = [Shen.type_func, function shen_user_lambda7219(Arg7218) {
  if (Arg7218.length < 4) return [Shen.type_func, shen_user_lambda7219, 4, Arg7218];
  var Arg7218_0 = Arg7218[0], Arg7218_1 = Arg7218[1], Arg7218_2 = Arg7218[2], Arg7218_3 = Arg7218[3];
  var R0;
  return (Shen.call(Shen.fns["shen.bindv"], [Arg7218_0, Arg7218_1, Arg7218_2]),
  (R0 = Shen.unwind_tail(Shen.thaw(Arg7218_3))),
  Shen.call(Shen.fns["shen.unbindv"], [Arg7218_0, Arg7218_2]),
  R0)}, 4, [], "bind"];





Shen.fns["fwhen"] = [Shen.type_func, function shen_user_lambda7221(Arg7220) {
  if (Arg7220.length < 3) return [Shen.type_func, shen_user_lambda7221, 3, Arg7220];
  var Arg7220_0 = Arg7220[0], Arg7220_1 = Arg7220[1], Arg7220_2 = Arg7220[2];
  return ((Shen.unwind_tail(Shen.$eq$(true, Arg7220_0)))
  ? Shen.thaw(Arg7220_2)
  : ((Shen.unwind_tail(Shen.$eq$(false, Arg7220_0)))
  ? false
  : (function() {
  return Shen.simple_error(("fwhen expects a boolean: not " + Shen.call(Shen.fns["shen.app"], [Arg7220_0, "%", [Shen.type_symbol, "shen.s"]])));})))}, 3, [], "fwhen"];





Shen.fns["call"] = [Shen.type_func, function shen_user_lambda7223(Arg7222) {
  if (Arg7222.length < 3) return [Shen.type_func, shen_user_lambda7223, 3, Arg7222];
  var Arg7222_0 = Arg7222[0], Arg7222_1 = Arg7222[1], Arg7222_2 = Arg7222[2];
  return ((Shen.is_type(Arg7222_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.call-help"], [Shen.call(Shen.fns["shen.m_prolog_to_s-prolog_predicate"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg7222_0[1], Arg7222_1])]), Arg7222_0[2], Arg7222_1, Arg7222_2]);})
  : false)}, 3, [], "call"];





Shen.fns["shen.call-help"] = [Shen.type_func, function shen_user_lambda7225(Arg7224) {
  if (Arg7224.length < 4) return [Shen.type_func, shen_user_lambda7225, 4, Arg7224];
  var Arg7224_0 = Arg7224[0], Arg7224_1 = Arg7224[1], Arg7224_2 = Arg7224[2], Arg7224_3 = Arg7224[3];
  return ((Shen.empty$question$(Arg7224_1))
  ? (function() {
  return Shen.call_tail(Arg7224_0, [Arg7224_2, Arg7224_3]);})
  : ((Shen.is_type(Arg7224_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.call-help"], [Shen.call(Arg7224_0, [Arg7224_1[1]]), Arg7224_1[2], Arg7224_2, Arg7224_3]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.call-help"]]);})))}, 4, [], "shen.call-help"];





Shen.fns["shen.intprolog"] = [Shen.type_func, function shen_user_lambda7227(Arg7226) {
  if (Arg7226.length < 1) return [Shen.type_func, shen_user_lambda7227, 1, Arg7226];
  var Arg7226_0 = Arg7226[0];
  var R0;
  return (((Shen.is_type(Arg7226_0, Shen.type_cons) && Shen.is_type(Arg7226_0[1], Shen.type_cons)))
  ? ((R0 = Shen.call(Shen.fns["shen.start-new-prolog-process"], [])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.intprolog-help"], [Arg7226_0[1][1], Shen.call(Shen.fns["shen.insert-prolog-variables"], [[Shen.type_cons, Arg7226_0[1][2], [Shen.type_cons, Arg7226_0[2], []]], R0]), R0]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.intprolog"]]);}))}, 1, [], "shen.intprolog"];





Shen.fns["shen.intprolog-help"] = [Shen.type_func, function shen_user_lambda7229(Arg7228) {
  if (Arg7228.length < 3) return [Shen.type_func, shen_user_lambda7229, 3, Arg7228];
  var Arg7228_0 = Arg7228[0], Arg7228_1 = Arg7228[1], Arg7228_2 = Arg7228[2];
  return (((Shen.is_type(Arg7228_1, Shen.type_cons) && (Shen.is_type(Arg7228_1[2], Shen.type_cons) && Shen.empty$question$(Arg7228_1[2][2]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.intprolog-help-help"], [Arg7228_0, Arg7228_1[1], Arg7228_1[2][1], Arg7228_2]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.intprolog-help"]]);}))}, 3, [], "shen.intprolog-help"];





Shen.fns["shen.intprolog-help-help"] = [Shen.type_func, function shen_user_lambda7231(Arg7230) {
  if (Arg7230.length < 4) return [Shen.type_func, shen_user_lambda7231, 4, Arg7230];
  var Arg7230_0 = Arg7230[0], Arg7230_1 = Arg7230[1], Arg7230_2 = Arg7230[2], Arg7230_3 = Arg7230[3];
  return ((Shen.empty$question$(Arg7230_1))
  ? (function() {
  return Shen.call_tail(Arg7230_0, [Arg7230_3, [Shen.type_func, function shen_user_lambda7233(Arg7232) {
  if (Arg7232.length < 4) return [Shen.type_func, shen_user_lambda7233, 4, Arg7232];
  var Arg7232_0 = Arg7232[0], Arg7232_1 = Arg7232[1], Arg7232_2 = Arg7232[2], Arg7232_3 = Arg7232[3];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.call-rest"], [Arg7232_2, Arg7232_3]);})}, 4, [Arg7230_0, Arg7230_1, Arg7230_2, Arg7230_3], undefined]]);})
  : ((Shen.is_type(Arg7230_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.intprolog-help-help"], [Shen.call(Arg7230_0, [Arg7230_1[1]]), Arg7230_1[2], Arg7230_2, Arg7230_3]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.intprolog-help-help"]]);})))}, 4, [], "shen.intprolog-help-help"];





Shen.fns["shen.call-rest"] = [Shen.type_func, function shen_user_lambda7235(Arg7234) {
  if (Arg7234.length < 2) return [Shen.type_func, shen_user_lambda7235, 2, Arg7234];
  var Arg7234_0 = Arg7234[0], Arg7234_1 = Arg7234[1];
  return ((Shen.empty$question$(Arg7234_0))
  ? true
  : (((Shen.is_type(Arg7234_0, Shen.type_cons) && (Shen.is_type(Arg7234_0[1], Shen.type_cons) && Shen.is_type(Arg7234_0[1][2], Shen.type_cons))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.call-rest"], [[Shen.type_cons, [Shen.type_cons, Shen.call(Arg7234_0[1][1], [Arg7234_0[1][2][1]]), Arg7234_0[1][2][2]], Arg7234_0[2]], Arg7234_1]);})
  : (((Shen.is_type(Arg7234_0, Shen.type_cons) && (Shen.is_type(Arg7234_0[1], Shen.type_cons) && Shen.empty$question$(Arg7234_0[1][2]))))
  ? (function() {
  return Shen.call_tail(Arg7234_0[1][1], [Arg7234_1, [Shen.type_func, function shen_user_lambda7237(Arg7236) {
  if (Arg7236.length < 2) return [Shen.type_func, shen_user_lambda7237, 2, Arg7236];
  var Arg7236_0 = Arg7236[0], Arg7236_1 = Arg7236[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.call-rest"], [Arg7236_0[2], Arg7236_1]);})}, 2, [Arg7234_0, Arg7234_1], undefined]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.call-rest"]]);}))))}, 2, [], "shen.call-rest"];





Shen.fns["shen.start-new-prolog-process"] = [Shen.type_func, function shen_user_lambda7239(Arg7238) {
  if (Arg7238.length < 0) return [Shen.type_func, shen_user_lambda7239, 0, Arg7238];
  var R0;
  return ((R0 = (Shen.globals["shen.*process-counter*"] = (1 + (Shen.globals["shen.*process-counter*"])))),
  (function() {
  return Shen.call_tail(Shen.fns["shen.initialise-prolog"], [R0]);}))}, 0, [], "shen.start-new-prolog-process"];





Shen.fns["shen.insert-prolog-variables"] = [Shen.type_func, function shen_user_lambda7241(Arg7240) {
  if (Arg7240.length < 2) return [Shen.type_func, shen_user_lambda7241, 2, Arg7240];
  var Arg7240_0 = Arg7240[0], Arg7240_1 = Arg7240[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.insert-prolog-variables-help"], [Arg7240_0, Shen.call(Shen.fns["shen.flatten"], [Arg7240_0]), Arg7240_1]);})}, 2, [], "shen.insert-prolog-variables"];





Shen.fns["shen.insert-prolog-variables-help"] = [Shen.type_func, function shen_user_lambda7243(Arg7242) {
  if (Arg7242.length < 3) return [Shen.type_func, shen_user_lambda7243, 3, Arg7242];
  var Arg7242_0 = Arg7242[0], Arg7242_1 = Arg7242[1], Arg7242_2 = Arg7242[2];
  var R0, R1;
  return ((Shen.empty$question$(Arg7242_1))
  ? Arg7242_0
  : (((Shen.is_type(Arg7242_1, Shen.type_cons) && Shen.call(Shen.fns["variable?"], [Arg7242_1[1]])))
  ? ((R0 = Shen.call(Shen.fns["shen.newpv"], [Arg7242_2])),
  (R0 = Shen.call(Shen.fns["subst"], [R0, Arg7242_1[1], Arg7242_0])),
  (R1 = Shen.call(Shen.fns["remove"], [Arg7242_1[1], Arg7242_1[2]])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.insert-prolog-variables-help"], [R0, R1, Arg7242_2]);}))
  : ((Shen.is_type(Arg7242_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.insert-prolog-variables-help"], [Arg7242_0, Arg7242_1[2], Arg7242_2]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.insert-prolog-variables-help"]]);}))))}, 3, [], "shen.insert-prolog-variables-help"];





Shen.fns["shen.initialise-prolog"] = [Shen.type_func, function shen_user_lambda7245(Arg7244) {
  if (Arg7244.length < 1) return [Shen.type_func, shen_user_lambda7245, 1, Arg7244];
  var Arg7244_0 = Arg7244[0];
  return (Shen.absvector_set((Shen.globals["shen.*prologvectors*"]), Arg7244_0, Shen.call(Shen.fns["shen.fillvector"], [Shen.vector(10), 1, 10, [Shen.type_symbol, "shen.-null-"]])),
  Shen.absvector_set((Shen.globals["shen.*varcounter*"]), Arg7244_0, 1),
  Arg7244_0)}, 1, [], "shen.initialise-prolog"];










Shen.fns["shen.f_error"] = [Shen.type_func, function shen_user_lambda7936(Arg7935) {
  if (Arg7935.length < 1) return [Shen.type_func, shen_user_lambda7936, 1, Arg7935];
  var Arg7935_0 = Arg7935[0];
  return (Shen.call(Shen.fns["shen.prhush"], [("partial function " + Shen.call(Shen.fns["shen.app"], [Arg7935_0, ";\x0d\x0a", [Shen.type_symbol, "shen.a"]])), Shen.call(Shen.fns["stoutput"], [])]),
  ((((!Shen.call(Shen.fns["shen.tracked?"], [Arg7935_0])) && Shen.call(Shen.fns["y-or-n?"], [("track " + Shen.call(Shen.fns["shen.app"], [Arg7935_0, "? ", [Shen.type_symbol, "shen.a"]]))])))
  ? Shen.call(Shen.fns["shen.track-function"], [Shen.call(Shen.fns["ps"], [Arg7935_0])])
  : [Shen.type_symbol, "shen.ok"]),
  (function() {
  return Shen.simple_error("aborted");}))}, 1, [], "shen.f_error"];





Shen.fns["shen.tracked?"] = [Shen.type_func, function shen_user_lambda7938(Arg7937) {
  if (Arg7937.length < 1) return [Shen.type_func, shen_user_lambda7938, 1, Arg7937];
  var Arg7937_0 = Arg7937[0];
  return (function() {
  return Shen.call_tail(Shen.fns["element?"], [Arg7937_0, (Shen.globals["shen.*tracking*"])]);})}, 1, [], "shen.tracked?"];





Shen.fns["track"] = [Shen.type_func, function shen_user_lambda7940(Arg7939) {
  if (Arg7939.length < 1) return [Shen.type_func, shen_user_lambda7940, 1, Arg7939];
  var Arg7939_0 = Arg7939[0];
  var R0;
  return ((R0 = Shen.call(Shen.fns["ps"], [Arg7939_0])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.track-function"], [R0]);}))}, 1, [], "track"];





Shen.fns["shen.track-function"] = [Shen.type_func, function shen_user_lambda7942(Arg7941) {
  if (Arg7941.length < 1) return [Shen.type_func, shen_user_lambda7942, 1, Arg7941];
  var Arg7941_0 = Arg7941[0];
  var R0;
  return (((Shen.is_type(Arg7941_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "defun"], Arg7941_0[1])) && (Shen.is_type(Arg7941_0[2], Shen.type_cons) && (Shen.is_type(Arg7941_0[2][2], Shen.type_cons) && (Shen.is_type(Arg7941_0[2][2][2], Shen.type_cons) && Shen.empty$question$(Arg7941_0[2][2][2][2])))))))
  ? ((R0 = [Shen.type_cons, [Shen.type_symbol, "defun"], [Shen.type_cons, Arg7941_0[2][1], [Shen.type_cons, Arg7941_0[2][2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.insert-tracking-code"], [Arg7941_0[2][1], Arg7941_0[2][2][1], Arg7941_0[2][2][2][1]]), []]]]]),
  (R0 = Shen.eval_kl(R0)),
  (Shen.globals["shen.*tracking*"] = [Shen.type_cons, R0, (Shen.globals["shen.*tracking*"])]),
  R0)
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.track-function"]]);}))}, 1, [], "shen.track-function"];





Shen.fns["shen.insert-tracking-code"] = [Shen.type_func, function shen_user_lambda7944(Arg7943) {
  if (Arg7943.length < 3) return [Shen.type_func, shen_user_lambda7944, 3, Arg7943];
  var Arg7943_0 = Arg7943[0], Arg7943_1 = Arg7943[1], Arg7943_2 = Arg7943[2];
  return [Shen.type_cons, [Shen.type_symbol, "do"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "set"], [Shen.type_cons, [Shen.type_symbol, "shen.*call*"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "+"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "value"], [Shen.type_cons, [Shen.type_symbol, "shen.*call*"], []]], [Shen.type_cons, 1, []]]], []]]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "do"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.input-track"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "value"], [Shen.type_cons, [Shen.type_symbol, "shen.*call*"], []]], [Shen.type_cons, Arg7943_0, [Shen.type_cons, Shen.call(Shen.fns["shen.cons_form"], [Arg7943_1]), []]]]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "do"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.terpri-or-read-char"], []], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, [Shen.type_symbol, "Result"], [Shen.type_cons, Arg7943_2, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "do"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.output-track"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "value"], [Shen.type_cons, [Shen.type_symbol, "shen.*call*"], []]], [Shen.type_cons, Arg7943_0, [Shen.type_cons, [Shen.type_symbol, "Result"], []]]]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "do"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "set"], [Shen.type_cons, [Shen.type_symbol, "shen.*call*"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "-"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "value"], [Shen.type_cons, [Shen.type_symbol, "shen.*call*"], []]], [Shen.type_cons, 1, []]]], []]]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "do"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.terpri-or-read-char"], []], [Shen.type_cons, [Shen.type_symbol, "Result"], []]]], []]]], []]]], []]]]], []]]], []]]], []]]]}, 3, [], "shen.insert-tracking-code"];





Shen.call_toplevel(function js$dot$shen_js_toplevel7947(Arg7945) {
  if (Arg7945.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel7947, 0, Arg7945];
  return (Shen.globals["shen.*step*"] = false)});




Shen.fns["step"] = [Shen.type_func, function shen_user_lambda7949(Arg7948) {
  if (Arg7948.length < 1) return [Shen.type_func, shen_user_lambda7949, 1, Arg7948];
  var Arg7948_0 = Arg7948[0];
  return ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "+"], Arg7948_0)))
  ? (Shen.globals["shen.*step*"] = true)
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "-"], Arg7948_0)))
  ? (Shen.globals["shen.*step*"] = false)
  : (function() {
  return Shen.simple_error("step expects a + or a -.\x0d\x0a");})))}, 1, [], "step"];





Shen.fns["spy"] = [Shen.type_func, function shen_user_lambda7951(Arg7950) {
  if (Arg7950.length < 1) return [Shen.type_func, shen_user_lambda7951, 1, Arg7950];
  var Arg7950_0 = Arg7950[0];
  return ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "+"], Arg7950_0)))
  ? (Shen.globals["shen.*spy*"] = true)
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "-"], Arg7950_0)))
  ? (Shen.globals["shen.*spy*"] = false)
  : (function() {
  return Shen.simple_error("spy expects a + or a -.\x0d\x0a");})))}, 1, [], "spy"];





Shen.fns["shen.terpri-or-read-char"] = [Shen.type_func, function shen_user_lambda7953(Arg7952) {
  if (Arg7952.length < 0) return [Shen.type_func, shen_user_lambda7953, 0, Arg7952];
  return (((Shen.globals["shen.*step*"]))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.check-byte"], [Shen.read_byte((Shen.globals["*stinput*"]))]);})
  : (function() {
  return Shen.call_tail(Shen.fns["nl"], [1]);}))}, 0, [], "shen.terpri-or-read-char"];





Shen.fns["shen.check-byte"] = [Shen.type_func, function shen_user_lambda7955(Arg7954) {
  if (Arg7954.length < 1) return [Shen.type_func, shen_user_lambda7955, 1, Arg7954];
  var Arg7954_0 = Arg7954[0];
  return ((Shen.unwind_tail(Shen.$eq$(Arg7954_0, Shen.call(Shen.fns["shen.hat"], []))))
  ? (function() {
  return Shen.simple_error("aborted");})
  : true)}, 1, [], "shen.check-byte"];





Shen.fns["shen.input-track"] = [Shen.type_func, function shen_user_lambda7957(Arg7956) {
  if (Arg7956.length < 3) return [Shen.type_func, shen_user_lambda7957, 3, Arg7956];
  var Arg7956_0 = Arg7956[0], Arg7956_1 = Arg7956[1], Arg7956_2 = Arg7956[2];
  return (Shen.call(Shen.fns["shen.prhush"], [("\x0d\x0a" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["shen.spaces"], [Arg7956_0]), ("<" + Shen.call(Shen.fns["shen.app"], [Arg7956_0, ("> Inputs to " + Shen.call(Shen.fns["shen.app"], [Arg7956_1, (" \x0d\x0a" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["shen.spaces"], [Arg7956_0]), "", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])), Shen.call(Shen.fns["stoutput"], [])]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.recursively-print"], [Arg7956_2]);}))}, 3, [], "shen.input-track"];





Shen.fns["shen.recursively-print"] = [Shen.type_func, function shen_user_lambda7959(Arg7958) {
  if (Arg7958.length < 1) return [Shen.type_func, shen_user_lambda7959, 1, Arg7958];
  var Arg7958_0 = Arg7958[0];
  return ((Shen.empty$question$(Arg7958_0))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.prhush"], [" ==>", Shen.call(Shen.fns["stoutput"], [])]);})
  : ((Shen.is_type(Arg7958_0, Shen.type_cons))
  ? (Shen.call(Shen.fns["print"], [Arg7958_0[1]]),
  Shen.call(Shen.fns["shen.prhush"], [", ", Shen.call(Shen.fns["stoutput"], [])]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.recursively-print"], [Arg7958_0[2]]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.recursively-print"]]);})))}, 1, [], "shen.recursively-print"];





Shen.fns["shen.spaces"] = [Shen.type_func, function shen_user_lambda7961(Arg7960) {
  if (Arg7960.length < 1) return [Shen.type_func, shen_user_lambda7961, 1, Arg7960];
  var Arg7960_0 = Arg7960[0];
  return ((Shen.unwind_tail(Shen.$eq$(0, Arg7960_0)))
  ? ""
  : (" " + Shen.call(Shen.fns["shen.spaces"], [(Arg7960_0 - 1)])))}, 1, [], "shen.spaces"];





Shen.fns["shen.output-track"] = [Shen.type_func, function shen_user_lambda7963(Arg7962) {
  if (Arg7962.length < 3) return [Shen.type_func, shen_user_lambda7963, 3, Arg7962];
  var Arg7962_0 = Arg7962[0], Arg7962_1 = Arg7962[1], Arg7962_2 = Arg7962[2];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.prhush"], [("\x0d\x0a" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["shen.spaces"], [Arg7962_0]), ("<" + Shen.call(Shen.fns["shen.app"], [Arg7962_0, ("> Output from " + Shen.call(Shen.fns["shen.app"], [Arg7962_1, (" \x0d\x0a" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["shen.spaces"], [Arg7962_0]), ("==> " + Shen.call(Shen.fns["shen.app"], [Arg7962_2, "", [Shen.type_symbol, "shen.s"]])), [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])), Shen.call(Shen.fns["stoutput"], [])]);})}, 3, [], "shen.output-track"];





Shen.fns["untrack"] = [Shen.type_func, function shen_user_lambda7965(Arg7964) {
  if (Arg7964.length < 1) return [Shen.type_func, shen_user_lambda7965, 1, Arg7964];
  var Arg7964_0 = Arg7964[0];
  return (function() {
  return Shen.call_tail(Shen.fns["eval"], [Shen.call(Shen.fns["ps"], [Arg7964_0])]);})}, 1, [], "untrack"];





Shen.fns["profile"] = [Shen.type_func, function shen_user_lambda7967(Arg7966) {
  if (Arg7966.length < 1) return [Shen.type_func, shen_user_lambda7967, 1, Arg7966];
  var Arg7966_0 = Arg7966[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.profile-help"], [Shen.call(Shen.fns["ps"], [Arg7966_0])]);})}, 1, [], "profile"];





Shen.fns["shen.profile-help"] = [Shen.type_func, function shen_user_lambda7969(Arg7968) {
  if (Arg7968.length < 1) return [Shen.type_func, shen_user_lambda7969, 1, Arg7968];
  var Arg7968_0 = Arg7968[0];
  var R0, R1;
  return (((Shen.is_type(Arg7968_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "defun"], Arg7968_0[1])) && (Shen.is_type(Arg7968_0[2], Shen.type_cons) && (Shen.is_type(Arg7968_0[2][2], Shen.type_cons) && (Shen.is_type(Arg7968_0[2][2][2], Shen.type_cons) && Shen.empty$question$(Arg7968_0[2][2][2][2])))))))
  ? ((R0 = Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "shen.f"]])),
  (R1 = [Shen.type_cons, [Shen.type_symbol, "defun"], [Shen.type_cons, Arg7968_0[2][1], [Shen.type_cons, Arg7968_0[2][2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.profile-func"], [Arg7968_0[2][1], Arg7968_0[2][2][1], [Shen.type_cons, R0, Arg7968_0[2][2][1]]]), []]]]]),
  (R0 = [Shen.type_cons, [Shen.type_symbol, "defun"], [Shen.type_cons, R0, [Shen.type_cons, Arg7968_0[2][2][1], [Shen.type_cons, Shen.call(Shen.fns["subst"], [R0, Arg7968_0[2][1], Arg7968_0[2][2][2][1]]), []]]]]),
  Shen.call(Shen.fns["shen.eval-without-macros"], [R1]),
  Shen.call(Shen.fns["shen.eval-without-macros"], [R0]),
  Arg7968_0[2][1])
  : (function() {
  return Shen.simple_error("Cannot profile.\x0d\x0a");}))}, 1, [], "shen.profile-help"];





Shen.fns["unprofile"] = [Shen.type_func, function shen_user_lambda7971(Arg7970) {
  if (Arg7970.length < 1) return [Shen.type_func, shen_user_lambda7971, 1, Arg7970];
  var Arg7970_0 = Arg7970[0];
  return (function() {
  return Shen.call_tail(Shen.fns["untrack"], [Arg7970_0]);})}, 1, [], "unprofile"];





Shen.fns["shen.profile-func"] = [Shen.type_func, function shen_user_lambda7973(Arg7972) {
  if (Arg7972.length < 3) return [Shen.type_func, shen_user_lambda7973, 3, Arg7972];
  var Arg7972_0 = Arg7972[0], Arg7972_1 = Arg7972[1], Arg7972_2 = Arg7972[2];
  return [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, [Shen.type_symbol, "Start"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "get-time"], [Shen.type_cons, [Shen.type_symbol, "run"], []]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, [Shen.type_symbol, "Result"], [Shen.type_cons, Arg7972_2, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, [Shen.type_symbol, "Finish"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "-"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "get-time"], [Shen.type_cons, [Shen.type_symbol, "run"], []]], [Shen.type_cons, [Shen.type_symbol, "Start"], []]]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, [Shen.type_symbol, "Record"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.put-profile"], [Shen.type_cons, Arg7972_0, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "+"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.get-profile"], [Shen.type_cons, Arg7972_0, []]], [Shen.type_cons, [Shen.type_symbol, "Finish"], []]]], []]]], [Shen.type_cons, [Shen.type_symbol, "Result"], []]]]], []]]]], []]]]], []]]]]}, 3, [], "shen.profile-func"];





Shen.fns["profile-results"] = [Shen.type_func, function shen_user_lambda7975(Arg7974) {
  if (Arg7974.length < 1) return [Shen.type_func, shen_user_lambda7975, 1, Arg7974];
  var Arg7974_0 = Arg7974[0];
  var R0;
  return ((R0 = Shen.call(Shen.fns["shen.get-profile"], [Arg7974_0])),
  Shen.call(Shen.fns["shen.put-profile"], [Arg7974_0, 0]),
  [Shen.fns['shen.tuple'], Arg7974_0, R0])}, 1, [], "profile-results"];





Shen.fns["shen.get-profile"] = [Shen.type_func, function shen_user_lambda7979(Arg7976) {
  if (Arg7976.length < 1) return [Shen.type_func, shen_user_lambda7979, 1, Arg7976];
  var Arg7976_0 = Arg7976[0];
  var R0, R1;
  return ((R0 = [Shen.type_func, function shen_user_lambda7981(Arg7980) {
  if (Arg7980.length < 1) return [Shen.type_func, shen_user_lambda7981, 1, Arg7980];
  var Arg7980_0 = Arg7980[0];
  return (function() {
  return Shen.call_tail(Shen.fns["get"], [Arg7980_0, [Shen.type_symbol, "profile"], (Shen.globals["*property-vector*"])]);})}, 1, [Arg7976_0], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda7983(Arg7982) {
  if (Arg7982.length < 1) return [Shen.type_func, shen_user_lambda7983, 1, Arg7982];
  var Arg7982_0 = Arg7982[0];
  return 0}, 1, [], undefined]),
  (function() {
  return Shen.trap_error(R0, R1);}))}, 1, [], "shen.get-profile"];





Shen.fns["shen.put-profile"] = [Shen.type_func, function shen_user_lambda7985(Arg7984) {
  if (Arg7984.length < 2) return [Shen.type_func, shen_user_lambda7985, 2, Arg7984];
  var Arg7984_0 = Arg7984[0], Arg7984_1 = Arg7984[1];
  return (function() {
  return Shen.call_tail(Shen.fns["put"], [Arg7984_0, [Shen.type_symbol, "profile"], Arg7984_1, (Shen.globals["*property-vector*"])]);})}, 2, [], "shen.put-profile"];










Shen.call_toplevel(function js$dot$shen_js_toplevel6778(Arg6776) {
  if (Arg6776.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6778, 0, Arg6776];
  return (Shen.globals["shen.*installing-kl*"] = false)});




Shen.call_toplevel(function js$dot$shen_js_toplevel6781(Arg6779) {
  if (Arg6779.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6781, 0, Arg6779];
  return (Shen.globals["shen.*history*"] = [])});




Shen.call_toplevel(function js$dot$shen_js_toplevel6784(Arg6782) {
  if (Arg6782.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6784, 0, Arg6782];
  return (Shen.globals["shen.*tc*"] = false)});




Shen.call_toplevel(function js$dot$shen_js_toplevel6787(Arg6785) {
  if (Arg6785.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6787, 0, Arg6785];
  return (Shen.globals["*property-vector*"] = Shen.vector(20000))});




Shen.call_toplevel(function js$dot$shen_js_toplevel6790(Arg6788) {
  if (Arg6788.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6790, 0, Arg6788];
  return (Shen.globals["shen.*process-counter*"] = 0)});




Shen.call_toplevel(function js$dot$shen_js_toplevel6793(Arg6791) {
  if (Arg6791.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6793, 0, Arg6791];
  return (Shen.globals["shen.*varcounter*"] = Shen.vector(1000))});




Shen.call_toplevel(function js$dot$shen_js_toplevel6796(Arg6794) {
  if (Arg6794.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6796, 0, Arg6794];
  return (Shen.globals["shen.*prologvectors*"] = Shen.vector(1000))});




Shen.call_toplevel(function js$dot$shen_js_toplevel6799(Arg6797) {
  if (Arg6797.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6799, 0, Arg6797];
  return (Shen.globals["shen.*reader-macros*"] = [])});




Shen.call_toplevel(function js$dot$shen_js_toplevel6802(Arg6800) {
  if (Arg6800.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6802, 0, Arg6800];
  return (Shen.globals["*home-directory*"] = [])});




Shen.call_toplevel(function js$dot$shen_js_toplevel6805(Arg6803) {
  if (Arg6803.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6805, 0, Arg6803];
  return (Shen.globals["shen.*gensym*"] = 0)});




Shen.call_toplevel(function js$dot$shen_js_toplevel6808(Arg6806) {
  if (Arg6806.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6808, 0, Arg6806];
  return (Shen.globals["shen.*tracking*"] = [])});




Shen.call_toplevel(function js$dot$shen_js_toplevel6811(Arg6809) {
  if (Arg6809.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6811, 0, Arg6809];
  return (Shen.globals["*home-directory*"] = "")});




Shen.call_toplevel(function js$dot$shen_js_toplevel6814(Arg6812) {
  if (Arg6812.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6814, 0, Arg6812];
  return (Shen.globals["shen.*alphabet*"] = [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "B"], [Shen.type_cons, [Shen.type_symbol, "C"], [Shen.type_cons, [Shen.type_symbol, "D"], [Shen.type_cons, [Shen.type_symbol, "E"], [Shen.type_cons, [Shen.type_symbol, "F"], [Shen.type_cons, [Shen.type_symbol, "G"], [Shen.type_cons, [Shen.type_symbol, "H"], [Shen.type_cons, [Shen.type_symbol, "I"], [Shen.type_cons, [Shen.type_symbol, "J"], [Shen.type_cons, [Shen.type_symbol, "K"], [Shen.type_cons, [Shen.type_symbol, "L"], [Shen.type_cons, [Shen.type_symbol, "M"], [Shen.type_cons, [Shen.type_symbol, "N"], [Shen.type_cons, [Shen.type_symbol, "O"], [Shen.type_cons, [Shen.type_symbol, "P"], [Shen.type_cons, [Shen.type_symbol, "Q"], [Shen.type_cons, [Shen.type_symbol, "R"], [Shen.type_cons, [Shen.type_symbol, "S"], [Shen.type_cons, [Shen.type_symbol, "T"], [Shen.type_cons, [Shen.type_symbol, "U"], [Shen.type_cons, [Shen.type_symbol, "V"], [Shen.type_cons, [Shen.type_symbol, "W"], [Shen.type_cons, [Shen.type_symbol, "X"], [Shen.type_cons, [Shen.type_symbol, "Y"], [Shen.type_cons, [Shen.type_symbol, "Z"], []]]]]]]]]]]]]]]]]]]]]]]]]]])});




Shen.call_toplevel(function js$dot$shen_js_toplevel6817(Arg6815) {
  if (Arg6815.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6817, 0, Arg6815];
  return (Shen.globals["shen.*special*"] = [Shen.type_cons, [Shen.type_symbol, "@p"], [Shen.type_cons, [Shen.type_symbol, "@s"], [Shen.type_cons, [Shen.type_symbol, "@v"], [Shen.type_cons, [Shen.type_symbol, "cons"], [Shen.type_cons, [Shen.type_symbol, "lambda"], [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, [Shen.type_symbol, "where"], [Shen.type_cons, [Shen.type_symbol, "set"], [Shen.type_cons, [Shen.type_symbol, "open"], []]]]]]]]]])});




Shen.call_toplevel(function js$dot$shen_js_toplevel6820(Arg6818) {
  if (Arg6818.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6820, 0, Arg6818];
  return (Shen.globals["shen.*extraspecial*"] = [Shen.type_cons, [Shen.type_symbol, "define"], [Shen.type_cons, [Shen.type_symbol, "shen.process-datatype"], [Shen.type_cons, [Shen.type_symbol, "input+"], [Shen.type_cons, [Shen.type_symbol, "defcc"], [Shen.type_cons, [Shen.type_symbol, "read+"], [Shen.type_cons, [Shen.type_symbol, "defmacro"], []]]]]]])});




Shen.call_toplevel(function js$dot$shen_js_toplevel6823(Arg6821) {
  if (Arg6821.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6823, 0, Arg6821];
  return (Shen.globals["shen.*spy*"] = false)});




Shen.call_toplevel(function js$dot$shen_js_toplevel6826(Arg6824) {
  if (Arg6824.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6826, 0, Arg6824];
  return (Shen.globals["shen.*datatypes*"] = [])});




Shen.call_toplevel(function js$dot$shen_js_toplevel6829(Arg6827) {
  if (Arg6827.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6829, 0, Arg6827];
  return (Shen.globals["shen.*alldatatypes*"] = [])});




Shen.call_toplevel(function js$dot$shen_js_toplevel6832(Arg6830) {
  if (Arg6830.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6832, 0, Arg6830];
  return (Shen.globals["shen.*shen-type-theory-enabled?*"] = true)});




Shen.call_toplevel(function js$dot$shen_js_toplevel6835(Arg6833) {
  if (Arg6833.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6835, 0, Arg6833];
  return (Shen.globals["shen.*synonyms*"] = [])});




Shen.call_toplevel(function js$dot$shen_js_toplevel6838(Arg6836) {
  if (Arg6836.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6838, 0, Arg6836];
  return (Shen.globals["shen.*system*"] = [])});




Shen.call_toplevel(function js$dot$shen_js_toplevel6841(Arg6839) {
  if (Arg6839.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6841, 0, Arg6839];
  return (Shen.globals["shen.*signedfuncs*"] = [])});




Shen.call_toplevel(function js$dot$shen_js_toplevel6844(Arg6842) {
  if (Arg6842.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6844, 0, Arg6842];
  return (Shen.globals["shen.*maxcomplexity*"] = 128)});




Shen.call_toplevel(function js$dot$shen_js_toplevel6847(Arg6845) {
  if (Arg6845.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6847, 0, Arg6845];
  return (Shen.globals["shen.*occurs*"] = true)});




Shen.call_toplevel(function js$dot$shen_js_toplevel6850(Arg6848) {
  if (Arg6848.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6850, 0, Arg6848];
  return (Shen.globals["shen.*maxinferences*"] = 1000000)});




Shen.call_toplevel(function js$dot$shen_js_toplevel6853(Arg6851) {
  if (Arg6851.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6853, 0, Arg6851];
  return (Shen.globals["*maximum-print-sequence-size*"] = 20)});




Shen.call_toplevel(function js$dot$shen_js_toplevel6856(Arg6854) {
  if (Arg6854.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6856, 0, Arg6854];
  return (Shen.globals["shen.*catch*"] = 0)});




Shen.call_toplevel(function js$dot$shen_js_toplevel6859(Arg6857) {
  if (Arg6857.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6859, 0, Arg6857];
  return (Shen.globals["shen.*call*"] = 0)});




Shen.call_toplevel(function js$dot$shen_js_toplevel6862(Arg6860) {
  if (Arg6860.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6862, 0, Arg6860];
  return (Shen.globals["shen.*infs*"] = 0)});




Shen.call_toplevel(function js$dot$shen_js_toplevel6865(Arg6863) {
  if (Arg6863.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6865, 0, Arg6863];
  return (Shen.globals["*hush*"] = false)});




Shen.call_toplevel(function js$dot$shen_js_toplevel6868(Arg6866) {
  if (Arg6866.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6868, 0, Arg6866];
  return (Shen.globals["shen.*optimise*"] = false)});




Shen.call_toplevel(function js$dot$shen_js_toplevel6871(Arg6869) {
  if (Arg6869.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6871, 0, Arg6869];
  return (Shen.globals["*version*"] = "version 16")});




Shen.fns["shen.initialise_arity_table"] = [Shen.type_func, function shen_user_lambda6873(Arg6872) {
  if (Arg6872.length < 1) return [Shen.type_func, shen_user_lambda6873, 1, Arg6872];
  var Arg6872_0 = Arg6872[0];
  return ((Shen.empty$question$(Arg6872_0))
  ? []
  : (((Shen.is_type(Arg6872_0, Shen.type_cons) && Shen.is_type(Arg6872_0[2], Shen.type_cons)))
  ? (Shen.call(Shen.fns["put"], [Arg6872_0[1], [Shen.type_symbol, "arity"], Arg6872_0[2][1], (Shen.globals["*property-vector*"])]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.initialise_arity_table"], [Arg6872_0[2][2]]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.initialise_arity_table"]]);})))}, 1, [], "shen.initialise_arity_table"];





Shen.fns["arity"] = [Shen.type_func, function shen_user_lambda6877(Arg6874) {
  if (Arg6874.length < 1) return [Shen.type_func, shen_user_lambda6877, 1, Arg6874];
  var Arg6874_0 = Arg6874[0];
  var R0, R1;
  return ((R0 = [Shen.type_func, function shen_user_lambda6879(Arg6878) {
  if (Arg6878.length < 1) return [Shen.type_func, shen_user_lambda6879, 1, Arg6878];
  var Arg6878_0 = Arg6878[0];
  return (function() {
  return Shen.call_tail(Shen.fns["get"], [Arg6878_0, [Shen.type_symbol, "arity"], (Shen.globals["*property-vector*"])]);})}, 1, [Arg6874_0], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda6881(Arg6880) {
  if (Arg6880.length < 1) return [Shen.type_func, shen_user_lambda6881, 1, Arg6880];
  var Arg6880_0 = Arg6880[0];
  return -1}, 1, [], undefined]),
  (function() {
  return Shen.trap_error(R0, R1);}))}, 1, [], "arity"];





Shen.call_toplevel(function js$dot$shen_js_toplevel6884(Arg6882) {
  if (Arg6882.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6884, 0, Arg6882];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.initialise_arity_table"], [[Shen.type_cons, [Shen.type_symbol, "absvector"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "adjoin"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "and"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "append"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "arity"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "assoc"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "boolean?"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "cd"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "compile"], [Shen.type_cons, 3, [Shen.type_cons, [Shen.type_symbol, "concat"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "cons"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "cons?"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "cn"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "declare"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "destroy"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "difference"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "do"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "element?"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "empty?"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "enable-type-theory"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "interror"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "eval"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "eval-kl"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "explode"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "external"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "fail-if"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "fail"], [Shen.type_cons, 0, [Shen.type_cons, [Shen.type_symbol, "fix"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "findall"], [Shen.type_cons, 5, [Shen.type_cons, [Shen.type_symbol, "freeze"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "fst"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "gensym"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "get"], [Shen.type_cons, 3, [Shen.type_cons, [Shen.type_symbol, "get-time"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "address->"], [Shen.type_cons, 3, [Shen.type_cons, [Shen.type_symbol, "<-address"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "<-vector"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, ">"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, ">="], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "="], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "hdv"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "hdstr"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "head"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, 3, [Shen.type_cons, [Shen.type_symbol, "integer?"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "intern"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "identical"], [Shen.type_cons, 4, [Shen.type_cons, [Shen.type_symbol, "inferences"], [Shen.type_cons, 0, [Shen.type_cons, [Shen.type_symbol, "input"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "input+"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "implementation"], [Shen.type_cons, 0, [Shen.type_cons, [Shen.type_symbol, "intersection"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "it"], [Shen.type_cons, 0, [Shen.type_cons, [Shen.type_symbol, "kill"], [Shen.type_cons, 0, [Shen.type_cons, [Shen.type_symbol, "language"], [Shen.type_cons, 0, [Shen.type_cons, [Shen.type_symbol, "length"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "lineread"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "load"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "<"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "<="], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "macroexpand"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "map"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "mapcan"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "maxinferences"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "not"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "nth"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "n->string"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "number?"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "occurs-check"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "occurrences"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "occurs-check"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "optimise"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "or"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "os"], [Shen.type_cons, 0, [Shen.type_cons, [Shen.type_symbol, "package"], [Shen.type_cons, 3, [Shen.type_cons, [Shen.type_symbol, "port"], [Shen.type_cons, 0, [Shen.type_cons, [Shen.type_symbol, "porters"], [Shen.type_cons, 0, [Shen.type_cons, [Shen.type_symbol, "pos"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "print"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "profile"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "profile-results"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "pr"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "ps"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "preclude"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "preclude-all-but"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "protect"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "address->"], [Shen.type_cons, 3, [Shen.type_cons, [Shen.type_symbol, "put"], [Shen.type_cons, 4, [Shen.type_cons, [Shen.type_symbol, "shen.reassemble"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "read-file-as-string"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "read-file"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "read"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "read-byte"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "read-from-string"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "release"], [Shen.type_cons, 0, [Shen.type_cons, [Shen.type_symbol, "remove"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "reverse"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "set"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "simple-error"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "snd"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "specialise"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "spy"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "step"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "stinput"], [Shen.type_cons, 0, [Shen.type_cons, [Shen.type_symbol, "stoutput"], [Shen.type_cons, 0, [Shen.type_cons, [Shen.type_symbol, "string->n"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "string->symbol"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "string?"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "shen.strong-warning"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "subst"], [Shen.type_cons, 3, [Shen.type_cons, [Shen.type_symbol, "sum"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "symbol?"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "tail"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "tl"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "tc"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "tc?"], [Shen.type_cons, 0, [Shen.type_cons, [Shen.type_symbol, "thaw"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "tlstr"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "track"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "trap-error"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "tuple?"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "type"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "return"], [Shen.type_cons, 3, [Shen.type_cons, [Shen.type_symbol, "undefmacro"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "unprofile"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "unify"], [Shen.type_cons, 4, [Shen.type_cons, [Shen.type_symbol, "unify!"], [Shen.type_cons, 4, [Shen.type_cons, [Shen.type_symbol, "union"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "untrack"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "unspecialise"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "undefmacro"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "vector->"], [Shen.type_cons, 3, [Shen.type_cons, [Shen.type_symbol, "value"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "variable?"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "version"], [Shen.type_cons, 0, [Shen.type_cons, [Shen.type_symbol, "warn"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "write-byte"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "write-to-file"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "y-or-n?"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "+"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "*"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "/"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "-"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "=="], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "<e>"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "@p"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "@v"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "@s"], [Shen.type_cons, 2, [Shen.type_cons, [Shen.type_symbol, "preclude"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "include"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "preclude-all-but"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "include-all-but"], [Shen.type_cons, 1, [Shen.type_cons, [Shen.type_symbol, "where"], [Shen.type_cons, 2, []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]);})});




Shen.fns["systemf"] = [Shen.type_func, function shen_user_lambda6886(Arg6885) {
  if (Arg6885.length < 1) return [Shen.type_func, shen_user_lambda6886, 1, Arg6885];
  var Arg6885_0 = Arg6885[0];
  var R0, R1;
  return ((R0 = [Shen.type_symbol, "shen"]),
  (R1 = Shen.call(Shen.fns["get"], [R0, [Shen.type_symbol, "shen.external-symbols"], (Shen.globals["*property-vector*"])])),
  (function() {
  return Shen.call_tail(Shen.fns["put"], [R0, [Shen.type_symbol, "shen.external-symbols"], Shen.call(Shen.fns["adjoin"], [Arg6885_0, R1]), (Shen.globals["*property-vector*"])]);}))}, 1, [], "systemf"];





Shen.fns["adjoin"] = [Shen.type_func, function shen_user_lambda6888(Arg6887) {
  if (Arg6887.length < 2) return [Shen.type_func, shen_user_lambda6888, 2, Arg6887];
  var Arg6887_0 = Arg6887[0], Arg6887_1 = Arg6887[1];
  return ((Shen.call(Shen.fns["element?"], [Arg6887_0, Arg6887_1]))
  ? Arg6887_1
  : [Shen.type_cons, Arg6887_0, Arg6887_1])}, 2, [], "adjoin"];





Shen.call_toplevel(function js$dot$shen_js_toplevel6891(Arg6889) {
  if (Arg6889.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6891, 0, Arg6889];
  return (function() {
  return Shen.call_tail(Shen.fns["put"], [[Shen.type_symbol, "shen"], [Shen.type_symbol, "shen.external-symbols"], [Shen.type_cons, [Shen.type_symbol, "!"], [Shen.type_cons, [Shen.type_symbol, "}"], [Shen.type_cons, [Shen.type_symbol, "{"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "<--"], [Shen.type_cons, [Shen.type_symbol, "&&"], [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, ";"], [Shen.type_cons, [Shen.type_symbol, ":-"], [Shen.type_cons, [Shen.type_symbol, ":="], [Shen.type_cons, [Shen.type_symbol, "_"], [Shen.type_cons, [Shen.type_symbol, "*language*"], [Shen.type_cons, [Shen.type_symbol, "*implementation*"], [Shen.type_cons, [Shen.type_symbol, "*stinput*"], [Shen.type_cons, [Shen.type_symbol, "*home-directory*"], [Shen.type_cons, [Shen.type_symbol, "*version*"], [Shen.type_cons, [Shen.type_symbol, "*maximum-print-sequence-size*"], [Shen.type_cons, [Shen.type_symbol, "*macros*"], [Shen.type_cons, [Shen.type_symbol, "*os*"], [Shen.type_cons, [Shen.type_symbol, "*release*"], [Shen.type_cons, [Shen.type_symbol, "*property-vector*"], [Shen.type_cons, [Shen.type_symbol, "@v"], [Shen.type_cons, [Shen.type_symbol, "@p"], [Shen.type_cons, [Shen.type_symbol, "@s"], [Shen.type_cons, [Shen.type_symbol, "*port*"], [Shen.type_cons, [Shen.type_symbol, "*porters*"], [Shen.type_cons, [Shen.type_symbol, "*hush*"], [Shen.type_cons, [Shen.type_symbol, "<-"], [Shen.type_cons, [Shen.type_symbol, "->"], [Shen.type_cons, [Shen.type_symbol, "<e>"], [Shen.type_cons, [Shen.type_symbol, "=="], [Shen.type_cons, [Shen.type_symbol, "="], [Shen.type_cons, [Shen.type_symbol, ">="], [Shen.type_cons, [Shen.type_symbol, ">"], [Shen.type_cons, [Shen.type_symbol, "/."], [Shen.type_cons, [Shen.type_symbol, "=!"], [Shen.type_cons, [Shen.type_symbol, "$"], [Shen.type_cons, [Shen.type_symbol, "-"], [Shen.type_cons, [Shen.type_symbol, "/"], [Shen.type_cons, [Shen.type_symbol, "*"], [Shen.type_cons, [Shen.type_symbol, "+"], [Shen.type_cons, [Shen.type_symbol, "<="], [Shen.type_cons, [Shen.type_symbol, "<"], [Shen.type_cons, [Shen.type_symbol, ">>"], [Shen.type_cons, Shen.vector(0), [Shen.type_cons, [Shen.type_symbol, "==>"], [Shen.type_cons, [Shen.type_symbol, "y-or-n?"], [Shen.type_cons, [Shen.type_symbol, "write-to-file"], [Shen.type_cons, [Shen.type_symbol, "write-byte"], [Shen.type_cons, [Shen.type_symbol, "where"], [Shen.type_cons, [Shen.type_symbol, "when"], [Shen.type_cons, [Shen.type_symbol, "warn"], [Shen.type_cons, [Shen.type_symbol, "version"], [Shen.type_cons, [Shen.type_symbol, "verified"], [Shen.type_cons, [Shen.type_symbol, "variable?"], [Shen.type_cons, [Shen.type_symbol, "value"], [Shen.type_cons, [Shen.type_symbol, "vector->"], [Shen.type_cons, [Shen.type_symbol, "<-vector"], [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, [Shen.type_symbol, "vector?"], [Shen.type_cons, [Shen.type_symbol, "unspecialise"], [Shen.type_cons, [Shen.type_symbol, "untrack"], [Shen.type_cons, [Shen.type_symbol, "unit"], [Shen.type_cons, [Shen.type_symbol, "shen.unix"], [Shen.type_cons, [Shen.type_symbol, "union"], [Shen.type_cons, [Shen.type_symbol, "unify"], [Shen.type_cons, [Shen.type_symbol, "unify!"], [Shen.type_cons, [Shen.type_symbol, "unprofile"], [Shen.type_cons, [Shen.type_symbol, "undefmacro"], [Shen.type_cons, [Shen.type_symbol, "return"], [Shen.type_cons, [Shen.type_symbol, "type"], [Shen.type_cons, [Shen.type_symbol, "tuple?"], [Shen.type_cons, true, [Shen.type_cons, [Shen.type_symbol, "trap-error"], [Shen.type_cons, [Shen.type_symbol, "track"], [Shen.type_cons, [Shen.type_symbol, "time"], [Shen.type_cons, [Shen.type_symbol, "thaw"], [Shen.type_cons, [Shen.type_symbol, "tc?"], [Shen.type_cons, [Shen.type_symbol, "tc"], [Shen.type_cons, [Shen.type_symbol, "tl"], [Shen.type_cons, [Shen.type_symbol, "tlstr"], [Shen.type_cons, [Shen.type_symbol, "tlv"], [Shen.type_cons, [Shen.type_symbol, "tail"], [Shen.type_cons, [Shen.type_symbol, "systemf"], [Shen.type_cons, [Shen.type_symbol, "synonyms"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "symbol?"], [Shen.type_cons, [Shen.type_symbol, "string->symbol"], [Shen.type_cons, [Shen.type_symbol, "subst"], [Shen.type_cons, [Shen.type_symbol, "string?"], [Shen.type_cons, [Shen.type_symbol, "string->n"], [Shen.type_cons, [Shen.type_symbol, "stream"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "stinput"], [Shen.type_cons, [Shen.type_symbol, "stoutput"], [Shen.type_cons, [Shen.type_symbol, "step"], [Shen.type_cons, [Shen.type_symbol, "spy"], [Shen.type_cons, [Shen.type_symbol, "specialise"], [Shen.type_cons, [Shen.type_symbol, "snd"], [Shen.type_cons, [Shen.type_symbol, "simple-error"], [Shen.type_cons, [Shen.type_symbol, "set"], [Shen.type_cons, [Shen.type_symbol, "save"], [Shen.type_cons, [Shen.type_symbol, "str"], [Shen.type_cons, [Shen.type_symbol, "run"], [Shen.type_cons, [Shen.type_symbol, "reverse"], [Shen.type_cons, [Shen.type_symbol, "remove"], [Shen.type_cons, [Shen.type_symbol, "release"], [Shen.type_cons, [Shen.type_symbol, "read"], [Shen.type_cons, [Shen.type_symbol, "read-file"], [Shen.type_cons, [Shen.type_symbol, "read-file-as-bytelist"], [Shen.type_cons, [Shen.type_symbol, "read-file-as-string"], [Shen.type_cons, [Shen.type_symbol, "read-byte"], [Shen.type_cons, [Shen.type_symbol, "read-from-string"], [Shen.type_cons, [Shen.type_symbol, "quit"], [Shen.type_cons, [Shen.type_symbol, "put"], [Shen.type_cons, [Shen.type_symbol, "preclude"], [Shen.type_cons, [Shen.type_symbol, "preclude-all-but"], [Shen.type_cons, [Shen.type_symbol, "ps"], [Shen.type_cons, [Shen.type_symbol, "prolog?"], [Shen.type_cons, [Shen.type_symbol, "protect"], [Shen.type_cons, [Shen.type_symbol, "profile-results"], [Shen.type_cons, [Shen.type_symbol, "profile"], [Shen.type_cons, [Shen.type_symbol, "print"], [Shen.type_cons, [Shen.type_symbol, "pr"], [Shen.type_cons, [Shen.type_symbol, "pos"], [Shen.type_cons, [Shen.type_symbol, "porters"], [Shen.type_cons, [Shen.type_symbol, "port"], [Shen.type_cons, [Shen.type_symbol, "package"], [Shen.type_cons, [Shen.type_symbol, "output"], [Shen.type_cons, [Shen.type_symbol, "out"], [Shen.type_cons, [Shen.type_symbol, "os"], [Shen.type_cons, [Shen.type_symbol, "or"], [Shen.type_cons, [Shen.type_symbol, "optimise"], [Shen.type_cons, [Shen.type_symbol, "open"], [Shen.type_cons, [Shen.type_symbol, "occurrences"], [Shen.type_cons, [Shen.type_symbol, "occurs-check"], [Shen.type_cons, [Shen.type_symbol, "n->string"], [Shen.type_cons, [Shen.type_symbol, "number?"], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "null"], [Shen.type_cons, [Shen.type_symbol, "nth"], [Shen.type_cons, [Shen.type_symbol, "not"], [Shen.type_cons, [Shen.type_symbol, "nl"], [Shen.type_cons, [Shen.type_symbol, "mode"], [Shen.type_cons, [Shen.type_symbol, "macro"], [Shen.type_cons, [Shen.type_symbol, "macroexpand"], [Shen.type_cons, [Shen.type_symbol, "maxinferences"], [Shen.type_cons, [Shen.type_symbol, "mapcan"], [Shen.type_cons, [Shen.type_symbol, "map"], [Shen.type_cons, [Shen.type_symbol, "make-string"], [Shen.type_cons, [Shen.type_symbol, "load"], [Shen.type_cons, [Shen.type_symbol, "loaded"], [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "lineread"], [Shen.type_cons, [Shen.type_symbol, "limit"], [Shen.type_cons, [Shen.type_symbol, "length"], [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, [Shen.type_symbol, "lazy"], [Shen.type_cons, [Shen.type_symbol, "lambda"], [Shen.type_cons, [Shen.type_symbol, "language"], [Shen.type_cons, [Shen.type_symbol, "kill"], [Shen.type_cons, [Shen.type_symbol, "is"], [Shen.type_cons, [Shen.type_symbol, "intersection"], [Shen.type_cons, [Shen.type_symbol, "inferences"], [Shen.type_cons, [Shen.type_symbol, "intern"], [Shen.type_cons, [Shen.type_symbol, "integer?"], [Shen.type_cons, [Shen.type_symbol, "input"], [Shen.type_cons, [Shen.type_symbol, "input+"], [Shen.type_cons, [Shen.type_symbol, "include"], [Shen.type_cons, [Shen.type_symbol, "include-all-but"], [Shen.type_cons, [Shen.type_symbol, "it"], [Shen.type_cons, [Shen.type_symbol, "in"], [Shen.type_cons, [Shen.type_symbol, "implementation"], [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, [Shen.type_symbol, "identical"], [Shen.type_cons, [Shen.type_symbol, "head"], [Shen.type_cons, [Shen.type_symbol, "hd"], [Shen.type_cons, [Shen.type_symbol, "hdv"], [Shen.type_cons, [Shen.type_symbol, "hdstr"], [Shen.type_cons, [Shen.type_symbol, "hash"], [Shen.type_cons, [Shen.type_symbol, "get"], [Shen.type_cons, [Shen.type_symbol, "get-time"], [Shen.type_cons, [Shen.type_symbol, "gensym"], [Shen.type_cons, [Shen.type_symbol, "function"], [Shen.type_cons, [Shen.type_symbol, "fst"], [Shen.type_cons, [Shen.type_symbol, "freeze"], [Shen.type_cons, [Shen.type_symbol, "fix"], [Shen.type_cons, [Shen.type_symbol, "file"], [Shen.type_cons, [Shen.type_symbol, "fail"], [Shen.type_cons, [Shen.type_symbol, "fail-if"], [Shen.type_cons, [Shen.type_symbol, "fwhen"], [Shen.type_cons, [Shen.type_symbol, "findall"], [Shen.type_cons, false, [Shen.type_cons, [Shen.type_symbol, "enable-type-theory"], [Shen.type_cons, [Shen.type_symbol, "explode"], [Shen.type_cons, [Shen.type_symbol, "external"], [Shen.type_cons, [Shen.type_symbol, "exception"], [Shen.type_cons, [Shen.type_symbol, "eval-kl"], [Shen.type_cons, [Shen.type_symbol, "eval"], [Shen.type_cons, [Shen.type_symbol, "error-to-string"], [Shen.type_cons, [Shen.type_symbol, "error"], [Shen.type_cons, [Shen.type_symbol, "empty?"], [Shen.type_cons, [Shen.type_symbol, "element?"], [Shen.type_cons, [Shen.type_symbol, "do"], [Shen.type_cons, [Shen.type_symbol, "difference"], [Shen.type_cons, [Shen.type_symbol, "destroy"], [Shen.type_cons, [Shen.type_symbol, "defun"], [Shen.type_cons, [Shen.type_symbol, "define"], [Shen.type_cons, [Shen.type_symbol, "defmacro"], [Shen.type_cons, [Shen.type_symbol, "defcc"], [Shen.type_cons, [Shen.type_symbol, "defprolog"], [Shen.type_cons, [Shen.type_symbol, "declare"], [Shen.type_cons, [Shen.type_symbol, "datatype"], [Shen.type_cons, [Shen.type_symbol, "cut"], [Shen.type_cons, [Shen.type_symbol, "cn"], [Shen.type_cons, [Shen.type_symbol, "cons?"], [Shen.type_cons, [Shen.type_symbol, "cons"], [Shen.type_cons, [Shen.type_symbol, "cond"], [Shen.type_cons, [Shen.type_symbol, "concat"], [Shen.type_cons, [Shen.type_symbol, "compile"], [Shen.type_cons, [Shen.type_symbol, "cd"], [Shen.type_cons, [Shen.type_symbol, "cases"], [Shen.type_cons, [Shen.type_symbol, "call"], [Shen.type_cons, [Shen.type_symbol, "close"], [Shen.type_cons, [Shen.type_symbol, "bind"], [Shen.type_cons, [Shen.type_symbol, "bound?"], [Shen.type_cons, [Shen.type_symbol, "boolean?"], [Shen.type_cons, [Shen.type_symbol, "boolean"], [Shen.type_cons, [Shen.type_symbol, "bar!"], [Shen.type_cons, [Shen.type_symbol, "assoc"], [Shen.type_cons, [Shen.type_symbol, "arity"], [Shen.type_cons, [Shen.type_symbol, "append"], [Shen.type_cons, [Shen.type_symbol, "and"], [Shen.type_cons, [Shen.type_symbol, "adjoin"], [Shen.type_cons, [Shen.type_symbol, "<-address"], [Shen.type_cons, [Shen.type_symbol, "address->"], [Shen.type_cons, [Shen.type_symbol, "absvector?"], [Shen.type_cons, [Shen.type_symbol, "absvector"], [Shen.type_cons, [Shen.type_symbol, "abort"], []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]], (Shen.globals["*property-vector*"])]);})});




Shen.fns["specialise"] = [Shen.type_func, function shen_user_lambda6893(Arg6892) {
  if (Arg6892.length < 1) return [Shen.type_func, shen_user_lambda6893, 1, Arg6892];
  var Arg6892_0 = Arg6892[0];
  return ((Shen.globals["shen.*special*"] = [Shen.type_cons, Arg6892_0, (Shen.globals["shen.*special*"])]),
  Arg6892_0)}, 1, [], "specialise"];





Shen.fns["unspecialise"] = [Shen.type_func, function shen_user_lambda6895(Arg6894) {
  if (Arg6894.length < 1) return [Shen.type_func, shen_user_lambda6895, 1, Arg6894];
  var Arg6894_0 = Arg6894[0];
  return ((Shen.globals["shen.*special*"] = Shen.call(Shen.fns["remove"], [Arg6894_0, (Shen.globals["shen.*special*"])])),
  Arg6894_0)}, 1, [], "unspecialise"];










Shen.fns["load"] = [Shen.type_func, function shen_user_lambda6898(Arg6897) {
  if (Arg6897.length < 1) return [Shen.type_func, shen_user_lambda6898, 1, Arg6897];
  var Arg6897_0 = Arg6897[0];
  var R0, R1, R2;
  return (((R0 = Shen.get_time([Shen.type_symbol, "run"])),
  (R1 = Shen.call(Shen.fns["shen.load-help"], [(Shen.globals["shen.*tc*"]), Shen.call(Shen.fns["read-file"], [Arg6897_0])])),
  (R2 = Shen.get_time([Shen.type_symbol, "run"])),
  (R2 = (R2 - R0)),
  Shen.call(Shen.fns["shen.prhush"], [("\x0d\x0arun time: " + (Shen.str(R2) + " secs\x0d\x0a")), Shen.call(Shen.fns["stoutput"], [])]),
  R1),
  (((Shen.globals["shen.*tc*"]))
  ? Shen.call(Shen.fns["shen.prhush"], [("\x0d\x0atypechecked in " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["inferences"], []), " inferences\x0d\x0a", [Shen.type_symbol, "shen.a"]])), Shen.call(Shen.fns["stoutput"], [])])
  : [Shen.type_symbol, "shen.skip"]),
  [Shen.type_symbol, "loaded"])}, 1, [], "load"];





Shen.fns["shen.load-help"] = [Shen.type_func, function shen_user_lambda6902(Arg6899) {
  if (Arg6899.length < 2) return [Shen.type_func, shen_user_lambda6902, 2, Arg6899];
  var Arg6899_0 = Arg6899[0], Arg6899_1 = Arg6899[1];
  var R0, R1;
  return ((Shen.unwind_tail(Shen.$eq$(false, Arg6899_0)))
  ? (function() {
  return Shen.call_tail(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda6904(Arg6903) {
  if (Arg6903.length < 1) return [Shen.type_func, shen_user_lambda6904, 1, Arg6903];
  var Arg6903_0 = Arg6903[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.prhush"], [Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["shen.eval-without-macros"], [Arg6903_0]), "\x0d\x0a", [Shen.type_symbol, "shen.s"]]), Shen.call(Shen.fns["stoutput"], [])]);})}, 1, [], undefined], Arg6899_1]);})
  : ((R0 = Shen.call(Shen.fns["mapcan"], [[Shen.type_func, function shen_user_lambda6906(Arg6905) {
  if (Arg6905.length < 1) return [Shen.type_func, shen_user_lambda6906, 1, Arg6905];
  var Arg6905_0 = Arg6905[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.remove-synonyms"], [Arg6905_0]);})}, 1, [], undefined], Arg6899_1])),
  (R1 = Shen.call(Shen.fns["mapcan"], [[Shen.type_func, function shen_user_lambda6908(Arg6907) {
  if (Arg6907.length < 1) return [Shen.type_func, shen_user_lambda6908, 1, Arg6907];
  var Arg6907_0 = Arg6907[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.typetable"], [Arg6907_0]);})}, 1, [], undefined], R0])),
  Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda6910(Arg6909) {
  if (Arg6909.length < 1) return [Shen.type_func, shen_user_lambda6910, 1, Arg6909];
  var Arg6909_0 = Arg6909[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.assumetype"], [Arg6909_0]);})}, 1, [], undefined], R1]),
  (R0 = [Shen.type_func, function shen_user_lambda6912(Arg6911) {
  if (Arg6911.length < 2) return [Shen.type_func, shen_user_lambda6912, 2, Arg6911];
  var Arg6911_0 = Arg6911[0], Arg6911_1 = Arg6911[1];
  return (function() {
  return Shen.call_tail(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda6914(Arg6913) {
  if (Arg6913.length < 1) return [Shen.type_func, shen_user_lambda6914, 1, Arg6913];
  var Arg6913_0 = Arg6913[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.typecheck-and-load"], [Arg6913_0]);})}, 1, [], undefined], Arg6911_0]);})}, 2, [R0, R1], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda6916(Arg6915) {
  if (Arg6915.length < 2) return [Shen.type_func, shen_user_lambda6916, 2, Arg6915];
  var Arg6915_0 = Arg6915[0], Arg6915_1 = Arg6915[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.unwind-types"], [Arg6915_1, Arg6915_0]);})}, 2, [R1], undefined]),
  (function() {
  return Shen.trap_error(R0, R1);})))}, 2, [], "shen.load-help"];





Shen.fns["shen.remove-synonyms"] = [Shen.type_func, function shen_user_lambda6918(Arg6917) {
  if (Arg6917.length < 1) return [Shen.type_func, shen_user_lambda6918, 1, Arg6917];
  var Arg6917_0 = Arg6917[0];
  return (((Shen.is_type(Arg6917_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.synonyms-help"], Arg6917_0[1]))))
  ? (Shen.call(Shen.fns["eval"], [Arg6917_0]),
  [])
  : [Shen.type_cons, Arg6917_0, []])}, 1, [], "shen.remove-synonyms"];





Shen.fns["shen.typecheck-and-load"] = [Shen.type_func, function shen_user_lambda6920(Arg6919) {
  if (Arg6919.length < 1) return [Shen.type_func, shen_user_lambda6920, 1, Arg6919];
  var Arg6919_0 = Arg6919[0];
  return (Shen.call(Shen.fns["nl"], [1]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.typecheck-and-evaluate"], [Arg6919_0, Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "A"]])]);}))}, 1, [], "shen.typecheck-and-load"];





Shen.fns["shen.typetable"] = [Shen.type_func, function shen_user_lambda6922(Arg6921) {
  if (Arg6921.length < 1) return [Shen.type_func, shen_user_lambda6922, 1, Arg6921];
  var Arg6921_0 = Arg6921[0];
  var R0;
  return (((Shen.is_type(Arg6921_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "define"], Arg6921_0[1])) && Shen.is_type(Arg6921_0[2], Shen.type_cons))))
  ? ((R0 = Shen.call(Shen.fns["compile"], [[Shen.type_func, function shen_user_lambda6924(Arg6923) {
  if (Arg6923.length < 1) return [Shen.type_func, shen_user_lambda6924, 1, Arg6923];
  var Arg6923_0 = Arg6923[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.<sig+rest>"], [Arg6923_0]);})}, 1, [], undefined], Arg6921_0[2][2], []])),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? (function() {
  return Shen.simple_error(Shen.call(Shen.fns["shen.app"], [Arg6921_0[2][1], " lacks a proper signature.\x0d\x0a", [Shen.type_symbol, "shen.a"]]));})
  : [Shen.type_cons, [Shen.type_cons, Arg6921_0[2][1], R0], []]))
  : (((Shen.is_type(Arg6921_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "defcc"], Arg6921_0[1])) && (Shen.is_type(Arg6921_0[2], Shen.type_cons) && (Shen.is_type(Arg6921_0[2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "{"], Arg6921_0[2][2][1])) && (Shen.is_type(Arg6921_0[2][2][2], Shen.type_cons) && (Shen.is_type(Arg6921_0[2][2][2][1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "list"], Arg6921_0[2][2][2][1][1])) && (Shen.is_type(Arg6921_0[2][2][2][1][2], Shen.type_cons) && (Shen.empty$question$(Arg6921_0[2][2][2][1][2][2]) && (Shen.is_type(Arg6921_0[2][2][2][2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "==>"], Arg6921_0[2][2][2][2][1])) && (Shen.is_type(Arg6921_0[2][2][2][2][2], Shen.type_cons) && (Shen.is_type(Arg6921_0[2][2][2][2][2][2], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "}"], Arg6921_0[2][2][2][2][2][2][1])))))))))))))))))
  ? [Shen.type_cons, [Shen.type_cons, Arg6921_0[2][1], [Shen.type_cons, Arg6921_0[2][2][2][1], [Shen.type_cons, [Shen.type_symbol, "==>"], [Shen.type_cons, Arg6921_0[2][2][2][2][2][1], []]]]], []]
  : (((Shen.is_type(Arg6921_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "defcc"], Arg6921_0[1])) && Shen.is_type(Arg6921_0[2], Shen.type_cons))))
  ? (function() {
  return Shen.simple_error(Shen.call(Shen.fns["shen.app"], [Arg6921_0[2][1], " lacks a proper signature.\x0d\x0a", [Shen.type_symbol, "shen.a"]]));})
  : [])))}, 1, [], "shen.typetable"];





Shen.fns["shen.assumetype"] = [Shen.type_func, function shen_user_lambda6926(Arg6925) {
  if (Arg6925.length < 1) return [Shen.type_func, shen_user_lambda6926, 1, Arg6925];
  var Arg6925_0 = Arg6925[0];
  return ((Shen.is_type(Arg6925_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["declare"], [Arg6925_0[1], Arg6925_0[2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.assumetype"]]);}))}, 1, [], "shen.assumetype"];





Shen.fns["shen.unwind-types"] = [Shen.type_func, function shen_user_lambda6928(Arg6927) {
  if (Arg6927.length < 2) return [Shen.type_func, shen_user_lambda6928, 2, Arg6927];
  var Arg6927_0 = Arg6927[0], Arg6927_1 = Arg6927[1];
  return ((Shen.empty$question$(Arg6927_1))
  ? (function() {
  return Shen.simple_error(Shen.error_to_string(Arg6927_0));})
  : (((Shen.is_type(Arg6927_1, Shen.type_cons) && Shen.is_type(Arg6927_1[1], Shen.type_cons)))
  ? (Shen.call(Shen.fns["shen.remtype"], [Arg6927_1[1][1]]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.unwind-types"], [Arg6927_0, Arg6927_1[2]]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.unwind-types"]]);})))}, 2, [], "shen.unwind-types"];





Shen.fns["shen.remtype"] = [Shen.type_func, function shen_user_lambda6930(Arg6929) {
  if (Arg6929.length < 1) return [Shen.type_func, shen_user_lambda6930, 1, Arg6929];
  var Arg6929_0 = Arg6929[0];
  return (Shen.globals["shen.*signedfuncs*"] = Shen.call(Shen.fns["shen.removetype"], [Arg6929_0, (Shen.globals["shen.*signedfuncs*"])]))}, 1, [], "shen.remtype"];





Shen.fns["shen.removetype"] = [Shen.type_func, function shen_user_lambda6932(Arg6931) {
  if (Arg6931.length < 2) return [Shen.type_func, shen_user_lambda6932, 2, Arg6931];
  var Arg6931_0 = Arg6931[0], Arg6931_1 = Arg6931[1];
  return ((Shen.empty$question$(Arg6931_1))
  ? []
  : (((Shen.is_type(Arg6931_1, Shen.type_cons) && (Shen.is_type(Arg6931_1[1], Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(Arg6931_1[1][1], Arg6931_0)))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.removetype"], [Arg6931_1[1][1], Arg6931_1[2]]);})
  : ((Shen.is_type(Arg6931_1, Shen.type_cons))
  ? [Shen.type_cons, Arg6931_1[1], Shen.call(Shen.fns["shen.removetype"], [Arg6931_0, Arg6931_1[2]])]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.removetype"]]);}))))}, 2, [], "shen.removetype"];





Shen.fns["shen.<sig+rest>"] = [Shen.type_func, function shen_user_lambda6934(Arg6933) {
  if (Arg6933.length < 1) return [Shen.type_func, shen_user_lambda6934, 1, Arg6933];
  var Arg6933_0 = Arg6933[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<signature>"], [Arg6933_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["<!>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], Shen.call(Shen.fns["shen.hdtl"], [R0])]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<sig+rest>"];





Shen.fns["write-to-file"] = [Shen.type_func, function shen_user_lambda6936(Arg6935) {
  if (Arg6935.length < 2) return [Shen.type_func, shen_user_lambda6936, 2, Arg6935];
  var Arg6935_0 = Arg6935[0], Arg6935_1 = Arg6935[1];
  var R0, R1;
  return ((R0 = Shen.open(Arg6935_0, [Shen.type_symbol, "out"])),
  (((typeof(Arg6935_1) == 'string'))
  ? (R1 = Shen.call(Shen.fns["shen.app"], [Arg6935_1, "\x0d\x0a\x0d\x0a", [Shen.type_symbol, "shen.a"]]))
  : (R1 = Shen.call(Shen.fns["shen.app"], [Arg6935_1, "\x0d\x0a\x0d\x0a", [Shen.type_symbol, "shen.s"]]))),
  Shen.call(Shen.fns["pr"], [R1, R0]),
  Shen.close(R0),
  Arg6935_1)}, 2, [], "write-to-file"];










Shen.fns["macroexpand"] = [Shen.type_func, function shen_user_lambda6939(Arg6938) {
  if (Arg6938.length < 1) return [Shen.type_func, shen_user_lambda6939, 1, Arg6938];
  var Arg6938_0 = Arg6938[0];
  var R0;
  return ((R0 = Shen.call(Shen.fns["shen.compose"], [(Shen.globals["*macros*"]), Arg6938_0])),
  ((Shen.unwind_tail(Shen.$eq$(Arg6938_0, R0)))
  ? Arg6938_0
  : (function() {
  return Shen.call_tail(Shen.fns["shen.walk"], [[Shen.type_func, function shen_user_lambda6941(Arg6940) {
  if (Arg6940.length < 1) return [Shen.type_func, shen_user_lambda6941, 1, Arg6940];
  var Arg6940_0 = Arg6940[0];
  return (function() {
  return Shen.call_tail(Shen.fns["macroexpand"], [Arg6940_0]);})}, 1, [], undefined], R0]);})))}, 1, [], "macroexpand"];





Shen.call_toplevel(function js$dot$shen_js_toplevel6944(Arg6942) {
  if (Arg6942.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel6944, 0, Arg6942];
  return (Shen.globals["*macros*"] = [Shen.type_cons, [Shen.type_symbol, "shen.timer-macro"], [Shen.type_cons, [Shen.type_symbol, "shen.cases-macro"], [Shen.type_cons, [Shen.type_symbol, "shen.abs-macro"], [Shen.type_cons, [Shen.type_symbol, "shen.put/get-macro"], [Shen.type_cons, [Shen.type_symbol, "shen.compile-macro"], [Shen.type_cons, [Shen.type_symbol, "shen.datatype-macro"], [Shen.type_cons, [Shen.type_symbol, "shen.let-macro"], [Shen.type_cons, [Shen.type_symbol, "shen.assoc-macro"], [Shen.type_cons, [Shen.type_symbol, "shen.make-string-macro"], [Shen.type_cons, [Shen.type_symbol, "shen.output-macro"], [Shen.type_cons, [Shen.type_symbol, "shen.input-macro"], [Shen.type_cons, [Shen.type_symbol, "shen.error-macro"], [Shen.type_cons, [Shen.type_symbol, "shen.prolog-macro"], [Shen.type_cons, [Shen.type_symbol, "shen.synonyms-macro"], [Shen.type_cons, [Shen.type_symbol, "shen.nl-macro"], [Shen.type_cons, [Shen.type_symbol, "shen.@s-macro"], [Shen.type_cons, [Shen.type_symbol, "shen.defprolog-macro"], [Shen.type_cons, [Shen.type_symbol, "shen.function-macro"], []]]]]]]]]]]]]]]]]]])});




Shen.fns["shen.error-macro"] = [Shen.type_func, function shen_user_lambda6946(Arg6945) {
  if (Arg6945.length < 1) return [Shen.type_func, shen_user_lambda6946, 1, Arg6945];
  var Arg6945_0 = Arg6945[0];
  return (((Shen.is_type(Arg6945_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "error"], Arg6945_0[1])) && Shen.is_type(Arg6945_0[2], Shen.type_cons))))
  ? [Shen.type_cons, [Shen.type_symbol, "simple-error"], [Shen.type_cons, Shen.call(Shen.fns["shen.mkstr"], [Arg6945_0[2][1], Arg6945_0[2][2]]), []]]
  : Arg6945_0)}, 1, [], "shen.error-macro"];





Shen.fns["shen.output-macro"] = [Shen.type_func, function shen_user_lambda6948(Arg6947) {
  if (Arg6947.length < 1) return [Shen.type_func, shen_user_lambda6948, 1, Arg6947];
  var Arg6947_0 = Arg6947[0];
  return (((Shen.is_type(Arg6947_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "output"], Arg6947_0[1])) && Shen.is_type(Arg6947_0[2], Shen.type_cons))))
  ? [Shen.type_cons, [Shen.type_symbol, "shen.prhush"], [Shen.type_cons, Shen.call(Shen.fns["shen.mkstr"], [Arg6947_0[2][1], Arg6947_0[2][2]]), [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "stoutput"], []], []]]]
  : (((Shen.is_type(Arg6947_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "pr"], Arg6947_0[1])) && (Shen.is_type(Arg6947_0[2], Shen.type_cons) && Shen.empty$question$(Arg6947_0[2][2])))))
  ? [Shen.type_cons, [Shen.type_symbol, "pr"], [Shen.type_cons, Arg6947_0[2][1], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "stoutput"], []], []]]]
  : Arg6947_0))}, 1, [], "shen.output-macro"];





Shen.fns["shen.make-string-macro"] = [Shen.type_func, function shen_user_lambda6950(Arg6949) {
  if (Arg6949.length < 1) return [Shen.type_func, shen_user_lambda6950, 1, Arg6949];
  var Arg6949_0 = Arg6949[0];
  return (((Shen.is_type(Arg6949_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "make-string"], Arg6949_0[1])) && Shen.is_type(Arg6949_0[2], Shen.type_cons))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.mkstr"], [Arg6949_0[2][1], Arg6949_0[2][2]]);})
  : Arg6949_0)}, 1, [], "shen.make-string-macro"];





Shen.fns["shen.input-macro"] = [Shen.type_func, function shen_user_lambda6952(Arg6951) {
  if (Arg6951.length < 1) return [Shen.type_func, shen_user_lambda6952, 1, Arg6951];
  var Arg6951_0 = Arg6951[0];
  return (((Shen.is_type(Arg6951_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "lineread"], Arg6951_0[1])) && Shen.empty$question$(Arg6951_0[2]))))
  ? [Shen.type_cons, [Shen.type_symbol, "lineread"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "stinput"], []], []]]
  : (((Shen.is_type(Arg6951_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "input"], Arg6951_0[1])) && Shen.empty$question$(Arg6951_0[2]))))
  ? [Shen.type_cons, [Shen.type_symbol, "input"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "stinput"], []], []]]
  : (((Shen.is_type(Arg6951_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "read"], Arg6951_0[1])) && Shen.empty$question$(Arg6951_0[2]))))
  ? [Shen.type_cons, [Shen.type_symbol, "read"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "stinput"], []], []]]
  : (((Shen.is_type(Arg6951_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "input+"], Arg6951_0[1])) && (Shen.is_type(Arg6951_0[2], Shen.type_cons) && Shen.empty$question$(Arg6951_0[2][2])))))
  ? [Shen.type_cons, [Shen.type_symbol, "input+"], [Shen.type_cons, Arg6951_0[2][1], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "stinput"], []], []]]]
  : (((Shen.is_type(Arg6951_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "read-byte"], Arg6951_0[1])) && Shen.empty$question$(Arg6951_0[2]))))
  ? [Shen.type_cons, [Shen.type_symbol, "read-byte"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "stinput"], []], []]]
  : Arg6951_0)))))}, 1, [], "shen.input-macro"];





Shen.fns["shen.compose"] = [Shen.type_func, function shen_user_lambda6954(Arg6953) {
  if (Arg6953.length < 2) return [Shen.type_func, shen_user_lambda6954, 2, Arg6953];
  var Arg6953_0 = Arg6953[0], Arg6953_1 = Arg6953[1];
  return ((Shen.empty$question$(Arg6953_0))
  ? Arg6953_1
  : ((Shen.is_type(Arg6953_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.compose"], [Arg6953_0[2], Shen.call(Arg6953_0[1], [Arg6953_1])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.compose"]]);})))}, 2, [], "shen.compose"];





Shen.fns["shen.compile-macro"] = [Shen.type_func, function shen_user_lambda6956(Arg6955) {
  if (Arg6955.length < 1) return [Shen.type_func, shen_user_lambda6956, 1, Arg6955];
  var Arg6955_0 = Arg6955[0];
  return (((Shen.is_type(Arg6955_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "compile"], Arg6955_0[1])) && (Shen.is_type(Arg6955_0[2], Shen.type_cons) && (Shen.is_type(Arg6955_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg6955_0[2][2][2]))))))
  ? [Shen.type_cons, [Shen.type_symbol, "compile"], [Shen.type_cons, Arg6955_0[2][1], [Shen.type_cons, Arg6955_0[2][2][1], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "lambda"], [Shen.type_cons, [Shen.type_symbol, "E"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "cons?"], [Shen.type_cons, [Shen.type_symbol, "E"], []]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "error"], [Shen.type_cons, "parse error here: ~S~%", [Shen.type_cons, [Shen.type_symbol, "E"], []]]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "error"], [Shen.type_cons, "parse error~%", []]], []]]]], []]]], []]]]]
  : Arg6955_0)}, 1, [], "shen.compile-macro"];





Shen.fns["shen.prolog-macro"] = [Shen.type_func, function shen_user_lambda6958(Arg6957) {
  if (Arg6957.length < 1) return [Shen.type_func, shen_user_lambda6958, 1, Arg6957];
  var Arg6957_0 = Arg6957[0];
  var R0, R1;
  return (((Shen.is_type(Arg6957_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "prolog?"], Arg6957_0[1]))))
  ? ((R0 = Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "shen.f"]])),
  (R1 = Shen.call(Shen.fns["shen.receive-terms"], [Arg6957_0[2]])),
  Shen.call(Shen.fns["eval"], [Shen.call(Shen.fns["append"], [[Shen.type_cons, [Shen.type_symbol, "defprolog"], [Shen.type_cons, R0, []]], Shen.call(Shen.fns["append"], [R1, Shen.call(Shen.fns["append"], [[Shen.type_cons, [Shen.type_symbol, "<--"], []], Shen.call(Shen.fns["append"], [Shen.call(Shen.fns["shen.pass-literals"], [Arg6957_0[2]]), [Shen.type_cons, [Shen.type_symbol, ";"], []]])])])])]),
  (R1 = [Shen.type_cons, R0, Shen.call(Shen.fns["append"], [R1, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.start-new-prolog-process"], []], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "freeze"], [Shen.type_cons, true, []]], []]]])]),
  R1)
  : Arg6957_0)}, 1, [], "shen.prolog-macro"];





Shen.fns["shen.receive-terms"] = [Shen.type_func, function shen_user_lambda6960(Arg6959) {
  if (Arg6959.length < 1) return [Shen.type_func, shen_user_lambda6960, 1, Arg6959];
  var Arg6959_0 = Arg6959[0];
  return ((Shen.empty$question$(Arg6959_0))
  ? []
  : (((Shen.is_type(Arg6959_0, Shen.type_cons) && (Shen.is_type(Arg6959_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "receive"], Arg6959_0[1][1])) && (Shen.is_type(Arg6959_0[1][2], Shen.type_cons) && Shen.empty$question$(Arg6959_0[1][2][2]))))))
  ? [Shen.type_cons, Arg6959_0[1][2][1], Shen.call(Shen.fns["shen.receive-terms"], [Arg6959_0[2]])]
  : ((Shen.is_type(Arg6959_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.receive-terms"], [Arg6959_0[2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.receive-terms"]]);}))))}, 1, [], "shen.receive-terms"];





Shen.fns["shen.pass-literals"] = [Shen.type_func, function shen_user_lambda6962(Arg6961) {
  if (Arg6961.length < 1) return [Shen.type_func, shen_user_lambda6962, 1, Arg6961];
  var Arg6961_0 = Arg6961[0];
  return ((Shen.empty$question$(Arg6961_0))
  ? []
  : (((Shen.is_type(Arg6961_0, Shen.type_cons) && (Shen.is_type(Arg6961_0[1], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "receive"], Arg6961_0[1][1])) && (Shen.is_type(Arg6961_0[1][2], Shen.type_cons) && Shen.empty$question$(Arg6961_0[1][2][2]))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.pass-literals"], [Arg6961_0[2]]);})
  : ((Shen.is_type(Arg6961_0, Shen.type_cons))
  ? [Shen.type_cons, Arg6961_0[1], Shen.call(Shen.fns["shen.pass-literals"], [Arg6961_0[2]])]
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.pass-literals"]]);}))))}, 1, [], "shen.pass-literals"];





Shen.fns["shen.defprolog-macro"] = [Shen.type_func, function shen_user_lambda6964(Arg6963) {
  if (Arg6963.length < 1) return [Shen.type_func, shen_user_lambda6964, 1, Arg6963];
  var Arg6963_0 = Arg6963[0];
  return (((Shen.is_type(Arg6963_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "defprolog"], Arg6963_0[1])) && Shen.is_type(Arg6963_0[2], Shen.type_cons))))
  ? (function() {
  return Shen.call_tail(Shen.fns["compile"], [[Shen.type_func, function shen_user_lambda6966(Arg6965) {
  if (Arg6965.length < 1) return [Shen.type_func, shen_user_lambda6966, 1, Arg6965];
  var Arg6965_0 = Arg6965[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.<defprolog>"], [Arg6965_0]);})}, 1, [], undefined], Arg6963_0[2], [Shen.type_func, function shen_user_lambda6968(Arg6967) {
  if (Arg6967.length < 2) return [Shen.type_func, shen_user_lambda6968, 2, Arg6967];
  var Arg6967_0 = Arg6967[0], Arg6967_1 = Arg6967[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.prolog-error"], [Arg6967_0[2][1], Arg6967_1]);})}, 2, [Arg6963_0], undefined]]);})
  : Arg6963_0)}, 1, [], "shen.defprolog-macro"];





Shen.fns["shen.datatype-macro"] = [Shen.type_func, function shen_user_lambda6970(Arg6969) {
  if (Arg6969.length < 1) return [Shen.type_func, shen_user_lambda6970, 1, Arg6969];
  var Arg6969_0 = Arg6969[0];
  return (((Shen.is_type(Arg6969_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "datatype"], Arg6969_0[1])) && Shen.is_type(Arg6969_0[2], Shen.type_cons))))
  ? [Shen.type_cons, [Shen.type_symbol, "shen.process-datatype"], [Shen.type_cons, Shen.call(Shen.fns["shen.intern-type"], [Arg6969_0[2][1]]), [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "compile"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "function"], [Shen.type_cons, [Shen.type_symbol, "shen.<datatype-rules>"], []]], [Shen.type_cons, Shen.call(Shen.fns["shen.rcons_form"], [Arg6969_0[2][2]]), [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "function"], [Shen.type_cons, [Shen.type_symbol, "shen.datatype-error"], []]], []]]]], []]]]
  : Arg6969_0)}, 1, [], "shen.datatype-macro"];





Shen.fns["shen.intern-type"] = [Shen.type_func, function shen_user_lambda6972(Arg6971) {
  if (Arg6971.length < 1) return [Shen.type_func, shen_user_lambda6972, 1, Arg6971];
  var Arg6971_0 = Arg6971[0];
  return (function() {
  return Shen.intern(("type#" + Shen.str(Arg6971_0)));})}, 1, [], "shen.intern-type"];





Shen.fns["shen.@s-macro"] = [Shen.type_func, function shen_user_lambda6974(Arg6973) {
  if (Arg6973.length < 1) return [Shen.type_func, shen_user_lambda6974, 1, Arg6973];
  var Arg6973_0 = Arg6973[0];
  var R0;
  return (((Shen.is_type(Arg6973_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "@s"], Arg6973_0[1])) && (Shen.is_type(Arg6973_0[2], Shen.type_cons) && (Shen.is_type(Arg6973_0[2][2], Shen.type_cons) && Shen.is_type(Arg6973_0[2][2][2], Shen.type_cons))))))
  ? [Shen.type_cons, [Shen.type_symbol, "@s"], [Shen.type_cons, Arg6973_0[2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.@s-macro"], [[Shen.type_cons, [Shen.type_symbol, "@s"], Arg6973_0[2][2]]]), []]]]
  : (((Shen.is_type(Arg6973_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "@s"], Arg6973_0[1])) && (Shen.is_type(Arg6973_0[2], Shen.type_cons) && (Shen.is_type(Arg6973_0[2][2], Shen.type_cons) && (Shen.empty$question$(Arg6973_0[2][2][2]) && (typeof(Arg6973_0[2][1]) == 'string')))))))
  ? ((R0 = Shen.call(Shen.fns["explode"], [Arg6973_0[2][1]])),
  (((Shen.call(Shen.fns["length"], [R0]) > 1))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.@s-macro"], [[Shen.type_cons, [Shen.type_symbol, "@s"], Shen.call(Shen.fns["append"], [R0, Arg6973_0[2][2]])]]);})
  : Arg6973_0))
  : Arg6973_0))}, 1, [], "shen.@s-macro"];





Shen.fns["shen.synonyms-macro"] = [Shen.type_func, function shen_user_lambda6976(Arg6975) {
  if (Arg6975.length < 1) return [Shen.type_func, shen_user_lambda6976, 1, Arg6975];
  var Arg6975_0 = Arg6975[0];
  return (((Shen.is_type(Arg6975_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "synonyms"], Arg6975_0[1]))))
  ? [Shen.type_cons, [Shen.type_symbol, "shen.synonyms-help"], [Shen.type_cons, Shen.call(Shen.fns["shen.rcons_form"], [Shen.call(Shen.fns["shen.curry-synonyms"], [Arg6975_0[2]])]), []]]
  : Arg6975_0)}, 1, [], "shen.synonyms-macro"];





Shen.fns["shen.curry-synonyms"] = [Shen.type_func, function shen_user_lambda6978(Arg6977) {
  if (Arg6977.length < 1) return [Shen.type_func, shen_user_lambda6978, 1, Arg6977];
  var Arg6977_0 = Arg6977[0];
  return (function() {
  return Shen.call_tail(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda6980(Arg6979) {
  if (Arg6979.length < 1) return [Shen.type_func, shen_user_lambda6980, 1, Arg6979];
  var Arg6979_0 = Arg6979[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.curry-type"], [Arg6979_0]);})}, 1, [], undefined], Arg6977_0]);})}, 1, [], "shen.curry-synonyms"];





Shen.fns["shen.nl-macro"] = [Shen.type_func, function shen_user_lambda6982(Arg6981) {
  if (Arg6981.length < 1) return [Shen.type_func, shen_user_lambda6982, 1, Arg6981];
  var Arg6981_0 = Arg6981[0];
  return (((Shen.is_type(Arg6981_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "nl"], Arg6981_0[1])) && Shen.empty$question$(Arg6981_0[2]))))
  ? [Shen.type_cons, [Shen.type_symbol, "nl"], [Shen.type_cons, 1, []]]
  : Arg6981_0)}, 1, [], "shen.nl-macro"];





Shen.fns["shen.assoc-macro"] = [Shen.type_func, function shen_user_lambda6984(Arg6983) {
  if (Arg6983.length < 1) return [Shen.type_func, shen_user_lambda6984, 1, Arg6983];
  var Arg6983_0 = Arg6983[0];
  return (((Shen.is_type(Arg6983_0, Shen.type_cons) && (Shen.is_type(Arg6983_0[2], Shen.type_cons) && (Shen.is_type(Arg6983_0[2][2], Shen.type_cons) && (Shen.is_type(Arg6983_0[2][2][2], Shen.type_cons) && Shen.call(Shen.fns["element?"], [Arg6983_0[1], [Shen.type_cons, [Shen.type_symbol, "@p"], [Shen.type_cons, [Shen.type_symbol, "@v"], [Shen.type_cons, [Shen.type_symbol, "append"], [Shen.type_cons, [Shen.type_symbol, "and"], [Shen.type_cons, [Shen.type_symbol, "or"], [Shen.type_cons, [Shen.type_symbol, "+"], [Shen.type_cons, [Shen.type_symbol, "*"], [Shen.type_cons, [Shen.type_symbol, "do"], []]]]]]]]]]))))))
  ? [Shen.type_cons, Arg6983_0[1], [Shen.type_cons, Arg6983_0[2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.assoc-macro"], [[Shen.type_cons, Arg6983_0[1], Arg6983_0[2][2]]]), []]]]
  : Arg6983_0)}, 1, [], "shen.assoc-macro"];





Shen.fns["shen.let-macro"] = [Shen.type_func, function shen_user_lambda6986(Arg6985) {
  if (Arg6985.length < 1) return [Shen.type_func, shen_user_lambda6986, 1, Arg6985];
  var Arg6985_0 = Arg6985[0];
  return (((Shen.is_type(Arg6985_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "let"], Arg6985_0[1])) && (Shen.is_type(Arg6985_0[2], Shen.type_cons) && (Shen.is_type(Arg6985_0[2][2], Shen.type_cons) && (Shen.is_type(Arg6985_0[2][2][2], Shen.type_cons) && Shen.is_type(Arg6985_0[2][2][2][2], Shen.type_cons)))))))
  ? [Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, Arg6985_0[2][1], [Shen.type_cons, Arg6985_0[2][2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.let-macro"], [[Shen.type_cons, [Shen.type_symbol, "let"], Arg6985_0[2][2][2]]]), []]]]]
  : Arg6985_0)}, 1, [], "shen.let-macro"];





Shen.fns["shen.abs-macro"] = [Shen.type_func, function shen_user_lambda6988(Arg6987) {
  if (Arg6987.length < 1) return [Shen.type_func, shen_user_lambda6988, 1, Arg6987];
  var Arg6987_0 = Arg6987[0];
  return (((Shen.is_type(Arg6987_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "/."], Arg6987_0[1])) && (Shen.is_type(Arg6987_0[2], Shen.type_cons) && (Shen.is_type(Arg6987_0[2][2], Shen.type_cons) && Shen.is_type(Arg6987_0[2][2][2], Shen.type_cons))))))
  ? [Shen.type_cons, [Shen.type_symbol, "lambda"], [Shen.type_cons, Arg6987_0[2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.abs-macro"], [[Shen.type_cons, [Shen.type_symbol, "/."], Arg6987_0[2][2]]]), []]]]
  : (((Shen.is_type(Arg6987_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "/."], Arg6987_0[1])) && (Shen.is_type(Arg6987_0[2], Shen.type_cons) && (Shen.is_type(Arg6987_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg6987_0[2][2][2]))))))
  ? [Shen.type_cons, [Shen.type_symbol, "lambda"], Arg6987_0[2]]
  : Arg6987_0))}, 1, [], "shen.abs-macro"];





Shen.fns["shen.cases-macro"] = [Shen.type_func, function shen_user_lambda6990(Arg6989) {
  if (Arg6989.length < 1) return [Shen.type_func, shen_user_lambda6990, 1, Arg6989];
  var Arg6989_0 = Arg6989[0];
  return (((Shen.is_type(Arg6989_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cases"], Arg6989_0[1])) && (Shen.is_type(Arg6989_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$(true, Arg6989_0[2][1])) && Shen.is_type(Arg6989_0[2][2], Shen.type_cons))))))
  ? Arg6989_0[2][2][1]
  : (((Shen.is_type(Arg6989_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cases"], Arg6989_0[1])) && (Shen.is_type(Arg6989_0[2], Shen.type_cons) && (Shen.is_type(Arg6989_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg6989_0[2][2][2]))))))
  ? [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, Arg6989_0[2][1], [Shen.type_cons, Arg6989_0[2][2][1], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "simple-error"], [Shen.type_cons, "error: cases exhausted", []]], []]]]]
  : (((Shen.is_type(Arg6989_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cases"], Arg6989_0[1])) && (Shen.is_type(Arg6989_0[2], Shen.type_cons) && Shen.is_type(Arg6989_0[2][2], Shen.type_cons)))))
  ? [Shen.type_cons, [Shen.type_symbol, "if"], [Shen.type_cons, Arg6989_0[2][1], [Shen.type_cons, Arg6989_0[2][2][1], [Shen.type_cons, Shen.call(Shen.fns["shen.cases-macro"], [[Shen.type_cons, [Shen.type_symbol, "cases"], Arg6989_0[2][2][2]]]), []]]]]
  : (((Shen.is_type(Arg6989_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cases"], Arg6989_0[1])) && (Shen.is_type(Arg6989_0[2], Shen.type_cons) && Shen.empty$question$(Arg6989_0[2][2])))))
  ? (function() {
  return Shen.simple_error("error: odd number of case elements\x0d\x0a");})
  : Arg6989_0))))}, 1, [], "shen.cases-macro"];





Shen.fns["shen.timer-macro"] = [Shen.type_func, function shen_user_lambda6992(Arg6991) {
  if (Arg6991.length < 1) return [Shen.type_func, shen_user_lambda6992, 1, Arg6991];
  var Arg6991_0 = Arg6991[0];
  return (((Shen.is_type(Arg6991_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "time"], Arg6991_0[1])) && (Shen.is_type(Arg6991_0[2], Shen.type_cons) && Shen.empty$question$(Arg6991_0[2][2])))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.let-macro"], [[Shen.type_cons, [Shen.type_symbol, "let"], [Shen.type_cons, [Shen.type_symbol, "Start"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "get-time"], [Shen.type_cons, [Shen.type_symbol, "run"], []]], [Shen.type_cons, [Shen.type_symbol, "Result"], [Shen.type_cons, Arg6991_0[2][1], [Shen.type_cons, [Shen.type_symbol, "Finish"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "get-time"], [Shen.type_cons, [Shen.type_symbol, "run"], []]], [Shen.type_cons, [Shen.type_symbol, "Time"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "-"], [Shen.type_cons, [Shen.type_symbol, "Finish"], [Shen.type_cons, [Shen.type_symbol, "Start"], []]]], [Shen.type_cons, [Shen.type_symbol, "Message"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "shen.prhush"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "cn"], [Shen.type_cons, "\x0d\x0arun time: ", [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "cn"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "str"], [Shen.type_cons, [Shen.type_symbol, "Time"], []]], [Shen.type_cons, " secs\x0d\x0a", []]]], []]]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "stoutput"], []], []]]], [Shen.type_cons, [Shen.type_symbol, "Result"], []]]]]]]]]]]]]]);})
  : Arg6991_0)}, 1, [], "shen.timer-macro"];





Shen.fns["shen.tuple-up"] = [Shen.type_func, function shen_user_lambda6994(Arg6993) {
  if (Arg6993.length < 1) return [Shen.type_func, shen_user_lambda6994, 1, Arg6993];
  var Arg6993_0 = Arg6993[0];
  return ((Shen.is_type(Arg6993_0, Shen.type_cons))
  ? [Shen.type_cons, [Shen.type_symbol, "@p"], [Shen.type_cons, Arg6993_0[1], [Shen.type_cons, Shen.call(Shen.fns["shen.tuple-up"], [Arg6993_0[2]]), []]]]
  : Arg6993_0)}, 1, [], "shen.tuple-up"];





Shen.fns["shen.put/get-macro"] = [Shen.type_func, function shen_user_lambda6996(Arg6995) {
  if (Arg6995.length < 1) return [Shen.type_func, shen_user_lambda6996, 1, Arg6995];
  var Arg6995_0 = Arg6995[0];
  return (((Shen.is_type(Arg6995_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "put"], Arg6995_0[1])) && (Shen.is_type(Arg6995_0[2], Shen.type_cons) && (Shen.is_type(Arg6995_0[2][2], Shen.type_cons) && (Shen.is_type(Arg6995_0[2][2][2], Shen.type_cons) && Shen.empty$question$(Arg6995_0[2][2][2][2])))))))
  ? [Shen.type_cons, [Shen.type_symbol, "put"], [Shen.type_cons, Arg6995_0[2][1], [Shen.type_cons, Arg6995_0[2][2][1], [Shen.type_cons, Arg6995_0[2][2][2][1], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "value"], [Shen.type_cons, [Shen.type_symbol, "*property-vector*"], []]], []]]]]]
  : (((Shen.is_type(Arg6995_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "get"], Arg6995_0[1])) && (Shen.is_type(Arg6995_0[2], Shen.type_cons) && (Shen.is_type(Arg6995_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg6995_0[2][2][2]))))))
  ? [Shen.type_cons, [Shen.type_symbol, "get"], [Shen.type_cons, Arg6995_0[2][1], [Shen.type_cons, Arg6995_0[2][2][1], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "value"], [Shen.type_cons, [Shen.type_symbol, "*property-vector*"], []]], []]]]]
  : Arg6995_0))}, 1, [], "shen.put/get-macro"];





Shen.fns["shen.function-macro"] = [Shen.type_func, function shen_user_lambda6998(Arg6997) {
  if (Arg6997.length < 1) return [Shen.type_func, shen_user_lambda6998, 1, Arg6997];
  var Arg6997_0 = Arg6997[0];
  return (((Shen.is_type(Arg6997_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "function"], Arg6997_0[1])) && (Shen.is_type(Arg6997_0[2], Shen.type_cons) && Shen.empty$question$(Arg6997_0[2][2])))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.function-abstraction"], [Arg6997_0[2][1], Shen.call(Shen.fns["arity"], [Arg6997_0[2][1]])]);})
  : Arg6997_0)}, 1, [], "shen.function-macro"];





Shen.fns["shen.function-abstraction"] = [Shen.type_func, function shen_user_lambda7000(Arg6999) {
  if (Arg6999.length < 2) return [Shen.type_func, shen_user_lambda7000, 2, Arg6999];
  var Arg6999_0 = Arg6999[0], Arg6999_1 = Arg6999[1];
  return ((Shen.unwind_tail(Shen.$eq$(0, Arg6999_1)))
  ? [Shen.type_cons, [Shen.type_symbol, "freeze"], [Shen.type_cons, Arg6999_0, []]]
  : ((Shen.unwind_tail(Shen.$eq$(-1, Arg6999_1)))
  ? Arg6999_0
  : (function() {
  return Shen.call_tail(Shen.fns["shen.function-abstraction-help"], [Arg6999_0, Arg6999_1, []]);})))}, 2, [], "shen.function-abstraction"];





Shen.fns["shen.function-abstraction-help"] = [Shen.type_func, function shen_user_lambda7002(Arg7001) {
  if (Arg7001.length < 3) return [Shen.type_func, shen_user_lambda7002, 3, Arg7001];
  var Arg7001_0 = Arg7001[0], Arg7001_1 = Arg7001[1], Arg7001_2 = Arg7001[2];
  var R0;
  return ((Shen.unwind_tail(Shen.$eq$(0, Arg7001_1)))
  ? [Shen.type_cons, Arg7001_0, Arg7001_2]
  : ((R0 = Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "V"]])),
  [Shen.type_cons, [Shen.type_symbol, "/."], [Shen.type_cons, R0, [Shen.type_cons, Shen.call(Shen.fns["shen.function-abstraction-help"], [Arg7001_0, (Arg7001_1 - 1), Shen.call(Shen.fns["append"], [Arg7001_2, [Shen.type_cons, R0, []]])]), []]]]))}, 3, [], "shen.function-abstraction-help"];





Shen.fns["undefmacro"] = [Shen.type_func, function shen_user_lambda7004(Arg7003) {
  if (Arg7003.length < 1) return [Shen.type_func, shen_user_lambda7004, 1, Arg7003];
  var Arg7003_0 = Arg7003[0];
  return ((Shen.globals["*macros*"] = Shen.call(Shen.fns["remove"], [Arg7003_0, (Shen.globals["*macros*"])])),
  Arg7003_0)}, 1, [], "undefmacro"];










Shen.fns["declare"] = [Shen.type_func, function shen_user_lambda7990(Arg7987) {
  if (Arg7987.length < 2) return [Shen.type_func, shen_user_lambda7990, 2, Arg7987];
  var Arg7987_0 = Arg7987[0], Arg7987_1 = Arg7987[1];
  var R0, R1, R2;
  return ((Shen.globals["shen.*signedfuncs*"] = [Shen.type_cons, [Shen.type_cons, Arg7987_0, Arg7987_1], (Shen.globals["shen.*signedfuncs*"])]),
  ((R0 = [Shen.type_func, function shen_user_lambda7992(Arg7991) {
  if (Arg7991.length < 2) return [Shen.type_func, shen_user_lambda7992, 2, Arg7991];
  var Arg7991_0 = Arg7991[0], Arg7991_1 = Arg7991[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.variancy-test"], [Arg7991_1, Arg7991_0]);})}, 2, [Arg7987_1, Arg7987_0], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda7994(Arg7993) {
  if (Arg7993.length < 1) return [Shen.type_func, shen_user_lambda7994, 1, Arg7993];
  var Arg7993_0 = Arg7993[0];
  return [Shen.type_symbol, "shen.skip"]}, 1, [], undefined]),
  Shen.trap_error(R0, R1)),
  (R0 = Shen.call(Shen.fns["shen.rcons_form"], [Shen.call(Shen.fns["shen.demodulate"], [Arg7987_1])])),
  (R1 = Shen.call(Shen.fns["concat"], [[Shen.type_symbol, "shen.type-signature-of-"], Arg7987_0])),
  (R2 = Shen.call(Shen.fns["shen.parameters"], [1])),
  (R0 = [Shen.type_cons, [Shen.type_cons, R1, [Shen.type_cons, [Shen.type_symbol, "X"], []]], [Shen.type_cons, [Shen.type_symbol, ":-"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "unify!"], [Shen.type_cons, [Shen.type_symbol, "X"], [Shen.type_cons, R0, []]]], []], []]]]),
  (R0 = Shen.call(Shen.fns["shen.aum"], [R0, R2])),
  (R0 = Shen.call(Shen.fns["shen.aum_to_shen"], [R0])),
  (R2 = [Shen.type_cons, [Shen.type_symbol, "define"], [Shen.type_cons, R1, Shen.call(Shen.fns["append"], [R2, Shen.call(Shen.fns["append"], [[Shen.type_cons, [Shen.type_symbol, "ProcessN"], [Shen.type_cons, [Shen.type_symbol, "Continuation"], []]], [Shen.type_cons, [Shen.type_symbol, "->"], [Shen.type_cons, R0, []]]])])]]),
  Shen.call(Shen.fns["shen.eval-without-macros"], [R2]),
  Arg7987_0)}, 2, [], "declare"];





Shen.fns["shen.demodulate"] = [Shen.type_func, function shen_user_lambda7998(Arg7995) {
  if (Arg7995.length < 1) return [Shen.type_func, shen_user_lambda7998, 1, Arg7995];
  var Arg7995_0 = Arg7995[0];
  var R0, R1;
  return ((R0 = [Shen.type_func, function shen_user_lambda8000(Arg7999) {
  if (Arg7999.length < 1) return [Shen.type_func, shen_user_lambda8000, 1, Arg7999];
  var Arg7999_0 = Arg7999[0];
  var R0, R1;
  return ((R1 = Shen.call(Shen.fns["shen.walk"], [[Shen.type_func, function shen_user_lambda8002(Arg8001) {
  if (Arg8001.length < 1) return [Shen.type_func, shen_user_lambda8002, 1, Arg8001];
  var Arg8001_0 = Arg8001[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.demod"], [Arg8001_0]);})}, 1, [], undefined], Arg7999_0])),
  ((Shen.unwind_tail(Shen.$eq$(R1, Arg7999_0)))
  ? Arg7999_0
  : (function() {
  return Shen.call_tail(Shen.fns["shen.demodulate"], [R1]);})))}, 1, [Arg7995_0], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda8004(Arg8003) {
  if (Arg8003.length < 2) return [Shen.type_func, shen_user_lambda8004, 2, Arg8003];
  var Arg8003_0 = Arg8003[0], Arg8003_1 = Arg8003[1];
  return Arg8003_0}, 2, [Arg7995_0], undefined]),
  (function() {
  return Shen.trap_error(R0, R1);}))}, 1, [], "shen.demodulate"];





Shen.fns["shen.variancy-test"] = [Shen.type_func, function shen_user_lambda8006(Arg8005) {
  if (Arg8005.length < 2) return [Shen.type_func, shen_user_lambda8006, 2, Arg8005];
  var Arg8005_0 = Arg8005[0], Arg8005_1 = Arg8005[1];
  var R0;
  return ((R0 = Shen.call(Shen.fns["shen.typecheck"], [Arg8005_0, [Shen.type_symbol, "B"]])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "symbol"], R0)))
  ? [Shen.type_symbol, "shen.skip"]
  : ((Shen.call(Shen.fns["shen.variant?"], [R0, Arg8005_1]))
  ? [Shen.type_symbol, "shen.skip"]
  : Shen.call(Shen.fns["shen.prhush"], [("warning: changing the type of " + Shen.call(Shen.fns["shen.app"], [Arg8005_0, " may create errors\x0d\x0a", [Shen.type_symbol, "shen.a"]])), Shen.call(Shen.fns["stoutput"], [])]))),
  [Shen.type_symbol, "shen.skip"])}, 2, [], "shen.variancy-test"];





Shen.fns["shen.variant?"] = [Shen.type_func, function shen_user_lambda8008(Arg8007) {
  if (Arg8007.length < 2) return [Shen.type_func, shen_user_lambda8008, 2, Arg8007];
  var Arg8007_0 = Arg8007[0], Arg8007_1 = Arg8007[1];
  return ((Shen.unwind_tail(Shen.$eq$(Arg8007_1, Arg8007_0)))
  ? true
  : (((Shen.is_type(Arg8007_0, Shen.type_cons) && (Shen.is_type(Arg8007_1, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(Arg8007_1[1], Arg8007_0[1])))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.variant?"], [Arg8007_0[2], Arg8007_1[2]]);})
  : (((Shen.is_type(Arg8007_0, Shen.type_cons) && (Shen.is_type(Arg8007_1, Shen.type_cons) && (Shen.call(Shen.fns["shen.pvar?"], [Arg8007_0[1]]) && Shen.call(Shen.fns["variable?"], [Arg8007_1[1]])))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.variant?"], [Shen.call(Shen.fns["subst"], [[Shen.type_symbol, "shen.a"], Arg8007_0[1], Arg8007_0[2]]), Shen.call(Shen.fns["subst"], [[Shen.type_symbol, "shen.a"], Arg8007_1[1], Arg8007_1[2]])]);})
  : (((Shen.is_type(Arg8007_0, Shen.type_cons) && (Shen.is_type(Arg8007_0[1], Shen.type_cons) && (Shen.is_type(Arg8007_1, Shen.type_cons) && Shen.is_type(Arg8007_1[1], Shen.type_cons)))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.variant?"], [Shen.call(Shen.fns["append"], [Arg8007_0[1], Arg8007_0[2]]), Shen.call(Shen.fns["append"], [Arg8007_1[1], Arg8007_1[2]])]);})
  : false))))}, 2, [], "shen.variant?"];





Shen.call_toplevel(function js$dot$shen_js_toplevel8011(Arg8009) {
  if (Arg8009.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8011, 0, Arg8009];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "absvector?"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8014(Arg8012) {
  if (Arg8012.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8014, 0, Arg8012];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "adjoin"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8017(Arg8015) {
  if (Arg8015.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8017, 0, Arg8015];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "and"], [Shen.type_cons, [Shen.type_symbol, "boolean"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "boolean"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8020(Arg8018) {
  if (Arg8018.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8020, 0, Arg8018];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "shen.app"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8023(Arg8021) {
  if (Arg8021.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8023, 0, Arg8021];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "append"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8026(Arg8024) {
  if (Arg8024.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8026, 0, Arg8024];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "arity"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "number"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8029(Arg8027) {
  if (Arg8027.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8029, 0, Arg8027];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "assoc"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8032(Arg8030) {
  if (Arg8030.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8032, 0, Arg8030];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "boolean?"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8035(Arg8033) {
  if (Arg8033.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8035, 0, Arg8033];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "bound?"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8038(Arg8036) {
  if (Arg8036.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8038, 0, Arg8036];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "cd"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8041(Arg8039) {
  if (Arg8039.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8041, 0, Arg8039];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "close"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "stream"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "B"], []]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8044(Arg8042) {
  if (Arg8042.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8044, 0, Arg8042];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "cn"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8047(Arg8045) {
  if (Arg8045.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8047, 0, Arg8045];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "compile"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "==>"], [Shen.type_cons, [Shen.type_symbol, "B"], []]]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "B"], []]]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "B"], []]]], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8050(Arg8048) {
  if (Arg8048.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8050, 0, Arg8048];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "cons?"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8053(Arg8051) {
  if (Arg8051.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8053, 0, Arg8051];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "destroy"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "B"], []]]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8056(Arg8054) {
  if (Arg8054.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8056, 0, Arg8054];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "difference"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8059(Arg8057) {
  if (Arg8057.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8059, 0, Arg8057];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "do"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "B"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "B"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8062(Arg8060) {
  if (Arg8060.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8062, 0, Arg8060];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "<e>"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "==>"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "B"], []]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8065(Arg8063) {
  if (Arg8063.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8065, 0, Arg8063];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "<!>"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "==>"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8068(Arg8066) {
  if (Arg8066.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8068, 0, Arg8066];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "element?"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8071(Arg8069) {
  if (Arg8069.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8071, 0, Arg8069];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "empty?"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8074(Arg8072) {
  if (Arg8072.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8074, 0, Arg8072];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "enable-type-theory"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8077(Arg8075) {
  if (Arg8075.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8077, 0, Arg8075];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "external"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8080(Arg8078) {
  if (Arg8078.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8080, 0, Arg8078];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "error-to-string"], [Shen.type_cons, [Shen.type_symbol, "exception"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8083(Arg8081) {
  if (Arg8081.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8083, 0, Arg8081];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "explode"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "string"], []]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8086(Arg8084) {
  if (Arg8084.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8086, 0, Arg8084];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "fail-if"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8089(Arg8087) {
  if (Arg8087.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8089, 0, Arg8087];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "fix"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "A"], []]]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "A"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8092(Arg8090) {
  if (Arg8090.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8092, 0, Arg8090];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "freeze"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "lazy"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8095(Arg8093) {
  if (Arg8093.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8095, 0, Arg8093];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "fst"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "*"], [Shen.type_cons, [Shen.type_symbol, "B"], []]]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "A"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8098(Arg8096) {
  if (Arg8096.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8098, 0, Arg8096];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "gensym"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8101(Arg8099) {
  if (Arg8099.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8101, 0, Arg8099];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "<-vector"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "A"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8104(Arg8102) {
  if (Arg8102.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8104, 0, Arg8102];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "vector->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], []]]], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8107(Arg8105) {
  if (Arg8105.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8107, 0, Arg8105];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "vector"], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8110(Arg8108) {
  if (Arg8108.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8110, 0, Arg8108];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "get-time"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "number"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8113(Arg8111) {
  if (Arg8111.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8113, 0, Arg8111];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "hash"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "number"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8116(Arg8114) {
  if (Arg8114.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8116, 0, Arg8114];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "head"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "A"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8119(Arg8117) {
  if (Arg8117.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8119, 0, Arg8117];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "hdv"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "A"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8122(Arg8120) {
  if (Arg8120.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8122, 0, Arg8120];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "hdstr"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8125(Arg8123) {
  if (Arg8123.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8125, 0, Arg8123];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "if"], [Shen.type_cons, [Shen.type_symbol, "boolean"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "A"], []]]], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8128(Arg8126) {
  if (Arg8126.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8128, 0, Arg8126];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "it"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "unit"], []]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8131(Arg8129) {
  if (Arg8129.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8131, 0, Arg8129];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "implementation"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8134(Arg8132) {
  if (Arg8132.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8134, 0, Arg8132];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "include"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8137(Arg8135) {
  if (Arg8135.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8137, 0, Arg8135];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "include-all-but"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8140(Arg8138) {
  if (Arg8138.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8140, 0, Arg8138];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "inferences"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "number"], []]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8143(Arg8141) {
  if (Arg8141.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8143, 0, Arg8141];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "shen.insert"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8146(Arg8144) {
  if (Arg8144.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8146, 0, Arg8144];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "integer?"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8149(Arg8147) {
  if (Arg8147.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8149, 0, Arg8147];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "intersection"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8152(Arg8150) {
  if (Arg8150.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8152, 0, Arg8150];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "kill"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "A"], []]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8155(Arg8153) {
  if (Arg8153.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8155, 0, Arg8153];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "language"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8158(Arg8156) {
  if (Arg8156.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8158, 0, Arg8156];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "length"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "number"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8161(Arg8159) {
  if (Arg8159.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8161, 0, Arg8159];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "limit"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "number"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8164(Arg8162) {
  if (Arg8162.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8164, 0, Arg8162];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "load"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8167(Arg8165) {
  if (Arg8165.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8167, 0, Arg8165];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "map"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "B"], []]]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "B"], []]], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8170(Arg8168) {
  if (Arg8168.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8170, 0, Arg8168];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "mapcan"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "B"], []]], []]]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "B"], []]], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8173(Arg8171) {
  if (Arg8171.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8173, 0, Arg8171];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "maxinferences"], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "number"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8176(Arg8174) {
  if (Arg8174.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8176, 0, Arg8174];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "n->string"], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8179(Arg8177) {
  if (Arg8177.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8179, 0, Arg8177];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "nl"], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "number"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8182(Arg8180) {
  if (Arg8180.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8182, 0, Arg8180];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "not"], [Shen.type_cons, [Shen.type_symbol, "boolean"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8185(Arg8183) {
  if (Arg8183.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8185, 0, Arg8183];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "nth"], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "A"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8188(Arg8186) {
  if (Arg8186.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8188, 0, Arg8186];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "number?"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8191(Arg8189) {
  if (Arg8189.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8191, 0, Arg8189];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "occurrences"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "B"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "number"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8194(Arg8192) {
  if (Arg8192.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8194, 0, Arg8192];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "occurs-check"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8197(Arg8195) {
  if (Arg8195.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8197, 0, Arg8195];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "optimise"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8200(Arg8198) {
  if (Arg8198.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8200, 0, Arg8198];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "or"], [Shen.type_cons, [Shen.type_symbol, "boolean"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "boolean"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8203(Arg8201) {
  if (Arg8201.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8203, 0, Arg8201];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "os"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8206(Arg8204) {
  if (Arg8204.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8206, 0, Arg8204];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "port"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8209(Arg8207) {
  if (Arg8207.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8209, 0, Arg8207];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "porters"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8212(Arg8210) {
  if (Arg8210.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8212, 0, Arg8210];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "pos"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8215(Arg8213) {
  if (Arg8213.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8215, 0, Arg8213];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "pr"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "stream"], [Shen.type_cons, [Shen.type_symbol, "out"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8218(Arg8216) {
  if (Arg8216.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8218, 0, Arg8216];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "print"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "A"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8221(Arg8219) {
  if (Arg8219.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8221, 0, Arg8219];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "profile"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "B"], []]]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "B"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8224(Arg8222) {
  if (Arg8222.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8224, 0, Arg8222];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "preclude"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8227(Arg8225) {
  if (Arg8225.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8227, 0, Arg8225];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "shen.proc-nl"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8230(Arg8228) {
  if (Arg8228.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8230, 0, Arg8228];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "profile-results"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "B"], []]]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "B"], []]]], [Shen.type_cons, [Shen.type_symbol, "*"], [Shen.type_cons, [Shen.type_symbol, "number"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8233(Arg8231) {
  if (Arg8231.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8233, 0, Arg8231];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "protect"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8236(Arg8234) {
  if (Arg8234.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8236, 0, Arg8234];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "preclude-all-but"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8239(Arg8237) {
  if (Arg8237.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8239, 0, Arg8237];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "shen.prhush"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "stream"], [Shen.type_cons, [Shen.type_symbol, "out"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8242(Arg8240) {
  if (Arg8240.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8242, 0, Arg8240];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "ps"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "unit"], []]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8245(Arg8243) {
  if (Arg8243.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8245, 0, Arg8243];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "read-byte"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "stream"], [Shen.type_cons, [Shen.type_symbol, "in"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "number"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8248(Arg8246) {
  if (Arg8246.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8248, 0, Arg8246];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "read-file-as-bytelist"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "number"], []]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8251(Arg8249) {
  if (Arg8249.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8251, 0, Arg8249];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "read-file-as-string"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8254(Arg8252) {
  if (Arg8252.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8254, 0, Arg8252];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "read-file"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "unit"], []]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8257(Arg8255) {
  if (Arg8255.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8257, 0, Arg8255];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "read-from-string"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "unit"], []]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8260(Arg8258) {
  if (Arg8258.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8260, 0, Arg8258];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "release"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8263(Arg8261) {
  if (Arg8261.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8263, 0, Arg8261];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "remove"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8266(Arg8264) {
  if (Arg8264.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8266, 0, Arg8264];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "reverse"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8269(Arg8267) {
  if (Arg8267.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8269, 0, Arg8267];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "simple-error"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "A"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8272(Arg8270) {
  if (Arg8270.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8272, 0, Arg8270];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "snd"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "*"], [Shen.type_cons, [Shen.type_symbol, "B"], []]]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "B"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8275(Arg8273) {
  if (Arg8273.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8275, 0, Arg8273];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "specialise"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8278(Arg8276) {
  if (Arg8276.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8278, 0, Arg8276];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "spy"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8281(Arg8279) {
  if (Arg8279.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8281, 0, Arg8279];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "step"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8284(Arg8282) {
  if (Arg8282.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8284, 0, Arg8282];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "stinput"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "stream"], [Shen.type_cons, [Shen.type_symbol, "in"], []]], []]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8287(Arg8285) {
  if (Arg8285.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8287, 0, Arg8285];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "stoutput"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "stream"], [Shen.type_cons, [Shen.type_symbol, "out"], []]], []]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8290(Arg8288) {
  if (Arg8288.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8290, 0, Arg8288];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "string?"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8293(Arg8291) {
  if (Arg8291.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8293, 0, Arg8291];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "str"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8296(Arg8294) {
  if (Arg8294.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8296, 0, Arg8294];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "string->n"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "number"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8299(Arg8297) {
  if (Arg8297.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8299, 0, Arg8297];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "string->symbol"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8302(Arg8300) {
  if (Arg8300.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8302, 0, Arg8300];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "sum"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "number"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "number"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8305(Arg8303) {
  if (Arg8303.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8305, 0, Arg8303];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "symbol?"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8308(Arg8306) {
  if (Arg8306.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8308, 0, Arg8306];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "systemf"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8311(Arg8309) {
  if (Arg8309.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8311, 0, Arg8309];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "tail"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8314(Arg8312) {
  if (Arg8312.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8314, 0, Arg8312];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "tlstr"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8317(Arg8315) {
  if (Arg8315.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8317, 0, Arg8315];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "tlv"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8320(Arg8318) {
  if (Arg8318.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8320, 0, Arg8318];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "tc"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8323(Arg8321) {
  if (Arg8321.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8323, 0, Arg8321];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "tc?"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8326(Arg8324) {
  if (Arg8324.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8326, 0, Arg8324];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "thaw"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "lazy"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "A"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8329(Arg8327) {
  if (Arg8327.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8329, 0, Arg8327];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "track"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8332(Arg8330) {
  if (Arg8330.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8332, 0, Arg8330];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "trap-error"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "exception"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "A"], []]]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "A"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8335(Arg8333) {
  if (Arg8333.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8335, 0, Arg8333];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "tuple?"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8338(Arg8336) {
  if (Arg8336.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8338, 0, Arg8336];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "undefmacro"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8341(Arg8339) {
  if (Arg8339.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8341, 0, Arg8339];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "union"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, [Shen.type_symbol, "A"], []]], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8344(Arg8342) {
  if (Arg8342.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8344, 0, Arg8342];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "unprofile"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "B"], []]]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "B"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8347(Arg8345) {
  if (Arg8345.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8347, 0, Arg8345];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "untrack"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8350(Arg8348) {
  if (Arg8348.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8350, 0, Arg8348];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "unspecialise"], [Shen.type_cons, [Shen.type_symbol, "symbol"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "symbol"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8353(Arg8351) {
  if (Arg8351.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8353, 0, Arg8351];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "variable?"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8356(Arg8354) {
  if (Arg8354.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8356, 0, Arg8354];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "vector?"], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8359(Arg8357) {
  if (Arg8357.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8359, 0, Arg8357];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "version"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8362(Arg8360) {
  if (Arg8360.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8362, 0, Arg8360];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "write-to-file"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "A"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8365(Arg8363) {
  if (Arg8363.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8365, 0, Arg8363];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "write-byte"], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "stream"], [Shen.type_cons, [Shen.type_symbol, "out"], []]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "number"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8368(Arg8366) {
  if (Arg8366.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8368, 0, Arg8366];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "y-or-n?"], [Shen.type_cons, [Shen.type_symbol, "string"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8371(Arg8369) {
  if (Arg8369.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8371, 0, Arg8369];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, ">"], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8374(Arg8372) {
  if (Arg8372.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8374, 0, Arg8372];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "<"], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8377(Arg8375) {
  if (Arg8375.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8377, 0, Arg8375];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, ">="], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8380(Arg8378) {
  if (Arg8378.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8380, 0, Arg8378];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "<="], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8383(Arg8381) {
  if (Arg8381.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8383, 0, Arg8381];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "="], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8386(Arg8384) {
  if (Arg8384.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8386, 0, Arg8384];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "+"], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "number"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8389(Arg8387) {
  if (Arg8387.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8389, 0, Arg8387];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "/"], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "number"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8392(Arg8390) {
  if (Arg8390.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8392, 0, Arg8390];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "-"], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "number"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8395(Arg8393) {
  if (Arg8393.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8395, 0, Arg8393];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "*"], [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "number"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "number"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8398(Arg8396) {
  if (Arg8396.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8398, 0, Arg8396];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "=="], [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "B"], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8401(Arg8399) {
  if (Arg8399.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8401, 0, Arg8399];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "shen.in->"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "==>"], [Shen.type_cons, [Shen.type_symbol, "B"], []]]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "A"], []]]]]);})});




Shen.call_toplevel(function js$dot$shen_js_toplevel8404(Arg8402) {
  if (Arg8402.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel8404, 0, Arg8402];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [[Shen.type_symbol, "shen.<-out"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "A"], [Shen.type_cons, [Shen.type_symbol, "==>"], [Shen.type_cons, [Shen.type_symbol, "B"], []]]], [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, [Shen.type_symbol, "B"], []]]]]);})});









Shen.fns["shen.typecheck"] = [Shen.type_func, function shen_user_lambda6301(Arg6300) {
  if (Arg6300.length < 2) return [Shen.type_func, shen_user_lambda6301, 2, Arg6300];
  var Arg6300_0 = Arg6300[0], Arg6300_1 = Arg6300[1];
  var R0, R1, R2, R3;
  return ((R0 = Shen.call(Shen.fns["shen.curry"], [Arg6300_0])),
  (R1 = Shen.call(Shen.fns["shen.start-new-prolog-process"], [])),
  (R2 = Shen.call(Shen.fns["shen.insert-prolog-variables"], [Shen.call(Shen.fns["shen.demodulate"], [Shen.call(Shen.fns["shen.curry-type"], [Arg6300_1])]), R1])),
  (R3 = [Shen.type_func, function shen_user_lambda6303(Arg6302) {
  if (Arg6302.length < 3) return [Shen.type_func, shen_user_lambda6303, 3, Arg6302];
  var Arg6302_0 = Arg6302[0], Arg6302_1 = Arg6302[1], Arg6302_2 = Arg6302[2];
  return (function() {
  return Shen.call_tail(Shen.fns["return"], [Arg6302_1, Arg6302_2, [Shen.type_symbol, "shen.void"]]);})}, 3, [R0, R2, R1], undefined]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.t*"], [[Shen.type_cons, R0, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, R2, []]]], [], R1, R3]);}))}, 2, [], "shen.typecheck"];





Shen.fns["shen.curry"] = [Shen.type_func, function shen_user_lambda6305(Arg6304) {
  if (Arg6304.length < 1) return [Shen.type_func, shen_user_lambda6305, 1, Arg6304];
  var Arg6304_0 = Arg6304[0];
  return (((Shen.is_type(Arg6304_0, Shen.type_cons) && Shen.call(Shen.fns["shen.special?"], [Arg6304_0[1]])))
  ? [Shen.type_cons, Arg6304_0[1], Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda6307(Arg6306) {
  if (Arg6306.length < 1) return [Shen.type_func, shen_user_lambda6307, 1, Arg6306];
  var Arg6306_0 = Arg6306[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.curry"], [Arg6306_0]);})}, 1, [], undefined], Arg6304_0[2]])]
  : (((Shen.is_type(Arg6304_0, Shen.type_cons) && (Shen.is_type(Arg6304_0[2], Shen.type_cons) && Shen.call(Shen.fns["shen.extraspecial?"], [Arg6304_0[1]]))))
  ? Arg6304_0
  : (((Shen.is_type(Arg6304_0, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "type"], Arg6304_0[1])) && (Shen.is_type(Arg6304_0[2], Shen.type_cons) && (Shen.is_type(Arg6304_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg6304_0[2][2][2]))))))
  ? [Shen.type_cons, [Shen.type_symbol, "type"], [Shen.type_cons, Shen.call(Shen.fns["shen.curry"], [Arg6304_0[2][1]]), Arg6304_0[2][2]]]
  : (((Shen.is_type(Arg6304_0, Shen.type_cons) && (Shen.is_type(Arg6304_0[2], Shen.type_cons) && Shen.is_type(Arg6304_0[2][2], Shen.type_cons))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.curry"], [[Shen.type_cons, [Shen.type_cons, Arg6304_0[1], [Shen.type_cons, Arg6304_0[2][1], []]], Arg6304_0[2][2]]]);})
  : (((Shen.is_type(Arg6304_0, Shen.type_cons) && (Shen.is_type(Arg6304_0[2], Shen.type_cons) && Shen.empty$question$(Arg6304_0[2][2]))))
  ? [Shen.type_cons, Shen.call(Shen.fns["shen.curry"], [Arg6304_0[1]]), [Shen.type_cons, Shen.call(Shen.fns["shen.curry"], [Arg6304_0[2][1]]), []]]
  : Arg6304_0)))))}, 1, [], "shen.curry"];





Shen.fns["shen.special?"] = [Shen.type_func, function shen_user_lambda6309(Arg6308) {
  if (Arg6308.length < 1) return [Shen.type_func, shen_user_lambda6309, 1, Arg6308];
  var Arg6308_0 = Arg6308[0];
  return (function() {
  return Shen.call_tail(Shen.fns["element?"], [Arg6308_0, (Shen.globals["shen.*special*"])]);})}, 1, [], "shen.special?"];





Shen.fns["shen.extraspecial?"] = [Shen.type_func, function shen_user_lambda6311(Arg6310) {
  if (Arg6310.length < 1) return [Shen.type_func, shen_user_lambda6311, 1, Arg6310];
  var Arg6310_0 = Arg6310[0];
  return (function() {
  return Shen.call_tail(Shen.fns["element?"], [Arg6310_0, (Shen.globals["shen.*extraspecial*"])]);})}, 1, [], "shen.extraspecial?"];





Shen.fns["shen.t*"] = [Shen.type_func, function shen_user_lambda6313(Arg6312) {
  if (Arg6312.length < 4) return [Shen.type_func, shen_user_lambda6313, 4, Arg6312];
  var Arg6312_0 = Arg6312[0], Arg6312_1 = Arg6312[1], Arg6312_2 = Arg6312[2], Arg6312_3 = Arg6312[3];
  var R0, R1, R2, R3;
  return ((R0 = Shen.call(Shen.fns["shen.catchpoint"], [])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.cutpoint"], [R0, (((R1 = Shen.call(Shen.fns["shen.newpv"], [Arg6312_2])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["fwhen"], [Shen.call(Shen.fns["shen.maxinfexceeded?"], []), Arg6312_2, [Shen.type_func, function shen_user_lambda6315(Arg6314) {
  if (Arg6314.length < 8) return [Shen.type_func, shen_user_lambda6315, 8, Arg6314];
  var Arg6314_0 = Arg6314[0], Arg6314_1 = Arg6314[1], Arg6314_2 = Arg6314[2], Arg6314_3 = Arg6314[3], Arg6314_4 = Arg6314[4], Arg6314_5 = Arg6314[5], Arg6314_6 = Arg6314[6], Arg6314_7 = Arg6314[7];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6314_0, Shen.call(Shen.fns["shen.errormaxinfs"], []), Arg6314_1, Arg6314_2]);})}, 8, [R1, Arg6312_2, Arg6312_3, R0, Arg6312_0, Arg6312_1, Arg6312_2, Arg6312_3], undefined]]))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6312_0, Arg6312_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "fail"], R1)))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["cut"], [R0, Arg6312_2, [Shen.type_func, function shen_user_lambda6317(Arg6316) {
  if (Arg6316.length < 5) return [Shen.type_func, shen_user_lambda6317, 5, Arg6316];
  var Arg6316_0 = Arg6316[0], Arg6316_1 = Arg6316[1], Arg6316_2 = Arg6316[2], Arg6316_3 = Arg6316[3], Arg6316_4 = Arg6316[4];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.prolog-failure"], [Arg6316_3, Arg6316_4]);})}, 5, [R0, Arg6312_0, Arg6312_1, Arg6312_2, Arg6312_3], undefined]])))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6312_0, Arg6312_2])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = R1[1]),
  (R1 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6312_2])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6312_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":"], R3)))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6312_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R1 = R3[1]),
  (R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6312_2])),
  ((Shen.empty$question$(R3))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["fwhen"], [Shen.call(Shen.fns["shen.type-theory-enabled?"], []), Arg6312_2, [Shen.type_func, function shen_user_lambda6319(Arg6318) {
  if (Arg6318.length < 7) return [Shen.type_func, shen_user_lambda6319, 7, Arg6318];
  var Arg6318_0 = Arg6318[0], Arg6318_1 = Arg6318[1], Arg6318_2 = Arg6318[2], Arg6318_3 = Arg6318[3], Arg6318_4 = Arg6318[4], Arg6318_5 = Arg6318[5], Arg6318_6 = Arg6318[6];
  return (function() {
  return Shen.call_tail(Shen.fns["cut"], [Arg6318_0, Arg6318_5, [Shen.type_func, function shen_user_lambda6321(Arg6320) {
  if (Arg6320.length < 6) return [Shen.type_func, shen_user_lambda6321, 6, Arg6320];
  var Arg6320_0 = Arg6320[0], Arg6320_1 = Arg6320[1], Arg6320_2 = Arg6320[2], Arg6320_3 = Arg6320[3], Arg6320_4 = Arg6320[4], Arg6320_5 = Arg6320[5];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6320_1, Arg6320_2, Arg6320_3, Arg6320_4, Arg6320_5]);})}, 6, [Arg6318_0, Arg6318_1, Arg6318_2, Arg6318_4, Arg6318_5, Arg6318_6], undefined]]);})}, 7, [R0, R2, R1, Arg6312_0, Arg6312_1, Arg6312_2, Arg6312_3], undefined]])))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? ((R1 = Shen.call(Shen.fns["shen.newpv"], [Arg6312_2])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  Shen.call(Shen.fns["shen.show"], [Arg6312_0, Arg6312_1, Arg6312_2, [Shen.type_func, function shen_user_lambda6323(Arg6322) {
  if (Arg6322.length < 5) return [Shen.type_func, shen_user_lambda6323, 5, Arg6322];
  var Arg6322_0 = Arg6322[0], Arg6322_1 = Arg6322[1], Arg6322_2 = Arg6322[2], Arg6322_3 = Arg6322[3], Arg6322_4 = Arg6322[4];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6322_2, (Shen.globals["shen.*datatypes*"]), Arg6322_3, [Shen.type_func, function shen_user_lambda6325(Arg6324) {
  if (Arg6324.length < 5) return [Shen.type_func, shen_user_lambda6325, 5, Arg6324];
  var Arg6324_0 = Arg6324[0], Arg6324_1 = Arg6324[1], Arg6324_2 = Arg6324[2], Arg6324_3 = Arg6324[3], Arg6324_4 = Arg6324[4];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.udefs*"], [Arg6324_0, Arg6324_1, Arg6324_2, Arg6324_3, Arg6324_4]);})}, 5, [Arg6322_0, Arg6322_1, Arg6322_2, Arg6322_3, Arg6322_4], undefined]]);})}, 5, [Arg6312_0, Arg6312_1, R1, Arg6312_2, Arg6312_3], undefined]]))
  : R1))
  : R1))
  : R1))]);}))}, 4, [], "shen.t*"];





Shen.fns["shen.type-theory-enabled?"] = [Shen.type_func, function shen_user_lambda6327(Arg6326) {
  if (Arg6326.length < 0) return [Shen.type_func, shen_user_lambda6327, 0, Arg6326];
  return (Shen.globals["shen.*shen-type-theory-enabled?*"])}, 0, [], "shen.type-theory-enabled?"];





Shen.fns["enable-type-theory"] = [Shen.type_func, function shen_user_lambda6329(Arg6328) {
  if (Arg6328.length < 1) return [Shen.type_func, shen_user_lambda6329, 1, Arg6328];
  var Arg6328_0 = Arg6328[0];
  return ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "+"], Arg6328_0)))
  ? (Shen.globals["shen.*shen-type-theory-enabled?*"] = true)
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "-"], Arg6328_0)))
  ? (Shen.globals["shen.*shen-type-theory-enabled?*"] = false)
  : (function() {
  return Shen.simple_error("enable-type-theory expects a + or a -\x0d\x0a");})))}, 1, [], "enable-type-theory"];





Shen.fns["shen.prolog-failure"] = [Shen.type_func, function shen_user_lambda6331(Arg6330) {
  if (Arg6330.length < 2) return [Shen.type_func, shen_user_lambda6331, 2, Arg6330];
  var Arg6330_0 = Arg6330[0], Arg6330_1 = Arg6330[1];
  return false}, 2, [], "shen.prolog-failure"];





Shen.fns["shen.maxinfexceeded?"] = [Shen.type_func, function shen_user_lambda6333(Arg6332) {
  if (Arg6332.length < 0) return [Shen.type_func, shen_user_lambda6333, 0, Arg6332];
  return (Shen.call(Shen.fns["inferences"], []) > (Shen.globals["shen.*maxinferences*"]))}, 0, [], "shen.maxinfexceeded?"];





Shen.fns["shen.errormaxinfs"] = [Shen.type_func, function shen_user_lambda6335(Arg6334) {
  if (Arg6334.length < 0) return [Shen.type_func, shen_user_lambda6335, 0, Arg6334];
  return (function() {
  return Shen.simple_error("maximum inferences exceeded~%");})}, 0, [], "shen.errormaxinfs"];





Shen.fns["shen.udefs*"] = [Shen.type_func, function shen_user_lambda6337(Arg6336) {
  if (Arg6336.length < 5) return [Shen.type_func, shen_user_lambda6337, 5, Arg6336];
  var Arg6336_0 = Arg6336[0], Arg6336_1 = Arg6336[1], Arg6336_2 = Arg6336[2], Arg6336_3 = Arg6336[3], Arg6336_4 = Arg6336[4];
  var R0;
  return (((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6336_2, Arg6336_3])),
  ((Shen.is_type(R0, Shen.type_cons))
  ? ((R0 = R0[1]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R0 = Shen.call(Shen.fns["call"], [[Shen.type_cons, R0, [Shen.type_cons, Arg6336_0, [Shen.type_cons, Arg6336_1, []]]], Arg6336_3, Arg6336_4])))
  : (R0 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R0, false)))
  ? ((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6336_2, Arg6336_3])),
  ((Shen.is_type(R0, Shen.type_cons))
  ? ((R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (function() {
  return Shen.call_tail(Shen.fns["shen.udefs*"], [Arg6336_0, Arg6336_1, R0, Arg6336_3, Arg6336_4]);}))
  : false))
  : R0))}, 5, [], "shen.udefs*"];





Shen.fns["shen.th*"] = [Shen.type_func, function shen_user_lambda6339(Arg6338) {
  if (Arg6338.length < 5) return [Shen.type_func, shen_user_lambda6339, 5, Arg6338];
  var Arg6338_0 = Arg6338[0], Arg6338_1 = Arg6338[1], Arg6338_2 = Arg6338[2], Arg6338_3 = Arg6338[3], Arg6338_4 = Arg6338[4];
  var R0, R1, R2, R3, R4, R5, R6, R7, R8;
  return ((R0 = Shen.call(Shen.fns["shen.catchpoint"], [])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.cutpoint"], [R0, ((Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["shen.show"], [[Shen.type_cons, Arg6338_0, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Arg6338_1, []]]], Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6341(Arg6340) {
  if (Arg6340.length < 6) return [Shen.type_func, shen_user_lambda6341, 6, Arg6340];
  var Arg6340_0 = Arg6340[0], Arg6340_1 = Arg6340[1], Arg6340_2 = Arg6340[2], Arg6340_3 = Arg6340[3], Arg6340_4 = Arg6340[4], Arg6340_5 = Arg6340[5];
  return (function() {
  return Shen.call_tail(Shen.fns["fwhen"], [false, Arg6340_4, Arg6340_5]);})}, 6, [R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["fwhen"], [Shen.call(Shen.fns["shen.typedf?"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_0, Arg6338_3])]), Arg6338_3, [Shen.type_func, function shen_user_lambda6343(Arg6342) {
  if (Arg6342.length < 11) return [Shen.type_func, shen_user_lambda6343, 11, Arg6342];
  var Arg6342_0 = Arg6342[0], Arg6342_1 = Arg6342[1], Arg6342_2 = Arg6342[2], Arg6342_3 = Arg6342[3], Arg6342_4 = Arg6342[4], Arg6342_5 = Arg6342[5], Arg6342_6 = Arg6342[6], Arg6342_7 = Arg6342[7], Arg6342_8 = Arg6342[8], Arg6342_9 = Arg6342[9], Arg6342_10 = Arg6342[10];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6342_1, Shen.call(Shen.fns["shen.sigf"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg6342_0, Arg6342_3])]), Arg6342_3, [Shen.type_func, function shen_user_lambda6345(Arg6344) {
  if (Arg6344.length < 5) return [Shen.type_func, shen_user_lambda6345, 5, Arg6344];
  var Arg6344_0 = Arg6344[0], Arg6344_1 = Arg6344[1], Arg6344_2 = Arg6344[2], Arg6344_3 = Arg6344[3], Arg6344_4 = Arg6344[4];
  return (function() {
  return Shen.call_tail(Shen.fns["call"], [[Shen.type_cons, Arg6344_1, [Shen.type_cons, Arg6344_2, []]], Arg6344_3, Arg6344_4]);})}, 5, [Arg6342_0, Arg6342_1, Arg6342_2, Arg6342_3, Arg6342_4], undefined]]);})}, 11, [Arg6338_0, R1, Arg6338_1, Arg6338_3, Arg6338_4, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? ((Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["shen.base"], [Arg6338_0, Arg6338_1, Arg6338_3, Arg6338_4]))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? ((Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["shen.by_hypothesis"], [Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4]))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_0, Arg6338_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = R1[1]),
  (R1 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6338_3])),
  ((Shen.empty$question$(R1))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["shen.th*"], [R2, [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, Arg6338_1, []]], Arg6338_2, Arg6338_3, Arg6338_4])))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_0, Arg6338_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = R1[1]),
  (R1 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6338_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R3 = R1[1]),
  (R1 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6338_3])),
  ((Shen.empty$question$(R1))
  ? ((R1 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["shen.th*"], [R2, [Shen.type_cons, R1, [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, Arg6338_1, []]]], Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6347(Arg6346) {
  if (Arg6346.length < 13) return [Shen.type_func, shen_user_lambda6347, 13, Arg6346];
  var Arg6346_0 = Arg6346[0], Arg6346_1 = Arg6346[1], Arg6346_2 = Arg6346[2], Arg6346_3 = Arg6346[3], Arg6346_4 = Arg6346[4], Arg6346_5 = Arg6346[5], Arg6346_6 = Arg6346[6], Arg6346_7 = Arg6346[7], Arg6346_8 = Arg6346[8], Arg6346_9 = Arg6346[9], Arg6346_10 = Arg6346[10], Arg6346_11 = Arg6346[11], Arg6346_12 = Arg6346[12];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6346_2, Arg6346_3, Arg6346_4, Arg6346_5, Arg6346_6]);})}, 13, [R2, Arg6338_1, R3, R1, Arg6338_2, Arg6338_3, Arg6338_4, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]])))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_0, Arg6338_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cons"], R2)))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R1 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R3 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.empty$question$(R2))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_1, Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R4 = Shen.call(Shen.fns["shen.lazyderef"], [R2[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "list"], R4)))
  ? ((R4 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R4, Shen.type_cons))
  ? ((R2 = R4[1]),
  (R4 = Shen.call(Shen.fns["shen.lazyderef"], [R4[2], Arg6338_3])),
  ((Shen.empty$question$(R4))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["shen.th*"], [R1, R2, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6349(Arg6348) {
  if (Arg6348.length < 9) return [Shen.type_func, shen_user_lambda6349, 9, Arg6348];
  var Arg6348_0 = Arg6348[0], Arg6348_1 = Arg6348[1], Arg6348_2 = Arg6348[2], Arg6348_3 = Arg6348[3], Arg6348_4 = Arg6348[4], Arg6348_5 = Arg6348[5], Arg6348_6 = Arg6348[6], Arg6348_7 = Arg6348[7], Arg6348_8 = Arg6348[8];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6348_1, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Arg6348_2, []]], Arg6348_6, Arg6348_7, Arg6348_8]);})}, 9, [R1, R3, R2, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R4]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R4, [], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R3 = Shen.call(Shen.fns["shen.th*"], [R1, R2, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6351(Arg6350) {
  if (Arg6350.length < 10) return [Shen.type_func, shen_user_lambda6351, 10, Arg6350];
  var Arg6350_0 = Arg6350[0], Arg6350_1 = Arg6350[1], Arg6350_2 = Arg6350[2], Arg6350_3 = Arg6350[3], Arg6350_4 = Arg6350[4], Arg6350_5 = Arg6350[5], Arg6350_6 = Arg6350[6], Arg6350_7 = Arg6350[7], Arg6350_8 = Arg6350[8], Arg6350_9 = Arg6350[9];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6350_1, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Arg6350_2, []]], Arg6350_7, Arg6350_8, Arg6350_9]);})}, 10, [R1, R3, R2, R4, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R4, Arg6338_3]),
  (R1 = R3))
  : (R1 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R4]))
  ? ((R2 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.bindv"], [R4, [Shen.type_cons, R2, []], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R3 = Shen.call(Shen.fns["shen.th*"], [R1, R2, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6353(Arg6352) {
  if (Arg6352.length < 13) return [Shen.type_func, shen_user_lambda6353, 13, Arg6352];
  var Arg6352_0 = Arg6352[0], Arg6352_1 = Arg6352[1], Arg6352_2 = Arg6352[2], Arg6352_3 = Arg6352[3], Arg6352_4 = Arg6352[4], Arg6352_5 = Arg6352[5], Arg6352_6 = Arg6352[6], Arg6352_7 = Arg6352[7], Arg6352_8 = Arg6352[8], Arg6352_9 = Arg6352[9], Arg6352_10 = Arg6352[10], Arg6352_11 = Arg6352[11], Arg6352_12 = Arg6352[12];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6352_1, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Arg6352_2, []]], Arg6352_3, Arg6352_6, Arg6352_4]);})}, 13, [R1, R3, R2, Arg6338_2, Arg6338_4, R4, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R4, Arg6338_3]),
  (R1 = R3))
  : (R1 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R4]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R4, [Shen.type_symbol, "list"], Arg6338_3]),
  ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R5 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.empty$question$(R2))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R3 = Shen.call(Shen.fns["shen.th*"], [R1, R5, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6355(Arg6354) {
  if (Arg6354.length < 11) return [Shen.type_func, shen_user_lambda6355, 11, Arg6354];
  var Arg6354_0 = Arg6354[0], Arg6354_1 = Arg6354[1], Arg6354_2 = Arg6354[2], Arg6354_3 = Arg6354[3], Arg6354_4 = Arg6354[4], Arg6354_5 = Arg6354[5], Arg6354_6 = Arg6354[6], Arg6354_7 = Arg6354[7], Arg6354_8 = Arg6354[8], Arg6354_9 = Arg6354[9], Arg6354_10 = Arg6354[10];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6354_1, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Arg6354_2, []]], Arg6354_8, Arg6354_4, Arg6354_9]);})}, 11, [R1, R3, R5, R4, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R2, [], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["shen.th*"], [R1, R5, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6357(Arg6356) {
  if (Arg6356.length < 12) return [Shen.type_func, shen_user_lambda6357, 12, Arg6356];
  var Arg6356_0 = Arg6356[0], Arg6356_1 = Arg6356[1], Arg6356_2 = Arg6356[2], Arg6356_3 = Arg6356[3], Arg6356_4 = Arg6356[4], Arg6356_5 = Arg6356[5], Arg6356_6 = Arg6356[6], Arg6356_7 = Arg6356[7], Arg6356_8 = Arg6356[8], Arg6356_9 = Arg6356[9], Arg6356_10 = Arg6356[10], Arg6356_11 = Arg6356[11];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6356_1, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Arg6356_2, []]], Arg6356_9, Arg6356_5, Arg6356_10]);})}, 12, [R1, R3, R5, R2, R4, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6338_3]),
  (R3 = R5))
  : (R3 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? ((R5 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.bindv"], [R2, [Shen.type_cons, R5, []], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["shen.th*"], [R1, R5, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6359(Arg6358) {
  if (Arg6358.length < 15) return [Shen.type_func, shen_user_lambda6359, 15, Arg6358];
  var Arg6358_0 = Arg6358[0], Arg6358_1 = Arg6358[1], Arg6358_2 = Arg6358[2], Arg6358_3 = Arg6358[3], Arg6358_4 = Arg6358[4], Arg6358_5 = Arg6358[5], Arg6358_6 = Arg6358[6], Arg6358_7 = Arg6358[7], Arg6358_8 = Arg6358[8], Arg6358_9 = Arg6358[9], Arg6358_10 = Arg6358[10], Arg6358_11 = Arg6358[11], Arg6358_12 = Arg6358[12], Arg6358_13 = Arg6358[13], Arg6358_14 = Arg6358[14];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6358_1, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Arg6358_2, []]], Arg6358_3, Arg6358_6, Arg6358_4]);})}, 15, [R1, R3, R5, Arg6338_2, Arg6338_4, R2, Arg6338_3, R4, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6338_3]),
  (R3 = R5))
  : (R3 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R4, Arg6338_3]),
  (R1 = R3))
  : (R1 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? ((R4 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.bindv"], [R2, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, R4, []]], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["shen.th*"], [R1, R4, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6361(Arg6360) {
  if (Arg6360.length < 13) return [Shen.type_func, shen_user_lambda6361, 13, Arg6360];
  var Arg6360_0 = Arg6360[0], Arg6360_1 = Arg6360[1], Arg6360_2 = Arg6360[2], Arg6360_3 = Arg6360[3], Arg6360_4 = Arg6360[4], Arg6360_5 = Arg6360[5], Arg6360_6 = Arg6360[6], Arg6360_7 = Arg6360[7], Arg6360_8 = Arg6360[8], Arg6360_9 = Arg6360[9], Arg6360_10 = Arg6360[10], Arg6360_11 = Arg6360[11], Arg6360_12 = Arg6360[12];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6360_1, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Arg6360_2, []]], Arg6360_3, Arg6360_6, Arg6360_4]);})}, 13, [R1, R3, R4, Arg6338_2, Arg6338_4, R2, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6338_3]),
  (R1 = R4))
  : (R1 = false))))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_0, Arg6338_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "@p"], R2)))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R1 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R3 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.empty$question$(R2))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_1, Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R4 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R5 = Shen.call(Shen.fns["shen.lazyderef"], [R2[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "*"], R5)))
  ? ((R5 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R5, Shen.type_cons))
  ? ((R2 = R5[1]),
  (R5 = Shen.call(Shen.fns["shen.lazyderef"], [R5[2], Arg6338_3])),
  ((Shen.empty$question$(R5))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["shen.th*"], [R1, R4, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6363(Arg6362) {
  if (Arg6362.length < 10) return [Shen.type_func, shen_user_lambda6363, 10, Arg6362];
  var Arg6362_0 = Arg6362[0], Arg6362_1 = Arg6362[1], Arg6362_2 = Arg6362[2], Arg6362_3 = Arg6362[3], Arg6362_4 = Arg6362[4], Arg6362_5 = Arg6362[5], Arg6362_6 = Arg6362[6], Arg6362_7 = Arg6362[7], Arg6362_8 = Arg6362[8], Arg6362_9 = Arg6362[9];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6362_2, Arg6362_3, Arg6362_7, Arg6362_8, Arg6362_9]);})}, 10, [R1, R4, R3, R2, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R5]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R5, [], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["shen.th*"], [R1, R4, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6365(Arg6364) {
  if (Arg6364.length < 11) return [Shen.type_func, shen_user_lambda6365, 11, Arg6364];
  var Arg6364_0 = Arg6364[0], Arg6364_1 = Arg6364[1], Arg6364_2 = Arg6364[2], Arg6364_3 = Arg6364[3], Arg6364_4 = Arg6364[4], Arg6364_5 = Arg6364[5], Arg6364_6 = Arg6364[6], Arg6364_7 = Arg6364[7], Arg6364_8 = Arg6364[8], Arg6364_9 = Arg6364[9], Arg6364_10 = Arg6364[10];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6364_2, Arg6364_3, Arg6364_8, Arg6364_9, Arg6364_10]);})}, 11, [R1, R4, R3, R2, R5, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R5, Arg6338_3]),
  (R1 = R4))
  : (R1 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R5]))
  ? ((R2 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.bindv"], [R5, [Shen.type_cons, R2, []], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["shen.th*"], [R1, R4, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6367(Arg6366) {
  if (Arg6366.length < 14) return [Shen.type_func, shen_user_lambda6367, 14, Arg6366];
  var Arg6366_0 = Arg6366[0], Arg6366_1 = Arg6366[1], Arg6366_2 = Arg6366[2], Arg6366_3 = Arg6366[3], Arg6366_4 = Arg6366[4], Arg6366_5 = Arg6366[5], Arg6366_6 = Arg6366[6], Arg6366_7 = Arg6366[7], Arg6366_8 = Arg6366[8], Arg6366_9 = Arg6366[9], Arg6366_10 = Arg6366[10], Arg6366_11 = Arg6366[11], Arg6366_12 = Arg6366[12], Arg6366_13 = Arg6366[13];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6366_2, Arg6366_3, Arg6366_4, Arg6366_7, Arg6366_5]);})}, 14, [R1, R4, R3, R2, Arg6338_2, Arg6338_4, R5, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R5, Arg6338_3]),
  (R1 = R4))
  : (R1 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R5]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R5, [Shen.type_symbol, "*"], Arg6338_3]),
  ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R6 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.empty$question$(R2))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["shen.th*"], [R1, R4, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6369(Arg6368) {
  if (Arg6368.length < 12) return [Shen.type_func, shen_user_lambda6369, 12, Arg6368];
  var Arg6368_0 = Arg6368[0], Arg6368_1 = Arg6368[1], Arg6368_2 = Arg6368[2], Arg6368_3 = Arg6368[3], Arg6368_4 = Arg6368[4], Arg6368_5 = Arg6368[5], Arg6368_6 = Arg6368[6], Arg6368_7 = Arg6368[7], Arg6368_8 = Arg6368[8], Arg6368_9 = Arg6368[9], Arg6368_10 = Arg6368[10], Arg6368_11 = Arg6368[11];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6368_2, Arg6368_3, Arg6368_9, Arg6368_5, Arg6368_10]);})}, 12, [R1, R4, R3, R6, R5, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R2, [], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R6 = Shen.call(Shen.fns["shen.th*"], [R1, R4, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6371(Arg6370) {
  if (Arg6370.length < 13) return [Shen.type_func, shen_user_lambda6371, 13, Arg6370];
  var Arg6370_0 = Arg6370[0], Arg6370_1 = Arg6370[1], Arg6370_2 = Arg6370[2], Arg6370_3 = Arg6370[3], Arg6370_4 = Arg6370[4], Arg6370_5 = Arg6370[5], Arg6370_6 = Arg6370[6], Arg6370_7 = Arg6370[7], Arg6370_8 = Arg6370[8], Arg6370_9 = Arg6370[9], Arg6370_10 = Arg6370[10], Arg6370_11 = Arg6370[11], Arg6370_12 = Arg6370[12];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6370_2, Arg6370_3, Arg6370_10, Arg6370_6, Arg6370_11]);})}, 13, [R1, R4, R3, R6, R2, R5, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6338_3]),
  (R4 = R6))
  : (R4 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? ((R6 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.bindv"], [R2, [Shen.type_cons, R6, []], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R6 = Shen.call(Shen.fns["shen.th*"], [R1, R4, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6373(Arg6372) {
  if (Arg6372.length < 16) return [Shen.type_func, shen_user_lambda6373, 16, Arg6372];
  var Arg6372_0 = Arg6372[0], Arg6372_1 = Arg6372[1], Arg6372_2 = Arg6372[2], Arg6372_3 = Arg6372[3], Arg6372_4 = Arg6372[4], Arg6372_5 = Arg6372[5], Arg6372_6 = Arg6372[6], Arg6372_7 = Arg6372[7], Arg6372_8 = Arg6372[8], Arg6372_9 = Arg6372[9], Arg6372_10 = Arg6372[10], Arg6372_11 = Arg6372[11], Arg6372_12 = Arg6372[12], Arg6372_13 = Arg6372[13], Arg6372_14 = Arg6372[14], Arg6372_15 = Arg6372[15];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6372_2, Arg6372_3, Arg6372_4, Arg6372_7, Arg6372_5]);})}, 16, [R1, R4, R3, R6, Arg6338_2, Arg6338_4, R2, Arg6338_3, R5, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6338_3]),
  (R4 = R6))
  : (R4 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R5, Arg6338_3]),
  (R1 = R4))
  : (R1 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? ((R5 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.bindv"], [R2, [Shen.type_cons, [Shen.type_symbol, "*"], [Shen.type_cons, R5, []]], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["shen.th*"], [R1, R4, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6375(Arg6374) {
  if (Arg6374.length < 14) return [Shen.type_func, shen_user_lambda6375, 14, Arg6374];
  var Arg6374_0 = Arg6374[0], Arg6374_1 = Arg6374[1], Arg6374_2 = Arg6374[2], Arg6374_3 = Arg6374[3], Arg6374_4 = Arg6374[4], Arg6374_5 = Arg6374[5], Arg6374_6 = Arg6374[6], Arg6374_7 = Arg6374[7], Arg6374_8 = Arg6374[8], Arg6374_9 = Arg6374[9], Arg6374_10 = Arg6374[10], Arg6374_11 = Arg6374[11], Arg6374_12 = Arg6374[12], Arg6374_13 = Arg6374[13];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6374_2, Arg6374_3, Arg6374_4, Arg6374_7, Arg6374_5]);})}, 14, [R1, R4, R3, R5, Arg6338_2, Arg6338_4, R2, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6338_3]),
  (R1 = R5))
  : (R1 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? ((R4 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  (R5 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.bindv"], [R2, [Shen.type_cons, R4, [Shen.type_cons, [Shen.type_symbol, "*"], [Shen.type_cons, R5, []]]], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["shen.th*"], [R1, R4, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6377(Arg6376) {
  if (Arg6376.length < 14) return [Shen.type_func, shen_user_lambda6377, 14, Arg6376];
  var Arg6376_0 = Arg6376[0], Arg6376_1 = Arg6376[1], Arg6376_2 = Arg6376[2], Arg6376_3 = Arg6376[3], Arg6376_4 = Arg6376[4], Arg6376_5 = Arg6376[5], Arg6376_6 = Arg6376[6], Arg6376_7 = Arg6376[7], Arg6376_8 = Arg6376[8], Arg6376_9 = Arg6376[9], Arg6376_10 = Arg6376[10], Arg6376_11 = Arg6376[11], Arg6376_12 = Arg6376[12], Arg6376_13 = Arg6376[13];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6376_2, Arg6376_3, Arg6376_4, Arg6376_7, Arg6376_5]);})}, 14, [R1, R4, R3, R5, Arg6338_2, Arg6338_4, R2, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6338_3]),
  (R1 = R5))
  : (R1 = false))))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_0, Arg6338_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "@v"], R2)))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R1 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R3 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.empty$question$(R2))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_1, Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R4 = Shen.call(Shen.fns["shen.lazyderef"], [R2[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "vector"], R4)))
  ? ((R4 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R4, Shen.type_cons))
  ? ((R2 = R4[1]),
  (R4 = Shen.call(Shen.fns["shen.lazyderef"], [R4[2], Arg6338_3])),
  ((Shen.empty$question$(R4))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["shen.th*"], [R1, R2, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6379(Arg6378) {
  if (Arg6378.length < 9) return [Shen.type_func, shen_user_lambda6379, 9, Arg6378];
  var Arg6378_0 = Arg6378[0], Arg6378_1 = Arg6378[1], Arg6378_2 = Arg6378[2], Arg6378_3 = Arg6378[3], Arg6378_4 = Arg6378[4], Arg6378_5 = Arg6378[5], Arg6378_6 = Arg6378[6], Arg6378_7 = Arg6378[7], Arg6378_8 = Arg6378[8];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6378_1, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Arg6378_2, []]], Arg6378_6, Arg6378_7, Arg6378_8]);})}, 9, [R1, R3, R2, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R4]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R4, [], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R3 = Shen.call(Shen.fns["shen.th*"], [R1, R2, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6381(Arg6380) {
  if (Arg6380.length < 10) return [Shen.type_func, shen_user_lambda6381, 10, Arg6380];
  var Arg6380_0 = Arg6380[0], Arg6380_1 = Arg6380[1], Arg6380_2 = Arg6380[2], Arg6380_3 = Arg6380[3], Arg6380_4 = Arg6380[4], Arg6380_5 = Arg6380[5], Arg6380_6 = Arg6380[6], Arg6380_7 = Arg6380[7], Arg6380_8 = Arg6380[8], Arg6380_9 = Arg6380[9];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6380_1, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Arg6380_2, []]], Arg6380_7, Arg6380_8, Arg6380_9]);})}, 10, [R1, R3, R2, R4, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R4, Arg6338_3]),
  (R1 = R3))
  : (R1 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R4]))
  ? ((R2 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.bindv"], [R4, [Shen.type_cons, R2, []], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R3 = Shen.call(Shen.fns["shen.th*"], [R1, R2, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6383(Arg6382) {
  if (Arg6382.length < 13) return [Shen.type_func, shen_user_lambda6383, 13, Arg6382];
  var Arg6382_0 = Arg6382[0], Arg6382_1 = Arg6382[1], Arg6382_2 = Arg6382[2], Arg6382_3 = Arg6382[3], Arg6382_4 = Arg6382[4], Arg6382_5 = Arg6382[5], Arg6382_6 = Arg6382[6], Arg6382_7 = Arg6382[7], Arg6382_8 = Arg6382[8], Arg6382_9 = Arg6382[9], Arg6382_10 = Arg6382[10], Arg6382_11 = Arg6382[11], Arg6382_12 = Arg6382[12];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6382_1, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Arg6382_2, []]], Arg6382_3, Arg6382_6, Arg6382_4]);})}, 13, [R1, R3, R2, Arg6338_2, Arg6338_4, R4, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R4, Arg6338_3]),
  (R1 = R3))
  : (R1 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R4]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R4, [Shen.type_symbol, "vector"], Arg6338_3]),
  ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R5 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.empty$question$(R2))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R3 = Shen.call(Shen.fns["shen.th*"], [R1, R5, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6385(Arg6384) {
  if (Arg6384.length < 11) return [Shen.type_func, shen_user_lambda6385, 11, Arg6384];
  var Arg6384_0 = Arg6384[0], Arg6384_1 = Arg6384[1], Arg6384_2 = Arg6384[2], Arg6384_3 = Arg6384[3], Arg6384_4 = Arg6384[4], Arg6384_5 = Arg6384[5], Arg6384_6 = Arg6384[6], Arg6384_7 = Arg6384[7], Arg6384_8 = Arg6384[8], Arg6384_9 = Arg6384[9], Arg6384_10 = Arg6384[10];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6384_1, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Arg6384_2, []]], Arg6384_8, Arg6384_4, Arg6384_9]);})}, 11, [R1, R3, R5, R4, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R2, [], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["shen.th*"], [R1, R5, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6387(Arg6386) {
  if (Arg6386.length < 12) return [Shen.type_func, shen_user_lambda6387, 12, Arg6386];
  var Arg6386_0 = Arg6386[0], Arg6386_1 = Arg6386[1], Arg6386_2 = Arg6386[2], Arg6386_3 = Arg6386[3], Arg6386_4 = Arg6386[4], Arg6386_5 = Arg6386[5], Arg6386_6 = Arg6386[6], Arg6386_7 = Arg6386[7], Arg6386_8 = Arg6386[8], Arg6386_9 = Arg6386[9], Arg6386_10 = Arg6386[10], Arg6386_11 = Arg6386[11];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6386_1, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Arg6386_2, []]], Arg6386_9, Arg6386_5, Arg6386_10]);})}, 12, [R1, R3, R5, R2, R4, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6338_3]),
  (R3 = R5))
  : (R3 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? ((R5 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.bindv"], [R2, [Shen.type_cons, R5, []], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["shen.th*"], [R1, R5, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6389(Arg6388) {
  if (Arg6388.length < 15) return [Shen.type_func, shen_user_lambda6389, 15, Arg6388];
  var Arg6388_0 = Arg6388[0], Arg6388_1 = Arg6388[1], Arg6388_2 = Arg6388[2], Arg6388_3 = Arg6388[3], Arg6388_4 = Arg6388[4], Arg6388_5 = Arg6388[5], Arg6388_6 = Arg6388[6], Arg6388_7 = Arg6388[7], Arg6388_8 = Arg6388[8], Arg6388_9 = Arg6388[9], Arg6388_10 = Arg6388[10], Arg6388_11 = Arg6388[11], Arg6388_12 = Arg6388[12], Arg6388_13 = Arg6388[13], Arg6388_14 = Arg6388[14];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6388_1, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Arg6388_2, []]], Arg6388_3, Arg6388_6, Arg6388_4]);})}, 15, [R1, R3, R5, Arg6338_2, Arg6338_4, R2, Arg6338_3, R4, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6338_3]),
  (R3 = R5))
  : (R3 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R4, Arg6338_3]),
  (R1 = R3))
  : (R1 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? ((R4 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.bindv"], [R2, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, R4, []]], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["shen.th*"], [R1, R4, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6391(Arg6390) {
  if (Arg6390.length < 13) return [Shen.type_func, shen_user_lambda6391, 13, Arg6390];
  var Arg6390_0 = Arg6390[0], Arg6390_1 = Arg6390[1], Arg6390_2 = Arg6390[2], Arg6390_3 = Arg6390[3], Arg6390_4 = Arg6390[4], Arg6390_5 = Arg6390[5], Arg6390_6 = Arg6390[6], Arg6390_7 = Arg6390[7], Arg6390_8 = Arg6390[8], Arg6390_9 = Arg6390[9], Arg6390_10 = Arg6390[10], Arg6390_11 = Arg6390[11], Arg6390_12 = Arg6390[12];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6390_1, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Arg6390_2, []]], Arg6390_3, Arg6390_6, Arg6390_4]);})}, 13, [R1, R3, R4, Arg6338_2, Arg6338_4, R2, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6338_3]),
  (R1 = R4))
  : (R1 = false))))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_0, Arg6338_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "@s"], R2)))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R1 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R3 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.empty$question$(R2))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_1, Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "string"], R2)))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["shen.th*"], [R1, [Shen.type_symbol, "string"], Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6393(Arg6392) {
  if (Arg6392.length < 8) return [Shen.type_func, shen_user_lambda6393, 8, Arg6392];
  var Arg6392_0 = Arg6392[0], Arg6392_1 = Arg6392[1], Arg6392_2 = Arg6392[2], Arg6392_3 = Arg6392[3], Arg6392_4 = Arg6392[4], Arg6392_5 = Arg6392[5], Arg6392_6 = Arg6392[6], Arg6392_7 = Arg6392[7];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6392_1, [Shen.type_symbol, "string"], Arg6392_5, Arg6392_6, Arg6392_7]);})}, 8, [R1, R3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R2, [Shen.type_symbol, "string"], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R3 = Shen.call(Shen.fns["shen.th*"], [R1, [Shen.type_symbol, "string"], Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6395(Arg6394) {
  if (Arg6394.length < 9) return [Shen.type_func, shen_user_lambda6395, 9, Arg6394];
  var Arg6394_0 = Arg6394[0], Arg6394_1 = Arg6394[1], Arg6394_2 = Arg6394[2], Arg6394_3 = Arg6394[3], Arg6394_4 = Arg6394[4], Arg6394_5 = Arg6394[5], Arg6394_6 = Arg6394[6], Arg6394_7 = Arg6394[7], Arg6394_8 = Arg6394[8];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6394_1, [Shen.type_symbol, "string"], Arg6394_6, Arg6394_7, Arg6394_8]);})}, 9, [R1, R3, R2, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6338_3]),
  (R1 = R3))
  : (R1 = false))))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_0, Arg6338_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "lambda"], R2)))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R1 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R3 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.empty$question$(R2))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_1, Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R4 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R5 = Shen.call(Shen.fns["shen.lazyderef"], [R2[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "-->"], R5)))
  ? ((R5 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R5, Shen.type_cons))
  ? ((R2 = R5[1]),
  (R5 = Shen.call(Shen.fns["shen.lazyderef"], [R5[2], Arg6338_3])),
  ((Shen.empty$question$(R5))
  ? ((R5 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  (R6 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["cut"], [R0, Arg6338_3, [Shen.type_func, function shen_user_lambda6397(Arg6396) {
  if (Arg6396.length < 16) return [Shen.type_func, shen_user_lambda6397, 16, Arg6396];
  var Arg6396_0 = Arg6396[0], Arg6396_1 = Arg6396[1], Arg6396_2 = Arg6396[2], Arg6396_3 = Arg6396[3], Arg6396_4 = Arg6396[4], Arg6396_5 = Arg6396[5], Arg6396_6 = Arg6396[6], Arg6396_7 = Arg6396[7], Arg6396_8 = Arg6396[8], Arg6396_9 = Arg6396[9], Arg6396_10 = Arg6396[10], Arg6396_11 = Arg6396[11], Arg6396_12 = Arg6396[12], Arg6396_13 = Arg6396[13], Arg6396_14 = Arg6396[14], Arg6396_15 = Arg6396[15];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6396_5, Shen.call(Shen.fns["shen.placeholder"], []), Arg6396_8, [Shen.type_func, function shen_user_lambda6399(Arg6398) {
  if (Arg6398.length < 9) return [Shen.type_func, shen_user_lambda6399, 9, Arg6398];
  var Arg6398_0 = Arg6398[0], Arg6398_1 = Arg6398[1], Arg6398_2 = Arg6398[2], Arg6398_3 = Arg6398[3], Arg6398_4 = Arg6398[4], Arg6398_5 = Arg6398[5], Arg6398_6 = Arg6398[6], Arg6398_7 = Arg6398[7], Arg6398_8 = Arg6398[8];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6398_2, Shen.call(Shen.fns["shen.ebr"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg6398_4, Arg6398_7]), Shen.call(Shen.fns["shen.lazyderef"], [Arg6398_0, Arg6398_7]), Shen.call(Shen.fns["shen.lazyderef"], [Arg6398_1, Arg6398_7])]), Arg6398_7, [Shen.type_func, function shen_user_lambda6401(Arg6400) {
  if (Arg6400.length < 9) return [Shen.type_func, shen_user_lambda6401, 9, Arg6400];
  var Arg6400_0 = Arg6400[0], Arg6400_1 = Arg6400[1], Arg6400_2 = Arg6400[2], Arg6400_3 = Arg6400[3], Arg6400_4 = Arg6400[4], Arg6400_5 = Arg6400[5], Arg6400_6 = Arg6400[6], Arg6400_7 = Arg6400[7], Arg6400_8 = Arg6400[8];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6400_2, Arg6400_3, [Shen.type_cons, [Shen.type_cons, Arg6400_4, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Arg6400_5, []]]], Arg6400_6], Arg6400_7, Arg6400_8]);})}, 9, [Arg6398_0, Arg6398_1, Arg6398_2, Arg6398_3, Arg6398_4, Arg6398_5, Arg6398_6, Arg6398_7, Arg6398_8], undefined]]);})}, 9, [Arg6396_1, Arg6396_2, Arg6396_3, Arg6396_4, Arg6396_5, Arg6396_6, Arg6396_7, Arg6396_8, Arg6396_9], undefined]]);})}, 16, [R0, R1, R3, R5, R2, R6, R4, Arg6338_2, Arg6338_3, Arg6338_4, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R5]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R5, [], Arg6338_3]),
  ((R6 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  (R7 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["cut"], [R0, Arg6338_3, [Shen.type_func, function shen_user_lambda6403(Arg6402) {
  if (Arg6402.length < 18) return [Shen.type_func, shen_user_lambda6403, 18, Arg6402];
  var Arg6402_0 = Arg6402[0], Arg6402_1 = Arg6402[1], Arg6402_2 = Arg6402[2], Arg6402_3 = Arg6402[3], Arg6402_4 = Arg6402[4], Arg6402_5 = Arg6402[5], Arg6402_6 = Arg6402[6], Arg6402_7 = Arg6402[7], Arg6402_8 = Arg6402[8], Arg6402_9 = Arg6402[9], Arg6402_10 = Arg6402[10], Arg6402_11 = Arg6402[11], Arg6402_12 = Arg6402[12], Arg6402_13 = Arg6402[13], Arg6402_14 = Arg6402[14], Arg6402_15 = Arg6402[15], Arg6402_16 = Arg6402[16], Arg6402_17 = Arg6402[17];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6402_5, Shen.call(Shen.fns["shen.placeholder"], []), Arg6402_8, [Shen.type_func, function shen_user_lambda6405(Arg6404) {
  if (Arg6404.length < 9) return [Shen.type_func, shen_user_lambda6405, 9, Arg6404];
  var Arg6404_0 = Arg6404[0], Arg6404_1 = Arg6404[1], Arg6404_2 = Arg6404[2], Arg6404_3 = Arg6404[3], Arg6404_4 = Arg6404[4], Arg6404_5 = Arg6404[5], Arg6404_6 = Arg6404[6], Arg6404_7 = Arg6404[7], Arg6404_8 = Arg6404[8];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6404_2, Shen.call(Shen.fns["shen.ebr"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg6404_4, Arg6404_7]), Shen.call(Shen.fns["shen.lazyderef"], [Arg6404_0, Arg6404_7]), Shen.call(Shen.fns["shen.lazyderef"], [Arg6404_1, Arg6404_7])]), Arg6404_7, [Shen.type_func, function shen_user_lambda6407(Arg6406) {
  if (Arg6406.length < 9) return [Shen.type_func, shen_user_lambda6407, 9, Arg6406];
  var Arg6406_0 = Arg6406[0], Arg6406_1 = Arg6406[1], Arg6406_2 = Arg6406[2], Arg6406_3 = Arg6406[3], Arg6406_4 = Arg6406[4], Arg6406_5 = Arg6406[5], Arg6406_6 = Arg6406[6], Arg6406_7 = Arg6406[7], Arg6406_8 = Arg6406[8];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6406_2, Arg6406_3, [Shen.type_cons, [Shen.type_cons, Arg6406_4, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Arg6406_5, []]]], Arg6406_6], Arg6406_7, Arg6406_8]);})}, 9, [Arg6404_0, Arg6404_1, Arg6404_2, Arg6404_3, Arg6404_4, Arg6404_5, Arg6404_6, Arg6404_7, Arg6404_8], undefined]]);})}, 9, [Arg6402_1, Arg6402_2, Arg6402_3, Arg6402_4, Arg6402_5, Arg6402_6, Arg6402_7, Arg6402_8, Arg6402_9], undefined]]);})}, 18, [R0, R1, R3, R6, R2, R7, R4, Arg6338_2, Arg6338_3, Arg6338_4, R5, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R5, Arg6338_3]),
  (R1 = R4))
  : (R1 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R5]))
  ? ((R2 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.bindv"], [R5, [Shen.type_cons, R2, []], Arg6338_3]),
  ((R6 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  (R7 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["cut"], [R0, Arg6338_3, [Shen.type_func, function shen_user_lambda6409(Arg6408) {
  if (Arg6408.length < 18) return [Shen.type_func, shen_user_lambda6409, 18, Arg6408];
  var Arg6408_0 = Arg6408[0], Arg6408_1 = Arg6408[1], Arg6408_2 = Arg6408[2], Arg6408_3 = Arg6408[3], Arg6408_4 = Arg6408[4], Arg6408_5 = Arg6408[5], Arg6408_6 = Arg6408[6], Arg6408_7 = Arg6408[7], Arg6408_8 = Arg6408[8], Arg6408_9 = Arg6408[9], Arg6408_10 = Arg6408[10], Arg6408_11 = Arg6408[11], Arg6408_12 = Arg6408[12], Arg6408_13 = Arg6408[13], Arg6408_14 = Arg6408[14], Arg6408_15 = Arg6408[15], Arg6408_16 = Arg6408[16], Arg6408_17 = Arg6408[17];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6408_5, Shen.call(Shen.fns["shen.placeholder"], []), Arg6408_8, [Shen.type_func, function shen_user_lambda6411(Arg6410) {
  if (Arg6410.length < 9) return [Shen.type_func, shen_user_lambda6411, 9, Arg6410];
  var Arg6410_0 = Arg6410[0], Arg6410_1 = Arg6410[1], Arg6410_2 = Arg6410[2], Arg6410_3 = Arg6410[3], Arg6410_4 = Arg6410[4], Arg6410_5 = Arg6410[5], Arg6410_6 = Arg6410[6], Arg6410_7 = Arg6410[7], Arg6410_8 = Arg6410[8];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6410_2, Shen.call(Shen.fns["shen.ebr"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg6410_4, Arg6410_7]), Shen.call(Shen.fns["shen.lazyderef"], [Arg6410_0, Arg6410_7]), Shen.call(Shen.fns["shen.lazyderef"], [Arg6410_1, Arg6410_7])]), Arg6410_7, [Shen.type_func, function shen_user_lambda6413(Arg6412) {
  if (Arg6412.length < 9) return [Shen.type_func, shen_user_lambda6413, 9, Arg6412];
  var Arg6412_0 = Arg6412[0], Arg6412_1 = Arg6412[1], Arg6412_2 = Arg6412[2], Arg6412_3 = Arg6412[3], Arg6412_4 = Arg6412[4], Arg6412_5 = Arg6412[5], Arg6412_6 = Arg6412[6], Arg6412_7 = Arg6412[7], Arg6412_8 = Arg6412[8];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6412_2, Arg6412_3, [Shen.type_cons, [Shen.type_cons, Arg6412_4, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Arg6412_5, []]]], Arg6412_6], Arg6412_7, Arg6412_8]);})}, 9, [Arg6410_0, Arg6410_1, Arg6410_2, Arg6410_3, Arg6410_4, Arg6410_5, Arg6410_6, Arg6410_7, Arg6410_8], undefined]]);})}, 9, [Arg6408_1, Arg6408_2, Arg6408_3, Arg6408_4, Arg6408_5, Arg6408_6, Arg6408_7, Arg6408_8, Arg6408_9], undefined]]);})}, 18, [R0, R1, R3, R6, R2, R7, R4, Arg6338_2, Arg6338_3, Arg6338_4, R5, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R5, Arg6338_3]),
  (R1 = R4))
  : (R1 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R5]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R5, [Shen.type_symbol, "-->"], Arg6338_3]),
  ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R6 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.empty$question$(R2))
  ? ((R2 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  (R7 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["cut"], [R0, Arg6338_3, [Shen.type_func, function shen_user_lambda6415(Arg6414) {
  if (Arg6414.length < 18) return [Shen.type_func, shen_user_lambda6415, 18, Arg6414];
  var Arg6414_0 = Arg6414[0], Arg6414_1 = Arg6414[1], Arg6414_2 = Arg6414[2], Arg6414_3 = Arg6414[3], Arg6414_4 = Arg6414[4], Arg6414_5 = Arg6414[5], Arg6414_6 = Arg6414[6], Arg6414_7 = Arg6414[7], Arg6414_8 = Arg6414[8], Arg6414_9 = Arg6414[9], Arg6414_10 = Arg6414[10], Arg6414_11 = Arg6414[11], Arg6414_12 = Arg6414[12], Arg6414_13 = Arg6414[13], Arg6414_14 = Arg6414[14], Arg6414_15 = Arg6414[15], Arg6414_16 = Arg6414[16], Arg6414_17 = Arg6414[17];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6414_5, Shen.call(Shen.fns["shen.placeholder"], []), Arg6414_8, [Shen.type_func, function shen_user_lambda6417(Arg6416) {
  if (Arg6416.length < 9) return [Shen.type_func, shen_user_lambda6417, 9, Arg6416];
  var Arg6416_0 = Arg6416[0], Arg6416_1 = Arg6416[1], Arg6416_2 = Arg6416[2], Arg6416_3 = Arg6416[3], Arg6416_4 = Arg6416[4], Arg6416_5 = Arg6416[5], Arg6416_6 = Arg6416[6], Arg6416_7 = Arg6416[7], Arg6416_8 = Arg6416[8];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6416_2, Shen.call(Shen.fns["shen.ebr"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg6416_4, Arg6416_7]), Shen.call(Shen.fns["shen.lazyderef"], [Arg6416_0, Arg6416_7]), Shen.call(Shen.fns["shen.lazyderef"], [Arg6416_1, Arg6416_7])]), Arg6416_7, [Shen.type_func, function shen_user_lambda6419(Arg6418) {
  if (Arg6418.length < 9) return [Shen.type_func, shen_user_lambda6419, 9, Arg6418];
  var Arg6418_0 = Arg6418[0], Arg6418_1 = Arg6418[1], Arg6418_2 = Arg6418[2], Arg6418_3 = Arg6418[3], Arg6418_4 = Arg6418[4], Arg6418_5 = Arg6418[5], Arg6418_6 = Arg6418[6], Arg6418_7 = Arg6418[7], Arg6418_8 = Arg6418[8];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6418_2, Arg6418_3, [Shen.type_cons, [Shen.type_cons, Arg6418_4, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Arg6418_5, []]]], Arg6418_6], Arg6418_7, Arg6418_8]);})}, 9, [Arg6416_0, Arg6416_1, Arg6416_2, Arg6416_3, Arg6416_4, Arg6416_5, Arg6416_6, Arg6416_7, Arg6416_8], undefined]]);})}, 9, [Arg6414_1, Arg6414_2, Arg6414_3, Arg6414_4, Arg6414_5, Arg6414_6, Arg6414_7, Arg6414_8, Arg6414_9], undefined]]);})}, 18, [R0, R1, R3, R2, R6, R7, R4, Arg6338_2, Arg6338_3, Arg6338_4, R5, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R2, [], Arg6338_3]),
  ((R7 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  (R8 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R6 = Shen.call(Shen.fns["cut"], [R0, Arg6338_3, [Shen.type_func, function shen_user_lambda6421(Arg6420) {
  if (Arg6420.length < 20) return [Shen.type_func, shen_user_lambda6421, 20, Arg6420];
  var Arg6420_0 = Arg6420[0], Arg6420_1 = Arg6420[1], Arg6420_2 = Arg6420[2], Arg6420_3 = Arg6420[3], Arg6420_4 = Arg6420[4], Arg6420_5 = Arg6420[5], Arg6420_6 = Arg6420[6], Arg6420_7 = Arg6420[7], Arg6420_8 = Arg6420[8], Arg6420_9 = Arg6420[9], Arg6420_10 = Arg6420[10], Arg6420_11 = Arg6420[11], Arg6420_12 = Arg6420[12], Arg6420_13 = Arg6420[13], Arg6420_14 = Arg6420[14], Arg6420_15 = Arg6420[15], Arg6420_16 = Arg6420[16], Arg6420_17 = Arg6420[17], Arg6420_18 = Arg6420[18], Arg6420_19 = Arg6420[19];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6420_5, Shen.call(Shen.fns["shen.placeholder"], []), Arg6420_8, [Shen.type_func, function shen_user_lambda6423(Arg6422) {
  if (Arg6422.length < 9) return [Shen.type_func, shen_user_lambda6423, 9, Arg6422];
  var Arg6422_0 = Arg6422[0], Arg6422_1 = Arg6422[1], Arg6422_2 = Arg6422[2], Arg6422_3 = Arg6422[3], Arg6422_4 = Arg6422[4], Arg6422_5 = Arg6422[5], Arg6422_6 = Arg6422[6], Arg6422_7 = Arg6422[7], Arg6422_8 = Arg6422[8];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6422_2, Shen.call(Shen.fns["shen.ebr"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg6422_4, Arg6422_7]), Shen.call(Shen.fns["shen.lazyderef"], [Arg6422_0, Arg6422_7]), Shen.call(Shen.fns["shen.lazyderef"], [Arg6422_1, Arg6422_7])]), Arg6422_7, [Shen.type_func, function shen_user_lambda6425(Arg6424) {
  if (Arg6424.length < 9) return [Shen.type_func, shen_user_lambda6425, 9, Arg6424];
  var Arg6424_0 = Arg6424[0], Arg6424_1 = Arg6424[1], Arg6424_2 = Arg6424[2], Arg6424_3 = Arg6424[3], Arg6424_4 = Arg6424[4], Arg6424_5 = Arg6424[5], Arg6424_6 = Arg6424[6], Arg6424_7 = Arg6424[7], Arg6424_8 = Arg6424[8];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6424_2, Arg6424_3, [Shen.type_cons, [Shen.type_cons, Arg6424_4, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Arg6424_5, []]]], Arg6424_6], Arg6424_7, Arg6424_8]);})}, 9, [Arg6422_0, Arg6422_1, Arg6422_2, Arg6422_3, Arg6422_4, Arg6422_5, Arg6422_6, Arg6422_7, Arg6422_8], undefined]]);})}, 9, [Arg6420_1, Arg6420_2, Arg6420_3, Arg6420_4, Arg6420_5, Arg6420_6, Arg6420_7, Arg6420_8, Arg6420_9], undefined]]);})}, 20, [R0, R1, R3, R7, R6, R8, R4, Arg6338_2, Arg6338_3, Arg6338_4, R2, Arg6338_3, R5, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6338_3]),
  (R4 = R6))
  : (R4 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? ((R6 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.bindv"], [R2, [Shen.type_cons, R6, []], Arg6338_3]),
  ((R7 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  (R8 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R6 = Shen.call(Shen.fns["cut"], [R0, Arg6338_3, [Shen.type_func, function shen_user_lambda6427(Arg6426) {
  if (Arg6426.length < 20) return [Shen.type_func, shen_user_lambda6427, 20, Arg6426];
  var Arg6426_0 = Arg6426[0], Arg6426_1 = Arg6426[1], Arg6426_2 = Arg6426[2], Arg6426_3 = Arg6426[3], Arg6426_4 = Arg6426[4], Arg6426_5 = Arg6426[5], Arg6426_6 = Arg6426[6], Arg6426_7 = Arg6426[7], Arg6426_8 = Arg6426[8], Arg6426_9 = Arg6426[9], Arg6426_10 = Arg6426[10], Arg6426_11 = Arg6426[11], Arg6426_12 = Arg6426[12], Arg6426_13 = Arg6426[13], Arg6426_14 = Arg6426[14], Arg6426_15 = Arg6426[15], Arg6426_16 = Arg6426[16], Arg6426_17 = Arg6426[17], Arg6426_18 = Arg6426[18], Arg6426_19 = Arg6426[19];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6426_5, Shen.call(Shen.fns["shen.placeholder"], []), Arg6426_8, [Shen.type_func, function shen_user_lambda6429(Arg6428) {
  if (Arg6428.length < 9) return [Shen.type_func, shen_user_lambda6429, 9, Arg6428];
  var Arg6428_0 = Arg6428[0], Arg6428_1 = Arg6428[1], Arg6428_2 = Arg6428[2], Arg6428_3 = Arg6428[3], Arg6428_4 = Arg6428[4], Arg6428_5 = Arg6428[5], Arg6428_6 = Arg6428[6], Arg6428_7 = Arg6428[7], Arg6428_8 = Arg6428[8];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6428_2, Shen.call(Shen.fns["shen.ebr"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg6428_4, Arg6428_7]), Shen.call(Shen.fns["shen.lazyderef"], [Arg6428_0, Arg6428_7]), Shen.call(Shen.fns["shen.lazyderef"], [Arg6428_1, Arg6428_7])]), Arg6428_7, [Shen.type_func, function shen_user_lambda6431(Arg6430) {
  if (Arg6430.length < 9) return [Shen.type_func, shen_user_lambda6431, 9, Arg6430];
  var Arg6430_0 = Arg6430[0], Arg6430_1 = Arg6430[1], Arg6430_2 = Arg6430[2], Arg6430_3 = Arg6430[3], Arg6430_4 = Arg6430[4], Arg6430_5 = Arg6430[5], Arg6430_6 = Arg6430[6], Arg6430_7 = Arg6430[7], Arg6430_8 = Arg6430[8];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6430_2, Arg6430_3, [Shen.type_cons, [Shen.type_cons, Arg6430_4, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Arg6430_5, []]]], Arg6430_6], Arg6430_7, Arg6430_8]);})}, 9, [Arg6428_0, Arg6428_1, Arg6428_2, Arg6428_3, Arg6428_4, Arg6428_5, Arg6428_6, Arg6428_7, Arg6428_8], undefined]]);})}, 9, [Arg6426_1, Arg6426_2, Arg6426_3, Arg6426_4, Arg6426_5, Arg6426_6, Arg6426_7, Arg6426_8, Arg6426_9], undefined]]);})}, 20, [R0, R1, R3, R7, R6, R8, R4, Arg6338_2, Arg6338_3, Arg6338_4, R2, Arg6338_3, R5, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6338_3]),
  (R4 = R6))
  : (R4 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R5, Arg6338_3]),
  (R1 = R4))
  : (R1 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? ((R5 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.bindv"], [R2, [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, R5, []]], Arg6338_3]),
  ((R6 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  (R7 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["cut"], [R0, Arg6338_3, [Shen.type_func, function shen_user_lambda6433(Arg6432) {
  if (Arg6432.length < 18) return [Shen.type_func, shen_user_lambda6433, 18, Arg6432];
  var Arg6432_0 = Arg6432[0], Arg6432_1 = Arg6432[1], Arg6432_2 = Arg6432[2], Arg6432_3 = Arg6432[3], Arg6432_4 = Arg6432[4], Arg6432_5 = Arg6432[5], Arg6432_6 = Arg6432[6], Arg6432_7 = Arg6432[7], Arg6432_8 = Arg6432[8], Arg6432_9 = Arg6432[9], Arg6432_10 = Arg6432[10], Arg6432_11 = Arg6432[11], Arg6432_12 = Arg6432[12], Arg6432_13 = Arg6432[13], Arg6432_14 = Arg6432[14], Arg6432_15 = Arg6432[15], Arg6432_16 = Arg6432[16], Arg6432_17 = Arg6432[17];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6432_5, Shen.call(Shen.fns["shen.placeholder"], []), Arg6432_8, [Shen.type_func, function shen_user_lambda6435(Arg6434) {
  if (Arg6434.length < 9) return [Shen.type_func, shen_user_lambda6435, 9, Arg6434];
  var Arg6434_0 = Arg6434[0], Arg6434_1 = Arg6434[1], Arg6434_2 = Arg6434[2], Arg6434_3 = Arg6434[3], Arg6434_4 = Arg6434[4], Arg6434_5 = Arg6434[5], Arg6434_6 = Arg6434[6], Arg6434_7 = Arg6434[7], Arg6434_8 = Arg6434[8];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6434_2, Shen.call(Shen.fns["shen.ebr"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg6434_4, Arg6434_7]), Shen.call(Shen.fns["shen.lazyderef"], [Arg6434_0, Arg6434_7]), Shen.call(Shen.fns["shen.lazyderef"], [Arg6434_1, Arg6434_7])]), Arg6434_7, [Shen.type_func, function shen_user_lambda6437(Arg6436) {
  if (Arg6436.length < 9) return [Shen.type_func, shen_user_lambda6437, 9, Arg6436];
  var Arg6436_0 = Arg6436[0], Arg6436_1 = Arg6436[1], Arg6436_2 = Arg6436[2], Arg6436_3 = Arg6436[3], Arg6436_4 = Arg6436[4], Arg6436_5 = Arg6436[5], Arg6436_6 = Arg6436[6], Arg6436_7 = Arg6436[7], Arg6436_8 = Arg6436[8];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6436_2, Arg6436_3, [Shen.type_cons, [Shen.type_cons, Arg6436_4, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Arg6436_5, []]]], Arg6436_6], Arg6436_7, Arg6436_8]);})}, 9, [Arg6434_0, Arg6434_1, Arg6434_2, Arg6434_3, Arg6434_4, Arg6434_5, Arg6434_6, Arg6434_7, Arg6434_8], undefined]]);})}, 9, [Arg6432_1, Arg6432_2, Arg6432_3, Arg6432_4, Arg6432_5, Arg6432_6, Arg6432_7, Arg6432_8, Arg6432_9], undefined]]);})}, 18, [R0, R1, R3, R6, R5, R7, R4, Arg6338_2, Arg6338_3, Arg6338_4, R2, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6338_3]),
  (R1 = R5))
  : (R1 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? ((R4 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  (R5 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.bindv"], [R2, [Shen.type_cons, R4, [Shen.type_cons, [Shen.type_symbol, "-->"], [Shen.type_cons, R5, []]]], Arg6338_3]),
  ((R6 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  (R7 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["cut"], [R0, Arg6338_3, [Shen.type_func, function shen_user_lambda6439(Arg6438) {
  if (Arg6438.length < 18) return [Shen.type_func, shen_user_lambda6439, 18, Arg6438];
  var Arg6438_0 = Arg6438[0], Arg6438_1 = Arg6438[1], Arg6438_2 = Arg6438[2], Arg6438_3 = Arg6438[3], Arg6438_4 = Arg6438[4], Arg6438_5 = Arg6438[5], Arg6438_6 = Arg6438[6], Arg6438_7 = Arg6438[7], Arg6438_8 = Arg6438[8], Arg6438_9 = Arg6438[9], Arg6438_10 = Arg6438[10], Arg6438_11 = Arg6438[11], Arg6438_12 = Arg6438[12], Arg6438_13 = Arg6438[13], Arg6438_14 = Arg6438[14], Arg6438_15 = Arg6438[15], Arg6438_16 = Arg6438[16], Arg6438_17 = Arg6438[17];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6438_5, Shen.call(Shen.fns["shen.placeholder"], []), Arg6438_8, [Shen.type_func, function shen_user_lambda6441(Arg6440) {
  if (Arg6440.length < 9) return [Shen.type_func, shen_user_lambda6441, 9, Arg6440];
  var Arg6440_0 = Arg6440[0], Arg6440_1 = Arg6440[1], Arg6440_2 = Arg6440[2], Arg6440_3 = Arg6440[3], Arg6440_4 = Arg6440[4], Arg6440_5 = Arg6440[5], Arg6440_6 = Arg6440[6], Arg6440_7 = Arg6440[7], Arg6440_8 = Arg6440[8];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6440_2, Shen.call(Shen.fns["shen.ebr"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg6440_4, Arg6440_7]), Shen.call(Shen.fns["shen.lazyderef"], [Arg6440_0, Arg6440_7]), Shen.call(Shen.fns["shen.lazyderef"], [Arg6440_1, Arg6440_7])]), Arg6440_7, [Shen.type_func, function shen_user_lambda6443(Arg6442) {
  if (Arg6442.length < 9) return [Shen.type_func, shen_user_lambda6443, 9, Arg6442];
  var Arg6442_0 = Arg6442[0], Arg6442_1 = Arg6442[1], Arg6442_2 = Arg6442[2], Arg6442_3 = Arg6442[3], Arg6442_4 = Arg6442[4], Arg6442_5 = Arg6442[5], Arg6442_6 = Arg6442[6], Arg6442_7 = Arg6442[7], Arg6442_8 = Arg6442[8];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6442_2, Arg6442_3, [Shen.type_cons, [Shen.type_cons, Arg6442_4, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Arg6442_5, []]]], Arg6442_6], Arg6442_7, Arg6442_8]);})}, 9, [Arg6440_0, Arg6440_1, Arg6440_2, Arg6440_3, Arg6440_4, Arg6440_5, Arg6440_6, Arg6440_7, Arg6440_8], undefined]]);})}, 9, [Arg6438_1, Arg6438_2, Arg6438_3, Arg6438_4, Arg6438_5, Arg6438_6, Arg6438_7, Arg6438_8, Arg6438_9], undefined]]);})}, 18, [R0, R1, R3, R6, R5, R7, R4, Arg6338_2, Arg6338_3, Arg6338_4, R2, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6338_3]),
  (R1 = R5))
  : (R1 = false))))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_0, Arg6338_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "let"], R2)))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R1 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R3 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R4 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.empty$question$(R2))
  ? ((R2 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  (R5 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  (R6 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["shen.th*"], [R3, R6, Arg6338_2, Arg6338_3, [Shen.type_func, function shen_user_lambda6445(Arg6444) {
  if (Arg6444.length < 16) return [Shen.type_func, shen_user_lambda6445, 16, Arg6444];
  var Arg6444_0 = Arg6444[0], Arg6444_1 = Arg6444[1], Arg6444_2 = Arg6444[2], Arg6444_3 = Arg6444[3], Arg6444_4 = Arg6444[4], Arg6444_5 = Arg6444[5], Arg6444_6 = Arg6444[6], Arg6444_7 = Arg6444[7], Arg6444_8 = Arg6444[8], Arg6444_9 = Arg6444[9], Arg6444_10 = Arg6444[10], Arg6444_11 = Arg6444[11], Arg6444_12 = Arg6444[12], Arg6444_13 = Arg6444[13], Arg6444_14 = Arg6444[14], Arg6444_15 = Arg6444[15];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6444_5, Shen.call(Shen.fns["shen.placeholder"], []), Arg6444_8, [Shen.type_func, function shen_user_lambda6447(Arg6446) {
  if (Arg6446.length < 9) return [Shen.type_func, shen_user_lambda6447, 9, Arg6446];
  var Arg6446_0 = Arg6446[0], Arg6446_1 = Arg6446[1], Arg6446_2 = Arg6446[2], Arg6446_3 = Arg6446[3], Arg6446_4 = Arg6446[4], Arg6446_5 = Arg6446[5], Arg6446_6 = Arg6446[6], Arg6446_7 = Arg6446[7], Arg6446_8 = Arg6446[8];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6446_2, Shen.call(Shen.fns["shen.ebr"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg6446_4, Arg6446_7]), Shen.call(Shen.fns["shen.lazyderef"], [Arg6446_0, Arg6446_7]), Shen.call(Shen.fns["shen.lazyderef"], [Arg6446_1, Arg6446_7])]), Arg6446_7, [Shen.type_func, function shen_user_lambda6449(Arg6448) {
  if (Arg6448.length < 9) return [Shen.type_func, shen_user_lambda6449, 9, Arg6448];
  var Arg6448_0 = Arg6448[0], Arg6448_1 = Arg6448[1], Arg6448_2 = Arg6448[2], Arg6448_3 = Arg6448[3], Arg6448_4 = Arg6448[4], Arg6448_5 = Arg6448[5], Arg6448_6 = Arg6448[6], Arg6448_7 = Arg6448[7], Arg6448_8 = Arg6448[8];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6448_2, Arg6448_3, [Shen.type_cons, [Shen.type_cons, Arg6448_4, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Arg6448_5, []]]], Arg6448_6], Arg6448_7, Arg6448_8]);})}, 9, [Arg6446_0, Arg6446_1, Arg6446_2, Arg6446_3, Arg6446_4, Arg6446_5, Arg6446_6, Arg6446_7, Arg6446_8], undefined]]);})}, 9, [Arg6444_1, Arg6444_2, Arg6444_3, Arg6444_4, Arg6444_5, Arg6444_6, Arg6444_7, Arg6444_8, Arg6444_9], undefined]]);})}, 16, [R3, R1, R4, R2, Arg6338_1, R5, R6, Arg6338_2, Arg6338_3, Arg6338_4, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]])))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_0, Arg6338_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "open"], R2)))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R1 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R3 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.empty$question$(R2))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_1, Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R4 = Shen.call(Shen.fns["shen.lazyderef"], [R2[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "stream"], R4)))
  ? ((R4 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R4, Shen.type_cons))
  ? ((R2 = R4[1]),
  (R4 = Shen.call(Shen.fns["shen.lazyderef"], [R4[2], Arg6338_3])),
  ((Shen.empty$question$(R4))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["unify!"], [R2, R3, Arg6338_3, [Shen.type_func, function shen_user_lambda6451(Arg6450) {
  if (Arg6450.length < 9) return [Shen.type_func, shen_user_lambda6451, 9, Arg6450];
  var Arg6450_0 = Arg6450[0], Arg6450_1 = Arg6450[1], Arg6450_2 = Arg6450[2], Arg6450_3 = Arg6450[3], Arg6450_4 = Arg6450[4], Arg6450_5 = Arg6450[5], Arg6450_6 = Arg6450[6], Arg6450_7 = Arg6450[7], Arg6450_8 = Arg6450[8];
  return (function() {
  return Shen.call_tail(Shen.fns["cut"], [Arg6450_3, Arg6450_7, [Shen.type_func, function shen_user_lambda6453(Arg6452) {
  if (Arg6452.length < 5) return [Shen.type_func, shen_user_lambda6453, 5, Arg6452];
  var Arg6452_0 = Arg6452[0], Arg6452_1 = Arg6452[1], Arg6452_2 = Arg6452[2], Arg6452_3 = Arg6452[3], Arg6452_4 = Arg6452[4];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6452_1, [Shen.type_symbol, "string"], Arg6452_2, Arg6452_3, Arg6452_4]);})}, 5, [Arg6450_3, Arg6450_2, Arg6450_6, Arg6450_7, Arg6450_8], undefined]]);})}, 9, [R2, R3, R1, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R4]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R4, [], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R3 = Shen.call(Shen.fns["unify!"], [R2, R3, Arg6338_3, [Shen.type_func, function shen_user_lambda6455(Arg6454) {
  if (Arg6454.length < 10) return [Shen.type_func, shen_user_lambda6455, 10, Arg6454];
  var Arg6454_0 = Arg6454[0], Arg6454_1 = Arg6454[1], Arg6454_2 = Arg6454[2], Arg6454_3 = Arg6454[3], Arg6454_4 = Arg6454[4], Arg6454_5 = Arg6454[5], Arg6454_6 = Arg6454[6], Arg6454_7 = Arg6454[7], Arg6454_8 = Arg6454[8], Arg6454_9 = Arg6454[9];
  return (function() {
  return Shen.call_tail(Shen.fns["cut"], [Arg6454_4, Arg6454_8, [Shen.type_func, function shen_user_lambda6457(Arg6456) {
  if (Arg6456.length < 5) return [Shen.type_func, shen_user_lambda6457, 5, Arg6456];
  var Arg6456_0 = Arg6456[0], Arg6456_1 = Arg6456[1], Arg6456_2 = Arg6456[2], Arg6456_3 = Arg6456[3], Arg6456_4 = Arg6456[4];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6456_1, [Shen.type_symbol, "string"], Arg6456_2, Arg6456_3, Arg6456_4]);})}, 5, [Arg6454_4, Arg6454_2, Arg6454_7, Arg6454_8, Arg6454_9], undefined]]);})}, 10, [R2, R3, R1, R4, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R4, Arg6338_3]),
  (R1 = R3))
  : (R1 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R4]))
  ? ((R2 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.bindv"], [R4, [Shen.type_cons, R2, []], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R3 = Shen.call(Shen.fns["unify!"], [R2, R3, Arg6338_3, [Shen.type_func, function shen_user_lambda6459(Arg6458) {
  if (Arg6458.length < 14) return [Shen.type_func, shen_user_lambda6459, 14, Arg6458];
  var Arg6458_0 = Arg6458[0], Arg6458_1 = Arg6458[1], Arg6458_2 = Arg6458[2], Arg6458_3 = Arg6458[3], Arg6458_4 = Arg6458[4], Arg6458_5 = Arg6458[5], Arg6458_6 = Arg6458[6], Arg6458_7 = Arg6458[7], Arg6458_8 = Arg6458[8], Arg6458_9 = Arg6458[9], Arg6458_10 = Arg6458[10], Arg6458_11 = Arg6458[11], Arg6458_12 = Arg6458[12], Arg6458_13 = Arg6458[13];
  return (function() {
  return Shen.call_tail(Shen.fns["cut"], [Arg6458_2, Arg6458_7, [Shen.type_func, function shen_user_lambda6461(Arg6460) {
  if (Arg6460.length < 5) return [Shen.type_func, shen_user_lambda6461, 5, Arg6460];
  var Arg6460_0 = Arg6460[0], Arg6460_1 = Arg6460[1], Arg6460_2 = Arg6460[2], Arg6460_3 = Arg6460[3], Arg6460_4 = Arg6460[4];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6460_1, [Shen.type_symbol, "string"], Arg6460_2, Arg6460_3, Arg6460_4]);})}, 5, [Arg6458_2, Arg6458_3, Arg6458_4, Arg6458_7, Arg6458_5], undefined]]);})}, 14, [R2, R3, R0, R1, Arg6338_2, Arg6338_4, R4, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R4, Arg6338_3]),
  (R1 = R3))
  : (R1 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R4]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R4, [Shen.type_symbol, "stream"], Arg6338_3]),
  ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R5 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.empty$question$(R2))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R3 = Shen.call(Shen.fns["unify!"], [R5, R3, Arg6338_3, [Shen.type_func, function shen_user_lambda6463(Arg6462) {
  if (Arg6462.length < 11) return [Shen.type_func, shen_user_lambda6463, 11, Arg6462];
  var Arg6462_0 = Arg6462[0], Arg6462_1 = Arg6462[1], Arg6462_2 = Arg6462[2], Arg6462_3 = Arg6462[3], Arg6462_4 = Arg6462[4], Arg6462_5 = Arg6462[5], Arg6462_6 = Arg6462[6], Arg6462_7 = Arg6462[7], Arg6462_8 = Arg6462[8], Arg6462_9 = Arg6462[9], Arg6462_10 = Arg6462[10];
  return (function() {
  return Shen.call_tail(Shen.fns["cut"], [Arg6462_5, Arg6462_4, [Shen.type_func, function shen_user_lambda6465(Arg6464) {
  if (Arg6464.length < 5) return [Shen.type_func, shen_user_lambda6465, 5, Arg6464];
  var Arg6464_0 = Arg6464[0], Arg6464_1 = Arg6464[1], Arg6464_2 = Arg6464[2], Arg6464_3 = Arg6464[3], Arg6464_4 = Arg6464[4];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6464_1, [Shen.type_symbol, "string"], Arg6464_2, Arg6464_3, Arg6464_4]);})}, 5, [Arg6462_5, Arg6462_2, Arg6462_8, Arg6462_4, Arg6462_9], undefined]]);})}, 11, [R5, R3, R1, R4, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R2, [], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["unify!"], [R5, R3, Arg6338_3, [Shen.type_func, function shen_user_lambda6467(Arg6466) {
  if (Arg6466.length < 12) return [Shen.type_func, shen_user_lambda6467, 12, Arg6466];
  var Arg6466_0 = Arg6466[0], Arg6466_1 = Arg6466[1], Arg6466_2 = Arg6466[2], Arg6466_3 = Arg6466[3], Arg6466_4 = Arg6466[4], Arg6466_5 = Arg6466[5], Arg6466_6 = Arg6466[6], Arg6466_7 = Arg6466[7], Arg6466_8 = Arg6466[8], Arg6466_9 = Arg6466[9], Arg6466_10 = Arg6466[10], Arg6466_11 = Arg6466[11];
  return (function() {
  return Shen.call_tail(Shen.fns["cut"], [Arg6466_6, Arg6466_5, [Shen.type_func, function shen_user_lambda6469(Arg6468) {
  if (Arg6468.length < 5) return [Shen.type_func, shen_user_lambda6469, 5, Arg6468];
  var Arg6468_0 = Arg6468[0], Arg6468_1 = Arg6468[1], Arg6468_2 = Arg6468[2], Arg6468_3 = Arg6468[3], Arg6468_4 = Arg6468[4];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6468_1, [Shen.type_symbol, "string"], Arg6468_2, Arg6468_3, Arg6468_4]);})}, 5, [Arg6466_6, Arg6466_2, Arg6466_9, Arg6466_5, Arg6466_10], undefined]]);})}, 12, [R5, R3, R1, R2, R4, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6338_3]),
  (R3 = R5))
  : (R3 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? ((R5 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.bindv"], [R2, [Shen.type_cons, R5, []], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["unify!"], [R5, R3, Arg6338_3, [Shen.type_func, function shen_user_lambda6471(Arg6470) {
  if (Arg6470.length < 16) return [Shen.type_func, shen_user_lambda6471, 16, Arg6470];
  var Arg6470_0 = Arg6470[0], Arg6470_1 = Arg6470[1], Arg6470_2 = Arg6470[2], Arg6470_3 = Arg6470[3], Arg6470_4 = Arg6470[4], Arg6470_5 = Arg6470[5], Arg6470_6 = Arg6470[6], Arg6470_7 = Arg6470[7], Arg6470_8 = Arg6470[8], Arg6470_9 = Arg6470[9], Arg6470_10 = Arg6470[10], Arg6470_11 = Arg6470[11], Arg6470_12 = Arg6470[12], Arg6470_13 = Arg6470[13], Arg6470_14 = Arg6470[14], Arg6470_15 = Arg6470[15];
  return (function() {
  return Shen.call_tail(Shen.fns["cut"], [Arg6470_2, Arg6470_7, [Shen.type_func, function shen_user_lambda6473(Arg6472) {
  if (Arg6472.length < 5) return [Shen.type_func, shen_user_lambda6473, 5, Arg6472];
  var Arg6472_0 = Arg6472[0], Arg6472_1 = Arg6472[1], Arg6472_2 = Arg6472[2], Arg6472_3 = Arg6472[3], Arg6472_4 = Arg6472[4];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6472_1, [Shen.type_symbol, "string"], Arg6472_2, Arg6472_3, Arg6472_4]);})}, 5, [Arg6470_2, Arg6470_3, Arg6470_4, Arg6470_7, Arg6470_5], undefined]]);})}, 16, [R5, R3, R0, R1, Arg6338_2, Arg6338_4, R2, Arg6338_3, R4, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6338_3]),
  (R3 = R5))
  : (R3 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R4, Arg6338_3]),
  (R1 = R3))
  : (R1 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? ((R4 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.bindv"], [R2, [Shen.type_cons, [Shen.type_symbol, "stream"], [Shen.type_cons, R4, []]], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["unify!"], [R4, R3, Arg6338_3, [Shen.type_func, function shen_user_lambda6475(Arg6474) {
  if (Arg6474.length < 14) return [Shen.type_func, shen_user_lambda6475, 14, Arg6474];
  var Arg6474_0 = Arg6474[0], Arg6474_1 = Arg6474[1], Arg6474_2 = Arg6474[2], Arg6474_3 = Arg6474[3], Arg6474_4 = Arg6474[4], Arg6474_5 = Arg6474[5], Arg6474_6 = Arg6474[6], Arg6474_7 = Arg6474[7], Arg6474_8 = Arg6474[8], Arg6474_9 = Arg6474[9], Arg6474_10 = Arg6474[10], Arg6474_11 = Arg6474[11], Arg6474_12 = Arg6474[12], Arg6474_13 = Arg6474[13];
  return (function() {
  return Shen.call_tail(Shen.fns["cut"], [Arg6474_2, Arg6474_7, [Shen.type_func, function shen_user_lambda6477(Arg6476) {
  if (Arg6476.length < 5) return [Shen.type_func, shen_user_lambda6477, 5, Arg6476];
  var Arg6476_0 = Arg6476[0], Arg6476_1 = Arg6476[1], Arg6476_2 = Arg6476[2], Arg6476_3 = Arg6476[3], Arg6476_4 = Arg6476[4];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6476_1, [Shen.type_symbol, "string"], Arg6476_2, Arg6476_3, Arg6476_4]);})}, 5, [Arg6474_2, Arg6474_3, Arg6474_4, Arg6474_7, Arg6474_5], undefined]]);})}, 14, [R4, R3, R0, R1, Arg6338_2, Arg6338_4, R2, Arg6338_3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6338_3]),
  (R1 = R4))
  : (R1 = false))))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_0, Arg6338_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "type"], R2)))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R1 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R3 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.empty$question$(R2))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["cut"], [R0, Arg6338_3, [Shen.type_func, function shen_user_lambda6479(Arg6478) {
  if (Arg6478.length < 8) return [Shen.type_func, shen_user_lambda6479, 8, Arg6478];
  var Arg6478_0 = Arg6478[0], Arg6478_1 = Arg6478[1], Arg6478_2 = Arg6478[2], Arg6478_3 = Arg6478[3], Arg6478_4 = Arg6478[4], Arg6478_5 = Arg6478[5], Arg6478_6 = Arg6478[6], Arg6478_7 = Arg6478[7];
  return (function() {
  return Shen.call_tail(Shen.fns["unify"], [Arg6478_1, Arg6478_4, Arg6478_6, [Shen.type_func, function shen_user_lambda6481(Arg6480) {
  if (Arg6480.length < 6) return [Shen.type_func, shen_user_lambda6481, 6, Arg6480];
  var Arg6480_0 = Arg6480[0], Arg6480_1 = Arg6480[1], Arg6480_2 = Arg6480[2], Arg6480_3 = Arg6480[3], Arg6480_4 = Arg6480[4], Arg6480_5 = Arg6480[5];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6480_1, Arg6480_2, Arg6480_3, Arg6480_4, Arg6480_5]);})}, 6, [Arg6478_4, Arg6478_0, Arg6478_1, Arg6478_5, Arg6478_6, Arg6478_7], undefined]]);})}, 8, [R1, R3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]])))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_0, Arg6338_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "input+"], R2)))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R1 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R3 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.empty$question$(R2))
  ? ((R2 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["bind"], [R2, Shen.call(Shen.fns["shen.demodulate"], [Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6338_3])]), Arg6338_3, [Shen.type_func, function shen_user_lambda6483(Arg6482) {
  if (Arg6482.length < 13) return [Shen.type_func, shen_user_lambda6483, 13, Arg6482];
  var Arg6482_0 = Arg6482[0], Arg6482_1 = Arg6482[1], Arg6482_2 = Arg6482[2], Arg6482_3 = Arg6482[3], Arg6482_4 = Arg6482[4], Arg6482_5 = Arg6482[5], Arg6482_6 = Arg6482[6], Arg6482_7 = Arg6482[7], Arg6482_8 = Arg6482[8], Arg6482_9 = Arg6482[9], Arg6482_10 = Arg6482[10], Arg6482_11 = Arg6482[11], Arg6482_12 = Arg6482[12];
  return (function() {
  return Shen.call_tail(Shen.fns["unify"], [Arg6482_1, Arg6482_2, Arg6482_5, [Shen.type_func, function shen_user_lambda6485(Arg6484) {
  if (Arg6484.length < 6) return [Shen.type_func, shen_user_lambda6485, 6, Arg6484];
  var Arg6484_0 = Arg6484[0], Arg6484_1 = Arg6484[1], Arg6484_2 = Arg6484[2], Arg6484_3 = Arg6484[3], Arg6484_4 = Arg6484[4], Arg6484_5 = Arg6484[5];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6484_2, [Shen.type_cons, [Shen.type_symbol, "stream"], [Shen.type_cons, [Shen.type_symbol, "in"], []]], Arg6484_3, Arg6484_4, Arg6484_5]);})}, 6, [Arg6482_1, Arg6482_2, Arg6482_3, Arg6482_4, Arg6482_5, Arg6482_6], undefined]]);})}, 13, [R1, Arg6338_1, R2, R3, Arg6338_2, Arg6338_3, Arg6338_4, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]])))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_0, Arg6338_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "set"], R2)))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R1 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R3 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6338_3])),
  ((Shen.empty$question$(R2))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["cut"], [R0, Arg6338_3, [Shen.type_func, function shen_user_lambda6487(Arg6486) {
  if (Arg6486.length < 8) return [Shen.type_func, shen_user_lambda6487, 8, Arg6486];
  var Arg6486_0 = Arg6486[0], Arg6486_1 = Arg6486[1], Arg6486_2 = Arg6486[2], Arg6486_3 = Arg6486[3], Arg6486_4 = Arg6486[4], Arg6486_5 = Arg6486[5], Arg6486_6 = Arg6486[6], Arg6486_7 = Arg6486[7];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6486_0, [Shen.type_symbol, "symbol"], Arg6486_5, Arg6486_6, [Shen.type_func, function shen_user_lambda6489(Arg6488) {
  if (Arg6488.length < 7) return [Shen.type_func, shen_user_lambda6489, 7, Arg6488];
  var Arg6488_0 = Arg6488[0], Arg6488_1 = Arg6488[1], Arg6488_2 = Arg6488[2], Arg6488_3 = Arg6488[3], Arg6488_4 = Arg6488[4], Arg6488_5 = Arg6488[5], Arg6488_6 = Arg6488[6];
  return (function() {
  return Shen.call_tail(Shen.fns["cut"], [Arg6488_0, Arg6488_5, [Shen.type_func, function shen_user_lambda6491(Arg6490) {
  if (Arg6490.length < 7) return [Shen.type_func, shen_user_lambda6491, 7, Arg6490];
  var Arg6490_0 = Arg6490[0], Arg6490_1 = Arg6490[1], Arg6490_2 = Arg6490[2], Arg6490_3 = Arg6490[3], Arg6490_4 = Arg6490[4], Arg6490_5 = Arg6490[5], Arg6490_6 = Arg6490[6];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [[Shen.type_cons, [Shen.type_symbol, "value"], [Shen.type_cons, Arg6490_1, []]], Arg6490_3, Arg6490_4, Arg6490_5, [Shen.type_func, function shen_user_lambda6493(Arg6492) {
  if (Arg6492.length < 6) return [Shen.type_func, shen_user_lambda6493, 6, Arg6492];
  var Arg6492_0 = Arg6492[0], Arg6492_1 = Arg6492[1], Arg6492_2 = Arg6492[2], Arg6492_3 = Arg6492[3], Arg6492_4 = Arg6492[4], Arg6492_5 = Arg6492[5];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6492_1, Arg6492_2, Arg6492_3, Arg6492_4, Arg6492_5]);})}, 6, [Arg6490_1, Arg6490_2, Arg6490_3, Arg6490_4, Arg6490_5, Arg6490_6], undefined]]);})}, 7, [Arg6488_0, Arg6488_1, Arg6488_2, Arg6488_3, Arg6488_4, Arg6488_5, Arg6488_6], undefined]]);})}, 7, [Arg6486_2, Arg6486_0, Arg6486_1, Arg6486_4, Arg6486_5, Arg6486_6, Arg6486_7], undefined]]);})}, 8, [R1, R3, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]])))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_0, Arg6338_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "fail"], R2)))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6338_3])),
  ((Shen.empty$question$(R2))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_1, Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "symbol"], R2)))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.unwind_tail(Shen.thaw(Arg6338_4))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R2, [Shen.type_symbol, "symbol"], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.unwind_tail(Shen.thaw(Arg6338_4)))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6338_3]),
  (R1 = R1))
  : (R1 = false))))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["shen.t*-hyps"], [Arg6338_2, R1, Arg6338_3, [Shen.type_func, function shen_user_lambda6495(Arg6494) {
  if (Arg6494.length < 12) return [Shen.type_func, shen_user_lambda6495, 12, Arg6494];
  var Arg6494_0 = Arg6494[0], Arg6494_1 = Arg6494[1], Arg6494_2 = Arg6494[2], Arg6494_3 = Arg6494[3], Arg6494_4 = Arg6494[4], Arg6494_5 = Arg6494[5], Arg6494_6 = Arg6494[6], Arg6494_7 = Arg6494[7], Arg6494_8 = Arg6494[8], Arg6494_9 = Arg6494[9], Arg6494_10 = Arg6494[10], Arg6494_11 = Arg6494[11];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.th*"], [Arg6494_1, Arg6494_2, Arg6494_3, Arg6494_4, Arg6494_5]);})}, 12, [Arg6338_2, Arg6338_0, Arg6338_1, R1, Arg6338_3, Arg6338_4, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]]))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_0, Arg6338_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "define"], R2)))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6338_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R1 = R2[1]),
  (R2 = R2[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["cut"], [R0, Arg6338_3, [Shen.type_func, function shen_user_lambda6497(Arg6496) {
  if (Arg6496.length < 13) return [Shen.type_func, shen_user_lambda6497, 13, Arg6496];
  var Arg6496_0 = Arg6496[0], Arg6496_1 = Arg6496[1], Arg6496_2 = Arg6496[2], Arg6496_3 = Arg6496[3], Arg6496_4 = Arg6496[4], Arg6496_5 = Arg6496[5], Arg6496_6 = Arg6496[6], Arg6496_7 = Arg6496[7], Arg6496_8 = Arg6496[8], Arg6496_9 = Arg6496[9], Arg6496_10 = Arg6496[10], Arg6496_11 = Arg6496[11], Arg6496_12 = Arg6496[12];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.t*-def"], [[Shen.type_cons, [Shen.type_symbol, "define"], [Shen.type_cons, Arg6496_1, Arg6496_2]], Arg6496_3, Arg6496_4, Arg6496_5, Arg6496_6]);})}, 13, [R0, R1, R2, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4, R0, Arg6338_0, Arg6338_1, Arg6338_2, Arg6338_3, Arg6338_4], undefined]])))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_0, Arg6338_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "defmacro"], R1)))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_1, Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "unit"], R1)))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["cut"], [R0, Arg6338_3, Arg6338_4])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R1]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R1, [Shen.type_symbol, "unit"], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R0 = Shen.call(Shen.fns["cut"], [R0, Arg6338_3, Arg6338_4]))),
  Shen.call(Shen.fns["shen.unbindv"], [R1, Arg6338_3]),
  (R1 = R0))
  : (R1 = false))))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_0, Arg6338_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.process-datatype"], R1)))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_1, Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "symbol"], R1)))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.unwind_tail(Shen.thaw(Arg6338_4))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R1]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R1, [Shen.type_symbol, "symbol"], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R0 = Shen.unwind_tail(Shen.thaw(Arg6338_4)))),
  Shen.call(Shen.fns["shen.unbindv"], [R1, Arg6338_3]),
  (R1 = R0))
  : (R1 = false))))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_0, Arg6338_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.synonyms-help"], R1)))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6338_1, Arg6338_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "symbol"], R1)))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.unwind_tail(Shen.thaw(Arg6338_4))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R1]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R1, [Shen.type_symbol, "symbol"], Arg6338_3]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R0 = Shen.unwind_tail(Shen.thaw(Arg6338_4)))),
  Shen.call(Shen.fns["shen.unbindv"], [R1, Arg6338_3]),
  (R1 = R0))
  : (R1 = false))))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? ((R1 = Shen.call(Shen.fns["shen.newpv"], [Arg6338_3])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  Shen.call(Shen.fns["bind"], [R1, (Shen.globals["shen.*datatypes*"]), Arg6338_3, [Shen.type_func, function shen_user_lambda6499(Arg6498) {
  if (Arg6498.length < 6) return [Shen.type_func, shen_user_lambda6499, 6, Arg6498];
  var Arg6498_0 = Arg6498[0], Arg6498_1 = Arg6498[1], Arg6498_2 = Arg6498[2], Arg6498_3 = Arg6498[3], Arg6498_4 = Arg6498[4], Arg6498_5 = Arg6498[5];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.udefs*"], [[Shen.type_cons, Arg6498_0, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Arg6498_1, []]]], Arg6498_2, Arg6498_3, Arg6498_4, Arg6498_5]);})}, 6, [Arg6338_0, Arg6338_1, Arg6338_2, R1, Arg6338_3, Arg6338_4], undefined]]))
  : R1))
  : R1))
  : R1))
  : R1))
  : R1))
  : R1))
  : R1))
  : R1))
  : R1))
  : R1))
  : R1))
  : R1))
  : R1))
  : R1))
  : R1))
  : R1))
  : R1))
  : R1))
  : R1))
  : R1))
  : R1))
  : R1))]);}))}, 5, [], "shen.th*"];





Shen.fns["shen.t*-hyps"] = [Shen.type_func, function shen_user_lambda6501(Arg6500) {
  if (Arg6500.length < 4) return [Shen.type_func, shen_user_lambda6501, 4, Arg6500];
  var Arg6500_0 = Arg6500[0], Arg6500_1 = Arg6500[1], Arg6500_2 = Arg6500[2], Arg6500_3 = Arg6500[3];
  var R0, R1, R2, R3, R4, R5, R6, R7;
  return (((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6500_0, Arg6500_2])),
  ((Shen.is_type(R0, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R0[1], Arg6500_2])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6500_2])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R2[1], Arg6500_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "cons"], R3)))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6500_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R2 = R3[1]),
  (R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R4 = R3[1]),
  (R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6500_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R3[1], Arg6500_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":"], R1)))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R3[1], Arg6500_2])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R5 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6500_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "list"], R5)))
  ? ((R5 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6500_2])),
  ((Shen.is_type(R5, Shen.type_cons))
  ? ((R1 = R5[1]),
  (R5 = Shen.call(Shen.fns["shen.lazyderef"], [R5[2], Arg6500_2])),
  ((Shen.empty$question$(R5))
  ? ((R5 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R5))
  ? ((R5 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R0 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R5]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R5, [], Arg6500_2]),
  ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R5, Arg6500_2]),
  (R0 = R4))
  : (R0 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R5]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R5, [], Arg6500_2]),
  ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R0, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R4 = R4))
  : (R4 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R5, Arg6500_2]),
  (R0 = R4))
  : (R0 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R5]))
  ? ((R1 = Shen.call(Shen.fns["shen.newpv"], [Arg6500_2])),
  Shen.call(Shen.fns["shen.bindv"], [R5, [Shen.type_cons, R1, []], Arg6500_2]),
  ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R0, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R4 = R4))
  : (R4 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R5, Arg6500_2]),
  (R0 = R4))
  : (R0 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R5]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R5, [Shen.type_symbol, "list"], Arg6500_2]),
  ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6500_2])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R6 = R1[1]),
  (R1 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6500_2])),
  ((Shen.empty$question$(R1))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R1 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R6 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R4 = R6))
  : (R4 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R1]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R1, [], Arg6500_2]),
  ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R6 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R6 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R0, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R6 = R6))
  : (R6 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R1, Arg6500_2]),
  (R4 = R6))
  : (R4 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R1]))
  ? ((R6 = Shen.call(Shen.fns["shen.newpv"], [Arg6500_2])),
  Shen.call(Shen.fns["shen.bindv"], [R1, [Shen.type_cons, R6, []], Arg6500_2]),
  ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R6 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R6 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R0, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R6 = R6))
  : (R6 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R1, Arg6500_2]),
  (R4 = R6))
  : (R4 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R5, Arg6500_2]),
  (R0 = R4))
  : (R0 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R1]))
  ? ((R5 = Shen.call(Shen.fns["shen.newpv"], [Arg6500_2])),
  Shen.call(Shen.fns["shen.bindv"], [R1, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, R5, []]], Arg6500_2]),
  ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R0, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R5 = R5))
  : (R5 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R1, Arg6500_2]),
  (R0 = R5))
  : (R0 = false))))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R0, false)))
  ? (((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6500_0, Arg6500_2])),
  ((Shen.is_type(R0, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R0[1], Arg6500_2])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6500_2])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R2[1], Arg6500_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "@p"], R3)))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6500_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R2 = R3[1]),
  (R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R4 = R3[1]),
  (R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6500_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R3[1], Arg6500_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":"], R1)))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R3[1], Arg6500_2])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R5 = R1[1]),
  (R1 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6500_2])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R6 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6500_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "*"], R6)))
  ? ((R6 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6500_2])),
  ((Shen.is_type(R6, Shen.type_cons))
  ? ((R1 = R6[1]),
  (R6 = Shen.call(Shen.fns["shen.lazyderef"], [R6[2], Arg6500_2])),
  ((Shen.empty$question$(R6))
  ? ((R6 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R6))
  ? ((R6 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R0 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]]], Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R6]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R6, [], Arg6500_2]),
  ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R6, Arg6500_2]),
  (R0 = R5))
  : (R0 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R6]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R6, [], Arg6500_2]),
  ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]]], Shen.call(Shen.fns["shen.lazyderef"], [R0, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R5 = R5))
  : (R5 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R6, Arg6500_2]),
  (R0 = R5))
  : (R0 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R6]))
  ? ((R1 = Shen.call(Shen.fns["shen.newpv"], [Arg6500_2])),
  Shen.call(Shen.fns["shen.bindv"], [R6, [Shen.type_cons, R1, []], Arg6500_2]),
  ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]]], Shen.call(Shen.fns["shen.lazyderef"], [R0, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R5 = R5))
  : (R5 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R6, Arg6500_2]),
  (R0 = R5))
  : (R0 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R6]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R6, [Shen.type_symbol, "*"], Arg6500_2]),
  ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6500_2])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R7 = R1[1]),
  (R1 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6500_2])),
  ((Shen.empty$question$(R1))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R7, Arg6500_2]), []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R1 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R7 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R7, Arg6500_2]), []]]], Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R5 = R7))
  : (R5 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R1]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R1, [], Arg6500_2]),
  ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R7 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R7, Arg6500_2]), []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R7 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R7, Arg6500_2]), []]]], Shen.call(Shen.fns["shen.lazyderef"], [R0, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R7 = R7))
  : (R7 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R1, Arg6500_2]),
  (R5 = R7))
  : (R5 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R1]))
  ? ((R7 = Shen.call(Shen.fns["shen.newpv"], [Arg6500_2])),
  Shen.call(Shen.fns["shen.bindv"], [R1, [Shen.type_cons, R7, []], Arg6500_2]),
  ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R7 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R7, Arg6500_2]), []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R7 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R7, Arg6500_2]), []]]], Shen.call(Shen.fns["shen.lazyderef"], [R0, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R7 = R7))
  : (R7 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R1, Arg6500_2]),
  (R5 = R7))
  : (R5 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R6, Arg6500_2]),
  (R0 = R5))
  : (R0 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R1]))
  ? ((R6 = Shen.call(Shen.fns["shen.newpv"], [Arg6500_2])),
  Shen.call(Shen.fns["shen.bindv"], [R1, [Shen.type_cons, [Shen.type_symbol, "*"], [Shen.type_cons, R6, []]], Arg6500_2]),
  ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R6 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R6 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]]], Shen.call(Shen.fns["shen.lazyderef"], [R0, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R6 = R6))
  : (R6 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R1, Arg6500_2]),
  (R0 = R6))
  : (R0 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R1]))
  ? ((R5 = Shen.call(Shen.fns["shen.newpv"], [Arg6500_2])),
  (R6 = Shen.call(Shen.fns["shen.newpv"], [Arg6500_2])),
  Shen.call(Shen.fns["shen.bindv"], [R1, [Shen.type_cons, R5, [Shen.type_cons, [Shen.type_symbol, "*"], [Shen.type_cons, R6, []]]], Arg6500_2]),
  ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R6 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R6 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]]], Shen.call(Shen.fns["shen.lazyderef"], [R0, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R6 = R6))
  : (R6 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R1, Arg6500_2]),
  (R0 = R6))
  : (R0 = false))))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R0, false)))
  ? (((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6500_0, Arg6500_2])),
  ((Shen.is_type(R0, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R0[1], Arg6500_2])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6500_2])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R2[1], Arg6500_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "@v"], R3)))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6500_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R2 = R3[1]),
  (R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R4 = R3[1]),
  (R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6500_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R3[1], Arg6500_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":"], R1)))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R3[1], Arg6500_2])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R5 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6500_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "vector"], R5)))
  ? ((R5 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6500_2])),
  ((Shen.is_type(R5, Shen.type_cons))
  ? ((R1 = R5[1]),
  (R5 = Shen.call(Shen.fns["shen.lazyderef"], [R5[2], Arg6500_2])),
  ((Shen.empty$question$(R5))
  ? ((R5 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R5))
  ? ((R5 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R0 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R5]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R5, [], Arg6500_2]),
  ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R5, Arg6500_2]),
  (R0 = R4))
  : (R0 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R5]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R5, [], Arg6500_2]),
  ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R0, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R4 = R4))
  : (R4 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R5, Arg6500_2]),
  (R0 = R4))
  : (R0 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R5]))
  ? ((R1 = Shen.call(Shen.fns["shen.newpv"], [Arg6500_2])),
  Shen.call(Shen.fns["shen.bindv"], [R5, [Shen.type_cons, R1, []], Arg6500_2]),
  ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R0, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R4 = R4))
  : (R4 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R5, Arg6500_2]),
  (R0 = R4))
  : (R0 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R5]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R5, [Shen.type_symbol, "vector"], Arg6500_2]),
  ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6500_2])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R6 = R1[1]),
  (R1 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6500_2])),
  ((Shen.empty$question$(R1))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R1 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R6 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R4 = R6))
  : (R4 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R1]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R1, [], Arg6500_2]),
  ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R6 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R6 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R0, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R6 = R6))
  : (R6 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R1, Arg6500_2]),
  (R4 = R6))
  : (R4 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R1]))
  ? ((R6 = Shen.call(Shen.fns["shen.newpv"], [Arg6500_2])),
  Shen.call(Shen.fns["shen.bindv"], [R1, [Shen.type_cons, R6, []], Arg6500_2]),
  ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R6 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R6 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R6, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R0, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R6 = R6))
  : (R6 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R1, Arg6500_2]),
  (R4 = R6))
  : (R4 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R5, Arg6500_2]),
  (R0 = R4))
  : (R0 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R1]))
  ? ((R5 = Shen.call(Shen.fns["shen.newpv"], [Arg6500_2])),
  Shen.call(Shen.fns["shen.bindv"], [R1, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, R5, []]], Arg6500_2]),
  ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "vector"], [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R5, Arg6500_2]), []]], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R0, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R5 = R5))
  : (R5 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R1, Arg6500_2]),
  (R0 = R5))
  : (R0 = false))))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R0, false)))
  ? (((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6500_0, Arg6500_2])),
  ((Shen.is_type(R0, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R0[1], Arg6500_2])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6500_2])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R2[1], Arg6500_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "@s"], R3)))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6500_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R2 = R3[1]),
  (R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R4 = R3[1]),
  (R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6500_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R3[1], Arg6500_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":"], R1)))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R3[1], Arg6500_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "string"], R1)))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R0 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R1 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R0 = R4))
  : (R0 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R1]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R1, [Shen.type_symbol, "string"], Arg6500_2]),
  ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6500_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R3, Arg6500_2])]], Arg6500_2, Arg6500_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6500_2]),
  ((R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]], [Shen.type_cons, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R4, Arg6500_2]), [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "string"], []]]], Shen.call(Shen.fns["shen.lazyderef"], [R0, Arg6500_2])]], Arg6500_2, Arg6500_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6500_2]),
  (R4 = R4))
  : (R4 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R1, Arg6500_2]),
  (R0 = R4))
  : (R0 = false))))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R0, false)))
  ? ((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6500_0, Arg6500_2])),
  ((Shen.is_type(R0, Shen.type_cons))
  ? ((R1 = R0[1]),
  (R0 = R0[2]),
  (R2 = Shen.call(Shen.fns["shen.newpv"], [Arg6500_2])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6500_1, [Shen.type_cons, Shen.call(Shen.fns["shen.lazyderef"], [R1, Arg6500_2]), Shen.call(Shen.fns["shen.lazyderef"], [R2, Arg6500_2])], Arg6500_2, [Shen.type_func, function shen_user_lambda6503(Arg6502) {
  if (Arg6502.length < 6) return [Shen.type_func, shen_user_lambda6503, 6, Arg6502];
  var Arg6502_0 = Arg6502[0], Arg6502_1 = Arg6502[1], Arg6502_2 = Arg6502[2], Arg6502_3 = Arg6502[3], Arg6502_4 = Arg6502[4], Arg6502_5 = Arg6502[5];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.t*-hyps"], [Arg6502_2, Arg6502_3, Arg6502_4, Arg6502_5]);})}, 6, [Arg6500_1, R1, R0, R2, Arg6500_2, Arg6500_3], undefined]]);}))
  : false))
  : R0))
  : R0))
  : R0))
  : R0))}, 4, [], "shen.t*-hyps"];





Shen.fns["shen.show"] = [Shen.type_func, function shen_user_lambda6505(Arg6504) {
  if (Arg6504.length < 4) return [Shen.type_func, shen_user_lambda6505, 4, Arg6504];
  var Arg6504_0 = Arg6504[0], Arg6504_1 = Arg6504[1], Arg6504_2 = Arg6504[2], Arg6504_3 = Arg6504[3];
  return (((Shen.globals["shen.*spy*"]))
  ? (Shen.call(Shen.fns["shen.line"], []),
  Shen.call(Shen.fns["shen.show-p"], [Shen.call(Shen.fns["shen.deref"], [Arg6504_0, Arg6504_2])]),
  Shen.call(Shen.fns["nl"], [1]),
  Shen.call(Shen.fns["nl"], [1]),
  Shen.call(Shen.fns["shen.show-assumptions"], [Shen.call(Shen.fns["shen.deref"], [Arg6504_1, Arg6504_2]), 1]),
  Shen.call(Shen.fns["shen.prhush"], ["\x0d\x0a> ", Shen.call(Shen.fns["stoutput"], [])]),
  Shen.call(Shen.fns["shen.pause-for-user"], []),
  Shen.thaw(Arg6504_3))
  : Shen.thaw(Arg6504_3))}, 4, [], "shen.show"];





Shen.fns["shen.line"] = [Shen.type_func, function shen_user_lambda6507(Arg6506) {
  if (Arg6506.length < 0) return [Shen.type_func, shen_user_lambda6507, 0, Arg6506];
  var R0;
  return ((R0 = Shen.call(Shen.fns["inferences"], [])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.prhush"], [("____________________________________________________________ " + Shen.call(Shen.fns["shen.app"], [R0, (" inference" + Shen.call(Shen.fns["shen.app"], [((Shen.unwind_tail(Shen.$eq$(1, R0)))
  ? ""
  : "s"), " \x0d\x0a?- ", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])), Shen.call(Shen.fns["stoutput"], [])]);}))}, 0, [], "shen.line"];





Shen.fns["shen.show-p"] = [Shen.type_func, function shen_user_lambda6509(Arg6508) {
  if (Arg6508.length < 1) return [Shen.type_func, shen_user_lambda6509, 1, Arg6508];
  var Arg6508_0 = Arg6508[0];
  return (((Shen.is_type(Arg6508_0, Shen.type_cons) && (Shen.is_type(Arg6508_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":"], Arg6508_0[2][1])) && (Shen.is_type(Arg6508_0[2][2], Shen.type_cons) && Shen.empty$question$(Arg6508_0[2][2][2]))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.prhush"], [Shen.call(Shen.fns["shen.app"], [Arg6508_0[1], (" : " + Shen.call(Shen.fns["shen.app"], [Arg6508_0[2][2][1], "", [Shen.type_symbol, "shen.r"]])), [Shen.type_symbol, "shen.r"]]), Shen.call(Shen.fns["stoutput"], [])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.prhush"], [Shen.call(Shen.fns["shen.app"], [Arg6508_0, "", [Shen.type_symbol, "shen.r"]]), Shen.call(Shen.fns["stoutput"], [])]);}))}, 1, [], "shen.show-p"];





Shen.fns["shen.show-assumptions"] = [Shen.type_func, function shen_user_lambda6511(Arg6510) {
  if (Arg6510.length < 2) return [Shen.type_func, shen_user_lambda6511, 2, Arg6510];
  var Arg6510_0 = Arg6510[0], Arg6510_1 = Arg6510[1];
  return ((Shen.empty$question$(Arg6510_0))
  ? [Shen.type_symbol, "shen.skip"]
  : ((Shen.is_type(Arg6510_0, Shen.type_cons))
  ? (Shen.call(Shen.fns["shen.prhush"], [Shen.call(Shen.fns["shen.app"], [Arg6510_1, ". ", [Shen.type_symbol, "shen.a"]]), Shen.call(Shen.fns["stoutput"], [])]),
  Shen.call(Shen.fns["shen.show-p"], [Arg6510_0[1]]),
  Shen.call(Shen.fns["nl"], [1]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.show-assumptions"], [Arg6510_0[2], (Arg6510_1 + 1)]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.show-assumptions"]]);})))}, 2, [], "shen.show-assumptions"];





Shen.fns["shen.pause-for-user"] = [Shen.type_func, function shen_user_lambda6513(Arg6512) {
  if (Arg6512.length < 0) return [Shen.type_func, shen_user_lambda6513, 0, Arg6512];
  var R0;
  return ((R0 = Shen.read_byte(Shen.call(Shen.fns["stinput"], []))),
  ((Shen.unwind_tail(Shen.$eq$(R0, 94)))
  ? (function() {
  return Shen.simple_error("input aborted\x0d\x0a");})
  : (function() {
  return Shen.call_tail(Shen.fns["nl"], [1]);})))}, 0, [], "shen.pause-for-user"];





Shen.fns["shen.typedf?"] = [Shen.type_func, function shen_user_lambda6515(Arg6514) {
  if (Arg6514.length < 1) return [Shen.type_func, shen_user_lambda6515, 1, Arg6514];
  var Arg6514_0 = Arg6514[0];
  return Shen.is_type(Shen.call(Shen.fns["assoc"], [Arg6514_0, (Shen.globals["shen.*signedfuncs*"])]), Shen.type_cons)}, 1, [], "shen.typedf?"];





Shen.fns["shen.sigf"] = [Shen.type_func, function shen_user_lambda6517(Arg6516) {
  if (Arg6516.length < 1) return [Shen.type_func, shen_user_lambda6517, 1, Arg6516];
  var Arg6516_0 = Arg6516[0];
  return (function() {
  return Shen.call_tail(Shen.fns["concat"], [[Shen.type_symbol, "shen.type-signature-of-"], Arg6516_0]);})}, 1, [], "shen.sigf"];





Shen.fns["shen.placeholder"] = [Shen.type_func, function shen_user_lambda6519(Arg6518) {
  if (Arg6518.length < 0) return [Shen.type_func, shen_user_lambda6519, 0, Arg6518];
  return (function() {
  return Shen.call_tail(Shen.fns["gensym"], [[Shen.type_symbol, "&&"]]);})}, 0, [], "shen.placeholder"];





Shen.fns["shen.base"] = [Shen.type_func, function shen_user_lambda6521(Arg6520) {
  if (Arg6520.length < 4) return [Shen.type_func, shen_user_lambda6521, 4, Arg6520];
  var Arg6520_0 = Arg6520[0], Arg6520_1 = Arg6520[1], Arg6520_2 = Arg6520[2], Arg6520_3 = Arg6520[3];
  var R0, R1, R2;
  return (((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6520_1, Arg6520_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "number"], R0)))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R0 = Shen.call(Shen.fns["fwhen"], [(typeof(Shen.call(Shen.fns["shen.lazyderef"], [Arg6520_0, Arg6520_2])) == 'number'), Arg6520_2, Arg6520_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R0]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R0, [Shen.type_symbol, "number"], Arg6520_2]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["fwhen"], [(typeof(Shen.call(Shen.fns["shen.lazyderef"], [Arg6520_0, Arg6520_2])) == 'number'), Arg6520_2, Arg6520_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R0, Arg6520_2]),
  (R0 = R1))
  : (R0 = false)))),
  ((Shen.unwind_tail(Shen.$eq$(R0, false)))
  ? (((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6520_1, Arg6520_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "boolean"], R0)))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R0 = Shen.call(Shen.fns["fwhen"], [Shen.boolean$question$(Shen.call(Shen.fns["shen.lazyderef"], [Arg6520_0, Arg6520_2])), Arg6520_2, Arg6520_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R0]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R0, [Shen.type_symbol, "boolean"], Arg6520_2]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["fwhen"], [Shen.boolean$question$(Shen.call(Shen.fns["shen.lazyderef"], [Arg6520_0, Arg6520_2])), Arg6520_2, Arg6520_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R0, Arg6520_2]),
  (R0 = R1))
  : (R0 = false)))),
  ((Shen.unwind_tail(Shen.$eq$(R0, false)))
  ? (((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6520_1, Arg6520_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "string"], R0)))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R0 = Shen.call(Shen.fns["fwhen"], [(typeof(Shen.call(Shen.fns["shen.lazyderef"], [Arg6520_0, Arg6520_2])) == 'string'), Arg6520_2, Arg6520_3])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R0]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R0, [Shen.type_symbol, "string"], Arg6520_2]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["fwhen"], [(typeof(Shen.call(Shen.fns["shen.lazyderef"], [Arg6520_0, Arg6520_2])) == 'string'), Arg6520_2, Arg6520_3]))),
  Shen.call(Shen.fns["shen.unbindv"], [R0, Arg6520_2]),
  (R0 = R1))
  : (R0 = false)))),
  ((Shen.unwind_tail(Shen.$eq$(R0, false)))
  ? (((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6520_1, Arg6520_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "symbol"], R0)))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R0 = Shen.call(Shen.fns["fwhen"], [Shen.is_type(Shen.call(Shen.fns["shen.lazyderef"], [Arg6520_0, Arg6520_2]), Shen.type_symbol), Arg6520_2, [Shen.type_func, function shen_user_lambda6523(Arg6522) {
  if (Arg6522.length < 4) return [Shen.type_func, shen_user_lambda6523, 4, Arg6522];
  var Arg6522_0 = Arg6522[0], Arg6522_1 = Arg6522[1], Arg6522_2 = Arg6522[2], Arg6522_3 = Arg6522[3];
  return (function() {
  return Shen.call_tail(Shen.fns["fwhen"], [(!Shen.call(Shen.fns["shen.ue?"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg6522_0, Arg6522_3])])), Arg6522_3, Arg6522_2]);})}, 4, [Arg6520_0, Arg6520_1, Arg6520_3, Arg6520_2], undefined]])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R0]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R0, [Shen.type_symbol, "symbol"], Arg6520_2]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["fwhen"], [Shen.is_type(Shen.call(Shen.fns["shen.lazyderef"], [Arg6520_0, Arg6520_2]), Shen.type_symbol), Arg6520_2, [Shen.type_func, function shen_user_lambda6525(Arg6524) {
  if (Arg6524.length < 5) return [Shen.type_func, shen_user_lambda6525, 5, Arg6524];
  var Arg6524_0 = Arg6524[0], Arg6524_1 = Arg6524[1], Arg6524_2 = Arg6524[2], Arg6524_3 = Arg6524[3], Arg6524_4 = Arg6524[4];
  return (function() {
  return Shen.call_tail(Shen.fns["fwhen"], [(!Shen.call(Shen.fns["shen.ue?"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg6524_1, Arg6524_4])])), Arg6524_4, Arg6524_3]);})}, 5, [R0, Arg6520_0, Arg6520_1, Arg6520_3, Arg6520_2], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R0, Arg6520_2]),
  (R0 = R1))
  : (R0 = false)))),
  ((Shen.unwind_tail(Shen.$eq$(R0, false)))
  ? ((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6520_0, Arg6520_2])),
  ((Shen.empty$question$(R0))
  ? ((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6520_1, Arg6520_2])),
  ((Shen.is_type(R0, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R0[1], Arg6520_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "list"], R1)))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R0[2], Arg6520_2])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? (R1[1],
  (R1 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6520_2])),
  ((Shen.empty$question$(R1))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  Shen.thaw(Arg6520_3))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R1]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R1, [], Arg6520_2]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R0 = Shen.unwind_tail(Shen.thaw(Arg6520_3)))),
  Shen.call(Shen.fns["shen.unbindv"], [R1, Arg6520_2]),
  R0)
  : false)))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R1]))
  ? ((R0 = Shen.call(Shen.fns["shen.newpv"], [Arg6520_2])),
  Shen.call(Shen.fns["shen.bindv"], [R1, [Shen.type_cons, R0, []], Arg6520_2]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R0 = Shen.unwind_tail(Shen.thaw(Arg6520_3)))),
  Shen.call(Shen.fns["shen.unbindv"], [R1, Arg6520_2]),
  R0)
  : false)))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R1]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R1, [Shen.type_symbol, "list"], Arg6520_2]),
  ((R0 = Shen.call(Shen.fns["shen.lazyderef"], [R0[2], Arg6520_2])),
  ((Shen.is_type(R0, Shen.type_cons))
  ? (R0[1],
  (R0 = Shen.call(Shen.fns["shen.lazyderef"], [R0[2], Arg6520_2])),
  ((Shen.empty$question$(R0))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R0 = Shen.unwind_tail(Shen.thaw(Arg6520_3))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R0]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R0, [], Arg6520_2]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R2 = Shen.unwind_tail(Shen.thaw(Arg6520_3)))),
  Shen.call(Shen.fns["shen.unbindv"], [R0, Arg6520_2]),
  (R0 = R2))
  : (R0 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R0]))
  ? ((R2 = Shen.call(Shen.fns["shen.newpv"], [Arg6520_2])),
  Shen.call(Shen.fns["shen.bindv"], [R0, [Shen.type_cons, R2, []], Arg6520_2]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R2 = Shen.unwind_tail(Shen.thaw(Arg6520_3)))),
  Shen.call(Shen.fns["shen.unbindv"], [R0, Arg6520_2]),
  (R0 = R2))
  : (R0 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R1, Arg6520_2]),
  R0)
  : false)))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R0]))
  ? ((R1 = Shen.call(Shen.fns["shen.newpv"], [Arg6520_2])),
  Shen.call(Shen.fns["shen.bindv"], [R0, [Shen.type_cons, [Shen.type_symbol, "list"], [Shen.type_cons, R1, []]], Arg6520_2]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.unwind_tail(Shen.thaw(Arg6520_3)))),
  Shen.call(Shen.fns["shen.unbindv"], [R0, Arg6520_2]),
  R1)
  : false)))
  : false))
  : R0))
  : R0))
  : R0))
  : R0))}, 4, [], "shen.base"];





Shen.fns["shen.by_hypothesis"] = [Shen.type_func, function shen_user_lambda6527(Arg6526) {
  if (Arg6526.length < 5) return [Shen.type_func, shen_user_lambda6527, 5, Arg6526];
  var Arg6526_0 = Arg6526[0], Arg6526_1 = Arg6526[1], Arg6526_2 = Arg6526[2], Arg6526_3 = Arg6526[3], Arg6526_4 = Arg6526[4];
  var R0, R1, R2;
  return (((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6526_2, Arg6526_3])),
  ((Shen.is_type(R0, Shen.type_cons))
  ? ((R0 = Shen.call(Shen.fns["shen.lazyderef"], [R0[1], Arg6526_3])),
  ((Shen.is_type(R0, Shen.type_cons))
  ? ((R1 = R0[1]),
  (R0 = Shen.call(Shen.fns["shen.lazyderef"], [R0[2], Arg6526_3])),
  ((Shen.is_type(R0, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R0[1], Arg6526_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":"], R2)))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R0[2], Arg6526_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R0 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6526_3])),
  ((Shen.empty$question$(R2))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R0 = Shen.call(Shen.fns["identical"], [Arg6526_0, R1, Arg6526_3, [Shen.type_func, function shen_user_lambda6529(Arg6528) {
  if (Arg6528.length < 7) return [Shen.type_func, shen_user_lambda6529, 7, Arg6528];
  var Arg6528_0 = Arg6528[0], Arg6528_1 = Arg6528[1], Arg6528_2 = Arg6528[2], Arg6528_3 = Arg6528[3], Arg6528_4 = Arg6528[4], Arg6528_5 = Arg6528[5], Arg6528_6 = Arg6528[6];
  return (function() {
  return Shen.call_tail(Shen.fns["unify!"], [Arg6528_4, Arg6528_1, Arg6528_5, Arg6528_6]);})}, 7, [R1, R0, Arg6526_2, Arg6526_0, Arg6526_1, Arg6526_3, Arg6526_4], undefined]])))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false)))
  : (R0 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R0, false)))
  ? ((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6526_2, Arg6526_3])),
  ((Shen.is_type(R0, Shen.type_cons))
  ? ((R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (function() {
  return Shen.call_tail(Shen.fns["shen.by_hypothesis"], [Arg6526_0, Arg6526_1, R0, Arg6526_3, Arg6526_4]);}))
  : false))
  : R0))}, 5, [], "shen.by_hypothesis"];





Shen.fns["shen.t*-def"] = [Shen.type_func, function shen_user_lambda6531(Arg6530) {
  if (Arg6530.length < 5) return [Shen.type_func, shen_user_lambda6531, 5, Arg6530];
  var Arg6530_0 = Arg6530[0], Arg6530_1 = Arg6530[1], Arg6530_2 = Arg6530[2], Arg6530_3 = Arg6530[3], Arg6530_4 = Arg6530[4];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6530_0, Arg6530_3])),
  ((Shen.is_type(R0, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R0[1], Arg6530_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "define"], R1)))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R0[2], Arg6530_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R0 = R1[1]),
  (R1 = R1[2]),
  Shen.call(Shen.fns["shen.newpv"], [Arg6530_3]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (function() {
  return Shen.call_tail(Shen.fns["shen.t*-defh"], [Shen.call(Shen.fns["compile"], [[Shen.type_func, function shen_user_lambda6533(Arg6532) {
  if (Arg6532.length < 1) return [Shen.type_func, shen_user_lambda6533, 1, Arg6532];
  var Arg6532_0 = Arg6532[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.<sig+rules>"], [Arg6532_0]);})}, 1, [], undefined], R1, [Shen.type_func, function shen_user_lambda6535(Arg6534) {
  if (Arg6534.length < 1) return [Shen.type_func, shen_user_lambda6535, 1, Arg6534];
  var Arg6534_0 = Arg6534[0];
  return ((Shen.is_type(Arg6534_0, Shen.type_cons))
  ? (function() {
  return Shen.simple_error(("parse error here: " + Shen.call(Shen.fns["shen.app"], [Arg6534_0, "\x0d\x0a", [Shen.type_symbol, "shen.s"]])));})
  : (function() {
  return Shen.simple_error("parse error\x0d\x0a");}))}, 1, [], undefined]]), R0, Arg6530_1, Arg6530_2, Arg6530_3, Arg6530_4]);}))
  : false))
  : false))
  : false))}, 5, [], "shen.t*-def"];





Shen.fns["shen.t*-defh"] = [Shen.type_func, function shen_user_lambda6537(Arg6536) {
  if (Arg6536.length < 6) return [Shen.type_func, shen_user_lambda6537, 6, Arg6536];
  var Arg6536_0 = Arg6536[0], Arg6536_1 = Arg6536[1], Arg6536_2 = Arg6536[2], Arg6536_3 = Arg6536[3], Arg6536_4 = Arg6536[4], Arg6536_5 = Arg6536[5];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6536_0, Arg6536_4])),
  ((Shen.is_type(R0, Shen.type_cons))
  ? ((R1 = R0[1]),
  (R0 = R0[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (function() {
  return Shen.call_tail(Shen.fns["shen.t*-defhh"], [R1, Shen.call(Shen.fns["shen.ue-sig"], [R1]), Arg6536_1, Arg6536_2, Arg6536_3, R0, Arg6536_4, Arg6536_5]);}))
  : false))}, 6, [], "shen.t*-defh"];





Shen.fns["shen.t*-defhh"] = [Shen.type_func, function shen_user_lambda6539(Arg6538) {
  if (Arg6538.length < 8) return [Shen.type_func, shen_user_lambda6539, 8, Arg6538];
  var Arg6538_0 = Arg6538[0], Arg6538_1 = Arg6538[1], Arg6538_2 = Arg6538[2], Arg6538_3 = Arg6538[3], Arg6538_4 = Arg6538[4], Arg6538_5 = Arg6538[5], Arg6538_6 = Arg6538[6], Arg6538_7 = Arg6538[7];
  return (Shen.call(Shen.fns["shen.incinfs"], []),
  (function() {
  return Shen.call_tail(Shen.fns["shen.t*-rules"], [Arg6538_5, Arg6538_1, 1, Arg6538_2, [Shen.type_cons, [Shen.type_cons, Arg6538_2, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Arg6538_1, []]]], Arg6538_4], Arg6538_6, [Shen.type_func, function shen_user_lambda6541(Arg6540) {
  if (Arg6540.length < 8) return [Shen.type_func, shen_user_lambda6541, 8, Arg6540];
  var Arg6540_0 = Arg6540[0], Arg6540_1 = Arg6540[1], Arg6540_2 = Arg6540[2], Arg6540_3 = Arg6540[3], Arg6540_4 = Arg6540[4], Arg6540_5 = Arg6540[5], Arg6540_6 = Arg6540[6], Arg6540_7 = Arg6540[7];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.memo"], [Arg6540_3, Arg6540_4, Arg6540_5, Arg6540_6, Arg6540_7]);})}, 8, [Arg6538_5, Arg6538_1, Arg6538_4, Arg6538_2, Arg6538_0, Arg6538_3, Arg6538_6, Arg6538_7], undefined]]);}))}, 8, [], "shen.t*-defhh"];





Shen.fns["shen.memo"] = [Shen.type_func, function shen_user_lambda6543(Arg6542) {
  if (Arg6542.length < 5) return [Shen.type_func, shen_user_lambda6543, 5, Arg6542];
  var Arg6542_0 = Arg6542[0], Arg6542_1 = Arg6542[1], Arg6542_2 = Arg6542[2], Arg6542_3 = Arg6542[3], Arg6542_4 = Arg6542[4];
  var R0;
  return ((R0 = Shen.call(Shen.fns["shen.newpv"], [Arg6542_3])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (function() {
  return Shen.call_tail(Shen.fns["unify!"], [Arg6542_2, Arg6542_1, Arg6542_3, [Shen.type_func, function shen_user_lambda6545(Arg6544) {
  if (Arg6544.length < 6) return [Shen.type_func, shen_user_lambda6545, 6, Arg6544];
  var Arg6544_0 = Arg6544[0], Arg6544_1 = Arg6544[1], Arg6544_2 = Arg6544[2], Arg6544_3 = Arg6544[3], Arg6544_4 = Arg6544[4], Arg6544_5 = Arg6544[5];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6544_1, Shen.call(Shen.fns["declare"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg6544_2, Arg6544_4]), Shen.call(Shen.fns["shen.lazyderef"], [Arg6544_3, Arg6544_4])]), Arg6544_4, Arg6544_5]);})}, 6, [Arg6542_1, R0, Arg6542_0, Arg6542_2, Arg6542_3, Arg6542_4], undefined]]);}))}, 5, [], "shen.memo"];





Shen.fns["shen.<sig+rules>"] = [Shen.type_func, function shen_user_lambda6547(Arg6546) {
  if (Arg6546.length < 1) return [Shen.type_func, shen_user_lambda6547, 1, Arg6546];
  var Arg6546_0 = Arg6546[0];
  var R0, R1;
  return (((R0 = Shen.call(Shen.fns["shen.<signature>"], [Arg6546_0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R0))))
  ? ((R1 = Shen.call(Shen.fns["shen.<rules>"], [R0])),
  (((!Shen.unwind_tail(Shen.$eq$(Shen.fail_obj, R1))))
  ? (R0 = Shen.call(Shen.fns["shen.pair"], [R1[1], [Shen.type_cons, Shen.call(Shen.fns["shen.hdtl"], [R0]), Shen.call(Shen.fns["shen.hdtl"], [R1])]]))
  : (R0 = Shen.fail_obj)))
  : (R0 = Shen.fail_obj))),
  ((Shen.unwind_tail(Shen.$eq$(R0, Shen.fail_obj)))
  ? Shen.fail_obj
  : R0))}, 1, [], "shen.<sig+rules>"];





Shen.fns["shen.ue"] = [Shen.type_func, function shen_user_lambda6549(Arg6548) {
  if (Arg6548.length < 1) return [Shen.type_func, shen_user_lambda6549, 1, Arg6548];
  var Arg6548_0 = Arg6548[0];
  return (((Shen.is_type(Arg6548_0, Shen.type_cons) && (Shen.is_type(Arg6548_0[2], Shen.type_cons) && (Shen.empty$question$(Arg6548_0[2][2]) && Shen.unwind_tail(Shen.$eq$(Arg6548_0[1], [Shen.type_symbol, "protect"]))))))
  ? Arg6548_0
  : ((Shen.is_type(Arg6548_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda6551(Arg6550) {
  if (Arg6550.length < 1) return [Shen.type_func, shen_user_lambda6551, 1, Arg6550];
  var Arg6550_0 = Arg6550[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.ue"], [Arg6550_0]);})}, 1, [], undefined], Arg6548_0]);})
  : ((Shen.call(Shen.fns["variable?"], [Arg6548_0]))
  ? (function() {
  return Shen.call_tail(Shen.fns["concat"], [[Shen.type_symbol, "&&"], Arg6548_0]);})
  : Arg6548_0)))}, 1, [], "shen.ue"];





Shen.fns["shen.ue-sig"] = [Shen.type_func, function shen_user_lambda6553(Arg6552) {
  if (Arg6552.length < 1) return [Shen.type_func, shen_user_lambda6553, 1, Arg6552];
  var Arg6552_0 = Arg6552[0];
  return ((Shen.is_type(Arg6552_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda6555(Arg6554) {
  if (Arg6554.length < 1) return [Shen.type_func, shen_user_lambda6555, 1, Arg6554];
  var Arg6554_0 = Arg6554[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.ue-sig"], [Arg6554_0]);})}, 1, [], undefined], Arg6552_0]);})
  : ((Shen.call(Shen.fns["variable?"], [Arg6552_0]))
  ? (function() {
  return Shen.call_tail(Shen.fns["concat"], [[Shen.type_symbol, "&&&"], Arg6552_0]);})
  : Arg6552_0))}, 1, [], "shen.ue-sig"];





Shen.fns["shen.ues"] = [Shen.type_func, function shen_user_lambda6557(Arg6556) {
  if (Arg6556.length < 1) return [Shen.type_func, shen_user_lambda6557, 1, Arg6556];
  var Arg6556_0 = Arg6556[0];
  return ((Shen.call(Shen.fns["shen.ue?"], [Arg6556_0]))
  ? [Shen.type_cons, Arg6556_0, []]
  : ((Shen.is_type(Arg6556_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["union"], [Shen.call(Shen.fns["shen.ues"], [Arg6556_0[1]]), Shen.call(Shen.fns["shen.ues"], [Arg6556_0[2]])]);})
  : []))}, 1, [], "shen.ues"];





Shen.fns["shen.ue?"] = [Shen.type_func, function shen_user_lambda6559(Arg6558) {
  if (Arg6558.length < 1) return [Shen.type_func, shen_user_lambda6559, 1, Arg6558];
  var Arg6558_0 = Arg6558[0];
  return (Shen.is_type(Arg6558_0, Shen.type_symbol) && Shen.call(Shen.fns["shen.ue-h?"], [Shen.str(Arg6558_0)]))}, 1, [], "shen.ue?"];





Shen.fns["shen.ue-h?"] = [Shen.type_func, function shen_user_lambda6561(Arg6560) {
  if (Arg6560.length < 1) return [Shen.type_func, shen_user_lambda6561, 1, Arg6560];
  var Arg6560_0 = Arg6560[0];
  return (((Shen.call(Shen.fns["shen.+string?"], [Arg6560_0]) && (Shen.unwind_tail(Shen.$eq$("&", Arg6560_0[0])) && (Shen.call(Shen.fns["shen.+string?"], [Shen.tlstr(Arg6560_0)]) && Shen.unwind_tail(Shen.$eq$("&", Shen.tlstr(Arg6560_0)[0]))))))
  ? true
  : false)}, 1, [], "shen.ue-h?"];





Shen.fns["shen.t*-rules"] = [Shen.type_func, function shen_user_lambda6563(Arg6562) {
  if (Arg6562.length < 7) return [Shen.type_func, shen_user_lambda6563, 7, Arg6562];
  var Arg6562_0 = Arg6562[0], Arg6562_1 = Arg6562[1], Arg6562_2 = Arg6562[2], Arg6562_3 = Arg6562[3], Arg6562_4 = Arg6562[4], Arg6562_5 = Arg6562[5], Arg6562_6 = Arg6562[6];
  var R0, R1, R2, R3, R4;
  return ((R0 = Shen.call(Shen.fns["shen.catchpoint"], [])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.cutpoint"], [R0, (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6562_0, Arg6562_5])),
  ((Shen.empty$question$(R1))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.unwind_tail(Shen.thaw(Arg6562_6))))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6562_0, Arg6562_5])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6562_5])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R2[1], Arg6562_5])),
  ((Shen.empty$question$(R3))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6562_5])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R2 = R3[1]),
  (R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6562_5])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R1[2]),
  (R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6562_1, Arg6562_5])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R4 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6562_5])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "-->"], R4)))
  ? ((R4 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6562_5])),
  ((Shen.is_type(R4, Shen.type_cons))
  ? ((R1 = R4[1]),
  (R4 = Shen.call(Shen.fns["shen.lazyderef"], [R4[2], Arg6562_5])),
  ((Shen.empty$question$(R4))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["shen.t*-rule"], [[Shen.type_cons, [], [Shen.type_cons, Shen.call(Shen.fns["shen.ue"], [R2]), []]], R1, Arg6562_4, Arg6562_5, [Shen.type_func, function shen_user_lambda6565(Arg6564) {
  if (Arg6564.length < 11) return [Shen.type_func, shen_user_lambda6565, 11, Arg6564];
  var Arg6564_0 = Arg6564[0], Arg6564_1 = Arg6564[1], Arg6564_2 = Arg6564[2], Arg6564_3 = Arg6564[3], Arg6564_4 = Arg6564[4], Arg6564_5 = Arg6564[5], Arg6564_6 = Arg6564[6], Arg6564_7 = Arg6564[7], Arg6564_8 = Arg6564[8], Arg6564_9 = Arg6564[9], Arg6564_10 = Arg6564[10];
  return (function() {
  return Shen.call_tail(Shen.fns["cut"], [Arg6564_4, Arg6564_9, [Shen.type_func, function shen_user_lambda6567(Arg6566) {
  if (Arg6566.length < 8) return [Shen.type_func, shen_user_lambda6567, 8, Arg6566];
  var Arg6566_0 = Arg6566[0], Arg6566_1 = Arg6566[1], Arg6566_2 = Arg6566[2], Arg6566_3 = Arg6566[3], Arg6566_4 = Arg6566[4], Arg6566_5 = Arg6566[5], Arg6566_6 = Arg6566[6], Arg6566_7 = Arg6566[7];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.t*-rules"], [Arg6566_1, Arg6566_2, (Arg6566_3 + 1), Arg6566_4, Arg6566_5, Arg6566_6, Arg6566_7]);})}, 8, [Arg6564_4, Arg6564_1, Arg6564_2, Arg6564_7, Arg6564_8, Arg6564_6, Arg6564_9, Arg6564_10], undefined]]);})}, 11, [R2, R3, R1, Arg6562_0, R0, Arg6562_1, Arg6562_4, Arg6562_2, Arg6562_3, Arg6562_5, Arg6562_6], undefined]])))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6562_0, Arg6562_5])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = R1[1]),
  (R1 = R1[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["shen.t*-rule"], [Shen.call(Shen.fns["shen.ue"], [R2]), Arg6562_1, Arg6562_4, Arg6562_5, [Shen.type_func, function shen_user_lambda6569(Arg6568) {
  if (Arg6568.length < 13) return [Shen.type_func, shen_user_lambda6569, 13, Arg6568];
  var Arg6568_0 = Arg6568[0], Arg6568_1 = Arg6568[1], Arg6568_2 = Arg6568[2], Arg6568_3 = Arg6568[3], Arg6568_4 = Arg6568[4], Arg6568_5 = Arg6568[5], Arg6568_6 = Arg6568[6], Arg6568_7 = Arg6568[7], Arg6568_8 = Arg6568[8], Arg6568_9 = Arg6568[9], Arg6568_10 = Arg6568[10], Arg6568_11 = Arg6568[11], Arg6568_12 = Arg6568[12];
  return (function() {
  return Shen.call_tail(Shen.fns["cut"], [Arg6568_1, Arg6568_7, [Shen.type_func, function shen_user_lambda6571(Arg6570) {
  if (Arg6570.length < 8) return [Shen.type_func, shen_user_lambda6571, 8, Arg6570];
  var Arg6570_0 = Arg6570[0], Arg6570_1 = Arg6570[1], Arg6570_2 = Arg6570[2], Arg6570_3 = Arg6570[3], Arg6570_4 = Arg6570[4], Arg6570_5 = Arg6570[5], Arg6570_6 = Arg6570[6], Arg6570_7 = Arg6570[7];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.t*-rules"], [Arg6570_1, Arg6570_2, (Arg6570_3 + 1), Arg6570_4, Arg6570_5, Arg6570_6, Arg6570_7]);})}, 8, [Arg6568_1, Arg6568_2, Arg6568_3, Arg6568_4, Arg6568_5, Arg6568_6, Arg6568_7, Arg6568_8], undefined]]);})}, 13, [R2, R0, R1, Arg6562_1, Arg6562_2, Arg6562_3, Arg6562_4, Arg6562_5, Arg6562_6, Arg6562_2, Arg6562_3, Arg6562_5, Arg6562_6], undefined]])))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? ((R1 = Shen.call(Shen.fns["shen.newpv"], [Arg6562_5])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  Shen.call(Shen.fns["bind"], [R1, Shen.simple_error(("type error in rule " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg6562_2, Arg6562_5]), (" of " + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["shen.lazyderef"], [Arg6562_3, Arg6562_5]), "", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]]))), Arg6562_5, Arg6562_6]))
  : R1))
  : R1))
  : R1))]);}))}, 7, [], "shen.t*-rules"];





Shen.fns["shen.t*-rule"] = [Shen.type_func, function shen_user_lambda6573(Arg6572) {
  if (Arg6572.length < 5) return [Shen.type_func, shen_user_lambda6573, 5, Arg6572];
  var Arg6572_0 = Arg6572[0], Arg6572_1 = Arg6572[1], Arg6572_2 = Arg6572[2], Arg6572_3 = Arg6572[3], Arg6572_4 = Arg6572[4];
  var R0, R1, R2, R3, R4, R5, R6;
  return ((R0 = Shen.call(Shen.fns["shen.catchpoint"], [])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.cutpoint"], [R0, (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6572_0, Arg6572_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6572_3])),
  ((Shen.empty$question$(R2))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6572_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R1 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6572_3])),
  ((Shen.empty$question$(R2))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["cut"], [R0, Arg6572_3, [Shen.type_func, function shen_user_lambda6575(Arg6574) {
  if (Arg6574.length < 7) return [Shen.type_func, shen_user_lambda6575, 7, Arg6574];
  var Arg6574_0 = Arg6574[0], Arg6574_1 = Arg6574[1], Arg6574_2 = Arg6574[2], Arg6574_3 = Arg6574[3], Arg6574_4 = Arg6574[4], Arg6574_5 = Arg6574[5], Arg6574_6 = Arg6574[6];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.t*-action"], [Shen.call(Shen.fns["shen.curry"], [Arg6574_0]), Arg6574_2, Arg6574_4, Arg6574_5, Arg6574_6]);})}, 7, [R1, Arg6572_0, Arg6572_1, R0, Arg6572_2, Arg6572_3, Arg6572_4], undefined]])))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6572_0, Arg6572_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6572_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R3 = R2[1]),
  (R2 = R2[2]),
  (R1 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6572_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R4 = R1[1]),
  (R1 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6572_3])),
  ((Shen.empty$question$(R1))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6572_1, Arg6572_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R5 = R1[1]),
  (R1 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6572_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R6 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6572_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "-->"], R6)))
  ? ((R6 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6572_3])),
  ((Shen.is_type(R6, Shen.type_cons))
  ? ((R1 = R6[1]),
  (R6 = Shen.call(Shen.fns["shen.lazyderef"], [R6[2], Arg6572_3])),
  ((Shen.empty$question$(R6))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  Shen.call(Shen.fns["shen.t*-pattern"], [R3, R5, Arg6572_3, [Shen.type_func, function shen_user_lambda6577(Arg6576) {
  if (Arg6576.length < 9) return [Shen.type_func, shen_user_lambda6577, 9, Arg6576];
  var Arg6576_0 = Arg6576[0], Arg6576_1 = Arg6576[1], Arg6576_2 = Arg6576[2], Arg6576_3 = Arg6576[3], Arg6576_4 = Arg6576[4], Arg6576_5 = Arg6576[5], Arg6576_6 = Arg6576[6], Arg6576_7 = Arg6576[7], Arg6576_8 = Arg6576[8];
  return (function() {
  return Shen.call_tail(Shen.fns["cut"], [Arg6576_0, Arg6576_7, [Shen.type_func, function shen_user_lambda6579(Arg6578) {
  if (Arg6578.length < 9) return [Shen.type_func, shen_user_lambda6579, 9, Arg6578];
  var Arg6578_0 = Arg6578[0], Arg6578_1 = Arg6578[1], Arg6578_2 = Arg6578[2], Arg6578_3 = Arg6578[3], Arg6578_4 = Arg6578[4], Arg6578_5 = Arg6578[5], Arg6578_6 = Arg6578[6], Arg6578_7 = Arg6578[7], Arg6578_8 = Arg6578[8];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.t*-rule"], [[Shen.type_cons, Arg6578_1, [Shen.type_cons, Arg6578_2, []]], Arg6578_3, [Shen.type_cons, [Shen.type_cons, Arg6578_4, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Arg6578_5, []]]], Arg6578_6], Arg6578_7, Arg6578_8]);})}, 9, [Arg6576_0, Arg6576_1, Arg6576_2, Arg6576_3, Arg6576_4, Arg6576_5, Arg6576_6, Arg6576_7, Arg6576_8], undefined]]);})}, 9, [R0, R2, R4, R1, R3, R5, Arg6572_2, Arg6572_3, Arg6572_4], undefined]]))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : R1))]);}))}, 5, [], "shen.t*-rule"];





Shen.fns["shen.t*-action"] = [Shen.type_func, function shen_user_lambda6581(Arg6580) {
  if (Arg6580.length < 5) return [Shen.type_func, shen_user_lambda6581, 5, Arg6580];
  var Arg6580_0 = Arg6580[0], Arg6580_1 = Arg6580[1], Arg6580_2 = Arg6580[2], Arg6580_3 = Arg6580[3], Arg6580_4 = Arg6580[4];
  var R0, R1, R2, R3, R4;
  return ((R0 = Shen.call(Shen.fns["shen.catchpoint"], [])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.cutpoint"], [R0, (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6580_0, Arg6580_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6580_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "where"], R2)))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6580_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R1 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6580_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R3 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6580_3])),
  ((Shen.empty$question$(R2))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["cut"], [R0, Arg6580_3, [Shen.type_func, function shen_user_lambda6583(Arg6582) {
  if (Arg6582.length < 8) return [Shen.type_func, shen_user_lambda6583, 8, Arg6582];
  var Arg6582_0 = Arg6582[0], Arg6582_1 = Arg6582[1], Arg6582_2 = Arg6582[2], Arg6582_3 = Arg6582[3], Arg6582_4 = Arg6582[4], Arg6582_5 = Arg6582[5], Arg6582_6 = Arg6582[6], Arg6582_7 = Arg6582[7];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.t*"], [[Shen.type_cons, Arg6582_1, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "boolean"], []]]], Arg6582_5, Arg6582_6, [Shen.type_func, function shen_user_lambda6585(Arg6584) {
  if (Arg6584.length < 7) return [Shen.type_func, shen_user_lambda6585, 7, Arg6584];
  var Arg6584_0 = Arg6584[0], Arg6584_1 = Arg6584[1], Arg6584_2 = Arg6584[2], Arg6584_3 = Arg6584[3], Arg6584_4 = Arg6584[4], Arg6584_5 = Arg6584[5], Arg6584_6 = Arg6584[6];
  return (function() {
  return Shen.call_tail(Shen.fns["cut"], [Arg6584_0, Arg6584_5, [Shen.type_func, function shen_user_lambda6587(Arg6586) {
  if (Arg6586.length < 7) return [Shen.type_func, shen_user_lambda6587, 7, Arg6586];
  var Arg6586_0 = Arg6586[0], Arg6586_1 = Arg6586[1], Arg6586_2 = Arg6586[2], Arg6586_3 = Arg6586[3], Arg6586_4 = Arg6586[4], Arg6586_5 = Arg6586[5], Arg6586_6 = Arg6586[6];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.t*-action"], [Arg6586_1, Arg6586_2, [Shen.type_cons, [Shen.type_cons, Arg6586_3, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, [Shen.type_symbol, "verified"], []]]], Arg6586_4], Arg6586_5, Arg6586_6]);})}, 7, [Arg6584_0, Arg6584_1, Arg6584_2, Arg6584_3, Arg6584_4, Arg6584_5, Arg6584_6], undefined]]);})}, 7, [Arg6582_2, Arg6582_0, Arg6582_4, Arg6582_1, Arg6582_5, Arg6582_6, Arg6582_7], undefined]]);})}, 8, [R3, R1, R0, Arg6580_0, Arg6580_1, Arg6580_2, Arg6580_3, Arg6580_4], undefined]])))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6580_0, Arg6580_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6580_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.choicepoint!"], R2)))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6580_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R1 = Shen.call(Shen.fns["shen.lazyderef"], [R2[1], Arg6580_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6580_3])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R4 = Shen.call(Shen.fns["shen.lazyderef"], [R3[1], Arg6580_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "fail-if"], R4)))
  ? ((R4 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6580_3])),
  ((Shen.is_type(R4, Shen.type_cons))
  ? ((R3 = R4[1]),
  (R4 = Shen.call(Shen.fns["shen.lazyderef"], [R4[2], Arg6580_3])),
  ((Shen.empty$question$(R4))
  ? ((R4 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6580_3])),
  ((Shen.is_type(R4, Shen.type_cons))
  ? ((R1 = R4[1]),
  (R4 = Shen.call(Shen.fns["shen.lazyderef"], [R4[2], Arg6580_3])),
  ((Shen.empty$question$(R4))
  ? ((R4 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6580_3])),
  ((Shen.empty$question$(R4))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["cut"], [R0, Arg6580_3, [Shen.type_func, function shen_user_lambda6589(Arg6588) {
  if (Arg6588.length < 8) return [Shen.type_func, shen_user_lambda6589, 8, Arg6588];
  var Arg6588_0 = Arg6588[0], Arg6588_1 = Arg6588[1], Arg6588_2 = Arg6588[2], Arg6588_3 = Arg6588[3], Arg6588_4 = Arg6588[4], Arg6588_5 = Arg6588[5], Arg6588_6 = Arg6588[6], Arg6588_7 = Arg6588[7];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.t*-action"], [[Shen.type_cons, [Shen.type_symbol, "where"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "not"], [Shen.type_cons, [Shen.type_cons, Arg6588_0, [Shen.type_cons, Arg6588_1, []]], []]], [Shen.type_cons, Arg6588_1, []]]], Arg6588_4, Arg6588_5, Arg6588_6, Arg6588_7]);})}, 8, [R3, R1, R0, Arg6580_0, Arg6580_1, Arg6580_2, Arg6580_3, Arg6580_4], undefined]])))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (((R1 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6580_0, Arg6580_3])),
  ((Shen.is_type(R1, Shen.type_cons))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[1], Arg6580_3])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "shen.choicepoint!"], R2)))
  ? ((R2 = Shen.call(Shen.fns["shen.lazyderef"], [R1[2], Arg6580_3])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R1 = R2[1]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [R2[2], Arg6580_3])),
  ((Shen.empty$question$(R2))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.call(Shen.fns["cut"], [R0, Arg6580_3, [Shen.type_func, function shen_user_lambda6591(Arg6590) {
  if (Arg6590.length < 7) return [Shen.type_func, shen_user_lambda6591, 7, Arg6590];
  var Arg6590_0 = Arg6590[0], Arg6590_1 = Arg6590[1], Arg6590_2 = Arg6590[2], Arg6590_3 = Arg6590[3], Arg6590_4 = Arg6590[4], Arg6590_5 = Arg6590[5], Arg6590_6 = Arg6590[6];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.t*-action"], [[Shen.type_cons, [Shen.type_symbol, "where"], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "not"], [Shen.type_cons, [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "="], [Shen.type_cons, Arg6590_1, []]], [Shen.type_cons, [Shen.type_cons, [Shen.type_symbol, "fail"], []], []]], []]], [Shen.type_cons, Arg6590_1, []]]], Arg6590_3, Arg6590_4, Arg6590_5, Arg6590_6]);})}, 7, [R0, R1, Arg6580_0, Arg6580_1, Arg6580_2, Arg6580_3, Arg6580_4], undefined]])))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false)))
  : (R1 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R1, false)))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  Shen.call(Shen.fns["shen.t*"], [[Shen.type_cons, Arg6580_0, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Arg6580_1, []]]], Arg6580_2, Arg6580_3, Arg6580_4]))
  : R1))
  : R1))
  : R1))]);}))}, 5, [], "shen.t*-action"];





Shen.fns["shen.t*-pattern"] = [Shen.type_func, function shen_user_lambda6593(Arg6592) {
  if (Arg6592.length < 4) return [Shen.type_func, shen_user_lambda6593, 4, Arg6592];
  var Arg6592_0 = Arg6592[0], Arg6592_1 = Arg6592[1], Arg6592_2 = Arg6592[2], Arg6592_3 = Arg6592[3];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["shen.catchpoint"], [])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.cutpoint"], [R0, ((R1 = Shen.call(Shen.fns["shen.newpv"], [Arg6592_2])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  Shen.call(Shen.fns["shen.tms->hyp"], [Shen.call(Shen.fns["shen.ues"], [Arg6592_0]), R1, Arg6592_2, [Shen.type_func, function shen_user_lambda6595(Arg6594) {
  if (Arg6594.length < 6) return [Shen.type_func, shen_user_lambda6595, 6, Arg6594];
  var Arg6594_0 = Arg6594[0], Arg6594_1 = Arg6594[1], Arg6594_2 = Arg6594[2], Arg6594_3 = Arg6594[3], Arg6594_4 = Arg6594[4], Arg6594_5 = Arg6594[5];
  return (function() {
  return Shen.call_tail(Shen.fns["cut"], [Arg6594_0, Arg6594_4, [Shen.type_func, function shen_user_lambda6597(Arg6596) {
  if (Arg6596.length < 6) return [Shen.type_func, shen_user_lambda6597, 6, Arg6596];
  var Arg6596_0 = Arg6596[0], Arg6596_1 = Arg6596[1], Arg6596_2 = Arg6596[2], Arg6596_3 = Arg6596[3], Arg6596_4 = Arg6596[4], Arg6596_5 = Arg6596[5];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.t*"], [[Shen.type_cons, Arg6596_1, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, Arg6596_2, []]]], Arg6596_3, Arg6596_4, Arg6596_5]);})}, 6, [Arg6594_0, Arg6594_1, Arg6594_2, Arg6594_3, Arg6594_4, Arg6594_5], undefined]]);})}, 6, [R0, Arg6592_0, Arg6592_1, R1, Arg6592_2, Arg6592_3], undefined]]))]);}))}, 4, [], "shen.t*-pattern"];





Shen.fns["shen.tms->hyp"] = [Shen.type_func, function shen_user_lambda6599(Arg6598) {
  if (Arg6598.length < 4) return [Shen.type_func, shen_user_lambda6599, 4, Arg6598];
  var Arg6598_0 = Arg6598[0], Arg6598_1 = Arg6598[1], Arg6598_2 = Arg6598[2], Arg6598_3 = Arg6598[3];
  var R0, R1, R2, R3, R4, R5, R6;
  return (((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6598_0, Arg6598_2])),
  ((Shen.empty$question$(R0))
  ? ((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6598_1, Arg6598_2])),
  ((Shen.empty$question$(R0))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (R0 = Shen.unwind_tail(Shen.thaw(Arg6598_3))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R0]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R0, [], Arg6598_2]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R1 = Shen.unwind_tail(Shen.thaw(Arg6598_3)))),
  Shen.call(Shen.fns["shen.unbindv"], [R0, Arg6598_2]),
  (R0 = R1))
  : (R0 = false))))
  : (R0 = false))),
  ((Shen.unwind_tail(Shen.$eq$(R0, false)))
  ? ((R0 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6598_0, Arg6598_2])),
  ((Shen.is_type(R0, Shen.type_cons))
  ? ((R1 = R0[1]),
  (R0 = R0[2]),
  (R2 = Shen.call(Shen.fns["shen.lazyderef"], [Arg6598_1, Arg6598_2])),
  ((Shen.is_type(R2, Shen.type_cons))
  ? ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R2[1], Arg6598_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R4 = R3[1]),
  (R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6598_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? ((R5 = Shen.call(Shen.fns["shen.lazyderef"], [R3[1], Arg6598_2])),
  ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":"], R5)))
  ? ((R5 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6598_2])),
  ((Shen.is_type(R5, Shen.type_cons))
  ? (R5[1],
  (R5 = Shen.call(Shen.fns["shen.lazyderef"], [R5[2], Arg6598_2])),
  ((Shen.empty$question$(R5))
  ? ((R5 = R2[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (function() {
  return Shen.call_tail(Shen.fns["unify!"], [R4, R1, Arg6598_2, [Shen.type_func, function shen_user_lambda6601(Arg6600) {
  if (Arg6600.length < 6) return [Shen.type_func, shen_user_lambda6601, 6, Arg6600];
  var Arg6600_0 = Arg6600[0], Arg6600_1 = Arg6600[1], Arg6600_2 = Arg6600[2], Arg6600_3 = Arg6600[3], Arg6600_4 = Arg6600[4], Arg6600_5 = Arg6600[5];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.tms->hyp"], [Arg6600_2, Arg6600_3, Arg6600_4, Arg6600_5]);})}, 6, [R4, R1, R0, R5, Arg6598_2, Arg6598_3], undefined]]);}))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R5]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R5, [], Arg6598_2]),
  ((R3 = R2[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["unify!"], [R4, R1, Arg6598_2, [Shen.type_func, function shen_user_lambda6603(Arg6602) {
  if (Arg6602.length < 8) return [Shen.type_func, shen_user_lambda6603, 8, Arg6602];
  var Arg6602_0 = Arg6602[0], Arg6602_1 = Arg6602[1], Arg6602_2 = Arg6602[2], Arg6602_3 = Arg6602[3], Arg6602_4 = Arg6602[4], Arg6602_5 = Arg6602[5], Arg6602_6 = Arg6602[6], Arg6602_7 = Arg6602[7];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.tms->hyp"], [Arg6602_2, Arg6602_3, Arg6602_4, Arg6602_5]);})}, 8, [R4, R1, R0, R3, Arg6598_2, Arg6598_3, R5, Arg6598_2], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R5, Arg6598_2]),
  R4)
  : false)))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R5]))
  ? ((R3 = Shen.call(Shen.fns["shen.newpv"], [Arg6598_2])),
  Shen.call(Shen.fns["shen.bindv"], [R5, [Shen.type_cons, R3, []], Arg6598_2]),
  ((R3 = R2[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["unify!"], [R4, R1, Arg6598_2, [Shen.type_func, function shen_user_lambda6605(Arg6604) {
  if (Arg6604.length < 8) return [Shen.type_func, shen_user_lambda6605, 8, Arg6604];
  var Arg6604_0 = Arg6604[0], Arg6604_1 = Arg6604[1], Arg6604_2 = Arg6604[2], Arg6604_3 = Arg6604[3], Arg6604_4 = Arg6604[4], Arg6604_5 = Arg6604[5], Arg6604_6 = Arg6604[6], Arg6604_7 = Arg6604[7];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.tms->hyp"], [Arg6604_2, Arg6604_3, Arg6604_4, Arg6604_5]);})}, 8, [R4, R1, R0, R3, Arg6598_2, Arg6598_3, R5, Arg6598_2], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R5, Arg6598_2]),
  R4)
  : false)))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R5]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R5, [Shen.type_symbol, ":"], Arg6598_2]),
  ((R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6598_2])),
  ((Shen.is_type(R3, Shen.type_cons))
  ? (R3[1],
  (R3 = Shen.call(Shen.fns["shen.lazyderef"], [R3[2], Arg6598_2])),
  ((Shen.empty$question$(R3))
  ? ((R3 = R2[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["unify!"], [R4, R1, Arg6598_2, [Shen.type_func, function shen_user_lambda6607(Arg6606) {
  if (Arg6606.length < 8) return [Shen.type_func, shen_user_lambda6607, 8, Arg6606];
  var Arg6606_0 = Arg6606[0], Arg6606_1 = Arg6606[1], Arg6606_2 = Arg6606[2], Arg6606_3 = Arg6606[3], Arg6606_4 = Arg6606[4], Arg6606_5 = Arg6606[5], Arg6606_6 = Arg6606[6], Arg6606_7 = Arg6606[7];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.tms->hyp"], [Arg6606_2, Arg6606_3, Arg6606_4, Arg6606_5]);})}, 8, [R4, R1, R0, R3, Arg6598_2, Arg6598_3, R5, Arg6598_2], undefined]])))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? (Shen.call(Shen.fns["shen.bindv"], [R3, [], Arg6598_2]),
  ((R2 = R2[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R4 = Shen.call(Shen.fns["unify!"], [R4, R1, Arg6598_2, [Shen.type_func, function shen_user_lambda6609(Arg6608) {
  if (Arg6608.length < 10) return [Shen.type_func, shen_user_lambda6609, 10, Arg6608];
  var Arg6608_0 = Arg6608[0], Arg6608_1 = Arg6608[1], Arg6608_2 = Arg6608[2], Arg6608_3 = Arg6608[3], Arg6608_4 = Arg6608[4], Arg6608_5 = Arg6608[5], Arg6608_6 = Arg6608[6], Arg6608_7 = Arg6608[7], Arg6608_8 = Arg6608[8], Arg6608_9 = Arg6608[9];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.tms->hyp"], [Arg6608_2, Arg6608_3, Arg6608_4, Arg6608_5]);})}, 10, [R4, R1, R0, R2, Arg6598_2, Arg6598_3, R3, Arg6598_2, R5, Arg6598_2], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6598_2]),
  (R4 = R4))
  : (R4 = false))))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? ((R6 = Shen.call(Shen.fns["shen.newpv"], [Arg6598_2])),
  Shen.call(Shen.fns["shen.bindv"], [R3, [Shen.type_cons, R6, []], Arg6598_2]),
  ((R6 = R2[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R6 = Shen.call(Shen.fns["unify!"], [R4, R1, Arg6598_2, [Shen.type_func, function shen_user_lambda6611(Arg6610) {
  if (Arg6610.length < 10) return [Shen.type_func, shen_user_lambda6611, 10, Arg6610];
  var Arg6610_0 = Arg6610[0], Arg6610_1 = Arg6610[1], Arg6610_2 = Arg6610[2], Arg6610_3 = Arg6610[3], Arg6610_4 = Arg6610[4], Arg6610_5 = Arg6610[5], Arg6610_6 = Arg6610[6], Arg6610_7 = Arg6610[7], Arg6610_8 = Arg6610[8], Arg6610_9 = Arg6610[9];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.tms->hyp"], [Arg6610_2, Arg6610_3, Arg6610_4, Arg6610_5]);})}, 10, [R4, R1, R0, R6, Arg6598_2, Arg6598_3, R3, Arg6598_2, R5, Arg6598_2], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6598_2]),
  (R4 = R6))
  : (R4 = false)))),
  Shen.call(Shen.fns["shen.unbindv"], [R5, Arg6598_2]),
  R4)
  : false)))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? ((R5 = Shen.call(Shen.fns["shen.newpv"], [Arg6598_2])),
  Shen.call(Shen.fns["shen.bindv"], [R3, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, R5, []]], Arg6598_2]),
  ((R5 = R2[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["unify!"], [R4, R1, Arg6598_2, [Shen.type_func, function shen_user_lambda6613(Arg6612) {
  if (Arg6612.length < 8) return [Shen.type_func, shen_user_lambda6613, 8, Arg6612];
  var Arg6612_0 = Arg6612[0], Arg6612_1 = Arg6612[1], Arg6612_2 = Arg6612[2], Arg6612_3 = Arg6612[3], Arg6612_4 = Arg6612[4], Arg6612_5 = Arg6612[5], Arg6612_6 = Arg6612[6], Arg6612_7 = Arg6612[7];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.tms->hyp"], [Arg6612_2, Arg6612_3, Arg6612_4, Arg6612_5]);})}, 8, [R4, R1, R0, R5, Arg6598_2, Arg6598_3, R3, Arg6598_2], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6598_2]),
  R5)
  : false)))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R3]))
  ? ((R4 = Shen.call(Shen.fns["shen.newpv"], [Arg6598_2])),
  (R5 = Shen.call(Shen.fns["shen.newpv"], [Arg6598_2])),
  Shen.call(Shen.fns["shen.bindv"], [R3, [Shen.type_cons, R4, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, R5, []]]], Arg6598_2]),
  ((R5 = R2[2]),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["unify!"], [R4, R1, Arg6598_2, [Shen.type_func, function shen_user_lambda6615(Arg6614) {
  if (Arg6614.length < 8) return [Shen.type_func, shen_user_lambda6615, 8, Arg6614];
  var Arg6614_0 = Arg6614[0], Arg6614_1 = Arg6614[1], Arg6614_2 = Arg6614[2], Arg6614_3 = Arg6614[3], Arg6614_4 = Arg6614[4], Arg6614_5 = Arg6614[5], Arg6614_6 = Arg6614[6], Arg6614_7 = Arg6614[7];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.tms->hyp"], [Arg6614_2, Arg6614_3, Arg6614_4, Arg6614_5]);})}, 8, [R4, R1, R0, R5, Arg6598_2, Arg6598_3, R3, Arg6598_2], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R3, Arg6598_2]),
  R5)
  : false)))
  : ((Shen.call(Shen.fns["shen.pvar?"], [R2]))
  ? ((R3 = Shen.call(Shen.fns["shen.newpv"], [Arg6598_2])),
  (R4 = Shen.call(Shen.fns["shen.newpv"], [Arg6598_2])),
  (R5 = Shen.call(Shen.fns["shen.newpv"], [Arg6598_2])),
  Shen.call(Shen.fns["shen.bindv"], [R2, [Shen.type_cons, [Shen.type_cons, R3, [Shen.type_cons, [Shen.type_symbol, ":"], [Shen.type_cons, R4, []]]], R5], Arg6598_2]),
  (Shen.call(Shen.fns["shen.incinfs"], []),
  (R5 = Shen.call(Shen.fns["unify!"], [R3, R1, Arg6598_2, [Shen.type_func, function shen_user_lambda6617(Arg6616) {
  if (Arg6616.length < 8) return [Shen.type_func, shen_user_lambda6617, 8, Arg6616];
  var Arg6616_0 = Arg6616[0], Arg6616_1 = Arg6616[1], Arg6616_2 = Arg6616[2], Arg6616_3 = Arg6616[3], Arg6616_4 = Arg6616[4], Arg6616_5 = Arg6616[5], Arg6616_6 = Arg6616[6], Arg6616_7 = Arg6616[7];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.tms->hyp"], [Arg6616_3, Arg6616_4, Arg6616_7, Arg6616_5]);})}, 8, [R4, R3, R1, R0, R5, Arg6598_3, R2, Arg6598_2], undefined]]))),
  Shen.call(Shen.fns["shen.unbindv"], [R2, Arg6598_2]),
  R5)
  : false)))
  : false))
  : R0))}, 4, [], "shen.tms->hyp"];





Shen.fns["findall"] = [Shen.type_func, function shen_user_lambda6619(Arg6618) {
  if (Arg6618.length < 5) return [Shen.type_func, shen_user_lambda6619, 5, Arg6618];
  var Arg6618_0 = Arg6618[0], Arg6618_1 = Arg6618[1], Arg6618_2 = Arg6618[2], Arg6618_3 = Arg6618[3], Arg6618_4 = Arg6618[4];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["shen.newpv"], [Arg6618_3])),
  (R1 = Shen.call(Shen.fns["shen.newpv"], [Arg6618_3])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (function() {
  return Shen.call_tail(Shen.fns["bind"], [R1, Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "shen.a"]]), Arg6618_3, [Shen.type_func, function shen_user_lambda6621(Arg6620) {
  if (Arg6620.length < 7) return [Shen.type_func, shen_user_lambda6621, 7, Arg6620];
  var Arg6620_0 = Arg6620[0], Arg6620_1 = Arg6620[1], Arg6620_2 = Arg6620[2], Arg6620_3 = Arg6620[3], Arg6620_4 = Arg6620[4], Arg6620_5 = Arg6620[5], Arg6620_6 = Arg6620[6];
  return (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6620_0, (Shen.globals[Shen.call(Shen.fns["shen.lazyderef"], [Arg6620_4, Arg6620_5])[1]] = []), Arg6620_5, [Shen.type_func, function shen_user_lambda6623(Arg6622) {
  if (Arg6622.length < 7) return [Shen.type_func, shen_user_lambda6623, 7, Arg6622];
  var Arg6622_0 = Arg6622[0], Arg6622_1 = Arg6622[1], Arg6622_2 = Arg6622[2], Arg6622_3 = Arg6622[3], Arg6622_4 = Arg6622[4], Arg6622_5 = Arg6622[5], Arg6622_6 = Arg6622[6];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.findallhelp"], [Arg6622_1, Arg6622_2, Arg6622_3, Arg6622_4, Arg6622_5, Arg6622_6]);})}, 7, [Arg6620_0, Arg6620_1, Arg6620_2, Arg6620_3, Arg6620_4, Arg6620_5, Arg6620_6], undefined]]);})}, 7, [R0, Arg6618_0, Arg6618_1, Arg6618_2, R1, Arg6618_3, Arg6618_4], undefined]]);}))}, 5, [], "findall"];





Shen.fns["shen.findallhelp"] = [Shen.type_func, function shen_user_lambda6625(Arg6624) {
  if (Arg6624.length < 6) return [Shen.type_func, shen_user_lambda6625, 6, Arg6624];
  var Arg6624_0 = Arg6624[0], Arg6624_1 = Arg6624[1], Arg6624_2 = Arg6624[2], Arg6624_3 = Arg6624[3], Arg6624_4 = Arg6624[4], Arg6624_5 = Arg6624[5];
  var R0;
  return ((Shen.call(Shen.fns["shen.incinfs"], []),
  (R0 = Shen.call(Shen.fns["call"], [Arg6624_1, Arg6624_4, [Shen.type_func, function shen_user_lambda6627(Arg6626) {
  if (Arg6626.length < 6) return [Shen.type_func, shen_user_lambda6627, 6, Arg6626];
  var Arg6626_0 = Arg6626[0], Arg6626_1 = Arg6626[1], Arg6626_2 = Arg6626[2], Arg6626_3 = Arg6626[3], Arg6626_4 = Arg6626[4], Arg6626_5 = Arg6626[5];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.remember"], [Arg6626_3, Arg6626_1, Arg6626_4, [Shen.type_func, function shen_user_lambda6629(Arg6628) {
  if (Arg6628.length < 4) return [Shen.type_func, shen_user_lambda6629, 4, Arg6628];
  var Arg6628_0 = Arg6628[0], Arg6628_1 = Arg6628[1], Arg6628_2 = Arg6628[2], Arg6628_3 = Arg6628[3];
  return (function() {
  return Shen.call_tail(Shen.fns["fwhen"], [false, Arg6628_2, Arg6628_3]);})}, 4, [Arg6626_3, Arg6626_1, Arg6626_4, Arg6626_5], undefined]]);})}, 6, [Arg6624_1, Arg6624_0, Arg6624_2, Arg6624_3, Arg6624_4, Arg6624_5], undefined]]))),
  ((Shen.unwind_tail(Shen.$eq$(R0, false)))
  ? (Shen.call(Shen.fns["shen.incinfs"], []),
  (function() {
  return Shen.call_tail(Shen.fns["bind"], [Arg6624_2, (Shen.globals[Shen.call(Shen.fns["shen.lazyderef"], [Arg6624_3, Arg6624_4])[1]]), Arg6624_4, Arg6624_5]);}))
  : R0))}, 6, [], "shen.findallhelp"];





Shen.fns["shen.remember"] = [Shen.type_func, function shen_user_lambda6631(Arg6630) {
  if (Arg6630.length < 4) return [Shen.type_func, shen_user_lambda6631, 4, Arg6630];
  var Arg6630_0 = Arg6630[0], Arg6630_1 = Arg6630[1], Arg6630_2 = Arg6630[2], Arg6630_3 = Arg6630[3];
  var R0;
  return ((R0 = Shen.call(Shen.fns["shen.newpv"], [Arg6630_2])),
  Shen.call(Shen.fns["shen.incinfs"], []),
  (function() {
  return Shen.call_tail(Shen.fns["bind"], [R0, (Shen.globals[Shen.call(Shen.fns["shen.deref"], [Arg6630_0, Arg6630_2])[1]] = [Shen.type_cons, Shen.call(Shen.fns["shen.deref"], [Arg6630_1, Arg6630_2]), (Shen.globals[Shen.call(Shen.fns["shen.deref"], [Arg6630_0, Arg6630_2])[1]])]), Arg6630_2, Arg6630_3]);}))}, 4, [], "shen.remember"];










Shen.fns["shen.shen"] = [Shen.type_func, function shen_user_lambda7842(Arg7841) {
  if (Arg7841.length < 0) return [Shen.type_func, shen_user_lambda7842, 0, Arg7841];
  return (Shen.call(Shen.fns["shen.credits"], []),
  (function() {
  return Shen.call_tail(Shen.fns["shen.loop"], []);}))}, 0, [], "shen.shen"];





Shen.fns["shen.loop"] = [Shen.type_func, function shen_user_lambda7846(Arg7843) {
  if (Arg7843.length < 0) return [Shen.type_func, shen_user_lambda7846, 0, Arg7843];
  var R0, R1;
  return (Shen.call(Shen.fns["shen.initialise_environment"], []),
  Shen.call(Shen.fns["shen.prompt"], []),
  (R0 = [Shen.type_func, function shen_user_lambda7848(Arg7847) {
  if (Arg7847.length < 0) return [Shen.type_func, shen_user_lambda7848, 0, Arg7847];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.read-evaluate-print"], []);})}, 0, [], undefined]),
  (R1 = [Shen.type_func, function shen_user_lambda7850(Arg7849) {
  if (Arg7849.length < 1) return [Shen.type_func, shen_user_lambda7850, 1, Arg7849];
  var Arg7849_0 = Arg7849[0];
  return (function() {
  return Shen.call_tail(Shen.fns["pr"], [Shen.error_to_string(Arg7849_0), Shen.call(Shen.fns["stoutput"], [])]);})}, 1, [], undefined]),
  Shen.trap_error(R0, R1),
  (function() {
  return Shen.call_tail(Shen.fns["shen.loop"], []);}))}, 0, [], "shen.loop"];





Shen.fns["shen.credits"] = [Shen.type_func, function shen_user_lambda7852(Arg7851) {
  if (Arg7851.length < 0) return [Shen.type_func, shen_user_lambda7852, 0, Arg7851];
  return (Shen.call(Shen.fns["shen.prhush"], ["\x0d\x0aShen 2010, copyright (C) 2010 Mark Tarver\x0d\x0a", Shen.call(Shen.fns["stoutput"], [])]),
  Shen.call(Shen.fns["shen.prhush"], ["released under the Shen license\x0d\x0a", Shen.call(Shen.fns["stoutput"], [])]),
  Shen.call(Shen.fns["shen.prhush"], [("www.shenlanguage.org, " + Shen.call(Shen.fns["shen.app"], [(Shen.globals["*version*"]), "\x0d\x0a", [Shen.type_symbol, "shen.a"]])), Shen.call(Shen.fns["stoutput"], [])]),
  Shen.call(Shen.fns["shen.prhush"], [("running under " + Shen.call(Shen.fns["shen.app"], [(Shen.globals["*language*"]), (", implementation: " + Shen.call(Shen.fns["shen.app"], [(Shen.globals["*implementation*"]), "", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])), Shen.call(Shen.fns["stoutput"], [])]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.prhush"], [("\x0d\x0aport " + Shen.call(Shen.fns["shen.app"], [(Shen.globals["*port*"]), (" ported by " + Shen.call(Shen.fns["shen.app"], [(Shen.globals["*porters*"]), "\x0d\x0a", [Shen.type_symbol, "shen.a"]])), [Shen.type_symbol, "shen.a"]])), Shen.call(Shen.fns["stoutput"], [])]);}))}, 0, [], "shen.credits"];





Shen.fns["shen.initialise_environment"] = [Shen.type_func, function shen_user_lambda7854(Arg7853) {
  if (Arg7853.length < 0) return [Shen.type_func, shen_user_lambda7854, 0, Arg7853];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.multiple-set"], [[Shen.type_cons, [Shen.type_symbol, "shen.*call*"], [Shen.type_cons, 0, [Shen.type_cons, [Shen.type_symbol, "shen.*infs*"], [Shen.type_cons, 0, [Shen.type_cons, [Shen.type_symbol, "shen.*process-counter*"], [Shen.type_cons, 0, [Shen.type_cons, [Shen.type_symbol, "shen.*catch*"], [Shen.type_cons, 0, []]]]]]]]]]);})}, 0, [], "shen.initialise_environment"];





Shen.fns["shen.multiple-set"] = [Shen.type_func, function shen_user_lambda7856(Arg7855) {
  if (Arg7855.length < 1) return [Shen.type_func, shen_user_lambda7856, 1, Arg7855];
  var Arg7855_0 = Arg7855[0];
  return ((Shen.empty$question$(Arg7855_0))
  ? []
  : (((Shen.is_type(Arg7855_0, Shen.type_cons) && Shen.is_type(Arg7855_0[2], Shen.type_cons)))
  ? ((Shen.globals[Arg7855_0[1][1]] = Arg7855_0[2][1]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.multiple-set"], [Arg7855_0[2][2]]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.multiple-set"]]);})))}, 1, [], "shen.multiple-set"];





Shen.fns["destroy"] = [Shen.type_func, function shen_user_lambda7858(Arg7857) {
  if (Arg7857.length < 1) return [Shen.type_func, shen_user_lambda7858, 1, Arg7857];
  var Arg7857_0 = Arg7857[0];
  return (function() {
  return Shen.call_tail(Shen.fns["declare"], [Arg7857_0, [Shen.type_symbol, "symbol"]]);})}, 1, [], "destroy"];





Shen.call_toplevel(function js$dot$shen_js_toplevel7861(Arg7859) {
  if (Arg7859.length < 0) return [Shen.type_func, js$dot$shen_js_toplevel7861, 0, Arg7859];
  return (Shen.globals["shen.*history*"] = [])});




Shen.fns["shen.read-evaluate-print"] = [Shen.type_func, function shen_user_lambda7863(Arg7862) {
  if (Arg7862.length < 0) return [Shen.type_func, shen_user_lambda7863, 0, Arg7862];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["shen.toplineread"], [])),
  (R1 = (Shen.globals["shen.*history*"])),
  (R0 = Shen.call(Shen.fns["shen.retrieve-from-history-if-needed"], [R0, R1])),
  Shen.call(Shen.fns["shen.update_history"], [R0, R1]),
  (R1 = Shen.call(Shen.fns["fst"], [R0])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.toplevel"], [R1]);}))}, 0, [], "shen.read-evaluate-print"];





Shen.fns["shen.retrieve-from-history-if-needed"] = [Shen.type_func, function shen_user_lambda7865(Arg7864) {
  if (Arg7864.length < 2) return [Shen.type_func, shen_user_lambda7865, 2, Arg7864];
  var Arg7864_0 = Arg7864[0], Arg7864_1 = Arg7864[1];
  var R0;
  return (((Shen.is_type(Arg7864_0, Shen.fns['shen.tuple']) && (Shen.is_type(Shen.call(Shen.fns["snd"], [Arg7864_0]), Shen.type_cons) && Shen.call(Shen.fns["element?"], [Shen.call(Shen.fns["snd"], [Arg7864_0])[1], [Shen.type_cons, Shen.call(Shen.fns["shen.space"], []), [Shen.type_cons, Shen.call(Shen.fns["shen.newline"], []), []]]]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.retrieve-from-history-if-needed"], [[Shen.fns['shen.tuple'], Shen.call(Shen.fns["fst"], [Arg7864_0]), Shen.call(Shen.fns["snd"], [Arg7864_0])[2]], Arg7864_1]);})
  : (((Shen.is_type(Arg7864_0, Shen.fns['shen.tuple']) && (Shen.is_type(Shen.call(Shen.fns["snd"], [Arg7864_0]), Shen.type_cons) && (Shen.is_type(Shen.call(Shen.fns["snd"], [Arg7864_0])[2], Shen.type_cons) && (Shen.empty$question$(Shen.call(Shen.fns["snd"], [Arg7864_0])[2][2]) && (Shen.is_type(Arg7864_1, Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$(Shen.call(Shen.fns["snd"], [Arg7864_0])[1], Shen.call(Shen.fns["shen.exclamation"], []))) && Shen.unwind_tail(Shen.$eq$(Shen.call(Shen.fns["snd"], [Arg7864_0])[2][1], Shen.call(Shen.fns["shen.exclamation"], []))))))))))
  ? (Shen.call(Shen.fns["shen.prbytes"], [Shen.call(Shen.fns["snd"], [Arg7864_1[1]])]),
  Arg7864_1[1])
  : (((Shen.is_type(Arg7864_0, Shen.fns['shen.tuple']) && (Shen.is_type(Shen.call(Shen.fns["snd"], [Arg7864_0]), Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(Shen.call(Shen.fns["snd"], [Arg7864_0])[1], Shen.call(Shen.fns["shen.exclamation"], []))))))
  ? ((R0 = Shen.call(Shen.fns["shen.make-key"], [Shen.call(Shen.fns["snd"], [Arg7864_0])[2], Arg7864_1])),
  (R0 = Shen.call(Shen.fns["head"], [Shen.call(Shen.fns["shen.find-past-inputs"], [R0, Arg7864_1])])),
  Shen.call(Shen.fns["shen.prbytes"], [Shen.call(Shen.fns["snd"], [R0])]),
  R0)
  : (((Shen.is_type(Arg7864_0, Shen.fns['shen.tuple']) && (Shen.is_type(Shen.call(Shen.fns["snd"], [Arg7864_0]), Shen.type_cons) && (Shen.empty$question$(Shen.call(Shen.fns["snd"], [Arg7864_0])[2]) && Shen.unwind_tail(Shen.$eq$(Shen.call(Shen.fns["snd"], [Arg7864_0])[1], Shen.call(Shen.fns["shen.percent"], [])))))))
  ? (Shen.call(Shen.fns["shen.print-past-inputs"], [[Shen.type_func, function shen_user_lambda7867(Arg7866) {
  if (Arg7866.length < 1) return [Shen.type_func, shen_user_lambda7867, 1, Arg7866];
  var Arg7866_0 = Arg7866[0];
  return true}, 1, [], undefined], Shen.call(Shen.fns["reverse"], [Arg7864_1]), 0]),
  (function() {
  return Shen.call_tail(Shen.fns["abort"], []);}))
  : (((Shen.is_type(Arg7864_0, Shen.fns['shen.tuple']) && (Shen.is_type(Shen.call(Shen.fns["snd"], [Arg7864_0]), Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(Shen.call(Shen.fns["snd"], [Arg7864_0])[1], Shen.call(Shen.fns["shen.percent"], []))))))
  ? ((R0 = Shen.call(Shen.fns["shen.make-key"], [Shen.call(Shen.fns["snd"], [Arg7864_0])[2], Arg7864_1])),
  Shen.call(Shen.fns["shen.print-past-inputs"], [R0, Shen.call(Shen.fns["reverse"], [Arg7864_1]), 0]),
  (function() {
  return Shen.call_tail(Shen.fns["abort"], []);}))
  : Arg7864_0)))))}, 2, [], "shen.retrieve-from-history-if-needed"];





Shen.fns["shen.percent"] = [Shen.type_func, function shen_user_lambda7869(Arg7868) {
  if (Arg7868.length < 0) return [Shen.type_func, shen_user_lambda7869, 0, Arg7868];
  return 37}, 0, [], "shen.percent"];





Shen.fns["shen.exclamation"] = [Shen.type_func, function shen_user_lambda7871(Arg7870) {
  if (Arg7870.length < 0) return [Shen.type_func, shen_user_lambda7871, 0, Arg7870];
  return 33}, 0, [], "shen.exclamation"];





Shen.fns["shen.prbytes"] = [Shen.type_func, function shen_user_lambda7873(Arg7872) {
  if (Arg7872.length < 1) return [Shen.type_func, shen_user_lambda7873, 1, Arg7872];
  var Arg7872_0 = Arg7872[0];
  return (Shen.call(Shen.fns["map"], [[Shen.type_func, function shen_user_lambda7875(Arg7874) {
  if (Arg7874.length < 1) return [Shen.type_func, shen_user_lambda7875, 1, Arg7874];
  var Arg7874_0 = Arg7874[0];
  return (function() {
  return Shen.call_tail(Shen.fns["pr"], [Shen.n_$gt$string(Arg7874_0), Shen.call(Shen.fns["stoutput"], [])]);})}, 1, [], undefined], Arg7872_0]),
  (function() {
  return Shen.call_tail(Shen.fns["nl"], [1]);}))}, 1, [], "shen.prbytes"];





Shen.fns["shen.update_history"] = [Shen.type_func, function shen_user_lambda7877(Arg7876) {
  if (Arg7876.length < 2) return [Shen.type_func, shen_user_lambda7877, 2, Arg7876];
  var Arg7876_0 = Arg7876[0], Arg7876_1 = Arg7876[1];
  return (Shen.globals["shen.*history*"] = [Shen.type_cons, Arg7876_0, Arg7876_1])}, 2, [], "shen.update_history"];





Shen.fns["shen.toplineread"] = [Shen.type_func, function shen_user_lambda7879(Arg7878) {
  if (Arg7878.length < 0) return [Shen.type_func, shen_user_lambda7879, 0, Arg7878];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.toplineread_loop"], [Shen.read_byte(Shen.call(Shen.fns["stinput"], [])), []]);})}, 0, [], "shen.toplineread"];





Shen.fns["shen.toplineread_loop"] = [Shen.type_func, function shen_user_lambda7881(Arg7880) {
  if (Arg7880.length < 2) return [Shen.type_func, shen_user_lambda7881, 2, Arg7880];
  var Arg7880_0 = Arg7880[0], Arg7880_1 = Arg7880[1];
  var R0;
  return ((Shen.unwind_tail(Shen.$eq$(Arg7880_0, Shen.call(Shen.fns["shen.hat"], []))))
  ? (function() {
  return Shen.simple_error("line read aborted");})
  : ((Shen.call(Shen.fns["element?"], [Arg7880_0, [Shen.type_cons, Shen.call(Shen.fns["shen.newline"], []), [Shen.type_cons, Shen.call(Shen.fns["shen.carriage-return"], []), []]]]))
  ? ((R0 = Shen.call(Shen.fns["compile"], [[Shen.type_func, function shen_user_lambda7883(Arg7882) {
  if (Arg7882.length < 1) return [Shen.type_func, shen_user_lambda7883, 1, Arg7882];
  var Arg7882_0 = Arg7882[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.<st_input>"], [Arg7882_0]);})}, 1, [], undefined], Arg7880_1, [Shen.type_func, function shen_user_lambda7885(Arg7884) {
  if (Arg7884.length < 1) return [Shen.type_func, shen_user_lambda7885, 1, Arg7884];
  var Arg7884_0 = Arg7884[0];
  return [Shen.type_symbol, "shen.nextline"]}, 1, [], undefined]])),
  (((Shen.unwind_tail(Shen.$eq$(R0, [Shen.type_symbol, "shen.nextline"])) || Shen.empty$question$(R0)))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.toplineread_loop"], [Shen.read_byte(Shen.call(Shen.fns["stinput"], [])), Shen.call(Shen.fns["append"], [Arg7880_1, [Shen.type_cons, Arg7880_0, []]])]);})
  : ((Shen.globals["shen.*it*"] = R0[1]),
  [Shen.fns['shen.tuple'], R0, Arg7880_1])))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.toplineread_loop"], [Shen.read_byte(Shen.call(Shen.fns["stinput"], [])), Shen.call(Shen.fns["append"], [Arg7880_1, [Shen.type_cons, Arg7880_0, []]])]);})))}, 2, [], "shen.toplineread_loop"];





Shen.fns["shen.hat"] = [Shen.type_func, function shen_user_lambda7887(Arg7886) {
  if (Arg7886.length < 0) return [Shen.type_func, shen_user_lambda7887, 0, Arg7886];
  return 94}, 0, [], "shen.hat"];





Shen.fns["shen.newline"] = [Shen.type_func, function shen_user_lambda7889(Arg7888) {
  if (Arg7888.length < 0) return [Shen.type_func, shen_user_lambda7889, 0, Arg7888];
  return 10}, 0, [], "shen.newline"];





Shen.fns["shen.carriage-return"] = [Shen.type_func, function shen_user_lambda7891(Arg7890) {
  if (Arg7890.length < 0) return [Shen.type_func, shen_user_lambda7891, 0, Arg7890];
  return 13}, 0, [], "shen.carriage-return"];





Shen.fns["tc"] = [Shen.type_func, function shen_user_lambda7893(Arg7892) {
  if (Arg7892.length < 1) return [Shen.type_func, shen_user_lambda7893, 1, Arg7892];
  var Arg7892_0 = Arg7892[0];
  return ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "+"], Arg7892_0)))
  ? (Shen.globals["shen.*tc*"] = true)
  : ((Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, "-"], Arg7892_0)))
  ? (Shen.globals["shen.*tc*"] = false)
  : (function() {
  return Shen.simple_error("tc expects a + or -");})))}, 1, [], "tc"];





Shen.fns["shen.prompt"] = [Shen.type_func, function shen_user_lambda7895(Arg7894) {
  if (Arg7894.length < 0) return [Shen.type_func, shen_user_lambda7895, 0, Arg7894];
  return (((Shen.globals["shen.*tc*"]))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.prhush"], [("\x0d\x0a\x0d\x0a(" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["length"], [(Shen.globals["shen.*history*"])]), "+) ", [Shen.type_symbol, "shen.a"]])), Shen.call(Shen.fns["stoutput"], [])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.prhush"], [("\x0d\x0a\x0d\x0a(" + Shen.call(Shen.fns["shen.app"], [Shen.call(Shen.fns["length"], [(Shen.globals["shen.*history*"])]), "-) ", [Shen.type_symbol, "shen.a"]])), Shen.call(Shen.fns["stoutput"], [])]);}))}, 0, [], "shen.prompt"];





Shen.fns["shen.toplevel"] = [Shen.type_func, function shen_user_lambda7897(Arg7896) {
  if (Arg7896.length < 1) return [Shen.type_func, shen_user_lambda7897, 1, Arg7896];
  var Arg7896_0 = Arg7896[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.toplevel_evaluate"], [Arg7896_0, (Shen.globals["shen.*tc*"])]);})}, 1, [], "shen.toplevel"];





Shen.fns["shen.find-past-inputs"] = [Shen.type_func, function shen_user_lambda7899(Arg7898) {
  if (Arg7898.length < 2) return [Shen.type_func, shen_user_lambda7899, 2, Arg7898];
  var Arg7898_0 = Arg7898[0], Arg7898_1 = Arg7898[1];
  var R0;
  return ((R0 = Shen.call(Shen.fns["shen.find"], [Arg7898_0, Arg7898_1])),
  ((Shen.empty$question$(R0))
  ? (function() {
  return Shen.simple_error("input not found\x0d\x0a");})
  : R0))}, 2, [], "shen.find-past-inputs"];





Shen.fns["shen.make-key"] = [Shen.type_func, function shen_user_lambda7901(Arg7900) {
  if (Arg7900.length < 2) return [Shen.type_func, shen_user_lambda7901, 2, Arg7900];
  var Arg7900_0 = Arg7900[0], Arg7900_1 = Arg7900[1];
  var R0;
  return ((R0 = Shen.call(Shen.fns["compile"], [[Shen.type_func, function shen_user_lambda7903(Arg7902) {
  if (Arg7902.length < 1) return [Shen.type_func, shen_user_lambda7903, 1, Arg7902];
  var Arg7902_0 = Arg7902[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.<st_input>"], [Arg7902_0]);})}, 1, [], undefined], Arg7900_0, [Shen.type_func, function shen_user_lambda7905(Arg7904) {
  if (Arg7904.length < 1) return [Shen.type_func, shen_user_lambda7905, 1, Arg7904];
  var Arg7904_0 = Arg7904[0];
  return ((Shen.is_type(Arg7904_0, Shen.type_cons))
  ? (function() {
  return Shen.simple_error(("parse error here: " + Shen.call(Shen.fns["shen.app"], [Arg7904_0, "\x0d\x0a", [Shen.type_symbol, "shen.s"]])));})
  : (function() {
  return Shen.simple_error("parse error\x0d\x0a");}))}, 1, [], undefined]])[1]),
  ((Shen.call(Shen.fns["integer?"], [R0]))
  ? [Shen.type_func, function shen_user_lambda7907(Arg7906) {
  if (Arg7906.length < 3) return [Shen.type_func, shen_user_lambda7907, 3, Arg7906];
  var Arg7906_0 = Arg7906[0], Arg7906_1 = Arg7906[1], Arg7906_2 = Arg7906[2];
  return Shen.$eq$(Arg7906_2, Shen.call(Shen.fns["nth"], [(Arg7906_0 + 1), Shen.call(Shen.fns["reverse"], [Arg7906_1])]))}, 3, [R0, Arg7900_1], undefined]
  : [Shen.type_func, function shen_user_lambda7909(Arg7908) {
  if (Arg7908.length < 2) return [Shen.type_func, shen_user_lambda7909, 2, Arg7908];
  var Arg7908_0 = Arg7908[0], Arg7908_1 = Arg7908[1];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.prefix?"], [Arg7908_0, Shen.call(Shen.fns["shen.trim-gubbins"], [Shen.call(Shen.fns["snd"], [Arg7908_1])])]);})}, 2, [Arg7900_0], undefined]))}, 2, [], "shen.make-key"];





Shen.fns["shen.trim-gubbins"] = [Shen.type_func, function shen_user_lambda7911(Arg7910) {
  if (Arg7910.length < 1) return [Shen.type_func, shen_user_lambda7911, 1, Arg7910];
  var Arg7910_0 = Arg7910[0];
  return (((Shen.is_type(Arg7910_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(Arg7910_0[1], Shen.call(Shen.fns["shen.space"], [])))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.trim-gubbins"], [Arg7910_0[2]]);})
  : (((Shen.is_type(Arg7910_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(Arg7910_0[1], Shen.call(Shen.fns["shen.newline"], [])))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.trim-gubbins"], [Arg7910_0[2]]);})
  : (((Shen.is_type(Arg7910_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(Arg7910_0[1], Shen.call(Shen.fns["shen.carriage-return"], [])))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.trim-gubbins"], [Arg7910_0[2]]);})
  : (((Shen.is_type(Arg7910_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(Arg7910_0[1], Shen.call(Shen.fns["shen.tab"], [])))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.trim-gubbins"], [Arg7910_0[2]]);})
  : (((Shen.is_type(Arg7910_0, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(Arg7910_0[1], Shen.call(Shen.fns["shen.left-round"], [])))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.trim-gubbins"], [Arg7910_0[2]]);})
  : Arg7910_0)))))}, 1, [], "shen.trim-gubbins"];





Shen.fns["shen.space"] = [Shen.type_func, function shen_user_lambda7913(Arg7912) {
  if (Arg7912.length < 0) return [Shen.type_func, shen_user_lambda7913, 0, Arg7912];
  return 32}, 0, [], "shen.space"];





Shen.fns["shen.tab"] = [Shen.type_func, function shen_user_lambda7915(Arg7914) {
  if (Arg7914.length < 0) return [Shen.type_func, shen_user_lambda7915, 0, Arg7914];
  return 9}, 0, [], "shen.tab"];





Shen.fns["shen.left-round"] = [Shen.type_func, function shen_user_lambda7917(Arg7916) {
  if (Arg7916.length < 0) return [Shen.type_func, shen_user_lambda7917, 0, Arg7916];
  return 40}, 0, [], "shen.left-round"];





Shen.fns["shen.find"] = [Shen.type_func, function shen_user_lambda7919(Arg7918) {
  if (Arg7918.length < 2) return [Shen.type_func, shen_user_lambda7919, 2, Arg7918];
  var Arg7918_0 = Arg7918[0], Arg7918_1 = Arg7918[1];
  return ((Shen.empty$question$(Arg7918_1))
  ? []
  : (((Shen.is_type(Arg7918_1, Shen.type_cons) && Shen.call(Arg7918_0, [Arg7918_1[1]])))
  ? [Shen.type_cons, Arg7918_1[1], Shen.call(Shen.fns["shen.find"], [Arg7918_0, Arg7918_1[2]])]
  : ((Shen.is_type(Arg7918_1, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.find"], [Arg7918_0, Arg7918_1[2]]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.find"]]);}))))}, 2, [], "shen.find"];





Shen.fns["shen.prefix?"] = [Shen.type_func, function shen_user_lambda7921(Arg7920) {
  if (Arg7920.length < 2) return [Shen.type_func, shen_user_lambda7921, 2, Arg7920];
  var Arg7920_0 = Arg7920[0], Arg7920_1 = Arg7920[1];
  return ((Shen.empty$question$(Arg7920_0))
  ? true
  : (((Shen.is_type(Arg7920_0, Shen.type_cons) && (Shen.is_type(Arg7920_1, Shen.type_cons) && Shen.unwind_tail(Shen.$eq$(Arg7920_1[1], Arg7920_0[1])))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.prefix?"], [Arg7920_0[2], Arg7920_1[2]]);})
  : false))}, 2, [], "shen.prefix?"];





Shen.fns["shen.print-past-inputs"] = [Shen.type_func, function shen_user_lambda7923(Arg7922) {
  if (Arg7922.length < 3) return [Shen.type_func, shen_user_lambda7923, 3, Arg7922];
  var Arg7922_0 = Arg7922[0], Arg7922_1 = Arg7922[1], Arg7922_2 = Arg7922[2];
  return ((Shen.empty$question$(Arg7922_1))
  ? [Shen.type_symbol, "_"]
  : (((Shen.is_type(Arg7922_1, Shen.type_cons) && (!Shen.call(Arg7922_0, [Arg7922_1[1]]))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.print-past-inputs"], [Arg7922_0, Arg7922_1[2], (Arg7922_2 + 1)]);})
  : (((Shen.is_type(Arg7922_1, Shen.type_cons) && Shen.is_type(Arg7922_1[1], Shen.fns['shen.tuple'])))
  ? (Shen.call(Shen.fns["shen.prhush"], [Shen.call(Shen.fns["shen.app"], [Arg7922_2, ". ", [Shen.type_symbol, "shen.a"]]), Shen.call(Shen.fns["stoutput"], [])]),
  Shen.call(Shen.fns["shen.prbytes"], [Shen.call(Shen.fns["snd"], [Arg7922_1[1]])]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.print-past-inputs"], [Arg7922_0, Arg7922_1[2], (Arg7922_2 + 1)]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.print-past-inputs"]]);}))))}, 3, [], "shen.print-past-inputs"];





Shen.fns["shen.toplevel_evaluate"] = [Shen.type_func, function shen_user_lambda7925(Arg7924) {
  if (Arg7924.length < 2) return [Shen.type_func, shen_user_lambda7925, 2, Arg7924];
  var Arg7924_0 = Arg7924[0], Arg7924_1 = Arg7924[1];
  var R0;
  return (((Shen.is_type(Arg7924_0, Shen.type_cons) && (Shen.is_type(Arg7924_0[2], Shen.type_cons) && (Shen.unwind_tail(Shen.$eq$([Shen.type_symbol, ":"], Arg7924_0[2][1])) && (Shen.is_type(Arg7924_0[2][2], Shen.type_cons) && (Shen.empty$question$(Arg7924_0[2][2][2]) && Shen.unwind_tail(Shen.$eq$(true, Arg7924_1))))))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.typecheck-and-evaluate"], [Arg7924_0[1], Arg7924_0[2][2][1]]);})
  : (((Shen.is_type(Arg7924_0, Shen.type_cons) && Shen.is_type(Arg7924_0[2], Shen.type_cons)))
  ? (Shen.call(Shen.fns["shen.toplevel_evaluate"], [[Shen.type_cons, Arg7924_0[1], []], Arg7924_1]),
  Shen.call(Shen.fns["nl"], [1]),
  (function() {
  return Shen.call_tail(Shen.fns["shen.toplevel_evaluate"], [Arg7924_0[2], Arg7924_1]);}))
  : (((Shen.is_type(Arg7924_0, Shen.type_cons) && (Shen.empty$question$(Arg7924_0[2]) && Shen.unwind_tail(Shen.$eq$(true, Arg7924_1)))))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.typecheck-and-evaluate"], [Arg7924_0[1], Shen.call(Shen.fns["gensym"], [[Shen.type_symbol, "A"]])]);})
  : (((Shen.is_type(Arg7924_0, Shen.type_cons) && (Shen.empty$question$(Arg7924_0[2]) && Shen.unwind_tail(Shen.$eq$(false, Arg7924_1)))))
  ? ((R0 = Shen.call(Shen.fns["shen.eval-without-macros"], [Arg7924_0[1]])),
  (function() {
  return Shen.call_tail(Shen.fns["print"], [R0]);}))
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.toplevel_evaluate"]]);})))))}, 2, [], "shen.toplevel_evaluate"];





Shen.fns["shen.typecheck-and-evaluate"] = [Shen.type_func, function shen_user_lambda7927(Arg7926) {
  if (Arg7926.length < 2) return [Shen.type_func, shen_user_lambda7927, 2, Arg7926];
  var Arg7926_0 = Arg7926[0], Arg7926_1 = Arg7926[1];
  var R0, R1;
  return ((R0 = Shen.call(Shen.fns["shen.typecheck"], [Arg7926_0, Arg7926_1])),
  ((Shen.unwind_tail(Shen.$eq$(R0, false)))
  ? (function() {
  return Shen.simple_error("type error\x0d\x0a");})
  : ((R1 = Shen.call(Shen.fns["shen.eval-without-macros"], [Arg7926_0])),
  (R0 = Shen.call(Shen.fns["shen.pretty-type"], [R0])),
  (function() {
  return Shen.call_tail(Shen.fns["shen.prhush"], [Shen.call(Shen.fns["shen.app"], [R1, (" : " + Shen.call(Shen.fns["shen.app"], [R0, "", [Shen.type_symbol, "shen.r"]])), [Shen.type_symbol, "shen.s"]]), Shen.call(Shen.fns["stoutput"], [])]);}))))}, 2, [], "shen.typecheck-and-evaluate"];





Shen.fns["shen.pretty-type"] = [Shen.type_func, function shen_user_lambda7929(Arg7928) {
  if (Arg7928.length < 1) return [Shen.type_func, shen_user_lambda7929, 1, Arg7928];
  var Arg7928_0 = Arg7928[0];
  return (function() {
  return Shen.call_tail(Shen.fns["shen.mult_subst"], [(Shen.globals["shen.*alphabet*"]), Shen.call(Shen.fns["shen.extract-pvars"], [Arg7928_0]), Arg7928_0]);})}, 1, [], "shen.pretty-type"];





Shen.fns["shen.extract-pvars"] = [Shen.type_func, function shen_user_lambda7931(Arg7930) {
  if (Arg7930.length < 1) return [Shen.type_func, shen_user_lambda7931, 1, Arg7930];
  var Arg7930_0 = Arg7930[0];
  return ((Shen.call(Shen.fns["shen.pvar?"], [Arg7930_0]))
  ? [Shen.type_cons, Arg7930_0, []]
  : ((Shen.is_type(Arg7930_0, Shen.type_cons))
  ? (function() {
  return Shen.call_tail(Shen.fns["union"], [Shen.call(Shen.fns["shen.extract-pvars"], [Arg7930_0[1]]), Shen.call(Shen.fns["shen.extract-pvars"], [Arg7930_0[2]])]);})
  : []))}, 1, [], "shen.extract-pvars"];





Shen.fns["shen.mult_subst"] = [Shen.type_func, function shen_user_lambda7933(Arg7932) {
  if (Arg7932.length < 3) return [Shen.type_func, shen_user_lambda7933, 3, Arg7932];
  var Arg7932_0 = Arg7932[0], Arg7932_1 = Arg7932[1], Arg7932_2 = Arg7932[2];
  return ((Shen.empty$question$(Arg7932_0))
  ? Arg7932_2
  : ((Shen.empty$question$(Arg7932_1))
  ? Arg7932_2
  : (((Shen.is_type(Arg7932_0, Shen.type_cons) && Shen.is_type(Arg7932_1, Shen.type_cons)))
  ? (function() {
  return Shen.call_tail(Shen.fns["shen.mult_subst"], [Arg7932_0[2], Arg7932_1[2], Shen.call(Shen.fns["subst"], [Arg7932_0[1], Arg7932_1[1], Arg7932_2])]);})
  : (function() {
  return Shen.call_tail(Shen.fns["shen.sys-error"], [[Shen.type_symbol, "shen.mult_subst"]]);}))))}, 3, [], "shen.mult_subst"];



