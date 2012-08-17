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

shenjs_globals["shen_*language*"] = "Javascript"
shenjs_globals["shen_*implementation*"] = "cli"
shenjs_globals["shen_*port*"] = "0.3"
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
## shenjs_open([type, name, direction])
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
  function shen_user_lambda14748(Arg14747) {
  if (Arg14747.length < 1) return [shen_type_func, shen_user_lambda14748, 1, Arg14747];
  var Arg14747_0 = Arg14747[0];
  return Arg14747_0[1]},
  1,
  [],
  "hd"];
shenjs_functions["shen_hd"] = shen_hd;






shen_tl = [shen_type_func,
  function shen_user_lambda14750(Arg14749) {
  if (Arg14749.length < 1) return [shen_type_func, shen_user_lambda14750, 1, Arg14749];
  var Arg14749_0 = Arg14749[0];
  return Arg14749_0[2]},
  1,
  [],
  "tl"];
shenjs_functions["shen_tl"] = shen_tl;






shen_not = [shen_type_func,
  function shen_user_lambda14752(Arg14751) {
  if (Arg14751.length < 1) return [shen_type_func, shen_user_lambda14752, 1, Arg14751];
  var Arg14751_0 = Arg14751[0];
  return (!Arg14751_0)},
  1,
  [],
  "not"];
shenjs_functions["shen_not"] = shen_not;






shen_thaw = [shen_type_func,
  function shen_user_lambda14754(Arg14753) {
  if (Arg14753.length < 1) return [shen_type_func, shen_user_lambda14754, 1, Arg14753];
  var Arg14753_0 = Arg14753[0];
  return shenjs_thaw(Arg14753_0)},
  1,
  [],
  "thaw"];
shenjs_functions["shen_thaw"] = shen_thaw;






shen_string$question$ = [shen_type_func,
  function shen_user_lambda14756(Arg14755) {
  if (Arg14755.length < 1) return [shen_type_func, shen_user_lambda14756, 1, Arg14755];
  var Arg14755_0 = Arg14755[0];
  return (typeof(Arg14755_0) == 'string')},
  1,
  [],
  "string?"];
shenjs_functions["shen_string?"] = shen_string$question$;






shen_number$question$ = [shen_type_func,
  function shen_user_lambda14758(Arg14757) {
  if (Arg14757.length < 1) return [shen_type_func, shen_user_lambda14758, 1, Arg14757];
  var Arg14757_0 = Arg14757[0];
  return (typeof(Arg14757_0) == 'number')},
  1,
  [],
  "number?"];
shenjs_functions["shen_number?"] = shen_number$question$;






shen_symbol$question$ = [shen_type_func,
  function shen_user_lambda14760(Arg14759) {
  if (Arg14759.length < 1) return [shen_type_func, shen_user_lambda14760, 1, Arg14759];
  var Arg14759_0 = Arg14759[0];
  return shenjs_is_type(Arg14759_0, shen_type_symbol)},
  1,
  [],
  "symbol?"];
shenjs_functions["shen_symbol?"] = shen_symbol$question$;






shen_cons$question$ = [shen_type_func,
  function shen_user_lambda14762(Arg14761) {
  if (Arg14761.length < 1) return [shen_type_func, shen_user_lambda14762, 1, Arg14761];
  var Arg14761_0 = Arg14761[0];
  return shenjs_is_type(Arg14761_0, shen_type_cons)},
  1,
  [],
  "cons?"];
shenjs_functions["shen_cons?"] = shen_cons$question$;






shen_vector$question$ = [shen_type_func,
  function shen_user_lambda14764(Arg14763) {
  if (Arg14763.length < 1) return [shen_type_func, shen_user_lambda14764, 1, Arg14763];
  var Arg14763_0 = Arg14763[0];
  return (function() {
  return shenjs_vector$question$(Arg14763_0);})},
  1,
  [],
  "vector?"];
shenjs_functions["shen_vector?"] = shen_vector$question$;






shen_absvector$question$ = [shen_type_func,
  function shen_user_lambda14766(Arg14765) {
  if (Arg14765.length < 1) return [shen_type_func, shen_user_lambda14766, 1, Arg14765];
  var Arg14765_0 = Arg14765[0];
  return (function() {
  return shenjs_absvector$question$(Arg14765_0);})},
  1,
  [],
  "absvector?"];
shenjs_functions["shen_absvector?"] = shen_absvector$question$;






shen_value = [shen_type_func,
  function shen_user_lambda14768(Arg14767) {
  if (Arg14767.length < 1) return [shen_type_func, shen_user_lambda14768, 1, Arg14767];
  var Arg14767_0 = Arg14767[0];
  return (shenjs_globals["shen_" + Arg14767_0[1]])},
  1,
  [],
  "value"];
shenjs_functions["shen_value"] = shen_value;






shen_intern = [shen_type_func,
  function shen_user_lambda14770(Arg14769) {
  if (Arg14769.length < 1) return [shen_type_func, shen_user_lambda14770, 1, Arg14769];
  var Arg14769_0 = Arg14769[0];
  return (function() {
  return shenjs_intern(Arg14769_0);})},
  1,
  [],
  "intern"];
shenjs_functions["shen_intern"] = shen_intern;






shen_vector = [shen_type_func,
  function shen_user_lambda14772(Arg14771) {
  if (Arg14771.length < 1) return [shen_type_func, shen_user_lambda14772, 1, Arg14771];
  var Arg14771_0 = Arg14771[0];
  return (function() {
  return shenjs_vector(Arg14771_0);})},
  1,
  [],
  "vector"];
shenjs_functions["shen_vector"] = shen_vector;






shen_read_byte = [shen_type_func,
  function shen_user_lambda14774(Arg14773) {
  if (Arg14773.length < 1) return [shen_type_func, shen_user_lambda14774, 1, Arg14773];
  var Arg14773_0 = Arg14773[0];
  return (function() {
  return shenjs_read_byte(Arg14773_0);})},
  1,
  [],
  "read-byte"];
shenjs_functions["shen_read-byte"] = shen_read_byte;






shen_close = [shen_type_func,
  function shen_user_lambda14776(Arg14775) {
  if (Arg14775.length < 1) return [shen_type_func, shen_user_lambda14776, 1, Arg14775];
  var Arg14775_0 = Arg14775[0];
  return (function() {
  return shenjs_close(Arg14775_0);})},
  1,
  [],
  "close"];
shenjs_functions["shen_close"] = shen_close;






shen_absvector = [shen_type_func,
  function shen_user_lambda14778(Arg14777) {
  if (Arg14777.length < 1) return [shen_type_func, shen_user_lambda14778, 1, Arg14777];
  var Arg14777_0 = Arg14777[0];
  return (function() {
  return shenjs_absvector(Arg14777_0);})},
  1,
  [],
  "absvector"];
shenjs_functions["shen_absvector"] = shen_absvector;






shen_str = [shen_type_func,
  function shen_user_lambda14780(Arg14779) {
  if (Arg14779.length < 1) return [shen_type_func, shen_user_lambda14780, 1, Arg14779];
  var Arg14779_0 = Arg14779[0];
  return (function() {
  return shenjs_str(Arg14779_0);})},
  1,
  [],
  "str"];
shenjs_functions["shen_str"] = shen_str;






shen_tlstr = [shen_type_func,
  function shen_user_lambda14782(Arg14781) {
  if (Arg14781.length < 1) return [shen_type_func, shen_user_lambda14782, 1, Arg14781];
  var Arg14781_0 = Arg14781[0];
  return (function() {
  return shenjs_tlstr(Arg14781_0);})},
  1,
  [],
  "tlstr"];
shenjs_functions["shen_tlstr"] = shen_tlstr;






shen_n_$gt$string = [shen_type_func,
  function shen_user_lambda14784(Arg14783) {
  if (Arg14783.length < 1) return [shen_type_func, shen_user_lambda14784, 1, Arg14783];
  var Arg14783_0 = Arg14783[0];
  return (function() {
  return shenjs_n_$gt$string(Arg14783_0);})},
  1,
  [],
  "n->string"];
shenjs_functions["shen_n->string"] = shen_n_$gt$string;






shen_string_$gt$n = [shen_type_func,
  function shen_user_lambda14786(Arg14785) {
  if (Arg14785.length < 1) return [shen_type_func, shen_user_lambda14786, 1, Arg14785];
  var Arg14785_0 = Arg14785[0];
  return (function() {
  return shenjs_string_$gt$n(Arg14785_0);})},
  1,
  [],
  "string->n"];
shenjs_functions["shen_string->n"] = shen_string_$gt$n;






shen_empty$question$ = [shen_type_func,
  function shen_user_lambda14788(Arg14787) {
  if (Arg14787.length < 1) return [shen_type_func, shen_user_lambda14788, 1, Arg14787];
  var Arg14787_0 = Arg14787[0];
  return (function() {
  return shenjs_empty$question$(Arg14787_0);})},
  1,
  [],
  "empty?"];
shenjs_functions["shen_empty?"] = shen_empty$question$;






shen_get_time = [shen_type_func,
  function shen_user_lambda14790(Arg14789) {
  if (Arg14789.length < 1) return [shen_type_func, shen_user_lambda14790, 1, Arg14789];
  var Arg14789_0 = Arg14789[0];
  return (function() {
  return shenjs_get_time(Arg14789_0);})},
  1,
  [],
  "get-time"];
shenjs_functions["shen_get-time"] = shen_get_time;






shen_error = [shen_type_func,
  function shen_user_lambda14792(Arg14791) {
  if (Arg14791.length < 1) return [shen_type_func, shen_user_lambda14792, 1, Arg14791];
  var Arg14791_0 = Arg14791[0];
  return (function() {
  return shenjs_error(Arg14791_0);})},
  1,
  [],
  "error"];
shenjs_functions["shen_error"] = shen_error;






shen_simple_error = [shen_type_func,
  function shen_user_lambda14794(Arg14793) {
  if (Arg14793.length < 1) return [shen_type_func, shen_user_lambda14794, 1, Arg14793];
  var Arg14793_0 = Arg14793[0];
  return (function() {
  return shenjs_simple_error(Arg14793_0);})},
  1,
  [],
  "simple-error"];
shenjs_functions["shen_simple-error"] = shen_simple_error;






shen_eval_kl = [shen_type_func,
  function shen_user_lambda14796(Arg14795) {
  if (Arg14795.length < 1) return [shen_type_func, shen_user_lambda14796, 1, Arg14795];
  var Arg14795_0 = Arg14795[0];
  return (function() {
  return shenjs_eval_kl(Arg14795_0);})},
  1,
  [],
  "eval-kl"];
shenjs_functions["shen_eval-kl"] = shen_eval_kl;






shen_error_to_string = [shen_type_func,
  function shen_user_lambda14798(Arg14797) {
  if (Arg14797.length < 1) return [shen_type_func, shen_user_lambda14798, 1, Arg14797];
  var Arg14797_0 = Arg14797[0];
  return (function() {
  return shenjs_error_to_string(Arg14797_0);})},
  1,
  [],
  "error-to-string"];
shenjs_functions["shen_error-to-string"] = shen_error_to_string;






shen_js_call_js = [shen_type_func,
  function shen_user_lambda14800(Arg14799) {
  if (Arg14799.length < 1) return [shen_type_func, shen_user_lambda14800, 1, Arg14799];
  var Arg14799_0 = Arg14799[0];
  return (function() {
  return shenjs_js_call_js(Arg14799_0);})},
  1,
  [],
  "js-call-js"];
shenjs_functions["shen_js-call-js"] = shen_js_call_js;






shen_$plus$ = [shen_type_func,
  function shen_user_lambda14802(Arg14801) {
  if (Arg14801.length < 2) return [shen_type_func, shen_user_lambda14802, 2, Arg14801];
  var Arg14801_0 = Arg14801[0], Arg14801_1 = Arg14801[1];
  return (Arg14801_0 + Arg14801_1)},
  2,
  [],
  "+"];
shenjs_functions["shen_+"] = shen_$plus$;






shen__ = [shen_type_func,
  function shen_user_lambda14804(Arg14803) {
  if (Arg14803.length < 2) return [shen_type_func, shen_user_lambda14804, 2, Arg14803];
  var Arg14803_0 = Arg14803[0], Arg14803_1 = Arg14803[1];
  return (Arg14803_0 - Arg14803_1)},
  2,
  [],
  "-"];
shenjs_functions["shen_-"] = shen__;






shen_$asterisk$ = [shen_type_func,
  function shen_user_lambda14806(Arg14805) {
  if (Arg14805.length < 2) return [shen_type_func, shen_user_lambda14806, 2, Arg14805];
  var Arg14805_0 = Arg14805[0], Arg14805_1 = Arg14805[1];
  return (Arg14805_0 * Arg14805_1)},
  2,
  [],
  "*"];
shenjs_functions["shen_*"] = shen_$asterisk$;






shen_$slash$ = [shen_type_func,
  function shen_user_lambda14808(Arg14807) {
  if (Arg14807.length < 2) return [shen_type_func, shen_user_lambda14808, 2, Arg14807];
  var Arg14807_0 = Arg14807[0], Arg14807_1 = Arg14807[1];
  return (Arg14807_0 / Arg14807_1)},
  2,
  [],
  "/"];
shenjs_functions["shen_/"] = shen_$slash$;






shen_and = [shen_type_func,
  function shen_user_lambda14810(Arg14809) {
  if (Arg14809.length < 2) return [shen_type_func, shen_user_lambda14810, 2, Arg14809];
  var Arg14809_0 = Arg14809[0], Arg14809_1 = Arg14809[1];
  return (Arg14809_0 && Arg14809_1)},
  2,
  [],
  "and"];
shenjs_functions["shen_and"] = shen_and;






shen_or = [shen_type_func,
  function shen_user_lambda14812(Arg14811) {
  if (Arg14811.length < 2) return [shen_type_func, shen_user_lambda14812, 2, Arg14811];
  var Arg14811_0 = Arg14811[0], Arg14811_1 = Arg14811[1];
  return (Arg14811_0 || Arg14811_1)},
  2,
  [],
  "or"];
shenjs_functions["shen_or"] = shen_or;






shen_$eq$ = [shen_type_func,
  function shen_user_lambda14814(Arg14813) {
  if (Arg14813.length < 2) return [shen_type_func, shen_user_lambda14814, 2, Arg14813];
  var Arg14813_0 = Arg14813[0], Arg14813_1 = Arg14813[1];
  return shenjs_$eq$(Arg14813_0, Arg14813_1)},
  2,
  [],
  "="];
shenjs_functions["shen_="] = shen_$eq$;






shen_$gt$ = [shen_type_func,
  function shen_user_lambda14816(Arg14815) {
  if (Arg14815.length < 2) return [shen_type_func, shen_user_lambda14816, 2, Arg14815];
  var Arg14815_0 = Arg14815[0], Arg14815_1 = Arg14815[1];
  return (Arg14815_0 > Arg14815_1)},
  2,
  [],
  ">"];
shenjs_functions["shen_>"] = shen_$gt$;






shen_$gt$$eq$ = [shen_type_func,
  function shen_user_lambda14818(Arg14817) {
  if (Arg14817.length < 2) return [shen_type_func, shen_user_lambda14818, 2, Arg14817];
  var Arg14817_0 = Arg14817[0], Arg14817_1 = Arg14817[1];
  return (Arg14817_0 >= Arg14817_1)},
  2,
  [],
  ">="];
shenjs_functions["shen_>="] = shen_$gt$$eq$;






shen_$lt$ = [shen_type_func,
  function shen_user_lambda14820(Arg14819) {
  if (Arg14819.length < 2) return [shen_type_func, shen_user_lambda14820, 2, Arg14819];
  var Arg14819_0 = Arg14819[0], Arg14819_1 = Arg14819[1];
  return (Arg14819_0 < Arg14819_1)},
  2,
  [],
  "<"];
shenjs_functions["shen_<"] = shen_$lt$;






shen_$lt$$eq$ = [shen_type_func,
  function shen_user_lambda14822(Arg14821) {
  if (Arg14821.length < 2) return [shen_type_func, shen_user_lambda14822, 2, Arg14821];
  var Arg14821_0 = Arg14821[0], Arg14821_1 = Arg14821[1];
  return (Arg14821_0 <= Arg14821_1)},
  2,
  [],
  "<="];
shenjs_functions["shen_<="] = shen_$lt$$eq$;






shen_cons = [shen_type_func,
  function shen_user_lambda14824(Arg14823) {
  if (Arg14823.length < 2) return [shen_type_func, shen_user_lambda14824, 2, Arg14823];
  var Arg14823_0 = Arg14823[0], Arg14823_1 = Arg14823[1];
  return [shen_type_cons, Arg14823_0, Arg14823_1]},
  2,
  [],
  "cons"];
shenjs_functions["shen_cons"] = shen_cons;






shen_set = [shen_type_func,
  function shen_user_lambda14826(Arg14825) {
  if (Arg14825.length < 2) return [shen_type_func, shen_user_lambda14826, 2, Arg14825];
  var Arg14825_0 = Arg14825[0], Arg14825_1 = Arg14825[1];
  return (shenjs_globals["shen_" + Arg14825_0[1]] = Arg14825_1)},
  2,
  [],
  "set"];
shenjs_functions["shen_set"] = shen_set;






shen_$lt$_address = [shen_type_func,
  function shen_user_lambda14828(Arg14827) {
  if (Arg14827.length < 2) return [shen_type_func, shen_user_lambda14828, 2, Arg14827];
  var Arg14827_0 = Arg14827[0], Arg14827_1 = Arg14827[1];
  return shenjs_absvector_ref(Arg14827_0, Arg14827_1)},
  2,
  [],
  "<-address"];
shenjs_functions["shen_<-address"] = shen_$lt$_address;






shen_cn = [shen_type_func,
  function shen_user_lambda14830(Arg14829) {
  if (Arg14829.length < 2) return [shen_type_func, shen_user_lambda14830, 2, Arg14829];
  var Arg14829_0 = Arg14829[0], Arg14829_1 = Arg14829[1];
  return (Arg14829_0 + Arg14829_1)},
  2,
  [],
  "cn"];
shenjs_functions["shen_cn"] = shen_cn;






shen_pos = [shen_type_func,
  function shen_user_lambda14832(Arg14831) {
  if (Arg14831.length < 2) return [shen_type_func, shen_user_lambda14832, 2, Arg14831];
  var Arg14831_0 = Arg14831[0], Arg14831_1 = Arg14831[1];
  return Arg14831_0[Arg14831_1]},
  2,
  [],
  "pos"];
shenjs_functions["shen_pos"] = shen_pos;






shen_$at$p = [shen_type_func,
  function shen_user_lambda14834(Arg14833) {
  if (Arg14833.length < 2) return [shen_type_func, shen_user_lambda14834, 2, Arg14833];
  var Arg14833_0 = Arg14833[0], Arg14833_1 = Arg14833[1];
  return [shen_tuple, Arg14833_0, Arg14833_1]},
  2,
  [],
  "@p"];
shenjs_functions["shen_@p"] = shen_$at$p;






shen_pr = [shen_type_func,
  function shen_user_lambda14836(Arg14835) {
  if (Arg14835.length < 2) return [shen_type_func, shen_user_lambda14836, 2, Arg14835];
  var Arg14835_0 = Arg14835[0], Arg14835_1 = Arg14835[1];
  return (function() {
  return shenjs_pr(Arg14835_0, Arg14835_1);})},
  2,
  [],
  "pr"];
shenjs_functions["shen_pr"] = shen_pr;






shen_address_$gt$ = [shen_type_func,
  function shen_user_lambda14838(Arg14837) {
  if (Arg14837.length < 3) return [shen_type_func, shen_user_lambda14838, 3, Arg14837];
  var Arg14837_0 = Arg14837[0], Arg14837_1 = Arg14837[1], Arg14837_2 = Arg14837[2];
  return shenjs_absvector_set(Arg14837_0, Arg14837_1, Arg14837_2)},
  3,
  [],
  "address->"];
shenjs_functions["shen_address->"] = shen_address_$gt$;






shen_open = [shen_type_func,
  function shen_user_lambda14840(Arg14839) {
  if (Arg14839.length < 3) return [shen_type_func, shen_user_lambda14840, 3, Arg14839];
  var Arg14839_0 = Arg14839[0], Arg14839_1 = Arg14839[1], Arg14839_2 = Arg14839[2];
  return (function() {
  return shenjs_open(Arg14839_0, Arg14839_1, Arg14839_2);})},
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
  function shen_user_lambda13948(Arg13947) {
  if (Arg13947.length < 2) return [shen_type_func, shen_user_lambda13948, 2, Arg13947];
  var Arg13947_0 = Arg13947[0], Arg13947_1 = Arg13947[1];
  return (function() {
  return shenjs_call_tail(shen_$at$v, [Arg13947_0, shenjs_call(shen_$at$v, [Arg13947_1, shenjs_vector(0)])]);})},
  2,
  [],
  "reg-kl-mk-context"];
shenjs_functions["shen_reg-kl-mk-context"] = reg_kl_mk_context;






reg_kl_context_nvars_$gt$ = [shen_type_func,
  function shen_user_lambda13950(Arg13949) {
  if (Arg13949.length < 2) return [shen_type_func, shen_user_lambda13950, 2, Arg13949];
  var Arg13949_0 = Arg13949[0], Arg13949_1 = Arg13949[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$, [Arg13949_0, 2, Arg13949_1]);})},
  2,
  [],
  "reg-kl-context-nvars->"];
shenjs_functions["shen_reg-kl-context-nvars->"] = reg_kl_context_nvars_$gt$;






reg_kl_context_toplevel_$gt$ = [shen_type_func,
  function shen_user_lambda13952(Arg13951) {
  if (Arg13951.length < 2) return [shen_type_func, shen_user_lambda13952, 2, Arg13951];
  var Arg13951_0 = Arg13951[0], Arg13951_1 = Arg13951[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$, [Arg13951_0, 1, Arg13951_1]);})},
  2,
  [],
  "reg-kl-context-toplevel->"];
shenjs_functions["shen_reg-kl-context-toplevel->"] = reg_kl_context_toplevel_$gt$;






reg_kl_context_nvars = [shen_type_func,
  function shen_user_lambda13954(Arg13953) {
  if (Arg13953.length < 1) return [shen_type_func, shen_user_lambda13954, 1, Arg13953];
  var Arg13953_0 = Arg13953[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$_vector, [Arg13953_0, 2]);})},
  1,
  [],
  "reg-kl-context-nvars"];
shenjs_functions["shen_reg-kl-context-nvars"] = reg_kl_context_nvars;






reg_kl_context_toplevel = [shen_type_func,
  function shen_user_lambda13956(Arg13955) {
  if (Arg13955.length < 1) return [shen_type_func, shen_user_lambda13956, 1, Arg13955];
  var Arg13955_0 = Arg13955[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$_vector, [Arg13955_0, 1]);})},
  1,
  [],
  "reg-kl-context-toplevel"];
shenjs_functions["shen_reg-kl-context-toplevel"] = reg_kl_context_toplevel;






reg_kl_var_idx_aux = [shen_type_func,
  function shen_user_lambda13958(Arg13957) {
  if (Arg13957.length < 3) return [shen_type_func, shen_user_lambda13958, 3, Arg13957];
  var Arg13957_0 = Arg13957[0], Arg13957_1 = Arg13957[1], Arg13957_2 = Arg13957[2];
  return ((shenjs_empty$question$(Arg13957_2))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["Unknown var: ~A~%", [shen_tuple, Arg13957_0, []]]);})
  : (((shenjs_is_type(Arg13957_2, shen_type_cons) && (shenjs_is_type(Arg13957_2[1], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg13957_2[1][1], Arg13957_0)))))
  ? Arg13957_2[1][2]
  : ((shenjs_is_type(Arg13957_2, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_var_idx_aux, [Arg13957_0, (Arg13957_1 + 1), Arg13957_2[2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-var-idx-aux"]]);}))))},
  3,
  [],
  "reg-kl-var-idx-aux"];
shenjs_functions["shen_reg-kl-var-idx-aux"] = reg_kl_var_idx_aux;






reg_kl_var_idx = [shen_type_func,
  function shen_user_lambda13960(Arg13959) {
  if (Arg13959.length < 2) return [shen_type_func, shen_user_lambda13960, 2, Arg13959];
  var Arg13959_0 = Arg13959[0], Arg13959_1 = Arg13959[1];
  return (function() {
  return shenjs_call_tail(reg_kl_var_idx_aux, [Arg13959_0, 0, Arg13959_1]);})},
  2,
  [],
  "reg-kl-var-idx"];
shenjs_functions["shen_reg-kl-var-idx"] = reg_kl_var_idx;






reg_kl_new_var_idx_aux = [shen_type_func,
  function shen_user_lambda13962(Arg13961) {
  if (Arg13961.length < 3) return [shen_type_func, shen_user_lambda13962, 3, Arg13961];
  var Arg13961_0 = Arg13961[0], Arg13961_1 = Arg13961[1], Arg13961_2 = Arg13961[2];
  return ((shenjs_empty$question$(Arg13961_2))
  ? Arg13961_1
  : (((shenjs_is_type(Arg13961_2, shen_type_cons) && (shenjs_is_type(Arg13961_2[1], shen_type_cons) && (Arg13961_2[1][2] < 0))))
  ? (function() {
  return shenjs_call_tail(reg_kl_new_var_idx_aux, [Arg13961_0, Arg13961_1, Arg13961_2[2]]);})
  : (((shenjs_is_type(Arg13961_2, shen_type_cons) && (shenjs_is_type(Arg13961_2[1], shen_type_cons) && (Arg13961_2[1][2] >= Arg13961_1))))
  ? (function() {
  return shenjs_call_tail(reg_kl_new_var_idx_aux, [Arg13961_0, (Arg13961_2[1][2] + 1), Arg13961_2[2]]);})
  : ((shenjs_is_type(Arg13961_2, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_new_var_idx_aux, [Arg13961_0, Arg13961_1, Arg13961_2[2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-new-var-idx-aux"]]);})))))},
  3,
  [],
  "reg-kl-new-var-idx-aux"];
shenjs_functions["shen_reg-kl-new-var-idx-aux"] = reg_kl_new_var_idx_aux;






reg_kl_new_var_idx = [shen_type_func,
  function shen_user_lambda13964(Arg13963) {
  if (Arg13963.length < 2) return [shen_type_func, shen_user_lambda13964, 2, Arg13963];
  var Arg13963_0 = Arg13963[0], Arg13963_1 = Arg13963[1];
  return (function() {
  return shenjs_call_tail(reg_kl_new_var_idx_aux, [Arg13963_0, 0, Arg13963_1]);})},
  2,
  [],
  "reg-kl-new-var-idx"];
shenjs_functions["shen_reg-kl-new-var-idx"] = reg_kl_new_var_idx;






reg_kl_var_defined$question$ = [shen_type_func,
  function shen_user_lambda13966(Arg13965) {
  if (Arg13965.length < 2) return [shen_type_func, shen_user_lambda13966, 2, Arg13965];
  var Arg13965_0 = Arg13965[0], Arg13965_1 = Arg13965[1];
  return ((shenjs_empty$question$(Arg13965_1))
  ? false
  : (((shenjs_is_type(Arg13965_1, shen_type_cons) && (shenjs_is_type(Arg13965_1[1], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg13965_1[1][1], Arg13965_0)))))
  ? true
  : (((shenjs_is_type(Arg13965_1, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg13965_1[1], Arg13965_0))))
  ? true
  : ((shenjs_is_type(Arg13965_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_var_defined$question$, [Arg13965_0, Arg13965_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-var-defined?"]]);})))))},
  2,
  [],
  "reg-kl-var-defined?"];
shenjs_functions["shen_reg-kl-var-defined?"] = reg_kl_var_defined$question$;






reg_kl_used_vars_aux = [shen_type_func,
  function shen_user_lambda13968(Arg13967) {
  if (Arg13967.length < 4) return [shen_type_func, shen_user_lambda13968, 4, Arg13967];
  var Arg13967_0 = Arg13967[0], Arg13967_1 = Arg13967[1], Arg13967_2 = Arg13967[2], Arg13967_3 = Arg13967[3];
  var R0;
  return (((shenjs_is_type(Arg13967_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg13967_0[1])) && (shenjs_is_type(Arg13967_0[2], shen_type_cons) && (shenjs_is_type(Arg13967_0[2][2], shen_type_cons) && (shenjs_is_type(Arg13967_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg13967_0[2][2][2][2])))))))
  ? ((R0 = shenjs_call(reg_kl_used_vars_aux, [Arg13967_0[2][2][2][1], Arg13967_1, [shen_type_cons, Arg13967_0[2][1], Arg13967_2], Arg13967_3])),
  (function() {
  return shenjs_call_tail(reg_kl_used_vars_aux, [Arg13967_0[2][2][1], Arg13967_1, Arg13967_2, R0]);}))
  : (((shenjs_is_type(Arg13967_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "lambda"], Arg13967_0[1])) && (shenjs_is_type(Arg13967_0[2], shen_type_cons) && (shenjs_is_type(Arg13967_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg13967_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(reg_kl_used_vars_aux, [Arg13967_0[2][2][1], Arg13967_1, [shen_type_cons, Arg13967_0[2][1], Arg13967_2], Arg13967_3]);})
  : ((shenjs_is_type(Arg13967_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_used_vars_aux, [Arg13967_0[1], Arg13967_1, Arg13967_2, shenjs_call(reg_kl_used_vars_aux, [Arg13967_0[2], Arg13967_1, Arg13967_2, Arg13967_3])]);})
  : (((shenjs_is_type(Arg13967_0, shen_type_symbol) && ((!shenjs_call(reg_kl_var_defined$question$, [Arg13967_0, Arg13967_2])) && shenjs_call(reg_kl_var_defined$question$, [Arg13967_0, Arg13967_1]))))
  ? (function() {
  return shenjs_call_tail(shen_adjoin, [Arg13967_0, Arg13967_3]);})
  : Arg13967_3))))},
  4,
  [],
  "reg-kl-used-vars-aux"];
shenjs_functions["shen_reg-kl-used-vars-aux"] = reg_kl_used_vars_aux;






reg_kl_used_vars = [shen_type_func,
  function shen_user_lambda13970(Arg13969) {
  if (Arg13969.length < 2) return [shen_type_func, shen_user_lambda13970, 2, Arg13969];
  var Arg13969_0 = Arg13969[0], Arg13969_1 = Arg13969[1];
  return (function() {
  return shenjs_call_tail(reg_kl_used_vars_aux, [Arg13969_0, Arg13969_1, [], []]);})},
  2,
  [],
  "reg-kl-used-vars"];
shenjs_functions["shen_reg-kl-used-vars"] = reg_kl_used_vars;






reg_kl_remove_do = [shen_type_func,
  function shen_user_lambda13972(Arg13971) {
  if (Arg13971.length < 1) return [shen_type_func, shen_user_lambda13972, 1, Arg13971];
  var Arg13971_0 = Arg13971[0];
  return (((shenjs_is_type(Arg13971_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "do"], Arg13971_0[1]))))
  ? Arg13971_0[2]
  : [shen_type_cons, Arg13971_0, []])},
  1,
  [],
  "reg-kl-remove-do"];
shenjs_functions["shen_reg-kl-remove-do"] = reg_kl_remove_do;






reg_kl_remove_duplicates_aux = [shen_type_func,
  function shen_user_lambda13974(Arg13973) {
  if (Arg13973.length < 2) return [shen_type_func, shen_user_lambda13974, 2, Arg13973];
  var Arg13973_0 = Arg13973[0], Arg13973_1 = Arg13973[1];
  return ((shenjs_empty$question$(Arg13973_0))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg13973_1]);})
  : ((shenjs_is_type(Arg13973_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_remove_duplicates_aux, [Arg13973_0[2], shenjs_call(shen_adjoin, [Arg13973_0[1], Arg13973_1])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-remove-duplicates-aux"]]);})))},
  2,
  [],
  "reg-kl-remove-duplicates-aux"];
shenjs_functions["shen_reg-kl-remove-duplicates-aux"] = reg_kl_remove_duplicates_aux;






reg_kl_remove_duplicates = [shen_type_func,
  function shen_user_lambda13976(Arg13975) {
  if (Arg13975.length < 1) return [shen_type_func, shen_user_lambda13976, 1, Arg13975];
  var Arg13975_0 = Arg13975[0];
  return (function() {
  return shenjs_call_tail(reg_kl_remove_duplicates_aux, [Arg13975_0, []]);})},
  1,
  [],
  "reg-kl-remove-duplicates"];
shenjs_functions["shen_reg-kl-remove-duplicates"] = reg_kl_remove_duplicates;






reg_kl_used_vars_cascade_aux = [shen_type_func,
  function shen_user_lambda13978(Arg13977) {
  if (Arg13977.length < 4) return [shen_type_func, shen_user_lambda13978, 4, Arg13977];
  var Arg13977_0 = Arg13977[0], Arg13977_1 = Arg13977[1], Arg13977_2 = Arg13977[2], Arg13977_3 = Arg13977[3];
  var R0;
  return ((shenjs_empty$question$(Arg13977_0))
  ? Arg13977_3
  : ((shenjs_is_type(Arg13977_0, shen_type_cons))
  ? ((R0 = shenjs_call(reg_kl_used_vars_aux, [Arg13977_0[1], Arg13977_1, [], Arg13977_2])),
  (function() {
  return shenjs_call_tail(reg_kl_used_vars_cascade_aux, [Arg13977_0[2], Arg13977_1, R0, [shen_type_cons, R0, Arg13977_3]]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-used-vars-cascade-aux"]]);})))},
  4,
  [],
  "reg-kl-used-vars-cascade-aux"];
shenjs_functions["shen_reg-kl-used-vars-cascade-aux"] = reg_kl_used_vars_cascade_aux;






reg_kl_used_vars_cascade = [shen_type_func,
  function shen_user_lambda13980(Arg13979) {
  if (Arg13979.length < 3) return [shen_type_func, shen_user_lambda13980, 3, Arg13979];
  var Arg13979_0 = Arg13979[0], Arg13979_1 = Arg13979[1], Arg13979_2 = Arg13979[2];
  return (function() {
  return shenjs_call_tail(reg_kl_used_vars_cascade_aux, [shenjs_call(shen_reverse, [Arg13979_0]), Arg13979_1, Arg13979_2, []]);})},
  3,
  [],
  "reg-kl-used-vars-cascade"];
shenjs_functions["shen_reg-kl-used-vars-cascade"] = reg_kl_used_vars_cascade;






reg_kl_mk_shen_set_reg = [shen_type_func,
  function shen_user_lambda13982(Arg13981) {
  if (Arg13981.length < 2) return [shen_type_func, shen_user_lambda13982, 2, Arg13981];
  var Arg13981_0 = Arg13981[0], Arg13981_1 = Arg13981[1];
  return (((Arg13981_0 < 0))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["Cannot set function argument~%", []]);})
  : [shen_type_cons, [shen_type_symbol, "shen-set-reg!"], [shen_type_cons, Arg13981_0, [shen_type_cons, Arg13981_1, []]]])},
  2,
  [],
  "reg-kl-mk-shen-set-reg"];
shenjs_functions["shen_reg-kl-mk-shen-set-reg"] = reg_kl_mk_shen_set_reg;






reg_kl_mk_shen_get_reg = [shen_type_func,
  function shen_user_lambda13984(Arg13983) {
  if (Arg13983.length < 1) return [shen_type_func, shen_user_lambda13984, 1, Arg13983];
  var Arg13983_0 = Arg13983[0];
  return (((Arg13983_0 < 0))
  ? [shen_type_cons, [shen_type_symbol, "shen-get-arg"], [shen_type_cons, ((0 - Arg13983_0) - 1), []]]
  : [shen_type_cons, [shen_type_symbol, "shen-get-reg"], [shen_type_cons, Arg13983_0, []]])},
  1,
  [],
  "reg-kl-mk-shen-get-reg"];
shenjs_functions["shen_reg-kl-mk-shen-get-reg"] = reg_kl_mk_shen_get_reg;






reg_kl_reuse_idx = [shen_type_func,
  function shen_user_lambda13986(Arg13985) {
  if (Arg13985.length < 2) return [shen_type_func, shen_user_lambda13986, 2, Arg13985];
  var Arg13985_0 = Arg13985[0], Arg13985_1 = Arg13985[1];
  return ((shenjs_empty$question$(Arg13985_1))
  ? shen_fail_obj
  : (((shenjs_is_type(Arg13985_1, shen_type_cons) && (shenjs_is_type(Arg13985_1[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(Arg13985_1[1][1], Arg13985_0)) && (Arg13985_1[1][2] >= 0)))))
  ? Arg13985_1[1][2]
  : ((shenjs_is_type(Arg13985_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_reuse_idx, [Arg13985_0, Arg13985_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-reuse-idx"]]);}))))},
  2,
  [],
  "reg-kl-reuse-idx"];
shenjs_functions["shen_reg-kl-reuse-idx"] = reg_kl_reuse_idx;






reg_kl_new_var_idx_or_reuse = [shen_type_func,
  function shen_user_lambda13988(Arg13987) {
  if (Arg13987.length < 3) return [shen_type_func, shen_user_lambda13988, 3, Arg13987];
  var Arg13987_0 = Arg13987[0], Arg13987_1 = Arg13987[1], Arg13987_2 = Arg13987[2];
  var R0, R1;
  return ((shenjs_empty$question$(Arg13987_2))
  ? (function() {
  return shenjs_call_tail(reg_kl_new_var_idx, [Arg13987_0, Arg13987_1]);})
  : ((R0 = (new Shenjs_freeze([Arg13987_0, Arg13987_2, Arg13987_1], function(Arg13989) {
  var Arg13989_0 = Arg13989[0], Arg13989_1 = Arg13989[1], Arg13989_2 = Arg13989[2];
  return (function() {
  return ((shenjs_is_type(Arg13989_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_new_var_idx_or_reuse, [Arg13989_0, Arg13989_2, Arg13989_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-new-var-idx-or-reuse"]]);}));})}))),
  ((shenjs_is_type(Arg13987_2, shen_type_cons))
  ? ((R1 = shenjs_call(reg_kl_reuse_idx, [Arg13987_2[1], Arg13987_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, shen_fail_obj)))
  ? shenjs_thaw(R0)
  : R1))
  : shenjs_thaw(R0))))},
  3,
  [],
  "reg-kl-new-var-idx-or-reuse"];
shenjs_functions["shen_reg-kl-new-var-idx-or-reuse"] = reg_kl_new_var_idx_or_reuse;






reg_kl_add_var_aux = [shen_type_func,
  function shen_user_lambda13992(Arg13991) {
  if (Arg13991.length < 4) return [shen_type_func, shen_user_lambda13992, 4, Arg13991];
  var Arg13991_0 = Arg13991[0], Arg13991_1 = Arg13991[1], Arg13991_2 = Arg13991[2], Arg13991_3 = Arg13991[3];
  return ((shenjs_empty$question$(Arg13991_2))
  ? [shen_type_cons, [shen_type_cons, Arg13991_0, Arg13991_1], shenjs_call(shen_reverse, [Arg13991_3])]
  : (((shenjs_is_type(Arg13991_2, shen_type_cons) && (shenjs_is_type(Arg13991_2[1], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg13991_2[1][2], Arg13991_1)))))
  ? (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(shen_reverse, [[shen_type_cons, [shen_type_cons, Arg13991_0, Arg13991_2[1][2]], Arg13991_3]]), Arg13991_2[2]]);})
  : ((shenjs_is_type(Arg13991_2, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_add_var_aux, [Arg13991_0, Arg13991_1, Arg13991_2[2], [shen_type_cons, Arg13991_2[1], Arg13991_3]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-add-var-aux"]]);}))))},
  4,
  [],
  "reg-kl-add-var-aux"];
shenjs_functions["shen_reg-kl-add-var-aux"] = reg_kl_add_var_aux;






reg_kl_add_var = [shen_type_func,
  function shen_user_lambda13994(Arg13993) {
  if (Arg13993.length < 3) return [shen_type_func, shen_user_lambda13994, 3, Arg13993];
  var Arg13993_0 = Arg13993[0], Arg13993_1 = Arg13993[1], Arg13993_2 = Arg13993[2];
  return (function() {
  return shenjs_call_tail(reg_kl_add_var_aux, [Arg13993_0, Arg13993_1, Arg13993_2, []]);})},
  3,
  [],
  "reg-kl-add-var"];
shenjs_functions["shen_reg-kl-add-var"] = reg_kl_add_var;






reg_kl_walk_let_expr = [shen_type_func,
  function shen_user_lambda13996(Arg13995) {
  if (Arg13995.length < 8) return [shen_type_func, shen_user_lambda13996, 8, Arg13995];
  var Arg13995_0 = Arg13995[0], Arg13995_1 = Arg13995[1], Arg13995_2 = Arg13995[2], Arg13995_3 = Arg13995[3], Arg13995_4 = Arg13995[4], Arg13995_5 = Arg13995[5], Arg13995_6 = Arg13995[6], Arg13995_7 = Arg13995[7];
  var R0, R1, R2;
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg13995_7)))
  ? ((R0 = shenjs_call(shen_remove, [Arg13995_0, Arg13995_3])),
  (R0 = shenjs_call(shen_append, [R0, Arg13995_5])),
  (R1 = shenjs_call(shen_difference, [shenjs_call(shen_map, [[shen_type_symbol, "head"], Arg13995_2]), R0])),
  (R1 = shenjs_call(reg_kl_new_var_idx_or_reuse, [Arg13995_0, Arg13995_2, R1])),
  (R2 = shenjs_call(reg_kl_add_var, [Arg13995_0, R1, Arg13995_2])),
  (R0 = shenjs_call(reg_kl_walk_expr, [Arg13995_1, Arg13995_2, Arg13995_4, R0, Arg13995_6])),
  [shen_tuple, shenjs_call(reg_kl_mk_shen_set_reg, [R1, R0]), R2])
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg13995_7)))
  ? [shen_tuple, shenjs_call(reg_kl_walk_expr, [Arg13995_1, Arg13995_2, Arg13995_4, Arg13995_5, Arg13995_6]), Arg13995_2]
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-walk-let-expr"]]);})))},
  8,
  [],
  "reg-kl-walk-let-expr"];
shenjs_functions["shen_reg-kl-walk-let-expr"] = reg_kl_walk_let_expr;






reg_kl_walk_let = [shen_type_func,
  function shen_user_lambda13998(Arg13997) {
  if (Arg13997.length < 7) return [shen_type_func, shen_user_lambda13998, 7, Arg13997];
  var Arg13997_0 = Arg13997[0], Arg13997_1 = Arg13997[1], Arg13997_2 = Arg13997[2], Arg13997_3 = Arg13997[3], Arg13997_4 = Arg13997[4], Arg13997_5 = Arg13997[5], Arg13997_6 = Arg13997[6];
  var R0, R1, R2;
  return ((R0 = shenjs_call(reg_kl_used_vars, [Arg13997_2, [shen_type_cons, Arg13997_0, Arg13997_3]])),
  (R1 = shenjs_call(shen_element$question$, [Arg13997_0, R0])),
  ((R1)
  ? [shen_type_cons, Arg13997_0, Arg13997_4]
  : Arg13997_4),
  (R1 = shenjs_call(reg_kl_walk_let_expr, [Arg13997_0, Arg13997_1, Arg13997_3, R0, Arg13997_4, Arg13997_5, Arg13997_6, R1])),
  (R2 = shenjs_call(shen_fst, [R1])),
  (R1 = shenjs_call(shen_snd, [R1])),
  (R1 = shenjs_call(reg_kl_remove_do, [shenjs_call(reg_kl_walk_expr, [Arg13997_2, R1, shenjs_call(shen_append, [R0, Arg13997_5]), Arg13997_5, Arg13997_6])])),
  (R2 = ((shenjs_is_type(R2, shen_type_cons))
  ? [shen_type_cons, R2, R1]
  : R1)),
  [shen_type_cons, [shen_type_symbol, "do"], R2])},
  7,
  [],
  "reg-kl-walk-let"];
shenjs_functions["shen_reg-kl-walk-let"] = reg_kl_walk_let;






reg_kl_walk_do_aux = [shen_type_func,
  function shen_user_lambda14000(Arg13999) {
  if (Arg13999.length < 6) return [shen_type_func, shen_user_lambda14000, 6, Arg13999];
  var Arg13999_0 = Arg13999[0], Arg13999_1 = Arg13999[1], Arg13999_2 = Arg13999[2], Arg13999_3 = Arg13999[3], Arg13999_4 = Arg13999[4], Arg13999_5 = Arg13999[5];
  var R0, R1;
  return (((shenjs_empty$question$(Arg13999_0) && shenjs_empty$question$(Arg13999_2)))
  ? Arg13999_5
  : (((shenjs_is_type(Arg13999_0, shen_type_cons) && (shenjs_empty$question$(Arg13999_0[2]) && (shenjs_is_type(Arg13999_2, shen_type_cons) && shenjs_empty$question$(Arg13999_2[2])))))
  ? ((R0 = shenjs_call(reg_kl_walk_expr, [Arg13999_0[1], Arg13999_1, Arg13999_2[1], Arg13999_3, Arg13999_4])),
  (R0 = shenjs_call(shen_append, [Arg13999_5, shenjs_call(reg_kl_remove_do, [R0])])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_do_aux, [[], Arg13999_1, [], Arg13999_3, Arg13999_4, R0]);}))
  : (((shenjs_is_type(Arg13999_0, shen_type_cons) && (shenjs_is_type(Arg13999_2, shen_type_cons) && shenjs_is_type(Arg13999_2[2], shen_type_cons))))
  ? ((R0 = shenjs_call(reg_kl_walk_expr, [Arg13999_0[1], Arg13999_1, Arg13999_2[1], Arg13999_2[2][1], Arg13999_4])),
  (R0 = shenjs_call(shen_append, [Arg13999_5, shenjs_call(reg_kl_remove_do, [R0])])),
  (R1 = Arg13999_2[2]),
  (function() {
  return shenjs_call_tail(reg_kl_walk_do_aux, [Arg13999_0[2], Arg13999_1, R1, Arg13999_3, Arg13999_4, R0]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-walk-do-aux"]]);}))))},
  6,
  [],
  "reg-kl-walk-do-aux"];
shenjs_functions["shen_reg-kl-walk-do-aux"] = reg_kl_walk_do_aux;






reg_kl_walk_do = [shen_type_func,
  function shen_user_lambda14002(Arg14001) {
  if (Arg14001.length < 5) return [shen_type_func, shen_user_lambda14002, 5, Arg14001];
  var Arg14001_0 = Arg14001[0], Arg14001_1 = Arg14001[1], Arg14001_2 = Arg14001[2], Arg14001_3 = Arg14001[3], Arg14001_4 = Arg14001[4];
  var R0;
  return ((R0 = shenjs_call(reg_kl_used_vars_cascade, [Arg14001_0, Arg14001_1, Arg14001_2])),
  (R0 = shenjs_call(reg_kl_walk_do_aux, [Arg14001_0, Arg14001_1, R0, Arg14001_3, Arg14001_4, []])),
  [shen_type_cons, [shen_type_symbol, "do"], R0])},
  5,
  [],
  "reg-kl-walk-do"];
shenjs_functions["shen_reg-kl-walk-do"] = reg_kl_walk_do;






reg_kl_walk_apply_aux = [shen_type_func,
  function shen_user_lambda14004(Arg14003) {
  if (Arg14003.length < 6) return [shen_type_func, shen_user_lambda14004, 6, Arg14003];
  var Arg14003_0 = Arg14003[0], Arg14003_1 = Arg14003[1], Arg14003_2 = Arg14003[2], Arg14003_3 = Arg14003[3], Arg14003_4 = Arg14003[4], Arg14003_5 = Arg14003[5];
  var R0;
  return (((shenjs_empty$question$(Arg14003_0) && shenjs_empty$question$(Arg14003_2)))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg14003_5]);})
  : (((shenjs_is_type(Arg14003_0, shen_type_cons) && (shenjs_empty$question$(Arg14003_0[2]) && (shenjs_is_type(Arg14003_2, shen_type_cons) && shenjs_empty$question$(Arg14003_2[2])))))
  ? ((R0 = shenjs_call(reg_kl_walk_expr, [Arg14003_0[1], Arg14003_1, Arg14003_2[1], Arg14003_3, Arg14003_4])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_apply_aux, [[], Arg14003_1, [], Arg14003_3, Arg14003_4, [shen_type_cons, R0, Arg14003_5]]);}))
  : (((shenjs_is_type(Arg14003_0, shen_type_cons) && (shenjs_is_type(Arg14003_2, shen_type_cons) && shenjs_is_type(Arg14003_2[2], shen_type_cons))))
  ? ((R0 = shenjs_call(reg_kl_walk_expr, [Arg14003_0[1], Arg14003_1, Arg14003_2[1], Arg14003_2[2][1], Arg14003_4])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_apply_aux, [Arg14003_0[2], Arg14003_1, Arg14003_2[2], Arg14003_3, Arg14003_4, [shen_type_cons, R0, Arg14003_5]]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-walk-apply-aux"]]);}))))},
  6,
  [],
  "reg-kl-walk-apply-aux"];
shenjs_functions["shen_reg-kl-walk-apply-aux"] = reg_kl_walk_apply_aux;






reg_kl_walk_apply = [shen_type_func,
  function shen_user_lambda14006(Arg14005) {
  if (Arg14005.length < 5) return [shen_type_func, shen_user_lambda14006, 5, Arg14005];
  var Arg14005_0 = Arg14005[0], Arg14005_1 = Arg14005[1], Arg14005_2 = Arg14005[2], Arg14005_3 = Arg14005[3], Arg14005_4 = Arg14005[4];
  var R0;
  return ((R0 = shenjs_call(reg_kl_used_vars_cascade, [Arg14005_0, Arg14005_1, Arg14005_2])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_apply_aux, [Arg14005_0, Arg14005_1, R0, Arg14005_3, Arg14005_4, []]);}))},
  5,
  [],
  "reg-kl-walk-apply"];
shenjs_functions["shen_reg-kl-walk-apply"] = reg_kl_walk_apply;






reg_kl_walk_if = [shen_type_func,
  function shen_user_lambda14008(Arg14007) {
  if (Arg14007.length < 7) return [shen_type_func, shen_user_lambda14008, 7, Arg14007];
  var Arg14007_0 = Arg14007[0], Arg14007_1 = Arg14007[1], Arg14007_2 = Arg14007[2], Arg14007_3 = Arg14007[3], Arg14007_4 = Arg14007[4], Arg14007_5 = Arg14007[5], Arg14007_6 = Arg14007[6];
  var R0, R1, R2;
  return ((R0 = shenjs_call(reg_kl_used_vars_aux, [Arg14007_1, Arg14007_3, [], Arg14007_5])),
  (R1 = shenjs_call(reg_kl_used_vars_aux, [Arg14007_2, Arg14007_3, [], Arg14007_5])),
  (R2 = shenjs_call(shen_append, [R0, R1])),
  (R2 = shenjs_call(reg_kl_walk_expr, [Arg14007_0, Arg14007_3, Arg14007_4, R2, Arg14007_6])),
  (R0 = shenjs_call(reg_kl_walk_expr, [Arg14007_1, Arg14007_3, R0, Arg14007_5, Arg14007_6])),
  (R1 = shenjs_call(reg_kl_walk_expr, [Arg14007_2, Arg14007_3, R1, Arg14007_5, Arg14007_6])),
  [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, R2, [shen_type_cons, R0, [shen_type_cons, R1, []]]]])},
  7,
  [],
  "reg-kl-walk-if"];
shenjs_functions["shen_reg-kl-walk-if"] = reg_kl_walk_if;






reg_kl_walk_cond = [shen_type_func,
  function shen_user_lambda14010(Arg14009) {
  if (Arg14009.length < 5) return [shen_type_func, shen_user_lambda14010, 5, Arg14009];
  var Arg14009_0 = Arg14009[0], Arg14009_1 = Arg14009[1], Arg14009_2 = Arg14009[2], Arg14009_3 = Arg14009[3], Arg14009_4 = Arg14009[4];
  var R0, R1, R2;
  return ((shenjs_empty$question$(Arg14009_0))
  ? [shen_type_cons, [shen_type_symbol, "error"], [shen_type_cons, "error: cond failure", []]]
  : (((shenjs_is_type(Arg14009_0, shen_type_cons) && (shenjs_is_type(Arg14009_0[1], shen_type_cons) && (shenjs_is_type(Arg14009_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg14009_0[1][2][2])))))
  ? ((R0 = shenjs_call(reg_kl_used_vars_aux, [Arg14009_0[1][2][1], Arg14009_1, [], Arg14009_3])),
  (R1 = shenjs_call(reg_kl_used_vars_aux, [Arg14009_0[2], Arg14009_1, [], Arg14009_3])),
  (R0 = shenjs_call(reg_kl_used_vars_aux, [Arg14009_0[1][1], Arg14009_1, [], shenjs_call(shen_append, [R0, R1])])),
  (R2 = shenjs_call(reg_kl_walk_cond, [Arg14009_0[2], Arg14009_1, Arg14009_2, Arg14009_3, Arg14009_4])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_if, [Arg14009_0[1][1], Arg14009_0[1][2][1], R2, Arg14009_1, R0, R1, Arg14009_4]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-walk-cond"]]);})))},
  5,
  [],
  "reg-kl-walk-cond"];
shenjs_functions["shen_reg-kl-walk-cond"] = reg_kl_walk_cond;






reg_kl_mk_closure_kl = [shen_type_func,
  function shen_user_lambda14012(Arg14011) {
  if (Arg14011.length < 3) return [shen_type_func, shen_user_lambda14012, 3, Arg14011];
  var Arg14011_0 = Arg14011[0], Arg14011_1 = Arg14011[1], Arg14011_2 = Arg14011[2];
  return [shen_type_cons, [shen_type_symbol, "shen-mk-closure"], [shen_type_cons, Arg14011_0, [shen_type_cons, Arg14011_1, [shen_type_cons, Arg14011_2, []]]]]},
  3,
  [],
  "reg-kl-mk-closure-kl"];
shenjs_functions["shen_reg-kl-mk-closure-kl"] = reg_kl_mk_closure_kl;






reg_kl_mk_closure_args_init = [shen_type_func,
  function shen_user_lambda14014(Arg14013) {
  if (Arg14013.length < 3) return [shen_type_func, shen_user_lambda14014, 3, Arg14013];
  var Arg14013_0 = Arg14013[0], Arg14013_1 = Arg14013[1], Arg14013_2 = Arg14013[2];
  var R0;
  return ((shenjs_empty$question$(Arg14013_0))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg14013_2]);})
  : ((shenjs_is_type(Arg14013_0, shen_type_cons))
  ? ((R0 = shenjs_call(reg_kl_mk_shen_get_reg, [shenjs_call(reg_kl_var_idx, [Arg14013_0[1], Arg14013_1])])),
  (function() {
  return shenjs_call_tail(reg_kl_mk_closure_args_init, [Arg14013_0[2], Arg14013_1, [shen_type_cons, R0, Arg14013_2]]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-mk-closure-args-init"]]);})))},
  3,
  [],
  "reg-kl-mk-closure-args-init"];
shenjs_functions["shen_reg-kl-mk-closure-args-init"] = reg_kl_mk_closure_args_init;






reg_kl_mk_closure_env = [shen_type_func,
  function shen_user_lambda14016(Arg14015) {
  if (Arg14015.length < 2) return [shen_type_func, shen_user_lambda14016, 2, Arg14015];
  var Arg14015_0 = Arg14015[0], Arg14015_1 = Arg14015[1];
  return ((shenjs_empty$question$(Arg14015_0))
  ? Arg14015_1
  : ((shenjs_is_type(Arg14015_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_mk_closure_env, [Arg14015_0[2], [shen_type_cons, [shen_type_cons, Arg14015_0[1], shenjs_call(reg_kl_new_var_idx, [Arg14015_0[1], Arg14015_1])], Arg14015_1]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-mk-closure-env"]]);})))},
  2,
  [],
  "reg-kl-mk-closure-env"];
shenjs_functions["shen_reg-kl-mk-closure-env"] = reg_kl_mk_closure_env;






reg_kl_mk_closure_list = [shen_type_func,
  function shen_user_lambda14018(Arg14017) {
  if (Arg14017.length < 5) return [shen_type_func, shen_user_lambda14018, 5, Arg14017];
  var Arg14017_0 = Arg14017[0], Arg14017_1 = Arg14017[1], Arg14017_2 = Arg14017[2], Arg14017_3 = Arg14017[3], Arg14017_4 = Arg14017[4];
  var R0, R1;
  return ((R0 = shenjs_call(reg_kl_mk_closure_env, [Arg14017_3, []])),
  (R1 = shenjs_call(reg_kl_mk_closure_args_init, [Arg14017_3, Arg14017_2, []])),
  (R0 = shenjs_call(reg_kl_mk_function_kl, [Arg14017_0, Arg14017_1, R0, Arg14017_4])),
  [shen_type_cons, R1, [shen_type_cons, R0, []]])},
  5,
  [],
  "reg-kl-mk-closure-list"];
shenjs_functions["shen_reg-kl-mk-closure-list"] = reg_kl_mk_closure_list;






reg_kl_walk_lambda_aux = [shen_type_func,
  function shen_user_lambda14020(Arg14019) {
  if (Arg14019.length < 6) return [shen_type_func, shen_user_lambda14020, 6, Arg14019];
  var Arg14019_0 = Arg14019[0], Arg14019_1 = Arg14019[1], Arg14019_2 = Arg14019[2], Arg14019_3 = Arg14019[3], Arg14019_4 = Arg14019[4], Arg14019_5 = Arg14019[5];
  var R0, R1;
  return (((shenjs_is_type(Arg14019_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "lambda"], Arg14019_1[1])) && (shenjs_is_type(Arg14019_1[2], shen_type_cons) && (shenjs_is_type(Arg14019_1[2][2], shen_type_cons) && shenjs_empty$question$(Arg14019_1[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_lambda_aux, [Arg14019_1[2][1], Arg14019_1[2][2][1], [shen_type_cons, Arg14019_0, Arg14019_2], Arg14019_3, Arg14019_4, Arg14019_5]);})
  : ((R0 = shenjs_call(shen_reverse, [[shen_type_cons, Arg14019_0, Arg14019_2]])),
  (R1 = shenjs_call(shen_append, [Arg14019_4, shenjs_call(shen_reverse, [[shen_type_cons, Arg14019_0, R0]])])),
  (R1 = shenjs_call(reg_kl_mk_closure_list, [R1, Arg14019_1, Arg14019_3, Arg14019_4, Arg14019_5])),
  [shen_type_cons, [shen_type_symbol, "shen-mk-closure"], [shen_type_cons, R0, R1]]))},
  6,
  [],
  "reg-kl-walk-lambda-aux"];
shenjs_functions["shen_reg-kl-walk-lambda-aux"] = reg_kl_walk_lambda_aux;






reg_kl_walk_lambda = [shen_type_func,
  function shen_user_lambda14022(Arg14021) {
  if (Arg14021.length < 5) return [shen_type_func, shen_user_lambda14022, 5, Arg14021];
  var Arg14021_0 = Arg14021[0], Arg14021_1 = Arg14021[1], Arg14021_2 = Arg14021[2], Arg14021_3 = Arg14021[3], Arg14021_4 = Arg14021[4];
  var R0;
  return ((R0 = shenjs_call(reg_kl_used_vars, [[shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, Arg14021_0, [shen_type_cons, Arg14021_1, []]]], Arg14021_3])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_lambda_aux, [Arg14021_0, Arg14021_1, Arg14021_2, Arg14021_3, R0, Arg14021_4]);}))},
  5,
  [],
  "reg-kl-walk-lambda"];
shenjs_functions["shen_reg-kl-walk-lambda"] = reg_kl_walk_lambda;






reg_kl_walk_freeze = [shen_type_func,
  function shen_user_lambda14024(Arg14023) {
  if (Arg14023.length < 4) return [shen_type_func, shen_user_lambda14024, 4, Arg14023];
  var Arg14023_0 = Arg14023[0], Arg14023_1 = Arg14023[1], Arg14023_2 = Arg14023[2], Arg14023_3 = Arg14023[3];
  var R0;
  return ((R0 = shenjs_call(reg_kl_mk_closure_list, [Arg14023_2, Arg14023_0, Arg14023_1, Arg14023_2, Arg14023_3])),
  [shen_type_cons, [shen_type_symbol, "shen-mk-freeze"], R0])},
  4,
  [],
  "reg-kl-walk-freeze"];
shenjs_functions["shen_reg-kl-walk-freeze"] = reg_kl_walk_freeze;






reg_kl_lift_defun = [shen_type_func,
  function shen_user_lambda14026(Arg14025) {
  if (Arg14025.length < 4) return [shen_type_func, shen_user_lambda14026, 4, Arg14025];
  var Arg14025_0 = Arg14025[0], Arg14025_1 = Arg14025[1], Arg14025_2 = Arg14025[2], Arg14025_3 = Arg14025[3];
  var R0, R1;
  return ((R0 = shenjs_call(reg_kl_mk_context, [shenjs_call(reg_kl_context_toplevel, [Arg14025_3]), 0])),
  (R1 = shenjs_call(reg_kl_mk_defun_kl, [Arg14025_0, Arg14025_1, Arg14025_2, [], R0])),
  shenjs_call(reg_kl_context_toplevel_$gt$, [Arg14025_3, [shen_type_cons, R1, shenjs_call(reg_kl_context_toplevel, [R0])]]),
  [shen_type_cons, [shen_type_symbol, "function"], [shen_type_cons, Arg14025_0, []]])},
  4,
  [],
  "reg-kl-lift-defun"];
shenjs_functions["shen_reg-kl-lift-defun"] = reg_kl_lift_defun;






reg_kl_walk_expr = [shen_type_func,
  function shen_user_lambda14028(Arg14027) {
  if (Arg14027.length < 5) return [shen_type_func, shen_user_lambda14028, 5, Arg14027];
  var Arg14027_0 = Arg14027[0], Arg14027_1 = Arg14027[1], Arg14027_2 = Arg14027[2], Arg14027_3 = Arg14027[3], Arg14027_4 = Arg14027[4];
  return (((shenjs_is_type(Arg14027_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg14027_0[1])) && (shenjs_is_type(Arg14027_0[2], shen_type_cons) && (shenjs_is_type(Arg14027_0[2][2], shen_type_cons) && (shenjs_is_type(Arg14027_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg14027_0[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_let, [Arg14027_0[2][1], Arg14027_0[2][2][1], Arg14027_0[2][2][2][1], Arg14027_1, Arg14027_2, Arg14027_3, Arg14027_4]);})
  : (((shenjs_is_type(Arg14027_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "if"], Arg14027_0[1])) && (shenjs_is_type(Arg14027_0[2], shen_type_cons) && (shenjs_is_type(Arg14027_0[2][2], shen_type_cons) && (shenjs_is_type(Arg14027_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg14027_0[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_if, [Arg14027_0[2][1], Arg14027_0[2][2][1], Arg14027_0[2][2][2][1], Arg14027_1, Arg14027_2, Arg14027_3, Arg14027_4]);})
  : (((shenjs_is_type(Arg14027_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cond"], Arg14027_0[1]))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_cond, [Arg14027_0[2], Arg14027_1, Arg14027_2, Arg14027_3, Arg14027_4]);})
  : (((shenjs_is_type(Arg14027_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "do"], Arg14027_0[1]))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_do, [Arg14027_0[2], Arg14027_1, Arg14027_2, Arg14027_3, Arg14027_4]);})
  : (((shenjs_is_type(Arg14027_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "lambda"], Arg14027_0[1])) && (shenjs_is_type(Arg14027_0[2], shen_type_cons) && (shenjs_is_type(Arg14027_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg14027_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_lambda, [Arg14027_0[2][1], Arg14027_0[2][2][1], [], Arg14027_1, Arg14027_4]);})
  : (((shenjs_is_type(Arg14027_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "freeze"], Arg14027_0[1])) && (shenjs_is_type(Arg14027_0[2], shen_type_cons) && shenjs_empty$question$(Arg14027_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_freeze, [Arg14027_0[2][1], Arg14027_1, Arg14027_2, Arg14027_4]);})
  : (((shenjs_is_type(Arg14027_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defun"], Arg14027_0[1])) && (shenjs_is_type(Arg14027_0[2], shen_type_cons) && (shenjs_is_type(Arg14027_0[2][2], shen_type_cons) && (shenjs_is_type(Arg14027_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg14027_0[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(reg_kl_lift_defun, [Arg14027_0[2][1], Arg14027_0[2][2][1], Arg14027_0[2][2][2][1], Arg14027_4]);})
  : ((shenjs_is_type(Arg14027_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_apply, [Arg14027_0, Arg14027_1, Arg14027_2, Arg14027_3, Arg14027_4]);})
  : (((shenjs_call(reg_kl_var_defined$question$, [Arg14027_0, Arg14027_1]) && shenjs_is_type(Arg14027_0, shen_type_symbol)))
  ? (function() {
  return shenjs_call_tail(reg_kl_mk_shen_get_reg, [shenjs_call(reg_kl_var_idx, [Arg14027_0, Arg14027_1])]);})
  : Arg14027_0)))))))))},
  5,
  [],
  "reg-kl-walk-expr"];
shenjs_functions["shen_reg-kl-walk-expr"] = reg_kl_walk_expr;






reg_kl_mk_defun_env = [shen_type_func,
  function shen_user_lambda14030(Arg14029) {
  if (Arg14029.length < 3) return [shen_type_func, shen_user_lambda14030, 3, Arg14029];
  var Arg14029_0 = Arg14029[0], Arg14029_1 = Arg14029[1], Arg14029_2 = Arg14029[2];
  return ((shenjs_empty$question$(Arg14029_0))
  ? Arg14029_2
  : ((shenjs_is_type(Arg14029_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_mk_defun_env, [Arg14029_0[2], (Arg14029_1 - 1), [shen_type_cons, [shen_type_cons, Arg14029_0[1], Arg14029_1], Arg14029_2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-mk-defun-env"]]);})))},
  3,
  [],
  "reg-kl-mk-defun-env"];
shenjs_functions["shen_reg-kl-mk-defun-env"] = reg_kl_mk_defun_env;






reg_kl_mk_function_kl = [shen_type_func,
  function shen_user_lambda14032(Arg14031) {
  if (Arg14031.length < 4) return [shen_type_func, shen_user_lambda14032, 4, Arg14031];
  var Arg14031_0 = Arg14031[0], Arg14031_1 = Arg14031[1], Arg14031_2 = Arg14031[2], Arg14031_3 = Arg14031[3];
  var R0, R1;
  return ((R0 = shenjs_call(reg_kl_remove_duplicates, [Arg14031_0])),
  (R1 = shenjs_call(reg_kl_mk_defun_env, [R0, -1, Arg14031_2])),
  (R0 = shenjs_call(reg_kl_used_vars, [Arg14031_1, R0])),
  (function() {
  return shenjs_call_tail(reg_kl_walk_expr, [Arg14031_1, R1, R0, [], Arg14031_3]);}))},
  4,
  [],
  "reg-kl-mk-function-kl"];
shenjs_functions["shen_reg-kl-mk-function-kl"] = reg_kl_mk_function_kl;






reg_kl_mk_defun_kl = [shen_type_func,
  function shen_user_lambda14034(Arg14033) {
  if (Arg14033.length < 5) return [shen_type_func, shen_user_lambda14034, 5, Arg14033];
  var Arg14033_0 = Arg14033[0], Arg14033_1 = Arg14033[1], Arg14033_2 = Arg14033[2], Arg14033_3 = Arg14033[3], Arg14033_4 = Arg14033[4];
  var R0;
  return ((R0 = shenjs_call(reg_kl_mk_function_kl, [Arg14033_1, Arg14033_2, Arg14033_3, Arg14033_4])),
  [shen_type_cons, [shen_type_symbol, "shen-mk-func"], [shen_type_cons, Arg14033_0, [shen_type_cons, Arg14033_1, [shen_type_cons, R0, []]]]])},
  5,
  [],
  "reg-kl-mk-defun-kl"];
shenjs_functions["shen_reg-kl-mk-defun-kl"] = reg_kl_mk_defun_kl;






reg_kl_walk_toplevel = [shen_type_func,
  function shen_user_lambda14036(Arg14035) {
  if (Arg14035.length < 2) return [shen_type_func, shen_user_lambda14036, 2, Arg14035];
  var Arg14035_0 = Arg14035[0], Arg14035_1 = Arg14035[1];
  var R0, R1;
  return (((shenjs_is_type(Arg14035_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defun"], Arg14035_0[1])) && (shenjs_is_type(Arg14035_0[2], shen_type_cons) && (shenjs_is_type(Arg14035_0[2][2], shen_type_cons) && (shenjs_is_type(Arg14035_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg14035_0[2][2][2][2])))))))
  ? ((R0 = shenjs_call(reg_kl_mk_context, [Arg14035_1, 0])),
  (R1 = shenjs_call(reg_kl_mk_defun_kl, [Arg14035_0[2][1], Arg14035_0[2][2][1], Arg14035_0[2][2][2][1], [], R0])),
  [shen_type_cons, R1, shenjs_call(reg_kl_context_toplevel, [R0])])
  : ((R0 = shenjs_call(reg_kl_mk_context, [Arg14035_1, 0])),
  (R1 = shenjs_call(reg_kl_walk_expr, [Arg14035_0, [], [], [], R0])),
  [shen_type_cons, R1, shenjs_call(reg_kl_context_toplevel, [R0])]))},
  2,
  [],
  "reg-kl-walk-toplevel"];
shenjs_functions["shen_reg-kl-walk-toplevel"] = reg_kl_walk_toplevel;






reg_kl_walk_aux = [shen_type_func,
  function shen_user_lambda14038(Arg14037) {
  if (Arg14037.length < 2) return [shen_type_func, shen_user_lambda14038, 2, Arg14037];
  var Arg14037_0 = Arg14037[0], Arg14037_1 = Arg14037[1];
  return ((shenjs_empty$question$(Arg14037_0))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg14037_1]);})
  : ((shenjs_is_type(Arg14037_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(reg_kl_walk_aux, [Arg14037_0[2], shenjs_call(reg_kl_walk_toplevel, [Arg14037_0[1], Arg14037_1])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "reg-kl-walk-aux"]]);})))},
  2,
  [],
  "reg-kl-walk-aux"];
shenjs_functions["shen_reg-kl-walk-aux"] = reg_kl_walk_aux;






reg_kl_walk = [shen_type_func,
  function shen_user_lambda14040(Arg14039) {
  if (Arg14039.length < 1) return [shen_type_func, shen_user_lambda14040, 1, Arg14039];
  var Arg14039_0 = Arg14039[0];
  return (function() {
  return shenjs_call_tail(reg_kl_walk_aux, [Arg14039_0, []]);})},
  1,
  [],
  "reg-kl-walk"];
shenjs_functions["shen_reg-kl-walk"] = reg_kl_walk;






shenjs_call(shen_process_datatype, [[shen_type_symbol, "js-context"], shenjs_call(shen_compile, [[shen_type_symbol, "shen-<datatype-rules>"], [shen_type_cons, [shen_type_symbol, "Varname"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "Argname"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "Toplevel"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "Nregs"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "Nregs"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "Toplevel"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "Argname"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "Varname"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 0, []]], []]]], []]]], []]]], []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 4, []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 4, [shen_type_cons, [shen_type_symbol, "B"], []]]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 3, []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "B"], []]]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 2, []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "B"], []]]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 1, []]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "B"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, "_______________________"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "A"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "B"], []]]]], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "js-context"], [shen_type_cons, [shen_type_symbol, ";"], []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]], [shen_type_symbol, "shen-datatype-error"]])]);





js_mk_context = [shen_type_func,
  function shen_user_lambda14546(Arg14545) {
  if (Arg14545.length < 4) return [shen_type_func, shen_user_lambda14546, 4, Arg14545];
  var Arg14545_0 = Arg14545[0], Arg14545_1 = Arg14545[1], Arg14545_2 = Arg14545[2], Arg14545_3 = Arg14545[3];
  return (function() {
  return shenjs_call_tail(shen_$at$v, [Arg14545_0, shenjs_call(shen_$at$v, [Arg14545_1, shenjs_call(shen_$at$v, [Arg14545_2, shenjs_call(shen_$at$v, [Arg14545_3, shenjs_vector(0)])])])]);})},
  4,
  [],
  "js-mk-context"];
shenjs_functions["shen_js-mk-context"] = js_mk_context;






js_context_varname_$gt$ = [shen_type_func,
  function shen_user_lambda14548(Arg14547) {
  if (Arg14547.length < 2) return [shen_type_func, shen_user_lambda14548, 2, Arg14547];
  var Arg14547_0 = Arg14547[0], Arg14547_1 = Arg14547[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$, [Arg14547_0, 4, Arg14547_1]);})},
  2,
  [],
  "js-context-varname->"];
shenjs_functions["shen_js-context-varname->"] = js_context_varname_$gt$;






js_context_argname_$gt$ = [shen_type_func,
  function shen_user_lambda14550(Arg14549) {
  if (Arg14549.length < 2) return [shen_type_func, shen_user_lambda14550, 2, Arg14549];
  var Arg14549_0 = Arg14549[0], Arg14549_1 = Arg14549[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$, [Arg14549_0, 3, Arg14549_1]);})},
  2,
  [],
  "js-context-argname->"];
shenjs_functions["shen_js-context-argname->"] = js_context_argname_$gt$;






js_context_toplevel_$gt$ = [shen_type_func,
  function shen_user_lambda14552(Arg14551) {
  if (Arg14551.length < 2) return [shen_type_func, shen_user_lambda14552, 2, Arg14551];
  var Arg14551_0 = Arg14551[0], Arg14551_1 = Arg14551[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$, [Arg14551_0, 2, Arg14551_1]);})},
  2,
  [],
  "js-context-toplevel->"];
shenjs_functions["shen_js-context-toplevel->"] = js_context_toplevel_$gt$;






js_context_nregs_$gt$ = [shen_type_func,
  function shen_user_lambda14554(Arg14553) {
  if (Arg14553.length < 2) return [shen_type_func, shen_user_lambda14554, 2, Arg14553];
  var Arg14553_0 = Arg14553[0], Arg14553_1 = Arg14553[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$, [Arg14553_0, 1, Arg14553_1]);})},
  2,
  [],
  "js-context-nregs->"];
shenjs_functions["shen_js-context-nregs->"] = js_context_nregs_$gt$;






js_context_varname = [shen_type_func,
  function shen_user_lambda14556(Arg14555) {
  if (Arg14555.length < 1) return [shen_type_func, shen_user_lambda14556, 1, Arg14555];
  var Arg14555_0 = Arg14555[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$_vector, [Arg14555_0, 4]);})},
  1,
  [],
  "js-context-varname"];
shenjs_functions["shen_js-context-varname"] = js_context_varname;






js_context_argname = [shen_type_func,
  function shen_user_lambda14558(Arg14557) {
  if (Arg14557.length < 1) return [shen_type_func, shen_user_lambda14558, 1, Arg14557];
  var Arg14557_0 = Arg14557[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$_vector, [Arg14557_0, 3]);})},
  1,
  [],
  "js-context-argname"];
shenjs_functions["shen_js-context-argname"] = js_context_argname;






js_context_toplevel = [shen_type_func,
  function shen_user_lambda14560(Arg14559) {
  if (Arg14559.length < 1) return [shen_type_func, shen_user_lambda14560, 1, Arg14559];
  var Arg14559_0 = Arg14559[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$_vector, [Arg14559_0, 2]);})},
  1,
  [],
  "js-context-toplevel"];
shenjs_functions["shen_js-context-toplevel"] = js_context_toplevel;






js_context_nregs = [shen_type_func,
  function shen_user_lambda14562(Arg14561) {
  if (Arg14561.length < 1) return [shen_type_func, shen_user_lambda14562, 1, Arg14561];
  var Arg14561_0 = Arg14561[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$_vector, [Arg14561_0, 1]);})},
  1,
  [],
  "js-context-nregs"];
shenjs_functions["shen_js-context-nregs"] = js_context_nregs;






js_max = [shen_type_func,
  function shen_user_lambda14564(Arg14563) {
  if (Arg14563.length < 2) return [shen_type_func, shen_user_lambda14564, 2, Arg14563];
  var Arg14563_0 = Arg14563[0], Arg14563_1 = Arg14563[1];
  return (((Arg14563_0 > Arg14563_1))
  ? Arg14563_0
  : Arg14563_1)},
  2,
  [],
  "js-max"];
shenjs_functions["shen_js-max"] = js_max;






js_str_js_from_shen$asterisk$ = [shen_type_func,
  function shen_user_lambda14566(Arg14565) {
  if (Arg14565.length < 2) return [shen_type_func, shen_user_lambda14566, 2, Arg14565];
  var Arg14565_0 = Arg14565[0], Arg14565_1 = Arg14565[1];
  return ((shenjs_unwind_tail(shenjs_$eq$("", Arg14565_0)))
  ? Arg14565_1
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("-", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "_")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("_", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$_")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("$", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("'", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$quote$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("`", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$bquote$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("/", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$slash$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("*", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$asterisk$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("+", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$plus$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("%", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$percent$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("=", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$eq$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("?", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$question$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("!", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$excl$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$(">", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$gt$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("<", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$lt$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$(".", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$dot$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("|", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$bar$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("#", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$sharp$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("~", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$tilde$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$(":", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$colon$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$(";", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$sc$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("@", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$at$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("&", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$amp$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("{", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$cbraceopen$")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14565_0]) && shenjs_unwind_tail(shenjs_$eq$("}", Arg14565_0[0]))))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + "$cbraceclose$")]);})
  : ((shenjs_call(shen_$plus$string$question$, [Arg14565_0]))
  ? (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [shenjs_tlstr(Arg14565_0), (Arg14565_1 + Arg14565_0[0])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-str-js-from-shen*"]]);})))))))))))))))))))))))))))},
  2,
  [],
  "js-str-js-from-shen*"];
shenjs_functions["shen_js-str-js-from-shen*"] = js_str_js_from_shen$asterisk$;






js_str_js_from_shen = [shen_type_func,
  function shen_user_lambda14568(Arg14567) {
  if (Arg14567.length < 1) return [shen_type_func, shen_user_lambda14568, 1, Arg14567];
  var Arg14567_0 = Arg14567[0];
  return ((shenjs_call(shen_element$question$, [Arg14567_0, [shen_type_cons, "return", [shen_type_cons, "new", [shen_type_cons, "delete", [shen_type_cons, "function", [shen_type_cons, "while", [shen_type_cons, "for", [shen_type_cons, "var", [shen_type_cons, "if", [shen_type_cons, "do", [shen_type_cons, "in", [shen_type_cons, "super", [shen_type_cons, "load", [shen_type_cons, "print", [shen_type_cons, "eval", [shen_type_cons, "read", [shen_type_cons, "readline", [shen_type_cons, "write", [shen_type_cons, "putstr", [shen_type_cons, "let", [shen_type_cons, "Array", [shen_type_cons, "Object", [shen_type_cons, "document", []]]]]]]]]]]]]]]]]]]]]]]]))
  ? ("$shen$" + Arg14567_0)
  : (function() {
  return shenjs_call_tail(js_str_js_from_shen$asterisk$, [Arg14567_0, ""]);}))},
  1,
  [],
  "js-str-js-from-shen"];
shenjs_functions["shen_js-str-js-from-shen"] = js_str_js_from_shen;






js_sym_js_from_shen = [shen_type_func,
  function shen_user_lambda14570(Arg14569) {
  if (Arg14569.length < 1) return [shen_type_func, shen_user_lambda14570, 1, Arg14569];
  var Arg14569_0 = Arg14569[0];
  return (function() {
  return shenjs_intern(shenjs_call(js_str_js_from_shen, [shenjs_str(Arg14569_0)]));})},
  1,
  [],
  "js-sym-js-from-shen"];
shenjs_functions["shen_js-sym-js-from-shen"] = js_sym_js_from_shen;






(shenjs_globals["shen_js-js-backslash"] = shenjs_n_$gt$string(92));






(shenjs_globals["shen_js-js-dquote"] = shenjs_n_$gt$string(34));






js_esc_string = [shen_type_func,
  function shen_user_lambda14574(Arg14573) {
  if (Arg14573.length < 2) return [shen_type_func, shen_user_lambda14574, 2, Arg14573];
  var Arg14573_0 = Arg14573[0], Arg14573_1 = Arg14573[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$("", Arg14573_0)))
  ? Arg14573_1
  : (((shenjs_call(shen_$plus$string$question$, [Arg14573_0]) && (shenjs_unwind_tail(shenjs_$eq$(Arg14573_0[0], (shenjs_globals["shen_js-js-backslash"]))) || shenjs_unwind_tail(shenjs_$eq$(Arg14573_0[0], (shenjs_globals["shen_js-js-dquote"]))))))
  ? ((R0 = (shenjs_globals["shen_js-js-backslash"])),
  (function() {
  return shenjs_call_tail(js_esc_string, [shenjs_tlstr(Arg14573_0), shenjs_call(shen_intmake_string, ["~A~A~A", [shen_tuple, Arg14573_1, [shen_tuple, R0, [shen_tuple, Arg14573_0[0], []]]]])]);}))
  : (((shenjs_call(shen_$plus$string$question$, [Arg14573_0]) && shenjs_unwind_tail(shenjs_$eq$(shenjs_string_$gt$n(Arg14573_0[0]), 10))))
  ? (function() {
  return shenjs_call_tail(js_esc_string, [shenjs_tlstr(Arg14573_0), (Arg14573_1 + "\\x0a")]);})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14573_0]) && shenjs_unwind_tail(shenjs_$eq$(shenjs_string_$gt$n(Arg14573_0[0]), 13))))
  ? (function() {
  return shenjs_call_tail(js_esc_string, [shenjs_tlstr(Arg14573_0), (Arg14573_1 + "\\x0d")]);})
  : ((shenjs_call(shen_$plus$string$question$, [Arg14573_0]))
  ? (function() {
  return shenjs_call_tail(js_esc_string, [shenjs_tlstr(Arg14573_0), (Arg14573_1 + Arg14573_0[0])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-esc-string"]]);}))))))},
  2,
  [],
  "js-esc-string"];
shenjs_functions["shen_js-esc-string"] = js_esc_string;






js_cut_shen_prefix = [shen_type_func,
  function shen_user_lambda14576(Arg14575) {
  if (Arg14575.length < 1) return [shen_type_func, shen_user_lambda14576, 1, Arg14575];
  var Arg14575_0 = Arg14575[0];
  return (((shenjs_call(shen_$plus$string$question$, [Arg14575_0]) && (shenjs_unwind_tail(shenjs_$eq$("s", Arg14575_0[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(Arg14575_0)]) && (shenjs_unwind_tail(shenjs_$eq$("h", shenjs_tlstr(Arg14575_0)[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(shenjs_tlstr(Arg14575_0))]) && (shenjs_unwind_tail(shenjs_$eq$("e", shenjs_tlstr(shenjs_tlstr(Arg14575_0))[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg14575_0)))]) && (shenjs_unwind_tail(shenjs_$eq$("n", shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg14575_0)))[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg14575_0))))]) && shenjs_unwind_tail(shenjs_$eq$("-", shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg14575_0))))[0]))))))))))))
  ? (function() {
  return shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg14575_0)))));})
  : (((shenjs_call(shen_$plus$string$question$, [Arg14575_0]) && (shenjs_unwind_tail(shenjs_$eq$("s", Arg14575_0[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(Arg14575_0)]) && (shenjs_unwind_tail(shenjs_$eq$("h", shenjs_tlstr(Arg14575_0)[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(shenjs_tlstr(Arg14575_0))]) && (shenjs_unwind_tail(shenjs_$eq$("e", shenjs_tlstr(shenjs_tlstr(Arg14575_0))[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg14575_0)))]) && (shenjs_unwind_tail(shenjs_$eq$("n", shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg14575_0)))[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg14575_0))))]) && shenjs_unwind_tail(shenjs_$eq$("_", shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg14575_0))))[0]))))))))))))
  ? (function() {
  return shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(shenjs_tlstr(Arg14575_0)))));})
  : Arg14575_0))},
  1,
  [],
  "js-cut-shen-prefix"];
shenjs_functions["shen_js-cut-shen-prefix"] = js_cut_shen_prefix;






js_func_name = [shen_type_func,
  function shen_user_lambda14578(Arg14577) {
  if (Arg14577.length < 1) return [shen_type_func, shen_user_lambda14578, 1, Arg14577];
  var Arg14577_0 = Arg14577[0];
  return (((shenjs_call(shen_sysfunc$question$, [Arg14577_0]) || (shenjs_globals["shen_shen-*installing-kl*"])))
  ? (function() {
  return shenjs_intern(shenjs_call(js_str_js_from_shen, [("shen-" + shenjs_call(js_cut_shen_prefix, [shenjs_str(Arg14577_0)]))]));})
  : ((shenjs_is_type(Arg14577_0, shen_type_symbol))
  ? (function() {
  return shenjs_call_tail(js_sym_js_from_shen, [Arg14577_0]);})
  : Arg14577_0))},
  1,
  [],
  "js-func-name"];
shenjs_functions["shen_js-func-name"] = js_func_name;






js_intfunc_name = [shen_type_func,
  function shen_user_lambda14580(Arg14579) {
  if (Arg14579.length < 1) return [shen_type_func, shen_user_lambda14580, 1, Arg14579];
  var Arg14579_0 = Arg14579[0];
  return (((shenjs_call(shen_sysfunc$question$, [Arg14579_0]) || (shenjs_globals["shen_shen-*installing-kl*"])))
  ? (function() {
  return shenjs_intern(shenjs_call(js_str_js_from_shen, [("shenjs-" + shenjs_call(js_cut_shen_prefix, [shenjs_str(Arg14579_0)]))]));})
  : ((shenjs_is_type(Arg14579_0, shen_type_symbol))
  ? (function() {
  return shenjs_call_tail(js_sym_js_from_shen, [Arg14579_0]);})
  : Arg14579_0))},
  1,
  [],
  "js-intfunc-name"];
shenjs_functions["shen_js-intfunc-name"] = js_intfunc_name;






(shenjs_globals["shen_js-int-funcs"] = [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "X"], []], [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, [shen_type_symbol, "string?"], [shen_type_cons, [shen_type_symbol, "number?"], [shen_type_cons, [shen_type_symbol, "symbol?"], [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_symbol, "vector?"], [shen_type_cons, [shen_type_symbol, "absvector?"], [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "intern"], [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, [shen_type_symbol, "read-byte"], [shen_type_cons, [shen_type_symbol, "close"], [shen_type_cons, [shen_type_symbol, "absvector"], [shen_type_cons, [shen_type_symbol, "str"], [shen_type_cons, [shen_type_symbol, "tlstr"], [shen_type_cons, [shen_type_symbol, "n->string"], [shen_type_cons, [shen_type_symbol, "string->n"], [shen_type_cons, [shen_type_symbol, "empty?"], [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "error"], [shen_type_cons, [shen_type_symbol, "simple-error"], [shen_type_cons, [shen_type_symbol, "eval-kl"], [shen_type_cons, [shen_type_symbol, "error-to-string"], [shen_type_cons, [shen_type_symbol, "js-call-js"], []]]]]]]]]]]]]]]]]]]]]]]]]]]]], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "X"], [shen_type_cons, [shen_type_symbol, "Y"], []]], [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, [shen_type_symbol, "/"], [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "or"], [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, ">"], [shen_type_cons, [shen_type_symbol, ">="], [shen_type_cons, [shen_type_symbol, "<"], [shen_type_cons, [shen_type_symbol, "<="], [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "<-address"], [shen_type_cons, [shen_type_symbol, "cn"], [shen_type_cons, [shen_type_symbol, "pos"], [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "pr"], []]]]]]]]]]]]]]]]]]]], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "X"], [shen_type_cons, [shen_type_symbol, "Y"], [shen_type_cons, [shen_type_symbol, "Z"], []]]], [shen_type_cons, [shen_type_symbol, "address->"], [shen_type_cons, [shen_type_symbol, "open"], []]]], []]]]);






(shenjs_globals["shen_js-internals"] = [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "empty?"], [shen_type_cons, [shen_type_symbol, "boolean?"], [shen_type_cons, [shen_type_symbol, "vector?"], [shen_type_cons, [shen_type_symbol, "absvector?"], [shen_type_cons, [shen_type_symbol, "absvector"], [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, [shen_type_symbol, "str"], [shen_type_cons, [shen_type_symbol, "intern"], [shen_type_cons, [shen_type_symbol, "n->string"], [shen_type_cons, [shen_type_symbol, "string->n"], [shen_type_cons, [shen_type_symbol, "eval-kl"], [shen_type_cons, [shen_type_symbol, "open"], [shen_type_cons, [shen_type_symbol, "js-write-byte"], [shen_type_cons, [shen_type_symbol, "read-byte"], [shen_type_cons, [shen_type_symbol, "close"], [shen_type_cons, [shen_type_symbol, "tlstr"], [shen_type_cons, [shen_type_symbol, "pr"], [shen_type_cons, [shen_type_symbol, "error"], [shen_type_cons, [shen_type_symbol, "simple-error"], [shen_type_cons, [shen_type_symbol, "error-to-string"], [shen_type_cons, [shen_type_symbol, "js-shenjs-call-js"], []]]]]]]]]]]]]]]]]]]]]]]]]]);






(shenjs_globals["shen_js-tail-internals"] = [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "js-shenjs-call-js"], []]]);






js_int_func_args$asterisk$ = [shen_type_func,
  function shen_user_lambda14585(Arg14584) {
  if (Arg14584.length < 2) return [shen_type_func, shen_user_lambda14585, 2, Arg14584];
  var Arg14584_0 = Arg14584[0], Arg14584_1 = Arg14584[1];
  return ((shenjs_empty$question$(Arg14584_1))
  ? []
  : (((shenjs_is_type(Arg14584_1, shen_type_cons) && (shenjs_is_type(Arg14584_1[1], shen_type_cons) && shenjs_call(shen_element$question$, [Arg14584_0, Arg14584_1[1][2]]))))
  ? Arg14584_1[1][1]
  : (((shenjs_is_type(Arg14584_1, shen_type_cons) && shenjs_is_type(Arg14584_1[1], shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(js_int_func_args$asterisk$, [Arg14584_0, Arg14584_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-int-func-args*"]]);}))))},
  2,
  [],
  "js-int-func-args*"];
shenjs_functions["shen_js-int-func-args*"] = js_int_func_args$asterisk$;






js_int_func_args = [shen_type_func,
  function shen_user_lambda14587(Arg14586) {
  if (Arg14586.length < 1) return [shen_type_func, shen_user_lambda14587, 1, Arg14586];
  var Arg14586_0 = Arg14586[0];
  return (function() {
  return shenjs_call_tail(js_int_func_args$asterisk$, [Arg14586_0, (shenjs_globals["shen_js-int-funcs"])]);})},
  1,
  [],
  "js-int-func-args"];
shenjs_functions["shen_js-int-func-args"] = js_int_func_args;






js_int_func$question$ = [shen_type_func,
  function shen_user_lambda14589(Arg14588) {
  if (Arg14588.length < 1) return [shen_type_func, shen_user_lambda14589, 1, Arg14588];
  var Arg14588_0 = Arg14588[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fail"], Arg14588_0)))
  ? true
  : (!shenjs_empty$question$(shenjs_call(js_int_func_args, [Arg14588_0]))))},
  1,
  [],
  "js-int-func?"];
shenjs_functions["shen_js-int-func?"] = js_int_func$question$;






js_esc_obj = [shen_type_func,
  function shen_user_lambda14591(Arg14590) {
  if (Arg14590.length < 1) return [shen_type_func, shen_user_lambda14591, 1, Arg14590];
  var Arg14590_0 = Arg14590[0];
  return (((typeof(Arg14590_0) == 'string'))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["\"~A\"", [shen_tuple, shenjs_call(js_esc_string, [Arg14590_0, ""]), []]]);})
  : ((shenjs_call(shen_sysfunc$question$, [Arg14590_0]))
  ? (function() {
  return shenjs_call_tail(js_func_name, [Arg14590_0]);})
  : ((shenjs_is_type(Arg14590_0, shen_type_symbol))
  ? (function() {
  return shenjs_call_tail(js_sym_js_from_shen, [Arg14590_0]);})
  : (function() {
  return shenjs_call_tail(shen_interror, ["Object ~R cannot be escaped", [shen_tuple, Arg14590_0, []]]);}))))},
  1,
  [],
  "js-esc-obj"];
shenjs_functions["shen_js-esc-obj"] = js_esc_obj;






js_str_join$asterisk$ = [shen_type_func,
  function shen_user_lambda14593(Arg14592) {
  if (Arg14592.length < 3) return [shen_type_func, shen_user_lambda14593, 3, Arg14592];
  var Arg14592_0 = Arg14592[0], Arg14592_1 = Arg14592[1], Arg14592_2 = Arg14592[2];
  return ((shenjs_empty$question$(Arg14592_0))
  ? Arg14592_2
  : (((shenjs_is_type(Arg14592_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("", Arg14592_2))))
  ? (function() {
  return shenjs_call_tail(js_str_join$asterisk$, [Arg14592_0[2], Arg14592_1, Arg14592_0[1]]);})
  : ((shenjs_is_type(Arg14592_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(js_str_join$asterisk$, [Arg14592_0[2], Arg14592_1, shenjs_call(shen_intmake_string, ["~A~A~A", [shen_tuple, Arg14592_2, [shen_tuple, Arg14592_1, [shen_tuple, Arg14592_0[1], []]]]])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-str-join*"]]);}))))},
  3,
  [],
  "js-str-join*"];
shenjs_functions["shen_js-str-join*"] = js_str_join$asterisk$;






js_str_join = [shen_type_func,
  function shen_user_lambda14595(Arg14594) {
  if (Arg14594.length < 2) return [shen_type_func, shen_user_lambda14595, 2, Arg14594];
  var Arg14594_0 = Arg14594[0], Arg14594_1 = Arg14594[1];
  return (function() {
  return shenjs_call_tail(js_str_join$asterisk$, [Arg14594_0, Arg14594_1, ""]);})},
  2,
  [],
  "js-str-join"];
shenjs_functions["shen_js-str-join"] = js_str_join;






js_arg_list = [shen_type_func,
  function shen_user_lambda14597(Arg14596) {
  if (Arg14596.length < 1) return [shen_type_func, shen_user_lambda14597, 1, Arg14596];
  var Arg14596_0 = Arg14596[0];
  return (function() {
  return shenjs_call_tail(js_str_join, [Arg14596_0, ", "]);})},
  1,
  [],
  "js-arg-list"];
shenjs_functions["shen_js-arg-list"] = js_arg_list;






js_arg_name = [shen_type_func,
  function shen_user_lambda14599(Arg14598) {
  if (Arg14598.length < 2) return [shen_type_func, shen_user_lambda14599, 2, Arg14598];
  var Arg14598_0 = Arg14598[0], Arg14598_1 = Arg14598[1];
  return (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A_~A", [shen_tuple, shenjs_call(js_context_argname, [Arg14598_1]), [shen_tuple, Arg14598_0, []]]]);})},
  2,
  [],
  "js-arg-name"];
shenjs_functions["shen_js-arg-name"] = js_arg_name;






js_tail_call_ret = [shen_type_func,
  function shen_user_lambda14601(Arg14600) {
  if (Arg14600.length < 1) return [shen_type_func, shen_user_lambda14601, 1, Arg14600];
  var Arg14600_0 = Arg14600[0];
  return (function() {
  return shenjs_call_tail(shen_intmake_string, ["(function() {~%  return ~A;})", [shen_tuple, Arg14600_0, []]]);})},
  1,
  [],
  "js-tail-call-ret"];
shenjs_functions["shen_js-tail-call-ret"] = js_tail_call_ret;






js_get_func_obj = [shen_type_func,
  function shen_user_lambda14603(Arg14602) {
  if (Arg14602.length < 3) return [shen_type_func, shen_user_lambda14603, 3, Arg14602];
  var Arg14602_0 = Arg14602[0], Arg14602_1 = Arg14602[1], Arg14602_2 = Arg14602[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg14602_1)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_get_fn(~A)", [shen_tuple, shenjs_call(js_get_func_obj, [Arg14602_0, false, Arg14602_2]), []]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$(false, Arg14602_1)) && shenjs_is_type(Arg14602_0, shen_type_symbol)))
  ? (function() {
  return shenjs_call_tail(js_func_name, [Arg14602_0]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg14602_1)))
  ? Arg14602_0
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-get-func-obj"]]);}))))},
  3,
  [],
  "js-get-func-obj"];
shenjs_functions["shen_js-get-func-obj"] = js_get_func_obj;






js_tail_call_expr = [shen_type_func,
  function shen_user_lambda14605(Arg14604) {
  if (Arg14604.length < 2) return [shen_type_func, shen_user_lambda14605, 2, Arg14604];
  var Arg14604_0 = Arg14604[0], Arg14604_1 = Arg14604[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg14604_0, false, Arg14604_1]);})},
  2,
  [],
  "js-tail-call-expr"];
shenjs_functions["shen_js-tail-call-expr"] = js_tail_call_expr;






js_cond_case = [shen_type_func,
  function shen_user_lambda14607(Arg14606) {
  if (Arg14606.length < 2) return [shen_type_func, shen_user_lambda14607, 2, Arg14606];
  var Arg14606_0 = Arg14606[0], Arg14606_1 = Arg14606[1];
  return (function() {
  return shenjs_call_tail(js_tail_call_expr, [Arg14606_0, Arg14606_1]);})},
  2,
  [],
  "js-cond-case"];
shenjs_functions["shen_js-cond-case"] = js_cond_case;






js_emit_cond$asterisk$ = [shen_type_func,
  function shen_user_lambda14609(Arg14608) {
  if (Arg14608.length < 3) return [shen_type_func, shen_user_lambda14609, 3, Arg14608];
  var Arg14608_0 = Arg14608[0], Arg14608_1 = Arg14608[1], Arg14608_2 = Arg14608[2];
  return ((shenjs_empty$question$(Arg14608_0))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["cond failure: no default branch", []]);})
  : (((shenjs_is_type(Arg14608_0, shen_type_cons) && (shenjs_is_type(Arg14608_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg14608_0[1][1])) && (shenjs_is_type(Arg14608_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg14608_0[1][2][2]))))))
  ? (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg14608_0[1][2][1], Arg14608_1, Arg14608_2]);})
  : (((shenjs_is_type(Arg14608_0, shen_type_cons) && (shenjs_is_type(Arg14608_0[1], shen_type_cons) && (shenjs_is_type(Arg14608_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg14608_0[1][2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["((~A)~%  ? ~A~%  : ~A)", [shen_tuple, shenjs_call(js_cond_case, [Arg14608_0[1][1], Arg14608_2]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14608_0[1][2][1], Arg14608_1, Arg14608_2]), [shen_tuple, shenjs_call(js_emit_cond$asterisk$, [Arg14608_0[2], Arg14608_1, Arg14608_2]), []]]]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-emit-cond*"]]);}))))},
  3,
  [],
  "js-emit-cond*"];
shenjs_functions["shen_js-emit-cond*"] = js_emit_cond$asterisk$;






js_emit_cond = [shen_type_func,
  function shen_user_lambda14611(Arg14610) {
  if (Arg14610.length < 3) return [shen_type_func, shen_user_lambda14611, 3, Arg14610];
  var Arg14610_0 = Arg14610[0], Arg14610_1 = Arg14610[1], Arg14610_2 = Arg14610[2];
  return (function() {
  return shenjs_call_tail(js_emit_cond$asterisk$, [Arg14610_0, Arg14610_1, Arg14610_2]);})},
  3,
  [],
  "js-emit-cond"];
shenjs_functions["shen_js-emit-cond"] = js_emit_cond;






js_emit_trap_error = [shen_type_func,
  function shen_user_lambda14613(Arg14612) {
  if (Arg14612.length < 4) return [shen_type_func, shen_user_lambda14613, 4, Arg14612];
  var Arg14612_0 = Arg14612[0], Arg14612_1 = Arg14612[1], Arg14612_2 = Arg14612[2], Arg14612_3 = Arg14612[3];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$(false, Arg14612_2)))
  ? ((R0 = shenjs_call(shen_intmake_string, ["function() {return ~A;}", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14612_0, false, Arg14612_3]), []]])),
  (R1 = shenjs_call(js_js_from_kl_expr, [Arg14612_1, false, Arg14612_3])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_trap_error(~A, ~A)", [shen_tuple, R0, [shen_tuple, R1, []]]]);}))
  : ((shenjs_unwind_tail(shenjs_$eq$(true, Arg14612_2)))
  ? (function() {
  return shenjs_call_tail(js_tail_call_ret, [shenjs_call(js_emit_trap_error, [Arg14612_0, Arg14612_1, false, Arg14612_3])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-emit-trap-error"]]);})))},
  4,
  [],
  "js-emit-trap-error"];
shenjs_functions["shen_js-emit-trap-error"] = js_emit_trap_error;






js_predicate_op = [shen_type_func,
  function shen_user_lambda14615(Arg14614) {
  if (Arg14614.length < 4) return [shen_type_func, shen_user_lambda14615, 4, Arg14614];
  var Arg14614_0 = Arg14614[0], Arg14614_1 = Arg14614[1], Arg14614_2 = Arg14614[2], Arg14614_3 = Arg14614[3];
  return (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "number?"], Arg14614_0)) && (typeof(Arg14614_1) == 'number')))
  ? "true"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "string?"], Arg14614_0)) && (typeof(Arg14614_1) == 'string')))
  ? "true"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "boolean?"], Arg14614_0)) && shenjs_unwind_tail(shenjs_$eq$(true, Arg14614_1))))
  ? "true"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "boolean?"], Arg14614_0)) && shenjs_unwind_tail(shenjs_$eq$(false, Arg14614_1))))
  ? "true"
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "boolean?"], Arg14614_0)))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "boolean?"], [shen_type_cons, Arg14614_1, []], Arg14614_2, Arg14614_3]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "string?"], Arg14614_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(typeof(~A) == 'string')", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14614_1, false, Arg14614_3]), []]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "number?"], Arg14614_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(typeof(~A) == 'number')", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14614_1, false, Arg14614_3]), []]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol?"], Arg14614_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_is_type(~A, ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14614_1, false, Arg14614_3]), [shen_tuple, "shen_type_symbol", []]]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons?"], Arg14614_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_is_type(~A, ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14614_1, false, Arg14614_3]), [shen_tuple, "shen_type_cons", []]]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "tuple?"], Arg14614_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_is_type(~A, ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14614_1, false, Arg14614_3]), [shen_tuple, "shen_tuple", []]]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "vector?"], Arg14614_0)))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "vector?"], [shen_type_cons, Arg14614_1, []], Arg14614_2, Arg14614_3]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "empty?"], Arg14614_0)))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "empty?"], [shen_type_cons, Arg14614_1, []], Arg14614_2, Arg14614_3]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "absvector?"], Arg14614_0)))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "absvector?"], [shen_type_cons, Arg14614_1, []], Arg14614_2, Arg14614_3]);})
  : shen_fail_obj)))))))))))))},
  4,
  [],
  "js-predicate-op"];
shenjs_functions["shen_js-predicate-op"] = js_predicate_op;






js_math_op = [shen_type_func,
  function shen_user_lambda14617(Arg14616) {
  if (Arg14616.length < 4) return [shen_type_func, shen_user_lambda14617, 4, Arg14616];
  var Arg14616_0 = Arg14616[0], Arg14616_1 = Arg14616[1], Arg14616_2 = Arg14616[2], Arg14616_3 = Arg14616[3];
  return (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg14616_0)) && (shenjs_is_type(Arg14616_1, shen_type_cons) && (shenjs_is_type(Arg14616_1[2], shen_type_cons) && (shenjs_empty$question$(Arg14616_1[2][2]) && ((typeof(Arg14616_1[1]) == 'number') && (typeof(Arg14616_1[2][1]) == 'number')))))))
  ? (function() {
  return shenjs_str((Arg14616_1[1] + Arg14616_1[2][1]));})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg14616_0)) && (shenjs_is_type(Arg14616_1, shen_type_cons) && (shenjs_is_type(Arg14616_1[2], shen_type_cons) && (shenjs_empty$question$(Arg14616_1[2][2]) && ((typeof(Arg14616_1[1]) == 'number') && (typeof(Arg14616_1[2][1]) == 'number')))))))
  ? (function() {
  return shenjs_str((Arg14616_1[1] - Arg14616_1[2][1]));})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "*"], Arg14616_0)) && (shenjs_is_type(Arg14616_1, shen_type_cons) && (shenjs_is_type(Arg14616_1[2], shen_type_cons) && (shenjs_empty$question$(Arg14616_1[2][2]) && ((typeof(Arg14616_1[1]) == 'number') && (typeof(Arg14616_1[2][1]) == 'number')))))))
  ? (function() {
  return shenjs_str((Arg14616_1[1] * Arg14616_1[2][1]));})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/"], Arg14616_0)) && (shenjs_is_type(Arg14616_1, shen_type_cons) && (shenjs_is_type(Arg14616_1[2], shen_type_cons) && (shenjs_empty$question$(Arg14616_1[2][2]) && ((typeof(Arg14616_1[1]) == 'number') && (typeof(Arg14616_1[2][1]) == 'number')))))))
  ? (function() {
  return shenjs_str((Arg14616_1[1] / Arg14616_1[2][1]));})
  : (((shenjs_is_type(Arg14616_1, shen_type_cons) && (shenjs_is_type(Arg14616_1[2], shen_type_cons) && (shenjs_empty$question$(Arg14616_1[2][2]) && shenjs_call(shen_element$question$, [Arg14616_0, [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, [shen_type_symbol, "/"], []]]]]])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A ~A ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14616_1[1], false, Arg14616_3]), [shen_tuple, Arg14616_0, [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14616_1[2][1], false, Arg14616_3]), []]]]]);})
  : shen_fail_obj)))))},
  4,
  [],
  "js-math-op"];
shenjs_functions["shen_js-math-op"] = js_math_op;






js_equality_op = [shen_type_func,
  function shen_user_lambda14619(Arg14618) {
  if (Arg14618.length < 3) return [shen_type_func, shen_user_lambda14619, 3, Arg14618];
  var Arg14618_0 = Arg14618[0], Arg14618_1 = Arg14618[1], Arg14618_2 = Arg14618[2];
  return (((shenjs_is_type(Arg14618_0, shen_type_cons) && (shenjs_is_type(Arg14618_0[2], shen_type_cons) && (shenjs_empty$question$(Arg14618_0[2][2]) && ((typeof(Arg14618_0[1]) == 'number') && (typeof(Arg14618_0[2][1]) == 'number'))))))
  ? (function() {
  return shenjs_str(shenjs_unwind_tail(shenjs_$eq$(Arg14618_0[1], Arg14618_0[2][1])));})
  : (((shenjs_is_type(Arg14618_0, shen_type_cons) && (shenjs_is_type(Arg14618_0[2], shen_type_cons) && (shenjs_empty$question$(Arg14618_0[2][2]) && ((typeof(Arg14618_0[1]) == 'string') && (typeof(Arg14618_0[2][1]) == 'string'))))))
  ? (function() {
  return shenjs_str(shenjs_unwind_tail(shenjs_$eq$(Arg14618_0[1], Arg14618_0[2][1])));})
  : (((shenjs_is_type(Arg14618_0, shen_type_cons) && (shenjs_is_type(Arg14618_0[2], shen_type_cons) && (shenjs_empty$question$(Arg14618_0[2][2]) && (shenjs_boolean$question$(Arg14618_0[1]) && shenjs_boolean$question$(Arg14618_0[2][1]))))))
  ? (function() {
  return shenjs_str(shenjs_unwind_tail(shenjs_$eq$(Arg14618_0[1], Arg14618_0[2][1])));})
  : (((shenjs_is_type(Arg14618_0, shen_type_cons) && (shenjs_is_type(Arg14618_0[2], shen_type_cons) && (shenjs_empty$question$(Arg14618_0[2][1]) && shenjs_empty$question$(Arg14618_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "empty?"], [shen_type_cons, Arg14618_0[1], []], Arg14618_1, Arg14618_2]);})
  : (((shenjs_is_type(Arg14618_0, shen_type_cons) && (shenjs_empty$question$(Arg14618_0[1]) && (shenjs_is_type(Arg14618_0[2], shen_type_cons) && shenjs_empty$question$(Arg14618_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "empty?"], Arg14618_0[2], Arg14618_1, Arg14618_2]);})
  : (((shenjs_is_type(Arg14618_0, shen_type_cons) && (shenjs_is_type(Arg14618_0[2], shen_type_cons) && shenjs_empty$question$(Arg14618_0[2][2]))))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "="], Arg14618_0, Arg14618_1, Arg14618_2]);})
  : shen_fail_obj))))))},
  3,
  [],
  "js-equality-op"];
shenjs_functions["shen_js-equality-op"] = js_equality_op;






js_order_op = [shen_type_func,
  function shen_user_lambda14621(Arg14620) {
  if (Arg14620.length < 4) return [shen_type_func, shen_user_lambda14621, 4, Arg14620];
  var Arg14620_0 = Arg14620[0], Arg14620_1 = Arg14620[1], Arg14620_2 = Arg14620[2], Arg14620_3 = Arg14620[3];
  var R0, R1;
  return (((shenjs_is_type(Arg14620_1, shen_type_cons) && (shenjs_is_type(Arg14620_1[2], shen_type_cons) && (shenjs_empty$question$(Arg14620_1[2][2]) && shenjs_call(shen_element$question$, [Arg14620_0, [shen_type_cons, [shen_type_symbol, ">"], [shen_type_cons, [shen_type_symbol, "<"], [shen_type_cons, [shen_type_symbol, ">="], [shen_type_cons, [shen_type_symbol, "<="], []]]]]])))))
  ? ((R0 = shenjs_call(js_js_from_kl_expr, [Arg14620_1[1], false, Arg14620_3])),
  (R1 = shenjs_call(js_js_from_kl_expr, [Arg14620_1[2][1], false, Arg14620_3])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A ~A ~A)", [shen_tuple, R0, [shen_tuple, Arg14620_0, [shen_tuple, R1, []]]]]);}))
  : shen_fail_obj)},
  4,
  [],
  "js-order-op"];
shenjs_functions["shen_js-order-op"] = js_order_op;






js_logic_op = [shen_type_func,
  function shen_user_lambda14623(Arg14622) {
  if (Arg14622.length < 4) return [shen_type_func, shen_user_lambda14623, 4, Arg14622];
  var Arg14622_0 = Arg14622[0], Arg14622_1 = Arg14622[1], Arg14622_2 = Arg14622[2], Arg14622_3 = Arg14622[3];
  return (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "not"], Arg14622_0)) && (shenjs_is_type(Arg14622_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(false, Arg14622_1[1])) && shenjs_empty$question$(Arg14622_1[2])))))
  ? "true"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "not"], Arg14622_0)) && (shenjs_is_type(Arg14622_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg14622_1[1])) && shenjs_empty$question$(Arg14622_1[2])))))
  ? "false"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "not"], Arg14622_0)) && (shenjs_is_type(Arg14622_1, shen_type_cons) && shenjs_empty$question$(Arg14622_1[2]))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(!~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14622_1[1], false, Arg14622_3]), []]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "and"], Arg14622_0)) && (shenjs_is_type(Arg14622_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(false, Arg14622_1[1])) && (shenjs_is_type(Arg14622_1[2], shen_type_cons) && shenjs_empty$question$(Arg14622_1[2][2]))))))
  ? "false"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "or"], Arg14622_0)) && (shenjs_is_type(Arg14622_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg14622_1[1])) && (shenjs_is_type(Arg14622_1[2], shen_type_cons) && shenjs_empty$question$(Arg14622_1[2][2]))))))
  ? "true"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "and"], Arg14622_0)) && (shenjs_is_type(Arg14622_1, shen_type_cons) && (shenjs_is_type(Arg14622_1[2], shen_type_cons) && shenjs_empty$question$(Arg14622_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A && ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14622_1[1], false, Arg14622_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14622_1[2][1], false, Arg14622_3]), []]]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "or"], Arg14622_0)) && (shenjs_is_type(Arg14622_1, shen_type_cons) && (shenjs_is_type(Arg14622_1[2], shen_type_cons) && shenjs_empty$question$(Arg14622_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A || ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14622_1[1], false, Arg14622_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14622_1[2][1], false, Arg14622_3]), []]]]);})
  : shen_fail_obj)))))))},
  4,
  [],
  "js-logic-op"];
shenjs_functions["shen_js-logic-op"] = js_logic_op;






js_emit_set$asterisk$ = [shen_type_func,
  function shen_user_lambda14625(Arg14624) {
  if (Arg14624.length < 4) return [shen_type_func, shen_user_lambda14625, 4, Arg14624];
  var Arg14624_0 = Arg14624[0], Arg14624_1 = Arg14624[1], Arg14624_2 = Arg14624[2], Arg14624_3 = Arg14624[3];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg14624_3)))
  ? ((R0 = shenjs_call(js_esc_obj, [("shen_" + shenjs_str(Arg14624_0))])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["(shenjs_globals[~A] = ~A)", [shen_tuple, R0, [shen_tuple, Arg14624_1, []]]]);}))
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg14624_3)))
  ? ((R0 = shenjs_call(js_js_from_kl_expr, [Arg14624_0, false, Arg14624_2])),
  (R1 = shenjs_call(js_esc_obj, ["shen_"])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["(shenjs_globals[~A + ~A[1]] = ~A)", [shen_tuple, R1, [shen_tuple, R0, [shen_tuple, Arg14624_1, []]]]]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-emit-set*"]]);})))},
  4,
  [],
  "js-emit-set*"];
shenjs_functions["shen_js-emit-set*"] = js_emit_set$asterisk$;






js_emit_set = [shen_type_func,
  function shen_user_lambda14627(Arg14626) {
  if (Arg14626.length < 3) return [shen_type_func, shen_user_lambda14627, 3, Arg14626];
  var Arg14626_0 = Arg14626[0], Arg14626_1 = Arg14626[1], Arg14626_2 = Arg14626[2];
  return (function() {
  return shenjs_call_tail(js_emit_set$asterisk$, [Arg14626_0, shenjs_call(js_js_from_kl_expr, [Arg14626_1, false, Arg14626_2]), Arg14626_2, shenjs_is_type(Arg14626_0, shen_type_symbol)]);})},
  3,
  [],
  "js-emit-set"];
shenjs_functions["shen_js-emit-set"] = js_emit_set;






js_emit_value = [shen_type_func,
  function shen_user_lambda14629(Arg14628) {
  if (Arg14628.length < 3) return [shen_type_func, shen_user_lambda14629, 3, Arg14628];
  var Arg14628_0 = Arg14628[0], Arg14628_1 = Arg14628[1], Arg14628_2 = Arg14628[2];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg14628_2)))
  ? ((R0 = shenjs_call(js_esc_obj, [("shen_" + shenjs_str(Arg14628_0))])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["(shenjs_globals[~A])", [shen_tuple, R0, []]]);}))
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg14628_2)))
  ? ((R0 = shenjs_call(js_js_from_kl_expr, [Arg14628_0, false, Arg14628_1])),
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
  function shen_user_lambda14631(Arg14630) {
  if (Arg14630.length < 4) return [shen_type_func, shen_user_lambda14631, 4, Arg14630];
  var Arg14630_0 = Arg14630[0], Arg14630_1 = Arg14630[1], Arg14630_2 = Arg14630[2], Arg14630_3 = Arg14630[3];
  var R0, R1;
  return (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "intern"], Arg14630_0)) && (shenjs_is_type(Arg14630_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$("true", Arg14630_1[1])) && shenjs_empty$question$(Arg14630_1[2])))))
  ? "true"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "intern"], Arg14630_0)) && (shenjs_is_type(Arg14630_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$("false", Arg14630_1[1])) && shenjs_empty$question$(Arg14630_1[2])))))
  ? "false"
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "intern"], Arg14630_0)) && (shenjs_is_type(Arg14630_1, shen_type_cons) && (shenjs_empty$question$(Arg14630_1[2]) && (typeof(Arg14630_1[1]) == 'string')))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["[shen_type_symbol, ~A]", [shen_tuple, shenjs_call(js_esc_obj, [Arg14630_1[1]]), []]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "intern"], Arg14630_0)) && (shenjs_is_type(Arg14630_1, shen_type_cons) && shenjs_empty$question$(Arg14630_1[2]))))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [[shen_type_symbol, "intern"], Arg14630_1, Arg14630_2, Arg14630_3]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg14630_0)) && (shenjs_is_type(Arg14630_1, shen_type_cons) && (shenjs_is_type(Arg14630_1[2], shen_type_cons) && shenjs_empty$question$(Arg14630_1[2][2])))))
  ? ((R0 = shenjs_call(js_js_from_kl_expr, [Arg14630_1[1], false, Arg14630_3])),
  (R1 = shenjs_call(js_js_from_kl_expr, [Arg14630_1[2][1], false, Arg14630_3])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["[shen_type_cons, ~A, ~A]", [shen_tuple, R0, [shen_tuple, R1, []]]]);}))
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@p"], Arg14630_0)) && (shenjs_is_type(Arg14630_1, shen_type_cons) && (shenjs_is_type(Arg14630_1[2], shen_type_cons) && shenjs_empty$question$(Arg14630_1[2][2])))))
  ? ((R0 = shenjs_call(js_js_from_kl_expr, [Arg14630_1[1], false, Arg14630_3])),
  (R1 = shenjs_call(js_js_from_kl_expr, [Arg14630_1[2][1], false, Arg14630_3])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["[shen_tuple, ~A, ~A]", [shen_tuple, R0, [shen_tuple, R1, []]]]);}))
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "set"], Arg14630_0)) && (shenjs_is_type(Arg14630_1, shen_type_cons) && (shenjs_is_type(Arg14630_1[2], shen_type_cons) && shenjs_empty$question$(Arg14630_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(js_emit_set, [Arg14630_1[1], Arg14630_1[2][1], Arg14630_3]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "value"], Arg14630_0)) && (shenjs_is_type(Arg14630_1, shen_type_cons) && shenjs_empty$question$(Arg14630_1[2]))))
  ? (function() {
  return shenjs_call_tail(js_emit_value, [Arg14630_1[1], Arg14630_3, shenjs_is_type(Arg14630_1[1], shen_type_symbol)]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "thaw"], Arg14630_0)) && (shenjs_is_type(Arg14630_1, shen_type_cons) && shenjs_empty$question$(Arg14630_1[2]))))
  ? (function() {
  return shenjs_call_tail(js_emit_thaw, [Arg14630_1[1], Arg14630_2, Arg14630_3]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "function"], Arg14630_0)) && (shenjs_is_type(Arg14630_1, shen_type_cons) && shenjs_empty$question$(Arg14630_1[2]))))
  ? (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg14630_1[1], true, Arg14630_3]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "hd"], Arg14630_0)) && (shenjs_is_type(Arg14630_1, shen_type_cons) && shenjs_empty$question$(Arg14630_1[2]))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A[1]", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14630_1[1], false, Arg14630_3]), []]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "tl"], Arg14630_0)) && (shenjs_is_type(Arg14630_1, shen_type_cons) && shenjs_empty$question$(Arg14630_1[2]))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A[2]", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14630_1[1], false, Arg14630_3]), []]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cn"], Arg14630_0)) && (shenjs_is_type(Arg14630_1, shen_type_cons) && (shenjs_is_type(Arg14630_1[2], shen_type_cons) && shenjs_empty$question$(Arg14630_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A + ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14630_1[1], false, Arg14630_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14630_1[2][1], false, Arg14630_3]), []]]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "pos"], Arg14630_0)) && (shenjs_is_type(Arg14630_1, shen_type_cons) && (shenjs_is_type(Arg14630_1[2], shen_type_cons) && shenjs_empty$question$(Arg14630_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A[~A]", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14630_1[1], false, Arg14630_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14630_1[2][1], false, Arg14630_3]), []]]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "address->"], Arg14630_0)) && (shenjs_is_type(Arg14630_1, shen_type_cons) && (shenjs_is_type(Arg14630_1[2], shen_type_cons) && (shenjs_is_type(Arg14630_1[2][2], shen_type_cons) && shenjs_empty$question$(Arg14630_1[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_absvector_set(~A, ~A, ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14630_1[1], false, Arg14630_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14630_1[2][1], false, Arg14630_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14630_1[2][2][1], false, Arg14630_3]), []]]]]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "<-address"], Arg14630_0)) && (shenjs_is_type(Arg14630_1, shen_type_cons) && (shenjs_is_type(Arg14630_1[2], shen_type_cons) && shenjs_empty$question$(Arg14630_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_absvector_ref(~A, ~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14630_1[1], false, Arg14630_3]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14630_1[2][1], false, Arg14630_3]), []]]]);})
  : shen_fail_obj))))))))))))))))},
  4,
  [],
  "js-basic-op"];
shenjs_functions["shen_js-basic-op"] = js_basic_op;






js_int_funcall$asterisk$ = [shen_type_func,
  function shen_user_lambda14633(Arg14632) {
  if (Arg14632.length < 5) return [shen_type_func, shen_user_lambda14633, 5, Arg14632];
  var Arg14632_0 = Arg14632[0], Arg14632_1 = Arg14632[1], Arg14632_2 = Arg14632[2], Arg14632_3 = Arg14632[3], Arg14632_4 = Arg14632[4];
  var R0;
  return (((shenjs_unwind_tail(shenjs_$eq$(true, Arg14632_2)) && shenjs_unwind_tail(shenjs_$eq$(true, Arg14632_3))))
  ? (function() {
  return shenjs_call_tail(js_int_funcall$asterisk$, [Arg14632_0, Arg14632_1, false, false, Arg14632_4]);})
  : (((shenjs_unwind_tail(shenjs_$eq$(true, Arg14632_2)) && shenjs_unwind_tail(shenjs_$eq$(false, Arg14632_3))))
  ? ((R0 = shenjs_call(js_int_funcall$asterisk$, [Arg14632_0, Arg14632_1, false, false, Arg14632_4])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_unwind_tail(~A)", [shen_tuple, R0, []]]);}))
  : (((shenjs_unwind_tail(shenjs_$eq$(false, Arg14632_2)) && shenjs_unwind_tail(shenjs_$eq$(false, Arg14632_3))))
  ? ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda14635(Arg14634) {
  if (Arg14634.length < 2) return [shen_type_func, shen_user_lambda14635, 2, Arg14634];
  var Arg14634_0 = Arg14634[0], Arg14634_1 = Arg14634[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg14634_1, false, Arg14634_0]);})},
  2,
  [Arg14632_4]], Arg14632_1])),
  (R0 = shenjs_call(js_str_join, [R0, ", "])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A(~A)", [shen_tuple, shenjs_call(js_intfunc_name, [Arg14632_0]), [shen_tuple, R0, []]]]);}))
  : (((shenjs_unwind_tail(shenjs_$eq$(false, Arg14632_2)) && shenjs_unwind_tail(shenjs_$eq$(true, Arg14632_3))))
  ? (function() {
  return shenjs_call_tail(js_tail_call_ret, [shenjs_call(js_int_funcall$asterisk$, [Arg14632_0, Arg14632_1, false, false, Arg14632_4])]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-int-funcall*"]]);})))))},
  5,
  [],
  "js-int-funcall*"];
shenjs_functions["shen_js-int-funcall*"] = js_int_funcall$asterisk$;






js_int_funcall = [shen_type_func,
  function shen_user_lambda14637(Arg14636) {
  if (Arg14636.length < 4) return [shen_type_func, shen_user_lambda14637, 4, Arg14636];
  var Arg14636_0 = Arg14636[0], Arg14636_1 = Arg14636[1], Arg14636_2 = Arg14636[2], Arg14636_3 = Arg14636[3];
  var R0;
  return ((R0 = shenjs_call(shen_element$question$, [Arg14636_0, (shenjs_globals["shen_js-tail-internals"])])),
  (function() {
  return shenjs_call_tail(js_int_funcall$asterisk$, [Arg14636_0, Arg14636_1, R0, Arg14636_2, Arg14636_3]);}))},
  4,
  [],
  "js-int-funcall"];
shenjs_functions["shen_js-int-funcall"] = js_int_funcall;






js_int_curry = [shen_type_func,
  function shen_user_lambda14639(Arg14638) {
  if (Arg14638.length < 4) return [shen_type_func, shen_user_lambda14639, 4, Arg14638];
  var Arg14638_0 = Arg14638[0], Arg14638_1 = Arg14638[1], Arg14638_2 = Arg14638[2], Arg14638_3 = Arg14638[3];
  var R0, R1;
  return ((R0 = shenjs_call(shen_intmake_string, ["~A[1]", [shen_tuple, shenjs_call(js_func_name, [Arg14638_0]), []]])),
  (R1 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda14641(Arg14640) {
  if (Arg14640.length < 2) return [shen_type_func, shen_user_lambda14641, 2, Arg14640];
  var Arg14640_0 = Arg14640[0], Arg14640_1 = Arg14640[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg14640_1, false, Arg14640_0]);})},
  2,
  [Arg14638_3]], Arg14638_2])),
  (function() {
  return shenjs_call_tail(js_emit_func_obj, [shenjs_call(shen_length, [Arg14638_1]), R0, R1, []]);}))},
  4,
  [],
  "js-int-curry"];
shenjs_functions["shen_js-int-curry"] = js_int_curry;






js_internal_op$asterisk$ = [shen_type_func,
  function shen_user_lambda14643(Arg14642) {
  if (Arg14642.length < 5) return [shen_type_func, shen_user_lambda14643, 5, Arg14642];
  var Arg14642_0 = Arg14642[0], Arg14642_1 = Arg14642[1], Arg14642_2 = Arg14642[2], Arg14642_3 = Arg14642[3], Arg14642_4 = Arg14642[4];
  return ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_length, [Arg14642_1]), shenjs_call(shen_length, [Arg14642_2]))))
  ? (function() {
  return shenjs_call_tail(js_int_funcall, [Arg14642_0, Arg14642_2, Arg14642_3, Arg14642_4]);})
  : (function() {
  return shenjs_call_tail(js_int_curry, [Arg14642_0, Arg14642_1, Arg14642_2, Arg14642_4]);}))},
  5,
  [],
  "js-internal-op*"];
shenjs_functions["shen_js-internal-op*"] = js_internal_op$asterisk$;






js_internal_op = [shen_type_func,
  function shen_user_lambda14645(Arg14644) {
  if (Arg14644.length < 4) return [shen_type_func, shen_user_lambda14645, 4, Arg14644];
  var Arg14644_0 = Arg14644[0], Arg14644_1 = Arg14644[1], Arg14644_2 = Arg14644[2], Arg14644_3 = Arg14644[3];
  var R0;
  return ((R0 = shenjs_call(js_int_func_args, [Arg14644_0])),
  shenjs_call(js_intfunc_name, [Arg14644_0]),
  ((shenjs_empty$question$(R0))
  ? shen_fail_obj
  : (function() {
  return shenjs_call_tail(js_internal_op$asterisk$, [Arg14644_0, R0, Arg14644_1, Arg14644_2, Arg14644_3]);})))},
  4,
  [],
  "js-internal-op"];
shenjs_functions["shen_js-internal-op"] = js_internal_op;






js_emit_do = [shen_type_func,
  function shen_user_lambda14647(Arg14646) {
  if (Arg14646.length < 4) return [shen_type_func, shen_user_lambda14647, 4, Arg14646];
  var Arg14646_0 = Arg14646[0], Arg14646_1 = Arg14646[1], Arg14646_2 = Arg14646[2], Arg14646_3 = Arg14646[3];
  var R0, R1;
  return (((shenjs_is_type(Arg14646_0, shen_type_cons) && shenjs_empty$question$(Arg14646_0[2])))
  ? ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda14649(Arg14648) {
  if (Arg14648.length < 2) return [shen_type_func, shen_user_lambda14649, 2, Arg14648];
  var Arg14648_0 = Arg14648[0], Arg14648_1 = Arg14648[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg14648_1, false, Arg14648_0]);})},
  2,
  [Arg14646_2]], shenjs_call(shen_reverse, [Arg14646_3])])),
  (R1 = shenjs_call(shen_intmake_string, [",~%  ", []])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A,~%  ~A)", [shen_tuple, shenjs_call(js_str_join, [R0, R1]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14646_0[1], Arg14646_1, Arg14646_2]), []]]]);}))
  : ((shenjs_is_type(Arg14646_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(js_emit_do, [Arg14646_0[2], Arg14646_1, Arg14646_2, [shen_type_cons, Arg14646_0[1], Arg14646_3]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-emit-do"]]);})))},
  4,
  [],
  "js-emit-do"];
shenjs_functions["shen_js-emit-do"] = js_emit_do;






js_std_op = [shen_type_func,
  function shen_user_lambda14651(Arg14650) {
  if (Arg14650.length < 4) return [shen_type_func, shen_user_lambda14651, 4, Arg14650];
  var Arg14650_0 = Arg14650[0], Arg14650_1 = Arg14650[1], Arg14650_2 = Arg14650[2], Arg14650_3 = Arg14650[3];
  var R0, R1;
  return ((R0 = (new Shenjs_freeze([Arg14650_0, Arg14650_1, Arg14650_2, Arg14650_3], function(Arg14652) {
  var Arg14652_0 = Arg14652[0], Arg14652_1 = Arg14652[1], Arg14652_2 = Arg14652[2], Arg14652_3 = Arg14652[3];
  return (function() {
  return ((R4 = shenjs_call(js_math_op, [Arg14652_0, Arg14652_1, Arg14652_2, Arg14652_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R4, shen_fail_obj)))
  ? ((R4 = (new Shenjs_freeze([Arg14652_0, Arg14652_1, Arg14652_2, Arg14652_3], function(Arg14654) {
  var Arg14654_0 = Arg14654[0], Arg14654_1 = Arg14654[1], Arg14654_2 = Arg14654[2], Arg14654_3 = Arg14654[3];
  return (function() {
  return ((R4 = shenjs_call(js_logic_op, [Arg14654_0, Arg14654_1, Arg14654_2, Arg14654_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R4, shen_fail_obj)))
  ? ((R4 = shenjs_call(js_order_op, [Arg14654_0, Arg14654_1, Arg14654_2, Arg14654_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R4, shen_fail_obj)))
  ? ((R4 = shenjs_call(js_basic_op, [Arg14654_0, Arg14654_1, Arg14654_2, Arg14654_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R4, shen_fail_obj)))
  ? ((R4 = (new Shenjs_freeze([Arg14654_0, Arg14654_1, Arg14654_2, Arg14654_3], function(Arg14656) {
  var Arg14656_0 = Arg14656[0], Arg14656_1 = Arg14656[1], Arg14656_2 = Arg14656[2], Arg14656_3 = Arg14656[3];
  return (function() {
  return (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "trap-error"], Arg14656_0)) && (shenjs_is_type(Arg14656_1, shen_type_cons) && (shenjs_is_type(Arg14656_1[2], shen_type_cons) && shenjs_empty$question$(Arg14656_1[2][2])))))
  ? (function() {
  return shenjs_call_tail(js_emit_trap_error, [Arg14656_1[1], Arg14656_1[2][1], Arg14656_2, Arg14656_3]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "do"], Arg14656_0)))
  ? (function() {
  return shenjs_call_tail(js_emit_do, [Arg14656_1, Arg14656_2, Arg14656_3, []]);})
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fail"], Arg14656_0)) && shenjs_empty$question$(Arg14656_1)))
  ? "shen_fail_obj"
  : shen_fail_obj)));})}))),
  ((shenjs_is_type(Arg14654_0, shen_type_symbol))
  ? ((R3 = shenjs_call(js_internal_op, [Arg14654_0, Arg14654_1, Arg14654_2, Arg14654_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R3, shen_fail_obj)))
  ? shenjs_thaw(R4)
  : R3))
  : shenjs_thaw(R4)))
  : R4))
  : R4))
  : R4));})}))),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "="], Arg14652_0)))
  ? ((R3 = shenjs_call(js_equality_op, [Arg14652_1, Arg14652_2, Arg14652_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R3, shen_fail_obj)))
  ? shenjs_thaw(R4)
  : R3))
  : shenjs_thaw(R4)))
  : R4));})}))),
  (((shenjs_is_type(Arg14650_1, shen_type_cons) && shenjs_empty$question$(Arg14650_1[2])))
  ? ((R1 = shenjs_call(js_predicate_op, [Arg14650_0, Arg14650_1[1], Arg14650_2, Arg14650_3])),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, shen_fail_obj)))
  ? shenjs_thaw(R0)
  : R1))
  : shenjs_thaw(R0)))},
  4,
  [],
  "js-std-op"];
shenjs_functions["shen_js-std-op"] = js_std_op;






js_mk_regs_aux = [shen_type_func,
  function shen_user_lambda14659(Arg14658) {
  if (Arg14658.length < 5) return [shen_type_func, shen_user_lambda14659, 5, Arg14658];
  var Arg14658_0 = Arg14658[0], Arg14658_1 = Arg14658[1], Arg14658_2 = Arg14658[2], Arg14658_3 = Arg14658[3], Arg14658_4 = Arg14658[4];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg14658_1, Arg14658_0)))
  ? Arg14658_4
  : ((R0 = shenjs_call(shen_intmake_string, ["~A~A~A~A", [shen_tuple, Arg14658_4, [shen_tuple, Arg14658_3, [shen_tuple, shenjs_call(js_context_varname, [Arg14658_2]), [shen_tuple, Arg14658_0, []]]]]])),
  (function() {
  return shenjs_call_tail(js_mk_regs_aux, [(Arg14658_0 + 1), Arg14658_1, Arg14658_2, ", ", R0]);})))},
  5,
  [],
  "js-mk-regs-aux"];
shenjs_functions["shen_js-mk-regs-aux"] = js_mk_regs_aux;






js_mk_regs = [shen_type_func,
  function shen_user_lambda14661(Arg14660) {
  if (Arg14660.length < 1) return [shen_type_func, shen_user_lambda14661, 1, Arg14660];
  var Arg14660_0 = Arg14660[0];
  return (function() {
  return shenjs_call_tail(js_mk_regs_aux, [0, shenjs_call(js_context_nregs, [Arg14660_0]), Arg14660_0, "var ", ""]);})},
  1,
  [],
  "js-mk-regs"];
shenjs_functions["shen_js-mk-regs"] = js_mk_regs;






js_mk_regs_str = [shen_type_func,
  function shen_user_lambda14663(Arg14662) {
  if (Arg14662.length < 1) return [shen_type_func, shen_user_lambda14663, 1, Arg14662];
  var Arg14662_0 = Arg14662[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(js_context_nregs, [Arg14662_0]), 0)))
  ? ""
  : (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A;~%  ", [shen_tuple, shenjs_call(js_mk_regs, [Arg14662_0]), []]]);}))},
  1,
  [],
  "js-mk-regs-str"];
shenjs_functions["shen_js-mk-regs-str"] = js_mk_regs_str;






js_mk_args_str_aux = [shen_type_func,
  function shen_user_lambda14665(Arg14664) {
  if (Arg14664.length < 5) return [shen_type_func, shen_user_lambda14665, 5, Arg14664];
  var Arg14664_0 = Arg14664[0], Arg14664_1 = Arg14664[1], Arg14664_2 = Arg14664[2], Arg14664_3 = Arg14664[3], Arg14664_4 = Arg14664[4];
  var R0, R1, R2;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg14664_1, Arg14664_0)))
  ? Arg14664_4
  : ((R0 = "~A~A~A = ~A[~A]"),
  (R1 = shenjs_call(js_context_argname, [Arg14664_2])),
  (R2 = shenjs_call(js_arg_name, [Arg14664_1, Arg14664_2])),
  (R2 = shenjs_call(shen_intmake_string, [R0, [shen_tuple, Arg14664_4, [shen_tuple, Arg14664_3, [shen_tuple, R2, [shen_tuple, R1, [shen_tuple, Arg14664_1, []]]]]]])),
  (function() {
  return shenjs_call_tail(js_mk_args_str_aux, [Arg14664_0, (Arg14664_1 + 1), Arg14664_2, ", ", R2]);})))},
  5,
  [],
  "js-mk-args-str-aux"];
shenjs_functions["shen_js-mk-args-str-aux"] = js_mk_args_str_aux;






js_mk_args_str = [shen_type_func,
  function shen_user_lambda14667(Arg14666) {
  if (Arg14666.length < 2) return [shen_type_func, shen_user_lambda14667, 2, Arg14666];
  var Arg14666_0 = Arg14666[0], Arg14666_1 = Arg14666[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg14666_0)))
  ? ""
  : (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A;~%  ", [shen_tuple, shenjs_call(js_mk_args_str_aux, [Arg14666_0, 0, Arg14666_1, "var ", ""]), []]]);}))},
  2,
  [],
  "js-mk-args-str"];
shenjs_functions["shen_js-mk-args-str"] = js_mk_args_str;






js_emit_func_obj = [shen_type_func,
  function shen_user_lambda14669(Arg14668) {
  if (Arg14668.length < 4) return [shen_type_func, shen_user_lambda14669, 4, Arg14668];
  var Arg14668_0 = Arg14668[0], Arg14668_1 = Arg14668[1], Arg14668_2 = Arg14668[2], Arg14668_3 = Arg14668[3];
  var R0, R1, R2, R3;
  return ((R0 = (((shenjs_unwind_tail(shenjs_$eq$(Arg14668_3, "")) || shenjs_empty$question$(Arg14668_3)))
  ? ""
  : shenjs_call(shen_intmake_string, [",~%  ~A", [shen_tuple, Arg14668_3, []]]))),
  (R1 = "shen_type_func"),
  (R2 = shenjs_call(js_str_join, [Arg14668_2, ", "])),
  (R3 = "[~A,~%  ~A,~%  ~A,~%  [~A]~A]"),
  (function() {
  return shenjs_call_tail(shen_intmake_string, [R3, [shen_tuple, R1, [shen_tuple, Arg14668_1, [shen_tuple, Arg14668_0, [shen_tuple, R2, [shen_tuple, R0, []]]]]]]);}))},
  4,
  [],
  "js-emit-func-obj"];
shenjs_functions["shen_js-emit-func-obj"] = js_emit_func_obj;






js_emit_func_closure = [shen_type_func,
  function shen_user_lambda14671(Arg14670) {
  if (Arg14670.length < 3) return [shen_type_func, shen_user_lambda14671, 3, Arg14670];
  var Arg14670_0 = Arg14670[0], Arg14670_1 = Arg14670[1], Arg14670_2 = Arg14670[2];
  var R0, R1;
  return ((R0 = "[~A, ~A, ~A, ~A]"),
  (R1 = "shen_type_func"),
  (function() {
  return shenjs_call_tail(shen_intmake_string, [R0, [shen_tuple, R1, [shen_tuple, Arg14670_1, [shen_tuple, Arg14670_0, [shen_tuple, Arg14670_2, []]]]]]);}))},
  3,
  [],
  "js-emit-func-closure"];
shenjs_functions["shen_js-emit-func-closure"] = js_emit_func_closure;






js_emit_func_body = [shen_type_func,
  function shen_user_lambda14673(Arg14672) {
  if (Arg14672.length < 5) return [shen_type_func, shen_user_lambda14673, 5, Arg14672];
  var Arg14672_0 = Arg14672[0], Arg14672_1 = Arg14672[1], Arg14672_2 = Arg14672[2], Arg14672_3 = Arg14672[3], Arg14672_4 = Arg14672[4];
  var R0, R1, R2, R3, R4, R5, R6;
  return ((R0 = shenjs_call(js_func_name, [Arg14672_1])),
  ((shenjs_empty$question$(Arg14672_0))
  ? []
  : shenjs_call(js_esc_obj, [shenjs_str(Arg14672_0)])),
  (R1 = shenjs_call(js_context_argname, [Arg14672_4])),
  (R2 = shenjs_call(js_emit_func_closure, [Arg14672_2, R0, R1])),
  (R2 = shenjs_call(shen_intmake_string, ["if (~A.length < ~A) return ~A", [shen_tuple, shenjs_call(js_context_argname, [Arg14672_4]), [shen_tuple, Arg14672_2, [shen_tuple, R2, []]]]])),
  (R3 = "function ~A(~A) {~%  ~A;~%  ~A~Areturn ~A}"),
  (R4 = shenjs_call(js_js_from_kl_expr, [Arg14672_3, true, Arg14672_4])),
  (R5 = shenjs_call(js_mk_regs_str, [Arg14672_4])),
  (R6 = shenjs_call(js_mk_args_str, [Arg14672_2, Arg14672_4])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, [R3, [shen_tuple, R0, [shen_tuple, R1, [shen_tuple, R2, [shen_tuple, R6, [shen_tuple, R5, [shen_tuple, R4, []]]]]]]]);}))},
  5,
  [],
  "js-emit-func-body"];
shenjs_functions["shen_js-emit-func-body"] = js_emit_func_body;






js_emit_mk_func = [shen_type_func,
  function shen_user_lambda14675(Arg14674) {
  if (Arg14674.length < 4) return [shen_type_func, shen_user_lambda14675, 4, Arg14674];
  var Arg14674_0 = Arg14674[0], Arg14674_1 = Arg14674[1], Arg14674_2 = Arg14674[2], Arg14674_3 = Arg14674[3];
  var R0, R1, R2, R3, R4, R5;
  return ((R0 = shenjs_call(js_esc_obj, [shenjs_str(Arg14674_0)])),
  (R1 = shenjs_call(js_esc_obj, [("shen_" + shenjs_str(Arg14674_0))])),
  (R2 = shenjs_call(js_func_name, [Arg14674_0])),
  (R3 = shenjs_call(shen_length, [Arg14674_1])),
  (R4 = shenjs_call(shen_gensym, [[shen_type_symbol, "shen-user-lambda"]])),
  (R4 = shenjs_call(js_emit_func_body, [R2, R4, R3, Arg14674_2, Arg14674_3])),
  (R5 = "~A = ~A;~%shenjs_functions[~A] = ~A;~%"),
  (R4 = shenjs_call(js_emit_func_obj, [R3, R4, [], R0])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, [R5, [shen_tuple, R2, [shen_tuple, R4, [shen_tuple, R1, [shen_tuple, R2, []]]]]]);}))},
  4,
  [],
  "js-emit-mk-func"];
shenjs_functions["shen_js-emit-mk-func"] = js_emit_mk_func;






js_emit_mk_closure = [shen_type_func,
  function shen_user_lambda14677(Arg14676) {
  if (Arg14676.length < 4) return [shen_type_func, shen_user_lambda14677, 4, Arg14676];
  var Arg14676_0 = Arg14676[0], Arg14676_1 = Arg14676[1], Arg14676_2 = Arg14676[2], Arg14676_3 = Arg14676[3];
  var R0, R1, R2;
  return ((R0 = shenjs_call(js_context_toplevel, [Arg14676_3])),
  (R1 = [shen_type_symbol, "Arg"]),
  (R2 = (shenjs_call(shen_length, [Arg14676_1]) + shenjs_call(shen_length, [Arg14676_0]))),
  (R1 = shenjs_call(js_mk_context, [0, R0, shenjs_call(shen_gensym, [R1]), [shen_type_symbol, "R"]])),
  (R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "shen-user-lambda"]])),
  (R0 = shenjs_call(js_emit_func_body, [[], R0, R2, Arg14676_2, R1])),
  shenjs_call(js_context_toplevel_$gt$, [Arg14676_3, shenjs_call(js_context_toplevel, [R1])]),
  (R1 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda14679(Arg14678) {
  if (Arg14678.length < 2) return [shen_type_func, shen_user_lambda14679, 2, Arg14678];
  var Arg14678_0 = Arg14678[0], Arg14678_1 = Arg14678[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg14678_1, false, Arg14678_0]);})},
  2,
  [Arg14676_3]], Arg14676_1])),
  (function() {
  return shenjs_call_tail(js_emit_func_obj, [R2, R0, R1, []]);}))},
  4,
  [],
  "js-emit-mk-closure"];
shenjs_functions["shen_js-emit-mk-closure"] = js_emit_mk_closure;






js_emit_freeze = [shen_type_func,
  function shen_user_lambda14681(Arg14680) {
  if (Arg14680.length < 3) return [shen_type_func, shen_user_lambda14681, 3, Arg14680];
  var Arg14680_0 = Arg14680[0], Arg14680_1 = Arg14680[1], Arg14680_2 = Arg14680[2];
  var R0, R1, R2, R3, R4;
  return ((R0 = shenjs_call(js_context_toplevel, [Arg14680_2])),
  (R1 = [shen_type_symbol, "Arg"]),
  (R1 = shenjs_call(js_mk_context, [0, R0, shenjs_call(shen_gensym, [R1]), [shen_type_symbol, "R"]])),
  shenjs_call(shen_gensym, [[shen_type_symbol, "shen-user-lambda"]]),
  shenjs_call(js_context_toplevel_$gt$, [Arg14680_2, shenjs_call(js_context_toplevel, [R1])]),
  (R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda14683(Arg14682) {
  if (Arg14682.length < 2) return [shen_type_func, shen_user_lambda14683, 2, Arg14682];
  var Arg14682_0 = Arg14682[0], Arg14682_1 = Arg14682[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg14682_1, false, Arg14682_0]);})},
  2,
  [Arg14680_2]], Arg14680_0])),
  (R2 = shenjs_call(js_str_join, [R0, ", "])),
  (R3 = shenjs_call(js_tail_call_ret, [shenjs_call(js_js_from_kl_expr, [Arg14680_1, true, R1])])),
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
  function shen_user_lambda14685(Arg14684) {
  if (Arg14684.length < 3) return [shen_type_func, shen_user_lambda14685, 3, Arg14684];
  var Arg14684_0 = Arg14684[0], Arg14684_1 = Arg14684[1], Arg14684_2 = Arg14684[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(false, Arg14684_1)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_unwind_tail(~A)", [shen_tuple, shenjs_call(js_emit_thaw, [Arg14684_0, true, Arg14684_2]), []]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(true, Arg14684_1)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_thaw(~A)", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14684_0, false, Arg14684_2]), []]]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-emit-thaw"]]);})))},
  3,
  [],
  "js-emit-thaw"];
shenjs_functions["shen_js-emit-thaw"] = js_emit_thaw;






js_emit_get_arg = [shen_type_func,
  function shen_user_lambda14687(Arg14686) {
  if (Arg14686.length < 2) return [shen_type_func, shen_user_lambda14687, 2, Arg14686];
  var Arg14686_0 = Arg14686[0], Arg14686_1 = Arg14686[1];
  return (function() {
  return shenjs_call_tail(js_arg_name, [Arg14686_0, Arg14686_1]);})},
  2,
  [],
  "js-emit-get-arg"];
shenjs_functions["shen_js-emit-get-arg"] = js_emit_get_arg;






js_emit_set_reg = [shen_type_func,
  function shen_user_lambda14689(Arg14688) {
  if (Arg14688.length < 3) return [shen_type_func, shen_user_lambda14689, 3, Arg14688];
  var Arg14688_0 = Arg14688[0], Arg14688_1 = Arg14688[1], Arg14688_2 = Arg14688[2];
  var R0;
  return ((R0 = shenjs_call(js_js_from_kl_expr, [Arg14688_1, false, Arg14688_2])),
  shenjs_call(js_context_nregs_$gt$, [Arg14688_2, shenjs_call(js_max, [(Arg14688_0 + 1), shenjs_call(js_context_nregs, [Arg14688_2])])]),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["(~A~A = ~A)", [shen_tuple, shenjs_call(js_context_varname, [Arg14688_2]), [shen_tuple, Arg14688_0, [shen_tuple, R0, []]]]]);}))},
  3,
  [],
  "js-emit-set-reg"];
shenjs_functions["shen_js-emit-set-reg"] = js_emit_set_reg;






js_emit_get_reg = [shen_type_func,
  function shen_user_lambda14691(Arg14690) {
  if (Arg14690.length < 2) return [shen_type_func, shen_user_lambda14691, 2, Arg14690];
  var Arg14690_0 = Arg14690[0], Arg14690_1 = Arg14690[1];
  return (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A~A", [shen_tuple, shenjs_call(js_context_varname, [Arg14690_1]), [shen_tuple, Arg14690_0, []]]]);})},
  2,
  [],
  "js-emit-get-reg"];
shenjs_functions["shen_js-emit-get-reg"] = js_emit_get_reg;






js_func_arg = [shen_type_func,
  function shen_user_lambda14693(Arg14692) {
  if (Arg14692.length < 2) return [shen_type_func, shen_user_lambda14693, 2, Arg14692];
  var Arg14692_0 = Arg14692[0], Arg14692_1 = Arg14692[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg14692_1, false, Arg14692_0]);})},
  2,
  [],
  "js-func-arg"];
shenjs_functions["shen_js-func-arg"] = js_func_arg;






js_emit_funcall$asterisk$ = [shen_type_func,
  function shen_user_lambda14695(Arg14694) {
  if (Arg14694.length < 4) return [shen_type_func, shen_user_lambda14695, 4, Arg14694];
  var Arg14694_0 = Arg14694[0], Arg14694_1 = Arg14694[1], Arg14694_2 = Arg14694[2], Arg14694_3 = Arg14694[3];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg14694_2)))
  ? ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda14697(Arg14696) {
  if (Arg14696.length < 2) return [shen_type_func, shen_user_lambda14697, 2, Arg14696];
  var Arg14696_0 = Arg14696[0], Arg14696_1 = Arg14696[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg14696_1, false, Arg14696_0]);})},
  2,
  [Arg14694_3]], Arg14694_1])),
  (R0 = shenjs_call(js_str_join, [R0, ", "])),
  (R1 = "shenjs_call_tail"),
  (function() {
  return shenjs_call_tail(js_tail_call_ret, [shenjs_call(shen_intmake_string, ["~A(~A, [~A])", [shen_tuple, R1, [shen_tuple, Arg14694_0, [shen_tuple, R0, []]]]])]);}))
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg14694_2)))
  ? ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda14699(Arg14698) {
  if (Arg14698.length < 2) return [shen_type_func, shen_user_lambda14699, 2, Arg14698];
  var Arg14698_0 = Arg14698[0], Arg14698_1 = Arg14698[1];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg14698_1, false, Arg14698_0]);})},
  2,
  [Arg14694_3]], Arg14694_1])),
  (R0 = shenjs_call(js_str_join, [R0, ", "])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["shenjs_call(~A, [~A])", [shen_tuple, Arg14694_0, [shen_tuple, R0, []]]]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-emit-funcall*"]]);})))},
  4,
  [],
  "js-emit-funcall*"];
shenjs_functions["shen_js-emit-funcall*"] = js_emit_funcall$asterisk$;






js_emit_funcall = [shen_type_func,
  function shen_user_lambda14701(Arg14700) {
  if (Arg14700.length < 4) return [shen_type_func, shen_user_lambda14701, 4, Arg14700];
  var Arg14700_0 = Arg14700[0], Arg14700_1 = Arg14700[1], Arg14700_2 = Arg14700[2], Arg14700_3 = Arg14700[3];
  return (function() {
  return shenjs_call_tail(js_emit_funcall$asterisk$, [shenjs_call(js_func_name, [Arg14700_0]), Arg14700_1, Arg14700_2, Arg14700_3]);})},
  4,
  [],
  "js-emit-funcall"];
shenjs_functions["shen_js-emit-funcall"] = js_emit_funcall;






js_js_from_kl_expr = [shen_type_func,
  function shen_user_lambda14703(Arg14702) {
  if (Arg14702.length < 3) return [shen_type_func, shen_user_lambda14703, 3, Arg14702];
  var Arg14702_0 = Arg14702[0], Arg14702_1 = Arg14702[1], Arg14702_2 = Arg14702[2];
  var R0;
  return ((R0 = shenjs_call(js_js_from_kl_expr$asterisk$, [Arg14702_0, Arg14702_1, Arg14702_2])),
  (((typeof(R0) == 'string'))
  ? R0
  : (function() {
  return shenjs_call_tail(shen_interror, ["ERROR: expr ~R => ~R", [shen_tuple, Arg14702_0, [shen_tuple, R0, []]]]);})))},
  3,
  [],
  "js-js-from-kl-expr"];
shenjs_functions["shen_js-js-from-kl-expr"] = js_js_from_kl_expr;






js_js_from_kl_expr$asterisk$ = [shen_type_func,
  function shen_user_lambda14705(Arg14704) {
  if (Arg14704.length < 3) return [shen_type_func, shen_user_lambda14705, 3, Arg14704];
  var Arg14704_0 = Arg14704[0], Arg14704_1 = Arg14704[1], Arg14704_2 = Arg14704[2];
  var R0, R1;
  return ((shenjs_empty$question$(Arg14704_0))
  ? "[]"
  : (((typeof(Arg14704_0) == 'number'))
  ? (function() {
  return shenjs_str(Arg14704_0);})
  : ((shenjs_unwind_tail(shenjs_$eq$(Arg14704_0, shen_fail_obj)))
  ? "shen_fail_obj"
  : ((shenjs_unwind_tail(shenjs_$eq$(true, Arg14704_0)))
  ? "true"
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg14704_0)))
  ? "false"
  : ((shenjs_is_type(Arg14704_0, shen_type_symbol))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["[shen_type_symbol, ~S]", [shen_tuple, shenjs_str(Arg14704_0), []]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "bar!"], Arg14704_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["[shen_type_symbol, ~S]", [shen_tuple, "|", []]]);})
  : (((shenjs_is_type(Arg14704_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg14704_0[1])) && (shenjs_is_type(Arg14704_0[2], shen_type_cons) && (shenjs_is_type(Arg14704_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg14704_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["[shen_type_cons, ~A, ~A]", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14704_0[2][1], false, Arg14704_2]), [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14704_0[2][2][1], false, Arg14704_2]), []]]]);})
  : (((shenjs_is_type(Arg14704_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "type"], Arg14704_0[1])) && (shenjs_is_type(Arg14704_0[2], shen_type_cons) && (shenjs_is_type(Arg14704_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg14704_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg14704_0[2][1], Arg14704_1, Arg14704_2]);})
  : (((shenjs_is_type(Arg14704_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cond"], Arg14704_0[1]))))
  ? (function() {
  return shenjs_call_tail(js_emit_cond, [Arg14704_0[2], Arg14704_1, Arg14704_2]);})
  : (((shenjs_is_type(Arg14704_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "if"], Arg14704_0[1])) && (shenjs_is_type(Arg14704_0[2], shen_type_cons) && (shenjs_is_type(Arg14704_0[2][2], shen_type_cons) && (shenjs_is_type(Arg14704_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg14704_0[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(js_emit_cond, [[shen_type_cons, [shen_type_cons, Arg14704_0[2][1], [shen_type_cons, Arg14704_0[2][2][1], []]], [shen_type_cons, [shen_type_cons, true, Arg14704_0[2][2][2]], []]], Arg14704_1, Arg14704_2]);})
  : (((shenjs_is_type(Arg14704_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "freeze"], Arg14704_0[1])) && (shenjs_is_type(Arg14704_0[2], shen_type_cons) && shenjs_empty$question$(Arg14704_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["Wrong freeze code!", []]);})
  : (((shenjs_is_type(Arg14704_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mk-freeze"], Arg14704_0[1])) && (shenjs_is_type(Arg14704_0[2], shen_type_cons) && (shenjs_is_type(Arg14704_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg14704_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(js_emit_freeze, [Arg14704_0[2][1], Arg14704_0[2][2][1], Arg14704_2]);})
  : (((shenjs_is_type(Arg14704_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-get-arg"], Arg14704_0[1])) && (shenjs_is_type(Arg14704_0[2], shen_type_cons) && shenjs_empty$question$(Arg14704_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(js_emit_get_arg, [Arg14704_0[2][1], Arg14704_2]);})
  : (((shenjs_is_type(Arg14704_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-get-reg"], Arg14704_0[1])) && (shenjs_is_type(Arg14704_0[2], shen_type_cons) && shenjs_empty$question$(Arg14704_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(js_emit_get_reg, [Arg14704_0[2][1], Arg14704_2]);})
  : (((shenjs_is_type(Arg14704_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-set-reg!"], Arg14704_0[1])) && (shenjs_is_type(Arg14704_0[2], shen_type_cons) && (shenjs_is_type(Arg14704_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg14704_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(js_emit_set_reg, [Arg14704_0[2][1], Arg14704_0[2][2][1], Arg14704_2]);})
  : (((shenjs_is_type(Arg14704_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mk-func"], Arg14704_0[1])) && (shenjs_is_type(Arg14704_0[2], shen_type_cons) && (shenjs_is_type(Arg14704_0[2][2], shen_type_cons) && (shenjs_is_type(Arg14704_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg14704_0[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(js_emit_mk_func, [Arg14704_0[2][1], Arg14704_0[2][2][1], Arg14704_0[2][2][2][1], Arg14704_2]);})
  : (((shenjs_is_type(Arg14704_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mk-closure"], Arg14704_0[1])) && (shenjs_is_type(Arg14704_0[2], shen_type_cons) && (shenjs_is_type(Arg14704_0[2][2], shen_type_cons) && (shenjs_is_type(Arg14704_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg14704_0[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(js_emit_mk_closure, [Arg14704_0[2][1], Arg14704_0[2][2][1], Arg14704_0[2][2][2][1], Arg14704_2]);})
  : ((R0 = (new Shenjs_freeze([Arg14704_0, Arg14704_1, Arg14704_2], function(Arg14706) {
  var Arg14706_0 = Arg14706[0], Arg14706_1 = Arg14706[1], Arg14706_2 = Arg14706[2];
  return (function() {
  return (((shenjs_is_type(Arg14706_0, shen_type_cons) && shenjs_is_type(Arg14706_0[1], shen_type_cons)))
  ? ((R3 = shenjs_call(js_js_from_kl_expr, [Arg14706_0[1], false, Arg14706_2])),
  (function() {
  return shenjs_call_tail(js_emit_funcall$asterisk$, [R3, Arg14706_0[2], Arg14706_1, Arg14706_2]);}))
  : ((shenjs_is_type(Arg14706_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(js_emit_funcall, [Arg14706_0[1], Arg14706_0[2], Arg14706_1, Arg14706_2]);})
  : (function() {
  return shenjs_call_tail(js_esc_obj, [Arg14706_0]);})));})}))),
  ((shenjs_is_type(Arg14704_0, shen_type_cons))
  ? ((R1 = shenjs_call(js_std_op, [Arg14704_0[1], Arg14704_0[2], Arg14704_1, Arg14704_2])),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, shen_fail_obj)))
  ? shenjs_thaw(R0)
  : R1))
  : shenjs_thaw(R0)))))))))))))))))))))},
  3,
  [],
  "js-js-from-kl-expr*"];
shenjs_functions["shen_js-js-from-kl-expr*"] = js_js_from_kl_expr$asterisk$;






js_js_from_kl_toplevel_expr = [shen_type_func,
  function shen_user_lambda14709(Arg14708) {
  if (Arg14708.length < 2) return [shen_type_func, shen_user_lambda14709, 2, Arg14708];
  var Arg14708_0 = Arg14708[0], Arg14708_1 = Arg14708[1];
  var R0, R1;
  return (((typeof(Arg14708_0) == 'string'))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A;~%", [shen_tuple, shenjs_call(js_js_from_kl_expr, [Arg14708_0, false, Arg14708_1]), []]]);})
  : ((R0 = shenjs_call(js_js_from_kl_expr, [Arg14708_0, false, Arg14708_1])),
  (R1 = shenjs_call(js_mk_regs_str, [Arg14708_1])),
  (((shenjs_call(js_context_nregs, [Arg14708_1]) > 0))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["((function() {~%  ~Areturn ~A})());~%", [shen_tuple, R1, [shen_tuple, R0, []]]]);})
  : (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A;", [shen_tuple, R0, []]]);}))))},
  2,
  [],
  "js-js-from-kl-toplevel-expr"];
shenjs_functions["shen_js-js-from-kl-toplevel-expr"] = js_js_from_kl_toplevel_expr;






js_js_from_kl_toplevel = [shen_type_func,
  function shen_user_lambda14711(Arg14710) {
  if (Arg14710.length < 3) return [shen_type_func, shen_user_lambda14711, 3, Arg14710];
  var Arg14710_0 = Arg14710[0], Arg14710_1 = Arg14710[1], Arg14710_2 = Arg14710[2];
  return (((shenjs_is_type(Arg14710_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "set"], Arg14710_0[1])) && (shenjs_is_type(Arg14710_0[2], shen_type_cons) && (shenjs_is_type(Arg14710_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg14710_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A;~%", [shen_tuple, shenjs_call(js_emit_set, [Arg14710_0[2][1], Arg14710_0[2][2][1], Arg14710_2]), []]]);})
  : (((shenjs_is_type(Arg14710_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mk-func"], Arg14710_0[1])) && (shenjs_is_type(Arg14710_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg14710_1)) && shenjs_call(js_int_func$question$, [Arg14710_0[2][1]]))))))
  ? ""
  : (((shenjs_is_type(Arg14710_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mk-func"], Arg14710_0[1]))))
  ? (function() {
  return shenjs_call_tail(js_js_from_kl_expr, [Arg14710_0, true, Arg14710_2]);})
  : (function() {
  return shenjs_call_tail(js_js_from_kl_toplevel_expr, [Arg14710_0, Arg14710_2]);}))))},
  3,
  [],
  "js-js-from-kl-toplevel"];
shenjs_functions["shen_js-js-from-kl-toplevel"] = js_js_from_kl_toplevel;






js_js_from_kl_toplevel_forms = [shen_type_func,
  function shen_user_lambda14713(Arg14712) {
  if (Arg14712.length < 4) return [shen_type_func, shen_user_lambda14713, 4, Arg14712];
  var Arg14712_0 = Arg14712[0], Arg14712_1 = Arg14712[1], Arg14712_2 = Arg14712[2], Arg14712_3 = Arg14712[3];
  var R0;
  return ((shenjs_empty$question$(Arg14712_0))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A~%~A~%", [shen_tuple, shenjs_call(js_context_toplevel, [Arg14712_2]), [shen_tuple, Arg14712_3, []]]]);})
  : ((shenjs_is_type(Arg14712_0, shen_type_cons))
  ? ((R0 = shenjs_call(js_js_from_kl_toplevel, [Arg14712_0[1], Arg14712_1, Arg14712_2])),
  (R0 = shenjs_call(shen_intmake_string, ["~A~A~%", [shen_tuple, Arg14712_3, [shen_tuple, R0, []]]])),
  (function() {
  return shenjs_call_tail(js_js_from_kl_toplevel_forms, [Arg14712_0[2], Arg14712_1, Arg14712_2, R0]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-js-from-kl-toplevel-forms"]]);})))},
  4,
  [],
  "js-js-from-kl-toplevel-forms"];
shenjs_functions["shen_js-js-from-kl-toplevel-forms"] = js_js_from_kl_toplevel_forms;






js_js_from_kl$asterisk$ = [shen_type_func,
  function shen_user_lambda14715(Arg14714) {
  if (Arg14714.length < 3) return [shen_type_func, shen_user_lambda14715, 3, Arg14714];
  var Arg14714_0 = Arg14714[0], Arg14714_1 = Arg14714[1], Arg14714_2 = Arg14714[2];
  return (function() {
  return shenjs_call_tail(js_js_from_kl_toplevel, [Arg14714_0, Arg14714_1, Arg14714_2]);})},
  3,
  [],
  "js-js-from-kl*"];
shenjs_functions["shen_js-js-from-kl*"] = js_js_from_kl$asterisk$;






js_from_kl = [shen_type_func,
  function shen_user_lambda14717(Arg14716) {
  if (Arg14716.length < 1) return [shen_type_func, shen_user_lambda14717, 1, Arg14716];
  var Arg14716_0 = Arg14716[0];
  var R0, R1;
  return ((R0 = shenjs_call(js_mk_context, [0, "", shenjs_call(shen_gensym, [[shen_type_symbol, "Arg"]]), [shen_type_symbol, "R"]])),
  (R1 = shenjs_call(reg_kl_walk, [[shen_type_cons, Arg14716_0, []]])),
  (R1 = shenjs_call(js_js_from_kl_toplevel_forms, [R1, (shenjs_globals["shen_js-skip-internals"]), R0, ""])),
  (function() {
  return shenjs_call_tail(shen_intmake_string, ["~A~%~A~%", [shen_tuple, shenjs_call(js_context_toplevel, [R0]), [shen_tuple, R1, []]]]);}))},
  1,
  [],
  "js-from-kl"];
shenjs_functions["shen_js-from-kl"] = js_from_kl;






js_js_from_kl_all = [shen_type_func,
  function shen_user_lambda14719(Arg14718) {
  if (Arg14718.length < 1) return [shen_type_func, shen_user_lambda14719, 1, Arg14718];
  var Arg14718_0 = Arg14718[0];
  var R0, R1;
  return ((R0 = shenjs_call(reg_kl_walk, [Arg14718_0])),
  (R1 = shenjs_call(js_mk_context, [0, "", shenjs_call(shen_gensym, [[shen_type_symbol, "Arg"]]), [shen_type_symbol, "R"]])),
  (function() {
  return shenjs_call_tail(js_js_from_kl_toplevel_all, [R0, (shenjs_globals["shen_js-skip-internals"]), R1, ""]);}))},
  1,
  [],
  "js-js-from-kl-all"];
shenjs_functions["shen_js-js-from-kl-all"] = js_js_from_kl_all;






(shenjs_globals["shen_js-skip-internals"] = true);






js_js_write_string = [shen_type_func,
  function shen_user_lambda14722(Arg14721) {
  if (Arg14721.length < 3) return [shen_type_func, shen_user_lambda14722, 3, Arg14721];
  var Arg14721_0 = Arg14721[0], Arg14721_1 = Arg14721[1], Arg14721_2 = Arg14721[2];
  return (function() {
  return shenjs_trap_error(function() {return (shenjs_pr(Arg14721_0[Arg14721_1], Arg14721_2),
  shenjs_call(js_js_write_string, [Arg14721_0, (Arg14721_1 + 1), Arg14721_2]));}, [shen_type_func,
  function shen_user_lambda14724(Arg14723) {
  if (Arg14723.length < 1) return [shen_type_func, shen_user_lambda14724, 1, Arg14723];
  var Arg14723_0 = Arg14723[0];
  return true},
  1,
  []]);})},
  3,
  [],
  "js-js-write-string"];
shenjs_functions["shen_js-js-write-string"] = js_js_write_string;






js_js_dump_exprs_to_file = [shen_type_func,
  function shen_user_lambda14726(Arg14725) {
  if (Arg14725.length < 2) return [shen_type_func, shen_user_lambda14726, 2, Arg14725];
  var Arg14725_0 = Arg14725[0], Arg14725_1 = Arg14725[1];
  return ((shenjs_empty$question$(Arg14725_0))
  ? true
  : ((shenjs_is_type(Arg14725_0, shen_type_cons))
  ? (shenjs_call(js_js_write_string, [shenjs_call(js_from_kl, [Arg14725_0[1]]), 0, Arg14725_1]),
  shenjs_call(js_js_write_string, [shenjs_call(shen_intmake_string, ["~%", []]), 0, Arg14725_1]),
  (function() {
  return shenjs_call_tail(js_js_dump_exprs_to_file, [Arg14725_0[2], Arg14725_1]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "js-js-dump-exprs-to-file"]]);})))},
  2,
  [],
  "js-js-dump-exprs-to-file"];
shenjs_functions["shen_js-js-dump-exprs-to-file"] = js_js_dump_exprs_to_file;






js_dump_to_file = [shen_type_func,
  function shen_user_lambda14728(Arg14727) {
  if (Arg14727.length < 2) return [shen_type_func, shen_user_lambda14728, 2, Arg14727];
  var Arg14727_0 = Arg14727[0], Arg14727_1 = Arg14727[1];
  var R0;
  return ((R0 = shenjs_open([shen_type_symbol, "file"], Arg14727_1, [shen_type_symbol, "out"])),
  shenjs_call(js_js_dump_exprs_to_file, [Arg14727_0, R0]),
  shenjs_close(R0),
  true)},
  2,
  [],
  "js-dump-to-file"];
shenjs_functions["shen_js-dump-to-file"] = js_dump_to_file;






js_kl_from_shen = [shen_type_func,
  function shen_user_lambda14730(Arg14729) {
  if (Arg14729.length < 1) return [shen_type_func, shen_user_lambda14730, 1, Arg14729];
  var Arg14729_0 = Arg14729[0];
  var R0;
  return ((R0 = shenjs_call(shen_walk, [[shen_type_func,
  function shen_user_lambda14732(Arg14731) {
  if (Arg14731.length < 1) return [shen_type_func, shen_user_lambda14732, 1, Arg14731];
  var Arg14731_0 = Arg14731[0];
  return (function() {
  return shenjs_call_tail(shen_macroexpand, [Arg14731_0]);})},
  1,
  []], Arg14729_0])),
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
  function shen_user_lambda14734(Arg14733) {
  if (Arg14733.length < 3) return [shen_type_func, shen_user_lambda14734, 3, Arg14733];
  var Arg14733_0 = Arg14733[0], Arg14733_1 = Arg14733[1], Arg14733_2 = Arg14733[2];
  var R0, R1, R2;
  return ((R0 = shenjs_call(shen_intmake_string, ["~A~A.js", [shen_tuple, Arg14733_2, [shen_tuple, Arg14733_1, []]]])),
  (R1 = shenjs_call(shen_intmake_string, ["~A~A", [shen_tuple, Arg14733_0, [shen_tuple, Arg14733_1, []]]])),
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
  function shen_user_lambda14738(Arg14737) {
  if (Arg14737.length < 1) return [shen_type_func, shen_user_lambda14738, 1, Arg14737];
  var Arg14737_0 = Arg14737[0];
  return false},
  1,
  []]))
  ? shenjs_call(register_dumper, [[shen_type_symbol, "javascript"], [shen_type_symbol, "all"], [shen_type_symbol, "js-dump"]])
  : [shen_type_symbol, "_"]);





shenjs_repl_split_input_aux = [shen_type_func,
  function shen_user_lambda14744(Arg14743) {
  if (Arg14743.length < 3) return [shen_type_func, shen_user_lambda14744, 3, Arg14743];
  var Arg14743_0 = Arg14743[0], Arg14743_1 = Arg14743[1], Arg14743_2 = Arg14743[2];
  var R0, R1, R2;
  return ((shenjs_empty$question$(Arg14743_0))
  ? Arg14743_2
  : ((shenjs_is_type(Arg14743_0, shen_type_cons))
  ? ((R0 = [shen_type_cons, Arg14743_0[1], Arg14743_1]),
  (R1 = shenjs_call(shen_reverse, [R0])),
  (R2 = shenjs_call(shen_compile, [[shen_type_symbol, "shen-<st_input>"], R1, []])),
  (function() {
  return shenjs_call_tail(shenjs_repl_split_input_aux, [Arg14743_0[2], R0, (((shenjs_unwind_tail(shenjs_$eq$(R2, shen_fail_obj)) || shenjs_empty$question$(R2)))
  ? Arg14743_2
  : [shen_tuple, R1, Arg14743_0[2]])]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "shenjs-repl-split-input-aux"]]);})))},
  3,
  [],
  "shenjs-repl-split-input-aux"];
shenjs_functions["shen_shenjs-repl-split-input-aux"] = shenjs_repl_split_input_aux;






shenjs_repl_split_input = [shen_type_func,
  function shen_user_lambda14746(Arg14745) {
  if (Arg14745.length < 1) return [shen_type_func, shen_user_lambda14746, 1, Arg14745];
  var Arg14745_0 = Arg14745[0];
  return (function() {
  return shenjs_call_tail(shenjs_repl_split_input_aux, [Arg14745_0, [], []]);})},
  1,
  [],
  "shenjs-repl-split-input"];
shenjs_functions["shen_shenjs-repl-split-input"] = shenjs_repl_split_input;












shen_shen_$gt$kl = [shen_type_func,
  function shen_user_lambda14843(Arg14842) {
  if (Arg14842.length < 2) return [shen_type_func, shen_user_lambda14843, 2, Arg14842];
  var Arg14842_0 = Arg14842[0], Arg14842_1 = Arg14842[1];
  return (function() {
  return shenjs_call_tail(shen_compile, [[shen_type_func,
  function shen_user_lambda14845(Arg14844) {
  if (Arg14844.length < 1) return [shen_type_func, shen_user_lambda14845, 1, Arg14844];
  var Arg14844_0 = Arg14844[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$define$gt$, [Arg14844_0]);})},
  1,
  []], [shen_type_cons, Arg14842_0, Arg14842_1], [shen_type_func,
  function shen_user_lambda14847(Arg14846) {
  if (Arg14846.length < 2) return [shen_type_func, shen_user_lambda14847, 2, Arg14846];
  var Arg14846_0 = Arg14846[0], Arg14846_1 = Arg14846[1];
  return (function() {
  return shenjs_call_tail(shen_shen_syntax_error, [Arg14846_0, Arg14846_1]);})},
  2,
  [Arg14842_0]]]);})},
  2,
  [],
  "shen-shen->kl"];
shenjs_functions["shen_shen-shen->kl"] = shen_shen_$gt$kl;






shen_shen_syntax_error = [shen_type_func,
  function shen_user_lambda14849(Arg14848) {
  if (Arg14848.length < 2) return [shen_type_func, shen_user_lambda14849, 2, Arg14848];
  var Arg14848_0 = Arg14848[0], Arg14848_1 = Arg14848[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["syntax error in ~A here:~%~% ~A~%", [shen_tuple, Arg14848_0, [shen_tuple, shenjs_call(shen_next_50, [50, Arg14848_1]), []]]]);})},
  2,
  [],
  "shen-shen-syntax-error"];
shenjs_functions["shen_shen-shen-syntax-error"] = shen_shen_syntax_error;






shen_$lt$define$gt$ = [shen_type_func,
  function shen_user_lambda14851(Arg14850) {
  if (Arg14850.length < 1) return [shen_type_func, shen_user_lambda14851, 1, Arg14850];
  var Arg14850_0 = Arg14850[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$name$gt$, [Arg14850_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$name$gt$, [Arg14850_0])),
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
  function shen_user_lambda14853(Arg14852) {
  if (Arg14852.length < 1) return [shen_type_func, shen_user_lambda14853, 1, Arg14852];
  var Arg14852_0 = Arg14852[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg14852_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14852_0])[2], shenjs_call(shen_snd, [Arg14852_0])])]), (((shenjs_is_type(shenjs_call(shen_fst, [Arg14852_0])[1], shen_type_symbol) && (!shenjs_call(shen_sysfunc$question$, [shenjs_call(shen_fst, [Arg14852_0])[1]]))))
  ? shenjs_call(shen_fst, [Arg14852_0])[1]
  : shenjs_call(shen_interror, ["~A is not a legitimate function name.~%", [shen_tuple, shenjs_call(shen_fst, [Arg14852_0])[1], []]]))])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<name>"];
shenjs_functions["shen_shen-<name>"] = shen_$lt$name$gt$;






shen_sysfunc$question$ = [shen_type_func,
  function shen_user_lambda14855(Arg14854) {
  if (Arg14854.length < 1) return [shen_type_func, shen_user_lambda14855, 1, Arg14854];
  var Arg14854_0 = Arg14854[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg14854_0, (shenjs_globals["shen_shen-*system*"])]);})},
  1,
  [],
  "shen-sysfunc?"];
shenjs_functions["shen_shen-sysfunc?"] = shen_sysfunc$question$;






shen_$lt$signature$gt$ = [shen_type_func,
  function shen_user_lambda14857(Arg14856) {
  if (Arg14856.length < 1) return [shen_type_func, shen_user_lambda14857, 1, Arg14856];
  var Arg14856_0 = Arg14856[0];
  var R0;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg14856_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "{"], shenjs_call(shen_fst, [Arg14856_0])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$signature_help$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14856_0])[2], shenjs_call(shen_snd, [Arg14856_0])])])),
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
  function shen_user_lambda14859(Arg14858) {
  if (Arg14858.length < 1) return [shen_type_func, shen_user_lambda14859, 1, Arg14858];
  var Arg14858_0 = Arg14858[0];
  return (((shenjs_is_type(Arg14858_0, shen_type_cons) && (shenjs_is_type(Arg14858_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-->"], Arg14858_0[2][1])) && (shenjs_is_type(Arg14858_0[2][2], shen_type_cons) && (shenjs_is_type(Arg14858_0[2][2][2], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-->"], Arg14858_0[2][2][2][1]))))))))
  ? (function() {
  return shenjs_call_tail(shen_curry_type, [[shen_type_cons, Arg14858_0[1], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, Arg14858_0[2][2], []]]]]);})
  : (((shenjs_is_type(Arg14858_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg14858_0[1])) && (shenjs_is_type(Arg14858_0[2], shen_type_cons) && (shenjs_is_type(Arg14858_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg14858_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_curry_type, [Arg14858_0[2][1]]), []]]
  : (((shenjs_is_type(Arg14858_0, shen_type_cons) && (shenjs_is_type(Arg14858_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "*"], Arg14858_0[2][1])) && (shenjs_is_type(Arg14858_0[2][2], shen_type_cons) && (shenjs_is_type(Arg14858_0[2][2][2], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "*"], Arg14858_0[2][2][2][1]))))))))
  ? (function() {
  return shenjs_call_tail(shen_curry_type, [[shen_type_cons, Arg14858_0[1], [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, Arg14858_0[2][2], []]]]]);})
  : ((shenjs_is_type(Arg14858_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda14861(Arg14860) {
  if (Arg14860.length < 1) return [shen_type_func, shen_user_lambda14861, 1, Arg14860];
  var Arg14860_0 = Arg14860[0];
  return (function() {
  return shenjs_call_tail(shen_curry_type, [Arg14860_0]);})},
  1,
  []], Arg14858_0]);})
  : Arg14858_0))))},
  1,
  [],
  "shen-curry-type"];
shenjs_functions["shen_shen-curry-type"] = shen_curry_type;






shen_$lt$signature_help$gt$ = [shen_type_func,
  function shen_user_lambda14863(Arg14862) {
  if (Arg14862.length < 1) return [shen_type_func, shen_user_lambda14863, 1, Arg14862];
  var Arg14862_0 = Arg14862[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg14862_0]), shen_type_cons))
  ? ((R0 = shenjs_call(shen_$lt$signature_help$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14862_0])[2], shenjs_call(shen_snd, [Arg14862_0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), ((shenjs_call(shen_element$question$, [shenjs_call(shen_fst, [Arg14862_0])[1], [shen_type_cons, [shen_type_symbol, "{"], [shen_type_cons, [shen_type_symbol, "}"], []]]]))
  ? shen_fail_obj
  : [shen_type_cons, shenjs_call(shen_fst, [Arg14862_0])[1], shenjs_call(shen_snd, [R0])])])
  : shen_fail_obj))
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg14862_0])),
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
  function shen_user_lambda14865(Arg14864) {
  if (Arg14864.length < 1) return [shen_type_func, shen_user_lambda14865, 1, Arg14864];
  var Arg14864_0 = Arg14864[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$rule$gt$, [Arg14864_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$rules$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$rule$gt$, [Arg14864_0])),
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
  function shen_user_lambda14867(Arg14866) {
  if (Arg14866.length < 1) return [shen_type_func, shen_user_lambda14867, 1, Arg14866];
  var Arg14866_0 = Arg14866[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg14866_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg14866_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "->"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$action$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R1]), []]]])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg14866_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg14866_0])),
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
  function shen_user_lambda14869(Arg14868) {
  if (Arg14868.length < 2) return [shen_type_func, shen_user_lambda14869, 2, Arg14868];
  var Arg14868_0 = Arg14868[0], Arg14868_1 = Arg14868[1];
  return ((shenjs_call(Arg14868_0, [Arg14868_1]))
  ? shen_fail_obj
  : Arg14868_1)},
  2,
  [],
  "shen-fail_if"];
shenjs_functions["shen_shen-fail_if"] = shen_fail$_if;






shen_succeeds$question$ = [shen_type_func,
  function shen_user_lambda14871(Arg14870) {
  if (Arg14870.length < 1) return [shen_type_func, shen_user_lambda14871, 1, Arg14870];
  var Arg14870_0 = Arg14870[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg14870_0, shen_fail_obj)))
  ? false
  : true)},
  1,
  [],
  "shen-succeeds?"];
shenjs_functions["shen_shen-succeeds?"] = shen_succeeds$question$;






shen_$lt$patterns$gt$ = [shen_type_func,
  function shen_user_lambda14873(Arg14872) {
  if (Arg14872.length < 1) return [shen_type_func, shen_user_lambda14873, 1, Arg14872];
  var Arg14872_0 = Arg14872[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$pattern$gt$, [Arg14872_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$patterns$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg14872_0])),
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
  function shen_user_lambda14875(Arg14874) {
  if (Arg14874.length < 1) return [shen_type_func, shen_user_lambda14875, 1, Arg14874];
  var Arg14874_0 = Arg14874[0];
  var R0, R1;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg14874_0]), shen_type_cons) && shenjs_is_type(shenjs_call(shen_fst, [Arg14874_0])[1], shen_type_cons)))
  ? shenjs_call(shen_snd_or_fail, [(((shenjs_is_type(shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@p"], shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$pattern1$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$pattern2$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[2], shenjs_call(shen_snd, [Arg14874_0])])]), [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R1]), []]]]])])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg14874_0]), shen_type_cons) && shenjs_is_type(shenjs_call(shen_fst, [Arg14874_0])[1], shen_type_cons)))
  ? shenjs_call(shen_snd_or_fail, [(((shenjs_is_type(shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$pattern1$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$pattern2$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[2], shenjs_call(shen_snd, [Arg14874_0])])]), [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R1]), []]]]])])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg14874_0]), shen_type_cons) && shenjs_is_type(shenjs_call(shen_fst, [Arg14874_0])[1], shen_type_cons)))
  ? shenjs_call(shen_snd_or_fail, [(((shenjs_is_type(shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@v"], shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$pattern1$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$pattern2$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[2], shenjs_call(shen_snd, [Arg14874_0])])]), [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R1]), []]]]])])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg14874_0]), shen_type_cons) && shenjs_is_type(shenjs_call(shen_fst, [Arg14874_0])[1], shen_type_cons)))
  ? shenjs_call(shen_snd_or_fail, [(((shenjs_is_type(shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$pattern1$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$pattern2$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[2], shenjs_call(shen_snd, [Arg14874_0])])]), [shen_type_cons, [shen_type_symbol, "@s"], [shen_type_cons, shenjs_call(shen_snd, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R1]), []]]]])])
  : shen_fail_obj))
  : shen_fail_obj))
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg14874_0]), shen_type_cons) && shenjs_is_type(shenjs_call(shen_fst, [Arg14874_0])[1], shen_type_cons)))
  ? shenjs_call(shen_snd_or_fail, [(((shenjs_is_type(shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "vector"], shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])[1]))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])])]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(0, shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])])])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])[2], shenjs_call(shen_snd, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[1], shenjs_call(shen_snd, [Arg14874_0])])])])])])]), shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[2], shenjs_call(shen_snd, [Arg14874_0])])]), [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 0, []]]])])
  : shen_fail_obj)
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg14874_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14874_0])[2], shenjs_call(shen_snd, [Arg14874_0])])]), ((shenjs_is_type(shenjs_call(shen_fst, [Arg14874_0])[1], shen_type_cons))
  ? shenjs_call(shen_interror, ["~A is not a legitimate constructor~%", [shen_tuple, shenjs_call(shen_fst, [Arg14874_0])[1], []]])
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$simple$_pattern$gt$, [Arg14874_0])),
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
  function shen_user_lambda14877(Arg14876) {
  if (Arg14876.length < 1) return [shen_type_func, shen_user_lambda14877, 1, Arg14876];
  var Arg14876_0 = Arg14876[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg14876_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14876_0])[2], shenjs_call(shen_snd, [Arg14876_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg14876_0])[1], [shen_type_symbol, "_"])))
  ? shenjs_call(shen_gensym, [[shen_type_symbol, "X"]])
  : shen_fail_obj)])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg14876_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14876_0])[2], shenjs_call(shen_snd, [Arg14876_0])])]), ((shenjs_call(shen_element$question$, [shenjs_call(shen_fst, [Arg14876_0])[1], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_symbol, "<-"], []]]]))
  ? shen_fail_obj
  : shenjs_call(shen_fst, [Arg14876_0])[1])])
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
  function shen_user_lambda14879(Arg14878) {
  if (Arg14878.length < 1) return [shen_type_func, shen_user_lambda14879, 1, Arg14878];
  var Arg14878_0 = Arg14878[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$pattern$gt$, [Arg14878_0])),
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
  function shen_user_lambda14881(Arg14880) {
  if (Arg14880.length < 1) return [shen_type_func, shen_user_lambda14881, 1, Arg14880];
  var Arg14880_0 = Arg14880[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$pattern$gt$, [Arg14880_0])),
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
  function shen_user_lambda14883(Arg14882) {
  if (Arg14882.length < 1) return [shen_type_func, shen_user_lambda14883, 1, Arg14882];
  var Arg14882_0 = Arg14882[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg14882_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14882_0])[2], shenjs_call(shen_snd, [Arg14882_0])])]), shenjs_call(shen_fst, [Arg14882_0])[1]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<action>"];
shenjs_functions["shen_shen-<action>"] = shen_$lt$action$gt$;






shen_$lt$guard$gt$ = [shen_type_func,
  function shen_user_lambda14885(Arg14884) {
  if (Arg14884.length < 1) return [shen_type_func, shen_user_lambda14885, 1, Arg14884];
  var Arg14884_0 = Arg14884[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg14884_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg14884_0])[2], shenjs_call(shen_snd, [Arg14884_0])])]), shenjs_call(shen_fst, [Arg14884_0])[1]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<guard>"];
shenjs_functions["shen_shen-<guard>"] = shen_$lt$guard$gt$;






shen_compile$_to$_machine$_code = [shen_type_func,
  function shen_user_lambda14887(Arg14886) {
  if (Arg14886.length < 2) return [shen_type_func, shen_user_lambda14887, 2, Arg14886];
  var Arg14886_0 = Arg14886[0], Arg14886_1 = Arg14886[1];
  var R0;
  return ((R0 = shenjs_call(shen_compile$_to$_lambda$plus$, [Arg14886_0, Arg14886_1])),
  (R0 = shenjs_call(shen_compile$_to$_kl, [Arg14886_0, R0])),
  shenjs_call(shen_record_source, [Arg14886_0, R0]),
  R0)},
  2,
  [],
  "shen-compile_to_machine_code"];
shenjs_functions["shen_shen-compile_to_machine_code"] = shen_compile$_to$_machine$_code;






shen_record_source = [shen_type_func,
  function shen_user_lambda14889(Arg14888) {
  if (Arg14888.length < 2) return [shen_type_func, shen_user_lambda14889, 2, Arg14888];
  var Arg14888_0 = Arg14888[0], Arg14888_1 = Arg14888[1];
  return (((shenjs_globals["shen_shen-*installing-kl*"]))
  ? [shen_type_symbol, "shen-skip"]
  : (function() {
  return shenjs_call_tail(shen_put, [Arg14888_0, [shen_type_symbol, "shen-source"], Arg14888_1, (shenjs_globals["shen_shen-*property-vector*"])]);}))},
  2,
  [],
  "shen-record-source"];
shenjs_functions["shen_shen-record-source"] = shen_record_source;






shen_compile$_to$_lambda$plus$ = [shen_type_func,
  function shen_user_lambda14891(Arg14890) {
  if (Arg14890.length < 2) return [shen_type_func, shen_user_lambda14891, 2, Arg14890];
  var Arg14890_0 = Arg14890[0], Arg14890_1 = Arg14890[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_aritycheck, [Arg14890_0, Arg14890_1])),
  shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda14893(Arg14892) {
  if (Arg14892.length < 2) return [shen_type_func, shen_user_lambda14893, 2, Arg14892];
  var Arg14892_0 = Arg14892[0], Arg14892_1 = Arg14892[1];
  return (function() {
  return shenjs_call_tail(shen_free$_variable$_check, [Arg14892_0, Arg14892_1]);})},
  2,
  [Arg14890_0]], Arg14890_1]),
  (R0 = shenjs_call(shen_parameters, [R0])),
  (R1 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda14895(Arg14894) {
  if (Arg14894.length < 1) return [shen_type_func, shen_user_lambda14895, 1, Arg14894];
  var Arg14894_0 = Arg14894[0];
  return (function() {
  return shenjs_call_tail(shen_linearise, [Arg14894_0]);})},
  1,
  []], shenjs_call(shen_strip_protect, [Arg14890_1])])),
  (R1 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda14897(Arg14896) {
  if (Arg14896.length < 1) return [shen_type_func, shen_user_lambda14897, 1, Arg14896];
  var Arg14896_0 = Arg14896[0];
  return (function() {
  return shenjs_call_tail(shen_abstract$_rule, [Arg14896_0]);})},
  1,
  []], R1])),
  (R1 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda14899(Arg14898) {
  if (Arg14898.length < 2) return [shen_type_func, shen_user_lambda14899, 2, Arg14898];
  var Arg14898_0 = Arg14898[0], Arg14898_1 = Arg14898[1];
  return (function() {
  return shenjs_call_tail(shen_application$_build, [Arg14898_0, Arg14898_1]);})},
  2,
  [R0]], R1])),
  [shen_type_cons, R0, [shen_type_cons, R1, []]])},
  2,
  [],
  "shen-compile_to_lambda+"];
shenjs_functions["shen_shen-compile_to_lambda+"] = shen_compile$_to$_lambda$plus$;






shen_free$_variable$_check = [shen_type_func,
  function shen_user_lambda14901(Arg14900) {
  if (Arg14900.length < 2) return [shen_type_func, shen_user_lambda14901, 2, Arg14900];
  var Arg14900_0 = Arg14900[0], Arg14900_1 = Arg14900[1];
  var R0;
  return (((shenjs_is_type(Arg14900_1, shen_type_cons) && (shenjs_is_type(Arg14900_1[2], shen_type_cons) && shenjs_empty$question$(Arg14900_1[2][2]))))
  ? ((R0 = shenjs_call(shen_extract$_vars, [Arg14900_1[1]])),
  (R0 = shenjs_call(shen_extract$_free$_vars, [R0, Arg14900_1[2][1]])),
  (function() {
  return shenjs_call_tail(shen_free$_variable$_warnings, [Arg14900_0, R0]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-free_variable_check"]]);}))},
  2,
  [],
  "shen-free_variable_check"];
shenjs_functions["shen_shen-free_variable_check"] = shen_free$_variable$_check;






shen_extract$_vars = [shen_type_func,
  function shen_user_lambda14903(Arg14902) {
  if (Arg14902.length < 1) return [shen_type_func, shen_user_lambda14903, 1, Arg14902];
  var Arg14902_0 = Arg14902[0];
  return ((shenjs_call(shen_variable$question$, [Arg14902_0]))
  ? [shen_type_cons, Arg14902_0, []]
  : ((shenjs_is_type(Arg14902_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_union, [shenjs_call(shen_extract$_vars, [Arg14902_0[1]]), shenjs_call(shen_extract$_vars, [Arg14902_0[2]])]);})
  : []))},
  1,
  [],
  "shen-extract_vars"];
shenjs_functions["shen_shen-extract_vars"] = shen_extract$_vars;






shen_extract$_free$_vars = [shen_type_func,
  function shen_user_lambda14905(Arg14904) {
  if (Arg14904.length < 2) return [shen_type_func, shen_user_lambda14905, 2, Arg14904];
  var Arg14904_0 = Arg14904[0], Arg14904_1 = Arg14904[1];
  return (((shenjs_is_type(Arg14904_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "protect"], Arg14904_1[1])) && (shenjs_is_type(Arg14904_1[2], shen_type_cons) && shenjs_empty$question$(Arg14904_1[2][2])))))
  ? []
  : (((shenjs_call(shen_variable$question$, [Arg14904_1]) && (!shenjs_call(shen_element$question$, [Arg14904_1, Arg14904_0]))))
  ? [shen_type_cons, Arg14904_1, []]
  : (((shenjs_is_type(Arg14904_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "lambda"], Arg14904_1[1])) && (shenjs_is_type(Arg14904_1[2], shen_type_cons) && (shenjs_is_type(Arg14904_1[2][2], shen_type_cons) && shenjs_empty$question$(Arg14904_1[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_extract$_free$_vars, [[shen_type_cons, Arg14904_1[2][1], Arg14904_0], Arg14904_1[2][2][1]]);})
  : (((shenjs_is_type(Arg14904_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg14904_1[1])) && (shenjs_is_type(Arg14904_1[2], shen_type_cons) && (shenjs_is_type(Arg14904_1[2][2], shen_type_cons) && (shenjs_is_type(Arg14904_1[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg14904_1[2][2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(shen_union, [shenjs_call(shen_extract$_free$_vars, [Arg14904_0, Arg14904_1[2][2][1]]), shenjs_call(shen_extract$_free$_vars, [[shen_type_cons, Arg14904_1[2][1], Arg14904_0], Arg14904_1[2][2][2][1]])]);})
  : ((shenjs_is_type(Arg14904_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_union, [shenjs_call(shen_extract$_free$_vars, [Arg14904_0, Arg14904_1[1]]), shenjs_call(shen_extract$_free$_vars, [Arg14904_0, Arg14904_1[2]])]);})
  : [])))))},
  2,
  [],
  "shen-extract_free_vars"];
shenjs_functions["shen_shen-extract_free_vars"] = shen_extract$_free$_vars;






shen_free$_variable$_warnings = [shen_type_func,
  function shen_user_lambda14907(Arg14906) {
  if (Arg14906.length < 2) return [shen_type_func, shen_user_lambda14907, 2, Arg14906];
  var Arg14906_0 = Arg14906[0], Arg14906_1 = Arg14906[1];
  return ((shenjs_empty$question$(Arg14906_1))
  ? [shen_type_symbol, "_"]
  : (function() {
  return shenjs_call_tail(shen_interror, ["error: the following variables are free in ~A: ~A", [shen_tuple, Arg14906_0, [shen_tuple, shenjs_call(shen_list$_variables, [Arg14906_1]), []]]]);}))},
  2,
  [],
  "shen-free_variable_warnings"];
shenjs_functions["shen_shen-free_variable_warnings"] = shen_free$_variable$_warnings;






shen_list$_variables = [shen_type_func,
  function shen_user_lambda14909(Arg14908) {
  if (Arg14908.length < 1) return [shen_type_func, shen_user_lambda14909, 1, Arg14908];
  var Arg14908_0 = Arg14908[0];
  return (((shenjs_is_type(Arg14908_0, shen_type_cons) && shenjs_empty$question$(Arg14908_0[2])))
  ? (shenjs_str(Arg14908_0[1]) + ".")
  : ((shenjs_is_type(Arg14908_0, shen_type_cons))
  ? (shenjs_str(Arg14908_0[1]) + (", " + shenjs_call(shen_list$_variables, [Arg14908_0[2]])))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-list_variables"]]);})))},
  1,
  [],
  "shen-list_variables"];
shenjs_functions["shen_shen-list_variables"] = shen_list$_variables;






shen_strip_protect = [shen_type_func,
  function shen_user_lambda14911(Arg14910) {
  if (Arg14910.length < 1) return [shen_type_func, shen_user_lambda14911, 1, Arg14910];
  var Arg14910_0 = Arg14910[0];
  return (((shenjs_is_type(Arg14910_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "protect"], Arg14910_0[1])) && (shenjs_is_type(Arg14910_0[2], shen_type_cons) && shenjs_empty$question$(Arg14910_0[2][2])))))
  ? Arg14910_0[2][1]
  : ((shenjs_is_type(Arg14910_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_strip_protect, [Arg14910_0[1]]), shenjs_call(shen_strip_protect, [Arg14910_0[2]])]
  : Arg14910_0))},
  1,
  [],
  "shen-strip-protect"];
shenjs_functions["shen_shen-strip-protect"] = shen_strip_protect;






shen_linearise = [shen_type_func,
  function shen_user_lambda14913(Arg14912) {
  if (Arg14912.length < 1) return [shen_type_func, shen_user_lambda14913, 1, Arg14912];
  var Arg14912_0 = Arg14912[0];
  return (((shenjs_is_type(Arg14912_0, shen_type_cons) && (shenjs_is_type(Arg14912_0[2], shen_type_cons) && shenjs_empty$question$(Arg14912_0[2][2]))))
  ? (function() {
  return shenjs_call_tail(shen_linearise$_help, [shenjs_call(shen_flatten, [Arg14912_0[1]]), Arg14912_0[1], Arg14912_0[2][1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-linearise"]]);}))},
  1,
  [],
  "shen-linearise"];
shenjs_functions["shen_shen-linearise"] = shen_linearise;






shen_flatten = [shen_type_func,
  function shen_user_lambda14915(Arg14914) {
  if (Arg14914.length < 1) return [shen_type_func, shen_user_lambda14915, 1, Arg14914];
  var Arg14914_0 = Arg14914[0];
  return ((shenjs_empty$question$(Arg14914_0))
  ? []
  : ((shenjs_is_type(Arg14914_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(shen_flatten, [Arg14914_0[1]]), shenjs_call(shen_flatten, [Arg14914_0[2]])]);})
  : [shen_type_cons, Arg14914_0, []]))},
  1,
  [],
  "shen-flatten"];
shenjs_functions["shen_shen-flatten"] = shen_flatten;






shen_linearise$_help = [shen_type_func,
  function shen_user_lambda14917(Arg14916) {
  if (Arg14916.length < 3) return [shen_type_func, shen_user_lambda14917, 3, Arg14916];
  var Arg14916_0 = Arg14916[0], Arg14916_1 = Arg14916[1], Arg14916_2 = Arg14916[2];
  var R0, R1;
  return ((shenjs_empty$question$(Arg14916_0))
  ? [shen_type_cons, Arg14916_1, [shen_type_cons, Arg14916_2, []]]
  : ((shenjs_is_type(Arg14916_0, shen_type_cons))
  ? (((shenjs_call(shen_variable$question$, [Arg14916_0[1]]) && shenjs_call(shen_element$question$, [Arg14916_0[1], Arg14916_0[2]])))
  ? ((R0 = shenjs_call(shen_gensym, [Arg14916_0[1]])),
  (R1 = [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, Arg14916_0[1], [shen_type_cons, R0, []]]], [shen_type_cons, Arg14916_2, []]]]),
  (R0 = shenjs_call(shen_linearise$_X, [Arg14916_0[1], R0, Arg14916_1])),
  (function() {
  return shenjs_call_tail(shen_linearise$_help, [Arg14916_0[2], R0, R1]);}))
  : (function() {
  return shenjs_call_tail(shen_linearise$_help, [Arg14916_0[2], Arg14916_1, Arg14916_2]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-linearise_help"]]);})))},
  3,
  [],
  "shen-linearise_help"];
shenjs_functions["shen_shen-linearise_help"] = shen_linearise$_help;






shen_linearise$_X = [shen_type_func,
  function shen_user_lambda14919(Arg14918) {
  if (Arg14918.length < 3) return [shen_type_func, shen_user_lambda14919, 3, Arg14918];
  var Arg14918_0 = Arg14918[0], Arg14918_1 = Arg14918[1], Arg14918_2 = Arg14918[2];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg14918_2, Arg14918_0)))
  ? Arg14918_1
  : ((shenjs_is_type(Arg14918_2, shen_type_cons))
  ? ((R0 = shenjs_call(shen_linearise$_X, [Arg14918_0, Arg14918_1, Arg14918_2[1]])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, Arg14918_2[1])))
  ? [shen_type_cons, Arg14918_2[1], shenjs_call(shen_linearise$_X, [Arg14918_0, Arg14918_1, Arg14918_2[2]])]
  : [shen_type_cons, R0, Arg14918_2[2]]))
  : Arg14918_2))},
  3,
  [],
  "shen-linearise_X"];
shenjs_functions["shen_shen-linearise_X"] = shen_linearise$_X;






shen_aritycheck = [shen_type_func,
  function shen_user_lambda14921(Arg14920) {
  if (Arg14920.length < 2) return [shen_type_func, shen_user_lambda14921, 2, Arg14920];
  var Arg14920_0 = Arg14920[0], Arg14920_1 = Arg14920[1];
  return (((shenjs_is_type(Arg14920_1, shen_type_cons) && (shenjs_is_type(Arg14920_1[1], shen_type_cons) && (shenjs_is_type(Arg14920_1[1][2], shen_type_cons) && (shenjs_empty$question$(Arg14920_1[1][2][2]) && shenjs_empty$question$(Arg14920_1[2]))))))
  ? (shenjs_call(shen_aritycheck_action, [Arg14920_1[1][2][1]]),
  (function() {
  return shenjs_call_tail(shen_aritycheck_name, [Arg14920_0, shenjs_call(shen_arity, [Arg14920_0]), shenjs_call(shen_length, [Arg14920_1[1][1]])]);}))
  : (((shenjs_is_type(Arg14920_1, shen_type_cons) && (shenjs_is_type(Arg14920_1[1], shen_type_cons) && (shenjs_is_type(Arg14920_1[1][2], shen_type_cons) && (shenjs_empty$question$(Arg14920_1[1][2][2]) && (shenjs_is_type(Arg14920_1[2], shen_type_cons) && (shenjs_is_type(Arg14920_1[2][1], shen_type_cons) && (shenjs_is_type(Arg14920_1[2][1][2], shen_type_cons) && shenjs_empty$question$(Arg14920_1[2][1][2][2])))))))))
  ? ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_length, [Arg14920_1[1][1]]), shenjs_call(shen_length, [Arg14920_1[2][1][1]]))))
  ? (shenjs_call(shen_aritycheck_action, [[shen_type_symbol, "Action"]]),
  (function() {
  return shenjs_call_tail(shen_aritycheck, [Arg14920_0, Arg14920_1[2]]);}))
  : (function() {
  return shenjs_call_tail(shen_interror, ["arity error in ~A~%", [shen_tuple, Arg14920_0, []]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-aritycheck"]]);})))},
  2,
  [],
  "shen-aritycheck"];
shenjs_functions["shen_shen-aritycheck"] = shen_aritycheck;






shen_aritycheck_name = [shen_type_func,
  function shen_user_lambda14923(Arg14922) {
  if (Arg14922.length < 3) return [shen_type_func, shen_user_lambda14923, 3, Arg14922];
  var Arg14922_0 = Arg14922[0], Arg14922_1 = Arg14922[1], Arg14922_2 = Arg14922[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(-1, Arg14922_1)))
  ? Arg14922_2
  : ((shenjs_unwind_tail(shenjs_$eq$(Arg14922_2, Arg14922_1)))
  ? Arg14922_2
  : (shenjs_call(shen_intoutput, ["~%warning: changing the arity of ~A can cause errors.~%", [shen_tuple, Arg14922_0, []]]),
  Arg14922_2)))},
  3,
  [],
  "shen-aritycheck-name"];
shenjs_functions["shen_shen-aritycheck-name"] = shen_aritycheck_name;






shen_aritycheck_action = [shen_type_func,
  function shen_user_lambda14925(Arg14924) {
  if (Arg14924.length < 1) return [shen_type_func, shen_user_lambda14925, 1, Arg14924];
  var Arg14924_0 = Arg14924[0];
  return ((shenjs_is_type(Arg14924_0, shen_type_cons))
  ? (shenjs_call(shen_aah, [Arg14924_0[1], Arg14924_0[2]]),
  (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda14927(Arg14926) {
  if (Arg14926.length < 1) return [shen_type_func, shen_user_lambda14927, 1, Arg14926];
  var Arg14926_0 = Arg14926[0];
  return (function() {
  return shenjs_call_tail(shen_aritycheck_action, [Arg14926_0]);})},
  1,
  []], Arg14924_0]);}))
  : [shen_type_symbol, "shen-skip"])},
  1,
  [],
  "shen-aritycheck-action"];
shenjs_functions["shen_shen-aritycheck-action"] = shen_aritycheck_action;






shen_aah = [shen_type_func,
  function shen_user_lambda14929(Arg14928) {
  if (Arg14928.length < 2) return [shen_type_func, shen_user_lambda14929, 2, Arg14928];
  var Arg14928_0 = Arg14928[0], Arg14928_1 = Arg14928[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_arity, [Arg14928_0])),
  (R1 = shenjs_call(shen_length, [Arg14928_1])),
  ((((R0 > -1) && (R1 > R0)))
  ? (function() {
  return shenjs_call_tail(shen_intoutput, ["warning: ~A might not like ~A argument~A.~%", [shen_tuple, Arg14928_0, [shen_tuple, R1, [shen_tuple, (((R1 > 1))
  ? "s"
  : ""), []]]]]);})
  : [shen_type_symbol, "shen-skip"]))},
  2,
  [],
  "shen-aah"];
shenjs_functions["shen_shen-aah"] = shen_aah;






shen_abstract$_rule = [shen_type_func,
  function shen_user_lambda14931(Arg14930) {
  if (Arg14930.length < 1) return [shen_type_func, shen_user_lambda14931, 1, Arg14930];
  var Arg14930_0 = Arg14930[0];
  return (((shenjs_is_type(Arg14930_0, shen_type_cons) && (shenjs_is_type(Arg14930_0[2], shen_type_cons) && shenjs_empty$question$(Arg14930_0[2][2]))))
  ? (function() {
  return shenjs_call_tail(shen_abstraction$_build, [Arg14930_0[1], Arg14930_0[2][1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-abstract_rule"]]);}))},
  1,
  [],
  "shen-abstract_rule"];
shenjs_functions["shen_shen-abstract_rule"] = shen_abstract$_rule;






shen_abstraction$_build = [shen_type_func,
  function shen_user_lambda14933(Arg14932) {
  if (Arg14932.length < 2) return [shen_type_func, shen_user_lambda14933, 2, Arg14932];
  var Arg14932_0 = Arg14932[0], Arg14932_1 = Arg14932[1];
  return ((shenjs_empty$question$(Arg14932_0))
  ? Arg14932_1
  : ((shenjs_is_type(Arg14932_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg14932_0[1], [shen_type_cons, shenjs_call(shen_abstraction$_build, [Arg14932_0[2], Arg14932_1]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-abstraction_build"]]);})))},
  2,
  [],
  "shen-abstraction_build"];
shenjs_functions["shen_shen-abstraction_build"] = shen_abstraction$_build;






shen_parameters = [shen_type_func,
  function shen_user_lambda14935(Arg14934) {
  if (Arg14934.length < 1) return [shen_type_func, shen_user_lambda14935, 1, Arg14934];
  var Arg14934_0 = Arg14934[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg14934_0)))
  ? []
  : [shen_type_cons, shenjs_call(shen_gensym, [[shen_type_symbol, "V"]]), shenjs_call(shen_parameters, [(Arg14934_0 - 1)])])},
  1,
  [],
  "shen-parameters"];
shenjs_functions["shen_shen-parameters"] = shen_parameters;






shen_application$_build = [shen_type_func,
  function shen_user_lambda14937(Arg14936) {
  if (Arg14936.length < 2) return [shen_type_func, shen_user_lambda14937, 2, Arg14936];
  var Arg14936_0 = Arg14936[0], Arg14936_1 = Arg14936[1];
  return ((shenjs_empty$question$(Arg14936_0))
  ? Arg14936_1
  : ((shenjs_is_type(Arg14936_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_application$_build, [Arg14936_0[2], [shen_type_cons, Arg14936_1, [shen_type_cons, Arg14936_0[1], []]]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-application_build"]]);})))},
  2,
  [],
  "shen-application_build"];
shenjs_functions["shen_shen-application_build"] = shen_application$_build;






shen_compile$_to$_kl = [shen_type_func,
  function shen_user_lambda14939(Arg14938) {
  if (Arg14938.length < 2) return [shen_type_func, shen_user_lambda14939, 2, Arg14938];
  var Arg14938_0 = Arg14938[0], Arg14938_1 = Arg14938[1];
  var R0;
  return (((shenjs_is_type(Arg14938_1, shen_type_cons) && (shenjs_is_type(Arg14938_1[2], shen_type_cons) && shenjs_empty$question$(Arg14938_1[2][2]))))
  ? (shenjs_call(shen_store_arity, [Arg14938_0, shenjs_call(shen_length, [Arg14938_1[1]])]),
  (R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda14941(Arg14940) {
  if (Arg14940.length < 1) return [shen_type_func, shen_user_lambda14941, 1, Arg14940];
  var Arg14940_0 = Arg14940[0];
  return (function() {
  return shenjs_call_tail(shen_reduce, [Arg14940_0]);})},
  1,
  []], Arg14938_1[2][1]])),
  (R0 = shenjs_call(shen_cond_expression, [Arg14938_0, Arg14938_1[1], R0])),
  (R0 = [shen_type_cons, [shen_type_symbol, "defun"], [shen_type_cons, Arg14938_0, [shen_type_cons, Arg14938_1[1], [shen_type_cons, R0, []]]]]),
  R0)
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-compile_to_kl"]]);}))},
  2,
  [],
  "shen-compile_to_kl"];
shenjs_functions["shen_shen-compile_to_kl"] = shen_compile$_to$_kl;






shen_store_arity = [shen_type_func,
  function shen_user_lambda14943(Arg14942) {
  if (Arg14942.length < 2) return [shen_type_func, shen_user_lambda14943, 2, Arg14942];
  var Arg14942_0 = Arg14942[0], Arg14942_1 = Arg14942[1];
  return (((shenjs_globals["shen_shen-*installing-kl*"]))
  ? [shen_type_symbol, "shen-skip"]
  : (function() {
  return shenjs_call_tail(shen_put, [Arg14942_0, [shen_type_symbol, "arity"], Arg14942_1, (shenjs_globals["shen_shen-*property-vector*"])]);}))},
  2,
  [],
  "shen-store-arity"];
shenjs_functions["shen_shen-store-arity"] = shen_store_arity;






shen_reduce = [shen_type_func,
  function shen_user_lambda14945(Arg14944) {
  if (Arg14944.length < 1) return [shen_type_func, shen_user_lambda14945, 1, Arg14944];
  var Arg14944_0 = Arg14944[0];
  var R0;
  return ((shenjs_globals["shen_shen-*teststack*"] = []),
  (R0 = shenjs_call(shen_reduce$_help, [Arg14944_0])),
  [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-tests"], shenjs_call(shen_reverse, [(shenjs_globals["shen_shen-*teststack*"])])], [shen_type_cons, R0, []]])},
  1,
  [],
  "shen-reduce"];
shenjs_functions["shen_shen-reduce"] = shen_reduce;






shen_reduce$_help = [shen_type_func,
  function shen_user_lambda14947(Arg14946) {
  if (Arg14946.length < 1) return [shen_type_func, shen_user_lambda14947, 1, Arg14946];
  var Arg14946_0 = Arg14946[0];
  var R0;
  return (((shenjs_is_type(Arg14946_0, shen_type_cons) && (shenjs_is_type(Arg14946_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg14946_0[1][1])) && (shenjs_is_type(Arg14946_0[1][2], shen_type_cons) && (shenjs_is_type(Arg14946_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg14946_0[1][2][1][1])) && (shenjs_is_type(Arg14946_0[1][2][1][2], shen_type_cons) && (shenjs_is_type(Arg14946_0[1][2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg14946_0[1][2][1][2][2][2]) && (shenjs_is_type(Arg14946_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg14946_0[1][2][2][2]) && (shenjs_is_type(Arg14946_0[2], shen_type_cons) && shenjs_empty$question$(Arg14946_0[2][2]))))))))))))))
  ? (shenjs_call(shen_add$_test, [[shen_type_cons, [shen_type_symbol, "cons?"], Arg14946_0[2]]]),
  (R0 = [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg14946_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg14946_0[1][2][1][2][2][1], [shen_type_cons, shenjs_call(shen_ebr, [Arg14946_0[2][1], Arg14946_0[1][2][1], Arg14946_0[1][2][2][1]]), []]]], []]]]),
  (R0 = [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hd"], Arg14946_0[2]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tl"], Arg14946_0[2]], []]]),
  (function() {
  return shenjs_call_tail(shen_reduce$_help, [R0]);}))
  : (((shenjs_is_type(Arg14946_0, shen_type_cons) && (shenjs_is_type(Arg14946_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg14946_0[1][1])) && (shenjs_is_type(Arg14946_0[1][2], shen_type_cons) && (shenjs_is_type(Arg14946_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@p"], Arg14946_0[1][2][1][1])) && (shenjs_is_type(Arg14946_0[1][2][1][2], shen_type_cons) && (shenjs_is_type(Arg14946_0[1][2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg14946_0[1][2][1][2][2][2]) && (shenjs_is_type(Arg14946_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg14946_0[1][2][2][2]) && (shenjs_is_type(Arg14946_0[2], shen_type_cons) && shenjs_empty$question$(Arg14946_0[2][2]))))))))))))))
  ? (shenjs_call(shen_add$_test, [[shen_type_cons, [shen_type_symbol, "tuple?"], Arg14946_0[2]]]),
  (R0 = [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg14946_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg14946_0[1][2][1][2][2][1], [shen_type_cons, shenjs_call(shen_ebr, [Arg14946_0[2][1], Arg14946_0[1][2][1], Arg14946_0[1][2][2][1]]), []]]], []]]]),
  (R0 = [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], Arg14946_0[2]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "snd"], Arg14946_0[2]], []]]),
  (function() {
  return shenjs_call_tail(shen_reduce$_help, [R0]);}))
  : (((shenjs_is_type(Arg14946_0, shen_type_cons) && (shenjs_is_type(Arg14946_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg14946_0[1][1])) && (shenjs_is_type(Arg14946_0[1][2], shen_type_cons) && (shenjs_is_type(Arg14946_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@v"], Arg14946_0[1][2][1][1])) && (shenjs_is_type(Arg14946_0[1][2][1][2], shen_type_cons) && (shenjs_is_type(Arg14946_0[1][2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg14946_0[1][2][1][2][2][2]) && (shenjs_is_type(Arg14946_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg14946_0[1][2][2][2]) && (shenjs_is_type(Arg14946_0[2], shen_type_cons) && shenjs_empty$question$(Arg14946_0[2][2]))))))))))))))
  ? (shenjs_call(shen_add$_test, [[shen_type_cons, [shen_type_symbol, "shen-+vector?"], Arg14946_0[2]]]),
  (R0 = [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg14946_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg14946_0[1][2][1][2][2][1], [shen_type_cons, shenjs_call(shen_ebr, [Arg14946_0[2][1], Arg14946_0[1][2][1], Arg14946_0[1][2][2][1]]), []]]], []]]]),
  (R0 = [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hdv"], Arg14946_0[2]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tlv"], Arg14946_0[2]], []]]),
  (function() {
  return shenjs_call_tail(shen_reduce$_help, [R0]);}))
  : (((shenjs_is_type(Arg14946_0, shen_type_cons) && (shenjs_is_type(Arg14946_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg14946_0[1][1])) && (shenjs_is_type(Arg14946_0[1][2], shen_type_cons) && (shenjs_is_type(Arg14946_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], Arg14946_0[1][2][1][1])) && (shenjs_is_type(Arg14946_0[1][2][1][2], shen_type_cons) && (shenjs_is_type(Arg14946_0[1][2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg14946_0[1][2][1][2][2][2]) && (shenjs_is_type(Arg14946_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg14946_0[1][2][2][2]) && (shenjs_is_type(Arg14946_0[2], shen_type_cons) && shenjs_empty$question$(Arg14946_0[2][2]))))))))))))))
  ? (shenjs_call(shen_add$_test, [[shen_type_cons, [shen_type_symbol, "shen-+string?"], Arg14946_0[2]]]),
  (R0 = [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg14946_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, Arg14946_0[1][2][1][2][2][1], [shen_type_cons, shenjs_call(shen_ebr, [Arg14946_0[2][1], Arg14946_0[1][2][1], Arg14946_0[1][2][2][1]]), []]]], []]]]),
  (R0 = [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "pos"], [shen_type_cons, Arg14946_0[2][1], [shen_type_cons, 0, []]]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tlstr"], Arg14946_0[2]], []]]),
  (function() {
  return shenjs_call_tail(shen_reduce$_help, [R0]);}))
  : (((shenjs_is_type(Arg14946_0, shen_type_cons) && (shenjs_is_type(Arg14946_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg14946_0[1][1])) && (shenjs_is_type(Arg14946_0[1][2], shen_type_cons) && (shenjs_is_type(Arg14946_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg14946_0[1][2][2][2]) && (shenjs_is_type(Arg14946_0[2], shen_type_cons) && (shenjs_empty$question$(Arg14946_0[2][2]) && (!shenjs_call(shen_variable$question$, [Arg14946_0[1][2][1]])))))))))))
  ? (shenjs_call(shen_add$_test, [[shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, Arg14946_0[1][2][1], Arg14946_0[2]]]]),
  (function() {
  return shenjs_call_tail(shen_reduce$_help, [Arg14946_0[1][2][2][1]]);}))
  : (((shenjs_is_type(Arg14946_0, shen_type_cons) && (shenjs_is_type(Arg14946_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg14946_0[1][1])) && (shenjs_is_type(Arg14946_0[1][2], shen_type_cons) && (shenjs_is_type(Arg14946_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg14946_0[1][2][2][2]) && (shenjs_is_type(Arg14946_0[2], shen_type_cons) && shenjs_empty$question$(Arg14946_0[2][2])))))))))
  ? (function() {
  return shenjs_call_tail(shen_reduce$_help, [shenjs_call(shen_ebr, [Arg14946_0[2][1], Arg14946_0[1][2][1], Arg14946_0[1][2][2][1]])]);})
  : (((shenjs_is_type(Arg14946_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "where"], Arg14946_0[1])) && (shenjs_is_type(Arg14946_0[2], shen_type_cons) && (shenjs_is_type(Arg14946_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg14946_0[2][2][2]))))))
  ? (shenjs_call(shen_add$_test, [Arg14946_0[2][1]]),
  (function() {
  return shenjs_call_tail(shen_reduce$_help, [Arg14946_0[2][2][1]]);}))
  : (((shenjs_is_type(Arg14946_0, shen_type_cons) && (shenjs_is_type(Arg14946_0[2], shen_type_cons) && shenjs_empty$question$(Arg14946_0[2][2]))))
  ? ((R0 = shenjs_call(shen_reduce$_help, [Arg14946_0[1]])),
  ((shenjs_unwind_tail(shenjs_$eq$(Arg14946_0[1], R0)))
  ? Arg14946_0
  : (function() {
  return shenjs_call_tail(shen_reduce$_help, [[shen_type_cons, R0, Arg14946_0[2]]]);})))
  : Arg14946_0))))))))},
  1,
  [],
  "shen-reduce_help"];
shenjs_functions["shen_shen-reduce_help"] = shen_reduce$_help;






shen_$plus$string$question$ = [shen_type_func,
  function shen_user_lambda14949(Arg14948) {
  if (Arg14948.length < 1) return [shen_type_func, shen_user_lambda14949, 1, Arg14948];
  var Arg14948_0 = Arg14948[0];
  return ((shenjs_unwind_tail(shenjs_$eq$("", Arg14948_0)))
  ? false
  : (typeof(Arg14948_0) == 'string'))},
  1,
  [],
  "shen-+string?"];
shenjs_functions["shen_shen-+string?"] = shen_$plus$string$question$;






shen_$plus$vector = [shen_type_func,
  function shen_user_lambda14951(Arg14950) {
  if (Arg14950.length < 1) return [shen_type_func, shen_user_lambda14951, 1, Arg14950];
  var Arg14950_0 = Arg14950[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg14950_0, shenjs_vector(0))))
  ? false
  : (function() {
  return shenjs_vector$question$(Arg14950_0);}))},
  1,
  [],
  "shen-+vector"];
shenjs_functions["shen_shen-+vector"] = shen_$plus$vector;






shen_ebr = [shen_type_func,
  function shen_user_lambda14953(Arg14952) {
  if (Arg14952.length < 3) return [shen_type_func, shen_user_lambda14953, 3, Arg14952];
  var Arg14952_0 = Arg14952[0], Arg14952_1 = Arg14952[1], Arg14952_2 = Arg14952[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg14952_2, Arg14952_1)))
  ? Arg14952_0
  : (((shenjs_is_type(Arg14952_2, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg14952_2[1])) && (shenjs_is_type(Arg14952_2[2], shen_type_cons) && (shenjs_is_type(Arg14952_2[2][2], shen_type_cons) && (shenjs_empty$question$(Arg14952_2[2][2][2]) && (shenjs_call(shen_occurrences, [Arg14952_1, Arg14952_2[2][1]]) > 0)))))))
  ? Arg14952_2
  : (((shenjs_is_type(Arg14952_2, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg14952_2[1])) && (shenjs_is_type(Arg14952_2[2], shen_type_cons) && (shenjs_is_type(Arg14952_2[2][2], shen_type_cons) && (shenjs_is_type(Arg14952_2[2][2][2], shen_type_cons) && (shenjs_empty$question$(Arg14952_2[2][2][2][2]) && shenjs_unwind_tail(shenjs_$eq$(Arg14952_2[2][1], Arg14952_1)))))))))
  ? [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, Arg14952_2[2][1], [shen_type_cons, shenjs_call(shen_ebr, [Arg14952_0, Arg14952_2[2][1], Arg14952_2[2][2][1]]), Arg14952_2[2][2][2]]]]
  : ((shenjs_is_type(Arg14952_2, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_ebr, [Arg14952_0, Arg14952_1, Arg14952_2[1]]), shenjs_call(shen_ebr, [Arg14952_0, Arg14952_1, Arg14952_2[2]])]
  : Arg14952_2))))},
  3,
  [],
  "shen-ebr"];
shenjs_functions["shen_shen-ebr"] = shen_ebr;






shen_add$_test = [shen_type_func,
  function shen_user_lambda14955(Arg14954) {
  if (Arg14954.length < 1) return [shen_type_func, shen_user_lambda14955, 1, Arg14954];
  var Arg14954_0 = Arg14954[0];
  return (shenjs_globals["shen_shen-*teststack*"] = [shen_type_cons, Arg14954_0, (shenjs_globals["shen_shen-*teststack*"])])},
  1,
  [],
  "shen-add_test"];
shenjs_functions["shen_shen-add_test"] = shen_add$_test;






shen_cond_expression = [shen_type_func,
  function shen_user_lambda14957(Arg14956) {
  if (Arg14956.length < 3) return [shen_type_func, shen_user_lambda14957, 3, Arg14956];
  var Arg14956_0 = Arg14956[0], Arg14956_1 = Arg14956[1], Arg14956_2 = Arg14956[2];
  var R0;
  return ((R0 = shenjs_call(shen_err_condition, [Arg14956_0])),
  (R0 = shenjs_call(shen_case_form, [Arg14956_2, R0])),
  (R0 = shenjs_call(shen_encode_choices, [R0, Arg14956_0])),
  (function() {
  return shenjs_call_tail(shen_cond_form, [R0]);}))},
  3,
  [],
  "shen-cond-expression"];
shenjs_functions["shen_shen-cond-expression"] = shen_cond_expression;






shen_cond_form = [shen_type_func,
  function shen_user_lambda14959(Arg14958) {
  if (Arg14958.length < 1) return [shen_type_func, shen_user_lambda14959, 1, Arg14958];
  var Arg14958_0 = Arg14958[0];
  return (((shenjs_is_type(Arg14958_0, shen_type_cons) && (shenjs_is_type(Arg14958_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg14958_0[1][1])) && (shenjs_is_type(Arg14958_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg14958_0[1][2][2]))))))
  ? Arg14958_0[1][2][1]
  : [shen_type_cons, [shen_type_symbol, "cond"], Arg14958_0])},
  1,
  [],
  "shen-cond-form"];
shenjs_functions["shen_shen-cond-form"] = shen_cond_form;






shen_encode_choices = [shen_type_func,
  function shen_user_lambda14961(Arg14960) {
  if (Arg14960.length < 2) return [shen_type_func, shen_user_lambda14961, 2, Arg14960];
  var Arg14960_0 = Arg14960[0], Arg14960_1 = Arg14960[1];
  return ((shenjs_empty$question$(Arg14960_0))
  ? []
  : (((shenjs_is_type(Arg14960_0, shen_type_cons) && (shenjs_is_type(Arg14960_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg14960_0[1][1])) && (shenjs_is_type(Arg14960_0[1][2], shen_type_cons) && (shenjs_is_type(Arg14960_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-choicepoint!"], Arg14960_0[1][2][1][1])) && (shenjs_is_type(Arg14960_0[1][2][1][2], shen_type_cons) && (shenjs_empty$question$(Arg14960_0[1][2][1][2][2]) && (shenjs_empty$question$(Arg14960_0[1][2][2]) && shenjs_empty$question$(Arg14960_0[2])))))))))))
  ? [shen_type_cons, [shen_type_cons, true, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg14960_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]]], [shen_type_cons, (((shenjs_globals["shen_shen-*installing-kl*"]))
  ? [shen_type_cons, [shen_type_symbol, "shen-sys-error"], [shen_type_cons, Arg14960_1, []]]
  : [shen_type_cons, [shen_type_symbol, "shen-f_error"], [shen_type_cons, Arg14960_1, []]]), [shen_type_cons, [shen_type_symbol, "Result"], []]]]], []]]]], []]], []]
  : (((shenjs_is_type(Arg14960_0, shen_type_cons) && (shenjs_is_type(Arg14960_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg14960_0[1][1])) && (shenjs_is_type(Arg14960_0[1][2], shen_type_cons) && (shenjs_is_type(Arg14960_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-choicepoint!"], Arg14960_0[1][2][1][1])) && (shenjs_is_type(Arg14960_0[1][2][1][2], shen_type_cons) && (shenjs_empty$question$(Arg14960_0[1][2][1][2][2]) && shenjs_empty$question$(Arg14960_0[1][2][2]))))))))))
  ? [shen_type_cons, [shen_type_cons, true, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg14960_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]]], [shen_type_cons, shenjs_call(shen_cond_form, [shenjs_call(shen_encode_choices, [Arg14960_0[2], Arg14960_1])]), [shen_type_cons, [shen_type_symbol, "Result"], []]]]], []]]]], []]], []]
  : (((shenjs_is_type(Arg14960_0, shen_type_cons) && (shenjs_is_type(Arg14960_0[1], shen_type_cons) && (shenjs_is_type(Arg14960_0[1][2], shen_type_cons) && (shenjs_is_type(Arg14960_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-choicepoint!"], Arg14960_0[1][2][1][1])) && (shenjs_is_type(Arg14960_0[1][2][1][2], shen_type_cons) && (shenjs_empty$question$(Arg14960_0[1][2][1][2][2]) && shenjs_empty$question$(Arg14960_0[1][2][2])))))))))
  ? [shen_type_cons, [shen_type_cons, true, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Freeze"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "freeze"], [shen_type_cons, shenjs_call(shen_cond_form, [shenjs_call(shen_encode_choices, [Arg14960_0[2], Arg14960_1])]), []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, Arg14960_0[1][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg14960_0[1][2][1][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, [shen_type_symbol, "Freeze"], []]], [shen_type_cons, [shen_type_symbol, "Result"], []]]]], []]]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, [shen_type_symbol, "Freeze"], []]], []]]]], []]]]], []]], []]
  : (((shenjs_is_type(Arg14960_0, shen_type_cons) && (shenjs_is_type(Arg14960_0[1], shen_type_cons) && (shenjs_is_type(Arg14960_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg14960_0[1][2][2])))))
  ? [shen_type_cons, Arg14960_0[1], shenjs_call(shen_encode_choices, [Arg14960_0[2], Arg14960_1])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-encode-choices"]]);}))))))},
  2,
  [],
  "shen-encode-choices"];
shenjs_functions["shen_shen-encode-choices"] = shen_encode_choices;






shen_case_form = [shen_type_func,
  function shen_user_lambda14963(Arg14962) {
  if (Arg14962.length < 2) return [shen_type_func, shen_user_lambda14963, 2, Arg14962];
  var Arg14962_0 = Arg14962[0], Arg14962_1 = Arg14962[1];
  return ((shenjs_empty$question$(Arg14962_0))
  ? [shen_type_cons, Arg14962_1, []]
  : (((shenjs_is_type(Arg14962_0, shen_type_cons) && (shenjs_is_type(Arg14962_0[1], shen_type_cons) && (shenjs_is_type(Arg14962_0[1][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-tests"], Arg14962_0[1][1][1])) && (shenjs_empty$question$(Arg14962_0[1][1][2]) && (shenjs_is_type(Arg14962_0[1][2], shen_type_cons) && (shenjs_is_type(Arg14962_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-choicepoint!"], Arg14962_0[1][2][1][1])) && (shenjs_is_type(Arg14962_0[1][2][1][2], shen_type_cons) && (shenjs_empty$question$(Arg14962_0[1][2][1][2][2]) && shenjs_empty$question$(Arg14962_0[1][2][2]))))))))))))
  ? [shen_type_cons, [shen_type_cons, true, Arg14962_0[1][2]], shenjs_call(shen_case_form, [Arg14962_0[2], Arg14962_1])]
  : (((shenjs_is_type(Arg14962_0, shen_type_cons) && (shenjs_is_type(Arg14962_0[1], shen_type_cons) && (shenjs_is_type(Arg14962_0[1][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-tests"], Arg14962_0[1][1][1])) && (shenjs_empty$question$(Arg14962_0[1][1][2]) && (shenjs_is_type(Arg14962_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg14962_0[1][2][2]))))))))
  ? [shen_type_cons, [shen_type_cons, true, Arg14962_0[1][2]], []]
  : (((shenjs_is_type(Arg14962_0, shen_type_cons) && (shenjs_is_type(Arg14962_0[1], shen_type_cons) && (shenjs_is_type(Arg14962_0[1][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-tests"], Arg14962_0[1][1][1])) && (shenjs_is_type(Arg14962_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg14962_0[1][2][2])))))))
  ? [shen_type_cons, [shen_type_cons, shenjs_call(shen_embed_and, [Arg14962_0[1][1][2]]), Arg14962_0[1][2]], shenjs_call(shen_case_form, [Arg14962_0[2], Arg14962_1])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-case-form"]]);})))))},
  2,
  [],
  "shen-case-form"];
shenjs_functions["shen_shen-case-form"] = shen_case_form;






shen_embed_and = [shen_type_func,
  function shen_user_lambda14965(Arg14964) {
  if (Arg14964.length < 1) return [shen_type_func, shen_user_lambda14965, 1, Arg14964];
  var Arg14964_0 = Arg14964[0];
  return (((shenjs_is_type(Arg14964_0, shen_type_cons) && shenjs_empty$question$(Arg14964_0[2])))
  ? Arg14964_0[1]
  : ((shenjs_is_type(Arg14964_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, Arg14964_0[1], [shen_type_cons, shenjs_call(shen_embed_and, [Arg14964_0[2]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-embed-and"]]);})))},
  1,
  [],
  "shen-embed-and"];
shenjs_functions["shen_shen-embed-and"] = shen_embed_and;






shen_err_condition = [shen_type_func,
  function shen_user_lambda14967(Arg14966) {
  if (Arg14966.length < 1) return [shen_type_func, shen_user_lambda14967, 1, Arg14966];
  var Arg14966_0 = Arg14966[0];
  return (((shenjs_globals["shen_shen-*installing-kl*"]))
  ? [shen_type_cons, true, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-sys-error"], [shen_type_cons, Arg14966_0, []]], []]]
  : [shen_type_cons, true, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-f_error"], [shen_type_cons, Arg14966_0, []]], []]])},
  1,
  [],
  "shen-err-condition"];
shenjs_functions["shen_shen-err-condition"] = shen_err_condition;






shen_sys_error = [shen_type_func,
  function shen_user_lambda14969(Arg14968) {
  if (Arg14968.length < 1) return [shen_type_func, shen_user_lambda14969, 1, Arg14968];
  var Arg14968_0 = Arg14968[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["system function ~A: unexpected argument~%", [shen_tuple, Arg14968_0, []]]);})},
  1,
  [],
  "shen-sys-error"];
shenjs_functions["shen_shen-sys-error"] = shen_sys_error;


















shen_eval = [shen_type_func,
  function shen_user_lambda15682(Arg15681) {
  if (Arg15681.length < 1) return [shen_type_func, shen_user_lambda15682, 1, Arg15681];
  var Arg15681_0 = Arg15681[0];
  var R0;
  return ((R0 = shenjs_call(shen_walk, [[shen_type_func,
  function shen_user_lambda15684(Arg15683) {
  if (Arg15683.length < 1) return [shen_type_func, shen_user_lambda15684, 1, Arg15683];
  var Arg15683_0 = Arg15683[0];
  return (function() {
  return shenjs_call_tail(shen_macroexpand, [Arg15683_0]);})},
  1,
  []], Arg15681_0])),
  ((shenjs_call(shen_packaged$question$, [R0]))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda15686(Arg15685) {
  if (Arg15685.length < 1) return [shen_type_func, shen_user_lambda15686, 1, Arg15685];
  var Arg15685_0 = Arg15685[0];
  return (function() {
  return shenjs_call_tail(shen_eval_without_macros, [Arg15685_0]);})},
  1,
  []], shenjs_call(shen_package_contents, [R0])]);})
  : (function() {
  return shenjs_call_tail(shen_eval_without_macros, [R0]);})))},
  1,
  [],
  "eval"];
shenjs_functions["shen_eval"] = shen_eval;






shen_eval_without_macros = [shen_type_func,
  function shen_user_lambda15688(Arg15687) {
  if (Arg15687.length < 1) return [shen_type_func, shen_user_lambda15688, 1, Arg15687];
  var Arg15687_0 = Arg15687[0];
  return (function() {
  return shenjs_eval_kl(shenjs_call(shen_elim_define, [shenjs_call(shen_proc_input$plus$, [Arg15687_0])]));})},
  1,
  [],
  "shen-eval-without-macros"];
shenjs_functions["shen_shen-eval-without-macros"] = shen_eval_without_macros;






shen_proc_input$plus$ = [shen_type_func,
  function shen_user_lambda15690(Arg15689) {
  if (Arg15689.length < 1) return [shen_type_func, shen_user_lambda15690, 1, Arg15689];
  var Arg15689_0 = Arg15689[0];
  return (((shenjs_is_type(Arg15689_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "input+"], Arg15689_0[1])) && (shenjs_is_type(Arg15689_0[2], shen_type_cons) && (shenjs_is_type(Arg15689_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15689_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "input+"], [shen_type_cons, Arg15689_0[2][1], [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg15689_0[2][2][1]]), []]]]
  : ((shenjs_is_type(Arg15689_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda15692(Arg15691) {
  if (Arg15691.length < 1) return [shen_type_func, shen_user_lambda15692, 1, Arg15691];
  var Arg15691_0 = Arg15691[0];
  return (function() {
  return shenjs_call_tail(shen_proc_input$plus$, [Arg15691_0]);})},
  1,
  []], Arg15689_0]);})
  : Arg15689_0))},
  1,
  [],
  "shen-proc-input+"];
shenjs_functions["shen_shen-proc-input+"] = shen_proc_input$plus$;






shen_elim_define = [shen_type_func,
  function shen_user_lambda15694(Arg15693) {
  if (Arg15693.length < 1) return [shen_type_func, shen_user_lambda15694, 1, Arg15693];
  var Arg15693_0 = Arg15693[0];
  return (((shenjs_is_type(Arg15693_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "define"], Arg15693_0[1])) && shenjs_is_type(Arg15693_0[2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_shen_$gt$kl, [Arg15693_0[2][1], Arg15693_0[2][2]]);})
  : ((shenjs_is_type(Arg15693_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda15696(Arg15695) {
  if (Arg15695.length < 1) return [shen_type_func, shen_user_lambda15696, 1, Arg15695];
  var Arg15695_0 = Arg15695[0];
  return (function() {
  return shenjs_call_tail(shen_elim_define, [Arg15695_0]);})},
  1,
  []], Arg15693_0]);})
  : Arg15693_0))},
  1,
  [],
  "shen-elim-define"];
shenjs_functions["shen_shen-elim-define"] = shen_elim_define;






shen_packaged$question$ = [shen_type_func,
  function shen_user_lambda15698(Arg15697) {
  if (Arg15697.length < 1) return [shen_type_func, shen_user_lambda15698, 1, Arg15697];
  var Arg15697_0 = Arg15697[0];
  return (((shenjs_is_type(Arg15697_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg15697_0[1])) && (shenjs_is_type(Arg15697_0[2], shen_type_cons) && shenjs_is_type(Arg15697_0[2][2], shen_type_cons)))))
  ? true
  : false)},
  1,
  [],
  "shen-packaged?"];
shenjs_functions["shen_shen-packaged?"] = shen_packaged$question$;






shen_external = [shen_type_func,
  function shen_user_lambda15700(Arg15699) {
  if (Arg15699.length < 1) return [shen_type_func, shen_user_lambda15700, 1, Arg15699];
  var Arg15699_0 = Arg15699[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg15699_0, [shen_type_symbol, "shen-external-symbols"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda15702(Arg15701) {
  if (Arg15701.length < 1) return [shen_type_func, shen_user_lambda15702, 1, Arg15701];
  var Arg15701_0 = Arg15701[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["package ~A has not been used.~", []]);})},
  1,
  []]);})},
  1,
  [],
  "external"];
shenjs_functions["shen_external"] = shen_external;






shen_package_contents = [shen_type_func,
  function shen_user_lambda15704(Arg15703) {
  if (Arg15703.length < 1) return [shen_type_func, shen_user_lambda15704, 1, Arg15703];
  var Arg15703_0 = Arg15703[0];
  return (((shenjs_is_type(Arg15703_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg15703_0[1])) && (shenjs_is_type(Arg15703_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "null"], Arg15703_0[2][1])) && shenjs_is_type(Arg15703_0[2][2], shen_type_cons))))))
  ? Arg15703_0[2][2][2]
  : (((shenjs_is_type(Arg15703_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg15703_0[1])) && (shenjs_is_type(Arg15703_0[2], shen_type_cons) && shenjs_is_type(Arg15703_0[2][2], shen_type_cons)))))
  ? (function() {
  return shenjs_call_tail(shen_packageh, [Arg15703_0[2][1], Arg15703_0[2][2][1], [shen_type_symbol, "Code"]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-package-contents"]]);})))},
  1,
  [],
  "shen-package-contents"];
shenjs_functions["shen_shen-package-contents"] = shen_package_contents;






shen_walk = [shen_type_func,
  function shen_user_lambda15706(Arg15705) {
  if (Arg15705.length < 2) return [shen_type_func, shen_user_lambda15706, 2, Arg15705];
  var Arg15705_0 = Arg15705[0], Arg15705_1 = Arg15705[1];
  return ((shenjs_is_type(Arg15705_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(Arg15705_0, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15708(Arg15707) {
  if (Arg15707.length < 2) return [shen_type_func, shen_user_lambda15708, 2, Arg15707];
  var Arg15707_0 = Arg15707[0], Arg15707_1 = Arg15707[1];
  return (function() {
  return shenjs_call_tail(shen_walk, [Arg15707_0, Arg15707_1]);})},
  2,
  [Arg15705_0]], Arg15705_1])]);})
  : (function() {
  return shenjs_call_tail(Arg15705_0, [Arg15705_1]);}))},
  2,
  [],
  "shen-walk"];
shenjs_functions["shen_shen-walk"] = shen_walk;






shen_compile = [shen_type_func,
  function shen_user_lambda15710(Arg15709) {
  if (Arg15709.length < 3) return [shen_type_func, shen_user_lambda15710, 3, Arg15709];
  var Arg15709_0 = Arg15709[0], Arg15709_1 = Arg15709[1], Arg15709_2 = Arg15709[2];
  var R0;
  return ((R0 = shenjs_call(Arg15709_0, [[shen_tuple, Arg15709_1, []]])),
  (((shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0)) || (!shenjs_empty$question$(shenjs_call(shen_fst, [R0])))))
  ? (function() {
  return shenjs_call_tail(shen_compile_error, [R0, Arg15709_2]);})
  : (function() {
  return shenjs_call_tail(shen_snd, [R0]);})))},
  3,
  [],
  "compile"];
shenjs_functions["shen_compile"] = shen_compile;






shen_compile_error = [shen_type_func,
  function shen_user_lambda15712(Arg15711) {
  if (Arg15711.length < 2) return [shen_type_func, shen_user_lambda15712, 2, Arg15711];
  var Arg15711_0 = Arg15711[0], Arg15711_1 = Arg15711[1];
  return ((shenjs_empty$question$(Arg15711_1))
  ? shen_fail_obj
  : (((shenjs_is_type(Arg15711_0, shen_tuple) && shenjs_is_type(shenjs_call(shen_fst, [Arg15711_0]), shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(Arg15711_1, [shenjs_call(shen_fst, [Arg15711_0])]);})
  : (function() {
  return shenjs_call_tail(shen_interror, ["syntax error~%", []]);})))},
  2,
  [],
  "shen-compile-error"];
shenjs_functions["shen_shen-compile-error"] = shen_compile_error;






shen_$lt$e$gt$ = [shen_type_func,
  function shen_user_lambda15714(Arg15713) {
  if (Arg15713.length < 1) return [shen_type_func, shen_user_lambda15714, 1, Arg15713];
  var Arg15713_0 = Arg15713[0];
  return ((shenjs_is_type(Arg15713_0, shen_tuple))
  ? [shen_tuple, shenjs_call(shen_fst, [Arg15713_0]), []]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "<e>"]]);}))},
  1,
  [],
  "<e>"];
shenjs_functions["shen_<e>"] = shen_$lt$e$gt$;






shen_fail_if = [shen_type_func,
  function shen_user_lambda15716(Arg15715) {
  if (Arg15715.length < 2) return [shen_type_func, shen_user_lambda15716, 2, Arg15715];
  var Arg15715_0 = Arg15715[0], Arg15715_1 = Arg15715[1];
  return ((shenjs_call(Arg15715_0, [Arg15715_1]))
  ? shen_fail_obj
  : Arg15715_1)},
  2,
  [],
  "fail-if"];
shenjs_functions["shen_fail-if"] = shen_fail_if;






shen_$at$s = [shen_type_func,
  function shen_user_lambda15718(Arg15717) {
  if (Arg15717.length < 2) return [shen_type_func, shen_user_lambda15718, 2, Arg15717];
  var Arg15717_0 = Arg15717[0], Arg15717_1 = Arg15717[1];
  return (Arg15717_0 + Arg15717_1)},
  2,
  [],
  "@s"];
shenjs_functions["shen_@s"] = shen_$at$s;






shen_tc$question$ = [shen_type_func,
  function shen_user_lambda15720(Arg15719) {
  if (Arg15719.length < 1) return [shen_type_func, shen_user_lambda15720, 1, Arg15719];
  var Arg15719_0 = Arg15719[0];
  return (shenjs_globals["shen_shen-*tc*"])},
  1,
  [],
  "tc?"];
shenjs_functions["shen_tc?"] = shen_tc$question$;






shen_ps = [shen_type_func,
  function shen_user_lambda15722(Arg15721) {
  if (Arg15721.length < 1) return [shen_type_func, shen_user_lambda15722, 1, Arg15721];
  var Arg15721_0 = Arg15721[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg15721_0, [shen_type_symbol, "shen-source"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda15724(Arg15723) {
  if (Arg15723.length < 2) return [shen_type_func, shen_user_lambda15724, 2, Arg15723];
  var Arg15723_0 = Arg15723[0], Arg15723_1 = Arg15723[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["~A not found.~%", [shen_tuple, Arg15723_0, []]]);})},
  2,
  [Arg15721_0]]);})},
  1,
  [],
  "ps"];
shenjs_functions["shen_ps"] = shen_ps;






shen_explode = [shen_type_func,
  function shen_user_lambda15726(Arg15725) {
  if (Arg15725.length < 1) return [shen_type_func, shen_user_lambda15726, 1, Arg15725];
  var Arg15725_0 = Arg15725[0];
  return (((typeof(Arg15725_0) == 'string'))
  ? (function() {
  return shenjs_call_tail(shen_explode_string, [Arg15725_0]);})
  : (function() {
  return shenjs_call_tail(shen_explode, [shenjs_call(shen_intmake_string, ["~A", [shen_tuple, Arg15725_0, []]])]);}))},
  1,
  [],
  "explode"];
shenjs_functions["shen_explode"] = shen_explode;






shen_explode_string = [shen_type_func,
  function shen_user_lambda15728(Arg15727) {
  if (Arg15727.length < 1) return [shen_type_func, shen_user_lambda15728, 1, Arg15727];
  var Arg15727_0 = Arg15727[0];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$("", Arg15727_0)))
  ? []
  : ((R0 = Arg15727_0[0]),
  (R1 = shenjs_tlstr(Arg15727_0)),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, [shen_type_symbol, "shen-eos"])))
  ? []
  : [shen_type_cons, R0, shenjs_call(shen_explode_string, [R1])])))},
  1,
  [],
  "shen-explode-string"];
shenjs_functions["shen_shen-explode-string"] = shen_explode_string;






shen_stinput = [shen_type_func,
  function shen_user_lambda15730(Arg15729) {
  if (Arg15729.length < 1) return [shen_type_func, shen_user_lambda15730, 1, Arg15729];
  var Arg15729_0 = Arg15729[0];
  return (shenjs_globals["shen_*stinput*"])},
  1,
  [],
  "stinput"];
shenjs_functions["shen_stinput"] = shen_stinput;






shen_$plus$vector$question$ = [shen_type_func,
  function shen_user_lambda15732(Arg15731) {
  if (Arg15731.length < 1) return [shen_type_func, shen_user_lambda15732, 1, Arg15731];
  var Arg15731_0 = Arg15731[0];
  return (shenjs_absvector$question$(Arg15731_0) && (shenjs_absvector_ref(Arg15731_0, 0) > 0))},
  1,
  [],
  "shen-+vector?"];
shenjs_functions["shen_shen-+vector?"] = shen_$plus$vector$question$;












shen_fillvector = [shen_type_func,
  function shen_user_lambda15735(Arg15734) {
  if (Arg15734.length < 4) return [shen_type_func, shen_user_lambda15735, 4, Arg15734];
  var Arg15734_0 = Arg15734[0], Arg15734_1 = Arg15734[1], Arg15734_2 = Arg15734[2], Arg15734_3 = Arg15734[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg15734_2, Arg15734_1)))
  ? shenjs_absvector_set(Arg15734_0, Arg15734_2, Arg15734_3)
  : (function() {
  return shenjs_call_tail(shen_fillvector, [shenjs_absvector_set(Arg15734_0, Arg15734_1, Arg15734_3), (1 + Arg15734_1), Arg15734_2, Arg15734_3]);}))},
  4,
  [],
  "shen-fillvector"];
shenjs_functions["shen_shen-fillvector"] = shen_fillvector;












shen_vector_$gt$ = [shen_type_func,
  function shen_user_lambda15738(Arg15737) {
  if (Arg15737.length < 3) return [shen_type_func, shen_user_lambda15738, 3, Arg15737];
  var Arg15737_0 = Arg15737[0], Arg15737_1 = Arg15737[1], Arg15737_2 = Arg15737[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg15737_1, 0)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["cannot access 0th element of a vector~%", []]);})
  : shenjs_absvector_set(Arg15737_0, Arg15737_1, Arg15737_2))},
  3,
  [],
  "vector->"];
shenjs_functions["shen_vector->"] = shen_vector_$gt$;






shen_$lt$_vector = [shen_type_func,
  function shen_user_lambda15740(Arg15739) {
  if (Arg15739.length < 2) return [shen_type_func, shen_user_lambda15740, 2, Arg15739];
  var Arg15739_0 = Arg15739[0], Arg15739_1 = Arg15739[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg15739_1, 0)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["cannot access 0th element of a vector~%", []]);})
  : ((R0 = shenjs_absvector_ref(Arg15739_0, Arg15739_1)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["vector element not found~%", []]);})
  : R0)))},
  2,
  [],
  "<-vector"];
shenjs_functions["shen_<-vector"] = shen_$lt$_vector;






shen_posint$question$ = [shen_type_func,
  function shen_user_lambda15742(Arg15741) {
  if (Arg15741.length < 1) return [shen_type_func, shen_user_lambda15742, 1, Arg15741];
  var Arg15741_0 = Arg15741[0];
  return (shenjs_call(shen_integer$question$, [Arg15741_0]) && (Arg15741_0 >= 0))},
  1,
  [],
  "shen-posint?"];
shenjs_functions["shen_shen-posint?"] = shen_posint$question$;






shen_limit = [shen_type_func,
  function shen_user_lambda15744(Arg15743) {
  if (Arg15743.length < 1) return [shen_type_func, shen_user_lambda15744, 1, Arg15743];
  var Arg15743_0 = Arg15743[0];
  return shenjs_absvector_ref(Arg15743_0, 0)},
  1,
  [],
  "limit"];
shenjs_functions["shen_limit"] = shen_limit;












shen_variable$question$ = [shen_type_func,
  function shen_user_lambda15747(Arg15746) {
  if (Arg15746.length < 1) return [shen_type_func, shen_user_lambda15747, 1, Arg15746];
  var Arg15746_0 = Arg15746[0];
  var R0;
  return (function() {
  return shenjs_trap_error(function() {return ((R0 = shenjs_str(Arg15746_0)),
  (R0 = R0[0]),
  shenjs_call(shen_element$question$, [R0, [shen_type_cons, "A", [shen_type_cons, "B", [shen_type_cons, "C", [shen_type_cons, "D", [shen_type_cons, "E", [shen_type_cons, "F", [shen_type_cons, "G", [shen_type_cons, "H", [shen_type_cons, "I", [shen_type_cons, "J", [shen_type_cons, "K", [shen_type_cons, "L", [shen_type_cons, "M", [shen_type_cons, "N", [shen_type_cons, "O", [shen_type_cons, "P", [shen_type_cons, "Q", [shen_type_cons, "R", [shen_type_cons, "S", [shen_type_cons, "T", [shen_type_cons, "U", [shen_type_cons, "V", [shen_type_cons, "W", [shen_type_cons, "X", [shen_type_cons, "Y", [shen_type_cons, "Z", []]]]]]]]]]]]]]]]]]]]]]]]]]]]));}, [shen_type_func,
  function shen_user_lambda15749(Arg15748) {
  if (Arg15748.length < 1) return [shen_type_func, shen_user_lambda15749, 1, Arg15748];
  var Arg15748_0 = Arg15748[0];
  return false},
  1,
  []]);})},
  1,
  [],
  "variable?"];
shenjs_functions["shen_variable?"] = shen_variable$question$;






shen_gensym = [shen_type_func,
  function shen_user_lambda15751(Arg15750) {
  if (Arg15750.length < 1) return [shen_type_func, shen_user_lambda15751, 1, Arg15750];
  var Arg15750_0 = Arg15750[0];
  return (function() {
  return shenjs_call_tail(shen_concat, [Arg15750_0, (shenjs_globals["shen_shen-*gensym*"] = (1 + (shenjs_globals["shen_shen-*gensym*"])))]);})},
  1,
  [],
  "gensym"];
shenjs_functions["shen_gensym"] = shen_gensym;






shen_concat = [shen_type_func,
  function shen_user_lambda15753(Arg15752) {
  if (Arg15752.length < 2) return [shen_type_func, shen_user_lambda15753, 2, Arg15752];
  var Arg15752_0 = Arg15752[0], Arg15752_1 = Arg15752[1];
  return (function() {
  return shenjs_intern((shenjs_str(Arg15752_0) + shenjs_str(Arg15752_1)));})},
  2,
  [],
  "concat"];
shenjs_functions["shen_concat"] = shen_concat;












shen_fst = [shen_type_func,
  function shen_user_lambda15756(Arg15755) {
  if (Arg15755.length < 1) return [shen_type_func, shen_user_lambda15756, 1, Arg15755];
  var Arg15755_0 = Arg15755[0];
  return shenjs_absvector_ref(Arg15755_0, 1)},
  1,
  [],
  "fst"];
shenjs_functions["shen_fst"] = shen_fst;






shen_snd = [shen_type_func,
  function shen_user_lambda15758(Arg15757) {
  if (Arg15757.length < 1) return [shen_type_func, shen_user_lambda15758, 1, Arg15757];
  var Arg15757_0 = Arg15757[0];
  return shenjs_absvector_ref(Arg15757_0, 2)},
  1,
  [],
  "snd"];
shenjs_functions["shen_snd"] = shen_snd;






shen_tuple$question$ = [shen_type_func,
  function shen_user_lambda15760(Arg15759) {
  if (Arg15759.length < 1) return [shen_type_func, shen_user_lambda15760, 1, Arg15759];
  var Arg15759_0 = Arg15759[0];
  return (function() {
  return shenjs_trap_error(function() {return (shenjs_absvector$question$(Arg15759_0) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-tuple"], shenjs_absvector_ref(Arg15759_0, 0))));}, [shen_type_func,
  function shen_user_lambda15762(Arg15761) {
  if (Arg15761.length < 1) return [shen_type_func, shen_user_lambda15762, 1, Arg15761];
  var Arg15761_0 = Arg15761[0];
  return false},
  1,
  []]);})},
  1,
  [],
  "tuple?"];
shenjs_functions["shen_tuple?"] = shen_tuple$question$;






shen_append = [shen_type_func,
  function shen_user_lambda15764(Arg15763) {
  if (Arg15763.length < 2) return [shen_type_func, shen_user_lambda15764, 2, Arg15763];
  var Arg15763_0 = Arg15763[0], Arg15763_1 = Arg15763[1];
  return ((shenjs_empty$question$(Arg15763_0))
  ? Arg15763_1
  : ((shenjs_is_type(Arg15763_0, shen_type_cons))
  ? [shen_type_cons, Arg15763_0[1], shenjs_call(shen_append, [Arg15763_0[2], Arg15763_1])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "append"]]);})))},
  2,
  [],
  "append"];
shenjs_functions["shen_append"] = shen_append;






shen_$at$v = [shen_type_func,
  function shen_user_lambda15766(Arg15765) {
  if (Arg15765.length < 2) return [shen_type_func, shen_user_lambda15766, 2, Arg15765];
  var Arg15765_0 = Arg15765[0], Arg15765_1 = Arg15765[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_limit, [Arg15765_1])),
  (R1 = shenjs_vector((R0 + 1))),
  (R1 = shenjs_call(shen_vector_$gt$, [R1, 1, Arg15765_0])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, 0)))
  ? R1
  : (function() {
  return shenjs_call_tail(shen_$at$v_help, [Arg15765_1, 1, R0, R1]);})))},
  2,
  [],
  "@v"];
shenjs_functions["shen_@v"] = shen_$at$v;






shen_$at$v_help = [shen_type_func,
  function shen_user_lambda15768(Arg15767) {
  if (Arg15767.length < 4) return [shen_type_func, shen_user_lambda15768, 4, Arg15767];
  var Arg15767_0 = Arg15767[0], Arg15767_1 = Arg15767[1], Arg15767_2 = Arg15767[2], Arg15767_3 = Arg15767[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg15767_2, Arg15767_1)))
  ? (function() {
  return shenjs_call_tail(shen_copyfromvector, [Arg15767_0, Arg15767_3, Arg15767_2, (Arg15767_2 + 1)]);})
  : (function() {
  return shenjs_call_tail(shen_$at$v_help, [Arg15767_0, (Arg15767_1 + 1), Arg15767_2, shenjs_call(shen_copyfromvector, [Arg15767_0, Arg15767_3, Arg15767_1, (Arg15767_1 + 1)])]);}))},
  4,
  [],
  "shen-@v-help"];
shenjs_functions["shen_shen-@v-help"] = shen_$at$v_help;






shen_copyfromvector = [shen_type_func,
  function shen_user_lambda15770(Arg15769) {
  if (Arg15769.length < 4) return [shen_type_func, shen_user_lambda15770, 4, Arg15769];
  var Arg15769_0 = Arg15769[0], Arg15769_1 = Arg15769[1], Arg15769_2 = Arg15769[2], Arg15769_3 = Arg15769[3];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_vector_$gt$, [Arg15769_1, Arg15769_3, shenjs_call(shen_$lt$_vector, [Arg15769_0, Arg15769_2])]);}, [shen_type_func,
  function shen_user_lambda15772(Arg15771) {
  if (Arg15771.length < 2) return [shen_type_func, shen_user_lambda15772, 2, Arg15771];
  var Arg15771_0 = Arg15771[0], Arg15771_1 = Arg15771[1];
  return Arg15771_0},
  2,
  [Arg15769_1]]);})},
  4,
  [],
  "shen-copyfromvector"];
shenjs_functions["shen_shen-copyfromvector"] = shen_copyfromvector;






shen_hdv = [shen_type_func,
  function shen_user_lambda15774(Arg15773) {
  if (Arg15773.length < 1) return [shen_type_func, shen_user_lambda15774, 1, Arg15773];
  var Arg15773_0 = Arg15773[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_$lt$_vector, [Arg15773_0, 1]);}, [shen_type_func,
  function shen_user_lambda15776(Arg15775) {
  if (Arg15775.length < 2) return [shen_type_func, shen_user_lambda15776, 2, Arg15775];
  var Arg15775_0 = Arg15775[0], Arg15775_1 = Arg15775[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["hdv needs a non-empty vector as an argument; not ~S~%", [shen_tuple, Arg15775_0, []]]);})},
  2,
  [Arg15773_0]]);})},
  1,
  [],
  "hdv"];
shenjs_functions["shen_hdv"] = shen_hdv;






shen_tlv = [shen_type_func,
  function shen_user_lambda15778(Arg15777) {
  if (Arg15777.length < 1) return [shen_type_func, shen_user_lambda15778, 1, Arg15777];
  var Arg15777_0 = Arg15777[0];
  var R0;
  return ((R0 = shenjs_call(shen_limit, [Arg15777_0])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, 0)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["cannot take the tail of the empty vector~%", []]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(R0, 1)))
  ? (function() {
  return shenjs_vector(0);})
  : (shenjs_vector((R0 - 1)),
  (function() {
  return shenjs_call_tail(shen_tlv_help, [Arg15777_0, 2, R0, shenjs_vector((R0 - 1))]);})))))},
  1,
  [],
  "tlv"];
shenjs_functions["shen_tlv"] = shen_tlv;






shen_tlv_help = [shen_type_func,
  function shen_user_lambda15780(Arg15779) {
  if (Arg15779.length < 4) return [shen_type_func, shen_user_lambda15780, 4, Arg15779];
  var Arg15779_0 = Arg15779[0], Arg15779_1 = Arg15779[1], Arg15779_2 = Arg15779[2], Arg15779_3 = Arg15779[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg15779_2, Arg15779_1)))
  ? (function() {
  return shenjs_call_tail(shen_copyfromvector, [Arg15779_0, Arg15779_3, Arg15779_2, (Arg15779_2 - 1)]);})
  : (function() {
  return shenjs_call_tail(shen_tlv_help, [Arg15779_0, (Arg15779_1 + 1), Arg15779_2, shenjs_call(shen_copyfromvector, [Arg15779_0, Arg15779_3, Arg15779_1, (Arg15779_1 - 1)])]);}))},
  4,
  [],
  "shen-tlv-help"];
shenjs_functions["shen_shen-tlv-help"] = shen_tlv_help;






shen_assoc = [shen_type_func,
  function shen_user_lambda15782(Arg15781) {
  if (Arg15781.length < 2) return [shen_type_func, shen_user_lambda15782, 2, Arg15781];
  var Arg15781_0 = Arg15781[0], Arg15781_1 = Arg15781[1];
  return ((shenjs_empty$question$(Arg15781_1))
  ? []
  : (((shenjs_is_type(Arg15781_1, shen_type_cons) && (shenjs_is_type(Arg15781_1[1], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg15781_1[1][1], Arg15781_0)))))
  ? Arg15781_1[1]
  : ((shenjs_is_type(Arg15781_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_assoc, [Arg15781_0, Arg15781_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "assoc"]]);}))))},
  2,
  [],
  "assoc"];
shenjs_functions["shen_assoc"] = shen_assoc;






shen_boolean$question$ = [shen_type_func,
  function shen_user_lambda15784(Arg15783) {
  if (Arg15783.length < 1) return [shen_type_func, shen_user_lambda15784, 1, Arg15783];
  var Arg15783_0 = Arg15783[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg15783_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg15783_0)))
  ? true
  : false))},
  1,
  [],
  "boolean?"];
shenjs_functions["shen_boolean?"] = shen_boolean$question$;






shen_nl = [shen_type_func,
  function shen_user_lambda15786(Arg15785) {
  if (Arg15785.length < 1) return [shen_type_func, shen_user_lambda15786, 1, Arg15785];
  var Arg15785_0 = Arg15785[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg15785_0)))
  ? 0
  : (shenjs_call(shen_intoutput, ["~%", []]),
  (function() {
  return shenjs_call_tail(shen_nl, [(Arg15785_0 - 1)]);})))},
  1,
  [],
  "nl"];
shenjs_functions["shen_nl"] = shen_nl;






shen_difference = [shen_type_func,
  function shen_user_lambda15788(Arg15787) {
  if (Arg15787.length < 2) return [shen_type_func, shen_user_lambda15788, 2, Arg15787];
  var Arg15787_0 = Arg15787[0], Arg15787_1 = Arg15787[1];
  return ((shenjs_empty$question$(Arg15787_0))
  ? []
  : ((shenjs_is_type(Arg15787_0, shen_type_cons))
  ? ((shenjs_call(shen_element$question$, [Arg15787_0[1], Arg15787_1]))
  ? (function() {
  return shenjs_call_tail(shen_difference, [Arg15787_0[2], Arg15787_1]);})
  : [shen_type_cons, Arg15787_0[1], shenjs_call(shen_difference, [Arg15787_0[2], Arg15787_1])])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "difference"]]);})))},
  2,
  [],
  "difference"];
shenjs_functions["shen_difference"] = shen_difference;






shen_do = [shen_type_func,
  function shen_user_lambda15790(Arg15789) {
  if (Arg15789.length < 2) return [shen_type_func, shen_user_lambda15790, 2, Arg15789];
  var Arg15789_0 = Arg15789[0], Arg15789_1 = Arg15789[1];
  return Arg15789_1},
  2,
  [],
  "do"];
shenjs_functions["shen_do"] = shen_do;






shen_element$question$ = [shen_type_func,
  function shen_user_lambda15792(Arg15791) {
  if (Arg15791.length < 2) return [shen_type_func, shen_user_lambda15792, 2, Arg15791];
  var Arg15791_0 = Arg15791[0], Arg15791_1 = Arg15791[1];
  return ((shenjs_empty$question$(Arg15791_1))
  ? false
  : (((shenjs_is_type(Arg15791_1, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg15791_1[1], Arg15791_0))))
  ? true
  : ((shenjs_is_type(Arg15791_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_element$question$, [Arg15791_0, Arg15791_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "element?"]]);}))))},
  2,
  [],
  "element?"];
shenjs_functions["shen_element?"] = shen_element$question$;












shen_fix = [shen_type_func,
  function shen_user_lambda15795(Arg15794) {
  if (Arg15794.length < 2) return [shen_type_func, shen_user_lambda15795, 2, Arg15794];
  var Arg15794_0 = Arg15794[0], Arg15794_1 = Arg15794[1];
  return (function() {
  return shenjs_call_tail(shen_fix_help, [Arg15794_0, Arg15794_1, shenjs_call(Arg15794_0, [Arg15794_1])]);})},
  2,
  [],
  "fix"];
shenjs_functions["shen_fix"] = shen_fix;






shen_fix_help = [shen_type_func,
  function shen_user_lambda15797(Arg15796) {
  if (Arg15796.length < 3) return [shen_type_func, shen_user_lambda15797, 3, Arg15796];
  var Arg15796_0 = Arg15796[0], Arg15796_1 = Arg15796[1], Arg15796_2 = Arg15796[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg15796_2, Arg15796_1)))
  ? Arg15796_2
  : (function() {
  return shenjs_call_tail(shen_fix_help, [Arg15796_0, Arg15796_2, shenjs_call(Arg15796_0, [Arg15796_2])]);}))},
  3,
  [],
  "shen-fix-help"];
shenjs_functions["shen_shen-fix-help"] = shen_fix_help;






shen_put = [shen_type_func,
  function shen_user_lambda15799(Arg15798) {
  if (Arg15798.length < 4) return [shen_type_func, shen_user_lambda15799, 4, Arg15798];
  var Arg15798_0 = Arg15798[0], Arg15798_1 = Arg15798[1], Arg15798_2 = Arg15798[2], Arg15798_3 = Arg15798[3];
  var R0, R1;
  return ((R0 = shenjs_call(shen_hash, [Arg15798_0, shenjs_call(shen_limit, [Arg15798_3])])),
  (R1 = shenjs_trap_error(function() {return shenjs_call(shen_$lt$_vector, [Arg15798_3, R0]);}, [shen_type_func,
  function shen_user_lambda15801(Arg15800) {
  if (Arg15800.length < 1) return [shen_type_func, shen_user_lambda15801, 1, Arg15800];
  var Arg15800_0 = Arg15800[0];
  return []},
  1,
  []])),
  shenjs_call(shen_vector_$gt$, [Arg15798_3, R0, shenjs_call(shen_change_pointer_value, [Arg15798_0, Arg15798_1, Arg15798_2, R1])]),
  Arg15798_2)},
  4,
  [],
  "put"];
shenjs_functions["shen_put"] = shen_put;






shen_change_pointer_value = [shen_type_func,
  function shen_user_lambda15803(Arg15802) {
  if (Arg15802.length < 4) return [shen_type_func, shen_user_lambda15803, 4, Arg15802];
  var Arg15802_0 = Arg15802[0], Arg15802_1 = Arg15802[1], Arg15802_2 = Arg15802[2], Arg15802_3 = Arg15802[3];
  return ((shenjs_empty$question$(Arg15802_3))
  ? [shen_type_cons, [shen_type_cons, [shen_type_cons, Arg15802_0, [shen_type_cons, Arg15802_1, []]], Arg15802_2], []]
  : (((shenjs_is_type(Arg15802_3, shen_type_cons) && (shenjs_is_type(Arg15802_3[1], shen_type_cons) && (shenjs_is_type(Arg15802_3[1][1], shen_type_cons) && (shenjs_is_type(Arg15802_3[1][1][2], shen_type_cons) && (shenjs_empty$question$(Arg15802_3[1][1][2][2]) && (shenjs_unwind_tail(shenjs_$eq$(Arg15802_3[1][1][2][1], Arg15802_1)) && shenjs_unwind_tail(shenjs_$eq$(Arg15802_3[1][1][1], Arg15802_0)))))))))
  ? [shen_type_cons, [shen_type_cons, Arg15802_3[1][1], Arg15802_2], Arg15802_3[2]]
  : ((shenjs_is_type(Arg15802_3, shen_type_cons))
  ? [shen_type_cons, Arg15802_3[1], shenjs_call(shen_change_pointer_value, [Arg15802_0, Arg15802_1, Arg15802_2, Arg15802_3[2]])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-change-pointer-value"]]);}))))},
  4,
  [],
  "shen-change-pointer-value"];
shenjs_functions["shen_shen-change-pointer-value"] = shen_change_pointer_value;






shen_get = [shen_type_func,
  function shen_user_lambda15805(Arg15804) {
  if (Arg15804.length < 3) return [shen_type_func, shen_user_lambda15805, 3, Arg15804];
  var Arg15804_0 = Arg15804[0], Arg15804_1 = Arg15804[1], Arg15804_2 = Arg15804[2];
  var R0;
  return ((R0 = shenjs_call(shen_hash, [Arg15804_0, shenjs_call(shen_limit, [Arg15804_2])])),
  (R0 = shenjs_trap_error(function() {return shenjs_call(shen_$lt$_vector, [Arg15804_2, R0]);}, [shen_type_func,
  function shen_user_lambda15807(Arg15806) {
  if (Arg15806.length < 1) return [shen_type_func, shen_user_lambda15807, 1, Arg15806];
  var Arg15806_0 = Arg15806[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["pointer not found~%", []]);})},
  1,
  []])),
  (R0 = shenjs_call(shen_assoc, [[shen_type_cons, Arg15804_0, [shen_type_cons, Arg15804_1, []]], R0])),
  ((shenjs_empty$question$(R0))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["value not found~%", []]);})
  : R0[2]))},
  3,
  [],
  "get"];
shenjs_functions["shen_get"] = shen_get;






shen_hash = [shen_type_func,
  function shen_user_lambda15809(Arg15808) {
  if (Arg15808.length < 2) return [shen_type_func, shen_user_lambda15809, 2, Arg15808];
  var Arg15808_0 = Arg15808[0], Arg15808_1 = Arg15808[1];
  var R0;
  return ((R0 = shenjs_call(shen_mod, [shenjs_call(shen_sum, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15811(Arg15810) {
  if (Arg15810.length < 1) return [shen_type_func, shen_user_lambda15811, 1, Arg15810];
  var Arg15810_0 = Arg15810[0];
  return (function() {
  return shenjs_string_$gt$n(Arg15810_0);})},
  1,
  []], shenjs_call(shen_explode, [Arg15808_0])])]), Arg15808_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(0, R0)))
  ? 1
  : R0))},
  2,
  [],
  "hash"];
shenjs_functions["shen_hash"] = shen_hash;






shen_mod = [shen_type_func,
  function shen_user_lambda15813(Arg15812) {
  if (Arg15812.length < 2) return [shen_type_func, shen_user_lambda15813, 2, Arg15812];
  var Arg15812_0 = Arg15812[0], Arg15812_1 = Arg15812[1];
  return (function() {
  return shenjs_call_tail(shen_modh, [Arg15812_0, shenjs_call(shen_multiples, [Arg15812_0, [shen_type_cons, Arg15812_1, []]])]);})},
  2,
  [],
  "shen-mod"];
shenjs_functions["shen_shen-mod"] = shen_mod;






shen_multiples = [shen_type_func,
  function shen_user_lambda15815(Arg15814) {
  if (Arg15814.length < 2) return [shen_type_func, shen_user_lambda15815, 2, Arg15814];
  var Arg15814_0 = Arg15814[0], Arg15814_1 = Arg15814[1];
  return (((shenjs_is_type(Arg15814_1, shen_type_cons) && (Arg15814_1[1] > Arg15814_0)))
  ? Arg15814_1[2]
  : ((shenjs_is_type(Arg15814_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_multiples, [Arg15814_0, [shen_type_cons, (2 * Arg15814_1[1]), Arg15814_1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-multiples"]]);})))},
  2,
  [],
  "shen-multiples"];
shenjs_functions["shen_shen-multiples"] = shen_multiples;






shen_modh = [shen_type_func,
  function shen_user_lambda15817(Arg15816) {
  if (Arg15816.length < 2) return [shen_type_func, shen_user_lambda15817, 2, Arg15816];
  var Arg15816_0 = Arg15816[0], Arg15816_1 = Arg15816[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg15816_0)))
  ? 0
  : ((shenjs_empty$question$(Arg15816_1))
  ? Arg15816_0
  : (((shenjs_is_type(Arg15816_1, shen_type_cons) && (Arg15816_1[1] > Arg15816_0)))
  ? ((shenjs_empty$question$(Arg15816_1[2]))
  ? Arg15816_0
  : (function() {
  return shenjs_call_tail(shen_modh, [Arg15816_0, Arg15816_1[2]]);}))
  : ((shenjs_is_type(Arg15816_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_modh, [(Arg15816_0 - Arg15816_1[1]), Arg15816_1]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-modh"]]);})))))},
  2,
  [],
  "shen-modh"];
shenjs_functions["shen_shen-modh"] = shen_modh;






shen_sum = [shen_type_func,
  function shen_user_lambda15819(Arg15818) {
  if (Arg15818.length < 1) return [shen_type_func, shen_user_lambda15819, 1, Arg15818];
  var Arg15818_0 = Arg15818[0];
  return ((shenjs_empty$question$(Arg15818_0))
  ? 0
  : ((shenjs_is_type(Arg15818_0, shen_type_cons))
  ? (Arg15818_0[1] + shenjs_call(shen_sum, [Arg15818_0[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "sum"]]);})))},
  1,
  [],
  "sum"];
shenjs_functions["shen_sum"] = shen_sum;






shen_head = [shen_type_func,
  function shen_user_lambda15821(Arg15820) {
  if (Arg15820.length < 1) return [shen_type_func, shen_user_lambda15821, 1, Arg15820];
  var Arg15820_0 = Arg15820[0];
  return ((shenjs_is_type(Arg15820_0, shen_type_cons))
  ? Arg15820_0[1]
  : (function() {
  return shenjs_call_tail(shen_interror, ["head expects a non-empty list", []]);}))},
  1,
  [],
  "head"];
shenjs_functions["shen_head"] = shen_head;






shen_tail = [shen_type_func,
  function shen_user_lambda15823(Arg15822) {
  if (Arg15822.length < 1) return [shen_type_func, shen_user_lambda15823, 1, Arg15822];
  var Arg15822_0 = Arg15822[0];
  return ((shenjs_is_type(Arg15822_0, shen_type_cons))
  ? Arg15822_0[2]
  : (function() {
  return shenjs_call_tail(shen_interror, ["tail expects a non-empty list", []]);}))},
  1,
  [],
  "tail"];
shenjs_functions["shen_tail"] = shen_tail;






shen_hdstr = [shen_type_func,
  function shen_user_lambda15825(Arg15824) {
  if (Arg15824.length < 1) return [shen_type_func, shen_user_lambda15825, 1, Arg15824];
  var Arg15824_0 = Arg15824[0];
  return Arg15824_0[0]},
  1,
  [],
  "hdstr"];
shenjs_functions["shen_hdstr"] = shen_hdstr;






shen_intersection = [shen_type_func,
  function shen_user_lambda15827(Arg15826) {
  if (Arg15826.length < 2) return [shen_type_func, shen_user_lambda15827, 2, Arg15826];
  var Arg15826_0 = Arg15826[0], Arg15826_1 = Arg15826[1];
  return ((shenjs_empty$question$(Arg15826_0))
  ? []
  : ((shenjs_is_type(Arg15826_0, shen_type_cons))
  ? ((shenjs_call(shen_element$question$, [Arg15826_0[1], Arg15826_1]))
  ? [shen_type_cons, Arg15826_0[1], shenjs_call(shen_intersection, [Arg15826_0[2], Arg15826_1])]
  : (function() {
  return shenjs_call_tail(shen_intersection, [Arg15826_0[2], Arg15826_1]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "intersection"]]);})))},
  2,
  [],
  "intersection"];
shenjs_functions["shen_intersection"] = shen_intersection;






shen_reverse = [shen_type_func,
  function shen_user_lambda15829(Arg15828) {
  if (Arg15828.length < 1) return [shen_type_func, shen_user_lambda15829, 1, Arg15828];
  var Arg15828_0 = Arg15828[0];
  return (function() {
  return shenjs_call_tail(shen_reverse$_help, [Arg15828_0, []]);})},
  1,
  [],
  "reverse"];
shenjs_functions["shen_reverse"] = shen_reverse;






shen_reverse$_help = [shen_type_func,
  function shen_user_lambda15831(Arg15830) {
  if (Arg15830.length < 2) return [shen_type_func, shen_user_lambda15831, 2, Arg15830];
  var Arg15830_0 = Arg15830[0], Arg15830_1 = Arg15830[1];
  return ((shenjs_empty$question$(Arg15830_0))
  ? Arg15830_1
  : ((shenjs_is_type(Arg15830_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_reverse$_help, [Arg15830_0[2], [shen_type_cons, Arg15830_0[1], Arg15830_1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-reverse_help"]]);})))},
  2,
  [],
  "shen-reverse_help"];
shenjs_functions["shen_shen-reverse_help"] = shen_reverse$_help;






shen_union = [shen_type_func,
  function shen_user_lambda15833(Arg15832) {
  if (Arg15832.length < 2) return [shen_type_func, shen_user_lambda15833, 2, Arg15832];
  var Arg15832_0 = Arg15832[0], Arg15832_1 = Arg15832[1];
  return ((shenjs_empty$question$(Arg15832_0))
  ? Arg15832_1
  : ((shenjs_is_type(Arg15832_0, shen_type_cons))
  ? ((shenjs_call(shen_element$question$, [Arg15832_0[1], Arg15832_1]))
  ? (function() {
  return shenjs_call_tail(shen_union, [Arg15832_0[2], Arg15832_1]);})
  : [shen_type_cons, Arg15832_0[1], shenjs_call(shen_union, [Arg15832_0[2], Arg15832_1])])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "union"]]);})))},
  2,
  [],
  "union"];
shenjs_functions["shen_union"] = shen_union;






shen_y_or_n$question$ = [shen_type_func,
  function shen_user_lambda15835(Arg15834) {
  if (Arg15834.length < 1) return [shen_type_func, shen_user_lambda15835, 1, Arg15834];
  var Arg15834_0 = Arg15834[0];
  var R0;
  return (shenjs_call(shen_intoutput, [Arg15834_0, []]),
  shenjs_call(shen_intoutput, [" (y/n) ", []]),
  (R0 = shenjs_call(shen_intmake_string, ["~S", [shen_tuple, shenjs_call(shen_input, []), []]])),
  ((shenjs_unwind_tail(shenjs_$eq$("y", R0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$("n", R0)))
  ? false
  : (shenjs_call(shen_intoutput, ["please answer y or n~%", []]),
  (function() {
  return shenjs_call_tail(shen_y_or_n$question$, [Arg15834_0]);})))))},
  1,
  [],
  "y-or-n?"];
shenjs_functions["shen_y-or-n?"] = shen_y_or_n$question$;












shen_subst = [shen_type_func,
  function shen_user_lambda15838(Arg15837) {
  if (Arg15837.length < 3) return [shen_type_func, shen_user_lambda15838, 3, Arg15837];
  var Arg15837_0 = Arg15837[0], Arg15837_1 = Arg15837[1], Arg15837_2 = Arg15837[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg15837_2, Arg15837_1)))
  ? Arg15837_0
  : ((shenjs_is_type(Arg15837_2, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_subst, [Arg15837_0, Arg15837_1, Arg15837_2[1]]), shenjs_call(shen_subst, [Arg15837_0, Arg15837_1, Arg15837_2[2]])]
  : Arg15837_2))},
  3,
  [],
  "subst"];
shenjs_functions["shen_subst"] = shen_subst;






shen_cd = [shen_type_func,
  function shen_user_lambda15840(Arg15839) {
  if (Arg15839.length < 1) return [shen_type_func, shen_user_lambda15840, 1, Arg15839];
  var Arg15839_0 = Arg15839[0];
  return (shenjs_globals["shen_*home-directory*"] = ((shenjs_unwind_tail(shenjs_$eq$(Arg15839_0, "")))
  ? ""
  : shenjs_call(shen_intmake_string, ["~A/", [shen_tuple, Arg15839_0, []]])))},
  1,
  [],
  "cd"];
shenjs_functions["shen_cd"] = shen_cd;






shen_map = [shen_type_func,
  function shen_user_lambda15842(Arg15841) {
  if (Arg15841.length < 2) return [shen_type_func, shen_user_lambda15842, 2, Arg15841];
  var Arg15841_0 = Arg15841[0], Arg15841_1 = Arg15841[1];
  return (function() {
  return shenjs_call_tail(shen_map_h, [Arg15841_0, Arg15841_1, []]);})},
  2,
  [],
  "map"];
shenjs_functions["shen_map"] = shen_map;






shen_map_h = [shen_type_func,
  function shen_user_lambda15844(Arg15843) {
  if (Arg15843.length < 3) return [shen_type_func, shen_user_lambda15844, 3, Arg15843];
  var Arg15843_0 = Arg15843[0], Arg15843_1 = Arg15843[1], Arg15843_2 = Arg15843[2];
  return ((shenjs_empty$question$(Arg15843_1))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg15843_2]);})
  : ((shenjs_is_type(Arg15843_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map_h, [Arg15843_0, Arg15843_1[2], [shen_type_cons, shenjs_call(Arg15843_0, [Arg15843_1[1]]), Arg15843_2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-map-h"]]);})))},
  3,
  [],
  "shen-map-h"];
shenjs_functions["shen_shen-map-h"] = shen_map_h;






shen_length = [shen_type_func,
  function shen_user_lambda15846(Arg15845) {
  if (Arg15845.length < 1) return [shen_type_func, shen_user_lambda15846, 1, Arg15845];
  var Arg15845_0 = Arg15845[0];
  return (function() {
  return shenjs_call_tail(shen_length_h, [Arg15845_0, 0]);})},
  1,
  [],
  "length"];
shenjs_functions["shen_length"] = shen_length;






shen_length_h = [shen_type_func,
  function shen_user_lambda15848(Arg15847) {
  if (Arg15847.length < 2) return [shen_type_func, shen_user_lambda15848, 2, Arg15847];
  var Arg15847_0 = Arg15847[0], Arg15847_1 = Arg15847[1];
  return ((shenjs_empty$question$(Arg15847_0))
  ? Arg15847_1
  : (function() {
  return shenjs_call_tail(shen_length_h, [Arg15847_0[2], (Arg15847_1 + 1)]);}))},
  2,
  [],
  "shen-length-h"];
shenjs_functions["shen_shen-length-h"] = shen_length_h;






shen_occurrences = [shen_type_func,
  function shen_user_lambda15850(Arg15849) {
  if (Arg15849.length < 2) return [shen_type_func, shen_user_lambda15850, 2, Arg15849];
  var Arg15849_0 = Arg15849[0], Arg15849_1 = Arg15849[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg15849_1, Arg15849_0)))
  ? 1
  : ((shenjs_is_type(Arg15849_1, shen_type_cons))
  ? (shenjs_call(shen_occurrences, [Arg15849_0, Arg15849_1[1]]) + shenjs_call(shen_occurrences, [Arg15849_0, Arg15849_1[2]]))
  : 0))},
  2,
  [],
  "occurrences"];
shenjs_functions["shen_occurrences"] = shen_occurrences;






shen_nth = [shen_type_func,
  function shen_user_lambda15852(Arg15851) {
  if (Arg15851.length < 2) return [shen_type_func, shen_user_lambda15852, 2, Arg15851];
  var Arg15851_0 = Arg15851[0], Arg15851_1 = Arg15851[1];
  return (((shenjs_unwind_tail(shenjs_$eq$(1, Arg15851_0)) && shenjs_is_type(Arg15851_1, shen_type_cons)))
  ? Arg15851_1[1]
  : ((shenjs_is_type(Arg15851_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_nth, [(Arg15851_0 - 1), Arg15851_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "nth"]]);})))},
  2,
  [],
  "nth"];
shenjs_functions["shen_nth"] = shen_nth;






shen_integer$question$ = [shen_type_func,
  function shen_user_lambda15854(Arg15853) {
  if (Arg15853.length < 1) return [shen_type_func, shen_user_lambda15854, 1, Arg15853];
  var Arg15853_0 = Arg15853[0];
  var R0;
  return ((typeof(Arg15853_0) == 'number') && ((R0 = shenjs_call(shen_abs, [Arg15853_0])),
  shenjs_call(shen_integer_test$question$, [R0, shenjs_call(shen_magless, [R0, 1])])))},
  1,
  [],
  "integer?"];
shenjs_functions["shen_integer?"] = shen_integer$question$;






shen_abs = [shen_type_func,
  function shen_user_lambda15856(Arg15855) {
  if (Arg15855.length < 1) return [shen_type_func, shen_user_lambda15856, 1, Arg15855];
  var Arg15855_0 = Arg15855[0];
  return (((Arg15855_0 > 0))
  ? Arg15855_0
  : (0 - Arg15855_0))},
  1,
  [],
  "shen-abs"];
shenjs_functions["shen_shen-abs"] = shen_abs;






shen_magless = [shen_type_func,
  function shen_user_lambda15858(Arg15857) {
  if (Arg15857.length < 2) return [shen_type_func, shen_user_lambda15858, 2, Arg15857];
  var Arg15857_0 = Arg15857[0], Arg15857_1 = Arg15857[1];
  var R0;
  return ((R0 = (Arg15857_1 * 2)),
  (((R0 > Arg15857_0))
  ? Arg15857_1
  : (function() {
  return shenjs_call_tail(shen_magless, [Arg15857_0, R0]);})))},
  2,
  [],
  "shen-magless"];
shenjs_functions["shen_shen-magless"] = shen_magless;






shen_integer_test$question$ = [shen_type_func,
  function shen_user_lambda15860(Arg15859) {
  if (Arg15859.length < 2) return [shen_type_func, shen_user_lambda15860, 2, Arg15859];
  var Arg15859_0 = Arg15859[0], Arg15859_1 = Arg15859[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg15859_0)))
  ? true
  : (((1 > Arg15859_0))
  ? false
  : ((R0 = (Arg15859_0 - Arg15859_1)),
  (((0 > R0))
  ? (function() {
  return shenjs_call_tail(shen_integer$question$, [Arg15859_0]);})
  : (function() {
  return shenjs_call_tail(shen_integer_test$question$, [R0, Arg15859_1]);})))))},
  2,
  [],
  "shen-integer-test?"];
shenjs_functions["shen_shen-integer-test?"] = shen_integer_test$question$;






shen_mapcan = [shen_type_func,
  function shen_user_lambda15862(Arg15861) {
  if (Arg15861.length < 2) return [shen_type_func, shen_user_lambda15862, 2, Arg15861];
  var Arg15861_0 = Arg15861[0], Arg15861_1 = Arg15861[1];
  return ((shenjs_empty$question$(Arg15861_1))
  ? []
  : ((shenjs_is_type(Arg15861_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(Arg15861_0, [Arg15861_1[1]]), shenjs_call(shen_mapcan, [Arg15861_0, Arg15861_1[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "mapcan"]]);})))},
  2,
  [],
  "mapcan"];
shenjs_functions["shen_mapcan"] = shen_mapcan;






shen_read_file_as_bytelist = [shen_type_func,
  function shen_user_lambda15864(Arg15863) {
  if (Arg15863.length < 1) return [shen_type_func, shen_user_lambda15864, 1, Arg15863];
  var Arg15863_0 = Arg15863[0];
  var R0, R1;
  return ((R0 = shenjs_open([shen_type_symbol, "file"], Arg15863_0, [shen_type_symbol, "in"])),
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
  function shen_user_lambda15866(Arg15865) {
  if (Arg15865.length < 3) return [shen_type_func, shen_user_lambda15866, 3, Arg15865];
  var Arg15865_0 = Arg15865[0], Arg15865_1 = Arg15865[1], Arg15865_2 = Arg15865[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(-1, Arg15865_1)))
  ? Arg15865_2
  : (function() {
  return shenjs_call_tail(shen_read_file_as_bytelist_help, [Arg15865_0, shenjs_read_byte(Arg15865_0), [shen_type_cons, Arg15865_1, Arg15865_2]]);}))},
  3,
  [],
  "shen-read-file-as-bytelist-help"];
shenjs_functions["shen_shen-read-file-as-bytelist-help"] = shen_read_file_as_bytelist_help;






shen_read_file_as_string = [shen_type_func,
  function shen_user_lambda15868(Arg15867) {
  if (Arg15867.length < 1) return [shen_type_func, shen_user_lambda15868, 1, Arg15867];
  var Arg15867_0 = Arg15867[0];
  var R0;
  return ((R0 = shenjs_open([shen_type_symbol, "file"], Arg15867_0, [shen_type_symbol, "in"])),
  (function() {
  return shenjs_call_tail(shen_rfas_h, [R0, shenjs_read_byte(R0), ""]);}))},
  1,
  [],
  "read-file-as-string"];
shenjs_functions["shen_read-file-as-string"] = shen_read_file_as_string;






shen_rfas_h = [shen_type_func,
  function shen_user_lambda15870(Arg15869) {
  if (Arg15869.length < 3) return [shen_type_func, shen_user_lambda15870, 3, Arg15869];
  var Arg15869_0 = Arg15869[0], Arg15869_1 = Arg15869[1], Arg15869_2 = Arg15869[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(-1, Arg15869_1)))
  ? (shenjs_close(Arg15869_0),
  Arg15869_2)
  : (function() {
  return shenjs_call_tail(shen_rfas_h, [Arg15869_0, shenjs_read_byte(Arg15869_0), (Arg15869_2 + shenjs_n_$gt$string(Arg15869_1))]);}))},
  3,
  [],
  "shen-rfas-h"];
shenjs_functions["shen_shen-rfas-h"] = shen_rfas_h;






shen_$eq$$eq$ = [shen_type_func,
  function shen_user_lambda15872(Arg15871) {
  if (Arg15871.length < 2) return [shen_type_func, shen_user_lambda15872, 2, Arg15871];
  var Arg15871_0 = Arg15871[0], Arg15871_1 = Arg15871[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg15871_1, Arg15871_0)))
  ? true
  : false)},
  2,
  [],
  "=="];
shenjs_functions["shen_=="] = shen_$eq$$eq$;






shen_abort = [shen_type_func,
  function shen_user_lambda15874(Arg15873) {
  if (Arg15873.length < 0) return [shen_type_func, shen_user_lambda15874, 0, Arg15873];
  return (function() {
  return shenjs_simple_error("");})},
  0,
  [],
  "abort"];
shenjs_functions["shen_abort"] = shen_abort;






shen_read = [shen_type_func,
  function shen_user_lambda15876(Arg15875) {
  if (Arg15875.length < 0) return [shen_type_func, shen_user_lambda15876, 0, Arg15875];
  return shenjs_call(shen_lineread, [])[1]},
  0,
  [],
  "read"];
shenjs_functions["shen_read"] = shen_read;






shen_input = [shen_type_func,
  function shen_user_lambda15878(Arg15877) {
  if (Arg15877.length < 0) return [shen_type_func, shen_user_lambda15878, 0, Arg15877];
  return (function() {
  return shenjs_call_tail(shen_eval, [shenjs_call(shen_read, [])]);})},
  0,
  [],
  "input"];
shenjs_functions["shen_input"] = shen_input;






shen_input$plus$ = [shen_type_func,
  function shen_user_lambda15880(Arg15879) {
  if (Arg15879.length < 2) return [shen_type_func, shen_user_lambda15880, 2, Arg15879];
  var Arg15879_0 = Arg15879[0], Arg15879_1 = Arg15879[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_read, [])),
  (R1 = shenjs_call(shen_typecheck, [R0, Arg15879_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(false, R1)))
  ? (shenjs_call(shen_intoutput, ["input is not of type ~R: please re-enter ", [shen_tuple, Arg15879_1, []]]),
  (function() {
  return shenjs_call_tail(shen_input$plus$, [[shen_type_symbol, ":"], Arg15879_1]);}))
  : (function() {
  return shenjs_call_tail(shen_eval, [R0]);})))},
  2,
  [],
  "input+"];
shenjs_functions["shen_input+"] = shen_input$plus$;






shen_bound$question$ = [shen_type_func,
  function shen_user_lambda15882(Arg15881) {
  if (Arg15881.length < 1) return [shen_type_func, shen_user_lambda15882, 1, Arg15881];
  var Arg15881_0 = Arg15881[0];
  var R0;
  return (shenjs_is_type(Arg15881_0, shen_type_symbol) && ((R0 = shenjs_trap_error(function() {return (shenjs_globals["shen_" + Arg15881_0[1]]);}, [shen_type_func,
  function shen_user_lambda15884(Arg15883) {
  if (Arg15883.length < 1) return [shen_type_func, shen_user_lambda15884, 1, Arg15883];
  var Arg15883_0 = Arg15883[0];
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
  function shen_user_lambda15886(Arg15885) {
  if (Arg15885.length < 1) return [shen_type_func, shen_user_lambda15886, 1, Arg15885];
  var Arg15885_0 = Arg15885[0];
  return ((shenjs_unwind_tail(shenjs_$eq$("", Arg15885_0)))
  ? []
  : [shen_type_cons, shenjs_string_$gt$n(Arg15885_0[0]), shenjs_call(shen_string_$gt$bytes, [shenjs_tlstr(Arg15885_0)])])},
  1,
  [],
  "shen-string->bytes"];
shenjs_functions["shen_shen-string->bytes"] = shen_string_$gt$bytes;






shen_maxinferences = [shen_type_func,
  function shen_user_lambda15888(Arg15887) {
  if (Arg15887.length < 1) return [shen_type_func, shen_user_lambda15888, 1, Arg15887];
  var Arg15887_0 = Arg15887[0];
  return (shenjs_globals["shen_shen-*maxinferences*"] = Arg15887_0)},
  1,
  [],
  "maxinferences"];
shenjs_functions["shen_maxinferences"] = shen_maxinferences;






shen_inferences = [shen_type_func,
  function shen_user_lambda15890(Arg15889) {
  if (Arg15889.length < 1) return [shen_type_func, shen_user_lambda15890, 1, Arg15889];
  var Arg15889_0 = Arg15889[0];
  return (shenjs_globals["shen_shen-*infs*"])},
  1,
  [],
  "inferences"];
shenjs_functions["shen_inferences"] = shen_inferences;






shen_hush = [shen_type_func,
  function shen_user_lambda15892(Arg15891) {
  if (Arg15891.length < 1) return [shen_type_func, shen_user_lambda15892, 1, Arg15891];
  var Arg15891_0 = Arg15891[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg15891_0)))
  ? (shenjs_globals["shen_shen-*hush*"] = [shen_type_symbol, "shen-hushed"])
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg15891_0)))
  ? (shenjs_globals["shen_shen-*hush*"] = [shen_type_symbol, "shen-unhushed"])
  : (function() {
  return shenjs_call_tail(shen_interror, ["'hush' expects a + or a -~%", []]);})))},
  1,
  [],
  "shen-hush"];
shenjs_functions["shen_shen-hush"] = shen_hush;






shen_protect = [shen_type_func,
  function shen_user_lambda15894(Arg15893) {
  if (Arg15893.length < 1) return [shen_type_func, shen_user_lambda15894, 1, Arg15893];
  var Arg15893_0 = Arg15893[0];
  return Arg15893_0},
  1,
  [],
  "protect"];
shenjs_functions["shen_protect"] = shen_protect;






shen_stoutput = [shen_type_func,
  function shen_user_lambda15896(Arg15895) {
  if (Arg15895.length < 1) return [shen_type_func, shen_user_lambda15896, 1, Arg15895];
  var Arg15895_0 = Arg15895[0];
  return (shenjs_globals["shen_*stoutput*"])},
  1,
  [],
  "shen-stoutput"];
shenjs_functions["shen_shen-stoutput"] = shen_stoutput;












shen_datatype_error = [shen_type_func,
  function shen_user_lambda15574(Arg15573) {
  if (Arg15573.length < 1) return [shen_type_func, shen_user_lambda15574, 1, Arg15573];
  var Arg15573_0 = Arg15573[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["datatype syntax error here:~%~% ~A~%", [shen_tuple, shenjs_call(shen_next_50, [50, Arg15573_0]), []]]);})},
  1,
  [],
  "shen-datatype-error"];
shenjs_functions["shen_shen-datatype-error"] = shen_datatype_error;






shen_$lt$datatype_rules$gt$ = [shen_type_func,
  function shen_user_lambda15576(Arg15575) {
  if (Arg15575.length < 1) return [shen_type_func, shen_user_lambda15576, 1, Arg15575];
  var Arg15575_0 = Arg15575[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$datatype_rule$gt$, [Arg15575_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$datatype_rules$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg15575_0])),
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
  function shen_user_lambda15578(Arg15577) {
  if (Arg15577.length < 1) return [shen_type_func, shen_user_lambda15578, 1, Arg15577];
  var Arg15577_0 = Arg15577[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$side_conditions$gt$, [Arg15577_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$side_conditions$gt$, [Arg15577_0])),
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
  function shen_user_lambda15580(Arg15579) {
  if (Arg15579.length < 1) return [shen_type_func, shen_user_lambda15580, 1, Arg15579];
  var Arg15579_0 = Arg15579[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$side_condition$gt$, [Arg15579_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$side_conditions$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg15579_0])),
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
  function shen_user_lambda15582(Arg15581) {
  if (Arg15581.length < 1) return [shen_type_func, shen_user_lambda15582, 1, Arg15581];
  var Arg15581_0 = Arg15581[0];
  var R0, R1;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg15581_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "if"], shenjs_call(shen_fst, [Arg15581_0])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$expr$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15581_0])[2], shenjs_call(shen_snd, [Arg15581_0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, shenjs_call(shen_snd, [R0]), []]]])
  : shen_fail_obj))
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg15581_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], shenjs_call(shen_fst, [Arg15581_0])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$variable$question$$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15581_0])[2], shenjs_call(shen_snd, [Arg15581_0])])])),
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
  function shen_user_lambda15584(Arg15583) {
  if (Arg15583.length < 1) return [shen_type_func, shen_user_lambda15584, 1, Arg15583];
  var Arg15583_0 = Arg15583[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15583_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15583_0])[2], shenjs_call(shen_snd, [Arg15583_0])])]), (((!shenjs_call(shen_variable$question$, [shenjs_call(shen_fst, [Arg15583_0])[1]])))
  ? shen_fail_obj
  : shenjs_call(shen_fst, [Arg15583_0])[1])])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<variable?>"];
shenjs_functions["shen_shen-<variable?>"] = shen_$lt$variable$question$$gt$;






shen_$lt$expr$gt$ = [shen_type_func,
  function shen_user_lambda15586(Arg15585) {
  if (Arg15585.length < 1) return [shen_type_func, shen_user_lambda15586, 1, Arg15585];
  var Arg15585_0 = Arg15585[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15585_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15585_0])[2], shenjs_call(shen_snd, [Arg15585_0])])]), (((shenjs_call(shen_element$question$, [shenjs_call(shen_fst, [Arg15585_0])[1], [shen_type_cons, [shen_type_symbol, ">>"], [shen_type_cons, [shen_type_symbol, ";"], []]]]) || (shenjs_call(shen_singleunderline$question$, [shenjs_call(shen_fst, [Arg15585_0])[1]]) || shenjs_call(shen_doubleunderline$question$, [shenjs_call(shen_fst, [Arg15585_0])[1]]))))
  ? shen_fail_obj
  : shenjs_call(shen_remove_bar, [shenjs_call(shen_fst, [Arg15585_0])[1]]))])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<expr>"];
shenjs_functions["shen_shen-<expr>"] = shen_$lt$expr$gt$;






shen_remove_bar = [shen_type_func,
  function shen_user_lambda15588(Arg15587) {
  if (Arg15587.length < 1) return [shen_type_func, shen_user_lambda15588, 1, Arg15587];
  var Arg15587_0 = Arg15587[0];
  return (((shenjs_is_type(Arg15587_0, shen_type_cons) && (shenjs_is_type(Arg15587_0[2], shen_type_cons) && (shenjs_is_type(Arg15587_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg15587_0[2][2][2]) && shenjs_unwind_tail(shenjs_$eq$(Arg15587_0[2][1], [shen_type_symbol, "bar!"])))))))
  ? [shen_type_cons, Arg15587_0[1], Arg15587_0[2][2][1]]
  : ((shenjs_is_type(Arg15587_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_remove_bar, [Arg15587_0[1]]), shenjs_call(shen_remove_bar, [Arg15587_0[2]])]
  : Arg15587_0))},
  1,
  [],
  "shen-remove-bar"];
shenjs_functions["shen_shen-remove-bar"] = shen_remove_bar;






shen_$lt$premises$gt$ = [shen_type_func,
  function shen_user_lambda15590(Arg15589) {
  if (Arg15589.length < 1) return [shen_type_func, shen_user_lambda15590, 1, Arg15589];
  var Arg15589_0 = Arg15589[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$premise$gt$, [Arg15589_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg15589_0])),
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
  function shen_user_lambda15592(Arg15591) {
  if (Arg15591.length < 1) return [shen_type_func, shen_user_lambda15592, 1, Arg15591];
  var Arg15591_0 = Arg15591[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15591_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15591_0])[2], shenjs_call(shen_snd, [Arg15591_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15591_0])[1], [shen_type_symbol, ";"])))
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
  function shen_user_lambda15594(Arg15593) {
  if (Arg15593.length < 1) return [shen_type_func, shen_user_lambda15594, 1, Arg15593];
  var Arg15593_0 = Arg15593[0];
  var R0, R1;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg15593_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "!"], shenjs_call(shen_fst, [Arg15593_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15593_0])[2], shenjs_call(shen_snd, [Arg15593_0])])]), [shen_type_symbol, "!"]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$formulae$gt$, [Arg15593_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ">>"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$formula$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_tuple, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$formula$gt$, [Arg15593_0])),
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
  function shen_user_lambda15596(Arg15595) {
  if (Arg15595.length < 1) return [shen_type_func, shen_user_lambda15596, 1, Arg15595];
  var Arg15595_0 = Arg15595[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$formulae$gt$, [Arg15595_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$formula$gt$, [Arg15595_0])),
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
  function shen_user_lambda15598(Arg15597) {
  if (Arg15597.length < 1) return [shen_type_func, shen_user_lambda15598, 1, Arg15597];
  var Arg15597_0 = Arg15597[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$formula$gt$, [Arg15597_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$formulae$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$formula$gt$, [Arg15597_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R0]), []]])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg15597_0])),
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
  function shen_user_lambda15600(Arg15599) {
  if (Arg15599.length < 1) return [shen_type_func, shen_user_lambda15600, 1, Arg15599];
  var Arg15599_0 = Arg15599[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$expr$gt$, [Arg15599_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$type$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_curry, [shenjs_call(shen_snd, [R0])]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_normalise_type, [shenjs_call(shen_snd, [R1])]), []]]]])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$expr$gt$, [Arg15599_0])),
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
  function shen_user_lambda15602(Arg15601) {
  if (Arg15601.length < 1) return [shen_type_func, shen_user_lambda15602, 1, Arg15601];
  var Arg15601_0 = Arg15601[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15601_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15601_0])[2], shenjs_call(shen_snd, [Arg15601_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15601_0])[1], [shen_type_symbol, ";"])))
  ? shenjs_call(shen_fst, [Arg15601_0])[1]
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
  function shen_user_lambda15604(Arg15603) {
  if (Arg15603.length < 1) return [shen_type_func, shen_user_lambda15604, 1, Arg15603];
  var Arg15603_0 = Arg15603[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$expr$gt$, [Arg15603_0])),
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
  function shen_user_lambda15606(Arg15605) {
  if (Arg15605.length < 1) return [shen_type_func, shen_user_lambda15606, 1, Arg15605];
  var Arg15605_0 = Arg15605[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15605_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15605_0])[2], shenjs_call(shen_snd, [Arg15605_0])])]), ((shenjs_call(shen_doubleunderline$question$, [shenjs_call(shen_fst, [Arg15605_0])[1]]))
  ? shenjs_call(shen_fst, [Arg15605_0])[1]
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
  function shen_user_lambda15608(Arg15607) {
  if (Arg15607.length < 1) return [shen_type_func, shen_user_lambda15608, 1, Arg15607];
  var Arg15607_0 = Arg15607[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15607_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15607_0])[2], shenjs_call(shen_snd, [Arg15607_0])])]), ((shenjs_call(shen_singleunderline$question$, [shenjs_call(shen_fst, [Arg15607_0])[1]]))
  ? shenjs_call(shen_fst, [Arg15607_0])[1]
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
  function shen_user_lambda15610(Arg15609) {
  if (Arg15609.length < 1) return [shen_type_func, shen_user_lambda15610, 1, Arg15609];
  var Arg15609_0 = Arg15609[0];
  return (shenjs_is_type(Arg15609_0, shen_type_symbol) && shenjs_call(shen_sh$question$, [shenjs_str(Arg15609_0)]))},
  1,
  [],
  "shen-singleunderline?"];
shenjs_functions["shen_shen-singleunderline?"] = shen_singleunderline$question$;






shen_sh$question$ = [shen_type_func,
  function shen_user_lambda15612(Arg15611) {
  if (Arg15611.length < 1) return [shen_type_func, shen_user_lambda15612, 1, Arg15611];
  var Arg15611_0 = Arg15611[0];
  return ((shenjs_unwind_tail(shenjs_$eq$("_", Arg15611_0)))
  ? true
  : (shenjs_unwind_tail(shenjs_$eq$(Arg15611_0[0], "_")) && shenjs_call(shen_sh$question$, [shenjs_tlstr(Arg15611_0)])))},
  1,
  [],
  "shen-sh?"];
shenjs_functions["shen_shen-sh?"] = shen_sh$question$;






shen_doubleunderline$question$ = [shen_type_func,
  function shen_user_lambda15614(Arg15613) {
  if (Arg15613.length < 1) return [shen_type_func, shen_user_lambda15614, 1, Arg15613];
  var Arg15613_0 = Arg15613[0];
  return (shenjs_is_type(Arg15613_0, shen_type_symbol) && shenjs_call(shen_dh$question$, [shenjs_str(Arg15613_0)]))},
  1,
  [],
  "shen-doubleunderline?"];
shenjs_functions["shen_shen-doubleunderline?"] = shen_doubleunderline$question$;






shen_dh$question$ = [shen_type_func,
  function shen_user_lambda15616(Arg15615) {
  if (Arg15615.length < 1) return [shen_type_func, shen_user_lambda15616, 1, Arg15615];
  var Arg15615_0 = Arg15615[0];
  return ((shenjs_unwind_tail(shenjs_$eq$("=", Arg15615_0)))
  ? true
  : (shenjs_unwind_tail(shenjs_$eq$(Arg15615_0[0], "=")) && shenjs_call(shen_dh$question$, [shenjs_tlstr(Arg15615_0)])))},
  1,
  [],
  "shen-dh?"];
shenjs_functions["shen_shen-dh?"] = shen_dh$question$;






shen_process_datatype = [shen_type_func,
  function shen_user_lambda15618(Arg15617) {
  if (Arg15617.length < 2) return [shen_type_func, shen_user_lambda15618, 2, Arg15617];
  var Arg15617_0 = Arg15617[0], Arg15617_1 = Arg15617[1];
  return (function() {
  return shenjs_call_tail(shen_remember_datatype, [shenjs_call(shen_s_prolog, [shenjs_call(shen_rules_$gt$horn_clauses, [Arg15617_0, Arg15617_1])])]);})},
  2,
  [],
  "shen-process-datatype"];
shenjs_functions["shen_shen-process-datatype"] = shen_process_datatype;






shen_remember_datatype = [shen_type_func,
  function shen_user_lambda15620(Arg15619) {
  if (Arg15619.length < 1) return [shen_type_func, shen_user_lambda15620, 1, Arg15619];
  var Arg15619_0 = Arg15619[0];
  return ((shenjs_is_type(Arg15619_0, shen_type_cons))
  ? ((shenjs_globals["shen_shen-*datatypes*"] = shenjs_call(shen_adjoin, [Arg15619_0[1], (shenjs_globals["shen_shen-*datatypes*"])])),
  (shenjs_globals["shen_shen-*alldatatypes*"] = shenjs_call(shen_adjoin, [Arg15619_0[1], (shenjs_globals["shen_shen-*alldatatypes*"])])),
  Arg15619_0[1])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-remember-datatype"]]);}))},
  1,
  [],
  "shen-remember-datatype"];
shenjs_functions["shen_shen-remember-datatype"] = shen_remember_datatype;






shen_rules_$gt$horn_clauses = [shen_type_func,
  function shen_user_lambda15622(Arg15621) {
  if (Arg15621.length < 2) return [shen_type_func, shen_user_lambda15622, 2, Arg15621];
  var Arg15621_0 = Arg15621[0], Arg15621_1 = Arg15621[1];
  return ((shenjs_empty$question$(Arg15621_1))
  ? []
  : (((shenjs_is_type(Arg15621_1, shen_type_cons) && (shenjs_is_type(Arg15621_1[1], shen_tuple) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-single"], shenjs_call(shen_fst, [Arg15621_1[1]]))))))
  ? [shen_type_cons, shenjs_call(shen_rule_$gt$horn_clause, [Arg15621_0, shenjs_call(shen_snd, [Arg15621_1[1]])]), shenjs_call(shen_rules_$gt$horn_clauses, [Arg15621_0, Arg15621_1[2]])]
  : (((shenjs_is_type(Arg15621_1, shen_type_cons) && (shenjs_is_type(Arg15621_1[1], shen_tuple) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-double"], shenjs_call(shen_fst, [Arg15621_1[1]]))))))
  ? (function() {
  return shenjs_call_tail(shen_rules_$gt$horn_clauses, [Arg15621_0, shenjs_call(shen_append, [shenjs_call(shen_double_$gt$singles, [shenjs_call(shen_snd, [Arg15621_1[1]])]), Arg15621_1[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-rules->horn-clauses"]]);}))))},
  2,
  [],
  "shen-rules->horn-clauses"];
shenjs_functions["shen_shen-rules->horn-clauses"] = shen_rules_$gt$horn_clauses;






shen_double_$gt$singles = [shen_type_func,
  function shen_user_lambda15624(Arg15623) {
  if (Arg15623.length < 1) return [shen_type_func, shen_user_lambda15624, 1, Arg15623];
  var Arg15623_0 = Arg15623[0];
  return [shen_type_cons, shenjs_call(shen_right_rule, [Arg15623_0]), [shen_type_cons, shenjs_call(shen_left_rule, [Arg15623_0]), []]]},
  1,
  [],
  "shen-double->singles"];
shenjs_functions["shen_shen-double->singles"] = shen_double_$gt$singles;






shen_right_rule = [shen_type_func,
  function shen_user_lambda15626(Arg15625) {
  if (Arg15625.length < 1) return [shen_type_func, shen_user_lambda15626, 1, Arg15625];
  var Arg15625_0 = Arg15625[0];
  return [shen_tuple, [shen_type_symbol, "shen-single"], Arg15625_0]},
  1,
  [],
  "shen-right-rule"];
shenjs_functions["shen_shen-right-rule"] = shen_right_rule;






shen_left_rule = [shen_type_func,
  function shen_user_lambda15628(Arg15627) {
  if (Arg15627.length < 1) return [shen_type_func, shen_user_lambda15628, 1, Arg15627];
  var Arg15627_0 = Arg15627[0];
  var R0, R1;
  return (((shenjs_is_type(Arg15627_0, shen_type_cons) && (shenjs_is_type(Arg15627_0[2], shen_type_cons) && (shenjs_is_type(Arg15627_0[2][2], shen_type_cons) && (shenjs_is_type(Arg15627_0[2][2][1], shen_tuple) && (shenjs_empty$question$(shenjs_call(shen_fst, [Arg15627_0[2][2][1]])) && shenjs_empty$question$(Arg15627_0[2][2][2])))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "Qv"]])),
  (R1 = [shen_tuple, [shen_type_cons, shenjs_call(shen_snd, [Arg15627_0[2][2][1]]), []], R0]),
  (R0 = [shen_type_cons, [shen_tuple, shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15630(Arg15629) {
  if (Arg15629.length < 1) return [shen_type_func, shen_user_lambda15630, 1, Arg15629];
  var Arg15629_0 = Arg15629[0];
  return (function() {
  return shenjs_call_tail(shen_right_$gt$left, [Arg15629_0]);})},
  1,
  []], Arg15627_0[2][1]]), R0], []]),
  [shen_tuple, [shen_type_symbol, "shen-single"], [shen_type_cons, Arg15627_0[1], [shen_type_cons, R0, [shen_type_cons, R1, []]]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-left-rule"]]);}))},
  1,
  [],
  "shen-left-rule"];
shenjs_functions["shen_shen-left-rule"] = shen_left_rule;






shen_right_$gt$left = [shen_type_func,
  function shen_user_lambda15632(Arg15631) {
  if (Arg15631.length < 1) return [shen_type_func, shen_user_lambda15632, 1, Arg15631];
  var Arg15631_0 = Arg15631[0];
  return (((shenjs_is_type(Arg15631_0, shen_tuple) && shenjs_empty$question$(shenjs_call(shen_fst, [Arg15631_0]))))
  ? (function() {
  return shenjs_call_tail(shen_snd, [Arg15631_0]);})
  : (function() {
  return shenjs_call_tail(shen_interror, ["syntax error with ==========~%", []]);}))},
  1,
  [],
  "shen-right->left"];
shenjs_functions["shen_shen-right->left"] = shen_right_$gt$left;






shen_rule_$gt$horn_clause = [shen_type_func,
  function shen_user_lambda15634(Arg15633) {
  if (Arg15633.length < 2) return [shen_type_func, shen_user_lambda15634, 2, Arg15633];
  var Arg15633_0 = Arg15633[0], Arg15633_1 = Arg15633[1];
  return (((shenjs_is_type(Arg15633_1, shen_type_cons) && (shenjs_is_type(Arg15633_1[2], shen_type_cons) && (shenjs_is_type(Arg15633_1[2][2], shen_type_cons) && (shenjs_is_type(Arg15633_1[2][2][1], shen_tuple) && shenjs_empty$question$(Arg15633_1[2][2][2]))))))
  ? [shen_type_cons, shenjs_call(shen_rule_$gt$horn_clause_head, [Arg15633_0, shenjs_call(shen_snd, [Arg15633_1[2][2][1]])]), [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, shenjs_call(shen_rule_$gt$horn_clause_body, [Arg15633_1[1], Arg15633_1[2][1], shenjs_call(shen_fst, [Arg15633_1[2][2][1]])]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-rule->horn-clause"]]);}))},
  2,
  [],
  "shen-rule->horn-clause"];
shenjs_functions["shen_shen-rule->horn-clause"] = shen_rule_$gt$horn_clause;






shen_rule_$gt$horn_clause_head = [shen_type_func,
  function shen_user_lambda15636(Arg15635) {
  if (Arg15635.length < 2) return [shen_type_func, shen_user_lambda15636, 2, Arg15635];
  var Arg15635_0 = Arg15635[0], Arg15635_1 = Arg15635[1];
  return [shen_type_cons, Arg15635_0, [shen_type_cons, shenjs_call(shen_mode_ify, [Arg15635_1]), [shen_type_cons, [shen_type_symbol, "Context_1957"], []]]]},
  2,
  [],
  "shen-rule->horn-clause-head"];
shenjs_functions["shen_shen-rule->horn-clause-head"] = shen_rule_$gt$horn_clause_head;






shen_mode_ify = [shen_type_func,
  function shen_user_lambda15638(Arg15637) {
  if (Arg15637.length < 1) return [shen_type_func, shen_user_lambda15638, 1, Arg15637];
  var Arg15637_0 = Arg15637[0];
  return (((shenjs_is_type(Arg15637_0, shen_type_cons) && (shenjs_is_type(Arg15637_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], Arg15637_0[2][1])) && (shenjs_is_type(Arg15637_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15637_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, [shen_type_cons, Arg15637_0[1], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg15637_0[2][2][1], [shen_type_cons, [shen_type_symbol, "+"], []]]], []]]], [shen_type_cons, [shen_type_symbol, "-"], []]]]
  : Arg15637_0)},
  1,
  [],
  "shen-mode-ify"];
shenjs_functions["shen_shen-mode-ify"] = shen_mode_ify;






shen_rule_$gt$horn_clause_body = [shen_type_func,
  function shen_user_lambda15640(Arg15639) {
  if (Arg15639.length < 3) return [shen_type_func, shen_user_lambda15640, 3, Arg15639];
  var Arg15639_0 = Arg15639[0], Arg15639_1 = Arg15639[1], Arg15639_2 = Arg15639[2];
  var R0, R1, R2;
  return ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15642(Arg15641) {
  if (Arg15641.length < 1) return [shen_type_func, shen_user_lambda15642, 1, Arg15641];
  var Arg15641_0 = Arg15641[0];
  return (function() {
  return shenjs_call_tail(shen_extract$_vars, [Arg15641_0]);})},
  1,
  []], Arg15639_2])),
  (R1 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15644(Arg15643) {
  if (Arg15643.length < 1) return [shen_type_func, shen_user_lambda15644, 1, Arg15643];
  var Arg15643_0 = Arg15643[0];
  return (function() {
  return shenjs_call_tail(shen_gensym, [[shen_type_symbol, "shen-cl"]]);})},
  1,
  []], Arg15639_2])),
  (R2 = shenjs_call(shen_construct_search_literals, [R1, R0, [shen_type_symbol, "Context_1957"], [shen_type_symbol, "Context1_1957"]])),
  shenjs_call(shen_construct_search_clauses, [R1, Arg15639_2, R0]),
  (R1 = shenjs_call(shen_construct_side_literals, [Arg15639_0])),
  (R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15646(Arg15645) {
  if (Arg15645.length < 2) return [shen_type_func, shen_user_lambda15646, 2, Arg15645];
  var Arg15645_0 = Arg15645[0], Arg15645_1 = Arg15645[1];
  return (function() {
  return shenjs_call_tail(shen_construct_premiss_literal, [Arg15645_1, shenjs_empty$question$(Arg15645_0)]);})},
  2,
  [Arg15639_2]], Arg15639_1])),
  (function() {
  return shenjs_call_tail(shen_append, [R2, shenjs_call(shen_append, [R1, R0])]);}))},
  3,
  [],
  "shen-rule->horn-clause-body"];
shenjs_functions["shen_shen-rule->horn-clause-body"] = shen_rule_$gt$horn_clause_body;






shen_construct_search_literals = [shen_type_func,
  function shen_user_lambda15648(Arg15647) {
  if (Arg15647.length < 4) return [shen_type_func, shen_user_lambda15648, 4, Arg15647];
  var Arg15647_0 = Arg15647[0], Arg15647_1 = Arg15647[1], Arg15647_2 = Arg15647[2], Arg15647_3 = Arg15647[3];
  return (((shenjs_empty$question$(Arg15647_0) && shenjs_empty$question$(Arg15647_1)))
  ? []
  : (function() {
  return shenjs_call_tail(shen_csl_help, [Arg15647_0, Arg15647_1, Arg15647_2, Arg15647_3]);}))},
  4,
  [],
  "shen-construct-search-literals"];
shenjs_functions["shen_shen-construct-search-literals"] = shen_construct_search_literals;






shen_csl_help = [shen_type_func,
  function shen_user_lambda15650(Arg15649) {
  if (Arg15649.length < 4) return [shen_type_func, shen_user_lambda15650, 4, Arg15649];
  var Arg15649_0 = Arg15649[0], Arg15649_1 = Arg15649[1], Arg15649_2 = Arg15649[2], Arg15649_3 = Arg15649[3];
  return (((shenjs_empty$question$(Arg15649_0) && shenjs_empty$question$(Arg15649_1)))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, [shen_type_symbol, "ContextOut_1957"], [shen_type_cons, Arg15649_2, []]]], []]
  : (((shenjs_is_type(Arg15649_0, shen_type_cons) && shenjs_is_type(Arg15649_1, shen_type_cons)))
  ? [shen_type_cons, [shen_type_cons, Arg15649_0[1], [shen_type_cons, Arg15649_2, [shen_type_cons, Arg15649_3, Arg15649_1[1]]]], shenjs_call(shen_csl_help, [Arg15649_0[2], Arg15649_1[2], Arg15649_3, shenjs_call(shen_gensym, [[shen_type_symbol, "Context"]])])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-csl-help"]]);})))},
  4,
  [],
  "shen-csl-help"];
shenjs_functions["shen_shen-csl-help"] = shen_csl_help;






shen_construct_search_clauses = [shen_type_func,
  function shen_user_lambda15652(Arg15651) {
  if (Arg15651.length < 3) return [shen_type_func, shen_user_lambda15652, 3, Arg15651];
  var Arg15651_0 = Arg15651[0], Arg15651_1 = Arg15651[1], Arg15651_2 = Arg15651[2];
  return (((shenjs_empty$question$(Arg15651_0) && (shenjs_empty$question$(Arg15651_1) && shenjs_empty$question$(Arg15651_2))))
  ? [shen_type_symbol, "shen-skip"]
  : (((shenjs_is_type(Arg15651_0, shen_type_cons) && (shenjs_is_type(Arg15651_1, shen_type_cons) && shenjs_is_type(Arg15651_2, shen_type_cons))))
  ? (shenjs_call(shen_construct_search_clause, [Arg15651_0[1], Arg15651_1[1], Arg15651_2[1]]),
  (function() {
  return shenjs_call_tail(shen_construct_search_clauses, [Arg15651_0[2], Arg15651_1[2], Arg15651_2[2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-construct-search-clauses"]]);})))},
  3,
  [],
  "shen-construct-search-clauses"];
shenjs_functions["shen_shen-construct-search-clauses"] = shen_construct_search_clauses;






shen_construct_search_clause = [shen_type_func,
  function shen_user_lambda15654(Arg15653) {
  if (Arg15653.length < 3) return [shen_type_func, shen_user_lambda15654, 3, Arg15653];
  var Arg15653_0 = Arg15653[0], Arg15653_1 = Arg15653[1], Arg15653_2 = Arg15653[2];
  return (function() {
  return shenjs_call_tail(shen_s_prolog, [[shen_type_cons, shenjs_call(shen_construct_base_search_clause, [Arg15653_0, Arg15653_1, Arg15653_2]), [shen_type_cons, shenjs_call(shen_construct_recursive_search_clause, [Arg15653_0, Arg15653_1, Arg15653_2]), []]]]);})},
  3,
  [],
  "shen-construct-search-clause"];
shenjs_functions["shen_shen-construct-search-clause"] = shen_construct_search_clause;






shen_construct_base_search_clause = [shen_type_func,
  function shen_user_lambda15656(Arg15655) {
  if (Arg15655.length < 3) return [shen_type_func, shen_user_lambda15656, 3, Arg15655];
  var Arg15655_0 = Arg15655[0], Arg15655_1 = Arg15655[1], Arg15655_2 = Arg15655[2];
  return [shen_type_cons, [shen_type_cons, Arg15655_0, [shen_type_cons, [shen_type_cons, shenjs_call(shen_mode_ify, [Arg15655_1]), [shen_type_symbol, "In_1957"]], [shen_type_cons, [shen_type_symbol, "In_1957"], Arg15655_2]]], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [], []]]]},
  3,
  [],
  "shen-construct-base-search-clause"];
shenjs_functions["shen_shen-construct-base-search-clause"] = shen_construct_base_search_clause;






shen_construct_recursive_search_clause = [shen_type_func,
  function shen_user_lambda15658(Arg15657) {
  if (Arg15657.length < 3) return [shen_type_func, shen_user_lambda15658, 3, Arg15657];
  var Arg15657_0 = Arg15657[0], Arg15657_1 = Arg15657[1], Arg15657_2 = Arg15657[2];
  return [shen_type_cons, [shen_type_cons, Arg15657_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "Assumption_1957"], [shen_type_symbol, "Assumptions_1957"]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "Assumption_1957"], [shen_type_symbol, "Out_1957"]], Arg15657_2]]], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [shen_type_cons, [shen_type_cons, Arg15657_0, [shen_type_cons, [shen_type_symbol, "Assumptions_1957"], [shen_type_cons, [shen_type_symbol, "Out_1957"], Arg15657_2]]], []], []]]]},
  3,
  [],
  "shen-construct-recursive-search-clause"];
shenjs_functions["shen_shen-construct-recursive-search-clause"] = shen_construct_recursive_search_clause;






shen_construct_side_literals = [shen_type_func,
  function shen_user_lambda15660(Arg15659) {
  if (Arg15659.length < 1) return [shen_type_func, shen_user_lambda15660, 1, Arg15659];
  var Arg15659_0 = Arg15659[0];
  return ((shenjs_empty$question$(Arg15659_0))
  ? []
  : (((shenjs_is_type(Arg15659_0, shen_type_cons) && (shenjs_is_type(Arg15659_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "if"], Arg15659_0[1][1])) && (shenjs_is_type(Arg15659_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg15659_0[1][2][2]))))))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "when"], Arg15659_0[1][2]], shenjs_call(shen_construct_side_literals, [Arg15659_0[2]])]
  : (((shenjs_is_type(Arg15659_0, shen_type_cons) && (shenjs_is_type(Arg15659_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg15659_0[1][1])) && (shenjs_is_type(Arg15659_0[1][2], shen_type_cons) && (shenjs_is_type(Arg15659_0[1][2][2], shen_type_cons) && shenjs_empty$question$(Arg15659_0[1][2][2][2])))))))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "is"], Arg15659_0[1][2]], shenjs_call(shen_construct_side_literals, [Arg15659_0[2]])]
  : ((shenjs_is_type(Arg15659_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_construct_side_literals, [Arg15659_0[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-construct-side-literals"]]);})))))},
  1,
  [],
  "shen-construct-side-literals"];
shenjs_functions["shen_shen-construct-side-literals"] = shen_construct_side_literals;






shen_construct_premiss_literal = [shen_type_func,
  function shen_user_lambda15662(Arg15661) {
  if (Arg15661.length < 2) return [shen_type_func, shen_user_lambda15662, 2, Arg15661];
  var Arg15661_0 = Arg15661[0], Arg15661_1 = Arg15661[1];
  return ((shenjs_is_type(Arg15661_0, shen_tuple))
  ? [shen_type_cons, [shen_type_symbol, "shen-t*"], [shen_type_cons, shenjs_call(shen_recursive$_cons$_form, [shenjs_call(shen_snd, [Arg15661_0])]), [shen_type_cons, shenjs_call(shen_construct_context, [Arg15661_1, shenjs_call(shen_fst, [Arg15661_0])]), []]]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "!"], Arg15661_0)))
  ? [shen_type_cons, [shen_type_symbol, "cut"], [shen_type_cons, [shen_type_symbol, "Throwcontrol"], []]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-construct-premiss-literal"]]);})))},
  2,
  [],
  "shen-construct-premiss-literal"];
shenjs_functions["shen_shen-construct-premiss-literal"] = shen_construct_premiss_literal;






shen_construct_context = [shen_type_func,
  function shen_user_lambda15664(Arg15663) {
  if (Arg15663.length < 2) return [shen_type_func, shen_user_lambda15664, 2, Arg15663];
  var Arg15663_0 = Arg15663[0], Arg15663_1 = Arg15663[1];
  return (((shenjs_unwind_tail(shenjs_$eq$(true, Arg15663_0)) && shenjs_empty$question$(Arg15663_1)))
  ? [shen_type_symbol, "Context_1957"]
  : (((shenjs_unwind_tail(shenjs_$eq$(false, Arg15663_0)) && shenjs_empty$question$(Arg15663_1)))
  ? [shen_type_symbol, "ContextOut_1957"]
  : ((shenjs_is_type(Arg15663_1, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, shenjs_call(shen_recursive$_cons$_form, [Arg15663_1[1]]), [shen_type_cons, shenjs_call(shen_construct_context, [Arg15663_0, Arg15663_1[2]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-construct-context"]]);}))))},
  2,
  [],
  "shen-construct-context"];
shenjs_functions["shen_shen-construct-context"] = shen_construct_context;






shen_recursive$_cons$_form = [shen_type_func,
  function shen_user_lambda15666(Arg15665) {
  if (Arg15665.length < 1) return [shen_type_func, shen_user_lambda15666, 1, Arg15665];
  var Arg15665_0 = Arg15665[0];
  return ((shenjs_is_type(Arg15665_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, shenjs_call(shen_recursive$_cons$_form, [Arg15665_0[1]]), [shen_type_cons, shenjs_call(shen_recursive$_cons$_form, [Arg15665_0[2]]), []]]]
  : Arg15665_0)},
  1,
  [],
  "shen-recursive_cons_form"];
shenjs_functions["shen_shen-recursive_cons_form"] = shen_recursive$_cons$_form;






shen_preclude = [shen_type_func,
  function shen_user_lambda15668(Arg15667) {
  if (Arg15667.length < 1) return [shen_type_func, shen_user_lambda15668, 1, Arg15667];
  var Arg15667_0 = Arg15667[0];
  return ((shenjs_globals["shen_shen-*datatypes*"] = shenjs_call(shen_difference, [(shenjs_globals["shen_shen-*datatypes*"]), Arg15667_0])),
  (shenjs_globals["shen_shen-*datatypes*"]))},
  1,
  [],
  "preclude"];
shenjs_functions["shen_preclude"] = shen_preclude;






shen_include = [shen_type_func,
  function shen_user_lambda15670(Arg15669) {
  if (Arg15669.length < 1) return [shen_type_func, shen_user_lambda15670, 1, Arg15669];
  var Arg15669_0 = Arg15669[0];
  var R0;
  return ((R0 = shenjs_call(shen_intersection, [Arg15669_0, (shenjs_globals["shen_shen-*alldatatypes*"])])),
  (shenjs_globals["shen_shen-*datatypes*"] = shenjs_call(shen_union, [R0, (shenjs_globals["shen_shen-*datatypes*"])])),
  (shenjs_globals["shen_shen-*datatypes*"]))},
  1,
  [],
  "include"];
shenjs_functions["shen_include"] = shen_include;






shen_preclude_all_but = [shen_type_func,
  function shen_user_lambda15672(Arg15671) {
  if (Arg15671.length < 1) return [shen_type_func, shen_user_lambda15672, 1, Arg15671];
  var Arg15671_0 = Arg15671[0];
  return (function() {
  return shenjs_call_tail(shen_preclude, [shenjs_call(shen_difference, [(shenjs_globals["shen_shen-*alldatatypes*"]), Arg15671_0])]);})},
  1,
  [],
  "preclude-all-but"];
shenjs_functions["shen_preclude-all-but"] = shen_preclude_all_but;






shen_include_all_but = [shen_type_func,
  function shen_user_lambda15674(Arg15673) {
  if (Arg15673.length < 1) return [shen_type_func, shen_user_lambda15674, 1, Arg15673];
  var Arg15673_0 = Arg15673[0];
  return (function() {
  return shenjs_call_tail(shen_include, [shenjs_call(shen_difference, [(shenjs_globals["shen_shen-*alldatatypes*"]), Arg15673_0])]);})},
  1,
  [],
  "include-all-but"];
shenjs_functions["shen_include-all-but"] = shen_include_all_but;






shen_synonyms_help = [shen_type_func,
  function shen_user_lambda15676(Arg15675) {
  if (Arg15675.length < 1) return [shen_type_func, shen_user_lambda15676, 1, Arg15675];
  var Arg15675_0 = Arg15675[0];
  return ((shenjs_empty$question$(Arg15675_0))
  ? [shen_type_symbol, "synonyms"]
  : (((shenjs_is_type(Arg15675_0, shen_type_cons) && shenjs_is_type(Arg15675_0[2], shen_type_cons)))
  ? (shenjs_call(shen_pushnew, [[shen_type_cons, Arg15675_0[1], Arg15675_0[2][1]], [shen_type_symbol, "shen-*synonyms*"]]),
  (function() {
  return shenjs_call_tail(shen_synonyms_help, [Arg15675_0[2][2]]);}))
  : (function() {
  return shenjs_call_tail(shen_interror, ["odd number of synonyms~%", [shen_tuple, [], []]]);})))},
  1,
  [],
  "shen-synonyms-help"];
shenjs_functions["shen_shen-synonyms-help"] = shen_synonyms_help;






shen_pushnew = [shen_type_func,
  function shen_user_lambda15678(Arg15677) {
  if (Arg15677.length < 2) return [shen_type_func, shen_user_lambda15678, 2, Arg15677];
  var Arg15677_0 = Arg15677[0], Arg15677_1 = Arg15677[1];
  return ((shenjs_call(shen_element$question$, [Arg15677_0, (shenjs_globals["shen_" + Arg15677_1[1]])]))
  ? (shenjs_globals["shen_" + Arg15677_1[1]])
  : (shenjs_globals["shen_" + Arg15677_1[1]] = [shen_type_cons, Arg15677_0, (shenjs_globals["shen_" + Arg15677_1[1]])]))},
  2,
  [],
  "shen-pushnew"];
shenjs_functions["shen_shen-pushnew"] = shen_pushnew;












shen_yacc = [shen_type_func,
  function shen_user_lambda16642(Arg16641) {
  if (Arg16641.length < 1) return [shen_type_func, shen_user_lambda16642, 1, Arg16641];
  var Arg16641_0 = Arg16641[0];
  return (((shenjs_is_type(Arg16641_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defcc"], Arg16641_0[1])) && shenjs_is_type(Arg16641_0[2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_yacc_$gt$shen, [Arg16641_0[2][1], Arg16641_0[2][2], shenjs_call(shen_extract_segvars, [Arg16641_0[2][2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-yacc"]]);}))},
  1,
  [],
  "shen-yacc"];
shenjs_functions["shen_shen-yacc"] = shen_yacc;






shen_extract_segvars = [shen_type_func,
  function shen_user_lambda16644(Arg16643) {
  if (Arg16643.length < 1) return [shen_type_func, shen_user_lambda16644, 1, Arg16643];
  var Arg16643_0 = Arg16643[0];
  return ((shenjs_call(shen_segvar$question$, [Arg16643_0]))
  ? [shen_type_cons, Arg16643_0, []]
  : ((shenjs_is_type(Arg16643_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_union, [shenjs_call(shen_extract_segvars, [Arg16643_0[1]]), shenjs_call(shen_extract_segvars, [Arg16643_0[2]])]);})
  : []))},
  1,
  [],
  "shen-extract-segvars"];
shenjs_functions["shen_shen-extract-segvars"] = shen_extract_segvars;






shen_yacc_$gt$shen = [shen_type_func,
  function shen_user_lambda16646(Arg16645) {
  if (Arg16645.length < 3) return [shen_type_func, shen_user_lambda16646, 3, Arg16645];
  var Arg16645_0 = Arg16645[0], Arg16645_1 = Arg16645[1], Arg16645_2 = Arg16645[2];
  var R0;
  return ((R0 = [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg16645_0, shenjs_call(shen_yacc$_cases, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda16648(Arg16647) {
  if (Arg16647.length < 1) return [shen_type_func, shen_user_lambda16648, 1, Arg16647];
  var Arg16647_0 = Arg16647[0];
  return (function() {
  return shenjs_call_tail(shen_cc$_body, [Arg16647_0]);})},
  1,
  []], shenjs_call(shen_split$_cc$_rules, [Arg16645_1, []])])])]]),
  ((shenjs_empty$question$(Arg16645_2))
  ? R0
  : [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, [shen_type_symbol, "null"], [shen_type_cons, [], [shen_type_cons, R0, shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda16650(Arg16649) {
  if (Arg16649.length < 1) return [shen_type_func, shen_user_lambda16650, 1, Arg16649];
  var Arg16649_0 = Arg16649[0];
  return (function() {
  return shenjs_call_tail(shen_segdef, [Arg16649_0]);})},
  1,
  []], Arg16645_2])]]]]))},
  3,
  [],
  "shen-yacc->shen"];
shenjs_functions["shen_shen-yacc->shen"] = shen_yacc_$gt$shen;






shen_segdef = [shen_type_func,
  function shen_user_lambda16652(Arg16651) {
  if (Arg16651.length < 1) return [shen_type_func, shen_user_lambda16652, 1, Arg16651];
  var Arg16651_0 = Arg16651[0];
  return [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg16651_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "In"], [shen_type_cons, [shen_type_symbol, "Out"], []]]], [shen_type_cons, [shen_type_symbol, "Continuation"], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Continue"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "Continuation"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "reverse"], [shen_type_cons, [shen_type_symbol, "Out"], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "In"], [shen_type_cons, [], []]]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "Continue"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_symbol, "In"], []]], []]]], [shen_type_cons, [shen_type_cons, Arg16651_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_symbol, "In"], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_symbol, "In"], []]], [shen_type_cons, [shen_type_symbol, "Out"], []]]], []]]], [shen_type_cons, [shen_type_symbol, "Continuation"], []]]], [shen_type_cons, [shen_type_symbol, "Continue"], []]]]], []]]]], []]]]]]]},
  1,
  [],
  "shen-segdef"];
shenjs_functions["shen_shen-segdef"] = shen_segdef;






shen_yacc$_cases = [shen_type_func,
  function shen_user_lambda16654(Arg16653) {
  if (Arg16653.length < 1) return [shen_type_func, shen_user_lambda16654, 1, Arg16653];
  var Arg16653_0 = Arg16653[0];
  return (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(shen_mapcan, [[shen_type_func,
  function shen_user_lambda16656(Arg16655) {
  if (Arg16655.length < 1) return [shen_type_func, shen_user_lambda16656, 1, Arg16655];
  var Arg16655_0 = Arg16655[0];
  return [shen_type_cons, [shen_type_symbol, "Stream"], [shen_type_cons, [shen_type_symbol, "<-"], [shen_type_cons, Arg16655_0, []]]]},
  1,
  []], Arg16653_0]), [shen_type_cons, [shen_type_symbol, "_"], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]]]]);})},
  1,
  [],
  "shen-yacc_cases"];
shenjs_functions["shen_shen-yacc_cases"] = shen_yacc$_cases;






shen_first$_n = [shen_type_func,
  function shen_user_lambda16658(Arg16657) {
  if (Arg16657.length < 2) return [shen_type_func, shen_user_lambda16658, 2, Arg16657];
  var Arg16657_0 = Arg16657[0], Arg16657_1 = Arg16657[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg16657_0)))
  ? []
  : ((shenjs_empty$question$(Arg16657_1))
  ? []
  : ((shenjs_is_type(Arg16657_1, shen_type_cons))
  ? [shen_type_cons, Arg16657_1[1], shenjs_call(shen_first$_n, [(Arg16657_0 - 1), Arg16657_1[2]])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-first_n"]]);}))))},
  2,
  [],
  "shen-first_n"];
shenjs_functions["shen_shen-first_n"] = shen_first$_n;






shen_split$_cc$_rules = [shen_type_func,
  function shen_user_lambda16660(Arg16659) {
  if (Arg16659.length < 2) return [shen_type_func, shen_user_lambda16660, 2, Arg16659];
  var Arg16659_0 = Arg16659[0], Arg16659_1 = Arg16659[1];
  return (((shenjs_empty$question$(Arg16659_0) && shenjs_empty$question$(Arg16659_1)))
  ? []
  : ((shenjs_empty$question$(Arg16659_0))
  ? [shen_type_cons, shenjs_call(shen_split$_cc$_rule, [shenjs_call(shen_reverse, [Arg16659_1]), []]), []]
  : (((shenjs_is_type(Arg16659_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ";"], Arg16659_0[1]))))
  ? [shen_type_cons, shenjs_call(shen_split$_cc$_rule, [shenjs_call(shen_reverse, [Arg16659_1]), []]), shenjs_call(shen_split$_cc$_rules, [Arg16659_0[2], []])]
  : ((shenjs_is_type(Arg16659_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_split$_cc$_rules, [Arg16659_0[2], [shen_type_cons, Arg16659_0[1], Arg16659_1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-split_cc_rules"]]);})))))},
  2,
  [],
  "shen-split_cc_rules"];
shenjs_functions["shen_shen-split_cc_rules"] = shen_split$_cc$_rules;






shen_split$_cc$_rule = [shen_type_func,
  function shen_user_lambda16662(Arg16661) {
  if (Arg16661.length < 2) return [shen_type_func, shen_user_lambda16662, 2, Arg16661];
  var Arg16661_0 = Arg16661[0], Arg16661_1 = Arg16661[1];
  return (((shenjs_is_type(Arg16661_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":="], Arg16661_0[1])) && (shenjs_is_type(Arg16661_0[2], shen_type_cons) && shenjs_empty$question$(Arg16661_0[2][2])))))
  ? [shen_type_cons, shenjs_call(shen_reverse, [Arg16661_1]), Arg16661_0[2]]
  : (((shenjs_is_type(Arg16661_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":="], Arg16661_0[1]))))
  ? [shen_type_cons, shenjs_call(shen_reverse, [Arg16661_1]), [shen_type_cons, shenjs_call(shen_cons$_form, [Arg16661_0[2]]), []]]
  : ((shenjs_empty$question$(Arg16661_0))
  ? (shenjs_call(shen_intoutput, ["warning: ", []]),
  shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda16664(Arg16663) {
  if (Arg16663.length < 1) return [shen_type_func, shen_user_lambda16664, 1, Arg16663];
  var Arg16663_0 = Arg16663[0];
  return (function() {
  return shenjs_call_tail(shen_intoutput, ["~A ", [shen_tuple, Arg16663_0, []]]);})},
  1,
  []], shenjs_call(shen_reverse, [Arg16661_1])]),
  shenjs_call(shen_intoutput, ["has no semantics.~%", []]),
  (function() {
  return shenjs_call_tail(shen_split$_cc$_rule, [[shen_type_cons, [shen_type_symbol, ":="], [shen_type_cons, shenjs_call(shen_default$_semantics, [shenjs_call(shen_reverse, [Arg16661_1])]), []]], Arg16661_1]);}))
  : ((shenjs_is_type(Arg16661_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_split$_cc$_rule, [Arg16661_0[2], [shen_type_cons, Arg16661_0[1], Arg16661_1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-split_cc_rule"]]);})))))},
  2,
  [],
  "shen-split_cc_rule"];
shenjs_functions["shen_shen-split_cc_rule"] = shen_split$_cc$_rule;






shen_default$_semantics = [shen_type_func,
  function shen_user_lambda16666(Arg16665) {
  if (Arg16665.length < 1) return [shen_type_func, shen_user_lambda16666, 1, Arg16665];
  var Arg16665_0 = Arg16665[0];
  var R0;
  return ((shenjs_empty$question$(Arg16665_0))
  ? []
  : (((shenjs_is_type(Arg16665_0, shen_type_cons) && shenjs_call(shen_grammar$_symbol$question$, [Arg16665_0[1]])))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg16665_0[1]]), []]]),
  ((shenjs_empty$question$(Arg16665_0[2]))
  ? R0
  : [shen_type_cons, [shen_type_symbol, "append"], [shen_type_cons, R0, [shen_type_cons, shenjs_call(shen_default$_semantics, [Arg16665_0[2]]), []]]]))
  : ((shenjs_is_type(Arg16665_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, Arg16665_0[1], [shen_type_cons, shenjs_call(shen_default$_semantics, [Arg16665_0[2]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-default_semantics"]]);}))))},
  1,
  [],
  "shen-default_semantics"];
shenjs_functions["shen_shen-default_semantics"] = shen_default$_semantics;






shen_cc$_body = [shen_type_func,
  function shen_user_lambda16668(Arg16667) {
  if (Arg16667.length < 1) return [shen_type_func, shen_user_lambda16668, 1, Arg16667];
  var Arg16667_0 = Arg16667[0];
  return (((shenjs_is_type(Arg16667_0, shen_type_cons) && (shenjs_is_type(Arg16667_0[2], shen_type_cons) && shenjs_empty$question$(Arg16667_0[2][2]))))
  ? (function() {
  return shenjs_call_tail(shen_syntax, [Arg16667_0[1], [shen_type_symbol, "Stream"], Arg16667_0[2][1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-cc_body"]]);}))},
  1,
  [],
  "shen-cc_body"];
shenjs_functions["shen_shen-cc_body"] = shen_cc$_body;






shen_syntax = [shen_type_func,
  function shen_user_lambda16670(Arg16669) {
  if (Arg16669.length < 3) return [shen_type_func, shen_user_lambda16670, 3, Arg16669];
  var Arg16669_0 = Arg16669[0], Arg16669_1 = Arg16669[1], Arg16669_2 = Arg16669[2];
  return ((shenjs_empty$question$(Arg16669_0))
  ? [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg16669_1, []]], [shen_type_cons, shenjs_call(shen_semantics, [Arg16669_2]), []]]]
  : ((shenjs_is_type(Arg16669_0, shen_type_cons))
  ? ((shenjs_call(shen_grammar$_symbol$question$, [Arg16669_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_recursive$_descent, [Arg16669_0, Arg16669_1, Arg16669_2]);})
  : ((shenjs_call(shen_segvar$question$, [Arg16669_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_segment_match, [Arg16669_0, Arg16669_1, Arg16669_2]);})
  : ((shenjs_call(shen_terminal$question$, [Arg16669_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_check$_stream, [Arg16669_0, Arg16669_1, Arg16669_2]);})
  : ((shenjs_call(shen_jump$_stream$question$, [Arg16669_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_jump$_stream, [Arg16669_0, Arg16669_1, Arg16669_2]);})
  : ((shenjs_call(shen_list$_stream$question$, [Arg16669_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_list$_stream, [shenjs_call(shen_decons, [Arg16669_0[1]]), Arg16669_0[2], Arg16669_1, Arg16669_2]);})
  : (function() {
  return shenjs_call_tail(shen_interror, ["~A is not legal syntax~%", [shen_tuple, Arg16669_0[1], []]]);}))))))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-syntax"]]);})))},
  3,
  [],
  "shen-syntax"];
shenjs_functions["shen_shen-syntax"] = shen_syntax;






shen_list$_stream$question$ = [shen_type_func,
  function shen_user_lambda16672(Arg16671) {
  if (Arg16671.length < 1) return [shen_type_func, shen_user_lambda16672, 1, Arg16671];
  var Arg16671_0 = Arg16671[0];
  return ((shenjs_is_type(Arg16671_0, shen_type_cons))
  ? true
  : false)},
  1,
  [],
  "shen-list_stream?"];
shenjs_functions["shen_shen-list_stream?"] = shen_list$_stream$question$;






shen_decons = [shen_type_func,
  function shen_user_lambda16674(Arg16673) {
  if (Arg16673.length < 1) return [shen_type_func, shen_user_lambda16674, 1, Arg16673];
  var Arg16673_0 = Arg16673[0];
  return (((shenjs_is_type(Arg16673_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg16673_0[1])) && (shenjs_is_type(Arg16673_0[2], shen_type_cons) && (shenjs_is_type(Arg16673_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg16673_0[2][2][2]))))))
  ? [shen_type_cons, Arg16673_0[2][1], shenjs_call(shen_decons, [Arg16673_0[2][2][1]])]
  : Arg16673_0)},
  1,
  [],
  "shen-decons"];
shenjs_functions["shen_shen-decons"] = shen_decons;






shen_list$_stream = [shen_type_func,
  function shen_user_lambda16676(Arg16675) {
  if (Arg16675.length < 4) return [shen_type_func, shen_user_lambda16676, 4, Arg16675];
  var Arg16675_0 = Arg16675[0], Arg16675_1 = Arg16675[1], Arg16675_2 = Arg16675[2], Arg16675_3 = Arg16675[3];
  var R0, R1, R2;
  return ((R0 = [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg16675_2, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg16675_2, []]], []]], []]], []]]]),
  (R1 = [shen_type_cons, [shen_type_symbol, "shen-snd-or-fail"], [shen_type_cons, shenjs_call(shen_syntax, [Arg16675_0, [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg16675_2, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, Arg16675_2, []]], []]]], [shen_type_cons, [shen_type_symbol, "shen-leave!"], [shen_type_cons, shenjs_call(shen_syntax, [Arg16675_1, [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg16675_2, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, Arg16675_2, []]], []]]], Arg16675_3]), []]]]), []]]),
  (R2 = [shen_type_cons, [shen_type_symbol, "fail"], []]),
  [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, R0, [shen_type_cons, R1, [shen_type_cons, R2, []]]]])},
  4,
  [],
  "shen-list_stream"];
shenjs_functions["shen_shen-list_stream"] = shen_list$_stream;






shen_snd_or_fail = [shen_type_func,
  function shen_user_lambda16678(Arg16677) {
  if (Arg16677.length < 1) return [shen_type_func, shen_user_lambda16678, 1, Arg16677];
  var Arg16677_0 = Arg16677[0];
  return ((shenjs_is_type(Arg16677_0, shen_tuple))
  ? (function() {
  return shenjs_call_tail(shen_snd, [Arg16677_0]);})
  : shen_fail_obj)},
  1,
  [],
  "shen-snd-or-fail"];
shenjs_functions["shen_shen-snd-or-fail"] = shen_snd_or_fail;






shen_grammar$_symbol$question$ = [shen_type_func,
  function shen_user_lambda16680(Arg16679) {
  if (Arg16679.length < 1) return [shen_type_func, shen_user_lambda16680, 1, Arg16679];
  var Arg16679_0 = Arg16679[0];
  var R0;
  return (shenjs_is_type(Arg16679_0, shen_type_symbol) && ((R0 = shenjs_call(shen_explode, [Arg16679_0])),
  (shenjs_unwind_tail(shenjs_$eq$(R0[1], "<")) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_reverse, [R0])[1], ">")))))},
  1,
  [],
  "shen-grammar_symbol?"];
shenjs_functions["shen_shen-grammar_symbol?"] = shen_grammar$_symbol$question$;






shen_recursive$_descent = [shen_type_func,
  function shen_user_lambda16682(Arg16681) {
  if (Arg16681.length < 3) return [shen_type_func, shen_user_lambda16682, 3, Arg16681];
  var Arg16681_0 = Arg16681[0], Arg16681_1 = Arg16681[1], Arg16681_2 = Arg16681[2];
  var R0, R1, R2;
  return ((shenjs_is_type(Arg16681_0, shen_type_cons))
  ? ((R0 = [shen_type_cons, Arg16681_0[1], [shen_type_cons, Arg16681_1, []]]),
  (R1 = shenjs_call(shen_syntax, [Arg16681_0[2], shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg16681_0[1]]), Arg16681_2])),
  (R2 = [shen_type_cons, [shen_type_symbol, "fail"], []]),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg16681_0[1]]), [shen_type_cons, R0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], [shen_type_cons, shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg16681_0[1]]), []]]], []]], [shen_type_cons, R1, [shen_type_cons, R2, []]]]], []]]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-recursive_descent"]]);}))},
  3,
  [],
  "shen-recursive_descent"];
shenjs_functions["shen_shen-recursive_descent"] = shen_recursive$_descent;






shen_segvar$question$ = [shen_type_func,
  function shen_user_lambda16684(Arg16683) {
  if (Arg16683.length < 1) return [shen_type_func, shen_user_lambda16684, 1, Arg16683];
  var Arg16683_0 = Arg16683[0];
  return (shenjs_is_type(Arg16683_0, shen_type_symbol) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_explode, [Arg16683_0])[1], "?")))},
  1,
  [],
  "shen-segvar?"];
shenjs_functions["shen_shen-segvar?"] = shen_segvar$question$;






shen_segment_match = [shen_type_func,
  function shen_user_lambda16686(Arg16685) {
  if (Arg16685.length < 3) return [shen_type_func, shen_user_lambda16686, 3, Arg16685];
  var Arg16685_0 = Arg16685[0], Arg16685_1 = Arg16685[1], Arg16685_2 = Arg16685[2];
  var R0;
  return ((shenjs_is_type(Arg16685_0, shen_type_cons))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, Arg16685_0[1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, [shen_type_symbol, "Restart"], [shen_type_cons, shenjs_call(shen_syntax, [Arg16685_0[2], [shen_type_symbol, "Restart"], Arg16685_2]), []]]], []]]]),
  [shen_type_cons, Arg16685_0[1], [shen_type_cons, Arg16685_1, [shen_type_cons, R0, []]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-segment-match"]]);}))},
  3,
  [],
  "shen-segment-match"];
shenjs_functions["shen_shen-segment-match"] = shen_segment_match;






shen_terminal$question$ = [shen_type_func,
  function shen_user_lambda16688(Arg16687) {
  if (Arg16687.length < 1) return [shen_type_func, shen_user_lambda16688, 1, Arg16687];
  var Arg16687_0 = Arg16687[0];
  return ((shenjs_is_type(Arg16687_0, shen_type_cons))
  ? false
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-*-"], Arg16687_0)))
  ? false
  : true))},
  1,
  [],
  "shen-terminal?"];
shenjs_functions["shen_shen-terminal?"] = shen_terminal$question$;






shen_jump$_stream$question$ = [shen_type_func,
  function shen_user_lambda16690(Arg16689) {
  if (Arg16689.length < 1) return [shen_type_func, shen_user_lambda16690, 1, Arg16689];
  var Arg16689_0 = Arg16689[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-*-"], Arg16689_0)))
  ? true
  : false)},
  1,
  [],
  "shen-jump_stream?"];
shenjs_functions["shen_shen-jump_stream?"] = shen_jump$_stream$question$;






shen_check$_stream = [shen_type_func,
  function shen_user_lambda16692(Arg16691) {
  if (Arg16691.length < 3) return [shen_type_func, shen_user_lambda16692, 3, Arg16691];
  var Arg16691_0 = Arg16691[0], Arg16691_1 = Arg16691[1], Arg16691_2 = Arg16691[2];
  var R0, R1, R2;
  return ((shenjs_is_type(Arg16691_0, shen_type_cons))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg16691_1, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, Arg16691_0[1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg16691_1, []]], []]], []]]], []]]]),
  (R1 = shenjs_call(shen_syntax, [Arg16691_0[2], [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg16691_1, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, Arg16691_1, []]], []]]], Arg16691_2])),
  (R2 = [shen_type_cons, [shen_type_symbol, "fail"], []]),
  [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, R0, [shen_type_cons, R1, [shen_type_cons, R2, []]]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-check_stream"]]);}))},
  3,
  [],
  "shen-check_stream"];
shenjs_functions["shen_shen-check_stream"] = shen_check$_stream;






shen_reassemble = [shen_type_func,
  function shen_user_lambda16694(Arg16693) {
  if (Arg16693.length < 2) return [shen_type_func, shen_user_lambda16694, 2, Arg16693];
  var Arg16693_0 = Arg16693[0], Arg16693_1 = Arg16693[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg16693_1, shen_fail_obj)))
  ? Arg16693_1
  : [shen_tuple, Arg16693_0, Arg16693_1])},
  2,
  [],
  "shen-reassemble"];
shenjs_functions["shen_shen-reassemble"] = shen_reassemble;






shen_jump$_stream = [shen_type_func,
  function shen_user_lambda16696(Arg16695) {
  if (Arg16695.length < 3) return [shen_type_func, shen_user_lambda16696, 3, Arg16695];
  var Arg16695_0 = Arg16695[0], Arg16695_1 = Arg16695[1], Arg16695_2 = Arg16695[2];
  var R0, R1, R2;
  return ((shenjs_is_type(Arg16695_0, shen_type_cons))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg16695_1, []]], []]]),
  (R1 = shenjs_call(shen_syntax, [Arg16695_0[2], [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg16695_1, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, Arg16695_1, []]], []]]], Arg16695_2])),
  (R2 = [shen_type_cons, [shen_type_symbol, "fail"], []]),
  [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, R0, [shen_type_cons, R1, [shen_type_cons, R2, []]]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-jump_stream"]]);}))},
  3,
  [],
  "shen-jump_stream"];
shenjs_functions["shen_shen-jump_stream"] = shen_jump$_stream;






shen_semantics = [shen_type_func,
  function shen_user_lambda16698(Arg16697) {
  if (Arg16697.length < 1) return [shen_type_func, shen_user_lambda16698, 1, Arg16697];
  var Arg16697_0 = Arg16697[0];
  return (((shenjs_is_type(Arg16697_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-leave!"], Arg16697_0[1])) && (shenjs_is_type(Arg16697_0[2], shen_type_cons) && shenjs_empty$question$(Arg16697_0[2][2])))))
  ? Arg16697_0[2][1]
  : ((shenjs_empty$question$(Arg16697_0))
  ? []
  : ((shenjs_call(shen_grammar$_symbol$question$, [Arg16697_0]))
  ? [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg16697_0]), []]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-o-"], Arg16697_0)))
  ? [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, [shen_type_symbol, "Stream"], []]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-*-"], Arg16697_0)))
  ? [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, [shen_type_symbol, "Stream"], []]], []]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-s-"], Arg16697_0)))
  ? [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, [shen_type_symbol, "Stream"], []]]
  : ((shenjs_is_type(Arg16697_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda16700(Arg16699) {
  if (Arg16699.length < 1) return [shen_type_func, shen_user_lambda16700, 1, Arg16699];
  var Arg16699_0 = Arg16699[0];
  return (function() {
  return shenjs_call_tail(shen_semantics, [Arg16699_0]);})},
  1,
  []], Arg16697_0]);})
  : Arg16697_0)))))))},
  1,
  [],
  "shen-semantics"];
shenjs_functions["shen_shen-semantics"] = shen_semantics;






shen_$lt$$excl$$gt$ = [shen_type_func,
  function shen_user_lambda16702(Arg16701) {
  if (Arg16701.length < 1) return [shen_type_func, shen_user_lambda16702, 1, Arg16701];
  var Arg16701_0 = Arg16701[0];
  return ((shenjs_is_type(Arg16701_0, shen_tuple))
  ? [shen_tuple, [], shenjs_call(shen_fst, [Arg16701_0])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "<!>"]]);}))},
  1,
  [],
  "<!>"];
shenjs_functions["shen_<!>"] = shen_$lt$$excl$$gt$;












shen_print = [shen_type_func,
  function shen_user_lambda16605(Arg16604) {
  if (Arg16604.length < 1) return [shen_type_func, shen_user_lambda16605, 1, Arg16604];
  var Arg16604_0 = Arg16604[0];
  return (shenjs_pr(shenjs_call(shen_ms_h, [[shen_type_cons, "~", [shen_type_cons, "S", []]], [shen_tuple, Arg16604_0, [shen_type_symbol, "shen-skip"]]]), shenjs_call(shen_stoutput, [0])),
  Arg16604_0)},
  1,
  [],
  "print"];
shenjs_functions["shen_print"] = shen_print;






shen_format = [shen_type_func,
  function shen_user_lambda16607(Arg16606) {
  if (Arg16606.length < 3) return [shen_type_func, shen_user_lambda16607, 3, Arg16606];
  var Arg16606_0 = Arg16606[0], Arg16606_1 = Arg16606[1], Arg16606_2 = Arg16606[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg16606_0)))
  ? (function() {
  return shenjs_call_tail(shen_intoutput, [Arg16606_1, [shen_tuple, Arg16606_2, []]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg16606_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, [Arg16606_1, [shen_tuple, Arg16606_2, []]]);})
  : (function() {
  return shenjs_pr(shenjs_call(shen_ms_h, [shenjs_call(shen_explode, [Arg16606_1]), Arg16606_2]), Arg16606_0);})))},
  3,
  [],
  "format"];
shenjs_functions["shen_format"] = shen_format;






shen_intoutput = [shen_type_func,
  function shen_user_lambda16609(Arg16608) {
  if (Arg16608.length < 2) return [shen_type_func, shen_user_lambda16609, 2, Arg16608];
  var Arg16608_0 = Arg16608[0], Arg16608_1 = Arg16608[1];
  return ((shenjs_unwind_tail(shenjs_$eq$((shenjs_globals["shen_shen-*hush*"]), "Shen hushed")))
  ? "Shen hushed"
  : ((shenjs_unwind_tail(shenjs_$eq$("Shen unhushed", Arg16608_0)))
  ? "Shen unhushed"
  : (function() {
  return shenjs_pr(shenjs_call(shen_ms_h, [shenjs_call(shen_explode_string, [Arg16608_0]), Arg16608_1]), shenjs_call(shen_stoutput, [0]));})))},
  2,
  [],
  "intoutput"];
shenjs_functions["shen_intoutput"] = shen_intoutput;






shen_interror = [shen_type_func,
  function shen_user_lambda16611(Arg16610) {
  if (Arg16610.length < 2) return [shen_type_func, shen_user_lambda16611, 2, Arg16610];
  var Arg16610_0 = Arg16610[0], Arg16610_1 = Arg16610[1];
  return (function() {
  return shenjs_simple_error(shenjs_call(shen_ms_h, [shenjs_call(shen_explode_string, [Arg16610_0]), Arg16610_1]));})},
  2,
  [],
  "interror"];
shenjs_functions["shen_interror"] = shen_interror;






shen_intmake_string = [shen_type_func,
  function shen_user_lambda16613(Arg16612) {
  if (Arg16612.length < 2) return [shen_type_func, shen_user_lambda16613, 2, Arg16612];
  var Arg16612_0 = Arg16612[0], Arg16612_1 = Arg16612[1];
  return (function() {
  return shenjs_call_tail(shen_ms_h, [shenjs_call(shen_explode_string, [Arg16612_0]), Arg16612_1]);})},
  2,
  [],
  "intmake-string"];
shenjs_functions["shen_intmake-string"] = shen_intmake_string;






shen_ms_h = [shen_type_func,
  function shen_user_lambda16615(Arg16614) {
  if (Arg16614.length < 2) return [shen_type_func, shen_user_lambda16615, 2, Arg16614];
  var Arg16614_0 = Arg16614[0], Arg16614_1 = Arg16614[1];
  return ((shenjs_empty$question$(Arg16614_0))
  ? ""
  : (((shenjs_is_type(Arg16614_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$("~", Arg16614_0[1])) && (shenjs_is_type(Arg16614_0[2], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("%", Arg16614_0[2][1]))))))
  ? (shenjs_n_$gt$string(10) + shenjs_call(shen_ms_h, [Arg16614_0[2][2], Arg16614_1]))
  : (((shenjs_is_type(Arg16614_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$("~", Arg16614_0[1])) && (shenjs_is_type(Arg16614_0[2], shen_type_cons) && (shenjs_is_type(Arg16614_1, shen_tuple) && shenjs_call(shen_element$question$, [Arg16614_0[2][1], [shen_type_cons, "A", [shen_type_cons, "S", [shen_type_cons, "R", []]]]]))))))
  ? (shenjs_call(shen_ob_$gt$str, [Arg16614_0[2][1], shenjs_call(shen_fst, [Arg16614_1])]) + shenjs_call(shen_ms_h, [Arg16614_0[2][2], shenjs_call(shen_snd, [Arg16614_1])]))
  : ((shenjs_is_type(Arg16614_0, shen_type_cons))
  ? (Arg16614_0[1] + shenjs_call(shen_ms_h, [Arg16614_0[2], Arg16614_1]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-ms-h"]]);})))))},
  2,
  [],
  "shen-ms-h"];
shenjs_functions["shen_shen-ms-h"] = shen_ms_h;






shen_ob_$gt$str = [shen_type_func,
  function shen_user_lambda16617(Arg16616) {
  if (Arg16616.length < 2) return [shen_type_func, shen_user_lambda16617, 2, Arg16616];
  var Arg16616_0 = Arg16616[0], Arg16616_1 = Arg16616[1];
  var R0;
  return ((shenjs_empty$question$(Arg16616_1))
  ? ((shenjs_unwind_tail(shenjs_$eq$(Arg16616_0, "R")))
  ? "()"
  : "[]")
  : ((shenjs_unwind_tail(shenjs_$eq$(Arg16616_1, shenjs_vector(0))))
  ? "<>"
  : ((shenjs_is_type(Arg16616_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_cn_all, [shenjs_call(shen_append, [((shenjs_unwind_tail(shenjs_$eq$(Arg16616_0, "R")))
  ? [shen_type_cons, "(", []]
  : [shen_type_cons, "[", []]), shenjs_call(shen_append, [[shen_type_cons, shenjs_call(shen_ob_$gt$str, [Arg16616_0, Arg16616_1[1]]), []], shenjs_call(shen_append, [shenjs_call(shen_xmapcan, [(shenjs_globals["shen_*maximum-print-sequence-size*"]), [shen_type_func,
  function shen_user_lambda16619(Arg16618) {
  if (Arg16618.length < 2) return [shen_type_func, shen_user_lambda16619, 2, Arg16618];
  var Arg16618_0 = Arg16618[0], Arg16618_1 = Arg16618[1];
  return [shen_type_cons, " ", [shen_type_cons, shenjs_call(shen_ob_$gt$str, [Arg16618_0, Arg16618_1]), []]]},
  2,
  [Arg16616_0]], Arg16616_1[2]]), ((shenjs_unwind_tail(shenjs_$eq$(Arg16616_0, "R")))
  ? [shen_type_cons, ")", []]
  : [shen_type_cons, "]", []])])])])]);})
  : ((shenjs_vector$question$(Arg16616_1))
  ? ((R0 = shenjs_call(shen_vector_$gt$list, [Arg16616_1, 1])),
  (R0 = shenjs_tlstr(shenjs_call(shen_cn_all, [shenjs_call(shen_xmapcan, [((shenjs_globals["shen_*maximum-print-sequence-size*"]) - 1), [shen_type_func,
  function shen_user_lambda16621(Arg16620) {
  if (Arg16620.length < 2) return [shen_type_func, shen_user_lambda16621, 2, Arg16620];
  var Arg16620_0 = Arg16620[0], Arg16620_1 = Arg16620[1];
  return [shen_type_cons, " ", [shen_type_cons, shenjs_call(shen_ob_$gt$str, [Arg16620_0, shenjs_call(shen_blank_fail, [Arg16620_1])]), []]]},
  2,
  [Arg16616_0]], R0])]))),
  (R0 = ("<" + (R0 + ">"))),
  R0)
  : ((((!(typeof(Arg16616_1) == 'string')) && shenjs_absvector$question$(Arg16616_1)))
  ? (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_ob_$gt$str, ["A", shenjs_call(shenjs_absvector_ref(Arg16616_1, 0), [Arg16616_1])]);}, [shen_type_func,
  function shen_user_lambda16623(Arg16622) {
  if (Arg16622.length < 3) return [shen_type_func, shen_user_lambda16623, 3, Arg16622];
  var Arg16622_0 = Arg16622[0], Arg16622_1 = Arg16622[1], Arg16622_2 = Arg16622[2];
  var R0, R1;
  return ((R0 = shenjs_call(shen_vector_$gt$list, [Arg16622_0, 0])),
  (R1 = shenjs_tlstr(shenjs_call(shen_cn_all, [shenjs_call(shen_xmapcan, [((shenjs_globals["shen_*maximum-print-sequence-size*"]) - 1), [shen_type_func,
  function shen_user_lambda16625(Arg16624) {
  if (Arg16624.length < 2) return [shen_type_func, shen_user_lambda16625, 2, Arg16624];
  var Arg16624_0 = Arg16624[0], Arg16624_1 = Arg16624[1];
  return [shen_type_cons, " ", [shen_type_cons, shenjs_call(shen_ob_$gt$str, [Arg16624_0, Arg16624_1]), []]]},
  2,
  [Arg16622_1]], R0])]))),
  (R1 = ("<" + (R1 + ">"))),
  R1)},
  3,
  [Arg16616_1, Arg16616_0]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-vector-failure-object"], Arg16616_1)))
  ? "..."
  : (((shenjs_unwind_tail(shenjs_$eq$(Arg16616_0, "A")) && (typeof(Arg16616_1) == 'string')))
  ? Arg16616_1
  : (function() {
  return shenjs_str(Arg16616_1);}))))))))},
  2,
  [],
  "shen-ob->str"];
shenjs_functions["shen_shen-ob->str"] = shen_ob_$gt$str;






shen_blank_fail = [shen_type_func,
  function shen_user_lambda16627(Arg16626) {
  if (Arg16626.length < 1) return [shen_type_func, shen_user_lambda16627, 1, Arg16626];
  var Arg16626_0 = Arg16626[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg16626_0, shen_fail_obj)))
  ? [shen_type_symbol, "shen-vector-failure-object"]
  : Arg16626_0)},
  1,
  [],
  "shen-blank-fail"];
shenjs_functions["shen_shen-blank-fail"] = shen_blank_fail;






shen_tuple = [shen_type_func,
  function shen_user_lambda16629(Arg16628) {
  if (Arg16628.length < 1) return [shen_type_func, shen_user_lambda16629, 1, Arg16628];
  var Arg16628_0 = Arg16628[0];
  return (function() {
  return shenjs_call_tail(shen_intmake_string, ["(@p ~S ~S)", [shen_tuple, shenjs_call(shen_fst, [Arg16628_0]), [shen_tuple, shenjs_call(shen_snd, [Arg16628_0]), []]]]);})},
  1,
  [],
  "shen-tuple"];
shenjs_functions["shen_shen-tuple"] = shen_tuple;






shen_cn_all = [shen_type_func,
  function shen_user_lambda16631(Arg16630) {
  if (Arg16630.length < 1) return [shen_type_func, shen_user_lambda16631, 1, Arg16630];
  var Arg16630_0 = Arg16630[0];
  return ((shenjs_empty$question$(Arg16630_0))
  ? ""
  : ((shenjs_is_type(Arg16630_0, shen_type_cons))
  ? (Arg16630_0[1] + shenjs_call(shen_cn_all, [Arg16630_0[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-cn-all"]]);})))},
  1,
  [],
  "shen-cn-all"];
shenjs_functions["shen_shen-cn-all"] = shen_cn_all;






shen_xmapcan = [shen_type_func,
  function shen_user_lambda16633(Arg16632) {
  if (Arg16632.length < 3) return [shen_type_func, shen_user_lambda16633, 3, Arg16632];
  var Arg16632_0 = Arg16632[0], Arg16632_1 = Arg16632[1], Arg16632_2 = Arg16632[2];
  return ((shenjs_empty$question$(Arg16632_2))
  ? []
  : ((shenjs_unwind_tail(shenjs_$eq$(0, Arg16632_0)))
  ? [shen_type_cons, "... etc", []]
  : ((shenjs_is_type(Arg16632_2, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(Arg16632_1, [Arg16632_2[1]]), shenjs_call(shen_xmapcan, [(Arg16632_0 - 1), Arg16632_1, Arg16632_2[2]])]);})
  : [shen_type_cons, " |", shenjs_call(Arg16632_1, [Arg16632_2])])))},
  3,
  [],
  "shen-xmapcan"];
shenjs_functions["shen_shen-xmapcan"] = shen_xmapcan;






shen_vector_$gt$list = [shen_type_func,
  function shen_user_lambda16635(Arg16634) {
  if (Arg16634.length < 2) return [shen_type_func, shen_user_lambda16635, 2, Arg16634];
  var Arg16634_0 = Arg16634[0], Arg16634_1 = Arg16634[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$listh, [Arg16634_0, Arg16634_1, []]);})},
  2,
  [],
  "shen-vector->list"];
shenjs_functions["shen_shen-vector->list"] = shen_vector_$gt$list;






shen_vector_$gt$listh = [shen_type_func,
  function shen_user_lambda16637(Arg16636) {
  if (Arg16636.length < 3) return [shen_type_func, shen_user_lambda16637, 3, Arg16636];
  var Arg16636_0 = Arg16636[0], Arg16636_1 = Arg16636[1], Arg16636_2 = Arg16636[2];
  var R0;
  return ((R0 = shenjs_trap_error(function() {return shenjs_absvector_ref(Arg16636_0, Arg16636_1);}, [shen_type_func,
  function shen_user_lambda16639(Arg16638) {
  if (Arg16638.length < 1) return [shen_type_func, shen_user_lambda16639, 1, Arg16638];
  var Arg16638_0 = Arg16638[0];
  return [shen_type_symbol, "shen-out-of-range"]},
  1,
  []])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, [shen_type_symbol, "shen-out-of-range"])))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg16636_2]);})
  : (function() {
  return shenjs_call_tail(shen_vector_$gt$listh, [Arg16636_0, (Arg16636_1 + 1), [shen_type_cons, R0, Arg16636_2]]);})))},
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
  function shen_user_lambda15439(Arg15438) {
  if (Arg15438.length < 0) return [shen_type_func, shen_user_lambda15439, 0, Arg15438];
  return (function() {
  return shenjs_call_tail(shen_lineread_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), []]);})},
  0,
  [],
  "lineread"];
shenjs_functions["shen_lineread"] = shen_lineread;






shen_lineread_loop = [shen_type_func,
  function shen_user_lambda15441(Arg15440) {
  if (Arg15440.length < 2) return [shen_type_func, shen_user_lambda15441, 2, Arg15440];
  var Arg15440_0 = Arg15440[0], Arg15440_1 = Arg15440[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg15440_0, shenjs_call(shen_hat, []))))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["line read aborted", []]);})
  : ((shenjs_call(shen_element$question$, [Arg15440_0, [shen_type_cons, shenjs_call(shen_newline, []), [shen_type_cons, shenjs_call(shen_carriage_return, []), []]]]))
  ? ((R0 = shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda15443(Arg15442) {
  if (Arg15442.length < 1) return [shen_type_func, shen_user_lambda15443, 1, Arg15442];
  var Arg15442_0 = Arg15442[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$st$_input$gt$, [Arg15442_0]);})},
  1,
  []], Arg15440_1, []])),
  (((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)) || shenjs_empty$question$(R0)))
  ? (function() {
  return shenjs_call_tail(shen_lineread_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), shenjs_call(shen_append, [Arg15440_1, [shen_type_cons, Arg15440_0, []]])]);})
  : R0))
  : (function() {
  return shenjs_call_tail(shen_lineread_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), shenjs_call(shen_append, [Arg15440_1, [shen_type_cons, Arg15440_0, []]])]);})))},
  2,
  [],
  "shen-lineread-loop"];
shenjs_functions["shen_shen-lineread-loop"] = shen_lineread_loop;






shen_read_file = [shen_type_func,
  function shen_user_lambda15445(Arg15444) {
  if (Arg15444.length < 1) return [shen_type_func, shen_user_lambda15445, 1, Arg15444];
  var Arg15444_0 = Arg15444[0];
  var R0;
  return ((R0 = shenjs_call(shen_read_file_as_bytelist, [Arg15444_0])),
  (function() {
  return shenjs_call_tail(shen_compile, [[shen_type_func,
  function shen_user_lambda15447(Arg15446) {
  if (Arg15446.length < 1) return [shen_type_func, shen_user_lambda15447, 1, Arg15446];
  var Arg15446_0 = Arg15446[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$st$_input$gt$, [Arg15446_0]);})},
  1,
  []], R0, [shen_type_func,
  function shen_user_lambda15449(Arg15448) {
  if (Arg15448.length < 1) return [shen_type_func, shen_user_lambda15449, 1, Arg15448];
  var Arg15448_0 = Arg15448[0];
  return (function() {
  return shenjs_call_tail(shen_read_error, [Arg15448_0]);})},
  1,
  []]]);}))},
  1,
  [],
  "read-file"];
shenjs_functions["shen_read-file"] = shen_read_file;






shen_read_error = [shen_type_func,
  function shen_user_lambda15451(Arg15450) {
  if (Arg15450.length < 1) return [shen_type_func, shen_user_lambda15451, 1, Arg15450];
  var Arg15450_0 = Arg15450[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["read error here:~%~% ~A~%", [shen_tuple, shenjs_call(shen_compress_50, [50, Arg15450_0]), []]]);})},
  1,
  [],
  "shen-read-error"];
shenjs_functions["shen_shen-read-error"] = shen_read_error;






shen_compress_50 = [shen_type_func,
  function shen_user_lambda15453(Arg15452) {
  if (Arg15452.length < 2) return [shen_type_func, shen_user_lambda15453, 2, Arg15452];
  var Arg15452_0 = Arg15452[0], Arg15452_1 = Arg15452[1];
  return ((shenjs_empty$question$(Arg15452_1))
  ? ""
  : ((shenjs_unwind_tail(shenjs_$eq$(0, Arg15452_0)))
  ? ""
  : ((shenjs_is_type(Arg15452_1, shen_type_cons))
  ? (shenjs_n_$gt$string(Arg15452_1[1]) + shenjs_call(shen_compress_50, [(Arg15452_0 - 1), Arg15452_1[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-compress-50"]]);}))))},
  2,
  [],
  "shen-compress-50"];
shenjs_functions["shen_shen-compress-50"] = shen_compress_50;






shen_$lt$st$_input$gt$ = [shen_type_func,
  function shen_user_lambda15455(Arg15454) {
  if (Arg15454.length < 1) return [shen_type_func, shen_user_lambda15455, 1, Arg15454];
  var Arg15454_0 = Arg15454[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$lsb$gt$, [Arg15454_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$lrb$gt$, [Arg15454_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$lcurly$gt$, [Arg15454_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "{"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$rcurly$gt$, [Arg15454_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "}"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$bar$gt$, [Arg15454_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "bar!"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$semicolon$gt$, [Arg15454_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, ";"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$colon$gt$, [Arg15454_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$colon$gt$, [Arg15454_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$colon$gt$, [Arg15454_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, ":"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$comma$gt$, [Arg15454_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "shen-"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$comment$gt$, [Arg15454_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$atom$gt$, [Arg15454_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_macroexpand, [shenjs_call(shen_snd, [R0])]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$whitespaces$gt$, [Arg15454_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg15454_0])),
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
  function shen_user_lambda15457(Arg15456) {
  if (Arg15456.length < 1) return [shen_type_func, shen_user_lambda15457, 1, Arg15456];
  var Arg15456_0 = Arg15456[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15456_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15456_0])[2], shenjs_call(shen_snd, [Arg15456_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15456_0])[1], 91)))
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
  function shen_user_lambda15459(Arg15458) {
  if (Arg15458.length < 1) return [shen_type_func, shen_user_lambda15459, 1, Arg15458];
  var Arg15458_0 = Arg15458[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15458_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15458_0])[2], shenjs_call(shen_snd, [Arg15458_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15458_0])[1], 93)))
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
  function shen_user_lambda15461(Arg15460) {
  if (Arg15460.length < 1) return [shen_type_func, shen_user_lambda15461, 1, Arg15460];
  var Arg15460_0 = Arg15460[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15460_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15460_0])[2], shenjs_call(shen_snd, [Arg15460_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15460_0])[1], 123)))
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
  function shen_user_lambda15463(Arg15462) {
  if (Arg15462.length < 1) return [shen_type_func, shen_user_lambda15463, 1, Arg15462];
  var Arg15462_0 = Arg15462[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15462_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15462_0])[2], shenjs_call(shen_snd, [Arg15462_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15462_0])[1], 125)))
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
  function shen_user_lambda15465(Arg15464) {
  if (Arg15464.length < 1) return [shen_type_func, shen_user_lambda15465, 1, Arg15464];
  var Arg15464_0 = Arg15464[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15464_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15464_0])[2], shenjs_call(shen_snd, [Arg15464_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15464_0])[1], 124)))
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
  function shen_user_lambda15467(Arg15466) {
  if (Arg15466.length < 1) return [shen_type_func, shen_user_lambda15467, 1, Arg15466];
  var Arg15466_0 = Arg15466[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15466_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15466_0])[2], shenjs_call(shen_snd, [Arg15466_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15466_0])[1], 59)))
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
  function shen_user_lambda15469(Arg15468) {
  if (Arg15468.length < 1) return [shen_type_func, shen_user_lambda15469, 1, Arg15468];
  var Arg15468_0 = Arg15468[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15468_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15468_0])[2], shenjs_call(shen_snd, [Arg15468_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15468_0])[1], 58)))
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
  function shen_user_lambda15471(Arg15470) {
  if (Arg15470.length < 1) return [shen_type_func, shen_user_lambda15471, 1, Arg15470];
  var Arg15470_0 = Arg15470[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15470_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15470_0])[2], shenjs_call(shen_snd, [Arg15470_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15470_0])[1], 44)))
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
  function shen_user_lambda15473(Arg15472) {
  if (Arg15472.length < 1) return [shen_type_func, shen_user_lambda15473, 1, Arg15472];
  var Arg15472_0 = Arg15472[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15472_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15472_0])[2], shenjs_call(shen_snd, [Arg15472_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15472_0])[1], 61)))
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
  function shen_user_lambda15475(Arg15474) {
  if (Arg15474.length < 1) return [shen_type_func, shen_user_lambda15475, 1, Arg15474];
  var Arg15474_0 = Arg15474[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15474_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15474_0])[2], shenjs_call(shen_snd, [Arg15474_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15474_0])[1], 45)))
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
  function shen_user_lambda15477(Arg15476) {
  if (Arg15476.length < 1) return [shen_type_func, shen_user_lambda15477, 1, Arg15476];
  var Arg15476_0 = Arg15476[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15476_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15476_0])[2], shenjs_call(shen_snd, [Arg15476_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15476_0])[1], 40)))
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
  function shen_user_lambda15479(Arg15478) {
  if (Arg15478.length < 1) return [shen_type_func, shen_user_lambda15479, 1, Arg15478];
  var Arg15478_0 = Arg15478[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15478_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15478_0])[2], shenjs_call(shen_snd, [Arg15478_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15478_0])[1], 41)))
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
  function shen_user_lambda15481(Arg15480) {
  if (Arg15480.length < 1) return [shen_type_func, shen_user_lambda15481, 1, Arg15480];
  var Arg15480_0 = Arg15480[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$str$gt$, [Arg15480_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_control_chars, [shenjs_call(shen_snd, [R0])])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$number$gt$, [Arg15480_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$sym$gt$, [Arg15480_0])),
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
  function shen_user_lambda15483(Arg15482) {
  if (Arg15482.length < 1) return [shen_type_func, shen_user_lambda15483, 1, Arg15482];
  var Arg15482_0 = Arg15482[0];
  var R0, R1;
  return ((shenjs_empty$question$(Arg15482_0))
  ? ""
  : (((shenjs_is_type(Arg15482_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$("c", Arg15482_0[1])) && (shenjs_is_type(Arg15482_0[2], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("#", Arg15482_0[2][1]))))))
  ? ((R0 = shenjs_call(shen_code_point, [Arg15482_0[2][2]])),
  (R1 = shenjs_call(shen_after_codepoint, [Arg15482_0[2][2]])),
  (function() {
  return shenjs_call_tail(shen_$at$s, [shenjs_n_$gt$string(shenjs_call(shen_decimalise, [R0])), shenjs_call(shen_control_chars, [R1])]);}))
  : ((shenjs_is_type(Arg15482_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_$at$s, [Arg15482_0[1], shenjs_call(shen_control_chars, [Arg15482_0[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-control-chars"]]);}))))},
  1,
  [],
  "shen-control-chars"];
shenjs_functions["shen_shen-control-chars"] = shen_control_chars;






shen_code_point = [shen_type_func,
  function shen_user_lambda15485(Arg15484) {
  if (Arg15484.length < 1) return [shen_type_func, shen_user_lambda15485, 1, Arg15484];
  var Arg15484_0 = Arg15484[0];
  return (((shenjs_is_type(Arg15484_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(";", Arg15484_0[1]))))
  ? ""
  : (((shenjs_is_type(Arg15484_0, shen_type_cons) && shenjs_call(shen_element$question$, [Arg15484_0[1], [shen_type_cons, "0", [shen_type_cons, "1", [shen_type_cons, "2", [shen_type_cons, "3", [shen_type_cons, "4", [shen_type_cons, "5", [shen_type_cons, "6", [shen_type_cons, "7", [shen_type_cons, "8", [shen_type_cons, "9", [shen_type_cons, "0", []]]]]]]]]]]]])))
  ? [shen_type_cons, Arg15484_0[1], shenjs_call(shen_code_point, [Arg15484_0[2]])]
  : (function() {
  return shenjs_call_tail(shen_interror, ["code point parse error ~A~%", [shen_tuple, Arg15484_0, []]]);})))},
  1,
  [],
  "shen-code-point"];
shenjs_functions["shen_shen-code-point"] = shen_code_point;






shen_after_codepoint = [shen_type_func,
  function shen_user_lambda15487(Arg15486) {
  if (Arg15486.length < 1) return [shen_type_func, shen_user_lambda15487, 1, Arg15486];
  var Arg15486_0 = Arg15486[0];
  return ((shenjs_empty$question$(Arg15486_0))
  ? []
  : (((shenjs_is_type(Arg15486_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(";", Arg15486_0[1]))))
  ? Arg15486_0[2]
  : ((shenjs_is_type(Arg15486_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_after_codepoint, [Arg15486_0[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-after-codepoint"]]);}))))},
  1,
  [],
  "shen-after-codepoint"];
shenjs_functions["shen_shen-after-codepoint"] = shen_after_codepoint;






shen_decimalise = [shen_type_func,
  function shen_user_lambda15489(Arg15488) {
  if (Arg15488.length < 1) return [shen_type_func, shen_user_lambda15489, 1, Arg15488];
  var Arg15488_0 = Arg15488[0];
  return (function() {
  return shenjs_call_tail(shen_pre, [shenjs_call(shen_reverse, [shenjs_call(shen_digits_$gt$integers, [Arg15488_0])]), 0]);})},
  1,
  [],
  "shen-decimalise"];
shenjs_functions["shen_shen-decimalise"] = shen_decimalise;






shen_digits_$gt$integers = [shen_type_func,
  function shen_user_lambda15491(Arg15490) {
  if (Arg15490.length < 1) return [shen_type_func, shen_user_lambda15491, 1, Arg15490];
  var Arg15490_0 = Arg15490[0];
  return (((shenjs_is_type(Arg15490_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("0", Arg15490_0[1]))))
  ? [shen_type_cons, 0, shenjs_call(shen_digits_$gt$integers, [Arg15490_0[2]])]
  : (((shenjs_is_type(Arg15490_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("1", Arg15490_0[1]))))
  ? [shen_type_cons, 1, shenjs_call(shen_digits_$gt$integers, [Arg15490_0[2]])]
  : (((shenjs_is_type(Arg15490_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("2", Arg15490_0[1]))))
  ? [shen_type_cons, 2, shenjs_call(shen_digits_$gt$integers, [Arg15490_0[2]])]
  : (((shenjs_is_type(Arg15490_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("3", Arg15490_0[1]))))
  ? [shen_type_cons, 3, shenjs_call(shen_digits_$gt$integers, [Arg15490_0[2]])]
  : (((shenjs_is_type(Arg15490_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("4", Arg15490_0[1]))))
  ? [shen_type_cons, 4, shenjs_call(shen_digits_$gt$integers, [Arg15490_0[2]])]
  : (((shenjs_is_type(Arg15490_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("5", Arg15490_0[1]))))
  ? [shen_type_cons, 5, shenjs_call(shen_digits_$gt$integers, [Arg15490_0[2]])]
  : (((shenjs_is_type(Arg15490_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("6", Arg15490_0[1]))))
  ? [shen_type_cons, 6, shenjs_call(shen_digits_$gt$integers, [Arg15490_0[2]])]
  : (((shenjs_is_type(Arg15490_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("7", Arg15490_0[1]))))
  ? [shen_type_cons, 7, shenjs_call(shen_digits_$gt$integers, [Arg15490_0[2]])]
  : (((shenjs_is_type(Arg15490_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("8", Arg15490_0[1]))))
  ? [shen_type_cons, 8, shenjs_call(shen_digits_$gt$integers, [Arg15490_0[2]])]
  : (((shenjs_is_type(Arg15490_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("9", Arg15490_0[1]))))
  ? [shen_type_cons, 9, shenjs_call(shen_digits_$gt$integers, [Arg15490_0[2]])]
  : []))))))))))},
  1,
  [],
  "shen-digits->integers"];
shenjs_functions["shen_shen-digits->integers"] = shen_digits_$gt$integers;






shen_$lt$sym$gt$ = [shen_type_func,
  function shen_user_lambda15493(Arg15492) {
  if (Arg15492.length < 1) return [shen_type_func, shen_user_lambda15493, 1, Arg15492];
  var Arg15492_0 = Arg15492[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$alpha$gt$, [Arg15492_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$symchars$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_intern((shenjs_call(shen_snd, [R0]) + shenjs_call(shen_snd, [R1])))])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$alpha$gt$, [Arg15492_0])),
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
  function shen_user_lambda15495(Arg15494) {
  if (Arg15494.length < 1) return [shen_type_func, shen_user_lambda15495, 1, Arg15494];
  var Arg15494_0 = Arg15494[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$symchar$gt$, [Arg15494_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$symchars$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), (shenjs_call(shen_snd, [R0]) + shenjs_call(shen_snd, [R1]))])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$symchar$gt$, [Arg15494_0])),
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
  function shen_user_lambda15497(Arg15496) {
  if (Arg15496.length < 1) return [shen_type_func, shen_user_lambda15497, 1, Arg15496];
  var Arg15496_0 = Arg15496[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$alpha$gt$, [Arg15496_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digit_$gt$string$gt$, [Arg15496_0])),
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
  function shen_user_lambda15499(Arg15498) {
  if (Arg15498.length < 1) return [shen_type_func, shen_user_lambda15499, 1, Arg15498];
  var Arg15498_0 = Arg15498[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15498_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15498_0])[2], shenjs_call(shen_snd, [Arg15498_0])])]), ((shenjs_call(shen_digit_byte$question$, [shenjs_call(shen_fst, [Arg15498_0])[1]]))
  ? shenjs_n_$gt$string(shenjs_call(shen_fst, [Arg15498_0])[1])
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
  function shen_user_lambda15501(Arg15500) {
  if (Arg15500.length < 1) return [shen_type_func, shen_user_lambda15501, 1, Arg15500];
  var Arg15500_0 = Arg15500[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(48, Arg15500_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(49, Arg15500_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(50, Arg15500_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(51, Arg15500_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(52, Arg15500_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(53, Arg15500_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(54, Arg15500_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(55, Arg15500_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(56, Arg15500_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(57, Arg15500_0)))
  ? true
  : false))))))))))},
  1,
  [],
  "shen-digit-byte?"];
shenjs_functions["shen_shen-digit-byte?"] = shen_digit_byte$question$;






shen_$lt$alpha$gt$ = [shen_type_func,
  function shen_user_lambda15503(Arg15502) {
  if (Arg15502.length < 1) return [shen_type_func, shen_user_lambda15503, 1, Arg15502];
  var Arg15502_0 = Arg15502[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15502_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15502_0])[2], shenjs_call(shen_snd, [Arg15502_0])])]), ((R0 = shenjs_call(shen_symbol_byte_$gt$string, [shenjs_call(shen_fst, [Arg15502_0])[1]])),
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
  function shen_user_lambda15505(Arg15504) {
  if (Arg15504.length < 1) return [shen_type_func, shen_user_lambda15505, 1, Arg15504];
  var Arg15504_0 = Arg15504[0];
  return shenjs_absvector_ref((shenjs_globals["shen_shen-*symbolcodes*"]), Arg15504_0)},
  1,
  [],
  "shen-symbol-byte->string"];
shenjs_functions["shen_shen-symbol-byte->string"] = shen_symbol_byte_$gt$string;






shen_$lt$str$gt$ = [shen_type_func,
  function shen_user_lambda15507(Arg15506) {
  if (Arg15506.length < 1) return [shen_type_func, shen_user_lambda15507, 1, Arg15506];
  var Arg15506_0 = Arg15506[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$dbq$gt$, [Arg15506_0])),
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
  function shen_user_lambda15509(Arg15508) {
  if (Arg15508.length < 1) return [shen_type_func, shen_user_lambda15509, 1, Arg15508];
  var Arg15508_0 = Arg15508[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15508_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15508_0])[2], shenjs_call(shen_snd, [Arg15508_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15508_0])[1], 34)))
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
  function shen_user_lambda15511(Arg15510) {
  if (Arg15510.length < 1) return [shen_type_func, shen_user_lambda15511, 1, Arg15510];
  var Arg15510_0 = Arg15510[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$strc$gt$, [Arg15510_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$strcontents$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg15510_0])),
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
  function shen_user_lambda15513(Arg15512) {
  if (Arg15512.length < 1) return [shen_type_func, shen_user_lambda15513, 1, Arg15512];
  var Arg15512_0 = Arg15512[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15512_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15512_0])[2], shenjs_call(shen_snd, [Arg15512_0])])]), shenjs_n_$gt$string(shenjs_call(shen_fst, [Arg15512_0])[1])])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<byte>"];
shenjs_functions["shen_shen-<byte>"] = shen_$lt$byte$gt$;






shen_$lt$strc$gt$ = [shen_type_func,
  function shen_user_lambda15515(Arg15514) {
  if (Arg15514.length < 1) return [shen_type_func, shen_user_lambda15515, 1, Arg15514];
  var Arg15514_0 = Arg15514[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15514_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15514_0])[2], shenjs_call(shen_snd, [Arg15514_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15514_0])[1], 34)))
  ? shen_fail_obj
  : shenjs_n_$gt$string(shenjs_call(shen_fst, [Arg15514_0])[1]))])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<strc>"];
shenjs_functions["shen_shen-<strc>"] = shen_$lt$strc$gt$;






shen_$lt$backslash$gt$ = [shen_type_func,
  function shen_user_lambda15517(Arg15516) {
  if (Arg15516.length < 1) return [shen_type_func, shen_user_lambda15517, 1, Arg15516];
  var Arg15516_0 = Arg15516[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15516_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15516_0])[2], shenjs_call(shen_snd, [Arg15516_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15516_0])[1], 92)))
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
  function shen_user_lambda15519(Arg15518) {
  if (Arg15518.length < 1) return [shen_type_func, shen_user_lambda15519, 1, Arg15518];
  var Arg15518_0 = Arg15518[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$minus$gt$, [Arg15518_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$number$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), (0 - shenjs_call(shen_snd, [R0]))])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$plus$gt$, [Arg15518_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$number$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$predigits$gt$, [Arg15518_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg15518_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$predigits$gt$, [Arg15518_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg15518_0])),
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
  function shen_user_lambda15521(Arg15520) {
  if (Arg15520.length < 1) return [shen_type_func, shen_user_lambda15521, 1, Arg15520];
  var Arg15520_0 = Arg15520[0];
  var R0;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg15520_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(101, shenjs_call(shen_fst, [Arg15520_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15520_0])[2], shenjs_call(shen_snd, [Arg15520_0])])]), [shen_type_cons, 101, []]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<E>"];
shenjs_functions["shen_shen-<E>"] = shen_$lt$E$gt$;






shen_$lt$log10$gt$ = [shen_type_func,
  function shen_user_lambda15523(Arg15522) {
  if (Arg15522.length < 1) return [shen_type_func, shen_user_lambda15523, 1, Arg15522];
  var Arg15522_0 = Arg15522[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$minus$gt$, [Arg15522_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$digits$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), (0 - shenjs_call(shen_pre, [shenjs_call(shen_reverse, [shenjs_call(shen_snd, [R0])]), 0]))])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg15522_0])),
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
  function shen_user_lambda15525(Arg15524) {
  if (Arg15524.length < 1) return [shen_type_func, shen_user_lambda15525, 1, Arg15524];
  var Arg15524_0 = Arg15524[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15524_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15524_0])[2], shenjs_call(shen_snd, [Arg15524_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15524_0])[1], 43)))
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
  function shen_user_lambda15527(Arg15526) {
  if (Arg15526.length < 1) return [shen_type_func, shen_user_lambda15527, 1, Arg15526];
  var Arg15526_0 = Arg15526[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15526_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15526_0])[2], shenjs_call(shen_snd, [Arg15526_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15526_0])[1], 46)))
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
  function shen_user_lambda15529(Arg15528) {
  if (Arg15528.length < 1) return [shen_type_func, shen_user_lambda15529, 1, Arg15528];
  var Arg15528_0 = Arg15528[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg15528_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg15528_0])),
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
  function shen_user_lambda15531(Arg15530) {
  if (Arg15530.length < 1) return [shen_type_func, shen_user_lambda15531, 1, Arg15530];
  var Arg15530_0 = Arg15530[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg15530_0])),
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
  function shen_user_lambda15533(Arg15532) {
  if (Arg15532.length < 1) return [shen_type_func, shen_user_lambda15533, 1, Arg15532];
  var Arg15532_0 = Arg15532[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$digit$gt$, [Arg15532_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$digits$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digit$gt$, [Arg15532_0])),
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
  function shen_user_lambda15535(Arg15534) {
  if (Arg15534.length < 1) return [shen_type_func, shen_user_lambda15535, 1, Arg15534];
  var Arg15534_0 = Arg15534[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15534_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15534_0])[2], shenjs_call(shen_snd, [Arg15534_0])])]), ((shenjs_call(shen_digit_byte$question$, [shenjs_call(shen_fst, [Arg15534_0])[1]]))
  ? shenjs_call(shen_byte_$gt$digit, [shenjs_call(shen_fst, [Arg15534_0])[1]])
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
  function shen_user_lambda15537(Arg15536) {
  if (Arg15536.length < 1) return [shen_type_func, shen_user_lambda15537, 1, Arg15536];
  var Arg15536_0 = Arg15536[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(48, Arg15536_0)))
  ? 0
  : ((shenjs_unwind_tail(shenjs_$eq$(49, Arg15536_0)))
  ? 1
  : ((shenjs_unwind_tail(shenjs_$eq$(50, Arg15536_0)))
  ? 2
  : ((shenjs_unwind_tail(shenjs_$eq$(51, Arg15536_0)))
  ? 3
  : ((shenjs_unwind_tail(shenjs_$eq$(52, Arg15536_0)))
  ? 4
  : ((shenjs_unwind_tail(shenjs_$eq$(53, Arg15536_0)))
  ? 5
  : ((shenjs_unwind_tail(shenjs_$eq$(54, Arg15536_0)))
  ? 6
  : ((shenjs_unwind_tail(shenjs_$eq$(55, Arg15536_0)))
  ? 7
  : ((shenjs_unwind_tail(shenjs_$eq$(56, Arg15536_0)))
  ? 8
  : ((shenjs_unwind_tail(shenjs_$eq$(57, Arg15536_0)))
  ? 9
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-byte->digit"]]);})))))))))))},
  1,
  [],
  "shen-byte->digit"];
shenjs_functions["shen_shen-byte->digit"] = shen_byte_$gt$digit;






shen_pre = [shen_type_func,
  function shen_user_lambda15539(Arg15538) {
  if (Arg15538.length < 2) return [shen_type_func, shen_user_lambda15539, 2, Arg15538];
  var Arg15538_0 = Arg15538[0], Arg15538_1 = Arg15538[1];
  return ((shenjs_empty$question$(Arg15538_0))
  ? 0
  : ((shenjs_is_type(Arg15538_0, shen_type_cons))
  ? ((shenjs_call(shen_expt, [10, Arg15538_1]) * Arg15538_0[1]) + shenjs_call(shen_pre, [Arg15538_0[2], (Arg15538_1 + 1)]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-pre"]]);})))},
  2,
  [],
  "shen-pre"];
shenjs_functions["shen_shen-pre"] = shen_pre;






shen_post = [shen_type_func,
  function shen_user_lambda15541(Arg15540) {
  if (Arg15540.length < 2) return [shen_type_func, shen_user_lambda15541, 2, Arg15540];
  var Arg15540_0 = Arg15540[0], Arg15540_1 = Arg15540[1];
  return ((shenjs_empty$question$(Arg15540_0))
  ? 0
  : ((shenjs_is_type(Arg15540_0, shen_type_cons))
  ? ((shenjs_call(shen_expt, [10, (0 - Arg15540_1)]) * Arg15540_0[1]) + shenjs_call(shen_post, [Arg15540_0[2], (Arg15540_1 + 1)]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-post"]]);})))},
  2,
  [],
  "shen-post"];
shenjs_functions["shen_shen-post"] = shen_post;






shen_expt = [shen_type_func,
  function shen_user_lambda15543(Arg15542) {
  if (Arg15542.length < 2) return [shen_type_func, shen_user_lambda15543, 2, Arg15542];
  var Arg15542_0 = Arg15542[0], Arg15542_1 = Arg15542[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg15542_1)))
  ? 1
  : (((Arg15542_1 > 0))
  ? (Arg15542_0 * shenjs_call(shen_expt, [Arg15542_0, (Arg15542_1 - 1)]))
  : (1.0 * (shenjs_call(shen_expt, [Arg15542_0, (Arg15542_1 + 1)]) / Arg15542_0))))},
  2,
  [],
  "shen-expt"];
shenjs_functions["shen_shen-expt"] = shen_expt;






shen_$lt$st$_input1$gt$ = [shen_type_func,
  function shen_user_lambda15545(Arg15544) {
  if (Arg15544.length < 1) return [shen_type_func, shen_user_lambda15545, 1, Arg15544];
  var Arg15544_0 = Arg15544[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [Arg15544_0])),
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
  function shen_user_lambda15547(Arg15546) {
  if (Arg15546.length < 1) return [shen_type_func, shen_user_lambda15547, 1, Arg15546];
  var Arg15546_0 = Arg15546[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [Arg15546_0])),
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
  function shen_user_lambda15549(Arg15548) {
  if (Arg15548.length < 1) return [shen_type_func, shen_user_lambda15549, 1, Arg15548];
  var Arg15548_0 = Arg15548[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$backslash$gt$, [Arg15548_0])),
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
  function shen_user_lambda15551(Arg15550) {
  if (Arg15550.length < 1) return [shen_type_func, shen_user_lambda15551, 1, Arg15550];
  var Arg15550_0 = Arg15550[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15550_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15550_0])[2], shenjs_call(shen_snd, [Arg15550_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15550_0])[1], 42)))
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
  function shen_user_lambda15553(Arg15552) {
  if (Arg15552.length < 1) return [shen_type_func, shen_user_lambda15553, 1, Arg15552];
  var Arg15552_0 = Arg15552[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$comment$gt$, [Arg15552_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$any$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_symbol, "shen-skip"]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$blah$gt$, [Arg15552_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$any$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_symbol, "shen-skip"]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg15552_0])),
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
  function shen_user_lambda15555(Arg15554) {
  if (Arg15554.length < 1) return [shen_type_func, shen_user_lambda15555, 1, Arg15554];
  var Arg15554_0 = Arg15554[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15554_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15554_0])[2], shenjs_call(shen_snd, [Arg15554_0])])]), ((shenjs_call(shen_end_of_comment$question$, [shenjs_call(shen_fst, [Arg15554_0])]))
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
  function shen_user_lambda15557(Arg15556) {
  if (Arg15556.length < 1) return [shen_type_func, shen_user_lambda15557, 1, Arg15556];
  var Arg15556_0 = Arg15556[0];
  return (((shenjs_is_type(Arg15556_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(42, Arg15556_0[1])) && (shenjs_is_type(Arg15556_0[2], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(92, Arg15556_0[2][1]))))))
  ? true
  : false)},
  1,
  [],
  "shen-end-of-comment?"];
shenjs_functions["shen_shen-end-of-comment?"] = shen_end_of_comment$question$;






shen_$lt$whitespaces$gt$ = [shen_type_func,
  function shen_user_lambda15559(Arg15558) {
  if (Arg15558.length < 1) return [shen_type_func, shen_user_lambda15559, 1, Arg15558];
  var Arg15558_0 = Arg15558[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$whitespace$gt$, [Arg15558_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$whitespaces$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_symbol, "shen-skip"]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$whitespace$gt$, [Arg15558_0])),
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
  function shen_user_lambda15561(Arg15560) {
  if (Arg15560.length < 1) return [shen_type_func, shen_user_lambda15561, 1, Arg15560];
  var Arg15560_0 = Arg15560[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15560_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15560_0])[2], shenjs_call(shen_snd, [Arg15560_0])])]), ((R0 = shenjs_call(shen_fst, [Arg15560_0])[1]),
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
  function shen_user_lambda15563(Arg15562) {
  if (Arg15562.length < 1) return [shen_type_func, shen_user_lambda15563, 1, Arg15562];
  var Arg15562_0 = Arg15562[0];
  return ((shenjs_empty$question$(Arg15562_0))
  ? []
  : (((shenjs_is_type(Arg15562_0, shen_type_cons) && (shenjs_is_type(Arg15562_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "bar!"], Arg15562_0[2][1])) && (shenjs_is_type(Arg15562_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15562_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, Arg15562_0[1], Arg15562_0[2][2]]]
  : ((shenjs_is_type(Arg15562_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, Arg15562_0[1], [shen_type_cons, shenjs_call(shen_cons$_form, [Arg15562_0[2]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-cons_form"]]);}))))},
  1,
  [],
  "shen-cons_form"];
shenjs_functions["shen_shen-cons_form"] = shen_cons$_form;






shen_package_macro = [shen_type_func,
  function shen_user_lambda15565(Arg15564) {
  if (Arg15564.length < 2) return [shen_type_func, shen_user_lambda15565, 2, Arg15564];
  var Arg15564_0 = Arg15564[0], Arg15564_1 = Arg15564[1];
  var R0;
  return (((shenjs_is_type(Arg15564_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "$"], Arg15564_0[1])) && (shenjs_is_type(Arg15564_0[2], shen_type_cons) && shenjs_empty$question$(Arg15564_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(shen_explode, [Arg15564_0[2][1]]), Arg15564_1]);})
  : (((shenjs_is_type(Arg15564_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg15564_0[1])) && (shenjs_is_type(Arg15564_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "null"], Arg15564_0[2][1])) && shenjs_is_type(Arg15564_0[2][2], shen_type_cons))))))
  ? (function() {
  return shenjs_call_tail(shen_append, [Arg15564_0[2][2][2], Arg15564_1]);})
  : (((shenjs_is_type(Arg15564_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg15564_0[1])) && (shenjs_is_type(Arg15564_0[2], shen_type_cons) && shenjs_is_type(Arg15564_0[2][2], shen_type_cons)))))
  ? ((R0 = shenjs_call(shen_eval_without_macros, [Arg15564_0[2][2][1]])),
  shenjs_call(shen_record_exceptions, [R0, Arg15564_0[2][1]]),
  (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(shen_packageh, [Arg15564_0[2][1], R0, Arg15564_0[2][2][2]]), Arg15564_1]);}))
  : [shen_type_cons, Arg15564_0, Arg15564_1])))},
  2,
  [],
  "shen-package-macro"];
shenjs_functions["shen_shen-package-macro"] = shen_package_macro;






shen_record_exceptions = [shen_type_func,
  function shen_user_lambda15567(Arg15566) {
  if (Arg15566.length < 2) return [shen_type_func, shen_user_lambda15567, 2, Arg15566];
  var Arg15566_0 = Arg15566[0], Arg15566_1 = Arg15566[1];
  var R0;
  return ((R0 = shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg15566_1, [shen_type_symbol, "shen-external-symbols"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda15569(Arg15568) {
  if (Arg15568.length < 1) return [shen_type_func, shen_user_lambda15569, 1, Arg15568];
  var Arg15568_0 = Arg15568[0];
  return []},
  1,
  []])),
  (R0 = shenjs_call(shen_union, [Arg15566_0, R0])),
  (function() {
  return shenjs_call_tail(shen_put, [Arg15566_1, [shen_type_symbol, "shen-external-symbols"], R0, (shenjs_globals["shen_shen-*property-vector*"])]);}))},
  2,
  [],
  "shen-record-exceptions"];
shenjs_functions["shen_shen-record-exceptions"] = shen_record_exceptions;






shen_packageh = [shen_type_func,
  function shen_user_lambda15571(Arg15570) {
  if (Arg15570.length < 3) return [shen_type_func, shen_user_lambda15571, 3, Arg15570];
  var Arg15570_0 = Arg15570[0], Arg15570_1 = Arg15570[1], Arg15570_2 = Arg15570[2];
  return ((shenjs_is_type(Arg15570_2, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_packageh, [Arg15570_0, Arg15570_1, Arg15570_2[1]]), shenjs_call(shen_packageh, [Arg15570_0, Arg15570_1, Arg15570_2[2]])]
  : (((shenjs_call(shen_sysfunc$question$, [Arg15570_2]) || (shenjs_call(shen_variable$question$, [Arg15570_2]) || (shenjs_call(shen_element$question$, [Arg15570_2, Arg15570_1]) || (shenjs_call(shen_doubleunderline$question$, [Arg15570_2]) || shenjs_call(shen_singleunderline$question$, [Arg15570_2]))))))
  ? Arg15570_2
  : (((shenjs_is_type(Arg15570_2, shen_type_symbol) && (!shenjs_call(shen_prefix$question$, [[shen_type_cons, "s", [shen_type_cons, "h", [shen_type_cons, "e", [shen_type_cons, "n", [shen_type_cons, "-", []]]]]], shenjs_call(shen_explode, [Arg15570_2])]))))
  ? (function() {
  return shenjs_call_tail(shen_concat, [Arg15570_0, Arg15570_2]);})
  : Arg15570_2)))},
  3,
  [],
  "shen-packageh"];
shenjs_functions["shen_shen-packageh"] = shen_packageh;












shen_$lt$defprolog$gt$ = [shen_type_func,
  function shen_user_lambda15122(Arg15121) {
  if (Arg15121.length < 1) return [shen_type_func, shen_user_lambda15122, 1, Arg15121];
  var Arg15121_0 = Arg15121[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$predicate$asterisk$$gt$, [Arg15121_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$clauses$asterisk$$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_prolog_$gt$shen, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15124(Arg15123) {
  if (Arg15123.length < 2) return [shen_type_func, shen_user_lambda15124, 2, Arg15123];
  var Arg15123_0 = Arg15123[0], Arg15123_1 = Arg15123[1];
  return (function() {
  return shenjs_call_tail(shen_insert_predicate, [shenjs_call(shen_snd, [Arg15123_0]), Arg15123_1]);})},
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
  function shen_user_lambda15126(Arg15125) {
  if (Arg15125.length < 2) return [shen_type_func, shen_user_lambda15126, 2, Arg15125];
  var Arg15125_0 = Arg15125[0], Arg15125_1 = Arg15125[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["prolog syntax error in ~A here:~%~% ~A~%", [shen_tuple, Arg15125_0, [shen_tuple, shenjs_call(shen_next_50, [50, Arg15125_1]), []]]]);})},
  2,
  [],
  "shen-prolog-error"];
shenjs_functions["shen_shen-prolog-error"] = shen_prolog_error;






shen_next_50 = [shen_type_func,
  function shen_user_lambda15128(Arg15127) {
  if (Arg15127.length < 2) return [shen_type_func, shen_user_lambda15128, 2, Arg15127];
  var Arg15127_0 = Arg15127[0], Arg15127_1 = Arg15127[1];
  return ((shenjs_empty$question$(Arg15127_1))
  ? ""
  : ((shenjs_unwind_tail(shenjs_$eq$(0, Arg15127_0)))
  ? ""
  : ((shenjs_is_type(Arg15127_1, shen_type_cons))
  ? (shenjs_call(shen_decons_string, [Arg15127_1[1]]) + shenjs_call(shen_next_50, [(Arg15127_0 - 1), Arg15127_1[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-next-50"]]);}))))},
  2,
  [],
  "shen-next-50"];
shenjs_functions["shen_shen-next-50"] = shen_next_50;






shen_decons_string = [shen_type_func,
  function shen_user_lambda15130(Arg15129) {
  if (Arg15129.length < 1) return [shen_type_func, shen_user_lambda15130, 1, Arg15129];
  var Arg15129_0 = Arg15129[0];
  return (((shenjs_is_type(Arg15129_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg15129_0[1])) && (shenjs_is_type(Arg15129_0[2], shen_type_cons) && (shenjs_is_type(Arg15129_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15129_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~S ", [shen_tuple, shenjs_call(shen_eval_cons, [Arg15129_0]), []]]);})
  : (function() {
  return shenjs_call_tail(shen_intmake_string, ["~R ", [shen_tuple, Arg15129_0, []]]);}))},
  1,
  [],
  "shen-decons-string"];
shenjs_functions["shen_shen-decons-string"] = shen_decons_string;






shen_insert_predicate = [shen_type_func,
  function shen_user_lambda15132(Arg15131) {
  if (Arg15131.length < 2) return [shen_type_func, shen_user_lambda15132, 2, Arg15131];
  var Arg15131_0 = Arg15131[0], Arg15131_1 = Arg15131[1];
  return (((shenjs_is_type(Arg15131_1, shen_type_cons) && (shenjs_is_type(Arg15131_1[2], shen_type_cons) && shenjs_empty$question$(Arg15131_1[2][2]))))
  ? [shen_type_cons, [shen_type_cons, Arg15131_0, Arg15131_1[1]], [shen_type_cons, [shen_type_symbol, ":-"], Arg15131_1[2]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-insert-predicate"]]);}))},
  2,
  [],
  "shen-insert-predicate"];
shenjs_functions["shen_shen-insert-predicate"] = shen_insert_predicate;






shen_$lt$predicate$asterisk$$gt$ = [shen_type_func,
  function shen_user_lambda15134(Arg15133) {
  if (Arg15133.length < 1) return [shen_type_func, shen_user_lambda15134, 1, Arg15133];
  var Arg15133_0 = Arg15133[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15133_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15133_0])[2], shenjs_call(shen_snd, [Arg15133_0])])]), shenjs_call(shen_fst, [Arg15133_0])[1]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<predicate*>"];
shenjs_functions["shen_shen-<predicate*>"] = shen_$lt$predicate$asterisk$$gt$;






shen_$lt$clauses$asterisk$$gt$ = [shen_type_func,
  function shen_user_lambda15136(Arg15135) {
  if (Arg15135.length < 1) return [shen_type_func, shen_user_lambda15136, 1, Arg15135];
  var Arg15135_0 = Arg15135[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$clause$asterisk$$gt$, [Arg15135_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$clauses$asterisk$$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg15135_0])),
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
  function shen_user_lambda15138(Arg15137) {
  if (Arg15137.length < 1) return [shen_type_func, shen_user_lambda15138, 1, Arg15137];
  var Arg15137_0 = Arg15137[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$head$asterisk$$gt$, [Arg15137_0])),
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
  function shen_user_lambda15140(Arg15139) {
  if (Arg15139.length < 1) return [shen_type_func, shen_user_lambda15140, 1, Arg15139];
  var Arg15139_0 = Arg15139[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$term$asterisk$$gt$, [Arg15139_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$head$asterisk$$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg15139_0])),
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
  function shen_user_lambda15142(Arg15141) {
  if (Arg15141.length < 1) return [shen_type_func, shen_user_lambda15142, 1, Arg15141];
  var Arg15141_0 = Arg15141[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15141_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15141_0])[2], shenjs_call(shen_snd, [Arg15141_0])])]), ((((!shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "<--"], shenjs_call(shen_fst, [Arg15141_0])[1]))) && shenjs_call(shen_legitimate_term$question$, [shenjs_call(shen_fst, [Arg15141_0])[1]])))
  ? shenjs_call(shen_eval_cons, [shenjs_call(shen_fst, [Arg15141_0])[1]])
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
  function shen_user_lambda15144(Arg15143) {
  if (Arg15143.length < 1) return [shen_type_func, shen_user_lambda15144, 1, Arg15143];
  var Arg15143_0 = Arg15143[0];
  return (((shenjs_is_type(Arg15143_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg15143_0[1])) && (shenjs_is_type(Arg15143_0[2], shen_type_cons) && (shenjs_is_type(Arg15143_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15143_0[2][2][2]))))))
  ? (shenjs_call(shen_legitimate_term$question$, [Arg15143_0[2][1]]) && shenjs_call(shen_legitimate_term$question$, [Arg15143_0[2][2][1]]))
  : (((shenjs_is_type(Arg15143_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg15143_0[1])) && (shenjs_is_type(Arg15143_0[2], shen_type_cons) && (shenjs_is_type(Arg15143_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg15143_0[2][2][1])) && shenjs_empty$question$(Arg15143_0[2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(shen_legitimate_term$question$, [Arg15143_0[2][1]]);})
  : (((shenjs_is_type(Arg15143_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg15143_0[1])) && (shenjs_is_type(Arg15143_0[2], shen_type_cons) && (shenjs_is_type(Arg15143_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg15143_0[2][2][1])) && shenjs_empty$question$(Arg15143_0[2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(shen_legitimate_term$question$, [Arg15143_0[2][1]]);})
  : ((shenjs_is_type(Arg15143_0, shen_type_cons))
  ? false
  : true))))},
  1,
  [],
  "shen-legitimate-term?"];
shenjs_functions["shen_shen-legitimate-term?"] = shen_legitimate_term$question$;






shen_eval_cons = [shen_type_func,
  function shen_user_lambda15146(Arg15145) {
  if (Arg15145.length < 1) return [shen_type_func, shen_user_lambda15146, 1, Arg15145];
  var Arg15145_0 = Arg15145[0];
  return (((shenjs_is_type(Arg15145_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg15145_0[1])) && (shenjs_is_type(Arg15145_0[2], shen_type_cons) && (shenjs_is_type(Arg15145_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15145_0[2][2][2]))))))
  ? [shen_type_cons, shenjs_call(shen_eval_cons, [Arg15145_0[2][1]]), shenjs_call(shen_eval_cons, [Arg15145_0[2][2][1]])]
  : (((shenjs_is_type(Arg15145_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg15145_0[1])) && (shenjs_is_type(Arg15145_0[2], shen_type_cons) && (shenjs_is_type(Arg15145_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15145_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, shenjs_call(shen_eval_cons, [Arg15145_0[2][1]]), Arg15145_0[2][2]]]
  : Arg15145_0))},
  1,
  [],
  "shen-eval-cons"];
shenjs_functions["shen_shen-eval-cons"] = shen_eval_cons;






shen_$lt$body$asterisk$$gt$ = [shen_type_func,
  function shen_user_lambda15148(Arg15147) {
  if (Arg15147.length < 1) return [shen_type_func, shen_user_lambda15148, 1, Arg15147];
  var Arg15147_0 = Arg15147[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$literal$asterisk$$gt$, [Arg15147_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$body$asterisk$$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg15147_0])),
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
  function shen_user_lambda15150(Arg15149) {
  if (Arg15149.length < 1) return [shen_type_func, shen_user_lambda15150, 1, Arg15149];
  var Arg15149_0 = Arg15149[0];
  var R0;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg15149_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "!"], shenjs_call(shen_fst, [Arg15149_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15149_0])[2], shenjs_call(shen_snd, [Arg15149_0])])]), [shen_type_cons, [shen_type_symbol, "cut"], [shen_type_cons, [shen_type_symbol, "Throwcontrol"], []]]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15149_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15149_0])[2], shenjs_call(shen_snd, [Arg15149_0])])]), ((shenjs_is_type(shenjs_call(shen_fst, [Arg15149_0])[1], shen_type_cons))
  ? shenjs_call(shen_fst, [Arg15149_0])[1]
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
  function shen_user_lambda15152(Arg15151) {
  if (Arg15151.length < 1) return [shen_type_func, shen_user_lambda15152, 1, Arg15151];
  var Arg15151_0 = Arg15151[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg15151_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg15151_0])[2], shenjs_call(shen_snd, [Arg15151_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg15151_0])[1], [shen_type_symbol, ";"])))
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
  function shen_user_lambda15154(Arg15153) {
  if (Arg15153.length < 3) return [shen_type_func, shen_user_lambda15154, 3, Arg15153];
  var Arg15153_0 = Arg15153[0], Arg15153_1 = Arg15153[1], Arg15153_2 = Arg15153[2];
  var R0;
  return ((R0 = shenjs_unwind_tail(shenjs_thaw(Arg15153_2))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? Arg15153_0
  : R0))},
  3,
  [],
  "cut"];
shenjs_functions["shen_cut"] = shen_cut;






shen_insert$_modes = [shen_type_func,
  function shen_user_lambda15156(Arg15155) {
  if (Arg15155.length < 1) return [shen_type_func, shen_user_lambda15156, 1, Arg15155];
  var Arg15155_0 = Arg15155[0];
  return (((shenjs_is_type(Arg15155_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg15155_0[1])) && (shenjs_is_type(Arg15155_0[2], shen_type_cons) && (shenjs_is_type(Arg15155_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15155_0[2][2][2]))))))
  ? Arg15155_0
  : ((shenjs_empty$question$(Arg15155_0))
  ? []
  : ((shenjs_is_type(Arg15155_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg15155_0[1], [shen_type_cons, [shen_type_symbol, "+"], []]]], [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, shenjs_call(shen_insert$_modes, [Arg15155_0[2]]), [shen_type_cons, [shen_type_symbol, "-"], []]]]]
  : Arg15155_0)))},
  1,
  [],
  "shen-insert_modes"];
shenjs_functions["shen_shen-insert_modes"] = shen_insert$_modes;






shen_s_prolog = [shen_type_func,
  function shen_user_lambda15158(Arg15157) {
  if (Arg15157.length < 1) return [shen_type_func, shen_user_lambda15158, 1, Arg15157];
  var Arg15157_0 = Arg15157[0];
  return (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda15160(Arg15159) {
  if (Arg15159.length < 1) return [shen_type_func, shen_user_lambda15160, 1, Arg15159];
  var Arg15159_0 = Arg15159[0];
  return (function() {
  return shenjs_call_tail(shen_eval, [Arg15159_0]);})},
  1,
  []], shenjs_call(shen_prolog_$gt$shen, [Arg15157_0])]);})},
  1,
  [],
  "shen-s-prolog"];
shenjs_functions["shen_shen-s-prolog"] = shen_s_prolog;






shen_prolog_$gt$shen = [shen_type_func,
  function shen_user_lambda15162(Arg15161) {
  if (Arg15161.length < 1) return [shen_type_func, shen_user_lambda15162, 1, Arg15161];
  var Arg15161_0 = Arg15161[0];
  return (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda15164(Arg15163) {
  if (Arg15163.length < 1) return [shen_type_func, shen_user_lambda15164, 1, Arg15163];
  var Arg15163_0 = Arg15163[0];
  return (function() {
  return shenjs_call_tail(shen_compile$_prolog$_procedure, [Arg15163_0]);})},
  1,
  []], shenjs_call(shen_group$_clauses, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15166(Arg15165) {
  if (Arg15165.length < 1) return [shen_type_func, shen_user_lambda15166, 1, Arg15165];
  var Arg15165_0 = Arg15165[0];
  return (function() {
  return shenjs_call_tail(shen_s_prolog$_clause, [Arg15165_0]);})},
  1,
  []], shenjs_call(shen_mapcan, [[shen_type_func,
  function shen_user_lambda15168(Arg15167) {
  if (Arg15167.length < 1) return [shen_type_func, shen_user_lambda15168, 1, Arg15167];
  var Arg15167_0 = Arg15167[0];
  return (function() {
  return shenjs_call_tail(shen_head$_abstraction, [Arg15167_0]);})},
  1,
  []], Arg15161_0])])])]);})},
  1,
  [],
  "shen-prolog->shen"];
shenjs_functions["shen_shen-prolog->shen"] = shen_prolog_$gt$shen;






shen_s_prolog$_clause = [shen_type_func,
  function shen_user_lambda15170(Arg15169) {
  if (Arg15169.length < 1) return [shen_type_func, shen_user_lambda15170, 1, Arg15169];
  var Arg15169_0 = Arg15169[0];
  return (((shenjs_is_type(Arg15169_0, shen_type_cons) && (shenjs_is_type(Arg15169_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg15169_0[2][1])) && (shenjs_is_type(Arg15169_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15169_0[2][2][2]))))))
  ? [shen_type_cons, Arg15169_0[1], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15172(Arg15171) {
  if (Arg15171.length < 1) return [shen_type_func, shen_user_lambda15172, 1, Arg15171];
  var Arg15171_0 = Arg15171[0];
  return (function() {
  return shenjs_call_tail(shen_s_prolog$_literal, [Arg15171_0]);})},
  1,
  []], Arg15169_0[2][2][1]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-s-prolog_clause"]]);}))},
  1,
  [],
  "shen-s-prolog_clause"];
shenjs_functions["shen_shen-s-prolog_clause"] = shen_s_prolog$_clause;






shen_head$_abstraction = [shen_type_func,
  function shen_user_lambda15174(Arg15173) {
  if (Arg15173.length < 1) return [shen_type_func, shen_user_lambda15174, 1, Arg15173];
  var Arg15173_0 = Arg15173[0];
  var R0, R1;
  return (((shenjs_is_type(Arg15173_0, shen_type_cons) && (shenjs_is_type(Arg15173_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg15173_0[2][1])) && (shenjs_is_type(Arg15173_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg15173_0[2][2][2]) && (shenjs_call(shen_complexity$_head, [Arg15173_0[1]]) < (shenjs_globals["shen_shen-*maxcomplexity*"]))))))))
  ? [shen_type_cons, Arg15173_0, []]
  : (((shenjs_is_type(Arg15173_0, shen_type_cons) && (shenjs_is_type(Arg15173_0[1], shen_type_cons) && (shenjs_is_type(Arg15173_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg15173_0[2][1])) && (shenjs_is_type(Arg15173_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15173_0[2][2][2])))))))
  ? ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15176(Arg15175) {
  if (Arg15175.length < 1) return [shen_type_func, shen_user_lambda15176, 1, Arg15175];
  var Arg15175_0 = Arg15175[0];
  return (function() {
  return shenjs_call_tail(shen_gensym, [[shen_type_symbol, "V"]]);})},
  1,
  []], Arg15173_0[1][2]])),
  (R1 = shenjs_call(shen_rcons$_form, [shenjs_call(shen_remove$_modes, [Arg15173_0[1][2]])])),
  (R1 = [shen_type_cons, [shen_type_symbol, "unify"], [shen_type_cons, shenjs_call(shen_cons$_form, [R0]), [shen_type_cons, R1, []]]]),
  (R1 = [shen_type_cons, [shen_type_cons, Arg15173_0[1][1], R0], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [shen_type_cons, R1, Arg15173_0[2][2][1]], []]]]),
  [shen_type_cons, R1, []])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-head_abstraction"]]);})))},
  1,
  [],
  "shen-head_abstraction"];
shenjs_functions["shen_shen-head_abstraction"] = shen_head$_abstraction;






shen_complexity$_head = [shen_type_func,
  function shen_user_lambda15178(Arg15177) {
  if (Arg15177.length < 1) return [shen_type_func, shen_user_lambda15178, 1, Arg15177];
  var Arg15177_0 = Arg15177[0];
  return ((shenjs_is_type(Arg15177_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_product, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15180(Arg15179) {
  if (Arg15179.length < 1) return [shen_type_func, shen_user_lambda15180, 1, Arg15179];
  var Arg15179_0 = Arg15179[0];
  return (function() {
  return shenjs_call_tail(shen_complexity, [Arg15179_0]);})},
  1,
  []], Arg15177_0[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-complexity_head"]]);}))},
  1,
  [],
  "shen-complexity_head"];
shenjs_functions["shen_shen-complexity_head"] = shen_complexity$_head;






shen_complexity = [shen_type_func,
  function shen_user_lambda15182(Arg15181) {
  if (Arg15181.length < 1) return [shen_type_func, shen_user_lambda15182, 1, Arg15181];
  var Arg15181_0 = Arg15181[0];
  return (((shenjs_is_type(Arg15181_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg15181_0[1])) && (shenjs_is_type(Arg15181_0[2], shen_type_cons) && (shenjs_is_type(Arg15181_0[2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg15181_0[2][1][1])) && (shenjs_is_type(Arg15181_0[2][1][2], shen_type_cons) && (shenjs_is_type(Arg15181_0[2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg15181_0[2][1][2][2][2]) && (shenjs_is_type(Arg15181_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15181_0[2][2][2])))))))))))
  ? (function() {
  return shenjs_call_tail(shen_complexity, [Arg15181_0[2][1]]);})
  : (((shenjs_is_type(Arg15181_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg15181_0[1])) && (shenjs_is_type(Arg15181_0[2], shen_type_cons) && (shenjs_is_type(Arg15181_0[2][1], shen_type_cons) && (shenjs_is_type(Arg15181_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg15181_0[2][2][1])) && shenjs_empty$question$(Arg15181_0[2][2][2]))))))))
  ? (2 * (shenjs_call(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg15181_0[2][1][1], Arg15181_0[2][2]]]]) * shenjs_call(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg15181_0[2][1][2], Arg15181_0[2][2]]]])))
  : (((shenjs_is_type(Arg15181_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg15181_0[1])) && (shenjs_is_type(Arg15181_0[2], shen_type_cons) && (shenjs_is_type(Arg15181_0[2][1], shen_type_cons) && (shenjs_is_type(Arg15181_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg15181_0[2][2][1])) && shenjs_empty$question$(Arg15181_0[2][2][2]))))))))
  ? (shenjs_call(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg15181_0[2][1][1], Arg15181_0[2][2]]]]) * shenjs_call(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg15181_0[2][1][2], Arg15181_0[2][2]]]]))
  : (((shenjs_is_type(Arg15181_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg15181_0[1])) && (shenjs_is_type(Arg15181_0[2], shen_type_cons) && (shenjs_is_type(Arg15181_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg15181_0[2][2][2]) && shenjs_call(shen_variable$question$, [Arg15181_0[2][1]])))))))
  ? 1
  : (((shenjs_is_type(Arg15181_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg15181_0[1])) && (shenjs_is_type(Arg15181_0[2], shen_type_cons) && (shenjs_is_type(Arg15181_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg15181_0[2][2][1])) && shenjs_empty$question$(Arg15181_0[2][2][2])))))))
  ? 2
  : (((shenjs_is_type(Arg15181_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg15181_0[1])) && (shenjs_is_type(Arg15181_0[2], shen_type_cons) && (shenjs_is_type(Arg15181_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg15181_0[2][2][1])) && shenjs_empty$question$(Arg15181_0[2][2][2])))))))
  ? 1
  : (function() {
  return shenjs_call_tail(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg15181_0, [shen_type_cons, [shen_type_symbol, "+"], []]]]]);})))))))},
  1,
  [],
  "shen-complexity"];
shenjs_functions["shen_shen-complexity"] = shen_complexity;






shen_product = [shen_type_func,
  function shen_user_lambda15184(Arg15183) {
  if (Arg15183.length < 1) return [shen_type_func, shen_user_lambda15184, 1, Arg15183];
  var Arg15183_0 = Arg15183[0];
  return ((shenjs_empty$question$(Arg15183_0))
  ? 1
  : ((shenjs_is_type(Arg15183_0, shen_type_cons))
  ? (Arg15183_0[1] * shenjs_call(shen_product, [Arg15183_0[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-product"]]);})))},
  1,
  [],
  "shen-product"];
shenjs_functions["shen_shen-product"] = shen_product;






shen_s_prolog$_literal = [shen_type_func,
  function shen_user_lambda15186(Arg15185) {
  if (Arg15185.length < 1) return [shen_type_func, shen_user_lambda15186, 1, Arg15185];
  var Arg15185_0 = Arg15185[0];
  return (((shenjs_is_type(Arg15185_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "is"], Arg15185_0[1])) && (shenjs_is_type(Arg15185_0[2], shen_type_cons) && (shenjs_is_type(Arg15185_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15185_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, Arg15185_0[2][1], [shen_type_cons, shenjs_call(shen_insert$_deref, [Arg15185_0[2][2][1]]), []]]]
  : (((shenjs_is_type(Arg15185_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "when"], Arg15185_0[1])) && (shenjs_is_type(Arg15185_0[2], shen_type_cons) && shenjs_empty$question$(Arg15185_0[2][2])))))
  ? [shen_type_cons, [shen_type_symbol, "fwhen"], [shen_type_cons, shenjs_call(shen_insert$_deref, [Arg15185_0[2][1]]), []]]
  : (((shenjs_is_type(Arg15185_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "bind"], Arg15185_0[1])) && (shenjs_is_type(Arg15185_0[2], shen_type_cons) && (shenjs_is_type(Arg15185_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15185_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, Arg15185_0[2][1], [shen_type_cons, shenjs_call(shen_insert$_lazyderef, [Arg15185_0[2][2][1]]), []]]]
  : (((shenjs_is_type(Arg15185_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fwhen"], Arg15185_0[1])) && (shenjs_is_type(Arg15185_0[2], shen_type_cons) && shenjs_empty$question$(Arg15185_0[2][2])))))
  ? [shen_type_cons, [shen_type_symbol, "fwhen"], [shen_type_cons, shenjs_call(shen_insert$_lazyderef, [Arg15185_0[2][1]]), []]]
  : ((shenjs_is_type(Arg15185_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_m$_prolog$_to$_s_prolog$_predicate, [Arg15185_0[1]]), Arg15185_0[2]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-s-prolog_literal"]]);}))))))},
  1,
  [],
  "shen-s-prolog_literal"];
shenjs_functions["shen_shen-s-prolog_literal"] = shen_s_prolog$_literal;






shen_insert$_deref = [shen_type_func,
  function shen_user_lambda15188(Arg15187) {
  if (Arg15187.length < 1) return [shen_type_func, shen_user_lambda15188, 1, Arg15187];
  var Arg15187_0 = Arg15187[0];
  return ((shenjs_call(shen_variable$question$, [Arg15187_0]))
  ? [shen_type_cons, [shen_type_symbol, "shen-deref"], [shen_type_cons, Arg15187_0, [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]]
  : ((shenjs_is_type(Arg15187_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_insert$_deref, [Arg15187_0[1]]), shenjs_call(shen_insert$_deref, [Arg15187_0[2]])]
  : Arg15187_0))},
  1,
  [],
  "shen-insert_deref"];
shenjs_functions["shen_shen-insert_deref"] = shen_insert$_deref;






shen_insert$_lazyderef = [shen_type_func,
  function shen_user_lambda15190(Arg15189) {
  if (Arg15189.length < 1) return [shen_type_func, shen_user_lambda15190, 1, Arg15189];
  var Arg15189_0 = Arg15189[0];
  return ((shenjs_call(shen_variable$question$, [Arg15189_0]))
  ? [shen_type_cons, [shen_type_symbol, "shen-lazyderef"], [shen_type_cons, Arg15189_0, [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]]
  : ((shenjs_is_type(Arg15189_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_insert$_lazyderef, [Arg15189_0[1]]), shenjs_call(shen_insert$_lazyderef, [Arg15189_0[2]])]
  : Arg15189_0))},
  1,
  [],
  "shen-insert_lazyderef"];
shenjs_functions["shen_shen-insert_lazyderef"] = shen_insert$_lazyderef;






shen_m$_prolog$_to$_s_prolog$_predicate = [shen_type_func,
  function shen_user_lambda15192(Arg15191) {
  if (Arg15191.length < 1) return [shen_type_func, shen_user_lambda15192, 1, Arg15191];
  var Arg15191_0 = Arg15191[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "="], Arg15191_0)))
  ? [shen_type_symbol, "unify"]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "=!"], Arg15191_0)))
  ? [shen_type_symbol, "unify!"]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "=="], Arg15191_0)))
  ? [shen_type_symbol, "identical"]
  : Arg15191_0)))},
  1,
  [],
  "shen-m_prolog_to_s-prolog_predicate"];
shenjs_functions["shen_shen-m_prolog_to_s-prolog_predicate"] = shen_m$_prolog$_to$_s_prolog$_predicate;






shen_group$_clauses = [shen_type_func,
  function shen_user_lambda15194(Arg15193) {
  if (Arg15193.length < 1) return [shen_type_func, shen_user_lambda15194, 1, Arg15193];
  var Arg15193_0 = Arg15193[0];
  var R0, R1;
  return ((shenjs_empty$question$(Arg15193_0))
  ? []
  : ((shenjs_is_type(Arg15193_0, shen_type_cons))
  ? ((R0 = shenjs_call(shen_collect, [[shen_type_func,
  function shen_user_lambda15196(Arg15195) {
  if (Arg15195.length < 2) return [shen_type_func, shen_user_lambda15196, 2, Arg15195];
  var Arg15195_0 = Arg15195[0], Arg15195_1 = Arg15195[1];
  return (function() {
  return shenjs_call_tail(shen_same$_predicate$question$, [Arg15195_0[1], Arg15195_1]);})},
  2,
  [Arg15193_0]], Arg15193_0])),
  (R1 = shenjs_call(shen_difference, [Arg15193_0, R0])),
  [shen_type_cons, R0, shenjs_call(shen_group$_clauses, [R1])])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-group_clauses"]]);})))},
  1,
  [],
  "shen-group_clauses"];
shenjs_functions["shen_shen-group_clauses"] = shen_group$_clauses;






shen_collect = [shen_type_func,
  function shen_user_lambda15198(Arg15197) {
  if (Arg15197.length < 2) return [shen_type_func, shen_user_lambda15198, 2, Arg15197];
  var Arg15197_0 = Arg15197[0], Arg15197_1 = Arg15197[1];
  return ((shenjs_empty$question$(Arg15197_1))
  ? []
  : ((shenjs_is_type(Arg15197_1, shen_type_cons))
  ? ((shenjs_call(Arg15197_0, [Arg15197_1[1]]))
  ? [shen_type_cons, Arg15197_1[1], shenjs_call(shen_collect, [Arg15197_0, Arg15197_1[2]])]
  : (function() {
  return shenjs_call_tail(shen_collect, [Arg15197_0, Arg15197_1[2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-collect"]]);})))},
  2,
  [],
  "shen-collect"];
shenjs_functions["shen_shen-collect"] = shen_collect;






shen_same$_predicate$question$ = [shen_type_func,
  function shen_user_lambda15200(Arg15199) {
  if (Arg15199.length < 2) return [shen_type_func, shen_user_lambda15200, 2, Arg15199];
  var Arg15199_0 = Arg15199[0], Arg15199_1 = Arg15199[1];
  return (((shenjs_is_type(Arg15199_0, shen_type_cons) && (shenjs_is_type(Arg15199_0[1], shen_type_cons) && (shenjs_is_type(Arg15199_1, shen_type_cons) && shenjs_is_type(Arg15199_1[1], shen_type_cons)))))
  ? shenjs_$eq$(Arg15199_0[1][1], Arg15199_1[1][1])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-same_predicate?"]]);}))},
  2,
  [],
  "shen-same_predicate?"];
shenjs_functions["shen_shen-same_predicate?"] = shen_same$_predicate$question$;






shen_compile$_prolog$_procedure = [shen_type_func,
  function shen_user_lambda15202(Arg15201) {
  if (Arg15201.length < 1) return [shen_type_func, shen_user_lambda15202, 1, Arg15201];
  var Arg15201_0 = Arg15201[0];
  var R0;
  return ((R0 = shenjs_call(shen_procedure$_name, [Arg15201_0])),
  (R0 = shenjs_call(shen_clauses_to_shen, [R0, Arg15201_0])),
  R0)},
  1,
  [],
  "shen-compile_prolog_procedure"];
shenjs_functions["shen_shen-compile_prolog_procedure"] = shen_compile$_prolog$_procedure;






shen_procedure$_name = [shen_type_func,
  function shen_user_lambda15204(Arg15203) {
  if (Arg15203.length < 1) return [shen_type_func, shen_user_lambda15204, 1, Arg15203];
  var Arg15203_0 = Arg15203[0];
  return (((shenjs_is_type(Arg15203_0, shen_type_cons) && (shenjs_is_type(Arg15203_0[1], shen_type_cons) && shenjs_is_type(Arg15203_0[1][1], shen_type_cons))))
  ? Arg15203_0[1][1][1]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-procedure_name"]]);}))},
  1,
  [],
  "shen-procedure_name"];
shenjs_functions["shen_shen-procedure_name"] = shen_procedure$_name;






shen_clauses_to_shen = [shen_type_func,
  function shen_user_lambda15206(Arg15205) {
  if (Arg15205.length < 2) return [shen_type_func, shen_user_lambda15206, 2, Arg15205];
  var Arg15205_0 = Arg15205[0], Arg15205_1 = Arg15205[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15208(Arg15207) {
  if (Arg15207.length < 1) return [shen_type_func, shen_user_lambda15208, 1, Arg15207];
  var Arg15207_0 = Arg15207[0];
  return (function() {
  return shenjs_call_tail(shen_linearise_clause, [Arg15207_0]);})},
  1,
  []], Arg15205_1])),
  (R1 = shenjs_call(shen_prolog_aritycheck, [Arg15205_0, shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15210(Arg15209) {
  if (Arg15209.length < 1) return [shen_type_func, shen_user_lambda15210, 1, Arg15209];
  var Arg15209_0 = Arg15209[0];
  return (function() {
  return shenjs_call_tail(shen_head, [Arg15209_0]);})},
  1,
  []], Arg15205_1])])),
  (R1 = shenjs_call(shen_parameters, [R1])),
  (R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15212(Arg15211) {
  if (Arg15211.length < 2) return [shen_type_func, shen_user_lambda15212, 2, Arg15211];
  var Arg15211_0 = Arg15211[0], Arg15211_1 = Arg15211[1];
  return (function() {
  return shenjs_call_tail(shen_aum, [Arg15211_1, Arg15211_0]);})},
  2,
  [R1]], R0])),
  (R0 = shenjs_call(shen_catch_cut, [shenjs_call(shen_nest_disjunct, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15214(Arg15213) {
  if (Arg15213.length < 1) return [shen_type_func, shen_user_lambda15214, 1, Arg15213];
  var Arg15213_0 = Arg15213[0];
  return (function() {
  return shenjs_call_tail(shen_aum$_to$_shen, [Arg15213_0]);})},
  1,
  []], R0])])])),
  (R1 = [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg15205_0, shenjs_call(shen_append, [R1, shenjs_call(shen_append, [[shen_type_cons, [shen_type_symbol, "ProcessN"], [shen_type_cons, [shen_type_symbol, "Continuation"], []]], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, R0, []]]])])]]),
  R1)},
  2,
  [],
  "shen-clauses-to-shen"];
shenjs_functions["shen_shen-clauses-to-shen"] = shen_clauses_to_shen;






shen_catch_cut = [shen_type_func,
  function shen_user_lambda15216(Arg15215) {
  if (Arg15215.length < 1) return [shen_type_func, shen_user_lambda15216, 1, Arg15215];
  var Arg15215_0 = Arg15215[0];
  return (((!shenjs_call(shen_occurs$question$, [[shen_type_symbol, "cut"], Arg15215_0])))
  ? Arg15215_0
  : [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Throwcontrol"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-catchpoint"], []], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-cutpoint"], [shen_type_cons, [shen_type_symbol, "Throwcontrol"], [shen_type_cons, Arg15215_0, []]]], []]]]])},
  1,
  [],
  "shen-catch-cut"];
shenjs_functions["shen_shen-catch-cut"] = shen_catch_cut;






shen_catchpoint = [shen_type_func,
  function shen_user_lambda15218(Arg15217) {
  if (Arg15217.length < 0) return [shen_type_func, shen_user_lambda15218, 0, Arg15217];
  return (shenjs_globals["shen_shen-*catch*"] = (1 + (shenjs_globals["shen_shen-*catch*"])))},
  0,
  [],
  "shen-catchpoint"];
shenjs_functions["shen_shen-catchpoint"] = shen_catchpoint;






shen_cutpoint = [shen_type_func,
  function shen_user_lambda15220(Arg15219) {
  if (Arg15219.length < 2) return [shen_type_func, shen_user_lambda15220, 2, Arg15219];
  var Arg15219_0 = Arg15219[0], Arg15219_1 = Arg15219[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg15219_1, Arg15219_0)))
  ? false
  : Arg15219_1)},
  2,
  [],
  "shen-cutpoint"];
shenjs_functions["shen_shen-cutpoint"] = shen_cutpoint;






shen_nest_disjunct = [shen_type_func,
  function shen_user_lambda15222(Arg15221) {
  if (Arg15221.length < 1) return [shen_type_func, shen_user_lambda15222, 1, Arg15221];
  var Arg15221_0 = Arg15221[0];
  return (((shenjs_is_type(Arg15221_0, shen_type_cons) && shenjs_empty$question$(Arg15221_0[2])))
  ? Arg15221_0[1]
  : ((shenjs_is_type(Arg15221_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_lisp_or, [Arg15221_0[1], shenjs_call(shen_nest_disjunct, [Arg15221_0[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-nest-disjunct"]]);})))},
  1,
  [],
  "shen-nest-disjunct"];
shenjs_functions["shen_shen-nest-disjunct"] = shen_nest_disjunct;






shen_lisp_or = [shen_type_func,
  function shen_user_lambda15224(Arg15223) {
  if (Arg15223.length < 2) return [shen_type_func, shen_user_lambda15224, 2, Arg15223];
  var Arg15223_0 = Arg15223[0], Arg15223_1 = Arg15223[1];
  return [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Case"], [shen_type_cons, Arg15223_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "Case"], [shen_type_cons, false, []]]], [shen_type_cons, Arg15223_1, [shen_type_cons, [shen_type_symbol, "Case"], []]]]], []]]]]},
  2,
  [],
  "shen-lisp-or"];
shenjs_functions["shen_shen-lisp-or"] = shen_lisp_or;






shen_prolog_aritycheck = [shen_type_func,
  function shen_user_lambda15226(Arg15225) {
  if (Arg15225.length < 2) return [shen_type_func, shen_user_lambda15226, 2, Arg15225];
  var Arg15225_0 = Arg15225[0], Arg15225_1 = Arg15225[1];
  return (((shenjs_is_type(Arg15225_1, shen_type_cons) && shenjs_empty$question$(Arg15225_1[2])))
  ? (shenjs_call(shen_length, [Arg15225_1[1]]) - 1)
  : (((shenjs_is_type(Arg15225_1, shen_type_cons) && shenjs_is_type(Arg15225_1[2], shen_type_cons)))
  ? ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_length, [Arg15225_1[1]]), shenjs_call(shen_length, [Arg15225_1[2][1]]))))
  ? (function() {
  return shenjs_call_tail(shen_prolog_aritycheck, [Arg15225_0, Arg15225_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_interror, ["arity error in prolog procedure ~A~%", [shen_tuple, [shen_type_cons, Arg15225_0, []], []]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-prolog-aritycheck"]]);})))},
  2,
  [],
  "shen-prolog-aritycheck"];
shenjs_functions["shen_shen-prolog-aritycheck"] = shen_prolog_aritycheck;






shen_linearise_clause = [shen_type_func,
  function shen_user_lambda15228(Arg15227) {
  if (Arg15227.length < 1) return [shen_type_func, shen_user_lambda15228, 1, Arg15227];
  var Arg15227_0 = Arg15227[0];
  var R0;
  return (((shenjs_is_type(Arg15227_0, shen_type_cons) && (shenjs_is_type(Arg15227_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg15227_0[2][1])) && (shenjs_is_type(Arg15227_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15227_0[2][2][2]))))))
  ? ((R0 = shenjs_call(shen_linearise, [[shen_type_cons, Arg15227_0[1], Arg15227_0[2][2]]])),
  (function() {
  return shenjs_call_tail(shen_clause$_form, [R0]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-linearise-clause"]]);}))},
  1,
  [],
  "shen-linearise-clause"];
shenjs_functions["shen_shen-linearise-clause"] = shen_linearise_clause;






shen_clause$_form = [shen_type_func,
  function shen_user_lambda15230(Arg15229) {
  if (Arg15229.length < 1) return [shen_type_func, shen_user_lambda15230, 1, Arg15229];
  var Arg15229_0 = Arg15229[0];
  return (((shenjs_is_type(Arg15229_0, shen_type_cons) && (shenjs_is_type(Arg15229_0[2], shen_type_cons) && shenjs_empty$question$(Arg15229_0[2][2]))))
  ? [shen_type_cons, shenjs_call(shen_explicit$_modes, [Arg15229_0[1]]), [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, shenjs_call(shen_cf$_help, [Arg15229_0[2][1]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-clause_form"]]);}))},
  1,
  [],
  "shen-clause_form"];
shenjs_functions["shen_shen-clause_form"] = shen_clause$_form;






shen_explicit$_modes = [shen_type_func,
  function shen_user_lambda15232(Arg15231) {
  if (Arg15231.length < 1) return [shen_type_func, shen_user_lambda15232, 1, Arg15231];
  var Arg15231_0 = Arg15231[0];
  return ((shenjs_is_type(Arg15231_0, shen_type_cons))
  ? [shen_type_cons, Arg15231_0[1], shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15234(Arg15233) {
  if (Arg15233.length < 1) return [shen_type_func, shen_user_lambda15234, 1, Arg15233];
  var Arg15233_0 = Arg15233[0];
  return (function() {
  return shenjs_call_tail(shen_em$_help, [Arg15233_0]);})},
  1,
  []], Arg15231_0[2]])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-explicit_modes"]]);}))},
  1,
  [],
  "shen-explicit_modes"];
shenjs_functions["shen_shen-explicit_modes"] = shen_explicit$_modes;






shen_em$_help = [shen_type_func,
  function shen_user_lambda15236(Arg15235) {
  if (Arg15235.length < 1) return [shen_type_func, shen_user_lambda15236, 1, Arg15235];
  var Arg15235_0 = Arg15235[0];
  return (((shenjs_is_type(Arg15235_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg15235_0[1])) && (shenjs_is_type(Arg15235_0[2], shen_type_cons) && (shenjs_is_type(Arg15235_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15235_0[2][2][2]))))))
  ? Arg15235_0
  : [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg15235_0, [shen_type_cons, [shen_type_symbol, "+"], []]]])},
  1,
  [],
  "shen-em_help"];
shenjs_functions["shen_shen-em_help"] = shen_em$_help;






shen_cf$_help = [shen_type_func,
  function shen_user_lambda15238(Arg15237) {
  if (Arg15237.length < 1) return [shen_type_func, shen_user_lambda15238, 1, Arg15237];
  var Arg15237_0 = Arg15237[0];
  return (((shenjs_is_type(Arg15237_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "where"], Arg15237_0[1])) && (shenjs_is_type(Arg15237_0[2], shen_type_cons) && (shenjs_is_type(Arg15237_0[2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "="], Arg15237_0[2][1][1])) && (shenjs_is_type(Arg15237_0[2][1][2], shen_type_cons) && (shenjs_is_type(Arg15237_0[2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg15237_0[2][1][2][2][2]) && (shenjs_is_type(Arg15237_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15237_0[2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_cons, (((shenjs_globals["shen_shen-*occurs*"]))
  ? [shen_type_symbol, "unify!"]
  : [shen_type_symbol, "unify"]), Arg15237_0[2][1][2]], shenjs_call(shen_cf$_help, [Arg15237_0[2][2][1]])]
  : Arg15237_0)},
  1,
  [],
  "shen-cf_help"];
shenjs_functions["shen_shen-cf_help"] = shen_cf$_help;






shen_occurs_check = [shen_type_func,
  function shen_user_lambda15240(Arg15239) {
  if (Arg15239.length < 1) return [shen_type_func, shen_user_lambda15240, 1, Arg15239];
  var Arg15239_0 = Arg15239[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg15239_0)))
  ? (shenjs_globals["shen_shen-*occurs*"] = true)
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg15239_0)))
  ? (shenjs_globals["shen_shen-*occurs*"] = false)
  : (function() {
  return shenjs_call_tail(shen_interror, ["occurs-check expects + or -~%", []]);})))},
  1,
  [],
  "occurs-check"];
shenjs_functions["shen_occurs-check"] = shen_occurs_check;






shen_aum = [shen_type_func,
  function shen_user_lambda15242(Arg15241) {
  if (Arg15241.length < 2) return [shen_type_func, shen_user_lambda15242, 2, Arg15241];
  var Arg15241_0 = Arg15241[0], Arg15241_1 = Arg15241[1];
  var R0;
  return (((shenjs_is_type(Arg15241_0, shen_type_cons) && (shenjs_is_type(Arg15241_0[1], shen_type_cons) && (shenjs_is_type(Arg15241_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg15241_0[2][1])) && (shenjs_is_type(Arg15241_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15241_0[2][2][2])))))))
  ? ((R0 = shenjs_call(shen_make$_mu$_application, [[shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg15241_0[1][2], [shen_type_cons, shenjs_call(shen_continuation$_call, [Arg15241_0[1][2], Arg15241_0[2][2][1]]), []]]], Arg15241_1])),
  (function() {
  return shenjs_call_tail(shen_mu$_reduction, [R0, [shen_type_symbol, "+"]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-aum"]]);}))},
  2,
  [],
  "shen-aum"];
shenjs_functions["shen_shen-aum"] = shen_aum;






shen_continuation$_call = [shen_type_func,
  function shen_user_lambda15244(Arg15243) {
  if (Arg15243.length < 2) return [shen_type_func, shen_user_lambda15244, 2, Arg15243];
  var Arg15243_0 = Arg15243[0], Arg15243_1 = Arg15243[1];
  var R0, R1;
  return ((R0 = [shen_type_cons, [shen_type_symbol, "ProcessN"], shenjs_call(shen_extract$_vars, [Arg15243_0])]),
  (R1 = shenjs_call(shen_extract$_vars, [Arg15243_1])),
  (R1 = shenjs_call(shen_remove, [[shen_type_symbol, "Throwcontrol"], shenjs_call(shen_difference, [R1, R0])])),
  (function() {
  return shenjs_call_tail(shen_cc$_help, [R1, Arg15243_1]);}))},
  2,
  [],
  "shen-continuation_call"];
shenjs_functions["shen_shen-continuation_call"] = shen_continuation$_call;






shen_remove = [shen_type_func,
  function shen_user_lambda15246(Arg15245) {
  if (Arg15245.length < 2) return [shen_type_func, shen_user_lambda15246, 2, Arg15245];
  var Arg15245_0 = Arg15245[0], Arg15245_1 = Arg15245[1];
  return (function() {
  return shenjs_call_tail(shen_remove_h, [Arg15245_0, Arg15245_1, []]);})},
  2,
  [],
  "remove"];
shenjs_functions["shen_remove"] = shen_remove;






shen_remove_h = [shen_type_func,
  function shen_user_lambda15248(Arg15247) {
  if (Arg15247.length < 3) return [shen_type_func, shen_user_lambda15248, 3, Arg15247];
  var Arg15247_0 = Arg15247[0], Arg15247_1 = Arg15247[1], Arg15247_2 = Arg15247[2];
  return ((shenjs_empty$question$(Arg15247_1))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg15247_2]);})
  : (((shenjs_is_type(Arg15247_1, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg15247_1[1], Arg15247_0))))
  ? (function() {
  return shenjs_call_tail(shen_remove_h, [Arg15247_1[1], Arg15247_1[2], Arg15247_2]);})
  : ((shenjs_is_type(Arg15247_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_remove_h, [Arg15247_0, Arg15247_1[2], [shen_type_cons, Arg15247_1[1], Arg15247_2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-remove-h"]]);}))))},
  3,
  [],
  "shen-remove-h"];
shenjs_functions["shen_shen-remove-h"] = shen_remove_h;






shen_cc$_help = [shen_type_func,
  function shen_user_lambda15250(Arg15249) {
  if (Arg15249.length < 2) return [shen_type_func, shen_user_lambda15250, 2, Arg15249];
  var Arg15249_0 = Arg15249[0], Arg15249_1 = Arg15249[1];
  return (((shenjs_empty$question$(Arg15249_0) && shenjs_empty$question$(Arg15249_1)))
  ? [shen_type_cons, [shen_type_symbol, "shen-pop"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-stack"], []]]]
  : ((shenjs_empty$question$(Arg15249_1))
  ? [shen_type_cons, [shen_type_symbol, "shen-rename"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-variables"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, Arg15249_0, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-pop"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-stack"], []]]], []]]]]]]]]
  : ((shenjs_empty$question$(Arg15249_0))
  ? [shen_type_cons, [shen_type_symbol, "call"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-continuation"], [shen_type_cons, Arg15249_1, []]]]]
  : [shen_type_cons, [shen_type_symbol, "shen-rename"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-variables"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, Arg15249_0, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "call"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-continuation"], [shen_type_cons, Arg15249_1, []]]]], []]]]]]]]])))},
  2,
  [],
  "shen-cc_help"];
shenjs_functions["shen_shen-cc_help"] = shen_cc$_help;






shen_make$_mu$_application = [shen_type_func,
  function shen_user_lambda15252(Arg15251) {
  if (Arg15251.length < 2) return [shen_type_func, shen_user_lambda15252, 2, Arg15251];
  var Arg15251_0 = Arg15251[0], Arg15251_1 = Arg15251[1];
  return (((shenjs_is_type(Arg15251_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg15251_0[1])) && (shenjs_is_type(Arg15251_0[2], shen_type_cons) && (shenjs_empty$question$(Arg15251_0[2][1]) && (shenjs_is_type(Arg15251_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg15251_0[2][2][2]) && shenjs_empty$question$(Arg15251_1))))))))
  ? Arg15251_0[2][2][1]
  : (((shenjs_is_type(Arg15251_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg15251_0[1])) && (shenjs_is_type(Arg15251_0[2], shen_type_cons) && (shenjs_is_type(Arg15251_0[2][1], shen_type_cons) && (shenjs_is_type(Arg15251_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg15251_0[2][2][2]) && shenjs_is_type(Arg15251_1, shen_type_cons))))))))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg15251_0[2][1][1], [shen_type_cons, shenjs_call(shen_make$_mu$_application, [[shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg15251_0[2][1][2], Arg15251_0[2][2]]], Arg15251_1[2]]), []]]], [shen_type_cons, Arg15251_1[1], []]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-make_mu_application"]]);})))},
  2,
  [],
  "shen-make_mu_application"];
shenjs_functions["shen_shen-make_mu_application"] = shen_make$_mu$_application;






shen_mu$_reduction = [shen_type_func,
  function shen_user_lambda15254(Arg15253) {
  if (Arg15253.length < 2) return [shen_type_func, shen_user_lambda15254, 2, Arg15253];
  var Arg15253_0 = Arg15253[0], Arg15253_1 = Arg15253[1];
  var R0;
  return (((shenjs_is_type(Arg15253_0, shen_type_cons) && (shenjs_is_type(Arg15253_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg15253_0[1][1])) && (shenjs_is_type(Arg15253_0[1][2], shen_type_cons) && (shenjs_is_type(Arg15253_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg15253_0[1][2][1][1])) && (shenjs_is_type(Arg15253_0[1][2][1][2], shen_type_cons) && (shenjs_is_type(Arg15253_0[1][2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg15253_0[1][2][1][2][2][2]) && (shenjs_is_type(Arg15253_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg15253_0[1][2][2][2]) && (shenjs_is_type(Arg15253_0[2], shen_type_cons) && shenjs_empty$question$(Arg15253_0[2][2]))))))))))))))
  ? (function() {
  return shenjs_call_tail(shen_mu$_reduction, [[shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg15253_0[1][2][1][2][1], Arg15253_0[1][2][2]]], Arg15253_0[2]], Arg15253_0[1][2][1][2][2][1]]);})
  : (((shenjs_is_type(Arg15253_0, shen_type_cons) && (shenjs_is_type(Arg15253_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg15253_0[1][1])) && (shenjs_is_type(Arg15253_0[1][2], shen_type_cons) && (shenjs_is_type(Arg15253_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg15253_0[1][2][2][2]) && (shenjs_is_type(Arg15253_0[2], shen_type_cons) && (shenjs_empty$question$(Arg15253_0[2][2]) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "_"], Arg15253_0[1][2][1])))))))))))
  ? (function() {
  return shenjs_call_tail(shen_mu$_reduction, [Arg15253_0[1][2][2][1], Arg15253_1]);})
  : (((shenjs_is_type(Arg15253_0, shen_type_cons) && (shenjs_is_type(Arg15253_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg15253_0[1][1])) && (shenjs_is_type(Arg15253_0[1][2], shen_type_cons) && (shenjs_is_type(Arg15253_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg15253_0[1][2][2][2]) && (shenjs_is_type(Arg15253_0[2], shen_type_cons) && (shenjs_empty$question$(Arg15253_0[2][2]) && shenjs_call(shen_ephemeral$_variable$question$, [Arg15253_0[1][2][1], Arg15253_0[2][1]]))))))))))
  ? (function() {
  return shenjs_call_tail(shen_subst, [Arg15253_0[2][1], Arg15253_0[1][2][1], shenjs_call(shen_mu$_reduction, [Arg15253_0[1][2][2][1], Arg15253_1])]);})
  : (((shenjs_is_type(Arg15253_0, shen_type_cons) && (shenjs_is_type(Arg15253_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg15253_0[1][1])) && (shenjs_is_type(Arg15253_0[1][2], shen_type_cons) && (shenjs_is_type(Arg15253_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg15253_0[1][2][2][2]) && (shenjs_is_type(Arg15253_0[2], shen_type_cons) && (shenjs_empty$question$(Arg15253_0[2][2]) && shenjs_call(shen_variable$question$, [Arg15253_0[1][2][1]]))))))))))
  ? [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, Arg15253_0[1][2][1], [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, Arg15253_0[2][1], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg15253_0[1][2][2][1], Arg15253_1]), []]]]]]]
  : (((shenjs_is_type(Arg15253_0, shen_type_cons) && (shenjs_is_type(Arg15253_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg15253_0[1][1])) && (shenjs_is_type(Arg15253_0[1][2], shen_type_cons) && (shenjs_is_type(Arg15253_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg15253_0[1][2][2][2]) && (shenjs_is_type(Arg15253_0[2], shen_type_cons) && (shenjs_empty$question$(Arg15253_0[2][2]) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg15253_1)) && shenjs_call(shen_prolog$_constant$question$, [Arg15253_0[1][2][1]])))))))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-result"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, [shen_type_symbol, "shen-dereferencing"], Arg15253_0[2]]]]], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "identical"], [shen_type_cons, [shen_type_symbol, "shen-to"], [shen_type_cons, Arg15253_0[1][2][1], []]]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg15253_0[1][2][2][1], [shen_type_symbol, "-"]]), [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, shen_fail_obj, []]]]]]], []]]]]]])
  : (((shenjs_is_type(Arg15253_0, shen_type_cons) && (shenjs_is_type(Arg15253_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg15253_0[1][1])) && (shenjs_is_type(Arg15253_0[1][2], shen_type_cons) && (shenjs_is_type(Arg15253_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg15253_0[1][2][2][2]) && (shenjs_is_type(Arg15253_0[2], shen_type_cons) && (shenjs_empty$question$(Arg15253_0[2][2]) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg15253_1)) && shenjs_call(shen_prolog$_constant$question$, [Arg15253_0[1][2][1]])))))))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-result"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, [shen_type_symbol, "shen-dereferencing"], Arg15253_0[2]]]]], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "identical"], [shen_type_cons, [shen_type_symbol, "shen-to"], [shen_type_cons, Arg15253_0[1][2][1], []]]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg15253_0[1][2][2][1], [shen_type_symbol, "+"]]), [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "shen-a"], [shen_type_cons, [shen_type_symbol, "shen-variable"], []]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-to"], [shen_type_cons, Arg15253_0[1][2][1], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg15253_0[1][2][2][1], [shen_type_symbol, "+"]]), []]]]]]], [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, shen_fail_obj, []]]]]]], []]]]]]], []]]]]]])
  : (((shenjs_is_type(Arg15253_0, shen_type_cons) && (shenjs_is_type(Arg15253_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg15253_0[1][1])) && (shenjs_is_type(Arg15253_0[1][2], shen_type_cons) && (shenjs_is_type(Arg15253_0[1][2][1], shen_type_cons) && (shenjs_is_type(Arg15253_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg15253_0[1][2][2][2]) && (shenjs_is_type(Arg15253_0[2], shen_type_cons) && (shenjs_empty$question$(Arg15253_0[2][2]) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg15253_1))))))))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-result"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, [shen_type_symbol, "shen-dereferencing"], Arg15253_0[2]]]]], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "shen-a"], [shen_type_cons, [shen_type_symbol, "shen-non-empty"], [shen_type_cons, [shen_type_symbol, "list"], []]]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [[shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg15253_0[1][2][1][1], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg15253_0[1][2][1][2], Arg15253_0[1][2][2]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "tail"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, R0, []]]]], []]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "head"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, R0, []]]]], []]], [shen_type_symbol, "-"]]), [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, shen_fail_obj, []]]]]]], []]]]]]])
  : (((shenjs_is_type(Arg15253_0, shen_type_cons) && (shenjs_is_type(Arg15253_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg15253_0[1][1])) && (shenjs_is_type(Arg15253_0[1][2], shen_type_cons) && (shenjs_is_type(Arg15253_0[1][2][1], shen_type_cons) && (shenjs_is_type(Arg15253_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg15253_0[1][2][2][2]) && (shenjs_is_type(Arg15253_0[2], shen_type_cons) && (shenjs_empty$question$(Arg15253_0[2][2]) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg15253_1))))))))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-result"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, [shen_type_symbol, "shen-dereferencing"], Arg15253_0[2]]]]], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "shen-a"], [shen_type_cons, [shen_type_symbol, "shen-non-empty"], [shen_type_cons, [shen_type_symbol, "list"], []]]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [[shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg15253_0[1][2][1][1], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg15253_0[1][2][1][2], Arg15253_0[1][2][2]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "tail"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, R0, []]]]], []]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "head"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, R0, []]]]], []]], [shen_type_symbol, "+"]]), [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "shen-a"], [shen_type_cons, [shen_type_symbol, "shen-variable"], []]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-rename"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-variables"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, shenjs_call(shen_extract$_vars, [Arg15253_0[1][2][1]]), [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-to"], [shen_type_cons, shenjs_call(shen_rcons$_form, [shenjs_call(shen_remove$_modes, [Arg15253_0[1][2][1]])]), [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg15253_0[1][2][2][1], [shen_type_symbol, "+"]]), []]]]]]], []]]]]]]]], [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, shen_fail_obj, []]]]]]], []]]]]]], []]]]]]])
  : Arg15253_0))))))))},
  2,
  [],
  "shen-mu_reduction"];
shenjs_functions["shen_shen-mu_reduction"] = shen_mu$_reduction;






shen_rcons$_form = [shen_type_func,
  function shen_user_lambda15256(Arg15255) {
  if (Arg15255.length < 1) return [shen_type_func, shen_user_lambda15256, 1, Arg15255];
  var Arg15255_0 = Arg15255[0];
  return ((shenjs_is_type(Arg15255_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg15255_0[1]]), [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg15255_0[2]]), []]]]
  : Arg15255_0)},
  1,
  [],
  "shen-rcons_form"];
shenjs_functions["shen_shen-rcons_form"] = shen_rcons$_form;






shen_remove$_modes = [shen_type_func,
  function shen_user_lambda15258(Arg15257) {
  if (Arg15257.length < 1) return [shen_type_func, shen_user_lambda15258, 1, Arg15257];
  var Arg15257_0 = Arg15257[0];
  return (((shenjs_is_type(Arg15257_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg15257_0[1])) && (shenjs_is_type(Arg15257_0[2], shen_type_cons) && (shenjs_is_type(Arg15257_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg15257_0[2][2][1])) && shenjs_empty$question$(Arg15257_0[2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(shen_remove$_modes, [Arg15257_0[2][1]]);})
  : (((shenjs_is_type(Arg15257_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg15257_0[1])) && (shenjs_is_type(Arg15257_0[2], shen_type_cons) && (shenjs_is_type(Arg15257_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg15257_0[2][2][1])) && shenjs_empty$question$(Arg15257_0[2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(shen_remove$_modes, [Arg15257_0[2][1]]);})
  : ((shenjs_is_type(Arg15257_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_remove$_modes, [Arg15257_0[1]]), shenjs_call(shen_remove$_modes, [Arg15257_0[2]])]
  : Arg15257_0)))},
  1,
  [],
  "shen-remove_modes"];
shenjs_functions["shen_shen-remove_modes"] = shen_remove$_modes;






shen_ephemeral$_variable$question$ = [shen_type_func,
  function shen_user_lambda15260(Arg15259) {
  if (Arg15259.length < 2) return [shen_type_func, shen_user_lambda15260, 2, Arg15259];
  var Arg15259_0 = Arg15259[0], Arg15259_1 = Arg15259[1];
  return (shenjs_call(shen_variable$question$, [Arg15259_0]) && shenjs_call(shen_variable$question$, [Arg15259_1]))},
  2,
  [],
  "shen-ephemeral_variable?"];
shenjs_functions["shen_shen-ephemeral_variable?"] = shen_ephemeral$_variable$question$;






shen_prolog$_constant$question$ = [shen_type_func,
  function shen_user_lambda15262(Arg15261) {
  if (Arg15261.length < 1) return [shen_type_func, shen_user_lambda15262, 1, Arg15261];
  var Arg15261_0 = Arg15261[0];
  return ((shenjs_is_type(Arg15261_0, shen_type_cons))
  ? false
  : true)},
  1,
  [],
  "shen-prolog_constant?"];
shenjs_functions["shen_shen-prolog_constant?"] = shen_prolog$_constant$question$;






shen_aum$_to$_shen = [shen_type_func,
  function shen_user_lambda15264(Arg15263) {
  if (Arg15263.length < 1) return [shen_type_func, shen_user_lambda15264, 1, Arg15263];
  var Arg15263_0 = Arg15263[0];
  return (((shenjs_is_type(Arg15263_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg15263_0[1])) && (shenjs_is_type(Arg15263_0[2], shen_type_cons) && (shenjs_is_type(Arg15263_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-be"], Arg15263_0[2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2], shen_type_cons) && (shenjs_is_type(Arg15263_0[2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "in"], Arg15263_0[2][2][2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg15263_0[2][2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, Arg15263_0[2][1], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg15263_0[2][2][2][1]]), [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg15263_0[2][2][2][2][2][1]]), []]]]]
  : (((shenjs_is_type(Arg15263_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg15263_0[1])) && (shenjs_is_type(Arg15263_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-result"], Arg15263_0[2][1])) && (shenjs_is_type(Arg15263_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-of"], Arg15263_0[2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-dereferencing"], Arg15263_0[2][2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg15263_0[2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "shen-lazyderef"], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg15263_0[2][2][2][2][1]]), [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]]
  : (((shenjs_is_type(Arg15263_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "if"], Arg15263_0[1])) && (shenjs_is_type(Arg15263_0[2], shen_type_cons) && (shenjs_is_type(Arg15263_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-then"], Arg15263_0[2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2], shen_type_cons) && (shenjs_is_type(Arg15263_0[2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-else"], Arg15263_0[2][2][2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg15263_0[2][2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg15263_0[2][1]]), [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg15263_0[2][2][2][1]]), [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg15263_0[2][2][2][2][2][1]]), []]]]]
  : (((shenjs_is_type(Arg15263_0, shen_type_cons) && (shenjs_is_type(Arg15263_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "is"], Arg15263_0[2][1])) && (shenjs_is_type(Arg15263_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-a"], Arg15263_0[2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-variable"], Arg15263_0[2][2][2][1])) && shenjs_empty$question$(Arg15263_0[2][2][2][2])))))))))
  ? [shen_type_cons, [shen_type_symbol, "shen-pvar?"], [shen_type_cons, Arg15263_0[1], []]]
  : (((shenjs_is_type(Arg15263_0, shen_type_cons) && (shenjs_is_type(Arg15263_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "is"], Arg15263_0[2][1])) && (shenjs_is_type(Arg15263_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-a"], Arg15263_0[2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-non-empty"], Arg15263_0[2][2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "list"], Arg15263_0[2][2][2][2][1])) && shenjs_empty$question$(Arg15263_0[2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, Arg15263_0[1], []]]
  : (((shenjs_is_type(Arg15263_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-rename"], Arg15263_0[1])) && (shenjs_is_type(Arg15263_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg15263_0[2][1])) && (shenjs_is_type(Arg15263_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-variables"], Arg15263_0[2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "in"], Arg15263_0[2][2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2][2], shen_type_cons) && (shenjs_empty$question$(Arg15263_0[2][2][2][2][1]) && (shenjs_is_type(Arg15263_0[2][2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "and"], Arg15263_0[2][2][2][2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-then"], Arg15263_0[2][2][2][2][2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg15263_0[2][2][2][2][2][2][2][2])))))))))))))))))
  ? (function() {
  return shenjs_call_tail(shen_aum$_to$_shen, [Arg15263_0[2][2][2][2][2][2][2][1]]);})
  : (((shenjs_is_type(Arg15263_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-rename"], Arg15263_0[1])) && (shenjs_is_type(Arg15263_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg15263_0[2][1])) && (shenjs_is_type(Arg15263_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-variables"], Arg15263_0[2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "in"], Arg15263_0[2][2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2][2], shen_type_cons) && (shenjs_is_type(Arg15263_0[2][2][2][2][1], shen_type_cons) && (shenjs_is_type(Arg15263_0[2][2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "and"], Arg15263_0[2][2][2][2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-then"], Arg15263_0[2][2][2][2][2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg15263_0[2][2][2][2][2][2][2][2])))))))))))))))))
  ? [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, Arg15263_0[2][2][2][2][1][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-newpv"], [shen_type_cons, [shen_type_symbol, "ProcessN"], []]], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [[shen_type_cons, [shen_type_symbol, "shen-rename"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-variables"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, Arg15263_0[2][2][2][2][1][2], Arg15263_0[2][2][2][2][2]]]]]]]), []]]]]
  : (((shenjs_is_type(Arg15263_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "bind"], Arg15263_0[1])) && (shenjs_is_type(Arg15263_0[2], shen_type_cons) && (shenjs_is_type(Arg15263_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-to"], Arg15263_0[2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2], shen_type_cons) && (shenjs_is_type(Arg15263_0[2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "in"], Arg15263_0[2][2][2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg15263_0[2][2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-bindv"], [shen_type_cons, Arg15263_0[2][1], [shen_type_cons, shenjs_call(shen_chwild, [Arg15263_0[2][2][2][1]]), [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg15263_0[2][2][2][2][2][1]]), [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-unbindv"], [shen_type_cons, Arg15263_0[2][1], [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]], [shen_type_cons, [shen_type_symbol, "Result"], []]]], []]]]], []]]]
  : (((shenjs_is_type(Arg15263_0, shen_type_cons) && (shenjs_is_type(Arg15263_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "is"], Arg15263_0[2][1])) && (shenjs_is_type(Arg15263_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "identical"], Arg15263_0[2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-to"], Arg15263_0[2][2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg15263_0[2][2][2][2][2]))))))))))
  ? [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, Arg15263_0[2][2][2][2][1], [shen_type_cons, Arg15263_0[1], []]]]
  : ((shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, Arg15263_0)))
  ? false
  : (((shenjs_is_type(Arg15263_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg15263_0[1])) && (shenjs_is_type(Arg15263_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "head"], Arg15263_0[2][1])) && (shenjs_is_type(Arg15263_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-of"], Arg15263_0[2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg15263_0[2][2][2][2])))))))))
  ? [shen_type_cons, [shen_type_symbol, "hd"], Arg15263_0[2][2][2]]
  : (((shenjs_is_type(Arg15263_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg15263_0[1])) && (shenjs_is_type(Arg15263_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "tail"], Arg15263_0[2][1])) && (shenjs_is_type(Arg15263_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-of"], Arg15263_0[2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg15263_0[2][2][2][2])))))))))
  ? [shen_type_cons, [shen_type_symbol, "tl"], Arg15263_0[2][2][2]]
  : (((shenjs_is_type(Arg15263_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-pop"], Arg15263_0[1])) && (shenjs_is_type(Arg15263_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg15263_0[2][1])) && (shenjs_is_type(Arg15263_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-stack"], Arg15263_0[2][2][1])) && shenjs_empty$question$(Arg15263_0[2][2][2]))))))))
  ? [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-incinfs"], []], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, [shen_type_symbol, "Continuation"], []]], []]]]
  : (((shenjs_is_type(Arg15263_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "call"], Arg15263_0[1])) && (shenjs_is_type(Arg15263_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg15263_0[2][1])) && (shenjs_is_type(Arg15263_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-continuation"], Arg15263_0[2][2][1])) && (shenjs_is_type(Arg15263_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg15263_0[2][2][2][2])))))))))
  ? [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-incinfs"], []], [shen_type_cons, shenjs_call(shen_call$_the$_continuation, [shenjs_call(shen_chwild, [Arg15263_0[2][2][2][1]]), [shen_type_symbol, "ProcessN"], [shen_type_symbol, "Continuation"]]), []]]]
  : Arg15263_0))))))))))))))},
  1,
  [],
  "shen-aum_to_shen"];
shenjs_functions["shen_shen-aum_to_shen"] = shen_aum$_to$_shen;






shen_chwild = [shen_type_func,
  function shen_user_lambda15266(Arg15265) {
  if (Arg15265.length < 1) return [shen_type_func, shen_user_lambda15266, 1, Arg15265];
  var Arg15265_0 = Arg15265[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg15265_0, [shen_type_symbol, "_"])))
  ? [shen_type_cons, [shen_type_symbol, "shen-newpv"], [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]
  : ((shenjs_is_type(Arg15265_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda15268(Arg15267) {
  if (Arg15267.length < 1) return [shen_type_func, shen_user_lambda15268, 1, Arg15267];
  var Arg15267_0 = Arg15267[0];
  return (function() {
  return shenjs_call_tail(shen_chwild, [Arg15267_0]);})},
  1,
  []], Arg15265_0]);})
  : Arg15265_0))},
  1,
  [],
  "shen-chwild"];
shenjs_functions["shen_shen-chwild"] = shen_chwild;






shen_newpv = [shen_type_func,
  function shen_user_lambda15270(Arg15269) {
  if (Arg15269.length < 1) return [shen_type_func, shen_user_lambda15270, 1, Arg15269];
  var Arg15269_0 = Arg15269[0];
  var R0, R1;
  return ((R0 = (shenjs_absvector_ref((shenjs_globals["shen_shen-*varcounter*"]), Arg15269_0) + 1)),
  shenjs_absvector_set((shenjs_globals["shen_shen-*varcounter*"]), Arg15269_0, R0),
  (R1 = shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg15269_0)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shenjs_call(shen_limit, [R1]))))
  ? shenjs_call(shen_resizeprocessvector, [Arg15269_0, R0])
  : [shen_type_symbol, "shen-skip"]),
  (function() {
  return shenjs_call_tail(shen_mk_pvar, [R0]);}))},
  1,
  [],
  "shen-newpv"];
shenjs_functions["shen_shen-newpv"] = shen_newpv;






shen_resizeprocessvector = [shen_type_func,
  function shen_user_lambda15272(Arg15271) {
  if (Arg15271.length < 2) return [shen_type_func, shen_user_lambda15272, 2, Arg15271];
  var Arg15271_0 = Arg15271[0], Arg15271_1 = Arg15271[1];
  var R0;
  return ((R0 = shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg15271_0)),
  (R0 = shenjs_call(shen_resize_vector, [R0, (Arg15271_1 + Arg15271_1), [shen_type_symbol, "shen--null-"]])),
  shenjs_absvector_set((shenjs_globals["shen_shen-*prologvectors*"]), Arg15271_0, R0))},
  2,
  [],
  "shen-resizeprocessvector"];
shenjs_functions["shen_shen-resizeprocessvector"] = shen_resizeprocessvector;






shen_resize_vector = [shen_type_func,
  function shen_user_lambda15274(Arg15273) {
  if (Arg15273.length < 3) return [shen_type_func, shen_user_lambda15274, 3, Arg15273];
  var Arg15273_0 = Arg15273[0], Arg15273_1 = Arg15273[1], Arg15273_2 = Arg15273[2];
  var R0;
  return ((R0 = shenjs_absvector_set(shenjs_absvector((1 + Arg15273_1)), 0, Arg15273_1)),
  (function() {
  return shenjs_call_tail(shen_copy_vector, [Arg15273_0, R0, shenjs_call(shen_limit, [Arg15273_0]), Arg15273_1, Arg15273_2]);}))},
  3,
  [],
  "shen-resize-vector"];
shenjs_functions["shen_shen-resize-vector"] = shen_resize_vector;






shen_copy_vector = [shen_type_func,
  function shen_user_lambda15276(Arg15275) {
  if (Arg15275.length < 5) return [shen_type_func, shen_user_lambda15276, 5, Arg15275];
  var Arg15275_0 = Arg15275[0], Arg15275_1 = Arg15275[1], Arg15275_2 = Arg15275[2], Arg15275_3 = Arg15275[3], Arg15275_4 = Arg15275[4];
  return (function() {
  return shenjs_call_tail(shen_copy_vector_stage_2, [(1 + Arg15275_2), (Arg15275_3 + 1), Arg15275_4, shenjs_call(shen_copy_vector_stage_1, [1, Arg15275_0, Arg15275_1, (1 + Arg15275_2)])]);})},
  5,
  [],
  "shen-copy-vector"];
shenjs_functions["shen_shen-copy-vector"] = shen_copy_vector;






shen_copy_vector_stage_1 = [shen_type_func,
  function shen_user_lambda15278(Arg15277) {
  if (Arg15277.length < 4) return [shen_type_func, shen_user_lambda15278, 4, Arg15277];
  var Arg15277_0 = Arg15277[0], Arg15277_1 = Arg15277[1], Arg15277_2 = Arg15277[2], Arg15277_3 = Arg15277[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg15277_3, Arg15277_0)))
  ? Arg15277_2
  : (function() {
  return shenjs_call_tail(shen_copy_vector_stage_1, [(1 + Arg15277_0), Arg15277_1, shenjs_absvector_set(Arg15277_2, Arg15277_0, shenjs_absvector_ref(Arg15277_1, Arg15277_0)), Arg15277_3]);}))},
  4,
  [],
  "shen-copy-vector-stage-1"];
shenjs_functions["shen_shen-copy-vector-stage-1"] = shen_copy_vector_stage_1;






shen_copy_vector_stage_2 = [shen_type_func,
  function shen_user_lambda15280(Arg15279) {
  if (Arg15279.length < 4) return [shen_type_func, shen_user_lambda15280, 4, Arg15279];
  var Arg15279_0 = Arg15279[0], Arg15279_1 = Arg15279[1], Arg15279_2 = Arg15279[2], Arg15279_3 = Arg15279[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg15279_1, Arg15279_0)))
  ? Arg15279_3
  : (function() {
  return shenjs_call_tail(shen_copy_vector_stage_2, [(Arg15279_0 + 1), Arg15279_1, Arg15279_2, shenjs_absvector_set(Arg15279_3, Arg15279_0, Arg15279_2)]);}))},
  4,
  [],
  "shen-copy-vector-stage-2"];
shenjs_functions["shen_shen-copy-vector-stage-2"] = shen_copy_vector_stage_2;






shen_mk_pvar = [shen_type_func,
  function shen_user_lambda15282(Arg15281) {
  if (Arg15281.length < 1) return [shen_type_func, shen_user_lambda15282, 1, Arg15281];
  var Arg15281_0 = Arg15281[0];
  return shenjs_absvector_set(shenjs_absvector_set(shenjs_absvector(2), 0, [shen_type_symbol, "shen-pvar"]), 1, Arg15281_0)},
  1,
  [],
  "shen-mk-pvar"];
shenjs_functions["shen_shen-mk-pvar"] = shen_mk_pvar;






shen_pvar$question$ = [shen_type_func,
  function shen_user_lambda15284(Arg15283) {
  if (Arg15283.length < 1) return [shen_type_func, shen_user_lambda15284, 1, Arg15283];
  var Arg15283_0 = Arg15283[0];
  return (shenjs_absvector$question$(Arg15283_0) && shenjs_unwind_tail(shenjs_$eq$(shenjs_absvector_ref(Arg15283_0, 0), [shen_type_symbol, "shen-pvar"])))},
  1,
  [],
  "shen-pvar?"];
shenjs_functions["shen_shen-pvar?"] = shen_pvar$question$;






shen_bindv = [shen_type_func,
  function shen_user_lambda15286(Arg15285) {
  if (Arg15285.length < 3) return [shen_type_func, shen_user_lambda15286, 3, Arg15285];
  var Arg15285_0 = Arg15285[0], Arg15285_1 = Arg15285[1], Arg15285_2 = Arg15285[2];
  var R0;
  return ((R0 = shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg15285_2)),
  shenjs_absvector_set(R0, shenjs_absvector_ref(Arg15285_0, 1), Arg15285_1))},
  3,
  [],
  "shen-bindv"];
shenjs_functions["shen_shen-bindv"] = shen_bindv;






shen_unbindv = [shen_type_func,
  function shen_user_lambda15288(Arg15287) {
  if (Arg15287.length < 2) return [shen_type_func, shen_user_lambda15288, 2, Arg15287];
  var Arg15287_0 = Arg15287[0], Arg15287_1 = Arg15287[1];
  var R0;
  return ((R0 = shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg15287_1)),
  shenjs_absvector_set(R0, shenjs_absvector_ref(Arg15287_0, 1), [shen_type_symbol, "shen--null-"]))},
  2,
  [],
  "shen-unbindv"];
shenjs_functions["shen_shen-unbindv"] = shen_unbindv;






shen_incinfs = [shen_type_func,
  function shen_user_lambda15290(Arg15289) {
  if (Arg15289.length < 0) return [shen_type_func, shen_user_lambda15290, 0, Arg15289];
  return (shenjs_globals["shen_shen-*infs*"] = (1 + (shenjs_globals["shen_shen-*infs*"])))},
  0,
  [],
  "shen-incinfs"];
shenjs_functions["shen_shen-incinfs"] = shen_incinfs;






shen_call$_the$_continuation = [shen_type_func,
  function shen_user_lambda15292(Arg15291) {
  if (Arg15291.length < 3) return [shen_type_func, shen_user_lambda15292, 3, Arg15291];
  var Arg15291_0 = Arg15291[0], Arg15291_1 = Arg15291[1], Arg15291_2 = Arg15291[2];
  var R0;
  return (((shenjs_is_type(Arg15291_0, shen_type_cons) && (shenjs_is_type(Arg15291_0[1], shen_type_cons) && shenjs_empty$question$(Arg15291_0[2]))))
  ? [shen_type_cons, Arg15291_0[1][1], shenjs_call(shen_append, [Arg15291_0[1][2], [shen_type_cons, Arg15291_1, [shen_type_cons, Arg15291_2, []]]])]
  : (((shenjs_is_type(Arg15291_0, shen_type_cons) && shenjs_is_type(Arg15291_0[1], shen_type_cons)))
  ? ((R0 = shenjs_call(shen_newcontinuation, [Arg15291_0[2], Arg15291_1, Arg15291_2])),
  [shen_type_cons, Arg15291_0[1][1], shenjs_call(shen_append, [Arg15291_0[1][2], [shen_type_cons, Arg15291_1, [shen_type_cons, R0, []]]])])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-call_the_continuation"]]);})))},
  3,
  [],
  "shen-call_the_continuation"];
shenjs_functions["shen_shen-call_the_continuation"] = shen_call$_the$_continuation;






shen_newcontinuation = [shen_type_func,
  function shen_user_lambda15294(Arg15293) {
  if (Arg15293.length < 3) return [shen_type_func, shen_user_lambda15294, 3, Arg15293];
  var Arg15293_0 = Arg15293[0], Arg15293_1 = Arg15293[1], Arg15293_2 = Arg15293[2];
  return ((shenjs_empty$question$(Arg15293_0))
  ? Arg15293_2
  : (((shenjs_is_type(Arg15293_0, shen_type_cons) && shenjs_is_type(Arg15293_0[1], shen_type_cons)))
  ? [shen_type_cons, [shen_type_symbol, "freeze"], [shen_type_cons, [shen_type_cons, Arg15293_0[1][1], shenjs_call(shen_append, [Arg15293_0[1][2], [shen_type_cons, Arg15293_1, [shen_type_cons, shenjs_call(shen_newcontinuation, [Arg15293_0[2], Arg15293_1, Arg15293_2]), []]]])], []]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-newcontinuation"]]);})))},
  3,
  [],
  "shen-newcontinuation"];
shenjs_functions["shen_shen-newcontinuation"] = shen_newcontinuation;






shen_return = [shen_type_func,
  function shen_user_lambda15296(Arg15295) {
  if (Arg15295.length < 3) return [shen_type_func, shen_user_lambda15296, 3, Arg15295];
  var Arg15295_0 = Arg15295[0], Arg15295_1 = Arg15295[1], Arg15295_2 = Arg15295[2];
  return (function() {
  return shenjs_call_tail(shen_deref, [Arg15295_0, Arg15295_1]);})},
  3,
  [],
  "return"];
shenjs_functions["shen_return"] = shen_return;






shen_measure$amp$return = [shen_type_func,
  function shen_user_lambda15298(Arg15297) {
  if (Arg15297.length < 3) return [shen_type_func, shen_user_lambda15298, 3, Arg15297];
  var Arg15297_0 = Arg15297[0], Arg15297_1 = Arg15297[1], Arg15297_2 = Arg15297[2];
  return (shenjs_call(shen_intoutput, ["~A inferences~%", [shen_tuple, (shenjs_globals["shen_shen-*infs*"]), []]]),
  (function() {
  return shenjs_call_tail(shen_deref, [Arg15297_0, Arg15297_1]);}))},
  3,
  [],
  "shen-measure&return"];
shenjs_functions["shen_shen-measure&return"] = shen_measure$amp$return;






shen_unify = [shen_type_func,
  function shen_user_lambda15300(Arg15299) {
  if (Arg15299.length < 4) return [shen_type_func, shen_user_lambda15300, 4, Arg15299];
  var Arg15299_0 = Arg15299[0], Arg15299_1 = Arg15299[1], Arg15299_2 = Arg15299[2], Arg15299_3 = Arg15299[3];
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$, [shenjs_call(shen_lazyderef, [Arg15299_0, Arg15299_2]), shenjs_call(shen_lazyderef, [Arg15299_1, Arg15299_2]), Arg15299_2, Arg15299_3]);})},
  4,
  [],
  "unify"];
shenjs_functions["shen_unify"] = shen_unify;






shen_lzy$eq$ = [shen_type_func,
  function shen_user_lambda15302(Arg15301) {
  if (Arg15301.length < 4) return [shen_type_func, shen_user_lambda15302, 4, Arg15301];
  var Arg15301_0 = Arg15301[0], Arg15301_1 = Arg15301[1], Arg15301_2 = Arg15301[2], Arg15301_3 = Arg15301[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg15301_1, Arg15301_0)))
  ? shenjs_thaw(Arg15301_3)
  : ((shenjs_call(shen_pvar$question$, [Arg15301_0]))
  ? (function() {
  return shenjs_call_tail(shen_bind, [Arg15301_0, Arg15301_1, Arg15301_2, Arg15301_3]);})
  : ((shenjs_call(shen_pvar$question$, [Arg15301_1]))
  ? (function() {
  return shenjs_call_tail(shen_bind, [Arg15301_1, Arg15301_0, Arg15301_2, Arg15301_3]);})
  : (((shenjs_is_type(Arg15301_0, shen_type_cons) && shenjs_is_type(Arg15301_1, shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(shen_lzy$eq$, [shenjs_call(shen_lazyderef, [Arg15301_0[1], Arg15301_2]), shenjs_call(shen_lazyderef, [Arg15301_1[1], Arg15301_2]), Arg15301_2, (new Shenjs_freeze([Arg15301_0, Arg15301_1, Arg15301_2, Arg15301_3], function(Arg15303) {
  var Arg15303_0 = Arg15303[0], Arg15303_1 = Arg15303[1], Arg15303_2 = Arg15303[2], Arg15303_3 = Arg15303[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$, [shenjs_call(shen_lazyderef, [Arg15303_0[2], Arg15303_2]), shenjs_call(shen_lazyderef, [Arg15303_1[2], Arg15303_2]), Arg15303_2, Arg15303_3]);});})}))]);})
  : false))))},
  4,
  [],
  "shen-lzy="];
shenjs_functions["shen_shen-lzy="] = shen_lzy$eq$;






shen_deref = [shen_type_func,
  function shen_user_lambda15306(Arg15305) {
  if (Arg15305.length < 2) return [shen_type_func, shen_user_lambda15306, 2, Arg15305];
  var Arg15305_0 = Arg15305[0], Arg15305_1 = Arg15305[1];
  var R0;
  return ((shenjs_is_type(Arg15305_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_deref, [Arg15305_0[1], Arg15305_1]), shenjs_call(shen_deref, [Arg15305_0[2], Arg15305_1])]
  : ((shenjs_call(shen_pvar$question$, [Arg15305_0]))
  ? ((R0 = shenjs_call(shen_valvector, [Arg15305_0, Arg15305_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, [shen_type_symbol, "shen--null-"])))
  ? Arg15305_0
  : (function() {
  return shenjs_call_tail(shen_deref, [R0, Arg15305_1]);})))
  : Arg15305_0))},
  2,
  [],
  "shen-deref"];
shenjs_functions["shen_shen-deref"] = shen_deref;






shen_lazyderef = [shen_type_func,
  function shen_user_lambda15308(Arg15307) {
  if (Arg15307.length < 2) return [shen_type_func, shen_user_lambda15308, 2, Arg15307];
  var Arg15307_0 = Arg15307[0], Arg15307_1 = Arg15307[1];
  var R0;
  return ((shenjs_call(shen_pvar$question$, [Arg15307_0]))
  ? ((R0 = shenjs_call(shen_valvector, [Arg15307_0, Arg15307_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, [shen_type_symbol, "shen--null-"])))
  ? Arg15307_0
  : (function() {
  return shenjs_call_tail(shen_lazyderef, [R0, Arg15307_1]);})))
  : Arg15307_0)},
  2,
  [],
  "shen-lazyderef"];
shenjs_functions["shen_shen-lazyderef"] = shen_lazyderef;






shen_valvector = [shen_type_func,
  function shen_user_lambda15310(Arg15309) {
  if (Arg15309.length < 2) return [shen_type_func, shen_user_lambda15310, 2, Arg15309];
  var Arg15309_0 = Arg15309[0], Arg15309_1 = Arg15309[1];
  return shenjs_absvector_ref(shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg15309_1), shenjs_absvector_ref(Arg15309_0, 1))},
  2,
  [],
  "shen-valvector"];
shenjs_functions["shen_shen-valvector"] = shen_valvector;






shen_unify$excl$ = [shen_type_func,
  function shen_user_lambda15312(Arg15311) {
  if (Arg15311.length < 4) return [shen_type_func, shen_user_lambda15312, 4, Arg15311];
  var Arg15311_0 = Arg15311[0], Arg15311_1 = Arg15311[1], Arg15311_2 = Arg15311[2], Arg15311_3 = Arg15311[3];
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$$excl$, [shenjs_call(shen_lazyderef, [Arg15311_0, Arg15311_2]), shenjs_call(shen_lazyderef, [Arg15311_1, Arg15311_2]), Arg15311_2, Arg15311_3]);})},
  4,
  [],
  "unify!"];
shenjs_functions["shen_unify!"] = shen_unify$excl$;






shen_lzy$eq$$excl$ = [shen_type_func,
  function shen_user_lambda15314(Arg15313) {
  if (Arg15313.length < 4) return [shen_type_func, shen_user_lambda15314, 4, Arg15313];
  var Arg15313_0 = Arg15313[0], Arg15313_1 = Arg15313[1], Arg15313_2 = Arg15313[2], Arg15313_3 = Arg15313[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg15313_1, Arg15313_0)))
  ? shenjs_thaw(Arg15313_3)
  : (((shenjs_call(shen_pvar$question$, [Arg15313_0]) && (!shenjs_call(shen_occurs$question$, [Arg15313_0, shenjs_call(shen_deref, [Arg15313_1, Arg15313_2])]))))
  ? (function() {
  return shenjs_call_tail(shen_bind, [Arg15313_0, Arg15313_1, Arg15313_2, Arg15313_3]);})
  : (((shenjs_call(shen_pvar$question$, [Arg15313_1]) && (!shenjs_call(shen_occurs$question$, [Arg15313_1, shenjs_call(shen_deref, [Arg15313_0, Arg15313_2])]))))
  ? (function() {
  return shenjs_call_tail(shen_bind, [Arg15313_1, Arg15313_0, Arg15313_2, Arg15313_3]);})
  : (((shenjs_is_type(Arg15313_0, shen_type_cons) && shenjs_is_type(Arg15313_1, shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(shen_lzy$eq$$excl$, [shenjs_call(shen_lazyderef, [Arg15313_0[1], Arg15313_2]), shenjs_call(shen_lazyderef, [Arg15313_1[1], Arg15313_2]), Arg15313_2, (new Shenjs_freeze([Arg15313_0, Arg15313_1, Arg15313_2, Arg15313_3], function(Arg15315) {
  var Arg15315_0 = Arg15315[0], Arg15315_1 = Arg15315[1], Arg15315_2 = Arg15315[2], Arg15315_3 = Arg15315[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$$excl$, [shenjs_call(shen_lazyderef, [Arg15315_0[2], Arg15315_2]), shenjs_call(shen_lazyderef, [Arg15315_1[2], Arg15315_2]), Arg15315_2, Arg15315_3]);});})}))]);})
  : false))))},
  4,
  [],
  "shen-lzy=!"];
shenjs_functions["shen_shen-lzy=!"] = shen_lzy$eq$$excl$;






shen_occurs$question$ = [shen_type_func,
  function shen_user_lambda15318(Arg15317) {
  if (Arg15317.length < 2) return [shen_type_func, shen_user_lambda15318, 2, Arg15317];
  var Arg15317_0 = Arg15317[0], Arg15317_1 = Arg15317[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg15317_1, Arg15317_0)))
  ? true
  : ((shenjs_is_type(Arg15317_1, shen_type_cons))
  ? (shenjs_call(shen_occurs$question$, [Arg15317_0, Arg15317_1[1]]) || shenjs_call(shen_occurs$question$, [Arg15317_0, Arg15317_1[2]]))
  : false))},
  2,
  [],
  "shen-occurs?"];
shenjs_functions["shen_shen-occurs?"] = shen_occurs$question$;






shen_identical = [shen_type_func,
  function shen_user_lambda15320(Arg15319) {
  if (Arg15319.length < 4) return [shen_type_func, shen_user_lambda15320, 4, Arg15319];
  var Arg15319_0 = Arg15319[0], Arg15319_1 = Arg15319[1], Arg15319_2 = Arg15319[2], Arg15319_3 = Arg15319[3];
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$$eq$, [shenjs_call(shen_lazyderef, [Arg15319_0, Arg15319_2]), shenjs_call(shen_lazyderef, [Arg15319_1, Arg15319_2]), Arg15319_2, Arg15319_3]);})},
  4,
  [],
  "identical"];
shenjs_functions["shen_identical"] = shen_identical;






shen_lzy$eq$$eq$ = [shen_type_func,
  function shen_user_lambda15322(Arg15321) {
  if (Arg15321.length < 4) return [shen_type_func, shen_user_lambda15322, 4, Arg15321];
  var Arg15321_0 = Arg15321[0], Arg15321_1 = Arg15321[1], Arg15321_2 = Arg15321[2], Arg15321_3 = Arg15321[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg15321_1, Arg15321_0)))
  ? shenjs_thaw(Arg15321_3)
  : (((shenjs_is_type(Arg15321_0, shen_type_cons) && shenjs_is_type(Arg15321_1, shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(shen_lzy$eq$$eq$, [shenjs_call(shen_lazyderef, [Arg15321_0[1], Arg15321_2]), shenjs_call(shen_lazyderef, [Arg15321_1[1], Arg15321_2]), Arg15321_2, (new Shenjs_freeze([Arg15321_0, Arg15321_1, Arg15321_2, Arg15321_3], function(Arg15323) {
  var Arg15323_0 = Arg15323[0], Arg15323_1 = Arg15323[1], Arg15323_2 = Arg15323[2], Arg15323_3 = Arg15323[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$$eq$, [Arg15323_0[2], Arg15323_1[2], Arg15323_2, Arg15323_3]);});})}))]);})
  : false))},
  4,
  [],
  "shen-lzy=="];
shenjs_functions["shen_shen-lzy=="] = shen_lzy$eq$$eq$;






shen_pvar = [shen_type_func,
  function shen_user_lambda15326(Arg15325) {
  if (Arg15325.length < 1) return [shen_type_func, shen_user_lambda15326, 1, Arg15325];
  var Arg15325_0 = Arg15325[0];
  return (function() {
  return shenjs_call_tail(shen_intmake_string, ["Var~A", [shen_tuple, shenjs_absvector_ref(Arg15325_0, 1), []]]);})},
  1,
  [],
  "shen-pvar"];
shenjs_functions["shen_shen-pvar"] = shen_pvar;






shen_bind = [shen_type_func,
  function shen_user_lambda15328(Arg15327) {
  if (Arg15327.length < 4) return [shen_type_func, shen_user_lambda15328, 4, Arg15327];
  var Arg15327_0 = Arg15327[0], Arg15327_1 = Arg15327[1], Arg15327_2 = Arg15327[2], Arg15327_3 = Arg15327[3];
  var R0;
  return (shenjs_call(shen_bindv, [Arg15327_0, Arg15327_1, Arg15327_2]),
  (R0 = shenjs_unwind_tail(shenjs_thaw(Arg15327_3))),
  shenjs_call(shen_unbindv, [Arg15327_0, Arg15327_2]),
  R0)},
  4,
  [],
  "bind"];
shenjs_functions["shen_bind"] = shen_bind;






shen_fwhen = [shen_type_func,
  function shen_user_lambda15330(Arg15329) {
  if (Arg15329.length < 3) return [shen_type_func, shen_user_lambda15330, 3, Arg15329];
  var Arg15329_0 = Arg15329[0], Arg15329_1 = Arg15329[1], Arg15329_2 = Arg15329[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg15329_0)))
  ? shenjs_thaw(Arg15329_2)
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg15329_0)))
  ? false
  : (function() {
  return shenjs_call_tail(shen_interror, ["fwhen expects a boolean: not ~S%", [shen_tuple, Arg15329_0, []]]);})))},
  3,
  [],
  "fwhen"];
shenjs_functions["shen_fwhen"] = shen_fwhen;






shen_call = [shen_type_func,
  function shen_user_lambda15332(Arg15331) {
  if (Arg15331.length < 3) return [shen_type_func, shen_user_lambda15332, 3, Arg15331];
  var Arg15331_0 = Arg15331[0], Arg15331_1 = Arg15331[1], Arg15331_2 = Arg15331[2];
  return ((shenjs_is_type(Arg15331_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_call_help, [shenjs_call(shen_m$_prolog$_to$_s_prolog$_predicate, [shenjs_call(shen_lazyderef, [Arg15331_0[1], Arg15331_1])]), Arg15331_0[2], Arg15331_1, Arg15331_2]);})
  : false)},
  3,
  [],
  "call"];
shenjs_functions["shen_call"] = shen_call;






shen_call_help = [shen_type_func,
  function shen_user_lambda15334(Arg15333) {
  if (Arg15333.length < 4) return [shen_type_func, shen_user_lambda15334, 4, Arg15333];
  var Arg15333_0 = Arg15333[0], Arg15333_1 = Arg15333[1], Arg15333_2 = Arg15333[2], Arg15333_3 = Arg15333[3];
  return ((shenjs_empty$question$(Arg15333_1))
  ? (function() {
  return shenjs_call_tail(Arg15333_0, [Arg15333_2, Arg15333_3]);})
  : ((shenjs_is_type(Arg15333_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_call_help, [shenjs_call(Arg15333_0, [Arg15333_1[1]]), Arg15333_1[2], Arg15333_2, Arg15333_3]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-call-help"]]);})))},
  4,
  [],
  "shen-call-help"];
shenjs_functions["shen_shen-call-help"] = shen_call_help;






shen_intprolog = [shen_type_func,
  function shen_user_lambda15336(Arg15335) {
  if (Arg15335.length < 1) return [shen_type_func, shen_user_lambda15336, 1, Arg15335];
  var Arg15335_0 = Arg15335[0];
  var R0;
  return (((shenjs_is_type(Arg15335_0, shen_type_cons) && shenjs_is_type(Arg15335_0[1], shen_type_cons)))
  ? ((R0 = shenjs_call(shen_start_new_prolog_process, [])),
  (function() {
  return shenjs_call_tail(shen_intprolog_help, [Arg15335_0[1][1], shenjs_call(shen_insert_prolog_variables, [[shen_type_cons, Arg15335_0[1][2], [shen_type_cons, Arg15335_0[2], []]], R0]), R0]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-intprolog"]]);}))},
  1,
  [],
  "shen-intprolog"];
shenjs_functions["shen_shen-intprolog"] = shen_intprolog;






shen_intprolog_help = [shen_type_func,
  function shen_user_lambda15338(Arg15337) {
  if (Arg15337.length < 3) return [shen_type_func, shen_user_lambda15338, 3, Arg15337];
  var Arg15337_0 = Arg15337[0], Arg15337_1 = Arg15337[1], Arg15337_2 = Arg15337[2];
  return (((shenjs_is_type(Arg15337_1, shen_type_cons) && (shenjs_is_type(Arg15337_1[2], shen_type_cons) && shenjs_empty$question$(Arg15337_1[2][2]))))
  ? (function() {
  return shenjs_call_tail(shen_intprolog_help_help, [Arg15337_0, Arg15337_1[1], Arg15337_1[2][1], Arg15337_2]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-intprolog-help"]]);}))},
  3,
  [],
  "shen-intprolog-help"];
shenjs_functions["shen_shen-intprolog-help"] = shen_intprolog_help;






shen_intprolog_help_help = [shen_type_func,
  function shen_user_lambda15340(Arg15339) {
  if (Arg15339.length < 4) return [shen_type_func, shen_user_lambda15340, 4, Arg15339];
  var Arg15339_0 = Arg15339[0], Arg15339_1 = Arg15339[1], Arg15339_2 = Arg15339[2], Arg15339_3 = Arg15339[3];
  return ((shenjs_empty$question$(Arg15339_1))
  ? (function() {
  return shenjs_call_tail(Arg15339_0, [Arg15339_3, (new Shenjs_freeze([Arg15339_0, Arg15339_1, Arg15339_2, Arg15339_3], function(Arg15341) {
  var Arg15341_0 = Arg15341[0], Arg15341_1 = Arg15341[1], Arg15341_2 = Arg15341[2], Arg15341_3 = Arg15341[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_call_rest, [Arg15341_2, Arg15341_3]);});})}))]);})
  : ((shenjs_is_type(Arg15339_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_intprolog_help_help, [shenjs_call(Arg15339_0, [Arg15339_1[1]]), Arg15339_1[2], Arg15339_2, Arg15339_3]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-intprolog-help-help"]]);})))},
  4,
  [],
  "shen-intprolog-help-help"];
shenjs_functions["shen_shen-intprolog-help-help"] = shen_intprolog_help_help;






shen_call_rest = [shen_type_func,
  function shen_user_lambda15344(Arg15343) {
  if (Arg15343.length < 2) return [shen_type_func, shen_user_lambda15344, 2, Arg15343];
  var Arg15343_0 = Arg15343[0], Arg15343_1 = Arg15343[1];
  return ((shenjs_empty$question$(Arg15343_0))
  ? true
  : (((shenjs_is_type(Arg15343_0, shen_type_cons) && (shenjs_is_type(Arg15343_0[1], shen_type_cons) && shenjs_is_type(Arg15343_0[1][2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_call_rest, [[shen_type_cons, [shen_type_cons, shenjs_call(Arg15343_0[1][1], [Arg15343_0[1][2][1]]), Arg15343_0[1][2][2]], Arg15343_0[2]], Arg15343_1]);})
  : (((shenjs_is_type(Arg15343_0, shen_type_cons) && (shenjs_is_type(Arg15343_0[1], shen_type_cons) && shenjs_empty$question$(Arg15343_0[1][2]))))
  ? (function() {
  return shenjs_call_tail(Arg15343_0[1][1], [Arg15343_1, (new Shenjs_freeze([Arg15343_0, Arg15343_1], function(Arg15345) {
  var Arg15345_0 = Arg15345[0], Arg15345_1 = Arg15345[1];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_call_rest, [Arg15345_0[2], Arg15345_1]);});})}))]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-call-rest"]]);}))))},
  2,
  [],
  "shen-call-rest"];
shenjs_functions["shen_shen-call-rest"] = shen_call_rest;






shen_start_new_prolog_process = [shen_type_func,
  function shen_user_lambda15348(Arg15347) {
  if (Arg15347.length < 0) return [shen_type_func, shen_user_lambda15348, 0, Arg15347];
  var R0;
  return ((R0 = (shenjs_globals["shen_shen-*process-counter*"] = (1 + (shenjs_globals["shen_shen-*process-counter*"])))),
  (function() {
  return shenjs_call_tail(shen_initialise_prolog, [R0]);}))},
  0,
  [],
  "shen-start-new-prolog-process"];
shenjs_functions["shen_shen-start-new-prolog-process"] = shen_start_new_prolog_process;






shen_insert_prolog_variables = [shen_type_func,
  function shen_user_lambda15350(Arg15349) {
  if (Arg15349.length < 2) return [shen_type_func, shen_user_lambda15350, 2, Arg15349];
  var Arg15349_0 = Arg15349[0], Arg15349_1 = Arg15349[1];
  return (function() {
  return shenjs_call_tail(shen_insert_prolog_variables_help, [Arg15349_0, shenjs_call(shen_flatten, [Arg15349_0]), Arg15349_1]);})},
  2,
  [],
  "shen-insert-prolog-variables"];
shenjs_functions["shen_shen-insert-prolog-variables"] = shen_insert_prolog_variables;






shen_insert_prolog_variables_help = [shen_type_func,
  function shen_user_lambda15352(Arg15351) {
  if (Arg15351.length < 3) return [shen_type_func, shen_user_lambda15352, 3, Arg15351];
  var Arg15351_0 = Arg15351[0], Arg15351_1 = Arg15351[1], Arg15351_2 = Arg15351[2];
  var R0, R1;
  return ((shenjs_empty$question$(Arg15351_1))
  ? Arg15351_0
  : (((shenjs_is_type(Arg15351_1, shen_type_cons) && shenjs_call(shen_variable$question$, [Arg15351_1[1]])))
  ? ((R0 = shenjs_call(shen_newpv, [Arg15351_2])),
  (R0 = shenjs_call(shen_subst, [R0, Arg15351_1[1], Arg15351_0])),
  (R1 = shenjs_call(shen_remove, [Arg15351_1[1], Arg15351_1[2]])),
  (function() {
  return shenjs_call_tail(shen_insert_prolog_variables_help, [R0, R1, Arg15351_2]);}))
  : ((shenjs_is_type(Arg15351_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_insert_prolog_variables_help, [Arg15351_0, Arg15351_1[2], Arg15351_2]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-insert-prolog-variables-help"]]);}))))},
  3,
  [],
  "shen-insert-prolog-variables-help"];
shenjs_functions["shen_shen-insert-prolog-variables-help"] = shen_insert_prolog_variables_help;






shen_initialise_prolog = [shen_type_func,
  function shen_user_lambda15354(Arg15353) {
  if (Arg15353.length < 1) return [shen_type_func, shen_user_lambda15354, 1, Arg15353];
  var Arg15353_0 = Arg15353[0];
  return (shenjs_absvector_set((shenjs_globals["shen_shen-*prologvectors*"]), Arg15353_0, shenjs_call(shen_fillvector, [shenjs_vector(10), 1, 10, [shen_type_symbol, "shen--null-"]])),
  shenjs_absvector_set((shenjs_globals["shen_shen-*varcounter*"]), Arg15353_0, 1),
  Arg15353_0)},
  1,
  [],
  "shen-initialise-prolog"];
shenjs_functions["shen_shen-initialise-prolog"] = shen_initialise_prolog;












shen_f$_error = [shen_type_func,
  function shen_user_lambda15986(Arg15985) {
  if (Arg15985.length < 1) return [shen_type_func, shen_user_lambda15986, 1, Arg15985];
  var Arg15985_0 = Arg15985[0];
  return (shenjs_call(shen_intoutput, ["partial function ~A;~%", [shen_tuple, Arg15985_0, []]]),
  ((((!shenjs_call(shen_tracked$question$, [Arg15985_0])) && shenjs_call(shen_y_or_n$question$, [shenjs_call(shen_intmake_string, ["track ~A? ", [shen_tuple, Arg15985_0, []]])])))
  ? shenjs_call(shen_track_function, [shenjs_call(shen_ps, [Arg15985_0])])
  : [shen_type_symbol, "shen-ok"]),
  (function() {
  return shenjs_simple_error("aborted");}))},
  1,
  [],
  "shen-f_error"];
shenjs_functions["shen_shen-f_error"] = shen_f$_error;






shen_tracked$question$ = [shen_type_func,
  function shen_user_lambda15988(Arg15987) {
  if (Arg15987.length < 1) return [shen_type_func, shen_user_lambda15988, 1, Arg15987];
  var Arg15987_0 = Arg15987[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg15987_0, (shenjs_globals["shen_shen-*tracking*"])]);})},
  1,
  [],
  "shen-tracked?"];
shenjs_functions["shen_shen-tracked?"] = shen_tracked$question$;






shen_track = [shen_type_func,
  function shen_user_lambda15990(Arg15989) {
  if (Arg15989.length < 1) return [shen_type_func, shen_user_lambda15990, 1, Arg15989];
  var Arg15989_0 = Arg15989[0];
  var R0;
  return ((R0 = shenjs_call(shen_ps, [Arg15989_0])),
  (function() {
  return shenjs_call_tail(shen_track_function, [R0]);}))},
  1,
  [],
  "track"];
shenjs_functions["shen_track"] = shen_track;






shen_track_function = [shen_type_func,
  function shen_user_lambda15992(Arg15991) {
  if (Arg15991.length < 1) return [shen_type_func, shen_user_lambda15992, 1, Arg15991];
  var Arg15991_0 = Arg15991[0];
  var R0;
  return (((shenjs_is_type(Arg15991_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defun"], Arg15991_0[1])) && (shenjs_is_type(Arg15991_0[2], shen_type_cons) && (shenjs_is_type(Arg15991_0[2][2], shen_type_cons) && (shenjs_is_type(Arg15991_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg15991_0[2][2][2][2])))))))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "defun"], [shen_type_cons, Arg15991_0[2][1], [shen_type_cons, Arg15991_0[2][2][1], [shen_type_cons, shenjs_call(shen_insert_tracking_code, [Arg15991_0[2][1], Arg15991_0[2][2][1], Arg15991_0[2][2][2][1]]), []]]]]),
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
  function shen_user_lambda15994(Arg15993) {
  if (Arg15993.length < 3) return [shen_type_func, shen_user_lambda15994, 3, Arg15993];
  var Arg15993_0 = Arg15993[0], Arg15993_1 = Arg15993[1], Arg15993_2 = Arg15993[2];
  return [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], []]], [shen_type_cons, 1, []]]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-input-track"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], []]], [shen_type_cons, Arg15993_0, [shen_type_cons, shenjs_call(shen_cons$_form, [Arg15993_1]), []]]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-terpri-or-read-char"], []], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg15993_2, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-output-track"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], []]], [shen_type_cons, Arg15993_0, [shen_type_cons, [shen_type_symbol, "Result"], []]]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], []]], [shen_type_cons, 1, []]]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-terpri-or-read-char"], []], [shen_type_cons, [shen_type_symbol, "Result"], []]]], []]]], []]]], []]]]], []]]], []]]], []]]]},
  3,
  [],
  "shen-insert-tracking-code"];
shenjs_functions["shen_shen-insert-tracking-code"] = shen_insert_tracking_code;






(shenjs_globals["shen_shen-*step*"] = false);






shen_step = [shen_type_func,
  function shen_user_lambda15997(Arg15996) {
  if (Arg15996.length < 1) return [shen_type_func, shen_user_lambda15997, 1, Arg15996];
  var Arg15996_0 = Arg15996[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg15996_0)))
  ? (shenjs_globals["shen_shen-*step*"] = true)
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg15996_0)))
  ? (shenjs_globals["shen_shen-*step*"] = false)
  : (function() {
  return shenjs_call_tail(shen_interror, ["step expects a + or a -.~%", []]);})))},
  1,
  [],
  "step"];
shenjs_functions["shen_step"] = shen_step;






shen_spy = [shen_type_func,
  function shen_user_lambda15999(Arg15998) {
  if (Arg15998.length < 1) return [shen_type_func, shen_user_lambda15999, 1, Arg15998];
  var Arg15998_0 = Arg15998[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg15998_0)))
  ? (shenjs_globals["shen_shen-*spy*"] = true)
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg15998_0)))
  ? (shenjs_globals["shen_shen-*spy*"] = false)
  : (function() {
  return shenjs_call_tail(shen_interror, ["spy expects a + or a -.~%", []]);})))},
  1,
  [],
  "spy"];
shenjs_functions["shen_spy"] = shen_spy;






shen_terpri_or_read_char = [shen_type_func,
  function shen_user_lambda16001(Arg16000) {
  if (Arg16000.length < 0) return [shen_type_func, shen_user_lambda16001, 0, Arg16000];
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
  function shen_user_lambda16003(Arg16002) {
  if (Arg16002.length < 1) return [shen_type_func, shen_user_lambda16003, 1, Arg16002];
  var Arg16002_0 = Arg16002[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg16002_0, shenjs_call(shen_hat, []))))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["aborted", []]);})
  : true)},
  1,
  [],
  "shen-check-byte"];
shenjs_functions["shen_shen-check-byte"] = shen_check_byte;






shen_input_track = [shen_type_func,
  function shen_user_lambda16005(Arg16004) {
  if (Arg16004.length < 3) return [shen_type_func, shen_user_lambda16005, 3, Arg16004];
  var Arg16004_0 = Arg16004[0], Arg16004_1 = Arg16004[1], Arg16004_2 = Arg16004[2];
  return (shenjs_call(shen_intoutput, ["~%~A<~A> Inputs to ~A ~%~A", [shen_tuple, shenjs_call(shen_spaces, [Arg16004_0]), [shen_tuple, Arg16004_0, [shen_tuple, Arg16004_1, [shen_tuple, shenjs_call(shen_spaces, [Arg16004_0]), [shen_tuple, Arg16004_2, []]]]]]]),
  (function() {
  return shenjs_call_tail(shen_recursively_print, [Arg16004_2]);}))},
  3,
  [],
  "shen-input-track"];
shenjs_functions["shen_shen-input-track"] = shen_input_track;






shen_recursively_print = [shen_type_func,
  function shen_user_lambda16007(Arg16006) {
  if (Arg16006.length < 1) return [shen_type_func, shen_user_lambda16007, 1, Arg16006];
  var Arg16006_0 = Arg16006[0];
  return ((shenjs_empty$question$(Arg16006_0))
  ? (function() {
  return shenjs_call_tail(shen_intoutput, [" ==>", []]);})
  : ((shenjs_is_type(Arg16006_0, shen_type_cons))
  ? (shenjs_call(shen_print, [Arg16006_0[1]]),
  shenjs_call(shen_intoutput, [", ", []]),
  (function() {
  return shenjs_call_tail(shen_recursively_print, [Arg16006_0[2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-recursively-print"]]);})))},
  1,
  [],
  "shen-recursively-print"];
shenjs_functions["shen_shen-recursively-print"] = shen_recursively_print;






shen_spaces = [shen_type_func,
  function shen_user_lambda16009(Arg16008) {
  if (Arg16008.length < 1) return [shen_type_func, shen_user_lambda16009, 1, Arg16008];
  var Arg16008_0 = Arg16008[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg16008_0)))
  ? ""
  : (" " + shenjs_call(shen_spaces, [(Arg16008_0 - 1)])))},
  1,
  [],
  "shen-spaces"];
shenjs_functions["shen_shen-spaces"] = shen_spaces;






shen_output_track = [shen_type_func,
  function shen_user_lambda16011(Arg16010) {
  if (Arg16010.length < 3) return [shen_type_func, shen_user_lambda16011, 3, Arg16010];
  var Arg16010_0 = Arg16010[0], Arg16010_1 = Arg16010[1], Arg16010_2 = Arg16010[2];
  return (function() {
  return shenjs_call_tail(shen_intoutput, ["~%~A<~A> Output from ~A ~%~A==> ~S", [shen_tuple, shenjs_call(shen_spaces, [Arg16010_0]), [shen_tuple, Arg16010_0, [shen_tuple, Arg16010_1, [shen_tuple, shenjs_call(shen_spaces, [Arg16010_0]), [shen_tuple, Arg16010_2, []]]]]]]);})},
  3,
  [],
  "shen-output-track"];
shenjs_functions["shen_shen-output-track"] = shen_output_track;






shen_untrack = [shen_type_func,
  function shen_user_lambda16013(Arg16012) {
  if (Arg16012.length < 1) return [shen_type_func, shen_user_lambda16013, 1, Arg16012];
  var Arg16012_0 = Arg16012[0];
  return (function() {
  return shenjs_call_tail(shen_eval, [shenjs_call(shen_ps, [Arg16012_0])]);})},
  1,
  [],
  "untrack"];
shenjs_functions["shen_untrack"] = shen_untrack;






shen_profile = [shen_type_func,
  function shen_user_lambda16015(Arg16014) {
  if (Arg16014.length < 1) return [shen_type_func, shen_user_lambda16015, 1, Arg16014];
  var Arg16014_0 = Arg16014[0];
  return (function() {
  return shenjs_call_tail(shen_profile_help, [shenjs_call(shen_ps, [Arg16014_0])]);})},
  1,
  [],
  "profile"];
shenjs_functions["shen_profile"] = shen_profile;






shen_profile_help = [shen_type_func,
  function shen_user_lambda16017(Arg16016) {
  if (Arg16016.length < 1) return [shen_type_func, shen_user_lambda16017, 1, Arg16016];
  var Arg16016_0 = Arg16016[0];
  var R0, R1;
  return (((shenjs_is_type(Arg16016_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defun"], Arg16016_0[1])) && (shenjs_is_type(Arg16016_0[2], shen_type_cons) && (shenjs_is_type(Arg16016_0[2][2], shen_type_cons) && (shenjs_is_type(Arg16016_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg16016_0[2][2][2][2])))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "shen-f"]])),
  (R1 = [shen_type_cons, [shen_type_symbol, "defun"], [shen_type_cons, Arg16016_0[2][1], [shen_type_cons, Arg16016_0[2][2][1], [shen_type_cons, shenjs_call(shen_profile_func, [Arg16016_0[2][1], Arg16016_0[2][2][1], [shen_type_cons, R0, Arg16016_0[2][2][1]]]), []]]]]),
  (R0 = [shen_type_cons, [shen_type_symbol, "defun"], [shen_type_cons, R0, [shen_type_cons, Arg16016_0[2][2][1], [shen_type_cons, shenjs_call(shen_subst, [R0, Arg16016_0[2][1], Arg16016_0[2][2][2][1]]), []]]]]),
  shenjs_call(shen_eval_without_macros, [R1]),
  shenjs_call(shen_eval_without_macros, [R0]),
  Arg16016_0[2][1])
  : (function() {
  return shenjs_call_tail(shen_interror, ["Cannot profile.~%", []]);}))},
  1,
  [],
  "shen-profile-help"];
shenjs_functions["shen_shen-profile-help"] = shen_profile_help;






shen_unprofile = [shen_type_func,
  function shen_user_lambda16019(Arg16018) {
  if (Arg16018.length < 1) return [shen_type_func, shen_user_lambda16019, 1, Arg16018];
  var Arg16018_0 = Arg16018[0];
  return (function() {
  return shenjs_call_tail(shen_untrack, [Arg16018_0]);})},
  1,
  [],
  "unprofile"];
shenjs_functions["shen_unprofile"] = shen_unprofile;






shen_profile_func = [shen_type_func,
  function shen_user_lambda16021(Arg16020) {
  if (Arg16020.length < 3) return [shen_type_func, shen_user_lambda16021, 3, Arg16020];
  var Arg16020_0 = Arg16020[0], Arg16020_1 = Arg16020[1], Arg16020_2 = Arg16020[2];
  return [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Start"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "run"], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg16020_2, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Finish"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "run"], []]], [shen_type_cons, [shen_type_symbol, "Start"], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Record"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-put-profile"], [shen_type_cons, Arg16020_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-get-profile"], [shen_type_cons, Arg16020_0, []]], [shen_type_cons, [shen_type_symbol, "Finish"], []]]], []]]], [shen_type_cons, [shen_type_symbol, "Result"], []]]]], []]]]], []]]]], []]]]]},
  3,
  [],
  "shen-profile-func"];
shenjs_functions["shen_shen-profile-func"] = shen_profile_func;






shen_profile_results = [shen_type_func,
  function shen_user_lambda16023(Arg16022) {
  if (Arg16022.length < 1) return [shen_type_func, shen_user_lambda16023, 1, Arg16022];
  var Arg16022_0 = Arg16022[0];
  var R0;
  return ((R0 = shenjs_call(shen_get_profile, [Arg16022_0])),
  shenjs_call(shen_put_profile, [Arg16022_0, 0]),
  [shen_tuple, Arg16022_0, R0])},
  1,
  [],
  "profile-results"];
shenjs_functions["shen_profile-results"] = shen_profile_results;






shen_get_profile = [shen_type_func,
  function shen_user_lambda16025(Arg16024) {
  if (Arg16024.length < 1) return [shen_type_func, shen_user_lambda16025, 1, Arg16024];
  var Arg16024_0 = Arg16024[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg16024_0, [shen_type_symbol, "profile"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda16027(Arg16026) {
  if (Arg16026.length < 1) return [shen_type_func, shen_user_lambda16027, 1, Arg16026];
  var Arg16026_0 = Arg16026[0];
  return 0},
  1,
  []]);})},
  1,
  [],
  "shen-get-profile"];
shenjs_functions["shen_shen-get-profile"] = shen_get_profile;






shen_put_profile = [shen_type_func,
  function shen_user_lambda16029(Arg16028) {
  if (Arg16028.length < 2) return [shen_type_func, shen_user_lambda16029, 2, Arg16028];
  var Arg16028_0 = Arg16028[0], Arg16028_1 = Arg16028[1];
  return (function() {
  return shenjs_call_tail(shen_put, [Arg16028_0, [shen_type_symbol, "profile"], Arg16028_1, (shenjs_globals["shen_shen-*property-vector*"])]);})},
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
  function shen_user_lambda15000(Arg14999) {
  if (Arg14999.length < 1) return [shen_type_func, shen_user_lambda15000, 1, Arg14999];
  var Arg14999_0 = Arg14999[0];
  return ((shenjs_empty$question$(Arg14999_0))
  ? []
  : (((shenjs_is_type(Arg14999_0, shen_type_cons) && shenjs_is_type(Arg14999_0[2], shen_type_cons)))
  ? (shenjs_call(shen_put, [Arg14999_0[1], [shen_type_symbol, "arity"], Arg14999_0[2][1], (shenjs_globals["shen_shen-*property-vector*"])]),
  (function() {
  return shenjs_call_tail(shen_initialise$_arity$_table, [Arg14999_0[2][2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-initialise_arity_table"]]);})))},
  1,
  [],
  "shen-initialise_arity_table"];
shenjs_functions["shen_shen-initialise_arity_table"] = shen_initialise$_arity$_table;






shen_arity = [shen_type_func,
  function shen_user_lambda15002(Arg15001) {
  if (Arg15001.length < 1) return [shen_type_func, shen_user_lambda15002, 1, Arg15001];
  var Arg15001_0 = Arg15001[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg15001_0, [shen_type_symbol, "arity"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda15004(Arg15003) {
  if (Arg15003.length < 1) return [shen_type_func, shen_user_lambda15004, 1, Arg15003];
  var Arg15003_0 = Arg15003[0];
  return -1},
  1,
  []]);})},
  1,
  [],
  "arity"];
shenjs_functions["shen_arity"] = shen_arity;






shenjs_call(shen_initialise$_arity$_table, [[shen_type_cons, [shen_type_symbol, "adjoin"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "append"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "arity"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "assoc"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "boolean?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "cd"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "compile"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "concat"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "cn"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "declare"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "destroy"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "difference"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "dump"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "element?"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "empty?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "interror"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "eval"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "eval-kl"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "explode"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "external"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "fail-if"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "fail"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "fix"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "findall"], [shen_type_cons, 5, [shen_type_cons, [shen_type_symbol, "freeze"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "gensym"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "get"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "address->"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "<-address"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, ">"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, ">="], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "hdv"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "hdstr"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "head"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "integer?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "identical"], [shen_type_cons, 4, [shen_type_cons, [shen_type_symbol, "inferences"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "intoutput"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "make-string"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "intersection"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "length"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "lineread"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "load"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "<"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "<="], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "macroexpand"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "map"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "mapcan"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "intmake-string"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "maxinferences"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "nth"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "n->string"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "number?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "output"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "occurs-check"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "occurrences"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "occurs-check"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "or"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "pos"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "print"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "profile"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "profile-results"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "ps"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "preclude"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "preclude-all-but"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "protect"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "address->"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "put"], [shen_type_cons, 4, [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "read-file-as-string"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "read-file"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "read-byte"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "remove"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "reverse"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "simple-error"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "specialise"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "spy"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "step"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "stinput"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "shen-stoutput"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "string->n"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "string?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "strong-warning"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "subst"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "symbol?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "tail"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "tc"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "tc?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "track"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "trap-error"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "tuple?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "type"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "return"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "unprofile"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "unify"], [shen_type_cons, 4, [shen_type_cons, [shen_type_symbol, "unify!"], [shen_type_cons, 4, [shen_type_cons, [shen_type_symbol, "union"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "untrack"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "unspecialise"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "variable?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "version"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "warn"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "write-to-file"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "y-or-n?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "/"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "=="], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "shen-<1>"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "<e>"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "@s"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "preclude"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "include"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "preclude-all-but"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "include-all-but"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, 2, []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]);





shen_systemf = [shen_type_func,
  function shen_user_lambda15007(Arg15006) {
  if (Arg15006.length < 1) return [shen_type_func, shen_user_lambda15007, 1, Arg15006];
  var Arg15006_0 = Arg15006[0];
  return (shenjs_globals["shen_shen-*system*"] = shenjs_call(shen_adjoin, [Arg15006_0, (shenjs_globals["shen_shen-*system*"])]))},
  1,
  [],
  "systemf"];
shenjs_functions["shen_systemf"] = shen_systemf;






shen_adjoin = [shen_type_func,
  function shen_user_lambda15009(Arg15008) {
  if (Arg15008.length < 2) return [shen_type_func, shen_user_lambda15009, 2, Arg15008];
  var Arg15008_0 = Arg15008[0], Arg15008_1 = Arg15008[1];
  return ((shenjs_call(shen_element$question$, [Arg15008_0, Arg15008_1]))
  ? Arg15008_1
  : [shen_type_cons, Arg15008_0, Arg15008_1])},
  2,
  [],
  "adjoin"];
shenjs_functions["shen_adjoin"] = shen_adjoin;






shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15012(Arg15011) {
  if (Arg15011.length < 1) return [shen_type_func, shen_user_lambda15012, 1, Arg15011];
  var Arg15011_0 = Arg15011[0];
  return (function() {
  return shenjs_call_tail(shen_systemf, [Arg15011_0]);})},
  1,
  []], [shen_type_cons, [shen_type_symbol, "!"], [shen_type_cons, [shen_type_symbol, "}"], [shen_type_cons, [shen_type_symbol, "{"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "<--"], [shen_type_cons, [shen_type_symbol, "&&"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [shen_type_symbol, ":="], [shen_type_cons, [shen_type_symbol, "_"], [shen_type_cons, [shen_type_symbol, "<!>"], [shen_type_cons, [shen_type_symbol, "-*-"], [shen_type_cons, [shen_type_symbol, "*language*"], [shen_type_cons, [shen_type_symbol, "*implementation*"], [shen_type_cons, [shen_type_symbol, "*stinput*"], [shen_type_cons, [shen_type_symbol, "*home-directory*"], [shen_type_cons, [shen_type_symbol, "*version*"], [shen_type_cons, [shen_type_symbol, "*maximum-print-sequence-size*"], [shen_type_cons, [shen_type_symbol, "*printer*"], [shen_type_cons, [shen_type_symbol, "*macros*"], [shen_type_cons, [shen_type_symbol, "shen-*os*"], [shen_type_cons, [shen_type_symbol, "shen-*release*"], [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "@s"], [shen_type_cons, [shen_type_symbol, "<-"], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_symbol, "<e>"], [shen_type_cons, [shen_type_symbol, "=="], [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, ">="], [shen_type_cons, [shen_type_symbol, ">"], [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, [shen_type_symbol, "=!"], [shen_type_cons, [shen_type_symbol, "$"], [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_symbol, "/"], [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_symbol, "<="], [shen_type_cons, [shen_type_symbol, "<"], [shen_type_cons, [shen_type_symbol, ">>"], [shen_type_cons, shenjs_vector(0), [shen_type_cons, [shen_type_symbol, "y-or-n?"], [shen_type_cons, [shen_type_symbol, "write-to-file"], [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_symbol, "when"], [shen_type_cons, [shen_type_symbol, "warn"], [shen_type_cons, [shen_type_symbol, "version"], [shen_type_cons, [shen_type_symbol, "verified"], [shen_type_cons, [shen_type_symbol, "variable?"], [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, [shen_type_symbol, "vector?"], [shen_type_cons, [shen_type_symbol, "unspecialise"], [shen_type_cons, [shen_type_symbol, "untrack"], [shen_type_cons, [shen_type_symbol, "union"], [shen_type_cons, [shen_type_symbol, "unify"], [shen_type_cons, [shen_type_symbol, "unify!"], [shen_type_cons, [shen_type_symbol, "unprofile"], [shen_type_cons, [shen_type_symbol, "return"], [shen_type_cons, [shen_type_symbol, "type"], [shen_type_cons, [shen_type_symbol, "tuple?"], [shen_type_cons, true, [shen_type_cons, [shen_type_symbol, "trap-error"], [shen_type_cons, [shen_type_symbol, "track"], [shen_type_cons, [shen_type_symbol, "time"], [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, [shen_type_symbol, "tc?"], [shen_type_cons, [shen_type_symbol, "tc"], [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_symbol, "tlstr"], [shen_type_cons, [shen_type_symbol, "tlv"], [shen_type_cons, [shen_type_symbol, "tail"], [shen_type_cons, [shen_type_symbol, "systemf"], [shen_type_cons, [shen_type_symbol, "synonyms"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "symbol?"], [shen_type_cons, [shen_type_symbol, "sum"], [shen_type_cons, [shen_type_symbol, "subst"], [shen_type_cons, [shen_type_symbol, "string?"], [shen_type_cons, [shen_type_symbol, "string->n"], [shen_type_cons, [shen_type_symbol, "stream"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "stinput"], [shen_type_cons, [shen_type_symbol, "shen-stoutput"], [shen_type_cons, [shen_type_symbol, "step"], [shen_type_cons, [shen_type_symbol, "spy"], [shen_type_cons, [shen_type_symbol, "specialise"], [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, [shen_type_symbol, "simple-error"], [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "save"], [shen_type_cons, [shen_type_symbol, "str"], [shen_type_cons, [shen_type_symbol, "run"], [shen_type_cons, [shen_type_symbol, "reverse"], [shen_type_cons, [shen_type_symbol, "remove"], [shen_type_cons, [shen_type_symbol, "read"], [shen_type_cons, [shen_type_symbol, "read-file"], [shen_type_cons, [shen_type_symbol, "read-file-as-bytelist"], [shen_type_cons, [shen_type_symbol, "read-file-as-string"], [shen_type_cons, [shen_type_symbol, "read-byte"], [shen_type_cons, [shen_type_symbol, "quit"], [shen_type_cons, [shen_type_symbol, "put"], [shen_type_cons, [shen_type_symbol, "preclude"], [shen_type_cons, [shen_type_symbol, "preclude-all-but"], [shen_type_cons, [shen_type_symbol, "ps"], [shen_type_cons, [shen_type_symbol, "prolog?"], [shen_type_cons, [shen_type_symbol, "protect"], [shen_type_cons, [shen_type_symbol, "profile-results"], [shen_type_cons, [shen_type_symbol, "profile"], [shen_type_cons, [shen_type_symbol, "print"], [shen_type_cons, [shen_type_symbol, "pr"], [shen_type_cons, [shen_type_symbol, "pos"], [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, [shen_type_symbol, "output"], [shen_type_cons, [shen_type_symbol, "out"], [shen_type_cons, [shen_type_symbol, "or"], [shen_type_cons, [shen_type_symbol, "open"], [shen_type_cons, [shen_type_symbol, "occurrences"], [shen_type_cons, [shen_type_symbol, "occurs-check"], [shen_type_cons, [shen_type_symbol, "n->string"], [shen_type_cons, [shen_type_symbol, "number?"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "null"], [shen_type_cons, [shen_type_symbol, "nth"], [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_symbol, "nl"], [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, [shen_type_symbol, "macro"], [shen_type_cons, [shen_type_symbol, "macroexpand"], [shen_type_cons, [shen_type_symbol, "maxinferences"], [shen_type_cons, [shen_type_symbol, "mapcan"], [shen_type_cons, [shen_type_symbol, "map"], [shen_type_cons, [shen_type_symbol, "make-string"], [shen_type_cons, [shen_type_symbol, "load"], [shen_type_cons, [shen_type_symbol, "loaded"], [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "lineread"], [shen_type_cons, [shen_type_symbol, "limit"], [shen_type_cons, [shen_type_symbol, "length"], [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "lazy"], [shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "intersection"], [shen_type_cons, [shen_type_symbol, "inferences"], [shen_type_cons, [shen_type_symbol, "intern"], [shen_type_cons, [shen_type_symbol, "integer?"], [shen_type_cons, [shen_type_symbol, "input"], [shen_type_cons, [shen_type_symbol, "input+"], [shen_type_cons, [shen_type_symbol, "include"], [shen_type_cons, [shen_type_symbol, "include-all-but"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_symbol, "identical"], [shen_type_cons, [shen_type_symbol, "head"], [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_symbol, "hdv"], [shen_type_cons, [shen_type_symbol, "hdstr"], [shen_type_cons, [shen_type_symbol, "hash"], [shen_type_cons, [shen_type_symbol, "get"], [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "gensym"], [shen_type_cons, [shen_type_symbol, "function"], [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, [shen_type_symbol, "freeze"], [shen_type_cons, [shen_type_symbol, "format"], [shen_type_cons, [shen_type_symbol, "fix"], [shen_type_cons, [shen_type_symbol, "file"], [shen_type_cons, [shen_type_symbol, "fail"], [shen_type_cons, shen_fail_obj, [shen_type_cons, [shen_type_symbol, "fail-if"], [shen_type_cons, [shen_type_symbol, "fwhen"], [shen_type_cons, [shen_type_symbol, "findall"], [shen_type_cons, false, [shen_type_cons, [shen_type_symbol, "explode"], [shen_type_cons, [shen_type_symbol, "external"], [shen_type_cons, [shen_type_symbol, "exception"], [shen_type_cons, [shen_type_symbol, "eval-kl"], [shen_type_cons, [shen_type_symbol, "eval"], [shen_type_cons, [shen_type_symbol, "error-to-string"], [shen_type_cons, [shen_type_symbol, "error"], [shen_type_cons, [shen_type_symbol, "empty?"], [shen_type_cons, [shen_type_symbol, "element?"], [shen_type_cons, [shen_type_symbol, "dump"], [shen_type_cons, [shen_type_symbol, "dumped"], [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_symbol, "difference"], [shen_type_cons, [shen_type_symbol, "destroy"], [shen_type_cons, [shen_type_symbol, "defun"], [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, [shen_type_symbol, "defmacro"], [shen_type_cons, [shen_type_symbol, "defcc"], [shen_type_cons, [shen_type_symbol, "defprolog"], [shen_type_cons, [shen_type_symbol, "declare"], [shen_type_cons, [shen_type_symbol, "datatype"], [shen_type_cons, [shen_type_symbol, "cut"], [shen_type_cons, [shen_type_symbol, "cn"], [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, [shen_type_symbol, "cond"], [shen_type_cons, [shen_type_symbol, "concat"], [shen_type_cons, [shen_type_symbol, "compile"], [shen_type_cons, [shen_type_symbol, "cd"], [shen_type_cons, [shen_type_symbol, "cases"], [shen_type_cons, [shen_type_symbol, "call"], [shen_type_cons, [shen_type_symbol, "close"], [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, [shen_type_symbol, "bound?"], [shen_type_cons, [shen_type_symbol, "boolean?"], [shen_type_cons, [shen_type_symbol, "boolean"], [shen_type_cons, [shen_type_symbol, "bar!"], [shen_type_cons, [shen_type_symbol, "assoc"], [shen_type_cons, [shen_type_symbol, "arity"], [shen_type_cons, [shen_type_symbol, "append"], [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "adjoin"], [shen_type_cons, [shen_type_symbol, "<-address"], [shen_type_cons, [shen_type_symbol, "address->"], [shen_type_cons, [shen_type_symbol, "absvector?"], [shen_type_cons, [shen_type_symbol, "absvector"], [shen_type_cons, [shen_type_symbol, "abort"], [shen_type_cons, [shen_type_symbol, "intmake-string"], [shen_type_cons, [shen_type_symbol, "intoutput"], [shen_type_cons, [shen_type_symbol, "interror"], []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]);





shen_specialise = [shen_type_func,
  function shen_user_lambda15014(Arg15013) {
  if (Arg15013.length < 1) return [shen_type_func, shen_user_lambda15014, 1, Arg15013];
  var Arg15013_0 = Arg15013[0];
  return ((shenjs_globals["shen_shen-*special*"] = [shen_type_cons, Arg15013_0, (shenjs_globals["shen_shen-*special*"])]),
  Arg15013_0)},
  1,
  [],
  "specialise"];
shenjs_functions["shen_specialise"] = shen_specialise;






shen_unspecialise = [shen_type_func,
  function shen_user_lambda15016(Arg15015) {
  if (Arg15015.length < 1) return [shen_type_func, shen_user_lambda15016, 1, Arg15015];
  var Arg15015_0 = Arg15015[0];
  return ((shenjs_globals["shen_shen-*special*"] = shenjs_call(shen_remove, [Arg15015_0, (shenjs_globals["shen_shen-*special*"])])),
  Arg15015_0)},
  1,
  [],
  "unspecialise"];
shenjs_functions["shen_unspecialise"] = shen_unspecialise;












shen_load = [shen_type_func,
  function shen_user_lambda15019(Arg15018) {
  if (Arg15018.length < 1) return [shen_type_func, shen_user_lambda15019, 1, Arg15018];
  var Arg15018_0 = Arg15018[0];
  var R0, R1, R2;
  return (((R0 = shenjs_get_time([shen_type_symbol, "run"])),
  (R1 = shenjs_call(shen_load_help, [(shenjs_globals["shen_shen-*tc*"]), shenjs_call(shen_read_file, [Arg15018_0])])),
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
  function shen_user_lambda15021(Arg15020) {
  if (Arg15020.length < 2) return [shen_type_func, shen_user_lambda15021, 2, Arg15020];
  var Arg15020_0 = Arg15020[0], Arg15020_1 = Arg15020[1];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$(false, Arg15020_0)))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda15023(Arg15022) {
  if (Arg15022.length < 1) return [shen_type_func, shen_user_lambda15023, 1, Arg15022];
  var Arg15022_0 = Arg15022[0];
  return (function() {
  return shenjs_call_tail(shen_intoutput, ["~S~%", [shen_tuple, shenjs_call(shen_eval_without_macros, [Arg15022_0]), []]]);})},
  1,
  []], Arg15020_1]);})
  : ((R0 = shenjs_call(shen_mapcan, [[shen_type_func,
  function shen_user_lambda15025(Arg15024) {
  if (Arg15024.length < 1) return [shen_type_func, shen_user_lambda15025, 1, Arg15024];
  var Arg15024_0 = Arg15024[0];
  return (function() {
  return shenjs_call_tail(shen_remove_synonyms, [Arg15024_0]);})},
  1,
  []], Arg15020_1])),
  (R1 = shenjs_call(shen_mapcan, [[shen_type_func,
  function shen_user_lambda15027(Arg15026) {
  if (Arg15026.length < 1) return [shen_type_func, shen_user_lambda15027, 1, Arg15026];
  var Arg15026_0 = Arg15026[0];
  return (function() {
  return shenjs_call_tail(shen_typetable, [Arg15026_0]);})},
  1,
  []], R0])),
  shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15029(Arg15028) {
  if (Arg15028.length < 1) return [shen_type_func, shen_user_lambda15029, 1, Arg15028];
  var Arg15028_0 = Arg15028[0];
  return (function() {
  return shenjs_call_tail(shen_assumetype, [Arg15028_0]);})},
  1,
  []], R1]),
  (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15031(Arg15030) {
  if (Arg15030.length < 1) return [shen_type_func, shen_user_lambda15031, 1, Arg15030];
  var Arg15030_0 = Arg15030[0];
  return (function() {
  return shenjs_call_tail(shen_typecheck_and_load, [Arg15030_0]);})},
  1,
  []], R0]);}, [shen_type_func,
  function shen_user_lambda15033(Arg15032) {
  if (Arg15032.length < 2) return [shen_type_func, shen_user_lambda15033, 2, Arg15032];
  var Arg15032_0 = Arg15032[0], Arg15032_1 = Arg15032[1];
  return (function() {
  return shenjs_call_tail(shen_unwind_types, [Arg15032_1, Arg15032_0]);})},
  2,
  [R1]]);})))},
  2,
  [],
  "shen-load-help"];
shenjs_functions["shen_shen-load-help"] = shen_load_help;






shen_remove_synonyms = [shen_type_func,
  function shen_user_lambda15035(Arg15034) {
  if (Arg15034.length < 1) return [shen_type_func, shen_user_lambda15035, 1, Arg15034];
  var Arg15034_0 = Arg15034[0];
  return (((shenjs_is_type(Arg15034_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-synonyms-help"], Arg15034_0[1]))))
  ? (shenjs_call(shen_eval, [Arg15034_0]),
  [])
  : [shen_type_cons, Arg15034_0, []])},
  1,
  [],
  "shen-remove-synonyms"];
shenjs_functions["shen_shen-remove-synonyms"] = shen_remove_synonyms;






shen_typecheck_and_load = [shen_type_func,
  function shen_user_lambda15037(Arg15036) {
  if (Arg15036.length < 1) return [shen_type_func, shen_user_lambda15037, 1, Arg15036];
  var Arg15036_0 = Arg15036[0];
  return (shenjs_call(shen_nl, [1]),
  (function() {
  return shenjs_call_tail(shen_typecheck_and_evaluate, [Arg15036_0, shenjs_call(shen_gensym, [[shen_type_symbol, "A"]])]);}))},
  1,
  [],
  "shen-typecheck-and-load"];
shenjs_functions["shen_shen-typecheck-and-load"] = shen_typecheck_and_load;






shen_typetable = [shen_type_func,
  function shen_user_lambda15039(Arg15038) {
  if (Arg15038.length < 1) return [shen_type_func, shen_user_lambda15039, 1, Arg15038];
  var Arg15038_0 = Arg15038[0];
  var R0;
  return (((shenjs_is_type(Arg15038_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "define"], Arg15038_0[1])) && shenjs_is_type(Arg15038_0[2], shen_type_cons))))
  ? ((R0 = shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda15041(Arg15040) {
  if (Arg15040.length < 1) return [shen_type_func, shen_user_lambda15041, 1, Arg15040];
  var Arg15040_0 = Arg15040[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$sig$plus$rest$gt$, [Arg15040_0]);})},
  1,
  []], Arg15038_0[2][2], []])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["~A lacks a proper signature.~%", [shen_tuple, Arg15038_0[2][1], []]]);})
  : [shen_type_cons, [shen_type_cons, Arg15038_0[2][1], R0], []]))
  : [])},
  1,
  [],
  "shen-typetable"];
shenjs_functions["shen_shen-typetable"] = shen_typetable;






shen_assumetype = [shen_type_func,
  function shen_user_lambda15043(Arg15042) {
  if (Arg15042.length < 1) return [shen_type_func, shen_user_lambda15043, 1, Arg15042];
  var Arg15042_0 = Arg15042[0];
  return ((shenjs_is_type(Arg15042_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_declare, [Arg15042_0[1], Arg15042_0[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-assumetype"]]);}))},
  1,
  [],
  "shen-assumetype"];
shenjs_functions["shen_shen-assumetype"] = shen_assumetype;






shen_unwind_types = [shen_type_func,
  function shen_user_lambda15045(Arg15044) {
  if (Arg15044.length < 2) return [shen_type_func, shen_user_lambda15045, 2, Arg15044];
  var Arg15044_0 = Arg15044[0], Arg15044_1 = Arg15044[1];
  return ((shenjs_empty$question$(Arg15044_1))
  ? (function() {
  return shenjs_simple_error(shenjs_error_to_string(Arg15044_0));})
  : (((shenjs_is_type(Arg15044_1, shen_type_cons) && shenjs_is_type(Arg15044_1[1], shen_type_cons)))
  ? (shenjs_call(shen_remtype, [Arg15044_1[1][1]]),
  (function() {
  return shenjs_call_tail(shen_unwind_types, [Arg15044_0, Arg15044_1[2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-unwind-types"]]);})))},
  2,
  [],
  "shen-unwind-types"];
shenjs_functions["shen_shen-unwind-types"] = shen_unwind_types;






shen_remtype = [shen_type_func,
  function shen_user_lambda15047(Arg15046) {
  if (Arg15046.length < 1) return [shen_type_func, shen_user_lambda15047, 1, Arg15046];
  var Arg15046_0 = Arg15046[0];
  return ((shenjs_globals["shen_shen-*signedfuncs*"] = shenjs_call(shen_remove, [Arg15046_0, (shenjs_globals["shen_shen-*signedfuncs*"])])),
  Arg15046_0)},
  1,
  [],
  "shen-remtype"];
shenjs_functions["shen_shen-remtype"] = shen_remtype;






shen_$lt$sig$plus$rest$gt$ = [shen_type_func,
  function shen_user_lambda15049(Arg15048) {
  if (Arg15048.length < 1) return [shen_type_func, shen_user_lambda15049, 1, Arg15048];
  var Arg15048_0 = Arg15048[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$signature$gt$, [Arg15048_0])),
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
  function shen_user_lambda15051(Arg15050) {
  if (Arg15050.length < 2) return [shen_type_func, shen_user_lambda15051, 2, Arg15050];
  var Arg15050_0 = Arg15050[0], Arg15050_1 = Arg15050[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_intmake_string, ["~A~A", [shen_tuple, (shenjs_globals["shen_*home-directory*"]), [shen_tuple, Arg15050_0, []]]])),
  (R0 = shenjs_open([shen_type_symbol, "file"], R0, [shen_type_symbol, "out"])),
  (R1 = shenjs_call(shen_intmake_string, ["~S~%~%", [shen_tuple, Arg15050_1, []]])),
  shenjs_pr(R1, R0),
  shenjs_close(R0),
  Arg15050_1)},
  2,
  [],
  "write-to-file"];
shenjs_functions["shen_write-to-file"] = shen_write_to_file;












shen_macroexpand = [shen_type_func,
  function shen_user_lambda15054(Arg15053) {
  if (Arg15053.length < 1) return [shen_type_func, shen_user_lambda15054, 1, Arg15053];
  var Arg15053_0 = Arg15053[0];
  return (function() {
  return shenjs_call_tail(shen_compose, [(shenjs_globals["shen_*macros*"]), Arg15053_0]);})},
  1,
  [],
  "macroexpand"];
shenjs_functions["shen_macroexpand"] = shen_macroexpand;






shen_macroexpand = [shen_type_func,
  function shen_user_lambda15056(Arg15055) {
  if (Arg15055.length < 1) return [shen_type_func, shen_user_lambda15056, 1, Arg15055];
  var Arg15055_0 = Arg15055[0];
  var R0;
  return ((R0 = shenjs_call(shen_compose, [(shenjs_globals["shen_*macros*"]), Arg15055_0])),
  ((shenjs_unwind_tail(shenjs_$eq$(Arg15055_0, R0)))
  ? Arg15055_0
  : (function() {
  return shenjs_call_tail(shen_walk, [[shen_type_symbol, "macroexpand"], R0]);})))},
  1,
  [],
  "macroexpand"];
shenjs_functions["shen_macroexpand"] = shen_macroexpand;






(shenjs_globals["shen_*macros*"] = [shen_type_cons, [shen_type_symbol, "shen-timer-macro"], [shen_type_cons, [shen_type_symbol, "shen-cases-macro"], [shen_type_cons, [shen_type_symbol, "shen-abs-macro"], [shen_type_cons, [shen_type_symbol, "shen-put/get-macro"], [shen_type_cons, [shen_type_symbol, "shen-compile-macro"], [shen_type_cons, [shen_type_symbol, "shen-yacc-macro"], [shen_type_cons, [shen_type_symbol, "shen-datatype-macro"], [shen_type_cons, [shen_type_symbol, "shen-let-macro"], [shen_type_cons, [shen_type_symbol, "shen-assoc-macro"], [shen_type_cons, [shen_type_symbol, "shen-i/o-macro"], [shen_type_cons, [shen_type_symbol, "shen-prolog-macro"], [shen_type_cons, [shen_type_symbol, "shen-synonyms-macro"], [shen_type_cons, [shen_type_symbol, "shen-nl-macro"], [shen_type_cons, [shen_type_symbol, "shen-vector-macro"], [shen_type_cons, [shen_type_symbol, "shen-@s-macro"], [shen_type_cons, [shen_type_symbol, "shen-defmacro-macro"], [shen_type_cons, [shen_type_symbol, "shen-defprolog-macro"], [shen_type_cons, [shen_type_symbol, "shen-function-macro"], []]]]]]]]]]]]]]]]]]]);






shen_compose = [shen_type_func,
  function shen_user_lambda15059(Arg15058) {
  if (Arg15058.length < 2) return [shen_type_func, shen_user_lambda15059, 2, Arg15058];
  var Arg15058_0 = Arg15058[0], Arg15058_1 = Arg15058[1];
  return ((shenjs_empty$question$(Arg15058_0))
  ? Arg15058_1
  : ((shenjs_is_type(Arg15058_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_compose, [Arg15058_0[2], shenjs_call(Arg15058_0[1], [Arg15058_1])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-compose"]]);})))},
  2,
  [],
  "shen-compose"];
shenjs_functions["shen_shen-compose"] = shen_compose;






shen_compile_macro = [shen_type_func,
  function shen_user_lambda15061(Arg15060) {
  if (Arg15060.length < 1) return [shen_type_func, shen_user_lambda15061, 1, Arg15060];
  var Arg15060_0 = Arg15060[0];
  return (((shenjs_is_type(Arg15060_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "compile"], Arg15060_0[1])) && (shenjs_is_type(Arg15060_0[2], shen_type_cons) && (shenjs_is_type(Arg15060_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15060_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "compile"], [shen_type_cons, Arg15060_0[2][1], [shen_type_cons, Arg15060_0[2][2][1], [shen_type_cons, [], []]]]]
  : Arg15060_0)},
  1,
  [],
  "shen-compile-macro"];
shenjs_functions["shen_shen-compile-macro"] = shen_compile_macro;






shen_prolog_macro = [shen_type_func,
  function shen_user_lambda15063(Arg15062) {
  if (Arg15062.length < 1) return [shen_type_func, shen_user_lambda15063, 1, Arg15062];
  var Arg15062_0 = Arg15062[0];
  return (((shenjs_is_type(Arg15062_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "prolog?"], Arg15062_0[1]))))
  ? [shen_type_cons, [shen_type_symbol, "shen-intprolog"], [shen_type_cons, shenjs_call(shen_prolog_form, [Arg15062_0[2]]), []]]
  : Arg15062_0)},
  1,
  [],
  "shen-prolog-macro"];
shenjs_functions["shen_shen-prolog-macro"] = shen_prolog_macro;






shen_defprolog_macro = [shen_type_func,
  function shen_user_lambda15065(Arg15064) {
  if (Arg15064.length < 1) return [shen_type_func, shen_user_lambda15065, 1, Arg15064];
  var Arg15064_0 = Arg15064[0];
  return (((shenjs_is_type(Arg15064_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defprolog"], Arg15064_0[1])) && shenjs_is_type(Arg15064_0[2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_compile, [[shen_type_func,
  function shen_user_lambda15067(Arg15066) {
  if (Arg15066.length < 1) return [shen_type_func, shen_user_lambda15067, 1, Arg15066];
  var Arg15066_0 = Arg15066[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$defprolog$gt$, [Arg15066_0]);})},
  1,
  []], Arg15064_0[2], [shen_type_func,
  function shen_user_lambda15069(Arg15068) {
  if (Arg15068.length < 2) return [shen_type_func, shen_user_lambda15069, 2, Arg15068];
  var Arg15068_0 = Arg15068[0], Arg15068_1 = Arg15068[1];
  return (function() {
  return shenjs_call_tail(shen_prolog_error, [Arg15068_0[2][1], Arg15068_1]);})},
  2,
  [Arg15064_0]]]);})
  : Arg15064_0)},
  1,
  [],
  "shen-defprolog-macro"];
shenjs_functions["shen_shen-defprolog-macro"] = shen_defprolog_macro;






shen_prolog_form = [shen_type_func,
  function shen_user_lambda15071(Arg15070) {
  if (Arg15070.length < 1) return [shen_type_func, shen_user_lambda15071, 1, Arg15070];
  var Arg15070_0 = Arg15070[0];
  return (function() {
  return shenjs_call_tail(shen_cons$_form, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15073(Arg15072) {
  if (Arg15072.length < 1) return [shen_type_func, shen_user_lambda15073, 1, Arg15072];
  var Arg15072_0 = Arg15072[0];
  return (function() {
  return shenjs_call_tail(shen_cons$_form, [Arg15072_0]);})},
  1,
  []], Arg15070_0])]);})},
  1,
  [],
  "shen-prolog-form"];
shenjs_functions["shen_shen-prolog-form"] = shen_prolog_form;






shen_datatype_macro = [shen_type_func,
  function shen_user_lambda15075(Arg15074) {
  if (Arg15074.length < 1) return [shen_type_func, shen_user_lambda15075, 1, Arg15074];
  var Arg15074_0 = Arg15074[0];
  return (((shenjs_is_type(Arg15074_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "datatype"], Arg15074_0[1])) && shenjs_is_type(Arg15074_0[2], shen_type_cons))))
  ? [shen_type_cons, [shen_type_symbol, "shen-process-datatype"], [shen_type_cons, Arg15074_0[2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "compile"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "function"], [shen_type_cons, [shen_type_symbol, "shen-<datatype-rules>"], []]], [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg15074_0[2][2]]), [shen_type_cons, [shen_type_cons, [shen_type_symbol, "function"], [shen_type_cons, [shen_type_symbol, "shen-datatype-error"], []]], []]]]], []]]]
  : Arg15074_0)},
  1,
  [],
  "shen-datatype-macro"];
shenjs_functions["shen_shen-datatype-macro"] = shen_datatype_macro;






shen_defmacro_macro = [shen_type_func,
  function shen_user_lambda15077(Arg15076) {
  if (Arg15076.length < 1) return [shen_type_func, shen_user_lambda15077, 1, Arg15076];
  var Arg15076_0 = Arg15076[0];
  var R0, R1;
  return (((shenjs_is_type(Arg15076_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defmacro"], Arg15076_0[1])) && shenjs_is_type(Arg15076_0[2], shen_type_cons))))
  ? ((R0 = shenjs_call(shen_compile, [[shen_type_symbol, "shen-<defmacro>"], Arg15076_0[2], []])),
  (R1 = [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "*macros*"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "adjoin"], [shen_type_cons, Arg15076_0[2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "*macros*"], []]], []]]], []]]], [shen_type_cons, [shen_type_symbol, "macro"], []]]]),
  (R1 = [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, [shen_type_symbol, "null"], [shen_type_cons, [], [shen_type_cons, R1, [shen_type_cons, R0, []]]]]]),
  R1)
  : Arg15076_0)},
  1,
  [],
  "shen-defmacro-macro"];
shenjs_functions["shen_shen-defmacro-macro"] = shen_defmacro_macro;






shen_defmacro_macro = [shen_type_func,
  function shen_user_lambda15079(Arg15078) {
  if (Arg15078.length < 1) return [shen_type_func, shen_user_lambda15079, 1, Arg15078];
  var Arg15078_0 = Arg15078[0];
  var R0, R1;
  return (((shenjs_is_type(Arg15078_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defmacro"], Arg15078_0[1])) && shenjs_is_type(Arg15078_0[2], shen_type_cons))))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg15078_0[2][1], shenjs_call(shen_append, [Arg15078_0[2][2], [shen_type_cons, [shen_type_symbol, "X"], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_symbol, "X"], []]]]])]]),
  (R1 = [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "*macros*"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "adjoin"], [shen_type_cons, Arg15078_0[2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "*macros*"], []]], []]]], []]]], [shen_type_cons, [shen_type_symbol, "macro"], []]]]),
  (R1 = [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, [shen_type_symbol, "null"], [shen_type_cons, [], [shen_type_cons, R1, [shen_type_cons, R0, []]]]]]),
  R1)
  : Arg15078_0)},
  1,
  [],
  "shen-defmacro-macro"];
shenjs_functions["shen_shen-defmacro-macro"] = shen_defmacro_macro;






shen_$lt$defmacro$gt$ = [shen_type_func,
  function shen_user_lambda15081(Arg15080) {
  if (Arg15080.length < 1) return [shen_type_func, shen_user_lambda15081, 1, Arg15080];
  var Arg15080_0 = Arg15080[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$name$gt$, [Arg15080_0])),
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
  function shen_user_lambda15083(Arg15082) {
  if (Arg15082.length < 1) return [shen_type_func, shen_user_lambda15083, 1, Arg15082];
  var Arg15082_0 = Arg15082[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$macrorule$gt$, [Arg15082_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$macrorules$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_append, [shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])])])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$macrorule$gt$, [Arg15082_0])),
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
  function shen_user_lambda15085(Arg15084) {
  if (Arg15084.length < 1) return [shen_type_func, shen_user_lambda15085, 1, Arg15084];
  var Arg15084_0 = Arg15084[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg15084_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg15084_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "->"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$macroaction$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_append, [shenjs_call(shen_snd, [R0]), [shen_type_cons, [shen_type_symbol, "->"], shenjs_call(shen_snd, [R1])]])])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg15084_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg15084_0])),
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
  function shen_user_lambda15087(Arg15086) {
  if (Arg15086.length < 1) return [shen_type_func, shen_user_lambda15087, 1, Arg15086];
  var Arg15086_0 = Arg15086[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$action$gt$, [Arg15086_0])),
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
  function shen_user_lambda15089(Arg15088) {
  if (Arg15088.length < 1) return [shen_type_func, shen_user_lambda15089, 1, Arg15088];
  var Arg15088_0 = Arg15088[0];
  var R0;
  return (((shenjs_is_type(Arg15088_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], Arg15088_0[1])) && (shenjs_is_type(Arg15088_0[2], shen_type_cons) && (shenjs_is_type(Arg15088_0[2][2], shen_type_cons) && shenjs_is_type(Arg15088_0[2][2][2], shen_type_cons))))))
  ? [shen_type_cons, [shen_type_symbol, "@s"], [shen_type_cons, Arg15088_0[2][1], [shen_type_cons, shenjs_call(shen_$at$s_macro, [[shen_type_cons, [shen_type_symbol, "@s"], Arg15088_0[2][2]]]), []]]]
  : (((shenjs_is_type(Arg15088_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], Arg15088_0[1])) && (shenjs_is_type(Arg15088_0[2], shen_type_cons) && (shenjs_is_type(Arg15088_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg15088_0[2][2][2]) && (typeof(Arg15088_0[2][1]) == 'string')))))))
  ? ((R0 = shenjs_call(shen_explode, [Arg15088_0[2][1]])),
  (((shenjs_call(shen_length, [R0]) > 1))
  ? (function() {
  return shenjs_call_tail(shen_$at$s_macro, [[shen_type_cons, [shen_type_symbol, "@s"], shenjs_call(shen_append, [R0, Arg15088_0[2][2]])]]);})
  : Arg15088_0))
  : Arg15088_0))},
  1,
  [],
  "shen-@s-macro"];
shenjs_functions["shen_shen-@s-macro"] = shen_$at$s_macro;






shen_synonyms_macro = [shen_type_func,
  function shen_user_lambda15091(Arg15090) {
  if (Arg15090.length < 1) return [shen_type_func, shen_user_lambda15091, 1, Arg15090];
  var Arg15090_0 = Arg15090[0];
  return (((shenjs_is_type(Arg15090_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "synonyms"], Arg15090_0[1]))))
  ? [shen_type_cons, [shen_type_symbol, "shen-synonyms-help"], [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg15090_0[2]]), []]]
  : Arg15090_0)},
  1,
  [],
  "shen-synonyms-macro"];
shenjs_functions["shen_shen-synonyms-macro"] = shen_synonyms_macro;






shen_nl_macro = [shen_type_func,
  function shen_user_lambda15093(Arg15092) {
  if (Arg15092.length < 1) return [shen_type_func, shen_user_lambda15093, 1, Arg15092];
  var Arg15092_0 = Arg15092[0];
  return (((shenjs_is_type(Arg15092_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "nl"], Arg15092_0[1])) && shenjs_empty$question$(Arg15092_0[2]))))
  ? [shen_type_cons, [shen_type_symbol, "nl"], [shen_type_cons, 1, []]]
  : Arg15092_0)},
  1,
  [],
  "shen-nl-macro"];
shenjs_functions["shen_shen-nl-macro"] = shen_nl_macro;






shen_vector_macro = [shen_type_func,
  function shen_user_lambda15095(Arg15094) {
  if (Arg15094.length < 1) return [shen_type_func, shen_user_lambda15095, 1, Arg15094];
  var Arg15094_0 = Arg15094[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(shenjs_vector(0), Arg15094_0)))
  ? [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 0, []]]
  : Arg15094_0)},
  1,
  [],
  "shen-vector-macro"];
shenjs_functions["shen_shen-vector-macro"] = shen_vector_macro;






shen_yacc_macro = [shen_type_func,
  function shen_user_lambda15097(Arg15096) {
  if (Arg15096.length < 1) return [shen_type_func, shen_user_lambda15097, 1, Arg15096];
  var Arg15096_0 = Arg15096[0];
  return (((shenjs_is_type(Arg15096_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defcc"], Arg15096_0[1])) && shenjs_is_type(Arg15096_0[2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_yacc_$gt$shen, [Arg15096_0[2][1], Arg15096_0[2][2], shenjs_call(shen_extract_segvars, [Arg15096_0[2][2]])]);})
  : Arg15096_0)},
  1,
  [],
  "shen-yacc-macro"];
shenjs_functions["shen_shen-yacc-macro"] = shen_yacc_macro;






shen_assoc_macro = [shen_type_func,
  function shen_user_lambda15099(Arg15098) {
  if (Arg15098.length < 1) return [shen_type_func, shen_user_lambda15099, 1, Arg15098];
  var Arg15098_0 = Arg15098[0];
  return (((shenjs_is_type(Arg15098_0, shen_type_cons) && (shenjs_is_type(Arg15098_0[2], shen_type_cons) && (shenjs_is_type(Arg15098_0[2][2], shen_type_cons) && (shenjs_is_type(Arg15098_0[2][2][2], shen_type_cons) && shenjs_call(shen_element$question$, [Arg15098_0[1], [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "append"], [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "or"], [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, [shen_type_symbol, "do"], []]]]]]]]]]))))))
  ? [shen_type_cons, Arg15098_0[1], [shen_type_cons, Arg15098_0[2][1], [shen_type_cons, shenjs_call(shen_assoc_macro, [[shen_type_cons, Arg15098_0[1], Arg15098_0[2][2]]]), []]]]
  : Arg15098_0)},
  1,
  [],
  "shen-assoc-macro"];
shenjs_functions["shen_shen-assoc-macro"] = shen_assoc_macro;






shen_let_macro = [shen_type_func,
  function shen_user_lambda15101(Arg15100) {
  if (Arg15100.length < 1) return [shen_type_func, shen_user_lambda15101, 1, Arg15100];
  var Arg15100_0 = Arg15100[0];
  return (((shenjs_is_type(Arg15100_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg15100_0[1])) && (shenjs_is_type(Arg15100_0[2], shen_type_cons) && (shenjs_is_type(Arg15100_0[2][2], shen_type_cons) && (shenjs_is_type(Arg15100_0[2][2][2], shen_type_cons) && shenjs_is_type(Arg15100_0[2][2][2][2], shen_type_cons)))))))
  ? [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, Arg15100_0[2][1], [shen_type_cons, Arg15100_0[2][2][1], [shen_type_cons, shenjs_call(shen_let_macro, [[shen_type_cons, [shen_type_symbol, "let"], Arg15100_0[2][2][2]]]), []]]]]
  : Arg15100_0)},
  1,
  [],
  "shen-let-macro"];
shenjs_functions["shen_shen-let-macro"] = shen_let_macro;






shen_abs_macro = [shen_type_func,
  function shen_user_lambda15103(Arg15102) {
  if (Arg15102.length < 1) return [shen_type_func, shen_user_lambda15103, 1, Arg15102];
  var Arg15102_0 = Arg15102[0];
  return (((shenjs_is_type(Arg15102_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg15102_0[1])) && (shenjs_is_type(Arg15102_0[2], shen_type_cons) && (shenjs_is_type(Arg15102_0[2][2], shen_type_cons) && shenjs_is_type(Arg15102_0[2][2][2], shen_type_cons))))))
  ? [shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, Arg15102_0[2][1], [shen_type_cons, shenjs_call(shen_abs_macro, [[shen_type_cons, [shen_type_symbol, "/."], Arg15102_0[2][2]]]), []]]]
  : (((shenjs_is_type(Arg15102_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg15102_0[1])) && (shenjs_is_type(Arg15102_0[2], shen_type_cons) && (shenjs_is_type(Arg15102_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15102_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "lambda"], Arg15102_0[2]]
  : Arg15102_0))},
  1,
  [],
  "shen-abs-macro"];
shenjs_functions["shen_shen-abs-macro"] = shen_abs_macro;






shen_cases_macro = [shen_type_func,
  function shen_user_lambda15105(Arg15104) {
  if (Arg15104.length < 1) return [shen_type_func, shen_user_lambda15105, 1, Arg15104];
  var Arg15104_0 = Arg15104[0];
  return (((shenjs_is_type(Arg15104_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cases"], Arg15104_0[1])) && (shenjs_is_type(Arg15104_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg15104_0[2][1])) && shenjs_is_type(Arg15104_0[2][2], shen_type_cons))))))
  ? Arg15104_0[2][2][1]
  : (((shenjs_is_type(Arg15104_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cases"], Arg15104_0[1])) && (shenjs_is_type(Arg15104_0[2], shen_type_cons) && (shenjs_is_type(Arg15104_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15104_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, Arg15104_0[2][1], [shen_type_cons, Arg15104_0[2][2][1], [shen_type_cons, shenjs_call(shen_i$slash$o_macro, [[shen_type_cons, [shen_type_symbol, "error"], [shen_type_cons, "error: cases exhausted~%", []]]]), []]]]]
  : (((shenjs_is_type(Arg15104_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cases"], Arg15104_0[1])) && (shenjs_is_type(Arg15104_0[2], shen_type_cons) && shenjs_is_type(Arg15104_0[2][2], shen_type_cons)))))
  ? [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, Arg15104_0[2][1], [shen_type_cons, Arg15104_0[2][2][1], [shen_type_cons, shenjs_call(shen_cases_macro, [[shen_type_cons, [shen_type_symbol, "cases"], Arg15104_0[2][2][2]]]), []]]]]
  : (((shenjs_is_type(Arg15104_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cases"], Arg15104_0[1])) && (shenjs_is_type(Arg15104_0[2], shen_type_cons) && shenjs_empty$question$(Arg15104_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["error: odd number of case elements~%", []]);})
  : Arg15104_0))))},
  1,
  [],
  "shen-cases-macro"];
shenjs_functions["shen_shen-cases-macro"] = shen_cases_macro;






shen_timer_macro = [shen_type_func,
  function shen_user_lambda15107(Arg15106) {
  if (Arg15106.length < 1) return [shen_type_func, shen_user_lambda15107, 1, Arg15106];
  var Arg15106_0 = Arg15106[0];
  return (((shenjs_is_type(Arg15106_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "time"], Arg15106_0[1])) && (shenjs_is_type(Arg15106_0[2], shen_type_cons) && shenjs_empty$question$(Arg15106_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_let_macro, [[shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Start"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "run"], []]], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg15106_0[2][1], [shen_type_cons, [shen_type_symbol, "Finish"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "run"], []]], [shen_type_cons, [shen_type_symbol, "Time"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_symbol, "Finish"], [shen_type_cons, [shen_type_symbol, "Start"], []]]], [shen_type_cons, [shen_type_symbol, "Message"], [shen_type_cons, shenjs_call(shen_i$slash$o_macro, [[shen_type_cons, [shen_type_symbol, "output"], [shen_type_cons, "~%run time: ~A secs~%", [shen_type_cons, [shen_type_symbol, "Time"], []]]]]), [shen_type_cons, [shen_type_symbol, "Result"], []]]]]]]]]]]]]]);})
  : Arg15106_0)},
  1,
  [],
  "shen-timer-macro"];
shenjs_functions["shen_shen-timer-macro"] = shen_timer_macro;






shen_i$slash$o_macro = [shen_type_func,
  function shen_user_lambda15109(Arg15108) {
  if (Arg15108.length < 1) return [shen_type_func, shen_user_lambda15109, 1, Arg15108];
  var Arg15108_0 = Arg15108[0];
  return (((shenjs_is_type(Arg15108_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "output"], Arg15108_0[1])) && shenjs_is_type(Arg15108_0[2], shen_type_cons))))
  ? [shen_type_cons, [shen_type_symbol, "intoutput"], [shen_type_cons, Arg15108_0[2][1], [shen_type_cons, shenjs_call(shen_tuple_up, [Arg15108_0[2][2]]), []]]]
  : (((shenjs_is_type(Arg15108_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "make-string"], Arg15108_0[1])) && shenjs_is_type(Arg15108_0[2], shen_type_cons))))
  ? [shen_type_cons, [shen_type_symbol, "intmake-string"], [shen_type_cons, Arg15108_0[2][1], [shen_type_cons, shenjs_call(shen_tuple_up, [Arg15108_0[2][2]]), []]]]
  : (((shenjs_is_type(Arg15108_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "error"], Arg15108_0[1])) && shenjs_is_type(Arg15108_0[2], shen_type_cons))))
  ? [shen_type_cons, [shen_type_symbol, "interror"], [shen_type_cons, Arg15108_0[2][1], [shen_type_cons, shenjs_call(shen_tuple_up, [Arg15108_0[2][2]]), []]]]
  : (((shenjs_is_type(Arg15108_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "pr"], Arg15108_0[1])) && (shenjs_is_type(Arg15108_0[2], shen_type_cons) && shenjs_empty$question$(Arg15108_0[2][2])))))
  ? [shen_type_cons, [shen_type_symbol, "pr"], [shen_type_cons, Arg15108_0[2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-stoutput"], [shen_type_cons, 0, []]], []]]]
  : (((shenjs_is_type(Arg15108_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "read-byte"], Arg15108_0[1])) && shenjs_empty$question$(Arg15108_0[2]))))
  ? [shen_type_cons, [shen_type_symbol, "read-byte"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "stinput"], [shen_type_cons, 0, []]], []]]
  : Arg15108_0)))))},
  1,
  [],
  "shen-i/o-macro"];
shenjs_functions["shen_shen-i/o-macro"] = shen_i$slash$o_macro;






shen_tuple_up = [shen_type_func,
  function shen_user_lambda15111(Arg15110) {
  if (Arg15110.length < 1) return [shen_type_func, shen_user_lambda15111, 1, Arg15110];
  var Arg15110_0 = Arg15110[0];
  return ((shenjs_is_type(Arg15110_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, Arg15110_0[1], [shen_type_cons, shenjs_call(shen_tuple_up, [Arg15110_0[2]]), []]]]
  : Arg15110_0)},
  1,
  [],
  "shen-tuple-up"];
shenjs_functions["shen_shen-tuple-up"] = shen_tuple_up;






shen_put$slash$get_macro = [shen_type_func,
  function shen_user_lambda15113(Arg15112) {
  if (Arg15112.length < 1) return [shen_type_func, shen_user_lambda15113, 1, Arg15112];
  var Arg15112_0 = Arg15112[0];
  return (((shenjs_is_type(Arg15112_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "put"], Arg15112_0[1])) && (shenjs_is_type(Arg15112_0[2], shen_type_cons) && (shenjs_is_type(Arg15112_0[2][2], shen_type_cons) && (shenjs_is_type(Arg15112_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg15112_0[2][2][2][2])))))))
  ? [shen_type_cons, [shen_type_symbol, "put"], [shen_type_cons, Arg15112_0[2][1], [shen_type_cons, Arg15112_0[2][2][1], [shen_type_cons, Arg15112_0[2][2][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*property-vector*"], []]], []]]]]]
  : (((shenjs_is_type(Arg15112_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "get"], Arg15112_0[1])) && (shenjs_is_type(Arg15112_0[2], shen_type_cons) && (shenjs_is_type(Arg15112_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg15112_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "get"], [shen_type_cons, Arg15112_0[2][1], [shen_type_cons, Arg15112_0[2][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*property-vector*"], []]], []]]]]
  : Arg15112_0))},
  1,
  [],
  "shen-put/get-macro"];
shenjs_functions["shen_shen-put/get-macro"] = shen_put$slash$get_macro;






shen_function_macro = [shen_type_func,
  function shen_user_lambda15115(Arg15114) {
  if (Arg15114.length < 1) return [shen_type_func, shen_user_lambda15115, 1, Arg15114];
  var Arg15114_0 = Arg15114[0];
  return (((shenjs_is_type(Arg15114_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "function"], Arg15114_0[1])) && (shenjs_is_type(Arg15114_0[2], shen_type_cons) && shenjs_empty$question$(Arg15114_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_function_abstraction, [Arg15114_0[2][1], shenjs_call(shen_arity, [Arg15114_0[2][1]])]);})
  : Arg15114_0)},
  1,
  [],
  "shen-function-macro"];
shenjs_functions["shen_shen-function-macro"] = shen_function_macro;






shen_function_abstraction = [shen_type_func,
  function shen_user_lambda15117(Arg15116) {
  if (Arg15116.length < 2) return [shen_type_func, shen_user_lambda15117, 2, Arg15116];
  var Arg15116_0 = Arg15116[0], Arg15116_1 = Arg15116[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg15116_1)))
  ? [shen_type_cons, [shen_type_symbol, "freeze"], [shen_type_cons, Arg15116_0, []]]
  : ((shenjs_unwind_tail(shenjs_$eq$(-1, Arg15116_1)))
  ? Arg15116_0
  : (function() {
  return shenjs_call_tail(shen_function_abstraction_help, [Arg15116_0, Arg15116_1, []]);})))},
  2,
  [],
  "shen-function-abstraction"];
shenjs_functions["shen_shen-function-abstraction"] = shen_function_abstraction;






shen_function_abstraction_help = [shen_type_func,
  function shen_user_lambda15119(Arg15118) {
  if (Arg15118.length < 3) return [shen_type_func, shen_user_lambda15119, 3, Arg15118];
  var Arg15118_0 = Arg15118[0], Arg15118_1 = Arg15118[1], Arg15118_2 = Arg15118[2];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg15118_1)))
  ? [shen_type_cons, Arg15118_0, Arg15118_2]
  : ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, R0, [shen_type_cons, shenjs_call(shen_function_abstraction_help, [Arg15118_0, (Arg15118_1 - 1), shenjs_call(shen_append, [Arg15118_2, [shen_type_cons, R0, []]])]), []]]]))},
  3,
  [],
  "shen-function-abstraction-help"];
shenjs_functions["shen_shen-function-abstraction-help"] = shen_function_abstraction_help;












shen_declare = [shen_type_func,
  function shen_user_lambda16475(Arg16474) {
  if (Arg16474.length < 2) return [shen_type_func, shen_user_lambda16475, 2, Arg16474];
  var Arg16474_0 = Arg16474[0], Arg16474_1 = Arg16474[1];
  var R0, R1, R2;
  return ((shenjs_globals["shen_shen-*signedfuncs*"] = shenjs_call(shen_adjoin, [Arg16474_0, (shenjs_globals["shen_shen-*signedfuncs*"])])),
  shenjs_trap_error(function() {return shenjs_call(shen_variancy_test, [Arg16474_0, Arg16474_1]);}, [shen_type_func,
  function shen_user_lambda16477(Arg16476) {
  if (Arg16476.length < 1) return [shen_type_func, shen_user_lambda16477, 1, Arg16476];
  var Arg16476_0 = Arg16476[0];
  return [shen_type_symbol, "shen-skip"]},
  1,
  []]),
  (R0 = shenjs_call(shen_rcons$_form, [shenjs_call(shen_normalise_type, [Arg16474_1])])),
  (R1 = shenjs_call(shen_concat, [[shen_type_symbol, "shen-type-signature-of-"], Arg16474_0])),
  (R2 = shenjs_call(shen_parameters, [1])),
  (R0 = [shen_type_cons, [shen_type_cons, R1, [shen_type_cons, [shen_type_symbol, "X"], []]], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "unify!"], [shen_type_cons, [shen_type_symbol, "X"], [shen_type_cons, R0, []]]], []], []]]]),
  (R0 = shenjs_call(shen_aum, [R0, R2])),
  (R0 = shenjs_call(shen_aum$_to$_shen, [R0])),
  (R2 = [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, R1, shenjs_call(shen_append, [R2, shenjs_call(shen_append, [[shen_type_cons, [shen_type_symbol, "ProcessN"], [shen_type_cons, [shen_type_symbol, "Continuation"], []]], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, R0, []]]])])]]),
  shenjs_call(shen_eval_without_macros, [R2]),
  Arg16474_0)},
  2,
  [],
  "declare"];
shenjs_functions["shen_declare"] = shen_declare;






shen_normalise_type = [shen_type_func,
  function shen_user_lambda16479(Arg16478) {
  if (Arg16478.length < 1) return [shen_type_func, shen_user_lambda16479, 1, Arg16478];
  var Arg16478_0 = Arg16478[0];
  return (function() {
  return shenjs_call_tail(shen_fix, [[shen_type_func,
  function shen_user_lambda16481(Arg16480) {
  if (Arg16480.length < 1) return [shen_type_func, shen_user_lambda16481, 1, Arg16480];
  var Arg16480_0 = Arg16480[0];
  return (function() {
  return shenjs_call_tail(shen_normalise_type_help, [Arg16480_0]);})},
  1,
  []], Arg16478_0]);})},
  1,
  [],
  "shen-normalise-type"];
shenjs_functions["shen_shen-normalise-type"] = shen_normalise_type;






shen_normalise_type_help = [shen_type_func,
  function shen_user_lambda16483(Arg16482) {
  if (Arg16482.length < 1) return [shen_type_func, shen_user_lambda16483, 1, Arg16482];
  var Arg16482_0 = Arg16482[0];
  return ((shenjs_is_type(Arg16482_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_normalise_X, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda16485(Arg16484) {
  if (Arg16484.length < 1) return [shen_type_func, shen_user_lambda16485, 1, Arg16484];
  var Arg16484_0 = Arg16484[0];
  return (function() {
  return shenjs_call_tail(shen_normalise_type_help, [Arg16484_0]);})},
  1,
  []], Arg16482_0])]);})
  : (function() {
  return shenjs_call_tail(shen_normalise_X, [Arg16482_0]);}))},
  1,
  [],
  "shen-normalise-type-help"];
shenjs_functions["shen_shen-normalise-type-help"] = shen_normalise_type_help;






shen_normalise_X = [shen_type_func,
  function shen_user_lambda16487(Arg16486) {
  if (Arg16486.length < 1) return [shen_type_func, shen_user_lambda16487, 1, Arg16486];
  var Arg16486_0 = Arg16486[0];
  var R0;
  return ((R0 = shenjs_call(shen_assoc, [Arg16486_0, (shenjs_globals["shen_shen-*synonyms*"])])),
  ((shenjs_empty$question$(R0))
  ? Arg16486_0
  : R0[2]))},
  1,
  [],
  "shen-normalise-X"];
shenjs_functions["shen_shen-normalise-X"] = shen_normalise_X;






shen_variancy_test = [shen_type_func,
  function shen_user_lambda16489(Arg16488) {
  if (Arg16488.length < 2) return [shen_type_func, shen_user_lambda16489, 2, Arg16488];
  var Arg16488_0 = Arg16488[0], Arg16488_1 = Arg16488[1];
  var R0;
  return ((R0 = shenjs_call(shen_typecheck, [Arg16488_0, [shen_type_symbol, "B"]])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R0)))
  ? [shen_type_symbol, "shen-skip"]
  : ((shenjs_call(shen_variant$question$, [R0, Arg16488_1]))
  ? [shen_type_symbol, "shen-skip"]
  : shenjs_call(shen_intoutput, ["warning: changing the type of ~A may create errors~%", [shen_tuple, Arg16488_0, []]]))),
  [shen_type_symbol, "shen-skip"])},
  2,
  [],
  "shen-variancy-test"];
shenjs_functions["shen_shen-variancy-test"] = shen_variancy_test;






shen_variant$question$ = [shen_type_func,
  function shen_user_lambda16491(Arg16490) {
  if (Arg16490.length < 2) return [shen_type_func, shen_user_lambda16491, 2, Arg16490];
  var Arg16490_0 = Arg16490[0], Arg16490_1 = Arg16490[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg16490_1, Arg16490_0)))
  ? true
  : (((shenjs_is_type(Arg16490_0, shen_type_cons) && (shenjs_is_type(Arg16490_1, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg16490_1[1], Arg16490_0[1])))))
  ? (function() {
  return shenjs_call_tail(shen_variant$question$, [Arg16490_0[2], Arg16490_1[2]]);})
  : (((shenjs_is_type(Arg16490_0, shen_type_cons) && (shenjs_is_type(Arg16490_1, shen_type_cons) && (shenjs_call(shen_pvar$question$, [Arg16490_0[1]]) && shenjs_call(shen_variable$question$, [Arg16490_1[1]])))))
  ? (function() {
  return shenjs_call_tail(shen_variant$question$, [shenjs_call(shen_subst, [[shen_type_symbol, "shen-a"], Arg16490_0[1], Arg16490_0[2]]), shenjs_call(shen_subst, [[shen_type_symbol, "shen-a"], Arg16490_1[1], Arg16490_1[2]])]);})
  : (((shenjs_is_type(Arg16490_0, shen_type_cons) && (shenjs_is_type(Arg16490_0[1], shen_type_cons) && (shenjs_is_type(Arg16490_1, shen_type_cons) && shenjs_is_type(Arg16490_1[1], shen_type_cons)))))
  ? (function() {
  return shenjs_call_tail(shen_variant$question$, [shenjs_call(shen_append, [Arg16490_0[1], Arg16490_0[2]]), shenjs_call(shen_append, [Arg16490_1[1], Arg16490_1[2]])]);})
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
  function shen_user_lambda16032(Arg16031) {
  if (Arg16031.length < 2) return [shen_type_func, shen_user_lambda16032, 2, Arg16031];
  var Arg16031_0 = Arg16031[0], Arg16031_1 = Arg16031[1];
  var R0, R1, R2, R3;
  return ((R0 = shenjs_call(shen_curry, [Arg16031_0])),
  (R1 = shenjs_call(shen_start_new_prolog_process, [])),
  (R2 = shenjs_call(shen_insert_prolog_variables, [shenjs_call(shen_normalise_type, [shenjs_call(shen_curry_type, [Arg16031_1])]), R1])),
  (R3 = (new Shenjs_freeze([R0, R2, R1], function(Arg16033) {
  var Arg16033_0 = Arg16033[0], Arg16033_1 = Arg16033[1], Arg16033_2 = Arg16033[2];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_return, [Arg16033_1, Arg16033_2, [shen_type_symbol, "shen-void"]]);});})}))),
  (function() {
  return shenjs_call_tail(shen_th$asterisk$, [R0, R2, [], R1, R3]);}))},
  2,
  [],
  "shen-typecheck"];
shenjs_functions["shen_shen-typecheck"] = shen_typecheck;






shen_curry = [shen_type_func,
  function shen_user_lambda16036(Arg16035) {
  if (Arg16035.length < 1) return [shen_type_func, shen_user_lambda16036, 1, Arg16035];
  var Arg16035_0 = Arg16035[0];
  return (((shenjs_is_type(Arg16035_0, shen_type_cons) && shenjs_call(shen_special$question$, [Arg16035_0[1]])))
  ? [shen_type_cons, Arg16035_0[1], shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda16038(Arg16037) {
  if (Arg16037.length < 1) return [shen_type_func, shen_user_lambda16038, 1, Arg16037];
  var Arg16037_0 = Arg16037[0];
  return (function() {
  return shenjs_call_tail(shen_curry, [Arg16037_0]);})},
  1,
  []], Arg16035_0[2]])]
  : (((shenjs_is_type(Arg16035_0, shen_type_cons) && (shenjs_is_type(Arg16035_0[2], shen_type_cons) && shenjs_call(shen_extraspecial$question$, [Arg16035_0[1]]))))
  ? Arg16035_0
  : (((shenjs_is_type(Arg16035_0, shen_type_cons) && (shenjs_is_type(Arg16035_0[2], shen_type_cons) && shenjs_is_type(Arg16035_0[2][2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_curry, [[shen_type_cons, [shen_type_cons, Arg16035_0[1], [shen_type_cons, Arg16035_0[2][1], []]], Arg16035_0[2][2]]]);})
  : (((shenjs_is_type(Arg16035_0, shen_type_cons) && (shenjs_is_type(Arg16035_0[2], shen_type_cons) && shenjs_empty$question$(Arg16035_0[2][2]))))
  ? [shen_type_cons, shenjs_call(shen_curry, [Arg16035_0[1]]), [shen_type_cons, shenjs_call(shen_curry, [Arg16035_0[2][1]]), []]]
  : Arg16035_0))))},
  1,
  [],
  "shen-curry"];
shenjs_functions["shen_shen-curry"] = shen_curry;






shen_special$question$ = [shen_type_func,
  function shen_user_lambda16040(Arg16039) {
  if (Arg16039.length < 1) return [shen_type_func, shen_user_lambda16040, 1, Arg16039];
  var Arg16039_0 = Arg16039[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg16039_0, (shenjs_globals["shen_shen-*special*"])]);})},
  1,
  [],
  "shen-special?"];
shenjs_functions["shen_shen-special?"] = shen_special$question$;






shen_extraspecial$question$ = [shen_type_func,
  function shen_user_lambda16042(Arg16041) {
  if (Arg16041.length < 1) return [shen_type_func, shen_user_lambda16042, 1, Arg16041];
  var Arg16041_0 = Arg16041[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg16041_0, (shenjs_globals["shen_shen-*extraspecial*"])]);})},
  1,
  [],
  "shen-extraspecial?"];
shenjs_functions["shen_shen-extraspecial?"] = shen_extraspecial$question$;






shen_t$asterisk$ = [shen_type_func,
  function shen_user_lambda16044(Arg16043) {
  if (Arg16043.length < 4) return [shen_type_func, shen_user_lambda16044, 4, Arg16043];
  var Arg16043_0 = Arg16043[0], Arg16043_1 = Arg16043[1], Arg16043_2 = Arg16043[2], Arg16043_3 = Arg16043[3];
  var R0, R1, R2, R3;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = ((R1 = shenjs_call(shen_newpv, [Arg16043_2])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_call(shen_maxinfexceeded$question$, []), Arg16043_2, (new Shenjs_freeze([R1, Arg16043_2, Arg16043_3, R0, Arg16043_0, Arg16043_1, Arg16043_2, Arg16043_3], function(Arg16045) {
  var Arg16045_0 = Arg16045[0], Arg16045_1 = Arg16045[1], Arg16045_2 = Arg16045[2], Arg16045_3 = Arg16045[3], Arg16045_4 = Arg16045[4], Arg16045_5 = Arg16045[5], Arg16045_6 = Arg16045[6], Arg16045_7 = Arg16045[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16045_0, shenjs_call(shen_errormaxinfs, []), Arg16045_1, Arg16045_2]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16043_0, Arg16043_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fail"], R1)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg16043_2, (new Shenjs_freeze([R0, Arg16043_0, Arg16043_1, Arg16043_2, Arg16043_3], function(Arg16047) {
  var Arg16047_0 = Arg16047[0], Arg16047_1 = Arg16047[1], Arg16047_2 = Arg16047[2], Arg16047_3 = Arg16047[3], Arg16047_4 = Arg16047[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_prolog_failure, [Arg16047_3, Arg16047_4]);});})}))]))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16043_0, Arg16043_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg16043_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[1], Arg16043_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg16043_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16043_2])),
  ((shenjs_empty$question$(R3))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg16043_2, (new Shenjs_freeze([R0, R2, R1, Arg16043_0, Arg16043_1, Arg16043_2, Arg16043_3], function(Arg16049) {
  var Arg16049_0 = Arg16049[0], Arg16049_1 = Arg16049[1], Arg16049_2 = Arg16049[2], Arg16049_3 = Arg16049[3], Arg16049_4 = Arg16049[4], Arg16049_5 = Arg16049[5], Arg16049_6 = Arg16049[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16049_1, Arg16049_2, Arg16049_4, Arg16049_5, Arg16049_6]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = shenjs_call(shen_newpv, [Arg16043_2])),
  (R0 = shenjs_call(shen_newpv, [Arg16043_2])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_show, [Arg16043_0, R1, Arg16043_2, (new Shenjs_freeze([R1, Arg16043_0, Arg16043_1, R0, Arg16043_2, Arg16043_3], function(Arg16051) {
  var Arg16051_0 = Arg16051[0], Arg16051_1 = Arg16051[1], Arg16051_2 = Arg16051[2], Arg16051_3 = Arg16051[3], Arg16051_4 = Arg16051[4], Arg16051_5 = Arg16051[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16051_3, (shenjs_globals["shen_shen-*datatypes*"]), Arg16051_4, (new Shenjs_freeze([Arg16051_1, Arg16051_2, Arg16051_3, Arg16051_4, Arg16051_5], function(Arg16053) {
  var Arg16053_0 = Arg16053[0], Arg16053_1 = Arg16053[1], Arg16053_2 = Arg16053[2], Arg16053_3 = Arg16053[3], Arg16053_4 = Arg16053[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_udefs$asterisk$, [Arg16053_0, Arg16053_1, Arg16053_2, Arg16053_3, Arg16053_4]);});})}))]);});})}))]))
  : R1))
  : R1))
  : R1))]);}))},
  4,
  [],
  "shen-t*"];
shenjs_functions["shen_shen-t*"] = shen_t$asterisk$;






shen_prolog_failure = [shen_type_func,
  function shen_user_lambda16056(Arg16055) {
  if (Arg16055.length < 2) return [shen_type_func, shen_user_lambda16056, 2, Arg16055];
  var Arg16055_0 = Arg16055[0], Arg16055_1 = Arg16055[1];
  return false},
  2,
  [],
  "shen-prolog-failure"];
shenjs_functions["shen_shen-prolog-failure"] = shen_prolog_failure;






shen_maxinfexceeded$question$ = [shen_type_func,
  function shen_user_lambda16058(Arg16057) {
  if (Arg16057.length < 0) return [shen_type_func, shen_user_lambda16058, 0, Arg16057];
  return (shenjs_call(shen_inferences, [[shen_type_symbol, "shen-skip"]]) > (shenjs_globals["shen_shen-*maxinferences*"]))},
  0,
  [],
  "shen-maxinfexceeded?"];
shenjs_functions["shen_shen-maxinfexceeded?"] = shen_maxinfexceeded$question$;






shen_errormaxinfs = [shen_type_func,
  function shen_user_lambda16060(Arg16059) {
  if (Arg16059.length < 0) return [shen_type_func, shen_user_lambda16060, 0, Arg16059];
  return (function() {
  return shenjs_simple_error("maximum inferences exceeded~%");})},
  0,
  [],
  "shen-errormaxinfs"];
shenjs_functions["shen_shen-errormaxinfs"] = shen_errormaxinfs;






shen_udefs$asterisk$ = [shen_type_func,
  function shen_user_lambda16062(Arg16061) {
  if (Arg16061.length < 5) return [shen_type_func, shen_user_lambda16062, 5, Arg16061];
  var Arg16061_0 = Arg16061[0], Arg16061_1 = Arg16061[1], Arg16061_2 = Arg16061[2], Arg16061_3 = Arg16061[3], Arg16061_4 = Arg16061[4];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg16061_2, Arg16061_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R0 = R0[1]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_call, [[shen_type_cons, R0, [shen_type_cons, Arg16061_0, [shen_type_cons, Arg16061_1, []]]], Arg16061_3, Arg16061_4]))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg16061_2, Arg16061_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_udefs$asterisk$, [Arg16061_0, Arg16061_1, R0, Arg16061_3, Arg16061_4]);}))
  : false))
  : R0))},
  5,
  [],
  "shen-udefs*"];
shenjs_functions["shen_shen-udefs*"] = shen_udefs$asterisk$;






shen_th$asterisk$ = [shen_type_func,
  function shen_user_lambda16064(Arg16063) {
  if (Arg16063.length < 5) return [shen_type_func, shen_user_lambda16064, 5, Arg16063];
  var Arg16063_0 = Arg16063[0], Arg16063_1 = Arg16063[1], Arg16063_2 = Arg16063[2], Arg16063_3 = Arg16063[3], Arg16063_4 = Arg16063[4];
  var R0, R1, R2, R3, R4, R5, R6, R7, R8;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_show, [[shen_type_cons, Arg16063_0, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg16063_1, []]]], Arg16063_2, Arg16063_3, (new Shenjs_freeze([R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16065) {
  var Arg16065_0 = Arg16065[0], Arg16065_1 = Arg16065[1], Arg16065_2 = Arg16065[2], Arg16065_3 = Arg16065[3], Arg16065_4 = Arg16065[4], Arg16065_5 = Arg16065[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [false, Arg16065_4, Arg16065_5]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_call(shen_typedf$question$, [shenjs_call(shen_lazyderef, [Arg16063_0, Arg16063_3])]), Arg16063_3, (new Shenjs_freeze([Arg16063_0, R1, Arg16063_1, Arg16063_3, Arg16063_4, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16067) {
  var Arg16067_0 = Arg16067[0], Arg16067_1 = Arg16067[1], Arg16067_2 = Arg16067[2], Arg16067_3 = Arg16067[3], Arg16067_4 = Arg16067[4], Arg16067_5 = Arg16067[5], Arg16067_6 = Arg16067[6], Arg16067_7 = Arg16067[7], Arg16067_8 = Arg16067[8], Arg16067_9 = Arg16067[9], Arg16067_10 = Arg16067[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16067_1, shenjs_call(shen_sigf, [shenjs_call(shen_lazyderef, [Arg16067_0, Arg16067_3])]), Arg16067_3, (new Shenjs_freeze([Arg16067_0, Arg16067_1, Arg16067_2, Arg16067_3, Arg16067_4], function(Arg16069) {
  var Arg16069_0 = Arg16069[0], Arg16069_1 = Arg16069[1], Arg16069_2 = Arg16069[2], Arg16069_3 = Arg16069[3], Arg16069_4 = Arg16069[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_call, [[shen_type_cons, Arg16069_1, [shen_type_cons, Arg16069_2, []]], Arg16069_3, Arg16069_4]);});})}))]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_base, [Arg16063_0, Arg16063_1, Arg16063_3, Arg16063_4]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_by$_hypothesis, [Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16063_0, Arg16063_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg16063_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R3 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg16063_3])),
  ((shenjs_empty$question$(R1))
  ? ((R1 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R2, [shen_type_cons, R1, [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, Arg16063_1, []]]], Arg16063_2, Arg16063_3, (new Shenjs_freeze([R2, Arg16063_1, R3, R1, Arg16063_2, Arg16063_3, Arg16063_4, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16071) {
  var Arg16071_0 = Arg16071[0], Arg16071_1 = Arg16071[1], Arg16071_2 = Arg16071[2], Arg16071_3 = Arg16071[3], Arg16071_4 = Arg16071[4], Arg16071_5 = Arg16071[5], Arg16071_6 = Arg16071[6], Arg16071_7 = Arg16071[7], Arg16071_8 = Arg16071[8], Arg16071_9 = Arg16071[9], Arg16071_10 = Arg16071[10], Arg16071_11 = Arg16071[11], Arg16071_12 = Arg16071[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16071_2, Arg16071_3, Arg16071_4, Arg16071_5, Arg16071_6]);});})}))]))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16063_0, Arg16063_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg16063_1, Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "list"], R4)))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R4, shen_type_cons))
  ? ((R2 = R4[1]),
  (R4 = shenjs_call(shen_lazyderef, [R4[2], Arg16063_3])),
  ((shenjs_empty$question$(R4))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R3, R2, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16073) {
  var Arg16073_0 = Arg16073[0], Arg16073_1 = Arg16073[1], Arg16073_2 = Arg16073[2], Arg16073_3 = Arg16073[3], Arg16073_4 = Arg16073[4], Arg16073_5 = Arg16073[5], Arg16073_6 = Arg16073[6], Arg16073_7 = Arg16073[7], Arg16073_8 = Arg16073[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16073_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg16073_2, []]], Arg16073_6, Arg16073_7, Arg16073_8]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [], Arg16063_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R3, R2, R4, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16075) {
  var Arg16075_0 = Arg16075[0], Arg16075_1 = Arg16075[1], Arg16075_2 = Arg16075[2], Arg16075_3 = Arg16075[3], Arg16075_4 = Arg16075[4], Arg16075_5 = Arg16075[5], Arg16075_6 = Arg16075[6], Arg16075_7 = Arg16075[7], Arg16075_8 = Arg16075[8], Arg16075_9 = Arg16075[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16075_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg16075_2, []]], Arg16075_7, Arg16075_8, Arg16075_9]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg16063_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_bindv, [R4, [shen_type_cons, R2, []], Arg16063_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R3, R2, Arg16063_2, Arg16063_4, R4, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16077) {
  var Arg16077_0 = Arg16077[0], Arg16077_1 = Arg16077[1], Arg16077_2 = Arg16077[2], Arg16077_3 = Arg16077[3], Arg16077_4 = Arg16077[4], Arg16077_5 = Arg16077[5], Arg16077_6 = Arg16077[6], Arg16077_7 = Arg16077[7], Arg16077_8 = Arg16077[8], Arg16077_9 = Arg16077[9], Arg16077_10 = Arg16077[10], Arg16077_11 = Arg16077[11], Arg16077_12 = Arg16077[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16077_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg16077_2, []]], Arg16077_3, Arg16077_6, Arg16077_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg16063_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [shen_type_symbol, "list"], Arg16063_3]),
  (R3 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R3, R5, R4, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16079) {
  var Arg16079_0 = Arg16079[0], Arg16079_1 = Arg16079[1], Arg16079_2 = Arg16079[2], Arg16079_3 = Arg16079[3], Arg16079_4 = Arg16079[4], Arg16079_5 = Arg16079[5], Arg16079_6 = Arg16079[6], Arg16079_7 = Arg16079[7], Arg16079_8 = Arg16079[8], Arg16079_9 = Arg16079[9], Arg16079_10 = Arg16079[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16079_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg16079_2, []]], Arg16079_8, Arg16079_4, Arg16079_9]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg16063_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R3, R5, R2, R4, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16081) {
  var Arg16081_0 = Arg16081[0], Arg16081_1 = Arg16081[1], Arg16081_2 = Arg16081[2], Arg16081_3 = Arg16081[3], Arg16081_4 = Arg16081[4], Arg16081_5 = Arg16081[5], Arg16081_6 = Arg16081[6], Arg16081_7 = Arg16081[7], Arg16081_8 = Arg16081[8], Arg16081_9 = Arg16081[9], Arg16081_10 = Arg16081[10], Arg16081_11 = Arg16081[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16081_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg16081_2, []]], Arg16081_9, Arg16081_5, Arg16081_10]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg16063_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R5, []], Arg16063_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R3, R5, Arg16063_2, Arg16063_4, R2, Arg16063_3, R4, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16083) {
  var Arg16083_0 = Arg16083[0], Arg16083_1 = Arg16083[1], Arg16083_2 = Arg16083[2], Arg16083_3 = Arg16083[3], Arg16083_4 = Arg16083[4], Arg16083_5 = Arg16083[5], Arg16083_6 = Arg16083[6], Arg16083_7 = Arg16083[7], Arg16083_8 = Arg16083[8], Arg16083_9 = Arg16083[9], Arg16083_10 = Arg16083[10], Arg16083_11 = Arg16083[11], Arg16083_12 = Arg16083[12], Arg16083_13 = Arg16083[13], Arg16083_14 = Arg16083[14];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16083_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg16083_2, []]], Arg16083_3, Arg16083_6, Arg16083_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg16063_3]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R4, Arg16063_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, R4, []]], Arg16063_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R3, R4, Arg16063_2, Arg16063_4, R2, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16085) {
  var Arg16085_0 = Arg16085[0], Arg16085_1 = Arg16085[1], Arg16085_2 = Arg16085[2], Arg16085_3 = Arg16085[3], Arg16085_4 = Arg16085[4], Arg16085_5 = Arg16085[5], Arg16085_6 = Arg16085[6], Arg16085_7 = Arg16085[7], Arg16085_8 = Arg16085[8], Arg16085_9 = Arg16085[9], Arg16085_10 = Arg16085[10], Arg16085_11 = Arg16085[11], Arg16085_12 = Arg16085[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16085_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg16085_2, []]], Arg16085_3, Arg16085_6, Arg16085_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg16063_3]),
  R4)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16063_0, Arg16063_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@p"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg16063_1, Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R2[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "*"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R2 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg16063_3])),
  ((shenjs_empty$question$(R5))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R4, R3, R2, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16087) {
  var Arg16087_0 = Arg16087[0], Arg16087_1 = Arg16087[1], Arg16087_2 = Arg16087[2], Arg16087_3 = Arg16087[3], Arg16087_4 = Arg16087[4], Arg16087_5 = Arg16087[5], Arg16087_6 = Arg16087[6], Arg16087_7 = Arg16087[7], Arg16087_8 = Arg16087[8], Arg16087_9 = Arg16087[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16087_2, Arg16087_3, Arg16087_7, Arg16087_8, Arg16087_9]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg16063_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R4, R3, R2, R5, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16089) {
  var Arg16089_0 = Arg16089[0], Arg16089_1 = Arg16089[1], Arg16089_2 = Arg16089[2], Arg16089_3 = Arg16089[3], Arg16089_4 = Arg16089[4], Arg16089_5 = Arg16089[5], Arg16089_6 = Arg16089[6], Arg16089_7 = Arg16089[7], Arg16089_8 = Arg16089[8], Arg16089_9 = Arg16089[9], Arg16089_10 = Arg16089[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16089_2, Arg16089_3, Arg16089_8, Arg16089_9, Arg16089_10]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg16063_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, R2, []], Arg16063_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R4, R3, R2, Arg16063_2, Arg16063_4, R5, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16091) {
  var Arg16091_0 = Arg16091[0], Arg16091_1 = Arg16091[1], Arg16091_2 = Arg16091[2], Arg16091_3 = Arg16091[3], Arg16091_4 = Arg16091[4], Arg16091_5 = Arg16091[5], Arg16091_6 = Arg16091[6], Arg16091_7 = Arg16091[7], Arg16091_8 = Arg16091[8], Arg16091_9 = Arg16091[9], Arg16091_10 = Arg16091[10], Arg16091_11 = Arg16091[11], Arg16091_12 = Arg16091[12], Arg16091_13 = Arg16091[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16091_2, Arg16091_3, Arg16091_4, Arg16091_7, Arg16091_5]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg16063_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [shen_type_symbol, "*"], Arg16063_3]),
  (R4 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R6 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R4, R3, R6, R5, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16093) {
  var Arg16093_0 = Arg16093[0], Arg16093_1 = Arg16093[1], Arg16093_2 = Arg16093[2], Arg16093_3 = Arg16093[3], Arg16093_4 = Arg16093[4], Arg16093_5 = Arg16093[5], Arg16093_6 = Arg16093[6], Arg16093_7 = Arg16093[7], Arg16093_8 = Arg16093[8], Arg16093_9 = Arg16093[9], Arg16093_10 = Arg16093[10], Arg16093_11 = Arg16093[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16093_2, Arg16093_3, Arg16093_9, Arg16093_5, Arg16093_10]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg16063_3]),
  (R6 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R4, R3, R6, R2, R5, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16095) {
  var Arg16095_0 = Arg16095[0], Arg16095_1 = Arg16095[1], Arg16095_2 = Arg16095[2], Arg16095_3 = Arg16095[3], Arg16095_4 = Arg16095[4], Arg16095_5 = Arg16095[5], Arg16095_6 = Arg16095[6], Arg16095_7 = Arg16095[7], Arg16095_8 = Arg16095[8], Arg16095_9 = Arg16095[9], Arg16095_10 = Arg16095[10], Arg16095_11 = Arg16095[11], Arg16095_12 = Arg16095[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16095_2, Arg16095_3, Arg16095_10, Arg16095_6, Arg16095_11]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg16063_3]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R6, []], Arg16063_3]),
  (R6 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R4, R3, R6, Arg16063_2, Arg16063_4, R2, Arg16063_3, R5, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16097) {
  var Arg16097_0 = Arg16097[0], Arg16097_1 = Arg16097[1], Arg16097_2 = Arg16097[2], Arg16097_3 = Arg16097[3], Arg16097_4 = Arg16097[4], Arg16097_5 = Arg16097[5], Arg16097_6 = Arg16097[6], Arg16097_7 = Arg16097[7], Arg16097_8 = Arg16097[8], Arg16097_9 = Arg16097[9], Arg16097_10 = Arg16097[10], Arg16097_11 = Arg16097[11], Arg16097_12 = Arg16097[12], Arg16097_13 = Arg16097[13], Arg16097_14 = Arg16097[14], Arg16097_15 = Arg16097[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16097_2, Arg16097_3, Arg16097_4, Arg16097_7, Arg16097_5]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg16063_3]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg16063_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, R5, []]], Arg16063_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R4, R3, R5, Arg16063_2, Arg16063_4, R2, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16099) {
  var Arg16099_0 = Arg16099[0], Arg16099_1 = Arg16099[1], Arg16099_2 = Arg16099[2], Arg16099_3 = Arg16099[3], Arg16099_4 = Arg16099[4], Arg16099_5 = Arg16099[5], Arg16099_6 = Arg16099[6], Arg16099_7 = Arg16099[7], Arg16099_8 = Arg16099[8], Arg16099_9 = Arg16099[9], Arg16099_10 = Arg16099[10], Arg16099_11 = Arg16099[11], Arg16099_12 = Arg16099[12], Arg16099_13 = Arg16099[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16099_2, Arg16099_3, Arg16099_4, Arg16099_7, Arg16099_5]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg16063_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg16063_3])),
  (R5 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R4, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, R5, []]]], Arg16063_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R4, R3, R5, Arg16063_2, Arg16063_4, R2, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16101) {
  var Arg16101_0 = Arg16101[0], Arg16101_1 = Arg16101[1], Arg16101_2 = Arg16101[2], Arg16101_3 = Arg16101[3], Arg16101_4 = Arg16101[4], Arg16101_5 = Arg16101[5], Arg16101_6 = Arg16101[6], Arg16101_7 = Arg16101[7], Arg16101_8 = Arg16101[8], Arg16101_9 = Arg16101[9], Arg16101_10 = Arg16101[10], Arg16101_11 = Arg16101[11], Arg16101_12 = Arg16101[12], Arg16101_13 = Arg16101[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16101_2, Arg16101_3, Arg16101_4, Arg16101_7, Arg16101_5]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg16063_3]),
  R5)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16063_0, Arg16063_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@v"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg16063_1, Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "vector"], R4)))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R4, shen_type_cons))
  ? ((R2 = R4[1]),
  (R4 = shenjs_call(shen_lazyderef, [R4[2], Arg16063_3])),
  ((shenjs_empty$question$(R4))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R3, R2, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16103) {
  var Arg16103_0 = Arg16103[0], Arg16103_1 = Arg16103[1], Arg16103_2 = Arg16103[2], Arg16103_3 = Arg16103[3], Arg16103_4 = Arg16103[4], Arg16103_5 = Arg16103[5], Arg16103_6 = Arg16103[6], Arg16103_7 = Arg16103[7], Arg16103_8 = Arg16103[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16103_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg16103_2, []]], Arg16103_6, Arg16103_7, Arg16103_8]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [], Arg16063_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R3, R2, R4, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16105) {
  var Arg16105_0 = Arg16105[0], Arg16105_1 = Arg16105[1], Arg16105_2 = Arg16105[2], Arg16105_3 = Arg16105[3], Arg16105_4 = Arg16105[4], Arg16105_5 = Arg16105[5], Arg16105_6 = Arg16105[6], Arg16105_7 = Arg16105[7], Arg16105_8 = Arg16105[8], Arg16105_9 = Arg16105[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16105_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg16105_2, []]], Arg16105_7, Arg16105_8, Arg16105_9]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg16063_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_bindv, [R4, [shen_type_cons, R2, []], Arg16063_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R3, R2, Arg16063_2, Arg16063_4, R4, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16107) {
  var Arg16107_0 = Arg16107[0], Arg16107_1 = Arg16107[1], Arg16107_2 = Arg16107[2], Arg16107_3 = Arg16107[3], Arg16107_4 = Arg16107[4], Arg16107_5 = Arg16107[5], Arg16107_6 = Arg16107[6], Arg16107_7 = Arg16107[7], Arg16107_8 = Arg16107[8], Arg16107_9 = Arg16107[9], Arg16107_10 = Arg16107[10], Arg16107_11 = Arg16107[11], Arg16107_12 = Arg16107[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16107_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg16107_2, []]], Arg16107_3, Arg16107_6, Arg16107_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg16063_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [shen_type_symbol, "vector"], Arg16063_3]),
  (R3 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R3, R5, R4, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16109) {
  var Arg16109_0 = Arg16109[0], Arg16109_1 = Arg16109[1], Arg16109_2 = Arg16109[2], Arg16109_3 = Arg16109[3], Arg16109_4 = Arg16109[4], Arg16109_5 = Arg16109[5], Arg16109_6 = Arg16109[6], Arg16109_7 = Arg16109[7], Arg16109_8 = Arg16109[8], Arg16109_9 = Arg16109[9], Arg16109_10 = Arg16109[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16109_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg16109_2, []]], Arg16109_8, Arg16109_4, Arg16109_9]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg16063_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R3, R5, R2, R4, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16111) {
  var Arg16111_0 = Arg16111[0], Arg16111_1 = Arg16111[1], Arg16111_2 = Arg16111[2], Arg16111_3 = Arg16111[3], Arg16111_4 = Arg16111[4], Arg16111_5 = Arg16111[5], Arg16111_6 = Arg16111[6], Arg16111_7 = Arg16111[7], Arg16111_8 = Arg16111[8], Arg16111_9 = Arg16111[9], Arg16111_10 = Arg16111[10], Arg16111_11 = Arg16111[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16111_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg16111_2, []]], Arg16111_9, Arg16111_5, Arg16111_10]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg16063_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R5, []], Arg16063_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R3, R5, Arg16063_2, Arg16063_4, R2, Arg16063_3, R4, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16113) {
  var Arg16113_0 = Arg16113[0], Arg16113_1 = Arg16113[1], Arg16113_2 = Arg16113[2], Arg16113_3 = Arg16113[3], Arg16113_4 = Arg16113[4], Arg16113_5 = Arg16113[5], Arg16113_6 = Arg16113[6], Arg16113_7 = Arg16113[7], Arg16113_8 = Arg16113[8], Arg16113_9 = Arg16113[9], Arg16113_10 = Arg16113[10], Arg16113_11 = Arg16113[11], Arg16113_12 = Arg16113[12], Arg16113_13 = Arg16113[13], Arg16113_14 = Arg16113[14];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16113_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg16113_2, []]], Arg16113_3, Arg16113_6, Arg16113_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg16063_3]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R4, Arg16063_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, R4, []]], Arg16063_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R3, R4, Arg16063_2, Arg16063_4, R2, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16115) {
  var Arg16115_0 = Arg16115[0], Arg16115_1 = Arg16115[1], Arg16115_2 = Arg16115[2], Arg16115_3 = Arg16115[3], Arg16115_4 = Arg16115[4], Arg16115_5 = Arg16115[5], Arg16115_6 = Arg16115[6], Arg16115_7 = Arg16115[7], Arg16115_8 = Arg16115[8], Arg16115_9 = Arg16115[9], Arg16115_10 = Arg16115[10], Arg16115_11 = Arg16115[11], Arg16115_12 = Arg16115[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16115_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg16115_2, []]], Arg16115_3, Arg16115_6, Arg16115_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg16063_3]),
  R4)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16063_0, Arg16063_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg16063_1, Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "string"], R2)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, [shen_type_symbol, "string"], Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16117) {
  var Arg16117_0 = Arg16117[0], Arg16117_1 = Arg16117[1], Arg16117_2 = Arg16117[2], Arg16117_3 = Arg16117[3], Arg16117_4 = Arg16117[4], Arg16117_5 = Arg16117[5], Arg16117_6 = Arg16117[6], Arg16117_7 = Arg16117[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16117_1, [shen_type_symbol, "string"], Arg16117_5, Arg16117_6, Arg16117_7]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [shen_type_symbol, "string"], Arg16063_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, [shen_type_symbol, "string"], Arg16063_2, Arg16063_3, (new Shenjs_freeze([R1, R3, R2, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16119) {
  var Arg16119_0 = Arg16119[0], Arg16119_1 = Arg16119[1], Arg16119_2 = Arg16119[2], Arg16119_3 = Arg16119[3], Arg16119_4 = Arg16119[4], Arg16119_5 = Arg16119[5], Arg16119_6 = Arg16119[6], Arg16119_7 = Arg16119[7], Arg16119_8 = Arg16119[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16119_1, [shen_type_symbol, "string"], Arg16119_6, Arg16119_7, Arg16119_8]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg16063_3]),
  R3)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16063_0, Arg16063_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "lambda"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg16063_1, Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R2[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-->"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R2 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg16063_3])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = shenjs_call(shen_newpv, [Arg16063_3])),
  (R6 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg16063_3, (new Shenjs_freeze([R0, R1, R3, R5, R2, R6, R4, Arg16063_2, Arg16063_3, Arg16063_4, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16121) {
  var Arg16121_0 = Arg16121[0], Arg16121_1 = Arg16121[1], Arg16121_2 = Arg16121[2], Arg16121_3 = Arg16121[3], Arg16121_4 = Arg16121[4], Arg16121_5 = Arg16121[5], Arg16121_6 = Arg16121[6], Arg16121_7 = Arg16121[7], Arg16121_8 = Arg16121[8], Arg16121_9 = Arg16121[9], Arg16121_10 = Arg16121[10], Arg16121_11 = Arg16121[11], Arg16121_12 = Arg16121[12], Arg16121_13 = Arg16121[13], Arg16121_14 = Arg16121[14], Arg16121_15 = Arg16121[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16121_5, shenjs_call(shen_placeholder, []), Arg16121_8, (new Shenjs_freeze([Arg16121_1, Arg16121_2, Arg16121_3, Arg16121_4, Arg16121_5, Arg16121_6, Arg16121_7, Arg16121_8, Arg16121_9], function(Arg16123) {
  var Arg16123_0 = Arg16123[0], Arg16123_1 = Arg16123[1], Arg16123_2 = Arg16123[2], Arg16123_3 = Arg16123[3], Arg16123_4 = Arg16123[4], Arg16123_5 = Arg16123[5], Arg16123_6 = Arg16123[6], Arg16123_7 = Arg16123[7], Arg16123_8 = Arg16123[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16123_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg16123_4, Arg16123_7]), shenjs_call(shen_lazyderef, [Arg16123_0, Arg16123_7]), shenjs_call(shen_lazyderef, [Arg16123_1, Arg16123_7])]), Arg16123_7, (new Shenjs_freeze([Arg16123_0, Arg16123_1, Arg16123_2, Arg16123_3, Arg16123_4, Arg16123_5, Arg16123_6, Arg16123_7, Arg16123_8], function(Arg16125) {
  var Arg16125_0 = Arg16125[0], Arg16125_1 = Arg16125[1], Arg16125_2 = Arg16125[2], Arg16125_3 = Arg16125[3], Arg16125_4 = Arg16125[4], Arg16125_5 = Arg16125[5], Arg16125_6 = Arg16125[6], Arg16125_7 = Arg16125[7], Arg16125_8 = Arg16125[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16125_2, Arg16125_3, [shen_type_cons, [shen_type_cons, Arg16125_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg16125_5, []]]], Arg16125_6], Arg16125_7, Arg16125_8]);});})}))]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg16063_3]),
  (R4 = ((R6 = shenjs_call(shen_newpv, [Arg16063_3])),
  (R7 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg16063_3, (new Shenjs_freeze([R0, R1, R3, R6, R2, R7, R4, Arg16063_2, Arg16063_3, Arg16063_4, R5, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16127) {
  var Arg16127_0 = Arg16127[0], Arg16127_1 = Arg16127[1], Arg16127_2 = Arg16127[2], Arg16127_3 = Arg16127[3], Arg16127_4 = Arg16127[4], Arg16127_5 = Arg16127[5], Arg16127_6 = Arg16127[6], Arg16127_7 = Arg16127[7], Arg16127_8 = Arg16127[8], Arg16127_9 = Arg16127[9], Arg16127_10 = Arg16127[10], Arg16127_11 = Arg16127[11], Arg16127_12 = Arg16127[12], Arg16127_13 = Arg16127[13], Arg16127_14 = Arg16127[14], Arg16127_15 = Arg16127[15], Arg16127_16 = Arg16127[16], Arg16127_17 = Arg16127[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16127_5, shenjs_call(shen_placeholder, []), Arg16127_8, (new Shenjs_freeze([Arg16127_1, Arg16127_2, Arg16127_3, Arg16127_4, Arg16127_5, Arg16127_6, Arg16127_7, Arg16127_8, Arg16127_9], function(Arg16129) {
  var Arg16129_0 = Arg16129[0], Arg16129_1 = Arg16129[1], Arg16129_2 = Arg16129[2], Arg16129_3 = Arg16129[3], Arg16129_4 = Arg16129[4], Arg16129_5 = Arg16129[5], Arg16129_6 = Arg16129[6], Arg16129_7 = Arg16129[7], Arg16129_8 = Arg16129[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16129_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg16129_4, Arg16129_7]), shenjs_call(shen_lazyderef, [Arg16129_0, Arg16129_7]), shenjs_call(shen_lazyderef, [Arg16129_1, Arg16129_7])]), Arg16129_7, (new Shenjs_freeze([Arg16129_0, Arg16129_1, Arg16129_2, Arg16129_3, Arg16129_4, Arg16129_5, Arg16129_6, Arg16129_7, Arg16129_8], function(Arg16131) {
  var Arg16131_0 = Arg16131[0], Arg16131_1 = Arg16131[1], Arg16131_2 = Arg16131[2], Arg16131_3 = Arg16131[3], Arg16131_4 = Arg16131[4], Arg16131_5 = Arg16131[5], Arg16131_6 = Arg16131[6], Arg16131_7 = Arg16131[7], Arg16131_8 = Arg16131[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16131_2, Arg16131_3, [shen_type_cons, [shen_type_cons, Arg16131_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg16131_5, []]]], Arg16131_6], Arg16131_7, Arg16131_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg16063_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, R2, []], Arg16063_3]),
  (R4 = ((R6 = shenjs_call(shen_newpv, [Arg16063_3])),
  (R7 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg16063_3, (new Shenjs_freeze([R0, R1, R3, R6, R2, R7, R4, Arg16063_2, Arg16063_3, Arg16063_4, R5, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16133) {
  var Arg16133_0 = Arg16133[0], Arg16133_1 = Arg16133[1], Arg16133_2 = Arg16133[2], Arg16133_3 = Arg16133[3], Arg16133_4 = Arg16133[4], Arg16133_5 = Arg16133[5], Arg16133_6 = Arg16133[6], Arg16133_7 = Arg16133[7], Arg16133_8 = Arg16133[8], Arg16133_9 = Arg16133[9], Arg16133_10 = Arg16133[10], Arg16133_11 = Arg16133[11], Arg16133_12 = Arg16133[12], Arg16133_13 = Arg16133[13], Arg16133_14 = Arg16133[14], Arg16133_15 = Arg16133[15], Arg16133_16 = Arg16133[16], Arg16133_17 = Arg16133[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16133_5, shenjs_call(shen_placeholder, []), Arg16133_8, (new Shenjs_freeze([Arg16133_1, Arg16133_2, Arg16133_3, Arg16133_4, Arg16133_5, Arg16133_6, Arg16133_7, Arg16133_8, Arg16133_9], function(Arg16135) {
  var Arg16135_0 = Arg16135[0], Arg16135_1 = Arg16135[1], Arg16135_2 = Arg16135[2], Arg16135_3 = Arg16135[3], Arg16135_4 = Arg16135[4], Arg16135_5 = Arg16135[5], Arg16135_6 = Arg16135[6], Arg16135_7 = Arg16135[7], Arg16135_8 = Arg16135[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16135_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg16135_4, Arg16135_7]), shenjs_call(shen_lazyderef, [Arg16135_0, Arg16135_7]), shenjs_call(shen_lazyderef, [Arg16135_1, Arg16135_7])]), Arg16135_7, (new Shenjs_freeze([Arg16135_0, Arg16135_1, Arg16135_2, Arg16135_3, Arg16135_4, Arg16135_5, Arg16135_6, Arg16135_7, Arg16135_8], function(Arg16137) {
  var Arg16137_0 = Arg16137[0], Arg16137_1 = Arg16137[1], Arg16137_2 = Arg16137[2], Arg16137_3 = Arg16137[3], Arg16137_4 = Arg16137[4], Arg16137_5 = Arg16137[5], Arg16137_6 = Arg16137[6], Arg16137_7 = Arg16137[7], Arg16137_8 = Arg16137[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16137_2, Arg16137_3, [shen_type_cons, [shen_type_cons, Arg16137_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg16137_5, []]]], Arg16137_6], Arg16137_7, Arg16137_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg16063_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [shen_type_symbol, "-->"], Arg16063_3]),
  (R4 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R6 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_newpv, [Arg16063_3])),
  (R7 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg16063_3, (new Shenjs_freeze([R0, R1, R3, R2, R6, R7, R4, Arg16063_2, Arg16063_3, Arg16063_4, R5, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16139) {
  var Arg16139_0 = Arg16139[0], Arg16139_1 = Arg16139[1], Arg16139_2 = Arg16139[2], Arg16139_3 = Arg16139[3], Arg16139_4 = Arg16139[4], Arg16139_5 = Arg16139[5], Arg16139_6 = Arg16139[6], Arg16139_7 = Arg16139[7], Arg16139_8 = Arg16139[8], Arg16139_9 = Arg16139[9], Arg16139_10 = Arg16139[10], Arg16139_11 = Arg16139[11], Arg16139_12 = Arg16139[12], Arg16139_13 = Arg16139[13], Arg16139_14 = Arg16139[14], Arg16139_15 = Arg16139[15], Arg16139_16 = Arg16139[16], Arg16139_17 = Arg16139[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16139_5, shenjs_call(shen_placeholder, []), Arg16139_8, (new Shenjs_freeze([Arg16139_1, Arg16139_2, Arg16139_3, Arg16139_4, Arg16139_5, Arg16139_6, Arg16139_7, Arg16139_8, Arg16139_9], function(Arg16141) {
  var Arg16141_0 = Arg16141[0], Arg16141_1 = Arg16141[1], Arg16141_2 = Arg16141[2], Arg16141_3 = Arg16141[3], Arg16141_4 = Arg16141[4], Arg16141_5 = Arg16141[5], Arg16141_6 = Arg16141[6], Arg16141_7 = Arg16141[7], Arg16141_8 = Arg16141[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16141_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg16141_4, Arg16141_7]), shenjs_call(shen_lazyderef, [Arg16141_0, Arg16141_7]), shenjs_call(shen_lazyderef, [Arg16141_1, Arg16141_7])]), Arg16141_7, (new Shenjs_freeze([Arg16141_0, Arg16141_1, Arg16141_2, Arg16141_3, Arg16141_4, Arg16141_5, Arg16141_6, Arg16141_7, Arg16141_8], function(Arg16143) {
  var Arg16143_0 = Arg16143[0], Arg16143_1 = Arg16143[1], Arg16143_2 = Arg16143[2], Arg16143_3 = Arg16143[3], Arg16143_4 = Arg16143[4], Arg16143_5 = Arg16143[5], Arg16143_6 = Arg16143[6], Arg16143_7 = Arg16143[7], Arg16143_8 = Arg16143[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16143_2, Arg16143_3, [shen_type_cons, [shen_type_cons, Arg16143_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg16143_5, []]]], Arg16143_6], Arg16143_7, Arg16143_8]);});})}))]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg16063_3]),
  (R6 = ((R7 = shenjs_call(shen_newpv, [Arg16063_3])),
  (R8 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg16063_3, (new Shenjs_freeze([R0, R1, R3, R7, R6, R8, R4, Arg16063_2, Arg16063_3, Arg16063_4, R2, Arg16063_3, R5, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16145) {
  var Arg16145_0 = Arg16145[0], Arg16145_1 = Arg16145[1], Arg16145_2 = Arg16145[2], Arg16145_3 = Arg16145[3], Arg16145_4 = Arg16145[4], Arg16145_5 = Arg16145[5], Arg16145_6 = Arg16145[6], Arg16145_7 = Arg16145[7], Arg16145_8 = Arg16145[8], Arg16145_9 = Arg16145[9], Arg16145_10 = Arg16145[10], Arg16145_11 = Arg16145[11], Arg16145_12 = Arg16145[12], Arg16145_13 = Arg16145[13], Arg16145_14 = Arg16145[14], Arg16145_15 = Arg16145[15], Arg16145_16 = Arg16145[16], Arg16145_17 = Arg16145[17], Arg16145_18 = Arg16145[18], Arg16145_19 = Arg16145[19];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16145_5, shenjs_call(shen_placeholder, []), Arg16145_8, (new Shenjs_freeze([Arg16145_1, Arg16145_2, Arg16145_3, Arg16145_4, Arg16145_5, Arg16145_6, Arg16145_7, Arg16145_8, Arg16145_9], function(Arg16147) {
  var Arg16147_0 = Arg16147[0], Arg16147_1 = Arg16147[1], Arg16147_2 = Arg16147[2], Arg16147_3 = Arg16147[3], Arg16147_4 = Arg16147[4], Arg16147_5 = Arg16147[5], Arg16147_6 = Arg16147[6], Arg16147_7 = Arg16147[7], Arg16147_8 = Arg16147[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16147_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg16147_4, Arg16147_7]), shenjs_call(shen_lazyderef, [Arg16147_0, Arg16147_7]), shenjs_call(shen_lazyderef, [Arg16147_1, Arg16147_7])]), Arg16147_7, (new Shenjs_freeze([Arg16147_0, Arg16147_1, Arg16147_2, Arg16147_3, Arg16147_4, Arg16147_5, Arg16147_6, Arg16147_7, Arg16147_8], function(Arg16149) {
  var Arg16149_0 = Arg16149[0], Arg16149_1 = Arg16149[1], Arg16149_2 = Arg16149[2], Arg16149_3 = Arg16149[3], Arg16149_4 = Arg16149[4], Arg16149_5 = Arg16149[5], Arg16149_6 = Arg16149[6], Arg16149_7 = Arg16149[7], Arg16149_8 = Arg16149[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16149_2, Arg16149_3, [shen_type_cons, [shen_type_cons, Arg16149_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg16149_5, []]]], Arg16149_6], Arg16149_7, Arg16149_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg16063_3]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R6, []], Arg16063_3]),
  (R6 = ((R7 = shenjs_call(shen_newpv, [Arg16063_3])),
  (R8 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg16063_3, (new Shenjs_freeze([R0, R1, R3, R7, R6, R8, R4, Arg16063_2, Arg16063_3, Arg16063_4, R2, Arg16063_3, R5, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16151) {
  var Arg16151_0 = Arg16151[0], Arg16151_1 = Arg16151[1], Arg16151_2 = Arg16151[2], Arg16151_3 = Arg16151[3], Arg16151_4 = Arg16151[4], Arg16151_5 = Arg16151[5], Arg16151_6 = Arg16151[6], Arg16151_7 = Arg16151[7], Arg16151_8 = Arg16151[8], Arg16151_9 = Arg16151[9], Arg16151_10 = Arg16151[10], Arg16151_11 = Arg16151[11], Arg16151_12 = Arg16151[12], Arg16151_13 = Arg16151[13], Arg16151_14 = Arg16151[14], Arg16151_15 = Arg16151[15], Arg16151_16 = Arg16151[16], Arg16151_17 = Arg16151[17], Arg16151_18 = Arg16151[18], Arg16151_19 = Arg16151[19];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16151_5, shenjs_call(shen_placeholder, []), Arg16151_8, (new Shenjs_freeze([Arg16151_1, Arg16151_2, Arg16151_3, Arg16151_4, Arg16151_5, Arg16151_6, Arg16151_7, Arg16151_8, Arg16151_9], function(Arg16153) {
  var Arg16153_0 = Arg16153[0], Arg16153_1 = Arg16153[1], Arg16153_2 = Arg16153[2], Arg16153_3 = Arg16153[3], Arg16153_4 = Arg16153[4], Arg16153_5 = Arg16153[5], Arg16153_6 = Arg16153[6], Arg16153_7 = Arg16153[7], Arg16153_8 = Arg16153[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16153_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg16153_4, Arg16153_7]), shenjs_call(shen_lazyderef, [Arg16153_0, Arg16153_7]), shenjs_call(shen_lazyderef, [Arg16153_1, Arg16153_7])]), Arg16153_7, (new Shenjs_freeze([Arg16153_0, Arg16153_1, Arg16153_2, Arg16153_3, Arg16153_4, Arg16153_5, Arg16153_6, Arg16153_7, Arg16153_8], function(Arg16155) {
  var Arg16155_0 = Arg16155[0], Arg16155_1 = Arg16155[1], Arg16155_2 = Arg16155[2], Arg16155_3 = Arg16155[3], Arg16155_4 = Arg16155[4], Arg16155_5 = Arg16155[5], Arg16155_6 = Arg16155[6], Arg16155_7 = Arg16155[7], Arg16155_8 = Arg16155[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16155_2, Arg16155_3, [shen_type_cons, [shen_type_cons, Arg16155_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg16155_5, []]]], Arg16155_6], Arg16155_7, Arg16155_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg16063_3]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg16063_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, R5, []]], Arg16063_3]),
  (R5 = ((R6 = shenjs_call(shen_newpv, [Arg16063_3])),
  (R7 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg16063_3, (new Shenjs_freeze([R0, R1, R3, R6, R5, R7, R4, Arg16063_2, Arg16063_3, Arg16063_4, R2, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16157) {
  var Arg16157_0 = Arg16157[0], Arg16157_1 = Arg16157[1], Arg16157_2 = Arg16157[2], Arg16157_3 = Arg16157[3], Arg16157_4 = Arg16157[4], Arg16157_5 = Arg16157[5], Arg16157_6 = Arg16157[6], Arg16157_7 = Arg16157[7], Arg16157_8 = Arg16157[8], Arg16157_9 = Arg16157[9], Arg16157_10 = Arg16157[10], Arg16157_11 = Arg16157[11], Arg16157_12 = Arg16157[12], Arg16157_13 = Arg16157[13], Arg16157_14 = Arg16157[14], Arg16157_15 = Arg16157[15], Arg16157_16 = Arg16157[16], Arg16157_17 = Arg16157[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16157_5, shenjs_call(shen_placeholder, []), Arg16157_8, (new Shenjs_freeze([Arg16157_1, Arg16157_2, Arg16157_3, Arg16157_4, Arg16157_5, Arg16157_6, Arg16157_7, Arg16157_8, Arg16157_9], function(Arg16159) {
  var Arg16159_0 = Arg16159[0], Arg16159_1 = Arg16159[1], Arg16159_2 = Arg16159[2], Arg16159_3 = Arg16159[3], Arg16159_4 = Arg16159[4], Arg16159_5 = Arg16159[5], Arg16159_6 = Arg16159[6], Arg16159_7 = Arg16159[7], Arg16159_8 = Arg16159[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16159_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg16159_4, Arg16159_7]), shenjs_call(shen_lazyderef, [Arg16159_0, Arg16159_7]), shenjs_call(shen_lazyderef, [Arg16159_1, Arg16159_7])]), Arg16159_7, (new Shenjs_freeze([Arg16159_0, Arg16159_1, Arg16159_2, Arg16159_3, Arg16159_4, Arg16159_5, Arg16159_6, Arg16159_7, Arg16159_8], function(Arg16161) {
  var Arg16161_0 = Arg16161[0], Arg16161_1 = Arg16161[1], Arg16161_2 = Arg16161[2], Arg16161_3 = Arg16161[3], Arg16161_4 = Arg16161[4], Arg16161_5 = Arg16161[5], Arg16161_6 = Arg16161[6], Arg16161_7 = Arg16161[7], Arg16161_8 = Arg16161[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16161_2, Arg16161_3, [shen_type_cons, [shen_type_cons, Arg16161_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg16161_5, []]]], Arg16161_6], Arg16161_7, Arg16161_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg16063_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg16063_3])),
  (R5 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R4, [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, R5, []]]], Arg16063_3]),
  (R5 = ((R6 = shenjs_call(shen_newpv, [Arg16063_3])),
  (R7 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg16063_3, (new Shenjs_freeze([R0, R1, R3, R6, R5, R7, R4, Arg16063_2, Arg16063_3, Arg16063_4, R2, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16163) {
  var Arg16163_0 = Arg16163[0], Arg16163_1 = Arg16163[1], Arg16163_2 = Arg16163[2], Arg16163_3 = Arg16163[3], Arg16163_4 = Arg16163[4], Arg16163_5 = Arg16163[5], Arg16163_6 = Arg16163[6], Arg16163_7 = Arg16163[7], Arg16163_8 = Arg16163[8], Arg16163_9 = Arg16163[9], Arg16163_10 = Arg16163[10], Arg16163_11 = Arg16163[11], Arg16163_12 = Arg16163[12], Arg16163_13 = Arg16163[13], Arg16163_14 = Arg16163[14], Arg16163_15 = Arg16163[15], Arg16163_16 = Arg16163[16], Arg16163_17 = Arg16163[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16163_5, shenjs_call(shen_placeholder, []), Arg16163_8, (new Shenjs_freeze([Arg16163_1, Arg16163_2, Arg16163_3, Arg16163_4, Arg16163_5, Arg16163_6, Arg16163_7, Arg16163_8, Arg16163_9], function(Arg16165) {
  var Arg16165_0 = Arg16165[0], Arg16165_1 = Arg16165[1], Arg16165_2 = Arg16165[2], Arg16165_3 = Arg16165[3], Arg16165_4 = Arg16165[4], Arg16165_5 = Arg16165[5], Arg16165_6 = Arg16165[6], Arg16165_7 = Arg16165[7], Arg16165_8 = Arg16165[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16165_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg16165_4, Arg16165_7]), shenjs_call(shen_lazyderef, [Arg16165_0, Arg16165_7]), shenjs_call(shen_lazyderef, [Arg16165_1, Arg16165_7])]), Arg16165_7, (new Shenjs_freeze([Arg16165_0, Arg16165_1, Arg16165_2, Arg16165_3, Arg16165_4, Arg16165_5, Arg16165_6, Arg16165_7, Arg16165_8], function(Arg16167) {
  var Arg16167_0 = Arg16167[0], Arg16167_1 = Arg16167[1], Arg16167_2 = Arg16167[2], Arg16167_3 = Arg16167[3], Arg16167_4 = Arg16167[4], Arg16167_5 = Arg16167[5], Arg16167_6 = Arg16167[6], Arg16167_7 = Arg16167[7], Arg16167_8 = Arg16167[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16167_2, Arg16167_3, [shen_type_cons, [shen_type_cons, Arg16167_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg16167_5, []]]], Arg16167_6], Arg16167_7, Arg16167_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg16063_3]),
  R5)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16063_0, Arg16063_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_newpv, [Arg16063_3])),
  (R5 = shenjs_call(shen_newpv, [Arg16063_3])),
  (R6 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg16063_3, (new Shenjs_freeze([R0, R3, R1, R4, R2, Arg16063_1, R5, R6, Arg16063_2, Arg16063_3, Arg16063_4, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16169) {
  var Arg16169_0 = Arg16169[0], Arg16169_1 = Arg16169[1], Arg16169_2 = Arg16169[2], Arg16169_3 = Arg16169[3], Arg16169_4 = Arg16169[4], Arg16169_5 = Arg16169[5], Arg16169_6 = Arg16169[6], Arg16169_7 = Arg16169[7], Arg16169_8 = Arg16169[8], Arg16169_9 = Arg16169[9], Arg16169_10 = Arg16169[10], Arg16169_11 = Arg16169[11], Arg16169_12 = Arg16169[12], Arg16169_13 = Arg16169[13], Arg16169_14 = Arg16169[14], Arg16169_15 = Arg16169[15], Arg16169_16 = Arg16169[16];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16169_1, Arg16169_7, Arg16169_8, Arg16169_9, (new Shenjs_freeze([Arg16169_1, Arg16169_2, Arg16169_3, Arg16169_4, Arg16169_5, Arg16169_6, Arg16169_7, Arg16169_8, Arg16169_9, Arg16169_10], function(Arg16171) {
  var Arg16171_0 = Arg16171[0], Arg16171_1 = Arg16171[1], Arg16171_2 = Arg16171[2], Arg16171_3 = Arg16171[3], Arg16171_4 = Arg16171[4], Arg16171_5 = Arg16171[5], Arg16171_6 = Arg16171[6], Arg16171_7 = Arg16171[7], Arg16171_8 = Arg16171[8], Arg16171_9 = Arg16171[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16171_5, shenjs_call(shen_placeholder, []), Arg16171_8, (new Shenjs_freeze([Arg16171_1, Arg16171_2, Arg16171_3, Arg16171_4, Arg16171_5, Arg16171_6, Arg16171_7, Arg16171_8, Arg16171_9], function(Arg16173) {
  var Arg16173_0 = Arg16173[0], Arg16173_1 = Arg16173[1], Arg16173_2 = Arg16173[2], Arg16173_3 = Arg16173[3], Arg16173_4 = Arg16173[4], Arg16173_5 = Arg16173[5], Arg16173_6 = Arg16173[6], Arg16173_7 = Arg16173[7], Arg16173_8 = Arg16173[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16173_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg16173_4, Arg16173_7]), shenjs_call(shen_lazyderef, [Arg16173_0, Arg16173_7]), shenjs_call(shen_lazyderef, [Arg16173_1, Arg16173_7])]), Arg16173_7, (new Shenjs_freeze([Arg16173_0, Arg16173_1, Arg16173_2, Arg16173_3, Arg16173_4, Arg16173_5, Arg16173_6, Arg16173_7, Arg16173_8], function(Arg16175) {
  var Arg16175_0 = Arg16175[0], Arg16175_1 = Arg16175[1], Arg16175_2 = Arg16175[2], Arg16175_3 = Arg16175[3], Arg16175_4 = Arg16175[4], Arg16175_5 = Arg16175[5], Arg16175_6 = Arg16175[6], Arg16175_7 = Arg16175[7], Arg16175_8 = Arg16175[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16175_2, Arg16175_3, [shen_type_cons, [shen_type_cons, Arg16175_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg16175_5, []]]], Arg16175_6], Arg16175_7, Arg16175_8]);});})}))]);});})}))]);});})}))]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16063_0, Arg16063_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "open"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R2[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "file"], R1)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg16063_1, Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "stream"], R4)))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R4, shen_type_cons))
  ? ((R2 = R4[1]),
  (R4 = shenjs_call(shen_lazyderef, [R4[2], Arg16063_3])),
  ((shenjs_empty$question$(R4))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R2, R3, Arg16063_3, (new Shenjs_freeze([R2, R3, R1, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16177) {
  var Arg16177_0 = Arg16177[0], Arg16177_1 = Arg16177[1], Arg16177_2 = Arg16177[2], Arg16177_3 = Arg16177[3], Arg16177_4 = Arg16177[4], Arg16177_5 = Arg16177[5], Arg16177_6 = Arg16177[6], Arg16177_7 = Arg16177[7], Arg16177_8 = Arg16177[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16177_3, Arg16177_7, (new Shenjs_freeze([Arg16177_3, Arg16177_2, Arg16177_6, Arg16177_7, Arg16177_8], function(Arg16179) {
  var Arg16179_0 = Arg16179[0], Arg16179_1 = Arg16179[1], Arg16179_2 = Arg16179[2], Arg16179_3 = Arg16179[3], Arg16179_4 = Arg16179[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16179_1, [shen_type_symbol, "string"], Arg16179_2, Arg16179_3, Arg16179_4]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [], Arg16063_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R2, R3, Arg16063_3, (new Shenjs_freeze([R2, R3, R1, R4, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16181) {
  var Arg16181_0 = Arg16181[0], Arg16181_1 = Arg16181[1], Arg16181_2 = Arg16181[2], Arg16181_3 = Arg16181[3], Arg16181_4 = Arg16181[4], Arg16181_5 = Arg16181[5], Arg16181_6 = Arg16181[6], Arg16181_7 = Arg16181[7], Arg16181_8 = Arg16181[8], Arg16181_9 = Arg16181[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16181_4, Arg16181_8, (new Shenjs_freeze([Arg16181_4, Arg16181_2, Arg16181_7, Arg16181_8, Arg16181_9], function(Arg16183) {
  var Arg16183_0 = Arg16183[0], Arg16183_1 = Arg16183[1], Arg16183_2 = Arg16183[2], Arg16183_3 = Arg16183[3], Arg16183_4 = Arg16183[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16183_1, [shen_type_symbol, "string"], Arg16183_2, Arg16183_3, Arg16183_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg16063_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_bindv, [R4, [shen_type_cons, R2, []], Arg16063_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R2, R3, Arg16063_3, (new Shenjs_freeze([R2, R3, R0, R1, Arg16063_2, Arg16063_4, R4, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16185) {
  var Arg16185_0 = Arg16185[0], Arg16185_1 = Arg16185[1], Arg16185_2 = Arg16185[2], Arg16185_3 = Arg16185[3], Arg16185_4 = Arg16185[4], Arg16185_5 = Arg16185[5], Arg16185_6 = Arg16185[6], Arg16185_7 = Arg16185[7], Arg16185_8 = Arg16185[8], Arg16185_9 = Arg16185[9], Arg16185_10 = Arg16185[10], Arg16185_11 = Arg16185[11], Arg16185_12 = Arg16185[12], Arg16185_13 = Arg16185[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16185_2, Arg16185_7, (new Shenjs_freeze([Arg16185_2, Arg16185_3, Arg16185_4, Arg16185_7, Arg16185_5], function(Arg16187) {
  var Arg16187_0 = Arg16187[0], Arg16187_1 = Arg16187[1], Arg16187_2 = Arg16187[2], Arg16187_3 = Arg16187[3], Arg16187_4 = Arg16187[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16187_1, [shen_type_symbol, "string"], Arg16187_2, Arg16187_3, Arg16187_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg16063_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [shen_type_symbol, "stream"], Arg16063_3]),
  (R3 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R5, R3, Arg16063_3, (new Shenjs_freeze([R5, R3, R1, R4, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16189) {
  var Arg16189_0 = Arg16189[0], Arg16189_1 = Arg16189[1], Arg16189_2 = Arg16189[2], Arg16189_3 = Arg16189[3], Arg16189_4 = Arg16189[4], Arg16189_5 = Arg16189[5], Arg16189_6 = Arg16189[6], Arg16189_7 = Arg16189[7], Arg16189_8 = Arg16189[8], Arg16189_9 = Arg16189[9], Arg16189_10 = Arg16189[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16189_5, Arg16189_4, (new Shenjs_freeze([Arg16189_5, Arg16189_2, Arg16189_8, Arg16189_4, Arg16189_9], function(Arg16191) {
  var Arg16191_0 = Arg16191[0], Arg16191_1 = Arg16191[1], Arg16191_2 = Arg16191[2], Arg16191_3 = Arg16191[3], Arg16191_4 = Arg16191[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16191_1, [shen_type_symbol, "string"], Arg16191_2, Arg16191_3, Arg16191_4]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg16063_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R5, R3, Arg16063_3, (new Shenjs_freeze([R5, R3, R1, R2, R4, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16193) {
  var Arg16193_0 = Arg16193[0], Arg16193_1 = Arg16193[1], Arg16193_2 = Arg16193[2], Arg16193_3 = Arg16193[3], Arg16193_4 = Arg16193[4], Arg16193_5 = Arg16193[5], Arg16193_6 = Arg16193[6], Arg16193_7 = Arg16193[7], Arg16193_8 = Arg16193[8], Arg16193_9 = Arg16193[9], Arg16193_10 = Arg16193[10], Arg16193_11 = Arg16193[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16193_6, Arg16193_5, (new Shenjs_freeze([Arg16193_6, Arg16193_2, Arg16193_9, Arg16193_5, Arg16193_10], function(Arg16195) {
  var Arg16195_0 = Arg16195[0], Arg16195_1 = Arg16195[1], Arg16195_2 = Arg16195[2], Arg16195_3 = Arg16195[3], Arg16195_4 = Arg16195[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16195_1, [shen_type_symbol, "string"], Arg16195_2, Arg16195_3, Arg16195_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg16063_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R5, []], Arg16063_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R5, R3, Arg16063_3, (new Shenjs_freeze([R5, R3, R0, R1, Arg16063_2, Arg16063_4, R2, Arg16063_3, R4, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16197) {
  var Arg16197_0 = Arg16197[0], Arg16197_1 = Arg16197[1], Arg16197_2 = Arg16197[2], Arg16197_3 = Arg16197[3], Arg16197_4 = Arg16197[4], Arg16197_5 = Arg16197[5], Arg16197_6 = Arg16197[6], Arg16197_7 = Arg16197[7], Arg16197_8 = Arg16197[8], Arg16197_9 = Arg16197[9], Arg16197_10 = Arg16197[10], Arg16197_11 = Arg16197[11], Arg16197_12 = Arg16197[12], Arg16197_13 = Arg16197[13], Arg16197_14 = Arg16197[14], Arg16197_15 = Arg16197[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16197_2, Arg16197_7, (new Shenjs_freeze([Arg16197_2, Arg16197_3, Arg16197_4, Arg16197_7, Arg16197_5], function(Arg16199) {
  var Arg16199_0 = Arg16199[0], Arg16199_1 = Arg16199[1], Arg16199_2 = Arg16199[2], Arg16199_3 = Arg16199[3], Arg16199_4 = Arg16199[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16199_1, [shen_type_symbol, "string"], Arg16199_2, Arg16199_3, Arg16199_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg16063_3]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R4, Arg16063_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "stream"], [shen_type_cons, R4, []]], Arg16063_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R4, R3, Arg16063_3, (new Shenjs_freeze([R4, R3, R0, R1, Arg16063_2, Arg16063_4, R2, Arg16063_3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16201) {
  var Arg16201_0 = Arg16201[0], Arg16201_1 = Arg16201[1], Arg16201_2 = Arg16201[2], Arg16201_3 = Arg16201[3], Arg16201_4 = Arg16201[4], Arg16201_5 = Arg16201[5], Arg16201_6 = Arg16201[6], Arg16201_7 = Arg16201[7], Arg16201_8 = Arg16201[8], Arg16201_9 = Arg16201[9], Arg16201_10 = Arg16201[10], Arg16201_11 = Arg16201[11], Arg16201_12 = Arg16201[12], Arg16201_13 = Arg16201[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16201_2, Arg16201_7, (new Shenjs_freeze([Arg16201_2, Arg16201_3, Arg16201_4, Arg16201_7, Arg16201_5], function(Arg16203) {
  var Arg16203_0 = Arg16203[0], Arg16203_1 = Arg16203[1], Arg16203_2 = Arg16203[2], Arg16203_3 = Arg16203[3], Arg16203_4 = Arg16203[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16203_1, [shen_type_symbol, "string"], Arg16203_2, Arg16203_3, Arg16203_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg16063_3]),
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
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16063_0, Arg16063_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "type"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg16063_3, (new Shenjs_freeze([R1, R3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16205) {
  var Arg16205_0 = Arg16205[0], Arg16205_1 = Arg16205[1], Arg16205_2 = Arg16205[2], Arg16205_3 = Arg16205[3], Arg16205_4 = Arg16205[4], Arg16205_5 = Arg16205[5], Arg16205_6 = Arg16205[6], Arg16205_7 = Arg16205[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify, [Arg16205_1, Arg16205_4, Arg16205_6, (new Shenjs_freeze([Arg16205_4, Arg16205_0, Arg16205_1, Arg16205_5, Arg16205_6, Arg16205_7], function(Arg16207) {
  var Arg16207_0 = Arg16207[0], Arg16207_1 = Arg16207[1], Arg16207_2 = Arg16207[2], Arg16207_3 = Arg16207[3], Arg16207_4 = Arg16207[4], Arg16207_5 = Arg16207[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16207_1, Arg16207_2, Arg16207_3, Arg16207_4, Arg16207_5]);});})}))]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16063_0, Arg16063_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "input+"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R2[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [R2, shenjs_call(shen_normalise_type, [shenjs_call(shen_lazyderef, [R1, Arg16063_3])]), Arg16063_3, (new Shenjs_freeze([R1, Arg16063_1, R2, Arg16063_3, Arg16063_4, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16209) {
  var Arg16209_0 = Arg16209[0], Arg16209_1 = Arg16209[1], Arg16209_2 = Arg16209[2], Arg16209_3 = Arg16209[3], Arg16209_4 = Arg16209[4], Arg16209_5 = Arg16209[5], Arg16209_6 = Arg16209[6], Arg16209_7 = Arg16209[7], Arg16209_8 = Arg16209[8], Arg16209_9 = Arg16209[9], Arg16209_10 = Arg16209[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify, [Arg16209_1, Arg16209_2, Arg16209_3, Arg16209_4]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16063_0, Arg16063_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "where"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg16063_3, (new Shenjs_freeze([R3, R1, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16211) {
  var Arg16211_0 = Arg16211[0], Arg16211_1 = Arg16211[1], Arg16211_2 = Arg16211[2], Arg16211_3 = Arg16211[3], Arg16211_4 = Arg16211[4], Arg16211_5 = Arg16211[5], Arg16211_6 = Arg16211[6], Arg16211_7 = Arg16211[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16211_1, [shen_type_symbol, "boolean"], Arg16211_5, Arg16211_6, (new Shenjs_freeze([Arg16211_2, Arg16211_0, Arg16211_4, Arg16211_1, Arg16211_5, Arg16211_6, Arg16211_7], function(Arg16213) {
  var Arg16213_0 = Arg16213[0], Arg16213_1 = Arg16213[1], Arg16213_2 = Arg16213[2], Arg16213_3 = Arg16213[3], Arg16213_4 = Arg16213[4], Arg16213_5 = Arg16213[5], Arg16213_6 = Arg16213[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16213_0, Arg16213_5, (new Shenjs_freeze([Arg16213_0, Arg16213_1, Arg16213_2, Arg16213_3, Arg16213_4, Arg16213_5, Arg16213_6], function(Arg16215) {
  var Arg16215_0 = Arg16215[0], Arg16215_1 = Arg16215[1], Arg16215_2 = Arg16215[2], Arg16215_3 = Arg16215[3], Arg16215_4 = Arg16215[4], Arg16215_5 = Arg16215[5], Arg16215_6 = Arg16215[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16215_1, Arg16215_2, [shen_type_cons, [shen_type_cons, Arg16215_3, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "verified"], []]]], Arg16215_4], Arg16215_5, Arg16215_6]);});})}))]);});})}))]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16063_0, Arg16063_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "set"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16063_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg16063_3, (new Shenjs_freeze([R1, R3, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16217) {
  var Arg16217_0 = Arg16217[0], Arg16217_1 = Arg16217[1], Arg16217_2 = Arg16217[2], Arg16217_3 = Arg16217[3], Arg16217_4 = Arg16217[4], Arg16217_5 = Arg16217[5], Arg16217_6 = Arg16217[6], Arg16217_7 = Arg16217[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [[shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, Arg16217_0, []]], Arg16217_4, Arg16217_5, Arg16217_6, (new Shenjs_freeze([Arg16217_0, Arg16217_1, Arg16217_4, Arg16217_5, Arg16217_6, Arg16217_7], function(Arg16219) {
  var Arg16219_0 = Arg16219[0], Arg16219_1 = Arg16219[1], Arg16219_2 = Arg16219[2], Arg16219_3 = Arg16219[3], Arg16219_4 = Arg16219[4], Arg16219_5 = Arg16219[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16219_1, Arg16219_2, Arg16219_3, Arg16219_4, Arg16219_5]);});})}))]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16063_0, Arg16063_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fail"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg16063_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg16063_1, Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R2)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg16063_4)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [shen_type_symbol, "symbol"], Arg16063_3]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg16063_4)))),
  shenjs_call(shen_unbindv, [R2, Arg16063_3]),
  R1)
  : false)))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_t$asterisk$_hyps, [Arg16063_2, R1, Arg16063_3, (new Shenjs_freeze([Arg16063_2, Arg16063_0, Arg16063_1, R1, Arg16063_3, Arg16063_4, R0, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16221) {
  var Arg16221_0 = Arg16221[0], Arg16221_1 = Arg16221[1], Arg16221_2 = Arg16221[2], Arg16221_3 = Arg16221[3], Arg16221_4 = Arg16221[4], Arg16221_5 = Arg16221[5], Arg16221_6 = Arg16221[6], Arg16221_7 = Arg16221[7], Arg16221_8 = Arg16221[8], Arg16221_9 = Arg16221[9], Arg16221_10 = Arg16221[10], Arg16221_11 = Arg16221[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16221_1, Arg16221_2, Arg16221_3, Arg16221_4, Arg16221_5]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16063_0, Arg16063_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "define"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg16063_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = R2[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg16063_3, (new Shenjs_freeze([R0, R1, R2, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4, Arg16063_0, Arg16063_1, Arg16063_2, Arg16063_3, Arg16063_4], function(Arg16223) {
  var Arg16223_0 = Arg16223[0], Arg16223_1 = Arg16223[1], Arg16223_2 = Arg16223[2], Arg16223_3 = Arg16223[3], Arg16223_4 = Arg16223[4], Arg16223_5 = Arg16223[5], Arg16223_6 = Arg16223[6], Arg16223_7 = Arg16223[7], Arg16223_8 = Arg16223[8], Arg16223_9 = Arg16223[9], Arg16223_10 = Arg16223[10], Arg16223_11 = Arg16223[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_def, [[shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg16223_1, Arg16223_2]], Arg16223_3, Arg16223_4, Arg16223_5, Arg16223_6]);});})}))]))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16063_0, Arg16063_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R1[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-process-datatype"], R1)))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg16063_1, Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R1)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg16063_4)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [shen_type_symbol, "symbol"], Arg16063_3]),
  (R0 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg16063_4)))),
  shenjs_call(shen_unbindv, [R1, Arg16063_3]),
  R0)
  : false)))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16063_0, Arg16063_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R1[1], Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-synonyms-help"], R1)))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg16063_1, Arg16063_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R1)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg16063_4)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [shen_type_symbol, "symbol"], Arg16063_3]),
  (R0 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg16063_4)))),
  shenjs_call(shen_unbindv, [R1, Arg16063_3]),
  R0)
  : false)))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = shenjs_call(shen_newpv, [Arg16063_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [R1, (shenjs_globals["shen_shen-*datatypes*"]), Arg16063_3, (new Shenjs_freeze([Arg16063_0, Arg16063_1, Arg16063_2, R1, Arg16063_3, Arg16063_4], function(Arg16225) {
  var Arg16225_0 = Arg16225[0], Arg16225_1 = Arg16225[1], Arg16225_2 = Arg16225[2], Arg16225_3 = Arg16225[3], Arg16225_4 = Arg16225[4], Arg16225_5 = Arg16225[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_udefs$asterisk$, [[shen_type_cons, Arg16225_0, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg16225_1, []]]], Arg16225_2, Arg16225_3, Arg16225_4, Arg16225_5]);});})}))]))
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
  function shen_user_lambda16228(Arg16227) {
  if (Arg16227.length < 4) return [shen_type_func, shen_user_lambda16228, 4, Arg16227];
  var Arg16227_0 = Arg16227[0], Arg16227_1 = Arg16227[1], Arg16227_2 = Arg16227[2], Arg16227_3 = Arg16227[3];
  var R0, R1, R2, R3, R4, R5, R6, R7;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg16227_0, Arg16227_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg16227_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg16227_2])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[1], Arg16227_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[2], Arg16227_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R2 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg16227_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg16227_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg16227_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R1[1], Arg16227_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "list"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R1[2], Arg16227_2])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R1 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg16227_2])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R5, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg16227_2]),
  (R4 = ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R5, Arg16227_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg16227_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg16227_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R1 = shenjs_call(shen_newpv, [Arg16227_2])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, R1, []], Arg16227_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg16227_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [shen_type_symbol, "list"], Arg16227_2]),
  (R4 = ((R1 = shenjs_call(shen_lazyderef, [R1[2], Arg16227_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R6 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg16227_2])),
  ((shenjs_empty$question$(R1))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R6 = ((R1 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R1, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg16227_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg16227_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg16227_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R6, []], Arg16227_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg16227_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg16227_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg16227_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, R5, []]], Arg16227_2]),
  (R5 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R5 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg16227_2]),
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
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg16227_0, Arg16227_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg16227_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg16227_2])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[1], Arg16227_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@p"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[2], Arg16227_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R2 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg16227_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg16227_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg16227_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R5 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg16227_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R6 = shenjs_call(shen_lazyderef, [R1[1], Arg16227_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "*"], R6)))
  ? ((R6 = shenjs_call(shen_lazyderef, [R1[2], Arg16227_2])),
  ((shenjs_is_type(R6, shen_type_cons))
  ? ((R1 = R6[1]),
  (R6 = shenjs_call(shen_lazyderef, [R6[2], Arg16227_2])),
  ((shenjs_empty$question$(R6))
  ? ((R6 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R6))
  ? ((R6 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]]], shenjs_call(shen_lazyderef, [R6, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? (shenjs_call(shen_bindv, [R6, [], Arg16227_2]),
  (R5 = ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R6, Arg16227_2]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? (shenjs_call(shen_bindv, [R6, [], Arg16227_2]),
  (R5 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R5 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R6, Arg16227_2]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? ((R1 = shenjs_call(shen_newpv, [Arg16227_2])),
  shenjs_call(shen_bindv, [R6, [shen_type_cons, R1, []], Arg16227_2]),
  (R5 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R5 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R6, Arg16227_2]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? (shenjs_call(shen_bindv, [R6, [shen_type_symbol, "*"], Arg16227_2]),
  (R5 = ((R1 = shenjs_call(shen_lazyderef, [R1[2], Arg16227_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R7 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg16227_2])),
  ((shenjs_empty$question$(R1))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg16227_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R7 = ((R1 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg16227_2]), []]]], shenjs_call(shen_lazyderef, [R1, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg16227_2]),
  (R7 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg16227_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R7 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg16227_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R7)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg16227_2]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R7 = shenjs_call(shen_newpv, [Arg16227_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R7, []], Arg16227_2]),
  (R7 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg16227_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R7 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg16227_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R7)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg16227_2]),
  R7)
  : false)))),
  shenjs_call(shen_unbindv, [R6, Arg16227_2]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg16227_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, R6, []]], Arg16227_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg16227_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg16227_2])),
  (R6 = shenjs_call(shen_newpv, [Arg16227_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R5, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, R6, []]]], Arg16227_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg16227_2]),
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
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg16227_0, Arg16227_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg16227_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg16227_2])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[1], Arg16227_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@v"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[2], Arg16227_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R2 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg16227_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg16227_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg16227_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R1[1], Arg16227_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "vector"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R1[2], Arg16227_2])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R1 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg16227_2])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R5, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg16227_2]),
  (R4 = ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R5, Arg16227_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg16227_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg16227_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R1 = shenjs_call(shen_newpv, [Arg16227_2])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, R1, []], Arg16227_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg16227_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [shen_type_symbol, "vector"], Arg16227_2]),
  (R4 = ((R1 = shenjs_call(shen_lazyderef, [R1[2], Arg16227_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R6 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg16227_2])),
  ((shenjs_empty$question$(R1))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R6 = ((R1 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R1, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg16227_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg16227_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg16227_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R6, []], Arg16227_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg16227_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg16227_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg16227_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, R5, []]], Arg16227_2]),
  (R5 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R5 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg16227_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg16227_2]),
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
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg16227_0, Arg16227_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg16227_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg16227_2])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[1], Arg16227_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[2], Arg16227_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R2 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg16227_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg16227_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg16227_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "string"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R4 = ((R1 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], shenjs_call(shen_lazyderef, [R1, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [shen_type_symbol, "string"], Arg16227_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16227_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], shenjs_call(shen_lazyderef, [R3, Arg16227_2])]], Arg16227_2, Arg16227_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg16227_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16227_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg16227_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], shenjs_call(shen_lazyderef, [R0, Arg16227_2])]], Arg16227_2, Arg16227_3]))),
  shenjs_call(shen_unbindv, [R3, Arg16227_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg16227_2]),
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
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg16227_0, Arg16227_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = R0[1]),
  (R0 = R0[2]),
  (R2 = shenjs_call(shen_newpv, [Arg16227_2])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [Arg16227_1, [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16227_2]), shenjs_call(shen_lazyderef, [R2, Arg16227_2])], Arg16227_2, (new Shenjs_freeze([Arg16227_1, R1, R0, R2, Arg16227_2, Arg16227_3], function(Arg16229) {
  var Arg16229_0 = Arg16229[0], Arg16229_1 = Arg16229[1], Arg16229_2 = Arg16229[2], Arg16229_3 = Arg16229[3], Arg16229_4 = Arg16229[4], Arg16229_5 = Arg16229[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_hyps, [Arg16229_2, Arg16229_3, Arg16229_4, Arg16229_5]);});})}))]);}))
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
  function shen_user_lambda16232(Arg16231) {
  if (Arg16231.length < 4) return [shen_type_func, shen_user_lambda16232, 4, Arg16231];
  var Arg16231_0 = Arg16231[0], Arg16231_1 = Arg16231[1], Arg16231_2 = Arg16231[2], Arg16231_3 = Arg16231[3];
  return (((shenjs_globals["shen_shen-*spy*"]))
  ? (shenjs_call(shen_line, []),
  shenjs_call(shen_show_p, [shenjs_call(shen_deref, [Arg16231_0, Arg16231_2])]),
  shenjs_call(shen_nl, [1]),
  shenjs_call(shen_nl, [1]),
  shenjs_call(shen_show_assumptions, [shenjs_call(shen_deref, [Arg16231_1, Arg16231_2]), 1]),
  shenjs_call(shen_intoutput, ["~%> ", []]),
  shenjs_call(shen_pause_for_user, [(shenjs_globals["shen_*language*"])]),
  shenjs_thaw(Arg16231_3))
  : shenjs_thaw(Arg16231_3))},
  4,
  [],
  "shen-show"];
shenjs_functions["shen_shen-show"] = shen_show;






shen_line = [shen_type_func,
  function shen_user_lambda16234(Arg16233) {
  if (Arg16233.length < 0) return [shen_type_func, shen_user_lambda16234, 0, Arg16233];
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
  function shen_user_lambda16236(Arg16235) {
  if (Arg16235.length < 1) return [shen_type_func, shen_user_lambda16236, 1, Arg16235];
  var Arg16235_0 = Arg16235[0];
  return (((shenjs_is_type(Arg16235_0, shen_type_cons) && (shenjs_is_type(Arg16235_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], Arg16235_0[2][1])) && (shenjs_is_type(Arg16235_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg16235_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_intoutput, ["~R : ~R", [shen_tuple, Arg16235_0[1], [shen_tuple, Arg16235_0[2][2][1], []]]]);})
  : (function() {
  return shenjs_call_tail(shen_intoutput, ["~R", [shen_tuple, Arg16235_0, []]]);}))},
  1,
  [],
  "shen-show-p"];
shenjs_functions["shen_shen-show-p"] = shen_show_p;






shen_show_assumptions = [shen_type_func,
  function shen_user_lambda16238(Arg16237) {
  if (Arg16237.length < 2) return [shen_type_func, shen_user_lambda16238, 2, Arg16237];
  var Arg16237_0 = Arg16237[0], Arg16237_1 = Arg16237[1];
  return ((shenjs_empty$question$(Arg16237_0))
  ? [shen_type_symbol, "shen-skip"]
  : ((shenjs_is_type(Arg16237_0, shen_type_cons))
  ? (shenjs_call(shen_intoutput, ["~A. ", [shen_tuple, Arg16237_1, []]]),
  shenjs_call(shen_show_p, [Arg16237_0[1]]),
  shenjs_call(shen_nl, [1]),
  (function() {
  return shenjs_call_tail(shen_show_assumptions, [Arg16237_0[2], (Arg16237_1 + 1)]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "shen-show-assumptions"]]);})))},
  2,
  [],
  "shen-show-assumptions"];
shenjs_functions["shen_shen-show-assumptions"] = shen_show_assumptions;






shen_pause_for_user = [shen_type_func,
  function shen_user_lambda16240(Arg16239) {
  if (Arg16239.length < 1) return [shen_type_func, shen_user_lambda16240, 1, Arg16239];
  var Arg16239_0 = Arg16239[0];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$("Common Lisp", Arg16239_0)))
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
  function shen_user_lambda16242(Arg16241) {
  if (Arg16241.length < 0) return [shen_type_func, shen_user_lambda16242, 0, Arg16241];
  return (function() {
  return shenjs_call_tail(shen_read_char_h, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), 0]);})},
  0,
  [],
  "shen-read-char"];
shenjs_functions["shen_shen-read-char"] = shen_read_char;






shen_read_char_h = [shen_type_func,
  function shen_user_lambda16244(Arg16243) {
  if (Arg16243.length < 2) return [shen_type_func, shen_user_lambda16244, 2, Arg16243];
  var Arg16243_0 = Arg16243[0], Arg16243_1 = Arg16243[1];
  return (((shenjs_unwind_tail(shenjs_$eq$(-1, Arg16243_0)) && shenjs_unwind_tail(shenjs_$eq$(0, Arg16243_1))))
  ? (function() {
  return shenjs_call_tail(shen_read_char_h, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), 1]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(0, Arg16243_1)))
  ? (function() {
  return shenjs_call_tail(shen_read_char_h, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), 0]);})
  : (((shenjs_unwind_tail(shenjs_$eq$(-1, Arg16243_0)) && shenjs_unwind_tail(shenjs_$eq$(1, Arg16243_1))))
  ? (function() {
  return shenjs_call_tail(shen_read_char_h, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), 1]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(1, Arg16243_1)))
  ? (function() {
  return shenjs_call_tail(shen_byte_$gt$string, [Arg16243_0]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "shen-read-char-h"]]);})))))},
  2,
  [],
  "shen-read-char-h"];
shenjs_functions["shen_shen-read-char-h"] = shen_read_char_h;






shen_typedf$question$ = [shen_type_func,
  function shen_user_lambda16246(Arg16245) {
  if (Arg16245.length < 1) return [shen_type_func, shen_user_lambda16246, 1, Arg16245];
  var Arg16245_0 = Arg16245[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg16245_0, (shenjs_globals["shen_shen-*signedfuncs*"])]);})},
  1,
  [],
  "shen-typedf?"];
shenjs_functions["shen_shen-typedf?"] = shen_typedf$question$;






shen_sigf = [shen_type_func,
  function shen_user_lambda16248(Arg16247) {
  if (Arg16247.length < 1) return [shen_type_func, shen_user_lambda16248, 1, Arg16247];
  var Arg16247_0 = Arg16247[0];
  return (function() {
  return shenjs_call_tail(shen_concat, [[shen_type_symbol, "shen-type-signature-of-"], Arg16247_0]);})},
  1,
  [],
  "shen-sigf"];
shenjs_functions["shen_shen-sigf"] = shen_sigf;






shen_placeholder = [shen_type_func,
  function shen_user_lambda16250(Arg16249) {
  if (Arg16249.length < 0) return [shen_type_func, shen_user_lambda16250, 0, Arg16249];
  return (function() {
  return shenjs_call_tail(shen_gensym, [[shen_type_symbol, "&&"]]);})},
  0,
  [],
  "shen-placeholder"];
shenjs_functions["shen_shen-placeholder"] = shen_placeholder;






shen_base = [shen_type_func,
  function shen_user_lambda16252(Arg16251) {
  if (Arg16251.length < 4) return [shen_type_func, shen_user_lambda16252, 4, Arg16251];
  var Arg16251_0 = Arg16251[0], Arg16251_1 = Arg16251[1], Arg16251_2 = Arg16251[2], Arg16251_3 = Arg16251[3];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg16251_1, Arg16251_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "number"], R0)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [(typeof(shenjs_call(shen_lazyderef, [Arg16251_0, Arg16251_2])) == 'number'), Arg16251_2, Arg16251_3]))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [shen_type_symbol, "number"], Arg16251_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [(typeof(shenjs_call(shen_lazyderef, [Arg16251_0, Arg16251_2])) == 'number'), Arg16251_2, Arg16251_3]))),
  shenjs_call(shen_unbindv, [R0, Arg16251_2]),
  R1)
  : false)))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg16251_1, Arg16251_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "boolean"], R0)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_boolean$question$(shenjs_call(shen_lazyderef, [Arg16251_0, Arg16251_2])), Arg16251_2, Arg16251_3]))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [shen_type_symbol, "boolean"], Arg16251_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_boolean$question$(shenjs_call(shen_lazyderef, [Arg16251_0, Arg16251_2])), Arg16251_2, Arg16251_3]))),
  shenjs_call(shen_unbindv, [R0, Arg16251_2]),
  R1)
  : false)))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg16251_1, Arg16251_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "string"], R0)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [(typeof(shenjs_call(shen_lazyderef, [Arg16251_0, Arg16251_2])) == 'string'), Arg16251_2, Arg16251_3]))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [shen_type_symbol, "string"], Arg16251_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [(typeof(shenjs_call(shen_lazyderef, [Arg16251_0, Arg16251_2])) == 'string'), Arg16251_2, Arg16251_3]))),
  shenjs_call(shen_unbindv, [R0, Arg16251_2]),
  R1)
  : false)))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg16251_1, Arg16251_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R0)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_is_type(shenjs_call(shen_lazyderef, [Arg16251_0, Arg16251_2]), shen_type_symbol), Arg16251_2, (new Shenjs_freeze([Arg16251_0, Arg16251_1, Arg16251_3, Arg16251_2], function(Arg16253) {
  var Arg16253_0 = Arg16253[0], Arg16253_1 = Arg16253[1], Arg16253_2 = Arg16253[2], Arg16253_3 = Arg16253[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [(!shenjs_call(shen_placeholder$question$, [shenjs_call(shen_lazyderef, [Arg16253_0, Arg16253_3])])), Arg16253_3, Arg16253_2]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [shen_type_symbol, "symbol"], Arg16251_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_is_type(shenjs_call(shen_lazyderef, [Arg16251_0, Arg16251_2]), shen_type_symbol), Arg16251_2, (new Shenjs_freeze([R0, Arg16251_0, Arg16251_1, Arg16251_3, Arg16251_2], function(Arg16255) {
  var Arg16255_0 = Arg16255[0], Arg16255_1 = Arg16255[1], Arg16255_2 = Arg16255[2], Arg16255_3 = Arg16255[3], Arg16255_4 = Arg16255[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [(!shenjs_call(shen_placeholder$question$, [shenjs_call(shen_lazyderef, [Arg16255_1, Arg16255_4])])), Arg16255_4, Arg16255_3]);});})}))]))),
  shenjs_call(shen_unbindv, [R0, Arg16251_2]),
  R1)
  : false)))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg16251_0, Arg16251_2])),
  ((shenjs_empty$question$(R0))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg16251_1, Arg16251_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg16251_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "list"], R1)))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[2], Arg16251_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? (R1[1],
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg16251_2])),
  ((shenjs_empty$question$(R1))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_thaw(Arg16251_3))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg16251_2]),
  (R0 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg16251_3)))),
  shenjs_call(shen_unbindv, [R1, Arg16251_2]),
  R0)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R0 = shenjs_call(shen_newpv, [Arg16251_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R0, []], Arg16251_2]),
  (R0 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg16251_3)))),
  shenjs_call(shen_unbindv, [R1, Arg16251_2]),
  R0)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [shen_type_symbol, "list"], Arg16251_2]),
  (R0 = ((R0 = shenjs_call(shen_lazyderef, [R0[2], Arg16251_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? (R0[1],
  (R0 = shenjs_call(shen_lazyderef, [R0[2], Arg16251_2])),
  ((shenjs_empty$question$(R0))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg16251_3)))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [], Arg16251_2]),
  (R2 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg16251_3)))),
  shenjs_call(shen_unbindv, [R0, Arg16251_2]),
  R2)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg16251_2])),
  shenjs_call(shen_bindv, [R0, [shen_type_cons, R2, []], Arg16251_2]),
  (R2 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg16251_3)))),
  shenjs_call(shen_unbindv, [R0, Arg16251_2]),
  R2)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg16251_2]),
  R0)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? ((R1 = shenjs_call(shen_newpv, [Arg16251_2])),
  shenjs_call(shen_bindv, [R0, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, R1, []]], Arg16251_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg16251_3)))),
  shenjs_call(shen_unbindv, [R0, Arg16251_2]),
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
  function shen_user_lambda16258(Arg16257) {
  if (Arg16257.length < 1) return [shen_type_func, shen_user_lambda16258, 1, Arg16257];
  var Arg16257_0 = Arg16257[0];
  return (shenjs_is_type(Arg16257_0, shen_type_symbol) && shenjs_call(shen_placeholder_help$question$, [shenjs_str(Arg16257_0)]))},
  1,
  [],
  "shen-placeholder?"];
shenjs_functions["shen_shen-placeholder?"] = shen_placeholder$question$;






shen_placeholder_help$question$ = [shen_type_func,
  function shen_user_lambda16260(Arg16259) {
  if (Arg16259.length < 1) return [shen_type_func, shen_user_lambda16260, 1, Arg16259];
  var Arg16259_0 = Arg16259[0];
  return (((shenjs_call(shen_$plus$string$question$, [Arg16259_0]) && (shenjs_unwind_tail(shenjs_$eq$("&", Arg16259_0[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(Arg16259_0)]) && shenjs_unwind_tail(shenjs_$eq$("&", shenjs_tlstr(Arg16259_0)[0]))))))
  ? true
  : false)},
  1,
  [],
  "shen-placeholder-help?"];
shenjs_functions["shen_shen-placeholder-help?"] = shen_placeholder_help$question$;






shen_by$_hypothesis = [shen_type_func,
  function shen_user_lambda16262(Arg16261) {
  if (Arg16261.length < 5) return [shen_type_func, shen_user_lambda16262, 5, Arg16261];
  var Arg16261_0 = Arg16261[0], Arg16261_1 = Arg16261[1], Arg16261_2 = Arg16261[2], Arg16261_3 = Arg16261[3], Arg16261_4 = Arg16261[4];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg16261_2, Arg16261_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R0 = shenjs_call(shen_lazyderef, [R0[1], Arg16261_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = R0[1]),
  (R0 = shenjs_call(shen_lazyderef, [R0[2], Arg16261_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R0[1], Arg16261_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R0[2], Arg16261_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R0 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg16261_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_identical, [Arg16261_0, R1, Arg16261_3, (new Shenjs_freeze([R1, R0, Arg16261_2, Arg16261_0, Arg16261_1, Arg16261_3, Arg16261_4], function(Arg16263) {
  var Arg16263_0 = Arg16263[0], Arg16263_1 = Arg16263[1], Arg16263_2 = Arg16263[2], Arg16263_3 = Arg16263[3], Arg16263_4 = Arg16263[4], Arg16263_5 = Arg16263[5], Arg16263_6 = Arg16263[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg16263_4, Arg16263_1, Arg16263_5, Arg16263_6]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg16261_2, Arg16261_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_by$_hypothesis, [Arg16261_0, Arg16261_1, R0, Arg16261_3, Arg16261_4]);}))
  : false))
  : R0))},
  5,
  [],
  "shen-by_hypothesis"];
shenjs_functions["shen_shen-by_hypothesis"] = shen_by$_hypothesis;






shen_t$asterisk$_def = [shen_type_func,
  function shen_user_lambda16266(Arg16265) {
  if (Arg16265.length < 5) return [shen_type_func, shen_user_lambda16266, 5, Arg16265];
  var Arg16265_0 = Arg16265[0], Arg16265_1 = Arg16265[1], Arg16265_2 = Arg16265[2], Arg16265_3 = Arg16265[3], Arg16265_4 = Arg16265[4];
  var R0, R1, R2, R3, R4, R5, R6, R7, R8, R9;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = shenjs_call(shen_lazyderef, [Arg16265_0, Arg16265_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg16265_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "define"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg16265_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = R2[2]),
  (R3 = shenjs_call(shen_newpv, [Arg16265_3])),
  (R4 = shenjs_call(shen_newpv, [Arg16265_3])),
  (R5 = shenjs_call(shen_newpv, [Arg16265_3])),
  (R6 = shenjs_call(shen_newpv, [Arg16265_3])),
  (R7 = shenjs_call(shen_newpv, [Arg16265_3])),
  (R8 = shenjs_call(shen_newpv, [Arg16265_3])),
  (R9 = shenjs_call(shen_newpv, [Arg16265_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [R4, shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda16268(Arg16267) {
  if (Arg16267.length < 1) return [shen_type_func, shen_user_lambda16268, 1, Arg16267];
  var Arg16267_0 = Arg16267[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$sig$plus$rules$gt$, [Arg16267_0]);})},
  1,
  []], shenjs_call(shen_lazyderef, [R2, Arg16265_3]), []]), Arg16265_3, (new Shenjs_freeze([R2, R3, R4, R5, R0, R6, R7, Arg16265_2, R8, R1, Arg16265_1, R9, Arg16265_3, Arg16265_4], function(Arg16269) {
  var Arg16269_0 = Arg16269[0], Arg16269_1 = Arg16269[1], Arg16269_2 = Arg16269[2], Arg16269_3 = Arg16269[3], Arg16269_4 = Arg16269[4], Arg16269_5 = Arg16269[5], Arg16269_6 = Arg16269[6], Arg16269_7 = Arg16269[7], Arg16269_8 = Arg16269[8], Arg16269_9 = Arg16269[9], Arg16269_10 = Arg16269[10], Arg16269_11 = Arg16269[11], Arg16269_12 = Arg16269[12], Arg16269_13 = Arg16269[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16269_1, ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_lazyderef, [Arg16269_2, Arg16269_12]), shen_fail_obj)))
  ? shenjs_call(shen_errordef, [shenjs_call(shen_lazyderef, [Arg16269_9, Arg16269_12])])
  : [shen_type_symbol, "shen-skip"]), Arg16269_12, (new Shenjs_freeze([Arg16269_1, Arg16269_2, Arg16269_3, Arg16269_4, Arg16269_5, Arg16269_6, Arg16269_7, Arg16269_8, Arg16269_9, Arg16269_10, Arg16269_11, Arg16269_12, Arg16269_13], function(Arg16271) {
  var Arg16271_0 = Arg16271[0], Arg16271_1 = Arg16271[1], Arg16271_2 = Arg16271[2], Arg16271_3 = Arg16271[3], Arg16271_4 = Arg16271[4], Arg16271_5 = Arg16271[5], Arg16271_6 = Arg16271[6], Arg16271_7 = Arg16271[7], Arg16271_8 = Arg16271[8], Arg16271_9 = Arg16271[9], Arg16271_10 = Arg16271[10], Arg16271_11 = Arg16271[11], Arg16271_12 = Arg16271[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16271_10, shenjs_call(shen_lazyderef, [Arg16271_1, Arg16271_11])[1], Arg16271_11, (new Shenjs_freeze([Arg16271_1, Arg16271_2, Arg16271_3, Arg16271_4, Arg16271_5, Arg16271_6, Arg16271_7, Arg16271_8, Arg16271_9, Arg16271_10, Arg16271_11, Arg16271_12], function(Arg16273) {
  var Arg16273_0 = Arg16273[0], Arg16273_1 = Arg16273[1], Arg16273_2 = Arg16273[2], Arg16273_3 = Arg16273[3], Arg16273_4 = Arg16273[4], Arg16273_5 = Arg16273[5], Arg16273_6 = Arg16273[6], Arg16273_7 = Arg16273[7], Arg16273_8 = Arg16273[8], Arg16273_9 = Arg16273[9], Arg16273_10 = Arg16273[10], Arg16273_11 = Arg16273[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16273_3, shenjs_call(shen_lazyderef, [Arg16273_0, Arg16273_10])[2], Arg16273_10, (new Shenjs_freeze([Arg16273_0, Arg16273_1, Arg16273_2, Arg16273_3, Arg16273_4, Arg16273_5, Arg16273_6, Arg16273_7, Arg16273_8, Arg16273_9, Arg16273_10, Arg16273_11], function(Arg16275) {
  var Arg16275_0 = Arg16275[0], Arg16275_1 = Arg16275[1], Arg16275_2 = Arg16275[2], Arg16275_3 = Arg16275[3], Arg16275_4 = Arg16275[4], Arg16275_5 = Arg16275[5], Arg16275_6 = Arg16275[6], Arg16275_7 = Arg16275[7], Arg16275_8 = Arg16275[8], Arg16275_9 = Arg16275[9], Arg16275_10 = Arg16275[10], Arg16275_11 = Arg16275[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16275_1, shenjs_call(shen_extract$_vars, [shenjs_call(shen_lazyderef, [Arg16275_9, Arg16275_10])]), Arg16275_10, (new Shenjs_freeze([Arg16275_1, Arg16275_2, Arg16275_3, Arg16275_4, Arg16275_5, Arg16275_6, Arg16275_7, Arg16275_8, Arg16275_9, Arg16275_10, Arg16275_11], function(Arg16277) {
  var Arg16277_0 = Arg16277[0], Arg16277_1 = Arg16277[1], Arg16277_2 = Arg16277[2], Arg16277_3 = Arg16277[3], Arg16277_4 = Arg16277[4], Arg16277_5 = Arg16277[5], Arg16277_6 = Arg16277[6], Arg16277_7 = Arg16277[7], Arg16277_8 = Arg16277[8], Arg16277_9 = Arg16277[9], Arg16277_10 = Arg16277[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16277_3, shenjs_call(shen_placeholders, [shenjs_call(shen_lazyderef, [Arg16277_8, Arg16277_9]), shenjs_call(shen_lazyderef, [Arg16277_0, Arg16277_9])]), Arg16277_9, (new Shenjs_freeze([Arg16277_0, Arg16277_1, Arg16277_2, Arg16277_3, Arg16277_4, Arg16277_5, Arg16277_6, Arg16277_7, Arg16277_8, Arg16277_9, Arg16277_10], function(Arg16279) {
  var Arg16279_0 = Arg16279[0], Arg16279_1 = Arg16279[1], Arg16279_2 = Arg16279[2], Arg16279_3 = Arg16279[3], Arg16279_4 = Arg16279[4], Arg16279_5 = Arg16279[5], Arg16279_6 = Arg16279[6], Arg16279_7 = Arg16279[7], Arg16279_8 = Arg16279[8], Arg16279_9 = Arg16279[9], Arg16279_10 = Arg16279[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16279_1, Arg16279_9, (new Shenjs_freeze([Arg16279_1, Arg16279_2, Arg16279_3, Arg16279_4, Arg16279_5, Arg16279_6, Arg16279_7, Arg16279_8, Arg16279_9, Arg16279_10], function(Arg16281) {
  var Arg16281_0 = Arg16281[0], Arg16281_1 = Arg16281[1], Arg16281_2 = Arg16281[2], Arg16281_3 = Arg16281[3], Arg16281_4 = Arg16281[4], Arg16281_5 = Arg16281[5], Arg16281_6 = Arg16281[6], Arg16281_7 = Arg16281[7], Arg16281_8 = Arg16281[8], Arg16281_9 = Arg16281[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_rules, [Arg16281_1, Arg16281_2, 1, Arg16281_5, [shen_type_cons, [shen_type_cons, Arg16281_5, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg16281_2, []]]], Arg16281_3], Arg16281_8, (new Shenjs_freeze([Arg16281_1, Arg16281_2, Arg16281_3, Arg16281_4, Arg16281_5, Arg16281_6, Arg16281_7, Arg16281_8, Arg16281_9], function(Arg16283) {
  var Arg16283_0 = Arg16283[0], Arg16283_1 = Arg16283[1], Arg16283_2 = Arg16283[2], Arg16283_3 = Arg16283[3], Arg16283_4 = Arg16283[4], Arg16283_5 = Arg16283[5], Arg16283_6 = Arg16283[6], Arg16283_7 = Arg16283[7], Arg16283_8 = Arg16283[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16283_3, shenjs_call(shen_declare, [shenjs_call(shen_lazyderef, [Arg16283_4, Arg16283_7]), shenjs_call(shen_lazyderef, [Arg16283_6, Arg16283_7])]), Arg16283_7, (new Shenjs_freeze([Arg16283_3, Arg16283_4, Arg16283_5, Arg16283_6, Arg16283_7, Arg16283_8], function(Arg16285) {
  var Arg16285_0 = Arg16285[0], Arg16285_1 = Arg16285[1], Arg16285_2 = Arg16285[2], Arg16285_3 = Arg16285[3], Arg16285_4 = Arg16285[4], Arg16285_5 = Arg16285[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg16285_2, Arg16285_3, Arg16285_4, Arg16285_5]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))
  : false))
  : false))
  : false))]);}))},
  5,
  [],
  "shen-t*-def"];
shenjs_functions["shen_shen-t*-def"] = shen_t$asterisk$_def;






shen_$lt$sig$plus$rules$gt$ = [shen_type_func,
  function shen_user_lambda16288(Arg16287) {
  if (Arg16287.length < 1) return [shen_type_func, shen_user_lambda16288, 1, Arg16287];
  var Arg16287_0 = Arg16287[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$signature$gt$, [Arg16287_0])),
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
  function shen_user_lambda16290(Arg16289) {
  if (Arg16289.length < 2) return [shen_type_func, shen_user_lambda16290, 2, Arg16289];
  var Arg16289_0 = Arg16289[0], Arg16289_1 = Arg16289[1];
  return ((shenjs_is_type(Arg16289_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda16292(Arg16291) {
  if (Arg16291.length < 2) return [shen_type_func, shen_user_lambda16292, 2, Arg16291];
  var Arg16291_0 = Arg16291[0], Arg16291_1 = Arg16291[1];
  return (function() {
  return shenjs_call_tail(shen_placeholders, [Arg16291_1, Arg16291_0]);})},
  2,
  [Arg16289_1]], Arg16289_0]);})
  : ((shenjs_call(shen_element$question$, [Arg16289_0, Arg16289_1]))
  ? (function() {
  return shenjs_call_tail(shen_concat, [[shen_type_symbol, "&&"], Arg16289_0]);})
  : Arg16289_0))},
  2,
  [],
  "shen-placeholders"];
shenjs_functions["shen_shen-placeholders"] = shen_placeholders;






shen_$lt$trules$gt$ = [shen_type_func,
  function shen_user_lambda16294(Arg16293) {
  if (Arg16293.length < 1) return [shen_type_func, shen_user_lambda16294, 1, Arg16293];
  var Arg16293_0 = Arg16293[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$trule$gt$, [Arg16293_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$trules$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$trule$gt$, [Arg16293_0])),
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
  function shen_user_lambda16296(Arg16295) {
  if (Arg16295.length < 1) return [shen_type_func, shen_user_lambda16296, 1, Arg16295];
  var Arg16295_0 = Arg16295[0];
  var R0, R1, R2, R3, R4;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg16295_0])),
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
  function shen_user_lambda16298(Arg16297) {
  if (Arg16297.length < 4) return [shen_type_func, shen_user_lambda16298, 4, Arg16297];
  var Arg16297_0 = Arg16297[0], Arg16297_1 = Arg16297[1], Arg16297_2 = Arg16297[2], Arg16297_3 = Arg16297[3];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-forward"], Arg16297_1)))
  ? [shen_type_cons, Arg16297_0, [shen_type_cons, ((shenjs_unwind_tail(shenjs_$eq$(Arg16297_3, [shen_type_symbol, "shen-skip"])))
  ? Arg16297_2
  : [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, Arg16297_3, [shen_type_cons, Arg16297_2, []]]]), []]]
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-backward"], Arg16297_1)) && (shenjs_is_type(Arg16297_2, shen_type_cons) && (shenjs_is_type(Arg16297_2[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fail-if"], Arg16297_2[1][1])) && (shenjs_is_type(Arg16297_2[1][2], shen_type_cons) && (shenjs_empty$question$(Arg16297_2[1][2][2]) && (shenjs_is_type(Arg16297_2[2], shen_type_cons) && shenjs_empty$question$(Arg16297_2[2][2])))))))))
  ? [shen_type_cons, Arg16297_0, [shen_type_cons, ((shenjs_unwind_tail(shenjs_$eq$(Arg16297_3, [shen_type_symbol, "shen-skip"])))
  ? [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, Arg16297_2[1][2][1], Arg16297_2[2]], []]], Arg16297_2[2]]]
  : [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, Arg16297_3, []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, Arg16297_2[1][2][1], Arg16297_2[2]], []]], []]], Arg16297_2[2]]]), []]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-backward"], Arg16297_1)))
  ? [shen_type_cons, Arg16297_0, [shen_type_cons, ((shenjs_unwind_tail(shenjs_$eq$(Arg16297_3, [shen_type_symbol, "shen-skip"])))
  ? [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "=="], [shen_type_cons, Arg16297_2, []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]], []]], [shen_type_cons, Arg16297_2, []]]]
  : [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, Arg16297_3, []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "=="], [shen_type_cons, Arg16297_2, []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]], []]], []]], [shen_type_cons, Arg16297_2, []]]]), []]]
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "shen-form-rule"]]);}))))},
  4,
  [],
  "shen-form-rule"];
shenjs_functions["shen_shen-form-rule"] = shen_form_rule;






shen_$lt$guard$question$$gt$ = [shen_type_func,
  function shen_user_lambda16300(Arg16299) {
  if (Arg16299.length < 1) return [shen_type_func, shen_user_lambda16300, 1, Arg16299];
  var Arg16299_0 = Arg16299[0];
  var R0;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg16299_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "where"], shenjs_call(shen_fst, [Arg16299_0])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$guard$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg16299_0])[2], shenjs_call(shen_snd, [Arg16299_0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg16299_0])),
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
  function shen_user_lambda16302(Arg16301) {
  if (Arg16301.length < 1) return [shen_type_func, shen_user_lambda16302, 1, Arg16301];
  var Arg16301_0 = Arg16301[0];
  var R0;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg16301_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "->"], shenjs_call(shen_fst, [Arg16301_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg16301_0])[2], shenjs_call(shen_snd, [Arg16301_0])])]), [shen_type_symbol, "shen-forward"]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg16301_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "<-"], shenjs_call(shen_fst, [Arg16301_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg16301_0])[2], shenjs_call(shen_snd, [Arg16301_0])])]), [shen_type_symbol, "shen-backward"]])
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
  function shen_user_lambda16304(Arg16303) {
  if (Arg16303.length < 1) return [shen_type_func, shen_user_lambda16304, 1, Arg16303];
  var Arg16303_0 = Arg16303[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["syntax error in ~A~%", [shen_tuple, Arg16303_0, []]]);})},
  1,
  [],
  "shen-errordef"];
shenjs_functions["shen_shen-errordef"] = shen_errordef;






shen_t$asterisk$_rules = [shen_type_func,
  function shen_user_lambda16306(Arg16305) {
  if (Arg16305.length < 7) return [shen_type_func, shen_user_lambda16306, 7, Arg16305];
  var Arg16305_0 = Arg16305[0], Arg16305_1 = Arg16305[1], Arg16305_2 = Arg16305[2], Arg16305_3 = Arg16305[3], Arg16305_4 = Arg16305[4], Arg16305_5 = Arg16305[5], Arg16305_6 = Arg16305[6];
  var R0, R1, R2, R3;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16305_0, Arg16305_5])),
  ((shenjs_empty$question$(R1))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg16305_6)))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg16305_0, Arg16305_5])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = R1[2]),
  (R3 = shenjs_call(shen_newpv, [Arg16305_5])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_t$asterisk$_rule, [R2, Arg16305_1, Arg16305_2, Arg16305_3, Arg16305_4, Arg16305_5, (new Shenjs_freeze([R2, R0, Arg16305_2, R1, Arg16305_1, R3, Arg16305_3, Arg16305_4, Arg16305_5, Arg16305_6], function(Arg16307) {
  var Arg16307_0 = Arg16307[0], Arg16307_1 = Arg16307[1], Arg16307_2 = Arg16307[2], Arg16307_3 = Arg16307[3], Arg16307_4 = Arg16307[4], Arg16307_5 = Arg16307[5], Arg16307_6 = Arg16307[6], Arg16307_7 = Arg16307[7], Arg16307_8 = Arg16307[8], Arg16307_9 = Arg16307[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16307_1, Arg16307_8, (new Shenjs_freeze([Arg16307_1, Arg16307_2, Arg16307_3, Arg16307_4, Arg16307_5, Arg16307_6, Arg16307_7, Arg16307_8, Arg16307_9], function(Arg16309) {
  var Arg16309_0 = Arg16309[0], Arg16309_1 = Arg16309[1], Arg16309_2 = Arg16309[2], Arg16309_3 = Arg16309[3], Arg16309_4 = Arg16309[4], Arg16309_5 = Arg16309[5], Arg16309_6 = Arg16309[6], Arg16309_7 = Arg16309[7], Arg16309_8 = Arg16309[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16309_4, (shenjs_call(shen_lazyderef, [Arg16309_1, Arg16309_7]) + 1), Arg16309_7, (new Shenjs_freeze([Arg16309_1, Arg16309_2, Arg16309_3, Arg16309_4, Arg16309_5, Arg16309_6, Arg16309_7, Arg16309_8], function(Arg16311) {
  var Arg16311_0 = Arg16311[0], Arg16311_1 = Arg16311[1], Arg16311_2 = Arg16311[2], Arg16311_3 = Arg16311[3], Arg16311_4 = Arg16311[4], Arg16311_5 = Arg16311[5], Arg16311_6 = Arg16311[6], Arg16311_7 = Arg16311[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_rules, [Arg16311_1, Arg16311_2, Arg16311_3, Arg16311_4, Arg16311_5, Arg16311_6, Arg16311_7]);});})}))]);});})}))]);});})}))]))
  : false))
  : R1))]);}))},
  7,
  [],
  "shen-t*-rules"];
shenjs_functions["shen_shen-t*-rules"] = shen_t$asterisk$_rules;






shen_t$asterisk$_rule = [shen_type_func,
  function shen_user_lambda16314(Arg16313) {
  if (Arg16313.length < 7) return [shen_type_func, shen_user_lambda16314, 7, Arg16313];
  var Arg16313_0 = Arg16313[0], Arg16313_1 = Arg16313[1], Arg16313_2 = Arg16313[2], Arg16313_3 = Arg16313[3], Arg16313_4 = Arg16313[4], Arg16313_5 = Arg16313[5], Arg16313_6 = Arg16313[6];
  var R0;
  return ((R0 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_t$asterisk$_ruleh, [Arg16313_0, Arg16313_1, Arg16313_4, Arg16313_5, Arg16313_6]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_newpv, [Arg16313_5])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [R0, shenjs_call(shen_type_insecure_rule_error_message, [shenjs_call(shen_lazyderef, [Arg16313_2, Arg16313_5]), shenjs_call(shen_lazyderef, [Arg16313_3, Arg16313_5])]), Arg16313_5, Arg16313_6]);}))
  : R0))},
  7,
  [],
  "shen-t*-rule"];
shenjs_functions["shen_shen-t*-rule"] = shen_t$asterisk$_rule;






shen_t$asterisk$_ruleh = [shen_type_func,
  function shen_user_lambda16316(Arg16315) {
  if (Arg16315.length < 5) return [shen_type_func, shen_user_lambda16316, 5, Arg16315];
  var Arg16315_0 = Arg16315[0], Arg16315_1 = Arg16315[1], Arg16315_2 = Arg16315[2], Arg16315_3 = Arg16315[3], Arg16315_4 = Arg16315[4];
  var R0, R1, R2, R3, R4, R5;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = shenjs_call(shen_lazyderef, [Arg16315_0, Arg16315_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg16315_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R3 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg16315_3])),
  ((shenjs_empty$question$(R1))
  ? ((R1 = shenjs_call(shen_newpv, [Arg16315_3])),
  (R4 = shenjs_call(shen_newpv, [Arg16315_3])),
  (R5 = shenjs_call(shen_newpv, [Arg16315_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_t$asterisk$_patterns, [R2, Arg16315_1, R1, R4, Arg16315_3, (new Shenjs_freeze([R2, Arg16315_1, R1, Arg16315_2, R0, R3, R4, R5, Arg16315_3, Arg16315_4], function(Arg16317) {
  var Arg16317_0 = Arg16317[0], Arg16317_1 = Arg16317[1], Arg16317_2 = Arg16317[2], Arg16317_3 = Arg16317[3], Arg16317_4 = Arg16317[4], Arg16317_5 = Arg16317[5], Arg16317_6 = Arg16317[6], Arg16317_7 = Arg16317[7], Arg16317_8 = Arg16317[8], Arg16317_9 = Arg16317[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16317_4, Arg16317_8, (new Shenjs_freeze([Arg16317_2, Arg16317_3, Arg16317_4, Arg16317_5, Arg16317_6, Arg16317_7, Arg16317_8, Arg16317_9], function(Arg16319) {
  var Arg16319_0 = Arg16319[0], Arg16319_1 = Arg16319[1], Arg16319_2 = Arg16319[2], Arg16319_3 = Arg16319[3], Arg16319_4 = Arg16319[4], Arg16319_5 = Arg16319[5], Arg16319_6 = Arg16319[6], Arg16319_7 = Arg16319[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_conc, [Arg16319_0, Arg16319_1, Arg16319_5, Arg16319_6, (new Shenjs_freeze([Arg16319_0, Arg16319_1, Arg16319_2, Arg16319_3, Arg16319_4, Arg16319_5, Arg16319_6, Arg16319_7], function(Arg16321) {
  var Arg16321_0 = Arg16321[0], Arg16321_1 = Arg16321[1], Arg16321_2 = Arg16321[2], Arg16321_3 = Arg16321[3], Arg16321_4 = Arg16321[4], Arg16321_5 = Arg16321[5], Arg16321_6 = Arg16321[6], Arg16321_7 = Arg16321[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16321_2, Arg16321_6, (new Shenjs_freeze([Arg16321_2, Arg16321_3, Arg16321_4, Arg16321_5, Arg16321_6, Arg16321_7], function(Arg16323) {
  var Arg16323_0 = Arg16323[0], Arg16323_1 = Arg16323[1], Arg16323_2 = Arg16323[2], Arg16323_3 = Arg16323[3], Arg16323_4 = Arg16323[4], Arg16323_5 = Arg16323[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16323_1, Arg16323_2, Arg16323_3, Arg16323_4, Arg16323_5]);});})}))]);});})}))]);});})}))]);});})}))]))
  : false))
  : false))
  : false))]);}))},
  5,
  [],
  "shen-t*-ruleh"];
shenjs_functions["shen_shen-t*-ruleh"] = shen_t$asterisk$_ruleh;






shen_type_insecure_rule_error_message = [shen_type_func,
  function shen_user_lambda16326(Arg16325) {
  if (Arg16325.length < 2) return [shen_type_func, shen_user_lambda16326, 2, Arg16325];
  var Arg16325_0 = Arg16325[0], Arg16325_1 = Arg16325[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["type error in rule ~A of ~A~%", [shen_tuple, Arg16325_0, [shen_tuple, Arg16325_1, []]]]);})},
  2,
  [],
  "shen-type-insecure-rule-error-message"];
shenjs_functions["shen_shen-type-insecure-rule-error-message"] = shen_type_insecure_rule_error_message;






shen_t$asterisk$_patterns = [shen_type_func,
  function shen_user_lambda16328(Arg16327) {
  if (Arg16327.length < 6) return [shen_type_func, shen_user_lambda16328, 6, Arg16327];
  var Arg16327_0 = Arg16327[0], Arg16327_1 = Arg16327[1], Arg16327_2 = Arg16327[2], Arg16327_3 = Arg16327[3], Arg16327_4 = Arg16327[4], Arg16327_5 = Arg16327[5];
  var R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg16327_0, Arg16327_4])),
  ((shenjs_empty$question$(R1))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg16327_2, Arg16327_4])),
  ((shenjs_empty$question$(R1))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [Arg16327_3, Arg16327_1, Arg16327_4, Arg16327_5]))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg16327_4]),
  (R2 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [Arg16327_3, Arg16327_1, Arg16327_4, Arg16327_5]))),
  shenjs_call(shen_unbindv, [R1, Arg16327_4]),
  R2)
  : false)))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg16327_0, Arg16327_4])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = R1[2]),
  (R3 = shenjs_call(shen_lazyderef, [Arg16327_1, Arg16327_4])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg16327_4])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R3[1], Arg16327_4])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-->"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R3[2], Arg16327_4])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R3 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg16327_4])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = shenjs_call(shen_lazyderef, [Arg16327_2, Arg16327_4])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R6 = shenjs_call(shen_lazyderef, [R5[1], Arg16327_4])),
  ((shenjs_is_type(R6, shen_type_cons))
  ? ((R7 = R6[1]),
  (R6 = shenjs_call(shen_lazyderef, [R6[2], Arg16327_4])),
  ((shenjs_is_type(R6, shen_type_cons))
  ? ((R8 = shenjs_call(shen_lazyderef, [R6[1], Arg16327_4])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R8)))
  ? ((R8 = shenjs_call(shen_lazyderef, [R6[2], Arg16327_4])),
  ((shenjs_is_type(R8, shen_type_cons))
  ? ((R6 = R8[1]),
  (R8 = shenjs_call(shen_lazyderef, [R8[2], Arg16327_4])),
  ((shenjs_empty$question$(R8))
  ? ((R8 = R5[2]),
  (R5 = shenjs_call(shen_newpv, [Arg16327_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R6, R4, Arg16327_4, (new Shenjs_freeze([R4, R2, R7, R6, R5, R0, R1, R3, R8, Arg16327_3, Arg16327_4, Arg16327_5], function(Arg16329) {
  var Arg16329_0 = Arg16329[0], Arg16329_1 = Arg16329[1], Arg16329_2 = Arg16329[2], Arg16329_3 = Arg16329[3], Arg16329_4 = Arg16329[4], Arg16329_5 = Arg16329[5], Arg16329_6 = Arg16329[6], Arg16329_7 = Arg16329[7], Arg16329_8 = Arg16329[8], Arg16329_9 = Arg16329[9], Arg16329_10 = Arg16329[10], Arg16329_11 = Arg16329[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg16329_2, Arg16329_1, Arg16329_10, (new Shenjs_freeze([Arg16329_1, Arg16329_2, Arg16329_3, Arg16329_4, Arg16329_5, Arg16329_6, Arg16329_7, Arg16329_8, Arg16329_9, Arg16329_10, Arg16329_11], function(Arg16331) {
  var Arg16331_0 = Arg16331[0], Arg16331_1 = Arg16331[1], Arg16331_2 = Arg16331[2], Arg16331_3 = Arg16331[3], Arg16331_4 = Arg16331[4], Arg16331_5 = Arg16331[5], Arg16331_6 = Arg16331[6], Arg16331_7 = Arg16331[7], Arg16331_8 = Arg16331[8], Arg16331_9 = Arg16331[9], Arg16331_10 = Arg16331[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg16331_1, Arg16331_3, Arg16331_9, (new Shenjs_freeze([Arg16331_1, Arg16331_2, Arg16331_3, Arg16331_4, Arg16331_5, Arg16331_6, Arg16331_7, Arg16331_8, Arg16331_9, Arg16331_10], function(Arg16333) {
  var Arg16333_0 = Arg16333[0], Arg16333_1 = Arg16333[1], Arg16333_2 = Arg16333[2], Arg16333_3 = Arg16333[3], Arg16333_4 = Arg16333[4], Arg16333_5 = Arg16333[5], Arg16333_6 = Arg16333[6], Arg16333_7 = Arg16333[7], Arg16333_8 = Arg16333[8], Arg16333_9 = Arg16333[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16333_3, Arg16333_8, (new Shenjs_freeze([Arg16333_0, Arg16333_1, Arg16333_2, Arg16333_3, Arg16333_4, Arg16333_5, Arg16333_6, Arg16333_7, Arg16333_8, Arg16333_9], function(Arg16335) {
  var Arg16335_0 = Arg16335[0], Arg16335_1 = Arg16335[1], Arg16335_2 = Arg16335[2], Arg16335_3 = Arg16335[3], Arg16335_4 = Arg16335[4], Arg16335_5 = Arg16335[5], Arg16335_6 = Arg16335[6], Arg16335_7 = Arg16335[7], Arg16335_8 = Arg16335[8], Arg16335_9 = Arg16335[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16335_0, Arg16335_1, Arg16335_2, Arg16335_8, (new Shenjs_freeze([Arg16335_0, Arg16335_1, Arg16335_2, Arg16335_3, Arg16335_4, Arg16335_5, Arg16335_6, Arg16335_7, Arg16335_8, Arg16335_9], function(Arg16337) {
  var Arg16337_0 = Arg16337[0], Arg16337_1 = Arg16337[1], Arg16337_2 = Arg16337[2], Arg16337_3 = Arg16337[3], Arg16337_4 = Arg16337[4], Arg16337_5 = Arg16337[5], Arg16337_6 = Arg16337[6], Arg16337_7 = Arg16337[7], Arg16337_8 = Arg16337[8], Arg16337_9 = Arg16337[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16337_3, Arg16337_8, (new Shenjs_freeze([Arg16337_3, Arg16337_4, Arg16337_5, Arg16337_6, Arg16337_7, Arg16337_8, Arg16337_9], function(Arg16339) {
  var Arg16339_0 = Arg16339[0], Arg16339_1 = Arg16339[1], Arg16339_2 = Arg16339[2], Arg16339_3 = Arg16339[3], Arg16339_4 = Arg16339[4], Arg16339_5 = Arg16339[5], Arg16339_6 = Arg16339[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg16339_1, Arg16339_2, Arg16339_3, Arg16339_4, Arg16339_5, Arg16339_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R8]))
  ? (shenjs_call(shen_bindv, [R8, [], Arg16327_4]),
  (R7 = ((R5 = R5[2]),
  (R9 = shenjs_call(shen_newpv, [Arg16327_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R6, R4, Arg16327_4, (new Shenjs_freeze([R4, R2, R7, R6, R9, R0, R1, R3, R5, Arg16327_3, Arg16327_4, Arg16327_5, R8, Arg16327_4], function(Arg16341) {
  var Arg16341_0 = Arg16341[0], Arg16341_1 = Arg16341[1], Arg16341_2 = Arg16341[2], Arg16341_3 = Arg16341[3], Arg16341_4 = Arg16341[4], Arg16341_5 = Arg16341[5], Arg16341_6 = Arg16341[6], Arg16341_7 = Arg16341[7], Arg16341_8 = Arg16341[8], Arg16341_9 = Arg16341[9], Arg16341_10 = Arg16341[10], Arg16341_11 = Arg16341[11], Arg16341_12 = Arg16341[12], Arg16341_13 = Arg16341[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg16341_2, Arg16341_1, Arg16341_10, (new Shenjs_freeze([Arg16341_1, Arg16341_2, Arg16341_3, Arg16341_4, Arg16341_5, Arg16341_6, Arg16341_7, Arg16341_8, Arg16341_9, Arg16341_10, Arg16341_11], function(Arg16343) {
  var Arg16343_0 = Arg16343[0], Arg16343_1 = Arg16343[1], Arg16343_2 = Arg16343[2], Arg16343_3 = Arg16343[3], Arg16343_4 = Arg16343[4], Arg16343_5 = Arg16343[5], Arg16343_6 = Arg16343[6], Arg16343_7 = Arg16343[7], Arg16343_8 = Arg16343[8], Arg16343_9 = Arg16343[9], Arg16343_10 = Arg16343[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg16343_1, Arg16343_3, Arg16343_9, (new Shenjs_freeze([Arg16343_1, Arg16343_2, Arg16343_3, Arg16343_4, Arg16343_5, Arg16343_6, Arg16343_7, Arg16343_8, Arg16343_9, Arg16343_10], function(Arg16345) {
  var Arg16345_0 = Arg16345[0], Arg16345_1 = Arg16345[1], Arg16345_2 = Arg16345[2], Arg16345_3 = Arg16345[3], Arg16345_4 = Arg16345[4], Arg16345_5 = Arg16345[5], Arg16345_6 = Arg16345[6], Arg16345_7 = Arg16345[7], Arg16345_8 = Arg16345[8], Arg16345_9 = Arg16345[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16345_3, Arg16345_8, (new Shenjs_freeze([Arg16345_0, Arg16345_1, Arg16345_2, Arg16345_3, Arg16345_4, Arg16345_5, Arg16345_6, Arg16345_7, Arg16345_8, Arg16345_9], function(Arg16347) {
  var Arg16347_0 = Arg16347[0], Arg16347_1 = Arg16347[1], Arg16347_2 = Arg16347[2], Arg16347_3 = Arg16347[3], Arg16347_4 = Arg16347[4], Arg16347_5 = Arg16347[5], Arg16347_6 = Arg16347[6], Arg16347_7 = Arg16347[7], Arg16347_8 = Arg16347[8], Arg16347_9 = Arg16347[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16347_0, Arg16347_1, Arg16347_2, Arg16347_8, (new Shenjs_freeze([Arg16347_0, Arg16347_1, Arg16347_2, Arg16347_3, Arg16347_4, Arg16347_5, Arg16347_6, Arg16347_7, Arg16347_8, Arg16347_9], function(Arg16349) {
  var Arg16349_0 = Arg16349[0], Arg16349_1 = Arg16349[1], Arg16349_2 = Arg16349[2], Arg16349_3 = Arg16349[3], Arg16349_4 = Arg16349[4], Arg16349_5 = Arg16349[5], Arg16349_6 = Arg16349[6], Arg16349_7 = Arg16349[7], Arg16349_8 = Arg16349[8], Arg16349_9 = Arg16349[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16349_3, Arg16349_8, (new Shenjs_freeze([Arg16349_3, Arg16349_4, Arg16349_5, Arg16349_6, Arg16349_7, Arg16349_8, Arg16349_9], function(Arg16351) {
  var Arg16351_0 = Arg16351[0], Arg16351_1 = Arg16351[1], Arg16351_2 = Arg16351[2], Arg16351_3 = Arg16351[3], Arg16351_4 = Arg16351[4], Arg16351_5 = Arg16351[5], Arg16351_6 = Arg16351[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg16351_1, Arg16351_2, Arg16351_3, Arg16351_4, Arg16351_5, Arg16351_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R8, Arg16327_4]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R8]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg16327_4])),
  shenjs_call(shen_bindv, [R8, [shen_type_cons, R6, []], Arg16327_4]),
  (R7 = ((R5 = R5[2]),
  (R9 = shenjs_call(shen_newpv, [Arg16327_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R6, R4, Arg16327_4, (new Shenjs_freeze([R4, R2, R7, R6, R9, R0, R1, R3, R5, Arg16327_3, Arg16327_4, Arg16327_5, R8, Arg16327_4], function(Arg16353) {
  var Arg16353_0 = Arg16353[0], Arg16353_1 = Arg16353[1], Arg16353_2 = Arg16353[2], Arg16353_3 = Arg16353[3], Arg16353_4 = Arg16353[4], Arg16353_5 = Arg16353[5], Arg16353_6 = Arg16353[6], Arg16353_7 = Arg16353[7], Arg16353_8 = Arg16353[8], Arg16353_9 = Arg16353[9], Arg16353_10 = Arg16353[10], Arg16353_11 = Arg16353[11], Arg16353_12 = Arg16353[12], Arg16353_13 = Arg16353[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg16353_2, Arg16353_1, Arg16353_10, (new Shenjs_freeze([Arg16353_1, Arg16353_2, Arg16353_3, Arg16353_4, Arg16353_5, Arg16353_6, Arg16353_7, Arg16353_8, Arg16353_9, Arg16353_10, Arg16353_11], function(Arg16355) {
  var Arg16355_0 = Arg16355[0], Arg16355_1 = Arg16355[1], Arg16355_2 = Arg16355[2], Arg16355_3 = Arg16355[3], Arg16355_4 = Arg16355[4], Arg16355_5 = Arg16355[5], Arg16355_6 = Arg16355[6], Arg16355_7 = Arg16355[7], Arg16355_8 = Arg16355[8], Arg16355_9 = Arg16355[9], Arg16355_10 = Arg16355[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg16355_1, Arg16355_3, Arg16355_9, (new Shenjs_freeze([Arg16355_1, Arg16355_2, Arg16355_3, Arg16355_4, Arg16355_5, Arg16355_6, Arg16355_7, Arg16355_8, Arg16355_9, Arg16355_10], function(Arg16357) {
  var Arg16357_0 = Arg16357[0], Arg16357_1 = Arg16357[1], Arg16357_2 = Arg16357[2], Arg16357_3 = Arg16357[3], Arg16357_4 = Arg16357[4], Arg16357_5 = Arg16357[5], Arg16357_6 = Arg16357[6], Arg16357_7 = Arg16357[7], Arg16357_8 = Arg16357[8], Arg16357_9 = Arg16357[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16357_3, Arg16357_8, (new Shenjs_freeze([Arg16357_0, Arg16357_1, Arg16357_2, Arg16357_3, Arg16357_4, Arg16357_5, Arg16357_6, Arg16357_7, Arg16357_8, Arg16357_9], function(Arg16359) {
  var Arg16359_0 = Arg16359[0], Arg16359_1 = Arg16359[1], Arg16359_2 = Arg16359[2], Arg16359_3 = Arg16359[3], Arg16359_4 = Arg16359[4], Arg16359_5 = Arg16359[5], Arg16359_6 = Arg16359[6], Arg16359_7 = Arg16359[7], Arg16359_8 = Arg16359[8], Arg16359_9 = Arg16359[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16359_0, Arg16359_1, Arg16359_2, Arg16359_8, (new Shenjs_freeze([Arg16359_0, Arg16359_1, Arg16359_2, Arg16359_3, Arg16359_4, Arg16359_5, Arg16359_6, Arg16359_7, Arg16359_8, Arg16359_9], function(Arg16361) {
  var Arg16361_0 = Arg16361[0], Arg16361_1 = Arg16361[1], Arg16361_2 = Arg16361[2], Arg16361_3 = Arg16361[3], Arg16361_4 = Arg16361[4], Arg16361_5 = Arg16361[5], Arg16361_6 = Arg16361[6], Arg16361_7 = Arg16361[7], Arg16361_8 = Arg16361[8], Arg16361_9 = Arg16361[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16361_3, Arg16361_8, (new Shenjs_freeze([Arg16361_3, Arg16361_4, Arg16361_5, Arg16361_6, Arg16361_7, Arg16361_8, Arg16361_9], function(Arg16363) {
  var Arg16363_0 = Arg16363[0], Arg16363_1 = Arg16363[1], Arg16363_2 = Arg16363[2], Arg16363_3 = Arg16363[3], Arg16363_4 = Arg16363[4], Arg16363_5 = Arg16363[5], Arg16363_6 = Arg16363[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg16363_1, Arg16363_2, Arg16363_3, Arg16363_4, Arg16363_5, Arg16363_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R8, Arg16327_4]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R8]))
  ? (shenjs_call(shen_bindv, [R8, [shen_type_symbol, ":"], Arg16327_4]),
  (R7 = ((R6 = shenjs_call(shen_lazyderef, [R6[2], Arg16327_4])),
  ((shenjs_is_type(R6, shen_type_cons))
  ? ((R9 = R6[1]),
  (R6 = shenjs_call(shen_lazyderef, [R6[2], Arg16327_4])),
  ((shenjs_empty$question$(R6))
  ? ((R6 = R5[2]),
  (R5 = shenjs_call(shen_newpv, [Arg16327_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R9, R4, Arg16327_4, (new Shenjs_freeze([R4, R2, R7, R9, R5, R0, R1, R3, R6, Arg16327_3, Arg16327_4, Arg16327_5, R8, Arg16327_4], function(Arg16365) {
  var Arg16365_0 = Arg16365[0], Arg16365_1 = Arg16365[1], Arg16365_2 = Arg16365[2], Arg16365_3 = Arg16365[3], Arg16365_4 = Arg16365[4], Arg16365_5 = Arg16365[5], Arg16365_6 = Arg16365[6], Arg16365_7 = Arg16365[7], Arg16365_8 = Arg16365[8], Arg16365_9 = Arg16365[9], Arg16365_10 = Arg16365[10], Arg16365_11 = Arg16365[11], Arg16365_12 = Arg16365[12], Arg16365_13 = Arg16365[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg16365_2, Arg16365_1, Arg16365_10, (new Shenjs_freeze([Arg16365_1, Arg16365_2, Arg16365_3, Arg16365_4, Arg16365_5, Arg16365_6, Arg16365_7, Arg16365_8, Arg16365_9, Arg16365_10, Arg16365_11], function(Arg16367) {
  var Arg16367_0 = Arg16367[0], Arg16367_1 = Arg16367[1], Arg16367_2 = Arg16367[2], Arg16367_3 = Arg16367[3], Arg16367_4 = Arg16367[4], Arg16367_5 = Arg16367[5], Arg16367_6 = Arg16367[6], Arg16367_7 = Arg16367[7], Arg16367_8 = Arg16367[8], Arg16367_9 = Arg16367[9], Arg16367_10 = Arg16367[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg16367_1, Arg16367_3, Arg16367_9, (new Shenjs_freeze([Arg16367_1, Arg16367_2, Arg16367_3, Arg16367_4, Arg16367_5, Arg16367_6, Arg16367_7, Arg16367_8, Arg16367_9, Arg16367_10], function(Arg16369) {
  var Arg16369_0 = Arg16369[0], Arg16369_1 = Arg16369[1], Arg16369_2 = Arg16369[2], Arg16369_3 = Arg16369[3], Arg16369_4 = Arg16369[4], Arg16369_5 = Arg16369[5], Arg16369_6 = Arg16369[6], Arg16369_7 = Arg16369[7], Arg16369_8 = Arg16369[8], Arg16369_9 = Arg16369[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16369_3, Arg16369_8, (new Shenjs_freeze([Arg16369_0, Arg16369_1, Arg16369_2, Arg16369_3, Arg16369_4, Arg16369_5, Arg16369_6, Arg16369_7, Arg16369_8, Arg16369_9], function(Arg16371) {
  var Arg16371_0 = Arg16371[0], Arg16371_1 = Arg16371[1], Arg16371_2 = Arg16371[2], Arg16371_3 = Arg16371[3], Arg16371_4 = Arg16371[4], Arg16371_5 = Arg16371[5], Arg16371_6 = Arg16371[6], Arg16371_7 = Arg16371[7], Arg16371_8 = Arg16371[8], Arg16371_9 = Arg16371[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16371_0, Arg16371_1, Arg16371_2, Arg16371_8, (new Shenjs_freeze([Arg16371_0, Arg16371_1, Arg16371_2, Arg16371_3, Arg16371_4, Arg16371_5, Arg16371_6, Arg16371_7, Arg16371_8, Arg16371_9], function(Arg16373) {
  var Arg16373_0 = Arg16373[0], Arg16373_1 = Arg16373[1], Arg16373_2 = Arg16373[2], Arg16373_3 = Arg16373[3], Arg16373_4 = Arg16373[4], Arg16373_5 = Arg16373[5], Arg16373_6 = Arg16373[6], Arg16373_7 = Arg16373[7], Arg16373_8 = Arg16373[8], Arg16373_9 = Arg16373[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16373_3, Arg16373_8, (new Shenjs_freeze([Arg16373_3, Arg16373_4, Arg16373_5, Arg16373_6, Arg16373_7, Arg16373_8, Arg16373_9], function(Arg16375) {
  var Arg16375_0 = Arg16375[0], Arg16375_1 = Arg16375[1], Arg16375_2 = Arg16375[2], Arg16375_3 = Arg16375[3], Arg16375_4 = Arg16375[4], Arg16375_5 = Arg16375[5], Arg16375_6 = Arg16375[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg16375_1, Arg16375_2, Arg16375_3, Arg16375_4, Arg16375_5, Arg16375_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? (shenjs_call(shen_bindv, [R6, [], Arg16327_4]),
  (R9 = ((R5 = R5[2]),
  (R10 = shenjs_call(shen_newpv, [Arg16327_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R9, R4, Arg16327_4, (new Shenjs_freeze([R4, R2, R7, R9, R10, R0, R1, R3, R5, Arg16327_3, Arg16327_4, Arg16327_5, R6, Arg16327_4, R8, Arg16327_4], function(Arg16377) {
  var Arg16377_0 = Arg16377[0], Arg16377_1 = Arg16377[1], Arg16377_2 = Arg16377[2], Arg16377_3 = Arg16377[3], Arg16377_4 = Arg16377[4], Arg16377_5 = Arg16377[5], Arg16377_6 = Arg16377[6], Arg16377_7 = Arg16377[7], Arg16377_8 = Arg16377[8], Arg16377_9 = Arg16377[9], Arg16377_10 = Arg16377[10], Arg16377_11 = Arg16377[11], Arg16377_12 = Arg16377[12], Arg16377_13 = Arg16377[13], Arg16377_14 = Arg16377[14], Arg16377_15 = Arg16377[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg16377_2, Arg16377_1, Arg16377_10, (new Shenjs_freeze([Arg16377_1, Arg16377_2, Arg16377_3, Arg16377_4, Arg16377_5, Arg16377_6, Arg16377_7, Arg16377_8, Arg16377_9, Arg16377_10, Arg16377_11], function(Arg16379) {
  var Arg16379_0 = Arg16379[0], Arg16379_1 = Arg16379[1], Arg16379_2 = Arg16379[2], Arg16379_3 = Arg16379[3], Arg16379_4 = Arg16379[4], Arg16379_5 = Arg16379[5], Arg16379_6 = Arg16379[6], Arg16379_7 = Arg16379[7], Arg16379_8 = Arg16379[8], Arg16379_9 = Arg16379[9], Arg16379_10 = Arg16379[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg16379_1, Arg16379_3, Arg16379_9, (new Shenjs_freeze([Arg16379_1, Arg16379_2, Arg16379_3, Arg16379_4, Arg16379_5, Arg16379_6, Arg16379_7, Arg16379_8, Arg16379_9, Arg16379_10], function(Arg16381) {
  var Arg16381_0 = Arg16381[0], Arg16381_1 = Arg16381[1], Arg16381_2 = Arg16381[2], Arg16381_3 = Arg16381[3], Arg16381_4 = Arg16381[4], Arg16381_5 = Arg16381[5], Arg16381_6 = Arg16381[6], Arg16381_7 = Arg16381[7], Arg16381_8 = Arg16381[8], Arg16381_9 = Arg16381[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16381_3, Arg16381_8, (new Shenjs_freeze([Arg16381_0, Arg16381_1, Arg16381_2, Arg16381_3, Arg16381_4, Arg16381_5, Arg16381_6, Arg16381_7, Arg16381_8, Arg16381_9], function(Arg16383) {
  var Arg16383_0 = Arg16383[0], Arg16383_1 = Arg16383[1], Arg16383_2 = Arg16383[2], Arg16383_3 = Arg16383[3], Arg16383_4 = Arg16383[4], Arg16383_5 = Arg16383[5], Arg16383_6 = Arg16383[6], Arg16383_7 = Arg16383[7], Arg16383_8 = Arg16383[8], Arg16383_9 = Arg16383[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16383_0, Arg16383_1, Arg16383_2, Arg16383_8, (new Shenjs_freeze([Arg16383_0, Arg16383_1, Arg16383_2, Arg16383_3, Arg16383_4, Arg16383_5, Arg16383_6, Arg16383_7, Arg16383_8, Arg16383_9], function(Arg16385) {
  var Arg16385_0 = Arg16385[0], Arg16385_1 = Arg16385[1], Arg16385_2 = Arg16385[2], Arg16385_3 = Arg16385[3], Arg16385_4 = Arg16385[4], Arg16385_5 = Arg16385[5], Arg16385_6 = Arg16385[6], Arg16385_7 = Arg16385[7], Arg16385_8 = Arg16385[8], Arg16385_9 = Arg16385[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16385_3, Arg16385_8, (new Shenjs_freeze([Arg16385_3, Arg16385_4, Arg16385_5, Arg16385_6, Arg16385_7, Arg16385_8, Arg16385_9], function(Arg16387) {
  var Arg16387_0 = Arg16387[0], Arg16387_1 = Arg16387[1], Arg16387_2 = Arg16387[2], Arg16387_3 = Arg16387[3], Arg16387_4 = Arg16387[4], Arg16387_5 = Arg16387[5], Arg16387_6 = Arg16387[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg16387_1, Arg16387_2, Arg16387_3, Arg16387_4, Arg16387_5, Arg16387_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R6, Arg16327_4]),
  R9)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? ((R9 = shenjs_call(shen_newpv, [Arg16327_4])),
  shenjs_call(shen_bindv, [R6, [shen_type_cons, R9, []], Arg16327_4]),
  (R9 = ((R5 = R5[2]),
  (R10 = shenjs_call(shen_newpv, [Arg16327_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R9, R4, Arg16327_4, (new Shenjs_freeze([R4, R2, R7, R9, R10, R0, R1, R3, R5, Arg16327_3, Arg16327_4, Arg16327_5, R6, Arg16327_4, R8, Arg16327_4], function(Arg16389) {
  var Arg16389_0 = Arg16389[0], Arg16389_1 = Arg16389[1], Arg16389_2 = Arg16389[2], Arg16389_3 = Arg16389[3], Arg16389_4 = Arg16389[4], Arg16389_5 = Arg16389[5], Arg16389_6 = Arg16389[6], Arg16389_7 = Arg16389[7], Arg16389_8 = Arg16389[8], Arg16389_9 = Arg16389[9], Arg16389_10 = Arg16389[10], Arg16389_11 = Arg16389[11], Arg16389_12 = Arg16389[12], Arg16389_13 = Arg16389[13], Arg16389_14 = Arg16389[14], Arg16389_15 = Arg16389[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg16389_2, Arg16389_1, Arg16389_10, (new Shenjs_freeze([Arg16389_1, Arg16389_2, Arg16389_3, Arg16389_4, Arg16389_5, Arg16389_6, Arg16389_7, Arg16389_8, Arg16389_9, Arg16389_10, Arg16389_11], function(Arg16391) {
  var Arg16391_0 = Arg16391[0], Arg16391_1 = Arg16391[1], Arg16391_2 = Arg16391[2], Arg16391_3 = Arg16391[3], Arg16391_4 = Arg16391[4], Arg16391_5 = Arg16391[5], Arg16391_6 = Arg16391[6], Arg16391_7 = Arg16391[7], Arg16391_8 = Arg16391[8], Arg16391_9 = Arg16391[9], Arg16391_10 = Arg16391[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg16391_1, Arg16391_3, Arg16391_9, (new Shenjs_freeze([Arg16391_1, Arg16391_2, Arg16391_3, Arg16391_4, Arg16391_5, Arg16391_6, Arg16391_7, Arg16391_8, Arg16391_9, Arg16391_10], function(Arg16393) {
  var Arg16393_0 = Arg16393[0], Arg16393_1 = Arg16393[1], Arg16393_2 = Arg16393[2], Arg16393_3 = Arg16393[3], Arg16393_4 = Arg16393[4], Arg16393_5 = Arg16393[5], Arg16393_6 = Arg16393[6], Arg16393_7 = Arg16393[7], Arg16393_8 = Arg16393[8], Arg16393_9 = Arg16393[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16393_3, Arg16393_8, (new Shenjs_freeze([Arg16393_0, Arg16393_1, Arg16393_2, Arg16393_3, Arg16393_4, Arg16393_5, Arg16393_6, Arg16393_7, Arg16393_8, Arg16393_9], function(Arg16395) {
  var Arg16395_0 = Arg16395[0], Arg16395_1 = Arg16395[1], Arg16395_2 = Arg16395[2], Arg16395_3 = Arg16395[3], Arg16395_4 = Arg16395[4], Arg16395_5 = Arg16395[5], Arg16395_6 = Arg16395[6], Arg16395_7 = Arg16395[7], Arg16395_8 = Arg16395[8], Arg16395_9 = Arg16395[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16395_0, Arg16395_1, Arg16395_2, Arg16395_8, (new Shenjs_freeze([Arg16395_0, Arg16395_1, Arg16395_2, Arg16395_3, Arg16395_4, Arg16395_5, Arg16395_6, Arg16395_7, Arg16395_8, Arg16395_9], function(Arg16397) {
  var Arg16397_0 = Arg16397[0], Arg16397_1 = Arg16397[1], Arg16397_2 = Arg16397[2], Arg16397_3 = Arg16397[3], Arg16397_4 = Arg16397[4], Arg16397_5 = Arg16397[5], Arg16397_6 = Arg16397[6], Arg16397_7 = Arg16397[7], Arg16397_8 = Arg16397[8], Arg16397_9 = Arg16397[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16397_3, Arg16397_8, (new Shenjs_freeze([Arg16397_3, Arg16397_4, Arg16397_5, Arg16397_6, Arg16397_7, Arg16397_8, Arg16397_9], function(Arg16399) {
  var Arg16399_0 = Arg16399[0], Arg16399_1 = Arg16399[1], Arg16399_2 = Arg16399[2], Arg16399_3 = Arg16399[3], Arg16399_4 = Arg16399[4], Arg16399_5 = Arg16399[5], Arg16399_6 = Arg16399[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg16399_1, Arg16399_2, Arg16399_3, Arg16399_4, Arg16399_5, Arg16399_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R6, Arg16327_4]),
  R9)
  : false)))),
  shenjs_call(shen_unbindv, [R8, Arg16327_4]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? ((R8 = shenjs_call(shen_newpv, [Arg16327_4])),
  shenjs_call(shen_bindv, [R6, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, R8, []]], Arg16327_4]),
  (R8 = ((R5 = R5[2]),
  (R9 = shenjs_call(shen_newpv, [Arg16327_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R8, R4, Arg16327_4, (new Shenjs_freeze([R4, R2, R7, R8, R9, R0, R1, R3, R5, Arg16327_3, Arg16327_4, Arg16327_5, R6, Arg16327_4], function(Arg16401) {
  var Arg16401_0 = Arg16401[0], Arg16401_1 = Arg16401[1], Arg16401_2 = Arg16401[2], Arg16401_3 = Arg16401[3], Arg16401_4 = Arg16401[4], Arg16401_5 = Arg16401[5], Arg16401_6 = Arg16401[6], Arg16401_7 = Arg16401[7], Arg16401_8 = Arg16401[8], Arg16401_9 = Arg16401[9], Arg16401_10 = Arg16401[10], Arg16401_11 = Arg16401[11], Arg16401_12 = Arg16401[12], Arg16401_13 = Arg16401[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg16401_2, Arg16401_1, Arg16401_10, (new Shenjs_freeze([Arg16401_1, Arg16401_2, Arg16401_3, Arg16401_4, Arg16401_5, Arg16401_6, Arg16401_7, Arg16401_8, Arg16401_9, Arg16401_10, Arg16401_11], function(Arg16403) {
  var Arg16403_0 = Arg16403[0], Arg16403_1 = Arg16403[1], Arg16403_2 = Arg16403[2], Arg16403_3 = Arg16403[3], Arg16403_4 = Arg16403[4], Arg16403_5 = Arg16403[5], Arg16403_6 = Arg16403[6], Arg16403_7 = Arg16403[7], Arg16403_8 = Arg16403[8], Arg16403_9 = Arg16403[9], Arg16403_10 = Arg16403[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg16403_1, Arg16403_3, Arg16403_9, (new Shenjs_freeze([Arg16403_1, Arg16403_2, Arg16403_3, Arg16403_4, Arg16403_5, Arg16403_6, Arg16403_7, Arg16403_8, Arg16403_9, Arg16403_10], function(Arg16405) {
  var Arg16405_0 = Arg16405[0], Arg16405_1 = Arg16405[1], Arg16405_2 = Arg16405[2], Arg16405_3 = Arg16405[3], Arg16405_4 = Arg16405[4], Arg16405_5 = Arg16405[5], Arg16405_6 = Arg16405[6], Arg16405_7 = Arg16405[7], Arg16405_8 = Arg16405[8], Arg16405_9 = Arg16405[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16405_3, Arg16405_8, (new Shenjs_freeze([Arg16405_0, Arg16405_1, Arg16405_2, Arg16405_3, Arg16405_4, Arg16405_5, Arg16405_6, Arg16405_7, Arg16405_8, Arg16405_9], function(Arg16407) {
  var Arg16407_0 = Arg16407[0], Arg16407_1 = Arg16407[1], Arg16407_2 = Arg16407[2], Arg16407_3 = Arg16407[3], Arg16407_4 = Arg16407[4], Arg16407_5 = Arg16407[5], Arg16407_6 = Arg16407[6], Arg16407_7 = Arg16407[7], Arg16407_8 = Arg16407[8], Arg16407_9 = Arg16407[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16407_0, Arg16407_1, Arg16407_2, Arg16407_8, (new Shenjs_freeze([Arg16407_0, Arg16407_1, Arg16407_2, Arg16407_3, Arg16407_4, Arg16407_5, Arg16407_6, Arg16407_7, Arg16407_8, Arg16407_9], function(Arg16409) {
  var Arg16409_0 = Arg16409[0], Arg16409_1 = Arg16409[1], Arg16409_2 = Arg16409[2], Arg16409_3 = Arg16409[3], Arg16409_4 = Arg16409[4], Arg16409_5 = Arg16409[5], Arg16409_6 = Arg16409[6], Arg16409_7 = Arg16409[7], Arg16409_8 = Arg16409[8], Arg16409_9 = Arg16409[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16409_3, Arg16409_8, (new Shenjs_freeze([Arg16409_3, Arg16409_4, Arg16409_5, Arg16409_6, Arg16409_7, Arg16409_8, Arg16409_9], function(Arg16411) {
  var Arg16411_0 = Arg16411[0], Arg16411_1 = Arg16411[1], Arg16411_2 = Arg16411[2], Arg16411_3 = Arg16411[3], Arg16411_4 = Arg16411[4], Arg16411_5 = Arg16411[5], Arg16411_6 = Arg16411[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg16411_1, Arg16411_2, Arg16411_3, Arg16411_4, Arg16411_5, Arg16411_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R6, Arg16327_4]),
  R8)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? ((R7 = shenjs_call(shen_newpv, [Arg16327_4])),
  (R8 = shenjs_call(shen_newpv, [Arg16327_4])),
  shenjs_call(shen_bindv, [R6, [shen_type_cons, R7, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, R8, []]]], Arg16327_4]),
  (R8 = ((R5 = R5[2]),
  (R9 = shenjs_call(shen_newpv, [Arg16327_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R8, R4, Arg16327_4, (new Shenjs_freeze([R4, R2, R7, R8, R9, R0, R1, R3, R5, Arg16327_3, Arg16327_4, Arg16327_5, R6, Arg16327_4], function(Arg16413) {
  var Arg16413_0 = Arg16413[0], Arg16413_1 = Arg16413[1], Arg16413_2 = Arg16413[2], Arg16413_3 = Arg16413[3], Arg16413_4 = Arg16413[4], Arg16413_5 = Arg16413[5], Arg16413_6 = Arg16413[6], Arg16413_7 = Arg16413[7], Arg16413_8 = Arg16413[8], Arg16413_9 = Arg16413[9], Arg16413_10 = Arg16413[10], Arg16413_11 = Arg16413[11], Arg16413_12 = Arg16413[12], Arg16413_13 = Arg16413[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg16413_2, Arg16413_1, Arg16413_10, (new Shenjs_freeze([Arg16413_1, Arg16413_2, Arg16413_3, Arg16413_4, Arg16413_5, Arg16413_6, Arg16413_7, Arg16413_8, Arg16413_9, Arg16413_10, Arg16413_11], function(Arg16415) {
  var Arg16415_0 = Arg16415[0], Arg16415_1 = Arg16415[1], Arg16415_2 = Arg16415[2], Arg16415_3 = Arg16415[3], Arg16415_4 = Arg16415[4], Arg16415_5 = Arg16415[5], Arg16415_6 = Arg16415[6], Arg16415_7 = Arg16415[7], Arg16415_8 = Arg16415[8], Arg16415_9 = Arg16415[9], Arg16415_10 = Arg16415[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg16415_1, Arg16415_3, Arg16415_9, (new Shenjs_freeze([Arg16415_1, Arg16415_2, Arg16415_3, Arg16415_4, Arg16415_5, Arg16415_6, Arg16415_7, Arg16415_8, Arg16415_9, Arg16415_10], function(Arg16417) {
  var Arg16417_0 = Arg16417[0], Arg16417_1 = Arg16417[1], Arg16417_2 = Arg16417[2], Arg16417_3 = Arg16417[3], Arg16417_4 = Arg16417[4], Arg16417_5 = Arg16417[5], Arg16417_6 = Arg16417[6], Arg16417_7 = Arg16417[7], Arg16417_8 = Arg16417[8], Arg16417_9 = Arg16417[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16417_3, Arg16417_8, (new Shenjs_freeze([Arg16417_0, Arg16417_1, Arg16417_2, Arg16417_3, Arg16417_4, Arg16417_5, Arg16417_6, Arg16417_7, Arg16417_8, Arg16417_9], function(Arg16419) {
  var Arg16419_0 = Arg16419[0], Arg16419_1 = Arg16419[1], Arg16419_2 = Arg16419[2], Arg16419_3 = Arg16419[3], Arg16419_4 = Arg16419[4], Arg16419_5 = Arg16419[5], Arg16419_6 = Arg16419[6], Arg16419_7 = Arg16419[7], Arg16419_8 = Arg16419[8], Arg16419_9 = Arg16419[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16419_0, Arg16419_1, Arg16419_2, Arg16419_8, (new Shenjs_freeze([Arg16419_0, Arg16419_1, Arg16419_2, Arg16419_3, Arg16419_4, Arg16419_5, Arg16419_6, Arg16419_7, Arg16419_8, Arg16419_9], function(Arg16421) {
  var Arg16421_0 = Arg16421[0], Arg16421_1 = Arg16421[1], Arg16421_2 = Arg16421[2], Arg16421_3 = Arg16421[3], Arg16421_4 = Arg16421[4], Arg16421_5 = Arg16421[5], Arg16421_6 = Arg16421[6], Arg16421_7 = Arg16421[7], Arg16421_8 = Arg16421[8], Arg16421_9 = Arg16421[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16421_3, Arg16421_8, (new Shenjs_freeze([Arg16421_3, Arg16421_4, Arg16421_5, Arg16421_6, Arg16421_7, Arg16421_8, Arg16421_9], function(Arg16423) {
  var Arg16423_0 = Arg16423[0], Arg16423_1 = Arg16423[1], Arg16423_2 = Arg16423[2], Arg16423_3 = Arg16423[3], Arg16423_4 = Arg16423[4], Arg16423_5 = Arg16423[5], Arg16423_6 = Arg16423[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg16423_1, Arg16423_2, Arg16423_3, Arg16423_4, Arg16423_5, Arg16423_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R6, Arg16327_4]),
  R8)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg16327_4])),
  (R7 = shenjs_call(shen_newpv, [Arg16327_4])),
  (R8 = shenjs_call(shen_newpv, [Arg16327_4])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, [shen_type_cons, R6, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, R7, []]]], R8], Arg16327_4]),
  (R8 = ((R9 = shenjs_call(shen_newpv, [Arg16327_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R7, R4, Arg16327_4, (new Shenjs_freeze([R4, R2, R6, R7, R9, R0, R1, R3, R8, Arg16327_3, Arg16327_4, Arg16327_5, R5, Arg16327_4], function(Arg16425) {
  var Arg16425_0 = Arg16425[0], Arg16425_1 = Arg16425[1], Arg16425_2 = Arg16425[2], Arg16425_3 = Arg16425[3], Arg16425_4 = Arg16425[4], Arg16425_5 = Arg16425[5], Arg16425_6 = Arg16425[6], Arg16425_7 = Arg16425[7], Arg16425_8 = Arg16425[8], Arg16425_9 = Arg16425[9], Arg16425_10 = Arg16425[10], Arg16425_11 = Arg16425[11], Arg16425_12 = Arg16425[12], Arg16425_13 = Arg16425[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg16425_2, Arg16425_1, Arg16425_10, (new Shenjs_freeze([Arg16425_1, Arg16425_2, Arg16425_3, Arg16425_4, Arg16425_5, Arg16425_6, Arg16425_7, Arg16425_8, Arg16425_9, Arg16425_10, Arg16425_11], function(Arg16427) {
  var Arg16427_0 = Arg16427[0], Arg16427_1 = Arg16427[1], Arg16427_2 = Arg16427[2], Arg16427_3 = Arg16427[3], Arg16427_4 = Arg16427[4], Arg16427_5 = Arg16427[5], Arg16427_6 = Arg16427[6], Arg16427_7 = Arg16427[7], Arg16427_8 = Arg16427[8], Arg16427_9 = Arg16427[9], Arg16427_10 = Arg16427[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg16427_1, Arg16427_3, Arg16427_9, (new Shenjs_freeze([Arg16427_1, Arg16427_2, Arg16427_3, Arg16427_4, Arg16427_5, Arg16427_6, Arg16427_7, Arg16427_8, Arg16427_9, Arg16427_10], function(Arg16429) {
  var Arg16429_0 = Arg16429[0], Arg16429_1 = Arg16429[1], Arg16429_2 = Arg16429[2], Arg16429_3 = Arg16429[3], Arg16429_4 = Arg16429[4], Arg16429_5 = Arg16429[5], Arg16429_6 = Arg16429[6], Arg16429_7 = Arg16429[7], Arg16429_8 = Arg16429[8], Arg16429_9 = Arg16429[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16429_3, Arg16429_8, (new Shenjs_freeze([Arg16429_0, Arg16429_1, Arg16429_2, Arg16429_3, Arg16429_4, Arg16429_5, Arg16429_6, Arg16429_7, Arg16429_8, Arg16429_9], function(Arg16431) {
  var Arg16431_0 = Arg16431[0], Arg16431_1 = Arg16431[1], Arg16431_2 = Arg16431[2], Arg16431_3 = Arg16431[3], Arg16431_4 = Arg16431[4], Arg16431_5 = Arg16431[5], Arg16431_6 = Arg16431[6], Arg16431_7 = Arg16431[7], Arg16431_8 = Arg16431[8], Arg16431_9 = Arg16431[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg16431_0, Arg16431_1, Arg16431_2, Arg16431_8, (new Shenjs_freeze([Arg16431_0, Arg16431_1, Arg16431_2, Arg16431_3, Arg16431_4, Arg16431_5, Arg16431_6, Arg16431_7, Arg16431_8, Arg16431_9], function(Arg16433) {
  var Arg16433_0 = Arg16433[0], Arg16433_1 = Arg16433[1], Arg16433_2 = Arg16433[2], Arg16433_3 = Arg16433[3], Arg16433_4 = Arg16433[4], Arg16433_5 = Arg16433[5], Arg16433_6 = Arg16433[6], Arg16433_7 = Arg16433[7], Arg16433_8 = Arg16433[8], Arg16433_9 = Arg16433[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg16433_3, Arg16433_8, (new Shenjs_freeze([Arg16433_3, Arg16433_4, Arg16433_5, Arg16433_6, Arg16433_7, Arg16433_8, Arg16433_9], function(Arg16435) {
  var Arg16435_0 = Arg16435[0], Arg16435_1 = Arg16435[1], Arg16435_2 = Arg16435[2], Arg16435_3 = Arg16435[3], Arg16435_4 = Arg16435[4], Arg16435_5 = Arg16435[5], Arg16435_6 = Arg16435[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg16435_1, Arg16435_2, Arg16435_3, Arg16435_4, Arg16435_5, Arg16435_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg16327_4]),
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
  function shen_user_lambda16438(Arg16437) {
  if (Arg16437.length < 4) return [shen_type_func, shen_user_lambda16438, 4, Arg16437];
  var Arg16437_0 = Arg16437[0], Arg16437_1 = Arg16437[1], Arg16437_2 = Arg16437[2], Arg16437_3 = Arg16437[3];
  var R0, R1, R2, R3, R4;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R0 = ((R1 = shenjs_call(shen_lazyderef, [Arg16437_0, Arg16437_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = R1[2]),
  (R3 = shenjs_call(shen_newpv, [Arg16437_2])),
  (R4 = shenjs_call(shen_newpv, [Arg16437_2])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg16437_2, (new Shenjs_freeze([R0, R2, R1, Arg16437_1, R3, R4, Arg16437_2, Arg16437_3, Arg16437_0, Arg16437_1, Arg16437_3, Arg16437_2], function(Arg16439) {
  var Arg16439_0 = Arg16439[0], Arg16439_1 = Arg16439[1], Arg16439_2 = Arg16439[2], Arg16439_3 = Arg16439[3], Arg16439_4 = Arg16439[4], Arg16439_5 = Arg16439[5], Arg16439_6 = Arg16439[6], Arg16439_7 = Arg16439[7], Arg16439_8 = Arg16439[8], Arg16439_9 = Arg16439[9], Arg16439_10 = Arg16439[10], Arg16439_11 = Arg16439[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg16439_1, Arg16439_4, Arg16439_6, (new Shenjs_freeze([Arg16439_1, Arg16439_2, Arg16439_3, Arg16439_4, Arg16439_5, Arg16439_6, Arg16439_7], function(Arg16441) {
  var Arg16441_0 = Arg16441[0], Arg16441_1 = Arg16441[1], Arg16441_2 = Arg16441[2], Arg16441_3 = Arg16441[3], Arg16441_4 = Arg16441[4], Arg16441_5 = Arg16441[5], Arg16441_6 = Arg16441[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg16441_1, Arg16441_4, Arg16441_5, (new Shenjs_freeze([Arg16441_1, Arg16441_2, Arg16441_3, Arg16441_4, Arg16441_5, Arg16441_6], function(Arg16443) {
  var Arg16443_0 = Arg16443[0], Arg16443_1 = Arg16443[1], Arg16443_2 = Arg16443[2], Arg16443_3 = Arg16443[3], Arg16443_4 = Arg16443[4], Arg16443_5 = Arg16443[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16443_1, shenjs_call(shen_append, [shenjs_call(shen_lazyderef, [Arg16443_2, Arg16443_4]), shenjs_call(shen_lazyderef, [Arg16443_3, Arg16443_4])]), Arg16443_4, Arg16443_5]);});})}))]);});})}))]);});})}))]))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = ((R0 = shenjs_call(shen_newpv, [Arg16437_2])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_call(shen_placeholder$question$, [shenjs_call(shen_lazyderef, [Arg16437_0, Arg16437_2])]), Arg16437_2, (new Shenjs_freeze([Arg16437_1, Arg16437_0, R0, Arg16437_2, Arg16437_3, Arg16437_1, Arg16437_3, Arg16437_2], function(Arg16445) {
  var Arg16445_0 = Arg16445[0], Arg16445_1 = Arg16445[1], Arg16445_2 = Arg16445[2], Arg16445_3 = Arg16445[3], Arg16445_4 = Arg16445[4], Arg16445_5 = Arg16445[5], Arg16445_6 = Arg16445[6], Arg16445_7 = Arg16445[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16445_0, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [Arg16445_1, Arg16445_3]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [Arg16445_2, Arg16445_3]), []]]], []], Arg16445_3, Arg16445_4]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg16437_1, Arg16437_2])),
  ((shenjs_empty$question$(R0))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg16437_3)))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [], Arg16437_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg16437_3)))),
  shenjs_call(shen_unbindv, [R0, Arg16437_2]),
  R1)
  : false)))
  : R0))
  : R0))]);}))},
  4,
  [],
  "shen-t*-assume"];
shenjs_functions["shen_shen-t*-assume"] = shen_t$asterisk$_assume;






shen_conc = [shen_type_func,
  function shen_user_lambda16448(Arg16447) {
  if (Arg16447.length < 5) return [shen_type_func, shen_user_lambda16448, 5, Arg16447];
  var Arg16447_0 = Arg16447[0], Arg16447_1 = Arg16447[1], Arg16447_2 = Arg16447[2], Arg16447_3 = Arg16447[3], Arg16447_4 = Arg16447[4];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg16447_0, Arg16447_3])),
  ((shenjs_empty$question$(R0))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg16447_2, shenjs_call(shen_lazyderef, [Arg16447_1, Arg16447_3]), Arg16447_3, Arg16447_4]))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg16447_0, Arg16447_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = R0[1]),
  (R0 = R0[2]),
  (R2 = shenjs_call(shen_newpv, [Arg16447_3])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [Arg16447_2, [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg16447_3]), shenjs_call(shen_lazyderef, [R2, Arg16447_3])], Arg16447_3, (new Shenjs_freeze([Arg16447_2, R1, R0, Arg16447_1, R2, Arg16447_3, Arg16447_4], function(Arg16449) {
  var Arg16449_0 = Arg16449[0], Arg16449_1 = Arg16449[1], Arg16449_2 = Arg16449[2], Arg16449_3 = Arg16449[3], Arg16449_4 = Arg16449[4], Arg16449_5 = Arg16449[5], Arg16449_6 = Arg16449[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_conc, [Arg16449_2, Arg16449_3, Arg16449_4, Arg16449_5, Arg16449_6]);});})}))]);}))
  : false))
  : R0))},
  5,
  [],
  "shen-conc"];
shenjs_functions["shen_shen-conc"] = shen_conc;






shen_findallhelp = [shen_type_func,
  function shen_user_lambda16452(Arg16451) {
  if (Arg16451.length < 6) return [shen_type_func, shen_user_lambda16452, 6, Arg16451];
  var Arg16451_0 = Arg16451[0], Arg16451_1 = Arg16451[1], Arg16451_2 = Arg16451[2], Arg16451_3 = Arg16451[3], Arg16451_4 = Arg16451[4], Arg16451_5 = Arg16451[5];
  var R0;
  return ((R0 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_call, [Arg16451_1, Arg16451_4, (new Shenjs_freeze([Arg16451_1, Arg16451_0, Arg16451_2, Arg16451_3, Arg16451_4, Arg16451_5], function(Arg16453) {
  var Arg16453_0 = Arg16453[0], Arg16453_1 = Arg16453[1], Arg16453_2 = Arg16453[2], Arg16453_3 = Arg16453[3], Arg16453_4 = Arg16453[4], Arg16453_5 = Arg16453[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_remember, [Arg16453_3, Arg16453_1, Arg16453_4, (new Shenjs_freeze([Arg16453_3, Arg16453_1, Arg16453_4, Arg16453_5], function(Arg16455) {
  var Arg16455_0 = Arg16455[0], Arg16455_1 = Arg16455[1], Arg16455_2 = Arg16455[2], Arg16455_3 = Arg16455[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [false, Arg16455_2, Arg16455_3]);});})}))]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? (shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [Arg16451_2, (shenjs_globals["shen_" + shenjs_call(shen_lazyderef, [Arg16451_3, Arg16451_4])[1]]), Arg16451_4, Arg16451_5]);}))
  : R0))},
  6,
  [],
  "shen-findallhelp"];
shenjs_functions["shen_shen-findallhelp"] = shen_findallhelp;






shen_remember = [shen_type_func,
  function shen_user_lambda16458(Arg16457) {
  if (Arg16457.length < 4) return [shen_type_func, shen_user_lambda16458, 4, Arg16457];
  var Arg16457_0 = Arg16457[0], Arg16457_1 = Arg16457[1], Arg16457_2 = Arg16457[2], Arg16457_3 = Arg16457[3];
  var R0;
  return ((R0 = shenjs_call(shen_newpv, [Arg16457_2])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [R0, (shenjs_globals["shen_" + shenjs_call(shen_deref, [Arg16457_0, Arg16457_2])[1]] = [shen_type_cons, shenjs_call(shen_deref, [Arg16457_1, Arg16457_2]), (shenjs_globals["shen_" + shenjs_call(shen_deref, [Arg16457_0, Arg16457_2])[1]])]), Arg16457_2, Arg16457_3]);}))},
  4,
  [],
  "shen-remember"];
shenjs_functions["shen_shen-remember"] = shen_remember;






shen_findall = [shen_type_func,
  function shen_user_lambda16460(Arg16459) {
  if (Arg16459.length < 5) return [shen_type_func, shen_user_lambda16460, 5, Arg16459];
  var Arg16459_0 = Arg16459[0], Arg16459_1 = Arg16459[1], Arg16459_2 = Arg16459[2], Arg16459_3 = Arg16459[3], Arg16459_4 = Arg16459[4];
  var R0, R1;
  return ((R0 = shenjs_call(shen_newpv, [Arg16459_3])),
  (R1 = shenjs_call(shen_newpv, [Arg16459_3])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [R1, shenjs_call(shen_gensym, [[shen_type_symbol, "a"]]), Arg16459_3, (new Shenjs_freeze([R0, Arg16459_0, Arg16459_1, Arg16459_2, R1, Arg16459_3, Arg16459_4], function(Arg16461) {
  var Arg16461_0 = Arg16461[0], Arg16461_1 = Arg16461[1], Arg16461_2 = Arg16461[2], Arg16461_3 = Arg16461[3], Arg16461_4 = Arg16461[4], Arg16461_5 = Arg16461[5], Arg16461_6 = Arg16461[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg16461_0, (shenjs_globals["shen_" + shenjs_call(shen_lazyderef, [Arg16461_4, Arg16461_5])[1]] = []), Arg16461_5, (new Shenjs_freeze([Arg16461_0, Arg16461_1, Arg16461_2, Arg16461_3, Arg16461_4, Arg16461_5, Arg16461_6], function(Arg16463) {
  var Arg16463_0 = Arg16463[0], Arg16463_1 = Arg16463[1], Arg16463_2 = Arg16463[2], Arg16463_3 = Arg16463[3], Arg16463_4 = Arg16463[4], Arg16463_5 = Arg16463[5], Arg16463_6 = Arg16463[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_findallhelp, [Arg16463_1, Arg16463_2, Arg16463_3, Arg16463_4, Arg16463_5, Arg16463_6]);});})}))]);});})}))]);}))},
  5,
  [],
  "findall"];
shenjs_functions["shen_findall"] = shen_findall;






shen_findallhelp = [shen_type_func,
  function shen_user_lambda16466(Arg16465) {
  if (Arg16465.length < 6) return [shen_type_func, shen_user_lambda16466, 6, Arg16465];
  var Arg16465_0 = Arg16465[0], Arg16465_1 = Arg16465[1], Arg16465_2 = Arg16465[2], Arg16465_3 = Arg16465[3], Arg16465_4 = Arg16465[4], Arg16465_5 = Arg16465[5];
  var R0;
  return ((R0 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_call, [Arg16465_1, Arg16465_4, (new Shenjs_freeze([Arg16465_1, Arg16465_0, Arg16465_2, Arg16465_3, Arg16465_4, Arg16465_5], function(Arg16467) {
  var Arg16467_0 = Arg16467[0], Arg16467_1 = Arg16467[1], Arg16467_2 = Arg16467[2], Arg16467_3 = Arg16467[3], Arg16467_4 = Arg16467[4], Arg16467_5 = Arg16467[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_remember, [Arg16467_3, Arg16467_1, Arg16467_4, (new Shenjs_freeze([Arg16467_3, Arg16467_1, Arg16467_4, Arg16467_5], function(Arg16469) {
  var Arg16469_0 = Arg16469[0], Arg16469_1 = Arg16469[1], Arg16469_2 = Arg16469[2], Arg16469_3 = Arg16469[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [false, Arg16469_2, Arg16469_3]);});})}))]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? (shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [Arg16465_2, (shenjs_globals["shen_" + shenjs_call(shen_lazyderef, [Arg16465_3, Arg16465_4])[1]]), Arg16465_4, Arg16465_5]);}))
  : R0))},
  6,
  [],
  "shen-findallhelp"];
shenjs_functions["shen_shen-findallhelp"] = shen_findallhelp;






shen_remember = [shen_type_func,
  function shen_user_lambda16472(Arg16471) {
  if (Arg16471.length < 4) return [shen_type_func, shen_user_lambda16472, 4, Arg16471];
  var Arg16471_0 = Arg16471[0], Arg16471_1 = Arg16471[1], Arg16471_2 = Arg16471[2], Arg16471_3 = Arg16471[3];
  var R0;
  return ((R0 = shenjs_call(shen_newpv, [Arg16471_2])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [R0, (shenjs_globals["shen_" + shenjs_call(shen_deref, [Arg16471_0, Arg16471_2])[1]] = [shen_type_cons, shenjs_call(shen_deref, [Arg16471_1, Arg16471_2]), (shenjs_globals["shen_" + shenjs_call(shen_deref, [Arg16471_0, Arg16471_2])[1]])]), Arg16471_2, Arg16471_3]);}))},
  4,
  [],
  "shen-remember"];
shenjs_functions["shen_shen-remember"] = shen_remember;












shen_shen = [shen_type_func,
  function shen_user_lambda15899(Arg15898) {
  if (Arg15898.length < 0) return [shen_type_func, shen_user_lambda15899, 0, Arg15898];
  return (shenjs_call(shen_credits, []),
  (function() {
  return shenjs_call_tail(shen_loop, []);}))},
  0,
  [],
  "shen-shen"];
shenjs_functions["shen_shen-shen"] = shen_shen;






shen_loop = [shen_type_func,
  function shen_user_lambda15901(Arg15900) {
  if (Arg15900.length < 0) return [shen_type_func, shen_user_lambda15901, 0, Arg15900];
  return (shenjs_call(shen_initialise$_environment, []),
  shenjs_call(shen_prompt, []),
  shenjs_trap_error(function() {return shenjs_call(shen_read_evaluate_print, []);}, [shen_type_func,
  function shen_user_lambda15903(Arg15902) {
  if (Arg15902.length < 1) return [shen_type_func, shen_user_lambda15903, 1, Arg15902];
  var Arg15902_0 = Arg15902[0];
  return (function() {
  return shenjs_pr(shenjs_error_to_string(Arg15902_0), (shenjs_globals["shen_*stinput*"]));})},
  1,
  []]),
  (function() {
  return shenjs_call_tail(shen_loop, []);}))},
  0,
  [],
  "shen-loop"];
shenjs_functions["shen_shen-loop"] = shen_loop;






shen_version = [shen_type_func,
  function shen_user_lambda15905(Arg15904) {
  if (Arg15904.length < 1) return [shen_type_func, shen_user_lambda15905, 1, Arg15904];
  var Arg15904_0 = Arg15904[0];
  return (shenjs_globals["shen_*version*"] = Arg15904_0)},
  1,
  [],
  "version"];
shenjs_functions["shen_version"] = shen_version;






shenjs_call(shen_version, ["version 6.0"]);





shen_credits = [shen_type_func,
  function shen_user_lambda15908(Arg15907) {
  if (Arg15907.length < 0) return [shen_type_func, shen_user_lambda15908, 0, Arg15907];
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
  function shen_user_lambda15910(Arg15909) {
  if (Arg15909.length < 0) return [shen_type_func, shen_user_lambda15910, 0, Arg15909];
  return (function() {
  return shenjs_call_tail(shen_multiple_set, [[shen_type_cons, [shen_type_symbol, "shen-*call*"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "shen-*infs*"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "shen-*dumped*"], [shen_type_cons, [], [shen_type_cons, [shen_type_symbol, "shen-*process-counter*"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "shen-*catch*"], [shen_type_cons, 0, []]]]]]]]]]]]);})},
  0,
  [],
  "shen-initialise_environment"];
shenjs_functions["shen_shen-initialise_environment"] = shen_initialise$_environment;






shen_multiple_set = [shen_type_func,
  function shen_user_lambda15912(Arg15911) {
  if (Arg15911.length < 1) return [shen_type_func, shen_user_lambda15912, 1, Arg15911];
  var Arg15911_0 = Arg15911[0];
  return ((shenjs_empty$question$(Arg15911_0))
  ? []
  : (((shenjs_is_type(Arg15911_0, shen_type_cons) && shenjs_is_type(Arg15911_0[2], shen_type_cons)))
  ? ((shenjs_globals["shen_" + Arg15911_0[1][1]] = Arg15911_0[2][1]),
  (function() {
  return shenjs_call_tail(shen_multiple_set, [Arg15911_0[2][2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-multiple-set"]]);})))},
  1,
  [],
  "shen-multiple-set"];
shenjs_functions["shen_shen-multiple-set"] = shen_multiple_set;






shen_destroy = [shen_type_func,
  function shen_user_lambda15914(Arg15913) {
  if (Arg15913.length < 1) return [shen_type_func, shen_user_lambda15914, 1, Arg15913];
  var Arg15913_0 = Arg15913[0];
  return (function() {
  return shenjs_call_tail(shen_declare, [Arg15913_0, []]);})},
  1,
  [],
  "destroy"];
shenjs_functions["shen_destroy"] = shen_destroy;






(shenjs_globals["shen_shen-*history*"] = []);






shen_read_evaluate_print = [shen_type_func,
  function shen_user_lambda15917(Arg15916) {
  if (Arg15916.length < 0) return [shen_type_func, shen_user_lambda15917, 0, Arg15916];
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
  function shen_user_lambda15919(Arg15918) {
  if (Arg15918.length < 2) return [shen_type_func, shen_user_lambda15919, 2, Arg15918];
  var Arg15918_0 = Arg15918[0], Arg15918_1 = Arg15918[1];
  var R0;
  return (((shenjs_is_type(Arg15918_0, shen_tuple) && (shenjs_is_type(shenjs_call(shen_snd, [Arg15918_0]), shen_type_cons) && (shenjs_is_type(shenjs_call(shen_snd, [Arg15918_0])[2], shen_type_cons) && (shenjs_empty$question$(shenjs_call(shen_snd, [Arg15918_0])[2][2]) && (shenjs_is_type(Arg15918_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg15918_0])[1], shenjs_call(shen_exclamation, []))) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg15918_0])[2][1], shenjs_call(shen_exclamation, []))))))))))
  ? (shenjs_call(shen_prbytes, [shenjs_call(shen_snd, [Arg15918_1[1]])]),
  Arg15918_1[1])
  : (((shenjs_is_type(Arg15918_0, shen_tuple) && (shenjs_is_type(shenjs_call(shen_snd, [Arg15918_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg15918_0])[1], shenjs_call(shen_exclamation, []))))))
  ? ((R0 = shenjs_call(shen_make_key, [shenjs_call(shen_snd, [Arg15918_0])[2], Arg15918_1])),
  (R0 = shenjs_call(shen_head, [shenjs_call(shen_find_past_inputs, [R0, Arg15918_1])])),
  shenjs_call(shen_prbytes, [shenjs_call(shen_snd, [R0])]),
  R0)
  : (((shenjs_is_type(Arg15918_0, shen_tuple) && (shenjs_is_type(shenjs_call(shen_snd, [Arg15918_0]), shen_type_cons) && (shenjs_empty$question$(shenjs_call(shen_snd, [Arg15918_0])[2]) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg15918_0])[1], shenjs_call(shen_percent, [])))))))
  ? (shenjs_call(shen_print_past_inputs, [[shen_type_func,
  function shen_user_lambda15921(Arg15920) {
  if (Arg15920.length < 1) return [shen_type_func, shen_user_lambda15921, 1, Arg15920];
  var Arg15920_0 = Arg15920[0];
  return true},
  1,
  []], shenjs_call(shen_reverse, [Arg15918_1]), 0]),
  (function() {
  return shenjs_call_tail(shen_abort, []);}))
  : (((shenjs_is_type(Arg15918_0, shen_tuple) && (shenjs_is_type(shenjs_call(shen_snd, [Arg15918_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg15918_0])[1], shenjs_call(shen_percent, []))))))
  ? ((R0 = shenjs_call(shen_make_key, [shenjs_call(shen_snd, [Arg15918_0])[2], Arg15918_1])),
  shenjs_call(shen_print_past_inputs, [R0, shenjs_call(shen_reverse, [Arg15918_1]), 0]),
  (function() {
  return shenjs_call_tail(shen_abort, []);}))
  : Arg15918_0))))},
  2,
  [],
  "shen-retrieve-from-history-if-needed"];
shenjs_functions["shen_shen-retrieve-from-history-if-needed"] = shen_retrieve_from_history_if_needed;






shen_percent = [shen_type_func,
  function shen_user_lambda15923(Arg15922) {
  if (Arg15922.length < 0) return [shen_type_func, shen_user_lambda15923, 0, Arg15922];
  return 37},
  0,
  [],
  "shen-percent"];
shenjs_functions["shen_shen-percent"] = shen_percent;






shen_exclamation = [shen_type_func,
  function shen_user_lambda15925(Arg15924) {
  if (Arg15924.length < 0) return [shen_type_func, shen_user_lambda15925, 0, Arg15924];
  return 33},
  0,
  [],
  "shen-exclamation"];
shenjs_functions["shen_shen-exclamation"] = shen_exclamation;






shen_prbytes = [shen_type_func,
  function shen_user_lambda15927(Arg15926) {
  if (Arg15926.length < 1) return [shen_type_func, shen_user_lambda15927, 1, Arg15926];
  var Arg15926_0 = Arg15926[0];
  return (shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda15929(Arg15928) {
  if (Arg15928.length < 1) return [shen_type_func, shen_user_lambda15929, 1, Arg15928];
  var Arg15928_0 = Arg15928[0];
  return (function() {
  return shenjs_pr(shenjs_n_$gt$string(Arg15928_0), shenjs_call(shen_stinput, [0]));})},
  1,
  []], Arg15926_0]),
  (function() {
  return shenjs_call_tail(shen_nl, [1]);}))},
  1,
  [],
  "shen-prbytes"];
shenjs_functions["shen_shen-prbytes"] = shen_prbytes;






shen_update$_history = [shen_type_func,
  function shen_user_lambda15931(Arg15930) {
  if (Arg15930.length < 2) return [shen_type_func, shen_user_lambda15931, 2, Arg15930];
  var Arg15930_0 = Arg15930[0], Arg15930_1 = Arg15930[1];
  return (shenjs_globals["shen_shen-*history*"] = [shen_type_cons, Arg15930_0, Arg15930_1])},
  2,
  [],
  "shen-update_history"];
shenjs_functions["shen_shen-update_history"] = shen_update$_history;






shen_toplineread = [shen_type_func,
  function shen_user_lambda15933(Arg15932) {
  if (Arg15932.length < 0) return [shen_type_func, shen_user_lambda15933, 0, Arg15932];
  return (function() {
  return shenjs_call_tail(shen_toplineread$_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), []]);})},
  0,
  [],
  "shen-toplineread"];
shenjs_functions["shen_shen-toplineread"] = shen_toplineread;






shen_toplineread$_loop = [shen_type_func,
  function shen_user_lambda15935(Arg15934) {
  if (Arg15934.length < 2) return [shen_type_func, shen_user_lambda15935, 2, Arg15934];
  var Arg15934_0 = Arg15934[0], Arg15934_1 = Arg15934[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg15934_0, shenjs_call(shen_hat, []))))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["line read aborted", []]);})
  : ((shenjs_call(shen_element$question$, [Arg15934_0, [shen_type_cons, shenjs_call(shen_newline, []), [shen_type_cons, shenjs_call(shen_carriage_return, []), []]]]))
  ? ((R0 = shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda15937(Arg15936) {
  if (Arg15936.length < 1) return [shen_type_func, shen_user_lambda15937, 1, Arg15936];
  var Arg15936_0 = Arg15936[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$st$_input$gt$, [Arg15936_0]);})},
  1,
  []], Arg15934_1, []])),
  (((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)) || shenjs_empty$question$(R0)))
  ? (function() {
  return shenjs_call_tail(shen_toplineread$_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), shenjs_call(shen_append, [Arg15934_1, [shen_type_cons, Arg15934_0, []]])]);})
  : [shen_tuple, R0, Arg15934_1]))
  : (function() {
  return shenjs_call_tail(shen_toplineread$_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), shenjs_call(shen_append, [Arg15934_1, [shen_type_cons, Arg15934_0, []]])]);})))},
  2,
  [],
  "shen-toplineread_loop"];
shenjs_functions["shen_shen-toplineread_loop"] = shen_toplineread$_loop;






shen_hat = [shen_type_func,
  function shen_user_lambda15939(Arg15938) {
  if (Arg15938.length < 0) return [shen_type_func, shen_user_lambda15939, 0, Arg15938];
  return 94},
  0,
  [],
  "shen-hat"];
shenjs_functions["shen_shen-hat"] = shen_hat;






shen_newline = [shen_type_func,
  function shen_user_lambda15941(Arg15940) {
  if (Arg15940.length < 0) return [shen_type_func, shen_user_lambda15941, 0, Arg15940];
  return 10},
  0,
  [],
  "shen-newline"];
shenjs_functions["shen_shen-newline"] = shen_newline;






shen_carriage_return = [shen_type_func,
  function shen_user_lambda15943(Arg15942) {
  if (Arg15942.length < 0) return [shen_type_func, shen_user_lambda15943, 0, Arg15942];
  return 13},
  0,
  [],
  "shen-carriage-return"];
shenjs_functions["shen_shen-carriage-return"] = shen_carriage_return;






shen_tc = [shen_type_func,
  function shen_user_lambda15945(Arg15944) {
  if (Arg15944.length < 1) return [shen_type_func, shen_user_lambda15945, 1, Arg15944];
  var Arg15944_0 = Arg15944[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg15944_0)))
  ? (shenjs_globals["shen_shen-*tc*"] = true)
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg15944_0)))
  ? (shenjs_globals["shen_shen-*tc*"] = false)
  : (function() {
  return shenjs_call_tail(shen_interror, ["tc expects a + or -", []]);})))},
  1,
  [],
  "tc"];
shenjs_functions["shen_tc"] = shen_tc;






shen_prompt = [shen_type_func,
  function shen_user_lambda15947(Arg15946) {
  if (Arg15946.length < 0) return [shen_type_func, shen_user_lambda15947, 0, Arg15946];
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
  function shen_user_lambda15949(Arg15948) {
  if (Arg15948.length < 1) return [shen_type_func, shen_user_lambda15949, 1, Arg15948];
  var Arg15948_0 = Arg15948[0];
  return (function() {
  return shenjs_call_tail(shen_toplevel$_evaluate, [Arg15948_0, (shenjs_globals["shen_shen-*tc*"])]);})},
  1,
  [],
  "shen-toplevel"];
shenjs_functions["shen_shen-toplevel"] = shen_toplevel;






shen_find_past_inputs = [shen_type_func,
  function shen_user_lambda15951(Arg15950) {
  if (Arg15950.length < 2) return [shen_type_func, shen_user_lambda15951, 2, Arg15950];
  var Arg15950_0 = Arg15950[0], Arg15950_1 = Arg15950[1];
  var R0;
  return ((R0 = shenjs_call(shen_find, [Arg15950_0, Arg15950_1])),
  ((shenjs_empty$question$(R0))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["input not found~%", []]);})
  : R0))},
  2,
  [],
  "shen-find-past-inputs"];
shenjs_functions["shen_shen-find-past-inputs"] = shen_find_past_inputs;






shen_make_key = [shen_type_func,
  function shen_user_lambda15953(Arg15952) {
  if (Arg15952.length < 2) return [shen_type_func, shen_user_lambda15953, 2, Arg15952];
  var Arg15952_0 = Arg15952[0], Arg15952_1 = Arg15952[1];
  var R0;
  return ((R0 = shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda15955(Arg15954) {
  if (Arg15954.length < 1) return [shen_type_func, shen_user_lambda15955, 1, Arg15954];
  var Arg15954_0 = Arg15954[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$st$_input$gt$, [Arg15954_0]);})},
  1,
  []], Arg15952_0, []])[1]),
  ((shenjs_call(shen_integer$question$, [R0]))
  ? [shen_type_func,
  function shen_user_lambda15957(Arg15956) {
  if (Arg15956.length < 3) return [shen_type_func, shen_user_lambda15957, 3, Arg15956];
  var Arg15956_0 = Arg15956[0], Arg15956_1 = Arg15956[1], Arg15956_2 = Arg15956[2];
  return shenjs_$eq$(Arg15956_2, shenjs_call(shen_nth, [(Arg15956_0 + 1), shenjs_call(shen_reverse, [Arg15956_1])]))},
  3,
  [R0, Arg15952_1]]
  : [shen_type_func,
  function shen_user_lambda15959(Arg15958) {
  if (Arg15958.length < 2) return [shen_type_func, shen_user_lambda15959, 2, Arg15958];
  var Arg15958_0 = Arg15958[0], Arg15958_1 = Arg15958[1];
  return (function() {
  return shenjs_call_tail(shen_prefix$question$, [Arg15958_0, shenjs_call(shen_trim_gubbins, [shenjs_call(shen_snd, [Arg15958_1])])]);})},
  2,
  [Arg15952_0]]))},
  2,
  [],
  "shen-make-key"];
shenjs_functions["shen_shen-make-key"] = shen_make_key;






shen_trim_gubbins = [shen_type_func,
  function shen_user_lambda15961(Arg15960) {
  if (Arg15960.length < 1) return [shen_type_func, shen_user_lambda15961, 1, Arg15960];
  var Arg15960_0 = Arg15960[0];
  return (((shenjs_is_type(Arg15960_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg15960_0[1], shenjs_call(shen_space, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg15960_0[2]]);})
  : (((shenjs_is_type(Arg15960_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg15960_0[1], shenjs_call(shen_newline, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg15960_0[2]]);})
  : (((shenjs_is_type(Arg15960_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg15960_0[1], shenjs_call(shen_carriage_return, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg15960_0[2]]);})
  : (((shenjs_is_type(Arg15960_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg15960_0[1], shenjs_call(shen_tab, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg15960_0[2]]);})
  : (((shenjs_is_type(Arg15960_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg15960_0[1], shenjs_call(shen_left_round, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg15960_0[2]]);})
  : Arg15960_0)))))},
  1,
  [],
  "shen-trim-gubbins"];
shenjs_functions["shen_shen-trim-gubbins"] = shen_trim_gubbins;






shen_space = [shen_type_func,
  function shen_user_lambda15963(Arg15962) {
  if (Arg15962.length < 0) return [shen_type_func, shen_user_lambda15963, 0, Arg15962];
  return 32},
  0,
  [],
  "shen-space"];
shenjs_functions["shen_shen-space"] = shen_space;






shen_tab = [shen_type_func,
  function shen_user_lambda15965(Arg15964) {
  if (Arg15964.length < 0) return [shen_type_func, shen_user_lambda15965, 0, Arg15964];
  return 9},
  0,
  [],
  "shen-tab"];
shenjs_functions["shen_shen-tab"] = shen_tab;






shen_left_round = [shen_type_func,
  function shen_user_lambda15967(Arg15966) {
  if (Arg15966.length < 0) return [shen_type_func, shen_user_lambda15967, 0, Arg15966];
  return 40},
  0,
  [],
  "shen-left-round"];
shenjs_functions["shen_shen-left-round"] = shen_left_round;






shen_find = [shen_type_func,
  function shen_user_lambda15969(Arg15968) {
  if (Arg15968.length < 2) return [shen_type_func, shen_user_lambda15969, 2, Arg15968];
  var Arg15968_0 = Arg15968[0], Arg15968_1 = Arg15968[1];
  return ((shenjs_empty$question$(Arg15968_1))
  ? []
  : (((shenjs_is_type(Arg15968_1, shen_type_cons) && shenjs_call(Arg15968_0, [Arg15968_1[1]])))
  ? [shen_type_cons, Arg15968_1[1], shenjs_call(shen_find, [Arg15968_0, Arg15968_1[2]])]
  : ((shenjs_is_type(Arg15968_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_find, [Arg15968_0, Arg15968_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-find"]]);}))))},
  2,
  [],
  "shen-find"];
shenjs_functions["shen_shen-find"] = shen_find;






shen_prefix$question$ = [shen_type_func,
  function shen_user_lambda15971(Arg15970) {
  if (Arg15970.length < 2) return [shen_type_func, shen_user_lambda15971, 2, Arg15970];
  var Arg15970_0 = Arg15970[0], Arg15970_1 = Arg15970[1];
  return ((shenjs_empty$question$(Arg15970_0))
  ? true
  : (((shenjs_is_type(Arg15970_0, shen_type_cons) && (shenjs_is_type(Arg15970_1, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg15970_1[1], Arg15970_0[1])))))
  ? (function() {
  return shenjs_call_tail(shen_prefix$question$, [Arg15970_0[2], Arg15970_1[2]]);})
  : false))},
  2,
  [],
  "shen-prefix?"];
shenjs_functions["shen_shen-prefix?"] = shen_prefix$question$;






shen_print_past_inputs = [shen_type_func,
  function shen_user_lambda15973(Arg15972) {
  if (Arg15972.length < 3) return [shen_type_func, shen_user_lambda15973, 3, Arg15972];
  var Arg15972_0 = Arg15972[0], Arg15972_1 = Arg15972[1], Arg15972_2 = Arg15972[2];
  return ((shenjs_empty$question$(Arg15972_1))
  ? [shen_type_symbol, "_"]
  : (((shenjs_is_type(Arg15972_1, shen_type_cons) && (!shenjs_call(Arg15972_0, [Arg15972_1[1]]))))
  ? (function() {
  return shenjs_call_tail(shen_print_past_inputs, [Arg15972_0, Arg15972_1[2], (Arg15972_2 + 1)]);})
  : (((shenjs_is_type(Arg15972_1, shen_type_cons) && shenjs_is_type(Arg15972_1[1], shen_tuple)))
  ? (shenjs_call(shen_intoutput, ["~A. ", [shen_tuple, Arg15972_2, []]]),
  shenjs_call(shen_prbytes, [shenjs_call(shen_snd, [Arg15972_1[1]])]),
  (function() {
  return shenjs_call_tail(shen_print_past_inputs, [Arg15972_0, Arg15972_1[2], (Arg15972_2 + 1)]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-print-past-inputs"]]);}))))},
  3,
  [],
  "shen-print-past-inputs"];
shenjs_functions["shen_shen-print-past-inputs"] = shen_print_past_inputs;






shen_toplevel$_evaluate = [shen_type_func,
  function shen_user_lambda15975(Arg15974) {
  if (Arg15974.length < 2) return [shen_type_func, shen_user_lambda15975, 2, Arg15974];
  var Arg15974_0 = Arg15974[0], Arg15974_1 = Arg15974[1];
  var R0;
  return (((shenjs_is_type(Arg15974_0, shen_type_cons) && (shenjs_is_type(Arg15974_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], Arg15974_0[2][1])) && (shenjs_is_type(Arg15974_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg15974_0[2][2][2]) && shenjs_unwind_tail(shenjs_$eq$(true, Arg15974_1))))))))
  ? (function() {
  return shenjs_call_tail(shen_typecheck_and_evaluate, [Arg15974_0[1], Arg15974_0[2][2][1]]);})
  : (((shenjs_is_type(Arg15974_0, shen_type_cons) && shenjs_is_type(Arg15974_0[2], shen_type_cons)))
  ? (shenjs_call(shen_toplevel$_evaluate, [[shen_type_cons, Arg15974_0[1], []], Arg15974_1]),
  ((shenjs_unwind_tail(shenjs_$eq$((shenjs_globals["shen_shen-*hush*"]), [shen_type_symbol, "shen-hushed"])))
  ? [shen_type_symbol, "shen-skip"]
  : shenjs_call(shen_nl, [1])),
  (function() {
  return shenjs_call_tail(shen_toplevel$_evaluate, [Arg15974_0[2], Arg15974_1]);}))
  : (((shenjs_is_type(Arg15974_0, shen_type_cons) && (shenjs_empty$question$(Arg15974_0[2]) && shenjs_unwind_tail(shenjs_$eq$(true, Arg15974_1)))))
  ? (function() {
  return shenjs_call_tail(shen_typecheck_and_evaluate, [Arg15974_0[1], shenjs_call(shen_gensym, [[shen_type_symbol, "A"]])]);})
  : (((shenjs_is_type(Arg15974_0, shen_type_cons) && (shenjs_empty$question$(Arg15974_0[2]) && shenjs_unwind_tail(shenjs_$eq$(false, Arg15974_1)))))
  ? ((R0 = shenjs_call(shen_eval_without_macros, [Arg15974_0[1]])),
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
  function shen_user_lambda15977(Arg15976) {
  if (Arg15976.length < 2) return [shen_type_func, shen_user_lambda15977, 2, Arg15976];
  var Arg15976_0 = Arg15976[0], Arg15976_1 = Arg15976[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_typecheck, [Arg15976_0, Arg15976_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["type error~%", []]);})
  : ((R1 = shenjs_call(shen_eval_without_macros, [Arg15976_0])),
  (R0 = shenjs_call(shen_pretty_type, [R0])),
  (((shenjs_unwind_tail(shenjs_$eq$((shenjs_globals["shen_shen-*hush*"]), [shen_type_symbol, "shen-hushed"])) || shenjs_unwind_tail(shenjs_$eq$(Arg15976_0, [shen_type_symbol, "shen-unhushed"]))))
  ? [shen_type_symbol, "shen-skip"]
  : (function() {
  return shenjs_call_tail(shen_intoutput, ["~S : ~R", [shen_tuple, R1, [shen_tuple, R0, []]]]);})))))},
  2,
  [],
  "shen-typecheck-and-evaluate"];
shenjs_functions["shen_shen-typecheck-and-evaluate"] = shen_typecheck_and_evaluate;






shen_pretty_type = [shen_type_func,
  function shen_user_lambda15979(Arg15978) {
  if (Arg15978.length < 1) return [shen_type_func, shen_user_lambda15979, 1, Arg15978];
  var Arg15978_0 = Arg15978[0];
  return (function() {
  return shenjs_call_tail(shen_mult$_subst, [(shenjs_globals["shen_shen-*alphabet*"]), shenjs_call(shen_extract_pvars, [Arg15978_0]), Arg15978_0]);})},
  1,
  [],
  "shen-pretty-type"];
shenjs_functions["shen_shen-pretty-type"] = shen_pretty_type;






shen_extract_pvars = [shen_type_func,
  function shen_user_lambda15981(Arg15980) {
  if (Arg15980.length < 1) return [shen_type_func, shen_user_lambda15981, 1, Arg15980];
  var Arg15980_0 = Arg15980[0];
  return ((shenjs_call(shen_pvar$question$, [Arg15980_0]))
  ? [shen_type_cons, Arg15980_0, []]
  : ((shenjs_is_type(Arg15980_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_union, [shenjs_call(shen_extract_pvars, [Arg15980_0[1]]), shenjs_call(shen_extract_pvars, [Arg15980_0[2]])]);})
  : []))},
  1,
  [],
  "shen-extract-pvars"];
shenjs_functions["shen_shen-extract-pvars"] = shen_extract_pvars;






shen_mult$_subst = [shen_type_func,
  function shen_user_lambda15983(Arg15982) {
  if (Arg15982.length < 3) return [shen_type_func, shen_user_lambda15983, 3, Arg15982];
  var Arg15982_0 = Arg15982[0], Arg15982_1 = Arg15982[1], Arg15982_2 = Arg15982[2];
  return ((shenjs_empty$question$(Arg15982_0))
  ? Arg15982_2
  : ((shenjs_empty$question$(Arg15982_1))
  ? Arg15982_2
  : (((shenjs_is_type(Arg15982_0, shen_type_cons) && shenjs_is_type(Arg15982_1, shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(shen_mult$_subst, [Arg15982_0[2], Arg15982_1[2], shenjs_call(shen_subst, [Arg15982_0[1], Arg15982_1[1], Arg15982_2])]);})
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
