Shenjs_tag = function() {}

shen_fail_obj = new Object
shenjs_globals = []
shenjs_functions = []

shen_type_func = new Shenjs_tag
shen_type_symbol = new Shenjs_tag
shen_type_cons = new Shenjs_tag
shen_type_stream_in = new Shenjs_tag
shen_type_stream_out = new Shenjs_tag
shen_type_stream_inout = new Shenjs_tag
shen_type_error = new Shenjs_tag

shen_true = true
shen_false = false

Shenjs_freeze = function(vars, fn) {
  this.vars = vars
  this.fn = fn
}

function shenjs_mkfunction(name, nargs, fn) {
  var x = [shen_type_func, fn, nargs, [], name]
  shenjs_functions[name] = x
  return x
}

function shenjs_call_tail(x, args) {
  var j = 0, nargs = args.length
  for (;;) {
    if (typeof(x) == "function") {
      x = x([args[j++]])
    } else if (x[0] == shen_type_func) {
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
    } else if (x[0] == shen_type_symbol) {
      x = shenjs_get_fn(x)
    } else
      return shenjs_error("shenjs_call: Wrong function: '" + x + "'")
    if (j >= nargs)
      return x
    while (typeof(x) == "function")
      x = x()
  }
  return x
}

function shenjs_call(x, args) {
  var x = shenjs_call_tail(x, args)
  while (typeof(x) == "function")
    x = x()
  return x
}

function shenjs_unwind_tail(x) {
  while(typeof(x) == "function")
    x = x()
  return x
}

function shenjs_get_fn(x) {
  if (typeof(x) == "function")
    shenjs_error("passed function into get_fn")
  switch (x[0]) {
  case shen_type_func: return x
  case shen_type_symbol:
    var v = shenjs_functions["shen_" + x[1]]
    if (v != undefined)
      return v
    v = shenjs_functions["shen_shen_" + x[1]]
    if (v != undefined)
      return v
    shenjs_error("Cannot find '" + x[1] + "' or 'shen_" + x[1] + "'")
    return shen_fail_obj
  }
  throw new Error("function " + shenjs_str_shen_from_js(x[1]) + " not found")
}

function shenjs_thaw(f) {
  return f.fn(f.vars)
}

function shenjs_error(s) {
  if (shenjs_is_true(shenjs_globals['shen_shen-*show-error-js*']))
    shenjs_puts("# err: " + s + "\n")
  throw new Error(s);
  return shen_fail_obj
}

function shenjs_error_to_string(s) {
  var stack = s.stack;
  var show = (stack !== undefined);
  show &= shenjs_is_true(shenjs_globals["shen_shenjs-*show-error-stack*"]);
  return (show) ? ("" + s + " " + stack) : ("" + s);
}

function shenjs_get_time(x) {
  return (new Date()).getTime() / 1000.0
}

shenjs_simple_error = shenjs_error

shenjs_log_eq = false

function shenjs_trap_error(fn, handler) {
  try {
    return fn()
  } catch (e) {
    return shenjs_call(handler, [e])
  }
}

function shenjs_notrap_error(fn, handler) {
  return fn()
}

function shenjs_equal_boolean(b, x) {
  return ((x instanceof Array)
          && x[0] == shen_type_symbol
          && ((x[1] == "true" && b === true)
              || (x[1] == "false" && b === false)))
}

function shenjs_equal_function(f, x) {
  return (x[0] == shen_type_symbol && f[0] == shen_type_func && x[1] == f[4])
}

function shenjs_$eq$(x, y) {
  if (x === y)
    return true
  var tx = typeof(x), ty = typeof(y)
  if (tx != ty)
    return ((tx == "boolean" && shenjs_equal_boolean(x, y))
            || (ty == "boolean" && shenjs_equal_boolean(y, x)))
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

    if (shenjs_equal_function(x, y) || shenjs_equal_function(y, x))
      return true
    if (x.length != y.length)
      return false
    if (x.length == 0)
      return true
    if (x == shen_fail_obj && y == shen_fail_obj)
      return true
    if (x[0] != y[0])
      return false
    switch (x[0]) {
    case shen_type_func:
     if (x[1] != y[1] || x[2] != y[2])
        return false
      var n = x[3].length
      if (n != y[3].length)
        return false
      for (var i = 0; i < n; ++i)
        if (x[3][i] != y[3][i])
          return false
      return true
    case shen_type_symbol: return x[1] == y[1];
    case shen_type_cons:
      var r = shenjs_$eq$(x[1], y[1])
      while (typeof(r) == "function")
        r = r()
      if (!r)
        return false
      return (function() {
        var r = shenjs_$eq$(x[2], y[2])
        while (typeof(r) == "function")
          r = r()
        return r
      });
    case shen_type_stream_out:
    case shen_type_stream_in: return x[1] == y[1] && x[2] == y[2];
    default:
      for (var i = 1; i < x.length; ++i) {
        var r = shenjs_$eq$(x[i], y[i])
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

function shenjs_empty$question$(x) {
  return ((x instanceof Array) && !x.length)
}

function shenjs_is_type(x, type) {
  if (type == shen_type_symbol && (x === true || x === false))
    return true
  return ((x instanceof Array) && x[0] == type)
}

function shenjs_boolean$question$(x) {
  return (typeof(x) == "boolean") || (shenjs_is_type(x, shen_type_symbol)
                                      && (x[1] == "true" || x[1] == "false"))
}

function shenjs_vector$question$(x) {
  return ((x instanceof Array) && x[0] > 0)
}

function shenjs_absvector$question$(x) {
  return ((x instanceof Array) && x.length > 0
          && (!(x[0] instanceof Shenjs_tag)))
}

function shenjs_absvector(n) {
  var ret = new Array(n)
  for (var i = 0; i < n; ++i)
    ret[i] = shen_fail_obj
  return ret
}

function dbg_princ(s, x) {
  dbg_print(" " + s + x)
  return x
}

function dbg_print(s) {
  if (shenjs_is_true(shenjs_globals['shen_shen-*show-error-js*']))
    shenjs_puts(s + "\n")
}

function shenjs_is_true(x) {
  return x != false || ((x instanceof Array)
                        && (x[0] == shen_type_symbol)
                        && (x[1] != "false"))
}

function shenjs_absvector_ref(x, i) {
  if (x.length <= i || i < 0)
    shenjs_error("out of range")
  return x[i]
}

function shenjs_absvector_set(x, i, v) {
  if (x.length <= i || i < 0)
    shenjs_error("out of range")
  x[i] = v
  return x
}

function shenjs_value(x) {
  var y = shenjs_globals["shen_" + s[1]]
  if (y === undefined)
    shenjs_error("The variable " + x + " is unbound.")
  else
    return y
}

function shenjs_vector(n) {
  var r = new Array(n + 1)
  r[0] = n
  for (var i = 1; i <= n; ++i)
    r[i] = shen_fail_obj
  return r
}

function shenjs_esc(x) {
  var ret = ""
  for (var i = 0; i < x.length; ++i)
    switch (x[i]) {
      case '"': ret += '\\"'; break;
      default: ret += x[i]; break
    }
  return ret
}

shenjs_sym_map_shen = []
shenjs_sym_map_js = []

shenjs_word_restricted = []

function shenjs_init_restricted () {
  var words = [
    "return", "new", "delete", "function", "while", "for", "var", "if", "do",
    "in", "super", "load", "print", "eval", "read", "readline", "write",
    "putstr", "let", "Array", "Object", "document"
  ];
  var nwords = words.length;
  for (var i = 0; i < nwords; ++i)
    shenjs_word_restricted[words[i]] = 1
}
shenjs_init_restricted()

function shenjs_register_sym_map(js, shen) {
  shenjs_sym_map_js[shen] = js
  shenjs_sym_map_shen[js] = shen
}

function shenjs_str_shen_from_js(s) {
  return shenjs_str_map([], shenjs_sym_map_shen, s)
}

function shenjs_str_js_from_shen(s) {
  return shenjs_str_map(shenjs_word_restricted, shenjs_sym_map_js, s)
}

shenjs_register_sym_map("_", "-")
shenjs_register_sym_map("$_", "_")
shenjs_register_sym_map("$$", "$")
shenjs_register_sym_map("$quote$", "'")
shenjs_register_sym_map("$bquote$", "`")
shenjs_register_sym_map("$slash$", "/")
shenjs_register_sym_map("$asterisk$", "*")
shenjs_register_sym_map("$plus$", "+")
shenjs_register_sym_map("$percent$", "%")
shenjs_register_sym_map("$eq$", "=")
shenjs_register_sym_map("$question$", "?")
shenjs_register_sym_map("$excl$", "!")
shenjs_register_sym_map("$gt$", ">")
shenjs_register_sym_map("$lt$", "<")
shenjs_register_sym_map("$dot$", ".")
shenjs_register_sym_map("$bar$", "|")
shenjs_register_sym_map("$sharp$", "#")
shenjs_register_sym_map("$tilde$", "~")
shenjs_register_sym_map("$colon$", ":")
shenjs_register_sym_map("$sc$", ";")
shenjs_register_sym_map("$amp$", "&")
shenjs_register_sym_map("$at$", "@")
shenjs_register_sym_map("$cbraceopen$", "{")
shenjs_register_sym_map("$cbraceclose$", "}")
shenjs_register_sym_map("$shen$", "")

function shenjs_str_starts_with(s, start) {
  var len = start.length
  if (s.length < len)
    return false
  return (s.substring(0, len) == start)
}

function shenjs_str_map(word_tbl, sym_tbl, s) {
  if (word_tbl[s])
    return "$shen$" + s
  var ret = ""
  var replaced
  while (s != "") {
    replaced = false
    for (k in sym_tbl)
      if (k != "" && shenjs_str_starts_with(s, k)) {
        ret += sym_tbl[k]
        s = s.substring(k.length, s.length)
        replaced = true
        break
      }
    if (!replaced) {
      ret += s[0]
      s = s.substring(1, s.length)
    }
  }
  return ret
}

function shenjs_str(x) {
  var err = " is not an atom in Shen; str cannot print it to a string."
  switch (typeof(x)) {
    case "string": return "\"" + shenjs_esc(x) + "\""
    case "number":
    case "boolean": return "" + x
    case "function":
      if (x.name.length > 0)
        return shenjs_str_shen_from_js(x.name)
      return "#<function>"
    case "object":
      if (x == shen_fail_obj)
        return "fail!"
      if (x instanceof Array) {
        if (x.length <= 0) {
          shenjs_error("[]" + err)
          return shen_fail_obj
        }
        switch (x[0]) {
          case shen_type_symbol: return x[1]
          case shen_type_func:
            if (!x[3].length && x[4] != undefined)
              return x[4]
            if (shenjs_is_true(shenjs_globals['shen_shen-*show-func-js*']))
              shenjs_puts("\n func: " + x + "\n\n")
            return (x[3].length == 0) ? "#<function>" : "#<closure>"
        }
      }
  }
  shenjs_error([x + err])
  return shen_fail_obj
}

function shenjs_intern(x) {
  switch (x) {
  case "true": return true
  case "false": return false
  default: return [shen_type_symbol, x]
  }
}

function shenjs_tlstr(x) {
  if (x == "")
    return [shen_type_symbol, "shen_eos"]
  return x.substring(1, x.length)
}

function shenjs_n_$gt$string(x) {
  return String.fromCharCode(x)
}

function shenjs_string_$gt$n(x) {
  return x.charCodeAt(0)
}

function shenjs_eval_in_global(x) {
  try {
    var g = window;
  } catch (e) {
    var g = this;
  }
  if (g.execScript) // eval in global scope for IE
    return g.execScript(x);
  else // other browsers
    return eval.call(null, x);
}

function shenjs_eval_kl(x) {
  var log = false
  if (shenjs_is_true(shenjs_globals['shen_shen-*show-eval-js*']))
    log = true
  if (log) {
    shenjs_puts("# eval-kl[KL]: " + "\n")
    shenjs_puts(shenjs_call(shen_intmake_string,
                            ["~R~%", [shen_tuple, x, []]]))
  }
  var js = shenjs_call(js_from_kl, [x])
  if (log)
    shenjs_puts("eval-kl[JS]:\n" + js + "\n\n")
  var ret = shenjs_eval_in_global(js)
  if (log)
    shenjs_puts("eval-kl => '" + ret + "'\n\n")
  if (ret === undefined)
    shenjs_error("evaluated '" + js + "' to undefined")
  return ret
}

shenjs_load = shenjs_mkfunction("shenjs-load", 1, function self(x) {
  if (x.length < 1) return [shen_type_func, self, 1, x]
  return (function() {
    load(x)
    return []
  })
})

shenjs_exit = shenjs_mkfunction("shenjs-exit", 1, function self(x) {
  quit()
})

shenjs_globals["shen_*language*"] = "Javascript"
shenjs_globals["shen_*implementation*"] = "cli"
shenjs_globals["shen_*port*"] = "0.9.2"
shenjs_globals["shen_*porters*"] = "Ramil Farkhshatov"
shenjs_globals["shen_js-skip-internals"] = true

shenjs_globals["shen_shen-*show-error-js*"] = false
shenjs_globals["shen_shen-*show-eval-js*"] = false
shenjs_globals["shen_shen-*show-func-js*"] = false
shenjs_globals["shen_shen-*dbg-js*"] = false
shenjs_globals["shen_shenjs-*show-error-stack*"] = false
