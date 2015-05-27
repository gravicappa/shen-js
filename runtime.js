shen = (function() {
  var id = 0,
      threads = {};

  function Shen() {
    this.id = id++;
    this.sp = 0;
    this.nargs = 0;
    this.reg = Array(1024);
    this.start = null;
    this.ip = null;
    this.ret = null;
    this.error_handlers = [];
    this.call_toplevel = null;
    this.io = null;
    this.chan_in = null;
    this.interrupted = false;
  }

  Shen.prototype.toString = function() {
    return "[object Shen " + id + "]";
  };

  Shen.prototype.lambdas = {};
  Shen.prototype.tags = {};
  Shen.prototype.toplevels = [];
  Shen.prototype.glob = {};
  Shen.prototype.fns = {};
  Shen.prototype.run_span_len = 1000;
  Shen.prototype.run_span_interval_ms = 20;
  Shen.prototype.glob = {
    "*language*": "Javascript",
    "*implementation*": "generic",
    "*port*": "3.0.0",
    "*porters*": "Ramil Farkhshatov",
    "*home-directory*": "",
    "js.show-error-stack": false
  };

  Shen.prototype.Tag = function Tag(name) {
    if (!(this instanceof Tag))
      return new Tag(name);
    Shen.prototype.tags[name] = this;
    this.name = name;
  };

  Shen.prototype.Tag.prototype.toString = function() {
    return "[object shen.Tag " + this.name + "]";
  };

  Shen.prototype.Tag.prototype.toJSON = function() {
    return {"#" : this.name};
  };

  Shen.prototype.fail_obj = new Shen.prototype.Tag("fail_obj");
  Shen.prototype.interrupt_obj = new Shen.prototype.Tag("interrupt_obj");

  Shen.prototype.Func = function Func(name, arity, fn, vars) {
    if (!(this instanceof Func))
      return new Func(name, arity, fn, vars);
    this.name = name;
    this.arity = arity;
    this.fn = fn;
    this.vars = vars || [];
  };

  Shen.prototype.Func.prototype.toJSON = function() {
    if (this.name && !this.vars.length)
      return {"#" : "Func", name: this.name};
    else
      return {"#" : "Func", name: this.name, arity: this.arity,
              fn: this.fn.name, vars: this.vars};
  };

  Shen.prototype.Sym = function Sym(str) {
    if (!(this instanceof Sym))
      return new Sym(str);
    this.str = str;
  };

  Shen.prototype.Sym.prototype.toJSON = function() {
    return {"#" : "Sym", str: this.str};
  };

  Shen.prototype.Cons = function Cons(head, tail) {
    if (!(this instanceof Cons))
      return new Cons(head, tail);
    this.head = head;
    this.tail = tail;
  };
  
  Shen.prototype.Cons.prototype.toJSON = function() {
    var t = this.tail, r = {"#": "Cons", head: this.head};
    if (!((t instanceof Array) && !t.length))
      r.tail = t;
    return r;
  };

  Shen.prototype.Stream = function Stream(dir, fn, close) {
    if (!(this instanceof Stream))
      return new Stream(dir, fn, close);
    this.dir = dir || "";
    this.close = close || (function(vm) {return [];});
    this.read_byte = function(vm) {
      return vm.error("read-byte: Wrong stream type.");
    };
    this.write_byte = function(byte, vm) {
      vm.error("write-byte: Wrong stream type.");
    };
    switch (dir) {
    case "r": this.read_byte = fn; break;
    case "w": this.write_byte = fn; break;
    case "rw":
    case "wr":
      this.in = fn[0];
      this.out = fn[1];
      this.read_byte = function(vm) {return this.in.read_byte(vm);};
      this.write_byte = function(byte, vm) {
        return this.out.write_byte(byte, vm);
      };
      this.close = function(vm) {
        this.in.close(vm);
        this.out.close(vm);
        return [];
      };
    }
  };

  Shen.prototype.Chan = function Chan() {
    if (!(this instanceof Chan))
      return new Chan();
    this.buf = [];
    this.readers = [];
    this.closed = false;
  };

  Shen.prototype.Chan.prototype.write = function(x) {
    if (this.closed)
      return false;
    var reader = this.readers.shift();
    if (reader)
      reader.resume(x);
    else
      this.buf.push(x);
    return true;
  };

  Shen.prototype.Chan.prototype.read = function(vm) {
    if (this.buf.length)
      return this.buf.shift();
    if (this.closed)
      return vm.fail_obj;
    if (!Object.keys(threads).length)
      vm.error("Possible deadlock");
    this.readers.push(vm);
    vm.interrupt();
  };

  Shen.prototype.Chan.prototype.close = function(vm) {
    this.closed = true;
    var r = this.readers;
    for (var i = 0; i < r.length; ++i)
      r[i].resume(vm.fail_obj);
    this.readers.length = 0;
    return true;
  };

  Shen.prototype.reg_lambda = function(f) {
    this.lambdas[f.name] = f;
  };

  Shen.prototype.json_from_obj = function(obj) {
    return JSON.stringify(obj);
  };

  Shen.prototype.obj_from_json = function(json) {
    var vm = this;
    return JSON.parse(json, function(k, v) {
      if (!v)
        return v;
      var type = v["#"], tag;
      if (!type)
        return v;
      if ((tag = vm.tags[type]))
        return tag;
      switch (type) {
      case "Sym": return vm.Sym(v.str);
      case "Cons": 
        if (v.tail === undefined)
          v.tail = [];
        return vm.Cons(v.head, v.tail);
      case "Func":
        var fn = vm.fns[v.name];
        if (fn)
          return fn;
        var code = vm.lambdas[v.fn];
        if (!code)
          code = eval(v.fn);
        return vm.Func(v.name, v.arity, code, v.args);
      }
      return v;
    });
  };

  Shen.prototype.clone = function() {
    var obj = new this.constructor(),
        keys = ["io", "run", "fn_entry", "fn_return", "run_span_len"],
        key;
    for (var i = 0; i < keys.length; ++i) {
      key = keys[i];
      obj[key] = this[key];
    }
    return obj;
  };

  Shen.prototype.handle_exception = function(e) {
    var err_handler = this.error_handlers.pop();
    this.wipe_stack(0);
    this.sp = err_handler.sp;
    this.next = err_handler.next;
    return this.prep_func_call(err_handler.fn, [e]);
  };

  Shen.prototype.push_error_handler = function(e) {
    this.error_handlers.push({sp: this.sp, next: this.next, fn: e});
  };

  Shen.prototype.interrupt = function() {
    throw this.interrupt_obj;
  };

  Shen.prototype.resume = function(value) {
    if (this.interrupted) {
      this.interrupted = false;
      this.ret = value || true;
      this.run();
    }
  };

  Shen.prototype.sleep_ms = function(ms) {
    var vm = this;
    this.post_async(function() {
      vm.resume(true);
    }, ms);
    this.interrupt();
  };

  function run(ip, vm) {
    while (ip) {
      if (vm.dump_state_enabled)
        vm.dump_state({ip: ip});
      ip = ip(vm);
    }
    return ip;
  }

  function trap(e, vm) {
    if (e !== vm.interrupt_obj) {
      if (vm.error_handlers.length > 0)
        return vm.handle_exception(e);
      else
        throw e;
    } else {
      vm.interrupted = true;
      vm.start = vm.next;
      return null;
    }
  }

  Shen.prototype.run = function() {
    var ip = this.start;
    threads[this] = true;
    while (ip) {
      try {
        ip = run(ip, this);
      } catch (e) {
        ip = trap(e, this);
      }
    }
    delete threads[this];
    if (this.receive)
      this.receive(this.ret);
  };

  Shen.prototype.step = function step() {
    var ip = this.start, n = this.run_span_len;
    function run_n(ip, n, vm) {
      while (ip && n--)
        ip = ip(vm);
      return ip;
    }
    while (ip && n > 0) {
      try {
        ip = run_n(ip, n, this);
      } catch (e) {
        ip = trap(e, this);
      }
    }
    if (ip) {
      this.start = ip;
      this.run_interval();
    } else {
      delete threads[this];
      if (!this.interrupted && this.receive)
        this.receive(this.ret);
    }
  };

  Shen.prototype.run_interval = function() {
    var vm = this;
    this.post_async(function() {vm.step();}, 0);
    threads[this] = true;
  };

  Shen.prototype.prep_func_call = function(proc, args) {
    var n = args.length, closure_vars,
        reg = this.reg;
    n2 = 0;
    if (proc instanceof this.Func)
      n2 = proc.vars.length;
    for (var i = this.sp, j = n - 1; j >= 0; ++i, --j)
      reg[i] = args[j];
    i = this.sp + n;
    if (proc instanceof this.Func) {
      fn = proc.fn;
      closure_vars = proc.vars;
      for (var j = 0; j < n2; ++i, ++j)
        reg[i] = closure_vars[j];
    } else if (typeof(proc) == "function")
      fn = proc;
    else
      throw new Error("" + proc + " is not a function");
    this.nargs = n + n2;
    return fn;
  };

  Shen.prototype.find_func = function(fn) {
    if (fn instanceof this.Func)
      return fn;
    if (fn instanceof this.Sym)
      fn = fn.str;
    var ret = this.fns[fn];
    if (!ret)
      return this.error("No such function: " + fn);
    return ret;
  };

  Shen.prototype.ensure_func = function(fn) {
    if (fn instanceof this.Sym)
      return this.find_func(fn.str);
    return fn;
  };

  Shen.prototype.post_async = function(x, ms) {
    setTimeout(x, ms);
  };

  Shen.prototype.is_async = function() {
    return (this.run !== Shen.prototype.run);
  };

  Shen.prototype.set_async = function(is_async) {
    if (!is_async || is_async === "sync")
      this.run = Shen.prototype.run;
    else {
      if (!this.is_async())
        this.calibrate();
      if (typeof(setTimeout) === "undefined")
        throw new Error("Cannot set async mode: no setTimeout");
      this.run = Shen.prototype.run_interval;
    }
  };

  Shen.prototype.exec = function(proc, args, receive) {
    if (threads[this])
      this.error("Recursive shen.exec is not allowed");
    if (typeof(proc) === "string")
      proc = this.find_func(proc);

    // DBG
    this.reg.length = 0;

    this.receive = receive;
    this.next = null;
    this.start = this.prep_func_call(proc, args);
    this.run();
    if (!this.is_async())
      return this.exec_result();
  };

  Shen.prototype.exec_result = function() {
    var r = this.ret;
    this.ret = null;

    // DBG
    if (this.sp < 0) 
      this.error("sp < 0");

    return r;
  };

  Shen.prototype.call = function(proc, args, receive) {
    var self = this;
    var vm = this.clone();
    if (this.run !== Shen.prototype.run) {
      var parent = this;
      function xreceive(x) {
        if (receive)
          receive(x);
        parent.resume(x);
      }
      this.interrupt();
      return vm.exec(proc, args, xreceive);
    } else
      return vm.exec(proc, args, receive);
  };

  Shen.prototype.call_toplevel_boot = function(proc) {
    this.toplevels.push(proc);
  }

  Shen.prototype.call_toplevel_run = function(proc) {
    this.exec(proc, []);
  };

  Shen.prototype.put_closure_args = function(closure) {
    var vars = closure.vars;
    if (vars && vars.length) {
      var n = vars.length,
          i = this.sp + this.nargs,
          reg = this.reg;
      for (var j = 0; j < n; ++i, ++j)
        reg[i] = vars[j];
      this.nargs += vars.length;
    }
  };

  Shen.prototype.equal_boolean = function(b, x) {
    return ((x instanceof this.Sym)
            && ((x.str == "true" && b === true)
                || (x.str == "false" && b === false)));
  };

  Shen.prototype.equal_function = function(f, x) {
    return (x instanceof this.Sym) && x.str == f.name;
  };

  Shen.prototype.is_array_equal = function(x, y) {
    if (x.length != y.length)
      return false;
    var n = x.length;
    for (var i = 0; i < n; ++i)
      if (!this.is_equal(x[i], y[i]))
        return false;
    return true;
  }

  Shen.prototype.is_stream_equal = function(x, y) {
    return x.dir === y.dir && x.read_byte === y.read_byte
           && x.write_byte === y.write_byte && x.close === y.close;
  };

  Shen.prototype.trace = function(name) {
    var fn = this[name];
    function tostr(x) {
      return this.xstr(x);
    };
    var replaced = function() {
      var args = Array.prototype.slice.call(arguments);
      log("(" + name + " " + args.map(tostr).join(" ") + ")");
      var ret = fn.apply(this, arguments);
      log("" + name + " => " + this.xstr(ret));
      return ret;
    };
    replaced.old = fn;
    this[name] = replaced;
  };

  Shen.prototype.untrace = function(name) {
    var fn = this[name];
    if (typeof(fn) === "function" && fn.old)
      this[name] = fn.old;
  };

  Shen.prototype.is_equal = function(x, y) {
    if (x === y)
      return true;
    if ((x instanceof Array) && (y instanceof Array))
      return this.is_array_equal(x, y);
    if ((x instanceof this.Sym) && (y instanceof this.Sym))
      return x.str === y.str;
    if (typeof(x) === "boolean" && this.equal_boolean(x, y))
      return true;
    if (typeof(y) === "boolean" && this.equal_boolean(y, x))
      return true;
    if ((x instanceof this.Cons) && (y instanceof this.Cons))
      return this.is_equal(x.head, y.head) && this.is_equal(x.tail, y.tail);
    if ((x instanceof this.Func) && (y instanceof this.Func))
      return x.fn == y.fn && x.arity == y.arity
             && this.is_array_equal(x.vars, y.vars);
    if (this.equal_function(x, y) || this.equal_function(y, x))
      return true;
    if ((x instanceof this.Stream) && (y instanceof this.Stream))
      return this.is_stream_equal(x, y);
    if ((x instanceof this.Func) && (y instanceof this.Sym) && !x.vars.length
        && x.name === y.str)
      return true;
    if ((y instanceof this.Func) && (x instanceof this.Sym) && !y.vars.length
        && y.name === x.str)
      return true;
    return false;
  };

  Shen.prototype.is_empty = function(x) {
    return ((x instanceof Array) && !x.length);
  };

  Shen.prototype.is_bool = function(x) {
    return (typeof(x) == "boolean")
           || ((x instanceof this.Sym)
               && (x.str === "true" || x.str === "false"));
  };

  Shen.prototype.is_vector = function(x) {
    return (x instanceof Array) && (typeof(x[0]) === "number")
           && x.length === (x[0] + 1);
  };

  Shen.prototype.is_absvector = function(x) {
    return (x instanceof Array) && x.length > 0;
  };

  Shen.prototype.absvector = function(n) {
    return new Array(n);
  };

  Shen.prototype.is_true = function(x) {
    return x != false || ((x instanceof this.Sym) && (x.str != "false"));
  };

  Shen.prototype.absvector_ref = function(x, i) {
    if (x.length <= i || i < 0)
      this.error("out of range");
    return x[i];
  };

  Shen.prototype.absvector_set = function(x, i, v) {
    if (x.length <= i || i < 0)
      this.error("out of range");
    x[i] = v;
    return x;
  };

  Shen.prototype.value = function(x) {
    var y = this.glob[x.str];
    if (y === undefined)
      this.error("The variable " + x.str + " is unbound.");
    else
      return y;
  };

  Shen.prototype.set = function(x, y) {
    if (!(x instanceof this.Sym))
      this.error("The value " + x + " is not a symbol");
    return (this.glob[x.str] = y);
  };

  Shen.prototype.vector = function(n) {
    var r = new Array(n + 1);
    r[0] = n;
    for (var i = 1; i <= n; ++i)
      r[i] = this.fail_obj;
    return r;
  };

  Shen.prototype.esc = function(x) {
    var ret = "";
    for (var i = 0; i < x.length; ++i)
      switch (x[i]) {
        case '"': ret += '\\"'; break;
        default: ret += x[i]; break;
      }
    return ret;
  };

  Shen.prototype.str = function(x) {
    switch (typeof(x)) {
      case "string": return "\"" + this.esc(x) + "\"";
      case "number":
      case "boolean": return String(x);
      case "function": return "#<jsfunc " + x.name + ">";
      case "object":
        if (x === this.fail_obj)
          return "...";
        if (x instanceof this.Sym)
          return x.str;
        if (x instanceof this.Func) {
          if (!x.vars.length && x.name)
            return x.name;
          var n = (x.name) ? (" " + x.name) : " [nil]";
          return (!x.vars.length) ? "#<func" + n + ">" : "#<closure" + n + ">";
        }
    }
    var err = " is not an atom in Shen; str cannot print it to a string."
    return this.error(String(x) + err);
  };

  Shen.prototype.intern = function(x) {
    switch (x) {
    case "true": return true;
    case "false": return false;
    default: return new this.Sym(x);
    }
  };

  Shen.prototype.tlstr = function(x) {
    if (x === "")
      return new this.Sym("shen.eos");
    return x.substring(1, x.length);
  };

  Shen.prototype.str_from_n = function(x) {
    return String.fromCharCode(x);
  };

  Shen.prototype.n_from_str = function(x) {
    return x.charCodeAt(0);
  };

  Shen.prototype.wipe_stack = function(start) {
    this.reg.length = this.sp + start;
  };

  Shen.prototype.error = function(s) {
    throw new Error(s);
    return this.fail_obj;
  };

  Shen.prototype.error_to_string = function(s) {
    var stack = s.stack,
        show = (stack !== undefined),
        s = s.toString().replace(/^Error: /, "");
    show &= this.is_true(this.glob["js.show-error-stack"]);
    return (show) ? (s + " " + stack) : s;
  };

  Shen.prototype.write_string = function(s, stream) {
    for (var i = 0; i < s.length; ++i)
      stream.write_byte(s.charCodeAt(i), this);
    return s;
  };

  Shen.prototype.defun_x = function(name, arity, fn) {
    var fobj = new this.Func(name, arity, fn);
    this.fns[name] = fobj;
    return fobj;
  };

  Shen.prototype.defun = function() {
    function dashify(s) {
      return s.replace(/_/g, "-");
    }
    var arg0 = arguments[0], arg1 = arguments[1], fn, name, arity, fobj;
    switch (typeof(arg0)) {
    case "function":
      fn = arg0;
     name = dashify(fn.name);
      break;
    case "string":
      fn = arguments[1];
      name = arguments[0];
      break;
    default:
      return this.error("defun: wrong arguments");
    }
    arity = fn.length;
    fobj = new this.Func(name, arity, function f(vm) {
      var x = vm.fn_entry(f, arity, name), sp, args;
      if (x !== vm.fail_obj) return x;
      sp = vm.sp;
      args = vm.reg.slice(sp, sp + arity).reverse();
      return vm.fn_return(fn.apply(vm, args), vm.next);
    });
    this.fns[name] = fobj;
    return fobj;
  };

  Shen.prototype.partial_func = function(name, arity, fn) {
    var vars = this.reg.slice(this.sp, this.sp + this.nargs);
    return new this.Func(name, arity, fn, vars);
  };

  Shen.prototype.defun_x("klvm.mk-closure", -1, function mk_closure(vm) {
    var r = vm.reg, sp = vm.sp, n = vm.nargs, fn = r[sp + n - 1];
    if (fn instanceof vm.Func)
      fn = fn.fn;
    vm.ret = new vm.Func(null, n - 1, fn, r.slice(sp, sp + n - 1));
    return vm.next;
  });

  Shen.prototype.eval = function(s) {
    this.ret = false;
    var vm = this, toplevel_next = this.next;
    if (this.dump_eval_enabled)
      print("EVAL:\n" + s + "\n");
    this.wipe_stack(0);
    eval("(function(vm) { " + s + " })(vm);");
    return toplevel_next;
  };

// UTILS {
  Shen.prototype.xstr_arr = function(x, nmax) {
    var xstr = this.xstr.bind(this);
    if (nmax)
      return x.slice(0, nmax).join(" ") + " ...";
    return x.map(xstr).join(" ");
  };

  Shen.prototype.xstr_cons = function(x, nmax) {
    var lst = [], i = 0;
    do {
      lst.push(this.xstr(x.head, nmax));
      x = x.tail;
      i++;
    } while (x instanceof this.Cons && (!nmax || i < nmax));
    var str = lst.join(" ");
    if (nmax) {
      str += " ...";
    } else if (!this.is_empty(x))
      str += " | " + this.xstr(x, nmax);
    return "[" + str + "]";
  };

  Shen.prototype.xstr = function(x, nmax) {
    switch (typeof(x)) {
      case "string": return '"' + this.esc(x) + '"';
      case "boolean": case "number": return String(x);
      case "function": 
        if (x.name)
          return "#<jsfunc " + x.name + ">";
        return "#<jsfunc>";
    }
    if (x instanceof this.Sym)
      return x.str;
    if (x instanceof this.Cons)
      return this.xstr_cons(x, nmax);
    if (x instanceof this.Func)
      return "#<func " + x.name + " <" + this.xstr_arr(x.vars) + ">>";
    if (this.is_empty(x))
      return "[]";
    if (this.is_vector(x))
      return "<" + this.xstr_arr(x, nmax) + ">";
    if (x instanceof Array)
      return "<<" + this.xstr_arr(x, nmax) + ">>";
    return String(x);
  };

  Shen.prototype.list = function(x) {
    var ret = [];
    for (var i = x.length - 1; i >= 0; --i)
      ret = new this.Cons(x[i], ret);
    return ret;
  };

  function log(s) {
    try {
      console.log(new Date(), s);
    } catch (e) {
      print(s);
    }
  };
  Shen.prototype.log = log;

  Shen.prototype.dump_regs = function(start, n) {
    var r = this.reg,
        n = n || 20,
        start = (start === undefined) ? this.sp : start;
    for (var i = start, j = start; i < r.length; ++i) {
      if (r[i] !== undefined) {
        if (j + 1 == i - 1)
          log("    " + (i - 1) + ": nil");
        else if (j + 1 < i)
          log("    " + (j + 1) + ".." + (i - 1) + ": nil");
        var x = this.dbg_str_prefixed(this.xstr(r[i], n), "      ");
        log("    " + i + ": " + x);
        j = i;
      }
    }
  };

  Shen.prototype.dbg_str_prefixed = function(x, prefix) {
    function pre(x) {return prefix + x;}
    var lines = String(x).split("\n");
    if (lines.length < 2)
      return x;
    return lines[0] + "\n" + lines.slice(1).map(pre).join("\n");
  };

  Shen.prototype.dump_state = function(extra) {
    var n = 20;
    log("# STEP ################");
    for (var x in extra)
      log("  " + x + ": " + this.xstr(extra[x]));
    log("  next: " + this.xstr(this.next));
    log("  ret: " + this.xstr(this.ret, n));
    log("  nargs: " + this.nargs);
    log("  sp: " + this.sp);
    log("  regs:");
    this.dump_regs(this.sp, n);
    log("\n");
  };
  // } UTILS

  // IO {
  Shen.prototype.Utf8_reader = function(str) {
    this.str = str || "";
    this.strpos = 0;
    this.bytes = Array(6);
    this.bytepos = 0;
    this.nbytes = 0;
    this.append = function(data) {
      this.str += data;
    };
    this.read_byte = function() {
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
        var n = 1, c0 = (c >> 6) | 192;
      } else if (c <= 0xffff) {
        var n = 2, c0 = (c >> 12) | 224;
      } else if (c <= 0x1fffff) {
        var n = 3, c0 = (c >> 18) | 240;
      } else if (c <= 0x3ffffff) {
        var n = 4, c0 = (c >> 24) | 248;
      } else if (c <= 0x7fffffff) {
        var n = 5, c0 = (c >> 30) | 252;
      } else
        throw new Error("Character " + c + " cannot be coded to UTF-8");
      this.nbytes = n;
      var shift = (n - 1) * 6;
      for (var i = 0; i < n; ++i, shift -= 6)
        this.bytes[i] = ((c >> shift) & 63) | 128;
      return c0;
    };
  };

  Shen.prototype.Utf8_writer = function(char_fn) {
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
  };

  Shen.prototype.str_from_utf8 = function(s) {
    var ret = "";
    function emit(x) {ret += String.fromCharCode(x);}
    var w = new this.Utf8_writer(emit), n = s.length;
    for (var i = 0; i < n; ++i)
      w.write_byte(s[i]);
    return ret;
  };

  Shen.prototype.utf8_from_str = function(s) {
    var c, r = new this.Utf8_reader(s), bytes = [];
    while ((c = r.read_byte()) >= 0)
      bytes.push(c);
    return bytes;
  };

  Shen.prototype.buf_stream = function(buf) {
    var arr = new Uint8Array(buf);
    function r() {
      var buf = this.buf;
      if (this.pos >= buf.length)
        return -1;
      return buf[this.pos++];
    }
    var stream = new this.Stream('r', r, function() {});
    stream.pos = 0;
    stream.buf = arr;
    return stream;
  };

  Shen.prototype.console_io = function(vm) {
    var io = {};

    function file_reader() {
      try {
        return readbuffer;
      } catch(e) {
        read;
        return function(name) {return read(name, "binary")};
      }
    }

    function open(name, dir, vm) {
      var filename = vm.glob["*home-directory*"] + name;
      if (typeof($HOME) !== "undefined")
        var filename = filename.replace(/^~/, $HOME);
      if (dir.str === "in") {
        var buf = file_reader()(filename);
        if (buf instanceof ArrayBuffer)
          return vm.buf_stream(buf);
        else if (typeof(buf) === "string") {
          var strbuf = new vm.Utf8_reader(buf);
          return new vm.Stream("r",
                               function(vm) {return strbuf.read_byte();},
                               function(vm){});
        } else
          return vm.error("Unsupported file read result");
      } else if (dir.str === "out")
        return vm.error("Writing files is not supported in cli interpreter");
      return vm.error("Unsupported 'open' flags");
    };

    var putchars = null;
    try {putchars = putstr;} catch(e) {}
    try {putchars = write;} catch(e) {}
    if (!putchars)
      throw new Error("You JS implementation's IO is not supported");

    var writer = new vm.Utf8_writer(function(char) {
      putchars(String.fromCharCode(char));
    });
    var stdout = new vm.Stream("w", function(byte, vm) {
                                      writer.write_byte(byte);
                                    });
    var strbuf = new vm.Utf8_reader();
    function read_byte(vm) {
      var x = strbuf.read_byte();
      if (x >= 0)
        return x;
      var str = readline();
      if (str == null) {
        quit();
        return -1;
      }
      strbuf = new vm.Utf8_reader(str + "\n");
      return this.read_byte(vm);
    }
    var stdin = new vm.Stream("r", read_byte, function(vm) {quit();});
    vm.glob["*stinput*"] = stdin;
    vm.glob["*stoutput*"] = stdout;
    io.open = open;
    return io;
  };

  Shen.prototype.chan_in_stream = function(chan) {
    function read_byte(vm) {
      return chan.read(vm);
    }
    return new this.Stream("r", read_byte, function(vm) {});
  };

  Shen.prototype.ensure_chan_input = function() {
    if (!this.chan_in) {
      this.chan_in = this.Chan();
      this.glob["*stinput*"] = this.chan_in_stream(this.chan_in);
    }
  };

  Shen.prototype.send_str = function(s) {
    this.ensure_chan_input();
    var i, n = s.length, chan = this.chan_in;
    for (i = 0; i < n; ++i)
      chan.write(s.charCodeAt(i));
    return s;
  };

  Shen.prototype.print = function(s) {
    var i, n = s.length, out = this.glob["*stoutput*"];
    for (i = 0; i < n; ++i)
      out.write_byte(s.charCodeAt(i), this);
  };

  // } IO

  Shen.prototype.nop = function(vm) {
    return vm.next;
  };

  Shen.prototype.calibrate = function() {
    var n = 1000, fn = "=",
        lst = this.list([1, 2, 3, this.Sym("four"), this.list(["five"])]),
        args = [lst, lst], t_ms = Date.now();
    if (this.fns["reverse"]) {
      fn = "reverse";
      args = [lst];
    }
    log("calibrate fn: " + fn);
    for (var i = 0; i < n; ++i)
      this.exec(fn, args);
    t_ms = Date.now() - t_ms;
    log("calibrate n: " + n + " dt: " + t_ms + "ms");
    this.run_span_len = Math.floor(n * this.run_span_interval_ms / t_ms);
    log("calibrate run_span_len: " + this.run_span_len
        + " run_span_interval: " + this.run_span_interval_ms + "ms");
  };

  Shen.prototype.make_thread = function(fn) {
    var thread = this.clone();
    thread.run = Shen.prototype.run_interval;
    thread.exec(fn, []);
    return thread;
  };

  function call_toplevels(vm, i, toplevels, ondone) {
    if (i >= toplevels.length)
      return ondone();
    vm.exec(toplevels[i], [], function(ret) {
      call_toplevels(vm, i + 1, toplevels, ondone);
    });
  }

  Shen.prototype.init = function(opts) {
    var vm = this;
    this.io = opts.io(this);
    if (!this.io)
      return this.error("shen: IO is not set");
    var keys = ["open"];
    for (var i = 0; i < keys.length; ++i)
      if (!this.io[keys[i]])
        throw new Error("shen: IO has no method " + keys[i]);
    this.set_async(opts.async || false);
    if (this.toplevels.length) {
      this.call_toplevel = this.call_toplevel_run;
      call_toplevels(this, 0, this.toplevels, function() {
        vm.toplevels = [];
        end.call(vm);
      });
    } else
      end.call(this);
    function end() {
      this.reg_lambda = function() {};
      this.lambdas = {};
      if (opts.repl)
        this.start_repl();
      if (opts.ondone)
        opts.ondone();
    }
  };

  Shen.prototype.start_repl = function() {
    this.exec("shen.shen", []);
  };

  Shen.prototype.console_repl = function(opts) {
    opts.repl = true;
    opts.io = this.console_io;
    this.init(opts);
  };

  var sh = new Shen();
  sh.call_toplevel = sh.call_toplevel_boot;

  sh.defun_x("js.eval", 1, function js_eval(vm) {
    return vm.eval(vm.reg[vm.sp]);
  });

  sh.defun_x("js.interrupt", 0, function js_interrupt(vm) {
    vm.interrupt();
  });

  sh.defun("open", function open(dir, name) {
    return this.io.open(dir, name, this);
  });

  sh.defun("read-byte", function read_byte(stream) {
    return stream.read_byte(this);
  });

  sh.defun("write-byte", function write_byte(byte, stream) {
    return stream.write_byte(byte, this);
  });

  sh.defun(function get_time(type) {
    switch (type.str) {
    case "run":
    case "unix": return Math.floor(Date.now() / 1000);
    case "run/ms":
    case "unix/ms": return Date.now();
    default: return this.error("get-time does not understand the parameter "
                               + type.str);
    }
  });

  sh.defun("js.gc_stack", function gc_stack() {
    vm.wipe_stack(0);
    return true;
  });

  sh.defun("js.chan", function chan() {
    return this.Chan();
  });

  sh.defun("js.chan-read", function chan_read(chan) {
    return chan.read(this);
  });

  sh.defun("js.chan-write", function chan_write(x, chan) {
    return chan.write(x, this);
  });

  sh.defun("js.chan-close", function chan_write(chan) {
    return chan.close(this);
  });

  sh.defun("js.make-thread", function make_thread(fn) {
    var thread = this.make_thread(fn);
    return thread.id;
  });

  sh.defun("js.sleep-ms", function sleep_ms(ms) {
    this.sleep_ms(ms);
    return true;
  });

  sh.defun("js.list", function js_list(x) {
    var ret = [];
    while (x instanceof this.Cons) {
      ret.push(x.head);
      x = x.tail;
    }
    return ret;
  });

  sh.defun("js.shen_list", function js_shen_list(x) {return this.list(x);});

  return sh;
})();

try {module.exports = shen;} catch (e) {}
