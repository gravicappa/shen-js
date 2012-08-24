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

Shenjs_freeze = function(vars, fn) {
  this.vars = vars
  this.fn = fn
}

shen_fail_obj = new Object
shenjs_globals = []
shenjs_functions = []

shen_counter_type = 0
shen_type_func = --shen_counter_type
shen_type_symbol = --shen_counter_type
shen_type_cons = --shen_counter_type
shen_type_stream_in = --shen_counter_type
shen_type_stream_out = --shen_counter_type
shen_type_stream_inout = --shen_counter_type
shen_type_error = --shen_counter_type

shen_true = true
shen_false = false

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
  return (stack === undefined) ? ("" + s) : ("" + s + " " + stack);
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
          && ((typeof(x[0]) != "number")
              || x[0] >= 0 || x[0] <= shen_counter_type))
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
shenjs_globals["shen_*port*"] = "0.9"
shenjs_globals["shen_*porters*"] = "Ramil Farkhshatov"
shenjs_globals["shen_js-skip-internals"] = true

shenjs_globals["shen_shen-*show-error-js*"] = false
shenjs_globals["shen_shen-*show-eval-js*"] = false
shenjs_globals["shen_shen-*show-func-js*"] = false
shenjs_globals["shen_shen-*dbg-js*"] = false

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


shen_hd = [shen_type_func,
  function shen_user_lambda4121(Arg4120) {
  if (Arg4120.length < 1) return [shen_type_func, shen_user_lambda4121, 1, Arg4120];
  var Arg4120_0 = Arg4120[0];
  return Arg4120_0[1]},
  1,
  [],
  "hd"];
shenjs_functions["shen_hd"] = shen_hd;






shen_tl = [shen_type_func,
  function shen_user_lambda4123(Arg4122) {
  if (Arg4122.length < 1) return [shen_type_func, shen_user_lambda4123, 1, Arg4122];
  var Arg4122_0 = Arg4122[0];
  return Arg4122_0[2]},
  1,
  [],
  "tl"];
shenjs_functions["shen_tl"] = shen_tl;






shen_not = [shen_type_func,
  function shen_user_lambda4125(Arg4124) {
  if (Arg4124.length < 1) return [shen_type_func, shen_user_lambda4125, 1, Arg4124];
  var Arg4124_0 = Arg4124[0];
  return (!Arg4124_0)},
  1,
  [],
  "not"];
shenjs_functions["shen_not"] = shen_not;






shen_thaw = [shen_type_func,
  function shen_user_lambda4127(Arg4126) {
  if (Arg4126.length < 1) return [shen_type_func, shen_user_lambda4127, 1, Arg4126];
  var Arg4126_0 = Arg4126[0];
  return shenjs_thaw(Arg4126_0)},
  1,
  [],
  "thaw"];
shenjs_functions["shen_thaw"] = shen_thaw;






shen_string$question$ = [shen_type_func,
  function shen_user_lambda4129(Arg4128) {
  if (Arg4128.length < 1) return [shen_type_func, shen_user_lambda4129, 1, Arg4128];
  var Arg4128_0 = Arg4128[0];
  return (typeof(Arg4128_0) == 'string')},
  1,
  [],
  "string?"];
shenjs_functions["shen_string?"] = shen_string$question$;






shen_number$question$ = [shen_type_func,
  function shen_user_lambda4131(Arg4130) {
  if (Arg4130.length < 1) return [shen_type_func, shen_user_lambda4131, 1, Arg4130];
  var Arg4130_0 = Arg4130[0];
  return (typeof(Arg4130_0) == 'number')},
  1,
  [],
  "number?"];
shenjs_functions["shen_number?"] = shen_number$question$;






shen_symbol$question$ = [shen_type_func,
  function shen_user_lambda4133(Arg4132) {
  if (Arg4132.length < 1) return [shen_type_func, shen_user_lambda4133, 1, Arg4132];
  var Arg4132_0 = Arg4132[0];
  return shenjs_is_type(Arg4132_0, shen_type_symbol)},
  1,
  [],
  "symbol?"];
shenjs_functions["shen_symbol?"] = shen_symbol$question$;






shen_cons$question$ = [shen_type_func,
  function shen_user_lambda4135(Arg4134) {
  if (Arg4134.length < 1) return [shen_type_func, shen_user_lambda4135, 1, Arg4134];
  var Arg4134_0 = Arg4134[0];
  return shenjs_is_type(Arg4134_0, shen_type_cons)},
  1,
  [],
  "cons?"];
shenjs_functions["shen_cons?"] = shen_cons$question$;






shen_vector$question$ = [shen_type_func,
  function shen_user_lambda4137(Arg4136) {
  if (Arg4136.length < 1) return [shen_type_func, shen_user_lambda4137, 1, Arg4136];
  var Arg4136_0 = Arg4136[0];
  return (function() {
  return shenjs_vector$question$(Arg4136_0);})},
  1,
  [],
  "vector?"];
shenjs_functions["shen_vector?"] = shen_vector$question$;






shen_absvector$question$ = [shen_type_func,
  function shen_user_lambda4139(Arg4138) {
  if (Arg4138.length < 1) return [shen_type_func, shen_user_lambda4139, 1, Arg4138];
  var Arg4138_0 = Arg4138[0];
  return (function() {
  return shenjs_absvector$question$(Arg4138_0);})},
  1,
  [],
  "absvector?"];
shenjs_functions["shen_absvector?"] = shen_absvector$question$;






shen_value = [shen_type_func,
  function shen_user_lambda4141(Arg4140) {
  if (Arg4140.length < 1) return [shen_type_func, shen_user_lambda4141, 1, Arg4140];
  var Arg4140_0 = Arg4140[0];
  return (shenjs_globals["shen_" + Arg4140_0[1]])},
  1,
  [],
  "value"];
shenjs_functions["shen_value"] = shen_value;






shen_intern = [shen_type_func,
  function shen_user_lambda4143(Arg4142) {
  if (Arg4142.length < 1) return [shen_type_func, shen_user_lambda4143, 1, Arg4142];
  var Arg4142_0 = Arg4142[0];
  return (function() {
  return shenjs_intern(Arg4142_0);})},
  1,
  [],
  "intern"];
shenjs_functions["shen_intern"] = shen_intern;






shen_vector = [shen_type_func,
  function shen_user_lambda4145(Arg4144) {
  if (Arg4144.length < 1) return [shen_type_func, shen_user_lambda4145, 1, Arg4144];
  var Arg4144_0 = Arg4144[0];
  return (function() {
  return shenjs_vector(Arg4144_0);})},
  1,
  [],
  "vector"];
shenjs_functions["shen_vector"] = shen_vector;






shen_read_byte = [shen_type_func,
  function shen_user_lambda4147(Arg4146) {
  if (Arg4146.length < 1) return [shen_type_func, shen_user_lambda4147, 1, Arg4146];
  var Arg4146_0 = Arg4146[0];
  return (function() {
  return shenjs_read_byte(Arg4146_0);})},
  1,
  [],
  "read-byte"];
shenjs_functions["shen_read-byte"] = shen_read_byte;






shen_close = [shen_type_func,
  function shen_user_lambda4149(Arg4148) {
  if (Arg4148.length < 1) return [shen_type_func, shen_user_lambda4149, 1, Arg4148];
  var Arg4148_0 = Arg4148[0];
  return (function() {
  return shenjs_close(Arg4148_0);})},
  1,
  [],
  "close"];
shenjs_functions["shen_close"] = shen_close;






shen_absvector = [shen_type_func,
  function shen_user_lambda4151(Arg4150) {
  if (Arg4150.length < 1) return [shen_type_func, shen_user_lambda4151, 1, Arg4150];
  var Arg4150_0 = Arg4150[0];
  return (function() {
  return shenjs_absvector(Arg4150_0);})},
  1,
  [],
  "absvector"];
shenjs_functions["shen_absvector"] = shen_absvector;






shen_str = [shen_type_func,
  function shen_user_lambda4153(Arg4152) {
  if (Arg4152.length < 1) return [shen_type_func, shen_user_lambda4153, 1, Arg4152];
  var Arg4152_0 = Arg4152[0];
  return (function() {
  return shenjs_str(Arg4152_0);})},
  1,
  [],
  "str"];
shenjs_functions["shen_str"] = shen_str;






shen_tlstr = [shen_type_func,
  function shen_user_lambda4155(Arg4154) {
  if (Arg4154.length < 1) return [shen_type_func, shen_user_lambda4155, 1, Arg4154];
  var Arg4154_0 = Arg4154[0];
  return (function() {
  return shenjs_tlstr(Arg4154_0);})},
  1,
  [],
  "tlstr"];
shenjs_functions["shen_tlstr"] = shen_tlstr;






shen_n_$gt$string = [shen_type_func,
  function shen_user_lambda4157(Arg4156) {
  if (Arg4156.length < 1) return [shen_type_func, shen_user_lambda4157, 1, Arg4156];
  var Arg4156_0 = Arg4156[0];
  return (function() {
  return shenjs_n_$gt$string(Arg4156_0);})},
  1,
  [],
  "n->string"];
shenjs_functions["shen_n->string"] = shen_n_$gt$string;






shen_string_$gt$n = [shen_type_func,
  function shen_user_lambda4159(Arg4158) {
  if (Arg4158.length < 1) return [shen_type_func, shen_user_lambda4159, 1, Arg4158];
  var Arg4158_0 = Arg4158[0];
  return (function() {
  return shenjs_string_$gt$n(Arg4158_0);})},
  1,
  [],
  "string->n"];
shenjs_functions["shen_string->n"] = shen_string_$gt$n;






shen_empty$question$ = [shen_type_func,
  function shen_user_lambda4161(Arg4160) {
  if (Arg4160.length < 1) return [shen_type_func, shen_user_lambda4161, 1, Arg4160];
  var Arg4160_0 = Arg4160[0];
  return (function() {
  return shenjs_empty$question$(Arg4160_0);})},
  1,
  [],
  "empty?"];
shenjs_functions["shen_empty?"] = shen_empty$question$;






shen_get_time = [shen_type_func,
  function shen_user_lambda4163(Arg4162) {
  if (Arg4162.length < 1) return [shen_type_func, shen_user_lambda4163, 1, Arg4162];
  var Arg4162_0 = Arg4162[0];
  return (function() {
  return shenjs_get_time(Arg4162_0);})},
  1,
  [],
  "get-time"];
shenjs_functions["shen_get-time"] = shen_get_time;






shen_error = [shen_type_func,
  function shen_user_lambda4165(Arg4164) {
  if (Arg4164.length < 1) return [shen_type_func, shen_user_lambda4165, 1, Arg4164];
  var Arg4164_0 = Arg4164[0];
  return (function() {
  return shenjs_error(Arg4164_0);})},
  1,
  [],
  "error"];
shenjs_functions["shen_error"] = shen_error;






shen_simple_error = [shen_type_func,
  function shen_user_lambda4167(Arg4166) {
  if (Arg4166.length < 1) return [shen_type_func, shen_user_lambda4167, 1, Arg4166];
  var Arg4166_0 = Arg4166[0];
  return (function() {
  return shenjs_simple_error(Arg4166_0);})},
  1,
  [],
  "simple-error"];
shenjs_functions["shen_simple-error"] = shen_simple_error;






shen_eval_kl = [shen_type_func,
  function shen_user_lambda4169(Arg4168) {
  if (Arg4168.length < 1) return [shen_type_func, shen_user_lambda4169, 1, Arg4168];
  var Arg4168_0 = Arg4168[0];
  return (function() {
  return shenjs_eval_kl(Arg4168_0);})},
  1,
  [],
  "eval-kl"];
shenjs_functions["shen_eval-kl"] = shen_eval_kl;






shen_error_to_string = [shen_type_func,
  function shen_user_lambda4171(Arg4170) {
  if (Arg4170.length < 1) return [shen_type_func, shen_user_lambda4171, 1, Arg4170];
  var Arg4170_0 = Arg4170[0];
  return (function() {
  return shenjs_error_to_string(Arg4170_0);})},
  1,
  [],
  "error-to-string"];
shenjs_functions["shen_error-to-string"] = shen_error_to_string;






shen_js_call_js = [shen_type_func,
  function shen_user_lambda4173(Arg4172) {
  if (Arg4172.length < 1) return [shen_type_func, shen_user_lambda4173, 1, Arg4172];
  var Arg4172_0 = Arg4172[0];
  return (function() {
  return shenjs_js_call_js(Arg4172_0);})},
  1,
  [],
  "js-call-js"];
shenjs_functions["shen_js-call-js"] = shen_js_call_js;






shen_$plus$ = [shen_type_func,
  function shen_user_lambda4175(Arg4174) {
  if (Arg4174.length < 2) return [shen_type_func, shen_user_lambda4175, 2, Arg4174];
  var Arg4174_0 = Arg4174[0], Arg4174_1 = Arg4174[1];
  return (Arg4174_0 + Arg4174_1)},
  2,
  [],
  "+"];
shenjs_functions["shen_+"] = shen_$plus$;






shen__ = [shen_type_func,
  function shen_user_lambda4177(Arg4176) {
  if (Arg4176.length < 2) return [shen_type_func, shen_user_lambda4177, 2, Arg4176];
  var Arg4176_0 = Arg4176[0], Arg4176_1 = Arg4176[1];
  return (Arg4176_0 - Arg4176_1)},
  2,
  [],
  "-"];
shenjs_functions["shen_-"] = shen__;






shen_$asterisk$ = [shen_type_func,
  function shen_user_lambda4179(Arg4178) {
  if (Arg4178.length < 2) return [shen_type_func, shen_user_lambda4179, 2, Arg4178];
  var Arg4178_0 = Arg4178[0], Arg4178_1 = Arg4178[1];
  return (Arg4178_0 * Arg4178_1)},
  2,
  [],
  "*"];
shenjs_functions["shen_*"] = shen_$asterisk$;






shen_$slash$ = [shen_type_func,
  function shen_user_lambda4181(Arg4180) {
  if (Arg4180.length < 2) return [shen_type_func, shen_user_lambda4181, 2, Arg4180];
  var Arg4180_0 = Arg4180[0], Arg4180_1 = Arg4180[1];
  return (Arg4180_0 / Arg4180_1)},
  2,
  [],
  "/"];
shenjs_functions["shen_/"] = shen_$slash$;






shen_and = [shen_type_func,
  function shen_user_lambda4183(Arg4182) {
  if (Arg4182.length < 2) return [shen_type_func, shen_user_lambda4183, 2, Arg4182];
  var Arg4182_0 = Arg4182[0], Arg4182_1 = Arg4182[1];
  return (Arg4182_0 && Arg4182_1)},
  2,
  [],
  "and"];
shenjs_functions["shen_and"] = shen_and;






shen_or = [shen_type_func,
  function shen_user_lambda4185(Arg4184) {
  if (Arg4184.length < 2) return [shen_type_func, shen_user_lambda4185, 2, Arg4184];
  var Arg4184_0 = Arg4184[0], Arg4184_1 = Arg4184[1];
  return (Arg4184_0 || Arg4184_1)},
  2,
  [],
  "or"];
shenjs_functions["shen_or"] = shen_or;






shen_$eq$ = [shen_type_func,
  function shen_user_lambda4187(Arg4186) {
  if (Arg4186.length < 2) return [shen_type_func, shen_user_lambda4187, 2, Arg4186];
  var Arg4186_0 = Arg4186[0], Arg4186_1 = Arg4186[1];
  return shenjs_$eq$(Arg4186_0, Arg4186_1)},
  2,
  [],
  "="];
shenjs_functions["shen_="] = shen_$eq$;






shen_$gt$ = [shen_type_func,
  function shen_user_lambda4189(Arg4188) {
  if (Arg4188.length < 2) return [shen_type_func, shen_user_lambda4189, 2, Arg4188];
  var Arg4188_0 = Arg4188[0], Arg4188_1 = Arg4188[1];
  return (Arg4188_0 > Arg4188_1)},
  2,
  [],
  ">"];
shenjs_functions["shen_>"] = shen_$gt$;






shen_$gt$$eq$ = [shen_type_func,
  function shen_user_lambda4191(Arg4190) {
  if (Arg4190.length < 2) return [shen_type_func, shen_user_lambda4191, 2, Arg4190];
  var Arg4190_0 = Arg4190[0], Arg4190_1 = Arg4190[1];
  return (Arg4190_0 >= Arg4190_1)},
  2,
  [],
  ">="];
shenjs_functions["shen_>="] = shen_$gt$$eq$;






shen_$lt$ = [shen_type_func,
  function shen_user_lambda4193(Arg4192) {
  if (Arg4192.length < 2) return [shen_type_func, shen_user_lambda4193, 2, Arg4192];
  var Arg4192_0 = Arg4192[0], Arg4192_1 = Arg4192[1];
  return (Arg4192_0 < Arg4192_1)},
  2,
  [],
  "<"];
shenjs_functions["shen_<"] = shen_$lt$;






shen_$lt$$eq$ = [shen_type_func,
  function shen_user_lambda4195(Arg4194) {
  if (Arg4194.length < 2) return [shen_type_func, shen_user_lambda4195, 2, Arg4194];
  var Arg4194_0 = Arg4194[0], Arg4194_1 = Arg4194[1];
  return (Arg4194_0 <= Arg4194_1)},
  2,
  [],
  "<="];
shenjs_functions["shen_<="] = shen_$lt$$eq$;






shen_cons = [shen_type_func,
  function shen_user_lambda4197(Arg4196) {
  if (Arg4196.length < 2) return [shen_type_func, shen_user_lambda4197, 2, Arg4196];
  var Arg4196_0 = Arg4196[0], Arg4196_1 = Arg4196[1];
  return [shen_type_cons, Arg4196_0, Arg4196_1]},
  2,
  [],
  "cons"];
shenjs_functions["shen_cons"] = shen_cons;






shen_set = [shen_type_func,
  function shen_user_lambda4199(Arg4198) {
  if (Arg4198.length < 2) return [shen_type_func, shen_user_lambda4199, 2, Arg4198];
  var Arg4198_0 = Arg4198[0], Arg4198_1 = Arg4198[1];
  return (shenjs_globals["shen_" + Arg4198_0[1]] = Arg4198_1)},
  2,
  [],
  "set"];
shenjs_functions["shen_set"] = shen_set;






shen_$lt$_address = [shen_type_func,
  function shen_user_lambda4201(Arg4200) {
  if (Arg4200.length < 2) return [shen_type_func, shen_user_lambda4201, 2, Arg4200];
  var Arg4200_0 = Arg4200[0], Arg4200_1 = Arg4200[1];
  return shenjs_absvector_ref(Arg4200_0, Arg4200_1)},
  2,
  [],
  "<-address"];
shenjs_functions["shen_<-address"] = shen_$lt$_address;






shen_cn = [shen_type_func,
  function shen_user_lambda4203(Arg4202) {
  if (Arg4202.length < 2) return [shen_type_func, shen_user_lambda4203, 2, Arg4202];
  var Arg4202_0 = Arg4202[0], Arg4202_1 = Arg4202[1];
  return (Arg4202_0 + Arg4202_1)},
  2,
  [],
  "cn"];
shenjs_functions["shen_cn"] = shen_cn;






shen_pos = [shen_type_func,
  function shen_user_lambda4205(Arg4204) {
  if (Arg4204.length < 2) return [shen_type_func, shen_user_lambda4205, 2, Arg4204];
  var Arg4204_0 = Arg4204[0], Arg4204_1 = Arg4204[1];
  return Arg4204_0[Arg4204_1]},
  2,
  [],
  "pos"];
shenjs_functions["shen_pos"] = shen_pos;






shen_$at$p = [shen_type_func,
  function shen_user_lambda4207(Arg4206) {
  if (Arg4206.length < 2) return [shen_type_func, shen_user_lambda4207, 2, Arg4206];
  var Arg4206_0 = Arg4206[0], Arg4206_1 = Arg4206[1];
  return [shen_tuple, Arg4206_0, Arg4206_1]},
  2,
  [],
  "@p"];
shenjs_functions["shen_@p"] = shen_$at$p;






shen_pr = [shen_type_func,
  function shen_user_lambda4209(Arg4208) {
  if (Arg4208.length < 2) return [shen_type_func, shen_user_lambda4209, 2, Arg4208];
  var Arg4208_0 = Arg4208[0], Arg4208_1 = Arg4208[1];
  return (function() {
  return shenjs_pr(Arg4208_0, Arg4208_1);})},
  2,
  [],
  "pr"];
shenjs_functions["shen_pr"] = shen_pr;






shen_address_$gt$ = [shen_type_func,
  function shen_user_lambda4211(Arg4210) {
  if (Arg4210.length < 3) return [shen_type_func, shen_user_lambda4211, 3, Arg4210];
  var Arg4210_0 = Arg4210[0], Arg4210_1 = Arg4210[1], Arg4210_2 = Arg4210[2];
  return shenjs_absvector_set(Arg4210_0, Arg4210_1, Arg4210_2)},
  3,
  [],
  "address->"];
shenjs_functions["shen_address->"] = shen_address_$gt$;






shen_open = [shen_type_func,
  function shen_user_lambda4213(Arg4212) {
  if (Arg4212.length < 3) return [shen_type_func, shen_user_lambda4213, 3, Arg4212];
  var Arg4212_0 = Arg4212[0], Arg4212_1 = Arg4212[1], Arg4212_2 = Arg4212[2];
  return (function() {
  return shenjs_open(Arg4212_0, Arg4212_1, Arg4212_2);})},
  3,
  [],
  "open"];
shenjs_functions["shen_open"] = shen_open;




/* dummy functions to bypass defstruct's declarations */
shen_process_datatype = [shen_type_func, function(args) {return []}, 2, []]
shen_compile = [shen_type_func, function(args) {return []}, 3, []]
shen_declare = [shen_type_func, function(args) {return []}, 2, []]


shenjs_call(shen_process_datatype, [[shen_type_symbol, "reg-kl-context"], shenjs_call(shen_compile, [[shen_type_symbol, "shen-<datatype-rules>"], [shen_type_cons, [shen_type_symbol, "Nvars"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "Toplevel"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-s-expr"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "Toplevel"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "Nvars"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 0, []]], []]]], []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 2, []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "B"], []]]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 1, []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-s-expr"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-s-expr"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "B"], []]]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "reg-kl-context"], [shen_type_cons, [shen_type_symbol, ";"], []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]], [shen_type_symbol, "shen-datatype-error"]])]);





reg_kl_mk_context = [shen_type_func,
  function shen_user_lambda3321(Arg3320) {
  if (Arg3320.length < 2) return [shen_type_func, shen_user_lambda3321, 2, Arg3320];
  var Arg3320_0 = Arg3320[0], Arg3320_1 = Arg3320[1];
  return (function() {
  return shenjs_call_tail(shen_$at$v, [Arg3320_0, shenjs_call(shen_$at$v, [Arg3320_1, shenjs_vector(0)])]);})},
  2,
  [],
  "reg-kl-mk-context"];
shenjs_functions["shen_reg-kl-mk-context"] = reg_kl_mk_context;






reg_kl_context_nvars_$gt$ = [shen_type_func,
  function shen_user_lambda3323(Arg3322) {
  if (Arg3322.length < 2) return [shen_type_func, shen_user_lambda3323, 2, Arg3322];
  var Arg3322_0 = Arg3322[0], Arg3322_1 = Arg3322[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$, [Arg3322_0, 2, Arg3322_1]);})},
  2,
  [],
  "reg-kl-context-nvars->"];
shenjs_functions["shen_reg-kl-context-nvars->"] = reg_kl_context_nvars_$gt$;






reg_kl_context_toplevel_$gt$ = [shen_type_func,
  function shen_user_lambda3325(Arg3324) {
  if (Arg3324.length < 2) return [shen_type_func, shen_user_lambda3325, 2, Arg3324];
  var Arg3324_0 = Arg3324[0], Arg3324_1 = Arg3324[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$, [Arg3324_0, 1, Arg3324_1]);})},
  2,
  [],
  "reg-kl-context-toplevel->"];
shenjs_functions["shen_reg-kl-context-toplevel->"] = reg_kl_context_toplevel_$gt$;






reg_kl_context_nvars = [shen_type_func,
  function shen_user_lambda3327(Arg3326) {
  if (Arg3326.length < 1) return [shen_type_func, shen_user_lambda3327, 1, Arg3326];
  var Arg3326_0 = Arg3326[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$_vector, [Arg3326_0, 2]);})},
  1,
  [],
  "reg-kl-context-nvars"];
shenjs_functions["shen_reg-kl-context-nvars"] = reg_kl_context_nvars;






reg_kl_context_toplevel = [shen_type_func,
  function shen_user_lambda3329(Arg3328) {
  if (Arg3328.length < 1) return [shen_type_func, shen_user_lambda3329, 1, Arg3328];
  var Arg3328_0 = Arg3328[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$_vector, [Arg3328_0, 1]);})},
  1,
  [],
  "reg-kl-context-toplevel"];
shenjs_functions["shen_reg-kl-context-toplevel"] = reg_kl_context_toplevel;






reg_kl_var_idx_aux = [shen_type_func,
  function shen_user_lambda3331(Arg3330) {
  if (Arg3330.length < 3) return [shen_type_func, shen_user_lambda3331, 3, Arg3330];
  var Arg3330_0 = Arg3330[0], Arg3330_1 = Arg3330[1], Arg3330_2 = Arg3330[2];
  return ((shenjs_empty$question$(Arg3330_2))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["Unknown var: ~A~%", [shen_tuple, Arg3330_0, []]]);})
  : (((shenjs_is_type(Arg3330_2, shen_type_cons) && (shenjs_is_type(Arg3330_2[1], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg3330_2[1][1], Arg3330_0)))))
  ? Arg3330_2[1][2]
  : ((shenjs_is_type(Arg3330_2, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_var_idx_aux, [Arg3330_0, (Arg3330_1 + 1), Arg3330_2[2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-var-idx-aux"]]);}))))},
  3,
  [],
  "reg-kl-var-idx-aux"];
shenjs_functions["shen_reg-kl-var-idx-aux"] = reg_kl_var_idx_aux;






reg_kl_var_idx = [shen_type_func,
  function shen_user_lambda3333(Arg3332) {
  if (Arg3332.length < 2) return [shen_type_func, shen_user_lambda3333, 2, Arg3332];
  var Arg3332_0 = Arg3332[0], Arg3332_1 = Arg3332[1];
  return (function() {
  return shenjs_call_tail(reg_kl_var_idx_aux, [Arg3332_0, 0, Arg3332_1]);})},
  2,
  [],
  "reg-kl-var-idx"];
shenjs_functions["shen_reg-kl-var-idx"] = reg_kl_var_idx;






reg_kl_new_var_idx_aux = [shen_type_func,
  function shen_user_lambda3335(Arg3334) {
  if (Arg3334.length < 3) return [shen_type_func, shen_user_lambda3335, 3, Arg3334];
  var Arg3334_0 = Arg3334[0], Arg3334_1 = Arg3334[1], Arg3334_2 = Arg3334[2];
  return ((shenjs_empty$question$(Arg3334_2))
  ? Arg3334_1
  : (((shenjs_is_type(Arg3334_2, shen_type_cons) && (shenjs_is_type(Arg3334_2[1], shen_type_cons) && (Arg3334_2[1][2] < 0))))
  ? (function() {
  return shenjs_call_tail(reg_kl_new_var_idx_aux, [Arg3334_0, Arg3334_1, Arg3334_2[2]]);})
  : (((shenjs_is_type(Arg3334_2, shen_type_cons) && (shenjs_is_type(Arg3334_2[1], shen_type_cons) && (Arg3334_2[1][2] >= Arg3334_1))))
  ? (function() {
  return shenjs_call_tail(reg_kl_new_var_idx_aux, [Arg3334_0, (Arg3334_2[1][2] + 1), Arg3334_2[2]]);})
  : ((shenjs_is_type(Arg3334_2, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_new_var_idx_aux, [Arg3334_0, Arg3334_1, Arg3334_2[2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-new-var-idx-aux"]]);})))))},
  3,
  [],
  "reg-kl-new-var-idx-aux"];
shenjs_functions["shen_reg-kl-new-var-idx-aux"] = reg_kl_new_var_idx_aux;






reg_kl_new_var_idx = [shen_type_func,
  function shen_user_lambda3337(Arg3336) {
  if (Arg3336.length < 2) return [shen_type_func, shen_user_lambda3337, 2, Arg3336];
  var Arg3336_0 = Arg3336[0], Arg3336_1 = Arg3336[1];
  return (function() {
  return shenjs_call_tail(reg_kl_new_var_idx_aux, [Arg3336_0, 0, Arg3336_1]);})},
  2,
  [],
  "reg-kl-new-var-idx"];
shenjs_functions["shen_reg-kl-new-var-idx"] = reg_kl_new_var_idx;






reg_kl_var_defined$question$ = [shen_type_func,
  function shen_user_lambda3339(Arg3338) {
  if (Arg3338.length < 2) return [shen_type_func, shen_user_lambda3339, 2, Arg3338];
  var Arg3338_0 = Arg3338[0], Arg3338_1 = Arg3338[1];
  return ((shenjs_empty$question$(Arg3338_1))
  ? false
  : (((shenjs_is_type(Arg3338_1, shen_type_cons) && (shenjs_is_type(Arg3338_1[1], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg3338_1[1][1], Arg3338_0)))))
  ? true
  : (((shenjs_is_type(Arg3338_1, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg3338_1[1], Arg3338_0))))
  ? true
  : ((shenjs_is_type(Arg3338_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_var_defined$question$, [Arg3338_0, Arg3338_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-var-defined?"]]);})))))},
  2,
  [],
  "reg-kl-var-defined?"];
shenjs_functions["shen_reg-kl-var-defined?"] = reg_kl_var_defined$question$;






reg_kl_used_vars_aux = [shen_type_func,
  function shen_user_lambda3341(Arg3340) {
  if (Arg3340.length < 4) return [shen_type_func, shen_user_lambda3341, 4, Arg3340];
  var Arg3340_0 = Arg3340[0], Arg3340_1 = Arg3340[1], Arg3340_2 = Arg3340[2], Arg3340_3 = Arg3340[3];
  var R0;
  return (((shenjs_is_type(Arg3340_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg3340_0[1])) && (shenjs_is_type(Arg3340_0[2], shen_type_cons) && (shenjs_is_type(Arg3340_0[2][2], shen_type_cons) && (shenjs_is_type(Arg3340_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg3340_0[2][2][2][2])))))))
  ? ((R0 = shenjs_call(reg_kl_used_vars_aux, [Arg3340_0[2][2][2][1], Arg3340_1, [shen_type_cons, Arg3340_0[2][1], Arg3340_2], Arg3340_3])),
  (function() {
  return shenjs_call_tail(reg_kl_used_vars_aux, [Arg3340_0[2][2][1], Arg3340_1, Arg3340_2, R0]);}))
  : (((shenjs_is_type(Arg3340_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "lambda"], Arg3340_0[1])) && (shenjs_is_type(Arg3340_0[2], shen_type_cons) && (shenjs_is_type(Arg3340_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg3340_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(reg_kl_used_vars_aux, [Arg3340_0[2][2][1], Arg3340_1, [shen_type_cons, Arg3340_0[2][1], Arg3340_2], Arg3340_3]);})
  : ((shenjs_is_type(Arg3340_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_used_vars_aux, [Arg3340_0[1], Arg3340_1, Arg3340_2, shenjs_call(reg_kl_used_vars_aux, [Arg3340_0[2], Arg3340_1, Arg3340_2, Arg3340_3])]);})
  : (((shenjs_is_type(Arg3340_0, shen_type_symbol) && ((!shenjs_call(reg_kl_var_defined$question$, [Arg3340_0, Arg3340_2])) && shenjs_call(reg_kl_var_defined$question$, [Arg3340_0, Arg3340_1]))))
  ? (function() {
  return shenjs_call_tail(shen_adjoin, [Arg3340_0, Arg3340_3]);})
  : Arg3340_3))))},
  4,
  [],
  "reg-kl-used-vars-aux"];
shenjs_functions["shen_reg-kl-used-vars-aux"] = reg_kl_used_vars_aux;






reg_kl_used_vars = [shen_type_func,
  function shen_user_lambda3343(Arg3342) {
  if (Arg3342.length < 2) return [shen_type_func, shen_user_lambda3343, 2, Arg3342];
  var Arg3342_0 = Arg3342[0], Arg3342_1 = Arg3342[1];
  return (function() {
  return shenjs_call_tail(reg_kl_used_vars_aux, [Arg3342_0, Arg3342_1, [], []]);})},
  2,
  [],
  "reg-kl-used-vars"];
shenjs_functions["shen_reg-kl-used-vars"] = reg_kl_used_vars;






reg_kl_remove_do = [shen_type_func,
  function shen_user_lambda3345(Arg3344) {
  if (Arg3344.length < 1) return [shen_type_func, shen_user_lambda3345, 1, Arg3344];
  var Arg3344_0 = Arg3344[0];
  return (((shenjs_is_type(Arg3344_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "do"], Arg3344_0[1]))))
  ? Arg3344_0[2]
  : [shen_type_cons, Arg3344_0, []])},
  1,
  [],
  "reg-kl-remove-do"];
shenjs_functions["shen_reg-kl-remove-do"] = reg_kl_remove_do;






reg_kl_remove_duplicates_aux = [shen_type_func,
  function shen_user_lambda3347(Arg3346) {
  if (Arg3346.length < 2) return [shen_type_func, shen_user_lambda3347, 2, Arg3346];
  var Arg3346_0 = Arg3346[0], Arg3346_1 = Arg3346[1];
  return ((shenjs_empty$question$(Arg3346_0))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg3346_1]);})
  : ((shenjs_is_type(Arg3346_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_remove_duplicates_aux, [Arg3346_0[2], shenjs_call(shen_adjoin, [Arg3346_0[1], Arg3346_1])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-remove-duplicates-aux"]]);})))},
  2,
  [],
  "reg-kl-remove-duplicates-aux"];
shenjs_functions["shen_reg-kl-remove-duplicates-aux"] = reg_kl_remove_duplicates_aux;






reg_kl_remove_duplicates = [shen_type_func,
  function shen_user_lambda3349(Arg3348) {
  if (Arg3348.length < 1) return [shen_type_func, shen_user_lambda3349, 1, Arg3348];
  var Arg3348_0 = Arg3348[0];
  return (function() {
  return shenjs_call_tail(reg_kl_remove_duplicates_aux, [Arg3348_0, []]);})},
  1,
  [],
  "reg-kl-remove-duplicates"];
shenjs_functions["shen_reg-kl-remove-duplicates"] = reg_kl_remove_duplicates;






reg_kl_used_vars_cascade_aux = [shen_type_func,
  function shen_user_lambda3351(Arg3350) {
  if (Arg3350.length < 4) return [shen_type_func, shen_user_lambda3351, 4, Arg3350];
  var Arg3350_0 = Arg3350[0], Arg3350_1 = Arg3350[1], Arg3350_2 = Arg3350[2], Arg3350_3 = Arg3350[3];
  var R0;
  return ((shenjs_empty$question$(Arg3350_0))
  ? Arg3350_3
  : ((shenjs_is_type(Arg3350_0, shen_type_cons))
  ? ((R0 = shenjs_call(reg_kl_used_vars_aux, [Arg3350_0[1], Arg3350_1, [], Arg3350_2])),
  (function() {
  return shenjs_call_tail(reg_kl_used_vars_cascade_aux, [Arg3350_0[2], Arg3350_1, R0, [shen_type_cons, R0, Arg3350_3]]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-used-vars-cascade-aux"]]);})))},
  4,
  [],
  "reg-kl-used-vars-cascade-aux"];
shenjs_functions["shen_reg-kl-used-vars-cascade-aux"] = reg_kl_used_vars_cascade_aux;






reg_kl_used_vars_cascade = [shen_type_func,
  function shen_user_lambda3353(Arg3352) {
  if (Arg3352.length < 3) return [shen_type_func, shen_user_lambda3353, 3, Arg3352];
  var Arg3352_0 = Arg3352[0], Arg3352_1 = Arg3352[1], Arg3352_2 = Arg3352[2];
  return (function() {
  return shenjs_call_tail(reg_kl_used_vars_cascade_aux, [shenjs_call(shen_reverse, [Arg3352_0]), Arg3352_1, Arg3352_2, []]);})},
  3,
  [],
  "reg-kl-used-vars-cascade"];
shenjs_functions["shen_reg-kl-used-vars-cascade"] = reg_kl_used_vars_cascade;






reg_kl_mk_shen_set_reg = [shen_type_func,
  function shen_user_lambda3355(Arg3354) {
  if (Arg3354.length < 2) return [shen_type_func, shen_user_lambda3355, 2, Arg3354];
  var Arg3354_0 = Arg3354[0], Arg3354_1 = Arg3354[1];
  return (((Arg3354_0 < 0))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["Cannot set function argument~%", []]);})
  : [shen_type_cons, [shen_type_symbol, "shen-set-reg!"], [shen_type_cons, Arg3354_0, [shen_type_cons, Arg3354_1, []]]])},
  2,
  [],
  "reg-kl-mk-shen-set-reg"];
shenjs_functions["shen_reg-kl-mk-shen-set-reg"] = reg_kl_mk_shen_set_reg;






reg_kl_mk_shen_get_reg = [shen_type_func,
  function shen_user_lambda3357(Arg3356) {
  if (Arg3356.length < 1) return [shen_type_func, shen_user_lambda3357, 1, Arg3356];
  var Arg3356_0 = Arg3356[0];
  return (((Arg3356_0 < 0))
  ? [shen_type_cons, [shen_type_symbol, "shen-get-arg"], [shen_type_cons, ((0 - Arg3356_0) - 1), []]]
  : [shen_type_cons, [shen_type_symbol, "shen-get-reg"], [shen_type_cons, Arg3356_0, []]])},
  1,
  [],
  "reg-kl-mk-shen-get-reg"];
shenjs_functions["shen_reg-kl-mk-shen-get-reg"] = reg_kl_mk_shen_get_reg;






reg_kl_reuse_idx = [shen_type_func,
  function shen_user_lambda3359(Arg3358) {
  if (Arg3358.length < 2) return [shen_type_func, shen_user_lambda3359, 2, Arg3358];
  var Arg3358_0 = Arg3358[0], Arg3358_1 = Arg3358[1];
  return ((shenjs_empty$question$(Arg3358_1))
  ? shen_fail_obj
  : (((shenjs_is_type(Arg3358_1, shen_type_cons) && (shenjs_is_type(Arg3358_1[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(Arg3358_1[1][1], Arg3358_0)) && (Arg3358_1[1][2] >= 0)))))
  ? Arg3358_1[1][2]
  : ((shenjs_is_type(Arg3358_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_reuse_idx, [Arg3358_0, Arg3358_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-reuse-idx"]]);}))))},
  2,
  [],
  "reg-kl-reuse-idx"];
shenjs_functions["shen_reg-kl-reuse-idx"] = reg_kl_reuse_idx;






reg_kl_new_var_idx_or_reuse = [shen_type_func,
  function shen_user_lambda3361(Arg3360) {
  if (Arg3360.length < 3) return [shen_type_func, shen_user_lambda3361, 3, Arg3360];
  var Arg3360_0 = Arg3360[0], Arg3360_1 = Arg3360[1], Arg3360_2 = Arg3360[2];
  var R0, R1;
  return ((shenjs_empty$question$(Arg3360_2))
  ? (function() {
  return shenjs_call_tail(reg_kl_new_var_idx, [Arg3360_0, Arg3360_1]);})
  : ((R0 = (new Shenjs_freeze([Arg3360_0, Arg3360_2, Arg3360_1], function(Arg3362) {
  var Arg3362_0 = Arg3362[0], Arg3362_1 = Arg3362[1], Arg3362_2 = Arg3362[2];
  return (function() {
  return ((shenjs_is_type(Arg3362_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_new_var_idx_or_reuse, [Arg3362_0, Arg3362_2, Arg3362_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-new-var-idx-or-reuse"]]);}));})}))),
  ((shenjs_is_type(Arg3360_2, shen_type_cons))
  ? ((R1 = shenjs_call(reg_kl_reuse_idx, [Arg3360_2[1], Arg3360_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, shen_fail_obj)))
  ? shenjs_thaw(R0)
  : R1))
  : shenjs_thaw(R0))))},
  3,
  [],
  "reg-kl-new-var-idx-or-reuse"];
shenjs_functions["shen_reg-kl-new-var-idx-or-reuse"] = reg_kl_new_var_idx_or_reuse;






reg_kl_add_var_aux = [shen_type_func,
  function shen_user_lambda3365(Arg3364) {
  if (Arg3364.length < 4) return [shen_type_func, shen_user_lambda3365, 4, Arg3364];
  var Arg3364_0 = Arg3364[0], Arg3364_1 = Arg3364[1], Arg3364_2 = Arg3364[2], Arg3364_3 = Arg3364[3];
  return ((shenjs_empty$question$(Arg3364_2))
  ? [shen_type_cons, [shen_type_cons, Arg3364_0, Arg3364_1], shenjs_call(shen_reverse, [Arg3364_3])]
  : (((shenjs_is_type(Arg3364_2, shen_type_cons) && (shenjs_is_type(Arg3364_2[1], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg3364_2[1][2], Arg3364_1)))))
  ? (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(shen_reverse, [[shen_type_cons, [shen_type_cons, Arg3364_0, Arg3364_2[1][2]], Arg3364_3]]), Arg3364_2[2]]);})
  : ((shenjs_is_type(Arg3364_2, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_add_var_aux, [Arg3364_0, Arg3364_1, Arg3364_2[2], [shen_type_cons, Arg3364_2[1], Arg3364_3]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-add-var-aux"]]);}))))},
  4,
  [],
  "reg-kl-add-var-aux"];
shenjs_functions["shen_reg-kl-add-var-aux"] = reg_kl_add_var_aux;






reg_kl_add_var = [shen_type_func,
  function shen_user_lambda3367(Arg3366) {
  if (Arg3366.length < 3) return [shen_type_func, shen_user_lambda3367, 3, Arg3366];
  var Arg3366_0 = Arg3366[0], Arg3366_1 = Arg3366[1], Arg3366_2 = Arg3366[2];
  return (function() {
  return shenjs_call_tail(reg_kl_add_var_aux, [Arg3366_0, Arg3366_1, Arg3366_2, []]);})},
  3,
  [],
  "reg-kl-add-var"];
shenjs_functions["shen_reg-kl-add-var"] = reg_kl_add_var;






reg_kl_walk_let_expr = [shen_type_func,
  function shen_user_lambda3369(Arg3368) {
  if (Arg3368.length < 8) return [shen_type_func, shen_user_lambda3369, 8, Arg3368];
  var Arg3368_0 = Arg3368[0], Arg3368_1 = Arg3368[1], Arg3368_2 = Arg3368[2], Arg3368_3 = Arg3368[3], Arg3368_4 = Arg3368[4], Arg3368_5 = Arg3368[5], Arg3368_6 = Arg3368[6], Arg3368_7 = Arg3368[7];
  var R0, R1, R2;
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg3368_7)))
  ? ((R0 = shenjs_call(shen_remove, [Arg3368_0, Arg3368_3])),
  (R0 = shenjs_call(shen_append, [R0, Arg3368_5])),
  (R1 = shenjs_call(shen_difference, [shenjs_call(shen_map, [[shen_type_symbol, "head"], Arg3368_2]), R0])),
  (R1 = shenjs_call(reg_kl_new_var_idx_or_reuse, [Arg3368_0, Arg3368_2, R1])),
  (R2 = shenjs_call(reg_kl_add_var, [Arg3368_0, R1, Arg3368_2])),
  (R0 = shenjs_call(reg_kl_walk_expr, [Arg3368_1, Arg3368_2, Arg3368_4, R0, Arg3368_6])),
  [shen_tuple, shenjs_call(reg_kl_mk_shen_set_reg, [R1, R0]), R2])
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg3368_7)))
  ? [shen_tuple, shenjs_call(reg_kl_walk_expr, [Arg3368_1, Arg3368_2, Arg3368_4, Arg3368_5, Arg3368_6]), Arg3368_2]
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-walk-let-expr"]]);})))},
  8,
  [],
  "reg-kl-walk-let-expr"];
shenjs_functions["shen_reg-kl-walk-let-expr"] = reg_kl_walk_let_expr;






reg_kl_walk_let = [shen_type_func,
  function shen_user_lambda3371(Arg3370) {
  if (Arg3370.length < 7) return [shen_type_func, shen_user_lambda3371, 7, Arg3370];
  var Arg3370_0 = Arg3370[0], Arg3370_1 = Arg3370[1], Arg3370_2 = Arg3370[2], Arg3370_3 = Arg3370[3], Arg3370_4 = Arg3370[4], Arg3370_5 = Arg3370[5], Arg3370_6 = Arg3370[6];
  var R0, R1, R2;
  return ((R0 = shenjs_call(reg_kl_used_vars, [Arg3370_2, [shen_type_cons, Arg3370_0, Arg3370_3]])),
  (R1 = shenjs_call(shen_element$question$, [Arg3370_0, R0])),
  ((R1)
  ? [shen_type_cons, Arg3370_0, Arg3370_4]
  : Arg3370_4),
  (R1 = shenjs_call(reg_kl_walk_let_expr, [Arg3370_0, Arg3370_1, Arg3370_3, R0, Arg3370_4, Arg3370_5, Arg3370_6, R1])),
  (R2 = shenjs_call(shen_fst, [R1])),
  (R1 = shenjs_call(shen_snd, [R1])),
  (R1 = shenjs_call(reg_kl_remove_do, [shenjs_call(reg_kl_walk_expr, [Arg3370_2, R1, shenjs_call(shen_append, [R0, Arg3370_5]), Arg3370_5, Arg3370_6])])),
  (R2 = ((shenjs_is_type(R2, shen_type_cons))
  ? [shen_type_cons, R2, R1]
  : R1)),
  [shen_type_cons, [shen_type_symbol, "do"], R2])},
  7,
  [],
  "reg-kl-walk-let"];
shenjs_functions["shen_reg-kl-walk-let"] = reg_kl_walk_let;






reg_kl_walk_do_aux = [shen_type_func,
  function shen_user_lambda3373(Arg3372) {
  if (Arg3372.length < 6) return [shen_type_func, shen_user_lambda3373, 6, Arg3372];
  var Arg3372_0 = Arg3372[0], Arg3372_1 = Arg3372[1], Arg3372_2 = Arg3372[2], Arg3372_3 = Arg3372[3], Arg3372_4 = Arg3372[4], Arg3372_5 = Arg3372[5];
  var R0, R1;
  return (((shenjs_empty$question$(Arg3372_0) && shenjs_empty$question$(Arg3372_2)))
  ? Arg3372_5
  : (((shenjs_is_type(Arg3372_0, shen_type_cons) && (shenjs_empty$question$(Arg3372_0[2]) && (shenjs_is_type(Arg3372_2, shen_type_cons) && shenjs_empty$question$(Arg3372_2[2])))))
  ? ((R0 = shenjs_call(reg_kl_walk_expr, [Arg3372_0[1], Arg3372_1, Arg3372_2[1], Arg3372_3, Arg3372_4])),
  (R0 = shenjs_call(shen_append, [Arg3372_5, shenjs_call(reg_kl_remove_do, [R0])])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_do_aux, [[], Arg3372_1, [], Arg3372_3, Arg3372_4, R0]);}))
  : (((shenjs_is_type(Arg3372_0, shen_type_cons) && (shenjs_is_type(Arg3372_2, shen_type_cons) && shenjs_is_type(Arg3372_2[2], shen_type_cons))))
  ? ((R0 = shenjs_call(reg_kl_walk_expr, [Arg3372_0[1], Arg3372_1, Arg3372_2[1], Arg3372_2[2][1], Arg3372_4])),
  (R0 = shenjs_call(shen_append, [Arg3372_5, shenjs_call(reg_kl_remove_do, [R0])])),
  (R1 = Arg3372_2[2]),
  (function() {
  return shenjs_call_tail(reg_kl_walk_do_aux, [Arg3372_0[2], Arg3372_1, R1, Arg3372_3, Arg3372_4, R0]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-walk-do-aux"]]);}))))},
  6,
  [],
  "reg-kl-walk-do-aux"];
shenjs_functions["shen_reg-kl-walk-do-aux"] = reg_kl_walk_do_aux;






reg_kl_walk_do = [shen_type_func,
  function shen_user_lambda3375(Arg3374) {
  if (Arg3374.length < 5) return [shen_type_func, shen_user_lambda3375, 5, Arg3374];
  var Arg3374_0 = Arg3374[0], Arg3374_1 = Arg3374[1], Arg3374_2 = Arg3374[2], Arg3374_3 = Arg3374[3], Arg3374_4 = Arg3374[4];
  var R0;
  return ((R0 = shenjs_call(reg_kl_used_vars_cascade, [Arg3374_0, Arg3374_1, Arg3374_2])),
  (R0 = shenjs_call(reg_kl_walk_do_aux, [Arg3374_0, Arg3374_1, R0, Arg3374_3, Arg3374_4, []])),
  [shen_type_cons, [shen_type_symbol, "do"], R0])},
  5,
  [],
  "reg-kl-walk-do"];
shenjs_functions["shen_reg-kl-walk-do"] = reg_kl_walk_do;






reg_kl_walk_apply_aux = [shen_type_func,
  function shen_user_lambda3377(Arg3376) {
  if (Arg3376.length < 6) return [shen_type_func, shen_user_lambda3377, 6, Arg3376];
  var Arg3376_0 = Arg3376[0], Arg3376_1 = Arg3376[1], Arg3376_2 = Arg3376[2], Arg3376_3 = Arg3376[3], Arg3376_4 = Arg3376[4], Arg3376_5 = Arg3376[5];
  var R0;
  return (((shenjs_empty$question$(Arg3376_0) && shenjs_empty$question$(Arg3376_2)))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg3376_5]);})
  : (((shenjs_is_type(Arg3376_0, shen_type_cons) && (shenjs_empty$question$(Arg3376_0[2]) && (shenjs_is_type(Arg3376_2, shen_type_cons) && shenjs_empty$question$(Arg3376_2[2])))))
  ? ((R0 = shenjs_call(reg_kl_walk_expr, [Arg3376_0[1], Arg3376_1, Arg3376_2[1], Arg3376_3, Arg3376_4])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_apply_aux, [[], Arg3376_1, [], Arg3376_3, Arg3376_4, [shen_type_cons, R0, Arg3376_5]]);}))
  : (((shenjs_is_type(Arg3376_0, shen_type_cons) && (shenjs_is_type(Arg3376_2, shen_type_cons) && shenjs_is_type(Arg3376_2[2], shen_type_cons))))
  ? ((R0 = shenjs_call(reg_kl_walk_expr, [Arg3376_0[1], Arg3376_1, Arg3376_2[1], Arg3376_2[2][1], Arg3376_4])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_apply_aux, [Arg3376_0[2], Arg3376_1, Arg3376_2[2], Arg3376_3, Arg3376_4, [shen_type_cons, R0, Arg3376_5]]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-walk-apply-aux"]]);}))))},
  6,
  [],
  "reg-kl-walk-apply-aux"];
shenjs_functions["shen_reg-kl-walk-apply-aux"] = reg_kl_walk_apply_aux;






reg_kl_walk_apply = [shen_type_func,
  function shen_user_lambda3379(Arg3378) {
  if (Arg3378.length < 5) return [shen_type_func, shen_user_lambda3379, 5, Arg3378];
  var Arg3378_0 = Arg3378[0], Arg3378_1 = Arg3378[1], Arg3378_2 = Arg3378[2], Arg3378_3 = Arg3378[3], Arg3378_4 = Arg3378[4];
  var R0;
  return ((R0 = shenjs_call(reg_kl_used_vars_cascade, [Arg3378_0, Arg3378_1, Arg3378_2])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_apply_aux, [Arg3378_0, Arg3378_1, R0, Arg3378_3, Arg3378_4, []]);}))},
  5,
  [],
  "reg-kl-walk-apply"];
shenjs_functions["shen_reg-kl-walk-apply"] = reg_kl_walk_apply;






reg_kl_walk_if = [shen_type_func,
  function shen_user_lambda3381(Arg3380) {
  if (Arg3380.length < 7) return [shen_type_func, shen_user_lambda3381, 7, Arg3380];
  var Arg3380_0 = Arg3380[0], Arg3380_1 = Arg3380[1], Arg3380_2 = Arg3380[2], Arg3380_3 = Arg3380[3], Arg3380_4 = Arg3380[4], Arg3380_5 = Arg3380[5], Arg3380_6 = Arg3380[6];
  var R0, R1, R2;
  return ((R0 = shenjs_call(reg_kl_used_vars_aux, [Arg3380_1, Arg3380_3, [], Arg3380_5])),
  (R1 = shenjs_call(reg_kl_used_vars_aux, [Arg3380_2, Arg3380_3, [], Arg3380_5])),
  (R2 = shenjs_call(shen_append, [R0, R1])),
  (R2 = shenjs_call(reg_kl_walk_expr, [Arg3380_0, Arg3380_3, Arg3380_4, R2, Arg3380_6])),
  (R0 = shenjs_call(reg_kl_walk_expr, [Arg3380_1, Arg3380_3, R0, Arg3380_5, Arg3380_6])),
  (R1 = shenjs_call(reg_kl_walk_expr, [Arg3380_2, Arg3380_3, R1, Arg3380_5, Arg3380_6])),
  [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, R2, [shen_type_cons, R0, [shen_type_cons, R1, []]]]])},
  7,
  [],
  "reg-kl-walk-if"];
shenjs_functions["shen_reg-kl-walk-if"] = reg_kl_walk_if;






reg_kl_walk_cond = [shen_type_func,
  function shen_user_lambda3383(Arg3382) {
  if (Arg3382.length < 5) return [shen_type_func, shen_user_lambda3383, 5, Arg3382];
  var Arg3382_0 = Arg3382[0], Arg3382_1 = Arg3382[1], Arg3382_2 = Arg3382[2], Arg3382_3 = Arg3382[3], Arg3382_4 = Arg3382[4];
  var R0, R1, R2;
  return ((shenjs_empty$question$(Arg3382_0))
  ? [shen_type_cons, [shen_type_symbol, "error"], [shen_type_cons, "error: cond failure", []]]
  : (((shenjs_is_type(Arg3382_0, shen_type_cons) && (shenjs_is_type(Arg3382_0[1], shen_type_cons) && (shenjs_is_type(Arg3382_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg3382_0[1][2][2])))))
  ? ((R0 = shenjs_call(reg_kl_used_vars_aux, [Arg3382_0[1][2][1], Arg3382_1, [], Arg3382_3])),
  (R1 = shenjs_call(reg_kl_used_vars_aux, [Arg3382_0[2], Arg3382_1, [], Arg3382_3])),
  (R0 = shenjs_call(reg_kl_used_vars_aux, [Arg3382_0[1][1], Arg3382_1, [], shenjs_call(shen_append, [R0, R1])])),
  (R2 = shenjs_call(reg_kl_walk_cond, [Arg3382_0[2], Arg3382_1, Arg3382_2, Arg3382_3, Arg3382_4])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_if, [Arg3382_0[1][1], Arg3382_0[1][2][1], R2, Arg3382_1, R0, R1, Arg3382_4]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-walk-cond"]]);})))},
  5,
  [],
  "reg-kl-walk-cond"];
shenjs_functions["shen_reg-kl-walk-cond"] = reg_kl_walk_cond;






reg_kl_mk_closure_kl = [shen_type_func,
  function shen_user_lambda3385(Arg3384) {
  if (Arg3384.length < 3) return [shen_type_func, shen_user_lambda3385, 3, Arg3384];
  var Arg3384_0 = Arg3384[0], Arg3384_1 = Arg3384[1], Arg3384_2 = Arg3384[2];
  return [shen_type_cons, [shen_type_symbol, "shen-mk-closure"], [shen_type_cons, Arg3384_0, [shen_type_cons, Arg3384_1, [shen_type_cons, Arg3384_2, []]]]]},
  3,
  [],
  "reg-kl-mk-closure-kl"];
shenjs_functions["shen_reg-kl-mk-closure-kl"] = reg_kl_mk_closure_kl;






reg_kl_mk_closure_args_init = [shen_type_func,
  function shen_user_lambda3387(Arg3386) {
  if (Arg3386.length < 3) return [shen_type_func, shen_user_lambda3387, 3, Arg3386];
  var Arg3386_0 = Arg3386[0], Arg3386_1 = Arg3386[1], Arg3386_2 = Arg3386[2];
  var R0;
  return ((shenjs_empty$question$(Arg3386_0))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg3386_2]);})
  : ((shenjs_is_type(Arg3386_0, shen_type_cons))
  ? ((R0 = shenjs_call(reg_kl_mk_shen_get_reg, [shenjs_call(reg_kl_var_idx, [Arg3386_0[1], Arg3386_1])])),
  (function() {
  return shenjs_call_tail(reg_kl_mk_closure_args_init, [Arg3386_0[2], Arg3386_1, [shen_type_cons, R0, Arg3386_2]]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-mk-closure-args-init"]]);})))},
  3,
  [],
  "reg-kl-mk-closure-args-init"];
shenjs_functions["shen_reg-kl-mk-closure-args-init"] = reg_kl_mk_closure_args_init;






reg_kl_mk_closure_env = [shen_type_func,
  function shen_user_lambda3389(Arg3388) {
  if (Arg3388.length < 2) return [shen_type_func, shen_user_lambda3389, 2, Arg3388];
  var Arg3388_0 = Arg3388[0], Arg3388_1 = Arg3388[1];
  return ((shenjs_empty$question$(Arg3388_0))
  ? Arg3388_1
  : ((shenjs_is_type(Arg3388_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_mk_closure_env, [Arg3388_0[2], [shen_type_cons, [shen_type_cons, Arg3388_0[1], shenjs_call(reg_kl_new_var_idx, [Arg3388_0[1], Arg3388_1])], Arg3388_1]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-mk-closure-env"]]);})))},
  2,
  [],
  "reg-kl-mk-closure-env"];
shenjs_functions["shen_reg-kl-mk-closure-env"] = reg_kl_mk_closure_env;






reg_kl_mk_closure_list = [shen_type_func,
  function shen_user_lambda3391(Arg3390) {
  if (Arg3390.length < 5) return [shen_type_func, shen_user_lambda3391, 5, Arg3390];
  var Arg3390_0 = Arg3390[0], Arg3390_1 = Arg3390[1], Arg3390_2 = Arg3390[2], Arg3390_3 = Arg3390[3], Arg3390_4 = Arg3390[4];
  var R0, R1;
  return ((R0 = shenjs_call(reg_kl_mk_closure_env, [Arg3390_3, []])),
  (R1 = shenjs_call(reg_kl_mk_closure_args_init, [Arg3390_3, Arg3390_2, []])),
  (R0 = shenjs_call(reg_kl_mk_function_kl, [Arg3390_0, Arg3390_1, R0, Arg3390_4])),
  [shen_type_cons, R1, [shen_type_cons, R0, []]])},
  5,
  [],
  "reg-kl-mk-closure-list"];
shenjs_functions["shen_reg-kl-mk-closure-list"] = reg_kl_mk_closure_list;






reg_kl_walk_lambda_aux = [shen_type_func,
  function shen_user_lambda3393(Arg3392) {
  if (Arg3392.length < 6) return [shen_type_func, shen_user_lambda3393, 6, Arg3392];
  var Arg3392_0 = Arg3392[0], Arg3392_1 = Arg3392[1], Arg3392_2 = Arg3392[2], Arg3392_3 = Arg3392[3], Arg3392_4 = Arg3392[4], Arg3392_5 = Arg3392[5];
  var R0, R1;
  return (((shenjs_is_type(Arg3392_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "lambda"], Arg3392_1[1])) && (shenjs_is_type(Arg3392_1[2], shen_type_cons) && (shenjs_is_type(Arg3392_1[2][2], shen_type_cons) && shenjs_empty$question$(Arg3392_1[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_lambda_aux, [Arg3392_1[2][1], Arg3392_1[2][2][1], [shen_type_cons, Arg3392_0, Arg3392_2], Arg3392_3, Arg3392_4, Arg3392_5]);})
  : ((R0 = shenjs_call(shen_reverse, [[shen_type_cons, Arg3392_0, Arg3392_2]])),
  (R1 = shenjs_call(shen_append, [Arg3392_4, shenjs_call(shen_reverse, [[shen_type_cons, Arg3392_0, R0]])])),
  (R1 = shenjs_call(reg_kl_mk_closure_list, [R1, Arg3392_1, Arg3392_3, Arg3392_4, Arg3392_5])),
  [shen_type_cons, [shen_type_symbol, "shen-mk-closure"], [shen_type_cons, R0, R1]]))},
  6,
  [],
  "reg-kl-walk-lambda-aux"];
shenjs_functions["shen_reg-kl-walk-lambda-aux"] = reg_kl_walk_lambda_aux;






reg_kl_walk_lambda = [shen_type_func,
  function shen_user_lambda3395(Arg3394) {
  if (Arg3394.length < 5) return [shen_type_func, shen_user_lambda3395, 5, Arg3394];
  var Arg3394_0 = Arg3394[0], Arg3394_1 = Arg3394[1], Arg3394_2 = Arg3394[2], Arg3394_3 = Arg3394[3], Arg3394_4 = Arg3394[4];
  var R0;
  return ((R0 = shenjs_call(reg_kl_used_vars, [[shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, Arg3394_0, [shen_type_cons, Arg3394_1, []]]], Arg3394_3])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_lambda_aux, [Arg3394_0, Arg3394_1, Arg3394_2, Arg3394_3, R0, Arg3394_4]);}))},
  5,
  [],
  "reg-kl-walk-lambda"];
shenjs_functions["shen_reg-kl-walk-lambda"] = reg_kl_walk_lambda;






reg_kl_walk_freeze = [shen_type_func,
  function shen_user_lambda3397(Arg3396) {
  if (Arg3396.length < 4) return [shen_type_func, shen_user_lambda3397, 4, Arg3396];
  var Arg3396_0 = Arg3396[0], Arg3396_1 = Arg3396[1], Arg3396_2 = Arg3396[2], Arg3396_3 = Arg3396[3];
  var R0;
  return ((R0 = shenjs_call(reg_kl_mk_closure_list, [Arg3396_2, Arg3396_0, Arg3396_1, Arg3396_2, Arg3396_3])),
  [shen_type_cons, [shen_type_symbol, "shen-mk-freeze"], R0])},
  4,
  [],
  "reg-kl-walk-freeze"];
shenjs_functions["shen_reg-kl-walk-freeze"] = reg_kl_walk_freeze;






reg_kl_lift_defun = [shen_type_func,
  function shen_user_lambda3399(Arg3398) {
  if (Arg3398.length < 4) return [shen_type_func, shen_user_lambda3399, 4, Arg3398];
  var Arg3398_0 = Arg3398[0], Arg3398_1 = Arg3398[1], Arg3398_2 = Arg3398[2], Arg3398_3 = Arg3398[3];
  var R0, R1;
  return ((R0 = shenjs_call(reg_kl_mk_context, [shenjs_call(reg_kl_context_toplevel, [Arg3398_3]), 0])),
  (R1 = shenjs_call(reg_kl_mk_defun_kl, [Arg3398_0, Arg3398_1, Arg3398_2, [], R0])),
  shenjs_call(reg_kl_context_toplevel_$gt$, [Arg3398_3, [shen_type_cons, R1, shenjs_call(reg_kl_context_toplevel, [R0])]]),
  [shen_type_cons, [shen_type_symbol, "function"], [shen_type_cons, Arg3398_0, []]])},
  4,
  [],
  "reg-kl-lift-defun"];
shenjs_functions["shen_reg-kl-lift-defun"] = reg_kl_lift_defun;






reg_kl_walk_expr = [shen_type_func,
  function shen_user_lambda3401(Arg3400) {
  if (Arg3400.length < 5) return [shen_type_func, shen_user_lambda3401, 5, Arg3400];
  var Arg3400_0 = Arg3400[0], Arg3400_1 = Arg3400[1], Arg3400_2 = Arg3400[2], Arg3400_3 = Arg3400[3], Arg3400_4 = Arg3400[4];
  return (((shenjs_is_type(Arg3400_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg3400_0[1])) && (shenjs_is_type(Arg3400_0[2], shen_type_cons) && (shenjs_is_type(Arg3400_0[2][2], shen_type_cons) && (shenjs_is_type(Arg3400_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg3400_0[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_let, [Arg3400_0[2][1], Arg3400_0[2][2][1], Arg3400_0[2][2][2][1], Arg3400_1, Arg3400_2, Arg3400_3, Arg3400_4]);})
  : (((shenjs_is_type(Arg3400_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "if"], Arg3400_0[1])) && (shenjs_is_type(Arg3400_0[2], shen_type_cons) && (shenjs_is_type(Arg3400_0[2][2], shen_type_cons) && (shenjs_is_type(Arg3400_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg3400_0[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_if, [Arg3400_0[2][1], Arg3400_0[2][2][1], Arg3400_0[2][2][2][1], Arg3400_1, Arg3400_2, Arg3400_3, Arg3400_4]);})
  : (((shenjs_is_type(Arg3400_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cond"], Arg3400_0[1]))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_cond, [Arg3400_0[2], Arg3400_1, Arg3400_2, Arg3400_3, Arg3400_4]);})
  : (((shenjs_is_type(Arg3400_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "do"], Arg3400_0[1]))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_do, [Arg3400_0[2], Arg3400_1, Arg3400_2, Arg3400_3, Arg3400_4]);})
  : (((shenjs_is_type(Arg3400_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "lambda"], Arg3400_0[1])) && (shenjs_is_type(Arg3400_0[2], shen_type_cons) && (shenjs_is_type(Arg3400_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg3400_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_lambda, [Arg3400_0[2][1], Arg3400_0[2][2][1], [], Arg3400_1, Arg3400_4]);})
  : (((shenjs_is_type(Arg3400_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "freeze"], Arg3400_0[1])) && (shenjs_is_type(Arg3400_0[2], shen_type_cons) && shenjs_empty$question$(Arg3400_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_freeze, [Arg3400_0[2][1], Arg3400_1, Arg3400_2, Arg3400_4]);})
  : (((shenjs_is_type(Arg3400_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defun"], Arg3400_0[1])) && (shenjs_is_type(Arg3400_0[2], shen_type_cons) && (shenjs_is_type(Arg3400_0[2][2], shen_type_cons) && (shenjs_is_type(Arg3400_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg3400_0[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(reg_kl_lift_defun, [Arg3400_0[2][1], Arg3400_0[2][2][1], Arg3400_0[2][2][2][1], Arg3400_4]);})
  : ((shenjs_is_type(Arg3400_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_apply, [Arg3400_0, Arg3400_1, Arg3400_2, Arg3400_3, Arg3400_4]);})
  : (((shenjs_call(reg_kl_var_defined$question$, [Arg3400_0, Arg3400_1]) && shenjs_is_type(Arg3400_0, shen_type_symbol)))
  ? (function() {
  return shenjs_call_tail(reg_kl_mk_shen_get_reg, [shenjs_call(reg_kl_var_idx, [Arg3400_0, Arg3400_1])]);})
  : Arg3400_0)))))))))},
  5,
  [],
  "reg-kl-walk-expr"];
shenjs_functions["shen_reg-kl-walk-expr"] = reg_kl_walk_expr;






reg_kl_mk_defun_env = [shen_type_func,
  function shen_user_lambda3403(Arg3402) {
  if (Arg3402.length < 3) return [shen_type_func, shen_user_lambda3403, 3, Arg3402];
  var Arg3402_0 = Arg3402[0], Arg3402_1 = Arg3402[1], Arg3402_2 = Arg3402[2];
  return ((shenjs_empty$question$(Arg3402_0))
  ? Arg3402_2
  : ((shenjs_is_type(Arg3402_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_mk_defun_env, [Arg3402_0[2], (Arg3402_1 - 1), [shen_type_cons, [shen_type_cons, Arg3402_0[1], Arg3402_1], Arg3402_2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-mk-defun-env"]]);})))},
  3,
  [],
  "reg-kl-mk-defun-env"];
shenjs_functions["shen_reg-kl-mk-defun-env"] = reg_kl_mk_defun_env;






reg_kl_mk_function_kl = [shen_type_func,
  function shen_user_lambda3405(Arg3404) {
  if (Arg3404.length < 4) return [shen_type_func, shen_user_lambda3405, 4, Arg3404];
  var Arg3404_0 = Arg3404[0], Arg3404_1 = Arg3404[1], Arg3404_2 = Arg3404[2], Arg3404_3 = Arg3404[3];
  var R0, R1;
  return ((R0 = shenjs_call(reg_kl_remove_duplicates, [Arg3404_0])),
  (R1 = shenjs_call(reg_kl_mk_defun_env, [R0, -1, Arg3404_2])),
  (R0 = shenjs_call(reg_kl_used_vars, [Arg3404_1, R0])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_expr, [Arg3404_1, R1, R0, [], Arg3404_3]);}))},
  4,
  [],
  "reg-kl-mk-function-kl"];
shenjs_functions["shen_reg-kl-mk-function-kl"] = reg_kl_mk_function_kl;






reg_kl_mk_defun_kl = [shen_type_func,
  function shen_user_lambda3407(Arg3406) {
  if (Arg3406.length < 5) return [shen_type_func, shen_user_lambda3407, 5, Arg3406];
  var Arg3406_0 = Arg3406[0], Arg3406_1 = Arg3406[1], Arg3406_2 = Arg3406[2], Arg3406_3 = Arg3406[3], Arg3406_4 = Arg3406[4];
  var R0;
  return ((R0 = shenjs_call(reg_kl_mk_function_kl, [Arg3406_1, Arg3406_2, Arg3406_3, Arg3406_4])),
  [shen_type_cons, [shen_type_symbol, "shen-mk-func"], [shen_type_cons, Arg3406_0, [shen_type_cons, Arg3406_1, [shen_type_cons, R0, []]]]])},
  5,
  [],
  "reg-kl-mk-defun-kl"];
shenjs_functions["shen_reg-kl-mk-defun-kl"] = reg_kl_mk_defun_kl;






reg_kl_walk_toplevel = [shen_type_func,
  function shen_user_lambda3409(Arg3408) {
  if (Arg3408.length < 2) return [shen_type_func, shen_user_lambda3409, 2, Arg3408];
  var Arg3408_0 = Arg3408[0], Arg3408_1 = Arg3408[1];
  var R0, R1;
  return (((shenjs_is_type(Arg3408_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defun"], Arg3408_0[1])) && (shenjs_is_type(Arg3408_0[2], shen_type_cons) && (shenjs_is_type(Arg3408_0[2][2], shen_type_cons) && (shenjs_is_type(Arg3408_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg3408_0[2][2][2][2])))))))
  ? ((R0 = shenjs_call(reg_kl_mk_context, [Arg3408_1, 0])),
  (R1 = shenjs_call(reg_kl_mk_defun_kl, [Arg3408_0[2][1], Arg3408_0[2][2][1], Arg3408_0[2][2][2][1], [], R0])),
  [shen_type_cons, R1, shenjs_call(reg_kl_context_toplevel, [R0])])
  : ((R0 = shenjs_call(reg_kl_mk_context, [Arg3408_1, 0])),
  (R1 = shenjs_call(reg_kl_walk_expr, [Arg3408_0, [], [], [], R0])),
  [shen_type_cons, R1, shenjs_call(reg_kl_context_toplevel, [R0])]))},
  2,
  [],
  "reg-kl-walk-toplevel"];
shenjs_functions["shen_reg-kl-walk-toplevel"] = reg_kl_walk_toplevel;






reg_kl_walk_aux = [shen_type_func,
  function shen_user_lambda3411(Arg3410) {
  if (Arg3410.length < 2) return [shen_type_func, shen_user_lambda3411, 2, Arg3410];
  var Arg3410_0 = Arg3410[0], Arg3410_1 = Arg3410[1];
  return ((shenjs_empty$question$(Arg3410_0))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg3410_1]);})
  : ((shenjs_is_type(Arg3410_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_aux, [Arg3410_0[2], shenjs_call(reg_kl_walk_toplevel, [Arg3410_0[1], Arg3410_1])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-walk-aux"]]);})))},
  2,
  [],
  "reg-kl-walk-aux"];
shenjs_functions["shen_reg-kl-walk-aux"] = reg_kl_walk_aux;






reg_kl_walk = [shen_type_func,
  function shen_user_lambda3413(Arg3412) {
  if (Arg3412.length < 1) return [shen_type_func, shen_user_lambda3413, 1, Arg3412];
  var Arg3412_0 = Arg3412[0];
  return (function() {
  return shenjs_call_tail(reg_kl_walk_aux, [Arg3412_0, []]);})},
  1,
  [],
  "reg-kl-walk"];
shenjs_functions["shen_reg-kl-walk"] = reg_kl_walk;






shenjs_call(shen_process_datatype, [[shen_type_symbol, "js-context"], shenjs_call(shen_compile, [[shen_type_symbol, "shen-<datatype-rules>"], [shen_type_cons, [shen_type_symbol, "Varname"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "Argname"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "Toplevel"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "Nregs"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "Nregs"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "Toplevel"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "Argname"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "Varname"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 0, []]], []]]], []]]], []]]], []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 4, []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 4, [shen_type_cons, [shen_type_symbol, "B"], []]]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 3, []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "B"], []]]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 2, []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "B"], []]]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 1, []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "B"], []]]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]], [shen_type_symbol, "shen-datatype-error"]])]);





js_mk_context = [shen_type_func,
  function shen_user_lambda3919(Arg3918) {
  if (Arg3918.length < 4) return [shen_type_func, shen_user_lambda3919, 4, Arg3918];
  var Arg3918_0 = Arg3918[0], Arg3918_1 = Arg3918[1], Arg3918_2 = Arg3918[2], Arg3918_3 = Arg3918[3];
  return (function() {
  return shenjs_call_tail(shen_$at$v, [Arg3918_0, shenjs_call(shen_$at$v, [Arg3918_1, shenjs_call(shen_$at$v, [Arg3918_2, shenjs_call(shen_$at$v, [Arg3918_3, shenjs_vector(0)])])])]);})},
  4,
  [],
  "js-mk-context"];
shenjs_functions["shen_js-mk-context"] = js_mk_context;






js_context_varname_$gt$ = [shen_type_func,
  function shen_user_lambda3921(Arg3920) {
  if (Arg3920.length < 2) return [shen_type_func, shen_user_lambda3921, 2, Arg3920];
  var Arg3920_0 = Arg3920[0], Arg3920_1 = Arg3920[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$, [Arg3920_0, 4, Arg3920_1]);})},
  2,
  [],
  "js-context-varname->"];
shenjs_functions["shen_js-context-varname->"] = js_context_varname_$gt$;






js_context_argname_$gt$ = [shen_type_func,
  function shen_user_lambda3923(Arg3922) {
  if (Arg3922.length < 2) return [shen_type_func, shen_user_lambda3923, 2, Arg3922];
  var Arg3922_0 = Arg3922[0], Arg3922_1 = Arg3922[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$, [Arg3922_0, 3, Arg3922_1]);})},
  2,
  [],
  "js-context-argname->"];
shenjs_functions["shen_js-context-argname->"] = js_context_argname_$gt$;






js_context_toplevel_$gt$ = [shen_type_func,
  function shen_user_lambda3925(Arg3924) {
  if (Arg3924.length < 2) return [shen_type_func, shen_user_lambda3925, 2, Arg3924];
  var Arg3924_0 = Arg3924[0], Arg3924_1 = Arg3924[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$, [Arg3924_0, 2, Arg3924_1]);})},
  2,
  [],
  "js-context-toplevel->"];
shenjs_functions["shen_js-context-toplevel->"] = js_context_toplevel_$gt$;






js_context_nregs_$gt$ = [shen_type_func,
  function shen_user_lambda3927(Arg3926) {
  if (Arg3926.length < 2) return [shen_type_func, shen_user_lambda3927, 2, Arg3926];
  var Arg3926_0 = Arg3926[0], Arg3926_1 = Arg3926[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$, [Arg3926_0, 1, Arg3926_1]);})},
  2,
  [],
  "js-context-nregs->"];
shenjs_functions["shen_js-context-nregs->"] = js_context_nregs_$gt$;






js_context_varname = [shen_type_func,
  function shen_user_lambda3929(Arg3928) {
  if (Arg3928.length < 1) return [shen_type_func, shen_user_lambda3929, 1, Arg3928];
  var Arg3928_0 = Arg3928[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$_vector, [Arg3928_0, 4]);})},
  1,
  [],
  "js-context-varname"];
shenjs_functions["shen_js-context-varname"] = js_context_varname;






js_context_argname = [shen_type_func,
  function shen_user_lambda3931(Arg3930) {
  if (Arg3930.length < 1) return [shen_type_func, shen_user_lambda3931, 1, Arg3930];
  var Arg3930_0 = Arg3930[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$_vector, [Arg3930_0, 3]);})},
  1,
  [],
  "js-context-argname"];
shenjs_functions["shen_js-context-argname"] = js_context_argname;






js_context_toplevel = [shen_type_func,
  function shen_user_lambda3933(Arg3932) {
  if (Arg3932.length < 1) return [shen_type_func, shen_user_lambda3933, 1, Arg3932];
  var Arg3932_0 = Arg3932[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$_vector, [Arg3932_0, 2]);})},
  1,
  [],
  "js-context-toplevel"];
shenjs_functions["shen_js-context-toplevel"] = js_context_toplevel;






js_context_nregs = [shen_type_func,
  function shen_user_lambda3935(Arg3934) {
  if (Arg3934.length < 1) return [shen_type_func, shen_user_lambda3935, 1, Arg3934];
  var Arg3934_0 = Arg3934[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$_vector, [Arg3934_0, 1]);})},
  1,
  [],
  "js-context-nregs"];
shenjs_functions["shen_js-context-nregs"] = js_context_nregs;






js_max = [shen_type_func,
  function shen_user_lambda3937(Arg3936) {
  if (Arg3936.length < 2) return [shen_type_func, shen_user_lambda3937, 2, Arg3936];
  var Arg3936_0 = Arg3936[0], Arg3936_1 = Arg3936[1];
  return (((Arg3936_0 > Arg3936_1))
  ? Arg3936_0
  : Arg3936_1)},
  2,
  [],
  "js-max"];
shenjs_functions["shen_js-max"] = js_max;






js_str_js_from_shen$asterisk$ = [shen_type_func,
  function shen_user_lambda3939(Arg3938) {
  if (Arg3938.length < 2) return [shen_type_func, shen_user_lambda3939, 2, Arg3938];
  var Arg3938_0 = Arg3938[0], Arg3938_1 = Arg3938[1];
  return ((shenjs_unwind_tail(shenjs_$eq$("", Arg3938_0)))
  ? Arg3938_1
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("-", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "_")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("_", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$_")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("$", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("'", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$quote$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("`", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$bquote$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("/", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$slash$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("*", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$asterisk$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("+", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$plus$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("%", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$percent$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("=", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$eq$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("?", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$question$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("!", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$excl$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$(">", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$gt$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("<", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$lt$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$(".", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$dot$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("|", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$bar$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("#", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$sharp$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("~", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$tilde$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$(":", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$colon$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$(";", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$sc$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("@", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$at$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("&", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$amp$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("{", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$cbraceopen$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3938_0]) && shenjs_unwind_tail(shenjs_$eq$("}", Arg3938_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + "$cbraceclose$")]);})
  : ((shenjs_call(shen_$plus$string$question$, [Arg3938_0]))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg3938_0), (Arg3938_1 + Arg3938_0[0])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-str-js-from-shen*"]]);})))))))))))))))))))))))))))},
  2,
  [],
  "js-str-js-from-shen*"];
shenjs_functions["shen_js-str-js-from-shen*"] = js_str_js_from_shen$asterisk$;






js_str_js_from_shen = [shen_type_func,
  function shen_user_lambda3941(Arg3940) {
  if (Arg3940.length < 1) return [shen_type_func, shen_user_lambda3941, 1, Arg3940];
  var Arg3940_0 = Arg3940[0];
  return ((shenjs_call(shen_element$question$, [Arg3940_0, [shen_type_cons, "return", [shen_type_cons, "new", [shen_type_cons, "delete", [shen_type_cons, "function", [shen_type_cons, "while", [shen_type_cons, "for", [shen_type_cons, "var", [shen_type_cons, "if", [shen_type_cons, "do", [shen_type_cons, "in", [shen_type_cons, "super", [shen_type_cons, "load", [shen_type_cons, "print", [shen_type_cons, "eval", [shen_type_cons, "read", [shen_type_cons, "readline", [shen_type_cons, "write", [shen_type_cons, "putstr", [shen_type_cons, "let", [shen_type_cons, "Array", [shen_type_cons, "Object", [shen_type_cons, "document", []]]]]]]]]]]]]]]]]]]]]]]]))
  ? ("$shen$" + Arg3940_0)
  : (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [Arg3940_0, ""]);}))},
  1,
  [],
  "js-str-js-from-shen"];
shenjs_functions["shen_js-str-js-from-shen"] = js_str_js_from_shen;






js_sym_js_from_shen = [shen_type_func,
  function shen_user_lambda3943(Arg3942) {
  if (Arg3942.length < 1) return [shen_type_func, shen_user_lambda3943, 1, Arg3942];
  var Arg3942_0 = Arg3942[0];
  return (function() {
  return shenjs_intern(shenjs_call(js_str_js_from_shen, [shenjs_str(Arg3942_0)]));})},
  1,
  [],
  "js-sym-js-from-shen"];
shenjs_functions["shen_js-sym-js-from-shen"] = js_sym_js_from_shen;






(shenjs_globals["shen_js-js-backslash"] = shenjs_n_$gt$string(92));






(shenjs_globals["shen_js-js-dquote"] = shenjs_n_$gt$string(34));






js_esc_string = [shen_type_func,
  function shen_user_lambda3947(Arg3946) {
  if (Arg3946.length < 2) return [shen_type_func, shen_user_lambda3947, 2, Arg3946];
  var Arg3946_0 = Arg3946[0], Arg3946_1 = Arg3946[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$("", Arg3946_0)))
  ? Arg3946_1
  : (((shenjs_call(shen_$plus$string$question$, [Arg3946_0]) && (shenjs_unwind_tail(shenjs_$eq$(Arg3946_0[0], (shenjs_globals["shen_js-js-backslash"]))) || shenjs_unwind_tail(shenjs_$eq$(Arg3946_0[0], (shenjs_globals["shen_js-js-dquote"]))))))
  ? ((R0 = (shenjs_globals["shen_js-js-backslash"])),
  (function() {
  return shenjs_call_tail(js_esc_string, [shenjs_tlstr(Arg3946_0), shenjs_call(shen_intmake_string, ["~A~A~A", [shen_tuple, Arg3946_1, [shen_tuple, R0, [shen_tuple, Arg3946_0[0], []]]]])]);}))
  : (((shenjs_call(shen_$plus$string$question$, [Arg3946_0]) && shenjs_unwind_tail(shenjs_$eq$(shenjs_string_$gt$n(Arg3946_0[0]), 10))))
  ? (function() {
  return shenjs_call_tail(js_esc_string, [shenjs_tlstr(Arg3946_0), (Arg3946_1 + "\\x0a")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3946_0]) && shenjs_unwind_tail(shenjs_$eq$(shenjs_string_$gt$n(Arg3946_0[0]), 13))))
  ? (function() {
  return shenjs_call_tail(js_esc_string, [shenjs_tlstr(Arg3946_0), (Arg3946_1 + "\\x0d")]);})
  : ((shenjs_call(shen_$plus$string$question$, [Arg3946_0]))
  ? (function() {
  return shenjs_call_tail(js_esc_string, [shenjs_tlstr(Arg3946_0), (Arg3946_1 + Arg3946_0[0])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-esc-string"]]);}))))))},
  2,
  [],
  "js-esc-string"];
shenjs_functions["shen_js-esc-string"] = js_esc_string;






js_cut_shen_prefix = [shen_type_func,
  function shen_user_lambda3949(Arg3948) {
  if (Arg3948.length < 1) return [shen_type_func, shen_user_lambda3949, 1, Arg3948];
  var Arg3948_0 = Arg3948[0];
  return (((shenjs_call(shen_$plus$string$question$, [Arg3948_0]) && (shenjs_unwind_tail(shenjs_$eq$("s", Arg3948_0[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(Arg3948_0)]) && (shenjs_unwind_tail(shenjs_$eq$("h", shenjs_tlstr(Arg3948_0)[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(shenjs_tlstr(Arg3948_0))]) && (shenjs_unwind_tail(shenjs_$eq$("e", shenjs_tlstr(shenjs_tlstr(Arg3948_0))[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3948_0)))]) && (shenjs_unwind_tail(shenjs_$eq$("n", shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3948_0)))[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3948_0))))]) && shenjs_unwind_tail(shenjs_$eq$("-", shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3948_0))))[0]))))))))))))
  ? (function() {
  return shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3948_0)))));})
  : (((shenjs_call(shen_$plus$string$question$, [Arg3948_0]) && (shenjs_unwind_tail(shenjs_$eq$("s", Arg3948_0[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(Arg3948_0)]) && (shenjs_unwind_tail(shenjs_$eq$("h", shenjs_tlstr(Arg3948_0)[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(shenjs_tlstr(Arg3948_0))]) && (shenjs_unwind_tail(shenjs_$eq$("e", shenjs_tlstr(shenjs_tlstr(Arg3948_0))[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3948_0)))]) && (shenjs_unwind_tail(shenjs_$eq$("n", shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3948_0)))[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3948_0))))]) && shenjs_unwind_tail(shenjs_$eq$("_", shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3948_0))))[0]))))))))))))
  ? (function() {
  return shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg3948_0)))));})
  : Arg3948_0))},
  1,
  [],
  "js-cut-shen-prefix"];
shenjs_functions["shen_js-cut-shen-prefix"] = js_cut_shen_prefix;






js_func_name = [shen_type_func,
  function shen_user_lambda3951(Arg3950) {
  if (Arg3950.length < 1) return [shen_type_func, shen_user_lambda3951, 1, Arg3950];
  var Arg3950_0 = Arg3950[0];
  return (((shenjs_call(shen_sysfunc$question$, [Arg3950_0]) || (shenjs_globals["shen_shen-*installing-kl*"])))
  ? (function() {
  return shenjs_intern(shenjs_call(js_str_js_from_shen, [("shen-" + shenjs_call(js_cut_shen_prefix, [shenjs_str(Arg3950_0)]))]));})
  : ((shenjs_is_type(Arg3950_0, shen_type_symbol))
  ? (function() {
  return shenjs_call_tail(js_sym_js_from_shen, [Arg3950_0]);})
  : Arg3950_0))},
  1,
  [],
  "js-func-name"];
shenjs_functions["shen_js-func-name"] = js_func_name;






js_intfunc_name = [shen_type_func,
  function shen_user_lambda3953(Arg3952) {
  if (Arg3952.length < 1) return [shen_type_func, shen_user_lambda3953, 1, Arg3952];
  var Arg3952_0 = Arg3952[0];
  return (((shenjs_call(shen_sysfunc$question$, [Arg3952_0]) || (shenjs_globals["shen_shen-*installing-kl*"])))
  ? (function() {
  return shenjs_intern(shenjs_call(js_str_js_from_shen, [("shenjs-" + shenjs_call(js_cut_shen_prefix, [shenjs_str(Arg3952_0)]))]));})
  : ((shenjs_is_type(Arg3952_0, shen_type_symbol))
  ? (function() {
  return shenjs_call_tail(js_sym_js_from_shen, [Arg3952_0]);})
  : Arg3952_0))},
  1,
  [],
  "js-intfunc-name"];
shenjs_functions["shen_js-intfunc-name"] = js_intfunc_name;






(shenjs_globals["shen_js-int-funcs"] = [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "X"], []], [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, [shen_type_symbol, "string?"], [shen_type_cons, [shen_type_symbol, "number?"], [shen_type_cons, [shen_type_symbol, "symbol?"], [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_symbol, "vector?"], [shen_type_cons, [shen_type_symbol, "absvector?"], [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "intern"], [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, [shen_type_symbol, "read-byte"], [shen_type_cons, [shen_type_symbol, "close"], [shen_type_cons, [shen_type_symbol, "absvector"], [shen_type_cons, [shen_type_symbol, "str"], [shen_type_cons, [shen_type_symbol, "tlstr"], [shen_type_cons, [shen_type_symbol, "n->string"], [shen_type_cons, [shen_type_symbol, "string->n"], [shen_type_cons, [shen_type_symbol, "empty?"], [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "error"], [shen_type_cons, [shen_type_symbol, "simple-error"], [shen_type_cons, [shen_type_symbol, "eval-kl"], [shen_type_cons, [shen_type_symbol, "error-to-string"], [shen_type_cons, [shen_type_symbol, "js-call-js"], []]]]]]]]]]]]]]]]]]]]]]]]]]]]], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "X"], [shen_type_cons, [shen_type_symbol, "Y"], []]], [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, [shen_type_symbol, "/"], [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "or"], [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, ">"], [shen_type_cons, [shen_type_symbol, ">="], [shen_type_cons, [shen_type_symbol, "<"], [shen_type_cons, [shen_type_symbol, "<="], [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "<-address"], [shen_type_cons, [shen_type_symbol, "cn"], [shen_type_cons, [shen_type_symbol, "pos"], [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "pr"], []]]]]]]]]]]]]]]]]]]], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "X"], [shen_type_cons, [shen_type_symbol, "Y"], [shen_type_cons, [shen_type_symbol, "Z"], []]]], [shen_type_cons, [shen_type_symbol, "address->"], [shen_type_cons, [shen_type_symbol, "open"], []]]], []]]]);






(shenjs_globals["shen_js-internals"] = [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "empty?"], [shen_type_cons, [shen_type_symbol, "boolean?"], [shen_type_cons, [shen_type_symbol, "vector?"], [shen_type_cons, [shen_type_symbol, "absvector?"], [shen_type_cons, [shen_type_symbol, "absvector"], [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, [shen_type_symbol, "str"], [shen_type_cons, [shen_type_symbol, "intern"], [shen_type_cons, [shen_type_symbol, "n->string"], [shen_type_cons, [shen_type_symbol, "string->n"], [shen_type_cons, [shen_type_symbol, "eval-kl"], [shen_type_cons, [shen_type_symbol, "open"], [shen_type_cons, [shen_type_symbol, "js-write-byte"], [shen_type_cons, [shen_type_symbol, "read-byte"], [shen_type_cons, [shen_type_symbol, "close"], [shen_type_cons, [shen_type_symbol, "tlstr"], [shen_type_cons, [shen_type_symbol, "pr"], [shen_type_cons, [shen_type_symbol, "error"], [shen_type_cons, [shen_type_symbol, "simple-error"], [shen_type_cons, [shen_type_symbol, "error-to-string"], [shen_type_cons, [shen_type_symbol, "js-shenjs-call-js"], []]]]]]]]]]]]]]]]]]]]]]]]]]);






(shenjs_globals["shen_js-tail-internals"] = [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "js-shenjs-call-js"], []]]);






js_int_func_args$asterisk$ = [shen_type_func,
  function shen_user_lambda3958(Arg3957) {
  if (Arg3957.length < 2) return [shen_type_func, shen_user_lambda3958, 2, Arg3957];
  var Arg3957_0 = Arg3957[0], Arg3957_1 = Arg3957[1];
  return ((shenjs_empty$question$(Arg3957_1))
  ? []
  : (((shenjs_is_type(Arg3957_1, shen_type_cons) && (shenjs_is_type(Arg3957_1[1], shen_type_cons) && shenjs_call(shen_element$question$, [Arg3957_0, Arg3957_1[1][2]]))))
  ? Arg3957_1[1][1]
  : (((shenjs_is_type(Arg3957_1, shen_type_cons) && shenjs_is_type(Arg3957_1[1], shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(js_int_func_args$asterisk$, [Arg3957_0, Arg3957_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-int-func-args*"]]);}))))},
  2,
  [],
  "js-int-func-args*"];
shenjs_functions["shen_js-int-func-args*"] = js_int_func_args$asterisk$;






js_int_func_args = [shen_type_func,
  function shen_user_lambda3960(Arg3959) {
  if (Arg3959.length < 1) return [shen_type_func, shen_user_lambda3960, 1, Arg3959];
  var Arg3959_0 = Arg3959[0];
  return (function() {
  return shenjs_call_tail(js_int_func_args$asterisk$, [Arg3959_0, (shenjs_globals["shen_js-int-funcs"])]);})},
  1,
  [],
  "js-int-func-args"];
shenjs_functions["shen_js-int-func-args"] = js_int_func_args;






js_int_func$question$ = [shen_type_func,
  function shen_user_lambda3962(Arg3961) {
  if (Arg3961.length < 1) return [shen_type_func, shen_user_lambda3962, 1, Arg3961];
  var Arg3961_0 = Arg3961[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fail"], Arg3961_0)))
  ? true
  : (!shenjs_empty$question$(shenjs_call(js_int_func_args, [Arg3961_0]))))},
  1,
  [],
  "js-int-func?"];
shenjs_functions["shen_js-int-func?"] = js_int_func$question$;






js_esc_obj = [shen_type_func,
  function shen_user_lambda3964(Arg3963) {
  if (Arg3963.length < 1) return [shen_type_func, shen_user_lambda3964, 1, Arg3963];
  var Arg3963_0 = Arg3963[0];
  return (((typeof(Arg3963_0) == 'string'))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["\"~A\"", [shen_tuple, shenjs_call(js_esc_string, [Arg3963_0, ""]), []]]);})
  : ((shenjs_call(shen_sysfunc$question$, [Arg3963_0]))
  ? (function() {
  return shenjs_call_tail(js_func_name, [Arg3963_0]);})
  : ((shenjs_is_type(Arg3963_0, shen_type_symbol))
  ? (function() {
  return shenjs_call_tail(js_sym_js_from_shen, [Arg3963_0]);})
  : (function() {
  return shenjs_call_tail(shen_interror, ["Object ~R cannot be escaped", [shen_tuple, Arg3963_0, []]]);}))))},
  1,
  [],
  "js-esc-obj"];
shenjs_functions["shen_js-esc-obj"] = js_esc_obj;






js_str_join$asterisk$ = [shen_type_func,
  function shen_user_lambda3966(Arg3965) {
  if (Arg3965.length < 3) return [shen_type_func, shen_user_lambda3966, 3, Arg3965];
  var Arg3965_0 = Arg3965[0], Arg3965_1 = Arg3965[1], Arg3965_2 = Arg3965[2];
  return ((shenjs_empty$question$(Arg3965_0))
  ? Arg3965_2
  : (((shenjs_is_type(Arg3965_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("", Arg3965_2))))
  ? (function() {
  return shenjs_call_tail(js_str_join$asterisk$, [Arg3965_0[2], Arg3965_1, Arg3965_0[1]]);})
  : ((shenjs_is_type(Arg3965_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(js_str_join$asterisk$, [Arg3965_0[2], Arg3965_1, shenjs_call(shen_intmake_string, ["~A~A~A", [shen_tuple, Arg3965_2, [shen_tuple, Arg3965_1, [shen_tuple, Arg3965_0[1], []]]]])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-str-join*"]]);}))))},
  3,
  [],
  "js-str-join*"];
shenjs_functions["shen_js-str-join*"] = js_str_join$asterisk$;






js_str_join = [shen_type_func,
  function shen_user_lambda3968(Arg3967) {
  if (Arg3967.length < 2) return [shen_type_func, shen_user_lambda3968, 2, Arg3967];
  var Arg3967_0 = Arg3967[0], Arg3967_1 = Arg3967[1];
  return (function() {
  return shenjs_call_tail(js_str_join$asterisk$, [Arg3967_0, Arg3967_1, ""]);})},
  2,
  [],
  "js-str-join"];
shenjs_functions["shen_js-str-join"] = js_str_join;






js_arg_list = [shen_type_func,
  function shen_user_lambda3970(Arg3969) {
  if (Arg3969.length < 1) return [shen_type_func, shen_user_lambda3970, 1, Arg3969];
  var Arg3969_0 = Arg3969[0];
  return (function() {
  return shenjs_call_tail(js_str_join, [Arg3969_0, ", "]);})},
  1,
  [],
  "js-arg-list"];
shenjs_functions["shen_js-arg-list"] = js_arg_list;






js_arg_name = [shen_type_func,
  function shen_user_lambda3972(Arg3971) {
  if (Arg3971.length < 2) return [shen_type_func, shen_user_lambda3972, 2, Arg3971];
  var Arg3971_0 = Arg3971[0], Arg3971_1 = Arg3971[1];
  return (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A_~A", [shen_tuple, shenjs_call(js_context_argname, [Arg3971_1]), [shen_tuple, Arg3971_0, []]]]);})},
  2,
  [],
  "js-arg-name"];
shenjs_functions["shen_js-arg-name"] = js_arg_name;






js_tail_call_ret = [shen_type_func,
  function shen_user_lambda3974(Arg3973) {
  if (Arg3973.length < 1) return [shen_type_func, shen_user_lambda3974, 1, Arg3973];
  var Arg3973_0 = Arg3973[0];
  return (function() {
  return shenjs_call_tail(shen_intmake_string, ["(function() {~%  return ~A;})", [shen_tuple, Arg3973_0, []]]);})},
  1,
  [],
  "js-tail-call-ret"];
shenjs_functions["shen_js-tail-call-ret"] = js_tail_call_ret;






js_get_func_obj = [shen_type_func,
  function shen_user_lambda3976(Arg3975) {
  if (Arg3975.length < 3) return [shen_type_func, shen_user_lambda3976, 3, Arg3975];
  var Arg3975_0 = Arg3975[0], Arg3975_1 = Arg3975[1], Arg3975_2 = Arg3975[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg3975_1)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_get_fn(~A)", [shen_tuple, shenjs_call(js_get_func_obj, [Arg3975_0, false, Arg3975_2]), []]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$(false, Arg3975_1)) && shenjs_is_type(Arg3975_0, shen_type_symbol)))
  ? (function() {
  return shenjs_call_tail(js_func_name, [Arg3975_0]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg3975_1)))
  ? Arg3975_0
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-get-func-obj"]]);}))))},
  3,
  [],
  "js-get-func-obj"];
shenjs_functions["shen_js-get-func-obj"] = js_get_func_obj;






js_tail_call_expr = [shen_type_func,
  function shen_user_lambda3978(Arg3977) {
  if (Arg3977.length < 2) return [shen_type_func, shen_user_lambda3978, 2, Arg3977];
  var Arg3977_0 = Arg3977[0], Arg3977_1 = Arg3977[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg3977_0, false, Arg3977_1]);})},
  2,
  [],
  "js-tail-call-expr"];
shenjs_functions["shen_js-tail-call-expr"] = js_tail_call_expr;






js_cond_case = [shen_type_func,
  function shen_user_lambda3980(Arg3979) {
  if (Arg3979.length < 2) return [shen_type_func, shen_user_lambda3980, 2, Arg3979];
  var Arg3979_0 = Arg3979[0], Arg3979_1 = Arg3979[1];
  return (function() {
  return shenjs_call_tail(js_tail_call_expr, [Arg3979_0, Arg3979_1]);})},
  2,
  [],
  "js-cond-case"];
shenjs_functions["shen_js-cond-case"] = js_cond_case;






js_emit_cond$asterisk$ = [shen_type_func,
  function shen_user_lambda3982(Arg3981) {
  if (Arg3981.length < 3) return [shen_type_func, shen_user_lambda3982, 3, Arg3981];
  var Arg3981_0 = Arg3981[0], Arg3981_1 = Arg3981[1], Arg3981_2 = Arg3981[2];
  return ((shenjs_empty$question$(Arg3981_0))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["cond failure: no default branch", []]);})
  : (((shenjs_is_type(Arg3981_0, shen_type_cons) && (shenjs_is_type(Arg3981_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg3981_0[1][1])) && (shenjs_is_type(Arg3981_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg3981_0[1][2][2]))))))
  ? (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg3981_0[1][2][1], Arg3981_1, Arg3981_2]);})
  : (((shenjs_is_type(Arg3981_0, shen_type_cons) && (shenjs_is_type(Arg3981_0[1], shen_type_cons) && (shenjs_is_type(Arg3981_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg3981_0[1][2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["((~A)~%  ? ~A~%  : ~A)", [shen_tuple, shenjs_call(js_cond_case, [Arg3981_0[1][1], Arg3981_2]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg3981_0[1][2][1], Arg3981_1, Arg3981_2]), [shen_tuple, shenjs_call(js_emit_cond$asterisk$, [Arg3981_0[2], Arg3981_1, Arg3981_2]), []]]]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-emit-cond*"]]);}))))},
  3,
  [],
  "js-emit-cond*"];
shenjs_functions["shen_js-emit-cond*"] = js_emit_cond$asterisk$;






js_emit_cond = [shen_type_func,
  function shen_user_lambda3984(Arg3983) {
  if (Arg3983.length < 3) return [shen_type_func, shen_user_lambda3984, 3, Arg3983];
  var Arg3983_0 = Arg3983[0], Arg3983_1 = Arg3983[1], Arg3983_2 = Arg3983[2];
  return (function() {
  return shenjs_call_tail(js_emit_cond$asterisk$, [Arg3983_0, Arg3983_1, Arg3983_2]);})},
  3,
  [],
  "js-emit-cond"];
shenjs_functions["shen_js-emit-cond"] = js_emit_cond;






js_emit_trap_error = [shen_type_func,
  function shen_user_lambda3986(Arg3985) {
  if (Arg3985.length < 4) return [shen_type_func, shen_user_lambda3986, 4, Arg3985];
  var Arg3985_0 = Arg3985[0], Arg3985_1 = Arg3985[1], Arg3985_2 = Arg3985[2], Arg3985_3 = Arg3985[3];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$(false, Arg3985_2)))
  ? ((R0 = shenjs_call(shen_intmake_string, ["function() {return ~A;}", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg3985_0, false, Arg3985_3]), []]])),
  (R1 = shenjs_call(js_js_from_kl_expr, [Arg3985_1, false, Arg3985_3])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_trap_error(~A, ~A)", [shen_tuple, R0, [shen_tuple, R1, []]]]);}))
  : ((shenjs_unwind_tail(shenjs_$eq$(true, Arg3985_2)))
  ? (function() {
  return shenjs_call_tail(js_tail_call_ret, [shenjs_call(js_emit_trap_error, [Arg3985_0, Arg3985_1, false, Arg3985_3])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-emit-trap-error"]]);})))},
  4,
  [],
  "js-emit-trap-error"];
shenjs_functions["shen_js-emit-trap-error"] = js_emit_trap_error;






js_predicate_op = [shen_type_func,
  function shen_user_lambda3988(Arg3987) {
  if (Arg3987.length < 4) return [shen_type_func, shen_user_lambda3988, 4, Arg3987];
  var Arg3987_0 = Arg3987[0], Arg3987_1 = Arg3987[1], Arg3987_2 = Arg3987[2], Arg3987_3 = Arg3987[3];
  return (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "number?"], Arg3987_0)) && (typeof(Arg3987_1) == 'number')))
  ? "true"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "string?"], Arg3987_0)) && (typeof(Arg3987_1) == 'string')))
  ? "true"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "boolean?"], Arg3987_0)) && shenjs_unwind_tail(shenjs_$eq$(true, Arg3987_1))))
  ? "true"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "boolean?"], Arg3987_0)) && shenjs_unwind_tail(shenjs_$eq$(false, Arg3987_1))))
  ? "true"
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "boolean?"], Arg3987_0)))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "boolean?"], [shen_type_cons, Arg3987_1, []], Arg3987_2, Arg3987_3]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "string?"], Arg3987_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(typeof(~A) == 'string')", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg3987_1, false, Arg3987_3]), []]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "number?"], Arg3987_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(typeof(~A) == 'number')", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg3987_1, false, Arg3987_3]), []]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol?"], Arg3987_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_is_type(~A, ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg3987_1, false, Arg3987_3]), [shen_tuple, "shen_type_symbol", []]]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons?"], Arg3987_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_is_type(~A, ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg3987_1, false, Arg3987_3]), [shen_tuple, "shen_type_cons", []]]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "tuple?"], Arg3987_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_is_type(~A, ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg3987_1, false, Arg3987_3]), [shen_tuple, "shen_tuple", []]]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "vector?"], Arg3987_0)))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "vector?"], [shen_type_cons, Arg3987_1, []], Arg3987_2, Arg3987_3]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "empty?"], Arg3987_0)))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "empty?"], [shen_type_cons, Arg3987_1, []], Arg3987_2, Arg3987_3]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "absvector?"], Arg3987_0)))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "absvector?"], [shen_type_cons, Arg3987_1, []], Arg3987_2, Arg3987_3]);})
  : shen_fail_obj)))))))))))))},
  4,
  [],
  "js-predicate-op"];
shenjs_functions["shen_js-predicate-op"] = js_predicate_op;






js_math_op = [shen_type_func,
  function shen_user_lambda3990(Arg3989) {
  if (Arg3989.length < 4) return [shen_type_func, shen_user_lambda3990, 4, Arg3989];
  var Arg3989_0 = Arg3989[0], Arg3989_1 = Arg3989[1], Arg3989_2 = Arg3989[2], Arg3989_3 = Arg3989[3];
  return (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg3989_0)) && (shenjs_is_type(Arg3989_1, shen_type_cons) && (shenjs_is_type(Arg3989_1[2], shen_type_cons) && (shenjs_empty$question$(Arg3989_1[2][2]) && ((typeof(Arg3989_1[1]) == 'number') && (typeof(Arg3989_1[2][1]) == 'number')))))))
  ? (function() {
  return shenjs_str((Arg3989_1[1] + Arg3989_1[2][1]));})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg3989_0)) && (shenjs_is_type(Arg3989_1, shen_type_cons) && (shenjs_is_type(Arg3989_1[2], shen_type_cons) && (shenjs_empty$question$(Arg3989_1[2][2]) && ((typeof(Arg3989_1[1]) == 'number') && (typeof(Arg3989_1[2][1]) == 'number')))))))
  ? (function() {
  return shenjs_str((Arg3989_1[1] - Arg3989_1[2][1]));})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "*"], Arg3989_0)) && (shenjs_is_type(Arg3989_1, shen_type_cons) && (shenjs_is_type(Arg3989_1[2], shen_type_cons) && (shenjs_empty$question$(Arg3989_1[2][2]) && ((typeof(Arg3989_1[1]) == 'number') && (typeof(Arg3989_1[2][1]) == 'number')))))))
  ? (function() {
  return shenjs_str((Arg3989_1[1] * Arg3989_1[2][1]));})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/"], Arg3989_0)) && (shenjs_is_type(Arg3989_1, shen_type_cons) && (shenjs_is_type(Arg3989_1[2], shen_type_cons) && (shenjs_empty$question$(Arg3989_1[2][2]) && ((typeof(Arg3989_1[1]) == 'number') && (typeof(Arg3989_1[2][1]) == 'number')))))))
  ? (function() {
  return shenjs_str((Arg3989_1[1] / Arg3989_1[2][1]));})
  : (((shenjs_is_type(Arg3989_1, shen_type_cons) && (shenjs_is_type(Arg3989_1[2], shen_type_cons) && (shenjs_empty$question$(Arg3989_1[2][2]) && shenjs_call(shen_element$question$, [Arg3989_0, [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, [shen_type_symbol, "/"], []]]]]])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A ~A ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg3989_1[1], false, Arg3989_3]), [shen_tuple, Arg3989_0, [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg3989_1[2][1], false, Arg3989_3]), []]]]]);})
  : shen_fail_obj)))))},
  4,
  [],
  "js-math-op"];
shenjs_functions["shen_js-math-op"] = js_math_op;






js_equality_op = [shen_type_func,
  function shen_user_lambda3992(Arg3991) {
  if (Arg3991.length < 3) return [shen_type_func, shen_user_lambda3992, 3, Arg3991];
  var Arg3991_0 = Arg3991[0], Arg3991_1 = Arg3991[1], Arg3991_2 = Arg3991[2];
  return (((shenjs_is_type(Arg3991_0, shen_type_cons) && (shenjs_is_type(Arg3991_0[2], shen_type_cons) && (shenjs_empty$question$(Arg3991_0[2][2]) && ((typeof(Arg3991_0[1]) == 'number') && (typeof(Arg3991_0[2][1]) == 'number'))))))
  ? (function() {
  return shenjs_str(shenjs_unwind_tail(shenjs_$eq$(Arg3991_0[1], Arg3991_0[2][1])));})
  : (((shenjs_is_type(Arg3991_0, shen_type_cons) && (shenjs_is_type(Arg3991_0[2], shen_type_cons) && (shenjs_empty$question$(Arg3991_0[2][2]) && ((typeof(Arg3991_0[1]) == 'string') && (typeof(Arg3991_0[2][1]) == 'string'))))))
  ? (function() {
  return shenjs_str(shenjs_unwind_tail(shenjs_$eq$(Arg3991_0[1], Arg3991_0[2][1])));})
  : (((shenjs_is_type(Arg3991_0, shen_type_cons) && (shenjs_is_type(Arg3991_0[2], shen_type_cons) && (shenjs_empty$question$(Arg3991_0[2][2]) && (shenjs_boolean$question$(Arg3991_0[1]) && shenjs_boolean$question$(Arg3991_0[2][1]))))))
  ? (function() {
  return shenjs_str(shenjs_unwind_tail(shenjs_$eq$(Arg3991_0[1], Arg3991_0[2][1])));})
  : (((shenjs_is_type(Arg3991_0, shen_type_cons) && (shenjs_is_type(Arg3991_0[2], shen_type_cons) && (shenjs_empty$question$(Arg3991_0[2][1]) && shenjs_empty$question$(Arg3991_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "empty?"], [shen_type_cons, Arg3991_0[1], []], Arg3991_1, Arg3991_2]);})
  : (((shenjs_is_type(Arg3991_0, shen_type_cons) && (shenjs_empty$question$(Arg3991_0[1]) && (shenjs_is_type(Arg3991_0[2], shen_type_cons) && shenjs_empty$question$(Arg3991_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "empty?"], Arg3991_0[2], Arg3991_1, Arg3991_2]);})
  : (((shenjs_is_type(Arg3991_0, shen_type_cons) && (shenjs_is_type(Arg3991_0[2], shen_type_cons) && shenjs_empty$question$(Arg3991_0[2][2]))))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "="], Arg3991_0, Arg3991_1, Arg3991_2]);})
  : shen_fail_obj))))))},
  3,
  [],
  "js-equality-op"];
shenjs_functions["shen_js-equality-op"] = js_equality_op;






js_order_op = [shen_type_func,
  function shen_user_lambda3994(Arg3993) {
  if (Arg3993.length < 4) return [shen_type_func, shen_user_lambda3994, 4, Arg3993];
  var Arg3993_0 = Arg3993[0], Arg3993_1 = Arg3993[1], Arg3993_2 = Arg3993[2], Arg3993_3 = Arg3993[3];
  var R0, R1;
  return (((shenjs_is_type(Arg3993_1, shen_type_cons) && (shenjs_is_type(Arg3993_1[2], shen_type_cons) && (shenjs_empty$question$(Arg3993_1[2][2]) && shenjs_call(shen_element$question$, [Arg3993_0, [shen_type_cons, [shen_type_symbol, ">"], [shen_type_cons, [shen_type_symbol, "<"], [shen_type_cons, [shen_type_symbol, ">="], [shen_type_cons, [shen_type_symbol, "<="], []]]]]])))))
  ? ((R0 = shenjs_call(js_js_from_kl_expr, [Arg3993_1[1], false, Arg3993_3])),
  (R1 = shenjs_call(js_js_from_kl_expr, [Arg3993_1[2][1], false, Arg3993_3])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A ~A ~A)", [shen_tuple, R0, [shen_tuple, Arg3993_0, [shen_tuple, R1, []]]]]);}))
  : shen_fail_obj)},
  4,
  [],
  "js-order-op"];
shenjs_functions["shen_js-order-op"] = js_order_op;






js_logic_op = [shen_type_func,
  function shen_user_lambda3996(Arg3995) {
  if (Arg3995.length < 4) return [shen_type_func, shen_user_lambda3996, 4, Arg3995];
  var Arg3995_0 = Arg3995[0], Arg3995_1 = Arg3995[1], Arg3995_2 = Arg3995[2], Arg3995_3 = Arg3995[3];
  return (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "not"], Arg3995_0)) && (shenjs_is_type(Arg3995_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(false, Arg3995_1[1])) && shenjs_empty$question$(Arg3995_1[2])))))
  ? "true"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "not"], Arg3995_0)) && (shenjs_is_type(Arg3995_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg3995_1[1])) && shenjs_empty$question$(Arg3995_1[2])))))
  ? "false"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "not"], Arg3995_0)) && (shenjs_is_type(Arg3995_1, shen_type_cons) && shenjs_empty$question$(Arg3995_1[2]))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(!~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg3995_1[1], false, Arg3995_3]), []]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "and"], Arg3995_0)) && (shenjs_is_type(Arg3995_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(false, Arg3995_1[1])) && (shenjs_is_type(Arg3995_1[2], shen_type_cons) && shenjs_empty$question$(Arg3995_1[2][2]))))))
  ? "false"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "or"], Arg3995_0)) && (shenjs_is_type(Arg3995_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg3995_1[1])) && (shenjs_is_type(Arg3995_1[2], shen_type_cons) && shenjs_empty$question$(Arg3995_1[2][2]))))))
  ? "true"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "and"], Arg3995_0)) && (shenjs_is_type(Arg3995_1, shen_type_cons) && (shenjs_is_type(Arg3995_1[2], shen_type_cons) && shenjs_empty$question$(Arg3995_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A && ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg3995_1[1], false, Arg3995_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg3995_1[2][1], false, Arg3995_3]), []]]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "or"], Arg3995_0)) && (shenjs_is_type(Arg3995_1, shen_type_cons) && (shenjs_is_type(Arg3995_1[2], shen_type_cons) && shenjs_empty$question$(Arg3995_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A || ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg3995_1[1], false, Arg3995_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg3995_1[2][1], false, Arg3995_3]), []]]]);})
  : shen_fail_obj)))))))},
  4,
  [],
  "js-logic-op"];
shenjs_functions["shen_js-logic-op"] = js_logic_op;






js_emit_set$asterisk$ = [shen_type_func,
  function shen_user_lambda3998(Arg3997) {
  if (Arg3997.length < 4) return [shen_type_func, shen_user_lambda3998, 4, Arg3997];
  var Arg3997_0 = Arg3997[0], Arg3997_1 = Arg3997[1], Arg3997_2 = Arg3997[2], Arg3997_3 = Arg3997[3];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg3997_3)))
  ? ((R0 = shenjs_call(js_esc_obj, [("shen_" + shenjs_str(Arg3997_0))])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["(shenjs_globals[~A] = ~A)", [shen_tuple, R0, [shen_tuple, Arg3997_1, []]]]);}))
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg3997_3)))
  ? ((R0 = shenjs_call(js_js_from_kl_expr, [Arg3997_0, false, Arg3997_2])),
  (R1 = shenjs_call(js_esc_obj, ["shen_"])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["(shenjs_globals[~A + ~A[1]] = ~A)", [shen_tuple, R1, [shen_tuple, R0, [shen_tuple, Arg3997_1, []]]]]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-emit-set*"]]);})))},
  4,
  [],
  "js-emit-set*"];
shenjs_functions["shen_js-emit-set*"] = js_emit_set$asterisk$;






js_emit_set = [shen_type_func,
  function shen_user_lambda4000(Arg3999) {
  if (Arg3999.length < 3) return [shen_type_func, shen_user_lambda4000, 3, Arg3999];
  var Arg3999_0 = Arg3999[0], Arg3999_1 = Arg3999[1], Arg3999_2 = Arg3999[2];
  return (function() {
  return shenjs_call_tail(js_emit_set$asterisk$, [Arg3999_0, shenjs_call(js_js_from_kl_expr, [Arg3999_1, false, Arg3999_2]), Arg3999_2, shenjs_is_type(Arg3999_0, shen_type_symbol)]);})},
  3,
  [],
  "js-emit-set"];
shenjs_functions["shen_js-emit-set"] = js_emit_set;






js_emit_value = [shen_type_func,
  function shen_user_lambda4002(Arg4001) {
  if (Arg4001.length < 3) return [shen_type_func, shen_user_lambda4002, 3, Arg4001];
  var Arg4001_0 = Arg4001[0], Arg4001_1 = Arg4001[1], Arg4001_2 = Arg4001[2];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg4001_2)))
  ? ((R0 = shenjs_call(js_esc_obj, [("shen_" + shenjs_str(Arg4001_0))])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["(shenjs_globals[~A])", [shen_tuple, R0, []]]);}))
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg4001_2)))
  ? ((R0 = shenjs_call(js_js_from_kl_expr, [Arg4001_0, false, Arg4001_1])),
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
  function shen_user_lambda4004(Arg4003) {
  if (Arg4003.length < 4) return [shen_type_func, shen_user_lambda4004, 4, Arg4003];
  var Arg4003_0 = Arg4003[0], Arg4003_1 = Arg4003[1], Arg4003_2 = Arg4003[2], Arg4003_3 = Arg4003[3];
  var R0, R1;
  return (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "intern"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$("true", Arg4003_1[1])) && shenjs_empty$question$(Arg4003_1[2])))))
  ? "true"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "intern"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$("false", Arg4003_1[1])) && shenjs_empty$question$(Arg4003_1[2])))))
  ? "false"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "intern"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && (shenjs_empty$question$(Arg4003_1[2]) && (typeof(Arg4003_1[1]) == 'string')))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["[shen_type_symbol, ~A]", [shen_tuple, shenjs_call(js_esc_obj, [Arg4003_1[1]]), []]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "intern"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && shenjs_empty$question$(Arg4003_1[2]))))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "intern"], Arg4003_1, Arg4003_2, Arg4003_3]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && (shenjs_is_type(Arg4003_1[2], shen_type_cons) && shenjs_empty$question$(Arg4003_1[2][2])))))
  ? ((R0 = shenjs_call(js_js_from_kl_expr, [Arg4003_1[1], false, Arg4003_3])),
  (R1 = shenjs_call(js_js_from_kl_expr, [Arg4003_1[2][1], false, Arg4003_3])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["[shen_type_cons, ~A, ~A]", [shen_tuple, R0, [shen_tuple, R1, []]]]);}))
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@p"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && (shenjs_is_type(Arg4003_1[2], shen_type_cons) && shenjs_empty$question$(Arg4003_1[2][2])))))
  ? ((R0 = shenjs_call(js_js_from_kl_expr, [Arg4003_1[1], false, Arg4003_3])),
  (R1 = shenjs_call(js_js_from_kl_expr, [Arg4003_1[2][1], false, Arg4003_3])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["[shen_tuple, ~A, ~A]", [shen_tuple, R0, [shen_tuple, R1, []]]]);}))
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "set"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && (shenjs_is_type(Arg4003_1[2], shen_type_cons) && shenjs_empty$question$(Arg4003_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(js_emit_set, [Arg4003_1[1], Arg4003_1[2][1], Arg4003_3]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "value"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && shenjs_empty$question$(Arg4003_1[2]))))
  ? (function() {
  return shenjs_call_tail(js_emit_value, [Arg4003_1[1], Arg4003_3, shenjs_is_type(Arg4003_1[1], shen_type_symbol)]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "thaw"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && shenjs_empty$question$(Arg4003_1[2]))))
  ? (function() {
  return shenjs_call_tail(js_emit_thaw, [Arg4003_1[1], Arg4003_2, Arg4003_3]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "function"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && shenjs_empty$question$(Arg4003_1[2]))))
  ? (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4003_1[1], true, Arg4003_3]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "hd"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && shenjs_empty$question$(Arg4003_1[2]))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A[1]", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4003_1[1], false, Arg4003_3]), []]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "tl"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && shenjs_empty$question$(Arg4003_1[2]))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A[2]", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4003_1[1], false, Arg4003_3]), []]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cn"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && (shenjs_is_type(Arg4003_1[2], shen_type_cons) && shenjs_empty$question$(Arg4003_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A + ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4003_1[1], false, Arg4003_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4003_1[2][1], false, Arg4003_3]), []]]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "pos"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && (shenjs_is_type(Arg4003_1[2], shen_type_cons) && shenjs_empty$question$(Arg4003_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A[~A]", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4003_1[1], false, Arg4003_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4003_1[2][1], false, Arg4003_3]), []]]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "address->"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && (shenjs_is_type(Arg4003_1[2], shen_type_cons) && (shenjs_is_type(Arg4003_1[2][2], shen_type_cons) && shenjs_empty$question$(Arg4003_1[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_absvector_set(~A, ~A, ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4003_1[1], false, Arg4003_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4003_1[2][1], false, Arg4003_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4003_1[2][2][1], false, Arg4003_3]), []]]]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "<-address"], Arg4003_0)) && (shenjs_is_type(Arg4003_1, shen_type_cons) && (shenjs_is_type(Arg4003_1[2], shen_type_cons) && shenjs_empty$question$(Arg4003_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_absvector_ref(~A, ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4003_1[1], false, Arg4003_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4003_1[2][1], false, Arg4003_3]), []]]]);})
  : shen_fail_obj))))))))))))))))},
  4,
  [],
  "js-basic-op"];
shenjs_functions["shen_js-basic-op"] = js_basic_op;






js_int_funcall$asterisk$ = [shen_type_func,
  function shen_user_lambda4006(Arg4005) {
  if (Arg4005.length < 5) return [shen_type_func, shen_user_lambda4006, 5, Arg4005];
  var Arg4005_0 = Arg4005[0], Arg4005_1 = Arg4005[1], Arg4005_2 = Arg4005[2], Arg4005_3 = Arg4005[3], Arg4005_4 = Arg4005[4];
  var R0;
  return (((shenjs_unwind_tail(shenjs_$eq$(true, Arg4005_2)) && shenjs_unwind_tail(shenjs_$eq$(true, Arg4005_3))))
  ? (function() {
  return shenjs_call_tail(js_int_funcall$asterisk$, [Arg4005_0, Arg4005_1, false, false, Arg4005_4]);})
  : (((shenjs_unwind_tail(shenjs_$eq$(true, Arg4005_2)) && shenjs_unwind_tail(shenjs_$eq$(false, Arg4005_3))))
  ? ((R0 = shenjs_call(js_int_funcall$asterisk$, [Arg4005_0, Arg4005_1, false, false, Arg4005_4])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_unwind_tail(~A)", [shen_tuple, R0, []]]);}))
  : (((shenjs_unwind_tail(shenjs_$eq$(false, Arg4005_2)) && shenjs_unwind_tail(shenjs_$eq$(false, Arg4005_3))))
  ? ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4008(Arg4007) {
  if (Arg4007.length < 2) return [shen_type_func, shen_user_lambda4008, 2, Arg4007];
  var Arg4007_0 = Arg4007[0], Arg4007_1 = Arg4007[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4007_1, false, Arg4007_0]);})},
  2,
  [Arg4005_4]], Arg4005_1])),
  (R0 = shenjs_call(js_str_join, [R0, ", "])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A(~A)", [shen_tuple, shenjs_call(js_intfunc_name, [Arg4005_0]), [shen_tuple, R0, []]]]);}))
  : (((shenjs_unwind_tail(shenjs_$eq$(false, Arg4005_2)) && shenjs_unwind_tail(shenjs_$eq$(true, Arg4005_3))))
  ? (function() {
  return shenjs_call_tail(js_tail_call_ret, [shenjs_call(js_int_funcall$asterisk$, [Arg4005_0, Arg4005_1, false, false, Arg4005_4])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-int-funcall*"]]);})))))},
  5,
  [],
  "js-int-funcall*"];
shenjs_functions["shen_js-int-funcall*"] = js_int_funcall$asterisk$;






js_int_funcall = [shen_type_func,
  function shen_user_lambda4010(Arg4009) {
  if (Arg4009.length < 4) return [shen_type_func, shen_user_lambda4010, 4, Arg4009];
  var Arg4009_0 = Arg4009[0], Arg4009_1 = Arg4009[1], Arg4009_2 = Arg4009[2], Arg4009_3 = Arg4009[3];
  var R0;
  return ((R0 = shenjs_call(shen_element$question$, [Arg4009_0, (shenjs_globals["shen_js-tail-internals"])])),
  (function() {
  return shenjs_call_tail(js_int_funcall$asterisk$, [Arg4009_0, Arg4009_1, R0, Arg4009_2, Arg4009_3]);}))},
  4,
  [],
  "js-int-funcall"];
shenjs_functions["shen_js-int-funcall"] = js_int_funcall;






js_int_curry = [shen_type_func,
  function shen_user_lambda4012(Arg4011) {
  if (Arg4011.length < 4) return [shen_type_func, shen_user_lambda4012, 4, Arg4011];
  var Arg4011_0 = Arg4011[0], Arg4011_1 = Arg4011[1], Arg4011_2 = Arg4011[2], Arg4011_3 = Arg4011[3];
  var R0, R1;
  return ((R0 = shenjs_call(shen_intmake_string, ["~A[1]", [shen_tuple, shenjs_call(js_func_name, [Arg4011_0]), []]])),
  (R1 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4014(Arg4013) {
  if (Arg4013.length < 2) return [shen_type_func, shen_user_lambda4014, 2, Arg4013];
  var Arg4013_0 = Arg4013[0], Arg4013_1 = Arg4013[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4013_1, false, Arg4013_0]);})},
  2,
  [Arg4011_3]], Arg4011_2])),
  (function() {
  return shenjs_call_tail(js_emit_func_obj, [shenjs_call(shen_length, [Arg4011_1]), R0, R1, []]);}))},
  4,
  [],
  "js-int-curry"];
shenjs_functions["shen_js-int-curry"] = js_int_curry;






js_internal_op$asterisk$ = [shen_type_func,
  function shen_user_lambda4016(Arg4015) {
  if (Arg4015.length < 5) return [shen_type_func, shen_user_lambda4016, 5, Arg4015];
  var Arg4015_0 = Arg4015[0], Arg4015_1 = Arg4015[1], Arg4015_2 = Arg4015[2], Arg4015_3 = Arg4015[3], Arg4015_4 = Arg4015[4];
  return ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_length, [Arg4015_1]), shenjs_call(shen_length, [Arg4015_2]))))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [Arg4015_0, Arg4015_2, Arg4015_3, Arg4015_4]);})
  : (function() {
  return shenjs_call_tail(js_int_curry, [Arg4015_0, Arg4015_1, Arg4015_2, Arg4015_4]);}))},
  5,
  [],
  "js-internal-op*"];
shenjs_functions["shen_js-internal-op*"] = js_internal_op$asterisk$;






js_internal_op = [shen_type_func,
  function shen_user_lambda4018(Arg4017) {
  if (Arg4017.length < 4) return [shen_type_func, shen_user_lambda4018, 4, Arg4017];
  var Arg4017_0 = Arg4017[0], Arg4017_1 = Arg4017[1], Arg4017_2 = Arg4017[2], Arg4017_3 = Arg4017[3];
  var R0;
  return ((R0 = shenjs_call(js_int_func_args, [Arg4017_0])),
  shenjs_call(js_intfunc_name, [Arg4017_0]),
  ((shenjs_empty$question$(R0))
  ? shen_fail_obj
  : (function() {
  return shenjs_call_tail(js_internal_op$asterisk$, [Arg4017_0, R0, Arg4017_1, Arg4017_2, Arg4017_3]);})))},
  4,
  [],
  "js-internal-op"];
shenjs_functions["shen_js-internal-op"] = js_internal_op;






js_emit_do = [shen_type_func,
  function shen_user_lambda4020(Arg4019) {
  if (Arg4019.length < 4) return [shen_type_func, shen_user_lambda4020, 4, Arg4019];
  var Arg4019_0 = Arg4019[0], Arg4019_1 = Arg4019[1], Arg4019_2 = Arg4019[2], Arg4019_3 = Arg4019[3];
  var R0, R1;
  return (((shenjs_is_type(Arg4019_0, shen_type_cons) && shenjs_empty$question$(Arg4019_0[2])))
  ? ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4022(Arg4021) {
  if (Arg4021.length < 2) return [shen_type_func, shen_user_lambda4022, 2, Arg4021];
  var Arg4021_0 = Arg4021[0], Arg4021_1 = Arg4021[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4021_1, false, Arg4021_0]);})},
  2,
  [Arg4019_2]], shenjs_call(shen_reverse, [Arg4019_3])])),
  (R1 = shenjs_call(shen_intmake_string, [",~%  ", []])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A,~%  ~A)", [shen_tuple, shenjs_call(js_str_join, [R0, R1]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4019_0[1], Arg4019_1, Arg4019_2]), []]]]);}))
  : ((shenjs_is_type(Arg4019_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(js_emit_do, [Arg4019_0[2], Arg4019_1, Arg4019_2, [shen_type_cons, Arg4019_0[1], Arg4019_3]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-emit-do"]]);})))},
  4,
  [],
  "js-emit-do"];
shenjs_functions["shen_js-emit-do"] = js_emit_do;






js_std_op = [shen_type_func,
  function shen_user_lambda4024(Arg4023) {
  if (Arg4023.length < 4) return [shen_type_func, shen_user_lambda4024, 4, Arg4023];
  var Arg4023_0 = Arg4023[0], Arg4023_1 = Arg4023[1], Arg4023_2 = Arg4023[2], Arg4023_3 = Arg4023[3];
  var R0, R1;
  return ((R0 = (new Shenjs_freeze([Arg4023_0, Arg4023_1, Arg4023_2, Arg4023_3], function(Arg4025) {
  var Arg4025_0 = Arg4025[0], Arg4025_1 = Arg4025[1], Arg4025_2 = Arg4025[2], Arg4025_3 = Arg4025[3];
  return (function() {
  return ((R4 = shenjs_call(js_math_op, [Arg4025_0, Arg4025_1, Arg4025_2, Arg4025_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R4, shen_fail_obj)))
  ? ((R4 = (new Shenjs_freeze([Arg4025_0, Arg4025_1, Arg4025_2, Arg4025_3], function(Arg4027) {
  var Arg4027_0 = Arg4027[0], Arg4027_1 = Arg4027[1], Arg4027_2 = Arg4027[2], Arg4027_3 = Arg4027[3];
  return (function() {
  return ((R4 = shenjs_call(js_logic_op, [Arg4027_0, Arg4027_1, Arg4027_2, Arg4027_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R4, shen_fail_obj)))
  ? ((R4 = shenjs_call(js_order_op, [Arg4027_0, Arg4027_1, Arg4027_2, Arg4027_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R4, shen_fail_obj)))
  ? ((R4 = shenjs_call(js_basic_op, [Arg4027_0, Arg4027_1, Arg4027_2, Arg4027_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R4, shen_fail_obj)))
  ? ((R4 = (new Shenjs_freeze([Arg4027_0, Arg4027_1, Arg4027_2, Arg4027_3], function(Arg4029) {
  var Arg4029_0 = Arg4029[0], Arg4029_1 = Arg4029[1], Arg4029_2 = Arg4029[2], Arg4029_3 = Arg4029[3];
  return (function() {
  return (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "trap-error"], Arg4029_0)) && (shenjs_is_type(Arg4029_1, shen_type_cons) && (shenjs_is_type(Arg4029_1[2], shen_type_cons) && shenjs_empty$question$(Arg4029_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(js_emit_trap_error, [Arg4029_1[1], Arg4029_1[2][1], Arg4029_2, Arg4029_3]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "do"], Arg4029_0)))
  ? (function() {
  return shenjs_call_tail(js_emit_do, [Arg4029_1, Arg4029_2, Arg4029_3, []]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fail"], Arg4029_0)) && shenjs_empty$question$(Arg4029_1)))
  ? "shen_fail_obj"
  : shen_fail_obj)));})}))),
  ((shenjs_is_type(Arg4027_0, shen_type_symbol))
  ? ((R3 = shenjs_call(js_internal_op, [Arg4027_0, Arg4027_1, Arg4027_2, Arg4027_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R3, shen_fail_obj)))
  ? shenjs_thaw(R4)
  : R3))
  : shenjs_thaw(R4)))
  : R4))
  : R4))
  : R4));})}))),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "="], Arg4025_0)))
  ? ((R3 = shenjs_call(js_equality_op, [Arg4025_1, Arg4025_2, Arg4025_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R3, shen_fail_obj)))
  ? shenjs_thaw(R4)
  : R3))
  : shenjs_thaw(R4)))
  : R4));})}))),
  (((shenjs_is_type(Arg4023_1, shen_type_cons) && shenjs_empty$question$(Arg4023_1[2])))
  ? ((R1 = shenjs_call(js_predicate_op, [Arg4023_0, Arg4023_1[1], Arg4023_2, Arg4023_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, shen_fail_obj)))
  ? shenjs_thaw(R0)
  : R1))
  : shenjs_thaw(R0)))},
  4,
  [],
  "js-std-op"];
shenjs_functions["shen_js-std-op"] = js_std_op;






js_mk_regs_aux = [shen_type_func,
  function shen_user_lambda4032(Arg4031) {
  if (Arg4031.length < 5) return [shen_type_func, shen_user_lambda4032, 5, Arg4031];
  var Arg4031_0 = Arg4031[0], Arg4031_1 = Arg4031[1], Arg4031_2 = Arg4031[2], Arg4031_3 = Arg4031[3], Arg4031_4 = Arg4031[4];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4031_1, Arg4031_0)))
  ? Arg4031_4
  : ((R0 = shenjs_call(shen_intmake_string, ["~A~A~A~A", [shen_tuple, Arg4031_4, [shen_tuple, Arg4031_3, [shen_tuple, shenjs_call(js_context_varname, [Arg4031_2]), [shen_tuple, Arg4031_0, []]]]]])),
  (function() {
  return shenjs_call_tail(js_mk_regs_aux, [(Arg4031_0 + 1), Arg4031_1, Arg4031_2, ", ", R0]);})))},
  5,
  [],
  "js-mk-regs-aux"];
shenjs_functions["shen_js-mk-regs-aux"] = js_mk_regs_aux;






js_mk_regs = [shen_type_func,
  function shen_user_lambda4034(Arg4033) {
  if (Arg4033.length < 1) return [shen_type_func, shen_user_lambda4034, 1, Arg4033];
  var Arg4033_0 = Arg4033[0];
  return (function() {
  return shenjs_call_tail(js_mk_regs_aux, [0, shenjs_call(js_context_nregs, [Arg4033_0]), Arg4033_0, "var ", ""]);})},
  1,
  [],
  "js-mk-regs"];
shenjs_functions["shen_js-mk-regs"] = js_mk_regs;






js_mk_regs_str = [shen_type_func,
  function shen_user_lambda4036(Arg4035) {
  if (Arg4035.length < 1) return [shen_type_func, shen_user_lambda4036, 1, Arg4035];
  var Arg4035_0 = Arg4035[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(js_context_nregs, [Arg4035_0]), 0)))
  ? ""
  : (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A;~%  ", [shen_tuple, shenjs_call(js_mk_regs, [Arg4035_0]), []]]);}))},
  1,
  [],
  "js-mk-regs-str"];
shenjs_functions["shen_js-mk-regs-str"] = js_mk_regs_str;






js_mk_args_str_aux = [shen_type_func,
  function shen_user_lambda4038(Arg4037) {
  if (Arg4037.length < 5) return [shen_type_func, shen_user_lambda4038, 5, Arg4037];
  var Arg4037_0 = Arg4037[0], Arg4037_1 = Arg4037[1], Arg4037_2 = Arg4037[2], Arg4037_3 = Arg4037[3], Arg4037_4 = Arg4037[4];
  var R0, R1, R2;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4037_1, Arg4037_0)))
  ? Arg4037_4
  : ((R0 = "~A~A~A = ~A[~A]"),
  (R1 = shenjs_call(js_context_argname, [Arg4037_2])),
  (R2 = shenjs_call(js_arg_name, [Arg4037_1, Arg4037_2])),
  (R2 = shenjs_call(shen_intmake_string, [R0, [shen_tuple, Arg4037_4, [shen_tuple, Arg4037_3, [shen_tuple, R2, [shen_tuple, R1, [shen_tuple, Arg4037_1, []]]]]]])),
  (function() {
  return shenjs_call_tail(js_mk_args_str_aux, [Arg4037_0, (Arg4037_1 + 1), Arg4037_2, ", ", R2]);})))},
  5,
  [],
  "js-mk-args-str-aux"];
shenjs_functions["shen_js-mk-args-str-aux"] = js_mk_args_str_aux;






js_mk_args_str = [shen_type_func,
  function shen_user_lambda4040(Arg4039) {
  if (Arg4039.length < 2) return [shen_type_func, shen_user_lambda4040, 2, Arg4039];
  var Arg4039_0 = Arg4039[0], Arg4039_1 = Arg4039[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg4039_0)))
  ? ""
  : (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A;~%  ", [shen_tuple, shenjs_call(js_mk_args_str_aux, [Arg4039_0, 0, Arg4039_1, "var ", ""]), []]]);}))},
  2,
  [],
  "js-mk-args-str"];
shenjs_functions["shen_js-mk-args-str"] = js_mk_args_str;






js_emit_func_obj = [shen_type_func,
  function shen_user_lambda4042(Arg4041) {
  if (Arg4041.length < 4) return [shen_type_func, shen_user_lambda4042, 4, Arg4041];
  var Arg4041_0 = Arg4041[0], Arg4041_1 = Arg4041[1], Arg4041_2 = Arg4041[2], Arg4041_3 = Arg4041[3];
  var R0, R1, R2, R3;
  return ((R0 = (((shenjs_unwind_tail(shenjs_$eq$(Arg4041_3, "")) || shenjs_empty$question$(Arg4041_3)))
  ? ""
  : shenjs_call(shen_intmake_string, [",~%  ~A", [shen_tuple, Arg4041_3, []]]))),
  (R1 = "shen_type_func"),
  (R2 = shenjs_call(js_str_join, [Arg4041_2, ", "])),
  (R3 = "[~A,~%  ~A,~%  ~A,~%  [~A]~A]"),
  (function() {
  return shenjs_call_tail(shen_intmake_string, [R3, [shen_tuple, R1, [shen_tuple, Arg4041_1, [shen_tuple, Arg4041_0, [shen_tuple, R2, [shen_tuple, R0, []]]]]]]);}))},
  4,
  [],
  "js-emit-func-obj"];
shenjs_functions["shen_js-emit-func-obj"] = js_emit_func_obj;






js_emit_func_closure = [shen_type_func,
  function shen_user_lambda4044(Arg4043) {
  if (Arg4043.length < 3) return [shen_type_func, shen_user_lambda4044, 3, Arg4043];
  var Arg4043_0 = Arg4043[0], Arg4043_1 = Arg4043[1], Arg4043_2 = Arg4043[2];
  var R0, R1;
  return ((R0 = "[~A, ~A, ~A, ~A]"),
  (R1 = "shen_type_func"),
  (function() {
  return shenjs_call_tail(shen_intmake_string, [R0, [shen_tuple, R1, [shen_tuple, Arg4043_1, [shen_tuple, Arg4043_0, [shen_tuple, Arg4043_2, []]]]]]);}))},
  3,
  [],
  "js-emit-func-closure"];
shenjs_functions["shen_js-emit-func-closure"] = js_emit_func_closure;






js_emit_func_body = [shen_type_func,
  function shen_user_lambda4046(Arg4045) {
  if (Arg4045.length < 5) return [shen_type_func, shen_user_lambda4046, 5, Arg4045];
  var Arg4045_0 = Arg4045[0], Arg4045_1 = Arg4045[1], Arg4045_2 = Arg4045[2], Arg4045_3 = Arg4045[3], Arg4045_4 = Arg4045[4];
  var R0, R1, R2, R3, R4, R5, R6;
  return ((R0 = shenjs_call(js_func_name, [Arg4045_1])),
  ((shenjs_empty$question$(Arg4045_0))
  ? []
  : shenjs_call(js_esc_obj, [shenjs_str(Arg4045_0)])),
  (R1 = shenjs_call(js_context_argname, [Arg4045_4])),
  (R2 = shenjs_call(js_emit_func_closure, [Arg4045_2, R0, R1])),
  (R2 = shenjs_call(shen_intmake_string, ["if (~A.length < ~A) return ~A", [shen_tuple, shenjs_call(js_context_argname, [Arg4045_4]), [shen_tuple, Arg4045_2, [shen_tuple, R2, []]]]])),
  (R3 = "function ~A(~A) {~%  ~A;~%  ~A~Areturn ~A}"),
  (R4 = shenjs_call(js_js_from_kl_expr, [Arg4045_3, true, Arg4045_4])),
  (R5 = shenjs_call(js_mk_regs_str, [Arg4045_4])),
  (R6 = shenjs_call(js_mk_args_str, [Arg4045_2, Arg4045_4])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, [R3, [shen_tuple, R0, [shen_tuple, R1, [shen_tuple, R2, [shen_tuple, R6, [shen_tuple, R5, [shen_tuple, R4, []]]]]]]]);}))},
  5,
  [],
  "js-emit-func-body"];
shenjs_functions["shen_js-emit-func-body"] = js_emit_func_body;






js_emit_mk_func = [shen_type_func,
  function shen_user_lambda4048(Arg4047) {
  if (Arg4047.length < 4) return [shen_type_func, shen_user_lambda4048, 4, Arg4047];
  var Arg4047_0 = Arg4047[0], Arg4047_1 = Arg4047[1], Arg4047_2 = Arg4047[2], Arg4047_3 = Arg4047[3];
  var R0, R1, R2, R3, R4, R5;
  return ((R0 = shenjs_call(js_esc_obj, [shenjs_str(Arg4047_0)])),
  (R1 = shenjs_call(js_esc_obj, [("shen_" + shenjs_str(Arg4047_0))])),
  (R2 = shenjs_call(js_func_name, [Arg4047_0])),
  (R3 = shenjs_call(shen_length, [Arg4047_1])),
  (R4 = shenjs_call(shen_gensym, [[shen_type_symbol, "shen-user-lambda"]])),
  (R4 = shenjs_call(js_emit_func_body, [R2, R4, R3, Arg4047_2, Arg4047_3])),
  (R5 = "~A = ~A;~%shenjs_functions[~A] = ~A;~%"),
  (R4 = shenjs_call(js_emit_func_obj, [R3, R4, [], R0])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, [R5, [shen_tuple, R2, [shen_tuple, R4, [shen_tuple, R1, [shen_tuple, R2, []]]]]]);}))},
  4,
  [],
  "js-emit-mk-func"];
shenjs_functions["shen_js-emit-mk-func"] = js_emit_mk_func;






js_emit_mk_closure = [shen_type_func,
  function shen_user_lambda4050(Arg4049) {
  if (Arg4049.length < 4) return [shen_type_func, shen_user_lambda4050, 4, Arg4049];
  var Arg4049_0 = Arg4049[0], Arg4049_1 = Arg4049[1], Arg4049_2 = Arg4049[2], Arg4049_3 = Arg4049[3];
  var R0, R1, R2;
  return ((R0 = shenjs_call(js_context_toplevel, [Arg4049_3])),
  (R1 = [shen_type_symbol, "Arg"]),
  (R2 = (shenjs_call(shen_length, [Arg4049_1]) + shenjs_call(shen_length, [Arg4049_0]))),
  (R1 = shenjs_call(js_mk_context, [0, R0, shenjs_call(shen_gensym, [R1]), [shen_type_symbol, "R"]])),
  (R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "shen-user-lambda"]])),
  (R0 = shenjs_call(js_emit_func_body, [[], R0, R2, Arg4049_2, R1])),
  shenjs_call(js_context_toplevel_$gt$, [Arg4049_3, shenjs_call(js_context_toplevel, [R1])]),
  (R1 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4052(Arg4051) {
  if (Arg4051.length < 2) return [shen_type_func, shen_user_lambda4052, 2, Arg4051];
  var Arg4051_0 = Arg4051[0], Arg4051_1 = Arg4051[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4051_1, false, Arg4051_0]);})},
  2,
  [Arg4049_3]], Arg4049_1])),
  (function() {
  return shenjs_call_tail(js_emit_func_obj, [R2, R0, R1, []]);}))},
  4,
  [],
  "js-emit-mk-closure"];
shenjs_functions["shen_js-emit-mk-closure"] = js_emit_mk_closure;






js_emit_freeze = [shen_type_func,
  function shen_user_lambda4054(Arg4053) {
  if (Arg4053.length < 3) return [shen_type_func, shen_user_lambda4054, 3, Arg4053];
  var Arg4053_0 = Arg4053[0], Arg4053_1 = Arg4053[1], Arg4053_2 = Arg4053[2];
  var R0, R1, R2, R3, R4;
  return ((R0 = shenjs_call(js_context_toplevel, [Arg4053_2])),
  (R1 = [shen_type_symbol, "Arg"]),
  (R1 = shenjs_call(js_mk_context, [0, R0, shenjs_call(shen_gensym, [R1]), [shen_type_symbol, "R"]])),
  shenjs_call(shen_gensym, [[shen_type_symbol, "shen-user-lambda"]]),
  shenjs_call(js_context_toplevel_$gt$, [Arg4053_2, shenjs_call(js_context_toplevel, [R1])]),
  (R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4056(Arg4055) {
  if (Arg4055.length < 2) return [shen_type_func, shen_user_lambda4056, 2, Arg4055];
  var Arg4055_0 = Arg4055[0], Arg4055_1 = Arg4055[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4055_1, false, Arg4055_0]);})},
  2,
  [Arg4053_2]], Arg4053_0])),
  (R2 = shenjs_call(js_str_join, [R0, ", "])),
  (R3 = shenjs_call(js_tail_call_ret, [shenjs_call(js_js_from_kl_expr, [Arg4053_1, true, R1])])),
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
  function shen_user_lambda4058(Arg4057) {
  if (Arg4057.length < 3) return [shen_type_func, shen_user_lambda4058, 3, Arg4057];
  var Arg4057_0 = Arg4057[0], Arg4057_1 = Arg4057[1], Arg4057_2 = Arg4057[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(false, Arg4057_1)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_unwind_tail(~A)", [shen_tuple, shenjs_call(js_emit_thaw, [Arg4057_0, true, Arg4057_2]), []]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(true, Arg4057_1)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_thaw(~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4057_0, false, Arg4057_2]), []]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-emit-thaw"]]);})))},
  3,
  [],
  "js-emit-thaw"];
shenjs_functions["shen_js-emit-thaw"] = js_emit_thaw;






js_emit_get_arg = [shen_type_func,
  function shen_user_lambda4060(Arg4059) {
  if (Arg4059.length < 2) return [shen_type_func, shen_user_lambda4060, 2, Arg4059];
  var Arg4059_0 = Arg4059[0], Arg4059_1 = Arg4059[1];
  return (function() {
  return shenjs_call_tail(js_arg_name, [Arg4059_0, Arg4059_1]);})},
  2,
  [],
  "js-emit-get-arg"];
shenjs_functions["shen_js-emit-get-arg"] = js_emit_get_arg;






js_emit_set_reg = [shen_type_func,
  function shen_user_lambda4062(Arg4061) {
  if (Arg4061.length < 3) return [shen_type_func, shen_user_lambda4062, 3, Arg4061];
  var Arg4061_0 = Arg4061[0], Arg4061_1 = Arg4061[1], Arg4061_2 = Arg4061[2];
  var R0;
  return ((R0 = shenjs_call(js_js_from_kl_expr, [Arg4061_1, false, Arg4061_2])),
  shenjs_call(js_context_nregs_$gt$, [Arg4061_2, shenjs_call(js_max, [(Arg4061_0 + 1), shenjs_call(js_context_nregs, [Arg4061_2])])]),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A~A = ~A)", [shen_tuple, shenjs_call(js_context_varname, [Arg4061_2]), [shen_tuple, Arg4061_0, [shen_tuple, R0, []]]]]);}))},
  3,
  [],
  "js-emit-set-reg"];
shenjs_functions["shen_js-emit-set-reg"] = js_emit_set_reg;






js_emit_get_reg = [shen_type_func,
  function shen_user_lambda4064(Arg4063) {
  if (Arg4063.length < 2) return [shen_type_func, shen_user_lambda4064, 2, Arg4063];
  var Arg4063_0 = Arg4063[0], Arg4063_1 = Arg4063[1];
  return (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A~A", [shen_tuple, shenjs_call(js_context_varname, [Arg4063_1]), [shen_tuple, Arg4063_0, []]]]);})},
  2,
  [],
  "js-emit-get-reg"];
shenjs_functions["shen_js-emit-get-reg"] = js_emit_get_reg;






js_func_arg = [shen_type_func,
  function shen_user_lambda4066(Arg4065) {
  if (Arg4065.length < 2) return [shen_type_func, shen_user_lambda4066, 2, Arg4065];
  var Arg4065_0 = Arg4065[0], Arg4065_1 = Arg4065[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4065_1, false, Arg4065_0]);})},
  2,
  [],
  "js-func-arg"];
shenjs_functions["shen_js-func-arg"] = js_func_arg;






js_emit_funcall$asterisk$ = [shen_type_func,
  function shen_user_lambda4068(Arg4067) {
  if (Arg4067.length < 4) return [shen_type_func, shen_user_lambda4068, 4, Arg4067];
  var Arg4067_0 = Arg4067[0], Arg4067_1 = Arg4067[1], Arg4067_2 = Arg4067[2], Arg4067_3 = Arg4067[3];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg4067_2)))
  ? ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4070(Arg4069) {
  if (Arg4069.length < 2) return [shen_type_func, shen_user_lambda4070, 2, Arg4069];
  var Arg4069_0 = Arg4069[0], Arg4069_1 = Arg4069[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4069_1, false, Arg4069_0]);})},
  2,
  [Arg4067_3]], Arg4067_1])),
  (R0 = shenjs_call(js_str_join, [R0, ", "])),
  (R1 = "shenjs_call_tail"),
  (function() {
  return shenjs_call_tail(js_tail_call_ret, [shenjs_call(shen_intmake_string, ["~A(~A, [~A])", [shen_tuple, R1, [shen_tuple, Arg4067_0, [shen_tuple, R0, []]]]])]);}))
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg4067_2)))
  ? ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4072(Arg4071) {
  if (Arg4071.length < 2) return [shen_type_func, shen_user_lambda4072, 2, Arg4071];
  var Arg4071_0 = Arg4071[0], Arg4071_1 = Arg4071[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4071_1, false, Arg4071_0]);})},
  2,
  [Arg4067_3]], Arg4067_1])),
  (R0 = shenjs_call(js_str_join, [R0, ", "])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_call(~A, [~A])", [shen_tuple, Arg4067_0, [shen_tuple, R0, []]]]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-emit-funcall*"]]);})))},
  4,
  [],
  "js-emit-funcall*"];
shenjs_functions["shen_js-emit-funcall*"] = js_emit_funcall$asterisk$;






js_emit_funcall = [shen_type_func,
  function shen_user_lambda4074(Arg4073) {
  if (Arg4073.length < 4) return [shen_type_func, shen_user_lambda4074, 4, Arg4073];
  var Arg4073_0 = Arg4073[0], Arg4073_1 = Arg4073[1], Arg4073_2 = Arg4073[2], Arg4073_3 = Arg4073[3];
  return (function() {
  return shenjs_call_tail(js_emit_funcall$asterisk$, [shenjs_call(js_func_name, [Arg4073_0]), Arg4073_1, Arg4073_2, Arg4073_3]);})},
  4,
  [],
  "js-emit-funcall"];
shenjs_functions["shen_js-emit-funcall"] = js_emit_funcall;






js_js_from_kl_expr = [shen_type_func,
  function shen_user_lambda4076(Arg4075) {
  if (Arg4075.length < 3) return [shen_type_func, shen_user_lambda4076, 3, Arg4075];
  var Arg4075_0 = Arg4075[0], Arg4075_1 = Arg4075[1], Arg4075_2 = Arg4075[2];
  var R0;
  return ((R0 = shenjs_call(js_js_from_kl_expr$asterisk$, [Arg4075_0, Arg4075_1, Arg4075_2])),
  (((typeof(R0) == 'string'))
  ? R0
  : (function() {
  return shenjs_call_tail(shen_interror, ["ERROR: expr ~R => ~R", [shen_tuple, Arg4075_0, [shen_tuple, R0, []]]]);})))},
  3,
  [],
  "js-js-from-kl-expr"];
shenjs_functions["shen_js-js-from-kl-expr"] = js_js_from_kl_expr;






js_js_from_kl_expr$asterisk$ = [shen_type_func,
  function shen_user_lambda4078(Arg4077) {
  if (Arg4077.length < 3) return [shen_type_func, shen_user_lambda4078, 3, Arg4077];
  var Arg4077_0 = Arg4077[0], Arg4077_1 = Arg4077[1], Arg4077_2 = Arg4077[2];
  var R0, R1;
  return ((shenjs_empty$question$(Arg4077_0))
  ? "[]"
  : (((typeof(Arg4077_0) == 'number'))
  ? (function() {
  return shenjs_str(Arg4077_0);})
  : ((shenjs_unwind_tail(shenjs_$eq$(Arg4077_0, shen_fail_obj)))
  ? "shen_fail_obj"
  : ((shenjs_unwind_tail(shenjs_$eq$(true, Arg4077_0)))
  ? "true"
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg4077_0)))
  ? "false"
  : ((shenjs_is_type(Arg4077_0, shen_type_symbol))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["[shen_type_symbol, ~S]", [shen_tuple, shenjs_str(Arg4077_0), []]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "bar!"], Arg4077_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["[shen_type_symbol, ~S]", [shen_tuple, "|", []]]);})
  : (((shenjs_is_type(Arg4077_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg4077_0[1])) && (shenjs_is_type(Arg4077_0[2], shen_type_cons) && (shenjs_is_type(Arg4077_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4077_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["[shen_type_cons, ~A, ~A]", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4077_0[2][1], false, Arg4077_2]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4077_0[2][2][1], false, Arg4077_2]), []]]]);})
  : (((shenjs_is_type(Arg4077_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "type"], Arg4077_0[1])) && (shenjs_is_type(Arg4077_0[2], shen_type_cons) && (shenjs_is_type(Arg4077_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4077_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4077_0[2][1], Arg4077_1, Arg4077_2]);})
  : (((shenjs_is_type(Arg4077_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cond"], Arg4077_0[1]))))
  ? (function() {
  return shenjs_call_tail(js_emit_cond, [Arg4077_0[2], Arg4077_1, Arg4077_2]);})
  : (((shenjs_is_type(Arg4077_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "if"], Arg4077_0[1])) && (shenjs_is_type(Arg4077_0[2], shen_type_cons) && (shenjs_is_type(Arg4077_0[2][2], shen_type_cons) && (shenjs_is_type(Arg4077_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4077_0[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(js_emit_cond, [[shen_type_cons, [shen_type_cons, Arg4077_0[2][1], [shen_type_cons, Arg4077_0[2][2][1], []]], [shen_type_cons, [shen_type_cons, true, Arg4077_0[2][2][2]], []]], Arg4077_1, Arg4077_2]);})
  : (((shenjs_is_type(Arg4077_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "freeze"], Arg4077_0[1])) && (shenjs_is_type(Arg4077_0[2], shen_type_cons) && shenjs_empty$question$(Arg4077_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["Wrong freeze code!", []]);})
  : (((shenjs_is_type(Arg4077_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mk-freeze"], Arg4077_0[1])) && (shenjs_is_type(Arg4077_0[2], shen_type_cons) && (shenjs_is_type(Arg4077_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4077_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(js_emit_freeze, [Arg4077_0[2][1], Arg4077_0[2][2][1], Arg4077_2]);})
  : (((shenjs_is_type(Arg4077_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-get-arg"], Arg4077_0[1])) && (shenjs_is_type(Arg4077_0[2], shen_type_cons) && shenjs_empty$question$(Arg4077_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(js_emit_get_arg, [Arg4077_0[2][1], Arg4077_2]);})
  : (((shenjs_is_type(Arg4077_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-get-reg"], Arg4077_0[1])) && (shenjs_is_type(Arg4077_0[2], shen_type_cons) && shenjs_empty$question$(Arg4077_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(js_emit_get_reg, [Arg4077_0[2][1], Arg4077_2]);})
  : (((shenjs_is_type(Arg4077_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-set-reg!"], Arg4077_0[1])) && (shenjs_is_type(Arg4077_0[2], shen_type_cons) && (shenjs_is_type(Arg4077_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4077_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(js_emit_set_reg, [Arg4077_0[2][1], Arg4077_0[2][2][1], Arg4077_2]);})
  : (((shenjs_is_type(Arg4077_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mk-func"], Arg4077_0[1])) && (shenjs_is_type(Arg4077_0[2], shen_type_cons) && (shenjs_is_type(Arg4077_0[2][2], shen_type_cons) && (shenjs_is_type(Arg4077_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4077_0[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(js_emit_mk_func, [Arg4077_0[2][1], Arg4077_0[2][2][1], Arg4077_0[2][2][2][1], Arg4077_2]);})
  : (((shenjs_is_type(Arg4077_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mk-closure"], Arg4077_0[1])) && (shenjs_is_type(Arg4077_0[2], shen_type_cons) && (shenjs_is_type(Arg4077_0[2][2], shen_type_cons) && (shenjs_is_type(Arg4077_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4077_0[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(js_emit_mk_closure, [Arg4077_0[2][1], Arg4077_0[2][2][1], Arg4077_0[2][2][2][1], Arg4077_2]);})
  : ((R0 = (new Shenjs_freeze([Arg4077_0, Arg4077_1, Arg4077_2], function(Arg4079) {
  var Arg4079_0 = Arg4079[0], Arg4079_1 = Arg4079[1], Arg4079_2 = Arg4079[2];
  return (function() {
  return (((shenjs_is_type(Arg4079_0, shen_type_cons) && shenjs_is_type(Arg4079_0[1], shen_type_cons)))
  ? ((R3 = shenjs_call(js_js_from_kl_expr, [Arg4079_0[1], false, Arg4079_2])),
  (function() {
  return shenjs_call_tail(js_emit_funcall$asterisk$, [R3, Arg4079_0[2], Arg4079_1, Arg4079_2]);}))
  : ((shenjs_is_type(Arg4079_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(js_emit_funcall, [Arg4079_0[1], Arg4079_0[2], Arg4079_1, Arg4079_2]);})
  : (function() {
  return shenjs_call_tail(js_esc_obj, [Arg4079_0]);})));})}))),
  ((shenjs_is_type(Arg4077_0, shen_type_cons))
  ? ((R1 = shenjs_call(js_std_op, [Arg4077_0[1], Arg4077_0[2], Arg4077_1, Arg4077_2])),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, shen_fail_obj)))
  ? shenjs_thaw(R0)
  : R1))
  : shenjs_thaw(R0)))))))))))))))))))))},
  3,
  [],
  "js-js-from-kl-expr*"];
shenjs_functions["shen_js-js-from-kl-expr*"] = js_js_from_kl_expr$asterisk$;






js_js_from_kl_toplevel_expr = [shen_type_func,
  function shen_user_lambda4082(Arg4081) {
  if (Arg4081.length < 2) return [shen_type_func, shen_user_lambda4082, 2, Arg4081];
  var Arg4081_0 = Arg4081[0], Arg4081_1 = Arg4081[1];
  var R0, R1;
  return (((typeof(Arg4081_0) == 'string'))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A;~%", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg4081_0, false, Arg4081_1]), []]]);})
  : ((R0 = shenjs_call(js_js_from_kl_expr, [Arg4081_0, false, Arg4081_1])),
  (R1 = shenjs_call(js_mk_regs_str, [Arg4081_1])),
  (((shenjs_call(js_context_nregs, [Arg4081_1]) > 0))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["((function() {~%  ~Areturn ~A})());~%", [shen_tuple, R1, [shen_tuple, R0, []]]]);})
  : (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A;", [shen_tuple, R0, []]]);}))))},
  2,
  [],
  "js-js-from-kl-toplevel-expr"];
shenjs_functions["shen_js-js-from-kl-toplevel-expr"] = js_js_from_kl_toplevel_expr;






js_js_from_kl_toplevel = [shen_type_func,
  function shen_user_lambda4084(Arg4083) {
  if (Arg4083.length < 3) return [shen_type_func, shen_user_lambda4084, 3, Arg4083];
  var Arg4083_0 = Arg4083[0], Arg4083_1 = Arg4083[1], Arg4083_2 = Arg4083[2];
  return (((shenjs_is_type(Arg4083_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "set"], Arg4083_0[1])) && (shenjs_is_type(Arg4083_0[2], shen_type_cons) && (shenjs_is_type(Arg4083_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4083_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A;~%", [shen_tuple, shenjs_call(js_emit_set, [Arg4083_0[2][1], Arg4083_0[2][2][1], Arg4083_2]), []]]);})
  : (((shenjs_is_type(Arg4083_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mk-func"], Arg4083_0[1])) && (shenjs_is_type(Arg4083_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg4083_1)) && shenjs_call(js_int_func$question$, [Arg4083_0[2][1]]))))))
  ? ""
  : (((shenjs_is_type(Arg4083_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mk-func"], Arg4083_0[1]))))
  ? (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg4083_0, true, Arg4083_2]);})
  : (function() {
  return shenjs_call_tail(js_js_from_kl_toplevel_expr, [Arg4083_0, Arg4083_2]);}))))},
  3,
  [],
  "js-js-from-kl-toplevel"];
shenjs_functions["shen_js-js-from-kl-toplevel"] = js_js_from_kl_toplevel;






js_js_from_kl_toplevel_forms = [shen_type_func,
  function shen_user_lambda4086(Arg4085) {
  if (Arg4085.length < 4) return [shen_type_func, shen_user_lambda4086, 4, Arg4085];
  var Arg4085_0 = Arg4085[0], Arg4085_1 = Arg4085[1], Arg4085_2 = Arg4085[2], Arg4085_3 = Arg4085[3];
  var R0;
  return ((shenjs_empty$question$(Arg4085_0))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A~%~A~%", [shen_tuple, shenjs_call(js_context_toplevel, [Arg4085_2]), [shen_tuple, Arg4085_3, []]]]);})
  : ((shenjs_is_type(Arg4085_0, shen_type_cons))
  ? ((R0 = shenjs_call(js_js_from_kl_toplevel, [Arg4085_0[1], Arg4085_1, Arg4085_2])),
  (R0 = shenjs_call(shen_intmake_string, ["~A~A~%", [shen_tuple, Arg4085_3, [shen_tuple, R0, []]]])),
  (function() {
  return shenjs_call_tail(js_js_from_kl_toplevel_forms, [Arg4085_0[2], Arg4085_1, Arg4085_2, R0]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-js-from-kl-toplevel-forms"]]);})))},
  4,
  [],
  "js-js-from-kl-toplevel-forms"];
shenjs_functions["shen_js-js-from-kl-toplevel-forms"] = js_js_from_kl_toplevel_forms;






js_js_from_kl$asterisk$ = [shen_type_func,
  function shen_user_lambda4088(Arg4087) {
  if (Arg4087.length < 3) return [shen_type_func, shen_user_lambda4088, 3, Arg4087];
  var Arg4087_0 = Arg4087[0], Arg4087_1 = Arg4087[1], Arg4087_2 = Arg4087[2];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_toplevel, [Arg4087_0, Arg4087_1, Arg4087_2]);})},
  3,
  [],
  "js-js-from-kl*"];
shenjs_functions["shen_js-js-from-kl*"] = js_js_from_kl$asterisk$;






js_from_kl = [shen_type_func,
  function shen_user_lambda4090(Arg4089) {
  if (Arg4089.length < 1) return [shen_type_func, shen_user_lambda4090, 1, Arg4089];
  var Arg4089_0 = Arg4089[0];
  var R0, R1;
  return ((R0 = shenjs_call(js_mk_context, [0, "", shenjs_call(shen_gensym, [[shen_type_symbol, "Arg"]]), [shen_type_symbol, "R"]])),
  (R1 = shenjs_call(reg_kl_walk, [[shen_type_cons, Arg4089_0, []]])),
  (R1 = shenjs_call(js_js_from_kl_toplevel_forms, [R1, (shenjs_globals["shen_js-skip-internals"]), R0, ""])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A~%~A~%", [shen_tuple, shenjs_call(js_context_toplevel, [R0]), [shen_tuple, R1, []]]]);}))},
  1,
  [],
  "js-from-kl"];
shenjs_functions["shen_js-from-kl"] = js_from_kl;






js_js_from_kl_all = [shen_type_func,
  function shen_user_lambda4092(Arg4091) {
  if (Arg4091.length < 1) return [shen_type_func, shen_user_lambda4092, 1, Arg4091];
  var Arg4091_0 = Arg4091[0];
  var R0, R1;
  return ((R0 = shenjs_call(reg_kl_walk, [Arg4091_0])),
  (R1 = shenjs_call(js_mk_context, [0, "", shenjs_call(shen_gensym, [[shen_type_symbol, "Arg"]]), [shen_type_symbol, "R"]])),
  (function() {
  return shenjs_call_tail(js_js_from_kl_toplevel_all, [R0, (shenjs_globals["shen_js-skip-internals"]), R1, ""]);}))},
  1,
  [],
  "js-js-from-kl-all"];
shenjs_functions["shen_js-js-from-kl-all"] = js_js_from_kl_all;






(shenjs_globals["shen_js-skip-internals"] = true);






js_js_write_string = [shen_type_func,
  function shen_user_lambda4095(Arg4094) {
  if (Arg4094.length < 3) return [shen_type_func, shen_user_lambda4095, 3, Arg4094];
  var Arg4094_0 = Arg4094[0], Arg4094_1 = Arg4094[1], Arg4094_2 = Arg4094[2];
  return (function() {
  return shenjs_trap_error(function() {return (shenjs_pr(Arg4094_0[Arg4094_1], Arg4094_2),
  shenjs_call(js_js_write_string, [Arg4094_0, (Arg4094_1 + 1), Arg4094_2]));}, [shen_type_func,
  function shen_user_lambda4097(Arg4096) {
  if (Arg4096.length < 1) return [shen_type_func, shen_user_lambda4097, 1, Arg4096];
  var Arg4096_0 = Arg4096[0];
  return true},
  1,
  []]);})},
  3,
  [],
  "js-js-write-string"];
shenjs_functions["shen_js-js-write-string"] = js_js_write_string;






js_js_dump_exprs_to_file = [shen_type_func,
  function shen_user_lambda4099(Arg4098) {
  if (Arg4098.length < 2) return [shen_type_func, shen_user_lambda4099, 2, Arg4098];
  var Arg4098_0 = Arg4098[0], Arg4098_1 = Arg4098[1];
  return ((shenjs_empty$question$(Arg4098_0))
  ? true
  : ((shenjs_is_type(Arg4098_0, shen_type_cons))
  ? (shenjs_call(js_js_write_string, [shenjs_call(js_from_kl, [Arg4098_0[1]]), 0, Arg4098_1]),
  shenjs_call(js_js_write_string, [shenjs_call(shen_intmake_string, ["~%", []]), 0, Arg4098_1]),
  (function() {
  return shenjs_call_tail(js_js_dump_exprs_to_file, [Arg4098_0[2], Arg4098_1]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-js-dump-exprs-to-file"]]);})))},
  2,
  [],
  "js-js-dump-exprs-to-file"];
shenjs_functions["shen_js-js-dump-exprs-to-file"] = js_js_dump_exprs_to_file;






js_dump_to_file = [shen_type_func,
  function shen_user_lambda4101(Arg4100) {
  if (Arg4100.length < 2) return [shen_type_func, shen_user_lambda4101, 2, Arg4100];
  var Arg4100_0 = Arg4100[0], Arg4100_1 = Arg4100[1];
  var R0;
  return ((R0 = shenjs_open([shen_type_symbol, "file"], Arg4100_1, [shen_type_symbol, "out"])),
  shenjs_call(js_js_dump_exprs_to_file, [Arg4100_0, R0]),
  shenjs_close(R0),
  true)},
  2,
  [],
  "js-dump-to-file"];
shenjs_functions["shen_js-dump-to-file"] = js_dump_to_file;






js_kl_from_shen = [shen_type_func,
  function shen_user_lambda4103(Arg4102) {
  if (Arg4102.length < 1) return [shen_type_func, shen_user_lambda4103, 1, Arg4102];
  var Arg4102_0 = Arg4102[0];
  var R0;
  return ((R0 = shenjs_call(shen_walk, [[shen_type_func,
  function shen_user_lambda4105(Arg4104) {
  if (Arg4104.length < 1) return [shen_type_func, shen_user_lambda4105, 1, Arg4104];
  var Arg4104_0 = Arg4104[0];
  return (function() {
  return shenjs_call_tail(shen_macroexpand, [Arg4104_0]);})},
  1,
  []], Arg4102_0])),
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
  function shen_user_lambda4107(Arg4106) {
  if (Arg4106.length < 3) return [shen_type_func, shen_user_lambda4107, 3, Arg4106];
  var Arg4106_0 = Arg4106[0], Arg4106_1 = Arg4106[1], Arg4106_2 = Arg4106[2];
  var R0, R1, R2;
  return ((R0 = shenjs_call(shen_intmake_string, ["~A~A.js", [shen_tuple, Arg4106_2, [shen_tuple, Arg4106_1, []]]])),
  (R1 = shenjs_call(shen_intmake_string, ["~A~A", [shen_tuple, Arg4106_0, [shen_tuple, Arg4106_1, []]]])),
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
  function shen_user_lambda4111(Arg4110) {
  if (Arg4110.length < 1) return [shen_type_func, shen_user_lambda4111, 1, Arg4110];
  var Arg4110_0 = Arg4110[0];
  return false},
  1,
  []]))
  ? shenjs_call(register_dumper, [[shen_type_symbol, "javascript"], [shen_type_symbol, "all"], [shen_type_symbol, "js-dump"]])
  : [shen_type_symbol, "_"]);





shenjs_repl_split_input_aux = [shen_type_func,
  function shen_user_lambda4117(Arg4116) {
  if (Arg4116.length < 3) return [shen_type_func, shen_user_lambda4117, 3, Arg4116];
  var Arg4116_0 = Arg4116[0], Arg4116_1 = Arg4116[1], Arg4116_2 = Arg4116[2];
  var R0, R1, R2;
  return ((shenjs_empty$question$(Arg4116_0))
  ? Arg4116_2
  : ((shenjs_is_type(Arg4116_0, shen_type_cons))
  ? ((R0 = [shen_type_cons, Arg4116_0[1], Arg4116_1]),
  (R1 = shenjs_call(shen_reverse, [R0])),
  (R2 = shenjs_call(shen_compile, [[shen_type_symbol, "shen-<st_input>"], R1, []])),
  (function() {
  return shenjs_call_tail(shenjs_repl_split_input_aux, [Arg4116_0[2], R0, (((shenjs_unwind_tail(shenjs_$eq$(R2, shen_fail_obj)) || shenjs_empty$question$(R2)))
  ? Arg4116_2
  : [shen_tuple, R1, Arg4116_0[2]])]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "shenjs-repl-split-input-aux"]]);})))},
  3,
  [],
  "shenjs-repl-split-input-aux"];
shenjs_functions["shen_shenjs-repl-split-input-aux"] = shenjs_repl_split_input_aux;






shenjs_repl_split_input = [shen_type_func,
  function shen_user_lambda4119(Arg4118) {
  if (Arg4118.length < 1) return [shen_type_func, shen_user_lambda4119, 1, Arg4118];
  var Arg4118_0 = Arg4118[0];
  return (function() {
  return shenjs_call_tail(shenjs_repl_split_input_aux, [Arg4118_0, [], []]);})},
  1,
  [],
  "shenjs-repl-split-input"];
shenjs_functions["shen_shenjs-repl-split-input"] = shenjs_repl_split_input;












shen_shen_$gt$kl = [shen_type_func,
  function shen_user_lambda4216(Arg4215) {
  if (Arg4215.length < 2) return [shen_type_func, shen_user_lambda4216, 2, Arg4215];
  var Arg4215_0 = Arg4215[0], Arg4215_1 = Arg4215[1];
  return (function() {
  return shenjs_call_tail(shen_compile, [[shen_type_func,
  function shen_user_lambda4218(Arg4217) {
  if (Arg4217.length < 1) return [shen_type_func, shen_user_lambda4218, 1, Arg4217];
  var Arg4217_0 = Arg4217[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$define$gt$, [Arg4217_0]);})},
  1,
  []], [shen_type_cons, Arg4215_0, Arg4215_1], [shen_type_func,
  function shen_user_lambda4220(Arg4219) {
  if (Arg4219.length < 2) return [shen_type_func, shen_user_lambda4220, 2, Arg4219];
  var Arg4219_0 = Arg4219[0], Arg4219_1 = Arg4219[1];
  return (function() {
  return shenjs_call_tail(shen_shen_syntax_error, [Arg4219_0, Arg4219_1]);})},
  2,
  [Arg4215_0]]]);})},
  2,
  [],
  "shen-shen->kl"];
shenjs_functions["shen_shen-shen->kl"] = shen_shen_$gt$kl;






shen_shen_syntax_error = [shen_type_func,
  function shen_user_lambda4222(Arg4221) {
  if (Arg4221.length < 2) return [shen_type_func, shen_user_lambda4222, 2, Arg4221];
  var Arg4221_0 = Arg4221[0], Arg4221_1 = Arg4221[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["syntax error in ~A here:~%~% ~A~%", [shen_tuple, Arg4221_0, [shen_tuple, shenjs_call(shen_next_50, [50, Arg4221_1]), []]]]);})},
  2,
  [],
  "shen-shen-syntax-error"];
shenjs_functions["shen_shen-shen-syntax-error"] = shen_shen_syntax_error;






shen_$lt$define$gt$ = [shen_type_func,
  function shen_user_lambda4224(Arg4223) {
  if (Arg4223.length < 1) return [shen_type_func, shen_user_lambda4224, 1, Arg4223];
  var Arg4223_0 = Arg4223[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$name$gt$, [Arg4223_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$name$gt$, [Arg4223_0])),
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
  function shen_user_lambda4226(Arg4225) {
  if (Arg4225.length < 1) return [shen_type_func, shen_user_lambda4226, 1, Arg4225];
  var Arg4225_0 = Arg4225[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4225_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4225_0])[2], shenjs_call(shen_snd, [Arg4225_0])])]), (((shenjs_is_type(shenjs_call(shen_fst, [Arg4225_0])[1], shen_type_symbol) && (!shenjs_call(shen_sysfunc$question$, [shenjs_call(shen_fst, [Arg4225_0])[1]]))))
  ? shenjs_call(shen_fst, [Arg4225_0])[1]
  : shenjs_call(shen_interror, ["~A is not a legitimate function name.~%", [shen_tuple, shenjs_call(shen_fst, [Arg4225_0])[1], []]]))])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<name>"];
shenjs_functions["shen_shen-<name>"] = shen_$lt$name$gt$;






shen_sysfunc$question$ = [shen_type_func,
  function shen_user_lambda4228(Arg4227) {
  if (Arg4227.length < 1) return [shen_type_func, shen_user_lambda4228, 1, Arg4227];
  var Arg4227_0 = Arg4227[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg4227_0, (shenjs_globals["shen_shen-*system*"])]);})},
  1,
  [],
  "shen-sysfunc?"];
shenjs_functions["shen_shen-sysfunc?"] = shen_sysfunc$question$;






shen_$lt$signature$gt$ = [shen_type_func,
  function shen_user_lambda4230(Arg4229) {
  if (Arg4229.length < 1) return [shen_type_func, shen_user_lambda4230, 1, Arg4229];
  var Arg4229_0 = Arg4229[0];
  var R0;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4229_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "{"], shenjs_call(shen_fst, [Arg4229_0])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$signature_help$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4229_0])[2], shenjs_call(shen_snd, [Arg4229_0])])])),
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
  function shen_user_lambda4232(Arg4231) {
  if (Arg4231.length < 1) return [shen_type_func, shen_user_lambda4232, 1, Arg4231];
  var Arg4231_0 = Arg4231[0];
  return (((shenjs_is_type(Arg4231_0, shen_type_cons) && (shenjs_is_type(Arg4231_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-->"], Arg4231_0[2][1])) && (shenjs_is_type(Arg4231_0[2][2], shen_type_cons) && (shenjs_is_type(Arg4231_0[2][2][2], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-->"], Arg4231_0[2][2][2][1]))))))))
  ? (function() {
  return shenjs_call_tail(shen_curry_type, [[shen_type_cons, Arg4231_0[1], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, Arg4231_0[2][2], []]]]]);})
  : (((shenjs_is_type(Arg4231_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg4231_0[1])) && (shenjs_is_type(Arg4231_0[2], shen_type_cons) && (shenjs_is_type(Arg4231_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4231_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_curry_type, [Arg4231_0[2][1]]), []]]
  : (((shenjs_is_type(Arg4231_0, shen_type_cons) && (shenjs_is_type(Arg4231_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "*"], Arg4231_0[2][1])) && (shenjs_is_type(Arg4231_0[2][2], shen_type_cons) && (shenjs_is_type(Arg4231_0[2][2][2], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "*"], Arg4231_0[2][2][2][1]))))))))
  ? (function() {
  return shenjs_call_tail(shen_curry_type, [[shen_type_cons, Arg4231_0[1], [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, Arg4231_0[2][2], []]]]]);})
  : ((shenjs_is_type(Arg4231_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda4234(Arg4233) {
  if (Arg4233.length < 1) return [shen_type_func, shen_user_lambda4234, 1, Arg4233];
  var Arg4233_0 = Arg4233[0];
  return (function() {
  return shenjs_call_tail(shen_curry_type, [Arg4233_0]);})},
  1,
  []], Arg4231_0]);})
  : Arg4231_0))))},
  1,
  [],
  "shen-curry-type"];
shenjs_functions["shen_shen-curry-type"] = shen_curry_type;






shen_$lt$signature_help$gt$ = [shen_type_func,
  function shen_user_lambda4236(Arg4235) {
  if (Arg4235.length < 1) return [shen_type_func, shen_user_lambda4236, 1, Arg4235];
  var Arg4235_0 = Arg4235[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4235_0]), shen_type_cons))
  ? ((R0 = shenjs_call(shen_$lt$signature_help$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4235_0])[2], shenjs_call(shen_snd, [Arg4235_0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), ((shenjs_call(shen_element$question$, [shenjs_call(shen_fst, [Arg4235_0])[1], [shen_type_cons, [shen_type_symbol, "{"], [shen_type_cons, [shen_type_symbol, "}"], []]]]))
  ? shen_fail_obj
  : [shen_type_cons, shenjs_call(shen_fst, [Arg4235_0])[1], shenjs_call(shen_snd, [R0])])])
  : shen_fail_obj))
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4235_0])),
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
  function shen_user_lambda4238(Arg4237) {
  if (Arg4237.length < 1) return [shen_type_func, shen_user_lambda4238, 1, Arg4237];
  var Arg4237_0 = Arg4237[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$rule$gt$, [Arg4237_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$rules$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$rule$gt$, [Arg4237_0])),
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
  function shen_user_lambda4240(Arg4239) {
  if (Arg4239.length < 1) return [shen_type_func, shen_user_lambda4240, 1, Arg4239];
  var Arg4239_0 = Arg4239[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4239_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4239_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "->"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$action$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R1]), []]]])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4239_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4239_0])),
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
  function shen_user_lambda4242(Arg4241) {
  if (Arg4241.length < 2) return [shen_type_func, shen_user_lambda4242, 2, Arg4241];
  var Arg4241_0 = Arg4241[0], Arg4241_1 = Arg4241[1];
  return ((shenjs_call(Arg4241_0, [Arg4241_1]))
  ? shen_fail_obj
  : Arg4241_1)},
  2,
  [],
  "shen-fail_if"];
shenjs_functions["shen_shen-fail_if"] = shen_fail$_if;






shen_succeeds$question$ = [shen_type_func,
  function shen_user_lambda4244(Arg4243) {
  if (Arg4243.length < 1) return [shen_type_func, shen_user_lambda4244, 1, Arg4243];
  var Arg4243_0 = Arg4243[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4243_0, shen_fail_obj)))
  ? false
  : true)},
  1,
  [],
  "shen-succeeds?"];
shenjs_functions["shen_shen-succeeds?"] = shen_succeeds$question$;






shen_$lt$patterns$gt$ = [shen_type_func,
  function shen_user_lambda4246(Arg4245) {
  if (Arg4245.length < 1) return [shen_type_func, shen_user_lambda4246, 1, Arg4245];
  var Arg4245_0 = Arg4245[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$pattern$gt$, [Arg4245_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$patterns$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4245_0])),
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
  function shen_user_lambda4248(Arg4247) {
  if (Arg4247.length < 1) return [shen_type_func, shen_user_lambda4248, 1, Arg4247];
  var Arg4247_0 = Arg4247[0];
  var R0, R1;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4247_0]), shen_type_cons) && shenjs_is_type(shenjs_call(shen_fst, [Arg4247_0])[1], shen_type_cons)))
  ? shenjs_call(shen_snd_or_fail, [(((shenjs_is_type(shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@p"], shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$pattern1$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$pattern2$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[2], shenjs_call(shen_snd, [Arg4247_0])])]), [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R1]), []]]]])])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4247_0]), shen_type_cons) && shenjs_is_type(shenjs_call(shen_fst, [Arg4247_0])[1], shen_type_cons)))
  ? shenjs_call(shen_snd_or_fail, [(((shenjs_is_type(shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$pattern1$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$pattern2$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[2], shenjs_call(shen_snd, [Arg4247_0])])]), [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R1]), []]]]])])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4247_0]), shen_type_cons) && shenjs_is_type(shenjs_call(shen_fst, [Arg4247_0])[1], shen_type_cons)))
  ? shenjs_call(shen_snd_or_fail, [(((shenjs_is_type(shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@v"], shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$pattern1$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$pattern2$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[2], shenjs_call(shen_snd, [Arg4247_0])])]), [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R1]), []]]]])])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4247_0]), shen_type_cons) && shenjs_is_type(shenjs_call(shen_fst, [Arg4247_0])[1], shen_type_cons)))
  ? shenjs_call(shen_snd_or_fail, [(((shenjs_is_type(shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$pattern1$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$pattern2$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[2], shenjs_call(shen_snd, [Arg4247_0])])]), [shen_type_cons, [shen_type_symbol, "@s"], [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R1]), []]]]])])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4247_0]), shen_type_cons) && shenjs_is_type(shenjs_call(shen_fst, [Arg4247_0])[1], shen_type_cons)))
  ? shenjs_call(shen_snd_or_fail, [(((shenjs_is_type(shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "vector"], shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])[1]))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])])]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(0, shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])])])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[1], shenjs_call(shen_snd, [Arg4247_0])])])])])])]), shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[2], shenjs_call(shen_snd, [Arg4247_0])])]), [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 0, []]]])])
  : shen_fail_obj)
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4247_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4247_0])[2], shenjs_call(shen_snd, [Arg4247_0])])]), ((shenjs_is_type(shenjs_call(shen_fst, [Arg4247_0])[1], shen_type_cons))
  ? shenjs_call(shen_interror, ["~A is not a legitimate constructor~%", [shen_tuple, shenjs_call(shen_fst, [Arg4247_0])[1], []]])
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$simple$_pattern$gt$, [Arg4247_0])),
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
  function shen_user_lambda4250(Arg4249) {
  if (Arg4249.length < 1) return [shen_type_func, shen_user_lambda4250, 1, Arg4249];
  var Arg4249_0 = Arg4249[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4249_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4249_0])[2], shenjs_call(shen_snd, [Arg4249_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4249_0])[1], [shen_type_symbol, "_"])))
  ? shenjs_call(shen_gensym, [[shen_type_symbol, "X"]])
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4249_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4249_0])[2], shenjs_call(shen_snd, [Arg4249_0])])]), ((shenjs_call(shen_element$question$, [shenjs_call(shen_fst, [Arg4249_0])[1], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_symbol, "<-"], []]]]))
  ? shen_fail_obj
  : shenjs_call(shen_fst, [Arg4249_0])[1])])
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
  function shen_user_lambda4252(Arg4251) {
  if (Arg4251.length < 1) return [shen_type_func, shen_user_lambda4252, 1, Arg4251];
  var Arg4251_0 = Arg4251[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$pattern$gt$, [Arg4251_0])),
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
  function shen_user_lambda4254(Arg4253) {
  if (Arg4253.length < 1) return [shen_type_func, shen_user_lambda4254, 1, Arg4253];
  var Arg4253_0 = Arg4253[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$pattern$gt$, [Arg4253_0])),
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
  function shen_user_lambda4256(Arg4255) {
  if (Arg4255.length < 1) return [shen_type_func, shen_user_lambda4256, 1, Arg4255];
  var Arg4255_0 = Arg4255[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4255_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4255_0])[2], shenjs_call(shen_snd, [Arg4255_0])])]), shenjs_call(shen_fst, [Arg4255_0])[1]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<action>"];
shenjs_functions["shen_shen-<action>"] = shen_$lt$action$gt$;






shen_$lt$guard$gt$ = [shen_type_func,
  function shen_user_lambda4258(Arg4257) {
  if (Arg4257.length < 1) return [shen_type_func, shen_user_lambda4258, 1, Arg4257];
  var Arg4257_0 = Arg4257[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4257_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4257_0])[2], shenjs_call(shen_snd, [Arg4257_0])])]), shenjs_call(shen_fst, [Arg4257_0])[1]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<guard>"];
shenjs_functions["shen_shen-<guard>"] = shen_$lt$guard$gt$;






shen_compile$_to$_machine$_code = [shen_type_func,
  function shen_user_lambda4260(Arg4259) {
  if (Arg4259.length < 2) return [shen_type_func, shen_user_lambda4260, 2, Arg4259];
  var Arg4259_0 = Arg4259[0], Arg4259_1 = Arg4259[1];
  var R0;
  return ((R0 = shenjs_call(shen_compile$_to$_lambda$plus$, [Arg4259_0, Arg4259_1])),
  (R0 = shenjs_call(shen_compile$_to$_kl, [Arg4259_0, R0])),
  shenjs_call(shen_record_source, [Arg4259_0, R0]),
  R0)},
  2,
  [],
  "shen-compile_to_machine_code"];
shenjs_functions["shen_shen-compile_to_machine_code"] = shen_compile$_to$_machine$_code;






shen_record_source = [shen_type_func,
  function shen_user_lambda4262(Arg4261) {
  if (Arg4261.length < 2) return [shen_type_func, shen_user_lambda4262, 2, Arg4261];
  var Arg4261_0 = Arg4261[0], Arg4261_1 = Arg4261[1];
  return (((shenjs_globals["shen_shen-*installing-kl*"]))
  ? [shen_type_symbol, "shen-skip"]
  : (function() {
  return shenjs_call_tail(shen_put, [Arg4261_0, [shen_type_symbol, "shen-source"], Arg4261_1, (shenjs_globals["shen_shen-*property-vector*"])]);}))},
  2,
  [],
  "shen-record-source"];
shenjs_functions["shen_shen-record-source"] = shen_record_source;






shen_compile$_to$_lambda$plus$ = [shen_type_func,
  function shen_user_lambda4264(Arg4263) {
  if (Arg4263.length < 2) return [shen_type_func, shen_user_lambda4264, 2, Arg4263];
  var Arg4263_0 = Arg4263[0], Arg4263_1 = Arg4263[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_aritycheck, [Arg4263_0, Arg4263_1])),
  shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4266(Arg4265) {
  if (Arg4265.length < 2) return [shen_type_func, shen_user_lambda4266, 2, Arg4265];
  var Arg4265_0 = Arg4265[0], Arg4265_1 = Arg4265[1];
  return (function() {
  return shenjs_call_tail(shen_free$_variable$_check, [Arg4265_0, Arg4265_1]);})},
  2,
  [Arg4263_0]], Arg4263_1]),
  (R0 = shenjs_call(shen_parameters, [R0])),
  (R1 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4268(Arg4267) {
  if (Arg4267.length < 1) return [shen_type_func, shen_user_lambda4268, 1, Arg4267];
  var Arg4267_0 = Arg4267[0];
  return (function() {
  return shenjs_call_tail(shen_linearise, [Arg4267_0]);})},
  1,
  []], shenjs_call(shen_strip_protect, [Arg4263_1])])),
  (R1 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4270(Arg4269) {
  if (Arg4269.length < 1) return [shen_type_func, shen_user_lambda4270, 1, Arg4269];
  var Arg4269_0 = Arg4269[0];
  return (function() {
  return shenjs_call_tail(shen_abstract$_rule, [Arg4269_0]);})},
  1,
  []], R1])),
  (R1 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4272(Arg4271) {
  if (Arg4271.length < 2) return [shen_type_func, shen_user_lambda4272, 2, Arg4271];
  var Arg4271_0 = Arg4271[0], Arg4271_1 = Arg4271[1];
  return (function() {
  return shenjs_call_tail(shen_application$_build, [Arg4271_0, Arg4271_1]);})},
  2,
  [R0]], R1])),
  [shen_type_cons, R0, [shen_type_cons, R1, []]])},
  2,
  [],
  "shen-compile_to_lambda+"];
shenjs_functions["shen_shen-compile_to_lambda+"] = shen_compile$_to$_lambda$plus$;






shen_free$_variable$_check = [shen_type_func,
  function shen_user_lambda4274(Arg4273) {
  if (Arg4273.length < 2) return [shen_type_func, shen_user_lambda4274, 2, Arg4273];
  var Arg4273_0 = Arg4273[0], Arg4273_1 = Arg4273[1];
  var R0;
  return (((shenjs_is_type(Arg4273_1, shen_type_cons) && (shenjs_is_type(Arg4273_1[2], shen_type_cons) && shenjs_empty$question$(Arg4273_1[2][2]))))
  ? ((R0 = shenjs_call(shen_extract$_vars, [Arg4273_1[1]])),
  (R0 = shenjs_call(shen_extract$_free$_vars, [R0, Arg4273_1[2][1]])),
  (function() {
  return shenjs_call_tail(shen_free$_variable$_warnings, [Arg4273_0, R0]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-free_variable_check"]]);}))},
  2,
  [],
  "shen-free_variable_check"];
shenjs_functions["shen_shen-free_variable_check"] = shen_free$_variable$_check;






shen_extract$_vars = [shen_type_func,
  function shen_user_lambda4276(Arg4275) {
  if (Arg4275.length < 1) return [shen_type_func, shen_user_lambda4276, 1, Arg4275];
  var Arg4275_0 = Arg4275[0];
  return ((shenjs_call(shen_variable$question$, [Arg4275_0]))
  ? [shen_type_cons, Arg4275_0, []]
  : ((shenjs_is_type(Arg4275_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_union, [shenjs_call(shen_extract$_vars, [Arg4275_0[1]]), shenjs_call(shen_extract$_vars, [Arg4275_0[2]])]);})
  : []))},
  1,
  [],
  "shen-extract_vars"];
shenjs_functions["shen_shen-extract_vars"] = shen_extract$_vars;






shen_extract$_free$_vars = [shen_type_func,
  function shen_user_lambda4278(Arg4277) {
  if (Arg4277.length < 2) return [shen_type_func, shen_user_lambda4278, 2, Arg4277];
  var Arg4277_0 = Arg4277[0], Arg4277_1 = Arg4277[1];
  return (((shenjs_is_type(Arg4277_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "protect"], Arg4277_1[1])) && (shenjs_is_type(Arg4277_1[2], shen_type_cons) && shenjs_empty$question$(Arg4277_1[2][2])))))
  ? []
  : (((shenjs_call(shen_variable$question$, [Arg4277_1]) && (!shenjs_call(shen_element$question$, [Arg4277_1, Arg4277_0]))))
  ? [shen_type_cons, Arg4277_1, []]
  : (((shenjs_is_type(Arg4277_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "lambda"], Arg4277_1[1])) && (shenjs_is_type(Arg4277_1[2], shen_type_cons) && (shenjs_is_type(Arg4277_1[2][2], shen_type_cons) && shenjs_empty$question$(Arg4277_1[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_extract$_free$_vars, [[shen_type_cons, Arg4277_1[2][1], Arg4277_0], Arg4277_1[2][2][1]]);})
  : (((shenjs_is_type(Arg4277_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg4277_1[1])) && (shenjs_is_type(Arg4277_1[2], shen_type_cons) && (shenjs_is_type(Arg4277_1[2][2], shen_type_cons) && (shenjs_is_type(Arg4277_1[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4277_1[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(shen_union, [shenjs_call(shen_extract$_free$_vars, [Arg4277_0, Arg4277_1[2][2][1]]), shenjs_call(shen_extract$_free$_vars, [[shen_type_cons, Arg4277_1[2][1], Arg4277_0], Arg4277_1[2][2][2][1]])]);})
  : ((shenjs_is_type(Arg4277_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_union, [shenjs_call(shen_extract$_free$_vars, [Arg4277_0, Arg4277_1[1]]), shenjs_call(shen_extract$_free$_vars, [Arg4277_0, Arg4277_1[2]])]);})
  : [])))))},
  2,
  [],
  "shen-extract_free_vars"];
shenjs_functions["shen_shen-extract_free_vars"] = shen_extract$_free$_vars;






shen_free$_variable$_warnings = [shen_type_func,
  function shen_user_lambda4280(Arg4279) {
  if (Arg4279.length < 2) return [shen_type_func, shen_user_lambda4280, 2, Arg4279];
  var Arg4279_0 = Arg4279[0], Arg4279_1 = Arg4279[1];
  return ((shenjs_empty$question$(Arg4279_1))
  ? [shen_type_symbol, "_"]
  : (function() {
  return shenjs_call_tail(shen_interror, ["error: the following variables are free in ~A: ~A", [shen_tuple, Arg4279_0, [shen_tuple, shenjs_call(shen_list$_variables, [Arg4279_1]), []]]]);}))},
  2,
  [],
  "shen-free_variable_warnings"];
shenjs_functions["shen_shen-free_variable_warnings"] = shen_free$_variable$_warnings;






shen_list$_variables = [shen_type_func,
  function shen_user_lambda4282(Arg4281) {
  if (Arg4281.length < 1) return [shen_type_func, shen_user_lambda4282, 1, Arg4281];
  var Arg4281_0 = Arg4281[0];
  return (((shenjs_is_type(Arg4281_0, shen_type_cons) && shenjs_empty$question$(Arg4281_0[2])))
  ? (shenjs_str(Arg4281_0[1]) + ".")
  : ((shenjs_is_type(Arg4281_0, shen_type_cons))
  ? (shenjs_str(Arg4281_0[1]) + (", " + shenjs_call(shen_list$_variables, [Arg4281_0[2]])))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-list_variables"]]);})))},
  1,
  [],
  "shen-list_variables"];
shenjs_functions["shen_shen-list_variables"] = shen_list$_variables;






shen_strip_protect = [shen_type_func,
  function shen_user_lambda4284(Arg4283) {
  if (Arg4283.length < 1) return [shen_type_func, shen_user_lambda4284, 1, Arg4283];
  var Arg4283_0 = Arg4283[0];
  return (((shenjs_is_type(Arg4283_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "protect"], Arg4283_0[1])) && (shenjs_is_type(Arg4283_0[2], shen_type_cons) && shenjs_empty$question$(Arg4283_0[2][2])))))
  ? Arg4283_0[2][1]
  : ((shenjs_is_type(Arg4283_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_strip_protect, [Arg4283_0[1]]), shenjs_call(shen_strip_protect, [Arg4283_0[2]])]
  : Arg4283_0))},
  1,
  [],
  "shen-strip-protect"];
shenjs_functions["shen_shen-strip-protect"] = shen_strip_protect;






shen_linearise = [shen_type_func,
  function shen_user_lambda4286(Arg4285) {
  if (Arg4285.length < 1) return [shen_type_func, shen_user_lambda4286, 1, Arg4285];
  var Arg4285_0 = Arg4285[0];
  return (((shenjs_is_type(Arg4285_0, shen_type_cons) && (shenjs_is_type(Arg4285_0[2], shen_type_cons) && shenjs_empty$question$(Arg4285_0[2][2]))))
  ? (function() {
  return shenjs_call_tail(shen_linearise$_help, [shenjs_call(shen_flatten, [Arg4285_0[1]]), Arg4285_0[1], Arg4285_0[2][1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-linearise"]]);}))},
  1,
  [],
  "shen-linearise"];
shenjs_functions["shen_shen-linearise"] = shen_linearise;






shen_flatten = [shen_type_func,
  function shen_user_lambda4288(Arg4287) {
  if (Arg4287.length < 1) return [shen_type_func, shen_user_lambda4288, 1, Arg4287];
  var Arg4287_0 = Arg4287[0];
  return ((shenjs_empty$question$(Arg4287_0))
  ? []
  : ((shenjs_is_type(Arg4287_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(shen_flatten, [Arg4287_0[1]]), shenjs_call(shen_flatten, [Arg4287_0[2]])]);})
  : [shen_type_cons, Arg4287_0, []]))},
  1,
  [],
  "shen-flatten"];
shenjs_functions["shen_shen-flatten"] = shen_flatten;






shen_linearise$_help = [shen_type_func,
  function shen_user_lambda4290(Arg4289) {
  if (Arg4289.length < 3) return [shen_type_func, shen_user_lambda4290, 3, Arg4289];
  var Arg4289_0 = Arg4289[0], Arg4289_1 = Arg4289[1], Arg4289_2 = Arg4289[2];
  var R0, R1;
  return ((shenjs_empty$question$(Arg4289_0))
  ? [shen_type_cons, Arg4289_1, [shen_type_cons, Arg4289_2, []]]
  : ((shenjs_is_type(Arg4289_0, shen_type_cons))
  ? (((shenjs_call(shen_variable$question$, [Arg4289_0[1]]) && shenjs_call(shen_element$question$, [Arg4289_0[1], Arg4289_0[2]])))
  ? ((R0 = shenjs_call(shen_gensym, [Arg4289_0[1]])),
  (R1 = [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, Arg4289_0[1], [shen_type_cons, R0, []]]], [shen_type_cons, Arg4289_2, []]]]),
  (R0 = shenjs_call(shen_linearise$_X, [Arg4289_0[1], R0, Arg4289_1])),
  (function() {
  return shenjs_call_tail(shen_linearise$_help, [Arg4289_0[2], R0, R1]);}))
  : (function() {
  return shenjs_call_tail(shen_linearise$_help, [Arg4289_0[2], Arg4289_1, Arg4289_2]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-linearise_help"]]);})))},
  3,
  [],
  "shen-linearise_help"];
shenjs_functions["shen_shen-linearise_help"] = shen_linearise$_help;






shen_linearise$_X = [shen_type_func,
  function shen_user_lambda4292(Arg4291) {
  if (Arg4291.length < 3) return [shen_type_func, shen_user_lambda4292, 3, Arg4291];
  var Arg4291_0 = Arg4291[0], Arg4291_1 = Arg4291[1], Arg4291_2 = Arg4291[2];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4291_2, Arg4291_0)))
  ? Arg4291_1
  : ((shenjs_is_type(Arg4291_2, shen_type_cons))
  ? ((R0 = shenjs_call(shen_linearise$_X, [Arg4291_0, Arg4291_1, Arg4291_2[1]])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, Arg4291_2[1])))
  ? [shen_type_cons, Arg4291_2[1], shenjs_call(shen_linearise$_X, [Arg4291_0, Arg4291_1, Arg4291_2[2]])]
  : [shen_type_cons, R0, Arg4291_2[2]]))
  : Arg4291_2))},
  3,
  [],
  "shen-linearise_X"];
shenjs_functions["shen_shen-linearise_X"] = shen_linearise$_X;






shen_aritycheck = [shen_type_func,
  function shen_user_lambda4294(Arg4293) {
  if (Arg4293.length < 2) return [shen_type_func, shen_user_lambda4294, 2, Arg4293];
  var Arg4293_0 = Arg4293[0], Arg4293_1 = Arg4293[1];
  return (((shenjs_is_type(Arg4293_1, shen_type_cons) && (shenjs_is_type(Arg4293_1[1], shen_type_cons) && (shenjs_is_type(Arg4293_1[1][2], shen_type_cons) && (shenjs_empty$question$(Arg4293_1[1][2][2]) && shenjs_empty$question$(Arg4293_1[2]))))))
  ? (shenjs_call(shen_aritycheck_action, [Arg4293_1[1][2][1]]),
  (function() {
  return shenjs_call_tail(shen_aritycheck_name, [Arg4293_0, shenjs_call(shen_arity, [Arg4293_0]), shenjs_call(shen_length, [Arg4293_1[1][1]])]);}))
  : (((shenjs_is_type(Arg4293_1, shen_type_cons) && (shenjs_is_type(Arg4293_1[1], shen_type_cons) && (shenjs_is_type(Arg4293_1[1][2], shen_type_cons) && (shenjs_empty$question$(Arg4293_1[1][2][2]) && (shenjs_is_type(Arg4293_1[2], shen_type_cons) && (shenjs_is_type(Arg4293_1[2][1], shen_type_cons) && (shenjs_is_type(Arg4293_1[2][1][2], shen_type_cons) && shenjs_empty$question$(Arg4293_1[2][1][2][2])))))))))
  ? ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_length, [Arg4293_1[1][1]]), shenjs_call(shen_length, [Arg4293_1[2][1][1]]))))
  ? (shenjs_call(shen_aritycheck_action, [[shen_type_symbol, "Action"]]),
  (function() {
  return shenjs_call_tail(shen_aritycheck, [Arg4293_0, Arg4293_1[2]]);}))
  : (function() {
  return shenjs_call_tail(shen_interror, ["arity error in ~A~%", [shen_tuple, Arg4293_0, []]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-aritycheck"]]);})))},
  2,
  [],
  "shen-aritycheck"];
shenjs_functions["shen_shen-aritycheck"] = shen_aritycheck;






shen_aritycheck_name = [shen_type_func,
  function shen_user_lambda4296(Arg4295) {
  if (Arg4295.length < 3) return [shen_type_func, shen_user_lambda4296, 3, Arg4295];
  var Arg4295_0 = Arg4295[0], Arg4295_1 = Arg4295[1], Arg4295_2 = Arg4295[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(-1, Arg4295_1)))
  ? Arg4295_2
  : ((shenjs_unwind_tail(shenjs_$eq$(Arg4295_2, Arg4295_1)))
  ? Arg4295_2
  : (shenjs_call(shen_intoutput, ["~%warning: changing the arity of ~A can cause errors.~%", [shen_tuple, Arg4295_0, []]]),
  Arg4295_2)))},
  3,
  [],
  "shen-aritycheck-name"];
shenjs_functions["shen_shen-aritycheck-name"] = shen_aritycheck_name;






shen_aritycheck_action = [shen_type_func,
  function shen_user_lambda4298(Arg4297) {
  if (Arg4297.length < 1) return [shen_type_func, shen_user_lambda4298, 1, Arg4297];
  var Arg4297_0 = Arg4297[0];
  return ((shenjs_is_type(Arg4297_0, shen_type_cons))
  ? (shenjs_call(shen_aah, [Arg4297_0[1], Arg4297_0[2]]),
  (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda4300(Arg4299) {
  if (Arg4299.length < 1) return [shen_type_func, shen_user_lambda4300, 1, Arg4299];
  var Arg4299_0 = Arg4299[0];
  return (function() {
  return shenjs_call_tail(shen_aritycheck_action, [Arg4299_0]);})},
  1,
  []], Arg4297_0]);}))
  : [shen_type_symbol, "shen-skip"])},
  1,
  [],
  "shen-aritycheck-action"];
shenjs_functions["shen_shen-aritycheck-action"] = shen_aritycheck_action;






shen_aah = [shen_type_func,
  function shen_user_lambda4302(Arg4301) {
  if (Arg4301.length < 2) return [shen_type_func, shen_user_lambda4302, 2, Arg4301];
  var Arg4301_0 = Arg4301[0], Arg4301_1 = Arg4301[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_arity, [Arg4301_0])),
  (R1 = shenjs_call(shen_length, [Arg4301_1])),
  ((((R0 > -1) && (R1 > R0)))
  ? (function() {
  return shenjs_call_tail(shen_intoutput, ["warning: ~A might not like ~A argument~A.~%", [shen_tuple, Arg4301_0, [shen_tuple, R1, [shen_tuple, (((R1 > 1))
  ? "s"
  : ""), []]]]]);})
  : [shen_type_symbol, "shen-skip"]))},
  2,
  [],
  "shen-aah"];
shenjs_functions["shen_shen-aah"] = shen_aah;






shen_abstract$_rule = [shen_type_func,
  function shen_user_lambda4304(Arg4303) {
  if (Arg4303.length < 1) return [shen_type_func, shen_user_lambda4304, 1, Arg4303];
  var Arg4303_0 = Arg4303[0];
  return (((shenjs_is_type(Arg4303_0, shen_type_cons) && (shenjs_is_type(Arg4303_0[2], shen_type_cons) && shenjs_empty$question$(Arg4303_0[2][2]))))
  ? (function() {
  return shenjs_call_tail(shen_abstraction$_build, [Arg4303_0[1], Arg4303_0[2][1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-abstract_rule"]]);}))},
  1,
  [],
  "shen-abstract_rule"];
shenjs_functions["shen_shen-abstract_rule"] = shen_abstract$_rule;






shen_abstraction$_build = [shen_type_func,
  function shen_user_lambda4306(Arg4305) {
  if (Arg4305.length < 2) return [shen_type_func, shen_user_lambda4306, 2, Arg4305];
  var Arg4305_0 = Arg4305[0], Arg4305_1 = Arg4305[1];
  return ((shenjs_empty$question$(Arg4305_0))
  ? Arg4305_1
  : ((shenjs_is_type(Arg4305_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg4305_0[1], [shen_type_cons, shenjs_call(shen_abstraction$_build, [Arg4305_0[2], Arg4305_1]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-abstraction_build"]]);})))},
  2,
  [],
  "shen-abstraction_build"];
shenjs_functions["shen_shen-abstraction_build"] = shen_abstraction$_build;






shen_parameters = [shen_type_func,
  function shen_user_lambda4308(Arg4307) {
  if (Arg4307.length < 1) return [shen_type_func, shen_user_lambda4308, 1, Arg4307];
  var Arg4307_0 = Arg4307[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg4307_0)))
  ? []
  : [shen_type_cons, shenjs_call(shen_gensym, [[shen_type_symbol, "V"]]), shenjs_call(shen_parameters, [(Arg4307_0 - 1)])])},
  1,
  [],
  "shen-parameters"];
shenjs_functions["shen_shen-parameters"] = shen_parameters;






shen_application$_build = [shen_type_func,
  function shen_user_lambda4310(Arg4309) {
  if (Arg4309.length < 2) return [shen_type_func, shen_user_lambda4310, 2, Arg4309];
  var Arg4309_0 = Arg4309[0], Arg4309_1 = Arg4309[1];
  return ((shenjs_empty$question$(Arg4309_0))
  ? Arg4309_1
  : ((shenjs_is_type(Arg4309_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_application$_build, [Arg4309_0[2], [shen_type_cons, Arg4309_1, [shen_type_cons, Arg4309_0[1], []]]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-application_build"]]);})))},
  2,
  [],
  "shen-application_build"];
shenjs_functions["shen_shen-application_build"] = shen_application$_build;






shen_compile$_to$_kl = [shen_type_func,
  function shen_user_lambda4312(Arg4311) {
  if (Arg4311.length < 2) return [shen_type_func, shen_user_lambda4312, 2, Arg4311];
  var Arg4311_0 = Arg4311[0], Arg4311_1 = Arg4311[1];
  var R0;
  return (((shenjs_is_type(Arg4311_1, shen_type_cons) && (shenjs_is_type(Arg4311_1[2], shen_type_cons) && shenjs_empty$question$(Arg4311_1[2][2]))))
  ? (shenjs_call(shen_store_arity, [Arg4311_0, shenjs_call(shen_length, [Arg4311_1[1]])]),
  (R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4314(Arg4313) {
  if (Arg4313.length < 1) return [shen_type_func, shen_user_lambda4314, 1, Arg4313];
  var Arg4313_0 = Arg4313[0];
  return (function() {
  return shenjs_call_tail(shen_reduce, [Arg4313_0]);})},
  1,
  []], Arg4311_1[2][1]])),
  (R0 = shenjs_call(shen_cond_expression, [Arg4311_0, Arg4311_1[1], R0])),
  (R0 = [shen_type_cons, [shen_type_symbol, "defun"], [shen_type_cons, Arg4311_0, [shen_type_cons, Arg4311_1[1], [shen_type_cons, R0, []]]]]),
  R0)
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-compile_to_kl"]]);}))},
  2,
  [],
  "shen-compile_to_kl"];
shenjs_functions["shen_shen-compile_to_kl"] = shen_compile$_to$_kl;






shen_store_arity = [shen_type_func,
  function shen_user_lambda4316(Arg4315) {
  if (Arg4315.length < 2) return [shen_type_func, shen_user_lambda4316, 2, Arg4315];
  var Arg4315_0 = Arg4315[0], Arg4315_1 = Arg4315[1];
  return (((shenjs_globals["shen_shen-*installing-kl*"]))
  ? [shen_type_symbol, "shen-skip"]
  : (function() {
  return shenjs_call_tail(shen_put, [Arg4315_0, [shen_type_symbol, "arity"], Arg4315_1, (shenjs_globals["shen_shen-*property-vector*"])]);}))},
  2,
  [],
  "shen-store-arity"];
shenjs_functions["shen_shen-store-arity"] = shen_store_arity;






shen_reduce = [shen_type_func,
  function shen_user_lambda4318(Arg4317) {
  if (Arg4317.length < 1) return [shen_type_func, shen_user_lambda4318, 1, Arg4317];
  var Arg4317_0 = Arg4317[0];
  var R0;
  return ((shenjs_globals["shen_shen-*teststack*"] = []),
  (R0 = shenjs_call(shen_reduce$_help, [Arg4317_0])),
  [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-tests"], shenjs_call(shen_reverse, [(shenjs_globals["shen_shen-*teststack*"])])], [shen_type_cons, R0, []]])},
  1,
  [],
  "shen-reduce"];
shenjs_functions["shen_shen-reduce"] = shen_reduce;






shen_reduce$_help = [shen_type_func,
  function shen_user_lambda4320(Arg4319) {
  if (Arg4319.length < 1) return [shen_type_func, shen_user_lambda4320, 1, Arg4319];
  var Arg4319_0 = Arg4319[0];
  var R0;
  return (((shenjs_is_type(Arg4319_0, shen_type_cons) && (shenjs_is_type(Arg4319_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4319_0[1][1])) && (shenjs_is_type(Arg4319_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4319_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg4319_0[1][2][1][1])) && (shenjs_is_type(Arg4319_0[1][2][1][2], shen_type_cons) && (shenjs_is_type(Arg4319_0[1][2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4319_0[1][2][1][2][2][2]) && (shenjs_is_type(Arg4319_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4319_0[1][2][2][2]) && (shenjs_is_type(Arg4319_0[2], shen_type_cons) && shenjs_empty$question$(Arg4319_0[2][2]))))))))))))))
  ? (shenjs_call(shen_add$_test, [[shen_type_cons, [shen_type_symbol, "cons?"], Arg4319_0[2]]]),
  (R0 = [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg4319_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg4319_0[1][2][1][2][2][1], [shen_type_cons, shenjs_call(shen_ebr, [Arg4319_0[2][1], Arg4319_0[1][2][1], Arg4319_0[1][2][2][1]]), []]]], []]]]),
  (R0 = [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hd"], Arg4319_0[2]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tl"], Arg4319_0[2]], []]]),
  (function() {
  return shenjs_call_tail(shen_reduce$_help, [R0]);}))
  : (((shenjs_is_type(Arg4319_0, shen_type_cons) && (shenjs_is_type(Arg4319_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4319_0[1][1])) && (shenjs_is_type(Arg4319_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4319_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@p"], Arg4319_0[1][2][1][1])) && (shenjs_is_type(Arg4319_0[1][2][1][2], shen_type_cons) && (shenjs_is_type(Arg4319_0[1][2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4319_0[1][2][1][2][2][2]) && (shenjs_is_type(Arg4319_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4319_0[1][2][2][2]) && (shenjs_is_type(Arg4319_0[2], shen_type_cons) && shenjs_empty$question$(Arg4319_0[2][2]))))))))))))))
  ? (shenjs_call(shen_add$_test, [[shen_type_cons, [shen_type_symbol, "tuple?"], Arg4319_0[2]]]),
  (R0 = [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg4319_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg4319_0[1][2][1][2][2][1], [shen_type_cons, shenjs_call(shen_ebr, [Arg4319_0[2][1], Arg4319_0[1][2][1], Arg4319_0[1][2][2][1]]), []]]], []]]]),
  (R0 = [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], Arg4319_0[2]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "snd"], Arg4319_0[2]], []]]),
  (function() {
  return shenjs_call_tail(shen_reduce$_help, [R0]);}))
  : (((shenjs_is_type(Arg4319_0, shen_type_cons) && (shenjs_is_type(Arg4319_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4319_0[1][1])) && (shenjs_is_type(Arg4319_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4319_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@v"], Arg4319_0[1][2][1][1])) && (shenjs_is_type(Arg4319_0[1][2][1][2], shen_type_cons) && (shenjs_is_type(Arg4319_0[1][2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4319_0[1][2][1][2][2][2]) && (shenjs_is_type(Arg4319_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4319_0[1][2][2][2]) && (shenjs_is_type(Arg4319_0[2], shen_type_cons) && shenjs_empty$question$(Arg4319_0[2][2]))))))))))))))
  ? (shenjs_call(shen_add$_test, [[shen_type_cons, [shen_type_symbol, "shen-+vector?"], Arg4319_0[2]]]),
  (R0 = [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg4319_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg4319_0[1][2][1][2][2][1], [shen_type_cons, shenjs_call(shen_ebr, [Arg4319_0[2][1], Arg4319_0[1][2][1], Arg4319_0[1][2][2][1]]), []]]], []]]]),
  (R0 = [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hdv"], Arg4319_0[2]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tlv"], Arg4319_0[2]], []]]),
  (function() {
  return shenjs_call_tail(shen_reduce$_help, [R0]);}))
  : (((shenjs_is_type(Arg4319_0, shen_type_cons) && (shenjs_is_type(Arg4319_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4319_0[1][1])) && (shenjs_is_type(Arg4319_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4319_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], Arg4319_0[1][2][1][1])) && (shenjs_is_type(Arg4319_0[1][2][1][2], shen_type_cons) && (shenjs_is_type(Arg4319_0[1][2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4319_0[1][2][1][2][2][2]) && (shenjs_is_type(Arg4319_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4319_0[1][2][2][2]) && (shenjs_is_type(Arg4319_0[2], shen_type_cons) && shenjs_empty$question$(Arg4319_0[2][2]))))))))))))))
  ? (shenjs_call(shen_add$_test, [[shen_type_cons, [shen_type_symbol, "shen-+string?"], Arg4319_0[2]]]),
  (R0 = [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg4319_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg4319_0[1][2][1][2][2][1], [shen_type_cons, shenjs_call(shen_ebr, [Arg4319_0[2][1], Arg4319_0[1][2][1], Arg4319_0[1][2][2][1]]), []]]], []]]]),
  (R0 = [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "pos"], [shen_type_cons, Arg4319_0[2][1], [shen_type_cons, 0, []]]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tlstr"], Arg4319_0[2]], []]]),
  (function() {
  return shenjs_call_tail(shen_reduce$_help, [R0]);}))
  : (((shenjs_is_type(Arg4319_0, shen_type_cons) && (shenjs_is_type(Arg4319_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4319_0[1][1])) && (shenjs_is_type(Arg4319_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4319_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4319_0[1][2][2][2]) && (shenjs_is_type(Arg4319_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4319_0[2][2]) && (!shenjs_call(shen_variable$question$, [Arg4319_0[1][2][1]])))))))))))
  ? (shenjs_call(shen_add$_test, [[shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, Arg4319_0[1][2][1], Arg4319_0[2]]]]),
  (function() {
  return shenjs_call_tail(shen_reduce$_help, [Arg4319_0[1][2][2][1]]);}))
  : (((shenjs_is_type(Arg4319_0, shen_type_cons) && (shenjs_is_type(Arg4319_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4319_0[1][1])) && (shenjs_is_type(Arg4319_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4319_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4319_0[1][2][2][2]) && (shenjs_is_type(Arg4319_0[2], shen_type_cons) && shenjs_empty$question$(Arg4319_0[2][2])))))))))
  ? (function() {
  return shenjs_call_tail(shen_reduce$_help, [shenjs_call(shen_ebr, [Arg4319_0[2][1], Arg4319_0[1][2][1], Arg4319_0[1][2][2][1]])]);})
  : (((shenjs_is_type(Arg4319_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "where"], Arg4319_0[1])) && (shenjs_is_type(Arg4319_0[2], shen_type_cons) && (shenjs_is_type(Arg4319_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4319_0[2][2][2]))))))
  ? (shenjs_call(shen_add$_test, [Arg4319_0[2][1]]),
  (function() {
  return shenjs_call_tail(shen_reduce$_help, [Arg4319_0[2][2][1]]);}))
  : (((shenjs_is_type(Arg4319_0, shen_type_cons) && (shenjs_is_type(Arg4319_0[2], shen_type_cons) && shenjs_empty$question$(Arg4319_0[2][2]))))
  ? ((R0 = shenjs_call(shen_reduce$_help, [Arg4319_0[1]])),
  ((shenjs_unwind_tail(shenjs_$eq$(Arg4319_0[1], R0)))
  ? Arg4319_0
  : (function() {
  return shenjs_call_tail(shen_reduce$_help, [[shen_type_cons, R0, Arg4319_0[2]]]);})))
  : Arg4319_0))))))))},
  1,
  [],
  "shen-reduce_help"];
shenjs_functions["shen_shen-reduce_help"] = shen_reduce$_help;






shen_$plus$string$question$ = [shen_type_func,
  function shen_user_lambda4322(Arg4321) {
  if (Arg4321.length < 1) return [shen_type_func, shen_user_lambda4322, 1, Arg4321];
  var Arg4321_0 = Arg4321[0];
  return ((shenjs_unwind_tail(shenjs_$eq$("", Arg4321_0)))
  ? false
  : (typeof(Arg4321_0) == 'string'))},
  1,
  [],
  "shen-+string?"];
shenjs_functions["shen_shen-+string?"] = shen_$plus$string$question$;






shen_$plus$vector = [shen_type_func,
  function shen_user_lambda4324(Arg4323) {
  if (Arg4323.length < 1) return [shen_type_func, shen_user_lambda4324, 1, Arg4323];
  var Arg4323_0 = Arg4323[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4323_0, shenjs_vector(0))))
  ? false
  : (function() {
  return shenjs_vector$question$(Arg4323_0);}))},
  1,
  [],
  "shen-+vector"];
shenjs_functions["shen_shen-+vector"] = shen_$plus$vector;






shen_ebr = [shen_type_func,
  function shen_user_lambda4326(Arg4325) {
  if (Arg4325.length < 3) return [shen_type_func, shen_user_lambda4326, 3, Arg4325];
  var Arg4325_0 = Arg4325[0], Arg4325_1 = Arg4325[1], Arg4325_2 = Arg4325[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4325_2, Arg4325_1)))
  ? Arg4325_0
  : (((shenjs_is_type(Arg4325_2, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4325_2[1])) && (shenjs_is_type(Arg4325_2[2], shen_type_cons) && (shenjs_is_type(Arg4325_2[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4325_2[2][2][2]) && (shenjs_call(shen_occurrences, [Arg4325_1, Arg4325_2[2][1]]) > 0)))))))
  ? Arg4325_2
  : (((shenjs_is_type(Arg4325_2, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg4325_2[1])) && (shenjs_is_type(Arg4325_2[2], shen_type_cons) && (shenjs_is_type(Arg4325_2[2][2], shen_type_cons) && (shenjs_is_type(Arg4325_2[2][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4325_2[2][2][2][2]) && shenjs_unwind_tail(shenjs_$eq$(Arg4325_2[2][1], Arg4325_1)))))))))
  ? [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, Arg4325_2[2][1], [shen_type_cons, shenjs_call(shen_ebr, [Arg4325_0, Arg4325_2[2][1], Arg4325_2[2][2][1]]), Arg4325_2[2][2][2]]]]
  : ((shenjs_is_type(Arg4325_2, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_ebr, [Arg4325_0, Arg4325_1, Arg4325_2[1]]), shenjs_call(shen_ebr, [Arg4325_0, Arg4325_1, Arg4325_2[2]])]
  : Arg4325_2))))},
  3,
  [],
  "shen-ebr"];
shenjs_functions["shen_shen-ebr"] = shen_ebr;






shen_add$_test = [shen_type_func,
  function shen_user_lambda4328(Arg4327) {
  if (Arg4327.length < 1) return [shen_type_func, shen_user_lambda4328, 1, Arg4327];
  var Arg4327_0 = Arg4327[0];
  return (shenjs_globals["shen_shen-*teststack*"] = [shen_type_cons, Arg4327_0, (shenjs_globals["shen_shen-*teststack*"])])},
  1,
  [],
  "shen-add_test"];
shenjs_functions["shen_shen-add_test"] = shen_add$_test;






shen_cond_expression = [shen_type_func,
  function shen_user_lambda4330(Arg4329) {
  if (Arg4329.length < 3) return [shen_type_func, shen_user_lambda4330, 3, Arg4329];
  var Arg4329_0 = Arg4329[0], Arg4329_1 = Arg4329[1], Arg4329_2 = Arg4329[2];
  var R0;
  return ((R0 = shenjs_call(shen_err_condition, [Arg4329_0])),
  (R0 = shenjs_call(shen_case_form, [Arg4329_2, R0])),
  (R0 = shenjs_call(shen_encode_choices, [R0, Arg4329_0])),
  (function() {
  return shenjs_call_tail(shen_cond_form, [R0]);}))},
  3,
  [],
  "shen-cond-expression"];
shenjs_functions["shen_shen-cond-expression"] = shen_cond_expression;






shen_cond_form = [shen_type_func,
  function shen_user_lambda4332(Arg4331) {
  if (Arg4331.length < 1) return [shen_type_func, shen_user_lambda4332, 1, Arg4331];
  var Arg4331_0 = Arg4331[0];
  return (((shenjs_is_type(Arg4331_0, shen_type_cons) && (shenjs_is_type(Arg4331_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg4331_0[1][1])) && (shenjs_is_type(Arg4331_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg4331_0[1][2][2]))))))
  ? Arg4331_0[1][2][1]
  : [shen_type_cons, [shen_type_symbol, "cond"], Arg4331_0])},
  1,
  [],
  "shen-cond-form"];
shenjs_functions["shen_shen-cond-form"] = shen_cond_form;






shen_encode_choices = [shen_type_func,
  function shen_user_lambda4334(Arg4333) {
  if (Arg4333.length < 2) return [shen_type_func, shen_user_lambda4334, 2, Arg4333];
  var Arg4333_0 = Arg4333[0], Arg4333_1 = Arg4333[1];
  return ((shenjs_empty$question$(Arg4333_0))
  ? []
  : (((shenjs_is_type(Arg4333_0, shen_type_cons) && (shenjs_is_type(Arg4333_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg4333_0[1][1])) && (shenjs_is_type(Arg4333_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4333_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-choicepoint!"], Arg4333_0[1][2][1][1])) && (shenjs_is_type(Arg4333_0[1][2][1][2], shen_type_cons) && (shenjs_empty$question$(Arg4333_0[1][2][1][2][2]) && (shenjs_empty$question$(Arg4333_0[1][2][2]) && shenjs_empty$question$(Arg4333_0[2])))))))))))
  ? [shen_type_cons, [shen_type_cons, true, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg4333_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]]], [shen_type_cons, (((shenjs_globals["shen_shen-*installing-kl*"]))
  ? [shen_type_cons, [shen_type_symbol, "shen-sys-error"], [shen_type_cons, Arg4333_1, []]]
  : [shen_type_cons, [shen_type_symbol, "shen-f_error"], [shen_type_cons, Arg4333_1, []]]), [shen_type_cons, [shen_type_symbol, "Result"], []]]]], []]]]], []]], []]
  : (((shenjs_is_type(Arg4333_0, shen_type_cons) && (shenjs_is_type(Arg4333_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg4333_0[1][1])) && (shenjs_is_type(Arg4333_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4333_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-choicepoint!"], Arg4333_0[1][2][1][1])) && (shenjs_is_type(Arg4333_0[1][2][1][2], shen_type_cons) && (shenjs_empty$question$(Arg4333_0[1][2][1][2][2]) && shenjs_empty$question$(Arg4333_0[1][2][2]))))))))))
  ? [shen_type_cons, [shen_type_cons, true, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg4333_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]]], [shen_type_cons, shenjs_call(shen_cond_form, [shenjs_call(shen_encode_choices, [Arg4333_0[2], Arg4333_1])]), [shen_type_cons, [shen_type_symbol, "Result"], []]]]], []]]]], []]], []]
  : (((shenjs_is_type(Arg4333_0, shen_type_cons) && (shenjs_is_type(Arg4333_0[1], shen_type_cons) && (shenjs_is_type(Arg4333_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4333_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-choicepoint!"], Arg4333_0[1][2][1][1])) && (shenjs_is_type(Arg4333_0[1][2][1][2], shen_type_cons) && (shenjs_empty$question$(Arg4333_0[1][2][1][2][2]) && shenjs_empty$question$(Arg4333_0[1][2][2])))))))))
  ? [shen_type_cons, [shen_type_cons, true, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Freeze"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "freeze"], [shen_type_cons, shenjs_call(shen_cond_form, [shenjs_call(shen_encode_choices, [Arg4333_0[2], Arg4333_1])]), []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, Arg4333_0[1][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg4333_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, [shen_type_symbol, "Freeze"], []]], [shen_type_cons, [shen_type_symbol, "Result"], []]]]], []]]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, [shen_type_symbol, "Freeze"], []]], []]]]], []]]]], []]], []]
  : (((shenjs_is_type(Arg4333_0, shen_type_cons) && (shenjs_is_type(Arg4333_0[1], shen_type_cons) && (shenjs_is_type(Arg4333_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg4333_0[1][2][2])))))
  ? [shen_type_cons, Arg4333_0[1], shenjs_call(shen_encode_choices, [Arg4333_0[2], Arg4333_1])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-encode-choices"]]);}))))))},
  2,
  [],
  "shen-encode-choices"];
shenjs_functions["shen_shen-encode-choices"] = shen_encode_choices;






shen_case_form = [shen_type_func,
  function shen_user_lambda4336(Arg4335) {
  if (Arg4335.length < 2) return [shen_type_func, shen_user_lambda4336, 2, Arg4335];
  var Arg4335_0 = Arg4335[0], Arg4335_1 = Arg4335[1];
  return ((shenjs_empty$question$(Arg4335_0))
  ? [shen_type_cons, Arg4335_1, []]
  : (((shenjs_is_type(Arg4335_0, shen_type_cons) && (shenjs_is_type(Arg4335_0[1], shen_type_cons) && (shenjs_is_type(Arg4335_0[1][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-tests"], Arg4335_0[1][1][1])) && (shenjs_empty$question$(Arg4335_0[1][1][2]) && (shenjs_is_type(Arg4335_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4335_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-choicepoint!"], Arg4335_0[1][2][1][1])) && (shenjs_is_type(Arg4335_0[1][2][1][2], shen_type_cons) && (shenjs_empty$question$(Arg4335_0[1][2][1][2][2]) && shenjs_empty$question$(Arg4335_0[1][2][2]))))))))))))
  ? [shen_type_cons, [shen_type_cons, true, Arg4335_0[1][2]], shenjs_call(shen_case_form, [Arg4335_0[2], Arg4335_1])]
  : (((shenjs_is_type(Arg4335_0, shen_type_cons) && (shenjs_is_type(Arg4335_0[1], shen_type_cons) && (shenjs_is_type(Arg4335_0[1][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-tests"], Arg4335_0[1][1][1])) && (shenjs_empty$question$(Arg4335_0[1][1][2]) && (shenjs_is_type(Arg4335_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg4335_0[1][2][2]))))))))
  ? [shen_type_cons, [shen_type_cons, true, Arg4335_0[1][2]], []]
  : (((shenjs_is_type(Arg4335_0, shen_type_cons) && (shenjs_is_type(Arg4335_0[1], shen_type_cons) && (shenjs_is_type(Arg4335_0[1][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-tests"], Arg4335_0[1][1][1])) && (shenjs_is_type(Arg4335_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg4335_0[1][2][2])))))))
  ? [shen_type_cons, [shen_type_cons, shenjs_call(shen_embed_and, [Arg4335_0[1][1][2]]), Arg4335_0[1][2]], shenjs_call(shen_case_form, [Arg4335_0[2], Arg4335_1])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-case-form"]]);})))))},
  2,
  [],
  "shen-case-form"];
shenjs_functions["shen_shen-case-form"] = shen_case_form;






shen_embed_and = [shen_type_func,
  function shen_user_lambda4338(Arg4337) {
  if (Arg4337.length < 1) return [shen_type_func, shen_user_lambda4338, 1, Arg4337];
  var Arg4337_0 = Arg4337[0];
  return (((shenjs_is_type(Arg4337_0, shen_type_cons) && shenjs_empty$question$(Arg4337_0[2])))
  ? Arg4337_0[1]
  : ((shenjs_is_type(Arg4337_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, Arg4337_0[1], [shen_type_cons, shenjs_call(shen_embed_and, [Arg4337_0[2]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-embed-and"]]);})))},
  1,
  [],
  "shen-embed-and"];
shenjs_functions["shen_shen-embed-and"] = shen_embed_and;






shen_err_condition = [shen_type_func,
  function shen_user_lambda4340(Arg4339) {
  if (Arg4339.length < 1) return [shen_type_func, shen_user_lambda4340, 1, Arg4339];
  var Arg4339_0 = Arg4339[0];
  return (((shenjs_globals["shen_shen-*installing-kl*"]))
  ? [shen_type_cons, true, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-sys-error"], [shen_type_cons, Arg4339_0, []]], []]]
  : [shen_type_cons, true, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-f_error"], [shen_type_cons, Arg4339_0, []]], []]])},
  1,
  [],
  "shen-err-condition"];
shenjs_functions["shen_shen-err-condition"] = shen_err_condition;






shen_sys_error = [shen_type_func,
  function shen_user_lambda4342(Arg4341) {
  if (Arg4341.length < 1) return [shen_type_func, shen_user_lambda4342, 1, Arg4341];
  var Arg4341_0 = Arg4341[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["system function ~A: unexpected argument~%", [shen_tuple, Arg4341_0, []]]);})},
  1,
  [],
  "shen-sys-error"];
shenjs_functions["shen_shen-sys-error"] = shen_sys_error;


















shen_eval = [shen_type_func,
  function shen_user_lambda5055(Arg5054) {
  if (Arg5054.length < 1) return [shen_type_func, shen_user_lambda5055, 1, Arg5054];
  var Arg5054_0 = Arg5054[0];
  var R0;
  return ((R0 = shenjs_call(shen_walk, [[shen_type_func,
  function shen_user_lambda5057(Arg5056) {
  if (Arg5056.length < 1) return [shen_type_func, shen_user_lambda5057, 1, Arg5056];
  var Arg5056_0 = Arg5056[0];
  return (function() {
  return shenjs_call_tail(shen_macroexpand, [Arg5056_0]);})},
  1,
  []], Arg5054_0])),
  ((shenjs_call(shen_packaged$question$, [R0]))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda5059(Arg5058) {
  if (Arg5058.length < 1) return [shen_type_func, shen_user_lambda5059, 1, Arg5058];
  var Arg5058_0 = Arg5058[0];
  return (function() {
  return shenjs_call_tail(shen_eval_without_macros, [Arg5058_0]);})},
  1,
  []], shenjs_call(shen_package_contents, [R0])]);})
  : (function() {
  return shenjs_call_tail(shen_eval_without_macros, [R0]);})))},
  1,
  [],
  "eval"];
shenjs_functions["shen_eval"] = shen_eval;






shen_eval_without_macros = [shen_type_func,
  function shen_user_lambda5061(Arg5060) {
  if (Arg5060.length < 1) return [shen_type_func, shen_user_lambda5061, 1, Arg5060];
  var Arg5060_0 = Arg5060[0];
  return (function() {
  return shenjs_eval_kl(shenjs_call(shen_elim_define, [shenjs_call(shen_proc_input$plus$, [Arg5060_0])]));})},
  1,
  [],
  "shen-eval-without-macros"];
shenjs_functions["shen_shen-eval-without-macros"] = shen_eval_without_macros;






shen_proc_input$plus$ = [shen_type_func,
  function shen_user_lambda5063(Arg5062) {
  if (Arg5062.length < 1) return [shen_type_func, shen_user_lambda5063, 1, Arg5062];
  var Arg5062_0 = Arg5062[0];
  return (((shenjs_is_type(Arg5062_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "input+"], Arg5062_0[1])) && (shenjs_is_type(Arg5062_0[2], shen_type_cons) && (shenjs_is_type(Arg5062_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg5062_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "input+"], [shen_type_cons, Arg5062_0[2][1], [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg5062_0[2][2][1]]), []]]]
  : ((shenjs_is_type(Arg5062_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda5065(Arg5064) {
  if (Arg5064.length < 1) return [shen_type_func, shen_user_lambda5065, 1, Arg5064];
  var Arg5064_0 = Arg5064[0];
  return (function() {
  return shenjs_call_tail(shen_proc_input$plus$, [Arg5064_0]);})},
  1,
  []], Arg5062_0]);})
  : Arg5062_0))},
  1,
  [],
  "shen-proc-input+"];
shenjs_functions["shen_shen-proc-input+"] = shen_proc_input$plus$;






shen_elim_define = [shen_type_func,
  function shen_user_lambda5067(Arg5066) {
  if (Arg5066.length < 1) return [shen_type_func, shen_user_lambda5067, 1, Arg5066];
  var Arg5066_0 = Arg5066[0];
  return (((shenjs_is_type(Arg5066_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "define"], Arg5066_0[1])) && shenjs_is_type(Arg5066_0[2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_shen_$gt$kl, [Arg5066_0[2][1], Arg5066_0[2][2]]);})
  : ((shenjs_is_type(Arg5066_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda5069(Arg5068) {
  if (Arg5068.length < 1) return [shen_type_func, shen_user_lambda5069, 1, Arg5068];
  var Arg5068_0 = Arg5068[0];
  return (function() {
  return shenjs_call_tail(shen_elim_define, [Arg5068_0]);})},
  1,
  []], Arg5066_0]);})
  : Arg5066_0))},
  1,
  [],
  "shen-elim-define"];
shenjs_functions["shen_shen-elim-define"] = shen_elim_define;






shen_packaged$question$ = [shen_type_func,
  function shen_user_lambda5071(Arg5070) {
  if (Arg5070.length < 1) return [shen_type_func, shen_user_lambda5071, 1, Arg5070];
  var Arg5070_0 = Arg5070[0];
  return (((shenjs_is_type(Arg5070_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg5070_0[1])) && (shenjs_is_type(Arg5070_0[2], shen_type_cons) && shenjs_is_type(Arg5070_0[2][2], shen_type_cons)))))
  ? true
  : false)},
  1,
  [],
  "shen-packaged?"];
shenjs_functions["shen_shen-packaged?"] = shen_packaged$question$;






shen_external = [shen_type_func,
  function shen_user_lambda5073(Arg5072) {
  if (Arg5072.length < 1) return [shen_type_func, shen_user_lambda5073, 1, Arg5072];
  var Arg5072_0 = Arg5072[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg5072_0, [shen_type_symbol, "shen-external-symbols"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda5075(Arg5074) {
  if (Arg5074.length < 1) return [shen_type_func, shen_user_lambda5075, 1, Arg5074];
  var Arg5074_0 = Arg5074[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["package ~A has not been used.~", []]);})},
  1,
  []]);})},
  1,
  [],
  "external"];
shenjs_functions["shen_external"] = shen_external;






shen_package_contents = [shen_type_func,
  function shen_user_lambda5077(Arg5076) {
  if (Arg5076.length < 1) return [shen_type_func, shen_user_lambda5077, 1, Arg5076];
  var Arg5076_0 = Arg5076[0];
  return (((shenjs_is_type(Arg5076_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg5076_0[1])) && (shenjs_is_type(Arg5076_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "null"], Arg5076_0[2][1])) && shenjs_is_type(Arg5076_0[2][2], shen_type_cons))))))
  ? Arg5076_0[2][2][2]
  : (((shenjs_is_type(Arg5076_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg5076_0[1])) && (shenjs_is_type(Arg5076_0[2], shen_type_cons) && shenjs_is_type(Arg5076_0[2][2], shen_type_cons)))))
  ? (function() {
  return shenjs_call_tail(shen_packageh, [Arg5076_0[2][1], Arg5076_0[2][2][1], [shen_type_symbol, "Code"]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-package-contents"]]);})))},
  1,
  [],
  "shen-package-contents"];
shenjs_functions["shen_shen-package-contents"] = shen_package_contents;






shen_walk = [shen_type_func,
  function shen_user_lambda5079(Arg5078) {
  if (Arg5078.length < 2) return [shen_type_func, shen_user_lambda5079, 2, Arg5078];
  var Arg5078_0 = Arg5078[0], Arg5078_1 = Arg5078[1];
  return ((shenjs_is_type(Arg5078_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(Arg5078_0, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5081(Arg5080) {
  if (Arg5080.length < 2) return [shen_type_func, shen_user_lambda5081, 2, Arg5080];
  var Arg5080_0 = Arg5080[0], Arg5080_1 = Arg5080[1];
  return (function() {
  return shenjs_call_tail(shen_walk, [Arg5080_0, Arg5080_1]);})},
  2,
  [Arg5078_0]], Arg5078_1])]);})
  : (function() {
  return shenjs_call_tail(Arg5078_0, [Arg5078_1]);}))},
  2,
  [],
  "shen-walk"];
shenjs_functions["shen_shen-walk"] = shen_walk;






shen_compile = [shen_type_func,
  function shen_user_lambda5083(Arg5082) {
  if (Arg5082.length < 3) return [shen_type_func, shen_user_lambda5083, 3, Arg5082];
  var Arg5082_0 = Arg5082[0], Arg5082_1 = Arg5082[1], Arg5082_2 = Arg5082[2];
  var R0;
  return ((R0 = shenjs_call(Arg5082_0, [[shen_tuple, Arg5082_1, []]])),
  (((shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0)) || (!shenjs_empty$question$(shenjs_call(shen_fst, [R0])))))
  ? (function() {
  return shenjs_call_tail(shen_compile_error, [R0, Arg5082_2]);})
  : (function() {
  return shenjs_call_tail(shen_snd, [R0]);})))},
  3,
  [],
  "compile"];
shenjs_functions["shen_compile"] = shen_compile;






shen_compile_error = [shen_type_func,
  function shen_user_lambda5085(Arg5084) {
  if (Arg5084.length < 2) return [shen_type_func, shen_user_lambda5085, 2, Arg5084];
  var Arg5084_0 = Arg5084[0], Arg5084_1 = Arg5084[1];
  return ((shenjs_empty$question$(Arg5084_1))
  ? shen_fail_obj
  : (((shenjs_is_type(Arg5084_0, shen_tuple) && shenjs_is_type(shenjs_call(shen_fst, [Arg5084_0]), shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(Arg5084_1, [shenjs_call(shen_fst, [Arg5084_0])]);})
  : (function() {
  return shenjs_call_tail(shen_interror, ["syntax error~%", []]);})))},
  2,
  [],
  "shen-compile-error"];
shenjs_functions["shen_shen-compile-error"] = shen_compile_error;






shen_$lt$e$gt$ = [shen_type_func,
  function shen_user_lambda5087(Arg5086) {
  if (Arg5086.length < 1) return [shen_type_func, shen_user_lambda5087, 1, Arg5086];
  var Arg5086_0 = Arg5086[0];
  return ((shenjs_is_type(Arg5086_0, shen_tuple))
  ? [shen_tuple, shenjs_call(shen_fst, [Arg5086_0]), []]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "<e>"]]);}))},
  1,
  [],
  "<e>"];
shenjs_functions["shen_<e>"] = shen_$lt$e$gt$;






shen_fail_if = [shen_type_func,
  function shen_user_lambda5089(Arg5088) {
  if (Arg5088.length < 2) return [shen_type_func, shen_user_lambda5089, 2, Arg5088];
  var Arg5088_0 = Arg5088[0], Arg5088_1 = Arg5088[1];
  return ((shenjs_call(Arg5088_0, [Arg5088_1]))
  ? shen_fail_obj
  : Arg5088_1)},
  2,
  [],
  "fail-if"];
shenjs_functions["shen_fail-if"] = shen_fail_if;






shen_$at$s = [shen_type_func,
  function shen_user_lambda5091(Arg5090) {
  if (Arg5090.length < 2) return [shen_type_func, shen_user_lambda5091, 2, Arg5090];
  var Arg5090_0 = Arg5090[0], Arg5090_1 = Arg5090[1];
  return (Arg5090_0 + Arg5090_1)},
  2,
  [],
  "@s"];
shenjs_functions["shen_@s"] = shen_$at$s;






shen_tc$question$ = [shen_type_func,
  function shen_user_lambda5093(Arg5092) {
  if (Arg5092.length < 1) return [shen_type_func, shen_user_lambda5093, 1, Arg5092];
  var Arg5092_0 = Arg5092[0];
  return (shenjs_globals["shen_shen-*tc*"])},
  1,
  [],
  "tc?"];
shenjs_functions["shen_tc?"] = shen_tc$question$;






shen_ps = [shen_type_func,
  function shen_user_lambda5095(Arg5094) {
  if (Arg5094.length < 1) return [shen_type_func, shen_user_lambda5095, 1, Arg5094];
  var Arg5094_0 = Arg5094[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg5094_0, [shen_type_symbol, "shen-source"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda5097(Arg5096) {
  if (Arg5096.length < 2) return [shen_type_func, shen_user_lambda5097, 2, Arg5096];
  var Arg5096_0 = Arg5096[0], Arg5096_1 = Arg5096[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["~A not found.~%", [shen_tuple, Arg5096_0, []]]);})},
  2,
  [Arg5094_0]]);})},
  1,
  [],
  "ps"];
shenjs_functions["shen_ps"] = shen_ps;






shen_explode = [shen_type_func,
  function shen_user_lambda5099(Arg5098) {
  if (Arg5098.length < 1) return [shen_type_func, shen_user_lambda5099, 1, Arg5098];
  var Arg5098_0 = Arg5098[0];
  return (((typeof(Arg5098_0) == 'string'))
  ? (function() {
  return shenjs_call_tail(shen_explode_string, [Arg5098_0]);})
  : (function() {
  return shenjs_call_tail(shen_explode, [shenjs_call(shen_intmake_string, ["~A", [shen_tuple, Arg5098_0, []]])]);}))},
  1,
  [],
  "explode"];
shenjs_functions["shen_explode"] = shen_explode;






shen_explode_string = [shen_type_func,
  function shen_user_lambda5101(Arg5100) {
  if (Arg5100.length < 1) return [shen_type_func, shen_user_lambda5101, 1, Arg5100];
  var Arg5100_0 = Arg5100[0];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$("", Arg5100_0)))
  ? []
  : ((R0 = Arg5100_0[0]),
  (R1 = shenjs_tlstr(Arg5100_0)),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, [shen_type_symbol, "shen-eos"])))
  ? []
  : [shen_type_cons, R0, shenjs_call(shen_explode_string, [R1])])))},
  1,
  [],
  "shen-explode-string"];
shenjs_functions["shen_shen-explode-string"] = shen_explode_string;






shen_stinput = [shen_type_func,
  function shen_user_lambda5103(Arg5102) {
  if (Arg5102.length < 1) return [shen_type_func, shen_user_lambda5103, 1, Arg5102];
  var Arg5102_0 = Arg5102[0];
  return (shenjs_globals["shen_*stinput*"])},
  1,
  [],
  "stinput"];
shenjs_functions["shen_stinput"] = shen_stinput;






shen_$plus$vector$question$ = [shen_type_func,
  function shen_user_lambda5105(Arg5104) {
  if (Arg5104.length < 1) return [shen_type_func, shen_user_lambda5105, 1, Arg5104];
  var Arg5104_0 = Arg5104[0];
  return (shenjs_absvector$question$(Arg5104_0) && (shenjs_absvector_ref(Arg5104_0, 0) > 0))},
  1,
  [],
  "shen-+vector?"];
shenjs_functions["shen_shen-+vector?"] = shen_$plus$vector$question$;












shen_fillvector = [shen_type_func,
  function shen_user_lambda5108(Arg5107) {
  if (Arg5107.length < 4) return [shen_type_func, shen_user_lambda5108, 4, Arg5107];
  var Arg5107_0 = Arg5107[0], Arg5107_1 = Arg5107[1], Arg5107_2 = Arg5107[2], Arg5107_3 = Arg5107[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5107_2, Arg5107_1)))
  ? shenjs_absvector_set(Arg5107_0, Arg5107_2, Arg5107_3)
  : (function() {
  return shenjs_call_tail(shen_fillvector, [shenjs_absvector_set(Arg5107_0, Arg5107_1, Arg5107_3), (1 + Arg5107_1), Arg5107_2, Arg5107_3]);}))},
  4,
  [],
  "shen-fillvector"];
shenjs_functions["shen_shen-fillvector"] = shen_fillvector;












shen_vector_$gt$ = [shen_type_func,
  function shen_user_lambda5111(Arg5110) {
  if (Arg5110.length < 3) return [shen_type_func, shen_user_lambda5111, 3, Arg5110];
  var Arg5110_0 = Arg5110[0], Arg5110_1 = Arg5110[1], Arg5110_2 = Arg5110[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5110_1, 0)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["cannot access 0th element of a vector~%", []]);})
  : shenjs_absvector_set(Arg5110_0, Arg5110_1, Arg5110_2))},
  3,
  [],
  "vector->"];
shenjs_functions["shen_vector->"] = shen_vector_$gt$;






shen_$lt$_vector = [shen_type_func,
  function shen_user_lambda5113(Arg5112) {
  if (Arg5112.length < 2) return [shen_type_func, shen_user_lambda5113, 2, Arg5112];
  var Arg5112_0 = Arg5112[0], Arg5112_1 = Arg5112[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5112_1, 0)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["cannot access 0th element of a vector~%", []]);})
  : ((R0 = shenjs_absvector_ref(Arg5112_0, Arg5112_1)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["vector element not found~%", []]);})
  : R0)))},
  2,
  [],
  "<-vector"];
shenjs_functions["shen_<-vector"] = shen_$lt$_vector;






shen_posint$question$ = [shen_type_func,
  function shen_user_lambda5115(Arg5114) {
  if (Arg5114.length < 1) return [shen_type_func, shen_user_lambda5115, 1, Arg5114];
  var Arg5114_0 = Arg5114[0];
  return (shenjs_call(shen_integer$question$, [Arg5114_0]) && (Arg5114_0 >= 0))},
  1,
  [],
  "shen-posint?"];
shenjs_functions["shen_shen-posint?"] = shen_posint$question$;






shen_limit = [shen_type_func,
  function shen_user_lambda5117(Arg5116) {
  if (Arg5116.length < 1) return [shen_type_func, shen_user_lambda5117, 1, Arg5116];
  var Arg5116_0 = Arg5116[0];
  return shenjs_absvector_ref(Arg5116_0, 0)},
  1,
  [],
  "limit"];
shenjs_functions["shen_limit"] = shen_limit;












shen_variable$question$ = [shen_type_func,
  function shen_user_lambda5120(Arg5119) {
  if (Arg5119.length < 1) return [shen_type_func, shen_user_lambda5120, 1, Arg5119];
  var Arg5119_0 = Arg5119[0];
  var R0;
  return (function() {
  return shenjs_trap_error(function() {return ((R0 = shenjs_str(Arg5119_0)),
  (R0 = R0[0]),
  shenjs_call(shen_element$question$, [R0, [shen_type_cons, "A", [shen_type_cons, "B", [shen_type_cons, "C", [shen_type_cons, "D", [shen_type_cons, "E", [shen_type_cons, "F", [shen_type_cons, "G", [shen_type_cons, "H", [shen_type_cons, "I", [shen_type_cons, "J", [shen_type_cons, "K", [shen_type_cons, "L", [shen_type_cons, "M", [shen_type_cons, "N", [shen_type_cons, "O", [shen_type_cons, "P", [shen_type_cons, "Q", [shen_type_cons, "R", [shen_type_cons, "S", [shen_type_cons, "T", [shen_type_cons, "U", [shen_type_cons, "V", [shen_type_cons, "W", [shen_type_cons, "X", [shen_type_cons, "Y", [shen_type_cons, "Z", []]]]]]]]]]]]]]]]]]]]]]]]]]]]));}, [shen_type_func,
  function shen_user_lambda5122(Arg5121) {
  if (Arg5121.length < 1) return [shen_type_func, shen_user_lambda5122, 1, Arg5121];
  var Arg5121_0 = Arg5121[0];
  return false},
  1,
  []]);})},
  1,
  [],
  "variable?"];
shenjs_functions["shen_variable?"] = shen_variable$question$;






shen_gensym = [shen_type_func,
  function shen_user_lambda5124(Arg5123) {
  if (Arg5123.length < 1) return [shen_type_func, shen_user_lambda5124, 1, Arg5123];
  var Arg5123_0 = Arg5123[0];
  return (function() {
  return shenjs_call_tail(shen_concat, [Arg5123_0, (shenjs_globals["shen_shen-*gensym*"] = (1 + (shenjs_globals["shen_shen-*gensym*"])))]);})},
  1,
  [],
  "gensym"];
shenjs_functions["shen_gensym"] = shen_gensym;






shen_concat = [shen_type_func,
  function shen_user_lambda5126(Arg5125) {
  if (Arg5125.length < 2) return [shen_type_func, shen_user_lambda5126, 2, Arg5125];
  var Arg5125_0 = Arg5125[0], Arg5125_1 = Arg5125[1];
  return (function() {
  return shenjs_intern((shenjs_str(Arg5125_0) + shenjs_str(Arg5125_1)));})},
  2,
  [],
  "concat"];
shenjs_functions["shen_concat"] = shen_concat;












shen_fst = [shen_type_func,
  function shen_user_lambda5129(Arg5128) {
  if (Arg5128.length < 1) return [shen_type_func, shen_user_lambda5129, 1, Arg5128];
  var Arg5128_0 = Arg5128[0];
  return shenjs_absvector_ref(Arg5128_0, 1)},
  1,
  [],
  "fst"];
shenjs_functions["shen_fst"] = shen_fst;






shen_snd = [shen_type_func,
  function shen_user_lambda5131(Arg5130) {
  if (Arg5130.length < 1) return [shen_type_func, shen_user_lambda5131, 1, Arg5130];
  var Arg5130_0 = Arg5130[0];
  return shenjs_absvector_ref(Arg5130_0, 2)},
  1,
  [],
  "snd"];
shenjs_functions["shen_snd"] = shen_snd;






shen_tuple$question$ = [shen_type_func,
  function shen_user_lambda5133(Arg5132) {
  if (Arg5132.length < 1) return [shen_type_func, shen_user_lambda5133, 1, Arg5132];
  var Arg5132_0 = Arg5132[0];
  return (function() {
  return shenjs_trap_error(function() {return (shenjs_absvector$question$(Arg5132_0) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-tuple"], shenjs_absvector_ref(Arg5132_0, 0))));}, [shen_type_func,
  function shen_user_lambda5135(Arg5134) {
  if (Arg5134.length < 1) return [shen_type_func, shen_user_lambda5135, 1, Arg5134];
  var Arg5134_0 = Arg5134[0];
  return false},
  1,
  []]);})},
  1,
  [],
  "tuple?"];
shenjs_functions["shen_tuple?"] = shen_tuple$question$;






shen_append = [shen_type_func,
  function shen_user_lambda5137(Arg5136) {
  if (Arg5136.length < 2) return [shen_type_func, shen_user_lambda5137, 2, Arg5136];
  var Arg5136_0 = Arg5136[0], Arg5136_1 = Arg5136[1];
  return ((shenjs_empty$question$(Arg5136_0))
  ? Arg5136_1
  : ((shenjs_is_type(Arg5136_0, shen_type_cons))
  ? [shen_type_cons, Arg5136_0[1], shenjs_call(shen_append, [Arg5136_0[2], Arg5136_1])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "append"]]);})))},
  2,
  [],
  "append"];
shenjs_functions["shen_append"] = shen_append;






shen_$at$v = [shen_type_func,
  function shen_user_lambda5139(Arg5138) {
  if (Arg5138.length < 2) return [shen_type_func, shen_user_lambda5139, 2, Arg5138];
  var Arg5138_0 = Arg5138[0], Arg5138_1 = Arg5138[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_limit, [Arg5138_1])),
  (R1 = shenjs_vector((R0 + 1))),
  (R1 = shenjs_call(shen_vector_$gt$, [R1, 1, Arg5138_0])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, 0)))
  ? R1
  : (function() {
  return shenjs_call_tail(shen_$at$v_help, [Arg5138_1, 1, R0, R1]);})))},
  2,
  [],
  "@v"];
shenjs_functions["shen_@v"] = shen_$at$v;






shen_$at$v_help = [shen_type_func,
  function shen_user_lambda5141(Arg5140) {
  if (Arg5140.length < 4) return [shen_type_func, shen_user_lambda5141, 4, Arg5140];
  var Arg5140_0 = Arg5140[0], Arg5140_1 = Arg5140[1], Arg5140_2 = Arg5140[2], Arg5140_3 = Arg5140[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5140_2, Arg5140_1)))
  ? (function() {
  return shenjs_call_tail(shen_copyfromvector, [Arg5140_0, Arg5140_3, Arg5140_2, (Arg5140_2 + 1)]);})
  : (function() {
  return shenjs_call_tail(shen_$at$v_help, [Arg5140_0, (Arg5140_1 + 1), Arg5140_2, shenjs_call(shen_copyfromvector, [Arg5140_0, Arg5140_3, Arg5140_1, (Arg5140_1 + 1)])]);}))},
  4,
  [],
  "shen-@v-help"];
shenjs_functions["shen_shen-@v-help"] = shen_$at$v_help;






shen_copyfromvector = [shen_type_func,
  function shen_user_lambda5143(Arg5142) {
  if (Arg5142.length < 4) return [shen_type_func, shen_user_lambda5143, 4, Arg5142];
  var Arg5142_0 = Arg5142[0], Arg5142_1 = Arg5142[1], Arg5142_2 = Arg5142[2], Arg5142_3 = Arg5142[3];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_vector_$gt$, [Arg5142_1, Arg5142_3, shenjs_call(shen_$lt$_vector, [Arg5142_0, Arg5142_2])]);}, [shen_type_func,
  function shen_user_lambda5145(Arg5144) {
  if (Arg5144.length < 2) return [shen_type_func, shen_user_lambda5145, 2, Arg5144];
  var Arg5144_0 = Arg5144[0], Arg5144_1 = Arg5144[1];
  return Arg5144_0},
  2,
  [Arg5142_1]]);})},
  4,
  [],
  "shen-copyfromvector"];
shenjs_functions["shen_shen-copyfromvector"] = shen_copyfromvector;






shen_hdv = [shen_type_func,
  function shen_user_lambda5147(Arg5146) {
  if (Arg5146.length < 1) return [shen_type_func, shen_user_lambda5147, 1, Arg5146];
  var Arg5146_0 = Arg5146[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_$lt$_vector, [Arg5146_0, 1]);}, [shen_type_func,
  function shen_user_lambda5149(Arg5148) {
  if (Arg5148.length < 2) return [shen_type_func, shen_user_lambda5149, 2, Arg5148];
  var Arg5148_0 = Arg5148[0], Arg5148_1 = Arg5148[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["hdv needs a non-empty vector as an argument; not ~S~%", [shen_tuple, Arg5148_0, []]]);})},
  2,
  [Arg5146_0]]);})},
  1,
  [],
  "hdv"];
shenjs_functions["shen_hdv"] = shen_hdv;






shen_tlv = [shen_type_func,
  function shen_user_lambda5151(Arg5150) {
  if (Arg5150.length < 1) return [shen_type_func, shen_user_lambda5151, 1, Arg5150];
  var Arg5150_0 = Arg5150[0];
  var R0;
  return ((R0 = shenjs_call(shen_limit, [Arg5150_0])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, 0)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["cannot take the tail of the empty vector~%", []]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(R0, 1)))
  ? (function() {
  return shenjs_vector(0);})
  : (shenjs_vector((R0 - 1)),
  (function() {
  return shenjs_call_tail(shen_tlv_help, [Arg5150_0, 2, R0, shenjs_vector((R0 - 1))]);})))))},
  1,
  [],
  "tlv"];
shenjs_functions["shen_tlv"] = shen_tlv;






shen_tlv_help = [shen_type_func,
  function shen_user_lambda5153(Arg5152) {
  if (Arg5152.length < 4) return [shen_type_func, shen_user_lambda5153, 4, Arg5152];
  var Arg5152_0 = Arg5152[0], Arg5152_1 = Arg5152[1], Arg5152_2 = Arg5152[2], Arg5152_3 = Arg5152[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5152_2, Arg5152_1)))
  ? (function() {
  return shenjs_call_tail(shen_copyfromvector, [Arg5152_0, Arg5152_3, Arg5152_2, (Arg5152_2 - 1)]);})
  : (function() {
  return shenjs_call_tail(shen_tlv_help, [Arg5152_0, (Arg5152_1 + 1), Arg5152_2, shenjs_call(shen_copyfromvector, [Arg5152_0, Arg5152_3, Arg5152_1, (Arg5152_1 - 1)])]);}))},
  4,
  [],
  "shen-tlv-help"];
shenjs_functions["shen_shen-tlv-help"] = shen_tlv_help;






shen_assoc = [shen_type_func,
  function shen_user_lambda5155(Arg5154) {
  if (Arg5154.length < 2) return [shen_type_func, shen_user_lambda5155, 2, Arg5154];
  var Arg5154_0 = Arg5154[0], Arg5154_1 = Arg5154[1];
  return ((shenjs_empty$question$(Arg5154_1))
  ? []
  : (((shenjs_is_type(Arg5154_1, shen_type_cons) && (shenjs_is_type(Arg5154_1[1], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5154_1[1][1], Arg5154_0)))))
  ? Arg5154_1[1]
  : ((shenjs_is_type(Arg5154_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_assoc, [Arg5154_0, Arg5154_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "assoc"]]);}))))},
  2,
  [],
  "assoc"];
shenjs_functions["shen_assoc"] = shen_assoc;






shen_boolean$question$ = [shen_type_func,
  function shen_user_lambda5157(Arg5156) {
  if (Arg5156.length < 1) return [shen_type_func, shen_user_lambda5157, 1, Arg5156];
  var Arg5156_0 = Arg5156[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg5156_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg5156_0)))
  ? true
  : false))},
  1,
  [],
  "boolean?"];
shenjs_functions["shen_boolean?"] = shen_boolean$question$;






shen_nl = [shen_type_func,
  function shen_user_lambda5159(Arg5158) {
  if (Arg5158.length < 1) return [shen_type_func, shen_user_lambda5159, 1, Arg5158];
  var Arg5158_0 = Arg5158[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg5158_0)))
  ? 0
  : (shenjs_call(shen_intoutput, ["~%", []]),
  (function() {
  return shenjs_call_tail(shen_nl, [(Arg5158_0 - 1)]);})))},
  1,
  [],
  "nl"];
shenjs_functions["shen_nl"] = shen_nl;






shen_difference = [shen_type_func,
  function shen_user_lambda5161(Arg5160) {
  if (Arg5160.length < 2) return [shen_type_func, shen_user_lambda5161, 2, Arg5160];
  var Arg5160_0 = Arg5160[0], Arg5160_1 = Arg5160[1];
  return ((shenjs_empty$question$(Arg5160_0))
  ? []
  : ((shenjs_is_type(Arg5160_0, shen_type_cons))
  ? ((shenjs_call(shen_element$question$, [Arg5160_0[1], Arg5160_1]))
  ? (function() {
  return shenjs_call_tail(shen_difference, [Arg5160_0[2], Arg5160_1]);})
  : [shen_type_cons, Arg5160_0[1], shenjs_call(shen_difference, [Arg5160_0[2], Arg5160_1])])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "difference"]]);})))},
  2,
  [],
  "difference"];
shenjs_functions["shen_difference"] = shen_difference;






shen_do = [shen_type_func,
  function shen_user_lambda5163(Arg5162) {
  if (Arg5162.length < 2) return [shen_type_func, shen_user_lambda5163, 2, Arg5162];
  var Arg5162_0 = Arg5162[0], Arg5162_1 = Arg5162[1];
  return Arg5162_1},
  2,
  [],
  "do"];
shenjs_functions["shen_do"] = shen_do;






shen_element$question$ = [shen_type_func,
  function shen_user_lambda5165(Arg5164) {
  if (Arg5164.length < 2) return [shen_type_func, shen_user_lambda5165, 2, Arg5164];
  var Arg5164_0 = Arg5164[0], Arg5164_1 = Arg5164[1];
  return ((shenjs_empty$question$(Arg5164_1))
  ? false
  : (((shenjs_is_type(Arg5164_1, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5164_1[1], Arg5164_0))))
  ? true
  : ((shenjs_is_type(Arg5164_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5164_0, Arg5164_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "element?"]]);}))))},
  2,
  [],
  "element?"];
shenjs_functions["shen_element?"] = shen_element$question$;












shen_fix = [shen_type_func,
  function shen_user_lambda5168(Arg5167) {
  if (Arg5167.length < 2) return [shen_type_func, shen_user_lambda5168, 2, Arg5167];
  var Arg5167_0 = Arg5167[0], Arg5167_1 = Arg5167[1];
  return (function() {
  return shenjs_call_tail(shen_fix_help, [Arg5167_0, Arg5167_1, shenjs_call(Arg5167_0, [Arg5167_1])]);})},
  2,
  [],
  "fix"];
shenjs_functions["shen_fix"] = shen_fix;






shen_fix_help = [shen_type_func,
  function shen_user_lambda5170(Arg5169) {
  if (Arg5169.length < 3) return [shen_type_func, shen_user_lambda5170, 3, Arg5169];
  var Arg5169_0 = Arg5169[0], Arg5169_1 = Arg5169[1], Arg5169_2 = Arg5169[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5169_2, Arg5169_1)))
  ? Arg5169_2
  : (function() {
  return shenjs_call_tail(shen_fix_help, [Arg5169_0, Arg5169_2, shenjs_call(Arg5169_0, [Arg5169_2])]);}))},
  3,
  [],
  "shen-fix-help"];
shenjs_functions["shen_shen-fix-help"] = shen_fix_help;






shen_put = [shen_type_func,
  function shen_user_lambda5172(Arg5171) {
  if (Arg5171.length < 4) return [shen_type_func, shen_user_lambda5172, 4, Arg5171];
  var Arg5171_0 = Arg5171[0], Arg5171_1 = Arg5171[1], Arg5171_2 = Arg5171[2], Arg5171_3 = Arg5171[3];
  var R0, R1;
  return ((R0 = shenjs_call(shen_hash, [Arg5171_0, shenjs_call(shen_limit, [Arg5171_3])])),
  (R1 = shenjs_trap_error(function() {return shenjs_call(shen_$lt$_vector, [Arg5171_3, R0]);}, [shen_type_func,
  function shen_user_lambda5174(Arg5173) {
  if (Arg5173.length < 1) return [shen_type_func, shen_user_lambda5174, 1, Arg5173];
  var Arg5173_0 = Arg5173[0];
  return []},
  1,
  []])),
  shenjs_call(shen_vector_$gt$, [Arg5171_3, R0, shenjs_call(shen_change_pointer_value, [Arg5171_0, Arg5171_1, Arg5171_2, R1])]),
  Arg5171_2)},
  4,
  [],
  "put"];
shenjs_functions["shen_put"] = shen_put;






shen_change_pointer_value = [shen_type_func,
  function shen_user_lambda5176(Arg5175) {
  if (Arg5175.length < 4) return [shen_type_func, shen_user_lambda5176, 4, Arg5175];
  var Arg5175_0 = Arg5175[0], Arg5175_1 = Arg5175[1], Arg5175_2 = Arg5175[2], Arg5175_3 = Arg5175[3];
  return ((shenjs_empty$question$(Arg5175_3))
  ? [shen_type_cons, [shen_type_cons, [shen_type_cons, Arg5175_0, [shen_type_cons, Arg5175_1, []]], Arg5175_2], []]
  : (((shenjs_is_type(Arg5175_3, shen_type_cons) && (shenjs_is_type(Arg5175_3[1], shen_type_cons) && (shenjs_is_type(Arg5175_3[1][1], shen_type_cons) && (shenjs_is_type(Arg5175_3[1][1][2], shen_type_cons) && (shenjs_empty$question$(Arg5175_3[1][1][2][2]) && (shenjs_unwind_tail(shenjs_$eq$(Arg5175_3[1][1][2][1], Arg5175_1)) && shenjs_unwind_tail(shenjs_$eq$(Arg5175_3[1][1][1], Arg5175_0)))))))))
  ? [shen_type_cons, [shen_type_cons, Arg5175_3[1][1], Arg5175_2], Arg5175_3[2]]
  : ((shenjs_is_type(Arg5175_3, shen_type_cons))
  ? [shen_type_cons, Arg5175_3[1], shenjs_call(shen_change_pointer_value, [Arg5175_0, Arg5175_1, Arg5175_2, Arg5175_3[2]])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-change-pointer-value"]]);}))))},
  4,
  [],
  "shen-change-pointer-value"];
shenjs_functions["shen_shen-change-pointer-value"] = shen_change_pointer_value;






shen_get = [shen_type_func,
  function shen_user_lambda5178(Arg5177) {
  if (Arg5177.length < 3) return [shen_type_func, shen_user_lambda5178, 3, Arg5177];
  var Arg5177_0 = Arg5177[0], Arg5177_1 = Arg5177[1], Arg5177_2 = Arg5177[2];
  var R0;
  return ((R0 = shenjs_call(shen_hash, [Arg5177_0, shenjs_call(shen_limit, [Arg5177_2])])),
  (R0 = shenjs_trap_error(function() {return shenjs_call(shen_$lt$_vector, [Arg5177_2, R0]);}, [shen_type_func,
  function shen_user_lambda5180(Arg5179) {
  if (Arg5179.length < 1) return [shen_type_func, shen_user_lambda5180, 1, Arg5179];
  var Arg5179_0 = Arg5179[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["pointer not found~%", []]);})},
  1,
  []])),
  (R0 = shenjs_call(shen_assoc, [[shen_type_cons, Arg5177_0, [shen_type_cons, Arg5177_1, []]], R0])),
  ((shenjs_empty$question$(R0))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["value not found~%", []]);})
  : R0[2]))},
  3,
  [],
  "get"];
shenjs_functions["shen_get"] = shen_get;






shen_hash = [shen_type_func,
  function shen_user_lambda5182(Arg5181) {
  if (Arg5181.length < 2) return [shen_type_func, shen_user_lambda5182, 2, Arg5181];
  var Arg5181_0 = Arg5181[0], Arg5181_1 = Arg5181[1];
  var R0;
  return ((R0 = shenjs_call(shen_mod, [shenjs_call(shen_sum, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5184(Arg5183) {
  if (Arg5183.length < 1) return [shen_type_func, shen_user_lambda5184, 1, Arg5183];
  var Arg5183_0 = Arg5183[0];
  return (function() {
  return shenjs_string_$gt$n(Arg5183_0);})},
  1,
  []], shenjs_call(shen_explode, [Arg5181_0])])]), Arg5181_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(0, R0)))
  ? 1
  : R0))},
  2,
  [],
  "hash"];
shenjs_functions["shen_hash"] = shen_hash;






shen_mod = [shen_type_func,
  function shen_user_lambda5186(Arg5185) {
  if (Arg5185.length < 2) return [shen_type_func, shen_user_lambda5186, 2, Arg5185];
  var Arg5185_0 = Arg5185[0], Arg5185_1 = Arg5185[1];
  return (function() {
  return shenjs_call_tail(shen_modh, [Arg5185_0, shenjs_call(shen_multiples, [Arg5185_0, [shen_type_cons, Arg5185_1, []]])]);})},
  2,
  [],
  "shen-mod"];
shenjs_functions["shen_shen-mod"] = shen_mod;






shen_multiples = [shen_type_func,
  function shen_user_lambda5188(Arg5187) {
  if (Arg5187.length < 2) return [shen_type_func, shen_user_lambda5188, 2, Arg5187];
  var Arg5187_0 = Arg5187[0], Arg5187_1 = Arg5187[1];
  return (((shenjs_is_type(Arg5187_1, shen_type_cons) && (Arg5187_1[1] > Arg5187_0)))
  ? Arg5187_1[2]
  : ((shenjs_is_type(Arg5187_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_multiples, [Arg5187_0, [shen_type_cons, (2 * Arg5187_1[1]), Arg5187_1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-multiples"]]);})))},
  2,
  [],
  "shen-multiples"];
shenjs_functions["shen_shen-multiples"] = shen_multiples;






shen_modh = [shen_type_func,
  function shen_user_lambda5190(Arg5189) {
  if (Arg5189.length < 2) return [shen_type_func, shen_user_lambda5190, 2, Arg5189];
  var Arg5189_0 = Arg5189[0], Arg5189_1 = Arg5189[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg5189_0)))
  ? 0
  : ((shenjs_empty$question$(Arg5189_1))
  ? Arg5189_0
  : (((shenjs_is_type(Arg5189_1, shen_type_cons) && (Arg5189_1[1] > Arg5189_0)))
  ? ((shenjs_empty$question$(Arg5189_1[2]))
  ? Arg5189_0
  : (function() {
  return shenjs_call_tail(shen_modh, [Arg5189_0, Arg5189_1[2]]);}))
  : ((shenjs_is_type(Arg5189_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_modh, [(Arg5189_0 - Arg5189_1[1]), Arg5189_1]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-modh"]]);})))))},
  2,
  [],
  "shen-modh"];
shenjs_functions["shen_shen-modh"] = shen_modh;






shen_sum = [shen_type_func,
  function shen_user_lambda5192(Arg5191) {
  if (Arg5191.length < 1) return [shen_type_func, shen_user_lambda5192, 1, Arg5191];
  var Arg5191_0 = Arg5191[0];
  return ((shenjs_empty$question$(Arg5191_0))
  ? 0
  : ((shenjs_is_type(Arg5191_0, shen_type_cons))
  ? (Arg5191_0[1] + shenjs_call(shen_sum, [Arg5191_0[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "sum"]]);})))},
  1,
  [],
  "sum"];
shenjs_functions["shen_sum"] = shen_sum;






shen_head = [shen_type_func,
  function shen_user_lambda5194(Arg5193) {
  if (Arg5193.length < 1) return [shen_type_func, shen_user_lambda5194, 1, Arg5193];
  var Arg5193_0 = Arg5193[0];
  return ((shenjs_is_type(Arg5193_0, shen_type_cons))
  ? Arg5193_0[1]
  : (function() {
  return shenjs_call_tail(shen_interror, ["head expects a non-empty list", []]);}))},
  1,
  [],
  "head"];
shenjs_functions["shen_head"] = shen_head;






shen_tail = [shen_type_func,
  function shen_user_lambda5196(Arg5195) {
  if (Arg5195.length < 1) return [shen_type_func, shen_user_lambda5196, 1, Arg5195];
  var Arg5195_0 = Arg5195[0];
  return ((shenjs_is_type(Arg5195_0, shen_type_cons))
  ? Arg5195_0[2]
  : (function() {
  return shenjs_call_tail(shen_interror, ["tail expects a non-empty list", []]);}))},
  1,
  [],
  "tail"];
shenjs_functions["shen_tail"] = shen_tail;






shen_hdstr = [shen_type_func,
  function shen_user_lambda5198(Arg5197) {
  if (Arg5197.length < 1) return [shen_type_func, shen_user_lambda5198, 1, Arg5197];
  var Arg5197_0 = Arg5197[0];
  return Arg5197_0[0]},
  1,
  [],
  "hdstr"];
shenjs_functions["shen_hdstr"] = shen_hdstr;






shen_intersection = [shen_type_func,
  function shen_user_lambda5200(Arg5199) {
  if (Arg5199.length < 2) return [shen_type_func, shen_user_lambda5200, 2, Arg5199];
  var Arg5199_0 = Arg5199[0], Arg5199_1 = Arg5199[1];
  return ((shenjs_empty$question$(Arg5199_0))
  ? []
  : ((shenjs_is_type(Arg5199_0, shen_type_cons))
  ? ((shenjs_call(shen_element$question$, [Arg5199_0[1], Arg5199_1]))
  ? [shen_type_cons, Arg5199_0[1], shenjs_call(shen_intersection, [Arg5199_0[2], Arg5199_1])]
  : (function() {
  return shenjs_call_tail(shen_intersection, [Arg5199_0[2], Arg5199_1]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "intersection"]]);})))},
  2,
  [],
  "intersection"];
shenjs_functions["shen_intersection"] = shen_intersection;






shen_reverse = [shen_type_func,
  function shen_user_lambda5202(Arg5201) {
  if (Arg5201.length < 1) return [shen_type_func, shen_user_lambda5202, 1, Arg5201];
  var Arg5201_0 = Arg5201[0];
  return (function() {
  return shenjs_call_tail(shen_reverse$_help, [Arg5201_0, []]);})},
  1,
  [],
  "reverse"];
shenjs_functions["shen_reverse"] = shen_reverse;






shen_reverse$_help = [shen_type_func,
  function shen_user_lambda5204(Arg5203) {
  if (Arg5203.length < 2) return [shen_type_func, shen_user_lambda5204, 2, Arg5203];
  var Arg5203_0 = Arg5203[0], Arg5203_1 = Arg5203[1];
  return ((shenjs_empty$question$(Arg5203_0))
  ? Arg5203_1
  : ((shenjs_is_type(Arg5203_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_reverse$_help, [Arg5203_0[2], [shen_type_cons, Arg5203_0[1], Arg5203_1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-reverse_help"]]);})))},
  2,
  [],
  "shen-reverse_help"];
shenjs_functions["shen_shen-reverse_help"] = shen_reverse$_help;






shen_union = [shen_type_func,
  function shen_user_lambda5206(Arg5205) {
  if (Arg5205.length < 2) return [shen_type_func, shen_user_lambda5206, 2, Arg5205];
  var Arg5205_0 = Arg5205[0], Arg5205_1 = Arg5205[1];
  return ((shenjs_empty$question$(Arg5205_0))
  ? Arg5205_1
  : ((shenjs_is_type(Arg5205_0, shen_type_cons))
  ? ((shenjs_call(shen_element$question$, [Arg5205_0[1], Arg5205_1]))
  ? (function() {
  return shenjs_call_tail(shen_union, [Arg5205_0[2], Arg5205_1]);})
  : [shen_type_cons, Arg5205_0[1], shenjs_call(shen_union, [Arg5205_0[2], Arg5205_1])])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "union"]]);})))},
  2,
  [],
  "union"];
shenjs_functions["shen_union"] = shen_union;






shen_y_or_n$question$ = [shen_type_func,
  function shen_user_lambda5208(Arg5207) {
  if (Arg5207.length < 1) return [shen_type_func, shen_user_lambda5208, 1, Arg5207];
  var Arg5207_0 = Arg5207[0];
  var R0;
  return (shenjs_call(shen_intoutput, [Arg5207_0, []]),
  shenjs_call(shen_intoutput, [" (y/n) ", []]),
  (R0 = shenjs_call(shen_intmake_string, ["~S", [shen_tuple, shenjs_call(shen_input, []), []]])),
  ((shenjs_unwind_tail(shenjs_$eq$("y", R0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$("n", R0)))
  ? false
  : (shenjs_call(shen_intoutput, ["please answer y or n~%", []]),
  (function() {
  return shenjs_call_tail(shen_y_or_n$question$, [Arg5207_0]);})))))},
  1,
  [],
  "y-or-n?"];
shenjs_functions["shen_y-or-n?"] = shen_y_or_n$question$;












shen_subst = [shen_type_func,
  function shen_user_lambda5211(Arg5210) {
  if (Arg5210.length < 3) return [shen_type_func, shen_user_lambda5211, 3, Arg5210];
  var Arg5210_0 = Arg5210[0], Arg5210_1 = Arg5210[1], Arg5210_2 = Arg5210[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5210_2, Arg5210_1)))
  ? Arg5210_0
  : ((shenjs_is_type(Arg5210_2, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_subst, [Arg5210_0, Arg5210_1, Arg5210_2[1]]), shenjs_call(shen_subst, [Arg5210_0, Arg5210_1, Arg5210_2[2]])]
  : Arg5210_2))},
  3,
  [],
  "subst"];
shenjs_functions["shen_subst"] = shen_subst;






shen_cd = [shen_type_func,
  function shen_user_lambda5213(Arg5212) {
  if (Arg5212.length < 1) return [shen_type_func, shen_user_lambda5213, 1, Arg5212];
  var Arg5212_0 = Arg5212[0];
  return (shenjs_globals["shen_*home-directory*"] = ((shenjs_unwind_tail(shenjs_$eq$(Arg5212_0, "")))
  ? ""
  : shenjs_call(shen_intmake_string, ["~A/", [shen_tuple, Arg5212_0, []]])))},
  1,
  [],
  "cd"];
shenjs_functions["shen_cd"] = shen_cd;






shen_map = [shen_type_func,
  function shen_user_lambda5215(Arg5214) {
  if (Arg5214.length < 2) return [shen_type_func, shen_user_lambda5215, 2, Arg5214];
  var Arg5214_0 = Arg5214[0], Arg5214_1 = Arg5214[1];
  return (function() {
  return shenjs_call_tail(shen_map_h, [Arg5214_0, Arg5214_1, []]);})},
  2,
  [],
  "map"];
shenjs_functions["shen_map"] = shen_map;






shen_map_h = [shen_type_func,
  function shen_user_lambda5217(Arg5216) {
  if (Arg5216.length < 3) return [shen_type_func, shen_user_lambda5217, 3, Arg5216];
  var Arg5216_0 = Arg5216[0], Arg5216_1 = Arg5216[1], Arg5216_2 = Arg5216[2];
  return ((shenjs_empty$question$(Arg5216_1))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg5216_2]);})
  : ((shenjs_is_type(Arg5216_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map_h, [Arg5216_0, Arg5216_1[2], [shen_type_cons, shenjs_call(Arg5216_0, [Arg5216_1[1]]), Arg5216_2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-map-h"]]);})))},
  3,
  [],
  "shen-map-h"];
shenjs_functions["shen_shen-map-h"] = shen_map_h;






shen_length = [shen_type_func,
  function shen_user_lambda5219(Arg5218) {
  if (Arg5218.length < 1) return [shen_type_func, shen_user_lambda5219, 1, Arg5218];
  var Arg5218_0 = Arg5218[0];
  return (function() {
  return shenjs_call_tail(shen_length_h, [Arg5218_0, 0]);})},
  1,
  [],
  "length"];
shenjs_functions["shen_length"] = shen_length;






shen_length_h = [shen_type_func,
  function shen_user_lambda5221(Arg5220) {
  if (Arg5220.length < 2) return [shen_type_func, shen_user_lambda5221, 2, Arg5220];
  var Arg5220_0 = Arg5220[0], Arg5220_1 = Arg5220[1];
  return ((shenjs_empty$question$(Arg5220_0))
  ? Arg5220_1
  : (function() {
  return shenjs_call_tail(shen_length_h, [Arg5220_0[2], (Arg5220_1 + 1)]);}))},
  2,
  [],
  "shen-length-h"];
shenjs_functions["shen_shen-length-h"] = shen_length_h;






shen_occurrences = [shen_type_func,
  function shen_user_lambda5223(Arg5222) {
  if (Arg5222.length < 2) return [shen_type_func, shen_user_lambda5223, 2, Arg5222];
  var Arg5222_0 = Arg5222[0], Arg5222_1 = Arg5222[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5222_1, Arg5222_0)))
  ? 1
  : ((shenjs_is_type(Arg5222_1, shen_type_cons))
  ? (shenjs_call(shen_occurrences, [Arg5222_0, Arg5222_1[1]]) + shenjs_call(shen_occurrences, [Arg5222_0, Arg5222_1[2]]))
  : 0))},
  2,
  [],
  "occurrences"];
shenjs_functions["shen_occurrences"] = shen_occurrences;






shen_nth = [shen_type_func,
  function shen_user_lambda5225(Arg5224) {
  if (Arg5224.length < 2) return [shen_type_func, shen_user_lambda5225, 2, Arg5224];
  var Arg5224_0 = Arg5224[0], Arg5224_1 = Arg5224[1];
  return (((shenjs_unwind_tail(shenjs_$eq$(1, Arg5224_0)) && shenjs_is_type(Arg5224_1, shen_type_cons)))
  ? Arg5224_1[1]
  : ((shenjs_is_type(Arg5224_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_nth, [(Arg5224_0 - 1), Arg5224_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "nth"]]);})))},
  2,
  [],
  "nth"];
shenjs_functions["shen_nth"] = shen_nth;






shen_integer$question$ = [shen_type_func,
  function shen_user_lambda5227(Arg5226) {
  if (Arg5226.length < 1) return [shen_type_func, shen_user_lambda5227, 1, Arg5226];
  var Arg5226_0 = Arg5226[0];
  var R0;
  return ((typeof(Arg5226_0) == 'number') && ((R0 = shenjs_call(shen_abs, [Arg5226_0])),
  shenjs_call(shen_integer_test$question$, [R0, shenjs_call(shen_magless, [R0, 1])])))},
  1,
  [],
  "integer?"];
shenjs_functions["shen_integer?"] = shen_integer$question$;






shen_abs = [shen_type_func,
  function shen_user_lambda5229(Arg5228) {
  if (Arg5228.length < 1) return [shen_type_func, shen_user_lambda5229, 1, Arg5228];
  var Arg5228_0 = Arg5228[0];
  return (((Arg5228_0 > 0))
  ? Arg5228_0
  : (0 - Arg5228_0))},
  1,
  [],
  "shen-abs"];
shenjs_functions["shen_shen-abs"] = shen_abs;






shen_magless = [shen_type_func,
  function shen_user_lambda5231(Arg5230) {
  if (Arg5230.length < 2) return [shen_type_func, shen_user_lambda5231, 2, Arg5230];
  var Arg5230_0 = Arg5230[0], Arg5230_1 = Arg5230[1];
  var R0;
  return ((R0 = (Arg5230_1 * 2)),
  (((R0 > Arg5230_0))
  ? Arg5230_1
  : (function() {
  return shenjs_call_tail(shen_magless, [Arg5230_0, R0]);})))},
  2,
  [],
  "shen-magless"];
shenjs_functions["shen_shen-magless"] = shen_magless;






shen_integer_test$question$ = [shen_type_func,
  function shen_user_lambda5233(Arg5232) {
  if (Arg5232.length < 2) return [shen_type_func, shen_user_lambda5233, 2, Arg5232];
  var Arg5232_0 = Arg5232[0], Arg5232_1 = Arg5232[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg5232_0)))
  ? true
  : (((1 > Arg5232_0))
  ? false
  : ((R0 = (Arg5232_0 - Arg5232_1)),
  (((0 > R0))
  ? (function() {
  return shenjs_call_tail(shen_integer$question$, [Arg5232_0]);})
  : (function() {
  return shenjs_call_tail(shen_integer_test$question$, [R0, Arg5232_1]);})))))},
  2,
  [],
  "shen-integer-test?"];
shenjs_functions["shen_shen-integer-test?"] = shen_integer_test$question$;






shen_mapcan = [shen_type_func,
  function shen_user_lambda5235(Arg5234) {
  if (Arg5234.length < 2) return [shen_type_func, shen_user_lambda5235, 2, Arg5234];
  var Arg5234_0 = Arg5234[0], Arg5234_1 = Arg5234[1];
  return ((shenjs_empty$question$(Arg5234_1))
  ? []
  : ((shenjs_is_type(Arg5234_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(Arg5234_0, [Arg5234_1[1]]), shenjs_call(shen_mapcan, [Arg5234_0, Arg5234_1[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "mapcan"]]);})))},
  2,
  [],
  "mapcan"];
shenjs_functions["shen_mapcan"] = shen_mapcan;






shen_read_file_as_bytelist = [shen_type_func,
  function shen_user_lambda5237(Arg5236) {
  if (Arg5236.length < 1) return [shen_type_func, shen_user_lambda5237, 1, Arg5236];
  var Arg5236_0 = Arg5236[0];
  var R0, R1;
  return ((R0 = shenjs_open([shen_type_symbol, "file"], Arg5236_0, [shen_type_symbol, "in"])),
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
  function shen_user_lambda5239(Arg5238) {
  if (Arg5238.length < 3) return [shen_type_func, shen_user_lambda5239, 3, Arg5238];
  var Arg5238_0 = Arg5238[0], Arg5238_1 = Arg5238[1], Arg5238_2 = Arg5238[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(-1, Arg5238_1)))
  ? Arg5238_2
  : (function() {
  return shenjs_call_tail(shen_read_file_as_bytelist_help, [Arg5238_0, shenjs_read_byte(Arg5238_0), [shen_type_cons, Arg5238_1, Arg5238_2]]);}))},
  3,
  [],
  "shen-read-file-as-bytelist-help"];
shenjs_functions["shen_shen-read-file-as-bytelist-help"] = shen_read_file_as_bytelist_help;






shen_read_file_as_string = [shen_type_func,
  function shen_user_lambda5241(Arg5240) {
  if (Arg5240.length < 1) return [shen_type_func, shen_user_lambda5241, 1, Arg5240];
  var Arg5240_0 = Arg5240[0];
  var R0;
  return ((R0 = shenjs_open([shen_type_symbol, "file"], Arg5240_0, [shen_type_symbol, "in"])),
  (function() {
  return shenjs_call_tail(shen_rfas_h, [R0, shenjs_read_byte(R0), ""]);}))},
  1,
  [],
  "read-file-as-string"];
shenjs_functions["shen_read-file-as-string"] = shen_read_file_as_string;






shen_rfas_h = [shen_type_func,
  function shen_user_lambda5243(Arg5242) {
  if (Arg5242.length < 3) return [shen_type_func, shen_user_lambda5243, 3, Arg5242];
  var Arg5242_0 = Arg5242[0], Arg5242_1 = Arg5242[1], Arg5242_2 = Arg5242[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(-1, Arg5242_1)))
  ? (shenjs_close(Arg5242_0),
  Arg5242_2)
  : (function() {
  return shenjs_call_tail(shen_rfas_h, [Arg5242_0, shenjs_read_byte(Arg5242_0), (Arg5242_2 + shenjs_n_$gt$string(Arg5242_1))]);}))},
  3,
  [],
  "shen-rfas-h"];
shenjs_functions["shen_shen-rfas-h"] = shen_rfas_h;






shen_$eq$$eq$ = [shen_type_func,
  function shen_user_lambda5245(Arg5244) {
  if (Arg5244.length < 2) return [shen_type_func, shen_user_lambda5245, 2, Arg5244];
  var Arg5244_0 = Arg5244[0], Arg5244_1 = Arg5244[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5244_1, Arg5244_0)))
  ? true
  : false)},
  2,
  [],
  "=="];
shenjs_functions["shen_=="] = shen_$eq$$eq$;






shen_abort = [shen_type_func,
  function shen_user_lambda5247(Arg5246) {
  if (Arg5246.length < 0) return [shen_type_func, shen_user_lambda5247, 0, Arg5246];
  return (function() {
  return shenjs_simple_error("");})},
  0,
  [],
  "abort"];
shenjs_functions["shen_abort"] = shen_abort;






shen_read = [shen_type_func,
  function shen_user_lambda5249(Arg5248) {
  if (Arg5248.length < 0) return [shen_type_func, shen_user_lambda5249, 0, Arg5248];
  return shenjs_call(shen_lineread, [])[1]},
  0,
  [],
  "read"];
shenjs_functions["shen_read"] = shen_read;






shen_input = [shen_type_func,
  function shen_user_lambda5251(Arg5250) {
  if (Arg5250.length < 0) return [shen_type_func, shen_user_lambda5251, 0, Arg5250];
  return (function() {
  return shenjs_call_tail(shen_eval, [shenjs_call(shen_read, [])]);})},
  0,
  [],
  "input"];
shenjs_functions["shen_input"] = shen_input;






shen_input$plus$ = [shen_type_func,
  function shen_user_lambda5253(Arg5252) {
  if (Arg5252.length < 2) return [shen_type_func, shen_user_lambda5253, 2, Arg5252];
  var Arg5252_0 = Arg5252[0], Arg5252_1 = Arg5252[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_read, [])),
  (R1 = shenjs_call(shen_typecheck, [R0, Arg5252_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(false, R1)))
  ? (shenjs_call(shen_intoutput, ["input is not of type ~R: please re-enter ", [shen_tuple, Arg5252_1, []]]),
  (function() {
  return shenjs_call_tail(shen_input$plus$, [[shen_type_symbol, ":"], Arg5252_1]);}))
  : (function() {
  return shenjs_call_tail(shen_eval, [R0]);})))},
  2,
  [],
  "input+"];
shenjs_functions["shen_input+"] = shen_input$plus$;






shen_bound$question$ = [shen_type_func,
  function shen_user_lambda5255(Arg5254) {
  if (Arg5254.length < 1) return [shen_type_func, shen_user_lambda5255, 1, Arg5254];
  var Arg5254_0 = Arg5254[0];
  var R0;
  return (shenjs_is_type(Arg5254_0, shen_type_symbol) && ((R0 = shenjs_trap_error(function() {return (shenjs_globals["shen_" + Arg5254_0[1]]);}, [shen_type_func,
  function shen_user_lambda5257(Arg5256) {
  if (Arg5256.length < 1) return [shen_type_func, shen_user_lambda5257, 1, Arg5256];
  var Arg5256_0 = Arg5256[0];
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
  function shen_user_lambda5259(Arg5258) {
  if (Arg5258.length < 1) return [shen_type_func, shen_user_lambda5259, 1, Arg5258];
  var Arg5258_0 = Arg5258[0];
  return ((shenjs_unwind_tail(shenjs_$eq$("", Arg5258_0)))
  ? []
  : [shen_type_cons, shenjs_string_$gt$n(Arg5258_0[0]), shenjs_call(shen_string_$gt$bytes, [shenjs_tlstr(Arg5258_0)])])},
  1,
  [],
  "shen-string->bytes"];
shenjs_functions["shen_shen-string->bytes"] = shen_string_$gt$bytes;






shen_maxinferences = [shen_type_func,
  function shen_user_lambda5261(Arg5260) {
  if (Arg5260.length < 1) return [shen_type_func, shen_user_lambda5261, 1, Arg5260];
  var Arg5260_0 = Arg5260[0];
  return (shenjs_globals["shen_shen-*maxinferences*"] = Arg5260_0)},
  1,
  [],
  "maxinferences"];
shenjs_functions["shen_maxinferences"] = shen_maxinferences;






shen_inferences = [shen_type_func,
  function shen_user_lambda5263(Arg5262) {
  if (Arg5262.length < 1) return [shen_type_func, shen_user_lambda5263, 1, Arg5262];
  var Arg5262_0 = Arg5262[0];
  return (shenjs_globals["shen_shen-*infs*"])},
  1,
  [],
  "inferences"];
shenjs_functions["shen_inferences"] = shen_inferences;






shen_hush = [shen_type_func,
  function shen_user_lambda5265(Arg5264) {
  if (Arg5264.length < 1) return [shen_type_func, shen_user_lambda5265, 1, Arg5264];
  var Arg5264_0 = Arg5264[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg5264_0)))
  ? (shenjs_globals["shen_shen-*hush*"] = [shen_type_symbol, "shen-hushed"])
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg5264_0)))
  ? (shenjs_globals["shen_shen-*hush*"] = [shen_type_symbol, "shen-unhushed"])
  : (function() {
  return shenjs_call_tail(shen_interror, ["'hush' expects a + or a -~%", []]);})))},
  1,
  [],
  "shen-hush"];
shenjs_functions["shen_shen-hush"] = shen_hush;






shen_protect = [shen_type_func,
  function shen_user_lambda5267(Arg5266) {
  if (Arg5266.length < 1) return [shen_type_func, shen_user_lambda5267, 1, Arg5266];
  var Arg5266_0 = Arg5266[0];
  return Arg5266_0},
  1,
  [],
  "protect"];
shenjs_functions["shen_protect"] = shen_protect;






shen_stoutput = [shen_type_func,
  function shen_user_lambda5269(Arg5268) {
  if (Arg5268.length < 1) return [shen_type_func, shen_user_lambda5269, 1, Arg5268];
  var Arg5268_0 = Arg5268[0];
  return (shenjs_globals["shen_*stoutput*"])},
  1,
  [],
  "shen-stoutput"];
shenjs_functions["shen_shen-stoutput"] = shen_stoutput;












shen_datatype_error = [shen_type_func,
  function shen_user_lambda4947(Arg4946) {
  if (Arg4946.length < 1) return [shen_type_func, shen_user_lambda4947, 1, Arg4946];
  var Arg4946_0 = Arg4946[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["datatype syntax error here:~%~% ~A~%", [shen_tuple, shenjs_call(shen_next_50, [50, Arg4946_0]), []]]);})},
  1,
  [],
  "shen-datatype-error"];
shenjs_functions["shen_shen-datatype-error"] = shen_datatype_error;






shen_$lt$datatype_rules$gt$ = [shen_type_func,
  function shen_user_lambda4949(Arg4948) {
  if (Arg4948.length < 1) return [shen_type_func, shen_user_lambda4949, 1, Arg4948];
  var Arg4948_0 = Arg4948[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$datatype_rule$gt$, [Arg4948_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$datatype_rules$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4948_0])),
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
  function shen_user_lambda4951(Arg4950) {
  if (Arg4950.length < 1) return [shen_type_func, shen_user_lambda4951, 1, Arg4950];
  var Arg4950_0 = Arg4950[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$side_conditions$gt$, [Arg4950_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$side_conditions$gt$, [Arg4950_0])),
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
  function shen_user_lambda4953(Arg4952) {
  if (Arg4952.length < 1) return [shen_type_func, shen_user_lambda4953, 1, Arg4952];
  var Arg4952_0 = Arg4952[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$side_condition$gt$, [Arg4952_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$side_conditions$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4952_0])),
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
  function shen_user_lambda4955(Arg4954) {
  if (Arg4954.length < 1) return [shen_type_func, shen_user_lambda4955, 1, Arg4954];
  var Arg4954_0 = Arg4954[0];
  var R0, R1;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4954_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "if"], shenjs_call(shen_fst, [Arg4954_0])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$expr$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4954_0])[2], shenjs_call(shen_snd, [Arg4954_0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, shenjs_call(shen_snd, [R0]), []]]])
  : shen_fail_obj))
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4954_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], shenjs_call(shen_fst, [Arg4954_0])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$variable$question$$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4954_0])[2], shenjs_call(shen_snd, [Arg4954_0])])])),
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
  function shen_user_lambda4957(Arg4956) {
  if (Arg4956.length < 1) return [shen_type_func, shen_user_lambda4957, 1, Arg4956];
  var Arg4956_0 = Arg4956[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4956_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4956_0])[2], shenjs_call(shen_snd, [Arg4956_0])])]), (((!shenjs_call(shen_variable$question$, [shenjs_call(shen_fst, [Arg4956_0])[1]])))
  ? shen_fail_obj
  : shenjs_call(shen_fst, [Arg4956_0])[1])])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<variable?>"];
shenjs_functions["shen_shen-<variable?>"] = shen_$lt$variable$question$$gt$;






shen_$lt$expr$gt$ = [shen_type_func,
  function shen_user_lambda4959(Arg4958) {
  if (Arg4958.length < 1) return [shen_type_func, shen_user_lambda4959, 1, Arg4958];
  var Arg4958_0 = Arg4958[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4958_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4958_0])[2], shenjs_call(shen_snd, [Arg4958_0])])]), (((shenjs_call(shen_element$question$, [shenjs_call(shen_fst, [Arg4958_0])[1], [shen_type_cons, [shen_type_symbol, ">>"], [shen_type_cons, [shen_type_symbol, ";"], []]]]) || (shenjs_call(shen_singleunderline$question$, [shenjs_call(shen_fst, [Arg4958_0])[1]]) || shenjs_call(shen_doubleunderline$question$, [shenjs_call(shen_fst, [Arg4958_0])[1]]))))
  ? shen_fail_obj
  : shenjs_call(shen_remove_bar, [shenjs_call(shen_fst, [Arg4958_0])[1]]))])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<expr>"];
shenjs_functions["shen_shen-<expr>"] = shen_$lt$expr$gt$;






shen_remove_bar = [shen_type_func,
  function shen_user_lambda4961(Arg4960) {
  if (Arg4960.length < 1) return [shen_type_func, shen_user_lambda4961, 1, Arg4960];
  var Arg4960_0 = Arg4960[0];
  return (((shenjs_is_type(Arg4960_0, shen_type_cons) && (shenjs_is_type(Arg4960_0[2], shen_type_cons) && (shenjs_is_type(Arg4960_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4960_0[2][2][2]) && shenjs_unwind_tail(shenjs_$eq$(Arg4960_0[2][1], [shen_type_symbol, "bar!"])))))))
  ? [shen_type_cons, Arg4960_0[1], Arg4960_0[2][2][1]]
  : ((shenjs_is_type(Arg4960_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_remove_bar, [Arg4960_0[1]]), shenjs_call(shen_remove_bar, [Arg4960_0[2]])]
  : Arg4960_0))},
  1,
  [],
  "shen-remove-bar"];
shenjs_functions["shen_shen-remove-bar"] = shen_remove_bar;






shen_$lt$premises$gt$ = [shen_type_func,
  function shen_user_lambda4963(Arg4962) {
  if (Arg4962.length < 1) return [shen_type_func, shen_user_lambda4963, 1, Arg4962];
  var Arg4962_0 = Arg4962[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$premise$gt$, [Arg4962_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4962_0])),
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
  function shen_user_lambda4965(Arg4964) {
  if (Arg4964.length < 1) return [shen_type_func, shen_user_lambda4965, 1, Arg4964];
  var Arg4964_0 = Arg4964[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4964_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4964_0])[2], shenjs_call(shen_snd, [Arg4964_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4964_0])[1], [shen_type_symbol, ";"])))
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
  function shen_user_lambda4967(Arg4966) {
  if (Arg4966.length < 1) return [shen_type_func, shen_user_lambda4967, 1, Arg4966];
  var Arg4966_0 = Arg4966[0];
  var R0, R1;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4966_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "!"], shenjs_call(shen_fst, [Arg4966_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4966_0])[2], shenjs_call(shen_snd, [Arg4966_0])])]), [shen_type_symbol, "!"]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$formulae$gt$, [Arg4966_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ">>"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$formula$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_tuple, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$formula$gt$, [Arg4966_0])),
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
  function shen_user_lambda4969(Arg4968) {
  if (Arg4968.length < 1) return [shen_type_func, shen_user_lambda4969, 1, Arg4968];
  var Arg4968_0 = Arg4968[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$formulae$gt$, [Arg4968_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$formula$gt$, [Arg4968_0])),
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
  function shen_user_lambda4971(Arg4970) {
  if (Arg4970.length < 1) return [shen_type_func, shen_user_lambda4971, 1, Arg4970];
  var Arg4970_0 = Arg4970[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$formula$gt$, [Arg4970_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$formulae$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$formula$gt$, [Arg4970_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R0]), []]])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4970_0])),
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
  function shen_user_lambda4973(Arg4972) {
  if (Arg4972.length < 1) return [shen_type_func, shen_user_lambda4973, 1, Arg4972];
  var Arg4972_0 = Arg4972[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$expr$gt$, [Arg4972_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$type$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_curry, [shenjs_call(shen_snd, [R0])]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_normalise_type, [shenjs_call(shen_snd, [R1])]), []]]]])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$expr$gt$, [Arg4972_0])),
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
  function shen_user_lambda4975(Arg4974) {
  if (Arg4974.length < 1) return [shen_type_func, shen_user_lambda4975, 1, Arg4974];
  var Arg4974_0 = Arg4974[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4974_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4974_0])[2], shenjs_call(shen_snd, [Arg4974_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4974_0])[1], [shen_type_symbol, ";"])))
  ? shenjs_call(shen_fst, [Arg4974_0])[1]
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
  function shen_user_lambda4977(Arg4976) {
  if (Arg4976.length < 1) return [shen_type_func, shen_user_lambda4977, 1, Arg4976];
  var Arg4976_0 = Arg4976[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$expr$gt$, [Arg4976_0])),
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
  function shen_user_lambda4979(Arg4978) {
  if (Arg4978.length < 1) return [shen_type_func, shen_user_lambda4979, 1, Arg4978];
  var Arg4978_0 = Arg4978[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4978_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4978_0])[2], shenjs_call(shen_snd, [Arg4978_0])])]), ((shenjs_call(shen_doubleunderline$question$, [shenjs_call(shen_fst, [Arg4978_0])[1]]))
  ? shenjs_call(shen_fst, [Arg4978_0])[1]
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
  function shen_user_lambda4981(Arg4980) {
  if (Arg4980.length < 1) return [shen_type_func, shen_user_lambda4981, 1, Arg4980];
  var Arg4980_0 = Arg4980[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4980_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4980_0])[2], shenjs_call(shen_snd, [Arg4980_0])])]), ((shenjs_call(shen_singleunderline$question$, [shenjs_call(shen_fst, [Arg4980_0])[1]]))
  ? shenjs_call(shen_fst, [Arg4980_0])[1]
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
  function shen_user_lambda4983(Arg4982) {
  if (Arg4982.length < 1) return [shen_type_func, shen_user_lambda4983, 1, Arg4982];
  var Arg4982_0 = Arg4982[0];
  return (shenjs_is_type(Arg4982_0, shen_type_symbol) && shenjs_call(shen_sh$question$, [shenjs_str(Arg4982_0)]))},
  1,
  [],
  "shen-singleunderline?"];
shenjs_functions["shen_shen-singleunderline?"] = shen_singleunderline$question$;






shen_sh$question$ = [shen_type_func,
  function shen_user_lambda4985(Arg4984) {
  if (Arg4984.length < 1) return [shen_type_func, shen_user_lambda4985, 1, Arg4984];
  var Arg4984_0 = Arg4984[0];
  return ((shenjs_unwind_tail(shenjs_$eq$("_", Arg4984_0)))
  ? true
  : (shenjs_unwind_tail(shenjs_$eq$(Arg4984_0[0], "_")) && shenjs_call(shen_sh$question$, [shenjs_tlstr(Arg4984_0)])))},
  1,
  [],
  "shen-sh?"];
shenjs_functions["shen_shen-sh?"] = shen_sh$question$;






shen_doubleunderline$question$ = [shen_type_func,
  function shen_user_lambda4987(Arg4986) {
  if (Arg4986.length < 1) return [shen_type_func, shen_user_lambda4987, 1, Arg4986];
  var Arg4986_0 = Arg4986[0];
  return (shenjs_is_type(Arg4986_0, shen_type_symbol) && shenjs_call(shen_dh$question$, [shenjs_str(Arg4986_0)]))},
  1,
  [],
  "shen-doubleunderline?"];
shenjs_functions["shen_shen-doubleunderline?"] = shen_doubleunderline$question$;






shen_dh$question$ = [shen_type_func,
  function shen_user_lambda4989(Arg4988) {
  if (Arg4988.length < 1) return [shen_type_func, shen_user_lambda4989, 1, Arg4988];
  var Arg4988_0 = Arg4988[0];
  return ((shenjs_unwind_tail(shenjs_$eq$("=", Arg4988_0)))
  ? true
  : (shenjs_unwind_tail(shenjs_$eq$(Arg4988_0[0], "=")) && shenjs_call(shen_dh$question$, [shenjs_tlstr(Arg4988_0)])))},
  1,
  [],
  "shen-dh?"];
shenjs_functions["shen_shen-dh?"] = shen_dh$question$;






shen_process_datatype = [shen_type_func,
  function shen_user_lambda4991(Arg4990) {
  if (Arg4990.length < 2) return [shen_type_func, shen_user_lambda4991, 2, Arg4990];
  var Arg4990_0 = Arg4990[0], Arg4990_1 = Arg4990[1];
  return (function() {
  return shenjs_call_tail(shen_remember_datatype, [shenjs_call(shen_s_prolog, [shenjs_call(shen_rules_$gt$horn_clauses, [Arg4990_0, Arg4990_1])])]);})},
  2,
  [],
  "shen-process-datatype"];
shenjs_functions["shen_shen-process-datatype"] = shen_process_datatype;






shen_remember_datatype = [shen_type_func,
  function shen_user_lambda4993(Arg4992) {
  if (Arg4992.length < 1) return [shen_type_func, shen_user_lambda4993, 1, Arg4992];
  var Arg4992_0 = Arg4992[0];
  return ((shenjs_is_type(Arg4992_0, shen_type_cons))
  ? ((shenjs_globals["shen_shen-*datatypes*"] = shenjs_call(shen_adjoin, [Arg4992_0[1], (shenjs_globals["shen_shen-*datatypes*"])])),
  (shenjs_globals["shen_shen-*alldatatypes*"] = shenjs_call(shen_adjoin, [Arg4992_0[1], (shenjs_globals["shen_shen-*alldatatypes*"])])),
  Arg4992_0[1])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-remember-datatype"]]);}))},
  1,
  [],
  "shen-remember-datatype"];
shenjs_functions["shen_shen-remember-datatype"] = shen_remember_datatype;






shen_rules_$gt$horn_clauses = [shen_type_func,
  function shen_user_lambda4995(Arg4994) {
  if (Arg4994.length < 2) return [shen_type_func, shen_user_lambda4995, 2, Arg4994];
  var Arg4994_0 = Arg4994[0], Arg4994_1 = Arg4994[1];
  return ((shenjs_empty$question$(Arg4994_1))
  ? []
  : (((shenjs_is_type(Arg4994_1, shen_type_cons) && (shenjs_is_type(Arg4994_1[1], shen_tuple) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-single"], shenjs_call(shen_fst, [Arg4994_1[1]]))))))
  ? [shen_type_cons, shenjs_call(shen_rule_$gt$horn_clause, [Arg4994_0, shenjs_call(shen_snd, [Arg4994_1[1]])]), shenjs_call(shen_rules_$gt$horn_clauses, [Arg4994_0, Arg4994_1[2]])]
  : (((shenjs_is_type(Arg4994_1, shen_type_cons) && (shenjs_is_type(Arg4994_1[1], shen_tuple) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-double"], shenjs_call(shen_fst, [Arg4994_1[1]]))))))
  ? (function() {
  return shenjs_call_tail(shen_rules_$gt$horn_clauses, [Arg4994_0, shenjs_call(shen_append, [shenjs_call(shen_double_$gt$singles, [shenjs_call(shen_snd, [Arg4994_1[1]])]), Arg4994_1[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-rules->horn-clauses"]]);}))))},
  2,
  [],
  "shen-rules->horn-clauses"];
shenjs_functions["shen_shen-rules->horn-clauses"] = shen_rules_$gt$horn_clauses;






shen_double_$gt$singles = [shen_type_func,
  function shen_user_lambda4997(Arg4996) {
  if (Arg4996.length < 1) return [shen_type_func, shen_user_lambda4997, 1, Arg4996];
  var Arg4996_0 = Arg4996[0];
  return [shen_type_cons, shenjs_call(shen_right_rule, [Arg4996_0]), [shen_type_cons, shenjs_call(shen_left_rule, [Arg4996_0]), []]]},
  1,
  [],
  "shen-double->singles"];
shenjs_functions["shen_shen-double->singles"] = shen_double_$gt$singles;






shen_right_rule = [shen_type_func,
  function shen_user_lambda4999(Arg4998) {
  if (Arg4998.length < 1) return [shen_type_func, shen_user_lambda4999, 1, Arg4998];
  var Arg4998_0 = Arg4998[0];
  return [shen_tuple, [shen_type_symbol, "shen-single"], Arg4998_0]},
  1,
  [],
  "shen-right-rule"];
shenjs_functions["shen_shen-right-rule"] = shen_right_rule;






shen_left_rule = [shen_type_func,
  function shen_user_lambda5001(Arg5000) {
  if (Arg5000.length < 1) return [shen_type_func, shen_user_lambda5001, 1, Arg5000];
  var Arg5000_0 = Arg5000[0];
  var R0, R1;
  return (((shenjs_is_type(Arg5000_0, shen_type_cons) && (shenjs_is_type(Arg5000_0[2], shen_type_cons) && (shenjs_is_type(Arg5000_0[2][2], shen_type_cons) && (shenjs_is_type(Arg5000_0[2][2][1], shen_tuple) && (shenjs_empty$question$(shenjs_call(shen_fst, [Arg5000_0[2][2][1]])) && shenjs_empty$question$(Arg5000_0[2][2][2])))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "Qv"]])),
  (R1 = [shen_tuple, [shen_type_cons, shenjs_call(shen_snd, [Arg5000_0[2][2][1]]), []], R0]),
  (R0 = [shen_type_cons, [shen_tuple, shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5003(Arg5002) {
  if (Arg5002.length < 1) return [shen_type_func, shen_user_lambda5003, 1, Arg5002];
  var Arg5002_0 = Arg5002[0];
  return (function() {
  return shenjs_call_tail(shen_right_$gt$left, [Arg5002_0]);})},
  1,
  []], Arg5000_0[2][1]]), R0], []]),
  [shen_tuple, [shen_type_symbol, "shen-single"], [shen_type_cons, Arg5000_0[1], [shen_type_cons, R0, [shen_type_cons, R1, []]]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-left-rule"]]);}))},
  1,
  [],
  "shen-left-rule"];
shenjs_functions["shen_shen-left-rule"] = shen_left_rule;






shen_right_$gt$left = [shen_type_func,
  function shen_user_lambda5005(Arg5004) {
  if (Arg5004.length < 1) return [shen_type_func, shen_user_lambda5005, 1, Arg5004];
  var Arg5004_0 = Arg5004[0];
  return (((shenjs_is_type(Arg5004_0, shen_tuple) && shenjs_empty$question$(shenjs_call(shen_fst, [Arg5004_0]))))
  ? (function() {
  return shenjs_call_tail(shen_snd, [Arg5004_0]);})
  : (function() {
  return shenjs_call_tail(shen_interror, ["syntax error with ==========~%", []]);}))},
  1,
  [],
  "shen-right->left"];
shenjs_functions["shen_shen-right->left"] = shen_right_$gt$left;






shen_rule_$gt$horn_clause = [shen_type_func,
  function shen_user_lambda5007(Arg5006) {
  if (Arg5006.length < 2) return [shen_type_func, shen_user_lambda5007, 2, Arg5006];
  var Arg5006_0 = Arg5006[0], Arg5006_1 = Arg5006[1];
  return (((shenjs_is_type(Arg5006_1, shen_type_cons) && (shenjs_is_type(Arg5006_1[2], shen_type_cons) && (shenjs_is_type(Arg5006_1[2][2], shen_type_cons) && (shenjs_is_type(Arg5006_1[2][2][1], shen_tuple) && shenjs_empty$question$(Arg5006_1[2][2][2]))))))
  ? [shen_type_cons, shenjs_call(shen_rule_$gt$horn_clause_head, [Arg5006_0, shenjs_call(shen_snd, [Arg5006_1[2][2][1]])]), [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, shenjs_call(shen_rule_$gt$horn_clause_body, [Arg5006_1[1], Arg5006_1[2][1], shenjs_call(shen_fst, [Arg5006_1[2][2][1]])]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-rule->horn-clause"]]);}))},
  2,
  [],
  "shen-rule->horn-clause"];
shenjs_functions["shen_shen-rule->horn-clause"] = shen_rule_$gt$horn_clause;






shen_rule_$gt$horn_clause_head = [shen_type_func,
  function shen_user_lambda5009(Arg5008) {
  if (Arg5008.length < 2) return [shen_type_func, shen_user_lambda5009, 2, Arg5008];
  var Arg5008_0 = Arg5008[0], Arg5008_1 = Arg5008[1];
  return [shen_type_cons, Arg5008_0, [shen_type_cons, shenjs_call(shen_mode_ify, [Arg5008_1]), [shen_type_cons, [shen_type_symbol, "Context_1957"], []]]]},
  2,
  [],
  "shen-rule->horn-clause-head"];
shenjs_functions["shen_shen-rule->horn-clause-head"] = shen_rule_$gt$horn_clause_head;






shen_mode_ify = [shen_type_func,
  function shen_user_lambda5011(Arg5010) {
  if (Arg5010.length < 1) return [shen_type_func, shen_user_lambda5011, 1, Arg5010];
  var Arg5010_0 = Arg5010[0];
  return (((shenjs_is_type(Arg5010_0, shen_type_cons) && (shenjs_is_type(Arg5010_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], Arg5010_0[2][1])) && (shenjs_is_type(Arg5010_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg5010_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, [shen_type_cons, Arg5010_0[1], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg5010_0[2][2][1], [shen_type_cons, [shen_type_symbol, "+"], []]]], []]]], [shen_type_cons, [shen_type_symbol, "-"], []]]]
  : Arg5010_0)},
  1,
  [],
  "shen-mode-ify"];
shenjs_functions["shen_shen-mode-ify"] = shen_mode_ify;






shen_rule_$gt$horn_clause_body = [shen_type_func,
  function shen_user_lambda5013(Arg5012) {
  if (Arg5012.length < 3) return [shen_type_func, shen_user_lambda5013, 3, Arg5012];
  var Arg5012_0 = Arg5012[0], Arg5012_1 = Arg5012[1], Arg5012_2 = Arg5012[2];
  var R0, R1, R2;
  return ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5015(Arg5014) {
  if (Arg5014.length < 1) return [shen_type_func, shen_user_lambda5015, 1, Arg5014];
  var Arg5014_0 = Arg5014[0];
  return (function() {
  return shenjs_call_tail(shen_extract$_vars, [Arg5014_0]);})},
  1,
  []], Arg5012_2])),
  (R1 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5017(Arg5016) {
  if (Arg5016.length < 1) return [shen_type_func, shen_user_lambda5017, 1, Arg5016];
  var Arg5016_0 = Arg5016[0];
  return (function() {
  return shenjs_call_tail(shen_gensym, [[shen_type_symbol, "shen-cl"]]);})},
  1,
  []], Arg5012_2])),
  (R2 = shenjs_call(shen_construct_search_literals, [R1, R0, [shen_type_symbol, "Context_1957"], [shen_type_symbol, "Context1_1957"]])),
  shenjs_call(shen_construct_search_clauses, [R1, Arg5012_2, R0]),
  (R1 = shenjs_call(shen_construct_side_literals, [Arg5012_0])),
  (R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5019(Arg5018) {
  if (Arg5018.length < 2) return [shen_type_func, shen_user_lambda5019, 2, Arg5018];
  var Arg5018_0 = Arg5018[0], Arg5018_1 = Arg5018[1];
  return (function() {
  return shenjs_call_tail(shen_construct_premiss_literal, [Arg5018_1, shenjs_empty$question$(Arg5018_0)]);})},
  2,
  [Arg5012_2]], Arg5012_1])),
  (function() {
  return shenjs_call_tail(shen_append, [R2, shenjs_call(shen_append, [R1, R0])]);}))},
  3,
  [],
  "shen-rule->horn-clause-body"];
shenjs_functions["shen_shen-rule->horn-clause-body"] = shen_rule_$gt$horn_clause_body;






shen_construct_search_literals = [shen_type_func,
  function shen_user_lambda5021(Arg5020) {
  if (Arg5020.length < 4) return [shen_type_func, shen_user_lambda5021, 4, Arg5020];
  var Arg5020_0 = Arg5020[0], Arg5020_1 = Arg5020[1], Arg5020_2 = Arg5020[2], Arg5020_3 = Arg5020[3];
  return (((shenjs_empty$question$(Arg5020_0) && shenjs_empty$question$(Arg5020_1)))
  ? []
  : (function() {
  return shenjs_call_tail(shen_csl_help, [Arg5020_0, Arg5020_1, Arg5020_2, Arg5020_3]);}))},
  4,
  [],
  "shen-construct-search-literals"];
shenjs_functions["shen_shen-construct-search-literals"] = shen_construct_search_literals;






shen_csl_help = [shen_type_func,
  function shen_user_lambda5023(Arg5022) {
  if (Arg5022.length < 4) return [shen_type_func, shen_user_lambda5023, 4, Arg5022];
  var Arg5022_0 = Arg5022[0], Arg5022_1 = Arg5022[1], Arg5022_2 = Arg5022[2], Arg5022_3 = Arg5022[3];
  return (((shenjs_empty$question$(Arg5022_0) && shenjs_empty$question$(Arg5022_1)))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, [shen_type_symbol, "ContextOut_1957"], [shen_type_cons, Arg5022_2, []]]], []]
  : (((shenjs_is_type(Arg5022_0, shen_type_cons) && shenjs_is_type(Arg5022_1, shen_type_cons)))
  ? [shen_type_cons, [shen_type_cons, Arg5022_0[1], [shen_type_cons, Arg5022_2, [shen_type_cons, Arg5022_3, Arg5022_1[1]]]], shenjs_call(shen_csl_help, [Arg5022_0[2], Arg5022_1[2], Arg5022_3, shenjs_call(shen_gensym, [[shen_type_symbol, "Context"]])])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-csl-help"]]);})))},
  4,
  [],
  "shen-csl-help"];
shenjs_functions["shen_shen-csl-help"] = shen_csl_help;






shen_construct_search_clauses = [shen_type_func,
  function shen_user_lambda5025(Arg5024) {
  if (Arg5024.length < 3) return [shen_type_func, shen_user_lambda5025, 3, Arg5024];
  var Arg5024_0 = Arg5024[0], Arg5024_1 = Arg5024[1], Arg5024_2 = Arg5024[2];
  return (((shenjs_empty$question$(Arg5024_0) && (shenjs_empty$question$(Arg5024_1) && shenjs_empty$question$(Arg5024_2))))
  ? [shen_type_symbol, "shen-skip"]
  : (((shenjs_is_type(Arg5024_0, shen_type_cons) && (shenjs_is_type(Arg5024_1, shen_type_cons) && shenjs_is_type(Arg5024_2, shen_type_cons))))
  ? (shenjs_call(shen_construct_search_clause, [Arg5024_0[1], Arg5024_1[1], Arg5024_2[1]]),
  (function() {
  return shenjs_call_tail(shen_construct_search_clauses, [Arg5024_0[2], Arg5024_1[2], Arg5024_2[2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-construct-search-clauses"]]);})))},
  3,
  [],
  "shen-construct-search-clauses"];
shenjs_functions["shen_shen-construct-search-clauses"] = shen_construct_search_clauses;






shen_construct_search_clause = [shen_type_func,
  function shen_user_lambda5027(Arg5026) {
  if (Arg5026.length < 3) return [shen_type_func, shen_user_lambda5027, 3, Arg5026];
  var Arg5026_0 = Arg5026[0], Arg5026_1 = Arg5026[1], Arg5026_2 = Arg5026[2];
  return (function() {
  return shenjs_call_tail(shen_s_prolog, [[shen_type_cons, shenjs_call(shen_construct_base_search_clause, [Arg5026_0, Arg5026_1, Arg5026_2]), [shen_type_cons, shenjs_call(shen_construct_recursive_search_clause, [Arg5026_0, Arg5026_1, Arg5026_2]), []]]]);})},
  3,
  [],
  "shen-construct-search-clause"];
shenjs_functions["shen_shen-construct-search-clause"] = shen_construct_search_clause;






shen_construct_base_search_clause = [shen_type_func,
  function shen_user_lambda5029(Arg5028) {
  if (Arg5028.length < 3) return [shen_type_func, shen_user_lambda5029, 3, Arg5028];
  var Arg5028_0 = Arg5028[0], Arg5028_1 = Arg5028[1], Arg5028_2 = Arg5028[2];
  return [shen_type_cons, [shen_type_cons, Arg5028_0, [shen_type_cons, [shen_type_cons, shenjs_call(shen_mode_ify, [Arg5028_1]), [shen_type_symbol, "In_1957"]], [shen_type_cons, [shen_type_symbol, "In_1957"], Arg5028_2]]], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [], []]]]},
  3,
  [],
  "shen-construct-base-search-clause"];
shenjs_functions["shen_shen-construct-base-search-clause"] = shen_construct_base_search_clause;






shen_construct_recursive_search_clause = [shen_type_func,
  function shen_user_lambda5031(Arg5030) {
  if (Arg5030.length < 3) return [shen_type_func, shen_user_lambda5031, 3, Arg5030];
  var Arg5030_0 = Arg5030[0], Arg5030_1 = Arg5030[1], Arg5030_2 = Arg5030[2];
  return [shen_type_cons, [shen_type_cons, Arg5030_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "Assumption_1957"], [shen_type_symbol, "Assumptions_1957"]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "Assumption_1957"], [shen_type_symbol, "Out_1957"]], Arg5030_2]]], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [shen_type_cons, [shen_type_cons, Arg5030_0, [shen_type_cons, [shen_type_symbol, "Assumptions_1957"], [shen_type_cons, [shen_type_symbol, "Out_1957"], Arg5030_2]]], []], []]]]},
  3,
  [],
  "shen-construct-recursive-search-clause"];
shenjs_functions["shen_shen-construct-recursive-search-clause"] = shen_construct_recursive_search_clause;






shen_construct_side_literals = [shen_type_func,
  function shen_user_lambda5033(Arg5032) {
  if (Arg5032.length < 1) return [shen_type_func, shen_user_lambda5033, 1, Arg5032];
  var Arg5032_0 = Arg5032[0];
  return ((shenjs_empty$question$(Arg5032_0))
  ? []
  : (((shenjs_is_type(Arg5032_0, shen_type_cons) && (shenjs_is_type(Arg5032_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "if"], Arg5032_0[1][1])) && (shenjs_is_type(Arg5032_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg5032_0[1][2][2]))))))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "when"], Arg5032_0[1][2]], shenjs_call(shen_construct_side_literals, [Arg5032_0[2]])]
  : (((shenjs_is_type(Arg5032_0, shen_type_cons) && (shenjs_is_type(Arg5032_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg5032_0[1][1])) && (shenjs_is_type(Arg5032_0[1][2], shen_type_cons) && (shenjs_is_type(Arg5032_0[1][2][2], shen_type_cons) && shenjs_empty$question$(Arg5032_0[1][2][2][2])))))))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "is"], Arg5032_0[1][2]], shenjs_call(shen_construct_side_literals, [Arg5032_0[2]])]
  : ((shenjs_is_type(Arg5032_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_construct_side_literals, [Arg5032_0[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-construct-side-literals"]]);})))))},
  1,
  [],
  "shen-construct-side-literals"];
shenjs_functions["shen_shen-construct-side-literals"] = shen_construct_side_literals;






shen_construct_premiss_literal = [shen_type_func,
  function shen_user_lambda5035(Arg5034) {
  if (Arg5034.length < 2) return [shen_type_func, shen_user_lambda5035, 2, Arg5034];
  var Arg5034_0 = Arg5034[0], Arg5034_1 = Arg5034[1];
  return ((shenjs_is_type(Arg5034_0, shen_tuple))
  ? [shen_type_cons, [shen_type_symbol, "shen-t*"], [shen_type_cons, shenjs_call(shen_recursive$_cons$_form, [shenjs_call(shen_snd, [Arg5034_0])]), [shen_type_cons, shenjs_call(shen_construct_context, [Arg5034_1, shenjs_call(shen_fst, [Arg5034_0])]), []]]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "!"], Arg5034_0)))
  ? [shen_type_cons, [shen_type_symbol, "cut"], [shen_type_cons, [shen_type_symbol, "Throwcontrol"], []]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-construct-premiss-literal"]]);})))},
  2,
  [],
  "shen-construct-premiss-literal"];
shenjs_functions["shen_shen-construct-premiss-literal"] = shen_construct_premiss_literal;






shen_construct_context = [shen_type_func,
  function shen_user_lambda5037(Arg5036) {
  if (Arg5036.length < 2) return [shen_type_func, shen_user_lambda5037, 2, Arg5036];
  var Arg5036_0 = Arg5036[0], Arg5036_1 = Arg5036[1];
  return (((shenjs_unwind_tail(shenjs_$eq$(true, Arg5036_0)) && shenjs_empty$question$(Arg5036_1)))
  ? [shen_type_symbol, "Context_1957"]
  : (((shenjs_unwind_tail(shenjs_$eq$(false, Arg5036_0)) && shenjs_empty$question$(Arg5036_1)))
  ? [shen_type_symbol, "ContextOut_1957"]
  : ((shenjs_is_type(Arg5036_1, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, shenjs_call(shen_recursive$_cons$_form, [Arg5036_1[1]]), [shen_type_cons, shenjs_call(shen_construct_context, [Arg5036_0, Arg5036_1[2]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-construct-context"]]);}))))},
  2,
  [],
  "shen-construct-context"];
shenjs_functions["shen_shen-construct-context"] = shen_construct_context;






shen_recursive$_cons$_form = [shen_type_func,
  function shen_user_lambda5039(Arg5038) {
  if (Arg5038.length < 1) return [shen_type_func, shen_user_lambda5039, 1, Arg5038];
  var Arg5038_0 = Arg5038[0];
  return ((shenjs_is_type(Arg5038_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, shenjs_call(shen_recursive$_cons$_form, [Arg5038_0[1]]), [shen_type_cons, shenjs_call(shen_recursive$_cons$_form, [Arg5038_0[2]]), []]]]
  : Arg5038_0)},
  1,
  [],
  "shen-recursive_cons_form"];
shenjs_functions["shen_shen-recursive_cons_form"] = shen_recursive$_cons$_form;






shen_preclude = [shen_type_func,
  function shen_user_lambda5041(Arg5040) {
  if (Arg5040.length < 1) return [shen_type_func, shen_user_lambda5041, 1, Arg5040];
  var Arg5040_0 = Arg5040[0];
  return ((shenjs_globals["shen_shen-*datatypes*"] = shenjs_call(shen_difference, [(shenjs_globals["shen_shen-*datatypes*"]), Arg5040_0])),
  (shenjs_globals["shen_shen-*datatypes*"]))},
  1,
  [],
  "preclude"];
shenjs_functions["shen_preclude"] = shen_preclude;






shen_include = [shen_type_func,
  function shen_user_lambda5043(Arg5042) {
  if (Arg5042.length < 1) return [shen_type_func, shen_user_lambda5043, 1, Arg5042];
  var Arg5042_0 = Arg5042[0];
  var R0;
  return ((R0 = shenjs_call(shen_intersection, [Arg5042_0, (shenjs_globals["shen_shen-*alldatatypes*"])])),
  (shenjs_globals["shen_shen-*datatypes*"] = shenjs_call(shen_union, [R0, (shenjs_globals["shen_shen-*datatypes*"])])),
  (shenjs_globals["shen_shen-*datatypes*"]))},
  1,
  [],
  "include"];
shenjs_functions["shen_include"] = shen_include;






shen_preclude_all_but = [shen_type_func,
  function shen_user_lambda5045(Arg5044) {
  if (Arg5044.length < 1) return [shen_type_func, shen_user_lambda5045, 1, Arg5044];
  var Arg5044_0 = Arg5044[0];
  return (function() {
  return shenjs_call_tail(shen_preclude, [shenjs_call(shen_difference, [(shenjs_globals["shen_shen-*alldatatypes*"]), Arg5044_0])]);})},
  1,
  [],
  "preclude-all-but"];
shenjs_functions["shen_preclude-all-but"] = shen_preclude_all_but;






shen_include_all_but = [shen_type_func,
  function shen_user_lambda5047(Arg5046) {
  if (Arg5046.length < 1) return [shen_type_func, shen_user_lambda5047, 1, Arg5046];
  var Arg5046_0 = Arg5046[0];
  return (function() {
  return shenjs_call_tail(shen_include, [shenjs_call(shen_difference, [(shenjs_globals["shen_shen-*alldatatypes*"]), Arg5046_0])]);})},
  1,
  [],
  "include-all-but"];
shenjs_functions["shen_include-all-but"] = shen_include_all_but;






shen_synonyms_help = [shen_type_func,
  function shen_user_lambda5049(Arg5048) {
  if (Arg5048.length < 1) return [shen_type_func, shen_user_lambda5049, 1, Arg5048];
  var Arg5048_0 = Arg5048[0];
  return ((shenjs_empty$question$(Arg5048_0))
  ? [shen_type_symbol, "synonyms"]
  : (((shenjs_is_type(Arg5048_0, shen_type_cons) && shenjs_is_type(Arg5048_0[2], shen_type_cons)))
  ? (shenjs_call(shen_pushnew, [[shen_type_cons, Arg5048_0[1], Arg5048_0[2][1]], [shen_type_symbol, "shen-*synonyms*"]]),
  (function() {
  return shenjs_call_tail(shen_synonyms_help, [Arg5048_0[2][2]]);}))
  : (function() {
  return shenjs_call_tail(shen_interror, ["odd number of synonyms~%", [shen_tuple, [], []]]);})))},
  1,
  [],
  "shen-synonyms-help"];
shenjs_functions["shen_shen-synonyms-help"] = shen_synonyms_help;






shen_pushnew = [shen_type_func,
  function shen_user_lambda5051(Arg5050) {
  if (Arg5050.length < 2) return [shen_type_func, shen_user_lambda5051, 2, Arg5050];
  var Arg5050_0 = Arg5050[0], Arg5050_1 = Arg5050[1];
  return ((shenjs_call(shen_element$question$, [Arg5050_0, (shenjs_globals["shen_" + Arg5050_1[1]])]))
  ? (shenjs_globals["shen_" + Arg5050_1[1]])
  : (shenjs_globals["shen_" + Arg5050_1[1]] = [shen_type_cons, Arg5050_0, (shenjs_globals["shen_" + Arg5050_1[1]])]))},
  2,
  [],
  "shen-pushnew"];
shenjs_functions["shen_shen-pushnew"] = shen_pushnew;












shen_yacc = [shen_type_func,
  function shen_user_lambda6015(Arg6014) {
  if (Arg6014.length < 1) return [shen_type_func, shen_user_lambda6015, 1, Arg6014];
  var Arg6014_0 = Arg6014[0];
  return (((shenjs_is_type(Arg6014_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defcc"], Arg6014_0[1])) && shenjs_is_type(Arg6014_0[2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_yacc_$gt$shen, [Arg6014_0[2][1], Arg6014_0[2][2], shenjs_call(shen_extract_segvars, [Arg6014_0[2][2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-yacc"]]);}))},
  1,
  [],
  "shen-yacc"];
shenjs_functions["shen_shen-yacc"] = shen_yacc;






shen_extract_segvars = [shen_type_func,
  function shen_user_lambda6017(Arg6016) {
  if (Arg6016.length < 1) return [shen_type_func, shen_user_lambda6017, 1, Arg6016];
  var Arg6016_0 = Arg6016[0];
  return ((shenjs_call(shen_segvar$question$, [Arg6016_0]))
  ? [shen_type_cons, Arg6016_0, []]
  : ((shenjs_is_type(Arg6016_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_union, [shenjs_call(shen_extract_segvars, [Arg6016_0[1]]), shenjs_call(shen_extract_segvars, [Arg6016_0[2]])]);})
  : []))},
  1,
  [],
  "shen-extract-segvars"];
shenjs_functions["shen_shen-extract-segvars"] = shen_extract_segvars;






shen_yacc_$gt$shen = [shen_type_func,
  function shen_user_lambda6019(Arg6018) {
  if (Arg6018.length < 3) return [shen_type_func, shen_user_lambda6019, 3, Arg6018];
  var Arg6018_0 = Arg6018[0], Arg6018_1 = Arg6018[1], Arg6018_2 = Arg6018[2];
  var R0;
  return ((R0 = [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg6018_0, shenjs_call(shen_yacc$_cases, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda6021(Arg6020) {
  if (Arg6020.length < 1) return [shen_type_func, shen_user_lambda6021, 1, Arg6020];
  var Arg6020_0 = Arg6020[0];
  return (function() {
  return shenjs_call_tail(shen_cc$_body, [Arg6020_0]);})},
  1,
  []], shenjs_call(shen_split$_cc$_rules, [Arg6018_1, []])])])]]),
  ((shenjs_empty$question$(Arg6018_2))
  ? R0
  : [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, [shen_type_symbol, "null"], [shen_type_cons, [], [shen_type_cons, R0, shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda6023(Arg6022) {
  if (Arg6022.length < 1) return [shen_type_func, shen_user_lambda6023, 1, Arg6022];
  var Arg6022_0 = Arg6022[0];
  return (function() {
  return shenjs_call_tail(shen_segdef, [Arg6022_0]);})},
  1,
  []], Arg6018_2])]]]]))},
  3,
  [],
  "shen-yacc->shen"];
shenjs_functions["shen_shen-yacc->shen"] = shen_yacc_$gt$shen;






shen_segdef = [shen_type_func,
  function shen_user_lambda6025(Arg6024) {
  if (Arg6024.length < 1) return [shen_type_func, shen_user_lambda6025, 1, Arg6024];
  var Arg6024_0 = Arg6024[0];
  return [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg6024_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "In"], [shen_type_cons, [shen_type_symbol, "Out"], []]]], [shen_type_cons, [shen_type_symbol, "Continuation"], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Continue"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "Continuation"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "reverse"], [shen_type_cons, [shen_type_symbol, "Out"], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "In"], [shen_type_cons, [], []]]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "Continue"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_symbol, "In"], []]], []]]], [shen_type_cons, [shen_type_cons, Arg6024_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_symbol, "In"], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_symbol, "In"], []]], [shen_type_cons, [shen_type_symbol, "Out"], []]]], []]]], [shen_type_cons, [shen_type_symbol, "Continuation"], []]]], [shen_type_cons, [shen_type_symbol, "Continue"], []]]]], []]]]], []]]]]]]},
  1,
  [],
  "shen-segdef"];
shenjs_functions["shen_shen-segdef"] = shen_segdef;






shen_yacc$_cases = [shen_type_func,
  function shen_user_lambda6027(Arg6026) {
  if (Arg6026.length < 1) return [shen_type_func, shen_user_lambda6027, 1, Arg6026];
  var Arg6026_0 = Arg6026[0];
  return (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(shen_mapcan, [[shen_type_func,
  function shen_user_lambda6029(Arg6028) {
  if (Arg6028.length < 1) return [shen_type_func, shen_user_lambda6029, 1, Arg6028];
  var Arg6028_0 = Arg6028[0];
  return [shen_type_cons, [shen_type_symbol, "Stream"], [shen_type_cons, [shen_type_symbol, "<-"], [shen_type_cons, Arg6028_0, []]]]},
  1,
  []], Arg6026_0]), [shen_type_cons, [shen_type_symbol, "_"], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]]]]);})},
  1,
  [],
  "shen-yacc_cases"];
shenjs_functions["shen_shen-yacc_cases"] = shen_yacc$_cases;






shen_first$_n = [shen_type_func,
  function shen_user_lambda6031(Arg6030) {
  if (Arg6030.length < 2) return [shen_type_func, shen_user_lambda6031, 2, Arg6030];
  var Arg6030_0 = Arg6030[0], Arg6030_1 = Arg6030[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg6030_0)))
  ? []
  : ((shenjs_empty$question$(Arg6030_1))
  ? []
  : ((shenjs_is_type(Arg6030_1, shen_type_cons))
  ? [shen_type_cons, Arg6030_1[1], shenjs_call(shen_first$_n, [(Arg6030_0 - 1), Arg6030_1[2]])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-first_n"]]);}))))},
  2,
  [],
  "shen-first_n"];
shenjs_functions["shen_shen-first_n"] = shen_first$_n;






shen_split$_cc$_rules = [shen_type_func,
  function shen_user_lambda6033(Arg6032) {
  if (Arg6032.length < 2) return [shen_type_func, shen_user_lambda6033, 2, Arg6032];
  var Arg6032_0 = Arg6032[0], Arg6032_1 = Arg6032[1];
  return (((shenjs_empty$question$(Arg6032_0) && shenjs_empty$question$(Arg6032_1)))
  ? []
  : ((shenjs_empty$question$(Arg6032_0))
  ? [shen_type_cons, shenjs_call(shen_split$_cc$_rule, [shenjs_call(shen_reverse, [Arg6032_1]), []]), []]
  : (((shenjs_is_type(Arg6032_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ";"], Arg6032_0[1]))))
  ? [shen_type_cons, shenjs_call(shen_split$_cc$_rule, [shenjs_call(shen_reverse, [Arg6032_1]), []]), shenjs_call(shen_split$_cc$_rules, [Arg6032_0[2], []])]
  : ((shenjs_is_type(Arg6032_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_split$_cc$_rules, [Arg6032_0[2], [shen_type_cons, Arg6032_0[1], Arg6032_1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-split_cc_rules"]]);})))))},
  2,
  [],
  "shen-split_cc_rules"];
shenjs_functions["shen_shen-split_cc_rules"] = shen_split$_cc$_rules;






shen_split$_cc$_rule = [shen_type_func,
  function shen_user_lambda6035(Arg6034) {
  if (Arg6034.length < 2) return [shen_type_func, shen_user_lambda6035, 2, Arg6034];
  var Arg6034_0 = Arg6034[0], Arg6034_1 = Arg6034[1];
  return (((shenjs_is_type(Arg6034_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":="], Arg6034_0[1])) && (shenjs_is_type(Arg6034_0[2], shen_type_cons) && shenjs_empty$question$(Arg6034_0[2][2])))))
  ? [shen_type_cons, shenjs_call(shen_reverse, [Arg6034_1]), Arg6034_0[2]]
  : (((shenjs_is_type(Arg6034_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":="], Arg6034_0[1]))))
  ? [shen_type_cons, shenjs_call(shen_reverse, [Arg6034_1]), [shen_type_cons, shenjs_call(shen_cons$_form, [Arg6034_0[2]]), []]]
  : ((shenjs_empty$question$(Arg6034_0))
  ? (shenjs_call(shen_intoutput, ["warning: ", []]),
  shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda6037(Arg6036) {
  if (Arg6036.length < 1) return [shen_type_func, shen_user_lambda6037, 1, Arg6036];
  var Arg6036_0 = Arg6036[0];
  return (function() {
  return shenjs_call_tail(shen_intoutput, ["~A ", [shen_tuple, Arg6036_0, []]]);})},
  1,
  []], shenjs_call(shen_reverse, [Arg6034_1])]),
  shenjs_call(shen_intoutput, ["has no semantics.~%", []]),
  (function() {
  return shenjs_call_tail(shen_split$_cc$_rule, [[shen_type_cons, [shen_type_symbol, ":="], [shen_type_cons, shenjs_call(shen_default$_semantics, [shenjs_call(shen_reverse, [Arg6034_1])]), []]], Arg6034_1]);}))
  : ((shenjs_is_type(Arg6034_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_split$_cc$_rule, [Arg6034_0[2], [shen_type_cons, Arg6034_0[1], Arg6034_1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-split_cc_rule"]]);})))))},
  2,
  [],
  "shen-split_cc_rule"];
shenjs_functions["shen_shen-split_cc_rule"] = shen_split$_cc$_rule;






shen_default$_semantics = [shen_type_func,
  function shen_user_lambda6039(Arg6038) {
  if (Arg6038.length < 1) return [shen_type_func, shen_user_lambda6039, 1, Arg6038];
  var Arg6038_0 = Arg6038[0];
  var R0;
  return ((shenjs_empty$question$(Arg6038_0))
  ? []
  : (((shenjs_is_type(Arg6038_0, shen_type_cons) && shenjs_call(shen_grammar$_symbol$question$, [Arg6038_0[1]])))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg6038_0[1]]), []]]),
  ((shenjs_empty$question$(Arg6038_0[2]))
  ? R0
  : [shen_type_cons, [shen_type_symbol, "append"], [shen_type_cons, R0, [shen_type_cons, shenjs_call(shen_default$_semantics, [Arg6038_0[2]]), []]]]))
  : ((shenjs_is_type(Arg6038_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, Arg6038_0[1], [shen_type_cons, shenjs_call(shen_default$_semantics, [Arg6038_0[2]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-default_semantics"]]);}))))},
  1,
  [],
  "shen-default_semantics"];
shenjs_functions["shen_shen-default_semantics"] = shen_default$_semantics;






shen_cc$_body = [shen_type_func,
  function shen_user_lambda6041(Arg6040) {
  if (Arg6040.length < 1) return [shen_type_func, shen_user_lambda6041, 1, Arg6040];
  var Arg6040_0 = Arg6040[0];
  return (((shenjs_is_type(Arg6040_0, shen_type_cons) && (shenjs_is_type(Arg6040_0[2], shen_type_cons) && shenjs_empty$question$(Arg6040_0[2][2]))))
  ? (function() {
  return shenjs_call_tail(shen_syntax, [Arg6040_0[1], [shen_type_symbol, "Stream"], Arg6040_0[2][1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-cc_body"]]);}))},
  1,
  [],
  "shen-cc_body"];
shenjs_functions["shen_shen-cc_body"] = shen_cc$_body;






shen_syntax = [shen_type_func,
  function shen_user_lambda6043(Arg6042) {
  if (Arg6042.length < 3) return [shen_type_func, shen_user_lambda6043, 3, Arg6042];
  var Arg6042_0 = Arg6042[0], Arg6042_1 = Arg6042[1], Arg6042_2 = Arg6042[2];
  return ((shenjs_empty$question$(Arg6042_0))
  ? [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6042_1, []]], [shen_type_cons, shenjs_call(shen_semantics, [Arg6042_2]), []]]]
  : ((shenjs_is_type(Arg6042_0, shen_type_cons))
  ? ((shenjs_call(shen_grammar$_symbol$question$, [Arg6042_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_recursive$_descent, [Arg6042_0, Arg6042_1, Arg6042_2]);})
  : ((shenjs_call(shen_segvar$question$, [Arg6042_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_segment_match, [Arg6042_0, Arg6042_1, Arg6042_2]);})
  : ((shenjs_call(shen_terminal$question$, [Arg6042_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_check$_stream, [Arg6042_0, Arg6042_1, Arg6042_2]);})
  : ((shenjs_call(shen_jump$_stream$question$, [Arg6042_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_jump$_stream, [Arg6042_0, Arg6042_1, Arg6042_2]);})
  : ((shenjs_call(shen_list$_stream$question$, [Arg6042_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_list$_stream, [shenjs_call(shen_decons, [Arg6042_0[1]]), Arg6042_0[2], Arg6042_1, Arg6042_2]);})
  : (function() {
  return shenjs_call_tail(shen_interror, ["~A is not legal syntax~%", [shen_tuple, Arg6042_0[1], []]]);}))))))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-syntax"]]);})))},
  3,
  [],
  "shen-syntax"];
shenjs_functions["shen_shen-syntax"] = shen_syntax;






shen_list$_stream$question$ = [shen_type_func,
  function shen_user_lambda6045(Arg6044) {
  if (Arg6044.length < 1) return [shen_type_func, shen_user_lambda6045, 1, Arg6044];
  var Arg6044_0 = Arg6044[0];
  return ((shenjs_is_type(Arg6044_0, shen_type_cons))
  ? true
  : false)},
  1,
  [],
  "shen-list_stream?"];
shenjs_functions["shen_shen-list_stream?"] = shen_list$_stream$question$;






shen_decons = [shen_type_func,
  function shen_user_lambda6047(Arg6046) {
  if (Arg6046.length < 1) return [shen_type_func, shen_user_lambda6047, 1, Arg6046];
  var Arg6046_0 = Arg6046[0];
  return (((shenjs_is_type(Arg6046_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg6046_0[1])) && (shenjs_is_type(Arg6046_0[2], shen_type_cons) && (shenjs_is_type(Arg6046_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg6046_0[2][2][2]))))))
  ? [shen_type_cons, Arg6046_0[2][1], shenjs_call(shen_decons, [Arg6046_0[2][2][1]])]
  : Arg6046_0)},
  1,
  [],
  "shen-decons"];
shenjs_functions["shen_shen-decons"] = shen_decons;






shen_list$_stream = [shen_type_func,
  function shen_user_lambda6049(Arg6048) {
  if (Arg6048.length < 4) return [shen_type_func, shen_user_lambda6049, 4, Arg6048];
  var Arg6048_0 = Arg6048[0], Arg6048_1 = Arg6048[1], Arg6048_2 = Arg6048[2], Arg6048_3 = Arg6048[3];
  var R0, R1, R2;
  return ((R0 = [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6048_2, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6048_2, []]], []]], []]], []]]]),
  (R1 = [shen_type_cons, [shen_type_symbol, "shen-snd-or-fail"], [shen_type_cons, shenjs_call(shen_syntax, [Arg6048_0, [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6048_2, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, Arg6048_2, []]], []]]], [shen_type_cons, [shen_type_symbol, "shen-leave!"], [shen_type_cons, shenjs_call(shen_syntax, [Arg6048_1, [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6048_2, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, Arg6048_2, []]], []]]], Arg6048_3]), []]]]), []]]),
  (R2 = [shen_type_cons, [shen_type_symbol, "fail"], []]),
  [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, R0, [shen_type_cons, R1, [shen_type_cons, R2, []]]]])},
  4,
  [],
  "shen-list_stream"];
shenjs_functions["shen_shen-list_stream"] = shen_list$_stream;






shen_snd_or_fail = [shen_type_func,
  function shen_user_lambda6051(Arg6050) {
  if (Arg6050.length < 1) return [shen_type_func, shen_user_lambda6051, 1, Arg6050];
  var Arg6050_0 = Arg6050[0];
  return ((shenjs_is_type(Arg6050_0, shen_tuple))
  ? (function() {
  return shenjs_call_tail(shen_snd, [Arg6050_0]);})
  : shen_fail_obj)},
  1,
  [],
  "shen-snd-or-fail"];
shenjs_functions["shen_shen-snd-or-fail"] = shen_snd_or_fail;






shen_grammar$_symbol$question$ = [shen_type_func,
  function shen_user_lambda6053(Arg6052) {
  if (Arg6052.length < 1) return [shen_type_func, shen_user_lambda6053, 1, Arg6052];
  var Arg6052_0 = Arg6052[0];
  var R0;
  return (shenjs_is_type(Arg6052_0, shen_type_symbol) && ((R0 = shenjs_call(shen_explode, [Arg6052_0])),
  (shenjs_unwind_tail(shenjs_$eq$(R0[1], "<")) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_reverse, [R0])[1], ">")))))},
  1,
  [],
  "shen-grammar_symbol?"];
shenjs_functions["shen_shen-grammar_symbol?"] = shen_grammar$_symbol$question$;






shen_recursive$_descent = [shen_type_func,
  function shen_user_lambda6055(Arg6054) {
  if (Arg6054.length < 3) return [shen_type_func, shen_user_lambda6055, 3, Arg6054];
  var Arg6054_0 = Arg6054[0], Arg6054_1 = Arg6054[1], Arg6054_2 = Arg6054[2];
  var R0, R1, R2;
  return ((shenjs_is_type(Arg6054_0, shen_type_cons))
  ? ((R0 = [shen_type_cons, Arg6054_0[1], [shen_type_cons, Arg6054_1, []]]),
  (R1 = shenjs_call(shen_syntax, [Arg6054_0[2], shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg6054_0[1]]), Arg6054_2])),
  (R2 = [shen_type_cons, [shen_type_symbol, "fail"], []]),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg6054_0[1]]), [shen_type_cons, R0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], [shen_type_cons, shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg6054_0[1]]), []]]], []]], [shen_type_cons, R1, [shen_type_cons, R2, []]]]], []]]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-recursive_descent"]]);}))},
  3,
  [],
  "shen-recursive_descent"];
shenjs_functions["shen_shen-recursive_descent"] = shen_recursive$_descent;






shen_segvar$question$ = [shen_type_func,
  function shen_user_lambda6057(Arg6056) {
  if (Arg6056.length < 1) return [shen_type_func, shen_user_lambda6057, 1, Arg6056];
  var Arg6056_0 = Arg6056[0];
  return (shenjs_is_type(Arg6056_0, shen_type_symbol) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_explode, [Arg6056_0])[1], "?")))},
  1,
  [],
  "shen-segvar?"];
shenjs_functions["shen_shen-segvar?"] = shen_segvar$question$;






shen_segment_match = [shen_type_func,
  function shen_user_lambda6059(Arg6058) {
  if (Arg6058.length < 3) return [shen_type_func, shen_user_lambda6059, 3, Arg6058];
  var Arg6058_0 = Arg6058[0], Arg6058_1 = Arg6058[1], Arg6058_2 = Arg6058[2];
  var R0;
  return ((shenjs_is_type(Arg6058_0, shen_type_cons))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, Arg6058_0[1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, [shen_type_symbol, "Restart"], [shen_type_cons, shenjs_call(shen_syntax, [Arg6058_0[2], [shen_type_symbol, "Restart"], Arg6058_2]), []]]], []]]]),
  [shen_type_cons, Arg6058_0[1], [shen_type_cons, Arg6058_1, [shen_type_cons, R0, []]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-segment-match"]]);}))},
  3,
  [],
  "shen-segment-match"];
shenjs_functions["shen_shen-segment-match"] = shen_segment_match;






shen_terminal$question$ = [shen_type_func,
  function shen_user_lambda6061(Arg6060) {
  if (Arg6060.length < 1) return [shen_type_func, shen_user_lambda6061, 1, Arg6060];
  var Arg6060_0 = Arg6060[0];
  return ((shenjs_is_type(Arg6060_0, shen_type_cons))
  ? false
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-*-"], Arg6060_0)))
  ? false
  : true))},
  1,
  [],
  "shen-terminal?"];
shenjs_functions["shen_shen-terminal?"] = shen_terminal$question$;






shen_jump$_stream$question$ = [shen_type_func,
  function shen_user_lambda6063(Arg6062) {
  if (Arg6062.length < 1) return [shen_type_func, shen_user_lambda6063, 1, Arg6062];
  var Arg6062_0 = Arg6062[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-*-"], Arg6062_0)))
  ? true
  : false)},
  1,
  [],
  "shen-jump_stream?"];
shenjs_functions["shen_shen-jump_stream?"] = shen_jump$_stream$question$;






shen_check$_stream = [shen_type_func,
  function shen_user_lambda6065(Arg6064) {
  if (Arg6064.length < 3) return [shen_type_func, shen_user_lambda6065, 3, Arg6064];
  var Arg6064_0 = Arg6064[0], Arg6064_1 = Arg6064[1], Arg6064_2 = Arg6064[2];
  var R0, R1, R2;
  return ((shenjs_is_type(Arg6064_0, shen_type_cons))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6064_1, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, Arg6064_0[1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6064_1, []]], []]], []]]], []]]]),
  (R1 = shenjs_call(shen_syntax, [Arg6064_0[2], [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6064_1, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, Arg6064_1, []]], []]]], Arg6064_2])),
  (R2 = [shen_type_cons, [shen_type_symbol, "fail"], []]),
  [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, R0, [shen_type_cons, R1, [shen_type_cons, R2, []]]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-check_stream"]]);}))},
  3,
  [],
  "shen-check_stream"];
shenjs_functions["shen_shen-check_stream"] = shen_check$_stream;






shen_reassemble = [shen_type_func,
  function shen_user_lambda6067(Arg6066) {
  if (Arg6066.length < 2) return [shen_type_func, shen_user_lambda6067, 2, Arg6066];
  var Arg6066_0 = Arg6066[0], Arg6066_1 = Arg6066[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg6066_1, shen_fail_obj)))
  ? Arg6066_1
  : [shen_tuple, Arg6066_0, Arg6066_1])},
  2,
  [],
  "shen-reassemble"];
shenjs_functions["shen_shen-reassemble"] = shen_reassemble;






shen_jump$_stream = [shen_type_func,
  function shen_user_lambda6069(Arg6068) {
  if (Arg6068.length < 3) return [shen_type_func, shen_user_lambda6069, 3, Arg6068];
  var Arg6068_0 = Arg6068[0], Arg6068_1 = Arg6068[1], Arg6068_2 = Arg6068[2];
  var R0, R1, R2;
  return ((shenjs_is_type(Arg6068_0, shen_type_cons))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6068_1, []]], []]]),
  (R1 = shenjs_call(shen_syntax, [Arg6068_0[2], [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6068_1, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, Arg6068_1, []]], []]]], Arg6068_2])),
  (R2 = [shen_type_cons, [shen_type_symbol, "fail"], []]),
  [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, R0, [shen_type_cons, R1, [shen_type_cons, R2, []]]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-jump_stream"]]);}))},
  3,
  [],
  "shen-jump_stream"];
shenjs_functions["shen_shen-jump_stream"] = shen_jump$_stream;






shen_semantics = [shen_type_func,
  function shen_user_lambda6071(Arg6070) {
  if (Arg6070.length < 1) return [shen_type_func, shen_user_lambda6071, 1, Arg6070];
  var Arg6070_0 = Arg6070[0];
  return (((shenjs_is_type(Arg6070_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-leave!"], Arg6070_0[1])) && (shenjs_is_type(Arg6070_0[2], shen_type_cons) && shenjs_empty$question$(Arg6070_0[2][2])))))
  ? Arg6070_0[2][1]
  : ((shenjs_empty$question$(Arg6070_0))
  ? []
  : ((shenjs_call(shen_grammar$_symbol$question$, [Arg6070_0]))
  ? [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg6070_0]), []]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-o-"], Arg6070_0)))
  ? [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, [shen_type_symbol, "Stream"], []]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-*-"], Arg6070_0)))
  ? [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, [shen_type_symbol, "Stream"], []]], []]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-s-"], Arg6070_0)))
  ? [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, [shen_type_symbol, "Stream"], []]]
  : ((shenjs_is_type(Arg6070_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda6073(Arg6072) {
  if (Arg6072.length < 1) return [shen_type_func, shen_user_lambda6073, 1, Arg6072];
  var Arg6072_0 = Arg6072[0];
  return (function() {
  return shenjs_call_tail(shen_semantics, [Arg6072_0]);})},
  1,
  []], Arg6070_0]);})
  : Arg6070_0)))))))},
  1,
  [],
  "shen-semantics"];
shenjs_functions["shen_shen-semantics"] = shen_semantics;






shen_$lt$$excl$$gt$ = [shen_type_func,
  function shen_user_lambda6075(Arg6074) {
  if (Arg6074.length < 1) return [shen_type_func, shen_user_lambda6075, 1, Arg6074];
  var Arg6074_0 = Arg6074[0];
  return ((shenjs_is_type(Arg6074_0, shen_tuple))
  ? [shen_tuple, [], shenjs_call(shen_fst, [Arg6074_0])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "<!>"]]);}))},
  1,
  [],
  "<!>"];
shenjs_functions["shen_<!>"] = shen_$lt$$excl$$gt$;












shen_print = [shen_type_func,
  function shen_user_lambda5978(Arg5977) {
  if (Arg5977.length < 1) return [shen_type_func, shen_user_lambda5978, 1, Arg5977];
  var Arg5977_0 = Arg5977[0];
  return (shenjs_pr(shenjs_call(shen_ms_h, [[shen_type_cons, "~", [shen_type_cons, "S", []]], [shen_tuple, Arg5977_0, [shen_type_symbol, "shen-skip"]]]), shenjs_call(shen_stoutput, [0])),
  Arg5977_0)},
  1,
  [],
  "print"];
shenjs_functions["shen_print"] = shen_print;






shen_format = [shen_type_func,
  function shen_user_lambda5980(Arg5979) {
  if (Arg5979.length < 3) return [shen_type_func, shen_user_lambda5980, 3, Arg5979];
  var Arg5979_0 = Arg5979[0], Arg5979_1 = Arg5979[1], Arg5979_2 = Arg5979[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg5979_0)))
  ? (function() {
  return shenjs_call_tail(shen_intoutput, [Arg5979_1, [shen_tuple, Arg5979_2, []]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg5979_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, [Arg5979_1, [shen_tuple, Arg5979_2, []]]);})
  : (function() {
  return shenjs_pr(shenjs_call(shen_ms_h, [shenjs_call(shen_explode, [Arg5979_1]), Arg5979_2]), Arg5979_0);})))},
  3,
  [],
  "format"];
shenjs_functions["shen_format"] = shen_format;






shen_intoutput = [shen_type_func,
  function shen_user_lambda5982(Arg5981) {
  if (Arg5981.length < 2) return [shen_type_func, shen_user_lambda5982, 2, Arg5981];
  var Arg5981_0 = Arg5981[0], Arg5981_1 = Arg5981[1];
  return ((shenjs_unwind_tail(shenjs_$eq$((shenjs_globals["shen_shen-*hush*"]), "Shen hushed")))
  ? "Shen hushed"
  : ((shenjs_unwind_tail(shenjs_$eq$("Shen unhushed", Arg5981_0)))
  ? "Shen unhushed"
  : (function() {
  return shenjs_pr(shenjs_call(shen_ms_h, [shenjs_call(shen_explode_string, [Arg5981_0]), Arg5981_1]), shenjs_call(shen_stoutput, [0]));})))},
  2,
  [],
  "intoutput"];
shenjs_functions["shen_intoutput"] = shen_intoutput;






shen_interror = [shen_type_func,
  function shen_user_lambda5984(Arg5983) {
  if (Arg5983.length < 2) return [shen_type_func, shen_user_lambda5984, 2, Arg5983];
  var Arg5983_0 = Arg5983[0], Arg5983_1 = Arg5983[1];
  return (function() {
  return shenjs_simple_error(shenjs_call(shen_ms_h, [shenjs_call(shen_explode_string, [Arg5983_0]), Arg5983_1]));})},
  2,
  [],
  "interror"];
shenjs_functions["shen_interror"] = shen_interror;






shen_intmake_string = [shen_type_func,
  function shen_user_lambda5986(Arg5985) {
  if (Arg5985.length < 2) return [shen_type_func, shen_user_lambda5986, 2, Arg5985];
  var Arg5985_0 = Arg5985[0], Arg5985_1 = Arg5985[1];
  return (function() {
  return shenjs_call_tail(shen_ms_h, [shenjs_call(shen_explode_string, [Arg5985_0]), Arg5985_1]);})},
  2,
  [],
  "intmake-string"];
shenjs_functions["shen_intmake-string"] = shen_intmake_string;






shen_ms_h = [shen_type_func,
  function shen_user_lambda5988(Arg5987) {
  if (Arg5987.length < 2) return [shen_type_func, shen_user_lambda5988, 2, Arg5987];
  var Arg5987_0 = Arg5987[0], Arg5987_1 = Arg5987[1];
  return ((shenjs_empty$question$(Arg5987_0))
  ? ""
  : (((shenjs_is_type(Arg5987_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$("~", Arg5987_0[1])) && (shenjs_is_type(Arg5987_0[2], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("%", Arg5987_0[2][1]))))))
  ? (shenjs_n_$gt$string(10) + shenjs_call(shen_ms_h, [Arg5987_0[2][2], Arg5987_1]))
  : (((shenjs_is_type(Arg5987_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$("~", Arg5987_0[1])) && (shenjs_is_type(Arg5987_0[2], shen_type_cons) && (shenjs_is_type(Arg5987_1, shen_tuple) && shenjs_call(shen_element$question$, [Arg5987_0[2][1], [shen_type_cons, "A", [shen_type_cons, "S", [shen_type_cons, "R", []]]]]))))))
  ? (shenjs_call(shen_ob_$gt$str, [Arg5987_0[2][1], shenjs_call(shen_fst, [Arg5987_1])]) + shenjs_call(shen_ms_h, [Arg5987_0[2][2], shenjs_call(shen_snd, [Arg5987_1])]))
  : ((shenjs_is_type(Arg5987_0, shen_type_cons))
  ? (Arg5987_0[1] + shenjs_call(shen_ms_h, [Arg5987_0[2], Arg5987_1]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-ms-h"]]);})))))},
  2,
  [],
  "shen-ms-h"];
shenjs_functions["shen_shen-ms-h"] = shen_ms_h;






shen_ob_$gt$str = [shen_type_func,
  function shen_user_lambda5990(Arg5989) {
  if (Arg5989.length < 2) return [shen_type_func, shen_user_lambda5990, 2, Arg5989];
  var Arg5989_0 = Arg5989[0], Arg5989_1 = Arg5989[1];
  var R0;
  return ((shenjs_empty$question$(Arg5989_1))
  ? ((shenjs_unwind_tail(shenjs_$eq$(Arg5989_0, "R")))
  ? "()"
  : "[]")
  : ((shenjs_unwind_tail(shenjs_$eq$(Arg5989_1, shenjs_vector(0))))
  ? "<>"
  : ((shenjs_is_type(Arg5989_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_cn_all, [shenjs_call(shen_append, [((shenjs_unwind_tail(shenjs_$eq$(Arg5989_0, "R")))
  ? [shen_type_cons, "(", []]
  : [shen_type_cons, "[", []]), shenjs_call(shen_append, [[shen_type_cons, shenjs_call(shen_ob_$gt$str, [Arg5989_0, Arg5989_1[1]]), []], shenjs_call(shen_append, [shenjs_call(shen_xmapcan, [(shenjs_globals["shen_*maximum-print-sequence-size*"]), [shen_type_func,
  function shen_user_lambda5992(Arg5991) {
  if (Arg5991.length < 2) return [shen_type_func, shen_user_lambda5992, 2, Arg5991];
  var Arg5991_0 = Arg5991[0], Arg5991_1 = Arg5991[1];
  return [shen_type_cons, " ", [shen_type_cons, shenjs_call(shen_ob_$gt$str, [Arg5991_0, Arg5991_1]), []]]},
  2,
  [Arg5989_0]], Arg5989_1[2]]), ((shenjs_unwind_tail(shenjs_$eq$(Arg5989_0, "R")))
  ? [shen_type_cons, ")", []]
  : [shen_type_cons, "]", []])])])])]);})
  : ((shenjs_vector$question$(Arg5989_1))
  ? ((R0 = shenjs_call(shen_vector_$gt$list, [Arg5989_1, 1])),
  (R0 = shenjs_tlstr(shenjs_call(shen_cn_all, [shenjs_call(shen_xmapcan, [((shenjs_globals["shen_*maximum-print-sequence-size*"]) - 1), [shen_type_func,
  function shen_user_lambda5994(Arg5993) {
  if (Arg5993.length < 2) return [shen_type_func, shen_user_lambda5994, 2, Arg5993];
  var Arg5993_0 = Arg5993[0], Arg5993_1 = Arg5993[1];
  return [shen_type_cons, " ", [shen_type_cons, shenjs_call(shen_ob_$gt$str, [Arg5993_0, shenjs_call(shen_blank_fail, [Arg5993_1])]), []]]},
  2,
  [Arg5989_0]], R0])]))),
  (R0 = ("<" + (R0 + ">"))),
  R0)
  : ((((!(typeof(Arg5989_1) == 'string')) && shenjs_absvector$question$(Arg5989_1)))
  ? (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_ob_$gt$str, ["A", shenjs_call(shenjs_absvector_ref(Arg5989_1, 0), [Arg5989_1])]);}, [shen_type_func,
  function shen_user_lambda5996(Arg5995) {
  if (Arg5995.length < 3) return [shen_type_func, shen_user_lambda5996, 3, Arg5995];
  var Arg5995_0 = Arg5995[0], Arg5995_1 = Arg5995[1], Arg5995_2 = Arg5995[2];
  var R0, R1;
  return ((R0 = shenjs_call(shen_vector_$gt$list, [Arg5995_0, 0])),
  (R1 = shenjs_tlstr(shenjs_call(shen_cn_all, [shenjs_call(shen_xmapcan, [((shenjs_globals["shen_*maximum-print-sequence-size*"]) - 1), [shen_type_func,
  function shen_user_lambda5998(Arg5997) {
  if (Arg5997.length < 2) return [shen_type_func, shen_user_lambda5998, 2, Arg5997];
  var Arg5997_0 = Arg5997[0], Arg5997_1 = Arg5997[1];
  return [shen_type_cons, " ", [shen_type_cons, shenjs_call(shen_ob_$gt$str, [Arg5997_0, Arg5997_1]), []]]},
  2,
  [Arg5995_1]], R0])]))),
  (R1 = ("<" + (R1 + ">"))),
  R1)},
  3,
  [Arg5989_1, Arg5989_0]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-vector-failure-object"], Arg5989_1)))
  ? "..."
  : (((shenjs_unwind_tail(shenjs_$eq$(Arg5989_0, "A")) && (typeof(Arg5989_1) == 'string')))
  ? Arg5989_1
  : (function() {
  return shenjs_str(Arg5989_1);}))))))))},
  2,
  [],
  "shen-ob->str"];
shenjs_functions["shen_shen-ob->str"] = shen_ob_$gt$str;






shen_blank_fail = [shen_type_func,
  function shen_user_lambda6000(Arg5999) {
  if (Arg5999.length < 1) return [shen_type_func, shen_user_lambda6000, 1, Arg5999];
  var Arg5999_0 = Arg5999[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5999_0, shen_fail_obj)))
  ? [shen_type_symbol, "shen-vector-failure-object"]
  : Arg5999_0)},
  1,
  [],
  "shen-blank-fail"];
shenjs_functions["shen_shen-blank-fail"] = shen_blank_fail;






shen_tuple = [shen_type_func,
  function shen_user_lambda6002(Arg6001) {
  if (Arg6001.length < 1) return [shen_type_func, shen_user_lambda6002, 1, Arg6001];
  var Arg6001_0 = Arg6001[0];
  return (function() {
  return shenjs_call_tail(shen_intmake_string, ["(@p ~S ~S)", [shen_tuple, shenjs_call(shen_fst, [Arg6001_0]), [shen_tuple, shenjs_call(shen_snd, [Arg6001_0]), []]]]);})},
  1,
  [],
  "shen-tuple"];
shenjs_functions["shen_shen-tuple"] = shen_tuple;






shen_cn_all = [shen_type_func,
  function shen_user_lambda6004(Arg6003) {
  if (Arg6003.length < 1) return [shen_type_func, shen_user_lambda6004, 1, Arg6003];
  var Arg6003_0 = Arg6003[0];
  return ((shenjs_empty$question$(Arg6003_0))
  ? ""
  : ((shenjs_is_type(Arg6003_0, shen_type_cons))
  ? (Arg6003_0[1] + shenjs_call(shen_cn_all, [Arg6003_0[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-cn-all"]]);})))},
  1,
  [],
  "shen-cn-all"];
shenjs_functions["shen_shen-cn-all"] = shen_cn_all;






shen_xmapcan = [shen_type_func,
  function shen_user_lambda6006(Arg6005) {
  if (Arg6005.length < 3) return [shen_type_func, shen_user_lambda6006, 3, Arg6005];
  var Arg6005_0 = Arg6005[0], Arg6005_1 = Arg6005[1], Arg6005_2 = Arg6005[2];
  return ((shenjs_empty$question$(Arg6005_2))
  ? []
  : ((shenjs_unwind_tail(shenjs_$eq$(0, Arg6005_0)))
  ? [shen_type_cons, "... etc", []]
  : ((shenjs_is_type(Arg6005_2, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(Arg6005_1, [Arg6005_2[1]]), shenjs_call(shen_xmapcan, [(Arg6005_0 - 1), Arg6005_1, Arg6005_2[2]])]);})
  : [shen_type_cons, " |", shenjs_call(Arg6005_1, [Arg6005_2])])))},
  3,
  [],
  "shen-xmapcan"];
shenjs_functions["shen_shen-xmapcan"] = shen_xmapcan;






shen_vector_$gt$list = [shen_type_func,
  function shen_user_lambda6008(Arg6007) {
  if (Arg6007.length < 2) return [shen_type_func, shen_user_lambda6008, 2, Arg6007];
  var Arg6007_0 = Arg6007[0], Arg6007_1 = Arg6007[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$listh, [Arg6007_0, Arg6007_1, []]);})},
  2,
  [],
  "shen-vector->list"];
shenjs_functions["shen_shen-vector->list"] = shen_vector_$gt$list;






shen_vector_$gt$listh = [shen_type_func,
  function shen_user_lambda6010(Arg6009) {
  if (Arg6009.length < 3) return [shen_type_func, shen_user_lambda6010, 3, Arg6009];
  var Arg6009_0 = Arg6009[0], Arg6009_1 = Arg6009[1], Arg6009_2 = Arg6009[2];
  var R0;
  return ((R0 = shenjs_trap_error(function() {return shenjs_absvector_ref(Arg6009_0, Arg6009_1);}, [shen_type_func,
  function shen_user_lambda6012(Arg6011) {
  if (Arg6011.length < 1) return [shen_type_func, shen_user_lambda6012, 1, Arg6011];
  var Arg6011_0 = Arg6011[0];
  return [shen_type_symbol, "shen-out-of-range"]},
  1,
  []])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, [shen_type_symbol, "shen-out-of-range"])))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg6009_2]);})
  : (function() {
  return shenjs_call_tail(shen_vector_$gt$listh, [Arg6009_0, (Arg6009_1 + 1), [shen_type_cons, R0, Arg6009_2]]);})))},
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
  function shen_user_lambda4812(Arg4811) {
  if (Arg4811.length < 0) return [shen_type_func, shen_user_lambda4812, 0, Arg4811];
  return (function() {
  return shenjs_call_tail(shen_lineread_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), []]);})},
  0,
  [],
  "lineread"];
shenjs_functions["shen_lineread"] = shen_lineread;






shen_lineread_loop = [shen_type_func,
  function shen_user_lambda4814(Arg4813) {
  if (Arg4813.length < 2) return [shen_type_func, shen_user_lambda4814, 2, Arg4813];
  var Arg4813_0 = Arg4813[0], Arg4813_1 = Arg4813[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4813_0, shenjs_call(shen_hat, []))))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["line read aborted", []]);})
  : ((shenjs_call(shen_element$question$, [Arg4813_0, [shen_type_cons, shenjs_call(shen_newline, []), [shen_type_cons, shenjs_call(shen_carriage_return, []), []]]]))
  ? ((R0 = shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda4816(Arg4815) {
  if (Arg4815.length < 1) return [shen_type_func, shen_user_lambda4816, 1, Arg4815];
  var Arg4815_0 = Arg4815[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$st$_input$gt$, [Arg4815_0]);})},
  1,
  []], Arg4813_1, []])),
  (((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)) || shenjs_empty$question$(R0)))
  ? (function() {
  return shenjs_call_tail(shen_lineread_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), shenjs_call(shen_append, [Arg4813_1, [shen_type_cons, Arg4813_0, []]])]);})
  : R0))
  : (function() {
  return shenjs_call_tail(shen_lineread_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), shenjs_call(shen_append, [Arg4813_1, [shen_type_cons, Arg4813_0, []]])]);})))},
  2,
  [],
  "shen-lineread-loop"];
shenjs_functions["shen_shen-lineread-loop"] = shen_lineread_loop;






shen_read_file = [shen_type_func,
  function shen_user_lambda4818(Arg4817) {
  if (Arg4817.length < 1) return [shen_type_func, shen_user_lambda4818, 1, Arg4817];
  var Arg4817_0 = Arg4817[0];
  var R0;
  return ((R0 = shenjs_call(shen_read_file_as_bytelist, [Arg4817_0])),
  (function() {
  return shenjs_call_tail(shen_compile, [[shen_type_func,
  function shen_user_lambda4820(Arg4819) {
  if (Arg4819.length < 1) return [shen_type_func, shen_user_lambda4820, 1, Arg4819];
  var Arg4819_0 = Arg4819[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$st$_input$gt$, [Arg4819_0]);})},
  1,
  []], R0, [shen_type_func,
  function shen_user_lambda4822(Arg4821) {
  if (Arg4821.length < 1) return [shen_type_func, shen_user_lambda4822, 1, Arg4821];
  var Arg4821_0 = Arg4821[0];
  return (function() {
  return shenjs_call_tail(shen_read_error, [Arg4821_0]);})},
  1,
  []]]);}))},
  1,
  [],
  "read-file"];
shenjs_functions["shen_read-file"] = shen_read_file;






shen_read_error = [shen_type_func,
  function shen_user_lambda4824(Arg4823) {
  if (Arg4823.length < 1) return [shen_type_func, shen_user_lambda4824, 1, Arg4823];
  var Arg4823_0 = Arg4823[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["read error here:~%~% ~A~%", [shen_tuple, shenjs_call(shen_compress_50, [50, Arg4823_0]), []]]);})},
  1,
  [],
  "shen-read-error"];
shenjs_functions["shen_shen-read-error"] = shen_read_error;






shen_compress_50 = [shen_type_func,
  function shen_user_lambda4826(Arg4825) {
  if (Arg4825.length < 2) return [shen_type_func, shen_user_lambda4826, 2, Arg4825];
  var Arg4825_0 = Arg4825[0], Arg4825_1 = Arg4825[1];
  return ((shenjs_empty$question$(Arg4825_1))
  ? ""
  : ((shenjs_unwind_tail(shenjs_$eq$(0, Arg4825_0)))
  ? ""
  : ((shenjs_is_type(Arg4825_1, shen_type_cons))
  ? (shenjs_n_$gt$string(Arg4825_1[1]) + shenjs_call(shen_compress_50, [(Arg4825_0 - 1), Arg4825_1[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-compress-50"]]);}))))},
  2,
  [],
  "shen-compress-50"];
shenjs_functions["shen_shen-compress-50"] = shen_compress_50;






shen_$lt$st$_input$gt$ = [shen_type_func,
  function shen_user_lambda4828(Arg4827) {
  if (Arg4827.length < 1) return [shen_type_func, shen_user_lambda4828, 1, Arg4827];
  var Arg4827_0 = Arg4827[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$lsb$gt$, [Arg4827_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$lrb$gt$, [Arg4827_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$lcurly$gt$, [Arg4827_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "{"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$rcurly$gt$, [Arg4827_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "}"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$bar$gt$, [Arg4827_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "bar!"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$semicolon$gt$, [Arg4827_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, ";"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$colon$gt$, [Arg4827_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$colon$gt$, [Arg4827_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$colon$gt$, [Arg4827_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, ":"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$comma$gt$, [Arg4827_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "shen-"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$comment$gt$, [Arg4827_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$atom$gt$, [Arg4827_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_macroexpand, [shenjs_call(shen_snd, [R0])]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$whitespaces$gt$, [Arg4827_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4827_0])),
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
  function shen_user_lambda4830(Arg4829) {
  if (Arg4829.length < 1) return [shen_type_func, shen_user_lambda4830, 1, Arg4829];
  var Arg4829_0 = Arg4829[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4829_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4829_0])[2], shenjs_call(shen_snd, [Arg4829_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4829_0])[1], 91)))
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
  function shen_user_lambda4832(Arg4831) {
  if (Arg4831.length < 1) return [shen_type_func, shen_user_lambda4832, 1, Arg4831];
  var Arg4831_0 = Arg4831[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4831_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4831_0])[2], shenjs_call(shen_snd, [Arg4831_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4831_0])[1], 93)))
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
  function shen_user_lambda4834(Arg4833) {
  if (Arg4833.length < 1) return [shen_type_func, shen_user_lambda4834, 1, Arg4833];
  var Arg4833_0 = Arg4833[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4833_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4833_0])[2], shenjs_call(shen_snd, [Arg4833_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4833_0])[1], 123)))
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
  function shen_user_lambda4836(Arg4835) {
  if (Arg4835.length < 1) return [shen_type_func, shen_user_lambda4836, 1, Arg4835];
  var Arg4835_0 = Arg4835[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4835_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4835_0])[2], shenjs_call(shen_snd, [Arg4835_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4835_0])[1], 125)))
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
  function shen_user_lambda4838(Arg4837) {
  if (Arg4837.length < 1) return [shen_type_func, shen_user_lambda4838, 1, Arg4837];
  var Arg4837_0 = Arg4837[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4837_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4837_0])[2], shenjs_call(shen_snd, [Arg4837_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4837_0])[1], 124)))
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
  function shen_user_lambda4840(Arg4839) {
  if (Arg4839.length < 1) return [shen_type_func, shen_user_lambda4840, 1, Arg4839];
  var Arg4839_0 = Arg4839[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4839_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4839_0])[2], shenjs_call(shen_snd, [Arg4839_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4839_0])[1], 59)))
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
  function shen_user_lambda4842(Arg4841) {
  if (Arg4841.length < 1) return [shen_type_func, shen_user_lambda4842, 1, Arg4841];
  var Arg4841_0 = Arg4841[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4841_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4841_0])[2], shenjs_call(shen_snd, [Arg4841_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4841_0])[1], 58)))
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
  function shen_user_lambda4844(Arg4843) {
  if (Arg4843.length < 1) return [shen_type_func, shen_user_lambda4844, 1, Arg4843];
  var Arg4843_0 = Arg4843[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4843_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4843_0])[2], shenjs_call(shen_snd, [Arg4843_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4843_0])[1], 44)))
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
  function shen_user_lambda4846(Arg4845) {
  if (Arg4845.length < 1) return [shen_type_func, shen_user_lambda4846, 1, Arg4845];
  var Arg4845_0 = Arg4845[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4845_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4845_0])[2], shenjs_call(shen_snd, [Arg4845_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4845_0])[1], 61)))
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
  function shen_user_lambda4848(Arg4847) {
  if (Arg4847.length < 1) return [shen_type_func, shen_user_lambda4848, 1, Arg4847];
  var Arg4847_0 = Arg4847[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4847_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4847_0])[2], shenjs_call(shen_snd, [Arg4847_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4847_0])[1], 45)))
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
  function shen_user_lambda4850(Arg4849) {
  if (Arg4849.length < 1) return [shen_type_func, shen_user_lambda4850, 1, Arg4849];
  var Arg4849_0 = Arg4849[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4849_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4849_0])[2], shenjs_call(shen_snd, [Arg4849_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4849_0])[1], 40)))
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
  function shen_user_lambda4852(Arg4851) {
  if (Arg4851.length < 1) return [shen_type_func, shen_user_lambda4852, 1, Arg4851];
  var Arg4851_0 = Arg4851[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4851_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4851_0])[2], shenjs_call(shen_snd, [Arg4851_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4851_0])[1], 41)))
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
  function shen_user_lambda4854(Arg4853) {
  if (Arg4853.length < 1) return [shen_type_func, shen_user_lambda4854, 1, Arg4853];
  var Arg4853_0 = Arg4853[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$str$gt$, [Arg4853_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_control_chars, [shenjs_call(shen_snd, [R0])])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$number$gt$, [Arg4853_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$sym$gt$, [Arg4853_0])),
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
  function shen_user_lambda4856(Arg4855) {
  if (Arg4855.length < 1) return [shen_type_func, shen_user_lambda4856, 1, Arg4855];
  var Arg4855_0 = Arg4855[0];
  var R0, R1;
  return ((shenjs_empty$question$(Arg4855_0))
  ? ""
  : (((shenjs_is_type(Arg4855_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$("c", Arg4855_0[1])) && (shenjs_is_type(Arg4855_0[2], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("#", Arg4855_0[2][1]))))))
  ? ((R0 = shenjs_call(shen_code_point, [Arg4855_0[2][2]])),
  (R1 = shenjs_call(shen_after_codepoint, [Arg4855_0[2][2]])),
  (function() {
  return shenjs_call_tail(shen_$at$s, [shenjs_n_$gt$string(shenjs_call(shen_decimalise, [R0])), shenjs_call(shen_control_chars, [R1])]);}))
  : ((shenjs_is_type(Arg4855_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_$at$s, [Arg4855_0[1], shenjs_call(shen_control_chars, [Arg4855_0[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-control-chars"]]);}))))},
  1,
  [],
  "shen-control-chars"];
shenjs_functions["shen_shen-control-chars"] = shen_control_chars;






shen_code_point = [shen_type_func,
  function shen_user_lambda4858(Arg4857) {
  if (Arg4857.length < 1) return [shen_type_func, shen_user_lambda4858, 1, Arg4857];
  var Arg4857_0 = Arg4857[0];
  return (((shenjs_is_type(Arg4857_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(";", Arg4857_0[1]))))
  ? ""
  : (((shenjs_is_type(Arg4857_0, shen_type_cons) && shenjs_call(shen_element$question$, [Arg4857_0[1], [shen_type_cons, "0", [shen_type_cons, "1", [shen_type_cons, "2", [shen_type_cons, "3", [shen_type_cons, "4", [shen_type_cons, "5", [shen_type_cons, "6", [shen_type_cons, "7", [shen_type_cons, "8", [shen_type_cons, "9", [shen_type_cons, "0", []]]]]]]]]]]]])))
  ? [shen_type_cons, Arg4857_0[1], shenjs_call(shen_code_point, [Arg4857_0[2]])]
  : (function() {
  return shenjs_call_tail(shen_interror, ["code point parse error ~A~%", [shen_tuple, Arg4857_0, []]]);})))},
  1,
  [],
  "shen-code-point"];
shenjs_functions["shen_shen-code-point"] = shen_code_point;






shen_after_codepoint = [shen_type_func,
  function shen_user_lambda4860(Arg4859) {
  if (Arg4859.length < 1) return [shen_type_func, shen_user_lambda4860, 1, Arg4859];
  var Arg4859_0 = Arg4859[0];
  return ((shenjs_empty$question$(Arg4859_0))
  ? []
  : (((shenjs_is_type(Arg4859_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(";", Arg4859_0[1]))))
  ? Arg4859_0[2]
  : ((shenjs_is_type(Arg4859_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_after_codepoint, [Arg4859_0[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-after-codepoint"]]);}))))},
  1,
  [],
  "shen-after-codepoint"];
shenjs_functions["shen_shen-after-codepoint"] = shen_after_codepoint;






shen_decimalise = [shen_type_func,
  function shen_user_lambda4862(Arg4861) {
  if (Arg4861.length < 1) return [shen_type_func, shen_user_lambda4862, 1, Arg4861];
  var Arg4861_0 = Arg4861[0];
  return (function() {
  return shenjs_call_tail(shen_pre, [shenjs_call(shen_reverse, [shenjs_call(shen_digits_$gt$integers, [Arg4861_0])]), 0]);})},
  1,
  [],
  "shen-decimalise"];
shenjs_functions["shen_shen-decimalise"] = shen_decimalise;






shen_digits_$gt$integers = [shen_type_func,
  function shen_user_lambda4864(Arg4863) {
  if (Arg4863.length < 1) return [shen_type_func, shen_user_lambda4864, 1, Arg4863];
  var Arg4863_0 = Arg4863[0];
  return (((shenjs_is_type(Arg4863_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("0", Arg4863_0[1]))))
  ? [shen_type_cons, 0, shenjs_call(shen_digits_$gt$integers, [Arg4863_0[2]])]
  : (((shenjs_is_type(Arg4863_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("1", Arg4863_0[1]))))
  ? [shen_type_cons, 1, shenjs_call(shen_digits_$gt$integers, [Arg4863_0[2]])]
  : (((shenjs_is_type(Arg4863_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("2", Arg4863_0[1]))))
  ? [shen_type_cons, 2, shenjs_call(shen_digits_$gt$integers, [Arg4863_0[2]])]
  : (((shenjs_is_type(Arg4863_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("3", Arg4863_0[1]))))
  ? [shen_type_cons, 3, shenjs_call(shen_digits_$gt$integers, [Arg4863_0[2]])]
  : (((shenjs_is_type(Arg4863_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("4", Arg4863_0[1]))))
  ? [shen_type_cons, 4, shenjs_call(shen_digits_$gt$integers, [Arg4863_0[2]])]
  : (((shenjs_is_type(Arg4863_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("5", Arg4863_0[1]))))
  ? [shen_type_cons, 5, shenjs_call(shen_digits_$gt$integers, [Arg4863_0[2]])]
  : (((shenjs_is_type(Arg4863_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("6", Arg4863_0[1]))))
  ? [shen_type_cons, 6, shenjs_call(shen_digits_$gt$integers, [Arg4863_0[2]])]
  : (((shenjs_is_type(Arg4863_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("7", Arg4863_0[1]))))
  ? [shen_type_cons, 7, shenjs_call(shen_digits_$gt$integers, [Arg4863_0[2]])]
  : (((shenjs_is_type(Arg4863_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("8", Arg4863_0[1]))))
  ? [shen_type_cons, 8, shenjs_call(shen_digits_$gt$integers, [Arg4863_0[2]])]
  : (((shenjs_is_type(Arg4863_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("9", Arg4863_0[1]))))
  ? [shen_type_cons, 9, shenjs_call(shen_digits_$gt$integers, [Arg4863_0[2]])]
  : []))))))))))},
  1,
  [],
  "shen-digits->integers"];
shenjs_functions["shen_shen-digits->integers"] = shen_digits_$gt$integers;






shen_$lt$sym$gt$ = [shen_type_func,
  function shen_user_lambda4866(Arg4865) {
  if (Arg4865.length < 1) return [shen_type_func, shen_user_lambda4866, 1, Arg4865];
  var Arg4865_0 = Arg4865[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$alpha$gt$, [Arg4865_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$symchars$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_intern((shenjs_call(shen_snd, [R0]) + shenjs_call(shen_snd, [R1])))])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$alpha$gt$, [Arg4865_0])),
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
  function shen_user_lambda4868(Arg4867) {
  if (Arg4867.length < 1) return [shen_type_func, shen_user_lambda4868, 1, Arg4867];
  var Arg4867_0 = Arg4867[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$symchar$gt$, [Arg4867_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$symchars$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), (shenjs_call(shen_snd, [R0]) + shenjs_call(shen_snd, [R1]))])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$symchar$gt$, [Arg4867_0])),
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
  function shen_user_lambda4870(Arg4869) {
  if (Arg4869.length < 1) return [shen_type_func, shen_user_lambda4870, 1, Arg4869];
  var Arg4869_0 = Arg4869[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$alpha$gt$, [Arg4869_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digit_$gt$string$gt$, [Arg4869_0])),
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
  function shen_user_lambda4872(Arg4871) {
  if (Arg4871.length < 1) return [shen_type_func, shen_user_lambda4872, 1, Arg4871];
  var Arg4871_0 = Arg4871[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4871_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4871_0])[2], shenjs_call(shen_snd, [Arg4871_0])])]), ((shenjs_call(shen_digit_byte$question$, [shenjs_call(shen_fst, [Arg4871_0])[1]]))
  ? shenjs_n_$gt$string(shenjs_call(shen_fst, [Arg4871_0])[1])
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
  function shen_user_lambda4874(Arg4873) {
  if (Arg4873.length < 1) return [shen_type_func, shen_user_lambda4874, 1, Arg4873];
  var Arg4873_0 = Arg4873[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(48, Arg4873_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(49, Arg4873_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(50, Arg4873_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(51, Arg4873_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(52, Arg4873_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(53, Arg4873_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(54, Arg4873_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(55, Arg4873_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(56, Arg4873_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(57, Arg4873_0)))
  ? true
  : false))))))))))},
  1,
  [],
  "shen-digit-byte?"];
shenjs_functions["shen_shen-digit-byte?"] = shen_digit_byte$question$;






shen_$lt$alpha$gt$ = [shen_type_func,
  function shen_user_lambda4876(Arg4875) {
  if (Arg4875.length < 1) return [shen_type_func, shen_user_lambda4876, 1, Arg4875];
  var Arg4875_0 = Arg4875[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4875_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4875_0])[2], shenjs_call(shen_snd, [Arg4875_0])])]), ((R0 = shenjs_call(shen_symbol_byte_$gt$string, [shenjs_call(shen_fst, [Arg4875_0])[1]])),
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
  function shen_user_lambda4878(Arg4877) {
  if (Arg4877.length < 1) return [shen_type_func, shen_user_lambda4878, 1, Arg4877];
  var Arg4877_0 = Arg4877[0];
  return shenjs_absvector_ref((shenjs_globals["shen_shen-*symbolcodes*"]), Arg4877_0)},
  1,
  [],
  "shen-symbol-byte->string"];
shenjs_functions["shen_shen-symbol-byte->string"] = shen_symbol_byte_$gt$string;






shen_$lt$str$gt$ = [shen_type_func,
  function shen_user_lambda4880(Arg4879) {
  if (Arg4879.length < 1) return [shen_type_func, shen_user_lambda4880, 1, Arg4879];
  var Arg4879_0 = Arg4879[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$dbq$gt$, [Arg4879_0])),
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
  function shen_user_lambda4882(Arg4881) {
  if (Arg4881.length < 1) return [shen_type_func, shen_user_lambda4882, 1, Arg4881];
  var Arg4881_0 = Arg4881[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4881_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4881_0])[2], shenjs_call(shen_snd, [Arg4881_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4881_0])[1], 34)))
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
  function shen_user_lambda4884(Arg4883) {
  if (Arg4883.length < 1) return [shen_type_func, shen_user_lambda4884, 1, Arg4883];
  var Arg4883_0 = Arg4883[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$strc$gt$, [Arg4883_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$strcontents$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4883_0])),
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
  function shen_user_lambda4886(Arg4885) {
  if (Arg4885.length < 1) return [shen_type_func, shen_user_lambda4886, 1, Arg4885];
  var Arg4885_0 = Arg4885[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4885_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4885_0])[2], shenjs_call(shen_snd, [Arg4885_0])])]), shenjs_n_$gt$string(shenjs_call(shen_fst, [Arg4885_0])[1])])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<byte>"];
shenjs_functions["shen_shen-<byte>"] = shen_$lt$byte$gt$;






shen_$lt$strc$gt$ = [shen_type_func,
  function shen_user_lambda4888(Arg4887) {
  if (Arg4887.length < 1) return [shen_type_func, shen_user_lambda4888, 1, Arg4887];
  var Arg4887_0 = Arg4887[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4887_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4887_0])[2], shenjs_call(shen_snd, [Arg4887_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4887_0])[1], 34)))
  ? shen_fail_obj
  : shenjs_n_$gt$string(shenjs_call(shen_fst, [Arg4887_0])[1]))])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<strc>"];
shenjs_functions["shen_shen-<strc>"] = shen_$lt$strc$gt$;






shen_$lt$backslash$gt$ = [shen_type_func,
  function shen_user_lambda4890(Arg4889) {
  if (Arg4889.length < 1) return [shen_type_func, shen_user_lambda4890, 1, Arg4889];
  var Arg4889_0 = Arg4889[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4889_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4889_0])[2], shenjs_call(shen_snd, [Arg4889_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4889_0])[1], 92)))
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
  function shen_user_lambda4892(Arg4891) {
  if (Arg4891.length < 1) return [shen_type_func, shen_user_lambda4892, 1, Arg4891];
  var Arg4891_0 = Arg4891[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$minus$gt$, [Arg4891_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$number$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), (0 - shenjs_call(shen_snd, [R0]))])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$plus$gt$, [Arg4891_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$number$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$predigits$gt$, [Arg4891_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg4891_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$predigits$gt$, [Arg4891_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg4891_0])),
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
  function shen_user_lambda4894(Arg4893) {
  if (Arg4893.length < 1) return [shen_type_func, shen_user_lambda4894, 1, Arg4893];
  var Arg4893_0 = Arg4893[0];
  var R0;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4893_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(101, shenjs_call(shen_fst, [Arg4893_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4893_0])[2], shenjs_call(shen_snd, [Arg4893_0])])]), [shen_type_cons, 101, []]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<E>"];
shenjs_functions["shen_shen-<E>"] = shen_$lt$E$gt$;






shen_$lt$log10$gt$ = [shen_type_func,
  function shen_user_lambda4896(Arg4895) {
  if (Arg4895.length < 1) return [shen_type_func, shen_user_lambda4896, 1, Arg4895];
  var Arg4895_0 = Arg4895[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$minus$gt$, [Arg4895_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$digits$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), (0 - shenjs_call(shen_pre, [shenjs_call(shen_reverse, [shenjs_call(shen_snd, [R0])]), 0]))])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg4895_0])),
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
  function shen_user_lambda4898(Arg4897) {
  if (Arg4897.length < 1) return [shen_type_func, shen_user_lambda4898, 1, Arg4897];
  var Arg4897_0 = Arg4897[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4897_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4897_0])[2], shenjs_call(shen_snd, [Arg4897_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4897_0])[1], 43)))
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
  function shen_user_lambda4900(Arg4899) {
  if (Arg4899.length < 1) return [shen_type_func, shen_user_lambda4900, 1, Arg4899];
  var Arg4899_0 = Arg4899[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4899_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4899_0])[2], shenjs_call(shen_snd, [Arg4899_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4899_0])[1], 46)))
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
  function shen_user_lambda4902(Arg4901) {
  if (Arg4901.length < 1) return [shen_type_func, shen_user_lambda4902, 1, Arg4901];
  var Arg4901_0 = Arg4901[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg4901_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
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
  "shen-<predigits>"];
shenjs_functions["shen_shen-<predigits>"] = shen_$lt$predigits$gt$;






shen_$lt$postdigits$gt$ = [shen_type_func,
  function shen_user_lambda4904(Arg4903) {
  if (Arg4903.length < 1) return [shen_type_func, shen_user_lambda4904, 1, Arg4903];
  var Arg4903_0 = Arg4903[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg4903_0])),
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
  function shen_user_lambda4906(Arg4905) {
  if (Arg4905.length < 1) return [shen_type_func, shen_user_lambda4906, 1, Arg4905];
  var Arg4905_0 = Arg4905[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$digit$gt$, [Arg4905_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$digits$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digit$gt$, [Arg4905_0])),
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
  function shen_user_lambda4908(Arg4907) {
  if (Arg4907.length < 1) return [shen_type_func, shen_user_lambda4908, 1, Arg4907];
  var Arg4907_0 = Arg4907[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4907_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4907_0])[2], shenjs_call(shen_snd, [Arg4907_0])])]), ((shenjs_call(shen_digit_byte$question$, [shenjs_call(shen_fst, [Arg4907_0])[1]]))
  ? shenjs_call(shen_byte_$gt$digit, [shenjs_call(shen_fst, [Arg4907_0])[1]])
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
  function shen_user_lambda4910(Arg4909) {
  if (Arg4909.length < 1) return [shen_type_func, shen_user_lambda4910, 1, Arg4909];
  var Arg4909_0 = Arg4909[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(48, Arg4909_0)))
  ? 0
  : ((shenjs_unwind_tail(shenjs_$eq$(49, Arg4909_0)))
  ? 1
  : ((shenjs_unwind_tail(shenjs_$eq$(50, Arg4909_0)))
  ? 2
  : ((shenjs_unwind_tail(shenjs_$eq$(51, Arg4909_0)))
  ? 3
  : ((shenjs_unwind_tail(shenjs_$eq$(52, Arg4909_0)))
  ? 4
  : ((shenjs_unwind_tail(shenjs_$eq$(53, Arg4909_0)))
  ? 5
  : ((shenjs_unwind_tail(shenjs_$eq$(54, Arg4909_0)))
  ? 6
  : ((shenjs_unwind_tail(shenjs_$eq$(55, Arg4909_0)))
  ? 7
  : ((shenjs_unwind_tail(shenjs_$eq$(56, Arg4909_0)))
  ? 8
  : ((shenjs_unwind_tail(shenjs_$eq$(57, Arg4909_0)))
  ? 9
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-byte->digit"]]);})))))))))))},
  1,
  [],
  "shen-byte->digit"];
shenjs_functions["shen_shen-byte->digit"] = shen_byte_$gt$digit;






shen_pre = [shen_type_func,
  function shen_user_lambda4912(Arg4911) {
  if (Arg4911.length < 2) return [shen_type_func, shen_user_lambda4912, 2, Arg4911];
  var Arg4911_0 = Arg4911[0], Arg4911_1 = Arg4911[1];
  return ((shenjs_empty$question$(Arg4911_0))
  ? 0
  : ((shenjs_is_type(Arg4911_0, shen_type_cons))
  ? ((shenjs_call(shen_expt, [10, Arg4911_1]) * Arg4911_0[1]) + shenjs_call(shen_pre, [Arg4911_0[2], (Arg4911_1 + 1)]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-pre"]]);})))},
  2,
  [],
  "shen-pre"];
shenjs_functions["shen_shen-pre"] = shen_pre;






shen_post = [shen_type_func,
  function shen_user_lambda4914(Arg4913) {
  if (Arg4913.length < 2) return [shen_type_func, shen_user_lambda4914, 2, Arg4913];
  var Arg4913_0 = Arg4913[0], Arg4913_1 = Arg4913[1];
  return ((shenjs_empty$question$(Arg4913_0))
  ? 0
  : ((shenjs_is_type(Arg4913_0, shen_type_cons))
  ? ((shenjs_call(shen_expt, [10, (0 - Arg4913_1)]) * Arg4913_0[1]) + shenjs_call(shen_post, [Arg4913_0[2], (Arg4913_1 + 1)]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-post"]]);})))},
  2,
  [],
  "shen-post"];
shenjs_functions["shen_shen-post"] = shen_post;






shen_expt = [shen_type_func,
  function shen_user_lambda4916(Arg4915) {
  if (Arg4915.length < 2) return [shen_type_func, shen_user_lambda4916, 2, Arg4915];
  var Arg4915_0 = Arg4915[0], Arg4915_1 = Arg4915[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg4915_1)))
  ? 1
  : (((Arg4915_1 > 0))
  ? (Arg4915_0 * shenjs_call(shen_expt, [Arg4915_0, (Arg4915_1 - 1)]))
  : (1.0 * (shenjs_call(shen_expt, [Arg4915_0, (Arg4915_1 + 1)]) / Arg4915_0))))},
  2,
  [],
  "shen-expt"];
shenjs_functions["shen_shen-expt"] = shen_expt;






shen_$lt$st$_input1$gt$ = [shen_type_func,
  function shen_user_lambda4918(Arg4917) {
  if (Arg4917.length < 1) return [shen_type_func, shen_user_lambda4918, 1, Arg4917];
  var Arg4917_0 = Arg4917[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [Arg4917_0])),
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
  function shen_user_lambda4920(Arg4919) {
  if (Arg4919.length < 1) return [shen_type_func, shen_user_lambda4920, 1, Arg4919];
  var Arg4919_0 = Arg4919[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [Arg4919_0])),
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
  function shen_user_lambda4922(Arg4921) {
  if (Arg4921.length < 1) return [shen_type_func, shen_user_lambda4922, 1, Arg4921];
  var Arg4921_0 = Arg4921[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$backslash$gt$, [Arg4921_0])),
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
  function shen_user_lambda4924(Arg4923) {
  if (Arg4923.length < 1) return [shen_type_func, shen_user_lambda4924, 1, Arg4923];
  var Arg4923_0 = Arg4923[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4923_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4923_0])[2], shenjs_call(shen_snd, [Arg4923_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4923_0])[1], 42)))
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
  function shen_user_lambda4926(Arg4925) {
  if (Arg4925.length < 1) return [shen_type_func, shen_user_lambda4926, 1, Arg4925];
  var Arg4925_0 = Arg4925[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$comment$gt$, [Arg4925_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$any$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_symbol, "shen-skip"]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$blah$gt$, [Arg4925_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$any$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_symbol, "shen-skip"]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4925_0])),
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
  function shen_user_lambda4928(Arg4927) {
  if (Arg4927.length < 1) return [shen_type_func, shen_user_lambda4928, 1, Arg4927];
  var Arg4927_0 = Arg4927[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4927_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4927_0])[2], shenjs_call(shen_snd, [Arg4927_0])])]), ((shenjs_call(shen_end_of_comment$question$, [shenjs_call(shen_fst, [Arg4927_0])]))
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
  function shen_user_lambda4930(Arg4929) {
  if (Arg4929.length < 1) return [shen_type_func, shen_user_lambda4930, 1, Arg4929];
  var Arg4929_0 = Arg4929[0];
  return (((shenjs_is_type(Arg4929_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(42, Arg4929_0[1])) && (shenjs_is_type(Arg4929_0[2], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(92, Arg4929_0[2][1]))))))
  ? true
  : false)},
  1,
  [],
  "shen-end-of-comment?"];
shenjs_functions["shen_shen-end-of-comment?"] = shen_end_of_comment$question$;






shen_$lt$whitespaces$gt$ = [shen_type_func,
  function shen_user_lambda4932(Arg4931) {
  if (Arg4931.length < 1) return [shen_type_func, shen_user_lambda4932, 1, Arg4931];
  var Arg4931_0 = Arg4931[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$whitespace$gt$, [Arg4931_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$whitespaces$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_symbol, "shen-skip"]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$whitespace$gt$, [Arg4931_0])),
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
  function shen_user_lambda4934(Arg4933) {
  if (Arg4933.length < 1) return [shen_type_func, shen_user_lambda4934, 1, Arg4933];
  var Arg4933_0 = Arg4933[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4933_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4933_0])[2], shenjs_call(shen_snd, [Arg4933_0])])]), ((R0 = shenjs_call(shen_fst, [Arg4933_0])[1]),
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
  function shen_user_lambda4936(Arg4935) {
  if (Arg4935.length < 1) return [shen_type_func, shen_user_lambda4936, 1, Arg4935];
  var Arg4935_0 = Arg4935[0];
  return ((shenjs_empty$question$(Arg4935_0))
  ? []
  : (((shenjs_is_type(Arg4935_0, shen_type_cons) && (shenjs_is_type(Arg4935_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "bar!"], Arg4935_0[2][1])) && (shenjs_is_type(Arg4935_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4935_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, Arg4935_0[1], Arg4935_0[2][2]]]
  : ((shenjs_is_type(Arg4935_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, Arg4935_0[1], [shen_type_cons, shenjs_call(shen_cons$_form, [Arg4935_0[2]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-cons_form"]]);}))))},
  1,
  [],
  "shen-cons_form"];
shenjs_functions["shen_shen-cons_form"] = shen_cons$_form;






shen_package_macro = [shen_type_func,
  function shen_user_lambda4938(Arg4937) {
  if (Arg4937.length < 2) return [shen_type_func, shen_user_lambda4938, 2, Arg4937];
  var Arg4937_0 = Arg4937[0], Arg4937_1 = Arg4937[1];
  var R0;
  return (((shenjs_is_type(Arg4937_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "$"], Arg4937_0[1])) && (shenjs_is_type(Arg4937_0[2], shen_type_cons) && shenjs_empty$question$(Arg4937_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(shen_explode, [Arg4937_0[2][1]]), Arg4937_1]);})
  : (((shenjs_is_type(Arg4937_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg4937_0[1])) && (shenjs_is_type(Arg4937_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "null"], Arg4937_0[2][1])) && shenjs_is_type(Arg4937_0[2][2], shen_type_cons))))))
  ? (function() {
  return shenjs_call_tail(shen_append, [Arg4937_0[2][2][2], Arg4937_1]);})
  : (((shenjs_is_type(Arg4937_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg4937_0[1])) && (shenjs_is_type(Arg4937_0[2], shen_type_cons) && shenjs_is_type(Arg4937_0[2][2], shen_type_cons)))))
  ? ((R0 = shenjs_call(shen_eval_without_macros, [Arg4937_0[2][2][1]])),
  shenjs_call(shen_record_exceptions, [R0, Arg4937_0[2][1]]),
  (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(shen_packageh, [Arg4937_0[2][1], R0, Arg4937_0[2][2][2]]), Arg4937_1]);}))
  : [shen_type_cons, Arg4937_0, Arg4937_1])))},
  2,
  [],
  "shen-package-macro"];
shenjs_functions["shen_shen-package-macro"] = shen_package_macro;






shen_record_exceptions = [shen_type_func,
  function shen_user_lambda4940(Arg4939) {
  if (Arg4939.length < 2) return [shen_type_func, shen_user_lambda4940, 2, Arg4939];
  var Arg4939_0 = Arg4939[0], Arg4939_1 = Arg4939[1];
  var R0;
  return ((R0 = shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg4939_1, [shen_type_symbol, "shen-external-symbols"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda4942(Arg4941) {
  if (Arg4941.length < 1) return [shen_type_func, shen_user_lambda4942, 1, Arg4941];
  var Arg4941_0 = Arg4941[0];
  return []},
  1,
  []])),
  (R0 = shenjs_call(shen_union, [Arg4939_0, R0])),
  (function() {
  return shenjs_call_tail(shen_put, [Arg4939_1, [shen_type_symbol, "shen-external-symbols"], R0, (shenjs_globals["shen_shen-*property-vector*"])]);}))},
  2,
  [],
  "shen-record-exceptions"];
shenjs_functions["shen_shen-record-exceptions"] = shen_record_exceptions;






shen_packageh = [shen_type_func,
  function shen_user_lambda4944(Arg4943) {
  if (Arg4943.length < 3) return [shen_type_func, shen_user_lambda4944, 3, Arg4943];
  var Arg4943_0 = Arg4943[0], Arg4943_1 = Arg4943[1], Arg4943_2 = Arg4943[2];
  return ((shenjs_is_type(Arg4943_2, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_packageh, [Arg4943_0, Arg4943_1, Arg4943_2[1]]), shenjs_call(shen_packageh, [Arg4943_0, Arg4943_1, Arg4943_2[2]])]
  : (((shenjs_call(shen_sysfunc$question$, [Arg4943_2]) || (shenjs_call(shen_variable$question$, [Arg4943_2]) || (shenjs_call(shen_element$question$, [Arg4943_2, Arg4943_1]) || (shenjs_call(shen_doubleunderline$question$, [Arg4943_2]) || shenjs_call(shen_singleunderline$question$, [Arg4943_2]))))))
  ? Arg4943_2
  : (((shenjs_is_type(Arg4943_2, shen_type_symbol) && (!shenjs_call(shen_prefix$question$, [[shen_type_cons, "s", [shen_type_cons, "h", [shen_type_cons, "e", [shen_type_cons, "n", [shen_type_cons, "-", []]]]]], shenjs_call(shen_explode, [Arg4943_2])]))))
  ? (function() {
  return shenjs_call_tail(shen_concat, [Arg4943_0, Arg4943_2]);})
  : Arg4943_2)))},
  3,
  [],
  "shen-packageh"];
shenjs_functions["shen_shen-packageh"] = shen_packageh;












shen_$lt$defprolog$gt$ = [shen_type_func,
  function shen_user_lambda4495(Arg4494) {
  if (Arg4494.length < 1) return [shen_type_func, shen_user_lambda4495, 1, Arg4494];
  var Arg4494_0 = Arg4494[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$predicate$asterisk$$gt$, [Arg4494_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$clauses$asterisk$$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_prolog_$gt$shen, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4497(Arg4496) {
  if (Arg4496.length < 2) return [shen_type_func, shen_user_lambda4497, 2, Arg4496];
  var Arg4496_0 = Arg4496[0], Arg4496_1 = Arg4496[1];
  return (function() {
  return shenjs_call_tail(shen_insert_predicate, [shenjs_call(shen_snd, [Arg4496_0]), Arg4496_1]);})},
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
  function shen_user_lambda4499(Arg4498) {
  if (Arg4498.length < 2) return [shen_type_func, shen_user_lambda4499, 2, Arg4498];
  var Arg4498_0 = Arg4498[0], Arg4498_1 = Arg4498[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["prolog syntax error in ~A here:~%~% ~A~%", [shen_tuple, Arg4498_0, [shen_tuple, shenjs_call(shen_next_50, [50, Arg4498_1]), []]]]);})},
  2,
  [],
  "shen-prolog-error"];
shenjs_functions["shen_shen-prolog-error"] = shen_prolog_error;






shen_next_50 = [shen_type_func,
  function shen_user_lambda4501(Arg4500) {
  if (Arg4500.length < 2) return [shen_type_func, shen_user_lambda4501, 2, Arg4500];
  var Arg4500_0 = Arg4500[0], Arg4500_1 = Arg4500[1];
  return ((shenjs_empty$question$(Arg4500_1))
  ? ""
  : ((shenjs_unwind_tail(shenjs_$eq$(0, Arg4500_0)))
  ? ""
  : ((shenjs_is_type(Arg4500_1, shen_type_cons))
  ? (shenjs_call(shen_decons_string, [Arg4500_1[1]]) + shenjs_call(shen_next_50, [(Arg4500_0 - 1), Arg4500_1[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-next-50"]]);}))))},
  2,
  [],
  "shen-next-50"];
shenjs_functions["shen_shen-next-50"] = shen_next_50;






shen_decons_string = [shen_type_func,
  function shen_user_lambda4503(Arg4502) {
  if (Arg4502.length < 1) return [shen_type_func, shen_user_lambda4503, 1, Arg4502];
  var Arg4502_0 = Arg4502[0];
  return (((shenjs_is_type(Arg4502_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg4502_0[1])) && (shenjs_is_type(Arg4502_0[2], shen_type_cons) && (shenjs_is_type(Arg4502_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4502_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~S ", [shen_tuple, shenjs_call(shen_eval_cons, [Arg4502_0]), []]]);})
  : (function() {
  return shenjs_call_tail(shen_intmake_string, ["~R ", [shen_tuple, Arg4502_0, []]]);}))},
  1,
  [],
  "shen-decons-string"];
shenjs_functions["shen_shen-decons-string"] = shen_decons_string;






shen_insert_predicate = [shen_type_func,
  function shen_user_lambda4505(Arg4504) {
  if (Arg4504.length < 2) return [shen_type_func, shen_user_lambda4505, 2, Arg4504];
  var Arg4504_0 = Arg4504[0], Arg4504_1 = Arg4504[1];
  return (((shenjs_is_type(Arg4504_1, shen_type_cons) && (shenjs_is_type(Arg4504_1[2], shen_type_cons) && shenjs_empty$question$(Arg4504_1[2][2]))))
  ? [shen_type_cons, [shen_type_cons, Arg4504_0, Arg4504_1[1]], [shen_type_cons, [shen_type_symbol, ":-"], Arg4504_1[2]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-insert-predicate"]]);}))},
  2,
  [],
  "shen-insert-predicate"];
shenjs_functions["shen_shen-insert-predicate"] = shen_insert_predicate;






shen_$lt$predicate$asterisk$$gt$ = [shen_type_func,
  function shen_user_lambda4507(Arg4506) {
  if (Arg4506.length < 1) return [shen_type_func, shen_user_lambda4507, 1, Arg4506];
  var Arg4506_0 = Arg4506[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4506_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4506_0])[2], shenjs_call(shen_snd, [Arg4506_0])])]), shenjs_call(shen_fst, [Arg4506_0])[1]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<predicate*>"];
shenjs_functions["shen_shen-<predicate*>"] = shen_$lt$predicate$asterisk$$gt$;






shen_$lt$clauses$asterisk$$gt$ = [shen_type_func,
  function shen_user_lambda4509(Arg4508) {
  if (Arg4508.length < 1) return [shen_type_func, shen_user_lambda4509, 1, Arg4508];
  var Arg4508_0 = Arg4508[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$clause$asterisk$$gt$, [Arg4508_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$clauses$asterisk$$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4508_0])),
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
  function shen_user_lambda4511(Arg4510) {
  if (Arg4510.length < 1) return [shen_type_func, shen_user_lambda4511, 1, Arg4510];
  var Arg4510_0 = Arg4510[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$head$asterisk$$gt$, [Arg4510_0])),
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
  function shen_user_lambda4513(Arg4512) {
  if (Arg4512.length < 1) return [shen_type_func, shen_user_lambda4513, 1, Arg4512];
  var Arg4512_0 = Arg4512[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$term$asterisk$$gt$, [Arg4512_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$head$asterisk$$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4512_0])),
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
  function shen_user_lambda4515(Arg4514) {
  if (Arg4514.length < 1) return [shen_type_func, shen_user_lambda4515, 1, Arg4514];
  var Arg4514_0 = Arg4514[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4514_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4514_0])[2], shenjs_call(shen_snd, [Arg4514_0])])]), ((((!shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "<--"], shenjs_call(shen_fst, [Arg4514_0])[1]))) && shenjs_call(shen_legitimate_term$question$, [shenjs_call(shen_fst, [Arg4514_0])[1]])))
  ? shenjs_call(shen_eval_cons, [shenjs_call(shen_fst, [Arg4514_0])[1]])
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
  function shen_user_lambda4517(Arg4516) {
  if (Arg4516.length < 1) return [shen_type_func, shen_user_lambda4517, 1, Arg4516];
  var Arg4516_0 = Arg4516[0];
  return (((shenjs_is_type(Arg4516_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg4516_0[1])) && (shenjs_is_type(Arg4516_0[2], shen_type_cons) && (shenjs_is_type(Arg4516_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4516_0[2][2][2]))))))
  ? (shenjs_call(shen_legitimate_term$question$, [Arg4516_0[2][1]]) && shenjs_call(shen_legitimate_term$question$, [Arg4516_0[2][2][1]]))
  : (((shenjs_is_type(Arg4516_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4516_0[1])) && (shenjs_is_type(Arg4516_0[2], shen_type_cons) && (shenjs_is_type(Arg4516_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4516_0[2][2][1])) && shenjs_empty$question$(Arg4516_0[2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(shen_legitimate_term$question$, [Arg4516_0[2][1]]);})
  : (((shenjs_is_type(Arg4516_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4516_0[1])) && (shenjs_is_type(Arg4516_0[2], shen_type_cons) && (shenjs_is_type(Arg4516_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4516_0[2][2][1])) && shenjs_empty$question$(Arg4516_0[2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(shen_legitimate_term$question$, [Arg4516_0[2][1]]);})
  : ((shenjs_is_type(Arg4516_0, shen_type_cons))
  ? false
  : true))))},
  1,
  [],
  "shen-legitimate-term?"];
shenjs_functions["shen_shen-legitimate-term?"] = shen_legitimate_term$question$;






shen_eval_cons = [shen_type_func,
  function shen_user_lambda4519(Arg4518) {
  if (Arg4518.length < 1) return [shen_type_func, shen_user_lambda4519, 1, Arg4518];
  var Arg4518_0 = Arg4518[0];
  return (((shenjs_is_type(Arg4518_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg4518_0[1])) && (shenjs_is_type(Arg4518_0[2], shen_type_cons) && (shenjs_is_type(Arg4518_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4518_0[2][2][2]))))))
  ? [shen_type_cons, shenjs_call(shen_eval_cons, [Arg4518_0[2][1]]), shenjs_call(shen_eval_cons, [Arg4518_0[2][2][1]])]
  : (((shenjs_is_type(Arg4518_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4518_0[1])) && (shenjs_is_type(Arg4518_0[2], shen_type_cons) && (shenjs_is_type(Arg4518_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4518_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, shenjs_call(shen_eval_cons, [Arg4518_0[2][1]]), Arg4518_0[2][2]]]
  : Arg4518_0))},
  1,
  [],
  "shen-eval-cons"];
shenjs_functions["shen_shen-eval-cons"] = shen_eval_cons;






shen_$lt$body$asterisk$$gt$ = [shen_type_func,
  function shen_user_lambda4521(Arg4520) {
  if (Arg4520.length < 1) return [shen_type_func, shen_user_lambda4521, 1, Arg4520];
  var Arg4520_0 = Arg4520[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$literal$asterisk$$gt$, [Arg4520_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$body$asterisk$$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4520_0])),
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
  function shen_user_lambda4523(Arg4522) {
  if (Arg4522.length < 1) return [shen_type_func, shen_user_lambda4523, 1, Arg4522];
  var Arg4522_0 = Arg4522[0];
  var R0;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4522_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "!"], shenjs_call(shen_fst, [Arg4522_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4522_0])[2], shenjs_call(shen_snd, [Arg4522_0])])]), [shen_type_cons, [shen_type_symbol, "cut"], [shen_type_cons, [shen_type_symbol, "Throwcontrol"], []]]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4522_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4522_0])[2], shenjs_call(shen_snd, [Arg4522_0])])]), ((shenjs_is_type(shenjs_call(shen_fst, [Arg4522_0])[1], shen_type_cons))
  ? shenjs_call(shen_fst, [Arg4522_0])[1]
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
  function shen_user_lambda4525(Arg4524) {
  if (Arg4524.length < 1) return [shen_type_func, shen_user_lambda4525, 1, Arg4524];
  var Arg4524_0 = Arg4524[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4524_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4524_0])[2], shenjs_call(shen_snd, [Arg4524_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4524_0])[1], [shen_type_symbol, ";"])))
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
  function shen_user_lambda4527(Arg4526) {
  if (Arg4526.length < 3) return [shen_type_func, shen_user_lambda4527, 3, Arg4526];
  var Arg4526_0 = Arg4526[0], Arg4526_1 = Arg4526[1], Arg4526_2 = Arg4526[2];
  var R0;
  return ((R0 = shenjs_unwind_tail(shenjs_thaw(Arg4526_2))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? Arg4526_0
  : R0))},
  3,
  [],
  "cut"];
shenjs_functions["shen_cut"] = shen_cut;






shen_insert$_modes = [shen_type_func,
  function shen_user_lambda4529(Arg4528) {
  if (Arg4528.length < 1) return [shen_type_func, shen_user_lambda4529, 1, Arg4528];
  var Arg4528_0 = Arg4528[0];
  return (((shenjs_is_type(Arg4528_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4528_0[1])) && (shenjs_is_type(Arg4528_0[2], shen_type_cons) && (shenjs_is_type(Arg4528_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4528_0[2][2][2]))))))
  ? Arg4528_0
  : ((shenjs_empty$question$(Arg4528_0))
  ? []
  : ((shenjs_is_type(Arg4528_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4528_0[1], [shen_type_cons, [shen_type_symbol, "+"], []]]], [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, shenjs_call(shen_insert$_modes, [Arg4528_0[2]]), [shen_type_cons, [shen_type_symbol, "-"], []]]]]
  : Arg4528_0)))},
  1,
  [],
  "shen-insert_modes"];
shenjs_functions["shen_shen-insert_modes"] = shen_insert$_modes;






shen_s_prolog = [shen_type_func,
  function shen_user_lambda4531(Arg4530) {
  if (Arg4530.length < 1) return [shen_type_func, shen_user_lambda4531, 1, Arg4530];
  var Arg4530_0 = Arg4530[0];
  return (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda4533(Arg4532) {
  if (Arg4532.length < 1) return [shen_type_func, shen_user_lambda4533, 1, Arg4532];
  var Arg4532_0 = Arg4532[0];
  return (function() {
  return shenjs_call_tail(shen_eval, [Arg4532_0]);})},
  1,
  []], shenjs_call(shen_prolog_$gt$shen, [Arg4530_0])]);})},
  1,
  [],
  "shen-s-prolog"];
shenjs_functions["shen_shen-s-prolog"] = shen_s_prolog;






shen_prolog_$gt$shen = [shen_type_func,
  function shen_user_lambda4535(Arg4534) {
  if (Arg4534.length < 1) return [shen_type_func, shen_user_lambda4535, 1, Arg4534];
  var Arg4534_0 = Arg4534[0];
  return (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda4537(Arg4536) {
  if (Arg4536.length < 1) return [shen_type_func, shen_user_lambda4537, 1, Arg4536];
  var Arg4536_0 = Arg4536[0];
  return (function() {
  return shenjs_call_tail(shen_compile$_prolog$_procedure, [Arg4536_0]);})},
  1,
  []], shenjs_call(shen_group$_clauses, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4539(Arg4538) {
  if (Arg4538.length < 1) return [shen_type_func, shen_user_lambda4539, 1, Arg4538];
  var Arg4538_0 = Arg4538[0];
  return (function() {
  return shenjs_call_tail(shen_s_prolog$_clause, [Arg4538_0]);})},
  1,
  []], shenjs_call(shen_mapcan, [[shen_type_func,
  function shen_user_lambda4541(Arg4540) {
  if (Arg4540.length < 1) return [shen_type_func, shen_user_lambda4541, 1, Arg4540];
  var Arg4540_0 = Arg4540[0];
  return (function() {
  return shenjs_call_tail(shen_head$_abstraction, [Arg4540_0]);})},
  1,
  []], Arg4534_0])])])]);})},
  1,
  [],
  "shen-prolog->shen"];
shenjs_functions["shen_shen-prolog->shen"] = shen_prolog_$gt$shen;






shen_s_prolog$_clause = [shen_type_func,
  function shen_user_lambda4543(Arg4542) {
  if (Arg4542.length < 1) return [shen_type_func, shen_user_lambda4543, 1, Arg4542];
  var Arg4542_0 = Arg4542[0];
  return (((shenjs_is_type(Arg4542_0, shen_type_cons) && (shenjs_is_type(Arg4542_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg4542_0[2][1])) && (shenjs_is_type(Arg4542_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4542_0[2][2][2]))))))
  ? [shen_type_cons, Arg4542_0[1], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4545(Arg4544) {
  if (Arg4544.length < 1) return [shen_type_func, shen_user_lambda4545, 1, Arg4544];
  var Arg4544_0 = Arg4544[0];
  return (function() {
  return shenjs_call_tail(shen_s_prolog$_literal, [Arg4544_0]);})},
  1,
  []], Arg4542_0[2][2][1]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-s-prolog_clause"]]);}))},
  1,
  [],
  "shen-s-prolog_clause"];
shenjs_functions["shen_shen-s-prolog_clause"] = shen_s_prolog$_clause;






shen_head$_abstraction = [shen_type_func,
  function shen_user_lambda4547(Arg4546) {
  if (Arg4546.length < 1) return [shen_type_func, shen_user_lambda4547, 1, Arg4546];
  var Arg4546_0 = Arg4546[0];
  var R0, R1;
  return (((shenjs_is_type(Arg4546_0, shen_type_cons) && (shenjs_is_type(Arg4546_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg4546_0[2][1])) && (shenjs_is_type(Arg4546_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4546_0[2][2][2]) && (shenjs_call(shen_complexity$_head, [Arg4546_0[1]]) < (shenjs_globals["shen_shen-*maxcomplexity*"]))))))))
  ? [shen_type_cons, Arg4546_0, []]
  : (((shenjs_is_type(Arg4546_0, shen_type_cons) && (shenjs_is_type(Arg4546_0[1], shen_type_cons) && (shenjs_is_type(Arg4546_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg4546_0[2][1])) && (shenjs_is_type(Arg4546_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4546_0[2][2][2])))))))
  ? ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4549(Arg4548) {
  if (Arg4548.length < 1) return [shen_type_func, shen_user_lambda4549, 1, Arg4548];
  var Arg4548_0 = Arg4548[0];
  return (function() {
  return shenjs_call_tail(shen_gensym, [[shen_type_symbol, "V"]]);})},
  1,
  []], Arg4546_0[1][2]])),
  (R1 = shenjs_call(shen_rcons$_form, [shenjs_call(shen_remove$_modes, [Arg4546_0[1][2]])])),
  (R1 = [shen_type_cons, [shen_type_symbol, "unify"], [shen_type_cons, shenjs_call(shen_cons$_form, [R0]), [shen_type_cons, R1, []]]]),
  (R1 = [shen_type_cons, [shen_type_cons, Arg4546_0[1][1], R0], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [shen_type_cons, R1, Arg4546_0[2][2][1]], []]]]),
  [shen_type_cons, R1, []])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-head_abstraction"]]);})))},
  1,
  [],
  "shen-head_abstraction"];
shenjs_functions["shen_shen-head_abstraction"] = shen_head$_abstraction;






shen_complexity$_head = [shen_type_func,
  function shen_user_lambda4551(Arg4550) {
  if (Arg4550.length < 1) return [shen_type_func, shen_user_lambda4551, 1, Arg4550];
  var Arg4550_0 = Arg4550[0];
  return ((shenjs_is_type(Arg4550_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_product, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4553(Arg4552) {
  if (Arg4552.length < 1) return [shen_type_func, shen_user_lambda4553, 1, Arg4552];
  var Arg4552_0 = Arg4552[0];
  return (function() {
  return shenjs_call_tail(shen_complexity, [Arg4552_0]);})},
  1,
  []], Arg4550_0[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-complexity_head"]]);}))},
  1,
  [],
  "shen-complexity_head"];
shenjs_functions["shen_shen-complexity_head"] = shen_complexity$_head;






shen_complexity = [shen_type_func,
  function shen_user_lambda4555(Arg4554) {
  if (Arg4554.length < 1) return [shen_type_func, shen_user_lambda4555, 1, Arg4554];
  var Arg4554_0 = Arg4554[0];
  return (((shenjs_is_type(Arg4554_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4554_0[1])) && (shenjs_is_type(Arg4554_0[2], shen_type_cons) && (shenjs_is_type(Arg4554_0[2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4554_0[2][1][1])) && (shenjs_is_type(Arg4554_0[2][1][2], shen_type_cons) && (shenjs_is_type(Arg4554_0[2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4554_0[2][1][2][2][2]) && (shenjs_is_type(Arg4554_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4554_0[2][2][2])))))))))))
  ? (function() {
  return shenjs_call_tail(shen_complexity, [Arg4554_0[2][1]]);})
  : (((shenjs_is_type(Arg4554_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4554_0[1])) && (shenjs_is_type(Arg4554_0[2], shen_type_cons) && (shenjs_is_type(Arg4554_0[2][1], shen_type_cons) && (shenjs_is_type(Arg4554_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4554_0[2][2][1])) && shenjs_empty$question$(Arg4554_0[2][2][2]))))))))
  ? (2 * (shenjs_call(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4554_0[2][1][1], Arg4554_0[2][2]]]]) * shenjs_call(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4554_0[2][1][2], Arg4554_0[2][2]]]])))
  : (((shenjs_is_type(Arg4554_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4554_0[1])) && (shenjs_is_type(Arg4554_0[2], shen_type_cons) && (shenjs_is_type(Arg4554_0[2][1], shen_type_cons) && (shenjs_is_type(Arg4554_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4554_0[2][2][1])) && shenjs_empty$question$(Arg4554_0[2][2][2]))))))))
  ? (shenjs_call(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4554_0[2][1][1], Arg4554_0[2][2]]]]) * shenjs_call(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4554_0[2][1][2], Arg4554_0[2][2]]]]))
  : (((shenjs_is_type(Arg4554_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4554_0[1])) && (shenjs_is_type(Arg4554_0[2], shen_type_cons) && (shenjs_is_type(Arg4554_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4554_0[2][2][2]) && shenjs_call(shen_variable$question$, [Arg4554_0[2][1]])))))))
  ? 1
  : (((shenjs_is_type(Arg4554_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4554_0[1])) && (shenjs_is_type(Arg4554_0[2], shen_type_cons) && (shenjs_is_type(Arg4554_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4554_0[2][2][1])) && shenjs_empty$question$(Arg4554_0[2][2][2])))))))
  ? 2
  : (((shenjs_is_type(Arg4554_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4554_0[1])) && (shenjs_is_type(Arg4554_0[2], shen_type_cons) && (shenjs_is_type(Arg4554_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4554_0[2][2][1])) && shenjs_empty$question$(Arg4554_0[2][2][2])))))))
  ? 1
  : (function() {
  return shenjs_call_tail(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4554_0, [shen_type_cons, [shen_type_symbol, "+"], []]]]]);})))))))},
  1,
  [],
  "shen-complexity"];
shenjs_functions["shen_shen-complexity"] = shen_complexity;






shen_product = [shen_type_func,
  function shen_user_lambda4557(Arg4556) {
  if (Arg4556.length < 1) return [shen_type_func, shen_user_lambda4557, 1, Arg4556];
  var Arg4556_0 = Arg4556[0];
  return ((shenjs_empty$question$(Arg4556_0))
  ? 1
  : ((shenjs_is_type(Arg4556_0, shen_type_cons))
  ? (Arg4556_0[1] * shenjs_call(shen_product, [Arg4556_0[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-product"]]);})))},
  1,
  [],
  "shen-product"];
shenjs_functions["shen_shen-product"] = shen_product;






shen_s_prolog$_literal = [shen_type_func,
  function shen_user_lambda4559(Arg4558) {
  if (Arg4558.length < 1) return [shen_type_func, shen_user_lambda4559, 1, Arg4558];
  var Arg4558_0 = Arg4558[0];
  return (((shenjs_is_type(Arg4558_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "is"], Arg4558_0[1])) && (shenjs_is_type(Arg4558_0[2], shen_type_cons) && (shenjs_is_type(Arg4558_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4558_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, Arg4558_0[2][1], [shen_type_cons, shenjs_call(shen_insert$_deref, [Arg4558_0[2][2][1]]), []]]]
  : (((shenjs_is_type(Arg4558_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "when"], Arg4558_0[1])) && (shenjs_is_type(Arg4558_0[2], shen_type_cons) && shenjs_empty$question$(Arg4558_0[2][2])))))
  ? [shen_type_cons, [shen_type_symbol, "fwhen"], [shen_type_cons, shenjs_call(shen_insert$_deref, [Arg4558_0[2][1]]), []]]
  : (((shenjs_is_type(Arg4558_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "bind"], Arg4558_0[1])) && (shenjs_is_type(Arg4558_0[2], shen_type_cons) && (shenjs_is_type(Arg4558_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4558_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, Arg4558_0[2][1], [shen_type_cons, shenjs_call(shen_insert$_lazyderef, [Arg4558_0[2][2][1]]), []]]]
  : (((shenjs_is_type(Arg4558_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fwhen"], Arg4558_0[1])) && (shenjs_is_type(Arg4558_0[2], shen_type_cons) && shenjs_empty$question$(Arg4558_0[2][2])))))
  ? [shen_type_cons, [shen_type_symbol, "fwhen"], [shen_type_cons, shenjs_call(shen_insert$_lazyderef, [Arg4558_0[2][1]]), []]]
  : ((shenjs_is_type(Arg4558_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_m$_prolog$_to$_s_prolog$_predicate, [Arg4558_0[1]]), Arg4558_0[2]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-s-prolog_literal"]]);}))))))},
  1,
  [],
  "shen-s-prolog_literal"];
shenjs_functions["shen_shen-s-prolog_literal"] = shen_s_prolog$_literal;






shen_insert$_deref = [shen_type_func,
  function shen_user_lambda4561(Arg4560) {
  if (Arg4560.length < 1) return [shen_type_func, shen_user_lambda4561, 1, Arg4560];
  var Arg4560_0 = Arg4560[0];
  return ((shenjs_call(shen_variable$question$, [Arg4560_0]))
  ? [shen_type_cons, [shen_type_symbol, "shen-deref"], [shen_type_cons, Arg4560_0, [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]]
  : ((shenjs_is_type(Arg4560_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_insert$_deref, [Arg4560_0[1]]), shenjs_call(shen_insert$_deref, [Arg4560_0[2]])]
  : Arg4560_0))},
  1,
  [],
  "shen-insert_deref"];
shenjs_functions["shen_shen-insert_deref"] = shen_insert$_deref;






shen_insert$_lazyderef = [shen_type_func,
  function shen_user_lambda4563(Arg4562) {
  if (Arg4562.length < 1) return [shen_type_func, shen_user_lambda4563, 1, Arg4562];
  var Arg4562_0 = Arg4562[0];
  return ((shenjs_call(shen_variable$question$, [Arg4562_0]))
  ? [shen_type_cons, [shen_type_symbol, "shen-lazyderef"], [shen_type_cons, Arg4562_0, [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]]
  : ((shenjs_is_type(Arg4562_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_insert$_lazyderef, [Arg4562_0[1]]), shenjs_call(shen_insert$_lazyderef, [Arg4562_0[2]])]
  : Arg4562_0))},
  1,
  [],
  "shen-insert_lazyderef"];
shenjs_functions["shen_shen-insert_lazyderef"] = shen_insert$_lazyderef;






shen_m$_prolog$_to$_s_prolog$_predicate = [shen_type_func,
  function shen_user_lambda4565(Arg4564) {
  if (Arg4564.length < 1) return [shen_type_func, shen_user_lambda4565, 1, Arg4564];
  var Arg4564_0 = Arg4564[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "="], Arg4564_0)))
  ? [shen_type_symbol, "unify"]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "=!"], Arg4564_0)))
  ? [shen_type_symbol, "unify!"]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "=="], Arg4564_0)))
  ? [shen_type_symbol, "identical"]
  : Arg4564_0)))},
  1,
  [],
  "shen-m_prolog_to_s-prolog_predicate"];
shenjs_functions["shen_shen-m_prolog_to_s-prolog_predicate"] = shen_m$_prolog$_to$_s_prolog$_predicate;






shen_group$_clauses = [shen_type_func,
  function shen_user_lambda4567(Arg4566) {
  if (Arg4566.length < 1) return [shen_type_func, shen_user_lambda4567, 1, Arg4566];
  var Arg4566_0 = Arg4566[0];
  var R0, R1;
  return ((shenjs_empty$question$(Arg4566_0))
  ? []
  : ((shenjs_is_type(Arg4566_0, shen_type_cons))
  ? ((R0 = shenjs_call(shen_collect, [[shen_type_func,
  function shen_user_lambda4569(Arg4568) {
  if (Arg4568.length < 2) return [shen_type_func, shen_user_lambda4569, 2, Arg4568];
  var Arg4568_0 = Arg4568[0], Arg4568_1 = Arg4568[1];
  return (function() {
  return shenjs_call_tail(shen_same$_predicate$question$, [Arg4568_0[1], Arg4568_1]);})},
  2,
  [Arg4566_0]], Arg4566_0])),
  (R1 = shenjs_call(shen_difference, [Arg4566_0, R0])),
  [shen_type_cons, R0, shenjs_call(shen_group$_clauses, [R1])])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-group_clauses"]]);})))},
  1,
  [],
  "shen-group_clauses"];
shenjs_functions["shen_shen-group_clauses"] = shen_group$_clauses;






shen_collect = [shen_type_func,
  function shen_user_lambda4571(Arg4570) {
  if (Arg4570.length < 2) return [shen_type_func, shen_user_lambda4571, 2, Arg4570];
  var Arg4570_0 = Arg4570[0], Arg4570_1 = Arg4570[1];
  return ((shenjs_empty$question$(Arg4570_1))
  ? []
  : ((shenjs_is_type(Arg4570_1, shen_type_cons))
  ? ((shenjs_call(Arg4570_0, [Arg4570_1[1]]))
  ? [shen_type_cons, Arg4570_1[1], shenjs_call(shen_collect, [Arg4570_0, Arg4570_1[2]])]
  : (function() {
  return shenjs_call_tail(shen_collect, [Arg4570_0, Arg4570_1[2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-collect"]]);})))},
  2,
  [],
  "shen-collect"];
shenjs_functions["shen_shen-collect"] = shen_collect;






shen_same$_predicate$question$ = [shen_type_func,
  function shen_user_lambda4573(Arg4572) {
  if (Arg4572.length < 2) return [shen_type_func, shen_user_lambda4573, 2, Arg4572];
  var Arg4572_0 = Arg4572[0], Arg4572_1 = Arg4572[1];
  return (((shenjs_is_type(Arg4572_0, shen_type_cons) && (shenjs_is_type(Arg4572_0[1], shen_type_cons) && (shenjs_is_type(Arg4572_1, shen_type_cons) && shenjs_is_type(Arg4572_1[1], shen_type_cons)))))
  ? shenjs_$eq$(Arg4572_0[1][1], Arg4572_1[1][1])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-same_predicate?"]]);}))},
  2,
  [],
  "shen-same_predicate?"];
shenjs_functions["shen_shen-same_predicate?"] = shen_same$_predicate$question$;






shen_compile$_prolog$_procedure = [shen_type_func,
  function shen_user_lambda4575(Arg4574) {
  if (Arg4574.length < 1) return [shen_type_func, shen_user_lambda4575, 1, Arg4574];
  var Arg4574_0 = Arg4574[0];
  var R0;
  return ((R0 = shenjs_call(shen_procedure$_name, [Arg4574_0])),
  (R0 = shenjs_call(shen_clauses_to_shen, [R0, Arg4574_0])),
  R0)},
  1,
  [],
  "shen-compile_prolog_procedure"];
shenjs_functions["shen_shen-compile_prolog_procedure"] = shen_compile$_prolog$_procedure;






shen_procedure$_name = [shen_type_func,
  function shen_user_lambda4577(Arg4576) {
  if (Arg4576.length < 1) return [shen_type_func, shen_user_lambda4577, 1, Arg4576];
  var Arg4576_0 = Arg4576[0];
  return (((shenjs_is_type(Arg4576_0, shen_type_cons) && (shenjs_is_type(Arg4576_0[1], shen_type_cons) && shenjs_is_type(Arg4576_0[1][1], shen_type_cons))))
  ? Arg4576_0[1][1][1]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-procedure_name"]]);}))},
  1,
  [],
  "shen-procedure_name"];
shenjs_functions["shen_shen-procedure_name"] = shen_procedure$_name;






shen_clauses_to_shen = [shen_type_func,
  function shen_user_lambda4579(Arg4578) {
  if (Arg4578.length < 2) return [shen_type_func, shen_user_lambda4579, 2, Arg4578];
  var Arg4578_0 = Arg4578[0], Arg4578_1 = Arg4578[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4581(Arg4580) {
  if (Arg4580.length < 1) return [shen_type_func, shen_user_lambda4581, 1, Arg4580];
  var Arg4580_0 = Arg4580[0];
  return (function() {
  return shenjs_call_tail(shen_linearise_clause, [Arg4580_0]);})},
  1,
  []], Arg4578_1])),
  (R1 = shenjs_call(shen_prolog_aritycheck, [Arg4578_0, shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4583(Arg4582) {
  if (Arg4582.length < 1) return [shen_type_func, shen_user_lambda4583, 1, Arg4582];
  var Arg4582_0 = Arg4582[0];
  return (function() {
  return shenjs_call_tail(shen_head, [Arg4582_0]);})},
  1,
  []], Arg4578_1])])),
  (R1 = shenjs_call(shen_parameters, [R1])),
  (R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4585(Arg4584) {
  if (Arg4584.length < 2) return [shen_type_func, shen_user_lambda4585, 2, Arg4584];
  var Arg4584_0 = Arg4584[0], Arg4584_1 = Arg4584[1];
  return (function() {
  return shenjs_call_tail(shen_aum, [Arg4584_1, Arg4584_0]);})},
  2,
  [R1]], R0])),
  (R0 = shenjs_call(shen_catch_cut, [shenjs_call(shen_nest_disjunct, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4587(Arg4586) {
  if (Arg4586.length < 1) return [shen_type_func, shen_user_lambda4587, 1, Arg4586];
  var Arg4586_0 = Arg4586[0];
  return (function() {
  return shenjs_call_tail(shen_aum$_to$_shen, [Arg4586_0]);})},
  1,
  []], R0])])])),
  (R1 = [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg4578_0, shenjs_call(shen_append, [R1, shenjs_call(shen_append, [[shen_type_cons, [shen_type_symbol, "ProcessN"], [shen_type_cons, [shen_type_symbol, "Continuation"], []]], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, R0, []]]])])]]),
  R1)},
  2,
  [],
  "shen-clauses-to-shen"];
shenjs_functions["shen_shen-clauses-to-shen"] = shen_clauses_to_shen;






shen_catch_cut = [shen_type_func,
  function shen_user_lambda4589(Arg4588) {
  if (Arg4588.length < 1) return [shen_type_func, shen_user_lambda4589, 1, Arg4588];
  var Arg4588_0 = Arg4588[0];
  return (((!shenjs_call(shen_occurs$question$, [[shen_type_symbol, "cut"], Arg4588_0])))
  ? Arg4588_0
  : [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Throwcontrol"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-catchpoint"], []], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-cutpoint"], [shen_type_cons, [shen_type_symbol, "Throwcontrol"], [shen_type_cons, Arg4588_0, []]]], []]]]])},
  1,
  [],
  "shen-catch-cut"];
shenjs_functions["shen_shen-catch-cut"] = shen_catch_cut;






shen_catchpoint = [shen_type_func,
  function shen_user_lambda4591(Arg4590) {
  if (Arg4590.length < 0) return [shen_type_func, shen_user_lambda4591, 0, Arg4590];
  return (shenjs_globals["shen_shen-*catch*"] = (1 + (shenjs_globals["shen_shen-*catch*"])))},
  0,
  [],
  "shen-catchpoint"];
shenjs_functions["shen_shen-catchpoint"] = shen_catchpoint;






shen_cutpoint = [shen_type_func,
  function shen_user_lambda4593(Arg4592) {
  if (Arg4592.length < 2) return [shen_type_func, shen_user_lambda4593, 2, Arg4592];
  var Arg4592_0 = Arg4592[0], Arg4592_1 = Arg4592[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4592_1, Arg4592_0)))
  ? false
  : Arg4592_1)},
  2,
  [],
  "shen-cutpoint"];
shenjs_functions["shen_shen-cutpoint"] = shen_cutpoint;






shen_nest_disjunct = [shen_type_func,
  function shen_user_lambda4595(Arg4594) {
  if (Arg4594.length < 1) return [shen_type_func, shen_user_lambda4595, 1, Arg4594];
  var Arg4594_0 = Arg4594[0];
  return (((shenjs_is_type(Arg4594_0, shen_type_cons) && shenjs_empty$question$(Arg4594_0[2])))
  ? Arg4594_0[1]
  : ((shenjs_is_type(Arg4594_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_lisp_or, [Arg4594_0[1], shenjs_call(shen_nest_disjunct, [Arg4594_0[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-nest-disjunct"]]);})))},
  1,
  [],
  "shen-nest-disjunct"];
shenjs_functions["shen_shen-nest-disjunct"] = shen_nest_disjunct;






shen_lisp_or = [shen_type_func,
  function shen_user_lambda4597(Arg4596) {
  if (Arg4596.length < 2) return [shen_type_func, shen_user_lambda4597, 2, Arg4596];
  var Arg4596_0 = Arg4596[0], Arg4596_1 = Arg4596[1];
  return [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Case"], [shen_type_cons, Arg4596_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "Case"], [shen_type_cons, false, []]]], [shen_type_cons, Arg4596_1, [shen_type_cons, [shen_type_symbol, "Case"], []]]]], []]]]]},
  2,
  [],
  "shen-lisp-or"];
shenjs_functions["shen_shen-lisp-or"] = shen_lisp_or;






shen_prolog_aritycheck = [shen_type_func,
  function shen_user_lambda4599(Arg4598) {
  if (Arg4598.length < 2) return [shen_type_func, shen_user_lambda4599, 2, Arg4598];
  var Arg4598_0 = Arg4598[0], Arg4598_1 = Arg4598[1];
  return (((shenjs_is_type(Arg4598_1, shen_type_cons) && shenjs_empty$question$(Arg4598_1[2])))
  ? (shenjs_call(shen_length, [Arg4598_1[1]]) - 1)
  : (((shenjs_is_type(Arg4598_1, shen_type_cons) && shenjs_is_type(Arg4598_1[2], shen_type_cons)))
  ? ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_length, [Arg4598_1[1]]), shenjs_call(shen_length, [Arg4598_1[2][1]]))))
  ? (function() {
  return shenjs_call_tail(shen_prolog_aritycheck, [Arg4598_0, Arg4598_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_interror, ["arity error in prolog procedure ~A~%", [shen_tuple, [shen_type_cons, Arg4598_0, []], []]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-prolog-aritycheck"]]);})))},
  2,
  [],
  "shen-prolog-aritycheck"];
shenjs_functions["shen_shen-prolog-aritycheck"] = shen_prolog_aritycheck;






shen_linearise_clause = [shen_type_func,
  function shen_user_lambda4601(Arg4600) {
  if (Arg4600.length < 1) return [shen_type_func, shen_user_lambda4601, 1, Arg4600];
  var Arg4600_0 = Arg4600[0];
  var R0;
  return (((shenjs_is_type(Arg4600_0, shen_type_cons) && (shenjs_is_type(Arg4600_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg4600_0[2][1])) && (shenjs_is_type(Arg4600_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4600_0[2][2][2]))))))
  ? ((R0 = shenjs_call(shen_linearise, [[shen_type_cons, Arg4600_0[1], Arg4600_0[2][2]]])),
  (function() {
  return shenjs_call_tail(shen_clause$_form, [R0]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-linearise-clause"]]);}))},
  1,
  [],
  "shen-linearise-clause"];
shenjs_functions["shen_shen-linearise-clause"] = shen_linearise_clause;






shen_clause$_form = [shen_type_func,
  function shen_user_lambda4603(Arg4602) {
  if (Arg4602.length < 1) return [shen_type_func, shen_user_lambda4603, 1, Arg4602];
  var Arg4602_0 = Arg4602[0];
  return (((shenjs_is_type(Arg4602_0, shen_type_cons) && (shenjs_is_type(Arg4602_0[2], shen_type_cons) && shenjs_empty$question$(Arg4602_0[2][2]))))
  ? [shen_type_cons, shenjs_call(shen_explicit$_modes, [Arg4602_0[1]]), [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, shenjs_call(shen_cf$_help, [Arg4602_0[2][1]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-clause_form"]]);}))},
  1,
  [],
  "shen-clause_form"];
shenjs_functions["shen_shen-clause_form"] = shen_clause$_form;






shen_explicit$_modes = [shen_type_func,
  function shen_user_lambda4605(Arg4604) {
  if (Arg4604.length < 1) return [shen_type_func, shen_user_lambda4605, 1, Arg4604];
  var Arg4604_0 = Arg4604[0];
  return ((shenjs_is_type(Arg4604_0, shen_type_cons))
  ? [shen_type_cons, Arg4604_0[1], shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4607(Arg4606) {
  if (Arg4606.length < 1) return [shen_type_func, shen_user_lambda4607, 1, Arg4606];
  var Arg4606_0 = Arg4606[0];
  return (function() {
  return shenjs_call_tail(shen_em$_help, [Arg4606_0]);})},
  1,
  []], Arg4604_0[2]])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-explicit_modes"]]);}))},
  1,
  [],
  "shen-explicit_modes"];
shenjs_functions["shen_shen-explicit_modes"] = shen_explicit$_modes;






shen_em$_help = [shen_type_func,
  function shen_user_lambda4609(Arg4608) {
  if (Arg4608.length < 1) return [shen_type_func, shen_user_lambda4609, 1, Arg4608];
  var Arg4608_0 = Arg4608[0];
  return (((shenjs_is_type(Arg4608_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4608_0[1])) && (shenjs_is_type(Arg4608_0[2], shen_type_cons) && (shenjs_is_type(Arg4608_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4608_0[2][2][2]))))))
  ? Arg4608_0
  : [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4608_0, [shen_type_cons, [shen_type_symbol, "+"], []]]])},
  1,
  [],
  "shen-em_help"];
shenjs_functions["shen_shen-em_help"] = shen_em$_help;






shen_cf$_help = [shen_type_func,
  function shen_user_lambda4611(Arg4610) {
  if (Arg4610.length < 1) return [shen_type_func, shen_user_lambda4611, 1, Arg4610];
  var Arg4610_0 = Arg4610[0];
  return (((shenjs_is_type(Arg4610_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "where"], Arg4610_0[1])) && (shenjs_is_type(Arg4610_0[2], shen_type_cons) && (shenjs_is_type(Arg4610_0[2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "="], Arg4610_0[2][1][1])) && (shenjs_is_type(Arg4610_0[2][1][2], shen_type_cons) && (shenjs_is_type(Arg4610_0[2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4610_0[2][1][2][2][2]) && (shenjs_is_type(Arg4610_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4610_0[2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_cons, (((shenjs_globals["shen_shen-*occurs*"]))
  ? [shen_type_symbol, "unify!"]
  : [shen_type_symbol, "unify"]), Arg4610_0[2][1][2]], shenjs_call(shen_cf$_help, [Arg4610_0[2][2][1]])]
  : Arg4610_0)},
  1,
  [],
  "shen-cf_help"];
shenjs_functions["shen_shen-cf_help"] = shen_cf$_help;






shen_occurs_check = [shen_type_func,
  function shen_user_lambda4613(Arg4612) {
  if (Arg4612.length < 1) return [shen_type_func, shen_user_lambda4613, 1, Arg4612];
  var Arg4612_0 = Arg4612[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4612_0)))
  ? (shenjs_globals["shen_shen-*occurs*"] = true)
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4612_0)))
  ? (shenjs_globals["shen_shen-*occurs*"] = false)
  : (function() {
  return shenjs_call_tail(shen_interror, ["occurs-check expects + or -~%", []]);})))},
  1,
  [],
  "occurs-check"];
shenjs_functions["shen_occurs-check"] = shen_occurs_check;






shen_aum = [shen_type_func,
  function shen_user_lambda4615(Arg4614) {
  if (Arg4614.length < 2) return [shen_type_func, shen_user_lambda4615, 2, Arg4614];
  var Arg4614_0 = Arg4614[0], Arg4614_1 = Arg4614[1];
  var R0;
  return (((shenjs_is_type(Arg4614_0, shen_type_cons) && (shenjs_is_type(Arg4614_0[1], shen_type_cons) && (shenjs_is_type(Arg4614_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg4614_0[2][1])) && (shenjs_is_type(Arg4614_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4614_0[2][2][2])))))))
  ? ((R0 = shenjs_call(shen_make$_mu$_application, [[shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4614_0[1][2], [shen_type_cons, shenjs_call(shen_continuation$_call, [Arg4614_0[1][2], Arg4614_0[2][2][1]]), []]]], Arg4614_1])),
  (function() {
  return shenjs_call_tail(shen_mu$_reduction, [R0, [shen_type_symbol, "+"]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-aum"]]);}))},
  2,
  [],
  "shen-aum"];
shenjs_functions["shen_shen-aum"] = shen_aum;






shen_continuation$_call = [shen_type_func,
  function shen_user_lambda4617(Arg4616) {
  if (Arg4616.length < 2) return [shen_type_func, shen_user_lambda4617, 2, Arg4616];
  var Arg4616_0 = Arg4616[0], Arg4616_1 = Arg4616[1];
  var R0, R1;
  return ((R0 = [shen_type_cons, [shen_type_symbol, "ProcessN"], shenjs_call(shen_extract$_vars, [Arg4616_0])]),
  (R1 = shenjs_call(shen_extract$_vars, [Arg4616_1])),
  (R1 = shenjs_call(shen_remove, [[shen_type_symbol, "Throwcontrol"], shenjs_call(shen_difference, [R1, R0])])),
  (function() {
  return shenjs_call_tail(shen_cc$_help, [R1, Arg4616_1]);}))},
  2,
  [],
  "shen-continuation_call"];
shenjs_functions["shen_shen-continuation_call"] = shen_continuation$_call;






shen_remove = [shen_type_func,
  function shen_user_lambda4619(Arg4618) {
  if (Arg4618.length < 2) return [shen_type_func, shen_user_lambda4619, 2, Arg4618];
  var Arg4618_0 = Arg4618[0], Arg4618_1 = Arg4618[1];
  return (function() {
  return shenjs_call_tail(shen_remove_h, [Arg4618_0, Arg4618_1, []]);})},
  2,
  [],
  "remove"];
shenjs_functions["shen_remove"] = shen_remove;






shen_remove_h = [shen_type_func,
  function shen_user_lambda4621(Arg4620) {
  if (Arg4620.length < 3) return [shen_type_func, shen_user_lambda4621, 3, Arg4620];
  var Arg4620_0 = Arg4620[0], Arg4620_1 = Arg4620[1], Arg4620_2 = Arg4620[2];
  return ((shenjs_empty$question$(Arg4620_1))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg4620_2]);})
  : (((shenjs_is_type(Arg4620_1, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg4620_1[1], Arg4620_0))))
  ? (function() {
  return shenjs_call_tail(shen_remove_h, [Arg4620_1[1], Arg4620_1[2], Arg4620_2]);})
  : ((shenjs_is_type(Arg4620_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_remove_h, [Arg4620_0, Arg4620_1[2], [shen_type_cons, Arg4620_1[1], Arg4620_2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-remove-h"]]);}))))},
  3,
  [],
  "shen-remove-h"];
shenjs_functions["shen_shen-remove-h"] = shen_remove_h;






shen_cc$_help = [shen_type_func,
  function shen_user_lambda4623(Arg4622) {
  if (Arg4622.length < 2) return [shen_type_func, shen_user_lambda4623, 2, Arg4622];
  var Arg4622_0 = Arg4622[0], Arg4622_1 = Arg4622[1];
  return (((shenjs_empty$question$(Arg4622_0) && shenjs_empty$question$(Arg4622_1)))
  ? [shen_type_cons, [shen_type_symbol, "shen-pop"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-stack"], []]]]
  : ((shenjs_empty$question$(Arg4622_1))
  ? [shen_type_cons, [shen_type_symbol, "shen-rename"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-variables"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, Arg4622_0, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-pop"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-stack"], []]]], []]]]]]]]]
  : ((shenjs_empty$question$(Arg4622_0))
  ? [shen_type_cons, [shen_type_symbol, "call"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-continuation"], [shen_type_cons, Arg4622_1, []]]]]
  : [shen_type_cons, [shen_type_symbol, "shen-rename"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-variables"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, Arg4622_0, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "call"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-continuation"], [shen_type_cons, Arg4622_1, []]]]], []]]]]]]]])))},
  2,
  [],
  "shen-cc_help"];
shenjs_functions["shen_shen-cc_help"] = shen_cc$_help;






shen_make$_mu$_application = [shen_type_func,
  function shen_user_lambda4625(Arg4624) {
  if (Arg4624.length < 2) return [shen_type_func, shen_user_lambda4625, 2, Arg4624];
  var Arg4624_0 = Arg4624[0], Arg4624_1 = Arg4624[1];
  return (((shenjs_is_type(Arg4624_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4624_0[1])) && (shenjs_is_type(Arg4624_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4624_0[2][1]) && (shenjs_is_type(Arg4624_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4624_0[2][2][2]) && shenjs_empty$question$(Arg4624_1))))))))
  ? Arg4624_0[2][2][1]
  : (((shenjs_is_type(Arg4624_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4624_0[1])) && (shenjs_is_type(Arg4624_0[2], shen_type_cons) && (shenjs_is_type(Arg4624_0[2][1], shen_type_cons) && (shenjs_is_type(Arg4624_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4624_0[2][2][2]) && shenjs_is_type(Arg4624_1, shen_type_cons))))))))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4624_0[2][1][1], [shen_type_cons, shenjs_call(shen_make$_mu$_application, [[shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4624_0[2][1][2], Arg4624_0[2][2]]], Arg4624_1[2]]), []]]], [shen_type_cons, Arg4624_1[1], []]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-make_mu_application"]]);})))},
  2,
  [],
  "shen-make_mu_application"];
shenjs_functions["shen_shen-make_mu_application"] = shen_make$_mu$_application;






shen_mu$_reduction = [shen_type_func,
  function shen_user_lambda4627(Arg4626) {
  if (Arg4626.length < 2) return [shen_type_func, shen_user_lambda4627, 2, Arg4626];
  var Arg4626_0 = Arg4626[0], Arg4626_1 = Arg4626[1];
  var R0;
  return (((shenjs_is_type(Arg4626_0, shen_type_cons) && (shenjs_is_type(Arg4626_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4626_0[1][1])) && (shenjs_is_type(Arg4626_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4626_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4626_0[1][2][1][1])) && (shenjs_is_type(Arg4626_0[1][2][1][2], shen_type_cons) && (shenjs_is_type(Arg4626_0[1][2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4626_0[1][2][1][2][2][2]) && (shenjs_is_type(Arg4626_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4626_0[1][2][2][2]) && (shenjs_is_type(Arg4626_0[2], shen_type_cons) && shenjs_empty$question$(Arg4626_0[2][2]))))))))))))))
  ? (function() {
  return shenjs_call_tail(shen_mu$_reduction, [[shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4626_0[1][2][1][2][1], Arg4626_0[1][2][2]]], Arg4626_0[2]], Arg4626_0[1][2][1][2][2][1]]);})
  : (((shenjs_is_type(Arg4626_0, shen_type_cons) && (shenjs_is_type(Arg4626_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4626_0[1][1])) && (shenjs_is_type(Arg4626_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4626_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4626_0[1][2][2][2]) && (shenjs_is_type(Arg4626_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4626_0[2][2]) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "_"], Arg4626_0[1][2][1])))))))))))
  ? (function() {
  return shenjs_call_tail(shen_mu$_reduction, [Arg4626_0[1][2][2][1], Arg4626_1]);})
  : (((shenjs_is_type(Arg4626_0, shen_type_cons) && (shenjs_is_type(Arg4626_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4626_0[1][1])) && (shenjs_is_type(Arg4626_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4626_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4626_0[1][2][2][2]) && (shenjs_is_type(Arg4626_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4626_0[2][2]) && shenjs_call(shen_ephemeral$_variable$question$, [Arg4626_0[1][2][1], Arg4626_0[2][1]]))))))))))
  ? (function() {
  return shenjs_call_tail(shen_subst, [Arg4626_0[2][1], Arg4626_0[1][2][1], shenjs_call(shen_mu$_reduction, [Arg4626_0[1][2][2][1], Arg4626_1])]);})
  : (((shenjs_is_type(Arg4626_0, shen_type_cons) && (shenjs_is_type(Arg4626_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4626_0[1][1])) && (shenjs_is_type(Arg4626_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4626_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4626_0[1][2][2][2]) && (shenjs_is_type(Arg4626_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4626_0[2][2]) && shenjs_call(shen_variable$question$, [Arg4626_0[1][2][1]]))))))))))
  ? [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, Arg4626_0[1][2][1], [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, Arg4626_0[2][1], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg4626_0[1][2][2][1], Arg4626_1]), []]]]]]]
  : (((shenjs_is_type(Arg4626_0, shen_type_cons) && (shenjs_is_type(Arg4626_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4626_0[1][1])) && (shenjs_is_type(Arg4626_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4626_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4626_0[1][2][2][2]) && (shenjs_is_type(Arg4626_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4626_0[2][2]) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4626_1)) && shenjs_call(shen_prolog$_constant$question$, [Arg4626_0[1][2][1]])))))))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-result"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, [shen_type_symbol, "shen-dereferencing"], Arg4626_0[2]]]]], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "identical"], [shen_type_cons, [shen_type_symbol, "shen-to"], [shen_type_cons, Arg4626_0[1][2][1], []]]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg4626_0[1][2][2][1], [shen_type_symbol, "-"]]), [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, shen_fail_obj, []]]]]]], []]]]]]])
  : (((shenjs_is_type(Arg4626_0, shen_type_cons) && (shenjs_is_type(Arg4626_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4626_0[1][1])) && (shenjs_is_type(Arg4626_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4626_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4626_0[1][2][2][2]) && (shenjs_is_type(Arg4626_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4626_0[2][2]) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4626_1)) && shenjs_call(shen_prolog$_constant$question$, [Arg4626_0[1][2][1]])))))))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-result"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, [shen_type_symbol, "shen-dereferencing"], Arg4626_0[2]]]]], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "identical"], [shen_type_cons, [shen_type_symbol, "shen-to"], [shen_type_cons, Arg4626_0[1][2][1], []]]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg4626_0[1][2][2][1], [shen_type_symbol, "+"]]), [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "shen-a"], [shen_type_cons, [shen_type_symbol, "shen-variable"], []]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-to"], [shen_type_cons, Arg4626_0[1][2][1], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg4626_0[1][2][2][1], [shen_type_symbol, "+"]]), []]]]]]], [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, shen_fail_obj, []]]]]]], []]]]]]], []]]]]]])
  : (((shenjs_is_type(Arg4626_0, shen_type_cons) && (shenjs_is_type(Arg4626_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4626_0[1][1])) && (shenjs_is_type(Arg4626_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4626_0[1][2][1], shen_type_cons) && (shenjs_is_type(Arg4626_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4626_0[1][2][2][2]) && (shenjs_is_type(Arg4626_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4626_0[2][2]) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4626_1))))))))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-result"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, [shen_type_symbol, "shen-dereferencing"], Arg4626_0[2]]]]], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "shen-a"], [shen_type_cons, [shen_type_symbol, "shen-non-empty"], [shen_type_cons, [shen_type_symbol, "list"], []]]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [[shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4626_0[1][2][1][1], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4626_0[1][2][1][2], Arg4626_0[1][2][2]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "tail"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, R0, []]]]], []]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "head"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, R0, []]]]], []]], [shen_type_symbol, "-"]]), [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, shen_fail_obj, []]]]]]], []]]]]]])
  : (((shenjs_is_type(Arg4626_0, shen_type_cons) && (shenjs_is_type(Arg4626_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4626_0[1][1])) && (shenjs_is_type(Arg4626_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4626_0[1][2][1], shen_type_cons) && (shenjs_is_type(Arg4626_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4626_0[1][2][2][2]) && (shenjs_is_type(Arg4626_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4626_0[2][2]) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4626_1))))))))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-result"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, [shen_type_symbol, "shen-dereferencing"], Arg4626_0[2]]]]], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "shen-a"], [shen_type_cons, [shen_type_symbol, "shen-non-empty"], [shen_type_cons, [shen_type_symbol, "list"], []]]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [[shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4626_0[1][2][1][1], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4626_0[1][2][1][2], Arg4626_0[1][2][2]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "tail"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, R0, []]]]], []]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "head"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, R0, []]]]], []]], [shen_type_symbol, "+"]]), [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "shen-a"], [shen_type_cons, [shen_type_symbol, "shen-variable"], []]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-rename"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-variables"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, shenjs_call(shen_extract$_vars, [Arg4626_0[1][2][1]]), [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-to"], [shen_type_cons, shenjs_call(shen_rcons$_form, [shenjs_call(shen_remove$_modes, [Arg4626_0[1][2][1]])]), [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg4626_0[1][2][2][1], [shen_type_symbol, "+"]]), []]]]]]], []]]]]]]]], [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, shen_fail_obj, []]]]]]], []]]]]]], []]]]]]])
  : Arg4626_0))))))))},
  2,
  [],
  "shen-mu_reduction"];
shenjs_functions["shen_shen-mu_reduction"] = shen_mu$_reduction;






shen_rcons$_form = [shen_type_func,
  function shen_user_lambda4629(Arg4628) {
  if (Arg4628.length < 1) return [shen_type_func, shen_user_lambda4629, 1, Arg4628];
  var Arg4628_0 = Arg4628[0];
  return ((shenjs_is_type(Arg4628_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg4628_0[1]]), [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg4628_0[2]]), []]]]
  : Arg4628_0)},
  1,
  [],
  "shen-rcons_form"];
shenjs_functions["shen_shen-rcons_form"] = shen_rcons$_form;






shen_remove$_modes = [shen_type_func,
  function shen_user_lambda4631(Arg4630) {
  if (Arg4630.length < 1) return [shen_type_func, shen_user_lambda4631, 1, Arg4630];
  var Arg4630_0 = Arg4630[0];
  return (((shenjs_is_type(Arg4630_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4630_0[1])) && (shenjs_is_type(Arg4630_0[2], shen_type_cons) && (shenjs_is_type(Arg4630_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4630_0[2][2][1])) && shenjs_empty$question$(Arg4630_0[2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(shen_remove$_modes, [Arg4630_0[2][1]]);})
  : (((shenjs_is_type(Arg4630_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4630_0[1])) && (shenjs_is_type(Arg4630_0[2], shen_type_cons) && (shenjs_is_type(Arg4630_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4630_0[2][2][1])) && shenjs_empty$question$(Arg4630_0[2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(shen_remove$_modes, [Arg4630_0[2][1]]);})
  : ((shenjs_is_type(Arg4630_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_remove$_modes, [Arg4630_0[1]]), shenjs_call(shen_remove$_modes, [Arg4630_0[2]])]
  : Arg4630_0)))},
  1,
  [],
  "shen-remove_modes"];
shenjs_functions["shen_shen-remove_modes"] = shen_remove$_modes;






shen_ephemeral$_variable$question$ = [shen_type_func,
  function shen_user_lambda4633(Arg4632) {
  if (Arg4632.length < 2) return [shen_type_func, shen_user_lambda4633, 2, Arg4632];
  var Arg4632_0 = Arg4632[0], Arg4632_1 = Arg4632[1];
  return (shenjs_call(shen_variable$question$, [Arg4632_0]) && shenjs_call(shen_variable$question$, [Arg4632_1]))},
  2,
  [],
  "shen-ephemeral_variable?"];
shenjs_functions["shen_shen-ephemeral_variable?"] = shen_ephemeral$_variable$question$;






shen_prolog$_constant$question$ = [shen_type_func,
  function shen_user_lambda4635(Arg4634) {
  if (Arg4634.length < 1) return [shen_type_func, shen_user_lambda4635, 1, Arg4634];
  var Arg4634_0 = Arg4634[0];
  return ((shenjs_is_type(Arg4634_0, shen_type_cons))
  ? false
  : true)},
  1,
  [],
  "shen-prolog_constant?"];
shenjs_functions["shen_shen-prolog_constant?"] = shen_prolog$_constant$question$;






shen_aum$_to$_shen = [shen_type_func,
  function shen_user_lambda4637(Arg4636) {
  if (Arg4636.length < 1) return [shen_type_func, shen_user_lambda4637, 1, Arg4636];
  var Arg4636_0 = Arg4636[0];
  return (((shenjs_is_type(Arg4636_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg4636_0[1])) && (shenjs_is_type(Arg4636_0[2], shen_type_cons) && (shenjs_is_type(Arg4636_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-be"], Arg4636_0[2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2], shen_type_cons) && (shenjs_is_type(Arg4636_0[2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "in"], Arg4636_0[2][2][2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4636_0[2][2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, Arg4636_0[2][1], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4636_0[2][2][2][1]]), [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4636_0[2][2][2][2][2][1]]), []]]]]
  : (((shenjs_is_type(Arg4636_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4636_0[1])) && (shenjs_is_type(Arg4636_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-result"], Arg4636_0[2][1])) && (shenjs_is_type(Arg4636_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-of"], Arg4636_0[2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-dereferencing"], Arg4636_0[2][2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4636_0[2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "shen-lazyderef"], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4636_0[2][2][2][2][1]]), [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]]
  : (((shenjs_is_type(Arg4636_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "if"], Arg4636_0[1])) && (shenjs_is_type(Arg4636_0[2], shen_type_cons) && (shenjs_is_type(Arg4636_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-then"], Arg4636_0[2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2], shen_type_cons) && (shenjs_is_type(Arg4636_0[2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-else"], Arg4636_0[2][2][2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4636_0[2][2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4636_0[2][1]]), [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4636_0[2][2][2][1]]), [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4636_0[2][2][2][2][2][1]]), []]]]]
  : (((shenjs_is_type(Arg4636_0, shen_type_cons) && (shenjs_is_type(Arg4636_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "is"], Arg4636_0[2][1])) && (shenjs_is_type(Arg4636_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-a"], Arg4636_0[2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-variable"], Arg4636_0[2][2][2][1])) && shenjs_empty$question$(Arg4636_0[2][2][2][2])))))))))
  ? [shen_type_cons, [shen_type_symbol, "shen-pvar?"], [shen_type_cons, Arg4636_0[1], []]]
  : (((shenjs_is_type(Arg4636_0, shen_type_cons) && (shenjs_is_type(Arg4636_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "is"], Arg4636_0[2][1])) && (shenjs_is_type(Arg4636_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-a"], Arg4636_0[2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-non-empty"], Arg4636_0[2][2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "list"], Arg4636_0[2][2][2][2][1])) && shenjs_empty$question$(Arg4636_0[2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, Arg4636_0[1], []]]
  : (((shenjs_is_type(Arg4636_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-rename"], Arg4636_0[1])) && (shenjs_is_type(Arg4636_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4636_0[2][1])) && (shenjs_is_type(Arg4636_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-variables"], Arg4636_0[2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "in"], Arg4636_0[2][2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4636_0[2][2][2][2][1]) && (shenjs_is_type(Arg4636_0[2][2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "and"], Arg4636_0[2][2][2][2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-then"], Arg4636_0[2][2][2][2][2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4636_0[2][2][2][2][2][2][2][2])))))))))))))))))
  ? (function() {
  return shenjs_call_tail(shen_aum$_to$_shen, [Arg4636_0[2][2][2][2][2][2][2][1]]);})
  : (((shenjs_is_type(Arg4636_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-rename"], Arg4636_0[1])) && (shenjs_is_type(Arg4636_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4636_0[2][1])) && (shenjs_is_type(Arg4636_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-variables"], Arg4636_0[2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "in"], Arg4636_0[2][2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2][2], shen_type_cons) && (shenjs_is_type(Arg4636_0[2][2][2][2][1], shen_type_cons) && (shenjs_is_type(Arg4636_0[2][2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "and"], Arg4636_0[2][2][2][2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-then"], Arg4636_0[2][2][2][2][2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4636_0[2][2][2][2][2][2][2][2])))))))))))))))))
  ? [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, Arg4636_0[2][2][2][2][1][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-newpv"], [shen_type_cons, [shen_type_symbol, "ProcessN"], []]], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [[shen_type_cons, [shen_type_symbol, "shen-rename"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-variables"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, Arg4636_0[2][2][2][2][1][2], Arg4636_0[2][2][2][2][2]]]]]]]), []]]]]
  : (((shenjs_is_type(Arg4636_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "bind"], Arg4636_0[1])) && (shenjs_is_type(Arg4636_0[2], shen_type_cons) && (shenjs_is_type(Arg4636_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-to"], Arg4636_0[2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2], shen_type_cons) && (shenjs_is_type(Arg4636_0[2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "in"], Arg4636_0[2][2][2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4636_0[2][2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-bindv"], [shen_type_cons, Arg4636_0[2][1], [shen_type_cons, shenjs_call(shen_chwild, [Arg4636_0[2][2][2][1]]), [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4636_0[2][2][2][2][2][1]]), [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-unbindv"], [shen_type_cons, Arg4636_0[2][1], [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]], [shen_type_cons, [shen_type_symbol, "Result"], []]]], []]]]], []]]]
  : (((shenjs_is_type(Arg4636_0, shen_type_cons) && (shenjs_is_type(Arg4636_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "is"], Arg4636_0[2][1])) && (shenjs_is_type(Arg4636_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "identical"], Arg4636_0[2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-to"], Arg4636_0[2][2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4636_0[2][2][2][2][2]))))))))))
  ? [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, Arg4636_0[2][2][2][2][1], [shen_type_cons, Arg4636_0[1], []]]]
  : ((shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, Arg4636_0)))
  ? false
  : (((shenjs_is_type(Arg4636_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4636_0[1])) && (shenjs_is_type(Arg4636_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "head"], Arg4636_0[2][1])) && (shenjs_is_type(Arg4636_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-of"], Arg4636_0[2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4636_0[2][2][2][2])))))))))
  ? [shen_type_cons, [shen_type_symbol, "hd"], Arg4636_0[2][2][2]]
  : (((shenjs_is_type(Arg4636_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4636_0[1])) && (shenjs_is_type(Arg4636_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "tail"], Arg4636_0[2][1])) && (shenjs_is_type(Arg4636_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-of"], Arg4636_0[2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4636_0[2][2][2][2])))))))))
  ? [shen_type_cons, [shen_type_symbol, "tl"], Arg4636_0[2][2][2]]
  : (((shenjs_is_type(Arg4636_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-pop"], Arg4636_0[1])) && (shenjs_is_type(Arg4636_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4636_0[2][1])) && (shenjs_is_type(Arg4636_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-stack"], Arg4636_0[2][2][1])) && shenjs_empty$question$(Arg4636_0[2][2][2]))))))))
  ? [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-incinfs"], []], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, [shen_type_symbol, "Continuation"], []]], []]]]
  : (((shenjs_is_type(Arg4636_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "call"], Arg4636_0[1])) && (shenjs_is_type(Arg4636_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4636_0[2][1])) && (shenjs_is_type(Arg4636_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-continuation"], Arg4636_0[2][2][1])) && (shenjs_is_type(Arg4636_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4636_0[2][2][2][2])))))))))
  ? [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-incinfs"], []], [shen_type_cons, shenjs_call(shen_call$_the$_continuation, [shenjs_call(shen_chwild, [Arg4636_0[2][2][2][1]]), [shen_type_symbol, "ProcessN"], [shen_type_symbol, "Continuation"]]), []]]]
  : Arg4636_0))))))))))))))},
  1,
  [],
  "shen-aum_to_shen"];
shenjs_functions["shen_shen-aum_to_shen"] = shen_aum$_to$_shen;






shen_chwild = [shen_type_func,
  function shen_user_lambda4639(Arg4638) {
  if (Arg4638.length < 1) return [shen_type_func, shen_user_lambda4639, 1, Arg4638];
  var Arg4638_0 = Arg4638[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4638_0, [shen_type_symbol, "_"])))
  ? [shen_type_cons, [shen_type_symbol, "shen-newpv"], [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]
  : ((shenjs_is_type(Arg4638_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda4641(Arg4640) {
  if (Arg4640.length < 1) return [shen_type_func, shen_user_lambda4641, 1, Arg4640];
  var Arg4640_0 = Arg4640[0];
  return (function() {
  return shenjs_call_tail(shen_chwild, [Arg4640_0]);})},
  1,
  []], Arg4638_0]);})
  : Arg4638_0))},
  1,
  [],
  "shen-chwild"];
shenjs_functions["shen_shen-chwild"] = shen_chwild;






shen_newpv = [shen_type_func,
  function shen_user_lambda4643(Arg4642) {
  if (Arg4642.length < 1) return [shen_type_func, shen_user_lambda4643, 1, Arg4642];
  var Arg4642_0 = Arg4642[0];
  var R0, R1;
  return ((R0 = (shenjs_absvector_ref((shenjs_globals["shen_shen-*varcounter*"]), Arg4642_0) + 1)),
  shenjs_absvector_set((shenjs_globals["shen_shen-*varcounter*"]), Arg4642_0, R0),
  (R1 = shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg4642_0)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shenjs_call(shen_limit, [R1]))))
  ? shenjs_call(shen_resizeprocessvector, [Arg4642_0, R0])
  : [shen_type_symbol, "shen-skip"]),
  (function() {
  return shenjs_call_tail(shen_mk_pvar, [R0]);}))},
  1,
  [],
  "shen-newpv"];
shenjs_functions["shen_shen-newpv"] = shen_newpv;






shen_resizeprocessvector = [shen_type_func,
  function shen_user_lambda4645(Arg4644) {
  if (Arg4644.length < 2) return [shen_type_func, shen_user_lambda4645, 2, Arg4644];
  var Arg4644_0 = Arg4644[0], Arg4644_1 = Arg4644[1];
  var R0;
  return ((R0 = shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg4644_0)),
  (R0 = shenjs_call(shen_resize_vector, [R0, (Arg4644_1 + Arg4644_1), [shen_type_symbol, "shen--null-"]])),
  shenjs_absvector_set((shenjs_globals["shen_shen-*prologvectors*"]), Arg4644_0, R0))},
  2,
  [],
  "shen-resizeprocessvector"];
shenjs_functions["shen_shen-resizeprocessvector"] = shen_resizeprocessvector;






shen_resize_vector = [shen_type_func,
  function shen_user_lambda4647(Arg4646) {
  if (Arg4646.length < 3) return [shen_type_func, shen_user_lambda4647, 3, Arg4646];
  var Arg4646_0 = Arg4646[0], Arg4646_1 = Arg4646[1], Arg4646_2 = Arg4646[2];
  var R0;
  return ((R0 = shenjs_absvector_set(shenjs_absvector((1 + Arg4646_1)), 0, Arg4646_1)),
  (function() {
  return shenjs_call_tail(shen_copy_vector, [Arg4646_0, R0, shenjs_call(shen_limit, [Arg4646_0]), Arg4646_1, Arg4646_2]);}))},
  3,
  [],
  "shen-resize-vector"];
shenjs_functions["shen_shen-resize-vector"] = shen_resize_vector;






shen_copy_vector = [shen_type_func,
  function shen_user_lambda4649(Arg4648) {
  if (Arg4648.length < 5) return [shen_type_func, shen_user_lambda4649, 5, Arg4648];
  var Arg4648_0 = Arg4648[0], Arg4648_1 = Arg4648[1], Arg4648_2 = Arg4648[2], Arg4648_3 = Arg4648[3], Arg4648_4 = Arg4648[4];
  return (function() {
  return shenjs_call_tail(shen_copy_vector_stage_2, [(1 + Arg4648_2), (Arg4648_3 + 1), Arg4648_4, shenjs_call(shen_copy_vector_stage_1, [1, Arg4648_0, Arg4648_1, (1 + Arg4648_2)])]);})},
  5,
  [],
  "shen-copy-vector"];
shenjs_functions["shen_shen-copy-vector"] = shen_copy_vector;






shen_copy_vector_stage_1 = [shen_type_func,
  function shen_user_lambda4651(Arg4650) {
  if (Arg4650.length < 4) return [shen_type_func, shen_user_lambda4651, 4, Arg4650];
  var Arg4650_0 = Arg4650[0], Arg4650_1 = Arg4650[1], Arg4650_2 = Arg4650[2], Arg4650_3 = Arg4650[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4650_3, Arg4650_0)))
  ? Arg4650_2
  : (function() {
  return shenjs_call_tail(shen_copy_vector_stage_1, [(1 + Arg4650_0), Arg4650_1, shenjs_absvector_set(Arg4650_2, Arg4650_0, shenjs_absvector_ref(Arg4650_1, Arg4650_0)), Arg4650_3]);}))},
  4,
  [],
  "shen-copy-vector-stage-1"];
shenjs_functions["shen_shen-copy-vector-stage-1"] = shen_copy_vector_stage_1;






shen_copy_vector_stage_2 = [shen_type_func,
  function shen_user_lambda4653(Arg4652) {
  if (Arg4652.length < 4) return [shen_type_func, shen_user_lambda4653, 4, Arg4652];
  var Arg4652_0 = Arg4652[0], Arg4652_1 = Arg4652[1], Arg4652_2 = Arg4652[2], Arg4652_3 = Arg4652[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4652_1, Arg4652_0)))
  ? Arg4652_3
  : (function() {
  return shenjs_call_tail(shen_copy_vector_stage_2, [(Arg4652_0 + 1), Arg4652_1, Arg4652_2, shenjs_absvector_set(Arg4652_3, Arg4652_0, Arg4652_2)]);}))},
  4,
  [],
  "shen-copy-vector-stage-2"];
shenjs_functions["shen_shen-copy-vector-stage-2"] = shen_copy_vector_stage_2;






shen_mk_pvar = [shen_type_func,
  function shen_user_lambda4655(Arg4654) {
  if (Arg4654.length < 1) return [shen_type_func, shen_user_lambda4655, 1, Arg4654];
  var Arg4654_0 = Arg4654[0];
  return shenjs_absvector_set(shenjs_absvector_set(shenjs_absvector(2), 0, [shen_type_symbol, "shen-pvar"]), 1, Arg4654_0)},
  1,
  [],
  "shen-mk-pvar"];
shenjs_functions["shen_shen-mk-pvar"] = shen_mk_pvar;






shen_pvar$question$ = [shen_type_func,
  function shen_user_lambda4657(Arg4656) {
  if (Arg4656.length < 1) return [shen_type_func, shen_user_lambda4657, 1, Arg4656];
  var Arg4656_0 = Arg4656[0];
  return (shenjs_absvector$question$(Arg4656_0) && shenjs_unwind_tail(shenjs_$eq$(shenjs_absvector_ref(Arg4656_0, 0), [shen_type_symbol, "shen-pvar"])))},
  1,
  [],
  "shen-pvar?"];
shenjs_functions["shen_shen-pvar?"] = shen_pvar$question$;






shen_bindv = [shen_type_func,
  function shen_user_lambda4659(Arg4658) {
  if (Arg4658.length < 3) return [shen_type_func, shen_user_lambda4659, 3, Arg4658];
  var Arg4658_0 = Arg4658[0], Arg4658_1 = Arg4658[1], Arg4658_2 = Arg4658[2];
  var R0;
  return ((R0 = shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg4658_2)),
  shenjs_absvector_set(R0, shenjs_absvector_ref(Arg4658_0, 1), Arg4658_1))},
  3,
  [],
  "shen-bindv"];
shenjs_functions["shen_shen-bindv"] = shen_bindv;






shen_unbindv = [shen_type_func,
  function shen_user_lambda4661(Arg4660) {
  if (Arg4660.length < 2) return [shen_type_func, shen_user_lambda4661, 2, Arg4660];
  var Arg4660_0 = Arg4660[0], Arg4660_1 = Arg4660[1];
  var R0;
  return ((R0 = shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg4660_1)),
  shenjs_absvector_set(R0, shenjs_absvector_ref(Arg4660_0, 1), [shen_type_symbol, "shen--null-"]))},
  2,
  [],
  "shen-unbindv"];
shenjs_functions["shen_shen-unbindv"] = shen_unbindv;






shen_incinfs = [shen_type_func,
  function shen_user_lambda4663(Arg4662) {
  if (Arg4662.length < 0) return [shen_type_func, shen_user_lambda4663, 0, Arg4662];
  return (shenjs_globals["shen_shen-*infs*"] = (1 + (shenjs_globals["shen_shen-*infs*"])))},
  0,
  [],
  "shen-incinfs"];
shenjs_functions["shen_shen-incinfs"] = shen_incinfs;






shen_call$_the$_continuation = [shen_type_func,
  function shen_user_lambda4665(Arg4664) {
  if (Arg4664.length < 3) return [shen_type_func, shen_user_lambda4665, 3, Arg4664];
  var Arg4664_0 = Arg4664[0], Arg4664_1 = Arg4664[1], Arg4664_2 = Arg4664[2];
  var R0;
  return (((shenjs_is_type(Arg4664_0, shen_type_cons) && (shenjs_is_type(Arg4664_0[1], shen_type_cons) && shenjs_empty$question$(Arg4664_0[2]))))
  ? [shen_type_cons, Arg4664_0[1][1], shenjs_call(shen_append, [Arg4664_0[1][2], [shen_type_cons, Arg4664_1, [shen_type_cons, Arg4664_2, []]]])]
  : (((shenjs_is_type(Arg4664_0, shen_type_cons) && shenjs_is_type(Arg4664_0[1], shen_type_cons)))
  ? ((R0 = shenjs_call(shen_newcontinuation, [Arg4664_0[2], Arg4664_1, Arg4664_2])),
  [shen_type_cons, Arg4664_0[1][1], shenjs_call(shen_append, [Arg4664_0[1][2], [shen_type_cons, Arg4664_1, [shen_type_cons, R0, []]]])])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-call_the_continuation"]]);})))},
  3,
  [],
  "shen-call_the_continuation"];
shenjs_functions["shen_shen-call_the_continuation"] = shen_call$_the$_continuation;






shen_newcontinuation = [shen_type_func,
  function shen_user_lambda4667(Arg4666) {
  if (Arg4666.length < 3) return [shen_type_func, shen_user_lambda4667, 3, Arg4666];
  var Arg4666_0 = Arg4666[0], Arg4666_1 = Arg4666[1], Arg4666_2 = Arg4666[2];
  return ((shenjs_empty$question$(Arg4666_0))
  ? Arg4666_2
  : (((shenjs_is_type(Arg4666_0, shen_type_cons) && shenjs_is_type(Arg4666_0[1], shen_type_cons)))
  ? [shen_type_cons, [shen_type_symbol, "freeze"], [shen_type_cons, [shen_type_cons, Arg4666_0[1][1], shenjs_call(shen_append, [Arg4666_0[1][2], [shen_type_cons, Arg4666_1, [shen_type_cons, shenjs_call(shen_newcontinuation, [Arg4666_0[2], Arg4666_1, Arg4666_2]), []]]])], []]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-newcontinuation"]]);})))},
  3,
  [],
  "shen-newcontinuation"];
shenjs_functions["shen_shen-newcontinuation"] = shen_newcontinuation;






shen_return = [shen_type_func,
  function shen_user_lambda4669(Arg4668) {
  if (Arg4668.length < 3) return [shen_type_func, shen_user_lambda4669, 3, Arg4668];
  var Arg4668_0 = Arg4668[0], Arg4668_1 = Arg4668[1], Arg4668_2 = Arg4668[2];
  return (function() {
  return shenjs_call_tail(shen_deref, [Arg4668_0, Arg4668_1]);})},
  3,
  [],
  "return"];
shenjs_functions["shen_return"] = shen_return;






shen_measure$amp$return = [shen_type_func,
  function shen_user_lambda4671(Arg4670) {
  if (Arg4670.length < 3) return [shen_type_func, shen_user_lambda4671, 3, Arg4670];
  var Arg4670_0 = Arg4670[0], Arg4670_1 = Arg4670[1], Arg4670_2 = Arg4670[2];
  return (shenjs_call(shen_intoutput, ["~A inferences~%", [shen_tuple, (shenjs_globals["shen_shen-*infs*"]), []]]),
  (function() {
  return shenjs_call_tail(shen_deref, [Arg4670_0, Arg4670_1]);}))},
  3,
  [],
  "shen-measure&return"];
shenjs_functions["shen_shen-measure&return"] = shen_measure$amp$return;






shen_unify = [shen_type_func,
  function shen_user_lambda4673(Arg4672) {
  if (Arg4672.length < 4) return [shen_type_func, shen_user_lambda4673, 4, Arg4672];
  var Arg4672_0 = Arg4672[0], Arg4672_1 = Arg4672[1], Arg4672_2 = Arg4672[2], Arg4672_3 = Arg4672[3];
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$, [shenjs_call(shen_lazyderef, [Arg4672_0, Arg4672_2]), shenjs_call(shen_lazyderef, [Arg4672_1, Arg4672_2]), Arg4672_2, Arg4672_3]);})},
  4,
  [],
  "unify"];
shenjs_functions["shen_unify"] = shen_unify;






shen_lzy$eq$ = [shen_type_func,
  function shen_user_lambda4675(Arg4674) {
  if (Arg4674.length < 4) return [shen_type_func, shen_user_lambda4675, 4, Arg4674];
  var Arg4674_0 = Arg4674[0], Arg4674_1 = Arg4674[1], Arg4674_2 = Arg4674[2], Arg4674_3 = Arg4674[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4674_1, Arg4674_0)))
  ? shenjs_thaw(Arg4674_3)
  : ((shenjs_call(shen_pvar$question$, [Arg4674_0]))
  ? (function() {
  return shenjs_call_tail(shen_bind, [Arg4674_0, Arg4674_1, Arg4674_2, Arg4674_3]);})
  : ((shenjs_call(shen_pvar$question$, [Arg4674_1]))
  ? (function() {
  return shenjs_call_tail(shen_bind, [Arg4674_1, Arg4674_0, Arg4674_2, Arg4674_3]);})
  : (((shenjs_is_type(Arg4674_0, shen_type_cons) && shenjs_is_type(Arg4674_1, shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(shen_lzy$eq$, [shenjs_call(shen_lazyderef, [Arg4674_0[1], Arg4674_2]), shenjs_call(shen_lazyderef, [Arg4674_1[1], Arg4674_2]), Arg4674_2, (new Shenjs_freeze([Arg4674_0, Arg4674_1, Arg4674_2, Arg4674_3], function(Arg4676) {
  var Arg4676_0 = Arg4676[0], Arg4676_1 = Arg4676[1], Arg4676_2 = Arg4676[2], Arg4676_3 = Arg4676[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$, [shenjs_call(shen_lazyderef, [Arg4676_0[2], Arg4676_2]), shenjs_call(shen_lazyderef, [Arg4676_1[2], Arg4676_2]), Arg4676_2, Arg4676_3]);});})}))]);})
  : false))))},
  4,
  [],
  "shen-lzy="];
shenjs_functions["shen_shen-lzy="] = shen_lzy$eq$;






shen_deref = [shen_type_func,
  function shen_user_lambda4679(Arg4678) {
  if (Arg4678.length < 2) return [shen_type_func, shen_user_lambda4679, 2, Arg4678];
  var Arg4678_0 = Arg4678[0], Arg4678_1 = Arg4678[1];
  var R0;
  return ((shenjs_is_type(Arg4678_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_deref, [Arg4678_0[1], Arg4678_1]), shenjs_call(shen_deref, [Arg4678_0[2], Arg4678_1])]
  : ((shenjs_call(shen_pvar$question$, [Arg4678_0]))
  ? ((R0 = shenjs_call(shen_valvector, [Arg4678_0, Arg4678_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, [shen_type_symbol, "shen--null-"])))
  ? Arg4678_0
  : (function() {
  return shenjs_call_tail(shen_deref, [R0, Arg4678_1]);})))
  : Arg4678_0))},
  2,
  [],
  "shen-deref"];
shenjs_functions["shen_shen-deref"] = shen_deref;






shen_lazyderef = [shen_type_func,
  function shen_user_lambda4681(Arg4680) {
  if (Arg4680.length < 2) return [shen_type_func, shen_user_lambda4681, 2, Arg4680];
  var Arg4680_0 = Arg4680[0], Arg4680_1 = Arg4680[1];
  var R0;
  return ((shenjs_call(shen_pvar$question$, [Arg4680_0]))
  ? ((R0 = shenjs_call(shen_valvector, [Arg4680_0, Arg4680_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, [shen_type_symbol, "shen--null-"])))
  ? Arg4680_0
  : (function() {
  return shenjs_call_tail(shen_lazyderef, [R0, Arg4680_1]);})))
  : Arg4680_0)},
  2,
  [],
  "shen-lazyderef"];
shenjs_functions["shen_shen-lazyderef"] = shen_lazyderef;






shen_valvector = [shen_type_func,
  function shen_user_lambda4683(Arg4682) {
  if (Arg4682.length < 2) return [shen_type_func, shen_user_lambda4683, 2, Arg4682];
  var Arg4682_0 = Arg4682[0], Arg4682_1 = Arg4682[1];
  return shenjs_absvector_ref(shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg4682_1), shenjs_absvector_ref(Arg4682_0, 1))},
  2,
  [],
  "shen-valvector"];
shenjs_functions["shen_shen-valvector"] = shen_valvector;






shen_unify$excl$ = [shen_type_func,
  function shen_user_lambda4685(Arg4684) {
  if (Arg4684.length < 4) return [shen_type_func, shen_user_lambda4685, 4, Arg4684];
  var Arg4684_0 = Arg4684[0], Arg4684_1 = Arg4684[1], Arg4684_2 = Arg4684[2], Arg4684_3 = Arg4684[3];
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$$excl$, [shenjs_call(shen_lazyderef, [Arg4684_0, Arg4684_2]), shenjs_call(shen_lazyderef, [Arg4684_1, Arg4684_2]), Arg4684_2, Arg4684_3]);})},
  4,
  [],
  "unify!"];
shenjs_functions["shen_unify!"] = shen_unify$excl$;






shen_lzy$eq$$excl$ = [shen_type_func,
  function shen_user_lambda4687(Arg4686) {
  if (Arg4686.length < 4) return [shen_type_func, shen_user_lambda4687, 4, Arg4686];
  var Arg4686_0 = Arg4686[0], Arg4686_1 = Arg4686[1], Arg4686_2 = Arg4686[2], Arg4686_3 = Arg4686[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4686_1, Arg4686_0)))
  ? shenjs_thaw(Arg4686_3)
  : (((shenjs_call(shen_pvar$question$, [Arg4686_0]) && (!shenjs_call(shen_occurs$question$, [Arg4686_0, shenjs_call(shen_deref, [Arg4686_1, Arg4686_2])]))))
  ? (function() {
  return shenjs_call_tail(shen_bind, [Arg4686_0, Arg4686_1, Arg4686_2, Arg4686_3]);})
  : (((shenjs_call(shen_pvar$question$, [Arg4686_1]) && (!shenjs_call(shen_occurs$question$, [Arg4686_1, shenjs_call(shen_deref, [Arg4686_0, Arg4686_2])]))))
  ? (function() {
  return shenjs_call_tail(shen_bind, [Arg4686_1, Arg4686_0, Arg4686_2, Arg4686_3]);})
  : (((shenjs_is_type(Arg4686_0, shen_type_cons) && shenjs_is_type(Arg4686_1, shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(shen_lzy$eq$$excl$, [shenjs_call(shen_lazyderef, [Arg4686_0[1], Arg4686_2]), shenjs_call(shen_lazyderef, [Arg4686_1[1], Arg4686_2]), Arg4686_2, (new Shenjs_freeze([Arg4686_0, Arg4686_1, Arg4686_2, Arg4686_3], function(Arg4688) {
  var Arg4688_0 = Arg4688[0], Arg4688_1 = Arg4688[1], Arg4688_2 = Arg4688[2], Arg4688_3 = Arg4688[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$$excl$, [shenjs_call(shen_lazyderef, [Arg4688_0[2], Arg4688_2]), shenjs_call(shen_lazyderef, [Arg4688_1[2], Arg4688_2]), Arg4688_2, Arg4688_3]);});})}))]);})
  : false))))},
  4,
  [],
  "shen-lzy=!"];
shenjs_functions["shen_shen-lzy=!"] = shen_lzy$eq$$excl$;






shen_occurs$question$ = [shen_type_func,
  function shen_user_lambda4691(Arg4690) {
  if (Arg4690.length < 2) return [shen_type_func, shen_user_lambda4691, 2, Arg4690];
  var Arg4690_0 = Arg4690[0], Arg4690_1 = Arg4690[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4690_1, Arg4690_0)))
  ? true
  : ((shenjs_is_type(Arg4690_1, shen_type_cons))
  ? (shenjs_call(shen_occurs$question$, [Arg4690_0, Arg4690_1[1]]) || shenjs_call(shen_occurs$question$, [Arg4690_0, Arg4690_1[2]]))
  : false))},
  2,
  [],
  "shen-occurs?"];
shenjs_functions["shen_shen-occurs?"] = shen_occurs$question$;






shen_identical = [shen_type_func,
  function shen_user_lambda4693(Arg4692) {
  if (Arg4692.length < 4) return [shen_type_func, shen_user_lambda4693, 4, Arg4692];
  var Arg4692_0 = Arg4692[0], Arg4692_1 = Arg4692[1], Arg4692_2 = Arg4692[2], Arg4692_3 = Arg4692[3];
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$$eq$, [shenjs_call(shen_lazyderef, [Arg4692_0, Arg4692_2]), shenjs_call(shen_lazyderef, [Arg4692_1, Arg4692_2]), Arg4692_2, Arg4692_3]);})},
  4,
  [],
  "identical"];
shenjs_functions["shen_identical"] = shen_identical;






shen_lzy$eq$$eq$ = [shen_type_func,
  function shen_user_lambda4695(Arg4694) {
  if (Arg4694.length < 4) return [shen_type_func, shen_user_lambda4695, 4, Arg4694];
  var Arg4694_0 = Arg4694[0], Arg4694_1 = Arg4694[1], Arg4694_2 = Arg4694[2], Arg4694_3 = Arg4694[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4694_1, Arg4694_0)))
  ? shenjs_thaw(Arg4694_3)
  : (((shenjs_is_type(Arg4694_0, shen_type_cons) && shenjs_is_type(Arg4694_1, shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(shen_lzy$eq$$eq$, [shenjs_call(shen_lazyderef, [Arg4694_0[1], Arg4694_2]), shenjs_call(shen_lazyderef, [Arg4694_1[1], Arg4694_2]), Arg4694_2, (new Shenjs_freeze([Arg4694_0, Arg4694_1, Arg4694_2, Arg4694_3], function(Arg4696) {
  var Arg4696_0 = Arg4696[0], Arg4696_1 = Arg4696[1], Arg4696_2 = Arg4696[2], Arg4696_3 = Arg4696[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$$eq$, [Arg4696_0[2], Arg4696_1[2], Arg4696_2, Arg4696_3]);});})}))]);})
  : false))},
  4,
  [],
  "shen-lzy=="];
shenjs_functions["shen_shen-lzy=="] = shen_lzy$eq$$eq$;






shen_pvar = [shen_type_func,
  function shen_user_lambda4699(Arg4698) {
  if (Arg4698.length < 1) return [shen_type_func, shen_user_lambda4699, 1, Arg4698];
  var Arg4698_0 = Arg4698[0];
  return (function() {
  return shenjs_call_tail(shen_intmake_string, ["Var~A", [shen_tuple, shenjs_absvector_ref(Arg4698_0, 1), []]]);})},
  1,
  [],
  "shen-pvar"];
shenjs_functions["shen_shen-pvar"] = shen_pvar;






shen_bind = [shen_type_func,
  function shen_user_lambda4701(Arg4700) {
  if (Arg4700.length < 4) return [shen_type_func, shen_user_lambda4701, 4, Arg4700];
  var Arg4700_0 = Arg4700[0], Arg4700_1 = Arg4700[1], Arg4700_2 = Arg4700[2], Arg4700_3 = Arg4700[3];
  var R0;
  return (shenjs_call(shen_bindv, [Arg4700_0, Arg4700_1, Arg4700_2]),
  (R0 = shenjs_unwind_tail(shenjs_thaw(Arg4700_3))),
  shenjs_call(shen_unbindv, [Arg4700_0, Arg4700_2]),
  R0)},
  4,
  [],
  "bind"];
shenjs_functions["shen_bind"] = shen_bind;






shen_fwhen = [shen_type_func,
  function shen_user_lambda4703(Arg4702) {
  if (Arg4702.length < 3) return [shen_type_func, shen_user_lambda4703, 3, Arg4702];
  var Arg4702_0 = Arg4702[0], Arg4702_1 = Arg4702[1], Arg4702_2 = Arg4702[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg4702_0)))
  ? shenjs_thaw(Arg4702_2)
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg4702_0)))
  ? false
  : (function() {
  return shenjs_call_tail(shen_interror, ["fwhen expects a boolean: not ~S%", [shen_tuple, Arg4702_0, []]]);})))},
  3,
  [],
  "fwhen"];
shenjs_functions["shen_fwhen"] = shen_fwhen;






shen_call = [shen_type_func,
  function shen_user_lambda4705(Arg4704) {
  if (Arg4704.length < 3) return [shen_type_func, shen_user_lambda4705, 3, Arg4704];
  var Arg4704_0 = Arg4704[0], Arg4704_1 = Arg4704[1], Arg4704_2 = Arg4704[2];
  return ((shenjs_is_type(Arg4704_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_call_help, [shenjs_call(shen_m$_prolog$_to$_s_prolog$_predicate, [shenjs_call(shen_lazyderef, [Arg4704_0[1], Arg4704_1])]), Arg4704_0[2], Arg4704_1, Arg4704_2]);})
  : false)},
  3,
  [],
  "call"];
shenjs_functions["shen_call"] = shen_call;






shen_call_help = [shen_type_func,
  function shen_user_lambda4707(Arg4706) {
  if (Arg4706.length < 4) return [shen_type_func, shen_user_lambda4707, 4, Arg4706];
  var Arg4706_0 = Arg4706[0], Arg4706_1 = Arg4706[1], Arg4706_2 = Arg4706[2], Arg4706_3 = Arg4706[3];
  return ((shenjs_empty$question$(Arg4706_1))
  ? (function() {
  return shenjs_call_tail(Arg4706_0, [Arg4706_2, Arg4706_3]);})
  : ((shenjs_is_type(Arg4706_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_call_help, [shenjs_call(Arg4706_0, [Arg4706_1[1]]), Arg4706_1[2], Arg4706_2, Arg4706_3]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-call-help"]]);})))},
  4,
  [],
  "shen-call-help"];
shenjs_functions["shen_shen-call-help"] = shen_call_help;






shen_intprolog = [shen_type_func,
  function shen_user_lambda4709(Arg4708) {
  if (Arg4708.length < 1) return [shen_type_func, shen_user_lambda4709, 1, Arg4708];
  var Arg4708_0 = Arg4708[0];
  var R0;
  return (((shenjs_is_type(Arg4708_0, shen_type_cons) && shenjs_is_type(Arg4708_0[1], shen_type_cons)))
  ? ((R0 = shenjs_call(shen_start_new_prolog_process, [])),
  (function() {
  return shenjs_call_tail(shen_intprolog_help, [Arg4708_0[1][1], shenjs_call(shen_insert_prolog_variables, [[shen_type_cons, Arg4708_0[1][2], [shen_type_cons, Arg4708_0[2], []]], R0]), R0]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-intprolog"]]);}))},
  1,
  [],
  "shen-intprolog"];
shenjs_functions["shen_shen-intprolog"] = shen_intprolog;






shen_intprolog_help = [shen_type_func,
  function shen_user_lambda4711(Arg4710) {
  if (Arg4710.length < 3) return [shen_type_func, shen_user_lambda4711, 3, Arg4710];
  var Arg4710_0 = Arg4710[0], Arg4710_1 = Arg4710[1], Arg4710_2 = Arg4710[2];
  return (((shenjs_is_type(Arg4710_1, shen_type_cons) && (shenjs_is_type(Arg4710_1[2], shen_type_cons) && shenjs_empty$question$(Arg4710_1[2][2]))))
  ? (function() {
  return shenjs_call_tail(shen_intprolog_help_help, [Arg4710_0, Arg4710_1[1], Arg4710_1[2][1], Arg4710_2]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-intprolog-help"]]);}))},
  3,
  [],
  "shen-intprolog-help"];
shenjs_functions["shen_shen-intprolog-help"] = shen_intprolog_help;






shen_intprolog_help_help = [shen_type_func,
  function shen_user_lambda4713(Arg4712) {
  if (Arg4712.length < 4) return [shen_type_func, shen_user_lambda4713, 4, Arg4712];
  var Arg4712_0 = Arg4712[0], Arg4712_1 = Arg4712[1], Arg4712_2 = Arg4712[2], Arg4712_3 = Arg4712[3];
  return ((shenjs_empty$question$(Arg4712_1))
  ? (function() {
  return shenjs_call_tail(Arg4712_0, [Arg4712_3, (new Shenjs_freeze([Arg4712_0, Arg4712_1, Arg4712_2, Arg4712_3], function(Arg4714) {
  var Arg4714_0 = Arg4714[0], Arg4714_1 = Arg4714[1], Arg4714_2 = Arg4714[2], Arg4714_3 = Arg4714[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_call_rest, [Arg4714_2, Arg4714_3]);});})}))]);})
  : ((shenjs_is_type(Arg4712_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_intprolog_help_help, [shenjs_call(Arg4712_0, [Arg4712_1[1]]), Arg4712_1[2], Arg4712_2, Arg4712_3]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-intprolog-help-help"]]);})))},
  4,
  [],
  "shen-intprolog-help-help"];
shenjs_functions["shen_shen-intprolog-help-help"] = shen_intprolog_help_help;






shen_call_rest = [shen_type_func,
  function shen_user_lambda4717(Arg4716) {
  if (Arg4716.length < 2) return [shen_type_func, shen_user_lambda4717, 2, Arg4716];
  var Arg4716_0 = Arg4716[0], Arg4716_1 = Arg4716[1];
  return ((shenjs_empty$question$(Arg4716_0))
  ? true
  : (((shenjs_is_type(Arg4716_0, shen_type_cons) && (shenjs_is_type(Arg4716_0[1], shen_type_cons) && shenjs_is_type(Arg4716_0[1][2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_call_rest, [[shen_type_cons, [shen_type_cons, shenjs_call(Arg4716_0[1][1], [Arg4716_0[1][2][1]]), Arg4716_0[1][2][2]], Arg4716_0[2]], Arg4716_1]);})
  : (((shenjs_is_type(Arg4716_0, shen_type_cons) && (shenjs_is_type(Arg4716_0[1], shen_type_cons) && shenjs_empty$question$(Arg4716_0[1][2]))))
  ? (function() {
  return shenjs_call_tail(Arg4716_0[1][1], [Arg4716_1, (new Shenjs_freeze([Arg4716_0, Arg4716_1], function(Arg4718) {
  var Arg4718_0 = Arg4718[0], Arg4718_1 = Arg4718[1];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_call_rest, [Arg4718_0[2], Arg4718_1]);});})}))]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-call-rest"]]);}))))},
  2,
  [],
  "shen-call-rest"];
shenjs_functions["shen_shen-call-rest"] = shen_call_rest;






shen_start_new_prolog_process = [shen_type_func,
  function shen_user_lambda4721(Arg4720) {
  if (Arg4720.length < 0) return [shen_type_func, shen_user_lambda4721, 0, Arg4720];
  var R0;
  return ((R0 = (shenjs_globals["shen_shen-*process-counter*"] = (1 + (shenjs_globals["shen_shen-*process-counter*"])))),
  (function() {
  return shenjs_call_tail(shen_initialise_prolog, [R0]);}))},
  0,
  [],
  "shen-start-new-prolog-process"];
shenjs_functions["shen_shen-start-new-prolog-process"] = shen_start_new_prolog_process;






shen_insert_prolog_variables = [shen_type_func,
  function shen_user_lambda4723(Arg4722) {
  if (Arg4722.length < 2) return [shen_type_func, shen_user_lambda4723, 2, Arg4722];
  var Arg4722_0 = Arg4722[0], Arg4722_1 = Arg4722[1];
  return (function() {
  return shenjs_call_tail(shen_insert_prolog_variables_help, [Arg4722_0, shenjs_call(shen_flatten, [Arg4722_0]), Arg4722_1]);})},
  2,
  [],
  "shen-insert-prolog-variables"];
shenjs_functions["shen_shen-insert-prolog-variables"] = shen_insert_prolog_variables;






shen_insert_prolog_variables_help = [shen_type_func,
  function shen_user_lambda4725(Arg4724) {
  if (Arg4724.length < 3) return [shen_type_func, shen_user_lambda4725, 3, Arg4724];
  var Arg4724_0 = Arg4724[0], Arg4724_1 = Arg4724[1], Arg4724_2 = Arg4724[2];
  var R0, R1;
  return ((shenjs_empty$question$(Arg4724_1))
  ? Arg4724_0
  : (((shenjs_is_type(Arg4724_1, shen_type_cons) && shenjs_call(shen_variable$question$, [Arg4724_1[1]])))
  ? ((R0 = shenjs_call(shen_newpv, [Arg4724_2])),
  (R0 = shenjs_call(shen_subst, [R0, Arg4724_1[1], Arg4724_0])),
  (R1 = shenjs_call(shen_remove, [Arg4724_1[1], Arg4724_1[2]])),
  (function() {
  return shenjs_call_tail(shen_insert_prolog_variables_help, [R0, R1, Arg4724_2]);}))
  : ((shenjs_is_type(Arg4724_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_insert_prolog_variables_help, [Arg4724_0, Arg4724_1[2], Arg4724_2]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-insert-prolog-variables-help"]]);}))))},
  3,
  [],
  "shen-insert-prolog-variables-help"];
shenjs_functions["shen_shen-insert-prolog-variables-help"] = shen_insert_prolog_variables_help;






shen_initialise_prolog = [shen_type_func,
  function shen_user_lambda4727(Arg4726) {
  if (Arg4726.length < 1) return [shen_type_func, shen_user_lambda4727, 1, Arg4726];
  var Arg4726_0 = Arg4726[0];
  return (shenjs_absvector_set((shenjs_globals["shen_shen-*prologvectors*"]), Arg4726_0, shenjs_call(shen_fillvector, [shenjs_vector(10), 1, 10, [shen_type_symbol, "shen--null-"]])),
  shenjs_absvector_set((shenjs_globals["shen_shen-*varcounter*"]), Arg4726_0, 1),
  Arg4726_0)},
  1,
  [],
  "shen-initialise-prolog"];
shenjs_functions["shen_shen-initialise-prolog"] = shen_initialise_prolog;












shen_f$_error = [shen_type_func,
  function shen_user_lambda5359(Arg5358) {
  if (Arg5358.length < 1) return [shen_type_func, shen_user_lambda5359, 1, Arg5358];
  var Arg5358_0 = Arg5358[0];
  return (shenjs_call(shen_intoutput, ["partial function ~A;~%", [shen_tuple, Arg5358_0, []]]),
  ((((!shenjs_call(shen_tracked$question$, [Arg5358_0])) && shenjs_call(shen_y_or_n$question$, [shenjs_call(shen_intmake_string, ["track ~A? ", [shen_tuple, Arg5358_0, []]])])))
  ? shenjs_call(shen_track_function, [shenjs_call(shen_ps, [Arg5358_0])])
  : [shen_type_symbol, "shen-ok"]),
  (function() {
  return shenjs_simple_error("aborted");}))},
  1,
  [],
  "shen-f_error"];
shenjs_functions["shen_shen-f_error"] = shen_f$_error;






shen_tracked$question$ = [shen_type_func,
  function shen_user_lambda5361(Arg5360) {
  if (Arg5360.length < 1) return [shen_type_func, shen_user_lambda5361, 1, Arg5360];
  var Arg5360_0 = Arg5360[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5360_0, (shenjs_globals["shen_shen-*tracking*"])]);})},
  1,
  [],
  "shen-tracked?"];
shenjs_functions["shen_shen-tracked?"] = shen_tracked$question$;






shen_track = [shen_type_func,
  function shen_user_lambda5363(Arg5362) {
  if (Arg5362.length < 1) return [shen_type_func, shen_user_lambda5363, 1, Arg5362];
  var Arg5362_0 = Arg5362[0];
  var R0;
  return ((R0 = shenjs_call(shen_ps, [Arg5362_0])),
  (function() {
  return shenjs_call_tail(shen_track_function, [R0]);}))},
  1,
  [],
  "track"];
shenjs_functions["shen_track"] = shen_track;






shen_track_function = [shen_type_func,
  function shen_user_lambda5365(Arg5364) {
  if (Arg5364.length < 1) return [shen_type_func, shen_user_lambda5365, 1, Arg5364];
  var Arg5364_0 = Arg5364[0];
  var R0;
  return (((shenjs_is_type(Arg5364_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defun"], Arg5364_0[1])) && (shenjs_is_type(Arg5364_0[2], shen_type_cons) && (shenjs_is_type(Arg5364_0[2][2], shen_type_cons) && (shenjs_is_type(Arg5364_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg5364_0[2][2][2][2])))))))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "defun"], [shen_type_cons, Arg5364_0[2][1], [shen_type_cons, Arg5364_0[2][2][1], [shen_type_cons, shenjs_call(shen_insert_tracking_code, [Arg5364_0[2][1], Arg5364_0[2][2][1], Arg5364_0[2][2][2][1]]), []]]]]),
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
  function shen_user_lambda5367(Arg5366) {
  if (Arg5366.length < 3) return [shen_type_func, shen_user_lambda5367, 3, Arg5366];
  var Arg5366_0 = Arg5366[0], Arg5366_1 = Arg5366[1], Arg5366_2 = Arg5366[2];
  return [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], []]], [shen_type_cons, 1, []]]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-input-track"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], []]], [shen_type_cons, Arg5366_0, [shen_type_cons, shenjs_call(shen_cons$_form, [Arg5366_1]), []]]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-terpri-or-read-char"], []], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg5366_2, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-output-track"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], []]], [shen_type_cons, Arg5366_0, [shen_type_cons, [shen_type_symbol, "Result"], []]]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], []]], [shen_type_cons, 1, []]]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-terpri-or-read-char"], []], [shen_type_cons, [shen_type_symbol, "Result"], []]]], []]]], []]]], []]]]], []]]], []]]], []]]]},
  3,
  [],
  "shen-insert-tracking-code"];
shenjs_functions["shen_shen-insert-tracking-code"] = shen_insert_tracking_code;






(shenjs_globals["shen_shen-*step*"] = false);






shen_step = [shen_type_func,
  function shen_user_lambda5370(Arg5369) {
  if (Arg5369.length < 1) return [shen_type_func, shen_user_lambda5370, 1, Arg5369];
  var Arg5369_0 = Arg5369[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg5369_0)))
  ? (shenjs_globals["shen_shen-*step*"] = true)
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg5369_0)))
  ? (shenjs_globals["shen_shen-*step*"] = false)
  : (function() {
  return shenjs_call_tail(shen_interror, ["step expects a + or a -.~%", []]);})))},
  1,
  [],
  "step"];
shenjs_functions["shen_step"] = shen_step;






shen_spy = [shen_type_func,
  function shen_user_lambda5372(Arg5371) {
  if (Arg5371.length < 1) return [shen_type_func, shen_user_lambda5372, 1, Arg5371];
  var Arg5371_0 = Arg5371[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg5371_0)))
  ? (shenjs_globals["shen_shen-*spy*"] = true)
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg5371_0)))
  ? (shenjs_globals["shen_shen-*spy*"] = false)
  : (function() {
  return shenjs_call_tail(shen_interror, ["spy expects a + or a -.~%", []]);})))},
  1,
  [],
  "spy"];
shenjs_functions["shen_spy"] = shen_spy;






shen_terpri_or_read_char = [shen_type_func,
  function shen_user_lambda5374(Arg5373) {
  if (Arg5373.length < 0) return [shen_type_func, shen_user_lambda5374, 0, Arg5373];
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
  function shen_user_lambda5376(Arg5375) {
  if (Arg5375.length < 1) return [shen_type_func, shen_user_lambda5376, 1, Arg5375];
  var Arg5375_0 = Arg5375[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5375_0, shenjs_call(shen_hat, []))))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["aborted", []]);})
  : true)},
  1,
  [],
  "shen-check-byte"];
shenjs_functions["shen_shen-check-byte"] = shen_check_byte;






shen_input_track = [shen_type_func,
  function shen_user_lambda5378(Arg5377) {
  if (Arg5377.length < 3) return [shen_type_func, shen_user_lambda5378, 3, Arg5377];
  var Arg5377_0 = Arg5377[0], Arg5377_1 = Arg5377[1], Arg5377_2 = Arg5377[2];
  return (shenjs_call(shen_intoutput, ["~%~A<~A> Inputs to ~A ~%~A", [shen_tuple, shenjs_call(shen_spaces, [Arg5377_0]), [shen_tuple, Arg5377_0, [shen_tuple, Arg5377_1, [shen_tuple, shenjs_call(shen_spaces, [Arg5377_0]), [shen_tuple, Arg5377_2, []]]]]]]),
  (function() {
  return shenjs_call_tail(shen_recursively_print, [Arg5377_2]);}))},
  3,
  [],
  "shen-input-track"];
shenjs_functions["shen_shen-input-track"] = shen_input_track;






shen_recursively_print = [shen_type_func,
  function shen_user_lambda5380(Arg5379) {
  if (Arg5379.length < 1) return [shen_type_func, shen_user_lambda5380, 1, Arg5379];
  var Arg5379_0 = Arg5379[0];
  return ((shenjs_empty$question$(Arg5379_0))
  ? (function() {
  return shenjs_call_tail(shen_intoutput, [" ==>", []]);})
  : ((shenjs_is_type(Arg5379_0, shen_type_cons))
  ? (shenjs_call(shen_print, [Arg5379_0[1]]),
  shenjs_call(shen_intoutput, [", ", []]),
  (function() {
  return shenjs_call_tail(shen_recursively_print, [Arg5379_0[2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-recursively-print"]]);})))},
  1,
  [],
  "shen-recursively-print"];
shenjs_functions["shen_shen-recursively-print"] = shen_recursively_print;






shen_spaces = [shen_type_func,
  function shen_user_lambda5382(Arg5381) {
  if (Arg5381.length < 1) return [shen_type_func, shen_user_lambda5382, 1, Arg5381];
  var Arg5381_0 = Arg5381[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg5381_0)))
  ? ""
  : (" " + shenjs_call(shen_spaces, [(Arg5381_0 - 1)])))},
  1,
  [],
  "shen-spaces"];
shenjs_functions["shen_shen-spaces"] = shen_spaces;






shen_output_track = [shen_type_func,
  function shen_user_lambda5384(Arg5383) {
  if (Arg5383.length < 3) return [shen_type_func, shen_user_lambda5384, 3, Arg5383];
  var Arg5383_0 = Arg5383[0], Arg5383_1 = Arg5383[1], Arg5383_2 = Arg5383[2];
  return (function() {
  return shenjs_call_tail(shen_intoutput, ["~%~A<~A> Output from ~A ~%~A==> ~S", [shen_tuple, shenjs_call(shen_spaces, [Arg5383_0]), [shen_tuple, Arg5383_0, [shen_tuple, Arg5383_1, [shen_tuple, shenjs_call(shen_spaces, [Arg5383_0]), [shen_tuple, Arg5383_2, []]]]]]]);})},
  3,
  [],
  "shen-output-track"];
shenjs_functions["shen_shen-output-track"] = shen_output_track;






shen_untrack = [shen_type_func,
  function shen_user_lambda5386(Arg5385) {
  if (Arg5385.length < 1) return [shen_type_func, shen_user_lambda5386, 1, Arg5385];
  var Arg5385_0 = Arg5385[0];
  return (function() {
  return shenjs_call_tail(shen_eval, [shenjs_call(shen_ps, [Arg5385_0])]);})},
  1,
  [],
  "untrack"];
shenjs_functions["shen_untrack"] = shen_untrack;






shen_profile = [shen_type_func,
  function shen_user_lambda5388(Arg5387) {
  if (Arg5387.length < 1) return [shen_type_func, shen_user_lambda5388, 1, Arg5387];
  var Arg5387_0 = Arg5387[0];
  return (function() {
  return shenjs_call_tail(shen_profile_help, [shenjs_call(shen_ps, [Arg5387_0])]);})},
  1,
  [],
  "profile"];
shenjs_functions["shen_profile"] = shen_profile;






shen_profile_help = [shen_type_func,
  function shen_user_lambda5390(Arg5389) {
  if (Arg5389.length < 1) return [shen_type_func, shen_user_lambda5390, 1, Arg5389];
  var Arg5389_0 = Arg5389[0];
  var R0, R1;
  return (((shenjs_is_type(Arg5389_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defun"], Arg5389_0[1])) && (shenjs_is_type(Arg5389_0[2], shen_type_cons) && (shenjs_is_type(Arg5389_0[2][2], shen_type_cons) && (shenjs_is_type(Arg5389_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg5389_0[2][2][2][2])))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "shen-f"]])),
  (R1 = [shen_type_cons, [shen_type_symbol, "defun"], [shen_type_cons, Arg5389_0[2][1], [shen_type_cons, Arg5389_0[2][2][1], [shen_type_cons, shenjs_call(shen_profile_func, [Arg5389_0[2][1], Arg5389_0[2][2][1], [shen_type_cons, R0, Arg5389_0[2][2][1]]]), []]]]]),
  (R0 = [shen_type_cons, [shen_type_symbol, "defun"], [shen_type_cons, R0, [shen_type_cons, Arg5389_0[2][2][1], [shen_type_cons, shenjs_call(shen_subst, [R0, Arg5389_0[2][1], Arg5389_0[2][2][2][1]]), []]]]]),
  shenjs_call(shen_eval_without_macros, [R1]),
  shenjs_call(shen_eval_without_macros, [R0]),
  Arg5389_0[2][1])
  : (function() {
  return shenjs_call_tail(shen_interror, ["Cannot profile.~%", []]);}))},
  1,
  [],
  "shen-profile-help"];
shenjs_functions["shen_shen-profile-help"] = shen_profile_help;






shen_unprofile = [shen_type_func,
  function shen_user_lambda5392(Arg5391) {
  if (Arg5391.length < 1) return [shen_type_func, shen_user_lambda5392, 1, Arg5391];
  var Arg5391_0 = Arg5391[0];
  return (function() {
  return shenjs_call_tail(shen_untrack, [Arg5391_0]);})},
  1,
  [],
  "unprofile"];
shenjs_functions["shen_unprofile"] = shen_unprofile;






shen_profile_func = [shen_type_func,
  function shen_user_lambda5394(Arg5393) {
  if (Arg5393.length < 3) return [shen_type_func, shen_user_lambda5394, 3, Arg5393];
  var Arg5393_0 = Arg5393[0], Arg5393_1 = Arg5393[1], Arg5393_2 = Arg5393[2];
  return [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Start"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "run"], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg5393_2, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Finish"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "run"], []]], [shen_type_cons, [shen_type_symbol, "Start"], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Record"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-put-profile"], [shen_type_cons, Arg5393_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-get-profile"], [shen_type_cons, Arg5393_0, []]], [shen_type_cons, [shen_type_symbol, "Finish"], []]]], []]]], [shen_type_cons, [shen_type_symbol, "Result"], []]]]], []]]]], []]]]], []]]]]},
  3,
  [],
  "shen-profile-func"];
shenjs_functions["shen_shen-profile-func"] = shen_profile_func;






shen_profile_results = [shen_type_func,
  function shen_user_lambda5396(Arg5395) {
  if (Arg5395.length < 1) return [shen_type_func, shen_user_lambda5396, 1, Arg5395];
  var Arg5395_0 = Arg5395[0];
  var R0;
  return ((R0 = shenjs_call(shen_get_profile, [Arg5395_0])),
  shenjs_call(shen_put_profile, [Arg5395_0, 0]),
  [shen_tuple, Arg5395_0, R0])},
  1,
  [],
  "profile-results"];
shenjs_functions["shen_profile-results"] = shen_profile_results;






shen_get_profile = [shen_type_func,
  function shen_user_lambda5398(Arg5397) {
  if (Arg5397.length < 1) return [shen_type_func, shen_user_lambda5398, 1, Arg5397];
  var Arg5397_0 = Arg5397[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg5397_0, [shen_type_symbol, "profile"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda5400(Arg5399) {
  if (Arg5399.length < 1) return [shen_type_func, shen_user_lambda5400, 1, Arg5399];
  var Arg5399_0 = Arg5399[0];
  return 0},
  1,
  []]);})},
  1,
  [],
  "shen-get-profile"];
shenjs_functions["shen_shen-get-profile"] = shen_get_profile;






shen_put_profile = [shen_type_func,
  function shen_user_lambda5402(Arg5401) {
  if (Arg5401.length < 2) return [shen_type_func, shen_user_lambda5402, 2, Arg5401];
  var Arg5401_0 = Arg5401[0], Arg5401_1 = Arg5401[1];
  return (function() {
  return shenjs_call_tail(shen_put, [Arg5401_0, [shen_type_symbol, "profile"], Arg5401_1, (shenjs_globals["shen_shen-*property-vector*"])]);})},
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






(shenjs_globals["shen_shen-*synonyms*"] = []);






(shenjs_globals["shen_shen-*system*"] = []);






(shenjs_globals["shen_shen-*signedfuncs*"] = []);






(shenjs_globals["shen_shen-*hush*"] = "Shen unhushed");






(shenjs_globals["shen_shen-*maxcomplexity*"] = 128);






(shenjs_globals["shen_shen-*occurs*"] = true);






(shenjs_globals["shen_shen-*maxinferences*"] = 1000000);






(shenjs_globals["shen_*maximum-print-sequence-size*"] = 20);






(shenjs_globals["shen_shen-*catch*"] = 0);






shen_initialise$_arity$_table = [shen_type_func,
  function shen_user_lambda4373(Arg4372) {
  if (Arg4372.length < 1) return [shen_type_func, shen_user_lambda4373, 1, Arg4372];
  var Arg4372_0 = Arg4372[0];
  return ((shenjs_empty$question$(Arg4372_0))
  ? []
  : (((shenjs_is_type(Arg4372_0, shen_type_cons) && shenjs_is_type(Arg4372_0[2], shen_type_cons)))
  ? (shenjs_call(shen_put, [Arg4372_0[1], [shen_type_symbol, "arity"], Arg4372_0[2][1], (shenjs_globals["shen_shen-*property-vector*"])]),
  (function() {
  return shenjs_call_tail(shen_initialise$_arity$_table, [Arg4372_0[2][2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-initialise_arity_table"]]);})))},
  1,
  [],
  "shen-initialise_arity_table"];
shenjs_functions["shen_shen-initialise_arity_table"] = shen_initialise$_arity$_table;






shen_arity = [shen_type_func,
  function shen_user_lambda4375(Arg4374) {
  if (Arg4374.length < 1) return [shen_type_func, shen_user_lambda4375, 1, Arg4374];
  var Arg4374_0 = Arg4374[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg4374_0, [shen_type_symbol, "arity"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda4377(Arg4376) {
  if (Arg4376.length < 1) return [shen_type_func, shen_user_lambda4377, 1, Arg4376];
  var Arg4376_0 = Arg4376[0];
  return -1},
  1,
  []]);})},
  1,
  [],
  "arity"];
shenjs_functions["shen_arity"] = shen_arity;






shenjs_call(shen_initialise$_arity$_table, [[shen_type_cons, [shen_type_symbol, "adjoin"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "append"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "arity"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "assoc"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "boolean?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "cd"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "compile"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "concat"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "cn"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "declare"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "destroy"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "difference"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "dump"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "element?"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "empty?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "interror"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "eval"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "eval-kl"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "explode"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "external"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "fail-if"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "fail"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "fix"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "findall"], [shen_type_cons, 5, [shen_type_cons, [shen_type_symbol, "freeze"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "gensym"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "get"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "address->"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "<-address"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, ">"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, ">="], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "hdv"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "hdstr"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "head"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "integer?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "identical"], [shen_type_cons, 4, [shen_type_cons, [shen_type_symbol, "inferences"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "intoutput"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "make-string"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "intersection"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "length"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "lineread"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "load"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "<"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "<="], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "macroexpand"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "map"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "mapcan"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "intmake-string"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "maxinferences"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "nth"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "n->string"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "number?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "output"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "occurs-check"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "occurrences"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "occurs-check"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "or"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "pos"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "print"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "profile"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "profile-results"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "ps"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "preclude"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "preclude-all-but"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "protect"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "address->"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "put"], [shen_type_cons, 4, [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "read-file-as-string"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "read-file"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "read-byte"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "remove"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "reverse"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "simple-error"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "specialise"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "spy"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "step"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "stinput"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "shen-stoutput"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "string->n"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "string?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "strong-warning"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "subst"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "symbol?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "tail"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "tc"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "tc?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "track"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "trap-error"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "tuple?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "type"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "return"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "unprofile"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "unify"], [shen_type_cons, 4, [shen_type_cons, [shen_type_symbol, "unify!"], [shen_type_cons, 4, [shen_type_cons, [shen_type_symbol, "union"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "untrack"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "unspecialise"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "variable?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "version"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "warn"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "write-to-file"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "y-or-n?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "/"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "=="], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "shen-<1>"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "<e>"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "@s"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "preclude"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "include"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "preclude-all-but"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "include-all-but"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, 2, []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]);





shen_systemf = [shen_type_func,
  function shen_user_lambda4380(Arg4379) {
  if (Arg4379.length < 1) return [shen_type_func, shen_user_lambda4380, 1, Arg4379];
  var Arg4379_0 = Arg4379[0];
  return (shenjs_globals["shen_shen-*system*"] = shenjs_call(shen_adjoin, [Arg4379_0, (shenjs_globals["shen_shen-*system*"])]))},
  1,
  [],
  "systemf"];
shenjs_functions["shen_systemf"] = shen_systemf;






shen_adjoin = [shen_type_func,
  function shen_user_lambda4382(Arg4381) {
  if (Arg4381.length < 2) return [shen_type_func, shen_user_lambda4382, 2, Arg4381];
  var Arg4381_0 = Arg4381[0], Arg4381_1 = Arg4381[1];
  return ((shenjs_call(shen_element$question$, [Arg4381_0, Arg4381_1]))
  ? Arg4381_1
  : [shen_type_cons, Arg4381_0, Arg4381_1])},
  2,
  [],
  "adjoin"];
shenjs_functions["shen_adjoin"] = shen_adjoin;






shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4385(Arg4384) {
  if (Arg4384.length < 1) return [shen_type_func, shen_user_lambda4385, 1, Arg4384];
  var Arg4384_0 = Arg4384[0];
  return (function() {
  return shenjs_call_tail(shen_systemf, [Arg4384_0]);})},
  1,
  []], [shen_type_cons, [shen_type_symbol, "!"], [shen_type_cons, [shen_type_symbol, "}"], [shen_type_cons, [shen_type_symbol, "{"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "<--"], [shen_type_cons, [shen_type_symbol, "&&"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [shen_type_symbol, ":="], [shen_type_cons, [shen_type_symbol, "_"], [shen_type_cons, [shen_type_symbol, "<!>"], [shen_type_cons, [shen_type_symbol, "-*-"], [shen_type_cons, [shen_type_symbol, "*language*"], [shen_type_cons, [shen_type_symbol, "*implementation*"], [shen_type_cons, [shen_type_symbol, "*stinput*"], [shen_type_cons, [shen_type_symbol, "*home-directory*"], [shen_type_cons, [shen_type_symbol, "*version*"], [shen_type_cons, [shen_type_symbol, "*maximum-print-sequence-size*"], [shen_type_cons, [shen_type_symbol, "*printer*"], [shen_type_cons, [shen_type_symbol, "*macros*"], [shen_type_cons, [shen_type_symbol, "shen-*os*"], [shen_type_cons, [shen_type_symbol, "shen-*release*"], [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "@s"], [shen_type_cons, [shen_type_symbol, "<-"], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_symbol, "<e>"], [shen_type_cons, [shen_type_symbol, "=="], [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, ">="], [shen_type_cons, [shen_type_symbol, ">"], [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, [shen_type_symbol, "=!"], [shen_type_cons, [shen_type_symbol, "$"], [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_symbol, "/"], [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_symbol, "<="], [shen_type_cons, [shen_type_symbol, "<"], [shen_type_cons, [shen_type_symbol, ">>"], [shen_type_cons, shenjs_vector(0), [shen_type_cons, [shen_type_symbol, "y-or-n?"], [shen_type_cons, [shen_type_symbol, "write-to-file"], [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_symbol, "when"], [shen_type_cons, [shen_type_symbol, "warn"], [shen_type_cons, [shen_type_symbol, "version"], [shen_type_cons, [shen_type_symbol, "verified"], [shen_type_cons, [shen_type_symbol, "variable?"], [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, [shen_type_symbol, "vector?"], [shen_type_cons, [shen_type_symbol, "unspecialise"], [shen_type_cons, [shen_type_symbol, "untrack"], [shen_type_cons, [shen_type_symbol, "union"], [shen_type_cons, [shen_type_symbol, "unify"], [shen_type_cons, [shen_type_symbol, "unify!"], [shen_type_cons, [shen_type_symbol, "unprofile"], [shen_type_cons, [shen_type_symbol, "return"], [shen_type_cons, [shen_type_symbol, "type"], [shen_type_cons, [shen_type_symbol, "tuple?"], [shen_type_cons, true, [shen_type_cons, [shen_type_symbol, "trap-error"], [shen_type_cons, [shen_type_symbol, "track"], [shen_type_cons, [shen_type_symbol, "time"], [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, [shen_type_symbol, "tc?"], [shen_type_cons, [shen_type_symbol, "tc"], [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_symbol, "tlstr"], [shen_type_cons, [shen_type_symbol, "tlv"], [shen_type_cons, [shen_type_symbol, "tail"], [shen_type_cons, [shen_type_symbol, "systemf"], [shen_type_cons, [shen_type_symbol, "synonyms"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "symbol?"], [shen_type_cons, [shen_type_symbol, "sum"], [shen_type_cons, [shen_type_symbol, "subst"], [shen_type_cons, [shen_type_symbol, "string?"], [shen_type_cons, [shen_type_symbol, "string->n"], [shen_type_cons, [shen_type_symbol, "stream"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "stinput"], [shen_type_cons, [shen_type_symbol, "shen-stoutput"], [shen_type_cons, [shen_type_symbol, "step"], [shen_type_cons, [shen_type_symbol, "spy"], [shen_type_cons, [shen_type_symbol, "specialise"], [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, [shen_type_symbol, "simple-error"], [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "save"], [shen_type_cons, [shen_type_symbol, "str"], [shen_type_cons, [shen_type_symbol, "run"], [shen_type_cons, [shen_type_symbol, "reverse"], [shen_type_cons, [shen_type_symbol, "remove"], [shen_type_cons, [shen_type_symbol, "read"], [shen_type_cons, [shen_type_symbol, "read-file"], [shen_type_cons, [shen_type_symbol, "read-file-as-bytelist"], [shen_type_cons, [shen_type_symbol, "read-file-as-string"], [shen_type_cons, [shen_type_symbol, "read-byte"], [shen_type_cons, [shen_type_symbol, "quit"], [shen_type_cons, [shen_type_symbol, "put"], [shen_type_cons, [shen_type_symbol, "preclude"], [shen_type_cons, [shen_type_symbol, "preclude-all-but"], [shen_type_cons, [shen_type_symbol, "ps"], [shen_type_cons, [shen_type_symbol, "prolog?"], [shen_type_cons, [shen_type_symbol, "protect"], [shen_type_cons, [shen_type_symbol, "profile-results"], [shen_type_cons, [shen_type_symbol, "profile"], [shen_type_cons, [shen_type_symbol, "print"], [shen_type_cons, [shen_type_symbol, "pr"], [shen_type_cons, [shen_type_symbol, "pos"], [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, [shen_type_symbol, "output"], [shen_type_cons, [shen_type_symbol, "out"], [shen_type_cons, [shen_type_symbol, "or"], [shen_type_cons, [shen_type_symbol, "open"], [shen_type_cons, [shen_type_symbol, "occurrences"], [shen_type_cons, [shen_type_symbol, "occurs-check"], [shen_type_cons, [shen_type_symbol, "n->string"], [shen_type_cons, [shen_type_symbol, "number?"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "null"], [shen_type_cons, [shen_type_symbol, "nth"], [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_symbol, "nl"], [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, [shen_type_symbol, "macro"], [shen_type_cons, [shen_type_symbol, "macroexpand"], [shen_type_cons, [shen_type_symbol, "maxinferences"], [shen_type_cons, [shen_type_symbol, "mapcan"], [shen_type_cons, [shen_type_symbol, "map"], [shen_type_cons, [shen_type_symbol, "make-string"], [shen_type_cons, [shen_type_symbol, "load"], [shen_type_cons, [shen_type_symbol, "loaded"], [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "lineread"], [shen_type_cons, [shen_type_symbol, "limit"], [shen_type_cons, [shen_type_symbol, "length"], [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "lazy"], [shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "intersection"], [shen_type_cons, [shen_type_symbol, "inferences"], [shen_type_cons, [shen_type_symbol, "intern"], [shen_type_cons, [shen_type_symbol, "integer?"], [shen_type_cons, [shen_type_symbol, "input"], [shen_type_cons, [shen_type_symbol, "input+"], [shen_type_cons, [shen_type_symbol, "include"], [shen_type_cons, [shen_type_symbol, "include-all-but"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_symbol, "identical"], [shen_type_cons, [shen_type_symbol, "head"], [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_symbol, "hdv"], [shen_type_cons, [shen_type_symbol, "hdstr"], [shen_type_cons, [shen_type_symbol, "hash"], [shen_type_cons, [shen_type_symbol, "get"], [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "gensym"], [shen_type_cons, [shen_type_symbol, "function"], [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, [shen_type_symbol, "freeze"], [shen_type_cons, [shen_type_symbol, "format"], [shen_type_cons, [shen_type_symbol, "fix"], [shen_type_cons, [shen_type_symbol, "file"], [shen_type_cons, [shen_type_symbol, "fail"], [shen_type_cons, shen_fail_obj, [shen_type_cons, [shen_type_symbol, "fail-if"], [shen_type_cons, [shen_type_symbol, "fwhen"], [shen_type_cons, [shen_type_symbol, "findall"], [shen_type_cons, false, [shen_type_cons, [shen_type_symbol, "explode"], [shen_type_cons, [shen_type_symbol, "external"], [shen_type_cons, [shen_type_symbol, "exception"], [shen_type_cons, [shen_type_symbol, "eval-kl"], [shen_type_cons, [shen_type_symbol, "eval"], [shen_type_cons, [shen_type_symbol, "error-to-string"], [shen_type_cons, [shen_type_symbol, "error"], [shen_type_cons, [shen_type_symbol, "empty?"], [shen_type_cons, [shen_type_symbol, "element?"], [shen_type_cons, [shen_type_symbol, "dump"], [shen_type_cons, [shen_type_symbol, "dumped"], [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_symbol, "difference"], [shen_type_cons, [shen_type_symbol, "destroy"], [shen_type_cons, [shen_type_symbol, "defun"], [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, [shen_type_symbol, "defmacro"], [shen_type_cons, [shen_type_symbol, "defcc"], [shen_type_cons, [shen_type_symbol, "defprolog"], [shen_type_cons, [shen_type_symbol, "declare"], [shen_type_cons, [shen_type_symbol, "datatype"], [shen_type_cons, [shen_type_symbol, "cut"], [shen_type_cons, [shen_type_symbol, "cn"], [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, [shen_type_symbol, "cond"], [shen_type_cons, [shen_type_symbol, "concat"], [shen_type_cons, [shen_type_symbol, "compile"], [shen_type_cons, [shen_type_symbol, "cd"], [shen_type_cons, [shen_type_symbol, "cases"], [shen_type_cons, [shen_type_symbol, "call"], [shen_type_cons, [shen_type_symbol, "close"], [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, [shen_type_symbol, "bound?"], [shen_type_cons, [shen_type_symbol, "boolean?"], [shen_type_cons, [shen_type_symbol, "boolean"], [shen_type_cons, [shen_type_symbol, "bar!"], [shen_type_cons, [shen_type_symbol, "assoc"], [shen_type_cons, [shen_type_symbol, "arity"], [shen_type_cons, [shen_type_symbol, "append"], [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "adjoin"], [shen_type_cons, [shen_type_symbol, "<-address"], [shen_type_cons, [shen_type_symbol, "address->"], [shen_type_cons, [shen_type_symbol, "absvector?"], [shen_type_cons, [shen_type_symbol, "absvector"], [shen_type_cons, [shen_type_symbol, "abort"], [shen_type_cons, [shen_type_symbol, "intmake-string"], [shen_type_cons, [shen_type_symbol, "intoutput"], [shen_type_cons, [shen_type_symbol, "interror"], []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]);





shen_specialise = [shen_type_func,
  function shen_user_lambda4387(Arg4386) {
  if (Arg4386.length < 1) return [shen_type_func, shen_user_lambda4387, 1, Arg4386];
  var Arg4386_0 = Arg4386[0];
  return ((shenjs_globals["shen_shen-*special*"] = [shen_type_cons, Arg4386_0, (shenjs_globals["shen_shen-*special*"])]),
  Arg4386_0)},
  1,
  [],
  "specialise"];
shenjs_functions["shen_specialise"] = shen_specialise;






shen_unspecialise = [shen_type_func,
  function shen_user_lambda4389(Arg4388) {
  if (Arg4388.length < 1) return [shen_type_func, shen_user_lambda4389, 1, Arg4388];
  var Arg4388_0 = Arg4388[0];
  return ((shenjs_globals["shen_shen-*special*"] = shenjs_call(shen_remove, [Arg4388_0, (shenjs_globals["shen_shen-*special*"])])),
  Arg4388_0)},
  1,
  [],
  "unspecialise"];
shenjs_functions["shen_unspecialise"] = shen_unspecialise;












shen_load = [shen_type_func,
  function shen_user_lambda4392(Arg4391) {
  if (Arg4391.length < 1) return [shen_type_func, shen_user_lambda4392, 1, Arg4391];
  var Arg4391_0 = Arg4391[0];
  var R0, R1, R2;
  return (((R0 = shenjs_get_time([shen_type_symbol, "run"])),
  (R1 = shenjs_call(shen_load_help, [(shenjs_globals["shen_shen-*tc*"]), shenjs_call(shen_read_file, [Arg4391_0])])),
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
  function shen_user_lambda4394(Arg4393) {
  if (Arg4393.length < 2) return [shen_type_func, shen_user_lambda4394, 2, Arg4393];
  var Arg4393_0 = Arg4393[0], Arg4393_1 = Arg4393[1];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$(false, Arg4393_0)))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda4396(Arg4395) {
  if (Arg4395.length < 1) return [shen_type_func, shen_user_lambda4396, 1, Arg4395];
  var Arg4395_0 = Arg4395[0];
  return (function() {
  return shenjs_call_tail(shen_intoutput, ["~S~%", [shen_tuple, shenjs_call(shen_eval_without_macros, [Arg4395_0]), []]]);})},
  1,
  []], Arg4393_1]);})
  : ((R0 = shenjs_call(shen_mapcan, [[shen_type_func,
  function shen_user_lambda4398(Arg4397) {
  if (Arg4397.length < 1) return [shen_type_func, shen_user_lambda4398, 1, Arg4397];
  var Arg4397_0 = Arg4397[0];
  return (function() {
  return shenjs_call_tail(shen_remove_synonyms, [Arg4397_0]);})},
  1,
  []], Arg4393_1])),
  (R1 = shenjs_call(shen_mapcan, [[shen_type_func,
  function shen_user_lambda4400(Arg4399) {
  if (Arg4399.length < 1) return [shen_type_func, shen_user_lambda4400, 1, Arg4399];
  var Arg4399_0 = Arg4399[0];
  return (function() {
  return shenjs_call_tail(shen_typetable, [Arg4399_0]);})},
  1,
  []], R0])),
  shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4402(Arg4401) {
  if (Arg4401.length < 1) return [shen_type_func, shen_user_lambda4402, 1, Arg4401];
  var Arg4401_0 = Arg4401[0];
  return (function() {
  return shenjs_call_tail(shen_assumetype, [Arg4401_0]);})},
  1,
  []], R1]),
  (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4404(Arg4403) {
  if (Arg4403.length < 1) return [shen_type_func, shen_user_lambda4404, 1, Arg4403];
  var Arg4403_0 = Arg4403[0];
  return (function() {
  return shenjs_call_tail(shen_typecheck_and_load, [Arg4403_0]);})},
  1,
  []], R0]);}, [shen_type_func,
  function shen_user_lambda4406(Arg4405) {
  if (Arg4405.length < 2) return [shen_type_func, shen_user_lambda4406, 2, Arg4405];
  var Arg4405_0 = Arg4405[0], Arg4405_1 = Arg4405[1];
  return (function() {
  return shenjs_call_tail(shen_unwind_types, [Arg4405_1, Arg4405_0]);})},
  2,
  [R1]]);})))},
  2,
  [],
  "shen-load-help"];
shenjs_functions["shen_shen-load-help"] = shen_load_help;






shen_remove_synonyms = [shen_type_func,
  function shen_user_lambda4408(Arg4407) {
  if (Arg4407.length < 1) return [shen_type_func, shen_user_lambda4408, 1, Arg4407];
  var Arg4407_0 = Arg4407[0];
  return (((shenjs_is_type(Arg4407_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-synonyms-help"], Arg4407_0[1]))))
  ? (shenjs_call(shen_eval, [Arg4407_0]),
  [])
  : [shen_type_cons, Arg4407_0, []])},
  1,
  [],
  "shen-remove-synonyms"];
shenjs_functions["shen_shen-remove-synonyms"] = shen_remove_synonyms;






shen_typecheck_and_load = [shen_type_func,
  function shen_user_lambda4410(Arg4409) {
  if (Arg4409.length < 1) return [shen_type_func, shen_user_lambda4410, 1, Arg4409];
  var Arg4409_0 = Arg4409[0];
  return (shenjs_call(shen_nl, [1]),
  (function() {
  return shenjs_call_tail(shen_typecheck_and_evaluate, [Arg4409_0, shenjs_call(shen_gensym, [[shen_type_symbol, "A"]])]);}))},
  1,
  [],
  "shen-typecheck-and-load"];
shenjs_functions["shen_shen-typecheck-and-load"] = shen_typecheck_and_load;






shen_typetable = [shen_type_func,
  function shen_user_lambda4412(Arg4411) {
  if (Arg4411.length < 1) return [shen_type_func, shen_user_lambda4412, 1, Arg4411];
  var Arg4411_0 = Arg4411[0];
  var R0;
  return (((shenjs_is_type(Arg4411_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "define"], Arg4411_0[1])) && shenjs_is_type(Arg4411_0[2], shen_type_cons))))
  ? ((R0 = shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda4414(Arg4413) {
  if (Arg4413.length < 1) return [shen_type_func, shen_user_lambda4414, 1, Arg4413];
  var Arg4413_0 = Arg4413[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$sig$plus$rest$gt$, [Arg4413_0]);})},
  1,
  []], Arg4411_0[2][2], []])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["~A lacks a proper signature.~%", [shen_tuple, Arg4411_0[2][1], []]]);})
  : [shen_type_cons, [shen_type_cons, Arg4411_0[2][1], R0], []]))
  : [])},
  1,
  [],
  "shen-typetable"];
shenjs_functions["shen_shen-typetable"] = shen_typetable;






shen_assumetype = [shen_type_func,
  function shen_user_lambda4416(Arg4415) {
  if (Arg4415.length < 1) return [shen_type_func, shen_user_lambda4416, 1, Arg4415];
  var Arg4415_0 = Arg4415[0];
  return ((shenjs_is_type(Arg4415_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_declare, [Arg4415_0[1], Arg4415_0[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-assumetype"]]);}))},
  1,
  [],
  "shen-assumetype"];
shenjs_functions["shen_shen-assumetype"] = shen_assumetype;






shen_unwind_types = [shen_type_func,
  function shen_user_lambda4418(Arg4417) {
  if (Arg4417.length < 2) return [shen_type_func, shen_user_lambda4418, 2, Arg4417];
  var Arg4417_0 = Arg4417[0], Arg4417_1 = Arg4417[1];
  return ((shenjs_empty$question$(Arg4417_1))
  ? (function() {
  return shenjs_simple_error(shenjs_error_to_string(Arg4417_0));})
  : (((shenjs_is_type(Arg4417_1, shen_type_cons) && shenjs_is_type(Arg4417_1[1], shen_type_cons)))
  ? (shenjs_call(shen_remtype, [Arg4417_1[1][1]]),
  (function() {
  return shenjs_call_tail(shen_unwind_types, [Arg4417_0, Arg4417_1[2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-unwind-types"]]);})))},
  2,
  [],
  "shen-unwind-types"];
shenjs_functions["shen_shen-unwind-types"] = shen_unwind_types;






shen_remtype = [shen_type_func,
  function shen_user_lambda4420(Arg4419) {
  if (Arg4419.length < 1) return [shen_type_func, shen_user_lambda4420, 1, Arg4419];
  var Arg4419_0 = Arg4419[0];
  return ((shenjs_globals["shen_shen-*signedfuncs*"] = shenjs_call(shen_remove, [Arg4419_0, (shenjs_globals["shen_shen-*signedfuncs*"])])),
  Arg4419_0)},
  1,
  [],
  "shen-remtype"];
shenjs_functions["shen_shen-remtype"] = shen_remtype;






shen_$lt$sig$plus$rest$gt$ = [shen_type_func,
  function shen_user_lambda4422(Arg4421) {
  if (Arg4421.length < 1) return [shen_type_func, shen_user_lambda4422, 1, Arg4421];
  var Arg4421_0 = Arg4421[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$signature$gt$, [Arg4421_0])),
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
  function shen_user_lambda4424(Arg4423) {
  if (Arg4423.length < 2) return [shen_type_func, shen_user_lambda4424, 2, Arg4423];
  var Arg4423_0 = Arg4423[0], Arg4423_1 = Arg4423[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_intmake_string, ["~A~A", [shen_tuple, (shenjs_globals["shen_*home-directory*"]), [shen_tuple, Arg4423_0, []]]])),
  (R0 = shenjs_open([shen_type_symbol, "file"], R0, [shen_type_symbol, "out"])),
  (R1 = shenjs_call(shen_intmake_string, ["~S~%~%", [shen_tuple, Arg4423_1, []]])),
  shenjs_pr(R1, R0),
  shenjs_close(R0),
  Arg4423_1)},
  2,
  [],
  "write-to-file"];
shenjs_functions["shen_write-to-file"] = shen_write_to_file;












shen_macroexpand = [shen_type_func,
  function shen_user_lambda4427(Arg4426) {
  if (Arg4426.length < 1) return [shen_type_func, shen_user_lambda4427, 1, Arg4426];
  var Arg4426_0 = Arg4426[0];
  return (function() {
  return shenjs_call_tail(shen_compose, [(shenjs_globals["shen_*macros*"]), Arg4426_0]);})},
  1,
  [],
  "macroexpand"];
shenjs_functions["shen_macroexpand"] = shen_macroexpand;






shen_macroexpand = [shen_type_func,
  function shen_user_lambda4429(Arg4428) {
  if (Arg4428.length < 1) return [shen_type_func, shen_user_lambda4429, 1, Arg4428];
  var Arg4428_0 = Arg4428[0];
  var R0;
  return ((R0 = shenjs_call(shen_compose, [(shenjs_globals["shen_*macros*"]), Arg4428_0])),
  ((shenjs_unwind_tail(shenjs_$eq$(Arg4428_0, R0)))
  ? Arg4428_0
  : (function() {
  return shenjs_call_tail(shen_walk, [[shen_type_symbol, "macroexpand"], R0]);})))},
  1,
  [],
  "macroexpand"];
shenjs_functions["shen_macroexpand"] = shen_macroexpand;






(shenjs_globals["shen_*macros*"] = [shen_type_cons, [shen_type_symbol, "shen-timer-macro"], [shen_type_cons, [shen_type_symbol, "shen-cases-macro"], [shen_type_cons, [shen_type_symbol, "shen-abs-macro"], [shen_type_cons, [shen_type_symbol, "shen-put/get-macro"], [shen_type_cons, [shen_type_symbol, "shen-compile-macro"], [shen_type_cons, [shen_type_symbol, "shen-yacc-macro"], [shen_type_cons, [shen_type_symbol, "shen-datatype-macro"], [shen_type_cons, [shen_type_symbol, "shen-let-macro"], [shen_type_cons, [shen_type_symbol, "shen-assoc-macro"], [shen_type_cons, [shen_type_symbol, "shen-i/o-macro"], [shen_type_cons, [shen_type_symbol, "shen-prolog-macro"], [shen_type_cons, [shen_type_symbol, "shen-synonyms-macro"], [shen_type_cons, [shen_type_symbol, "shen-nl-macro"], [shen_type_cons, [shen_type_symbol, "shen-vector-macro"], [shen_type_cons, [shen_type_symbol, "shen-@s-macro"], [shen_type_cons, [shen_type_symbol, "shen-defmacro-macro"], [shen_type_cons, [shen_type_symbol, "shen-defprolog-macro"], [shen_type_cons, [shen_type_symbol, "shen-function-macro"], []]]]]]]]]]]]]]]]]]]);






shen_compose = [shen_type_func,
  function shen_user_lambda4432(Arg4431) {
  if (Arg4431.length < 2) return [shen_type_func, shen_user_lambda4432, 2, Arg4431];
  var Arg4431_0 = Arg4431[0], Arg4431_1 = Arg4431[1];
  return ((shenjs_empty$question$(Arg4431_0))
  ? Arg4431_1
  : ((shenjs_is_type(Arg4431_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_compose, [Arg4431_0[2], shenjs_call(Arg4431_0[1], [Arg4431_1])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-compose"]]);})))},
  2,
  [],
  "shen-compose"];
shenjs_functions["shen_shen-compose"] = shen_compose;






shen_compile_macro = [shen_type_func,
  function shen_user_lambda4434(Arg4433) {
  if (Arg4433.length < 1) return [shen_type_func, shen_user_lambda4434, 1, Arg4433];
  var Arg4433_0 = Arg4433[0];
  return (((shenjs_is_type(Arg4433_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "compile"], Arg4433_0[1])) && (shenjs_is_type(Arg4433_0[2], shen_type_cons) && (shenjs_is_type(Arg4433_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4433_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "compile"], [shen_type_cons, Arg4433_0[2][1], [shen_type_cons, Arg4433_0[2][2][1], [shen_type_cons, [], []]]]]
  : Arg4433_0)},
  1,
  [],
  "shen-compile-macro"];
shenjs_functions["shen_shen-compile-macro"] = shen_compile_macro;






shen_prolog_macro = [shen_type_func,
  function shen_user_lambda4436(Arg4435) {
  if (Arg4435.length < 1) return [shen_type_func, shen_user_lambda4436, 1, Arg4435];
  var Arg4435_0 = Arg4435[0];
  return (((shenjs_is_type(Arg4435_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "prolog?"], Arg4435_0[1]))))
  ? [shen_type_cons, [shen_type_symbol, "shen-intprolog"], [shen_type_cons, shenjs_call(shen_prolog_form, [Arg4435_0[2]]), []]]
  : Arg4435_0)},
  1,
  [],
  "shen-prolog-macro"];
shenjs_functions["shen_shen-prolog-macro"] = shen_prolog_macro;






shen_defprolog_macro = [shen_type_func,
  function shen_user_lambda4438(Arg4437) {
  if (Arg4437.length < 1) return [shen_type_func, shen_user_lambda4438, 1, Arg4437];
  var Arg4437_0 = Arg4437[0];
  return (((shenjs_is_type(Arg4437_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defprolog"], Arg4437_0[1])) && shenjs_is_type(Arg4437_0[2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_compile, [[shen_type_func,
  function shen_user_lambda4440(Arg4439) {
  if (Arg4439.length < 1) return [shen_type_func, shen_user_lambda4440, 1, Arg4439];
  var Arg4439_0 = Arg4439[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$defprolog$gt$, [Arg4439_0]);})},
  1,
  []], Arg4437_0[2], [shen_type_func,
  function shen_user_lambda4442(Arg4441) {
  if (Arg4441.length < 2) return [shen_type_func, shen_user_lambda4442, 2, Arg4441];
  var Arg4441_0 = Arg4441[0], Arg4441_1 = Arg4441[1];
  return (function() {
  return shenjs_call_tail(shen_prolog_error, [Arg4441_0[2][1], Arg4441_1]);})},
  2,
  [Arg4437_0]]]);})
  : Arg4437_0)},
  1,
  [],
  "shen-defprolog-macro"];
shenjs_functions["shen_shen-defprolog-macro"] = shen_defprolog_macro;






shen_prolog_form = [shen_type_func,
  function shen_user_lambda4444(Arg4443) {
  if (Arg4443.length < 1) return [shen_type_func, shen_user_lambda4444, 1, Arg4443];
  var Arg4443_0 = Arg4443[0];
  return (function() {
  return shenjs_call_tail(shen_cons$_form, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4446(Arg4445) {
  if (Arg4445.length < 1) return [shen_type_func, shen_user_lambda4446, 1, Arg4445];
  var Arg4445_0 = Arg4445[0];
  return (function() {
  return shenjs_call_tail(shen_cons$_form, [Arg4445_0]);})},
  1,
  []], Arg4443_0])]);})},
  1,
  [],
  "shen-prolog-form"];
shenjs_functions["shen_shen-prolog-form"] = shen_prolog_form;






shen_datatype_macro = [shen_type_func,
  function shen_user_lambda4448(Arg4447) {
  if (Arg4447.length < 1) return [shen_type_func, shen_user_lambda4448, 1, Arg4447];
  var Arg4447_0 = Arg4447[0];
  return (((shenjs_is_type(Arg4447_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "datatype"], Arg4447_0[1])) && shenjs_is_type(Arg4447_0[2], shen_type_cons))))
  ? [shen_type_cons, [shen_type_symbol, "shen-process-datatype"], [shen_type_cons, Arg4447_0[2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "compile"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "function"], [shen_type_cons, [shen_type_symbol, "shen-<datatype-rules>"], []]], [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg4447_0[2][2]]), [shen_type_cons, [shen_type_cons, [shen_type_symbol, "function"], [shen_type_cons, [shen_type_symbol, "shen-datatype-error"], []]], []]]]], []]]]
  : Arg4447_0)},
  1,
  [],
  "shen-datatype-macro"];
shenjs_functions["shen_shen-datatype-macro"] = shen_datatype_macro;






shen_defmacro_macro = [shen_type_func,
  function shen_user_lambda4450(Arg4449) {
  if (Arg4449.length < 1) return [shen_type_func, shen_user_lambda4450, 1, Arg4449];
  var Arg4449_0 = Arg4449[0];
  var R0, R1;
  return (((shenjs_is_type(Arg4449_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defmacro"], Arg4449_0[1])) && shenjs_is_type(Arg4449_0[2], shen_type_cons))))
  ? ((R0 = shenjs_call(shen_compile, [[shen_type_symbol, "shen-<defmacro>"], Arg4449_0[2], []])),
  (R1 = [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "*macros*"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "adjoin"], [shen_type_cons, Arg4449_0[2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "*macros*"], []]], []]]], []]]], [shen_type_cons, [shen_type_symbol, "macro"], []]]]),
  (R1 = [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, [shen_type_symbol, "null"], [shen_type_cons, [], [shen_type_cons, R1, [shen_type_cons, R0, []]]]]]),
  R1)
  : Arg4449_0)},
  1,
  [],
  "shen-defmacro-macro"];
shenjs_functions["shen_shen-defmacro-macro"] = shen_defmacro_macro;






shen_defmacro_macro = [shen_type_func,
  function shen_user_lambda4452(Arg4451) {
  if (Arg4451.length < 1) return [shen_type_func, shen_user_lambda4452, 1, Arg4451];
  var Arg4451_0 = Arg4451[0];
  var R0, R1;
  return (((shenjs_is_type(Arg4451_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defmacro"], Arg4451_0[1])) && shenjs_is_type(Arg4451_0[2], shen_type_cons))))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg4451_0[2][1], shenjs_call(shen_append, [Arg4451_0[2][2], [shen_type_cons, [shen_type_symbol, "X"], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_symbol, "X"], []]]]])]]),
  (R1 = [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "*macros*"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "adjoin"], [shen_type_cons, Arg4451_0[2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "*macros*"], []]], []]]], []]]], [shen_type_cons, [shen_type_symbol, "macro"], []]]]),
  (R1 = [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, [shen_type_symbol, "null"], [shen_type_cons, [], [shen_type_cons, R1, [shen_type_cons, R0, []]]]]]),
  R1)
  : Arg4451_0)},
  1,
  [],
  "shen-defmacro-macro"];
shenjs_functions["shen_shen-defmacro-macro"] = shen_defmacro_macro;






shen_$lt$defmacro$gt$ = [shen_type_func,
  function shen_user_lambda4454(Arg4453) {
  if (Arg4453.length < 1) return [shen_type_func, shen_user_lambda4454, 1, Arg4453];
  var Arg4453_0 = Arg4453[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$name$gt$, [Arg4453_0])),
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
  function shen_user_lambda4456(Arg4455) {
  if (Arg4455.length < 1) return [shen_type_func, shen_user_lambda4456, 1, Arg4455];
  var Arg4455_0 = Arg4455[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$macrorule$gt$, [Arg4455_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$macrorules$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_append, [shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])])])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$macrorule$gt$, [Arg4455_0])),
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
  function shen_user_lambda4458(Arg4457) {
  if (Arg4457.length < 1) return [shen_type_func, shen_user_lambda4458, 1, Arg4457];
  var Arg4457_0 = Arg4457[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4457_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4457_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "->"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$macroaction$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_append, [shenjs_call(shen_snd, [R0]), [shen_type_cons, [shen_type_symbol, "->"], shenjs_call(shen_snd, [R1])]])])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4457_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4457_0])),
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
  function shen_user_lambda4460(Arg4459) {
  if (Arg4459.length < 1) return [shen_type_func, shen_user_lambda4460, 1, Arg4459];
  var Arg4459_0 = Arg4459[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$action$gt$, [Arg4459_0])),
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
  function shen_user_lambda4462(Arg4461) {
  if (Arg4461.length < 1) return [shen_type_func, shen_user_lambda4462, 1, Arg4461];
  var Arg4461_0 = Arg4461[0];
  var R0;
  return (((shenjs_is_type(Arg4461_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], Arg4461_0[1])) && (shenjs_is_type(Arg4461_0[2], shen_type_cons) && (shenjs_is_type(Arg4461_0[2][2], shen_type_cons) && shenjs_is_type(Arg4461_0[2][2][2], shen_type_cons))))))
  ? [shen_type_cons, [shen_type_symbol, "@s"], [shen_type_cons, Arg4461_0[2][1], [shen_type_cons, shenjs_call(shen_$at$s_macro, [[shen_type_cons, [shen_type_symbol, "@s"], Arg4461_0[2][2]]]), []]]]
  : (((shenjs_is_type(Arg4461_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], Arg4461_0[1])) && (shenjs_is_type(Arg4461_0[2], shen_type_cons) && (shenjs_is_type(Arg4461_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4461_0[2][2][2]) && (typeof(Arg4461_0[2][1]) == 'string')))))))
  ? ((R0 = shenjs_call(shen_explode, [Arg4461_0[2][1]])),
  (((shenjs_call(shen_length, [R0]) > 1))
  ? (function() {
  return shenjs_call_tail(shen_$at$s_macro, [[shen_type_cons, [shen_type_symbol, "@s"], shenjs_call(shen_append, [R0, Arg4461_0[2][2]])]]);})
  : Arg4461_0))
  : Arg4461_0))},
  1,
  [],
  "shen-@s-macro"];
shenjs_functions["shen_shen-@s-macro"] = shen_$at$s_macro;






shen_synonyms_macro = [shen_type_func,
  function shen_user_lambda4464(Arg4463) {
  if (Arg4463.length < 1) return [shen_type_func, shen_user_lambda4464, 1, Arg4463];
  var Arg4463_0 = Arg4463[0];
  return (((shenjs_is_type(Arg4463_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "synonyms"], Arg4463_0[1]))))
  ? [shen_type_cons, [shen_type_symbol, "shen-synonyms-help"], [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg4463_0[2]]), []]]
  : Arg4463_0)},
  1,
  [],
  "shen-synonyms-macro"];
shenjs_functions["shen_shen-synonyms-macro"] = shen_synonyms_macro;






shen_nl_macro = [shen_type_func,
  function shen_user_lambda4466(Arg4465) {
  if (Arg4465.length < 1) return [shen_type_func, shen_user_lambda4466, 1, Arg4465];
  var Arg4465_0 = Arg4465[0];
  return (((shenjs_is_type(Arg4465_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "nl"], Arg4465_0[1])) && shenjs_empty$question$(Arg4465_0[2]))))
  ? [shen_type_cons, [shen_type_symbol, "nl"], [shen_type_cons, 1, []]]
  : Arg4465_0)},
  1,
  [],
  "shen-nl-macro"];
shenjs_functions["shen_shen-nl-macro"] = shen_nl_macro;






shen_vector_macro = [shen_type_func,
  function shen_user_lambda4468(Arg4467) {
  if (Arg4467.length < 1) return [shen_type_func, shen_user_lambda4468, 1, Arg4467];
  var Arg4467_0 = Arg4467[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(shenjs_vector(0), Arg4467_0)))
  ? [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 0, []]]
  : Arg4467_0)},
  1,
  [],
  "shen-vector-macro"];
shenjs_functions["shen_shen-vector-macro"] = shen_vector_macro;






shen_yacc_macro = [shen_type_func,
  function shen_user_lambda4470(Arg4469) {
  if (Arg4469.length < 1) return [shen_type_func, shen_user_lambda4470, 1, Arg4469];
  var Arg4469_0 = Arg4469[0];
  return (((shenjs_is_type(Arg4469_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defcc"], Arg4469_0[1])) && shenjs_is_type(Arg4469_0[2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_yacc_$gt$shen, [Arg4469_0[2][1], Arg4469_0[2][2], shenjs_call(shen_extract_segvars, [Arg4469_0[2][2]])]);})
  : Arg4469_0)},
  1,
  [],
  "shen-yacc-macro"];
shenjs_functions["shen_shen-yacc-macro"] = shen_yacc_macro;






shen_assoc_macro = [shen_type_func,
  function shen_user_lambda4472(Arg4471) {
  if (Arg4471.length < 1) return [shen_type_func, shen_user_lambda4472, 1, Arg4471];
  var Arg4471_0 = Arg4471[0];
  return (((shenjs_is_type(Arg4471_0, shen_type_cons) && (shenjs_is_type(Arg4471_0[2], shen_type_cons) && (shenjs_is_type(Arg4471_0[2][2], shen_type_cons) && (shenjs_is_type(Arg4471_0[2][2][2], shen_type_cons) && shenjs_call(shen_element$question$, [Arg4471_0[1], [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "append"], [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "or"], [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, [shen_type_symbol, "do"], []]]]]]]]]]))))))
  ? [shen_type_cons, Arg4471_0[1], [shen_type_cons, Arg4471_0[2][1], [shen_type_cons, shenjs_call(shen_assoc_macro, [[shen_type_cons, Arg4471_0[1], Arg4471_0[2][2]]]), []]]]
  : Arg4471_0)},
  1,
  [],
  "shen-assoc-macro"];
shenjs_functions["shen_shen-assoc-macro"] = shen_assoc_macro;






shen_let_macro = [shen_type_func,
  function shen_user_lambda4474(Arg4473) {
  if (Arg4473.length < 1) return [shen_type_func, shen_user_lambda4474, 1, Arg4473];
  var Arg4473_0 = Arg4473[0];
  return (((shenjs_is_type(Arg4473_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg4473_0[1])) && (shenjs_is_type(Arg4473_0[2], shen_type_cons) && (shenjs_is_type(Arg4473_0[2][2], shen_type_cons) && (shenjs_is_type(Arg4473_0[2][2][2], shen_type_cons) && shenjs_is_type(Arg4473_0[2][2][2][2], shen_type_cons)))))))
  ? [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, Arg4473_0[2][1], [shen_type_cons, Arg4473_0[2][2][1], [shen_type_cons, shenjs_call(shen_let_macro, [[shen_type_cons, [shen_type_symbol, "let"], Arg4473_0[2][2][2]]]), []]]]]
  : Arg4473_0)},
  1,
  [],
  "shen-let-macro"];
shenjs_functions["shen_shen-let-macro"] = shen_let_macro;






shen_abs_macro = [shen_type_func,
  function shen_user_lambda4476(Arg4475) {
  if (Arg4475.length < 1) return [shen_type_func, shen_user_lambda4476, 1, Arg4475];
  var Arg4475_0 = Arg4475[0];
  return (((shenjs_is_type(Arg4475_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4475_0[1])) && (shenjs_is_type(Arg4475_0[2], shen_type_cons) && (shenjs_is_type(Arg4475_0[2][2], shen_type_cons) && shenjs_is_type(Arg4475_0[2][2][2], shen_type_cons))))))
  ? [shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, Arg4475_0[2][1], [shen_type_cons, shenjs_call(shen_abs_macro, [[shen_type_cons, [shen_type_symbol, "/."], Arg4475_0[2][2]]]), []]]]
  : (((shenjs_is_type(Arg4475_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4475_0[1])) && (shenjs_is_type(Arg4475_0[2], shen_type_cons) && (shenjs_is_type(Arg4475_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4475_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "lambda"], Arg4475_0[2]]
  : Arg4475_0))},
  1,
  [],
  "shen-abs-macro"];
shenjs_functions["shen_shen-abs-macro"] = shen_abs_macro;






shen_cases_macro = [shen_type_func,
  function shen_user_lambda4478(Arg4477) {
  if (Arg4477.length < 1) return [shen_type_func, shen_user_lambda4478, 1, Arg4477];
  var Arg4477_0 = Arg4477[0];
  return (((shenjs_is_type(Arg4477_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cases"], Arg4477_0[1])) && (shenjs_is_type(Arg4477_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg4477_0[2][1])) && shenjs_is_type(Arg4477_0[2][2], shen_type_cons))))))
  ? Arg4477_0[2][2][1]
  : (((shenjs_is_type(Arg4477_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cases"], Arg4477_0[1])) && (shenjs_is_type(Arg4477_0[2], shen_type_cons) && (shenjs_is_type(Arg4477_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4477_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, Arg4477_0[2][1], [shen_type_cons, Arg4477_0[2][2][1], [shen_type_cons, shenjs_call(shen_i$slash$o_macro, [[shen_type_cons, [shen_type_symbol, "error"], [shen_type_cons, "error: cases exhausted~%", []]]]), []]]]]
  : (((shenjs_is_type(Arg4477_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cases"], Arg4477_0[1])) && (shenjs_is_type(Arg4477_0[2], shen_type_cons) && shenjs_is_type(Arg4477_0[2][2], shen_type_cons)))))
  ? [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, Arg4477_0[2][1], [shen_type_cons, Arg4477_0[2][2][1], [shen_type_cons, shenjs_call(shen_cases_macro, [[shen_type_cons, [shen_type_symbol, "cases"], Arg4477_0[2][2][2]]]), []]]]]
  : (((shenjs_is_type(Arg4477_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cases"], Arg4477_0[1])) && (shenjs_is_type(Arg4477_0[2], shen_type_cons) && shenjs_empty$question$(Arg4477_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["error: odd number of case elements~%", []]);})
  : Arg4477_0))))},
  1,
  [],
  "shen-cases-macro"];
shenjs_functions["shen_shen-cases-macro"] = shen_cases_macro;






shen_timer_macro = [shen_type_func,
  function shen_user_lambda4480(Arg4479) {
  if (Arg4479.length < 1) return [shen_type_func, shen_user_lambda4480, 1, Arg4479];
  var Arg4479_0 = Arg4479[0];
  return (((shenjs_is_type(Arg4479_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "time"], Arg4479_0[1])) && (shenjs_is_type(Arg4479_0[2], shen_type_cons) && shenjs_empty$question$(Arg4479_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_let_macro, [[shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Start"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "run"], []]], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg4479_0[2][1], [shen_type_cons, [shen_type_symbol, "Finish"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "run"], []]], [shen_type_cons, [shen_type_symbol, "Time"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_symbol, "Finish"], [shen_type_cons, [shen_type_symbol, "Start"], []]]], [shen_type_cons, [shen_type_symbol, "Message"], [shen_type_cons, shenjs_call(shen_i$slash$o_macro, [[shen_type_cons, [shen_type_symbol, "output"], [shen_type_cons, "~%run time: ~A secs~%", [shen_type_cons, [shen_type_symbol, "Time"], []]]]]), [shen_type_cons, [shen_type_symbol, "Result"], []]]]]]]]]]]]]]);})
  : Arg4479_0)},
  1,
  [],
  "shen-timer-macro"];
shenjs_functions["shen_shen-timer-macro"] = shen_timer_macro;






shen_i$slash$o_macro = [shen_type_func,
  function shen_user_lambda4482(Arg4481) {
  if (Arg4481.length < 1) return [shen_type_func, shen_user_lambda4482, 1, Arg4481];
  var Arg4481_0 = Arg4481[0];
  return (((shenjs_is_type(Arg4481_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "output"], Arg4481_0[1])) && shenjs_is_type(Arg4481_0[2], shen_type_cons))))
  ? [shen_type_cons, [shen_type_symbol, "intoutput"], [shen_type_cons, Arg4481_0[2][1], [shen_type_cons, shenjs_call(shen_tuple_up, [Arg4481_0[2][2]]), []]]]
  : (((shenjs_is_type(Arg4481_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "make-string"], Arg4481_0[1])) && shenjs_is_type(Arg4481_0[2], shen_type_cons))))
  ? [shen_type_cons, [shen_type_symbol, "intmake-string"], [shen_type_cons, Arg4481_0[2][1], [shen_type_cons, shenjs_call(shen_tuple_up, [Arg4481_0[2][2]]), []]]]
  : (((shenjs_is_type(Arg4481_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "error"], Arg4481_0[1])) && shenjs_is_type(Arg4481_0[2], shen_type_cons))))
  ? [shen_type_cons, [shen_type_symbol, "interror"], [shen_type_cons, Arg4481_0[2][1], [shen_type_cons, shenjs_call(shen_tuple_up, [Arg4481_0[2][2]]), []]]]
  : (((shenjs_is_type(Arg4481_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "pr"], Arg4481_0[1])) && (shenjs_is_type(Arg4481_0[2], shen_type_cons) && shenjs_empty$question$(Arg4481_0[2][2])))))
  ? [shen_type_cons, [shen_type_symbol, "pr"], [shen_type_cons, Arg4481_0[2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-stoutput"], [shen_type_cons, 0, []]], []]]]
  : (((shenjs_is_type(Arg4481_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "read-byte"], Arg4481_0[1])) && shenjs_empty$question$(Arg4481_0[2]))))
  ? [shen_type_cons, [shen_type_symbol, "read-byte"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "stinput"], [shen_type_cons, 0, []]], []]]
  : Arg4481_0)))))},
  1,
  [],
  "shen-i/o-macro"];
shenjs_functions["shen_shen-i/o-macro"] = shen_i$slash$o_macro;






shen_tuple_up = [shen_type_func,
  function shen_user_lambda4484(Arg4483) {
  if (Arg4483.length < 1) return [shen_type_func, shen_user_lambda4484, 1, Arg4483];
  var Arg4483_0 = Arg4483[0];
  return ((shenjs_is_type(Arg4483_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, Arg4483_0[1], [shen_type_cons, shenjs_call(shen_tuple_up, [Arg4483_0[2]]), []]]]
  : Arg4483_0)},
  1,
  [],
  "shen-tuple-up"];
shenjs_functions["shen_shen-tuple-up"] = shen_tuple_up;






shen_put$slash$get_macro = [shen_type_func,
  function shen_user_lambda4486(Arg4485) {
  if (Arg4485.length < 1) return [shen_type_func, shen_user_lambda4486, 1, Arg4485];
  var Arg4485_0 = Arg4485[0];
  return (((shenjs_is_type(Arg4485_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "put"], Arg4485_0[1])) && (shenjs_is_type(Arg4485_0[2], shen_type_cons) && (shenjs_is_type(Arg4485_0[2][2], shen_type_cons) && (shenjs_is_type(Arg4485_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4485_0[2][2][2][2])))))))
  ? [shen_type_cons, [shen_type_symbol, "put"], [shen_type_cons, Arg4485_0[2][1], [shen_type_cons, Arg4485_0[2][2][1], [shen_type_cons, Arg4485_0[2][2][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*property-vector*"], []]], []]]]]]
  : (((shenjs_is_type(Arg4485_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "get"], Arg4485_0[1])) && (shenjs_is_type(Arg4485_0[2], shen_type_cons) && (shenjs_is_type(Arg4485_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4485_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "get"], [shen_type_cons, Arg4485_0[2][1], [shen_type_cons, Arg4485_0[2][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*property-vector*"], []]], []]]]]
  : Arg4485_0))},
  1,
  [],
  "shen-put/get-macro"];
shenjs_functions["shen_shen-put/get-macro"] = shen_put$slash$get_macro;






shen_function_macro = [shen_type_func,
  function shen_user_lambda4488(Arg4487) {
  if (Arg4487.length < 1) return [shen_type_func, shen_user_lambda4488, 1, Arg4487];
  var Arg4487_0 = Arg4487[0];
  return (((shenjs_is_type(Arg4487_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "function"], Arg4487_0[1])) && (shenjs_is_type(Arg4487_0[2], shen_type_cons) && shenjs_empty$question$(Arg4487_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_function_abstraction, [Arg4487_0[2][1], shenjs_call(shen_arity, [Arg4487_0[2][1]])]);})
  : Arg4487_0)},
  1,
  [],
  "shen-function-macro"];
shenjs_functions["shen_shen-function-macro"] = shen_function_macro;






shen_function_abstraction = [shen_type_func,
  function shen_user_lambda4490(Arg4489) {
  if (Arg4489.length < 2) return [shen_type_func, shen_user_lambda4490, 2, Arg4489];
  var Arg4489_0 = Arg4489[0], Arg4489_1 = Arg4489[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg4489_1)))
  ? [shen_type_cons, [shen_type_symbol, "freeze"], [shen_type_cons, Arg4489_0, []]]
  : ((shenjs_unwind_tail(shenjs_$eq$(-1, Arg4489_1)))
  ? Arg4489_0
  : (function() {
  return shenjs_call_tail(shen_function_abstraction_help, [Arg4489_0, Arg4489_1, []]);})))},
  2,
  [],
  "shen-function-abstraction"];
shenjs_functions["shen_shen-function-abstraction"] = shen_function_abstraction;






shen_function_abstraction_help = [shen_type_func,
  function shen_user_lambda4492(Arg4491) {
  if (Arg4491.length < 3) return [shen_type_func, shen_user_lambda4492, 3, Arg4491];
  var Arg4491_0 = Arg4491[0], Arg4491_1 = Arg4491[1], Arg4491_2 = Arg4491[2];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg4491_1)))
  ? [shen_type_cons, Arg4491_0, Arg4491_2]
  : ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, R0, [shen_type_cons, shenjs_call(shen_function_abstraction_help, [Arg4491_0, (Arg4491_1 - 1), shenjs_call(shen_append, [Arg4491_2, [shen_type_cons, R0, []]])]), []]]]))},
  3,
  [],
  "shen-function-abstraction-help"];
shenjs_functions["shen_shen-function-abstraction-help"] = shen_function_abstraction_help;












shen_declare = [shen_type_func,
  function shen_user_lambda5848(Arg5847) {
  if (Arg5847.length < 2) return [shen_type_func, shen_user_lambda5848, 2, Arg5847];
  var Arg5847_0 = Arg5847[0], Arg5847_1 = Arg5847[1];
  var R0, R1, R2;
  return ((shenjs_globals["shen_shen-*signedfuncs*"] = shenjs_call(shen_adjoin, [Arg5847_0, (shenjs_globals["shen_shen-*signedfuncs*"])])),
  shenjs_trap_error(function() {return shenjs_call(shen_variancy_test, [Arg5847_0, Arg5847_1]);}, [shen_type_func,
  function shen_user_lambda5850(Arg5849) {
  if (Arg5849.length < 1) return [shen_type_func, shen_user_lambda5850, 1, Arg5849];
  var Arg5849_0 = Arg5849[0];
  return [shen_type_symbol, "shen-skip"]},
  1,
  []]),
  (R0 = shenjs_call(shen_rcons$_form, [shenjs_call(shen_normalise_type, [Arg5847_1])])),
  (R1 = shenjs_call(shen_concat, [[shen_type_symbol, "shen-type-signature-of-"], Arg5847_0])),
  (R2 = shenjs_call(shen_parameters, [1])),
  (R0 = [shen_type_cons, [shen_type_cons, R1, [shen_type_cons, [shen_type_symbol, "X"], []]], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "unify!"], [shen_type_cons, [shen_type_symbol, "X"], [shen_type_cons, R0, []]]], []], []]]]),
  (R0 = shenjs_call(shen_aum, [R0, R2])),
  (R0 = shenjs_call(shen_aum$_to$_shen, [R0])),
  (R2 = [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, R1, shenjs_call(shen_append, [R2, shenjs_call(shen_append, [[shen_type_cons, [shen_type_symbol, "ProcessN"], [shen_type_cons, [shen_type_symbol, "Continuation"], []]], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, R0, []]]])])]]),
  shenjs_call(shen_eval_without_macros, [R2]),
  Arg5847_0)},
  2,
  [],
  "declare"];
shenjs_functions["shen_declare"] = shen_declare;






shen_normalise_type = [shen_type_func,
  function shen_user_lambda5852(Arg5851) {
  if (Arg5851.length < 1) return [shen_type_func, shen_user_lambda5852, 1, Arg5851];
  var Arg5851_0 = Arg5851[0];
  return (function() {
  return shenjs_call_tail(shen_fix, [[shen_type_func,
  function shen_user_lambda5854(Arg5853) {
  if (Arg5853.length < 1) return [shen_type_func, shen_user_lambda5854, 1, Arg5853];
  var Arg5853_0 = Arg5853[0];
  return (function() {
  return shenjs_call_tail(shen_normalise_type_help, [Arg5853_0]);})},
  1,
  []], Arg5851_0]);})},
  1,
  [],
  "shen-normalise-type"];
shenjs_functions["shen_shen-normalise-type"] = shen_normalise_type;






shen_normalise_type_help = [shen_type_func,
  function shen_user_lambda5856(Arg5855) {
  if (Arg5855.length < 1) return [shen_type_func, shen_user_lambda5856, 1, Arg5855];
  var Arg5855_0 = Arg5855[0];
  return ((shenjs_is_type(Arg5855_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_normalise_X, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5858(Arg5857) {
  if (Arg5857.length < 1) return [shen_type_func, shen_user_lambda5858, 1, Arg5857];
  var Arg5857_0 = Arg5857[0];
  return (function() {
  return shenjs_call_tail(shen_normalise_type_help, [Arg5857_0]);})},
  1,
  []], Arg5855_0])]);})
  : (function() {
  return shenjs_call_tail(shen_normalise_X, [Arg5855_0]);}))},
  1,
  [],
  "shen-normalise-type-help"];
shenjs_functions["shen_shen-normalise-type-help"] = shen_normalise_type_help;






shen_normalise_X = [shen_type_func,
  function shen_user_lambda5860(Arg5859) {
  if (Arg5859.length < 1) return [shen_type_func, shen_user_lambda5860, 1, Arg5859];
  var Arg5859_0 = Arg5859[0];
  var R0;
  return ((R0 = shenjs_call(shen_assoc, [Arg5859_0, (shenjs_globals["shen_shen-*synonyms*"])])),
  ((shenjs_empty$question$(R0))
  ? Arg5859_0
  : R0[2]))},
  1,
  [],
  "shen-normalise-X"];
shenjs_functions["shen_shen-normalise-X"] = shen_normalise_X;






shen_variancy_test = [shen_type_func,
  function shen_user_lambda5862(Arg5861) {
  if (Arg5861.length < 2) return [shen_type_func, shen_user_lambda5862, 2, Arg5861];
  var Arg5861_0 = Arg5861[0], Arg5861_1 = Arg5861[1];
  var R0;
  return ((R0 = shenjs_call(shen_typecheck, [Arg5861_0, [shen_type_symbol, "B"]])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R0)))
  ? [shen_type_symbol, "shen-skip"]
  : ((shenjs_call(shen_variant$question$, [R0, Arg5861_1]))
  ? [shen_type_symbol, "shen-skip"]
  : shenjs_call(shen_intoutput, ["warning: changing the type of ~A may create errors~%", [shen_tuple, Arg5861_0, []]]))),
  [shen_type_symbol, "shen-skip"])},
  2,
  [],
  "shen-variancy-test"];
shenjs_functions["shen_shen-variancy-test"] = shen_variancy_test;






shen_variant$question$ = [shen_type_func,
  function shen_user_lambda5864(Arg5863) {
  if (Arg5863.length < 2) return [shen_type_func, shen_user_lambda5864, 2, Arg5863];
  var Arg5863_0 = Arg5863[0], Arg5863_1 = Arg5863[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5863_1, Arg5863_0)))
  ? true
  : (((shenjs_is_type(Arg5863_0, shen_type_cons) && (shenjs_is_type(Arg5863_1, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5863_1[1], Arg5863_0[1])))))
  ? (function() {
  return shenjs_call_tail(shen_variant$question$, [Arg5863_0[2], Arg5863_1[2]]);})
  : (((shenjs_is_type(Arg5863_0, shen_type_cons) && (shenjs_is_type(Arg5863_1, shen_type_cons) && (shenjs_call(shen_pvar$question$, [Arg5863_0[1]]) && shenjs_call(shen_variable$question$, [Arg5863_1[1]])))))
  ? (function() {
  return shenjs_call_tail(shen_variant$question$, [shenjs_call(shen_subst, [[shen_type_symbol, "shen-a"], Arg5863_0[1], Arg5863_0[2]]), shenjs_call(shen_subst, [[shen_type_symbol, "shen-a"], Arg5863_1[1], Arg5863_1[2]])]);})
  : (((shenjs_is_type(Arg5863_0, shen_type_cons) && (shenjs_is_type(Arg5863_0[1], shen_type_cons) && (shenjs_is_type(Arg5863_1, shen_type_cons) && shenjs_is_type(Arg5863_1[1], shen_type_cons)))))
  ? (function() {
  return shenjs_call_tail(shen_variant$question$, [shenjs_call(shen_append, [Arg5863_0[1], Arg5863_0[2]]), shenjs_call(shen_append, [Arg5863_1[1], Arg5863_1[2]])]);})
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
  function shen_user_lambda5405(Arg5404) {
  if (Arg5404.length < 2) return [shen_type_func, shen_user_lambda5405, 2, Arg5404];
  var Arg5404_0 = Arg5404[0], Arg5404_1 = Arg5404[1];
  var R0, R1, R2, R3;
  return ((R0 = shenjs_call(shen_curry, [Arg5404_0])),
  (R1 = shenjs_call(shen_start_new_prolog_process, [])),
  (R2 = shenjs_call(shen_insert_prolog_variables, [shenjs_call(shen_normalise_type, [shenjs_call(shen_curry_type, [Arg5404_1])]), R1])),
  (R3 = (new Shenjs_freeze([R0, R2, R1], function(Arg5406) {
  var Arg5406_0 = Arg5406[0], Arg5406_1 = Arg5406[1], Arg5406_2 = Arg5406[2];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_return, [Arg5406_1, Arg5406_2, [shen_type_symbol, "shen-void"]]);});})}))),
  (function() {
  return shenjs_call_tail(shen_th$asterisk$, [R0, R2, [], R1, R3]);}))},
  2,
  [],
  "shen-typecheck"];
shenjs_functions["shen_shen-typecheck"] = shen_typecheck;






shen_curry = [shen_type_func,
  function shen_user_lambda5409(Arg5408) {
  if (Arg5408.length < 1) return [shen_type_func, shen_user_lambda5409, 1, Arg5408];
  var Arg5408_0 = Arg5408[0];
  return (((shenjs_is_type(Arg5408_0, shen_type_cons) && shenjs_call(shen_special$question$, [Arg5408_0[1]])))
  ? [shen_type_cons, Arg5408_0[1], shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5411(Arg5410) {
  if (Arg5410.length < 1) return [shen_type_func, shen_user_lambda5411, 1, Arg5410];
  var Arg5410_0 = Arg5410[0];
  return (function() {
  return shenjs_call_tail(shen_curry, [Arg5410_0]);})},
  1,
  []], Arg5408_0[2]])]
  : (((shenjs_is_type(Arg5408_0, shen_type_cons) && (shenjs_is_type(Arg5408_0[2], shen_type_cons) && shenjs_call(shen_extraspecial$question$, [Arg5408_0[1]]))))
  ? Arg5408_0
  : (((shenjs_is_type(Arg5408_0, shen_type_cons) && (shenjs_is_type(Arg5408_0[2], shen_type_cons) && shenjs_is_type(Arg5408_0[2][2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_curry, [[shen_type_cons, [shen_type_cons, Arg5408_0[1], [shen_type_cons, Arg5408_0[2][1], []]], Arg5408_0[2][2]]]);})
  : (((shenjs_is_type(Arg5408_0, shen_type_cons) && (shenjs_is_type(Arg5408_0[2], shen_type_cons) && shenjs_empty$question$(Arg5408_0[2][2]))))
  ? [shen_type_cons, shenjs_call(shen_curry, [Arg5408_0[1]]), [shen_type_cons, shenjs_call(shen_curry, [Arg5408_0[2][1]]), []]]
  : Arg5408_0))))},
  1,
  [],
  "shen-curry"];
shenjs_functions["shen_shen-curry"] = shen_curry;






shen_special$question$ = [shen_type_func,
  function shen_user_lambda5413(Arg5412) {
  if (Arg5412.length < 1) return [shen_type_func, shen_user_lambda5413, 1, Arg5412];
  var Arg5412_0 = Arg5412[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5412_0, (shenjs_globals["shen_shen-*special*"])]);})},
  1,
  [],
  "shen-special?"];
shenjs_functions["shen_shen-special?"] = shen_special$question$;






shen_extraspecial$question$ = [shen_type_func,
  function shen_user_lambda5415(Arg5414) {
  if (Arg5414.length < 1) return [shen_type_func, shen_user_lambda5415, 1, Arg5414];
  var Arg5414_0 = Arg5414[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5414_0, (shenjs_globals["shen_shen-*extraspecial*"])]);})},
  1,
  [],
  "shen-extraspecial?"];
shenjs_functions["shen_shen-extraspecial?"] = shen_extraspecial$question$;






shen_t$asterisk$ = [shen_type_func,
  function shen_user_lambda5417(Arg5416) {
  if (Arg5416.length < 4) return [shen_type_func, shen_user_lambda5417, 4, Arg5416];
  var Arg5416_0 = Arg5416[0], Arg5416_1 = Arg5416[1], Arg5416_2 = Arg5416[2], Arg5416_3 = Arg5416[3];
  var R0, R1, R2, R3;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = ((R1 = shenjs_call(shen_newpv, [Arg5416_2])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_call(shen_maxinfexceeded$question$, []), Arg5416_2, (new Shenjs_freeze([R1, Arg5416_2, Arg5416_3, R0, Arg5416_0, Arg5416_1, Arg5416_2, Arg5416_3], function(Arg5418) {
  var Arg5418_0 = Arg5418[0], Arg5418_1 = Arg5418[1], Arg5418_2 = Arg5418[2], Arg5418_3 = Arg5418[3], Arg5418_4 = Arg5418[4], Arg5418_5 = Arg5418[5], Arg5418_6 = Arg5418[6], Arg5418_7 = Arg5418[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5418_0, shenjs_call(shen_errormaxinfs, []), Arg5418_1, Arg5418_2]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5416_0, Arg5416_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fail"], R1)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5416_2, (new Shenjs_freeze([R0, Arg5416_0, Arg5416_1, Arg5416_2, Arg5416_3], function(Arg5420) {
  var Arg5420_0 = Arg5420[0], Arg5420_1 = Arg5420[1], Arg5420_2 = Arg5420[2], Arg5420_3 = Arg5420[3], Arg5420_4 = Arg5420[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_prolog_failure, [Arg5420_3, Arg5420_4]);});})}))]))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5416_0, Arg5416_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5416_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[1], Arg5416_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg5416_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5416_2])),
  ((shenjs_empty$question$(R3))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5416_2, (new Shenjs_freeze([R0, R2, R1, Arg5416_0, Arg5416_1, Arg5416_2, Arg5416_3], function(Arg5422) {
  var Arg5422_0 = Arg5422[0], Arg5422_1 = Arg5422[1], Arg5422_2 = Arg5422[2], Arg5422_3 = Arg5422[3], Arg5422_4 = Arg5422[4], Arg5422_5 = Arg5422[5], Arg5422_6 = Arg5422[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5422_1, Arg5422_2, Arg5422_4, Arg5422_5, Arg5422_6]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5416_2])),
  (R0 = shenjs_call(shen_newpv, [Arg5416_2])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_show, [Arg5416_0, R1, Arg5416_2, (new Shenjs_freeze([R1, Arg5416_0, Arg5416_1, R0, Arg5416_2, Arg5416_3], function(Arg5424) {
  var Arg5424_0 = Arg5424[0], Arg5424_1 = Arg5424[1], Arg5424_2 = Arg5424[2], Arg5424_3 = Arg5424[3], Arg5424_4 = Arg5424[4], Arg5424_5 = Arg5424[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5424_3, (shenjs_globals["shen_shen-*datatypes*"]), Arg5424_4, (new Shenjs_freeze([Arg5424_1, Arg5424_2, Arg5424_3, Arg5424_4, Arg5424_5], function(Arg5426) {
  var Arg5426_0 = Arg5426[0], Arg5426_1 = Arg5426[1], Arg5426_2 = Arg5426[2], Arg5426_3 = Arg5426[3], Arg5426_4 = Arg5426[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_udefs$asterisk$, [Arg5426_0, Arg5426_1, Arg5426_2, Arg5426_3, Arg5426_4]);});})}))]);});})}))]))
  : R1))
  : R1))
  : R1))]);}))},
  4,
  [],
  "shen-t*"];
shenjs_functions["shen_shen-t*"] = shen_t$asterisk$;






shen_prolog_failure = [shen_type_func,
  function shen_user_lambda5429(Arg5428) {
  if (Arg5428.length < 2) return [shen_type_func, shen_user_lambda5429, 2, Arg5428];
  var Arg5428_0 = Arg5428[0], Arg5428_1 = Arg5428[1];
  return false},
  2,
  [],
  "shen-prolog-failure"];
shenjs_functions["shen_shen-prolog-failure"] = shen_prolog_failure;






shen_maxinfexceeded$question$ = [shen_type_func,
  function shen_user_lambda5431(Arg5430) {
  if (Arg5430.length < 0) return [shen_type_func, shen_user_lambda5431, 0, Arg5430];
  return (shenjs_call(shen_inferences, [[shen_type_symbol, "shen-skip"]]) > (shenjs_globals["shen_shen-*maxinferences*"]))},
  0,
  [],
  "shen-maxinfexceeded?"];
shenjs_functions["shen_shen-maxinfexceeded?"] = shen_maxinfexceeded$question$;






shen_errormaxinfs = [shen_type_func,
  function shen_user_lambda5433(Arg5432) {
  if (Arg5432.length < 0) return [shen_type_func, shen_user_lambda5433, 0, Arg5432];
  return (function() {
  return shenjs_simple_error("maximum inferences exceeded~%");})},
  0,
  [],
  "shen-errormaxinfs"];
shenjs_functions["shen_shen-errormaxinfs"] = shen_errormaxinfs;






shen_udefs$asterisk$ = [shen_type_func,
  function shen_user_lambda5435(Arg5434) {
  if (Arg5434.length < 5) return [shen_type_func, shen_user_lambda5435, 5, Arg5434];
  var Arg5434_0 = Arg5434[0], Arg5434_1 = Arg5434[1], Arg5434_2 = Arg5434[2], Arg5434_3 = Arg5434[3], Arg5434_4 = Arg5434[4];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5434_2, Arg5434_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R0 = R0[1]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_call, [[shen_type_cons, R0, [shen_type_cons, Arg5434_0, [shen_type_cons, Arg5434_1, []]]], Arg5434_3, Arg5434_4]))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5434_2, Arg5434_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_udefs$asterisk$, [Arg5434_0, Arg5434_1, R0, Arg5434_3, Arg5434_4]);}))
  : false))
  : R0))},
  5,
  [],
  "shen-udefs*"];
shenjs_functions["shen_shen-udefs*"] = shen_udefs$asterisk$;






shen_th$asterisk$ = [shen_type_func,
  function shen_user_lambda5437(Arg5436) {
  if (Arg5436.length < 5) return [shen_type_func, shen_user_lambda5437, 5, Arg5436];
  var Arg5436_0 = Arg5436[0], Arg5436_1 = Arg5436[1], Arg5436_2 = Arg5436[2], Arg5436_3 = Arg5436[3], Arg5436_4 = Arg5436[4];
  var R0, R1, R2, R3, R4, R5, R6, R7, R8;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_show, [[shen_type_cons, Arg5436_0, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5436_1, []]]], Arg5436_2, Arg5436_3, (new Shenjs_freeze([R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5438) {
  var Arg5438_0 = Arg5438[0], Arg5438_1 = Arg5438[1], Arg5438_2 = Arg5438[2], Arg5438_3 = Arg5438[3], Arg5438_4 = Arg5438[4], Arg5438_5 = Arg5438[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [false, Arg5438_4, Arg5438_5]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_call(shen_typedf$question$, [shenjs_call(shen_lazyderef, [Arg5436_0, Arg5436_3])]), Arg5436_3, (new Shenjs_freeze([Arg5436_0, R1, Arg5436_1, Arg5436_3, Arg5436_4, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5440) {
  var Arg5440_0 = Arg5440[0], Arg5440_1 = Arg5440[1], Arg5440_2 = Arg5440[2], Arg5440_3 = Arg5440[3], Arg5440_4 = Arg5440[4], Arg5440_5 = Arg5440[5], Arg5440_6 = Arg5440[6], Arg5440_7 = Arg5440[7], Arg5440_8 = Arg5440[8], Arg5440_9 = Arg5440[9], Arg5440_10 = Arg5440[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5440_1, shenjs_call(shen_sigf, [shenjs_call(shen_lazyderef, [Arg5440_0, Arg5440_3])]), Arg5440_3, (new Shenjs_freeze([Arg5440_0, Arg5440_1, Arg5440_2, Arg5440_3, Arg5440_4], function(Arg5442) {
  var Arg5442_0 = Arg5442[0], Arg5442_1 = Arg5442[1], Arg5442_2 = Arg5442[2], Arg5442_3 = Arg5442[3], Arg5442_4 = Arg5442[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_call, [[shen_type_cons, Arg5442_1, [shen_type_cons, Arg5442_2, []]], Arg5442_3, Arg5442_4]);});})}))]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_base, [Arg5436_0, Arg5436_1, Arg5436_3, Arg5436_4]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_by$_hypothesis, [Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5436_0, Arg5436_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5436_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R3 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5436_3])),
  ((shenjs_empty$question$(R1))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R2, [shen_type_cons, R1, [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, Arg5436_1, []]]], Arg5436_2, Arg5436_3, (new Shenjs_freeze([R2, Arg5436_1, R3, R1, Arg5436_2, Arg5436_3, Arg5436_4, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5444) {
  var Arg5444_0 = Arg5444[0], Arg5444_1 = Arg5444[1], Arg5444_2 = Arg5444[2], Arg5444_3 = Arg5444[3], Arg5444_4 = Arg5444[4], Arg5444_5 = Arg5444[5], Arg5444_6 = Arg5444[6], Arg5444_7 = Arg5444[7], Arg5444_8 = Arg5444[8], Arg5444_9 = Arg5444[9], Arg5444_10 = Arg5444[10], Arg5444_11 = Arg5444[11], Arg5444_12 = Arg5444[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5444_2, Arg5444_3, Arg5444_4, Arg5444_5, Arg5444_6]);});})}))]))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5436_0, Arg5436_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5436_1, Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "list"], R4)))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R4, shen_type_cons))
  ? ((R2 = R4[1]),
  (R4 = shenjs_call(shen_lazyderef, [R4[2], Arg5436_3])),
  ((shenjs_empty$question$(R4))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R3, R2, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5446) {
  var Arg5446_0 = Arg5446[0], Arg5446_1 = Arg5446[1], Arg5446_2 = Arg5446[2], Arg5446_3 = Arg5446[3], Arg5446_4 = Arg5446[4], Arg5446_5 = Arg5446[5], Arg5446_6 = Arg5446[6], Arg5446_7 = Arg5446[7], Arg5446_8 = Arg5446[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5446_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5446_2, []]], Arg5446_6, Arg5446_7, Arg5446_8]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [], Arg5436_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R3, R2, R4, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5448) {
  var Arg5448_0 = Arg5448[0], Arg5448_1 = Arg5448[1], Arg5448_2 = Arg5448[2], Arg5448_3 = Arg5448[3], Arg5448_4 = Arg5448[4], Arg5448_5 = Arg5448[5], Arg5448_6 = Arg5448[6], Arg5448_7 = Arg5448[7], Arg5448_8 = Arg5448[8], Arg5448_9 = Arg5448[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5448_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5448_2, []]], Arg5448_7, Arg5448_8, Arg5448_9]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg5436_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_bindv, [R4, [shen_type_cons, R2, []], Arg5436_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R3, R2, Arg5436_2, Arg5436_4, R4, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5450) {
  var Arg5450_0 = Arg5450[0], Arg5450_1 = Arg5450[1], Arg5450_2 = Arg5450[2], Arg5450_3 = Arg5450[3], Arg5450_4 = Arg5450[4], Arg5450_5 = Arg5450[5], Arg5450_6 = Arg5450[6], Arg5450_7 = Arg5450[7], Arg5450_8 = Arg5450[8], Arg5450_9 = Arg5450[9], Arg5450_10 = Arg5450[10], Arg5450_11 = Arg5450[11], Arg5450_12 = Arg5450[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5450_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5450_2, []]], Arg5450_3, Arg5450_6, Arg5450_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg5436_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [shen_type_symbol, "list"], Arg5436_3]),
  (R3 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R3, R5, R4, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5452) {
  var Arg5452_0 = Arg5452[0], Arg5452_1 = Arg5452[1], Arg5452_2 = Arg5452[2], Arg5452_3 = Arg5452[3], Arg5452_4 = Arg5452[4], Arg5452_5 = Arg5452[5], Arg5452_6 = Arg5452[6], Arg5452_7 = Arg5452[7], Arg5452_8 = Arg5452[8], Arg5452_9 = Arg5452[9], Arg5452_10 = Arg5452[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5452_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5452_2, []]], Arg5452_8, Arg5452_4, Arg5452_9]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg5436_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R3, R5, R2, R4, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5454) {
  var Arg5454_0 = Arg5454[0], Arg5454_1 = Arg5454[1], Arg5454_2 = Arg5454[2], Arg5454_3 = Arg5454[3], Arg5454_4 = Arg5454[4], Arg5454_5 = Arg5454[5], Arg5454_6 = Arg5454[6], Arg5454_7 = Arg5454[7], Arg5454_8 = Arg5454[8], Arg5454_9 = Arg5454[9], Arg5454_10 = Arg5454[10], Arg5454_11 = Arg5454[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5454_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5454_2, []]], Arg5454_9, Arg5454_5, Arg5454_10]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5436_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R5, []], Arg5436_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R3, R5, Arg5436_2, Arg5436_4, R2, Arg5436_3, R4, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5456) {
  var Arg5456_0 = Arg5456[0], Arg5456_1 = Arg5456[1], Arg5456_2 = Arg5456[2], Arg5456_3 = Arg5456[3], Arg5456_4 = Arg5456[4], Arg5456_5 = Arg5456[5], Arg5456_6 = Arg5456[6], Arg5456_7 = Arg5456[7], Arg5456_8 = Arg5456[8], Arg5456_9 = Arg5456[9], Arg5456_10 = Arg5456[10], Arg5456_11 = Arg5456[11], Arg5456_12 = Arg5456[12], Arg5456_13 = Arg5456[13], Arg5456_14 = Arg5456[14];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5456_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5456_2, []]], Arg5456_3, Arg5456_6, Arg5456_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5436_3]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R4, Arg5436_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, R4, []]], Arg5436_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R3, R4, Arg5436_2, Arg5436_4, R2, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5458) {
  var Arg5458_0 = Arg5458[0], Arg5458_1 = Arg5458[1], Arg5458_2 = Arg5458[2], Arg5458_3 = Arg5458[3], Arg5458_4 = Arg5458[4], Arg5458_5 = Arg5458[5], Arg5458_6 = Arg5458[6], Arg5458_7 = Arg5458[7], Arg5458_8 = Arg5458[8], Arg5458_9 = Arg5458[9], Arg5458_10 = Arg5458[10], Arg5458_11 = Arg5458[11], Arg5458_12 = Arg5458[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5458_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5458_2, []]], Arg5458_3, Arg5458_6, Arg5458_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5436_3]),
  R4)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5436_0, Arg5436_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@p"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5436_1, Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R2[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "*"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R2 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg5436_3])),
  ((shenjs_empty$question$(R5))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R4, R3, R2, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5460) {
  var Arg5460_0 = Arg5460[0], Arg5460_1 = Arg5460[1], Arg5460_2 = Arg5460[2], Arg5460_3 = Arg5460[3], Arg5460_4 = Arg5460[4], Arg5460_5 = Arg5460[5], Arg5460_6 = Arg5460[6], Arg5460_7 = Arg5460[7], Arg5460_8 = Arg5460[8], Arg5460_9 = Arg5460[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5460_2, Arg5460_3, Arg5460_7, Arg5460_8, Arg5460_9]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg5436_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R4, R3, R2, R5, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5462) {
  var Arg5462_0 = Arg5462[0], Arg5462_1 = Arg5462[1], Arg5462_2 = Arg5462[2], Arg5462_3 = Arg5462[3], Arg5462_4 = Arg5462[4], Arg5462_5 = Arg5462[5], Arg5462_6 = Arg5462[6], Arg5462_7 = Arg5462[7], Arg5462_8 = Arg5462[8], Arg5462_9 = Arg5462[9], Arg5462_10 = Arg5462[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5462_2, Arg5462_3, Arg5462_8, Arg5462_9, Arg5462_10]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg5436_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, R2, []], Arg5436_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R4, R3, R2, Arg5436_2, Arg5436_4, R5, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5464) {
  var Arg5464_0 = Arg5464[0], Arg5464_1 = Arg5464[1], Arg5464_2 = Arg5464[2], Arg5464_3 = Arg5464[3], Arg5464_4 = Arg5464[4], Arg5464_5 = Arg5464[5], Arg5464_6 = Arg5464[6], Arg5464_7 = Arg5464[7], Arg5464_8 = Arg5464[8], Arg5464_9 = Arg5464[9], Arg5464_10 = Arg5464[10], Arg5464_11 = Arg5464[11], Arg5464_12 = Arg5464[12], Arg5464_13 = Arg5464[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5464_2, Arg5464_3, Arg5464_4, Arg5464_7, Arg5464_5]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg5436_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [shen_type_symbol, "*"], Arg5436_3]),
  (R4 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R6 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R4, R3, R6, R5, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5466) {
  var Arg5466_0 = Arg5466[0], Arg5466_1 = Arg5466[1], Arg5466_2 = Arg5466[2], Arg5466_3 = Arg5466[3], Arg5466_4 = Arg5466[4], Arg5466_5 = Arg5466[5], Arg5466_6 = Arg5466[6], Arg5466_7 = Arg5466[7], Arg5466_8 = Arg5466[8], Arg5466_9 = Arg5466[9], Arg5466_10 = Arg5466[10], Arg5466_11 = Arg5466[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5466_2, Arg5466_3, Arg5466_9, Arg5466_5, Arg5466_10]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg5436_3]),
  (R6 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R4, R3, R6, R2, R5, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5468) {
  var Arg5468_0 = Arg5468[0], Arg5468_1 = Arg5468[1], Arg5468_2 = Arg5468[2], Arg5468_3 = Arg5468[3], Arg5468_4 = Arg5468[4], Arg5468_5 = Arg5468[5], Arg5468_6 = Arg5468[6], Arg5468_7 = Arg5468[7], Arg5468_8 = Arg5468[8], Arg5468_9 = Arg5468[9], Arg5468_10 = Arg5468[10], Arg5468_11 = Arg5468[11], Arg5468_12 = Arg5468[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5468_2, Arg5468_3, Arg5468_10, Arg5468_6, Arg5468_11]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5436_3]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R6, []], Arg5436_3]),
  (R6 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R4, R3, R6, Arg5436_2, Arg5436_4, R2, Arg5436_3, R5, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5470) {
  var Arg5470_0 = Arg5470[0], Arg5470_1 = Arg5470[1], Arg5470_2 = Arg5470[2], Arg5470_3 = Arg5470[3], Arg5470_4 = Arg5470[4], Arg5470_5 = Arg5470[5], Arg5470_6 = Arg5470[6], Arg5470_7 = Arg5470[7], Arg5470_8 = Arg5470[8], Arg5470_9 = Arg5470[9], Arg5470_10 = Arg5470[10], Arg5470_11 = Arg5470[11], Arg5470_12 = Arg5470[12], Arg5470_13 = Arg5470[13], Arg5470_14 = Arg5470[14], Arg5470_15 = Arg5470[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5470_2, Arg5470_3, Arg5470_4, Arg5470_7, Arg5470_5]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5436_3]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5436_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, R5, []]], Arg5436_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R4, R3, R5, Arg5436_2, Arg5436_4, R2, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5472) {
  var Arg5472_0 = Arg5472[0], Arg5472_1 = Arg5472[1], Arg5472_2 = Arg5472[2], Arg5472_3 = Arg5472[3], Arg5472_4 = Arg5472[4], Arg5472_5 = Arg5472[5], Arg5472_6 = Arg5472[6], Arg5472_7 = Arg5472[7], Arg5472_8 = Arg5472[8], Arg5472_9 = Arg5472[9], Arg5472_10 = Arg5472[10], Arg5472_11 = Arg5472[11], Arg5472_12 = Arg5472[12], Arg5472_13 = Arg5472[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5472_2, Arg5472_3, Arg5472_4, Arg5472_7, Arg5472_5]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5436_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg5436_3])),
  (R5 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R4, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, R5, []]]], Arg5436_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R4, R3, R5, Arg5436_2, Arg5436_4, R2, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5474) {
  var Arg5474_0 = Arg5474[0], Arg5474_1 = Arg5474[1], Arg5474_2 = Arg5474[2], Arg5474_3 = Arg5474[3], Arg5474_4 = Arg5474[4], Arg5474_5 = Arg5474[5], Arg5474_6 = Arg5474[6], Arg5474_7 = Arg5474[7], Arg5474_8 = Arg5474[8], Arg5474_9 = Arg5474[9], Arg5474_10 = Arg5474[10], Arg5474_11 = Arg5474[11], Arg5474_12 = Arg5474[12], Arg5474_13 = Arg5474[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5474_2, Arg5474_3, Arg5474_4, Arg5474_7, Arg5474_5]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5436_3]),
  R5)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5436_0, Arg5436_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@v"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5436_1, Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "vector"], R4)))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R4, shen_type_cons))
  ? ((R2 = R4[1]),
  (R4 = shenjs_call(shen_lazyderef, [R4[2], Arg5436_3])),
  ((shenjs_empty$question$(R4))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R3, R2, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5476) {
  var Arg5476_0 = Arg5476[0], Arg5476_1 = Arg5476[1], Arg5476_2 = Arg5476[2], Arg5476_3 = Arg5476[3], Arg5476_4 = Arg5476[4], Arg5476_5 = Arg5476[5], Arg5476_6 = Arg5476[6], Arg5476_7 = Arg5476[7], Arg5476_8 = Arg5476[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5476_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5476_2, []]], Arg5476_6, Arg5476_7, Arg5476_8]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [], Arg5436_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R3, R2, R4, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5478) {
  var Arg5478_0 = Arg5478[0], Arg5478_1 = Arg5478[1], Arg5478_2 = Arg5478[2], Arg5478_3 = Arg5478[3], Arg5478_4 = Arg5478[4], Arg5478_5 = Arg5478[5], Arg5478_6 = Arg5478[6], Arg5478_7 = Arg5478[7], Arg5478_8 = Arg5478[8], Arg5478_9 = Arg5478[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5478_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5478_2, []]], Arg5478_7, Arg5478_8, Arg5478_9]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg5436_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_bindv, [R4, [shen_type_cons, R2, []], Arg5436_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R3, R2, Arg5436_2, Arg5436_4, R4, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5480) {
  var Arg5480_0 = Arg5480[0], Arg5480_1 = Arg5480[1], Arg5480_2 = Arg5480[2], Arg5480_3 = Arg5480[3], Arg5480_4 = Arg5480[4], Arg5480_5 = Arg5480[5], Arg5480_6 = Arg5480[6], Arg5480_7 = Arg5480[7], Arg5480_8 = Arg5480[8], Arg5480_9 = Arg5480[9], Arg5480_10 = Arg5480[10], Arg5480_11 = Arg5480[11], Arg5480_12 = Arg5480[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5480_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5480_2, []]], Arg5480_3, Arg5480_6, Arg5480_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg5436_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [shen_type_symbol, "vector"], Arg5436_3]),
  (R3 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R3, R5, R4, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5482) {
  var Arg5482_0 = Arg5482[0], Arg5482_1 = Arg5482[1], Arg5482_2 = Arg5482[2], Arg5482_3 = Arg5482[3], Arg5482_4 = Arg5482[4], Arg5482_5 = Arg5482[5], Arg5482_6 = Arg5482[6], Arg5482_7 = Arg5482[7], Arg5482_8 = Arg5482[8], Arg5482_9 = Arg5482[9], Arg5482_10 = Arg5482[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5482_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5482_2, []]], Arg5482_8, Arg5482_4, Arg5482_9]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg5436_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R3, R5, R2, R4, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5484) {
  var Arg5484_0 = Arg5484[0], Arg5484_1 = Arg5484[1], Arg5484_2 = Arg5484[2], Arg5484_3 = Arg5484[3], Arg5484_4 = Arg5484[4], Arg5484_5 = Arg5484[5], Arg5484_6 = Arg5484[6], Arg5484_7 = Arg5484[7], Arg5484_8 = Arg5484[8], Arg5484_9 = Arg5484[9], Arg5484_10 = Arg5484[10], Arg5484_11 = Arg5484[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5484_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5484_2, []]], Arg5484_9, Arg5484_5, Arg5484_10]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5436_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R5, []], Arg5436_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R3, R5, Arg5436_2, Arg5436_4, R2, Arg5436_3, R4, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5486) {
  var Arg5486_0 = Arg5486[0], Arg5486_1 = Arg5486[1], Arg5486_2 = Arg5486[2], Arg5486_3 = Arg5486[3], Arg5486_4 = Arg5486[4], Arg5486_5 = Arg5486[5], Arg5486_6 = Arg5486[6], Arg5486_7 = Arg5486[7], Arg5486_8 = Arg5486[8], Arg5486_9 = Arg5486[9], Arg5486_10 = Arg5486[10], Arg5486_11 = Arg5486[11], Arg5486_12 = Arg5486[12], Arg5486_13 = Arg5486[13], Arg5486_14 = Arg5486[14];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5486_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5486_2, []]], Arg5486_3, Arg5486_6, Arg5486_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5436_3]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R4, Arg5436_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, R4, []]], Arg5436_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R3, R4, Arg5436_2, Arg5436_4, R2, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5488) {
  var Arg5488_0 = Arg5488[0], Arg5488_1 = Arg5488[1], Arg5488_2 = Arg5488[2], Arg5488_3 = Arg5488[3], Arg5488_4 = Arg5488[4], Arg5488_5 = Arg5488[5], Arg5488_6 = Arg5488[6], Arg5488_7 = Arg5488[7], Arg5488_8 = Arg5488[8], Arg5488_9 = Arg5488[9], Arg5488_10 = Arg5488[10], Arg5488_11 = Arg5488[11], Arg5488_12 = Arg5488[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5488_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5488_2, []]], Arg5488_3, Arg5488_6, Arg5488_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5436_3]),
  R4)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5436_0, Arg5436_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5436_1, Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "string"], R2)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, [shen_type_symbol, "string"], Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5490) {
  var Arg5490_0 = Arg5490[0], Arg5490_1 = Arg5490[1], Arg5490_2 = Arg5490[2], Arg5490_3 = Arg5490[3], Arg5490_4 = Arg5490[4], Arg5490_5 = Arg5490[5], Arg5490_6 = Arg5490[6], Arg5490_7 = Arg5490[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5490_1, [shen_type_symbol, "string"], Arg5490_5, Arg5490_6, Arg5490_7]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [shen_type_symbol, "string"], Arg5436_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, [shen_type_symbol, "string"], Arg5436_2, Arg5436_3, (new Shenjs_freeze([R1, R3, R2, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5492) {
  var Arg5492_0 = Arg5492[0], Arg5492_1 = Arg5492[1], Arg5492_2 = Arg5492[2], Arg5492_3 = Arg5492[3], Arg5492_4 = Arg5492[4], Arg5492_5 = Arg5492[5], Arg5492_6 = Arg5492[6], Arg5492_7 = Arg5492[7], Arg5492_8 = Arg5492[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5492_1, [shen_type_symbol, "string"], Arg5492_6, Arg5492_7, Arg5492_8]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5436_3]),
  R3)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5436_0, Arg5436_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "lambda"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5436_1, Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R2[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-->"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R2 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg5436_3])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5436_3])),
  (R6 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5436_3, (new Shenjs_freeze([R0, R1, R3, R5, R2, R6, R4, Arg5436_2, Arg5436_3, Arg5436_4, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5494) {
  var Arg5494_0 = Arg5494[0], Arg5494_1 = Arg5494[1], Arg5494_2 = Arg5494[2], Arg5494_3 = Arg5494[3], Arg5494_4 = Arg5494[4], Arg5494_5 = Arg5494[5], Arg5494_6 = Arg5494[6], Arg5494_7 = Arg5494[7], Arg5494_8 = Arg5494[8], Arg5494_9 = Arg5494[9], Arg5494_10 = Arg5494[10], Arg5494_11 = Arg5494[11], Arg5494_12 = Arg5494[12], Arg5494_13 = Arg5494[13], Arg5494_14 = Arg5494[14], Arg5494_15 = Arg5494[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5494_5, shenjs_call(shen_placeholder, []), Arg5494_8, (new Shenjs_freeze([Arg5494_1, Arg5494_2, Arg5494_3, Arg5494_4, Arg5494_5, Arg5494_6, Arg5494_7, Arg5494_8, Arg5494_9], function(Arg5496) {
  var Arg5496_0 = Arg5496[0], Arg5496_1 = Arg5496[1], Arg5496_2 = Arg5496[2], Arg5496_3 = Arg5496[3], Arg5496_4 = Arg5496[4], Arg5496_5 = Arg5496[5], Arg5496_6 = Arg5496[6], Arg5496_7 = Arg5496[7], Arg5496_8 = Arg5496[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5496_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5496_4, Arg5496_7]), shenjs_call(shen_lazyderef, [Arg5496_0, Arg5496_7]), shenjs_call(shen_lazyderef, [Arg5496_1, Arg5496_7])]), Arg5496_7, (new Shenjs_freeze([Arg5496_0, Arg5496_1, Arg5496_2, Arg5496_3, Arg5496_4, Arg5496_5, Arg5496_6, Arg5496_7, Arg5496_8], function(Arg5498) {
  var Arg5498_0 = Arg5498[0], Arg5498_1 = Arg5498[1], Arg5498_2 = Arg5498[2], Arg5498_3 = Arg5498[3], Arg5498_4 = Arg5498[4], Arg5498_5 = Arg5498[5], Arg5498_6 = Arg5498[6], Arg5498_7 = Arg5498[7], Arg5498_8 = Arg5498[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5498_2, Arg5498_3, [shen_type_cons, [shen_type_cons, Arg5498_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5498_5, []]]], Arg5498_6], Arg5498_7, Arg5498_8]);});})}))]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg5436_3]),
  (R4 = ((R6 = shenjs_call(shen_newpv, [Arg5436_3])),
  (R7 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5436_3, (new Shenjs_freeze([R0, R1, R3, R6, R2, R7, R4, Arg5436_2, Arg5436_3, Arg5436_4, R5, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5500) {
  var Arg5500_0 = Arg5500[0], Arg5500_1 = Arg5500[1], Arg5500_2 = Arg5500[2], Arg5500_3 = Arg5500[3], Arg5500_4 = Arg5500[4], Arg5500_5 = Arg5500[5], Arg5500_6 = Arg5500[6], Arg5500_7 = Arg5500[7], Arg5500_8 = Arg5500[8], Arg5500_9 = Arg5500[9], Arg5500_10 = Arg5500[10], Arg5500_11 = Arg5500[11], Arg5500_12 = Arg5500[12], Arg5500_13 = Arg5500[13], Arg5500_14 = Arg5500[14], Arg5500_15 = Arg5500[15], Arg5500_16 = Arg5500[16], Arg5500_17 = Arg5500[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5500_5, shenjs_call(shen_placeholder, []), Arg5500_8, (new Shenjs_freeze([Arg5500_1, Arg5500_2, Arg5500_3, Arg5500_4, Arg5500_5, Arg5500_6, Arg5500_7, Arg5500_8, Arg5500_9], function(Arg5502) {
  var Arg5502_0 = Arg5502[0], Arg5502_1 = Arg5502[1], Arg5502_2 = Arg5502[2], Arg5502_3 = Arg5502[3], Arg5502_4 = Arg5502[4], Arg5502_5 = Arg5502[5], Arg5502_6 = Arg5502[6], Arg5502_7 = Arg5502[7], Arg5502_8 = Arg5502[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5502_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5502_4, Arg5502_7]), shenjs_call(shen_lazyderef, [Arg5502_0, Arg5502_7]), shenjs_call(shen_lazyderef, [Arg5502_1, Arg5502_7])]), Arg5502_7, (new Shenjs_freeze([Arg5502_0, Arg5502_1, Arg5502_2, Arg5502_3, Arg5502_4, Arg5502_5, Arg5502_6, Arg5502_7, Arg5502_8], function(Arg5504) {
  var Arg5504_0 = Arg5504[0], Arg5504_1 = Arg5504[1], Arg5504_2 = Arg5504[2], Arg5504_3 = Arg5504[3], Arg5504_4 = Arg5504[4], Arg5504_5 = Arg5504[5], Arg5504_6 = Arg5504[6], Arg5504_7 = Arg5504[7], Arg5504_8 = Arg5504[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5504_2, Arg5504_3, [shen_type_cons, [shen_type_cons, Arg5504_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5504_5, []]]], Arg5504_6], Arg5504_7, Arg5504_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg5436_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, R2, []], Arg5436_3]),
  (R4 = ((R6 = shenjs_call(shen_newpv, [Arg5436_3])),
  (R7 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5436_3, (new Shenjs_freeze([R0, R1, R3, R6, R2, R7, R4, Arg5436_2, Arg5436_3, Arg5436_4, R5, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5506) {
  var Arg5506_0 = Arg5506[0], Arg5506_1 = Arg5506[1], Arg5506_2 = Arg5506[2], Arg5506_3 = Arg5506[3], Arg5506_4 = Arg5506[4], Arg5506_5 = Arg5506[5], Arg5506_6 = Arg5506[6], Arg5506_7 = Arg5506[7], Arg5506_8 = Arg5506[8], Arg5506_9 = Arg5506[9], Arg5506_10 = Arg5506[10], Arg5506_11 = Arg5506[11], Arg5506_12 = Arg5506[12], Arg5506_13 = Arg5506[13], Arg5506_14 = Arg5506[14], Arg5506_15 = Arg5506[15], Arg5506_16 = Arg5506[16], Arg5506_17 = Arg5506[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5506_5, shenjs_call(shen_placeholder, []), Arg5506_8, (new Shenjs_freeze([Arg5506_1, Arg5506_2, Arg5506_3, Arg5506_4, Arg5506_5, Arg5506_6, Arg5506_7, Arg5506_8, Arg5506_9], function(Arg5508) {
  var Arg5508_0 = Arg5508[0], Arg5508_1 = Arg5508[1], Arg5508_2 = Arg5508[2], Arg5508_3 = Arg5508[3], Arg5508_4 = Arg5508[4], Arg5508_5 = Arg5508[5], Arg5508_6 = Arg5508[6], Arg5508_7 = Arg5508[7], Arg5508_8 = Arg5508[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5508_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5508_4, Arg5508_7]), shenjs_call(shen_lazyderef, [Arg5508_0, Arg5508_7]), shenjs_call(shen_lazyderef, [Arg5508_1, Arg5508_7])]), Arg5508_7, (new Shenjs_freeze([Arg5508_0, Arg5508_1, Arg5508_2, Arg5508_3, Arg5508_4, Arg5508_5, Arg5508_6, Arg5508_7, Arg5508_8], function(Arg5510) {
  var Arg5510_0 = Arg5510[0], Arg5510_1 = Arg5510[1], Arg5510_2 = Arg5510[2], Arg5510_3 = Arg5510[3], Arg5510_4 = Arg5510[4], Arg5510_5 = Arg5510[5], Arg5510_6 = Arg5510[6], Arg5510_7 = Arg5510[7], Arg5510_8 = Arg5510[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5510_2, Arg5510_3, [shen_type_cons, [shen_type_cons, Arg5510_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5510_5, []]]], Arg5510_6], Arg5510_7, Arg5510_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg5436_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [shen_type_symbol, "-->"], Arg5436_3]),
  (R4 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R6 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5436_3])),
  (R7 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5436_3, (new Shenjs_freeze([R0, R1, R3, R2, R6, R7, R4, Arg5436_2, Arg5436_3, Arg5436_4, R5, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5512) {
  var Arg5512_0 = Arg5512[0], Arg5512_1 = Arg5512[1], Arg5512_2 = Arg5512[2], Arg5512_3 = Arg5512[3], Arg5512_4 = Arg5512[4], Arg5512_5 = Arg5512[5], Arg5512_6 = Arg5512[6], Arg5512_7 = Arg5512[7], Arg5512_8 = Arg5512[8], Arg5512_9 = Arg5512[9], Arg5512_10 = Arg5512[10], Arg5512_11 = Arg5512[11], Arg5512_12 = Arg5512[12], Arg5512_13 = Arg5512[13], Arg5512_14 = Arg5512[14], Arg5512_15 = Arg5512[15], Arg5512_16 = Arg5512[16], Arg5512_17 = Arg5512[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5512_5, shenjs_call(shen_placeholder, []), Arg5512_8, (new Shenjs_freeze([Arg5512_1, Arg5512_2, Arg5512_3, Arg5512_4, Arg5512_5, Arg5512_6, Arg5512_7, Arg5512_8, Arg5512_9], function(Arg5514) {
  var Arg5514_0 = Arg5514[0], Arg5514_1 = Arg5514[1], Arg5514_2 = Arg5514[2], Arg5514_3 = Arg5514[3], Arg5514_4 = Arg5514[4], Arg5514_5 = Arg5514[5], Arg5514_6 = Arg5514[6], Arg5514_7 = Arg5514[7], Arg5514_8 = Arg5514[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5514_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5514_4, Arg5514_7]), shenjs_call(shen_lazyderef, [Arg5514_0, Arg5514_7]), shenjs_call(shen_lazyderef, [Arg5514_1, Arg5514_7])]), Arg5514_7, (new Shenjs_freeze([Arg5514_0, Arg5514_1, Arg5514_2, Arg5514_3, Arg5514_4, Arg5514_5, Arg5514_6, Arg5514_7, Arg5514_8], function(Arg5516) {
  var Arg5516_0 = Arg5516[0], Arg5516_1 = Arg5516[1], Arg5516_2 = Arg5516[2], Arg5516_3 = Arg5516[3], Arg5516_4 = Arg5516[4], Arg5516_5 = Arg5516[5], Arg5516_6 = Arg5516[6], Arg5516_7 = Arg5516[7], Arg5516_8 = Arg5516[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5516_2, Arg5516_3, [shen_type_cons, [shen_type_cons, Arg5516_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5516_5, []]]], Arg5516_6], Arg5516_7, Arg5516_8]);});})}))]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg5436_3]),
  (R6 = ((R7 = shenjs_call(shen_newpv, [Arg5436_3])),
  (R8 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5436_3, (new Shenjs_freeze([R0, R1, R3, R7, R6, R8, R4, Arg5436_2, Arg5436_3, Arg5436_4, R2, Arg5436_3, R5, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5518) {
  var Arg5518_0 = Arg5518[0], Arg5518_1 = Arg5518[1], Arg5518_2 = Arg5518[2], Arg5518_3 = Arg5518[3], Arg5518_4 = Arg5518[4], Arg5518_5 = Arg5518[5], Arg5518_6 = Arg5518[6], Arg5518_7 = Arg5518[7], Arg5518_8 = Arg5518[8], Arg5518_9 = Arg5518[9], Arg5518_10 = Arg5518[10], Arg5518_11 = Arg5518[11], Arg5518_12 = Arg5518[12], Arg5518_13 = Arg5518[13], Arg5518_14 = Arg5518[14], Arg5518_15 = Arg5518[15], Arg5518_16 = Arg5518[16], Arg5518_17 = Arg5518[17], Arg5518_18 = Arg5518[18], Arg5518_19 = Arg5518[19];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5518_5, shenjs_call(shen_placeholder, []), Arg5518_8, (new Shenjs_freeze([Arg5518_1, Arg5518_2, Arg5518_3, Arg5518_4, Arg5518_5, Arg5518_6, Arg5518_7, Arg5518_8, Arg5518_9], function(Arg5520) {
  var Arg5520_0 = Arg5520[0], Arg5520_1 = Arg5520[1], Arg5520_2 = Arg5520[2], Arg5520_3 = Arg5520[3], Arg5520_4 = Arg5520[4], Arg5520_5 = Arg5520[5], Arg5520_6 = Arg5520[6], Arg5520_7 = Arg5520[7], Arg5520_8 = Arg5520[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5520_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5520_4, Arg5520_7]), shenjs_call(shen_lazyderef, [Arg5520_0, Arg5520_7]), shenjs_call(shen_lazyderef, [Arg5520_1, Arg5520_7])]), Arg5520_7, (new Shenjs_freeze([Arg5520_0, Arg5520_1, Arg5520_2, Arg5520_3, Arg5520_4, Arg5520_5, Arg5520_6, Arg5520_7, Arg5520_8], function(Arg5522) {
  var Arg5522_0 = Arg5522[0], Arg5522_1 = Arg5522[1], Arg5522_2 = Arg5522[2], Arg5522_3 = Arg5522[3], Arg5522_4 = Arg5522[4], Arg5522_5 = Arg5522[5], Arg5522_6 = Arg5522[6], Arg5522_7 = Arg5522[7], Arg5522_8 = Arg5522[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5522_2, Arg5522_3, [shen_type_cons, [shen_type_cons, Arg5522_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5522_5, []]]], Arg5522_6], Arg5522_7, Arg5522_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5436_3]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R6, []], Arg5436_3]),
  (R6 = ((R7 = shenjs_call(shen_newpv, [Arg5436_3])),
  (R8 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5436_3, (new Shenjs_freeze([R0, R1, R3, R7, R6, R8, R4, Arg5436_2, Arg5436_3, Arg5436_4, R2, Arg5436_3, R5, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5524) {
  var Arg5524_0 = Arg5524[0], Arg5524_1 = Arg5524[1], Arg5524_2 = Arg5524[2], Arg5524_3 = Arg5524[3], Arg5524_4 = Arg5524[4], Arg5524_5 = Arg5524[5], Arg5524_6 = Arg5524[6], Arg5524_7 = Arg5524[7], Arg5524_8 = Arg5524[8], Arg5524_9 = Arg5524[9], Arg5524_10 = Arg5524[10], Arg5524_11 = Arg5524[11], Arg5524_12 = Arg5524[12], Arg5524_13 = Arg5524[13], Arg5524_14 = Arg5524[14], Arg5524_15 = Arg5524[15], Arg5524_16 = Arg5524[16], Arg5524_17 = Arg5524[17], Arg5524_18 = Arg5524[18], Arg5524_19 = Arg5524[19];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5524_5, shenjs_call(shen_placeholder, []), Arg5524_8, (new Shenjs_freeze([Arg5524_1, Arg5524_2, Arg5524_3, Arg5524_4, Arg5524_5, Arg5524_6, Arg5524_7, Arg5524_8, Arg5524_9], function(Arg5526) {
  var Arg5526_0 = Arg5526[0], Arg5526_1 = Arg5526[1], Arg5526_2 = Arg5526[2], Arg5526_3 = Arg5526[3], Arg5526_4 = Arg5526[4], Arg5526_5 = Arg5526[5], Arg5526_6 = Arg5526[6], Arg5526_7 = Arg5526[7], Arg5526_8 = Arg5526[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5526_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5526_4, Arg5526_7]), shenjs_call(shen_lazyderef, [Arg5526_0, Arg5526_7]), shenjs_call(shen_lazyderef, [Arg5526_1, Arg5526_7])]), Arg5526_7, (new Shenjs_freeze([Arg5526_0, Arg5526_1, Arg5526_2, Arg5526_3, Arg5526_4, Arg5526_5, Arg5526_6, Arg5526_7, Arg5526_8], function(Arg5528) {
  var Arg5528_0 = Arg5528[0], Arg5528_1 = Arg5528[1], Arg5528_2 = Arg5528[2], Arg5528_3 = Arg5528[3], Arg5528_4 = Arg5528[4], Arg5528_5 = Arg5528[5], Arg5528_6 = Arg5528[6], Arg5528_7 = Arg5528[7], Arg5528_8 = Arg5528[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5528_2, Arg5528_3, [shen_type_cons, [shen_type_cons, Arg5528_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5528_5, []]]], Arg5528_6], Arg5528_7, Arg5528_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5436_3]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5436_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, R5, []]], Arg5436_3]),
  (R5 = ((R6 = shenjs_call(shen_newpv, [Arg5436_3])),
  (R7 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5436_3, (new Shenjs_freeze([R0, R1, R3, R6, R5, R7, R4, Arg5436_2, Arg5436_3, Arg5436_4, R2, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5530) {
  var Arg5530_0 = Arg5530[0], Arg5530_1 = Arg5530[1], Arg5530_2 = Arg5530[2], Arg5530_3 = Arg5530[3], Arg5530_4 = Arg5530[4], Arg5530_5 = Arg5530[5], Arg5530_6 = Arg5530[6], Arg5530_7 = Arg5530[7], Arg5530_8 = Arg5530[8], Arg5530_9 = Arg5530[9], Arg5530_10 = Arg5530[10], Arg5530_11 = Arg5530[11], Arg5530_12 = Arg5530[12], Arg5530_13 = Arg5530[13], Arg5530_14 = Arg5530[14], Arg5530_15 = Arg5530[15], Arg5530_16 = Arg5530[16], Arg5530_17 = Arg5530[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5530_5, shenjs_call(shen_placeholder, []), Arg5530_8, (new Shenjs_freeze([Arg5530_1, Arg5530_2, Arg5530_3, Arg5530_4, Arg5530_5, Arg5530_6, Arg5530_7, Arg5530_8, Arg5530_9], function(Arg5532) {
  var Arg5532_0 = Arg5532[0], Arg5532_1 = Arg5532[1], Arg5532_2 = Arg5532[2], Arg5532_3 = Arg5532[3], Arg5532_4 = Arg5532[4], Arg5532_5 = Arg5532[5], Arg5532_6 = Arg5532[6], Arg5532_7 = Arg5532[7], Arg5532_8 = Arg5532[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5532_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5532_4, Arg5532_7]), shenjs_call(shen_lazyderef, [Arg5532_0, Arg5532_7]), shenjs_call(shen_lazyderef, [Arg5532_1, Arg5532_7])]), Arg5532_7, (new Shenjs_freeze([Arg5532_0, Arg5532_1, Arg5532_2, Arg5532_3, Arg5532_4, Arg5532_5, Arg5532_6, Arg5532_7, Arg5532_8], function(Arg5534) {
  var Arg5534_0 = Arg5534[0], Arg5534_1 = Arg5534[1], Arg5534_2 = Arg5534[2], Arg5534_3 = Arg5534[3], Arg5534_4 = Arg5534[4], Arg5534_5 = Arg5534[5], Arg5534_6 = Arg5534[6], Arg5534_7 = Arg5534[7], Arg5534_8 = Arg5534[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5534_2, Arg5534_3, [shen_type_cons, [shen_type_cons, Arg5534_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5534_5, []]]], Arg5534_6], Arg5534_7, Arg5534_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5436_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg5436_3])),
  (R5 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R4, [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, R5, []]]], Arg5436_3]),
  (R5 = ((R6 = shenjs_call(shen_newpv, [Arg5436_3])),
  (R7 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5436_3, (new Shenjs_freeze([R0, R1, R3, R6, R5, R7, R4, Arg5436_2, Arg5436_3, Arg5436_4, R2, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5536) {
  var Arg5536_0 = Arg5536[0], Arg5536_1 = Arg5536[1], Arg5536_2 = Arg5536[2], Arg5536_3 = Arg5536[3], Arg5536_4 = Arg5536[4], Arg5536_5 = Arg5536[5], Arg5536_6 = Arg5536[6], Arg5536_7 = Arg5536[7], Arg5536_8 = Arg5536[8], Arg5536_9 = Arg5536[9], Arg5536_10 = Arg5536[10], Arg5536_11 = Arg5536[11], Arg5536_12 = Arg5536[12], Arg5536_13 = Arg5536[13], Arg5536_14 = Arg5536[14], Arg5536_15 = Arg5536[15], Arg5536_16 = Arg5536[16], Arg5536_17 = Arg5536[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5536_5, shenjs_call(shen_placeholder, []), Arg5536_8, (new Shenjs_freeze([Arg5536_1, Arg5536_2, Arg5536_3, Arg5536_4, Arg5536_5, Arg5536_6, Arg5536_7, Arg5536_8, Arg5536_9], function(Arg5538) {
  var Arg5538_0 = Arg5538[0], Arg5538_1 = Arg5538[1], Arg5538_2 = Arg5538[2], Arg5538_3 = Arg5538[3], Arg5538_4 = Arg5538[4], Arg5538_5 = Arg5538[5], Arg5538_6 = Arg5538[6], Arg5538_7 = Arg5538[7], Arg5538_8 = Arg5538[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5538_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5538_4, Arg5538_7]), shenjs_call(shen_lazyderef, [Arg5538_0, Arg5538_7]), shenjs_call(shen_lazyderef, [Arg5538_1, Arg5538_7])]), Arg5538_7, (new Shenjs_freeze([Arg5538_0, Arg5538_1, Arg5538_2, Arg5538_3, Arg5538_4, Arg5538_5, Arg5538_6, Arg5538_7, Arg5538_8], function(Arg5540) {
  var Arg5540_0 = Arg5540[0], Arg5540_1 = Arg5540[1], Arg5540_2 = Arg5540[2], Arg5540_3 = Arg5540[3], Arg5540_4 = Arg5540[4], Arg5540_5 = Arg5540[5], Arg5540_6 = Arg5540[6], Arg5540_7 = Arg5540[7], Arg5540_8 = Arg5540[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5540_2, Arg5540_3, [shen_type_cons, [shen_type_cons, Arg5540_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5540_5, []]]], Arg5540_6], Arg5540_7, Arg5540_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5436_3]),
  R5)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5436_0, Arg5436_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5436_3])),
  (R5 = shenjs_call(shen_newpv, [Arg5436_3])),
  (R6 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5436_3, (new Shenjs_freeze([R0, R3, R1, R4, R2, Arg5436_1, R5, R6, Arg5436_2, Arg5436_3, Arg5436_4, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5542) {
  var Arg5542_0 = Arg5542[0], Arg5542_1 = Arg5542[1], Arg5542_2 = Arg5542[2], Arg5542_3 = Arg5542[3], Arg5542_4 = Arg5542[4], Arg5542_5 = Arg5542[5], Arg5542_6 = Arg5542[6], Arg5542_7 = Arg5542[7], Arg5542_8 = Arg5542[8], Arg5542_9 = Arg5542[9], Arg5542_10 = Arg5542[10], Arg5542_11 = Arg5542[11], Arg5542_12 = Arg5542[12], Arg5542_13 = Arg5542[13], Arg5542_14 = Arg5542[14], Arg5542_15 = Arg5542[15], Arg5542_16 = Arg5542[16];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5542_1, Arg5542_7, Arg5542_8, Arg5542_9, (new Shenjs_freeze([Arg5542_1, Arg5542_2, Arg5542_3, Arg5542_4, Arg5542_5, Arg5542_6, Arg5542_7, Arg5542_8, Arg5542_9, Arg5542_10], function(Arg5544) {
  var Arg5544_0 = Arg5544[0], Arg5544_1 = Arg5544[1], Arg5544_2 = Arg5544[2], Arg5544_3 = Arg5544[3], Arg5544_4 = Arg5544[4], Arg5544_5 = Arg5544[5], Arg5544_6 = Arg5544[6], Arg5544_7 = Arg5544[7], Arg5544_8 = Arg5544[8], Arg5544_9 = Arg5544[9];
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
  return shenjs_call_tail(shen_th$asterisk$, [Arg5548_2, Arg5548_3, [shen_type_cons, [shen_type_cons, Arg5548_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5548_5, []]]], Arg5548_6], Arg5548_7, Arg5548_8]);});})}))]);});})}))]);});})}))]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5436_0, Arg5436_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "open"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R2[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "file"], R1)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5436_1, Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "stream"], R4)))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R4, shen_type_cons))
  ? ((R2 = R4[1]),
  (R4 = shenjs_call(shen_lazyderef, [R4[2], Arg5436_3])),
  ((shenjs_empty$question$(R4))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R2, R3, Arg5436_3, (new Shenjs_freeze([R2, R3, R1, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5550) {
  var Arg5550_0 = Arg5550[0], Arg5550_1 = Arg5550[1], Arg5550_2 = Arg5550[2], Arg5550_3 = Arg5550[3], Arg5550_4 = Arg5550[4], Arg5550_5 = Arg5550[5], Arg5550_6 = Arg5550[6], Arg5550_7 = Arg5550[7], Arg5550_8 = Arg5550[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5550_3, Arg5550_7, (new Shenjs_freeze([Arg5550_3, Arg5550_2, Arg5550_6, Arg5550_7, Arg5550_8], function(Arg5552) {
  var Arg5552_0 = Arg5552[0], Arg5552_1 = Arg5552[1], Arg5552_2 = Arg5552[2], Arg5552_3 = Arg5552[3], Arg5552_4 = Arg5552[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5552_1, [shen_type_symbol, "string"], Arg5552_2, Arg5552_3, Arg5552_4]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [], Arg5436_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R2, R3, Arg5436_3, (new Shenjs_freeze([R2, R3, R1, R4, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5554) {
  var Arg5554_0 = Arg5554[0], Arg5554_1 = Arg5554[1], Arg5554_2 = Arg5554[2], Arg5554_3 = Arg5554[3], Arg5554_4 = Arg5554[4], Arg5554_5 = Arg5554[5], Arg5554_6 = Arg5554[6], Arg5554_7 = Arg5554[7], Arg5554_8 = Arg5554[8], Arg5554_9 = Arg5554[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5554_4, Arg5554_8, (new Shenjs_freeze([Arg5554_4, Arg5554_2, Arg5554_7, Arg5554_8, Arg5554_9], function(Arg5556) {
  var Arg5556_0 = Arg5556[0], Arg5556_1 = Arg5556[1], Arg5556_2 = Arg5556[2], Arg5556_3 = Arg5556[3], Arg5556_4 = Arg5556[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5556_1, [shen_type_symbol, "string"], Arg5556_2, Arg5556_3, Arg5556_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg5436_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_bindv, [R4, [shen_type_cons, R2, []], Arg5436_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R2, R3, Arg5436_3, (new Shenjs_freeze([R2, R3, R0, R1, Arg5436_2, Arg5436_4, R4, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5558) {
  var Arg5558_0 = Arg5558[0], Arg5558_1 = Arg5558[1], Arg5558_2 = Arg5558[2], Arg5558_3 = Arg5558[3], Arg5558_4 = Arg5558[4], Arg5558_5 = Arg5558[5], Arg5558_6 = Arg5558[6], Arg5558_7 = Arg5558[7], Arg5558_8 = Arg5558[8], Arg5558_9 = Arg5558[9], Arg5558_10 = Arg5558[10], Arg5558_11 = Arg5558[11], Arg5558_12 = Arg5558[12], Arg5558_13 = Arg5558[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5558_2, Arg5558_7, (new Shenjs_freeze([Arg5558_2, Arg5558_3, Arg5558_4, Arg5558_7, Arg5558_5], function(Arg5560) {
  var Arg5560_0 = Arg5560[0], Arg5560_1 = Arg5560[1], Arg5560_2 = Arg5560[2], Arg5560_3 = Arg5560[3], Arg5560_4 = Arg5560[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5560_1, [shen_type_symbol, "string"], Arg5560_2, Arg5560_3, Arg5560_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg5436_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [shen_type_symbol, "stream"], Arg5436_3]),
  (R3 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R5, R3, Arg5436_3, (new Shenjs_freeze([R5, R3, R1, R4, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5562) {
  var Arg5562_0 = Arg5562[0], Arg5562_1 = Arg5562[1], Arg5562_2 = Arg5562[2], Arg5562_3 = Arg5562[3], Arg5562_4 = Arg5562[4], Arg5562_5 = Arg5562[5], Arg5562_6 = Arg5562[6], Arg5562_7 = Arg5562[7], Arg5562_8 = Arg5562[8], Arg5562_9 = Arg5562[9], Arg5562_10 = Arg5562[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5562_5, Arg5562_4, (new Shenjs_freeze([Arg5562_5, Arg5562_2, Arg5562_8, Arg5562_4, Arg5562_9], function(Arg5564) {
  var Arg5564_0 = Arg5564[0], Arg5564_1 = Arg5564[1], Arg5564_2 = Arg5564[2], Arg5564_3 = Arg5564[3], Arg5564_4 = Arg5564[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5564_1, [shen_type_symbol, "string"], Arg5564_2, Arg5564_3, Arg5564_4]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg5436_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R5, R3, Arg5436_3, (new Shenjs_freeze([R5, R3, R1, R2, R4, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5566) {
  var Arg5566_0 = Arg5566[0], Arg5566_1 = Arg5566[1], Arg5566_2 = Arg5566[2], Arg5566_3 = Arg5566[3], Arg5566_4 = Arg5566[4], Arg5566_5 = Arg5566[5], Arg5566_6 = Arg5566[6], Arg5566_7 = Arg5566[7], Arg5566_8 = Arg5566[8], Arg5566_9 = Arg5566[9], Arg5566_10 = Arg5566[10], Arg5566_11 = Arg5566[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5566_6, Arg5566_5, (new Shenjs_freeze([Arg5566_6, Arg5566_2, Arg5566_9, Arg5566_5, Arg5566_10], function(Arg5568) {
  var Arg5568_0 = Arg5568[0], Arg5568_1 = Arg5568[1], Arg5568_2 = Arg5568[2], Arg5568_3 = Arg5568[3], Arg5568_4 = Arg5568[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5568_1, [shen_type_symbol, "string"], Arg5568_2, Arg5568_3, Arg5568_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5436_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R5, []], Arg5436_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R5, R3, Arg5436_3, (new Shenjs_freeze([R5, R3, R0, R1, Arg5436_2, Arg5436_4, R2, Arg5436_3, R4, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5570) {
  var Arg5570_0 = Arg5570[0], Arg5570_1 = Arg5570[1], Arg5570_2 = Arg5570[2], Arg5570_3 = Arg5570[3], Arg5570_4 = Arg5570[4], Arg5570_5 = Arg5570[5], Arg5570_6 = Arg5570[6], Arg5570_7 = Arg5570[7], Arg5570_8 = Arg5570[8], Arg5570_9 = Arg5570[9], Arg5570_10 = Arg5570[10], Arg5570_11 = Arg5570[11], Arg5570_12 = Arg5570[12], Arg5570_13 = Arg5570[13], Arg5570_14 = Arg5570[14], Arg5570_15 = Arg5570[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5570_2, Arg5570_7, (new Shenjs_freeze([Arg5570_2, Arg5570_3, Arg5570_4, Arg5570_7, Arg5570_5], function(Arg5572) {
  var Arg5572_0 = Arg5572[0], Arg5572_1 = Arg5572[1], Arg5572_2 = Arg5572[2], Arg5572_3 = Arg5572[3], Arg5572_4 = Arg5572[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5572_1, [shen_type_symbol, "string"], Arg5572_2, Arg5572_3, Arg5572_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5436_3]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R4, Arg5436_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "stream"], [shen_type_cons, R4, []]], Arg5436_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R4, R3, Arg5436_3, (new Shenjs_freeze([R4, R3, R0, R1, Arg5436_2, Arg5436_4, R2, Arg5436_3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5574) {
  var Arg5574_0 = Arg5574[0], Arg5574_1 = Arg5574[1], Arg5574_2 = Arg5574[2], Arg5574_3 = Arg5574[3], Arg5574_4 = Arg5574[4], Arg5574_5 = Arg5574[5], Arg5574_6 = Arg5574[6], Arg5574_7 = Arg5574[7], Arg5574_8 = Arg5574[8], Arg5574_9 = Arg5574[9], Arg5574_10 = Arg5574[10], Arg5574_11 = Arg5574[11], Arg5574_12 = Arg5574[12], Arg5574_13 = Arg5574[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5574_2, Arg5574_7, (new Shenjs_freeze([Arg5574_2, Arg5574_3, Arg5574_4, Arg5574_7, Arg5574_5], function(Arg5576) {
  var Arg5576_0 = Arg5576[0], Arg5576_1 = Arg5576[1], Arg5576_2 = Arg5576[2], Arg5576_3 = Arg5576[3], Arg5576_4 = Arg5576[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5576_1, [shen_type_symbol, "string"], Arg5576_2, Arg5576_3, Arg5576_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5436_3]),
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
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5436_0, Arg5436_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "type"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5436_3, (new Shenjs_freeze([R1, R3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5578) {
  var Arg5578_0 = Arg5578[0], Arg5578_1 = Arg5578[1], Arg5578_2 = Arg5578[2], Arg5578_3 = Arg5578[3], Arg5578_4 = Arg5578[4], Arg5578_5 = Arg5578[5], Arg5578_6 = Arg5578[6], Arg5578_7 = Arg5578[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify, [Arg5578_1, Arg5578_4, Arg5578_6, (new Shenjs_freeze([Arg5578_4, Arg5578_0, Arg5578_1, Arg5578_5, Arg5578_6, Arg5578_7], function(Arg5580) {
  var Arg5580_0 = Arg5580[0], Arg5580_1 = Arg5580[1], Arg5580_2 = Arg5580[2], Arg5580_3 = Arg5580[3], Arg5580_4 = Arg5580[4], Arg5580_5 = Arg5580[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5580_1, Arg5580_2, Arg5580_3, Arg5580_4, Arg5580_5]);});})}))]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5436_0, Arg5436_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "input+"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R2[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [R2, shenjs_call(shen_normalise_type, [shenjs_call(shen_lazyderef, [R1, Arg5436_3])]), Arg5436_3, (new Shenjs_freeze([R1, Arg5436_1, R2, Arg5436_3, Arg5436_4, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5582) {
  var Arg5582_0 = Arg5582[0], Arg5582_1 = Arg5582[1], Arg5582_2 = Arg5582[2], Arg5582_3 = Arg5582[3], Arg5582_4 = Arg5582[4], Arg5582_5 = Arg5582[5], Arg5582_6 = Arg5582[6], Arg5582_7 = Arg5582[7], Arg5582_8 = Arg5582[8], Arg5582_9 = Arg5582[9], Arg5582_10 = Arg5582[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify, [Arg5582_1, Arg5582_2, Arg5582_3, Arg5582_4]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5436_0, Arg5436_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "where"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5436_3, (new Shenjs_freeze([R3, R1, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5584) {
  var Arg5584_0 = Arg5584[0], Arg5584_1 = Arg5584[1], Arg5584_2 = Arg5584[2], Arg5584_3 = Arg5584[3], Arg5584_4 = Arg5584[4], Arg5584_5 = Arg5584[5], Arg5584_6 = Arg5584[6], Arg5584_7 = Arg5584[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5584_1, [shen_type_symbol, "boolean"], Arg5584_5, Arg5584_6, (new Shenjs_freeze([Arg5584_2, Arg5584_0, Arg5584_4, Arg5584_1, Arg5584_5, Arg5584_6, Arg5584_7], function(Arg5586) {
  var Arg5586_0 = Arg5586[0], Arg5586_1 = Arg5586[1], Arg5586_2 = Arg5586[2], Arg5586_3 = Arg5586[3], Arg5586_4 = Arg5586[4], Arg5586_5 = Arg5586[5], Arg5586_6 = Arg5586[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5586_0, Arg5586_5, (new Shenjs_freeze([Arg5586_0, Arg5586_1, Arg5586_2, Arg5586_3, Arg5586_4, Arg5586_5, Arg5586_6], function(Arg5588) {
  var Arg5588_0 = Arg5588[0], Arg5588_1 = Arg5588[1], Arg5588_2 = Arg5588[2], Arg5588_3 = Arg5588[3], Arg5588_4 = Arg5588[4], Arg5588_5 = Arg5588[5], Arg5588_6 = Arg5588[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5588_1, Arg5588_2, [shen_type_cons, [shen_type_cons, Arg5588_3, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "verified"], []]]], Arg5588_4], Arg5588_5, Arg5588_6]);});})}))]);});})}))]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5436_0, Arg5436_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "set"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5436_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5436_3, (new Shenjs_freeze([R1, R3, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5590) {
  var Arg5590_0 = Arg5590[0], Arg5590_1 = Arg5590[1], Arg5590_2 = Arg5590[2], Arg5590_3 = Arg5590[3], Arg5590_4 = Arg5590[4], Arg5590_5 = Arg5590[5], Arg5590_6 = Arg5590[6], Arg5590_7 = Arg5590[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [[shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, Arg5590_0, []]], Arg5590_4, Arg5590_5, Arg5590_6, (new Shenjs_freeze([Arg5590_0, Arg5590_1, Arg5590_4, Arg5590_5, Arg5590_6, Arg5590_7], function(Arg5592) {
  var Arg5592_0 = Arg5592[0], Arg5592_1 = Arg5592[1], Arg5592_2 = Arg5592[2], Arg5592_3 = Arg5592[3], Arg5592_4 = Arg5592[4], Arg5592_5 = Arg5592[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5592_1, Arg5592_2, Arg5592_3, Arg5592_4, Arg5592_5]);});})}))]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5436_0, Arg5436_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fail"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5436_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5436_1, Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R2)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5436_4)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [shen_type_symbol, "symbol"], Arg5436_3]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5436_4)))),
  shenjs_call(shen_unbindv, [R2, Arg5436_3]),
  R1)
  : false)))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_t$asterisk$_hyps, [Arg5436_2, R1, Arg5436_3, (new Shenjs_freeze([Arg5436_2, Arg5436_0, Arg5436_1, R1, Arg5436_3, Arg5436_4, R0, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5594) {
  var Arg5594_0 = Arg5594[0], Arg5594_1 = Arg5594[1], Arg5594_2 = Arg5594[2], Arg5594_3 = Arg5594[3], Arg5594_4 = Arg5594[4], Arg5594_5 = Arg5594[5], Arg5594_6 = Arg5594[6], Arg5594_7 = Arg5594[7], Arg5594_8 = Arg5594[8], Arg5594_9 = Arg5594[9], Arg5594_10 = Arg5594[10], Arg5594_11 = Arg5594[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5594_1, Arg5594_2, Arg5594_3, Arg5594_4, Arg5594_5]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5436_0, Arg5436_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "define"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5436_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = R2[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5436_3, (new Shenjs_freeze([R0, R1, R2, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4, Arg5436_0, Arg5436_1, Arg5436_2, Arg5436_3, Arg5436_4], function(Arg5596) {
  var Arg5596_0 = Arg5596[0], Arg5596_1 = Arg5596[1], Arg5596_2 = Arg5596[2], Arg5596_3 = Arg5596[3], Arg5596_4 = Arg5596[4], Arg5596_5 = Arg5596[5], Arg5596_6 = Arg5596[6], Arg5596_7 = Arg5596[7], Arg5596_8 = Arg5596[8], Arg5596_9 = Arg5596[9], Arg5596_10 = Arg5596[10], Arg5596_11 = Arg5596[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_def, [[shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg5596_1, Arg5596_2]], Arg5596_3, Arg5596_4, Arg5596_5, Arg5596_6]);});})}))]))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5436_0, Arg5436_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R1[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-process-datatype"], R1)))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg5436_1, Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R1)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5436_4)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [shen_type_symbol, "symbol"], Arg5436_3]),
  (R0 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5436_4)))),
  shenjs_call(shen_unbindv, [R1, Arg5436_3]),
  R0)
  : false)))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5436_0, Arg5436_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R1[1], Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-synonyms-help"], R1)))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg5436_1, Arg5436_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R1)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5436_4)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [shen_type_symbol, "symbol"], Arg5436_3]),
  (R0 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5436_4)))),
  shenjs_call(shen_unbindv, [R1, Arg5436_3]),
  R0)
  : false)))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5436_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [R1, (shenjs_globals["shen_shen-*datatypes*"]), Arg5436_3, (new Shenjs_freeze([Arg5436_0, Arg5436_1, Arg5436_2, R1, Arg5436_3, Arg5436_4], function(Arg5598) {
  var Arg5598_0 = Arg5598[0], Arg5598_1 = Arg5598[1], Arg5598_2 = Arg5598[2], Arg5598_3 = Arg5598[3], Arg5598_4 = Arg5598[4], Arg5598_5 = Arg5598[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_udefs$asterisk$, [[shen_type_cons, Arg5598_0, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5598_1, []]]], Arg5598_2, Arg5598_3, Arg5598_4, Arg5598_5]);});})}))]))
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
  function shen_user_lambda5601(Arg5600) {
  if (Arg5600.length < 4) return [shen_type_func, shen_user_lambda5601, 4, Arg5600];
  var Arg5600_0 = Arg5600[0], Arg5600_1 = Arg5600[1], Arg5600_2 = Arg5600[2], Arg5600_3 = Arg5600[3];
  var R0, R1, R2, R3, R4, R5, R6, R7;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5600_0, Arg5600_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg5600_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5600_2])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[1], Arg5600_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[2], Arg5600_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R2 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg5600_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5600_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5600_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R1[1], Arg5600_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "list"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R1[2], Arg5600_2])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R1 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg5600_2])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R5, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg5600_2]),
  (R4 = ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R5, Arg5600_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg5600_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5600_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5600_2])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, R1, []], Arg5600_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5600_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [shen_type_symbol, "list"], Arg5600_2]),
  (R4 = ((R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5600_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R6 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5600_2])),
  ((shenjs_empty$question$(R1))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R6 = ((R1 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R1, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg5600_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5600_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5600_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R6, []], Arg5600_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5600_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5600_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5600_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, R5, []]], Arg5600_2]),
  (R5 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R5 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5600_2]),
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
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5600_0, Arg5600_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg5600_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5600_2])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[1], Arg5600_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@p"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[2], Arg5600_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R2 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg5600_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5600_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5600_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R5 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5600_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R6 = shenjs_call(shen_lazyderef, [R1[1], Arg5600_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "*"], R6)))
  ? ((R6 = shenjs_call(shen_lazyderef, [R1[2], Arg5600_2])),
  ((shenjs_is_type(R6, shen_type_cons))
  ? ((R1 = R6[1]),
  (R6 = shenjs_call(shen_lazyderef, [R6[2], Arg5600_2])),
  ((shenjs_empty$question$(R6))
  ? ((R6 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R6))
  ? ((R6 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]]], shenjs_call(shen_lazyderef, [R6, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? (shenjs_call(shen_bindv, [R6, [], Arg5600_2]),
  (R5 = ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R6, Arg5600_2]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? (shenjs_call(shen_bindv, [R6, [], Arg5600_2]),
  (R5 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R5 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R6, Arg5600_2]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5600_2])),
  shenjs_call(shen_bindv, [R6, [shen_type_cons, R1, []], Arg5600_2]),
  (R5 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R5 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R6, Arg5600_2]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? (shenjs_call(shen_bindv, [R6, [shen_type_symbol, "*"], Arg5600_2]),
  (R5 = ((R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5600_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R7 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5600_2])),
  ((shenjs_empty$question$(R1))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg5600_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R7 = ((R1 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg5600_2]), []]]], shenjs_call(shen_lazyderef, [R1, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg5600_2]),
  (R7 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg5600_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R7 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg5600_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R7)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5600_2]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R7 = shenjs_call(shen_newpv, [Arg5600_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R7, []], Arg5600_2]),
  (R7 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg5600_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R7 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg5600_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R7)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5600_2]),
  R7)
  : false)))),
  shenjs_call(shen_unbindv, [R6, Arg5600_2]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5600_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, R6, []]], Arg5600_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5600_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5600_2])),
  (R6 = shenjs_call(shen_newpv, [Arg5600_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R5, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, R6, []]]], Arg5600_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5600_2]),
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
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5600_0, Arg5600_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg5600_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5600_2])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[1], Arg5600_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@v"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[2], Arg5600_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R2 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg5600_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5600_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5600_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R1[1], Arg5600_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "vector"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R1[2], Arg5600_2])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R1 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg5600_2])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R5, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg5600_2]),
  (R4 = ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R5, Arg5600_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg5600_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5600_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5600_2])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, R1, []], Arg5600_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5600_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [shen_type_symbol, "vector"], Arg5600_2]),
  (R4 = ((R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5600_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R6 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5600_2])),
  ((shenjs_empty$question$(R1))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R6 = ((R1 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R1, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg5600_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5600_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5600_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R6, []], Arg5600_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5600_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5600_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5600_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, R5, []]], Arg5600_2]),
  (R5 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R5 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5600_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5600_2]),
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
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5600_0, Arg5600_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg5600_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5600_2])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[1], Arg5600_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[2], Arg5600_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R2 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg5600_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5600_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5600_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "string"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R4 = ((R1 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], shenjs_call(shen_lazyderef, [R1, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [shen_type_symbol, "string"], Arg5600_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5600_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], shenjs_call(shen_lazyderef, [R3, Arg5600_2])]], Arg5600_2, Arg5600_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5600_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5600_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5600_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], shenjs_call(shen_lazyderef, [R0, Arg5600_2])]], Arg5600_2, Arg5600_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5600_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5600_2]),
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
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5600_0, Arg5600_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = R0[1]),
  (R0 = R0[2]),
  (R2 = shenjs_call(shen_newpv, [Arg5600_2])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [Arg5600_1, [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5600_2]), shenjs_call(shen_lazyderef, [R2, Arg5600_2])], Arg5600_2, (new Shenjs_freeze([Arg5600_1, R1, R0, R2, Arg5600_2, Arg5600_3], function(Arg5602) {
  var Arg5602_0 = Arg5602[0], Arg5602_1 = Arg5602[1], Arg5602_2 = Arg5602[2], Arg5602_3 = Arg5602[3], Arg5602_4 = Arg5602[4], Arg5602_5 = Arg5602[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_hyps, [Arg5602_2, Arg5602_3, Arg5602_4, Arg5602_5]);});})}))]);}))
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
  function shen_user_lambda5605(Arg5604) {
  if (Arg5604.length < 4) return [shen_type_func, shen_user_lambda5605, 4, Arg5604];
  var Arg5604_0 = Arg5604[0], Arg5604_1 = Arg5604[1], Arg5604_2 = Arg5604[2], Arg5604_3 = Arg5604[3];
  return (((shenjs_globals["shen_shen-*spy*"]))
  ? (shenjs_call(shen_line, []),
  shenjs_call(shen_show_p, [shenjs_call(shen_deref, [Arg5604_0, Arg5604_2])]),
  shenjs_call(shen_nl, [1]),
  shenjs_call(shen_nl, [1]),
  shenjs_call(shen_show_assumptions, [shenjs_call(shen_deref, [Arg5604_1, Arg5604_2]), 1]),
  shenjs_call(shen_intoutput, ["~%> ", []]),
  shenjs_call(shen_pause_for_user, [(shenjs_globals["shen_*language*"])]),
  shenjs_thaw(Arg5604_3))
  : shenjs_thaw(Arg5604_3))},
  4,
  [],
  "shen-show"];
shenjs_functions["shen_shen-show"] = shen_show;






shen_line = [shen_type_func,
  function shen_user_lambda5607(Arg5606) {
  if (Arg5606.length < 0) return [shen_type_func, shen_user_lambda5607, 0, Arg5606];
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
  function shen_user_lambda5609(Arg5608) {
  if (Arg5608.length < 1) return [shen_type_func, shen_user_lambda5609, 1, Arg5608];
  var Arg5608_0 = Arg5608[0];
  return (((shenjs_is_type(Arg5608_0, shen_type_cons) && (shenjs_is_type(Arg5608_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], Arg5608_0[2][1])) && (shenjs_is_type(Arg5608_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg5608_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_intoutput, ["~R : ~R", [shen_tuple, Arg5608_0[1], [shen_tuple, Arg5608_0[2][2][1], []]]]);})
  : (function() {
  return shenjs_call_tail(shen_intoutput, ["~R", [shen_tuple, Arg5608_0, []]]);}))},
  1,
  [],
  "shen-show-p"];
shenjs_functions["shen_shen-show-p"] = shen_show_p;






shen_show_assumptions = [shen_type_func,
  function shen_user_lambda5611(Arg5610) {
  if (Arg5610.length < 2) return [shen_type_func, shen_user_lambda5611, 2, Arg5610];
  var Arg5610_0 = Arg5610[0], Arg5610_1 = Arg5610[1];
  return ((shenjs_empty$question$(Arg5610_0))
  ? [shen_type_symbol, "shen-skip"]
  : ((shenjs_is_type(Arg5610_0, shen_type_cons))
  ? (shenjs_call(shen_intoutput, ["~A. ", [shen_tuple, Arg5610_1, []]]),
  shenjs_call(shen_show_p, [Arg5610_0[1]]),
  shenjs_call(shen_nl, [1]),
  (function() {
  return shenjs_call_tail(shen_show_assumptions, [Arg5610_0[2], (Arg5610_1 + 1)]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "shen-show-assumptions"]]);})))},
  2,
  [],
  "shen-show-assumptions"];
shenjs_functions["shen_shen-show-assumptions"] = shen_show_assumptions;






shen_pause_for_user = [shen_type_func,
  function shen_user_lambda5613(Arg5612) {
  if (Arg5612.length < 1) return [shen_type_func, shen_user_lambda5613, 1, Arg5612];
  var Arg5612_0 = Arg5612[0];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$("Common Lisp", Arg5612_0)))
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
  function shen_user_lambda5615(Arg5614) {
  if (Arg5614.length < 0) return [shen_type_func, shen_user_lambda5615, 0, Arg5614];
  return (function() {
  return shenjs_call_tail(shen_read_char_h, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), 0]);})},
  0,
  [],
  "shen-read-char"];
shenjs_functions["shen_shen-read-char"] = shen_read_char;






shen_read_char_h = [shen_type_func,
  function shen_user_lambda5617(Arg5616) {
  if (Arg5616.length < 2) return [shen_type_func, shen_user_lambda5617, 2, Arg5616];
  var Arg5616_0 = Arg5616[0], Arg5616_1 = Arg5616[1];
  return (((shenjs_unwind_tail(shenjs_$eq$(-1, Arg5616_0)) && shenjs_unwind_tail(shenjs_$eq$(0, Arg5616_1))))
  ? (function() {
  return shenjs_call_tail(shen_read_char_h, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), 1]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(0, Arg5616_1)))
  ? (function() {
  return shenjs_call_tail(shen_read_char_h, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), 0]);})
  : (((shenjs_unwind_tail(shenjs_$eq$(-1, Arg5616_0)) && shenjs_unwind_tail(shenjs_$eq$(1, Arg5616_1))))
  ? (function() {
  return shenjs_call_tail(shen_read_char_h, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), 1]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(1, Arg5616_1)))
  ? (function() {
  return shenjs_call_tail(shen_byte_$gt$string, [Arg5616_0]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "shen-read-char-h"]]);})))))},
  2,
  [],
  "shen-read-char-h"];
shenjs_functions["shen_shen-read-char-h"] = shen_read_char_h;






shen_typedf$question$ = [shen_type_func,
  function shen_user_lambda5619(Arg5618) {
  if (Arg5618.length < 1) return [shen_type_func, shen_user_lambda5619, 1, Arg5618];
  var Arg5618_0 = Arg5618[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5618_0, (shenjs_globals["shen_shen-*signedfuncs*"])]);})},
  1,
  [],
  "shen-typedf?"];
shenjs_functions["shen_shen-typedf?"] = shen_typedf$question$;






shen_sigf = [shen_type_func,
  function shen_user_lambda5621(Arg5620) {
  if (Arg5620.length < 1) return [shen_type_func, shen_user_lambda5621, 1, Arg5620];
  var Arg5620_0 = Arg5620[0];
  return (function() {
  return shenjs_call_tail(shen_concat, [[shen_type_symbol, "shen-type-signature-of-"], Arg5620_0]);})},
  1,
  [],
  "shen-sigf"];
shenjs_functions["shen_shen-sigf"] = shen_sigf;






shen_placeholder = [shen_type_func,
  function shen_user_lambda5623(Arg5622) {
  if (Arg5622.length < 0) return [shen_type_func, shen_user_lambda5623, 0, Arg5622];
  return (function() {
  return shenjs_call_tail(shen_gensym, [[shen_type_symbol, "&&"]]);})},
  0,
  [],
  "shen-placeholder"];
shenjs_functions["shen_shen-placeholder"] = shen_placeholder;






shen_base = [shen_type_func,
  function shen_user_lambda5625(Arg5624) {
  if (Arg5624.length < 4) return [shen_type_func, shen_user_lambda5625, 4, Arg5624];
  var Arg5624_0 = Arg5624[0], Arg5624_1 = Arg5624[1], Arg5624_2 = Arg5624[2], Arg5624_3 = Arg5624[3];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5624_1, Arg5624_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "number"], R0)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [(typeof(shenjs_call(shen_lazyderef, [Arg5624_0, Arg5624_2])) == 'number'), Arg5624_2, Arg5624_3]))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [shen_type_symbol, "number"], Arg5624_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [(typeof(shenjs_call(shen_lazyderef, [Arg5624_0, Arg5624_2])) == 'number'), Arg5624_2, Arg5624_3]))),
  shenjs_call(shen_unbindv, [R0, Arg5624_2]),
  R1)
  : false)))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5624_1, Arg5624_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "boolean"], R0)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_boolean$question$(shenjs_call(shen_lazyderef, [Arg5624_0, Arg5624_2])), Arg5624_2, Arg5624_3]))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [shen_type_symbol, "boolean"], Arg5624_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_boolean$question$(shenjs_call(shen_lazyderef, [Arg5624_0, Arg5624_2])), Arg5624_2, Arg5624_3]))),
  shenjs_call(shen_unbindv, [R0, Arg5624_2]),
  R1)
  : false)))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5624_1, Arg5624_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "string"], R0)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [(typeof(shenjs_call(shen_lazyderef, [Arg5624_0, Arg5624_2])) == 'string'), Arg5624_2, Arg5624_3]))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [shen_type_symbol, "string"], Arg5624_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [(typeof(shenjs_call(shen_lazyderef, [Arg5624_0, Arg5624_2])) == 'string'), Arg5624_2, Arg5624_3]))),
  shenjs_call(shen_unbindv, [R0, Arg5624_2]),
  R1)
  : false)))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5624_1, Arg5624_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R0)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_is_type(shenjs_call(shen_lazyderef, [Arg5624_0, Arg5624_2]), shen_type_symbol), Arg5624_2, (new Shenjs_freeze([Arg5624_0, Arg5624_1, Arg5624_3, Arg5624_2], function(Arg5626) {
  var Arg5626_0 = Arg5626[0], Arg5626_1 = Arg5626[1], Arg5626_2 = Arg5626[2], Arg5626_3 = Arg5626[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [(!shenjs_call(shen_placeholder$question$, [shenjs_call(shen_lazyderef, [Arg5626_0, Arg5626_3])])), Arg5626_3, Arg5626_2]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [shen_type_symbol, "symbol"], Arg5624_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_is_type(shenjs_call(shen_lazyderef, [Arg5624_0, Arg5624_2]), shen_type_symbol), Arg5624_2, (new Shenjs_freeze([R0, Arg5624_0, Arg5624_1, Arg5624_3, Arg5624_2], function(Arg5628) {
  var Arg5628_0 = Arg5628[0], Arg5628_1 = Arg5628[1], Arg5628_2 = Arg5628[2], Arg5628_3 = Arg5628[3], Arg5628_4 = Arg5628[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [(!shenjs_call(shen_placeholder$question$, [shenjs_call(shen_lazyderef, [Arg5628_1, Arg5628_4])])), Arg5628_4, Arg5628_3]);});})}))]))),
  shenjs_call(shen_unbindv, [R0, Arg5624_2]),
  R1)
  : false)))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5624_0, Arg5624_2])),
  ((shenjs_empty$question$(R0))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5624_1, Arg5624_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg5624_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "list"], R1)))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[2], Arg5624_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? (R1[1],
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5624_2])),
  ((shenjs_empty$question$(R1))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_thaw(Arg5624_3))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg5624_2]),
  (R0 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5624_3)))),
  shenjs_call(shen_unbindv, [R1, Arg5624_2]),
  R0)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R0 = shenjs_call(shen_newpv, [Arg5624_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R0, []], Arg5624_2]),
  (R0 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5624_3)))),
  shenjs_call(shen_unbindv, [R1, Arg5624_2]),
  R0)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [shen_type_symbol, "list"], Arg5624_2]),
  (R0 = ((R0 = shenjs_call(shen_lazyderef, [R0[2], Arg5624_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? (R0[1],
  (R0 = shenjs_call(shen_lazyderef, [R0[2], Arg5624_2])),
  ((shenjs_empty$question$(R0))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5624_3)))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [], Arg5624_2]),
  (R2 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5624_3)))),
  shenjs_call(shen_unbindv, [R0, Arg5624_2]),
  R2)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5624_2])),
  shenjs_call(shen_bindv, [R0, [shen_type_cons, R2, []], Arg5624_2]),
  (R2 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5624_3)))),
  shenjs_call(shen_unbindv, [R0, Arg5624_2]),
  R2)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5624_2]),
  R0)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5624_2])),
  shenjs_call(shen_bindv, [R0, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, R1, []]], Arg5624_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5624_3)))),
  shenjs_call(shen_unbindv, [R0, Arg5624_2]),
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
  function shen_user_lambda5631(Arg5630) {
  if (Arg5630.length < 1) return [shen_type_func, shen_user_lambda5631, 1, Arg5630];
  var Arg5630_0 = Arg5630[0];
  return (shenjs_is_type(Arg5630_0, shen_type_symbol) && shenjs_call(shen_placeholder_help$question$, [shenjs_str(Arg5630_0)]))},
  1,
  [],
  "shen-placeholder?"];
shenjs_functions["shen_shen-placeholder?"] = shen_placeholder$question$;






shen_placeholder_help$question$ = [shen_type_func,
  function shen_user_lambda5633(Arg5632) {
  if (Arg5632.length < 1) return [shen_type_func, shen_user_lambda5633, 1, Arg5632];
  var Arg5632_0 = Arg5632[0];
  return (((shenjs_call(shen_$plus$string$question$, [Arg5632_0]) && (shenjs_unwind_tail(shenjs_$eq$("&", Arg5632_0[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(Arg5632_0)]) && shenjs_unwind_tail(shenjs_$eq$("&", shenjs_tlstr(Arg5632_0)[0]))))))
  ? true
  : false)},
  1,
  [],
  "shen-placeholder-help?"];
shenjs_functions["shen_shen-placeholder-help?"] = shen_placeholder_help$question$;






shen_by$_hypothesis = [shen_type_func,
  function shen_user_lambda5635(Arg5634) {
  if (Arg5634.length < 5) return [shen_type_func, shen_user_lambda5635, 5, Arg5634];
  var Arg5634_0 = Arg5634[0], Arg5634_1 = Arg5634[1], Arg5634_2 = Arg5634[2], Arg5634_3 = Arg5634[3], Arg5634_4 = Arg5634[4];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5634_2, Arg5634_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R0 = shenjs_call(shen_lazyderef, [R0[1], Arg5634_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = R0[1]),
  (R0 = shenjs_call(shen_lazyderef, [R0[2], Arg5634_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R0[1], Arg5634_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R0[2], Arg5634_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R0 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5634_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_identical, [Arg5634_0, R1, Arg5634_3, (new Shenjs_freeze([R1, R0, Arg5634_2, Arg5634_0, Arg5634_1, Arg5634_3, Arg5634_4], function(Arg5636) {
  var Arg5636_0 = Arg5636[0], Arg5636_1 = Arg5636[1], Arg5636_2 = Arg5636[2], Arg5636_3 = Arg5636[3], Arg5636_4 = Arg5636[4], Arg5636_5 = Arg5636[5], Arg5636_6 = Arg5636[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5636_4, Arg5636_1, Arg5636_5, Arg5636_6]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5634_2, Arg5634_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_by$_hypothesis, [Arg5634_0, Arg5634_1, R0, Arg5634_3, Arg5634_4]);}))
  : false))
  : R0))},
  5,
  [],
  "shen-by_hypothesis"];
shenjs_functions["shen_shen-by_hypothesis"] = shen_by$_hypothesis;






shen_t$asterisk$_def = [shen_type_func,
  function shen_user_lambda5639(Arg5638) {
  if (Arg5638.length < 5) return [shen_type_func, shen_user_lambda5639, 5, Arg5638];
  var Arg5638_0 = Arg5638[0], Arg5638_1 = Arg5638[1], Arg5638_2 = Arg5638[2], Arg5638_3 = Arg5638[3], Arg5638_4 = Arg5638[4];
  var R0, R1, R2, R3, R4, R5, R6, R7, R8, R9;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = shenjs_call(shen_lazyderef, [Arg5638_0, Arg5638_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5638_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "define"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5638_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = R2[2]),
  (R3 = shenjs_call(shen_newpv, [Arg5638_3])),
  (R4 = shenjs_call(shen_newpv, [Arg5638_3])),
  (R5 = shenjs_call(shen_newpv, [Arg5638_3])),
  (R6 = shenjs_call(shen_newpv, [Arg5638_3])),
  (R7 = shenjs_call(shen_newpv, [Arg5638_3])),
  (R8 = shenjs_call(shen_newpv, [Arg5638_3])),
  (R9 = shenjs_call(shen_newpv, [Arg5638_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [R4, shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda5641(Arg5640) {
  if (Arg5640.length < 1) return [shen_type_func, shen_user_lambda5641, 1, Arg5640];
  var Arg5640_0 = Arg5640[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$sig$plus$rules$gt$, [Arg5640_0]);})},
  1,
  []], shenjs_call(shen_lazyderef, [R2, Arg5638_3]), []]), Arg5638_3, (new Shenjs_freeze([R2, R3, R4, R5, R0, R6, R7, Arg5638_2, R8, R1, Arg5638_1, R9, Arg5638_3, Arg5638_4], function(Arg5642) {
  var Arg5642_0 = Arg5642[0], Arg5642_1 = Arg5642[1], Arg5642_2 = Arg5642[2], Arg5642_3 = Arg5642[3], Arg5642_4 = Arg5642[4], Arg5642_5 = Arg5642[5], Arg5642_6 = Arg5642[6], Arg5642_7 = Arg5642[7], Arg5642_8 = Arg5642[8], Arg5642_9 = Arg5642[9], Arg5642_10 = Arg5642[10], Arg5642_11 = Arg5642[11], Arg5642_12 = Arg5642[12], Arg5642_13 = Arg5642[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5642_1, ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_lazyderef, [Arg5642_2, Arg5642_12]), shen_fail_obj)))
  ? shenjs_call(shen_errordef, [shenjs_call(shen_lazyderef, [Arg5642_9, Arg5642_12])])
  : [shen_type_symbol, "shen-skip"]), Arg5642_12, (new Shenjs_freeze([Arg5642_1, Arg5642_2, Arg5642_3, Arg5642_4, Arg5642_5, Arg5642_6, Arg5642_7, Arg5642_8, Arg5642_9, Arg5642_10, Arg5642_11, Arg5642_12, Arg5642_13], function(Arg5644) {
  var Arg5644_0 = Arg5644[0], Arg5644_1 = Arg5644[1], Arg5644_2 = Arg5644[2], Arg5644_3 = Arg5644[3], Arg5644_4 = Arg5644[4], Arg5644_5 = Arg5644[5], Arg5644_6 = Arg5644[6], Arg5644_7 = Arg5644[7], Arg5644_8 = Arg5644[8], Arg5644_9 = Arg5644[9], Arg5644_10 = Arg5644[10], Arg5644_11 = Arg5644[11], Arg5644_12 = Arg5644[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5644_10, shenjs_call(shen_lazyderef, [Arg5644_1, Arg5644_11])[1], Arg5644_11, (new Shenjs_freeze([Arg5644_1, Arg5644_2, Arg5644_3, Arg5644_4, Arg5644_5, Arg5644_6, Arg5644_7, Arg5644_8, Arg5644_9, Arg5644_10, Arg5644_11, Arg5644_12], function(Arg5646) {
  var Arg5646_0 = Arg5646[0], Arg5646_1 = Arg5646[1], Arg5646_2 = Arg5646[2], Arg5646_3 = Arg5646[3], Arg5646_4 = Arg5646[4], Arg5646_5 = Arg5646[5], Arg5646_6 = Arg5646[6], Arg5646_7 = Arg5646[7], Arg5646_8 = Arg5646[8], Arg5646_9 = Arg5646[9], Arg5646_10 = Arg5646[10], Arg5646_11 = Arg5646[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5646_3, shenjs_call(shen_lazyderef, [Arg5646_0, Arg5646_10])[2], Arg5646_10, (new Shenjs_freeze([Arg5646_0, Arg5646_1, Arg5646_2, Arg5646_3, Arg5646_4, Arg5646_5, Arg5646_6, Arg5646_7, Arg5646_8, Arg5646_9, Arg5646_10, Arg5646_11], function(Arg5648) {
  var Arg5648_0 = Arg5648[0], Arg5648_1 = Arg5648[1], Arg5648_2 = Arg5648[2], Arg5648_3 = Arg5648[3], Arg5648_4 = Arg5648[4], Arg5648_5 = Arg5648[5], Arg5648_6 = Arg5648[6], Arg5648_7 = Arg5648[7], Arg5648_8 = Arg5648[8], Arg5648_9 = Arg5648[9], Arg5648_10 = Arg5648[10], Arg5648_11 = Arg5648[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5648_1, shenjs_call(shen_extract$_vars, [shenjs_call(shen_lazyderef, [Arg5648_9, Arg5648_10])]), Arg5648_10, (new Shenjs_freeze([Arg5648_1, Arg5648_2, Arg5648_3, Arg5648_4, Arg5648_5, Arg5648_6, Arg5648_7, Arg5648_8, Arg5648_9, Arg5648_10, Arg5648_11], function(Arg5650) {
  var Arg5650_0 = Arg5650[0], Arg5650_1 = Arg5650[1], Arg5650_2 = Arg5650[2], Arg5650_3 = Arg5650[3], Arg5650_4 = Arg5650[4], Arg5650_5 = Arg5650[5], Arg5650_6 = Arg5650[6], Arg5650_7 = Arg5650[7], Arg5650_8 = Arg5650[8], Arg5650_9 = Arg5650[9], Arg5650_10 = Arg5650[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5650_3, shenjs_call(shen_placeholders, [shenjs_call(shen_lazyderef, [Arg5650_8, Arg5650_9]), shenjs_call(shen_lazyderef, [Arg5650_0, Arg5650_9])]), Arg5650_9, (new Shenjs_freeze([Arg5650_0, Arg5650_1, Arg5650_2, Arg5650_3, Arg5650_4, Arg5650_5, Arg5650_6, Arg5650_7, Arg5650_8, Arg5650_9, Arg5650_10], function(Arg5652) {
  var Arg5652_0 = Arg5652[0], Arg5652_1 = Arg5652[1], Arg5652_2 = Arg5652[2], Arg5652_3 = Arg5652[3], Arg5652_4 = Arg5652[4], Arg5652_5 = Arg5652[5], Arg5652_6 = Arg5652[6], Arg5652_7 = Arg5652[7], Arg5652_8 = Arg5652[8], Arg5652_9 = Arg5652[9], Arg5652_10 = Arg5652[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5652_1, Arg5652_9, (new Shenjs_freeze([Arg5652_1, Arg5652_2, Arg5652_3, Arg5652_4, Arg5652_5, Arg5652_6, Arg5652_7, Arg5652_8, Arg5652_9, Arg5652_10], function(Arg5654) {
  var Arg5654_0 = Arg5654[0], Arg5654_1 = Arg5654[1], Arg5654_2 = Arg5654[2], Arg5654_3 = Arg5654[3], Arg5654_4 = Arg5654[4], Arg5654_5 = Arg5654[5], Arg5654_6 = Arg5654[6], Arg5654_7 = Arg5654[7], Arg5654_8 = Arg5654[8], Arg5654_9 = Arg5654[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_rules, [Arg5654_1, Arg5654_2, 1, Arg5654_5, [shen_type_cons, [shen_type_cons, Arg5654_5, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5654_2, []]]], Arg5654_3], Arg5654_8, (new Shenjs_freeze([Arg5654_1, Arg5654_2, Arg5654_3, Arg5654_4, Arg5654_5, Arg5654_6, Arg5654_7, Arg5654_8, Arg5654_9], function(Arg5656) {
  var Arg5656_0 = Arg5656[0], Arg5656_1 = Arg5656[1], Arg5656_2 = Arg5656[2], Arg5656_3 = Arg5656[3], Arg5656_4 = Arg5656[4], Arg5656_5 = Arg5656[5], Arg5656_6 = Arg5656[6], Arg5656_7 = Arg5656[7], Arg5656_8 = Arg5656[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5656_3, shenjs_call(shen_declare, [shenjs_call(shen_lazyderef, [Arg5656_4, Arg5656_7]), shenjs_call(shen_lazyderef, [Arg5656_6, Arg5656_7])]), Arg5656_7, (new Shenjs_freeze([Arg5656_3, Arg5656_4, Arg5656_5, Arg5656_6, Arg5656_7, Arg5656_8], function(Arg5658) {
  var Arg5658_0 = Arg5658[0], Arg5658_1 = Arg5658[1], Arg5658_2 = Arg5658[2], Arg5658_3 = Arg5658[3], Arg5658_4 = Arg5658[4], Arg5658_5 = Arg5658[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5658_2, Arg5658_3, Arg5658_4, Arg5658_5]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))
  : false))
  : false))
  : false))]);}))},
  5,
  [],
  "shen-t*-def"];
shenjs_functions["shen_shen-t*-def"] = shen_t$asterisk$_def;






shen_$lt$sig$plus$rules$gt$ = [shen_type_func,
  function shen_user_lambda5661(Arg5660) {
  if (Arg5660.length < 1) return [shen_type_func, shen_user_lambda5661, 1, Arg5660];
  var Arg5660_0 = Arg5660[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$signature$gt$, [Arg5660_0])),
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
  function shen_user_lambda5663(Arg5662) {
  if (Arg5662.length < 2) return [shen_type_func, shen_user_lambda5663, 2, Arg5662];
  var Arg5662_0 = Arg5662[0], Arg5662_1 = Arg5662[1];
  return ((shenjs_is_type(Arg5662_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda5665(Arg5664) {
  if (Arg5664.length < 2) return [shen_type_func, shen_user_lambda5665, 2, Arg5664];
  var Arg5664_0 = Arg5664[0], Arg5664_1 = Arg5664[1];
  return (function() {
  return shenjs_call_tail(shen_placeholders, [Arg5664_1, Arg5664_0]);})},
  2,
  [Arg5662_1]], Arg5662_0]);})
  : ((shenjs_call(shen_element$question$, [Arg5662_0, Arg5662_1]))
  ? (function() {
  return shenjs_call_tail(shen_concat, [[shen_type_symbol, "&&"], Arg5662_0]);})
  : Arg5662_0))},
  2,
  [],
  "shen-placeholders"];
shenjs_functions["shen_shen-placeholders"] = shen_placeholders;






shen_$lt$trules$gt$ = [shen_type_func,
  function shen_user_lambda5667(Arg5666) {
  if (Arg5666.length < 1) return [shen_type_func, shen_user_lambda5667, 1, Arg5666];
  var Arg5666_0 = Arg5666[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$trule$gt$, [Arg5666_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$trules$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$trule$gt$, [Arg5666_0])),
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
  function shen_user_lambda5669(Arg5668) {
  if (Arg5668.length < 1) return [shen_type_func, shen_user_lambda5669, 1, Arg5668];
  var Arg5668_0 = Arg5668[0];
  var R0, R1, R2, R3, R4;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg5668_0])),
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
  function shen_user_lambda5671(Arg5670) {
  if (Arg5670.length < 4) return [shen_type_func, shen_user_lambda5671, 4, Arg5670];
  var Arg5670_0 = Arg5670[0], Arg5670_1 = Arg5670[1], Arg5670_2 = Arg5670[2], Arg5670_3 = Arg5670[3];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-forward"], Arg5670_1)))
  ? [shen_type_cons, Arg5670_0, [shen_type_cons, ((shenjs_unwind_tail(shenjs_$eq$(Arg5670_3, [shen_type_symbol, "shen-skip"])))
  ? Arg5670_2
  : [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, Arg5670_3, [shen_type_cons, Arg5670_2, []]]]), []]]
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-backward"], Arg5670_1)) && (shenjs_is_type(Arg5670_2, shen_type_cons) && (shenjs_is_type(Arg5670_2[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fail-if"], Arg5670_2[1][1])) && (shenjs_is_type(Arg5670_2[1][2], shen_type_cons) && (shenjs_empty$question$(Arg5670_2[1][2][2]) && (shenjs_is_type(Arg5670_2[2], shen_type_cons) && shenjs_empty$question$(Arg5670_2[2][2])))))))))
  ? [shen_type_cons, Arg5670_0, [shen_type_cons, ((shenjs_unwind_tail(shenjs_$eq$(Arg5670_3, [shen_type_symbol, "shen-skip"])))
  ? [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, Arg5670_2[1][2][1], Arg5670_2[2]], []]], Arg5670_2[2]]]
  : [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, Arg5670_3, []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, Arg5670_2[1][2][1], Arg5670_2[2]], []]], []]], Arg5670_2[2]]]), []]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-backward"], Arg5670_1)))
  ? [shen_type_cons, Arg5670_0, [shen_type_cons, ((shenjs_unwind_tail(shenjs_$eq$(Arg5670_3, [shen_type_symbol, "shen-skip"])))
  ? [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "=="], [shen_type_cons, Arg5670_2, []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]], []]], [shen_type_cons, Arg5670_2, []]]]
  : [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, Arg5670_3, []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "=="], [shen_type_cons, Arg5670_2, []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]], []]], []]], [shen_type_cons, Arg5670_2, []]]]), []]]
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "shen-form-rule"]]);}))))},
  4,
  [],
  "shen-form-rule"];
shenjs_functions["shen_shen-form-rule"] = shen_form_rule;






shen_$lt$guard$question$$gt$ = [shen_type_func,
  function shen_user_lambda5673(Arg5672) {
  if (Arg5672.length < 1) return [shen_type_func, shen_user_lambda5673, 1, Arg5672];
  var Arg5672_0 = Arg5672[0];
  var R0;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg5672_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "where"], shenjs_call(shen_fst, [Arg5672_0])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$guard$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg5672_0])[2], shenjs_call(shen_snd, [Arg5672_0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg5672_0])),
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
  function shen_user_lambda5675(Arg5674) {
  if (Arg5674.length < 1) return [shen_type_func, shen_user_lambda5675, 1, Arg5674];
  var Arg5674_0 = Arg5674[0];
  var R0;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg5674_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "->"], shenjs_call(shen_fst, [Arg5674_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg5674_0])[2], shenjs_call(shen_snd, [Arg5674_0])])]), [shen_type_symbol, "shen-forward"]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg5674_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "<-"], shenjs_call(shen_fst, [Arg5674_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg5674_0])[2], shenjs_call(shen_snd, [Arg5674_0])])]), [shen_type_symbol, "shen-backward"]])
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
  function shen_user_lambda5677(Arg5676) {
  if (Arg5676.length < 1) return [shen_type_func, shen_user_lambda5677, 1, Arg5676];
  var Arg5676_0 = Arg5676[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["syntax error in ~A~%", [shen_tuple, Arg5676_0, []]]);})},
  1,
  [],
  "shen-errordef"];
shenjs_functions["shen_shen-errordef"] = shen_errordef;






shen_t$asterisk$_rules = [shen_type_func,
  function shen_user_lambda5679(Arg5678) {
  if (Arg5678.length < 7) return [shen_type_func, shen_user_lambda5679, 7, Arg5678];
  var Arg5678_0 = Arg5678[0], Arg5678_1 = Arg5678[1], Arg5678_2 = Arg5678[2], Arg5678_3 = Arg5678[3], Arg5678_4 = Arg5678[4], Arg5678_5 = Arg5678[5], Arg5678_6 = Arg5678[6];
  var R0, R1, R2, R3;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5678_0, Arg5678_5])),
  ((shenjs_empty$question$(R1))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5678_6)))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg5678_0, Arg5678_5])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = R1[2]),
  (R3 = shenjs_call(shen_newpv, [Arg5678_5])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_t$asterisk$_rule, [R2, Arg5678_1, Arg5678_2, Arg5678_3, Arg5678_4, Arg5678_5, (new Shenjs_freeze([R2, R0, Arg5678_2, R1, Arg5678_1, R3, Arg5678_3, Arg5678_4, Arg5678_5, Arg5678_6], function(Arg5680) {
  var Arg5680_0 = Arg5680[0], Arg5680_1 = Arg5680[1], Arg5680_2 = Arg5680[2], Arg5680_3 = Arg5680[3], Arg5680_4 = Arg5680[4], Arg5680_5 = Arg5680[5], Arg5680_6 = Arg5680[6], Arg5680_7 = Arg5680[7], Arg5680_8 = Arg5680[8], Arg5680_9 = Arg5680[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5680_1, Arg5680_8, (new Shenjs_freeze([Arg5680_1, Arg5680_2, Arg5680_3, Arg5680_4, Arg5680_5, Arg5680_6, Arg5680_7, Arg5680_8, Arg5680_9], function(Arg5682) {
  var Arg5682_0 = Arg5682[0], Arg5682_1 = Arg5682[1], Arg5682_2 = Arg5682[2], Arg5682_3 = Arg5682[3], Arg5682_4 = Arg5682[4], Arg5682_5 = Arg5682[5], Arg5682_6 = Arg5682[6], Arg5682_7 = Arg5682[7], Arg5682_8 = Arg5682[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5682_4, (shenjs_call(shen_lazyderef, [Arg5682_1, Arg5682_7]) + 1), Arg5682_7, (new Shenjs_freeze([Arg5682_1, Arg5682_2, Arg5682_3, Arg5682_4, Arg5682_5, Arg5682_6, Arg5682_7, Arg5682_8], function(Arg5684) {
  var Arg5684_0 = Arg5684[0], Arg5684_1 = Arg5684[1], Arg5684_2 = Arg5684[2], Arg5684_3 = Arg5684[3], Arg5684_4 = Arg5684[4], Arg5684_5 = Arg5684[5], Arg5684_6 = Arg5684[6], Arg5684_7 = Arg5684[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_rules, [Arg5684_1, Arg5684_2, Arg5684_3, Arg5684_4, Arg5684_5, Arg5684_6, Arg5684_7]);});})}))]);});})}))]);});})}))]))
  : false))
  : R1))]);}))},
  7,
  [],
  "shen-t*-rules"];
shenjs_functions["shen_shen-t*-rules"] = shen_t$asterisk$_rules;






shen_t$asterisk$_rule = [shen_type_func,
  function shen_user_lambda5687(Arg5686) {
  if (Arg5686.length < 7) return [shen_type_func, shen_user_lambda5687, 7, Arg5686];
  var Arg5686_0 = Arg5686[0], Arg5686_1 = Arg5686[1], Arg5686_2 = Arg5686[2], Arg5686_3 = Arg5686[3], Arg5686_4 = Arg5686[4], Arg5686_5 = Arg5686[5], Arg5686_6 = Arg5686[6];
  var R0;
  return ((R0 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_t$asterisk$_ruleh, [Arg5686_0, Arg5686_1, Arg5686_4, Arg5686_5, Arg5686_6]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_newpv, [Arg5686_5])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [R0, shenjs_call(shen_type_insecure_rule_error_message, [shenjs_call(shen_lazyderef, [Arg5686_2, Arg5686_5]), shenjs_call(shen_lazyderef, [Arg5686_3, Arg5686_5])]), Arg5686_5, Arg5686_6]);}))
  : R0))},
  7,
  [],
  "shen-t*-rule"];
shenjs_functions["shen_shen-t*-rule"] = shen_t$asterisk$_rule;






shen_t$asterisk$_ruleh = [shen_type_func,
  function shen_user_lambda5689(Arg5688) {
  if (Arg5688.length < 5) return [shen_type_func, shen_user_lambda5689, 5, Arg5688];
  var Arg5688_0 = Arg5688[0], Arg5688_1 = Arg5688[1], Arg5688_2 = Arg5688[2], Arg5688_3 = Arg5688[3], Arg5688_4 = Arg5688[4];
  var R0, R1, R2, R3, R4, R5;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = shenjs_call(shen_lazyderef, [Arg5688_0, Arg5688_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5688_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R3 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5688_3])),
  ((shenjs_empty$question$(R1))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5688_3])),
  (R4 = shenjs_call(shen_newpv, [Arg5688_3])),
  (R5 = shenjs_call(shen_newpv, [Arg5688_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_t$asterisk$_patterns, [R2, Arg5688_1, R1, R4, Arg5688_3, (new Shenjs_freeze([R2, Arg5688_1, R1, Arg5688_2, R0, R3, R4, R5, Arg5688_3, Arg5688_4], function(Arg5690) {
  var Arg5690_0 = Arg5690[0], Arg5690_1 = Arg5690[1], Arg5690_2 = Arg5690[2], Arg5690_3 = Arg5690[3], Arg5690_4 = Arg5690[4], Arg5690_5 = Arg5690[5], Arg5690_6 = Arg5690[6], Arg5690_7 = Arg5690[7], Arg5690_8 = Arg5690[8], Arg5690_9 = Arg5690[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5690_4, Arg5690_8, (new Shenjs_freeze([Arg5690_2, Arg5690_3, Arg5690_4, Arg5690_5, Arg5690_6, Arg5690_7, Arg5690_8, Arg5690_9], function(Arg5692) {
  var Arg5692_0 = Arg5692[0], Arg5692_1 = Arg5692[1], Arg5692_2 = Arg5692[2], Arg5692_3 = Arg5692[3], Arg5692_4 = Arg5692[4], Arg5692_5 = Arg5692[5], Arg5692_6 = Arg5692[6], Arg5692_7 = Arg5692[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_conc, [Arg5692_0, Arg5692_1, Arg5692_5, Arg5692_6, (new Shenjs_freeze([Arg5692_0, Arg5692_1, Arg5692_2, Arg5692_3, Arg5692_4, Arg5692_5, Arg5692_6, Arg5692_7], function(Arg5694) {
  var Arg5694_0 = Arg5694[0], Arg5694_1 = Arg5694[1], Arg5694_2 = Arg5694[2], Arg5694_3 = Arg5694[3], Arg5694_4 = Arg5694[4], Arg5694_5 = Arg5694[5], Arg5694_6 = Arg5694[6], Arg5694_7 = Arg5694[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5694_2, Arg5694_6, (new Shenjs_freeze([Arg5694_2, Arg5694_3, Arg5694_4, Arg5694_5, Arg5694_6, Arg5694_7], function(Arg5696) {
  var Arg5696_0 = Arg5696[0], Arg5696_1 = Arg5696[1], Arg5696_2 = Arg5696[2], Arg5696_3 = Arg5696[3], Arg5696_4 = Arg5696[4], Arg5696_5 = Arg5696[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5696_1, Arg5696_2, Arg5696_3, Arg5696_4, Arg5696_5]);});})}))]);});})}))]);});})}))]);});})}))]))
  : false))
  : false))
  : false))]);}))},
  5,
  [],
  "shen-t*-ruleh"];
shenjs_functions["shen_shen-t*-ruleh"] = shen_t$asterisk$_ruleh;






shen_type_insecure_rule_error_message = [shen_type_func,
  function shen_user_lambda5699(Arg5698) {
  if (Arg5698.length < 2) return [shen_type_func, shen_user_lambda5699, 2, Arg5698];
  var Arg5698_0 = Arg5698[0], Arg5698_1 = Arg5698[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["type error in rule ~A of ~A~%", [shen_tuple, Arg5698_0, [shen_tuple, Arg5698_1, []]]]);})},
  2,
  [],
  "shen-type-insecure-rule-error-message"];
shenjs_functions["shen_shen-type-insecure-rule-error-message"] = shen_type_insecure_rule_error_message;






shen_t$asterisk$_patterns = [shen_type_func,
  function shen_user_lambda5701(Arg5700) {
  if (Arg5700.length < 6) return [shen_type_func, shen_user_lambda5701, 6, Arg5700];
  var Arg5700_0 = Arg5700[0], Arg5700_1 = Arg5700[1], Arg5700_2 = Arg5700[2], Arg5700_3 = Arg5700[3], Arg5700_4 = Arg5700[4], Arg5700_5 = Arg5700[5];
  var R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5700_0, Arg5700_4])),
  ((shenjs_empty$question$(R1))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg5700_2, Arg5700_4])),
  ((shenjs_empty$question$(R1))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [Arg5700_3, Arg5700_1, Arg5700_4, Arg5700_5]))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg5700_4]),
  (R2 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [Arg5700_3, Arg5700_1, Arg5700_4, Arg5700_5]))),
  shenjs_call(shen_unbindv, [R1, Arg5700_4]),
  R2)
  : false)))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg5700_0, Arg5700_4])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = R1[2]),
  (R3 = shenjs_call(shen_lazyderef, [Arg5700_1, Arg5700_4])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5700_4])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R3[1], Arg5700_4])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-->"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R3[2], Arg5700_4])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R3 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg5700_4])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = shenjs_call(shen_lazyderef, [Arg5700_2, Arg5700_4])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R6 = shenjs_call(shen_lazyderef, [R5[1], Arg5700_4])),
  ((shenjs_is_type(R6, shen_type_cons))
  ? ((R7 = R6[1]),
  (R6 = shenjs_call(shen_lazyderef, [R6[2], Arg5700_4])),
  ((shenjs_is_type(R6, shen_type_cons))
  ? ((R8 = shenjs_call(shen_lazyderef, [R6[1], Arg5700_4])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R8)))
  ? ((R8 = shenjs_call(shen_lazyderef, [R6[2], Arg5700_4])),
  ((shenjs_is_type(R8, shen_type_cons))
  ? ((R6 = R8[1]),
  (R8 = shenjs_call(shen_lazyderef, [R8[2], Arg5700_4])),
  ((shenjs_empty$question$(R8))
  ? ((R8 = R5[2]),
  (R5 = shenjs_call(shen_newpv, [Arg5700_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R6, R4, Arg5700_4, (new Shenjs_freeze([R4, R2, R7, R6, R5, R0, R1, R3, R8, Arg5700_3, Arg5700_4, Arg5700_5], function(Arg5702) {
  var Arg5702_0 = Arg5702[0], Arg5702_1 = Arg5702[1], Arg5702_2 = Arg5702[2], Arg5702_3 = Arg5702[3], Arg5702_4 = Arg5702[4], Arg5702_5 = Arg5702[5], Arg5702_6 = Arg5702[6], Arg5702_7 = Arg5702[7], Arg5702_8 = Arg5702[8], Arg5702_9 = Arg5702[9], Arg5702_10 = Arg5702[10], Arg5702_11 = Arg5702[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5702_2, Arg5702_1, Arg5702_10, (new Shenjs_freeze([Arg5702_1, Arg5702_2, Arg5702_3, Arg5702_4, Arg5702_5, Arg5702_6, Arg5702_7, Arg5702_8, Arg5702_9, Arg5702_10, Arg5702_11], function(Arg5704) {
  var Arg5704_0 = Arg5704[0], Arg5704_1 = Arg5704[1], Arg5704_2 = Arg5704[2], Arg5704_3 = Arg5704[3], Arg5704_4 = Arg5704[4], Arg5704_5 = Arg5704[5], Arg5704_6 = Arg5704[6], Arg5704_7 = Arg5704[7], Arg5704_8 = Arg5704[8], Arg5704_9 = Arg5704[9], Arg5704_10 = Arg5704[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5704_1, Arg5704_3, Arg5704_9, (new Shenjs_freeze([Arg5704_1, Arg5704_2, Arg5704_3, Arg5704_4, Arg5704_5, Arg5704_6, Arg5704_7, Arg5704_8, Arg5704_9, Arg5704_10], function(Arg5706) {
  var Arg5706_0 = Arg5706[0], Arg5706_1 = Arg5706[1], Arg5706_2 = Arg5706[2], Arg5706_3 = Arg5706[3], Arg5706_4 = Arg5706[4], Arg5706_5 = Arg5706[5], Arg5706_6 = Arg5706[6], Arg5706_7 = Arg5706[7], Arg5706_8 = Arg5706[8], Arg5706_9 = Arg5706[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5706_3, Arg5706_8, (new Shenjs_freeze([Arg5706_0, Arg5706_1, Arg5706_2, Arg5706_3, Arg5706_4, Arg5706_5, Arg5706_6, Arg5706_7, Arg5706_8, Arg5706_9], function(Arg5708) {
  var Arg5708_0 = Arg5708[0], Arg5708_1 = Arg5708[1], Arg5708_2 = Arg5708[2], Arg5708_3 = Arg5708[3], Arg5708_4 = Arg5708[4], Arg5708_5 = Arg5708[5], Arg5708_6 = Arg5708[6], Arg5708_7 = Arg5708[7], Arg5708_8 = Arg5708[8], Arg5708_9 = Arg5708[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5708_0, Arg5708_1, Arg5708_2, Arg5708_8, (new Shenjs_freeze([Arg5708_0, Arg5708_1, Arg5708_2, Arg5708_3, Arg5708_4, Arg5708_5, Arg5708_6, Arg5708_7, Arg5708_8, Arg5708_9], function(Arg5710) {
  var Arg5710_0 = Arg5710[0], Arg5710_1 = Arg5710[1], Arg5710_2 = Arg5710[2], Arg5710_3 = Arg5710[3], Arg5710_4 = Arg5710[4], Arg5710_5 = Arg5710[5], Arg5710_6 = Arg5710[6], Arg5710_7 = Arg5710[7], Arg5710_8 = Arg5710[8], Arg5710_9 = Arg5710[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5710_3, Arg5710_8, (new Shenjs_freeze([Arg5710_3, Arg5710_4, Arg5710_5, Arg5710_6, Arg5710_7, Arg5710_8, Arg5710_9], function(Arg5712) {
  var Arg5712_0 = Arg5712[0], Arg5712_1 = Arg5712[1], Arg5712_2 = Arg5712[2], Arg5712_3 = Arg5712[3], Arg5712_4 = Arg5712[4], Arg5712_5 = Arg5712[5], Arg5712_6 = Arg5712[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5712_1, Arg5712_2, Arg5712_3, Arg5712_4, Arg5712_5, Arg5712_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R8]))
  ? (shenjs_call(shen_bindv, [R8, [], Arg5700_4]),
  (R7 = ((R5 = R5[2]),
  (R9 = shenjs_call(shen_newpv, [Arg5700_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R6, R4, Arg5700_4, (new Shenjs_freeze([R4, R2, R7, R6, R9, R0, R1, R3, R5, Arg5700_3, Arg5700_4, Arg5700_5, R8, Arg5700_4], function(Arg5714) {
  var Arg5714_0 = Arg5714[0], Arg5714_1 = Arg5714[1], Arg5714_2 = Arg5714[2], Arg5714_3 = Arg5714[3], Arg5714_4 = Arg5714[4], Arg5714_5 = Arg5714[5], Arg5714_6 = Arg5714[6], Arg5714_7 = Arg5714[7], Arg5714_8 = Arg5714[8], Arg5714_9 = Arg5714[9], Arg5714_10 = Arg5714[10], Arg5714_11 = Arg5714[11], Arg5714_12 = Arg5714[12], Arg5714_13 = Arg5714[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5714_2, Arg5714_1, Arg5714_10, (new Shenjs_freeze([Arg5714_1, Arg5714_2, Arg5714_3, Arg5714_4, Arg5714_5, Arg5714_6, Arg5714_7, Arg5714_8, Arg5714_9, Arg5714_10, Arg5714_11], function(Arg5716) {
  var Arg5716_0 = Arg5716[0], Arg5716_1 = Arg5716[1], Arg5716_2 = Arg5716[2], Arg5716_3 = Arg5716[3], Arg5716_4 = Arg5716[4], Arg5716_5 = Arg5716[5], Arg5716_6 = Arg5716[6], Arg5716_7 = Arg5716[7], Arg5716_8 = Arg5716[8], Arg5716_9 = Arg5716[9], Arg5716_10 = Arg5716[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5716_1, Arg5716_3, Arg5716_9, (new Shenjs_freeze([Arg5716_1, Arg5716_2, Arg5716_3, Arg5716_4, Arg5716_5, Arg5716_6, Arg5716_7, Arg5716_8, Arg5716_9, Arg5716_10], function(Arg5718) {
  var Arg5718_0 = Arg5718[0], Arg5718_1 = Arg5718[1], Arg5718_2 = Arg5718[2], Arg5718_3 = Arg5718[3], Arg5718_4 = Arg5718[4], Arg5718_5 = Arg5718[5], Arg5718_6 = Arg5718[6], Arg5718_7 = Arg5718[7], Arg5718_8 = Arg5718[8], Arg5718_9 = Arg5718[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5718_3, Arg5718_8, (new Shenjs_freeze([Arg5718_0, Arg5718_1, Arg5718_2, Arg5718_3, Arg5718_4, Arg5718_5, Arg5718_6, Arg5718_7, Arg5718_8, Arg5718_9], function(Arg5720) {
  var Arg5720_0 = Arg5720[0], Arg5720_1 = Arg5720[1], Arg5720_2 = Arg5720[2], Arg5720_3 = Arg5720[3], Arg5720_4 = Arg5720[4], Arg5720_5 = Arg5720[5], Arg5720_6 = Arg5720[6], Arg5720_7 = Arg5720[7], Arg5720_8 = Arg5720[8], Arg5720_9 = Arg5720[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5720_0, Arg5720_1, Arg5720_2, Arg5720_8, (new Shenjs_freeze([Arg5720_0, Arg5720_1, Arg5720_2, Arg5720_3, Arg5720_4, Arg5720_5, Arg5720_6, Arg5720_7, Arg5720_8, Arg5720_9], function(Arg5722) {
  var Arg5722_0 = Arg5722[0], Arg5722_1 = Arg5722[1], Arg5722_2 = Arg5722[2], Arg5722_3 = Arg5722[3], Arg5722_4 = Arg5722[4], Arg5722_5 = Arg5722[5], Arg5722_6 = Arg5722[6], Arg5722_7 = Arg5722[7], Arg5722_8 = Arg5722[8], Arg5722_9 = Arg5722[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5722_3, Arg5722_8, (new Shenjs_freeze([Arg5722_3, Arg5722_4, Arg5722_5, Arg5722_6, Arg5722_7, Arg5722_8, Arg5722_9], function(Arg5724) {
  var Arg5724_0 = Arg5724[0], Arg5724_1 = Arg5724[1], Arg5724_2 = Arg5724[2], Arg5724_3 = Arg5724[3], Arg5724_4 = Arg5724[4], Arg5724_5 = Arg5724[5], Arg5724_6 = Arg5724[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5724_1, Arg5724_2, Arg5724_3, Arg5724_4, Arg5724_5, Arg5724_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R8, Arg5700_4]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R8]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5700_4])),
  shenjs_call(shen_bindv, [R8, [shen_type_cons, R6, []], Arg5700_4]),
  (R7 = ((R5 = R5[2]),
  (R9 = shenjs_call(shen_newpv, [Arg5700_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R6, R4, Arg5700_4, (new Shenjs_freeze([R4, R2, R7, R6, R9, R0, R1, R3, R5, Arg5700_3, Arg5700_4, Arg5700_5, R8, Arg5700_4], function(Arg5726) {
  var Arg5726_0 = Arg5726[0], Arg5726_1 = Arg5726[1], Arg5726_2 = Arg5726[2], Arg5726_3 = Arg5726[3], Arg5726_4 = Arg5726[4], Arg5726_5 = Arg5726[5], Arg5726_6 = Arg5726[6], Arg5726_7 = Arg5726[7], Arg5726_8 = Arg5726[8], Arg5726_9 = Arg5726[9], Arg5726_10 = Arg5726[10], Arg5726_11 = Arg5726[11], Arg5726_12 = Arg5726[12], Arg5726_13 = Arg5726[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5726_2, Arg5726_1, Arg5726_10, (new Shenjs_freeze([Arg5726_1, Arg5726_2, Arg5726_3, Arg5726_4, Arg5726_5, Arg5726_6, Arg5726_7, Arg5726_8, Arg5726_9, Arg5726_10, Arg5726_11], function(Arg5728) {
  var Arg5728_0 = Arg5728[0], Arg5728_1 = Arg5728[1], Arg5728_2 = Arg5728[2], Arg5728_3 = Arg5728[3], Arg5728_4 = Arg5728[4], Arg5728_5 = Arg5728[5], Arg5728_6 = Arg5728[6], Arg5728_7 = Arg5728[7], Arg5728_8 = Arg5728[8], Arg5728_9 = Arg5728[9], Arg5728_10 = Arg5728[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5728_1, Arg5728_3, Arg5728_9, (new Shenjs_freeze([Arg5728_1, Arg5728_2, Arg5728_3, Arg5728_4, Arg5728_5, Arg5728_6, Arg5728_7, Arg5728_8, Arg5728_9, Arg5728_10], function(Arg5730) {
  var Arg5730_0 = Arg5730[0], Arg5730_1 = Arg5730[1], Arg5730_2 = Arg5730[2], Arg5730_3 = Arg5730[3], Arg5730_4 = Arg5730[4], Arg5730_5 = Arg5730[5], Arg5730_6 = Arg5730[6], Arg5730_7 = Arg5730[7], Arg5730_8 = Arg5730[8], Arg5730_9 = Arg5730[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5730_3, Arg5730_8, (new Shenjs_freeze([Arg5730_0, Arg5730_1, Arg5730_2, Arg5730_3, Arg5730_4, Arg5730_5, Arg5730_6, Arg5730_7, Arg5730_8, Arg5730_9], function(Arg5732) {
  var Arg5732_0 = Arg5732[0], Arg5732_1 = Arg5732[1], Arg5732_2 = Arg5732[2], Arg5732_3 = Arg5732[3], Arg5732_4 = Arg5732[4], Arg5732_5 = Arg5732[5], Arg5732_6 = Arg5732[6], Arg5732_7 = Arg5732[7], Arg5732_8 = Arg5732[8], Arg5732_9 = Arg5732[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5732_0, Arg5732_1, Arg5732_2, Arg5732_8, (new Shenjs_freeze([Arg5732_0, Arg5732_1, Arg5732_2, Arg5732_3, Arg5732_4, Arg5732_5, Arg5732_6, Arg5732_7, Arg5732_8, Arg5732_9], function(Arg5734) {
  var Arg5734_0 = Arg5734[0], Arg5734_1 = Arg5734[1], Arg5734_2 = Arg5734[2], Arg5734_3 = Arg5734[3], Arg5734_4 = Arg5734[4], Arg5734_5 = Arg5734[5], Arg5734_6 = Arg5734[6], Arg5734_7 = Arg5734[7], Arg5734_8 = Arg5734[8], Arg5734_9 = Arg5734[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5734_3, Arg5734_8, (new Shenjs_freeze([Arg5734_3, Arg5734_4, Arg5734_5, Arg5734_6, Arg5734_7, Arg5734_8, Arg5734_9], function(Arg5736) {
  var Arg5736_0 = Arg5736[0], Arg5736_1 = Arg5736[1], Arg5736_2 = Arg5736[2], Arg5736_3 = Arg5736[3], Arg5736_4 = Arg5736[4], Arg5736_5 = Arg5736[5], Arg5736_6 = Arg5736[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5736_1, Arg5736_2, Arg5736_3, Arg5736_4, Arg5736_5, Arg5736_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R8, Arg5700_4]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R8]))
  ? (shenjs_call(shen_bindv, [R8, [shen_type_symbol, ":"], Arg5700_4]),
  (R7 = ((R6 = shenjs_call(shen_lazyderef, [R6[2], Arg5700_4])),
  ((shenjs_is_type(R6, shen_type_cons))
  ? ((R9 = R6[1]),
  (R6 = shenjs_call(shen_lazyderef, [R6[2], Arg5700_4])),
  ((shenjs_empty$question$(R6))
  ? ((R6 = R5[2]),
  (R5 = shenjs_call(shen_newpv, [Arg5700_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R9, R4, Arg5700_4, (new Shenjs_freeze([R4, R2, R7, R9, R5, R0, R1, R3, R6, Arg5700_3, Arg5700_4, Arg5700_5, R8, Arg5700_4], function(Arg5738) {
  var Arg5738_0 = Arg5738[0], Arg5738_1 = Arg5738[1], Arg5738_2 = Arg5738[2], Arg5738_3 = Arg5738[3], Arg5738_4 = Arg5738[4], Arg5738_5 = Arg5738[5], Arg5738_6 = Arg5738[6], Arg5738_7 = Arg5738[7], Arg5738_8 = Arg5738[8], Arg5738_9 = Arg5738[9], Arg5738_10 = Arg5738[10], Arg5738_11 = Arg5738[11], Arg5738_12 = Arg5738[12], Arg5738_13 = Arg5738[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5738_2, Arg5738_1, Arg5738_10, (new Shenjs_freeze([Arg5738_1, Arg5738_2, Arg5738_3, Arg5738_4, Arg5738_5, Arg5738_6, Arg5738_7, Arg5738_8, Arg5738_9, Arg5738_10, Arg5738_11], function(Arg5740) {
  var Arg5740_0 = Arg5740[0], Arg5740_1 = Arg5740[1], Arg5740_2 = Arg5740[2], Arg5740_3 = Arg5740[3], Arg5740_4 = Arg5740[4], Arg5740_5 = Arg5740[5], Arg5740_6 = Arg5740[6], Arg5740_7 = Arg5740[7], Arg5740_8 = Arg5740[8], Arg5740_9 = Arg5740[9], Arg5740_10 = Arg5740[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5740_1, Arg5740_3, Arg5740_9, (new Shenjs_freeze([Arg5740_1, Arg5740_2, Arg5740_3, Arg5740_4, Arg5740_5, Arg5740_6, Arg5740_7, Arg5740_8, Arg5740_9, Arg5740_10], function(Arg5742) {
  var Arg5742_0 = Arg5742[0], Arg5742_1 = Arg5742[1], Arg5742_2 = Arg5742[2], Arg5742_3 = Arg5742[3], Arg5742_4 = Arg5742[4], Arg5742_5 = Arg5742[5], Arg5742_6 = Arg5742[6], Arg5742_7 = Arg5742[7], Arg5742_8 = Arg5742[8], Arg5742_9 = Arg5742[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5742_3, Arg5742_8, (new Shenjs_freeze([Arg5742_0, Arg5742_1, Arg5742_2, Arg5742_3, Arg5742_4, Arg5742_5, Arg5742_6, Arg5742_7, Arg5742_8, Arg5742_9], function(Arg5744) {
  var Arg5744_0 = Arg5744[0], Arg5744_1 = Arg5744[1], Arg5744_2 = Arg5744[2], Arg5744_3 = Arg5744[3], Arg5744_4 = Arg5744[4], Arg5744_5 = Arg5744[5], Arg5744_6 = Arg5744[6], Arg5744_7 = Arg5744[7], Arg5744_8 = Arg5744[8], Arg5744_9 = Arg5744[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5744_0, Arg5744_1, Arg5744_2, Arg5744_8, (new Shenjs_freeze([Arg5744_0, Arg5744_1, Arg5744_2, Arg5744_3, Arg5744_4, Arg5744_5, Arg5744_6, Arg5744_7, Arg5744_8, Arg5744_9], function(Arg5746) {
  var Arg5746_0 = Arg5746[0], Arg5746_1 = Arg5746[1], Arg5746_2 = Arg5746[2], Arg5746_3 = Arg5746[3], Arg5746_4 = Arg5746[4], Arg5746_5 = Arg5746[5], Arg5746_6 = Arg5746[6], Arg5746_7 = Arg5746[7], Arg5746_8 = Arg5746[8], Arg5746_9 = Arg5746[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5746_3, Arg5746_8, (new Shenjs_freeze([Arg5746_3, Arg5746_4, Arg5746_5, Arg5746_6, Arg5746_7, Arg5746_8, Arg5746_9], function(Arg5748) {
  var Arg5748_0 = Arg5748[0], Arg5748_1 = Arg5748[1], Arg5748_2 = Arg5748[2], Arg5748_3 = Arg5748[3], Arg5748_4 = Arg5748[4], Arg5748_5 = Arg5748[5], Arg5748_6 = Arg5748[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5748_1, Arg5748_2, Arg5748_3, Arg5748_4, Arg5748_5, Arg5748_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? (shenjs_call(shen_bindv, [R6, [], Arg5700_4]),
  (R9 = ((R5 = R5[2]),
  (R10 = shenjs_call(shen_newpv, [Arg5700_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R9, R4, Arg5700_4, (new Shenjs_freeze([R4, R2, R7, R9, R10, R0, R1, R3, R5, Arg5700_3, Arg5700_4, Arg5700_5, R6, Arg5700_4, R8, Arg5700_4], function(Arg5750) {
  var Arg5750_0 = Arg5750[0], Arg5750_1 = Arg5750[1], Arg5750_2 = Arg5750[2], Arg5750_3 = Arg5750[3], Arg5750_4 = Arg5750[4], Arg5750_5 = Arg5750[5], Arg5750_6 = Arg5750[6], Arg5750_7 = Arg5750[7], Arg5750_8 = Arg5750[8], Arg5750_9 = Arg5750[9], Arg5750_10 = Arg5750[10], Arg5750_11 = Arg5750[11], Arg5750_12 = Arg5750[12], Arg5750_13 = Arg5750[13], Arg5750_14 = Arg5750[14], Arg5750_15 = Arg5750[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5750_2, Arg5750_1, Arg5750_10, (new Shenjs_freeze([Arg5750_1, Arg5750_2, Arg5750_3, Arg5750_4, Arg5750_5, Arg5750_6, Arg5750_7, Arg5750_8, Arg5750_9, Arg5750_10, Arg5750_11], function(Arg5752) {
  var Arg5752_0 = Arg5752[0], Arg5752_1 = Arg5752[1], Arg5752_2 = Arg5752[2], Arg5752_3 = Arg5752[3], Arg5752_4 = Arg5752[4], Arg5752_5 = Arg5752[5], Arg5752_6 = Arg5752[6], Arg5752_7 = Arg5752[7], Arg5752_8 = Arg5752[8], Arg5752_9 = Arg5752[9], Arg5752_10 = Arg5752[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5752_1, Arg5752_3, Arg5752_9, (new Shenjs_freeze([Arg5752_1, Arg5752_2, Arg5752_3, Arg5752_4, Arg5752_5, Arg5752_6, Arg5752_7, Arg5752_8, Arg5752_9, Arg5752_10], function(Arg5754) {
  var Arg5754_0 = Arg5754[0], Arg5754_1 = Arg5754[1], Arg5754_2 = Arg5754[2], Arg5754_3 = Arg5754[3], Arg5754_4 = Arg5754[4], Arg5754_5 = Arg5754[5], Arg5754_6 = Arg5754[6], Arg5754_7 = Arg5754[7], Arg5754_8 = Arg5754[8], Arg5754_9 = Arg5754[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5754_3, Arg5754_8, (new Shenjs_freeze([Arg5754_0, Arg5754_1, Arg5754_2, Arg5754_3, Arg5754_4, Arg5754_5, Arg5754_6, Arg5754_7, Arg5754_8, Arg5754_9], function(Arg5756) {
  var Arg5756_0 = Arg5756[0], Arg5756_1 = Arg5756[1], Arg5756_2 = Arg5756[2], Arg5756_3 = Arg5756[3], Arg5756_4 = Arg5756[4], Arg5756_5 = Arg5756[5], Arg5756_6 = Arg5756[6], Arg5756_7 = Arg5756[7], Arg5756_8 = Arg5756[8], Arg5756_9 = Arg5756[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5756_0, Arg5756_1, Arg5756_2, Arg5756_8, (new Shenjs_freeze([Arg5756_0, Arg5756_1, Arg5756_2, Arg5756_3, Arg5756_4, Arg5756_5, Arg5756_6, Arg5756_7, Arg5756_8, Arg5756_9], function(Arg5758) {
  var Arg5758_0 = Arg5758[0], Arg5758_1 = Arg5758[1], Arg5758_2 = Arg5758[2], Arg5758_3 = Arg5758[3], Arg5758_4 = Arg5758[4], Arg5758_5 = Arg5758[5], Arg5758_6 = Arg5758[6], Arg5758_7 = Arg5758[7], Arg5758_8 = Arg5758[8], Arg5758_9 = Arg5758[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5758_3, Arg5758_8, (new Shenjs_freeze([Arg5758_3, Arg5758_4, Arg5758_5, Arg5758_6, Arg5758_7, Arg5758_8, Arg5758_9], function(Arg5760) {
  var Arg5760_0 = Arg5760[0], Arg5760_1 = Arg5760[1], Arg5760_2 = Arg5760[2], Arg5760_3 = Arg5760[3], Arg5760_4 = Arg5760[4], Arg5760_5 = Arg5760[5], Arg5760_6 = Arg5760[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5760_1, Arg5760_2, Arg5760_3, Arg5760_4, Arg5760_5, Arg5760_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R6, Arg5700_4]),
  R9)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? ((R9 = shenjs_call(shen_newpv, [Arg5700_4])),
  shenjs_call(shen_bindv, [R6, [shen_type_cons, R9, []], Arg5700_4]),
  (R9 = ((R5 = R5[2]),
  (R10 = shenjs_call(shen_newpv, [Arg5700_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R9, R4, Arg5700_4, (new Shenjs_freeze([R4, R2, R7, R9, R10, R0, R1, R3, R5, Arg5700_3, Arg5700_4, Arg5700_5, R6, Arg5700_4, R8, Arg5700_4], function(Arg5762) {
  var Arg5762_0 = Arg5762[0], Arg5762_1 = Arg5762[1], Arg5762_2 = Arg5762[2], Arg5762_3 = Arg5762[3], Arg5762_4 = Arg5762[4], Arg5762_5 = Arg5762[5], Arg5762_6 = Arg5762[6], Arg5762_7 = Arg5762[7], Arg5762_8 = Arg5762[8], Arg5762_9 = Arg5762[9], Arg5762_10 = Arg5762[10], Arg5762_11 = Arg5762[11], Arg5762_12 = Arg5762[12], Arg5762_13 = Arg5762[13], Arg5762_14 = Arg5762[14], Arg5762_15 = Arg5762[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5762_2, Arg5762_1, Arg5762_10, (new Shenjs_freeze([Arg5762_1, Arg5762_2, Arg5762_3, Arg5762_4, Arg5762_5, Arg5762_6, Arg5762_7, Arg5762_8, Arg5762_9, Arg5762_10, Arg5762_11], function(Arg5764) {
  var Arg5764_0 = Arg5764[0], Arg5764_1 = Arg5764[1], Arg5764_2 = Arg5764[2], Arg5764_3 = Arg5764[3], Arg5764_4 = Arg5764[4], Arg5764_5 = Arg5764[5], Arg5764_6 = Arg5764[6], Arg5764_7 = Arg5764[7], Arg5764_8 = Arg5764[8], Arg5764_9 = Arg5764[9], Arg5764_10 = Arg5764[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5764_1, Arg5764_3, Arg5764_9, (new Shenjs_freeze([Arg5764_1, Arg5764_2, Arg5764_3, Arg5764_4, Arg5764_5, Arg5764_6, Arg5764_7, Arg5764_8, Arg5764_9, Arg5764_10], function(Arg5766) {
  var Arg5766_0 = Arg5766[0], Arg5766_1 = Arg5766[1], Arg5766_2 = Arg5766[2], Arg5766_3 = Arg5766[3], Arg5766_4 = Arg5766[4], Arg5766_5 = Arg5766[5], Arg5766_6 = Arg5766[6], Arg5766_7 = Arg5766[7], Arg5766_8 = Arg5766[8], Arg5766_9 = Arg5766[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5766_3, Arg5766_8, (new Shenjs_freeze([Arg5766_0, Arg5766_1, Arg5766_2, Arg5766_3, Arg5766_4, Arg5766_5, Arg5766_6, Arg5766_7, Arg5766_8, Arg5766_9], function(Arg5768) {
  var Arg5768_0 = Arg5768[0], Arg5768_1 = Arg5768[1], Arg5768_2 = Arg5768[2], Arg5768_3 = Arg5768[3], Arg5768_4 = Arg5768[4], Arg5768_5 = Arg5768[5], Arg5768_6 = Arg5768[6], Arg5768_7 = Arg5768[7], Arg5768_8 = Arg5768[8], Arg5768_9 = Arg5768[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5768_0, Arg5768_1, Arg5768_2, Arg5768_8, (new Shenjs_freeze([Arg5768_0, Arg5768_1, Arg5768_2, Arg5768_3, Arg5768_4, Arg5768_5, Arg5768_6, Arg5768_7, Arg5768_8, Arg5768_9], function(Arg5770) {
  var Arg5770_0 = Arg5770[0], Arg5770_1 = Arg5770[1], Arg5770_2 = Arg5770[2], Arg5770_3 = Arg5770[3], Arg5770_4 = Arg5770[4], Arg5770_5 = Arg5770[5], Arg5770_6 = Arg5770[6], Arg5770_7 = Arg5770[7], Arg5770_8 = Arg5770[8], Arg5770_9 = Arg5770[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5770_3, Arg5770_8, (new Shenjs_freeze([Arg5770_3, Arg5770_4, Arg5770_5, Arg5770_6, Arg5770_7, Arg5770_8, Arg5770_9], function(Arg5772) {
  var Arg5772_0 = Arg5772[0], Arg5772_1 = Arg5772[1], Arg5772_2 = Arg5772[2], Arg5772_3 = Arg5772[3], Arg5772_4 = Arg5772[4], Arg5772_5 = Arg5772[5], Arg5772_6 = Arg5772[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5772_1, Arg5772_2, Arg5772_3, Arg5772_4, Arg5772_5, Arg5772_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R6, Arg5700_4]),
  R9)
  : false)))),
  shenjs_call(shen_unbindv, [R8, Arg5700_4]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? ((R8 = shenjs_call(shen_newpv, [Arg5700_4])),
  shenjs_call(shen_bindv, [R6, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, R8, []]], Arg5700_4]),
  (R8 = ((R5 = R5[2]),
  (R9 = shenjs_call(shen_newpv, [Arg5700_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R8, R4, Arg5700_4, (new Shenjs_freeze([R4, R2, R7, R8, R9, R0, R1, R3, R5, Arg5700_3, Arg5700_4, Arg5700_5, R6, Arg5700_4], function(Arg5774) {
  var Arg5774_0 = Arg5774[0], Arg5774_1 = Arg5774[1], Arg5774_2 = Arg5774[2], Arg5774_3 = Arg5774[3], Arg5774_4 = Arg5774[4], Arg5774_5 = Arg5774[5], Arg5774_6 = Arg5774[6], Arg5774_7 = Arg5774[7], Arg5774_8 = Arg5774[8], Arg5774_9 = Arg5774[9], Arg5774_10 = Arg5774[10], Arg5774_11 = Arg5774[11], Arg5774_12 = Arg5774[12], Arg5774_13 = Arg5774[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5774_2, Arg5774_1, Arg5774_10, (new Shenjs_freeze([Arg5774_1, Arg5774_2, Arg5774_3, Arg5774_4, Arg5774_5, Arg5774_6, Arg5774_7, Arg5774_8, Arg5774_9, Arg5774_10, Arg5774_11], function(Arg5776) {
  var Arg5776_0 = Arg5776[0], Arg5776_1 = Arg5776[1], Arg5776_2 = Arg5776[2], Arg5776_3 = Arg5776[3], Arg5776_4 = Arg5776[4], Arg5776_5 = Arg5776[5], Arg5776_6 = Arg5776[6], Arg5776_7 = Arg5776[7], Arg5776_8 = Arg5776[8], Arg5776_9 = Arg5776[9], Arg5776_10 = Arg5776[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5776_1, Arg5776_3, Arg5776_9, (new Shenjs_freeze([Arg5776_1, Arg5776_2, Arg5776_3, Arg5776_4, Arg5776_5, Arg5776_6, Arg5776_7, Arg5776_8, Arg5776_9, Arg5776_10], function(Arg5778) {
  var Arg5778_0 = Arg5778[0], Arg5778_1 = Arg5778[1], Arg5778_2 = Arg5778[2], Arg5778_3 = Arg5778[3], Arg5778_4 = Arg5778[4], Arg5778_5 = Arg5778[5], Arg5778_6 = Arg5778[6], Arg5778_7 = Arg5778[7], Arg5778_8 = Arg5778[8], Arg5778_9 = Arg5778[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5778_3, Arg5778_8, (new Shenjs_freeze([Arg5778_0, Arg5778_1, Arg5778_2, Arg5778_3, Arg5778_4, Arg5778_5, Arg5778_6, Arg5778_7, Arg5778_8, Arg5778_9], function(Arg5780) {
  var Arg5780_0 = Arg5780[0], Arg5780_1 = Arg5780[1], Arg5780_2 = Arg5780[2], Arg5780_3 = Arg5780[3], Arg5780_4 = Arg5780[4], Arg5780_5 = Arg5780[5], Arg5780_6 = Arg5780[6], Arg5780_7 = Arg5780[7], Arg5780_8 = Arg5780[8], Arg5780_9 = Arg5780[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5780_0, Arg5780_1, Arg5780_2, Arg5780_8, (new Shenjs_freeze([Arg5780_0, Arg5780_1, Arg5780_2, Arg5780_3, Arg5780_4, Arg5780_5, Arg5780_6, Arg5780_7, Arg5780_8, Arg5780_9], function(Arg5782) {
  var Arg5782_0 = Arg5782[0], Arg5782_1 = Arg5782[1], Arg5782_2 = Arg5782[2], Arg5782_3 = Arg5782[3], Arg5782_4 = Arg5782[4], Arg5782_5 = Arg5782[5], Arg5782_6 = Arg5782[6], Arg5782_7 = Arg5782[7], Arg5782_8 = Arg5782[8], Arg5782_9 = Arg5782[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5782_3, Arg5782_8, (new Shenjs_freeze([Arg5782_3, Arg5782_4, Arg5782_5, Arg5782_6, Arg5782_7, Arg5782_8, Arg5782_9], function(Arg5784) {
  var Arg5784_0 = Arg5784[0], Arg5784_1 = Arg5784[1], Arg5784_2 = Arg5784[2], Arg5784_3 = Arg5784[3], Arg5784_4 = Arg5784[4], Arg5784_5 = Arg5784[5], Arg5784_6 = Arg5784[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5784_1, Arg5784_2, Arg5784_3, Arg5784_4, Arg5784_5, Arg5784_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R6, Arg5700_4]),
  R8)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? ((R7 = shenjs_call(shen_newpv, [Arg5700_4])),
  (R8 = shenjs_call(shen_newpv, [Arg5700_4])),
  shenjs_call(shen_bindv, [R6, [shen_type_cons, R7, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, R8, []]]], Arg5700_4]),
  (R8 = ((R5 = R5[2]),
  (R9 = shenjs_call(shen_newpv, [Arg5700_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R8, R4, Arg5700_4, (new Shenjs_freeze([R4, R2, R7, R8, R9, R0, R1, R3, R5, Arg5700_3, Arg5700_4, Arg5700_5, R6, Arg5700_4], function(Arg5786) {
  var Arg5786_0 = Arg5786[0], Arg5786_1 = Arg5786[1], Arg5786_2 = Arg5786[2], Arg5786_3 = Arg5786[3], Arg5786_4 = Arg5786[4], Arg5786_5 = Arg5786[5], Arg5786_6 = Arg5786[6], Arg5786_7 = Arg5786[7], Arg5786_8 = Arg5786[8], Arg5786_9 = Arg5786[9], Arg5786_10 = Arg5786[10], Arg5786_11 = Arg5786[11], Arg5786_12 = Arg5786[12], Arg5786_13 = Arg5786[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5786_2, Arg5786_1, Arg5786_10, (new Shenjs_freeze([Arg5786_1, Arg5786_2, Arg5786_3, Arg5786_4, Arg5786_5, Arg5786_6, Arg5786_7, Arg5786_8, Arg5786_9, Arg5786_10, Arg5786_11], function(Arg5788) {
  var Arg5788_0 = Arg5788[0], Arg5788_1 = Arg5788[1], Arg5788_2 = Arg5788[2], Arg5788_3 = Arg5788[3], Arg5788_4 = Arg5788[4], Arg5788_5 = Arg5788[5], Arg5788_6 = Arg5788[6], Arg5788_7 = Arg5788[7], Arg5788_8 = Arg5788[8], Arg5788_9 = Arg5788[9], Arg5788_10 = Arg5788[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5788_1, Arg5788_3, Arg5788_9, (new Shenjs_freeze([Arg5788_1, Arg5788_2, Arg5788_3, Arg5788_4, Arg5788_5, Arg5788_6, Arg5788_7, Arg5788_8, Arg5788_9, Arg5788_10], function(Arg5790) {
  var Arg5790_0 = Arg5790[0], Arg5790_1 = Arg5790[1], Arg5790_2 = Arg5790[2], Arg5790_3 = Arg5790[3], Arg5790_4 = Arg5790[4], Arg5790_5 = Arg5790[5], Arg5790_6 = Arg5790[6], Arg5790_7 = Arg5790[7], Arg5790_8 = Arg5790[8], Arg5790_9 = Arg5790[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5790_3, Arg5790_8, (new Shenjs_freeze([Arg5790_0, Arg5790_1, Arg5790_2, Arg5790_3, Arg5790_4, Arg5790_5, Arg5790_6, Arg5790_7, Arg5790_8, Arg5790_9], function(Arg5792) {
  var Arg5792_0 = Arg5792[0], Arg5792_1 = Arg5792[1], Arg5792_2 = Arg5792[2], Arg5792_3 = Arg5792[3], Arg5792_4 = Arg5792[4], Arg5792_5 = Arg5792[5], Arg5792_6 = Arg5792[6], Arg5792_7 = Arg5792[7], Arg5792_8 = Arg5792[8], Arg5792_9 = Arg5792[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5792_0, Arg5792_1, Arg5792_2, Arg5792_8, (new Shenjs_freeze([Arg5792_0, Arg5792_1, Arg5792_2, Arg5792_3, Arg5792_4, Arg5792_5, Arg5792_6, Arg5792_7, Arg5792_8, Arg5792_9], function(Arg5794) {
  var Arg5794_0 = Arg5794[0], Arg5794_1 = Arg5794[1], Arg5794_2 = Arg5794[2], Arg5794_3 = Arg5794[3], Arg5794_4 = Arg5794[4], Arg5794_5 = Arg5794[5], Arg5794_6 = Arg5794[6], Arg5794_7 = Arg5794[7], Arg5794_8 = Arg5794[8], Arg5794_9 = Arg5794[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5794_3, Arg5794_8, (new Shenjs_freeze([Arg5794_3, Arg5794_4, Arg5794_5, Arg5794_6, Arg5794_7, Arg5794_8, Arg5794_9], function(Arg5796) {
  var Arg5796_0 = Arg5796[0], Arg5796_1 = Arg5796[1], Arg5796_2 = Arg5796[2], Arg5796_3 = Arg5796[3], Arg5796_4 = Arg5796[4], Arg5796_5 = Arg5796[5], Arg5796_6 = Arg5796[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5796_1, Arg5796_2, Arg5796_3, Arg5796_4, Arg5796_5, Arg5796_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R6, Arg5700_4]),
  R8)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5700_4])),
  (R7 = shenjs_call(shen_newpv, [Arg5700_4])),
  (R8 = shenjs_call(shen_newpv, [Arg5700_4])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, [shen_type_cons, R6, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, R7, []]]], R8], Arg5700_4]),
  (R8 = ((R9 = shenjs_call(shen_newpv, [Arg5700_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R7, R4, Arg5700_4, (new Shenjs_freeze([R4, R2, R6, R7, R9, R0, R1, R3, R8, Arg5700_3, Arg5700_4, Arg5700_5, R5, Arg5700_4], function(Arg5798) {
  var Arg5798_0 = Arg5798[0], Arg5798_1 = Arg5798[1], Arg5798_2 = Arg5798[2], Arg5798_3 = Arg5798[3], Arg5798_4 = Arg5798[4], Arg5798_5 = Arg5798[5], Arg5798_6 = Arg5798[6], Arg5798_7 = Arg5798[7], Arg5798_8 = Arg5798[8], Arg5798_9 = Arg5798[9], Arg5798_10 = Arg5798[10], Arg5798_11 = Arg5798[11], Arg5798_12 = Arg5798[12], Arg5798_13 = Arg5798[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5798_2, Arg5798_1, Arg5798_10, (new Shenjs_freeze([Arg5798_1, Arg5798_2, Arg5798_3, Arg5798_4, Arg5798_5, Arg5798_6, Arg5798_7, Arg5798_8, Arg5798_9, Arg5798_10, Arg5798_11], function(Arg5800) {
  var Arg5800_0 = Arg5800[0], Arg5800_1 = Arg5800[1], Arg5800_2 = Arg5800[2], Arg5800_3 = Arg5800[3], Arg5800_4 = Arg5800[4], Arg5800_5 = Arg5800[5], Arg5800_6 = Arg5800[6], Arg5800_7 = Arg5800[7], Arg5800_8 = Arg5800[8], Arg5800_9 = Arg5800[9], Arg5800_10 = Arg5800[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5800_1, Arg5800_3, Arg5800_9, (new Shenjs_freeze([Arg5800_1, Arg5800_2, Arg5800_3, Arg5800_4, Arg5800_5, Arg5800_6, Arg5800_7, Arg5800_8, Arg5800_9, Arg5800_10], function(Arg5802) {
  var Arg5802_0 = Arg5802[0], Arg5802_1 = Arg5802[1], Arg5802_2 = Arg5802[2], Arg5802_3 = Arg5802[3], Arg5802_4 = Arg5802[4], Arg5802_5 = Arg5802[5], Arg5802_6 = Arg5802[6], Arg5802_7 = Arg5802[7], Arg5802_8 = Arg5802[8], Arg5802_9 = Arg5802[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5802_3, Arg5802_8, (new Shenjs_freeze([Arg5802_0, Arg5802_1, Arg5802_2, Arg5802_3, Arg5802_4, Arg5802_5, Arg5802_6, Arg5802_7, Arg5802_8, Arg5802_9], function(Arg5804) {
  var Arg5804_0 = Arg5804[0], Arg5804_1 = Arg5804[1], Arg5804_2 = Arg5804[2], Arg5804_3 = Arg5804[3], Arg5804_4 = Arg5804[4], Arg5804_5 = Arg5804[5], Arg5804_6 = Arg5804[6], Arg5804_7 = Arg5804[7], Arg5804_8 = Arg5804[8], Arg5804_9 = Arg5804[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5804_0, Arg5804_1, Arg5804_2, Arg5804_8, (new Shenjs_freeze([Arg5804_0, Arg5804_1, Arg5804_2, Arg5804_3, Arg5804_4, Arg5804_5, Arg5804_6, Arg5804_7, Arg5804_8, Arg5804_9], function(Arg5806) {
  var Arg5806_0 = Arg5806[0], Arg5806_1 = Arg5806[1], Arg5806_2 = Arg5806[2], Arg5806_3 = Arg5806[3], Arg5806_4 = Arg5806[4], Arg5806_5 = Arg5806[5], Arg5806_6 = Arg5806[6], Arg5806_7 = Arg5806[7], Arg5806_8 = Arg5806[8], Arg5806_9 = Arg5806[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5806_3, Arg5806_8, (new Shenjs_freeze([Arg5806_3, Arg5806_4, Arg5806_5, Arg5806_6, Arg5806_7, Arg5806_8, Arg5806_9], function(Arg5808) {
  var Arg5808_0 = Arg5808[0], Arg5808_1 = Arg5808[1], Arg5808_2 = Arg5808[2], Arg5808_3 = Arg5808[3], Arg5808_4 = Arg5808[4], Arg5808_5 = Arg5808[5], Arg5808_6 = Arg5808[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5808_1, Arg5808_2, Arg5808_3, Arg5808_4, Arg5808_5, Arg5808_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg5700_4]),
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
  function shen_user_lambda5811(Arg5810) {
  if (Arg5810.length < 4) return [shen_type_func, shen_user_lambda5811, 4, Arg5810];
  var Arg5810_0 = Arg5810[0], Arg5810_1 = Arg5810[1], Arg5810_2 = Arg5810[2], Arg5810_3 = Arg5810[3];
  var R0, R1, R2, R3, R4;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R0 = ((R1 = shenjs_call(shen_lazyderef, [Arg5810_0, Arg5810_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = R1[2]),
  (R3 = shenjs_call(shen_newpv, [Arg5810_2])),
  (R4 = shenjs_call(shen_newpv, [Arg5810_2])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5810_2, (new Shenjs_freeze([R0, R2, R1, Arg5810_1, R3, R4, Arg5810_2, Arg5810_3, Arg5810_0, Arg5810_1, Arg5810_3, Arg5810_2], function(Arg5812) {
  var Arg5812_0 = Arg5812[0], Arg5812_1 = Arg5812[1], Arg5812_2 = Arg5812[2], Arg5812_3 = Arg5812[3], Arg5812_4 = Arg5812[4], Arg5812_5 = Arg5812[5], Arg5812_6 = Arg5812[6], Arg5812_7 = Arg5812[7], Arg5812_8 = Arg5812[8], Arg5812_9 = Arg5812[9], Arg5812_10 = Arg5812[10], Arg5812_11 = Arg5812[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5812_1, Arg5812_4, Arg5812_6, (new Shenjs_freeze([Arg5812_1, Arg5812_2, Arg5812_3, Arg5812_4, Arg5812_5, Arg5812_6, Arg5812_7], function(Arg5814) {
  var Arg5814_0 = Arg5814[0], Arg5814_1 = Arg5814[1], Arg5814_2 = Arg5814[2], Arg5814_3 = Arg5814[3], Arg5814_4 = Arg5814[4], Arg5814_5 = Arg5814[5], Arg5814_6 = Arg5814[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5814_1, Arg5814_4, Arg5814_5, (new Shenjs_freeze([Arg5814_1, Arg5814_2, Arg5814_3, Arg5814_4, Arg5814_5, Arg5814_6], function(Arg5816) {
  var Arg5816_0 = Arg5816[0], Arg5816_1 = Arg5816[1], Arg5816_2 = Arg5816[2], Arg5816_3 = Arg5816[3], Arg5816_4 = Arg5816[4], Arg5816_5 = Arg5816[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5816_1, shenjs_call(shen_append, [shenjs_call(shen_lazyderef, [Arg5816_2, Arg5816_4]), shenjs_call(shen_lazyderef, [Arg5816_3, Arg5816_4])]), Arg5816_4, Arg5816_5]);});})}))]);});})}))]);});})}))]))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = ((R0 = shenjs_call(shen_newpv, [Arg5810_2])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_call(shen_placeholder$question$, [shenjs_call(shen_lazyderef, [Arg5810_0, Arg5810_2])]), Arg5810_2, (new Shenjs_freeze([Arg5810_1, Arg5810_0, R0, Arg5810_2, Arg5810_3, Arg5810_1, Arg5810_3, Arg5810_2], function(Arg5818) {
  var Arg5818_0 = Arg5818[0], Arg5818_1 = Arg5818[1], Arg5818_2 = Arg5818[2], Arg5818_3 = Arg5818[3], Arg5818_4 = Arg5818[4], Arg5818_5 = Arg5818[5], Arg5818_6 = Arg5818[6], Arg5818_7 = Arg5818[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5818_0, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [Arg5818_1, Arg5818_3]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [Arg5818_2, Arg5818_3]), []]]], []], Arg5818_3, Arg5818_4]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5810_1, Arg5810_2])),
  ((shenjs_empty$question$(R0))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5810_3)))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [], Arg5810_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5810_3)))),
  shenjs_call(shen_unbindv, [R0, Arg5810_2]),
  R1)
  : false)))
  : R0))
  : R0))]);}))},
  4,
  [],
  "shen-t*-assume"];
shenjs_functions["shen_shen-t*-assume"] = shen_t$asterisk$_assume;






shen_conc = [shen_type_func,
  function shen_user_lambda5821(Arg5820) {
  if (Arg5820.length < 5) return [shen_type_func, shen_user_lambda5821, 5, Arg5820];
  var Arg5820_0 = Arg5820[0], Arg5820_1 = Arg5820[1], Arg5820_2 = Arg5820[2], Arg5820_3 = Arg5820[3], Arg5820_4 = Arg5820[4];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5820_0, Arg5820_3])),
  ((shenjs_empty$question$(R0))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5820_2, shenjs_call(shen_lazyderef, [Arg5820_1, Arg5820_3]), Arg5820_3, Arg5820_4]))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5820_0, Arg5820_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = R0[1]),
  (R0 = R0[2]),
  (R2 = shenjs_call(shen_newpv, [Arg5820_3])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [Arg5820_2, [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5820_3]), shenjs_call(shen_lazyderef, [R2, Arg5820_3])], Arg5820_3, (new Shenjs_freeze([Arg5820_2, R1, R0, Arg5820_1, R2, Arg5820_3, Arg5820_4], function(Arg5822) {
  var Arg5822_0 = Arg5822[0], Arg5822_1 = Arg5822[1], Arg5822_2 = Arg5822[2], Arg5822_3 = Arg5822[3], Arg5822_4 = Arg5822[4], Arg5822_5 = Arg5822[5], Arg5822_6 = Arg5822[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_conc, [Arg5822_2, Arg5822_3, Arg5822_4, Arg5822_5, Arg5822_6]);});})}))]);}))
  : false))
  : R0))},
  5,
  [],
  "shen-conc"];
shenjs_functions["shen_shen-conc"] = shen_conc;






shen_findallhelp = [shen_type_func,
  function shen_user_lambda5825(Arg5824) {
  if (Arg5824.length < 6) return [shen_type_func, shen_user_lambda5825, 6, Arg5824];
  var Arg5824_0 = Arg5824[0], Arg5824_1 = Arg5824[1], Arg5824_2 = Arg5824[2], Arg5824_3 = Arg5824[3], Arg5824_4 = Arg5824[4], Arg5824_5 = Arg5824[5];
  var R0;
  return ((R0 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_call, [Arg5824_1, Arg5824_4, (new Shenjs_freeze([Arg5824_1, Arg5824_0, Arg5824_2, Arg5824_3, Arg5824_4, Arg5824_5], function(Arg5826) {
  var Arg5826_0 = Arg5826[0], Arg5826_1 = Arg5826[1], Arg5826_2 = Arg5826[2], Arg5826_3 = Arg5826[3], Arg5826_4 = Arg5826[4], Arg5826_5 = Arg5826[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_remember, [Arg5826_3, Arg5826_1, Arg5826_4, (new Shenjs_freeze([Arg5826_3, Arg5826_1, Arg5826_4, Arg5826_5], function(Arg5828) {
  var Arg5828_0 = Arg5828[0], Arg5828_1 = Arg5828[1], Arg5828_2 = Arg5828[2], Arg5828_3 = Arg5828[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [false, Arg5828_2, Arg5828_3]);});})}))]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? (shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [Arg5824_2, (shenjs_globals["shen_" + shenjs_call(shen_lazyderef, [Arg5824_3, Arg5824_4])[1]]), Arg5824_4, Arg5824_5]);}))
  : R0))},
  6,
  [],
  "shen-findallhelp"];
shenjs_functions["shen_shen-findallhelp"] = shen_findallhelp;






shen_remember = [shen_type_func,
  function shen_user_lambda5831(Arg5830) {
  if (Arg5830.length < 4) return [shen_type_func, shen_user_lambda5831, 4, Arg5830];
  var Arg5830_0 = Arg5830[0], Arg5830_1 = Arg5830[1], Arg5830_2 = Arg5830[2], Arg5830_3 = Arg5830[3];
  var R0;
  return ((R0 = shenjs_call(shen_newpv, [Arg5830_2])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [R0, (shenjs_globals["shen_" + shenjs_call(shen_deref, [Arg5830_0, Arg5830_2])[1]] = [shen_type_cons, shenjs_call(shen_deref, [Arg5830_1, Arg5830_2]), (shenjs_globals["shen_" + shenjs_call(shen_deref, [Arg5830_0, Arg5830_2])[1]])]), Arg5830_2, Arg5830_3]);}))},
  4,
  [],
  "shen-remember"];
shenjs_functions["shen_shen-remember"] = shen_remember;






shen_findall = [shen_type_func,
  function shen_user_lambda5833(Arg5832) {
  if (Arg5832.length < 5) return [shen_type_func, shen_user_lambda5833, 5, Arg5832];
  var Arg5832_0 = Arg5832[0], Arg5832_1 = Arg5832[1], Arg5832_2 = Arg5832[2], Arg5832_3 = Arg5832[3], Arg5832_4 = Arg5832[4];
  var R0, R1;
  return ((R0 = shenjs_call(shen_newpv, [Arg5832_3])),
  (R1 = shenjs_call(shen_newpv, [Arg5832_3])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [R1, shenjs_call(shen_gensym, [[shen_type_symbol, "a"]]), Arg5832_3, (new Shenjs_freeze([R0, Arg5832_0, Arg5832_1, Arg5832_2, R1, Arg5832_3, Arg5832_4], function(Arg5834) {
  var Arg5834_0 = Arg5834[0], Arg5834_1 = Arg5834[1], Arg5834_2 = Arg5834[2], Arg5834_3 = Arg5834[3], Arg5834_4 = Arg5834[4], Arg5834_5 = Arg5834[5], Arg5834_6 = Arg5834[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5834_0, (shenjs_globals["shen_" + shenjs_call(shen_lazyderef, [Arg5834_4, Arg5834_5])[1]] = []), Arg5834_5, (new Shenjs_freeze([Arg5834_0, Arg5834_1, Arg5834_2, Arg5834_3, Arg5834_4, Arg5834_5, Arg5834_6], function(Arg5836) {
  var Arg5836_0 = Arg5836[0], Arg5836_1 = Arg5836[1], Arg5836_2 = Arg5836[2], Arg5836_3 = Arg5836[3], Arg5836_4 = Arg5836[4], Arg5836_5 = Arg5836[5], Arg5836_6 = Arg5836[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_findallhelp, [Arg5836_1, Arg5836_2, Arg5836_3, Arg5836_4, Arg5836_5, Arg5836_6]);});})}))]);});})}))]);}))},
  5,
  [],
  "findall"];
shenjs_functions["shen_findall"] = shen_findall;






shen_findallhelp = [shen_type_func,
  function shen_user_lambda5839(Arg5838) {
  if (Arg5838.length < 6) return [shen_type_func, shen_user_lambda5839, 6, Arg5838];
  var Arg5838_0 = Arg5838[0], Arg5838_1 = Arg5838[1], Arg5838_2 = Arg5838[2], Arg5838_3 = Arg5838[3], Arg5838_4 = Arg5838[4], Arg5838_5 = Arg5838[5];
  var R0;
  return ((R0 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_call, [Arg5838_1, Arg5838_4, (new Shenjs_freeze([Arg5838_1, Arg5838_0, Arg5838_2, Arg5838_3, Arg5838_4, Arg5838_5], function(Arg5840) {
  var Arg5840_0 = Arg5840[0], Arg5840_1 = Arg5840[1], Arg5840_2 = Arg5840[2], Arg5840_3 = Arg5840[3], Arg5840_4 = Arg5840[4], Arg5840_5 = Arg5840[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_remember, [Arg5840_3, Arg5840_1, Arg5840_4, (new Shenjs_freeze([Arg5840_3, Arg5840_1, Arg5840_4, Arg5840_5], function(Arg5842) {
  var Arg5842_0 = Arg5842[0], Arg5842_1 = Arg5842[1], Arg5842_2 = Arg5842[2], Arg5842_3 = Arg5842[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [false, Arg5842_2, Arg5842_3]);});})}))]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? (shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [Arg5838_2, (shenjs_globals["shen_" + shenjs_call(shen_lazyderef, [Arg5838_3, Arg5838_4])[1]]), Arg5838_4, Arg5838_5]);}))
  : R0))},
  6,
  [],
  "shen-findallhelp"];
shenjs_functions["shen_shen-findallhelp"] = shen_findallhelp;






shen_remember = [shen_type_func,
  function shen_user_lambda5845(Arg5844) {
  if (Arg5844.length < 4) return [shen_type_func, shen_user_lambda5845, 4, Arg5844];
  var Arg5844_0 = Arg5844[0], Arg5844_1 = Arg5844[1], Arg5844_2 = Arg5844[2], Arg5844_3 = Arg5844[3];
  var R0;
  return ((R0 = shenjs_call(shen_newpv, [Arg5844_2])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [R0, (shenjs_globals["shen_" + shenjs_call(shen_deref, [Arg5844_0, Arg5844_2])[1]] = [shen_type_cons, shenjs_call(shen_deref, [Arg5844_1, Arg5844_2]), (shenjs_globals["shen_" + shenjs_call(shen_deref, [Arg5844_0, Arg5844_2])[1]])]), Arg5844_2, Arg5844_3]);}))},
  4,
  [],
  "shen-remember"];
shenjs_functions["shen_shen-remember"] = shen_remember;












shen_shen = [shen_type_func,
  function shen_user_lambda5272(Arg5271) {
  if (Arg5271.length < 0) return [shen_type_func, shen_user_lambda5272, 0, Arg5271];
  return (shenjs_call(shen_credits, []),
  (function() {
  return shenjs_call_tail(shen_loop, []);}))},
  0,
  [],
  "shen-shen"];
shenjs_functions["shen_shen-shen"] = shen_shen;






shen_loop = [shen_type_func,
  function shen_user_lambda5274(Arg5273) {
  if (Arg5273.length < 0) return [shen_type_func, shen_user_lambda5274, 0, Arg5273];
  return (shenjs_call(shen_initialise$_environment, []),
  shenjs_call(shen_prompt, []),
  shenjs_trap_error(function() {return shenjs_call(shen_read_evaluate_print, []);}, [shen_type_func,
  function shen_user_lambda5276(Arg5275) {
  if (Arg5275.length < 1) return [shen_type_func, shen_user_lambda5276, 1, Arg5275];
  var Arg5275_0 = Arg5275[0];
  return (function() {
  return shenjs_pr(shenjs_error_to_string(Arg5275_0), (shenjs_globals["shen_*stinput*"]));})},
  1,
  []]),
  (function() {
  return shenjs_call_tail(shen_loop, []);}))},
  0,
  [],
  "shen-loop"];
shenjs_functions["shen_shen-loop"] = shen_loop;






shen_version = [shen_type_func,
  function shen_user_lambda5278(Arg5277) {
  if (Arg5277.length < 1) return [shen_type_func, shen_user_lambda5278, 1, Arg5277];
  var Arg5277_0 = Arg5277[0];
  return (shenjs_globals["shen_*version*"] = Arg5277_0)},
  1,
  [],
  "version"];
shenjs_functions["shen_version"] = shen_version;






shenjs_call(shen_version, ["version 6.0"]);





shen_credits = [shen_type_func,
  function shen_user_lambda5281(Arg5280) {
  if (Arg5280.length < 0) return [shen_type_func, shen_user_lambda5281, 0, Arg5280];
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
  function shen_user_lambda5283(Arg5282) {
  if (Arg5282.length < 0) return [shen_type_func, shen_user_lambda5283, 0, Arg5282];
  return (function() {
  return shenjs_call_tail(shen_multiple_set, [[shen_type_cons, [shen_type_symbol, "shen-*call*"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "shen-*infs*"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "shen-*dumped*"], [shen_type_cons, [], [shen_type_cons, [shen_type_symbol, "shen-*process-counter*"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "shen-*catch*"], [shen_type_cons, 0, []]]]]]]]]]]]);})},
  0,
  [],
  "shen-initialise_environment"];
shenjs_functions["shen_shen-initialise_environment"] = shen_initialise$_environment;






shen_multiple_set = [shen_type_func,
  function shen_user_lambda5285(Arg5284) {
  if (Arg5284.length < 1) return [shen_type_func, shen_user_lambda5285, 1, Arg5284];
  var Arg5284_0 = Arg5284[0];
  return ((shenjs_empty$question$(Arg5284_0))
  ? []
  : (((shenjs_is_type(Arg5284_0, shen_type_cons) && shenjs_is_type(Arg5284_0[2], shen_type_cons)))
  ? ((shenjs_globals["shen_" + Arg5284_0[1][1]] = Arg5284_0[2][1]),
  (function() {
  return shenjs_call_tail(shen_multiple_set, [Arg5284_0[2][2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-multiple-set"]]);})))},
  1,
  [],
  "shen-multiple-set"];
shenjs_functions["shen_shen-multiple-set"] = shen_multiple_set;






shen_destroy = [shen_type_func,
  function shen_user_lambda5287(Arg5286) {
  if (Arg5286.length < 1) return [shen_type_func, shen_user_lambda5287, 1, Arg5286];
  var Arg5286_0 = Arg5286[0];
  return (function() {
  return shenjs_call_tail(shen_declare, [Arg5286_0, []]);})},
  1,
  [],
  "destroy"];
shenjs_functions["shen_destroy"] = shen_destroy;






(shenjs_globals["shen_shen-*history*"] = []);






shen_read_evaluate_print = [shen_type_func,
  function shen_user_lambda5290(Arg5289) {
  if (Arg5289.length < 0) return [shen_type_func, shen_user_lambda5290, 0, Arg5289];
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
  function shen_user_lambda5292(Arg5291) {
  if (Arg5291.length < 2) return [shen_type_func, shen_user_lambda5292, 2, Arg5291];
  var Arg5291_0 = Arg5291[0], Arg5291_1 = Arg5291[1];
  var R0;
  return (((shenjs_is_type(Arg5291_0, shen_tuple) && (shenjs_is_type(shenjs_call(shen_snd, [Arg5291_0]), shen_type_cons) && (shenjs_is_type(shenjs_call(shen_snd, [Arg5291_0])[2], shen_type_cons) && (shenjs_empty$question$(shenjs_call(shen_snd, [Arg5291_0])[2][2]) && (shenjs_is_type(Arg5291_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg5291_0])[1], shenjs_call(shen_exclamation, []))) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg5291_0])[2][1], shenjs_call(shen_exclamation, []))))))))))
  ? (shenjs_call(shen_prbytes, [shenjs_call(shen_snd, [Arg5291_1[1]])]),
  Arg5291_1[1])
  : (((shenjs_is_type(Arg5291_0, shen_tuple) && (shenjs_is_type(shenjs_call(shen_snd, [Arg5291_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg5291_0])[1], shenjs_call(shen_exclamation, []))))))
  ? ((R0 = shenjs_call(shen_make_key, [shenjs_call(shen_snd, [Arg5291_0])[2], Arg5291_1])),
  (R0 = shenjs_call(shen_head, [shenjs_call(shen_find_past_inputs, [R0, Arg5291_1])])),
  shenjs_call(shen_prbytes, [shenjs_call(shen_snd, [R0])]),
  R0)
  : (((shenjs_is_type(Arg5291_0, shen_tuple) && (shenjs_is_type(shenjs_call(shen_snd, [Arg5291_0]), shen_type_cons) && (shenjs_empty$question$(shenjs_call(shen_snd, [Arg5291_0])[2]) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg5291_0])[1], shenjs_call(shen_percent, [])))))))
  ? (shenjs_call(shen_print_past_inputs, [[shen_type_func,
  function shen_user_lambda5294(Arg5293) {
  if (Arg5293.length < 1) return [shen_type_func, shen_user_lambda5294, 1, Arg5293];
  var Arg5293_0 = Arg5293[0];
  return true},
  1,
  []], shenjs_call(shen_reverse, [Arg5291_1]), 0]),
  (function() {
  return shenjs_call_tail(shen_abort, []);}))
  : (((shenjs_is_type(Arg5291_0, shen_tuple) && (shenjs_is_type(shenjs_call(shen_snd, [Arg5291_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg5291_0])[1], shenjs_call(shen_percent, []))))))
  ? ((R0 = shenjs_call(shen_make_key, [shenjs_call(shen_snd, [Arg5291_0])[2], Arg5291_1])),
  shenjs_call(shen_print_past_inputs, [R0, shenjs_call(shen_reverse, [Arg5291_1]), 0]),
  (function() {
  return shenjs_call_tail(shen_abort, []);}))
  : Arg5291_0))))},
  2,
  [],
  "shen-retrieve-from-history-if-needed"];
shenjs_functions["shen_shen-retrieve-from-history-if-needed"] = shen_retrieve_from_history_if_needed;






shen_percent = [shen_type_func,
  function shen_user_lambda5296(Arg5295) {
  if (Arg5295.length < 0) return [shen_type_func, shen_user_lambda5296, 0, Arg5295];
  return 37},
  0,
  [],
  "shen-percent"];
shenjs_functions["shen_shen-percent"] = shen_percent;






shen_exclamation = [shen_type_func,
  function shen_user_lambda5298(Arg5297) {
  if (Arg5297.length < 0) return [shen_type_func, shen_user_lambda5298, 0, Arg5297];
  return 33},
  0,
  [],
  "shen-exclamation"];
shenjs_functions["shen_shen-exclamation"] = shen_exclamation;






shen_prbytes = [shen_type_func,
  function shen_user_lambda5300(Arg5299) {
  if (Arg5299.length < 1) return [shen_type_func, shen_user_lambda5300, 1, Arg5299];
  var Arg5299_0 = Arg5299[0];
  return (shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5302(Arg5301) {
  if (Arg5301.length < 1) return [shen_type_func, shen_user_lambda5302, 1, Arg5301];
  var Arg5301_0 = Arg5301[0];
  return (function() {
  return shenjs_pr(shenjs_n_$gt$string(Arg5301_0), shenjs_call(shen_stinput, [0]));})},
  1,
  []], Arg5299_0]),
  (function() {
  return shenjs_call_tail(shen_nl, [1]);}))},
  1,
  [],
  "shen-prbytes"];
shenjs_functions["shen_shen-prbytes"] = shen_prbytes;






shen_update$_history = [shen_type_func,
  function shen_user_lambda5304(Arg5303) {
  if (Arg5303.length < 2) return [shen_type_func, shen_user_lambda5304, 2, Arg5303];
  var Arg5303_0 = Arg5303[0], Arg5303_1 = Arg5303[1];
  return (shenjs_globals["shen_shen-*history*"] = [shen_type_cons, Arg5303_0, Arg5303_1])},
  2,
  [],
  "shen-update_history"];
shenjs_functions["shen_shen-update_history"] = shen_update$_history;






shen_toplineread = [shen_type_func,
  function shen_user_lambda5306(Arg5305) {
  if (Arg5305.length < 0) return [shen_type_func, shen_user_lambda5306, 0, Arg5305];
  return (function() {
  return shenjs_call_tail(shen_toplineread$_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), []]);})},
  0,
  [],
  "shen-toplineread"];
shenjs_functions["shen_shen-toplineread"] = shen_toplineread;






shen_toplineread$_loop = [shen_type_func,
  function shen_user_lambda5308(Arg5307) {
  if (Arg5307.length < 2) return [shen_type_func, shen_user_lambda5308, 2, Arg5307];
  var Arg5307_0 = Arg5307[0], Arg5307_1 = Arg5307[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5307_0, shenjs_call(shen_hat, []))))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["line read aborted", []]);})
  : ((shenjs_call(shen_element$question$, [Arg5307_0, [shen_type_cons, shenjs_call(shen_newline, []), [shen_type_cons, shenjs_call(shen_carriage_return, []), []]]]))
  ? ((R0 = shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda5310(Arg5309) {
  if (Arg5309.length < 1) return [shen_type_func, shen_user_lambda5310, 1, Arg5309];
  var Arg5309_0 = Arg5309[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$st$_input$gt$, [Arg5309_0]);})},
  1,
  []], Arg5307_1, []])),
  (((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)) || shenjs_empty$question$(R0)))
  ? (function() {
  return shenjs_call_tail(shen_toplineread$_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), shenjs_call(shen_append, [Arg5307_1, [shen_type_cons, Arg5307_0, []]])]);})
  : [shen_tuple, R0, Arg5307_1]))
  : (function() {
  return shenjs_call_tail(shen_toplineread$_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), shenjs_call(shen_append, [Arg5307_1, [shen_type_cons, Arg5307_0, []]])]);})))},
  2,
  [],
  "shen-toplineread_loop"];
shenjs_functions["shen_shen-toplineread_loop"] = shen_toplineread$_loop;






shen_hat = [shen_type_func,
  function shen_user_lambda5312(Arg5311) {
  if (Arg5311.length < 0) return [shen_type_func, shen_user_lambda5312, 0, Arg5311];
  return 94},
  0,
  [],
  "shen-hat"];
shenjs_functions["shen_shen-hat"] = shen_hat;






shen_newline = [shen_type_func,
  function shen_user_lambda5314(Arg5313) {
  if (Arg5313.length < 0) return [shen_type_func, shen_user_lambda5314, 0, Arg5313];
  return 10},
  0,
  [],
  "shen-newline"];
shenjs_functions["shen_shen-newline"] = shen_newline;






shen_carriage_return = [shen_type_func,
  function shen_user_lambda5316(Arg5315) {
  if (Arg5315.length < 0) return [shen_type_func, shen_user_lambda5316, 0, Arg5315];
  return 13},
  0,
  [],
  "shen-carriage-return"];
shenjs_functions["shen_shen-carriage-return"] = shen_carriage_return;






shen_tc = [shen_type_func,
  function shen_user_lambda5318(Arg5317) {
  if (Arg5317.length < 1) return [shen_type_func, shen_user_lambda5318, 1, Arg5317];
  var Arg5317_0 = Arg5317[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg5317_0)))
  ? (shenjs_globals["shen_shen-*tc*"] = true)
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg5317_0)))
  ? (shenjs_globals["shen_shen-*tc*"] = false)
  : (function() {
  return shenjs_call_tail(shen_interror, ["tc expects a + or -", []]);})))},
  1,
  [],
  "tc"];
shenjs_functions["shen_tc"] = shen_tc;






shen_prompt = [shen_type_func,
  function shen_user_lambda5320(Arg5319) {
  if (Arg5319.length < 0) return [shen_type_func, shen_user_lambda5320, 0, Arg5319];
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
  function shen_user_lambda5322(Arg5321) {
  if (Arg5321.length < 1) return [shen_type_func, shen_user_lambda5322, 1, Arg5321];
  var Arg5321_0 = Arg5321[0];
  return (function() {
  return shenjs_call_tail(shen_toplevel$_evaluate, [Arg5321_0, (shenjs_globals["shen_shen-*tc*"])]);})},
  1,
  [],
  "shen-toplevel"];
shenjs_functions["shen_shen-toplevel"] = shen_toplevel;






shen_find_past_inputs = [shen_type_func,
  function shen_user_lambda5324(Arg5323) {
  if (Arg5323.length < 2) return [shen_type_func, shen_user_lambda5324, 2, Arg5323];
  var Arg5323_0 = Arg5323[0], Arg5323_1 = Arg5323[1];
  var R0;
  return ((R0 = shenjs_call(shen_find, [Arg5323_0, Arg5323_1])),
  ((shenjs_empty$question$(R0))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["input not found~%", []]);})
  : R0))},
  2,
  [],
  "shen-find-past-inputs"];
shenjs_functions["shen_shen-find-past-inputs"] = shen_find_past_inputs;






shen_make_key = [shen_type_func,
  function shen_user_lambda5326(Arg5325) {
  if (Arg5325.length < 2) return [shen_type_func, shen_user_lambda5326, 2, Arg5325];
  var Arg5325_0 = Arg5325[0], Arg5325_1 = Arg5325[1];
  var R0;
  return ((R0 = shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda5328(Arg5327) {
  if (Arg5327.length < 1) return [shen_type_func, shen_user_lambda5328, 1, Arg5327];
  var Arg5327_0 = Arg5327[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$st$_input$gt$, [Arg5327_0]);})},
  1,
  []], Arg5325_0, []])[1]),
  ((shenjs_call(shen_integer$question$, [R0]))
  ? [shen_type_func,
  function shen_user_lambda5330(Arg5329) {
  if (Arg5329.length < 3) return [shen_type_func, shen_user_lambda5330, 3, Arg5329];
  var Arg5329_0 = Arg5329[0], Arg5329_1 = Arg5329[1], Arg5329_2 = Arg5329[2];
  return shenjs_$eq$(Arg5329_2, shenjs_call(shen_nth, [(Arg5329_0 + 1), shenjs_call(shen_reverse, [Arg5329_1])]))},
  3,
  [R0, Arg5325_1]]
  : [shen_type_func,
  function shen_user_lambda5332(Arg5331) {
  if (Arg5331.length < 2) return [shen_type_func, shen_user_lambda5332, 2, Arg5331];
  var Arg5331_0 = Arg5331[0], Arg5331_1 = Arg5331[1];
  return (function() {
  return shenjs_call_tail(shen_prefix$question$, [Arg5331_0, shenjs_call(shen_trim_gubbins, [shenjs_call(shen_snd, [Arg5331_1])])]);})},
  2,
  [Arg5325_0]]))},
  2,
  [],
  "shen-make-key"];
shenjs_functions["shen_shen-make-key"] = shen_make_key;






shen_trim_gubbins = [shen_type_func,
  function shen_user_lambda5334(Arg5333) {
  if (Arg5333.length < 1) return [shen_type_func, shen_user_lambda5334, 1, Arg5333];
  var Arg5333_0 = Arg5333[0];
  return (((shenjs_is_type(Arg5333_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5333_0[1], shenjs_call(shen_space, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg5333_0[2]]);})
  : (((shenjs_is_type(Arg5333_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5333_0[1], shenjs_call(shen_newline, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg5333_0[2]]);})
  : (((shenjs_is_type(Arg5333_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5333_0[1], shenjs_call(shen_carriage_return, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg5333_0[2]]);})
  : (((shenjs_is_type(Arg5333_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5333_0[1], shenjs_call(shen_tab, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg5333_0[2]]);})
  : (((shenjs_is_type(Arg5333_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5333_0[1], shenjs_call(shen_left_round, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg5333_0[2]]);})
  : Arg5333_0)))))},
  1,
  [],
  "shen-trim-gubbins"];
shenjs_functions["shen_shen-trim-gubbins"] = shen_trim_gubbins;






shen_space = [shen_type_func,
  function shen_user_lambda5336(Arg5335) {
  if (Arg5335.length < 0) return [shen_type_func, shen_user_lambda5336, 0, Arg5335];
  return 32},
  0,
  [],
  "shen-space"];
shenjs_functions["shen_shen-space"] = shen_space;






shen_tab = [shen_type_func,
  function shen_user_lambda5338(Arg5337) {
  if (Arg5337.length < 0) return [shen_type_func, shen_user_lambda5338, 0, Arg5337];
  return 9},
  0,
  [],
  "shen-tab"];
shenjs_functions["shen_shen-tab"] = shen_tab;






shen_left_round = [shen_type_func,
  function shen_user_lambda5340(Arg5339) {
  if (Arg5339.length < 0) return [shen_type_func, shen_user_lambda5340, 0, Arg5339];
  return 40},
  0,
  [],
  "shen-left-round"];
shenjs_functions["shen_shen-left-round"] = shen_left_round;






shen_find = [shen_type_func,
  function shen_user_lambda5342(Arg5341) {
  if (Arg5341.length < 2) return [shen_type_func, shen_user_lambda5342, 2, Arg5341];
  var Arg5341_0 = Arg5341[0], Arg5341_1 = Arg5341[1];
  return ((shenjs_empty$question$(Arg5341_1))
  ? []
  : (((shenjs_is_type(Arg5341_1, shen_type_cons) && shenjs_call(Arg5341_0, [Arg5341_1[1]])))
  ? [shen_type_cons, Arg5341_1[1], shenjs_call(shen_find, [Arg5341_0, Arg5341_1[2]])]
  : ((shenjs_is_type(Arg5341_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_find, [Arg5341_0, Arg5341_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-find"]]);}))))},
  2,
  [],
  "shen-find"];
shenjs_functions["shen_shen-find"] = shen_find;






shen_prefix$question$ = [shen_type_func,
  function shen_user_lambda5344(Arg5343) {
  if (Arg5343.length < 2) return [shen_type_func, shen_user_lambda5344, 2, Arg5343];
  var Arg5343_0 = Arg5343[0], Arg5343_1 = Arg5343[1];
  return ((shenjs_empty$question$(Arg5343_0))
  ? true
  : (((shenjs_is_type(Arg5343_0, shen_type_cons) && (shenjs_is_type(Arg5343_1, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5343_1[1], Arg5343_0[1])))))
  ? (function() {
  return shenjs_call_tail(shen_prefix$question$, [Arg5343_0[2], Arg5343_1[2]]);})
  : false))},
  2,
  [],
  "shen-prefix?"];
shenjs_functions["shen_shen-prefix?"] = shen_prefix$question$;






shen_print_past_inputs = [shen_type_func,
  function shen_user_lambda5346(Arg5345) {
  if (Arg5345.length < 3) return [shen_type_func, shen_user_lambda5346, 3, Arg5345];
  var Arg5345_0 = Arg5345[0], Arg5345_1 = Arg5345[1], Arg5345_2 = Arg5345[2];
  return ((shenjs_empty$question$(Arg5345_1))
  ? [shen_type_symbol, "_"]
  : (((shenjs_is_type(Arg5345_1, shen_type_cons) && (!shenjs_call(Arg5345_0, [Arg5345_1[1]]))))
  ? (function() {
  return shenjs_call_tail(shen_print_past_inputs, [Arg5345_0, Arg5345_1[2], (Arg5345_2 + 1)]);})
  : (((shenjs_is_type(Arg5345_1, shen_type_cons) && shenjs_is_type(Arg5345_1[1], shen_tuple)))
  ? (shenjs_call(shen_intoutput, ["~A. ", [shen_tuple, Arg5345_2, []]]),
  shenjs_call(shen_prbytes, [shenjs_call(shen_snd, [Arg5345_1[1]])]),
  (function() {
  return shenjs_call_tail(shen_print_past_inputs, [Arg5345_0, Arg5345_1[2], (Arg5345_2 + 1)]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-print-past-inputs"]]);}))))},
  3,
  [],
  "shen-print-past-inputs"];
shenjs_functions["shen_shen-print-past-inputs"] = shen_print_past_inputs;






shen_toplevel$_evaluate = [shen_type_func,
  function shen_user_lambda5348(Arg5347) {
  if (Arg5347.length < 2) return [shen_type_func, shen_user_lambda5348, 2, Arg5347];
  var Arg5347_0 = Arg5347[0], Arg5347_1 = Arg5347[1];
  var R0;
  return (((shenjs_is_type(Arg5347_0, shen_type_cons) && (shenjs_is_type(Arg5347_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], Arg5347_0[2][1])) && (shenjs_is_type(Arg5347_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg5347_0[2][2][2]) && shenjs_unwind_tail(shenjs_$eq$(true, Arg5347_1))))))))
  ? (function() {
  return shenjs_call_tail(shen_typecheck_and_evaluate, [Arg5347_0[1], Arg5347_0[2][2][1]]);})
  : (((shenjs_is_type(Arg5347_0, shen_type_cons) && shenjs_is_type(Arg5347_0[2], shen_type_cons)))
  ? (shenjs_call(shen_toplevel$_evaluate, [[shen_type_cons, Arg5347_0[1], []], Arg5347_1]),
  ((shenjs_unwind_tail(shenjs_$eq$((shenjs_globals["shen_shen-*hush*"]), [shen_type_symbol, "shen-hushed"])))
  ? [shen_type_symbol, "shen-skip"]
  : shenjs_call(shen_nl, [1])),
  (function() {
  return shenjs_call_tail(shen_toplevel$_evaluate, [Arg5347_0[2], Arg5347_1]);}))
  : (((shenjs_is_type(Arg5347_0, shen_type_cons) && (shenjs_empty$question$(Arg5347_0[2]) && shenjs_unwind_tail(shenjs_$eq$(true, Arg5347_1)))))
  ? (function() {
  return shenjs_call_tail(shen_typecheck_and_evaluate, [Arg5347_0[1], shenjs_call(shen_gensym, [[shen_type_symbol, "A"]])]);})
  : (((shenjs_is_type(Arg5347_0, shen_type_cons) && (shenjs_empty$question$(Arg5347_0[2]) && shenjs_unwind_tail(shenjs_$eq$(false, Arg5347_1)))))
  ? ((R0 = shenjs_call(shen_eval_without_macros, [Arg5347_0[1]])),
  (((shenjs_unwind_tail(shenjs_$eq$((shenjs_globals["shen_shen-*hush*"]), [shen_type_symbol, "shen-hushed"])) || shenjs_unwind_tail(shenjs_$eq$(R0, [shen_type_symbol, "shen-unhushed"]))))
  ? [shen_type_symbol, "shen-skip"]
  : (function() {
  return shenjs_call_tail(shen_print, [R0]);})))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-toplevel_evaluate"]]);})))))},
  2,
  [],
  "shen-toplevel_evaluate"];
shenjs_functions["shen_shen-toplevel_evaluate"] = shen_toplevel$_evaluate;






shen_typecheck_and_evaluate = [shen_type_func,
  function shen_user_lambda5350(Arg5349) {
  if (Arg5349.length < 2) return [shen_type_func, shen_user_lambda5350, 2, Arg5349];
  var Arg5349_0 = Arg5349[0], Arg5349_1 = Arg5349[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_typecheck, [Arg5349_0, Arg5349_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["type error~%", []]);})
  : ((R1 = shenjs_call(shen_eval_without_macros, [Arg5349_0])),
  (R0 = shenjs_call(shen_pretty_type, [R0])),
  (((shenjs_unwind_tail(shenjs_$eq$((shenjs_globals["shen_shen-*hush*"]), [shen_type_symbol, "shen-hushed"])) || shenjs_unwind_tail(shenjs_$eq$(Arg5349_0, [shen_type_symbol, "shen-unhushed"]))))
  ? [shen_type_symbol, "shen-skip"]
  : (function() {
  return shenjs_call_tail(shen_intoutput, ["~S : ~R", [shen_tuple, R1, [shen_tuple, R0, []]]]);})))))},
  2,
  [],
  "shen-typecheck-and-evaluate"];
shenjs_functions["shen_shen-typecheck-and-evaluate"] = shen_typecheck_and_evaluate;






shen_pretty_type = [shen_type_func,
  function shen_user_lambda5352(Arg5351) {
  if (Arg5351.length < 1) return [shen_type_func, shen_user_lambda5352, 1, Arg5351];
  var Arg5351_0 = Arg5351[0];
  return (function() {
  return shenjs_call_tail(shen_mult$_subst, [(shenjs_globals["shen_shen-*alphabet*"]), shenjs_call(shen_extract_pvars, [Arg5351_0]), Arg5351_0]);})},
  1,
  [],
  "shen-pretty-type"];
shenjs_functions["shen_shen-pretty-type"] = shen_pretty_type;






shen_extract_pvars = [shen_type_func,
  function shen_user_lambda5354(Arg5353) {
  if (Arg5353.length < 1) return [shen_type_func, shen_user_lambda5354, 1, Arg5353];
  var Arg5353_0 = Arg5353[0];
  return ((shenjs_call(shen_pvar$question$, [Arg5353_0]))
  ? [shen_type_cons, Arg5353_0, []]
  : ((shenjs_is_type(Arg5353_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_union, [shenjs_call(shen_extract_pvars, [Arg5353_0[1]]), shenjs_call(shen_extract_pvars, [Arg5353_0[2]])]);})
  : []))},
  1,
  [],
  "shen-extract-pvars"];
shenjs_functions["shen_shen-extract-pvars"] = shen_extract_pvars;






shen_mult$_subst = [shen_type_func,
  function shen_user_lambda5356(Arg5355) {
  if (Arg5355.length < 3) return [shen_type_func, shen_user_lambda5356, 3, Arg5355];
  var Arg5355_0 = Arg5355[0], Arg5355_1 = Arg5355[1], Arg5355_2 = Arg5355[2];
  return ((shenjs_empty$question$(Arg5355_0))
  ? Arg5355_2
  : ((shenjs_empty$question$(Arg5355_1))
  ? Arg5355_2
  : (((shenjs_is_type(Arg5355_0, shen_type_cons) && shenjs_is_type(Arg5355_1, shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(shen_mult$_subst, [Arg5355_0[2], Arg5355_1[2], shenjs_call(shen_subst, [Arg5355_0[1], Arg5355_1[1], Arg5355_2])]);})
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
