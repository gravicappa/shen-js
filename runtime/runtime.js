Shen = {
  globals: {},
  fns: {},
  tags: {},
  sp: 0,
  nargs: 0,
  reg: Array(1024),
  start: undefined,
  pc: undefined,
  ret: undefined,
  error_handlers: [],
  threads: []
};

Shen.globals["*language*"] = "Javascript";
Shen.globals["*implementation*"] = "cli";
Shen.globals["*port*"] = Shen.version = "17.2.1";
Shen.globals["*porters*"] = Shen.author = "Ramil Farkhshatov";
Shen.globals["js.show-error"] = false;
Shen.globals["js.show-error-stack"] = false;

Shen.Tag = function(name) {
  this.toString = function() {
    return "#<Shen.Tag " + name + ">";
  }
}

Shen.Func = function(name, arity, fn, vars) {
  this.name = name;
  this.arity = arity;
  this.fn = fn;
  this.vars = vars || [];
}

Shen.Sym = function(str) {
  this.str = str;
}

Shen.Cons = function(head, tail) {
  this.head = head;
  this.tail = tail;
}

Shen.Stream = function(dir, fn, close) {
  this.dir = dir || '';
  this.close = close || (function() {});
  switch (dir) {
  case 'r': this.read_byte = fn; break;
  case 'w': this.write_byte = fn; break;
  case 'rw':
  case 'wr':
    this.in = fn[0];
    this.out = fn[1];
    this.read_byte = function() {return this.in.read_byte();};
    this.write_byte = function() {return this.in.write_byte();};
    this.close = function() {
      this.in.close();
      this.out.close()
    };
  }
}

Shen.fail_obj = new Shen.Tag("fail_obj");
Shen.break_run = new Shen.Tag("break_obj");

Shen.clone = function() {
  var obj = this.constructor();
  for (var key in this)
    if (this.hasOwnProperty(key))
      obj[key] = this[key];
  obj.sp = 0;
  obj.next = obj.pc = undefined;
  obj.reg = Array(1024);
  obj.threads = [];
  return obj;
};

Shen.handle_exception = function(e) {
  if (this.error_handlers.length > 0) {
    var err_handler = this.error_handlers.pop();
    this.wipe_stack(0);
    this.sp = err_handler.sp;
    this.next = err_handler.next;
    return this.call_function(err_handler.fn, [e]);
  } else
    throw e;
};

Shen.run_loop = function() {
  var start = this.start;
  while (start) {
    try {
      var pc = start;
      start = null;
      while (pc) {
        if (this.dbg_dump_state)
          this.dump_state({pc: pc});
        pc = pc(this);
      }
    } catch (e) {
      if (e !== this.break_obj)
        start = this.handle_exception(e);
      else
        break;
    }
  }
}

Shen.run = Shen.run_loop;

Shen.run_step = function() {
  try {
    var t = Date.now();
    var dt_ms = 200
    var pc = this.start;
    while (pc && Date.now() - t > dt_ms)
      pc = pc(this);
    this.start = pc;
  } catch (e) {
    if (e !== this.break_obj)
      this.start = this.handle_exception(e);
  }
}

Shen.push_error_handler = function(e) {
  this.error_handlers.push({sp: this.sp, next: this.next, fn: e});
}

Shen.call_function = function(proc, args) {
  var n = args.length;
  var reg = this.reg;
  n2 = 0;
  if (proc instanceof Shen.Func)
    n2 = proc.vars.length;
  for (var i = this.sp, j = n - 1; j >= 0; ++i, --j)
    reg[i] = args[j];
  i = this.sp + n;
  if (proc instanceof Shen.Func) {
    fn = proc.fn;
    var closure_vars = proc.vars;
    for (var j = 0; j < n2; ++i, ++j)
      reg[i] = closure_vars[j];
  } else if (typeof(proc) == "function")
    fn = proc;
  else
    throw new Error("" + proc + " is not a function");
  this.nargs = n + n2;
  return fn;
}

Shen.find_func = function(name) {
  if (name instanceof this.Sym)
    name = name.str;
  var ret = this.fns[name];
  if (ret === undefined)
    return this.error('No such function: ' + name);
  return ret;
}

Shen.call = function(proc, args) {
  if (typeof(proc) === 'string')
    proc = this.find_func(proc);

  // DBG
  this.reg = Array(1024);

  this.next = null;
  this.start = this.call_function(proc, args);
  this.run();
  var r = this.ret;
  this.ret = undefined;

  // DBG
  if (this.sp < 0) 
    this.error("sp < 0");

  return r;
}

Shen.put_closure_args = function(closure) {
  var vars = closure.vars;
  if (vars && vars.length) {
    var n = vars.length;
    var i = this.sp + this.nargs;
    var reg = this.reg;
    for (var j = 0; j < n; ++i, ++j)
      reg[i] = vars[j];
    this.nargs += vars.length;
  }
}

Shen.equal_boolean = function(b, x) {
  return ((x instanceof Shen.Sym) && ((x.str == "true" && b === true)
                                      || (x.str == "false" && b === false)));
}

Shen.equal_function = function(f, x) {
  return (x instanceof Shen.Sym) && x.str == f.name;
}

Shen.is_array_equal = function(x, y) {
  if (x.length != y.length)
    return false;
  var n = x.length;
  for (var i = 0; i < n; ++i)
    if (!this.is_equal(x[i], y[i]))
      return false;
  return true;
}

Shen.is_stream_equal = function(x, y) {
  return x.dir === y.dir && x.read_byte === y.read_byte
         && x.write_byte === y.write_byte && x.close === y.close;
}

Shen.trace = function(name) {
  var fn = this[name];
  function tostr(x) {
    return Shen.xstr(x);
  };
  var replaced = function() {
    var args = Array.prototype.slice.call(arguments);
    this.io.puts("(" + name + " " + args.map(tostr).join(" ") + ")\n");
    var ret = fn.apply(this, arguments);
    this.io.puts("" + name + " => " + Shen.xstr(ret) + "\n");
    return ret;
  };
  replaced.old = fn;
  this[name] = replaced;
}

Shen.untrace = function(name) {
  var fn = this[name];
  if (typeof(fn) === "function" && fn.old) {
    this[name] = fn.old;
  }
}

Shen.is_equal = function(x, y) {
  if (x === y)
    return true;
  var tx = typeof(x), ty = typeof(y);
  if (tx != ty)
    return ((tx == "boolean" && this.equal_boolean(x, y))
            || (ty == "boolean" && this.equal_boolean(y, x)));
  if ((x instanceof Array) && (y instanceof Array))
    return this.is_array_equal(x, y);
  if ((x instanceof Shen.Sym) && (y instanceof Shen.Sym))
    return x.str === y.str;
  if ((x instanceof Shen.Cons) && (y instanceof Shen.Cons))
    return this.is_equal(x.head, y.head) && this.is_equal(x.tail, y.tail);
  if ((x instanceof Shen.Func) && (y instanceof Shen.Func))
    return x.fn == y.fn && x.arity == y.arity
           && this.is_array_equal(x.vars, y.vars);
  if (this.equal_function(x, y) || this.equal_function(y, x))
    return true;
  if ((x instanceof Shen.Stream) && (y instanceof Shen.Stream))
    return this.is_stream_equal(x, y);
  if ((x instanceof Shen.Func) && (y instanceof Shen.Sym) && !x.vars.length
      && x.name === y.str)
    return true;
  if ((y instanceof Shen.Func) && (x instanceof Shen.Sym) && !y.vars.length
      && y.name === x.str)
    return true;
  return false;
}

Shen.is_empty = function(x) {
  return ((x instanceof Array) && !x.length);
}

Shen.is_bool = function(x) {
  return (typeof(x) == "boolean")
         || ((x instanceof Shen.Sym)
             && (x.str === "true" || x.str === "false"));
}

Shen.is_vector = function(x) {
  return (x instanceof Array) && x[0] > 0;
}

Shen.is_absvector = function(x) {
  return (x instanceof Array) && x.length > 0;
}

Shen.absvector = function(n) {
  var ret = new Array(n);
  for (var i = 0; i < n; ++i)
    ret[i] = this.fail_obj;
  return ret;
}

Shen.is_true = function(x) {
  return x != false || ((x instanceof Shen.Sym) && (x.str != "false"));
}

Shen.absvector_ref = function(x, i) {
  if (x.length <= i || i < 0)
    this.error("out of range");
  return x[i];
}

Shen.absvector_set = function(x, i, v) {
  if (x.length <= i || i < 0)
    this.error("out of range");
  x[i] = v;
  return x;
}

Shen.value = function(x) {
  var y = this.globals[x.str];
  if (y === undefined)
    this.error("The variable " + x.str + " is unbound.");
  else
    return y;
}

Shen.set = function(x, y) {
  if (!(x instanceof this.Sym))
    this.error("The value " + x + " is not a symbol");
  return (this.globals[x.str] = y);
}

Shen.vector = function(n) {
  var r = new Array(n + 1);
  r[0] = n;
  for (var i = 1; i <= n; ++i)
    r[i] = this.fail_obj;
  return r;
}

Shen.esc = function(x) {
  var ret = "";
  for (var i = 0; i < x.length; ++i)
    switch (x[i]) {
      case '"': ret += '\\"'; break;
      default: ret += x[i]; break;
    }
  return ret;
}

Shen.str = function(x) {
  var err = " is not an atom in Shen; str cannot print it to a string."
  switch (typeof(x)) {
    case "string": return "\"" + this.esc(x) + "\"";
    case "number":
    case "boolean": return String(x);
    case "function": return "#<jsfunc " + x.name + ">";
    case "object":
      if (x === this.fail_obj)
        return "...";
      if (x instanceof Shen.Sym)
        return x.str;
      if (x instanceof Shen.Func) {
        if (!x.vars.length && x.name != undefined)
          return x.name;
        //if (this.is_true(this.globals['js.*show-func*']))
        //  this.io.puts("\n func: " + x + "\n\n")
        var n = (x.name === undefined) ? (' ' + x.name) : ' [nil]';
        return (!x.vars.length) ? "#<func" + n + ">" : "#<closure" + n + ">";
      }
  }
  return this.error(String(x) + err);
}

Shen.intern = function(x) {
  switch (x) {
  case "true": return true;
  case "false": return false;
  default: return new Shen.Sym(x);
  }
}

Shen.tlstr = function(x) {
  if (x === "")
    return new Shen.Sym("shen.eos");
  return x.substring(1, x.length);
}

Shen.str_from_n = function(x) {
  return String.fromCharCode(x);
}

Shen.n_from_str = function(x) {
  return x.charCodeAt(0);
}

Shen.wipe_stack = function(start) {
  /*
  var n = this.reg.length;
  for (var i = start; i < n; ++i)
    delete this.reg[i];
  */
}

Shen.error = function(s) {
  if (this.is_true(this.globals['js.show-error']))
    this.io.puts("# err: " + s + "\n");
  throw new Error(s);
  return this.fail_obj;
}

Shen.error_to_string = function(s) {
  var stack = s.stack;
  var show = (stack !== undefined);
  show &= this.is_true(this.globals["js.show-error-stack"]);
  return (show) ? ("" + s + " " + stack) : ("" + s);
}

Shen.get_time = function(x) {
  return Date.now() / 1000.0;
}

Shen.bootstrap_eval_str = function(s) {
  this._bs_eval_buf += s + "\n";
};


Shen.file_instream_get_buf = function(stream, buf, pos) {
  if (buf.byteLength <= pos) {
    stream.read_byte = (function() {return -1});
    return -1;
  }
  stream.read_byte = (function() {
    return this.file_instream_get_buf(stream, buf, pos + 1);
  });
  return buf[pos];
}

Shen.read_byte = function(stream) {
  if (stream.dir.indexOf('r') >= 0)
    return stream.read_byte();
  Shen.error("read-byte: Wrong stream type.");
  return -1;
}

Shen.write_byte = function(byte, stream) {
  if (stream.dir.indexOf('w') >= 0)
    return stream.write_byte(byte);
  Shen.error("write-byte: Wrong stream type.");
  return [];
}

Shen.close = function(stream) {
  stream.close();
  return [];
}

Shen.open = function() {
  return this.io.open.apply(this.io, arguments);
}

Shen.repl_read_byte = function (stream, strbuf) {
  var x = strbuf.read_byte();
  if (x >= 0)
    return x;
  var str = Shen.io.gets();
  if (str == null) {
    quit();
    return -1;
  }
  strbuf = new Shen.Utf8_reader(str + '\n');
  stream.read_byte = (function() {
    return Shen.repl_read_byte(stream, strbuf);
  })
  return stream.read_byte();
}

Shen.write_string = function(s, stream) {
  for (var i = 0; i < s.length; ++i)
    Shen.write_byte(s.charCodeAt(i), stream);
  return s;
}

Shen.shenstr = function(x) {
  return Shen.call("shen.app", [x, "", new Shen.Sym("shen.s")]);
}

Shen.defun_x = function(name, arity, fn) {
  var fobj = new Shen.Func(name, arity, fn);
  Shen.fns[name] = fobj;
  return fobj;
}

Shen.defun = function(def) {
  function dashify(s) {
    return s.replace(/_/g, "-");
  }
  if (typeof(def) === "function") {
    var fn = def;
    var name = dashify(fn.name);
  } else {
    var fn = def.fn;
    var name = def.name || dashify(fn.name);
  }
  var arity = fn.length;
  var fobj = new Shen.Func(name, arity, function f(vm) {
    var x = vm.fn_entry(f, arity, name);
    if (x !== vm.fail_obj) return x;
    var sp = vm.sp;
    var args = vm.reg.slice(sp, sp + arity).reverse();
    return vm.fn_return(fn.apply(vm, args), vm.next);
  });
  Shen.fns[name] = fobj;
  return fobj;
}

Shen.partial_func = function(name, arity, fn) {
  var vars = this.reg.slice(this.sp, this.sp + this.nargs);
  return new Shen.Func(name, arity, fn, vars);
}

Shen.defun_x("klvm.mk-closure", -1, function fn(vm) {
  var r = vm.reg, sp = vm.sp, n = vm.nargs;
  var fn = r[sp + n - 1];
  if (fn instanceof vm.Func)
    fn = fn.fn;
  vm.ret = new Shen.Func(null, n - 1, fn, r.slice(sp, sp + n - 1));
  return vm.next;
});

Shen.eval = function(s) {
  this.ret = this.next;
  eval(s);
  return this.ret;
}

Shen.defun_x("js.eval", 1, function fn(vm) {
  vm.eval(vm.reg[this.sp]);
  return vm.next;
});

Shen._bs_obj = function(x) {
  switch (typeof(x)) {
    case "string": return "\"" + this.esc(x) + "\"";
    case "number":
    case "boolean": return String(x);
    case "function": return x.name;
    case "object":
      if (x === this.fail_obj)
        return "this.fail_obj";
      if (x instanceof Array) {
        if (x.length <= 0)
          return "[]"
        var repr = this._bs_obj.bind(this);
        return "[" + x.map(repr).join(", ") + "]";
      }
      var types = {
        "Shen.Tag": Shen.Tag,
        "Shen.Cons": Shen.Cons,
        "Shen.Func": Shen.Func,
        "Shen.Sym": Shen.Sym,
        "Shen.Stream": Shen.Stream,
      };
      for (var t in types) {
        if (x instanceof types[t]) {
          var obj = {type: t};
          for (var key in x)
            obj[key] = this._bs_obj(x[key]);
          return JSON.stringify(obj);
        }
      }
      return "XXXX";
  }
}

Shen._bs_var = function(name, obj) {
  this.io.puts("Shen." + name + " = function() {\n  return {\n");
  for (var key in obj) {
    var repr = this._bs_obj(obj[key]);
    this.io.puts('    "' + this.esc(key) + '": ' + repr + ",\n");
  }
  this.io.puts("  };\n};\n");
}

Shen.bootstrap = function() {
  this.io.puts(this._bs_var("globals", this.globals));
  this.io.puts(this._bs_eval_buf);
}

/* UTILS {*/

Shen.xstr_arr = function(x) {
  var xstr = this.xstr.bind(this);
  return x.map(xstr).join(" ");
}

Shen.xstr_list = function(x) {
  var lst = [];
  while (!this.is_empty(x)) {
    lst.push(this.xstr(x.head));
    x = x.tail;
  }
  return "[" + lst.join(" ") + "]";
}

Shen.xstr = function(x) {
  switch (typeof(x)) {
    case 'string': return x;
    case 'boolean': case 'number': return String(x);
  }
  if (x instanceof this.Sym)
    return x.str;
  if (x instanceof this.Cons)
    return this.xstr_list(x);
  if (x instanceof this.Func)
    return "#<func " + x.name + " <" + this.xstr_arr(x.vars) + ">>";
  if (this.is_empty(x))
    return "[]";
  if (this.is_vector(x))
    return "<" + this.xstr_arr(x) + ">";
  if (x instanceof Array)
    return "<<" + this.xstr_arr(x) + ">>";
  return String(x);
}

Shen.list = function(x) {
  var ret = [];
  for (var i = x.length - 1; i >= 0; --i)
    ret = new Shen.Cons(x[i], ret);
  return ret;
}

Shen.dump_regs = function(start) {
  var r = this.reg, io = this.io;
  var start = (start === undefined) ? this.sp : start;
  for (var i = start, j = start; i < r.length; ++i) {
    if (r[i] !== undefined) {
      if (j + 1 == i - 1)
        io.puts("    " + (i - 1) + ": nil\n");
      else if (j + 1 < i)
        io.puts("    " + (j + 1) + ".." + (i - 1) + ": nil\n");
      var x = this.dbg_str_prefixed(this.xstr(r[i]), "      ");
      io.puts("    " + i + ": " + x + "\n");
      j = i;
    }
  }
}

Shen.dbg_str_prefixed = function(x, prefix) {
  function pre(x) {return prefix + x;}
  var lines = String(x).split("\n");
  if (lines.length < 2)
    return x;
  return lines[0] + "\n" + lines.slice(1).map(pre).join("\n");
}

Shen.dump_state = function(extra) {
  var io = this.io;
  io.puts("# STEP ################\n");
  for (var x in extra)
    io.puts("  " + x + ": " + this.dbg_str_prefixed(extra[x], "    ") + "\n");
  io.puts("  next: " + this.dbg_str_prefixed(this.next, "    ") + "\n");
  io.puts("  ret: " + this.xstr(this.ret) + "\n");
  io.puts("  nargs: " + this.nargs + "\n");
  io.puts("  sp: " + this.sp + "\n");
  io.puts("  regs:\n");
  this.dump_regs(0);
  io.puts("\n\n");
}

Shen.str_dbg_obj = function(obj) {
  var f = [];
  for (var x in obj) 
    f.push(x + ": " + obj[x]);
  return "{" + f.join(", ") + "}";
}

/* } UTILS */

/* Console IO { */

Shen.Utf8_reader = function (str) {
  this.str = (str == null) ? "" : str;
  this.strpos = 0;
  this.bytes = Array(6);
  this.bytepos = 0;
  this.nbytes = 0;
  this.read_byte = function () {
    if (this.bytepos < this.nbytes)
      return this.bytes[this.bytepos++];
    if (this.strpos >= this.str.length)
      return -1;
    var c = this.str.charCodeAt(this.strpos++);
    this.bytepos = 0;
    this.nbytes = 0;
    if (c <= 0x7f)
      return c;
    if (c <= 0x7ff) {
      var n = 1;
      var c0 = (c >> 6) | 192;
    } else if (c <= 0xffff) {
      var n = 2;
      var c0 = (c >> 12) | 224;
    } else if (c <= 0x1fffff) {
      var n = 3;
      var c0 = (c >> 18) | 240;
    } else if (c <= 0x3ffffff) {
      var n = 4;
      var c0 = (c >> 24) | 248;
    } else if (c <= 0x7fffffff) {
      var n = 5;
      var c0 = (c >> 30) | 252;
    } else
      return Shen.error('Character ' + c + ' cannot be coded to UTF-8');
    this.nbytes = n;
    var shift = (n - 1) * 6;
    for (var i = 0; i < n; ++i, shift -= 6)
      this.bytes[i] = ((c >> shift) & 63) | 128;
    return c0;
  }
}

Shen.Utf8_writer = function(char_fn) {
  this.nbytes = 0;
  this.char = 0;
  this.bytespos = 0;
  this.write_byte = function(byte) {
    if (!(byte & 0x80)) {
      char_fn(byte);
      this.bytespos = 0;
    } else if ((byte & 224) == 192) {
      this.char = byte & 31;
      this.nbytes = 2;
      this.bytespos = 1;
    } else if ((byte & 240) == 224) {
      this.char = byte & 15;
      this.nbytes = 3;
      this.bytespos = 1;
    } else if ((byte & 248) == 240) {
      this.char = byte & 7;
      this.nbytes = 4;
      this.bytespos = 1;
    } else if ((byte & 252) == 248) {
      this.char = byte & 3;
      this.nbytes = 5;
      this.bytespos = 1;
    } else if ((byte & 254) == 252) {
      this.char = byte & 1;
      this.nbytes = 6;
      this.bytespos = 1;
    } else {
      this.char = (this.char << 6) | (byte & 0x7f);
      this.bytespos++;
      if (this.bytespos >= this.nbytes) {
        char_fn(this.char);
        this.bytespos = 0;
        this.nbytes = 0;
      }
    }
  }
}

Shen.str_from_utf8 = function(s) {
  var ret = "";
  function emit(x) {ret += String.fromCharCode(x)}
  var w = new this.Utf8_writer(emit);
  var n = s.length;
  for (var i = 0; i < n; ++i)
    w.write_byte(s[i]);
  return ret;
}

Shen.console_io = {
  open: function(name, dir) {
    var filename = Shen.globals["*home-directory*"] + name;
    if (dir.str === "in") {
      try {
        var buf = readbuffer(filename);
      } catch(e) {
        try {
          var buf = read(filename, 'binary');
        } catch (e) {
          return Shen.error(e);
        }
      }
      var stream = new Shen.Stream('r', null, function(){});
      if (buf.byteLength !== undefined) {
        stream.read_byte = (function() {
          return Shen.file_instream_get_buf(stream, buf, 0);
        });
      } else {
        var strbuf = new Shen.Utf8_reader(buf);
        stream.read_byte = (function() {return strbuf.read_byte();});
      }
      return stream;
    } else if (dir.str === "out")
      return Shen.error("Writing files is not supported in cli interpreter");
    return Shen.error("Unsupported open flags");
  },

  init: function() {
    try {
      this.puts = putstr;
    } catch (e) {
      this.puts = write;
    }
    this.gets = readline;
    var stdout = new Shen.Stream('w',
                                 function(byte) {
                                  return writer.write_byte(byte);
                                 });
    var stdin = new Shen.Stream('r', null, quit);
    var strbuf = new Shen.Utf8_reader(null);
    stdin.read_byte = (function() {
      return Shen.repl_read_byte(stdin, strbuf);
    });
    Shen.globals["*stinput*"] = stdin;
    Shen.globals["*stoutput*"] = stdout;
  }
};

/* } Console IO */


Shen.nop = function(vm) {
  vm.wipe_stack(0);
  return vm.next;
}

Shen.defun_x("shen.process-datatype", 2, Shen.nop);
Shen.defun_x("compile", 3, Shen.nop);
Shen.defun_x("declare", 2, Shen.nop);
Shen.defun_x("adjoin", 2, Shen.nop);

Shen.init = function(opts) {
  this.io = opts.io;
  if (!this.io)
    return this.error("Shen: IO is not set");
  this.io.init();
  var keys = ['gets', 'puts', 'open'];
  for (var i in keys)
    if (this.io[keys[i]] === undefined)
      throw new Error("Shen: IO has no method " + keys[i]);
  if (opts.repl)
    this.call("shen.shen", []);
  if (opts.bootstrap) {
    this.eval_str = this.bootstrap_eval_str;
  }
}

Shen.console_repl = function() {
  Shen.init({repl: true, io: Shen.console_io});
}

try {module.exports = Shen;} catch (e) {}
