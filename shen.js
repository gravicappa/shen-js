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
  function shen_user_lambda5058(Arg5057) {
  if (Arg5057.length < 1) return [shen_type_func, shen_user_lambda5058, 1, Arg5057];
  var Arg5057_0 = Arg5057[0];
  var R0;
  return ((R0 = shenjs_call(shen_walk, [[shen_type_func,
  function shen_user_lambda5060(Arg5059) {
  if (Arg5059.length < 1) return [shen_type_func, shen_user_lambda5060, 1, Arg5059];
  var Arg5059_0 = Arg5059[0];
  return (function() {
  return shenjs_call_tail(shen_macroexpand, [Arg5059_0]);})},
  1,
  []], Arg5057_0])),
  ((shenjs_call(shen_packaged$question$, [R0]))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda5062(Arg5061) {
  if (Arg5061.length < 1) return [shen_type_func, shen_user_lambda5062, 1, Arg5061];
  var Arg5061_0 = Arg5061[0];
  return (function() {
  return shenjs_call_tail(shen_eval_without_macros, [Arg5061_0]);})},
  1,
  []], shenjs_call(shen_package_contents, [R0])]);})
  : (function() {
  return shenjs_call_tail(shen_eval_without_macros, [R0]);})))},
  1,
  [],
  "eval"];
shenjs_functions["shen_eval"] = shen_eval;






shen_eval_without_macros = [shen_type_func,
  function shen_user_lambda5064(Arg5063) {
  if (Arg5063.length < 1) return [shen_type_func, shen_user_lambda5064, 1, Arg5063];
  var Arg5063_0 = Arg5063[0];
  return (function() {
  return shenjs_eval_kl(shenjs_call(shen_elim_define, [shenjs_call(shen_proc_input$plus$, [Arg5063_0])]));})},
  1,
  [],
  "shen-eval-without-macros"];
shenjs_functions["shen_shen-eval-without-macros"] = shen_eval_without_macros;






shen_proc_input$plus$ = [shen_type_func,
  function shen_user_lambda5066(Arg5065) {
  if (Arg5065.length < 1) return [shen_type_func, shen_user_lambda5066, 1, Arg5065];
  var Arg5065_0 = Arg5065[0];
  return (((shenjs_is_type(Arg5065_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "input+"], Arg5065_0[1])) && (shenjs_is_type(Arg5065_0[2], shen_type_cons) && (shenjs_is_type(Arg5065_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg5065_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "input+"], [shen_type_cons, Arg5065_0[2][1], [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg5065_0[2][2][1]]), []]]]
  : ((shenjs_is_type(Arg5065_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda5068(Arg5067) {
  if (Arg5067.length < 1) return [shen_type_func, shen_user_lambda5068, 1, Arg5067];
  var Arg5067_0 = Arg5067[0];
  return (function() {
  return shenjs_call_tail(shen_proc_input$plus$, [Arg5067_0]);})},
  1,
  []], Arg5065_0]);})
  : Arg5065_0))},
  1,
  [],
  "shen-proc-input+"];
shenjs_functions["shen_shen-proc-input+"] = shen_proc_input$plus$;






shen_elim_define = [shen_type_func,
  function shen_user_lambda5070(Arg5069) {
  if (Arg5069.length < 1) return [shen_type_func, shen_user_lambda5070, 1, Arg5069];
  var Arg5069_0 = Arg5069[0];
  return (((shenjs_is_type(Arg5069_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "define"], Arg5069_0[1])) && shenjs_is_type(Arg5069_0[2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_shen_$gt$kl, [Arg5069_0[2][1], Arg5069_0[2][2]]);})
  : ((shenjs_is_type(Arg5069_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda5072(Arg5071) {
  if (Arg5071.length < 1) return [shen_type_func, shen_user_lambda5072, 1, Arg5071];
  var Arg5071_0 = Arg5071[0];
  return (function() {
  return shenjs_call_tail(shen_elim_define, [Arg5071_0]);})},
  1,
  []], Arg5069_0]);})
  : Arg5069_0))},
  1,
  [],
  "shen-elim-define"];
shenjs_functions["shen_shen-elim-define"] = shen_elim_define;






shen_packaged$question$ = [shen_type_func,
  function shen_user_lambda5074(Arg5073) {
  if (Arg5073.length < 1) return [shen_type_func, shen_user_lambda5074, 1, Arg5073];
  var Arg5073_0 = Arg5073[0];
  return (((shenjs_is_type(Arg5073_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg5073_0[1])) && (shenjs_is_type(Arg5073_0[2], shen_type_cons) && shenjs_is_type(Arg5073_0[2][2], shen_type_cons)))))
  ? true
  : false)},
  1,
  [],
  "shen-packaged?"];
shenjs_functions["shen_shen-packaged?"] = shen_packaged$question$;






shen_external = [shen_type_func,
  function shen_user_lambda5076(Arg5075) {
  if (Arg5075.length < 1) return [shen_type_func, shen_user_lambda5076, 1, Arg5075];
  var Arg5075_0 = Arg5075[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg5075_0, [shen_type_symbol, "shen-external-symbols"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda5078(Arg5077) {
  if (Arg5077.length < 1) return [shen_type_func, shen_user_lambda5078, 1, Arg5077];
  var Arg5077_0 = Arg5077[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["package ~A has not been used.~", []]);})},
  1,
  []]);})},
  1,
  [],
  "external"];
shenjs_functions["shen_external"] = shen_external;






shen_package_contents = [shen_type_func,
  function shen_user_lambda5080(Arg5079) {
  if (Arg5079.length < 1) return [shen_type_func, shen_user_lambda5080, 1, Arg5079];
  var Arg5079_0 = Arg5079[0];
  return (((shenjs_is_type(Arg5079_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg5079_0[1])) && (shenjs_is_type(Arg5079_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "null"], Arg5079_0[2][1])) && shenjs_is_type(Arg5079_0[2][2], shen_type_cons))))))
  ? Arg5079_0[2][2][2]
  : (((shenjs_is_type(Arg5079_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg5079_0[1])) && (shenjs_is_type(Arg5079_0[2], shen_type_cons) && shenjs_is_type(Arg5079_0[2][2], shen_type_cons)))))
  ? (function() {
  return shenjs_call_tail(shen_packageh, [Arg5079_0[2][1], Arg5079_0[2][2][1], [shen_type_symbol, "Code"]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-package-contents"]]);})))},
  1,
  [],
  "shen-package-contents"];
shenjs_functions["shen_shen-package-contents"] = shen_package_contents;






shen_walk = [shen_type_func,
  function shen_user_lambda5082(Arg5081) {
  if (Arg5081.length < 2) return [shen_type_func, shen_user_lambda5082, 2, Arg5081];
  var Arg5081_0 = Arg5081[0], Arg5081_1 = Arg5081[1];
  return ((shenjs_is_type(Arg5081_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(Arg5081_0, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5084(Arg5083) {
  if (Arg5083.length < 2) return [shen_type_func, shen_user_lambda5084, 2, Arg5083];
  var Arg5083_0 = Arg5083[0], Arg5083_1 = Arg5083[1];
  return (function() {
  return shenjs_call_tail(shen_walk, [Arg5083_0, Arg5083_1]);})},
  2,
  [Arg5081_0]], Arg5081_1])]);})
  : (function() {
  return shenjs_call_tail(Arg5081_0, [Arg5081_1]);}))},
  2,
  [],
  "shen-walk"];
shenjs_functions["shen_shen-walk"] = shen_walk;






shen_compile = [shen_type_func,
  function shen_user_lambda5086(Arg5085) {
  if (Arg5085.length < 3) return [shen_type_func, shen_user_lambda5086, 3, Arg5085];
  var Arg5085_0 = Arg5085[0], Arg5085_1 = Arg5085[1], Arg5085_2 = Arg5085[2];
  var R0;
  return ((R0 = shenjs_call(Arg5085_0, [[shen_tuple, Arg5085_1, []]])),
  (((shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0)) || (!shenjs_empty$question$(shenjs_call(shen_fst, [R0])))))
  ? (function() {
  return shenjs_call_tail(shen_compile_error, [R0, Arg5085_2]);})
  : (function() {
  return shenjs_call_tail(shen_snd, [R0]);})))},
  3,
  [],
  "compile"];
shenjs_functions["shen_compile"] = shen_compile;






shen_compile_error = [shen_type_func,
  function shen_user_lambda5088(Arg5087) {
  if (Arg5087.length < 2) return [shen_type_func, shen_user_lambda5088, 2, Arg5087];
  var Arg5087_0 = Arg5087[0], Arg5087_1 = Arg5087[1];
  return ((shenjs_empty$question$(Arg5087_1))
  ? shen_fail_obj
  : (((shenjs_is_type(Arg5087_0, shen_tuple) && shenjs_is_type(shenjs_call(shen_fst, [Arg5087_0]), shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(Arg5087_1, [shenjs_call(shen_fst, [Arg5087_0])]);})
  : (function() {
  return shenjs_call_tail(shen_interror, ["syntax error~%", []]);})))},
  2,
  [],
  "shen-compile-error"];
shenjs_functions["shen_shen-compile-error"] = shen_compile_error;






shen_$lt$e$gt$ = [shen_type_func,
  function shen_user_lambda5090(Arg5089) {
  if (Arg5089.length < 1) return [shen_type_func, shen_user_lambda5090, 1, Arg5089];
  var Arg5089_0 = Arg5089[0];
  return ((shenjs_is_type(Arg5089_0, shen_tuple))
  ? [shen_tuple, shenjs_call(shen_fst, [Arg5089_0]), []]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "<e>"]]);}))},
  1,
  [],
  "<e>"];
shenjs_functions["shen_<e>"] = shen_$lt$e$gt$;






shen_fail_if = [shen_type_func,
  function shen_user_lambda5092(Arg5091) {
  if (Arg5091.length < 2) return [shen_type_func, shen_user_lambda5092, 2, Arg5091];
  var Arg5091_0 = Arg5091[0], Arg5091_1 = Arg5091[1];
  return ((shenjs_call(Arg5091_0, [Arg5091_1]))
  ? shen_fail_obj
  : Arg5091_1)},
  2,
  [],
  "fail-if"];
shenjs_functions["shen_fail-if"] = shen_fail_if;






shen_$at$s = [shen_type_func,
  function shen_user_lambda5094(Arg5093) {
  if (Arg5093.length < 2) return [shen_type_func, shen_user_lambda5094, 2, Arg5093];
  var Arg5093_0 = Arg5093[0], Arg5093_1 = Arg5093[1];
  return (Arg5093_0 + Arg5093_1)},
  2,
  [],
  "@s"];
shenjs_functions["shen_@s"] = shen_$at$s;






shen_tc$question$ = [shen_type_func,
  function shen_user_lambda5096(Arg5095) {
  if (Arg5095.length < 1) return [shen_type_func, shen_user_lambda5096, 1, Arg5095];
  var Arg5095_0 = Arg5095[0];
  return (shenjs_globals["shen_shen-*tc*"])},
  1,
  [],
  "tc?"];
shenjs_functions["shen_tc?"] = shen_tc$question$;






shen_ps = [shen_type_func,
  function shen_user_lambda5098(Arg5097) {
  if (Arg5097.length < 1) return [shen_type_func, shen_user_lambda5098, 1, Arg5097];
  var Arg5097_0 = Arg5097[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg5097_0, [shen_type_symbol, "shen-source"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda5100(Arg5099) {
  if (Arg5099.length < 2) return [shen_type_func, shen_user_lambda5100, 2, Arg5099];
  var Arg5099_0 = Arg5099[0], Arg5099_1 = Arg5099[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["~A not found.~%", [shen_tuple, Arg5099_0, []]]);})},
  2,
  [Arg5097_0]]);})},
  1,
  [],
  "ps"];
shenjs_functions["shen_ps"] = shen_ps;






shen_explode = [shen_type_func,
  function shen_user_lambda5102(Arg5101) {
  if (Arg5101.length < 1) return [shen_type_func, shen_user_lambda5102, 1, Arg5101];
  var Arg5101_0 = Arg5101[0];
  return (((typeof(Arg5101_0) == 'string'))
  ? (function() {
  return shenjs_call_tail(shen_explode_string, [Arg5101_0]);})
  : (function() {
  return shenjs_call_tail(shen_explode, [shenjs_call(shen_intmake_string, ["~A", [shen_tuple, Arg5101_0, []]])]);}))},
  1,
  [],
  "explode"];
shenjs_functions["shen_explode"] = shen_explode;






shen_explode_string = [shen_type_func,
  function shen_user_lambda5104(Arg5103) {
  if (Arg5103.length < 1) return [shen_type_func, shen_user_lambda5104, 1, Arg5103];
  var Arg5103_0 = Arg5103[0];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$("", Arg5103_0)))
  ? []
  : ((R0 = Arg5103_0[0]),
  (R1 = shenjs_tlstr(Arg5103_0)),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, [shen_type_symbol, "shen-eos"])))
  ? []
  : [shen_type_cons, R0, shenjs_call(shen_explode_string, [R1])])))},
  1,
  [],
  "shen-explode-string"];
shenjs_functions["shen_shen-explode-string"] = shen_explode_string;






shen_stinput = [shen_type_func,
  function shen_user_lambda5106(Arg5105) {
  if (Arg5105.length < 1) return [shen_type_func, shen_user_lambda5106, 1, Arg5105];
  var Arg5105_0 = Arg5105[0];
  return (shenjs_globals["shen_*stinput*"])},
  1,
  [],
  "stinput"];
shenjs_functions["shen_stinput"] = shen_stinput;






shen_$plus$vector$question$ = [shen_type_func,
  function shen_user_lambda5108(Arg5107) {
  if (Arg5107.length < 1) return [shen_type_func, shen_user_lambda5108, 1, Arg5107];
  var Arg5107_0 = Arg5107[0];
  return (shenjs_absvector$question$(Arg5107_0) && (shenjs_absvector_ref(Arg5107_0, 0) > 0))},
  1,
  [],
  "shen-+vector?"];
shenjs_functions["shen_shen-+vector?"] = shen_$plus$vector$question$;












shen_fillvector = [shen_type_func,
  function shen_user_lambda5111(Arg5110) {
  if (Arg5110.length < 4) return [shen_type_func, shen_user_lambda5111, 4, Arg5110];
  var Arg5110_0 = Arg5110[0], Arg5110_1 = Arg5110[1], Arg5110_2 = Arg5110[2], Arg5110_3 = Arg5110[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5110_2, Arg5110_1)))
  ? shenjs_absvector_set(Arg5110_0, Arg5110_2, Arg5110_3)
  : (function() {
  return shenjs_call_tail(shen_fillvector, [shenjs_absvector_set(Arg5110_0, Arg5110_1, Arg5110_3), (1 + Arg5110_1), Arg5110_2, Arg5110_3]);}))},
  4,
  [],
  "shen-fillvector"];
shenjs_functions["shen_shen-fillvector"] = shen_fillvector;












shen_vector_$gt$ = [shen_type_func,
  function shen_user_lambda5114(Arg5113) {
  if (Arg5113.length < 3) return [shen_type_func, shen_user_lambda5114, 3, Arg5113];
  var Arg5113_0 = Arg5113[0], Arg5113_1 = Arg5113[1], Arg5113_2 = Arg5113[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5113_1, 0)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["cannot access 0th element of a vector~%", []]);})
  : shenjs_absvector_set(Arg5113_0, Arg5113_1, Arg5113_2))},
  3,
  [],
  "vector->"];
shenjs_functions["shen_vector->"] = shen_vector_$gt$;






shen_$lt$_vector = [shen_type_func,
  function shen_user_lambda5116(Arg5115) {
  if (Arg5115.length < 2) return [shen_type_func, shen_user_lambda5116, 2, Arg5115];
  var Arg5115_0 = Arg5115[0], Arg5115_1 = Arg5115[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5115_1, 0)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["cannot access 0th element of a vector~%", []]);})
  : ((R0 = shenjs_absvector_ref(Arg5115_0, Arg5115_1)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["vector element not found~%", []]);})
  : R0)))},
  2,
  [],
  "<-vector"];
shenjs_functions["shen_<-vector"] = shen_$lt$_vector;






shen_posint$question$ = [shen_type_func,
  function shen_user_lambda5118(Arg5117) {
  if (Arg5117.length < 1) return [shen_type_func, shen_user_lambda5118, 1, Arg5117];
  var Arg5117_0 = Arg5117[0];
  return (shenjs_call(shen_integer$question$, [Arg5117_0]) && (Arg5117_0 >= 0))},
  1,
  [],
  "shen-posint?"];
shenjs_functions["shen_shen-posint?"] = shen_posint$question$;






shen_limit = [shen_type_func,
  function shen_user_lambda5120(Arg5119) {
  if (Arg5119.length < 1) return [shen_type_func, shen_user_lambda5120, 1, Arg5119];
  var Arg5119_0 = Arg5119[0];
  return shenjs_absvector_ref(Arg5119_0, 0)},
  1,
  [],
  "limit"];
shenjs_functions["shen_limit"] = shen_limit;












shen_analyse_symbol$question$ = [shen_type_func,
  function shen_user_lambda5123(Arg5122) {
  if (Arg5122.length < 1) return [shen_type_func, shen_user_lambda5123, 1, Arg5122];
  var Arg5122_0 = Arg5122[0];
  return ((shenjs_is_type(Arg5122_0, shen_type_cons))
  ? (shenjs_call(shen_alpha$question$, [Arg5122_0[1]]) && shenjs_call(shen_alphanums$question$, [Arg5122_0[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-analyse-symbol?"]]);}))},
  1,
  [],
  "shen-analyse-symbol?"];
shenjs_functions["shen_shen-analyse-symbol?"] = shen_analyse_symbol$question$;






shen_alpha$question$ = [shen_type_func,
  function shen_user_lambda5125(Arg5124) {
  if (Arg5124.length < 1) return [shen_type_func, shen_user_lambda5125, 1, Arg5124];
  var Arg5124_0 = Arg5124[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5124_0, [shen_type_cons, "A", [shen_type_cons, "B", [shen_type_cons, "C", [shen_type_cons, "D", [shen_type_cons, "E", [shen_type_cons, "F", [shen_type_cons, "G", [shen_type_cons, "H", [shen_type_cons, "I", [shen_type_cons, "J", [shen_type_cons, "K", [shen_type_cons, "L", [shen_type_cons, "M", [shen_type_cons, "N", [shen_type_cons, "O", [shen_type_cons, "P", [shen_type_cons, "Q", [shen_type_cons, "R", [shen_type_cons, "S", [shen_type_cons, "T", [shen_type_cons, "U", [shen_type_cons, "V", [shen_type_cons, "W", [shen_type_cons, "X", [shen_type_cons, "Y", [shen_type_cons, "Z", [shen_type_cons, "a", [shen_type_cons, "b", [shen_type_cons, "c", [shen_type_cons, "d", [shen_type_cons, "e", [shen_type_cons, "f", [shen_type_cons, "g", [shen_type_cons, "h", [shen_type_cons, "i", [shen_type_cons, "j", [shen_type_cons, "k", [shen_type_cons, "l", [shen_type_cons, "m", [shen_type_cons, "n", [shen_type_cons, "o", [shen_type_cons, "p", [shen_type_cons, "q", [shen_type_cons, "r", [shen_type_cons, "s", [shen_type_cons, "t", [shen_type_cons, "u", [shen_type_cons, "v", [shen_type_cons, "w", [shen_type_cons, "x", [shen_type_cons, "y", [shen_type_cons, "z", [shen_type_cons, "=", [shen_type_cons, "*", [shen_type_cons, "/", [shen_type_cons, "+", [shen_type_cons, "-", [shen_type_cons, "_", [shen_type_cons, "?", [shen_type_cons, "$", [shen_type_cons, "!", [shen_type_cons, "@", [shen_type_cons, "~", [shen_type_cons, ">", [shen_type_cons, "<", [shen_type_cons, "&", [shen_type_cons, "%", [shen_type_cons, "{", [shen_type_cons, "}", [shen_type_cons, ":", [shen_type_cons, ";", [shen_type_cons, "`", [shen_type_cons, "#", [shen_type_cons, "'", [shen_type_cons, ".", []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]);})},
  1,
  [],
  "shen-alpha?"];
shenjs_functions["shen_shen-alpha?"] = shen_alpha$question$;






shen_alphanums$question$ = [shen_type_func,
  function shen_user_lambda5127(Arg5126) {
  if (Arg5126.length < 1) return [shen_type_func, shen_user_lambda5127, 1, Arg5126];
  var Arg5126_0 = Arg5126[0];
  return ((shenjs_empty$question$(Arg5126_0))
  ? true
  : ((shenjs_is_type(Arg5126_0, shen_type_cons))
  ? (shenjs_call(shen_alphanum$question$, [Arg5126_0[1]]) && shenjs_call(shen_alphanums$question$, [Arg5126_0[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-alphanums?"]]);})))},
  1,
  [],
  "shen-alphanums?"];
shenjs_functions["shen_shen-alphanums?"] = shen_alphanums$question$;






shen_alphanum$question$ = [shen_type_func,
  function shen_user_lambda5129(Arg5128) {
  if (Arg5128.length < 1) return [shen_type_func, shen_user_lambda5129, 1, Arg5128];
  var Arg5128_0 = Arg5128[0];
  return (shenjs_call(shen_alpha$question$, [Arg5128_0]) || shenjs_call(shen_digit$question$, [Arg5128_0]))},
  1,
  [],
  "shen-alphanum?"];
shenjs_functions["shen_shen-alphanum?"] = shen_alphanum$question$;






shen_digit$question$ = [shen_type_func,
  function shen_user_lambda5131(Arg5130) {
  if (Arg5130.length < 1) return [shen_type_func, shen_user_lambda5131, 1, Arg5130];
  var Arg5130_0 = Arg5130[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5130_0, [shen_type_cons, "1", [shen_type_cons, "2", [shen_type_cons, "3", [shen_type_cons, "4", [shen_type_cons, "5", [shen_type_cons, "6", [shen_type_cons, "7", [shen_type_cons, "8", [shen_type_cons, "9", [shen_type_cons, "0", []]]]]]]]]]]]);})},
  1,
  [],
  "shen-digit?"];
shenjs_functions["shen_shen-digit?"] = shen_digit$question$;






shen_variable$question$ = [shen_type_func,
  function shen_user_lambda5133(Arg5132) {
  if (Arg5132.length < 1) return [shen_type_func, shen_user_lambda5133, 1, Arg5132];
  var Arg5132_0 = Arg5132[0];
  var R0;
  return (((shenjs_boolean$question$(Arg5132_0) || ((typeof(Arg5132_0) == 'number') || (typeof(Arg5132_0) == 'string'))))
  ? false
  : (function() {
  return shenjs_trap_error(function() {return ((R0 = shenjs_call(shen_explode, [Arg5132_0])),
  shenjs_call(shen_analyse_variable$question$, [R0]));}, [shen_type_func,
  function shen_user_lambda5135(Arg5134) {
  if (Arg5134.length < 1) return [shen_type_func, shen_user_lambda5135, 1, Arg5134];
  var Arg5134_0 = Arg5134[0];
  return false},
  1,
  []]);}))},
  1,
  [],
  "variable?"];
shenjs_functions["shen_variable?"] = shen_variable$question$;






shen_analyse_variable$question$ = [shen_type_func,
  function shen_user_lambda5137(Arg5136) {
  if (Arg5136.length < 1) return [shen_type_func, shen_user_lambda5137, 1, Arg5136];
  var Arg5136_0 = Arg5136[0];
  return ((shenjs_is_type(Arg5136_0, shen_type_cons))
  ? (shenjs_call(shen_uppercase$question$, [Arg5136_0[1]]) && shenjs_call(shen_alphanums$question$, [Arg5136_0[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-analyse-variable?"]]);}))},
  1,
  [],
  "shen-analyse-variable?"];
shenjs_functions["shen_shen-analyse-variable?"] = shen_analyse_variable$question$;






shen_uppercase$question$ = [shen_type_func,
  function shen_user_lambda5139(Arg5138) {
  if (Arg5138.length < 1) return [shen_type_func, shen_user_lambda5139, 1, Arg5138];
  var Arg5138_0 = Arg5138[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5138_0, [shen_type_cons, "A", [shen_type_cons, "B", [shen_type_cons, "C", [shen_type_cons, "D", [shen_type_cons, "E", [shen_type_cons, "F", [shen_type_cons, "G", [shen_type_cons, "H", [shen_type_cons, "I", [shen_type_cons, "J", [shen_type_cons, "K", [shen_type_cons, "L", [shen_type_cons, "M", [shen_type_cons, "N", [shen_type_cons, "O", [shen_type_cons, "P", [shen_type_cons, "Q", [shen_type_cons, "R", [shen_type_cons, "S", [shen_type_cons, "T", [shen_type_cons, "U", [shen_type_cons, "V", [shen_type_cons, "W", [shen_type_cons, "X", [shen_type_cons, "Y", [shen_type_cons, "Z", []]]]]]]]]]]]]]]]]]]]]]]]]]]]);})},
  1,
  [],
  "shen-uppercase?"];
shenjs_functions["shen_shen-uppercase?"] = shen_uppercase$question$;






shen_gensym = [shen_type_func,
  function shen_user_lambda5141(Arg5140) {
  if (Arg5140.length < 1) return [shen_type_func, shen_user_lambda5141, 1, Arg5140];
  var Arg5140_0 = Arg5140[0];
  return (function() {
  return shenjs_call_tail(shen_concat, [Arg5140_0, (shenjs_globals["shen_shen-*gensym*"] = (1 + (shenjs_globals["shen_shen-*gensym*"])))]);})},
  1,
  [],
  "gensym"];
shenjs_functions["shen_gensym"] = shen_gensym;






shen_concat = [shen_type_func,
  function shen_user_lambda5143(Arg5142) {
  if (Arg5142.length < 2) return [shen_type_func, shen_user_lambda5143, 2, Arg5142];
  var Arg5142_0 = Arg5142[0], Arg5142_1 = Arg5142[1];
  return (function() {
  return shenjs_intern((shenjs_str(Arg5142_0) + shenjs_str(Arg5142_1)));})},
  2,
  [],
  "concat"];
shenjs_functions["shen_concat"] = shen_concat;












shen_fst = [shen_type_func,
  function shen_user_lambda5146(Arg5145) {
  if (Arg5145.length < 1) return [shen_type_func, shen_user_lambda5146, 1, Arg5145];
  var Arg5145_0 = Arg5145[0];
  return shenjs_absvector_ref(Arg5145_0, 1)},
  1,
  [],
  "fst"];
shenjs_functions["shen_fst"] = shen_fst;






shen_snd = [shen_type_func,
  function shen_user_lambda5148(Arg5147) {
  if (Arg5147.length < 1) return [shen_type_func, shen_user_lambda5148, 1, Arg5147];
  var Arg5147_0 = Arg5147[0];
  return shenjs_absvector_ref(Arg5147_0, 2)},
  1,
  [],
  "snd"];
shenjs_functions["shen_snd"] = shen_snd;






shen_tuple$question$ = [shen_type_func,
  function shen_user_lambda5150(Arg5149) {
  if (Arg5149.length < 1) return [shen_type_func, shen_user_lambda5150, 1, Arg5149];
  var Arg5149_0 = Arg5149[0];
  return (function() {
  return shenjs_trap_error(function() {return (shenjs_absvector$question$(Arg5149_0) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-tuple"], shenjs_absvector_ref(Arg5149_0, 0))));}, [shen_type_func,
  function shen_user_lambda5152(Arg5151) {
  if (Arg5151.length < 1) return [shen_type_func, shen_user_lambda5152, 1, Arg5151];
  var Arg5151_0 = Arg5151[0];
  return false},
  1,
  []]);})},
  1,
  [],
  "tuple?"];
shenjs_functions["shen_tuple?"] = shen_tuple$question$;






shen_append = [shen_type_func,
  function shen_user_lambda5154(Arg5153) {
  if (Arg5153.length < 2) return [shen_type_func, shen_user_lambda5154, 2, Arg5153];
  var Arg5153_0 = Arg5153[0], Arg5153_1 = Arg5153[1];
  return ((shenjs_empty$question$(Arg5153_0))
  ? Arg5153_1
  : ((shenjs_is_type(Arg5153_0, shen_type_cons))
  ? [shen_type_cons, Arg5153_0[1], shenjs_call(shen_append, [Arg5153_0[2], Arg5153_1])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "append"]]);})))},
  2,
  [],
  "append"];
shenjs_functions["shen_append"] = shen_append;






shen_$at$v = [shen_type_func,
  function shen_user_lambda5156(Arg5155) {
  if (Arg5155.length < 2) return [shen_type_func, shen_user_lambda5156, 2, Arg5155];
  var Arg5155_0 = Arg5155[0], Arg5155_1 = Arg5155[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_limit, [Arg5155_1])),
  (R1 = shenjs_vector((R0 + 1))),
  (R1 = shenjs_call(shen_vector_$gt$, [R1, 1, Arg5155_0])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, 0)))
  ? R1
  : (function() {
  return shenjs_call_tail(shen_$at$v_help, [Arg5155_1, 1, R0, R1]);})))},
  2,
  [],
  "@v"];
shenjs_functions["shen_@v"] = shen_$at$v;






shen_$at$v_help = [shen_type_func,
  function shen_user_lambda5158(Arg5157) {
  if (Arg5157.length < 4) return [shen_type_func, shen_user_lambda5158, 4, Arg5157];
  var Arg5157_0 = Arg5157[0], Arg5157_1 = Arg5157[1], Arg5157_2 = Arg5157[2], Arg5157_3 = Arg5157[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5157_2, Arg5157_1)))
  ? (function() {
  return shenjs_call_tail(shen_copyfromvector, [Arg5157_0, Arg5157_3, Arg5157_2, (Arg5157_2 + 1)]);})
  : (function() {
  return shenjs_call_tail(shen_$at$v_help, [Arg5157_0, (Arg5157_1 + 1), Arg5157_2, shenjs_call(shen_copyfromvector, [Arg5157_0, Arg5157_3, Arg5157_1, (Arg5157_1 + 1)])]);}))},
  4,
  [],
  "shen-@v-help"];
shenjs_functions["shen_shen-@v-help"] = shen_$at$v_help;






shen_copyfromvector = [shen_type_func,
  function shen_user_lambda5160(Arg5159) {
  if (Arg5159.length < 4) return [shen_type_func, shen_user_lambda5160, 4, Arg5159];
  var Arg5159_0 = Arg5159[0], Arg5159_1 = Arg5159[1], Arg5159_2 = Arg5159[2], Arg5159_3 = Arg5159[3];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_vector_$gt$, [Arg5159_1, Arg5159_3, shenjs_call(shen_$lt$_vector, [Arg5159_0, Arg5159_2])]);}, [shen_type_func,
  function shen_user_lambda5162(Arg5161) {
  if (Arg5161.length < 2) return [shen_type_func, shen_user_lambda5162, 2, Arg5161];
  var Arg5161_0 = Arg5161[0], Arg5161_1 = Arg5161[1];
  return Arg5161_0},
  2,
  [Arg5159_1]]);})},
  4,
  [],
  "shen-copyfromvector"];
shenjs_functions["shen_shen-copyfromvector"] = shen_copyfromvector;






shen_hdv = [shen_type_func,
  function shen_user_lambda5164(Arg5163) {
  if (Arg5163.length < 1) return [shen_type_func, shen_user_lambda5164, 1, Arg5163];
  var Arg5163_0 = Arg5163[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_$lt$_vector, [Arg5163_0, 1]);}, [shen_type_func,
  function shen_user_lambda5166(Arg5165) {
  if (Arg5165.length < 2) return [shen_type_func, shen_user_lambda5166, 2, Arg5165];
  var Arg5165_0 = Arg5165[0], Arg5165_1 = Arg5165[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["hdv needs a non-empty vector as an argument; not ~S~%", [shen_tuple, Arg5165_0, []]]);})},
  2,
  [Arg5163_0]]);})},
  1,
  [],
  "hdv"];
shenjs_functions["shen_hdv"] = shen_hdv;






shen_tlv = [shen_type_func,
  function shen_user_lambda5168(Arg5167) {
  if (Arg5167.length < 1) return [shen_type_func, shen_user_lambda5168, 1, Arg5167];
  var Arg5167_0 = Arg5167[0];
  var R0;
  return ((R0 = shenjs_call(shen_limit, [Arg5167_0])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, 0)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["cannot take the tail of the empty vector~%", []]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(R0, 1)))
  ? (function() {
  return shenjs_vector(0);})
  : (shenjs_vector((R0 - 1)),
  (function() {
  return shenjs_call_tail(shen_tlv_help, [Arg5167_0, 2, R0, shenjs_vector((R0 - 1))]);})))))},
  1,
  [],
  "tlv"];
shenjs_functions["shen_tlv"] = shen_tlv;






shen_tlv_help = [shen_type_func,
  function shen_user_lambda5170(Arg5169) {
  if (Arg5169.length < 4) return [shen_type_func, shen_user_lambda5170, 4, Arg5169];
  var Arg5169_0 = Arg5169[0], Arg5169_1 = Arg5169[1], Arg5169_2 = Arg5169[2], Arg5169_3 = Arg5169[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5169_2, Arg5169_1)))
  ? (function() {
  return shenjs_call_tail(shen_copyfromvector, [Arg5169_0, Arg5169_3, Arg5169_2, (Arg5169_2 - 1)]);})
  : (function() {
  return shenjs_call_tail(shen_tlv_help, [Arg5169_0, (Arg5169_1 + 1), Arg5169_2, shenjs_call(shen_copyfromvector, [Arg5169_0, Arg5169_3, Arg5169_1, (Arg5169_1 - 1)])]);}))},
  4,
  [],
  "shen-tlv-help"];
shenjs_functions["shen_shen-tlv-help"] = shen_tlv_help;






shen_assoc = [shen_type_func,
  function shen_user_lambda5172(Arg5171) {
  if (Arg5171.length < 2) return [shen_type_func, shen_user_lambda5172, 2, Arg5171];
  var Arg5171_0 = Arg5171[0], Arg5171_1 = Arg5171[1];
  return ((shenjs_empty$question$(Arg5171_1))
  ? []
  : (((shenjs_is_type(Arg5171_1, shen_type_cons) && (shenjs_is_type(Arg5171_1[1], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5171_1[1][1], Arg5171_0)))))
  ? Arg5171_1[1]
  : ((shenjs_is_type(Arg5171_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_assoc, [Arg5171_0, Arg5171_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "assoc"]]);}))))},
  2,
  [],
  "assoc"];
shenjs_functions["shen_assoc"] = shen_assoc;






shen_boolean$question$ = [shen_type_func,
  function shen_user_lambda5174(Arg5173) {
  if (Arg5173.length < 1) return [shen_type_func, shen_user_lambda5174, 1, Arg5173];
  var Arg5173_0 = Arg5173[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg5173_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg5173_0)))
  ? true
  : false))},
  1,
  [],
  "boolean?"];
shenjs_functions["shen_boolean?"] = shen_boolean$question$;






shen_nl = [shen_type_func,
  function shen_user_lambda5176(Arg5175) {
  if (Arg5175.length < 1) return [shen_type_func, shen_user_lambda5176, 1, Arg5175];
  var Arg5175_0 = Arg5175[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg5175_0)))
  ? 0
  : (shenjs_call(shen_intoutput, ["~%", []]),
  (function() {
  return shenjs_call_tail(shen_nl, [(Arg5175_0 - 1)]);})))},
  1,
  [],
  "nl"];
shenjs_functions["shen_nl"] = shen_nl;






shen_difference = [shen_type_func,
  function shen_user_lambda5178(Arg5177) {
  if (Arg5177.length < 2) return [shen_type_func, shen_user_lambda5178, 2, Arg5177];
  var Arg5177_0 = Arg5177[0], Arg5177_1 = Arg5177[1];
  return ((shenjs_empty$question$(Arg5177_0))
  ? []
  : ((shenjs_is_type(Arg5177_0, shen_type_cons))
  ? ((shenjs_call(shen_element$question$, [Arg5177_0[1], Arg5177_1]))
  ? (function() {
  return shenjs_call_tail(shen_difference, [Arg5177_0[2], Arg5177_1]);})
  : [shen_type_cons, Arg5177_0[1], shenjs_call(shen_difference, [Arg5177_0[2], Arg5177_1])])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "difference"]]);})))},
  2,
  [],
  "difference"];
shenjs_functions["shen_difference"] = shen_difference;






shen_do = [shen_type_func,
  function shen_user_lambda5180(Arg5179) {
  if (Arg5179.length < 2) return [shen_type_func, shen_user_lambda5180, 2, Arg5179];
  var Arg5179_0 = Arg5179[0], Arg5179_1 = Arg5179[1];
  return Arg5179_1},
  2,
  [],
  "do"];
shenjs_functions["shen_do"] = shen_do;






shen_element$question$ = [shen_type_func,
  function shen_user_lambda5182(Arg5181) {
  if (Arg5181.length < 2) return [shen_type_func, shen_user_lambda5182, 2, Arg5181];
  var Arg5181_0 = Arg5181[0], Arg5181_1 = Arg5181[1];
  return ((shenjs_empty$question$(Arg5181_1))
  ? false
  : (((shenjs_is_type(Arg5181_1, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5181_1[1], Arg5181_0))))
  ? true
  : ((shenjs_is_type(Arg5181_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5181_0, Arg5181_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "element?"]]);}))))},
  2,
  [],
  "element?"];
shenjs_functions["shen_element?"] = shen_element$question$;












shen_fix = [shen_type_func,
  function shen_user_lambda5185(Arg5184) {
  if (Arg5184.length < 2) return [shen_type_func, shen_user_lambda5185, 2, Arg5184];
  var Arg5184_0 = Arg5184[0], Arg5184_1 = Arg5184[1];
  return (function() {
  return shenjs_call_tail(shen_fix_help, [Arg5184_0, Arg5184_1, shenjs_call(Arg5184_0, [Arg5184_1])]);})},
  2,
  [],
  "fix"];
shenjs_functions["shen_fix"] = shen_fix;






shen_fix_help = [shen_type_func,
  function shen_user_lambda5187(Arg5186) {
  if (Arg5186.length < 3) return [shen_type_func, shen_user_lambda5187, 3, Arg5186];
  var Arg5186_0 = Arg5186[0], Arg5186_1 = Arg5186[1], Arg5186_2 = Arg5186[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5186_2, Arg5186_1)))
  ? Arg5186_2
  : (function() {
  return shenjs_call_tail(shen_fix_help, [Arg5186_0, Arg5186_2, shenjs_call(Arg5186_0, [Arg5186_2])]);}))},
  3,
  [],
  "shen-fix-help"];
shenjs_functions["shen_shen-fix-help"] = shen_fix_help;






shen_put = [shen_type_func,
  function shen_user_lambda5189(Arg5188) {
  if (Arg5188.length < 4) return [shen_type_func, shen_user_lambda5189, 4, Arg5188];
  var Arg5188_0 = Arg5188[0], Arg5188_1 = Arg5188[1], Arg5188_2 = Arg5188[2], Arg5188_3 = Arg5188[3];
  var R0, R1;
  return ((R0 = shenjs_call(shen_hash, [Arg5188_0, shenjs_call(shen_limit, [Arg5188_3])])),
  (R1 = shenjs_trap_error(function() {return shenjs_call(shen_$lt$_vector, [Arg5188_3, R0]);}, [shen_type_func,
  function shen_user_lambda5191(Arg5190) {
  if (Arg5190.length < 1) return [shen_type_func, shen_user_lambda5191, 1, Arg5190];
  var Arg5190_0 = Arg5190[0];
  return []},
  1,
  []])),
  shenjs_call(shen_vector_$gt$, [Arg5188_3, R0, shenjs_call(shen_change_pointer_value, [Arg5188_0, Arg5188_1, Arg5188_2, R1])]),
  Arg5188_2)},
  4,
  [],
  "put"];
shenjs_functions["shen_put"] = shen_put;






shen_change_pointer_value = [shen_type_func,
  function shen_user_lambda5193(Arg5192) {
  if (Arg5192.length < 4) return [shen_type_func, shen_user_lambda5193, 4, Arg5192];
  var Arg5192_0 = Arg5192[0], Arg5192_1 = Arg5192[1], Arg5192_2 = Arg5192[2], Arg5192_3 = Arg5192[3];
  return ((shenjs_empty$question$(Arg5192_3))
  ? [shen_type_cons, [shen_type_cons, [shen_type_cons, Arg5192_0, [shen_type_cons, Arg5192_1, []]], Arg5192_2], []]
  : (((shenjs_is_type(Arg5192_3, shen_type_cons) && (shenjs_is_type(Arg5192_3[1], shen_type_cons) && (shenjs_is_type(Arg5192_3[1][1], shen_type_cons) && (shenjs_is_type(Arg5192_3[1][1][2], shen_type_cons) && (shenjs_empty$question$(Arg5192_3[1][1][2][2]) && (shenjs_unwind_tail(shenjs_$eq$(Arg5192_3[1][1][2][1], Arg5192_1)) && shenjs_unwind_tail(shenjs_$eq$(Arg5192_3[1][1][1], Arg5192_0)))))))))
  ? [shen_type_cons, [shen_type_cons, Arg5192_3[1][1], Arg5192_2], Arg5192_3[2]]
  : ((shenjs_is_type(Arg5192_3, shen_type_cons))
  ? [shen_type_cons, Arg5192_3[1], shenjs_call(shen_change_pointer_value, [Arg5192_0, Arg5192_1, Arg5192_2, Arg5192_3[2]])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-change-pointer-value"]]);}))))},
  4,
  [],
  "shen-change-pointer-value"];
shenjs_functions["shen_shen-change-pointer-value"] = shen_change_pointer_value;






shen_get = [shen_type_func,
  function shen_user_lambda5195(Arg5194) {
  if (Arg5194.length < 3) return [shen_type_func, shen_user_lambda5195, 3, Arg5194];
  var Arg5194_0 = Arg5194[0], Arg5194_1 = Arg5194[1], Arg5194_2 = Arg5194[2];
  var R0;
  return ((R0 = shenjs_call(shen_hash, [Arg5194_0, shenjs_call(shen_limit, [Arg5194_2])])),
  (R0 = shenjs_trap_error(function() {return shenjs_call(shen_$lt$_vector, [Arg5194_2, R0]);}, [shen_type_func,
  function shen_user_lambda5197(Arg5196) {
  if (Arg5196.length < 1) return [shen_type_func, shen_user_lambda5197, 1, Arg5196];
  var Arg5196_0 = Arg5196[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["pointer not found~%", []]);})},
  1,
  []])),
  (R0 = shenjs_call(shen_assoc, [[shen_type_cons, Arg5194_0, [shen_type_cons, Arg5194_1, []]], R0])),
  ((shenjs_empty$question$(R0))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["value not found~%", []]);})
  : R0[2]))},
  3,
  [],
  "get"];
shenjs_functions["shen_get"] = shen_get;






shen_hash = [shen_type_func,
  function shen_user_lambda5199(Arg5198) {
  if (Arg5198.length < 2) return [shen_type_func, shen_user_lambda5199, 2, Arg5198];
  var Arg5198_0 = Arg5198[0], Arg5198_1 = Arg5198[1];
  var R0;
  return ((R0 = shenjs_call(shen_mod, [shenjs_call(shen_sum, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5201(Arg5200) {
  if (Arg5200.length < 1) return [shen_type_func, shen_user_lambda5201, 1, Arg5200];
  var Arg5200_0 = Arg5200[0];
  return (function() {
  return shenjs_string_$gt$n(Arg5200_0);})},
  1,
  []], shenjs_call(shen_explode, [Arg5198_0])])]), Arg5198_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(0, R0)))
  ? 1
  : R0))},
  2,
  [],
  "hash"];
shenjs_functions["shen_hash"] = shen_hash;






shen_mod = [shen_type_func,
  function shen_user_lambda5203(Arg5202) {
  if (Arg5202.length < 2) return [shen_type_func, shen_user_lambda5203, 2, Arg5202];
  var Arg5202_0 = Arg5202[0], Arg5202_1 = Arg5202[1];
  return (function() {
  return shenjs_call_tail(shen_modh, [Arg5202_0, shenjs_call(shen_multiples, [Arg5202_0, [shen_type_cons, Arg5202_1, []]])]);})},
  2,
  [],
  "shen-mod"];
shenjs_functions["shen_shen-mod"] = shen_mod;






shen_multiples = [shen_type_func,
  function shen_user_lambda5205(Arg5204) {
  if (Arg5204.length < 2) return [shen_type_func, shen_user_lambda5205, 2, Arg5204];
  var Arg5204_0 = Arg5204[0], Arg5204_1 = Arg5204[1];
  return (((shenjs_is_type(Arg5204_1, shen_type_cons) && (Arg5204_1[1] > Arg5204_0)))
  ? Arg5204_1[2]
  : ((shenjs_is_type(Arg5204_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_multiples, [Arg5204_0, [shen_type_cons, (2 * Arg5204_1[1]), Arg5204_1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-multiples"]]);})))},
  2,
  [],
  "shen-multiples"];
shenjs_functions["shen_shen-multiples"] = shen_multiples;






shen_modh = [shen_type_func,
  function shen_user_lambda5207(Arg5206) {
  if (Arg5206.length < 2) return [shen_type_func, shen_user_lambda5207, 2, Arg5206];
  var Arg5206_0 = Arg5206[0], Arg5206_1 = Arg5206[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg5206_0)))
  ? 0
  : ((shenjs_empty$question$(Arg5206_1))
  ? Arg5206_0
  : (((shenjs_is_type(Arg5206_1, shen_type_cons) && (Arg5206_1[1] > Arg5206_0)))
  ? ((shenjs_empty$question$(Arg5206_1[2]))
  ? Arg5206_0
  : (function() {
  return shenjs_call_tail(shen_modh, [Arg5206_0, Arg5206_1[2]]);}))
  : ((shenjs_is_type(Arg5206_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_modh, [(Arg5206_0 - Arg5206_1[1]), Arg5206_1]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-modh"]]);})))))},
  2,
  [],
  "shen-modh"];
shenjs_functions["shen_shen-modh"] = shen_modh;






shen_sum = [shen_type_func,
  function shen_user_lambda5209(Arg5208) {
  if (Arg5208.length < 1) return [shen_type_func, shen_user_lambda5209, 1, Arg5208];
  var Arg5208_0 = Arg5208[0];
  return ((shenjs_empty$question$(Arg5208_0))
  ? 0
  : ((shenjs_is_type(Arg5208_0, shen_type_cons))
  ? (Arg5208_0[1] + shenjs_call(shen_sum, [Arg5208_0[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "sum"]]);})))},
  1,
  [],
  "sum"];
shenjs_functions["shen_sum"] = shen_sum;






shen_head = [shen_type_func,
  function shen_user_lambda5211(Arg5210) {
  if (Arg5210.length < 1) return [shen_type_func, shen_user_lambda5211, 1, Arg5210];
  var Arg5210_0 = Arg5210[0];
  return ((shenjs_is_type(Arg5210_0, shen_type_cons))
  ? Arg5210_0[1]
  : (function() {
  return shenjs_call_tail(shen_interror, ["head expects a non-empty list", []]);}))},
  1,
  [],
  "head"];
shenjs_functions["shen_head"] = shen_head;






shen_tail = [shen_type_func,
  function shen_user_lambda5213(Arg5212) {
  if (Arg5212.length < 1) return [shen_type_func, shen_user_lambda5213, 1, Arg5212];
  var Arg5212_0 = Arg5212[0];
  return ((shenjs_is_type(Arg5212_0, shen_type_cons))
  ? Arg5212_0[2]
  : (function() {
  return shenjs_call_tail(shen_interror, ["tail expects a non-empty list", []]);}))},
  1,
  [],
  "tail"];
shenjs_functions["shen_tail"] = shen_tail;






shen_hdstr = [shen_type_func,
  function shen_user_lambda5215(Arg5214) {
  if (Arg5214.length < 1) return [shen_type_func, shen_user_lambda5215, 1, Arg5214];
  var Arg5214_0 = Arg5214[0];
  return Arg5214_0[0]},
  1,
  [],
  "hdstr"];
shenjs_functions["shen_hdstr"] = shen_hdstr;






shen_intersection = [shen_type_func,
  function shen_user_lambda5217(Arg5216) {
  if (Arg5216.length < 2) return [shen_type_func, shen_user_lambda5217, 2, Arg5216];
  var Arg5216_0 = Arg5216[0], Arg5216_1 = Arg5216[1];
  return ((shenjs_empty$question$(Arg5216_0))
  ? []
  : ((shenjs_is_type(Arg5216_0, shen_type_cons))
  ? ((shenjs_call(shen_element$question$, [Arg5216_0[1], Arg5216_1]))
  ? [shen_type_cons, Arg5216_0[1], shenjs_call(shen_intersection, [Arg5216_0[2], Arg5216_1])]
  : (function() {
  return shenjs_call_tail(shen_intersection, [Arg5216_0[2], Arg5216_1]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "intersection"]]);})))},
  2,
  [],
  "intersection"];
shenjs_functions["shen_intersection"] = shen_intersection;






shen_reverse = [shen_type_func,
  function shen_user_lambda5219(Arg5218) {
  if (Arg5218.length < 1) return [shen_type_func, shen_user_lambda5219, 1, Arg5218];
  var Arg5218_0 = Arg5218[0];
  return (function() {
  return shenjs_call_tail(shen_reverse$_help, [Arg5218_0, []]);})},
  1,
  [],
  "reverse"];
shenjs_functions["shen_reverse"] = shen_reverse;






shen_reverse$_help = [shen_type_func,
  function shen_user_lambda5221(Arg5220) {
  if (Arg5220.length < 2) return [shen_type_func, shen_user_lambda5221, 2, Arg5220];
  var Arg5220_0 = Arg5220[0], Arg5220_1 = Arg5220[1];
  return ((shenjs_empty$question$(Arg5220_0))
  ? Arg5220_1
  : ((shenjs_is_type(Arg5220_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_reverse$_help, [Arg5220_0[2], [shen_type_cons, Arg5220_0[1], Arg5220_1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-reverse_help"]]);})))},
  2,
  [],
  "shen-reverse_help"];
shenjs_functions["shen_shen-reverse_help"] = shen_reverse$_help;






shen_union = [shen_type_func,
  function shen_user_lambda5223(Arg5222) {
  if (Arg5222.length < 2) return [shen_type_func, shen_user_lambda5223, 2, Arg5222];
  var Arg5222_0 = Arg5222[0], Arg5222_1 = Arg5222[1];
  return ((shenjs_empty$question$(Arg5222_0))
  ? Arg5222_1
  : ((shenjs_is_type(Arg5222_0, shen_type_cons))
  ? ((shenjs_call(shen_element$question$, [Arg5222_0[1], Arg5222_1]))
  ? (function() {
  return shenjs_call_tail(shen_union, [Arg5222_0[2], Arg5222_1]);})
  : [shen_type_cons, Arg5222_0[1], shenjs_call(shen_union, [Arg5222_0[2], Arg5222_1])])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "union"]]);})))},
  2,
  [],
  "union"];
shenjs_functions["shen_union"] = shen_union;






shen_y_or_n$question$ = [shen_type_func,
  function shen_user_lambda5225(Arg5224) {
  if (Arg5224.length < 1) return [shen_type_func, shen_user_lambda5225, 1, Arg5224];
  var Arg5224_0 = Arg5224[0];
  var R0;
  return (shenjs_call(shen_intoutput, [Arg5224_0, []]),
  shenjs_call(shen_intoutput, [" (y/n) ", []]),
  (R0 = shenjs_call(shen_intmake_string, ["~S", [shen_tuple, shenjs_call(shen_input, []), []]])),
  ((shenjs_unwind_tail(shenjs_$eq$("y", R0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$("n", R0)))
  ? false
  : (shenjs_call(shen_intoutput, ["please answer y or n~%", []]),
  (function() {
  return shenjs_call_tail(shen_y_or_n$question$, [Arg5224_0]);})))))},
  1,
  [],
  "y-or-n?"];
shenjs_functions["shen_y-or-n?"] = shen_y_or_n$question$;












shen_subst = [shen_type_func,
  function shen_user_lambda5228(Arg5227) {
  if (Arg5227.length < 3) return [shen_type_func, shen_user_lambda5228, 3, Arg5227];
  var Arg5227_0 = Arg5227[0], Arg5227_1 = Arg5227[1], Arg5227_2 = Arg5227[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5227_2, Arg5227_1)))
  ? Arg5227_0
  : ((shenjs_is_type(Arg5227_2, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_subst, [Arg5227_0, Arg5227_1, Arg5227_2[1]]), shenjs_call(shen_subst, [Arg5227_0, Arg5227_1, Arg5227_2[2]])]
  : Arg5227_2))},
  3,
  [],
  "subst"];
shenjs_functions["shen_subst"] = shen_subst;






shen_cd = [shen_type_func,
  function shen_user_lambda5230(Arg5229) {
  if (Arg5229.length < 1) return [shen_type_func, shen_user_lambda5230, 1, Arg5229];
  var Arg5229_0 = Arg5229[0];
  return (shenjs_globals["shen_*home-directory*"] = ((shenjs_unwind_tail(shenjs_$eq$(Arg5229_0, "")))
  ? ""
  : shenjs_call(shen_intmake_string, ["~A/", [shen_tuple, Arg5229_0, []]])))},
  1,
  [],
  "cd"];
shenjs_functions["shen_cd"] = shen_cd;






shen_map = [shen_type_func,
  function shen_user_lambda5232(Arg5231) {
  if (Arg5231.length < 2) return [shen_type_func, shen_user_lambda5232, 2, Arg5231];
  var Arg5231_0 = Arg5231[0], Arg5231_1 = Arg5231[1];
  return (function() {
  return shenjs_call_tail(shen_map_h, [Arg5231_0, Arg5231_1, []]);})},
  2,
  [],
  "map"];
shenjs_functions["shen_map"] = shen_map;






shen_map_h = [shen_type_func,
  function shen_user_lambda5234(Arg5233) {
  if (Arg5233.length < 3) return [shen_type_func, shen_user_lambda5234, 3, Arg5233];
  var Arg5233_0 = Arg5233[0], Arg5233_1 = Arg5233[1], Arg5233_2 = Arg5233[2];
  return ((shenjs_empty$question$(Arg5233_1))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg5233_2]);})
  : ((shenjs_is_type(Arg5233_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map_h, [Arg5233_0, Arg5233_1[2], [shen_type_cons, shenjs_call(Arg5233_0, [Arg5233_1[1]]), Arg5233_2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-map-h"]]);})))},
  3,
  [],
  "shen-map-h"];
shenjs_functions["shen_shen-map-h"] = shen_map_h;






shen_length = [shen_type_func,
  function shen_user_lambda5236(Arg5235) {
  if (Arg5235.length < 1) return [shen_type_func, shen_user_lambda5236, 1, Arg5235];
  var Arg5235_0 = Arg5235[0];
  return (function() {
  return shenjs_call_tail(shen_length_h, [Arg5235_0, 0]);})},
  1,
  [],
  "length"];
shenjs_functions["shen_length"] = shen_length;






shen_length_h = [shen_type_func,
  function shen_user_lambda5238(Arg5237) {
  if (Arg5237.length < 2) return [shen_type_func, shen_user_lambda5238, 2, Arg5237];
  var Arg5237_0 = Arg5237[0], Arg5237_1 = Arg5237[1];
  return ((shenjs_empty$question$(Arg5237_0))
  ? Arg5237_1
  : (function() {
  return shenjs_call_tail(shen_length_h, [Arg5237_0[2], (Arg5237_1 + 1)]);}))},
  2,
  [],
  "shen-length-h"];
shenjs_functions["shen_shen-length-h"] = shen_length_h;






shen_occurrences = [shen_type_func,
  function shen_user_lambda5240(Arg5239) {
  if (Arg5239.length < 2) return [shen_type_func, shen_user_lambda5240, 2, Arg5239];
  var Arg5239_0 = Arg5239[0], Arg5239_1 = Arg5239[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5239_1, Arg5239_0)))
  ? 1
  : ((shenjs_is_type(Arg5239_1, shen_type_cons))
  ? (shenjs_call(shen_occurrences, [Arg5239_0, Arg5239_1[1]]) + shenjs_call(shen_occurrences, [Arg5239_0, Arg5239_1[2]]))
  : 0))},
  2,
  [],
  "occurrences"];
shenjs_functions["shen_occurrences"] = shen_occurrences;






shen_nth = [shen_type_func,
  function shen_user_lambda5242(Arg5241) {
  if (Arg5241.length < 2) return [shen_type_func, shen_user_lambda5242, 2, Arg5241];
  var Arg5241_0 = Arg5241[0], Arg5241_1 = Arg5241[1];
  return (((shenjs_unwind_tail(shenjs_$eq$(1, Arg5241_0)) && shenjs_is_type(Arg5241_1, shen_type_cons)))
  ? Arg5241_1[1]
  : ((shenjs_is_type(Arg5241_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_nth, [(Arg5241_0 - 1), Arg5241_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "nth"]]);})))},
  2,
  [],
  "nth"];
shenjs_functions["shen_nth"] = shen_nth;






shen_integer$question$ = [shen_type_func,
  function shen_user_lambda5244(Arg5243) {
  if (Arg5243.length < 1) return [shen_type_func, shen_user_lambda5244, 1, Arg5243];
  var Arg5243_0 = Arg5243[0];
  var R0;
  return ((typeof(Arg5243_0) == 'number') && ((R0 = shenjs_call(shen_abs, [Arg5243_0])),
  shenjs_call(shen_integer_test$question$, [R0, shenjs_call(shen_magless, [R0, 1])])))},
  1,
  [],
  "integer?"];
shenjs_functions["shen_integer?"] = shen_integer$question$;






shen_abs = [shen_type_func,
  function shen_user_lambda5246(Arg5245) {
  if (Arg5245.length < 1) return [shen_type_func, shen_user_lambda5246, 1, Arg5245];
  var Arg5245_0 = Arg5245[0];
  return (((Arg5245_0 > 0))
  ? Arg5245_0
  : (0 - Arg5245_0))},
  1,
  [],
  "shen-abs"];
shenjs_functions["shen_shen-abs"] = shen_abs;






shen_magless = [shen_type_func,
  function shen_user_lambda5248(Arg5247) {
  if (Arg5247.length < 2) return [shen_type_func, shen_user_lambda5248, 2, Arg5247];
  var Arg5247_0 = Arg5247[0], Arg5247_1 = Arg5247[1];
  var R0;
  return ((R0 = (Arg5247_1 * 2)),
  (((R0 > Arg5247_0))
  ? Arg5247_1
  : (function() {
  return shenjs_call_tail(shen_magless, [Arg5247_0, R0]);})))},
  2,
  [],
  "shen-magless"];
shenjs_functions["shen_shen-magless"] = shen_magless;






shen_integer_test$question$ = [shen_type_func,
  function shen_user_lambda5250(Arg5249) {
  if (Arg5249.length < 2) return [shen_type_func, shen_user_lambda5250, 2, Arg5249];
  var Arg5249_0 = Arg5249[0], Arg5249_1 = Arg5249[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg5249_0)))
  ? true
  : (((1 > Arg5249_0))
  ? false
  : ((R0 = (Arg5249_0 - Arg5249_1)),
  (((0 > R0))
  ? (function() {
  return shenjs_call_tail(shen_integer$question$, [Arg5249_0]);})
  : (function() {
  return shenjs_call_tail(shen_integer_test$question$, [R0, Arg5249_1]);})))))},
  2,
  [],
  "shen-integer-test?"];
shenjs_functions["shen_shen-integer-test?"] = shen_integer_test$question$;






shen_mapcan = [shen_type_func,
  function shen_user_lambda5252(Arg5251) {
  if (Arg5251.length < 2) return [shen_type_func, shen_user_lambda5252, 2, Arg5251];
  var Arg5251_0 = Arg5251[0], Arg5251_1 = Arg5251[1];
  return ((shenjs_empty$question$(Arg5251_1))
  ? []
  : ((shenjs_is_type(Arg5251_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(Arg5251_0, [Arg5251_1[1]]), shenjs_call(shen_mapcan, [Arg5251_0, Arg5251_1[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "mapcan"]]);})))},
  2,
  [],
  "mapcan"];
shenjs_functions["shen_mapcan"] = shen_mapcan;






shen_read_file_as_bytelist = [shen_type_func,
  function shen_user_lambda5254(Arg5253) {
  if (Arg5253.length < 1) return [shen_type_func, shen_user_lambda5254, 1, Arg5253];
  var Arg5253_0 = Arg5253[0];
  var R0, R1;
  return ((R0 = shenjs_open([shen_type_symbol, "file"], Arg5253_0, [shen_type_symbol, "in"])),
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
  function shen_user_lambda5256(Arg5255) {
  if (Arg5255.length < 3) return [shen_type_func, shen_user_lambda5256, 3, Arg5255];
  var Arg5255_0 = Arg5255[0], Arg5255_1 = Arg5255[1], Arg5255_2 = Arg5255[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(-1, Arg5255_1)))
  ? Arg5255_2
  : (function() {
  return shenjs_call_tail(shen_read_file_as_bytelist_help, [Arg5255_0, shenjs_read_byte(Arg5255_0), [shen_type_cons, Arg5255_1, Arg5255_2]]);}))},
  3,
  [],
  "shen-read-file-as-bytelist-help"];
shenjs_functions["shen_shen-read-file-as-bytelist-help"] = shen_read_file_as_bytelist_help;






shen_read_file_as_string = [shen_type_func,
  function shen_user_lambda5258(Arg5257) {
  if (Arg5257.length < 1) return [shen_type_func, shen_user_lambda5258, 1, Arg5257];
  var Arg5257_0 = Arg5257[0];
  var R0;
  return ((R0 = shenjs_open([shen_type_symbol, "file"], Arg5257_0, [shen_type_symbol, "in"])),
  (function() {
  return shenjs_call_tail(shen_rfas_h, [R0, shenjs_read_byte(R0), ""]);}))},
  1,
  [],
  "read-file-as-string"];
shenjs_functions["shen_read-file-as-string"] = shen_read_file_as_string;






shen_rfas_h = [shen_type_func,
  function shen_user_lambda5260(Arg5259) {
  if (Arg5259.length < 3) return [shen_type_func, shen_user_lambda5260, 3, Arg5259];
  var Arg5259_0 = Arg5259[0], Arg5259_1 = Arg5259[1], Arg5259_2 = Arg5259[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(-1, Arg5259_1)))
  ? (shenjs_close(Arg5259_0),
  Arg5259_2)
  : (function() {
  return shenjs_call_tail(shen_rfas_h, [Arg5259_0, shenjs_read_byte(Arg5259_0), (Arg5259_2 + shenjs_n_$gt$string(Arg5259_1))]);}))},
  3,
  [],
  "shen-rfas-h"];
shenjs_functions["shen_shen-rfas-h"] = shen_rfas_h;






shen_$eq$$eq$ = [shen_type_func,
  function shen_user_lambda5262(Arg5261) {
  if (Arg5261.length < 2) return [shen_type_func, shen_user_lambda5262, 2, Arg5261];
  var Arg5261_0 = Arg5261[0], Arg5261_1 = Arg5261[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5261_1, Arg5261_0)))
  ? true
  : false)},
  2,
  [],
  "=="];
shenjs_functions["shen_=="] = shen_$eq$$eq$;






shen_abort = [shen_type_func,
  function shen_user_lambda5264(Arg5263) {
  if (Arg5263.length < 0) return [shen_type_func, shen_user_lambda5264, 0, Arg5263];
  return (function() {
  return shenjs_simple_error("");})},
  0,
  [],
  "abort"];
shenjs_functions["shen_abort"] = shen_abort;






shen_read = [shen_type_func,
  function shen_user_lambda5266(Arg5265) {
  if (Arg5265.length < 0) return [shen_type_func, shen_user_lambda5266, 0, Arg5265];
  return shenjs_call(shen_lineread, [])[1]},
  0,
  [],
  "read"];
shenjs_functions["shen_read"] = shen_read;






shen_input = [shen_type_func,
  function shen_user_lambda5268(Arg5267) {
  if (Arg5267.length < 0) return [shen_type_func, shen_user_lambda5268, 0, Arg5267];
  return (function() {
  return shenjs_call_tail(shen_eval, [shenjs_call(shen_read, [])]);})},
  0,
  [],
  "input"];
shenjs_functions["shen_input"] = shen_input;






shen_input$plus$ = [shen_type_func,
  function shen_user_lambda5270(Arg5269) {
  if (Arg5269.length < 2) return [shen_type_func, shen_user_lambda5270, 2, Arg5269];
  var Arg5269_0 = Arg5269[0], Arg5269_1 = Arg5269[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_read, [])),
  (R1 = shenjs_call(shen_typecheck, [R0, Arg5269_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(false, R1)))
  ? (shenjs_call(shen_intoutput, ["input is not of type ~R: please re-enter ", [shen_tuple, Arg5269_1, []]]),
  (function() {
  return shenjs_call_tail(shen_input$plus$, [[shen_type_symbol, ":"], Arg5269_1]);}))
  : (function() {
  return shenjs_call_tail(shen_eval, [R0]);})))},
  2,
  [],
  "input+"];
shenjs_functions["shen_input+"] = shen_input$plus$;






shen_bound$question$ = [shen_type_func,
  function shen_user_lambda5272(Arg5271) {
  if (Arg5271.length < 1) return [shen_type_func, shen_user_lambda5272, 1, Arg5271];
  var Arg5271_0 = Arg5271[0];
  var R0;
  return (shenjs_is_type(Arg5271_0, shen_type_symbol) && ((R0 = shenjs_trap_error(function() {return (shenjs_globals["shen_" + Arg5271_0[1]]);}, [shen_type_func,
  function shen_user_lambda5274(Arg5273) {
  if (Arg5273.length < 1) return [shen_type_func, shen_user_lambda5274, 1, Arg5273];
  var Arg5273_0 = Arg5273[0];
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
  function shen_user_lambda5276(Arg5275) {
  if (Arg5275.length < 1) return [shen_type_func, shen_user_lambda5276, 1, Arg5275];
  var Arg5275_0 = Arg5275[0];
  return ((shenjs_unwind_tail(shenjs_$eq$("", Arg5275_0)))
  ? []
  : [shen_type_cons, shenjs_string_$gt$n(Arg5275_0[0]), shenjs_call(shen_string_$gt$bytes, [shenjs_tlstr(Arg5275_0)])])},
  1,
  [],
  "shen-string->bytes"];
shenjs_functions["shen_shen-string->bytes"] = shen_string_$gt$bytes;






shen_maxinferences = [shen_type_func,
  function shen_user_lambda5278(Arg5277) {
  if (Arg5277.length < 1) return [shen_type_func, shen_user_lambda5278, 1, Arg5277];
  var Arg5277_0 = Arg5277[0];
  return (shenjs_globals["shen_shen-*maxinferences*"] = Arg5277_0)},
  1,
  [],
  "maxinferences"];
shenjs_functions["shen_maxinferences"] = shen_maxinferences;






shen_inferences = [shen_type_func,
  function shen_user_lambda5280(Arg5279) {
  if (Arg5279.length < 1) return [shen_type_func, shen_user_lambda5280, 1, Arg5279];
  var Arg5279_0 = Arg5279[0];
  return (shenjs_globals["shen_shen-*infs*"])},
  1,
  [],
  "inferences"];
shenjs_functions["shen_inferences"] = shen_inferences;






shen_hush = [shen_type_func,
  function shen_user_lambda5282(Arg5281) {
  if (Arg5281.length < 1) return [shen_type_func, shen_user_lambda5282, 1, Arg5281];
  var Arg5281_0 = Arg5281[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg5281_0)))
  ? (shenjs_globals["shen_shen-*hush*"] = [shen_type_symbol, "shen-hushed"])
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg5281_0)))
  ? (shenjs_globals["shen_shen-*hush*"] = [shen_type_symbol, "shen-unhushed"])
  : (function() {
  return shenjs_call_tail(shen_interror, ["'hush' expects a + or a -~%", []]);})))},
  1,
  [],
  "shen-hush"];
shenjs_functions["shen_shen-hush"] = shen_hush;






shen_protect = [shen_type_func,
  function shen_user_lambda5284(Arg5283) {
  if (Arg5283.length < 1) return [shen_type_func, shen_user_lambda5284, 1, Arg5283];
  var Arg5283_0 = Arg5283[0];
  return Arg5283_0},
  1,
  [],
  "protect"];
shenjs_functions["shen_protect"] = shen_protect;






shen_stoutput = [shen_type_func,
  function shen_user_lambda5286(Arg5285) {
  if (Arg5285.length < 1) return [shen_type_func, shen_user_lambda5286, 1, Arg5285];
  var Arg5285_0 = Arg5285[0];
  return (shenjs_globals["shen_*stoutput*"])},
  1,
  [],
  "shen-stoutput"];
shenjs_functions["shen_shen-stoutput"] = shen_stoutput;












shen_datatype_error = [shen_type_func,
  function shen_user_lambda4950(Arg4949) {
  if (Arg4949.length < 1) return [shen_type_func, shen_user_lambda4950, 1, Arg4949];
  var Arg4949_0 = Arg4949[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["datatype syntax error here:~%~% ~A~%", [shen_tuple, shenjs_call(shen_next_50, [50, Arg4949_0]), []]]);})},
  1,
  [],
  "shen-datatype-error"];
shenjs_functions["shen_shen-datatype-error"] = shen_datatype_error;






shen_$lt$datatype_rules$gt$ = [shen_type_func,
  function shen_user_lambda4952(Arg4951) {
  if (Arg4951.length < 1) return [shen_type_func, shen_user_lambda4952, 1, Arg4951];
  var Arg4951_0 = Arg4951[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$datatype_rule$gt$, [Arg4951_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$datatype_rules$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4951_0])),
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
  function shen_user_lambda4954(Arg4953) {
  if (Arg4953.length < 1) return [shen_type_func, shen_user_lambda4954, 1, Arg4953];
  var Arg4953_0 = Arg4953[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$side_conditions$gt$, [Arg4953_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$side_conditions$gt$, [Arg4953_0])),
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
  function shen_user_lambda4956(Arg4955) {
  if (Arg4955.length < 1) return [shen_type_func, shen_user_lambda4956, 1, Arg4955];
  var Arg4955_0 = Arg4955[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$side_condition$gt$, [Arg4955_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$side_conditions$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4955_0])),
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
  function shen_user_lambda4958(Arg4957) {
  if (Arg4957.length < 1) return [shen_type_func, shen_user_lambda4958, 1, Arg4957];
  var Arg4957_0 = Arg4957[0];
  var R0, R1;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4957_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "if"], shenjs_call(shen_fst, [Arg4957_0])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$expr$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4957_0])[2], shenjs_call(shen_snd, [Arg4957_0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, shenjs_call(shen_snd, [R0]), []]]])
  : shen_fail_obj))
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4957_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], shenjs_call(shen_fst, [Arg4957_0])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$variable$question$$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4957_0])[2], shenjs_call(shen_snd, [Arg4957_0])])])),
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
  function shen_user_lambda4960(Arg4959) {
  if (Arg4959.length < 1) return [shen_type_func, shen_user_lambda4960, 1, Arg4959];
  var Arg4959_0 = Arg4959[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4959_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4959_0])[2], shenjs_call(shen_snd, [Arg4959_0])])]), (((!shenjs_call(shen_variable$question$, [shenjs_call(shen_fst, [Arg4959_0])[1]])))
  ? shen_fail_obj
  : shenjs_call(shen_fst, [Arg4959_0])[1])])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<variable?>"];
shenjs_functions["shen_shen-<variable?>"] = shen_$lt$variable$question$$gt$;






shen_$lt$expr$gt$ = [shen_type_func,
  function shen_user_lambda4962(Arg4961) {
  if (Arg4961.length < 1) return [shen_type_func, shen_user_lambda4962, 1, Arg4961];
  var Arg4961_0 = Arg4961[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4961_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4961_0])[2], shenjs_call(shen_snd, [Arg4961_0])])]), (((shenjs_call(shen_element$question$, [shenjs_call(shen_fst, [Arg4961_0])[1], [shen_type_cons, [shen_type_symbol, ">>"], [shen_type_cons, [shen_type_symbol, ";"], []]]]) || (shenjs_call(shen_singleunderline$question$, [shenjs_call(shen_fst, [Arg4961_0])[1]]) || shenjs_call(shen_doubleunderline$question$, [shenjs_call(shen_fst, [Arg4961_0])[1]]))))
  ? shen_fail_obj
  : shenjs_call(shen_remove_bar, [shenjs_call(shen_fst, [Arg4961_0])[1]]))])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<expr>"];
shenjs_functions["shen_shen-<expr>"] = shen_$lt$expr$gt$;






shen_remove_bar = [shen_type_func,
  function shen_user_lambda4964(Arg4963) {
  if (Arg4963.length < 1) return [shen_type_func, shen_user_lambda4964, 1, Arg4963];
  var Arg4963_0 = Arg4963[0];
  return (((shenjs_is_type(Arg4963_0, shen_type_cons) && (shenjs_is_type(Arg4963_0[2], shen_type_cons) && (shenjs_is_type(Arg4963_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4963_0[2][2][2]) && shenjs_unwind_tail(shenjs_$eq$(Arg4963_0[2][1], [shen_type_symbol, "bar!"])))))))
  ? [shen_type_cons, Arg4963_0[1], Arg4963_0[2][2][1]]
  : ((shenjs_is_type(Arg4963_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_remove_bar, [Arg4963_0[1]]), shenjs_call(shen_remove_bar, [Arg4963_0[2]])]
  : Arg4963_0))},
  1,
  [],
  "shen-remove-bar"];
shenjs_functions["shen_shen-remove-bar"] = shen_remove_bar;






shen_$lt$premises$gt$ = [shen_type_func,
  function shen_user_lambda4966(Arg4965) {
  if (Arg4965.length < 1) return [shen_type_func, shen_user_lambda4966, 1, Arg4965];
  var Arg4965_0 = Arg4965[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$premise$gt$, [Arg4965_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4965_0])),
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
  function shen_user_lambda4968(Arg4967) {
  if (Arg4967.length < 1) return [shen_type_func, shen_user_lambda4968, 1, Arg4967];
  var Arg4967_0 = Arg4967[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4967_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4967_0])[2], shenjs_call(shen_snd, [Arg4967_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4967_0])[1], [shen_type_symbol, ";"])))
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
  function shen_user_lambda4970(Arg4969) {
  if (Arg4969.length < 1) return [shen_type_func, shen_user_lambda4970, 1, Arg4969];
  var Arg4969_0 = Arg4969[0];
  var R0, R1;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4969_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "!"], shenjs_call(shen_fst, [Arg4969_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4969_0])[2], shenjs_call(shen_snd, [Arg4969_0])])]), [shen_type_symbol, "!"]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$formulae$gt$, [Arg4969_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ">>"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$formula$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_tuple, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$formula$gt$, [Arg4969_0])),
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
  function shen_user_lambda4972(Arg4971) {
  if (Arg4971.length < 1) return [shen_type_func, shen_user_lambda4972, 1, Arg4971];
  var Arg4971_0 = Arg4971[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$formulae$gt$, [Arg4971_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$formula$gt$, [Arg4971_0])),
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
  function shen_user_lambda4974(Arg4973) {
  if (Arg4973.length < 1) return [shen_type_func, shen_user_lambda4974, 1, Arg4973];
  var Arg4973_0 = Arg4973[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$formula$gt$, [Arg4973_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$formulae$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$formula$gt$, [Arg4973_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, shenjs_call(shen_snd, [R0]), []]])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4973_0])),
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
  function shen_user_lambda4976(Arg4975) {
  if (Arg4975.length < 1) return [shen_type_func, shen_user_lambda4976, 1, Arg4975];
  var Arg4975_0 = Arg4975[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$expr$gt$, [Arg4975_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$type$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_curry, [shenjs_call(shen_snd, [R0])]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_normalise_type, [shenjs_call(shen_snd, [R1])]), []]]]])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$expr$gt$, [Arg4975_0])),
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
  function shen_user_lambda4978(Arg4977) {
  if (Arg4977.length < 1) return [shen_type_func, shen_user_lambda4978, 1, Arg4977];
  var Arg4977_0 = Arg4977[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4977_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4977_0])[2], shenjs_call(shen_snd, [Arg4977_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4977_0])[1], [shen_type_symbol, ";"])))
  ? shenjs_call(shen_fst, [Arg4977_0])[1]
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
  function shen_user_lambda4980(Arg4979) {
  if (Arg4979.length < 1) return [shen_type_func, shen_user_lambda4980, 1, Arg4979];
  var Arg4979_0 = Arg4979[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$expr$gt$, [Arg4979_0])),
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
  function shen_user_lambda4982(Arg4981) {
  if (Arg4981.length < 1) return [shen_type_func, shen_user_lambda4982, 1, Arg4981];
  var Arg4981_0 = Arg4981[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4981_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4981_0])[2], shenjs_call(shen_snd, [Arg4981_0])])]), ((shenjs_call(shen_doubleunderline$question$, [shenjs_call(shen_fst, [Arg4981_0])[1]]))
  ? shenjs_call(shen_fst, [Arg4981_0])[1]
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
  function shen_user_lambda4984(Arg4983) {
  if (Arg4983.length < 1) return [shen_type_func, shen_user_lambda4984, 1, Arg4983];
  var Arg4983_0 = Arg4983[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4983_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4983_0])[2], shenjs_call(shen_snd, [Arg4983_0])])]), ((shenjs_call(shen_singleunderline$question$, [shenjs_call(shen_fst, [Arg4983_0])[1]]))
  ? shenjs_call(shen_fst, [Arg4983_0])[1]
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
  function shen_user_lambda4986(Arg4985) {
  if (Arg4985.length < 1) return [shen_type_func, shen_user_lambda4986, 1, Arg4985];
  var Arg4985_0 = Arg4985[0];
  return (shenjs_is_type(Arg4985_0, shen_type_symbol) && shenjs_call(shen_sh$question$, [shenjs_str(Arg4985_0)]))},
  1,
  [],
  "shen-singleunderline?"];
shenjs_functions["shen_shen-singleunderline?"] = shen_singleunderline$question$;






shen_sh$question$ = [shen_type_func,
  function shen_user_lambda4988(Arg4987) {
  if (Arg4987.length < 1) return [shen_type_func, shen_user_lambda4988, 1, Arg4987];
  var Arg4987_0 = Arg4987[0];
  return ((shenjs_unwind_tail(shenjs_$eq$("_", Arg4987_0)))
  ? true
  : (shenjs_unwind_tail(shenjs_$eq$(Arg4987_0[0], "_")) && shenjs_call(shen_sh$question$, [shenjs_tlstr(Arg4987_0)])))},
  1,
  [],
  "shen-sh?"];
shenjs_functions["shen_shen-sh?"] = shen_sh$question$;






shen_doubleunderline$question$ = [shen_type_func,
  function shen_user_lambda4990(Arg4989) {
  if (Arg4989.length < 1) return [shen_type_func, shen_user_lambda4990, 1, Arg4989];
  var Arg4989_0 = Arg4989[0];
  return (shenjs_is_type(Arg4989_0, shen_type_symbol) && shenjs_call(shen_dh$question$, [shenjs_str(Arg4989_0)]))},
  1,
  [],
  "shen-doubleunderline?"];
shenjs_functions["shen_shen-doubleunderline?"] = shen_doubleunderline$question$;






shen_dh$question$ = [shen_type_func,
  function shen_user_lambda4992(Arg4991) {
  if (Arg4991.length < 1) return [shen_type_func, shen_user_lambda4992, 1, Arg4991];
  var Arg4991_0 = Arg4991[0];
  return ((shenjs_unwind_tail(shenjs_$eq$("=", Arg4991_0)))
  ? true
  : (shenjs_unwind_tail(shenjs_$eq$(Arg4991_0[0], "=")) && shenjs_call(shen_dh$question$, [shenjs_tlstr(Arg4991_0)])))},
  1,
  [],
  "shen-dh?"];
shenjs_functions["shen_shen-dh?"] = shen_dh$question$;






shen_process_datatype = [shen_type_func,
  function shen_user_lambda4994(Arg4993) {
  if (Arg4993.length < 2) return [shen_type_func, shen_user_lambda4994, 2, Arg4993];
  var Arg4993_0 = Arg4993[0], Arg4993_1 = Arg4993[1];
  return (function() {
  return shenjs_call_tail(shen_remember_datatype, [shenjs_call(shen_s_prolog, [shenjs_call(shen_rules_$gt$horn_clauses, [Arg4993_0, Arg4993_1])])]);})},
  2,
  [],
  "shen-process-datatype"];
shenjs_functions["shen_shen-process-datatype"] = shen_process_datatype;






shen_remember_datatype = [shen_type_func,
  function shen_user_lambda4996(Arg4995) {
  if (Arg4995.length < 1) return [shen_type_func, shen_user_lambda4996, 1, Arg4995];
  var Arg4995_0 = Arg4995[0];
  return ((shenjs_is_type(Arg4995_0, shen_type_cons))
  ? ((shenjs_globals["shen_shen-*datatypes*"] = shenjs_call(shen_adjoin, [Arg4995_0[1], (shenjs_globals["shen_shen-*datatypes*"])])),
  (shenjs_globals["shen_shen-*alldatatypes*"] = shenjs_call(shen_adjoin, [Arg4995_0[1], (shenjs_globals["shen_shen-*alldatatypes*"])])),
  Arg4995_0[1])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-remember-datatype"]]);}))},
  1,
  [],
  "shen-remember-datatype"];
shenjs_functions["shen_shen-remember-datatype"] = shen_remember_datatype;






shen_rules_$gt$horn_clauses = [shen_type_func,
  function shen_user_lambda4998(Arg4997) {
  if (Arg4997.length < 2) return [shen_type_func, shen_user_lambda4998, 2, Arg4997];
  var Arg4997_0 = Arg4997[0], Arg4997_1 = Arg4997[1];
  return ((shenjs_empty$question$(Arg4997_1))
  ? []
  : (((shenjs_is_type(Arg4997_1, shen_type_cons) && (shenjs_is_type(Arg4997_1[1], shen_tuple) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-single"], shenjs_call(shen_fst, [Arg4997_1[1]]))))))
  ? [shen_type_cons, shenjs_call(shen_rule_$gt$horn_clause, [Arg4997_0, shenjs_call(shen_snd, [Arg4997_1[1]])]), shenjs_call(shen_rules_$gt$horn_clauses, [Arg4997_0, Arg4997_1[2]])]
  : (((shenjs_is_type(Arg4997_1, shen_type_cons) && (shenjs_is_type(Arg4997_1[1], shen_tuple) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-double"], shenjs_call(shen_fst, [Arg4997_1[1]]))))))
  ? (function() {
  return shenjs_call_tail(shen_rules_$gt$horn_clauses, [Arg4997_0, shenjs_call(shen_append, [shenjs_call(shen_double_$gt$singles, [shenjs_call(shen_snd, [Arg4997_1[1]])]), Arg4997_1[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-rules->horn-clauses"]]);}))))},
  2,
  [],
  "shen-rules->horn-clauses"];
shenjs_functions["shen_shen-rules->horn-clauses"] = shen_rules_$gt$horn_clauses;






shen_double_$gt$singles = [shen_type_func,
  function shen_user_lambda5000(Arg4999) {
  if (Arg4999.length < 1) return [shen_type_func, shen_user_lambda5000, 1, Arg4999];
  var Arg4999_0 = Arg4999[0];
  return [shen_type_cons, shenjs_call(shen_right_rule, [Arg4999_0]), [shen_type_cons, shenjs_call(shen_left_rule, [Arg4999_0]), []]]},
  1,
  [],
  "shen-double->singles"];
shenjs_functions["shen_shen-double->singles"] = shen_double_$gt$singles;






shen_right_rule = [shen_type_func,
  function shen_user_lambda5002(Arg5001) {
  if (Arg5001.length < 1) return [shen_type_func, shen_user_lambda5002, 1, Arg5001];
  var Arg5001_0 = Arg5001[0];
  return [shen_tuple, [shen_type_symbol, "shen-single"], Arg5001_0]},
  1,
  [],
  "shen-right-rule"];
shenjs_functions["shen_shen-right-rule"] = shen_right_rule;






shen_left_rule = [shen_type_func,
  function shen_user_lambda5004(Arg5003) {
  if (Arg5003.length < 1) return [shen_type_func, shen_user_lambda5004, 1, Arg5003];
  var Arg5003_0 = Arg5003[0];
  var R0, R1;
  return (((shenjs_is_type(Arg5003_0, shen_type_cons) && (shenjs_is_type(Arg5003_0[2], shen_type_cons) && (shenjs_is_type(Arg5003_0[2][2], shen_type_cons) && (shenjs_is_type(Arg5003_0[2][2][1], shen_tuple) && (shenjs_empty$question$(shenjs_call(shen_fst, [Arg5003_0[2][2][1]])) && shenjs_empty$question$(Arg5003_0[2][2][2])))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "Qv"]])),
  (R1 = [shen_tuple, [shen_type_cons, shenjs_call(shen_snd, [Arg5003_0[2][2][1]]), []], R0]),
  (R0 = [shen_type_cons, [shen_tuple, shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5006(Arg5005) {
  if (Arg5005.length < 1) return [shen_type_func, shen_user_lambda5006, 1, Arg5005];
  var Arg5005_0 = Arg5005[0];
  return (function() {
  return shenjs_call_tail(shen_right_$gt$left, [Arg5005_0]);})},
  1,
  []], Arg5003_0[2][1]]), R0], []]),
  [shen_tuple, [shen_type_symbol, "shen-single"], [shen_type_cons, Arg5003_0[1], [shen_type_cons, R0, [shen_type_cons, R1, []]]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-left-rule"]]);}))},
  1,
  [],
  "shen-left-rule"];
shenjs_functions["shen_shen-left-rule"] = shen_left_rule;






shen_right_$gt$left = [shen_type_func,
  function shen_user_lambda5008(Arg5007) {
  if (Arg5007.length < 1) return [shen_type_func, shen_user_lambda5008, 1, Arg5007];
  var Arg5007_0 = Arg5007[0];
  return (((shenjs_is_type(Arg5007_0, shen_tuple) && shenjs_empty$question$(shenjs_call(shen_fst, [Arg5007_0]))))
  ? (function() {
  return shenjs_call_tail(shen_snd, [Arg5007_0]);})
  : (function() {
  return shenjs_call_tail(shen_interror, ["syntax error with ==========~%", []]);}))},
  1,
  [],
  "shen-right->left"];
shenjs_functions["shen_shen-right->left"] = shen_right_$gt$left;






shen_rule_$gt$horn_clause = [shen_type_func,
  function shen_user_lambda5010(Arg5009) {
  if (Arg5009.length < 2) return [shen_type_func, shen_user_lambda5010, 2, Arg5009];
  var Arg5009_0 = Arg5009[0], Arg5009_1 = Arg5009[1];
  return (((shenjs_is_type(Arg5009_1, shen_type_cons) && (shenjs_is_type(Arg5009_1[2], shen_type_cons) && (shenjs_is_type(Arg5009_1[2][2], shen_type_cons) && (shenjs_is_type(Arg5009_1[2][2][1], shen_tuple) && shenjs_empty$question$(Arg5009_1[2][2][2]))))))
  ? [shen_type_cons, shenjs_call(shen_rule_$gt$horn_clause_head, [Arg5009_0, shenjs_call(shen_snd, [Arg5009_1[2][2][1]])]), [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, shenjs_call(shen_rule_$gt$horn_clause_body, [Arg5009_1[1], Arg5009_1[2][1], shenjs_call(shen_fst, [Arg5009_1[2][2][1]])]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-rule->horn-clause"]]);}))},
  2,
  [],
  "shen-rule->horn-clause"];
shenjs_functions["shen_shen-rule->horn-clause"] = shen_rule_$gt$horn_clause;






shen_rule_$gt$horn_clause_head = [shen_type_func,
  function shen_user_lambda5012(Arg5011) {
  if (Arg5011.length < 2) return [shen_type_func, shen_user_lambda5012, 2, Arg5011];
  var Arg5011_0 = Arg5011[0], Arg5011_1 = Arg5011[1];
  return [shen_type_cons, Arg5011_0, [shen_type_cons, shenjs_call(shen_mode_ify, [Arg5011_1]), [shen_type_cons, [shen_type_symbol, "Context_1957"], []]]]},
  2,
  [],
  "shen-rule->horn-clause-head"];
shenjs_functions["shen_shen-rule->horn-clause-head"] = shen_rule_$gt$horn_clause_head;






shen_mode_ify = [shen_type_func,
  function shen_user_lambda5014(Arg5013) {
  if (Arg5013.length < 1) return [shen_type_func, shen_user_lambda5014, 1, Arg5013];
  var Arg5013_0 = Arg5013[0];
  return (((shenjs_is_type(Arg5013_0, shen_type_cons) && (shenjs_is_type(Arg5013_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], Arg5013_0[2][1])) && (shenjs_is_type(Arg5013_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg5013_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, [shen_type_cons, Arg5013_0[1], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg5013_0[2][2][1], [shen_type_cons, [shen_type_symbol, "+"], []]]], []]]], [shen_type_cons, [shen_type_symbol, "-"], []]]]
  : Arg5013_0)},
  1,
  [],
  "shen-mode-ify"];
shenjs_functions["shen_shen-mode-ify"] = shen_mode_ify;






shen_rule_$gt$horn_clause_body = [shen_type_func,
  function shen_user_lambda5016(Arg5015) {
  if (Arg5015.length < 3) return [shen_type_func, shen_user_lambda5016, 3, Arg5015];
  var Arg5015_0 = Arg5015[0], Arg5015_1 = Arg5015[1], Arg5015_2 = Arg5015[2];
  var R0, R1, R2;
  return ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5018(Arg5017) {
  if (Arg5017.length < 1) return [shen_type_func, shen_user_lambda5018, 1, Arg5017];
  var Arg5017_0 = Arg5017[0];
  return (function() {
  return shenjs_call_tail(shen_extract$_vars, [Arg5017_0]);})},
  1,
  []], Arg5015_2])),
  (R1 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5020(Arg5019) {
  if (Arg5019.length < 1) return [shen_type_func, shen_user_lambda5020, 1, Arg5019];
  var Arg5019_0 = Arg5019[0];
  return (function() {
  return shenjs_call_tail(shen_gensym, [[shen_type_symbol, "shen-cl"]]);})},
  1,
  []], Arg5015_2])),
  (R2 = shenjs_call(shen_construct_search_literals, [R1, R0, [shen_type_symbol, "Context_1957"], [shen_type_symbol, "Context1_1957"]])),
  shenjs_call(shen_construct_search_clauses, [R1, Arg5015_2, R0]),
  (R1 = shenjs_call(shen_construct_side_literals, [Arg5015_0])),
  (R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5022(Arg5021) {
  if (Arg5021.length < 2) return [shen_type_func, shen_user_lambda5022, 2, Arg5021];
  var Arg5021_0 = Arg5021[0], Arg5021_1 = Arg5021[1];
  return (function() {
  return shenjs_call_tail(shen_construct_premiss_literal, [Arg5021_1, shenjs_empty$question$(Arg5021_0)]);})},
  2,
  [Arg5015_2]], Arg5015_1])),
  (function() {
  return shenjs_call_tail(shen_append, [R2, shenjs_call(shen_append, [R1, R0])]);}))},
  3,
  [],
  "shen-rule->horn-clause-body"];
shenjs_functions["shen_shen-rule->horn-clause-body"] = shen_rule_$gt$horn_clause_body;






shen_construct_search_literals = [shen_type_func,
  function shen_user_lambda5024(Arg5023) {
  if (Arg5023.length < 4) return [shen_type_func, shen_user_lambda5024, 4, Arg5023];
  var Arg5023_0 = Arg5023[0], Arg5023_1 = Arg5023[1], Arg5023_2 = Arg5023[2], Arg5023_3 = Arg5023[3];
  return (((shenjs_empty$question$(Arg5023_0) && shenjs_empty$question$(Arg5023_1)))
  ? []
  : (function() {
  return shenjs_call_tail(shen_csl_help, [Arg5023_0, Arg5023_1, Arg5023_2, Arg5023_3]);}))},
  4,
  [],
  "shen-construct-search-literals"];
shenjs_functions["shen_shen-construct-search-literals"] = shen_construct_search_literals;






shen_csl_help = [shen_type_func,
  function shen_user_lambda5026(Arg5025) {
  if (Arg5025.length < 4) return [shen_type_func, shen_user_lambda5026, 4, Arg5025];
  var Arg5025_0 = Arg5025[0], Arg5025_1 = Arg5025[1], Arg5025_2 = Arg5025[2], Arg5025_3 = Arg5025[3];
  return (((shenjs_empty$question$(Arg5025_0) && shenjs_empty$question$(Arg5025_1)))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, [shen_type_symbol, "ContextOut_1957"], [shen_type_cons, Arg5025_2, []]]], []]
  : (((shenjs_is_type(Arg5025_0, shen_type_cons) && shenjs_is_type(Arg5025_1, shen_type_cons)))
  ? [shen_type_cons, [shen_type_cons, Arg5025_0[1], [shen_type_cons, Arg5025_2, [shen_type_cons, Arg5025_3, Arg5025_1[1]]]], shenjs_call(shen_csl_help, [Arg5025_0[2], Arg5025_1[2], Arg5025_3, shenjs_call(shen_gensym, [[shen_type_symbol, "Context"]])])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-csl-help"]]);})))},
  4,
  [],
  "shen-csl-help"];
shenjs_functions["shen_shen-csl-help"] = shen_csl_help;






shen_construct_search_clauses = [shen_type_func,
  function shen_user_lambda5028(Arg5027) {
  if (Arg5027.length < 3) return [shen_type_func, shen_user_lambda5028, 3, Arg5027];
  var Arg5027_0 = Arg5027[0], Arg5027_1 = Arg5027[1], Arg5027_2 = Arg5027[2];
  return (((shenjs_empty$question$(Arg5027_0) && (shenjs_empty$question$(Arg5027_1) && shenjs_empty$question$(Arg5027_2))))
  ? [shen_type_symbol, "shen-skip"]
  : (((shenjs_is_type(Arg5027_0, shen_type_cons) && (shenjs_is_type(Arg5027_1, shen_type_cons) && shenjs_is_type(Arg5027_2, shen_type_cons))))
  ? (shenjs_call(shen_construct_search_clause, [Arg5027_0[1], Arg5027_1[1], Arg5027_2[1]]),
  (function() {
  return shenjs_call_tail(shen_construct_search_clauses, [Arg5027_0[2], Arg5027_1[2], Arg5027_2[2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-construct-search-clauses"]]);})))},
  3,
  [],
  "shen-construct-search-clauses"];
shenjs_functions["shen_shen-construct-search-clauses"] = shen_construct_search_clauses;






shen_construct_search_clause = [shen_type_func,
  function shen_user_lambda5030(Arg5029) {
  if (Arg5029.length < 3) return [shen_type_func, shen_user_lambda5030, 3, Arg5029];
  var Arg5029_0 = Arg5029[0], Arg5029_1 = Arg5029[1], Arg5029_2 = Arg5029[2];
  return (function() {
  return shenjs_call_tail(shen_s_prolog, [[shen_type_cons, shenjs_call(shen_construct_base_search_clause, [Arg5029_0, Arg5029_1, Arg5029_2]), [shen_type_cons, shenjs_call(shen_construct_recursive_search_clause, [Arg5029_0, Arg5029_1, Arg5029_2]), []]]]);})},
  3,
  [],
  "shen-construct-search-clause"];
shenjs_functions["shen_shen-construct-search-clause"] = shen_construct_search_clause;






shen_construct_base_search_clause = [shen_type_func,
  function shen_user_lambda5032(Arg5031) {
  if (Arg5031.length < 3) return [shen_type_func, shen_user_lambda5032, 3, Arg5031];
  var Arg5031_0 = Arg5031[0], Arg5031_1 = Arg5031[1], Arg5031_2 = Arg5031[2];
  return [shen_type_cons, [shen_type_cons, Arg5031_0, [shen_type_cons, [shen_type_cons, shenjs_call(shen_mode_ify, [Arg5031_1]), [shen_type_symbol, "In_1957"]], [shen_type_cons, [shen_type_symbol, "In_1957"], Arg5031_2]]], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [], []]]]},
  3,
  [],
  "shen-construct-base-search-clause"];
shenjs_functions["shen_shen-construct-base-search-clause"] = shen_construct_base_search_clause;






shen_construct_recursive_search_clause = [shen_type_func,
  function shen_user_lambda5034(Arg5033) {
  if (Arg5033.length < 3) return [shen_type_func, shen_user_lambda5034, 3, Arg5033];
  var Arg5033_0 = Arg5033[0], Arg5033_1 = Arg5033[1], Arg5033_2 = Arg5033[2];
  return [shen_type_cons, [shen_type_cons, Arg5033_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "Assumption_1957"], [shen_type_symbol, "Assumptions_1957"]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "Assumption_1957"], [shen_type_symbol, "Out_1957"]], Arg5033_2]]], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [shen_type_cons, [shen_type_cons, Arg5033_0, [shen_type_cons, [shen_type_symbol, "Assumptions_1957"], [shen_type_cons, [shen_type_symbol, "Out_1957"], Arg5033_2]]], []], []]]]},
  3,
  [],
  "shen-construct-recursive-search-clause"];
shenjs_functions["shen_shen-construct-recursive-search-clause"] = shen_construct_recursive_search_clause;






shen_construct_side_literals = [shen_type_func,
  function shen_user_lambda5036(Arg5035) {
  if (Arg5035.length < 1) return [shen_type_func, shen_user_lambda5036, 1, Arg5035];
  var Arg5035_0 = Arg5035[0];
  return ((shenjs_empty$question$(Arg5035_0))
  ? []
  : (((shenjs_is_type(Arg5035_0, shen_type_cons) && (shenjs_is_type(Arg5035_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "if"], Arg5035_0[1][1])) && (shenjs_is_type(Arg5035_0[1][2], shen_type_cons) && shenjs_empty$question$(Arg5035_0[1][2][2]))))))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "when"], Arg5035_0[1][2]], shenjs_call(shen_construct_side_literals, [Arg5035_0[2]])]
  : (((shenjs_is_type(Arg5035_0, shen_type_cons) && (shenjs_is_type(Arg5035_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg5035_0[1][1])) && (shenjs_is_type(Arg5035_0[1][2], shen_type_cons) && (shenjs_is_type(Arg5035_0[1][2][2], shen_type_cons) && shenjs_empty$question$(Arg5035_0[1][2][2][2])))))))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "is"], Arg5035_0[1][2]], shenjs_call(shen_construct_side_literals, [Arg5035_0[2]])]
  : ((shenjs_is_type(Arg5035_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_construct_side_literals, [Arg5035_0[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-construct-side-literals"]]);})))))},
  1,
  [],
  "shen-construct-side-literals"];
shenjs_functions["shen_shen-construct-side-literals"] = shen_construct_side_literals;






shen_construct_premiss_literal = [shen_type_func,
  function shen_user_lambda5038(Arg5037) {
  if (Arg5037.length < 2) return [shen_type_func, shen_user_lambda5038, 2, Arg5037];
  var Arg5037_0 = Arg5037[0], Arg5037_1 = Arg5037[1];
  return ((shenjs_is_type(Arg5037_0, shen_tuple))
  ? [shen_type_cons, [shen_type_symbol, "shen-t*"], [shen_type_cons, shenjs_call(shen_recursive$_cons$_form, [shenjs_call(shen_snd, [Arg5037_0])]), [shen_type_cons, shenjs_call(shen_construct_context, [Arg5037_1, shenjs_call(shen_fst, [Arg5037_0])]), []]]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "!"], Arg5037_0)))
  ? [shen_type_cons, [shen_type_symbol, "cut"], [shen_type_cons, [shen_type_symbol, "Throwcontrol"], []]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-construct-premiss-literal"]]);})))},
  2,
  [],
  "shen-construct-premiss-literal"];
shenjs_functions["shen_shen-construct-premiss-literal"] = shen_construct_premiss_literal;






shen_construct_context = [shen_type_func,
  function shen_user_lambda5040(Arg5039) {
  if (Arg5039.length < 2) return [shen_type_func, shen_user_lambda5040, 2, Arg5039];
  var Arg5039_0 = Arg5039[0], Arg5039_1 = Arg5039[1];
  return (((shenjs_unwind_tail(shenjs_$eq$(true, Arg5039_0)) && shenjs_empty$question$(Arg5039_1)))
  ? [shen_type_symbol, "Context_1957"]
  : (((shenjs_unwind_tail(shenjs_$eq$(false, Arg5039_0)) && shenjs_empty$question$(Arg5039_1)))
  ? [shen_type_symbol, "ContextOut_1957"]
  : ((shenjs_is_type(Arg5039_1, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, shenjs_call(shen_recursive$_cons$_form, [Arg5039_1[1]]), [shen_type_cons, shenjs_call(shen_construct_context, [Arg5039_0, Arg5039_1[2]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-construct-context"]]);}))))},
  2,
  [],
  "shen-construct-context"];
shenjs_functions["shen_shen-construct-context"] = shen_construct_context;






shen_recursive$_cons$_form = [shen_type_func,
  function shen_user_lambda5042(Arg5041) {
  if (Arg5041.length < 1) return [shen_type_func, shen_user_lambda5042, 1, Arg5041];
  var Arg5041_0 = Arg5041[0];
  return ((shenjs_is_type(Arg5041_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, shenjs_call(shen_recursive$_cons$_form, [Arg5041_0[1]]), [shen_type_cons, shenjs_call(shen_recursive$_cons$_form, [Arg5041_0[2]]), []]]]
  : Arg5041_0)},
  1,
  [],
  "shen-recursive_cons_form"];
shenjs_functions["shen_shen-recursive_cons_form"] = shen_recursive$_cons$_form;






shen_preclude = [shen_type_func,
  function shen_user_lambda5044(Arg5043) {
  if (Arg5043.length < 1) return [shen_type_func, shen_user_lambda5044, 1, Arg5043];
  var Arg5043_0 = Arg5043[0];
  return ((shenjs_globals["shen_shen-*datatypes*"] = shenjs_call(shen_difference, [(shenjs_globals["shen_shen-*datatypes*"]), Arg5043_0])),
  (shenjs_globals["shen_shen-*datatypes*"]))},
  1,
  [],
  "preclude"];
shenjs_functions["shen_preclude"] = shen_preclude;






shen_include = [shen_type_func,
  function shen_user_lambda5046(Arg5045) {
  if (Arg5045.length < 1) return [shen_type_func, shen_user_lambda5046, 1, Arg5045];
  var Arg5045_0 = Arg5045[0];
  var R0;
  return ((R0 = shenjs_call(shen_intersection, [Arg5045_0, (shenjs_globals["shen_shen-*alldatatypes*"])])),
  (shenjs_globals["shen_shen-*datatypes*"] = shenjs_call(shen_union, [R0, (shenjs_globals["shen_shen-*datatypes*"])])),
  (shenjs_globals["shen_shen-*datatypes*"]))},
  1,
  [],
  "include"];
shenjs_functions["shen_include"] = shen_include;






shen_preclude_all_but = [shen_type_func,
  function shen_user_lambda5048(Arg5047) {
  if (Arg5047.length < 1) return [shen_type_func, shen_user_lambda5048, 1, Arg5047];
  var Arg5047_0 = Arg5047[0];
  return (function() {
  return shenjs_call_tail(shen_preclude, [shenjs_call(shen_difference, [(shenjs_globals["shen_shen-*alldatatypes*"]), Arg5047_0])]);})},
  1,
  [],
  "preclude-all-but"];
shenjs_functions["shen_preclude-all-but"] = shen_preclude_all_but;






shen_include_all_but = [shen_type_func,
  function shen_user_lambda5050(Arg5049) {
  if (Arg5049.length < 1) return [shen_type_func, shen_user_lambda5050, 1, Arg5049];
  var Arg5049_0 = Arg5049[0];
  return (function() {
  return shenjs_call_tail(shen_include, [shenjs_call(shen_difference, [(shenjs_globals["shen_shen-*alldatatypes*"]), Arg5049_0])]);})},
  1,
  [],
  "include-all-but"];
shenjs_functions["shen_include-all-but"] = shen_include_all_but;






shen_synonyms_help = [shen_type_func,
  function shen_user_lambda5052(Arg5051) {
  if (Arg5051.length < 1) return [shen_type_func, shen_user_lambda5052, 1, Arg5051];
  var Arg5051_0 = Arg5051[0];
  return ((shenjs_empty$question$(Arg5051_0))
  ? [shen_type_symbol, "synonyms"]
  : (((shenjs_is_type(Arg5051_0, shen_type_cons) && shenjs_is_type(Arg5051_0[2], shen_type_cons)))
  ? (shenjs_call(shen_pushnew, [[shen_type_cons, Arg5051_0[1], Arg5051_0[2][1]], [shen_type_symbol, "shen-*synonyms*"]]),
  (function() {
  return shenjs_call_tail(shen_synonyms_help, [Arg5051_0[2][2]]);}))
  : (function() {
  return shenjs_call_tail(shen_interror, ["odd number of synonyms~%", [shen_tuple, [], []]]);})))},
  1,
  [],
  "shen-synonyms-help"];
shenjs_functions["shen_shen-synonyms-help"] = shen_synonyms_help;






shen_pushnew = [shen_type_func,
  function shen_user_lambda5054(Arg5053) {
  if (Arg5053.length < 2) return [shen_type_func, shen_user_lambda5054, 2, Arg5053];
  var Arg5053_0 = Arg5053[0], Arg5053_1 = Arg5053[1];
  return ((shenjs_call(shen_element$question$, [Arg5053_0, (shenjs_globals["shen_" + Arg5053_1[1]])]))
  ? (shenjs_globals["shen_" + Arg5053_1[1]])
  : (shenjs_globals["shen_" + Arg5053_1[1]] = [shen_type_cons, Arg5053_0, (shenjs_globals["shen_" + Arg5053_1[1]])]))},
  2,
  [],
  "shen-pushnew"];
shenjs_functions["shen_shen-pushnew"] = shen_pushnew;












shen_yacc = [shen_type_func,
  function shen_user_lambda6033(Arg6032) {
  if (Arg6032.length < 1) return [shen_type_func, shen_user_lambda6033, 1, Arg6032];
  var Arg6032_0 = Arg6032[0];
  return (((shenjs_is_type(Arg6032_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defcc"], Arg6032_0[1])) && shenjs_is_type(Arg6032_0[2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_yacc_$gt$shen, [Arg6032_0[2][1], Arg6032_0[2][2], shenjs_call(shen_extract_segvars, [Arg6032_0[2][2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-yacc"]]);}))},
  1,
  [],
  "shen-yacc"];
shenjs_functions["shen_shen-yacc"] = shen_yacc;






shen_extract_segvars = [shen_type_func,
  function shen_user_lambda6035(Arg6034) {
  if (Arg6034.length < 1) return [shen_type_func, shen_user_lambda6035, 1, Arg6034];
  var Arg6034_0 = Arg6034[0];
  return ((shenjs_call(shen_segvar$question$, [Arg6034_0]))
  ? [shen_type_cons, Arg6034_0, []]
  : ((shenjs_is_type(Arg6034_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_union, [shenjs_call(shen_extract_segvars, [Arg6034_0[1]]), shenjs_call(shen_extract_segvars, [Arg6034_0[2]])]);})
  : []))},
  1,
  [],
  "shen-extract-segvars"];
shenjs_functions["shen_shen-extract-segvars"] = shen_extract_segvars;






shen_yacc_$gt$shen = [shen_type_func,
  function shen_user_lambda6037(Arg6036) {
  if (Arg6036.length < 3) return [shen_type_func, shen_user_lambda6037, 3, Arg6036];
  var Arg6036_0 = Arg6036[0], Arg6036_1 = Arg6036[1], Arg6036_2 = Arg6036[2];
  var R0;
  return ((R0 = [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg6036_0, shenjs_call(shen_yacc$_cases, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda6039(Arg6038) {
  if (Arg6038.length < 1) return [shen_type_func, shen_user_lambda6039, 1, Arg6038];
  var Arg6038_0 = Arg6038[0];
  return (function() {
  return shenjs_call_tail(shen_cc$_body, [Arg6038_0]);})},
  1,
  []], shenjs_call(shen_split$_cc$_rules, [Arg6036_1, []])])])]]),
  ((shenjs_empty$question$(Arg6036_2))
  ? R0
  : [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, [shen_type_symbol, "null"], [shen_type_cons, [], [shen_type_cons, R0, shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda6041(Arg6040) {
  if (Arg6040.length < 1) return [shen_type_func, shen_user_lambda6041, 1, Arg6040];
  var Arg6040_0 = Arg6040[0];
  return (function() {
  return shenjs_call_tail(shen_segdef, [Arg6040_0]);})},
  1,
  []], Arg6036_2])]]]]))},
  3,
  [],
  "shen-yacc->shen"];
shenjs_functions["shen_shen-yacc->shen"] = shen_yacc_$gt$shen;






shen_segdef = [shen_type_func,
  function shen_user_lambda6043(Arg6042) {
  if (Arg6042.length < 1) return [shen_type_func, shen_user_lambda6043, 1, Arg6042];
  var Arg6042_0 = Arg6042[0];
  return [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg6042_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "In"], [shen_type_cons, [shen_type_symbol, "Out"], []]]], [shen_type_cons, [shen_type_symbol, "Continuation"], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Continue"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "Continuation"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "reverse"], [shen_type_cons, [shen_type_symbol, "Out"], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "In"], [shen_type_cons, [], []]]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "Continue"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_symbol, "In"], []]], []]]], [shen_type_cons, [shen_type_cons, Arg6042_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_symbol, "In"], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_symbol, "In"], []]], [shen_type_cons, [shen_type_symbol, "Out"], []]]], []]]], [shen_type_cons, [shen_type_symbol, "Continuation"], []]]], [shen_type_cons, [shen_type_symbol, "Continue"], []]]]], []]]]], []]]]]]]},
  1,
  [],
  "shen-segdef"];
shenjs_functions["shen_shen-segdef"] = shen_segdef;






shen_yacc$_cases = [shen_type_func,
  function shen_user_lambda6045(Arg6044) {
  if (Arg6044.length < 1) return [shen_type_func, shen_user_lambda6045, 1, Arg6044];
  var Arg6044_0 = Arg6044[0];
  return (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(shen_mapcan, [[shen_type_func,
  function shen_user_lambda6047(Arg6046) {
  if (Arg6046.length < 1) return [shen_type_func, shen_user_lambda6047, 1, Arg6046];
  var Arg6046_0 = Arg6046[0];
  return [shen_type_cons, [shen_type_symbol, "Stream"], [shen_type_cons, [shen_type_symbol, "<-"], [shen_type_cons, Arg6046_0, []]]]},
  1,
  []], Arg6044_0]), [shen_type_cons, [shen_type_symbol, "_"], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]]]]);})},
  1,
  [],
  "shen-yacc_cases"];
shenjs_functions["shen_shen-yacc_cases"] = shen_yacc$_cases;






shen_first$_n = [shen_type_func,
  function shen_user_lambda6049(Arg6048) {
  if (Arg6048.length < 2) return [shen_type_func, shen_user_lambda6049, 2, Arg6048];
  var Arg6048_0 = Arg6048[0], Arg6048_1 = Arg6048[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg6048_0)))
  ? []
  : ((shenjs_empty$question$(Arg6048_1))
  ? []
  : ((shenjs_is_type(Arg6048_1, shen_type_cons))
  ? [shen_type_cons, Arg6048_1[1], shenjs_call(shen_first$_n, [(Arg6048_0 - 1), Arg6048_1[2]])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-first_n"]]);}))))},
  2,
  [],
  "shen-first_n"];
shenjs_functions["shen_shen-first_n"] = shen_first$_n;






shen_split$_cc$_rules = [shen_type_func,
  function shen_user_lambda6051(Arg6050) {
  if (Arg6050.length < 2) return [shen_type_func, shen_user_lambda6051, 2, Arg6050];
  var Arg6050_0 = Arg6050[0], Arg6050_1 = Arg6050[1];
  return (((shenjs_empty$question$(Arg6050_0) && shenjs_empty$question$(Arg6050_1)))
  ? []
  : ((shenjs_empty$question$(Arg6050_0))
  ? [shen_type_cons, shenjs_call(shen_split$_cc$_rule, [shenjs_call(shen_reverse, [Arg6050_1]), []]), []]
  : (((shenjs_is_type(Arg6050_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ";"], Arg6050_0[1]))))
  ? [shen_type_cons, shenjs_call(shen_split$_cc$_rule, [shenjs_call(shen_reverse, [Arg6050_1]), []]), shenjs_call(shen_split$_cc$_rules, [Arg6050_0[2], []])]
  : ((shenjs_is_type(Arg6050_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_split$_cc$_rules, [Arg6050_0[2], [shen_type_cons, Arg6050_0[1], Arg6050_1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-split_cc_rules"]]);})))))},
  2,
  [],
  "shen-split_cc_rules"];
shenjs_functions["shen_shen-split_cc_rules"] = shen_split$_cc$_rules;






shen_split$_cc$_rule = [shen_type_func,
  function shen_user_lambda6053(Arg6052) {
  if (Arg6052.length < 2) return [shen_type_func, shen_user_lambda6053, 2, Arg6052];
  var Arg6052_0 = Arg6052[0], Arg6052_1 = Arg6052[1];
  return (((shenjs_is_type(Arg6052_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":="], Arg6052_0[1])) && (shenjs_is_type(Arg6052_0[2], shen_type_cons) && shenjs_empty$question$(Arg6052_0[2][2])))))
  ? [shen_type_cons, shenjs_call(shen_reverse, [Arg6052_1]), Arg6052_0[2]]
  : (((shenjs_is_type(Arg6052_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":="], Arg6052_0[1]))))
  ? [shen_type_cons, shenjs_call(shen_reverse, [Arg6052_1]), [shen_type_cons, shenjs_call(shen_cons$_form, [Arg6052_0[2]]), []]]
  : ((shenjs_empty$question$(Arg6052_0))
  ? (shenjs_call(shen_intoutput, ["warning: ", []]),
  shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda6055(Arg6054) {
  if (Arg6054.length < 1) return [shen_type_func, shen_user_lambda6055, 1, Arg6054];
  var Arg6054_0 = Arg6054[0];
  return (function() {
  return shenjs_call_tail(shen_intoutput, ["~A ", [shen_tuple, Arg6054_0, []]]);})},
  1,
  []], shenjs_call(shen_reverse, [Arg6052_1])]),
  shenjs_call(shen_intoutput, ["has no semantics.~%", []]),
  (function() {
  return shenjs_call_tail(shen_split$_cc$_rule, [[shen_type_cons, [shen_type_symbol, ":="], [shen_type_cons, shenjs_call(shen_default$_semantics, [shenjs_call(shen_reverse, [Arg6052_1])]), []]], Arg6052_1]);}))
  : ((shenjs_is_type(Arg6052_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_split$_cc$_rule, [Arg6052_0[2], [shen_type_cons, Arg6052_0[1], Arg6052_1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-split_cc_rule"]]);})))))},
  2,
  [],
  "shen-split_cc_rule"];
shenjs_functions["shen_shen-split_cc_rule"] = shen_split$_cc$_rule;






shen_default$_semantics = [shen_type_func,
  function shen_user_lambda6057(Arg6056) {
  if (Arg6056.length < 1) return [shen_type_func, shen_user_lambda6057, 1, Arg6056];
  var Arg6056_0 = Arg6056[0];
  var R0;
  return ((shenjs_empty$question$(Arg6056_0))
  ? []
  : (((shenjs_is_type(Arg6056_0, shen_type_cons) && shenjs_call(shen_grammar$_symbol$question$, [Arg6056_0[1]])))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg6056_0[1]]), []]]),
  ((shenjs_empty$question$(Arg6056_0[2]))
  ? R0
  : [shen_type_cons, [shen_type_symbol, "append"], [shen_type_cons, R0, [shen_type_cons, shenjs_call(shen_default$_semantics, [Arg6056_0[2]]), []]]]))
  : ((shenjs_is_type(Arg6056_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, Arg6056_0[1], [shen_type_cons, shenjs_call(shen_default$_semantics, [Arg6056_0[2]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-default_semantics"]]);}))))},
  1,
  [],
  "shen-default_semantics"];
shenjs_functions["shen_shen-default_semantics"] = shen_default$_semantics;






shen_cc$_body = [shen_type_func,
  function shen_user_lambda6059(Arg6058) {
  if (Arg6058.length < 1) return [shen_type_func, shen_user_lambda6059, 1, Arg6058];
  var Arg6058_0 = Arg6058[0];
  return (((shenjs_is_type(Arg6058_0, shen_type_cons) && (shenjs_is_type(Arg6058_0[2], shen_type_cons) && shenjs_empty$question$(Arg6058_0[2][2]))))
  ? (function() {
  return shenjs_call_tail(shen_syntax, [Arg6058_0[1], [shen_type_symbol, "Stream"], Arg6058_0[2][1]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-cc_body"]]);}))},
  1,
  [],
  "shen-cc_body"];
shenjs_functions["shen_shen-cc_body"] = shen_cc$_body;






shen_syntax = [shen_type_func,
  function shen_user_lambda6061(Arg6060) {
  if (Arg6060.length < 3) return [shen_type_func, shen_user_lambda6061, 3, Arg6060];
  var Arg6060_0 = Arg6060[0], Arg6060_1 = Arg6060[1], Arg6060_2 = Arg6060[2];
  return ((shenjs_empty$question$(Arg6060_0))
  ? [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6060_1, []]], [shen_type_cons, shenjs_call(shen_semantics, [Arg6060_2]), []]]]
  : ((shenjs_is_type(Arg6060_0, shen_type_cons))
  ? ((shenjs_call(shen_grammar$_symbol$question$, [Arg6060_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_recursive$_descent, [Arg6060_0, Arg6060_1, Arg6060_2]);})
  : ((shenjs_call(shen_segvar$question$, [Arg6060_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_segment_match, [Arg6060_0, Arg6060_1, Arg6060_2]);})
  : ((shenjs_call(shen_terminal$question$, [Arg6060_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_check$_stream, [Arg6060_0, Arg6060_1, Arg6060_2]);})
  : ((shenjs_call(shen_jump$_stream$question$, [Arg6060_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_jump$_stream, [Arg6060_0, Arg6060_1, Arg6060_2]);})
  : ((shenjs_call(shen_list$_stream$question$, [Arg6060_0[1]]))
  ? (function() {
  return shenjs_call_tail(shen_list$_stream, [shenjs_call(shen_decons, [Arg6060_0[1]]), Arg6060_0[2], Arg6060_1, Arg6060_2]);})
  : (function() {
  return shenjs_call_tail(shen_interror, ["~A is not legal syntax~%", [shen_tuple, Arg6060_0[1], []]]);}))))))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-syntax"]]);})))},
  3,
  [],
  "shen-syntax"];
shenjs_functions["shen_shen-syntax"] = shen_syntax;






shen_list$_stream$question$ = [shen_type_func,
  function shen_user_lambda6063(Arg6062) {
  if (Arg6062.length < 1) return [shen_type_func, shen_user_lambda6063, 1, Arg6062];
  var Arg6062_0 = Arg6062[0];
  return ((shenjs_is_type(Arg6062_0, shen_type_cons))
  ? true
  : false)},
  1,
  [],
  "shen-list_stream?"];
shenjs_functions["shen_shen-list_stream?"] = shen_list$_stream$question$;






shen_decons = [shen_type_func,
  function shen_user_lambda6065(Arg6064) {
  if (Arg6064.length < 1) return [shen_type_func, shen_user_lambda6065, 1, Arg6064];
  var Arg6064_0 = Arg6064[0];
  return (((shenjs_is_type(Arg6064_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg6064_0[1])) && (shenjs_is_type(Arg6064_0[2], shen_type_cons) && (shenjs_is_type(Arg6064_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg6064_0[2][2][2]))))))
  ? [shen_type_cons, Arg6064_0[2][1], shenjs_call(shen_decons, [Arg6064_0[2][2][1]])]
  : Arg6064_0)},
  1,
  [],
  "shen-decons"];
shenjs_functions["shen_shen-decons"] = shen_decons;






shen_list$_stream = [shen_type_func,
  function shen_user_lambda6067(Arg6066) {
  if (Arg6066.length < 4) return [shen_type_func, shen_user_lambda6067, 4, Arg6066];
  var Arg6066_0 = Arg6066[0], Arg6066_1 = Arg6066[1], Arg6066_2 = Arg6066[2], Arg6066_3 = Arg6066[3];
  var R0, R1, R2;
  return ((R0 = [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6066_2, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6066_2, []]], []]], []]], []]]]),
  (R1 = [shen_type_cons, [shen_type_symbol, "shen-snd-or-fail"], [shen_type_cons, shenjs_call(shen_syntax, [Arg6066_0, [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6066_2, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, Arg6066_2, []]], []]]], [shen_type_cons, [shen_type_symbol, "shen-leave!"], [shen_type_cons, shenjs_call(shen_syntax, [Arg6066_1, [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6066_2, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, Arg6066_2, []]], []]]], Arg6066_3]), []]]]), []]]),
  (R2 = [shen_type_cons, [shen_type_symbol, "fail"], []]),
  [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, R0, [shen_type_cons, R1, [shen_type_cons, R2, []]]]])},
  4,
  [],
  "shen-list_stream"];
shenjs_functions["shen_shen-list_stream"] = shen_list$_stream;






shen_snd_or_fail = [shen_type_func,
  function shen_user_lambda6069(Arg6068) {
  if (Arg6068.length < 1) return [shen_type_func, shen_user_lambda6069, 1, Arg6068];
  var Arg6068_0 = Arg6068[0];
  return ((shenjs_is_type(Arg6068_0, shen_tuple))
  ? (function() {
  return shenjs_call_tail(shen_snd, [Arg6068_0]);})
  : shen_fail_obj)},
  1,
  [],
  "shen-snd-or-fail"];
shenjs_functions["shen_shen-snd-or-fail"] = shen_snd_or_fail;






shen_grammar$_symbol$question$ = [shen_type_func,
  function shen_user_lambda6071(Arg6070) {
  if (Arg6070.length < 1) return [shen_type_func, shen_user_lambda6071, 1, Arg6070];
  var Arg6070_0 = Arg6070[0];
  var R0;
  return (shenjs_is_type(Arg6070_0, shen_type_symbol) && ((R0 = shenjs_call(shen_explode, [Arg6070_0])),
  (shenjs_unwind_tail(shenjs_$eq$(R0[1], "<")) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_reverse, [R0])[1], ">")))))},
  1,
  [],
  "shen-grammar_symbol?"];
shenjs_functions["shen_shen-grammar_symbol?"] = shen_grammar$_symbol$question$;






shen_recursive$_descent = [shen_type_func,
  function shen_user_lambda6073(Arg6072) {
  if (Arg6072.length < 3) return [shen_type_func, shen_user_lambda6073, 3, Arg6072];
  var Arg6072_0 = Arg6072[0], Arg6072_1 = Arg6072[1], Arg6072_2 = Arg6072[2];
  var R0, R1, R2;
  return ((shenjs_is_type(Arg6072_0, shen_type_cons))
  ? ((R0 = [shen_type_cons, Arg6072_0[1], [shen_type_cons, Arg6072_1, []]]),
  (R1 = shenjs_call(shen_syntax, [Arg6072_0[2], shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg6072_0[1]]), Arg6072_2])),
  (R2 = [shen_type_cons, [shen_type_symbol, "fail"], []]),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg6072_0[1]]), [shen_type_cons, R0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], [shen_type_cons, shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg6072_0[1]]), []]]], []]], [shen_type_cons, R1, [shen_type_cons, R2, []]]]], []]]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-recursive_descent"]]);}))},
  3,
  [],
  "shen-recursive_descent"];
shenjs_functions["shen_shen-recursive_descent"] = shen_recursive$_descent;






shen_segvar$question$ = [shen_type_func,
  function shen_user_lambda6075(Arg6074) {
  if (Arg6074.length < 1) return [shen_type_func, shen_user_lambda6075, 1, Arg6074];
  var Arg6074_0 = Arg6074[0];
  return (shenjs_is_type(Arg6074_0, shen_type_symbol) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_explode, [Arg6074_0])[1], "?")))},
  1,
  [],
  "shen-segvar?"];
shenjs_functions["shen_shen-segvar?"] = shen_segvar$question$;






shen_segment_match = [shen_type_func,
  function shen_user_lambda6077(Arg6076) {
  if (Arg6076.length < 3) return [shen_type_func, shen_user_lambda6077, 3, Arg6076];
  var Arg6076_0 = Arg6076[0], Arg6076_1 = Arg6076[1], Arg6076_2 = Arg6076[2];
  var R0;
  return ((shenjs_is_type(Arg6076_0, shen_type_cons))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, Arg6076_0[1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, [shen_type_symbol, "Restart"], [shen_type_cons, shenjs_call(shen_syntax, [Arg6076_0[2], [shen_type_symbol, "Restart"], Arg6076_2]), []]]], []]]]),
  [shen_type_cons, Arg6076_0[1], [shen_type_cons, Arg6076_1, [shen_type_cons, R0, []]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-segment-match"]]);}))},
  3,
  [],
  "shen-segment-match"];
shenjs_functions["shen_shen-segment-match"] = shen_segment_match;






shen_terminal$question$ = [shen_type_func,
  function shen_user_lambda6079(Arg6078) {
  if (Arg6078.length < 1) return [shen_type_func, shen_user_lambda6079, 1, Arg6078];
  var Arg6078_0 = Arg6078[0];
  return ((shenjs_is_type(Arg6078_0, shen_type_cons))
  ? false
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-*-"], Arg6078_0)))
  ? false
  : true))},
  1,
  [],
  "shen-terminal?"];
shenjs_functions["shen_shen-terminal?"] = shen_terminal$question$;






shen_jump$_stream$question$ = [shen_type_func,
  function shen_user_lambda6081(Arg6080) {
  if (Arg6080.length < 1) return [shen_type_func, shen_user_lambda6081, 1, Arg6080];
  var Arg6080_0 = Arg6080[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-*-"], Arg6080_0)))
  ? true
  : false)},
  1,
  [],
  "shen-jump_stream?"];
shenjs_functions["shen_shen-jump_stream?"] = shen_jump$_stream$question$;






shen_check$_stream = [shen_type_func,
  function shen_user_lambda6083(Arg6082) {
  if (Arg6082.length < 3) return [shen_type_func, shen_user_lambda6083, 3, Arg6082];
  var Arg6082_0 = Arg6082[0], Arg6082_1 = Arg6082[1], Arg6082_2 = Arg6082[2];
  var R0, R1, R2;
  return ((shenjs_is_type(Arg6082_0, shen_type_cons))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6082_1, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, Arg6082_0[1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6082_1, []]], []]], []]]], []]]]),
  (R1 = shenjs_call(shen_syntax, [Arg6082_0[2], [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6082_1, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, Arg6082_1, []]], []]]], Arg6082_2])),
  (R2 = [shen_type_cons, [shen_type_symbol, "fail"], []]),
  [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, R0, [shen_type_cons, R1, [shen_type_cons, R2, []]]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-check_stream"]]);}))},
  3,
  [],
  "shen-check_stream"];
shenjs_functions["shen_shen-check_stream"] = shen_check$_stream;






shen_reassemble = [shen_type_func,
  function shen_user_lambda6085(Arg6084) {
  if (Arg6084.length < 2) return [shen_type_func, shen_user_lambda6085, 2, Arg6084];
  var Arg6084_0 = Arg6084[0], Arg6084_1 = Arg6084[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg6084_1, shen_fail_obj)))
  ? Arg6084_1
  : [shen_tuple, Arg6084_0, Arg6084_1])},
  2,
  [],
  "shen-reassemble"];
shenjs_functions["shen_shen-reassemble"] = shen_reassemble;






shen_jump$_stream = [shen_type_func,
  function shen_user_lambda6087(Arg6086) {
  if (Arg6086.length < 3) return [shen_type_func, shen_user_lambda6087, 3, Arg6086];
  var Arg6086_0 = Arg6086[0], Arg6086_1 = Arg6086[1], Arg6086_2 = Arg6086[2];
  var R0, R1, R2;
  return ((shenjs_is_type(Arg6086_0, shen_type_cons))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6086_1, []]], []]]),
  (R1 = shenjs_call(shen_syntax, [Arg6086_0[2], [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, Arg6086_1, []]], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, Arg6086_1, []]], []]]], Arg6086_2])),
  (R2 = [shen_type_cons, [shen_type_symbol, "fail"], []]),
  [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, R0, [shen_type_cons, R1, [shen_type_cons, R2, []]]]])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-jump_stream"]]);}))},
  3,
  [],
  "shen-jump_stream"];
shenjs_functions["shen_shen-jump_stream"] = shen_jump$_stream;






shen_semantics = [shen_type_func,
  function shen_user_lambda6089(Arg6088) {
  if (Arg6088.length < 1) return [shen_type_func, shen_user_lambda6089, 1, Arg6088];
  var Arg6088_0 = Arg6088[0];
  return (((shenjs_is_type(Arg6088_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-leave!"], Arg6088_0[1])) && (shenjs_is_type(Arg6088_0[2], shen_type_cons) && shenjs_empty$question$(Arg6088_0[2][2])))))
  ? Arg6088_0[2][1]
  : ((shenjs_empty$question$(Arg6088_0))
  ? []
  : ((shenjs_call(shen_grammar$_symbol$question$, [Arg6088_0]))
  ? [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, shenjs_call(shen_concat, [[shen_type_symbol, "Parse_"], Arg6088_0]), []]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-o-"], Arg6088_0)))
  ? [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, [shen_type_symbol, "Stream"], []]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-*-"], Arg6088_0)))
  ? [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, [shen_type_symbol, "Stream"], []]], []]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-s-"], Arg6088_0)))
  ? [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, [shen_type_symbol, "Stream"], []]]
  : ((shenjs_is_type(Arg6088_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda6091(Arg6090) {
  if (Arg6090.length < 1) return [shen_type_func, shen_user_lambda6091, 1, Arg6090];
  var Arg6090_0 = Arg6090[0];
  return (function() {
  return shenjs_call_tail(shen_semantics, [Arg6090_0]);})},
  1,
  []], Arg6088_0]);})
  : Arg6088_0)))))))},
  1,
  [],
  "shen-semantics"];
shenjs_functions["shen_shen-semantics"] = shen_semantics;






shen_$lt$$excl$$gt$ = [shen_type_func,
  function shen_user_lambda6093(Arg6092) {
  if (Arg6092.length < 1) return [shen_type_func, shen_user_lambda6093, 1, Arg6092];
  var Arg6092_0 = Arg6092[0];
  return ((shenjs_is_type(Arg6092_0, shen_tuple))
  ? [shen_tuple, [], shenjs_call(shen_fst, [Arg6092_0])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "<!>"]]);}))},
  1,
  [],
  "<!>"];
shenjs_functions["shen_<!>"] = shen_$lt$$excl$$gt$;












shen_print = [shen_type_func,
  function shen_user_lambda5996(Arg5995) {
  if (Arg5995.length < 1) return [shen_type_func, shen_user_lambda5996, 1, Arg5995];
  var Arg5995_0 = Arg5995[0];
  return (shenjs_pr(shenjs_call(shen_ms_h, [[shen_type_cons, "~", [shen_type_cons, "S", []]], [shen_tuple, Arg5995_0, [shen_type_symbol, "shen-skip"]]]), shenjs_call(shen_stoutput, [0])),
  Arg5995_0)},
  1,
  [],
  "print"];
shenjs_functions["shen_print"] = shen_print;






shen_format = [shen_type_func,
  function shen_user_lambda5998(Arg5997) {
  if (Arg5997.length < 3) return [shen_type_func, shen_user_lambda5998, 3, Arg5997];
  var Arg5997_0 = Arg5997[0], Arg5997_1 = Arg5997[1], Arg5997_2 = Arg5997[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg5997_0)))
  ? (function() {
  return shenjs_call_tail(shen_intoutput, [Arg5997_1, [shen_tuple, Arg5997_2, []]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg5997_0)))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, [Arg5997_1, [shen_tuple, Arg5997_2, []]]);})
  : (function() {
  return shenjs_pr(shenjs_call(shen_ms_h, [shenjs_call(shen_explode, [Arg5997_1]), Arg5997_2]), Arg5997_0);})))},
  3,
  [],
  "format"];
shenjs_functions["shen_format"] = shen_format;






shen_intoutput = [shen_type_func,
  function shen_user_lambda6000(Arg5999) {
  if (Arg5999.length < 2) return [shen_type_func, shen_user_lambda6000, 2, Arg5999];
  var Arg5999_0 = Arg5999[0], Arg5999_1 = Arg5999[1];
  return (function() {
  return shenjs_pr(shenjs_call(shen_ms_h, [shenjs_call(shen_explode_string, [Arg5999_0]), Arg5999_1]), shenjs_call(shen_stoutput, [0]));})},
  2,
  [],
  "intoutput"];
shenjs_functions["shen_intoutput"] = shen_intoutput;






shen_interror = [shen_type_func,
  function shen_user_lambda6002(Arg6001) {
  if (Arg6001.length < 2) return [shen_type_func, shen_user_lambda6002, 2, Arg6001];
  var Arg6001_0 = Arg6001[0], Arg6001_1 = Arg6001[1];
  return (function() {
  return shenjs_simple_error(shenjs_call(shen_ms_h, [shenjs_call(shen_explode_string, [Arg6001_0]), Arg6001_1]));})},
  2,
  [],
  "interror"];
shenjs_functions["shen_interror"] = shen_interror;






shen_intmake_string = [shen_type_func,
  function shen_user_lambda6004(Arg6003) {
  if (Arg6003.length < 2) return [shen_type_func, shen_user_lambda6004, 2, Arg6003];
  var Arg6003_0 = Arg6003[0], Arg6003_1 = Arg6003[1];
  return (function() {
  return shenjs_call_tail(shen_ms_h, [shenjs_call(shen_explode_string, [Arg6003_0]), Arg6003_1]);})},
  2,
  [],
  "intmake-string"];
shenjs_functions["shen_intmake-string"] = shen_intmake_string;






shen_ms_h = [shen_type_func,
  function shen_user_lambda6006(Arg6005) {
  if (Arg6005.length < 2) return [shen_type_func, shen_user_lambda6006, 2, Arg6005];
  var Arg6005_0 = Arg6005[0], Arg6005_1 = Arg6005[1];
  return ((shenjs_empty$question$(Arg6005_0))
  ? ""
  : (((shenjs_is_type(Arg6005_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$("~", Arg6005_0[1])) && (shenjs_is_type(Arg6005_0[2], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("%", Arg6005_0[2][1]))))))
  ? (shenjs_n_$gt$string(10) + shenjs_call(shen_ms_h, [Arg6005_0[2][2], Arg6005_1]))
  : (((shenjs_is_type(Arg6005_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$("~", Arg6005_0[1])) && (shenjs_is_type(Arg6005_0[2], shen_type_cons) && (shenjs_is_type(Arg6005_1, shen_tuple) && shenjs_call(shen_element$question$, [Arg6005_0[2][1], [shen_type_cons, "A", [shen_type_cons, "S", [shen_type_cons, "R", []]]]]))))))
  ? (shenjs_call(shen_ob_$gt$str, [Arg6005_0[2][1], shenjs_call(shen_fst, [Arg6005_1])]) + shenjs_call(shen_ms_h, [Arg6005_0[2][2], shenjs_call(shen_snd, [Arg6005_1])]))
  : ((shenjs_is_type(Arg6005_0, shen_type_cons))
  ? (Arg6005_0[1] + shenjs_call(shen_ms_h, [Arg6005_0[2], Arg6005_1]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-ms-h"]]);})))))},
  2,
  [],
  "shen-ms-h"];
shenjs_functions["shen_shen-ms-h"] = shen_ms_h;






shen_ob_$gt$str = [shen_type_func,
  function shen_user_lambda6008(Arg6007) {
  if (Arg6007.length < 2) return [shen_type_func, shen_user_lambda6008, 2, Arg6007];
  var Arg6007_0 = Arg6007[0], Arg6007_1 = Arg6007[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg6007_1, shen_fail_obj)))
  ? "..."
  : ((shenjs_empty$question$(Arg6007_1))
  ? ((shenjs_unwind_tail(shenjs_$eq$(Arg6007_0, "R")))
  ? "()"
  : "[]")
  : ((shenjs_unwind_tail(shenjs_$eq$(Arg6007_1, shenjs_vector(0))))
  ? "<>"
  : ((shenjs_is_type(Arg6007_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_cn_all, [shenjs_call(shen_append, [((shenjs_unwind_tail(shenjs_$eq$(Arg6007_0, "R")))
  ? [shen_type_cons, "(", []]
  : [shen_type_cons, "[", []]), shenjs_call(shen_append, [[shen_type_cons, shenjs_call(shen_ob_$gt$str, [Arg6007_0, Arg6007_1[1]]), []], shenjs_call(shen_append, [shenjs_call(shen_xmapcan, [(shenjs_globals["shen_*maximum-print-sequence-size*"]), [shen_type_func,
  function shen_user_lambda6010(Arg6009) {
  if (Arg6009.length < 2) return [shen_type_func, shen_user_lambda6010, 2, Arg6009];
  var Arg6009_0 = Arg6009[0], Arg6009_1 = Arg6009[1];
  return [shen_type_cons, " ", [shen_type_cons, shenjs_call(shen_ob_$gt$str, [Arg6009_0, Arg6009_1]), []]]},
  2,
  [Arg6007_0]], Arg6007_1[2]]), ((shenjs_unwind_tail(shenjs_$eq$(Arg6007_0, "R")))
  ? [shen_type_cons, ")", []]
  : [shen_type_cons, "]", []])])])])]);})
  : ((shenjs_vector$question$(Arg6007_1))
  ? ((R0 = shenjs_call(shen_vector_$gt$list, [Arg6007_1, 1])),
  (R0 = shenjs_tlstr(shenjs_call(shen_cn_all, [shenjs_call(shen_xmapcan, [((shenjs_globals["shen_*maximum-print-sequence-size*"]) - 1), [shen_type_func,
  function shen_user_lambda6012(Arg6011) {
  if (Arg6011.length < 2) return [shen_type_func, shen_user_lambda6012, 2, Arg6011];
  var Arg6011_0 = Arg6011[0], Arg6011_1 = Arg6011[1];
  return [shen_type_cons, " ", [shen_type_cons, shenjs_call(shen_ob_$gt$str, [Arg6011_0, shenjs_call(shen_blank_fail, [Arg6011_1])]), []]]},
  2,
  [Arg6007_0]], R0])]))),
  (R0 = ("<" + (R0 + ">"))),
  R0)
  : ((((!(typeof(Arg6007_1) == 'string')) && shenjs_absvector$question$(Arg6007_1)))
  ? (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_ob_$gt$str, ["A", shenjs_call(shenjs_absvector_ref(Arg6007_1, 0), [Arg6007_1])]);}, [shen_type_func,
  function shen_user_lambda6014(Arg6013) {
  if (Arg6013.length < 3) return [shen_type_func, shen_user_lambda6014, 3, Arg6013];
  var Arg6013_0 = Arg6013[0], Arg6013_1 = Arg6013[1], Arg6013_2 = Arg6013[2];
  var R0, R1;
  return ((R0 = shenjs_call(shen_vector_$gt$list, [Arg6013_0, 0])),
  (R1 = shenjs_tlstr(shenjs_call(shen_cn_all, [shenjs_call(shen_xmapcan, [((shenjs_globals["shen_*maximum-print-sequence-size*"]) - 1), [shen_type_func,
  function shen_user_lambda6016(Arg6015) {
  if (Arg6015.length < 2) return [shen_type_func, shen_user_lambda6016, 2, Arg6015];
  var Arg6015_0 = Arg6015[0], Arg6015_1 = Arg6015[1];
  return [shen_type_cons, " ", [shen_type_cons, shenjs_call(shen_ob_$gt$str, [Arg6015_0, Arg6015_1]), []]]},
  2,
  [Arg6013_1]], R0])]))),
  (R1 = ("<" + (R1 + ">"))),
  R1)},
  3,
  [Arg6007_1, Arg6007_0]]);})
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-vector-failure-object"], Arg6007_1)))
  ? "..."
  : (((shenjs_unwind_tail(shenjs_$eq$(Arg6007_0, "A")) && (typeof(Arg6007_1) == 'string')))
  ? Arg6007_1
  : (function() {
  return shenjs_str(Arg6007_1);})))))))))},
  2,
  [],
  "shen-ob->str"];
shenjs_functions["shen_shen-ob->str"] = shen_ob_$gt$str;






shen_blank_fail = [shen_type_func,
  function shen_user_lambda6018(Arg6017) {
  if (Arg6017.length < 1) return [shen_type_func, shen_user_lambda6018, 1, Arg6017];
  var Arg6017_0 = Arg6017[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg6017_0, shen_fail_obj)))
  ? [shen_type_symbol, "shen-vector-failure-object"]
  : Arg6017_0)},
  1,
  [],
  "shen-blank-fail"];
shenjs_functions["shen_shen-blank-fail"] = shen_blank_fail;






shen_tuple = [shen_type_func,
  function shen_user_lambda6020(Arg6019) {
  if (Arg6019.length < 1) return [shen_type_func, shen_user_lambda6020, 1, Arg6019];
  var Arg6019_0 = Arg6019[0];
  return (function() {
  return shenjs_call_tail(shen_intmake_string, ["(@p ~S ~S)", [shen_tuple, shenjs_call(shen_fst, [Arg6019_0]), [shen_tuple, shenjs_call(shen_snd, [Arg6019_0]), []]]]);})},
  1,
  [],
  "shen-tuple"];
shenjs_functions["shen_shen-tuple"] = shen_tuple;






shen_cn_all = [shen_type_func,
  function shen_user_lambda6022(Arg6021) {
  if (Arg6021.length < 1) return [shen_type_func, shen_user_lambda6022, 1, Arg6021];
  var Arg6021_0 = Arg6021[0];
  return ((shenjs_empty$question$(Arg6021_0))
  ? ""
  : ((shenjs_is_type(Arg6021_0, shen_type_cons))
  ? (Arg6021_0[1] + shenjs_call(shen_cn_all, [Arg6021_0[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-cn-all"]]);})))},
  1,
  [],
  "shen-cn-all"];
shenjs_functions["shen_shen-cn-all"] = shen_cn_all;






shen_xmapcan = [shen_type_func,
  function shen_user_lambda6024(Arg6023) {
  if (Arg6023.length < 3) return [shen_type_func, shen_user_lambda6024, 3, Arg6023];
  var Arg6023_0 = Arg6023[0], Arg6023_1 = Arg6023[1], Arg6023_2 = Arg6023[2];
  return ((shenjs_empty$question$(Arg6023_2))
  ? []
  : ((shenjs_unwind_tail(shenjs_$eq$(0, Arg6023_0)))
  ? [shen_type_cons, "... etc", []]
  : ((shenjs_is_type(Arg6023_2, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(Arg6023_1, [Arg6023_2[1]]), shenjs_call(shen_xmapcan, [(Arg6023_0 - 1), Arg6023_1, Arg6023_2[2]])]);})
  : [shen_type_cons, " |", shenjs_call(Arg6023_1, [Arg6023_2])])))},
  3,
  [],
  "shen-xmapcan"];
shenjs_functions["shen_shen-xmapcan"] = shen_xmapcan;






shen_vector_$gt$list = [shen_type_func,
  function shen_user_lambda6026(Arg6025) {
  if (Arg6025.length < 2) return [shen_type_func, shen_user_lambda6026, 2, Arg6025];
  var Arg6025_0 = Arg6025[0], Arg6025_1 = Arg6025[1];
  return (function() {
  return shenjs_call_tail(shen_vector_$gt$listh, [Arg6025_0, Arg6025_1, []]);})},
  2,
  [],
  "shen-vector->list"];
shenjs_functions["shen_shen-vector->list"] = shen_vector_$gt$list;






shen_vector_$gt$listh = [shen_type_func,
  function shen_user_lambda6028(Arg6027) {
  if (Arg6027.length < 3) return [shen_type_func, shen_user_lambda6028, 3, Arg6027];
  var Arg6027_0 = Arg6027[0], Arg6027_1 = Arg6027[1], Arg6027_2 = Arg6027[2];
  var R0;
  return ((R0 = shenjs_trap_error(function() {return shenjs_absvector_ref(Arg6027_0, Arg6027_1);}, [shen_type_func,
  function shen_user_lambda6030(Arg6029) {
  if (Arg6029.length < 1) return [shen_type_func, shen_user_lambda6030, 1, Arg6029];
  var Arg6029_0 = Arg6029[0];
  return [shen_type_symbol, "shen-out-of-range"]},
  1,
  []])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, [shen_type_symbol, "shen-out-of-range"])))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg6027_2]);})
  : (function() {
  return shenjs_call_tail(shen_vector_$gt$listh, [Arg6027_0, (Arg6027_1 + 1), [shen_type_cons, R0, Arg6027_2]]);})))},
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
  function shen_user_lambda4815(Arg4814) {
  if (Arg4814.length < 0) return [shen_type_func, shen_user_lambda4815, 0, Arg4814];
  return (function() {
  return shenjs_call_tail(shen_lineread_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), []]);})},
  0,
  [],
  "lineread"];
shenjs_functions["shen_lineread"] = shen_lineread;






shen_lineread_loop = [shen_type_func,
  function shen_user_lambda4817(Arg4816) {
  if (Arg4816.length < 2) return [shen_type_func, shen_user_lambda4817, 2, Arg4816];
  var Arg4816_0 = Arg4816[0], Arg4816_1 = Arg4816[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4816_0, shenjs_call(shen_hat, []))))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["line read aborted", []]);})
  : ((shenjs_call(shen_element$question$, [Arg4816_0, [shen_type_cons, shenjs_call(shen_newline, []), [shen_type_cons, shenjs_call(shen_carriage_return, []), []]]]))
  ? ((R0 = shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda4819(Arg4818) {
  if (Arg4818.length < 1) return [shen_type_func, shen_user_lambda4819, 1, Arg4818];
  var Arg4818_0 = Arg4818[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$st$_input$gt$, [Arg4818_0]);})},
  1,
  []], Arg4816_1, []])),
  (((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)) || shenjs_empty$question$(R0)))
  ? (function() {
  return shenjs_call_tail(shen_lineread_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), shenjs_call(shen_append, [Arg4816_1, [shen_type_cons, Arg4816_0, []]])]);})
  : R0))
  : (function() {
  return shenjs_call_tail(shen_lineread_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), shenjs_call(shen_append, [Arg4816_1, [shen_type_cons, Arg4816_0, []]])]);})))},
  2,
  [],
  "shen-lineread-loop"];
shenjs_functions["shen_shen-lineread-loop"] = shen_lineread_loop;






shen_read_file = [shen_type_func,
  function shen_user_lambda4821(Arg4820) {
  if (Arg4820.length < 1) return [shen_type_func, shen_user_lambda4821, 1, Arg4820];
  var Arg4820_0 = Arg4820[0];
  var R0;
  return ((R0 = shenjs_call(shen_read_file_as_bytelist, [Arg4820_0])),
  (function() {
  return shenjs_call_tail(shen_compile, [[shen_type_func,
  function shen_user_lambda4823(Arg4822) {
  if (Arg4822.length < 1) return [shen_type_func, shen_user_lambda4823, 1, Arg4822];
  var Arg4822_0 = Arg4822[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$st$_input$gt$, [Arg4822_0]);})},
  1,
  []], R0, [shen_type_func,
  function shen_user_lambda4825(Arg4824) {
  if (Arg4824.length < 1) return [shen_type_func, shen_user_lambda4825, 1, Arg4824];
  var Arg4824_0 = Arg4824[0];
  return (function() {
  return shenjs_call_tail(shen_read_error, [Arg4824_0]);})},
  1,
  []]]);}))},
  1,
  [],
  "read-file"];
shenjs_functions["shen_read-file"] = shen_read_file;






shen_read_error = [shen_type_func,
  function shen_user_lambda4827(Arg4826) {
  if (Arg4826.length < 1) return [shen_type_func, shen_user_lambda4827, 1, Arg4826];
  var Arg4826_0 = Arg4826[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["read error here:~%~% ~A~%", [shen_tuple, shenjs_call(shen_compress_50, [50, Arg4826_0]), []]]);})},
  1,
  [],
  "shen-read-error"];
shenjs_functions["shen_shen-read-error"] = shen_read_error;






shen_compress_50 = [shen_type_func,
  function shen_user_lambda4829(Arg4828) {
  if (Arg4828.length < 2) return [shen_type_func, shen_user_lambda4829, 2, Arg4828];
  var Arg4828_0 = Arg4828[0], Arg4828_1 = Arg4828[1];
  return ((shenjs_empty$question$(Arg4828_1))
  ? ""
  : ((shenjs_unwind_tail(shenjs_$eq$(0, Arg4828_0)))
  ? ""
  : ((shenjs_is_type(Arg4828_1, shen_type_cons))
  ? (shenjs_n_$gt$string(Arg4828_1[1]) + shenjs_call(shen_compress_50, [(Arg4828_0 - 1), Arg4828_1[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-compress-50"]]);}))))},
  2,
  [],
  "shen-compress-50"];
shenjs_functions["shen_shen-compress-50"] = shen_compress_50;






shen_$lt$st$_input$gt$ = [shen_type_func,
  function shen_user_lambda4831(Arg4830) {
  if (Arg4830.length < 1) return [shen_type_func, shen_user_lambda4831, 1, Arg4830];
  var Arg4830_0 = Arg4830[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$lsb$gt$, [Arg4830_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$lrb$gt$, [Arg4830_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$lcurly$gt$, [Arg4830_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "{"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$rcurly$gt$, [Arg4830_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "}"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$bar$gt$, [Arg4830_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "bar!"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$semicolon$gt$, [Arg4830_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, ";"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$colon$gt$, [Arg4830_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$colon$gt$, [Arg4830_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$colon$gt$, [Arg4830_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, ":"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$comma$gt$, [Arg4830_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_cons, [shen_type_symbol, "shen-"], shenjs_call(shen_snd, [R0])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$comment$gt$, [Arg4830_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$atom$gt$, [Arg4830_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_macroexpand, [shenjs_call(shen_snd, [R0])]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$whitespaces$gt$, [Arg4830_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4830_0])),
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
  function shen_user_lambda4833(Arg4832) {
  if (Arg4832.length < 1) return [shen_type_func, shen_user_lambda4833, 1, Arg4832];
  var Arg4832_0 = Arg4832[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4832_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4832_0])[2], shenjs_call(shen_snd, [Arg4832_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4832_0])[1], 91)))
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
  function shen_user_lambda4835(Arg4834) {
  if (Arg4834.length < 1) return [shen_type_func, shen_user_lambda4835, 1, Arg4834];
  var Arg4834_0 = Arg4834[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4834_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4834_0])[2], shenjs_call(shen_snd, [Arg4834_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4834_0])[1], 93)))
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
  function shen_user_lambda4837(Arg4836) {
  if (Arg4836.length < 1) return [shen_type_func, shen_user_lambda4837, 1, Arg4836];
  var Arg4836_0 = Arg4836[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4836_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4836_0])[2], shenjs_call(shen_snd, [Arg4836_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4836_0])[1], 123)))
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
  function shen_user_lambda4839(Arg4838) {
  if (Arg4838.length < 1) return [shen_type_func, shen_user_lambda4839, 1, Arg4838];
  var Arg4838_0 = Arg4838[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4838_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4838_0])[2], shenjs_call(shen_snd, [Arg4838_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4838_0])[1], 125)))
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
  function shen_user_lambda4841(Arg4840) {
  if (Arg4840.length < 1) return [shen_type_func, shen_user_lambda4841, 1, Arg4840];
  var Arg4840_0 = Arg4840[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4840_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4840_0])[2], shenjs_call(shen_snd, [Arg4840_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4840_0])[1], 124)))
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
  function shen_user_lambda4843(Arg4842) {
  if (Arg4842.length < 1) return [shen_type_func, shen_user_lambda4843, 1, Arg4842];
  var Arg4842_0 = Arg4842[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4842_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4842_0])[2], shenjs_call(shen_snd, [Arg4842_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4842_0])[1], 59)))
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
  function shen_user_lambda4845(Arg4844) {
  if (Arg4844.length < 1) return [shen_type_func, shen_user_lambda4845, 1, Arg4844];
  var Arg4844_0 = Arg4844[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4844_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4844_0])[2], shenjs_call(shen_snd, [Arg4844_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4844_0])[1], 58)))
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
  function shen_user_lambda4847(Arg4846) {
  if (Arg4846.length < 1) return [shen_type_func, shen_user_lambda4847, 1, Arg4846];
  var Arg4846_0 = Arg4846[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4846_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4846_0])[2], shenjs_call(shen_snd, [Arg4846_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4846_0])[1], 44)))
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
  function shen_user_lambda4849(Arg4848) {
  if (Arg4848.length < 1) return [shen_type_func, shen_user_lambda4849, 1, Arg4848];
  var Arg4848_0 = Arg4848[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4848_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4848_0])[2], shenjs_call(shen_snd, [Arg4848_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4848_0])[1], 61)))
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
  function shen_user_lambda4851(Arg4850) {
  if (Arg4850.length < 1) return [shen_type_func, shen_user_lambda4851, 1, Arg4850];
  var Arg4850_0 = Arg4850[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4850_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4850_0])[2], shenjs_call(shen_snd, [Arg4850_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4850_0])[1], 45)))
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
  function shen_user_lambda4853(Arg4852) {
  if (Arg4852.length < 1) return [shen_type_func, shen_user_lambda4853, 1, Arg4852];
  var Arg4852_0 = Arg4852[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4852_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4852_0])[2], shenjs_call(shen_snd, [Arg4852_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4852_0])[1], 40)))
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
  function shen_user_lambda4855(Arg4854) {
  if (Arg4854.length < 1) return [shen_type_func, shen_user_lambda4855, 1, Arg4854];
  var Arg4854_0 = Arg4854[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4854_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4854_0])[2], shenjs_call(shen_snd, [Arg4854_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4854_0])[1], 41)))
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
  function shen_user_lambda4857(Arg4856) {
  if (Arg4856.length < 1) return [shen_type_func, shen_user_lambda4857, 1, Arg4856];
  var Arg4856_0 = Arg4856[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$str$gt$, [Arg4856_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_control_chars, [shenjs_call(shen_snd, [R0])])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$number$gt$, [Arg4856_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$sym$gt$, [Arg4856_0])),
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
  function shen_user_lambda4859(Arg4858) {
  if (Arg4858.length < 1) return [shen_type_func, shen_user_lambda4859, 1, Arg4858];
  var Arg4858_0 = Arg4858[0];
  var R0, R1;
  return ((shenjs_empty$question$(Arg4858_0))
  ? ""
  : (((shenjs_is_type(Arg4858_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$("c", Arg4858_0[1])) && (shenjs_is_type(Arg4858_0[2], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("#", Arg4858_0[2][1]))))))
  ? ((R0 = shenjs_call(shen_code_point, [Arg4858_0[2][2]])),
  (R1 = shenjs_call(shen_after_codepoint, [Arg4858_0[2][2]])),
  (function() {
  return shenjs_call_tail(shen_$at$s, [shenjs_n_$gt$string(shenjs_call(shen_decimalise, [R0])), shenjs_call(shen_control_chars, [R1])]);}))
  : ((shenjs_is_type(Arg4858_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_$at$s, [Arg4858_0[1], shenjs_call(shen_control_chars, [Arg4858_0[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-control-chars"]]);}))))},
  1,
  [],
  "shen-control-chars"];
shenjs_functions["shen_shen-control-chars"] = shen_control_chars;






shen_code_point = [shen_type_func,
  function shen_user_lambda4861(Arg4860) {
  if (Arg4860.length < 1) return [shen_type_func, shen_user_lambda4861, 1, Arg4860];
  var Arg4860_0 = Arg4860[0];
  return (((shenjs_is_type(Arg4860_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(";", Arg4860_0[1]))))
  ? ""
  : (((shenjs_is_type(Arg4860_0, shen_type_cons) && shenjs_call(shen_element$question$, [Arg4860_0[1], [shen_type_cons, "0", [shen_type_cons, "1", [shen_type_cons, "2", [shen_type_cons, "3", [shen_type_cons, "4", [shen_type_cons, "5", [shen_type_cons, "6", [shen_type_cons, "7", [shen_type_cons, "8", [shen_type_cons, "9", [shen_type_cons, "0", []]]]]]]]]]]]])))
  ? [shen_type_cons, Arg4860_0[1], shenjs_call(shen_code_point, [Arg4860_0[2]])]
  : (function() {
  return shenjs_call_tail(shen_interror, ["code point parse error ~A~%", [shen_tuple, Arg4860_0, []]]);})))},
  1,
  [],
  "shen-code-point"];
shenjs_functions["shen_shen-code-point"] = shen_code_point;






shen_after_codepoint = [shen_type_func,
  function shen_user_lambda4863(Arg4862) {
  if (Arg4862.length < 1) return [shen_type_func, shen_user_lambda4863, 1, Arg4862];
  var Arg4862_0 = Arg4862[0];
  return ((shenjs_empty$question$(Arg4862_0))
  ? []
  : (((shenjs_is_type(Arg4862_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(";", Arg4862_0[1]))))
  ? Arg4862_0[2]
  : ((shenjs_is_type(Arg4862_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_after_codepoint, [Arg4862_0[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-after-codepoint"]]);}))))},
  1,
  [],
  "shen-after-codepoint"];
shenjs_functions["shen_shen-after-codepoint"] = shen_after_codepoint;






shen_decimalise = [shen_type_func,
  function shen_user_lambda4865(Arg4864) {
  if (Arg4864.length < 1) return [shen_type_func, shen_user_lambda4865, 1, Arg4864];
  var Arg4864_0 = Arg4864[0];
  return (function() {
  return shenjs_call_tail(shen_pre, [shenjs_call(shen_reverse, [shenjs_call(shen_digits_$gt$integers, [Arg4864_0])]), 0]);})},
  1,
  [],
  "shen-decimalise"];
shenjs_functions["shen_shen-decimalise"] = shen_decimalise;






shen_digits_$gt$integers = [shen_type_func,
  function shen_user_lambda4867(Arg4866) {
  if (Arg4866.length < 1) return [shen_type_func, shen_user_lambda4867, 1, Arg4866];
  var Arg4866_0 = Arg4866[0];
  return (((shenjs_is_type(Arg4866_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("0", Arg4866_0[1]))))
  ? [shen_type_cons, 0, shenjs_call(shen_digits_$gt$integers, [Arg4866_0[2]])]
  : (((shenjs_is_type(Arg4866_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("1", Arg4866_0[1]))))
  ? [shen_type_cons, 1, shenjs_call(shen_digits_$gt$integers, [Arg4866_0[2]])]
  : (((shenjs_is_type(Arg4866_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("2", Arg4866_0[1]))))
  ? [shen_type_cons, 2, shenjs_call(shen_digits_$gt$integers, [Arg4866_0[2]])]
  : (((shenjs_is_type(Arg4866_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("3", Arg4866_0[1]))))
  ? [shen_type_cons, 3, shenjs_call(shen_digits_$gt$integers, [Arg4866_0[2]])]
  : (((shenjs_is_type(Arg4866_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("4", Arg4866_0[1]))))
  ? [shen_type_cons, 4, shenjs_call(shen_digits_$gt$integers, [Arg4866_0[2]])]
  : (((shenjs_is_type(Arg4866_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("5", Arg4866_0[1]))))
  ? [shen_type_cons, 5, shenjs_call(shen_digits_$gt$integers, [Arg4866_0[2]])]
  : (((shenjs_is_type(Arg4866_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("6", Arg4866_0[1]))))
  ? [shen_type_cons, 6, shenjs_call(shen_digits_$gt$integers, [Arg4866_0[2]])]
  : (((shenjs_is_type(Arg4866_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("7", Arg4866_0[1]))))
  ? [shen_type_cons, 7, shenjs_call(shen_digits_$gt$integers, [Arg4866_0[2]])]
  : (((shenjs_is_type(Arg4866_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("8", Arg4866_0[1]))))
  ? [shen_type_cons, 8, shenjs_call(shen_digits_$gt$integers, [Arg4866_0[2]])]
  : (((shenjs_is_type(Arg4866_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$("9", Arg4866_0[1]))))
  ? [shen_type_cons, 9, shenjs_call(shen_digits_$gt$integers, [Arg4866_0[2]])]
  : []))))))))))},
  1,
  [],
  "shen-digits->integers"];
shenjs_functions["shen_shen-digits->integers"] = shen_digits_$gt$integers;






shen_$lt$sym$gt$ = [shen_type_func,
  function shen_user_lambda4869(Arg4868) {
  if (Arg4868.length < 1) return [shen_type_func, shen_user_lambda4869, 1, Arg4868];
  var Arg4868_0 = Arg4868[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$alpha$gt$, [Arg4868_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$symchars$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_intern((shenjs_call(shen_snd, [R0]) + shenjs_call(shen_snd, [R1])))])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$alpha$gt$, [Arg4868_0])),
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
  function shen_user_lambda4871(Arg4870) {
  if (Arg4870.length < 1) return [shen_type_func, shen_user_lambda4871, 1, Arg4870];
  var Arg4870_0 = Arg4870[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$symchar$gt$, [Arg4870_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$symchars$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), (shenjs_call(shen_snd, [R0]) + shenjs_call(shen_snd, [R1]))])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$symchar$gt$, [Arg4870_0])),
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
  function shen_user_lambda4873(Arg4872) {
  if (Arg4872.length < 1) return [shen_type_func, shen_user_lambda4873, 1, Arg4872];
  var Arg4872_0 = Arg4872[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$alpha$gt$, [Arg4872_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digit_$gt$string$gt$, [Arg4872_0])),
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
  function shen_user_lambda4875(Arg4874) {
  if (Arg4874.length < 1) return [shen_type_func, shen_user_lambda4875, 1, Arg4874];
  var Arg4874_0 = Arg4874[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4874_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4874_0])[2], shenjs_call(shen_snd, [Arg4874_0])])]), ((shenjs_call(shen_digit_byte$question$, [shenjs_call(shen_fst, [Arg4874_0])[1]]))
  ? shenjs_n_$gt$string(shenjs_call(shen_fst, [Arg4874_0])[1])
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
  function shen_user_lambda4877(Arg4876) {
  if (Arg4876.length < 1) return [shen_type_func, shen_user_lambda4877, 1, Arg4876];
  var Arg4876_0 = Arg4876[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(48, Arg4876_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(49, Arg4876_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(50, Arg4876_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(51, Arg4876_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(52, Arg4876_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(53, Arg4876_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(54, Arg4876_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(55, Arg4876_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(56, Arg4876_0)))
  ? true
  : ((shenjs_unwind_tail(shenjs_$eq$(57, Arg4876_0)))
  ? true
  : false))))))))))},
  1,
  [],
  "shen-digit-byte?"];
shenjs_functions["shen_shen-digit-byte?"] = shen_digit_byte$question$;






shen_$lt$alpha$gt$ = [shen_type_func,
  function shen_user_lambda4879(Arg4878) {
  if (Arg4878.length < 1) return [shen_type_func, shen_user_lambda4879, 1, Arg4878];
  var Arg4878_0 = Arg4878[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4878_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4878_0])[2], shenjs_call(shen_snd, [Arg4878_0])])]), ((R0 = shenjs_call(shen_symbol_byte_$gt$string, [shenjs_call(shen_fst, [Arg4878_0])[1]])),
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
  function shen_user_lambda4881(Arg4880) {
  if (Arg4880.length < 1) return [shen_type_func, shen_user_lambda4881, 1, Arg4880];
  var Arg4880_0 = Arg4880[0];
  return shenjs_absvector_ref((shenjs_globals["shen_shen-*symbolcodes*"]), Arg4880_0)},
  1,
  [],
  "shen-symbol-byte->string"];
shenjs_functions["shen_shen-symbol-byte->string"] = shen_symbol_byte_$gt$string;






shen_$lt$str$gt$ = [shen_type_func,
  function shen_user_lambda4883(Arg4882) {
  if (Arg4882.length < 1) return [shen_type_func, shen_user_lambda4883, 1, Arg4882];
  var Arg4882_0 = Arg4882[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$dbq$gt$, [Arg4882_0])),
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
  function shen_user_lambda4885(Arg4884) {
  if (Arg4884.length < 1) return [shen_type_func, shen_user_lambda4885, 1, Arg4884];
  var Arg4884_0 = Arg4884[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4884_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4884_0])[2], shenjs_call(shen_snd, [Arg4884_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4884_0])[1], 34)))
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
  function shen_user_lambda4887(Arg4886) {
  if (Arg4886.length < 1) return [shen_type_func, shen_user_lambda4887, 1, Arg4886];
  var Arg4886_0 = Arg4886[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$strc$gt$, [Arg4886_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$strcontents$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4886_0])),
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
  function shen_user_lambda4889(Arg4888) {
  if (Arg4888.length < 1) return [shen_type_func, shen_user_lambda4889, 1, Arg4888];
  var Arg4888_0 = Arg4888[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4888_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4888_0])[2], shenjs_call(shen_snd, [Arg4888_0])])]), shenjs_n_$gt$string(shenjs_call(shen_fst, [Arg4888_0])[1])])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<byte>"];
shenjs_functions["shen_shen-<byte>"] = shen_$lt$byte$gt$;






shen_$lt$strc$gt$ = [shen_type_func,
  function shen_user_lambda4891(Arg4890) {
  if (Arg4890.length < 1) return [shen_type_func, shen_user_lambda4891, 1, Arg4890];
  var Arg4890_0 = Arg4890[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4890_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4890_0])[2], shenjs_call(shen_snd, [Arg4890_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4890_0])[1], 34)))
  ? shen_fail_obj
  : shenjs_n_$gt$string(shenjs_call(shen_fst, [Arg4890_0])[1]))])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<strc>"];
shenjs_functions["shen_shen-<strc>"] = shen_$lt$strc$gt$;






shen_$lt$backslash$gt$ = [shen_type_func,
  function shen_user_lambda4893(Arg4892) {
  if (Arg4892.length < 1) return [shen_type_func, shen_user_lambda4893, 1, Arg4892];
  var Arg4892_0 = Arg4892[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4892_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4892_0])[2], shenjs_call(shen_snd, [Arg4892_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4892_0])[1], 92)))
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
  function shen_user_lambda4895(Arg4894) {
  if (Arg4894.length < 1) return [shen_type_func, shen_user_lambda4895, 1, Arg4894];
  var Arg4894_0 = Arg4894[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$minus$gt$, [Arg4894_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$number$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), (0 - shenjs_call(shen_snd, [R0]))])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$plus$gt$, [Arg4894_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$number$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$predigits$gt$, [Arg4894_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg4894_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$predigits$gt$, [Arg4894_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg4894_0])),
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
  function shen_user_lambda4897(Arg4896) {
  if (Arg4896.length < 1) return [shen_type_func, shen_user_lambda4897, 1, Arg4896];
  var Arg4896_0 = Arg4896[0];
  var R0;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4896_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(101, shenjs_call(shen_fst, [Arg4896_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4896_0])[2], shenjs_call(shen_snd, [Arg4896_0])])]), [shen_type_cons, 101, []]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<E>"];
shenjs_functions["shen_shen-<E>"] = shen_$lt$E$gt$;






shen_$lt$log10$gt$ = [shen_type_func,
  function shen_user_lambda4899(Arg4898) {
  if (Arg4898.length < 1) return [shen_type_func, shen_user_lambda4899, 1, Arg4898];
  var Arg4898_0 = Arg4898[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$minus$gt$, [Arg4898_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$digits$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), (0 - shenjs_call(shen_pre, [shenjs_call(shen_reverse, [shenjs_call(shen_snd, [R0])]), 0]))])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg4898_0])),
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
  function shen_user_lambda4901(Arg4900) {
  if (Arg4900.length < 1) return [shen_type_func, shen_user_lambda4901, 1, Arg4900];
  var Arg4900_0 = Arg4900[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4900_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4900_0])[2], shenjs_call(shen_snd, [Arg4900_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4900_0])[1], 43)))
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
  function shen_user_lambda4903(Arg4902) {
  if (Arg4902.length < 1) return [shen_type_func, shen_user_lambda4903, 1, Arg4902];
  var Arg4902_0 = Arg4902[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4902_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4902_0])[2], shenjs_call(shen_snd, [Arg4902_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4902_0])[1], 46)))
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
  function shen_user_lambda4905(Arg4904) {
  if (Arg4904.length < 1) return [shen_type_func, shen_user_lambda4905, 1, Arg4904];
  var Arg4904_0 = Arg4904[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg4904_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4904_0])),
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
  function shen_user_lambda4907(Arg4906) {
  if (Arg4906.length < 1) return [shen_type_func, shen_user_lambda4907, 1, Arg4906];
  var Arg4906_0 = Arg4906[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$digits$gt$, [Arg4906_0])),
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
  function shen_user_lambda4909(Arg4908) {
  if (Arg4908.length < 1) return [shen_type_func, shen_user_lambda4909, 1, Arg4908];
  var Arg4908_0 = Arg4908[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$digit$gt$, [Arg4908_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$digits$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$digit$gt$, [Arg4908_0])),
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
  function shen_user_lambda4911(Arg4910) {
  if (Arg4910.length < 1) return [shen_type_func, shen_user_lambda4911, 1, Arg4910];
  var Arg4910_0 = Arg4910[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4910_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4910_0])[2], shenjs_call(shen_snd, [Arg4910_0])])]), ((shenjs_call(shen_digit_byte$question$, [shenjs_call(shen_fst, [Arg4910_0])[1]]))
  ? shenjs_call(shen_byte_$gt$digit, [shenjs_call(shen_fst, [Arg4910_0])[1]])
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
  function shen_user_lambda4913(Arg4912) {
  if (Arg4912.length < 1) return [shen_type_func, shen_user_lambda4913, 1, Arg4912];
  var Arg4912_0 = Arg4912[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(48, Arg4912_0)))
  ? 0
  : ((shenjs_unwind_tail(shenjs_$eq$(49, Arg4912_0)))
  ? 1
  : ((shenjs_unwind_tail(shenjs_$eq$(50, Arg4912_0)))
  ? 2
  : ((shenjs_unwind_tail(shenjs_$eq$(51, Arg4912_0)))
  ? 3
  : ((shenjs_unwind_tail(shenjs_$eq$(52, Arg4912_0)))
  ? 4
  : ((shenjs_unwind_tail(shenjs_$eq$(53, Arg4912_0)))
  ? 5
  : ((shenjs_unwind_tail(shenjs_$eq$(54, Arg4912_0)))
  ? 6
  : ((shenjs_unwind_tail(shenjs_$eq$(55, Arg4912_0)))
  ? 7
  : ((shenjs_unwind_tail(shenjs_$eq$(56, Arg4912_0)))
  ? 8
  : ((shenjs_unwind_tail(shenjs_$eq$(57, Arg4912_0)))
  ? 9
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-byte->digit"]]);})))))))))))},
  1,
  [],
  "shen-byte->digit"];
shenjs_functions["shen_shen-byte->digit"] = shen_byte_$gt$digit;






shen_pre = [shen_type_func,
  function shen_user_lambda4915(Arg4914) {
  if (Arg4914.length < 2) return [shen_type_func, shen_user_lambda4915, 2, Arg4914];
  var Arg4914_0 = Arg4914[0], Arg4914_1 = Arg4914[1];
  return ((shenjs_empty$question$(Arg4914_0))
  ? 0
  : ((shenjs_is_type(Arg4914_0, shen_type_cons))
  ? ((shenjs_call(shen_expt, [10, Arg4914_1]) * Arg4914_0[1]) + shenjs_call(shen_pre, [Arg4914_0[2], (Arg4914_1 + 1)]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-pre"]]);})))},
  2,
  [],
  "shen-pre"];
shenjs_functions["shen_shen-pre"] = shen_pre;






shen_post = [shen_type_func,
  function shen_user_lambda4917(Arg4916) {
  if (Arg4916.length < 2) return [shen_type_func, shen_user_lambda4917, 2, Arg4916];
  var Arg4916_0 = Arg4916[0], Arg4916_1 = Arg4916[1];
  return ((shenjs_empty$question$(Arg4916_0))
  ? 0
  : ((shenjs_is_type(Arg4916_0, shen_type_cons))
  ? ((shenjs_call(shen_expt, [10, (0 - Arg4916_1)]) * Arg4916_0[1]) + shenjs_call(shen_post, [Arg4916_0[2], (Arg4916_1 + 1)]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-post"]]);})))},
  2,
  [],
  "shen-post"];
shenjs_functions["shen_shen-post"] = shen_post;






shen_expt = [shen_type_func,
  function shen_user_lambda4919(Arg4918) {
  if (Arg4918.length < 2) return [shen_type_func, shen_user_lambda4919, 2, Arg4918];
  var Arg4918_0 = Arg4918[0], Arg4918_1 = Arg4918[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg4918_1)))
  ? 1
  : (((Arg4918_1 > 0))
  ? (Arg4918_0 * shenjs_call(shen_expt, [Arg4918_0, (Arg4918_1 - 1)]))
  : (1.0 * (shenjs_call(shen_expt, [Arg4918_0, (Arg4918_1 + 1)]) / Arg4918_0))))},
  2,
  [],
  "shen-expt"];
shenjs_functions["shen_shen-expt"] = shen_expt;






shen_$lt$st$_input1$gt$ = [shen_type_func,
  function shen_user_lambda4921(Arg4920) {
  if (Arg4920.length < 1) return [shen_type_func, shen_user_lambda4921, 1, Arg4920];
  var Arg4920_0 = Arg4920[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [Arg4920_0])),
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
  function shen_user_lambda4923(Arg4922) {
  if (Arg4922.length < 1) return [shen_type_func, shen_user_lambda4923, 1, Arg4922];
  var Arg4922_0 = Arg4922[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$st$_input$gt$, [Arg4922_0])),
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
  function shen_user_lambda4925(Arg4924) {
  if (Arg4924.length < 1) return [shen_type_func, shen_user_lambda4925, 1, Arg4924];
  var Arg4924_0 = Arg4924[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$backslash$gt$, [Arg4924_0])),
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
  function shen_user_lambda4927(Arg4926) {
  if (Arg4926.length < 1) return [shen_type_func, shen_user_lambda4927, 1, Arg4926];
  var Arg4926_0 = Arg4926[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4926_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4926_0])[2], shenjs_call(shen_snd, [Arg4926_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4926_0])[1], 42)))
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
  function shen_user_lambda4929(Arg4928) {
  if (Arg4928.length < 1) return [shen_type_func, shen_user_lambda4929, 1, Arg4928];
  var Arg4928_0 = Arg4928[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$comment$gt$, [Arg4928_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$any$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_symbol, "shen-skip"]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$blah$gt$, [Arg4928_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$any$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_symbol, "shen-skip"]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4928_0])),
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
  function shen_user_lambda4931(Arg4930) {
  if (Arg4930.length < 1) return [shen_type_func, shen_user_lambda4931, 1, Arg4930];
  var Arg4930_0 = Arg4930[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4930_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4930_0])[2], shenjs_call(shen_snd, [Arg4930_0])])]), ((shenjs_call(shen_end_of_comment$question$, [shenjs_call(shen_fst, [Arg4930_0])]))
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
  function shen_user_lambda4933(Arg4932) {
  if (Arg4932.length < 1) return [shen_type_func, shen_user_lambda4933, 1, Arg4932];
  var Arg4932_0 = Arg4932[0];
  return (((shenjs_is_type(Arg4932_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(42, Arg4932_0[1])) && (shenjs_is_type(Arg4932_0[2], shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(92, Arg4932_0[2][1]))))))
  ? true
  : false)},
  1,
  [],
  "shen-end-of-comment?"];
shenjs_functions["shen_shen-end-of-comment?"] = shen_end_of_comment$question$;






shen_$lt$whitespaces$gt$ = [shen_type_func,
  function shen_user_lambda4935(Arg4934) {
  if (Arg4934.length < 1) return [shen_type_func, shen_user_lambda4935, 1, Arg4934];
  var Arg4934_0 = Arg4934[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$whitespace$gt$, [Arg4934_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R0 = shenjs_call(shen_$lt$whitespaces$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), [shen_type_symbol, "shen-skip"]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$whitespace$gt$, [Arg4934_0])),
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
  function shen_user_lambda4937(Arg4936) {
  if (Arg4936.length < 1) return [shen_type_func, shen_user_lambda4937, 1, Arg4936];
  var Arg4936_0 = Arg4936[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4936_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4936_0])[2], shenjs_call(shen_snd, [Arg4936_0])])]), ((R0 = shenjs_call(shen_fst, [Arg4936_0])[1]),
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
  function shen_user_lambda4939(Arg4938) {
  if (Arg4938.length < 1) return [shen_type_func, shen_user_lambda4939, 1, Arg4938];
  var Arg4938_0 = Arg4938[0];
  return ((shenjs_empty$question$(Arg4938_0))
  ? []
  : (((shenjs_is_type(Arg4938_0, shen_type_cons) && (shenjs_is_type(Arg4938_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "bar!"], Arg4938_0[2][1])) && (shenjs_is_type(Arg4938_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4938_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, Arg4938_0[1], Arg4938_0[2][2]]]
  : ((shenjs_is_type(Arg4938_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, Arg4938_0[1], [shen_type_cons, shenjs_call(shen_cons$_form, [Arg4938_0[2]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-cons_form"]]);}))))},
  1,
  [],
  "shen-cons_form"];
shenjs_functions["shen_shen-cons_form"] = shen_cons$_form;






shen_package_macro = [shen_type_func,
  function shen_user_lambda4941(Arg4940) {
  if (Arg4940.length < 2) return [shen_type_func, shen_user_lambda4941, 2, Arg4940];
  var Arg4940_0 = Arg4940[0], Arg4940_1 = Arg4940[1];
  var R0;
  return (((shenjs_is_type(Arg4940_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "$"], Arg4940_0[1])) && (shenjs_is_type(Arg4940_0[2], shen_type_cons) && shenjs_empty$question$(Arg4940_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(shen_explode, [Arg4940_0[2][1]]), Arg4940_1]);})
  : (((shenjs_is_type(Arg4940_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg4940_0[1])) && (shenjs_is_type(Arg4940_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "null"], Arg4940_0[2][1])) && shenjs_is_type(Arg4940_0[2][2], shen_type_cons))))))
  ? (function() {
  return shenjs_call_tail(shen_append, [Arg4940_0[2][2][2], Arg4940_1]);})
  : (((shenjs_is_type(Arg4940_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "package"], Arg4940_0[1])) && (shenjs_is_type(Arg4940_0[2], shen_type_cons) && shenjs_is_type(Arg4940_0[2][2], shen_type_cons)))))
  ? ((R0 = shenjs_call(shen_eval_without_macros, [Arg4940_0[2][2][1]])),
  shenjs_call(shen_record_exceptions, [R0, Arg4940_0[2][1]]),
  (function() {
  return shenjs_call_tail(shen_append, [shenjs_call(shen_packageh, [Arg4940_0[2][1], R0, Arg4940_0[2][2][2]]), Arg4940_1]);}))
  : [shen_type_cons, Arg4940_0, Arg4940_1])))},
  2,
  [],
  "shen-package-macro"];
shenjs_functions["shen_shen-package-macro"] = shen_package_macro;






shen_record_exceptions = [shen_type_func,
  function shen_user_lambda4943(Arg4942) {
  if (Arg4942.length < 2) return [shen_type_func, shen_user_lambda4943, 2, Arg4942];
  var Arg4942_0 = Arg4942[0], Arg4942_1 = Arg4942[1];
  var R0;
  return ((R0 = shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg4942_1, [shen_type_symbol, "shen-external-symbols"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda4945(Arg4944) {
  if (Arg4944.length < 1) return [shen_type_func, shen_user_lambda4945, 1, Arg4944];
  var Arg4944_0 = Arg4944[0];
  return []},
  1,
  []])),
  (R0 = shenjs_call(shen_union, [Arg4942_0, R0])),
  (function() {
  return shenjs_call_tail(shen_put, [Arg4942_1, [shen_type_symbol, "shen-external-symbols"], R0, (shenjs_globals["shen_shen-*property-vector*"])]);}))},
  2,
  [],
  "shen-record-exceptions"];
shenjs_functions["shen_shen-record-exceptions"] = shen_record_exceptions;






shen_packageh = [shen_type_func,
  function shen_user_lambda4947(Arg4946) {
  if (Arg4946.length < 3) return [shen_type_func, shen_user_lambda4947, 3, Arg4946];
  var Arg4946_0 = Arg4946[0], Arg4946_1 = Arg4946[1], Arg4946_2 = Arg4946[2];
  return ((shenjs_is_type(Arg4946_2, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_packageh, [Arg4946_0, Arg4946_1, Arg4946_2[1]]), shenjs_call(shen_packageh, [Arg4946_0, Arg4946_1, Arg4946_2[2]])]
  : (((shenjs_call(shen_sysfunc$question$, [Arg4946_2]) || (shenjs_call(shen_variable$question$, [Arg4946_2]) || (shenjs_call(shen_element$question$, [Arg4946_2, Arg4946_1]) || (shenjs_call(shen_doubleunderline$question$, [Arg4946_2]) || shenjs_call(shen_singleunderline$question$, [Arg4946_2]))))))
  ? Arg4946_2
  : (((shenjs_is_type(Arg4946_2, shen_type_symbol) && (!shenjs_call(shen_prefix$question$, [[shen_type_cons, "s", [shen_type_cons, "h", [shen_type_cons, "e", [shen_type_cons, "n", [shen_type_cons, "-", []]]]]], shenjs_call(shen_explode, [Arg4946_2])]))))
  ? (function() {
  return shenjs_call_tail(shen_concat, [Arg4946_0, Arg4946_2]);})
  : Arg4946_2)))},
  3,
  [],
  "shen-packageh"];
shenjs_functions["shen_shen-packageh"] = shen_packageh;












shen_$lt$defprolog$gt$ = [shen_type_func,
  function shen_user_lambda4498(Arg4497) {
  if (Arg4497.length < 1) return [shen_type_func, shen_user_lambda4498, 1, Arg4497];
  var Arg4497_0 = Arg4497[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$predicate$asterisk$$gt$, [Arg4497_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$clauses$asterisk$$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_prolog_$gt$shen, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4500(Arg4499) {
  if (Arg4499.length < 2) return [shen_type_func, shen_user_lambda4500, 2, Arg4499];
  var Arg4499_0 = Arg4499[0], Arg4499_1 = Arg4499[1];
  return (function() {
  return shenjs_call_tail(shen_insert_predicate, [shenjs_call(shen_snd, [Arg4499_0]), Arg4499_1]);})},
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
  function shen_user_lambda4502(Arg4501) {
  if (Arg4501.length < 2) return [shen_type_func, shen_user_lambda4502, 2, Arg4501];
  var Arg4501_0 = Arg4501[0], Arg4501_1 = Arg4501[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["prolog syntax error in ~A here:~%~% ~A~%", [shen_tuple, Arg4501_0, [shen_tuple, shenjs_call(shen_next_50, [50, Arg4501_1]), []]]]);})},
  2,
  [],
  "shen-prolog-error"];
shenjs_functions["shen_shen-prolog-error"] = shen_prolog_error;






shen_next_50 = [shen_type_func,
  function shen_user_lambda4504(Arg4503) {
  if (Arg4503.length < 2) return [shen_type_func, shen_user_lambda4504, 2, Arg4503];
  var Arg4503_0 = Arg4503[0], Arg4503_1 = Arg4503[1];
  return ((shenjs_empty$question$(Arg4503_1))
  ? ""
  : ((shenjs_unwind_tail(shenjs_$eq$(0, Arg4503_0)))
  ? ""
  : ((shenjs_is_type(Arg4503_1, shen_type_cons))
  ? (shenjs_call(shen_decons_string, [Arg4503_1[1]]) + shenjs_call(shen_next_50, [(Arg4503_0 - 1), Arg4503_1[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-next-50"]]);}))))},
  2,
  [],
  "shen-next-50"];
shenjs_functions["shen_shen-next-50"] = shen_next_50;






shen_decons_string = [shen_type_func,
  function shen_user_lambda4506(Arg4505) {
  if (Arg4505.length < 1) return [shen_type_func, shen_user_lambda4506, 1, Arg4505];
  var Arg4505_0 = Arg4505[0];
  return (((shenjs_is_type(Arg4505_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg4505_0[1])) && (shenjs_is_type(Arg4505_0[2], shen_type_cons) && (shenjs_is_type(Arg4505_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4505_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_intmake_string, ["~S ", [shen_tuple, shenjs_call(shen_eval_cons, [Arg4505_0]), []]]);})
  : (function() {
  return shenjs_call_tail(shen_intmake_string, ["~R ", [shen_tuple, Arg4505_0, []]]);}))},
  1,
  [],
  "shen-decons-string"];
shenjs_functions["shen_shen-decons-string"] = shen_decons_string;






shen_insert_predicate = [shen_type_func,
  function shen_user_lambda4508(Arg4507) {
  if (Arg4507.length < 2) return [shen_type_func, shen_user_lambda4508, 2, Arg4507];
  var Arg4507_0 = Arg4507[0], Arg4507_1 = Arg4507[1];
  return (((shenjs_is_type(Arg4507_1, shen_type_cons) && (shenjs_is_type(Arg4507_1[2], shen_type_cons) && shenjs_empty$question$(Arg4507_1[2][2]))))
  ? [shen_type_cons, [shen_type_cons, Arg4507_0, Arg4507_1[1]], [shen_type_cons, [shen_type_symbol, ":-"], Arg4507_1[2]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-insert-predicate"]]);}))},
  2,
  [],
  "shen-insert-predicate"];
shenjs_functions["shen_shen-insert-predicate"] = shen_insert_predicate;






shen_$lt$predicate$asterisk$$gt$ = [shen_type_func,
  function shen_user_lambda4510(Arg4509) {
  if (Arg4509.length < 1) return [shen_type_func, shen_user_lambda4510, 1, Arg4509];
  var Arg4509_0 = Arg4509[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4509_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4509_0])[2], shenjs_call(shen_snd, [Arg4509_0])])]), shenjs_call(shen_fst, [Arg4509_0])[1]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? shen_fail_obj
  : R0))},
  1,
  [],
  "shen-<predicate*>"];
shenjs_functions["shen_shen-<predicate*>"] = shen_$lt$predicate$asterisk$$gt$;






shen_$lt$clauses$asterisk$$gt$ = [shen_type_func,
  function shen_user_lambda4512(Arg4511) {
  if (Arg4511.length < 1) return [shen_type_func, shen_user_lambda4512, 1, Arg4511];
  var Arg4511_0 = Arg4511[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$clause$asterisk$$gt$, [Arg4511_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$clauses$asterisk$$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4511_0])),
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
  function shen_user_lambda4514(Arg4513) {
  if (Arg4513.length < 1) return [shen_type_func, shen_user_lambda4514, 1, Arg4513];
  var Arg4513_0 = Arg4513[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$head$asterisk$$gt$, [Arg4513_0])),
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
  function shen_user_lambda4516(Arg4515) {
  if (Arg4515.length < 1) return [shen_type_func, shen_user_lambda4516, 1, Arg4515];
  var Arg4515_0 = Arg4515[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$term$asterisk$$gt$, [Arg4515_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$head$asterisk$$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4515_0])),
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
  function shen_user_lambda4518(Arg4517) {
  if (Arg4517.length < 1) return [shen_type_func, shen_user_lambda4518, 1, Arg4517];
  var Arg4517_0 = Arg4517[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4517_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4517_0])[2], shenjs_call(shen_snd, [Arg4517_0])])]), ((((!shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "<--"], shenjs_call(shen_fst, [Arg4517_0])[1]))) && shenjs_call(shen_legitimate_term$question$, [shenjs_call(shen_fst, [Arg4517_0])[1]])))
  ? shenjs_call(shen_eval_cons, [shenjs_call(shen_fst, [Arg4517_0])[1]])
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
  function shen_user_lambda4520(Arg4519) {
  if (Arg4519.length < 1) return [shen_type_func, shen_user_lambda4520, 1, Arg4519];
  var Arg4519_0 = Arg4519[0];
  return (((shenjs_is_type(Arg4519_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg4519_0[1])) && (shenjs_is_type(Arg4519_0[2], shen_type_cons) && (shenjs_is_type(Arg4519_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4519_0[2][2][2]))))))
  ? (shenjs_call(shen_legitimate_term$question$, [Arg4519_0[2][1]]) && shenjs_call(shen_legitimate_term$question$, [Arg4519_0[2][2][1]]))
  : (((shenjs_is_type(Arg4519_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4519_0[1])) && (shenjs_is_type(Arg4519_0[2], shen_type_cons) && (shenjs_is_type(Arg4519_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4519_0[2][2][1])) && shenjs_empty$question$(Arg4519_0[2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(shen_legitimate_term$question$, [Arg4519_0[2][1]]);})
  : (((shenjs_is_type(Arg4519_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4519_0[1])) && (shenjs_is_type(Arg4519_0[2], shen_type_cons) && (shenjs_is_type(Arg4519_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4519_0[2][2][1])) && shenjs_empty$question$(Arg4519_0[2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(shen_legitimate_term$question$, [Arg4519_0[2][1]]);})
  : ((shenjs_is_type(Arg4519_0, shen_type_cons))
  ? false
  : true))))},
  1,
  [],
  "shen-legitimate-term?"];
shenjs_functions["shen_shen-legitimate-term?"] = shen_legitimate_term$question$;






shen_eval_cons = [shen_type_func,
  function shen_user_lambda4522(Arg4521) {
  if (Arg4521.length < 1) return [shen_type_func, shen_user_lambda4522, 1, Arg4521];
  var Arg4521_0 = Arg4521[0];
  return (((shenjs_is_type(Arg4521_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], Arg4521_0[1])) && (shenjs_is_type(Arg4521_0[2], shen_type_cons) && (shenjs_is_type(Arg4521_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4521_0[2][2][2]))))))
  ? [shen_type_cons, shenjs_call(shen_eval_cons, [Arg4521_0[2][1]]), shenjs_call(shen_eval_cons, [Arg4521_0[2][2][1]])]
  : (((shenjs_is_type(Arg4521_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4521_0[1])) && (shenjs_is_type(Arg4521_0[2], shen_type_cons) && (shenjs_is_type(Arg4521_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4521_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, shenjs_call(shen_eval_cons, [Arg4521_0[2][1]]), Arg4521_0[2][2]]]
  : Arg4521_0))},
  1,
  [],
  "shen-eval-cons"];
shenjs_functions["shen_shen-eval-cons"] = shen_eval_cons;






shen_$lt$body$asterisk$$gt$ = [shen_type_func,
  function shen_user_lambda4524(Arg4523) {
  if (Arg4523.length < 1) return [shen_type_func, shen_user_lambda4524, 1, Arg4523];
  var Arg4523_0 = Arg4523[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$literal$asterisk$$gt$, [Arg4523_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$body$asterisk$$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg4523_0])),
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
  function shen_user_lambda4526(Arg4525) {
  if (Arg4525.length < 1) return [shen_type_func, shen_user_lambda4526, 1, Arg4525];
  var Arg4525_0 = Arg4525[0];
  var R0;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg4525_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "!"], shenjs_call(shen_fst, [Arg4525_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4525_0])[2], shenjs_call(shen_snd, [Arg4525_0])])]), [shen_type_cons, [shen_type_symbol, "cut"], [shen_type_cons, [shen_type_symbol, "Throwcontrol"], []]]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4525_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4525_0])[2], shenjs_call(shen_snd, [Arg4525_0])])]), ((shenjs_is_type(shenjs_call(shen_fst, [Arg4525_0])[1], shen_type_cons))
  ? shenjs_call(shen_fst, [Arg4525_0])[1]
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
  function shen_user_lambda4528(Arg4527) {
  if (Arg4527.length < 1) return [shen_type_func, shen_user_lambda4528, 1, Arg4527];
  var Arg4527_0 = Arg4527[0];
  var R0;
  return ((R0 = ((shenjs_is_type(shenjs_call(shen_fst, [Arg4527_0]), shen_type_cons))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg4527_0])[2], shenjs_call(shen_snd, [Arg4527_0])])]), ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_fst, [Arg4527_0])[1], [shen_type_symbol, ";"])))
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
  function shen_user_lambda4530(Arg4529) {
  if (Arg4529.length < 3) return [shen_type_func, shen_user_lambda4530, 3, Arg4529];
  var Arg4529_0 = Arg4529[0], Arg4529_1 = Arg4529[1], Arg4529_2 = Arg4529[2];
  var R0;
  return ((R0 = shenjs_unwind_tail(shenjs_thaw(Arg4529_2))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? Arg4529_0
  : R0))},
  3,
  [],
  "cut"];
shenjs_functions["shen_cut"] = shen_cut;






shen_insert$_modes = [shen_type_func,
  function shen_user_lambda4532(Arg4531) {
  if (Arg4531.length < 1) return [shen_type_func, shen_user_lambda4532, 1, Arg4531];
  var Arg4531_0 = Arg4531[0];
  return (((shenjs_is_type(Arg4531_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4531_0[1])) && (shenjs_is_type(Arg4531_0[2], shen_type_cons) && (shenjs_is_type(Arg4531_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4531_0[2][2][2]))))))
  ? Arg4531_0
  : ((shenjs_empty$question$(Arg4531_0))
  ? []
  : ((shenjs_is_type(Arg4531_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4531_0[1], [shen_type_cons, [shen_type_symbol, "+"], []]]], [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, shenjs_call(shen_insert$_modes, [Arg4531_0[2]]), [shen_type_cons, [shen_type_symbol, "-"], []]]]]
  : Arg4531_0)))},
  1,
  [],
  "shen-insert_modes"];
shenjs_functions["shen_shen-insert_modes"] = shen_insert$_modes;






shen_s_prolog = [shen_type_func,
  function shen_user_lambda4534(Arg4533) {
  if (Arg4533.length < 1) return [shen_type_func, shen_user_lambda4534, 1, Arg4533];
  var Arg4533_0 = Arg4533[0];
  return (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda4536(Arg4535) {
  if (Arg4535.length < 1) return [shen_type_func, shen_user_lambda4536, 1, Arg4535];
  var Arg4535_0 = Arg4535[0];
  return (function() {
  return shenjs_call_tail(shen_eval, [Arg4535_0]);})},
  1,
  []], shenjs_call(shen_prolog_$gt$shen, [Arg4533_0])]);})},
  1,
  [],
  "shen-s-prolog"];
shenjs_functions["shen_shen-s-prolog"] = shen_s_prolog;






shen_prolog_$gt$shen = [shen_type_func,
  function shen_user_lambda4538(Arg4537) {
  if (Arg4537.length < 1) return [shen_type_func, shen_user_lambda4538, 1, Arg4537];
  var Arg4537_0 = Arg4537[0];
  return (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda4540(Arg4539) {
  if (Arg4539.length < 1) return [shen_type_func, shen_user_lambda4540, 1, Arg4539];
  var Arg4539_0 = Arg4539[0];
  return (function() {
  return shenjs_call_tail(shen_compile$_prolog$_procedure, [Arg4539_0]);})},
  1,
  []], shenjs_call(shen_group$_clauses, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4542(Arg4541) {
  if (Arg4541.length < 1) return [shen_type_func, shen_user_lambda4542, 1, Arg4541];
  var Arg4541_0 = Arg4541[0];
  return (function() {
  return shenjs_call_tail(shen_s_prolog$_clause, [Arg4541_0]);})},
  1,
  []], shenjs_call(shen_mapcan, [[shen_type_func,
  function shen_user_lambda4544(Arg4543) {
  if (Arg4543.length < 1) return [shen_type_func, shen_user_lambda4544, 1, Arg4543];
  var Arg4543_0 = Arg4543[0];
  return (function() {
  return shenjs_call_tail(shen_head$_abstraction, [Arg4543_0]);})},
  1,
  []], Arg4537_0])])])]);})},
  1,
  [],
  "shen-prolog->shen"];
shenjs_functions["shen_shen-prolog->shen"] = shen_prolog_$gt$shen;






shen_s_prolog$_clause = [shen_type_func,
  function shen_user_lambda4546(Arg4545) {
  if (Arg4545.length < 1) return [shen_type_func, shen_user_lambda4546, 1, Arg4545];
  var Arg4545_0 = Arg4545[0];
  return (((shenjs_is_type(Arg4545_0, shen_type_cons) && (shenjs_is_type(Arg4545_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg4545_0[2][1])) && (shenjs_is_type(Arg4545_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4545_0[2][2][2]))))))
  ? [shen_type_cons, Arg4545_0[1], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4548(Arg4547) {
  if (Arg4547.length < 1) return [shen_type_func, shen_user_lambda4548, 1, Arg4547];
  var Arg4547_0 = Arg4547[0];
  return (function() {
  return shenjs_call_tail(shen_s_prolog$_literal, [Arg4547_0]);})},
  1,
  []], Arg4545_0[2][2][1]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-s-prolog_clause"]]);}))},
  1,
  [],
  "shen-s-prolog_clause"];
shenjs_functions["shen_shen-s-prolog_clause"] = shen_s_prolog$_clause;






shen_head$_abstraction = [shen_type_func,
  function shen_user_lambda4550(Arg4549) {
  if (Arg4549.length < 1) return [shen_type_func, shen_user_lambda4550, 1, Arg4549];
  var Arg4549_0 = Arg4549[0];
  var R0, R1;
  return (((shenjs_is_type(Arg4549_0, shen_type_cons) && (shenjs_is_type(Arg4549_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg4549_0[2][1])) && (shenjs_is_type(Arg4549_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4549_0[2][2][2]) && (shenjs_call(shen_complexity$_head, [Arg4549_0[1]]) < (shenjs_globals["shen_shen-*maxcomplexity*"]))))))))
  ? [shen_type_cons, Arg4549_0, []]
  : (((shenjs_is_type(Arg4549_0, shen_type_cons) && (shenjs_is_type(Arg4549_0[1], shen_type_cons) && (shenjs_is_type(Arg4549_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg4549_0[2][1])) && (shenjs_is_type(Arg4549_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4549_0[2][2][2])))))))
  ? ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4552(Arg4551) {
  if (Arg4551.length < 1) return [shen_type_func, shen_user_lambda4552, 1, Arg4551];
  var Arg4551_0 = Arg4551[0];
  return (function() {
  return shenjs_call_tail(shen_gensym, [[shen_type_symbol, "V"]]);})},
  1,
  []], Arg4549_0[1][2]])),
  (R1 = shenjs_call(shen_rcons$_form, [shenjs_call(shen_remove$_modes, [Arg4549_0[1][2]])])),
  (R1 = [shen_type_cons, [shen_type_symbol, "unify"], [shen_type_cons, shenjs_call(shen_cons$_form, [R0]), [shen_type_cons, R1, []]]]),
  (R1 = [shen_type_cons, [shen_type_cons, Arg4549_0[1][1], R0], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [shen_type_cons, R1, Arg4549_0[2][2][1]], []]]]),
  [shen_type_cons, R1, []])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-head_abstraction"]]);})))},
  1,
  [],
  "shen-head_abstraction"];
shenjs_functions["shen_shen-head_abstraction"] = shen_head$_abstraction;






shen_complexity$_head = [shen_type_func,
  function shen_user_lambda4554(Arg4553) {
  if (Arg4553.length < 1) return [shen_type_func, shen_user_lambda4554, 1, Arg4553];
  var Arg4553_0 = Arg4553[0];
  return ((shenjs_is_type(Arg4553_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_product, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4556(Arg4555) {
  if (Arg4555.length < 1) return [shen_type_func, shen_user_lambda4556, 1, Arg4555];
  var Arg4555_0 = Arg4555[0];
  return (function() {
  return shenjs_call_tail(shen_complexity, [Arg4555_0]);})},
  1,
  []], Arg4553_0[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-complexity_head"]]);}))},
  1,
  [],
  "shen-complexity_head"];
shenjs_functions["shen_shen-complexity_head"] = shen_complexity$_head;






shen_complexity = [shen_type_func,
  function shen_user_lambda4558(Arg4557) {
  if (Arg4557.length < 1) return [shen_type_func, shen_user_lambda4558, 1, Arg4557];
  var Arg4557_0 = Arg4557[0];
  return (((shenjs_is_type(Arg4557_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4557_0[1])) && (shenjs_is_type(Arg4557_0[2], shen_type_cons) && (shenjs_is_type(Arg4557_0[2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4557_0[2][1][1])) && (shenjs_is_type(Arg4557_0[2][1][2], shen_type_cons) && (shenjs_is_type(Arg4557_0[2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4557_0[2][1][2][2][2]) && (shenjs_is_type(Arg4557_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4557_0[2][2][2])))))))))))
  ? (function() {
  return shenjs_call_tail(shen_complexity, [Arg4557_0[2][1]]);})
  : (((shenjs_is_type(Arg4557_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4557_0[1])) && (shenjs_is_type(Arg4557_0[2], shen_type_cons) && (shenjs_is_type(Arg4557_0[2][1], shen_type_cons) && (shenjs_is_type(Arg4557_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4557_0[2][2][1])) && shenjs_empty$question$(Arg4557_0[2][2][2]))))))))
  ? (2 * (shenjs_call(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4557_0[2][1][1], Arg4557_0[2][2]]]]) * shenjs_call(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4557_0[2][1][2], Arg4557_0[2][2]]]])))
  : (((shenjs_is_type(Arg4557_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4557_0[1])) && (shenjs_is_type(Arg4557_0[2], shen_type_cons) && (shenjs_is_type(Arg4557_0[2][1], shen_type_cons) && (shenjs_is_type(Arg4557_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4557_0[2][2][1])) && shenjs_empty$question$(Arg4557_0[2][2][2]))))))))
  ? (shenjs_call(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4557_0[2][1][1], Arg4557_0[2][2]]]]) * shenjs_call(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4557_0[2][1][2], Arg4557_0[2][2]]]]))
  : (((shenjs_is_type(Arg4557_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4557_0[1])) && (shenjs_is_type(Arg4557_0[2], shen_type_cons) && (shenjs_is_type(Arg4557_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4557_0[2][2][2]) && shenjs_call(shen_variable$question$, [Arg4557_0[2][1]])))))))
  ? 1
  : (((shenjs_is_type(Arg4557_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4557_0[1])) && (shenjs_is_type(Arg4557_0[2], shen_type_cons) && (shenjs_is_type(Arg4557_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4557_0[2][2][1])) && shenjs_empty$question$(Arg4557_0[2][2][2])))))))
  ? 2
  : (((shenjs_is_type(Arg4557_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4557_0[1])) && (shenjs_is_type(Arg4557_0[2], shen_type_cons) && (shenjs_is_type(Arg4557_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4557_0[2][2][1])) && shenjs_empty$question$(Arg4557_0[2][2][2])))))))
  ? 1
  : (function() {
  return shenjs_call_tail(shen_complexity, [[shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4557_0, [shen_type_cons, [shen_type_symbol, "+"], []]]]]);})))))))},
  1,
  [],
  "shen-complexity"];
shenjs_functions["shen_shen-complexity"] = shen_complexity;






shen_product = [shen_type_func,
  function shen_user_lambda4560(Arg4559) {
  if (Arg4559.length < 1) return [shen_type_func, shen_user_lambda4560, 1, Arg4559];
  var Arg4559_0 = Arg4559[0];
  return ((shenjs_empty$question$(Arg4559_0))
  ? 1
  : ((shenjs_is_type(Arg4559_0, shen_type_cons))
  ? (Arg4559_0[1] * shenjs_call(shen_product, [Arg4559_0[2]]))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-product"]]);})))},
  1,
  [],
  "shen-product"];
shenjs_functions["shen_shen-product"] = shen_product;






shen_s_prolog$_literal = [shen_type_func,
  function shen_user_lambda4562(Arg4561) {
  if (Arg4561.length < 1) return [shen_type_func, shen_user_lambda4562, 1, Arg4561];
  var Arg4561_0 = Arg4561[0];
  return (((shenjs_is_type(Arg4561_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "is"], Arg4561_0[1])) && (shenjs_is_type(Arg4561_0[2], shen_type_cons) && (shenjs_is_type(Arg4561_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4561_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, Arg4561_0[2][1], [shen_type_cons, shenjs_call(shen_insert$_deref, [Arg4561_0[2][2][1]]), []]]]
  : (((shenjs_is_type(Arg4561_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "when"], Arg4561_0[1])) && (shenjs_is_type(Arg4561_0[2], shen_type_cons) && shenjs_empty$question$(Arg4561_0[2][2])))))
  ? [shen_type_cons, [shen_type_symbol, "fwhen"], [shen_type_cons, shenjs_call(shen_insert$_deref, [Arg4561_0[2][1]]), []]]
  : (((shenjs_is_type(Arg4561_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "bind"], Arg4561_0[1])) && (shenjs_is_type(Arg4561_0[2], shen_type_cons) && (shenjs_is_type(Arg4561_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4561_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, Arg4561_0[2][1], [shen_type_cons, shenjs_call(shen_insert$_lazyderef, [Arg4561_0[2][2][1]]), []]]]
  : (((shenjs_is_type(Arg4561_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fwhen"], Arg4561_0[1])) && (shenjs_is_type(Arg4561_0[2], shen_type_cons) && shenjs_empty$question$(Arg4561_0[2][2])))))
  ? [shen_type_cons, [shen_type_symbol, "fwhen"], [shen_type_cons, shenjs_call(shen_insert$_lazyderef, [Arg4561_0[2][1]]), []]]
  : ((shenjs_is_type(Arg4561_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_m$_prolog$_to$_s_prolog$_predicate, [Arg4561_0[1]]), Arg4561_0[2]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-s-prolog_literal"]]);}))))))},
  1,
  [],
  "shen-s-prolog_literal"];
shenjs_functions["shen_shen-s-prolog_literal"] = shen_s_prolog$_literal;






shen_insert$_deref = [shen_type_func,
  function shen_user_lambda4564(Arg4563) {
  if (Arg4563.length < 1) return [shen_type_func, shen_user_lambda4564, 1, Arg4563];
  var Arg4563_0 = Arg4563[0];
  return ((shenjs_call(shen_variable$question$, [Arg4563_0]))
  ? [shen_type_cons, [shen_type_symbol, "shen-deref"], [shen_type_cons, Arg4563_0, [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]]
  : ((shenjs_is_type(Arg4563_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_insert$_deref, [Arg4563_0[1]]), shenjs_call(shen_insert$_deref, [Arg4563_0[2]])]
  : Arg4563_0))},
  1,
  [],
  "shen-insert_deref"];
shenjs_functions["shen_shen-insert_deref"] = shen_insert$_deref;






shen_insert$_lazyderef = [shen_type_func,
  function shen_user_lambda4566(Arg4565) {
  if (Arg4565.length < 1) return [shen_type_func, shen_user_lambda4566, 1, Arg4565];
  var Arg4565_0 = Arg4565[0];
  return ((shenjs_call(shen_variable$question$, [Arg4565_0]))
  ? [shen_type_cons, [shen_type_symbol, "shen-lazyderef"], [shen_type_cons, Arg4565_0, [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]]
  : ((shenjs_is_type(Arg4565_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_insert$_lazyderef, [Arg4565_0[1]]), shenjs_call(shen_insert$_lazyderef, [Arg4565_0[2]])]
  : Arg4565_0))},
  1,
  [],
  "shen-insert_lazyderef"];
shenjs_functions["shen_shen-insert_lazyderef"] = shen_insert$_lazyderef;






shen_m$_prolog$_to$_s_prolog$_predicate = [shen_type_func,
  function shen_user_lambda4568(Arg4567) {
  if (Arg4567.length < 1) return [shen_type_func, shen_user_lambda4568, 1, Arg4567];
  var Arg4567_0 = Arg4567[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "="], Arg4567_0)))
  ? [shen_type_symbol, "unify"]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "=!"], Arg4567_0)))
  ? [shen_type_symbol, "unify!"]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "=="], Arg4567_0)))
  ? [shen_type_symbol, "identical"]
  : Arg4567_0)))},
  1,
  [],
  "shen-m_prolog_to_s-prolog_predicate"];
shenjs_functions["shen_shen-m_prolog_to_s-prolog_predicate"] = shen_m$_prolog$_to$_s_prolog$_predicate;






shen_group$_clauses = [shen_type_func,
  function shen_user_lambda4570(Arg4569) {
  if (Arg4569.length < 1) return [shen_type_func, shen_user_lambda4570, 1, Arg4569];
  var Arg4569_0 = Arg4569[0];
  var R0, R1;
  return ((shenjs_empty$question$(Arg4569_0))
  ? []
  : ((shenjs_is_type(Arg4569_0, shen_type_cons))
  ? ((R0 = shenjs_call(shen_collect, [[shen_type_func,
  function shen_user_lambda4572(Arg4571) {
  if (Arg4571.length < 2) return [shen_type_func, shen_user_lambda4572, 2, Arg4571];
  var Arg4571_0 = Arg4571[0], Arg4571_1 = Arg4571[1];
  return (function() {
  return shenjs_call_tail(shen_same$_predicate$question$, [Arg4571_0[1], Arg4571_1]);})},
  2,
  [Arg4569_0]], Arg4569_0])),
  (R1 = shenjs_call(shen_difference, [Arg4569_0, R0])),
  [shen_type_cons, R0, shenjs_call(shen_group$_clauses, [R1])])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-group_clauses"]]);})))},
  1,
  [],
  "shen-group_clauses"];
shenjs_functions["shen_shen-group_clauses"] = shen_group$_clauses;






shen_collect = [shen_type_func,
  function shen_user_lambda4574(Arg4573) {
  if (Arg4573.length < 2) return [shen_type_func, shen_user_lambda4574, 2, Arg4573];
  var Arg4573_0 = Arg4573[0], Arg4573_1 = Arg4573[1];
  return ((shenjs_empty$question$(Arg4573_1))
  ? []
  : ((shenjs_is_type(Arg4573_1, shen_type_cons))
  ? ((shenjs_call(Arg4573_0, [Arg4573_1[1]]))
  ? [shen_type_cons, Arg4573_1[1], shenjs_call(shen_collect, [Arg4573_0, Arg4573_1[2]])]
  : (function() {
  return shenjs_call_tail(shen_collect, [Arg4573_0, Arg4573_1[2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-collect"]]);})))},
  2,
  [],
  "shen-collect"];
shenjs_functions["shen_shen-collect"] = shen_collect;






shen_same$_predicate$question$ = [shen_type_func,
  function shen_user_lambda4576(Arg4575) {
  if (Arg4575.length < 2) return [shen_type_func, shen_user_lambda4576, 2, Arg4575];
  var Arg4575_0 = Arg4575[0], Arg4575_1 = Arg4575[1];
  return (((shenjs_is_type(Arg4575_0, shen_type_cons) && (shenjs_is_type(Arg4575_0[1], shen_type_cons) && (shenjs_is_type(Arg4575_1, shen_type_cons) && shenjs_is_type(Arg4575_1[1], shen_type_cons)))))
  ? shenjs_$eq$(Arg4575_0[1][1], Arg4575_1[1][1])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-same_predicate?"]]);}))},
  2,
  [],
  "shen-same_predicate?"];
shenjs_functions["shen_shen-same_predicate?"] = shen_same$_predicate$question$;






shen_compile$_prolog$_procedure = [shen_type_func,
  function shen_user_lambda4578(Arg4577) {
  if (Arg4577.length < 1) return [shen_type_func, shen_user_lambda4578, 1, Arg4577];
  var Arg4577_0 = Arg4577[0];
  var R0;
  return ((R0 = shenjs_call(shen_procedure$_name, [Arg4577_0])),
  (R0 = shenjs_call(shen_clauses_to_shen, [R0, Arg4577_0])),
  R0)},
  1,
  [],
  "shen-compile_prolog_procedure"];
shenjs_functions["shen_shen-compile_prolog_procedure"] = shen_compile$_prolog$_procedure;






shen_procedure$_name = [shen_type_func,
  function shen_user_lambda4580(Arg4579) {
  if (Arg4579.length < 1) return [shen_type_func, shen_user_lambda4580, 1, Arg4579];
  var Arg4579_0 = Arg4579[0];
  return (((shenjs_is_type(Arg4579_0, shen_type_cons) && (shenjs_is_type(Arg4579_0[1], shen_type_cons) && shenjs_is_type(Arg4579_0[1][1], shen_type_cons))))
  ? Arg4579_0[1][1][1]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-procedure_name"]]);}))},
  1,
  [],
  "shen-procedure_name"];
shenjs_functions["shen_shen-procedure_name"] = shen_procedure$_name;






shen_clauses_to_shen = [shen_type_func,
  function shen_user_lambda4582(Arg4581) {
  if (Arg4581.length < 2) return [shen_type_func, shen_user_lambda4582, 2, Arg4581];
  var Arg4581_0 = Arg4581[0], Arg4581_1 = Arg4581[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4584(Arg4583) {
  if (Arg4583.length < 1) return [shen_type_func, shen_user_lambda4584, 1, Arg4583];
  var Arg4583_0 = Arg4583[0];
  return (function() {
  return shenjs_call_tail(shen_linearise_clause, [Arg4583_0]);})},
  1,
  []], Arg4581_1])),
  (R1 = shenjs_call(shen_prolog_aritycheck, [Arg4581_0, shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4586(Arg4585) {
  if (Arg4585.length < 1) return [shen_type_func, shen_user_lambda4586, 1, Arg4585];
  var Arg4585_0 = Arg4585[0];
  return (function() {
  return shenjs_call_tail(shen_head, [Arg4585_0]);})},
  1,
  []], Arg4581_1])])),
  (R1 = shenjs_call(shen_parameters, [R1])),
  (R0 = shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4588(Arg4587) {
  if (Arg4587.length < 2) return [shen_type_func, shen_user_lambda4588, 2, Arg4587];
  var Arg4587_0 = Arg4587[0], Arg4587_1 = Arg4587[1];
  return (function() {
  return shenjs_call_tail(shen_aum, [Arg4587_1, Arg4587_0]);})},
  2,
  [R1]], R0])),
  (R0 = shenjs_call(shen_catch_cut, [shenjs_call(shen_nest_disjunct, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4590(Arg4589) {
  if (Arg4589.length < 1) return [shen_type_func, shen_user_lambda4590, 1, Arg4589];
  var Arg4589_0 = Arg4589[0];
  return (function() {
  return shenjs_call_tail(shen_aum$_to$_shen, [Arg4589_0]);})},
  1,
  []], R0])])])),
  (R1 = [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg4581_0, shenjs_call(shen_append, [R1, shenjs_call(shen_append, [[shen_type_cons, [shen_type_symbol, "ProcessN"], [shen_type_cons, [shen_type_symbol, "Continuation"], []]], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, R0, []]]])])]]),
  R1)},
  2,
  [],
  "shen-clauses-to-shen"];
shenjs_functions["shen_shen-clauses-to-shen"] = shen_clauses_to_shen;






shen_catch_cut = [shen_type_func,
  function shen_user_lambda4592(Arg4591) {
  if (Arg4591.length < 1) return [shen_type_func, shen_user_lambda4592, 1, Arg4591];
  var Arg4591_0 = Arg4591[0];
  return (((!shenjs_call(shen_occurs$question$, [[shen_type_symbol, "cut"], Arg4591_0])))
  ? Arg4591_0
  : [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Throwcontrol"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-catchpoint"], []], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-cutpoint"], [shen_type_cons, [shen_type_symbol, "Throwcontrol"], [shen_type_cons, Arg4591_0, []]]], []]]]])},
  1,
  [],
  "shen-catch-cut"];
shenjs_functions["shen_shen-catch-cut"] = shen_catch_cut;






shen_catchpoint = [shen_type_func,
  function shen_user_lambda4594(Arg4593) {
  if (Arg4593.length < 0) return [shen_type_func, shen_user_lambda4594, 0, Arg4593];
  return (shenjs_globals["shen_shen-*catch*"] = (1 + (shenjs_globals["shen_shen-*catch*"])))},
  0,
  [],
  "shen-catchpoint"];
shenjs_functions["shen_shen-catchpoint"] = shen_catchpoint;






shen_cutpoint = [shen_type_func,
  function shen_user_lambda4596(Arg4595) {
  if (Arg4595.length < 2) return [shen_type_func, shen_user_lambda4596, 2, Arg4595];
  var Arg4595_0 = Arg4595[0], Arg4595_1 = Arg4595[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4595_1, Arg4595_0)))
  ? false
  : Arg4595_1)},
  2,
  [],
  "shen-cutpoint"];
shenjs_functions["shen_shen-cutpoint"] = shen_cutpoint;






shen_nest_disjunct = [shen_type_func,
  function shen_user_lambda4598(Arg4597) {
  if (Arg4597.length < 1) return [shen_type_func, shen_user_lambda4598, 1, Arg4597];
  var Arg4597_0 = Arg4597[0];
  return (((shenjs_is_type(Arg4597_0, shen_type_cons) && shenjs_empty$question$(Arg4597_0[2])))
  ? Arg4597_0[1]
  : ((shenjs_is_type(Arg4597_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_lisp_or, [Arg4597_0[1], shenjs_call(shen_nest_disjunct, [Arg4597_0[2]])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-nest-disjunct"]]);})))},
  1,
  [],
  "shen-nest-disjunct"];
shenjs_functions["shen_shen-nest-disjunct"] = shen_nest_disjunct;






shen_lisp_or = [shen_type_func,
  function shen_user_lambda4600(Arg4599) {
  if (Arg4599.length < 2) return [shen_type_func, shen_user_lambda4600, 2, Arg4599];
  var Arg4599_0 = Arg4599[0], Arg4599_1 = Arg4599[1];
  return [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Case"], [shen_type_cons, Arg4599_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, "Case"], [shen_type_cons, false, []]]], [shen_type_cons, Arg4599_1, [shen_type_cons, [shen_type_symbol, "Case"], []]]]], []]]]]},
  2,
  [],
  "shen-lisp-or"];
shenjs_functions["shen_shen-lisp-or"] = shen_lisp_or;






shen_prolog_aritycheck = [shen_type_func,
  function shen_user_lambda4602(Arg4601) {
  if (Arg4601.length < 2) return [shen_type_func, shen_user_lambda4602, 2, Arg4601];
  var Arg4601_0 = Arg4601[0], Arg4601_1 = Arg4601[1];
  return (((shenjs_is_type(Arg4601_1, shen_type_cons) && shenjs_empty$question$(Arg4601_1[2])))
  ? (shenjs_call(shen_length, [Arg4601_1[1]]) - 1)
  : (((shenjs_is_type(Arg4601_1, shen_type_cons) && shenjs_is_type(Arg4601_1[2], shen_type_cons)))
  ? ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_length, [Arg4601_1[1]]), shenjs_call(shen_length, [Arg4601_1[2][1]]))))
  ? (function() {
  return shenjs_call_tail(shen_prolog_aritycheck, [Arg4601_0, Arg4601_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_interror, ["arity error in prolog procedure ~A~%", [shen_tuple, [shen_type_cons, Arg4601_0, []], []]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-prolog-aritycheck"]]);})))},
  2,
  [],
  "shen-prolog-aritycheck"];
shenjs_functions["shen_shen-prolog-aritycheck"] = shen_prolog_aritycheck;






shen_linearise_clause = [shen_type_func,
  function shen_user_lambda4604(Arg4603) {
  if (Arg4603.length < 1) return [shen_type_func, shen_user_lambda4604, 1, Arg4603];
  var Arg4603_0 = Arg4603[0];
  var R0;
  return (((shenjs_is_type(Arg4603_0, shen_type_cons) && (shenjs_is_type(Arg4603_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg4603_0[2][1])) && (shenjs_is_type(Arg4603_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4603_0[2][2][2]))))))
  ? ((R0 = shenjs_call(shen_linearise, [[shen_type_cons, Arg4603_0[1], Arg4603_0[2][2]]])),
  (function() {
  return shenjs_call_tail(shen_clause$_form, [R0]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-linearise-clause"]]);}))},
  1,
  [],
  "shen-linearise-clause"];
shenjs_functions["shen_shen-linearise-clause"] = shen_linearise_clause;






shen_clause$_form = [shen_type_func,
  function shen_user_lambda4606(Arg4605) {
  if (Arg4605.length < 1) return [shen_type_func, shen_user_lambda4606, 1, Arg4605];
  var Arg4605_0 = Arg4605[0];
  return (((shenjs_is_type(Arg4605_0, shen_type_cons) && (shenjs_is_type(Arg4605_0[2], shen_type_cons) && shenjs_empty$question$(Arg4605_0[2][2]))))
  ? [shen_type_cons, shenjs_call(shen_explicit$_modes, [Arg4605_0[1]]), [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, shenjs_call(shen_cf$_help, [Arg4605_0[2][1]]), []]]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-clause_form"]]);}))},
  1,
  [],
  "shen-clause_form"];
shenjs_functions["shen_shen-clause_form"] = shen_clause$_form;






shen_explicit$_modes = [shen_type_func,
  function shen_user_lambda4608(Arg4607) {
  if (Arg4607.length < 1) return [shen_type_func, shen_user_lambda4608, 1, Arg4607];
  var Arg4607_0 = Arg4607[0];
  return ((shenjs_is_type(Arg4607_0, shen_type_cons))
  ? [shen_type_cons, Arg4607_0[1], shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4610(Arg4609) {
  if (Arg4609.length < 1) return [shen_type_func, shen_user_lambda4610, 1, Arg4609];
  var Arg4609_0 = Arg4609[0];
  return (function() {
  return shenjs_call_tail(shen_em$_help, [Arg4609_0]);})},
  1,
  []], Arg4607_0[2]])]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-explicit_modes"]]);}))},
  1,
  [],
  "shen-explicit_modes"];
shenjs_functions["shen_shen-explicit_modes"] = shen_explicit$_modes;






shen_em$_help = [shen_type_func,
  function shen_user_lambda4612(Arg4611) {
  if (Arg4611.length < 1) return [shen_type_func, shen_user_lambda4612, 1, Arg4611];
  var Arg4611_0 = Arg4611[0];
  return (((shenjs_is_type(Arg4611_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4611_0[1])) && (shenjs_is_type(Arg4611_0[2], shen_type_cons) && (shenjs_is_type(Arg4611_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4611_0[2][2][2]))))))
  ? Arg4611_0
  : [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, Arg4611_0, [shen_type_cons, [shen_type_symbol, "+"], []]]])},
  1,
  [],
  "shen-em_help"];
shenjs_functions["shen_shen-em_help"] = shen_em$_help;






shen_cf$_help = [shen_type_func,
  function shen_user_lambda4614(Arg4613) {
  if (Arg4613.length < 1) return [shen_type_func, shen_user_lambda4614, 1, Arg4613];
  var Arg4613_0 = Arg4613[0];
  return (((shenjs_is_type(Arg4613_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "where"], Arg4613_0[1])) && (shenjs_is_type(Arg4613_0[2], shen_type_cons) && (shenjs_is_type(Arg4613_0[2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "="], Arg4613_0[2][1][1])) && (shenjs_is_type(Arg4613_0[2][1][2], shen_type_cons) && (shenjs_is_type(Arg4613_0[2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4613_0[2][1][2][2][2]) && (shenjs_is_type(Arg4613_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4613_0[2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_cons, (((shenjs_globals["shen_shen-*occurs*"]))
  ? [shen_type_symbol, "unify!"]
  : [shen_type_symbol, "unify"]), Arg4613_0[2][1][2]], shenjs_call(shen_cf$_help, [Arg4613_0[2][2][1]])]
  : Arg4613_0)},
  1,
  [],
  "shen-cf_help"];
shenjs_functions["shen_shen-cf_help"] = shen_cf$_help;






shen_occurs_check = [shen_type_func,
  function shen_user_lambda4616(Arg4615) {
  if (Arg4615.length < 1) return [shen_type_func, shen_user_lambda4616, 1, Arg4615];
  var Arg4615_0 = Arg4615[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4615_0)))
  ? (shenjs_globals["shen_shen-*occurs*"] = true)
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4615_0)))
  ? (shenjs_globals["shen_shen-*occurs*"] = false)
  : (function() {
  return shenjs_call_tail(shen_interror, ["occurs-check expects + or -~%", []]);})))},
  1,
  [],
  "occurs-check"];
shenjs_functions["shen_occurs-check"] = shen_occurs_check;






shen_aum = [shen_type_func,
  function shen_user_lambda4618(Arg4617) {
  if (Arg4617.length < 2) return [shen_type_func, shen_user_lambda4618, 2, Arg4617];
  var Arg4617_0 = Arg4617[0], Arg4617_1 = Arg4617[1];
  var R0;
  return (((shenjs_is_type(Arg4617_0, shen_type_cons) && (shenjs_is_type(Arg4617_0[1], shen_type_cons) && (shenjs_is_type(Arg4617_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":-"], Arg4617_0[2][1])) && (shenjs_is_type(Arg4617_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4617_0[2][2][2])))))))
  ? ((R0 = shenjs_call(shen_make$_mu$_application, [[shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4617_0[1][2], [shen_type_cons, shenjs_call(shen_continuation$_call, [Arg4617_0[1][2], Arg4617_0[2][2][1]]), []]]], Arg4617_1])),
  (function() {
  return shenjs_call_tail(shen_mu$_reduction, [R0, [shen_type_symbol, "+"]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-aum"]]);}))},
  2,
  [],
  "shen-aum"];
shenjs_functions["shen_shen-aum"] = shen_aum;






shen_continuation$_call = [shen_type_func,
  function shen_user_lambda4620(Arg4619) {
  if (Arg4619.length < 2) return [shen_type_func, shen_user_lambda4620, 2, Arg4619];
  var Arg4619_0 = Arg4619[0], Arg4619_1 = Arg4619[1];
  var R0, R1;
  return ((R0 = [shen_type_cons, [shen_type_symbol, "ProcessN"], shenjs_call(shen_extract$_vars, [Arg4619_0])]),
  (R1 = shenjs_call(shen_extract$_vars, [Arg4619_1])),
  (R1 = shenjs_call(shen_remove, [[shen_type_symbol, "Throwcontrol"], shenjs_call(shen_difference, [R1, R0])])),
  (function() {
  return shenjs_call_tail(shen_cc$_help, [R1, Arg4619_1]);}))},
  2,
  [],
  "shen-continuation_call"];
shenjs_functions["shen_shen-continuation_call"] = shen_continuation$_call;






shen_remove = [shen_type_func,
  function shen_user_lambda4622(Arg4621) {
  if (Arg4621.length < 2) return [shen_type_func, shen_user_lambda4622, 2, Arg4621];
  var Arg4621_0 = Arg4621[0], Arg4621_1 = Arg4621[1];
  return (function() {
  return shenjs_call_tail(shen_remove_h, [Arg4621_0, Arg4621_1, []]);})},
  2,
  [],
  "remove"];
shenjs_functions["shen_remove"] = shen_remove;






shen_remove_h = [shen_type_func,
  function shen_user_lambda4624(Arg4623) {
  if (Arg4623.length < 3) return [shen_type_func, shen_user_lambda4624, 3, Arg4623];
  var Arg4623_0 = Arg4623[0], Arg4623_1 = Arg4623[1], Arg4623_2 = Arg4623[2];
  return ((shenjs_empty$question$(Arg4623_1))
  ? (function() {
  return shenjs_call_tail(shen_reverse, [Arg4623_2]);})
  : (((shenjs_is_type(Arg4623_1, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg4623_1[1], Arg4623_0))))
  ? (function() {
  return shenjs_call_tail(shen_remove_h, [Arg4623_1[1], Arg4623_1[2], Arg4623_2]);})
  : ((shenjs_is_type(Arg4623_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_remove_h, [Arg4623_0, Arg4623_1[2], [shen_type_cons, Arg4623_1[1], Arg4623_2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-remove-h"]]);}))))},
  3,
  [],
  "shen-remove-h"];
shenjs_functions["shen_shen-remove-h"] = shen_remove_h;






shen_cc$_help = [shen_type_func,
  function shen_user_lambda4626(Arg4625) {
  if (Arg4625.length < 2) return [shen_type_func, shen_user_lambda4626, 2, Arg4625];
  var Arg4625_0 = Arg4625[0], Arg4625_1 = Arg4625[1];
  return (((shenjs_empty$question$(Arg4625_0) && shenjs_empty$question$(Arg4625_1)))
  ? [shen_type_cons, [shen_type_symbol, "shen-pop"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-stack"], []]]]
  : ((shenjs_empty$question$(Arg4625_1))
  ? [shen_type_cons, [shen_type_symbol, "shen-rename"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-variables"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, Arg4625_0, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-pop"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-stack"], []]]], []]]]]]]]]
  : ((shenjs_empty$question$(Arg4625_0))
  ? [shen_type_cons, [shen_type_symbol, "call"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-continuation"], [shen_type_cons, Arg4625_1, []]]]]
  : [shen_type_cons, [shen_type_symbol, "shen-rename"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-variables"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, Arg4625_0, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "call"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-continuation"], [shen_type_cons, Arg4625_1, []]]]], []]]]]]]]])))},
  2,
  [],
  "shen-cc_help"];
shenjs_functions["shen_shen-cc_help"] = shen_cc$_help;






shen_make$_mu$_application = [shen_type_func,
  function shen_user_lambda4628(Arg4627) {
  if (Arg4627.length < 2) return [shen_type_func, shen_user_lambda4628, 2, Arg4627];
  var Arg4627_0 = Arg4627[0], Arg4627_1 = Arg4627[1];
  return (((shenjs_is_type(Arg4627_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4627_0[1])) && (shenjs_is_type(Arg4627_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4627_0[2][1]) && (shenjs_is_type(Arg4627_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4627_0[2][2][2]) && shenjs_empty$question$(Arg4627_1))))))))
  ? Arg4627_0[2][2][1]
  : (((shenjs_is_type(Arg4627_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4627_0[1])) && (shenjs_is_type(Arg4627_0[2], shen_type_cons) && (shenjs_is_type(Arg4627_0[2][1], shen_type_cons) && (shenjs_is_type(Arg4627_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4627_0[2][2][2]) && shenjs_is_type(Arg4627_1, shen_type_cons))))))))
  ? [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4627_0[2][1][1], [shen_type_cons, shenjs_call(shen_make$_mu$_application, [[shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4627_0[2][1][2], Arg4627_0[2][2]]], Arg4627_1[2]]), []]]], [shen_type_cons, Arg4627_1[1], []]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-make_mu_application"]]);})))},
  2,
  [],
  "shen-make_mu_application"];
shenjs_functions["shen_shen-make_mu_application"] = shen_make$_mu$_application;






shen_mu$_reduction = [shen_type_func,
  function shen_user_lambda4630(Arg4629) {
  if (Arg4629.length < 2) return [shen_type_func, shen_user_lambda4630, 2, Arg4629];
  var Arg4629_0 = Arg4629[0], Arg4629_1 = Arg4629[1];
  var R0;
  return (((shenjs_is_type(Arg4629_0, shen_type_cons) && (shenjs_is_type(Arg4629_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4629_0[1][1])) && (shenjs_is_type(Arg4629_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4629_0[1][2][1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4629_0[1][2][1][1])) && (shenjs_is_type(Arg4629_0[1][2][1][2], shen_type_cons) && (shenjs_is_type(Arg4629_0[1][2][1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4629_0[1][2][1][2][2][2]) && (shenjs_is_type(Arg4629_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4629_0[1][2][2][2]) && (shenjs_is_type(Arg4629_0[2], shen_type_cons) && shenjs_empty$question$(Arg4629_0[2][2]))))))))))))))
  ? (function() {
  return shenjs_call_tail(shen_mu$_reduction, [[shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4629_0[1][2][1][2][1], Arg4629_0[1][2][2]]], Arg4629_0[2]], Arg4629_0[1][2][1][2][2][1]]);})
  : (((shenjs_is_type(Arg4629_0, shen_type_cons) && (shenjs_is_type(Arg4629_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4629_0[1][1])) && (shenjs_is_type(Arg4629_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4629_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4629_0[1][2][2][2]) && (shenjs_is_type(Arg4629_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4629_0[2][2]) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "_"], Arg4629_0[1][2][1])))))))))))
  ? (function() {
  return shenjs_call_tail(shen_mu$_reduction, [Arg4629_0[1][2][2][1], Arg4629_1]);})
  : (((shenjs_is_type(Arg4629_0, shen_type_cons) && (shenjs_is_type(Arg4629_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4629_0[1][1])) && (shenjs_is_type(Arg4629_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4629_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4629_0[1][2][2][2]) && (shenjs_is_type(Arg4629_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4629_0[2][2]) && shenjs_call(shen_ephemeral$_variable$question$, [Arg4629_0[1][2][1], Arg4629_0[2][1]]))))))))))
  ? (function() {
  return shenjs_call_tail(shen_subst, [Arg4629_0[2][1], Arg4629_0[1][2][1], shenjs_call(shen_mu$_reduction, [Arg4629_0[1][2][2][1], Arg4629_1])]);})
  : (((shenjs_is_type(Arg4629_0, shen_type_cons) && (shenjs_is_type(Arg4629_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4629_0[1][1])) && (shenjs_is_type(Arg4629_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4629_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4629_0[1][2][2][2]) && (shenjs_is_type(Arg4629_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4629_0[2][2]) && shenjs_call(shen_variable$question$, [Arg4629_0[1][2][1]]))))))))))
  ? [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, Arg4629_0[1][2][1], [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, Arg4629_0[2][1], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg4629_0[1][2][2][1], Arg4629_1]), []]]]]]]
  : (((shenjs_is_type(Arg4629_0, shen_type_cons) && (shenjs_is_type(Arg4629_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4629_0[1][1])) && (shenjs_is_type(Arg4629_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4629_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4629_0[1][2][2][2]) && (shenjs_is_type(Arg4629_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4629_0[2][2]) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4629_1)) && shenjs_call(shen_prolog$_constant$question$, [Arg4629_0[1][2][1]])))))))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-result"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, [shen_type_symbol, "shen-dereferencing"], Arg4629_0[2]]]]], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "identical"], [shen_type_cons, [shen_type_symbol, "shen-to"], [shen_type_cons, Arg4629_0[1][2][1], []]]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg4629_0[1][2][2][1], [shen_type_symbol, "-"]]), [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, shen_fail_obj, []]]]]]], []]]]]]])
  : (((shenjs_is_type(Arg4629_0, shen_type_cons) && (shenjs_is_type(Arg4629_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4629_0[1][1])) && (shenjs_is_type(Arg4629_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4629_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4629_0[1][2][2][2]) && (shenjs_is_type(Arg4629_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4629_0[2][2]) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4629_1)) && shenjs_call(shen_prolog$_constant$question$, [Arg4629_0[1][2][1]])))))))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-result"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, [shen_type_symbol, "shen-dereferencing"], Arg4629_0[2]]]]], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "identical"], [shen_type_cons, [shen_type_symbol, "shen-to"], [shen_type_cons, Arg4629_0[1][2][1], []]]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg4629_0[1][2][2][1], [shen_type_symbol, "+"]]), [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "shen-a"], [shen_type_cons, [shen_type_symbol, "shen-variable"], []]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-to"], [shen_type_cons, Arg4629_0[1][2][1], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg4629_0[1][2][2][1], [shen_type_symbol, "+"]]), []]]]]]], [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, shen_fail_obj, []]]]]]], []]]]]]], []]]]]]])
  : (((shenjs_is_type(Arg4629_0, shen_type_cons) && (shenjs_is_type(Arg4629_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4629_0[1][1])) && (shenjs_is_type(Arg4629_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4629_0[1][2][1], shen_type_cons) && (shenjs_is_type(Arg4629_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4629_0[1][2][2][2]) && (shenjs_is_type(Arg4629_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4629_0[2][2]) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4629_1))))))))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-result"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, [shen_type_symbol, "shen-dereferencing"], Arg4629_0[2]]]]], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "shen-a"], [shen_type_cons, [shen_type_symbol, "shen-non-empty"], [shen_type_cons, [shen_type_symbol, "list"], []]]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [[shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4629_0[1][2][1][1], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4629_0[1][2][1][2], Arg4629_0[1][2][2]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "tail"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, R0, []]]]], []]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "head"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, R0, []]]]], []]], [shen_type_symbol, "-"]]), [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, shen_fail_obj, []]]]]]], []]]]]]])
  : (((shenjs_is_type(Arg4629_0, shen_type_cons) && (shenjs_is_type(Arg4629_0[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-mu"], Arg4629_0[1][1])) && (shenjs_is_type(Arg4629_0[1][2], shen_type_cons) && (shenjs_is_type(Arg4629_0[1][2][1], shen_type_cons) && (shenjs_is_type(Arg4629_0[1][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4629_0[1][2][2][2]) && (shenjs_is_type(Arg4629_0[2], shen_type_cons) && (shenjs_empty$question$(Arg4629_0[2][2]) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4629_1))))))))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-be"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-result"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, [shen_type_symbol, "shen-dereferencing"], Arg4629_0[2]]]]], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "shen-a"], [shen_type_cons, [shen_type_symbol, "shen-non-empty"], [shen_type_cons, [shen_type_symbol, "list"], []]]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [[shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4629_0[1][2][1][1], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-mu"], [shen_type_cons, Arg4629_0[1][2][1][2], Arg4629_0[1][2][2]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "tail"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, R0, []]]]], []]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "head"], [shen_type_cons, [shen_type_symbol, "shen-of"], [shen_type_cons, R0, []]]]], []]], [shen_type_symbol, "+"]]), [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "shen-a"], [shen_type_cons, [shen_type_symbol, "shen-variable"], []]]]], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-rename"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-variables"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, shenjs_call(shen_extract$_vars, [Arg4629_0[1][2][1]]), [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "shen-then"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, R0, [shen_type_cons, [shen_type_symbol, "shen-to"], [shen_type_cons, shenjs_call(shen_rcons$_form, [shenjs_call(shen_remove$_modes, [Arg4629_0[1][2][1]])]), [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, shenjs_call(shen_mu$_reduction, [Arg4629_0[1][2][2][1], [shen_type_symbol, "+"]]), []]]]]]], []]]]]]]]], [shen_type_cons, [shen_type_symbol, "shen-else"], [shen_type_cons, shen_fail_obj, []]]]]]], []]]]]]], []]]]]]])
  : Arg4629_0))))))))},
  2,
  [],
  "shen-mu_reduction"];
shenjs_functions["shen_shen-mu_reduction"] = shen_mu$_reduction;






shen_rcons$_form = [shen_type_func,
  function shen_user_lambda4632(Arg4631) {
  if (Arg4631.length < 1) return [shen_type_func, shen_user_lambda4632, 1, Arg4631];
  var Arg4631_0 = Arg4631[0];
  return ((shenjs_is_type(Arg4631_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg4631_0[1]]), [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg4631_0[2]]), []]]]
  : Arg4631_0)},
  1,
  [],
  "shen-rcons_form"];
shenjs_functions["shen_shen-rcons_form"] = shen_rcons$_form;






shen_remove$_modes = [shen_type_func,
  function shen_user_lambda4634(Arg4633) {
  if (Arg4633.length < 1) return [shen_type_func, shen_user_lambda4634, 1, Arg4633];
  var Arg4633_0 = Arg4633[0];
  return (((shenjs_is_type(Arg4633_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4633_0[1])) && (shenjs_is_type(Arg4633_0[2], shen_type_cons) && (shenjs_is_type(Arg4633_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg4633_0[2][2][1])) && shenjs_empty$question$(Arg4633_0[2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(shen_remove$_modes, [Arg4633_0[2][1]]);})
  : (((shenjs_is_type(Arg4633_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "mode"], Arg4633_0[1])) && (shenjs_is_type(Arg4633_0[2], shen_type_cons) && (shenjs_is_type(Arg4633_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg4633_0[2][2][1])) && shenjs_empty$question$(Arg4633_0[2][2][2])))))))
  ? (function() {
  return shenjs_call_tail(shen_remove$_modes, [Arg4633_0[2][1]]);})
  : ((shenjs_is_type(Arg4633_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_remove$_modes, [Arg4633_0[1]]), shenjs_call(shen_remove$_modes, [Arg4633_0[2]])]
  : Arg4633_0)))},
  1,
  [],
  "shen-remove_modes"];
shenjs_functions["shen_shen-remove_modes"] = shen_remove$_modes;






shen_ephemeral$_variable$question$ = [shen_type_func,
  function shen_user_lambda4636(Arg4635) {
  if (Arg4635.length < 2) return [shen_type_func, shen_user_lambda4636, 2, Arg4635];
  var Arg4635_0 = Arg4635[0], Arg4635_1 = Arg4635[1];
  return (shenjs_call(shen_variable$question$, [Arg4635_0]) && shenjs_call(shen_variable$question$, [Arg4635_1]))},
  2,
  [],
  "shen-ephemeral_variable?"];
shenjs_functions["shen_shen-ephemeral_variable?"] = shen_ephemeral$_variable$question$;






shen_prolog$_constant$question$ = [shen_type_func,
  function shen_user_lambda4638(Arg4637) {
  if (Arg4637.length < 1) return [shen_type_func, shen_user_lambda4638, 1, Arg4637];
  var Arg4637_0 = Arg4637[0];
  return ((shenjs_is_type(Arg4637_0, shen_type_cons))
  ? false
  : true)},
  1,
  [],
  "shen-prolog_constant?"];
shenjs_functions["shen_shen-prolog_constant?"] = shen_prolog$_constant$question$;






shen_aum$_to$_shen = [shen_type_func,
  function shen_user_lambda4640(Arg4639) {
  if (Arg4639.length < 1) return [shen_type_func, shen_user_lambda4640, 1, Arg4639];
  var Arg4639_0 = Arg4639[0];
  return (((shenjs_is_type(Arg4639_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg4639_0[1])) && (shenjs_is_type(Arg4639_0[2], shen_type_cons) && (shenjs_is_type(Arg4639_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-be"], Arg4639_0[2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2], shen_type_cons) && (shenjs_is_type(Arg4639_0[2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "in"], Arg4639_0[2][2][2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4639_0[2][2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, Arg4639_0[2][1], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4639_0[2][2][2][1]]), [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4639_0[2][2][2][2][2][1]]), []]]]]
  : (((shenjs_is_type(Arg4639_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4639_0[1])) && (shenjs_is_type(Arg4639_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-result"], Arg4639_0[2][1])) && (shenjs_is_type(Arg4639_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-of"], Arg4639_0[2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-dereferencing"], Arg4639_0[2][2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4639_0[2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "shen-lazyderef"], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4639_0[2][2][2][2][1]]), [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]]
  : (((shenjs_is_type(Arg4639_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "if"], Arg4639_0[1])) && (shenjs_is_type(Arg4639_0[2], shen_type_cons) && (shenjs_is_type(Arg4639_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-then"], Arg4639_0[2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2], shen_type_cons) && (shenjs_is_type(Arg4639_0[2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-else"], Arg4639_0[2][2][2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4639_0[2][2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4639_0[2][1]]), [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4639_0[2][2][2][1]]), [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4639_0[2][2][2][2][2][1]]), []]]]]
  : (((shenjs_is_type(Arg4639_0, shen_type_cons) && (shenjs_is_type(Arg4639_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "is"], Arg4639_0[2][1])) && (shenjs_is_type(Arg4639_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-a"], Arg4639_0[2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-variable"], Arg4639_0[2][2][2][1])) && shenjs_empty$question$(Arg4639_0[2][2][2][2])))))))))
  ? [shen_type_cons, [shen_type_symbol, "shen-pvar?"], [shen_type_cons, Arg4639_0[1], []]]
  : (((shenjs_is_type(Arg4639_0, shen_type_cons) && (shenjs_is_type(Arg4639_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "is"], Arg4639_0[2][1])) && (shenjs_is_type(Arg4639_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-a"], Arg4639_0[2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-non-empty"], Arg4639_0[2][2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "list"], Arg4639_0[2][2][2][2][1])) && shenjs_empty$question$(Arg4639_0[2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, Arg4639_0[1], []]]
  : (((shenjs_is_type(Arg4639_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-rename"], Arg4639_0[1])) && (shenjs_is_type(Arg4639_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4639_0[2][1])) && (shenjs_is_type(Arg4639_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-variables"], Arg4639_0[2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "in"], Arg4639_0[2][2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2][2], shen_type_cons) && (shenjs_empty$question$(Arg4639_0[2][2][2][2][1]) && (shenjs_is_type(Arg4639_0[2][2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "and"], Arg4639_0[2][2][2][2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-then"], Arg4639_0[2][2][2][2][2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4639_0[2][2][2][2][2][2][2][2])))))))))))))))))
  ? (function() {
  return shenjs_call_tail(shen_aum$_to$_shen, [Arg4639_0[2][2][2][2][2][2][2][1]]);})
  : (((shenjs_is_type(Arg4639_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-rename"], Arg4639_0[1])) && (shenjs_is_type(Arg4639_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4639_0[2][1])) && (shenjs_is_type(Arg4639_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-variables"], Arg4639_0[2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "in"], Arg4639_0[2][2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2][2], shen_type_cons) && (shenjs_is_type(Arg4639_0[2][2][2][2][1], shen_type_cons) && (shenjs_is_type(Arg4639_0[2][2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "and"], Arg4639_0[2][2][2][2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-then"], Arg4639_0[2][2][2][2][2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4639_0[2][2][2][2][2][2][2][2])))))))))))))))))
  ? [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, Arg4639_0[2][2][2][2][1][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-newpv"], [shen_type_cons, [shen_type_symbol, "ProcessN"], []]], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [[shen_type_cons, [shen_type_symbol, "shen-rename"], [shen_type_cons, [shen_type_symbol, "shen-the"], [shen_type_cons, [shen_type_symbol, "shen-variables"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, Arg4639_0[2][2][2][2][1][2], Arg4639_0[2][2][2][2][2]]]]]]]), []]]]]
  : (((shenjs_is_type(Arg4639_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "bind"], Arg4639_0[1])) && (shenjs_is_type(Arg4639_0[2], shen_type_cons) && (shenjs_is_type(Arg4639_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-to"], Arg4639_0[2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2], shen_type_cons) && (shenjs_is_type(Arg4639_0[2][2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "in"], Arg4639_0[2][2][2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4639_0[2][2][2][2][2][2])))))))))))
  ? [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-bindv"], [shen_type_cons, Arg4639_0[2][1], [shen_type_cons, shenjs_call(shen_chwild, [Arg4639_0[2][2][2][1]]), [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, shenjs_call(shen_aum$_to$_shen, [Arg4639_0[2][2][2][2][2][1]]), [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-unbindv"], [shen_type_cons, Arg4639_0[2][1], [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]], [shen_type_cons, [shen_type_symbol, "Result"], []]]], []]]]], []]]]
  : (((shenjs_is_type(Arg4639_0, shen_type_cons) && (shenjs_is_type(Arg4639_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "is"], Arg4639_0[2][1])) && (shenjs_is_type(Arg4639_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "identical"], Arg4639_0[2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-to"], Arg4639_0[2][2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4639_0[2][2][2][2][2]))))))))))
  ? [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, Arg4639_0[2][2][2][2][1], [shen_type_cons, Arg4639_0[1], []]]]
  : ((shenjs_unwind_tail(shenjs_$eq$(Arg4639_0, shen_fail_obj)))
  ? false
  : (((shenjs_is_type(Arg4639_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4639_0[1])) && (shenjs_is_type(Arg4639_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "head"], Arg4639_0[2][1])) && (shenjs_is_type(Arg4639_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-of"], Arg4639_0[2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4639_0[2][2][2][2])))))))))
  ? [shen_type_cons, [shen_type_symbol, "hd"], Arg4639_0[2][2][2]]
  : (((shenjs_is_type(Arg4639_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4639_0[1])) && (shenjs_is_type(Arg4639_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "tail"], Arg4639_0[2][1])) && (shenjs_is_type(Arg4639_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-of"], Arg4639_0[2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4639_0[2][2][2][2])))))))))
  ? [shen_type_cons, [shen_type_symbol, "tl"], Arg4639_0[2][2][2]]
  : (((shenjs_is_type(Arg4639_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-pop"], Arg4639_0[1])) && (shenjs_is_type(Arg4639_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4639_0[2][1])) && (shenjs_is_type(Arg4639_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-stack"], Arg4639_0[2][2][1])) && shenjs_empty$question$(Arg4639_0[2][2][2]))))))))
  ? [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-incinfs"], []], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, [shen_type_symbol, "Continuation"], []]], []]]]
  : (((shenjs_is_type(Arg4639_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "call"], Arg4639_0[1])) && (shenjs_is_type(Arg4639_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-the"], Arg4639_0[2][1])) && (shenjs_is_type(Arg4639_0[2][2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-continuation"], Arg4639_0[2][2][1])) && (shenjs_is_type(Arg4639_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4639_0[2][2][2][2])))))))))
  ? [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-incinfs"], []], [shen_type_cons, shenjs_call(shen_call$_the$_continuation, [shenjs_call(shen_chwild, [Arg4639_0[2][2][2][1]]), [shen_type_symbol, "ProcessN"], [shen_type_symbol, "Continuation"]]), []]]]
  : Arg4639_0))))))))))))))},
  1,
  [],
  "shen-aum_to_shen"];
shenjs_functions["shen_shen-aum_to_shen"] = shen_aum$_to$_shen;






shen_chwild = [shen_type_func,
  function shen_user_lambda4642(Arg4641) {
  if (Arg4641.length < 1) return [shen_type_func, shen_user_lambda4642, 1, Arg4641];
  var Arg4641_0 = Arg4641[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4641_0, [shen_type_symbol, "_"])))
  ? [shen_type_cons, [shen_type_symbol, "shen-newpv"], [shen_type_cons, [shen_type_symbol, "ProcessN"], []]]
  : ((shenjs_is_type(Arg4641_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda4644(Arg4643) {
  if (Arg4643.length < 1) return [shen_type_func, shen_user_lambda4644, 1, Arg4643];
  var Arg4643_0 = Arg4643[0];
  return (function() {
  return shenjs_call_tail(shen_chwild, [Arg4643_0]);})},
  1,
  []], Arg4641_0]);})
  : Arg4641_0))},
  1,
  [],
  "shen-chwild"];
shenjs_functions["shen_shen-chwild"] = shen_chwild;






shen_newpv = [shen_type_func,
  function shen_user_lambda4646(Arg4645) {
  if (Arg4645.length < 1) return [shen_type_func, shen_user_lambda4646, 1, Arg4645];
  var Arg4645_0 = Arg4645[0];
  var R0, R1;
  return ((R0 = (shenjs_absvector_ref((shenjs_globals["shen_shen-*varcounter*"]), Arg4645_0) + 1)),
  shenjs_absvector_set((shenjs_globals["shen_shen-*varcounter*"]), Arg4645_0, R0),
  (R1 = shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg4645_0)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shenjs_call(shen_limit, [R1]))))
  ? shenjs_call(shen_resizeprocessvector, [Arg4645_0, R0])
  : [shen_type_symbol, "shen-skip"]),
  (function() {
  return shenjs_call_tail(shen_mk_pvar, [R0]);}))},
  1,
  [],
  "shen-newpv"];
shenjs_functions["shen_shen-newpv"] = shen_newpv;






shen_resizeprocessvector = [shen_type_func,
  function shen_user_lambda4648(Arg4647) {
  if (Arg4647.length < 2) return [shen_type_func, shen_user_lambda4648, 2, Arg4647];
  var Arg4647_0 = Arg4647[0], Arg4647_1 = Arg4647[1];
  var R0;
  return ((R0 = shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg4647_0)),
  (R0 = shenjs_call(shen_resize_vector, [R0, (Arg4647_1 + Arg4647_1), [shen_type_symbol, "shen--null-"]])),
  shenjs_absvector_set((shenjs_globals["shen_shen-*prologvectors*"]), Arg4647_0, R0))},
  2,
  [],
  "shen-resizeprocessvector"];
shenjs_functions["shen_shen-resizeprocessvector"] = shen_resizeprocessvector;






shen_resize_vector = [shen_type_func,
  function shen_user_lambda4650(Arg4649) {
  if (Arg4649.length < 3) return [shen_type_func, shen_user_lambda4650, 3, Arg4649];
  var Arg4649_0 = Arg4649[0], Arg4649_1 = Arg4649[1], Arg4649_2 = Arg4649[2];
  var R0;
  return ((R0 = shenjs_absvector_set(shenjs_absvector((1 + Arg4649_1)), 0, Arg4649_1)),
  (function() {
  return shenjs_call_tail(shen_copy_vector, [Arg4649_0, R0, shenjs_call(shen_limit, [Arg4649_0]), Arg4649_1, Arg4649_2]);}))},
  3,
  [],
  "shen-resize-vector"];
shenjs_functions["shen_shen-resize-vector"] = shen_resize_vector;






shen_copy_vector = [shen_type_func,
  function shen_user_lambda4652(Arg4651) {
  if (Arg4651.length < 5) return [shen_type_func, shen_user_lambda4652, 5, Arg4651];
  var Arg4651_0 = Arg4651[0], Arg4651_1 = Arg4651[1], Arg4651_2 = Arg4651[2], Arg4651_3 = Arg4651[3], Arg4651_4 = Arg4651[4];
  return (function() {
  return shenjs_call_tail(shen_copy_vector_stage_2, [(1 + Arg4651_2), (Arg4651_3 + 1), Arg4651_4, shenjs_call(shen_copy_vector_stage_1, [1, Arg4651_0, Arg4651_1, (1 + Arg4651_2)])]);})},
  5,
  [],
  "shen-copy-vector"];
shenjs_functions["shen_shen-copy-vector"] = shen_copy_vector;






shen_copy_vector_stage_1 = [shen_type_func,
  function shen_user_lambda4654(Arg4653) {
  if (Arg4653.length < 4) return [shen_type_func, shen_user_lambda4654, 4, Arg4653];
  var Arg4653_0 = Arg4653[0], Arg4653_1 = Arg4653[1], Arg4653_2 = Arg4653[2], Arg4653_3 = Arg4653[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4653_3, Arg4653_0)))
  ? Arg4653_2
  : (function() {
  return shenjs_call_tail(shen_copy_vector_stage_1, [(1 + Arg4653_0), Arg4653_1, shenjs_absvector_set(Arg4653_2, Arg4653_0, shenjs_absvector_ref(Arg4653_1, Arg4653_0)), Arg4653_3]);}))},
  4,
  [],
  "shen-copy-vector-stage-1"];
shenjs_functions["shen_shen-copy-vector-stage-1"] = shen_copy_vector_stage_1;






shen_copy_vector_stage_2 = [shen_type_func,
  function shen_user_lambda4656(Arg4655) {
  if (Arg4655.length < 4) return [shen_type_func, shen_user_lambda4656, 4, Arg4655];
  var Arg4655_0 = Arg4655[0], Arg4655_1 = Arg4655[1], Arg4655_2 = Arg4655[2], Arg4655_3 = Arg4655[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4655_1, Arg4655_0)))
  ? Arg4655_3
  : (function() {
  return shenjs_call_tail(shen_copy_vector_stage_2, [(Arg4655_0 + 1), Arg4655_1, Arg4655_2, shenjs_absvector_set(Arg4655_3, Arg4655_0, Arg4655_2)]);}))},
  4,
  [],
  "shen-copy-vector-stage-2"];
shenjs_functions["shen_shen-copy-vector-stage-2"] = shen_copy_vector_stage_2;






shen_mk_pvar = [shen_type_func,
  function shen_user_lambda4658(Arg4657) {
  if (Arg4657.length < 1) return [shen_type_func, shen_user_lambda4658, 1, Arg4657];
  var Arg4657_0 = Arg4657[0];
  return shenjs_absvector_set(shenjs_absvector_set(shenjs_absvector(2), 0, [shen_type_symbol, "shen-pvar"]), 1, Arg4657_0)},
  1,
  [],
  "shen-mk-pvar"];
shenjs_functions["shen_shen-mk-pvar"] = shen_mk_pvar;






shen_pvar$question$ = [shen_type_func,
  function shen_user_lambda4660(Arg4659) {
  if (Arg4659.length < 1) return [shen_type_func, shen_user_lambda4660, 1, Arg4659];
  var Arg4659_0 = Arg4659[0];
  return (shenjs_absvector$question$(Arg4659_0) && shenjs_unwind_tail(shenjs_$eq$(shenjs_absvector_ref(Arg4659_0, 0), [shen_type_symbol, "shen-pvar"])))},
  1,
  [],
  "shen-pvar?"];
shenjs_functions["shen_shen-pvar?"] = shen_pvar$question$;






shen_bindv = [shen_type_func,
  function shen_user_lambda4662(Arg4661) {
  if (Arg4661.length < 3) return [shen_type_func, shen_user_lambda4662, 3, Arg4661];
  var Arg4661_0 = Arg4661[0], Arg4661_1 = Arg4661[1], Arg4661_2 = Arg4661[2];
  var R0;
  return ((R0 = shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg4661_2)),
  shenjs_absvector_set(R0, shenjs_absvector_ref(Arg4661_0, 1), Arg4661_1))},
  3,
  [],
  "shen-bindv"];
shenjs_functions["shen_shen-bindv"] = shen_bindv;






shen_unbindv = [shen_type_func,
  function shen_user_lambda4664(Arg4663) {
  if (Arg4663.length < 2) return [shen_type_func, shen_user_lambda4664, 2, Arg4663];
  var Arg4663_0 = Arg4663[0], Arg4663_1 = Arg4663[1];
  var R0;
  return ((R0 = shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg4663_1)),
  shenjs_absvector_set(R0, shenjs_absvector_ref(Arg4663_0, 1), [shen_type_symbol, "shen--null-"]))},
  2,
  [],
  "shen-unbindv"];
shenjs_functions["shen_shen-unbindv"] = shen_unbindv;






shen_incinfs = [shen_type_func,
  function shen_user_lambda4666(Arg4665) {
  if (Arg4665.length < 0) return [shen_type_func, shen_user_lambda4666, 0, Arg4665];
  return (shenjs_globals["shen_shen-*infs*"] = (1 + (shenjs_globals["shen_shen-*infs*"])))},
  0,
  [],
  "shen-incinfs"];
shenjs_functions["shen_shen-incinfs"] = shen_incinfs;






shen_call$_the$_continuation = [shen_type_func,
  function shen_user_lambda4668(Arg4667) {
  if (Arg4667.length < 3) return [shen_type_func, shen_user_lambda4668, 3, Arg4667];
  var Arg4667_0 = Arg4667[0], Arg4667_1 = Arg4667[1], Arg4667_2 = Arg4667[2];
  var R0;
  return (((shenjs_is_type(Arg4667_0, shen_type_cons) && (shenjs_is_type(Arg4667_0[1], shen_type_cons) && shenjs_empty$question$(Arg4667_0[2]))))
  ? [shen_type_cons, Arg4667_0[1][1], shenjs_call(shen_append, [Arg4667_0[1][2], [shen_type_cons, Arg4667_1, [shen_type_cons, Arg4667_2, []]]])]
  : (((shenjs_is_type(Arg4667_0, shen_type_cons) && shenjs_is_type(Arg4667_0[1], shen_type_cons)))
  ? ((R0 = shenjs_call(shen_newcontinuation, [Arg4667_0[2], Arg4667_1, Arg4667_2])),
  [shen_type_cons, Arg4667_0[1][1], shenjs_call(shen_append, [Arg4667_0[1][2], [shen_type_cons, Arg4667_1, [shen_type_cons, R0, []]]])])
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-call_the_continuation"]]);})))},
  3,
  [],
  "shen-call_the_continuation"];
shenjs_functions["shen_shen-call_the_continuation"] = shen_call$_the$_continuation;






shen_newcontinuation = [shen_type_func,
  function shen_user_lambda4670(Arg4669) {
  if (Arg4669.length < 3) return [shen_type_func, shen_user_lambda4670, 3, Arg4669];
  var Arg4669_0 = Arg4669[0], Arg4669_1 = Arg4669[1], Arg4669_2 = Arg4669[2];
  return ((shenjs_empty$question$(Arg4669_0))
  ? Arg4669_2
  : (((shenjs_is_type(Arg4669_0, shen_type_cons) && shenjs_is_type(Arg4669_0[1], shen_type_cons)))
  ? [shen_type_cons, [shen_type_symbol, "freeze"], [shen_type_cons, [shen_type_cons, Arg4669_0[1][1], shenjs_call(shen_append, [Arg4669_0[1][2], [shen_type_cons, Arg4669_1, [shen_type_cons, shenjs_call(shen_newcontinuation, [Arg4669_0[2], Arg4669_1, Arg4669_2]), []]]])], []]]
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-newcontinuation"]]);})))},
  3,
  [],
  "shen-newcontinuation"];
shenjs_functions["shen_shen-newcontinuation"] = shen_newcontinuation;






shen_return = [shen_type_func,
  function shen_user_lambda4672(Arg4671) {
  if (Arg4671.length < 3) return [shen_type_func, shen_user_lambda4672, 3, Arg4671];
  var Arg4671_0 = Arg4671[0], Arg4671_1 = Arg4671[1], Arg4671_2 = Arg4671[2];
  return (function() {
  return shenjs_call_tail(shen_deref, [Arg4671_0, Arg4671_1]);})},
  3,
  [],
  "return"];
shenjs_functions["shen_return"] = shen_return;






shen_measure$amp$return = [shen_type_func,
  function shen_user_lambda4674(Arg4673) {
  if (Arg4673.length < 3) return [shen_type_func, shen_user_lambda4674, 3, Arg4673];
  var Arg4673_0 = Arg4673[0], Arg4673_1 = Arg4673[1], Arg4673_2 = Arg4673[2];
  return (shenjs_call(shen_intoutput, ["~A inferences~%", [shen_tuple, (shenjs_globals["shen_shen-*infs*"]), []]]),
  (function() {
  return shenjs_call_tail(shen_deref, [Arg4673_0, Arg4673_1]);}))},
  3,
  [],
  "shen-measure&return"];
shenjs_functions["shen_shen-measure&return"] = shen_measure$amp$return;






shen_unify = [shen_type_func,
  function shen_user_lambda4676(Arg4675) {
  if (Arg4675.length < 4) return [shen_type_func, shen_user_lambda4676, 4, Arg4675];
  var Arg4675_0 = Arg4675[0], Arg4675_1 = Arg4675[1], Arg4675_2 = Arg4675[2], Arg4675_3 = Arg4675[3];
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$, [shenjs_call(shen_lazyderef, [Arg4675_0, Arg4675_2]), shenjs_call(shen_lazyderef, [Arg4675_1, Arg4675_2]), Arg4675_2, Arg4675_3]);})},
  4,
  [],
  "unify"];
shenjs_functions["shen_unify"] = shen_unify;






shen_lzy$eq$ = [shen_type_func,
  function shen_user_lambda4678(Arg4677) {
  if (Arg4677.length < 4) return [shen_type_func, shen_user_lambda4678, 4, Arg4677];
  var Arg4677_0 = Arg4677[0], Arg4677_1 = Arg4677[1], Arg4677_2 = Arg4677[2], Arg4677_3 = Arg4677[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4677_1, Arg4677_0)))
  ? shenjs_thaw(Arg4677_3)
  : ((shenjs_call(shen_pvar$question$, [Arg4677_0]))
  ? (function() {
  return shenjs_call_tail(shen_bind, [Arg4677_0, Arg4677_1, Arg4677_2, Arg4677_3]);})
  : ((shenjs_call(shen_pvar$question$, [Arg4677_1]))
  ? (function() {
  return shenjs_call_tail(shen_bind, [Arg4677_1, Arg4677_0, Arg4677_2, Arg4677_3]);})
  : (((shenjs_is_type(Arg4677_0, shen_type_cons) && shenjs_is_type(Arg4677_1, shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(shen_lzy$eq$, [shenjs_call(shen_lazyderef, [Arg4677_0[1], Arg4677_2]), shenjs_call(shen_lazyderef, [Arg4677_1[1], Arg4677_2]), Arg4677_2, (new Shenjs_freeze([Arg4677_0, Arg4677_1, Arg4677_2, Arg4677_3], function(Arg4679) {
  var Arg4679_0 = Arg4679[0], Arg4679_1 = Arg4679[1], Arg4679_2 = Arg4679[2], Arg4679_3 = Arg4679[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$, [shenjs_call(shen_lazyderef, [Arg4679_0[2], Arg4679_2]), shenjs_call(shen_lazyderef, [Arg4679_1[2], Arg4679_2]), Arg4679_2, Arg4679_3]);});})}))]);})
  : false))))},
  4,
  [],
  "shen-lzy="];
shenjs_functions["shen_shen-lzy="] = shen_lzy$eq$;






shen_deref = [shen_type_func,
  function shen_user_lambda4682(Arg4681) {
  if (Arg4681.length < 2) return [shen_type_func, shen_user_lambda4682, 2, Arg4681];
  var Arg4681_0 = Arg4681[0], Arg4681_1 = Arg4681[1];
  var R0;
  return ((shenjs_is_type(Arg4681_0, shen_type_cons))
  ? [shen_type_cons, shenjs_call(shen_deref, [Arg4681_0[1], Arg4681_1]), shenjs_call(shen_deref, [Arg4681_0[2], Arg4681_1])]
  : ((shenjs_call(shen_pvar$question$, [Arg4681_0]))
  ? ((R0 = shenjs_call(shen_valvector, [Arg4681_0, Arg4681_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, [shen_type_symbol, "shen--null-"])))
  ? Arg4681_0
  : (function() {
  return shenjs_call_tail(shen_deref, [R0, Arg4681_1]);})))
  : Arg4681_0))},
  2,
  [],
  "shen-deref"];
shenjs_functions["shen_shen-deref"] = shen_deref;






shen_lazyderef = [shen_type_func,
  function shen_user_lambda4684(Arg4683) {
  if (Arg4683.length < 2) return [shen_type_func, shen_user_lambda4684, 2, Arg4683];
  var Arg4683_0 = Arg4683[0], Arg4683_1 = Arg4683[1];
  var R0;
  return ((shenjs_call(shen_pvar$question$, [Arg4683_0]))
  ? ((R0 = shenjs_call(shen_valvector, [Arg4683_0, Arg4683_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, [shen_type_symbol, "shen--null-"])))
  ? Arg4683_0
  : (function() {
  return shenjs_call_tail(shen_lazyderef, [R0, Arg4683_1]);})))
  : Arg4683_0)},
  2,
  [],
  "shen-lazyderef"];
shenjs_functions["shen_shen-lazyderef"] = shen_lazyderef;






shen_valvector = [shen_type_func,
  function shen_user_lambda4686(Arg4685) {
  if (Arg4685.length < 2) return [shen_type_func, shen_user_lambda4686, 2, Arg4685];
  var Arg4685_0 = Arg4685[0], Arg4685_1 = Arg4685[1];
  return shenjs_absvector_ref(shenjs_absvector_ref((shenjs_globals["shen_shen-*prologvectors*"]), Arg4685_1), shenjs_absvector_ref(Arg4685_0, 1))},
  2,
  [],
  "shen-valvector"];
shenjs_functions["shen_shen-valvector"] = shen_valvector;






shen_unify$excl$ = [shen_type_func,
  function shen_user_lambda4688(Arg4687) {
  if (Arg4687.length < 4) return [shen_type_func, shen_user_lambda4688, 4, Arg4687];
  var Arg4687_0 = Arg4687[0], Arg4687_1 = Arg4687[1], Arg4687_2 = Arg4687[2], Arg4687_3 = Arg4687[3];
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$$excl$, [shenjs_call(shen_lazyderef, [Arg4687_0, Arg4687_2]), shenjs_call(shen_lazyderef, [Arg4687_1, Arg4687_2]), Arg4687_2, Arg4687_3]);})},
  4,
  [],
  "unify!"];
shenjs_functions["shen_unify!"] = shen_unify$excl$;






shen_lzy$eq$$excl$ = [shen_type_func,
  function shen_user_lambda4690(Arg4689) {
  if (Arg4689.length < 4) return [shen_type_func, shen_user_lambda4690, 4, Arg4689];
  var Arg4689_0 = Arg4689[0], Arg4689_1 = Arg4689[1], Arg4689_2 = Arg4689[2], Arg4689_3 = Arg4689[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4689_1, Arg4689_0)))
  ? shenjs_thaw(Arg4689_3)
  : (((shenjs_call(shen_pvar$question$, [Arg4689_0]) && (!shenjs_call(shen_occurs$question$, [Arg4689_0, shenjs_call(shen_deref, [Arg4689_1, Arg4689_2])]))))
  ? (function() {
  return shenjs_call_tail(shen_bind, [Arg4689_0, Arg4689_1, Arg4689_2, Arg4689_3]);})
  : (((shenjs_call(shen_pvar$question$, [Arg4689_1]) && (!shenjs_call(shen_occurs$question$, [Arg4689_1, shenjs_call(shen_deref, [Arg4689_0, Arg4689_2])]))))
  ? (function() {
  return shenjs_call_tail(shen_bind, [Arg4689_1, Arg4689_0, Arg4689_2, Arg4689_3]);})
  : (((shenjs_is_type(Arg4689_0, shen_type_cons) && shenjs_is_type(Arg4689_1, shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(shen_lzy$eq$$excl$, [shenjs_call(shen_lazyderef, [Arg4689_0[1], Arg4689_2]), shenjs_call(shen_lazyderef, [Arg4689_1[1], Arg4689_2]), Arg4689_2, (new Shenjs_freeze([Arg4689_0, Arg4689_1, Arg4689_2, Arg4689_3], function(Arg4691) {
  var Arg4691_0 = Arg4691[0], Arg4691_1 = Arg4691[1], Arg4691_2 = Arg4691[2], Arg4691_3 = Arg4691[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$$excl$, [shenjs_call(shen_lazyderef, [Arg4691_0[2], Arg4691_2]), shenjs_call(shen_lazyderef, [Arg4691_1[2], Arg4691_2]), Arg4691_2, Arg4691_3]);});})}))]);})
  : false))))},
  4,
  [],
  "shen-lzy=!"];
shenjs_functions["shen_shen-lzy=!"] = shen_lzy$eq$$excl$;






shen_occurs$question$ = [shen_type_func,
  function shen_user_lambda4694(Arg4693) {
  if (Arg4693.length < 2) return [shen_type_func, shen_user_lambda4694, 2, Arg4693];
  var Arg4693_0 = Arg4693[0], Arg4693_1 = Arg4693[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4693_1, Arg4693_0)))
  ? true
  : ((shenjs_is_type(Arg4693_1, shen_type_cons))
  ? (shenjs_call(shen_occurs$question$, [Arg4693_0, Arg4693_1[1]]) || shenjs_call(shen_occurs$question$, [Arg4693_0, Arg4693_1[2]]))
  : false))},
  2,
  [],
  "shen-occurs?"];
shenjs_functions["shen_shen-occurs?"] = shen_occurs$question$;






shen_identical = [shen_type_func,
  function shen_user_lambda4696(Arg4695) {
  if (Arg4695.length < 4) return [shen_type_func, shen_user_lambda4696, 4, Arg4695];
  var Arg4695_0 = Arg4695[0], Arg4695_1 = Arg4695[1], Arg4695_2 = Arg4695[2], Arg4695_3 = Arg4695[3];
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$$eq$, [shenjs_call(shen_lazyderef, [Arg4695_0, Arg4695_2]), shenjs_call(shen_lazyderef, [Arg4695_1, Arg4695_2]), Arg4695_2, Arg4695_3]);})},
  4,
  [],
  "identical"];
shenjs_functions["shen_identical"] = shen_identical;






shen_lzy$eq$$eq$ = [shen_type_func,
  function shen_user_lambda4698(Arg4697) {
  if (Arg4697.length < 4) return [shen_type_func, shen_user_lambda4698, 4, Arg4697];
  var Arg4697_0 = Arg4697[0], Arg4697_1 = Arg4697[1], Arg4697_2 = Arg4697[2], Arg4697_3 = Arg4697[3];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg4697_1, Arg4697_0)))
  ? shenjs_thaw(Arg4697_3)
  : (((shenjs_is_type(Arg4697_0, shen_type_cons) && shenjs_is_type(Arg4697_1, shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(shen_lzy$eq$$eq$, [shenjs_call(shen_lazyderef, [Arg4697_0[1], Arg4697_2]), shenjs_call(shen_lazyderef, [Arg4697_1[1], Arg4697_2]), Arg4697_2, (new Shenjs_freeze([Arg4697_0, Arg4697_1, Arg4697_2, Arg4697_3], function(Arg4699) {
  var Arg4699_0 = Arg4699[0], Arg4699_1 = Arg4699[1], Arg4699_2 = Arg4699[2], Arg4699_3 = Arg4699[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_lzy$eq$$eq$, [Arg4699_0[2], Arg4699_1[2], Arg4699_2, Arg4699_3]);});})}))]);})
  : false))},
  4,
  [],
  "shen-lzy=="];
shenjs_functions["shen_shen-lzy=="] = shen_lzy$eq$$eq$;






shen_pvar = [shen_type_func,
  function shen_user_lambda4702(Arg4701) {
  if (Arg4701.length < 1) return [shen_type_func, shen_user_lambda4702, 1, Arg4701];
  var Arg4701_0 = Arg4701[0];
  return (function() {
  return shenjs_call_tail(shen_intmake_string, ["Var~A", [shen_tuple, shenjs_absvector_ref(Arg4701_0, 1), []]]);})},
  1,
  [],
  "shen-pvar"];
shenjs_functions["shen_shen-pvar"] = shen_pvar;






shen_bind = [shen_type_func,
  function shen_user_lambda4704(Arg4703) {
  if (Arg4703.length < 4) return [shen_type_func, shen_user_lambda4704, 4, Arg4703];
  var Arg4703_0 = Arg4703[0], Arg4703_1 = Arg4703[1], Arg4703_2 = Arg4703[2], Arg4703_3 = Arg4703[3];
  var R0;
  return (shenjs_call(shen_bindv, [Arg4703_0, Arg4703_1, Arg4703_2]),
  (R0 = shenjs_unwind_tail(shenjs_thaw(Arg4703_3))),
  shenjs_call(shen_unbindv, [Arg4703_0, Arg4703_2]),
  R0)},
  4,
  [],
  "bind"];
shenjs_functions["shen_bind"] = shen_bind;






shen_fwhen = [shen_type_func,
  function shen_user_lambda4706(Arg4705) {
  if (Arg4705.length < 3) return [shen_type_func, shen_user_lambda4706, 3, Arg4705];
  var Arg4705_0 = Arg4705[0], Arg4705_1 = Arg4705[1], Arg4705_2 = Arg4705[2];
  return ((shenjs_unwind_tail(shenjs_$eq$(true, Arg4705_0)))
  ? shenjs_thaw(Arg4705_2)
  : ((shenjs_unwind_tail(shenjs_$eq$(false, Arg4705_0)))
  ? false
  : (function() {
  return shenjs_call_tail(shen_interror, ["fwhen expects a boolean: not ~S%", [shen_tuple, Arg4705_0, []]]);})))},
  3,
  [],
  "fwhen"];
shenjs_functions["shen_fwhen"] = shen_fwhen;






shen_call = [shen_type_func,
  function shen_user_lambda4708(Arg4707) {
  if (Arg4707.length < 3) return [shen_type_func, shen_user_lambda4708, 3, Arg4707];
  var Arg4707_0 = Arg4707[0], Arg4707_1 = Arg4707[1], Arg4707_2 = Arg4707[2];
  return ((shenjs_is_type(Arg4707_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_call_help, [shenjs_call(shen_m$_prolog$_to$_s_prolog$_predicate, [shenjs_call(shen_lazyderef, [Arg4707_0[1], Arg4707_1])]), Arg4707_0[2], Arg4707_1, Arg4707_2]);})
  : false)},
  3,
  [],
  "call"];
shenjs_functions["shen_call"] = shen_call;






shen_call_help = [shen_type_func,
  function shen_user_lambda4710(Arg4709) {
  if (Arg4709.length < 4) return [shen_type_func, shen_user_lambda4710, 4, Arg4709];
  var Arg4709_0 = Arg4709[0], Arg4709_1 = Arg4709[1], Arg4709_2 = Arg4709[2], Arg4709_3 = Arg4709[3];
  return ((shenjs_empty$question$(Arg4709_1))
  ? (function() {
  return shenjs_call_tail(Arg4709_0, [Arg4709_2, Arg4709_3]);})
  : ((shenjs_is_type(Arg4709_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_call_help, [shenjs_call(Arg4709_0, [Arg4709_1[1]]), Arg4709_1[2], Arg4709_2, Arg4709_3]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-call-help"]]);})))},
  4,
  [],
  "shen-call-help"];
shenjs_functions["shen_shen-call-help"] = shen_call_help;






shen_intprolog = [shen_type_func,
  function shen_user_lambda4712(Arg4711) {
  if (Arg4711.length < 1) return [shen_type_func, shen_user_lambda4712, 1, Arg4711];
  var Arg4711_0 = Arg4711[0];
  var R0;
  return (((shenjs_is_type(Arg4711_0, shen_type_cons) && shenjs_is_type(Arg4711_0[1], shen_type_cons)))
  ? ((R0 = shenjs_call(shen_start_new_prolog_process, [])),
  (function() {
  return shenjs_call_tail(shen_intprolog_help, [Arg4711_0[1][1], shenjs_call(shen_insert_prolog_variables, [[shen_type_cons, Arg4711_0[1][2], [shen_type_cons, Arg4711_0[2], []]], R0]), R0]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-intprolog"]]);}))},
  1,
  [],
  "shen-intprolog"];
shenjs_functions["shen_shen-intprolog"] = shen_intprolog;






shen_intprolog_help = [shen_type_func,
  function shen_user_lambda4714(Arg4713) {
  if (Arg4713.length < 3) return [shen_type_func, shen_user_lambda4714, 3, Arg4713];
  var Arg4713_0 = Arg4713[0], Arg4713_1 = Arg4713[1], Arg4713_2 = Arg4713[2];
  return (((shenjs_is_type(Arg4713_1, shen_type_cons) && (shenjs_is_type(Arg4713_1[2], shen_type_cons) && shenjs_empty$question$(Arg4713_1[2][2]))))
  ? (function() {
  return shenjs_call_tail(shen_intprolog_help_help, [Arg4713_0, Arg4713_1[1], Arg4713_1[2][1], Arg4713_2]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-intprolog-help"]]);}))},
  3,
  [],
  "shen-intprolog-help"];
shenjs_functions["shen_shen-intprolog-help"] = shen_intprolog_help;






shen_intprolog_help_help = [shen_type_func,
  function shen_user_lambda4716(Arg4715) {
  if (Arg4715.length < 4) return [shen_type_func, shen_user_lambda4716, 4, Arg4715];
  var Arg4715_0 = Arg4715[0], Arg4715_1 = Arg4715[1], Arg4715_2 = Arg4715[2], Arg4715_3 = Arg4715[3];
  return ((shenjs_empty$question$(Arg4715_1))
  ? (function() {
  return shenjs_call_tail(Arg4715_0, [Arg4715_3, (new Shenjs_freeze([Arg4715_0, Arg4715_1, Arg4715_2, Arg4715_3], function(Arg4717) {
  var Arg4717_0 = Arg4717[0], Arg4717_1 = Arg4717[1], Arg4717_2 = Arg4717[2], Arg4717_3 = Arg4717[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_call_rest, [Arg4717_2, Arg4717_3]);});})}))]);})
  : ((shenjs_is_type(Arg4715_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_intprolog_help_help, [shenjs_call(Arg4715_0, [Arg4715_1[1]]), Arg4715_1[2], Arg4715_2, Arg4715_3]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-intprolog-help-help"]]);})))},
  4,
  [],
  "shen-intprolog-help-help"];
shenjs_functions["shen_shen-intprolog-help-help"] = shen_intprolog_help_help;






shen_call_rest = [shen_type_func,
  function shen_user_lambda4720(Arg4719) {
  if (Arg4719.length < 2) return [shen_type_func, shen_user_lambda4720, 2, Arg4719];
  var Arg4719_0 = Arg4719[0], Arg4719_1 = Arg4719[1];
  return ((shenjs_empty$question$(Arg4719_0))
  ? true
  : (((shenjs_is_type(Arg4719_0, shen_type_cons) && (shenjs_is_type(Arg4719_0[1], shen_type_cons) && shenjs_is_type(Arg4719_0[1][2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_call_rest, [[shen_type_cons, [shen_type_cons, shenjs_call(Arg4719_0[1][1], [Arg4719_0[1][2][1]]), Arg4719_0[1][2][2]], Arg4719_0[2]], Arg4719_1]);})
  : (((shenjs_is_type(Arg4719_0, shen_type_cons) && (shenjs_is_type(Arg4719_0[1], shen_type_cons) && shenjs_empty$question$(Arg4719_0[1][2]))))
  ? (function() {
  return shenjs_call_tail(Arg4719_0[1][1], [Arg4719_1, (new Shenjs_freeze([Arg4719_0, Arg4719_1], function(Arg4721) {
  var Arg4721_0 = Arg4721[0], Arg4721_1 = Arg4721[1];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_call_rest, [Arg4721_0[2], Arg4721_1]);});})}))]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-call-rest"]]);}))))},
  2,
  [],
  "shen-call-rest"];
shenjs_functions["shen_shen-call-rest"] = shen_call_rest;






shen_start_new_prolog_process = [shen_type_func,
  function shen_user_lambda4724(Arg4723) {
  if (Arg4723.length < 0) return [shen_type_func, shen_user_lambda4724, 0, Arg4723];
  var R0;
  return ((R0 = (shenjs_globals["shen_shen-*process-counter*"] = (1 + (shenjs_globals["shen_shen-*process-counter*"])))),
  (function() {
  return shenjs_call_tail(shen_initialise_prolog, [R0]);}))},
  0,
  [],
  "shen-start-new-prolog-process"];
shenjs_functions["shen_shen-start-new-prolog-process"] = shen_start_new_prolog_process;






shen_insert_prolog_variables = [shen_type_func,
  function shen_user_lambda4726(Arg4725) {
  if (Arg4725.length < 2) return [shen_type_func, shen_user_lambda4726, 2, Arg4725];
  var Arg4725_0 = Arg4725[0], Arg4725_1 = Arg4725[1];
  return (function() {
  return shenjs_call_tail(shen_insert_prolog_variables_help, [Arg4725_0, shenjs_call(shen_flatten, [Arg4725_0]), Arg4725_1]);})},
  2,
  [],
  "shen-insert-prolog-variables"];
shenjs_functions["shen_shen-insert-prolog-variables"] = shen_insert_prolog_variables;






shen_insert_prolog_variables_help = [shen_type_func,
  function shen_user_lambda4728(Arg4727) {
  if (Arg4727.length < 3) return [shen_type_func, shen_user_lambda4728, 3, Arg4727];
  var Arg4727_0 = Arg4727[0], Arg4727_1 = Arg4727[1], Arg4727_2 = Arg4727[2];
  var R0, R1;
  return ((shenjs_empty$question$(Arg4727_1))
  ? Arg4727_0
  : (((shenjs_is_type(Arg4727_1, shen_type_cons) && shenjs_call(shen_variable$question$, [Arg4727_1[1]])))
  ? ((R0 = shenjs_call(shen_newpv, [Arg4727_2])),
  (R0 = shenjs_call(shen_subst, [R0, Arg4727_1[1], Arg4727_0])),
  (R1 = shenjs_call(shen_remove, [Arg4727_1[1], Arg4727_1[2]])),
  (function() {
  return shenjs_call_tail(shen_insert_prolog_variables_help, [R0, R1, Arg4727_2]);}))
  : ((shenjs_is_type(Arg4727_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_insert_prolog_variables_help, [Arg4727_0, Arg4727_1[2], Arg4727_2]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-insert-prolog-variables-help"]]);}))))},
  3,
  [],
  "shen-insert-prolog-variables-help"];
shenjs_functions["shen_shen-insert-prolog-variables-help"] = shen_insert_prolog_variables_help;






shen_initialise_prolog = [shen_type_func,
  function shen_user_lambda4730(Arg4729) {
  if (Arg4729.length < 1) return [shen_type_func, shen_user_lambda4730, 1, Arg4729];
  var Arg4729_0 = Arg4729[0];
  return (shenjs_absvector_set((shenjs_globals["shen_shen-*prologvectors*"]), Arg4729_0, shenjs_call(shen_fillvector, [shenjs_vector(10), 1, 10, [shen_type_symbol, "shen--null-"]])),
  shenjs_absvector_set((shenjs_globals["shen_shen-*varcounter*"]), Arg4729_0, 1),
  Arg4729_0)},
  1,
  [],
  "shen-initialise-prolog"];
shenjs_functions["shen_shen-initialise-prolog"] = shen_initialise_prolog;












shen_f$_error = [shen_type_func,
  function shen_user_lambda5376(Arg5375) {
  if (Arg5375.length < 1) return [shen_type_func, shen_user_lambda5376, 1, Arg5375];
  var Arg5375_0 = Arg5375[0];
  return (shenjs_call(shen_intoutput, ["partial function ~A;~%", [shen_tuple, Arg5375_0, []]]),
  ((((!shenjs_call(shen_tracked$question$, [Arg5375_0])) && shenjs_call(shen_y_or_n$question$, [shenjs_call(shen_intmake_string, ["track ~A? ", [shen_tuple, Arg5375_0, []]])])))
  ? shenjs_call(shen_track_function, [shenjs_call(shen_ps, [Arg5375_0])])
  : [shen_type_symbol, "shen-ok"]),
  (function() {
  return shenjs_simple_error("aborted");}))},
  1,
  [],
  "shen-f_error"];
shenjs_functions["shen_shen-f_error"] = shen_f$_error;






shen_tracked$question$ = [shen_type_func,
  function shen_user_lambda5378(Arg5377) {
  if (Arg5377.length < 1) return [shen_type_func, shen_user_lambda5378, 1, Arg5377];
  var Arg5377_0 = Arg5377[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5377_0, (shenjs_globals["shen_shen-*tracking*"])]);})},
  1,
  [],
  "shen-tracked?"];
shenjs_functions["shen_shen-tracked?"] = shen_tracked$question$;






shen_track = [shen_type_func,
  function shen_user_lambda5380(Arg5379) {
  if (Arg5379.length < 1) return [shen_type_func, shen_user_lambda5380, 1, Arg5379];
  var Arg5379_0 = Arg5379[0];
  var R0;
  return ((R0 = shenjs_call(shen_ps, [Arg5379_0])),
  (function() {
  return shenjs_call_tail(shen_track_function, [R0]);}))},
  1,
  [],
  "track"];
shenjs_functions["shen_track"] = shen_track;






shen_track_function = [shen_type_func,
  function shen_user_lambda5382(Arg5381) {
  if (Arg5381.length < 1) return [shen_type_func, shen_user_lambda5382, 1, Arg5381];
  var Arg5381_0 = Arg5381[0];
  var R0;
  return (((shenjs_is_type(Arg5381_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defun"], Arg5381_0[1])) && (shenjs_is_type(Arg5381_0[2], shen_type_cons) && (shenjs_is_type(Arg5381_0[2][2], shen_type_cons) && (shenjs_is_type(Arg5381_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg5381_0[2][2][2][2])))))))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "defun"], [shen_type_cons, Arg5381_0[2][1], [shen_type_cons, Arg5381_0[2][2][1], [shen_type_cons, shenjs_call(shen_insert_tracking_code, [Arg5381_0[2][1], Arg5381_0[2][2][1], Arg5381_0[2][2][2][1]]), []]]]]),
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
  function shen_user_lambda5384(Arg5383) {
  if (Arg5383.length < 3) return [shen_type_func, shen_user_lambda5384, 3, Arg5383];
  var Arg5383_0 = Arg5383[0], Arg5383_1 = Arg5383[1], Arg5383_2 = Arg5383[2];
  return [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], []]], [shen_type_cons, 1, []]]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-input-track"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], []]], [shen_type_cons, Arg5383_0, [shen_type_cons, shenjs_call(shen_cons$_form, [Arg5383_1]), []]]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-terpri-or-read-char"], []], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg5383_2, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-output-track"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], []]], [shen_type_cons, Arg5383_0, [shen_type_cons, [shen_type_symbol, "Result"], []]]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*call*"], []]], [shen_type_cons, 1, []]]], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-terpri-or-read-char"], []], [shen_type_cons, [shen_type_symbol, "Result"], []]]], []]]], []]]], []]]]], []]]], []]]], []]]]},
  3,
  [],
  "shen-insert-tracking-code"];
shenjs_functions["shen_shen-insert-tracking-code"] = shen_insert_tracking_code;






(shenjs_globals["shen_shen-*step*"] = false);






shen_step = [shen_type_func,
  function shen_user_lambda5387(Arg5386) {
  if (Arg5386.length < 1) return [shen_type_func, shen_user_lambda5387, 1, Arg5386];
  var Arg5386_0 = Arg5386[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg5386_0)))
  ? (shenjs_globals["shen_shen-*step*"] = true)
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg5386_0)))
  ? (shenjs_globals["shen_shen-*step*"] = false)
  : (function() {
  return shenjs_call_tail(shen_interror, ["step expects a + or a -.~%", []]);})))},
  1,
  [],
  "step"];
shenjs_functions["shen_step"] = shen_step;






shen_spy = [shen_type_func,
  function shen_user_lambda5389(Arg5388) {
  if (Arg5388.length < 1) return [shen_type_func, shen_user_lambda5389, 1, Arg5388];
  var Arg5388_0 = Arg5388[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg5388_0)))
  ? (shenjs_globals["shen_shen-*spy*"] = true)
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg5388_0)))
  ? (shenjs_globals["shen_shen-*spy*"] = false)
  : (function() {
  return shenjs_call_tail(shen_interror, ["spy expects a + or a -.~%", []]);})))},
  1,
  [],
  "spy"];
shenjs_functions["shen_spy"] = shen_spy;






shen_terpri_or_read_char = [shen_type_func,
  function shen_user_lambda5391(Arg5390) {
  if (Arg5390.length < 0) return [shen_type_func, shen_user_lambda5391, 0, Arg5390];
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
  function shen_user_lambda5393(Arg5392) {
  if (Arg5392.length < 1) return [shen_type_func, shen_user_lambda5393, 1, Arg5392];
  var Arg5392_0 = Arg5392[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5392_0, shenjs_call(shen_hat, []))))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["aborted", []]);})
  : true)},
  1,
  [],
  "shen-check-byte"];
shenjs_functions["shen_shen-check-byte"] = shen_check_byte;






shen_input_track = [shen_type_func,
  function shen_user_lambda5395(Arg5394) {
  if (Arg5394.length < 3) return [shen_type_func, shen_user_lambda5395, 3, Arg5394];
  var Arg5394_0 = Arg5394[0], Arg5394_1 = Arg5394[1], Arg5394_2 = Arg5394[2];
  return (shenjs_call(shen_intoutput, ["~%~A<~A> Inputs to ~A ~%~A", [shen_tuple, shenjs_call(shen_spaces, [Arg5394_0]), [shen_tuple, Arg5394_0, [shen_tuple, Arg5394_1, [shen_tuple, shenjs_call(shen_spaces, [Arg5394_0]), [shen_tuple, Arg5394_2, []]]]]]]),
  (function() {
  return shenjs_call_tail(shen_recursively_print, [Arg5394_2]);}))},
  3,
  [],
  "shen-input-track"];
shenjs_functions["shen_shen-input-track"] = shen_input_track;






shen_recursively_print = [shen_type_func,
  function shen_user_lambda5397(Arg5396) {
  if (Arg5396.length < 1) return [shen_type_func, shen_user_lambda5397, 1, Arg5396];
  var Arg5396_0 = Arg5396[0];
  return ((shenjs_empty$question$(Arg5396_0))
  ? (function() {
  return shenjs_call_tail(shen_intoutput, [" ==>", []]);})
  : ((shenjs_is_type(Arg5396_0, shen_type_cons))
  ? (shenjs_call(shen_print, [Arg5396_0[1]]),
  shenjs_call(shen_intoutput, [", ", []]),
  (function() {
  return shenjs_call_tail(shen_recursively_print, [Arg5396_0[2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-recursively-print"]]);})))},
  1,
  [],
  "shen-recursively-print"];
shenjs_functions["shen_shen-recursively-print"] = shen_recursively_print;






shen_spaces = [shen_type_func,
  function shen_user_lambda5399(Arg5398) {
  if (Arg5398.length < 1) return [shen_type_func, shen_user_lambda5399, 1, Arg5398];
  var Arg5398_0 = Arg5398[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg5398_0)))
  ? ""
  : (" " + shenjs_call(shen_spaces, [(Arg5398_0 - 1)])))},
  1,
  [],
  "shen-spaces"];
shenjs_functions["shen_shen-spaces"] = shen_spaces;






shen_output_track = [shen_type_func,
  function shen_user_lambda5401(Arg5400) {
  if (Arg5400.length < 3) return [shen_type_func, shen_user_lambda5401, 3, Arg5400];
  var Arg5400_0 = Arg5400[0], Arg5400_1 = Arg5400[1], Arg5400_2 = Arg5400[2];
  return (function() {
  return shenjs_call_tail(shen_intoutput, ["~%~A<~A> Output from ~A ~%~A==> ~S", [shen_tuple, shenjs_call(shen_spaces, [Arg5400_0]), [shen_tuple, Arg5400_0, [shen_tuple, Arg5400_1, [shen_tuple, shenjs_call(shen_spaces, [Arg5400_0]), [shen_tuple, Arg5400_2, []]]]]]]);})},
  3,
  [],
  "shen-output-track"];
shenjs_functions["shen_shen-output-track"] = shen_output_track;






shen_untrack = [shen_type_func,
  function shen_user_lambda5403(Arg5402) {
  if (Arg5402.length < 1) return [shen_type_func, shen_user_lambda5403, 1, Arg5402];
  var Arg5402_0 = Arg5402[0];
  return (function() {
  return shenjs_call_tail(shen_eval, [shenjs_call(shen_ps, [Arg5402_0])]);})},
  1,
  [],
  "untrack"];
shenjs_functions["shen_untrack"] = shen_untrack;






shen_profile = [shen_type_func,
  function shen_user_lambda5405(Arg5404) {
  if (Arg5404.length < 1) return [shen_type_func, shen_user_lambda5405, 1, Arg5404];
  var Arg5404_0 = Arg5404[0];
  return (function() {
  return shenjs_call_tail(shen_profile_help, [shenjs_call(shen_ps, [Arg5404_0])]);})},
  1,
  [],
  "profile"];
shenjs_functions["shen_profile"] = shen_profile;






shen_profile_help = [shen_type_func,
  function shen_user_lambda5407(Arg5406) {
  if (Arg5406.length < 1) return [shen_type_func, shen_user_lambda5407, 1, Arg5406];
  var Arg5406_0 = Arg5406[0];
  var R0, R1;
  return (((shenjs_is_type(Arg5406_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defun"], Arg5406_0[1])) && (shenjs_is_type(Arg5406_0[2], shen_type_cons) && (shenjs_is_type(Arg5406_0[2][2], shen_type_cons) && (shenjs_is_type(Arg5406_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg5406_0[2][2][2][2])))))))
  ? ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "shen-f"]])),
  (R1 = [shen_type_cons, [shen_type_symbol, "defun"], [shen_type_cons, Arg5406_0[2][1], [shen_type_cons, Arg5406_0[2][2][1], [shen_type_cons, shenjs_call(shen_profile_func, [Arg5406_0[2][1], Arg5406_0[2][2][1], [shen_type_cons, R0, Arg5406_0[2][2][1]]]), []]]]]),
  (R0 = [shen_type_cons, [shen_type_symbol, "defun"], [shen_type_cons, R0, [shen_type_cons, Arg5406_0[2][2][1], [shen_type_cons, shenjs_call(shen_subst, [R0, Arg5406_0[2][1], Arg5406_0[2][2][2][1]]), []]]]]),
  shenjs_call(shen_eval_without_macros, [R1]),
  shenjs_call(shen_eval_without_macros, [R0]),
  Arg5406_0[2][1])
  : (function() {
  return shenjs_call_tail(shen_interror, ["Cannot profile.~%", []]);}))},
  1,
  [],
  "shen-profile-help"];
shenjs_functions["shen_shen-profile-help"] = shen_profile_help;






shen_unprofile = [shen_type_func,
  function shen_user_lambda5409(Arg5408) {
  if (Arg5408.length < 1) return [shen_type_func, shen_user_lambda5409, 1, Arg5408];
  var Arg5408_0 = Arg5408[0];
  return (function() {
  return shenjs_call_tail(shen_untrack, [Arg5408_0]);})},
  1,
  [],
  "unprofile"];
shenjs_functions["shen_unprofile"] = shen_unprofile;






shen_profile_func = [shen_type_func,
  function shen_user_lambda5411(Arg5410) {
  if (Arg5410.length < 3) return [shen_type_func, shen_user_lambda5411, 3, Arg5410];
  var Arg5410_0 = Arg5410[0], Arg5410_1 = Arg5410[1], Arg5410_2 = Arg5410[2];
  return [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Start"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "run"], []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg5410_2, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Finish"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "run"], []]], [shen_type_cons, [shen_type_symbol, "Start"], []]]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Record"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-put-profile"], [shen_type_cons, Arg5410_0, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-get-profile"], [shen_type_cons, Arg5410_0, []]], [shen_type_cons, [shen_type_symbol, "Finish"], []]]], []]]], [shen_type_cons, [shen_type_symbol, "Result"], []]]]], []]]]], []]]]], []]]]]},
  3,
  [],
  "shen-profile-func"];
shenjs_functions["shen_shen-profile-func"] = shen_profile_func;






shen_profile_results = [shen_type_func,
  function shen_user_lambda5413(Arg5412) {
  if (Arg5412.length < 1) return [shen_type_func, shen_user_lambda5413, 1, Arg5412];
  var Arg5412_0 = Arg5412[0];
  var R0;
  return ((R0 = shenjs_call(shen_get_profile, [Arg5412_0])),
  shenjs_call(shen_put_profile, [Arg5412_0, 0]),
  [shen_tuple, Arg5412_0, R0])},
  1,
  [],
  "profile-results"];
shenjs_functions["shen_profile-results"] = shen_profile_results;






shen_get_profile = [shen_type_func,
  function shen_user_lambda5415(Arg5414) {
  if (Arg5414.length < 1) return [shen_type_func, shen_user_lambda5415, 1, Arg5414];
  var Arg5414_0 = Arg5414[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg5414_0, [shen_type_symbol, "profile"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda5417(Arg5416) {
  if (Arg5416.length < 1) return [shen_type_func, shen_user_lambda5417, 1, Arg5416];
  var Arg5416_0 = Arg5416[0];
  return 0},
  1,
  []]);})},
  1,
  [],
  "shen-get-profile"];
shenjs_functions["shen_shen-get-profile"] = shen_get_profile;






shen_put_profile = [shen_type_func,
  function shen_user_lambda5419(Arg5418) {
  if (Arg5418.length < 2) return [shen_type_func, shen_user_lambda5419, 2, Arg5418];
  var Arg5418_0 = Arg5418[0], Arg5418_1 = Arg5418[1];
  return (function() {
  return shenjs_call_tail(shen_put, [Arg5418_0, [shen_type_symbol, "profile"], Arg5418_1, (shenjs_globals["shen_shen-*property-vector*"])]);})},
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
  function shen_user_lambda4376(Arg4375) {
  if (Arg4375.length < 1) return [shen_type_func, shen_user_lambda4376, 1, Arg4375];
  var Arg4375_0 = Arg4375[0];
  return ((shenjs_empty$question$(Arg4375_0))
  ? []
  : (((shenjs_is_type(Arg4375_0, shen_type_cons) && shenjs_is_type(Arg4375_0[2], shen_type_cons)))
  ? (shenjs_call(shen_put, [Arg4375_0[1], [shen_type_symbol, "arity"], Arg4375_0[2][1], (shenjs_globals["shen_shen-*property-vector*"])]),
  (function() {
  return shenjs_call_tail(shen_initialise$_arity$_table, [Arg4375_0[2][2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-initialise_arity_table"]]);})))},
  1,
  [],
  "shen-initialise_arity_table"];
shenjs_functions["shen_shen-initialise_arity_table"] = shen_initialise$_arity$_table;






shen_arity = [shen_type_func,
  function shen_user_lambda4378(Arg4377) {
  if (Arg4377.length < 1) return [shen_type_func, shen_user_lambda4378, 1, Arg4377];
  var Arg4377_0 = Arg4377[0];
  return (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_get, [Arg4377_0, [shen_type_symbol, "arity"], (shenjs_globals["shen_shen-*property-vector*"])]);}, [shen_type_func,
  function shen_user_lambda4380(Arg4379) {
  if (Arg4379.length < 1) return [shen_type_func, shen_user_lambda4380, 1, Arg4379];
  var Arg4379_0 = Arg4379[0];
  return -1},
  1,
  []]);})},
  1,
  [],
  "arity"];
shenjs_functions["shen_arity"] = shen_arity;






shenjs_call(shen_initialise$_arity$_table, [[shen_type_cons, [shen_type_symbol, "adjoin"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "append"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "arity"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "assoc"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "boolean?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "cd"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "compile"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "concat"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "cn"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "declare"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "destroy"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "difference"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "element?"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "empty?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "interror"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "eval"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "eval-kl"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "explode"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "external"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "fail-if"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "fail"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "fix"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "findall"], [shen_type_cons, 5, [shen_type_cons, [shen_type_symbol, "freeze"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "gensym"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "get"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "address->"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "<-address"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, ">"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, ">="], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "hdv"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "hdstr"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "head"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "integer?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "identical"], [shen_type_cons, 4, [shen_type_cons, [shen_type_symbol, "inferences"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "intoutput"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "make-string"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "intersection"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "length"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "lineread"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "load"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "<"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "<="], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "macroexpand"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "map"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "mapcan"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "intmake-string"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "maxinferences"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "nth"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "n->string"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "number?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "output"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "occurs-check"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "occurrences"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "occurs-check"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "or"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "pos"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "print"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "profile"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "profile-results"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "ps"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "preclude"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "preclude-all-but"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "protect"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "address->"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "put"], [shen_type_cons, 4, [shen_type_cons, [shen_type_symbol, "shen-reassemble"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "read-file-as-string"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "read-file"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "read-byte"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "remove"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "reverse"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "simple-error"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "specialise"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "spy"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "step"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "stinput"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "shen-stoutput"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "string->n"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "string?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "strong-warning"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "subst"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "symbol?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "tail"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "tc"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "tc?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "track"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "trap-error"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "tuple?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "type"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "return"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "unprofile"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "unify"], [shen_type_cons, 4, [shen_type_cons, [shen_type_symbol, "unify!"], [shen_type_cons, 4, [shen_type_cons, [shen_type_symbol, "union"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "untrack"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "unspecialise"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, 3, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "variable?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "version"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "warn"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "write-to-file"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "y-or-n?"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "/"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "=="], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "shen-<1>"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "<e>"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "@s"], [shen_type_cons, 2, [shen_type_cons, [shen_type_symbol, "preclude"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "include"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "preclude-all-but"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "include-all-but"], [shen_type_cons, 1, [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, 2, []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]);





shen_systemf = [shen_type_func,
  function shen_user_lambda4383(Arg4382) {
  if (Arg4382.length < 1) return [shen_type_func, shen_user_lambda4383, 1, Arg4382];
  var Arg4382_0 = Arg4382[0];
  return (shenjs_globals["shen_shen-*system*"] = shenjs_call(shen_adjoin, [Arg4382_0, (shenjs_globals["shen_shen-*system*"])]))},
  1,
  [],
  "systemf"];
shenjs_functions["shen_systemf"] = shen_systemf;






shen_adjoin = [shen_type_func,
  function shen_user_lambda4385(Arg4384) {
  if (Arg4384.length < 2) return [shen_type_func, shen_user_lambda4385, 2, Arg4384];
  var Arg4384_0 = Arg4384[0], Arg4384_1 = Arg4384[1];
  return ((shenjs_call(shen_element$question$, [Arg4384_0, Arg4384_1]))
  ? Arg4384_1
  : [shen_type_cons, Arg4384_0, Arg4384_1])},
  2,
  [],
  "adjoin"];
shenjs_functions["shen_adjoin"] = shen_adjoin;






shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4388(Arg4387) {
  if (Arg4387.length < 1) return [shen_type_func, shen_user_lambda4388, 1, Arg4387];
  var Arg4387_0 = Arg4387[0];
  return (function() {
  return shenjs_call_tail(shen_systemf, [Arg4387_0]);})},
  1,
  []], [shen_type_cons, [shen_type_symbol, "!"], [shen_type_cons, [shen_type_symbol, "}"], [shen_type_cons, [shen_type_symbol, "{"], [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, [shen_type_symbol, "<--"], [shen_type_cons, [shen_type_symbol, "&&"], [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, ";"], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [shen_type_symbol, ":="], [shen_type_cons, [shen_type_symbol, "_"], [shen_type_cons, [shen_type_symbol, "<!>"], [shen_type_cons, [shen_type_symbol, "-*-"], [shen_type_cons, [shen_type_symbol, "*language*"], [shen_type_cons, [shen_type_symbol, "*implementation*"], [shen_type_cons, [shen_type_symbol, "*stinput*"], [shen_type_cons, [shen_type_symbol, "*home-directory*"], [shen_type_cons, [shen_type_symbol, "*version*"], [shen_type_cons, [shen_type_symbol, "*maximum-print-sequence-size*"], [shen_type_cons, [shen_type_symbol, "*printer*"], [shen_type_cons, [shen_type_symbol, "*macros*"], [shen_type_cons, [shen_type_symbol, "shen-*os*"], [shen_type_cons, [shen_type_symbol, "shen-*release*"], [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "@s"], [shen_type_cons, [shen_type_symbol, "<-"], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_symbol, "<e>"], [shen_type_cons, [shen_type_symbol, "=="], [shen_type_cons, [shen_type_symbol, "="], [shen_type_cons, [shen_type_symbol, ">="], [shen_type_cons, [shen_type_symbol, ">"], [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, [shen_type_symbol, "=!"], [shen_type_cons, [shen_type_symbol, "$"], [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_symbol, "/"], [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_symbol, "<="], [shen_type_cons, [shen_type_symbol, "<"], [shen_type_cons, [shen_type_symbol, ">>"], [shen_type_cons, shenjs_vector(0), [shen_type_cons, [shen_type_symbol, "y-or-n?"], [shen_type_cons, [shen_type_symbol, "write-to-file"], [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_symbol, "when"], [shen_type_cons, [shen_type_symbol, "warn"], [shen_type_cons, [shen_type_symbol, "version"], [shen_type_cons, [shen_type_symbol, "verified"], [shen_type_cons, [shen_type_symbol, "variable?"], [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "vector->"], [shen_type_cons, [shen_type_symbol, "<-vector"], [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, [shen_type_symbol, "vector?"], [shen_type_cons, [shen_type_symbol, "unspecialise"], [shen_type_cons, [shen_type_symbol, "untrack"], [shen_type_cons, [shen_type_symbol, "union"], [shen_type_cons, [shen_type_symbol, "unify"], [shen_type_cons, [shen_type_symbol, "unify!"], [shen_type_cons, [shen_type_symbol, "unprofile"], [shen_type_cons, [shen_type_symbol, "return"], [shen_type_cons, [shen_type_symbol, "type"], [shen_type_cons, [shen_type_symbol, "tuple?"], [shen_type_cons, true, [shen_type_cons, [shen_type_symbol, "trap-error"], [shen_type_cons, [shen_type_symbol, "track"], [shen_type_cons, [shen_type_symbol, "time"], [shen_type_cons, [shen_type_symbol, "thaw"], [shen_type_cons, [shen_type_symbol, "tc?"], [shen_type_cons, [shen_type_symbol, "tc"], [shen_type_cons, [shen_type_symbol, "tl"], [shen_type_cons, [shen_type_symbol, "tlstr"], [shen_type_cons, [shen_type_symbol, "tlv"], [shen_type_cons, [shen_type_symbol, "tail"], [shen_type_cons, [shen_type_symbol, "systemf"], [shen_type_cons, [shen_type_symbol, "synonyms"], [shen_type_cons, [shen_type_symbol, "symbol"], [shen_type_cons, [shen_type_symbol, "symbol?"], [shen_type_cons, [shen_type_symbol, "sum"], [shen_type_cons, [shen_type_symbol, "subst"], [shen_type_cons, [shen_type_symbol, "string?"], [shen_type_cons, [shen_type_symbol, "string->n"], [shen_type_cons, [shen_type_symbol, "stream"], [shen_type_cons, [shen_type_symbol, "string"], [shen_type_cons, [shen_type_symbol, "stinput"], [shen_type_cons, [shen_type_symbol, "shen-stoutput"], [shen_type_cons, [shen_type_symbol, "step"], [shen_type_cons, [shen_type_symbol, "spy"], [shen_type_cons, [shen_type_symbol, "specialise"], [shen_type_cons, [shen_type_symbol, "snd"], [shen_type_cons, [shen_type_symbol, "simple-error"], [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "save"], [shen_type_cons, [shen_type_symbol, "str"], [shen_type_cons, [shen_type_symbol, "run"], [shen_type_cons, [shen_type_symbol, "reverse"], [shen_type_cons, [shen_type_symbol, "remove"], [shen_type_cons, [shen_type_symbol, "read"], [shen_type_cons, [shen_type_symbol, "read-file"], [shen_type_cons, [shen_type_symbol, "read-file-as-bytelist"], [shen_type_cons, [shen_type_symbol, "read-file-as-string"], [shen_type_cons, [shen_type_symbol, "read-byte"], [shen_type_cons, [shen_type_symbol, "quit"], [shen_type_cons, [shen_type_symbol, "put"], [shen_type_cons, [shen_type_symbol, "preclude"], [shen_type_cons, [shen_type_symbol, "preclude-all-but"], [shen_type_cons, [shen_type_symbol, "ps"], [shen_type_cons, [shen_type_symbol, "prolog?"], [shen_type_cons, [shen_type_symbol, "protect"], [shen_type_cons, [shen_type_symbol, "profile-results"], [shen_type_cons, [shen_type_symbol, "profile"], [shen_type_cons, [shen_type_symbol, "print"], [shen_type_cons, [shen_type_symbol, "pr"], [shen_type_cons, [shen_type_symbol, "pos"], [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, [shen_type_symbol, "output"], [shen_type_cons, [shen_type_symbol, "out"], [shen_type_cons, [shen_type_symbol, "or"], [shen_type_cons, [shen_type_symbol, "open"], [shen_type_cons, [shen_type_symbol, "occurrences"], [shen_type_cons, [shen_type_symbol, "occurs-check"], [shen_type_cons, [shen_type_symbol, "n->string"], [shen_type_cons, [shen_type_symbol, "number?"], [shen_type_cons, [shen_type_symbol, "number"], [shen_type_cons, [shen_type_symbol, "null"], [shen_type_cons, [shen_type_symbol, "nth"], [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_symbol, "nl"], [shen_type_cons, [shen_type_symbol, "mode"], [shen_type_cons, [shen_type_symbol, "macro"], [shen_type_cons, [shen_type_symbol, "macroexpand"], [shen_type_cons, [shen_type_symbol, "maxinferences"], [shen_type_cons, [shen_type_symbol, "mapcan"], [shen_type_cons, [shen_type_symbol, "map"], [shen_type_cons, [shen_type_symbol, "make-string"], [shen_type_cons, [shen_type_symbol, "load"], [shen_type_cons, [shen_type_symbol, "loaded"], [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, [shen_type_symbol, "lineread"], [shen_type_cons, [shen_type_symbol, "limit"], [shen_type_cons, [shen_type_symbol, "length"], [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "lazy"], [shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, [shen_type_symbol, "is"], [shen_type_cons, [shen_type_symbol, "intersection"], [shen_type_cons, [shen_type_symbol, "inferences"], [shen_type_cons, [shen_type_symbol, "intern"], [shen_type_cons, [shen_type_symbol, "integer?"], [shen_type_cons, [shen_type_symbol, "input"], [shen_type_cons, [shen_type_symbol, "input+"], [shen_type_cons, [shen_type_symbol, "include"], [shen_type_cons, [shen_type_symbol, "include-all-but"], [shen_type_cons, [shen_type_symbol, "in"], [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, [shen_type_symbol, "identical"], [shen_type_cons, [shen_type_symbol, "head"], [shen_type_cons, [shen_type_symbol, "hd"], [shen_type_cons, [shen_type_symbol, "hdv"], [shen_type_cons, [shen_type_symbol, "hdstr"], [shen_type_cons, [shen_type_symbol, "hash"], [shen_type_cons, [shen_type_symbol, "get"], [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "gensym"], [shen_type_cons, [shen_type_symbol, "function"], [shen_type_cons, [shen_type_symbol, "fst"], [shen_type_cons, [shen_type_symbol, "freeze"], [shen_type_cons, [shen_type_symbol, "format"], [shen_type_cons, [shen_type_symbol, "fix"], [shen_type_cons, [shen_type_symbol, "file"], [shen_type_cons, [shen_type_symbol, "fail"], [shen_type_cons, [shen_type_symbol, "fail-if"], [shen_type_cons, [shen_type_symbol, "fwhen"], [shen_type_cons, [shen_type_symbol, "findall"], [shen_type_cons, false, [shen_type_cons, [shen_type_symbol, "explode"], [shen_type_cons, [shen_type_symbol, "external"], [shen_type_cons, [shen_type_symbol, "exception"], [shen_type_cons, [shen_type_symbol, "eval-kl"], [shen_type_cons, [shen_type_symbol, "eval"], [shen_type_cons, [shen_type_symbol, "error-to-string"], [shen_type_cons, [shen_type_symbol, "error"], [shen_type_cons, [shen_type_symbol, "empty?"], [shen_type_cons, [shen_type_symbol, "element?"], [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_symbol, "difference"], [shen_type_cons, [shen_type_symbol, "destroy"], [shen_type_cons, [shen_type_symbol, "defun"], [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, [shen_type_symbol, "defmacro"], [shen_type_cons, [shen_type_symbol, "defcc"], [shen_type_cons, [shen_type_symbol, "defprolog"], [shen_type_cons, [shen_type_symbol, "declare"], [shen_type_cons, [shen_type_symbol, "datatype"], [shen_type_cons, [shen_type_symbol, "cut"], [shen_type_cons, [shen_type_symbol, "cn"], [shen_type_cons, [shen_type_symbol, "cons?"], [shen_type_cons, [shen_type_symbol, "cons"], [shen_type_cons, [shen_type_symbol, "cond"], [shen_type_cons, [shen_type_symbol, "concat"], [shen_type_cons, [shen_type_symbol, "compile"], [shen_type_cons, [shen_type_symbol, "cd"], [shen_type_cons, [shen_type_symbol, "cases"], [shen_type_cons, [shen_type_symbol, "call"], [shen_type_cons, [shen_type_symbol, "close"], [shen_type_cons, [shen_type_symbol, "bind"], [shen_type_cons, [shen_type_symbol, "bound?"], [shen_type_cons, [shen_type_symbol, "boolean?"], [shen_type_cons, [shen_type_symbol, "boolean"], [shen_type_cons, [shen_type_symbol, "bar!"], [shen_type_cons, [shen_type_symbol, "assoc"], [shen_type_cons, [shen_type_symbol, "arity"], [shen_type_cons, [shen_type_symbol, "append"], [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "adjoin"], [shen_type_cons, [shen_type_symbol, "<-address"], [shen_type_cons, [shen_type_symbol, "address->"], [shen_type_cons, [shen_type_symbol, "absvector?"], [shen_type_cons, [shen_type_symbol, "absvector"], [shen_type_cons, [shen_type_symbol, "abort"], [shen_type_cons, [shen_type_symbol, "intmake-string"], [shen_type_cons, [shen_type_symbol, "intoutput"], [shen_type_cons, [shen_type_symbol, "interror"], []]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]);





shen_specialise = [shen_type_func,
  function shen_user_lambda4390(Arg4389) {
  if (Arg4389.length < 1) return [shen_type_func, shen_user_lambda4390, 1, Arg4389];
  var Arg4389_0 = Arg4389[0];
  return ((shenjs_globals["shen_shen-*special*"] = [shen_type_cons, Arg4389_0, (shenjs_globals["shen_shen-*special*"])]),
  Arg4389_0)},
  1,
  [],
  "specialise"];
shenjs_functions["shen_specialise"] = shen_specialise;






shen_unspecialise = [shen_type_func,
  function shen_user_lambda4392(Arg4391) {
  if (Arg4391.length < 1) return [shen_type_func, shen_user_lambda4392, 1, Arg4391];
  var Arg4391_0 = Arg4391[0];
  return ((shenjs_globals["shen_shen-*special*"] = shenjs_call(shen_remove, [Arg4391_0, (shenjs_globals["shen_shen-*special*"])])),
  Arg4391_0)},
  1,
  [],
  "unspecialise"];
shenjs_functions["shen_unspecialise"] = shen_unspecialise;












shen_load = [shen_type_func,
  function shen_user_lambda4395(Arg4394) {
  if (Arg4394.length < 1) return [shen_type_func, shen_user_lambda4395, 1, Arg4394];
  var Arg4394_0 = Arg4394[0];
  var R0, R1, R2;
  return (((R0 = shenjs_get_time([shen_type_symbol, "run"])),
  (R1 = shenjs_call(shen_load_help, [(shenjs_globals["shen_shen-*tc*"]), shenjs_call(shen_read_file, [Arg4394_0])])),
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
  function shen_user_lambda4397(Arg4396) {
  if (Arg4396.length < 2) return [shen_type_func, shen_user_lambda4397, 2, Arg4396];
  var Arg4396_0 = Arg4396[0], Arg4396_1 = Arg4396[1];
  var R0, R1;
  return ((shenjs_unwind_tail(shenjs_$eq$(false, Arg4396_0)))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda4399(Arg4398) {
  if (Arg4398.length < 1) return [shen_type_func, shen_user_lambda4399, 1, Arg4398];
  var Arg4398_0 = Arg4398[0];
  return (function() {
  return shenjs_call_tail(shen_intoutput, ["~S~%", [shen_tuple, shenjs_call(shen_eval_without_macros, [Arg4398_0]), []]]);})},
  1,
  []], Arg4396_1]);})
  : ((R0 = shenjs_call(shen_mapcan, [[shen_type_func,
  function shen_user_lambda4401(Arg4400) {
  if (Arg4400.length < 1) return [shen_type_func, shen_user_lambda4401, 1, Arg4400];
  var Arg4400_0 = Arg4400[0];
  return (function() {
  return shenjs_call_tail(shen_remove_synonyms, [Arg4400_0]);})},
  1,
  []], Arg4396_1])),
  (R1 = shenjs_call(shen_mapcan, [[shen_type_func,
  function shen_user_lambda4403(Arg4402) {
  if (Arg4402.length < 1) return [shen_type_func, shen_user_lambda4403, 1, Arg4402];
  var Arg4402_0 = Arg4402[0];
  return (function() {
  return shenjs_call_tail(shen_typetable, [Arg4402_0]);})},
  1,
  []], R0])),
  shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4405(Arg4404) {
  if (Arg4404.length < 1) return [shen_type_func, shen_user_lambda4405, 1, Arg4404];
  var Arg4404_0 = Arg4404[0];
  return (function() {
  return shenjs_call_tail(shen_assumetype, [Arg4404_0]);})},
  1,
  []], R1]),
  (function() {
  return shenjs_trap_error(function() {return shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4407(Arg4406) {
  if (Arg4406.length < 1) return [shen_type_func, shen_user_lambda4407, 1, Arg4406];
  var Arg4406_0 = Arg4406[0];
  return (function() {
  return shenjs_call_tail(shen_typecheck_and_load, [Arg4406_0]);})},
  1,
  []], R0]);}, [shen_type_func,
  function shen_user_lambda4409(Arg4408) {
  if (Arg4408.length < 2) return [shen_type_func, shen_user_lambda4409, 2, Arg4408];
  var Arg4408_0 = Arg4408[0], Arg4408_1 = Arg4408[1];
  return (function() {
  return shenjs_call_tail(shen_unwind_types, [Arg4408_1, Arg4408_0]);})},
  2,
  [R1]]);})))},
  2,
  [],
  "shen-load-help"];
shenjs_functions["shen_shen-load-help"] = shen_load_help;






shen_remove_synonyms = [shen_type_func,
  function shen_user_lambda4411(Arg4410) {
  if (Arg4410.length < 1) return [shen_type_func, shen_user_lambda4411, 1, Arg4410];
  var Arg4410_0 = Arg4410[0];
  return (((shenjs_is_type(Arg4410_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-synonyms-help"], Arg4410_0[1]))))
  ? (shenjs_call(shen_eval, [Arg4410_0]),
  [])
  : [shen_type_cons, Arg4410_0, []])},
  1,
  [],
  "shen-remove-synonyms"];
shenjs_functions["shen_shen-remove-synonyms"] = shen_remove_synonyms;






shen_typecheck_and_load = [shen_type_func,
  function shen_user_lambda4413(Arg4412) {
  if (Arg4412.length < 1) return [shen_type_func, shen_user_lambda4413, 1, Arg4412];
  var Arg4412_0 = Arg4412[0];
  return (shenjs_call(shen_nl, [1]),
  (function() {
  return shenjs_call_tail(shen_typecheck_and_evaluate, [Arg4412_0, shenjs_call(shen_gensym, [[shen_type_symbol, "A"]])]);}))},
  1,
  [],
  "shen-typecheck-and-load"];
shenjs_functions["shen_shen-typecheck-and-load"] = shen_typecheck_and_load;






shen_typetable = [shen_type_func,
  function shen_user_lambda4415(Arg4414) {
  if (Arg4414.length < 1) return [shen_type_func, shen_user_lambda4415, 1, Arg4414];
  var Arg4414_0 = Arg4414[0];
  var R0;
  return (((shenjs_is_type(Arg4414_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "define"], Arg4414_0[1])) && shenjs_is_type(Arg4414_0[2], shen_type_cons))))
  ? ((R0 = shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda4417(Arg4416) {
  if (Arg4416.length < 1) return [shen_type_func, shen_user_lambda4417, 1, Arg4416];
  var Arg4416_0 = Arg4416[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$sig$plus$rest$gt$, [Arg4416_0]);})},
  1,
  []], Arg4414_0[2][2], []])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["~A lacks a proper signature.~%", [shen_tuple, Arg4414_0[2][1], []]]);})
  : [shen_type_cons, [shen_type_cons, Arg4414_0[2][1], R0], []]))
  : [])},
  1,
  [],
  "shen-typetable"];
shenjs_functions["shen_shen-typetable"] = shen_typetable;






shen_assumetype = [shen_type_func,
  function shen_user_lambda4419(Arg4418) {
  if (Arg4418.length < 1) return [shen_type_func, shen_user_lambda4419, 1, Arg4418];
  var Arg4418_0 = Arg4418[0];
  return ((shenjs_is_type(Arg4418_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_declare, [Arg4418_0[1], Arg4418_0[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-assumetype"]]);}))},
  1,
  [],
  "shen-assumetype"];
shenjs_functions["shen_shen-assumetype"] = shen_assumetype;






shen_unwind_types = [shen_type_func,
  function shen_user_lambda4421(Arg4420) {
  if (Arg4420.length < 2) return [shen_type_func, shen_user_lambda4421, 2, Arg4420];
  var Arg4420_0 = Arg4420[0], Arg4420_1 = Arg4420[1];
  return ((shenjs_empty$question$(Arg4420_1))
  ? (function() {
  return shenjs_simple_error(shenjs_error_to_string(Arg4420_0));})
  : (((shenjs_is_type(Arg4420_1, shen_type_cons) && shenjs_is_type(Arg4420_1[1], shen_type_cons)))
  ? (shenjs_call(shen_remtype, [Arg4420_1[1][1]]),
  (function() {
  return shenjs_call_tail(shen_unwind_types, [Arg4420_0, Arg4420_1[2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-unwind-types"]]);})))},
  2,
  [],
  "shen-unwind-types"];
shenjs_functions["shen_shen-unwind-types"] = shen_unwind_types;






shen_remtype = [shen_type_func,
  function shen_user_lambda4423(Arg4422) {
  if (Arg4422.length < 1) return [shen_type_func, shen_user_lambda4423, 1, Arg4422];
  var Arg4422_0 = Arg4422[0];
  return ((shenjs_globals["shen_shen-*signedfuncs*"] = shenjs_call(shen_remove, [Arg4422_0, (shenjs_globals["shen_shen-*signedfuncs*"])])),
  Arg4422_0)},
  1,
  [],
  "shen-remtype"];
shenjs_functions["shen_shen-remtype"] = shen_remtype;






shen_$lt$sig$plus$rest$gt$ = [shen_type_func,
  function shen_user_lambda4425(Arg4424) {
  if (Arg4424.length < 1) return [shen_type_func, shen_user_lambda4425, 1, Arg4424];
  var Arg4424_0 = Arg4424[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$signature$gt$, [Arg4424_0])),
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
  function shen_user_lambda4427(Arg4426) {
  if (Arg4426.length < 2) return [shen_type_func, shen_user_lambda4427, 2, Arg4426];
  var Arg4426_0 = Arg4426[0], Arg4426_1 = Arg4426[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_intmake_string, ["~A~A", [shen_tuple, (shenjs_globals["shen_*home-directory*"]), [shen_tuple, Arg4426_0, []]]])),
  (R0 = shenjs_open([shen_type_symbol, "file"], R0, [shen_type_symbol, "out"])),
  (R1 = shenjs_call(shen_intmake_string, ["~S~%~%", [shen_tuple, Arg4426_1, []]])),
  shenjs_pr(R1, R0),
  shenjs_close(R0),
  Arg4426_1)},
  2,
  [],
  "write-to-file"];
shenjs_functions["shen_write-to-file"] = shen_write_to_file;












shen_macroexpand = [shen_type_func,
  function shen_user_lambda4430(Arg4429) {
  if (Arg4429.length < 1) return [shen_type_func, shen_user_lambda4430, 1, Arg4429];
  var Arg4429_0 = Arg4429[0];
  return (function() {
  return shenjs_call_tail(shen_compose, [(shenjs_globals["shen_*macros*"]), Arg4429_0]);})},
  1,
  [],
  "macroexpand"];
shenjs_functions["shen_macroexpand"] = shen_macroexpand;






shen_macroexpand = [shen_type_func,
  function shen_user_lambda4432(Arg4431) {
  if (Arg4431.length < 1) return [shen_type_func, shen_user_lambda4432, 1, Arg4431];
  var Arg4431_0 = Arg4431[0];
  var R0;
  return ((R0 = shenjs_call(shen_compose, [(shenjs_globals["shen_*macros*"]), Arg4431_0])),
  ((shenjs_unwind_tail(shenjs_$eq$(Arg4431_0, R0)))
  ? Arg4431_0
  : (function() {
  return shenjs_call_tail(shen_walk, [[shen_type_symbol, "macroexpand"], R0]);})))},
  1,
  [],
  "macroexpand"];
shenjs_functions["shen_macroexpand"] = shen_macroexpand;






(shenjs_globals["shen_*macros*"] = [shen_type_cons, [shen_type_symbol, "shen-timer-macro"], [shen_type_cons, [shen_type_symbol, "shen-cases-macro"], [shen_type_cons, [shen_type_symbol, "shen-abs-macro"], [shen_type_cons, [shen_type_symbol, "shen-put/get-macro"], [shen_type_cons, [shen_type_symbol, "shen-compile-macro"], [shen_type_cons, [shen_type_symbol, "shen-yacc-macro"], [shen_type_cons, [shen_type_symbol, "shen-datatype-macro"], [shen_type_cons, [shen_type_symbol, "shen-let-macro"], [shen_type_cons, [shen_type_symbol, "shen-assoc-macro"], [shen_type_cons, [shen_type_symbol, "shen-i/o-macro"], [shen_type_cons, [shen_type_symbol, "shen-prolog-macro"], [shen_type_cons, [shen_type_symbol, "shen-synonyms-macro"], [shen_type_cons, [shen_type_symbol, "shen-nl-macro"], [shen_type_cons, [shen_type_symbol, "shen-vector-macro"], [shen_type_cons, [shen_type_symbol, "shen-@s-macro"], [shen_type_cons, [shen_type_symbol, "shen-defmacro-macro"], [shen_type_cons, [shen_type_symbol, "shen-defprolog-macro"], [shen_type_cons, [shen_type_symbol, "shen-function-macro"], []]]]]]]]]]]]]]]]]]]);






shen_compose = [shen_type_func,
  function shen_user_lambda4435(Arg4434) {
  if (Arg4434.length < 2) return [shen_type_func, shen_user_lambda4435, 2, Arg4434];
  var Arg4434_0 = Arg4434[0], Arg4434_1 = Arg4434[1];
  return ((shenjs_empty$question$(Arg4434_0))
  ? Arg4434_1
  : ((shenjs_is_type(Arg4434_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_compose, [Arg4434_0[2], shenjs_call(Arg4434_0[1], [Arg4434_1])]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-compose"]]);})))},
  2,
  [],
  "shen-compose"];
shenjs_functions["shen_shen-compose"] = shen_compose;






shen_compile_macro = [shen_type_func,
  function shen_user_lambda4437(Arg4436) {
  if (Arg4436.length < 1) return [shen_type_func, shen_user_lambda4437, 1, Arg4436];
  var Arg4436_0 = Arg4436[0];
  return (((shenjs_is_type(Arg4436_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "compile"], Arg4436_0[1])) && (shenjs_is_type(Arg4436_0[2], shen_type_cons) && (shenjs_is_type(Arg4436_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4436_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "compile"], [shen_type_cons, Arg4436_0[2][1], [shen_type_cons, Arg4436_0[2][2][1], [shen_type_cons, [], []]]]]
  : Arg4436_0)},
  1,
  [],
  "shen-compile-macro"];
shenjs_functions["shen_shen-compile-macro"] = shen_compile_macro;






shen_prolog_macro = [shen_type_func,
  function shen_user_lambda4439(Arg4438) {
  if (Arg4438.length < 1) return [shen_type_func, shen_user_lambda4439, 1, Arg4438];
  var Arg4438_0 = Arg4438[0];
  return (((shenjs_is_type(Arg4438_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "prolog?"], Arg4438_0[1]))))
  ? [shen_type_cons, [shen_type_symbol, "shen-intprolog"], [shen_type_cons, shenjs_call(shen_prolog_form, [Arg4438_0[2]]), []]]
  : Arg4438_0)},
  1,
  [],
  "shen-prolog-macro"];
shenjs_functions["shen_shen-prolog-macro"] = shen_prolog_macro;






shen_defprolog_macro = [shen_type_func,
  function shen_user_lambda4441(Arg4440) {
  if (Arg4440.length < 1) return [shen_type_func, shen_user_lambda4441, 1, Arg4440];
  var Arg4440_0 = Arg4440[0];
  return (((shenjs_is_type(Arg4440_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defprolog"], Arg4440_0[1])) && shenjs_is_type(Arg4440_0[2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_compile, [[shen_type_func,
  function shen_user_lambda4443(Arg4442) {
  if (Arg4442.length < 1) return [shen_type_func, shen_user_lambda4443, 1, Arg4442];
  var Arg4442_0 = Arg4442[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$defprolog$gt$, [Arg4442_0]);})},
  1,
  []], Arg4440_0[2], [shen_type_func,
  function shen_user_lambda4445(Arg4444) {
  if (Arg4444.length < 2) return [shen_type_func, shen_user_lambda4445, 2, Arg4444];
  var Arg4444_0 = Arg4444[0], Arg4444_1 = Arg4444[1];
  return (function() {
  return shenjs_call_tail(shen_prolog_error, [Arg4444_0[2][1], Arg4444_1]);})},
  2,
  [Arg4440_0]]]);})
  : Arg4440_0)},
  1,
  [],
  "shen-defprolog-macro"];
shenjs_functions["shen_shen-defprolog-macro"] = shen_defprolog_macro;






shen_prolog_form = [shen_type_func,
  function shen_user_lambda4447(Arg4446) {
  if (Arg4446.length < 1) return [shen_type_func, shen_user_lambda4447, 1, Arg4446];
  var Arg4446_0 = Arg4446[0];
  return (function() {
  return shenjs_call_tail(shen_cons$_form, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda4449(Arg4448) {
  if (Arg4448.length < 1) return [shen_type_func, shen_user_lambda4449, 1, Arg4448];
  var Arg4448_0 = Arg4448[0];
  return (function() {
  return shenjs_call_tail(shen_cons$_form, [Arg4448_0]);})},
  1,
  []], Arg4446_0])]);})},
  1,
  [],
  "shen-prolog-form"];
shenjs_functions["shen_shen-prolog-form"] = shen_prolog_form;






shen_datatype_macro = [shen_type_func,
  function shen_user_lambda4451(Arg4450) {
  if (Arg4450.length < 1) return [shen_type_func, shen_user_lambda4451, 1, Arg4450];
  var Arg4450_0 = Arg4450[0];
  return (((shenjs_is_type(Arg4450_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "datatype"], Arg4450_0[1])) && shenjs_is_type(Arg4450_0[2], shen_type_cons))))
  ? [shen_type_cons, [shen_type_symbol, "shen-process-datatype"], [shen_type_cons, Arg4450_0[2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "compile"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "function"], [shen_type_cons, [shen_type_symbol, "shen-<datatype-rules>"], []]], [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg4450_0[2][2]]), [shen_type_cons, [shen_type_cons, [shen_type_symbol, "function"], [shen_type_cons, [shen_type_symbol, "shen-datatype-error"], []]], []]]]], []]]]
  : Arg4450_0)},
  1,
  [],
  "shen-datatype-macro"];
shenjs_functions["shen_shen-datatype-macro"] = shen_datatype_macro;






shen_defmacro_macro = [shen_type_func,
  function shen_user_lambda4453(Arg4452) {
  if (Arg4452.length < 1) return [shen_type_func, shen_user_lambda4453, 1, Arg4452];
  var Arg4452_0 = Arg4452[0];
  var R0, R1;
  return (((shenjs_is_type(Arg4452_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defmacro"], Arg4452_0[1])) && shenjs_is_type(Arg4452_0[2], shen_type_cons))))
  ? ((R0 = shenjs_call(shen_compile, [[shen_type_symbol, "shen-<defmacro>"], Arg4452_0[2], []])),
  (R1 = [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "*macros*"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "adjoin"], [shen_type_cons, Arg4452_0[2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "*macros*"], []]], []]]], []]]], [shen_type_cons, [shen_type_symbol, "macro"], []]]]),
  (R1 = [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, [shen_type_symbol, "null"], [shen_type_cons, [], [shen_type_cons, R1, [shen_type_cons, R0, []]]]]]),
  R1)
  : Arg4452_0)},
  1,
  [],
  "shen-defmacro-macro"];
shenjs_functions["shen_shen-defmacro-macro"] = shen_defmacro_macro;






shen_defmacro_macro = [shen_type_func,
  function shen_user_lambda4455(Arg4454) {
  if (Arg4454.length < 1) return [shen_type_func, shen_user_lambda4455, 1, Arg4454];
  var Arg4454_0 = Arg4454[0];
  var R0, R1;
  return (((shenjs_is_type(Arg4454_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defmacro"], Arg4454_0[1])) && shenjs_is_type(Arg4454_0[2], shen_type_cons))))
  ? ((R0 = [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg4454_0[2][1], shenjs_call(shen_append, [Arg4454_0[2][2], [shen_type_cons, [shen_type_symbol, "X"], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, [shen_type_symbol, "X"], []]]]])]]),
  (R1 = [shen_type_cons, [shen_type_symbol, "do"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "set"], [shen_type_cons, [shen_type_symbol, "*macros*"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "adjoin"], [shen_type_cons, Arg4454_0[2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "*macros*"], []]], []]]], []]]], [shen_type_cons, [shen_type_symbol, "macro"], []]]]),
  (R1 = [shen_type_cons, [shen_type_symbol, "package"], [shen_type_cons, [shen_type_symbol, "null"], [shen_type_cons, [], [shen_type_cons, R1, [shen_type_cons, R0, []]]]]]),
  R1)
  : Arg4454_0)},
  1,
  [],
  "shen-defmacro-macro"];
shenjs_functions["shen_shen-defmacro-macro"] = shen_defmacro_macro;






shen_$lt$defmacro$gt$ = [shen_type_func,
  function shen_user_lambda4457(Arg4456) {
  if (Arg4456.length < 1) return [shen_type_func, shen_user_lambda4457, 1, Arg4456];
  var Arg4456_0 = Arg4456[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$name$gt$, [Arg4456_0])),
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
  function shen_user_lambda4459(Arg4458) {
  if (Arg4458.length < 1) return [shen_type_func, shen_user_lambda4459, 1, Arg4458];
  var Arg4458_0 = Arg4458[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$macrorule$gt$, [Arg4458_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$macrorules$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_append, [shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])])])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$macrorule$gt$, [Arg4458_0])),
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
  function shen_user_lambda4461(Arg4460) {
  if (Arg4460.length < 1) return [shen_type_func, shen_user_lambda4461, 1, Arg4460];
  var Arg4460_0 = Arg4460[0];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4460_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4460_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? (((shenjs_is_type(shenjs_call(shen_fst, [R0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "->"], shenjs_call(shen_fst, [R0])[1]))))
  ? ((R1 = shenjs_call(shen_$lt$macroaction$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0])[2], shenjs_call(shen_snd, [R0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), shenjs_call(shen_append, [shenjs_call(shen_snd, [R0]), [shen_type_cons, [shen_type_symbol, "->"], shenjs_call(shen_snd, [R1])]])])
  : shen_fail_obj))
  : shen_fail_obj)
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4460_0])),
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
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg4460_0])),
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
  function shen_user_lambda4463(Arg4462) {
  if (Arg4462.length < 1) return [shen_type_func, shen_user_lambda4463, 1, Arg4462];
  var Arg4462_0 = Arg4462[0];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$action$gt$, [Arg4462_0])),
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
  function shen_user_lambda4465(Arg4464) {
  if (Arg4464.length < 1) return [shen_type_func, shen_user_lambda4465, 1, Arg4464];
  var Arg4464_0 = Arg4464[0];
  var R0;
  return (((shenjs_is_type(Arg4464_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], Arg4464_0[1])) && (shenjs_is_type(Arg4464_0[2], shen_type_cons) && (shenjs_is_type(Arg4464_0[2][2], shen_type_cons) && shenjs_is_type(Arg4464_0[2][2][2], shen_type_cons))))))
  ? [shen_type_cons, [shen_type_symbol, "@s"], [shen_type_cons, Arg4464_0[2][1], [shen_type_cons, shenjs_call(shen_$at$s_macro, [[shen_type_cons, [shen_type_symbol, "@s"], Arg4464_0[2][2]]]), []]]]
  : (((shenjs_is_type(Arg4464_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], Arg4464_0[1])) && (shenjs_is_type(Arg4464_0[2], shen_type_cons) && (shenjs_is_type(Arg4464_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg4464_0[2][2][2]) && (typeof(Arg4464_0[2][1]) == 'string')))))))
  ? ((R0 = shenjs_call(shen_explode, [Arg4464_0[2][1]])),
  (((shenjs_call(shen_length, [R0]) > 1))
  ? (function() {
  return shenjs_call_tail(shen_$at$s_macro, [[shen_type_cons, [shen_type_symbol, "@s"], shenjs_call(shen_append, [R0, Arg4464_0[2][2]])]]);})
  : Arg4464_0))
  : Arg4464_0))},
  1,
  [],
  "shen-@s-macro"];
shenjs_functions["shen_shen-@s-macro"] = shen_$at$s_macro;






shen_synonyms_macro = [shen_type_func,
  function shen_user_lambda4467(Arg4466) {
  if (Arg4466.length < 1) return [shen_type_func, shen_user_lambda4467, 1, Arg4466];
  var Arg4466_0 = Arg4466[0];
  return (((shenjs_is_type(Arg4466_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "synonyms"], Arg4466_0[1]))))
  ? [shen_type_cons, [shen_type_symbol, "shen-synonyms-help"], [shen_type_cons, shenjs_call(shen_rcons$_form, [Arg4466_0[2]]), []]]
  : Arg4466_0)},
  1,
  [],
  "shen-synonyms-macro"];
shenjs_functions["shen_shen-synonyms-macro"] = shen_synonyms_macro;






shen_nl_macro = [shen_type_func,
  function shen_user_lambda4469(Arg4468) {
  if (Arg4468.length < 1) return [shen_type_func, shen_user_lambda4469, 1, Arg4468];
  var Arg4468_0 = Arg4468[0];
  return (((shenjs_is_type(Arg4468_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "nl"], Arg4468_0[1])) && shenjs_empty$question$(Arg4468_0[2]))))
  ? [shen_type_cons, [shen_type_symbol, "nl"], [shen_type_cons, 1, []]]
  : Arg4468_0)},
  1,
  [],
  "shen-nl-macro"];
shenjs_functions["shen_shen-nl-macro"] = shen_nl_macro;






shen_vector_macro = [shen_type_func,
  function shen_user_lambda4471(Arg4470) {
  if (Arg4470.length < 1) return [shen_type_func, shen_user_lambda4471, 1, Arg4470];
  var Arg4470_0 = Arg4470[0];
  return ((shenjs_unwind_tail(shenjs_$eq$(shenjs_vector(0), Arg4470_0)))
  ? [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, 0, []]]
  : Arg4470_0)},
  1,
  [],
  "shen-vector-macro"];
shenjs_functions["shen_shen-vector-macro"] = shen_vector_macro;






shen_yacc_macro = [shen_type_func,
  function shen_user_lambda4473(Arg4472) {
  if (Arg4472.length < 1) return [shen_type_func, shen_user_lambda4473, 1, Arg4472];
  var Arg4472_0 = Arg4472[0];
  return (((shenjs_is_type(Arg4472_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "defcc"], Arg4472_0[1])) && shenjs_is_type(Arg4472_0[2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_yacc_$gt$shen, [Arg4472_0[2][1], Arg4472_0[2][2], shenjs_call(shen_extract_segvars, [Arg4472_0[2][2]])]);})
  : Arg4472_0)},
  1,
  [],
  "shen-yacc-macro"];
shenjs_functions["shen_shen-yacc-macro"] = shen_yacc_macro;






shen_assoc_macro = [shen_type_func,
  function shen_user_lambda4475(Arg4474) {
  if (Arg4474.length < 1) return [shen_type_func, shen_user_lambda4475, 1, Arg4474];
  var Arg4474_0 = Arg4474[0];
  return (((shenjs_is_type(Arg4474_0, shen_type_cons) && (shenjs_is_type(Arg4474_0[2], shen_type_cons) && (shenjs_is_type(Arg4474_0[2][2], shen_type_cons) && (shenjs_is_type(Arg4474_0[2][2][2], shen_type_cons) && shenjs_call(shen_element$question$, [Arg4474_0[1], [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, [shen_type_symbol, "@v"], [shen_type_cons, [shen_type_symbol, "append"], [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, [shen_type_symbol, "or"], [shen_type_cons, [shen_type_symbol, "+"], [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, [shen_type_symbol, "do"], []]]]]]]]]]))))))
  ? [shen_type_cons, Arg4474_0[1], [shen_type_cons, Arg4474_0[2][1], [shen_type_cons, shenjs_call(shen_assoc_macro, [[shen_type_cons, Arg4474_0[1], Arg4474_0[2][2]]]), []]]]
  : Arg4474_0)},
  1,
  [],
  "shen-assoc-macro"];
shenjs_functions["shen_shen-assoc-macro"] = shen_assoc_macro;






shen_let_macro = [shen_type_func,
  function shen_user_lambda4477(Arg4476) {
  if (Arg4476.length < 1) return [shen_type_func, shen_user_lambda4477, 1, Arg4476];
  var Arg4476_0 = Arg4476[0];
  return (((shenjs_is_type(Arg4476_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], Arg4476_0[1])) && (shenjs_is_type(Arg4476_0[2], shen_type_cons) && (shenjs_is_type(Arg4476_0[2][2], shen_type_cons) && (shenjs_is_type(Arg4476_0[2][2][2], shen_type_cons) && shenjs_is_type(Arg4476_0[2][2][2][2], shen_type_cons)))))))
  ? [shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, Arg4476_0[2][1], [shen_type_cons, Arg4476_0[2][2][1], [shen_type_cons, shenjs_call(shen_let_macro, [[shen_type_cons, [shen_type_symbol, "let"], Arg4476_0[2][2][2]]]), []]]]]
  : Arg4476_0)},
  1,
  [],
  "shen-let-macro"];
shenjs_functions["shen_shen-let-macro"] = shen_let_macro;






shen_abs_macro = [shen_type_func,
  function shen_user_lambda4479(Arg4478) {
  if (Arg4478.length < 1) return [shen_type_func, shen_user_lambda4479, 1, Arg4478];
  var Arg4478_0 = Arg4478[0];
  return (((shenjs_is_type(Arg4478_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4478_0[1])) && (shenjs_is_type(Arg4478_0[2], shen_type_cons) && (shenjs_is_type(Arg4478_0[2][2], shen_type_cons) && shenjs_is_type(Arg4478_0[2][2][2], shen_type_cons))))))
  ? [shen_type_cons, [shen_type_symbol, "lambda"], [shen_type_cons, Arg4478_0[2][1], [shen_type_cons, shenjs_call(shen_abs_macro, [[shen_type_cons, [shen_type_symbol, "/."], Arg4478_0[2][2]]]), []]]]
  : (((shenjs_is_type(Arg4478_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "/."], Arg4478_0[1])) && (shenjs_is_type(Arg4478_0[2], shen_type_cons) && (shenjs_is_type(Arg4478_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4478_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "lambda"], Arg4478_0[2]]
  : Arg4478_0))},
  1,
  [],
  "shen-abs-macro"];
shenjs_functions["shen_shen-abs-macro"] = shen_abs_macro;






shen_cases_macro = [shen_type_func,
  function shen_user_lambda4481(Arg4480) {
  if (Arg4480.length < 1) return [shen_type_func, shen_user_lambda4481, 1, Arg4480];
  var Arg4480_0 = Arg4480[0];
  return (((shenjs_is_type(Arg4480_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cases"], Arg4480_0[1])) && (shenjs_is_type(Arg4480_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(true, Arg4480_0[2][1])) && shenjs_is_type(Arg4480_0[2][2], shen_type_cons))))))
  ? Arg4480_0[2][2][1]
  : (((shenjs_is_type(Arg4480_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cases"], Arg4480_0[1])) && (shenjs_is_type(Arg4480_0[2], shen_type_cons) && (shenjs_is_type(Arg4480_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4480_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, Arg4480_0[2][1], [shen_type_cons, Arg4480_0[2][2][1], [shen_type_cons, shenjs_call(shen_i$slash$o_macro, [[shen_type_cons, [shen_type_symbol, "error"], [shen_type_cons, "error: cases exhausted~%", []]]]), []]]]]
  : (((shenjs_is_type(Arg4480_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cases"], Arg4480_0[1])) && (shenjs_is_type(Arg4480_0[2], shen_type_cons) && shenjs_is_type(Arg4480_0[2][2], shen_type_cons)))))
  ? [shen_type_cons, [shen_type_symbol, "if"], [shen_type_cons, Arg4480_0[2][1], [shen_type_cons, Arg4480_0[2][2][1], [shen_type_cons, shenjs_call(shen_cases_macro, [[shen_type_cons, [shen_type_symbol, "cases"], Arg4480_0[2][2][2]]]), []]]]]
  : (((shenjs_is_type(Arg4480_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cases"], Arg4480_0[1])) && (shenjs_is_type(Arg4480_0[2], shen_type_cons) && shenjs_empty$question$(Arg4480_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["error: odd number of case elements~%", []]);})
  : Arg4480_0))))},
  1,
  [],
  "shen-cases-macro"];
shenjs_functions["shen_shen-cases-macro"] = shen_cases_macro;






shen_timer_macro = [shen_type_func,
  function shen_user_lambda4483(Arg4482) {
  if (Arg4482.length < 1) return [shen_type_func, shen_user_lambda4483, 1, Arg4482];
  var Arg4482_0 = Arg4482[0];
  return (((shenjs_is_type(Arg4482_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "time"], Arg4482_0[1])) && (shenjs_is_type(Arg4482_0[2], shen_type_cons) && shenjs_empty$question$(Arg4482_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_let_macro, [[shen_type_cons, [shen_type_symbol, "let"], [shen_type_cons, [shen_type_symbol, "Start"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "run"], []]], [shen_type_cons, [shen_type_symbol, "Result"], [shen_type_cons, Arg4482_0[2][1], [shen_type_cons, [shen_type_symbol, "Finish"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "get-time"], [shen_type_cons, [shen_type_symbol, "run"], []]], [shen_type_cons, [shen_type_symbol, "Time"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "-"], [shen_type_cons, [shen_type_symbol, "Finish"], [shen_type_cons, [shen_type_symbol, "Start"], []]]], [shen_type_cons, [shen_type_symbol, "Message"], [shen_type_cons, shenjs_call(shen_i$slash$o_macro, [[shen_type_cons, [shen_type_symbol, "output"], [shen_type_cons, "~%run time: ~A secs~%", [shen_type_cons, [shen_type_symbol, "Time"], []]]]]), [shen_type_cons, [shen_type_symbol, "Result"], []]]]]]]]]]]]]]);})
  : Arg4482_0)},
  1,
  [],
  "shen-timer-macro"];
shenjs_functions["shen_shen-timer-macro"] = shen_timer_macro;






shen_i$slash$o_macro = [shen_type_func,
  function shen_user_lambda4485(Arg4484) {
  if (Arg4484.length < 1) return [shen_type_func, shen_user_lambda4485, 1, Arg4484];
  var Arg4484_0 = Arg4484[0];
  return (((shenjs_is_type(Arg4484_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "output"], Arg4484_0[1])) && shenjs_is_type(Arg4484_0[2], shen_type_cons))))
  ? [shen_type_cons, [shen_type_symbol, "intoutput"], [shen_type_cons, Arg4484_0[2][1], [shen_type_cons, shenjs_call(shen_tuple_up, [Arg4484_0[2][2]]), []]]]
  : (((shenjs_is_type(Arg4484_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "make-string"], Arg4484_0[1])) && shenjs_is_type(Arg4484_0[2], shen_type_cons))))
  ? [shen_type_cons, [shen_type_symbol, "intmake-string"], [shen_type_cons, Arg4484_0[2][1], [shen_type_cons, shenjs_call(shen_tuple_up, [Arg4484_0[2][2]]), []]]]
  : (((shenjs_is_type(Arg4484_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "error"], Arg4484_0[1])) && shenjs_is_type(Arg4484_0[2], shen_type_cons))))
  ? [shen_type_cons, [shen_type_symbol, "interror"], [shen_type_cons, Arg4484_0[2][1], [shen_type_cons, shenjs_call(shen_tuple_up, [Arg4484_0[2][2]]), []]]]
  : (((shenjs_is_type(Arg4484_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "pr"], Arg4484_0[1])) && (shenjs_is_type(Arg4484_0[2], shen_type_cons) && shenjs_empty$question$(Arg4484_0[2][2])))))
  ? [shen_type_cons, [shen_type_symbol, "pr"], [shen_type_cons, Arg4484_0[2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "shen-stoutput"], [shen_type_cons, 0, []]], []]]]
  : (((shenjs_is_type(Arg4484_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "read-byte"], Arg4484_0[1])) && shenjs_empty$question$(Arg4484_0[2]))))
  ? [shen_type_cons, [shen_type_symbol, "read-byte"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "stinput"], [shen_type_cons, 0, []]], []]]
  : Arg4484_0)))))},
  1,
  [],
  "shen-i/o-macro"];
shenjs_functions["shen_shen-i/o-macro"] = shen_i$slash$o_macro;






shen_tuple_up = [shen_type_func,
  function shen_user_lambda4487(Arg4486) {
  if (Arg4486.length < 1) return [shen_type_func, shen_user_lambda4487, 1, Arg4486];
  var Arg4486_0 = Arg4486[0];
  return ((shenjs_is_type(Arg4486_0, shen_type_cons))
  ? [shen_type_cons, [shen_type_symbol, "@p"], [shen_type_cons, Arg4486_0[1], [shen_type_cons, shenjs_call(shen_tuple_up, [Arg4486_0[2]]), []]]]
  : Arg4486_0)},
  1,
  [],
  "shen-tuple-up"];
shenjs_functions["shen_shen-tuple-up"] = shen_tuple_up;






shen_put$slash$get_macro = [shen_type_func,
  function shen_user_lambda4489(Arg4488) {
  if (Arg4488.length < 1) return [shen_type_func, shen_user_lambda4489, 1, Arg4488];
  var Arg4488_0 = Arg4488[0];
  return (((shenjs_is_type(Arg4488_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "put"], Arg4488_0[1])) && (shenjs_is_type(Arg4488_0[2], shen_type_cons) && (shenjs_is_type(Arg4488_0[2][2], shen_type_cons) && (shenjs_is_type(Arg4488_0[2][2][2], shen_type_cons) && shenjs_empty$question$(Arg4488_0[2][2][2][2])))))))
  ? [shen_type_cons, [shen_type_symbol, "put"], [shen_type_cons, Arg4488_0[2][1], [shen_type_cons, Arg4488_0[2][2][1], [shen_type_cons, Arg4488_0[2][2][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*property-vector*"], []]], []]]]]]
  : (((shenjs_is_type(Arg4488_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "get"], Arg4488_0[1])) && (shenjs_is_type(Arg4488_0[2], shen_type_cons) && (shenjs_is_type(Arg4488_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg4488_0[2][2][2]))))))
  ? [shen_type_cons, [shen_type_symbol, "get"], [shen_type_cons, Arg4488_0[2][1], [shen_type_cons, Arg4488_0[2][2][1], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, [shen_type_symbol, "shen-*property-vector*"], []]], []]]]]
  : Arg4488_0))},
  1,
  [],
  "shen-put/get-macro"];
shenjs_functions["shen_shen-put/get-macro"] = shen_put$slash$get_macro;






shen_function_macro = [shen_type_func,
  function shen_user_lambda4491(Arg4490) {
  if (Arg4490.length < 1) return [shen_type_func, shen_user_lambda4491, 1, Arg4490];
  var Arg4490_0 = Arg4490[0];
  return (((shenjs_is_type(Arg4490_0, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "function"], Arg4490_0[1])) && (shenjs_is_type(Arg4490_0[2], shen_type_cons) && shenjs_empty$question$(Arg4490_0[2][2])))))
  ? (function() {
  return shenjs_call_tail(shen_function_abstraction, [Arg4490_0[2][1], shenjs_call(shen_arity, [Arg4490_0[2][1]])]);})
  : Arg4490_0)},
  1,
  [],
  "shen-function-macro"];
shenjs_functions["shen_shen-function-macro"] = shen_function_macro;






shen_function_abstraction = [shen_type_func,
  function shen_user_lambda4493(Arg4492) {
  if (Arg4492.length < 2) return [shen_type_func, shen_user_lambda4493, 2, Arg4492];
  var Arg4492_0 = Arg4492[0], Arg4492_1 = Arg4492[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg4492_1)))
  ? [shen_type_cons, [shen_type_symbol, "freeze"], [shen_type_cons, Arg4492_0, []]]
  : ((shenjs_unwind_tail(shenjs_$eq$(-1, Arg4492_1)))
  ? Arg4492_0
  : (function() {
  return shenjs_call_tail(shen_function_abstraction_help, [Arg4492_0, Arg4492_1, []]);})))},
  2,
  [],
  "shen-function-abstraction"];
shenjs_functions["shen_shen-function-abstraction"] = shen_function_abstraction;






shen_function_abstraction_help = [shen_type_func,
  function shen_user_lambda4495(Arg4494) {
  if (Arg4494.length < 3) return [shen_type_func, shen_user_lambda4495, 3, Arg4494];
  var Arg4494_0 = Arg4494[0], Arg4494_1 = Arg4494[1], Arg4494_2 = Arg4494[2];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(0, Arg4494_1)))
  ? [shen_type_cons, Arg4494_0, Arg4494_2]
  : ((R0 = shenjs_call(shen_gensym, [[shen_type_symbol, "V"]])),
  [shen_type_cons, [shen_type_symbol, "/."], [shen_type_cons, R0, [shen_type_cons, shenjs_call(shen_function_abstraction_help, [Arg4494_0, (Arg4494_1 - 1), shenjs_call(shen_append, [Arg4494_2, [shen_type_cons, R0, []]])]), []]]]))},
  3,
  [],
  "shen-function-abstraction-help"];
shenjs_functions["shen_shen-function-abstraction-help"] = shen_function_abstraction_help;












shen_declare = [shen_type_func,
  function shen_user_lambda5865(Arg5864) {
  if (Arg5864.length < 2) return [shen_type_func, shen_user_lambda5865, 2, Arg5864];
  var Arg5864_0 = Arg5864[0], Arg5864_1 = Arg5864[1];
  var R0, R1, R2;
  return ((shenjs_globals["shen_shen-*signedfuncs*"] = shenjs_call(shen_adjoin, [Arg5864_0, (shenjs_globals["shen_shen-*signedfuncs*"])])),
  shenjs_trap_error(function() {return shenjs_call(shen_variancy_test, [Arg5864_0, Arg5864_1]);}, [shen_type_func,
  function shen_user_lambda5867(Arg5866) {
  if (Arg5866.length < 1) return [shen_type_func, shen_user_lambda5867, 1, Arg5866];
  var Arg5866_0 = Arg5866[0];
  return [shen_type_symbol, "shen-skip"]},
  1,
  []]),
  (R0 = shenjs_call(shen_rcons$_form, [shenjs_call(shen_normalise_type, [Arg5864_1])])),
  (R1 = shenjs_call(shen_concat, [[shen_type_symbol, "shen-type-signature-of-"], Arg5864_0])),
  (R2 = shenjs_call(shen_parameters, [1])),
  (R0 = [shen_type_cons, [shen_type_cons, R1, [shen_type_cons, [shen_type_symbol, "X"], []]], [shen_type_cons, [shen_type_symbol, ":-"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "unify!"], [shen_type_cons, [shen_type_symbol, "X"], [shen_type_cons, R0, []]]], []], []]]]),
  (R0 = shenjs_call(shen_aum, [R0, R2])),
  (R0 = shenjs_call(shen_aum$_to$_shen, [R0])),
  (R2 = [shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, R1, shenjs_call(shen_append, [R2, shenjs_call(shen_append, [[shen_type_cons, [shen_type_symbol, "ProcessN"], [shen_type_cons, [shen_type_symbol, "Continuation"], []]], [shen_type_cons, [shen_type_symbol, "->"], [shen_type_cons, R0, []]]])])]]),
  shenjs_call(shen_eval_without_macros, [R2]),
  Arg5864_0)},
  2,
  [],
  "declare"];
shenjs_functions["shen_declare"] = shen_declare;






shen_normalise_type = [shen_type_func,
  function shen_user_lambda5869(Arg5868) {
  if (Arg5868.length < 1) return [shen_type_func, shen_user_lambda5869, 1, Arg5868];
  var Arg5868_0 = Arg5868[0];
  return (function() {
  return shenjs_call_tail(shen_fix, [[shen_type_func,
  function shen_user_lambda5871(Arg5870) {
  if (Arg5870.length < 1) return [shen_type_func, shen_user_lambda5871, 1, Arg5870];
  var Arg5870_0 = Arg5870[0];
  return (function() {
  return shenjs_call_tail(shen_normalise_type_help, [Arg5870_0]);})},
  1,
  []], Arg5868_0]);})},
  1,
  [],
  "shen-normalise-type"];
shenjs_functions["shen_shen-normalise-type"] = shen_normalise_type;






shen_normalise_type_help = [shen_type_func,
  function shen_user_lambda5873(Arg5872) {
  if (Arg5872.length < 1) return [shen_type_func, shen_user_lambda5873, 1, Arg5872];
  var Arg5872_0 = Arg5872[0];
  return ((shenjs_is_type(Arg5872_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_normalise_X, [shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5875(Arg5874) {
  if (Arg5874.length < 1) return [shen_type_func, shen_user_lambda5875, 1, Arg5874];
  var Arg5874_0 = Arg5874[0];
  return (function() {
  return shenjs_call_tail(shen_normalise_type_help, [Arg5874_0]);})},
  1,
  []], Arg5872_0])]);})
  : (function() {
  return shenjs_call_tail(shen_normalise_X, [Arg5872_0]);}))},
  1,
  [],
  "shen-normalise-type-help"];
shenjs_functions["shen_shen-normalise-type-help"] = shen_normalise_type_help;






shen_normalise_X = [shen_type_func,
  function shen_user_lambda5877(Arg5876) {
  if (Arg5876.length < 1) return [shen_type_func, shen_user_lambda5877, 1, Arg5876];
  var Arg5876_0 = Arg5876[0];
  var R0;
  return ((R0 = shenjs_call(shen_assoc, [Arg5876_0, (shenjs_globals["shen_shen-*synonyms*"])])),
  ((shenjs_empty$question$(R0))
  ? Arg5876_0
  : R0[2]))},
  1,
  [],
  "shen-normalise-X"];
shenjs_functions["shen_shen-normalise-X"] = shen_normalise_X;






shen_variancy_test = [shen_type_func,
  function shen_user_lambda5879(Arg5878) {
  if (Arg5878.length < 2) return [shen_type_func, shen_user_lambda5879, 2, Arg5878];
  var Arg5878_0 = Arg5878[0], Arg5878_1 = Arg5878[1];
  var R0;
  return ((R0 = shenjs_call(shen_typecheck, [Arg5878_0, [shen_type_symbol, "B"]])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R0)))
  ? [shen_type_symbol, "shen-skip"]
  : ((shenjs_call(shen_variant$question$, [R0, Arg5878_1]))
  ? [shen_type_symbol, "shen-skip"]
  : shenjs_call(shen_intoutput, ["warning: changing the type of ~A may create errors~%", [shen_tuple, Arg5878_0, []]]))),
  [shen_type_symbol, "shen-skip"])},
  2,
  [],
  "shen-variancy-test"];
shenjs_functions["shen_shen-variancy-test"] = shen_variancy_test;






shen_variant$question$ = [shen_type_func,
  function shen_user_lambda5881(Arg5880) {
  if (Arg5880.length < 2) return [shen_type_func, shen_user_lambda5881, 2, Arg5880];
  var Arg5880_0 = Arg5880[0], Arg5880_1 = Arg5880[1];
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5880_1, Arg5880_0)))
  ? true
  : (((shenjs_is_type(Arg5880_0, shen_type_cons) && (shenjs_is_type(Arg5880_1, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5880_1[1], Arg5880_0[1])))))
  ? (function() {
  return shenjs_call_tail(shen_variant$question$, [Arg5880_0[2], Arg5880_1[2]]);})
  : (((shenjs_is_type(Arg5880_0, shen_type_cons) && (shenjs_is_type(Arg5880_1, shen_type_cons) && (shenjs_call(shen_pvar$question$, [Arg5880_0[1]]) && shenjs_call(shen_variable$question$, [Arg5880_1[1]])))))
  ? (function() {
  return shenjs_call_tail(shen_variant$question$, [shenjs_call(shen_subst, [[shen_type_symbol, "shen-a"], Arg5880_0[1], Arg5880_0[2]]), shenjs_call(shen_subst, [[shen_type_symbol, "shen-a"], Arg5880_1[1], Arg5880_1[2]])]);})
  : (((shenjs_is_type(Arg5880_0, shen_type_cons) && (shenjs_is_type(Arg5880_0[1], shen_type_cons) && (shenjs_is_type(Arg5880_1, shen_type_cons) && shenjs_is_type(Arg5880_1[1], shen_type_cons)))))
  ? (function() {
  return shenjs_call_tail(shen_variant$question$, [shenjs_call(shen_append, [Arg5880_0[1], Arg5880_0[2]]), shenjs_call(shen_append, [Arg5880_1[1], Arg5880_1[2]])]);})
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
  function shen_user_lambda5422(Arg5421) {
  if (Arg5421.length < 2) return [shen_type_func, shen_user_lambda5422, 2, Arg5421];
  var Arg5421_0 = Arg5421[0], Arg5421_1 = Arg5421[1];
  var R0, R1, R2, R3;
  return ((R0 = shenjs_call(shen_curry, [Arg5421_0])),
  (R1 = shenjs_call(shen_start_new_prolog_process, [])),
  (R2 = shenjs_call(shen_insert_prolog_variables, [shenjs_call(shen_normalise_type, [shenjs_call(shen_curry_type, [Arg5421_1])]), R1])),
  (R3 = (new Shenjs_freeze([R0, R2, R1], function(Arg5423) {
  var Arg5423_0 = Arg5423[0], Arg5423_1 = Arg5423[1], Arg5423_2 = Arg5423[2];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_return, [Arg5423_1, Arg5423_2, [shen_type_symbol, "shen-void"]]);});})}))),
  (function() {
  return shenjs_call_tail(shen_th$asterisk$, [R0, R2, [], R1, R3]);}))},
  2,
  [],
  "shen-typecheck"];
shenjs_functions["shen_shen-typecheck"] = shen_typecheck;






shen_curry = [shen_type_func,
  function shen_user_lambda5426(Arg5425) {
  if (Arg5425.length < 1) return [shen_type_func, shen_user_lambda5426, 1, Arg5425];
  var Arg5425_0 = Arg5425[0];
  return (((shenjs_is_type(Arg5425_0, shen_type_cons) && shenjs_call(shen_special$question$, [Arg5425_0[1]])))
  ? [shen_type_cons, Arg5425_0[1], shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5428(Arg5427) {
  if (Arg5427.length < 1) return [shen_type_func, shen_user_lambda5428, 1, Arg5427];
  var Arg5427_0 = Arg5427[0];
  return (function() {
  return shenjs_call_tail(shen_curry, [Arg5427_0]);})},
  1,
  []], Arg5425_0[2]])]
  : (((shenjs_is_type(Arg5425_0, shen_type_cons) && (shenjs_is_type(Arg5425_0[2], shen_type_cons) && shenjs_call(shen_extraspecial$question$, [Arg5425_0[1]]))))
  ? Arg5425_0
  : (((shenjs_is_type(Arg5425_0, shen_type_cons) && (shenjs_is_type(Arg5425_0[2], shen_type_cons) && shenjs_is_type(Arg5425_0[2][2], shen_type_cons))))
  ? (function() {
  return shenjs_call_tail(shen_curry, [[shen_type_cons, [shen_type_cons, Arg5425_0[1], [shen_type_cons, Arg5425_0[2][1], []]], Arg5425_0[2][2]]]);})
  : (((shenjs_is_type(Arg5425_0, shen_type_cons) && (shenjs_is_type(Arg5425_0[2], shen_type_cons) && shenjs_empty$question$(Arg5425_0[2][2]))))
  ? [shen_type_cons, shenjs_call(shen_curry, [Arg5425_0[1]]), [shen_type_cons, shenjs_call(shen_curry, [Arg5425_0[2][1]]), []]]
  : Arg5425_0))))},
  1,
  [],
  "shen-curry"];
shenjs_functions["shen_shen-curry"] = shen_curry;






shen_special$question$ = [shen_type_func,
  function shen_user_lambda5430(Arg5429) {
  if (Arg5429.length < 1) return [shen_type_func, shen_user_lambda5430, 1, Arg5429];
  var Arg5429_0 = Arg5429[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5429_0, (shenjs_globals["shen_shen-*special*"])]);})},
  1,
  [],
  "shen-special?"];
shenjs_functions["shen_shen-special?"] = shen_special$question$;






shen_extraspecial$question$ = [shen_type_func,
  function shen_user_lambda5432(Arg5431) {
  if (Arg5431.length < 1) return [shen_type_func, shen_user_lambda5432, 1, Arg5431];
  var Arg5431_0 = Arg5431[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5431_0, (shenjs_globals["shen_shen-*extraspecial*"])]);})},
  1,
  [],
  "shen-extraspecial?"];
shenjs_functions["shen_shen-extraspecial?"] = shen_extraspecial$question$;






shen_t$asterisk$ = [shen_type_func,
  function shen_user_lambda5434(Arg5433) {
  if (Arg5433.length < 4) return [shen_type_func, shen_user_lambda5434, 4, Arg5433];
  var Arg5433_0 = Arg5433[0], Arg5433_1 = Arg5433[1], Arg5433_2 = Arg5433[2], Arg5433_3 = Arg5433[3];
  var R0, R1, R2, R3;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = ((R1 = shenjs_call(shen_newpv, [Arg5433_2])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_call(shen_maxinfexceeded$question$, []), Arg5433_2, (new Shenjs_freeze([R1, Arg5433_2, Arg5433_3, R0, Arg5433_0, Arg5433_1, Arg5433_2, Arg5433_3], function(Arg5435) {
  var Arg5435_0 = Arg5435[0], Arg5435_1 = Arg5435[1], Arg5435_2 = Arg5435[2], Arg5435_3 = Arg5435[3], Arg5435_4 = Arg5435[4], Arg5435_5 = Arg5435[5], Arg5435_6 = Arg5435[6], Arg5435_7 = Arg5435[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5435_0, shenjs_call(shen_errormaxinfs, []), Arg5435_1, Arg5435_2]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5433_0, Arg5433_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fail"], R1)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5433_2, (new Shenjs_freeze([R0, Arg5433_0, Arg5433_1, Arg5433_2, Arg5433_3], function(Arg5437) {
  var Arg5437_0 = Arg5437[0], Arg5437_1 = Arg5437[1], Arg5437_2 = Arg5437[2], Arg5437_3 = Arg5437[3], Arg5437_4 = Arg5437[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_prolog_failure, [Arg5437_3, Arg5437_4]);});})}))]))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5433_0, Arg5433_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5433_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[1], Arg5433_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg5433_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5433_2])),
  ((shenjs_empty$question$(R3))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5433_2, (new Shenjs_freeze([R0, R2, R1, Arg5433_0, Arg5433_1, Arg5433_2, Arg5433_3], function(Arg5439) {
  var Arg5439_0 = Arg5439[0], Arg5439_1 = Arg5439[1], Arg5439_2 = Arg5439[2], Arg5439_3 = Arg5439[3], Arg5439_4 = Arg5439[4], Arg5439_5 = Arg5439[5], Arg5439_6 = Arg5439[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5439_1, Arg5439_2, Arg5439_4, Arg5439_5, Arg5439_6]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5433_2])),
  (R0 = shenjs_call(shen_newpv, [Arg5433_2])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_show, [Arg5433_0, R1, Arg5433_2, (new Shenjs_freeze([R1, Arg5433_0, Arg5433_1, R0, Arg5433_2, Arg5433_3], function(Arg5441) {
  var Arg5441_0 = Arg5441[0], Arg5441_1 = Arg5441[1], Arg5441_2 = Arg5441[2], Arg5441_3 = Arg5441[3], Arg5441_4 = Arg5441[4], Arg5441_5 = Arg5441[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5441_3, (shenjs_globals["shen_shen-*datatypes*"]), Arg5441_4, (new Shenjs_freeze([Arg5441_1, Arg5441_2, Arg5441_3, Arg5441_4, Arg5441_5], function(Arg5443) {
  var Arg5443_0 = Arg5443[0], Arg5443_1 = Arg5443[1], Arg5443_2 = Arg5443[2], Arg5443_3 = Arg5443[3], Arg5443_4 = Arg5443[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_udefs$asterisk$, [Arg5443_0, Arg5443_1, Arg5443_2, Arg5443_3, Arg5443_4]);});})}))]);});})}))]))
  : R1))
  : R1))
  : R1))]);}))},
  4,
  [],
  "shen-t*"];
shenjs_functions["shen_shen-t*"] = shen_t$asterisk$;






shen_prolog_failure = [shen_type_func,
  function shen_user_lambda5446(Arg5445) {
  if (Arg5445.length < 2) return [shen_type_func, shen_user_lambda5446, 2, Arg5445];
  var Arg5445_0 = Arg5445[0], Arg5445_1 = Arg5445[1];
  return false},
  2,
  [],
  "shen-prolog-failure"];
shenjs_functions["shen_shen-prolog-failure"] = shen_prolog_failure;






shen_maxinfexceeded$question$ = [shen_type_func,
  function shen_user_lambda5448(Arg5447) {
  if (Arg5447.length < 0) return [shen_type_func, shen_user_lambda5448, 0, Arg5447];
  return (shenjs_call(shen_inferences, [[shen_type_symbol, "shen-skip"]]) > (shenjs_globals["shen_shen-*maxinferences*"]))},
  0,
  [],
  "shen-maxinfexceeded?"];
shenjs_functions["shen_shen-maxinfexceeded?"] = shen_maxinfexceeded$question$;






shen_errormaxinfs = [shen_type_func,
  function shen_user_lambda5450(Arg5449) {
  if (Arg5449.length < 0) return [shen_type_func, shen_user_lambda5450, 0, Arg5449];
  return (function() {
  return shenjs_simple_error("maximum inferences exceeded~%");})},
  0,
  [],
  "shen-errormaxinfs"];
shenjs_functions["shen_shen-errormaxinfs"] = shen_errormaxinfs;






shen_udefs$asterisk$ = [shen_type_func,
  function shen_user_lambda5452(Arg5451) {
  if (Arg5451.length < 5) return [shen_type_func, shen_user_lambda5452, 5, Arg5451];
  var Arg5451_0 = Arg5451[0], Arg5451_1 = Arg5451[1], Arg5451_2 = Arg5451[2], Arg5451_3 = Arg5451[3], Arg5451_4 = Arg5451[4];
  var R0;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5451_2, Arg5451_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R0 = R0[1]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_call, [[shen_type_cons, R0, [shen_type_cons, Arg5451_0, [shen_type_cons, Arg5451_1, []]]], Arg5451_3, Arg5451_4]))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5451_2, Arg5451_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_udefs$asterisk$, [Arg5451_0, Arg5451_1, R0, Arg5451_3, Arg5451_4]);}))
  : false))
  : R0))},
  5,
  [],
  "shen-udefs*"];
shenjs_functions["shen_shen-udefs*"] = shen_udefs$asterisk$;






shen_th$asterisk$ = [shen_type_func,
  function shen_user_lambda5454(Arg5453) {
  if (Arg5453.length < 5) return [shen_type_func, shen_user_lambda5454, 5, Arg5453];
  var Arg5453_0 = Arg5453[0], Arg5453_1 = Arg5453[1], Arg5453_2 = Arg5453[2], Arg5453_3 = Arg5453[3], Arg5453_4 = Arg5453[4];
  var R0, R1, R2, R3, R4, R5, R6, R7, R8;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_show, [[shen_type_cons, Arg5453_0, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5453_1, []]]], Arg5453_2, Arg5453_3, (new Shenjs_freeze([R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5455) {
  var Arg5455_0 = Arg5455[0], Arg5455_1 = Arg5455[1], Arg5455_2 = Arg5455[2], Arg5455_3 = Arg5455[3], Arg5455_4 = Arg5455[4], Arg5455_5 = Arg5455[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [false, Arg5455_4, Arg5455_5]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_call(shen_typedf$question$, [shenjs_call(shen_lazyderef, [Arg5453_0, Arg5453_3])]), Arg5453_3, (new Shenjs_freeze([Arg5453_0, R1, Arg5453_1, Arg5453_3, Arg5453_4, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5457) {
  var Arg5457_0 = Arg5457[0], Arg5457_1 = Arg5457[1], Arg5457_2 = Arg5457[2], Arg5457_3 = Arg5457[3], Arg5457_4 = Arg5457[4], Arg5457_5 = Arg5457[5], Arg5457_6 = Arg5457[6], Arg5457_7 = Arg5457[7], Arg5457_8 = Arg5457[8], Arg5457_9 = Arg5457[9], Arg5457_10 = Arg5457[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5457_1, shenjs_call(shen_sigf, [shenjs_call(shen_lazyderef, [Arg5457_0, Arg5457_3])]), Arg5457_3, (new Shenjs_freeze([Arg5457_0, Arg5457_1, Arg5457_2, Arg5457_3, Arg5457_4], function(Arg5459) {
  var Arg5459_0 = Arg5459[0], Arg5459_1 = Arg5459[1], Arg5459_2 = Arg5459[2], Arg5459_3 = Arg5459[3], Arg5459_4 = Arg5459[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_call, [[shen_type_cons, Arg5459_1, [shen_type_cons, Arg5459_2, []]], Arg5459_3, Arg5459_4]);});})}))]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_base, [Arg5453_0, Arg5453_1, Arg5453_3, Arg5453_4]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_by$_hypothesis, [Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5453_0, Arg5453_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5453_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R3 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5453_3])),
  ((shenjs_empty$question$(R1))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R2, [shen_type_cons, R1, [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, Arg5453_1, []]]], Arg5453_2, Arg5453_3, (new Shenjs_freeze([R2, Arg5453_1, R3, R1, Arg5453_2, Arg5453_3, Arg5453_4, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5461) {
  var Arg5461_0 = Arg5461[0], Arg5461_1 = Arg5461[1], Arg5461_2 = Arg5461[2], Arg5461_3 = Arg5461[3], Arg5461_4 = Arg5461[4], Arg5461_5 = Arg5461[5], Arg5461_6 = Arg5461[6], Arg5461_7 = Arg5461[7], Arg5461_8 = Arg5461[8], Arg5461_9 = Arg5461[9], Arg5461_10 = Arg5461[10], Arg5461_11 = Arg5461[11], Arg5461_12 = Arg5461[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5461_2, Arg5461_3, Arg5461_4, Arg5461_5, Arg5461_6]);});})}))]))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5453_0, Arg5453_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5453_1, Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "list"], R4)))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R4, shen_type_cons))
  ? ((R2 = R4[1]),
  (R4 = shenjs_call(shen_lazyderef, [R4[2], Arg5453_3])),
  ((shenjs_empty$question$(R4))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R3, R2, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5463) {
  var Arg5463_0 = Arg5463[0], Arg5463_1 = Arg5463[1], Arg5463_2 = Arg5463[2], Arg5463_3 = Arg5463[3], Arg5463_4 = Arg5463[4], Arg5463_5 = Arg5463[5], Arg5463_6 = Arg5463[6], Arg5463_7 = Arg5463[7], Arg5463_8 = Arg5463[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5463_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5463_2, []]], Arg5463_6, Arg5463_7, Arg5463_8]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [], Arg5453_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R3, R2, R4, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5465) {
  var Arg5465_0 = Arg5465[0], Arg5465_1 = Arg5465[1], Arg5465_2 = Arg5465[2], Arg5465_3 = Arg5465[3], Arg5465_4 = Arg5465[4], Arg5465_5 = Arg5465[5], Arg5465_6 = Arg5465[6], Arg5465_7 = Arg5465[7], Arg5465_8 = Arg5465[8], Arg5465_9 = Arg5465[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5465_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5465_2, []]], Arg5465_7, Arg5465_8, Arg5465_9]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg5453_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_bindv, [R4, [shen_type_cons, R2, []], Arg5453_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R3, R2, Arg5453_2, Arg5453_4, R4, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5467) {
  var Arg5467_0 = Arg5467[0], Arg5467_1 = Arg5467[1], Arg5467_2 = Arg5467[2], Arg5467_3 = Arg5467[3], Arg5467_4 = Arg5467[4], Arg5467_5 = Arg5467[5], Arg5467_6 = Arg5467[6], Arg5467_7 = Arg5467[7], Arg5467_8 = Arg5467[8], Arg5467_9 = Arg5467[9], Arg5467_10 = Arg5467[10], Arg5467_11 = Arg5467[11], Arg5467_12 = Arg5467[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5467_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5467_2, []]], Arg5467_3, Arg5467_6, Arg5467_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg5453_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [shen_type_symbol, "list"], Arg5453_3]),
  (R3 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R3, R5, R4, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5469) {
  var Arg5469_0 = Arg5469[0], Arg5469_1 = Arg5469[1], Arg5469_2 = Arg5469[2], Arg5469_3 = Arg5469[3], Arg5469_4 = Arg5469[4], Arg5469_5 = Arg5469[5], Arg5469_6 = Arg5469[6], Arg5469_7 = Arg5469[7], Arg5469_8 = Arg5469[8], Arg5469_9 = Arg5469[9], Arg5469_10 = Arg5469[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5469_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5469_2, []]], Arg5469_8, Arg5469_4, Arg5469_9]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg5453_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R3, R5, R2, R4, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5471) {
  var Arg5471_0 = Arg5471[0], Arg5471_1 = Arg5471[1], Arg5471_2 = Arg5471[2], Arg5471_3 = Arg5471[3], Arg5471_4 = Arg5471[4], Arg5471_5 = Arg5471[5], Arg5471_6 = Arg5471[6], Arg5471_7 = Arg5471[7], Arg5471_8 = Arg5471[8], Arg5471_9 = Arg5471[9], Arg5471_10 = Arg5471[10], Arg5471_11 = Arg5471[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5471_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5471_2, []]], Arg5471_9, Arg5471_5, Arg5471_10]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5453_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R5, []], Arg5453_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R3, R5, Arg5453_2, Arg5453_4, R2, Arg5453_3, R4, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5473) {
  var Arg5473_0 = Arg5473[0], Arg5473_1 = Arg5473[1], Arg5473_2 = Arg5473[2], Arg5473_3 = Arg5473[3], Arg5473_4 = Arg5473[4], Arg5473_5 = Arg5473[5], Arg5473_6 = Arg5473[6], Arg5473_7 = Arg5473[7], Arg5473_8 = Arg5473[8], Arg5473_9 = Arg5473[9], Arg5473_10 = Arg5473[10], Arg5473_11 = Arg5473[11], Arg5473_12 = Arg5473[12], Arg5473_13 = Arg5473[13], Arg5473_14 = Arg5473[14];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5473_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5473_2, []]], Arg5473_3, Arg5473_6, Arg5473_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5453_3]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R4, Arg5453_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, R4, []]], Arg5453_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R3, R4, Arg5453_2, Arg5453_4, R2, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5475) {
  var Arg5475_0 = Arg5475[0], Arg5475_1 = Arg5475[1], Arg5475_2 = Arg5475[2], Arg5475_3 = Arg5475[3], Arg5475_4 = Arg5475[4], Arg5475_5 = Arg5475[5], Arg5475_6 = Arg5475[6], Arg5475_7 = Arg5475[7], Arg5475_8 = Arg5475[8], Arg5475_9 = Arg5475[9], Arg5475_10 = Arg5475[10], Arg5475_11 = Arg5475[11], Arg5475_12 = Arg5475[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5475_1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, Arg5475_2, []]], Arg5475_3, Arg5475_6, Arg5475_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5453_3]),
  R4)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5453_0, Arg5453_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@p"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5453_1, Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R2[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "*"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R2 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg5453_3])),
  ((shenjs_empty$question$(R5))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R4, R3, R2, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5477) {
  var Arg5477_0 = Arg5477[0], Arg5477_1 = Arg5477[1], Arg5477_2 = Arg5477[2], Arg5477_3 = Arg5477[3], Arg5477_4 = Arg5477[4], Arg5477_5 = Arg5477[5], Arg5477_6 = Arg5477[6], Arg5477_7 = Arg5477[7], Arg5477_8 = Arg5477[8], Arg5477_9 = Arg5477[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5477_2, Arg5477_3, Arg5477_7, Arg5477_8, Arg5477_9]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg5453_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R4, R3, R2, R5, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5479) {
  var Arg5479_0 = Arg5479[0], Arg5479_1 = Arg5479[1], Arg5479_2 = Arg5479[2], Arg5479_3 = Arg5479[3], Arg5479_4 = Arg5479[4], Arg5479_5 = Arg5479[5], Arg5479_6 = Arg5479[6], Arg5479_7 = Arg5479[7], Arg5479_8 = Arg5479[8], Arg5479_9 = Arg5479[9], Arg5479_10 = Arg5479[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5479_2, Arg5479_3, Arg5479_8, Arg5479_9, Arg5479_10]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg5453_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, R2, []], Arg5453_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R4, R3, R2, Arg5453_2, Arg5453_4, R5, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5481) {
  var Arg5481_0 = Arg5481[0], Arg5481_1 = Arg5481[1], Arg5481_2 = Arg5481[2], Arg5481_3 = Arg5481[3], Arg5481_4 = Arg5481[4], Arg5481_5 = Arg5481[5], Arg5481_6 = Arg5481[6], Arg5481_7 = Arg5481[7], Arg5481_8 = Arg5481[8], Arg5481_9 = Arg5481[9], Arg5481_10 = Arg5481[10], Arg5481_11 = Arg5481[11], Arg5481_12 = Arg5481[12], Arg5481_13 = Arg5481[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5481_2, Arg5481_3, Arg5481_4, Arg5481_7, Arg5481_5]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg5453_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [shen_type_symbol, "*"], Arg5453_3]),
  (R4 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R6 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R4, R3, R6, R5, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5483) {
  var Arg5483_0 = Arg5483[0], Arg5483_1 = Arg5483[1], Arg5483_2 = Arg5483[2], Arg5483_3 = Arg5483[3], Arg5483_4 = Arg5483[4], Arg5483_5 = Arg5483[5], Arg5483_6 = Arg5483[6], Arg5483_7 = Arg5483[7], Arg5483_8 = Arg5483[8], Arg5483_9 = Arg5483[9], Arg5483_10 = Arg5483[10], Arg5483_11 = Arg5483[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5483_2, Arg5483_3, Arg5483_9, Arg5483_5, Arg5483_10]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg5453_3]),
  (R6 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R4, R3, R6, R2, R5, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5485) {
  var Arg5485_0 = Arg5485[0], Arg5485_1 = Arg5485[1], Arg5485_2 = Arg5485[2], Arg5485_3 = Arg5485[3], Arg5485_4 = Arg5485[4], Arg5485_5 = Arg5485[5], Arg5485_6 = Arg5485[6], Arg5485_7 = Arg5485[7], Arg5485_8 = Arg5485[8], Arg5485_9 = Arg5485[9], Arg5485_10 = Arg5485[10], Arg5485_11 = Arg5485[11], Arg5485_12 = Arg5485[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5485_2, Arg5485_3, Arg5485_10, Arg5485_6, Arg5485_11]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5453_3]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R6, []], Arg5453_3]),
  (R6 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R4, R3, R6, Arg5453_2, Arg5453_4, R2, Arg5453_3, R5, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5487) {
  var Arg5487_0 = Arg5487[0], Arg5487_1 = Arg5487[1], Arg5487_2 = Arg5487[2], Arg5487_3 = Arg5487[3], Arg5487_4 = Arg5487[4], Arg5487_5 = Arg5487[5], Arg5487_6 = Arg5487[6], Arg5487_7 = Arg5487[7], Arg5487_8 = Arg5487[8], Arg5487_9 = Arg5487[9], Arg5487_10 = Arg5487[10], Arg5487_11 = Arg5487[11], Arg5487_12 = Arg5487[12], Arg5487_13 = Arg5487[13], Arg5487_14 = Arg5487[14], Arg5487_15 = Arg5487[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5487_2, Arg5487_3, Arg5487_4, Arg5487_7, Arg5487_5]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5453_3]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5453_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, R5, []]], Arg5453_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R4, R3, R5, Arg5453_2, Arg5453_4, R2, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5489) {
  var Arg5489_0 = Arg5489[0], Arg5489_1 = Arg5489[1], Arg5489_2 = Arg5489[2], Arg5489_3 = Arg5489[3], Arg5489_4 = Arg5489[4], Arg5489_5 = Arg5489[5], Arg5489_6 = Arg5489[6], Arg5489_7 = Arg5489[7], Arg5489_8 = Arg5489[8], Arg5489_9 = Arg5489[9], Arg5489_10 = Arg5489[10], Arg5489_11 = Arg5489[11], Arg5489_12 = Arg5489[12], Arg5489_13 = Arg5489[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5489_2, Arg5489_3, Arg5489_4, Arg5489_7, Arg5489_5]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5453_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg5453_3])),
  (R5 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R4, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, R5, []]]], Arg5453_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R4, R3, R5, Arg5453_2, Arg5453_4, R2, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5491) {
  var Arg5491_0 = Arg5491[0], Arg5491_1 = Arg5491[1], Arg5491_2 = Arg5491[2], Arg5491_3 = Arg5491[3], Arg5491_4 = Arg5491[4], Arg5491_5 = Arg5491[5], Arg5491_6 = Arg5491[6], Arg5491_7 = Arg5491[7], Arg5491_8 = Arg5491[8], Arg5491_9 = Arg5491[9], Arg5491_10 = Arg5491[10], Arg5491_11 = Arg5491[11], Arg5491_12 = Arg5491[12], Arg5491_13 = Arg5491[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5491_2, Arg5491_3, Arg5491_4, Arg5491_7, Arg5491_5]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5453_3]),
  R5)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5453_0, Arg5453_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@v"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5453_1, Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "vector"], R4)))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R4, shen_type_cons))
  ? ((R2 = R4[1]),
  (R4 = shenjs_call(shen_lazyderef, [R4[2], Arg5453_3])),
  ((shenjs_empty$question$(R4))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R3, R2, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5493) {
  var Arg5493_0 = Arg5493[0], Arg5493_1 = Arg5493[1], Arg5493_2 = Arg5493[2], Arg5493_3 = Arg5493[3], Arg5493_4 = Arg5493[4], Arg5493_5 = Arg5493[5], Arg5493_6 = Arg5493[6], Arg5493_7 = Arg5493[7], Arg5493_8 = Arg5493[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5493_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5493_2, []]], Arg5493_6, Arg5493_7, Arg5493_8]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [], Arg5453_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R3, R2, R4, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5495) {
  var Arg5495_0 = Arg5495[0], Arg5495_1 = Arg5495[1], Arg5495_2 = Arg5495[2], Arg5495_3 = Arg5495[3], Arg5495_4 = Arg5495[4], Arg5495_5 = Arg5495[5], Arg5495_6 = Arg5495[6], Arg5495_7 = Arg5495[7], Arg5495_8 = Arg5495[8], Arg5495_9 = Arg5495[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5495_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5495_2, []]], Arg5495_7, Arg5495_8, Arg5495_9]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg5453_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_bindv, [R4, [shen_type_cons, R2, []], Arg5453_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R2, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R3, R2, Arg5453_2, Arg5453_4, R4, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5497) {
  var Arg5497_0 = Arg5497[0], Arg5497_1 = Arg5497[1], Arg5497_2 = Arg5497[2], Arg5497_3 = Arg5497[3], Arg5497_4 = Arg5497[4], Arg5497_5 = Arg5497[5], Arg5497_6 = Arg5497[6], Arg5497_7 = Arg5497[7], Arg5497_8 = Arg5497[8], Arg5497_9 = Arg5497[9], Arg5497_10 = Arg5497[10], Arg5497_11 = Arg5497[11], Arg5497_12 = Arg5497[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5497_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5497_2, []]], Arg5497_3, Arg5497_6, Arg5497_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg5453_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [shen_type_symbol, "vector"], Arg5453_3]),
  (R3 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R3, R5, R4, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5499) {
  var Arg5499_0 = Arg5499[0], Arg5499_1 = Arg5499[1], Arg5499_2 = Arg5499[2], Arg5499_3 = Arg5499[3], Arg5499_4 = Arg5499[4], Arg5499_5 = Arg5499[5], Arg5499_6 = Arg5499[6], Arg5499_7 = Arg5499[7], Arg5499_8 = Arg5499[8], Arg5499_9 = Arg5499[9], Arg5499_10 = Arg5499[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5499_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5499_2, []]], Arg5499_8, Arg5499_4, Arg5499_9]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg5453_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R3, R5, R2, R4, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5501) {
  var Arg5501_0 = Arg5501[0], Arg5501_1 = Arg5501[1], Arg5501_2 = Arg5501[2], Arg5501_3 = Arg5501[3], Arg5501_4 = Arg5501[4], Arg5501_5 = Arg5501[5], Arg5501_6 = Arg5501[6], Arg5501_7 = Arg5501[7], Arg5501_8 = Arg5501[8], Arg5501_9 = Arg5501[9], Arg5501_10 = Arg5501[10], Arg5501_11 = Arg5501[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5501_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5501_2, []]], Arg5501_9, Arg5501_5, Arg5501_10]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5453_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R5, []], Arg5453_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R5, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R3, R5, Arg5453_2, Arg5453_4, R2, Arg5453_3, R4, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5503) {
  var Arg5503_0 = Arg5503[0], Arg5503_1 = Arg5503[1], Arg5503_2 = Arg5503[2], Arg5503_3 = Arg5503[3], Arg5503_4 = Arg5503[4], Arg5503_5 = Arg5503[5], Arg5503_6 = Arg5503[6], Arg5503_7 = Arg5503[7], Arg5503_8 = Arg5503[8], Arg5503_9 = Arg5503[9], Arg5503_10 = Arg5503[10], Arg5503_11 = Arg5503[11], Arg5503_12 = Arg5503[12], Arg5503_13 = Arg5503[13], Arg5503_14 = Arg5503[14];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5503_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5503_2, []]], Arg5503_3, Arg5503_6, Arg5503_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5453_3]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R4, Arg5453_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, R4, []]], Arg5453_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, R4, Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R3, R4, Arg5453_2, Arg5453_4, R2, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5505) {
  var Arg5505_0 = Arg5505[0], Arg5505_1 = Arg5505[1], Arg5505_2 = Arg5505[2], Arg5505_3 = Arg5505[3], Arg5505_4 = Arg5505[4], Arg5505_5 = Arg5505[5], Arg5505_6 = Arg5505[6], Arg5505_7 = Arg5505[7], Arg5505_8 = Arg5505[8], Arg5505_9 = Arg5505[9], Arg5505_10 = Arg5505[10], Arg5505_11 = Arg5505[11], Arg5505_12 = Arg5505[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5505_1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, Arg5505_2, []]], Arg5505_3, Arg5505_6, Arg5505_4]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5453_3]),
  R4)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5453_0, Arg5453_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5453_1, Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "string"], R2)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, [shen_type_symbol, "string"], Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5507) {
  var Arg5507_0 = Arg5507[0], Arg5507_1 = Arg5507[1], Arg5507_2 = Arg5507[2], Arg5507_3 = Arg5507[3], Arg5507_4 = Arg5507[4], Arg5507_5 = Arg5507[5], Arg5507_6 = Arg5507[6], Arg5507_7 = Arg5507[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5507_1, [shen_type_symbol, "string"], Arg5507_5, Arg5507_6, Arg5507_7]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [shen_type_symbol, "string"], Arg5453_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_th$asterisk$, [R1, [shen_type_symbol, "string"], Arg5453_2, Arg5453_3, (new Shenjs_freeze([R1, R3, R2, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5509) {
  var Arg5509_0 = Arg5509[0], Arg5509_1 = Arg5509[1], Arg5509_2 = Arg5509[2], Arg5509_3 = Arg5509[3], Arg5509_4 = Arg5509[4], Arg5509_5 = Arg5509[5], Arg5509_6 = Arg5509[6], Arg5509_7 = Arg5509[7], Arg5509_8 = Arg5509[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5509_1, [shen_type_symbol, "string"], Arg5509_6, Arg5509_7, Arg5509_8]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5453_3]),
  R3)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5453_0, Arg5453_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "lambda"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5453_1, Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R2[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-->"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R2 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg5453_3])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5453_3])),
  (R6 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5453_3, (new Shenjs_freeze([R0, R1, R3, R5, R2, R6, R4, Arg5453_2, Arg5453_3, Arg5453_4, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5511) {
  var Arg5511_0 = Arg5511[0], Arg5511_1 = Arg5511[1], Arg5511_2 = Arg5511[2], Arg5511_3 = Arg5511[3], Arg5511_4 = Arg5511[4], Arg5511_5 = Arg5511[5], Arg5511_6 = Arg5511[6], Arg5511_7 = Arg5511[7], Arg5511_8 = Arg5511[8], Arg5511_9 = Arg5511[9], Arg5511_10 = Arg5511[10], Arg5511_11 = Arg5511[11], Arg5511_12 = Arg5511[12], Arg5511_13 = Arg5511[13], Arg5511_14 = Arg5511[14], Arg5511_15 = Arg5511[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5511_5, shenjs_call(shen_placeholder, []), Arg5511_8, (new Shenjs_freeze([Arg5511_1, Arg5511_2, Arg5511_3, Arg5511_4, Arg5511_5, Arg5511_6, Arg5511_7, Arg5511_8, Arg5511_9], function(Arg5513) {
  var Arg5513_0 = Arg5513[0], Arg5513_1 = Arg5513[1], Arg5513_2 = Arg5513[2], Arg5513_3 = Arg5513[3], Arg5513_4 = Arg5513[4], Arg5513_5 = Arg5513[5], Arg5513_6 = Arg5513[6], Arg5513_7 = Arg5513[7], Arg5513_8 = Arg5513[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5513_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5513_4, Arg5513_7]), shenjs_call(shen_lazyderef, [Arg5513_0, Arg5513_7]), shenjs_call(shen_lazyderef, [Arg5513_1, Arg5513_7])]), Arg5513_7, (new Shenjs_freeze([Arg5513_0, Arg5513_1, Arg5513_2, Arg5513_3, Arg5513_4, Arg5513_5, Arg5513_6, Arg5513_7, Arg5513_8], function(Arg5515) {
  var Arg5515_0 = Arg5515[0], Arg5515_1 = Arg5515[1], Arg5515_2 = Arg5515[2], Arg5515_3 = Arg5515[3], Arg5515_4 = Arg5515[4], Arg5515_5 = Arg5515[5], Arg5515_6 = Arg5515[6], Arg5515_7 = Arg5515[7], Arg5515_8 = Arg5515[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5515_2, Arg5515_3, [shen_type_cons, [shen_type_cons, Arg5515_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5515_5, []]]], Arg5515_6], Arg5515_7, Arg5515_8]);});})}))]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg5453_3]),
  (R4 = ((R6 = shenjs_call(shen_newpv, [Arg5453_3])),
  (R7 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5453_3, (new Shenjs_freeze([R0, R1, R3, R6, R2, R7, R4, Arg5453_2, Arg5453_3, Arg5453_4, R5, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5517) {
  var Arg5517_0 = Arg5517[0], Arg5517_1 = Arg5517[1], Arg5517_2 = Arg5517[2], Arg5517_3 = Arg5517[3], Arg5517_4 = Arg5517[4], Arg5517_5 = Arg5517[5], Arg5517_6 = Arg5517[6], Arg5517_7 = Arg5517[7], Arg5517_8 = Arg5517[8], Arg5517_9 = Arg5517[9], Arg5517_10 = Arg5517[10], Arg5517_11 = Arg5517[11], Arg5517_12 = Arg5517[12], Arg5517_13 = Arg5517[13], Arg5517_14 = Arg5517[14], Arg5517_15 = Arg5517[15], Arg5517_16 = Arg5517[16], Arg5517_17 = Arg5517[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5517_5, shenjs_call(shen_placeholder, []), Arg5517_8, (new Shenjs_freeze([Arg5517_1, Arg5517_2, Arg5517_3, Arg5517_4, Arg5517_5, Arg5517_6, Arg5517_7, Arg5517_8, Arg5517_9], function(Arg5519) {
  var Arg5519_0 = Arg5519[0], Arg5519_1 = Arg5519[1], Arg5519_2 = Arg5519[2], Arg5519_3 = Arg5519[3], Arg5519_4 = Arg5519[4], Arg5519_5 = Arg5519[5], Arg5519_6 = Arg5519[6], Arg5519_7 = Arg5519[7], Arg5519_8 = Arg5519[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5519_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5519_4, Arg5519_7]), shenjs_call(shen_lazyderef, [Arg5519_0, Arg5519_7]), shenjs_call(shen_lazyderef, [Arg5519_1, Arg5519_7])]), Arg5519_7, (new Shenjs_freeze([Arg5519_0, Arg5519_1, Arg5519_2, Arg5519_3, Arg5519_4, Arg5519_5, Arg5519_6, Arg5519_7, Arg5519_8], function(Arg5521) {
  var Arg5521_0 = Arg5521[0], Arg5521_1 = Arg5521[1], Arg5521_2 = Arg5521[2], Arg5521_3 = Arg5521[3], Arg5521_4 = Arg5521[4], Arg5521_5 = Arg5521[5], Arg5521_6 = Arg5521[6], Arg5521_7 = Arg5521[7], Arg5521_8 = Arg5521[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5521_2, Arg5521_3, [shen_type_cons, [shen_type_cons, Arg5521_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5521_5, []]]], Arg5521_6], Arg5521_7, Arg5521_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg5453_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, R2, []], Arg5453_3]),
  (R4 = ((R6 = shenjs_call(shen_newpv, [Arg5453_3])),
  (R7 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5453_3, (new Shenjs_freeze([R0, R1, R3, R6, R2, R7, R4, Arg5453_2, Arg5453_3, Arg5453_4, R5, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5523) {
  var Arg5523_0 = Arg5523[0], Arg5523_1 = Arg5523[1], Arg5523_2 = Arg5523[2], Arg5523_3 = Arg5523[3], Arg5523_4 = Arg5523[4], Arg5523_5 = Arg5523[5], Arg5523_6 = Arg5523[6], Arg5523_7 = Arg5523[7], Arg5523_8 = Arg5523[8], Arg5523_9 = Arg5523[9], Arg5523_10 = Arg5523[10], Arg5523_11 = Arg5523[11], Arg5523_12 = Arg5523[12], Arg5523_13 = Arg5523[13], Arg5523_14 = Arg5523[14], Arg5523_15 = Arg5523[15], Arg5523_16 = Arg5523[16], Arg5523_17 = Arg5523[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5523_5, shenjs_call(shen_placeholder, []), Arg5523_8, (new Shenjs_freeze([Arg5523_1, Arg5523_2, Arg5523_3, Arg5523_4, Arg5523_5, Arg5523_6, Arg5523_7, Arg5523_8, Arg5523_9], function(Arg5525) {
  var Arg5525_0 = Arg5525[0], Arg5525_1 = Arg5525[1], Arg5525_2 = Arg5525[2], Arg5525_3 = Arg5525[3], Arg5525_4 = Arg5525[4], Arg5525_5 = Arg5525[5], Arg5525_6 = Arg5525[6], Arg5525_7 = Arg5525[7], Arg5525_8 = Arg5525[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5525_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5525_4, Arg5525_7]), shenjs_call(shen_lazyderef, [Arg5525_0, Arg5525_7]), shenjs_call(shen_lazyderef, [Arg5525_1, Arg5525_7])]), Arg5525_7, (new Shenjs_freeze([Arg5525_0, Arg5525_1, Arg5525_2, Arg5525_3, Arg5525_4, Arg5525_5, Arg5525_6, Arg5525_7, Arg5525_8], function(Arg5527) {
  var Arg5527_0 = Arg5527[0], Arg5527_1 = Arg5527[1], Arg5527_2 = Arg5527[2], Arg5527_3 = Arg5527[3], Arg5527_4 = Arg5527[4], Arg5527_5 = Arg5527[5], Arg5527_6 = Arg5527[6], Arg5527_7 = Arg5527[7], Arg5527_8 = Arg5527[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5527_2, Arg5527_3, [shen_type_cons, [shen_type_cons, Arg5527_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5527_5, []]]], Arg5527_6], Arg5527_7, Arg5527_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg5453_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [shen_type_symbol, "-->"], Arg5453_3]),
  (R4 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R6 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5453_3])),
  (R7 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5453_3, (new Shenjs_freeze([R0, R1, R3, R2, R6, R7, R4, Arg5453_2, Arg5453_3, Arg5453_4, R5, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5529) {
  var Arg5529_0 = Arg5529[0], Arg5529_1 = Arg5529[1], Arg5529_2 = Arg5529[2], Arg5529_3 = Arg5529[3], Arg5529_4 = Arg5529[4], Arg5529_5 = Arg5529[5], Arg5529_6 = Arg5529[6], Arg5529_7 = Arg5529[7], Arg5529_8 = Arg5529[8], Arg5529_9 = Arg5529[9], Arg5529_10 = Arg5529[10], Arg5529_11 = Arg5529[11], Arg5529_12 = Arg5529[12], Arg5529_13 = Arg5529[13], Arg5529_14 = Arg5529[14], Arg5529_15 = Arg5529[15], Arg5529_16 = Arg5529[16], Arg5529_17 = Arg5529[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5529_5, shenjs_call(shen_placeholder, []), Arg5529_8, (new Shenjs_freeze([Arg5529_1, Arg5529_2, Arg5529_3, Arg5529_4, Arg5529_5, Arg5529_6, Arg5529_7, Arg5529_8, Arg5529_9], function(Arg5531) {
  var Arg5531_0 = Arg5531[0], Arg5531_1 = Arg5531[1], Arg5531_2 = Arg5531[2], Arg5531_3 = Arg5531[3], Arg5531_4 = Arg5531[4], Arg5531_5 = Arg5531[5], Arg5531_6 = Arg5531[6], Arg5531_7 = Arg5531[7], Arg5531_8 = Arg5531[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5531_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5531_4, Arg5531_7]), shenjs_call(shen_lazyderef, [Arg5531_0, Arg5531_7]), shenjs_call(shen_lazyderef, [Arg5531_1, Arg5531_7])]), Arg5531_7, (new Shenjs_freeze([Arg5531_0, Arg5531_1, Arg5531_2, Arg5531_3, Arg5531_4, Arg5531_5, Arg5531_6, Arg5531_7, Arg5531_8], function(Arg5533) {
  var Arg5533_0 = Arg5533[0], Arg5533_1 = Arg5533[1], Arg5533_2 = Arg5533[2], Arg5533_3 = Arg5533[3], Arg5533_4 = Arg5533[4], Arg5533_5 = Arg5533[5], Arg5533_6 = Arg5533[6], Arg5533_7 = Arg5533[7], Arg5533_8 = Arg5533[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5533_2, Arg5533_3, [shen_type_cons, [shen_type_cons, Arg5533_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5533_5, []]]], Arg5533_6], Arg5533_7, Arg5533_8]);});})}))]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg5453_3]),
  (R6 = ((R7 = shenjs_call(shen_newpv, [Arg5453_3])),
  (R8 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5453_3, (new Shenjs_freeze([R0, R1, R3, R7, R6, R8, R4, Arg5453_2, Arg5453_3, Arg5453_4, R2, Arg5453_3, R5, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5535) {
  var Arg5535_0 = Arg5535[0], Arg5535_1 = Arg5535[1], Arg5535_2 = Arg5535[2], Arg5535_3 = Arg5535[3], Arg5535_4 = Arg5535[4], Arg5535_5 = Arg5535[5], Arg5535_6 = Arg5535[6], Arg5535_7 = Arg5535[7], Arg5535_8 = Arg5535[8], Arg5535_9 = Arg5535[9], Arg5535_10 = Arg5535[10], Arg5535_11 = Arg5535[11], Arg5535_12 = Arg5535[12], Arg5535_13 = Arg5535[13], Arg5535_14 = Arg5535[14], Arg5535_15 = Arg5535[15], Arg5535_16 = Arg5535[16], Arg5535_17 = Arg5535[17], Arg5535_18 = Arg5535[18], Arg5535_19 = Arg5535[19];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5535_5, shenjs_call(shen_placeholder, []), Arg5535_8, (new Shenjs_freeze([Arg5535_1, Arg5535_2, Arg5535_3, Arg5535_4, Arg5535_5, Arg5535_6, Arg5535_7, Arg5535_8, Arg5535_9], function(Arg5537) {
  var Arg5537_0 = Arg5537[0], Arg5537_1 = Arg5537[1], Arg5537_2 = Arg5537[2], Arg5537_3 = Arg5537[3], Arg5537_4 = Arg5537[4], Arg5537_5 = Arg5537[5], Arg5537_6 = Arg5537[6], Arg5537_7 = Arg5537[7], Arg5537_8 = Arg5537[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5537_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5537_4, Arg5537_7]), shenjs_call(shen_lazyderef, [Arg5537_0, Arg5537_7]), shenjs_call(shen_lazyderef, [Arg5537_1, Arg5537_7])]), Arg5537_7, (new Shenjs_freeze([Arg5537_0, Arg5537_1, Arg5537_2, Arg5537_3, Arg5537_4, Arg5537_5, Arg5537_6, Arg5537_7, Arg5537_8], function(Arg5539) {
  var Arg5539_0 = Arg5539[0], Arg5539_1 = Arg5539[1], Arg5539_2 = Arg5539[2], Arg5539_3 = Arg5539[3], Arg5539_4 = Arg5539[4], Arg5539_5 = Arg5539[5], Arg5539_6 = Arg5539[6], Arg5539_7 = Arg5539[7], Arg5539_8 = Arg5539[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5539_2, Arg5539_3, [shen_type_cons, [shen_type_cons, Arg5539_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5539_5, []]]], Arg5539_6], Arg5539_7, Arg5539_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5453_3]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R6, []], Arg5453_3]),
  (R6 = ((R7 = shenjs_call(shen_newpv, [Arg5453_3])),
  (R8 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5453_3, (new Shenjs_freeze([R0, R1, R3, R7, R6, R8, R4, Arg5453_2, Arg5453_3, Arg5453_4, R2, Arg5453_3, R5, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5541) {
  var Arg5541_0 = Arg5541[0], Arg5541_1 = Arg5541[1], Arg5541_2 = Arg5541[2], Arg5541_3 = Arg5541[3], Arg5541_4 = Arg5541[4], Arg5541_5 = Arg5541[5], Arg5541_6 = Arg5541[6], Arg5541_7 = Arg5541[7], Arg5541_8 = Arg5541[8], Arg5541_9 = Arg5541[9], Arg5541_10 = Arg5541[10], Arg5541_11 = Arg5541[11], Arg5541_12 = Arg5541[12], Arg5541_13 = Arg5541[13], Arg5541_14 = Arg5541[14], Arg5541_15 = Arg5541[15], Arg5541_16 = Arg5541[16], Arg5541_17 = Arg5541[17], Arg5541_18 = Arg5541[18], Arg5541_19 = Arg5541[19];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5541_5, shenjs_call(shen_placeholder, []), Arg5541_8, (new Shenjs_freeze([Arg5541_1, Arg5541_2, Arg5541_3, Arg5541_4, Arg5541_5, Arg5541_6, Arg5541_7, Arg5541_8, Arg5541_9], function(Arg5543) {
  var Arg5543_0 = Arg5543[0], Arg5543_1 = Arg5543[1], Arg5543_2 = Arg5543[2], Arg5543_3 = Arg5543[3], Arg5543_4 = Arg5543[4], Arg5543_5 = Arg5543[5], Arg5543_6 = Arg5543[6], Arg5543_7 = Arg5543[7], Arg5543_8 = Arg5543[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5543_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5543_4, Arg5543_7]), shenjs_call(shen_lazyderef, [Arg5543_0, Arg5543_7]), shenjs_call(shen_lazyderef, [Arg5543_1, Arg5543_7])]), Arg5543_7, (new Shenjs_freeze([Arg5543_0, Arg5543_1, Arg5543_2, Arg5543_3, Arg5543_4, Arg5543_5, Arg5543_6, Arg5543_7, Arg5543_8], function(Arg5545) {
  var Arg5545_0 = Arg5545[0], Arg5545_1 = Arg5545[1], Arg5545_2 = Arg5545[2], Arg5545_3 = Arg5545[3], Arg5545_4 = Arg5545[4], Arg5545_5 = Arg5545[5], Arg5545_6 = Arg5545[6], Arg5545_7 = Arg5545[7], Arg5545_8 = Arg5545[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5545_2, Arg5545_3, [shen_type_cons, [shen_type_cons, Arg5545_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5545_5, []]]], Arg5545_6], Arg5545_7, Arg5545_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5453_3]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5453_3]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, R5, []]], Arg5453_3]),
  (R5 = ((R6 = shenjs_call(shen_newpv, [Arg5453_3])),
  (R7 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5453_3, (new Shenjs_freeze([R0, R1, R3, R6, R5, R7, R4, Arg5453_2, Arg5453_3, Arg5453_4, R2, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5547) {
  var Arg5547_0 = Arg5547[0], Arg5547_1 = Arg5547[1], Arg5547_2 = Arg5547[2], Arg5547_3 = Arg5547[3], Arg5547_4 = Arg5547[4], Arg5547_5 = Arg5547[5], Arg5547_6 = Arg5547[6], Arg5547_7 = Arg5547[7], Arg5547_8 = Arg5547[8], Arg5547_9 = Arg5547[9], Arg5547_10 = Arg5547[10], Arg5547_11 = Arg5547[11], Arg5547_12 = Arg5547[12], Arg5547_13 = Arg5547[13], Arg5547_14 = Arg5547[14], Arg5547_15 = Arg5547[15], Arg5547_16 = Arg5547[16], Arg5547_17 = Arg5547[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5547_5, shenjs_call(shen_placeholder, []), Arg5547_8, (new Shenjs_freeze([Arg5547_1, Arg5547_2, Arg5547_3, Arg5547_4, Arg5547_5, Arg5547_6, Arg5547_7, Arg5547_8, Arg5547_9], function(Arg5549) {
  var Arg5549_0 = Arg5549[0], Arg5549_1 = Arg5549[1], Arg5549_2 = Arg5549[2], Arg5549_3 = Arg5549[3], Arg5549_4 = Arg5549[4], Arg5549_5 = Arg5549[5], Arg5549_6 = Arg5549[6], Arg5549_7 = Arg5549[7], Arg5549_8 = Arg5549[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5549_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5549_4, Arg5549_7]), shenjs_call(shen_lazyderef, [Arg5549_0, Arg5549_7]), shenjs_call(shen_lazyderef, [Arg5549_1, Arg5549_7])]), Arg5549_7, (new Shenjs_freeze([Arg5549_0, Arg5549_1, Arg5549_2, Arg5549_3, Arg5549_4, Arg5549_5, Arg5549_6, Arg5549_7, Arg5549_8], function(Arg5551) {
  var Arg5551_0 = Arg5551[0], Arg5551_1 = Arg5551[1], Arg5551_2 = Arg5551[2], Arg5551_3 = Arg5551[3], Arg5551_4 = Arg5551[4], Arg5551_5 = Arg5551[5], Arg5551_6 = Arg5551[6], Arg5551_7 = Arg5551[7], Arg5551_8 = Arg5551[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5551_2, Arg5551_3, [shen_type_cons, [shen_type_cons, Arg5551_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5551_5, []]]], Arg5551_6], Arg5551_7, Arg5551_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5453_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg5453_3])),
  (R5 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R4, [shen_type_cons, [shen_type_symbol, "-->"], [shen_type_cons, R5, []]]], Arg5453_3]),
  (R5 = ((R6 = shenjs_call(shen_newpv, [Arg5453_3])),
  (R7 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5453_3, (new Shenjs_freeze([R0, R1, R3, R6, R5, R7, R4, Arg5453_2, Arg5453_3, Arg5453_4, R2, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5553) {
  var Arg5553_0 = Arg5553[0], Arg5553_1 = Arg5553[1], Arg5553_2 = Arg5553[2], Arg5553_3 = Arg5553[3], Arg5553_4 = Arg5553[4], Arg5553_5 = Arg5553[5], Arg5553_6 = Arg5553[6], Arg5553_7 = Arg5553[7], Arg5553_8 = Arg5553[8], Arg5553_9 = Arg5553[9], Arg5553_10 = Arg5553[10], Arg5553_11 = Arg5553[11], Arg5553_12 = Arg5553[12], Arg5553_13 = Arg5553[13], Arg5553_14 = Arg5553[14], Arg5553_15 = Arg5553[15], Arg5553_16 = Arg5553[16], Arg5553_17 = Arg5553[17];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5553_5, shenjs_call(shen_placeholder, []), Arg5553_8, (new Shenjs_freeze([Arg5553_1, Arg5553_2, Arg5553_3, Arg5553_4, Arg5553_5, Arg5553_6, Arg5553_7, Arg5553_8, Arg5553_9], function(Arg5555) {
  var Arg5555_0 = Arg5555[0], Arg5555_1 = Arg5555[1], Arg5555_2 = Arg5555[2], Arg5555_3 = Arg5555[3], Arg5555_4 = Arg5555[4], Arg5555_5 = Arg5555[5], Arg5555_6 = Arg5555[6], Arg5555_7 = Arg5555[7], Arg5555_8 = Arg5555[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5555_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5555_4, Arg5555_7]), shenjs_call(shen_lazyderef, [Arg5555_0, Arg5555_7]), shenjs_call(shen_lazyderef, [Arg5555_1, Arg5555_7])]), Arg5555_7, (new Shenjs_freeze([Arg5555_0, Arg5555_1, Arg5555_2, Arg5555_3, Arg5555_4, Arg5555_5, Arg5555_6, Arg5555_7, Arg5555_8], function(Arg5557) {
  var Arg5557_0 = Arg5557[0], Arg5557_1 = Arg5557[1], Arg5557_2 = Arg5557[2], Arg5557_3 = Arg5557[3], Arg5557_4 = Arg5557[4], Arg5557_5 = Arg5557[5], Arg5557_6 = Arg5557[6], Arg5557_7 = Arg5557[7], Arg5557_8 = Arg5557[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5557_2, Arg5557_3, [shen_type_cons, [shen_type_cons, Arg5557_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5557_5, []]]], Arg5557_6], Arg5557_7, Arg5557_8]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5453_3]),
  R5)
  : false)))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5453_0, Arg5453_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "let"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5453_3])),
  (R5 = shenjs_call(shen_newpv, [Arg5453_3])),
  (R6 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5453_3, (new Shenjs_freeze([R0, R3, R1, R4, R2, Arg5453_1, R5, R6, Arg5453_2, Arg5453_3, Arg5453_4, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5559) {
  var Arg5559_0 = Arg5559[0], Arg5559_1 = Arg5559[1], Arg5559_2 = Arg5559[2], Arg5559_3 = Arg5559[3], Arg5559_4 = Arg5559[4], Arg5559_5 = Arg5559[5], Arg5559_6 = Arg5559[6], Arg5559_7 = Arg5559[7], Arg5559_8 = Arg5559[8], Arg5559_9 = Arg5559[9], Arg5559_10 = Arg5559[10], Arg5559_11 = Arg5559[11], Arg5559_12 = Arg5559[12], Arg5559_13 = Arg5559[13], Arg5559_14 = Arg5559[14], Arg5559_15 = Arg5559[15], Arg5559_16 = Arg5559[16];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5559_1, Arg5559_7, Arg5559_8, Arg5559_9, (new Shenjs_freeze([Arg5559_1, Arg5559_2, Arg5559_3, Arg5559_4, Arg5559_5, Arg5559_6, Arg5559_7, Arg5559_8, Arg5559_9, Arg5559_10], function(Arg5561) {
  var Arg5561_0 = Arg5561[0], Arg5561_1 = Arg5561[1], Arg5561_2 = Arg5561[2], Arg5561_3 = Arg5561[3], Arg5561_4 = Arg5561[4], Arg5561_5 = Arg5561[5], Arg5561_6 = Arg5561[6], Arg5561_7 = Arg5561[7], Arg5561_8 = Arg5561[8], Arg5561_9 = Arg5561[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5561_5, shenjs_call(shen_placeholder, []), Arg5561_8, (new Shenjs_freeze([Arg5561_1, Arg5561_2, Arg5561_3, Arg5561_4, Arg5561_5, Arg5561_6, Arg5561_7, Arg5561_8, Arg5561_9], function(Arg5563) {
  var Arg5563_0 = Arg5563[0], Arg5563_1 = Arg5563[1], Arg5563_2 = Arg5563[2], Arg5563_3 = Arg5563[3], Arg5563_4 = Arg5563[4], Arg5563_5 = Arg5563[5], Arg5563_6 = Arg5563[6], Arg5563_7 = Arg5563[7], Arg5563_8 = Arg5563[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5563_2, shenjs_call(shen_ebr, [shenjs_call(shen_lazyderef, [Arg5563_4, Arg5563_7]), shenjs_call(shen_lazyderef, [Arg5563_0, Arg5563_7]), shenjs_call(shen_lazyderef, [Arg5563_1, Arg5563_7])]), Arg5563_7, (new Shenjs_freeze([Arg5563_0, Arg5563_1, Arg5563_2, Arg5563_3, Arg5563_4, Arg5563_5, Arg5563_6, Arg5563_7, Arg5563_8], function(Arg5565) {
  var Arg5565_0 = Arg5565[0], Arg5565_1 = Arg5565[1], Arg5565_2 = Arg5565[2], Arg5565_3 = Arg5565[3], Arg5565_4 = Arg5565[4], Arg5565_5 = Arg5565[5], Arg5565_6 = Arg5565[6], Arg5565_7 = Arg5565[7], Arg5565_8 = Arg5565[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5565_2, Arg5565_3, [shen_type_cons, [shen_type_cons, Arg5565_4, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5565_5, []]]], Arg5565_6], Arg5565_7, Arg5565_8]);});})}))]);});})}))]);});})}))]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5453_0, Arg5453_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "open"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R2[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "file"], R1)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5453_1, Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "stream"], R4)))
  ? ((R4 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R4, shen_type_cons))
  ? ((R2 = R4[1]),
  (R4 = shenjs_call(shen_lazyderef, [R4[2], Arg5453_3])),
  ((shenjs_empty$question$(R4))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R2, R3, Arg5453_3, (new Shenjs_freeze([R2, R3, R1, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5567) {
  var Arg5567_0 = Arg5567[0], Arg5567_1 = Arg5567[1], Arg5567_2 = Arg5567[2], Arg5567_3 = Arg5567[3], Arg5567_4 = Arg5567[4], Arg5567_5 = Arg5567[5], Arg5567_6 = Arg5567[6], Arg5567_7 = Arg5567[7], Arg5567_8 = Arg5567[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5567_3, Arg5567_7, (new Shenjs_freeze([Arg5567_3, Arg5567_2, Arg5567_6, Arg5567_7, Arg5567_8], function(Arg5569) {
  var Arg5569_0 = Arg5569[0], Arg5569_1 = Arg5569[1], Arg5569_2 = Arg5569[2], Arg5569_3 = Arg5569[3], Arg5569_4 = Arg5569[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5569_1, [shen_type_symbol, "string"], Arg5569_2, Arg5569_3, Arg5569_4]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [], Arg5453_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R2, R3, Arg5453_3, (new Shenjs_freeze([R2, R3, R1, R4, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5571) {
  var Arg5571_0 = Arg5571[0], Arg5571_1 = Arg5571[1], Arg5571_2 = Arg5571[2], Arg5571_3 = Arg5571[3], Arg5571_4 = Arg5571[4], Arg5571_5 = Arg5571[5], Arg5571_6 = Arg5571[6], Arg5571_7 = Arg5571[7], Arg5571_8 = Arg5571[8], Arg5571_9 = Arg5571[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5571_4, Arg5571_8, (new Shenjs_freeze([Arg5571_4, Arg5571_2, Arg5571_7, Arg5571_8, Arg5571_9], function(Arg5573) {
  var Arg5573_0 = Arg5573[0], Arg5573_1 = Arg5573[1], Arg5573_2 = Arg5573[2], Arg5573_3 = Arg5573[3], Arg5573_4 = Arg5573[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5573_1, [shen_type_symbol, "string"], Arg5573_2, Arg5573_3, Arg5573_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg5453_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_bindv, [R4, [shen_type_cons, R2, []], Arg5453_3]),
  (R3 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R2, R3, Arg5453_3, (new Shenjs_freeze([R2, R3, R0, R1, Arg5453_2, Arg5453_4, R4, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5575) {
  var Arg5575_0 = Arg5575[0], Arg5575_1 = Arg5575[1], Arg5575_2 = Arg5575[2], Arg5575_3 = Arg5575[3], Arg5575_4 = Arg5575[4], Arg5575_5 = Arg5575[5], Arg5575_6 = Arg5575[6], Arg5575_7 = Arg5575[7], Arg5575_8 = Arg5575[8], Arg5575_9 = Arg5575[9], Arg5575_10 = Arg5575[10], Arg5575_11 = Arg5575[11], Arg5575_12 = Arg5575[12], Arg5575_13 = Arg5575[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5575_2, Arg5575_7, (new Shenjs_freeze([Arg5575_2, Arg5575_3, Arg5575_4, Arg5575_7, Arg5575_5], function(Arg5577) {
  var Arg5577_0 = Arg5577[0], Arg5577_1 = Arg5577[1], Arg5577_2 = Arg5577[2], Arg5577_3 = Arg5577[3], Arg5577_4 = Arg5577[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5577_1, [shen_type_symbol, "string"], Arg5577_2, Arg5577_3, Arg5577_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R4, Arg5453_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R4]))
  ? (shenjs_call(shen_bindv, [R4, [shen_type_symbol, "stream"], Arg5453_3]),
  (R3 = ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R5 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R5, R3, Arg5453_3, (new Shenjs_freeze([R5, R3, R1, R4, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5579) {
  var Arg5579_0 = Arg5579[0], Arg5579_1 = Arg5579[1], Arg5579_2 = Arg5579[2], Arg5579_3 = Arg5579[3], Arg5579_4 = Arg5579[4], Arg5579_5 = Arg5579[5], Arg5579_6 = Arg5579[6], Arg5579_7 = Arg5579[7], Arg5579_8 = Arg5579[8], Arg5579_9 = Arg5579[9], Arg5579_10 = Arg5579[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5579_5, Arg5579_4, (new Shenjs_freeze([Arg5579_5, Arg5579_2, Arg5579_8, Arg5579_4, Arg5579_9], function(Arg5581) {
  var Arg5581_0 = Arg5581[0], Arg5581_1 = Arg5581[1], Arg5581_2 = Arg5581[2], Arg5581_3 = Arg5581[3], Arg5581_4 = Arg5581[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5581_1, [shen_type_symbol, "string"], Arg5581_2, Arg5581_3, Arg5581_4]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [], Arg5453_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R5, R3, Arg5453_3, (new Shenjs_freeze([R5, R3, R1, R2, R4, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5583) {
  var Arg5583_0 = Arg5583[0], Arg5583_1 = Arg5583[1], Arg5583_2 = Arg5583[2], Arg5583_3 = Arg5583[3], Arg5583_4 = Arg5583[4], Arg5583_5 = Arg5583[5], Arg5583_6 = Arg5583[6], Arg5583_7 = Arg5583[7], Arg5583_8 = Arg5583[8], Arg5583_9 = Arg5583[9], Arg5583_10 = Arg5583[10], Arg5583_11 = Arg5583[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5583_6, Arg5583_5, (new Shenjs_freeze([Arg5583_6, Arg5583_2, Arg5583_9, Arg5583_5, Arg5583_10], function(Arg5585) {
  var Arg5585_0 = Arg5585[0], Arg5585_1 = Arg5585[1], Arg5585_2 = Arg5585[2], Arg5585_3 = Arg5585[3], Arg5585_4 = Arg5585[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5585_1, [shen_type_symbol, "string"], Arg5585_2, Arg5585_3, Arg5585_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5453_3]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, R5, []], Arg5453_3]),
  (R5 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R5, R3, Arg5453_3, (new Shenjs_freeze([R5, R3, R0, R1, Arg5453_2, Arg5453_4, R2, Arg5453_3, R4, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5587) {
  var Arg5587_0 = Arg5587[0], Arg5587_1 = Arg5587[1], Arg5587_2 = Arg5587[2], Arg5587_3 = Arg5587[3], Arg5587_4 = Arg5587[4], Arg5587_5 = Arg5587[5], Arg5587_6 = Arg5587[6], Arg5587_7 = Arg5587[7], Arg5587_8 = Arg5587[8], Arg5587_9 = Arg5587[9], Arg5587_10 = Arg5587[10], Arg5587_11 = Arg5587[11], Arg5587_12 = Arg5587[12], Arg5587_13 = Arg5587[13], Arg5587_14 = Arg5587[14], Arg5587_15 = Arg5587[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5587_2, Arg5587_7, (new Shenjs_freeze([Arg5587_2, Arg5587_3, Arg5587_4, Arg5587_7, Arg5587_5], function(Arg5589) {
  var Arg5589_0 = Arg5589[0], Arg5589_1 = Arg5589[1], Arg5589_2 = Arg5589[2], Arg5589_3 = Arg5589[3], Arg5589_4 = Arg5589[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5589_1, [shen_type_symbol, "string"], Arg5589_2, Arg5589_3, Arg5589_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5453_3]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R4, Arg5453_3]),
  R3)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? ((R4 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_bindv, [R2, [shen_type_cons, [shen_type_symbol, "stream"], [shen_type_cons, R4, []]], Arg5453_3]),
  (R4 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R4, R3, Arg5453_3, (new Shenjs_freeze([R4, R3, R0, R1, Arg5453_2, Arg5453_4, R2, Arg5453_3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5591) {
  var Arg5591_0 = Arg5591[0], Arg5591_1 = Arg5591[1], Arg5591_2 = Arg5591[2], Arg5591_3 = Arg5591[3], Arg5591_4 = Arg5591[4], Arg5591_5 = Arg5591[5], Arg5591_6 = Arg5591[6], Arg5591_7 = Arg5591[7], Arg5591_8 = Arg5591[8], Arg5591_9 = Arg5591[9], Arg5591_10 = Arg5591[10], Arg5591_11 = Arg5591[11], Arg5591_12 = Arg5591[12], Arg5591_13 = Arg5591[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5591_2, Arg5591_7, (new Shenjs_freeze([Arg5591_2, Arg5591_3, Arg5591_4, Arg5591_7, Arg5591_5], function(Arg5593) {
  var Arg5593_0 = Arg5593[0], Arg5593_1 = Arg5593[1], Arg5593_2 = Arg5593[2], Arg5593_3 = Arg5593[3], Arg5593_4 = Arg5593[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5593_1, [shen_type_symbol, "string"], Arg5593_2, Arg5593_3, Arg5593_4]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R2, Arg5453_3]),
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
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5453_0, Arg5453_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "type"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5453_3, (new Shenjs_freeze([R1, R3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5595) {
  var Arg5595_0 = Arg5595[0], Arg5595_1 = Arg5595[1], Arg5595_2 = Arg5595[2], Arg5595_3 = Arg5595[3], Arg5595_4 = Arg5595[4], Arg5595_5 = Arg5595[5], Arg5595_6 = Arg5595[6], Arg5595_7 = Arg5595[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify, [Arg5595_1, Arg5595_4, Arg5595_6, (new Shenjs_freeze([Arg5595_4, Arg5595_0, Arg5595_1, Arg5595_5, Arg5595_6, Arg5595_7], function(Arg5597) {
  var Arg5597_0 = Arg5597[0], Arg5597_1 = Arg5597[1], Arg5597_2 = Arg5597[2], Arg5597_3 = Arg5597[3], Arg5597_4 = Arg5597[4], Arg5597_5 = Arg5597[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5597_1, Arg5597_2, Arg5597_3, Arg5597_4, Arg5597_5]);});})}))]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5453_0, Arg5453_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "input+"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R2[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [R2, shenjs_call(shen_normalise_type, [shenjs_call(shen_lazyderef, [R1, Arg5453_3])]), Arg5453_3, (new Shenjs_freeze([R1, Arg5453_1, R2, Arg5453_3, Arg5453_4, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5599) {
  var Arg5599_0 = Arg5599[0], Arg5599_1 = Arg5599[1], Arg5599_2 = Arg5599[2], Arg5599_3 = Arg5599[3], Arg5599_4 = Arg5599[4], Arg5599_5 = Arg5599[5], Arg5599_6 = Arg5599[6], Arg5599_7 = Arg5599[7], Arg5599_8 = Arg5599[8], Arg5599_9 = Arg5599[9], Arg5599_10 = Arg5599[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify, [Arg5599_1, Arg5599_2, Arg5599_3, Arg5599_4]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5453_0, Arg5453_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "where"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5453_3, (new Shenjs_freeze([R3, R1, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5601) {
  var Arg5601_0 = Arg5601[0], Arg5601_1 = Arg5601[1], Arg5601_2 = Arg5601[2], Arg5601_3 = Arg5601[3], Arg5601_4 = Arg5601[4], Arg5601_5 = Arg5601[5], Arg5601_6 = Arg5601[6], Arg5601_7 = Arg5601[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5601_1, [shen_type_symbol, "boolean"], Arg5601_5, Arg5601_6, (new Shenjs_freeze([Arg5601_2, Arg5601_0, Arg5601_4, Arg5601_1, Arg5601_5, Arg5601_6, Arg5601_7], function(Arg5603) {
  var Arg5603_0 = Arg5603[0], Arg5603_1 = Arg5603[1], Arg5603_2 = Arg5603[2], Arg5603_3 = Arg5603[3], Arg5603_4 = Arg5603[4], Arg5603_5 = Arg5603[5], Arg5603_6 = Arg5603[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5603_0, Arg5603_5, (new Shenjs_freeze([Arg5603_0, Arg5603_1, Arg5603_2, Arg5603_3, Arg5603_4, Arg5603_5, Arg5603_6], function(Arg5605) {
  var Arg5605_0 = Arg5605[0], Arg5605_1 = Arg5605[1], Arg5605_2 = Arg5605[2], Arg5605_3 = Arg5605[3], Arg5605_4 = Arg5605[4], Arg5605_5 = Arg5605[5], Arg5605_6 = Arg5605[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5605_1, Arg5605_2, [shen_type_cons, [shen_type_cons, Arg5605_3, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "verified"], []]]], Arg5605_4], Arg5605_5, Arg5605_6]);});})}))]);});})}))]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5453_0, Arg5453_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "set"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5453_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5453_3, (new Shenjs_freeze([R1, R3, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5607) {
  var Arg5607_0 = Arg5607[0], Arg5607_1 = Arg5607[1], Arg5607_2 = Arg5607[2], Arg5607_3 = Arg5607[3], Arg5607_4 = Arg5607[4], Arg5607_5 = Arg5607[5], Arg5607_6 = Arg5607[6], Arg5607_7 = Arg5607[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [[shen_type_cons, [shen_type_symbol, "value"], [shen_type_cons, Arg5607_0, []]], Arg5607_4, Arg5607_5, Arg5607_6, (new Shenjs_freeze([Arg5607_0, Arg5607_1, Arg5607_4, Arg5607_5, Arg5607_6, Arg5607_7], function(Arg5609) {
  var Arg5609_0 = Arg5609[0], Arg5609_1 = Arg5609[1], Arg5609_2 = Arg5609[2], Arg5609_3 = Arg5609[3], Arg5609_4 = Arg5609[4], Arg5609_5 = Arg5609[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5609_1, Arg5609_2, Arg5609_3, Arg5609_4, Arg5609_5]);});})}))]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5453_0, Arg5453_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fail"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5453_3])),
  ((shenjs_empty$question$(R2))
  ? ((R2 = shenjs_call(shen_lazyderef, [Arg5453_1, Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R2)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5453_4)))
  : ((shenjs_call(shen_pvar$question$, [R2]))
  ? (shenjs_call(shen_bindv, [R2, [shen_type_symbol, "symbol"], Arg5453_3]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5453_4)))),
  shenjs_call(shen_unbindv, [R2, Arg5453_3]),
  R1)
  : false)))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_t$asterisk$_hyps, [Arg5453_2, R1, Arg5453_3, (new Shenjs_freeze([Arg5453_2, Arg5453_0, Arg5453_1, R1, Arg5453_3, Arg5453_4, R0, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5611) {
  var Arg5611_0 = Arg5611[0], Arg5611_1 = Arg5611[1], Arg5611_2 = Arg5611[2], Arg5611_3 = Arg5611[3], Arg5611_4 = Arg5611[4], Arg5611_5 = Arg5611[5], Arg5611_6 = Arg5611[6], Arg5611_7 = Arg5611[7], Arg5611_8 = Arg5611[8], Arg5611_9 = Arg5611[9], Arg5611_10 = Arg5611[10], Arg5611_11 = Arg5611[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5611_1, Arg5611_2, Arg5611_3, Arg5611_4, Arg5611_5]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5453_0, Arg5453_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "define"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5453_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = R2[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5453_3, (new Shenjs_freeze([R0, R1, R2, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4, Arg5453_0, Arg5453_1, Arg5453_2, Arg5453_3, Arg5453_4], function(Arg5613) {
  var Arg5613_0 = Arg5613[0], Arg5613_1 = Arg5613[1], Arg5613_2 = Arg5613[2], Arg5613_3 = Arg5613[3], Arg5613_4 = Arg5613[4], Arg5613_5 = Arg5613[5], Arg5613_6 = Arg5613[6], Arg5613_7 = Arg5613[7], Arg5613_8 = Arg5613[8], Arg5613_9 = Arg5613[9], Arg5613_10 = Arg5613[10], Arg5613_11 = Arg5613[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_def, [[shen_type_cons, [shen_type_symbol, "define"], [shen_type_cons, Arg5613_1, Arg5613_2]], Arg5613_3, Arg5613_4, Arg5613_5, Arg5613_6]);});})}))]))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5453_0, Arg5453_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R1[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-process-datatype"], R1)))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg5453_1, Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R1)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5453_4)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [shen_type_symbol, "symbol"], Arg5453_3]),
  (R0 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5453_4)))),
  shenjs_call(shen_unbindv, [R1, Arg5453_3]),
  R0)
  : false)))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5453_0, Arg5453_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R1[1], Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-synonyms-help"], R1)))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg5453_1, Arg5453_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R1)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5453_4)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [shen_type_symbol, "symbol"], Arg5453_3]),
  (R0 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5453_4)))),
  shenjs_call(shen_unbindv, [R1, Arg5453_3]),
  R0)
  : false)))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5453_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [R1, (shenjs_globals["shen_shen-*datatypes*"]), Arg5453_3, (new Shenjs_freeze([Arg5453_0, Arg5453_1, Arg5453_2, R1, Arg5453_3, Arg5453_4], function(Arg5615) {
  var Arg5615_0 = Arg5615[0], Arg5615_1 = Arg5615[1], Arg5615_2 = Arg5615[2], Arg5615_3 = Arg5615[3], Arg5615_4 = Arg5615[4], Arg5615_5 = Arg5615[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_udefs$asterisk$, [[shen_type_cons, Arg5615_0, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5615_1, []]]], Arg5615_2, Arg5615_3, Arg5615_4, Arg5615_5]);});})}))]))
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
  function shen_user_lambda5618(Arg5617) {
  if (Arg5617.length < 4) return [shen_type_func, shen_user_lambda5618, 4, Arg5617];
  var Arg5617_0 = Arg5617[0], Arg5617_1 = Arg5617[1], Arg5617_2 = Arg5617[2], Arg5617_3 = Arg5617[3];
  var R0, R1, R2, R3, R4, R5, R6, R7;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5617_0, Arg5617_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg5617_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5617_2])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[1], Arg5617_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "cons"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[2], Arg5617_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R2 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg5617_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5617_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5617_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R1[1], Arg5617_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "list"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R1[2], Arg5617_2])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R1 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg5617_2])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R5, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg5617_2]),
  (R4 = ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R5, Arg5617_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg5617_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5617_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5617_2])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, R1, []], Arg5617_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5617_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [shen_type_symbol, "list"], Arg5617_2]),
  (R4 = ((R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5617_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R6 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5617_2])),
  ((shenjs_empty$question$(R1))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R6 = ((R1 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R1, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg5617_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5617_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5617_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R6, []], Arg5617_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5617_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5617_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5617_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, R5, []]], Arg5617_2]),
  (R5 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R5 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5617_2]),
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
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5617_0, Arg5617_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg5617_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5617_2])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[1], Arg5617_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@p"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[2], Arg5617_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R2 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg5617_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5617_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5617_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R5 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5617_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R6 = shenjs_call(shen_lazyderef, [R1[1], Arg5617_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "*"], R6)))
  ? ((R6 = shenjs_call(shen_lazyderef, [R1[2], Arg5617_2])),
  ((shenjs_is_type(R6, shen_type_cons))
  ? ((R1 = R6[1]),
  (R6 = shenjs_call(shen_lazyderef, [R6[2], Arg5617_2])),
  ((shenjs_empty$question$(R6))
  ? ((R6 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R6))
  ? ((R6 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]]], shenjs_call(shen_lazyderef, [R6, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? (shenjs_call(shen_bindv, [R6, [], Arg5617_2]),
  (R5 = ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R6, Arg5617_2]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? (shenjs_call(shen_bindv, [R6, [], Arg5617_2]),
  (R5 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R5 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R6, Arg5617_2]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5617_2])),
  shenjs_call(shen_bindv, [R6, [shen_type_cons, R1, []], Arg5617_2]),
  (R5 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R5 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R6, Arg5617_2]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? (shenjs_call(shen_bindv, [R6, [shen_type_symbol, "*"], Arg5617_2]),
  (R5 = ((R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5617_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R7 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5617_2])),
  ((shenjs_empty$question$(R1))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg5617_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R7 = ((R1 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg5617_2]), []]]], shenjs_call(shen_lazyderef, [R1, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg5617_2]),
  (R7 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg5617_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R7 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg5617_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R7)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5617_2]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R7 = shenjs_call(shen_newpv, [Arg5617_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R7, []], Arg5617_2]),
  (R7 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg5617_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R7 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R7, Arg5617_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R7)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5617_2]),
  R7)
  : false)))),
  shenjs_call(shen_unbindv, [R6, Arg5617_2]),
  R5)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5617_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, R6, []]], Arg5617_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5617_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5617_2])),
  (R6 = shenjs_call(shen_newpv, [Arg5617_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R5, [shen_type_cons, [shen_type_symbol, "*"], [shen_type_cons, R6, []]]], Arg5617_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]]], shenjs_call(shen_lazyderef, [R0, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5617_2]),
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
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5617_0, Arg5617_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg5617_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5617_2])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[1], Arg5617_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@v"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[2], Arg5617_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R2 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg5617_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5617_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5617_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R1[1], Arg5617_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "vector"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R1[2], Arg5617_2])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R1 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg5617_2])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R5, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg5617_2]),
  (R4 = ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R5, Arg5617_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [], Arg5617_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5617_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5617_2])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, R1, []], Arg5617_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5617_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? (shenjs_call(shen_bindv, [R5, [shen_type_symbol, "vector"], Arg5617_2]),
  (R4 = ((R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5617_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R6 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5617_2])),
  ((shenjs_empty$question$(R1))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R6 = ((R1 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R1, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg5617_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5617_2]),
  R6)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5617_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R6, []], Arg5617_2]),
  (R6 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R6 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R6, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5617_2]),
  R6)
  : false)))),
  shenjs_call(shen_unbindv, [R5, Arg5617_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R5 = shenjs_call(shen_newpv, [Arg5617_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, R5, []]], Arg5617_2]),
  (R5 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R5 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "vector"], [shen_type_cons, shenjs_call(shen_lazyderef, [R5, Arg5617_2]), []]], []]]], shenjs_call(shen_lazyderef, [R0, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R5)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5617_2]),
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
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5617_0, Arg5617_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg5617_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5617_2])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[1], Arg5617_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "@s"], R3)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R2[2], Arg5617_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R2 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = shenjs_call(shen_lazyderef, [R1[2], Arg5617_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5617_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R3[1], Arg5617_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "string"], R1)))
  ? ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R4 = ((R1 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], shenjs_call(shen_lazyderef, [R1, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R4)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [shen_type_symbol, "string"], Arg5617_2]),
  (R4 = ((R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5617_2])),
  ((shenjs_empty$question$(R3))
  ? ((R3 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], shenjs_call(shen_lazyderef, [R3, Arg5617_2])]], Arg5617_2, Arg5617_3]))
  : ((shenjs_call(shen_pvar$question$, [R3]))
  ? (shenjs_call(shen_bindv, [R3, [], Arg5617_2]),
  (R4 = ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5617_1, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R2, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [R4, Arg5617_2]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, [shen_type_symbol, "string"], []]]], shenjs_call(shen_lazyderef, [R0, Arg5617_2])]], Arg5617_2, Arg5617_3]))),
  shenjs_call(shen_unbindv, [R3, Arg5617_2]),
  R4)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5617_2]),
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
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5617_0, Arg5617_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = R0[1]),
  (R0 = R0[2]),
  (R2 = shenjs_call(shen_newpv, [Arg5617_2])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [Arg5617_1, [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5617_2]), shenjs_call(shen_lazyderef, [R2, Arg5617_2])], Arg5617_2, (new Shenjs_freeze([Arg5617_1, R1, R0, R2, Arg5617_2, Arg5617_3], function(Arg5619) {
  var Arg5619_0 = Arg5619[0], Arg5619_1 = Arg5619[1], Arg5619_2 = Arg5619[2], Arg5619_3 = Arg5619[3], Arg5619_4 = Arg5619[4], Arg5619_5 = Arg5619[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_hyps, [Arg5619_2, Arg5619_3, Arg5619_4, Arg5619_5]);});})}))]);}))
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
  function shen_user_lambda5622(Arg5621) {
  if (Arg5621.length < 4) return [shen_type_func, shen_user_lambda5622, 4, Arg5621];
  var Arg5621_0 = Arg5621[0], Arg5621_1 = Arg5621[1], Arg5621_2 = Arg5621[2], Arg5621_3 = Arg5621[3];
  return (((shenjs_globals["shen_shen-*spy*"]))
  ? (shenjs_call(shen_line, []),
  shenjs_call(shen_show_p, [shenjs_call(shen_deref, [Arg5621_0, Arg5621_2])]),
  shenjs_call(shen_nl, [1]),
  shenjs_call(shen_nl, [1]),
  shenjs_call(shen_show_assumptions, [shenjs_call(shen_deref, [Arg5621_1, Arg5621_2]), 1]),
  shenjs_call(shen_intoutput, ["~%> ", []]),
  shenjs_call(shen_pause_for_user, [(shenjs_globals["shen_*language*"])]),
  shenjs_thaw(Arg5621_3))
  : shenjs_thaw(Arg5621_3))},
  4,
  [],
  "shen-show"];
shenjs_functions["shen_shen-show"] = shen_show;






shen_line = [shen_type_func,
  function shen_user_lambda5624(Arg5623) {
  if (Arg5623.length < 0) return [shen_type_func, shen_user_lambda5624, 0, Arg5623];
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
  function shen_user_lambda5626(Arg5625) {
  if (Arg5625.length < 1) return [shen_type_func, shen_user_lambda5626, 1, Arg5625];
  var Arg5625_0 = Arg5625[0];
  return (((shenjs_is_type(Arg5625_0, shen_type_cons) && (shenjs_is_type(Arg5625_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], Arg5625_0[2][1])) && (shenjs_is_type(Arg5625_0[2][2], shen_type_cons) && shenjs_empty$question$(Arg5625_0[2][2][2]))))))
  ? (function() {
  return shenjs_call_tail(shen_intoutput, ["~R : ~R", [shen_tuple, Arg5625_0[1], [shen_tuple, Arg5625_0[2][2][1], []]]]);})
  : (function() {
  return shenjs_call_tail(shen_intoutput, ["~R", [shen_tuple, Arg5625_0, []]]);}))},
  1,
  [],
  "shen-show-p"];
shenjs_functions["shen_shen-show-p"] = shen_show_p;






shen_show_assumptions = [shen_type_func,
  function shen_user_lambda5628(Arg5627) {
  if (Arg5627.length < 2) return [shen_type_func, shen_user_lambda5628, 2, Arg5627];
  var Arg5627_0 = Arg5627[0], Arg5627_1 = Arg5627[1];
  return ((shenjs_empty$question$(Arg5627_0))
  ? [shen_type_symbol, "shen-skip"]
  : ((shenjs_is_type(Arg5627_0, shen_type_cons))
  ? (shenjs_call(shen_intoutput, ["~A. ", [shen_tuple, Arg5627_1, []]]),
  shenjs_call(shen_show_p, [Arg5627_0[1]]),
  shenjs_call(shen_nl, [1]),
  (function() {
  return shenjs_call_tail(shen_show_assumptions, [Arg5627_0[2], (Arg5627_1 + 1)]);}))
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "shen-show-assumptions"]]);})))},
  2,
  [],
  "shen-show-assumptions"];
shenjs_functions["shen_shen-show-assumptions"] = shen_show_assumptions;






shen_pause_for_user = [shen_type_func,
  function shen_user_lambda5630(Arg5629) {
  if (Arg5629.length < 1) return [shen_type_func, shen_user_lambda5630, 1, Arg5629];
  var Arg5629_0 = Arg5629[0];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$("Common Lisp", Arg5629_0)))
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
  function shen_user_lambda5632(Arg5631) {
  if (Arg5631.length < 0) return [shen_type_func, shen_user_lambda5632, 0, Arg5631];
  return (function() {
  return shenjs_call_tail(shen_read_char_h, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), 0]);})},
  0,
  [],
  "shen-read-char"];
shenjs_functions["shen_shen-read-char"] = shen_read_char;






shen_read_char_h = [shen_type_func,
  function shen_user_lambda5634(Arg5633) {
  if (Arg5633.length < 2) return [shen_type_func, shen_user_lambda5634, 2, Arg5633];
  var Arg5633_0 = Arg5633[0], Arg5633_1 = Arg5633[1];
  return (((shenjs_unwind_tail(shenjs_$eq$(-1, Arg5633_0)) && shenjs_unwind_tail(shenjs_$eq$(0, Arg5633_1))))
  ? (function() {
  return shenjs_call_tail(shen_read_char_h, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), 1]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(0, Arg5633_1)))
  ? (function() {
  return shenjs_call_tail(shen_read_char_h, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), 0]);})
  : (((shenjs_unwind_tail(shenjs_$eq$(-1, Arg5633_0)) && shenjs_unwind_tail(shenjs_$eq$(1, Arg5633_1))))
  ? (function() {
  return shenjs_call_tail(shen_read_char_h, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), 1]);})
  : ((shenjs_unwind_tail(shenjs_$eq$(1, Arg5633_1)))
  ? (function() {
  return shenjs_call_tail(shen_byte_$gt$string, [Arg5633_0]);})
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "shen-read-char-h"]]);})))))},
  2,
  [],
  "shen-read-char-h"];
shenjs_functions["shen_shen-read-char-h"] = shen_read_char_h;






shen_typedf$question$ = [shen_type_func,
  function shen_user_lambda5636(Arg5635) {
  if (Arg5635.length < 1) return [shen_type_func, shen_user_lambda5636, 1, Arg5635];
  var Arg5635_0 = Arg5635[0];
  return (function() {
  return shenjs_call_tail(shen_element$question$, [Arg5635_0, (shenjs_globals["shen_shen-*signedfuncs*"])]);})},
  1,
  [],
  "shen-typedf?"];
shenjs_functions["shen_shen-typedf?"] = shen_typedf$question$;






shen_sigf = [shen_type_func,
  function shen_user_lambda5638(Arg5637) {
  if (Arg5637.length < 1) return [shen_type_func, shen_user_lambda5638, 1, Arg5637];
  var Arg5637_0 = Arg5637[0];
  return (function() {
  return shenjs_call_tail(shen_concat, [[shen_type_symbol, "shen-type-signature-of-"], Arg5637_0]);})},
  1,
  [],
  "shen-sigf"];
shenjs_functions["shen_shen-sigf"] = shen_sigf;






shen_placeholder = [shen_type_func,
  function shen_user_lambda5640(Arg5639) {
  if (Arg5639.length < 0) return [shen_type_func, shen_user_lambda5640, 0, Arg5639];
  return (function() {
  return shenjs_call_tail(shen_gensym, [[shen_type_symbol, "&&"]]);})},
  0,
  [],
  "shen-placeholder"];
shenjs_functions["shen_shen-placeholder"] = shen_placeholder;






shen_base = [shen_type_func,
  function shen_user_lambda5642(Arg5641) {
  if (Arg5641.length < 4) return [shen_type_func, shen_user_lambda5642, 4, Arg5641];
  var Arg5641_0 = Arg5641[0], Arg5641_1 = Arg5641[1], Arg5641_2 = Arg5641[2], Arg5641_3 = Arg5641[3];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5641_1, Arg5641_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "number"], R0)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [(typeof(shenjs_call(shen_lazyderef, [Arg5641_0, Arg5641_2])) == 'number'), Arg5641_2, Arg5641_3]))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [shen_type_symbol, "number"], Arg5641_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [(typeof(shenjs_call(shen_lazyderef, [Arg5641_0, Arg5641_2])) == 'number'), Arg5641_2, Arg5641_3]))),
  shenjs_call(shen_unbindv, [R0, Arg5641_2]),
  R1)
  : false)))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5641_1, Arg5641_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "boolean"], R0)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_boolean$question$(shenjs_call(shen_lazyderef, [Arg5641_0, Arg5641_2])), Arg5641_2, Arg5641_3]))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [shen_type_symbol, "boolean"], Arg5641_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_boolean$question$(shenjs_call(shen_lazyderef, [Arg5641_0, Arg5641_2])), Arg5641_2, Arg5641_3]))),
  shenjs_call(shen_unbindv, [R0, Arg5641_2]),
  R1)
  : false)))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5641_1, Arg5641_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "string"], R0)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [(typeof(shenjs_call(shen_lazyderef, [Arg5641_0, Arg5641_2])) == 'string'), Arg5641_2, Arg5641_3]))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [shen_type_symbol, "string"], Arg5641_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [(typeof(shenjs_call(shen_lazyderef, [Arg5641_0, Arg5641_2])) == 'string'), Arg5641_2, Arg5641_3]))),
  shenjs_call(shen_unbindv, [R0, Arg5641_2]),
  R1)
  : false)))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5641_1, Arg5641_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "symbol"], R0)))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_is_type(shenjs_call(shen_lazyderef, [Arg5641_0, Arg5641_2]), shen_type_symbol), Arg5641_2, (new Shenjs_freeze([Arg5641_0, Arg5641_1, Arg5641_3, Arg5641_2], function(Arg5643) {
  var Arg5643_0 = Arg5643[0], Arg5643_1 = Arg5643[1], Arg5643_2 = Arg5643[2], Arg5643_3 = Arg5643[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [(!shenjs_call(shen_placeholder$question$, [shenjs_call(shen_lazyderef, [Arg5643_0, Arg5643_3])])), Arg5643_3, Arg5643_2]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [shen_type_symbol, "symbol"], Arg5641_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_is_type(shenjs_call(shen_lazyderef, [Arg5641_0, Arg5641_2]), shen_type_symbol), Arg5641_2, (new Shenjs_freeze([R0, Arg5641_0, Arg5641_1, Arg5641_3, Arg5641_2], function(Arg5645) {
  var Arg5645_0 = Arg5645[0], Arg5645_1 = Arg5645[1], Arg5645_2 = Arg5645[2], Arg5645_3 = Arg5645[3], Arg5645_4 = Arg5645[4];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [(!shenjs_call(shen_placeholder$question$, [shenjs_call(shen_lazyderef, [Arg5645_1, Arg5645_4])])), Arg5645_4, Arg5645_3]);});})}))]))),
  shenjs_call(shen_unbindv, [R0, Arg5641_2]),
  R1)
  : false)))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5641_0, Arg5641_2])),
  ((shenjs_empty$question$(R0))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5641_1, Arg5641_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[1], Arg5641_2])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "list"], R1)))
  ? ((R1 = shenjs_call(shen_lazyderef, [R0[2], Arg5641_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? (R1[1],
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5641_2])),
  ((shenjs_empty$question$(R1))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_thaw(Arg5641_3))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg5641_2]),
  (R0 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5641_3)))),
  shenjs_call(shen_unbindv, [R1, Arg5641_2]),
  R0)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? ((R0 = shenjs_call(shen_newpv, [Arg5641_2])),
  shenjs_call(shen_bindv, [R1, [shen_type_cons, R0, []], Arg5641_2]),
  (R0 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5641_3)))),
  shenjs_call(shen_unbindv, [R1, Arg5641_2]),
  R0)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [shen_type_symbol, "list"], Arg5641_2]),
  (R0 = ((R0 = shenjs_call(shen_lazyderef, [R0[2], Arg5641_2])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? (R0[1],
  (R0 = shenjs_call(shen_lazyderef, [R0[2], Arg5641_2])),
  ((shenjs_empty$question$(R0))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5641_3)))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [], Arg5641_2]),
  (R2 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5641_3)))),
  shenjs_call(shen_unbindv, [R0, Arg5641_2]),
  R2)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? ((R2 = shenjs_call(shen_newpv, [Arg5641_2])),
  shenjs_call(shen_bindv, [R0, [shen_type_cons, R2, []], Arg5641_2]),
  (R2 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5641_3)))),
  shenjs_call(shen_unbindv, [R0, Arg5641_2]),
  R2)
  : false)))),
  shenjs_call(shen_unbindv, [R1, Arg5641_2]),
  R0)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5641_2])),
  shenjs_call(shen_bindv, [R0, [shen_type_cons, [shen_type_symbol, "list"], [shen_type_cons, R1, []]], Arg5641_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5641_3)))),
  shenjs_call(shen_unbindv, [R0, Arg5641_2]),
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
  function shen_user_lambda5648(Arg5647) {
  if (Arg5647.length < 1) return [shen_type_func, shen_user_lambda5648, 1, Arg5647];
  var Arg5647_0 = Arg5647[0];
  return (shenjs_is_type(Arg5647_0, shen_type_symbol) && shenjs_call(shen_placeholder_help$question$, [shenjs_str(Arg5647_0)]))},
  1,
  [],
  "shen-placeholder?"];
shenjs_functions["shen_shen-placeholder?"] = shen_placeholder$question$;






shen_placeholder_help$question$ = [shen_type_func,
  function shen_user_lambda5650(Arg5649) {
  if (Arg5649.length < 1) return [shen_type_func, shen_user_lambda5650, 1, Arg5649];
  var Arg5649_0 = Arg5649[0];
  return (((shenjs_call(shen_$plus$string$question$, [Arg5649_0]) && (shenjs_unwind_tail(shenjs_$eq$("&", Arg5649_0[0])) && (shenjs_call(shen_$plus$string$question$, [shenjs_tlstr(Arg5649_0)]) && shenjs_unwind_tail(shenjs_$eq$("&", shenjs_tlstr(Arg5649_0)[0]))))))
  ? true
  : false)},
  1,
  [],
  "shen-placeholder-help?"];
shenjs_functions["shen_shen-placeholder-help?"] = shen_placeholder_help$question$;






shen_by$_hypothesis = [shen_type_func,
  function shen_user_lambda5652(Arg5651) {
  if (Arg5651.length < 5) return [shen_type_func, shen_user_lambda5652, 5, Arg5651];
  var Arg5651_0 = Arg5651[0], Arg5651_1 = Arg5651[1], Arg5651_2 = Arg5651[2], Arg5651_3 = Arg5651[3], Arg5651_4 = Arg5651[4];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5651_2, Arg5651_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R0 = shenjs_call(shen_lazyderef, [R0[1], Arg5651_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = R0[1]),
  (R0 = shenjs_call(shen_lazyderef, [R0[2], Arg5651_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R0[1], Arg5651_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R0[2], Arg5651_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R0 = R2[1]),
  (R2 = shenjs_call(shen_lazyderef, [R2[2], Arg5651_3])),
  ((shenjs_empty$question$(R2))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_identical, [Arg5651_0, R1, Arg5651_3, (new Shenjs_freeze([R1, R0, Arg5651_2, Arg5651_0, Arg5651_1, Arg5651_3, Arg5651_4], function(Arg5653) {
  var Arg5653_0 = Arg5653[0], Arg5653_1 = Arg5653[1], Arg5653_2 = Arg5653[2], Arg5653_3 = Arg5653[3], Arg5653_4 = Arg5653[4], Arg5653_5 = Arg5653[5], Arg5653_6 = Arg5653[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5653_4, Arg5653_1, Arg5653_5, Arg5653_6]);});})}))]))
  : false))
  : false))
  : false))
  : false))
  : false))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5651_2, Arg5651_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R0 = R0[2]),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_by$_hypothesis, [Arg5651_0, Arg5651_1, R0, Arg5651_3, Arg5651_4]);}))
  : false))
  : R0))},
  5,
  [],
  "shen-by_hypothesis"];
shenjs_functions["shen_shen-by_hypothesis"] = shen_by$_hypothesis;






shen_t$asterisk$_def = [shen_type_func,
  function shen_user_lambda5656(Arg5655) {
  if (Arg5655.length < 5) return [shen_type_func, shen_user_lambda5656, 5, Arg5655];
  var Arg5655_0 = Arg5655[0], Arg5655_1 = Arg5655[1], Arg5655_2 = Arg5655[2], Arg5655_3 = Arg5655[3], Arg5655_4 = Arg5655[4];
  var R0, R1, R2, R3, R4, R5, R6, R7, R8, R9;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = shenjs_call(shen_lazyderef, [Arg5655_0, Arg5655_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[1], Arg5655_3])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "define"], R2)))
  ? ((R2 = shenjs_call(shen_lazyderef, [R1[2], Arg5655_3])),
  ((shenjs_is_type(R2, shen_type_cons))
  ? ((R1 = R2[1]),
  (R2 = R2[2]),
  (R3 = shenjs_call(shen_newpv, [Arg5655_3])),
  (R4 = shenjs_call(shen_newpv, [Arg5655_3])),
  (R5 = shenjs_call(shen_newpv, [Arg5655_3])),
  (R6 = shenjs_call(shen_newpv, [Arg5655_3])),
  (R7 = shenjs_call(shen_newpv, [Arg5655_3])),
  (R8 = shenjs_call(shen_newpv, [Arg5655_3])),
  (R9 = shenjs_call(shen_newpv, [Arg5655_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [R4, shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda5658(Arg5657) {
  if (Arg5657.length < 1) return [shen_type_func, shen_user_lambda5658, 1, Arg5657];
  var Arg5657_0 = Arg5657[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$sig$plus$rules$gt$, [Arg5657_0]);})},
  1,
  []], shenjs_call(shen_lazyderef, [R2, Arg5655_3]), []]), Arg5655_3, (new Shenjs_freeze([R2, R3, R4, R5, R0, R6, R7, Arg5655_2, R8, R1, Arg5655_1, R9, Arg5655_3, Arg5655_4], function(Arg5659) {
  var Arg5659_0 = Arg5659[0], Arg5659_1 = Arg5659[1], Arg5659_2 = Arg5659[2], Arg5659_3 = Arg5659[3], Arg5659_4 = Arg5659[4], Arg5659_5 = Arg5659[5], Arg5659_6 = Arg5659[6], Arg5659_7 = Arg5659[7], Arg5659_8 = Arg5659[8], Arg5659_9 = Arg5659[9], Arg5659_10 = Arg5659[10], Arg5659_11 = Arg5659[11], Arg5659_12 = Arg5659[12], Arg5659_13 = Arg5659[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5659_1, ((shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_lazyderef, [Arg5659_2, Arg5659_12]), shen_fail_obj)))
  ? shenjs_call(shen_errordef, [shenjs_call(shen_lazyderef, [Arg5659_9, Arg5659_12])])
  : [shen_type_symbol, "shen-skip"]), Arg5659_12, (new Shenjs_freeze([Arg5659_1, Arg5659_2, Arg5659_3, Arg5659_4, Arg5659_5, Arg5659_6, Arg5659_7, Arg5659_8, Arg5659_9, Arg5659_10, Arg5659_11, Arg5659_12, Arg5659_13], function(Arg5661) {
  var Arg5661_0 = Arg5661[0], Arg5661_1 = Arg5661[1], Arg5661_2 = Arg5661[2], Arg5661_3 = Arg5661[3], Arg5661_4 = Arg5661[4], Arg5661_5 = Arg5661[5], Arg5661_6 = Arg5661[6], Arg5661_7 = Arg5661[7], Arg5661_8 = Arg5661[8], Arg5661_9 = Arg5661[9], Arg5661_10 = Arg5661[10], Arg5661_11 = Arg5661[11], Arg5661_12 = Arg5661[12];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5661_10, shenjs_call(shen_lazyderef, [Arg5661_1, Arg5661_11])[1], Arg5661_11, (new Shenjs_freeze([Arg5661_1, Arg5661_2, Arg5661_3, Arg5661_4, Arg5661_5, Arg5661_6, Arg5661_7, Arg5661_8, Arg5661_9, Arg5661_10, Arg5661_11, Arg5661_12], function(Arg5663) {
  var Arg5663_0 = Arg5663[0], Arg5663_1 = Arg5663[1], Arg5663_2 = Arg5663[2], Arg5663_3 = Arg5663[3], Arg5663_4 = Arg5663[4], Arg5663_5 = Arg5663[5], Arg5663_6 = Arg5663[6], Arg5663_7 = Arg5663[7], Arg5663_8 = Arg5663[8], Arg5663_9 = Arg5663[9], Arg5663_10 = Arg5663[10], Arg5663_11 = Arg5663[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5663_3, shenjs_call(shen_lazyderef, [Arg5663_0, Arg5663_10])[2], Arg5663_10, (new Shenjs_freeze([Arg5663_0, Arg5663_1, Arg5663_2, Arg5663_3, Arg5663_4, Arg5663_5, Arg5663_6, Arg5663_7, Arg5663_8, Arg5663_9, Arg5663_10, Arg5663_11], function(Arg5665) {
  var Arg5665_0 = Arg5665[0], Arg5665_1 = Arg5665[1], Arg5665_2 = Arg5665[2], Arg5665_3 = Arg5665[3], Arg5665_4 = Arg5665[4], Arg5665_5 = Arg5665[5], Arg5665_6 = Arg5665[6], Arg5665_7 = Arg5665[7], Arg5665_8 = Arg5665[8], Arg5665_9 = Arg5665[9], Arg5665_10 = Arg5665[10], Arg5665_11 = Arg5665[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5665_1, shenjs_call(shen_extract$_vars, [shenjs_call(shen_lazyderef, [Arg5665_9, Arg5665_10])]), Arg5665_10, (new Shenjs_freeze([Arg5665_1, Arg5665_2, Arg5665_3, Arg5665_4, Arg5665_5, Arg5665_6, Arg5665_7, Arg5665_8, Arg5665_9, Arg5665_10, Arg5665_11], function(Arg5667) {
  var Arg5667_0 = Arg5667[0], Arg5667_1 = Arg5667[1], Arg5667_2 = Arg5667[2], Arg5667_3 = Arg5667[3], Arg5667_4 = Arg5667[4], Arg5667_5 = Arg5667[5], Arg5667_6 = Arg5667[6], Arg5667_7 = Arg5667[7], Arg5667_8 = Arg5667[8], Arg5667_9 = Arg5667[9], Arg5667_10 = Arg5667[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5667_3, shenjs_call(shen_placeholders, [shenjs_call(shen_lazyderef, [Arg5667_8, Arg5667_9]), shenjs_call(shen_lazyderef, [Arg5667_0, Arg5667_9])]), Arg5667_9, (new Shenjs_freeze([Arg5667_0, Arg5667_1, Arg5667_2, Arg5667_3, Arg5667_4, Arg5667_5, Arg5667_6, Arg5667_7, Arg5667_8, Arg5667_9, Arg5667_10], function(Arg5669) {
  var Arg5669_0 = Arg5669[0], Arg5669_1 = Arg5669[1], Arg5669_2 = Arg5669[2], Arg5669_3 = Arg5669[3], Arg5669_4 = Arg5669[4], Arg5669_5 = Arg5669[5], Arg5669_6 = Arg5669[6], Arg5669_7 = Arg5669[7], Arg5669_8 = Arg5669[8], Arg5669_9 = Arg5669[9], Arg5669_10 = Arg5669[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5669_1, Arg5669_9, (new Shenjs_freeze([Arg5669_1, Arg5669_2, Arg5669_3, Arg5669_4, Arg5669_5, Arg5669_6, Arg5669_7, Arg5669_8, Arg5669_9, Arg5669_10], function(Arg5671) {
  var Arg5671_0 = Arg5671[0], Arg5671_1 = Arg5671[1], Arg5671_2 = Arg5671[2], Arg5671_3 = Arg5671[3], Arg5671_4 = Arg5671[4], Arg5671_5 = Arg5671[5], Arg5671_6 = Arg5671[6], Arg5671_7 = Arg5671[7], Arg5671_8 = Arg5671[8], Arg5671_9 = Arg5671[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_rules, [Arg5671_1, Arg5671_2, 1, Arg5671_5, [shen_type_cons, [shen_type_cons, Arg5671_5, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, Arg5671_2, []]]], Arg5671_3], Arg5671_8, (new Shenjs_freeze([Arg5671_1, Arg5671_2, Arg5671_3, Arg5671_4, Arg5671_5, Arg5671_6, Arg5671_7, Arg5671_8, Arg5671_9], function(Arg5673) {
  var Arg5673_0 = Arg5673[0], Arg5673_1 = Arg5673[1], Arg5673_2 = Arg5673[2], Arg5673_3 = Arg5673[3], Arg5673_4 = Arg5673[4], Arg5673_5 = Arg5673[5], Arg5673_6 = Arg5673[6], Arg5673_7 = Arg5673[7], Arg5673_8 = Arg5673[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5673_3, shenjs_call(shen_declare, [shenjs_call(shen_lazyderef, [Arg5673_4, Arg5673_7]), shenjs_call(shen_lazyderef, [Arg5673_6, Arg5673_7])]), Arg5673_7, (new Shenjs_freeze([Arg5673_3, Arg5673_4, Arg5673_5, Arg5673_6, Arg5673_7, Arg5673_8], function(Arg5675) {
  var Arg5675_0 = Arg5675[0], Arg5675_1 = Arg5675[1], Arg5675_2 = Arg5675[2], Arg5675_3 = Arg5675[3], Arg5675_4 = Arg5675[4], Arg5675_5 = Arg5675[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5675_2, Arg5675_3, Arg5675_4, Arg5675_5]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))
  : false))
  : false))
  : false))]);}))},
  5,
  [],
  "shen-t*-def"];
shenjs_functions["shen_shen-t*-def"] = shen_t$asterisk$_def;






shen_$lt$sig$plus$rules$gt$ = [shen_type_func,
  function shen_user_lambda5678(Arg5677) {
  if (Arg5677.length < 1) return [shen_type_func, shen_user_lambda5678, 1, Arg5677];
  var Arg5677_0 = Arg5677[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$signature$gt$, [Arg5677_0])),
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
  function shen_user_lambda5680(Arg5679) {
  if (Arg5679.length < 2) return [shen_type_func, shen_user_lambda5680, 2, Arg5679];
  var Arg5679_0 = Arg5679[0], Arg5679_1 = Arg5679[1];
  return ((shenjs_is_type(Arg5679_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_map, [[shen_type_func,
  function shen_user_lambda5682(Arg5681) {
  if (Arg5681.length < 2) return [shen_type_func, shen_user_lambda5682, 2, Arg5681];
  var Arg5681_0 = Arg5681[0], Arg5681_1 = Arg5681[1];
  return (function() {
  return shenjs_call_tail(shen_placeholders, [Arg5681_1, Arg5681_0]);})},
  2,
  [Arg5679_1]], Arg5679_0]);})
  : ((shenjs_call(shen_element$question$, [Arg5679_0, Arg5679_1]))
  ? (function() {
  return shenjs_call_tail(shen_concat, [[shen_type_symbol, "&&"], Arg5679_0]);})
  : Arg5679_0))},
  2,
  [],
  "shen-placeholders"];
shenjs_functions["shen_shen-placeholders"] = shen_placeholders;






shen_$lt$trules$gt$ = [shen_type_func,
  function shen_user_lambda5684(Arg5683) {
  if (Arg5683.length < 1) return [shen_type_func, shen_user_lambda5684, 1, Arg5683];
  var Arg5683_0 = Arg5683[0];
  var R0, R1;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$trule$gt$, [Arg5683_0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? ((R1 = shenjs_call(shen_$lt$trules$gt$, [R0])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R1))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R1]), [shen_type_cons, shenjs_call(shen_snd, [R0]), shenjs_call(shen_snd, [R1])]])
  : shen_fail_obj))
  : shen_fail_obj))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$trule$gt$, [Arg5683_0])),
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
  function shen_user_lambda5686(Arg5685) {
  if (Arg5685.length < 1) return [shen_type_func, shen_user_lambda5686, 1, Arg5685];
  var Arg5685_0 = Arg5685[0];
  var R0, R1, R2, R3, R4;
  return ((R0 = ((R0 = shenjs_call(shen_$lt$patterns$gt$, [Arg5685_0])),
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
  function shen_user_lambda5688(Arg5687) {
  if (Arg5687.length < 4) return [shen_type_func, shen_user_lambda5688, 4, Arg5687];
  var Arg5687_0 = Arg5687[0], Arg5687_1 = Arg5687[1], Arg5687_2 = Arg5687[2], Arg5687_3 = Arg5687[3];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-forward"], Arg5687_1)))
  ? [shen_type_cons, Arg5687_0, [shen_type_cons, ((shenjs_unwind_tail(shenjs_$eq$(Arg5687_3, [shen_type_symbol, "shen-skip"])))
  ? Arg5687_2
  : [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, Arg5687_3, [shen_type_cons, Arg5687_2, []]]]), []]]
  : (((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-backward"], Arg5687_1)) && (shenjs_is_type(Arg5687_2, shen_type_cons) && (shenjs_is_type(Arg5687_2[1], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "fail-if"], Arg5687_2[1][1])) && (shenjs_is_type(Arg5687_2[1][2], shen_type_cons) && (shenjs_empty$question$(Arg5687_2[1][2][2]) && (shenjs_is_type(Arg5687_2[2], shen_type_cons) && shenjs_empty$question$(Arg5687_2[2][2])))))))))
  ? [shen_type_cons, Arg5687_0, [shen_type_cons, ((shenjs_unwind_tail(shenjs_$eq$(Arg5687_3, [shen_type_symbol, "shen-skip"])))
  ? [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, Arg5687_2[1][2][1], Arg5687_2[2]], []]], Arg5687_2[2]]]
  : [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, Arg5687_3, []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, Arg5687_2[1][2][1], Arg5687_2[2]], []]], []]], Arg5687_2[2]]]), []]]
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "shen-backward"], Arg5687_1)))
  ? [shen_type_cons, Arg5687_0, [shen_type_cons, ((shenjs_unwind_tail(shenjs_$eq$(Arg5687_3, [shen_type_symbol, "shen-skip"])))
  ? [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "=="], [shen_type_cons, Arg5687_2, []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]], []]], [shen_type_cons, Arg5687_2, []]]]
  : [shen_type_cons, [shen_type_symbol, "where"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "and"], [shen_type_cons, Arg5687_3, []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "not"], [shen_type_cons, [shen_type_cons, [shen_type_cons, [shen_type_symbol, "=="], [shen_type_cons, Arg5687_2, []]], [shen_type_cons, [shen_type_cons, [shen_type_symbol, "fail"], []], []]], []]], []]], [shen_type_cons, Arg5687_2, []]]]), []]]
  : (function() {
  return shenjs_call_tail(shen_f$_error, [[shen_type_symbol, "shen-form-rule"]]);}))))},
  4,
  [],
  "shen-form-rule"];
shenjs_functions["shen_shen-form-rule"] = shen_form_rule;






shen_$lt$guard$question$$gt$ = [shen_type_func,
  function shen_user_lambda5690(Arg5689) {
  if (Arg5689.length < 1) return [shen_type_func, shen_user_lambda5690, 1, Arg5689];
  var Arg5689_0 = Arg5689[0];
  var R0;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg5689_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "where"], shenjs_call(shen_fst, [Arg5689_0])[1]))))
  ? ((R0 = shenjs_call(shen_$lt$guard$gt$, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg5689_0])[2], shenjs_call(shen_snd, [Arg5689_0])])])),
  (((!shenjs_unwind_tail(shenjs_$eq$(shen_fail_obj, R0))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [R0]), shenjs_call(shen_snd, [R0])])
  : shen_fail_obj))
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = ((R0 = shenjs_call(shen_$lt$e$gt$, [Arg5689_0])),
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
  function shen_user_lambda5692(Arg5691) {
  if (Arg5691.length < 1) return [shen_type_func, shen_user_lambda5692, 1, Arg5691];
  var Arg5691_0 = Arg5691[0];
  var R0;
  return ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg5691_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "->"], shenjs_call(shen_fst, [Arg5691_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg5691_0])[2], shenjs_call(shen_snd, [Arg5691_0])])]), [shen_type_symbol, "shen-forward"]])
  : shen_fail_obj)),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)))
  ? ((R0 = (((shenjs_is_type(shenjs_call(shen_fst, [Arg5691_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "<-"], shenjs_call(shen_fst, [Arg5691_0])[1]))))
  ? shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [shenjs_call(shen_reassemble, [shenjs_call(shen_fst, [Arg5691_0])[2], shenjs_call(shen_snd, [Arg5691_0])])]), [shen_type_symbol, "shen-backward"]])
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
  function shen_user_lambda5694(Arg5693) {
  if (Arg5693.length < 1) return [shen_type_func, shen_user_lambda5694, 1, Arg5693];
  var Arg5693_0 = Arg5693[0];
  return (function() {
  return shenjs_call_tail(shen_interror, ["syntax error in ~A~%", [shen_tuple, Arg5693_0, []]]);})},
  1,
  [],
  "shen-errordef"];
shenjs_functions["shen_shen-errordef"] = shen_errordef;






shen_t$asterisk$_rules = [shen_type_func,
  function shen_user_lambda5696(Arg5695) {
  if (Arg5695.length < 7) return [shen_type_func, shen_user_lambda5696, 7, Arg5695];
  var Arg5695_0 = Arg5695[0], Arg5695_1 = Arg5695[1], Arg5695_2 = Arg5695[2], Arg5695_3 = Arg5695[3], Arg5695_4 = Arg5695[4], Arg5695_5 = Arg5695[5], Arg5695_6 = Arg5695[6];
  var R0, R1, R2, R3;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5695_0, Arg5695_5])),
  ((shenjs_empty$question$(R1))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5695_6)))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg5695_0, Arg5695_5])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = R1[2]),
  (R3 = shenjs_call(shen_newpv, [Arg5695_5])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_t$asterisk$_rule, [R2, Arg5695_1, Arg5695_2, Arg5695_3, Arg5695_4, Arg5695_5, (new Shenjs_freeze([R2, R0, Arg5695_2, R1, Arg5695_1, R3, Arg5695_3, Arg5695_4, Arg5695_5, Arg5695_6], function(Arg5697) {
  var Arg5697_0 = Arg5697[0], Arg5697_1 = Arg5697[1], Arg5697_2 = Arg5697[2], Arg5697_3 = Arg5697[3], Arg5697_4 = Arg5697[4], Arg5697_5 = Arg5697[5], Arg5697_6 = Arg5697[6], Arg5697_7 = Arg5697[7], Arg5697_8 = Arg5697[8], Arg5697_9 = Arg5697[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5697_1, Arg5697_8, (new Shenjs_freeze([Arg5697_1, Arg5697_2, Arg5697_3, Arg5697_4, Arg5697_5, Arg5697_6, Arg5697_7, Arg5697_8, Arg5697_9], function(Arg5699) {
  var Arg5699_0 = Arg5699[0], Arg5699_1 = Arg5699[1], Arg5699_2 = Arg5699[2], Arg5699_3 = Arg5699[3], Arg5699_4 = Arg5699[4], Arg5699_5 = Arg5699[5], Arg5699_6 = Arg5699[6], Arg5699_7 = Arg5699[7], Arg5699_8 = Arg5699[8];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5699_4, (shenjs_call(shen_lazyderef, [Arg5699_1, Arg5699_7]) + 1), Arg5699_7, (new Shenjs_freeze([Arg5699_1, Arg5699_2, Arg5699_3, Arg5699_4, Arg5699_5, Arg5699_6, Arg5699_7, Arg5699_8], function(Arg5701) {
  var Arg5701_0 = Arg5701[0], Arg5701_1 = Arg5701[1], Arg5701_2 = Arg5701[2], Arg5701_3 = Arg5701[3], Arg5701_4 = Arg5701[4], Arg5701_5 = Arg5701[5], Arg5701_6 = Arg5701[6], Arg5701_7 = Arg5701[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_rules, [Arg5701_1, Arg5701_2, Arg5701_3, Arg5701_4, Arg5701_5, Arg5701_6, Arg5701_7]);});})}))]);});})}))]);});})}))]))
  : false))
  : R1))]);}))},
  7,
  [],
  "shen-t*-rules"];
shenjs_functions["shen_shen-t*-rules"] = shen_t$asterisk$_rules;






shen_t$asterisk$_rule = [shen_type_func,
  function shen_user_lambda5704(Arg5703) {
  if (Arg5703.length < 7) return [shen_type_func, shen_user_lambda5704, 7, Arg5703];
  var Arg5703_0 = Arg5703[0], Arg5703_1 = Arg5703[1], Arg5703_2 = Arg5703[2], Arg5703_3 = Arg5703[3], Arg5703_4 = Arg5703[4], Arg5703_5 = Arg5703[5], Arg5703_6 = Arg5703[6];
  var R0;
  return ((R0 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_t$asterisk$_ruleh, [Arg5703_0, Arg5703_1, Arg5703_4, Arg5703_5, Arg5703_6]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_newpv, [Arg5703_5])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [R0, shenjs_call(shen_type_insecure_rule_error_message, [shenjs_call(shen_lazyderef, [Arg5703_2, Arg5703_5]), shenjs_call(shen_lazyderef, [Arg5703_3, Arg5703_5])]), Arg5703_5, Arg5703_6]);}))
  : R0))},
  7,
  [],
  "shen-t*-rule"];
shenjs_functions["shen_shen-t*-rule"] = shen_t$asterisk$_rule;






shen_t$asterisk$_ruleh = [shen_type_func,
  function shen_user_lambda5706(Arg5705) {
  if (Arg5705.length < 5) return [shen_type_func, shen_user_lambda5706, 5, Arg5705];
  var Arg5705_0 = Arg5705[0], Arg5705_1 = Arg5705[1], Arg5705_2 = Arg5705[2], Arg5705_3 = Arg5705[3], Arg5705_4 = Arg5705[4];
  var R0, R1, R2, R3, R4, R5;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = shenjs_call(shen_lazyderef, [Arg5705_0, Arg5705_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5705_3])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R3 = R1[1]),
  (R1 = shenjs_call(shen_lazyderef, [R1[2], Arg5705_3])),
  ((shenjs_empty$question$(R1))
  ? ((R1 = shenjs_call(shen_newpv, [Arg5705_3])),
  (R4 = shenjs_call(shen_newpv, [Arg5705_3])),
  (R5 = shenjs_call(shen_newpv, [Arg5705_3])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_t$asterisk$_patterns, [R2, Arg5705_1, R1, R4, Arg5705_3, (new Shenjs_freeze([R2, Arg5705_1, R1, Arg5705_2, R0, R3, R4, R5, Arg5705_3, Arg5705_4], function(Arg5707) {
  var Arg5707_0 = Arg5707[0], Arg5707_1 = Arg5707[1], Arg5707_2 = Arg5707[2], Arg5707_3 = Arg5707[3], Arg5707_4 = Arg5707[4], Arg5707_5 = Arg5707[5], Arg5707_6 = Arg5707[6], Arg5707_7 = Arg5707[7], Arg5707_8 = Arg5707[8], Arg5707_9 = Arg5707[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5707_4, Arg5707_8, (new Shenjs_freeze([Arg5707_2, Arg5707_3, Arg5707_4, Arg5707_5, Arg5707_6, Arg5707_7, Arg5707_8, Arg5707_9], function(Arg5709) {
  var Arg5709_0 = Arg5709[0], Arg5709_1 = Arg5709[1], Arg5709_2 = Arg5709[2], Arg5709_3 = Arg5709[3], Arg5709_4 = Arg5709[4], Arg5709_5 = Arg5709[5], Arg5709_6 = Arg5709[6], Arg5709_7 = Arg5709[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_conc, [Arg5709_0, Arg5709_1, Arg5709_5, Arg5709_6, (new Shenjs_freeze([Arg5709_0, Arg5709_1, Arg5709_2, Arg5709_3, Arg5709_4, Arg5709_5, Arg5709_6, Arg5709_7], function(Arg5711) {
  var Arg5711_0 = Arg5711[0], Arg5711_1 = Arg5711[1], Arg5711_2 = Arg5711[2], Arg5711_3 = Arg5711[3], Arg5711_4 = Arg5711[4], Arg5711_5 = Arg5711[5], Arg5711_6 = Arg5711[6], Arg5711_7 = Arg5711[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5711_2, Arg5711_6, (new Shenjs_freeze([Arg5711_2, Arg5711_3, Arg5711_4, Arg5711_5, Arg5711_6, Arg5711_7], function(Arg5713) {
  var Arg5713_0 = Arg5713[0], Arg5713_1 = Arg5713[1], Arg5713_2 = Arg5713[2], Arg5713_3 = Arg5713[3], Arg5713_4 = Arg5713[4], Arg5713_5 = Arg5713[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5713_1, Arg5713_2, Arg5713_3, Arg5713_4, Arg5713_5]);});})}))]);});})}))]);});})}))]);});})}))]))
  : false))
  : false))
  : false))]);}))},
  5,
  [],
  "shen-t*-ruleh"];
shenjs_functions["shen_shen-t*-ruleh"] = shen_t$asterisk$_ruleh;






shen_type_insecure_rule_error_message = [shen_type_func,
  function shen_user_lambda5716(Arg5715) {
  if (Arg5715.length < 2) return [shen_type_func, shen_user_lambda5716, 2, Arg5715];
  var Arg5715_0 = Arg5715[0], Arg5715_1 = Arg5715[1];
  return (function() {
  return shenjs_call_tail(shen_interror, ["type error in rule ~A of ~A~%", [shen_tuple, Arg5715_0, [shen_tuple, Arg5715_1, []]]]);})},
  2,
  [],
  "shen-type-insecure-rule-error-message"];
shenjs_functions["shen_shen-type-insecure-rule-error-message"] = shen_type_insecure_rule_error_message;






shen_t$asterisk$_patterns = [shen_type_func,
  function shen_user_lambda5718(Arg5717) {
  if (Arg5717.length < 6) return [shen_type_func, shen_user_lambda5718, 6, Arg5717];
  var Arg5717_0 = Arg5717[0], Arg5717_1 = Arg5717[1], Arg5717_2 = Arg5717[2], Arg5717_3 = Arg5717[3], Arg5717_4 = Arg5717[4], Arg5717_5 = Arg5717[5];
  var R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R1 = ((R1 = shenjs_call(shen_lazyderef, [Arg5717_0, Arg5717_4])),
  ((shenjs_empty$question$(R1))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg5717_2, Arg5717_4])),
  ((shenjs_empty$question$(R1))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [Arg5717_3, Arg5717_1, Arg5717_4, Arg5717_5]))
  : ((shenjs_call(shen_pvar$question$, [R1]))
  ? (shenjs_call(shen_bindv, [R1, [], Arg5717_4]),
  (R2 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [Arg5717_3, Arg5717_1, Arg5717_4, Arg5717_5]))),
  shenjs_call(shen_unbindv, [R1, Arg5717_4]),
  R2)
  : false)))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R1, false)))
  ? ((R1 = shenjs_call(shen_lazyderef, [Arg5717_0, Arg5717_4])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = R1[2]),
  (R3 = shenjs_call(shen_lazyderef, [Arg5717_1, Arg5717_4])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R4 = R3[1]),
  (R3 = shenjs_call(shen_lazyderef, [R3[2], Arg5717_4])),
  ((shenjs_is_type(R3, shen_type_cons))
  ? ((R5 = shenjs_call(shen_lazyderef, [R3[1], Arg5717_4])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-->"], R5)))
  ? ((R5 = shenjs_call(shen_lazyderef, [R3[2], Arg5717_4])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R3 = R5[1]),
  (R5 = shenjs_call(shen_lazyderef, [R5[2], Arg5717_4])),
  ((shenjs_empty$question$(R5))
  ? ((R5 = shenjs_call(shen_lazyderef, [Arg5717_2, Arg5717_4])),
  ((shenjs_is_type(R5, shen_type_cons))
  ? ((R6 = shenjs_call(shen_lazyderef, [R5[1], Arg5717_4])),
  ((shenjs_is_type(R6, shen_type_cons))
  ? ((R7 = R6[1]),
  (R6 = shenjs_call(shen_lazyderef, [R6[2], Arg5717_4])),
  ((shenjs_is_type(R6, shen_type_cons))
  ? ((R8 = shenjs_call(shen_lazyderef, [R6[1], Arg5717_4])),
  ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], R8)))
  ? ((R8 = shenjs_call(shen_lazyderef, [R6[2], Arg5717_4])),
  ((shenjs_is_type(R8, shen_type_cons))
  ? ((R6 = R8[1]),
  (R8 = shenjs_call(shen_lazyderef, [R8[2], Arg5717_4])),
  ((shenjs_empty$question$(R8))
  ? ((R8 = R5[2]),
  (R5 = shenjs_call(shen_newpv, [Arg5717_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R6, R4, Arg5717_4, (new Shenjs_freeze([R4, R2, R7, R6, R5, R0, R1, R3, R8, Arg5717_3, Arg5717_4, Arg5717_5], function(Arg5719) {
  var Arg5719_0 = Arg5719[0], Arg5719_1 = Arg5719[1], Arg5719_2 = Arg5719[2], Arg5719_3 = Arg5719[3], Arg5719_4 = Arg5719[4], Arg5719_5 = Arg5719[5], Arg5719_6 = Arg5719[6], Arg5719_7 = Arg5719[7], Arg5719_8 = Arg5719[8], Arg5719_9 = Arg5719[9], Arg5719_10 = Arg5719[10], Arg5719_11 = Arg5719[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5719_2, Arg5719_1, Arg5719_10, (new Shenjs_freeze([Arg5719_1, Arg5719_2, Arg5719_3, Arg5719_4, Arg5719_5, Arg5719_6, Arg5719_7, Arg5719_8, Arg5719_9, Arg5719_10, Arg5719_11], function(Arg5721) {
  var Arg5721_0 = Arg5721[0], Arg5721_1 = Arg5721[1], Arg5721_2 = Arg5721[2], Arg5721_3 = Arg5721[3], Arg5721_4 = Arg5721[4], Arg5721_5 = Arg5721[5], Arg5721_6 = Arg5721[6], Arg5721_7 = Arg5721[7], Arg5721_8 = Arg5721[8], Arg5721_9 = Arg5721[9], Arg5721_10 = Arg5721[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5721_1, Arg5721_3, Arg5721_9, (new Shenjs_freeze([Arg5721_1, Arg5721_2, Arg5721_3, Arg5721_4, Arg5721_5, Arg5721_6, Arg5721_7, Arg5721_8, Arg5721_9, Arg5721_10], function(Arg5723) {
  var Arg5723_0 = Arg5723[0], Arg5723_1 = Arg5723[1], Arg5723_2 = Arg5723[2], Arg5723_3 = Arg5723[3], Arg5723_4 = Arg5723[4], Arg5723_5 = Arg5723[5], Arg5723_6 = Arg5723[6], Arg5723_7 = Arg5723[7], Arg5723_8 = Arg5723[8], Arg5723_9 = Arg5723[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5723_3, Arg5723_8, (new Shenjs_freeze([Arg5723_0, Arg5723_1, Arg5723_2, Arg5723_3, Arg5723_4, Arg5723_5, Arg5723_6, Arg5723_7, Arg5723_8, Arg5723_9], function(Arg5725) {
  var Arg5725_0 = Arg5725[0], Arg5725_1 = Arg5725[1], Arg5725_2 = Arg5725[2], Arg5725_3 = Arg5725[3], Arg5725_4 = Arg5725[4], Arg5725_5 = Arg5725[5], Arg5725_6 = Arg5725[6], Arg5725_7 = Arg5725[7], Arg5725_8 = Arg5725[8], Arg5725_9 = Arg5725[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5725_0, Arg5725_1, Arg5725_2, Arg5725_8, (new Shenjs_freeze([Arg5725_0, Arg5725_1, Arg5725_2, Arg5725_3, Arg5725_4, Arg5725_5, Arg5725_6, Arg5725_7, Arg5725_8, Arg5725_9], function(Arg5727) {
  var Arg5727_0 = Arg5727[0], Arg5727_1 = Arg5727[1], Arg5727_2 = Arg5727[2], Arg5727_3 = Arg5727[3], Arg5727_4 = Arg5727[4], Arg5727_5 = Arg5727[5], Arg5727_6 = Arg5727[6], Arg5727_7 = Arg5727[7], Arg5727_8 = Arg5727[8], Arg5727_9 = Arg5727[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5727_3, Arg5727_8, (new Shenjs_freeze([Arg5727_3, Arg5727_4, Arg5727_5, Arg5727_6, Arg5727_7, Arg5727_8, Arg5727_9], function(Arg5729) {
  var Arg5729_0 = Arg5729[0], Arg5729_1 = Arg5729[1], Arg5729_2 = Arg5729[2], Arg5729_3 = Arg5729[3], Arg5729_4 = Arg5729[4], Arg5729_5 = Arg5729[5], Arg5729_6 = Arg5729[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5729_1, Arg5729_2, Arg5729_3, Arg5729_4, Arg5729_5, Arg5729_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R8]))
  ? (shenjs_call(shen_bindv, [R8, [], Arg5717_4]),
  (R7 = ((R5 = R5[2]),
  (R9 = shenjs_call(shen_newpv, [Arg5717_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R6, R4, Arg5717_4, (new Shenjs_freeze([R4, R2, R7, R6, R9, R0, R1, R3, R5, Arg5717_3, Arg5717_4, Arg5717_5, R8, Arg5717_4], function(Arg5731) {
  var Arg5731_0 = Arg5731[0], Arg5731_1 = Arg5731[1], Arg5731_2 = Arg5731[2], Arg5731_3 = Arg5731[3], Arg5731_4 = Arg5731[4], Arg5731_5 = Arg5731[5], Arg5731_6 = Arg5731[6], Arg5731_7 = Arg5731[7], Arg5731_8 = Arg5731[8], Arg5731_9 = Arg5731[9], Arg5731_10 = Arg5731[10], Arg5731_11 = Arg5731[11], Arg5731_12 = Arg5731[12], Arg5731_13 = Arg5731[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5731_2, Arg5731_1, Arg5731_10, (new Shenjs_freeze([Arg5731_1, Arg5731_2, Arg5731_3, Arg5731_4, Arg5731_5, Arg5731_6, Arg5731_7, Arg5731_8, Arg5731_9, Arg5731_10, Arg5731_11], function(Arg5733) {
  var Arg5733_0 = Arg5733[0], Arg5733_1 = Arg5733[1], Arg5733_2 = Arg5733[2], Arg5733_3 = Arg5733[3], Arg5733_4 = Arg5733[4], Arg5733_5 = Arg5733[5], Arg5733_6 = Arg5733[6], Arg5733_7 = Arg5733[7], Arg5733_8 = Arg5733[8], Arg5733_9 = Arg5733[9], Arg5733_10 = Arg5733[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5733_1, Arg5733_3, Arg5733_9, (new Shenjs_freeze([Arg5733_1, Arg5733_2, Arg5733_3, Arg5733_4, Arg5733_5, Arg5733_6, Arg5733_7, Arg5733_8, Arg5733_9, Arg5733_10], function(Arg5735) {
  var Arg5735_0 = Arg5735[0], Arg5735_1 = Arg5735[1], Arg5735_2 = Arg5735[2], Arg5735_3 = Arg5735[3], Arg5735_4 = Arg5735[4], Arg5735_5 = Arg5735[5], Arg5735_6 = Arg5735[6], Arg5735_7 = Arg5735[7], Arg5735_8 = Arg5735[8], Arg5735_9 = Arg5735[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5735_3, Arg5735_8, (new Shenjs_freeze([Arg5735_0, Arg5735_1, Arg5735_2, Arg5735_3, Arg5735_4, Arg5735_5, Arg5735_6, Arg5735_7, Arg5735_8, Arg5735_9], function(Arg5737) {
  var Arg5737_0 = Arg5737[0], Arg5737_1 = Arg5737[1], Arg5737_2 = Arg5737[2], Arg5737_3 = Arg5737[3], Arg5737_4 = Arg5737[4], Arg5737_5 = Arg5737[5], Arg5737_6 = Arg5737[6], Arg5737_7 = Arg5737[7], Arg5737_8 = Arg5737[8], Arg5737_9 = Arg5737[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5737_0, Arg5737_1, Arg5737_2, Arg5737_8, (new Shenjs_freeze([Arg5737_0, Arg5737_1, Arg5737_2, Arg5737_3, Arg5737_4, Arg5737_5, Arg5737_6, Arg5737_7, Arg5737_8, Arg5737_9], function(Arg5739) {
  var Arg5739_0 = Arg5739[0], Arg5739_1 = Arg5739[1], Arg5739_2 = Arg5739[2], Arg5739_3 = Arg5739[3], Arg5739_4 = Arg5739[4], Arg5739_5 = Arg5739[5], Arg5739_6 = Arg5739[6], Arg5739_7 = Arg5739[7], Arg5739_8 = Arg5739[8], Arg5739_9 = Arg5739[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5739_3, Arg5739_8, (new Shenjs_freeze([Arg5739_3, Arg5739_4, Arg5739_5, Arg5739_6, Arg5739_7, Arg5739_8, Arg5739_9], function(Arg5741) {
  var Arg5741_0 = Arg5741[0], Arg5741_1 = Arg5741[1], Arg5741_2 = Arg5741[2], Arg5741_3 = Arg5741[3], Arg5741_4 = Arg5741[4], Arg5741_5 = Arg5741[5], Arg5741_6 = Arg5741[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5741_1, Arg5741_2, Arg5741_3, Arg5741_4, Arg5741_5, Arg5741_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R8, Arg5717_4]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R8]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5717_4])),
  shenjs_call(shen_bindv, [R8, [shen_type_cons, R6, []], Arg5717_4]),
  (R7 = ((R5 = R5[2]),
  (R9 = shenjs_call(shen_newpv, [Arg5717_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R6, R4, Arg5717_4, (new Shenjs_freeze([R4, R2, R7, R6, R9, R0, R1, R3, R5, Arg5717_3, Arg5717_4, Arg5717_5, R8, Arg5717_4], function(Arg5743) {
  var Arg5743_0 = Arg5743[0], Arg5743_1 = Arg5743[1], Arg5743_2 = Arg5743[2], Arg5743_3 = Arg5743[3], Arg5743_4 = Arg5743[4], Arg5743_5 = Arg5743[5], Arg5743_6 = Arg5743[6], Arg5743_7 = Arg5743[7], Arg5743_8 = Arg5743[8], Arg5743_9 = Arg5743[9], Arg5743_10 = Arg5743[10], Arg5743_11 = Arg5743[11], Arg5743_12 = Arg5743[12], Arg5743_13 = Arg5743[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5743_2, Arg5743_1, Arg5743_10, (new Shenjs_freeze([Arg5743_1, Arg5743_2, Arg5743_3, Arg5743_4, Arg5743_5, Arg5743_6, Arg5743_7, Arg5743_8, Arg5743_9, Arg5743_10, Arg5743_11], function(Arg5745) {
  var Arg5745_0 = Arg5745[0], Arg5745_1 = Arg5745[1], Arg5745_2 = Arg5745[2], Arg5745_3 = Arg5745[3], Arg5745_4 = Arg5745[4], Arg5745_5 = Arg5745[5], Arg5745_6 = Arg5745[6], Arg5745_7 = Arg5745[7], Arg5745_8 = Arg5745[8], Arg5745_9 = Arg5745[9], Arg5745_10 = Arg5745[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5745_1, Arg5745_3, Arg5745_9, (new Shenjs_freeze([Arg5745_1, Arg5745_2, Arg5745_3, Arg5745_4, Arg5745_5, Arg5745_6, Arg5745_7, Arg5745_8, Arg5745_9, Arg5745_10], function(Arg5747) {
  var Arg5747_0 = Arg5747[0], Arg5747_1 = Arg5747[1], Arg5747_2 = Arg5747[2], Arg5747_3 = Arg5747[3], Arg5747_4 = Arg5747[4], Arg5747_5 = Arg5747[5], Arg5747_6 = Arg5747[6], Arg5747_7 = Arg5747[7], Arg5747_8 = Arg5747[8], Arg5747_9 = Arg5747[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5747_3, Arg5747_8, (new Shenjs_freeze([Arg5747_0, Arg5747_1, Arg5747_2, Arg5747_3, Arg5747_4, Arg5747_5, Arg5747_6, Arg5747_7, Arg5747_8, Arg5747_9], function(Arg5749) {
  var Arg5749_0 = Arg5749[0], Arg5749_1 = Arg5749[1], Arg5749_2 = Arg5749[2], Arg5749_3 = Arg5749[3], Arg5749_4 = Arg5749[4], Arg5749_5 = Arg5749[5], Arg5749_6 = Arg5749[6], Arg5749_7 = Arg5749[7], Arg5749_8 = Arg5749[8], Arg5749_9 = Arg5749[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5749_0, Arg5749_1, Arg5749_2, Arg5749_8, (new Shenjs_freeze([Arg5749_0, Arg5749_1, Arg5749_2, Arg5749_3, Arg5749_4, Arg5749_5, Arg5749_6, Arg5749_7, Arg5749_8, Arg5749_9], function(Arg5751) {
  var Arg5751_0 = Arg5751[0], Arg5751_1 = Arg5751[1], Arg5751_2 = Arg5751[2], Arg5751_3 = Arg5751[3], Arg5751_4 = Arg5751[4], Arg5751_5 = Arg5751[5], Arg5751_6 = Arg5751[6], Arg5751_7 = Arg5751[7], Arg5751_8 = Arg5751[8], Arg5751_9 = Arg5751[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5751_3, Arg5751_8, (new Shenjs_freeze([Arg5751_3, Arg5751_4, Arg5751_5, Arg5751_6, Arg5751_7, Arg5751_8, Arg5751_9], function(Arg5753) {
  var Arg5753_0 = Arg5753[0], Arg5753_1 = Arg5753[1], Arg5753_2 = Arg5753[2], Arg5753_3 = Arg5753[3], Arg5753_4 = Arg5753[4], Arg5753_5 = Arg5753[5], Arg5753_6 = Arg5753[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5753_1, Arg5753_2, Arg5753_3, Arg5753_4, Arg5753_5, Arg5753_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R8, Arg5717_4]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R8]))
  ? (shenjs_call(shen_bindv, [R8, [shen_type_symbol, ":"], Arg5717_4]),
  (R7 = ((R6 = shenjs_call(shen_lazyderef, [R6[2], Arg5717_4])),
  ((shenjs_is_type(R6, shen_type_cons))
  ? ((R9 = R6[1]),
  (R6 = shenjs_call(shen_lazyderef, [R6[2], Arg5717_4])),
  ((shenjs_empty$question$(R6))
  ? ((R6 = R5[2]),
  (R5 = shenjs_call(shen_newpv, [Arg5717_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R9, R4, Arg5717_4, (new Shenjs_freeze([R4, R2, R7, R9, R5, R0, R1, R3, R6, Arg5717_3, Arg5717_4, Arg5717_5, R8, Arg5717_4], function(Arg5755) {
  var Arg5755_0 = Arg5755[0], Arg5755_1 = Arg5755[1], Arg5755_2 = Arg5755[2], Arg5755_3 = Arg5755[3], Arg5755_4 = Arg5755[4], Arg5755_5 = Arg5755[5], Arg5755_6 = Arg5755[6], Arg5755_7 = Arg5755[7], Arg5755_8 = Arg5755[8], Arg5755_9 = Arg5755[9], Arg5755_10 = Arg5755[10], Arg5755_11 = Arg5755[11], Arg5755_12 = Arg5755[12], Arg5755_13 = Arg5755[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5755_2, Arg5755_1, Arg5755_10, (new Shenjs_freeze([Arg5755_1, Arg5755_2, Arg5755_3, Arg5755_4, Arg5755_5, Arg5755_6, Arg5755_7, Arg5755_8, Arg5755_9, Arg5755_10, Arg5755_11], function(Arg5757) {
  var Arg5757_0 = Arg5757[0], Arg5757_1 = Arg5757[1], Arg5757_2 = Arg5757[2], Arg5757_3 = Arg5757[3], Arg5757_4 = Arg5757[4], Arg5757_5 = Arg5757[5], Arg5757_6 = Arg5757[6], Arg5757_7 = Arg5757[7], Arg5757_8 = Arg5757[8], Arg5757_9 = Arg5757[9], Arg5757_10 = Arg5757[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5757_1, Arg5757_3, Arg5757_9, (new Shenjs_freeze([Arg5757_1, Arg5757_2, Arg5757_3, Arg5757_4, Arg5757_5, Arg5757_6, Arg5757_7, Arg5757_8, Arg5757_9, Arg5757_10], function(Arg5759) {
  var Arg5759_0 = Arg5759[0], Arg5759_1 = Arg5759[1], Arg5759_2 = Arg5759[2], Arg5759_3 = Arg5759[3], Arg5759_4 = Arg5759[4], Arg5759_5 = Arg5759[5], Arg5759_6 = Arg5759[6], Arg5759_7 = Arg5759[7], Arg5759_8 = Arg5759[8], Arg5759_9 = Arg5759[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5759_3, Arg5759_8, (new Shenjs_freeze([Arg5759_0, Arg5759_1, Arg5759_2, Arg5759_3, Arg5759_4, Arg5759_5, Arg5759_6, Arg5759_7, Arg5759_8, Arg5759_9], function(Arg5761) {
  var Arg5761_0 = Arg5761[0], Arg5761_1 = Arg5761[1], Arg5761_2 = Arg5761[2], Arg5761_3 = Arg5761[3], Arg5761_4 = Arg5761[4], Arg5761_5 = Arg5761[5], Arg5761_6 = Arg5761[6], Arg5761_7 = Arg5761[7], Arg5761_8 = Arg5761[8], Arg5761_9 = Arg5761[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5761_0, Arg5761_1, Arg5761_2, Arg5761_8, (new Shenjs_freeze([Arg5761_0, Arg5761_1, Arg5761_2, Arg5761_3, Arg5761_4, Arg5761_5, Arg5761_6, Arg5761_7, Arg5761_8, Arg5761_9], function(Arg5763) {
  var Arg5763_0 = Arg5763[0], Arg5763_1 = Arg5763[1], Arg5763_2 = Arg5763[2], Arg5763_3 = Arg5763[3], Arg5763_4 = Arg5763[4], Arg5763_5 = Arg5763[5], Arg5763_6 = Arg5763[6], Arg5763_7 = Arg5763[7], Arg5763_8 = Arg5763[8], Arg5763_9 = Arg5763[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5763_3, Arg5763_8, (new Shenjs_freeze([Arg5763_3, Arg5763_4, Arg5763_5, Arg5763_6, Arg5763_7, Arg5763_8, Arg5763_9], function(Arg5765) {
  var Arg5765_0 = Arg5765[0], Arg5765_1 = Arg5765[1], Arg5765_2 = Arg5765[2], Arg5765_3 = Arg5765[3], Arg5765_4 = Arg5765[4], Arg5765_5 = Arg5765[5], Arg5765_6 = Arg5765[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5765_1, Arg5765_2, Arg5765_3, Arg5765_4, Arg5765_5, Arg5765_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? (shenjs_call(shen_bindv, [R6, [], Arg5717_4]),
  (R9 = ((R5 = R5[2]),
  (R10 = shenjs_call(shen_newpv, [Arg5717_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R9, R4, Arg5717_4, (new Shenjs_freeze([R4, R2, R7, R9, R10, R0, R1, R3, R5, Arg5717_3, Arg5717_4, Arg5717_5, R6, Arg5717_4, R8, Arg5717_4], function(Arg5767) {
  var Arg5767_0 = Arg5767[0], Arg5767_1 = Arg5767[1], Arg5767_2 = Arg5767[2], Arg5767_3 = Arg5767[3], Arg5767_4 = Arg5767[4], Arg5767_5 = Arg5767[5], Arg5767_6 = Arg5767[6], Arg5767_7 = Arg5767[7], Arg5767_8 = Arg5767[8], Arg5767_9 = Arg5767[9], Arg5767_10 = Arg5767[10], Arg5767_11 = Arg5767[11], Arg5767_12 = Arg5767[12], Arg5767_13 = Arg5767[13], Arg5767_14 = Arg5767[14], Arg5767_15 = Arg5767[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5767_2, Arg5767_1, Arg5767_10, (new Shenjs_freeze([Arg5767_1, Arg5767_2, Arg5767_3, Arg5767_4, Arg5767_5, Arg5767_6, Arg5767_7, Arg5767_8, Arg5767_9, Arg5767_10, Arg5767_11], function(Arg5769) {
  var Arg5769_0 = Arg5769[0], Arg5769_1 = Arg5769[1], Arg5769_2 = Arg5769[2], Arg5769_3 = Arg5769[3], Arg5769_4 = Arg5769[4], Arg5769_5 = Arg5769[5], Arg5769_6 = Arg5769[6], Arg5769_7 = Arg5769[7], Arg5769_8 = Arg5769[8], Arg5769_9 = Arg5769[9], Arg5769_10 = Arg5769[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5769_1, Arg5769_3, Arg5769_9, (new Shenjs_freeze([Arg5769_1, Arg5769_2, Arg5769_3, Arg5769_4, Arg5769_5, Arg5769_6, Arg5769_7, Arg5769_8, Arg5769_9, Arg5769_10], function(Arg5771) {
  var Arg5771_0 = Arg5771[0], Arg5771_1 = Arg5771[1], Arg5771_2 = Arg5771[2], Arg5771_3 = Arg5771[3], Arg5771_4 = Arg5771[4], Arg5771_5 = Arg5771[5], Arg5771_6 = Arg5771[6], Arg5771_7 = Arg5771[7], Arg5771_8 = Arg5771[8], Arg5771_9 = Arg5771[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5771_3, Arg5771_8, (new Shenjs_freeze([Arg5771_0, Arg5771_1, Arg5771_2, Arg5771_3, Arg5771_4, Arg5771_5, Arg5771_6, Arg5771_7, Arg5771_8, Arg5771_9], function(Arg5773) {
  var Arg5773_0 = Arg5773[0], Arg5773_1 = Arg5773[1], Arg5773_2 = Arg5773[2], Arg5773_3 = Arg5773[3], Arg5773_4 = Arg5773[4], Arg5773_5 = Arg5773[5], Arg5773_6 = Arg5773[6], Arg5773_7 = Arg5773[7], Arg5773_8 = Arg5773[8], Arg5773_9 = Arg5773[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5773_0, Arg5773_1, Arg5773_2, Arg5773_8, (new Shenjs_freeze([Arg5773_0, Arg5773_1, Arg5773_2, Arg5773_3, Arg5773_4, Arg5773_5, Arg5773_6, Arg5773_7, Arg5773_8, Arg5773_9], function(Arg5775) {
  var Arg5775_0 = Arg5775[0], Arg5775_1 = Arg5775[1], Arg5775_2 = Arg5775[2], Arg5775_3 = Arg5775[3], Arg5775_4 = Arg5775[4], Arg5775_5 = Arg5775[5], Arg5775_6 = Arg5775[6], Arg5775_7 = Arg5775[7], Arg5775_8 = Arg5775[8], Arg5775_9 = Arg5775[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5775_3, Arg5775_8, (new Shenjs_freeze([Arg5775_3, Arg5775_4, Arg5775_5, Arg5775_6, Arg5775_7, Arg5775_8, Arg5775_9], function(Arg5777) {
  var Arg5777_0 = Arg5777[0], Arg5777_1 = Arg5777[1], Arg5777_2 = Arg5777[2], Arg5777_3 = Arg5777[3], Arg5777_4 = Arg5777[4], Arg5777_5 = Arg5777[5], Arg5777_6 = Arg5777[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5777_1, Arg5777_2, Arg5777_3, Arg5777_4, Arg5777_5, Arg5777_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R6, Arg5717_4]),
  R9)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? ((R9 = shenjs_call(shen_newpv, [Arg5717_4])),
  shenjs_call(shen_bindv, [R6, [shen_type_cons, R9, []], Arg5717_4]),
  (R9 = ((R5 = R5[2]),
  (R10 = shenjs_call(shen_newpv, [Arg5717_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R9, R4, Arg5717_4, (new Shenjs_freeze([R4, R2, R7, R9, R10, R0, R1, R3, R5, Arg5717_3, Arg5717_4, Arg5717_5, R6, Arg5717_4, R8, Arg5717_4], function(Arg5779) {
  var Arg5779_0 = Arg5779[0], Arg5779_1 = Arg5779[1], Arg5779_2 = Arg5779[2], Arg5779_3 = Arg5779[3], Arg5779_4 = Arg5779[4], Arg5779_5 = Arg5779[5], Arg5779_6 = Arg5779[6], Arg5779_7 = Arg5779[7], Arg5779_8 = Arg5779[8], Arg5779_9 = Arg5779[9], Arg5779_10 = Arg5779[10], Arg5779_11 = Arg5779[11], Arg5779_12 = Arg5779[12], Arg5779_13 = Arg5779[13], Arg5779_14 = Arg5779[14], Arg5779_15 = Arg5779[15];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5779_2, Arg5779_1, Arg5779_10, (new Shenjs_freeze([Arg5779_1, Arg5779_2, Arg5779_3, Arg5779_4, Arg5779_5, Arg5779_6, Arg5779_7, Arg5779_8, Arg5779_9, Arg5779_10, Arg5779_11], function(Arg5781) {
  var Arg5781_0 = Arg5781[0], Arg5781_1 = Arg5781[1], Arg5781_2 = Arg5781[2], Arg5781_3 = Arg5781[3], Arg5781_4 = Arg5781[4], Arg5781_5 = Arg5781[5], Arg5781_6 = Arg5781[6], Arg5781_7 = Arg5781[7], Arg5781_8 = Arg5781[8], Arg5781_9 = Arg5781[9], Arg5781_10 = Arg5781[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5781_1, Arg5781_3, Arg5781_9, (new Shenjs_freeze([Arg5781_1, Arg5781_2, Arg5781_3, Arg5781_4, Arg5781_5, Arg5781_6, Arg5781_7, Arg5781_8, Arg5781_9, Arg5781_10], function(Arg5783) {
  var Arg5783_0 = Arg5783[0], Arg5783_1 = Arg5783[1], Arg5783_2 = Arg5783[2], Arg5783_3 = Arg5783[3], Arg5783_4 = Arg5783[4], Arg5783_5 = Arg5783[5], Arg5783_6 = Arg5783[6], Arg5783_7 = Arg5783[7], Arg5783_8 = Arg5783[8], Arg5783_9 = Arg5783[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5783_3, Arg5783_8, (new Shenjs_freeze([Arg5783_0, Arg5783_1, Arg5783_2, Arg5783_3, Arg5783_4, Arg5783_5, Arg5783_6, Arg5783_7, Arg5783_8, Arg5783_9], function(Arg5785) {
  var Arg5785_0 = Arg5785[0], Arg5785_1 = Arg5785[1], Arg5785_2 = Arg5785[2], Arg5785_3 = Arg5785[3], Arg5785_4 = Arg5785[4], Arg5785_5 = Arg5785[5], Arg5785_6 = Arg5785[6], Arg5785_7 = Arg5785[7], Arg5785_8 = Arg5785[8], Arg5785_9 = Arg5785[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5785_0, Arg5785_1, Arg5785_2, Arg5785_8, (new Shenjs_freeze([Arg5785_0, Arg5785_1, Arg5785_2, Arg5785_3, Arg5785_4, Arg5785_5, Arg5785_6, Arg5785_7, Arg5785_8, Arg5785_9], function(Arg5787) {
  var Arg5787_0 = Arg5787[0], Arg5787_1 = Arg5787[1], Arg5787_2 = Arg5787[2], Arg5787_3 = Arg5787[3], Arg5787_4 = Arg5787[4], Arg5787_5 = Arg5787[5], Arg5787_6 = Arg5787[6], Arg5787_7 = Arg5787[7], Arg5787_8 = Arg5787[8], Arg5787_9 = Arg5787[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5787_3, Arg5787_8, (new Shenjs_freeze([Arg5787_3, Arg5787_4, Arg5787_5, Arg5787_6, Arg5787_7, Arg5787_8, Arg5787_9], function(Arg5789) {
  var Arg5789_0 = Arg5789[0], Arg5789_1 = Arg5789[1], Arg5789_2 = Arg5789[2], Arg5789_3 = Arg5789[3], Arg5789_4 = Arg5789[4], Arg5789_5 = Arg5789[5], Arg5789_6 = Arg5789[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5789_1, Arg5789_2, Arg5789_3, Arg5789_4, Arg5789_5, Arg5789_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R6, Arg5717_4]),
  R9)
  : false)))),
  shenjs_call(shen_unbindv, [R8, Arg5717_4]),
  R7)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? ((R8 = shenjs_call(shen_newpv, [Arg5717_4])),
  shenjs_call(shen_bindv, [R6, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, R8, []]], Arg5717_4]),
  (R8 = ((R5 = R5[2]),
  (R9 = shenjs_call(shen_newpv, [Arg5717_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R8, R4, Arg5717_4, (new Shenjs_freeze([R4, R2, R7, R8, R9, R0, R1, R3, R5, Arg5717_3, Arg5717_4, Arg5717_5, R6, Arg5717_4], function(Arg5791) {
  var Arg5791_0 = Arg5791[0], Arg5791_1 = Arg5791[1], Arg5791_2 = Arg5791[2], Arg5791_3 = Arg5791[3], Arg5791_4 = Arg5791[4], Arg5791_5 = Arg5791[5], Arg5791_6 = Arg5791[6], Arg5791_7 = Arg5791[7], Arg5791_8 = Arg5791[8], Arg5791_9 = Arg5791[9], Arg5791_10 = Arg5791[10], Arg5791_11 = Arg5791[11], Arg5791_12 = Arg5791[12], Arg5791_13 = Arg5791[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5791_2, Arg5791_1, Arg5791_10, (new Shenjs_freeze([Arg5791_1, Arg5791_2, Arg5791_3, Arg5791_4, Arg5791_5, Arg5791_6, Arg5791_7, Arg5791_8, Arg5791_9, Arg5791_10, Arg5791_11], function(Arg5793) {
  var Arg5793_0 = Arg5793[0], Arg5793_1 = Arg5793[1], Arg5793_2 = Arg5793[2], Arg5793_3 = Arg5793[3], Arg5793_4 = Arg5793[4], Arg5793_5 = Arg5793[5], Arg5793_6 = Arg5793[6], Arg5793_7 = Arg5793[7], Arg5793_8 = Arg5793[8], Arg5793_9 = Arg5793[9], Arg5793_10 = Arg5793[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5793_1, Arg5793_3, Arg5793_9, (new Shenjs_freeze([Arg5793_1, Arg5793_2, Arg5793_3, Arg5793_4, Arg5793_5, Arg5793_6, Arg5793_7, Arg5793_8, Arg5793_9, Arg5793_10], function(Arg5795) {
  var Arg5795_0 = Arg5795[0], Arg5795_1 = Arg5795[1], Arg5795_2 = Arg5795[2], Arg5795_3 = Arg5795[3], Arg5795_4 = Arg5795[4], Arg5795_5 = Arg5795[5], Arg5795_6 = Arg5795[6], Arg5795_7 = Arg5795[7], Arg5795_8 = Arg5795[8], Arg5795_9 = Arg5795[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5795_3, Arg5795_8, (new Shenjs_freeze([Arg5795_0, Arg5795_1, Arg5795_2, Arg5795_3, Arg5795_4, Arg5795_5, Arg5795_6, Arg5795_7, Arg5795_8, Arg5795_9], function(Arg5797) {
  var Arg5797_0 = Arg5797[0], Arg5797_1 = Arg5797[1], Arg5797_2 = Arg5797[2], Arg5797_3 = Arg5797[3], Arg5797_4 = Arg5797[4], Arg5797_5 = Arg5797[5], Arg5797_6 = Arg5797[6], Arg5797_7 = Arg5797[7], Arg5797_8 = Arg5797[8], Arg5797_9 = Arg5797[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5797_0, Arg5797_1, Arg5797_2, Arg5797_8, (new Shenjs_freeze([Arg5797_0, Arg5797_1, Arg5797_2, Arg5797_3, Arg5797_4, Arg5797_5, Arg5797_6, Arg5797_7, Arg5797_8, Arg5797_9], function(Arg5799) {
  var Arg5799_0 = Arg5799[0], Arg5799_1 = Arg5799[1], Arg5799_2 = Arg5799[2], Arg5799_3 = Arg5799[3], Arg5799_4 = Arg5799[4], Arg5799_5 = Arg5799[5], Arg5799_6 = Arg5799[6], Arg5799_7 = Arg5799[7], Arg5799_8 = Arg5799[8], Arg5799_9 = Arg5799[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5799_3, Arg5799_8, (new Shenjs_freeze([Arg5799_3, Arg5799_4, Arg5799_5, Arg5799_6, Arg5799_7, Arg5799_8, Arg5799_9], function(Arg5801) {
  var Arg5801_0 = Arg5801[0], Arg5801_1 = Arg5801[1], Arg5801_2 = Arg5801[2], Arg5801_3 = Arg5801[3], Arg5801_4 = Arg5801[4], Arg5801_5 = Arg5801[5], Arg5801_6 = Arg5801[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5801_1, Arg5801_2, Arg5801_3, Arg5801_4, Arg5801_5, Arg5801_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R6, Arg5717_4]),
  R8)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R6]))
  ? ((R7 = shenjs_call(shen_newpv, [Arg5717_4])),
  (R8 = shenjs_call(shen_newpv, [Arg5717_4])),
  shenjs_call(shen_bindv, [R6, [shen_type_cons, R7, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, R8, []]]], Arg5717_4]),
  (R8 = ((R5 = R5[2]),
  (R9 = shenjs_call(shen_newpv, [Arg5717_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R8, R4, Arg5717_4, (new Shenjs_freeze([R4, R2, R7, R8, R9, R0, R1, R3, R5, Arg5717_3, Arg5717_4, Arg5717_5, R6, Arg5717_4], function(Arg5803) {
  var Arg5803_0 = Arg5803[0], Arg5803_1 = Arg5803[1], Arg5803_2 = Arg5803[2], Arg5803_3 = Arg5803[3], Arg5803_4 = Arg5803[4], Arg5803_5 = Arg5803[5], Arg5803_6 = Arg5803[6], Arg5803_7 = Arg5803[7], Arg5803_8 = Arg5803[8], Arg5803_9 = Arg5803[9], Arg5803_10 = Arg5803[10], Arg5803_11 = Arg5803[11], Arg5803_12 = Arg5803[12], Arg5803_13 = Arg5803[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5803_2, Arg5803_1, Arg5803_10, (new Shenjs_freeze([Arg5803_1, Arg5803_2, Arg5803_3, Arg5803_4, Arg5803_5, Arg5803_6, Arg5803_7, Arg5803_8, Arg5803_9, Arg5803_10, Arg5803_11], function(Arg5805) {
  var Arg5805_0 = Arg5805[0], Arg5805_1 = Arg5805[1], Arg5805_2 = Arg5805[2], Arg5805_3 = Arg5805[3], Arg5805_4 = Arg5805[4], Arg5805_5 = Arg5805[5], Arg5805_6 = Arg5805[6], Arg5805_7 = Arg5805[7], Arg5805_8 = Arg5805[8], Arg5805_9 = Arg5805[9], Arg5805_10 = Arg5805[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5805_1, Arg5805_3, Arg5805_9, (new Shenjs_freeze([Arg5805_1, Arg5805_2, Arg5805_3, Arg5805_4, Arg5805_5, Arg5805_6, Arg5805_7, Arg5805_8, Arg5805_9, Arg5805_10], function(Arg5807) {
  var Arg5807_0 = Arg5807[0], Arg5807_1 = Arg5807[1], Arg5807_2 = Arg5807[2], Arg5807_3 = Arg5807[3], Arg5807_4 = Arg5807[4], Arg5807_5 = Arg5807[5], Arg5807_6 = Arg5807[6], Arg5807_7 = Arg5807[7], Arg5807_8 = Arg5807[8], Arg5807_9 = Arg5807[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5807_3, Arg5807_8, (new Shenjs_freeze([Arg5807_0, Arg5807_1, Arg5807_2, Arg5807_3, Arg5807_4, Arg5807_5, Arg5807_6, Arg5807_7, Arg5807_8, Arg5807_9], function(Arg5809) {
  var Arg5809_0 = Arg5809[0], Arg5809_1 = Arg5809[1], Arg5809_2 = Arg5809[2], Arg5809_3 = Arg5809[3], Arg5809_4 = Arg5809[4], Arg5809_5 = Arg5809[5], Arg5809_6 = Arg5809[6], Arg5809_7 = Arg5809[7], Arg5809_8 = Arg5809[8], Arg5809_9 = Arg5809[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5809_0, Arg5809_1, Arg5809_2, Arg5809_8, (new Shenjs_freeze([Arg5809_0, Arg5809_1, Arg5809_2, Arg5809_3, Arg5809_4, Arg5809_5, Arg5809_6, Arg5809_7, Arg5809_8, Arg5809_9], function(Arg5811) {
  var Arg5811_0 = Arg5811[0], Arg5811_1 = Arg5811[1], Arg5811_2 = Arg5811[2], Arg5811_3 = Arg5811[3], Arg5811_4 = Arg5811[4], Arg5811_5 = Arg5811[5], Arg5811_6 = Arg5811[6], Arg5811_7 = Arg5811[7], Arg5811_8 = Arg5811[8], Arg5811_9 = Arg5811[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5811_3, Arg5811_8, (new Shenjs_freeze([Arg5811_3, Arg5811_4, Arg5811_5, Arg5811_6, Arg5811_7, Arg5811_8, Arg5811_9], function(Arg5813) {
  var Arg5813_0 = Arg5813[0], Arg5813_1 = Arg5813[1], Arg5813_2 = Arg5813[2], Arg5813_3 = Arg5813[3], Arg5813_4 = Arg5813[4], Arg5813_5 = Arg5813[5], Arg5813_6 = Arg5813[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5813_1, Arg5813_2, Arg5813_3, Arg5813_4, Arg5813_5, Arg5813_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R6, Arg5717_4]),
  R8)
  : false)))
  : ((shenjs_call(shen_pvar$question$, [R5]))
  ? ((R6 = shenjs_call(shen_newpv, [Arg5717_4])),
  (R7 = shenjs_call(shen_newpv, [Arg5717_4])),
  (R8 = shenjs_call(shen_newpv, [Arg5717_4])),
  shenjs_call(shen_bindv, [R5, [shen_type_cons, [shen_type_cons, R6, [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, R7, []]]], R8], Arg5717_4]),
  (R8 = ((R9 = shenjs_call(shen_newpv, [Arg5717_4])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_unify$excl$, [R7, R4, Arg5717_4, (new Shenjs_freeze([R4, R2, R6, R7, R9, R0, R1, R3, R8, Arg5717_3, Arg5717_4, Arg5717_5, R5, Arg5717_4], function(Arg5815) {
  var Arg5815_0 = Arg5815[0], Arg5815_1 = Arg5815[1], Arg5815_2 = Arg5815[2], Arg5815_3 = Arg5815[3], Arg5815_4 = Arg5815[4], Arg5815_5 = Arg5815[5], Arg5815_6 = Arg5815[6], Arg5815_7 = Arg5815[7], Arg5815_8 = Arg5815[8], Arg5815_9 = Arg5815[9], Arg5815_10 = Arg5815[10], Arg5815_11 = Arg5815[11], Arg5815_12 = Arg5815[12], Arg5815_13 = Arg5815[13];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_unify$excl$, [Arg5815_2, Arg5815_1, Arg5815_10, (new Shenjs_freeze([Arg5815_1, Arg5815_2, Arg5815_3, Arg5815_4, Arg5815_5, Arg5815_6, Arg5815_7, Arg5815_8, Arg5815_9, Arg5815_10, Arg5815_11], function(Arg5817) {
  var Arg5817_0 = Arg5817[0], Arg5817_1 = Arg5817[1], Arg5817_2 = Arg5817[2], Arg5817_3 = Arg5817[3], Arg5817_4 = Arg5817[4], Arg5817_5 = Arg5817[5], Arg5817_6 = Arg5817[6], Arg5817_7 = Arg5817[7], Arg5817_8 = Arg5817[8], Arg5817_9 = Arg5817[9], Arg5817_10 = Arg5817[10];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5817_1, Arg5817_3, Arg5817_9, (new Shenjs_freeze([Arg5817_1, Arg5817_2, Arg5817_3, Arg5817_4, Arg5817_5, Arg5817_6, Arg5817_7, Arg5817_8, Arg5817_9, Arg5817_10], function(Arg5819) {
  var Arg5819_0 = Arg5819[0], Arg5819_1 = Arg5819[1], Arg5819_2 = Arg5819[2], Arg5819_3 = Arg5819[3], Arg5819_4 = Arg5819[4], Arg5819_5 = Arg5819[5], Arg5819_6 = Arg5819[6], Arg5819_7 = Arg5819[7], Arg5819_8 = Arg5819[8], Arg5819_9 = Arg5819[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5819_3, Arg5819_8, (new Shenjs_freeze([Arg5819_0, Arg5819_1, Arg5819_2, Arg5819_3, Arg5819_4, Arg5819_5, Arg5819_6, Arg5819_7, Arg5819_8, Arg5819_9], function(Arg5821) {
  var Arg5821_0 = Arg5821[0], Arg5821_1 = Arg5821[1], Arg5821_2 = Arg5821[2], Arg5821_3 = Arg5821[3], Arg5821_4 = Arg5821[4], Arg5821_5 = Arg5821[5], Arg5821_6 = Arg5821[6], Arg5821_7 = Arg5821[7], Arg5821_8 = Arg5821[8], Arg5821_9 = Arg5821[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_th$asterisk$, [Arg5821_0, Arg5821_1, Arg5821_2, Arg5821_8, (new Shenjs_freeze([Arg5821_0, Arg5821_1, Arg5821_2, Arg5821_3, Arg5821_4, Arg5821_5, Arg5821_6, Arg5821_7, Arg5821_8, Arg5821_9], function(Arg5823) {
  var Arg5823_0 = Arg5823[0], Arg5823_1 = Arg5823[1], Arg5823_2 = Arg5823[2], Arg5823_3 = Arg5823[3], Arg5823_4 = Arg5823[4], Arg5823_5 = Arg5823[5], Arg5823_6 = Arg5823[6], Arg5823_7 = Arg5823[7], Arg5823_8 = Arg5823[8], Arg5823_9 = Arg5823[9];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_cut, [Arg5823_3, Arg5823_8, (new Shenjs_freeze([Arg5823_3, Arg5823_4, Arg5823_5, Arg5823_6, Arg5823_7, Arg5823_8, Arg5823_9], function(Arg5825) {
  var Arg5825_0 = Arg5825[0], Arg5825_1 = Arg5825[1], Arg5825_2 = Arg5825[2], Arg5825_3 = Arg5825[3], Arg5825_4 = Arg5825[4], Arg5825_5 = Arg5825[5], Arg5825_6 = Arg5825[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_patterns, [Arg5825_1, Arg5825_2, Arg5825_3, Arg5825_4, Arg5825_5, Arg5825_6]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]);});})}))]))),
  shenjs_call(shen_unbindv, [R5, Arg5717_4]),
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
  function shen_user_lambda5828(Arg5827) {
  if (Arg5827.length < 4) return [shen_type_func, shen_user_lambda5828, 4, Arg5827];
  var Arg5827_0 = Arg5827[0], Arg5827_1 = Arg5827[1], Arg5827_2 = Arg5827[2], Arg5827_3 = Arg5827[3];
  var R0, R1, R2, R3, R4;
  return ((R0 = shenjs_call(shen_catchpoint, [])),
  (function() {
  return shenjs_call_tail(shen_cutpoint, [R0, ((R0 = ((R1 = shenjs_call(shen_lazyderef, [Arg5827_0, Arg5827_2])),
  ((shenjs_is_type(R1, shen_type_cons))
  ? ((R2 = R1[1]),
  (R1 = R1[2]),
  (R3 = shenjs_call(shen_newpv, [Arg5827_2])),
  (R4 = shenjs_call(shen_newpv, [Arg5827_2])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_cut, [R0, Arg5827_2, (new Shenjs_freeze([R0, R2, R1, Arg5827_1, R3, R4, Arg5827_2, Arg5827_3, Arg5827_0, Arg5827_1, Arg5827_3, Arg5827_2], function(Arg5829) {
  var Arg5829_0 = Arg5829[0], Arg5829_1 = Arg5829[1], Arg5829_2 = Arg5829[2], Arg5829_3 = Arg5829[3], Arg5829_4 = Arg5829[4], Arg5829_5 = Arg5829[5], Arg5829_6 = Arg5829[6], Arg5829_7 = Arg5829[7], Arg5829_8 = Arg5829[8], Arg5829_9 = Arg5829[9], Arg5829_10 = Arg5829[10], Arg5829_11 = Arg5829[11];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5829_1, Arg5829_4, Arg5829_6, (new Shenjs_freeze([Arg5829_1, Arg5829_2, Arg5829_3, Arg5829_4, Arg5829_5, Arg5829_6, Arg5829_7], function(Arg5831) {
  var Arg5831_0 = Arg5831[0], Arg5831_1 = Arg5831[1], Arg5831_2 = Arg5831[2], Arg5831_3 = Arg5831[3], Arg5831_4 = Arg5831[4], Arg5831_5 = Arg5831[5], Arg5831_6 = Arg5831[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_t$asterisk$_assume, [Arg5831_1, Arg5831_4, Arg5831_5, (new Shenjs_freeze([Arg5831_1, Arg5831_2, Arg5831_3, Arg5831_4, Arg5831_5, Arg5831_6], function(Arg5833) {
  var Arg5833_0 = Arg5833[0], Arg5833_1 = Arg5833[1], Arg5833_2 = Arg5833[2], Arg5833_3 = Arg5833[3], Arg5833_4 = Arg5833[4], Arg5833_5 = Arg5833[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5833_1, shenjs_call(shen_append, [shenjs_call(shen_lazyderef, [Arg5833_2, Arg5833_4]), shenjs_call(shen_lazyderef, [Arg5833_3, Arg5833_4])]), Arg5833_4, Arg5833_5]);});})}))]);});})}))]);});})}))]))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = ((R0 = shenjs_call(shen_newpv, [Arg5827_2])),
  shenjs_call(shen_incinfs, []),
  shenjs_call(shen_fwhen, [shenjs_call(shen_placeholder$question$, [shenjs_call(shen_lazyderef, [Arg5827_0, Arg5827_2])]), Arg5827_2, (new Shenjs_freeze([Arg5827_1, Arg5827_0, R0, Arg5827_2, Arg5827_3, Arg5827_1, Arg5827_3, Arg5827_2], function(Arg5835) {
  var Arg5835_0 = Arg5835[0], Arg5835_1 = Arg5835[1], Arg5835_2 = Arg5835[2], Arg5835_3 = Arg5835[3], Arg5835_4 = Arg5835[4], Arg5835_5 = Arg5835[5], Arg5835_6 = Arg5835[6], Arg5835_7 = Arg5835[7];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5835_0, [shen_type_cons, [shen_type_cons, shenjs_call(shen_lazyderef, [Arg5835_1, Arg5835_3]), [shen_type_cons, [shen_type_symbol, ":"], [shen_type_cons, shenjs_call(shen_lazyderef, [Arg5835_2, Arg5835_3]), []]]], []], Arg5835_3, Arg5835_4]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5827_1, Arg5827_2])),
  ((shenjs_empty$question$(R0))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5827_3)))
  : ((shenjs_call(shen_pvar$question$, [R0]))
  ? (shenjs_call(shen_bindv, [R0, [], Arg5827_2]),
  (R1 = (shenjs_call(shen_incinfs, []),
  shenjs_unwind_tail(shenjs_thaw(Arg5827_3)))),
  shenjs_call(shen_unbindv, [R0, Arg5827_2]),
  R1)
  : false)))
  : R0))
  : R0))]);}))},
  4,
  [],
  "shen-t*-assume"];
shenjs_functions["shen_shen-t*-assume"] = shen_t$asterisk$_assume;






shen_conc = [shen_type_func,
  function shen_user_lambda5838(Arg5837) {
  if (Arg5837.length < 5) return [shen_type_func, shen_user_lambda5838, 5, Arg5837];
  var Arg5837_0 = Arg5837[0], Arg5837_1 = Arg5837[1], Arg5837_2 = Arg5837[2], Arg5837_3 = Arg5837[3], Arg5837_4 = Arg5837[4];
  var R0, R1, R2;
  return ((R0 = ((R0 = shenjs_call(shen_lazyderef, [Arg5837_0, Arg5837_3])),
  ((shenjs_empty$question$(R0))
  ? (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_bind, [Arg5837_2, shenjs_call(shen_lazyderef, [Arg5837_1, Arg5837_3]), Arg5837_3, Arg5837_4]))
  : false))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? ((R0 = shenjs_call(shen_lazyderef, [Arg5837_0, Arg5837_3])),
  ((shenjs_is_type(R0, shen_type_cons))
  ? ((R1 = R0[1]),
  (R0 = R0[2]),
  (R2 = shenjs_call(shen_newpv, [Arg5837_3])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [Arg5837_2, [shen_type_cons, shenjs_call(shen_lazyderef, [R1, Arg5837_3]), shenjs_call(shen_lazyderef, [R2, Arg5837_3])], Arg5837_3, (new Shenjs_freeze([Arg5837_2, R1, R0, Arg5837_1, R2, Arg5837_3, Arg5837_4], function(Arg5839) {
  var Arg5839_0 = Arg5839[0], Arg5839_1 = Arg5839[1], Arg5839_2 = Arg5839[2], Arg5839_3 = Arg5839[3], Arg5839_4 = Arg5839[4], Arg5839_5 = Arg5839[5], Arg5839_6 = Arg5839[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_conc, [Arg5839_2, Arg5839_3, Arg5839_4, Arg5839_5, Arg5839_6]);});})}))]);}))
  : false))
  : R0))},
  5,
  [],
  "shen-conc"];
shenjs_functions["shen_shen-conc"] = shen_conc;






shen_findallhelp = [shen_type_func,
  function shen_user_lambda5842(Arg5841) {
  if (Arg5841.length < 6) return [shen_type_func, shen_user_lambda5842, 6, Arg5841];
  var Arg5841_0 = Arg5841[0], Arg5841_1 = Arg5841[1], Arg5841_2 = Arg5841[2], Arg5841_3 = Arg5841[3], Arg5841_4 = Arg5841[4], Arg5841_5 = Arg5841[5];
  var R0;
  return ((R0 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_call, [Arg5841_1, Arg5841_4, (new Shenjs_freeze([Arg5841_1, Arg5841_0, Arg5841_2, Arg5841_3, Arg5841_4, Arg5841_5], function(Arg5843) {
  var Arg5843_0 = Arg5843[0], Arg5843_1 = Arg5843[1], Arg5843_2 = Arg5843[2], Arg5843_3 = Arg5843[3], Arg5843_4 = Arg5843[4], Arg5843_5 = Arg5843[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_remember, [Arg5843_3, Arg5843_1, Arg5843_4, (new Shenjs_freeze([Arg5843_3, Arg5843_1, Arg5843_4, Arg5843_5], function(Arg5845) {
  var Arg5845_0 = Arg5845[0], Arg5845_1 = Arg5845[1], Arg5845_2 = Arg5845[2], Arg5845_3 = Arg5845[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [false, Arg5845_2, Arg5845_3]);});})}))]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? (shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [Arg5841_2, (shenjs_globals["shen_" + shenjs_call(shen_lazyderef, [Arg5841_3, Arg5841_4])[1]]), Arg5841_4, Arg5841_5]);}))
  : R0))},
  6,
  [],
  "shen-findallhelp"];
shenjs_functions["shen_shen-findallhelp"] = shen_findallhelp;






shen_remember = [shen_type_func,
  function shen_user_lambda5848(Arg5847) {
  if (Arg5847.length < 4) return [shen_type_func, shen_user_lambda5848, 4, Arg5847];
  var Arg5847_0 = Arg5847[0], Arg5847_1 = Arg5847[1], Arg5847_2 = Arg5847[2], Arg5847_3 = Arg5847[3];
  var R0;
  return ((R0 = shenjs_call(shen_newpv, [Arg5847_2])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [R0, (shenjs_globals["shen_" + shenjs_call(shen_deref, [Arg5847_0, Arg5847_2])[1]] = [shen_type_cons, shenjs_call(shen_deref, [Arg5847_1, Arg5847_2]), (shenjs_globals["shen_" + shenjs_call(shen_deref, [Arg5847_0, Arg5847_2])[1]])]), Arg5847_2, Arg5847_3]);}))},
  4,
  [],
  "shen-remember"];
shenjs_functions["shen_shen-remember"] = shen_remember;






shen_findall = [shen_type_func,
  function shen_user_lambda5850(Arg5849) {
  if (Arg5849.length < 5) return [shen_type_func, shen_user_lambda5850, 5, Arg5849];
  var Arg5849_0 = Arg5849[0], Arg5849_1 = Arg5849[1], Arg5849_2 = Arg5849[2], Arg5849_3 = Arg5849[3], Arg5849_4 = Arg5849[4];
  var R0, R1;
  return ((R0 = shenjs_call(shen_newpv, [Arg5849_3])),
  (R1 = shenjs_call(shen_newpv, [Arg5849_3])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [R1, shenjs_call(shen_gensym, [[shen_type_symbol, "a"]]), Arg5849_3, (new Shenjs_freeze([R0, Arg5849_0, Arg5849_1, Arg5849_2, R1, Arg5849_3, Arg5849_4], function(Arg5851) {
  var Arg5851_0 = Arg5851[0], Arg5851_1 = Arg5851[1], Arg5851_2 = Arg5851[2], Arg5851_3 = Arg5851[3], Arg5851_4 = Arg5851[4], Arg5851_5 = Arg5851[5], Arg5851_6 = Arg5851[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_bind, [Arg5851_0, (shenjs_globals["shen_" + shenjs_call(shen_lazyderef, [Arg5851_4, Arg5851_5])[1]] = []), Arg5851_5, (new Shenjs_freeze([Arg5851_0, Arg5851_1, Arg5851_2, Arg5851_3, Arg5851_4, Arg5851_5, Arg5851_6], function(Arg5853) {
  var Arg5853_0 = Arg5853[0], Arg5853_1 = Arg5853[1], Arg5853_2 = Arg5853[2], Arg5853_3 = Arg5853[3], Arg5853_4 = Arg5853[4], Arg5853_5 = Arg5853[5], Arg5853_6 = Arg5853[6];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_findallhelp, [Arg5853_1, Arg5853_2, Arg5853_3, Arg5853_4, Arg5853_5, Arg5853_6]);});})}))]);});})}))]);}))},
  5,
  [],
  "findall"];
shenjs_functions["shen_findall"] = shen_findall;






shen_findallhelp = [shen_type_func,
  function shen_user_lambda5856(Arg5855) {
  if (Arg5855.length < 6) return [shen_type_func, shen_user_lambda5856, 6, Arg5855];
  var Arg5855_0 = Arg5855[0], Arg5855_1 = Arg5855[1], Arg5855_2 = Arg5855[2], Arg5855_3 = Arg5855[3], Arg5855_4 = Arg5855[4], Arg5855_5 = Arg5855[5];
  var R0;
  return ((R0 = (shenjs_call(shen_incinfs, []),
  shenjs_call(shen_call, [Arg5855_1, Arg5855_4, (new Shenjs_freeze([Arg5855_1, Arg5855_0, Arg5855_2, Arg5855_3, Arg5855_4, Arg5855_5], function(Arg5857) {
  var Arg5857_0 = Arg5857[0], Arg5857_1 = Arg5857[1], Arg5857_2 = Arg5857[2], Arg5857_3 = Arg5857[3], Arg5857_4 = Arg5857[4], Arg5857_5 = Arg5857[5];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_remember, [Arg5857_3, Arg5857_1, Arg5857_4, (new Shenjs_freeze([Arg5857_3, Arg5857_1, Arg5857_4, Arg5857_5], function(Arg5859) {
  var Arg5859_0 = Arg5859[0], Arg5859_1 = Arg5859[1], Arg5859_2 = Arg5859[2], Arg5859_3 = Arg5859[3];
  return (function() {
  return (function() {
  return shenjs_call_tail(shen_fwhen, [false, Arg5859_2, Arg5859_3]);});})}))]);});})}))]))),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? (shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [Arg5855_2, (shenjs_globals["shen_" + shenjs_call(shen_lazyderef, [Arg5855_3, Arg5855_4])[1]]), Arg5855_4, Arg5855_5]);}))
  : R0))},
  6,
  [],
  "shen-findallhelp"];
shenjs_functions["shen_shen-findallhelp"] = shen_findallhelp;






shen_remember = [shen_type_func,
  function shen_user_lambda5862(Arg5861) {
  if (Arg5861.length < 4) return [shen_type_func, shen_user_lambda5862, 4, Arg5861];
  var Arg5861_0 = Arg5861[0], Arg5861_1 = Arg5861[1], Arg5861_2 = Arg5861[2], Arg5861_3 = Arg5861[3];
  var R0;
  return ((R0 = shenjs_call(shen_newpv, [Arg5861_2])),
  shenjs_call(shen_incinfs, []),
  (function() {
  return shenjs_call_tail(shen_bind, [R0, (shenjs_globals["shen_" + shenjs_call(shen_deref, [Arg5861_0, Arg5861_2])[1]] = [shen_type_cons, shenjs_call(shen_deref, [Arg5861_1, Arg5861_2]), (shenjs_globals["shen_" + shenjs_call(shen_deref, [Arg5861_0, Arg5861_2])[1]])]), Arg5861_2, Arg5861_3]);}))},
  4,
  [],
  "shen-remember"];
shenjs_functions["shen_shen-remember"] = shen_remember;












shen_shen = [shen_type_func,
  function shen_user_lambda5289(Arg5288) {
  if (Arg5288.length < 0) return [shen_type_func, shen_user_lambda5289, 0, Arg5288];
  return (shenjs_call(shen_credits, []),
  (function() {
  return shenjs_call_tail(shen_loop, []);}))},
  0,
  [],
  "shen-shen"];
shenjs_functions["shen_shen-shen"] = shen_shen;






shen_loop = [shen_type_func,
  function shen_user_lambda5291(Arg5290) {
  if (Arg5290.length < 0) return [shen_type_func, shen_user_lambda5291, 0, Arg5290];
  return (shenjs_call(shen_initialise$_environment, []),
  shenjs_call(shen_prompt, []),
  shenjs_trap_error(function() {return shenjs_call(shen_read_evaluate_print, []);}, [shen_type_func,
  function shen_user_lambda5293(Arg5292) {
  if (Arg5292.length < 1) return [shen_type_func, shen_user_lambda5293, 1, Arg5292];
  var Arg5292_0 = Arg5292[0];
  return (function() {
  return shenjs_pr(shenjs_error_to_string(Arg5292_0), (shenjs_globals["shen_*stinput*"]));})},
  1,
  []]),
  (function() {
  return shenjs_call_tail(shen_loop, []);}))},
  0,
  [],
  "shen-loop"];
shenjs_functions["shen_shen-loop"] = shen_loop;






shen_version = [shen_type_func,
  function shen_user_lambda5295(Arg5294) {
  if (Arg5294.length < 1) return [shen_type_func, shen_user_lambda5295, 1, Arg5294];
  var Arg5294_0 = Arg5294[0];
  return (shenjs_globals["shen_*version*"] = Arg5294_0)},
  1,
  [],
  "version"];
shenjs_functions["shen_version"] = shen_version;






shenjs_call(shen_version, ["version 6.1"]);





shen_credits = [shen_type_func,
  function shen_user_lambda5298(Arg5297) {
  if (Arg5297.length < 0) return [shen_type_func, shen_user_lambda5298, 0, Arg5297];
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
  function shen_user_lambda5300(Arg5299) {
  if (Arg5299.length < 0) return [shen_type_func, shen_user_lambda5300, 0, Arg5299];
  return (function() {
  return shenjs_call_tail(shen_multiple_set, [[shen_type_cons, [shen_type_symbol, "shen-*call*"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "shen-*infs*"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "shen-*process-counter*"], [shen_type_cons, 0, [shen_type_cons, [shen_type_symbol, "shen-*catch*"], [shen_type_cons, 0, []]]]]]]]]]);})},
  0,
  [],
  "shen-initialise_environment"];
shenjs_functions["shen_shen-initialise_environment"] = shen_initialise$_environment;






shen_multiple_set = [shen_type_func,
  function shen_user_lambda5302(Arg5301) {
  if (Arg5301.length < 1) return [shen_type_func, shen_user_lambda5302, 1, Arg5301];
  var Arg5301_0 = Arg5301[0];
  return ((shenjs_empty$question$(Arg5301_0))
  ? []
  : (((shenjs_is_type(Arg5301_0, shen_type_cons) && shenjs_is_type(Arg5301_0[2], shen_type_cons)))
  ? ((shenjs_globals["shen_" + Arg5301_0[1][1]] = Arg5301_0[2][1]),
  (function() {
  return shenjs_call_tail(shen_multiple_set, [Arg5301_0[2][2]]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-multiple-set"]]);})))},
  1,
  [],
  "shen-multiple-set"];
shenjs_functions["shen_shen-multiple-set"] = shen_multiple_set;






shen_destroy = [shen_type_func,
  function shen_user_lambda5304(Arg5303) {
  if (Arg5303.length < 1) return [shen_type_func, shen_user_lambda5304, 1, Arg5303];
  var Arg5303_0 = Arg5303[0];
  return (function() {
  return shenjs_call_tail(shen_declare, [Arg5303_0, []]);})},
  1,
  [],
  "destroy"];
shenjs_functions["shen_destroy"] = shen_destroy;






(shenjs_globals["shen_shen-*history*"] = []);






shen_read_evaluate_print = [shen_type_func,
  function shen_user_lambda5307(Arg5306) {
  if (Arg5306.length < 0) return [shen_type_func, shen_user_lambda5307, 0, Arg5306];
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
  function shen_user_lambda5309(Arg5308) {
  if (Arg5308.length < 2) return [shen_type_func, shen_user_lambda5309, 2, Arg5308];
  var Arg5308_0 = Arg5308[0], Arg5308_1 = Arg5308[1];
  var R0;
  return (((shenjs_is_type(Arg5308_0, shen_tuple) && (shenjs_is_type(shenjs_call(shen_snd, [Arg5308_0]), shen_type_cons) && (shenjs_is_type(shenjs_call(shen_snd, [Arg5308_0])[2], shen_type_cons) && (shenjs_empty$question$(shenjs_call(shen_snd, [Arg5308_0])[2][2]) && (shenjs_is_type(Arg5308_1, shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg5308_0])[1], shenjs_call(shen_exclamation, []))) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg5308_0])[2][1], shenjs_call(shen_exclamation, []))))))))))
  ? (shenjs_call(shen_prbytes, [shenjs_call(shen_snd, [Arg5308_1[1]])]),
  Arg5308_1[1])
  : (((shenjs_is_type(Arg5308_0, shen_tuple) && (shenjs_is_type(shenjs_call(shen_snd, [Arg5308_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg5308_0])[1], shenjs_call(shen_exclamation, []))))))
  ? ((R0 = shenjs_call(shen_make_key, [shenjs_call(shen_snd, [Arg5308_0])[2], Arg5308_1])),
  (R0 = shenjs_call(shen_head, [shenjs_call(shen_find_past_inputs, [R0, Arg5308_1])])),
  shenjs_call(shen_prbytes, [shenjs_call(shen_snd, [R0])]),
  R0)
  : (((shenjs_is_type(Arg5308_0, shen_tuple) && (shenjs_is_type(shenjs_call(shen_snd, [Arg5308_0]), shen_type_cons) && (shenjs_empty$question$(shenjs_call(shen_snd, [Arg5308_0])[2]) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg5308_0])[1], shenjs_call(shen_percent, [])))))))
  ? (shenjs_call(shen_print_past_inputs, [[shen_type_func,
  function shen_user_lambda5311(Arg5310) {
  if (Arg5310.length < 1) return [shen_type_func, shen_user_lambda5311, 1, Arg5310];
  var Arg5310_0 = Arg5310[0];
  return true},
  1,
  []], shenjs_call(shen_reverse, [Arg5308_1]), 0]),
  (function() {
  return shenjs_call_tail(shen_abort, []);}))
  : (((shenjs_is_type(Arg5308_0, shen_tuple) && (shenjs_is_type(shenjs_call(shen_snd, [Arg5308_0]), shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(shenjs_call(shen_snd, [Arg5308_0])[1], shenjs_call(shen_percent, []))))))
  ? ((R0 = shenjs_call(shen_make_key, [shenjs_call(shen_snd, [Arg5308_0])[2], Arg5308_1])),
  shenjs_call(shen_print_past_inputs, [R0, shenjs_call(shen_reverse, [Arg5308_1]), 0]),
  (function() {
  return shenjs_call_tail(shen_abort, []);}))
  : Arg5308_0))))},
  2,
  [],
  "shen-retrieve-from-history-if-needed"];
shenjs_functions["shen_shen-retrieve-from-history-if-needed"] = shen_retrieve_from_history_if_needed;






shen_percent = [shen_type_func,
  function shen_user_lambda5313(Arg5312) {
  if (Arg5312.length < 0) return [shen_type_func, shen_user_lambda5313, 0, Arg5312];
  return 37},
  0,
  [],
  "shen-percent"];
shenjs_functions["shen_shen-percent"] = shen_percent;






shen_exclamation = [shen_type_func,
  function shen_user_lambda5315(Arg5314) {
  if (Arg5314.length < 0) return [shen_type_func, shen_user_lambda5315, 0, Arg5314];
  return 33},
  0,
  [],
  "shen-exclamation"];
shenjs_functions["shen_shen-exclamation"] = shen_exclamation;






shen_prbytes = [shen_type_func,
  function shen_user_lambda5317(Arg5316) {
  if (Arg5316.length < 1) return [shen_type_func, shen_user_lambda5317, 1, Arg5316];
  var Arg5316_0 = Arg5316[0];
  return (shenjs_call(shen_map, [[shen_type_func,
  function shen_user_lambda5319(Arg5318) {
  if (Arg5318.length < 1) return [shen_type_func, shen_user_lambda5319, 1, Arg5318];
  var Arg5318_0 = Arg5318[0];
  return (function() {
  return shenjs_pr(shenjs_n_$gt$string(Arg5318_0), shenjs_call(shen_stinput, [0]));})},
  1,
  []], Arg5316_0]),
  (function() {
  return shenjs_call_tail(shen_nl, [1]);}))},
  1,
  [],
  "shen-prbytes"];
shenjs_functions["shen_shen-prbytes"] = shen_prbytes;






shen_update$_history = [shen_type_func,
  function shen_user_lambda5321(Arg5320) {
  if (Arg5320.length < 2) return [shen_type_func, shen_user_lambda5321, 2, Arg5320];
  var Arg5320_0 = Arg5320[0], Arg5320_1 = Arg5320[1];
  return (shenjs_globals["shen_shen-*history*"] = [shen_type_cons, Arg5320_0, Arg5320_1])},
  2,
  [],
  "shen-update_history"];
shenjs_functions["shen_shen-update_history"] = shen_update$_history;






shen_toplineread = [shen_type_func,
  function shen_user_lambda5323(Arg5322) {
  if (Arg5322.length < 0) return [shen_type_func, shen_user_lambda5323, 0, Arg5322];
  return (function() {
  return shenjs_call_tail(shen_toplineread$_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), []]);})},
  0,
  [],
  "shen-toplineread"];
shenjs_functions["shen_shen-toplineread"] = shen_toplineread;






shen_toplineread$_loop = [shen_type_func,
  function shen_user_lambda5325(Arg5324) {
  if (Arg5324.length < 2) return [shen_type_func, shen_user_lambda5325, 2, Arg5324];
  var Arg5324_0 = Arg5324[0], Arg5324_1 = Arg5324[1];
  var R0;
  return ((shenjs_unwind_tail(shenjs_$eq$(Arg5324_0, shenjs_call(shen_hat, []))))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["line read aborted", []]);})
  : ((shenjs_call(shen_element$question$, [Arg5324_0, [shen_type_cons, shenjs_call(shen_newline, []), [shen_type_cons, shenjs_call(shen_carriage_return, []), []]]]))
  ? ((R0 = shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda5327(Arg5326) {
  if (Arg5326.length < 1) return [shen_type_func, shen_user_lambda5327, 1, Arg5326];
  var Arg5326_0 = Arg5326[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$st$_input$gt$, [Arg5326_0]);})},
  1,
  []], Arg5324_1, []])),
  (((shenjs_unwind_tail(shenjs_$eq$(R0, shen_fail_obj)) || shenjs_empty$question$(R0)))
  ? (function() {
  return shenjs_call_tail(shen_toplineread$_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), shenjs_call(shen_append, [Arg5324_1, [shen_type_cons, Arg5324_0, []]])]);})
  : [shen_tuple, R0, Arg5324_1]))
  : (function() {
  return shenjs_call_tail(shen_toplineread$_loop, [shenjs_read_byte(shenjs_call(shen_stinput, [0])), shenjs_call(shen_append, [Arg5324_1, [shen_type_cons, Arg5324_0, []]])]);})))},
  2,
  [],
  "shen-toplineread_loop"];
shenjs_functions["shen_shen-toplineread_loop"] = shen_toplineread$_loop;






shen_hat = [shen_type_func,
  function shen_user_lambda5329(Arg5328) {
  if (Arg5328.length < 0) return [shen_type_func, shen_user_lambda5329, 0, Arg5328];
  return 94},
  0,
  [],
  "shen-hat"];
shenjs_functions["shen_shen-hat"] = shen_hat;






shen_newline = [shen_type_func,
  function shen_user_lambda5331(Arg5330) {
  if (Arg5330.length < 0) return [shen_type_func, shen_user_lambda5331, 0, Arg5330];
  return 10},
  0,
  [],
  "shen-newline"];
shenjs_functions["shen_shen-newline"] = shen_newline;






shen_carriage_return = [shen_type_func,
  function shen_user_lambda5333(Arg5332) {
  if (Arg5332.length < 0) return [shen_type_func, shen_user_lambda5333, 0, Arg5332];
  return 13},
  0,
  [],
  "shen-carriage-return"];
shenjs_functions["shen_shen-carriage-return"] = shen_carriage_return;






shen_tc = [shen_type_func,
  function shen_user_lambda5335(Arg5334) {
  if (Arg5334.length < 1) return [shen_type_func, shen_user_lambda5335, 1, Arg5334];
  var Arg5334_0 = Arg5334[0];
  return ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "+"], Arg5334_0)))
  ? (shenjs_globals["shen_shen-*tc*"] = true)
  : ((shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, "-"], Arg5334_0)))
  ? (shenjs_globals["shen_shen-*tc*"] = false)
  : (function() {
  return shenjs_call_tail(shen_interror, ["tc expects a + or -", []]);})))},
  1,
  [],
  "tc"];
shenjs_functions["shen_tc"] = shen_tc;






shen_prompt = [shen_type_func,
  function shen_user_lambda5337(Arg5336) {
  if (Arg5336.length < 0) return [shen_type_func, shen_user_lambda5337, 0, Arg5336];
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
  function shen_user_lambda5339(Arg5338) {
  if (Arg5338.length < 1) return [shen_type_func, shen_user_lambda5339, 1, Arg5338];
  var Arg5338_0 = Arg5338[0];
  return (function() {
  return shenjs_call_tail(shen_toplevel$_evaluate, [Arg5338_0, (shenjs_globals["shen_shen-*tc*"])]);})},
  1,
  [],
  "shen-toplevel"];
shenjs_functions["shen_shen-toplevel"] = shen_toplevel;






shen_find_past_inputs = [shen_type_func,
  function shen_user_lambda5341(Arg5340) {
  if (Arg5340.length < 2) return [shen_type_func, shen_user_lambda5341, 2, Arg5340];
  var Arg5340_0 = Arg5340[0], Arg5340_1 = Arg5340[1];
  var R0;
  return ((R0 = shenjs_call(shen_find, [Arg5340_0, Arg5340_1])),
  ((shenjs_empty$question$(R0))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["input not found~%", []]);})
  : R0))},
  2,
  [],
  "shen-find-past-inputs"];
shenjs_functions["shen_shen-find-past-inputs"] = shen_find_past_inputs;






shen_make_key = [shen_type_func,
  function shen_user_lambda5343(Arg5342) {
  if (Arg5342.length < 2) return [shen_type_func, shen_user_lambda5343, 2, Arg5342];
  var Arg5342_0 = Arg5342[0], Arg5342_1 = Arg5342[1];
  var R0;
  return ((R0 = shenjs_call(shen_compile, [[shen_type_func,
  function shen_user_lambda5345(Arg5344) {
  if (Arg5344.length < 1) return [shen_type_func, shen_user_lambda5345, 1, Arg5344];
  var Arg5344_0 = Arg5344[0];
  return (function() {
  return shenjs_call_tail(shen_$lt$st$_input$gt$, [Arg5344_0]);})},
  1,
  []], Arg5342_0, []])[1]),
  ((shenjs_call(shen_integer$question$, [R0]))
  ? [shen_type_func,
  function shen_user_lambda5347(Arg5346) {
  if (Arg5346.length < 3) return [shen_type_func, shen_user_lambda5347, 3, Arg5346];
  var Arg5346_0 = Arg5346[0], Arg5346_1 = Arg5346[1], Arg5346_2 = Arg5346[2];
  return shenjs_$eq$(Arg5346_2, shenjs_call(shen_nth, [(Arg5346_0 + 1), shenjs_call(shen_reverse, [Arg5346_1])]))},
  3,
  [R0, Arg5342_1]]
  : [shen_type_func,
  function shen_user_lambda5349(Arg5348) {
  if (Arg5348.length < 2) return [shen_type_func, shen_user_lambda5349, 2, Arg5348];
  var Arg5348_0 = Arg5348[0], Arg5348_1 = Arg5348[1];
  return (function() {
  return shenjs_call_tail(shen_prefix$question$, [Arg5348_0, shenjs_call(shen_trim_gubbins, [shenjs_call(shen_snd, [Arg5348_1])])]);})},
  2,
  [Arg5342_0]]))},
  2,
  [],
  "shen-make-key"];
shenjs_functions["shen_shen-make-key"] = shen_make_key;






shen_trim_gubbins = [shen_type_func,
  function shen_user_lambda5351(Arg5350) {
  if (Arg5350.length < 1) return [shen_type_func, shen_user_lambda5351, 1, Arg5350];
  var Arg5350_0 = Arg5350[0];
  return (((shenjs_is_type(Arg5350_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5350_0[1], shenjs_call(shen_space, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg5350_0[2]]);})
  : (((shenjs_is_type(Arg5350_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5350_0[1], shenjs_call(shen_newline, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg5350_0[2]]);})
  : (((shenjs_is_type(Arg5350_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5350_0[1], shenjs_call(shen_carriage_return, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg5350_0[2]]);})
  : (((shenjs_is_type(Arg5350_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5350_0[1], shenjs_call(shen_tab, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg5350_0[2]]);})
  : (((shenjs_is_type(Arg5350_0, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5350_0[1], shenjs_call(shen_left_round, [])))))
  ? (function() {
  return shenjs_call_tail(shen_trim_gubbins, [Arg5350_0[2]]);})
  : Arg5350_0)))))},
  1,
  [],
  "shen-trim-gubbins"];
shenjs_functions["shen_shen-trim-gubbins"] = shen_trim_gubbins;






shen_space = [shen_type_func,
  function shen_user_lambda5353(Arg5352) {
  if (Arg5352.length < 0) return [shen_type_func, shen_user_lambda5353, 0, Arg5352];
  return 32},
  0,
  [],
  "shen-space"];
shenjs_functions["shen_shen-space"] = shen_space;






shen_tab = [shen_type_func,
  function shen_user_lambda5355(Arg5354) {
  if (Arg5354.length < 0) return [shen_type_func, shen_user_lambda5355, 0, Arg5354];
  return 9},
  0,
  [],
  "shen-tab"];
shenjs_functions["shen_shen-tab"] = shen_tab;






shen_left_round = [shen_type_func,
  function shen_user_lambda5357(Arg5356) {
  if (Arg5356.length < 0) return [shen_type_func, shen_user_lambda5357, 0, Arg5356];
  return 40},
  0,
  [],
  "shen-left-round"];
shenjs_functions["shen_shen-left-round"] = shen_left_round;






shen_find = [shen_type_func,
  function shen_user_lambda5359(Arg5358) {
  if (Arg5358.length < 2) return [shen_type_func, shen_user_lambda5359, 2, Arg5358];
  var Arg5358_0 = Arg5358[0], Arg5358_1 = Arg5358[1];
  return ((shenjs_empty$question$(Arg5358_1))
  ? []
  : (((shenjs_is_type(Arg5358_1, shen_type_cons) && shenjs_call(Arg5358_0, [Arg5358_1[1]])))
  ? [shen_type_cons, Arg5358_1[1], shenjs_call(shen_find, [Arg5358_0, Arg5358_1[2]])]
  : ((shenjs_is_type(Arg5358_1, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_find, [Arg5358_0, Arg5358_1[2]]);})
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-find"]]);}))))},
  2,
  [],
  "shen-find"];
shenjs_functions["shen_shen-find"] = shen_find;






shen_prefix$question$ = [shen_type_func,
  function shen_user_lambda5361(Arg5360) {
  if (Arg5360.length < 2) return [shen_type_func, shen_user_lambda5361, 2, Arg5360];
  var Arg5360_0 = Arg5360[0], Arg5360_1 = Arg5360[1];
  return ((shenjs_empty$question$(Arg5360_0))
  ? true
  : (((shenjs_is_type(Arg5360_0, shen_type_cons) && (shenjs_is_type(Arg5360_1, shen_type_cons) && shenjs_unwind_tail(shenjs_$eq$(Arg5360_1[1], Arg5360_0[1])))))
  ? (function() {
  return shenjs_call_tail(shen_prefix$question$, [Arg5360_0[2], Arg5360_1[2]]);})
  : false))},
  2,
  [],
  "shen-prefix?"];
shenjs_functions["shen_shen-prefix?"] = shen_prefix$question$;






shen_print_past_inputs = [shen_type_func,
  function shen_user_lambda5363(Arg5362) {
  if (Arg5362.length < 3) return [shen_type_func, shen_user_lambda5363, 3, Arg5362];
  var Arg5362_0 = Arg5362[0], Arg5362_1 = Arg5362[1], Arg5362_2 = Arg5362[2];
  return ((shenjs_empty$question$(Arg5362_1))
  ? [shen_type_symbol, "_"]
  : (((shenjs_is_type(Arg5362_1, shen_type_cons) && (!shenjs_call(Arg5362_0, [Arg5362_1[1]]))))
  ? (function() {
  return shenjs_call_tail(shen_print_past_inputs, [Arg5362_0, Arg5362_1[2], (Arg5362_2 + 1)]);})
  : (((shenjs_is_type(Arg5362_1, shen_type_cons) && shenjs_is_type(Arg5362_1[1], shen_tuple)))
  ? (shenjs_call(shen_intoutput, ["~A. ", [shen_tuple, Arg5362_2, []]]),
  shenjs_call(shen_prbytes, [shenjs_call(shen_snd, [Arg5362_1[1]])]),
  (function() {
  return shenjs_call_tail(shen_print_past_inputs, [Arg5362_0, Arg5362_1[2], (Arg5362_2 + 1)]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-print-past-inputs"]]);}))))},
  3,
  [],
  "shen-print-past-inputs"];
shenjs_functions["shen_shen-print-past-inputs"] = shen_print_past_inputs;






shen_toplevel$_evaluate = [shen_type_func,
  function shen_user_lambda5365(Arg5364) {
  if (Arg5364.length < 2) return [shen_type_func, shen_user_lambda5365, 2, Arg5364];
  var Arg5364_0 = Arg5364[0], Arg5364_1 = Arg5364[1];
  var R0;
  return (((shenjs_is_type(Arg5364_0, shen_type_cons) && (shenjs_is_type(Arg5364_0[2], shen_type_cons) && (shenjs_unwind_tail(shenjs_$eq$([shen_type_symbol, ":"], Arg5364_0[2][1])) && (shenjs_is_type(Arg5364_0[2][2], shen_type_cons) && (shenjs_empty$question$(Arg5364_0[2][2][2]) && shenjs_unwind_tail(shenjs_$eq$(true, Arg5364_1))))))))
  ? (function() {
  return shenjs_call_tail(shen_typecheck_and_evaluate, [Arg5364_0[1], Arg5364_0[2][2][1]]);})
  : (((shenjs_is_type(Arg5364_0, shen_type_cons) && shenjs_is_type(Arg5364_0[2], shen_type_cons)))
  ? (shenjs_call(shen_toplevel$_evaluate, [[shen_type_cons, Arg5364_0[1], []], Arg5364_1]),
  shenjs_call(shen_nl, [1]),
  (function() {
  return shenjs_call_tail(shen_toplevel$_evaluate, [Arg5364_0[2], Arg5364_1]);}))
  : (((shenjs_is_type(Arg5364_0, shen_type_cons) && (shenjs_empty$question$(Arg5364_0[2]) && shenjs_unwind_tail(shenjs_$eq$(true, Arg5364_1)))))
  ? (function() {
  return shenjs_call_tail(shen_typecheck_and_evaluate, [Arg5364_0[1], shenjs_call(shen_gensym, [[shen_type_symbol, "A"]])]);})
  : (((shenjs_is_type(Arg5364_0, shen_type_cons) && (shenjs_empty$question$(Arg5364_0[2]) && shenjs_unwind_tail(shenjs_$eq$(false, Arg5364_1)))))
  ? ((R0 = shenjs_call(shen_eval_without_macros, [Arg5364_0[1]])),
  (function() {
  return shenjs_call_tail(shen_print, [R0]);}))
  : (function() {
  return shenjs_call_tail(shen_sys_error, [[shen_type_symbol, "shen-toplevel_evaluate"]]);})))))},
  2,
  [],
  "shen-toplevel_evaluate"];
shenjs_functions["shen_shen-toplevel_evaluate"] = shen_toplevel$_evaluate;






shen_typecheck_and_evaluate = [shen_type_func,
  function shen_user_lambda5367(Arg5366) {
  if (Arg5366.length < 2) return [shen_type_func, shen_user_lambda5367, 2, Arg5366];
  var Arg5366_0 = Arg5366[0], Arg5366_1 = Arg5366[1];
  var R0, R1;
  return ((R0 = shenjs_call(shen_typecheck, [Arg5366_0, Arg5366_1])),
  ((shenjs_unwind_tail(shenjs_$eq$(R0, false)))
  ? (function() {
  return shenjs_call_tail(shen_interror, ["type error~%", []]);})
  : ((R1 = shenjs_call(shen_eval_without_macros, [Arg5366_0])),
  (R0 = shenjs_call(shen_pretty_type, [R0])),
  (function() {
  return shenjs_call_tail(shen_intoutput, ["~S : ~R", [shen_tuple, R1, [shen_tuple, R0, []]]]);}))))},
  2,
  [],
  "shen-typecheck-and-evaluate"];
shenjs_functions["shen_shen-typecheck-and-evaluate"] = shen_typecheck_and_evaluate;






shen_pretty_type = [shen_type_func,
  function shen_user_lambda5369(Arg5368) {
  if (Arg5368.length < 1) return [shen_type_func, shen_user_lambda5369, 1, Arg5368];
  var Arg5368_0 = Arg5368[0];
  return (function() {
  return shenjs_call_tail(shen_mult$_subst, [(shenjs_globals["shen_shen-*alphabet*"]), shenjs_call(shen_extract_pvars, [Arg5368_0]), Arg5368_0]);})},
  1,
  [],
  "shen-pretty-type"];
shenjs_functions["shen_shen-pretty-type"] = shen_pretty_type;






shen_extract_pvars = [shen_type_func,
  function shen_user_lambda5371(Arg5370) {
  if (Arg5370.length < 1) return [shen_type_func, shen_user_lambda5371, 1, Arg5370];
  var Arg5370_0 = Arg5370[0];
  return ((shenjs_call(shen_pvar$question$, [Arg5370_0]))
  ? [shen_type_cons, Arg5370_0, []]
  : ((shenjs_is_type(Arg5370_0, shen_type_cons))
  ? (function() {
  return shenjs_call_tail(shen_union, [shenjs_call(shen_extract_pvars, [Arg5370_0[1]]), shenjs_call(shen_extract_pvars, [Arg5370_0[2]])]);})
  : []))},
  1,
  [],
  "shen-extract-pvars"];
shenjs_functions["shen_shen-extract-pvars"] = shen_extract_pvars;






shen_mult$_subst = [shen_type_func,
  function shen_user_lambda5373(Arg5372) {
  if (Arg5372.length < 3) return [shen_type_func, shen_user_lambda5373, 3, Arg5372];
  var Arg5372_0 = Arg5372[0], Arg5372_1 = Arg5372[1], Arg5372_2 = Arg5372[2];
  return ((shenjs_empty$question$(Arg5372_0))
  ? Arg5372_2
  : ((shenjs_empty$question$(Arg5372_1))
  ? Arg5372_2
  : (((shenjs_is_type(Arg5372_0, shen_type_cons) && shenjs_is_type(Arg5372_1, shen_type_cons)))
  ? (function() {
  return shenjs_call_tail(shen_mult$_subst, [Arg5372_0[2], Arg5372_1[2], shenjs_call(shen_subst, [Arg5372_0[1], Arg5372_1[1], Arg5372_2])]);})
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
