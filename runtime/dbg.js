shenjs_dbg_log = false
dbg_trace_functions = []
dbg_trace_level = 0

function dbg_list(x) {
	var ret = []
	for (var i = x.length - 1; i >= 0; --i)
		ret = [shen_type_cons, x[i], ret]
	return ret
}

function dbg_output(s) {
	if (!shenjs_dbg_log)
		return
	var arg = []
	for (var i = arguments.length - 1; i > 0; --i)
		arg = [shen_tuple, arguments[i], arg]
	shenjs_call(shen_intoutput, [s, arg])
}

function dbg_princ(s, x) {
	if (x == shen_fail_obj)
		x = "fail!"
	if (!shenjs_dbg_log)
		return x
	dbg_output("~A~A~%", s, x)
	return x
}

function dbg_track(fn, traceret) {
	traceret = (traceret === undefined) ? true : traceret;
  if (dbg_trace_functions["t" + fn] !== undefined)
    return
  var f = shenjs_functions["shen_" + fn]
  if (f === undefined) {
    dbg_output("~%ERR: cannot trace ~A~%~%", fn)
    return
  }
  f_orig = f[1]
  f_nargs = f[2]
  dbg_trace_functions["t" + fn] = f_orig
  f[1] = function(Args) {
    if (Args.length < f_nargs) return f;
    var dbg_s = "";
    for (var i = 0; i < dbg_trace_level; ++i)
      dbg_s += "--";
    dbg_output("~%~A (~A ~A)~%~%", dbg_s, fn, Args);
    ++dbg_trace_level
    var ret = f_orig(Args)
    if (traceret) {
      ret = shenjs_unwind_tail(ret)
      dbg_output("~A ==> ~A~%", dbg_s, ret)
    }
    --dbg_trace_level
    return ret
  };
}

function _s (s) {
	return shen_intern_js([s])
}

function shen_print(args) {
	if (args.length < 1) return [shen_print, 1, args];
	print(args[0])
}

function dbg_timed(name, fn) {
	var t = (new Date()).getTime()
	var ret = fn()
	var t = ((new Date()).getTime() - t) / 1000.0
	puts_js("\n## run time of " + name + ": " + t + "s\n\n")
	return ret
}

js_print = shenjs_mkfunction("js-print", 1, function self(Args) {
	if (Args.length < 1) return [shen_type_func, self, 1, Args]
	print(Args[0])
	return []
})
