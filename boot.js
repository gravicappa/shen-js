boot = (function() {
  var self = {};

  function sub(a, b) {
    var index = {}, na = a.length, nb = b.length, i, ret = [];
    for (i = 0; i < nb; ++i)
      index[b[i]] = true;
    for (i = 0; i < na; ++i) {
      var x = a[i];
      if (!index[x])
        ret.push(x);
    }
    return ret;
  }

  function emit_glob(buf, key, x) {
    buf.push("vm.glob[\"" + key + "\"] = " + x + ";");
  }

  function esc(s) {
    return '"' + s.replace(/"/g, '\\"') + '"';
  }

  function bootstrap() {
    var prev_glob_keys = Object.keys(shen.glob);
        orig_eval = shen.eval,
        buf = [];
    try {
      shen.eval = function(x) {
        buf.push(x);
        return orig_eval.call(this, x);
      };
      shen.init({io: shen.console_io});
    } finally {
      shen.eval = orig_eval;
    }
    var glob_keys = sub(sub(Object.keys(shen.glob), prev_glob_keys),
                        ["*stoutput*", "*stinput*"]),
        nglob_keys = glob_keys.length;
    var glob = [];
    for (var i = 0; i < nglob_keys; ++i) {
      var key = glob_keys[i], obj = shen.glob[key];
      switch (typeof(obj)) {
      case "number": case "boolean": emit_glob(glob, key, obj); break;
      case "string": emit_glob(glob, key, esc(obj)); break;
      default:
        if (obj instanceof Array && !obj.length)
          emit_glob(glob, key, "[]");
        else {
          var json = shen.json_from_obj(obj);
          emit_glob(glob, key, "vm.obj_from_json(" + esc(json) + ")");
        }
      }
    }
    print("(function(vm) {\n  "
           + buf.join("\n")
           + "\n\n" + glob.join("\n  ")
           + "\n  vm.toplevels = [];"
           + "\n})(shen);");
  }

  bootstrap();
  return self;
})();
