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

try {
  shenjs_open;
} catch (e) {
  function shenjs_open(type, name, dir) {
    if (type[1] != "file")
      return shen_fail_obj
    var filename = shenjs_globals["shen_*home-directory*"] + name
    if (dir[1] == "in") {
      try {
        var s = read(filename)
      } catch(e) {
        shenjs_error(e)
        return shen_fail_obj
      }
      var stream = [shen_type_stream_in, null, function(){}]
      stream[1] = (function() {
        return shenjs_file_instream_get(stream, s, 0)
      })
      return stream
    } else if (dir[1] == "out") {
      shenjs_error("Writing files is not supported in cli interpreter")
      return shen_fail_obj
    }
    shenjs_error("Unsupported open flags")
    return shen_fail_obj
  }
}

try {
  shenjs_puts;
} catch (e) {
  try {
    shenjs_puts = putstr;
  } catch (e) {
    shenjs_puts = write;
  }
}

try {
  shenjs_gets;
} catch (e) {
  shenjs_gets = readline;
}

try {
  shenjs_open_repl;
} catch (e) {
  function shenjs_open_repl() {
    var fout = [shen_type_stream_out, null, null]
    fout[1] = (function(byte) {
      return shenjs_repl_write_byte(byte)
    })
    fout[2] = (function() {})
    shenjs_globals["shen_*stoutput*"] = fout

    var fin = [shen_type_stream_in, null, null]
    fin[1] = (function() {
      return shenjs_repl_read_byte(fin, shenjs_gets(), 0)
    })
    fin[2] = (function() {quit()})

    var finout = [shen_type_stream_inout, fin, fout]
    shenjs_globals["shen_*stinput*"] = finout
  }
}
/*

# Expects implemented functions
## shenjs_open(type, name, direction)
## shenjs_puts(str)
## shenjs_gets()
## shenjs_open_repl()

# Stream object structure

  stream_in -> [tag, get_byte(), close()]
  stream_out -> [tag, put_byte(byte), close()]
  stream_inout -> [tag, stream_in, stream_out]
*/

shenjs_globals["shen_*home-directory*"] = ""

function shenjs_file_instream_get(stream, s, pos) {
  if (s.length <= pos) {
    stream[1] = (function() {return -1})
    return -1
  }
  stream[1] = (function() {
    return shenjs_file_instream_get(stream, s, pos + 1)
  })
  return s.charCodeAt(pos)
}

function shenjs_read_byte(stream) {
 switch (stream[0]) {
    case shen_type_stream_in: return stream[1]()
    case shen_type_stream_inout: return shenjs_read_byte(stream[1])
    default:
      shenjs_error("read-byte: Wrong stream type.")
      return -1;
  }
}

function shenjs_write_byte(byte, stream) {
 switch (stream[0]) {
    case shen_type_stream_out:
      stream[1](byte)
      break;
    case shen_type_stream_inout:
      shenjs_write_byte(byte, stream[2])
      break;
    default: shenjs_error("write-byte: Wrong stream type.")
  }
  return []
}

function shenjs_close(stream) {
  switch (stream[0]) {
    case shen_type_stream_in:
      stream[2]()
      stream[1] = (function() {return -1});
      break;
    case shen_type_stream_out:
      stream[2]()
      stream[1] = (function(_) {return []});
      break;
    case shen_type_stream_inout:
      shenjs_close(stream[1])
      shenjs_close(stream[2])
      break;
  }
  return []
}

function shenjs_repl_write_byte(byte) {
  shenjs_puts(String.fromCharCode(byte))
}

function shenjs_repl_read_byte(stream, s, pos) {
  if (s == null) {
    stream[1] = (function() {return -1})
    quit()
    return -1
  } else if (pos >= s.length) {
    stream[1] = (function() {
      return shenjs_repl_read_byte(stream, shenjs_gets(), 0)
    })
    return shenjs_call(shen_newline, [])
  } else {
    stream[1] = (function() {
      return shenjs_repl_read_byte(stream, s, pos + 1)
    })
  }
  return s.charCodeAt(pos)
}

function shenjs_pr(s, stream) {
  for (i = 0; i < s.length; ++i)
    shenjs_write_byte(s.charCodeAt(i), stream)
  return s
}

shenjs_open_repl()
/* dummy functions to bypass defstruct's declarations */
shen_process_datatype = [shen_type_func, function(args) {return []}, 2, []]
shen_compile = [shen_type_func, function(args) {return []}, 3, []]
shen_declare = [shen_type_func, function(args) {return []}, 2, []]


shen_hd = [shen_type_func,
  function shen_user_lambda4135(Arg4134) {
  if (Arg4134.length < 1) return [shen_type_func, shen_user_lambda4135, 1, Arg4134];
  var Arg4134_0 = Arg4134[0];
  return Arg4134_0[1]},
  1,
  [],
  "hd"];
shenjs_functions["shen_hd"] = shen_hd;






shen_tl = [shen_type_func,
  function shen_user_lambda4137(Arg4136) {
  if (Arg4136.length < 1) return [shen_type_func, shen_user_lambda4137, 1, Arg4136];
  var Arg4136_0 = Arg4136[0];
  return Arg4136_0[2]},
  1,
  [],
  "tl"];
shenjs_functions["shen_tl"] = shen_tl;






shen_not = [shen_type_func,
  function shen_user_lambda4139(Arg4138) {
  if (Arg4138.length < 1) return [shen_type_func, shen_user_lambda4139, 1, Arg4138];
  var Arg4138_0 = Arg4138[0];
  return (!Arg4138_0)},
  1,
  [],
  "not"];
shenjs_functions["shen_not"] = shen_not;






shen_thaw = [shen_type_func,
  function shen_user_lambda4141(Arg4140) {
  if (Arg4140.length < 1) return [shen_type_func, shen_user_lambda4141, 1, Arg4140];
  var Arg4140_0 = Arg4140[0];
  return shenjs_thaw(Arg4140_0)},
  1,
  [],
  "thaw"];
shenjs_functions["shen_thaw"] = shen_thaw;






shen_string$question$ = [shen_type_func,
  function shen_user_lambda4143(Arg4142) {
  if (Arg4142.length < 1) return [shen_type_func, shen_user_lambda4143, 1, Arg4142];
  var Arg4142_0 = Arg4142[0];
  return (typeof(Arg4142_0) == 'string')},
  1,
  [],
  "string?"];
shenjs_functions["shen_string?"] = shen_string$question$;






shen_number$question$ = [shen_type_func,
  function shen_user_lambda4145(Arg4144) {
  if (Arg4144.length < 1) return [shen_type_func, shen_user_lambda4145, 1, Arg4144];
  var Arg4144_0 = Arg4144[0];
  return (typeof(Arg4144_0) == 'number')},
  1,
  [],
  "number?"];
shenjs_functions["shen_number?"] = shen_number$question$;






shen_symbol$question$ = [shen_type_func,
  function shen_user_lambda4147(Arg4146) {
  if (Arg4146.length < 1) return [shen_type_func, shen_user_lambda4147, 1, Arg4146];
  var Arg4146_0 = Arg4146[0];
  return shenjs_is_type(Arg4146_0, shen_type_symbol)},
  1,
  [],
  "symbol?"];
shenjs_functions["shen_symbol?"] = shen_symbol$question$;






shen_cons$question$ = [shen_type_func,
  function shen_user_lambda4149(Arg4148) {
  if (Arg4148.length < 1) return [shen_type_func, shen_user_lambda4149, 1, Arg4148];
  var Arg4148_0 = Arg4148[0];
  return shenjs_is_type(Arg4148_0, shen_type_cons)},
  1,
  [],
  "cons?"];
shenjs_functions["shen_cons?"] = shen_cons$question$;






shen_vector$question$ = [shen_type_func,
  function shen_user_lambda4151(Arg4150) {
  if (Arg4150.length < 1) return [shen_type_func, shen_user_lambda4151, 1, Arg4150];
  var Arg4150_0 = Arg4150[0];
  return (function() {
  return shenjs_vector$question$(Arg4150_0);})},
  1,
  [],
  "vector?"];
shenjs_functions["shen_vector?"] = shen_vector$question$;






shen_absvector$question$ = [shen_type_func,
  function shen_user_lambda4153(Arg4152) {
  if (Arg4152.length < 1) return [shen_type_func, shen_user_lambda4153, 1, Arg4152];
  var Arg4152_0 = Arg4152[0];
  return (function() {
  return shenjs_absvector$question$(Arg4152_0);})},
  1,
  [],
  "absvector?"];
shenjs_functions["shen_absvector?"] = shen_absvector$question$;






shen_value = [shen_type_func,
  function shen_user_lambda4155(Arg4154) {
  if (Arg4154.length < 1) return [shen_type_func, shen_user_lambda4155, 1, Arg4154];
  var Arg4154_0 = Arg4154[0];
  return (shenjs_globals["shen_" + Arg4154_0[1]])},
  1,
  [],
  "value"];
shenjs_functions["shen_value"] = shen_value;






shen_intern = [shen_type_func,
  function shen_user_lambda4157(Arg4156) {
  if (Arg4156.length < 1) return [shen_type_func, shen_user_lambda4157, 1, Arg4156];
  var Arg4156_0 = Arg4156[0];
  return (function() {
  return shenjs_intern(Arg4156_0);})},
  1,
  [],
  "intern"];
shenjs_functions["shen_intern"] = shen_intern;






shen_vector = [shen_type_func,
  function shen_user_lambda4159(Arg4158) {
  if (Arg4158.length < 1) return [shen_type_func, shen_user_lambda4159, 1, Arg4158];
  var Arg4158_0 = Arg4158[0];
  return (function() {
  return shenjs_vector(Arg4158_0);})},
  1,
  [],
  "vector"];
shenjs_functions["shen_vector"] = shen_vector;






shen_read_byte = [shen_type_func,
  function shen_user_lambda4161(Arg4160) {
  if (Arg4160.length < 1) return [shen_type_func, shen_user_lambda4161, 1, Arg4160];
  var Arg4160_0 = Arg4160[0];
  return (function() {
  return shenjs_read_byte(Arg4160_0);})},
  1,
  [],
  "read-byte"];
shenjs_functions["shen_read-byte"] = shen_read_byte;






shen_close = [shen_type_func,
  function shen_user_lambda4163(Arg4162) {
  if (Arg4162.length < 1) return [shen_type_func, shen_user_lambda4163, 1, Arg4162];
  var Arg4162_0 = Arg4162[0];
  return (function() {
  return shenjs_close(Arg4162_0);})},
  1,
  [],
  "close"];
shenjs_functions["shen_close"] = shen_close;






shen_absvector = [shen_type_func,
  function shen_user_lambda4165(Arg4164) {
  if (Arg4164.length < 1) return [shen_type_func, shen_user_lambda4165, 1, Arg4164];
  var Arg4164_0 = Arg4164[0];
  return (function() {
  return shenjs_absvector(Arg4164_0);})},
  1,
  [],
  "absvector"];
shenjs_functions["shen_absvector"] = shen_absvector;






shen_str = [shen_type_func,
  function shen_user_lambda4167(Arg4166) {
  if (Arg4166.length < 1) return [shen_type_func, shen_user_lambda4167, 1, Arg4166];
  var Arg4166_0 = Arg4166[0];
  return (function() {
  return shenjs_str(Arg4166_0);})},
  1,
  [],
  "str"];
shenjs_functions["shen_str"] = shen_str;






shen_tlstr = [shen_type_func,
  function shen_user_lambda4169(Arg4168) {
  if (Arg4168.length < 1) return [shen_type_func, shen_user_lambda4169, 1, Arg4168];
  var Arg4168_0 = Arg4168[0];
  return (function() {
  return shenjs_tlstr(Arg4168_0);})},
  1,
  [],
  "tlstr"];
shenjs_functions["shen_tlstr"] = shen_tlstr;






shen_n_$gt$string = [shen_type_func,
  function shen_user_lambda4171(Arg4170) {
  if (Arg4170.length < 1) return [shen_type_func, shen_user_lambda4171, 1, Arg4170];
  var Arg4170_0 = Arg4170[0];
  return (function() {
  return shenjs_n_$gt$string(Arg4170_0);})},
  1,
  [],
  "n->string"];
shenjs_functions["shen_n->string"] = shen_n_$gt$string;






shen_string_$gt$n = [shen_type_func,
  function shen_user_lambda4173(Arg4172) {
  if (Arg4172.length < 1) return [shen_type_func, shen_user_lambda4173, 1, Arg4172];
  var Arg4172_0 = Arg4172[0];
  return (function() {
  return shenjs_string_$gt$n(Arg4172_0);})},
  1,
  [],
  "string->n"];
shenjs_functions["shen_string->n"] = shen_string_$gt$n;






shen_empty$question$ = [shen_type_func,
  function shen_user_lambda4175(Arg4174) {
  if (Arg4174.length < 1) return [shen_type_func, shen_user_lambda4175, 1, Arg4174];
  var Arg4174_0 = Arg4174[0];
  return (function() {
  return shenjs_empty$question$(Arg4174_0);})},
  1,
  [],
  "empty?"];
shenjs_functions["shen_empty?"] = shen_empty$question$;






shen_get_time = [shen_type_func,
  function shen_user_lambda4177(Arg4176) {
  if (Arg4176.length < 1) return [shen_type_func, shen_user_lambda4177, 1, Arg4176];
  var Arg4176_0 = Arg4176[0];
  return (function() {
  return shenjs_get_time(Arg4176_0);})},
  1,
  [],
  "get-time"];
shenjs_functions["shen_get-time"] = shen_get_time;






shen_error = [shen_type_func,
  function shen_user_lambda4179(Arg4178) {
  if (Arg4178.length < 1) return [shen_type_func, shen_user_lambda4179, 1, Arg4178];
  var Arg4178_0 = Arg4178[0];
  return (function() {
  return shenjs_error(Arg4178_0);})},
  1,
  [],
  "error"];
shenjs_functions["shen_error"] = shen_error;






shen_simple_error = [shen_type_func,
  function shen_user_lambda4181(Arg4180) {
  if (Arg4180.length < 1) return [shen_type_func, shen_user_lambda4181, 1, Arg4180];
  var Arg4180_0 = Arg4180[0];
  return (function() {
  return shenjs_simple_error(Arg4180_0);})},
  1,
  [],
  "simple-error"];
shenjs_functions["shen_simple-error"] = shen_simple_error;






shen_eval_kl = [shen_type_func,
  function shen_user_lambda4183(Arg4182) {
  if (Arg4182.length < 1) return [shen_type_func, shen_user_lambda4183, 1, Arg4182];
  var Arg4182_0 = Arg4182[0];
  return (function() {
  return shenjs_eval_kl(Arg4182_0);})},
  1,
  [],
  "eval-kl"];
shenjs_functions["shen_eval-kl"] = shen_eval_kl;






shen_error_to_string = [shen_type_func,
  function shen_user_lambda4185(Arg4184) {
  if (Arg4184.length < 1) return [shen_type_func, shen_user_lambda4185, 1, Arg4184];
  var Arg4184_0 = Arg4184[0];
  return (function() {
  return shenjs_error_to_string(Arg4184_0);})},
  1,
  [],
  "error-to-string"];
shenjs_functions["shen_error-to-string"] = shen_error_to_string;






shen_js_call_js = [shen_type_func,
  function shen_user_lambda4187(Arg4186) {
  if (Arg4186.length < 1) return [shen_type_func, shen_user_lambda4187, 1, Arg4186];
  var Arg4186_0 = Arg4186[0];
  return (function() {
  return shenjs_js_call_js(Arg4186_0);})},
  1,
  [],
  "js-call-js"];
shenjs_functions["shen_js-call-js"] = shen_js_call_js;






shen_$plus$ = [shen_type_func,
  function shen_user_lambda4189(Arg4188) {
  if (Arg4188.length < 2) return [shen_type_func, shen_user_lambda4189, 2, Arg4188];
  var Arg4188_0 = Arg4188[0], Arg4188_1 = Arg4188[1];
  return (Arg4188_0 + Arg4188_1)},
  2,
  [],
  "+"];
shenjs_functions["shen_+"] = shen_$plus$;






shen__ = [shen_type_func,
  function shen_user_lambda4191(Arg4190) {
  if (Arg4190.length < 2) return [shen_type_func, shen_user_lambda4191, 2, Arg4190];
  var Arg4190_0 = Arg4190[0], Arg4190_1 = Arg4190[1];
  return (Arg4190_0 - Arg4190_1)},
  2,
  [],
  "-"];
shenjs_functions["shen_-"] = shen__;






shen_$asterisk$ = [shen_type_func,
  function shen_user_lambda4193(Arg4192) {
  if (Arg4192.length < 2) return [shen_type_func, shen_user_lambda4193, 2, Arg4192];
  var Arg4192_0 = Arg4192[0], Arg4192_1 = Arg4192[1];
  return (Arg4192_0 * Arg4192_1)},
  2,
  [],
  "*"];
shenjs_functions["shen_*"] = shen_$asterisk$;






shen_$slash$ = [shen_type_func,
  function shen_user_lambda4195(Arg4194) {
  if (Arg4194.length < 2) return [shen_type_func, shen_user_lambda4195, 2, Arg4194];
  var Arg4194_0 = Arg4194[0], Arg4194_1 = Arg4194[1];
  return (Arg4194_0 / Arg4194_1)},
  2,
  [],
  "/"];
shenjs_functions["shen_/"] = shen_$slash$;






shen_and = [shen_type_func,
  function shen_user_lambda4197(Arg4196) {
  if (Arg4196.length < 2) return [shen_type_func, shen_user_lambda4197, 2, Arg4196];
  var Arg4196_0 = Arg4196[0], Arg4196_1 = Arg4196[1];
  return (Arg4196_0 && Arg4196_1)},
  2,
  [],
  "and"];
shenjs_functions["shen_and"] = shen_and;






shen_or = [shen_type_func,
  function shen_user_lambda4199(Arg4198) {
  if (Arg4198.length < 2) return [shen_type_func, shen_user_lambda4199, 2, Arg4198];
  var Arg4198_0 = Arg4198[0], Arg4198_1 = Arg4198[1];
  return (Arg4198_0 || Arg4198_1)},
  2,
  [],
  "or"];
shenjs_functions["shen_or"] = shen_or;






shen_$eq$ = [shen_type_func,
  function shen_user_lambda4201(Arg4200) {
  if (Arg4200.length < 2) return [shen_type_func, shen_user_lambda4201, 2, Arg4200];
  var Arg4200_0 = Arg4200[0], Arg4200_1 = Arg4200[1];
  return shenjs_$eq$(Arg4200_0, Arg4200_1)},
  2,
  [],
  "="];
shenjs_functions["shen_="] = shen_$eq$;






shen_$gt$ = [shen_type_func,
  function shen_user_lambda4203(Arg4202) {
  if (Arg4202.length < 2) return [shen_type_func, shen_user_lambda4203, 2, Arg4202];
  var Arg4202_0 = Arg4202[0], Arg4202_1 = Arg4202[1];
  return (Arg4202_0 > Arg4202_1)},
  2,
  [],
  ">"];
shenjs_functions["shen_>"] = shen_$gt$;






shen_$gt$$eq$ = [shen_type_func,
  function shen_user_lambda4205(Arg4204) {
  if (Arg4204.length < 2) return [shen_type_func, shen_user_lambda4205, 2, Arg4204];
  var Arg4204_0 = Arg4204[0], Arg4204_1 = Arg4204[1];
  return (Arg4204_0 >= Arg4204_1)},
  2,
  [],
  ">="];
shenjs_functions["shen_>="] = shen_$gt$$eq$;






shen_$lt$ = [shen_type_func,
  function shen_user_lambda4207(Arg4206) {
  if (Arg4206.length < 2) return [shen_type_func, shen_user_lambda4207, 2, Arg4206];
  var Arg4206_0 = Arg4206[0], Arg4206_1 = Arg4206[1];
  return (Arg4206_0 < Arg4206_1)},
  2,
  [],
  "<"];
shenjs_functions["shen_<"] = shen_$lt$;






shen_$lt$$eq$ = [shen_type_func,
  function shen_user_lambda4209(Arg4208) {
  if (Arg4208.length < 2) return [shen_type_func, shen_user_lambda4209, 2, Arg4208];
  var Arg4208_0 = Arg4208[0], Arg4208_1 = Arg4208[1];
  return (Arg4208_0 <= Arg4208_1)},
  2,
  [],
  "<="];
shenjs_functions["shen_<="] = shen_$lt$$eq$;






shen_cons = [shen_type_func,
  function shen_user_lambda4211(Arg4210) {
  if (Arg4210.length < 2) return [shen_type_func, shen_user_lambda4211, 2, Arg4210];
  var Arg4210_0 = Arg4210[0], Arg4210_1 = Arg4210[1];
  return [shen_type_cons, Arg4210_0, Arg4210_1]},
  2,
  [],
  "cons"];
shenjs_functions["shen_cons"] = shen_cons;






shen_set = [shen_type_func,
  function shen_user_lambda4213(Arg4212) {
  if (Arg4212.length < 2) return [shen_type_func, shen_user_lambda4213, 2, Arg4212];
  var Arg4212_0 = Arg4212[0], Arg4212_1 = Arg4212[1];
  return (shenjs_globals["shen_" + Arg4212_0[1]] = Arg4212_1)},
  2,
  [],
  "set"];
shenjs_functions["shen_set"] = shen_set;






shen_$lt$_address = [shen_type_func,
  function shen_user_lambda4215(Arg4214) {
  if (Arg4214.length < 2) return [shen_type_func, shen_user_lambda4215, 2, Arg4214];
  var Arg4214_0 = Arg4214[0], Arg4214_1 = Arg4214[1];
  return shenjs_absvector_ref(Arg4214_0, Arg4214_1)},
  2,
  [],
  "<-address"];
shenjs_functions["shen_<-address"] = shen_$lt$_address;






shen_cn = [shen_type_func,
  function shen_user_lambda4217(Arg4216) {
  if (Arg4216.length < 2) return [shen_type_func, shen_user_lambda4217, 2, Arg4216];
  var Arg4216_0 = Arg4216[0], Arg4216_1 = Arg4216[1];
  return (Arg4216_0 + Arg4216_1)},
  2,
  [],
  "cn"];
shenjs_functions["shen_cn"] = shen_cn;






shen_pos = [shen_type_func,
  function shen_user_lambda4219(Arg4218) {
  if (Arg4218.length < 2) return [shen_type_func, shen_user_lambda4219, 2, Arg4218];
  var Arg4218_0 = Arg4218[0], Arg4218_1 = Arg4218[1];
  return Arg4218_0[Arg4218_1]},
  2,
  [],
  "pos"];
shenjs_functions["shen_pos"] = shen_pos;






shen_$at$p = [shen_type_func,
  function shen_user_lambda4221(Arg4220) {
  if (Arg4220.length < 2) return [shen_type_func, shen_user_lambda4221, 2, Arg4220];
  var Arg4220_0 = Arg4220[0], Arg4220_1 = Arg4220[1];
  return [shen_tuple, Arg4220_0, Arg4220_1]},
  2,
  [],
  "@p"];
shenjs_functions["shen_@p"] = shen_$at$p;






shen_pr = [shen_type_func,
  function shen_user_lambda4223(Arg4222) {
  if (Arg4222.length < 2) return [shen_type_func, shen_user_lambda4223, 2, Arg4222];
  var Arg4222_0 = Arg4222[0], Arg4222_1 = Arg4222[1];
  return (function() {
  return shenjs_pr(Arg4222_0, Arg4222_1);})},
  2,
  [],
  "pr"];
shenjs_functions["shen_pr"] = shen_pr;






shen_address_$gt$ = [shen_type_func,
  function shen_user_lambda4225(Arg4224) {
  if (Arg4224.length < 3) return [shen_type_func, shen_user_lambda4225, 3, Arg4224];
  var Arg4224_0 = Arg4224[0], Arg4224_1 = Arg4224[1], Arg4224_2 = Arg4224[2];
  return shenjs_absvector_set(Arg4224_0, Arg4224_1, Arg4224_2)},
  3,
  [],
  "address->"];
shenjs_functions["shen_address->"] = shen_address_$gt$;






shen_open = [shen_type_func,
  function shen_user_lambda4227(Arg4226) {
  if (Arg4226.length < 3) return [shen_type_func, shen_user_lambda4227, 3, Arg4226];
  var Arg4226_0 = Arg4226[0], Arg4226_1 = Arg4226[1], Arg4226_2 = Arg4226[2];
  return (function() {
  return shenjs_open(Arg4226_0, Arg4226_1, Arg4226_2);})},
  3,
  [],
  "open"];
shenjs_functions["shen_open"] = shen_open;






shenjs_call(shen_process_datatype, [[shen_type_symbol, "reg-kl-context"], shenjs_call(shen_compile, [[shen_type_symbol, "shen-<datatype-rules>"], [shen_type_cons, [shen_type_symbol, "Nregs"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "Toplevel"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-s-expr"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "Toplevel"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "Nregs"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 0, []]], []]]], []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 2, []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "B"], []]]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 1, []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-s-expr"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-s-expr"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "B"], []]]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-context"], [shen_type_cons, [shen_type_symbol, ";"], []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]], [shen_type_symbol, "shen-datatype-error"]])]);





reg_kl_mk_context = [shen_type_func,
  function shen_user_lambda3333(Arg3332) {
  if (Arg3332.length < 2) return [shen_type_func, shen_user_lambda3333, 2, Arg3332];
  var Arg3332_0 = Arg3332[0], Arg3332_1 = Arg3332[1];
  return (function() {
  return shenjs_call_tail(shen_$at$v, [Arg3332_0, shenjs_call(shen_$at$v, [Arg3332_1, shenjs_vector(0)])]);})},
  2,
  [],
  "reg-kl-mk-context"];
shenjs_functions["shen_reg-kl-mk-context"] = reg_kl_mk_context;






reg_kl_context_nregs_$gt$ = [shen_type_func,
  function shen_user_lambda3335(Arg3334) {
  if (Arg3334.length < 2) return [shen_type_func, shen_user_lambda3335, 2, Arg3334];
  var Arg3334_0 = Arg3334[0], Arg3334_1 = Arg3334[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$, [Arg3334_0, 2, Arg3334_1]);})},
  2,
  [],
  "reg-kl-context-nregs->"];
shenjs_functions["shen_reg-kl-context-nregs->"] = reg_kl_context_nregs_$gt$;






reg_kl_context_toplevel_$gt$ = [shen_type_func,
  function shen_user_lambda3337(Arg3336) {
  if (Arg3336.length < 2) return [shen_type_func, shen_user_lambda3337, 2, Arg3336];
  var Arg3336_0 = Arg3336[0], Arg3336_1 = Arg3336[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$, [Arg3336_0, 1, Arg3336_1]);})},
  2,
  [],
  "reg-kl-context-toplevel->"];
shenjs_functions["shen_reg-kl-context-toplevel->"] = reg_kl_context_toplevel_$gt$;






reg_kl_context_nregs = [shen_type_func,
  function shen_user_lambda3339(Arg3338) {
  if (Arg3338.length < 1) return [shen_type_func, shen_user_lambda3339, 1, Arg3338];
  var Arg3338_0 = Arg3338[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$_vector, [Arg3338_0, 2]);})},
  1,
  [],
  "reg-kl-context-nregs"];
shenjs_functions["shen_reg-kl-context-nregs"] = reg_kl_context_nregs;






reg_kl_context_toplevel = [shen_type_func,
  function shen_user_lambda3341(Arg3340) {
  if (Arg3340.length < 1) return [shen_type_func, shen_user_lambda3341, 1, Arg3340];
  var Arg3340_0 = Arg3340[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$_vector, [Arg3340_0, 1]);})},
  1,
  [],
  "reg-kl-context-toplevel"];
shenjs_functions["shen_reg-kl-context-toplevel"] = reg_kl_context_toplevel;






reg_kl_var_idx_aux = [shen_type_func,
  function shen_user_lambda3343(Arg3342) {
  if (Arg3342.length < 3) return [shen_type_func, shen_user_lambda3343, 3, Arg3342];
  var Arg3342_0 = Arg3342[0], Arg3342_1 = Arg3342[1], Arg3342_2 = Arg3342[2];
  return ((shenjs_empty$question$(Arg3342_2))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["Unknown var: ~A~%", [shen_tuple, Arg3342_0, []]]);})
  : (((shenjs_is_type(Arg3342_2, shen_type_cons) && (shenjs_is_type(Arg3342_2[1], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg3342_2[1][1], Arg3342_0)))))
  ? Arg3342_2[1][2]
  : ((shenjs_is_type(Arg3342_2, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_var_idx_aux, [Arg3342_0, (Arg3342_1 + 1), Arg3342_2[2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-var-idx-aux"]]);}))))},
  3,
  [],
  "reg-kl-var-idx-aux"];
shenjs_functions["shen_reg-kl-var-idx-aux"] = reg_kl_var_idx_aux;






reg_kl_var_idx = [shen_type_func,
  function shen_user_lambda3345(Arg3344) {
  if (Arg3344.length < 2) return [shen_type_func, shen_user_lambda3345, 2, Arg3344];
  var Arg3344_0 = Arg3344[0], Arg3344_1 = Arg3344[1];
  return (function() {
  return shenjs_call_tail(reg_kl_var_idx_aux, [Arg3344_0, 0, Arg3344_1]);})},
  2,
  [],
  "reg-kl-var-idx"];
shenjs_functions["shen_reg-kl-var-idx"] = reg_kl_var_idx;






reg_kl_new_var_idx_aux = [shen_type_func,
  function shen_user_lambda3347(Arg3346) {
  if (Arg3346.length < 3) return [shen_type_func, shen_user_lambda3347, 3, Arg3346];
  var Arg3346_0 = Arg3346[0], Arg3346_1 = Arg3346[1], Arg3346_2 = Arg3346[2];
  return ((shenjs_empty$question$(Arg3346_2))
  ? Arg3346_1
  : (((shenjs_is_type(Arg3346_2, shen_type_cons) && (shenjs_is_type(Arg3346_2[1], shen_type_cons) && (Arg3346_2[1][2] < 0))))
  ? (function() {
  return shenjs_call_tail(reg_kl_new_var_idx_aux, [Arg3346_0, Arg3346_1, Arg3346_2[2]]);})
  : (((shenjs_is_type(Arg3346_2, shen_type_cons) && (shenjs_is_type(Arg3346_2[1], shen_type_cons) && (Arg3346_2[1][2] >= Arg3346_1))))
  ? (function() {
  return shenjs_call_tail(reg_kl_new_var_idx_aux, [Arg3346_0, (Arg3346_2[1][2] + 1), Arg3346_2[2]]);})
  : ((shenjs_is_type(Arg3346_2, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_new_var_idx_aux, [Arg3346_0, Arg3346_1, Arg3346_2[2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-new-var-idx-aux"]]);})))))},
  3,
  [],
  "reg-kl-new-var-idx-aux"];
shenjs_functions["shen_reg-kl-new-var-idx-aux"] = reg_kl_new_var_idx_aux;






reg_kl_new_var_idx = [shen_type_func,
  function shen_user_lambda3349(Arg3348) {
  if (Arg3348.length < 2) return [shen_type_func, shen_user_lambda3349, 2, Arg3348];
  var Arg3348_0 = Arg3348[0], Arg3348_1 = Arg3348[1];
  return (function() {
  return shenjs_call_tail(reg_kl_new_var_idx_aux, [Arg3348_0, 0, Arg3348_1]);})},
  2,
  [],
  "reg-kl-new-var-idx"];
shenjs_functions["shen_reg-kl-new-var-idx"] = reg_kl_new_var_idx;






reg_kl_var_defined$question$ = [shen_type_func,
  function shen_user_lambda3351(Arg3350) {
  if (Arg3350.length < 2) return [shen_type_func, shen_user_lambda3351, 2, Arg3350];
  var Arg3350_0 = Arg3350[0], Arg3350_1 = Arg3350[1];
  return ((shenjs_empty$question$(Arg3350_1))
  ? false
  : (((shenjs_is_type(Arg3350_1, shen_type_cons) && (shenjs_is_type(Arg3350_1[1], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg3350_1[1][1], Arg3350_0)))))
  ? true
  : (((shenjs_is_type(Arg3350_1, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg3350_1[1], Arg3350_0))))
  ? true
  : ((shenjs_is_type(Arg3350_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_var_defined$question$, [Arg3350_0, Arg3350_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-var-defined?"]]);})))))},
  2,
  [],
  "reg-kl-var-defined?"];
shenjs_functions["shen_reg-kl-var-defined?"] = reg_kl_var_defined$question$;






reg_kl_used_vars_aux = [shen_type_func,
  function shen_user_lambda3353(Arg3352) {
  if (Arg3352.length < 4) return [shen_type_func, shen_user_lambda3353, 4, Arg3352];
  var Arg3352_0 = Arg3352[0], Arg3352_1 = Arg3352[1], Arg3352_2 = Arg3352[2], Arg3352_3 = Arg3352[3];
  var R0;
  return (((shenjs_is_type(Arg3352_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg3352_0[1])) && (shenjs_is_type(Arg3352_0[2], shen_type_cons) && (shenjs_is_type(Arg3352_0[2][2], shen_type_cons) && (shenjs_is_type(Arg3352_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg3352_0[2][2][2][2])))))))
  ? ((R0 = shenjs_call(reg_kl_used_vars_aux, [Arg3352_0[2][2][2][1], Arg3352_1, [shen_type_cons, Arg3352_0[2][1], Arg3352_2], Arg3352_3])),
  (function() {
  return shenjs_call_tail(reg_kl_used_vars_aux, [Arg3352_0[2][2][1], Arg3352_1, Arg3352_2, R0]);}))
  : (((shenjs_is_type(Arg3352_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "lambda"], Arg3352_0[1])) && (shenjs_is_type(Arg3352_0[2], shen_type_cons) && (shenjs_is_type(Arg3352_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg3352_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(reg_kl_used_vars_aux, [Arg3352_0[2][2][1], Arg3352_1, [shen_type_cons, Arg3352_0[2][1], Arg3352_2], Arg3352_3]);})
  : ((shenjs_is_type(Arg3352_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_used_vars_aux, [Arg3352_0[1], Arg3352_1, Arg3352_2, shenjs_call(reg_kl_used_vars_aux, [Arg3352_0[2], Arg3352_1, Arg3352_2, Arg3352_3])]);})
  : (((shenjs_is_type(Arg3352_0, shen_type_symbol) && ((!shenjs_call(reg_kl_var_defined$question$, [Arg3352_0, Arg3352_2])) && shenjs_call(reg_kl_var_defined$question$, [Arg3352_0, Arg3352_1]))))
  ? (function() {
  return shenjs_call_tail(shen_adjoin, [Arg3352_0, Arg3352_3]);})
  : Arg3352_3))))},
  4,
  [],
  "reg-kl-used-vars-aux"];
shenjs_functions["shen_reg-kl-used-vars-aux"] = reg_kl_used_vars_aux;






reg_kl_used_vars = [shen_type_func,
  function shen_user_lambda3355(Arg3354) {
  if (Arg3354.length < 2) return [shen_type_func, shen_user_lambda3355, 2, Arg3354];
  var Arg3354_0 = Arg3354[0], Arg3354_1 = Arg3354[1];
  return (function() {
  return shenjs_call_tail(reg_kl_used_vars_aux, [Arg3354_0, Arg3354_1, [], []]);})},
  2,
  [],
  "reg-kl-used-vars"];
shenjs_functions["shen_reg-kl-used-vars"] = reg_kl_used_vars;






reg_kl_remove_do = [shen_type_func,
  function shen_user_lambda3357(Arg3356) {
  if (Arg3356.length < 1) return [shen_type_func, shen_user_lambda3357, 1, Arg3356];
  var Arg3356_0 = Arg3356[0];
  return (((shenjs_is_type(Arg3356_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "do"], Arg3356_0[1]))))
  ? Arg3356_0[2]
  : [shen_type_cons, Arg3356_0, []])},
  1,
  [],
  "reg-kl-remove-do"];
shenjs_functions["shen_reg-kl-remove-do"] = reg_kl_remove_do;






reg_kl_remove_duplicates_aux = [shen_type_func,
  function shen_user_lambda3359(Arg3358) {
  if (Arg3358.length < 2) return [shen_type_func, shen_user_lambda3359, 2, Arg3358];
  var Arg3358_0 = Arg3358[0], Arg3358_1 = Arg3358[1];
  return ((shenjs_empty$question$(Arg3358_0))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg3358_1]);})
  : ((shenjs_is_type(Arg3358_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_remove_duplicates_aux, [Arg3358_0[2], shenjs_call(shen_adjoin, [Arg3358_0[1], Arg3358_1])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-remove-duplicates-aux"]]);})))},
  2,
  [],
  "reg-kl-remove-duplicates-aux"];
shenjs_functions["shen_reg-kl-remove-duplicates-aux"] = reg_kl_remove_duplicates_aux;






reg_kl_remove_duplicates = [shen_type_func,
  function shen_user_lambda3361(Arg3360) {
  if (Arg3360.length < 1) return [shen_type_func, shen_user_lambda3361, 1, Arg3360];
  var Arg3360_0 = Arg3360[0];
  return (function() {
  return shenjs_call_tail(reg_kl_remove_duplicates_aux, [Arg3360_0, []]);})},
  1,
  [],
  "reg-kl-remove-duplicates"];
shenjs_functions["shen_reg-kl-remove-duplicates"] = reg_kl_remove_duplicates;






reg_kl_used_vars_cascade_aux = [shen_type_func,
  function shen_user_lambda3363(Arg3362) {
  if (Arg3362.length < 4) return [shen_type_func, shen_user_lambda3363, 4, Arg3362];
  var Arg3362_0 = Arg3362[0], Arg3362_1 = Arg3362[1], Arg3362_2 = Arg3362[2], Arg3362_3 = Arg3362[3];
  var R0;
  return ((shenjs_empty$question$(Arg3362_0))
  ? Arg3362_3
  : ((shenjs_is_type(Arg3362_0, shen_type_cons))
  ? ((R0 = shenjs_call(reg_kl_used_vars_aux, [Arg3362_0[1], Arg3362_1, [], Arg3362_2])),
  (function() {
  return shenjs_call_tail(reg_kl_used_vars_cascade_aux, [Arg3362_0[2], Arg3362_1, R0, [shen_type_cons, R0, Arg3362_3]]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-used-vars-cascade-aux"]]);})))},
  4,
  [],
  "reg-kl-used-vars-cascade-aux"];
shenjs_functions["shen_reg-kl-used-vars-cascade-aux"] = reg_kl_used_vars_cascade_aux;






reg_kl_used_vars_cascade = [shen_type_func,
  function shen_user_lambda3365(Arg3364) {
  if (Arg3364.length < 3) return [shen_type_func, shen_user_lambda3365, 3, Arg3364];
  var Arg3364_0 = Arg3364[0], Arg3364_1 = Arg3364[1], Arg3364_2 = Arg3364[2];
  return (function() {
  return shenjs_call_tail(reg_kl_used_vars_cascade_aux, [shenjs_call(shen_reverse, [Arg3364_0]), Arg3364_1, Arg3364_2, []]);})},
  3,
  [],
  "reg-kl-used-vars-cascade"];
shenjs_functions["shen_reg-kl-used-vars-cascade"] = reg_kl_used_vars_cascade;






reg_kl_mk_shen_set_reg = [shen_type_func,
  function shen_user_lambda3367(Arg3366) {
  if (Arg3366.length < 2) return [shen_type_func, shen_user_lambda3367, 2, Arg3366];
  var Arg3366_0 = Arg3366[0], Arg3366_1 = Arg3366[1];
  return (((Arg3366_0 < 0))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["Cannot set function argument~%", []]);})
  : [shen_type_cons, [shen_type_symbol, "shen-set-reg!"], [shen_type_cons, Arg3366_0, [shen_type_cons, Arg3366_1, []]]])},
  2,
  [],
  "reg-kl-mk-shen-set-reg"];
shenjs_functions["shen_reg-kl-mk-shen-set-reg"] = reg_kl_mk_shen_set_reg;






reg_kl_mk_shen_get_reg = [shen_type_func,
  function shen_user_lambda3369(Arg3368) {
  if (Arg3368.length < 1) return [shen_type_func, shen_user_lambda3369, 1, Arg3368];
  var Arg3368_0 = Arg3368[0];
  return (((Arg3368_0 < 0))
  ? [shen_type_cons, [shen_type_symbol, "shen-get-arg"], [shen_type_cons, ((0 - Arg3368_0) - 1), []]]
  : [shen_type_cons, [shen_type_symbol, "shen-get-reg"], [shen_type_cons, Arg3368_0, []]])},
  1,
  [],
  "reg-kl-mk-shen-get-reg"];
shenjs_functions["shen_reg-kl-mk-shen-get-reg"] = reg_kl_mk_shen_get_reg;






reg_kl_reuse_idx = [shen_type_func,
  function shen_user_lambda3371(Arg3370) {
  if (Arg3370.length < 2) return [shen_type_func, shen_user_lambda3371, 2, Arg3370];
  var Arg3370_0 = Arg3370[0], Arg3370_1 = Arg3370[1];
  return ((shenjs_empty$question$(Arg3370_1))
  ? shen_fail_obj
  : (((shenjs_is_type(Arg3370_1, shen_type_cons) && (shenjs_is_type(Arg3370_1[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(Arg3370_1[1][1], Arg3370_0)) && (Arg3370_1[1][2] >= 0)))))
  ? Arg3370_1[1][2]
  : ((shenjs_is_type(Arg3370_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_reuse_idx, [Arg3370_0, Arg3370_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-reuse-idx"]]);}))))},
  2,
  [],
  "reg-kl-reuse-idx"];
shenjs_functions["shen_reg-kl-reuse-idx"] = reg_kl_reuse_idx;






reg_kl_new_var_idx_or_reuse = [shen_type_func,
  function shen_user_lambda3373(Arg3372) {
  if (Arg3372.length < 3) return [shen_type_func, shen_user_lambda3373, 3, Arg3372];
  var Arg3372_0 = Arg3372[0], Arg3372_1 = Arg3372[1], Arg3372_2 = Arg3372[2];
  var R0, R1;
  return ((shenjs_empty$question$(Arg3372_2))
  ? (function() {
  return shenjs_call_tail(reg_kl_new_var_idx, [Arg3372_0, Arg3372_1]);})
  : ((R0 = (new Shenjs_freeze([Arg3372_0, Arg3372_2, Arg3372_1], function(Arg3374) {
  var Arg3374_0 = Arg3374[0], Arg3374_1 = Arg3374[1], Arg3374_2 = Arg3374[2];
  return (function() {
  return ((shenjs_is_type(Arg3374_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_new_var_idx_or_reuse, [Arg3374_0, Arg3374_2, Arg3374_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-new-var-idx-or-reuse"]]);}));})}))),
  ((shenjs_is_type(Arg3372_2, shen_type_cons))
  ? ((R1 = shenjs_call(reg_kl_reuse_idx, [Arg3372_2[1], Arg3372_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, shen_fail_obj)))
  ? shenjs_thaw(R0)
  : R1))
  : shenjs_thaw(R0))))},
  3,
  [],
  "reg-kl-new-var-idx-or-reuse"];
shenjs_functions["shen_reg-kl-new-var-idx-or-reuse"] = reg_kl_new_var_idx_or_reuse;






reg_kl_add_var_aux = [shen_type_func,
  function shen_user_lambda3377(Arg3376) {
  if (Arg3376.length < 4) return [shen_type_func, shen_user_lambda3377, 4, Arg3376];
  var Arg3376_0 = Arg3376[0], Arg3376_1 = Arg3376[1], Arg3376_2 = Arg3376[2], Arg3376_3 = Arg3376[3];
  return ((shenjs_empty$question$(Arg3376_2))
  ? [shen_type_cons, [shen_type_cons, Arg3376_0, Arg3376_1], shenjs_call(shen_reverse, [Arg3376_3])]
  : (((shenjs_is_type(Arg3376_2, shen_type_cons) && (shenjs_is_type(Arg3376_2[1], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg3376_2[1][2], Arg3376_1)))))
  ? (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(shen_reverse, [[shen_type_cons, [shen_type_cons, Arg3376_0, Arg3376_2[1][2]], Arg3376_3]]), Arg3376_2[2]]);})
  : ((shenjs_is_type(Arg3376_2, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_add_var_aux, [Arg3376_0, Arg3376_1, Arg3376_2[2], [shen_type_cons, Arg3376_2[1], Arg3376_3]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-add-var-aux"]]);}))))},
  4,
  [],
  "reg-kl-add-var-aux"];
shenjs_functions["shen_reg-kl-add-var-aux"] = reg_kl_add_var_aux;






reg_kl_add_var = [shen_type_func,
  function shen_user_lambda3379(Arg3378) {
  if (Arg3378.length < 3) return [shen_type_func, shen_user_lambda3379, 3, Arg3378];
  var Arg3378_0 = Arg3378[0], Arg3378_1 = Arg3378[1], Arg3378_2 = Arg3378[2];
  return (function() {
  return shenjs_call_tail(reg_kl_add_var_aux, [Arg3378_0, Arg3378_1, Arg3378_2, []]);})},
  3,
  [],
  "reg-kl-add-var"];
shenjs_functions["shen_reg-kl-add-var"] = reg_kl_add_var;






reg_kl_max = [shen_type_func,
  function shen_user_lambda3381(Arg3380) {
  if (Arg3380.length < 2) return [shen_type_func, shen_user_lambda3381, 2, Arg3380];
  var Arg3380_0 = Arg3380[0], Arg3380_1 = Arg3380[1];
  return (((Arg3380_0 > Arg3380_1))
  ? Arg3380_0
  : Arg3380_1)},
  2,
  [],
  "reg-kl-max"];
shenjs_functions["shen_reg-kl-max"] = reg_kl_max;






reg_kl_walk_let_expr = [shen_type_func,
  function shen_user_lambda3383(Arg3382) {
  if (Arg3382.length < 8) return [shen_type_func, shen_user_lambda3383, 8, Arg3382];
  var Arg3382_0 = Arg3382[0], Arg3382_1 = Arg3382[1], Arg3382_2 = Arg3382[2], Arg3382_3 = Arg3382[3], Arg3382_4 = Arg3382[4], Arg3382_5 = Arg3382[5], Arg3382_6 = Arg3382[6], Arg3382_7 = Arg3382[7];
  var R0, R1, R2;
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg3382_7)))
  ? ((R0 = shenjs_call(shen_remove, [Arg3382_0, Arg3382_3])),
  (R0 = shenjs_call(shen_append, [R0, Arg3382_5])),
  (R1 = shenjs_call(shen_difference, [shenjs_call(shen_map, [[shen_type_symbol, "head"], Arg3382_2]), R0])),
  (R1 = shenjs_call(reg_kl_new_var_idx_or_reuse, [Arg3382_0, Arg3382_2, R1])),
  shenjs_call(reg_kl_context_nregs_$gt$, [Arg3382_6, shenjs_call(reg_kl_max, [(R1 + 1), shenjs_call(reg_kl_context_nregs, [Arg3382_6])])]),
  (R2 = shenjs_call(reg_kl_add_var, [Arg3382_0, R1, Arg3382_2])),
  (R0 = shenjs_call(reg_kl_walk_expr, [Arg3382_1, Arg3382_2, Arg3382_4, R0, Arg3382_6])),
  [shen_tuple, shenjs_call(reg_kl_mk_shen_set_reg, [R1, R0]), R2])
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg3382_7)))
  ? [shen_tuple, shenjs_call(reg_kl_walk_expr, [Arg3382_1, Arg3382_2, Arg3382_4, Arg3382_5, Arg3382_6]), Arg3382_2]
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-walk-let-expr"]]);})))},
  8,
  [],
  "reg-kl-walk-let-expr"];
shenjs_functions["shen_reg-kl-walk-let-expr"] = reg_kl_walk_let_expr;






reg_kl_walk_let = [shen_type_func,
  function shen_user_lambda3385(Arg3384) {
  if (Arg3384.length < 7) return [shen_type_func, shen_user_lambda3385, 7, Arg3384];
  var Arg3384_0 = Arg3384[0], Arg3384_1 = Arg3384[1], Arg3384_2 = Arg3384[2], Arg3384_3 = Arg3384[3], Arg3384_4 = Arg3384[4], Arg3384_5 = Arg3384[5], Arg3384_6 = Arg3384[6];
  var R0, R1, R2;
  return ((R0 = shenjs_call(reg_kl_used_vars, [Arg3384_2, [shen_type_cons, Arg3384_0, Arg3384_3]])),
  (R1 = shenjs_call(shen_element$question$, [Arg3384_0, R0])),
  ((R1)
  ? [shen_type_cons, Arg3384_0, Arg3384_4]
  : Arg3384_4),
  (R1 = shenjs_call(reg_kl_walk_let_expr, [Arg3384_0, Arg3384_1, Arg3384_3, R0, Arg3384_4, Arg3384_5, Arg3384_6, R1])),
  (R2 = shenjs_call(shen_fst, [R1])),
  (R1 = shenjs_call(shen_snd, [R1])),
  (R1 = shenjs_call(reg_kl_remove_do, [shenjs_call(reg_kl_walk_expr, [Arg3384_2, R1, shenjs_call(shen_append, [R0, Arg3384_5]), Arg3384_5, Arg3384_6])])),
  (R2 = ((shenjs_is_type(R2, shen_type_cons))
  ? [shen_type_cons, R2, R1]
  : R1)),
  [shen_type_cons, [shen_type_symbol, "do"], R2])},
  7,
  [],
  "reg-kl-walk-let"];
shenjs_functions["shen_reg-kl-walk-let"] = reg_kl_walk_let;






reg_kl_walk_do_aux = [shen_type_func,
  function shen_user_lambda3387(Arg3386) {
  if (Arg3386.length < 6) return [shen_type_func, shen_user_lambda3387, 6, Arg3386];
  var Arg3386_0 = Arg3386[0], Arg3386_1 = Arg3386[1], Arg3386_2 = Arg3386[2], Arg3386_3 = Arg3386[3], Arg3386_4 = Arg3386[4], Arg3386_5 = Arg3386[5];
  var R0, R1;
  return (((shenjs_empty$question$(Arg3386_0) && shenjs_empty$question$(Arg3386_2)))
  ? Arg3386_5
  : (((shenjs_is_type(Arg3386_0, shen_type_cons) && (shenjs_empty$question$(Arg3386_0[2]) && (shenjs_is_type(Arg3386_2, shen_type_cons) && shenjs_empty$question$(Arg3386_2[2])))))
  ? ((R0 = shenjs_call(reg_kl_walk_expr, [Arg3386_0[1], Arg3386_1, Arg3386_2[1], Arg3386_3, Arg3386_4])),
  (R0 = shenjs_call(shen_append, [Arg3386_5, shenjs_call(reg_kl_remove_do, [R0])])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_do_aux, [[], Arg3386_1, [], Arg3386_3, Arg3386_4, R0]);}))
  : (((shenjs_is_type(Arg3386_0, shen_type_cons) && (shenjs_is_type(Arg3386_2, shen_type_cons) && shenjs_is_type(Arg3386_2[2], shen_type_cons))))
  ? ((R0 = shenjs_call(reg_kl_walk_expr, [Arg3386_0[1], Arg3386_1, Arg3386_2[1], Arg3386_2[2][1], Arg3386_4])),
  (R0 = shenjs_call(shen_append, [Arg3386_5, shenjs_call(reg_kl_remove_do, [R0])])),
  (R1 = Arg3386_2[2]),
  (function() {
  return shenjs_call_tail(reg_kl_walk_do_aux, [Arg3386_0[2], Arg3386_1, R1, Arg3386_3, Arg3386_4, R0]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-walk-do-aux"]]);}))))},
  6,
  [],
  "reg-kl-walk-do-aux"];
shenjs_functions["shen_reg-kl-walk-do-aux"] = reg_kl_walk_do_aux;






reg_kl_walk_do = [shen_type_func,
  function shen_user_lambda3389(Arg3388) {
  if (Arg3388.length < 5) return [shen_type_func, shen_user_lambda3389, 5, Arg3388];
  var Arg3388_0 = Arg3388[0], Arg3388_1 = Arg3388[1], Arg3388_2 = Arg3388[2], Arg3388_3 = Arg3388[3], Arg3388_4 = Arg3388[4];
  var R0;
  return ((R0 = shenjs_call(reg_kl_used_vars_cascade, [Arg3388_0, Arg3388_1, Arg3388_2])),
  (R0 = shenjs_call(reg_kl_walk_do_aux, [Arg3388_0, Arg3388_1, R0, Arg3388_3, Arg3388_4, []])),
  [shen_type_cons, [shen_type_symbol, "do"], R0])},
  5,
  [],
  "reg-kl-walk-do"];
shenjs_functions["shen_reg-kl-walk-do"] = reg_kl_walk_do;






reg_kl_walk_apply_aux = [shen_type_func,
  function shen_user_lambda3391(Arg3390) {
  if (Arg3390.length < 6) return [shen_type_func, shen_user_lambda3391, 6, Arg3390];
  var Arg3390_0 = Arg3390[0], Arg3390_1 = Arg3390[1], Arg3390_2 = Arg3390[2], Arg3390_3 = Arg3390[3], Arg3390_4 = Arg3390[4], Arg3390_5 = Arg3390[5];
  var R0;
  return (((shenjs_empty$question$(Arg3390_0) && shenjs_empty$question$(Arg3390_2)))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg3390_5]);})
  : (((shenjs_is_type(Arg3390_0, shen_type_cons) && (shenjs_empty$question$(Arg3390_0[2]) && (shenjs_is_type(Arg3390_2, shen_type_cons) && shenjs_empty$question$(Arg3390_2[2])))))
  ? ((R0 = shenjs_call(reg_kl_walk_expr, [Arg3390_0[1], Arg3390_1, Arg3390_2[1], Arg3390_3, Arg3390_4])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_apply_aux, [[], Arg3390_1, [], Arg3390_3, Arg3390_4, [shen_type_cons, R0, Arg3390_5]]);}))
  : (((shenjs_is_type(Arg3390_0, shen_type_cons) && (shenjs_is_type(Arg3390_2, shen_type_cons) && shenjs_is_type(Arg3390_2[2], shen_type_cons))))
  ? ((R0 = shenjs_call(reg_kl_walk_expr, [Arg3390_0[1], Arg3390_1, Arg3390_2[1], Arg3390_2[2][1], Arg3390_4])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_apply_aux, [Arg3390_0[2], Arg3390_1, Arg3390_2[2], Arg3390_3, Arg3390_4, [shen_type_cons, R0, Arg3390_5]]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-walk-apply-aux"]]);}))))},
  6,
  [],
  "reg-kl-walk-apply-aux"];
shenjs_functions["shen_reg-kl-walk-apply-aux"] = reg_kl_walk_apply_aux;






reg_kl_walk_apply = [shen_type_func,
  function shen_user_lambda3393(Arg3392) {
  if (Arg3392.length < 5) return [shen_type_func, shen_user_lambda3393, 5, Arg3392];
  var Arg3392_0 = Arg3392[0], Arg3392_1 = Arg3392[1], Arg3392_2 = Arg3392[2], Arg3392_3 = Arg3392[3], Arg3392_4 = Arg3392[4];
  var R0;
  return ((R0 = shenjs_call(reg_kl_used_vars_cascade, [Arg3392_0, Arg3392_1, Arg3392_2])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_apply_aux, [Arg3392_0, Arg3392_1, R0, Arg3392_3, Arg3392_4, []]);}))},
  5,
  [],
  "reg-kl-walk-apply"];
shenjs_functions["shen_reg-kl-walk-apply"] = reg_kl_walk_apply;






reg_kl_walk_if = [shen_type_func,
  function shen_user_lambda3395(Arg3394) {
  if (Arg3394.length < 7) return [shen_type_func, shen_user_lambda3395, 7, Arg3394];
  var Arg3394_0 = Arg3394[0], Arg3394_1 = Arg3394[1], Arg3394_2 = Arg3394[2], Arg3394_3 = Arg3394[3], Arg3394_4 = Arg3394[4], Arg3394_5 = Arg3394[5], Arg3394_6 = Arg3394[6];
  var R0, R1, R2;
  return ((R0 = shenjs_call(reg_kl_used_vars_aux, [Arg3394_1, Arg3394_3, [], Arg3394_5])),
  (R1 = shenjs_call(reg_kl_used_vars_aux, [Arg3394_2, Arg3394_3, [], Arg3394_5])),
  (R2 = shenjs_call(shen_append, [R0, R1])),
  (R2 = shenjs_call(reg_kl_walk_expr, [Arg3394_0, Arg3394_3, Arg3394_4, R2, Arg3394_6])),
  (R0 = shenjs_call(reg_kl_walk_expr, [Arg3394_1, Arg3394_3, R0, Arg3394_5, Arg3394_6])),
  (R1 = shenjs_call(reg_kl_walk_expr, [Arg3394_2, Arg3394_3, R1, Arg3394_5, Arg3394_6])),
  [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, R2, [shen_type_cons, R0, [shen_type_cons, R1, []]]]])},
  7,
  [],
  "reg-kl-walk-if"];
shenjs_functions["shen_reg-kl-walk-if"] = reg_kl_walk_if;






reg_kl_walk_cond = [shen_type_func,
  function shen_user_lambda3397(Arg3396) {
  if (Arg3396.length < 5) return [shen_type_func, shen_user_lambda3397, 5, Arg3396];
  var Arg3396_0 = Arg3396[0], Arg3396_1 = Arg3396[1], Arg3396_2 = Arg3396[2], Arg3396_3 = Arg3396[3], Arg3396_4 = Arg3396[4];
  var R0, R1, R2;
  return ((shenjs_empty$question$(Arg3396_0))
  ? [shen_type_cons, [shen_type_symbol, "error"], [shen_type_cons, "error: cond failure", []]]
  : (((shenjs_is_type(Arg3396_0, shen_type_cons) && (shenjs_is_type(Arg3396_0[1], shen_type_cons) && (shenjs_is_type(Arg3396_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg3396_0[1][2][2])))))
  ? ((R0 = shenjs_call(reg_kl_used_vars_aux, [Arg3396_0[1][2][1], Arg3396_1, [], Arg3396_3])),
  (R1 = shenjs_call(reg_kl_used_vars_aux, [Arg3396_0[2], Arg3396_1, [], Arg3396_3])),
  (R0 = shenjs_call(reg_kl_used_vars_aux, [Arg3396_0[1][1], Arg3396_1, [], shenjs_call(shen_append, [R0, R1])])),
  (R2 = shenjs_call(reg_kl_walk_cond, [Arg3396_0[2], Arg3396_1, Arg3396_2, Arg3396_3, Arg3396_4])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_if, [Arg3396_0[1][1], Arg3396_0[1][2][1], R2, Arg3396_1, R0, R1, Arg3396_4]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-walk-cond"]]);})))},
  5,
  [],
  "reg-kl-walk-cond"];
shenjs_functions["shen_reg-kl-walk-cond"] = reg_kl_walk_cond;






reg_kl_mk_closure_kl = [shen_type_func,
  function shen_user_lambda3399(Arg3398) {
  if (Arg3398.length < 3) return [shen_type_func, shen_user_lambda3399, 3, Arg3398];
  var Arg3398_0 = Arg3398[0], Arg3398_1 = Arg3398[1], Arg3398_2 = Arg3398[2];
  return [shen_type_cons, [shen_type_symbol, "shen-mk-closure"], [shen_type_cons, Arg3398_0, [shen_type_cons, Arg3398_1, [shen_type_cons, Arg3398_2, []]]]]},
  3,
  [],
  "reg-kl-mk-closure-kl"];
shenjs_functions["shen_reg-kl-mk-closure-kl"] = reg_kl_mk_closure_kl;






reg_kl_mk_closure_args_init = [shen_type_func,
  function shen_user_lambda3401(Arg3400) {
  if (Arg3400.length < 3) return [shen_type_func, shen_user_lambda3401, 3, Arg3400];
  var Arg3400_0 = Arg3400[0], Arg3400_1 = Arg3400[1], Arg3400_2 = Arg3400[2];
  var R0;
  return ((shenjs_empty$question$(Arg3400_0))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg3400_2]);})
  : ((shenjs_is_type(Arg3400_0, shen_type_cons))
  ? ((R0 = shenjs_call(reg_kl_mk_shen_get_reg, [shenjs_call(reg_kl_var_idx, [Arg3400_0[1], Arg3400_1])])),
  (function() {
  return shenjs_call_tail(reg_kl_mk_closure_args_init, [Arg3400_0[2], Arg3400_1, [shen_type_cons, R0, Arg3400_2]]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-mk-closure-args-init"]]);})))},
  3,
  [],
  "reg-kl-mk-closure-args-init"];
shenjs_functions["shen_reg-kl-mk-closure-args-init"] = reg_kl_mk_closure_args_init;






reg_kl_mk_closure_env = [shen_type_func,
  function shen_user_lambda3403(Arg3402) {
  if (Arg3402.length < 2) return [shen_type_func, shen_user_lambda3403, 2, Arg3402];
  var Arg3402_0 = Arg3402[0], Arg3402_1 = Arg3402[1];
  return ((shenjs_empty$question$(Arg3402_0))
  ? Arg3402_1
  : ((shenjs_is_type(Arg3402_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_mk_closure_env, [Arg3402_0[2], [shen_type_cons, [shen_type_cons, Arg3402_0[1], shenjs_call(reg_kl_new_var_idx, [Arg3402_0[1], Arg3402_1])], Arg3402_1]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-mk-closure-env"]]);})))},
  2,
  [],
  "reg-kl-mk-closure-env"];
shenjs_functions["shen_reg-kl-mk-closure-env"] = reg_kl_mk_closure_env;






reg_kl_mk_closure_list = [shen_type_func,
  function shen_user_lambda3405(Arg3404) {
  if (Arg3404.length < 5) return [shen_type_func, shen_user_lambda3405, 5, Arg3404];
  var Arg3404_0 = Arg3404[0], Arg3404_1 = Arg3404[1], Arg3404_2 = Arg3404[2], Arg3404_3 = Arg3404[3], Arg3404_4 = Arg3404[4];
  var R0, R1;
  return ((R0 = shenjs_call(reg_kl_mk_closure_env, [Arg3404_3, []])),
  (R1 = shenjs_call(reg_kl_mk_closure_args_init, [Arg3404_3, Arg3404_2, []])),
  (R0 = shenjs_call(reg_kl_mk_function_kl, [Arg3404_0, Arg3404_1, R0, Arg3404_4])),
  [shen_type_cons, R1, [shen_type_cons, R0, []]])},
  5,
  [],
  "reg-kl-mk-closure-list"];
shenjs_functions["shen_reg-kl-mk-closure-list"] = reg_kl_mk_closure_list;






reg_kl_walk_lambda_aux = [shen_type_func,
  function shen_user_lambda3407(Arg3406) {
  if (Arg3406.length < 6) return [shen_type_func, shen_user_lambda3407, 6, Arg3406];
  var Arg3406_0 = Arg3406[0], Arg3406_1 = Arg3406[1], Arg3406_2 = Arg3406[2], Arg3406_3 = Arg3406[3], Arg3406_4 = Arg3406[4], Arg3406_5 = Arg3406[5];
  var R0, R1;
  return (((shenjs_is_type(Arg3406_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "lambda"], Arg3406_1[1])) && (shenjs_is_type(Arg3406_1[2], shen_type_cons) && (shenjs_is_type(Arg3406_1[2][2], shen_type_cons) && shenjs_empty$question$(Arg3406_1[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_lambda_aux, [Arg3406_1[2][1], Arg3406_1[2][2][1], [shen_type_cons, Arg3406_0, Arg3406_2], Arg3406_3, Arg3406_4, Arg3406_5]);})
  : ((R0 = shenjs_call(shen_reverse, [[shen_type_cons, Arg3406_0, Arg3406_2]])),
  (R1 = shenjs_call(shen_append, [Arg3406_4, shenjs_call(shen_reverse, [[shen_type_cons, Arg3406_0, R0]])])),
  (R1 = shenjs_call(reg_kl_mk_closure_list, [R1, Arg3406_1, Arg3406_3, Arg3406_4, Arg3406_5])),
  [shen_type_cons, [shen_type_symbol, "shen-mk-closure"], [shen_type_cons, R0, R1]]))},
  6,
  [],
  "reg-kl-walk-lambda-aux"];
shenjs_functions["shen_reg-kl-walk-lambda-aux"] = reg_kl_walk_lambda_aux;






reg_kl_walk_lambda = [shen_type_func,
  function shen_user_lambda3409(Arg3408) {
  if (Arg3408.length < 5) return [shen_type_func, shen_user_lambda3409, 5, Arg3408];
  var Arg3408_0 = Arg3408[0], Arg3408_1 = Arg3408[1], Arg3408_2 = Arg3408[2], Arg3408_3 = Arg3408[3], Arg3408_4 = Arg3408[4];
  var R0;
  return ((R0 = shenjs_call(reg_kl_used_vars, [[shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, Arg3408_0, [shen_type_cons, Arg3408_1, []]]], Arg3408_3])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_lambda_aux, [Arg3408_0, Arg3408_1, Arg3408_2, Arg3408_3, R0, Arg3408_4]);}))},
  5,
  [],
  "reg-kl-walk-lambda"];
shenjs_functions["shen_reg-kl-walk-lambda"] = reg_kl_walk_lambda;






reg_kl_walk_freeze = [shen_type_func,
  function shen_user_lambda3411(Arg3410) {
  if (Arg3410.length < 4) return [shen_type_func, shen_user_lambda3411, 4, Arg3410];
  var Arg3410_0 = Arg3410[0], Arg3410_1 = Arg3410[1], Arg3410_2 = Arg3410[2], Arg3410_3 = Arg3410[3];
  var R0;
  return ((R0 = shenjs_call(reg_kl_mk_closure_list, [Arg3410_2, Arg3410_0, Arg3410_1, Arg3410_2, Arg3410_3])),
  [shen_type_cons, [shen_type_symbol, "shen-mk-freeze"], R0])},
  4,
  [],
  "reg-kl-walk-freeze"];
shenjs_functions["shen_reg-kl-walk-freeze"] = reg_kl_walk_freeze;






reg_kl_lift_defun = [shen_type_func,
  function shen_user_lambda3413(Arg3412) {
  if (Arg3412.length < 4) return [shen_type_func, shen_user_lambda3413, 4, Arg3412];
  var Arg3412_0 = Arg3412[0], Arg3412_1 = Arg3412[1], Arg3412_2 = Arg3412[2], Arg3412_3 = Arg3412[3];
  var R0, R1;
  return ((R0 = shenjs_call(reg_kl_mk_context, [shenjs_call(reg_kl_context_toplevel, [Arg3412_3]), 0])),
  (R1 = shenjs_call(reg_kl_mk_defun_kl, [Arg3412_0, Arg3412_1, Arg3412_2, [], R0])),
  shenjs_call(reg_kl_context_toplevel_$gt$, [Arg3412_3, [shen_type_cons, R1, shenjs_call(reg_kl_context_toplevel, [R0])]]),
  [shen_type_cons, [shen_type_symbol, "function"], [shen_type_cons, Arg3412_0, []]])},
  4,
  [],
  "reg-kl-lift-defun"];
shenjs_functions["shen_reg-kl-lift-defun"] = reg_kl_lift_defun;






reg_kl_walk_expr = [shen_type_func,
  function shen_user_lambda3415(Arg3414) {
  if (Arg3414.length < 5) return [shen_type_func, shen_user_lambda3415, 5, Arg3414];
  var Arg3414_0 = Arg3414[0], Arg3414_1 = Arg3414[1], Arg3414_2 = Arg3414[2], Arg3414_3 = Arg3414[3], Arg3414_4 = Arg3414[4];
  return (((shenjs_is_type(Arg3414_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg3414_0[1])) && (shenjs_is_type(Arg3414_0[2], shen_type_cons) && (shenjs_is_type(Arg3414_0[2][2], shen_type_cons) && (shenjs_is_type(Arg3414_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg3414_0[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_let, [Arg3414_0[2][1], Arg3414_0[2][2][1], Arg3414_0[2][2][2][1], Arg3414_1, Arg3414_2, Arg3414_3, Arg3414_4]);})
  : (((shenjs_is_type(Arg3414_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "if"], Arg3414_0[1])) && (shenjs_is_type(Arg3414_0[2], shen_type_cons) && (shenjs_is_type(Arg3414_0[2][2], shen_type_cons) && (shenjs_is_type(Arg3414_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg3414_0[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_if, [Arg3414_0[2][1], Arg3414_0[2][2][1], Arg3414_0[2][2][2][1], Arg3414_1, Arg3414_2, Arg3414_3, Arg3414_4]);})
  : (((shenjs_is_type(Arg3414_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cond"], Arg3414_0[1]))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_cond, [Arg3414_0[2], Arg3414_1, Arg3414_2, Arg3414_3, Arg3414_4]);})
  : (((shenjs_is_type(Arg3414_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "do"], Arg3414_0[1]))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_do, [Arg3414_0[2], Arg3414_1, Arg3414_2, Arg3414_3, Arg3414_4]);})
  : (((shenjs_is_type(Arg3414_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "lambda"], Arg3414_0[1])) && (shenjs_is_type(Arg3414_0[2], shen_type_cons) && (shenjs_is_type(Arg3414_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg3414_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_lambda, [Arg3414_0[2][1], Arg3414_0[2][2][1], [], Arg3414_1, Arg3414_4]);})
  : (((shenjs_is_type(Arg3414_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "freeze"], Arg3414_0[1])) && (shenjs_is_type(Arg3414_0[2], shen_type_cons) && shenjs_empty$question$(Arg3414_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_freeze, [Arg3414_0[2][1], Arg3414_1, Arg3414_2, Arg3414_4]);})
  : (((shenjs_is_type(Arg3414_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defun"], Arg3414_0[1])) && (shenjs_is_type(Arg3414_0[2], shen_type_cons) && (shenjs_is_type(Arg3414_0[2][2], shen_type_cons) && (shenjs_is_type(Arg3414_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg3414_0[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(reg_kl_lift_defun, [Arg3414_0[2][1], Arg3414_0[2][2][1], Arg3414_0[2][2][2][1], Arg3414_4]);})
  : ((shenjs_is_type(Arg3414_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_apply, [Arg3414_0, Arg3414_1, Arg3414_2, Arg3414_3, Arg3414_4]);})
  : (((shenjs_call(reg_kl_var_defined$question$, [Arg3414_0, Arg3414_1]) && shenjs_is_type(Arg3414_0, shen_type_symbol)))
  ? (function() {
  return shenjs_call_tail(reg_kl_mk_shen_get_reg, [shenjs_call(reg_kl_var_idx, [Arg3414_0, Arg3414_1])]);})
  : Arg3414_0)))))))))},
  5,
  [],
  "reg-kl-walk-expr"];
shenjs_functions["shen_reg-kl-walk-expr"] = reg_kl_walk_expr;






reg_kl_mk_defun_env = [shen_type_func,
  function shen_user_lambda3417(Arg3416) {
  if (Arg3416.length < 3) return [shen_type_func, shen_user_lambda3417, 3, Arg3416];
  var Arg3416_0 = Arg3416[0], Arg3416_1 = Arg3416[1], Arg3416_2 = Arg3416[2];
  return ((shenjs_empty$question$(Arg3416_0))
  ? Arg3416_2
  : ((shenjs_is_type(Arg3416_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_mk_defun_env, [Arg3416_0[2], (Arg3416_1 - 1), [shen_type_cons, [shen_type_cons, Arg3416_0[1], Arg3416_1], Arg3416_2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-mk-defun-env"]]);})))},
  3,
  [],
  "reg-kl-mk-defun-env"];
shenjs_functions["shen_reg-kl-mk-defun-env"] = reg_kl_mk_defun_env;






reg_kl_mk_function_kl = [shen_type_func,
  function shen_user_lambda3419(Arg3418) {
  if (Arg3418.length < 4) return [shen_type_func, shen_user_lambda3419, 4, Arg3418];
  var Arg3418_0 = Arg3418[0], Arg3418_1 = Arg3418[1], Arg3418_2 = Arg3418[2], Arg3418_3 = Arg3418[3];
  var R0, R1;
  return ((R0 = shenjs_call(reg_kl_remove_duplicates, [Arg3418_0])),
  (R1 = shenjs_call(reg_kl_mk_defun_env, [R0, -1, Arg3418_2])),
  (R0 = shenjs_call(reg_kl_used_vars, [Arg3418_1, R0])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_expr, [Arg3418_1, R1, R0, [], Arg3418_3]);}))},
  4,
  [],
  "reg-kl-mk-function-kl"];
shenjs_functions["shen_reg-kl-mk-function-kl"] = reg_kl_mk_function_kl;






reg_kl_mk_defun_kl = [shen_type_func,
  function shen_user_lambda3421(Arg3420) {
  if (Arg3420.length < 5) return [shen_type_func, shen_user_lambda3421, 5, Arg3420];
  var Arg3420_0 = Arg3420[0], Arg3420_1 = Arg3420[1], Arg3420_2 = Arg3420[2], Arg3420_3 = Arg3420[3], Arg3420_4 = Arg3420[4];
  var R0;
  return ((R0 = shenjs_call(reg_kl_mk_function_kl, [Arg3420_1, Arg3420_2, Arg3420_3, Arg3420_4])),
  [shen_type_cons, [shen_type_symbol, "shen-mk-func"], [shen_type_cons, Arg3420_0, [shen_type_cons, Arg3420_1, [shen_type_cons, R0, []]]]])},
  5,
  [],
  "reg-kl-mk-defun-kl"];
shenjs_functions["shen_reg-kl-mk-defun-kl"] = reg_kl_mk_defun_kl;






reg_kl_walk_toplevel = [shen_type_func,
  function shen_user_lambda3423(Arg3422) {
  if (Arg3422.length < 2) return [shen_type_func, shen_user_lambda3423, 2, Arg3422];
  var Arg3422_0 = Arg3422[0], Arg3422_1 = Arg3422[1];
  var R0, R1;
  return (((shenjs_is_type(Arg3422_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defun"], Arg3422_0[1])) && (shenjs_is_type(Arg3422_0[2], shen_type_cons) && (shenjs_is_type(Arg3422_0[2][2], shen_type_cons) && (shenjs_is_type(Arg3422_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg3422_0[2][2][2][2])))))))
  ? ((R0 = shenjs_call(reg_kl_mk_context, [Arg3422_1, 0])),
  (R1 = shenjs_call(reg_kl_mk_defun_kl, [Arg3422_0[2][1], Arg3422_0[2][2][1], Arg3422_0[2][2][2][1], [], R0])),
  [shen_type_cons, R1, shenjs_call(reg_kl_context_toplevel, [R0])])
  : ((R0 = shenjs_call(reg_kl_mk_context, [Arg3422_1, 0])),
  (R1 = shenjs_call(reg_kl_walk_expr, [Arg3422_0, [], [], [], R0])),
  [shen_type_cons, R1, shenjs_call(reg_kl_context_toplevel, [R0])]))},
  2,
  [],
  "reg-kl-walk-toplevel"];
shenjs_functions["shen_reg-kl-walk-toplevel"] = reg_kl_walk_toplevel;






reg_kl_walk_aux = [shen_type_func,
  function shen_user_lambda3425(Arg3424) {
  if (Arg3424.length < 2) return [shen_type_func, shen_user_lambda3425, 2, Arg3424];
  var Arg3424_0 = Arg3424[0], Arg3424_1 = Arg3424[1];
  return ((shenjs_empty$question$(Arg3424_0))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg3424_1]);})
  : ((shenjs_is_type(Arg3424_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_aux, [Arg3424_0[2], shenjs_call(reg_kl_walk_toplevel, [Arg3424_0[1], Arg3424_1])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-walk-aux"]]);})))},
  2,
  [],
  "reg-kl-walk-aux"];
shenjs_functions["shen_reg-kl-walk-aux"] = reg_kl_walk_aux;






reg_kl_walk = [shen_type_func,
  function shen_user_lambda3427(Arg3426) {
  if (Arg3426.length < 1) return [shen_type_func, shen_user_lambda3427, 1, Arg3426];
  var Arg3426_0 = Arg3426[0];
  return (function() {
  return shenjs_call_tail(reg_kl_walk_aux, [Arg3426_0, []]);})},
  1,
  [],
  "reg-kl-walk"];
shenjs_functions["shen_reg-kl-walk"] = reg_kl_walk;






shenjs_call(shen_process_datatype, [[shen_type_symbol, "js-context"], shenjs_call(shen_compile, [[shen_type_symbol, "shen-<datatype-rules>"], [shen_type_cons, [shen_type_symbol, "Varname"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "Argname"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "Toplevel"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "Nregs"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "Nregs"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "Toplevel"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "Argname"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "Varname"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 0, []]], []]]], []]]], []]]], []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 4, []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 4, [shen_type_cons, [shen_type_symbol, "B"], []]]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 3, []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "B"], []]]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 2, []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "B"], []]]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 1, []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "B"], []]]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]], [shen_type_symbol, "shen-datatype-error"]])]);





js_mk_context = [shen_type_func,
  function shen_user_lambda3933(Arg3932) {
  if (Arg3932.length < 4) return [shen_type_func, shen_user_lambda3933, 4, Arg3932];
  var Arg3932_0 = Arg3932[0], Arg3932_1 = Arg3932[1], Arg3932_2 = Arg3932[2], Arg3932_3 = Arg3932[3];
  return (function() {
  return shenjs_call_tail(shen_$at$v, [Arg3932_0, shenjs_call(shen_$at$v, [Arg3932_1, shenjs_call(shen_$at$v, [Arg3932_2, shenjs_call(shen_$at$v, [Arg3932_3, shenjs_vector(0)])])])]);})},
  4,
  [],
  "js-mk-context"];
shenjs_functions["shen_js-mk-context"] = js_mk_context;






js_context_varname_$gt$ = [shen_type_func,
  function shen_user_lambda3935(Arg3934) {
  if (Arg3934.length < 2) return [shen_type_func, shen_user_lambda3935, 2, Arg3934];
  var Arg3934_0 = Arg3934[0], Arg3934_1 = Arg3934[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$, [Arg3934_0, 4, Arg3934_1]);})},
  2,
  [],
  "js-context-varname->"];
shenjs_functions["shen_js-context-varname->"] = js_context_varname_$gt$;






js_context_argname_$gt$ = [shen_type_func,
  function shen_user_lambda3937(Arg3936) {
  if (Arg3936.length < 2) return [shen_type_func, shen_user_lambda3937, 2, Arg3936];
  var Arg3936_0 = Arg3936[0], Arg3936_1 = Arg3936[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$, [Arg3936_0, 3, Arg3936_1]);})},
  2,
  [],
  "js-context-argname->"];
shenjs_functions["shen_js-context-argname->"] = js_context_argname_$gt$;






js_context_toplevel_$gt$ = [shen_type_func,
  function shen_user_lambda3939(Arg3938) {
  if (Arg3938.length < 2) return [shen_type_func, shen_user_lambda3939, 2, Arg3938];
  var Arg3938_0 = Arg3938[0], Arg3938_1 = Arg3938[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$, [Arg3938_0, 2, Arg3938_1]);})},
  2,
  [],
  "js-context-toplevel->"];
shenjs_functions["shen_js-context-toplevel->"] = js_context_toplevel_$gt$;






js_context_nregs_$gt$ = [shen_type_func,
  function shen_user_lambda3941(Arg3940) {
  if (Arg3940.length < 2) return [shen_type_func, shen_user_lambda3941, 2, Arg3940];
  var Arg3940_0 = Arg3940[0], Arg3940_1 = Arg3940[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$, [Arg3940_0, 1, Arg3940_1]);})},
  2,
  [],
  "js-context-nregs->"];
shenjs_functions["shen_js-context-nregs->"] = js_context_nregs_$gt$;






js_context_varname = [shen_type_func,
  function shen_user_lambda3943(Arg3942) {
  if (Arg3942.length < 1) return [shen_type_func, shen_user_lambda3943, 1, Arg3942];
  var Arg3942_0 = Arg3942[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$_vector, [Arg3942_0, 4]);})},
  1,
  [],
  "js-context-varname"];
shenjs_functions["shen_js-context-varname"] = js_context_varname;






js_context_argname = [shen_type_func,
  function shen_user_lambda3945(Arg3944) {
  if (Arg3944.length < 1) return [shen_type_func, shen_user_lambda3945, 1, Arg3944];
  var Arg3944_0 = Arg3944[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$_vector, [Arg3944_0, 3]);})},
  1,
  [],
  "js-context-argname"];
shenjs_functions["shen_js-context-argname"] = js_context_argname;






js_context_toplevel = [shen_type_func,
  function shen_user_lambda3947(Arg3946) {
  if (Arg3946.length < 1) return [shen_type_func, shen_user_lambda3947, 1, Arg3946];
  var Arg3946_0 = Arg3946[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$_vector, [Arg3946_0, 2]);})},
  1,
  [],
  "js-context-toplevel"];
shenjs_functions["shen_js-context-toplevel"] = js_context_toplevel;






js_context_nregs = [shen_type_func,
  function shen_user_lambda3949(Arg3948) {
  if (Arg3948.length < 1) return [shen_type_func, shen_user_lambda3949, 1, Arg3948];
  var Arg3948_0 = Arg3948[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$_vector, [Arg3948_0, 1]);})},
  1,
  [],
  "js-context-nregs"];
shenjs_functions["shen_js-context-nregs"] = js_context_nregs;






js_max = [shen_type_func,
  function shen_user_lambda3951(Arg3950) {
  if (Arg3950.length < 2) return [shen_type_func, shen_user_lambda3951, 2, Arg3950];
  var Arg3950_0 = Arg3950[0], Arg3950_1 = Arg3950[1];
  return (((Arg3950_0 > Arg3950_1))
  ? Arg3950_0
  : Arg3950_1)},
  2,
  [],
  "js-max"];
shenjs_functions["shen_js-max"] = js_max;






js_str_js_from_shen$asterisk$ = [shen_type_func,
  function shen_user_lambda3953(Arg3952) {
  if (Arg3952.length < 2) return [shen_type_func, shen_user_lambda3953, 2, Arg3952];
  var Arg3952_0 = Arg3952[0], Arg3952_1 = Arg3952[1];
  return ((shenjs_unwind_tail(shenjs_$eq$("", Arg3952_0)))
  ? Arg3952_1
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("-", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "_")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("_", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$_")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("$", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("'", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$quote$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("`", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$bquote$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("/", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$slash$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("*", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$asterisk$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("+", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$plus$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("%", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$percent$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("=", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$eq$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("?", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$question$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("!", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$excl$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$(">", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$gt$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("<", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$lt$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$(".", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$dot$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("|", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$bar$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("#", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$sharp$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("~", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$tilde$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$(":", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$colon$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$(";", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$sc$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("@", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$at$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("&", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$amp$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("{", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$cbraceopen$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3952_0]) && shenjs_unwind_tail(shenjs_$eq$("}", Arg3952_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + "$cbraceclose$")]);})
  : ((shenjs_call(shen_$plus$string$question$, [Arg3952_0]))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3952_0), (Arg3952_1 + Arg3952_0[0])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-str-js-from-shen*"]]);})))))))))))))))))))))))))))},
  2,
  [],
  "js-str-js-from-shen*"];
shenjs_functions["shen_js-str-js-from-shen*"] = js_str_js_from_shen$asterisk$;






js_str_js_from_shen = [shen_type_func,
  function shen_user_lambda3955(Arg3954) {
  if (Arg3954.length < 1) return [shen_type_func, shen_user_lambda3955, 1, Arg3954];
  var Arg3954_0 = Arg3954[0];
  return ((shenjs_call(shen_element$question$, [Arg3954_0, [shen_type_cons, "return", [shen_type_cons, "new", [shen_type_cons, "delete", [shen_type_cons, "function", [shen_type_cons, "while", [shen_type_cons, "for", [shen_type_cons, "var", [shen_type_cons, "if", [shen_type_cons, "do", [shen_type_cons, "in", [shen_type_cons, "super", [shen_type_cons, "load", [shen_type_cons, "print", [shen_type_cons, "eval", [shen_type_cons, "read", [shen_type_cons, "readline", [shen_type_cons, "write", [shen_type_cons, "putstr", [shen_type_cons, "let", [shen_type_cons, "Array", [shen_type_cons, "Object", [shen_type_cons, "document", []]]]]]]]]]]]]]]]]]]]]]]]))
  ? ("$shen$" + Arg3954_0)
  : (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [Arg3954_0, ""]);}))},
  1,
  [],
  "js-str-js-from-shen"];
shenjs_functions["shen_js-str-js-from-shen"] = js_str_js_from_shen;






js_sym_js_from_shen = [shen_type_func,
  function shen_user_lambda3957(Arg3956) {
  if (Arg3956.length < 1) return [shen_type_func, shen_user_lambda3957, 1, Arg3956];
  var Arg3956_0 = Arg3956[0];
  return (function() {
  return shenjs_intern(shenjs_call(js_str_js_from_shen, [shenjs_str(Arg3956_0)]));})},
  1,
  [],
  "js-sym-js-from-shen"];
shenjs_functions["shen_js-sym-js-from-shen"] = js_sym_js_from_shen;






(shenjs_globals["shen_js-js-backslash"] = shenjs_n_$gt$string(92));






(shenjs_globals["shen_js-js-dquote"] = shenjs_n_$gt$string(34));






js_esc_string = [shen_type_func,
  function shen_user_lambda3961(Arg3960) {
  if (Arg3960.length < 2) return [shen_type_func, shen_user_lambda3961, 2, Arg3960];
  var Arg3960_0 = Arg3960[0], Arg3960_1 = Arg3960[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$("", Arg3960_0)))
  ? Arg3960_1
  : (((shenjs_call(shen_$plus$string$question$, [Arg3960_0]) && (shenjs_unwind_tail(shenjs_$eq$(Arg3960_0[0], (shenjs_globals["shen_js-js-backslash"]))) || shenjs_unwind_tail(shenjs_$eq$(Arg3960_0[0], (shenjs_globals["shen_js-js-dquote"]))))))
  ? ((R0 = (shenjs_globals["shen_js-js-backslash"])),
  (function() {
  return shenjs_call_tail(js_esc_string, [shenjs_tlstr(Arg3960_0), shenjs_call(shen_intmake_string, ["~A~A~A", [shen_tuple, Arg3960_1, [shen_tuple, R0, [shen_tuple, Arg3960_0[0], []]]]])]);}))
  : (((shenjs_call(shen_$plus$string$question$, [Arg3960_0]) && shenjs_unwind_tail(shenjs_$eq$(shenjs_string_$gt$n(Arg3960_0[0]), 10))))
  ? (function() {
  return shenjs_call_tail(js_esc_string, [shenjs_tlstr(Arg3960_0), (Arg3960_1 + "\\x0a")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3960_0]) && shenjs_unwind_tail(shenjs_$eq$(shenjs_string_$gt$n(Arg3960_0[0]), 13))))
  ? (function() {
  return shenjs_call_tail(js_esc_string, [shenjs_tlstr(Arg3960_0), (Arg3960_1 + "\\x0d")]);})
  : ((shenjs_call(shen_$plus$string$question$, [Arg3960_0]))
  ? (function() {
  return shenjs_call_tail(js_esc_string, [shenjs_tlstr(Arg3960_0), (Arg3960_1 + Arg3960_0[0])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-esc-string"]]);}))))))},
  2,
  [],
  "js-esc-string"];
shenjs_functions["shen_js-esc-string"] = js_esc_string;






js_cut_shen_prefix = [shen_type_func,
  function shen_user_lambda3963(Arg3962) {
  if (Arg3962.length < 1) return [shen_type_func, shen_user_lambda3963, 1, Arg3962];
  var Arg3962_0 = Arg3962[0];
  return (((shenjs_call(shen_$plus$string$question$, [Arg3962_0]) && (shenjs_unwind_tail(shenjs_$eq$("s", Arg3962_0[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(Arg3962_0)]) && (shenjs_unwind_tail(shenjs_$eq$("h", shenjs_tlstr(Arg3962_0)[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(shenjs_tlstr(Arg3962_0))]) && (shenjs_unwind_tail(shenjs_$eq$("e", shenjs_tlstr(shenjs_tlstr(Arg3962_0))[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3962_0)))]) && (shenjs_unwind_tail(shenjs_$eq$("n", shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3962_0)))[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3962_0))))]) && shenjs_unwind_tail(shenjs_$eq$("-", shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3962_0))))[0]))))))))))))
  ? (function() {
  return shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3962_0)))));})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3962_0]) && (shenjs_unwind_tail(shenjs_$eq$("s", Arg3962_0[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(Arg3962_0)]) && (shenjs_unwind_tail(shenjs_$eq$("h", shenjs_tlstr(Arg3962_0)[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(shenjs_tlstr(Arg3962_0))]) && (shenjs_unwind_tail(shenjs_$eq$("e", shenjs_tlstr(shenjs_tlstr(Arg3962_0))[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3962_0)))]) && (shenjs_unwind_tail(shenjs_$eq$("n", shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3962_0)))[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3962_0))))]) && shenjs_unwind_tail(shenjs_$eq$("_", shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3962_0))))[0]))))))))))))
  ? (function() {
  return shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3962_0)))));})
  : Arg3962_0))},
  1,
  [],
  "js-cut-shen-prefix"];
shenjs_functions["shen_js-cut-shen-prefix"] = js_cut_shen_prefix;






js_func_name = [shen_type_func,
  function shen_user_lambda3965(Arg3964) {
  if (Arg3964.length < 1) return [shen_type_func, shen_user_lambda3965, 1, Arg3964];
  var Arg3964_0 = Arg3964[0];
  return (((shenjs_call(shen_sysfunc$question$, [Arg3964_0]) || (shenjs_globals["shen_shen-*installing-kl*"])))
  ? (function() {
  return shenjs_intern(shenjs_call(js_str_js_from_shen, [("shen-" + shenjs_call(js_cut_shen_prefix, [shenjs_str(Arg3964_0)]))]));})
  : ((shenjs_is_type(Arg3964_0, shen_type_symbol))
  ? (function() {
  return shenjs_call_tail(js_sym_js_from_shen, [Arg3964_0]);})
  : Arg3964_0))},
  1,
  [],
  "js-func-name"];
shenjs_functions["shen_js-func-name"] = js_func_name;






js_intfunc_name = [shen_type_func,
  function shen_user_lambda3967(Arg3966) {
  if (Arg3966.length < 1) return [shen_type_func, shen_user_lambda3967, 1, Arg3966];
  var Arg3966_0 = Arg3966[0];
  return (((shenjs_call(shen_sysfunc$question$, [Arg3966_0]) || (shenjs_globals["shen_shen-*installing-kl*"])))
  ? (function() {
  return shenjs_intern(shenjs_call(js_str_js_from_shen, [("shenjs-" + shenjs_call(js_cut_shen_prefix, [shenjs_str(Arg3966_0)]))]));})
  : ((shenjs_is_type(Arg3966_0, shen_type_symbol))
  ? (function() {
  return shenjs_call_tail(js_sym_js_from_shen, [Arg3966_0]);})
  : Arg3966_0))},
  1,
  [],
  "js-intfunc-name"];
shenjs_functions["shen_js-intfunc-name"] = js_intfunc_name;






(shenjs_globals["shen_js-int-funcs"] = [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "X"], []], [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, [shen_type_symbol, "string?"], [shen_type_cons, [shen_type_symbol, "number?"], [shen_type_cons, [shen_type_symbol, "symbol?"], [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_symbol, "vector?"], [shen_type_cons, [shen_type_symbol, "absvector?"], [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "intern"], [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, [shen_type_symbol, "read-byte"], [shen_type_cons, [shen_type_symbol, "close"], [shen_type_cons, [shen_type_symbol, "absvector"], [shen_type_cons, [shen_type_symbol, "str"], [shen_type_cons, [shen_type_symbol, "tlstr"], [shen_type_cons, [shen_type_symbol, "n->string"], [shen_type_cons, [shen_type_symbol, "string->n"], [shen_type_cons, [shen_type_symbol, "empty?"], [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "error"], [shen_type_cons, [shen_type_symbol, "simple-error"], [shen_type_cons, [shen_type_symbol, "eval-kl"], [shen_type_cons, [shen_type_symbol, "error-to-string"], [shen_type_cons, [shen_type_symbol, "js-call-js"], []]]]]]]]]]]]]]]]]]]]]]]]]]]]], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "X"], [shen_type_cons, [shen_type_symbol, "Y"], []]], [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, [shen_type_symbol, "/"], [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "or"], [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, ">"], [shen_type_cons, [shen_type_symbol, ">="], [shen_type_cons, [shen_type_symbol, "<"], [shen_type_cons, [shen_type_symbol, "<="], [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "<-address"], [shen_type_cons, [shen_type_symbol, "cn"], [shen_type_cons, [shen_type_symbol, "pos"], [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "pr"], []]]]]]]]]]]]]]]]]]]], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "X"], [shen_type_cons, [shen_type_symbol, "Y"], [shen_type_cons, [shen_type_symbol, "Z"], []]]], [shen_type_cons, [shen_type_symbol, "address->"], [shen_type_cons, [shen_type_symbol, "open"], []]]], []]]]);






(shenjs_globals["shen_js-internals"] = [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "empty?"], [shen_type_cons, [shen_type_symbol, "boolean?"], [shen_type_cons, [shen_type_symbol, "vector?"], [shen_type_cons, [shen_type_symbol, "absvector?"], [shen_type_cons, [shen_type_symbol, "absvector"], [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, [shen_type_symbol, "str"], [shen_type_cons, [shen_type_symbol, "intern"], [shen_type_cons, [shen_type_symbol, "n->string"], [shen_type_cons, [shen_type_symbol, "string->n"], [shen_type_cons, [shen_type_symbol, "eval-kl"], [shen_type_cons, [shen_type_symbol, "open"], [shen_type_cons, [shen_type_symbol, "js-write-byte"], [shen_type_cons, [shen_type_symbol, "read-byte"], [shen_type_cons, [shen_type_symbol, "close"], [shen_type_cons, [shen_type_symbol, "tlstr"], [shen_type_cons, [shen_type_symbol, "pr"], [shen_type_cons, [shen_type_symbol, "error"], [shen_type_cons, [shen_type_symbol, "simple-error"], [shen_type_cons, [shen_type_symbol, "error-to-string"], [shen_type_cons, [shen_type_symbol, "js-shenjs-call-js"], []]]]]]]]]]]]]]]]]]]]]]]]]]);






(shenjs_globals["shen_js-tail-internals"] = [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "js-shenjs-call-js"], []]]);






js_int_func_args$asterisk$ = [shen_type_func,
  function shen_user_lambda3972(Arg3971) {
  if (Arg3971.length < 2) return [shen_type_func, shen_user_lambda3972, 2, Arg3971];
  var Arg3971_0 = Arg3971[0], Arg3971_1 = Arg3971[1];
  return ((shenjs_empty$question$(Arg3971_1))
  ? []
  : (((shenjs_is_type(Arg3971_1, shen_type_cons) && (shenjs_is_type(Arg3971_1[1], shen_type_cons) && shenjs_call(shen_element$question$, [Arg3971_0, Arg3971_1[1][2]]))))
  ? Arg3971_1[1][1]
  : (((shenjs_is_type(Arg3971_1, shen_type_cons) && shenjs_is_type(Arg3971_1[1], shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(js_int_func_args$asterisk$, [Arg3971_0, Arg3971_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-int-func-args*"]]);}))))},
  2,
  [],
  "js-int-func-args*"];
shenjs_functions["shen_js-int-func-args*"] = js_int_func_args$asterisk$;






js_int_func_args = [shen_type_func,
  function shen_user_lambda3974(Arg3973) {
  if (Arg3973.length < 1) return [shen_type_func, shen_user_lambda3974, 1, Arg3973];
  var Arg3973_0 = Arg3973[0];
  return (function() {
  return shenjs_call_tail(js_int_func_args$asterisk$, [Arg3973_0, (shenjs_globals["shen_js-int-funcs"])]);})},
  1,
  [],
  "js-int-func-args"];
shenjs_functions["shen_js-int-func-args"] = js_int_func_args;






js_int_func$question$ = [shen_type_func,
  function shen_user_lambda3976(Arg3975) {
  if (Arg3975.length < 1) return [shen_type_func, shen_user_lambda3976, 1, Arg3975];
  var Arg3975_0 = Arg3975[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fail"], Arg3975_0)))
  ? true
  : (!shenjs_empty$question$(shenjs_call(js_int_func_args, [Arg3975_0]))))},
  1,
  [],
  "js-int-func?"];
shenjs_functions["shen_js-int-func?"] = js_int_func$question$;






js_esc_obj = [shen_type_func,
  function shen_user_lambda3978(Arg3977) {
  if (Arg3977.length < 1) return [shen_type_func, shen_user_lambda3978, 1, Arg3977];
  var Arg3977_0 = Arg3977[0];
  return (((typeof(Arg3977_0) == 'string'))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["\"~A\"", [shen_tuple, shenjs_call(js_esc_string, [Arg3977_0, ""]), []]]);})
  : ((shenjs_call(shen_sysfunc$question$, [Arg3977_0]))
  ? (function() {
  return shenjs_call_tail(js_func_name, [Arg3977_0]);})
  : ((shenjs_is_type(Arg3977_0, shen_type_symbol))
  ? (function() {
  return shenjs_call_tail(js_sym_js_from_shen, [Arg3977_0]);})
  : (function() {
  return shenjs_call_tail(shen_interror, ["Object ~R cannot be escaped", [shen_tuple, Arg3977_0, []]]);}))))},
  1,
  [],
  "js-esc-obj"];
shenjs_functions["shen_js-esc-obj"] = js_esc_obj;






js_str_join$asterisk$ = [shen_type_func,
  function shen_user_lambda3980(Arg3979) {
  if (Arg3979.length < 3) return [shen_type_func, shen_user_lambda3980, 3, Arg3979];
  var Arg3979_0 = Arg3979[0], Arg3979_1 = Arg3979[1], Arg3979_2 = Arg3979[2];
  return ((shenjs_empty$question$(Arg3979_0))
  ? Arg3979_2
  : (((shenjs_is_type(Arg3979_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("", Arg3979_2))))
  ? (function() {
  return shenjs_call_tail(js_str_join$asterisk$, [Arg3979_0[2], Arg3979_1, Arg3979_0[1]]);})
  : ((shenjs_is_type(Arg3979_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(js_str_join$asterisk$, [Arg3979_0[2], Arg3979_1, shenjs_call(shen_intmake_string, ["~A~A~A", [shen_tuple, Arg3979_2, [shen_tuple, Arg3979_1, [shen_tuple, Arg3979_0[1], []]]]])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-str-join*"]]);}))))},
  3,
  [],
  "js-str-join*"];
shenjs_functions["shen_js-str-join*"] = js_str_join$asterisk$;






js_str_join = [shen_type_func,
  function shen_user_lambda3982(Arg3981) {
  if (Arg3981.length < 2) return [shen_type_func, shen_user_lambda3982, 2, Arg3981];
  var Arg3981_0 = Arg3981[0], Arg3981_1 = Arg3981[1];
  return (function() {
  return shenjs_call_tail(js_str_join$asterisk$, [Arg3981_0, Arg3981_1, ""]);})},
  2,
  [],
  "js-str-join"];
shenjs_functions["shen_js-str-join"] = js_str_join;






js_arg_list = [shen_type_func,
  function shen_user_lambda3984(Arg3983) {
  if (Arg3983.length < 1) return [shen_type_func, shen_user_lambda3984, 1, Arg3983];
  var Arg3983_0 = Arg3983[0];
  return (function() {
  return shenjs_call_tail(js_str_join, [Arg3983_0, ", "]);})},
  1,
  [],
  "js-arg-list"];
shenjs_functions["shen_js-arg-list"] = js_arg_list;






js_arg_name = [shen_type_func,
  function shen_user_lambda3986(Arg3985) {
  if (Arg3985.length < 2) return [shen_type_func, shen_user_lambda3986, 2, Arg3985];
  var Arg3985_0 = Arg3985[0], Arg3985_1 = Arg3985[1];
  return (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A_~A", [shen_tuple, shenjs_call(js_context_argname, [Arg3985_1]), [shen_tuple, Arg3985_0, []]]]);})},
  2,
  [],
  "js-arg-name"];
shenjs_functions["shen_js-arg-name"] = js_arg_name;






js_tail_call_ret = [shen_type_func,
  function shen_user_lambda3988(Arg3987) {
  if (Arg3987.length < 1) return [shen_type_func, shen_user_lambda3988, 1, Arg3987];
  var Arg3987_0 = Arg3987[0];
  return (function() {
  return shenjs_call_tail(shen_intmake_string, ["(function() {~%  return ~A;})", [shen_tuple, Arg3987_0, []]]);})},
  1,
  [],
  "js-tail-call-ret"];
shenjs_functions["shen_js-tail-call-ret"] = js_tail_call_ret;






js_get_func_obj = [shen_type_func,
  function shen_user_lambda3990(Arg3989) {
  if (Arg3989.length < 3) return [shen_type_func, shen_user_lambda3990, 3, Arg3989];
  var Arg3989_0 = Arg3989[0], Arg3989_1 = Arg3989[1], Arg3989_2 = Arg3989[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg3989_1)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_get_fn(~A)", [shen_tuple, shenjs_call(js_get_func_obj, [Arg3989_0, false, Arg3989_2]), []]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$(false, Arg3989_1)) && shenjs_is_type(Arg3989_0, shen_type_symbol)))
  ? (function() {
  return shenjs_call_tail(js_func_name, [Arg3989_0]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg3989_1)))
  ? Arg3989_0
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-get-func-obj"]]);}))))},
  3,
  [],
  "js-get-func-obj"];
shenjs_functions["shen_js-get-func-obj"] = js_get_func_obj;






js_tail_call_expr = [shen_type_func,
  function shen_user_lambda3992(Arg3991) {
  if (Arg3991.length < 2) return [shen_type_func, shen_user_lambda3992, 2, Arg3991];
  var Arg3991_0 = Arg3991[0], Arg3991_1 = Arg3991[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg3991_0, false, Arg3991_1]);})},
  2,
  [],
  "js-tail-call-expr"];
shenjs_functions["shen_js-tail-call-expr"] = js_tail_call_expr;






js_cond_case = [shen_type_func,
  function shen_user_lambda3994(Arg3993) {
  if (Arg3993.length < 2) return [shen_type_func, shen_user_lambda3994, 2, Arg3993];
  var Arg3993_0 = Arg3993[0], Arg3993_1 = Arg3993[1];
  return (function() {
  return shenjs_call_tail(js_tail_call_expr, [Arg3993_0, Arg3993_1]);})},
  2,
  [],
  "js-cond-case"];
shenjs_functions["shen_js-cond-case"] = js_cond_case;






js_emit_cond$asterisk$ = [shen_type_func,
  function shen_user_lambda3996(Arg3995) {
  if (Arg3995.length < 3) return [shen_type_func, shen_user_lambda3996, 3, Arg3995];
  var Arg3995_0 = Arg3995[0], Arg3995_1 = Arg3995[1], Arg3995_2 = Arg3995[2];
  return ((shenjs_empty$question$(Arg3995_0))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["cond failure: no default branch", []]);})
  : (((shenjs_is_type(Arg3995_0, shen_type_cons) && (shenjs_is_type(Arg3995_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg3995_0[1][1])) && (shenjs_is_type(Arg3995_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg3995_0[1][2][2]))))))
  ? (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg3995_0[1][2][1], Arg3995_1, Arg3995_2]);})
  : (((shenjs_is_type(Arg3995_0, shen_type_cons) && (shenjs_is_type(Arg3995_0[1], shen_type_cons) && (shenjs_is_type(Arg3995_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg3995_0[1][2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["((~A)~%  ? ~A~%  : ~A)", [shen_tuple, shenjs_call(js_cond_case, [Arg3995_0[1][1], Arg3995_2]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg3995_0[1][2][1], Arg3995_1, Arg3995_2]), [shen_tuple, shenjs_call(js_emit_cond$asterisk$, [Arg3995_0[2], Arg3995_1, Arg3995_2]), []]]]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-emit-cond*"]]);}))))},
  3,
  [],
  "js-emit-cond*"];
shenjs_functions["shen_js-emit-cond*"] = js_emit_cond$asterisk$;






js_emit_cond = [shen_type_func,
  function shen_user_lambda3998(Arg3997) {
  if (Arg3997.length < 3) return [shen_type_func, shen_user_lambda3998, 3, Arg3997];
  var Arg3997_0 = Arg3997[0], Arg3997_1 = Arg3997[1], Arg3997_2 = Arg3997[2];
  return (function() {
  return shenjs_call_tail(js_emit_cond$asterisk$, [Arg3997_0, Arg3997_1, Arg3997_2]);})},
  3,
  [],
  "js-emit-cond"];
shenjs_functions["shen_js-emit-cond"] = js_emit_cond;






js_emit_trap_error = [shen_type_func,
  function shen_user_lambda4000(Arg3999) {
  if (Arg3999.length < 4) return [shen_type_func, shen_user_lambda4000, 4, Arg3999];
  var Arg3999_0 = Arg3999[0], Arg3999_1 = Arg3999[1], Arg3999_2 = Arg3999[2], Arg3999_3 = Arg3999[3];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$(false, Arg3999_2)))
  ? ((R0 = shenjs_call(shen_intmake_string, ["function() {return ~A;}", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg3999_0, false, Arg3999_3]), []]])),
  (R1 = shenjs_call(js_js_from_kl_expr, [Arg3999_1, false, Arg3999_3])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_trap_error(~A, ~A)", [shen_tuple, R0, [shen_tuple, R1, []]]]);}))
  : ((shenjs_unwind_tail(shenjs_$eq$(true, Arg3999_2)))
  ? (function() {
  return shenjs_call_tail(js_tail_call_ret, [shenjs_call(js_emit_trap_error, [Arg3999_0, Arg3999_1, false, Arg3999_3])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-emit-trap-error"]]);})))},
  4,
  [],
  "js-emit-trap-error"];
shenjs_functions["shen_js-emit-trap-error"] = js_emit_trap_error;






js_predicate_op = [shen_type_func,
  function shen_user_lambda4002(Arg4001) {
  if (Arg4001.length < 4) return [shen_type_func, shen_user_lambda4002, 4, Arg4001];
  var Arg4001_0 = Arg4001[0], Arg4001_1 = Arg4001[1], Arg4001_2 = Arg4001[2], Arg4001_3 = Arg4001[3];
  return (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "number?"], Arg4001_0)) && (typeof(Arg4001_1) == 'number')))
  ? "true"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "string?"], Arg4001_0)) && (typeof(Arg4001_1) == 'string')))
  ? "true"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "boolean?"], Arg4001_0)) && shenjs_unwind_tail(shenjs_$eq$(true, Arg4001_1))))
  ? "true"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "boolean?"], Arg4001_0)) && shenjs_unwind_tail(shenjs_$eq$(false, Arg4001_1))))
  ? "true"
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "boolean?"], Arg4001_0)))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "boolean?"], [shen_type_cons, Arg4001_1, []], Arg4001_2, Arg4001_3]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "string?"], Arg4001_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(typeof(~A) == 'string')", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4001_1, false, Arg4001_3]), []]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "number?"], Arg4001_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(typeof(~A) == 'number')", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4001_1, false, Arg4001_3]), []]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol?"], Arg4001_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_is_type(~A, ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4001_1, false, Arg4001_3]), [shen_tuple, "shen_type_symbol", []]]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons?"], Arg4001_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_is_type(~A, ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4001_1, false, Arg4001_3]), [shen_tuple, "shen_type_cons", []]]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "tuple?"], Arg4001_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_is_type(~A, ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4001_1, false, Arg4001_3]), [shen_tuple, "shen_tuple", []]]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "vector?"], Arg4001_0)))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "vector?"], [shen_type_cons, Arg4001_1, []], Arg4001_2, Arg4001_3]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "empty?"], Arg4001_0)))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "empty?"], [shen_type_cons, Arg4001_1, []], Arg4001_2, Arg4001_3]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "absvector?"], Arg4001_0)))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "absvector?"], [shen_type_cons, Arg4001_1, []], Arg4001_2, Arg4001_3]);})
  : shen_fail_obj)))))))))))))},
  4,
  [],
  "js-predicate-op"];
shenjs_functions["shen_js-predicate-op"] = js_predicate_op;






js_math_op = [shen_type_func,
  function shen_user_lambda4004(Arg4003) {
  if (Arg4003.length < 4) return [shen_type_func, shen_user_lambda4004, 4, Arg4003];
  var Arg4003_0 = Arg4003[0], Arg4003_1 = Arg4003[1], Arg4003_2 = Arg4003[2], Arg4003_3 = Arg4003[3];
  return (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && (shenjs_is_type(Arg4003_1[2], shen_type_cons) && (shenjs_empty$question$(Arg4003_1[2][2]) && ((typeof(Arg4003_1[1]) == 'number') && (typeof(Arg4003_1[2][1]) == 'number')))))))
  ? (function() {
  return shenjs_str((Arg4003_1[1] + Arg4003_1[2][1]));})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && (shenjs_is_type(Arg4003_1[2], shen_type_cons) && (shenjs_empty$question$(Arg4003_1[2][2]) && ((typeof(Arg4003_1[1]) == 'number') && (typeof(Arg4003_1[2][1]) == 'number')))))))
  ? (function() {
  return shenjs_str((Arg4003_1[1] - Arg4003_1[2][1]));})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "*"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && (shenjs_is_type(Arg4003_1[2], shen_type_cons) && (shenjs_empty$question$(Arg4003_1[2][2]) && ((typeof(Arg4003_1[1]) == 'number') && (typeof(Arg4003_1[2][1]) == 'number')))))))
  ? (function() {
  return shenjs_str((Arg4003_1[1] * Arg4003_1[2][1]));})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && (shenjs_is_type(Arg4003_1[2], shen_type_cons) && (shenjs_empty$question$(Arg4003_1[2][2]) && ((typeof(Arg4003_1[1]) == 'number') && (typeof(Arg4003_1[2][1]) == 'number')))))))
  ? (function() {
  return shenjs_str((Arg4003_1[1] / Arg4003_1[2][1]));})
  : (((shenjs_is_type(Arg4003_1, shen_type_cons) && (shenjs_is_type(Arg4003_1[2], shen_type_cons) && (shenjs_empty$question$(Arg4003_1[2][2]) && shenjs_call(shen_element$question$, [Arg4003_0, [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, [shen_type_symbol, "/"], []]]]]])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A ~A ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4003_1[1], false, Arg4003_3]), [shen_tuple, Arg4003_0, [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4003_1[2][1], false, Arg4003_3]), []]]]]);})
  : shen_fail_obj)))))},
  4,
  [],
  "js-math-op"];
shenjs_functions["shen_js-math-op"] = js_math_op;






js_equality_op = [shen_type_func,
  function shen_user_lambda4006(Arg4005) {
  if (Arg4005.length < 3) return [shen_type_func, shen_user_lambda4006, 3, Arg4005];
  var Arg4005_0 = Arg4005[0], Arg4005_1 = Arg4005[1], Arg4005_2 = Arg4005[2];
  return (((shenjs_is_type(Arg4005_0, shen_type_cons) && (shenjs_is_type(Arg4005_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4005_0[2][2]) && ((typeof(Arg4005_0[1]) == 'number') && (typeof(Arg4005_0[2][1]) == 'number'))))))
  ? (function() {
  return shenjs_str(shenjs_unwind_tail(shenjs_$eq$(Arg4005_0[1], Arg4005_0[2][1])));})
  : (((shenjs_is_type(Arg4005_0, shen_type_cons) && (shenjs_is_type(Arg4005_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4005_0[2][2]) && ((typeof(Arg4005_0[1]) == 'string') && (typeof(Arg4005_0[2][1]) == 'string'))))))
  ? (function() {
  return shenjs_str(shenjs_unwind_tail(shenjs_$eq$(Arg4005_0[1], Arg4005_0[2][1])));})
  : (((shenjs_is_type(Arg4005_0, shen_type_cons) && (shenjs_is_type(Arg4005_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4005_0[2][2]) && (shenjs_boolean$question$(Arg4005_0[1]) && shenjs_boolean$question$(Arg4005_0[2][1]))))))
  ? (function() {
  return shenjs_str(shenjs_unwind_tail(shenjs_$eq$(Arg4005_0[1], Arg4005_0[2][1])));})
  : (((shenjs_is_type(Arg4005_0, shen_type_cons) && (shenjs_is_type(Arg4005_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4005_0[2][1]) && shenjs_empty$question$(Arg4005_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "empty?"], [shen_type_cons, Arg4005_0[1], []], Arg4005_1, Arg4005_2]);})
  : (((shenjs_is_type(Arg4005_0, shen_type_cons) && (shenjs_empty$question$(Arg4005_0[1]) && (shenjs_is_type(Arg4005_0[2], shen_type_cons) && shenjs_empty$question$(Arg4005_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "empty?"], Arg4005_0[2], Arg4005_1, Arg4005_2]);})
  : (((shenjs_is_type(Arg4005_0, shen_type_cons) && (shenjs_is_type(Arg4005_0[2], shen_type_cons) && shenjs_empty$question$(Arg4005_0[2][2]))))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "="], Arg4005_0, Arg4005_1, Arg4005_2]);})
  : shen_fail_obj))))))},
  3,
  [],
  "js-equality-op"];
shenjs_functions["shen_js-equality-op"] = js_equality_op;






js_order_op = [shen_type_func,
  function shen_user_lambda4008(Arg4007) {
  if (Arg4007.length < 4) return [shen_type_func, shen_user_lambda4008, 4, Arg4007];
  var Arg4007_0 = Arg4007[0], Arg4007_1 = Arg4007[1], Arg4007_2 = Arg4007[2], Arg4007_3 = Arg4007[3];
  var R0, R1;
  return (((shenjs_is_type(Arg4007_1, shen_type_cons) && (shenjs_is_type(Arg4007_1[2], shen_type_cons) && (shenjs_empty$question$(Arg4007_1[2][2]) && shenjs_call(shen_element$question$, [Arg4007_0, [shen_type_cons, [shen_type_symbol, ">"], [shen_type_cons, [shen_type_symbol, "<"], [shen_type_cons, [shen_type_symbol, ">="], [shen_type_cons, [shen_type_symbol, "<="], []]]]]])))))
  ? ((R0 = shenjs_call(js_js_from_kl_expr, [Arg4007_1[1], false, Arg4007_3])),
  (R1 = shenjs_call(js_js_from_kl_expr, [Arg4007_1[2][1], false, Arg4007_3])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A ~A ~A)", [shen_tuple, R0, [shen_tuple, Arg4007_0, [shen_tuple, R1, []]]]]);}))
  : shen_fail_obj)},
  4,
  [],
  "js-order-op"];
shenjs_functions["shen_js-order-op"] = js_order_op;






js_logic_op = [shen_type_func,
  function shen_user_lambda4010(Arg4009) {
  if (Arg4009.length < 4) return [shen_type_func, shen_user_lambda4010, 4, Arg4009];
  var Arg4009_0 = Arg4009[0], Arg4009_1 = Arg4009[1], Arg4009_2 = Arg4009[2], Arg4009_3 = Arg4009[3];
  return (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "not"], Arg4009_0)) && (shenjs_is_type(Arg4009_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(false, Arg4009_1[1])) && shenjs_empty$question$(Arg4009_1[2])))))
  ? "true"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "not"], Arg4009_0)) && (shenjs_is_type(Arg4009_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg4009_1[1])) && shenjs_empty$question$(Arg4009_1[2])))))
  ? "false"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "not"], Arg4009_0)) && (shenjs_is_type(Arg4009_1, shen_type_cons) && shenjs_empty$question$(Arg4009_1[2]))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(!~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4009_1[1], false, Arg4009_3]), []]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "and"], Arg4009_0)) && (shenjs_is_type(Arg4009_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(false, Arg4009_1[1])) && (shenjs_is_type(Arg4009_1[2], shen_type_cons) && shenjs_empty$question$(Arg4009_1[2][2]))))))
  ? "false"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "or"], Arg4009_0)) && (shenjs_is_type(Arg4009_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg4009_1[1])) && (shenjs_is_type(Arg4009_1[2], shen_type_cons) && shenjs_empty$question$(Arg4009_1[2][2]))))))
  ? "true"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "and"], Arg4009_0)) && (shenjs_is_type(Arg4009_1, shen_type_cons) && (shenjs_is_type(Arg4009_1[2], shen_type_cons) && shenjs_empty$question$(Arg4009_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A && ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4009_1[1], false, Arg4009_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4009_1[2][1], false, Arg4009_3]), []]]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "or"], Arg4009_0)) && (shenjs_is_type(Arg4009_1, shen_type_cons) && (shenjs_is_type(Arg4009_1[2], shen_type_cons) && shenjs_empty$question$(Arg4009_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A || ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4009_1[1], false, Arg4009_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4009_1[2][1], false, Arg4009_3]), []]]]);})
  : shen_fail_obj)))))))},
  4,
  [],
  "js-logic-op"];
shenjs_functions["shen_js-logic-op"] = js_logic_op;






js_emit_set$asterisk$ = [shen_type_func,
  function shen_user_lambda4012(Arg4011) {
  if (Arg4011.length < 4) return [shen_type_func, shen_user_lambda4012, 4, Arg4011];
  var Arg4011_0 = Arg4011[0], Arg4011_1 = Arg4011[1], Arg4011_2 = Arg4011[2], Arg4011_3 = Arg4011[3];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg4011_3)))
  ? ((R0 = shenjs_call(js_esc_obj, [("shen_" + shenjs_str(Arg4011_0))])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["(shenjs_globals[~A] = ~A)", [shen_tuple, R0, [shen_tuple, Arg4011_1, []]]]);}))
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg4011_3)))
  ? ((R0 = shenjs_call(js_js_from_kl_expr, [Arg4011_0, false, Arg4011_2])),
  (R1 = shenjs_call(js_esc_obj, ["shen_"])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["(shenjs_globals[~A + ~A[1]] = ~A)", [shen_tuple, R1, [shen_tuple, R0, [shen_tuple, Arg4011_1, []]]]]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-emit-set*"]]);})))},
  4,
  [],
  "js-emit-set*"];
shenjs_functions["shen_js-emit-set*"] = js_emit_set$asterisk$;






js_emit_set = [shen_type_func,
  function shen_user_lambda4014(Arg4013) {
  if (Arg4013.length < 3) return [shen_type_func, shen_user_lambda4014, 3, Arg4013];
  var Arg4013_0 = Arg4013[0], Arg4013_1 = Arg4013[1], Arg4013_2 = Arg4013[2];
  return (function() {
  return shenjs_call_tail(js_emit_set$asterisk$, [Arg4013_0, shenjs_call(js_js_from_kl_expr, [Arg4013_1, false, Arg4013_2]), Arg4013_2, shenjs_is_type(Arg4013_0, shen_type_symbol)]);})},
  3,
  [],
  "js-emit-set"];
shenjs_functions["shen_js-emit-set"] = js_emit_set;






js_emit_value = [shen_type_func,
  function shen_user_lambda4016(Arg4015) {
  if (Arg4015.length < 3) return [shen_type_func, shen_user_lambda4016, 3, Arg4015];
  var Arg4015_0 = Arg4015[0], Arg4015_1 = Arg4015[1], Arg4015_2 = Arg4015[2];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg4015_2)))
  ? ((R0 = shenjs_call(js_esc_obj, [("shen_" + shenjs_str(Arg4015_0))])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["(shenjs_globals[~A])", [shen_tuple, R0, []]]);}))
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg4015_2)))
  ? ((R0 = shenjs_call(js_js_from_kl_expr, [Arg4015_0, false, Arg4015_1])),
  (R1 = shenjs_call(js_esc_obj, ["shen_"])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["(shenjs_globals[~A + ~A[1]])", [shen_tuple, R1, [shen_tuple, R0, []]]]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-emit-value"]]);})))},
  3,
  [],
  "js-emit-value"];
shenjs_functions["shen_js-emit-value"] = js_emit_value;






js_basic_op = [shen_type_func,
  function shen_user_lambda4018(Arg4017) {
  if (Arg4017.length < 4) return [shen_type_func, shen_user_lambda4018, 4, Arg4017];
  var Arg4017_0 = Arg4017[0], Arg4017_1 = Arg4017[1], Arg4017_2 = Arg4017[2], Arg4017_3 = Arg4017[3];
  var R0, R1;
  return (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "intern"], Arg4017_0)) && (shenjs_is_type(Arg4017_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$("true", Arg4017_1[1])) && shenjs_empty$question$(Arg4017_1[2])))))
  ? "true"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "intern"], Arg4017_0)) && (shenjs_is_type(Arg4017_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$("false", Arg4017_1[1])) && shenjs_empty$question$(Arg4017_1[2])))))
  ? "false"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "intern"], Arg4017_0)) && (shenjs_is_type(Arg4017_1, shen_type_cons) && (shenjs_empty$question$(Arg4017_1[2]) && (typeof(Arg4017_1[1]) == 'string')))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["[shen_type_symbol, ~A]", [shen_tuple, shenjs_call(js_esc_obj, [Arg4017_1[1]]), []]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "intern"], Arg4017_0)) && (shenjs_is_type(Arg4017_1, shen_type_cons) && shenjs_empty$question$(Arg4017_1[2]))))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "intern"], Arg4017_1, Arg4017_2, Arg4017_3]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg4017_0)) && (shenjs_is_type(Arg4017_1, shen_type_cons) && (shenjs_is_type(Arg4017_1[2], shen_type_cons) && shenjs_empty$question$(Arg4017_1[2][2])))))
  ? ((R0 = shenjs_call(js_js_from_kl_expr, [Arg4017_1[1], false, Arg4017_3])),
  (R1 = shenjs_call(js_js_from_kl_expr, [Arg4017_1[2][1], false, Arg4017_3])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["[shen_type_cons, ~A, ~A]", [shen_tuple, R0, [shen_tuple, R1, []]]]);}))
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@p"], Arg4017_0)) && (shenjs_is_type(Arg4017_1, shen_type_cons) && (shenjs_is_type(Arg4017_1[2], shen_type_cons) && shenjs_empty$question$(Arg4017_1[2][2])))))
  ? ((R0 = shenjs_call(js_js_from_kl_expr, [Arg4017_1[1], false, Arg4017_3])),
  (R1 = shenjs_call(js_js_from_kl_expr, [Arg4017_1[2][1], false, Arg4017_3])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["[shen_tuple, ~A, ~A]", [shen_tuple, R0, [shen_tuple, R1, []]]]);}))
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "set"], Arg4017_0)) && (shenjs_is_type(Arg4017_1, shen_type_cons) && (shenjs_is_type(Arg4017_1[2], shen_type_cons) && shenjs_empty$question$(Arg4017_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(js_emit_set, [Arg4017_1[1], Arg4017_1[2][1], Arg4017_3]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "value"], Arg4017_0)) && (shenjs_is_type(Arg4017_1, shen_type_cons) && shenjs_empty$question$(Arg4017_1[2]))))
  ? (function() {
  return shenjs_call_tail(js_emit_value, [Arg4017_1[1], Arg4017_3, shenjs_is_type(Arg4017_1[1], shen_type_symbol)]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "thaw"], Arg4017_0)) && (shenjs_is_type(Arg4017_1, shen_type_cons) && shenjs_empty$question$(Arg4017_1[2]))))
  ? (function() {
  return shenjs_call_tail(js_emit_thaw, [Arg4017_1[1], Arg4017_2, Arg4017_3]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "function"], Arg4017_0)) && (shenjs_is_type(Arg4017_1, shen_type_cons) && shenjs_empty$question$(Arg4017_1[2]))))
  ? (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4017_1[1], true, Arg4017_3]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "hd"], Arg4017_0)) && (shenjs_is_type(Arg4017_1, shen_type_cons) && shenjs_empty$question$(Arg4017_1[2]))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A[1]", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4017_1[1], false, Arg4017_3]), []]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "tl"], Arg4017_0)) && (shenjs_is_type(Arg4017_1, shen_type_cons) && shenjs_empty$question$(Arg4017_1[2]))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A[2]", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4017_1[1], false, Arg4017_3]), []]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cn"], Arg4017_0)) && (shenjs_is_type(Arg4017_1, shen_type_cons) && (shenjs_is_type(Arg4017_1[2], shen_type_cons) && shenjs_empty$question$(Arg4017_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A + ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4017_1[1], false, Arg4017_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4017_1[2][1], false, Arg4017_3]), []]]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "pos"], Arg4017_0)) && (shenjs_is_type(Arg4017_1, shen_type_cons) && (shenjs_is_type(Arg4017_1[2], shen_type_cons) && shenjs_empty$question$(Arg4017_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A[~A]", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4017_1[1], false, Arg4017_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4017_1[2][1], false, Arg4017_3]), []]]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "address->"], Arg4017_0)) && (shenjs_is_type(Arg4017_1, shen_type_cons) && (shenjs_is_type(Arg4017_1[2], shen_type_cons) && (shenjs_is_type(Arg4017_1[2][2], shen_type_cons) && shenjs_empty$question$(Arg4017_1[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_absvector_set(~A, ~A, ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4017_1[1], false, Arg4017_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4017_1[2][1], false, Arg4017_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4017_1[2][2][1], false, Arg4017_3]), []]]]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "<-address"], Arg4017_0)) && (shenjs_is_type(Arg4017_1, shen_type_cons) && (shenjs_is_type(Arg4017_1[2], shen_type_cons) && shenjs_empty$question$(Arg4017_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_absvector_ref(~A, ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4017_1[1], false, Arg4017_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4017_1[2][1], false, Arg4017_3]), []]]]);})
  : shen_fail_obj))))))))))))))))},
  4,
  [],
  "js-basic-op"];
shenjs_functions["shen_js-basic-op"] = js_basic_op;






js_int_funcall$asterisk$ = [shen_type_func,
  function shen_user_lambda4020(Arg4019) {
  if (Arg4019.length < 5) return [shen_type_func, shen_user_lambda4020, 5, Arg4019];
  var Arg4019_0 = Arg4019[0], Arg4019_1 = Arg4019[1], Arg4019_2 = Arg4019[2], Arg4019_3 = Arg4019[3], Arg4019_4 = Arg4019[4];
  var R0;
  return (((shenjs_unwind_tail(shenjs_$eq$(true, Arg4019_2)) && shenjs_unwind_tail(shenjs_$eq$(true, Arg4019_3))))
  ? (function() {
  return shenjs_call_tail(js_int_funcall$asterisk$, [Arg4019_0, Arg4019_1, false, false, Arg4019_4]);})
  : (((shenjs_unwind_tail(shenjs_$eq$(true, Arg4019_2)) && shenjs_unwind_tail(shenjs_$eq$(false, Arg4019_3))))
  ? ((R0 = shenjs_call(js_int_funcall$asterisk$, [Arg4019_0, Arg4019_1, false, false, Arg4019_4])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_unwind_tail(~A)", [shen_tuple, R0, []]]);}))
  : (((shenjs_unwind_tail(shenjs_$eq$(false, Arg4019_2)) && shenjs_unwind_tail(shenjs_$eq$(false, Arg4019_3))))
  ? ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4022(Arg4021) {
  if (Arg4021.length < 2) return [shen_type_func, shen_user_lambda4022, 2, Arg4021];
  var Arg4021_0 = Arg4021[0], Arg4021_1 = Arg4021[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4021_1, false, Arg4021_0]);})},
  2,
  [Arg4019_4]], Arg4019_1])),
  (R0 = shenjs_call(js_str_join, [R0, ", "])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A(~A)", [shen_tuple, shenjs_call(js_intfunc_name, [Arg4019_0]), [shen_tuple, R0, []]]]);}))
  : (((shenjs_unwind_tail(shenjs_$eq$(false, Arg4019_2)) && shenjs_unwind_tail(shenjs_$eq$(true, Arg4019_3))))
  ? (function() {
  return shenjs_call_tail(js_tail_call_ret, [shenjs_call(js_int_funcall$asterisk$, [Arg4019_0, Arg4019_1, false, false, Arg4019_4])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-int-funcall*"]]);})))))},
  5,
  [],
  "js-int-funcall*"];
shenjs_functions["shen_js-int-funcall*"] = js_int_funcall$asterisk$;






js_int_funcall = [shen_type_func,
  function shen_user_lambda4024(Arg4023) {
  if (Arg4023.length < 4) return [shen_type_func, shen_user_lambda4024, 4, Arg4023];
  var Arg4023_0 = Arg4023[0], Arg4023_1 = Arg4023[1], Arg4023_2 = Arg4023[2], Arg4023_3 = Arg4023[3];
  var R0;
  return ((R0 = shenjs_call(shen_element$question$, [Arg4023_0, (shenjs_globals["shen_js-tail-internals"])])),
  (function() {
  return shenjs_call_tail(js_int_funcall$asterisk$, [Arg4023_0, Arg4023_1, R0, Arg4023_2, Arg4023_3]);}))},
  4,
  [],
  "js-int-funcall"];
shenjs_functions["shen_js-int-funcall"] = js_int_funcall;






js_int_curry = [shen_type_func,
  function shen_user_lambda4026(Arg4025) {
  if (Arg4025.length < 4) return [shen_type_func, shen_user_lambda4026, 4, Arg4025];
  var Arg4025_0 = Arg4025[0], Arg4025_1 = Arg4025[1], Arg4025_2 = Arg4025[2], Arg4025_3 = Arg4025[3];
  var R0, R1;
  return ((R0 = shenjs_call(shen_intmake_string, ["~A[1]", [shen_tuple, shenjs_call(js_func_name, [Arg4025_0]), []]])),
  (R1 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4028(Arg4027) {
  if (Arg4027.length < 2) return [shen_type_func, shen_user_lambda4028, 2, Arg4027];
  var Arg4027_0 = Arg4027[0], Arg4027_1 = Arg4027[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4027_1, false, Arg4027_0]);})},
  2,
  [Arg4025_3]], Arg4025_2])),
  (function() {
  return shenjs_call_tail(js_emit_func_obj, [shenjs_call(shen_length, [Arg4025_1]), R0, R1, []]);}))},
  4,
  [],
  "js-int-curry"];
shenjs_functions["shen_js-int-curry"] = js_int_curry;






js_internal_op$asterisk$ = [shen_type_func,
  function shen_user_lambda4030(Arg4029) {
  if (Arg4029.length < 5) return [shen_type_func, shen_user_lambda4030, 5, Arg4029];
  var Arg4029_0 = Arg4029[0], Arg4029_1 = Arg4029[1], Arg4029_2 = Arg4029[2], Arg4029_3 = Arg4029[3], Arg4029_4 = Arg4029[4];
  return ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_length, [Arg4029_1]), shenjs_call(shen_length, [Arg4029_2]))))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [Arg4029_0, Arg4029_2, Arg4029_3, Arg4029_4]);})
  : (function() {
  return shenjs_call_tail(js_int_curry, [Arg4029_0, Arg4029_1, Arg4029_2, Arg4029_4]);}))},
  5,
  [],
  "js-internal-op*"];
shenjs_functions["shen_js-internal-op*"] = js_internal_op$asterisk$;






js_internal_op = [shen_type_func,
  function shen_user_lambda4032(Arg4031) {
  if (Arg4031.length < 4) return [shen_type_func, shen_user_lambda4032, 4, Arg4031];
  var Arg4031_0 = Arg4031[0], Arg4031_1 = Arg4031[1], Arg4031_2 = Arg4031[2], Arg4031_3 = Arg4031[3];
  var R0;
  return ((R0 = shenjs_call(js_int_func_args, [Arg4031_0])),
  shenjs_call(js_intfunc_name, [Arg4031_0]),
  ((shenjs_empty$question$(R0))
  ? shen_fail_obj
  : (function() {
  return shenjs_call_tail(js_internal_op$asterisk$, [Arg4031_0, R0, Arg4031_1, Arg4031_2, Arg4031_3]);})))},
  4,
  [],
  "js-internal-op"];
shenjs_functions["shen_js-internal-op"] = js_internal_op;






js_emit_do = [shen_type_func,
  function shen_user_lambda4034(Arg4033) {
  if (Arg4033.length < 4) return [shen_type_func, shen_user_lambda4034, 4, Arg4033];
  var Arg4033_0 = Arg4033[0], Arg4033_1 = Arg4033[1], Arg4033_2 = Arg4033[2], Arg4033_3 = Arg4033[3];
  var R0, R1;
  return (((shenjs_is_type(Arg4033_0, shen_type_cons) && shenjs_empty$question$(Arg4033_0[2])))
  ? ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4036(Arg4035) {
  if (Arg4035.length < 2) return [shen_type_func, shen_user_lambda4036, 2, Arg4035];
  var Arg4035_0 = Arg4035[0], Arg4035_1 = Arg4035[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4035_1, false, Arg4035_0]);})},
  2,
  [Arg4033_2]], shenjs_call(shen_reverse, [Arg4033_3])])),
  (R1 = shenjs_call(shen_intmake_string, [",~%  ", []])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A,~%  ~A)", [shen_tuple, shenjs_call(js_str_join, [R0, R1]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4033_0[1], Arg4033_1, Arg4033_2]), []]]]);}))
  : ((shenjs_is_type(Arg4033_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(js_emit_do, [Arg4033_0[2], Arg4033_1, Arg4033_2, [shen_type_cons, Arg4033_0[1], Arg4033_3]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-emit-do"]]);})))},
  4,
  [],
  "js-emit-do"];
shenjs_functions["shen_js-emit-do"] = js_emit_do;






js_std_op = [shen_type_func,
  function shen_user_lambda4038(Arg4037) {
  if (Arg4037.length < 4) return [shen_type_func, shen_user_lambda4038, 4, Arg4037];
  var Arg4037_0 = Arg4037[0], Arg4037_1 = Arg4037[1], Arg4037_2 = Arg4037[2], Arg4037_3 = Arg4037[3];
  var R0, R1;
  return ((R0 = (new Shenjs_freeze([Arg4037_0, Arg4037_1, Arg4037_2, Arg4037_3], function(Arg4039) {
  var Arg4039_0 = Arg4039[0], Arg4039_1 = Arg4039[1], Arg4039_2 = Arg4039[2], Arg4039_3 = Arg4039[3];
  return (function() {
  return ((R4 = shenjs_call(js_math_op, [Arg4039_0, Arg4039_1, Arg4039_2, Arg4039_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R4, shen_fail_obj)))
  ? ((R4 = (new Shenjs_freeze([Arg4039_0, Arg4039_1, Arg4039_2, Arg4039_3], function(Arg4041) {
  var Arg4041_0 = Arg4041[0], Arg4041_1 = Arg4041[1], Arg4041_2 = Arg4041[2], Arg4041_3 = Arg4041[3];
  return (function() {
  return ((R4 = shenjs_call(js_logic_op, [Arg4041_0, Arg4041_1, Arg4041_2, Arg4041_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R4, shen_fail_obj)))
  ? ((R4 = shenjs_call(js_order_op, [Arg4041_0, Arg4041_1, Arg4041_2, Arg4041_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R4, shen_fail_obj)))
  ? ((R4 = shenjs_call(js_basic_op, [Arg4041_0, Arg4041_1, Arg4041_2, Arg4041_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R4, shen_fail_obj)))
  ? ((R4 = (new Shenjs_freeze([Arg4041_0, Arg4041_1, Arg4041_2, Arg4041_3], function(Arg4043) {
  var Arg4043_0 = Arg4043[0], Arg4043_1 = Arg4043[1], Arg4043_2 = Arg4043[2], Arg4043_3 = Arg4043[3];
  return (function() {
  return (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "trap-error"], Arg4043_0)) && (shenjs_is_type(Arg4043_1, shen_type_cons) && (shenjs_is_type(Arg4043_1[2], shen_type_cons) && shenjs_empty$question$(Arg4043_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(js_emit_trap_error, [Arg4043_1[1], Arg4043_1[2][1], Arg4043_2, Arg4043_3]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "do"], Arg4043_0)))
  ? (function() {
  return shenjs_call_tail(js_emit_do, [Arg4043_1, Arg4043_2, Arg4043_3, []]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fail"], Arg4043_0)) && shenjs_empty$question$(Arg4043_1)))
  ? "shen_fail_obj"
  : shen_fail_obj)));})}))),
  ((shenjs_is_type(Arg4041_0, shen_type_symbol))
  ? ((R3 = shenjs_call(js_internal_op, [Arg4041_0, Arg4041_1, Arg4041_2, Arg4041_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R3, shen_fail_obj)))
  ? shenjs_thaw(R4)
  : R3))
  : shenjs_thaw(R4)))
  : R4))
  : R4))
  : R4));})}))),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "="], Arg4039_0)))
  ? ((R3 = shenjs_call(js_equality_op, [Arg4039_1, Arg4039_2, Arg4039_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R3, shen_fail_obj)))
  ? shenjs_thaw(R4)
  : R3))
  : shenjs_thaw(R4)))
  : R4));})}))),
  (((shenjs_is_type(Arg4037_1, shen_type_cons) && shenjs_empty$question$(Arg4037_1[2])))
  ? ((R1 = shenjs_call(js_predicate_op, [Arg4037_0, Arg4037_1[1], Arg4037_2, Arg4037_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, shen_fail_obj)))
  ? shenjs_thaw(R0)
  : R1))
  : shenjs_thaw(R0)))},
  4,
  [],
  "js-std-op"];
shenjs_functions["shen_js-std-op"] = js_std_op;






js_mk_regs_aux = [shen_type_func,
  function shen_user_lambda4046(Arg4045) {
  if (Arg4045.length < 5) return [shen_type_func, shen_user_lambda4046, 5, Arg4045];
  var Arg4045_0 = Arg4045[0], Arg4045_1 = Arg4045[1], Arg4045_2 = Arg4045[2], Arg4045_3 = Arg4045[3], Arg4045_4 = Arg4045[4];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4045_1, Arg4045_0)))
  ? Arg4045_4
  : ((R0 = shenjs_call(shen_intmake_string, ["~A~A~A~A", [shen_tuple, Arg4045_4, [shen_tuple, Arg4045_3, [shen_tuple, shenjs_call(js_context_varname, [Arg4045_2]), [shen_tuple, Arg4045_0, []]]]]])),
  (function() {
  return shenjs_call_tail(js_mk_regs_aux, [(Arg4045_0 + 1), Arg4045_1, Arg4045_2, ", ", R0]);})))},
  5,
  [],
  "js-mk-regs-aux"];
shenjs_functions["shen_js-mk-regs-aux"] = js_mk_regs_aux;






js_mk_regs = [shen_type_func,
  function shen_user_lambda4048(Arg4047) {
  if (Arg4047.length < 1) return [shen_type_func, shen_user_lambda4048, 1, Arg4047];
  var Arg4047_0 = Arg4047[0];
  return (function() {
  return shenjs_call_tail(js_mk_regs_aux, [0, shenjs_call(js_context_nregs, [Arg4047_0]), Arg4047_0, "var ", ""]);})},
  1,
  [],
  "js-mk-regs"];
shenjs_functions["shen_js-mk-regs"] = js_mk_regs;






js_mk_regs_str = [shen_type_func,
  function shen_user_lambda4050(Arg4049) {
  if (Arg4049.length < 1) return [shen_type_func, shen_user_lambda4050, 1, Arg4049];
  var Arg4049_0 = Arg4049[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(js_context_nregs, [Arg4049_0]), 0)))
  ? ""
  : (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A;~%  ", [shen_tuple, shenjs_call(js_mk_regs, [Arg4049_0]), []]]);}))},
  1,
  [],
  "js-mk-regs-str"];
shenjs_functions["shen_js-mk-regs-str"] = js_mk_regs_str;






js_mk_args_str_aux = [shen_type_func,
  function shen_user_lambda4052(Arg4051) {
  if (Arg4051.length < 5) return [shen_type_func, shen_user_lambda4052, 5, Arg4051];
  var Arg4051_0 = Arg4051[0], Arg4051_1 = Arg4051[1], Arg4051_2 = Arg4051[2], Arg4051_3 = Arg4051[3], Arg4051_4 = Arg4051[4];
  var R0, R1, R2;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4051_1, Arg4051_0)))
  ? Arg4051_4
  : ((R0 = "~A~A~A = ~A[~A]"),
  (R1 = shenjs_call(js_context_argname, [Arg4051_2])),
  (R2 = shenjs_call(js_arg_name, [Arg4051_1, Arg4051_2])),
  (R2 = shenjs_call(shen_intmake_string, [R0, [shen_tuple, Arg4051_4, [shen_tuple, Arg4051_3, [shen_tuple, R2, [shen_tuple, R1, [shen_tuple, Arg4051_1, []]]]]]])),
  (function() {
  return shenjs_call_tail(js_mk_args_str_aux, [Arg4051_0, (Arg4051_1 + 1), Arg4051_2, ", ", R2]);})))},
  5,
  [],
  "js-mk-args-str-aux"];
shenjs_functions["shen_js-mk-args-str-aux"] = js_mk_args_str_aux;






js_mk_args_str = [shen_type_func,
  function shen_user_lambda4054(Arg4053) {
  if (Arg4053.length < 2) return [shen_type_func, shen_user_lambda4054, 2, Arg4053];
  var Arg4053_0 = Arg4053[0], Arg4053_1 = Arg4053[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg4053_0)))
  ? ""
  : (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A;~%  ", [shen_tuple, shenjs_call(js_mk_args_str_aux, [Arg4053_0, 0, Arg4053_1, "var ", ""]), []]]);}))},
  2,
  [],
  "js-mk-args-str"];
shenjs_functions["shen_js-mk-args-str"] = js_mk_args_str;






js_emit_func_obj = [shen_type_func,
  function shen_user_lambda4056(Arg4055) {
  if (Arg4055.length < 4) return [shen_type_func, shen_user_lambda4056, 4, Arg4055];
  var Arg4055_0 = Arg4055[0], Arg4055_1 = Arg4055[1], Arg4055_2 = Arg4055[2], Arg4055_3 = Arg4055[3];
  var R0, R1, R2, R3;
  return ((R0 = (((shenjs_unwind_tail(shenjs_$eq$(Arg4055_3, "")) || shenjs_empty$question$(Arg4055_3)))
  ? ""
  : shenjs_call(shen_intmake_string, [",~%  ~A", [shen_tuple, Arg4055_3, []]]))),
  (R1 = "shen_type_func"),
  (R2 = shenjs_call(js_str_join, [Arg4055_2, ", "])),
  (R3 = "[~A,~%  ~A,~%  ~A,~%  [~A]~A]"),
  (function() {
  return shenjs_call_tail(shen_intmake_string, [R3, [shen_tuple, R1, [shen_tuple, Arg4055_1, [shen_tuple, Arg4055_0, [shen_tuple, R2, [shen_tuple, R0, []]]]]]]);}))},
  4,
  [],
  "js-emit-func-obj"];
shenjs_functions["shen_js-emit-func-obj"] = js_emit_func_obj;






js_emit_func_closure = [shen_type_func,
  function shen_user_lambda4058(Arg4057) {
  if (Arg4057.length < 3) return [shen_type_func, shen_user_lambda4058, 3, Arg4057];
  var Arg4057_0 = Arg4057[0], Arg4057_1 = Arg4057[1], Arg4057_2 = Arg4057[2];
  var R0, R1;
  return ((R0 = "[~A, ~A, ~A, ~A]"),
  (R1 = "shen_type_func"),
  (function() {
  return shenjs_call_tail(shen_intmake_string, [R0, [shen_tuple, R1, [shen_tuple, Arg4057_1, [shen_tuple, Arg4057_0, [shen_tuple, Arg4057_2, []]]]]]);}))},
  3,
  [],
  "js-emit-func-closure"];
shenjs_functions["shen_js-emit-func-closure"] = js_emit_func_closure;






js_emit_func_body = [shen_type_func,
  function shen_user_lambda4060(Arg4059) {
  if (Arg4059.length < 5) return [shen_type_func, shen_user_lambda4060, 5, Arg4059];
  var Arg4059_0 = Arg4059[0], Arg4059_1 = Arg4059[1], Arg4059_2 = Arg4059[2], Arg4059_3 = Arg4059[3], Arg4059_4 = Arg4059[4];
  var R0, R1, R2, R3, R4, R5, R6;
  return ((R0 = shenjs_call(js_func_name, [Arg4059_1])),
  ((shenjs_empty$question$(Arg4059_0))
  ? []
  : shenjs_call(js_esc_obj, [shenjs_str(Arg4059_0)])),
  (R1 = shenjs_call(js_context_argname, [Arg4059_4])),
  (R2 = shenjs_call(js_emit_func_closure, [Arg4059_2, R0, R1])),
  (R2 = shenjs_call(shen_intmake_string, ["if (~A.length < ~A) return ~A", [shen_tuple, shenjs_call(js_context_argname, [Arg4059_4]), [shen_tuple, Arg4059_2, [shen_tuple, R2, []]]]])),
  (R3 = "function ~A(~A) {~%  ~A;~%  ~A~Areturn ~A}"),
  (R4 = shenjs_call(js_js_from_kl_expr, [Arg4059_3, true, Arg4059_4])),
  (R5 = shenjs_call(js_mk_regs_str, [Arg4059_4])),
  (R6 = shenjs_call(js_mk_args_str, [Arg4059_2, Arg4059_4])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, [R3, [shen_tuple, R0, [shen_tuple, R1, [shen_tuple, R2, [shen_tuple, R6, [shen_tuple, R5, [shen_tuple, R4, []]]]]]]]);}))},
  5,
  [],
  "js-emit-func-body"];
shenjs_functions["shen_js-emit-func-body"] = js_emit_func_body;






js_emit_mk_func = [shen_type_func,
  function shen_user_lambda4062(Arg4061) {
  if (Arg4061.length < 4) return [shen_type_func, shen_user_lambda4062, 4, Arg4061];
  var Arg4061_0 = Arg4061[0], Arg4061_1 = Arg4061[1], Arg4061_2 = Arg4061[2], Arg4061_3 = Arg4061[3];
  var R0, R1, R2, R3, R4, R5;
  return ((R0 = shenjs_call(js_esc_obj, [shenjs_str(Arg4061_0)])),
  (R1 = shenjs_call(js_esc_obj, [("shen_" + shenjs_str(Arg4061_0))])),
  (R2 = shenjs_call(js_func_name, [Arg4061_0])),
  (R3 = shenjs_call(shen_length, [Arg4061_1])),
  (R4 = shenjs_call(shen_gensym, [[shen_type_symbol, "shen-user-lambda"]])),
  (R4 = shenjs_call(js_emit_func_body, [R2, R4, R3, Arg4061_2, Arg4061_3])),
  (R5 = "~A = ~A;~%shenjs_functions[~A] = ~A;~%"),
  (R4 = shenjs_call(js_emit_func_obj, [R3, R4, [], R0])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, [R5, [shen_tuple, R2, [shen_tuple, R4, [shen_tuple, R1, [shen_tuple, R2, []]]]]]);}))},
  4,
  [],
  "js-emit-mk-func"];
shenjs_functions["shen_js-emit-mk-func"] = js_emit_mk_func;






js_emit_mk_closure = [shen_type_func,
  function shen_user_lambda4064(Arg4063) {
  if (Arg4063.length < 4) return [shen_type_func, shen_user_lambda4064, 4, Arg4063];
  var Arg4063_0 = Arg4063[0], Arg4063_1 = Arg4063[1], Arg4063_2 = Arg4063[2], Arg4063_3 = Arg4063[3];
  var R0, R1, R2;
  return ((R0 = shenjs_call(js_context_toplevel, [Arg4063_3])),
  (R1 = [shen_type_symbol, "Arg"]),
  (R2 = (shenjs_call(shen_length, [Arg4063_1]) + shenjs_call(shen_length, [Arg4063_0]))),
  (R1 = shenjs_call(js_mk_context, [0, R0, shenjs_call(shen_gensym, [R1]), [shen_type_symbol, "R"]])),
  (R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "shen-user-lambda"]])),
  (R0 = shenjs_call(js_emit_func_body, [[], R0, R2, Arg4063_2, R1])),
  shenjs_call(js_context_toplevel_$gt$, [Arg4063_3, shenjs_call(js_context_toplevel, [R1])]),
  (R1 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4066(Arg4065) {
  if (Arg4065.length < 2) return [shen_type_func, shen_user_lambda4066, 2, Arg4065];
  var Arg4065_0 = Arg4065[0], Arg4065_1 = Arg4065[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4065_1, false, Arg4065_0]);})},
  2,
  [Arg4063_3]], Arg4063_1])),
  (function() {
  return shenjs_call_tail(js_emit_func_obj, [R2, R0, R1, []]);}))},
  4,
  [],
  "js-emit-mk-closure"];
shenjs_functions["shen_js-emit-mk-closure"] = js_emit_mk_closure;






js_emit_freeze = [shen_type_func,
  function shen_user_lambda4068(Arg4067) {
  if (Arg4067.length < 3) return [shen_type_func, shen_user_lambda4068, 3, Arg4067];
  var Arg4067_0 = Arg4067[0], Arg4067_1 = Arg4067[1], Arg4067_2 = Arg4067[2];
  var R0, R1, R2, R3, R4;
  return ((R0 = shenjs_call(js_context_toplevel, [Arg4067_2])),
  (R1 = [shen_type_symbol, "Arg"]),
  (R1 = shenjs_call(js_mk_context, [0, R0, shenjs_call(shen_gensym, [R1]), [shen_type_symbol, "R"]])),
  shenjs_call(shen_gensym, [[shen_type_symbol, "shen-user-lambda"]]),
  shenjs_call(js_context_toplevel_$gt$, [Arg4067_2, shenjs_call(js_context_toplevel, [R1])]),
  (R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4070(Arg4069) {
  if (Arg4069.length < 2) return [shen_type_func, shen_user_lambda4070, 2, Arg4069];
  var Arg4069_0 = Arg4069[0], Arg4069_1 = Arg4069[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4069_1, false, Arg4069_0]);})},
  2,
  [Arg4067_2]], Arg4067_0])),
  (R2 = shenjs_call(js_str_join, [R0, ", "])),
  (R3 = shenjs_call(js_tail_call_ret, [shenjs_call(js_js_from_kl_expr, [Arg4067_1, true, R1])])),
  (R0 = shenjs_call(js_mk_args_str, [shenjs_call(shen_length, [R0]), R1])),
  (R4 = "function(~A) {~%  ~Areturn ~A}"),
  (R4 = shenjs_call(shen_intmake_string, [R4, [shen_tuple, shenjs_call(js_context_argname, [R1]), [shen_tuple, R0, [shen_tuple, R3, []]]]])),
  (R3 = "(new Shenjs_freeze([~A], ~A))"),
  (function() {
  return shenjs_call_tail(shen_intmake_string, [R3, [shen_tuple, R2, [shen_tuple, R4, []]]]);}))},
  3,
  [],
  "js-emit-freeze"];
shenjs_functions["shen_js-emit-freeze"] = js_emit_freeze;






js_emit_thaw = [shen_type_func,
  function shen_user_lambda4072(Arg4071) {
  if (Arg4071.length < 3) return [shen_type_func, shen_user_lambda4072, 3, Arg4071];
  var Arg4071_0 = Arg4071[0], Arg4071_1 = Arg4071[1], Arg4071_2 = Arg4071[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(false, Arg4071_1)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_unwind_tail(~A)", [shen_tuple, shenjs_call(js_emit_thaw, [Arg4071_0, true, Arg4071_2]), []]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(true, Arg4071_1)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_thaw(~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4071_0, false, Arg4071_2]), []]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-emit-thaw"]]);})))},
  3,
  [],
  "js-emit-thaw"];
shenjs_functions["shen_js-emit-thaw"] = js_emit_thaw;






js_emit_get_arg = [shen_type_func,
  function shen_user_lambda4074(Arg4073) {
  if (Arg4073.length < 2) return [shen_type_func, shen_user_lambda4074, 2, Arg4073];
  var Arg4073_0 = Arg4073[0], Arg4073_1 = Arg4073[1];
  return (function() {
  return shenjs_call_tail(js_arg_name, [Arg4073_0, Arg4073_1]);})},
  2,
  [],
  "js-emit-get-arg"];
shenjs_functions["shen_js-emit-get-arg"] = js_emit_get_arg;






js_emit_set_reg = [shen_type_func,
  function shen_user_lambda4076(Arg4075) {
  if (Arg4075.length < 3) return [shen_type_func, shen_user_lambda4076, 3, Arg4075];
  var Arg4075_0 = Arg4075[0], Arg4075_1 = Arg4075[1], Arg4075_2 = Arg4075[2];
  var R0;
  return ((R0 = shenjs_call(js_js_from_kl_expr, [Arg4075_1, false, Arg4075_2])),
  shenjs_call(js_context_nregs_$gt$, [Arg4075_2, shenjs_call(js_max, [(Arg4075_0 + 1), shenjs_call(js_context_nregs, [Arg4075_2])])]),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A~A = ~A)", [shen_tuple, shenjs_call(js_context_varname, [Arg4075_2]), [shen_tuple, Arg4075_0, [shen_tuple, R0, []]]]]);}))},
  3,
  [],
  "js-emit-set-reg"];
shenjs_functions["shen_js-emit-set-reg"] = js_emit_set_reg;






js_emit_get_reg = [shen_type_func,
  function shen_user_lambda4078(Arg4077) {
  if (Arg4077.length < 2) return [shen_type_func, shen_user_lambda4078, 2, Arg4077];
  var Arg4077_0 = Arg4077[0], Arg4077_1 = Arg4077[1];
  return (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A~A", [shen_tuple, shenjs_call(js_context_varname, [Arg4077_1]), [shen_tuple, Arg4077_0, []]]]);})},
  2,
  [],
  "js-emit-get-reg"];
shenjs_functions["shen_js-emit-get-reg"] = js_emit_get_reg;






js_func_arg = [shen_type_func,
  function shen_user_lambda4080(Arg4079) {
  if (Arg4079.length < 2) return [shen_type_func, shen_user_lambda4080, 2, Arg4079];
  var Arg4079_0 = Arg4079[0], Arg4079_1 = Arg4079[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4079_1, false, Arg4079_0]);})},
  2,
  [],
  "js-func-arg"];
shenjs_functions["shen_js-func-arg"] = js_func_arg;






js_emit_funcall$asterisk$ = [shen_type_func,
  function shen_user_lambda4082(Arg4081) {
  if (Arg4081.length < 4) return [shen_type_func, shen_user_lambda4082, 4, Arg4081];
  var Arg4081_0 = Arg4081[0], Arg4081_1 = Arg4081[1], Arg4081_2 = Arg4081[2], Arg4081_3 = Arg4081[3];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg4081_2)))
  ? ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4084(Arg4083) {
  if (Arg4083.length < 2) return [shen_type_func, shen_user_lambda4084, 2, Arg4083];
  var Arg4083_0 = Arg4083[0], Arg4083_1 = Arg4083[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4083_1, false, Arg4083_0]);})},
  2,
  [Arg4081_3]], Arg4081_1])),
  (R0 = shenjs_call(js_str_join, [R0, ", "])),
  (R1 = "shenjs_call_tail"),
  (function() {
  return shenjs_call_tail(js_tail_call_ret, [shenjs_call(shen_intmake_string, ["~A(~A, [~A])", [shen_tuple, R1, [shen_tuple, Arg4081_0, [shen_tuple, R0, []]]]])]);}))
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg4081_2)))
  ? ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4086(Arg4085) {
  if (Arg4085.length < 2) return [shen_type_func, shen_user_lambda4086, 2, Arg4085];
  var Arg4085_0 = Arg4085[0], Arg4085_1 = Arg4085[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4085_1, false, Arg4085_0]);})},
  2,
  [Arg4081_3]], Arg4081_1])),
  (R0 = shenjs_call(js_str_join, [R0, ", "])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_call(~A, [~A])", [shen_tuple, Arg4081_0, [shen_tuple, R0, []]]]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-emit-funcall*"]]);})))},
  4,
  [],
  "js-emit-funcall*"];
shenjs_functions["shen_js-emit-funcall*"] = js_emit_funcall$asterisk$;






js_emit_funcall = [shen_type_func,
  function shen_user_lambda4088(Arg4087) {
  if (Arg4087.length < 4) return [shen_type_func, shen_user_lambda4088, 4, Arg4087];
  var Arg4087_0 = Arg4087[0], Arg4087_1 = Arg4087[1], Arg4087_2 = Arg4087[2], Arg4087_3 = Arg4087[3];
  return (function() {
  return shenjs_call_tail(js_emit_funcall$asterisk$, [shenjs_call(js_func_name, [Arg4087_0]), Arg4087_1, Arg4087_2, Arg4087_3]);})},
  4,
  [],
  "js-emit-funcall"];
shenjs_functions["shen_js-emit-funcall"] = js_emit_funcall;






js_js_from_kl_expr = [shen_type_func,
  function shen_user_lambda4090(Arg4089) {
  if (Arg4089.length < 3) return [shen_type_func, shen_user_lambda4090, 3, Arg4089];
  var Arg4089_0 = Arg4089[0], Arg4089_1 = Arg4089[1], Arg4089_2 = Arg4089[2];
  var R0;
  return ((R0 = shenjs_call(js_js_from_kl_expr$asterisk$, [Arg4089_0, Arg4089_1, Arg4089_2])),
  (((typeof(R0) == 'string'))
  ? R0
  : (function() {
  return shenjs_call_tail(shen_interror, ["ERROR: expr ~R => ~R", [shen_tuple, Arg4089_0, [shen_tuple, R0, []]]]);})))},
  3,
  [],
  "js-js-from-kl-expr"];
shenjs_functions["shen_js-js-from-kl-expr"] = js_js_from_kl_expr;






js_js_from_kl_expr$asterisk$ = [shen_type_func,
  function shen_user_lambda4092(Arg4091) {
  if (Arg4091.length < 3) return [shen_type_func, shen_user_lambda4092, 3, Arg4091];
  var Arg4091_0 = Arg4091[0], Arg4091_1 = Arg4091[1], Arg4091_2 = Arg4091[2];
  var R0, R1;
  return ((shenjs_empty$question$(Arg4091_0))
  ? "[]"
  : (((typeof(Arg4091_0) == 'number'))
  ? (function() {
  return shenjs_str(Arg4091_0);})
  : ((shenjs_unwind_tail(shenjs_$eq$(Arg4091_0, shen_fail_obj)))
  ? "shen_fail_obj"
  : ((shenjs_unwind_tail(shenjs_$eq$(true, Arg4091_0)))
  ? "true"
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg4091_0)))
  ? "false"
  : ((shenjs_is_type(Arg4091_0, shen_type_symbol))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["[shen_type_symbol, ~S]", [shen_tuple, shenjs_str(Arg4091_0), []]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "bar!"], Arg4091_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["[shen_type_symbol, ~S]", [shen_tuple, "|", []]]);})
  : (((shenjs_is_type(Arg4091_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg4091_0[1])) && (shenjs_is_type(Arg4091_0[2], shen_type_cons) && (shenjs_is_type(Arg4091_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4091_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["[shen_type_cons, ~A, ~A]", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4091_0[2][1], false, Arg4091_2]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4091_0[2][2][1], false, Arg4091_2]), []]]]);})
  : (((shenjs_is_type(Arg4091_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "type"], Arg4091_0[1])) && (shenjs_is_type(Arg4091_0[2], shen_type_cons) && (shenjs_is_type(Arg4091_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4091_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4091_0[2][1], Arg4091_1, Arg4091_2]);})
  : (((shenjs_is_type(Arg4091_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cond"], Arg4091_0[1]))))
  ? (function() {
  return shenjs_call_tail(js_emit_cond, [Arg4091_0[2], Arg4091_1, Arg4091_2]);})
  : (((shenjs_is_type(Arg4091_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "if"], Arg4091_0[1])) && (shenjs_is_type(Arg4091_0[2], shen_type_cons) && (shenjs_is_type(Arg4091_0[2][2], shen_type_cons) && (shenjs_is_type(Arg4091_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4091_0[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(js_emit_cond, [[shen_type_cons, [shen_type_cons, Arg4091_0[2][1], [shen_type_cons, Arg4091_0[2][2][1], []]], [shen_type_cons, [shen_type_cons, true, Arg4091_0[2][2][2]], []]], Arg4091_1, Arg4091_2]);})
  : (((shenjs_is_type(Arg4091_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "freeze"], Arg4091_0[1])) && (shenjs_is_type(Arg4091_0[2], shen_type_cons) && shenjs_empty$question$(Arg4091_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["Wrong freeze code!", []]);})
  : (((shenjs_is_type(Arg4091_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mk-freeze"], Arg4091_0[1])) && (shenjs_is_type(Arg4091_0[2], shen_type_cons) && (shenjs_is_type(Arg4091_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4091_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(js_emit_freeze, [Arg4091_0[2][1], Arg4091_0[2][2][1], Arg4091_2]);})
  : (((shenjs_is_type(Arg4091_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-get-arg"], Arg4091_0[1])) && (shenjs_is_type(Arg4091_0[2], shen_type_cons) && shenjs_empty$question$(Arg4091_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(js_emit_get_arg, [Arg4091_0[2][1], Arg4091_2]);})
  : (((shenjs_is_type(Arg4091_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-get-reg"], Arg4091_0[1])) && (shenjs_is_type(Arg4091_0[2], shen_type_cons) && shenjs_empty$question$(Arg4091_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(js_emit_get_reg, [Arg4091_0[2][1], Arg4091_2]);})
  : (((shenjs_is_type(Arg4091_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-set-reg!"], Arg4091_0[1])) && (shenjs_is_type(Arg4091_0[2], shen_type_cons) && (shenjs_is_type(Arg4091_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4091_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(js_emit_set_reg, [Arg4091_0[2][1], Arg4091_0[2][2][1], Arg4091_2]);})
  : (((shenjs_is_type(Arg4091_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mk-func"], Arg4091_0[1])) && (shenjs_is_type(Arg4091_0[2], shen_type_cons) && (shenjs_is_type(Arg4091_0[2][2], shen_type_cons) && (shenjs_is_type(Arg4091_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4091_0[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(js_emit_mk_func, [Arg4091_0[2][1], Arg4091_0[2][2][1], Arg4091_0[2][2][2][1], Arg4091_2]);})
  : (((shenjs_is_type(Arg4091_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mk-closure"], Arg4091_0[1])) && (shenjs_is_type(Arg4091_0[2], shen_type_cons) && (shenjs_is_type(Arg4091_0[2][2], shen_type_cons) && (shenjs_is_type(Arg4091_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4091_0[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(js_emit_mk_closure, [Arg4091_0[2][1], Arg4091_0[2][2][1], Arg4091_0[2][2][2][1], Arg4091_2]);})
  : ((R0 = (new Shenjs_freeze([Arg4091_0, Arg4091_1, Arg4091_2], function(Arg4093) {
  var Arg4093_0 = Arg4093[0], Arg4093_1 = Arg4093[1], Arg4093_2 = Arg4093[2];
  return (function() {
  return (((shenjs_is_type(Arg4093_0, shen_type_cons) && shenjs_is_type(Arg4093_0[1], shen_type_cons)))
  ? ((R3 = shenjs_call(js_js_from_kl_expr, [Arg4093_0[1], false, Arg4093_2])),
  (function() {
  return shenjs_call_tail(js_emit_funcall$asterisk$, [R3, Arg4093_0[2], Arg4093_1, Arg4093_2]);}))
  : ((shenjs_is_type(Arg4093_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(js_emit_funcall, [Arg4093_0[1], Arg4093_0[2], Arg4093_1, Arg4093_2]);})
  : (function() {
  return shenjs_call_tail(js_esc_obj, [Arg4093_0]);})));})}))),
  ((shenjs_is_type(Arg4091_0, shen_type_cons))
  ? ((R1 = shenjs_call(js_std_op, [Arg4091_0[1], Arg4091_0[2], Arg4091_1, Arg4091_2])),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, shen_fail_obj)))
  ? shenjs_thaw(R0)
  : R1))
  : shenjs_thaw(R0)))))))))))))))))))))},
  3,
  [],
  "js-js-from-kl-expr*"];
shenjs_functions["shen_js-js-from-kl-expr*"] = js_js_from_kl_expr$asterisk$;






js_js_from_kl_toplevel_expr = [shen_type_func,
  function shen_user_lambda4096(Arg4095) {
  if (Arg4095.length < 2) return [shen_type_func, shen_user_lambda4096, 2, Arg4095];
  var Arg4095_0 = Arg4095[0], Arg4095_1 = Arg4095[1];
  var R0, R1;
  return (((typeof(Arg4095_0) == 'string'))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A;~%", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4095_0, false, Arg4095_1]), []]]);})
  : ((R0 = shenjs_call(js_js_from_kl_expr, [Arg4095_0, false, Arg4095_1])),
  (R1 = shenjs_call(js_mk_regs_str, [Arg4095_1])),
  (((shenjs_call(js_context_nregs, [Arg4095_1]) > 0))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["((function() {~%  ~Areturn ~A})());~%", [shen_tuple, R1, [shen_tuple, R0, []]]]);})
  : (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A;", [shen_tuple, R0, []]]);}))))},
  2,
  [],
  "js-js-from-kl-toplevel-expr"];
shenjs_functions["shen_js-js-from-kl-toplevel-expr"] = js_js_from_kl_toplevel_expr;






js_js_from_kl_toplevel = [shen_type_func,
  function shen_user_lambda4098(Arg4097) {
  if (Arg4097.length < 3) return [shen_type_func, shen_user_lambda4098, 3, Arg4097];
  var Arg4097_0 = Arg4097[0], Arg4097_1 = Arg4097[1], Arg4097_2 = Arg4097[2];
  return (((shenjs_is_type(Arg4097_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "set"], Arg4097_0[1])) && (shenjs_is_type(Arg4097_0[2], shen_type_cons) && (shenjs_is_type(Arg4097_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4097_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A;~%", [shen_tuple, shenjs_call(js_emit_set, [Arg4097_0[2][1], Arg4097_0[2][2][1], Arg4097_2]), []]]);})
  : (((shenjs_is_type(Arg4097_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mk-func"], Arg4097_0[1])) && (shenjs_is_type(Arg4097_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg4097_1)) && shenjs_call(js_int_func$question$, [Arg4097_0[2][1]]))))))
  ? ""
  : (((shenjs_is_type(Arg4097_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mk-func"], Arg4097_0[1]))))
  ? (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4097_0, true, Arg4097_2]);})
  : (function() {
  return shenjs_call_tail(js_js_from_kl_toplevel_expr, [Arg4097_0, Arg4097_2]);}))))},
  3,
  [],
  "js-js-from-kl-toplevel"];
shenjs_functions["shen_js-js-from-kl-toplevel"] = js_js_from_kl_toplevel;






js_js_from_kl_toplevel_forms = [shen_type_func,
  function shen_user_lambda4100(Arg4099) {
  if (Arg4099.length < 4) return [shen_type_func, shen_user_lambda4100, 4, Arg4099];
  var Arg4099_0 = Arg4099[0], Arg4099_1 = Arg4099[1], Arg4099_2 = Arg4099[2], Arg4099_3 = Arg4099[3];
  var R0;
  return ((shenjs_empty$question$(Arg4099_0))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A~%~A~%", [shen_tuple, shenjs_call(js_context_toplevel, [Arg4099_2]), [shen_tuple, Arg4099_3, []]]]);})
  : ((shenjs_is_type(Arg4099_0, shen_type_cons))
  ? ((R0 = shenjs_call(js_js_from_kl_toplevel, [Arg4099_0[1], Arg4099_1, Arg4099_2])),
  (R0 = shenjs_call(shen_intmake_string, ["~A~A~%", [shen_tuple, Arg4099_3, [shen_tuple, R0, []]]])),
  (function() {
  return shenjs_call_tail(js_js_from_kl_toplevel_forms, [Arg4099_0[2], Arg4099_1, Arg4099_2, R0]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-js-from-kl-toplevel-forms"]]);})))},
  4,
  [],
  "js-js-from-kl-toplevel-forms"];
shenjs_functions["shen_js-js-from-kl-toplevel-forms"] = js_js_from_kl_toplevel_forms;






js_js_from_kl$asterisk$ = [shen_type_func,
  function shen_user_lambda4102(Arg4101) {
  if (Arg4101.length < 3) return [shen_type_func, shen_user_lambda4102, 3, Arg4101];
  var Arg4101_0 = Arg4101[0], Arg4101_1 = Arg4101[1], Arg4101_2 = Arg4101[2];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_toplevel, [Arg4101_0, Arg4101_1, Arg4101_2]);})},
  3,
  [],
  "js-js-from-kl*"];
shenjs_functions["shen_js-js-from-kl*"] = js_js_from_kl$asterisk$;






js_from_kl = [shen_type_func,
  function shen_user_lambda4104(Arg4103) {
  if (Arg4103.length < 1) return [shen_type_func, shen_user_lambda4104, 1, Arg4103];
  var Arg4103_0 = Arg4103[0];
  var R0, R1;
  return ((R0 = shenjs_call(js_mk_context, [0, "", shenjs_call(shen_gensym, [[shen_type_symbol, "Arg"]]), [shen_type_symbol, "R"]])),
  (R1 = shenjs_call(reg_kl_walk, [[shen_type_cons, Arg4103_0, []]])),
  (R1 = shenjs_call(js_js_from_kl_toplevel_forms, [R1, (shenjs_globals["shen_js-skip-internals"]), R0, ""])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A~%~A~%", [shen_tuple, shenjs_call(js_context_toplevel, [R0]), [shen_tuple, R1, []]]]);}))},
  1,
  [],
  "js-from-kl"];
shenjs_functions["shen_js-from-kl"] = js_from_kl;






js_js_from_kl_all = [shen_type_func,
  function shen_user_lambda4106(Arg4105) {
  if (Arg4105.length < 1) return [shen_type_func, shen_user_lambda4106, 1, Arg4105];
  var Arg4105_0 = Arg4105[0];
  var R0, R1;
  return ((R0 = shenjs_call(reg_kl_walk, [Arg4105_0])),
  (R1 = shenjs_call(js_mk_context, [0, "", shenjs_call(shen_gensym, [[shen_type_symbol, "Arg"]]), [shen_type_symbol, "R"]])),
  (function() {
  return shenjs_call_tail(js_js_from_kl_toplevel_all, [R0, (shenjs_globals["shen_js-skip-internals"]), R1, ""]);}))},
  1,
  [],
  "js-js-from-kl-all"];
shenjs_functions["shen_js-js-from-kl-all"] = js_js_from_kl_all;






(shenjs_globals["shen_js-skip-internals"] = true);






js_js_write_string = [shen_type_func,
  function shen_user_lambda4109(Arg4108) {
  if (Arg4108.length < 3) return [shen_type_func, shen_user_lambda4109, 3, Arg4108];
  var Arg4108_0 = Arg4108[0], Arg4108_1 = Arg4108[1], Arg4108_2 = Arg4108[2];
  return (function() {
  return shenjs_trap_error(function() {return (shenjs_pr(Arg4108_0[Arg4108_1], Arg4108_2),
  shenjs_call(js_js_write_string, [Arg4108_0, (Arg4108_1 + 1), Arg4108_2]));}, [shen_type_func,
  function shen_user_lambda4111(Arg4110) {
  if (Arg4110.length < 1) return [shen_type_func, shen_user_lambda4111, 1, Arg4110];
  var Arg4110_0 = Arg4110[0];
  return true},
  1,
  []]);})},
  3,
  [],
  "js-js-write-string"];
shenjs_functions["shen_js-js-write-string"] = js_js_write_string;






js_js_dump_exprs_to_file = [shen_type_func,
  function shen_user_lambda4113(Arg4112) {
  if (Arg4112.length < 2) return [shen_type_func, shen_user_lambda4113, 2, Arg4112];
  var Arg4112_0 = Arg4112[0], Arg4112_1 = Arg4112[1];
  return ((shenjs_empty$question$(Arg4112_0))
  ? true
  : ((shenjs_is_type(Arg4112_0, shen_type_cons))
  ? (shenjs_call(js_js_write_string, [shenjs_call(js_from_kl, [Arg4112_0[1]]), 0, Arg4112_1]),
  shenjs_call(js_js_write_string, [shenjs_call(shen_intmake_string, ["~%", []]), 0, Arg4112_1]),
  (function() {
  return shenjs_call_tail(js_js_dump_exprs_to_file, [Arg4112_0[2], Arg4112_1]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-js-dump-exprs-to-file"]]);})))},
  2,
  [],
  "js-js-dump-exprs-to-file"];
shenjs_functions["shen_js-js-dump-exprs-to-file"] = js_js_dump_exprs_to_file;






js_dump_to_file = [shen_type_func,
  function shen_user_lambda4115(Arg4114) {
  if (Arg4114.length < 2) return [shen_type_func, shen_user_lambda4115, 2, Arg4114];
  var Arg4114_0 = Arg4114[0], Arg4114_1 = Arg4114[1];
  var R0;
  return ((R0 = shenjs_open([shen_type_symbol, "file"], Arg4114_1, [shen_type_symbol, "out"])),
  shenjs_call(js_js_dump_exprs_to_file, [Arg4114_0, R0]),
  shenjs_close(R0),
  true)},
  2,
  [],
  "js-dump-to-file"];
shenjs_functions["shen_js-dump-to-file"] = js_dump_to_file;






js_kl_from_shen = [shen_type_func,
  function shen_user_lambda4117(Arg4116) {
  if (Arg4116.length < 1) return [shen_type_func, shen_user_lambda4117, 1, Arg4116];
  var Arg4116_0 = Arg4116[0];
  var R0;
  return ((R0 = shenjs_call(shen_walk, [[shen_type_func,
  function shen_user_lambda4119(Arg4118) {
  if (Arg4118.length < 1) return [shen_type_func, shen_user_lambda4119, 1, Arg4118];
  var Arg4118_0 = Arg4118[0];
  return (function() {
  return shenjs_call_tail(shen_macroexpand, [Arg4118_0]);})},
  1,
  []], Arg4116_0])),
  (R0 = ((shenjs_call(shen_packaged$question$, [R0]))
  ? shenjs_call(js_package_contents, [R0])
  : R0)),
  (function() {
  return shenjs_call_tail(shen_elim_define, [shenjs_call(shen_proc_input$plus$, [R0])]);}))},
  1,
  [],
  "js-kl-from-shen"];
shenjs_functions["shen_js-kl-from-shen"] = js_kl_from_shen;






js_dump = [shen_type_func,
  function shen_user_lambda4121(Arg4120) {
  if (Arg4120.length < 3) return [shen_type_func, shen_user_lambda4121, 3, Arg4120];
  var Arg4120_0 = Arg4120[0], Arg4120_1 = Arg4120[1], Arg4120_2 = Arg4120[2];
  var R0, R1, R2;
  return ((R0 = shenjs_call(shen_intmake_string, ["~A~A.js", [shen_tuple, Arg4120_2, [shen_tuple, Arg4120_1, []]]])),
  (R1 = shenjs_call(shen_intmake_string, ["~A~A", [shen_tuple, Arg4120_0, [shen_tuple, Arg4120_1, []]]])),
  (R2 = shenjs_call(shen_map, [[shen_type_symbol, "js-kl-from-shen"], shenjs_call(shen_read_file, [R1])])),
  ((shenjs_unwind_tail(shenjs_$eq$((shenjs_globals["shen_shen-*hush*"]), [shen_type_symbol, "js-hushed"])))
  ? [shen_type_symbol, "_"]
  : shenjs_call(shen_intoutput, ["== ~A -> ~A~%", [shen_tuple, R1, [shen_tuple, R0, []]]])),
  (function() {
  return shenjs_call_tail(js_dump_to_file, [R2, R0]);}))},
  3,
  [],
  "js-dump"];
shenjs_functions["shen_js-dump"] = js_dump;






shenjs_call(shen_declare, [[shen_type_symbol, "js-dump"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]], []]]], []]]]]);





((shenjs_trap_error(function() {return (shenjs_call(register_dumper, []),
  true);}, [shen_type_func,
  function shen_user_lambda4125(Arg4124) {
  if (Arg4124.length < 1) return [shen_type_func, shen_user_lambda4125, 1, Arg4124];
  var Arg4124_0 = Arg4124[0];
  return false},
  1,
  []]))
  ? shenjs_call(register_dumper, [[shen_type_symbol, "javascript"], [shen_type_symbol, "all"], [shen_type_symbol, "js-dump"]])
  : [shen_type_symbol, "_"]);





shenjs_repl_split_input_aux = [shen_type_func,
  function shen_user_lambda4131(Arg4130) {
  if (Arg4130.length < 3) return [shen_type_func, shen_user_lambda4131, 3, Arg4130];
  var Arg4130_0 = Arg4130[0], Arg4130_1 = Arg4130[1], Arg4130_2 = Arg4130[2];
  var R0, R1, R2;
  return ((shenjs_empty$question$(Arg4130_0))
  ? Arg4130_2
  : ((shenjs_is_type(Arg4130_0, shen_type_cons))
  ? ((R0 = [shen_type_cons, Arg4130_0[1], Arg4130_1]),
  (R1 = shenjs_call(shen_reverse, [R0])),
  (R2 = shenjs_call(shen_compile, [[shen_type_symbol, "shen-<st_input>"], R1, []])),
  (function() {
  return shenjs_call_tail(shenjs_repl_split_input_aux, [Arg4130_0[2], R0, (((shenjs_unwind_tail(shenjs_$eq$(R2, shen_fail_obj)) || shenjs_empty$question$(R2)))
  ? Arg4130_2
  : [shen_tuple, R1, Arg4130_0[2]])]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "shenjs-repl-split-input-aux"]]);})))},
  3,
  [],
  "shenjs-repl-split-input-aux"];
shenjs_functions["shen_shenjs-repl-split-input-aux"] = shenjs_repl_split_input_aux;






shenjs_repl_split_input = [shen_type_func,
  function shen_user_lambda4133(Arg4132) {
  if (Arg4132.length < 1) return [shen_type_func, shen_user_lambda4133, 1, Arg4132];
  var Arg4132_0 = Arg4132[0];
  return (function() {
  return shenjs_call_tail(shenjs_repl_split_input_aux, [Arg4132_0, [], []]);})},
  1,
  [],
  "shenjs-repl-split-input"];
shenjs_functions["shen_shenjs-repl-split-input"] = shenjs_repl_split_input;












shen_shen_$gt$kl = [shen_type_func,
  function shen_user_lambda4230(Arg4229) {
  if (Arg4229.length < 2) return [shen_type_func, shen_user_lambda4230, 2, Arg4229];
  var Arg4229_0 = Arg4229[0], Arg4229_1 = Arg4229[1];
  return (function() {
  return shenjs_call_tail(shen_compile, [[shen_type_func,
  function shen_user_lambda4232(Arg4231) {
  if (Arg4231.length < 1) return [shen_type_func, shen_user_lambda4232, 1, Arg4231];
  var Arg4231_0 = Arg4231[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$define$gt$, [Arg4231_0]);})},
  1,
  []], [shen_type_cons, Arg4229_0, Arg4229_1], [shen_type_func,
  function shen_user_lambda4234(Arg4233) {
  if (Arg4233.length < 2) return [shen_type_func, shen_user_lambda4234, 2, Arg4233];
  var Arg4233_0 = Arg4233[0], Arg4233_1 = Arg4233[1];
  return (function() {
  return shenjs_call_tail(shen_shen_syntax_error, [Arg4233_0, Arg4233_1]);})},
  2,
  [Arg4229_0]]]);})},
  2,
  [],
  "shen-shen->kl"];
shenjs_functions["shen_shen-shen->kl"] = shen_shen_$gt$kl;






shen_shen_syntax_error = [shen_type_func,
  function shen_user_lambda4236(Arg4235) {
  if (Arg4235.length < 2) return [shen_type_func, shen_user_lambda4236, 2, Arg4235];
  var Arg4235_0 = Arg4235[0], Arg4235_1 = Arg4235[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["syntax error in ~A here:~%~% ~A~%", [shen_tuple, Arg4235_0, [shen_tuple, shenjs_call(shen_next_50, [50, Arg4235_1]), []]]]);})},
  2,
  [],
  "shen-shen-syntax-error"];
shenjs_functions["shen_shen-shen-syntax-error"] = shen_shen_syntax_error;






shen_$lt$define$gt$ = [shen_type_func,
  function shen_user_lambda4238(Arg4237) {
  if (Arg4237.length < 1) return [shen_type_func, shen_user_lambda4238, 1, Arg4237];
  var Arg4237_0 = Arg4237[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$name$gt$, [Arg4237_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$signature$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? ((R1 = shenjs_call(shen_$lt$rules$gt$, [R1])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_compile$_to$_machine$_code, [shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])])])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$name$gt$, [Arg4237_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$rules$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_compile$_to$_machine$_code, [shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])])])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<define>"];
shenjs_functions["shen_shen-<define>"] = shen_$lt$define$gt$;






shen_$lt$name$gt$ = [shen_type_func,
  function shen_user_lambda4240(Arg4239) {
  if (Arg4239.length < 1) return [shen_type_func, shen_user_lambda4240, 1, Arg4239];
  var Arg4239_0 = Arg4239[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4239_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4239_0])[2], shenjs_call(shen_snd, [Arg4239_0])])]), (((shenjs_is_type(shenjs_call(shen_fst, [Arg4239_0])[1], shen_type_symbol) && (!shenjs_call(shen_sysfunc$question$, [shenjs_call(shen_fst, [Arg4239_0])[1]]))))
  ? shenjs_call(shen_fst, [Arg4239_0])[1]
  : shenjs_call(shen_interror, ["~A is not a legitimate function name.~%", [shen_tuple, shenjs_call(shen_fst, [Arg4239_0])[1], []]]))])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<name>"];
shenjs_functions["shen_shen-<name>"] = shen_$lt$name$gt$;






shen_sysfunc$question$ = [shen_type_func,
  function shen_user_lambda4242(Arg4241) {
  if (Arg4241.length < 1) return [shen_type_func, shen_user_lambda4242, 1, Arg4241];
  var Arg4241_0 = Arg4241[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg4241_0, (shenjs_globals["shen_shen-*system*"])]);})},
  1,
  [],
  "shen-sysfunc?"];
shenjs_functions["shen_shen-sysfunc?"] = shen_sysfunc$question$;






shen_$lt$signature$gt$ = [shen_type_func,
  function shen_user_lambda4244(Arg4243) {
  if (Arg4243.length < 1) return [shen_type_func, shen_user_lambda4244, 1, Arg4243];
  var Arg4243_0 = Arg4243[0];
  var R0;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4243_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "{"], shenjs_call(shen_fst, [Arg4243_0])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$signature_help$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4243_0])[2], shenjs_call(shen_snd, [Arg4243_0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "}"], shenjs_call(shen_fst, [R0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])]), shenjs_call(shen_normalise_type, [shenjs_call(shen_curry_type, [shenjs_call(shen_snd, [R0])])])])
  : shen_fail_obj)
  : shen_fail_obj))
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<signature>"];
shenjs_functions["shen_shen-<signature>"] = shen_$lt$signature$gt$;






shen_curry_type = [shen_type_func,
  function shen_user_lambda4246(Arg4245) {
  if (Arg4245.length < 1) return [shen_type_func, shen_user_lambda4246, 1, Arg4245];
  var Arg4245_0 = Arg4245[0];
  return (((shenjs_is_type(Arg4245_0, shen_type_cons) && (shenjs_is_type(Arg4245_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-->"], Arg4245_0[2][1])) && (shenjs_is_type(Arg4245_0[2][2], shen_type_cons) && (shenjs_is_type(Arg4245_0[2][2][2], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-->"], Arg4245_0[2][2][2][1]))))))))
  ? (function() {
  return shenjs_call_tail(shen_curry_type, [[shen_type_cons, Arg4245_0[1], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, Arg4245_0[2][2], []]]]]);})
  : (((shenjs_is_type(Arg4245_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg4245_0[1])) && (shenjs_is_type(Arg4245_0[2], shen_type_cons) && (shenjs_is_type(Arg4245_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4245_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_curry_type, [Arg4245_0[2][1]]), []]]
  : (((shenjs_is_type(Arg4245_0, shen_type_cons) && (shenjs_is_type(Arg4245_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "*"], Arg4245_0[2][1])) && (shenjs_is_type(Arg4245_0[2][2], shen_type_cons) && (shenjs_is_type(Arg4245_0[2][2][2], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "*"], Arg4245_0[2][2][2][1]))))))))
  ? (function() {
  return shenjs_call_tail(shen_curry_type, [[shen_type_cons, Arg4245_0[1], [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, Arg4245_0[2][2], []]]]]);})
  : ((shenjs_is_type(Arg4245_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda4248(Arg4247) {
  if (Arg4247.length < 1) return [shen_type_func, shen_user_lambda4248, 1, Arg4247];
  var Arg4247_0 = Arg4247[0];
  return (function() {
  return shenjs_call_tail(shen_curry_type, [Arg4247_0]);})},
  1,
  []], Arg4245_0]);})
  : Arg4245_0))))},
  1,
  [],
  "shen-curry-type"];
shenjs_functions["shen_shen-curry-type"] = shen_curry_type;






shen_$lt$signature_help$gt$ = [shen_type_func,
  function shen_user_lambda4250(Arg4249) {
  if (Arg4249.length < 1) return [shen_type_func, shen_user_lambda4250, 1, Arg4249];
  var Arg4249_0 = Arg4249[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4249_0]), shen_type_cons))
  ? ((R0 = shenjs_call(shen_$lt$signature_help$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4249_0])[2], shenjs_call(shen_snd, [Arg4249_0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), ((shenjs_call(shen_element$question$, [shenjs_call(shen_fst, [Arg4249_0])[1], [shen_type_cons, [shen_type_symbol, "{"], [shen_type_cons, [shen_type_symbol, "}"], []]]]))
  ? shen_fail_obj
  : [shen_type_cons, shenjs_call(shen_fst, [Arg4249_0])[1], shenjs_call(shen_snd, [R0])])])
  : shen_fail_obj))
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4249_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), []])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<signature-help>"];
shenjs_functions["shen_shen-<signature-help>"] = shen_$lt$signature_help$gt$;






shen_$lt$rules$gt$ = [shen_type_func,
  function shen_user_lambda4252(Arg4251) {
  if (Arg4251.length < 1) return [shen_type_func, shen_user_lambda4252, 1, Arg4251];
  var Arg4251_0 = Arg4251[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$rule$gt$, [Arg4251_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$rules$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$rule$gt$, [Arg4251_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R0]), []]])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<rules>"];
shenjs_functions["shen_shen-<rules>"] = shen_$lt$rules$gt$;






shen_$lt$rule$gt$ = [shen_type_func,
  function shen_user_lambda4254(Arg4253) {
  if (Arg4253.length < 1) return [shen_type_func, shen_user_lambda4254, 1, Arg4253];
  var Arg4253_0 = Arg4253[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4253_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "->"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$action$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R1]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "where"], shenjs_call(shen_fst, [R1])[1]))))
  ? ((R2 = shenjs_call(shen_$lt$guard$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1])[2], shenjs_call(shen_snd, [R1])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R2))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R2]), [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, shenjs_call(shen_snd, [R2]), [shen_type_cons, shenjs_call(shen_snd, [R1]), []]]], []]]])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4253_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "->"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$action$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R1]), []]]])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4253_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "<-"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$action$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R1]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "where"], shenjs_call(shen_fst, [R1])[1]))))
  ? ((R2 = shenjs_call(shen_$lt$guard$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1])[2], shenjs_call(shen_snd, [R1])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R2))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R2]), [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, shenjs_call(shen_snd, [R2]), [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-choicepoint!"], [shen_type_cons, shenjs_call(shen_snd, [R1]), []]], []]]], []]]])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4253_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "<-"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$action$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-choicepoint!"], [shen_type_cons, shenjs_call(shen_snd, [R1]), []]], []]]])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))
  : R0))
  : R0))},
  1,
  [],
  "shen-<rule>"];
shenjs_functions["shen_shen-<rule>"] = shen_$lt$rule$gt$;






shen_fail$_if = [shen_type_func,
  function shen_user_lambda4256(Arg4255) {
  if (Arg4255.length < 2) return [shen_type_func, shen_user_lambda4256, 2, Arg4255];
  var Arg4255_0 = Arg4255[0], Arg4255_1 = Arg4255[1];
  return ((shenjs_call(Arg4255_0, [Arg4255_1]))
  ? shen_fail_obj
  : Arg4255_1)},
  2,
  [],
  "shen-fail_if"];
shenjs_functions["shen_shen-fail_if"] = shen_fail$_if;






shen_succeeds$question$ = [shen_type_func,
  function shen_user_lambda4258(Arg4257) {
  if (Arg4257.length < 1) return [shen_type_func, shen_user_lambda4258, 1, Arg4257];
  var Arg4257_0 = Arg4257[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4257_0, shen_fail_obj)))
  ? false
  : true)},
  1,
  [],
  "shen-succeeds?"];
shenjs_functions["shen_shen-succeeds?"] = shen_succeeds$question$;






shen_$lt$patterns$gt$ = [shen_type_func,
  function shen_user_lambda4260(Arg4259) {
  if (Arg4259.length < 1) return [shen_type_func, shen_user_lambda4260, 1, Arg4259];
  var Arg4259_0 = Arg4259[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$pattern$gt$, [Arg4259_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$patterns$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4259_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), []])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<patterns>"];
shenjs_functions["shen_shen-<patterns>"] = shen_$lt$patterns$gt$;






shen_$lt$pattern$gt$ = [shen_type_func,
  function shen_user_lambda4262(Arg4261) {
  if (Arg4261.length < 1) return [shen_type_func, shen_user_lambda4262, 1, Arg4261];
  var Arg4261_0 = Arg4261[0];
  var R0, R1;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4261_0]), shen_type_cons) && shenjs_is_type(shenjs_call(shen_fst, [Arg4261_0])[1], shen_type_cons)))
  ? shenjs_call(shen_snd_or_fail, [(((shenjs_is_type(shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@p"], shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$pattern1$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$pattern2$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[2], shenjs_call(shen_snd, [Arg4261_0])])]), [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R1]), []]]]])])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4261_0]), shen_type_cons) && shenjs_is_type(shenjs_call(shen_fst, [Arg4261_0])[1], shen_type_cons)))
  ? shenjs_call(shen_snd_or_fail, [(((shenjs_is_type(shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$pattern1$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$pattern2$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[2], shenjs_call(shen_snd, [Arg4261_0])])]), [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R1]), []]]]])])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4261_0]), shen_type_cons) && shenjs_is_type(shenjs_call(shen_fst, [Arg4261_0])[1], shen_type_cons)))
  ? shenjs_call(shen_snd_or_fail, [(((shenjs_is_type(shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@v"], shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$pattern1$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$pattern2$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[2], shenjs_call(shen_snd, [Arg4261_0])])]), [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R1]), []]]]])])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4261_0]), shen_type_cons) && shenjs_is_type(shenjs_call(shen_fst, [Arg4261_0])[1], shen_type_cons)))
  ? shenjs_call(shen_snd_or_fail, [(((shenjs_is_type(shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$pattern1$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$pattern2$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[2], shenjs_call(shen_snd, [Arg4261_0])])]), [shen_type_cons, [shen_type_symbol, "@s"], [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R1]), []]]]])])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4261_0]), shen_type_cons) && shenjs_is_type(shenjs_call(shen_fst, [Arg4261_0])[1], shen_type_cons)))
  ? shenjs_call(shen_snd_or_fail, [(((shenjs_is_type(shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "vector"], shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])[1]))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])])]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(0, shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])])])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[1], shenjs_call(shen_snd, [Arg4261_0])])])])])])]), shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[2], shenjs_call(shen_snd, [Arg4261_0])])]), [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 0, []]]])])
  : shen_fail_obj)
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4261_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4261_0])[2], shenjs_call(shen_snd, [Arg4261_0])])]), ((shenjs_is_type(shenjs_call(shen_fst, [Arg4261_0])[1], shen_type_cons))
  ? shenjs_call(shen_interror, ["~A is not a legitimate constructor~%", [shen_tuple, shenjs_call(shen_fst, [Arg4261_0])[1], []]])
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$simple$_pattern$gt$, [Arg4261_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))},
  1,
  [],
  "shen-<pattern>"];
shenjs_functions["shen_shen-<pattern>"] = shen_$lt$pattern$gt$;






shen_$lt$simple$_pattern$gt$ = [shen_type_func,
  function shen_user_lambda4264(Arg4263) {
  if (Arg4263.length < 1) return [shen_type_func, shen_user_lambda4264, 1, Arg4263];
  var Arg4263_0 = Arg4263[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4263_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4263_0])[2], shenjs_call(shen_snd, [Arg4263_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4263_0])[1], [shen_type_symbol, "_"])))
  ? shenjs_call(shen_gensym, [[shen_type_symbol, "X"]])
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4263_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4263_0])[2], shenjs_call(shen_snd, [Arg4263_0])])]), ((shenjs_call(shen_element$question$, [shenjs_call(shen_fst, [Arg4263_0])[1], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_symbol, "<-"], []]]]))
  ? shen_fail_obj
  : shenjs_call(shen_fst, [Arg4263_0])[1])])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<simple_pattern>"];
shenjs_functions["shen_shen-<simple_pattern>"] = shen_$lt$simple$_pattern$gt$;






shen_$lt$pattern1$gt$ = [shen_type_func,
  function shen_user_lambda4266(Arg4265) {
  if (Arg4265.length < 1) return [shen_type_func, shen_user_lambda4266, 1, Arg4265];
  var Arg4265_0 = Arg4265[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$pattern$gt$, [Arg4265_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<pattern1>"];
shenjs_functions["shen_shen-<pattern1>"] = shen_$lt$pattern1$gt$;






shen_$lt$pattern2$gt$ = [shen_type_func,
  function shen_user_lambda4268(Arg4267) {
  if (Arg4267.length < 1) return [shen_type_func, shen_user_lambda4268, 1, Arg4267];
  var Arg4267_0 = Arg4267[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$pattern$gt$, [Arg4267_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<pattern2>"];
shenjs_functions["shen_shen-<pattern2>"] = shen_$lt$pattern2$gt$;






shen_$lt$action$gt$ = [shen_type_func,
  function shen_user_lambda4270(Arg4269) {
  if (Arg4269.length < 1) return [shen_type_func, shen_user_lambda4270, 1, Arg4269];
  var Arg4269_0 = Arg4269[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4269_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4269_0])[2], shenjs_call(shen_snd, [Arg4269_0])])]), shenjs_call(shen_fst, [Arg4269_0])[1]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<action>"];
shenjs_functions["shen_shen-<action>"] = shen_$lt$action$gt$;






shen_$lt$guard$gt$ = [shen_type_func,
  function shen_user_lambda4272(Arg4271) {
  if (Arg4271.length < 1) return [shen_type_func, shen_user_lambda4272, 1, Arg4271];
  var Arg4271_0 = Arg4271[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4271_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4271_0])[2], shenjs_call(shen_snd, [Arg4271_0])])]), shenjs_call(shen_fst, [Arg4271_0])[1]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<guard>"];
shenjs_functions["shen_shen-<guard>"] = shen_$lt$guard$gt$;






shen_compile$_to$_machine$_code = [shen_type_func,
  function shen_user_lambda4274(Arg4273) {
  if (Arg4273.length < 2) return [shen_type_func, shen_user_lambda4274, 2, Arg4273];
  var Arg4273_0 = Arg4273[0], Arg4273_1 = Arg4273[1];
  var R0;
  return ((R0 = shenjs_call(shen_compile$_to$_lambda$plus$, [Arg4273_0, Arg4273_1])),
  (R0 = shenjs_call(shen_compile$_to$_kl, [Arg4273_0, R0])),
  shenjs_call(shen_record_source, [Arg4273_0, R0]),
  R0)},
  2,
  [],
  "shen-compile_to_machine_code"];
shenjs_functions["shen_shen-compile_to_machine_code"] = shen_compile$_to$_machine$_code;






shen_record_source = [shen_type_func,
  function shen_user_lambda4276(Arg4275) {
  if (Arg4275.length < 2) return [shen_type_func, shen_user_lambda4276, 2, Arg4275];
  var Arg4275_0 = Arg4275[0], Arg4275_1 = Arg4275[1];
  return (((shenjs_globals["shen_shen-*installing-kl*"]))
  ? [shen_type_symbol, "shen-skip"]
  : (function() {
  return shenjs_call_tail(shen_put, [Arg4275_0, [shen_type_symbol, "shen-source"], Arg4275_1, (shenjs_globals["shen_shen-*property-vector*"])]);}))},
  2,
  [],
  "shen-record-source"];
shenjs_functions["shen_shen-record-source"] = shen_record_source;






shen_compile$_to$_lambda$plus$ = [shen_type_func,
  function shen_user_lambda4278(Arg4277) {
  if (Arg4277.length < 2) return [shen_type_func, shen_user_lambda4278, 2, Arg4277];
  var Arg4277_0 = Arg4277[0], Arg4277_1 = Arg4277[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_aritycheck, [Arg4277_0, Arg4277_1])),
  shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4280(Arg4279) {
  if (Arg4279.length < 2) return [shen_type_func, shen_user_lambda4280, 2, Arg4279];
  var Arg4279_0 = Arg4279[0], Arg4279_1 = Arg4279[1];
  return (function() {
  return shenjs_call_tail(shen_free$_variable$_check, [Arg4279_0, Arg4279_1]);})},
  2,
  [Arg4277_0]], Arg4277_1]),
  (R0 = shenjs_call(shen_parameters, [R0])),
  (R1 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4282(Arg4281) {
  if (Arg4281.length < 1) return [shen_type_func, shen_user_lambda4282, 1, Arg4281];
  var Arg4281_0 = Arg4281[0];
  return (function() {
  return shenjs_call_tail(shen_linearise, [Arg4281_0]);})},
  1,
  []], shenjs_call(shen_strip_protect, [Arg4277_1])])),
  (R1 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4284(Arg4283) {
  if (Arg4283.length < 1) return [shen_type_func, shen_user_lambda4284, 1, Arg4283];
  var Arg4283_0 = Arg4283[0];
  return (function() {
  return shenjs_call_tail(shen_abstract$_rule, [Arg4283_0]);})},
  1,
  []], R1])),
  (R1 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4286(Arg4285) {
  if (Arg4285.length < 2) return [shen_type_func, shen_user_lambda4286, 2, Arg4285];
  var Arg4285_0 = Arg4285[0], Arg4285_1 = Arg4285[1];
  return (function() {
  return shenjs_call_tail(shen_application$_build, [Arg4285_0, Arg4285_1]);})},
  2,
  [R0]], R1])),
  [shen_type_cons, R0, [shen_type_cons, R1, []]])},
  2,
  [],
  "shen-compile_to_lambda+"];
shenjs_functions["shen_shen-compile_to_lambda+"] = shen_compile$_to$_lambda$plus$;






shen_free$_variable$_check = [shen_type_func,
  function shen_user_lambda4288(Arg4287) {
  if (Arg4287.length < 2) return [shen_type_func, shen_user_lambda4288, 2, Arg4287];
  var Arg4287_0 = Arg4287[0], Arg4287_1 = Arg4287[1];
  var R0;
  return (((shenjs_is_type(Arg4287_1, shen_type_cons) && (shenjs_is_type(Arg4287_1[2], shen_type_cons) && shenjs_empty$question$(Arg4287_1[2][2]))))
  ? ((R0 = shenjs_call(shen_extract$_vars, [Arg4287_1[1]])),
  (R0 = shenjs_call(shen_extract$_free$_vars, [R0, Arg4287_1[2][1]])),
  (function() {
  return shenjs_call_tail(shen_free$_variable$_warnings, [Arg4287_0, R0]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-free_variable_check"]]);}))},
  2,
  [],
  "shen-free_variable_check"];
shenjs_functions["shen_shen-free_variable_check"] = shen_free$_variable$_check;






shen_extract$_vars = [shen_type_func,
  function shen_user_lambda4290(Arg4289) {
  if (Arg4289.length < 1) return [shen_type_func, shen_user_lambda4290, 1, Arg4289];
  var Arg4289_0 = Arg4289[0];
  return ((shenjs_call(shen_variable$question$, [Arg4289_0]))
  ? [shen_type_cons, Arg4289_0, []]
  : ((shenjs_is_type(Arg4289_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_union, [shenjs_call(shen_extract$_vars, [Arg4289_0[1]]), shenjs_call(shen_extract$_vars, [Arg4289_0[2]])]);})
  : []))},
  1,
  [],
  "shen-extract_vars"];
shenjs_functions["shen_shen-extract_vars"] = shen_extract$_vars;






shen_extract$_free$_vars = [shen_type_func,
  function shen_user_lambda4292(Arg4291) {
  if (Arg4291.length < 2) return [shen_type_func, shen_user_lambda4292, 2, Arg4291];
  var Arg4291_0 = Arg4291[0], Arg4291_1 = Arg4291[1];
  return (((shenjs_is_type(Arg4291_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "protect"], Arg4291_1[1])) && (shenjs_is_type(Arg4291_1[2], shen_type_cons) && shenjs_empty$question$(Arg4291_1[2][2])))))
  ? []
  : (((shenjs_call(shen_variable$question$, [Arg4291_1]) && (!shenjs_call(shen_element$question$, [Arg4291_1, Arg4291_0]))))
  ? [shen_type_cons, Arg4291_1, []]
  : (((shenjs_is_type(Arg4291_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "lambda"], Arg4291_1[1])) && (shenjs_is_type(Arg4291_1[2], shen_type_cons) && (shenjs_is_type(Arg4291_1[2][2], shen_type_cons) && shenjs_empty$question$(Arg4291_1[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_extract$_free$_vars, [[shen_type_cons, Arg4291_1[2][1], Arg4291_0], Arg4291_1[2][2][1]]);})
  : (((shenjs_is_type(Arg4291_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg4291_1[1])) && (shenjs_is_type(Arg4291_1[2], shen_type_cons) && (shenjs_is_type(Arg4291_1[2][2], shen_type_cons) && (shenjs_is_type(Arg4291_1[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4291_1[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(shen_union, [shenjs_call(shen_extract$_free$_vars, [Arg4291_0, Arg4291_1[2][2][1]]), shenjs_call(shen_extract$_free$_vars, [[shen_type_cons, Arg4291_1[2][1], Arg4291_0], Arg4291_1[2][2][2][1]])]);})
  : ((shenjs_is_type(Arg4291_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_union, [shenjs_call(shen_extract$_free$_vars, [Arg4291_0, Arg4291_1[1]]), shenjs_call(shen_extract$_free$_vars, [Arg4291_0, Arg4291_1[2]])]);})
  : [])))))},
  2,
  [],
  "shen-extract_free_vars"];
shenjs_functions["shen_shen-extract_free_vars"] = shen_extract$_free$_vars;






shen_free$_variable$_warnings = [shen_type_func,
  function shen_user_lambda4294(Arg4293) {
  if (Arg4293.length < 2) return [shen_type_func, shen_user_lambda4294, 2, Arg4293];
  var Arg4293_0 = Arg4293[0], Arg4293_1 = Arg4293[1];
  return ((shenjs_empty$question$(Arg4293_1))
  ? [shen_type_symbol, "_"]
  : (function() {
  return shenjs_call_tail(shen_interror, ["error: the following variables are free in ~A: ~A", [shen_tuple, Arg4293_0, [shen_tuple, shenjs_call(shen_list$_variables, [Arg4293_1]), []]]]);}))},
  2,
  [],
  "shen-free_variable_warnings"];
shenjs_functions["shen_shen-free_variable_warnings"] = shen_free$_variable$_warnings;






shen_list$_variables = [shen_type_func,
  function shen_user_lambda4296(Arg4295) {
  if (Arg4295.length < 1) return [shen_type_func, shen_user_lambda4296, 1, Arg4295];
  var Arg4295_0 = Arg4295[0];
  return (((shenjs_is_type(Arg4295_0, shen_type_cons) && shenjs_empty$question$(Arg4295_0[2])))
  ? (shenjs_str(Arg4295_0[1]) + ".")
  : ((shenjs_is_type(Arg4295_0, shen_type_cons))
  ? (shenjs_str(Arg4295_0[1]) + (", " + shenjs_call(shen_list$_variables, [Arg4295_0[2]])))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-list_variables"]]);})))},
  1,
  [],
  "shen-list_variables"];
shenjs_functions["shen_shen-list_variables"] = shen_list$_variables;






shen_strip_protect = [shen_type_func,
  function shen_user_lambda4298(Arg4297) {
  if (Arg4297.length < 1) return [shen_type_func, shen_user_lambda4298, 1, Arg4297];
  var Arg4297_0 = Arg4297[0];
  return (((shenjs_is_type(Arg4297_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "protect"], Arg4297_0[1])) && (shenjs_is_type(Arg4297_0[2], shen_type_cons) && shenjs_empty$question$(Arg4297_0[2][2])))))
  ? Arg4297_0[2][1]
  : ((shenjs_is_type(Arg4297_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_strip_protect, [Arg4297_0[1]]), shenjs_call(shen_strip_protect, [Arg4297_0[2]])]
  : Arg4297_0))},
  1,
  [],
  "shen-strip-protect"];
shenjs_functions["shen_shen-strip-protect"] = shen_strip_protect;






shen_linearise = [shen_type_func,
  function shen_user_lambda4300(Arg4299) {
  if (Arg4299.length < 1) return [shen_type_func, shen_user_lambda4300, 1, Arg4299];
  var Arg4299_0 = Arg4299[0];
  return (((shenjs_is_type(Arg4299_0, shen_type_cons) && (shenjs_is_type(Arg4299_0[2], shen_type_cons) && shenjs_empty$question$(Arg4299_0[2][2]))))
  ? (function() {
  return shenjs_call_tail(shen_linearise$_help, [shenjs_call(shen_flatten, [Arg4299_0[1]]), Arg4299_0[1], Arg4299_0[2][1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-linearise"]]);}))},
  1,
  [],
  "shen-linearise"];
shenjs_functions["shen_shen-linearise"] = shen_linearise;






shen_flatten = [shen_type_func,
  function shen_user_lambda4302(Arg4301) {
  if (Arg4301.length < 1) return [shen_type_func, shen_user_lambda4302, 1, Arg4301];
  var Arg4301_0 = Arg4301[0];
  return ((shenjs_empty$question$(Arg4301_0))
  ? []
  : ((shenjs_is_type(Arg4301_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(shen_flatten, [Arg4301_0[1]]), shenjs_call(shen_flatten, [Arg4301_0[2]])]);})
  : [shen_type_cons, Arg4301_0, []]))},
  1,
  [],
  "shen-flatten"];
shenjs_functions["shen_shen-flatten"] = shen_flatten;






shen_linearise$_help = [shen_type_func,
  function shen_user_lambda4304(Arg4303) {
  if (Arg4303.length < 3) return [shen_type_func, shen_user_lambda4304, 3, Arg4303];
  var Arg4303_0 = Arg4303[0], Arg4303_1 = Arg4303[1], Arg4303_2 = Arg4303[2];
  var R0, R1;
  return ((shenjs_empty$question$(Arg4303_0))
  ? [shen_type_cons, Arg4303_1, [shen_type_cons, Arg4303_2, []]]
  : ((shenjs_is_type(Arg4303_0, shen_type_cons))
  ? (((shenjs_call(shen_variable$question$, [Arg4303_0[1]]) && shenjs_call(shen_element$question$, [Arg4303_0[1], Arg4303_0[2]])))
  ? ((R0 = shenjs_call(shen_gensym, [Arg4303_0[1]])),
  (R1 = [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, Arg4303_0[1], [shen_type_cons, R0, []]]], [shen_type_cons, Arg4303_2, []]]]),
  (R0 = shenjs_call(shen_linearise$_X, [Arg4303_0[1], R0, Arg4303_1])),
  (function() {
  return shenjs_call_tail(shen_linearise$_help, [Arg4303_0[2], R0, R1]);}))
  : (function() {
  return shenjs_call_tail(shen_linearise$_help, [Arg4303_0[2], Arg4303_1, Arg4303_2]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-linearise_help"]]);})))},
  3,
  [],
  "shen-linearise_help"];
shenjs_functions["shen_shen-linearise_help"] = shen_linearise$_help;






shen_linearise$_X = [shen_type_func,
  function shen_user_lambda4306(Arg4305) {
  if (Arg4305.length < 3) return [shen_type_func, shen_user_lambda4306, 3, Arg4305];
  var Arg4305_0 = Arg4305[0], Arg4305_1 = Arg4305[1], Arg4305_2 = Arg4305[2];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4305_2, Arg4305_0)))
  ? Arg4305_1
  : ((shenjs_is_type(Arg4305_2, shen_type_cons))
  ? ((R0 = shenjs_call(shen_linearise$_X, [Arg4305_0, Arg4305_1, Arg4305_2[1]])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, Arg4305_2[1])))
  ? [shen_type_cons, Arg4305_2[1], shenjs_call(shen_linearise$_X, [Arg4305_0, Arg4305_1, Arg4305_2[2]])]
  : [shen_type_cons, R0, Arg4305_2[2]]))
  : Arg4305_2))},
  3,
  [],
  "shen-linearise_X"];
shenjs_functions["shen_shen-linearise_X"] = shen_linearise$_X;






shen_aritycheck = [shen_type_func,
  function shen_user_lambda4308(Arg4307) {
  if (Arg4307.length < 2) return [shen_type_func, shen_user_lambda4308, 2, Arg4307];
  var Arg4307_0 = Arg4307[0], Arg4307_1 = Arg4307[1];
  return (((shenjs_is_type(Arg4307_1, shen_type_cons) && (shenjs_is_type(Arg4307_1[1], shen_type_cons) && (shenjs_is_type(Arg4307_1[1][2], shen_type_cons) && (shenjs_empty$question$(Arg4307_1[1][2][2]) && shenjs_empty$question$(Arg4307_1[2]))))))
  ? (shenjs_call(shen_aritycheck_action, [Arg4307_1[1][2][1]]),
  (function() {
  return shenjs_call_tail(shen_aritycheck_name, [Arg4307_0, shenjs_call(shen_arity, [Arg4307_0]), shenjs_call(shen_length, [Arg4307_1[1][1]])]);}))
  : (((shenjs_is_type(Arg4307_1, shen_type_cons) && (shenjs_is_type(Arg4307_1[1], shen_type_cons) && (shenjs_is_type(Arg4307_1[1][2], shen_type_cons) && (shenjs_empty$question$(Arg4307_1[1][2][2]) && (shenjs_is_type(Arg4307_1[2], shen_type_cons) && (shenjs_is_type(Arg4307_1[2][1], shen_type_cons) && (shenjs_is_type(Arg4307_1[2][1][2], shen_type_cons) && shenjs_empty$question$(Arg4307_1[2][1][2][2])))))))))
  ? ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_length, [Arg4307_1[1][1]]), shenjs_call(shen_length, [Arg4307_1[2][1][1]]))))
  ? (shenjs_call(shen_aritycheck_action, [[shen_type_symbol, "Action"]]),
  (function() {
  return shenjs_call_tail(shen_aritycheck, [Arg4307_0, Arg4307_1[2]]);}))
  : (function() {
  return shenjs_call_tail(shen_interror, ["arity error in ~A~%", [shen_tuple, Arg4307_0, []]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-aritycheck"]]);})))},
  2,
  [],
  "shen-aritycheck"];
shenjs_functions["shen_shen-aritycheck"] = shen_aritycheck;






shen_aritycheck_name = [shen_type_func,
  function shen_user_lambda4310(Arg4309) {
  if (Arg4309.length < 3) return [shen_type_func, shen_user_lambda4310, 3, Arg4309];
  var Arg4309_0 = Arg4309[0], Arg4309_1 = Arg4309[1], Arg4309_2 = Arg4309[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(-1, Arg4309_1)))
  ? Arg4309_2
  : ((shenjs_unwind_tail(shenjs_$eq$(Arg4309_2, Arg4309_1)))
  ? Arg4309_2
  : (shenjs_call(shen_intoutput, ["~%warning: changing the arity of ~A can cause errors.~%", [shen_tuple, Arg4309_0, []]]),
  Arg4309_2)))},
  3,
  [],
  "shen-aritycheck-name"];
shenjs_functions["shen_shen-aritycheck-name"] = shen_aritycheck_name;






shen_aritycheck_action = [shen_type_func,
  function shen_user_lambda4312(Arg4311) {
  if (Arg4311.length < 1) return [shen_type_func, shen_user_lambda4312, 1, Arg4311];
  var Arg4311_0 = Arg4311[0];
  return ((shenjs_is_type(Arg4311_0, shen_type_cons))
  ? (shenjs_call(shen_aah, [Arg4311_0[1], Arg4311_0[2]]),
  (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda4314(Arg4313) {
  if (Arg4313.length < 1) return [shen_type_func, shen_user_lambda4314, 1, Arg4313];
  var Arg4313_0 = Arg4313[0];
  return (function() {
  return shenjs_call_tail(shen_aritycheck_action, [Arg4313_0]);})},
  1,
  []], Arg4311_0]);}))
  : [shen_type_symbol, "shen-skip"])},
  1,
  [],
  "shen-aritycheck-action"];
shenjs_functions["shen_shen-aritycheck-action"] = shen_aritycheck_action;






shen_aah = [shen_type_func,
  function shen_user_lambda4316(Arg4315) {
  if (Arg4315.length < 2) return [shen_type_func, shen_user_lambda4316, 2, Arg4315];
  var Arg4315_0 = Arg4315[0], Arg4315_1 = Arg4315[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_arity, [Arg4315_0])),
  (R1 = shenjs_call(shen_length, [Arg4315_1])),
  ((((R0 > -1) && (R1 > R0)))
  ? (function() {
  return shenjs_call_tail(shen_intoutput, ["warning: ~A might not like ~A argument~A.~%", [shen_tuple, Arg4315_0, [shen_tuple, R1, [shen_tuple, (((R1 > 1))
  ? "s"
  : ""), []]]]]);})
  : [shen_type_symbol, "shen-skip"]))},
  2,
  [],
  "shen-aah"];
shenjs_functions["shen_shen-aah"] = shen_aah;






shen_abstract$_rule = [shen_type_func,
  function shen_user_lambda4318(Arg4317) {
  if (Arg4317.length < 1) return [shen_type_func, shen_user_lambda4318, 1, Arg4317];
  var Arg4317_0 = Arg4317[0];
  return (((shenjs_is_type(Arg4317_0, shen_type_cons) && (shenjs_is_type(Arg4317_0[2], shen_type_cons) && shenjs_empty$question$(Arg4317_0[2][2]))))
  ? (function() {
  return shenjs_call_tail(shen_abstraction$_build, [Arg4317_0[1], Arg4317_0[2][1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-abstract_rule"]]);}))},
  1,
  [],
  "shen-abstract_rule"];
shenjs_functions["shen_shen-abstract_rule"] = shen_abstract$_rule;






shen_abstraction$_build = [shen_type_func,
  function shen_user_lambda4320(Arg4319) {
  if (Arg4319.length < 2) return [shen_type_func, shen_user_lambda4320, 2, Arg4319];
  var Arg4319_0 = Arg4319[0], Arg4319_1 = Arg4319[1];
  return ((shenjs_empty$question$(Arg4319_0))
  ? Arg4319_1
  : ((shenjs_is_type(Arg4319_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg4319_0[1], [shen_type_cons, shenjs_call(shen_abstraction$_build, [Arg4319_0[2], Arg4319_1]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-abstraction_build"]]);})))},
  2,
  [],
  "shen-abstraction_build"];
shenjs_functions["shen_shen-abstraction_build"] = shen_abstraction$_build;






shen_parameters = [shen_type_func,
  function shen_user_lambda4322(Arg4321) {
  if (Arg4321.length < 1) return [shen_type_func, shen_user_lambda4322, 1, Arg4321];
  var Arg4321_0 = Arg4321[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg4321_0)))
  ? []
  : [shen_type_cons, shenjs_call(shen_gensym, [[shen_type_symbol, "V"]]), shenjs_call(shen_parameters, [(Arg4321_0 - 1)])])},
  1,
  [],
  "shen-parameters"];
shenjs_functions["shen_shen-parameters"] = shen_parameters;






shen_application$_build = [shen_type_func,
  function shen_user_lambda4324(Arg4323) {
  if (Arg4323.length < 2) return [shen_type_func, shen_user_lambda4324, 2, Arg4323];
  var Arg4323_0 = Arg4323[0], Arg4323_1 = Arg4323[1];
  return ((shenjs_empty$question$(Arg4323_0))
  ? Arg4323_1
  : ((shenjs_is_type(Arg4323_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_application$_build, [Arg4323_0[2], [shen_type_cons, Arg4323_1, [shen_type_cons, Arg4323_0[1], []]]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-application_build"]]);})))},
  2,
  [],
  "shen-application_build"];
shenjs_functions["shen_shen-application_build"] = shen_application$_build;






shen_compile$_to$_kl = [shen_type_func,
  function shen_user_lambda4326(Arg4325) {
  if (Arg4325.length < 2) return [shen_type_func, shen_user_lambda4326, 2, Arg4325];
  var Arg4325_0 = Arg4325[0], Arg4325_1 = Arg4325[1];
  var R0;
  return (((shenjs_is_type(Arg4325_1, shen_type_cons) && (shenjs_is_type(Arg4325_1[2], shen_type_cons) && shenjs_empty$question$(Arg4325_1[2][2]))))
  ? (shenjs_call(shen_store_arity, [Arg4325_0, shenjs_call(shen_length, [Arg4325_1[1]])]),
  (R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4328(Arg4327) {
  if (Arg4327.length < 1) return [shen_type_func, shen_user_lambda4328, 1, Arg4327];
  var Arg4327_0 = Arg4327[0];
  return (function() {
  return shenjs_call_tail(shen_reduce, [Arg4327_0]);})},
  1,
  []], Arg4325_1[2][1]])),
  (R0 = shenjs_call(shen_cond_expression, [Arg4325_0, Arg4325_1[1], R0])),
  (R0 = [shen_type_cons, [shen_type_symbol, "defun"], [shen_type_cons, Arg4325_0, [shen_type_cons, Arg4325_1[1], [shen_type_cons, R0, []]]]]),
  R0)
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-compile_to_kl"]]);}))},
  2,
  [],
  "shen-compile_to_kl"];
shenjs_functions["shen_shen-compile_to_kl"] = shen_compile$_to$_kl;






shen_store_arity = [shen_type_func,
  function shen_user_lambda4330(Arg4329) {
  if (Arg4329.length < 2) return [shen_type_func, shen_user_lambda4330, 2, Arg4329];
  var Arg4329_0 = Arg4329[0], Arg4329_1 = Arg4329[1];
  return (((shenjs_globals["shen_shen-*installing-kl*"]))
  ? [shen_type_symbol, "shen-skip"]
  : (function() {
  return shenjs_call_tail(shen_put, [Arg4329_0, [shen_type_symbol, "arity"], Arg4329_1, (shenjs_globals["shen_shen-*property-vector*"])]);}))},
  2,
  [],
  "shen-store-arity"];
shenjs_functions["shen_shen-store-arity"] = shen_store_arity;






shen_reduce = [shen_type_func,
  function shen_user_lambda4332(Arg4331) {
  if (Arg4331.length < 1) return [shen_type_func, shen_user_lambda4332, 1, Arg4331];
  var Arg4331_0 = Arg4331[0];
  var R0;
  return ((shenjs_globals["shen_shen-*teststack*"] = []),
  (R0 = shenjs_call(shen_reduce$_help, [Arg4331_0])),
  [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-tests"], shenjs_call(shen_reverse, [(shenjs_globals["shen_shen-*teststack*"])])], [shen_type_cons, R0, []]])},
  1,
  [],
  "shen-reduce"];
shenjs_functions["shen_shen-reduce"] = shen_reduce;






shen_reduce$_help = [shen_type_func,
  function shen_user_lambda4334(Arg4333) {
  if (Arg4333.length < 1) return [shen_type_func, shen_user_lambda4334, 1, Arg4333];
  var Arg4333_0 = Arg4333[0];
  var R0;
  return (((shenjs_is_type(Arg4333_0, shen_type_cons) && (shenjs_is_type(Arg4333_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4333_0[1][1])) && (shenjs_is_type(Arg4333_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4333_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg4333_0[1][2][1][1])) && (shenjs_is_type(Arg4333_0[1][2][1][2], shen_type_cons) && (shenjs_is_type(Arg4333_0[1][2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4333_0[1][2][1][2][2][2]) && (shenjs_is_type(Arg4333_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4333_0[1][2][2][2]) && (shenjs_is_type(Arg4333_0[2], shen_type_cons) && shenjs_empty$question$(Arg4333_0[2][2]))))))))))))))
  ? (shenjs_call(shen_add$_test, [[shen_type_cons, [shen_type_symbol, "cons?"], Arg4333_0[2]]]),
  (R0 = [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg4333_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg4333_0[1][2][1][2][2][1], [shen_type_cons, shenjs_call(shen_ebr, [Arg4333_0[2][1], Arg4333_0[1][2][1], Arg4333_0[1][2][2][1]]), []]]], []]]]),
  (R0 = [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hd"], Arg4333_0[2]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tl"], Arg4333_0[2]], []]]),
  (function() {
  return shenjs_call_tail(shen_reduce$_help, [R0]);}))
  : (((shenjs_is_type(Arg4333_0, shen_type_cons) && (shenjs_is_type(Arg4333_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4333_0[1][1])) && (shenjs_is_type(Arg4333_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4333_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@p"], Arg4333_0[1][2][1][1])) && (shenjs_is_type(Arg4333_0[1][2][1][2], shen_type_cons) && (shenjs_is_type(Arg4333_0[1][2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4333_0[1][2][1][2][2][2]) && (shenjs_is_type(Arg4333_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4333_0[1][2][2][2]) && (shenjs_is_type(Arg4333_0[2], shen_type_cons) && shenjs_empty$question$(Arg4333_0[2][2]))))))))))))))
  ? (shenjs_call(shen_add$_test, [[shen_type_cons, [shen_type_symbol, "tuple?"], Arg4333_0[2]]]),
  (R0 = [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg4333_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg4333_0[1][2][1][2][2][1], [shen_type_cons, shenjs_call(shen_ebr, [Arg4333_0[2][1], Arg4333_0[1][2][1], Arg4333_0[1][2][2][1]]), []]]], []]]]),
  (R0 = [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], Arg4333_0[2]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "snd"], Arg4333_0[2]], []]]),
  (function() {
  return shenjs_call_tail(shen_reduce$_help, [R0]);}))
  : (((shenjs_is_type(Arg4333_0, shen_type_cons) && (shenjs_is_type(Arg4333_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4333_0[1][1])) && (shenjs_is_type(Arg4333_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4333_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@v"], Arg4333_0[1][2][1][1])) && (shenjs_is_type(Arg4333_0[1][2][1][2], shen_type_cons) && (shenjs_is_type(Arg4333_0[1][2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4333_0[1][2][1][2][2][2]) && (shenjs_is_type(Arg4333_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4333_0[1][2][2][2]) && (shenjs_is_type(Arg4333_0[2], shen_type_cons) && shenjs_empty$question$(Arg4333_0[2][2]))))))))))))))
  ? (shenjs_call(shen_add$_test, [[shen_type_cons, [shen_type_symbol, "shen-+vector?"], Arg4333_0[2]]]),
  (R0 = [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg4333_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg4333_0[1][2][1][2][2][1], [shen_type_cons, shenjs_call(shen_ebr, [Arg4333_0[2][1], Arg4333_0[1][2][1], Arg4333_0[1][2][2][1]]), []]]], []]]]),
  (R0 = [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hdv"], Arg4333_0[2]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tlv"], Arg4333_0[2]], []]]),
  (function() {
  return shenjs_call_tail(shen_reduce$_help, [R0]);}))
  : (((shenjs_is_type(Arg4333_0, shen_type_cons) && (shenjs_is_type(Arg4333_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4333_0[1][1])) && (shenjs_is_type(Arg4333_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4333_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], Arg4333_0[1][2][1][1])) && (shenjs_is_type(Arg4333_0[1][2][1][2], shen_type_cons) && (shenjs_is_type(Arg4333_0[1][2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4333_0[1][2][1][2][2][2]) && (shenjs_is_type(Arg4333_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4333_0[1][2][2][2]) && (shenjs_is_type(Arg4333_0[2], shen_type_cons) && shenjs_empty$question$(Arg4333_0[2][2]))))))))))))))
  ? (shenjs_call(shen_add$_test, [[shen_type_cons, [shen_type_symbol, "shen-+string?"], Arg4333_0[2]]]),
  (R0 = [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg4333_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg4333_0[1][2][1][2][2][1], [shen_type_cons, shenjs_call(shen_ebr, [Arg4333_0[2][1], Arg4333_0[1][2][1], Arg4333_0[1][2][2][1]]), []]]], []]]]),
  (R0 = [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "pos"], [shen_type_cons, Arg4333_0[2][1], [shen_type_cons, 0, []]]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tlstr"], Arg4333_0[2]], []]]),
  (function() {
  return shenjs_call_tail(shen_reduce$_help, [R0]);}))
  : (((shenjs_is_type(Arg4333_0, shen_type_cons) && (shenjs_is_type(Arg4333_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4333_0[1][1])) && (shenjs_is_type(Arg4333_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4333_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4333_0[1][2][2][2]) && (shenjs_is_type(Arg4333_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4333_0[2][2]) && (!shenjs_call(shen_variable$question$, [Arg4333_0[1][2][1]])))))))))))
  ? (shenjs_call(shen_add$_test, [[shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, Arg4333_0[1][2][1], Arg4333_0[2]]]]),
  (function() {
  return shenjs_call_tail(shen_reduce$_help, [Arg4333_0[1][2][2][1]]);}))
  : (((shenjs_is_type(Arg4333_0, shen_type_cons) && (shenjs_is_type(Arg4333_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4333_0[1][1])) && (shenjs_is_type(Arg4333_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4333_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4333_0[1][2][2][2]) && (shenjs_is_type(Arg4333_0[2], shen_type_cons) && shenjs_empty$question$(Arg4333_0[2][2])))))))))
  ? (function() {
  return shenjs_call_tail(shen_reduce$_help, [shenjs_call(shen_ebr, [Arg4333_0[2][1], Arg4333_0[1][2][1], Arg4333_0[1][2][2][1]])]);})
  : (((shenjs_is_type(Arg4333_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "where"], Arg4333_0[1])) && (shenjs_is_type(Arg4333_0[2], shen_type_cons) && (shenjs_is_type(Arg4333_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4333_0[2][2][2]))))))
  ? (shenjs_call(shen_add$_test, [Arg4333_0[2][1]]),
  (function() {
  return shenjs_call_tail(shen_reduce$_help, [Arg4333_0[2][2][1]]);}))
  : (((shenjs_is_type(Arg4333_0, shen_type_cons) && (shenjs_is_type(Arg4333_0[2], shen_type_cons) && shenjs_empty$question$(Arg4333_0[2][2]))))
  ? ((R0 = shenjs_call(shen_reduce$_help, [Arg4333_0[1]])),
  ((shenjs_unwind_tail(shenjs_$eq$(Arg4333_0[1], R0)))
  ? Arg4333_0
  : (function() {
  return shenjs_call_tail(shen_reduce$_help, [[shen_type_cons, R0, Arg4333_0[2]]]);})))
  : Arg4333_0))))))))},
  1,
  [],
  "shen-reduce_help"];
shenjs_functions["shen_shen-reduce_help"] = shen_reduce$_help;






shen_$plus$string$question$ = [shen_type_func,
  function shen_user_lambda4336(Arg4335) {
  if (Arg4335.length < 1) return [shen_type_func, shen_user_lambda4336, 1, Arg4335];
  var Arg4335_0 = Arg4335[0];
  return ((shenjs_unwind_tail(shenjs_$eq$("", Arg4335_0)))
  ? false
  : (typeof(Arg4335_0) == 'string'))},
  1,
  [],
  "shen-+string?"];
shenjs_functions["shen_shen-+string?"] = shen_$plus$string$question$;






shen_$plus$vector = [shen_type_func,
  function shen_user_lambda4338(Arg4337) {
  if (Arg4337.length < 1) return [shen_type_func, shen_user_lambda4338, 1, Arg4337];
  var Arg4337_0 = Arg4337[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4337_0, shenjs_vector(0))))
  ? false
  : (function() {
  return shenjs_vector$question$(Arg4337_0);}))},
  1,
  [],
  "shen-+vector"];
shenjs_functions["shen_shen-+vector"] = shen_$plus$vector;






shen_ebr = [shen_type_func,
  function shen_user_lambda4340(Arg4339) {
  if (Arg4339.length < 3) return [shen_type_func, shen_user_lambda4340, 3, Arg4339];
  var Arg4339_0 = Arg4339[0], Arg4339_1 = Arg4339[1], Arg4339_2 = Arg4339[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4339_2, Arg4339_1)))
  ? Arg4339_0
  : (((shenjs_is_type(Arg4339_2, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4339_2[1])) && (shenjs_is_type(Arg4339_2[2], shen_type_cons) && (shenjs_is_type(Arg4339_2[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4339_2[2][2][2]) && (shenjs_call(shen_occurrences, [Arg4339_1, Arg4339_2[2][1]]) > 0)))))))
  ? Arg4339_2
  : (((shenjs_is_type(Arg4339_2, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg4339_2[1])) && (shenjs_is_type(Arg4339_2[2], shen_type_cons) && (shenjs_is_type(Arg4339_2[2][2], shen_type_cons) && (shenjs_is_type(Arg4339_2[2][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4339_2[2][2][2][2]) && shenjs_unwind_tail(shenjs_$eq$(Arg4339_2[2][1], Arg4339_1)))))))))
  ? [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, Arg4339_2[2][1], [shen_type_cons, shenjs_call(shen_ebr, [Arg4339_0, Arg4339_2[2][1], Arg4339_2[2][2][1]]), Arg4339_2[2][2][2]]]]
  : ((shenjs_is_type(Arg4339_2, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_ebr, [Arg4339_0, Arg4339_1, Arg4339_2[1]]), shenjs_call(shen_ebr, [Arg4339_0, Arg4339_1, Arg4339_2[2]])]
  : Arg4339_2))))},
  3,
  [],
  "shen-ebr"];
shenjs_functions["shen_shen-ebr"] = shen_ebr;






shen_add$_test = [shen_type_func,
  function shen_user_lambda4342(Arg4341) {
  if (Arg4341.length < 1) return [shen_type_func, shen_user_lambda4342, 1, Arg4341];
  var Arg4341_0 = Arg4341[0];
  return (shenjs_globals["shen_shen-*teststack*"] = [shen_type_cons, Arg4341_0, (shenjs_globals["shen_shen-*teststack*"])])},
  1,
  [],
  "shen-add_test"];
shenjs_functions["shen_shen-add_test"] = shen_add$_test;






shen_cond_expression = [shen_type_func,
  function shen_user_lambda4344(Arg4343) {
  if (Arg4343.length < 3) return [shen_type_func, shen_user_lambda4344, 3, Arg4343];
  var Arg4343_0 = Arg4343[0], Arg4343_1 = Arg4343[1], Arg4343_2 = Arg4343[2];
  var R0;
  return ((R0 = shenjs_call(shen_err_condition, [Arg4343_0])),
  (R0 = shenjs_call(shen_case_form, [Arg4343_2, R0])),
  (R0 = shenjs_call(shen_encode_choices, [R0, Arg4343_0])),
  (function() {
  return shenjs_call_tail(shen_cond_form, [R0]);}))},
  3,
  [],
  "shen-cond-expression"];
shenjs_functions["shen_shen-cond-expression"] = shen_cond_expression;






shen_cond_form = [shen_type_func,
  function shen_user_lambda4346(Arg4345) {
  if (Arg4345.length < 1) return [shen_type_func, shen_user_lambda4346, 1, Arg4345];
  var Arg4345_0 = Arg4345[0];
  return (((shenjs_is_type(Arg4345_0, shen_type_cons) && (shenjs_is_type(Arg4345_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg4345_0[1][1])) && (shenjs_is_type(Arg4345_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg4345_0[1][2][2]))))))
  ? Arg4345_0[1][2][1]
  : [shen_type_cons, [shen_type_symbol, "cond"], Arg4345_0])},
  1,
  [],
  "shen-cond-form"];
shenjs_functions["shen_shen-cond-form"] = shen_cond_form;






shen_encode_choices = [shen_type_func,
  function shen_user_lambda4348(Arg4347) {
  if (Arg4347.length < 2) return [shen_type_func, shen_user_lambda4348, 2, Arg4347];
  var Arg4347_0 = Arg4347[0], Arg4347_1 = Arg4347[1];
  return ((shenjs_empty$question$(Arg4347_0))
  ? []
  : (((shenjs_is_type(Arg4347_0, shen_type_cons) && (shenjs_is_type(Arg4347_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg4347_0[1][1])) && (shenjs_is_type(Arg4347_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4347_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-choicepoint!"], Arg4347_0[1][2][1][1])) && (shenjs_is_type(Arg4347_0[1][2][1][2], shen_type_cons) && (shenjs_empty$question$(Arg4347_0[1][2][1][2][2]) && (shenjs_empty$question$(Arg4347_0[1][2][2]) && shenjs_empty$question$(Arg4347_0[2])))))))))))
  ? [shen_type_cons, [shen_type_cons, true, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg4347_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]]], [shen_type_cons, (((shenjs_globals["shen_shen-*installing-kl*"]))
  ? [shen_type_cons, [shen_type_symbol, "shen-sys-error"], [shen_type_cons, Arg4347_1, []]]
  : [shen_type_cons, [shen_type_symbol, "shen-f_error"], [shen_type_cons, Arg4347_1, []]]), [shen_type_cons, [shen_type_symbol, "Result"], []]]]], []]]]], []]], []]
  : (((shenjs_is_type(Arg4347_0, shen_type_cons) && (shenjs_is_type(Arg4347_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg4347_0[1][1])) && (shenjs_is_type(Arg4347_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4347_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-choicepoint!"], Arg4347_0[1][2][1][1])) && (shenjs_is_type(Arg4347_0[1][2][1][2], shen_type_cons) && (shenjs_empty$question$(Arg4347_0[1][2][1][2][2]) && shenjs_empty$question$(Arg4347_0[1][2][2]))))))))))
  ? [shen_type_cons, [shen_type_cons, true, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg4347_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]]], [shen_type_cons, shenjs_call(shen_cond_form, [shenjs_call(shen_encode_choices, [Arg4347_0[2], Arg4347_1])]), [shen_type_cons, [shen_type_symbol, "Result"], []]]]], []]]]], []]], []]
  : (((shenjs_is_type(Arg4347_0, shen_type_cons) && (shenjs_is_type(Arg4347_0[1], shen_type_cons) && (shenjs_is_type(Arg4347_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4347_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-choicepoint!"], Arg4347_0[1][2][1][1])) && (shenjs_is_type(Arg4347_0[1][2][1][2], shen_type_cons) && (shenjs_empty$question$(Arg4347_0[1][2][1][2][2]) && shenjs_empty$question$(Arg4347_0[1][2][2])))))))))
  ? [shen_type_cons, [shen_type_cons, true, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Freeze"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "freeze"], [shen_type_cons, shenjs_call(shen_cond_form, [shenjs_call(shen_encode_choices, [Arg4347_0[2], Arg4347_1])]), []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, Arg4347_0[1][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg4347_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, [shen_type_symbol, "Freeze"], []]], [shen_type_cons, [shen_type_symbol, "Result"], []]]]], []]]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, [shen_type_symbol, "Freeze"], []]], []]]]], []]]]], []]], []]
  : (((shenjs_is_type(Arg4347_0, shen_type_cons) && (shenjs_is_type(Arg4347_0[1], shen_type_cons) && (shenjs_is_type(Arg4347_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg4347_0[1][2][2])))))
  ? [shen_type_cons, Arg4347_0[1], shenjs_call(shen_encode_choices, [Arg4347_0[2], Arg4347_1])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-encode-choices"]]);}))))))},
  2,
  [],
  "shen-encode-choices"];
shenjs_functions["shen_shen-encode-choices"] = shen_encode_choices;






shen_case_form = [shen_type_func,
  function shen_user_lambda4350(Arg4349) {
  if (Arg4349.length < 2) return [shen_type_func, shen_user_lambda4350, 2, Arg4349];
  var Arg4349_0 = Arg4349[0], Arg4349_1 = Arg4349[1];
  return ((shenjs_empty$question$(Arg4349_0))
  ? [shen_type_cons, Arg4349_1, []]
  : (((shenjs_is_type(Arg4349_0, shen_type_cons) && (shenjs_is_type(Arg4349_0[1], shen_type_cons) && (shenjs_is_type(Arg4349_0[1][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-tests"], Arg4349_0[1][1][1])) && (shenjs_empty$question$(Arg4349_0[1][1][2]) && (shenjs_is_type(Arg4349_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4349_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-choicepoint!"], Arg4349_0[1][2][1][1])) && (shenjs_is_type(Arg4349_0[1][2][1][2], shen_type_cons) && (shenjs_empty$question$(Arg4349_0[1][2][1][2][2]) && shenjs_empty$question$(Arg4349_0[1][2][2]))))))))))))
  ? [shen_type_cons, [shen_type_cons, true, Arg4349_0[1][2]], shenjs_call(shen_case_form, [Arg4349_0[2], Arg4349_1])]
  : (((shenjs_is_type(Arg4349_0, shen_type_cons) && (shenjs_is_type(Arg4349_0[1], shen_type_cons) && (shenjs_is_type(Arg4349_0[1][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-tests"], Arg4349_0[1][1][1])) && (shenjs_empty$question$(Arg4349_0[1][1][2]) && (shenjs_is_type(Arg4349_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg4349_0[1][2][2]))))))))
  ? [shen_type_cons, [shen_type_cons, true, Arg4349_0[1][2]], []]
  : (((shenjs_is_type(Arg4349_0, shen_type_cons) && (shenjs_is_type(Arg4349_0[1], shen_type_cons) && (shenjs_is_type(Arg4349_0[1][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-tests"], Arg4349_0[1][1][1])) && (shenjs_is_type(Arg4349_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg4349_0[1][2][2])))))))
  ? [shen_type_cons, [shen_type_cons, shenjs_call(shen_embed_and, [Arg4349_0[1][1][2]]), Arg4349_0[1][2]], shenjs_call(shen_case_form, [Arg4349_0[2], Arg4349_1])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-case-form"]]);})))))},
  2,
  [],
  "shen-case-form"];
shenjs_functions["shen_shen-case-form"] = shen_case_form;






shen_embed_and = [shen_type_func,
  function shen_user_lambda4352(Arg4351) {
  if (Arg4351.length < 1) return [shen_type_func, shen_user_lambda4352, 1, Arg4351];
  var Arg4351_0 = Arg4351[0];
  return (((shenjs_is_type(Arg4351_0, shen_type_cons) && shenjs_empty$question$(Arg4351_0[2])))
  ? Arg4351_0[1]
  : ((shenjs_is_type(Arg4351_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, Arg4351_0[1], [shen_type_cons, shenjs_call(shen_embed_and, [Arg4351_0[2]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-embed-and"]]);})))},
  1,
  [],
  "shen-embed-and"];
shenjs_functions["shen_shen-embed-and"] = shen_embed_and;






shen_err_condition = [shen_type_func,
  function shen_user_lambda4354(Arg4353) {
  if (Arg4353.length < 1) return [shen_type_func, shen_user_lambda4354, 1, Arg4353];
  var Arg4353_0 = Arg4353[0];
  return (((shenjs_globals["shen_shen-*installing-kl*"]))
  ? [shen_type_cons, true, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-sys-error"], [shen_type_cons, Arg4353_0, []]], []]]
  : [shen_type_cons, true, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-f_error"], [shen_type_cons, Arg4353_0, []]], []]])},
  1,
  [],
  "shen-err-condition"];
shenjs_functions["shen_shen-err-condition"] = shen_err_condition;






shen_sys_error = [shen_type_func,
  function shen_user_lambda4356(Arg4355) {
  if (Arg4355.length < 1) return [shen_type_func, shen_user_lambda4356, 1, Arg4355];
  var Arg4355_0 = Arg4355[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["system function ~A: unexpected argument~%", [shen_tuple, Arg4355_0, []]]);})},
  1,
  [],
  "shen-sys-error"];
shenjs_functions["shen_shen-sys-error"] = shen_sys_error;


















shen_eval = [shen_type_func,
  function shen_user_lambda5073(Arg5072) {
  if (Arg5072.length < 1) return [shen_type_func, shen_user_lambda5073, 1, Arg5072];
  var Arg5072_0 = Arg5072[0];
  var R0;
  return ((R0 = shenjs_call(shen_walk, [[shen_type_func,
  function shen_user_lambda5075(Arg5074) {
  if (Arg5074.length < 1) return [shen_type_func, shen_user_lambda5075, 1, Arg5074];
  var Arg5074_0 = Arg5074[0];
  return (function() {
  return shenjs_call_tail(shen_macroexpand, [Arg5074_0]);})},
  1,
  []], Arg5072_0])),
  ((shenjs_call(shen_packaged$question$, [R0]))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda5077(Arg5076) {
  if (Arg5076.length < 1) return [shen_type_func, shen_user_lambda5077, 1, Arg5076];
  var Arg5076_0 = Arg5076[0];
  return (function() {
  return shenjs_call_tail(shen_eval_without_macros, [Arg5076_0]);})},
  1,
  []], shenjs_call(shen_package_contents, [R0])]);})
  : (function() {
  return shenjs_call_tail(shen_eval_without_macros, [R0]);})))},
  1,
  [],
  "eval"];
shenjs_functions["shen_eval"] = shen_eval;






shen_eval_without_macros = [shen_type_func,
  function shen_user_lambda5079(Arg5078) {
  if (Arg5078.length < 1) return [shen_type_func, shen_user_lambda5079, 1, Arg5078];
  var Arg5078_0 = Arg5078[0];
  return (function() {
  return shenjs_eval_kl(shenjs_call(shen_elim_define, [shenjs_call(shen_proc_input$plus$, [Arg5078_0])]));})},
  1,
  [],
  "shen-eval-without-macros"];
shenjs_functions["shen_shen-eval-without-macros"] = shen_eval_without_macros;






shen_proc_input$plus$ = [shen_type_func,
  function shen_user_lambda5081(Arg5080) {
  if (Arg5080.length < 1) return [shen_type_func, shen_user_lambda5081, 1, Arg5080];
  var Arg5080_0 = Arg5080[0];
  return (((shenjs_is_type(Arg5080_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "input+"], Arg5080_0[1])) && (shenjs_is_type(Arg5080_0[2], shen_type_cons) && (shenjs_is_type(Arg5080_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg5080_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "input+"], [shen_type_cons, Arg5080_0[2][1], [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg5080_0[2][2][1]]), []]]]
  : ((shenjs_is_type(Arg5080_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda5083(Arg5082) {
  if (Arg5082.length < 1) return [shen_type_func, shen_user_lambda5083, 1, Arg5082];
  var Arg5082_0 = Arg5082[0];
  return (function() {
  return shenjs_call_tail(shen_proc_input$plus$, [Arg5082_0]);})},
  1,
  []], Arg5080_0]);})
  : Arg5080_0))},
  1,
  [],
  "shen-proc-input+"];
shenjs_functions["shen_shen-proc-input+"] = shen_proc_input$plus$;






shen_elim_define = [shen_type_func,
  function shen_user_lambda5085(Arg5084) {
  if (Arg5084.length < 1) return [shen_type_func, shen_user_lambda5085, 1, Arg5084];
  var Arg5084_0 = Arg5084[0];
  return (((shenjs_is_type(Arg5084_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "define"], Arg5084_0[1])) && shenjs_is_type(Arg5084_0[2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_shen_$gt$kl, [Arg5084_0[2][1], Arg5084_0[2][2]]);})
  : ((shenjs_is_type(Arg5084_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda5087(Arg5086) {
  if (Arg5086.length < 1) return [shen_type_func, shen_user_lambda5087, 1, Arg5086];
  var Arg5086_0 = Arg5086[0];
  return (function() {
  return shenjs_call_tail(shen_elim_define, [Arg5086_0]);})},
  1,
  []], Arg5084_0]);})
  : Arg5084_0))},
  1,
  [],
  "shen-elim-define"];
shenjs_functions["shen_shen-elim-define"] = shen_elim_define;






shen_packaged$question$ = [shen_type_func,
  function shen_user_lambda5089(Arg5088) {
  if (Arg5088.length < 1) return [shen_type_func, shen_user_lambda5089, 1, Arg5088];
  var Arg5088_0 = Arg5088[0];
  return (((shenjs_is_type(Arg5088_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg5088_0[1])) && (shenjs_is_type(Arg5088_0[2], shen_type_cons) && shenjs_is_type(Arg5088_0[2][2], shen_type_cons)))))
  ? true
  : false)},
  1,
  [],
  "shen-packaged?"];
shenjs_functions["shen_shen-packaged?"] = shen_packaged$question$;






shen_external = [shen_type_func,
  function shen_user_lambda5091(Arg5090) {
  if (Arg5090.length < 1) return [shen_type_func, shen_user_lambda5091, 1, Arg5090];
  var Arg5090_0 = Arg5090[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg5090_0, [shen_type_symbol, "shen-external-symbols"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda5093(Arg5092) {
  if (Arg5092.length < 2) return [shen_type_func, shen_user_lambda5093, 2, Arg5092];
  var Arg5092_0 = Arg5092[0], Arg5092_1 = Arg5092[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["package ~A has not been used.~%", [shen_tuple, Arg5092_0, []]]);})},
  2,
  [Arg5090_0]]);})},
  1,
  [],
  "external"];
shenjs_functions["shen_external"] = shen_external;






shen_package_contents = [shen_type_func,
  function shen_user_lambda5095(Arg5094) {
  if (Arg5094.length < 1) return [shen_type_func, shen_user_lambda5095, 1, Arg5094];
  var Arg5094_0 = Arg5094[0];
  return (((shenjs_is_type(Arg5094_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg5094_0[1])) && (shenjs_is_type(Arg5094_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "null"], Arg5094_0[2][1])) && shenjs_is_type(Arg5094_0[2][2], shen_type_cons))))))
  ? Arg5094_0[2][2][2]
  : (((shenjs_is_type(Arg5094_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg5094_0[1])) && (shenjs_is_type(Arg5094_0[2], shen_type_cons) && shenjs_is_type(Arg5094_0[2][2], shen_type_cons)))))
  ? (function() {
  return shenjs_call_tail(shen_packageh, [Arg5094_0[2][1], Arg5094_0[2][2][1], [shen_type_symbol, "Code"]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-package-contents"]]);})))},
  1,
  [],
  "shen-package-contents"];
shenjs_functions["shen_shen-package-contents"] = shen_package_contents;






shen_walk = [shen_type_func,
  function shen_user_lambda5097(Arg5096) {
  if (Arg5096.length < 2) return [shen_type_func, shen_user_lambda5097, 2, Arg5096];
  var Arg5096_0 = Arg5096[0], Arg5096_1 = Arg5096[1];
  return ((shenjs_is_type(Arg5096_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(Arg5096_0, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5099(Arg5098) {
  if (Arg5098.length < 2) return [shen_type_func, shen_user_lambda5099, 2, Arg5098];
  var Arg5098_0 = Arg5098[0], Arg5098_1 = Arg5098[1];
  return (function() {
  return shenjs_call_tail(shen_walk, [Arg5098_0, Arg5098_1]);})},
  2,
  [Arg5096_0]], Arg5096_1])]);})
  : (function() {
  return shenjs_call_tail(Arg5096_0, [Arg5096_1]);}))},
  2,
  [],
  "shen-walk"];
shenjs_functions["shen_shen-walk"] = shen_walk;






shen_compile = [shen_type_func,
  function shen_user_lambda5101(Arg5100) {
  if (Arg5100.length < 3) return [shen_type_func, shen_user_lambda5101, 3, Arg5100];
  var Arg5100_0 = Arg5100[0], Arg5100_1 = Arg5100[1], Arg5100_2 = Arg5100[2];
  var R0;
  return ((R0 = shenjs_call(Arg5100_0, [[shen_tuple, Arg5100_1, []]])),
  (((shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0)) || (!shenjs_empty$question$(shenjs_call(shen_fst, [R0])))))
  ? (function() {
  return shenjs_call_tail(shen_compile_error, [R0, Arg5100_2]);})
  : (function() {
  return shenjs_call_tail(shen_snd, [R0]);})))},
  3,
  [],
  "compile"];
shenjs_functions["shen_compile"] = shen_compile;






shen_compile_error = [shen_type_func,
  function shen_user_lambda5103(Arg5102) {
  if (Arg5102.length < 2) return [shen_type_func, shen_user_lambda5103, 2, Arg5102];
  var Arg5102_0 = Arg5102[0], Arg5102_1 = Arg5102[1];
  return ((shenjs_empty$question$(Arg5102_1))
  ? shen_fail_obj
  : (((shenjs_is_type(Arg5102_0, shen_tuple) && shenjs_is_type(shenjs_call(shen_fst, [Arg5102_0]), shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(Arg5102_1, [shenjs_call(shen_fst, [Arg5102_0])]);})
  : (function() {
  return shenjs_call_tail(shen_interror, ["syntax error~%", []]);})))},
  2,
  [],
  "shen-compile-error"];
shenjs_functions["shen_shen-compile-error"] = shen_compile_error;






shen_$lt$e$gt$ = [shen_type_func,
  function shen_user_lambda5105(Arg5104) {
  if (Arg5104.length < 1) return [shen_type_func, shen_user_lambda5105, 1, Arg5104];
  var Arg5104_0 = Arg5104[0];
  return ((shenjs_is_type(Arg5104_0, shen_tuple))
  ? [shen_tuple, shenjs_call(shen_fst, [Arg5104_0]), []]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "<e>"]]);}))},
  1,
  [],
  "<e>"];
shenjs_functions["shen_<e>"] = shen_$lt$e$gt$;






shen_fail_if = [shen_type_func,
  function shen_user_lambda5107(Arg5106) {
  if (Arg5106.length < 2) return [shen_type_func, shen_user_lambda5107, 2, Arg5106];
  var Arg5106_0 = Arg5106[0], Arg5106_1 = Arg5106[1];
  return ((shenjs_call(Arg5106_0, [Arg5106_1]))
  ? shen_fail_obj
  : Arg5106_1)},
  2,
  [],
  "fail-if"];
shenjs_functions["shen_fail-if"] = shen_fail_if;






shen_$at$s = [shen_type_func,
  function shen_user_lambda5109(Arg5108) {
  if (Arg5108.length < 2) return [shen_type_func, shen_user_lambda5109, 2, Arg5108];
  var Arg5108_0 = Arg5108[0], Arg5108_1 = Arg5108[1];
  return (Arg5108_0 + Arg5108_1)},
  2,
  [],
  "@s"];
shenjs_functions["shen_@s"] = shen_$at$s;






shen_tc$question$ = [shen_type_func,
  function shen_user_lambda5111(Arg5110) {
  if (Arg5110.length < 1) return [shen_type_func, shen_user_lambda5111, 1, Arg5110];
  var Arg5110_0 = Arg5110[0];
  return (shenjs_globals["shen_shen-*tc*"])},
  1,
  [],
  "tc?"];
shenjs_functions["shen_tc?"] = shen_tc$question$;






shen_ps = [shen_type_func,
  function shen_user_lambda5113(Arg5112) {
  if (Arg5112.length < 1) return [shen_type_func, shen_user_lambda5113, 1, Arg5112];
  var Arg5112_0 = Arg5112[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg5112_0, [shen_type_symbol, "shen-source"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda5115(Arg5114) {
  if (Arg5114.length < 2) return [shen_type_func, shen_user_lambda5115, 2, Arg5114];
  var Arg5114_0 = Arg5114[0], Arg5114_1 = Arg5114[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["~A not found.~%", [shen_tuple, Arg5114_0, []]]);})},
  2,
  [Arg5112_0]]);})},
  1,
  [],
  "ps"];
shenjs_functions["shen_ps"] = shen_ps;






shen_explode = [shen_type_func,
  function shen_user_lambda5117(Arg5116) {
  if (Arg5116.length < 1) return [shen_type_func, shen_user_lambda5117, 1, Arg5116];
  var Arg5116_0 = Arg5116[0];
  return (((typeof(Arg5116_0) == 'string'))
  ? (function() {
  return shenjs_call_tail(shen_explode_string, [Arg5116_0]);})
  : (function() {
  return shenjs_call_tail(shen_explode, [shenjs_call(shen_intmake_string, ["~A", [shen_tuple, Arg5116_0, []]])]);}))},
  1,
  [],
  "explode"];
shenjs_functions["shen_explode"] = shen_explode;






shen_explode_string = [shen_type_func,
  function shen_user_lambda5119(Arg5118) {
  if (Arg5118.length < 1) return [shen_type_func, shen_user_lambda5119, 1, Arg5118];
  var Arg5118_0 = Arg5118[0];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$("", Arg5118_0)))
  ? []
  : ((R0 = Arg5118_0[0]),
  (R1 = shenjs_tlstr(Arg5118_0)),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, [shen_type_symbol, "shen-eos"])))
  ? []
  : [shen_type_cons, R0, shenjs_call(shen_explode_string, [R1])])))},
  1,
  [],
  "shen-explode-string"];
shenjs_functions["shen_shen-explode-string"] = shen_explode_string;






shen_stinput = [shen_type_func,
  function shen_user_lambda5121(Arg5120) {
  if (Arg5120.length < 1) return [shen_type_func, shen_user_lambda5121, 1, Arg5120];
  var Arg5120_0 = Arg5120[0];
  return (shenjs_globals["shen_*stinput*"])},
  1,
  [],
  "stinput"];
shenjs_functions["shen_stinput"] = shen_stinput;






shen_$plus$vector$question$ = [shen_type_func,
  function shen_user_lambda5123(Arg5122) {
  if (Arg5122.length < 1) return [shen_type_func, shen_user_lambda5123, 1, Arg5122];
  var Arg5122_0 = Arg5122[0];
  return (shenjs_absvector$question$(Arg5122_0) && (shenjs_absvector_ref(Arg5122_0, 0) > 0))},
  1,
  [],
  "shen-+vector?"];
shenjs_functions["shen_shen-+vector?"] = shen_$plus$vector$question$;












shen_fillvector = [shen_type_func,
  function shen_user_lambda5126(Arg5125) {
  if (Arg5125.length < 4) return [shen_type_func, shen_user_lambda5126, 4, Arg5125];
  var Arg5125_0 = Arg5125[0], Arg5125_1 = Arg5125[1], Arg5125_2 = Arg5125[2], Arg5125_3 = Arg5125[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5125_2, Arg5125_1)))
  ? shenjs_absvector_set(Arg5125_0, Arg5125_2, Arg5125_3)
  : (function() {
  return shenjs_call_tail(shen_fillvector, [shenjs_absvector_set(Arg5125_0, Arg5125_1, Arg5125_3), (1 + Arg5125_1), Arg5125_2, Arg5125_3]);}))},
  4,
  [],
  "shen-fillvector"];
shenjs_functions["shen_shen-fillvector"] = shen_fillvector;












shen_vector_$gt$ = [shen_type_func,
  function shen_user_lambda5129(Arg5128) {
  if (Arg5128.length < 3) return [shen_type_func, shen_user_lambda5129, 3, Arg5128];
  var Arg5128_0 = Arg5128[0], Arg5128_1 = Arg5128[1], Arg5128_2 = Arg5128[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5128_1, 0)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["cannot access 0th element of a vector~%", []]);})
  : shenjs_absvector_set(Arg5128_0, Arg5128_1, Arg5128_2))},
  3,
  [],
  "vector->"];
shenjs_functions["shen_vector->"] = shen_vector_$gt$;






shen_$lt$_vector = [shen_type_func,
  function shen_user_lambda5131(Arg5130) {
  if (Arg5130.length < 2) return [shen_type_func, shen_user_lambda5131, 2, Arg5130];
  var Arg5130_0 = Arg5130[0], Arg5130_1 = Arg5130[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5130_1, 0)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["cannot access 0th element of a vector~%", []]);})
  : ((R0 = shenjs_absvector_ref(Arg5130_0, Arg5130_1)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["vector element not found~%", []]);})
  : R0)))},
  2,
  [],
  "<-vector"];
shenjs_functions["shen_<-vector"] = shen_$lt$_vector;






shen_posint$question$ = [shen_type_func,
  function shen_user_lambda5133(Arg5132) {
  if (Arg5132.length < 1) return [shen_type_func, shen_user_lambda5133, 1, Arg5132];
  var Arg5132_0 = Arg5132[0];
  return (shenjs_call(shen_integer$question$, [Arg5132_0]) && (Arg5132_0 >= 0))},
  1,
  [],
  "shen-posint?"];
shenjs_functions["shen_shen-posint?"] = shen_posint$question$;






shen_limit = [shen_type_func,
  function shen_user_lambda5135(Arg5134) {
  if (Arg5134.length < 1) return [shen_type_func, shen_user_lambda5135, 1, Arg5134];
  var Arg5134_0 = Arg5134[0];
  return shenjs_absvector_ref(Arg5134_0, 0)},
  1,
  [],
  "limit"];
shenjs_functions["shen_limit"] = shen_limit;












shen_analyse_symbol$question$ = [shen_type_func,
  function shen_user_lambda5138(Arg5137) {
  if (Arg5137.length < 1) return [shen_type_func, shen_user_lambda5138, 1, Arg5137];
  var Arg5137_0 = Arg5137[0];
  return ((shenjs_is_type(Arg5137_0, shen_type_cons))
  ? (shenjs_call(shen_alpha$question$, [Arg5137_0[1]]) && shenjs_call(shen_alphanums$question$, [Arg5137_0[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-analyse-symbol?"]]);}))},
  1,
  [],
  "shen-analyse-symbol?"];
shenjs_functions["shen_shen-analyse-symbol?"] = shen_analyse_symbol$question$;






shen_alpha$question$ = [shen_type_func,
  function shen_user_lambda5140(Arg5139) {
  if (Arg5139.length < 1) return [shen_type_func, shen_user_lambda5140, 1, Arg5139];
  var Arg5139_0 = Arg5139[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5139_0, [shen_type_cons, "A", [shen_type_cons, "B", [shen_type_cons, "C", [shen_type_cons, "D", [shen_type_cons, "E", [shen_type_cons, "F", [shen_type_cons, "G", [shen_type_cons, "H", [shen_type_cons, "I", [shen_type_cons, "J", [shen_type_cons, "K", [shen_type_cons, "L", [shen_type_cons, "M", [shen_type_cons, "N", [shen_type_cons, "O", [shen_type_cons, "P", [shen_type_cons, "Q", [shen_type_cons, "R", [shen_type_cons, "S", [shen_type_cons, "T", [shen_type_cons, "U", [shen_type_cons, "V", [shen_type_cons, "W", [shen_type_cons, "X", [shen_type_cons, "Y", [shen_type_cons, "Z", [shen_type_cons, "a", [shen_type_cons, "b", [shen_type_cons, "c", [shen_type_cons, "d", [shen_type_cons, "e", [shen_type_cons, "f", [shen_type_cons, "g", [shen_type_cons, "h", [shen_type_cons, "i", [shen_type_cons, "j", [shen_type_cons, "k", [shen_type_cons, "l", [shen_type_cons, "m", [shen_type_cons, "n", [shen_type_cons, "o", [shen_type_cons, "p", [shen_type_cons, "q", [shen_type_cons, "r", [shen_type_cons, "s", [shen_type_cons, "t", [shen_type_cons, "u", [shen_type_cons, "v", [shen_type_cons, "w", [shen_type_cons, "x", [shen_type_cons, "y", [shen_type_cons, "z", [shen_type_cons, "=", [shen_type_cons, "*", [shen_type_cons, "/", [shen_type_cons, "+", [shen_type_cons, "-", [shen_type_cons, "_", [shen_type_cons, "?", [shen_type_cons, "$", [shen_type_cons, "!", [shen_type_cons, "@", [shen_type_cons, "~", [shen_type_cons, ">", [shen_type_cons, "<", [shen_type_cons, "&", [shen_type_cons, "%", [shen_type_cons, "{", [shen_type_cons, "}", [shen_type_cons, ":", [shen_type_cons, ";", [shen_type_cons, "`", [shen_type_cons, "#", [shen_type_cons, "'", [shen_type_cons, ".", []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]);})},
  1,
  [],
  "shen-alpha?"];
shenjs_functions["shen_shen-alpha?"] = shen_alpha$question$;






shen_alphanums$question$ = [shen_type_func,
  function shen_user_lambda5142(Arg5141) {
  if (Arg5141.length < 1) return [shen_type_func, shen_user_lambda5142, 1, Arg5141];
  var Arg5141_0 = Arg5141[0];
  return ((shenjs_empty$question$(Arg5141_0))
  ? true
  : ((shenjs_is_type(Arg5141_0, shen_type_cons))
  ? (shenjs_call(shen_alphanum$question$, [Arg5141_0[1]]) && shenjs_call(shen_alphanums$question$, [Arg5141_0[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-alphanums?"]]);})))},
  1,
  [],
  "shen-alphanums?"];
shenjs_functions["shen_shen-alphanums?"] = shen_alphanums$question$;






shen_alphanum$question$ = [shen_type_func,
  function shen_user_lambda5144(Arg5143) {
  if (Arg5143.length < 1) return [shen_type_func, shen_user_lambda5144, 1, Arg5143];
  var Arg5143_0 = Arg5143[0];
  return (shenjs_call(shen_alpha$question$, [Arg5143_0]) || shenjs_call(shen_digit$question$, [Arg5143_0]))},
  1,
  [],
  "shen-alphanum?"];
shenjs_functions["shen_shen-alphanum?"] = shen_alphanum$question$;






shen_digit$question$ = [shen_type_func,
  function shen_user_lambda5146(Arg5145) {
  if (Arg5145.length < 1) return [shen_type_func, shen_user_lambda5146, 1, Arg5145];
  var Arg5145_0 = Arg5145[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5145_0, [shen_type_cons, "1", [shen_type_cons, "2", [shen_type_cons, "3", [shen_type_cons, "4", [shen_type_cons, "5", [shen_type_cons, "6", [shen_type_cons, "7", [shen_type_cons, "8", [shen_type_cons, "9", [shen_type_cons, "0", []]]]]]]]]]]]);})},
  1,
  [],
  "shen-digit?"];
shenjs_functions["shen_shen-digit?"] = shen_digit$question$;






shen_variable$question$ = [shen_type_func,
  function shen_user_lambda5148(Arg5147) {
  if (Arg5147.length < 1) return [shen_type_func, shen_user_lambda5148, 1, Arg5147];
  var Arg5147_0 = Arg5147[0];
  var R0;
  return (((shenjs_boolean$question$(Arg5147_0) || ((typeof(Arg5147_0) == 'number') || (typeof(Arg5147_0) == 'string'))))
  ? false
  : (function() {
  return shenjs_trap_error(function() {return ((R0 = shenjs_call(shen_explode, [Arg5147_0])),
  shenjs_call(shen_analyse_variable$question$, [R0]));}, [shen_type_func,
  function shen_user_lambda5150(Arg5149) {
  if (Arg5149.length < 1) return [shen_type_func, shen_user_lambda5150, 1, Arg5149];
  var Arg5149_0 = Arg5149[0];
  return false},
  1,
  []]);}))},
  1,
  [],
  "variable?"];
shenjs_functions["shen_variable?"] = shen_variable$question$;






shen_analyse_variable$question$ = [shen_type_func,
  function shen_user_lambda5152(Arg5151) {
  if (Arg5151.length < 1) return [shen_type_func, shen_user_lambda5152, 1, Arg5151];
  var Arg5151_0 = Arg5151[0];
  return ((shenjs_is_type(Arg5151_0, shen_type_cons))
  ? (shenjs_call(shen_uppercase$question$, [Arg5151_0[1]]) && shenjs_call(shen_alphanums$question$, [Arg5151_0[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-analyse-variable?"]]);}))},
  1,
  [],
  "shen-analyse-variable?"];
shenjs_functions["shen_shen-analyse-variable?"] = shen_analyse_variable$question$;






shen_uppercase$question$ = [shen_type_func,
  function shen_user_lambda5154(Arg5153) {
  if (Arg5153.length < 1) return [shen_type_func, shen_user_lambda5154, 1, Arg5153];
  var Arg5153_0 = Arg5153[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5153_0, [shen_type_cons, "A", [shen_type_cons, "B", [shen_type_cons, "C", [shen_type_cons, "D", [shen_type_cons, "E", [shen_type_cons, "F", [shen_type_cons, "G", [shen_type_cons, "H", [shen_type_cons, "I", [shen_type_cons, "J", [shen_type_cons, "K", [shen_type_cons, "L", [shen_type_cons, "M", [shen_type_cons, "N", [shen_type_cons, "O", [shen_type_cons, "P", [shen_type_cons, "Q", [shen_type_cons, "R", [shen_type_cons, "S", [shen_type_cons, "T", [shen_type_cons, "U", [shen_type_cons, "V", [shen_type_cons, "W", [shen_type_cons, "X", [shen_type_cons, "Y", [shen_type_cons, "Z", []]]]]]]]]]]]]]]]]]]]]]]]]]]]);})},
  1,
  [],
  "shen-uppercase?"];
shenjs_functions["shen_shen-uppercase?"] = shen_uppercase$question$;






shen_gensym = [shen_type_func,
  function shen_user_lambda5156(Arg5155) {
  if (Arg5155.length < 1) return [shen_type_func, shen_user_lambda5156, 1, Arg5155];
  var Arg5155_0 = Arg5155[0];
  return (function() {
  return shenjs_call_tail(shen_concat, [Arg5155_0, (shenjs_globals["shen_shen-*gensym*"] = (1 + (shenjs_globals["shen_shen-*gensym*"])))]);})},
  1,
  [],
  "gensym"];
shenjs_functions["shen_gensym"] = shen_gensym;






shen_concat = [shen_type_func,
  function shen_user_lambda5158(Arg5157) {
  if (Arg5157.length < 2) return [shen_type_func, shen_user_lambda5158, 2, Arg5157];
  var Arg5157_0 = Arg5157[0], Arg5157_1 = Arg5157[1];
  return (function() {
  return shenjs_intern((shenjs_str(Arg5157_0) + shenjs_str(Arg5157_1)));})},
  2,
  [],
  "concat"];
shenjs_functions["shen_concat"] = shen_concat;












shen_fst = [shen_type_func,
  function shen_user_lambda5161(Arg5160) {
  if (Arg5160.length < 1) return [shen_type_func, shen_user_lambda5161, 1, Arg5160];
  var Arg5160_0 = Arg5160[0];
  return shenjs_absvector_ref(Arg5160_0, 1)},
  1,
  [],
  "fst"];
shenjs_functions["shen_fst"] = shen_fst;






shen_snd = [shen_type_func,
  function shen_user_lambda5163(Arg5162) {
  if (Arg5162.length < 1) return [shen_type_func, shen_user_lambda5163, 1, Arg5162];
  var Arg5162_0 = Arg5162[0];
  return shenjs_absvector_ref(Arg5162_0, 2)},
  1,
  [],
  "snd"];
shenjs_functions["shen_snd"] = shen_snd;






shen_tuple$question$ = [shen_type_func,
  function shen_user_lambda5165(Arg5164) {
  if (Arg5164.length < 1) return [shen_type_func, shen_user_lambda5165, 1, Arg5164];
  var Arg5164_0 = Arg5164[0];
  return (function() {
  return shenjs_trap_error(function() {return (shenjs_absvector$question$(Arg5164_0) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-tuple"], shenjs_absvector_ref(Arg5164_0, 0))));}, [shen_type_func,
  function shen_user_lambda5167(Arg5166) {
  if (Arg5166.length < 1) return [shen_type_func, shen_user_lambda5167, 1, Arg5166];
  var Arg5166_0 = Arg5166[0];
  return false},
  1,
  []]);})},
  1,
  [],
  "tuple?"];
shenjs_functions["shen_tuple?"] = shen_tuple$question$;






shen_append = [shen_type_func,
  function shen_user_lambda5169(Arg5168) {
  if (Arg5168.length < 2) return [shen_type_func, shen_user_lambda5169, 2, Arg5168];
  var Arg5168_0 = Arg5168[0], Arg5168_1 = Arg5168[1];
  return ((shenjs_empty$question$(Arg5168_0))
  ? Arg5168_1
  : ((shenjs_is_type(Arg5168_0, shen_type_cons))
  ? [shen_type_cons, Arg5168_0[1], shenjs_call(shen_append, [Arg5168_0[2], Arg5168_1])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "append"]]);})))},
  2,
  [],
  "append"];
shenjs_functions["shen_append"] = shen_append;






shen_$at$v = [shen_type_func,
  function shen_user_lambda5171(Arg5170) {
  if (Arg5170.length < 2) return [shen_type_func, shen_user_lambda5171, 2, Arg5170];
  var Arg5170_0 = Arg5170[0], Arg5170_1 = Arg5170[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_limit, [Arg5170_1])),
  (R1 = shenjs_vector((R0 + 1))),
  (R1 = shenjs_call(shen_vector_$gt$, [R1, 1, Arg5170_0])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, 0)))
  ? R1
  : (function() {
  return shenjs_call_tail(shen_$at$v_help, [Arg5170_1, 1, R0, R1]);})))},
  2,
  [],
  "@v"];
shenjs_functions["shen_@v"] = shen_$at$v;






shen_$at$v_help = [shen_type_func,
  function shen_user_lambda5173(Arg5172) {
  if (Arg5172.length < 4) return [shen_type_func, shen_user_lambda5173, 4, Arg5172];
  var Arg5172_0 = Arg5172[0], Arg5172_1 = Arg5172[1], Arg5172_2 = Arg5172[2], Arg5172_3 = Arg5172[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5172_2, Arg5172_1)))
  ? (function() {
  return shenjs_call_tail(shen_copyfromvector, [Arg5172_0, Arg5172_3, Arg5172_2, (Arg5172_2 + 1)]);})
  : (function() {
  return shenjs_call_tail(shen_$at$v_help, [Arg5172_0, (Arg5172_1 + 1), Arg5172_2, shenjs_call(shen_copyfromvector, [Arg5172_0, Arg5172_3, Arg5172_1, (Arg5172_1 + 1)])]);}))},
  4,
  [],
  "shen-@v-help"];
shenjs_functions["shen_shen-@v-help"] = shen_$at$v_help;






shen_copyfromvector = [shen_type_func,
  function shen_user_lambda5175(Arg5174) {
  if (Arg5174.length < 4) return [shen_type_func, shen_user_lambda5175, 4, Arg5174];
  var Arg5174_0 = Arg5174[0], Arg5174_1 = Arg5174[1], Arg5174_2 = Arg5174[2], Arg5174_3 = Arg5174[3];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_vector_$gt$, [Arg5174_1, Arg5174_3, shenjs_call(shen_$lt$_vector, [Arg5174_0, Arg5174_2])]);}, [shen_type_func,
  function shen_user_lambda5177(Arg5176) {
  if (Arg5176.length < 2) return [shen_type_func, shen_user_lambda5177, 2, Arg5176];
  var Arg5176_0 = Arg5176[0], Arg5176_1 = Arg5176[1];
  return Arg5176_0},
  2,
  [Arg5174_1]]);})},
  4,
  [],
  "shen-copyfromvector"];
shenjs_functions["shen_shen-copyfromvector"] = shen_copyfromvector;






shen_hdv = [shen_type_func,
  function shen_user_lambda5179(Arg5178) {
  if (Arg5178.length < 1) return [shen_type_func, shen_user_lambda5179, 1, Arg5178];
  var Arg5178_0 = Arg5178[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_$lt$_vector, [Arg5178_0, 1]);}, [shen_type_func,
  function shen_user_lambda5181(Arg5180) {
  if (Arg5180.length < 2) return [shen_type_func, shen_user_lambda5181, 2, Arg5180];
  var Arg5180_0 = Arg5180[0], Arg5180_1 = Arg5180[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["hdv needs a non-empty vector as an argument; not ~S~%", [shen_tuple, Arg5180_0, []]]);})},
  2,
  [Arg5178_0]]);})},
  1,
  [],
  "hdv"];
shenjs_functions["shen_hdv"] = shen_hdv;






shen_tlv = [shen_type_func,
  function shen_user_lambda5183(Arg5182) {
  if (Arg5182.length < 1) return [shen_type_func, shen_user_lambda5183, 1, Arg5182];
  var Arg5182_0 = Arg5182[0];
  var R0;
  return ((R0 = shenjs_call(shen_limit, [Arg5182_0])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, 0)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["cannot take the tail of the empty vector~%", []]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(R0, 1)))
  ? (function() {
  return shenjs_vector(0);})
  : (shenjs_vector((R0 - 1)),
  (function() {
  return shenjs_call_tail(shen_tlv_help, [Arg5182_0, 2, R0, shenjs_vector((R0 - 1))]);})))))},
  1,
  [],
  "tlv"];
shenjs_functions["shen_tlv"] = shen_tlv;






shen_tlv_help = [shen_type_func,
  function shen_user_lambda5185(Arg5184) {
  if (Arg5184.length < 4) return [shen_type_func, shen_user_lambda5185, 4, Arg5184];
  var Arg5184_0 = Arg5184[0], Arg5184_1 = Arg5184[1], Arg5184_2 = Arg5184[2], Arg5184_3 = Arg5184[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5184_2, Arg5184_1)))
  ? (function() {
  return shenjs_call_tail(shen_copyfromvector, [Arg5184_0, Arg5184_3, Arg5184_2, (Arg5184_2 - 1)]);})
  : (function() {
  return shenjs_call_tail(shen_tlv_help, [Arg5184_0, (Arg5184_1 + 1), Arg5184_2, shenjs_call(shen_copyfromvector, [Arg5184_0, Arg5184_3, Arg5184_1, (Arg5184_1 - 1)])]);}))},
  4,
  [],
  "shen-tlv-help"];
shenjs_functions["shen_shen-tlv-help"] = shen_tlv_help;






shen_assoc = [shen_type_func,
  function shen_user_lambda5187(Arg5186) {
  if (Arg5186.length < 2) return [shen_type_func, shen_user_lambda5187, 2, Arg5186];
  var Arg5186_0 = Arg5186[0], Arg5186_1 = Arg5186[1];
  return ((shenjs_empty$question$(Arg5186_1))
  ? []
  : (((shenjs_is_type(Arg5186_1, shen_type_cons) && (shenjs_is_type(Arg5186_1[1], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5186_1[1][1], Arg5186_0)))))
  ? Arg5186_1[1]
  : ((shenjs_is_type(Arg5186_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_assoc, [Arg5186_0, Arg5186_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "assoc"]]);}))))},
  2,
  [],
  "assoc"];
shenjs_functions["shen_assoc"] = shen_assoc;






shen_boolean$question$ = [shen_type_func,
  function shen_user_lambda5189(Arg5188) {
  if (Arg5188.length < 1) return [shen_type_func, shen_user_lambda5189, 1, Arg5188];
  var Arg5188_0 = Arg5188[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg5188_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg5188_0)))
  ? true
  : false))},
  1,
  [],
  "boolean?"];
shenjs_functions["shen_boolean?"] = shen_boolean$question$;






shen_nl = [shen_type_func,
  function shen_user_lambda5191(Arg5190) {
  if (Arg5190.length < 1) return [shen_type_func, shen_user_lambda5191, 1, Arg5190];
  var Arg5190_0 = Arg5190[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg5190_0)))
  ? 0
  : (shenjs_call(shen_intoutput, ["~%", []]),
  (function() {
  return shenjs_call_tail(shen_nl, [(Arg5190_0 - 1)]);})))},
  1,
  [],
  "nl"];
shenjs_functions["shen_nl"] = shen_nl;






shen_difference = [shen_type_func,
  function shen_user_lambda5193(Arg5192) {
  if (Arg5192.length < 2) return [shen_type_func, shen_user_lambda5193, 2, Arg5192];
  var Arg5192_0 = Arg5192[0], Arg5192_1 = Arg5192[1];
  return ((shenjs_empty$question$(Arg5192_0))
  ? []
  : ((shenjs_is_type(Arg5192_0, shen_type_cons))
  ? ((shenjs_call(shen_element$question$, [Arg5192_0[1], Arg5192_1]))
  ? (function() {
  return shenjs_call_tail(shen_difference, [Arg5192_0[2], Arg5192_1]);})
  : [shen_type_cons, Arg5192_0[1], shenjs_call(shen_difference, [Arg5192_0[2], Arg5192_1])])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "difference"]]);})))},
  2,
  [],
  "difference"];
shenjs_functions["shen_difference"] = shen_difference;






shen_do = [shen_type_func,
  function shen_user_lambda5195(Arg5194) {
  if (Arg5194.length < 2) return [shen_type_func, shen_user_lambda5195, 2, Arg5194];
  var Arg5194_0 = Arg5194[0], Arg5194_1 = Arg5194[1];
  return Arg5194_1},
  2,
  [],
  "do"];
shenjs_functions["shen_do"] = shen_do;






shen_element$question$ = [shen_type_func,
  function shen_user_lambda5197(Arg5196) {
  if (Arg5196.length < 2) return [shen_type_func, shen_user_lambda5197, 2, Arg5196];
  var Arg5196_0 = Arg5196[0], Arg5196_1 = Arg5196[1];
  return ((shenjs_empty$question$(Arg5196_1))
  ? false
  : (((shenjs_is_type(Arg5196_1, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5196_1[1], Arg5196_0))))
  ? true
  : ((shenjs_is_type(Arg5196_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5196_0, Arg5196_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "element?"]]);}))))},
  2,
  [],
  "element?"];
shenjs_functions["shen_element?"] = shen_element$question$;












shen_fix = [shen_type_func,
  function shen_user_lambda5200(Arg5199) {
  if (Arg5199.length < 2) return [shen_type_func, shen_user_lambda5200, 2, Arg5199];
  var Arg5199_0 = Arg5199[0], Arg5199_1 = Arg5199[1];
  return (function() {
  return shenjs_call_tail(shen_fix_help, [Arg5199_0, Arg5199_1, shenjs_call(Arg5199_0, [Arg5199_1])]);})},
  2,
  [],
  "fix"];
shenjs_functions["shen_fix"] = shen_fix;






shen_fix_help = [shen_type_func,
  function shen_user_lambda5202(Arg5201) {
  if (Arg5201.length < 3) return [shen_type_func, shen_user_lambda5202, 3, Arg5201];
  var Arg5201_0 = Arg5201[0], Arg5201_1 = Arg5201[1], Arg5201_2 = Arg5201[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5201_2, Arg5201_1)))
  ? Arg5201_2
  : (function() {
  return shenjs_call_tail(shen_fix_help, [Arg5201_0, Arg5201_2, shenjs_call(Arg5201_0, [Arg5201_2])]);}))},
  3,
  [],
  "shen-fix-help"];
shenjs_functions["shen_shen-fix-help"] = shen_fix_help;






shen_put = [shen_type_func,
  function shen_user_lambda5204(Arg5203) {
  if (Arg5203.length < 4) return [shen_type_func, shen_user_lambda5204, 4, Arg5203];
  var Arg5203_0 = Arg5203[0], Arg5203_1 = Arg5203[1], Arg5203_2 = Arg5203[2], Arg5203_3 = Arg5203[3];
  var R0, R1;
  return ((R0 = shenjs_call(shen_hash, [Arg5203_0, shenjs_call(shen_limit, [Arg5203_3])])),
  (R1 = shenjs_trap_error(function() {return shenjs_call(shen_$lt$_vector, [Arg5203_3, R0]);}, [shen_type_func,
  function shen_user_lambda5206(Arg5205) {
  if (Arg5205.length < 1) return [shen_type_func, shen_user_lambda5206, 1, Arg5205];
  var Arg5205_0 = Arg5205[0];
  return []},
  1,
  []])),
  shenjs_call(shen_vector_$gt$, [Arg5203_3, R0, shenjs_call(shen_change_pointer_value, [Arg5203_0, Arg5203_1, Arg5203_2, R1])]),
  Arg5203_2)},
  4,
  [],
  "put"];
shenjs_functions["shen_put"] = shen_put;






shen_change_pointer_value = [shen_type_func,
  function shen_user_lambda5208(Arg5207) {
  if (Arg5207.length < 4) return [shen_type_func, shen_user_lambda5208, 4, Arg5207];
  var Arg5207_0 = Arg5207[0], Arg5207_1 = Arg5207[1], Arg5207_2 = Arg5207[2], Arg5207_3 = Arg5207[3];
  return ((shenjs_empty$question$(Arg5207_3))
  ? [shen_type_cons, [shen_type_cons, [shen_type_cons, Arg5207_0, [shen_type_cons, Arg5207_1, []]], Arg5207_2], []]
  : (((shenjs_is_type(Arg5207_3, shen_type_cons) && (shenjs_is_type(Arg5207_3[1], shen_type_cons) && (shenjs_is_type(Arg5207_3[1][1], shen_type_cons) && (shenjs_is_type(Arg5207_3[1][1][2], shen_type_cons) && (shenjs_empty$question$(Arg5207_3[1][1][2][2]) && (shenjs_unwind_tail(shenjs_$eq$(Arg5207_3[1][1][2][1], Arg5207_1)) && shenjs_unwind_tail(shenjs_$eq$(Arg5207_3[1][1][1], Arg5207_0)))))))))
  ? [shen_type_cons, [shen_type_cons, Arg5207_3[1][1], Arg5207_2], Arg5207_3[2]]
  : ((shenjs_is_type(Arg5207_3, shen_type_cons))
  ? [shen_type_cons, Arg5207_3[1], shenjs_call(shen_change_pointer_value, [Arg5207_0, Arg5207_1, Arg5207_2, Arg5207_3[2]])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-change-pointer-value"]]);}))))},
  4,
  [],
  "shen-change-pointer-value"];
shenjs_functions["shen_shen-change-pointer-value"] = shen_change_pointer_value;






shen_get = [shen_type_func,
  function shen_user_lambda5210(Arg5209) {
  if (Arg5209.length < 3) return [shen_type_func, shen_user_lambda5210, 3, Arg5209];
  var Arg5209_0 = Arg5209[0], Arg5209_1 = Arg5209[1], Arg5209_2 = Arg5209[2];
  var R0;
  return ((R0 = shenjs_call(shen_hash, [Arg5209_0, shenjs_call(shen_limit, [Arg5209_2])])),
  (R0 = shenjs_trap_error(function() {return shenjs_call(shen_$lt$_vector, [Arg5209_2, R0]);}, [shen_type_func,
  function shen_user_lambda5212(Arg5211) {
  if (Arg5211.length < 1) return [shen_type_func, shen_user_lambda5212, 1, Arg5211];
  var Arg5211_0 = Arg5211[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["pointer not found~%", []]);})},
  1,
  []])),
  (R0 = shenjs_call(shen_assoc, [[shen_type_cons, Arg5209_0, [shen_type_cons, Arg5209_1, []]], R0])),
  ((shenjs_empty$question$(R0))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["value not found~%", []]);})
  : R0[2]))},
  3,
  [],
  "get"];
shenjs_functions["shen_get"] = shen_get;






shen_hash = [shen_type_func,
  function shen_user_lambda5214(Arg5213) {
  if (Arg5213.length < 2) return [shen_type_func, shen_user_lambda5214, 2, Arg5213];
  var Arg5213_0 = Arg5213[0], Arg5213_1 = Arg5213[1];
  var R0;
  return ((R0 = shenjs_call(shen_mod, [shenjs_call(shen_sum, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5216(Arg5215) {
  if (Arg5215.length < 1) return [shen_type_func, shen_user_lambda5216, 1, Arg5215];
  var Arg5215_0 = Arg5215[0];
  return (function() {
  return shenjs_string_$gt$n(Arg5215_0);})},
  1,
  []], shenjs_call(shen_explode, [Arg5213_0])])]), Arg5213_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(0, R0)))
  ? 1
  : R0))},
  2,
  [],
  "hash"];
shenjs_functions["shen_hash"] = shen_hash;






shen_mod = [shen_type_func,
  function shen_user_lambda5218(Arg5217) {
  if (Arg5217.length < 2) return [shen_type_func, shen_user_lambda5218, 2, Arg5217];
  var Arg5217_0 = Arg5217[0], Arg5217_1 = Arg5217[1];
  return (function() {
  return shenjs_call_tail(shen_modh, [Arg5217_0, shenjs_call(shen_multiples, [Arg5217_0, [shen_type_cons, Arg5217_1, []]])]);})},
  2,
  [],
  "shen-mod"];
shenjs_functions["shen_shen-mod"] = shen_mod;






shen_multiples = [shen_type_func,
  function shen_user_lambda5220(Arg5219) {
  if (Arg5219.length < 2) return [shen_type_func, shen_user_lambda5220, 2, Arg5219];
  var Arg5219_0 = Arg5219[0], Arg5219_1 = Arg5219[1];
  return (((shenjs_is_type(Arg5219_1, shen_type_cons) && (Arg5219_1[1] > Arg5219_0)))
  ? Arg5219_1[2]
  : ((shenjs_is_type(Arg5219_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_multiples, [Arg5219_0, [shen_type_cons, (2 * Arg5219_1[1]), Arg5219_1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-multiples"]]);})))},
  2,
  [],
  "shen-multiples"];
shenjs_functions["shen_shen-multiples"] = shen_multiples;






shen_modh = [shen_type_func,
  function shen_user_lambda5222(Arg5221) {
  if (Arg5221.length < 2) return [shen_type_func, shen_user_lambda5222, 2, Arg5221];
  var Arg5221_0 = Arg5221[0], Arg5221_1 = Arg5221[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg5221_0)))
  ? 0
  : ((shenjs_empty$question$(Arg5221_1))
  ? Arg5221_0
  : (((shenjs_is_type(Arg5221_1, shen_type_cons) && (Arg5221_1[1] > Arg5221_0)))
  ? ((shenjs_empty$question$(Arg5221_1[2]))
  ? Arg5221_0
  : (function() {
  return shenjs_call_tail(shen_modh, [Arg5221_0, Arg5221_1[2]]);}))
  : ((shenjs_is_type(Arg5221_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_modh, [(Arg5221_0 - Arg5221_1[1]), Arg5221_1]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-modh"]]);})))))},
  2,
  [],
  "shen-modh"];
shenjs_functions["shen_shen-modh"] = shen_modh;






shen_sum = [shen_type_func,
  function shen_user_lambda5224(Arg5223) {
  if (Arg5223.length < 1) return [shen_type_func, shen_user_lambda5224, 1, Arg5223];
  var Arg5223_0 = Arg5223[0];
  return ((shenjs_empty$question$(Arg5223_0))
  ? 0
  : ((shenjs_is_type(Arg5223_0, shen_type_cons))
  ? (Arg5223_0[1] + shenjs_call(shen_sum, [Arg5223_0[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "sum"]]);})))},
  1,
  [],
  "sum"];
shenjs_functions["shen_sum"] = shen_sum;






shen_head = [shen_type_func,
  function shen_user_lambda5226(Arg5225) {
  if (Arg5225.length < 1) return [shen_type_func, shen_user_lambda5226, 1, Arg5225];
  var Arg5225_0 = Arg5225[0];
  return ((shenjs_is_type(Arg5225_0, shen_type_cons))
  ? Arg5225_0[1]
  : (function() {
  return shenjs_call_tail(shen_interror, ["head expects a non-empty list", []]);}))},
  1,
  [],
  "head"];
shenjs_functions["shen_head"] = shen_head;






shen_tail = [shen_type_func,
  function shen_user_lambda5228(Arg5227) {
  if (Arg5227.length < 1) return [shen_type_func, shen_user_lambda5228, 1, Arg5227];
  var Arg5227_0 = Arg5227[0];
  return ((shenjs_is_type(Arg5227_0, shen_type_cons))
  ? Arg5227_0[2]
  : (function() {
  return shenjs_call_tail(shen_interror, ["tail expects a non-empty list", []]);}))},
  1,
  [],
  "tail"];
shenjs_functions["shen_tail"] = shen_tail;






shen_hdstr = [shen_type_func,
  function shen_user_lambda5230(Arg5229) {
  if (Arg5229.length < 1) return [shen_type_func, shen_user_lambda5230, 1, Arg5229];
  var Arg5229_0 = Arg5229[0];
  return Arg5229_0[0]},
  1,
  [],
  "hdstr"];
shenjs_functions["shen_hdstr"] = shen_hdstr;






shen_intersection = [shen_type_func,
  function shen_user_lambda5232(Arg5231) {
  if (Arg5231.length < 2) return [shen_type_func, shen_user_lambda5232, 2, Arg5231];
  var Arg5231_0 = Arg5231[0], Arg5231_1 = Arg5231[1];
  return ((shenjs_empty$question$(Arg5231_0))
  ? []
  : ((shenjs_is_type(Arg5231_0, shen_type_cons))
  ? ((shenjs_call(shen_element$question$, [Arg5231_0[1], Arg5231_1]))
  ? [shen_type_cons, Arg5231_0[1], shenjs_call(shen_intersection, [Arg5231_0[2], Arg5231_1])]
  : (function() {
  return shenjs_call_tail(shen_intersection, [Arg5231_0[2], Arg5231_1]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "intersection"]]);})))},
  2,
  [],
  "intersection"];
shenjs_functions["shen_intersection"] = shen_intersection;






shen_reverse = [shen_type_func,
  function shen_user_lambda5234(Arg5233) {
  if (Arg5233.length < 1) return [shen_type_func, shen_user_lambda5234, 1, Arg5233];
  var Arg5233_0 = Arg5233[0];
  return (function() {
  return shenjs_call_tail(shen_reverse$_help, [Arg5233_0, []]);})},
  1,
  [],
  "reverse"];
shenjs_functions["shen_reverse"] = shen_reverse;






shen_reverse$_help = [shen_type_func,
  function shen_user_lambda5236(Arg5235) {
  if (Arg5235.length < 2) return [shen_type_func, shen_user_lambda5236, 2, Arg5235];
  var Arg5235_0 = Arg5235[0], Arg5235_1 = Arg5235[1];
  return ((shenjs_empty$question$(Arg5235_0))
  ? Arg5235_1
  : ((shenjs_is_type(Arg5235_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_reverse$_help, [Arg5235_0[2], [shen_type_cons, Arg5235_0[1], Arg5235_1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-reverse_help"]]);})))},
  2,
  [],
  "shen-reverse_help"];
shenjs_functions["shen_shen-reverse_help"] = shen_reverse$_help;






shen_union = [shen_type_func,
  function shen_user_lambda5238(Arg5237) {
  if (Arg5237.length < 2) return [shen_type_func, shen_user_lambda5238, 2, Arg5237];
  var Arg5237_0 = Arg5237[0], Arg5237_1 = Arg5237[1];
  return ((shenjs_empty$question$(Arg5237_0))
  ? Arg5237_1
  : ((shenjs_is_type(Arg5237_0, shen_type_cons))
  ? ((shenjs_call(shen_element$question$, [Arg5237_0[1], Arg5237_1]))
  ? (function() {
  return shenjs_call_tail(shen_union, [Arg5237_0[2], Arg5237_1]);})
  : [shen_type_cons, Arg5237_0[1], shenjs_call(shen_union, [Arg5237_0[2], Arg5237_1])])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "union"]]);})))},
  2,
  [],
  "union"];
shenjs_functions["shen_union"] = shen_union;






shen_y_or_n$question$ = [shen_type_func,
  function shen_user_lambda5240(Arg5239) {
  if (Arg5239.length < 1) return [shen_type_func, shen_user_lambda5240, 1, Arg5239];
  var Arg5239_0 = Arg5239[0];
  var R0;
  return (shenjs_call(shen_intoutput, [Arg5239_0, []]),
  shenjs_call(shen_intoutput, [" (y/n) ", []]),
  (R0 = shenjs_call(shen_intmake_string, ["~S", [shen_tuple, shenjs_call(shen_input, []), []]])),
  ((shenjs_unwind_tail(shenjs_$eq$("y", R0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$("n", R0)))
  ? false
  : (shenjs_call(shen_intoutput, ["please answer y or n~%", []]),
  (function() {
  return shenjs_call_tail(shen_y_or_n$question$, [Arg5239_0]);})))))},
  1,
  [],
  "y-or-n?"];
shenjs_functions["shen_y-or-n?"] = shen_y_or_n$question$;












shen_subst = [shen_type_func,
  function shen_user_lambda5243(Arg5242) {
  if (Arg5242.length < 3) return [shen_type_func, shen_user_lambda5243, 3, Arg5242];
  var Arg5242_0 = Arg5242[0], Arg5242_1 = Arg5242[1], Arg5242_2 = Arg5242[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5242_2, Arg5242_1)))
  ? Arg5242_0
  : ((shenjs_is_type(Arg5242_2, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_subst, [Arg5242_0, Arg5242_1, Arg5242_2[1]]), shenjs_call(shen_subst, [Arg5242_0, Arg5242_1, Arg5242_2[2]])]
  : Arg5242_2))},
  3,
  [],
  "subst"];
shenjs_functions["shen_subst"] = shen_subst;






shen_cd = [shen_type_func,
  function shen_user_lambda5245(Arg5244) {
  if (Arg5244.length < 1) return [shen_type_func, shen_user_lambda5245, 1, Arg5244];
  var Arg5244_0 = Arg5244[0];
  return (shenjs_globals["shen_*home-directory*"] = ((shenjs_unwind_tail(shenjs_$eq$(Arg5244_0, "")))
  ? ""
  : shenjs_call(shen_intmake_string, ["~A/", [shen_tuple, Arg5244_0, []]])))},
  1,
  [],
  "cd"];
shenjs_functions["shen_cd"] = shen_cd;






shen_map = [shen_type_func,
  function shen_user_lambda5247(Arg5246) {
  if (Arg5246.length < 2) return [shen_type_func, shen_user_lambda5247, 2, Arg5246];
  var Arg5246_0 = Arg5246[0], Arg5246_1 = Arg5246[1];
  return (function() {
  return shenjs_call_tail(shen_map_h, [Arg5246_0, Arg5246_1, []]);})},
  2,
  [],
  "map"];
shenjs_functions["shen_map"] = shen_map;






shen_map_h = [shen_type_func,
  function shen_user_lambda5249(Arg5248) {
  if (Arg5248.length < 3) return [shen_type_func, shen_user_lambda5249, 3, Arg5248];
  var Arg5248_0 = Arg5248[0], Arg5248_1 = Arg5248[1], Arg5248_2 = Arg5248[2];
  return ((shenjs_empty$question$(Arg5248_1))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg5248_2]);})
  : ((shenjs_is_type(Arg5248_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map_h, [Arg5248_0, Arg5248_1[2], [shen_type_cons, shenjs_call(Arg5248_0, [Arg5248_1[1]]), Arg5248_2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-map-h"]]);})))},
  3,
  [],
  "shen-map-h"];
shenjs_functions["shen_shen-map-h"] = shen_map_h;






shen_length = [shen_type_func,
  function shen_user_lambda5251(Arg5250) {
  if (Arg5250.length < 1) return [shen_type_func, shen_user_lambda5251, 1, Arg5250];
  var Arg5250_0 = Arg5250[0];
  return (function() {
  return shenjs_call_tail(shen_length_h, [Arg5250_0, 0]);})},
  1,
  [],
  "length"];
shenjs_functions["shen_length"] = shen_length;






shen_length_h = [shen_type_func,
  function shen_user_lambda5253(Arg5252) {
  if (Arg5252.length < 2) return [shen_type_func, shen_user_lambda5253, 2, Arg5252];
  var Arg5252_0 = Arg5252[0], Arg5252_1 = Arg5252[1];
  return ((shenjs_empty$question$(Arg5252_0))
  ? Arg5252_1
  : (function() {
  return shenjs_call_tail(shen_length_h, [Arg5252_0[2], (Arg5252_1 + 1)]);}))},
  2,
  [],
  "shen-length-h"];
shenjs_functions["shen_shen-length-h"] = shen_length_h;






shen_occurrences = [shen_type_func,
  function shen_user_lambda5255(Arg5254) {
  if (Arg5254.length < 2) return [shen_type_func, shen_user_lambda5255, 2, Arg5254];
  var Arg5254_0 = Arg5254[0], Arg5254_1 = Arg5254[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5254_1, Arg5254_0)))
  ? 1
  : ((shenjs_is_type(Arg5254_1, shen_type_cons))
  ? (shenjs_call(shen_occurrences, [Arg5254_0, Arg5254_1[1]]) + shenjs_call(shen_occurrences, [Arg5254_0, Arg5254_1[2]]))
  : 0))},
  2,
  [],
  "occurrences"];
shenjs_functions["shen_occurrences"] = shen_occurrences;






shen_nth = [shen_type_func,
  function shen_user_lambda5257(Arg5256) {
  if (Arg5256.length < 2) return [shen_type_func, shen_user_lambda5257, 2, Arg5256];
  var Arg5256_0 = Arg5256[0], Arg5256_1 = Arg5256[1];
  return (((shenjs_unwind_tail(shenjs_$eq$(1, Arg5256_0)) && shenjs_is_type(Arg5256_1, shen_type_cons)))
  ? Arg5256_1[1]
  : ((shenjs_is_type(Arg5256_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_nth, [(Arg5256_0 - 1), Arg5256_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "nth"]]);})))},
  2,
  [],
  "nth"];
shenjs_functions["shen_nth"] = shen_nth;






shen_integer$question$ = [shen_type_func,
  function shen_user_lambda5259(Arg5258) {
  if (Arg5258.length < 1) return [shen_type_func, shen_user_lambda5259, 1, Arg5258];
  var Arg5258_0 = Arg5258[0];
  var R0;
  return ((typeof(Arg5258_0) == 'number') && ((R0 = shenjs_call(shen_abs, [Arg5258_0])),
  shenjs_call(shen_integer_test$question$, [R0, shenjs_call(shen_magless, [R0, 1])])))},
  1,
  [],
  "integer?"];
shenjs_functions["shen_integer?"] = shen_integer$question$;






shen_abs = [shen_type_func,
  function shen_user_lambda5261(Arg5260) {
  if (Arg5260.length < 1) return [shen_type_func, shen_user_lambda5261, 1, Arg5260];
  var Arg5260_0 = Arg5260[0];
  return (((Arg5260_0 > 0))
  ? Arg5260_0
  : (0 - Arg5260_0))},
  1,
  [],
  "shen-abs"];
shenjs_functions["shen_shen-abs"] = shen_abs;






shen_magless = [shen_type_func,
  function shen_user_lambda5263(Arg5262) {
  if (Arg5262.length < 2) return [shen_type_func, shen_user_lambda5263, 2, Arg5262];
  var Arg5262_0 = Arg5262[0], Arg5262_1 = Arg5262[1];
  var R0;
  return ((R0 = (Arg5262_1 * 2)),
  (((R0 > Arg5262_0))
  ? Arg5262_1
  : (function() {
  return shenjs_call_tail(shen_magless, [Arg5262_0, R0]);})))},
  2,
  [],
  "shen-magless"];
shenjs_functions["shen_shen-magless"] = shen_magless;






shen_integer_test$question$ = [shen_type_func,
  function shen_user_lambda5265(Arg5264) {
  if (Arg5264.length < 2) return [shen_type_func, shen_user_lambda5265, 2, Arg5264];
  var Arg5264_0 = Arg5264[0], Arg5264_1 = Arg5264[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg5264_0)))
  ? true
  : (((1 > Arg5264_0))
  ? false
  : ((R0 = (Arg5264_0 - Arg5264_1)),
  (((0 > R0))
  ? (function() {
  return shenjs_call_tail(shen_integer$question$, [Arg5264_0]);})
  : (function() {
  return shenjs_call_tail(shen_integer_test$question$, [R0, Arg5264_1]);})))))},
  2,
  [],
  "shen-integer-test?"];
shenjs_functions["shen_shen-integer-test?"] = shen_integer_test$question$;






shen_mapcan = [shen_type_func,
  function shen_user_lambda5267(Arg5266) {
  if (Arg5266.length < 2) return [shen_type_func, shen_user_lambda5267, 2, Arg5266];
  var Arg5266_0 = Arg5266[0], Arg5266_1 = Arg5266[1];
  return ((shenjs_empty$question$(Arg5266_1))
  ? []
  : ((shenjs_is_type(Arg5266_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(Arg5266_0, [Arg5266_1[1]]), shenjs_call(shen_mapcan, [Arg5266_0, Arg5266_1[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "mapcan"]]);})))},
  2,
  [],
  "mapcan"];
shenjs_functions["shen_mapcan"] = shen_mapcan;






shen_read_file_as_bytelist = [shen_type_func,
  function shen_user_lambda5269(Arg5268) {
  if (Arg5268.length < 1) return [shen_type_func, shen_user_lambda5269, 1, Arg5268];
  var Arg5268_0 = Arg5268[0];
  var R0, R1;
  return ((R0 = shenjs_open([shen_type_symbol, "file"], Arg5268_0, [shen_type_symbol, "in"])),
  (R1 = shenjs_read_byte(R0)),
  (R1 = shenjs_call(shen_read_file_as_bytelist_help, [R0, R1, []])),
  shenjs_close(R0),
  (function() {
  return shenjs_call_tail(shen_reverse, [R1]);}))},
  1,
  [],
  "read-file-as-bytelist"];
shenjs_functions["shen_read-file-as-bytelist"] = shen_read_file_as_bytelist;






shen_read_file_as_bytelist_help = [shen_type_func,
  function shen_user_lambda5271(Arg5270) {
  if (Arg5270.length < 3) return [shen_type_func, shen_user_lambda5271, 3, Arg5270];
  var Arg5270_0 = Arg5270[0], Arg5270_1 = Arg5270[1], Arg5270_2 = Arg5270[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(-1, Arg5270_1)))
  ? Arg5270_2
  : (function() {
  return shenjs_call_tail(shen_read_file_as_bytelist_help, [Arg5270_0, shenjs_read_byte(Arg5270_0), [shen_type_cons, Arg5270_1, Arg5270_2]]);}))},
  3,
  [],
  "shen-read-file-as-bytelist-help"];
shenjs_functions["shen_shen-read-file-as-bytelist-help"] = shen_read_file_as_bytelist_help;






shen_read_file_as_string = [shen_type_func,
  function shen_user_lambda5273(Arg5272) {
  if (Arg5272.length < 1) return [shen_type_func, shen_user_lambda5273, 1, Arg5272];
  var Arg5272_0 = Arg5272[0];
  var R0;
  return ((R0 = shenjs_open([shen_type_symbol, "file"], Arg5272_0, [shen_type_symbol, "in"])),
  (function() {
  return shenjs_call_tail(shen_rfas_h, [R0, shenjs_read_byte(R0), ""]);}))},
  1,
  [],
  "read-file-as-string"];
shenjs_functions["shen_read-file-as-string"] = shen_read_file_as_string;






shen_rfas_h = [shen_type_func,
  function shen_user_lambda5275(Arg5274) {
  if (Arg5274.length < 3) return [shen_type_func, shen_user_lambda5275, 3, Arg5274];
  var Arg5274_0 = Arg5274[0], Arg5274_1 = Arg5274[1], Arg5274_2 = Arg5274[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(-1, Arg5274_1)))
  ? (shenjs_close(Arg5274_0),
  Arg5274_2)
  : (function() {
  return shenjs_call_tail(shen_rfas_h, [Arg5274_0, shenjs_read_byte(Arg5274_0), (Arg5274_2 + shenjs_n_$gt$string(Arg5274_1))]);}))},
  3,
  [],
  "shen-rfas-h"];
shenjs_functions["shen_shen-rfas-h"] = shen_rfas_h;






shen_$eq$$eq$ = [shen_type_func,
  function shen_user_lambda5277(Arg5276) {
  if (Arg5276.length < 2) return [shen_type_func, shen_user_lambda5277, 2, Arg5276];
  var Arg5276_0 = Arg5276[0], Arg5276_1 = Arg5276[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5276_1, Arg5276_0)))
  ? true
  : false)},
  2,
  [],
  "=="];
shenjs_functions["shen_=="] = shen_$eq$$eq$;






shen_abort = [shen_type_func,
  function shen_user_lambda5279(Arg5278) {
  if (Arg5278.length < 0) return [shen_type_func, shen_user_lambda5279, 0, Arg5278];
  return (function() {
  return shenjs_simple_error("");})},
  0,
  [],
  "abort"];
shenjs_functions["shen_abort"] = shen_abort;






shen_read = [shen_type_func,
  function shen_user_lambda5281(Arg5280) {
  if (Arg5280.length < 0) return [shen_type_func, shen_user_lambda5281, 0, Arg5280];
  return shenjs_call(shen_lineread, [])[1]},
  0,
  [],
  "read"];
shenjs_functions["shen_read"] = shen_read;






shen_input = [shen_type_func,
  function shen_user_lambda5283(Arg5282) {
  if (Arg5282.length < 0) return [shen_type_func, shen_user_lambda5283, 0, Arg5282];
  return (function() {
  return shenjs_call_tail(shen_eval, [shenjs_call(shen_read, [])]);})},
  0,
  [],
  "input"];
shenjs_functions["shen_input"] = shen_input;






shen_input$plus$ = [shen_type_func,
  function shen_user_lambda5285(Arg5284) {
  if (Arg5284.length < 2) return [shen_type_func, shen_user_lambda5285, 2, Arg5284];
  var Arg5284_0 = Arg5284[0], Arg5284_1 = Arg5284[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_read, [])),
  (R1 = shenjs_call(shen_typecheck, [R0, Arg5284_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(false, R1)))
  ? (shenjs_call(shen_intoutput, ["input is not of type ~R: please re-enter ", [shen_tuple, Arg5284_1, []]]),
  (function() {
  return shenjs_call_tail(shen_input$plus$, [[shen_type_symbol, ":"], Arg5284_1]);}))
  : (function() {
  return shenjs_call_tail(shen_eval, [R0]);})))},
  2,
  [],
  "input+"];
shenjs_functions["shen_input+"] = shen_input$plus$;






shen_bound$question$ = [shen_type_func,
  function shen_user_lambda5287(Arg5286) {
  if (Arg5286.length < 1) return [shen_type_func, shen_user_lambda5287, 1, Arg5286];
  var Arg5286_0 = Arg5286[0];
  var R0;
  return (shenjs_is_type(Arg5286_0, shen_type_symbol) && ((R0 = shenjs_trap_error(function() {return (shenjs_globals["shen_" + Arg5286_0[1]]);}, [shen_type_func,
  function shen_user_lambda5289(Arg5288) {
  if (Arg5288.length < 1) return [shen_type_func, shen_user_lambda5289, 1, Arg5288];
  var Arg5288_0 = Arg5288[0];
  return [shen_type_symbol, "shen-this-symbol-is-unbound"]},
  1,
  []])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, [shen_type_symbol, "shen-this-symbol-is-unbound"])))
  ? false
  : true)))},
  1,
  [],
  "bound?"];
shenjs_functions["shen_bound?"] = shen_bound$question$;






shen_string_$gt$bytes = [shen_type_func,
  function shen_user_lambda5291(Arg5290) {
  if (Arg5290.length < 1) return [shen_type_func, shen_user_lambda5291, 1, Arg5290];
  var Arg5290_0 = Arg5290[0];
  return ((shenjs_unwind_tail(shenjs_$eq$("", Arg5290_0)))
  ? []
  : [shen_type_cons, shenjs_string_$gt$n(Arg5290_0[0]), shenjs_call(shen_string_$gt$bytes, [shenjs_tlstr(Arg5290_0)])])},
  1,
  [],
  "shen-string->bytes"];
shenjs_functions["shen_shen-string->bytes"] = shen_string_$gt$bytes;






shen_maxinferences = [shen_type_func,
  function shen_user_lambda5293(Arg5292) {
  if (Arg5292.length < 1) return [shen_type_func, shen_user_lambda5293, 1, Arg5292];
  var Arg5292_0 = Arg5292[0];
  return (shenjs_globals["shen_shen-*maxinferences*"] = Arg5292_0)},
  1,
  [],
  "maxinferences"];
shenjs_functions["shen_maxinferences"] = shen_maxinferences;






shen_inferences = [shen_type_func,
  function shen_user_lambda5295(Arg5294) {
  if (Arg5294.length < 1) return [shen_type_func, shen_user_lambda5295, 1, Arg5294];
  var Arg5294_0 = Arg5294[0];
  return (shenjs_globals["shen_shen-*infs*"])},
  1,
  [],
  "inferences"];
shenjs_functions["shen_inferences"] = shen_inferences;






shen_hush = [shen_type_func,
  function shen_user_lambda5297(Arg5296) {
  if (Arg5296.length < 1) return [shen_type_func, shen_user_lambda5297, 1, Arg5296];
  var Arg5296_0 = Arg5296[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg5296_0)))
  ? (shenjs_globals["shen_shen-*hush*"] = [shen_type_symbol, "shen-hushed"])
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg5296_0)))
  ? (shenjs_globals["shen_shen-*hush*"] = [shen_type_symbol, "shen-unhushed"])
  : (function() {
  return shenjs_call_tail(shen_interror, ["'hush' expects a + or a -~%", []]);})))},
  1,
  [],
  "shen-hush"];
shenjs_functions["shen_shen-hush"] = shen_hush;






shen_protect = [shen_type_func,
  function shen_user_lambda5299(Arg5298) {
  if (Arg5298.length < 1) return [shen_type_func, shen_user_lambda5299, 1, Arg5298];
  var Arg5298_0 = Arg5298[0];
  return Arg5298_0},
  1,
  [],
  "protect"];
shenjs_functions["shen_protect"] = shen_protect;






shen_stoutput = [shen_type_func,
  function shen_user_lambda5301(Arg5300) {
  if (Arg5300.length < 1) return [shen_type_func, shen_user_lambda5301, 1, Arg5300];
  var Arg5300_0 = Arg5300[0];
  return (shenjs_globals["shen_*stoutput*"])},
  1,
  [],
  "shen-stoutput"];
shenjs_functions["shen_shen-stoutput"] = shen_stoutput;












shen_datatype_error = [shen_type_func,
  function shen_user_lambda4965(Arg4964) {
  if (Arg4964.length < 1) return [shen_type_func, shen_user_lambda4965, 1, Arg4964];
  var Arg4964_0 = Arg4964[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["datatype syntax error here:~%~% ~A~%", [shen_tuple, shenjs_call(shen_next_50, [50, Arg4964_0]), []]]);})},
  1,
  [],
  "shen-datatype-error"];
shenjs_functions["shen_shen-datatype-error"] = shen_datatype_error;






shen_$lt$datatype_rules$gt$ = [shen_type_func,
  function shen_user_lambda4967(Arg4966) {
  if (Arg4966.length < 1) return [shen_type_func, shen_user_lambda4967, 1, Arg4966];
  var Arg4966_0 = Arg4966[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$datatype_rule$gt$, [Arg4966_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$datatype_rules$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4966_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), []])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<datatype-rules>"];
shenjs_functions["shen_shen-<datatype-rules>"] = shen_$lt$datatype_rules$gt$;






shen_$lt$datatype_rule$gt$ = [shen_type_func,
  function shen_user_lambda4969(Arg4968) {
  if (Arg4968.length < 1) return [shen_type_func, shen_user_lambda4969, 1, Arg4968];
  var Arg4968_0 = Arg4968[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$side_conditions$gt$, [Arg4968_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$premises$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? ((R2 = shenjs_call(shen_$lt$singleunderline$gt$, [R1])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R2))))
  ? ((R2 = shenjs_call(shen_$lt$conclusion$gt$, [R2])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R2))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R2]), [shen_tuple, [shen_type_symbol, "shen-single"], [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R2]), []]]]]])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$side_conditions$gt$, [Arg4968_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$premises$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? ((R2 = shenjs_call(shen_$lt$doubleunderline$gt$, [R1])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R2))))
  ? ((R2 = shenjs_call(shen_$lt$conclusion$gt$, [R2])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R2))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R2]), [shen_tuple, [shen_type_symbol, "shen-double"], [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R2]), []]]]]])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<datatype-rule>"];
shenjs_functions["shen_shen-<datatype-rule>"] = shen_$lt$datatype_rule$gt$;






shen_$lt$side_conditions$gt$ = [shen_type_func,
  function shen_user_lambda4971(Arg4970) {
  if (Arg4970.length < 1) return [shen_type_func, shen_user_lambda4971, 1, Arg4970];
  var Arg4970_0 = Arg4970[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$side_condition$gt$, [Arg4970_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$side_conditions$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4970_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), []])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<side-conditions>"];
shenjs_functions["shen_shen-<side-conditions>"] = shen_$lt$side_conditions$gt$;






shen_$lt$side_condition$gt$ = [shen_type_func,
  function shen_user_lambda4973(Arg4972) {
  if (Arg4972.length < 1) return [shen_type_func, shen_user_lambda4973, 1, Arg4972];
  var Arg4972_0 = Arg4972[0];
  var R0, R1;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4972_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "if"], shenjs_call(shen_fst, [Arg4972_0])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$expr$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4972_0])[2], shenjs_call(shen_snd, [Arg4972_0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, shenjs_call(shen_snd, [R0]), []]]])
  : shen_fail_obj))
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4972_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], shenjs_call(shen_fst, [Arg4972_0])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$variable$question$$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4972_0])[2], shenjs_call(shen_snd, [Arg4972_0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$expr$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R1]), []]]]])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<side-condition>"];
shenjs_functions["shen_shen-<side-condition>"] = shen_$lt$side_condition$gt$;






shen_$lt$variable$question$$gt$ = [shen_type_func,
  function shen_user_lambda4975(Arg4974) {
  if (Arg4974.length < 1) return [shen_type_func, shen_user_lambda4975, 1, Arg4974];
  var Arg4974_0 = Arg4974[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4974_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4974_0])[2], shenjs_call(shen_snd, [Arg4974_0])])]), (((!shenjs_call(shen_variable$question$, [shenjs_call(shen_fst, [Arg4974_0])[1]])))
  ? shen_fail_obj
  : shenjs_call(shen_fst, [Arg4974_0])[1])])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<variable?>"];
shenjs_functions["shen_shen-<variable?>"] = shen_$lt$variable$question$$gt$;






shen_$lt$expr$gt$ = [shen_type_func,
  function shen_user_lambda4977(Arg4976) {
  if (Arg4976.length < 1) return [shen_type_func, shen_user_lambda4977, 1, Arg4976];
  var Arg4976_0 = Arg4976[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4976_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4976_0])[2], shenjs_call(shen_snd, [Arg4976_0])])]), (((shenjs_call(shen_element$question$, [shenjs_call(shen_fst, [Arg4976_0])[1], [shen_type_cons, [shen_type_symbol, ">>"], [shen_type_cons, [shen_type_symbol, ";"], []]]]) || (shenjs_call(shen_singleunderline$question$, [shenjs_call(shen_fst, [Arg4976_0])[1]]) || shenjs_call(shen_doubleunderline$question$, [shenjs_call(shen_fst, [Arg4976_0])[1]]))))
  ? shen_fail_obj
  : shenjs_call(shen_remove_bar, [shenjs_call(shen_fst, [Arg4976_0])[1]]))])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<expr>"];
shenjs_functions["shen_shen-<expr>"] = shen_$lt$expr$gt$;






shen_remove_bar = [shen_type_func,
  function shen_user_lambda4979(Arg4978) {
  if (Arg4978.length < 1) return [shen_type_func, shen_user_lambda4979, 1, Arg4978];
  var Arg4978_0 = Arg4978[0];
  return (((shenjs_is_type(Arg4978_0, shen_type_cons) && (shenjs_is_type(Arg4978_0[2], shen_type_cons) && (shenjs_is_type(Arg4978_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4978_0[2][2][2]) && shenjs_unwind_tail(shenjs_$eq$(Arg4978_0[2][1], [shen_type_symbol, "bar!"])))))))
  ? [shen_type_cons, Arg4978_0[1], Arg4978_0[2][2][1]]
  : ((shenjs_is_type(Arg4978_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_remove_bar, [Arg4978_0[1]]), shenjs_call(shen_remove_bar, [Arg4978_0[2]])]
  : Arg4978_0))},
  1,
  [],
  "shen-remove-bar"];
shenjs_functions["shen_shen-remove-bar"] = shen_remove_bar;






shen_$lt$premises$gt$ = [shen_type_func,
  function shen_user_lambda4981(Arg4980) {
  if (Arg4980.length < 1) return [shen_type_func, shen_user_lambda4981, 1, Arg4980];
  var Arg4980_0 = Arg4980[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$premise$gt$, [Arg4980_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$semicolon_symbol$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? ((R1 = shenjs_call(shen_$lt$premises$gt$, [R1])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4980_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), []])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<premises>"];
shenjs_functions["shen_shen-<premises>"] = shen_$lt$premises$gt$;






shen_$lt$semicolon_symbol$gt$ = [shen_type_func,
  function shen_user_lambda4983(Arg4982) {
  if (Arg4982.length < 1) return [shen_type_func, shen_user_lambda4983, 1, Arg4982];
  var Arg4982_0 = Arg4982[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4982_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4982_0])[2], shenjs_call(shen_snd, [Arg4982_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4982_0])[1], [shen_type_symbol, ";"])))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<semicolon-symbol>"];
shenjs_functions["shen_shen-<semicolon-symbol>"] = shen_$lt$semicolon_symbol$gt$;






shen_$lt$premise$gt$ = [shen_type_func,
  function shen_user_lambda4985(Arg4984) {
  if (Arg4984.length < 1) return [shen_type_func, shen_user_lambda4985, 1, Arg4984];
  var Arg4984_0 = Arg4984[0];
  var R0, R1;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4984_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "!"], shenjs_call(shen_fst, [Arg4984_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4984_0])[2], shenjs_call(shen_snd, [Arg4984_0])])]), [shen_type_symbol, "!"]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$formulae$gt$, [Arg4984_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ">>"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$formula$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_tuple, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$formula$gt$, [Arg4984_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_tuple, [], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))
  : R0))},
  1,
  [],
  "shen-<premise>"];
shenjs_functions["shen_shen-<premise>"] = shen_$lt$premise$gt$;






shen_$lt$conclusion$gt$ = [shen_type_func,
  function shen_user_lambda4987(Arg4986) {
  if (Arg4986.length < 1) return [shen_type_func, shen_user_lambda4987, 1, Arg4986];
  var Arg4986_0 = Arg4986[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$formulae$gt$, [Arg4986_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ">>"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$formula$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? ((R2 = shenjs_call(shen_$lt$semicolon_symbol$gt$, [R1])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R2))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R2]), [shen_tuple, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$formula$gt$, [Arg4986_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$semicolon_symbol$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_tuple, [], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<conclusion>"];
shenjs_functions["shen_shen-<conclusion>"] = shen_$lt$conclusion$gt$;






shen_$lt$formulae$gt$ = [shen_type_func,
  function shen_user_lambda4989(Arg4988) {
  if (Arg4988.length < 1) return [shen_type_func, shen_user_lambda4989, 1, Arg4988];
  var Arg4988_0 = Arg4988[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$formula$gt$, [Arg4988_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$formulae$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$formula$gt$, [Arg4988_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R0]), []]])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4988_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), []])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))
  : R0))},
  1,
  [],
  "shen-<formulae>"];
shenjs_functions["shen_shen-<formulae>"] = shen_$lt$formulae$gt$;






shen_$lt$formula$gt$ = [shen_type_func,
  function shen_user_lambda4991(Arg4990) {
  if (Arg4990.length < 1) return [shen_type_func, shen_user_lambda4991, 1, Arg4990];
  var Arg4990_0 = Arg4990[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$expr$gt$, [Arg4990_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$type$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_curry, [shenjs_call(shen_snd, [R0])]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_normalise_type, [shenjs_call(shen_snd, [R1])]), []]]]])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$expr$gt$, [Arg4990_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<formula>"];
shenjs_functions["shen_shen-<formula>"] = shen_$lt$formula$gt$;






shen_$lt$colonsymbol$gt$ = [shen_type_func,
  function shen_user_lambda4993(Arg4992) {
  if (Arg4992.length < 1) return [shen_type_func, shen_user_lambda4993, 1, Arg4992];
  var Arg4992_0 = Arg4992[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4992_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4992_0])[2], shenjs_call(shen_snd, [Arg4992_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4992_0])[1], [shen_type_symbol, ";"])))
  ? shenjs_call(shen_fst, [Arg4992_0])[1]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<colonsymbol>"];
shenjs_functions["shen_shen-<colonsymbol>"] = shen_$lt$colonsymbol$gt$;






shen_$lt$type$gt$ = [shen_type_func,
  function shen_user_lambda4995(Arg4994) {
  if (Arg4994.length < 1) return [shen_type_func, shen_user_lambda4995, 1, Arg4994];
  var Arg4994_0 = Arg4994[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$expr$gt$, [Arg4994_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_curry_type, [shenjs_call(shen_snd, [R0])])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<type>"];
shenjs_functions["shen_shen-<type>"] = shen_$lt$type$gt$;






shen_$lt$doubleunderline$gt$ = [shen_type_func,
  function shen_user_lambda4997(Arg4996) {
  if (Arg4996.length < 1) return [shen_type_func, shen_user_lambda4997, 1, Arg4996];
  var Arg4996_0 = Arg4996[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4996_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4996_0])[2], shenjs_call(shen_snd, [Arg4996_0])])]), ((shenjs_call(shen_doubleunderline$question$, [shenjs_call(shen_fst, [Arg4996_0])[1]]))
  ? shenjs_call(shen_fst, [Arg4996_0])[1]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<doubleunderline>"];
shenjs_functions["shen_shen-<doubleunderline>"] = shen_$lt$doubleunderline$gt$;






shen_$lt$singleunderline$gt$ = [shen_type_func,
  function shen_user_lambda4999(Arg4998) {
  if (Arg4998.length < 1) return [shen_type_func, shen_user_lambda4999, 1, Arg4998];
  var Arg4998_0 = Arg4998[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4998_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4998_0])[2], shenjs_call(shen_snd, [Arg4998_0])])]), ((shenjs_call(shen_singleunderline$question$, [shenjs_call(shen_fst, [Arg4998_0])[1]]))
  ? shenjs_call(shen_fst, [Arg4998_0])[1]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<singleunderline>"];
shenjs_functions["shen_shen-<singleunderline>"] = shen_$lt$singleunderline$gt$;






shen_singleunderline$question$ = [shen_type_func,
  function shen_user_lambda5001(Arg5000) {
  if (Arg5000.length < 1) return [shen_type_func, shen_user_lambda5001, 1, Arg5000];
  var Arg5000_0 = Arg5000[0];
  return (shenjs_is_type(Arg5000_0, shen_type_symbol) && shenjs_call(shen_sh$question$, [shenjs_str(Arg5000_0)]))},
  1,
  [],
  "shen-singleunderline?"];
shenjs_functions["shen_shen-singleunderline?"] = shen_singleunderline$question$;






shen_sh$question$ = [shen_type_func,
  function shen_user_lambda5003(Arg5002) {
  if (Arg5002.length < 1) return [shen_type_func, shen_user_lambda5003, 1, Arg5002];
  var Arg5002_0 = Arg5002[0];
  return ((shenjs_unwind_tail(shenjs_$eq$("_", Arg5002_0)))
  ? true
  : (shenjs_unwind_tail(shenjs_$eq$(Arg5002_0[0], "_")) && shenjs_call(shen_sh$question$, [shenjs_tlstr(Arg5002_0)])))},
  1,
  [],
  "shen-sh?"];
shenjs_functions["shen_shen-sh?"] = shen_sh$question$;






shen_doubleunderline$question$ = [shen_type_func,
  function shen_user_lambda5005(Arg5004) {
  if (Arg5004.length < 1) return [shen_type_func, shen_user_lambda5005, 1, Arg5004];
  var Arg5004_0 = Arg5004[0];
  return (shenjs_is_type(Arg5004_0, shen_type_symbol) && shenjs_call(shen_dh$question$, [shenjs_str(Arg5004_0)]))},
  1,
  [],
  "shen-doubleunderline?"];
shenjs_functions["shen_shen-doubleunderline?"] = shen_doubleunderline$question$;






shen_dh$question$ = [shen_type_func,
  function shen_user_lambda5007(Arg5006) {
  if (Arg5006.length < 1) return [shen_type_func, shen_user_lambda5007, 1, Arg5006];
  var Arg5006_0 = Arg5006[0];
  return ((shenjs_unwind_tail(shenjs_$eq$("=", Arg5006_0)))
  ? true
  : (shenjs_unwind_tail(shenjs_$eq$(Arg5006_0[0], "=")) && shenjs_call(shen_dh$question$, [shenjs_tlstr(Arg5006_0)])))},
  1,
  [],
  "shen-dh?"];
shenjs_functions["shen_shen-dh?"] = shen_dh$question$;






shen_process_datatype = [shen_type_func,
  function shen_user_lambda5009(Arg5008) {
  if (Arg5008.length < 2) return [shen_type_func, shen_user_lambda5009, 2, Arg5008];
  var Arg5008_0 = Arg5008[0], Arg5008_1 = Arg5008[1];
  return (function() {
  return shenjs_call_tail(shen_remember_datatype, [shenjs_call(shen_s_prolog, [shenjs_call(shen_rules_$gt$horn_clauses, [Arg5008_0, Arg5008_1])])]);})},
  2,
  [],
  "shen-process-datatype"];
shenjs_functions["shen_shen-process-datatype"] = shen_process_datatype;






shen_remember_datatype = [shen_type_func,
  function shen_user_lambda5011(Arg5010) {
  if (Arg5010.length < 1) return [shen_type_func, shen_user_lambda5011, 1, Arg5010];
  var Arg5010_0 = Arg5010[0];
  return ((shenjs_is_type(Arg5010_0, shen_type_cons))
  ? ((shenjs_globals["shen_shen-*datatypes*"] = shenjs_call(shen_adjoin, [Arg5010_0[1], (shenjs_globals["shen_shen-*datatypes*"])])),
  (shenjs_globals["shen_shen-*alldatatypes*"] = shenjs_call(shen_adjoin, [Arg5010_0[1], (shenjs_globals["shen_shen-*alldatatypes*"])])),
  Arg5010_0[1])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-remember-datatype"]]);}))},
  1,
  [],
  "shen-remember-datatype"];
shenjs_functions["shen_shen-remember-datatype"] = shen_remember_datatype;






shen_rules_$gt$horn_clauses = [shen_type_func,
  function shen_user_lambda5013(Arg5012) {
  if (Arg5012.length < 2) return [shen_type_func, shen_user_lambda5013, 2, Arg5012];
  var Arg5012_0 = Arg5012[0], Arg5012_1 = Arg5012[1];
  return ((shenjs_empty$question$(Arg5012_1))
  ? []
  : (((shenjs_is_type(Arg5012_1, shen_type_cons) && (shenjs_is_type(Arg5012_1[1], shen_tuple) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-single"], shenjs_call(shen_fst, [Arg5012_1[1]]))))))
  ? [shen_type_cons, shenjs_call(shen_rule_$gt$horn_clause, [Arg5012_0, shenjs_call(shen_snd, [Arg5012_1[1]])]), shenjs_call(shen_rules_$gt$horn_clauses, [Arg5012_0, Arg5012_1[2]])]
  : (((shenjs_is_type(Arg5012_1, shen_type_cons) && (shenjs_is_type(Arg5012_1[1], shen_tuple) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-double"], shenjs_call(shen_fst, [Arg5012_1[1]]))))))
  ? (function() {
  return shenjs_call_tail(shen_rules_$gt$horn_clauses, [Arg5012_0, shenjs_call(shen_append, [shenjs_call(shen_double_$gt$singles, [shenjs_call(shen_snd, [Arg5012_1[1]])]), Arg5012_1[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-rules->horn-clauses"]]);}))))},
  2,
  [],
  "shen-rules->horn-clauses"];
shenjs_functions["shen_shen-rules->horn-clauses"] = shen_rules_$gt$horn_clauses;






shen_double_$gt$singles = [shen_type_func,
  function shen_user_lambda5015(Arg5014) {
  if (Arg5014.length < 1) return [shen_type_func, shen_user_lambda5015, 1, Arg5014];
  var Arg5014_0 = Arg5014[0];
  return [shen_type_cons, shenjs_call(shen_right_rule, [Arg5014_0]), [shen_type_cons, shenjs_call(shen_left_rule, [Arg5014_0]), []]]},
  1,
  [],
  "shen-double->singles"];
shenjs_functions["shen_shen-double->singles"] = shen_double_$gt$singles;






shen_right_rule = [shen_type_func,
  function shen_user_lambda5017(Arg5016) {
  if (Arg5016.length < 1) return [shen_type_func, shen_user_lambda5017, 1, Arg5016];
  var Arg5016_0 = Arg5016[0];
  return [shen_tuple, [shen_type_symbol, "shen-single"], Arg5016_0]},
  1,
  [],
  "shen-right-rule"];
shenjs_functions["shen_shen-right-rule"] = shen_right_rule;






shen_left_rule = [shen_type_func,
  function shen_user_lambda5019(Arg5018) {
  if (Arg5018.length < 1) return [shen_type_func, shen_user_lambda5019, 1, Arg5018];
  var Arg5018_0 = Arg5018[0];
  var R0, R1;
  return (((shenjs_is_type(Arg5018_0, shen_type_cons) && (shenjs_is_type(Arg5018_0[2], shen_type_cons) && (shenjs_is_type(Arg5018_0[2][2], shen_type_cons) && (shenjs_is_type(Arg5018_0[2][2][1], shen_tuple) && (shenjs_empty$question$(shenjs_call(shen_fst, [Arg5018_0[2][2][1]])) && shenjs_empty$question$(Arg5018_0[2][2][2])))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "Qv"]])),
  (R1 = [shen_tuple, [shen_type_cons, shenjs_call(shen_snd, [Arg5018_0[2][2][1]]), []], R0]),
  (R0 = [shen_type_cons, [shen_tuple, shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5021(Arg5020) {
  if (Arg5020.length < 1) return [shen_type_func, shen_user_lambda5021, 1, Arg5020];
  var Arg5020_0 = Arg5020[0];
  return (function() {
  return shenjs_call_tail(shen_right_$gt$left, [Arg5020_0]);})},
  1,
  []], Arg5018_0[2][1]]), R0], []]),
  [shen_tuple, [shen_type_symbol, "shen-single"], [shen_type_cons, Arg5018_0[1], [shen_type_cons, R0, [shen_type_cons, R1, []]]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-left-rule"]]);}))},
  1,
  [],
  "shen-left-rule"];
shenjs_functions["shen_shen-left-rule"] = shen_left_rule;






shen_right_$gt$left = [shen_type_func,
  function shen_user_lambda5023(Arg5022) {
  if (Arg5022.length < 1) return [shen_type_func, shen_user_lambda5023, 1, Arg5022];
  var Arg5022_0 = Arg5022[0];
  return (((shenjs_is_type(Arg5022_0, shen_tuple) && shenjs_empty$question$(shenjs_call(shen_fst, [Arg5022_0]))))
  ? (function() {
  return shenjs_call_tail(shen_snd, [Arg5022_0]);})
  : (function() {
  return shenjs_call_tail(shen_interror, ["syntax error with ==========~%", []]);}))},
  1,
  [],
  "shen-right->left"];
shenjs_functions["shen_shen-right->left"] = shen_right_$gt$left;






shen_rule_$gt$horn_clause = [shen_type_func,
  function shen_user_lambda5025(Arg5024) {
  if (Arg5024.length < 2) return [shen_type_func, shen_user_lambda5025, 2, Arg5024];
  var Arg5024_0 = Arg5024[0], Arg5024_1 = Arg5024[1];
  return (((shenjs_is_type(Arg5024_1, shen_type_cons) && (shenjs_is_type(Arg5024_1[2], shen_type_cons) && (shenjs_is_type(Arg5024_1[2][2], shen_type_cons) && (shenjs_is_type(Arg5024_1[2][2][1], shen_tuple) && shenjs_empty$question$(Arg5024_1[2][2][2]))))))
  ? [shen_type_cons, shenjs_call(shen_rule_$gt$horn_clause_head, [Arg5024_0, shenjs_call(shen_snd, [Arg5024_1[2][2][1]])]), [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, shenjs_call(shen_rule_$gt$horn_clause_body, [Arg5024_1[1], Arg5024_1[2][1], shenjs_call(shen_fst, [Arg5024_1[2][2][1]])]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-rule->horn-clause"]]);}))},
  2,
  [],
  "shen-rule->horn-clause"];
shenjs_functions["shen_shen-rule->horn-clause"] = shen_rule_$gt$horn_clause;






shen_rule_$gt$horn_clause_head = [shen_type_func,
  function shen_user_lambda5027(Arg5026) {
  if (Arg5026.length < 2) return [shen_type_func, shen_user_lambda5027, 2, Arg5026];
  var Arg5026_0 = Arg5026[0], Arg5026_1 = Arg5026[1];
  return [shen_type_cons, Arg5026_0, [shen_type_cons, shenjs_call(shen_mode_ify, [Arg5026_1]), [shen_type_cons, [shen_type_symbol, "Context_1957"], []]]]},
  2,
  [],
  "shen-rule->horn-clause-head"];
shenjs_functions["shen_shen-rule->horn-clause-head"] = shen_rule_$gt$horn_clause_head;






shen_mode_ify = [shen_type_func,
  function shen_user_lambda5029(Arg5028) {
  if (Arg5028.length < 1) return [shen_type_func, shen_user_lambda5029, 1, Arg5028];
  var Arg5028_0 = Arg5028[0];
  return (((shenjs_is_type(Arg5028_0, shen_type_cons) && (shenjs_is_type(Arg5028_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], Arg5028_0[2][1])) && (shenjs_is_type(Arg5028_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg5028_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, [shen_type_cons, Arg5028_0[1], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg5028_0[2][2][1], [shen_type_cons, [shen_type_symbol, "+"], []]]], []]]], [shen_type_cons, [shen_type_symbol, "-"], []]]]
  : Arg5028_0)},
  1,
  [],
  "shen-mode-ify"];
shenjs_functions["shen_shen-mode-ify"] = shen_mode_ify;






shen_rule_$gt$horn_clause_body = [shen_type_func,
  function shen_user_lambda5031(Arg5030) {
  if (Arg5030.length < 3) return [shen_type_func, shen_user_lambda5031, 3, Arg5030];
  var Arg5030_0 = Arg5030[0], Arg5030_1 = Arg5030[1], Arg5030_2 = Arg5030[2];
  var R0, R1, R2;
  return ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5033(Arg5032) {
  if (Arg5032.length < 1) return [shen_type_func, shen_user_lambda5033, 1, Arg5032];
  var Arg5032_0 = Arg5032[0];
  return (function() {
  return shenjs_call_tail(shen_extract$_vars, [Arg5032_0]);})},
  1,
  []], Arg5030_2])),
  (R1 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5035(Arg5034) {
  if (Arg5034.length < 1) return [shen_type_func, shen_user_lambda5035, 1, Arg5034];
  var Arg5034_0 = Arg5034[0];
  return (function() {
  return shenjs_call_tail(shen_gensym, [[shen_type_symbol, "shen-cl"]]);})},
  1,
  []], Arg5030_2])),
  (R2 = shenjs_call(shen_construct_search_literals, [R1, R0, [shen_type_symbol, "Context_1957"], [shen_type_symbol, "Context1_1957"]])),
  shenjs_call(shen_construct_search_clauses, [R1, Arg5030_2, R0]),
  (R1 = shenjs_call(shen_construct_side_literals, [Arg5030_0])),
  (R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5037(Arg5036) {
  if (Arg5036.length < 2) return [shen_type_func, shen_user_lambda5037, 2, Arg5036];
  var Arg5036_0 = Arg5036[0], Arg5036_1 = Arg5036[1];
  return (function() {
  return shenjs_call_tail(shen_construct_premiss_literal, [Arg5036_1, shenjs_empty$question$(Arg5036_0)]);})},
  2,
  [Arg5030_2]], Arg5030_1])),
  (function() {
  return shenjs_call_tail(shen_append, [R2, shenjs_call(shen_append, [R1, R0])]);}))},
  3,
  [],
  "shen-rule->horn-clause-body"];
shenjs_functions["shen_shen-rule->horn-clause-body"] = shen_rule_$gt$horn_clause_body;






shen_construct_search_literals = [shen_type_func,
  function shen_user_lambda5039(Arg5038) {
  if (Arg5038.length < 4) return [shen_type_func, shen_user_lambda5039, 4, Arg5038];
  var Arg5038_0 = Arg5038[0], Arg5038_1 = Arg5038[1], Arg5038_2 = Arg5038[2], Arg5038_3 = Arg5038[3];
  return (((shenjs_empty$question$(Arg5038_0) && shenjs_empty$question$(Arg5038_1)))
  ? []
  : (function() {
  return shenjs_call_tail(shen_csl_help, [Arg5038_0, Arg5038_1, Arg5038_2, Arg5038_3]);}))},
  4,
  [],
  "shen-construct-search-literals"];
shenjs_functions["shen_shen-construct-search-literals"] = shen_construct_search_literals;






shen_csl_help = [shen_type_func,
  function shen_user_lambda5041(Arg5040) {
  if (Arg5040.length < 4) return [shen_type_func, shen_user_lambda5041, 4, Arg5040];
  var Arg5040_0 = Arg5040[0], Arg5040_1 = Arg5040[1], Arg5040_2 = Arg5040[2], Arg5040_3 = Arg5040[3];
  return (((shenjs_empty$question$(Arg5040_0) && shenjs_empty$question$(Arg5040_1)))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, [shen_type_symbol, "ContextOut_1957"], [shen_type_cons, Arg5040_2, []]]], []]
  : (((shenjs_is_type(Arg5040_0, shen_type_cons) && shenjs_is_type(Arg5040_1, shen_type_cons)))
  ? [shen_type_cons, [shen_type_cons, Arg5040_0[1], [shen_type_cons, Arg5040_2, [shen_type_cons, Arg5040_3, Arg5040_1[1]]]], shenjs_call(shen_csl_help, [Arg5040_0[2], Arg5040_1[2], Arg5040_3, shenjs_call(shen_gensym, [[shen_type_symbol, "Context"]])])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-csl-help"]]);})))},
  4,
  [],
  "shen-csl-help"];
shenjs_functions["shen_shen-csl-help"] = shen_csl_help;






shen_construct_search_clauses = [shen_type_func,
  function shen_user_lambda5043(Arg5042) {
  if (Arg5042.length < 3) return [shen_type_func, shen_user_lambda5043, 3, Arg5042];
  var Arg5042_0 = Arg5042[0], Arg5042_1 = Arg5042[1], Arg5042_2 = Arg5042[2];
  return (((shenjs_empty$question$(Arg5042_0) && (shenjs_empty$question$(Arg5042_1) && shenjs_empty$question$(Arg5042_2))))
  ? [shen_type_symbol, "shen-skip"]
  : (((shenjs_is_type(Arg5042_0, shen_type_cons) && (shenjs_is_type(Arg5042_1, shen_type_cons) && shenjs_is_type(Arg5042_2, shen_type_cons))))
  ? (shenjs_call(shen_construct_search_clause, [Arg5042_0[1], Arg5042_1[1], Arg5042_2[1]]),
  (function() {
  return shenjs_call_tail(shen_construct_search_clauses, [Arg5042_0[2], Arg5042_1[2], Arg5042_2[2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-construct-search-clauses"]]);})))},
  3,
  [],
  "shen-construct-search-clauses"];
shenjs_functions["shen_shen-construct-search-clauses"] = shen_construct_search_clauses;






shen_construct_search_clause = [shen_type_func,
  function shen_user_lambda5045(Arg5044) {
  if (Arg5044.length < 3) return [shen_type_func, shen_user_lambda5045, 3, Arg5044];
  var Arg5044_0 = Arg5044[0], Arg5044_1 = Arg5044[1], Arg5044_2 = Arg5044[2];
  return (function() {
  return shenjs_call_tail(shen_s_prolog, [[shen_type_cons, shenjs_call(shen_construct_base_search_clause, [Arg5044_0, Arg5044_1, Arg5044_2]), [shen_type_cons, shenjs_call(shen_construct_recursive_search_clause, [Arg5044_0, Arg5044_1, Arg5044_2]), []]]]);})},
  3,
  [],
  "shen-construct-search-clause"];
shenjs_functions["shen_shen-construct-search-clause"] = shen_construct_search_clause;






shen_construct_base_search_clause = [shen_type_func,
  function shen_user_lambda5047(Arg5046) {
  if (Arg5046.length < 3) return [shen_type_func, shen_user_lambda5047, 3, Arg5046];
  var Arg5046_0 = Arg5046[0], Arg5046_1 = Arg5046[1], Arg5046_2 = Arg5046[2];
  return [shen_type_cons, [shen_type_cons, Arg5046_0, [shen_type_cons, [shen_type_cons, shenjs_call(shen_mode_ify, [Arg5046_1]), [shen_type_symbol, "In_1957"]], [shen_type_cons, [shen_type_symbol, "In_1957"], Arg5046_2]]], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [], []]]]},
  3,
  [],
  "shen-construct-base-search-clause"];
shenjs_functions["shen_shen-construct-base-search-clause"] = shen_construct_base_search_clause;






shen_construct_recursive_search_clause = [shen_type_func,
  function shen_user_lambda5049(Arg5048) {
  if (Arg5048.length < 3) return [shen_type_func, shen_user_lambda5049, 3, Arg5048];
  var Arg5048_0 = Arg5048[0], Arg5048_1 = Arg5048[1], Arg5048_2 = Arg5048[2];
  return [shen_type_cons, [shen_type_cons, Arg5048_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "Assumption_1957"], [shen_type_symbol, "Assumptions_1957"]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "Assumption_1957"], [shen_type_symbol, "Out_1957"]], Arg5048_2]]], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [shen_type_cons, [shen_type_cons, Arg5048_0, [shen_type_cons, [shen_type_symbol, "Assumptions_1957"], [shen_type_cons, [shen_type_symbol, "Out_1957"], Arg5048_2]]], []], []]]]},
  3,
  [],
  "shen-construct-recursive-search-clause"];
shenjs_functions["shen_shen-construct-recursive-search-clause"] = shen_construct_recursive_search_clause;






shen_construct_side_literals = [shen_type_func,
  function shen_user_lambda5051(Arg5050) {
  if (Arg5050.length < 1) return [shen_type_func, shen_user_lambda5051, 1, Arg5050];
  var Arg5050_0 = Arg5050[0];
  return ((shenjs_empty$question$(Arg5050_0))
  ? []
  : (((shenjs_is_type(Arg5050_0, shen_type_cons) && (shenjs_is_type(Arg5050_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "if"], Arg5050_0[1][1])) && (shenjs_is_type(Arg5050_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg5050_0[1][2][2]))))))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "when"], Arg5050_0[1][2]], shenjs_call(shen_construct_side_literals, [Arg5050_0[2]])]
  : (((shenjs_is_type(Arg5050_0, shen_type_cons) && (shenjs_is_type(Arg5050_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg5050_0[1][1])) && (shenjs_is_type(Arg5050_0[1][2], shen_type_cons) && (shenjs_is_type(Arg5050_0[1][2][2], shen_type_cons) && shenjs_empty$question$(Arg5050_0[1][2][2][2])))))))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "is"], Arg5050_0[1][2]], shenjs_call(shen_construct_side_literals, [Arg5050_0[2]])]
  : ((shenjs_is_type(Arg5050_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_construct_side_literals, [Arg5050_0[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-construct-side-literals"]]);})))))},
  1,
  [],
  "shen-construct-side-literals"];
shenjs_functions["shen_shen-construct-side-literals"] = shen_construct_side_literals;






shen_construct_premiss_literal = [shen_type_func,
  function shen_user_lambda5053(Arg5052) {
  if (Arg5052.length < 2) return [shen_type_func, shen_user_lambda5053, 2, Arg5052];
  var Arg5052_0 = Arg5052[0], Arg5052_1 = Arg5052[1];
  return ((shenjs_is_type(Arg5052_0, shen_tuple))
  ? [shen_type_cons, [shen_type_symbol, "shen-t*"], [shen_type_cons, shenjs_call(shen_recursive$_cons$_form, [shenjs_call(shen_snd, [Arg5052_0])]), [shen_type_cons, shenjs_call(shen_construct_context, [Arg5052_1, shenjs_call(shen_fst, [Arg5052_0])]), []]]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "!"], Arg5052_0)))
  ? [shen_type_cons, [shen_type_symbol, "cut"], [shen_type_cons, [shen_type_symbol, "Throwcontrol"], []]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-construct-premiss-literal"]]);})))},
  2,
  [],
  "shen-construct-premiss-literal"];
shenjs_functions["shen_shen-construct-premiss-literal"] = shen_construct_premiss_literal;






shen_construct_context = [shen_type_func,
  function shen_user_lambda5055(Arg5054) {
  if (Arg5054.length < 2) return [shen_type_func, shen_user_lambda5055, 2, Arg5054];
  var Arg5054_0 = Arg5054[0], Arg5054_1 = Arg5054[1];
  return (((shenjs_unwind_tail(shenjs_$eq$(true, Arg5054_0)) && shenjs_empty$question$(Arg5054_1)))
  ? [shen_type_symbol, "Context_1957"]
  : (((shenjs_unwind_tail(shenjs_$eq$(false, Arg5054_0)) && shenjs_empty$question$(Arg5054_1)))
  ? [shen_type_symbol, "ContextOut_1957"]
  : ((shenjs_is_type(Arg5054_1, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, shenjs_call(shen_recursive$_cons$_form, [Arg5054_1[1]]), [shen_type_cons, shenjs_call(shen_construct_context, [Arg5054_0, Arg5054_1[2]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-construct-context"]]);}))))},
  2,
  [],
  "shen-construct-context"];
shenjs_functions["shen_shen-construct-context"] = shen_construct_context;






shen_recursive$_cons$_form = [shen_type_func,
  function shen_user_lambda5057(Arg5056) {
  if (Arg5056.length < 1) return [shen_type_func, shen_user_lambda5057, 1, Arg5056];
  var Arg5056_0 = Arg5056[0];
  return ((shenjs_is_type(Arg5056_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, shenjs_call(shen_recursive$_cons$_form, [Arg5056_0[1]]), [shen_type_cons, shenjs_call(shen_recursive$_cons$_form, [Arg5056_0[2]]), []]]]
  : Arg5056_0)},
  1,
  [],
  "shen-recursive_cons_form"];
shenjs_functions["shen_shen-recursive_cons_form"] = shen_recursive$_cons$_form;






shen_preclude = [shen_type_func,
  function shen_user_lambda5059(Arg5058) {
  if (Arg5058.length < 1) return [shen_type_func, shen_user_lambda5059, 1, Arg5058];
  var Arg5058_0 = Arg5058[0];
  return ((shenjs_globals["shen_shen-*datatypes*"] = shenjs_call(shen_difference, [(shenjs_globals["shen_shen-*datatypes*"]), Arg5058_0])),
  (shenjs_globals["shen_shen-*datatypes*"]))},
  1,
  [],
  "preclude"];
shenjs_functions["shen_preclude"] = shen_preclude;






shen_include = [shen_type_func,
  function shen_user_lambda5061(Arg5060) {
  if (Arg5060.length < 1) return [shen_type_func, shen_user_lambda5061, 1, Arg5060];
  var Arg5060_0 = Arg5060[0];
  var R0;
  return ((R0 = shenjs_call(shen_intersection, [Arg5060_0, (shenjs_globals["shen_shen-*alldatatypes*"])])),
  (shenjs_globals["shen_shen-*datatypes*"] = shenjs_call(shen_union, [R0, (shenjs_globals["shen_shen-*datatypes*"])])),
  (shenjs_globals["shen_shen-*datatypes*"]))},
  1,
  [],
  "include"];
shenjs_functions["shen_include"] = shen_include;






shen_preclude_all_but = [shen_type_func,
  function shen_user_lambda5063(Arg5062) {
  if (Arg5062.length < 1) return [shen_type_func, shen_user_lambda5063, 1, Arg5062];
  var Arg5062_0 = Arg5062[0];
  return (function() {
  return shenjs_call_tail(shen_preclude, [shenjs_call(shen_difference, [(shenjs_globals["shen_shen-*alldatatypes*"]), Arg5062_0])]);})},
  1,
  [],
  "preclude-all-but"];
shenjs_functions["shen_preclude-all-but"] = shen_preclude_all_but;






shen_include_all_but = [shen_type_func,
  function shen_user_lambda5065(Arg5064) {
  if (Arg5064.length < 1) return [shen_type_func, shen_user_lambda5065, 1, Arg5064];
  var Arg5064_0 = Arg5064[0];
  return (function() {
  return shenjs_call_tail(shen_include, [shenjs_call(shen_difference, [(shenjs_globals["shen_shen-*alldatatypes*"]), Arg5064_0])]);})},
  1,
  [],
  "include-all-but"];
shenjs_functions["shen_include-all-but"] = shen_include_all_but;






shen_synonyms_help = [shen_type_func,
  function shen_user_lambda5067(Arg5066) {
  if (Arg5066.length < 1) return [shen_type_func, shen_user_lambda5067, 1, Arg5066];
  var Arg5066_0 = Arg5066[0];
  return ((shenjs_empty$question$(Arg5066_0))
  ? [shen_type_symbol, "synonyms"]
  : (((shenjs_is_type(Arg5066_0, shen_type_cons) && shenjs_is_type(Arg5066_0[2], shen_type_cons)))
  ? (shenjs_call(shen_pushnew, [[shen_type_cons, Arg5066_0[1], Arg5066_0[2][1]], [shen_type_symbol, "shen-*synonyms*"]]),
  (function() {
  return shenjs_call_tail(shen_synonyms_help, [Arg5066_0[2][2]]);}))
  : (function() {
  return shenjs_call_tail(shen_interror, ["odd number of synonyms~%", [shen_tuple, [], []]]);})))},
  1,
  [],
  "shen-synonyms-help"];
shenjs_functions["shen_shen-synonyms-help"] = shen_synonyms_help;






shen_pushnew = [shen_type_func,
  function shen_user_lambda5069(Arg5068) {
  if (Arg5068.length < 2) return [shen_type_func, shen_user_lambda5069, 2, Arg5068];
  var Arg5068_0 = Arg5068[0], Arg5068_1 = Arg5068[1];
  return ((shenjs_call(shen_element$question$, [Arg5068_0, (shenjs_globals["shen_" + Arg5068_1[1]])]))
  ? (shenjs_globals["shen_" + Arg5068_1[1]])
  : (shenjs_globals["shen_" + Arg5068_1[1]] = [shen_type_cons, Arg5068_0, (shenjs_globals["shen_" + Arg5068_1[1]])]))},
  2,
  [],
  "shen-pushnew"];
shenjs_functions["shen_shen-pushnew"] = shen_pushnew;












shen_yacc = [shen_type_func,
  function shen_user_lambda6054(Arg6053) {
  if (Arg6053.length < 1) return [shen_type_func, shen_user_lambda6054, 1, Arg6053];
  var Arg6053_0 = Arg6053[0];
  return (((shenjs_is_type(Arg6053_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defcc"], Arg6053_0[1])) && shenjs_is_type(Arg6053_0[2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_yacc_$gt$shen, [Arg6053_0[2][1], Arg6053_0[2][2], shenjs_call(shen_extract_segvars, [Arg6053_0[2][2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-yacc"]]);}))},
  1,
  [],
  "shen-yacc"];
shenjs_functions["shen_shen-yacc"] = shen_yacc;






shen_extract_segvars = [shen_type_func,
  function shen_user_lambda6056(Arg6055) {
  if (Arg6055.length < 1) return [shen_type_func, shen_user_lambda6056, 1, Arg6055];
  var Arg6055_0 = Arg6055[0];
  return ((shenjs_call(shen_segvar$question$, [Arg6055_0]))
  ? [shen_type_cons, Arg6055_0, []]
  : ((shenjs_is_type(Arg6055_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_union, [shenjs_call(shen_extract_segvars, [Arg6055_0[1]]), shenjs_call(shen_extract_segvars, [Arg6055_0[2]])]);})
  : []))},
  1,
  [],
  "shen-extract-segvars"];
shenjs_functions["shen_shen-extract-segvars"] = shen_extract_segvars;






shen_yacc_$gt$shen = [shen_type_func,
  function shen_user_lambda6058(Arg6057) {
  if (Arg6057.length < 3) return [shen_type_func, shen_user_lambda6058, 3, Arg6057];
  var Arg6057_0 = Arg6057[0], Arg6057_1 = Arg6057[1], Arg6057_2 = Arg6057[2];
  var R0;
  return ((R0 = [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg6057_0, shenjs_call(shen_yacc$_cases, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda6060(Arg6059) {
  if (Arg6059.length < 1) return [shen_type_func, shen_user_lambda6060, 1, Arg6059];
  var Arg6059_0 = Arg6059[0];
  return (function() {
  return shenjs_call_tail(shen_cc$_body, [Arg6059_0]);})},
  1,
  []], shenjs_call(shen_split$_cc$_rules, [Arg6057_1, []])])])]]),
  ((shenjs_empty$question$(Arg6057_2))
  ? R0
  : [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, [shen_type_symbol, "null"], [shen_type_cons, [], [shen_type_cons, R0, shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda6062(Arg6061) {
  if (Arg6061.length < 1) return [shen_type_func, shen_user_lambda6062, 1, Arg6061];
  var Arg6061_0 = Arg6061[0];
  return (function() {
  return shenjs_call_tail(shen_segdef, [Arg6061_0]);})},
  1,
  []], Arg6057_2])]]]]))},
  3,
  [],
  "shen-yacc->shen"];
shenjs_functions["shen_shen-yacc->shen"] = shen_yacc_$gt$shen;






shen_segdef = [shen_type_func,
  function shen_user_lambda6064(Arg6063) {
  if (Arg6063.length < 1) return [shen_type_func, shen_user_lambda6064, 1, Arg6063];
  var Arg6063_0 = Arg6063[0];
  return [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg6063_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "In"], [shen_type_cons, [shen_type_symbol, "Out"], []]]], [shen_type_cons, [shen_type_symbol, "Continuation"], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Continue"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "Continuation"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "reverse"], [shen_type_cons, [shen_type_symbol, "Out"], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "In"], [shen_type_cons, [], []]]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "Continue"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_symbol, "In"], []]], []]]], [shen_type_cons, [shen_type_cons, Arg6063_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_symbol, "In"], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_symbol, "In"], []]], [shen_type_cons, [shen_type_symbol, "Out"], []]]], []]]], [shen_type_cons, [shen_type_symbol, "Continuation"], []]]], [shen_type_cons, [shen_type_symbol, "Continue"], []]]]], []]]]], []]]]]]]},
  1,
  [],
  "shen-segdef"];
shenjs_functions["shen_shen-segdef"] = shen_segdef;






shen_yacc$_cases = [shen_type_func,
  function shen_user_lambda6066(Arg6065) {
  if (Arg6065.length < 1) return [shen_type_func, shen_user_lambda6066, 1, Arg6065];
  var Arg6065_0 = Arg6065[0];
  return (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(shen_mapcan, [[shen_type_func,
  function shen_user_lambda6068(Arg6067) {
  if (Arg6067.length < 1) return [shen_type_func, shen_user_lambda6068, 1, Arg6067];
  var Arg6067_0 = Arg6067[0];
  return [shen_type_cons, [shen_type_symbol, "Stream"], [shen_type_cons, [shen_type_symbol, "<-"], [shen_type_cons, Arg6067_0, []]]]},
  1,
  []], Arg6065_0]), [shen_type_cons, [shen_type_symbol, "_"], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]]]]);})},
  1,
  [],
  "shen-yacc_cases"];
shenjs_functions["shen_shen-yacc_cases"] = shen_yacc$_cases;






shen_first$_n = [shen_type_func,
  function shen_user_lambda6070(Arg6069) {
  if (Arg6069.length < 2) return [shen_type_func, shen_user_lambda6070, 2, Arg6069];
  var Arg6069_0 = Arg6069[0], Arg6069_1 = Arg6069[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg6069_0)))
  ? []
  : ((shenjs_empty$question$(Arg6069_1))
  ? []
  : ((shenjs_is_type(Arg6069_1, shen_type_cons))
  ? [shen_type_cons, Arg6069_1[1], shenjs_call(shen_first$_n, [(Arg6069_0 - 1), Arg6069_1[2]])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-first_n"]]);}))))},
  2,
  [],
  "shen-first_n"];
shenjs_functions["shen_shen-first_n"] = shen_first$_n;






shen_split$_cc$_rules = [shen_type_func,
  function shen_user_lambda6072(Arg6071) {
  if (Arg6071.length < 2) return [shen_type_func, shen_user_lambda6072, 2, Arg6071];
  var Arg6071_0 = Arg6071[0], Arg6071_1 = Arg6071[1];
  return (((shenjs_empty$question$(Arg6071_0) && shenjs_empty$question$(Arg6071_1)))
  ? []
  : ((shenjs_empty$question$(Arg6071_0))
  ? [shen_type_cons, shenjs_call(shen_split$_cc$_rule, [shenjs_call(shen_reverse, [Arg6071_1]), []]), []]
  : (((shenjs_is_type(Arg6071_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ";"], Arg6071_0[1]))))
  ? [shen_type_cons, shenjs_call(shen_split$_cc$_rule, [shenjs_call(shen_reverse, [Arg6071_1]), []]), shenjs_call(shen_split$_cc$_rules, [Arg6071_0[2], []])]
  : ((shenjs_is_type(Arg6071_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_split$_cc$_rules, [Arg6071_0[2], [shen_type_cons, Arg6071_0[1], Arg6071_1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-split_cc_rules"]]);})))))},
  2,
  [],
  "shen-split_cc_rules"];
shenjs_functions["shen_shen-split_cc_rules"] = shen_split$_cc$_rules;






shen_split$_cc$_rule = [shen_type_func,
  function shen_user_lambda6074(Arg6073) {
  if (Arg6073.length < 2) return [shen_type_func, shen_user_lambda6074, 2, Arg6073];
  var Arg6073_0 = Arg6073[0], Arg6073_1 = Arg6073[1];
  return (((shenjs_is_type(Arg6073_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":="], Arg6073_0[1])) && (shenjs_is_type(Arg6073_0[2], shen_type_cons) && shenjs_empty$question$(Arg6073_0[2][2])))))
  ? [shen_type_cons, shenjs_call(shen_reverse, [Arg6073_1]), Arg6073_0[2]]
  : (((shenjs_is_type(Arg6073_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":="], Arg6073_0[1]))))
  ? [shen_type_cons, shenjs_call(shen_reverse, [Arg6073_1]), [shen_type_cons, shenjs_call(shen_cons$_form, [Arg6073_0[2]]), []]]
  : ((shenjs_empty$question$(Arg6073_0))
  ? (shenjs_call(shen_intoutput, ["warning: ", []]),
  shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda6076(Arg6075) {
  if (Arg6075.length < 1) return [shen_type_func, shen_user_lambda6076, 1, Arg6075];
  var Arg6075_0 = Arg6075[0];
  return (function() {
  return shenjs_call_tail(shen_intoutput, ["~A ", [shen_tuple, Arg6075_0, []]]);})},
  1,
  []], shenjs_call(shen_reverse, [Arg6073_1])]),
  shenjs_call(shen_intoutput, ["has no semantics.~%", []]),
  (function() {
  return shenjs_call_tail(shen_split$_cc$_rule, [[shen_type_cons, [shen_type_symbol, ":="], [shen_type_cons, shenjs_call(shen_default$_semantics, [shenjs_call(shen_reverse, [Arg6073_1])]), []]], Arg6073_1]);}))
  : ((shenjs_is_type(Arg6073_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_split$_cc$_rule, [Arg6073_0[2], [shen_type_cons, Arg6073_0[1], Arg6073_1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-split_cc_rule"]]);})))))},
  2,
  [],
  "shen-split_cc_rule"];
shenjs_functions["shen_shen-split_cc_rule"] = shen_split$_cc$_rule;






shen_default$_semantics = [shen_type_func,
  function shen_user_lambda6078(Arg6077) {
  if (Arg6077.length < 1) return [shen_type_func, shen_user_lambda6078, 1, Arg6077];
  var Arg6077_0 = Arg6077[0];
  var R0;
  return ((shenjs_empty$question$(Arg6077_0))
  ? []
  : (((shenjs_is_type(Arg6077_0, shen_type_cons) && shenjs_call(shen_grammar$_symbol$question$, [Arg6077_0[1]])))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg6077_0[1]]), []]]),
  ((shenjs_empty$question$(Arg6077_0[2]))
  ? R0
  : [shen_type_cons, [shen_type_symbol, "append"], [shen_type_cons, R0, [shen_type_cons, shenjs_call(shen_default$_semantics, [Arg6077_0[2]]), []]]]))
  : ((shenjs_is_type(Arg6077_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, Arg6077_0[1], [shen_type_cons, shenjs_call(shen_default$_semantics, [Arg6077_0[2]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-default_semantics"]]);}))))},
  1,
  [],
  "shen-default_semantics"];
shenjs_functions["shen_shen-default_semantics"] = shen_default$_semantics;






shen_cc$_body = [shen_type_func,
  function shen_user_lambda6080(Arg6079) {
  if (Arg6079.length < 1) return [shen_type_func, shen_user_lambda6080, 1, Arg6079];
  var Arg6079_0 = Arg6079[0];
  return (((shenjs_is_type(Arg6079_0, shen_type_cons) && (shenjs_is_type(Arg6079_0[2], shen_type_cons) && shenjs_empty$question$(Arg6079_0[2][2]))))
  ? (function() {
  return shenjs_call_tail(shen_syntax, [Arg6079_0[1], [shen_type_symbol, "Stream"], Arg6079_0[2][1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-cc_body"]]);}))},
  1,
  [],
  "shen-cc_body"];
shenjs_functions["shen_shen-cc_body"] = shen_cc$_body;






shen_syntax = [shen_type_func,
  function shen_user_lambda6082(Arg6081) {
  if (Arg6081.length < 3) return [shen_type_func, shen_user_lambda6082, 3, Arg6081];
  var Arg6081_0 = Arg6081[0], Arg6081_1 = Arg6081[1], Arg6081_2 = Arg6081[2];
  return ((shenjs_empty$question$(Arg6081_0))
  ? [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6081_1, []]], [shen_type_cons, shenjs_call(shen_semantics, [Arg6081_2]), []]]]
  : ((shenjs_is_type(Arg6081_0, shen_type_cons))
  ? ((shenjs_call(shen_grammar$_symbol$question$, [Arg6081_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_recursive$_descent, [Arg6081_0, Arg6081_1, Arg6081_2]);})
  : ((shenjs_call(shen_segvar$question$, [Arg6081_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_segment_match, [Arg6081_0, Arg6081_1, Arg6081_2]);})
  : ((shenjs_call(shen_terminal$question$, [Arg6081_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_check$_stream, [Arg6081_0, Arg6081_1, Arg6081_2]);})
  : ((shenjs_call(shen_jump$_stream$question$, [Arg6081_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_jump$_stream, [Arg6081_0, Arg6081_1, Arg6081_2]);})
  : ((shenjs_call(shen_list$_stream$question$, [Arg6081_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_list$_stream, [shenjs_call(shen_decons, [Arg6081_0[1]]), Arg6081_0[2], Arg6081_1, Arg6081_2]);})
  : (function() {
  return shenjs_call_tail(shen_interror, ["~A is not legal syntax~%", [shen_tuple, Arg6081_0[1], []]]);}))))))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-syntax"]]);})))},
  3,
  [],
  "shen-syntax"];
shenjs_functions["shen_shen-syntax"] = shen_syntax;






shen_list$_stream$question$ = [shen_type_func,
  function shen_user_lambda6084(Arg6083) {
  if (Arg6083.length < 1) return [shen_type_func, shen_user_lambda6084, 1, Arg6083];
  var Arg6083_0 = Arg6083[0];
  return ((shenjs_is_type(Arg6083_0, shen_type_cons))
  ? true
  : false)},
  1,
  [],
  "shen-list_stream?"];
shenjs_functions["shen_shen-list_stream?"] = shen_list$_stream$question$;






shen_decons = [shen_type_func,
  function shen_user_lambda6086(Arg6085) {
  if (Arg6085.length < 1) return [shen_type_func, shen_user_lambda6086, 1, Arg6085];
  var Arg6085_0 = Arg6085[0];
  return (((shenjs_is_type(Arg6085_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg6085_0[1])) && (shenjs_is_type(Arg6085_0[2], shen_type_cons) && (shenjs_is_type(Arg6085_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg6085_0[2][2][2]))))))
  ? [shen_type_cons, Arg6085_0[2][1], shenjs_call(shen_decons, [Arg6085_0[2][2][1]])]
  : Arg6085_0)},
  1,
  [],
  "shen-decons"];
shenjs_functions["shen_shen-decons"] = shen_decons;






shen_list$_stream = [shen_type_func,
  function shen_user_lambda6088(Arg6087) {
  if (Arg6087.length < 4) return [shen_type_func, shen_user_lambda6088, 4, Arg6087];
  var Arg6087_0 = Arg6087[0], Arg6087_1 = Arg6087[1], Arg6087_2 = Arg6087[2], Arg6087_3 = Arg6087[3];
  var R0, R1, R2;
  return ((R0 = [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6087_2, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6087_2, []]], []]], []]], []]]]),
  (R1 = [shen_type_cons, [shen_type_symbol, "shen-snd-or-fail"], [shen_type_cons, shenjs_call(shen_syntax, [Arg6087_0, [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6087_2, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, Arg6087_2, []]], []]]], [shen_type_cons, [shen_type_symbol, "shen-leave!"], [shen_type_cons, shenjs_call(shen_syntax, [Arg6087_1, [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6087_2, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, Arg6087_2, []]], []]]], Arg6087_3]), []]]]), []]]),
  (R2 = [shen_type_cons, [shen_type_symbol, "fail"], []]),
  [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, R0, [shen_type_cons, R1, [shen_type_cons, R2, []]]]])},
  4,
  [],
  "shen-list_stream"];
shenjs_functions["shen_shen-list_stream"] = shen_list$_stream;






shen_snd_or_fail = [shen_type_func,
  function shen_user_lambda6090(Arg6089) {
  if (Arg6089.length < 1) return [shen_type_func, shen_user_lambda6090, 1, Arg6089];
  var Arg6089_0 = Arg6089[0];
  return ((shenjs_is_type(Arg6089_0, shen_tuple))
  ? (function() {
  return shenjs_call_tail(shen_snd, [Arg6089_0]);})
  : shen_fail_obj)},
  1,
  [],
  "shen-snd-or-fail"];
shenjs_functions["shen_shen-snd-or-fail"] = shen_snd_or_fail;






shen_grammar$_symbol$question$ = [shen_type_func,
  function shen_user_lambda6092(Arg6091) {
  if (Arg6091.length < 1) return [shen_type_func, shen_user_lambda6092, 1, Arg6091];
  var Arg6091_0 = Arg6091[0];
  var R0;
  return (shenjs_is_type(Arg6091_0, shen_type_symbol) && ((R0 = shenjs_call(shen_explode, [Arg6091_0])),
  (shenjs_unwind_tail(shenjs_$eq$(R0[1], "<")) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_reverse, [R0])[1], ">")))))},
  1,
  [],
  "shen-grammar_symbol?"];
shenjs_functions["shen_shen-grammar_symbol?"] = shen_grammar$_symbol$question$;






shen_recursive$_descent = [shen_type_func,
  function shen_user_lambda6094(Arg6093) {
  if (Arg6093.length < 3) return [shen_type_func, shen_user_lambda6094, 3, Arg6093];
  var Arg6093_0 = Arg6093[0], Arg6093_1 = Arg6093[1], Arg6093_2 = Arg6093[2];
  var R0, R1, R2;
  return ((shenjs_is_type(Arg6093_0, shen_type_cons))
  ? ((R0 = [shen_type_cons, Arg6093_0[1], [shen_type_cons, Arg6093_1, []]]),
  (R1 = shenjs_call(shen_syntax, [Arg6093_0[2], shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg6093_0[1]]), Arg6093_2])),
  (R2 = [shen_type_cons, [shen_type_symbol, "fail"], []]),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg6093_0[1]]), [shen_type_cons, R0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], [shen_type_cons, shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg6093_0[1]]), []]]], []]], [shen_type_cons, R1, [shen_type_cons, R2, []]]]], []]]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-recursive_descent"]]);}))},
  3,
  [],
  "shen-recursive_descent"];
shenjs_functions["shen_shen-recursive_descent"] = shen_recursive$_descent;






shen_segvar$question$ = [shen_type_func,
  function shen_user_lambda6096(Arg6095) {
  if (Arg6095.length < 1) return [shen_type_func, shen_user_lambda6096, 1, Arg6095];
  var Arg6095_0 = Arg6095[0];
  return (shenjs_is_type(Arg6095_0, shen_type_symbol) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_explode, [Arg6095_0])[1], "?")))},
  1,
  [],
  "shen-segvar?"];
shenjs_functions["shen_shen-segvar?"] = shen_segvar$question$;






shen_segment_match = [shen_type_func,
  function shen_user_lambda6098(Arg6097) {
  if (Arg6097.length < 3) return [shen_type_func, shen_user_lambda6098, 3, Arg6097];
  var Arg6097_0 = Arg6097[0], Arg6097_1 = Arg6097[1], Arg6097_2 = Arg6097[2];
  var R0;
  return ((shenjs_is_type(Arg6097_0, shen_type_cons))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, Arg6097_0[1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, [shen_type_symbol, "Restart"], [shen_type_cons, shenjs_call(shen_syntax, [Arg6097_0[2], [shen_type_symbol, "Restart"], Arg6097_2]), []]]], []]]]),
  [shen_type_cons, Arg6097_0[1], [shen_type_cons, Arg6097_1, [shen_type_cons, R0, []]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-segment-match"]]);}))},
  3,
  [],
  "shen-segment-match"];
shenjs_functions["shen_shen-segment-match"] = shen_segment_match;






shen_terminal$question$ = [shen_type_func,
  function shen_user_lambda6100(Arg6099) {
  if (Arg6099.length < 1) return [shen_type_func, shen_user_lambda6100, 1, Arg6099];
  var Arg6099_0 = Arg6099[0];
  return ((shenjs_is_type(Arg6099_0, shen_type_cons))
  ? false
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-*-"], Arg6099_0)))
  ? false
  : true))},
  1,
  [],
  "shen-terminal?"];
shenjs_functions["shen_shen-terminal?"] = shen_terminal$question$;






shen_jump$_stream$question$ = [shen_type_func,
  function shen_user_lambda6102(Arg6101) {
  if (Arg6101.length < 1) return [shen_type_func, shen_user_lambda6102, 1, Arg6101];
  var Arg6101_0 = Arg6101[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-*-"], Arg6101_0)))
  ? true
  : false)},
  1,
  [],
  "shen-jump_stream?"];
shenjs_functions["shen_shen-jump_stream?"] = shen_jump$_stream$question$;






shen_check$_stream = [shen_type_func,
  function shen_user_lambda6104(Arg6103) {
  if (Arg6103.length < 3) return [shen_type_func, shen_user_lambda6104, 3, Arg6103];
  var Arg6103_0 = Arg6103[0], Arg6103_1 = Arg6103[1], Arg6103_2 = Arg6103[2];
  var R0, R1, R2;
  return ((shenjs_is_type(Arg6103_0, shen_type_cons))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6103_1, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, Arg6103_0[1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6103_1, []]], []]], []]]], []]]]),
  (R1 = shenjs_call(shen_syntax, [Arg6103_0[2], [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6103_1, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, Arg6103_1, []]], []]]], Arg6103_2])),
  (R2 = [shen_type_cons, [shen_type_symbol, "fail"], []]),
  [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, R0, [shen_type_cons, R1, [shen_type_cons, R2, []]]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-check_stream"]]);}))},
  3,
  [],
  "shen-check_stream"];
shenjs_functions["shen_shen-check_stream"] = shen_check$_stream;






shen_reassemble = [shen_type_func,
  function shen_user_lambda6106(Arg6105) {
  if (Arg6105.length < 2) return [shen_type_func, shen_user_lambda6106, 2, Arg6105];
  var Arg6105_0 = Arg6105[0], Arg6105_1 = Arg6105[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg6105_1, shen_fail_obj)))
  ? Arg6105_1
  : [shen_tuple, Arg6105_0, Arg6105_1])},
  2,
  [],
  "shen-reassemble"];
shenjs_functions["shen_shen-reassemble"] = shen_reassemble;






shen_jump$_stream = [shen_type_func,
  function shen_user_lambda6108(Arg6107) {
  if (Arg6107.length < 3) return [shen_type_func, shen_user_lambda6108, 3, Arg6107];
  var Arg6107_0 = Arg6107[0], Arg6107_1 = Arg6107[1], Arg6107_2 = Arg6107[2];
  var R0, R1, R2;
  return ((shenjs_is_type(Arg6107_0, shen_type_cons))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6107_1, []]], []]]),
  (R1 = shenjs_call(shen_syntax, [Arg6107_0[2], [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6107_1, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, Arg6107_1, []]], []]]], Arg6107_2])),
  (R2 = [shen_type_cons, [shen_type_symbol, "fail"], []]),
  [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, R0, [shen_type_cons, R1, [shen_type_cons, R2, []]]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-jump_stream"]]);}))},
  3,
  [],
  "shen-jump_stream"];
shenjs_functions["shen_shen-jump_stream"] = shen_jump$_stream;






shen_semantics = [shen_type_func,
  function shen_user_lambda6110(Arg6109) {
  if (Arg6109.length < 1) return [shen_type_func, shen_user_lambda6110, 1, Arg6109];
  var Arg6109_0 = Arg6109[0];
  return (((shenjs_is_type(Arg6109_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-leave!"], Arg6109_0[1])) && (shenjs_is_type(Arg6109_0[2], shen_type_cons) && shenjs_empty$question$(Arg6109_0[2][2])))))
  ? Arg6109_0[2][1]
  : ((shenjs_empty$question$(Arg6109_0))
  ? []
  : ((shenjs_call(shen_grammar$_symbol$question$, [Arg6109_0]))
  ? [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg6109_0]), []]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-o-"], Arg6109_0)))
  ? [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, [shen_type_symbol, "Stream"], []]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-*-"], Arg6109_0)))
  ? [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, [shen_type_symbol, "Stream"], []]], []]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-s-"], Arg6109_0)))
  ? [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, [shen_type_symbol, "Stream"], []]]
  : ((shenjs_is_type(Arg6109_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda6112(Arg6111) {
  if (Arg6111.length < 1) return [shen_type_func, shen_user_lambda6112, 1, Arg6111];
  var Arg6111_0 = Arg6111[0];
  return (function() {
  return shenjs_call_tail(shen_semantics, [Arg6111_0]);})},
  1,
  []], Arg6109_0]);})
  : Arg6109_0)))))))},
  1,
  [],
  "shen-semantics"];
shenjs_functions["shen_shen-semantics"] = shen_semantics;






shen_$lt$$excl$$gt$ = [shen_type_func,
  function shen_user_lambda6114(Arg6113) {
  if (Arg6113.length < 1) return [shen_type_func, shen_user_lambda6114, 1, Arg6113];
  var Arg6113_0 = Arg6113[0];
  return ((shenjs_is_type(Arg6113_0, shen_tuple))
  ? [shen_tuple, [], shenjs_call(shen_fst, [Arg6113_0])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "<!>"]]);}))},
  1,
  [],
  "<!>"];
shenjs_functions["shen_<!>"] = shen_$lt$$excl$$gt$;












shen_print = [shen_type_func,
  function shen_user_lambda6019(Arg6018) {
  if (Arg6018.length < 1) return [shen_type_func, shen_user_lambda6019, 1, Arg6018];
  var Arg6018_0 = Arg6018[0];
  return (shenjs_pr(shenjs_call(shen_ms_h, [[shen_type_cons, "~", [shen_type_cons, "S", []]], [shen_tuple, Arg6018_0, [shen_type_symbol, "shen-skip"]]]), shenjs_call(shen_stoutput, [0])),
  Arg6018_0)},
  1,
  [],
  "print"];
shenjs_functions["shen_print"] = shen_print;






shen_format = [shen_type_func,
  function shen_user_lambda6021(Arg6020) {
  if (Arg6020.length < 3) return [shen_type_func, shen_user_lambda6021, 3, Arg6020];
  var Arg6020_0 = Arg6020[0], Arg6020_1 = Arg6020[1], Arg6020_2 = Arg6020[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg6020_0)))
  ? (function() {
  return shenjs_call_tail(shen_intoutput, [Arg6020_1, [shen_tuple, Arg6020_2, []]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg6020_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, [Arg6020_1, [shen_tuple, Arg6020_2, []]]);})
  : (function() {
  return shenjs_pr(shenjs_call(shen_ms_h, [shenjs_call(shen_explode, [Arg6020_1]), Arg6020_2]), Arg6020_0);})))},
  3,
  [],
  "format"];
shenjs_functions["shen_format"] = shen_format;






shen_intoutput = [shen_type_func,
  function shen_user_lambda6023(Arg6022) {
  if (Arg6022.length < 2) return [shen_type_func, shen_user_lambda6023, 2, Arg6022];
  var Arg6022_0 = Arg6022[0], Arg6022_1 = Arg6022[1];
  return (function() {
  return shenjs_pr(shenjs_call(shen_ms_h, [shenjs_call(shen_explode_string, [Arg6022_0]), Arg6022_1]), shenjs_call(shen_stoutput, [0]));})},
  2,
  [],
  "intoutput"];
shenjs_functions["shen_intoutput"] = shen_intoutput;






shen_interror = [shen_type_func,
  function shen_user_lambda6025(Arg6024) {
  if (Arg6024.length < 2) return [shen_type_func, shen_user_lambda6025, 2, Arg6024];
  var Arg6024_0 = Arg6024[0], Arg6024_1 = Arg6024[1];
  return (function() {
  return shenjs_simple_error(shenjs_call(shen_ms_h, [shenjs_call(shen_explode_string, [Arg6024_0]), Arg6024_1]));})},
  2,
  [],
  "interror"];
shenjs_functions["shen_interror"] = shen_interror;






shen_intmake_string = [shen_type_func,
  function shen_user_lambda6027(Arg6026) {
  if (Arg6026.length < 2) return [shen_type_func, shen_user_lambda6027, 2, Arg6026];
  var Arg6026_0 = Arg6026[0], Arg6026_1 = Arg6026[1];
  return (function() {
  return shenjs_call_tail(shen_ms_h, [shenjs_call(shen_explode_string, [Arg6026_0]), Arg6026_1]);})},
  2,
  [],
  "intmake-string"];
shenjs_functions["shen_intmake-string"] = shen_intmake_string;






shen_ms_h = [shen_type_func,
  function shen_user_lambda6029(Arg6028) {
  if (Arg6028.length < 2) return [shen_type_func, shen_user_lambda6029, 2, Arg6028];
  var Arg6028_0 = Arg6028[0], Arg6028_1 = Arg6028[1];
  return ((shenjs_empty$question$(Arg6028_0))
  ? ""
  : (((shenjs_is_type(Arg6028_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$("~", Arg6028_0[1])) && (shenjs_is_type(Arg6028_0[2], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("%", Arg6028_0[2][1]))))))
  ? (shenjs_n_$gt$string(10) + shenjs_call(shen_ms_h, [Arg6028_0[2][2], Arg6028_1]))
  : (((shenjs_is_type(Arg6028_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$("~", Arg6028_0[1])) && (shenjs_is_type(Arg6028_0[2], shen_type_cons) && (shenjs_is_type(Arg6028_1, shen_tuple) && shenjs_call(shen_element$question$, [Arg6028_0[2][1], [shen_type_cons, "A", [shen_type_cons, "S", [shen_type_cons, "R", []]]]]))))))
  ? (shenjs_call(shen_ob_$gt$str, [Arg6028_0[2][1], shenjs_call(shen_fst, [Arg6028_1])]) + shenjs_call(shen_ms_h, [Arg6028_0[2][2], shenjs_call(shen_snd, [Arg6028_1])]))
  : ((shenjs_is_type(Arg6028_0, shen_type_cons))
  ? (Arg6028_0[1] + shenjs_call(shen_ms_h, [Arg6028_0[2], Arg6028_1]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-ms-h"]]);})))))},
  2,
  [],
  "shen-ms-h"];
shenjs_functions["shen_shen-ms-h"] = shen_ms_h;






shen_ob_$gt$str = [shen_type_func,
  function shen_user_lambda6031(Arg6030) {
  if (Arg6030.length < 2) return [shen_type_func, shen_user_lambda6031, 2, Arg6030];
  var Arg6030_0 = Arg6030[0], Arg6030_1 = Arg6030[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg6030_1, shen_fail_obj)))
  ? "..."
  : ((shenjs_empty$question$(Arg6030_1))
  ? ((shenjs_unwind_tail(shenjs_$eq$(Arg6030_0, "R")))
  ? "()"
  : "[]")
  : ((shenjs_unwind_tail(shenjs_$eq$(Arg6030_1, shenjs_vector(0))))
  ? "<>"
  : ((shenjs_is_type(Arg6030_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_cn_all, [shenjs_call(shen_append, [((shenjs_unwind_tail(shenjs_$eq$(Arg6030_0, "R")))
  ? [shen_type_cons, "(", []]
  : [shen_type_cons, "[", []]), shenjs_call(shen_append, [[shen_type_cons, shenjs_call(shen_ob_$gt$str, [Arg6030_0, Arg6030_1[1]]), []], shenjs_call(shen_append, [shenjs_call(shen_xmapcan, [(shenjs_globals["shen_*maximum-print-sequence-size*"]), [shen_type_func,
  function shen_user_lambda6033(Arg6032) {
  if (Arg6032.length < 2) return [shen_type_func, shen_user_lambda6033, 2, Arg6032];
  var Arg6032_0 = Arg6032[0], Arg6032_1 = Arg6032[1];
  return [shen_type_cons, " ", [shen_type_cons, shenjs_call(shen_ob_$gt$str, [Arg6032_0, Arg6032_1]), []]]},
  2,
  [Arg6030_0]], Arg6030_1[2]]), ((shenjs_unwind_tail(shenjs_$eq$(Arg6030_0, "R")))
  ? [shen_type_cons, ")", []]
  : [shen_type_cons, "]", []])])])])]);})
  : ((shenjs_vector$question$(Arg6030_1))
  ? ((R0 = shenjs_call(shen_vector_$gt$list, [Arg6030_1, 1])),
  (R0 = shenjs_tlstr(shenjs_call(shen_cn_all, [shenjs_call(shen_xmapcan, [((shenjs_globals["shen_*maximum-print-sequence-size*"]) - 1), [shen_type_func,
  function shen_user_lambda6035(Arg6034) {
  if (Arg6034.length < 2) return [shen_type_func, shen_user_lambda6035, 2, Arg6034];
  var Arg6034_0 = Arg6034[0], Arg6034_1 = Arg6034[1];
  return [shen_type_cons, " ", [shen_type_cons, shenjs_call(shen_ob_$gt$str, [Arg6034_0, Arg6034_1]), []]]},
  2,
  [Arg6030_0]], R0])]))),
  (R0 = ("<" + (R0 + ">"))),
  R0)
  : ((((!(typeof(Arg6030_1) == 'string')) && shenjs_absvector$question$(Arg6030_1)))
  ? (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_ob_$gt$str, ["A", shenjs_call(shenjs_absvector_ref(Arg6030_1, 0), [Arg6030_1])]);}, [shen_type_func,
  function shen_user_lambda6037(Arg6036) {
  if (Arg6036.length < 3) return [shen_type_func, shen_user_lambda6037, 3, Arg6036];
  var Arg6036_0 = Arg6036[0], Arg6036_1 = Arg6036[1], Arg6036_2 = Arg6036[2];
  var R0, R1;
  return ((R0 = shenjs_call(shen_vector_$gt$list, [Arg6036_0, 0])),
  (R1 = shenjs_tlstr(shenjs_call(shen_cn_all, [shenjs_call(shen_xmapcan, [((shenjs_globals["shen_*maximum-print-sequence-size*"]) - 1), [shen_type_func,
  function shen_user_lambda6039(Arg6038) {
  if (Arg6038.length < 2) return [shen_type_func, shen_user_lambda6039, 2, Arg6038];
  var Arg6038_0 = Arg6038[0], Arg6038_1 = Arg6038[1];
  return [shen_type_cons, " ", [shen_type_cons, shenjs_call(shen_ob_$gt$str, [Arg6038_0, Arg6038_1]), []]]},
  2,
  [Arg6036_1]], R0])]))),
  (R1 = ("<" + (R1 + ">"))),
  R1)},
  3,
  [Arg6030_1, Arg6030_0]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$(Arg6030_0, "A")) && (typeof(Arg6030_1) == 'string')))
  ? Arg6030_1
  : (function() {
  return shenjs_str(Arg6030_1);}))))))))},
  2,
  [],
  "shen-ob->str"];
shenjs_functions["shen_shen-ob->str"] = shen_ob_$gt$str;






shen_tuple = [shen_type_func,
  function shen_user_lambda6041(Arg6040) {
  if (Arg6040.length < 1) return [shen_type_func, shen_user_lambda6041, 1, Arg6040];
  var Arg6040_0 = Arg6040[0];
  return (function() {
  return shenjs_call_tail(shen_intmake_string, ["(@p ~S ~S)", [shen_tuple, shenjs_call(shen_fst, [Arg6040_0]), [shen_tuple, shenjs_call(shen_snd, [Arg6040_0]), []]]]);})},
  1,
  [],
  "shen-tuple"];
shenjs_functions["shen_shen-tuple"] = shen_tuple;






shen_cn_all = [shen_type_func,
  function shen_user_lambda6043(Arg6042) {
  if (Arg6042.length < 1) return [shen_type_func, shen_user_lambda6043, 1, Arg6042];
  var Arg6042_0 = Arg6042[0];
  return ((shenjs_empty$question$(Arg6042_0))
  ? ""
  : ((shenjs_is_type(Arg6042_0, shen_type_cons))
  ? (Arg6042_0[1] + shenjs_call(shen_cn_all, [Arg6042_0[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-cn-all"]]);})))},
  1,
  [],
  "shen-cn-all"];
shenjs_functions["shen_shen-cn-all"] = shen_cn_all;






shen_xmapcan = [shen_type_func,
  function shen_user_lambda6045(Arg6044) {
  if (Arg6044.length < 3) return [shen_type_func, shen_user_lambda6045, 3, Arg6044];
  var Arg6044_0 = Arg6044[0], Arg6044_1 = Arg6044[1], Arg6044_2 = Arg6044[2];
  return ((shenjs_empty$question$(Arg6044_2))
  ? []
  : ((shenjs_unwind_tail(shenjs_$eq$(0, Arg6044_0)))
  ? [shen_type_cons, "... etc", []]
  : ((shenjs_is_type(Arg6044_2, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(Arg6044_1, [Arg6044_2[1]]), shenjs_call(shen_xmapcan, [(Arg6044_0 - 1), Arg6044_1, Arg6044_2[2]])]);})
  : [shen_type_cons, " |", shenjs_call(Arg6044_1, [Arg6044_2])])))},
  3,
  [],
  "shen-xmapcan"];
shenjs_functions["shen_shen-xmapcan"] = shen_xmapcan;






shen_vector_$gt$list = [shen_type_func,
  function shen_user_lambda6047(Arg6046) {
  if (Arg6046.length < 2) return [shen_type_func, shen_user_lambda6047, 2, Arg6046];
  var Arg6046_0 = Arg6046[0], Arg6046_1 = Arg6046[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$listh, [Arg6046_0, Arg6046_1, []]);})},
  2,
  [],
  "shen-vector->list"];
shenjs_functions["shen_shen-vector->list"] = shen_vector_$gt$list;






shen_vector_$gt$listh = [shen_type_func,
  function shen_user_lambda6049(Arg6048) {
  if (Arg6048.length < 3) return [shen_type_func, shen_user_lambda6049, 3, Arg6048];
  var Arg6048_0 = Arg6048[0], Arg6048_1 = Arg6048[1], Arg6048_2 = Arg6048[2];
  var R0;
  return ((R0 = shenjs_trap_error(function() {return shenjs_absvector_ref(Arg6048_0, Arg6048_1);}, [shen_type_func,
  function shen_user_lambda6051(Arg6050) {
  if (Arg6050.length < 1) return [shen_type_func, shen_user_lambda6051, 1, Arg6050];
  var Arg6050_0 = Arg6050[0];
  return [shen_type_symbol, "shen-out-of-range"]},
  1,
  []])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, [shen_type_symbol, "shen-out-of-range"])))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg6048_2]);})
  : (function() {
  return shenjs_call_tail(shen_vector_$gt$listh, [Arg6048_0, (Arg6048_1 + 1), [shen_type_cons, R0, Arg6048_2]]);})))},
  3,
  [],
  "shen-vector->listh"];
shenjs_functions["shen_shen-vector->listh"] = shen_vector_$gt$listh;












(shenjs_globals["shen_shen-*symbolcodes*"] = shenjs_vector(128));






shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 126, "~");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 122, "z");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 121, "y");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 120, "x");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 119, "w");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 118, "v");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 117, "u");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 116, "t");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 115, "s");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 114, "r");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 113, "q");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 112, "p");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 111, "o");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 110, "n");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 109, "m");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 108, "l");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 107, "k");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 106, "j");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 105, "i");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 104, "h");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 103, "g");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 102, "f");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 101, "e");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 100, "d");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 99, "c");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 98, "b");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 97, "a");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 96, "`");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 95, "_");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 90, "Z");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 89, "Y");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 88, "X");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 87, "W");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 86, "V");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 85, "U");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 84, "T");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 83, "S");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 82, "R");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 81, "Q");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 80, "P");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 79, "O");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 78, "N");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 77, "M");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 76, "L");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 75, "K");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 74, "J");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 73, "I");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 72, "H");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 71, "G");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 70, "F");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 69, "E");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 68, "D");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 67, "C");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 66, "B");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 65, "A");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 64, "@");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 63, "?");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 62, ">");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 61, "=");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 60, "<");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 57, "9");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 56, "8");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 55, "7");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 54, "6");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 53, "5");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 52, "4");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 51, "3");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 50, "2");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 49, "1");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 48, "0");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 47, "/");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 46, ".");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 45, "-");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 43, "+");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 42, "*");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 39, "'");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 38, "&");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 37, "%");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 36, "$");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 35, "#");





shenjs_absvector_set((shenjs_globals["shen_shen-*symbolcodes*"]), 33, "!");





shen_lineread = [shen_type_func,
  function shen_user_lambda4830(Arg4829) {
  if (Arg4829.length < 0) return [shen_type_func, shen_user_lambda4830, 0, Arg4829];
  return (function() {
  return shenjs_call_tail(shen_lineread_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), []]);})},
  0,
  [],
  "lineread"];
shenjs_functions["shen_lineread"] = shen_lineread;






shen_lineread_loop = [shen_type_func,
  function shen_user_lambda4832(Arg4831) {
  if (Arg4831.length < 2) return [shen_type_func, shen_user_lambda4832, 2, Arg4831];
  var Arg4831_0 = Arg4831[0], Arg4831_1 = Arg4831[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4831_0, shenjs_call(shen_hat, []))))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["line read aborted", []]);})
  : ((shenjs_call(shen_element$question$, [Arg4831_0, [shen_type_cons, shenjs_call(shen_newline, []), [shen_type_cons, shenjs_call(shen_carriage_return, []), []]]]))
  ? ((R0 = shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda4834(Arg4833) {
  if (Arg4833.length < 1) return [shen_type_func, shen_user_lambda4834, 1, Arg4833];
  var Arg4833_0 = Arg4833[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$st$_input$gt$, [Arg4833_0]);})},
  1,
  []], Arg4831_1, []])),
  (((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)) || shenjs_empty$question$(R0)))
  ? (function() {
  return shenjs_call_tail(shen_lineread_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), shenjs_call(shen_append, [Arg4831_1, [shen_type_cons, Arg4831_0, []]])]);})
  : R0))
  : (function() {
  return shenjs_call_tail(shen_lineread_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), shenjs_call(shen_append, [Arg4831_1, [shen_type_cons, Arg4831_0, []]])]);})))},
  2,
  [],
  "shen-lineread-loop"];
shenjs_functions["shen_shen-lineread-loop"] = shen_lineread_loop;






shen_read_file = [shen_type_func,
  function shen_user_lambda4836(Arg4835) {
  if (Arg4835.length < 1) return [shen_type_func, shen_user_lambda4836, 1, Arg4835];
  var Arg4835_0 = Arg4835[0];
  var R0;
  return ((R0 = shenjs_call(shen_read_file_as_bytelist, [Arg4835_0])),
  (function() {
  return shenjs_call_tail(shen_compile, [[shen_type_func,
  function shen_user_lambda4838(Arg4837) {
  if (Arg4837.length < 1) return [shen_type_func, shen_user_lambda4838, 1, Arg4837];
  var Arg4837_0 = Arg4837[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$st$_input$gt$, [Arg4837_0]);})},
  1,
  []], R0, [shen_type_func,
  function shen_user_lambda4840(Arg4839) {
  if (Arg4839.length < 1) return [shen_type_func, shen_user_lambda4840, 1, Arg4839];
  var Arg4839_0 = Arg4839[0];
  return (function() {
  return shenjs_call_tail(shen_read_error, [Arg4839_0]);})},
  1,
  []]]);}))},
  1,
  [],
  "read-file"];
shenjs_functions["shen_read-file"] = shen_read_file;






shen_read_error = [shen_type_func,
  function shen_user_lambda4842(Arg4841) {
  if (Arg4841.length < 1) return [shen_type_func, shen_user_lambda4842, 1, Arg4841];
  var Arg4841_0 = Arg4841[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["read error here:~%~% ~A~%", [shen_tuple, shenjs_call(shen_compress_50, [50, Arg4841_0]), []]]);})},
  1,
  [],
  "shen-read-error"];
shenjs_functions["shen_shen-read-error"] = shen_read_error;






shen_compress_50 = [shen_type_func,
  function shen_user_lambda4844(Arg4843) {
  if (Arg4843.length < 2) return [shen_type_func, shen_user_lambda4844, 2, Arg4843];
  var Arg4843_0 = Arg4843[0], Arg4843_1 = Arg4843[1];
  return ((shenjs_empty$question$(Arg4843_1))
  ? ""
  : ((shenjs_unwind_tail(shenjs_$eq$(0, Arg4843_0)))
  ? ""
  : ((shenjs_is_type(Arg4843_1, shen_type_cons))
  ? (shenjs_n_$gt$string(Arg4843_1[1]) + shenjs_call(shen_compress_50, [(Arg4843_0 - 1), Arg4843_1[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-compress-50"]]);}))))},
  2,
  [],
  "shen-compress-50"];
shenjs_functions["shen_shen-compress-50"] = shen_compress_50;






shen_$lt$st$_input$gt$ = [shen_type_func,
  function shen_user_lambda4846(Arg4845) {
  if (Arg4845.length < 1) return [shen_type_func, shen_user_lambda4846, 1, Arg4845];
  var Arg4845_0 = Arg4845[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$lsb$gt$, [Arg4845_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input1$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$rsb$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? ((R1 = shenjs_call(shen_$lt$st$_input2$gt$, [R1])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_macroexpand, [shenjs_call(shen_cons$_form, [shenjs_call(shen_snd, [R0])])]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$lrb$gt$, [Arg4845_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input1$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$rrb$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? ((R1 = shenjs_call(shen_$lt$st$_input2$gt$, [R1])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_package_macro, [shenjs_call(shen_macroexpand, [shenjs_call(shen_snd, [R0])]), shenjs_call(shen_snd, [R1])])])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$lcurly$gt$, [Arg4845_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "{"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$rcurly$gt$, [Arg4845_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "}"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$bar$gt$, [Arg4845_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "bar!"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$semicolon$gt$, [Arg4845_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, ";"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$colon$gt$, [Arg4845_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$equal$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, ":="], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$colon$gt$, [Arg4845_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$minus$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, ":-"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$colon$gt$, [Arg4845_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, ":"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$comma$gt$, [Arg4845_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "shen-"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$comment$gt$, [Arg4845_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$atom$gt$, [Arg4845_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_macroexpand, [shenjs_call(shen_snd, [R0])]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$whitespaces$gt$, [Arg4845_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4845_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), []])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
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
  : R0))},
  1,
  [],
  "shen-<st_input>"];
shenjs_functions["shen_shen-<st_input>"] = shen_$lt$st$_input$gt$;






shen_$lt$lsb$gt$ = [shen_type_func,
  function shen_user_lambda4848(Arg4847) {
  if (Arg4847.length < 1) return [shen_type_func, shen_user_lambda4848, 1, Arg4847];
  var Arg4847_0 = Arg4847[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4847_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4847_0])[2], shenjs_call(shen_snd, [Arg4847_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4847_0])[1], 91)))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<lsb>"];
shenjs_functions["shen_shen-<lsb>"] = shen_$lt$lsb$gt$;






shen_$lt$rsb$gt$ = [shen_type_func,
  function shen_user_lambda4850(Arg4849) {
  if (Arg4849.length < 1) return [shen_type_func, shen_user_lambda4850, 1, Arg4849];
  var Arg4849_0 = Arg4849[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4849_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4849_0])[2], shenjs_call(shen_snd, [Arg4849_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4849_0])[1], 93)))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<rsb>"];
shenjs_functions["shen_shen-<rsb>"] = shen_$lt$rsb$gt$;






shen_$lt$lcurly$gt$ = [shen_type_func,
  function shen_user_lambda4852(Arg4851) {
  if (Arg4851.length < 1) return [shen_type_func, shen_user_lambda4852, 1, Arg4851];
  var Arg4851_0 = Arg4851[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4851_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4851_0])[2], shenjs_call(shen_snd, [Arg4851_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4851_0])[1], 123)))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<lcurly>"];
shenjs_functions["shen_shen-<lcurly>"] = shen_$lt$lcurly$gt$;






shen_$lt$rcurly$gt$ = [shen_type_func,
  function shen_user_lambda4854(Arg4853) {
  if (Arg4853.length < 1) return [shen_type_func, shen_user_lambda4854, 1, Arg4853];
  var Arg4853_0 = Arg4853[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4853_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4853_0])[2], shenjs_call(shen_snd, [Arg4853_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4853_0])[1], 125)))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<rcurly>"];
shenjs_functions["shen_shen-<rcurly>"] = shen_$lt$rcurly$gt$;






shen_$lt$bar$gt$ = [shen_type_func,
  function shen_user_lambda4856(Arg4855) {
  if (Arg4855.length < 1) return [shen_type_func, shen_user_lambda4856, 1, Arg4855];
  var Arg4855_0 = Arg4855[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4855_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4855_0])[2], shenjs_call(shen_snd, [Arg4855_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4855_0])[1], 124)))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<bar>"];
shenjs_functions["shen_shen-<bar>"] = shen_$lt$bar$gt$;






shen_$lt$semicolon$gt$ = [shen_type_func,
  function shen_user_lambda4858(Arg4857) {
  if (Arg4857.length < 1) return [shen_type_func, shen_user_lambda4858, 1, Arg4857];
  var Arg4857_0 = Arg4857[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4857_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4857_0])[2], shenjs_call(shen_snd, [Arg4857_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4857_0])[1], 59)))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<semicolon>"];
shenjs_functions["shen_shen-<semicolon>"] = shen_$lt$semicolon$gt$;






shen_$lt$colon$gt$ = [shen_type_func,
  function shen_user_lambda4860(Arg4859) {
  if (Arg4859.length < 1) return [shen_type_func, shen_user_lambda4860, 1, Arg4859];
  var Arg4859_0 = Arg4859[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4859_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4859_0])[2], shenjs_call(shen_snd, [Arg4859_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4859_0])[1], 58)))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<colon>"];
shenjs_functions["shen_shen-<colon>"] = shen_$lt$colon$gt$;






shen_$lt$comma$gt$ = [shen_type_func,
  function shen_user_lambda4862(Arg4861) {
  if (Arg4861.length < 1) return [shen_type_func, shen_user_lambda4862, 1, Arg4861];
  var Arg4861_0 = Arg4861[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4861_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4861_0])[2], shenjs_call(shen_snd, [Arg4861_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4861_0])[1], 44)))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<comma>"];
shenjs_functions["shen_shen-<comma>"] = shen_$lt$comma$gt$;






shen_$lt$equal$gt$ = [shen_type_func,
  function shen_user_lambda4864(Arg4863) {
  if (Arg4863.length < 1) return [shen_type_func, shen_user_lambda4864, 1, Arg4863];
  var Arg4863_0 = Arg4863[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4863_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4863_0])[2], shenjs_call(shen_snd, [Arg4863_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4863_0])[1], 61)))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<equal>"];
shenjs_functions["shen_shen-<equal>"] = shen_$lt$equal$gt$;






shen_$lt$minus$gt$ = [shen_type_func,
  function shen_user_lambda4866(Arg4865) {
  if (Arg4865.length < 1) return [shen_type_func, shen_user_lambda4866, 1, Arg4865];
  var Arg4865_0 = Arg4865[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4865_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4865_0])[2], shenjs_call(shen_snd, [Arg4865_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4865_0])[1], 45)))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<minus>"];
shenjs_functions["shen_shen-<minus>"] = shen_$lt$minus$gt$;






shen_$lt$lrb$gt$ = [shen_type_func,
  function shen_user_lambda4868(Arg4867) {
  if (Arg4867.length < 1) return [shen_type_func, shen_user_lambda4868, 1, Arg4867];
  var Arg4867_0 = Arg4867[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4867_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4867_0])[2], shenjs_call(shen_snd, [Arg4867_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4867_0])[1], 40)))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<lrb>"];
shenjs_functions["shen_shen-<lrb>"] = shen_$lt$lrb$gt$;






shen_$lt$rrb$gt$ = [shen_type_func,
  function shen_user_lambda4870(Arg4869) {
  if (Arg4869.length < 1) return [shen_type_func, shen_user_lambda4870, 1, Arg4869];
  var Arg4869_0 = Arg4869[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4869_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4869_0])[2], shenjs_call(shen_snd, [Arg4869_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4869_0])[1], 41)))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<rrb>"];
shenjs_functions["shen_shen-<rrb>"] = shen_$lt$rrb$gt$;






shen_$lt$atom$gt$ = [shen_type_func,
  function shen_user_lambda4872(Arg4871) {
  if (Arg4871.length < 1) return [shen_type_func, shen_user_lambda4872, 1, Arg4871];
  var Arg4871_0 = Arg4871[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$str$gt$, [Arg4871_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_control_chars, [shenjs_call(shen_snd, [R0])])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$number$gt$, [Arg4871_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$sym$gt$, [Arg4871_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))
  : R0))},
  1,
  [],
  "shen-<atom>"];
shenjs_functions["shen_shen-<atom>"] = shen_$lt$atom$gt$;






shen_control_chars = [shen_type_func,
  function shen_user_lambda4874(Arg4873) {
  if (Arg4873.length < 1) return [shen_type_func, shen_user_lambda4874, 1, Arg4873];
  var Arg4873_0 = Arg4873[0];
  var R0, R1;
  return ((shenjs_empty$question$(Arg4873_0))
  ? ""
  : (((shenjs_is_type(Arg4873_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$("c", Arg4873_0[1])) && (shenjs_is_type(Arg4873_0[2], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("#", Arg4873_0[2][1]))))))
  ? ((R0 = shenjs_call(shen_code_point, [Arg4873_0[2][2]])),
  (R1 = shenjs_call(shen_after_codepoint, [Arg4873_0[2][2]])),
  (function() {
  return shenjs_call_tail(shen_$at$s, [shenjs_n_$gt$string(shenjs_call(shen_decimalise, [R0])), shenjs_call(shen_control_chars, [R1])]);}))
  : ((shenjs_is_type(Arg4873_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_$at$s, [Arg4873_0[1], shenjs_call(shen_control_chars, [Arg4873_0[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-control-chars"]]);}))))},
  1,
  [],
  "shen-control-chars"];
shenjs_functions["shen_shen-control-chars"] = shen_control_chars;






shen_code_point = [shen_type_func,
  function shen_user_lambda4876(Arg4875) {
  if (Arg4875.length < 1) return [shen_type_func, shen_user_lambda4876, 1, Arg4875];
  var Arg4875_0 = Arg4875[0];
  return (((shenjs_is_type(Arg4875_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(";", Arg4875_0[1]))))
  ? ""
  : (((shenjs_is_type(Arg4875_0, shen_type_cons) && shenjs_call(shen_element$question$, [Arg4875_0[1], [shen_type_cons, "0", [shen_type_cons, "1", [shen_type_cons, "2", [shen_type_cons, "3", [shen_type_cons, "4", [shen_type_cons, "5", [shen_type_cons, "6", [shen_type_cons, "7", [shen_type_cons, "8", [shen_type_cons, "9", [shen_type_cons, "0", []]]]]]]]]]]]])))
  ? [shen_type_cons, Arg4875_0[1], shenjs_call(shen_code_point, [Arg4875_0[2]])]
  : (function() {
  return shenjs_call_tail(shen_interror, ["code point parse error ~A~%", [shen_tuple, Arg4875_0, []]]);})))},
  1,
  [],
  "shen-code-point"];
shenjs_functions["shen_shen-code-point"] = shen_code_point;






shen_after_codepoint = [shen_type_func,
  function shen_user_lambda4878(Arg4877) {
  if (Arg4877.length < 1) return [shen_type_func, shen_user_lambda4878, 1, Arg4877];
  var Arg4877_0 = Arg4877[0];
  return ((shenjs_empty$question$(Arg4877_0))
  ? []
  : (((shenjs_is_type(Arg4877_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(";", Arg4877_0[1]))))
  ? Arg4877_0[2]
  : ((shenjs_is_type(Arg4877_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_after_codepoint, [Arg4877_0[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-after-codepoint"]]);}))))},
  1,
  [],
  "shen-after-codepoint"];
shenjs_functions["shen_shen-after-codepoint"] = shen_after_codepoint;






shen_decimalise = [shen_type_func,
  function shen_user_lambda4880(Arg4879) {
  if (Arg4879.length < 1) return [shen_type_func, shen_user_lambda4880, 1, Arg4879];
  var Arg4879_0 = Arg4879[0];
  return (function() {
  return shenjs_call_tail(shen_pre, [shenjs_call(shen_reverse, [shenjs_call(shen_digits_$gt$integers, [Arg4879_0])]), 0]);})},
  1,
  [],
  "shen-decimalise"];
shenjs_functions["shen_shen-decimalise"] = shen_decimalise;






shen_digits_$gt$integers = [shen_type_func,
  function shen_user_lambda4882(Arg4881) {
  if (Arg4881.length < 1) return [shen_type_func, shen_user_lambda4882, 1, Arg4881];
  var Arg4881_0 = Arg4881[0];
  return (((shenjs_is_type(Arg4881_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("0", Arg4881_0[1]))))
  ? [shen_type_cons, 0, shenjs_call(shen_digits_$gt$integers, [Arg4881_0[2]])]
  : (((shenjs_is_type(Arg4881_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("1", Arg4881_0[1]))))
  ? [shen_type_cons, 1, shenjs_call(shen_digits_$gt$integers, [Arg4881_0[2]])]
  : (((shenjs_is_type(Arg4881_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("2", Arg4881_0[1]))))
  ? [shen_type_cons, 2, shenjs_call(shen_digits_$gt$integers, [Arg4881_0[2]])]
  : (((shenjs_is_type(Arg4881_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("3", Arg4881_0[1]))))
  ? [shen_type_cons, 3, shenjs_call(shen_digits_$gt$integers, [Arg4881_0[2]])]
  : (((shenjs_is_type(Arg4881_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("4", Arg4881_0[1]))))
  ? [shen_type_cons, 4, shenjs_call(shen_digits_$gt$integers, [Arg4881_0[2]])]
  : (((shenjs_is_type(Arg4881_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("5", Arg4881_0[1]))))
  ? [shen_type_cons, 5, shenjs_call(shen_digits_$gt$integers, [Arg4881_0[2]])]
  : (((shenjs_is_type(Arg4881_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("6", Arg4881_0[1]))))
  ? [shen_type_cons, 6, shenjs_call(shen_digits_$gt$integers, [Arg4881_0[2]])]
  : (((shenjs_is_type(Arg4881_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("7", Arg4881_0[1]))))
  ? [shen_type_cons, 7, shenjs_call(shen_digits_$gt$integers, [Arg4881_0[2]])]
  : (((shenjs_is_type(Arg4881_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("8", Arg4881_0[1]))))
  ? [shen_type_cons, 8, shenjs_call(shen_digits_$gt$integers, [Arg4881_0[2]])]
  : (((shenjs_is_type(Arg4881_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("9", Arg4881_0[1]))))
  ? [shen_type_cons, 9, shenjs_call(shen_digits_$gt$integers, [Arg4881_0[2]])]
  : []))))))))))},
  1,
  [],
  "shen-digits->integers"];
shenjs_functions["shen_shen-digits->integers"] = shen_digits_$gt$integers;






shen_$lt$sym$gt$ = [shen_type_func,
  function shen_user_lambda4884(Arg4883) {
  if (Arg4883.length < 1) return [shen_type_func, shen_user_lambda4884, 1, Arg4883];
  var Arg4883_0 = Arg4883[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$alpha$gt$, [Arg4883_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$symchars$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_intern((shenjs_call(shen_snd, [R0]) + shenjs_call(shen_snd, [R1])))])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$alpha$gt$, [Arg4883_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_intern(shenjs_call(shen_snd, [R0]))])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<sym>"];
shenjs_functions["shen_shen-<sym>"] = shen_$lt$sym$gt$;






shen_$lt$symchars$gt$ = [shen_type_func,
  function shen_user_lambda4886(Arg4885) {
  if (Arg4885.length < 1) return [shen_type_func, shen_user_lambda4886, 1, Arg4885];
  var Arg4885_0 = Arg4885[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$symchar$gt$, [Arg4885_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$symchars$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), (shenjs_call(shen_snd, [R0]) + shenjs_call(shen_snd, [R1]))])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$symchar$gt$, [Arg4885_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<symchars>"];
shenjs_functions["shen_shen-<symchars>"] = shen_$lt$symchars$gt$;






shen_$lt$symchar$gt$ = [shen_type_func,
  function shen_user_lambda4888(Arg4887) {
  if (Arg4887.length < 1) return [shen_type_func, shen_user_lambda4888, 1, Arg4887];
  var Arg4887_0 = Arg4887[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$alpha$gt$, [Arg4887_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digit_$gt$string$gt$, [Arg4887_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<symchar>"];
shenjs_functions["shen_shen-<symchar>"] = shen_$lt$symchar$gt$;






shen_$lt$digit_$gt$string$gt$ = [shen_type_func,
  function shen_user_lambda4890(Arg4889) {
  if (Arg4889.length < 1) return [shen_type_func, shen_user_lambda4890, 1, Arg4889];
  var Arg4889_0 = Arg4889[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4889_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4889_0])[2], shenjs_call(shen_snd, [Arg4889_0])])]), ((shenjs_call(shen_digit_byte$question$, [shenjs_call(shen_fst, [Arg4889_0])[1]]))
  ? shenjs_n_$gt$string(shenjs_call(shen_fst, [Arg4889_0])[1])
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<digit->string>"];
shenjs_functions["shen_shen-<digit->string>"] = shen_$lt$digit_$gt$string$gt$;






shen_digit_byte$question$ = [shen_type_func,
  function shen_user_lambda4892(Arg4891) {
  if (Arg4891.length < 1) return [shen_type_func, shen_user_lambda4892, 1, Arg4891];
  var Arg4891_0 = Arg4891[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(48, Arg4891_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(49, Arg4891_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(50, Arg4891_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(51, Arg4891_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(52, Arg4891_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(53, Arg4891_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(54, Arg4891_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(55, Arg4891_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(56, Arg4891_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(57, Arg4891_0)))
  ? true
  : false))))))))))},
  1,
  [],
  "shen-digit-byte?"];
shenjs_functions["shen_shen-digit-byte?"] = shen_digit_byte$question$;






shen_$lt$alpha$gt$ = [shen_type_func,
  function shen_user_lambda4894(Arg4893) {
  if (Arg4893.length < 1) return [shen_type_func, shen_user_lambda4894, 1, Arg4893];
  var Arg4893_0 = Arg4893[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4893_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4893_0])[2], shenjs_call(shen_snd, [Arg4893_0])])]), ((R0 = shenjs_call(shen_symbol_byte_$gt$string, [shenjs_call(shen_fst, [Arg4893_0])[1]])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<alpha>"];
shenjs_functions["shen_shen-<alpha>"] = shen_$lt$alpha$gt$;






shen_symbol_byte_$gt$string = [shen_type_func,
  function shen_user_lambda4896(Arg4895) {
  if (Arg4895.length < 1) return [shen_type_func, shen_user_lambda4896, 1, Arg4895];
  var Arg4895_0 = Arg4895[0];
  return shenjs_absvector_ref((shenjs_globals["shen_shen-*symbolcodes*"]), Arg4895_0)},
  1,
  [],
  "shen-symbol-byte->string"];
shenjs_functions["shen_shen-symbol-byte->string"] = shen_symbol_byte_$gt$string;






shen_$lt$str$gt$ = [shen_type_func,
  function shen_user_lambda4898(Arg4897) {
  if (Arg4897.length < 1) return [shen_type_func, shen_user_lambda4898, 1, Arg4897];
  var Arg4897_0 = Arg4897[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$dbq$gt$, [Arg4897_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$strcontents$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$dbq$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<str>"];
shenjs_functions["shen_shen-<str>"] = shen_$lt$str$gt$;






shen_$lt$dbq$gt$ = [shen_type_func,
  function shen_user_lambda4900(Arg4899) {
  if (Arg4899.length < 1) return [shen_type_func, shen_user_lambda4900, 1, Arg4899];
  var Arg4899_0 = Arg4899[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4899_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4899_0])[2], shenjs_call(shen_snd, [Arg4899_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4899_0])[1], 34)))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<dbq>"];
shenjs_functions["shen_shen-<dbq>"] = shen_$lt$dbq$gt$;






shen_$lt$strcontents$gt$ = [shen_type_func,
  function shen_user_lambda4902(Arg4901) {
  if (Arg4901.length < 1) return [shen_type_func, shen_user_lambda4902, 1, Arg4901];
  var Arg4901_0 = Arg4901[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$strc$gt$, [Arg4901_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$strcontents$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4901_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), []])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<strcontents>"];
shenjs_functions["shen_shen-<strcontents>"] = shen_$lt$strcontents$gt$;






shen_$lt$byte$gt$ = [shen_type_func,
  function shen_user_lambda4904(Arg4903) {
  if (Arg4903.length < 1) return [shen_type_func, shen_user_lambda4904, 1, Arg4903];
  var Arg4903_0 = Arg4903[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4903_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4903_0])[2], shenjs_call(shen_snd, [Arg4903_0])])]), shenjs_n_$gt$string(shenjs_call(shen_fst, [Arg4903_0])[1])])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<byte>"];
shenjs_functions["shen_shen-<byte>"] = shen_$lt$byte$gt$;






shen_$lt$strc$gt$ = [shen_type_func,
  function shen_user_lambda4906(Arg4905) {
  if (Arg4905.length < 1) return [shen_type_func, shen_user_lambda4906, 1, Arg4905];
  var Arg4905_0 = Arg4905[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4905_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4905_0])[2], shenjs_call(shen_snd, [Arg4905_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4905_0])[1], 34)))
  ? shen_fail_obj
  : shenjs_n_$gt$string(shenjs_call(shen_fst, [Arg4905_0])[1]))])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<strc>"];
shenjs_functions["shen_shen-<strc>"] = shen_$lt$strc$gt$;






shen_$lt$backslash$gt$ = [shen_type_func,
  function shen_user_lambda4908(Arg4907) {
  if (Arg4907.length < 1) return [shen_type_func, shen_user_lambda4908, 1, Arg4907];
  var Arg4907_0 = Arg4907[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4907_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4907_0])[2], shenjs_call(shen_snd, [Arg4907_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4907_0])[1], 92)))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<backslash>"];
shenjs_functions["shen_shen-<backslash>"] = shen_$lt$backslash$gt$;






shen_$lt$number$gt$ = [shen_type_func,
  function shen_user_lambda4910(Arg4909) {
  if (Arg4909.length < 1) return [shen_type_func, shen_user_lambda4910, 1, Arg4909];
  var Arg4909_0 = Arg4909[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$minus$gt$, [Arg4909_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$number$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), (0 - shenjs_call(shen_snd, [R0]))])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$plus$gt$, [Arg4909_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$number$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$predigits$gt$, [Arg4909_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$stop$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? ((R1 = shenjs_call(shen_$lt$postdigits$gt$, [R1])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? ((R2 = shenjs_call(shen_$lt$E$gt$, [R1])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R2))))
  ? ((R2 = shenjs_call(shen_$lt$log10$gt$, [R2])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R2))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R2]), (shenjs_call(shen_expt, [10, shenjs_call(shen_snd, [R2])]) * (shenjs_call(shen_pre, [shenjs_call(shen_reverse, [shenjs_call(shen_snd, [R0])]), 0]) + shenjs_call(shen_post, [shenjs_call(shen_snd, [R1]), 1])))])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg4909_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$E$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? ((R1 = shenjs_call(shen_$lt$log10$gt$, [R1])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), (shenjs_call(shen_expt, [10, shenjs_call(shen_snd, [R1])]) * shenjs_call(shen_pre, [shenjs_call(shen_reverse, [shenjs_call(shen_snd, [R0])]), 0]))])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$predigits$gt$, [Arg4909_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$stop$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? ((R1 = shenjs_call(shen_$lt$postdigits$gt$, [R1])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), (shenjs_call(shen_pre, [shenjs_call(shen_reverse, [shenjs_call(shen_snd, [R0])]), 0]) + shenjs_call(shen_post, [shenjs_call(shen_snd, [R1]), 1]))])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg4909_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_pre, [shenjs_call(shen_reverse, [shenjs_call(shen_snd, [R0])]), 0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))
  : R0))},
  1,
  [],
  "shen-<number>"];
shenjs_functions["shen_shen-<number>"] = shen_$lt$number$gt$;






shen_$lt$E$gt$ = [shen_type_func,
  function shen_user_lambda4912(Arg4911) {
  if (Arg4911.length < 1) return [shen_type_func, shen_user_lambda4912, 1, Arg4911];
  var Arg4911_0 = Arg4911[0];
  var R0;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4911_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(101, shenjs_call(shen_fst, [Arg4911_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4911_0])[2], shenjs_call(shen_snd, [Arg4911_0])])]), [shen_type_cons, 101, []]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<E>"];
shenjs_functions["shen_shen-<E>"] = shen_$lt$E$gt$;






shen_$lt$log10$gt$ = [shen_type_func,
  function shen_user_lambda4914(Arg4913) {
  if (Arg4913.length < 1) return [shen_type_func, shen_user_lambda4914, 1, Arg4913];
  var Arg4913_0 = Arg4913[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$minus$gt$, [Arg4913_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$digits$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), (0 - shenjs_call(shen_pre, [shenjs_call(shen_reverse, [shenjs_call(shen_snd, [R0])]), 0]))])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg4913_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_pre, [shenjs_call(shen_reverse, [shenjs_call(shen_snd, [R0])]), 0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<log10>"];
shenjs_functions["shen_shen-<log10>"] = shen_$lt$log10$gt$;






shen_$lt$plus$gt$ = [shen_type_func,
  function shen_user_lambda4916(Arg4915) {
  if (Arg4915.length < 1) return [shen_type_func, shen_user_lambda4916, 1, Arg4915];
  var Arg4915_0 = Arg4915[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4915_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4915_0])[2], shenjs_call(shen_snd, [Arg4915_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4915_0])[1], 43)))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<plus>"];
shenjs_functions["shen_shen-<plus>"] = shen_$lt$plus$gt$;






shen_$lt$stop$gt$ = [shen_type_func,
  function shen_user_lambda4918(Arg4917) {
  if (Arg4917.length < 1) return [shen_type_func, shen_user_lambda4918, 1, Arg4917];
  var Arg4917_0 = Arg4917[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4917_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4917_0])[2], shenjs_call(shen_snd, [Arg4917_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4917_0])[1], 46)))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<stop>"];
shenjs_functions["shen_shen-<stop>"] = shen_$lt$stop$gt$;






shen_$lt$predigits$gt$ = [shen_type_func,
  function shen_user_lambda4920(Arg4919) {
  if (Arg4919.length < 1) return [shen_type_func, shen_user_lambda4920, 1, Arg4919];
  var Arg4919_0 = Arg4919[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg4919_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4919_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), []])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<predigits>"];
shenjs_functions["shen_shen-<predigits>"] = shen_$lt$predigits$gt$;






shen_$lt$postdigits$gt$ = [shen_type_func,
  function shen_user_lambda4922(Arg4921) {
  if (Arg4921.length < 1) return [shen_type_func, shen_user_lambda4922, 1, Arg4921];
  var Arg4921_0 = Arg4921[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg4921_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<postdigits>"];
shenjs_functions["shen_shen-<postdigits>"] = shen_$lt$postdigits$gt$;






shen_$lt$digits$gt$ = [shen_type_func,
  function shen_user_lambda4924(Arg4923) {
  if (Arg4923.length < 1) return [shen_type_func, shen_user_lambda4924, 1, Arg4923];
  var Arg4923_0 = Arg4923[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$digit$gt$, [Arg4923_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$digits$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digit$gt$, [Arg4923_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R0]), []]])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<digits>"];
shenjs_functions["shen_shen-<digits>"] = shen_$lt$digits$gt$;






shen_$lt$digit$gt$ = [shen_type_func,
  function shen_user_lambda4926(Arg4925) {
  if (Arg4925.length < 1) return [shen_type_func, shen_user_lambda4926, 1, Arg4925];
  var Arg4925_0 = Arg4925[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4925_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4925_0])[2], shenjs_call(shen_snd, [Arg4925_0])])]), ((shenjs_call(shen_digit_byte$question$, [shenjs_call(shen_fst, [Arg4925_0])[1]]))
  ? shenjs_call(shen_byte_$gt$digit, [shenjs_call(shen_fst, [Arg4925_0])[1]])
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<digit>"];
shenjs_functions["shen_shen-<digit>"] = shen_$lt$digit$gt$;






shen_byte_$gt$digit = [shen_type_func,
  function shen_user_lambda4928(Arg4927) {
  if (Arg4927.length < 1) return [shen_type_func, shen_user_lambda4928, 1, Arg4927];
  var Arg4927_0 = Arg4927[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(48, Arg4927_0)))
  ? 0
  : ((shenjs_unwind_tail(shenjs_$eq$(49, Arg4927_0)))
  ? 1
  : ((shenjs_unwind_tail(shenjs_$eq$(50, Arg4927_0)))
  ? 2
  : ((shenjs_unwind_tail(shenjs_$eq$(51, Arg4927_0)))
  ? 3
  : ((shenjs_unwind_tail(shenjs_$eq$(52, Arg4927_0)))
  ? 4
  : ((shenjs_unwind_tail(shenjs_$eq$(53, Arg4927_0)))
  ? 5
  : ((shenjs_unwind_tail(shenjs_$eq$(54, Arg4927_0)))
  ? 6
  : ((shenjs_unwind_tail(shenjs_$eq$(55, Arg4927_0)))
  ? 7
  : ((shenjs_unwind_tail(shenjs_$eq$(56, Arg4927_0)))
  ? 8
  : ((shenjs_unwind_tail(shenjs_$eq$(57, Arg4927_0)))
  ? 9
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-byte->digit"]]);})))))))))))},
  1,
  [],
  "shen-byte->digit"];
shenjs_functions["shen_shen-byte->digit"] = shen_byte_$gt$digit;






shen_pre = [shen_type_func,
  function shen_user_lambda4930(Arg4929) {
  if (Arg4929.length < 2) return [shen_type_func, shen_user_lambda4930, 2, Arg4929];
  var Arg4929_0 = Arg4929[0], Arg4929_1 = Arg4929[1];
  return ((shenjs_empty$question$(Arg4929_0))
  ? 0
  : ((shenjs_is_type(Arg4929_0, shen_type_cons))
  ? ((shenjs_call(shen_expt, [10, Arg4929_1]) * Arg4929_0[1]) + shenjs_call(shen_pre, [Arg4929_0[2], (Arg4929_1 + 1)]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-pre"]]);})))},
  2,
  [],
  "shen-pre"];
shenjs_functions["shen_shen-pre"] = shen_pre;






shen_post = [shen_type_func,
  function shen_user_lambda4932(Arg4931) {
  if (Arg4931.length < 2) return [shen_type_func, shen_user_lambda4932, 2, Arg4931];
  var Arg4931_0 = Arg4931[0], Arg4931_1 = Arg4931[1];
  return ((shenjs_empty$question$(Arg4931_0))
  ? 0
  : ((shenjs_is_type(Arg4931_0, shen_type_cons))
  ? ((shenjs_call(shen_expt, [10, (0 - Arg4931_1)]) * Arg4931_0[1]) + shenjs_call(shen_post, [Arg4931_0[2], (Arg4931_1 + 1)]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-post"]]);})))},
  2,
  [],
  "shen-post"];
shenjs_functions["shen_shen-post"] = shen_post;






shen_expt = [shen_type_func,
  function shen_user_lambda4934(Arg4933) {
  if (Arg4933.length < 2) return [shen_type_func, shen_user_lambda4934, 2, Arg4933];
  var Arg4933_0 = Arg4933[0], Arg4933_1 = Arg4933[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg4933_1)))
  ? 1
  : (((Arg4933_1 > 0))
  ? (Arg4933_0 * shenjs_call(shen_expt, [Arg4933_0, (Arg4933_1 - 1)]))
  : (1.0 * (shenjs_call(shen_expt, [Arg4933_0, (Arg4933_1 + 1)]) / Arg4933_0))))},
  2,
  [],
  "shen-expt"];
shenjs_functions["shen_shen-expt"] = shen_expt;






shen_$lt$st$_input1$gt$ = [shen_type_func,
  function shen_user_lambda4936(Arg4935) {
  if (Arg4935.length < 1) return [shen_type_func, shen_user_lambda4936, 1, Arg4935];
  var Arg4935_0 = Arg4935[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [Arg4935_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<st_input1>"];
shenjs_functions["shen_shen-<st_input1>"] = shen_$lt$st$_input1$gt$;






shen_$lt$st$_input2$gt$ = [shen_type_func,
  function shen_user_lambda4938(Arg4937) {
  if (Arg4937.length < 1) return [shen_type_func, shen_user_lambda4938, 1, Arg4937];
  var Arg4937_0 = Arg4937[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [Arg4937_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<st_input2>"];
shenjs_functions["shen_shen-<st_input2>"] = shen_$lt$st$_input2$gt$;






shen_$lt$comment$gt$ = [shen_type_func,
  function shen_user_lambda4940(Arg4939) {
  if (Arg4939.length < 1) return [shen_type_func, shen_user_lambda4940, 1, Arg4939];
  var Arg4939_0 = Arg4939[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$backslash$gt$, [Arg4939_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$times$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$any$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$times$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$backslash$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_symbol, "shen-skip"]])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<comment>"];
shenjs_functions["shen_shen-<comment>"] = shen_$lt$comment$gt$;






shen_$lt$times$gt$ = [shen_type_func,
  function shen_user_lambda4942(Arg4941) {
  if (Arg4941.length < 1) return [shen_type_func, shen_user_lambda4942, 1, Arg4941];
  var Arg4941_0 = Arg4941[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4941_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4941_0])[2], shenjs_call(shen_snd, [Arg4941_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4941_0])[1], 42)))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<times>"];
shenjs_functions["shen_shen-<times>"] = shen_$lt$times$gt$;






shen_$lt$any$gt$ = [shen_type_func,
  function shen_user_lambda4944(Arg4943) {
  if (Arg4943.length < 1) return [shen_type_func, shen_user_lambda4944, 1, Arg4943];
  var Arg4943_0 = Arg4943[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$comment$gt$, [Arg4943_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$any$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_symbol, "shen-skip"]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$blah$gt$, [Arg4943_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$any$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_symbol, "shen-skip"]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4943_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_symbol, "shen-skip"]])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))
  : R0))},
  1,
  [],
  "shen-<any>"];
shenjs_functions["shen_shen-<any>"] = shen_$lt$any$gt$;






shen_$lt$blah$gt$ = [shen_type_func,
  function shen_user_lambda4946(Arg4945) {
  if (Arg4945.length < 1) return [shen_type_func, shen_user_lambda4946, 1, Arg4945];
  var Arg4945_0 = Arg4945[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4945_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4945_0])[2], shenjs_call(shen_snd, [Arg4945_0])])]), ((shenjs_call(shen_end_of_comment$question$, [shenjs_call(shen_fst, [Arg4945_0])]))
  ? shen_fail_obj
  : [shen_type_symbol, "shen-skip"])])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<blah>"];
shenjs_functions["shen_shen-<blah>"] = shen_$lt$blah$gt$;






shen_end_of_comment$question$ = [shen_type_func,
  function shen_user_lambda4948(Arg4947) {
  if (Arg4947.length < 1) return [shen_type_func, shen_user_lambda4948, 1, Arg4947];
  var Arg4947_0 = Arg4947[0];
  return (((shenjs_is_type(Arg4947_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(42, Arg4947_0[1])) && (shenjs_is_type(Arg4947_0[2], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(92, Arg4947_0[2][1]))))))
  ? true
  : false)},
  1,
  [],
  "shen-end-of-comment?"];
shenjs_functions["shen_shen-end-of-comment?"] = shen_end_of_comment$question$;






shen_$lt$whitespaces$gt$ = [shen_type_func,
  function shen_user_lambda4950(Arg4949) {
  if (Arg4949.length < 1) return [shen_type_func, shen_user_lambda4950, 1, Arg4949];
  var Arg4949_0 = Arg4949[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$whitespace$gt$, [Arg4949_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$whitespaces$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_symbol, "shen-skip"]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$whitespace$gt$, [Arg4949_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_symbol, "shen-skip"]])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<whitespaces>"];
shenjs_functions["shen_shen-<whitespaces>"] = shen_$lt$whitespaces$gt$;






shen_$lt$whitespace$gt$ = [shen_type_func,
  function shen_user_lambda4952(Arg4951) {
  if (Arg4951.length < 1) return [shen_type_func, shen_user_lambda4952, 1, Arg4951];
  var Arg4951_0 = Arg4951[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4951_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4951_0])[2], shenjs_call(shen_snd, [Arg4951_0])])]), ((R0 = shenjs_call(shen_fst, [Arg4951_0])[1]),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, 32)))
  ? [shen_type_symbol, "shen-skip"]
  : ((shenjs_unwind_tail(shenjs_$eq$(R0, 13)))
  ? [shen_type_symbol, "shen-skip"]
  : ((shenjs_unwind_tail(shenjs_$eq$(R0, 10)))
  ? [shen_type_symbol, "shen-skip"]
  : ((shenjs_unwind_tail(shenjs_$eq$(R0, 9)))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)))))])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<whitespace>"];
shenjs_functions["shen_shen-<whitespace>"] = shen_$lt$whitespace$gt$;






shen_cons$_form = [shen_type_func,
  function shen_user_lambda4954(Arg4953) {
  if (Arg4953.length < 1) return [shen_type_func, shen_user_lambda4954, 1, Arg4953];
  var Arg4953_0 = Arg4953[0];
  return ((shenjs_empty$question$(Arg4953_0))
  ? []
  : (((shenjs_is_type(Arg4953_0, shen_type_cons) && (shenjs_is_type(Arg4953_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "bar!"], Arg4953_0[2][1])) && (shenjs_is_type(Arg4953_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4953_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, Arg4953_0[1], Arg4953_0[2][2]]]
  : ((shenjs_is_type(Arg4953_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, Arg4953_0[1], [shen_type_cons, shenjs_call(shen_cons$_form, [Arg4953_0[2]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-cons_form"]]);}))))},
  1,
  [],
  "shen-cons_form"];
shenjs_functions["shen_shen-cons_form"] = shen_cons$_form;






shen_package_macro = [shen_type_func,
  function shen_user_lambda4956(Arg4955) {
  if (Arg4955.length < 2) return [shen_type_func, shen_user_lambda4956, 2, Arg4955];
  var Arg4955_0 = Arg4955[0], Arg4955_1 = Arg4955[1];
  var R0;
  return (((shenjs_is_type(Arg4955_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "$"], Arg4955_0[1])) && (shenjs_is_type(Arg4955_0[2], shen_type_cons) && shenjs_empty$question$(Arg4955_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(shen_explode, [Arg4955_0[2][1]]), Arg4955_1]);})
  : (((shenjs_is_type(Arg4955_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg4955_0[1])) && (shenjs_is_type(Arg4955_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "null"], Arg4955_0[2][1])) && shenjs_is_type(Arg4955_0[2][2], shen_type_cons))))))
  ? (function() {
  return shenjs_call_tail(shen_append, [Arg4955_0[2][2][2], Arg4955_1]);})
  : (((shenjs_is_type(Arg4955_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg4955_0[1])) && (shenjs_is_type(Arg4955_0[2], shen_type_cons) && shenjs_is_type(Arg4955_0[2][2], shen_type_cons)))))
  ? ((R0 = shenjs_call(shen_eval_without_macros, [Arg4955_0[2][2][1]])),
  shenjs_call(shen_record_exceptions, [R0, Arg4955_0[2][1]]),
  (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(shen_packageh, [Arg4955_0[2][1], R0, Arg4955_0[2][2][2]]), Arg4955_1]);}))
  : [shen_type_cons, Arg4955_0, Arg4955_1])))},
  2,
  [],
  "shen-package-macro"];
shenjs_functions["shen_shen-package-macro"] = shen_package_macro;






shen_record_exceptions = [shen_type_func,
  function shen_user_lambda4958(Arg4957) {
  if (Arg4957.length < 2) return [shen_type_func, shen_user_lambda4958, 2, Arg4957];
  var Arg4957_0 = Arg4957[0], Arg4957_1 = Arg4957[1];
  var R0;
  return ((R0 = shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg4957_1, [shen_type_symbol, "shen-external-symbols"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda4960(Arg4959) {
  if (Arg4959.length < 1) return [shen_type_func, shen_user_lambda4960, 1, Arg4959];
  var Arg4959_0 = Arg4959[0];
  return []},
  1,
  []])),
  (R0 = shenjs_call(shen_union, [Arg4957_0, R0])),
  (function() {
  return shenjs_call_tail(shen_put, [Arg4957_1, [shen_type_symbol, "shen-external-symbols"], R0, (shenjs_globals["shen_shen-*property-vector*"])]);}))},
  2,
  [],
  "shen-record-exceptions"];
shenjs_functions["shen_shen-record-exceptions"] = shen_record_exceptions;






shen_packageh = [shen_type_func,
  function shen_user_lambda4962(Arg4961) {
  if (Arg4961.length < 3) return [shen_type_func, shen_user_lambda4962, 3, Arg4961];
  var Arg4961_0 = Arg4961[0], Arg4961_1 = Arg4961[1], Arg4961_2 = Arg4961[2];
  return ((shenjs_is_type(Arg4961_2, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_packageh, [Arg4961_0, Arg4961_1, Arg4961_2[1]]), shenjs_call(shen_packageh, [Arg4961_0, Arg4961_1, Arg4961_2[2]])]
  : (((shenjs_call(shen_sysfunc$question$, [Arg4961_2]) || (shenjs_call(shen_variable$question$, [Arg4961_2]) || (shenjs_call(shen_element$question$, [Arg4961_2, Arg4961_1]) || (shenjs_call(shen_doubleunderline$question$, [Arg4961_2]) || shenjs_call(shen_singleunderline$question$, [Arg4961_2]))))))
  ? Arg4961_2
  : (((shenjs_is_type(Arg4961_2, shen_type_symbol) && (!shenjs_call(shen_prefix$question$, [[shen_type_cons, "s", [shen_type_cons, "h", [shen_type_cons, "e", [shen_type_cons, "n", [shen_type_cons, "-", []]]]]], shenjs_call(shen_explode, [Arg4961_2])]))))
  ? (function() {
  return shenjs_call_tail(shen_concat, [Arg4961_0, Arg4961_2]);})
  : Arg4961_2)))},
  3,
  [],
  "shen-packageh"];
shenjs_functions["shen_shen-packageh"] = shen_packageh;












shen_$lt$defprolog$gt$ = [shen_type_func,
  function shen_user_lambda4513(Arg4512) {
  if (Arg4512.length < 1) return [shen_type_func, shen_user_lambda4513, 1, Arg4512];
  var Arg4512_0 = Arg4512[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$predicate$asterisk$$gt$, [Arg4512_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$clauses$asterisk$$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_prolog_$gt$shen, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4515(Arg4514) {
  if (Arg4514.length < 2) return [shen_type_func, shen_user_lambda4515, 2, Arg4514];
  var Arg4514_0 = Arg4514[0], Arg4514_1 = Arg4514[1];
  return (function() {
  return shenjs_call_tail(shen_insert_predicate, [shenjs_call(shen_snd, [Arg4514_0]), Arg4514_1]);})},
  2,
  [R0]], shenjs_call(shen_snd, [R1])])])[1]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<defprolog>"];
shenjs_functions["shen_shen-<defprolog>"] = shen_$lt$defprolog$gt$;






shen_prolog_error = [shen_type_func,
  function shen_user_lambda4517(Arg4516) {
  if (Arg4516.length < 2) return [shen_type_func, shen_user_lambda4517, 2, Arg4516];
  var Arg4516_0 = Arg4516[0], Arg4516_1 = Arg4516[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["prolog syntax error in ~A here:~%~% ~A~%", [shen_tuple, Arg4516_0, [shen_tuple, shenjs_call(shen_next_50, [50, Arg4516_1]), []]]]);})},
  2,
  [],
  "shen-prolog-error"];
shenjs_functions["shen_shen-prolog-error"] = shen_prolog_error;






shen_next_50 = [shen_type_func,
  function shen_user_lambda4519(Arg4518) {
  if (Arg4518.length < 2) return [shen_type_func, shen_user_lambda4519, 2, Arg4518];
  var Arg4518_0 = Arg4518[0], Arg4518_1 = Arg4518[1];
  return ((shenjs_empty$question$(Arg4518_1))
  ? ""
  : ((shenjs_unwind_tail(shenjs_$eq$(0, Arg4518_0)))
  ? ""
  : ((shenjs_is_type(Arg4518_1, shen_type_cons))
  ? (shenjs_call(shen_decons_string, [Arg4518_1[1]]) + shenjs_call(shen_next_50, [(Arg4518_0 - 1), Arg4518_1[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-next-50"]]);}))))},
  2,
  [],
  "shen-next-50"];
shenjs_functions["shen_shen-next-50"] = shen_next_50;






shen_decons_string = [shen_type_func,
  function shen_user_lambda4521(Arg4520) {
  if (Arg4520.length < 1) return [shen_type_func, shen_user_lambda4521, 1, Arg4520];
  var Arg4520_0 = Arg4520[0];
  return (((shenjs_is_type(Arg4520_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg4520_0[1])) && (shenjs_is_type(Arg4520_0[2], shen_type_cons) && (shenjs_is_type(Arg4520_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4520_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~S ", [shen_tuple, shenjs_call(shen_eval_cons, [Arg4520_0]), []]]);})
  : (function() {
  return shenjs_call_tail(shen_intmake_string, ["~R ", [shen_tuple, Arg4520_0, []]]);}))},
  1,
  [],
  "shen-decons-string"];
shenjs_functions["shen_shen-decons-string"] = shen_decons_string;






shen_insert_predicate = [shen_type_func,
  function shen_user_lambda4523(Arg4522) {
  if (Arg4522.length < 2) return [shen_type_func, shen_user_lambda4523, 2, Arg4522];
  var Arg4522_0 = Arg4522[0], Arg4522_1 = Arg4522[1];
  return (((shenjs_is_type(Arg4522_1, shen_type_cons) && (shenjs_is_type(Arg4522_1[2], shen_type_cons) && shenjs_empty$question$(Arg4522_1[2][2]))))
  ? [shen_type_cons, [shen_type_cons, Arg4522_0, Arg4522_1[1]], [shen_type_cons, [shen_type_symbol, ":-"], Arg4522_1[2]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-insert-predicate"]]);}))},
  2,
  [],
  "shen-insert-predicate"];
shenjs_functions["shen_shen-insert-predicate"] = shen_insert_predicate;






shen_$lt$predicate$asterisk$$gt$ = [shen_type_func,
  function shen_user_lambda4525(Arg4524) {
  if (Arg4524.length < 1) return [shen_type_func, shen_user_lambda4525, 1, Arg4524];
  var Arg4524_0 = Arg4524[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4524_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4524_0])[2], shenjs_call(shen_snd, [Arg4524_0])])]), shenjs_call(shen_fst, [Arg4524_0])[1]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<predicate*>"];
shenjs_functions["shen_shen-<predicate*>"] = shen_$lt$predicate$asterisk$$gt$;






shen_$lt$clauses$asterisk$$gt$ = [shen_type_func,
  function shen_user_lambda4527(Arg4526) {
  if (Arg4526.length < 1) return [shen_type_func, shen_user_lambda4527, 1, Arg4526];
  var Arg4526_0 = Arg4526[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$clause$asterisk$$gt$, [Arg4526_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$clauses$asterisk$$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4526_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<clauses*>"];
shenjs_functions["shen_shen-<clauses*>"] = shen_$lt$clauses$asterisk$$gt$;






shen_$lt$clause$asterisk$$gt$ = [shen_type_func,
  function shen_user_lambda4529(Arg4528) {
  if (Arg4528.length < 1) return [shen_type_func, shen_user_lambda4529, 1, Arg4528];
  var Arg4528_0 = Arg4528[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$head$asterisk$$gt$, [Arg4528_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "<--"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$body$asterisk$$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? ((R2 = shenjs_call(shen_$lt$end$asterisk$$gt$, [R1])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R2))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R2]), [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R1]), []]]])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<clause*>"];
shenjs_functions["shen_shen-<clause*>"] = shen_$lt$clause$asterisk$$gt$;






shen_$lt$head$asterisk$$gt$ = [shen_type_func,
  function shen_user_lambda4531(Arg4530) {
  if (Arg4530.length < 1) return [shen_type_func, shen_user_lambda4531, 1, Arg4530];
  var Arg4530_0 = Arg4530[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$term$asterisk$$gt$, [Arg4530_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$head$asterisk$$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4530_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<head*>"];
shenjs_functions["shen_shen-<head*>"] = shen_$lt$head$asterisk$$gt$;






shen_$lt$term$asterisk$$gt$ = [shen_type_func,
  function shen_user_lambda4533(Arg4532) {
  if (Arg4532.length < 1) return [shen_type_func, shen_user_lambda4533, 1, Arg4532];
  var Arg4532_0 = Arg4532[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4532_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4532_0])[2], shenjs_call(shen_snd, [Arg4532_0])])]), ((((!shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "<--"], shenjs_call(shen_fst, [Arg4532_0])[1]))) && shenjs_call(shen_legitimate_term$question$, [shenjs_call(shen_fst, [Arg4532_0])[1]])))
  ? shenjs_call(shen_eval_cons, [shenjs_call(shen_fst, [Arg4532_0])[1]])
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<term*>"];
shenjs_functions["shen_shen-<term*>"] = shen_$lt$term$asterisk$$gt$;






shen_legitimate_term$question$ = [shen_type_func,
  function shen_user_lambda4535(Arg4534) {
  if (Arg4534.length < 1) return [shen_type_func, shen_user_lambda4535, 1, Arg4534];
  var Arg4534_0 = Arg4534[0];
  return (((shenjs_is_type(Arg4534_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg4534_0[1])) && (shenjs_is_type(Arg4534_0[2], shen_type_cons) && (shenjs_is_type(Arg4534_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4534_0[2][2][2]))))))
  ? (shenjs_call(shen_legitimate_term$question$, [Arg4534_0[2][1]]) && shenjs_call(shen_legitimate_term$question$, [Arg4534_0[2][2][1]]))
  : (((shenjs_is_type(Arg4534_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4534_0[1])) && (shenjs_is_type(Arg4534_0[2], shen_type_cons) && (shenjs_is_type(Arg4534_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4534_0[2][2][1])) && shenjs_empty$question$(Arg4534_0[2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(shen_legitimate_term$question$, [Arg4534_0[2][1]]);})
  : (((shenjs_is_type(Arg4534_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4534_0[1])) && (shenjs_is_type(Arg4534_0[2], shen_type_cons) && (shenjs_is_type(Arg4534_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4534_0[2][2][1])) && shenjs_empty$question$(Arg4534_0[2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(shen_legitimate_term$question$, [Arg4534_0[2][1]]);})
  : ((shenjs_is_type(Arg4534_0, shen_type_cons))
  ? false
  : true))))},
  1,
  [],
  "shen-legitimate-term?"];
shenjs_functions["shen_shen-legitimate-term?"] = shen_legitimate_term$question$;






shen_eval_cons = [shen_type_func,
  function shen_user_lambda4537(Arg4536) {
  if (Arg4536.length < 1) return [shen_type_func, shen_user_lambda4537, 1, Arg4536];
  var Arg4536_0 = Arg4536[0];
  return (((shenjs_is_type(Arg4536_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg4536_0[1])) && (shenjs_is_type(Arg4536_0[2], shen_type_cons) && (shenjs_is_type(Arg4536_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4536_0[2][2][2]))))))
  ? [shen_type_cons, shenjs_call(shen_eval_cons, [Arg4536_0[2][1]]), shenjs_call(shen_eval_cons, [Arg4536_0[2][2][1]])]
  : (((shenjs_is_type(Arg4536_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4536_0[1])) && (shenjs_is_type(Arg4536_0[2], shen_type_cons) && (shenjs_is_type(Arg4536_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4536_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, shenjs_call(shen_eval_cons, [Arg4536_0[2][1]]), Arg4536_0[2][2]]]
  : Arg4536_0))},
  1,
  [],
  "shen-eval-cons"];
shenjs_functions["shen_shen-eval-cons"] = shen_eval_cons;






shen_$lt$body$asterisk$$gt$ = [shen_type_func,
  function shen_user_lambda4539(Arg4538) {
  if (Arg4538.length < 1) return [shen_type_func, shen_user_lambda4539, 1, Arg4538];
  var Arg4538_0 = Arg4538[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$literal$asterisk$$gt$, [Arg4538_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$body$asterisk$$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4538_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<body*>"];
shenjs_functions["shen_shen-<body*>"] = shen_$lt$body$asterisk$$gt$;






shen_$lt$literal$asterisk$$gt$ = [shen_type_func,
  function shen_user_lambda4541(Arg4540) {
  if (Arg4540.length < 1) return [shen_type_func, shen_user_lambda4541, 1, Arg4540];
  var Arg4540_0 = Arg4540[0];
  var R0;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4540_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "!"], shenjs_call(shen_fst, [Arg4540_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4540_0])[2], shenjs_call(shen_snd, [Arg4540_0])])]), [shen_type_cons, [shen_type_symbol, "cut"], [shen_type_cons, [shen_type_symbol, "Throwcontrol"], []]]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4540_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4540_0])[2], shenjs_call(shen_snd, [Arg4540_0])])]), ((shenjs_is_type(shenjs_call(shen_fst, [Arg4540_0])[1], shen_type_cons))
  ? shenjs_call(shen_fst, [Arg4540_0])[1]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<literal*>"];
shenjs_functions["shen_shen-<literal*>"] = shen_$lt$literal$asterisk$$gt$;






shen_$lt$end$asterisk$$gt$ = [shen_type_func,
  function shen_user_lambda4543(Arg4542) {
  if (Arg4542.length < 1) return [shen_type_func, shen_user_lambda4543, 1, Arg4542];
  var Arg4542_0 = Arg4542[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4542_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4542_0])[2], shenjs_call(shen_snd, [Arg4542_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4542_0])[1], [shen_type_symbol, ";"])))
  ? [shen_type_symbol, "shen-skip"]
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<end*>"];
shenjs_functions["shen_shen-<end*>"] = shen_$lt$end$asterisk$$gt$;






shen_cut = [shen_type_func,
  function shen_user_lambda4545(Arg4544) {
  if (Arg4544.length < 3) return [shen_type_func, shen_user_lambda4545, 3, Arg4544];
  var Arg4544_0 = Arg4544[0], Arg4544_1 = Arg4544[1], Arg4544_2 = Arg4544[2];
  var R0;
  return ((R0 = shenjs_unwind_tail(shenjs_thaw(Arg4544_2))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? Arg4544_0
  : R0))},
  3,
  [],
  "cut"];
shenjs_functions["shen_cut"] = shen_cut;






shen_insert$_modes = [shen_type_func,
  function shen_user_lambda4547(Arg4546) {
  if (Arg4546.length < 1) return [shen_type_func, shen_user_lambda4547, 1, Arg4546];
  var Arg4546_0 = Arg4546[0];
  return (((shenjs_is_type(Arg4546_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4546_0[1])) && (shenjs_is_type(Arg4546_0[2], shen_type_cons) && (shenjs_is_type(Arg4546_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4546_0[2][2][2]))))))
  ? Arg4546_0
  : ((shenjs_empty$question$(Arg4546_0))
  ? []
  : ((shenjs_is_type(Arg4546_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4546_0[1], [shen_type_cons, [shen_type_symbol, "+"], []]]], [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, shenjs_call(shen_insert$_modes, [Arg4546_0[2]]), [shen_type_cons, [shen_type_symbol, "-"], []]]]]
  : Arg4546_0)))},
  1,
  [],
  "shen-insert_modes"];
shenjs_functions["shen_shen-insert_modes"] = shen_insert$_modes;






shen_s_prolog = [shen_type_func,
  function shen_user_lambda4549(Arg4548) {
  if (Arg4548.length < 1) return [shen_type_func, shen_user_lambda4549, 1, Arg4548];
  var Arg4548_0 = Arg4548[0];
  return (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda4551(Arg4550) {
  if (Arg4550.length < 1) return [shen_type_func, shen_user_lambda4551, 1, Arg4550];
  var Arg4550_0 = Arg4550[0];
  return (function() {
  return shenjs_call_tail(shen_eval, [Arg4550_0]);})},
  1,
  []], shenjs_call(shen_prolog_$gt$shen, [Arg4548_0])]);})},
  1,
  [],
  "shen-s-prolog"];
shenjs_functions["shen_shen-s-prolog"] = shen_s_prolog;






shen_prolog_$gt$shen = [shen_type_func,
  function shen_user_lambda4553(Arg4552) {
  if (Arg4552.length < 1) return [shen_type_func, shen_user_lambda4553, 1, Arg4552];
  var Arg4552_0 = Arg4552[0];
  return (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda4555(Arg4554) {
  if (Arg4554.length < 1) return [shen_type_func, shen_user_lambda4555, 1, Arg4554];
  var Arg4554_0 = Arg4554[0];
  return (function() {
  return shenjs_call_tail(shen_compile$_prolog$_procedure, [Arg4554_0]);})},
  1,
  []], shenjs_call(shen_group$_clauses, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4557(Arg4556) {
  if (Arg4556.length < 1) return [shen_type_func, shen_user_lambda4557, 1, Arg4556];
  var Arg4556_0 = Arg4556[0];
  return (function() {
  return shenjs_call_tail(shen_s_prolog$_clause, [Arg4556_0]);})},
  1,
  []], shenjs_call(shen_mapcan, [[shen_type_func,
  function shen_user_lambda4559(Arg4558) {
  if (Arg4558.length < 1) return [shen_type_func, shen_user_lambda4559, 1, Arg4558];
  var Arg4558_0 = Arg4558[0];
  return (function() {
  return shenjs_call_tail(shen_head$_abstraction, [Arg4558_0]);})},
  1,
  []], Arg4552_0])])])]);})},
  1,
  [],
  "shen-prolog->shen"];
shenjs_functions["shen_shen-prolog->shen"] = shen_prolog_$gt$shen;






shen_s_prolog$_clause = [shen_type_func,
  function shen_user_lambda4561(Arg4560) {
  if (Arg4560.length < 1) return [shen_type_func, shen_user_lambda4561, 1, Arg4560];
  var Arg4560_0 = Arg4560[0];
  return (((shenjs_is_type(Arg4560_0, shen_type_cons) && (shenjs_is_type(Arg4560_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg4560_0[2][1])) && (shenjs_is_type(Arg4560_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4560_0[2][2][2]))))))
  ? [shen_type_cons, Arg4560_0[1], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4563(Arg4562) {
  if (Arg4562.length < 1) return [shen_type_func, shen_user_lambda4563, 1, Arg4562];
  var Arg4562_0 = Arg4562[0];
  return (function() {
  return shenjs_call_tail(shen_s_prolog$_literal, [Arg4562_0]);})},
  1,
  []], Arg4560_0[2][2][1]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-s-prolog_clause"]]);}))},
  1,
  [],
  "shen-s-prolog_clause"];
shenjs_functions["shen_shen-s-prolog_clause"] = shen_s_prolog$_clause;






shen_head$_abstraction = [shen_type_func,
  function shen_user_lambda4565(Arg4564) {
  if (Arg4564.length < 1) return [shen_type_func, shen_user_lambda4565, 1, Arg4564];
  var Arg4564_0 = Arg4564[0];
  var R0, R1;
  return (((shenjs_is_type(Arg4564_0, shen_type_cons) && (shenjs_is_type(Arg4564_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg4564_0[2][1])) && (shenjs_is_type(Arg4564_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4564_0[2][2][2]) && (shenjs_call(shen_complexity$_head, [Arg4564_0[1]]) < (shenjs_globals["shen_shen-*maxcomplexity*"]))))))))
  ? [shen_type_cons, Arg4564_0, []]
  : (((shenjs_is_type(Arg4564_0, shen_type_cons) && (shenjs_is_type(Arg4564_0[1], shen_type_cons) && (shenjs_is_type(Arg4564_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg4564_0[2][1])) && (shenjs_is_type(Arg4564_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4564_0[2][2][2])))))))
  ? ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4567(Arg4566) {
  if (Arg4566.length < 1) return [shen_type_func, shen_user_lambda4567, 1, Arg4566];
  var Arg4566_0 = Arg4566[0];
  return (function() {
  return shenjs_call_tail(shen_gensym, [[shen_type_symbol, "V"]]);})},
  1,
  []], Arg4564_0[1][2]])),
  (R1 = shenjs_call(shen_rcons$_form, [shenjs_call(shen_remove$_modes, [Arg4564_0[1][2]])])),
  (R1 = [shen_type_cons, [shen_type_symbol, "unify"], [shen_type_cons, shenjs_call(shen_cons$_form, [R0]), [shen_type_cons, R1, []]]]),
  (R1 = [shen_type_cons, [shen_type_cons, Arg4564_0[1][1], R0], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [shen_type_cons, R1, Arg4564_0[2][2][1]], []]]]),
  [shen_type_cons, R1, []])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-head_abstraction"]]);})))},
  1,
  [],
  "shen-head_abstraction"];
shenjs_functions["shen_shen-head_abstraction"] = shen_head$_abstraction;






shen_complexity$_head = [shen_type_func,
  function shen_user_lambda4569(Arg4568) {
  if (Arg4568.length < 1) return [shen_type_func, shen_user_lambda4569, 1, Arg4568];
  var Arg4568_0 = Arg4568[0];
  return ((shenjs_is_type(Arg4568_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_product, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4571(Arg4570) {
  if (Arg4570.length < 1) return [shen_type_func, shen_user_lambda4571, 1, Arg4570];
  var Arg4570_0 = Arg4570[0];
  return (function() {
  return shenjs_call_tail(shen_complexity, [Arg4570_0]);})},
  1,
  []], Arg4568_0[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-complexity_head"]]);}))},
  1,
  [],
  "shen-complexity_head"];
shenjs_functions["shen_shen-complexity_head"] = shen_complexity$_head;






shen_complexity = [shen_type_func,
  function shen_user_lambda4573(Arg4572) {
  if (Arg4572.length < 1) return [shen_type_func, shen_user_lambda4573, 1, Arg4572];
  var Arg4572_0 = Arg4572[0];
  return (((shenjs_is_type(Arg4572_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4572_0[1])) && (shenjs_is_type(Arg4572_0[2], shen_type_cons) && (shenjs_is_type(Arg4572_0[2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4572_0[2][1][1])) && (shenjs_is_type(Arg4572_0[2][1][2], shen_type_cons) && (shenjs_is_type(Arg4572_0[2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4572_0[2][1][2][2][2]) && (shenjs_is_type(Arg4572_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4572_0[2][2][2])))))))))))
  ? (function() {
  return shenjs_call_tail(shen_complexity, [Arg4572_0[2][1]]);})
  : (((shenjs_is_type(Arg4572_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4572_0[1])) && (shenjs_is_type(Arg4572_0[2], shen_type_cons) && (shenjs_is_type(Arg4572_0[2][1], shen_type_cons) && (shenjs_is_type(Arg4572_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4572_0[2][2][1])) && shenjs_empty$question$(Arg4572_0[2][2][2]))))))))
  ? (2 * (shenjs_call(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4572_0[2][1][1], Arg4572_0[2][2]]]]) * shenjs_call(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4572_0[2][1][2], Arg4572_0[2][2]]]])))
  : (((shenjs_is_type(Arg4572_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4572_0[1])) && (shenjs_is_type(Arg4572_0[2], shen_type_cons) && (shenjs_is_type(Arg4572_0[2][1], shen_type_cons) && (shenjs_is_type(Arg4572_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4572_0[2][2][1])) && shenjs_empty$question$(Arg4572_0[2][2][2]))))))))
  ? (shenjs_call(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4572_0[2][1][1], Arg4572_0[2][2]]]]) * shenjs_call(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4572_0[2][1][2], Arg4572_0[2][2]]]]))
  : (((shenjs_is_type(Arg4572_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4572_0[1])) && (shenjs_is_type(Arg4572_0[2], shen_type_cons) && (shenjs_is_type(Arg4572_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4572_0[2][2][2]) && shenjs_call(shen_variable$question$, [Arg4572_0[2][1]])))))))
  ? 1
  : (((shenjs_is_type(Arg4572_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4572_0[1])) && (shenjs_is_type(Arg4572_0[2], shen_type_cons) && (shenjs_is_type(Arg4572_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4572_0[2][2][1])) && shenjs_empty$question$(Arg4572_0[2][2][2])))))))
  ? 2
  : (((shenjs_is_type(Arg4572_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4572_0[1])) && (shenjs_is_type(Arg4572_0[2], shen_type_cons) && (shenjs_is_type(Arg4572_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4572_0[2][2][1])) && shenjs_empty$question$(Arg4572_0[2][2][2])))))))
  ? 1
  : (function() {
  return shenjs_call_tail(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4572_0, [shen_type_cons, [shen_type_symbol, "+"], []]]]]);})))))))},
  1,
  [],
  "shen-complexity"];
shenjs_functions["shen_shen-complexity"] = shen_complexity;






shen_product = [shen_type_func,
  function shen_user_lambda4575(Arg4574) {
  if (Arg4574.length < 1) return [shen_type_func, shen_user_lambda4575, 1, Arg4574];
  var Arg4574_0 = Arg4574[0];
  return ((shenjs_empty$question$(Arg4574_0))
  ? 1
  : ((shenjs_is_type(Arg4574_0, shen_type_cons))
  ? (Arg4574_0[1] * shenjs_call(shen_product, [Arg4574_0[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-product"]]);})))},
  1,
  [],
  "shen-product"];
shenjs_functions["shen_shen-product"] = shen_product;






shen_s_prolog$_literal = [shen_type_func,
  function shen_user_lambda4577(Arg4576) {
  if (Arg4576.length < 1) return [shen_type_func, shen_user_lambda4577, 1, Arg4576];
  var Arg4576_0 = Arg4576[0];
  return (((shenjs_is_type(Arg4576_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "is"], Arg4576_0[1])) && (shenjs_is_type(Arg4576_0[2], shen_type_cons) && (shenjs_is_type(Arg4576_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4576_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, Arg4576_0[2][1], [shen_type_cons, shenjs_call(shen_insert$_deref, [Arg4576_0[2][2][1]]), []]]]
  : (((shenjs_is_type(Arg4576_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "when"], Arg4576_0[1])) && (shenjs_is_type(Arg4576_0[2], shen_type_cons) && shenjs_empty$question$(Arg4576_0[2][2])))))
  ? [shen_type_cons, [shen_type_symbol, "fwhen"], [shen_type_cons, shenjs_call(shen_insert$_deref, [Arg4576_0[2][1]]), []]]
  : (((shenjs_is_type(Arg4576_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "bind"], Arg4576_0[1])) && (shenjs_is_type(Arg4576_0[2], shen_type_cons) && (shenjs_is_type(Arg4576_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4576_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, Arg4576_0[2][1], [shen_type_cons, shenjs_call(shen_insert$_lazyderef, [Arg4576_0[2][2][1]]), []]]]
  : (((shenjs_is_type(Arg4576_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fwhen"], Arg4576_0[1])) && (shenjs_is_type(Arg4576_0[2], shen_type_cons) && shenjs_empty$question$(Arg4576_0[2][2])))))
  ? [shen_type_cons, [shen_type_symbol, "fwhen"], [shen_type_cons, shenjs_call(shen_insert$_lazyderef, [Arg4576_0[2][1]]), []]]
  : ((shenjs_is_type(Arg4576_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_m$_prolog$_to$_s_prolog$_predicate, [Arg4576_0[1]]), Arg4576_0[2]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-s-prolog_literal"]]);}))))))},
  1,
  [],
  "shen-s-prolog_literal"];
shenjs_functions["shen_shen-s-prolog_literal"] = shen_s_prolog$_literal;






shen_insert$_deref = [shen_type_func,
  function shen_user_lambda4579(Arg4578) {
  if (Arg4578.length < 1) return [shen_type_func, shen_user_lambda4579, 1, Arg4578];
  var Arg4578_0 = Arg4578[0];
  return ((shenjs_call(shen_variable$question$, [Arg4578_0]))
  ? [shen_type_cons, [shen_type_symbol, "shen-deref"], [shen_type_cons, Arg4578_0, [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]]
  : ((shenjs_is_type(Arg4578_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_insert$_deref, [Arg4578_0[1]]), shenjs_call(shen_insert$_deref, [Arg4578_0[2]])]
  : Arg4578_0))},
  1,
  [],
  "shen-insert_deref"];
shenjs_functions["shen_shen-insert_deref"] = shen_insert$_deref;






shen_insert$_lazyderef = [shen_type_func,
  function shen_user_lambda4581(Arg4580) {
  if (Arg4580.length < 1) return [shen_type_func, shen_user_lambda4581, 1, Arg4580];
  var Arg4580_0 = Arg4580[0];
  return ((shenjs_call(shen_variable$question$, [Arg4580_0]))
  ? [shen_type_cons, [shen_type_symbol, "shen-lazyderef"], [shen_type_cons, Arg4580_0, [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]]
  : ((shenjs_is_type(Arg4580_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_insert$_lazyderef, [Arg4580_0[1]]), shenjs_call(shen_insert$_lazyderef, [Arg4580_0[2]])]
  : Arg4580_0))},
  1,
  [],
  "shen-insert_lazyderef"];
shenjs_functions["shen_shen-insert_lazyderef"] = shen_insert$_lazyderef;






shen_m$_prolog$_to$_s_prolog$_predicate = [shen_type_func,
  function shen_user_lambda4583(Arg4582) {
  if (Arg4582.length < 1) return [shen_type_func, shen_user_lambda4583, 1, Arg4582];
  var Arg4582_0 = Arg4582[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "="], Arg4582_0)))
  ? [shen_type_symbol, "unify"]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "=!"], Arg4582_0)))
  ? [shen_type_symbol, "unify!"]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "=="], Arg4582_0)))
  ? [shen_type_symbol, "identical"]
  : Arg4582_0)))},
  1,
  [],
  "shen-m_prolog_to_s-prolog_predicate"];
shenjs_functions["shen_shen-m_prolog_to_s-prolog_predicate"] = shen_m$_prolog$_to$_s_prolog$_predicate;






shen_group$_clauses = [shen_type_func,
  function shen_user_lambda4585(Arg4584) {
  if (Arg4584.length < 1) return [shen_type_func, shen_user_lambda4585, 1, Arg4584];
  var Arg4584_0 = Arg4584[0];
  var R0, R1;
  return ((shenjs_empty$question$(Arg4584_0))
  ? []
  : ((shenjs_is_type(Arg4584_0, shen_type_cons))
  ? ((R0 = shenjs_call(shen_collect, [[shen_type_func,
  function shen_user_lambda4587(Arg4586) {
  if (Arg4586.length < 2) return [shen_type_func, shen_user_lambda4587, 2, Arg4586];
  var Arg4586_0 = Arg4586[0], Arg4586_1 = Arg4586[1];
  return (function() {
  return shenjs_call_tail(shen_same$_predicate$question$, [Arg4586_0[1], Arg4586_1]);})},
  2,
  [Arg4584_0]], Arg4584_0])),
  (R1 = shenjs_call(shen_difference, [Arg4584_0, R0])),
  [shen_type_cons, R0, shenjs_call(shen_group$_clauses, [R1])])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-group_clauses"]]);})))},
  1,
  [],
  "shen-group_clauses"];
shenjs_functions["shen_shen-group_clauses"] = shen_group$_clauses;






shen_collect = [shen_type_func,
  function shen_user_lambda4589(Arg4588) {
  if (Arg4588.length < 2) return [shen_type_func, shen_user_lambda4589, 2, Arg4588];
  var Arg4588_0 = Arg4588[0], Arg4588_1 = Arg4588[1];
  return ((shenjs_empty$question$(Arg4588_1))
  ? []
  : ((shenjs_is_type(Arg4588_1, shen_type_cons))
  ? ((shenjs_call(Arg4588_0, [Arg4588_1[1]]))
  ? [shen_type_cons, Arg4588_1[1], shenjs_call(shen_collect, [Arg4588_0, Arg4588_1[2]])]
  : (function() {
  return shenjs_call_tail(shen_collect, [Arg4588_0, Arg4588_1[2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-collect"]]);})))},
  2,
  [],
  "shen-collect"];
shenjs_functions["shen_shen-collect"] = shen_collect;






shen_same$_predicate$question$ = [shen_type_func,
  function shen_user_lambda4591(Arg4590) {
  if (Arg4590.length < 2) return [shen_type_func, shen_user_lambda4591, 2, Arg4590];
  var Arg4590_0 = Arg4590[0], Arg4590_1 = Arg4590[1];
  return (((shenjs_is_type(Arg4590_0, shen_type_cons) && (shenjs_is_type(Arg4590_0[1], shen_type_cons) && (shenjs_is_type(Arg4590_1, shen_type_cons) && shenjs_is_type(Arg4590_1[1], shen_type_cons)))))
  ? shenjs_$eq$(Arg4590_0[1][1], Arg4590_1[1][1])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-same_predicate?"]]);}))},
  2,
  [],
  "shen-same_predicate?"];
shenjs_functions["shen_shen-same_predicate?"] = shen_same$_predicate$question$;






shen_compile$_prolog$_procedure = [shen_type_func,
  function shen_user_lambda4593(Arg4592) {
  if (Arg4592.length < 1) return [shen_type_func, shen_user_lambda4593, 1, Arg4592];
  var Arg4592_0 = Arg4592[0];
  var R0;
  return ((R0 = shenjs_call(shen_procedure$_name, [Arg4592_0])),
  (R0 = shenjs_call(shen_clauses_to_shen, [R0, Arg4592_0])),
  R0)},
  1,
  [],
  "shen-compile_prolog_procedure"];
shenjs_functions["shen_shen-compile_prolog_procedure"] = shen_compile$_prolog$_procedure;






shen_procedure$_name = [shen_type_func,
  function shen_user_lambda4595(Arg4594) {
  if (Arg4594.length < 1) return [shen_type_func, shen_user_lambda4595, 1, Arg4594];
  var Arg4594_0 = Arg4594[0];
  return (((shenjs_is_type(Arg4594_0, shen_type_cons) && (shenjs_is_type(Arg4594_0[1], shen_type_cons) && shenjs_is_type(Arg4594_0[1][1], shen_type_cons))))
  ? Arg4594_0[1][1][1]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-procedure_name"]]);}))},
  1,
  [],
  "shen-procedure_name"];
shenjs_functions["shen_shen-procedure_name"] = shen_procedure$_name;






shen_clauses_to_shen = [shen_type_func,
  function shen_user_lambda4597(Arg4596) {
  if (Arg4596.length < 2) return [shen_type_func, shen_user_lambda4597, 2, Arg4596];
  var Arg4596_0 = Arg4596[0], Arg4596_1 = Arg4596[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4599(Arg4598) {
  if (Arg4598.length < 1) return [shen_type_func, shen_user_lambda4599, 1, Arg4598];
  var Arg4598_0 = Arg4598[0];
  return (function() {
  return shenjs_call_tail(shen_linearise_clause, [Arg4598_0]);})},
  1,
  []], Arg4596_1])),
  (R1 = shenjs_call(shen_prolog_aritycheck, [Arg4596_0, shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4601(Arg4600) {
  if (Arg4600.length < 1) return [shen_type_func, shen_user_lambda4601, 1, Arg4600];
  var Arg4600_0 = Arg4600[0];
  return (function() {
  return shenjs_call_tail(shen_head, [Arg4600_0]);})},
  1,
  []], Arg4596_1])])),
  (R1 = shenjs_call(shen_parameters, [R1])),
  (R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4603(Arg4602) {
  if (Arg4602.length < 2) return [shen_type_func, shen_user_lambda4603, 2, Arg4602];
  var Arg4602_0 = Arg4602[0], Arg4602_1 = Arg4602[1];
  return (function() {
  return shenjs_call_tail(shen_aum, [Arg4602_1, Arg4602_0]);})},
  2,
  [R1]], R0])),
  (R0 = shenjs_call(shen_catch_cut, [shenjs_call(shen_nest_disjunct, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4605(Arg4604) {
  if (Arg4604.length < 1) return [shen_type_func, shen_user_lambda4605, 1, Arg4604];
  var Arg4604_0 = Arg4604[0];
  return (function() {
  return shenjs_call_tail(shen_aum$_to$_shen, [Arg4604_0]);})},
  1,
  []], R0])])])),
  (R1 = [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg4596_0, shenjs_call(shen_append, [R1, shenjs_call(shen_append, [[shen_type_cons, [shen_type_symbol, "ProcessN"], [shen_type_cons, [shen_type_symbol, "Continuation"], []]], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, R0, []]]])])]]),
  R1)},
  2,
  [],
  "shen-clauses-to-shen"];
shenjs_functions["shen_shen-clauses-to-shen"] = shen_clauses_to_shen;






shen_catch_cut = [shen_type_func,
  function shen_user_lambda4607(Arg4606) {
  if (Arg4606.length < 1) return [shen_type_func, shen_user_lambda4607, 1, Arg4606];
  var Arg4606_0 = Arg4606[0];
  return (((!shenjs_call(shen_occurs$question$, [[shen_type_symbol, "cut"], Arg4606_0])))
  ? Arg4606_0
  : [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Throwcontrol"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-catchpoint"], []], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-cutpoint"], [shen_type_cons, [shen_type_symbol, "Throwcontrol"], [shen_type_cons, Arg4606_0, []]]], []]]]])},
  1,
  [],
  "shen-catch-cut"];
shenjs_functions["shen_shen-catch-cut"] = shen_catch_cut;






shen_catchpoint = [shen_type_func,
  function shen_user_lambda4609(Arg4608) {
  if (Arg4608.length < 0) return [shen_type_func, shen_user_lambda4609, 0, Arg4608];
  return (shenjs_globals["shen_shen-*catch*"] = (1 + (shenjs_globals["shen_shen-*catch*"])))},
  0,
  [],
  "shen-catchpoint"];
shenjs_functions["shen_shen-catchpoint"] = shen_catchpoint;






shen_cutpoint = [shen_type_func,
  function shen_user_lambda4611(Arg4610) {
  if (Arg4610.length < 2) return [shen_type_func, shen_user_lambda4611, 2, Arg4610];
  var Arg4610_0 = Arg4610[0], Arg4610_1 = Arg4610[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4610_1, Arg4610_0)))
  ? false
  : Arg4610_1)},
  2,
  [],
  "shen-cutpoint"];
shenjs_functions["shen_shen-cutpoint"] = shen_cutpoint;






shen_nest_disjunct = [shen_type_func,
  function shen_user_lambda4613(Arg4612) {
  if (Arg4612.length < 1) return [shen_type_func, shen_user_lambda4613, 1, Arg4612];
  var Arg4612_0 = Arg4612[0];
  return (((shenjs_is_type(Arg4612_0, shen_type_cons) && shenjs_empty$question$(Arg4612_0[2])))
  ? Arg4612_0[1]
  : ((shenjs_is_type(Arg4612_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_lisp_or, [Arg4612_0[1], shenjs_call(shen_nest_disjunct, [Arg4612_0[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-nest-disjunct"]]);})))},
  1,
  [],
  "shen-nest-disjunct"];
shenjs_functions["shen_shen-nest-disjunct"] = shen_nest_disjunct;






shen_lisp_or = [shen_type_func,
  function shen_user_lambda4615(Arg4614) {
  if (Arg4614.length < 2) return [shen_type_func, shen_user_lambda4615, 2, Arg4614];
  var Arg4614_0 = Arg4614[0], Arg4614_1 = Arg4614[1];
  return [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Case"], [shen_type_cons, Arg4614_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "Case"], [shen_type_cons, false, []]]], [shen_type_cons, Arg4614_1, [shen_type_cons, [shen_type_symbol, "Case"], []]]]], []]]]]},
  2,
  [],
  "shen-lisp-or"];
shenjs_functions["shen_shen-lisp-or"] = shen_lisp_or;






shen_prolog_aritycheck = [shen_type_func,
  function shen_user_lambda4617(Arg4616) {
  if (Arg4616.length < 2) return [shen_type_func, shen_user_lambda4617, 2, Arg4616];
  var Arg4616_0 = Arg4616[0], Arg4616_1 = Arg4616[1];
  return (((shenjs_is_type(Arg4616_1, shen_type_cons) && shenjs_empty$question$(Arg4616_1[2])))
  ? (shenjs_call(shen_length, [Arg4616_1[1]]) - 1)
  : (((shenjs_is_type(Arg4616_1, shen_type_cons) && shenjs_is_type(Arg4616_1[2], shen_type_cons)))
  ? ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_length, [Arg4616_1[1]]), shenjs_call(shen_length, [Arg4616_1[2][1]]))))
  ? (function() {
  return shenjs_call_tail(shen_prolog_aritycheck, [Arg4616_0, Arg4616_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_interror, ["arity error in prolog procedure ~A~%", [shen_tuple, [shen_type_cons, Arg4616_0, []], []]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-prolog-aritycheck"]]);})))},
  2,
  [],
  "shen-prolog-aritycheck"];
shenjs_functions["shen_shen-prolog-aritycheck"] = shen_prolog_aritycheck;






shen_linearise_clause = [shen_type_func,
  function shen_user_lambda4619(Arg4618) {
  if (Arg4618.length < 1) return [shen_type_func, shen_user_lambda4619, 1, Arg4618];
  var Arg4618_0 = Arg4618[0];
  var R0;
  return (((shenjs_is_type(Arg4618_0, shen_type_cons) && (shenjs_is_type(Arg4618_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg4618_0[2][1])) && (shenjs_is_type(Arg4618_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4618_0[2][2][2]))))))
  ? ((R0 = shenjs_call(shen_linearise, [[shen_type_cons, Arg4618_0[1], Arg4618_0[2][2]]])),
  (function() {
  return shenjs_call_tail(shen_clause$_form, [R0]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-linearise-clause"]]);}))},
  1,
  [],
  "shen-linearise-clause"];
shenjs_functions["shen_shen-linearise-clause"] = shen_linearise_clause;






shen_clause$_form = [shen_type_func,
  function shen_user_lambda4621(Arg4620) {
  if (Arg4620.length < 1) return [shen_type_func, shen_user_lambda4621, 1, Arg4620];
  var Arg4620_0 = Arg4620[0];
  return (((shenjs_is_type(Arg4620_0, shen_type_cons) && (shenjs_is_type(Arg4620_0[2], shen_type_cons) && shenjs_empty$question$(Arg4620_0[2][2]))))
  ? [shen_type_cons, shenjs_call(shen_explicit$_modes, [Arg4620_0[1]]), [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, shenjs_call(shen_cf$_help, [Arg4620_0[2][1]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-clause_form"]]);}))},
  1,
  [],
  "shen-clause_form"];
shenjs_functions["shen_shen-clause_form"] = shen_clause$_form;






shen_explicit$_modes = [shen_type_func,
  function shen_user_lambda4623(Arg4622) {
  if (Arg4622.length < 1) return [shen_type_func, shen_user_lambda4623, 1, Arg4622];
  var Arg4622_0 = Arg4622[0];
  return ((shenjs_is_type(Arg4622_0, shen_type_cons))
  ? [shen_type_cons, Arg4622_0[1], shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4625(Arg4624) {
  if (Arg4624.length < 1) return [shen_type_func, shen_user_lambda4625, 1, Arg4624];
  var Arg4624_0 = Arg4624[0];
  return (function() {
  return shenjs_call_tail(shen_em$_help, [Arg4624_0]);})},
  1,
  []], Arg4622_0[2]])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-explicit_modes"]]);}))},
  1,
  [],
  "shen-explicit_modes"];
shenjs_functions["shen_shen-explicit_modes"] = shen_explicit$_modes;






shen_em$_help = [shen_type_func,
  function shen_user_lambda4627(Arg4626) {
  if (Arg4626.length < 1) return [shen_type_func, shen_user_lambda4627, 1, Arg4626];
  var Arg4626_0 = Arg4626[0];
  return (((shenjs_is_type(Arg4626_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4626_0[1])) && (shenjs_is_type(Arg4626_0[2], shen_type_cons) && (shenjs_is_type(Arg4626_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4626_0[2][2][2]))))))
  ? Arg4626_0
  : [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4626_0, [shen_type_cons, [shen_type_symbol, "+"], []]]])},
  1,
  [],
  "shen-em_help"];
shenjs_functions["shen_shen-em_help"] = shen_em$_help;






shen_cf$_help = [shen_type_func,
  function shen_user_lambda4629(Arg4628) {
  if (Arg4628.length < 1) return [shen_type_func, shen_user_lambda4629, 1, Arg4628];
  var Arg4628_0 = Arg4628[0];
  return (((shenjs_is_type(Arg4628_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "where"], Arg4628_0[1])) && (shenjs_is_type(Arg4628_0[2], shen_type_cons) && (shenjs_is_type(Arg4628_0[2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "="], Arg4628_0[2][1][1])) && (shenjs_is_type(Arg4628_0[2][1][2], shen_type_cons) && (shenjs_is_type(Arg4628_0[2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4628_0[2][1][2][2][2]) && (shenjs_is_type(Arg4628_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4628_0[2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_cons, (((shenjs_globals["shen_shen-*occurs*"]))
  ? [shen_type_symbol, "unify!"]
  : [shen_type_symbol, "unify"]), Arg4628_0[2][1][2]], shenjs_call(shen_cf$_help, [Arg4628_0[2][2][1]])]
  : Arg4628_0)},
  1,
  [],
  "shen-cf_help"];
shenjs_functions["shen_shen-cf_help"] = shen_cf$_help;






shen_occurs_check = [shen_type_func,
  function shen_user_lambda4631(Arg4630) {
  if (Arg4630.length < 1) return [shen_type_func, shen_user_lambda4631, 1, Arg4630];
  var Arg4630_0 = Arg4630[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4630_0)))
  ? (shenjs_globals["shen_shen-*occurs*"] = true)
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4630_0)))
  ? (shenjs_globals["shen_shen-*occurs*"] = false)
  : (function() {
  return shenjs_call_tail(shen_interror, ["occurs-check expects + or -~%", []]);})))},
  1,
  [],
  "occurs-check"];
shenjs_functions["shen_occurs-check"] = shen_occurs_check;






shen_aum = [shen_type_func,
  function shen_user_lambda4633(Arg4632) {
  if (Arg4632.length < 2) return [shen_type_func, shen_user_lambda4633, 2, Arg4632];
  var Arg4632_0 = Arg4632[0], Arg4632_1 = Arg4632[1];
  var R0;
  return (((shenjs_is_type(Arg4632_0, shen_type_cons) && (shenjs_is_type(Arg4632_0[1], shen_type_cons) && (shenjs_is_type(Arg4632_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg4632_0[2][1])) && (shenjs_is_type(Arg4632_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4632_0[2][2][2])))))))
  ? ((R0 = shenjs_call(shen_make$_mu$_application, [[shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4632_0[1][2], [shen_type_cons, shenjs_call(shen_continuation$_call, [Arg4632_0[1][2], Arg4632_0[2][2][1]]), []]]], Arg4632_1])),
  (function() {
  return shenjs_call_tail(shen_mu$_reduction, [R0, [shen_type_symbol, "+"]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-aum"]]);}))},
  2,
  [],
  "shen-aum"];
shenjs_functions["shen_shen-aum"] = shen_aum;






shen_continuation$_call = [shen_type_func,
  function shen_user_lambda4635(Arg4634) {
  if (Arg4634.length < 2) return [shen_type_func, shen_user_lambda4635, 2, Arg4634];
  var Arg4634_0 = Arg4634[0], Arg4634_1 = Arg4634[1];
  var R0, R1;
  return ((R0 = [shen_type_cons, [shen_type_symbol, "ProcessN"], shenjs_call(shen_extract$_vars, [Arg4634_0])]),
  (R1 = shenjs_call(shen_extract$_vars, [Arg4634_1])),
  (R1 = shenjs_call(shen_remove, [[shen_type_symbol, "Throwcontrol"], shenjs_call(shen_difference, [R1, R0])])),
  (function() {
  return shenjs_call_tail(shen_cc$_help, [R1, Arg4634_1]);}))},
  2,
  [],
  "shen-continuation_call"];
shenjs_functions["shen_shen-continuation_call"] = shen_continuation$_call;






shen_remove = [shen_type_func,
  function shen_user_lambda4637(Arg4636) {
  if (Arg4636.length < 2) return [shen_type_func, shen_user_lambda4637, 2, Arg4636];
  var Arg4636_0 = Arg4636[0], Arg4636_1 = Arg4636[1];
  return (function() {
  return shenjs_call_tail(shen_remove_h, [Arg4636_0, Arg4636_1, []]);})},
  2,
  [],
  "remove"];
shenjs_functions["shen_remove"] = shen_remove;






shen_remove_h = [shen_type_func,
  function shen_user_lambda4639(Arg4638) {
  if (Arg4638.length < 3) return [shen_type_func, shen_user_lambda4639, 3, Arg4638];
  var Arg4638_0 = Arg4638[0], Arg4638_1 = Arg4638[1], Arg4638_2 = Arg4638[2];
  return ((shenjs_empty$question$(Arg4638_1))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg4638_2]);})
  : (((shenjs_is_type(Arg4638_1, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg4638_1[1], Arg4638_0))))
  ? (function() {
  return shenjs_call_tail(shen_remove_h, [Arg4638_1[1], Arg4638_1[2], Arg4638_2]);})
  : ((shenjs_is_type(Arg4638_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_remove_h, [Arg4638_0, Arg4638_1[2], [shen_type_cons, Arg4638_1[1], Arg4638_2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-remove-h"]]);}))))},
  3,
  [],
  "shen-remove-h"];
shenjs_functions["shen_shen-remove-h"] = shen_remove_h;






shen_cc$_help = [shen_type_func,
  function shen_user_lambda4641(Arg4640) {
  if (Arg4640.length < 2) return [shen_type_func, shen_user_lambda4641, 2, Arg4640];
  var Arg4640_0 = Arg4640[0], Arg4640_1 = Arg4640[1];
  return (((shenjs_empty$question$(Arg4640_0) && shenjs_empty$question$(Arg4640_1)))
  ? [shen_type_cons, [shen_type_symbol, "shen-pop"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-stack"], []]]]
  : ((shenjs_empty$question$(Arg4640_1))
  ? [shen_type_cons, [shen_type_symbol, "shen-rename"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-variables"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, Arg4640_0, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-pop"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-stack"], []]]], []]]]]]]]]
  : ((shenjs_empty$question$(Arg4640_0))
  ? [shen_type_cons, [shen_type_symbol, "call"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-continuation"], [shen_type_cons, Arg4640_1, []]]]]
  : [shen_type_cons, [shen_type_symbol, "shen-rename"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-variables"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, Arg4640_0, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "call"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-continuation"], [shen_type_cons, Arg4640_1, []]]]], []]]]]]]]])))},
  2,
  [],
  "shen-cc_help"];
shenjs_functions["shen_shen-cc_help"] = shen_cc$_help;






shen_make$_mu$_application = [shen_type_func,
  function shen_user_lambda4643(Arg4642) {
  if (Arg4642.length < 2) return [shen_type_func, shen_user_lambda4643, 2, Arg4642];
  var Arg4642_0 = Arg4642[0], Arg4642_1 = Arg4642[1];
  return (((shenjs_is_type(Arg4642_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4642_0[1])) && (shenjs_is_type(Arg4642_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4642_0[2][1]) && (shenjs_is_type(Arg4642_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4642_0[2][2][2]) && shenjs_empty$question$(Arg4642_1))))))))
  ? Arg4642_0[2][2][1]
  : (((shenjs_is_type(Arg4642_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4642_0[1])) && (shenjs_is_type(Arg4642_0[2], shen_type_cons) && (shenjs_is_type(Arg4642_0[2][1], shen_type_cons) && (shenjs_is_type(Arg4642_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4642_0[2][2][2]) && shenjs_is_type(Arg4642_1, shen_type_cons))))))))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4642_0[2][1][1], [shen_type_cons, shenjs_call(shen_make$_mu$_application, [[shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4642_0[2][1][2], Arg4642_0[2][2]]], Arg4642_1[2]]), []]]], [shen_type_cons, Arg4642_1[1], []]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-make_mu_application"]]);})))},
  2,
  [],
  "shen-make_mu_application"];
shenjs_functions["shen_shen-make_mu_application"] = shen_make$_mu$_application;






shen_mu$_reduction = [shen_type_func,
  function shen_user_lambda4645(Arg4644) {
  if (Arg4644.length < 2) return [shen_type_func, shen_user_lambda4645, 2, Arg4644];
  var Arg4644_0 = Arg4644[0], Arg4644_1 = Arg4644[1];
  var R0;
  return (((shenjs_is_type(Arg4644_0, shen_type_cons) && (shenjs_is_type(Arg4644_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4644_0[1][1])) && (shenjs_is_type(Arg4644_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4644_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4644_0[1][2][1][1])) && (shenjs_is_type(Arg4644_0[1][2][1][2], shen_type_cons) && (shenjs_is_type(Arg4644_0[1][2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4644_0[1][2][1][2][2][2]) && (shenjs_is_type(Arg4644_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4644_0[1][2][2][2]) && (shenjs_is_type(Arg4644_0[2], shen_type_cons) && shenjs_empty$question$(Arg4644_0[2][2]))))))))))))))
  ? (function() {
  return shenjs_call_tail(shen_mu$_reduction, [[shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4644_0[1][2][1][2][1], Arg4644_0[1][2][2]]], Arg4644_0[2]], Arg4644_0[1][2][1][2][2][1]]);})
  : (((shenjs_is_type(Arg4644_0, shen_type_cons) && (shenjs_is_type(Arg4644_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4644_0[1][1])) && (shenjs_is_type(Arg4644_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4644_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4644_0[1][2][2][2]) && (shenjs_is_type(Arg4644_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4644_0[2][2]) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "_"], Arg4644_0[1][2][1])))))))))))
  ? (function() {
  return shenjs_call_tail(shen_mu$_reduction, [Arg4644_0[1][2][2][1], Arg4644_1]);})
  : (((shenjs_is_type(Arg4644_0, shen_type_cons) && (shenjs_is_type(Arg4644_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4644_0[1][1])) && (shenjs_is_type(Arg4644_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4644_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4644_0[1][2][2][2]) && (shenjs_is_type(Arg4644_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4644_0[2][2]) && shenjs_call(shen_ephemeral$_variable$question$, [Arg4644_0[1][2][1], Arg4644_0[2][1]]))))))))))
  ? (function() {
  return shenjs_call_tail(shen_subst, [Arg4644_0[2][1], Arg4644_0[1][2][1], shenjs_call(shen_mu$_reduction, [Arg4644_0[1][2][2][1], Arg4644_1])]);})
  : (((shenjs_is_type(Arg4644_0, shen_type_cons) && (shenjs_is_type(Arg4644_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4644_0[1][1])) && (shenjs_is_type(Arg4644_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4644_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4644_0[1][2][2][2]) && (shenjs_is_type(Arg4644_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4644_0[2][2]) && shenjs_call(shen_variable$question$, [Arg4644_0[1][2][1]]))))))))))
  ? [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, Arg4644_0[1][2][1], [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, Arg4644_0[2][1], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg4644_0[1][2][2][1], Arg4644_1]), []]]]]]]
  : (((shenjs_is_type(Arg4644_0, shen_type_cons) && (shenjs_is_type(Arg4644_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4644_0[1][1])) && (shenjs_is_type(Arg4644_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4644_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4644_0[1][2][2][2]) && (shenjs_is_type(Arg4644_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4644_0[2][2]) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4644_1)) && shenjs_call(shen_prolog$_constant$question$, [Arg4644_0[1][2][1]])))))))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-result"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, [shen_type_symbol, "shen-dereferencing"], Arg4644_0[2]]]]], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "identical"], [shen_type_cons, [shen_type_symbol, "shen-to"], [shen_type_cons, Arg4644_0[1][2][1], []]]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg4644_0[1][2][2][1], [shen_type_symbol, "-"]]), [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, shen_fail_obj, []]]]]]], []]]]]]])
  : (((shenjs_is_type(Arg4644_0, shen_type_cons) && (shenjs_is_type(Arg4644_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4644_0[1][1])) && (shenjs_is_type(Arg4644_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4644_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4644_0[1][2][2][2]) && (shenjs_is_type(Arg4644_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4644_0[2][2]) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4644_1)) && shenjs_call(shen_prolog$_constant$question$, [Arg4644_0[1][2][1]])))))))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-result"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, [shen_type_symbol, "shen-dereferencing"], Arg4644_0[2]]]]], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "identical"], [shen_type_cons, [shen_type_symbol, "shen-to"], [shen_type_cons, Arg4644_0[1][2][1], []]]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg4644_0[1][2][2][1], [shen_type_symbol, "+"]]), [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "shen-a"], [shen_type_cons, [shen_type_symbol, "shen-variable"], []]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-to"], [shen_type_cons, Arg4644_0[1][2][1], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg4644_0[1][2][2][1], [shen_type_symbol, "+"]]), []]]]]]], [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, shen_fail_obj, []]]]]]], []]]]]]], []]]]]]])
  : (((shenjs_is_type(Arg4644_0, shen_type_cons) && (shenjs_is_type(Arg4644_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4644_0[1][1])) && (shenjs_is_type(Arg4644_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4644_0[1][2][1], shen_type_cons) && (shenjs_is_type(Arg4644_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4644_0[1][2][2][2]) && (shenjs_is_type(Arg4644_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4644_0[2][2]) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4644_1))))))))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-result"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, [shen_type_symbol, "shen-dereferencing"], Arg4644_0[2]]]]], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "shen-a"], [shen_type_cons, [shen_type_symbol, "shen-non-empty"], [shen_type_cons, [shen_type_symbol, "list"], []]]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [[shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4644_0[1][2][1][1], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4644_0[1][2][1][2], Arg4644_0[1][2][2]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "tail"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, R0, []]]]], []]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "head"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, R0, []]]]], []]], [shen_type_symbol, "-"]]), [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, shen_fail_obj, []]]]]]], []]]]]]])
  : (((shenjs_is_type(Arg4644_0, shen_type_cons) && (shenjs_is_type(Arg4644_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4644_0[1][1])) && (shenjs_is_type(Arg4644_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4644_0[1][2][1], shen_type_cons) && (shenjs_is_type(Arg4644_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4644_0[1][2][2][2]) && (shenjs_is_type(Arg4644_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4644_0[2][2]) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4644_1))))))))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-result"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, [shen_type_symbol, "shen-dereferencing"], Arg4644_0[2]]]]], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "shen-a"], [shen_type_cons, [shen_type_symbol, "shen-non-empty"], [shen_type_cons, [shen_type_symbol, "list"], []]]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [[shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4644_0[1][2][1][1], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4644_0[1][2][1][2], Arg4644_0[1][2][2]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "tail"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, R0, []]]]], []]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "head"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, R0, []]]]], []]], [shen_type_symbol, "+"]]), [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "shen-a"], [shen_type_cons, [shen_type_symbol, "shen-variable"], []]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-rename"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-variables"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, shenjs_call(shen_extract$_vars, [Arg4644_0[1][2][1]]), [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-to"], [shen_type_cons, shenjs_call(shen_rcons$_form, [shenjs_call(shen_remove$_modes, [Arg4644_0[1][2][1]])]), [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg4644_0[1][2][2][1], [shen_type_symbol, "+"]]), []]]]]]], []]]]]]]]], [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, shen_fail_obj, []]]]]]], []]]]]]], []]]]]]])
  : Arg4644_0))))))))},
  2,
  [],
  "shen-mu_reduction"];
shenjs_functions["shen_shen-mu_reduction"] = shen_mu$_reduction;






shen_rcons$_form = [shen_type_func,
  function shen_user_lambda4647(Arg4646) {
  if (Arg4646.length < 1) return [shen_type_func, shen_user_lambda4647, 1, Arg4646];
  var Arg4646_0 = Arg4646[0];
  return ((shenjs_is_type(Arg4646_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg4646_0[1]]), [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg4646_0[2]]), []]]]
  : Arg4646_0)},
  1,
  [],
  "shen-rcons_form"];
shenjs_functions["shen_shen-rcons_form"] = shen_rcons$_form;






shen_remove$_modes = [shen_type_func,
  function shen_user_lambda4649(Arg4648) {
  if (Arg4648.length < 1) return [shen_type_func, shen_user_lambda4649, 1, Arg4648];
  var Arg4648_0 = Arg4648[0];
  return (((shenjs_is_type(Arg4648_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4648_0[1])) && (shenjs_is_type(Arg4648_0[2], shen_type_cons) && (shenjs_is_type(Arg4648_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4648_0[2][2][1])) && shenjs_empty$question$(Arg4648_0[2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(shen_remove$_modes, [Arg4648_0[2][1]]);})
  : (((shenjs_is_type(Arg4648_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4648_0[1])) && (shenjs_is_type(Arg4648_0[2], shen_type_cons) && (shenjs_is_type(Arg4648_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4648_0[2][2][1])) && shenjs_empty$question$(Arg4648_0[2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(shen_remove$_modes, [Arg4648_0[2][1]]);})
  : ((shenjs_is_type(Arg4648_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_remove$_modes, [Arg4648_0[1]]), shenjs_call(shen_remove$_modes, [Arg4648_0[2]])]
  : Arg4648_0)))},
  1,
  [],
  "shen-remove_modes"];
shenjs_functions["shen_shen-remove_modes"] = shen_remove$_modes;






shen_ephemeral$_variable$question$ = [shen_type_func,
  function shen_user_lambda4651(Arg4650) {
  if (Arg4650.length < 2) return [shen_type_func, shen_user_lambda4651, 2, Arg4650];
  var Arg4650_0 = Arg4650[0], Arg4650_1 = Arg4650[1];
  return (shenjs_call(shen_variable$question$, [Arg4650_0]) && shenjs_call(shen_variable$question$, [Arg4650_1]))},
  2,
  [],
  "shen-ephemeral_variable?"];
shenjs_functions["shen_shen-ephemeral_variable?"] = shen_ephemeral$_variable$question$;






shen_prolog$_constant$question$ = [shen_type_func,
  function shen_user_lambda4653(Arg4652) {
  if (Arg4652.length < 1) return [shen_type_func, shen_user_lambda4653, 1, Arg4652];
  var Arg4652_0 = Arg4652[0];
  return ((shenjs_is_type(Arg4652_0, shen_type_cons))
  ? false
  : true)},
  1,
  [],
  "shen-prolog_constant?"];
shenjs_functions["shen_shen-prolog_constant?"] = shen_prolog$_constant$question$;






shen_aum$_to$_shen = [shen_type_func,
  function shen_user_lambda4655(Arg4654) {
  if (Arg4654.length < 1) return [shen_type_func, shen_user_lambda4655, 1, Arg4654];
  var Arg4654_0 = Arg4654[0];
  return (((shenjs_is_type(Arg4654_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg4654_0[1])) && (shenjs_is_type(Arg4654_0[2], shen_type_cons) && (shenjs_is_type(Arg4654_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-be"], Arg4654_0[2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2], shen_type_cons) && (shenjs_is_type(Arg4654_0[2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "in"], Arg4654_0[2][2][2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4654_0[2][2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, Arg4654_0[2][1], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4654_0[2][2][2][1]]), [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4654_0[2][2][2][2][2][1]]), []]]]]
  : (((shenjs_is_type(Arg4654_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4654_0[1])) && (shenjs_is_type(Arg4654_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-result"], Arg4654_0[2][1])) && (shenjs_is_type(Arg4654_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-of"], Arg4654_0[2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-dereferencing"], Arg4654_0[2][2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4654_0[2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "shen-lazyderef"], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4654_0[2][2][2][2][1]]), [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]]
  : (((shenjs_is_type(Arg4654_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "if"], Arg4654_0[1])) && (shenjs_is_type(Arg4654_0[2], shen_type_cons) && (shenjs_is_type(Arg4654_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-then"], Arg4654_0[2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2], shen_type_cons) && (shenjs_is_type(Arg4654_0[2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-else"], Arg4654_0[2][2][2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4654_0[2][2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4654_0[2][1]]), [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4654_0[2][2][2][1]]), [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4654_0[2][2][2][2][2][1]]), []]]]]
  : (((shenjs_is_type(Arg4654_0, shen_type_cons) && (shenjs_is_type(Arg4654_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "is"], Arg4654_0[2][1])) && (shenjs_is_type(Arg4654_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-a"], Arg4654_0[2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-variable"], Arg4654_0[2][2][2][1])) && shenjs_empty$question$(Arg4654_0[2][2][2][2])))))))))
  ? [shen_type_cons, [shen_type_symbol, "shen-pvar?"], [shen_type_cons, Arg4654_0[1], []]]
  : (((shenjs_is_type(Arg4654_0, shen_type_cons) && (shenjs_is_type(Arg4654_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "is"], Arg4654_0[2][1])) && (shenjs_is_type(Arg4654_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-a"], Arg4654_0[2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-non-empty"], Arg4654_0[2][2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "list"], Arg4654_0[2][2][2][2][1])) && shenjs_empty$question$(Arg4654_0[2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, Arg4654_0[1], []]]
  : (((shenjs_is_type(Arg4654_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-rename"], Arg4654_0[1])) && (shenjs_is_type(Arg4654_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4654_0[2][1])) && (shenjs_is_type(Arg4654_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-variables"], Arg4654_0[2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "in"], Arg4654_0[2][2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4654_0[2][2][2][2][1]) && (shenjs_is_type(Arg4654_0[2][2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "and"], Arg4654_0[2][2][2][2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-then"], Arg4654_0[2][2][2][2][2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4654_0[2][2][2][2][2][2][2][2])))))))))))))))))
  ? (function() {
  return shenjs_call_tail(shen_aum$_to$_shen, [Arg4654_0[2][2][2][2][2][2][2][1]]);})
  : (((shenjs_is_type(Arg4654_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-rename"], Arg4654_0[1])) && (shenjs_is_type(Arg4654_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4654_0[2][1])) && (shenjs_is_type(Arg4654_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-variables"], Arg4654_0[2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "in"], Arg4654_0[2][2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2][2], shen_type_cons) && (shenjs_is_type(Arg4654_0[2][2][2][2][1], shen_type_cons) && (shenjs_is_type(Arg4654_0[2][2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "and"], Arg4654_0[2][2][2][2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-then"], Arg4654_0[2][2][2][2][2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4654_0[2][2][2][2][2][2][2][2])))))))))))))))))
  ? [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, Arg4654_0[2][2][2][2][1][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-newpv"], [shen_type_cons, [shen_type_symbol, "ProcessN"], []]], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [[shen_type_cons, [shen_type_symbol, "shen-rename"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-variables"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, Arg4654_0[2][2][2][2][1][2], Arg4654_0[2][2][2][2][2]]]]]]]), []]]]]
  : (((shenjs_is_type(Arg4654_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "bind"], Arg4654_0[1])) && (shenjs_is_type(Arg4654_0[2], shen_type_cons) && (shenjs_is_type(Arg4654_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-to"], Arg4654_0[2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2], shen_type_cons) && (shenjs_is_type(Arg4654_0[2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "in"], Arg4654_0[2][2][2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4654_0[2][2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-bindv"], [shen_type_cons, Arg4654_0[2][1], [shen_type_cons, shenjs_call(shen_chwild, [Arg4654_0[2][2][2][1]]), [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4654_0[2][2][2][2][2][1]]), [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-unbindv"], [shen_type_cons, Arg4654_0[2][1], [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]], [shen_type_cons, [shen_type_symbol, "Result"], []]]], []]]]], []]]]
  : (((shenjs_is_type(Arg4654_0, shen_type_cons) && (shenjs_is_type(Arg4654_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "is"], Arg4654_0[2][1])) && (shenjs_is_type(Arg4654_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "identical"], Arg4654_0[2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-to"], Arg4654_0[2][2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4654_0[2][2][2][2][2]))))))))))
  ? [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, Arg4654_0[2][2][2][2][1], [shen_type_cons, Arg4654_0[1], []]]]
  : ((shenjs_unwind_tail(shenjs_$eq$(Arg4654_0, shen_fail_obj)))
  ? false
  : (((shenjs_is_type(Arg4654_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4654_0[1])) && (shenjs_is_type(Arg4654_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "head"], Arg4654_0[2][1])) && (shenjs_is_type(Arg4654_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-of"], Arg4654_0[2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4654_0[2][2][2][2])))))))))
  ? [shen_type_cons, [shen_type_symbol, "hd"], Arg4654_0[2][2][2]]
  : (((shenjs_is_type(Arg4654_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4654_0[1])) && (shenjs_is_type(Arg4654_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "tail"], Arg4654_0[2][1])) && (shenjs_is_type(Arg4654_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-of"], Arg4654_0[2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4654_0[2][2][2][2])))))))))
  ? [shen_type_cons, [shen_type_symbol, "tl"], Arg4654_0[2][2][2]]
  : (((shenjs_is_type(Arg4654_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-pop"], Arg4654_0[1])) && (shenjs_is_type(Arg4654_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4654_0[2][1])) && (shenjs_is_type(Arg4654_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-stack"], Arg4654_0[2][2][1])) && shenjs_empty$question$(Arg4654_0[2][2][2]))))))))
  ? [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-incinfs"], []], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, [shen_type_symbol, "Continuation"], []]], []]]]
  : (((shenjs_is_type(Arg4654_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "call"], Arg4654_0[1])) && (shenjs_is_type(Arg4654_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4654_0[2][1])) && (shenjs_is_type(Arg4654_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-continuation"], Arg4654_0[2][2][1])) && (shenjs_is_type(Arg4654_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4654_0[2][2][2][2])))))))))
  ? [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-incinfs"], []], [shen_type_cons, shenjs_call(shen_call$_the$_continuation, [shenjs_call(shen_chwild, [Arg4654_0[2][2][2][1]]), [shen_type_symbol, "ProcessN"], [shen_type_symbol, "Continuation"]]), []]]]
  : Arg4654_0))))))))))))))},
  1,
  [],
  "shen-aum_to_shen"];
shenjs_functions["shen_shen-aum_to_shen"] = shen_aum$_to$_shen;






shen_chwild = [shen_type_func,
  function shen_user_lambda4657(Arg4656) {
  if (Arg4656.length < 1) return [shen_type_func, shen_user_lambda4657, 1, Arg4656];
  var Arg4656_0 = Arg4656[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4656_0, [shen_type_symbol, "_"])))
  ? [shen_type_cons, [shen_type_symbol, "shen-newpv"], [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]
  : ((shenjs_is_type(Arg4656_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda4659(Arg4658) {
  if (Arg4658.length < 1) return [shen_type_func, shen_user_lambda4659, 1, Arg4658];
  var Arg4658_0 = Arg4658[0];
  return (function() {
  return shenjs_call_tail(shen_chwild, [Arg4658_0]);})},
  1,
  []], Arg4656_0]);})
  : Arg4656_0))},
  1,
  [],
  "shen-chwild"];
shenjs_functions["shen_shen-chwild"] = shen_chwild;






shen_newpv = [shen_type_func,
  function shen_user_lambda4661(Arg4660) {
  if (Arg4660.length < 1) return [shen_type_func, shen_user_lambda4661, 1, Arg4660];
  var Arg4660_0 = Arg4660[0];
  var R0, R1;
  return ((R0 = (shenjs_absvector_ref((shenjs_globals["shen_shen-*varcounter*"]), Arg4660_0) + 1)),
  shenjs_absvector_set((shenjs_globals["shen_shen-*varcounter*"]), Arg4660_0, R0),
  (R1 = shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg4660_0)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shenjs_call(shen_limit, [R1]))))
  ? shenjs_call(shen_resizeprocessvector, [Arg4660_0, R0])
  : [shen_type_symbol, "shen-skip"]),
  (function() {
  return shenjs_call_tail(shen_mk_pvar, [R0]);}))},
  1,
  [],
  "shen-newpv"];
shenjs_functions["shen_shen-newpv"] = shen_newpv;






shen_resizeprocessvector = [shen_type_func,
  function shen_user_lambda4663(Arg4662) {
  if (Arg4662.length < 2) return [shen_type_func, shen_user_lambda4663, 2, Arg4662];
  var Arg4662_0 = Arg4662[0], Arg4662_1 = Arg4662[1];
  var R0;
  return ((R0 = shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg4662_0)),
  (R0 = shenjs_call(shen_resize_vector, [R0, (Arg4662_1 + Arg4662_1), [shen_type_symbol, "shen--null-"]])),
  shenjs_absvector_set((shenjs_globals["shen_shen-*prologvectors*"]), Arg4662_0, R0))},
  2,
  [],
  "shen-resizeprocessvector"];
shenjs_functions["shen_shen-resizeprocessvector"] = shen_resizeprocessvector;






shen_resize_vector = [shen_type_func,
  function shen_user_lambda4665(Arg4664) {
  if (Arg4664.length < 3) return [shen_type_func, shen_user_lambda4665, 3, Arg4664];
  var Arg4664_0 = Arg4664[0], Arg4664_1 = Arg4664[1], Arg4664_2 = Arg4664[2];
  var R0;
  return ((R0 = shenjs_absvector_set(shenjs_absvector((1 + Arg4664_1)), 0, Arg4664_1)),
  (function() {
  return shenjs_call_tail(shen_copy_vector, [Arg4664_0, R0, shenjs_call(shen_limit, [Arg4664_0]), Arg4664_1, Arg4664_2]);}))},
  3,
  [],
  "shen-resize-vector"];
shenjs_functions["shen_shen-resize-vector"] = shen_resize_vector;






shen_copy_vector = [shen_type_func,
  function shen_user_lambda4667(Arg4666) {
  if (Arg4666.length < 5) return [shen_type_func, shen_user_lambda4667, 5, Arg4666];
  var Arg4666_0 = Arg4666[0], Arg4666_1 = Arg4666[1], Arg4666_2 = Arg4666[2], Arg4666_3 = Arg4666[3], Arg4666_4 = Arg4666[4];
  return (function() {
  return shenjs_call_tail(shen_copy_vector_stage_2, [(1 + Arg4666_2), (Arg4666_3 + 1), Arg4666_4, shenjs_call(shen_copy_vector_stage_1, [1, Arg4666_0, Arg4666_1, (1 + Arg4666_2)])]);})},
  5,
  [],
  "shen-copy-vector"];
shenjs_functions["shen_shen-copy-vector"] = shen_copy_vector;






shen_copy_vector_stage_1 = [shen_type_func,
  function shen_user_lambda4669(Arg4668) {
  if (Arg4668.length < 4) return [shen_type_func, shen_user_lambda4669, 4, Arg4668];
  var Arg4668_0 = Arg4668[0], Arg4668_1 = Arg4668[1], Arg4668_2 = Arg4668[2], Arg4668_3 = Arg4668[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4668_3, Arg4668_0)))
  ? Arg4668_2
  : (function() {
  return shenjs_call_tail(shen_copy_vector_stage_1, [(1 + Arg4668_0), Arg4668_1, shenjs_absvector_set(Arg4668_2, Arg4668_0, shenjs_absvector_ref(Arg4668_1, Arg4668_0)), Arg4668_3]);}))},
  4,
  [],
  "shen-copy-vector-stage-1"];
shenjs_functions["shen_shen-copy-vector-stage-1"] = shen_copy_vector_stage_1;






shen_copy_vector_stage_2 = [shen_type_func,
  function shen_user_lambda4671(Arg4670) {
  if (Arg4670.length < 4) return [shen_type_func, shen_user_lambda4671, 4, Arg4670];
  var Arg4670_0 = Arg4670[0], Arg4670_1 = Arg4670[1], Arg4670_2 = Arg4670[2], Arg4670_3 = Arg4670[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4670_1, Arg4670_0)))
  ? Arg4670_3
  : (function() {
  return shenjs_call_tail(shen_copy_vector_stage_2, [(Arg4670_0 + 1), Arg4670_1, Arg4670_2, shenjs_absvector_set(Arg4670_3, Arg4670_0, Arg4670_2)]);}))},
  4,
  [],
  "shen-copy-vector-stage-2"];
shenjs_functions["shen_shen-copy-vector-stage-2"] = shen_copy_vector_stage_2;






shen_mk_pvar = [shen_type_func,
  function shen_user_lambda4673(Arg4672) {
  if (Arg4672.length < 1) return [shen_type_func, shen_user_lambda4673, 1, Arg4672];
  var Arg4672_0 = Arg4672[0];
  return shenjs_absvector_set(shenjs_absvector_set(shenjs_absvector(2), 0, [shen_type_symbol, "shen-pvar"]), 1, Arg4672_0)},
  1,
  [],
  "shen-mk-pvar"];
shenjs_functions["shen_shen-mk-pvar"] = shen_mk_pvar;






shen_pvar$question$ = [shen_type_func,
  function shen_user_lambda4675(Arg4674) {
  if (Arg4674.length < 1) return [shen_type_func, shen_user_lambda4675, 1, Arg4674];
  var Arg4674_0 = Arg4674[0];
  return (shenjs_absvector$question$(Arg4674_0) && shenjs_unwind_tail(shenjs_$eq$(shenjs_absvector_ref(Arg4674_0, 0), [shen_type_symbol, "shen-pvar"])))},
  1,
  [],
  "shen-pvar?"];
shenjs_functions["shen_shen-pvar?"] = shen_pvar$question$;






shen_bindv = [shen_type_func,
  function shen_user_lambda4677(Arg4676) {
  if (Arg4676.length < 3) return [shen_type_func, shen_user_lambda4677, 3, Arg4676];
  var Arg4676_0 = Arg4676[0], Arg4676_1 = Arg4676[1], Arg4676_2 = Arg4676[2];
  var R0;
  return ((R0 = shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg4676_2)),
  shenjs_absvector_set(R0, shenjs_absvector_ref(Arg4676_0, 1), Arg4676_1))},
  3,
  [],
  "shen-bindv"];
shenjs_functions["shen_shen-bindv"] = shen_bindv;






shen_unbindv = [shen_type_func,
  function shen_user_lambda4679(Arg4678) {
  if (Arg4678.length < 2) return [shen_type_func, shen_user_lambda4679, 2, Arg4678];
  var Arg4678_0 = Arg4678[0], Arg4678_1 = Arg4678[1];
  var R0;
  return ((R0 = shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg4678_1)),
  shenjs_absvector_set(R0, shenjs_absvector_ref(Arg4678_0, 1), [shen_type_symbol, "shen--null-"]))},
  2,
  [],
  "shen-unbindv"];
shenjs_functions["shen_shen-unbindv"] = shen_unbindv;






shen_incinfs = [shen_type_func,
  function shen_user_lambda4681(Arg4680) {
  if (Arg4680.length < 0) return [shen_type_func, shen_user_lambda4681, 0, Arg4680];
  return (shenjs_globals["shen_shen-*infs*"] = (1 + (shenjs_globals["shen_shen-*infs*"])))},
  0,
  [],
  "shen-incinfs"];
shenjs_functions["shen_shen-incinfs"] = shen_incinfs;






shen_call$_the$_continuation = [shen_type_func,
  function shen_user_lambda4683(Arg4682) {
  if (Arg4682.length < 3) return [shen_type_func, shen_user_lambda4683, 3, Arg4682];
  var Arg4682_0 = Arg4682[0], Arg4682_1 = Arg4682[1], Arg4682_2 = Arg4682[2];
  var R0;
  return (((shenjs_is_type(Arg4682_0, shen_type_cons) && (shenjs_is_type(Arg4682_0[1], shen_type_cons) && shenjs_empty$question$(Arg4682_0[2]))))
  ? [shen_type_cons, Arg4682_0[1][1], shenjs_call(shen_append, [Arg4682_0[1][2], [shen_type_cons, Arg4682_1, [shen_type_cons, Arg4682_2, []]]])]
  : (((shenjs_is_type(Arg4682_0, shen_type_cons) && shenjs_is_type(Arg4682_0[1], shen_type_cons)))
  ? ((R0 = shenjs_call(shen_newcontinuation, [Arg4682_0[2], Arg4682_1, Arg4682_2])),
  [shen_type_cons, Arg4682_0[1][1], shenjs_call(shen_append, [Arg4682_0[1][2], [shen_type_cons, Arg4682_1, [shen_type_cons, R0, []]]])])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-call_the_continuation"]]);})))},
  3,
  [],
  "shen-call_the_continuation"];
shenjs_functions["shen_shen-call_the_continuation"] = shen_call$_the$_continuation;






shen_newcontinuation = [shen_type_func,
  function shen_user_lambda4685(Arg4684) {
  if (Arg4684.length < 3) return [shen_type_func, shen_user_lambda4685, 3, Arg4684];
  var Arg4684_0 = Arg4684[0], Arg4684_1 = Arg4684[1], Arg4684_2 = Arg4684[2];
  return ((shenjs_empty$question$(Arg4684_0))
  ? Arg4684_2
  : (((shenjs_is_type(Arg4684_0, shen_type_cons) && shenjs_is_type(Arg4684_0[1], shen_type_cons)))
  ? [shen_type_cons, [shen_type_symbol, "freeze"], [shen_type_cons, [shen_type_cons, Arg4684_0[1][1], shenjs_call(shen_append, [Arg4684_0[1][2], [shen_type_cons, Arg4684_1, [shen_type_cons, shenjs_call(shen_newcontinuation, [Arg4684_0[2], Arg4684_1, Arg4684_2]), []]]])], []]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-newcontinuation"]]);})))},
  3,
  [],
  "shen-newcontinuation"];
shenjs_functions["shen_shen-newcontinuation"] = shen_newcontinuation;






shen_return = [shen_type_func,
  function shen_user_lambda4687(Arg4686) {
  if (Arg4686.length < 3) return [shen_type_func, shen_user_lambda4687, 3, Arg4686];
  var Arg4686_0 = Arg4686[0], Arg4686_1 = Arg4686[1], Arg4686_2 = Arg4686[2];
  return (function() {
  return shenjs_call_tail(shen_deref, [Arg4686_0, Arg4686_1]);})},
  3,
  [],
  "return"];
shenjs_functions["shen_return"] = shen_return;






shen_measure$amp$return = [shen_type_func,
  function shen_user_lambda4689(Arg4688) {
  if (Arg4688.length < 3) return [shen_type_func, shen_user_lambda4689, 3, Arg4688];
  var Arg4688_0 = Arg4688[0], Arg4688_1 = Arg4688[1], Arg4688_2 = Arg4688[2];
  return (shenjs_call(shen_intoutput, ["~A inferences~%", [shen_tuple, (shenjs_globals["shen_shen-*infs*"]), []]]),
  (function() {
  return shenjs_call_tail(shen_deref, [Arg4688_0, Arg4688_1]);}))},
  3,
  [],
  "shen-measure&return"];
shenjs_functions["shen_shen-measure&return"] = shen_measure$amp$return;






shen_unify = [shen_type_func,
  function shen_user_lambda4691(Arg4690) {
  if (Arg4690.length < 4) return [shen_type_func, shen_user_lambda4691, 4, Arg4690];
  var Arg4690_0 = Arg4690[0], Arg4690_1 = Arg4690[1], Arg4690_2 = Arg4690[2], Arg4690_3 = Arg4690[3];
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$, [shenjs_call(shen_lazyderef, [Arg4690_0, Arg4690_2]), shenjs_call(shen_lazyderef, [Arg4690_1, Arg4690_2]), Arg4690_2, Arg4690_3]);})},
  4,
  [],
  "unify"];
shenjs_functions["shen_unify"] = shen_unify;






shen_lzy$eq$ = [shen_type_func,
  function shen_user_lambda4693(Arg4692) {
  if (Arg4692.length < 4) return [shen_type_func, shen_user_lambda4693, 4, Arg4692];
  var Arg4692_0 = Arg4692[0], Arg4692_1 = Arg4692[1], Arg4692_2 = Arg4692[2], Arg4692_3 = Arg4692[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4692_1, Arg4692_0)))
  ? shenjs_thaw(Arg4692_3)
  : ((shenjs_call(shen_pvar$question$, [Arg4692_0]))
  ? (function() {
  return shenjs_call_tail(shen_bind, [Arg4692_0, Arg4692_1, Arg4692_2, Arg4692_3]);})
  : ((shenjs_call(shen_pvar$question$, [Arg4692_1]))
  ? (function() {
  return shenjs_call_tail(shen_bind, [Arg4692_1, Arg4692_0, Arg4692_2, Arg4692_3]);})
  : (((shenjs_is_type(Arg4692_0, shen_type_cons) && shenjs_is_type(Arg4692_1, shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(shen_lzy$eq$, [shenjs_call(shen_lazyderef, [Arg4692_0[1], Arg4692_2]), shenjs_call(shen_lazyderef, [Arg4692_1[1], Arg4692_2]), Arg4692_2, (new Shenjs_freeze([Arg4692_0, Arg4692_1, Arg4692_2, Arg4692_3], function(Arg4694) {
  var Arg4694_0 = Arg4694[0], Arg4694_1 = Arg4694[1], Arg4694_2 = Arg4694[2], Arg4694_3 = Arg4694[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$, [shenjs_call(shen_lazyderef, [Arg4694_0[2], Arg4694_2]), shenjs_call(shen_lazyderef, [Arg4694_1[2], Arg4694_2]), Arg4694_2, Arg4694_3]);});})}))]);})
  : false))))},
  4,
  [],
  "shen-lzy="];
shenjs_functions["shen_shen-lzy="] = shen_lzy$eq$;






shen_deref = [shen_type_func,
  function shen_user_lambda4697(Arg4696) {
  if (Arg4696.length < 2) return [shen_type_func, shen_user_lambda4697, 2, Arg4696];
  var Arg4696_0 = Arg4696[0], Arg4696_1 = Arg4696[1];
  var R0;
  return ((shenjs_is_type(Arg4696_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_deref, [Arg4696_0[1], Arg4696_1]), shenjs_call(shen_deref, [Arg4696_0[2], Arg4696_1])]
  : ((shenjs_call(shen_pvar$question$, [Arg4696_0]))
  ? ((R0 = shenjs_call(shen_valvector, [Arg4696_0, Arg4696_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, [shen_type_symbol, "shen--null-"])))
  ? Arg4696_0
  : (function() {
  return shenjs_call_tail(shen_deref, [R0, Arg4696_1]);})))
  : Arg4696_0))},
  2,
  [],
  "shen-deref"];
shenjs_functions["shen_shen-deref"] = shen_deref;






shen_lazyderef = [shen_type_func,
  function shen_user_lambda4699(Arg4698) {
  if (Arg4698.length < 2) return [shen_type_func, shen_user_lambda4699, 2, Arg4698];
  var Arg4698_0 = Arg4698[0], Arg4698_1 = Arg4698[1];
  var R0;
  return ((shenjs_call(shen_pvar$question$, [Arg4698_0]))
  ? ((R0 = shenjs_call(shen_valvector, [Arg4698_0, Arg4698_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, [shen_type_symbol, "shen--null-"])))
  ? Arg4698_0
  : (function() {
  return shenjs_call_tail(shen_lazyderef, [R0, Arg4698_1]);})))
  : Arg4698_0)},
  2,
  [],
  "shen-lazyderef"];
shenjs_functions["shen_shen-lazyderef"] = shen_lazyderef;






shen_valvector = [shen_type_func,
  function shen_user_lambda4701(Arg4700) {
  if (Arg4700.length < 2) return [shen_type_func, shen_user_lambda4701, 2, Arg4700];
  var Arg4700_0 = Arg4700[0], Arg4700_1 = Arg4700[1];
  return shenjs_absvector_ref(shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg4700_1), shenjs_absvector_ref(Arg4700_0, 1))},
  2,
  [],
  "shen-valvector"];
shenjs_functions["shen_shen-valvector"] = shen_valvector;






shen_unify$excl$ = [shen_type_func,
  function shen_user_lambda4703(Arg4702) {
  if (Arg4702.length < 4) return [shen_type_func, shen_user_lambda4703, 4, Arg4702];
  var Arg4702_0 = Arg4702[0], Arg4702_1 = Arg4702[1], Arg4702_2 = Arg4702[2], Arg4702_3 = Arg4702[3];
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$$excl$, [shenjs_call(shen_lazyderef, [Arg4702_0, Arg4702_2]), shenjs_call(shen_lazyderef, [Arg4702_1, Arg4702_2]), Arg4702_2, Arg4702_3]);})},
  4,
  [],
  "unify!"];
shenjs_functions["shen_unify!"] = shen_unify$excl$;






shen_lzy$eq$$excl$ = [shen_type_func,
  function shen_user_lambda4705(Arg4704) {
  if (Arg4704.length < 4) return [shen_type_func, shen_user_lambda4705, 4, Arg4704];
  var Arg4704_0 = Arg4704[0], Arg4704_1 = Arg4704[1], Arg4704_2 = Arg4704[2], Arg4704_3 = Arg4704[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4704_1, Arg4704_0)))
  ? shenjs_thaw(Arg4704_3)
  : (((shenjs_call(shen_pvar$question$, [Arg4704_0]) && (!shenjs_call(shen_occurs$question$, [Arg4704_0, shenjs_call(shen_deref, [Arg4704_1, Arg4704_2])]))))
  ? (function() {
  return shenjs_call_tail(shen_bind, [Arg4704_0, Arg4704_1, Arg4704_2, Arg4704_3]);})
  : (((shenjs_call(shen_pvar$question$, [Arg4704_1]) && (!shenjs_call(shen_occurs$question$, [Arg4704_1, shenjs_call(shen_deref, [Arg4704_0, Arg4704_2])]))))
  ? (function() {
  return shenjs_call_tail(shen_bind, [Arg4704_1, Arg4704_0, Arg4704_2, Arg4704_3]);})
  : (((shenjs_is_type(Arg4704_0, shen_type_cons) && shenjs_is_type(Arg4704_1, shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(shen_lzy$eq$$excl$, [shenjs_call(shen_lazyderef, [Arg4704_0[1], Arg4704_2]), shenjs_call(shen_lazyderef, [Arg4704_1[1], Arg4704_2]), Arg4704_2, (new Shenjs_freeze([Arg4704_0, Arg4704_1, Arg4704_2, Arg4704_3], function(Arg4706) {
  var Arg4706_0 = Arg4706[0], Arg4706_1 = Arg4706[1], Arg4706_2 = Arg4706[2], Arg4706_3 = Arg4706[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$$excl$, [shenjs_call(shen_lazyderef, [Arg4706_0[2], Arg4706_2]), shenjs_call(shen_lazyderef, [Arg4706_1[2], Arg4706_2]), Arg4706_2, Arg4706_3]);});})}))]);})
  : false))))},
  4,
  [],
  "shen-lzy=!"];
shenjs_functions["shen_shen-lzy=!"] = shen_lzy$eq$$excl$;






shen_occurs$question$ = [shen_type_func,
  function shen_user_lambda4709(Arg4708) {
  if (Arg4708.length < 2) return [shen_type_func, shen_user_lambda4709, 2, Arg4708];
  var Arg4708_0 = Arg4708[0], Arg4708_1 = Arg4708[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4708_1, Arg4708_0)))
  ? true
  : ((shenjs_is_type(Arg4708_1, shen_type_cons))
  ? (shenjs_call(shen_occurs$question$, [Arg4708_0, Arg4708_1[1]]) || shenjs_call(shen_occurs$question$, [Arg4708_0, Arg4708_1[2]]))
  : false))},
  2,
  [],
  "shen-occurs?"];
shenjs_functions["shen_shen-occurs?"] = shen_occurs$question$;






shen_identical = [shen_type_func,
  function shen_user_lambda4711(Arg4710) {
  if (Arg4710.length < 4) return [shen_type_func, shen_user_lambda4711, 4, Arg4710];
  var Arg4710_0 = Arg4710[0], Arg4710_1 = Arg4710[1], Arg4710_2 = Arg4710[2], Arg4710_3 = Arg4710[3];
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$$eq$, [shenjs_call(shen_lazyderef, [Arg4710_0, Arg4710_2]), shenjs_call(shen_lazyderef, [Arg4710_1, Arg4710_2]), Arg4710_2, Arg4710_3]);})},
  4,
  [],
  "identical"];
shenjs_functions["shen_identical"] = shen_identical;






shen_lzy$eq$$eq$ = [shen_type_func,
  function shen_user_lambda4713(Arg4712) {
  if (Arg4712.length < 4) return [shen_type_func, shen_user_lambda4713, 4, Arg4712];
  var Arg4712_0 = Arg4712[0], Arg4712_1 = Arg4712[1], Arg4712_2 = Arg4712[2], Arg4712_3 = Arg4712[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4712_1, Arg4712_0)))
  ? shenjs_thaw(Arg4712_3)
  : (((shenjs_is_type(Arg4712_0, shen_type_cons) && shenjs_is_type(Arg4712_1, shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(shen_lzy$eq$$eq$, [shenjs_call(shen_lazyderef, [Arg4712_0[1], Arg4712_2]), shenjs_call(shen_lazyderef, [Arg4712_1[1], Arg4712_2]), Arg4712_2, (new Shenjs_freeze([Arg4712_0, Arg4712_1, Arg4712_2, Arg4712_3], function(Arg4714) {
  var Arg4714_0 = Arg4714[0], Arg4714_1 = Arg4714[1], Arg4714_2 = Arg4714[2], Arg4714_3 = Arg4714[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$$eq$, [Arg4714_0[2], Arg4714_1[2], Arg4714_2, Arg4714_3]);});})}))]);})
  : false))},
  4,
  [],
  "shen-lzy=="];
shenjs_functions["shen_shen-lzy=="] = shen_lzy$eq$$eq$;






shen_pvar = [shen_type_func,
  function shen_user_lambda4717(Arg4716) {
  if (Arg4716.length < 1) return [shen_type_func, shen_user_lambda4717, 1, Arg4716];
  var Arg4716_0 = Arg4716[0];
  return (function() {
  return shenjs_call_tail(shen_intmake_string, ["Var~A", [shen_tuple, shenjs_absvector_ref(Arg4716_0, 1), []]]);})},
  1,
  [],
  "shen-pvar"];
shenjs_functions["shen_shen-pvar"] = shen_pvar;






shen_bind = [shen_type_func,
  function shen_user_lambda4719(Arg4718) {
  if (Arg4718.length < 4) return [shen_type_func, shen_user_lambda4719, 4, Arg4718];
  var Arg4718_0 = Arg4718[0], Arg4718_1 = Arg4718[1], Arg4718_2 = Arg4718[2], Arg4718_3 = Arg4718[3];
  var R0;
  return (shenjs_call(shen_bindv, [Arg4718_0, Arg4718_1, Arg4718_2]),
  (R0 = shenjs_unwind_tail(shenjs_thaw(Arg4718_3))),
  shenjs_call(shen_unbindv, [Arg4718_0, Arg4718_2]),
  R0)},
  4,
  [],
  "bind"];
shenjs_functions["shen_bind"] = shen_bind;






shen_fwhen = [shen_type_func,
  function shen_user_lambda4721(Arg4720) {
  if (Arg4720.length < 3) return [shen_type_func, shen_user_lambda4721, 3, Arg4720];
  var Arg4720_0 = Arg4720[0], Arg4720_1 = Arg4720[1], Arg4720_2 = Arg4720[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg4720_0)))
  ? shenjs_thaw(Arg4720_2)
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg4720_0)))
  ? false
  : (function() {
  return shenjs_call_tail(shen_interror, ["fwhen expects a boolean: not ~S%", [shen_tuple, Arg4720_0, []]]);})))},
  3,
  [],
  "fwhen"];
shenjs_functions["shen_fwhen"] = shen_fwhen;






shen_call = [shen_type_func,
  function shen_user_lambda4723(Arg4722) {
  if (Arg4722.length < 3) return [shen_type_func, shen_user_lambda4723, 3, Arg4722];
  var Arg4722_0 = Arg4722[0], Arg4722_1 = Arg4722[1], Arg4722_2 = Arg4722[2];
  return ((shenjs_is_type(Arg4722_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_call_help, [shenjs_call(shen_m$_prolog$_to$_s_prolog$_predicate, [shenjs_call(shen_lazyderef, [Arg4722_0[1], Arg4722_1])]), Arg4722_0[2], Arg4722_1, Arg4722_2]);})
  : false)},
  3,
  [],
  "call"];
shenjs_functions["shen_call"] = shen_call;






shen_call_help = [shen_type_func,
  function shen_user_lambda4725(Arg4724) {
  if (Arg4724.length < 4) return [shen_type_func, shen_user_lambda4725, 4, Arg4724];
  var Arg4724_0 = Arg4724[0], Arg4724_1 = Arg4724[1], Arg4724_2 = Arg4724[2], Arg4724_3 = Arg4724[3];
  return ((shenjs_empty$question$(Arg4724_1))
  ? (function() {
  return shenjs_call_tail(Arg4724_0, [Arg4724_2, Arg4724_3]);})
  : ((shenjs_is_type(Arg4724_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_call_help, [shenjs_call(Arg4724_0, [Arg4724_1[1]]), Arg4724_1[2], Arg4724_2, Arg4724_3]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-call-help"]]);})))},
  4,
  [],
  "shen-call-help"];
shenjs_functions["shen_shen-call-help"] = shen_call_help;






shen_intprolog = [shen_type_func,
  function shen_user_lambda4727(Arg4726) {
  if (Arg4726.length < 1) return [shen_type_func, shen_user_lambda4727, 1, Arg4726];
  var Arg4726_0 = Arg4726[0];
  var R0;
  return (((shenjs_is_type(Arg4726_0, shen_type_cons) && shenjs_is_type(Arg4726_0[1], shen_type_cons)))
  ? ((R0 = shenjs_call(shen_start_new_prolog_process, [])),
  (function() {
  return shenjs_call_tail(shen_intprolog_help, [Arg4726_0[1][1], shenjs_call(shen_insert_prolog_variables, [[shen_type_cons, Arg4726_0[1][2], [shen_type_cons, Arg4726_0[2], []]], R0]), R0]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-intprolog"]]);}))},
  1,
  [],
  "shen-intprolog"];
shenjs_functions["shen_shen-intprolog"] = shen_intprolog;






shen_intprolog_help = [shen_type_func,
  function shen_user_lambda4729(Arg4728) {
  if (Arg4728.length < 3) return [shen_type_func, shen_user_lambda4729, 3, Arg4728];
  var Arg4728_0 = Arg4728[0], Arg4728_1 = Arg4728[1], Arg4728_2 = Arg4728[2];
  return (((shenjs_is_type(Arg4728_1, shen_type_cons) && (shenjs_is_type(Arg4728_1[2], shen_type_cons) && shenjs_empty$question$(Arg4728_1[2][2]))))
  ? (function() {
  return shenjs_call_tail(shen_intprolog_help_help, [Arg4728_0, Arg4728_1[1], Arg4728_1[2][1], Arg4728_2]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-intprolog-help"]]);}))},
  3,
  [],
  "shen-intprolog-help"];
shenjs_functions["shen_shen-intprolog-help"] = shen_intprolog_help;






shen_intprolog_help_help = [shen_type_func,
  function shen_user_lambda4731(Arg4730) {
  if (Arg4730.length < 4) return [shen_type_func, shen_user_lambda4731, 4, Arg4730];
  var Arg4730_0 = Arg4730[0], Arg4730_1 = Arg4730[1], Arg4730_2 = Arg4730[2], Arg4730_3 = Arg4730[3];
  return ((shenjs_empty$question$(Arg4730_1))
  ? (function() {
  return shenjs_call_tail(Arg4730_0, [Arg4730_3, (new Shenjs_freeze([Arg4730_0, Arg4730_1, Arg4730_2, Arg4730_3], function(Arg4732) {
  var Arg4732_0 = Arg4732[0], Arg4732_1 = Arg4732[1], Arg4732_2 = Arg4732[2], Arg4732_3 = Arg4732[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_call_rest, [Arg4732_2, Arg4732_3]);});})}))]);})
  : ((shenjs_is_type(Arg4730_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_intprolog_help_help, [shenjs_call(Arg4730_0, [Arg4730_1[1]]), Arg4730_1[2], Arg4730_2, Arg4730_3]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-intprolog-help-help"]]);})))},
  4,
  [],
  "shen-intprolog-help-help"];
shenjs_functions["shen_shen-intprolog-help-help"] = shen_intprolog_help_help;






shen_call_rest = [shen_type_func,
  function shen_user_lambda4735(Arg4734) {
  if (Arg4734.length < 2) return [shen_type_func, shen_user_lambda4735, 2, Arg4734];
  var Arg4734_0 = Arg4734[0], Arg4734_1 = Arg4734[1];
  return ((shenjs_empty$question$(Arg4734_0))
  ? true
  : (((shenjs_is_type(Arg4734_0, shen_type_cons) && (shenjs_is_type(Arg4734_0[1], shen_type_cons) && shenjs_is_type(Arg4734_0[1][2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_call_rest, [[shen_type_cons, [shen_type_cons, shenjs_call(Arg4734_0[1][1], [Arg4734_0[1][2][1]]), Arg4734_0[1][2][2]], Arg4734_0[2]], Arg4734_1]);})
  : (((shenjs_is_type(Arg4734_0, shen_type_cons) && (shenjs_is_type(Arg4734_0[1], shen_type_cons) && shenjs_empty$question$(Arg4734_0[1][2]))))
  ? (function() {
  return shenjs_call_tail(Arg4734_0[1][1], [Arg4734_1, (new Shenjs_freeze([Arg4734_0, Arg4734_1], function(Arg4736) {
  var Arg4736_0 = Arg4736[0], Arg4736_1 = Arg4736[1];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_call_rest, [Arg4736_0[2], Arg4736_1]);});})}))]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-call-rest"]]);}))))},
  2,
  [],
  "shen-call-rest"];
shenjs_functions["shen_shen-call-rest"] = shen_call_rest;






shen_start_new_prolog_process = [shen_type_func,
  function shen_user_lambda4739(Arg4738) {
  if (Arg4738.length < 0) return [shen_type_func, shen_user_lambda4739, 0, Arg4738];
  var R0;
  return ((R0 = (shenjs_globals["shen_shen-*process-counter*"] = (1 + (shenjs_globals["shen_shen-*process-counter*"])))),
  (function() {
  return shenjs_call_tail(shen_initialise_prolog, [R0]);}))},
  0,
  [],
  "shen-start-new-prolog-process"];
shenjs_functions["shen_shen-start-new-prolog-process"] = shen_start_new_prolog_process;






shen_insert_prolog_variables = [shen_type_func,
  function shen_user_lambda4741(Arg4740) {
  if (Arg4740.length < 2) return [shen_type_func, shen_user_lambda4741, 2, Arg4740];
  var Arg4740_0 = Arg4740[0], Arg4740_1 = Arg4740[1];
  return (function() {
  return shenjs_call_tail(shen_insert_prolog_variables_help, [Arg4740_0, shenjs_call(shen_flatten, [Arg4740_0]), Arg4740_1]);})},
  2,
  [],
  "shen-insert-prolog-variables"];
shenjs_functions["shen_shen-insert-prolog-variables"] = shen_insert_prolog_variables;






shen_insert_prolog_variables_help = [shen_type_func,
  function shen_user_lambda4743(Arg4742) {
  if (Arg4742.length < 3) return [shen_type_func, shen_user_lambda4743, 3, Arg4742];
  var Arg4742_0 = Arg4742[0], Arg4742_1 = Arg4742[1], Arg4742_2 = Arg4742[2];
  var R0, R1;
  return ((shenjs_empty$question$(Arg4742_1))
  ? Arg4742_0
  : (((shenjs_is_type(Arg4742_1, shen_type_cons) && shenjs_call(shen_variable$question$, [Arg4742_1[1]])))
  ? ((R0 = shenjs_call(shen_newpv, [Arg4742_2])),
  (R0 = shenjs_call(shen_subst, [R0, Arg4742_1[1], Arg4742_0])),
  (R1 = shenjs_call(shen_remove, [Arg4742_1[1], Arg4742_1[2]])),
  (function() {
  return shenjs_call_tail(shen_insert_prolog_variables_help, [R0, R1, Arg4742_2]);}))
  : ((shenjs_is_type(Arg4742_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_insert_prolog_variables_help, [Arg4742_0, Arg4742_1[2], Arg4742_2]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-insert-prolog-variables-help"]]);}))))},
  3,
  [],
  "shen-insert-prolog-variables-help"];
shenjs_functions["shen_shen-insert-prolog-variables-help"] = shen_insert_prolog_variables_help;






shen_initialise_prolog = [shen_type_func,
  function shen_user_lambda4745(Arg4744) {
  if (Arg4744.length < 1) return [shen_type_func, shen_user_lambda4745, 1, Arg4744];
  var Arg4744_0 = Arg4744[0];
  return (shenjs_absvector_set((shenjs_globals["shen_shen-*prologvectors*"]), Arg4744_0, shenjs_call(shen_fillvector, [shenjs_vector(10), 1, 10, [shen_type_symbol, "shen--null-"]])),
  shenjs_absvector_set((shenjs_globals["shen_shen-*varcounter*"]), Arg4744_0, 1),
  Arg4744_0)},
  1,
  [],
  "shen-initialise-prolog"];
shenjs_functions["shen_shen-initialise-prolog"] = shen_initialise_prolog;












shen_f$_error = [shen_type_func,
  function shen_user_lambda5391(Arg5390) {
  if (Arg5390.length < 1) return [shen_type_func, shen_user_lambda5391, 1, Arg5390];
  var Arg5390_0 = Arg5390[0];
  return (shenjs_call(shen_intoutput, ["partial function ~A;~%", [shen_tuple, Arg5390_0, []]]),
  ((((!shenjs_call(shen_tracked$question$, [Arg5390_0])) && shenjs_call(shen_y_or_n$question$, [shenjs_call(shen_intmake_string, ["track ~A? ", [shen_tuple, Arg5390_0, []]])])))
  ? shenjs_call(shen_track_function, [shenjs_call(shen_ps, [Arg5390_0])])
  : [shen_type_symbol, "shen-ok"]),
  (function() {
  return shenjs_simple_error("aborted");}))},
  1,
  [],
  "shen-f_error"];
shenjs_functions["shen_shen-f_error"] = shen_f$_error;






shen_tracked$question$ = [shen_type_func,
  function shen_user_lambda5393(Arg5392) {
  if (Arg5392.length < 1) return [shen_type_func, shen_user_lambda5393, 1, Arg5392];
  var Arg5392_0 = Arg5392[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5392_0, (shenjs_globals["shen_shen-*tracking*"])]);})},
  1,
  [],
  "shen-tracked?"];
shenjs_functions["shen_shen-tracked?"] = shen_tracked$question$;






shen_track = [shen_type_func,
  function shen_user_lambda5395(Arg5394) {
  if (Arg5394.length < 1) return [shen_type_func, shen_user_lambda5395, 1, Arg5394];
  var Arg5394_0 = Arg5394[0];
  var R0;
  return ((R0 = shenjs_call(shen_ps, [Arg5394_0])),
  (function() {
  return shenjs_call_tail(shen_track_function, [R0]);}))},
  1,
  [],
  "track"];
shenjs_functions["shen_track"] = shen_track;






shen_track_function = [shen_type_func,
  function shen_user_lambda5397(Arg5396) {
  if (Arg5396.length < 1) return [shen_type_func, shen_user_lambda5397, 1, Arg5396];
  var Arg5396_0 = Arg5396[0];
  var R0;
  return (((shenjs_is_type(Arg5396_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defun"], Arg5396_0[1])) && (shenjs_is_type(Arg5396_0[2], shen_type_cons) && (shenjs_is_type(Arg5396_0[2][2], shen_type_cons) && (shenjs_is_type(Arg5396_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg5396_0[2][2][2][2])))))))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "defun"], [shen_type_cons, Arg5396_0[2][1], [shen_type_cons, Arg5396_0[2][2][1], [shen_type_cons, shenjs_call(shen_insert_tracking_code, [Arg5396_0[2][1], Arg5396_0[2][2][1], Arg5396_0[2][2][2][1]]), []]]]]),
  (R0 = shenjs_call(shen_eval, [R0])),
  (shenjs_globals["shen_shen-*tracking*"] = [shen_type_cons, R0, (shenjs_globals["shen_shen-*tracking*"])]),
  R0)
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-track-function"]]);}))},
  1,
  [],
  "shen-track-function"];
shenjs_functions["shen_shen-track-function"] = shen_track_function;






shen_insert_tracking_code = [shen_type_func,
  function shen_user_lambda5399(Arg5398) {
  if (Arg5398.length < 3) return [shen_type_func, shen_user_lambda5399, 3, Arg5398];
  var Arg5398_0 = Arg5398[0], Arg5398_1 = Arg5398[1], Arg5398_2 = Arg5398[2];
  return [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], []]], [shen_type_cons, 1, []]]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-input-track"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], []]], [shen_type_cons, Arg5398_0, [shen_type_cons, shenjs_call(shen_cons$_form, [Arg5398_1]), []]]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-terpri-or-read-char"], []], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg5398_2, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-output-track"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], []]], [shen_type_cons, Arg5398_0, [shen_type_cons, [shen_type_symbol, "Result"], []]]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], []]], [shen_type_cons, 1, []]]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-terpri-or-read-char"], []], [shen_type_cons, [shen_type_symbol, "Result"], []]]], []]]], []]]], []]]]], []]]], []]]], []]]]},
  3,
  [],
  "shen-insert-tracking-code"];
shenjs_functions["shen_shen-insert-tracking-code"] = shen_insert_tracking_code;






(shenjs_globals["shen_shen-*step*"] = false);






shen_step = [shen_type_func,
  function shen_user_lambda5402(Arg5401) {
  if (Arg5401.length < 1) return [shen_type_func, shen_user_lambda5402, 1, Arg5401];
  var Arg5401_0 = Arg5401[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg5401_0)))
  ? (shenjs_globals["shen_shen-*step*"] = true)
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg5401_0)))
  ? (shenjs_globals["shen_shen-*step*"] = false)
  : (function() {
  return shenjs_call_tail(shen_interror, ["step expects a + or a -.~%", []]);})))},
  1,
  [],
  "step"];
shenjs_functions["shen_step"] = shen_step;






shen_spy = [shen_type_func,
  function shen_user_lambda5404(Arg5403) {
  if (Arg5403.length < 1) return [shen_type_func, shen_user_lambda5404, 1, Arg5403];
  var Arg5403_0 = Arg5403[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg5403_0)))
  ? (shenjs_globals["shen_shen-*spy*"] = true)
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg5403_0)))
  ? (shenjs_globals["shen_shen-*spy*"] = false)
  : (function() {
  return shenjs_call_tail(shen_interror, ["spy expects a + or a -.~%", []]);})))},
  1,
  [],
  "spy"];
shenjs_functions["shen_spy"] = shen_spy;






shen_terpri_or_read_char = [shen_type_func,
  function shen_user_lambda5406(Arg5405) {
  if (Arg5405.length < 0) return [shen_type_func, shen_user_lambda5406, 0, Arg5405];
  return (((shenjs_globals["shen_shen-*step*"]))
  ? (function() {
  return shenjs_call_tail(shen_check_byte, [shenjs_read_byte((shenjs_globals["shen_*stinput*"]))]);})
  : (function() {
  return shenjs_call_tail(shen_nl, [1]);}))},
  0,
  [],
  "shen-terpri-or-read-char"];
shenjs_functions["shen_shen-terpri-or-read-char"] = shen_terpri_or_read_char;






shen_check_byte = [shen_type_func,
  function shen_user_lambda5408(Arg5407) {
  if (Arg5407.length < 1) return [shen_type_func, shen_user_lambda5408, 1, Arg5407];
  var Arg5407_0 = Arg5407[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5407_0, shenjs_call(shen_hat, []))))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["aborted", []]);})
  : true)},
  1,
  [],
  "shen-check-byte"];
shenjs_functions["shen_shen-check-byte"] = shen_check_byte;






shen_input_track = [shen_type_func,
  function shen_user_lambda5410(Arg5409) {
  if (Arg5409.length < 3) return [shen_type_func, shen_user_lambda5410, 3, Arg5409];
  var Arg5409_0 = Arg5409[0], Arg5409_1 = Arg5409[1], Arg5409_2 = Arg5409[2];
  return (shenjs_call(shen_intoutput, ["~%~A<~A> Inputs to ~A ~%~A", [shen_tuple, shenjs_call(shen_spaces, [Arg5409_0]), [shen_tuple, Arg5409_0, [shen_tuple, Arg5409_1, [shen_tuple, shenjs_call(shen_spaces, [Arg5409_0]), [shen_tuple, Arg5409_2, []]]]]]]),
  (function() {
  return shenjs_call_tail(shen_recursively_print, [Arg5409_2]);}))},
  3,
  [],
  "shen-input-track"];
shenjs_functions["shen_shen-input-track"] = shen_input_track;






shen_recursively_print = [shen_type_func,
  function shen_user_lambda5412(Arg5411) {
  if (Arg5411.length < 1) return [shen_type_func, shen_user_lambda5412, 1, Arg5411];
  var Arg5411_0 = Arg5411[0];
  return ((shenjs_empty$question$(Arg5411_0))
  ? (function() {
  return shenjs_call_tail(shen_intoutput, [" ==>", []]);})
  : ((shenjs_is_type(Arg5411_0, shen_type_cons))
  ? (shenjs_call(shen_print, [Arg5411_0[1]]),
  shenjs_call(shen_intoutput, [", ", []]),
  (function() {
  return shenjs_call_tail(shen_recursively_print, [Arg5411_0[2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-recursively-print"]]);})))},
  1,
  [],
  "shen-recursively-print"];
shenjs_functions["shen_shen-recursively-print"] = shen_recursively_print;






shen_spaces = [shen_type_func,
  function shen_user_lambda5414(Arg5413) {
  if (Arg5413.length < 1) return [shen_type_func, shen_user_lambda5414, 1, Arg5413];
  var Arg5413_0 = Arg5413[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg5413_0)))
  ? ""
  : (" " + shenjs_call(shen_spaces, [(Arg5413_0 - 1)])))},
  1,
  [],
  "shen-spaces"];
shenjs_functions["shen_shen-spaces"] = shen_spaces;






shen_output_track = [shen_type_func,
  function shen_user_lambda5416(Arg5415) {
  if (Arg5415.length < 3) return [shen_type_func, shen_user_lambda5416, 3, Arg5415];
  var Arg5415_0 = Arg5415[0], Arg5415_1 = Arg5415[1], Arg5415_2 = Arg5415[2];
  return (function() {
  return shenjs_call_tail(shen_intoutput, ["~%~A<~A> Output from ~A ~%~A==> ~S", [shen_tuple, shenjs_call(shen_spaces, [Arg5415_0]), [shen_tuple, Arg5415_0, [shen_tuple, Arg5415_1, [shen_tuple, shenjs_call(shen_spaces, [Arg5415_0]), [shen_tuple, Arg5415_2, []]]]]]]);})},
  3,
  [],
  "shen-output-track"];
shenjs_functions["shen_shen-output-track"] = shen_output_track;






shen_untrack = [shen_type_func,
  function shen_user_lambda5418(Arg5417) {
  if (Arg5417.length < 1) return [shen_type_func, shen_user_lambda5418, 1, Arg5417];
  var Arg5417_0 = Arg5417[0];
  return (function() {
  return shenjs_call_tail(shen_eval, [shenjs_call(shen_ps, [Arg5417_0])]);})},
  1,
  [],
  "untrack"];
shenjs_functions["shen_untrack"] = shen_untrack;






shen_profile = [shen_type_func,
  function shen_user_lambda5420(Arg5419) {
  if (Arg5419.length < 1) return [shen_type_func, shen_user_lambda5420, 1, Arg5419];
  var Arg5419_0 = Arg5419[0];
  return (function() {
  return shenjs_call_tail(shen_profile_help, [shenjs_call(shen_ps, [Arg5419_0])]);})},
  1,
  [],
  "profile"];
shenjs_functions["shen_profile"] = shen_profile;






shen_profile_help = [shen_type_func,
  function shen_user_lambda5422(Arg5421) {
  if (Arg5421.length < 1) return [shen_type_func, shen_user_lambda5422, 1, Arg5421];
  var Arg5421_0 = Arg5421[0];
  var R0, R1;
  return (((shenjs_is_type(Arg5421_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defun"], Arg5421_0[1])) && (shenjs_is_type(Arg5421_0[2], shen_type_cons) && (shenjs_is_type(Arg5421_0[2][2], shen_type_cons) && (shenjs_is_type(Arg5421_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg5421_0[2][2][2][2])))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "shen-f"]])),
  (R1 = [shen_type_cons, [shen_type_symbol, "defun"], [shen_type_cons, Arg5421_0[2][1], [shen_type_cons, Arg5421_0[2][2][1], [shen_type_cons, shenjs_call(shen_profile_func, [Arg5421_0[2][1], Arg5421_0[2][2][1], [shen_type_cons, R0, Arg5421_0[2][2][1]]]), []]]]]),
  (R0 = [shen_type_cons, [shen_type_symbol, "defun"], [shen_type_cons, R0, [shen_type_cons, Arg5421_0[2][2][1], [shen_type_cons, shenjs_call(shen_subst, [R0, Arg5421_0[2][1], Arg5421_0[2][2][2][1]]), []]]]]),
  shenjs_call(shen_eval_without_macros, [R1]),
  shenjs_call(shen_eval_without_macros, [R0]),
  Arg5421_0[2][1])
  : (function() {
  return shenjs_call_tail(shen_interror, ["Cannot profile.~%", []]);}))},
  1,
  [],
  "shen-profile-help"];
shenjs_functions["shen_shen-profile-help"] = shen_profile_help;






shen_unprofile = [shen_type_func,
  function shen_user_lambda5424(Arg5423) {
  if (Arg5423.length < 1) return [shen_type_func, shen_user_lambda5424, 1, Arg5423];
  var Arg5423_0 = Arg5423[0];
  return (function() {
  return shenjs_call_tail(shen_untrack, [Arg5423_0]);})},
  1,
  [],
  "unprofile"];
shenjs_functions["shen_unprofile"] = shen_unprofile;






shen_profile_func = [shen_type_func,
  function shen_user_lambda5426(Arg5425) {
  if (Arg5425.length < 3) return [shen_type_func, shen_user_lambda5426, 3, Arg5425];
  var Arg5425_0 = Arg5425[0], Arg5425_1 = Arg5425[1], Arg5425_2 = Arg5425[2];
  return [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Start"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "run"], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg5425_2, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Finish"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "run"], []]], [shen_type_cons, [shen_type_symbol, "Start"], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Record"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-put-profile"], [shen_type_cons, Arg5425_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-get-profile"], [shen_type_cons, Arg5425_0, []]], [shen_type_cons, [shen_type_symbol, "Finish"], []]]], []]]], [shen_type_cons, [shen_type_symbol, "Result"], []]]]], []]]]], []]]]], []]]]]},
  3,
  [],
  "shen-profile-func"];
shenjs_functions["shen_shen-profile-func"] = shen_profile_func;






shen_profile_results = [shen_type_func,
  function shen_user_lambda5428(Arg5427) {
  if (Arg5427.length < 1) return [shen_type_func, shen_user_lambda5428, 1, Arg5427];
  var Arg5427_0 = Arg5427[0];
  var R0;
  return ((R0 = shenjs_call(shen_get_profile, [Arg5427_0])),
  shenjs_call(shen_put_profile, [Arg5427_0, 0]),
  [shen_tuple, Arg5427_0, R0])},
  1,
  [],
  "profile-results"];
shenjs_functions["shen_profile-results"] = shen_profile_results;






shen_get_profile = [shen_type_func,
  function shen_user_lambda5430(Arg5429) {
  if (Arg5429.length < 1) return [shen_type_func, shen_user_lambda5430, 1, Arg5429];
  var Arg5429_0 = Arg5429[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg5429_0, [shen_type_symbol, "profile"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda5432(Arg5431) {
  if (Arg5431.length < 1) return [shen_type_func, shen_user_lambda5432, 1, Arg5431];
  var Arg5431_0 = Arg5431[0];
  return 0},
  1,
  []]);})},
  1,
  [],
  "shen-get-profile"];
shenjs_functions["shen_shen-get-profile"] = shen_get_profile;






shen_put_profile = [shen_type_func,
  function shen_user_lambda5434(Arg5433) {
  if (Arg5433.length < 2) return [shen_type_func, shen_user_lambda5434, 2, Arg5433];
  var Arg5433_0 = Arg5433[0], Arg5433_1 = Arg5433[1];
  return (function() {
  return shenjs_call_tail(shen_put, [Arg5433_0, [shen_type_symbol, "profile"], Arg5433_1, (shenjs_globals["shen_shen-*property-vector*"])]);})},
  2,
  [],
  "shen-put-profile"];
shenjs_functions["shen_shen-put-profile"] = shen_put_profile;












(shenjs_globals["shen_shen-*installing-kl*"] = false);






(shenjs_globals["shen_shen-*history*"] = []);






(shenjs_globals["shen_shen-*tc*"] = false);






(shenjs_globals["shen_shen-*property-vector*"] = shenjs_vector(20000));






(shenjs_globals["shen_shen-*process-counter*"] = 0);






(shenjs_globals["shen_shen-*varcounter*"] = shenjs_vector(1000));






(shenjs_globals["shen_shen-*prologvectors*"] = shenjs_vector(1000));






(shenjs_globals["shen_shen-*reader-macros*"] = []);






(shenjs_globals["shen_*printer*"] = []);






(shenjs_globals["shen_*home-directory*"] = []);






(shenjs_globals["shen_shen-*gensym*"] = 0);






(shenjs_globals["shen_shen-*tracking*"] = []);






(shenjs_globals["shen_*home-directory*"] = "");






(shenjs_globals["shen_shen-*alphabet*"] = [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, "C"], [shen_type_cons, [shen_type_symbol, "D"], [shen_type_cons, [shen_type_symbol, "E"], [shen_type_cons, [shen_type_symbol, "F"], [shen_type_cons, [shen_type_symbol, "G"], [shen_type_cons, [shen_type_symbol, "H"], [shen_type_cons, [shen_type_symbol, "I"], [shen_type_cons, [shen_type_symbol, "J"], [shen_type_cons, [shen_type_symbol, "K"], [shen_type_cons, [shen_type_symbol, "L"], [shen_type_cons, [shen_type_symbol, "M"], [shen_type_cons, [shen_type_symbol, "N"], [shen_type_cons, [shen_type_symbol, "O"], [shen_type_cons, [shen_type_symbol, "P"], [shen_type_cons, [shen_type_symbol, "Q"], [shen_type_cons, [shen_type_symbol, "R"], [shen_type_cons, [shen_type_symbol, "S"], [shen_type_cons, [shen_type_symbol, "T"], [shen_type_cons, [shen_type_symbol, "U"], [shen_type_cons, [shen_type_symbol, "V"], [shen_type_cons, [shen_type_symbol, "W"], [shen_type_cons, [shen_type_symbol, "X"], [shen_type_cons, [shen_type_symbol, "Y"], [shen_type_cons, [shen_type_symbol, "Z"], []]]]]]]]]]]]]]]]]]]]]]]]]]]);






(shenjs_globals["shen_shen-*special*"] = [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "@s"], [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "type"], [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "open"], []]]]]]]]]]]);






(shenjs_globals["shen_shen-*extraspecial*"] = [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, [shen_type_symbol, "shen-process-datatype"], [shen_type_cons, [shen_type_symbol, "input+"], []]]]);






(shenjs_globals["shen_shen-*spy*"] = false);






(shenjs_globals["shen_shen-*datatypes*"] = []);






(shenjs_globals["shen_shen-*alldatatypes*"] = []);






(shenjs_globals["shen_shen-*shen-type-theory-enabled?*"] = true);






(shenjs_globals["shen_shen-*synonyms*"] = []);






(shenjs_globals["shen_shen-*system*"] = []);






(shenjs_globals["shen_shen-*signedfuncs*"] = []);






(shenjs_globals["shen_shen-*maxcomplexity*"] = 128);






(shenjs_globals["shen_shen-*occurs*"] = true);






(shenjs_globals["shen_shen-*maxinferences*"] = 1000000);






(shenjs_globals["shen_*maximum-print-sequence-size*"] = 20);






(shenjs_globals["shen_shen-*catch*"] = 0);






(shenjs_globals["shen_shen-*call*"] = 0);






(shenjs_globals["shen_shen-*infs*"] = 0);






(shenjs_globals["shen_shen-*process-counter*"] = 0);






(shenjs_globals["shen_shen-*catch*"] = 0);






shen_initialise$_arity$_table = [shen_type_func,
  function shen_user_lambda4391(Arg4390) {
  if (Arg4390.length < 1) return [shen_type_func, shen_user_lambda4391, 1, Arg4390];
  var Arg4390_0 = Arg4390[0];
  return ((shenjs_empty$question$(Arg4390_0))
  ? []
  : (((shenjs_is_type(Arg4390_0, shen_type_cons) && shenjs_is_type(Arg4390_0[2], shen_type_cons)))
  ? (shenjs_call(shen_put, [Arg4390_0[1], [shen_type_symbol, "arity"], Arg4390_0[2][1], (shenjs_globals["shen_shen-*property-vector*"])]),
  (function() {
  return shenjs_call_tail(shen_initialise$_arity$_table, [Arg4390_0[2][2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-initialise_arity_table"]]);})))},
  1,
  [],
  "shen-initialise_arity_table"];
shenjs_functions["shen_shen-initialise_arity_table"] = shen_initialise$_arity$_table;






shen_arity = [shen_type_func,
  function shen_user_lambda4393(Arg4392) {
  if (Arg4392.length < 1) return [shen_type_func, shen_user_lambda4393, 1, Arg4392];
  var Arg4392_0 = Arg4392[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg4392_0, [shen_type_symbol, "arity"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda4395(Arg4394) {
  if (Arg4394.length < 1) return [shen_type_func, shen_user_lambda4395, 1, Arg4394];
  var Arg4394_0 = Arg4394[0];
  return -1},
  1,
  []]);})},
  1,
  [],
  "arity"];
shenjs_functions["shen_arity"] = shen_arity;






shenjs_call(shen_initialise$_arity$_table, [[shen_type_cons, [shen_type_symbol, "adjoin"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "append"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "arity"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "assoc"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "boolean?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "cd"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "compile"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "concat"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "cn"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "declare"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "destroy"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "difference"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "element?"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "empty?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "shen-enable-type-theory"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "interror"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "eval"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "eval-kl"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "explode"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "external"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "fail-if"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "fail"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "fix"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "findall"], [shen_type_cons, 5, [shen_type_cons, [shen_type_symbol, "freeze"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "gensym"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "get"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "address->"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "<-address"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, ">"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, ">="], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "hdv"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "hdstr"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "head"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "integer?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "identical"], [shen_type_cons, 4, [shen_type_cons, [shen_type_symbol, "inferences"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "intoutput"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "make-string"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "intersection"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "length"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "lineread"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "load"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "<"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "<="], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "macroexpand"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "map"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "mapcan"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "intmake-string"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "maxinferences"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "nth"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "n->string"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "number?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "output"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "occurs-check"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "occurrences"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "occurs-check"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "or"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "pos"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "print"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "profile"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "profile-results"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "ps"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "preclude"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "preclude-all-but"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "protect"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "address->"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "put"], [shen_type_cons, 4, [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "read-file-as-string"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "read-file"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "read-byte"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "remove"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "reverse"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "simple-error"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "specialise"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "spy"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "step"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "stinput"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "shen-stoutput"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "string->n"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "string?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "strong-warning"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "subst"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "symbol?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "tail"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "tc"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "tc?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "track"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "trap-error"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "tuple?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "type"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "return"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "unprofile"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "unify"], [shen_type_cons, 4, [shen_type_cons, [shen_type_symbol, "unify!"], [shen_type_cons, 4, [shen_type_cons, [shen_type_symbol, "union"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "untrack"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "unspecialise"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "variable?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "version"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "warn"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "write-to-file"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "y-or-n?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "/"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "=="], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "shen-<1>"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "<e>"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "@s"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "preclude"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "include"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "preclude-all-but"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "include-all-but"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, 2, []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]);





shen_systemf = [shen_type_func,
  function shen_user_lambda4398(Arg4397) {
  if (Arg4397.length < 1) return [shen_type_func, shen_user_lambda4398, 1, Arg4397];
  var Arg4397_0 = Arg4397[0];
  return (shenjs_globals["shen_shen-*system*"] = shenjs_call(shen_adjoin, [Arg4397_0, (shenjs_globals["shen_shen-*system*"])]))},
  1,
  [],
  "systemf"];
shenjs_functions["shen_systemf"] = shen_systemf;






shen_adjoin = [shen_type_func,
  function shen_user_lambda4400(Arg4399) {
  if (Arg4399.length < 2) return [shen_type_func, shen_user_lambda4400, 2, Arg4399];
  var Arg4399_0 = Arg4399[0], Arg4399_1 = Arg4399[1];
  return ((shenjs_call(shen_element$question$, [Arg4399_0, Arg4399_1]))
  ? Arg4399_1
  : [shen_type_cons, Arg4399_0, Arg4399_1])},
  2,
  [],
  "adjoin"];
shenjs_functions["shen_adjoin"] = shen_adjoin;






shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4403(Arg4402) {
  if (Arg4402.length < 1) return [shen_type_func, shen_user_lambda4403, 1, Arg4402];
  var Arg4402_0 = Arg4402[0];
  return (function() {
  return shenjs_call_tail(shen_systemf, [Arg4402_0]);})},
  1,
  []], [shen_type_cons, [shen_type_symbol, "!"], [shen_type_cons, [shen_type_symbol, "}"], [shen_type_cons, [shen_type_symbol, "{"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "<--"], [shen_type_cons, [shen_type_symbol, "&&"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [shen_type_symbol, ":="], [shen_type_cons, [shen_type_symbol, "_"], [shen_type_cons, [shen_type_symbol, "<!>"], [shen_type_cons, [shen_type_symbol, "-*-"], [shen_type_cons, [shen_type_symbol, "*language*"], [shen_type_cons, [shen_type_symbol, "*implementation*"], [shen_type_cons, [shen_type_symbol, "*stinput*"], [shen_type_cons, [shen_type_symbol, "*home-directory*"], [shen_type_cons, [shen_type_symbol, "*version*"], [shen_type_cons, [shen_type_symbol, "*maximum-print-sequence-size*"], [shen_type_cons, [shen_type_symbol, "*printer*"], [shen_type_cons, [shen_type_symbol, "*macros*"], [shen_type_cons, [shen_type_symbol, "shen-*os*"], [shen_type_cons, [shen_type_symbol, "shen-*release*"], [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "@s"], [shen_type_cons, [shen_type_symbol, "<-"], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_symbol, "<e>"], [shen_type_cons, [shen_type_symbol, "=="], [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, ">="], [shen_type_cons, [shen_type_symbol, ">"], [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, [shen_type_symbol, "=!"], [shen_type_cons, [shen_type_symbol, "$"], [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_symbol, "/"], [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_symbol, "<="], [shen_type_cons, [shen_type_symbol, "<"], [shen_type_cons, [shen_type_symbol, ">>"], [shen_type_cons, shenjs_vector(0), [shen_type_cons, [shen_type_symbol, "y-or-n?"], [shen_type_cons, [shen_type_symbol, "write-to-file"], [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_symbol, "when"], [shen_type_cons, [shen_type_symbol, "warn"], [shen_type_cons, [shen_type_symbol, "version"], [shen_type_cons, [shen_type_symbol, "verified"], [shen_type_cons, [shen_type_symbol, "variable?"], [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, [shen_type_symbol, "vector?"], [shen_type_cons, [shen_type_symbol, "unspecialise"], [shen_type_cons, [shen_type_symbol, "untrack"], [shen_type_cons, [shen_type_symbol, "union"], [shen_type_cons, [shen_type_symbol, "unify"], [shen_type_cons, [shen_type_symbol, "unify!"], [shen_type_cons, [shen_type_symbol, "unprofile"], [shen_type_cons, [shen_type_symbol, "return"], [shen_type_cons, [shen_type_symbol, "type"], [shen_type_cons, [shen_type_symbol, "tuple?"], [shen_type_cons, true, [shen_type_cons, [shen_type_symbol, "trap-error"], [shen_type_cons, [shen_type_symbol, "track"], [shen_type_cons, [shen_type_symbol, "time"], [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, [shen_type_symbol, "tc?"], [shen_type_cons, [shen_type_symbol, "tc"], [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_symbol, "tlstr"], [shen_type_cons, [shen_type_symbol, "tlv"], [shen_type_cons, [shen_type_symbol, "tail"], [shen_type_cons, [shen_type_symbol, "systemf"], [shen_type_cons, [shen_type_symbol, "synonyms"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "symbol?"], [shen_type_cons, [shen_type_symbol, "subst"], [shen_type_cons, [shen_type_symbol, "string?"], [shen_type_cons, [shen_type_symbol, "string->n"], [shen_type_cons, [shen_type_symbol, "stream"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "stinput"], [shen_type_cons, [shen_type_symbol, "shen-stoutput"], [shen_type_cons, [shen_type_symbol, "step"], [shen_type_cons, [shen_type_symbol, "spy"], [shen_type_cons, [shen_type_symbol, "specialise"], [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, [shen_type_symbol, "simple-error"], [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "save"], [shen_type_cons, [shen_type_symbol, "str"], [shen_type_cons, [shen_type_symbol, "run"], [shen_type_cons, [shen_type_symbol, "reverse"], [shen_type_cons, [shen_type_symbol, "remove"], [shen_type_cons, [shen_type_symbol, "read"], [shen_type_cons, [shen_type_symbol, "read-file"], [shen_type_cons, [shen_type_symbol, "read-file-as-bytelist"], [shen_type_cons, [shen_type_symbol, "read-file-as-string"], [shen_type_cons, [shen_type_symbol, "read-byte"], [shen_type_cons, [shen_type_symbol, "quit"], [shen_type_cons, [shen_type_symbol, "put"], [shen_type_cons, [shen_type_symbol, "preclude"], [shen_type_cons, [shen_type_symbol, "preclude-all-but"], [shen_type_cons, [shen_type_symbol, "ps"], [shen_type_cons, [shen_type_symbol, "prolog?"], [shen_type_cons, [shen_type_symbol, "protect"], [shen_type_cons, [shen_type_symbol, "profile-results"], [shen_type_cons, [shen_type_symbol, "profile"], [shen_type_cons, [shen_type_symbol, "print"], [shen_type_cons, [shen_type_symbol, "pr"], [shen_type_cons, [shen_type_symbol, "pos"], [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, [shen_type_symbol, "output"], [shen_type_cons, [shen_type_symbol, "out"], [shen_type_cons, [shen_type_symbol, "or"], [shen_type_cons, [shen_type_symbol, "open"], [shen_type_cons, [shen_type_symbol, "occurrences"], [shen_type_cons, [shen_type_symbol, "occurs-check"], [shen_type_cons, [shen_type_symbol, "n->string"], [shen_type_cons, [shen_type_symbol, "number?"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "null"], [shen_type_cons, [shen_type_symbol, "nth"], [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_symbol, "nl"], [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, [shen_type_symbol, "macro"], [shen_type_cons, [shen_type_symbol, "macroexpand"], [shen_type_cons, [shen_type_symbol, "maxinferences"], [shen_type_cons, [shen_type_symbol, "mapcan"], [shen_type_cons, [shen_type_symbol, "map"], [shen_type_cons, [shen_type_symbol, "make-string"], [shen_type_cons, [shen_type_symbol, "load"], [shen_type_cons, [shen_type_symbol, "loaded"], [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "lineread"], [shen_type_cons, [shen_type_symbol, "limit"], [shen_type_cons, [shen_type_symbol, "length"], [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "lazy"], [shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "intersection"], [shen_type_cons, [shen_type_symbol, "inferences"], [shen_type_cons, [shen_type_symbol, "intern"], [shen_type_cons, [shen_type_symbol, "integer?"], [shen_type_cons, [shen_type_symbol, "input"], [shen_type_cons, [shen_type_symbol, "input+"], [shen_type_cons, [shen_type_symbol, "include"], [shen_type_cons, [shen_type_symbol, "include-all-but"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_symbol, "identical"], [shen_type_cons, [shen_type_symbol, "head"], [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_symbol, "hdv"], [shen_type_cons, [shen_type_symbol, "hdstr"], [shen_type_cons, [shen_type_symbol, "hash"], [shen_type_cons, [shen_type_symbol, "get"], [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "gensym"], [shen_type_cons, [shen_type_symbol, "function"], [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, [shen_type_symbol, "freeze"], [shen_type_cons, [shen_type_symbol, "format"], [shen_type_cons, [shen_type_symbol, "fix"], [shen_type_cons, [shen_type_symbol, "file"], [shen_type_cons, [shen_type_symbol, "fail"], [shen_type_cons, [shen_type_symbol, "fail-if"], [shen_type_cons, [shen_type_symbol, "fwhen"], [shen_type_cons, [shen_type_symbol, "findall"], [shen_type_cons, false, [shen_type_cons, [shen_type_symbol, "shen-enable-type-theory"], [shen_type_cons, [shen_type_symbol, "explode"], [shen_type_cons, [shen_type_symbol, "external"], [shen_type_cons, [shen_type_symbol, "exception"], [shen_type_cons, [shen_type_symbol, "eval-kl"], [shen_type_cons, [shen_type_symbol, "eval"], [shen_type_cons, [shen_type_symbol, "error-to-string"], [shen_type_cons, [shen_type_symbol, "error"], [shen_type_cons, [shen_type_symbol, "empty?"], [shen_type_cons, [shen_type_symbol, "element?"], [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_symbol, "difference"], [shen_type_cons, [shen_type_symbol, "destroy"], [shen_type_cons, [shen_type_symbol, "defun"], [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, [shen_type_symbol, "defmacro"], [shen_type_cons, [shen_type_symbol, "defcc"], [shen_type_cons, [shen_type_symbol, "defprolog"], [shen_type_cons, [shen_type_symbol, "declare"], [shen_type_cons, [shen_type_symbol, "datatype"], [shen_type_cons, [shen_type_symbol, "cut"], [shen_type_cons, [shen_type_symbol, "cn"], [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, [shen_type_symbol, "cond"], [shen_type_cons, [shen_type_symbol, "concat"], [shen_type_cons, [shen_type_symbol, "compile"], [shen_type_cons, [shen_type_symbol, "cd"], [shen_type_cons, [shen_type_symbol, "cases"], [shen_type_cons, [shen_type_symbol, "call"], [shen_type_cons, [shen_type_symbol, "close"], [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, [shen_type_symbol, "bound?"], [shen_type_cons, [shen_type_symbol, "boolean?"], [shen_type_cons, [shen_type_symbol, "boolean"], [shen_type_cons, [shen_type_symbol, "bar!"], [shen_type_cons, [shen_type_symbol, "assoc"], [shen_type_cons, [shen_type_symbol, "arity"], [shen_type_cons, [shen_type_symbol, "append"], [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "adjoin"], [shen_type_cons, [shen_type_symbol, "<-address"], [shen_type_cons, [shen_type_symbol, "address->"], [shen_type_cons, [shen_type_symbol, "absvector?"], [shen_type_cons, [shen_type_symbol, "absvector"], [shen_type_cons, [shen_type_symbol, "abort"], [shen_type_cons, [shen_type_symbol, "intmake-string"], [shen_type_cons, [shen_type_symbol, "intoutput"], [shen_type_cons, [shen_type_symbol, "interror"], []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]);





shen_specialise = [shen_type_func,
  function shen_user_lambda4405(Arg4404) {
  if (Arg4404.length < 1) return [shen_type_func, shen_user_lambda4405, 1, Arg4404];
  var Arg4404_0 = Arg4404[0];
  return ((shenjs_globals["shen_shen-*special*"] = [shen_type_cons, Arg4404_0, (shenjs_globals["shen_shen-*special*"])]),
  Arg4404_0)},
  1,
  [],
  "specialise"];
shenjs_functions["shen_specialise"] = shen_specialise;






shen_unspecialise = [shen_type_func,
  function shen_user_lambda4407(Arg4406) {
  if (Arg4406.length < 1) return [shen_type_func, shen_user_lambda4407, 1, Arg4406];
  var Arg4406_0 = Arg4406[0];
  return ((shenjs_globals["shen_shen-*special*"] = shenjs_call(shen_remove, [Arg4406_0, (shenjs_globals["shen_shen-*special*"])])),
  Arg4406_0)},
  1,
  [],
  "unspecialise"];
shenjs_functions["shen_unspecialise"] = shen_unspecialise;












shen_load = [shen_type_func,
  function shen_user_lambda4410(Arg4409) {
  if (Arg4409.length < 1) return [shen_type_func, shen_user_lambda4410, 1, Arg4409];
  var Arg4409_0 = Arg4409[0];
  var R0, R1, R2;
  return (((R0 = shenjs_get_time([shen_type_symbol, "run"])),
  (R1 = shenjs_call(shen_load_help, [(shenjs_globals["shen_shen-*tc*"]), shenjs_call(shen_read_file, [Arg4409_0])])),
  (R2 = shenjs_get_time([shen_type_symbol, "run"])),
  (R2 = (R2 - R0)),
  shenjs_call(shen_intoutput, ["~%run time: ~A secs~%", [shen_tuple, R2, []]]),
  R1),
  (((shenjs_globals["shen_shen-*tc*"]))
  ? shenjs_call(shen_intoutput, ["~%typechecked in ~A inferences~%", [shen_tuple, shenjs_call(shen_inferences, [[shen_type_symbol, "_"]]), []]])
  : [shen_type_symbol, "shen-skip"]),
  [shen_type_symbol, "loaded"])},
  1,
  [],
  "load"];
shenjs_functions["shen_load"] = shen_load;






shen_load_help = [shen_type_func,
  function shen_user_lambda4412(Arg4411) {
  if (Arg4411.length < 2) return [shen_type_func, shen_user_lambda4412, 2, Arg4411];
  var Arg4411_0 = Arg4411[0], Arg4411_1 = Arg4411[1];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$(false, Arg4411_0)))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda4414(Arg4413) {
  if (Arg4413.length < 1) return [shen_type_func, shen_user_lambda4414, 1, Arg4413];
  var Arg4413_0 = Arg4413[0];
  return (function() {
  return shenjs_call_tail(shen_intoutput, ["~S~%", [shen_tuple, shenjs_call(shen_eval_without_macros, [Arg4413_0]), []]]);})},
  1,
  []], Arg4411_1]);})
  : ((R0 = shenjs_call(shen_mapcan, [[shen_type_func,
  function shen_user_lambda4416(Arg4415) {
  if (Arg4415.length < 1) return [shen_type_func, shen_user_lambda4416, 1, Arg4415];
  var Arg4415_0 = Arg4415[0];
  return (function() {
  return shenjs_call_tail(shen_remove_synonyms, [Arg4415_0]);})},
  1,
  []], Arg4411_1])),
  (R1 = shenjs_call(shen_mapcan, [[shen_type_func,
  function shen_user_lambda4418(Arg4417) {
  if (Arg4417.length < 1) return [shen_type_func, shen_user_lambda4418, 1, Arg4417];
  var Arg4417_0 = Arg4417[0];
  return (function() {
  return shenjs_call_tail(shen_typetable, [Arg4417_0]);})},
  1,
  []], R0])),
  shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4420(Arg4419) {
  if (Arg4419.length < 1) return [shen_type_func, shen_user_lambda4420, 1, Arg4419];
  var Arg4419_0 = Arg4419[0];
  return (function() {
  return shenjs_call_tail(shen_assumetype, [Arg4419_0]);})},
  1,
  []], R1]),
  (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4422(Arg4421) {
  if (Arg4421.length < 1) return [shen_type_func, shen_user_lambda4422, 1, Arg4421];
  var Arg4421_0 = Arg4421[0];
  return (function() {
  return shenjs_call_tail(shen_typecheck_and_load, [Arg4421_0]);})},
  1,
  []], R0]);}, [shen_type_func,
  function shen_user_lambda4424(Arg4423) {
  if (Arg4423.length < 2) return [shen_type_func, shen_user_lambda4424, 2, Arg4423];
  var Arg4423_0 = Arg4423[0], Arg4423_1 = Arg4423[1];
  return (function() {
  return shenjs_call_tail(shen_unwind_types, [Arg4423_1, Arg4423_0]);})},
  2,
  [R1]]);})))},
  2,
  [],
  "shen-load-help"];
shenjs_functions["shen_shen-load-help"] = shen_load_help;






shen_remove_synonyms = [shen_type_func,
  function shen_user_lambda4426(Arg4425) {
  if (Arg4425.length < 1) return [shen_type_func, shen_user_lambda4426, 1, Arg4425];
  var Arg4425_0 = Arg4425[0];
  return (((shenjs_is_type(Arg4425_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-synonyms-help"], Arg4425_0[1]))))
  ? (shenjs_call(shen_eval, [Arg4425_0]),
  [])
  : [shen_type_cons, Arg4425_0, []])},
  1,
  [],
  "shen-remove-synonyms"];
shenjs_functions["shen_shen-remove-synonyms"] = shen_remove_synonyms;






shen_typecheck_and_load = [shen_type_func,
  function shen_user_lambda4428(Arg4427) {
  if (Arg4427.length < 1) return [shen_type_func, shen_user_lambda4428, 1, Arg4427];
  var Arg4427_0 = Arg4427[0];
  return (shenjs_call(shen_nl, [1]),
  (function() {
  return shenjs_call_tail(shen_typecheck_and_evaluate, [Arg4427_0, shenjs_call(shen_gensym, [[shen_type_symbol, "A"]])]);}))},
  1,
  [],
  "shen-typecheck-and-load"];
shenjs_functions["shen_shen-typecheck-and-load"] = shen_typecheck_and_load;






shen_typetable = [shen_type_func,
  function shen_user_lambda4430(Arg4429) {
  if (Arg4429.length < 1) return [shen_type_func, shen_user_lambda4430, 1, Arg4429];
  var Arg4429_0 = Arg4429[0];
  var R0;
  return (((shenjs_is_type(Arg4429_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "define"], Arg4429_0[1])) && shenjs_is_type(Arg4429_0[2], shen_type_cons))))
  ? ((R0 = shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda4432(Arg4431) {
  if (Arg4431.length < 1) return [shen_type_func, shen_user_lambda4432, 1, Arg4431];
  var Arg4431_0 = Arg4431[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$sig$plus$rest$gt$, [Arg4431_0]);})},
  1,
  []], Arg4429_0[2][2], []])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["~A lacks a proper signature.~%", [shen_tuple, Arg4429_0[2][1], []]]);})
  : [shen_type_cons, [shen_type_cons, Arg4429_0[2][1], R0], []]))
  : [])},
  1,
  [],
  "shen-typetable"];
shenjs_functions["shen_shen-typetable"] = shen_typetable;






shen_assumetype = [shen_type_func,
  function shen_user_lambda4434(Arg4433) {
  if (Arg4433.length < 1) return [shen_type_func, shen_user_lambda4434, 1, Arg4433];
  var Arg4433_0 = Arg4433[0];
  return ((shenjs_is_type(Arg4433_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_declare, [Arg4433_0[1], Arg4433_0[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-assumetype"]]);}))},
  1,
  [],
  "shen-assumetype"];
shenjs_functions["shen_shen-assumetype"] = shen_assumetype;






shen_unwind_types = [shen_type_func,
  function shen_user_lambda4436(Arg4435) {
  if (Arg4435.length < 2) return [shen_type_func, shen_user_lambda4436, 2, Arg4435];
  var Arg4435_0 = Arg4435[0], Arg4435_1 = Arg4435[1];
  return ((shenjs_empty$question$(Arg4435_1))
  ? (function() {
  return shenjs_simple_error(shenjs_error_to_string(Arg4435_0));})
  : (((shenjs_is_type(Arg4435_1, shen_type_cons) && shenjs_is_type(Arg4435_1[1], shen_type_cons)))
  ? (shenjs_call(shen_remtype, [Arg4435_1[1][1]]),
  (function() {
  return shenjs_call_tail(shen_unwind_types, [Arg4435_0, Arg4435_1[2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-unwind-types"]]);})))},
  2,
  [],
  "shen-unwind-types"];
shenjs_functions["shen_shen-unwind-types"] = shen_unwind_types;






shen_remtype = [shen_type_func,
  function shen_user_lambda4438(Arg4437) {
  if (Arg4437.length < 1) return [shen_type_func, shen_user_lambda4438, 1, Arg4437];
  var Arg4437_0 = Arg4437[0];
  return ((shenjs_globals["shen_shen-*signedfuncs*"] = shenjs_call(shen_remove, [Arg4437_0, (shenjs_globals["shen_shen-*signedfuncs*"])])),
  Arg4437_0)},
  1,
  [],
  "shen-remtype"];
shenjs_functions["shen_shen-remtype"] = shen_remtype;






shen_$lt$sig$plus$rest$gt$ = [shen_type_func,
  function shen_user_lambda4440(Arg4439) {
  if (Arg4439.length < 1) return [shen_type_func, shen_user_lambda4440, 1, Arg4439];
  var Arg4439_0 = Arg4439[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$signature$gt$, [Arg4439_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$any$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<sig+rest>"];
shenjs_functions["shen_shen-<sig+rest>"] = shen_$lt$sig$plus$rest$gt$;






shen_write_to_file = [shen_type_func,
  function shen_user_lambda4442(Arg4441) {
  if (Arg4441.length < 2) return [shen_type_func, shen_user_lambda4442, 2, Arg4441];
  var Arg4441_0 = Arg4441[0], Arg4441_1 = Arg4441[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_intmake_string, ["~A~A", [shen_tuple, (shenjs_globals["shen_*home-directory*"]), [shen_tuple, Arg4441_0, []]]])),
  (R0 = shenjs_open([shen_type_symbol, "file"], R0, [shen_type_symbol, "out"])),
  (R1 = (((typeof(Arg4441_1) == 'string'))
  ? shenjs_call(shen_intmake_string, ["~A~%~%", [shen_tuple, Arg4441_1, []]])
  : shenjs_call(shen_intmake_string, ["~S~%~%", [shen_tuple, Arg4441_1, []]]))),
  shenjs_pr(R1, R0),
  shenjs_close(R0),
  Arg4441_1)},
  2,
  [],
  "write-to-file"];
shenjs_functions["shen_write-to-file"] = shen_write_to_file;












shen_macroexpand = [shen_type_func,
  function shen_user_lambda4445(Arg4444) {
  if (Arg4444.length < 1) return [shen_type_func, shen_user_lambda4445, 1, Arg4444];
  var Arg4444_0 = Arg4444[0];
  return (function() {
  return shenjs_call_tail(shen_compose, [(shenjs_globals["shen_*macros*"]), Arg4444_0]);})},
  1,
  [],
  "macroexpand"];
shenjs_functions["shen_macroexpand"] = shen_macroexpand;






shen_macroexpand = [shen_type_func,
  function shen_user_lambda4447(Arg4446) {
  if (Arg4446.length < 1) return [shen_type_func, shen_user_lambda4447, 1, Arg4446];
  var Arg4446_0 = Arg4446[0];
  var R0;
  return ((R0 = shenjs_call(shen_compose, [(shenjs_globals["shen_*macros*"]), Arg4446_0])),
  ((shenjs_unwind_tail(shenjs_$eq$(Arg4446_0, R0)))
  ? Arg4446_0
  : (function() {
  return shenjs_call_tail(shen_walk, [[shen_type_symbol, "macroexpand"], R0]);})))},
  1,
  [],
  "macroexpand"];
shenjs_functions["shen_macroexpand"] = shen_macroexpand;






(shenjs_globals["shen_*macros*"] = [shen_type_cons, [shen_type_symbol, "shen-timer-macro"], [shen_type_cons, [shen_type_symbol, "shen-cases-macro"], [shen_type_cons, [shen_type_symbol, "shen-abs-macro"], [shen_type_cons, [shen_type_symbol, "shen-put/get-macro"], [shen_type_cons, [shen_type_symbol, "shen-compile-macro"], [shen_type_cons, [shen_type_symbol, "shen-yacc-macro"], [shen_type_cons, [shen_type_symbol, "shen-datatype-macro"], [shen_type_cons, [shen_type_symbol, "shen-let-macro"], [shen_type_cons, [shen_type_symbol, "shen-assoc-macro"], [shen_type_cons, [shen_type_symbol, "shen-i/o-macro"], [shen_type_cons, [shen_type_symbol, "shen-prolog-macro"], [shen_type_cons, [shen_type_symbol, "shen-synonyms-macro"], [shen_type_cons, [shen_type_symbol, "shen-nl-macro"], [shen_type_cons, [shen_type_symbol, "shen-vector-macro"], [shen_type_cons, [shen_type_symbol, "shen-@s-macro"], [shen_type_cons, [shen_type_symbol, "shen-defmacro-macro"], [shen_type_cons, [shen_type_symbol, "shen-defprolog-macro"], [shen_type_cons, [shen_type_symbol, "shen-function-macro"], []]]]]]]]]]]]]]]]]]]);






shen_compose = [shen_type_func,
  function shen_user_lambda4450(Arg4449) {
  if (Arg4449.length < 2) return [shen_type_func, shen_user_lambda4450, 2, Arg4449];
  var Arg4449_0 = Arg4449[0], Arg4449_1 = Arg4449[1];
  return ((shenjs_empty$question$(Arg4449_0))
  ? Arg4449_1
  : ((shenjs_is_type(Arg4449_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_compose, [Arg4449_0[2], shenjs_call(Arg4449_0[1], [Arg4449_1])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-compose"]]);})))},
  2,
  [],
  "shen-compose"];
shenjs_functions["shen_shen-compose"] = shen_compose;






shen_compile_macro = [shen_type_func,
  function shen_user_lambda4452(Arg4451) {
  if (Arg4451.length < 1) return [shen_type_func, shen_user_lambda4452, 1, Arg4451];
  var Arg4451_0 = Arg4451[0];
  return (((shenjs_is_type(Arg4451_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "compile"], Arg4451_0[1])) && (shenjs_is_type(Arg4451_0[2], shen_type_cons) && (shenjs_is_type(Arg4451_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4451_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "compile"], [shen_type_cons, Arg4451_0[2][1], [shen_type_cons, Arg4451_0[2][2][1], [shen_type_cons, [], []]]]]
  : Arg4451_0)},
  1,
  [],
  "shen-compile-macro"];
shenjs_functions["shen_shen-compile-macro"] = shen_compile_macro;






shen_prolog_macro = [shen_type_func,
  function shen_user_lambda4454(Arg4453) {
  if (Arg4453.length < 1) return [shen_type_func, shen_user_lambda4454, 1, Arg4453];
  var Arg4453_0 = Arg4453[0];
  return (((shenjs_is_type(Arg4453_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "prolog?"], Arg4453_0[1]))))
  ? [shen_type_cons, [shen_type_symbol, "shen-intprolog"], [shen_type_cons, shenjs_call(shen_prolog_form, [Arg4453_0[2]]), []]]
  : Arg4453_0)},
  1,
  [],
  "shen-prolog-macro"];
shenjs_functions["shen_shen-prolog-macro"] = shen_prolog_macro;






shen_defprolog_macro = [shen_type_func,
  function shen_user_lambda4456(Arg4455) {
  if (Arg4455.length < 1) return [shen_type_func, shen_user_lambda4456, 1, Arg4455];
  var Arg4455_0 = Arg4455[0];
  return (((shenjs_is_type(Arg4455_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defprolog"], Arg4455_0[1])) && shenjs_is_type(Arg4455_0[2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_compile, [[shen_type_func,
  function shen_user_lambda4458(Arg4457) {
  if (Arg4457.length < 1) return [shen_type_func, shen_user_lambda4458, 1, Arg4457];
  var Arg4457_0 = Arg4457[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$defprolog$gt$, [Arg4457_0]);})},
  1,
  []], Arg4455_0[2], [shen_type_func,
  function shen_user_lambda4460(Arg4459) {
  if (Arg4459.length < 2) return [shen_type_func, shen_user_lambda4460, 2, Arg4459];
  var Arg4459_0 = Arg4459[0], Arg4459_1 = Arg4459[1];
  return (function() {
  return shenjs_call_tail(shen_prolog_error, [Arg4459_0[2][1], Arg4459_1]);})},
  2,
  [Arg4455_0]]]);})
  : Arg4455_0)},
  1,
  [],
  "shen-defprolog-macro"];
shenjs_functions["shen_shen-defprolog-macro"] = shen_defprolog_macro;






shen_prolog_form = [shen_type_func,
  function shen_user_lambda4462(Arg4461) {
  if (Arg4461.length < 1) return [shen_type_func, shen_user_lambda4462, 1, Arg4461];
  var Arg4461_0 = Arg4461[0];
  return (function() {
  return shenjs_call_tail(shen_cons$_form, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4464(Arg4463) {
  if (Arg4463.length < 1) return [shen_type_func, shen_user_lambda4464, 1, Arg4463];
  var Arg4463_0 = Arg4463[0];
  return (function() {
  return shenjs_call_tail(shen_cons$_form, [Arg4463_0]);})},
  1,
  []], Arg4461_0])]);})},
  1,
  [],
  "shen-prolog-form"];
shenjs_functions["shen_shen-prolog-form"] = shen_prolog_form;






shen_datatype_macro = [shen_type_func,
  function shen_user_lambda4466(Arg4465) {
  if (Arg4465.length < 1) return [shen_type_func, shen_user_lambda4466, 1, Arg4465];
  var Arg4465_0 = Arg4465[0];
  return (((shenjs_is_type(Arg4465_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "datatype"], Arg4465_0[1])) && shenjs_is_type(Arg4465_0[2], shen_type_cons))))
  ? [shen_type_cons, [shen_type_symbol, "shen-process-datatype"], [shen_type_cons, Arg4465_0[2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "compile"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "function"], [shen_type_cons, [shen_type_symbol, "shen-<datatype-rules>"], []]], [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg4465_0[2][2]]), [shen_type_cons, [shen_type_cons, [shen_type_symbol, "function"], [shen_type_cons, [shen_type_symbol, "shen-datatype-error"], []]], []]]]], []]]]
  : Arg4465_0)},
  1,
  [],
  "shen-datatype-macro"];
shenjs_functions["shen_shen-datatype-macro"] = shen_datatype_macro;






shen_defmacro_macro = [shen_type_func,
  function shen_user_lambda4468(Arg4467) {
  if (Arg4467.length < 1) return [shen_type_func, shen_user_lambda4468, 1, Arg4467];
  var Arg4467_0 = Arg4467[0];
  var R0, R1;
  return (((shenjs_is_type(Arg4467_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defmacro"], Arg4467_0[1])) && shenjs_is_type(Arg4467_0[2], shen_type_cons))))
  ? ((R0 = shenjs_call(shen_compile, [[shen_type_symbol, "shen-<defmacro>"], Arg4467_0[2], []])),
  (R1 = [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "*macros*"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "adjoin"], [shen_type_cons, Arg4467_0[2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "*macros*"], []]], []]]], []]]], [shen_type_cons, [shen_type_symbol, "macro"], []]]]),
  (R1 = [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, [shen_type_symbol, "null"], [shen_type_cons, [], [shen_type_cons, R1, [shen_type_cons, R0, []]]]]]),
  R1)
  : Arg4467_0)},
  1,
  [],
  "shen-defmacro-macro"];
shenjs_functions["shen_shen-defmacro-macro"] = shen_defmacro_macro;






shen_defmacro_macro = [shen_type_func,
  function shen_user_lambda4470(Arg4469) {
  if (Arg4469.length < 1) return [shen_type_func, shen_user_lambda4470, 1, Arg4469];
  var Arg4469_0 = Arg4469[0];
  var R0, R1;
  return (((shenjs_is_type(Arg4469_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defmacro"], Arg4469_0[1])) && shenjs_is_type(Arg4469_0[2], shen_type_cons))))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg4469_0[2][1], shenjs_call(shen_append, [Arg4469_0[2][2], [shen_type_cons, [shen_type_symbol, "X"], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_symbol, "X"], []]]]])]]),
  (R1 = [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "*macros*"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "adjoin"], [shen_type_cons, Arg4469_0[2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "*macros*"], []]], []]]], []]]], [shen_type_cons, [shen_type_symbol, "macro"], []]]]),
  (R1 = [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, [shen_type_symbol, "null"], [shen_type_cons, [], [shen_type_cons, R1, [shen_type_cons, R0, []]]]]]),
  R1)
  : Arg4469_0)},
  1,
  [],
  "shen-defmacro-macro"];
shenjs_functions["shen_shen-defmacro-macro"] = shen_defmacro_macro;






shen_$lt$defmacro$gt$ = [shen_type_func,
  function shen_user_lambda4472(Arg4471) {
  if (Arg4471.length < 1) return [shen_type_func, shen_user_lambda4472, 1, Arg4471];
  var Arg4471_0 = Arg4471[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$name$gt$, [Arg4471_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$macrorules$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<defmacro>"];
shenjs_functions["shen_shen-<defmacro>"] = shen_$lt$defmacro$gt$;






shen_$lt$macrorules$gt$ = [shen_type_func,
  function shen_user_lambda4474(Arg4473) {
  if (Arg4473.length < 1) return [shen_type_func, shen_user_lambda4474, 1, Arg4473];
  var Arg4473_0 = Arg4473[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$macrorule$gt$, [Arg4473_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$macrorules$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_append, [shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])])])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$macrorule$gt$, [Arg4473_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_append, [shenjs_call(shen_snd, [R0]), [shen_type_cons, [shen_type_symbol, "X"], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_symbol, "X"], []]]]])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<macrorules>"];
shenjs_functions["shen_shen-<macrorules>"] = shen_$lt$macrorules$gt$;






shen_$lt$macrorule$gt$ = [shen_type_func,
  function shen_user_lambda4476(Arg4475) {
  if (Arg4475.length < 1) return [shen_type_func, shen_user_lambda4476, 1, Arg4475];
  var Arg4475_0 = Arg4475[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4475_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "->"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$macroaction$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R1]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "where"], shenjs_call(shen_fst, [R1])[1]))))
  ? ((R2 = shenjs_call(shen_$lt$guard$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1])[2], shenjs_call(shen_snd, [R1])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R2))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R2]), shenjs_call(shen_append, [shenjs_call(shen_snd, [R0]), [shen_type_cons, [shen_type_symbol, "->"], shenjs_call(shen_append, [shenjs_call(shen_snd, [R1]), [shen_type_cons, [shen_type_symbol, "where"], shenjs_call(shen_snd, [R2])]])]])])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4475_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "->"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$macroaction$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_append, [shenjs_call(shen_snd, [R0]), [shen_type_cons, [shen_type_symbol, "->"], shenjs_call(shen_snd, [R1])]])])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4475_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "<-"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$macroaction$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R1]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "where"], shenjs_call(shen_fst, [R1])[1]))))
  ? ((R2 = shenjs_call(shen_$lt$guard$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1])[2], shenjs_call(shen_snd, [R1])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R2))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R2]), shenjs_call(shen_append, [shenjs_call(shen_snd, [R0]), [shen_type_cons, [shen_type_symbol, "<-"], shenjs_call(shen_append, [shenjs_call(shen_snd, [R1]), [shen_type_cons, [shen_type_symbol, "where"], shenjs_call(shen_snd, [R2])]])]])])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4475_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "<-"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$macroaction$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_append, [shenjs_call(shen_snd, [R0]), [shen_type_cons, [shen_type_symbol, "<-"], shenjs_call(shen_snd, [R1])]])])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))
  : R0))
  : R0))},
  1,
  [],
  "shen-<macrorule>"];
shenjs_functions["shen_shen-<macrorule>"] = shen_$lt$macrorule$gt$;






shen_$lt$macroaction$gt$ = [shen_type_func,
  function shen_user_lambda4478(Arg4477) {
  if (Arg4477.length < 1) return [shen_type_func, shen_user_lambda4478, 1, Arg4477];
  var Arg4477_0 = Arg4477[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$action$gt$, [Arg4477_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-walk"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "function"], [shen_type_cons, [shen_type_symbol, "macroexpand"], []]], [shen_type_cons, shenjs_call(shen_snd, [R0]), []]]], []]])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<macroaction>"];
shenjs_functions["shen_shen-<macroaction>"] = shen_$lt$macroaction$gt$;






shen_$at$s_macro = [shen_type_func,
  function shen_user_lambda4480(Arg4479) {
  if (Arg4479.length < 1) return [shen_type_func, shen_user_lambda4480, 1, Arg4479];
  var Arg4479_0 = Arg4479[0];
  var R0;
  return (((shenjs_is_type(Arg4479_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], Arg4479_0[1])) && (shenjs_is_type(Arg4479_0[2], shen_type_cons) && (shenjs_is_type(Arg4479_0[2][2], shen_type_cons) && shenjs_is_type(Arg4479_0[2][2][2], shen_type_cons))))))
  ? [shen_type_cons, [shen_type_symbol, "@s"], [shen_type_cons, Arg4479_0[2][1], [shen_type_cons, shenjs_call(shen_$at$s_macro, [[shen_type_cons, [shen_type_symbol, "@s"], Arg4479_0[2][2]]]), []]]]
  : (((shenjs_is_type(Arg4479_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], Arg4479_0[1])) && (shenjs_is_type(Arg4479_0[2], shen_type_cons) && (shenjs_is_type(Arg4479_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4479_0[2][2][2]) && (typeof(Arg4479_0[2][1]) == 'string')))))))
  ? ((R0 = shenjs_call(shen_explode, [Arg4479_0[2][1]])),
  (((shenjs_call(shen_length, [R0]) > 1))
  ? (function() {
  return shenjs_call_tail(shen_$at$s_macro, [[shen_type_cons, [shen_type_symbol, "@s"], shenjs_call(shen_append, [R0, Arg4479_0[2][2]])]]);})
  : Arg4479_0))
  : Arg4479_0))},
  1,
  [],
  "shen-@s-macro"];
shenjs_functions["shen_shen-@s-macro"] = shen_$at$s_macro;






shen_synonyms_macro = [shen_type_func,
  function shen_user_lambda4482(Arg4481) {
  if (Arg4481.length < 1) return [shen_type_func, shen_user_lambda4482, 1, Arg4481];
  var Arg4481_0 = Arg4481[0];
  return (((shenjs_is_type(Arg4481_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "synonyms"], Arg4481_0[1]))))
  ? [shen_type_cons, [shen_type_symbol, "shen-synonyms-help"], [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg4481_0[2]]), []]]
  : Arg4481_0)},
  1,
  [],
  "shen-synonyms-macro"];
shenjs_functions["shen_shen-synonyms-macro"] = shen_synonyms_macro;






shen_nl_macro = [shen_type_func,
  function shen_user_lambda4484(Arg4483) {
  if (Arg4483.length < 1) return [shen_type_func, shen_user_lambda4484, 1, Arg4483];
  var Arg4483_0 = Arg4483[0];
  return (((shenjs_is_type(Arg4483_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "nl"], Arg4483_0[1])) && shenjs_empty$question$(Arg4483_0[2]))))
  ? [shen_type_cons, [shen_type_symbol, "nl"], [shen_type_cons, 1, []]]
  : Arg4483_0)},
  1,
  [],
  "shen-nl-macro"];
shenjs_functions["shen_shen-nl-macro"] = shen_nl_macro;






shen_vector_macro = [shen_type_func,
  function shen_user_lambda4486(Arg4485) {
  if (Arg4485.length < 1) return [shen_type_func, shen_user_lambda4486, 1, Arg4485];
  var Arg4485_0 = Arg4485[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(shenjs_vector(0), Arg4485_0)))
  ? [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 0, []]]
  : Arg4485_0)},
  1,
  [],
  "shen-vector-macro"];
shenjs_functions["shen_shen-vector-macro"] = shen_vector_macro;






shen_yacc_macro = [shen_type_func,
  function shen_user_lambda4488(Arg4487) {
  if (Arg4487.length < 1) return [shen_type_func, shen_user_lambda4488, 1, Arg4487];
  var Arg4487_0 = Arg4487[0];
  return (((shenjs_is_type(Arg4487_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defcc"], Arg4487_0[1])) && shenjs_is_type(Arg4487_0[2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_yacc_$gt$shen, [Arg4487_0[2][1], Arg4487_0[2][2], shenjs_call(shen_extract_segvars, [Arg4487_0[2][2]])]);})
  : Arg4487_0)},
  1,
  [],
  "shen-yacc-macro"];
shenjs_functions["shen_shen-yacc-macro"] = shen_yacc_macro;






shen_assoc_macro = [shen_type_func,
  function shen_user_lambda4490(Arg4489) {
  if (Arg4489.length < 1) return [shen_type_func, shen_user_lambda4490, 1, Arg4489];
  var Arg4489_0 = Arg4489[0];
  return (((shenjs_is_type(Arg4489_0, shen_type_cons) && (shenjs_is_type(Arg4489_0[2], shen_type_cons) && (shenjs_is_type(Arg4489_0[2][2], shen_type_cons) && (shenjs_is_type(Arg4489_0[2][2][2], shen_type_cons) && shenjs_call(shen_element$question$, [Arg4489_0[1], [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "append"], [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "or"], [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, [shen_type_symbol, "do"], []]]]]]]]]]))))))
  ? [shen_type_cons, Arg4489_0[1], [shen_type_cons, Arg4489_0[2][1], [shen_type_cons, shenjs_call(shen_assoc_macro, [[shen_type_cons, Arg4489_0[1], Arg4489_0[2][2]]]), []]]]
  : Arg4489_0)},
  1,
  [],
  "shen-assoc-macro"];
shenjs_functions["shen_shen-assoc-macro"] = shen_assoc_macro;






shen_let_macro = [shen_type_func,
  function shen_user_lambda4492(Arg4491) {
  if (Arg4491.length < 1) return [shen_type_func, shen_user_lambda4492, 1, Arg4491];
  var Arg4491_0 = Arg4491[0];
  return (((shenjs_is_type(Arg4491_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg4491_0[1])) && (shenjs_is_type(Arg4491_0[2], shen_type_cons) && (shenjs_is_type(Arg4491_0[2][2], shen_type_cons) && (shenjs_is_type(Arg4491_0[2][2][2], shen_type_cons) && shenjs_is_type(Arg4491_0[2][2][2][2], shen_type_cons)))))))
  ? [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, Arg4491_0[2][1], [shen_type_cons, Arg4491_0[2][2][1], [shen_type_cons, shenjs_call(shen_let_macro, [[shen_type_cons, [shen_type_symbol, "let"], Arg4491_0[2][2][2]]]), []]]]]
  : Arg4491_0)},
  1,
  [],
  "shen-let-macro"];
shenjs_functions["shen_shen-let-macro"] = shen_let_macro;






shen_abs_macro = [shen_type_func,
  function shen_user_lambda4494(Arg4493) {
  if (Arg4493.length < 1) return [shen_type_func, shen_user_lambda4494, 1, Arg4493];
  var Arg4493_0 = Arg4493[0];
  return (((shenjs_is_type(Arg4493_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4493_0[1])) && (shenjs_is_type(Arg4493_0[2], shen_type_cons) && (shenjs_is_type(Arg4493_0[2][2], shen_type_cons) && shenjs_is_type(Arg4493_0[2][2][2], shen_type_cons))))))
  ? [shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, Arg4493_0[2][1], [shen_type_cons, shenjs_call(shen_abs_macro, [[shen_type_cons, [shen_type_symbol, "/."], Arg4493_0[2][2]]]), []]]]
  : (((shenjs_is_type(Arg4493_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4493_0[1])) && (shenjs_is_type(Arg4493_0[2], shen_type_cons) && (shenjs_is_type(Arg4493_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4493_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "lambda"], Arg4493_0[2]]
  : Arg4493_0))},
  1,
  [],
  "shen-abs-macro"];
shenjs_functions["shen_shen-abs-macro"] = shen_abs_macro;






shen_cases_macro = [shen_type_func,
  function shen_user_lambda4496(Arg4495) {
  if (Arg4495.length < 1) return [shen_type_func, shen_user_lambda4496, 1, Arg4495];
  var Arg4495_0 = Arg4495[0];
  return (((shenjs_is_type(Arg4495_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cases"], Arg4495_0[1])) && (shenjs_is_type(Arg4495_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg4495_0[2][1])) && shenjs_is_type(Arg4495_0[2][2], shen_type_cons))))))
  ? Arg4495_0[2][2][1]
  : (((shenjs_is_type(Arg4495_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cases"], Arg4495_0[1])) && (shenjs_is_type(Arg4495_0[2], shen_type_cons) && (shenjs_is_type(Arg4495_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4495_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, Arg4495_0[2][1], [shen_type_cons, Arg4495_0[2][2][1], [shen_type_cons, shenjs_call(shen_i$slash$o_macro, [[shen_type_cons, [shen_type_symbol, "error"], [shen_type_cons, "error: cases exhausted~%", []]]]), []]]]]
  : (((shenjs_is_type(Arg4495_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cases"], Arg4495_0[1])) && (shenjs_is_type(Arg4495_0[2], shen_type_cons) && shenjs_is_type(Arg4495_0[2][2], shen_type_cons)))))
  ? [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, Arg4495_0[2][1], [shen_type_cons, Arg4495_0[2][2][1], [shen_type_cons, shenjs_call(shen_cases_macro, [[shen_type_cons, [shen_type_symbol, "cases"], Arg4495_0[2][2][2]]]), []]]]]
  : (((shenjs_is_type(Arg4495_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cases"], Arg4495_0[1])) && (shenjs_is_type(Arg4495_0[2], shen_type_cons) && shenjs_empty$question$(Arg4495_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["error: odd number of case elements~%", []]);})
  : Arg4495_0))))},
  1,
  [],
  "shen-cases-macro"];
shenjs_functions["shen_shen-cases-macro"] = shen_cases_macro;






shen_timer_macro = [shen_type_func,
  function shen_user_lambda4498(Arg4497) {
  if (Arg4497.length < 1) return [shen_type_func, shen_user_lambda4498, 1, Arg4497];
  var Arg4497_0 = Arg4497[0];
  return (((shenjs_is_type(Arg4497_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "time"], Arg4497_0[1])) && (shenjs_is_type(Arg4497_0[2], shen_type_cons) && shenjs_empty$question$(Arg4497_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_let_macro, [[shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Start"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "run"], []]], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg4497_0[2][1], [shen_type_cons, [shen_type_symbol, "Finish"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "run"], []]], [shen_type_cons, [shen_type_symbol, "Time"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_symbol, "Finish"], [shen_type_cons, [shen_type_symbol, "Start"], []]]], [shen_type_cons, [shen_type_symbol, "Message"], [shen_type_cons, shenjs_call(shen_i$slash$o_macro, [[shen_type_cons, [shen_type_symbol, "output"], [shen_type_cons, "~%run time: ~A secs~%", [shen_type_cons, [shen_type_symbol, "Time"], []]]]]), [shen_type_cons, [shen_type_symbol, "Result"], []]]]]]]]]]]]]]);})
  : Arg4497_0)},
  1,
  [],
  "shen-timer-macro"];
shenjs_functions["shen_shen-timer-macro"] = shen_timer_macro;






shen_i$slash$o_macro = [shen_type_func,
  function shen_user_lambda4500(Arg4499) {
  if (Arg4499.length < 1) return [shen_type_func, shen_user_lambda4500, 1, Arg4499];
  var Arg4499_0 = Arg4499[0];
  return (((shenjs_is_type(Arg4499_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "output"], Arg4499_0[1])) && shenjs_is_type(Arg4499_0[2], shen_type_cons))))
  ? [shen_type_cons, [shen_type_symbol, "intoutput"], [shen_type_cons, Arg4499_0[2][1], [shen_type_cons, shenjs_call(shen_tuple_up, [Arg4499_0[2][2]]), []]]]
  : (((shenjs_is_type(Arg4499_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "make-string"], Arg4499_0[1])) && shenjs_is_type(Arg4499_0[2], shen_type_cons))))
  ? [shen_type_cons, [shen_type_symbol, "intmake-string"], [shen_type_cons, Arg4499_0[2][1], [shen_type_cons, shenjs_call(shen_tuple_up, [Arg4499_0[2][2]]), []]]]
  : (((shenjs_is_type(Arg4499_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "error"], Arg4499_0[1])) && shenjs_is_type(Arg4499_0[2], shen_type_cons))))
  ? [shen_type_cons, [shen_type_symbol, "interror"], [shen_type_cons, Arg4499_0[2][1], [shen_type_cons, shenjs_call(shen_tuple_up, [Arg4499_0[2][2]]), []]]]
  : (((shenjs_is_type(Arg4499_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "pr"], Arg4499_0[1])) && (shenjs_is_type(Arg4499_0[2], shen_type_cons) && shenjs_empty$question$(Arg4499_0[2][2])))))
  ? [shen_type_cons, [shen_type_symbol, "pr"], [shen_type_cons, Arg4499_0[2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-stoutput"], [shen_type_cons, 0, []]], []]]]
  : (((shenjs_is_type(Arg4499_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "read-byte"], Arg4499_0[1])) && shenjs_empty$question$(Arg4499_0[2]))))
  ? [shen_type_cons, [shen_type_symbol, "read-byte"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "stinput"], [shen_type_cons, 0, []]], []]]
  : Arg4499_0)))))},
  1,
  [],
  "shen-i/o-macro"];
shenjs_functions["shen_shen-i/o-macro"] = shen_i$slash$o_macro;






shen_tuple_up = [shen_type_func,
  function shen_user_lambda4502(Arg4501) {
  if (Arg4501.length < 1) return [shen_type_func, shen_user_lambda4502, 1, Arg4501];
  var Arg4501_0 = Arg4501[0];
  return ((shenjs_is_type(Arg4501_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, Arg4501_0[1], [shen_type_cons, shenjs_call(shen_tuple_up, [Arg4501_0[2]]), []]]]
  : Arg4501_0)},
  1,
  [],
  "shen-tuple-up"];
shenjs_functions["shen_shen-tuple-up"] = shen_tuple_up;






shen_put$slash$get_macro = [shen_type_func,
  function shen_user_lambda4504(Arg4503) {
  if (Arg4503.length < 1) return [shen_type_func, shen_user_lambda4504, 1, Arg4503];
  var Arg4503_0 = Arg4503[0];
  return (((shenjs_is_type(Arg4503_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "put"], Arg4503_0[1])) && (shenjs_is_type(Arg4503_0[2], shen_type_cons) && (shenjs_is_type(Arg4503_0[2][2], shen_type_cons) && (shenjs_is_type(Arg4503_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4503_0[2][2][2][2])))))))
  ? [shen_type_cons, [shen_type_symbol, "put"], [shen_type_cons, Arg4503_0[2][1], [shen_type_cons, Arg4503_0[2][2][1], [shen_type_cons, Arg4503_0[2][2][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*property-vector*"], []]], []]]]]]
  : (((shenjs_is_type(Arg4503_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "get"], Arg4503_0[1])) && (shenjs_is_type(Arg4503_0[2], shen_type_cons) && (shenjs_is_type(Arg4503_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4503_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "get"], [shen_type_cons, Arg4503_0[2][1], [shen_type_cons, Arg4503_0[2][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*property-vector*"], []]], []]]]]
  : Arg4503_0))},
  1,
  [],
  "shen-put/get-macro"];
shenjs_functions["shen_shen-put/get-macro"] = shen_put$slash$get_macro;






shen_function_macro = [shen_type_func,
  function shen_user_lambda4506(Arg4505) {
  if (Arg4505.length < 1) return [shen_type_func, shen_user_lambda4506, 1, Arg4505];
  var Arg4505_0 = Arg4505[0];
  return (((shenjs_is_type(Arg4505_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "function"], Arg4505_0[1])) && (shenjs_is_type(Arg4505_0[2], shen_type_cons) && shenjs_empty$question$(Arg4505_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_function_abstraction, [Arg4505_0[2][1], shenjs_call(shen_arity, [Arg4505_0[2][1]])]);})
  : Arg4505_0)},
  1,
  [],
  "shen-function-macro"];
shenjs_functions["shen_shen-function-macro"] = shen_function_macro;






shen_function_abstraction = [shen_type_func,
  function shen_user_lambda4508(Arg4507) {
  if (Arg4507.length < 2) return [shen_type_func, shen_user_lambda4508, 2, Arg4507];
  var Arg4507_0 = Arg4507[0], Arg4507_1 = Arg4507[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg4507_1)))
  ? [shen_type_cons, [shen_type_symbol, "freeze"], [shen_type_cons, Arg4507_0, []]]
  : ((shenjs_unwind_tail(shenjs_$eq$(-1, Arg4507_1)))
  ? Arg4507_0
  : (function() {
  return shenjs_call_tail(shen_function_abstraction_help, [Arg4507_0, Arg4507_1, []]);})))},
  2,
  [],
  "shen-function-abstraction"];
shenjs_functions["shen_shen-function-abstraction"] = shen_function_abstraction;






shen_function_abstraction_help = [shen_type_func,
  function shen_user_lambda4510(Arg4509) {
  if (Arg4509.length < 3) return [shen_type_func, shen_user_lambda4510, 3, Arg4509];
  var Arg4509_0 = Arg4509[0], Arg4509_1 = Arg4509[1], Arg4509_2 = Arg4509[2];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg4509_1)))
  ? [shen_type_cons, Arg4509_0, Arg4509_2]
  : ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, R0, [shen_type_cons, shenjs_call(shen_function_abstraction_help, [Arg4509_0, (Arg4509_1 - 1), shenjs_call(shen_append, [Arg4509_2, [shen_type_cons, R0, []]])]), []]]]))},
  3,
  [],
  "shen-function-abstraction-help"];
shenjs_functions["shen_shen-function-abstraction-help"] = shen_function_abstraction_help;












shen_declare = [shen_type_func,
  function shen_user_lambda5886(Arg5885) {
  if (Arg5885.length < 2) return [shen_type_func, shen_user_lambda5886, 2, Arg5885];
  var Arg5885_0 = Arg5885[0], Arg5885_1 = Arg5885[1];
  var R0, R1, R2;
  return ((shenjs_globals["shen_shen-*signedfuncs*"] = shenjs_call(shen_adjoin, [Arg5885_0, (shenjs_globals["shen_shen-*signedfuncs*"])])),
  shenjs_trap_error(function() {return shenjs_call(shen_variancy_test, [Arg5885_0, Arg5885_1]);}, [shen_type_func,
  function shen_user_lambda5888(Arg5887) {
  if (Arg5887.length < 1) return [shen_type_func, shen_user_lambda5888, 1, Arg5887];
  var Arg5887_0 = Arg5887[0];
  return [shen_type_symbol, "shen-skip"]},
  1,
  []]),
  (R0 = shenjs_call(shen_rcons$_form, [shenjs_call(shen_normalise_type, [Arg5885_1])])),
  (R1 = shenjs_call(shen_concat, [[shen_type_symbol, "shen-type-signature-of-"], Arg5885_0])),
  (R2 = shenjs_call(shen_parameters, [1])),
  (R0 = [shen_type_cons, [shen_type_cons, R1, [shen_type_cons, [shen_type_symbol, "X"], []]], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "unify!"], [shen_type_cons, [shen_type_symbol, "X"], [shen_type_cons, R0, []]]], []], []]]]),
  (R0 = shenjs_call(shen_aum, [R0, R2])),
  (R0 = shenjs_call(shen_aum$_to$_shen, [R0])),
  (R2 = [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, R1, shenjs_call(shen_append, [R2, shenjs_call(shen_append, [[shen_type_cons, [shen_type_symbol, "ProcessN"], [shen_type_cons, [shen_type_symbol, "Continuation"], []]], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, R0, []]]])])]]),
  shenjs_call(shen_eval_without_macros, [R2]),
  Arg5885_0)},
  2,
  [],
  "declare"];
shenjs_functions["shen_declare"] = shen_declare;






shen_normalise_type = [shen_type_func,
  function shen_user_lambda5890(Arg5889) {
  if (Arg5889.length < 1) return [shen_type_func, shen_user_lambda5890, 1, Arg5889];
  var Arg5889_0 = Arg5889[0];
  return (function() {
  return shenjs_call_tail(shen_fix, [[shen_type_func,
  function shen_user_lambda5892(Arg5891) {
  if (Arg5891.length < 1) return [shen_type_func, shen_user_lambda5892, 1, Arg5891];
  var Arg5891_0 = Arg5891[0];
  return (function() {
  return shenjs_call_tail(shen_normalise_type_help, [Arg5891_0]);})},
  1,
  []], Arg5889_0]);})},
  1,
  [],
  "shen-normalise-type"];
shenjs_functions["shen_shen-normalise-type"] = shen_normalise_type;






shen_normalise_type_help = [shen_type_func,
  function shen_user_lambda5894(Arg5893) {
  if (Arg5893.length < 1) return [shen_type_func, shen_user_lambda5894, 1, Arg5893];
  var Arg5893_0 = Arg5893[0];
  return ((shenjs_is_type(Arg5893_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_normalise_X, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5896(Arg5895) {
  if (Arg5895.length < 1) return [shen_type_func, shen_user_lambda5896, 1, Arg5895];
  var Arg5895_0 = Arg5895[0];
  return (function() {
  return shenjs_call_tail(shen_normalise_type_help, [Arg5895_0]);})},
  1,
  []], Arg5893_0])]);})
  : (function() {
  return shenjs_call_tail(shen_normalise_X, [Arg5893_0]);}))},
  1,
  [],
  "shen-normalise-type-help"];
shenjs_functions["shen_shen-normalise-type-help"] = shen_normalise_type_help;






shen_normalise_X = [shen_type_func,
  function shen_user_lambda5898(Arg5897) {
  if (Arg5897.length < 1) return [shen_type_func, shen_user_lambda5898, 1, Arg5897];
  var Arg5897_0 = Arg5897[0];
  var R0;
  return ((R0 = shenjs_call(shen_assoc, [Arg5897_0, (shenjs_globals["shen_shen-*synonyms*"])])),
  ((shenjs_empty$question$(R0))
  ? Arg5897_0
  : R0[2]))},
  1,
  [],
  "shen-normalise-X"];
shenjs_functions["shen_shen-normalise-X"] = shen_normalise_X;






shen_variancy_test = [shen_type_func,
  function shen_user_lambda5900(Arg5899) {
  if (Arg5899.length < 2) return [shen_type_func, shen_user_lambda5900, 2, Arg5899];
  var Arg5899_0 = Arg5899[0], Arg5899_1 = Arg5899[1];
  var R0;
  return ((R0 = shenjs_call(shen_typecheck, [Arg5899_0, [shen_type_symbol, "B"]])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R0)))
  ? [shen_type_symbol, "shen-skip"]
  : ((shenjs_call(shen_variant$question$, [R0, Arg5899_1]))
  ? [shen_type_symbol, "shen-skip"]
  : shenjs_call(shen_intoutput, ["warning: changing the type of ~A may create errors~%", [shen_tuple, Arg5899_0, []]]))),
  [shen_type_symbol, "shen-skip"])},
  2,
  [],
  "shen-variancy-test"];
shenjs_functions["shen_shen-variancy-test"] = shen_variancy_test;






shen_variant$question$ = [shen_type_func,
  function shen_user_lambda5902(Arg5901) {
  if (Arg5901.length < 2) return [shen_type_func, shen_user_lambda5902, 2, Arg5901];
  var Arg5901_0 = Arg5901[0], Arg5901_1 = Arg5901[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5901_1, Arg5901_0)))
  ? true
  : (((shenjs_is_type(Arg5901_0, shen_type_cons) && (shenjs_is_type(Arg5901_1, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5901_1[1], Arg5901_0[1])))))
  ? (function() {
  return shenjs_call_tail(shen_variant$question$, [Arg5901_0[2], Arg5901_1[2]]);})
  : (((shenjs_is_type(Arg5901_0, shen_type_cons) && (shenjs_is_type(Arg5901_1, shen_type_cons) && (shenjs_call(shen_pvar$question$, [Arg5901_0[1]]) && shenjs_call(shen_variable$question$, [Arg5901_1[1]])))))
  ? (function() {
  return shenjs_call_tail(shen_variant$question$, [shenjs_call(shen_subst, [[shen_type_symbol, "shen-a"], Arg5901_0[1], Arg5901_0[2]]), shenjs_call(shen_subst, [[shen_type_symbol, "shen-a"], Arg5901_1[1], Arg5901_1[2]])]);})
  : (((shenjs_is_type(Arg5901_0, shen_type_cons) && (shenjs_is_type(Arg5901_0[1], shen_type_cons) && (shenjs_is_type(Arg5901_1, shen_type_cons) && shenjs_is_type(Arg5901_1[1], shen_type_cons)))))
  ? (function() {
  return shenjs_call_tail(shen_variant$question$, [shenjs_call(shen_append, [Arg5901_0[1], Arg5901_0[2]]), shenjs_call(shen_append, [Arg5901_1[1], Arg5901_1[2]])]);})
  : false))))},
  2,
  [],
  "shen-variant?"];
shenjs_functions["shen_shen-variant?"] = shen_variant$question$;






shenjs_call(shen_declare, [[shen_type_symbol, "absvector?"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "adjoin"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "boolean"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "boolean"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "append"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "arity"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "number"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "assoc"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "boolean?"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "bound?"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "cd"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "string"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "close"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "stream"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "B"], []]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "cn"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "string"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "concat"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "symbol"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "destroy"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "B"], []]]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "B"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "difference"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "do"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "B"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "element?"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "empty?"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "enable-type-theory"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "external"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "symbol"], []]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "interror"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "B"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "error-to-string"], [shen_type_cons, [shen_type_symbol, "exception"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "string"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "explode"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "string"], []]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "fail-if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "symbol"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "fix"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "A"], []]]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "A"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "format"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "stream"], [shen_type_cons, [shen_type_symbol, "out"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "string"], []]]], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "freeze"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "lazy"], [shen_type_cons, [shen_type_symbol, "A"], []]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "fst"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, [shen_type_symbol, "B"], []]]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "A"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "gensym"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "symbol"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "A"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, [shen_type_symbol, "A"], []]], []]]], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "vector"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, [shen_type_symbol, "A"], []]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "number"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "hash"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "number"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "head"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "A"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "hdv"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "A"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "hdstr"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "string"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "if"], [shen_type_cons, [shen_type_symbol, "boolean"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "A"], []]]], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "include"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "symbol"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "symbol"], []]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "include-all-but"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "symbol"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "symbol"], []]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "inferences"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "number"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "integer?"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "intersection"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "length"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "number"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "limit"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "number"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "load"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "symbol"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "intmake-string"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "string"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "map"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "B"], []]]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "B"], []]], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "mapcan"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "B"], []]], []]]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "B"], []]], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "maxinferences"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "number"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "n->string"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "string"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "nl"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "number"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "not"], [shen_type_cons, [shen_type_symbol, "boolean"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "nth"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "A"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "number?"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "occurrences"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "number"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "occurs-check"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "or"], [shen_type_cons, [shen_type_symbol, "boolean"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "boolean"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "intoutput"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "string"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "pos"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "string"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "pr"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "stream"], [shen_type_cons, [shen_type_symbol, "out"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "string"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "print"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "A"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "profile"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "B"], []]]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "B"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "preclude"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "symbol"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "symbol"], []]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "profile-results"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "symbol"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "protect"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "symbol"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "preclude-all-but"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "symbol"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "symbol"], []]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "read-byte"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "stream"], [shen_type_cons, [shen_type_symbol, "in"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "number"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "read-file"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "unit"], []]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "read-file-as-bytelist"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "number"], []]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "read-file-as-string"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "string"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "remove"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "reverse"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "simple-error"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "A"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "snd"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, [shen_type_symbol, "B"], []]]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "B"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "specialise"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "symbol"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "spy"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "step"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "stinput"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "stream"], [shen_type_cons, [shen_type_symbol, "in"], []]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "shen-stoutput"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "stream"], [shen_type_cons, [shen_type_symbol, "out"], []]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "string?"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "sum"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "number"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "number"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "str"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "string"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "string->n"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "number"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "symbol?"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "systemf"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "symbol"], []]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "tail"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "tlstr"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "string"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "tlv"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, [shen_type_symbol, "A"], []]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "tc"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "tc?"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "thaw"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "lazy"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "A"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "track"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "symbol"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "trap-error"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "exception"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "A"], []]]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "A"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "tuple?"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "union"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "A"], []]], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "unprofile"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "B"], []]]], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "B"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "untrack"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "symbol"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "unspecialise"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "symbol"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "variable?"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "vector?"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "version"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "string"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "write-to-file"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "A"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "y-or-n?"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, ">"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "<"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, ">="], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "<="], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "+"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "number"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "/"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "number"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "-"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "number"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "*"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "number"], []]]], []]]]]);





shenjs_call(shen_declare, [[shen_type_symbol, "=="], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "boolean"], []]]], []]]]]);











shen_typecheck = [shen_type_func,
  function shen_user_lambda5437(Arg5436) {
  if (Arg5436.length < 2) return [shen_type_func, shen_user_lambda5437, 2, Arg5436];
  var Arg5436_0 = Arg5436[0], Arg5436_1 = Arg5436[1];
  var R0, R1, R2, R3;
  return ((R0 = shenjs_call(shen_curry, [Arg5436_0])),
  (R1 = shenjs_call(shen_start_new_prolog_process, [])),
  (R2 = shenjs_call(shen_insert_prolog_variables, [shenjs_call(shen_normalise_type, [shenjs_call(shen_curry_type, [Arg5436_1])]), R1])),
  (R3 = (new Shenjs_freeze([R0, R2, R1], function(Arg5438) {
  var Arg5438_0 = Arg5438[0], Arg5438_1 = Arg5438[1], Arg5438_2 = Arg5438[2];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_return, [Arg5438_1, Arg5438_2, [shen_type_symbol, "shen-void"]]);});})}))),
  (function() {
  return shenjs_call_tail(shen_t$asterisk$, [[shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, R2, []]]], [], R1, R3]);}))},
  2,
  [],
  "shen-typecheck"];
shenjs_functions["shen_shen-typecheck"] = shen_typecheck;






shen_curry = [shen_type_func,
  function shen_user_lambda5441(Arg5440) {
  if (Arg5440.length < 1) return [shen_type_func, shen_user_lambda5441, 1, Arg5440];
  var Arg5440_0 = Arg5440[0];
  return (((shenjs_is_type(Arg5440_0, shen_type_cons) && shenjs_call(shen_special$question$, [Arg5440_0[1]])))
  ? [shen_type_cons, Arg5440_0[1], shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5443(Arg5442) {
  if (Arg5442.length < 1) return [shen_type_func, shen_user_lambda5443, 1, Arg5442];
  var Arg5442_0 = Arg5442[0];
  return (function() {
  return shenjs_call_tail(shen_curry, [Arg5442_0]);})},
  1,
  []], Arg5440_0[2]])]
  : (((shenjs_is_type(Arg5440_0, shen_type_cons) && (shenjs_is_type(Arg5440_0[2], shen_type_cons) && shenjs_call(shen_extraspecial$question$, [Arg5440_0[1]]))))
  ? Arg5440_0
  : (((shenjs_is_type(Arg5440_0, shen_type_cons) && (shenjs_is_type(Arg5440_0[2], shen_type_cons) && shenjs_is_type(Arg5440_0[2][2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_curry, [[shen_type_cons, [shen_type_cons, Arg5440_0[1], [shen_type_cons, Arg5440_0[2][1], []]], Arg5440_0[2][2]]]);})
  : (((shenjs_is_type(Arg5440_0, shen_type_cons) && (shenjs_is_type(Arg5440_0[2], shen_type_cons) && shenjs_empty$question$(Arg5440_0[2][2]))))
  ? [shen_type_cons, shenjs_call(shen_curry, [Arg5440_0[1]]), [shen_type_cons, shenjs_call(shen_curry, [Arg5440_0[2][1]]), []]]
  : Arg5440_0))))},
  1,
  [],
  "shen-curry"];
shenjs_functions["shen_shen-curry"] = shen_curry;






shen_special$question$ = [shen_type_func,
  function shen_user_lambda5445(Arg5444) {
  if (Arg5444.length < 1) return [shen_type_func, shen_user_lambda5445, 1, Arg5444];
  var Arg5444_0 = Arg5444[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5444_0, (shenjs_globals["shen_shen-*special*"])]);})},
  1,
  [],
  "shen-special?"];
shenjs_functions["shen_shen-special?"] = shen_special$question$;






shen_extraspecial$question$ = [shen_type_func,
  function shen_user_lambda5447(Arg5446) {
  if (Arg5446.length < 1) return [shen_type_func, shen_user_lambda5447, 1, Arg5446];
  var Arg5446_0 = Arg5446[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5446_0, (shenjs_globals["shen_shen-*extraspecial*"])]);})},
  1,
  [],
  "shen-extraspecial?"];
shenjs_functions["shen_shen-extraspecial?"] = shen_extraspecial$question$;






shen_t$asterisk$ = [shen_type_func,
  function shen_user_lambda5449(Arg5448) {
  if (Arg5448.length < 4) return [shen_type_func, shen_user_lambda5449, 4, Arg5448];
  var Arg5448_0 = Arg5448[0], Arg5448_1 = Arg5448[1], Arg5448_2 = Arg5448[2], Arg5448_3 = Arg5448[3];
  var R0, R1, R2, R3;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = ((R1 = shenjs_call(shen_newpv, [Arg5448_2])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_call(shen_maxinfexceeded$question$, []), Arg5448_2, (new Shenjs_freeze([R1, Arg5448_2, Arg5448_3, R0, Arg5448_0, Arg5448_1, Arg5448_2, Arg5448_3], function(Arg5450) {
  var Arg5450_0 = Arg5450[0], Arg5450_1 = Arg5450[1], Arg5450_2 = Arg5450[2], Arg5450_3 = Arg5450[3], Arg5450_4 = Arg5450[4], Arg5450_5 = Arg5450[5], Arg5450_6 = Arg5450[6], Arg5450_7 = Arg5450[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5450_0, shenjs_call(shen_errormaxinfs, []), Arg5450_1, Arg5450_2]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5448_0, Arg5448_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fail"], R1)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5448_2, (new Shenjs_freeze([R0, Arg5448_0, Arg5448_1, Arg5448_2, Arg5448_3], function(Arg5452) {
  var Arg5452_0 = Arg5452[0], Arg5452_1 = Arg5452[1], Arg5452_2 = Arg5452[2], Arg5452_3 = Arg5452[3], Arg5452_4 = Arg5452[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_prolog_failure, [Arg5452_3, Arg5452_4]);});})}))]))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5448_0, Arg5448_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5448_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[1], Arg5448_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg5448_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5448_2])),
  ((shenjs_empty$question$(R3))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_call(shen_type_theory_enabled$question$, []), Arg5448_2, (new Shenjs_freeze([R0, R2, R1, Arg5448_0, Arg5448_1, Arg5448_2, Arg5448_3], function(Arg5454) {
  var Arg5454_0 = Arg5454[0], Arg5454_1 = Arg5454[1], Arg5454_2 = Arg5454[2], Arg5454_3 = Arg5454[3], Arg5454_4 = Arg5454[4], Arg5454_5 = Arg5454[5], Arg5454_6 = Arg5454[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5454_0, Arg5454_5, (new Shenjs_freeze([Arg5454_0, Arg5454_1, Arg5454_2, Arg5454_4, Arg5454_5, Arg5454_6], function(Arg5456) {
  var Arg5456_0 = Arg5456[0], Arg5456_1 = Arg5456[1], Arg5456_2 = Arg5456[2], Arg5456_3 = Arg5456[3], Arg5456_4 = Arg5456[4], Arg5456_5 = Arg5456[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5456_1, Arg5456_2, Arg5456_3, Arg5456_4, Arg5456_5]);});})}))]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5448_2])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_show, [Arg5448_0, Arg5448_1, Arg5448_2, (new Shenjs_freeze([Arg5448_0, Arg5448_1, R1, Arg5448_2, Arg5448_3], function(Arg5458) {
  var Arg5458_0 = Arg5458[0], Arg5458_1 = Arg5458[1], Arg5458_2 = Arg5458[2], Arg5458_3 = Arg5458[3], Arg5458_4 = Arg5458[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5458_2, (shenjs_globals["shen_shen-*datatypes*"]), Arg5458_3, (new Shenjs_freeze([Arg5458_0, Arg5458_1, Arg5458_2, Arg5458_3, Arg5458_4], function(Arg5460) {
  var Arg5460_0 = Arg5460[0], Arg5460_1 = Arg5460[1], Arg5460_2 = Arg5460[2], Arg5460_3 = Arg5460[3], Arg5460_4 = Arg5460[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_udefs$asterisk$, [Arg5460_0, Arg5460_1, Arg5460_2, Arg5460_3, Arg5460_4]);});})}))]);});})}))]))
  : R1))
  : R1))
  : R1))]);}))},
  4,
  [],
  "shen-t*"];
shenjs_functions["shen_shen-t*"] = shen_t$asterisk$;






shen_type_theory_enabled$question$ = [shen_type_func,
  function shen_user_lambda5463(Arg5462) {
  if (Arg5462.length < 0) return [shen_type_func, shen_user_lambda5463, 0, Arg5462];
  return (shenjs_globals["shen_shen-*shen-type-theory-enabled?*"])},
  0,
  [],
  "shen-type-theory-enabled?"];
shenjs_functions["shen_shen-type-theory-enabled?"] = shen_type_theory_enabled$question$;






shen_enable_type_theory = [shen_type_func,
  function shen_user_lambda5465(Arg5464) {
  if (Arg5464.length < 1) return [shen_type_func, shen_user_lambda5465, 1, Arg5464];
  var Arg5464_0 = Arg5464[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg5464_0)))
  ? (shenjs_globals["shen_shen-*shen-type-theory-enabled?*"] = true)
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg5464_0)))
  ? (shenjs_globals["shen_shen-*shen-type-theory-enabled?*"] = false)
  : (function() {
  return shenjs_call_tail(shen_interror, ["enable-type-theory expects a + or a -~%", []]);})))},
  1,
  [],
  "enable-type-theory"];
shenjs_functions["shen_enable-type-theory"] = shen_enable_type_theory;






shen_prolog_failure = [shen_type_func,
  function shen_user_lambda5467(Arg5466) {
  if (Arg5466.length < 2) return [shen_type_func, shen_user_lambda5467, 2, Arg5466];
  var Arg5466_0 = Arg5466[0], Arg5466_1 = Arg5466[1];
  return false},
  2,
  [],
  "shen-prolog-failure"];
shenjs_functions["shen_shen-prolog-failure"] = shen_prolog_failure;






shen_maxinfexceeded$question$ = [shen_type_func,
  function shen_user_lambda5469(Arg5468) {
  if (Arg5468.length < 0) return [shen_type_func, shen_user_lambda5469, 0, Arg5468];
  return (shenjs_call(shen_inferences, [[shen_type_symbol, "shen-skip"]]) > (shenjs_globals["shen_shen-*maxinferences*"]))},
  0,
  [],
  "shen-maxinfexceeded?"];
shenjs_functions["shen_shen-maxinfexceeded?"] = shen_maxinfexceeded$question$;






shen_errormaxinfs = [shen_type_func,
  function shen_user_lambda5471(Arg5470) {
  if (Arg5470.length < 0) return [shen_type_func, shen_user_lambda5471, 0, Arg5470];
  return (function() {
  return shenjs_simple_error("maximum inferences exceeded~%");})},
  0,
  [],
  "shen-errormaxinfs"];
shenjs_functions["shen_shen-errormaxinfs"] = shen_errormaxinfs;






shen_udefs$asterisk$ = [shen_type_func,
  function shen_user_lambda5473(Arg5472) {
  if (Arg5472.length < 5) return [shen_type_func, shen_user_lambda5473, 5, Arg5472];
  var Arg5472_0 = Arg5472[0], Arg5472_1 = Arg5472[1], Arg5472_2 = Arg5472[2], Arg5472_3 = Arg5472[3], Arg5472_4 = Arg5472[4];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5472_2, Arg5472_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R0 = R0[1]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_call, [[shen_type_cons, R0, [shen_type_cons, Arg5472_0, [shen_type_cons, Arg5472_1, []]]], Arg5472_3, Arg5472_4]))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5472_2, Arg5472_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_udefs$asterisk$, [Arg5472_0, Arg5472_1, R0, Arg5472_3, Arg5472_4]);}))
  : false))
  : R0))},
  5,
  [],
  "shen-udefs*"];
shenjs_functions["shen_shen-udefs*"] = shen_udefs$asterisk$;






shen_th$asterisk$ = [shen_type_func,
  function shen_user_lambda5475(Arg5474) {
  if (Arg5474.length < 5) return [shen_type_func, shen_user_lambda5475, 5, Arg5474];
  var Arg5474_0 = Arg5474[0], Arg5474_1 = Arg5474[1], Arg5474_2 = Arg5474[2], Arg5474_3 = Arg5474[3], Arg5474_4 = Arg5474[4];
  var R0, R1, R2, R3, R4, R5, R6, R7, R8;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_show, [[shen_type_cons, Arg5474_0, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5474_1, []]]], Arg5474_2, Arg5474_3, (new Shenjs_freeze([R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5476) {
  var Arg5476_0 = Arg5476[0], Arg5476_1 = Arg5476[1], Arg5476_2 = Arg5476[2], Arg5476_3 = Arg5476[3], Arg5476_4 = Arg5476[4], Arg5476_5 = Arg5476[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [false, Arg5476_4, Arg5476_5]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_call(shen_typedf$question$, [shenjs_call(shen_lazyderef, [Arg5474_0, Arg5474_3])]), Arg5474_3, (new Shenjs_freeze([Arg5474_0, R1, Arg5474_1, Arg5474_3, Arg5474_4, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5478) {
  var Arg5478_0 = Arg5478[0], Arg5478_1 = Arg5478[1], Arg5478_2 = Arg5478[2], Arg5478_3 = Arg5478[3], Arg5478_4 = Arg5478[4], Arg5478_5 = Arg5478[5], Arg5478_6 = Arg5478[6], Arg5478_7 = Arg5478[7], Arg5478_8 = Arg5478[8], Arg5478_9 = Arg5478[9], Arg5478_10 = Arg5478[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5478_1, shenjs_call(shen_sigf, [shenjs_call(shen_lazyderef, [Arg5478_0, Arg5478_3])]), Arg5478_3, (new Shenjs_freeze([Arg5478_0, Arg5478_1, Arg5478_2, Arg5478_3, Arg5478_4], function(Arg5480) {
  var Arg5480_0 = Arg5480[0], Arg5480_1 = Arg5480[1], Arg5480_2 = Arg5480[2], Arg5480_3 = Arg5480[3], Arg5480_4 = Arg5480[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_call, [[shen_type_cons, Arg5480_1, [shen_type_cons, Arg5480_2, []]], Arg5480_3, Arg5480_4]);});})}))]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_base, [Arg5474_0, Arg5474_1, Arg5474_3, Arg5474_4]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_by$_hypothesis, [Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5474_0, Arg5474_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5474_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R3 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5474_3])),
  ((shenjs_empty$question$(R1))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R2, [shen_type_cons, R1, [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, Arg5474_1, []]]], Arg5474_2, Arg5474_3, (new Shenjs_freeze([R2, Arg5474_1, R3, R1, Arg5474_2, Arg5474_3, Arg5474_4, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5482) {
  var Arg5482_0 = Arg5482[0], Arg5482_1 = Arg5482[1], Arg5482_2 = Arg5482[2], Arg5482_3 = Arg5482[3], Arg5482_4 = Arg5482[4], Arg5482_5 = Arg5482[5], Arg5482_6 = Arg5482[6], Arg5482_7 = Arg5482[7], Arg5482_8 = Arg5482[8], Arg5482_9 = Arg5482[9], Arg5482_10 = Arg5482[10], Arg5482_11 = Arg5482[11], Arg5482_12 = Arg5482[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5482_2, Arg5482_3, Arg5482_4, Arg5482_5, Arg5482_6]);});})}))]))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5474_0, Arg5474_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5474_1, Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "list"], R4)))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R4, shen_type_cons))
  ? ((R2 = R4[1]),
  (R4 = shenjs_call(shen_lazyderef, [R4[2], Arg5474_3])),
  ((shenjs_empty$question$(R4))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R3, R2, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5484) {
  var Arg5484_0 = Arg5484[0], Arg5484_1 = Arg5484[1], Arg5484_2 = Arg5484[2], Arg5484_3 = Arg5484[3], Arg5484_4 = Arg5484[4], Arg5484_5 = Arg5484[5], Arg5484_6 = Arg5484[6], Arg5484_7 = Arg5484[7], Arg5484_8 = Arg5484[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5484_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5484_2, []]], Arg5484_6, Arg5484_7, Arg5484_8]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [], Arg5474_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R3, R2, R4, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5486) {
  var Arg5486_0 = Arg5486[0], Arg5486_1 = Arg5486[1], Arg5486_2 = Arg5486[2], Arg5486_3 = Arg5486[3], Arg5486_4 = Arg5486[4], Arg5486_5 = Arg5486[5], Arg5486_6 = Arg5486[6], Arg5486_7 = Arg5486[7], Arg5486_8 = Arg5486[8], Arg5486_9 = Arg5486[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5486_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5486_2, []]], Arg5486_7, Arg5486_8, Arg5486_9]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg5474_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_bindv, [R4, [shen_type_cons, R2, []], Arg5474_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R3, R2, Arg5474_2, Arg5474_4, R4, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5488) {
  var Arg5488_0 = Arg5488[0], Arg5488_1 = Arg5488[1], Arg5488_2 = Arg5488[2], Arg5488_3 = Arg5488[3], Arg5488_4 = Arg5488[4], Arg5488_5 = Arg5488[5], Arg5488_6 = Arg5488[6], Arg5488_7 = Arg5488[7], Arg5488_8 = Arg5488[8], Arg5488_9 = Arg5488[9], Arg5488_10 = Arg5488[10], Arg5488_11 = Arg5488[11], Arg5488_12 = Arg5488[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5488_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5488_2, []]], Arg5488_3, Arg5488_6, Arg5488_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg5474_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [shen_type_symbol, "list"], Arg5474_3]),
  (R3 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R3, R5, R4, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5490) {
  var Arg5490_0 = Arg5490[0], Arg5490_1 = Arg5490[1], Arg5490_2 = Arg5490[2], Arg5490_3 = Arg5490[3], Arg5490_4 = Arg5490[4], Arg5490_5 = Arg5490[5], Arg5490_6 = Arg5490[6], Arg5490_7 = Arg5490[7], Arg5490_8 = Arg5490[8], Arg5490_9 = Arg5490[9], Arg5490_10 = Arg5490[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5490_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5490_2, []]], Arg5490_8, Arg5490_4, Arg5490_9]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg5474_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R3, R5, R2, R4, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5492) {
  var Arg5492_0 = Arg5492[0], Arg5492_1 = Arg5492[1], Arg5492_2 = Arg5492[2], Arg5492_3 = Arg5492[3], Arg5492_4 = Arg5492[4], Arg5492_5 = Arg5492[5], Arg5492_6 = Arg5492[6], Arg5492_7 = Arg5492[7], Arg5492_8 = Arg5492[8], Arg5492_9 = Arg5492[9], Arg5492_10 = Arg5492[10], Arg5492_11 = Arg5492[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5492_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5492_2, []]], Arg5492_9, Arg5492_5, Arg5492_10]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5474_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R5, []], Arg5474_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R3, R5, Arg5474_2, Arg5474_4, R2, Arg5474_3, R4, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5494) {
  var Arg5494_0 = Arg5494[0], Arg5494_1 = Arg5494[1], Arg5494_2 = Arg5494[2], Arg5494_3 = Arg5494[3], Arg5494_4 = Arg5494[4], Arg5494_5 = Arg5494[5], Arg5494_6 = Arg5494[6], Arg5494_7 = Arg5494[7], Arg5494_8 = Arg5494[8], Arg5494_9 = Arg5494[9], Arg5494_10 = Arg5494[10], Arg5494_11 = Arg5494[11], Arg5494_12 = Arg5494[12], Arg5494_13 = Arg5494[13], Arg5494_14 = Arg5494[14];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5494_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5494_2, []]], Arg5494_3, Arg5494_6, Arg5494_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5474_3]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R4, Arg5474_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, R4, []]], Arg5474_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R3, R4, Arg5474_2, Arg5474_4, R2, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5496) {
  var Arg5496_0 = Arg5496[0], Arg5496_1 = Arg5496[1], Arg5496_2 = Arg5496[2], Arg5496_3 = Arg5496[3], Arg5496_4 = Arg5496[4], Arg5496_5 = Arg5496[5], Arg5496_6 = Arg5496[6], Arg5496_7 = Arg5496[7], Arg5496_8 = Arg5496[8], Arg5496_9 = Arg5496[9], Arg5496_10 = Arg5496[10], Arg5496_11 = Arg5496[11], Arg5496_12 = Arg5496[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5496_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5496_2, []]], Arg5496_3, Arg5496_6, Arg5496_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5474_3]),
  R4)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5474_0, Arg5474_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@p"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5474_1, Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R2[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "*"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R2 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg5474_3])),
  ((shenjs_empty$question$(R5))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R4, R3, R2, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5498) {
  var Arg5498_0 = Arg5498[0], Arg5498_1 = Arg5498[1], Arg5498_2 = Arg5498[2], Arg5498_3 = Arg5498[3], Arg5498_4 = Arg5498[4], Arg5498_5 = Arg5498[5], Arg5498_6 = Arg5498[6], Arg5498_7 = Arg5498[7], Arg5498_8 = Arg5498[8], Arg5498_9 = Arg5498[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5498_2, Arg5498_3, Arg5498_7, Arg5498_8, Arg5498_9]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg5474_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R4, R3, R2, R5, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5500) {
  var Arg5500_0 = Arg5500[0], Arg5500_1 = Arg5500[1], Arg5500_2 = Arg5500[2], Arg5500_3 = Arg5500[3], Arg5500_4 = Arg5500[4], Arg5500_5 = Arg5500[5], Arg5500_6 = Arg5500[6], Arg5500_7 = Arg5500[7], Arg5500_8 = Arg5500[8], Arg5500_9 = Arg5500[9], Arg5500_10 = Arg5500[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5500_2, Arg5500_3, Arg5500_8, Arg5500_9, Arg5500_10]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg5474_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, R2, []], Arg5474_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R4, R3, R2, Arg5474_2, Arg5474_4, R5, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5502) {
  var Arg5502_0 = Arg5502[0], Arg5502_1 = Arg5502[1], Arg5502_2 = Arg5502[2], Arg5502_3 = Arg5502[3], Arg5502_4 = Arg5502[4], Arg5502_5 = Arg5502[5], Arg5502_6 = Arg5502[6], Arg5502_7 = Arg5502[7], Arg5502_8 = Arg5502[8], Arg5502_9 = Arg5502[9], Arg5502_10 = Arg5502[10], Arg5502_11 = Arg5502[11], Arg5502_12 = Arg5502[12], Arg5502_13 = Arg5502[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5502_2, Arg5502_3, Arg5502_4, Arg5502_7, Arg5502_5]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg5474_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [shen_type_symbol, "*"], Arg5474_3]),
  (R4 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R6 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R4, R3, R6, R5, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5504) {
  var Arg5504_0 = Arg5504[0], Arg5504_1 = Arg5504[1], Arg5504_2 = Arg5504[2], Arg5504_3 = Arg5504[3], Arg5504_4 = Arg5504[4], Arg5504_5 = Arg5504[5], Arg5504_6 = Arg5504[6], Arg5504_7 = Arg5504[7], Arg5504_8 = Arg5504[8], Arg5504_9 = Arg5504[9], Arg5504_10 = Arg5504[10], Arg5504_11 = Arg5504[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5504_2, Arg5504_3, Arg5504_9, Arg5504_5, Arg5504_10]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg5474_3]),
  (R6 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R4, R3, R6, R2, R5, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5506) {
  var Arg5506_0 = Arg5506[0], Arg5506_1 = Arg5506[1], Arg5506_2 = Arg5506[2], Arg5506_3 = Arg5506[3], Arg5506_4 = Arg5506[4], Arg5506_5 = Arg5506[5], Arg5506_6 = Arg5506[6], Arg5506_7 = Arg5506[7], Arg5506_8 = Arg5506[8], Arg5506_9 = Arg5506[9], Arg5506_10 = Arg5506[10], Arg5506_11 = Arg5506[11], Arg5506_12 = Arg5506[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5506_2, Arg5506_3, Arg5506_10, Arg5506_6, Arg5506_11]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5474_3]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R6, []], Arg5474_3]),
  (R6 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R4, R3, R6, Arg5474_2, Arg5474_4, R2, Arg5474_3, R5, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5508) {
  var Arg5508_0 = Arg5508[0], Arg5508_1 = Arg5508[1], Arg5508_2 = Arg5508[2], Arg5508_3 = Arg5508[3], Arg5508_4 = Arg5508[4], Arg5508_5 = Arg5508[5], Arg5508_6 = Arg5508[6], Arg5508_7 = Arg5508[7], Arg5508_8 = Arg5508[8], Arg5508_9 = Arg5508[9], Arg5508_10 = Arg5508[10], Arg5508_11 = Arg5508[11], Arg5508_12 = Arg5508[12], Arg5508_13 = Arg5508[13], Arg5508_14 = Arg5508[14], Arg5508_15 = Arg5508[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5508_2, Arg5508_3, Arg5508_4, Arg5508_7, Arg5508_5]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5474_3]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5474_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, R5, []]], Arg5474_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R4, R3, R5, Arg5474_2, Arg5474_4, R2, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5510) {
  var Arg5510_0 = Arg5510[0], Arg5510_1 = Arg5510[1], Arg5510_2 = Arg5510[2], Arg5510_3 = Arg5510[3], Arg5510_4 = Arg5510[4], Arg5510_5 = Arg5510[5], Arg5510_6 = Arg5510[6], Arg5510_7 = Arg5510[7], Arg5510_8 = Arg5510[8], Arg5510_9 = Arg5510[9], Arg5510_10 = Arg5510[10], Arg5510_11 = Arg5510[11], Arg5510_12 = Arg5510[12], Arg5510_13 = Arg5510[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5510_2, Arg5510_3, Arg5510_4, Arg5510_7, Arg5510_5]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5474_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg5474_3])),
  (R5 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R4, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, R5, []]]], Arg5474_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R4, R3, R5, Arg5474_2, Arg5474_4, R2, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5512) {
  var Arg5512_0 = Arg5512[0], Arg5512_1 = Arg5512[1], Arg5512_2 = Arg5512[2], Arg5512_3 = Arg5512[3], Arg5512_4 = Arg5512[4], Arg5512_5 = Arg5512[5], Arg5512_6 = Arg5512[6], Arg5512_7 = Arg5512[7], Arg5512_8 = Arg5512[8], Arg5512_9 = Arg5512[9], Arg5512_10 = Arg5512[10], Arg5512_11 = Arg5512[11], Arg5512_12 = Arg5512[12], Arg5512_13 = Arg5512[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5512_2, Arg5512_3, Arg5512_4, Arg5512_7, Arg5512_5]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5474_3]),
  R5)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5474_0, Arg5474_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@v"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5474_1, Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "vector"], R4)))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R4, shen_type_cons))
  ? ((R2 = R4[1]),
  (R4 = shenjs_call(shen_lazyderef, [R4[2], Arg5474_3])),
  ((shenjs_empty$question$(R4))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R3, R2, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5514) {
  var Arg5514_0 = Arg5514[0], Arg5514_1 = Arg5514[1], Arg5514_2 = Arg5514[2], Arg5514_3 = Arg5514[3], Arg5514_4 = Arg5514[4], Arg5514_5 = Arg5514[5], Arg5514_6 = Arg5514[6], Arg5514_7 = Arg5514[7], Arg5514_8 = Arg5514[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5514_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5514_2, []]], Arg5514_6, Arg5514_7, Arg5514_8]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [], Arg5474_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R3, R2, R4, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5516) {
  var Arg5516_0 = Arg5516[0], Arg5516_1 = Arg5516[1], Arg5516_2 = Arg5516[2], Arg5516_3 = Arg5516[3], Arg5516_4 = Arg5516[4], Arg5516_5 = Arg5516[5], Arg5516_6 = Arg5516[6], Arg5516_7 = Arg5516[7], Arg5516_8 = Arg5516[8], Arg5516_9 = Arg5516[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5516_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5516_2, []]], Arg5516_7, Arg5516_8, Arg5516_9]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg5474_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_bindv, [R4, [shen_type_cons, R2, []], Arg5474_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R3, R2, Arg5474_2, Arg5474_4, R4, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5518) {
  var Arg5518_0 = Arg5518[0], Arg5518_1 = Arg5518[1], Arg5518_2 = Arg5518[2], Arg5518_3 = Arg5518[3], Arg5518_4 = Arg5518[4], Arg5518_5 = Arg5518[5], Arg5518_6 = Arg5518[6], Arg5518_7 = Arg5518[7], Arg5518_8 = Arg5518[8], Arg5518_9 = Arg5518[9], Arg5518_10 = Arg5518[10], Arg5518_11 = Arg5518[11], Arg5518_12 = Arg5518[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5518_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5518_2, []]], Arg5518_3, Arg5518_6, Arg5518_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg5474_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [shen_type_symbol, "vector"], Arg5474_3]),
  (R3 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R3, R5, R4, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5520) {
  var Arg5520_0 = Arg5520[0], Arg5520_1 = Arg5520[1], Arg5520_2 = Arg5520[2], Arg5520_3 = Arg5520[3], Arg5520_4 = Arg5520[4], Arg5520_5 = Arg5520[5], Arg5520_6 = Arg5520[6], Arg5520_7 = Arg5520[7], Arg5520_8 = Arg5520[8], Arg5520_9 = Arg5520[9], Arg5520_10 = Arg5520[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5520_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5520_2, []]], Arg5520_8, Arg5520_4, Arg5520_9]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg5474_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R3, R5, R2, R4, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5522) {
  var Arg5522_0 = Arg5522[0], Arg5522_1 = Arg5522[1], Arg5522_2 = Arg5522[2], Arg5522_3 = Arg5522[3], Arg5522_4 = Arg5522[4], Arg5522_5 = Arg5522[5], Arg5522_6 = Arg5522[6], Arg5522_7 = Arg5522[7], Arg5522_8 = Arg5522[8], Arg5522_9 = Arg5522[9], Arg5522_10 = Arg5522[10], Arg5522_11 = Arg5522[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5522_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5522_2, []]], Arg5522_9, Arg5522_5, Arg5522_10]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5474_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R5, []], Arg5474_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R3, R5, Arg5474_2, Arg5474_4, R2, Arg5474_3, R4, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5524) {
  var Arg5524_0 = Arg5524[0], Arg5524_1 = Arg5524[1], Arg5524_2 = Arg5524[2], Arg5524_3 = Arg5524[3], Arg5524_4 = Arg5524[4], Arg5524_5 = Arg5524[5], Arg5524_6 = Arg5524[6], Arg5524_7 = Arg5524[7], Arg5524_8 = Arg5524[8], Arg5524_9 = Arg5524[9], Arg5524_10 = Arg5524[10], Arg5524_11 = Arg5524[11], Arg5524_12 = Arg5524[12], Arg5524_13 = Arg5524[13], Arg5524_14 = Arg5524[14];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5524_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5524_2, []]], Arg5524_3, Arg5524_6, Arg5524_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5474_3]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R4, Arg5474_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, R4, []]], Arg5474_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R3, R4, Arg5474_2, Arg5474_4, R2, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5526) {
  var Arg5526_0 = Arg5526[0], Arg5526_1 = Arg5526[1], Arg5526_2 = Arg5526[2], Arg5526_3 = Arg5526[3], Arg5526_4 = Arg5526[4], Arg5526_5 = Arg5526[5], Arg5526_6 = Arg5526[6], Arg5526_7 = Arg5526[7], Arg5526_8 = Arg5526[8], Arg5526_9 = Arg5526[9], Arg5526_10 = Arg5526[10], Arg5526_11 = Arg5526[11], Arg5526_12 = Arg5526[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5526_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5526_2, []]], Arg5526_3, Arg5526_6, Arg5526_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5474_3]),
  R4)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5474_0, Arg5474_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5474_1, Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "string"], R2)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, [shen_type_symbol, "string"], Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5528) {
  var Arg5528_0 = Arg5528[0], Arg5528_1 = Arg5528[1], Arg5528_2 = Arg5528[2], Arg5528_3 = Arg5528[3], Arg5528_4 = Arg5528[4], Arg5528_5 = Arg5528[5], Arg5528_6 = Arg5528[6], Arg5528_7 = Arg5528[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5528_1, [shen_type_symbol, "string"], Arg5528_5, Arg5528_6, Arg5528_7]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [shen_type_symbol, "string"], Arg5474_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, [shen_type_symbol, "string"], Arg5474_2, Arg5474_3, (new Shenjs_freeze([R1, R3, R2, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5530) {
  var Arg5530_0 = Arg5530[0], Arg5530_1 = Arg5530[1], Arg5530_2 = Arg5530[2], Arg5530_3 = Arg5530[3], Arg5530_4 = Arg5530[4], Arg5530_5 = Arg5530[5], Arg5530_6 = Arg5530[6], Arg5530_7 = Arg5530[7], Arg5530_8 = Arg5530[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5530_1, [shen_type_symbol, "string"], Arg5530_6, Arg5530_7, Arg5530_8]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5474_3]),
  R3)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5474_0, Arg5474_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "lambda"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5474_1, Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R2[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-->"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R2 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg5474_3])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5474_3])),
  (R6 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5474_3, (new Shenjs_freeze([R0, R1, R3, R5, R2, R6, R4, Arg5474_2, Arg5474_3, Arg5474_4, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5532) {
  var Arg5532_0 = Arg5532[0], Arg5532_1 = Arg5532[1], Arg5532_2 = Arg5532[2], Arg5532_3 = Arg5532[3], Arg5532_4 = Arg5532[4], Arg5532_5 = Arg5532[5], Arg5532_6 = Arg5532[6], Arg5532_7 = Arg5532[7], Arg5532_8 = Arg5532[8], Arg5532_9 = Arg5532[9], Arg5532_10 = Arg5532[10], Arg5532_11 = Arg5532[11], Arg5532_12 = Arg5532[12], Arg5532_13 = Arg5532[13], Arg5532_14 = Arg5532[14], Arg5532_15 = Arg5532[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5532_5, shenjs_call(shen_placeholder, []), Arg5532_8, (new Shenjs_freeze([Arg5532_1, Arg5532_2, Arg5532_3, Arg5532_4, Arg5532_5, Arg5532_6, Arg5532_7, Arg5532_8, Arg5532_9], function(Arg5534) {
  var Arg5534_0 = Arg5534[0], Arg5534_1 = Arg5534[1], Arg5534_2 = Arg5534[2], Arg5534_3 = Arg5534[3], Arg5534_4 = Arg5534[4], Arg5534_5 = Arg5534[5], Arg5534_6 = Arg5534[6], Arg5534_7 = Arg5534[7], Arg5534_8 = Arg5534[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5534_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5534_4, Arg5534_7]), shenjs_call(shen_lazyderef, [Arg5534_0, Arg5534_7]), shenjs_call(shen_lazyderef, [Arg5534_1, Arg5534_7])]), Arg5534_7, (new Shenjs_freeze([Arg5534_0, Arg5534_1, Arg5534_2, Arg5534_3, Arg5534_4, Arg5534_5, Arg5534_6, Arg5534_7, Arg5534_8], function(Arg5536) {
  var Arg5536_0 = Arg5536[0], Arg5536_1 = Arg5536[1], Arg5536_2 = Arg5536[2], Arg5536_3 = Arg5536[3], Arg5536_4 = Arg5536[4], Arg5536_5 = Arg5536[5], Arg5536_6 = Arg5536[6], Arg5536_7 = Arg5536[7], Arg5536_8 = Arg5536[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5536_2, Arg5536_3, [shen_type_cons, [shen_type_cons, Arg5536_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5536_5, []]]], Arg5536_6], Arg5536_7, Arg5536_8]);});})}))]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg5474_3]),
  (R4 = ((R6 = shenjs_call(shen_newpv, [Arg5474_3])),
  (R7 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5474_3, (new Shenjs_freeze([R0, R1, R3, R6, R2, R7, R4, Arg5474_2, Arg5474_3, Arg5474_4, R5, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5538) {
  var Arg5538_0 = Arg5538[0], Arg5538_1 = Arg5538[1], Arg5538_2 = Arg5538[2], Arg5538_3 = Arg5538[3], Arg5538_4 = Arg5538[4], Arg5538_5 = Arg5538[5], Arg5538_6 = Arg5538[6], Arg5538_7 = Arg5538[7], Arg5538_8 = Arg5538[8], Arg5538_9 = Arg5538[9], Arg5538_10 = Arg5538[10], Arg5538_11 = Arg5538[11], Arg5538_12 = Arg5538[12], Arg5538_13 = Arg5538[13], Arg5538_14 = Arg5538[14], Arg5538_15 = Arg5538[15], Arg5538_16 = Arg5538[16], Arg5538_17 = Arg5538[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5538_5, shenjs_call(shen_placeholder, []), Arg5538_8, (new Shenjs_freeze([Arg5538_1, Arg5538_2, Arg5538_3, Arg5538_4, Arg5538_5, Arg5538_6, Arg5538_7, Arg5538_8, Arg5538_9], function(Arg5540) {
  var Arg5540_0 = Arg5540[0], Arg5540_1 = Arg5540[1], Arg5540_2 = Arg5540[2], Arg5540_3 = Arg5540[3], Arg5540_4 = Arg5540[4], Arg5540_5 = Arg5540[5], Arg5540_6 = Arg5540[6], Arg5540_7 = Arg5540[7], Arg5540_8 = Arg5540[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5540_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5540_4, Arg5540_7]), shenjs_call(shen_lazyderef, [Arg5540_0, Arg5540_7]), shenjs_call(shen_lazyderef, [Arg5540_1, Arg5540_7])]), Arg5540_7, (new Shenjs_freeze([Arg5540_0, Arg5540_1, Arg5540_2, Arg5540_3, Arg5540_4, Arg5540_5, Arg5540_6, Arg5540_7, Arg5540_8], function(Arg5542) {
  var Arg5542_0 = Arg5542[0], Arg5542_1 = Arg5542[1], Arg5542_2 = Arg5542[2], Arg5542_3 = Arg5542[3], Arg5542_4 = Arg5542[4], Arg5542_5 = Arg5542[5], Arg5542_6 = Arg5542[6], Arg5542_7 = Arg5542[7], Arg5542_8 = Arg5542[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5542_2, Arg5542_3, [shen_type_cons, [shen_type_cons, Arg5542_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5542_5, []]]], Arg5542_6], Arg5542_7, Arg5542_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg5474_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, R2, []], Arg5474_3]),
  (R4 = ((R6 = shenjs_call(shen_newpv, [Arg5474_3])),
  (R7 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5474_3, (new Shenjs_freeze([R0, R1, R3, R6, R2, R7, R4, Arg5474_2, Arg5474_3, Arg5474_4, R5, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5544) {
  var Arg5544_0 = Arg5544[0], Arg5544_1 = Arg5544[1], Arg5544_2 = Arg5544[2], Arg5544_3 = Arg5544[3], Arg5544_4 = Arg5544[4], Arg5544_5 = Arg5544[5], Arg5544_6 = Arg5544[6], Arg5544_7 = Arg5544[7], Arg5544_8 = Arg5544[8], Arg5544_9 = Arg5544[9], Arg5544_10 = Arg5544[10], Arg5544_11 = Arg5544[11], Arg5544_12 = Arg5544[12], Arg5544_13 = Arg5544[13], Arg5544_14 = Arg5544[14], Arg5544_15 = Arg5544[15], Arg5544_16 = Arg5544[16], Arg5544_17 = Arg5544[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5544_5, shenjs_call(shen_placeholder, []), Arg5544_8, (new Shenjs_freeze([Arg5544_1, Arg5544_2, Arg5544_3, Arg5544_4, Arg5544_5, Arg5544_6, Arg5544_7, Arg5544_8, Arg5544_9], function(Arg5546) {
  var Arg5546_0 = Arg5546[0], Arg5546_1 = Arg5546[1], Arg5546_2 = Arg5546[2], Arg5546_3 = Arg5546[3], Arg5546_4 = Arg5546[4], Arg5546_5 = Arg5546[5], Arg5546_6 = Arg5546[6], Arg5546_7 = Arg5546[7], Arg5546_8 = Arg5546[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5546_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5546_4, Arg5546_7]), shenjs_call(shen_lazyderef, [Arg5546_0, Arg5546_7]), shenjs_call(shen_lazyderef, [Arg5546_1, Arg5546_7])]), Arg5546_7, (new Shenjs_freeze([Arg5546_0, Arg5546_1, Arg5546_2, Arg5546_3, Arg5546_4, Arg5546_5, Arg5546_6, Arg5546_7, Arg5546_8], function(Arg5548) {
  var Arg5548_0 = Arg5548[0], Arg5548_1 = Arg5548[1], Arg5548_2 = Arg5548[2], Arg5548_3 = Arg5548[3], Arg5548_4 = Arg5548[4], Arg5548_5 = Arg5548[5], Arg5548_6 = Arg5548[6], Arg5548_7 = Arg5548[7], Arg5548_8 = Arg5548[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5548_2, Arg5548_3, [shen_type_cons, [shen_type_cons, Arg5548_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5548_5, []]]], Arg5548_6], Arg5548_7, Arg5548_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg5474_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [shen_type_symbol, "-->"], Arg5474_3]),
  (R4 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R6 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5474_3])),
  (R7 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5474_3, (new Shenjs_freeze([R0, R1, R3, R2, R6, R7, R4, Arg5474_2, Arg5474_3, Arg5474_4, R5, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5550) {
  var Arg5550_0 = Arg5550[0], Arg5550_1 = Arg5550[1], Arg5550_2 = Arg5550[2], Arg5550_3 = Arg5550[3], Arg5550_4 = Arg5550[4], Arg5550_5 = Arg5550[5], Arg5550_6 = Arg5550[6], Arg5550_7 = Arg5550[7], Arg5550_8 = Arg5550[8], Arg5550_9 = Arg5550[9], Arg5550_10 = Arg5550[10], Arg5550_11 = Arg5550[11], Arg5550_12 = Arg5550[12], Arg5550_13 = Arg5550[13], Arg5550_14 = Arg5550[14], Arg5550_15 = Arg5550[15], Arg5550_16 = Arg5550[16], Arg5550_17 = Arg5550[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5550_5, shenjs_call(shen_placeholder, []), Arg5550_8, (new Shenjs_freeze([Arg5550_1, Arg5550_2, Arg5550_3, Arg5550_4, Arg5550_5, Arg5550_6, Arg5550_7, Arg5550_8, Arg5550_9], function(Arg5552) {
  var Arg5552_0 = Arg5552[0], Arg5552_1 = Arg5552[1], Arg5552_2 = Arg5552[2], Arg5552_3 = Arg5552[3], Arg5552_4 = Arg5552[4], Arg5552_5 = Arg5552[5], Arg5552_6 = Arg5552[6], Arg5552_7 = Arg5552[7], Arg5552_8 = Arg5552[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5552_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5552_4, Arg5552_7]), shenjs_call(shen_lazyderef, [Arg5552_0, Arg5552_7]), shenjs_call(shen_lazyderef, [Arg5552_1, Arg5552_7])]), Arg5552_7, (new Shenjs_freeze([Arg5552_0, Arg5552_1, Arg5552_2, Arg5552_3, Arg5552_4, Arg5552_5, Arg5552_6, Arg5552_7, Arg5552_8], function(Arg5554) {
  var Arg5554_0 = Arg5554[0], Arg5554_1 = Arg5554[1], Arg5554_2 = Arg5554[2], Arg5554_3 = Arg5554[3], Arg5554_4 = Arg5554[4], Arg5554_5 = Arg5554[5], Arg5554_6 = Arg5554[6], Arg5554_7 = Arg5554[7], Arg5554_8 = Arg5554[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5554_2, Arg5554_3, [shen_type_cons, [shen_type_cons, Arg5554_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5554_5, []]]], Arg5554_6], Arg5554_7, Arg5554_8]);});})}))]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg5474_3]),
  (R6 = ((R7 = shenjs_call(shen_newpv, [Arg5474_3])),
  (R8 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5474_3, (new Shenjs_freeze([R0, R1, R3, R7, R6, R8, R4, Arg5474_2, Arg5474_3, Arg5474_4, R2, Arg5474_3, R5, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5556) {
  var Arg5556_0 = Arg5556[0], Arg5556_1 = Arg5556[1], Arg5556_2 = Arg5556[2], Arg5556_3 = Arg5556[3], Arg5556_4 = Arg5556[4], Arg5556_5 = Arg5556[5], Arg5556_6 = Arg5556[6], Arg5556_7 = Arg5556[7], Arg5556_8 = Arg5556[8], Arg5556_9 = Arg5556[9], Arg5556_10 = Arg5556[10], Arg5556_11 = Arg5556[11], Arg5556_12 = Arg5556[12], Arg5556_13 = Arg5556[13], Arg5556_14 = Arg5556[14], Arg5556_15 = Arg5556[15], Arg5556_16 = Arg5556[16], Arg5556_17 = Arg5556[17], Arg5556_18 = Arg5556[18], Arg5556_19 = Arg5556[19];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5556_5, shenjs_call(shen_placeholder, []), Arg5556_8, (new Shenjs_freeze([Arg5556_1, Arg5556_2, Arg5556_3, Arg5556_4, Arg5556_5, Arg5556_6, Arg5556_7, Arg5556_8, Arg5556_9], function(Arg5558) {
  var Arg5558_0 = Arg5558[0], Arg5558_1 = Arg5558[1], Arg5558_2 = Arg5558[2], Arg5558_3 = Arg5558[3], Arg5558_4 = Arg5558[4], Arg5558_5 = Arg5558[5], Arg5558_6 = Arg5558[6], Arg5558_7 = Arg5558[7], Arg5558_8 = Arg5558[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5558_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5558_4, Arg5558_7]), shenjs_call(shen_lazyderef, [Arg5558_0, Arg5558_7]), shenjs_call(shen_lazyderef, [Arg5558_1, Arg5558_7])]), Arg5558_7, (new Shenjs_freeze([Arg5558_0, Arg5558_1, Arg5558_2, Arg5558_3, Arg5558_4, Arg5558_5, Arg5558_6, Arg5558_7, Arg5558_8], function(Arg5560) {
  var Arg5560_0 = Arg5560[0], Arg5560_1 = Arg5560[1], Arg5560_2 = Arg5560[2], Arg5560_3 = Arg5560[3], Arg5560_4 = Arg5560[4], Arg5560_5 = Arg5560[5], Arg5560_6 = Arg5560[6], Arg5560_7 = Arg5560[7], Arg5560_8 = Arg5560[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5560_2, Arg5560_3, [shen_type_cons, [shen_type_cons, Arg5560_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5560_5, []]]], Arg5560_6], Arg5560_7, Arg5560_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5474_3]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R6, []], Arg5474_3]),
  (R6 = ((R7 = shenjs_call(shen_newpv, [Arg5474_3])),
  (R8 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5474_3, (new Shenjs_freeze([R0, R1, R3, R7, R6, R8, R4, Arg5474_2, Arg5474_3, Arg5474_4, R2, Arg5474_3, R5, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5562) {
  var Arg5562_0 = Arg5562[0], Arg5562_1 = Arg5562[1], Arg5562_2 = Arg5562[2], Arg5562_3 = Arg5562[3], Arg5562_4 = Arg5562[4], Arg5562_5 = Arg5562[5], Arg5562_6 = Arg5562[6], Arg5562_7 = Arg5562[7], Arg5562_8 = Arg5562[8], Arg5562_9 = Arg5562[9], Arg5562_10 = Arg5562[10], Arg5562_11 = Arg5562[11], Arg5562_12 = Arg5562[12], Arg5562_13 = Arg5562[13], Arg5562_14 = Arg5562[14], Arg5562_15 = Arg5562[15], Arg5562_16 = Arg5562[16], Arg5562_17 = Arg5562[17], Arg5562_18 = Arg5562[18], Arg5562_19 = Arg5562[19];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5562_5, shenjs_call(shen_placeholder, []), Arg5562_8, (new Shenjs_freeze([Arg5562_1, Arg5562_2, Arg5562_3, Arg5562_4, Arg5562_5, Arg5562_6, Arg5562_7, Arg5562_8, Arg5562_9], function(Arg5564) {
  var Arg5564_0 = Arg5564[0], Arg5564_1 = Arg5564[1], Arg5564_2 = Arg5564[2], Arg5564_3 = Arg5564[3], Arg5564_4 = Arg5564[4], Arg5564_5 = Arg5564[5], Arg5564_6 = Arg5564[6], Arg5564_7 = Arg5564[7], Arg5564_8 = Arg5564[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5564_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5564_4, Arg5564_7]), shenjs_call(shen_lazyderef, [Arg5564_0, Arg5564_7]), shenjs_call(shen_lazyderef, [Arg5564_1, Arg5564_7])]), Arg5564_7, (new Shenjs_freeze([Arg5564_0, Arg5564_1, Arg5564_2, Arg5564_3, Arg5564_4, Arg5564_5, Arg5564_6, Arg5564_7, Arg5564_8], function(Arg5566) {
  var Arg5566_0 = Arg5566[0], Arg5566_1 = Arg5566[1], Arg5566_2 = Arg5566[2], Arg5566_3 = Arg5566[3], Arg5566_4 = Arg5566[4], Arg5566_5 = Arg5566[5], Arg5566_6 = Arg5566[6], Arg5566_7 = Arg5566[7], Arg5566_8 = Arg5566[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5566_2, Arg5566_3, [shen_type_cons, [shen_type_cons, Arg5566_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5566_5, []]]], Arg5566_6], Arg5566_7, Arg5566_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5474_3]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5474_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, R5, []]], Arg5474_3]),
  (R5 = ((R6 = shenjs_call(shen_newpv, [Arg5474_3])),
  (R7 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5474_3, (new Shenjs_freeze([R0, R1, R3, R6, R5, R7, R4, Arg5474_2, Arg5474_3, Arg5474_4, R2, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5568) {
  var Arg5568_0 = Arg5568[0], Arg5568_1 = Arg5568[1], Arg5568_2 = Arg5568[2], Arg5568_3 = Arg5568[3], Arg5568_4 = Arg5568[4], Arg5568_5 = Arg5568[5], Arg5568_6 = Arg5568[6], Arg5568_7 = Arg5568[7], Arg5568_8 = Arg5568[8], Arg5568_9 = Arg5568[9], Arg5568_10 = Arg5568[10], Arg5568_11 = Arg5568[11], Arg5568_12 = Arg5568[12], Arg5568_13 = Arg5568[13], Arg5568_14 = Arg5568[14], Arg5568_15 = Arg5568[15], Arg5568_16 = Arg5568[16], Arg5568_17 = Arg5568[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5568_5, shenjs_call(shen_placeholder, []), Arg5568_8, (new Shenjs_freeze([Arg5568_1, Arg5568_2, Arg5568_3, Arg5568_4, Arg5568_5, Arg5568_6, Arg5568_7, Arg5568_8, Arg5568_9], function(Arg5570) {
  var Arg5570_0 = Arg5570[0], Arg5570_1 = Arg5570[1], Arg5570_2 = Arg5570[2], Arg5570_3 = Arg5570[3], Arg5570_4 = Arg5570[4], Arg5570_5 = Arg5570[5], Arg5570_6 = Arg5570[6], Arg5570_7 = Arg5570[7], Arg5570_8 = Arg5570[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5570_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5570_4, Arg5570_7]), shenjs_call(shen_lazyderef, [Arg5570_0, Arg5570_7]), shenjs_call(shen_lazyderef, [Arg5570_1, Arg5570_7])]), Arg5570_7, (new Shenjs_freeze([Arg5570_0, Arg5570_1, Arg5570_2, Arg5570_3, Arg5570_4, Arg5570_5, Arg5570_6, Arg5570_7, Arg5570_8], function(Arg5572) {
  var Arg5572_0 = Arg5572[0], Arg5572_1 = Arg5572[1], Arg5572_2 = Arg5572[2], Arg5572_3 = Arg5572[3], Arg5572_4 = Arg5572[4], Arg5572_5 = Arg5572[5], Arg5572_6 = Arg5572[6], Arg5572_7 = Arg5572[7], Arg5572_8 = Arg5572[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5572_2, Arg5572_3, [shen_type_cons, [shen_type_cons, Arg5572_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5572_5, []]]], Arg5572_6], Arg5572_7, Arg5572_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5474_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg5474_3])),
  (R5 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R4, [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, R5, []]]], Arg5474_3]),
  (R5 = ((R6 = shenjs_call(shen_newpv, [Arg5474_3])),
  (R7 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5474_3, (new Shenjs_freeze([R0, R1, R3, R6, R5, R7, R4, Arg5474_2, Arg5474_3, Arg5474_4, R2, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5574) {
  var Arg5574_0 = Arg5574[0], Arg5574_1 = Arg5574[1], Arg5574_2 = Arg5574[2], Arg5574_3 = Arg5574[3], Arg5574_4 = Arg5574[4], Arg5574_5 = Arg5574[5], Arg5574_6 = Arg5574[6], Arg5574_7 = Arg5574[7], Arg5574_8 = Arg5574[8], Arg5574_9 = Arg5574[9], Arg5574_10 = Arg5574[10], Arg5574_11 = Arg5574[11], Arg5574_12 = Arg5574[12], Arg5574_13 = Arg5574[13], Arg5574_14 = Arg5574[14], Arg5574_15 = Arg5574[15], Arg5574_16 = Arg5574[16], Arg5574_17 = Arg5574[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5574_5, shenjs_call(shen_placeholder, []), Arg5574_8, (new Shenjs_freeze([Arg5574_1, Arg5574_2, Arg5574_3, Arg5574_4, Arg5574_5, Arg5574_6, Arg5574_7, Arg5574_8, Arg5574_9], function(Arg5576) {
  var Arg5576_0 = Arg5576[0], Arg5576_1 = Arg5576[1], Arg5576_2 = Arg5576[2], Arg5576_3 = Arg5576[3], Arg5576_4 = Arg5576[4], Arg5576_5 = Arg5576[5], Arg5576_6 = Arg5576[6], Arg5576_7 = Arg5576[7], Arg5576_8 = Arg5576[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5576_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5576_4, Arg5576_7]), shenjs_call(shen_lazyderef, [Arg5576_0, Arg5576_7]), shenjs_call(shen_lazyderef, [Arg5576_1, Arg5576_7])]), Arg5576_7, (new Shenjs_freeze([Arg5576_0, Arg5576_1, Arg5576_2, Arg5576_3, Arg5576_4, Arg5576_5, Arg5576_6, Arg5576_7, Arg5576_8], function(Arg5578) {
  var Arg5578_0 = Arg5578[0], Arg5578_1 = Arg5578[1], Arg5578_2 = Arg5578[2], Arg5578_3 = Arg5578[3], Arg5578_4 = Arg5578[4], Arg5578_5 = Arg5578[5], Arg5578_6 = Arg5578[6], Arg5578_7 = Arg5578[7], Arg5578_8 = Arg5578[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5578_2, Arg5578_3, [shen_type_cons, [shen_type_cons, Arg5578_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5578_5, []]]], Arg5578_6], Arg5578_7, Arg5578_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5474_3]),
  R5)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5474_0, Arg5474_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5474_3])),
  (R5 = shenjs_call(shen_newpv, [Arg5474_3])),
  (R6 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5474_3, (new Shenjs_freeze([R0, R3, R1, R4, R2, Arg5474_1, R5, R6, Arg5474_2, Arg5474_3, Arg5474_4, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5580) {
  var Arg5580_0 = Arg5580[0], Arg5580_1 = Arg5580[1], Arg5580_2 = Arg5580[2], Arg5580_3 = Arg5580[3], Arg5580_4 = Arg5580[4], Arg5580_5 = Arg5580[5], Arg5580_6 = Arg5580[6], Arg5580_7 = Arg5580[7], Arg5580_8 = Arg5580[8], Arg5580_9 = Arg5580[9], Arg5580_10 = Arg5580[10], Arg5580_11 = Arg5580[11], Arg5580_12 = Arg5580[12], Arg5580_13 = Arg5580[13], Arg5580_14 = Arg5580[14], Arg5580_15 = Arg5580[15], Arg5580_16 = Arg5580[16];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5580_1, Arg5580_7, Arg5580_8, Arg5580_9, (new Shenjs_freeze([Arg5580_1, Arg5580_2, Arg5580_3, Arg5580_4, Arg5580_5, Arg5580_6, Arg5580_7, Arg5580_8, Arg5580_9, Arg5580_10], function(Arg5582) {
  var Arg5582_0 = Arg5582[0], Arg5582_1 = Arg5582[1], Arg5582_2 = Arg5582[2], Arg5582_3 = Arg5582[3], Arg5582_4 = Arg5582[4], Arg5582_5 = Arg5582[5], Arg5582_6 = Arg5582[6], Arg5582_7 = Arg5582[7], Arg5582_8 = Arg5582[8], Arg5582_9 = Arg5582[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5582_5, shenjs_call(shen_placeholder, []), Arg5582_8, (new Shenjs_freeze([Arg5582_1, Arg5582_2, Arg5582_3, Arg5582_4, Arg5582_5, Arg5582_6, Arg5582_7, Arg5582_8, Arg5582_9], function(Arg5584) {
  var Arg5584_0 = Arg5584[0], Arg5584_1 = Arg5584[1], Arg5584_2 = Arg5584[2], Arg5584_3 = Arg5584[3], Arg5584_4 = Arg5584[4], Arg5584_5 = Arg5584[5], Arg5584_6 = Arg5584[6], Arg5584_7 = Arg5584[7], Arg5584_8 = Arg5584[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5584_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5584_4, Arg5584_7]), shenjs_call(shen_lazyderef, [Arg5584_0, Arg5584_7]), shenjs_call(shen_lazyderef, [Arg5584_1, Arg5584_7])]), Arg5584_7, (new Shenjs_freeze([Arg5584_0, Arg5584_1, Arg5584_2, Arg5584_3, Arg5584_4, Arg5584_5, Arg5584_6, Arg5584_7, Arg5584_8], function(Arg5586) {
  var Arg5586_0 = Arg5586[0], Arg5586_1 = Arg5586[1], Arg5586_2 = Arg5586[2], Arg5586_3 = Arg5586[3], Arg5586_4 = Arg5586[4], Arg5586_5 = Arg5586[5], Arg5586_6 = Arg5586[6], Arg5586_7 = Arg5586[7], Arg5586_8 = Arg5586[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5586_2, Arg5586_3, [shen_type_cons, [shen_type_cons, Arg5586_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5586_5, []]]], Arg5586_6], Arg5586_7, Arg5586_8]);});})}))]);});})}))]);});})}))]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5474_0, Arg5474_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "open"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R2[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "file"], R1)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5474_1, Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "stream"], R4)))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R4, shen_type_cons))
  ? ((R2 = R4[1]),
  (R4 = shenjs_call(shen_lazyderef, [R4[2], Arg5474_3])),
  ((shenjs_empty$question$(R4))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R2, R3, Arg5474_3, (new Shenjs_freeze([R2, R3, R1, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5588) {
  var Arg5588_0 = Arg5588[0], Arg5588_1 = Arg5588[1], Arg5588_2 = Arg5588[2], Arg5588_3 = Arg5588[3], Arg5588_4 = Arg5588[4], Arg5588_5 = Arg5588[5], Arg5588_6 = Arg5588[6], Arg5588_7 = Arg5588[7], Arg5588_8 = Arg5588[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5588_3, Arg5588_7, (new Shenjs_freeze([Arg5588_3, Arg5588_2, Arg5588_6, Arg5588_7, Arg5588_8], function(Arg5590) {
  var Arg5590_0 = Arg5590[0], Arg5590_1 = Arg5590[1], Arg5590_2 = Arg5590[2], Arg5590_3 = Arg5590[3], Arg5590_4 = Arg5590[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5590_1, [shen_type_symbol, "string"], Arg5590_2, Arg5590_3, Arg5590_4]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [], Arg5474_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R2, R3, Arg5474_3, (new Shenjs_freeze([R2, R3, R1, R4, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5592) {
  var Arg5592_0 = Arg5592[0], Arg5592_1 = Arg5592[1], Arg5592_2 = Arg5592[2], Arg5592_3 = Arg5592[3], Arg5592_4 = Arg5592[4], Arg5592_5 = Arg5592[5], Arg5592_6 = Arg5592[6], Arg5592_7 = Arg5592[7], Arg5592_8 = Arg5592[8], Arg5592_9 = Arg5592[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5592_4, Arg5592_8, (new Shenjs_freeze([Arg5592_4, Arg5592_2, Arg5592_7, Arg5592_8, Arg5592_9], function(Arg5594) {
  var Arg5594_0 = Arg5594[0], Arg5594_1 = Arg5594[1], Arg5594_2 = Arg5594[2], Arg5594_3 = Arg5594[3], Arg5594_4 = Arg5594[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5594_1, [shen_type_symbol, "string"], Arg5594_2, Arg5594_3, Arg5594_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg5474_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_bindv, [R4, [shen_type_cons, R2, []], Arg5474_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R2, R3, Arg5474_3, (new Shenjs_freeze([R2, R3, R0, R1, Arg5474_2, Arg5474_4, R4, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5596) {
  var Arg5596_0 = Arg5596[0], Arg5596_1 = Arg5596[1], Arg5596_2 = Arg5596[2], Arg5596_3 = Arg5596[3], Arg5596_4 = Arg5596[4], Arg5596_5 = Arg5596[5], Arg5596_6 = Arg5596[6], Arg5596_7 = Arg5596[7], Arg5596_8 = Arg5596[8], Arg5596_9 = Arg5596[9], Arg5596_10 = Arg5596[10], Arg5596_11 = Arg5596[11], Arg5596_12 = Arg5596[12], Arg5596_13 = Arg5596[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5596_2, Arg5596_7, (new Shenjs_freeze([Arg5596_2, Arg5596_3, Arg5596_4, Arg5596_7, Arg5596_5], function(Arg5598) {
  var Arg5598_0 = Arg5598[0], Arg5598_1 = Arg5598[1], Arg5598_2 = Arg5598[2], Arg5598_3 = Arg5598[3], Arg5598_4 = Arg5598[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5598_1, [shen_type_symbol, "string"], Arg5598_2, Arg5598_3, Arg5598_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg5474_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [shen_type_symbol, "stream"], Arg5474_3]),
  (R3 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R5, R3, Arg5474_3, (new Shenjs_freeze([R5, R3, R1, R4, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5600) {
  var Arg5600_0 = Arg5600[0], Arg5600_1 = Arg5600[1], Arg5600_2 = Arg5600[2], Arg5600_3 = Arg5600[3], Arg5600_4 = Arg5600[4], Arg5600_5 = Arg5600[5], Arg5600_6 = Arg5600[6], Arg5600_7 = Arg5600[7], Arg5600_8 = Arg5600[8], Arg5600_9 = Arg5600[9], Arg5600_10 = Arg5600[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5600_5, Arg5600_4, (new Shenjs_freeze([Arg5600_5, Arg5600_2, Arg5600_8, Arg5600_4, Arg5600_9], function(Arg5602) {
  var Arg5602_0 = Arg5602[0], Arg5602_1 = Arg5602[1], Arg5602_2 = Arg5602[2], Arg5602_3 = Arg5602[3], Arg5602_4 = Arg5602[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5602_1, [shen_type_symbol, "string"], Arg5602_2, Arg5602_3, Arg5602_4]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg5474_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R5, R3, Arg5474_3, (new Shenjs_freeze([R5, R3, R1, R2, R4, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5604) {
  var Arg5604_0 = Arg5604[0], Arg5604_1 = Arg5604[1], Arg5604_2 = Arg5604[2], Arg5604_3 = Arg5604[3], Arg5604_4 = Arg5604[4], Arg5604_5 = Arg5604[5], Arg5604_6 = Arg5604[6], Arg5604_7 = Arg5604[7], Arg5604_8 = Arg5604[8], Arg5604_9 = Arg5604[9], Arg5604_10 = Arg5604[10], Arg5604_11 = Arg5604[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5604_6, Arg5604_5, (new Shenjs_freeze([Arg5604_6, Arg5604_2, Arg5604_9, Arg5604_5, Arg5604_10], function(Arg5606) {
  var Arg5606_0 = Arg5606[0], Arg5606_1 = Arg5606[1], Arg5606_2 = Arg5606[2], Arg5606_3 = Arg5606[3], Arg5606_4 = Arg5606[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5606_1, [shen_type_symbol, "string"], Arg5606_2, Arg5606_3, Arg5606_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5474_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R5, []], Arg5474_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R5, R3, Arg5474_3, (new Shenjs_freeze([R5, R3, R0, R1, Arg5474_2, Arg5474_4, R2, Arg5474_3, R4, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5608) {
  var Arg5608_0 = Arg5608[0], Arg5608_1 = Arg5608[1], Arg5608_2 = Arg5608[2], Arg5608_3 = Arg5608[3], Arg5608_4 = Arg5608[4], Arg5608_5 = Arg5608[5], Arg5608_6 = Arg5608[6], Arg5608_7 = Arg5608[7], Arg5608_8 = Arg5608[8], Arg5608_9 = Arg5608[9], Arg5608_10 = Arg5608[10], Arg5608_11 = Arg5608[11], Arg5608_12 = Arg5608[12], Arg5608_13 = Arg5608[13], Arg5608_14 = Arg5608[14], Arg5608_15 = Arg5608[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5608_2, Arg5608_7, (new Shenjs_freeze([Arg5608_2, Arg5608_3, Arg5608_4, Arg5608_7, Arg5608_5], function(Arg5610) {
  var Arg5610_0 = Arg5610[0], Arg5610_1 = Arg5610[1], Arg5610_2 = Arg5610[2], Arg5610_3 = Arg5610[3], Arg5610_4 = Arg5610[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5610_1, [shen_type_symbol, "string"], Arg5610_2, Arg5610_3, Arg5610_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5474_3]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R4, Arg5474_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "stream"], [shen_type_cons, R4, []]], Arg5474_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R4, R3, Arg5474_3, (new Shenjs_freeze([R4, R3, R0, R1, Arg5474_2, Arg5474_4, R2, Arg5474_3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5612) {
  var Arg5612_0 = Arg5612[0], Arg5612_1 = Arg5612[1], Arg5612_2 = Arg5612[2], Arg5612_3 = Arg5612[3], Arg5612_4 = Arg5612[4], Arg5612_5 = Arg5612[5], Arg5612_6 = Arg5612[6], Arg5612_7 = Arg5612[7], Arg5612_8 = Arg5612[8], Arg5612_9 = Arg5612[9], Arg5612_10 = Arg5612[10], Arg5612_11 = Arg5612[11], Arg5612_12 = Arg5612[12], Arg5612_13 = Arg5612[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5612_2, Arg5612_7, (new Shenjs_freeze([Arg5612_2, Arg5612_3, Arg5612_4, Arg5612_7, Arg5612_5], function(Arg5614) {
  var Arg5614_0 = Arg5614[0], Arg5614_1 = Arg5614[1], Arg5614_2 = Arg5614[2], Arg5614_3 = Arg5614[3], Arg5614_4 = Arg5614[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5614_1, [shen_type_symbol, "string"], Arg5614_2, Arg5614_3, Arg5614_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5474_3]),
  R4)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5474_0, Arg5474_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "type"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5474_3, (new Shenjs_freeze([R1, R3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5616) {
  var Arg5616_0 = Arg5616[0], Arg5616_1 = Arg5616[1], Arg5616_2 = Arg5616[2], Arg5616_3 = Arg5616[3], Arg5616_4 = Arg5616[4], Arg5616_5 = Arg5616[5], Arg5616_6 = Arg5616[6], Arg5616_7 = Arg5616[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify, [Arg5616_1, Arg5616_4, Arg5616_6, (new Shenjs_freeze([Arg5616_4, Arg5616_0, Arg5616_1, Arg5616_5, Arg5616_6, Arg5616_7], function(Arg5618) {
  var Arg5618_0 = Arg5618[0], Arg5618_1 = Arg5618[1], Arg5618_2 = Arg5618[2], Arg5618_3 = Arg5618[3], Arg5618_4 = Arg5618[4], Arg5618_5 = Arg5618[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5618_1, Arg5618_2, Arg5618_3, Arg5618_4, Arg5618_5]);});})}))]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5474_0, Arg5474_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "input+"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R2[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [R2, shenjs_call(shen_normalise_type, [shenjs_call(shen_lazyderef, [R1, Arg5474_3])]), Arg5474_3, (new Shenjs_freeze([R1, Arg5474_1, R2, Arg5474_3, Arg5474_4, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5620) {
  var Arg5620_0 = Arg5620[0], Arg5620_1 = Arg5620[1], Arg5620_2 = Arg5620[2], Arg5620_3 = Arg5620[3], Arg5620_4 = Arg5620[4], Arg5620_5 = Arg5620[5], Arg5620_6 = Arg5620[6], Arg5620_7 = Arg5620[7], Arg5620_8 = Arg5620[8], Arg5620_9 = Arg5620[9], Arg5620_10 = Arg5620[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify, [Arg5620_1, Arg5620_2, Arg5620_3, Arg5620_4]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5474_0, Arg5474_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "where"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5474_3, (new Shenjs_freeze([R3, R1, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5622) {
  var Arg5622_0 = Arg5622[0], Arg5622_1 = Arg5622[1], Arg5622_2 = Arg5622[2], Arg5622_3 = Arg5622[3], Arg5622_4 = Arg5622[4], Arg5622_5 = Arg5622[5], Arg5622_6 = Arg5622[6], Arg5622_7 = Arg5622[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5622_1, [shen_type_symbol, "boolean"], Arg5622_5, Arg5622_6, (new Shenjs_freeze([Arg5622_2, Arg5622_0, Arg5622_4, Arg5622_1, Arg5622_5, Arg5622_6, Arg5622_7], function(Arg5624) {
  var Arg5624_0 = Arg5624[0], Arg5624_1 = Arg5624[1], Arg5624_2 = Arg5624[2], Arg5624_3 = Arg5624[3], Arg5624_4 = Arg5624[4], Arg5624_5 = Arg5624[5], Arg5624_6 = Arg5624[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5624_0, Arg5624_5, (new Shenjs_freeze([Arg5624_0, Arg5624_1, Arg5624_2, Arg5624_3, Arg5624_4, Arg5624_5, Arg5624_6], function(Arg5626) {
  var Arg5626_0 = Arg5626[0], Arg5626_1 = Arg5626[1], Arg5626_2 = Arg5626[2], Arg5626_3 = Arg5626[3], Arg5626_4 = Arg5626[4], Arg5626_5 = Arg5626[5], Arg5626_6 = Arg5626[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5626_1, Arg5626_2, [shen_type_cons, [shen_type_cons, Arg5626_3, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "verified"], []]]], Arg5626_4], Arg5626_5, Arg5626_6]);});})}))]);});})}))]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5474_0, Arg5474_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "set"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5474_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5474_3, (new Shenjs_freeze([R1, R3, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5628) {
  var Arg5628_0 = Arg5628[0], Arg5628_1 = Arg5628[1], Arg5628_2 = Arg5628[2], Arg5628_3 = Arg5628[3], Arg5628_4 = Arg5628[4], Arg5628_5 = Arg5628[5], Arg5628_6 = Arg5628[6], Arg5628_7 = Arg5628[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [[shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, Arg5628_0, []]], Arg5628_4, Arg5628_5, Arg5628_6, (new Shenjs_freeze([Arg5628_0, Arg5628_1, Arg5628_4, Arg5628_5, Arg5628_6, Arg5628_7], function(Arg5630) {
  var Arg5630_0 = Arg5630[0], Arg5630_1 = Arg5630[1], Arg5630_2 = Arg5630[2], Arg5630_3 = Arg5630[3], Arg5630_4 = Arg5630[4], Arg5630_5 = Arg5630[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5630_1, Arg5630_2, Arg5630_3, Arg5630_4, Arg5630_5]);});})}))]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5474_0, Arg5474_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fail"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5474_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5474_1, Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R2)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5474_4)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [shen_type_symbol, "symbol"], Arg5474_3]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5474_4)))),
  shenjs_call(shen_unbindv, [R2, Arg5474_3]),
  R1)
  : false)))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_t$asterisk$_hyps, [Arg5474_2, R1, Arg5474_3, (new Shenjs_freeze([Arg5474_2, Arg5474_0, Arg5474_1, R1, Arg5474_3, Arg5474_4, R0, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5632) {
  var Arg5632_0 = Arg5632[0], Arg5632_1 = Arg5632[1], Arg5632_2 = Arg5632[2], Arg5632_3 = Arg5632[3], Arg5632_4 = Arg5632[4], Arg5632_5 = Arg5632[5], Arg5632_6 = Arg5632[6], Arg5632_7 = Arg5632[7], Arg5632_8 = Arg5632[8], Arg5632_9 = Arg5632[9], Arg5632_10 = Arg5632[10], Arg5632_11 = Arg5632[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5632_1, Arg5632_2, Arg5632_3, Arg5632_4, Arg5632_5]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5474_0, Arg5474_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "define"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5474_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = R2[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5474_3, (new Shenjs_freeze([R0, R1, R2, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4, Arg5474_0, Arg5474_1, Arg5474_2, Arg5474_3, Arg5474_4], function(Arg5634) {
  var Arg5634_0 = Arg5634[0], Arg5634_1 = Arg5634[1], Arg5634_2 = Arg5634[2], Arg5634_3 = Arg5634[3], Arg5634_4 = Arg5634[4], Arg5634_5 = Arg5634[5], Arg5634_6 = Arg5634[6], Arg5634_7 = Arg5634[7], Arg5634_8 = Arg5634[8], Arg5634_9 = Arg5634[9], Arg5634_10 = Arg5634[10], Arg5634_11 = Arg5634[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_def, [[shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg5634_1, Arg5634_2]], Arg5634_3, Arg5634_4, Arg5634_5, Arg5634_6]);});})}))]))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5474_0, Arg5474_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R1[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-process-datatype"], R1)))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg5474_1, Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R1)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5474_4)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [shen_type_symbol, "symbol"], Arg5474_3]),
  (R0 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5474_4)))),
  shenjs_call(shen_unbindv, [R1, Arg5474_3]),
  R0)
  : false)))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5474_0, Arg5474_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R1[1], Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-synonyms-help"], R1)))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg5474_1, Arg5474_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R1)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5474_4)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [shen_type_symbol, "symbol"], Arg5474_3]),
  (R0 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5474_4)))),
  shenjs_call(shen_unbindv, [R1, Arg5474_3]),
  R0)
  : false)))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5474_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [R1, (shenjs_globals["shen_shen-*datatypes*"]), Arg5474_3, (new Shenjs_freeze([Arg5474_0, Arg5474_1, Arg5474_2, R1, Arg5474_3, Arg5474_4], function(Arg5636) {
  var Arg5636_0 = Arg5636[0], Arg5636_1 = Arg5636[1], Arg5636_2 = Arg5636[2], Arg5636_3 = Arg5636[3], Arg5636_4 = Arg5636[4], Arg5636_5 = Arg5636[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_udefs$asterisk$, [[shen_type_cons, Arg5636_0, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5636_1, []]]], Arg5636_2, Arg5636_3, Arg5636_4, Arg5636_5]);});})}))]))
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
  : R1))]);}))},
  5,
  [],
  "shen-th*"];
shenjs_functions["shen_shen-th*"] = shen_th$asterisk$;






shen_t$asterisk$_hyps = [shen_type_func,
  function shen_user_lambda5639(Arg5638) {
  if (Arg5638.length < 4) return [shen_type_func, shen_user_lambda5639, 4, Arg5638];
  var Arg5638_0 = Arg5638[0], Arg5638_1 = Arg5638[1], Arg5638_2 = Arg5638[2], Arg5638_3 = Arg5638[3];
  var R0, R1, R2, R3, R4, R5, R6, R7;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5638_0, Arg5638_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg5638_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5638_2])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[1], Arg5638_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[2], Arg5638_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R2 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg5638_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5638_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5638_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R1[1], Arg5638_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "list"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R1[2], Arg5638_2])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R1 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg5638_2])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R5, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg5638_2]),
  (R4 = ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R5, Arg5638_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg5638_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5638_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5638_2])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, R1, []], Arg5638_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5638_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [shen_type_symbol, "list"], Arg5638_2]),
  (R4 = ((R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5638_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R6 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5638_2])),
  ((shenjs_empty$question$(R1))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R6 = ((R1 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R1, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg5638_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5638_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5638_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R6, []], Arg5638_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5638_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5638_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5638_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, R5, []]], Arg5638_2]),
  (R5 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R5 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5638_2]),
  R5)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5638_0, Arg5638_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg5638_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5638_2])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[1], Arg5638_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@p"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[2], Arg5638_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R2 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg5638_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5638_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5638_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R5 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5638_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R6 = shenjs_call(shen_lazyderef, [R1[1], Arg5638_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "*"], R6)))
  ? ((R6 = shenjs_call(shen_lazyderef, [R1[2], Arg5638_2])),
  ((shenjs_is_type(R6, shen_type_cons))
  ? ((R1 = R6[1]),
  (R6 = shenjs_call(shen_lazyderef, [R6[2], Arg5638_2])),
  ((shenjs_empty$question$(R6))
  ? ((R6 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R6))
  ? ((R6 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]]], shenjs_call(shen_lazyderef, [R6, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? (shenjs_call(shen_bindv, [R6, [], Arg5638_2]),
  (R5 = ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R6, Arg5638_2]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? (shenjs_call(shen_bindv, [R6, [], Arg5638_2]),
  (R5 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R5 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R6, Arg5638_2]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5638_2])),
  shenjs_call(shen_bindv, [R6, [shen_type_cons, R1, []], Arg5638_2]),
  (R5 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R5 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R6, Arg5638_2]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? (shenjs_call(shen_bindv, [R6, [shen_type_symbol, "*"], Arg5638_2]),
  (R5 = ((R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5638_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R7 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5638_2])),
  ((shenjs_empty$question$(R1))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg5638_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R7 = ((R1 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg5638_2]), []]]], shenjs_call(shen_lazyderef, [R1, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg5638_2]),
  (R7 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg5638_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R7 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg5638_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R7)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5638_2]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R7 = shenjs_call(shen_newpv, [Arg5638_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R7, []], Arg5638_2]),
  (R7 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg5638_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R7 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg5638_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R7)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5638_2]),
  R7)
  : false)))),
  shenjs_call(shen_unbindv, [R6, Arg5638_2]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5638_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, R6, []]], Arg5638_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5638_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5638_2])),
  (R6 = shenjs_call(shen_newpv, [Arg5638_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R5, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, R6, []]]], Arg5638_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5638_2]),
  R6)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5638_0, Arg5638_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg5638_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5638_2])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[1], Arg5638_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@v"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[2], Arg5638_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R2 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg5638_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5638_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5638_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R1[1], Arg5638_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "vector"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R1[2], Arg5638_2])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R1 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg5638_2])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R5, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg5638_2]),
  (R4 = ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R5, Arg5638_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg5638_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5638_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5638_2])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, R1, []], Arg5638_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5638_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [shen_type_symbol, "vector"], Arg5638_2]),
  (R4 = ((R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5638_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R6 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5638_2])),
  ((shenjs_empty$question$(R1))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R6 = ((R1 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R1, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg5638_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5638_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5638_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R6, []], Arg5638_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5638_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5638_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5638_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, R5, []]], Arg5638_2]),
  (R5 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R5 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5638_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5638_2]),
  R5)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5638_0, Arg5638_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg5638_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5638_2])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[1], Arg5638_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[2], Arg5638_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R2 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg5638_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5638_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5638_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "string"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R4 = ((R1 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], shenjs_call(shen_lazyderef, [R1, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [shen_type_symbol, "string"], Arg5638_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5638_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], shenjs_call(shen_lazyderef, [R3, Arg5638_2])]], Arg5638_2, Arg5638_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5638_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5638_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5638_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], shenjs_call(shen_lazyderef, [R0, Arg5638_2])]], Arg5638_2, Arg5638_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5638_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5638_2]),
  R4)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5638_0, Arg5638_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = R0[1]),
  (R0 = R0[2]),
  (R2 = shenjs_call(shen_newpv, [Arg5638_2])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [Arg5638_1, [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5638_2]), shenjs_call(shen_lazyderef, [R2, Arg5638_2])], Arg5638_2, (new Shenjs_freeze([Arg5638_1, R1, R0, R2, Arg5638_2, Arg5638_3], function(Arg5640) {
  var Arg5640_0 = Arg5640[0], Arg5640_1 = Arg5640[1], Arg5640_2 = Arg5640[2], Arg5640_3 = Arg5640[3], Arg5640_4 = Arg5640[4], Arg5640_5 = Arg5640[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_hyps, [Arg5640_2, Arg5640_3, Arg5640_4, Arg5640_5]);});})}))]);}))
  : false))
  : R0))
  : R0))
  : R0))
  : R0))},
  4,
  [],
  "shen-t*-hyps"];
shenjs_functions["shen_shen-t*-hyps"] = shen_t$asterisk$_hyps;






shen_show = [shen_type_func,
  function shen_user_lambda5643(Arg5642) {
  if (Arg5642.length < 4) return [shen_type_func, shen_user_lambda5643, 4, Arg5642];
  var Arg5642_0 = Arg5642[0], Arg5642_1 = Arg5642[1], Arg5642_2 = Arg5642[2], Arg5642_3 = Arg5642[3];
  return (((shenjs_globals["shen_shen-*spy*"]))
  ? (shenjs_call(shen_line, []),
  shenjs_call(shen_show_p, [shenjs_call(shen_deref, [Arg5642_0, Arg5642_2])]),
  shenjs_call(shen_nl, [1]),
  shenjs_call(shen_nl, [1]),
  shenjs_call(shen_show_assumptions, [shenjs_call(shen_deref, [Arg5642_1, Arg5642_2]), 1]),
  shenjs_call(shen_intoutput, ["~%> ", []]),
  shenjs_call(shen_pause_for_user, [(shenjs_globals["shen_*language*"])]),
  shenjs_thaw(Arg5642_3))
  : shenjs_thaw(Arg5642_3))},
  4,
  [],
  "shen-show"];
shenjs_functions["shen_shen-show"] = shen_show;






shen_line = [shen_type_func,
  function shen_user_lambda5645(Arg5644) {
  if (Arg5644.length < 0) return [shen_type_func, shen_user_lambda5645, 0, Arg5644];
  var R0;
  return ((R0 = shenjs_call(shen_inferences, [[shen_type_symbol, "_"]])),
  (function() {
  return shenjs_call_tail(shen_intoutput, ["____________________________________________________________ ~A inference~A ~%?- ", [shen_tuple, R0, [shen_tuple, ((shenjs_unwind_tail(shenjs_$eq$(1, R0)))
  ? ""
  : "s"), []]]]);}))},
  0,
  [],
  "shen-line"];
shenjs_functions["shen_shen-line"] = shen_line;






shen_show_p = [shen_type_func,
  function shen_user_lambda5647(Arg5646) {
  if (Arg5646.length < 1) return [shen_type_func, shen_user_lambda5647, 1, Arg5646];
  var Arg5646_0 = Arg5646[0];
  return (((shenjs_is_type(Arg5646_0, shen_type_cons) && (shenjs_is_type(Arg5646_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], Arg5646_0[2][1])) && (shenjs_is_type(Arg5646_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg5646_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_intoutput, ["~R : ~R", [shen_tuple, Arg5646_0[1], [shen_tuple, Arg5646_0[2][2][1], []]]]);})
  : (function() {
  return shenjs_call_tail(shen_intoutput, ["~R", [shen_tuple, Arg5646_0, []]]);}))},
  1,
  [],
  "shen-show-p"];
shenjs_functions["shen_shen-show-p"] = shen_show_p;






shen_show_assumptions = [shen_type_func,
  function shen_user_lambda5649(Arg5648) {
  if (Arg5648.length < 2) return [shen_type_func, shen_user_lambda5649, 2, Arg5648];
  var Arg5648_0 = Arg5648[0], Arg5648_1 = Arg5648[1];
  return ((shenjs_empty$question$(Arg5648_0))
  ? [shen_type_symbol, "shen-skip"]
  : ((shenjs_is_type(Arg5648_0, shen_type_cons))
  ? (shenjs_call(shen_intoutput, ["~A. ", [shen_tuple, Arg5648_1, []]]),
  shenjs_call(shen_show_p, [Arg5648_0[1]]),
  shenjs_call(shen_nl, [1]),
  (function() {
  return shenjs_call_tail(shen_show_assumptions, [Arg5648_0[2], (Arg5648_1 + 1)]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "shen-show-assumptions"]]);})))},
  2,
  [],
  "shen-show-assumptions"];
shenjs_functions["shen_shen-show-assumptions"] = shen_show_assumptions;






shen_pause_for_user = [shen_type_func,
  function shen_user_lambda5651(Arg5650) {
  if (Arg5650.length < 1) return [shen_type_func, shen_user_lambda5651, 1, Arg5650];
  var Arg5650_0 = Arg5650[0];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$("Common Lisp", Arg5650_0)))
  ? ((R0 = shenjs_call(shen_FORMAT, [[], "~C", shenjs_call(shen_READ_CHAR, [])])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, "a")))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["input aborted~%", []]);})
  : (function() {
  return shenjs_call_tail(shen_nl, [1]);})))
  : ((R0 = shenjs_call(shen_read_char, [])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, "a")))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["input aborted~%", []]);})
  : (function() {
  return shenjs_call_tail(shen_nl, [1]);}))))},
  1,
  [],
  "shen-pause-for-user"];
shenjs_functions["shen_shen-pause-for-user"] = shen_pause_for_user;






shen_read_char = [shen_type_func,
  function shen_user_lambda5653(Arg5652) {
  if (Arg5652.length < 0) return [shen_type_func, shen_user_lambda5653, 0, Arg5652];
  return (function() {
  return shenjs_call_tail(shen_read_char_h, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), 0]);})},
  0,
  [],
  "shen-read-char"];
shenjs_functions["shen_shen-read-char"] = shen_read_char;






shen_read_char_h = [shen_type_func,
  function shen_user_lambda5655(Arg5654) {
  if (Arg5654.length < 2) return [shen_type_func, shen_user_lambda5655, 2, Arg5654];
  var Arg5654_0 = Arg5654[0], Arg5654_1 = Arg5654[1];
  return (((shenjs_unwind_tail(shenjs_$eq$(-1, Arg5654_0)) && shenjs_unwind_tail(shenjs_$eq$(0, Arg5654_1))))
  ? (function() {
  return shenjs_call_tail(shen_read_char_h, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), 1]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(0, Arg5654_1)))
  ? (function() {
  return shenjs_call_tail(shen_read_char_h, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), 0]);})
  : (((shenjs_unwind_tail(shenjs_$eq$(-1, Arg5654_0)) && shenjs_unwind_tail(shenjs_$eq$(1, Arg5654_1))))
  ? (function() {
  return shenjs_call_tail(shen_read_char_h, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), 1]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(1, Arg5654_1)))
  ? (function() {
  return shenjs_call_tail(shen_byte_$gt$string, [Arg5654_0]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "shen-read-char-h"]]);})))))},
  2,
  [],
  "shen-read-char-h"];
shenjs_functions["shen_shen-read-char-h"] = shen_read_char_h;






shen_typedf$question$ = [shen_type_func,
  function shen_user_lambda5657(Arg5656) {
  if (Arg5656.length < 1) return [shen_type_func, shen_user_lambda5657, 1, Arg5656];
  var Arg5656_0 = Arg5656[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5656_0, (shenjs_globals["shen_shen-*signedfuncs*"])]);})},
  1,
  [],
  "shen-typedf?"];
shenjs_functions["shen_shen-typedf?"] = shen_typedf$question$;






shen_sigf = [shen_type_func,
  function shen_user_lambda5659(Arg5658) {
  if (Arg5658.length < 1) return [shen_type_func, shen_user_lambda5659, 1, Arg5658];
  var Arg5658_0 = Arg5658[0];
  return (function() {
  return shenjs_call_tail(shen_concat, [[shen_type_symbol, "shen-type-signature-of-"], Arg5658_0]);})},
  1,
  [],
  "shen-sigf"];
shenjs_functions["shen_shen-sigf"] = shen_sigf;






shen_placeholder = [shen_type_func,
  function shen_user_lambda5661(Arg5660) {
  if (Arg5660.length < 0) return [shen_type_func, shen_user_lambda5661, 0, Arg5660];
  return (function() {
  return shenjs_call_tail(shen_gensym, [[shen_type_symbol, "&&"]]);})},
  0,
  [],
  "shen-placeholder"];
shenjs_functions["shen_shen-placeholder"] = shen_placeholder;






shen_base = [shen_type_func,
  function shen_user_lambda5663(Arg5662) {
  if (Arg5662.length < 4) return [shen_type_func, shen_user_lambda5663, 4, Arg5662];
  var Arg5662_0 = Arg5662[0], Arg5662_1 = Arg5662[1], Arg5662_2 = Arg5662[2], Arg5662_3 = Arg5662[3];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5662_1, Arg5662_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "number"], R0)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [(typeof(shenjs_call(shen_lazyderef, [Arg5662_0, Arg5662_2])) == 'number'), Arg5662_2, Arg5662_3]))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [shen_type_symbol, "number"], Arg5662_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [(typeof(shenjs_call(shen_lazyderef, [Arg5662_0, Arg5662_2])) == 'number'), Arg5662_2, Arg5662_3]))),
  shenjs_call(shen_unbindv, [R0, Arg5662_2]),
  R1)
  : false)))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5662_1, Arg5662_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "boolean"], R0)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_boolean$question$(shenjs_call(shen_lazyderef, [Arg5662_0, Arg5662_2])), Arg5662_2, Arg5662_3]))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [shen_type_symbol, "boolean"], Arg5662_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_boolean$question$(shenjs_call(shen_lazyderef, [Arg5662_0, Arg5662_2])), Arg5662_2, Arg5662_3]))),
  shenjs_call(shen_unbindv, [R0, Arg5662_2]),
  R1)
  : false)))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5662_1, Arg5662_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "string"], R0)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [(typeof(shenjs_call(shen_lazyderef, [Arg5662_0, Arg5662_2])) == 'string'), Arg5662_2, Arg5662_3]))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [shen_type_symbol, "string"], Arg5662_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [(typeof(shenjs_call(shen_lazyderef, [Arg5662_0, Arg5662_2])) == 'string'), Arg5662_2, Arg5662_3]))),
  shenjs_call(shen_unbindv, [R0, Arg5662_2]),
  R1)
  : false)))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5662_1, Arg5662_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R0)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_is_type(shenjs_call(shen_lazyderef, [Arg5662_0, Arg5662_2]), shen_type_symbol), Arg5662_2, (new Shenjs_freeze([Arg5662_0, Arg5662_1, Arg5662_3, Arg5662_2], function(Arg5664) {
  var Arg5664_0 = Arg5664[0], Arg5664_1 = Arg5664[1], Arg5664_2 = Arg5664[2], Arg5664_3 = Arg5664[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [(!shenjs_call(shen_placeholder$question$, [shenjs_call(shen_lazyderef, [Arg5664_0, Arg5664_3])])), Arg5664_3, Arg5664_2]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [shen_type_symbol, "symbol"], Arg5662_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_is_type(shenjs_call(shen_lazyderef, [Arg5662_0, Arg5662_2]), shen_type_symbol), Arg5662_2, (new Shenjs_freeze([R0, Arg5662_0, Arg5662_1, Arg5662_3, Arg5662_2], function(Arg5666) {
  var Arg5666_0 = Arg5666[0], Arg5666_1 = Arg5666[1], Arg5666_2 = Arg5666[2], Arg5666_3 = Arg5666[3], Arg5666_4 = Arg5666[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [(!shenjs_call(shen_placeholder$question$, [shenjs_call(shen_lazyderef, [Arg5666_1, Arg5666_4])])), Arg5666_4, Arg5666_3]);});})}))]))),
  shenjs_call(shen_unbindv, [R0, Arg5662_2]),
  R1)
  : false)))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5662_0, Arg5662_2])),
  ((shenjs_empty$question$(R0))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5662_1, Arg5662_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg5662_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "list"], R1)))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[2], Arg5662_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? (R1[1],
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5662_2])),
  ((shenjs_empty$question$(R1))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_thaw(Arg5662_3))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg5662_2]),
  (R0 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5662_3)))),
  shenjs_call(shen_unbindv, [R1, Arg5662_2]),
  R0)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R0 = shenjs_call(shen_newpv, [Arg5662_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R0, []], Arg5662_2]),
  (R0 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5662_3)))),
  shenjs_call(shen_unbindv, [R1, Arg5662_2]),
  R0)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [shen_type_symbol, "list"], Arg5662_2]),
  (R0 = ((R0 = shenjs_call(shen_lazyderef, [R0[2], Arg5662_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? (R0[1],
  (R0 = shenjs_call(shen_lazyderef, [R0[2], Arg5662_2])),
  ((shenjs_empty$question$(R0))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5662_3)))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [], Arg5662_2]),
  (R2 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5662_3)))),
  shenjs_call(shen_unbindv, [R0, Arg5662_2]),
  R2)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5662_2])),
  shenjs_call(shen_bindv, [R0, [shen_type_cons, R2, []], Arg5662_2]),
  (R2 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5662_3)))),
  shenjs_call(shen_unbindv, [R0, Arg5662_2]),
  R2)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5662_2]),
  R0)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5662_2])),
  shenjs_call(shen_bindv, [R0, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, R1, []]], Arg5662_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5662_3)))),
  shenjs_call(shen_unbindv, [R0, Arg5662_2]),
  R1)
  : false)))
  : false))
  : R0))
  : R0))
  : R0))
  : R0))},
  4,
  [],
  "shen-base"];
shenjs_functions["shen_shen-base"] = shen_base;






shen_placeholder$question$ = [shen_type_func,
  function shen_user_lambda5669(Arg5668) {
  if (Arg5668.length < 1) return [shen_type_func, shen_user_lambda5669, 1, Arg5668];
  var Arg5668_0 = Arg5668[0];
  return (shenjs_is_type(Arg5668_0, shen_type_symbol) && shenjs_call(shen_placeholder_help$question$, [shenjs_str(Arg5668_0)]))},
  1,
  [],
  "shen-placeholder?"];
shenjs_functions["shen_shen-placeholder?"] = shen_placeholder$question$;






shen_placeholder_help$question$ = [shen_type_func,
  function shen_user_lambda5671(Arg5670) {
  if (Arg5670.length < 1) return [shen_type_func, shen_user_lambda5671, 1, Arg5670];
  var Arg5670_0 = Arg5670[0];
  return (((shenjs_call(shen_$plus$string$question$, [Arg5670_0]) && (shenjs_unwind_tail(shenjs_$eq$("&", Arg5670_0[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(Arg5670_0)]) && shenjs_unwind_tail(shenjs_$eq$("&", shenjs_tlstr(Arg5670_0)[0]))))))
  ? true
  : false)},
  1,
  [],
  "shen-placeholder-help?"];
shenjs_functions["shen_shen-placeholder-help?"] = shen_placeholder_help$question$;






shen_by$_hypothesis = [shen_type_func,
  function shen_user_lambda5673(Arg5672) {
  if (Arg5672.length < 5) return [shen_type_func, shen_user_lambda5673, 5, Arg5672];
  var Arg5672_0 = Arg5672[0], Arg5672_1 = Arg5672[1], Arg5672_2 = Arg5672[2], Arg5672_3 = Arg5672[3], Arg5672_4 = Arg5672[4];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5672_2, Arg5672_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R0 = shenjs_call(shen_lazyderef, [R0[1], Arg5672_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = R0[1]),
  (R0 = shenjs_call(shen_lazyderef, [R0[2], Arg5672_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R0[1], Arg5672_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R0[2], Arg5672_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R0 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5672_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_identical, [Arg5672_0, R1, Arg5672_3, (new Shenjs_freeze([R1, R0, Arg5672_2, Arg5672_0, Arg5672_1, Arg5672_3, Arg5672_4], function(Arg5674) {
  var Arg5674_0 = Arg5674[0], Arg5674_1 = Arg5674[1], Arg5674_2 = Arg5674[2], Arg5674_3 = Arg5674[3], Arg5674_4 = Arg5674[4], Arg5674_5 = Arg5674[5], Arg5674_6 = Arg5674[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5674_4, Arg5674_1, Arg5674_5, Arg5674_6]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5672_2, Arg5672_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_by$_hypothesis, [Arg5672_0, Arg5672_1, R0, Arg5672_3, Arg5672_4]);}))
  : false))
  : R0))},
  5,
  [],
  "shen-by_hypothesis"];
shenjs_functions["shen_shen-by_hypothesis"] = shen_by$_hypothesis;






shen_t$asterisk$_def = [shen_type_func,
  function shen_user_lambda5677(Arg5676) {
  if (Arg5676.length < 5) return [shen_type_func, shen_user_lambda5677, 5, Arg5676];
  var Arg5676_0 = Arg5676[0], Arg5676_1 = Arg5676[1], Arg5676_2 = Arg5676[2], Arg5676_3 = Arg5676[3], Arg5676_4 = Arg5676[4];
  var R0, R1, R2, R3, R4, R5, R6, R7, R8, R9;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = shenjs_call(shen_lazyderef, [Arg5676_0, Arg5676_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5676_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "define"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5676_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = R2[2]),
  (R3 = shenjs_call(shen_newpv, [Arg5676_3])),
  (R4 = shenjs_call(shen_newpv, [Arg5676_3])),
  (R5 = shenjs_call(shen_newpv, [Arg5676_3])),
  (R6 = shenjs_call(shen_newpv, [Arg5676_3])),
  (R7 = shenjs_call(shen_newpv, [Arg5676_3])),
  (R8 = shenjs_call(shen_newpv, [Arg5676_3])),
  (R9 = shenjs_call(shen_newpv, [Arg5676_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [R4, shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda5679(Arg5678) {
  if (Arg5678.length < 1) return [shen_type_func, shen_user_lambda5679, 1, Arg5678];
  var Arg5678_0 = Arg5678[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$sig$plus$rules$gt$, [Arg5678_0]);})},
  1,
  []], shenjs_call(shen_lazyderef, [R2, Arg5676_3]), []]), Arg5676_3, (new Shenjs_freeze([R2, R3, R4, R5, R0, R6, R7, Arg5676_2, R8, R1, Arg5676_1, R9, Arg5676_3, Arg5676_4], function(Arg5680) {
  var Arg5680_0 = Arg5680[0], Arg5680_1 = Arg5680[1], Arg5680_2 = Arg5680[2], Arg5680_3 = Arg5680[3], Arg5680_4 = Arg5680[4], Arg5680_5 = Arg5680[5], Arg5680_6 = Arg5680[6], Arg5680_7 = Arg5680[7], Arg5680_8 = Arg5680[8], Arg5680_9 = Arg5680[9], Arg5680_10 = Arg5680[10], Arg5680_11 = Arg5680[11], Arg5680_12 = Arg5680[12], Arg5680_13 = Arg5680[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5680_1, ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_lazyderef, [Arg5680_2, Arg5680_12]), shen_fail_obj)))
  ? shenjs_call(shen_errordef, [shenjs_call(shen_lazyderef, [Arg5680_9, Arg5680_12])])
  : [shen_type_symbol, "shen-skip"]), Arg5680_12, (new Shenjs_freeze([Arg5680_1, Arg5680_2, Arg5680_3, Arg5680_4, Arg5680_5, Arg5680_6, Arg5680_7, Arg5680_8, Arg5680_9, Arg5680_10, Arg5680_11, Arg5680_12, Arg5680_13], function(Arg5682) {
  var Arg5682_0 = Arg5682[0], Arg5682_1 = Arg5682[1], Arg5682_2 = Arg5682[2], Arg5682_3 = Arg5682[3], Arg5682_4 = Arg5682[4], Arg5682_5 = Arg5682[5], Arg5682_6 = Arg5682[6], Arg5682_7 = Arg5682[7], Arg5682_8 = Arg5682[8], Arg5682_9 = Arg5682[9], Arg5682_10 = Arg5682[10], Arg5682_11 = Arg5682[11], Arg5682_12 = Arg5682[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5682_10, shenjs_call(shen_lazyderef, [Arg5682_1, Arg5682_11])[1], Arg5682_11, (new Shenjs_freeze([Arg5682_1, Arg5682_2, Arg5682_3, Arg5682_4, Arg5682_5, Arg5682_6, Arg5682_7, Arg5682_8, Arg5682_9, Arg5682_10, Arg5682_11, Arg5682_12], function(Arg5684) {
  var Arg5684_0 = Arg5684[0], Arg5684_1 = Arg5684[1], Arg5684_2 = Arg5684[2], Arg5684_3 = Arg5684[3], Arg5684_4 = Arg5684[4], Arg5684_5 = Arg5684[5], Arg5684_6 = Arg5684[6], Arg5684_7 = Arg5684[7], Arg5684_8 = Arg5684[8], Arg5684_9 = Arg5684[9], Arg5684_10 = Arg5684[10], Arg5684_11 = Arg5684[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5684_3, shenjs_call(shen_lazyderef, [Arg5684_0, Arg5684_10])[2], Arg5684_10, (new Shenjs_freeze([Arg5684_0, Arg5684_1, Arg5684_2, Arg5684_3, Arg5684_4, Arg5684_5, Arg5684_6, Arg5684_7, Arg5684_8, Arg5684_9, Arg5684_10, Arg5684_11], function(Arg5686) {
  var Arg5686_0 = Arg5686[0], Arg5686_1 = Arg5686[1], Arg5686_2 = Arg5686[2], Arg5686_3 = Arg5686[3], Arg5686_4 = Arg5686[4], Arg5686_5 = Arg5686[5], Arg5686_6 = Arg5686[6], Arg5686_7 = Arg5686[7], Arg5686_8 = Arg5686[8], Arg5686_9 = Arg5686[9], Arg5686_10 = Arg5686[10], Arg5686_11 = Arg5686[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5686_1, shenjs_call(shen_extract$_vars, [shenjs_call(shen_lazyderef, [Arg5686_9, Arg5686_10])]), Arg5686_10, (new Shenjs_freeze([Arg5686_1, Arg5686_2, Arg5686_3, Arg5686_4, Arg5686_5, Arg5686_6, Arg5686_7, Arg5686_8, Arg5686_9, Arg5686_10, Arg5686_11], function(Arg5688) {
  var Arg5688_0 = Arg5688[0], Arg5688_1 = Arg5688[1], Arg5688_2 = Arg5688[2], Arg5688_3 = Arg5688[3], Arg5688_4 = Arg5688[4], Arg5688_5 = Arg5688[5], Arg5688_6 = Arg5688[6], Arg5688_7 = Arg5688[7], Arg5688_8 = Arg5688[8], Arg5688_9 = Arg5688[9], Arg5688_10 = Arg5688[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5688_3, shenjs_call(shen_placeholders, [shenjs_call(shen_lazyderef, [Arg5688_8, Arg5688_9]), shenjs_call(shen_lazyderef, [Arg5688_0, Arg5688_9])]), Arg5688_9, (new Shenjs_freeze([Arg5688_0, Arg5688_1, Arg5688_2, Arg5688_3, Arg5688_4, Arg5688_5, Arg5688_6, Arg5688_7, Arg5688_8, Arg5688_9, Arg5688_10], function(Arg5690) {
  var Arg5690_0 = Arg5690[0], Arg5690_1 = Arg5690[1], Arg5690_2 = Arg5690[2], Arg5690_3 = Arg5690[3], Arg5690_4 = Arg5690[4], Arg5690_5 = Arg5690[5], Arg5690_6 = Arg5690[6], Arg5690_7 = Arg5690[7], Arg5690_8 = Arg5690[8], Arg5690_9 = Arg5690[9], Arg5690_10 = Arg5690[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5690_1, Arg5690_9, (new Shenjs_freeze([Arg5690_1, Arg5690_2, Arg5690_3, Arg5690_4, Arg5690_5, Arg5690_6, Arg5690_7, Arg5690_8, Arg5690_9, Arg5690_10], function(Arg5692) {
  var Arg5692_0 = Arg5692[0], Arg5692_1 = Arg5692[1], Arg5692_2 = Arg5692[2], Arg5692_3 = Arg5692[3], Arg5692_4 = Arg5692[4], Arg5692_5 = Arg5692[5], Arg5692_6 = Arg5692[6], Arg5692_7 = Arg5692[7], Arg5692_8 = Arg5692[8], Arg5692_9 = Arg5692[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_rules, [Arg5692_1, Arg5692_2, 1, Arg5692_5, [shen_type_cons, [shen_type_cons, Arg5692_5, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5692_2, []]]], Arg5692_3], Arg5692_8, (new Shenjs_freeze([Arg5692_1, Arg5692_2, Arg5692_3, Arg5692_4, Arg5692_5, Arg5692_6, Arg5692_7, Arg5692_8, Arg5692_9], function(Arg5694) {
  var Arg5694_0 = Arg5694[0], Arg5694_1 = Arg5694[1], Arg5694_2 = Arg5694[2], Arg5694_3 = Arg5694[3], Arg5694_4 = Arg5694[4], Arg5694_5 = Arg5694[5], Arg5694_6 = Arg5694[6], Arg5694_7 = Arg5694[7], Arg5694_8 = Arg5694[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5694_3, shenjs_call(shen_declare, [shenjs_call(shen_lazyderef, [Arg5694_4, Arg5694_7]), shenjs_call(shen_lazyderef, [Arg5694_6, Arg5694_7])]), Arg5694_7, (new Shenjs_freeze([Arg5694_3, Arg5694_4, Arg5694_5, Arg5694_6, Arg5694_7, Arg5694_8], function(Arg5696) {
  var Arg5696_0 = Arg5696[0], Arg5696_1 = Arg5696[1], Arg5696_2 = Arg5696[2], Arg5696_3 = Arg5696[3], Arg5696_4 = Arg5696[4], Arg5696_5 = Arg5696[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5696_2, Arg5696_3, Arg5696_4, Arg5696_5]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))
  : false))
  : false))
  : false))]);}))},
  5,
  [],
  "shen-t*-def"];
shenjs_functions["shen_shen-t*-def"] = shen_t$asterisk$_def;






shen_$lt$sig$plus$rules$gt$ = [shen_type_func,
  function shen_user_lambda5699(Arg5698) {
  if (Arg5698.length < 1) return [shen_type_func, shen_user_lambda5699, 1, Arg5698];
  var Arg5698_0 = Arg5698[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$signature$gt$, [Arg5698_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$trules$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<sig+rules>"];
shenjs_functions["shen_shen-<sig+rules>"] = shen_$lt$sig$plus$rules$gt$;






shen_placeholders = [shen_type_func,
  function shen_user_lambda5701(Arg5700) {
  if (Arg5700.length < 2) return [shen_type_func, shen_user_lambda5701, 2, Arg5700];
  var Arg5700_0 = Arg5700[0], Arg5700_1 = Arg5700[1];
  return ((shenjs_is_type(Arg5700_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda5703(Arg5702) {
  if (Arg5702.length < 2) return [shen_type_func, shen_user_lambda5703, 2, Arg5702];
  var Arg5702_0 = Arg5702[0], Arg5702_1 = Arg5702[1];
  return (function() {
  return shenjs_call_tail(shen_placeholders, [Arg5702_1, Arg5702_0]);})},
  2,
  [Arg5700_1]], Arg5700_0]);})
  : ((shenjs_call(shen_element$question$, [Arg5700_0, Arg5700_1]))
  ? (function() {
  return shenjs_call_tail(shen_concat, [[shen_type_symbol, "&&"], Arg5700_0]);})
  : Arg5700_0))},
  2,
  [],
  "shen-placeholders"];
shenjs_functions["shen_shen-placeholders"] = shen_placeholders;






shen_$lt$trules$gt$ = [shen_type_func,
  function shen_user_lambda5705(Arg5704) {
  if (Arg5704.length < 1) return [shen_type_func, shen_user_lambda5705, 1, Arg5704];
  var Arg5704_0 = Arg5704[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$trule$gt$, [Arg5704_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$trules$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$trule$gt$, [Arg5704_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R0]), []]])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<trules>"];
shenjs_functions["shen_shen-<trules>"] = shen_$lt$trules$gt$;






shen_$lt$trule$gt$ = [shen_type_func,
  function shen_user_lambda5707(Arg5706) {
  if (Arg5706.length < 1) return [shen_type_func, shen_user_lambda5707, 1, Arg5706];
  var Arg5706_0 = Arg5706[0];
  var R0, R1, R2, R3, R4;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg5706_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$arrow$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? ((R2 = shenjs_call(shen_$lt$action$gt$, [R1])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R2))))
  ? ((R3 = shenjs_call(shen_$lt$guard$question$$gt$, [R2])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R3))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R3]), ((R4 = shenjs_call(shen_extract$_vars, [shenjs_call(shen_snd, [R0])])),
  (R0 = shenjs_call(shen_placeholders, [shenjs_call(shen_snd, [R0]), R4])),
  (R2 = shenjs_call(shen_placeholders, [shenjs_call(shen_curry, [shenjs_call(shen_snd, [R2])]), R4])),
  (R4 = shenjs_call(shen_placeholders, [shenjs_call(shen_curry, [shenjs_call(shen_snd, [R3])]), R4])),
  shenjs_call(shen_form_rule, [R0, shenjs_call(shen_snd, [R1]), R2, R4]))])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<trule>"];
shenjs_functions["shen_shen-<trule>"] = shen_$lt$trule$gt$;






shen_form_rule = [shen_type_func,
  function shen_user_lambda5709(Arg5708) {
  if (Arg5708.length < 4) return [shen_type_func, shen_user_lambda5709, 4, Arg5708];
  var Arg5708_0 = Arg5708[0], Arg5708_1 = Arg5708[1], Arg5708_2 = Arg5708[2], Arg5708_3 = Arg5708[3];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-forward"], Arg5708_1)))
  ? [shen_type_cons, Arg5708_0, [shen_type_cons, ((shenjs_unwind_tail(shenjs_$eq$(Arg5708_3, [shen_type_symbol, "shen-skip"])))
  ? Arg5708_2
  : [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, Arg5708_3, [shen_type_cons, Arg5708_2, []]]]), []]]
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-backward"], Arg5708_1)) && (shenjs_is_type(Arg5708_2, shen_type_cons) && (shenjs_is_type(Arg5708_2[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fail-if"], Arg5708_2[1][1])) && (shenjs_is_type(Arg5708_2[1][2], shen_type_cons) && (shenjs_empty$question$(Arg5708_2[1][2][2]) && (shenjs_is_type(Arg5708_2[2], shen_type_cons) && shenjs_empty$question$(Arg5708_2[2][2])))))))))
  ? [shen_type_cons, Arg5708_0, [shen_type_cons, ((shenjs_unwind_tail(shenjs_$eq$(Arg5708_3, [shen_type_symbol, "shen-skip"])))
  ? [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, Arg5708_2[1][2][1], Arg5708_2[2]], []]], Arg5708_2[2]]]
  : [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, Arg5708_3, []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, Arg5708_2[1][2][1], Arg5708_2[2]], []]], []]], Arg5708_2[2]]]), []]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-backward"], Arg5708_1)))
  ? [shen_type_cons, Arg5708_0, [shen_type_cons, ((shenjs_unwind_tail(shenjs_$eq$(Arg5708_3, [shen_type_symbol, "shen-skip"])))
  ? [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "=="], [shen_type_cons, Arg5708_2, []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]], []]], [shen_type_cons, Arg5708_2, []]]]
  : [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, Arg5708_3, []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "=="], [shen_type_cons, Arg5708_2, []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]], []]], []]], [shen_type_cons, Arg5708_2, []]]]), []]]
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "shen-form-rule"]]);}))))},
  4,
  [],
  "shen-form-rule"];
shenjs_functions["shen_shen-form-rule"] = shen_form_rule;






shen_$lt$guard$question$$gt$ = [shen_type_func,
  function shen_user_lambda5711(Arg5710) {
  if (Arg5710.length < 1) return [shen_type_func, shen_user_lambda5711, 1, Arg5710];
  var Arg5710_0 = Arg5710[0];
  var R0;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg5710_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "where"], shenjs_call(shen_fst, [Arg5710_0])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$guard$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg5710_0])[2], shenjs_call(shen_snd, [Arg5710_0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg5710_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_symbol, "shen-skip"]])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<guard?>"];
shenjs_functions["shen_shen-<guard?>"] = shen_$lt$guard$question$$gt$;






shen_$lt$arrow$gt$ = [shen_type_func,
  function shen_user_lambda5713(Arg5712) {
  if (Arg5712.length < 1) return [shen_type_func, shen_user_lambda5713, 1, Arg5712];
  var Arg5712_0 = Arg5712[0];
  var R0;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg5712_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "->"], shenjs_call(shen_fst, [Arg5712_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg5712_0])[2], shenjs_call(shen_snd, [Arg5712_0])])]), [shen_type_symbol, "shen-forward"]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg5712_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "<-"], shenjs_call(shen_fst, [Arg5712_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg5712_0])[2], shenjs_call(shen_snd, [Arg5712_0])])]), [shen_type_symbol, "shen-backward"]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))
  : R0))},
  1,
  [],
  "shen-<arrow>"];
shenjs_functions["shen_shen-<arrow>"] = shen_$lt$arrow$gt$;






shen_errordef = [shen_type_func,
  function shen_user_lambda5715(Arg5714) {
  if (Arg5714.length < 1) return [shen_type_func, shen_user_lambda5715, 1, Arg5714];
  var Arg5714_0 = Arg5714[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["syntax error in ~A~%", [shen_tuple, Arg5714_0, []]]);})},
  1,
  [],
  "shen-errordef"];
shenjs_functions["shen_shen-errordef"] = shen_errordef;






shen_t$asterisk$_rules = [shen_type_func,
  function shen_user_lambda5717(Arg5716) {
  if (Arg5716.length < 7) return [shen_type_func, shen_user_lambda5717, 7, Arg5716];
  var Arg5716_0 = Arg5716[0], Arg5716_1 = Arg5716[1], Arg5716_2 = Arg5716[2], Arg5716_3 = Arg5716[3], Arg5716_4 = Arg5716[4], Arg5716_5 = Arg5716[5], Arg5716_6 = Arg5716[6];
  var R0, R1, R2, R3;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5716_0, Arg5716_5])),
  ((shenjs_empty$question$(R1))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5716_6)))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg5716_0, Arg5716_5])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = R1[2]),
  (R3 = shenjs_call(shen_newpv, [Arg5716_5])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_t$asterisk$_rule, [R2, Arg5716_1, Arg5716_2, Arg5716_3, Arg5716_4, Arg5716_5, (new Shenjs_freeze([R2, R0, Arg5716_2, R1, Arg5716_1, R3, Arg5716_3, Arg5716_4, Arg5716_5, Arg5716_6], function(Arg5718) {
  var Arg5718_0 = Arg5718[0], Arg5718_1 = Arg5718[1], Arg5718_2 = Arg5718[2], Arg5718_3 = Arg5718[3], Arg5718_4 = Arg5718[4], Arg5718_5 = Arg5718[5], Arg5718_6 = Arg5718[6], Arg5718_7 = Arg5718[7], Arg5718_8 = Arg5718[8], Arg5718_9 = Arg5718[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5718_1, Arg5718_8, (new Shenjs_freeze([Arg5718_1, Arg5718_2, Arg5718_3, Arg5718_4, Arg5718_5, Arg5718_6, Arg5718_7, Arg5718_8, Arg5718_9], function(Arg5720) {
  var Arg5720_0 = Arg5720[0], Arg5720_1 = Arg5720[1], Arg5720_2 = Arg5720[2], Arg5720_3 = Arg5720[3], Arg5720_4 = Arg5720[4], Arg5720_5 = Arg5720[5], Arg5720_6 = Arg5720[6], Arg5720_7 = Arg5720[7], Arg5720_8 = Arg5720[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5720_4, (shenjs_call(shen_lazyderef, [Arg5720_1, Arg5720_7]) + 1), Arg5720_7, (new Shenjs_freeze([Arg5720_1, Arg5720_2, Arg5720_3, Arg5720_4, Arg5720_5, Arg5720_6, Arg5720_7, Arg5720_8], function(Arg5722) {
  var Arg5722_0 = Arg5722[0], Arg5722_1 = Arg5722[1], Arg5722_2 = Arg5722[2], Arg5722_3 = Arg5722[3], Arg5722_4 = Arg5722[4], Arg5722_5 = Arg5722[5], Arg5722_6 = Arg5722[6], Arg5722_7 = Arg5722[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_rules, [Arg5722_1, Arg5722_2, Arg5722_3, Arg5722_4, Arg5722_5, Arg5722_6, Arg5722_7]);});})}))]);});})}))]);});})}))]))
  : false))
  : R1))]);}))},
  7,
  [],
  "shen-t*-rules"];
shenjs_functions["shen_shen-t*-rules"] = shen_t$asterisk$_rules;






shen_t$asterisk$_rule = [shen_type_func,
  function shen_user_lambda5725(Arg5724) {
  if (Arg5724.length < 7) return [shen_type_func, shen_user_lambda5725, 7, Arg5724];
  var Arg5724_0 = Arg5724[0], Arg5724_1 = Arg5724[1], Arg5724_2 = Arg5724[2], Arg5724_3 = Arg5724[3], Arg5724_4 = Arg5724[4], Arg5724_5 = Arg5724[5], Arg5724_6 = Arg5724[6];
  var R0;
  return ((R0 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_t$asterisk$_ruleh, [Arg5724_0, Arg5724_1, Arg5724_4, Arg5724_5, Arg5724_6]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_newpv, [Arg5724_5])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [R0, shenjs_call(shen_type_insecure_rule_error_message, [shenjs_call(shen_lazyderef, [Arg5724_2, Arg5724_5]), shenjs_call(shen_lazyderef, [Arg5724_3, Arg5724_5])]), Arg5724_5, Arg5724_6]);}))
  : R0))},
  7,
  [],
  "shen-t*-rule"];
shenjs_functions["shen_shen-t*-rule"] = shen_t$asterisk$_rule;






shen_t$asterisk$_ruleh = [shen_type_func,
  function shen_user_lambda5727(Arg5726) {
  if (Arg5726.length < 5) return [shen_type_func, shen_user_lambda5727, 5, Arg5726];
  var Arg5726_0 = Arg5726[0], Arg5726_1 = Arg5726[1], Arg5726_2 = Arg5726[2], Arg5726_3 = Arg5726[3], Arg5726_4 = Arg5726[4];
  var R0, R1, R2, R3, R4, R5;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = shenjs_call(shen_lazyderef, [Arg5726_0, Arg5726_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5726_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R3 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5726_3])),
  ((shenjs_empty$question$(R1))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5726_3])),
  (R4 = shenjs_call(shen_newpv, [Arg5726_3])),
  (R5 = shenjs_call(shen_newpv, [Arg5726_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_t$asterisk$_patterns, [R2, Arg5726_1, R1, R4, Arg5726_3, (new Shenjs_freeze([R2, Arg5726_1, R1, Arg5726_2, R0, R3, R4, R5, Arg5726_3, Arg5726_4], function(Arg5728) {
  var Arg5728_0 = Arg5728[0], Arg5728_1 = Arg5728[1], Arg5728_2 = Arg5728[2], Arg5728_3 = Arg5728[3], Arg5728_4 = Arg5728[4], Arg5728_5 = Arg5728[5], Arg5728_6 = Arg5728[6], Arg5728_7 = Arg5728[7], Arg5728_8 = Arg5728[8], Arg5728_9 = Arg5728[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5728_4, Arg5728_8, (new Shenjs_freeze([Arg5728_2, Arg5728_3, Arg5728_4, Arg5728_5, Arg5728_6, Arg5728_7, Arg5728_8, Arg5728_9], function(Arg5730) {
  var Arg5730_0 = Arg5730[0], Arg5730_1 = Arg5730[1], Arg5730_2 = Arg5730[2], Arg5730_3 = Arg5730[3], Arg5730_4 = Arg5730[4], Arg5730_5 = Arg5730[5], Arg5730_6 = Arg5730[6], Arg5730_7 = Arg5730[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_conc, [Arg5730_0, Arg5730_1, Arg5730_5, Arg5730_6, (new Shenjs_freeze([Arg5730_0, Arg5730_1, Arg5730_2, Arg5730_3, Arg5730_4, Arg5730_5, Arg5730_6, Arg5730_7], function(Arg5732) {
  var Arg5732_0 = Arg5732[0], Arg5732_1 = Arg5732[1], Arg5732_2 = Arg5732[2], Arg5732_3 = Arg5732[3], Arg5732_4 = Arg5732[4], Arg5732_5 = Arg5732[5], Arg5732_6 = Arg5732[6], Arg5732_7 = Arg5732[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5732_2, Arg5732_6, (new Shenjs_freeze([Arg5732_2, Arg5732_3, Arg5732_4, Arg5732_5, Arg5732_6, Arg5732_7], function(Arg5734) {
  var Arg5734_0 = Arg5734[0], Arg5734_1 = Arg5734[1], Arg5734_2 = Arg5734[2], Arg5734_3 = Arg5734[3], Arg5734_4 = Arg5734[4], Arg5734_5 = Arg5734[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5734_1, Arg5734_2, Arg5734_3, Arg5734_4, Arg5734_5]);});})}))]);});})}))]);});})}))]);});})}))]))
  : false))
  : false))
  : false))]);}))},
  5,
  [],
  "shen-t*-ruleh"];
shenjs_functions["shen_shen-t*-ruleh"] = shen_t$asterisk$_ruleh;






shen_type_insecure_rule_error_message = [shen_type_func,
  function shen_user_lambda5737(Arg5736) {
  if (Arg5736.length < 2) return [shen_type_func, shen_user_lambda5737, 2, Arg5736];
  var Arg5736_0 = Arg5736[0], Arg5736_1 = Arg5736[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["type error in rule ~A of ~A~%", [shen_tuple, Arg5736_0, [shen_tuple, Arg5736_1, []]]]);})},
  2,
  [],
  "shen-type-insecure-rule-error-message"];
shenjs_functions["shen_shen-type-insecure-rule-error-message"] = shen_type_insecure_rule_error_message;






shen_t$asterisk$_patterns = [shen_type_func,
  function shen_user_lambda5739(Arg5738) {
  if (Arg5738.length < 6) return [shen_type_func, shen_user_lambda5739, 6, Arg5738];
  var Arg5738_0 = Arg5738[0], Arg5738_1 = Arg5738[1], Arg5738_2 = Arg5738[2], Arg5738_3 = Arg5738[3], Arg5738_4 = Arg5738[4], Arg5738_5 = Arg5738[5];
  var R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5738_0, Arg5738_4])),
  ((shenjs_empty$question$(R1))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg5738_2, Arg5738_4])),
  ((shenjs_empty$question$(R1))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [Arg5738_3, Arg5738_1, Arg5738_4, Arg5738_5]))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg5738_4]),
  (R2 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [Arg5738_3, Arg5738_1, Arg5738_4, Arg5738_5]))),
  shenjs_call(shen_unbindv, [R1, Arg5738_4]),
  R2)
  : false)))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg5738_0, Arg5738_4])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = R1[2]),
  (R3 = shenjs_call(shen_lazyderef, [Arg5738_1, Arg5738_4])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5738_4])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R3[1], Arg5738_4])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-->"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R3[2], Arg5738_4])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R3 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg5738_4])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = shenjs_call(shen_lazyderef, [Arg5738_2, Arg5738_4])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R6 = shenjs_call(shen_lazyderef, [R5[1], Arg5738_4])),
  ((shenjs_is_type(R6, shen_type_cons))
  ? ((R7 = R6[1]),
  (R6 = shenjs_call(shen_lazyderef, [R6[2], Arg5738_4])),
  ((shenjs_is_type(R6, shen_type_cons))
  ? ((R8 = shenjs_call(shen_lazyderef, [R6[1], Arg5738_4])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R8)))
  ? ((R8 = shenjs_call(shen_lazyderef, [R6[2], Arg5738_4])),
  ((shenjs_is_type(R8, shen_type_cons))
  ? ((R6 = R8[1]),
  (R8 = shenjs_call(shen_lazyderef, [R8[2], Arg5738_4])),
  ((shenjs_empty$question$(R8))
  ? ((R8 = R5[2]),
  (R5 = shenjs_call(shen_newpv, [Arg5738_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R6, R4, Arg5738_4, (new Shenjs_freeze([R4, R2, R7, R6, R5, R0, R1, R3, R8, Arg5738_3, Arg5738_4, Arg5738_5], function(Arg5740) {
  var Arg5740_0 = Arg5740[0], Arg5740_1 = Arg5740[1], Arg5740_2 = Arg5740[2], Arg5740_3 = Arg5740[3], Arg5740_4 = Arg5740[4], Arg5740_5 = Arg5740[5], Arg5740_6 = Arg5740[6], Arg5740_7 = Arg5740[7], Arg5740_8 = Arg5740[8], Arg5740_9 = Arg5740[9], Arg5740_10 = Arg5740[10], Arg5740_11 = Arg5740[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5740_2, Arg5740_1, Arg5740_10, (new Shenjs_freeze([Arg5740_1, Arg5740_2, Arg5740_3, Arg5740_4, Arg5740_5, Arg5740_6, Arg5740_7, Arg5740_8, Arg5740_9, Arg5740_10, Arg5740_11], function(Arg5742) {
  var Arg5742_0 = Arg5742[0], Arg5742_1 = Arg5742[1], Arg5742_2 = Arg5742[2], Arg5742_3 = Arg5742[3], Arg5742_4 = Arg5742[4], Arg5742_5 = Arg5742[5], Arg5742_6 = Arg5742[6], Arg5742_7 = Arg5742[7], Arg5742_8 = Arg5742[8], Arg5742_9 = Arg5742[9], Arg5742_10 = Arg5742[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5742_1, Arg5742_3, Arg5742_9, (new Shenjs_freeze([Arg5742_1, Arg5742_2, Arg5742_3, Arg5742_4, Arg5742_5, Arg5742_6, Arg5742_7, Arg5742_8, Arg5742_9, Arg5742_10], function(Arg5744) {
  var Arg5744_0 = Arg5744[0], Arg5744_1 = Arg5744[1], Arg5744_2 = Arg5744[2], Arg5744_3 = Arg5744[3], Arg5744_4 = Arg5744[4], Arg5744_5 = Arg5744[5], Arg5744_6 = Arg5744[6], Arg5744_7 = Arg5744[7], Arg5744_8 = Arg5744[8], Arg5744_9 = Arg5744[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5744_3, Arg5744_8, (new Shenjs_freeze([Arg5744_0, Arg5744_1, Arg5744_2, Arg5744_3, Arg5744_4, Arg5744_5, Arg5744_6, Arg5744_7, Arg5744_8, Arg5744_9], function(Arg5746) {
  var Arg5746_0 = Arg5746[0], Arg5746_1 = Arg5746[1], Arg5746_2 = Arg5746[2], Arg5746_3 = Arg5746[3], Arg5746_4 = Arg5746[4], Arg5746_5 = Arg5746[5], Arg5746_6 = Arg5746[6], Arg5746_7 = Arg5746[7], Arg5746_8 = Arg5746[8], Arg5746_9 = Arg5746[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5746_0, Arg5746_1, Arg5746_2, Arg5746_8, (new Shenjs_freeze([Arg5746_0, Arg5746_1, Arg5746_2, Arg5746_3, Arg5746_4, Arg5746_5, Arg5746_6, Arg5746_7, Arg5746_8, Arg5746_9], function(Arg5748) {
  var Arg5748_0 = Arg5748[0], Arg5748_1 = Arg5748[1], Arg5748_2 = Arg5748[2], Arg5748_3 = Arg5748[3], Arg5748_4 = Arg5748[4], Arg5748_5 = Arg5748[5], Arg5748_6 = Arg5748[6], Arg5748_7 = Arg5748[7], Arg5748_8 = Arg5748[8], Arg5748_9 = Arg5748[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5748_3, Arg5748_8, (new Shenjs_freeze([Arg5748_3, Arg5748_4, Arg5748_5, Arg5748_6, Arg5748_7, Arg5748_8, Arg5748_9], function(Arg5750) {
  var Arg5750_0 = Arg5750[0], Arg5750_1 = Arg5750[1], Arg5750_2 = Arg5750[2], Arg5750_3 = Arg5750[3], Arg5750_4 = Arg5750[4], Arg5750_5 = Arg5750[5], Arg5750_6 = Arg5750[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5750_1, Arg5750_2, Arg5750_3, Arg5750_4, Arg5750_5, Arg5750_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R8]))
  ? (shenjs_call(shen_bindv, [R8, [], Arg5738_4]),
  (R7 = ((R5 = R5[2]),
  (R9 = shenjs_call(shen_newpv, [Arg5738_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R6, R4, Arg5738_4, (new Shenjs_freeze([R4, R2, R7, R6, R9, R0, R1, R3, R5, Arg5738_3, Arg5738_4, Arg5738_5, R8, Arg5738_4], function(Arg5752) {
  var Arg5752_0 = Arg5752[0], Arg5752_1 = Arg5752[1], Arg5752_2 = Arg5752[2], Arg5752_3 = Arg5752[3], Arg5752_4 = Arg5752[4], Arg5752_5 = Arg5752[5], Arg5752_6 = Arg5752[6], Arg5752_7 = Arg5752[7], Arg5752_8 = Arg5752[8], Arg5752_9 = Arg5752[9], Arg5752_10 = Arg5752[10], Arg5752_11 = Arg5752[11], Arg5752_12 = Arg5752[12], Arg5752_13 = Arg5752[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5752_2, Arg5752_1, Arg5752_10, (new Shenjs_freeze([Arg5752_1, Arg5752_2, Arg5752_3, Arg5752_4, Arg5752_5, Arg5752_6, Arg5752_7, Arg5752_8, Arg5752_9, Arg5752_10, Arg5752_11], function(Arg5754) {
  var Arg5754_0 = Arg5754[0], Arg5754_1 = Arg5754[1], Arg5754_2 = Arg5754[2], Arg5754_3 = Arg5754[3], Arg5754_4 = Arg5754[4], Arg5754_5 = Arg5754[5], Arg5754_6 = Arg5754[6], Arg5754_7 = Arg5754[7], Arg5754_8 = Arg5754[8], Arg5754_9 = Arg5754[9], Arg5754_10 = Arg5754[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5754_1, Arg5754_3, Arg5754_9, (new Shenjs_freeze([Arg5754_1, Arg5754_2, Arg5754_3, Arg5754_4, Arg5754_5, Arg5754_6, Arg5754_7, Arg5754_8, Arg5754_9, Arg5754_10], function(Arg5756) {
  var Arg5756_0 = Arg5756[0], Arg5756_1 = Arg5756[1], Arg5756_2 = Arg5756[2], Arg5756_3 = Arg5756[3], Arg5756_4 = Arg5756[4], Arg5756_5 = Arg5756[5], Arg5756_6 = Arg5756[6], Arg5756_7 = Arg5756[7], Arg5756_8 = Arg5756[8], Arg5756_9 = Arg5756[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5756_3, Arg5756_8, (new Shenjs_freeze([Arg5756_0, Arg5756_1, Arg5756_2, Arg5756_3, Arg5756_4, Arg5756_5, Arg5756_6, Arg5756_7, Arg5756_8, Arg5756_9], function(Arg5758) {
  var Arg5758_0 = Arg5758[0], Arg5758_1 = Arg5758[1], Arg5758_2 = Arg5758[2], Arg5758_3 = Arg5758[3], Arg5758_4 = Arg5758[4], Arg5758_5 = Arg5758[5], Arg5758_6 = Arg5758[6], Arg5758_7 = Arg5758[7], Arg5758_8 = Arg5758[8], Arg5758_9 = Arg5758[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5758_0, Arg5758_1, Arg5758_2, Arg5758_8, (new Shenjs_freeze([Arg5758_0, Arg5758_1, Arg5758_2, Arg5758_3, Arg5758_4, Arg5758_5, Arg5758_6, Arg5758_7, Arg5758_8, Arg5758_9], function(Arg5760) {
  var Arg5760_0 = Arg5760[0], Arg5760_1 = Arg5760[1], Arg5760_2 = Arg5760[2], Arg5760_3 = Arg5760[3], Arg5760_4 = Arg5760[4], Arg5760_5 = Arg5760[5], Arg5760_6 = Arg5760[6], Arg5760_7 = Arg5760[7], Arg5760_8 = Arg5760[8], Arg5760_9 = Arg5760[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5760_3, Arg5760_8, (new Shenjs_freeze([Arg5760_3, Arg5760_4, Arg5760_5, Arg5760_6, Arg5760_7, Arg5760_8, Arg5760_9], function(Arg5762) {
  var Arg5762_0 = Arg5762[0], Arg5762_1 = Arg5762[1], Arg5762_2 = Arg5762[2], Arg5762_3 = Arg5762[3], Arg5762_4 = Arg5762[4], Arg5762_5 = Arg5762[5], Arg5762_6 = Arg5762[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5762_1, Arg5762_2, Arg5762_3, Arg5762_4, Arg5762_5, Arg5762_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R8, Arg5738_4]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R8]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5738_4])),
  shenjs_call(shen_bindv, [R8, [shen_type_cons, R6, []], Arg5738_4]),
  (R7 = ((R5 = R5[2]),
  (R9 = shenjs_call(shen_newpv, [Arg5738_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R6, R4, Arg5738_4, (new Shenjs_freeze([R4, R2, R7, R6, R9, R0, R1, R3, R5, Arg5738_3, Arg5738_4, Arg5738_5, R8, Arg5738_4], function(Arg5764) {
  var Arg5764_0 = Arg5764[0], Arg5764_1 = Arg5764[1], Arg5764_2 = Arg5764[2], Arg5764_3 = Arg5764[3], Arg5764_4 = Arg5764[4], Arg5764_5 = Arg5764[5], Arg5764_6 = Arg5764[6], Arg5764_7 = Arg5764[7], Arg5764_8 = Arg5764[8], Arg5764_9 = Arg5764[9], Arg5764_10 = Arg5764[10], Arg5764_11 = Arg5764[11], Arg5764_12 = Arg5764[12], Arg5764_13 = Arg5764[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5764_2, Arg5764_1, Arg5764_10, (new Shenjs_freeze([Arg5764_1, Arg5764_2, Arg5764_3, Arg5764_4, Arg5764_5, Arg5764_6, Arg5764_7, Arg5764_8, Arg5764_9, Arg5764_10, Arg5764_11], function(Arg5766) {
  var Arg5766_0 = Arg5766[0], Arg5766_1 = Arg5766[1], Arg5766_2 = Arg5766[2], Arg5766_3 = Arg5766[3], Arg5766_4 = Arg5766[4], Arg5766_5 = Arg5766[5], Arg5766_6 = Arg5766[6], Arg5766_7 = Arg5766[7], Arg5766_8 = Arg5766[8], Arg5766_9 = Arg5766[9], Arg5766_10 = Arg5766[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5766_1, Arg5766_3, Arg5766_9, (new Shenjs_freeze([Arg5766_1, Arg5766_2, Arg5766_3, Arg5766_4, Arg5766_5, Arg5766_6, Arg5766_7, Arg5766_8, Arg5766_9, Arg5766_10], function(Arg5768) {
  var Arg5768_0 = Arg5768[0], Arg5768_1 = Arg5768[1], Arg5768_2 = Arg5768[2], Arg5768_3 = Arg5768[3], Arg5768_4 = Arg5768[4], Arg5768_5 = Arg5768[5], Arg5768_6 = Arg5768[6], Arg5768_7 = Arg5768[7], Arg5768_8 = Arg5768[8], Arg5768_9 = Arg5768[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5768_3, Arg5768_8, (new Shenjs_freeze([Arg5768_0, Arg5768_1, Arg5768_2, Arg5768_3, Arg5768_4, Arg5768_5, Arg5768_6, Arg5768_7, Arg5768_8, Arg5768_9], function(Arg5770) {
  var Arg5770_0 = Arg5770[0], Arg5770_1 = Arg5770[1], Arg5770_2 = Arg5770[2], Arg5770_3 = Arg5770[3], Arg5770_4 = Arg5770[4], Arg5770_5 = Arg5770[5], Arg5770_6 = Arg5770[6], Arg5770_7 = Arg5770[7], Arg5770_8 = Arg5770[8], Arg5770_9 = Arg5770[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5770_0, Arg5770_1, Arg5770_2, Arg5770_8, (new Shenjs_freeze([Arg5770_0, Arg5770_1, Arg5770_2, Arg5770_3, Arg5770_4, Arg5770_5, Arg5770_6, Arg5770_7, Arg5770_8, Arg5770_9], function(Arg5772) {
  var Arg5772_0 = Arg5772[0], Arg5772_1 = Arg5772[1], Arg5772_2 = Arg5772[2], Arg5772_3 = Arg5772[3], Arg5772_4 = Arg5772[4], Arg5772_5 = Arg5772[5], Arg5772_6 = Arg5772[6], Arg5772_7 = Arg5772[7], Arg5772_8 = Arg5772[8], Arg5772_9 = Arg5772[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5772_3, Arg5772_8, (new Shenjs_freeze([Arg5772_3, Arg5772_4, Arg5772_5, Arg5772_6, Arg5772_7, Arg5772_8, Arg5772_9], function(Arg5774) {
  var Arg5774_0 = Arg5774[0], Arg5774_1 = Arg5774[1], Arg5774_2 = Arg5774[2], Arg5774_3 = Arg5774[3], Arg5774_4 = Arg5774[4], Arg5774_5 = Arg5774[5], Arg5774_6 = Arg5774[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5774_1, Arg5774_2, Arg5774_3, Arg5774_4, Arg5774_5, Arg5774_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R8, Arg5738_4]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R8]))
  ? (shenjs_call(shen_bindv, [R8, [shen_type_symbol, ":"], Arg5738_4]),
  (R7 = ((R6 = shenjs_call(shen_lazyderef, [R6[2], Arg5738_4])),
  ((shenjs_is_type(R6, shen_type_cons))
  ? ((R9 = R6[1]),
  (R6 = shenjs_call(shen_lazyderef, [R6[2], Arg5738_4])),
  ((shenjs_empty$question$(R6))
  ? ((R6 = R5[2]),
  (R5 = shenjs_call(shen_newpv, [Arg5738_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R9, R4, Arg5738_4, (new Shenjs_freeze([R4, R2, R7, R9, R5, R0, R1, R3, R6, Arg5738_3, Arg5738_4, Arg5738_5, R8, Arg5738_4], function(Arg5776) {
  var Arg5776_0 = Arg5776[0], Arg5776_1 = Arg5776[1], Arg5776_2 = Arg5776[2], Arg5776_3 = Arg5776[3], Arg5776_4 = Arg5776[4], Arg5776_5 = Arg5776[5], Arg5776_6 = Arg5776[6], Arg5776_7 = Arg5776[7], Arg5776_8 = Arg5776[8], Arg5776_9 = Arg5776[9], Arg5776_10 = Arg5776[10], Arg5776_11 = Arg5776[11], Arg5776_12 = Arg5776[12], Arg5776_13 = Arg5776[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5776_2, Arg5776_1, Arg5776_10, (new Shenjs_freeze([Arg5776_1, Arg5776_2, Arg5776_3, Arg5776_4, Arg5776_5, Arg5776_6, Arg5776_7, Arg5776_8, Arg5776_9, Arg5776_10, Arg5776_11], function(Arg5778) {
  var Arg5778_0 = Arg5778[0], Arg5778_1 = Arg5778[1], Arg5778_2 = Arg5778[2], Arg5778_3 = Arg5778[3], Arg5778_4 = Arg5778[4], Arg5778_5 = Arg5778[5], Arg5778_6 = Arg5778[6], Arg5778_7 = Arg5778[7], Arg5778_8 = Arg5778[8], Arg5778_9 = Arg5778[9], Arg5778_10 = Arg5778[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5778_1, Arg5778_3, Arg5778_9, (new Shenjs_freeze([Arg5778_1, Arg5778_2, Arg5778_3, Arg5778_4, Arg5778_5, Arg5778_6, Arg5778_7, Arg5778_8, Arg5778_9, Arg5778_10], function(Arg5780) {
  var Arg5780_0 = Arg5780[0], Arg5780_1 = Arg5780[1], Arg5780_2 = Arg5780[2], Arg5780_3 = Arg5780[3], Arg5780_4 = Arg5780[4], Arg5780_5 = Arg5780[5], Arg5780_6 = Arg5780[6], Arg5780_7 = Arg5780[7], Arg5780_8 = Arg5780[8], Arg5780_9 = Arg5780[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5780_3, Arg5780_8, (new Shenjs_freeze([Arg5780_0, Arg5780_1, Arg5780_2, Arg5780_3, Arg5780_4, Arg5780_5, Arg5780_6, Arg5780_7, Arg5780_8, Arg5780_9], function(Arg5782) {
  var Arg5782_0 = Arg5782[0], Arg5782_1 = Arg5782[1], Arg5782_2 = Arg5782[2], Arg5782_3 = Arg5782[3], Arg5782_4 = Arg5782[4], Arg5782_5 = Arg5782[5], Arg5782_6 = Arg5782[6], Arg5782_7 = Arg5782[7], Arg5782_8 = Arg5782[8], Arg5782_9 = Arg5782[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5782_0, Arg5782_1, Arg5782_2, Arg5782_8, (new Shenjs_freeze([Arg5782_0, Arg5782_1, Arg5782_2, Arg5782_3, Arg5782_4, Arg5782_5, Arg5782_6, Arg5782_7, Arg5782_8, Arg5782_9], function(Arg5784) {
  var Arg5784_0 = Arg5784[0], Arg5784_1 = Arg5784[1], Arg5784_2 = Arg5784[2], Arg5784_3 = Arg5784[3], Arg5784_4 = Arg5784[4], Arg5784_5 = Arg5784[5], Arg5784_6 = Arg5784[6], Arg5784_7 = Arg5784[7], Arg5784_8 = Arg5784[8], Arg5784_9 = Arg5784[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5784_3, Arg5784_8, (new Shenjs_freeze([Arg5784_3, Arg5784_4, Arg5784_5, Arg5784_6, Arg5784_7, Arg5784_8, Arg5784_9], function(Arg5786) {
  var Arg5786_0 = Arg5786[0], Arg5786_1 = Arg5786[1], Arg5786_2 = Arg5786[2], Arg5786_3 = Arg5786[3], Arg5786_4 = Arg5786[4], Arg5786_5 = Arg5786[5], Arg5786_6 = Arg5786[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5786_1, Arg5786_2, Arg5786_3, Arg5786_4, Arg5786_5, Arg5786_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? (shenjs_call(shen_bindv, [R6, [], Arg5738_4]),
  (R9 = ((R5 = R5[2]),
  (R10 = shenjs_call(shen_newpv, [Arg5738_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R9, R4, Arg5738_4, (new Shenjs_freeze([R4, R2, R7, R9, R10, R0, R1, R3, R5, Arg5738_3, Arg5738_4, Arg5738_5, R6, Arg5738_4, R8, Arg5738_4], function(Arg5788) {
  var Arg5788_0 = Arg5788[0], Arg5788_1 = Arg5788[1], Arg5788_2 = Arg5788[2], Arg5788_3 = Arg5788[3], Arg5788_4 = Arg5788[4], Arg5788_5 = Arg5788[5], Arg5788_6 = Arg5788[6], Arg5788_7 = Arg5788[7], Arg5788_8 = Arg5788[8], Arg5788_9 = Arg5788[9], Arg5788_10 = Arg5788[10], Arg5788_11 = Arg5788[11], Arg5788_12 = Arg5788[12], Arg5788_13 = Arg5788[13], Arg5788_14 = Arg5788[14], Arg5788_15 = Arg5788[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5788_2, Arg5788_1, Arg5788_10, (new Shenjs_freeze([Arg5788_1, Arg5788_2, Arg5788_3, Arg5788_4, Arg5788_5, Arg5788_6, Arg5788_7, Arg5788_8, Arg5788_9, Arg5788_10, Arg5788_11], function(Arg5790) {
  var Arg5790_0 = Arg5790[0], Arg5790_1 = Arg5790[1], Arg5790_2 = Arg5790[2], Arg5790_3 = Arg5790[3], Arg5790_4 = Arg5790[4], Arg5790_5 = Arg5790[5], Arg5790_6 = Arg5790[6], Arg5790_7 = Arg5790[7], Arg5790_8 = Arg5790[8], Arg5790_9 = Arg5790[9], Arg5790_10 = Arg5790[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5790_1, Arg5790_3, Arg5790_9, (new Shenjs_freeze([Arg5790_1, Arg5790_2, Arg5790_3, Arg5790_4, Arg5790_5, Arg5790_6, Arg5790_7, Arg5790_8, Arg5790_9, Arg5790_10], function(Arg5792) {
  var Arg5792_0 = Arg5792[0], Arg5792_1 = Arg5792[1], Arg5792_2 = Arg5792[2], Arg5792_3 = Arg5792[3], Arg5792_4 = Arg5792[4], Arg5792_5 = Arg5792[5], Arg5792_6 = Arg5792[6], Arg5792_7 = Arg5792[7], Arg5792_8 = Arg5792[8], Arg5792_9 = Arg5792[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5792_3, Arg5792_8, (new Shenjs_freeze([Arg5792_0, Arg5792_1, Arg5792_2, Arg5792_3, Arg5792_4, Arg5792_5, Arg5792_6, Arg5792_7, Arg5792_8, Arg5792_9], function(Arg5794) {
  var Arg5794_0 = Arg5794[0], Arg5794_1 = Arg5794[1], Arg5794_2 = Arg5794[2], Arg5794_3 = Arg5794[3], Arg5794_4 = Arg5794[4], Arg5794_5 = Arg5794[5], Arg5794_6 = Arg5794[6], Arg5794_7 = Arg5794[7], Arg5794_8 = Arg5794[8], Arg5794_9 = Arg5794[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5794_0, Arg5794_1, Arg5794_2, Arg5794_8, (new Shenjs_freeze([Arg5794_0, Arg5794_1, Arg5794_2, Arg5794_3, Arg5794_4, Arg5794_5, Arg5794_6, Arg5794_7, Arg5794_8, Arg5794_9], function(Arg5796) {
  var Arg5796_0 = Arg5796[0], Arg5796_1 = Arg5796[1], Arg5796_2 = Arg5796[2], Arg5796_3 = Arg5796[3], Arg5796_4 = Arg5796[4], Arg5796_5 = Arg5796[5], Arg5796_6 = Arg5796[6], Arg5796_7 = Arg5796[7], Arg5796_8 = Arg5796[8], Arg5796_9 = Arg5796[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5796_3, Arg5796_8, (new Shenjs_freeze([Arg5796_3, Arg5796_4, Arg5796_5, Arg5796_6, Arg5796_7, Arg5796_8, Arg5796_9], function(Arg5798) {
  var Arg5798_0 = Arg5798[0], Arg5798_1 = Arg5798[1], Arg5798_2 = Arg5798[2], Arg5798_3 = Arg5798[3], Arg5798_4 = Arg5798[4], Arg5798_5 = Arg5798[5], Arg5798_6 = Arg5798[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5798_1, Arg5798_2, Arg5798_3, Arg5798_4, Arg5798_5, Arg5798_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R6, Arg5738_4]),
  R9)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? ((R9 = shenjs_call(shen_newpv, [Arg5738_4])),
  shenjs_call(shen_bindv, [R6, [shen_type_cons, R9, []], Arg5738_4]),
  (R9 = ((R5 = R5[2]),
  (R10 = shenjs_call(shen_newpv, [Arg5738_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R9, R4, Arg5738_4, (new Shenjs_freeze([R4, R2, R7, R9, R10, R0, R1, R3, R5, Arg5738_3, Arg5738_4, Arg5738_5, R6, Arg5738_4, R8, Arg5738_4], function(Arg5800) {
  var Arg5800_0 = Arg5800[0], Arg5800_1 = Arg5800[1], Arg5800_2 = Arg5800[2], Arg5800_3 = Arg5800[3], Arg5800_4 = Arg5800[4], Arg5800_5 = Arg5800[5], Arg5800_6 = Arg5800[6], Arg5800_7 = Arg5800[7], Arg5800_8 = Arg5800[8], Arg5800_9 = Arg5800[9], Arg5800_10 = Arg5800[10], Arg5800_11 = Arg5800[11], Arg5800_12 = Arg5800[12], Arg5800_13 = Arg5800[13], Arg5800_14 = Arg5800[14], Arg5800_15 = Arg5800[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5800_2, Arg5800_1, Arg5800_10, (new Shenjs_freeze([Arg5800_1, Arg5800_2, Arg5800_3, Arg5800_4, Arg5800_5, Arg5800_6, Arg5800_7, Arg5800_8, Arg5800_9, Arg5800_10, Arg5800_11], function(Arg5802) {
  var Arg5802_0 = Arg5802[0], Arg5802_1 = Arg5802[1], Arg5802_2 = Arg5802[2], Arg5802_3 = Arg5802[3], Arg5802_4 = Arg5802[4], Arg5802_5 = Arg5802[5], Arg5802_6 = Arg5802[6], Arg5802_7 = Arg5802[7], Arg5802_8 = Arg5802[8], Arg5802_9 = Arg5802[9], Arg5802_10 = Arg5802[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5802_1, Arg5802_3, Arg5802_9, (new Shenjs_freeze([Arg5802_1, Arg5802_2, Arg5802_3, Arg5802_4, Arg5802_5, Arg5802_6, Arg5802_7, Arg5802_8, Arg5802_9, Arg5802_10], function(Arg5804) {
  var Arg5804_0 = Arg5804[0], Arg5804_1 = Arg5804[1], Arg5804_2 = Arg5804[2], Arg5804_3 = Arg5804[3], Arg5804_4 = Arg5804[4], Arg5804_5 = Arg5804[5], Arg5804_6 = Arg5804[6], Arg5804_7 = Arg5804[7], Arg5804_8 = Arg5804[8], Arg5804_9 = Arg5804[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5804_3, Arg5804_8, (new Shenjs_freeze([Arg5804_0, Arg5804_1, Arg5804_2, Arg5804_3, Arg5804_4, Arg5804_5, Arg5804_6, Arg5804_7, Arg5804_8, Arg5804_9], function(Arg5806) {
  var Arg5806_0 = Arg5806[0], Arg5806_1 = Arg5806[1], Arg5806_2 = Arg5806[2], Arg5806_3 = Arg5806[3], Arg5806_4 = Arg5806[4], Arg5806_5 = Arg5806[5], Arg5806_6 = Arg5806[6], Arg5806_7 = Arg5806[7], Arg5806_8 = Arg5806[8], Arg5806_9 = Arg5806[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5806_0, Arg5806_1, Arg5806_2, Arg5806_8, (new Shenjs_freeze([Arg5806_0, Arg5806_1, Arg5806_2, Arg5806_3, Arg5806_4, Arg5806_5, Arg5806_6, Arg5806_7, Arg5806_8, Arg5806_9], function(Arg5808) {
  var Arg5808_0 = Arg5808[0], Arg5808_1 = Arg5808[1], Arg5808_2 = Arg5808[2], Arg5808_3 = Arg5808[3], Arg5808_4 = Arg5808[4], Arg5808_5 = Arg5808[5], Arg5808_6 = Arg5808[6], Arg5808_7 = Arg5808[7], Arg5808_8 = Arg5808[8], Arg5808_9 = Arg5808[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5808_3, Arg5808_8, (new Shenjs_freeze([Arg5808_3, Arg5808_4, Arg5808_5, Arg5808_6, Arg5808_7, Arg5808_8, Arg5808_9], function(Arg5810) {
  var Arg5810_0 = Arg5810[0], Arg5810_1 = Arg5810[1], Arg5810_2 = Arg5810[2], Arg5810_3 = Arg5810[3], Arg5810_4 = Arg5810[4], Arg5810_5 = Arg5810[5], Arg5810_6 = Arg5810[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5810_1, Arg5810_2, Arg5810_3, Arg5810_4, Arg5810_5, Arg5810_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R6, Arg5738_4]),
  R9)
  : false)))),
  shenjs_call(shen_unbindv, [R8, Arg5738_4]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? ((R8 = shenjs_call(shen_newpv, [Arg5738_4])),
  shenjs_call(shen_bindv, [R6, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, R8, []]], Arg5738_4]),
  (R8 = ((R5 = R5[2]),
  (R9 = shenjs_call(shen_newpv, [Arg5738_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R8, R4, Arg5738_4, (new Shenjs_freeze([R4, R2, R7, R8, R9, R0, R1, R3, R5, Arg5738_3, Arg5738_4, Arg5738_5, R6, Arg5738_4], function(Arg5812) {
  var Arg5812_0 = Arg5812[0], Arg5812_1 = Arg5812[1], Arg5812_2 = Arg5812[2], Arg5812_3 = Arg5812[3], Arg5812_4 = Arg5812[4], Arg5812_5 = Arg5812[5], Arg5812_6 = Arg5812[6], Arg5812_7 = Arg5812[7], Arg5812_8 = Arg5812[8], Arg5812_9 = Arg5812[9], Arg5812_10 = Arg5812[10], Arg5812_11 = Arg5812[11], Arg5812_12 = Arg5812[12], Arg5812_13 = Arg5812[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5812_2, Arg5812_1, Arg5812_10, (new Shenjs_freeze([Arg5812_1, Arg5812_2, Arg5812_3, Arg5812_4, Arg5812_5, Arg5812_6, Arg5812_7, Arg5812_8, Arg5812_9, Arg5812_10, Arg5812_11], function(Arg5814) {
  var Arg5814_0 = Arg5814[0], Arg5814_1 = Arg5814[1], Arg5814_2 = Arg5814[2], Arg5814_3 = Arg5814[3], Arg5814_4 = Arg5814[4], Arg5814_5 = Arg5814[5], Arg5814_6 = Arg5814[6], Arg5814_7 = Arg5814[7], Arg5814_8 = Arg5814[8], Arg5814_9 = Arg5814[9], Arg5814_10 = Arg5814[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5814_1, Arg5814_3, Arg5814_9, (new Shenjs_freeze([Arg5814_1, Arg5814_2, Arg5814_3, Arg5814_4, Arg5814_5, Arg5814_6, Arg5814_7, Arg5814_8, Arg5814_9, Arg5814_10], function(Arg5816) {
  var Arg5816_0 = Arg5816[0], Arg5816_1 = Arg5816[1], Arg5816_2 = Arg5816[2], Arg5816_3 = Arg5816[3], Arg5816_4 = Arg5816[4], Arg5816_5 = Arg5816[5], Arg5816_6 = Arg5816[6], Arg5816_7 = Arg5816[7], Arg5816_8 = Arg5816[8], Arg5816_9 = Arg5816[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5816_3, Arg5816_8, (new Shenjs_freeze([Arg5816_0, Arg5816_1, Arg5816_2, Arg5816_3, Arg5816_4, Arg5816_5, Arg5816_6, Arg5816_7, Arg5816_8, Arg5816_9], function(Arg5818) {
  var Arg5818_0 = Arg5818[0], Arg5818_1 = Arg5818[1], Arg5818_2 = Arg5818[2], Arg5818_3 = Arg5818[3], Arg5818_4 = Arg5818[4], Arg5818_5 = Arg5818[5], Arg5818_6 = Arg5818[6], Arg5818_7 = Arg5818[7], Arg5818_8 = Arg5818[8], Arg5818_9 = Arg5818[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5818_0, Arg5818_1, Arg5818_2, Arg5818_8, (new Shenjs_freeze([Arg5818_0, Arg5818_1, Arg5818_2, Arg5818_3, Arg5818_4, Arg5818_5, Arg5818_6, Arg5818_7, Arg5818_8, Arg5818_9], function(Arg5820) {
  var Arg5820_0 = Arg5820[0], Arg5820_1 = Arg5820[1], Arg5820_2 = Arg5820[2], Arg5820_3 = Arg5820[3], Arg5820_4 = Arg5820[4], Arg5820_5 = Arg5820[5], Arg5820_6 = Arg5820[6], Arg5820_7 = Arg5820[7], Arg5820_8 = Arg5820[8], Arg5820_9 = Arg5820[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5820_3, Arg5820_8, (new Shenjs_freeze([Arg5820_3, Arg5820_4, Arg5820_5, Arg5820_6, Arg5820_7, Arg5820_8, Arg5820_9], function(Arg5822) {
  var Arg5822_0 = Arg5822[0], Arg5822_1 = Arg5822[1], Arg5822_2 = Arg5822[2], Arg5822_3 = Arg5822[3], Arg5822_4 = Arg5822[4], Arg5822_5 = Arg5822[5], Arg5822_6 = Arg5822[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5822_1, Arg5822_2, Arg5822_3, Arg5822_4, Arg5822_5, Arg5822_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R6, Arg5738_4]),
  R8)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? ((R7 = shenjs_call(shen_newpv, [Arg5738_4])),
  (R8 = shenjs_call(shen_newpv, [Arg5738_4])),
  shenjs_call(shen_bindv, [R6, [shen_type_cons, R7, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, R8, []]]], Arg5738_4]),
  (R8 = ((R5 = R5[2]),
  (R9 = shenjs_call(shen_newpv, [Arg5738_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R8, R4, Arg5738_4, (new Shenjs_freeze([R4, R2, R7, R8, R9, R0, R1, R3, R5, Arg5738_3, Arg5738_4, Arg5738_5, R6, Arg5738_4], function(Arg5824) {
  var Arg5824_0 = Arg5824[0], Arg5824_1 = Arg5824[1], Arg5824_2 = Arg5824[2], Arg5824_3 = Arg5824[3], Arg5824_4 = Arg5824[4], Arg5824_5 = Arg5824[5], Arg5824_6 = Arg5824[6], Arg5824_7 = Arg5824[7], Arg5824_8 = Arg5824[8], Arg5824_9 = Arg5824[9], Arg5824_10 = Arg5824[10], Arg5824_11 = Arg5824[11], Arg5824_12 = Arg5824[12], Arg5824_13 = Arg5824[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5824_2, Arg5824_1, Arg5824_10, (new Shenjs_freeze([Arg5824_1, Arg5824_2, Arg5824_3, Arg5824_4, Arg5824_5, Arg5824_6, Arg5824_7, Arg5824_8, Arg5824_9, Arg5824_10, Arg5824_11], function(Arg5826) {
  var Arg5826_0 = Arg5826[0], Arg5826_1 = Arg5826[1], Arg5826_2 = Arg5826[2], Arg5826_3 = Arg5826[3], Arg5826_4 = Arg5826[4], Arg5826_5 = Arg5826[5], Arg5826_6 = Arg5826[6], Arg5826_7 = Arg5826[7], Arg5826_8 = Arg5826[8], Arg5826_9 = Arg5826[9], Arg5826_10 = Arg5826[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5826_1, Arg5826_3, Arg5826_9, (new Shenjs_freeze([Arg5826_1, Arg5826_2, Arg5826_3, Arg5826_4, Arg5826_5, Arg5826_6, Arg5826_7, Arg5826_8, Arg5826_9, Arg5826_10], function(Arg5828) {
  var Arg5828_0 = Arg5828[0], Arg5828_1 = Arg5828[1], Arg5828_2 = Arg5828[2], Arg5828_3 = Arg5828[3], Arg5828_4 = Arg5828[4], Arg5828_5 = Arg5828[5], Arg5828_6 = Arg5828[6], Arg5828_7 = Arg5828[7], Arg5828_8 = Arg5828[8], Arg5828_9 = Arg5828[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5828_3, Arg5828_8, (new Shenjs_freeze([Arg5828_0, Arg5828_1, Arg5828_2, Arg5828_3, Arg5828_4, Arg5828_5, Arg5828_6, Arg5828_7, Arg5828_8, Arg5828_9], function(Arg5830) {
  var Arg5830_0 = Arg5830[0], Arg5830_1 = Arg5830[1], Arg5830_2 = Arg5830[2], Arg5830_3 = Arg5830[3], Arg5830_4 = Arg5830[4], Arg5830_5 = Arg5830[5], Arg5830_6 = Arg5830[6], Arg5830_7 = Arg5830[7], Arg5830_8 = Arg5830[8], Arg5830_9 = Arg5830[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5830_0, Arg5830_1, Arg5830_2, Arg5830_8, (new Shenjs_freeze([Arg5830_0, Arg5830_1, Arg5830_2, Arg5830_3, Arg5830_4, Arg5830_5, Arg5830_6, Arg5830_7, Arg5830_8, Arg5830_9], function(Arg5832) {
  var Arg5832_0 = Arg5832[0], Arg5832_1 = Arg5832[1], Arg5832_2 = Arg5832[2], Arg5832_3 = Arg5832[3], Arg5832_4 = Arg5832[4], Arg5832_5 = Arg5832[5], Arg5832_6 = Arg5832[6], Arg5832_7 = Arg5832[7], Arg5832_8 = Arg5832[8], Arg5832_9 = Arg5832[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5832_3, Arg5832_8, (new Shenjs_freeze([Arg5832_3, Arg5832_4, Arg5832_5, Arg5832_6, Arg5832_7, Arg5832_8, Arg5832_9], function(Arg5834) {
  var Arg5834_0 = Arg5834[0], Arg5834_1 = Arg5834[1], Arg5834_2 = Arg5834[2], Arg5834_3 = Arg5834[3], Arg5834_4 = Arg5834[4], Arg5834_5 = Arg5834[5], Arg5834_6 = Arg5834[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5834_1, Arg5834_2, Arg5834_3, Arg5834_4, Arg5834_5, Arg5834_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R6, Arg5738_4]),
  R8)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5738_4])),
  (R7 = shenjs_call(shen_newpv, [Arg5738_4])),
  (R8 = shenjs_call(shen_newpv, [Arg5738_4])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, [shen_type_cons, R6, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, R7, []]]], R8], Arg5738_4]),
  (R8 = ((R9 = shenjs_call(shen_newpv, [Arg5738_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R7, R4, Arg5738_4, (new Shenjs_freeze([R4, R2, R6, R7, R9, R0, R1, R3, R8, Arg5738_3, Arg5738_4, Arg5738_5, R5, Arg5738_4], function(Arg5836) {
  var Arg5836_0 = Arg5836[0], Arg5836_1 = Arg5836[1], Arg5836_2 = Arg5836[2], Arg5836_3 = Arg5836[3], Arg5836_4 = Arg5836[4], Arg5836_5 = Arg5836[5], Arg5836_6 = Arg5836[6], Arg5836_7 = Arg5836[7], Arg5836_8 = Arg5836[8], Arg5836_9 = Arg5836[9], Arg5836_10 = Arg5836[10], Arg5836_11 = Arg5836[11], Arg5836_12 = Arg5836[12], Arg5836_13 = Arg5836[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5836_2, Arg5836_1, Arg5836_10, (new Shenjs_freeze([Arg5836_1, Arg5836_2, Arg5836_3, Arg5836_4, Arg5836_5, Arg5836_6, Arg5836_7, Arg5836_8, Arg5836_9, Arg5836_10, Arg5836_11], function(Arg5838) {
  var Arg5838_0 = Arg5838[0], Arg5838_1 = Arg5838[1], Arg5838_2 = Arg5838[2], Arg5838_3 = Arg5838[3], Arg5838_4 = Arg5838[4], Arg5838_5 = Arg5838[5], Arg5838_6 = Arg5838[6], Arg5838_7 = Arg5838[7], Arg5838_8 = Arg5838[8], Arg5838_9 = Arg5838[9], Arg5838_10 = Arg5838[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5838_1, Arg5838_3, Arg5838_9, (new Shenjs_freeze([Arg5838_1, Arg5838_2, Arg5838_3, Arg5838_4, Arg5838_5, Arg5838_6, Arg5838_7, Arg5838_8, Arg5838_9, Arg5838_10], function(Arg5840) {
  var Arg5840_0 = Arg5840[0], Arg5840_1 = Arg5840[1], Arg5840_2 = Arg5840[2], Arg5840_3 = Arg5840[3], Arg5840_4 = Arg5840[4], Arg5840_5 = Arg5840[5], Arg5840_6 = Arg5840[6], Arg5840_7 = Arg5840[7], Arg5840_8 = Arg5840[8], Arg5840_9 = Arg5840[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5840_3, Arg5840_8, (new Shenjs_freeze([Arg5840_0, Arg5840_1, Arg5840_2, Arg5840_3, Arg5840_4, Arg5840_5, Arg5840_6, Arg5840_7, Arg5840_8, Arg5840_9], function(Arg5842) {
  var Arg5842_0 = Arg5842[0], Arg5842_1 = Arg5842[1], Arg5842_2 = Arg5842[2], Arg5842_3 = Arg5842[3], Arg5842_4 = Arg5842[4], Arg5842_5 = Arg5842[5], Arg5842_6 = Arg5842[6], Arg5842_7 = Arg5842[7], Arg5842_8 = Arg5842[8], Arg5842_9 = Arg5842[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5842_0, Arg5842_1, Arg5842_2, Arg5842_8, (new Shenjs_freeze([Arg5842_0, Arg5842_1, Arg5842_2, Arg5842_3, Arg5842_4, Arg5842_5, Arg5842_6, Arg5842_7, Arg5842_8, Arg5842_9], function(Arg5844) {
  var Arg5844_0 = Arg5844[0], Arg5844_1 = Arg5844[1], Arg5844_2 = Arg5844[2], Arg5844_3 = Arg5844[3], Arg5844_4 = Arg5844[4], Arg5844_5 = Arg5844[5], Arg5844_6 = Arg5844[6], Arg5844_7 = Arg5844[7], Arg5844_8 = Arg5844[8], Arg5844_9 = Arg5844[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5844_3, Arg5844_8, (new Shenjs_freeze([Arg5844_3, Arg5844_4, Arg5844_5, Arg5844_6, Arg5844_7, Arg5844_8, Arg5844_9], function(Arg5846) {
  var Arg5846_0 = Arg5846[0], Arg5846_1 = Arg5846[1], Arg5846_2 = Arg5846[2], Arg5846_3 = Arg5846[3], Arg5846_4 = Arg5846[4], Arg5846_5 = Arg5846[5], Arg5846_6 = Arg5846[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5846_1, Arg5846_2, Arg5846_3, Arg5846_4, Arg5846_5, Arg5846_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg5738_4]),
  R8)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))
  : R1))]);}))},
  6,
  [],
  "shen-t*-patterns"];
shenjs_functions["shen_shen-t*-patterns"] = shen_t$asterisk$_patterns;






shen_t$asterisk$_assume = [shen_type_func,
  function shen_user_lambda5849(Arg5848) {
  if (Arg5848.length < 4) return [shen_type_func, shen_user_lambda5849, 4, Arg5848];
  var Arg5848_0 = Arg5848[0], Arg5848_1 = Arg5848[1], Arg5848_2 = Arg5848[2], Arg5848_3 = Arg5848[3];
  var R0, R1, R2, R3, R4;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R0 = ((R1 = shenjs_call(shen_lazyderef, [Arg5848_0, Arg5848_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = R1[2]),
  (R3 = shenjs_call(shen_newpv, [Arg5848_2])),
  (R4 = shenjs_call(shen_newpv, [Arg5848_2])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5848_2, (new Shenjs_freeze([R0, R2, R1, Arg5848_1, R3, R4, Arg5848_2, Arg5848_3, Arg5848_0, Arg5848_1, Arg5848_3, Arg5848_2], function(Arg5850) {
  var Arg5850_0 = Arg5850[0], Arg5850_1 = Arg5850[1], Arg5850_2 = Arg5850[2], Arg5850_3 = Arg5850[3], Arg5850_4 = Arg5850[4], Arg5850_5 = Arg5850[5], Arg5850_6 = Arg5850[6], Arg5850_7 = Arg5850[7], Arg5850_8 = Arg5850[8], Arg5850_9 = Arg5850[9], Arg5850_10 = Arg5850[10], Arg5850_11 = Arg5850[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5850_1, Arg5850_4, Arg5850_6, (new Shenjs_freeze([Arg5850_1, Arg5850_2, Arg5850_3, Arg5850_4, Arg5850_5, Arg5850_6, Arg5850_7], function(Arg5852) {
  var Arg5852_0 = Arg5852[0], Arg5852_1 = Arg5852[1], Arg5852_2 = Arg5852[2], Arg5852_3 = Arg5852[3], Arg5852_4 = Arg5852[4], Arg5852_5 = Arg5852[5], Arg5852_6 = Arg5852[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5852_1, Arg5852_4, Arg5852_5, (new Shenjs_freeze([Arg5852_1, Arg5852_2, Arg5852_3, Arg5852_4, Arg5852_5, Arg5852_6], function(Arg5854) {
  var Arg5854_0 = Arg5854[0], Arg5854_1 = Arg5854[1], Arg5854_2 = Arg5854[2], Arg5854_3 = Arg5854[3], Arg5854_4 = Arg5854[4], Arg5854_5 = Arg5854[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5854_1, shenjs_call(shen_append, [shenjs_call(shen_lazyderef, [Arg5854_2, Arg5854_4]), shenjs_call(shen_lazyderef, [Arg5854_3, Arg5854_4])]), Arg5854_4, Arg5854_5]);});})}))]);});})}))]);});})}))]))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = ((R0 = shenjs_call(shen_newpv, [Arg5848_2])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_call(shen_placeholder$question$, [shenjs_call(shen_lazyderef, [Arg5848_0, Arg5848_2])]), Arg5848_2, (new Shenjs_freeze([Arg5848_1, Arg5848_0, R0, Arg5848_2, Arg5848_3, Arg5848_1, Arg5848_3, Arg5848_2], function(Arg5856) {
  var Arg5856_0 = Arg5856[0], Arg5856_1 = Arg5856[1], Arg5856_2 = Arg5856[2], Arg5856_3 = Arg5856[3], Arg5856_4 = Arg5856[4], Arg5856_5 = Arg5856[5], Arg5856_6 = Arg5856[6], Arg5856_7 = Arg5856[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5856_0, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [Arg5856_1, Arg5856_3]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [Arg5856_2, Arg5856_3]), []]]], []], Arg5856_3, Arg5856_4]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5848_1, Arg5848_2])),
  ((shenjs_empty$question$(R0))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5848_3)))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [], Arg5848_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5848_3)))),
  shenjs_call(shen_unbindv, [R0, Arg5848_2]),
  R1)
  : false)))
  : R0))
  : R0))]);}))},
  4,
  [],
  "shen-t*-assume"];
shenjs_functions["shen_shen-t*-assume"] = shen_t$asterisk$_assume;






shen_conc = [shen_type_func,
  function shen_user_lambda5859(Arg5858) {
  if (Arg5858.length < 5) return [shen_type_func, shen_user_lambda5859, 5, Arg5858];
  var Arg5858_0 = Arg5858[0], Arg5858_1 = Arg5858[1], Arg5858_2 = Arg5858[2], Arg5858_3 = Arg5858[3], Arg5858_4 = Arg5858[4];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5858_0, Arg5858_3])),
  ((shenjs_empty$question$(R0))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5858_2, shenjs_call(shen_lazyderef, [Arg5858_1, Arg5858_3]), Arg5858_3, Arg5858_4]))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5858_0, Arg5858_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = R0[1]),
  (R0 = R0[2]),
  (R2 = shenjs_call(shen_newpv, [Arg5858_3])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [Arg5858_2, [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5858_3]), shenjs_call(shen_lazyderef, [R2, Arg5858_3])], Arg5858_3, (new Shenjs_freeze([Arg5858_2, R1, R0, Arg5858_1, R2, Arg5858_3, Arg5858_4], function(Arg5860) {
  var Arg5860_0 = Arg5860[0], Arg5860_1 = Arg5860[1], Arg5860_2 = Arg5860[2], Arg5860_3 = Arg5860[3], Arg5860_4 = Arg5860[4], Arg5860_5 = Arg5860[5], Arg5860_6 = Arg5860[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_conc, [Arg5860_2, Arg5860_3, Arg5860_4, Arg5860_5, Arg5860_6]);});})}))]);}))
  : false))
  : R0))},
  5,
  [],
  "shen-conc"];
shenjs_functions["shen_shen-conc"] = shen_conc;






shen_findallhelp = [shen_type_func,
  function shen_user_lambda5863(Arg5862) {
  if (Arg5862.length < 6) return [shen_type_func, shen_user_lambda5863, 6, Arg5862];
  var Arg5862_0 = Arg5862[0], Arg5862_1 = Arg5862[1], Arg5862_2 = Arg5862[2], Arg5862_3 = Arg5862[3], Arg5862_4 = Arg5862[4], Arg5862_5 = Arg5862[5];
  var R0;
  return ((R0 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_call, [Arg5862_1, Arg5862_4, (new Shenjs_freeze([Arg5862_1, Arg5862_0, Arg5862_2, Arg5862_3, Arg5862_4, Arg5862_5], function(Arg5864) {
  var Arg5864_0 = Arg5864[0], Arg5864_1 = Arg5864[1], Arg5864_2 = Arg5864[2], Arg5864_3 = Arg5864[3], Arg5864_4 = Arg5864[4], Arg5864_5 = Arg5864[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_remember, [Arg5864_3, Arg5864_1, Arg5864_4, (new Shenjs_freeze([Arg5864_3, Arg5864_1, Arg5864_4, Arg5864_5], function(Arg5866) {
  var Arg5866_0 = Arg5866[0], Arg5866_1 = Arg5866[1], Arg5866_2 = Arg5866[2], Arg5866_3 = Arg5866[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [false, Arg5866_2, Arg5866_3]);});})}))]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? (shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [Arg5862_2, (shenjs_globals["shen_" + shenjs_call(shen_lazyderef, [Arg5862_3, Arg5862_4])[1]]), Arg5862_4, Arg5862_5]);}))
  : R0))},
  6,
  [],
  "shen-findallhelp"];
shenjs_functions["shen_shen-findallhelp"] = shen_findallhelp;






shen_remember = [shen_type_func,
  function shen_user_lambda5869(Arg5868) {
  if (Arg5868.length < 4) return [shen_type_func, shen_user_lambda5869, 4, Arg5868];
  var Arg5868_0 = Arg5868[0], Arg5868_1 = Arg5868[1], Arg5868_2 = Arg5868[2], Arg5868_3 = Arg5868[3];
  var R0;
  return ((R0 = shenjs_call(shen_newpv, [Arg5868_2])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [R0, (shenjs_globals["shen_" + shenjs_call(shen_deref, [Arg5868_0, Arg5868_2])[1]] = [shen_type_cons, shenjs_call(shen_deref, [Arg5868_1, Arg5868_2]), (shenjs_globals["shen_" + shenjs_call(shen_deref, [Arg5868_0, Arg5868_2])[1]])]), Arg5868_2, Arg5868_3]);}))},
  4,
  [],
  "shen-remember"];
shenjs_functions["shen_shen-remember"] = shen_remember;






shen_findall = [shen_type_func,
  function shen_user_lambda5871(Arg5870) {
  if (Arg5870.length < 5) return [shen_type_func, shen_user_lambda5871, 5, Arg5870];
  var Arg5870_0 = Arg5870[0], Arg5870_1 = Arg5870[1], Arg5870_2 = Arg5870[2], Arg5870_3 = Arg5870[3], Arg5870_4 = Arg5870[4];
  var R0, R1;
  return ((R0 = shenjs_call(shen_newpv, [Arg5870_3])),
  (R1 = shenjs_call(shen_newpv, [Arg5870_3])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [R1, shenjs_call(shen_gensym, [[shen_type_symbol, "a"]]), Arg5870_3, (new Shenjs_freeze([R0, Arg5870_0, Arg5870_1, Arg5870_2, R1, Arg5870_3, Arg5870_4], function(Arg5872) {
  var Arg5872_0 = Arg5872[0], Arg5872_1 = Arg5872[1], Arg5872_2 = Arg5872[2], Arg5872_3 = Arg5872[3], Arg5872_4 = Arg5872[4], Arg5872_5 = Arg5872[5], Arg5872_6 = Arg5872[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5872_0, (shenjs_globals["shen_" + shenjs_call(shen_lazyderef, [Arg5872_4, Arg5872_5])[1]] = []), Arg5872_5, (new Shenjs_freeze([Arg5872_0, Arg5872_1, Arg5872_2, Arg5872_3, Arg5872_4, Arg5872_5, Arg5872_6], function(Arg5874) {
  var Arg5874_0 = Arg5874[0], Arg5874_1 = Arg5874[1], Arg5874_2 = Arg5874[2], Arg5874_3 = Arg5874[3], Arg5874_4 = Arg5874[4], Arg5874_5 = Arg5874[5], Arg5874_6 = Arg5874[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_findallhelp, [Arg5874_1, Arg5874_2, Arg5874_3, Arg5874_4, Arg5874_5, Arg5874_6]);});})}))]);});})}))]);}))},
  5,
  [],
  "findall"];
shenjs_functions["shen_findall"] = shen_findall;






shen_findallhelp = [shen_type_func,
  function shen_user_lambda5877(Arg5876) {
  if (Arg5876.length < 6) return [shen_type_func, shen_user_lambda5877, 6, Arg5876];
  var Arg5876_0 = Arg5876[0], Arg5876_1 = Arg5876[1], Arg5876_2 = Arg5876[2], Arg5876_3 = Arg5876[3], Arg5876_4 = Arg5876[4], Arg5876_5 = Arg5876[5];
  var R0;
  return ((R0 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_call, [Arg5876_1, Arg5876_4, (new Shenjs_freeze([Arg5876_1, Arg5876_0, Arg5876_2, Arg5876_3, Arg5876_4, Arg5876_5], function(Arg5878) {
  var Arg5878_0 = Arg5878[0], Arg5878_1 = Arg5878[1], Arg5878_2 = Arg5878[2], Arg5878_3 = Arg5878[3], Arg5878_4 = Arg5878[4], Arg5878_5 = Arg5878[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_remember, [Arg5878_3, Arg5878_1, Arg5878_4, (new Shenjs_freeze([Arg5878_3, Arg5878_1, Arg5878_4, Arg5878_5], function(Arg5880) {
  var Arg5880_0 = Arg5880[0], Arg5880_1 = Arg5880[1], Arg5880_2 = Arg5880[2], Arg5880_3 = Arg5880[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [false, Arg5880_2, Arg5880_3]);});})}))]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? (shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [Arg5876_2, (shenjs_globals["shen_" + shenjs_call(shen_lazyderef, [Arg5876_3, Arg5876_4])[1]]), Arg5876_4, Arg5876_5]);}))
  : R0))},
  6,
  [],
  "shen-findallhelp"];
shenjs_functions["shen_shen-findallhelp"] = shen_findallhelp;






shen_remember = [shen_type_func,
  function shen_user_lambda5883(Arg5882) {
  if (Arg5882.length < 4) return [shen_type_func, shen_user_lambda5883, 4, Arg5882];
  var Arg5882_0 = Arg5882[0], Arg5882_1 = Arg5882[1], Arg5882_2 = Arg5882[2], Arg5882_3 = Arg5882[3];
  var R0;
  return ((R0 = shenjs_call(shen_newpv, [Arg5882_2])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [R0, (shenjs_globals["shen_" + shenjs_call(shen_deref, [Arg5882_0, Arg5882_2])[1]] = [shen_type_cons, shenjs_call(shen_deref, [Arg5882_1, Arg5882_2]), (shenjs_globals["shen_" + shenjs_call(shen_deref, [Arg5882_0, Arg5882_2])[1]])]), Arg5882_2, Arg5882_3]);}))},
  4,
  [],
  "shen-remember"];
shenjs_functions["shen_shen-remember"] = shen_remember;












shen_shen = [shen_type_func,
  function shen_user_lambda5304(Arg5303) {
  if (Arg5303.length < 0) return [shen_type_func, shen_user_lambda5304, 0, Arg5303];
  return (shenjs_call(shen_credits, []),
  (function() {
  return shenjs_call_tail(shen_loop, []);}))},
  0,
  [],
  "shen-shen"];
shenjs_functions["shen_shen-shen"] = shen_shen;






shen_loop = [shen_type_func,
  function shen_user_lambda5306(Arg5305) {
  if (Arg5305.length < 0) return [shen_type_func, shen_user_lambda5306, 0, Arg5305];
  return (shenjs_call(shen_initialise$_environment, []),
  shenjs_call(shen_prompt, []),
  shenjs_trap_error(function() {return shenjs_call(shen_read_evaluate_print, []);}, [shen_type_func,
  function shen_user_lambda5308(Arg5307) {
  if (Arg5307.length < 1) return [shen_type_func, shen_user_lambda5308, 1, Arg5307];
  var Arg5307_0 = Arg5307[0];
  return (function() {
  return shenjs_pr(shenjs_error_to_string(Arg5307_0), (shenjs_globals["shen_*stoutput*"]));})},
  1,
  []]),
  (function() {
  return shenjs_call_tail(shen_loop, []);}))},
  0,
  [],
  "shen-loop"];
shenjs_functions["shen_shen-loop"] = shen_loop;






shen_version = [shen_type_func,
  function shen_user_lambda5310(Arg5309) {
  if (Arg5309.length < 1) return [shen_type_func, shen_user_lambda5310, 1, Arg5309];
  var Arg5309_0 = Arg5309[0];
  return (shenjs_globals["shen_*version*"] = Arg5309_0)},
  1,
  [],
  "version"];
shenjs_functions["shen_version"] = shen_version;






shenjs_call(shen_version, ["version 7"]);





shen_credits = [shen_type_func,
  function shen_user_lambda5313(Arg5312) {
  if (Arg5312.length < 0) return [shen_type_func, shen_user_lambda5313, 0, Arg5312];
  return (shenjs_call(shen_intoutput, ["~%Shen 2010, copyright (C) 2010 Mark Tarver~%", []]),
  shenjs_call(shen_intoutput, ["www.shenlanguage.org, ~A~%", [shen_tuple, (shenjs_globals["shen_*version*"]), []]]),
  shenjs_call(shen_intoutput, ["running under ~A, implementation: ~A", [shen_tuple, (shenjs_globals["shen_*language*"]), [shen_tuple, (shenjs_globals["shen_*implementation*"]), []]]]),
  (function() {
  return shenjs_call_tail(shen_intoutput, ["~%port ~A ported by ~A~%", [shen_tuple, (shenjs_globals["shen_*port*"]), [shen_tuple, (shenjs_globals["shen_*porters*"]), []]]]);}))},
  0,
  [],
  "shen-credits"];
shenjs_functions["shen_shen-credits"] = shen_credits;






shen_initialise$_environment = [shen_type_func,
  function shen_user_lambda5315(Arg5314) {
  if (Arg5314.length < 0) return [shen_type_func, shen_user_lambda5315, 0, Arg5314];
  return (function() {
  return shenjs_call_tail(shen_multiple_set, [[shen_type_cons, [shen_type_symbol, "shen-*call*"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "shen-*infs*"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "shen-*process-counter*"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "shen-*catch*"], [shen_type_cons, 0, []]]]]]]]]]);})},
  0,
  [],
  "shen-initialise_environment"];
shenjs_functions["shen_shen-initialise_environment"] = shen_initialise$_environment;






shen_multiple_set = [shen_type_func,
  function shen_user_lambda5317(Arg5316) {
  if (Arg5316.length < 1) return [shen_type_func, shen_user_lambda5317, 1, Arg5316];
  var Arg5316_0 = Arg5316[0];
  return ((shenjs_empty$question$(Arg5316_0))
  ? []
  : (((shenjs_is_type(Arg5316_0, shen_type_cons) && shenjs_is_type(Arg5316_0[2], shen_type_cons)))
  ? ((shenjs_globals["shen_" + Arg5316_0[1][1]] = Arg5316_0[2][1]),
  (function() {
  return shenjs_call_tail(shen_multiple_set, [Arg5316_0[2][2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-multiple-set"]]);})))},
  1,
  [],
  "shen-multiple-set"];
shenjs_functions["shen_shen-multiple-set"] = shen_multiple_set;






shen_destroy = [shen_type_func,
  function shen_user_lambda5319(Arg5318) {
  if (Arg5318.length < 1) return [shen_type_func, shen_user_lambda5319, 1, Arg5318];
  var Arg5318_0 = Arg5318[0];
  return (function() {
  return shenjs_call_tail(shen_declare, [Arg5318_0, []]);})},
  1,
  [],
  "destroy"];
shenjs_functions["shen_destroy"] = shen_destroy;






(shenjs_globals["shen_shen-*history*"] = []);






shen_read_evaluate_print = [shen_type_func,
  function shen_user_lambda5322(Arg5321) {
  if (Arg5321.length < 0) return [shen_type_func, shen_user_lambda5322, 0, Arg5321];
  var R0, R1;
  return ((R0 = shenjs_call(shen_toplineread, [])),
  (R1 = (shenjs_globals["shen_shen-*history*"])),
  (R0 = shenjs_call(shen_retrieve_from_history_if_needed, [R0, R1])),
  shenjs_call(shen_update$_history, [R0, R1]),
  (R1 = shenjs_call(shen_fst, [R0])),
  (function() {
  return shenjs_call_tail(shen_toplevel, [R1]);}))},
  0,
  [],
  "shen-read-evaluate-print"];
shenjs_functions["shen_shen-read-evaluate-print"] = shen_read_evaluate_print;






shen_retrieve_from_history_if_needed = [shen_type_func,
  function shen_user_lambda5324(Arg5323) {
  if (Arg5323.length < 2) return [shen_type_func, shen_user_lambda5324, 2, Arg5323];
  var Arg5323_0 = Arg5323[0], Arg5323_1 = Arg5323[1];
  var R0;
  return (((shenjs_is_type(Arg5323_0, shen_tuple) && (shenjs_is_type(shenjs_call(shen_snd, [Arg5323_0]), shen_type_cons) && (shenjs_is_type(shenjs_call(shen_snd, [Arg5323_0])[2], shen_type_cons) && (shenjs_empty$question$(shenjs_call(shen_snd, [Arg5323_0])[2][2]) && (shenjs_is_type(Arg5323_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg5323_0])[1], shenjs_call(shen_exclamation, []))) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg5323_0])[2][1], shenjs_call(shen_exclamation, []))))))))))
  ? (shenjs_call(shen_prbytes, [shenjs_call(shen_snd, [Arg5323_1[1]])]),
  Arg5323_1[1])
  : (((shenjs_is_type(Arg5323_0, shen_tuple) && (shenjs_is_type(shenjs_call(shen_snd, [Arg5323_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg5323_0])[1], shenjs_call(shen_exclamation, []))))))
  ? ((R0 = shenjs_call(shen_make_key, [shenjs_call(shen_snd, [Arg5323_0])[2], Arg5323_1])),
  (R0 = shenjs_call(shen_head, [shenjs_call(shen_find_past_inputs, [R0, Arg5323_1])])),
  shenjs_call(shen_prbytes, [shenjs_call(shen_snd, [R0])]),
  R0)
  : (((shenjs_is_type(Arg5323_0, shen_tuple) && (shenjs_is_type(shenjs_call(shen_snd, [Arg5323_0]), shen_type_cons) && (shenjs_empty$question$(shenjs_call(shen_snd, [Arg5323_0])[2]) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg5323_0])[1], shenjs_call(shen_percent, [])))))))
  ? (shenjs_call(shen_print_past_inputs, [[shen_type_func,
  function shen_user_lambda5326(Arg5325) {
  if (Arg5325.length < 1) return [shen_type_func, shen_user_lambda5326, 1, Arg5325];
  var Arg5325_0 = Arg5325[0];
  return true},
  1,
  []], shenjs_call(shen_reverse, [Arg5323_1]), 0]),
  (function() {
  return shenjs_call_tail(shen_abort, []);}))
  : (((shenjs_is_type(Arg5323_0, shen_tuple) && (shenjs_is_type(shenjs_call(shen_snd, [Arg5323_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg5323_0])[1], shenjs_call(shen_percent, []))))))
  ? ((R0 = shenjs_call(shen_make_key, [shenjs_call(shen_snd, [Arg5323_0])[2], Arg5323_1])),
  shenjs_call(shen_print_past_inputs, [R0, shenjs_call(shen_reverse, [Arg5323_1]), 0]),
  (function() {
  return shenjs_call_tail(shen_abort, []);}))
  : Arg5323_0))))},
  2,
  [],
  "shen-retrieve-from-history-if-needed"];
shenjs_functions["shen_shen-retrieve-from-history-if-needed"] = shen_retrieve_from_history_if_needed;






shen_percent = [shen_type_func,
  function shen_user_lambda5328(Arg5327) {
  if (Arg5327.length < 0) return [shen_type_func, shen_user_lambda5328, 0, Arg5327];
  return 37},
  0,
  [],
  "shen-percent"];
shenjs_functions["shen_shen-percent"] = shen_percent;






shen_exclamation = [shen_type_func,
  function shen_user_lambda5330(Arg5329) {
  if (Arg5329.length < 0) return [shen_type_func, shen_user_lambda5330, 0, Arg5329];
  return 33},
  0,
  [],
  "shen-exclamation"];
shenjs_functions["shen_shen-exclamation"] = shen_exclamation;






shen_prbytes = [shen_type_func,
  function shen_user_lambda5332(Arg5331) {
  if (Arg5331.length < 1) return [shen_type_func, shen_user_lambda5332, 1, Arg5331];
  var Arg5331_0 = Arg5331[0];
  return (shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5334(Arg5333) {
  if (Arg5333.length < 1) return [shen_type_func, shen_user_lambda5334, 1, Arg5333];
  var Arg5333_0 = Arg5333[0];
  return (function() {
  return shenjs_pr(shenjs_n_$gt$string(Arg5333_0), shenjs_call(shen_stinput, [0]));})},
  1,
  []], Arg5331_0]),
  (function() {
  return shenjs_call_tail(shen_nl, [1]);}))},
  1,
  [],
  "shen-prbytes"];
shenjs_functions["shen_shen-prbytes"] = shen_prbytes;






shen_update$_history = [shen_type_func,
  function shen_user_lambda5336(Arg5335) {
  if (Arg5335.length < 2) return [shen_type_func, shen_user_lambda5336, 2, Arg5335];
  var Arg5335_0 = Arg5335[0], Arg5335_1 = Arg5335[1];
  return (shenjs_globals["shen_shen-*history*"] = [shen_type_cons, Arg5335_0, Arg5335_1])},
  2,
  [],
  "shen-update_history"];
shenjs_functions["shen_shen-update_history"] = shen_update$_history;






shen_toplineread = [shen_type_func,
  function shen_user_lambda5338(Arg5337) {
  if (Arg5337.length < 0) return [shen_type_func, shen_user_lambda5338, 0, Arg5337];
  return (function() {
  return shenjs_call_tail(shen_toplineread$_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), []]);})},
  0,
  [],
  "shen-toplineread"];
shenjs_functions["shen_shen-toplineread"] = shen_toplineread;






shen_toplineread$_loop = [shen_type_func,
  function shen_user_lambda5340(Arg5339) {
  if (Arg5339.length < 2) return [shen_type_func, shen_user_lambda5340, 2, Arg5339];
  var Arg5339_0 = Arg5339[0], Arg5339_1 = Arg5339[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5339_0, shenjs_call(shen_hat, []))))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["line read aborted", []]);})
  : ((shenjs_call(shen_element$question$, [Arg5339_0, [shen_type_cons, shenjs_call(shen_newline, []), [shen_type_cons, shenjs_call(shen_carriage_return, []), []]]]))
  ? ((R0 = shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda5342(Arg5341) {
  if (Arg5341.length < 1) return [shen_type_func, shen_user_lambda5342, 1, Arg5341];
  var Arg5341_0 = Arg5341[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$st$_input$gt$, [Arg5341_0]);})},
  1,
  []], Arg5339_1, []])),
  (((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)) || shenjs_empty$question$(R0)))
  ? (function() {
  return shenjs_call_tail(shen_toplineread$_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), shenjs_call(shen_append, [Arg5339_1, [shen_type_cons, Arg5339_0, []]])]);})
  : [shen_tuple, R0, Arg5339_1]))
  : (function() {
  return shenjs_call_tail(shen_toplineread$_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), shenjs_call(shen_append, [Arg5339_1, [shen_type_cons, Arg5339_0, []]])]);})))},
  2,
  [],
  "shen-toplineread_loop"];
shenjs_functions["shen_shen-toplineread_loop"] = shen_toplineread$_loop;






shen_hat = [shen_type_func,
  function shen_user_lambda5344(Arg5343) {
  if (Arg5343.length < 0) return [shen_type_func, shen_user_lambda5344, 0, Arg5343];
  return 94},
  0,
  [],
  "shen-hat"];
shenjs_functions["shen_shen-hat"] = shen_hat;






shen_newline = [shen_type_func,
  function shen_user_lambda5346(Arg5345) {
  if (Arg5345.length < 0) return [shen_type_func, shen_user_lambda5346, 0, Arg5345];
  return 10},
  0,
  [],
  "shen-newline"];
shenjs_functions["shen_shen-newline"] = shen_newline;






shen_carriage_return = [shen_type_func,
  function shen_user_lambda5348(Arg5347) {
  if (Arg5347.length < 0) return [shen_type_func, shen_user_lambda5348, 0, Arg5347];
  return 13},
  0,
  [],
  "shen-carriage-return"];
shenjs_functions["shen_shen-carriage-return"] = shen_carriage_return;






shen_tc = [shen_type_func,
  function shen_user_lambda5350(Arg5349) {
  if (Arg5349.length < 1) return [shen_type_func, shen_user_lambda5350, 1, Arg5349];
  var Arg5349_0 = Arg5349[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg5349_0)))
  ? (shenjs_globals["shen_shen-*tc*"] = true)
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg5349_0)))
  ? (shenjs_globals["shen_shen-*tc*"] = false)
  : (function() {
  return shenjs_call_tail(shen_interror, ["tc expects a + or -", []]);})))},
  1,
  [],
  "tc"];
shenjs_functions["shen_tc"] = shen_tc;






shen_prompt = [shen_type_func,
  function shen_user_lambda5352(Arg5351) {
  if (Arg5351.length < 0) return [shen_type_func, shen_user_lambda5352, 0, Arg5351];
  return (((shenjs_globals["shen_shen-*tc*"]))
  ? (function() {
  return shenjs_call_tail(shen_intoutput, ["~%~%(~A+) ", [shen_tuple, shenjs_call(shen_length, [(shenjs_globals["shen_shen-*history*"])]), []]]);})
  : (function() {
  return shenjs_call_tail(shen_intoutput, ["~%~%(~A-) ", [shen_tuple, shenjs_call(shen_length, [(shenjs_globals["shen_shen-*history*"])]), []]]);}))},
  0,
  [],
  "shen-prompt"];
shenjs_functions["shen_shen-prompt"] = shen_prompt;






shen_toplevel = [shen_type_func,
  function shen_user_lambda5354(Arg5353) {
  if (Arg5353.length < 1) return [shen_type_func, shen_user_lambda5354, 1, Arg5353];
  var Arg5353_0 = Arg5353[0];
  return (function() {
  return shenjs_call_tail(shen_toplevel$_evaluate, [Arg5353_0, (shenjs_globals["shen_shen-*tc*"])]);})},
  1,
  [],
  "shen-toplevel"];
shenjs_functions["shen_shen-toplevel"] = shen_toplevel;






shen_find_past_inputs = [shen_type_func,
  function shen_user_lambda5356(Arg5355) {
  if (Arg5355.length < 2) return [shen_type_func, shen_user_lambda5356, 2, Arg5355];
  var Arg5355_0 = Arg5355[0], Arg5355_1 = Arg5355[1];
  var R0;
  return ((R0 = shenjs_call(shen_find, [Arg5355_0, Arg5355_1])),
  ((shenjs_empty$question$(R0))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["input not found~%", []]);})
  : R0))},
  2,
  [],
  "shen-find-past-inputs"];
shenjs_functions["shen_shen-find-past-inputs"] = shen_find_past_inputs;






shen_make_key = [shen_type_func,
  function shen_user_lambda5358(Arg5357) {
  if (Arg5357.length < 2) return [shen_type_func, shen_user_lambda5358, 2, Arg5357];
  var Arg5357_0 = Arg5357[0], Arg5357_1 = Arg5357[1];
  var R0;
  return ((R0 = shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda5360(Arg5359) {
  if (Arg5359.length < 1) return [shen_type_func, shen_user_lambda5360, 1, Arg5359];
  var Arg5359_0 = Arg5359[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$st$_input$gt$, [Arg5359_0]);})},
  1,
  []], Arg5357_0, []])[1]),
  ((shenjs_call(shen_integer$question$, [R0]))
  ? [shen_type_func,
  function shen_user_lambda5362(Arg5361) {
  if (Arg5361.length < 3) return [shen_type_func, shen_user_lambda5362, 3, Arg5361];
  var Arg5361_0 = Arg5361[0], Arg5361_1 = Arg5361[1], Arg5361_2 = Arg5361[2];
  return shenjs_$eq$(Arg5361_2, shenjs_call(shen_nth, [(Arg5361_0 + 1), shenjs_call(shen_reverse, [Arg5361_1])]))},
  3,
  [R0, Arg5357_1]]
  : [shen_type_func,
  function shen_user_lambda5364(Arg5363) {
  if (Arg5363.length < 2) return [shen_type_func, shen_user_lambda5364, 2, Arg5363];
  var Arg5363_0 = Arg5363[0], Arg5363_1 = Arg5363[1];
  return (function() {
  return shenjs_call_tail(shen_prefix$question$, [Arg5363_0, shenjs_call(shen_trim_gubbins, [shenjs_call(shen_snd, [Arg5363_1])])]);})},
  2,
  [Arg5357_0]]))},
  2,
  [],
  "shen-make-key"];
shenjs_functions["shen_shen-make-key"] = shen_make_key;






shen_trim_gubbins = [shen_type_func,
  function shen_user_lambda5366(Arg5365) {
  if (Arg5365.length < 1) return [shen_type_func, shen_user_lambda5366, 1, Arg5365];
  var Arg5365_0 = Arg5365[0];
  return (((shenjs_is_type(Arg5365_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5365_0[1], shenjs_call(shen_space, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg5365_0[2]]);})
  : (((shenjs_is_type(Arg5365_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5365_0[1], shenjs_call(shen_newline, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg5365_0[2]]);})
  : (((shenjs_is_type(Arg5365_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5365_0[1], shenjs_call(shen_carriage_return, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg5365_0[2]]);})
  : (((shenjs_is_type(Arg5365_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5365_0[1], shenjs_call(shen_tab, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg5365_0[2]]);})
  : (((shenjs_is_type(Arg5365_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5365_0[1], shenjs_call(shen_left_round, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg5365_0[2]]);})
  : Arg5365_0)))))},
  1,
  [],
  "shen-trim-gubbins"];
shenjs_functions["shen_shen-trim-gubbins"] = shen_trim_gubbins;






shen_space = [shen_type_func,
  function shen_user_lambda5368(Arg5367) {
  if (Arg5367.length < 0) return [shen_type_func, shen_user_lambda5368, 0, Arg5367];
  return 32},
  0,
  [],
  "shen-space"];
shenjs_functions["shen_shen-space"] = shen_space;






shen_tab = [shen_type_func,
  function shen_user_lambda5370(Arg5369) {
  if (Arg5369.length < 0) return [shen_type_func, shen_user_lambda5370, 0, Arg5369];
  return 9},
  0,
  [],
  "shen-tab"];
shenjs_functions["shen_shen-tab"] = shen_tab;






shen_left_round = [shen_type_func,
  function shen_user_lambda5372(Arg5371) {
  if (Arg5371.length < 0) return [shen_type_func, shen_user_lambda5372, 0, Arg5371];
  return 40},
  0,
  [],
  "shen-left-round"];
shenjs_functions["shen_shen-left-round"] = shen_left_round;






shen_find = [shen_type_func,
  function shen_user_lambda5374(Arg5373) {
  if (Arg5373.length < 2) return [shen_type_func, shen_user_lambda5374, 2, Arg5373];
  var Arg5373_0 = Arg5373[0], Arg5373_1 = Arg5373[1];
  return ((shenjs_empty$question$(Arg5373_1))
  ? []
  : (((shenjs_is_type(Arg5373_1, shen_type_cons) && shenjs_call(Arg5373_0, [Arg5373_1[1]])))
  ? [shen_type_cons, Arg5373_1[1], shenjs_call(shen_find, [Arg5373_0, Arg5373_1[2]])]
  : ((shenjs_is_type(Arg5373_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_find, [Arg5373_0, Arg5373_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-find"]]);}))))},
  2,
  [],
  "shen-find"];
shenjs_functions["shen_shen-find"] = shen_find;






shen_prefix$question$ = [shen_type_func,
  function shen_user_lambda5376(Arg5375) {
  if (Arg5375.length < 2) return [shen_type_func, shen_user_lambda5376, 2, Arg5375];
  var Arg5375_0 = Arg5375[0], Arg5375_1 = Arg5375[1];
  return ((shenjs_empty$question$(Arg5375_0))
  ? true
  : (((shenjs_is_type(Arg5375_0, shen_type_cons) && (shenjs_is_type(Arg5375_1, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5375_1[1], Arg5375_0[1])))))
  ? (function() {
  return shenjs_call_tail(shen_prefix$question$, [Arg5375_0[2], Arg5375_1[2]]);})
  : false))},
  2,
  [],
  "shen-prefix?"];
shenjs_functions["shen_shen-prefix?"] = shen_prefix$question$;






shen_print_past_inputs = [shen_type_func,
  function shen_user_lambda5378(Arg5377) {
  if (Arg5377.length < 3) return [shen_type_func, shen_user_lambda5378, 3, Arg5377];
  var Arg5377_0 = Arg5377[0], Arg5377_1 = Arg5377[1], Arg5377_2 = Arg5377[2];
  return ((shenjs_empty$question$(Arg5377_1))
  ? [shen_type_symbol, "_"]
  : (((shenjs_is_type(Arg5377_1, shen_type_cons) && (!shenjs_call(Arg5377_0, [Arg5377_1[1]]))))
  ? (function() {
  return shenjs_call_tail(shen_print_past_inputs, [Arg5377_0, Arg5377_1[2], (Arg5377_2 + 1)]);})
  : (((shenjs_is_type(Arg5377_1, shen_type_cons) && shenjs_is_type(Arg5377_1[1], shen_tuple)))
  ? (shenjs_call(shen_intoutput, ["~A. ", [shen_tuple, Arg5377_2, []]]),
  shenjs_call(shen_prbytes, [shenjs_call(shen_snd, [Arg5377_1[1]])]),
  (function() {
  return shenjs_call_tail(shen_print_past_inputs, [Arg5377_0, Arg5377_1[2], (Arg5377_2 + 1)]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-print-past-inputs"]]);}))))},
  3,
  [],
  "shen-print-past-inputs"];
shenjs_functions["shen_shen-print-past-inputs"] = shen_print_past_inputs;






shen_toplevel$_evaluate = [shen_type_func,
  function shen_user_lambda5380(Arg5379) {
  if (Arg5379.length < 2) return [shen_type_func, shen_user_lambda5380, 2, Arg5379];
  var Arg5379_0 = Arg5379[0], Arg5379_1 = Arg5379[1];
  var R0;
  return (((shenjs_is_type(Arg5379_0, shen_type_cons) && (shenjs_is_type(Arg5379_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], Arg5379_0[2][1])) && (shenjs_is_type(Arg5379_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg5379_0[2][2][2]) && shenjs_unwind_tail(shenjs_$eq$(true, Arg5379_1))))))))
  ? (function() {
  return shenjs_call_tail(shen_typecheck_and_evaluate, [Arg5379_0[1], Arg5379_0[2][2][1]]);})
  : (((shenjs_is_type(Arg5379_0, shen_type_cons) && shenjs_is_type(Arg5379_0[2], shen_type_cons)))
  ? (shenjs_call(shen_toplevel$_evaluate, [[shen_type_cons, Arg5379_0[1], []], Arg5379_1]),
  shenjs_call(shen_nl, [1]),
  (function() {
  return shenjs_call_tail(shen_toplevel$_evaluate, [Arg5379_0[2], Arg5379_1]);}))
  : (((shenjs_is_type(Arg5379_0, shen_type_cons) && (shenjs_empty$question$(Arg5379_0[2]) && shenjs_unwind_tail(shenjs_$eq$(true, Arg5379_1)))))
  ? (function() {
  return shenjs_call_tail(shen_typecheck_and_evaluate, [Arg5379_0[1], shenjs_call(shen_gensym, [[shen_type_symbol, "A"]])]);})
  : (((shenjs_is_type(Arg5379_0, shen_type_cons) && (shenjs_empty$question$(Arg5379_0[2]) && shenjs_unwind_tail(shenjs_$eq$(false, Arg5379_1)))))
  ? ((R0 = shenjs_call(shen_eval_without_macros, [Arg5379_0[1]])),
  (function() {
  return shenjs_call_tail(shen_print, [R0]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-toplevel_evaluate"]]);})))))},
  2,
  [],
  "shen-toplevel_evaluate"];
shenjs_functions["shen_shen-toplevel_evaluate"] = shen_toplevel$_evaluate;






shen_typecheck_and_evaluate = [shen_type_func,
  function shen_user_lambda5382(Arg5381) {
  if (Arg5381.length < 2) return [shen_type_func, shen_user_lambda5382, 2, Arg5381];
  var Arg5381_0 = Arg5381[0], Arg5381_1 = Arg5381[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_typecheck, [Arg5381_0, Arg5381_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["type error~%", []]);})
  : ((R1 = shenjs_call(shen_eval_without_macros, [Arg5381_0])),
  (R0 = shenjs_call(shen_pretty_type, [R0])),
  (function() {
  return shenjs_call_tail(shen_intoutput, ["~S : ~R", [shen_tuple, R1, [shen_tuple, R0, []]]]);}))))},
  2,
  [],
  "shen-typecheck-and-evaluate"];
shenjs_functions["shen_shen-typecheck-and-evaluate"] = shen_typecheck_and_evaluate;






shen_pretty_type = [shen_type_func,
  function shen_user_lambda5384(Arg5383) {
  if (Arg5383.length < 1) return [shen_type_func, shen_user_lambda5384, 1, Arg5383];
  var Arg5383_0 = Arg5383[0];
  return (function() {
  return shenjs_call_tail(shen_mult$_subst, [(shenjs_globals["shen_shen-*alphabet*"]), shenjs_call(shen_extract_pvars, [Arg5383_0]), Arg5383_0]);})},
  1,
  [],
  "shen-pretty-type"];
shenjs_functions["shen_shen-pretty-type"] = shen_pretty_type;






shen_extract_pvars = [shen_type_func,
  function shen_user_lambda5386(Arg5385) {
  if (Arg5385.length < 1) return [shen_type_func, shen_user_lambda5386, 1, Arg5385];
  var Arg5385_0 = Arg5385[0];
  return ((shenjs_call(shen_pvar$question$, [Arg5385_0]))
  ? [shen_type_cons, Arg5385_0, []]
  : ((shenjs_is_type(Arg5385_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_union, [shenjs_call(shen_extract_pvars, [Arg5385_0[1]]), shenjs_call(shen_extract_pvars, [Arg5385_0[2]])]);})
  : []))},
  1,
  [],
  "shen-extract-pvars"];
shenjs_functions["shen_shen-extract-pvars"] = shen_extract_pvars;






shen_mult$_subst = [shen_type_func,
  function shen_user_lambda5388(Arg5387) {
  if (Arg5387.length < 3) return [shen_type_func, shen_user_lambda5388, 3, Arg5387];
  var Arg5387_0 = Arg5387[0], Arg5387_1 = Arg5387[1], Arg5387_2 = Arg5387[2];
  return ((shenjs_empty$question$(Arg5387_0))
  ? Arg5387_2
  : ((shenjs_empty$question$(Arg5387_1))
  ? Arg5387_2
  : (((shenjs_is_type(Arg5387_0, shen_type_cons) && shenjs_is_type(Arg5387_1, shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(shen_mult$_subst, [Arg5387_0[2], Arg5387_1[2], shenjs_call(shen_subst, [Arg5387_0[1], Arg5387_1[1], Arg5387_2])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-mult_subst"]]);}))))},
  3,
  [],
  "shen-mult_subst"];
shenjs_functions["shen_shen-mult_subst"] = shen_mult$_subst;




try {
  shenjs_external_repl;
} catch (e) {
  shenjs_external_repl = false;
}
if (!shenjs_external_repl)
  shenjs_call(shen_shen, [])
