Shen = {}

Shen.globals = {}

Shen.globals["*language*"] = "Javascript"
Shen.globals["*implementation*"] = "cli"
Shen.globals["*port*"] = Shen.version = "13.0.2"
Shen.globals["*porters*"] = Shen.author = "Ramil Farkhshatov"

Shen.Tag = function(name) {
  this.toString = function() {
    return "#<Shen.Tag " + name + ">"
  }
}

Shen.fail_obj = new Shen.Tag('fail_obj')
Shen.fns = {}

Shen.type_func = new Shen.Tag('func')
Shen.type_symbol = new Shen.Tag('sym')
Shen.type_cons = new Shen.Tag('cons')
Shen.type_stream_in = new Shen.Tag('stream_in')
Shen.type_stream_out = new Shen.Tag('stream_out')
Shen.type_stream_inout = new Shen.Tag('stream_inout')
Shen.type_error = new Shen.Tag('error')

Shen.Freeze = function(vars, fn) {
  this.vars = vars
  this.fn = fn
}

Shen.mkfunction = function(name, nargs, fn) {
  var x = [Shen.type_func, fn, nargs, [], name]
  Shen.fns[name] = x
  return x
}

Shen.defun = function(name, nargs, fn) {
  var partfn = {}
  partfn = (function (args) {
    if (args.length < nargs) return [Shen.type_func, partfn, nargs, args]
    return fn(args)
  })
  return Shen.mkfunction(name, nargs, partfn)
}

Shen.call_tail = function(x, args) {
  var j = 0, nargs = args.length
  for (;;) {
    if (typeof(x) == "function") {
      x = x([args[j++]])
    } else if (x[0] == Shen.type_func) {
      var c = x[3], n = c.length, k = x[2], a
      if (!j && !n && nargs <= k) {
        a = args
        j += nargs
      } else {
        k = (k > n + nargs) ? n + nargs : k
        a = new Array(k)

        for (var i = 0; i < n; ++i)
          a[i] = c[i]
        for (;i < k && j < nargs; ++j, ++i)
          a[i] = args[j]
      }
      x = (x[1])(a)
    } else if (x[0] == Shen.type_symbol) {
      x = Shen.get_fn(x)
    } else
      return Shen.error("Shen.call: Wrong function: '" + x + "'")
    if (j >= nargs)
      return x
    while (typeof(x) == "function")
      x = x()
  }
  return x
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
  return (new Date()).getTime() / 1000.0
}

Shen.simple_error = Shen.error
Shen.log_eq = false

Shen.trap_error = function(fn, handler) {
  try {
    return fn()
  } catch (e) {
    return Shen.call(handler, [e])
  }
}

Shen.notrap_error = function(fn, handler) {
  return fn()
}

Shen.equal_boolean = function(b, x) {
  return ((x instanceof Array)
          && x[0] == Shen.type_symbol
          && ((x[1] == "true" && b === true)
              || (x[1] == "false" && b === false)))
}

Shen.equal_function = function(f, x) {
  return (x[0] == Shen.type_symbol && f[0] == Shen.type_func && x[1] == f[4])
}

Shen.$eq$ = function(x, y) {
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
  Shen.init({io: Shen.console_io, start_repl: true})
}

try {
  module.exports = Shen
} catch (e) {}
