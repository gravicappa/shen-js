Test = {
  cases: [],

  init_shen: function() {
    load("runtime.js");
    load("primitives.js");
    Shen.init({io: Shen.console_io});
    Shen.defun("vector->", function(v, i, x) {
                             v[i] = x;
                             return v;
                           });
    Shen.defun("<-vector", function(v, i) {return this.absvector_ref(v, i);});
    load("test1.js");
  },

  init_cases: function() {
    this.cases = [];
    load("test_def.js");

    this.add_eq_case(0, 0, true);
    this.add_eq_case(101, 101, true);
    this.add_eq_case(true, 1, false);
    this.add_eq_case(true, "true", false);
    this.add_eq_case(true, 0, false);
    this.add_eq_case(true, new Shen.Sym("true"), true);
    this.add_eq_case(false, new Shen.Sym("false"), true);
    this.add_eq_case(new Shen.Sym("one"), new Shen.Sym("one"), true);
    this.add_eq_case(new Shen.Sym("one"), new Shen.Sym("two"), false);
    this.add_eq_case(new Shen.Sym("<-vector"), Shen.fns["<-vector"], true);
    this.add_eq_case(new Shen.Sym("<-vector"), Shen.fns["vector->"], false);
    this.add_eq_case([], [], true);
    this.add_eq_case(Shen.fail_obj, Shen.fail_obj, true);
    this.add_eq_case(Shen.list([1]), Shen.list([1]), true);
    this.add_eq_case(Shen.list([1, new Shen.Sym("one")]), Shen.list([1, new Shen.Sym("one")]), true);
    this.add_cases(this.t1);
  },

  add_cases: function(cases) {
    for (var i in cases)
      this.add_case(cases[i]);
  },

  add_case: function(cs) {
    var fn = cs[0][0];
    var args = cs[0].slice(1);
    var msgfn = [fn].concat(args.map(function(x) {return Shen.xstr(x);}));
    this.cases.push({
      str: ("(" + msgfn.join(" ") + ")"),
      fn: function() {
        return Shen.call(Shen.fns[fn], args);
      },
      expected: cs[1]
    });
  },

  add_eq_case: function(x, y, expected) {
    this.cases.push({
      str: ("(= " + Shen.xstr(x) + " " + Shen.xstr(y) + ")"),
      fn: function() {return Shen.is_equal(x, y);},
      expected: expected
    });
  },

  run_case: function(def, i) {
    if (typeof(def) === "number") {
      var i = def;
      var def = this.cases[i];
    }
    try {
      var ret = def.fn();
      var eq = Shen.is_equal(def.expected, ret);
      var result_str = "";
      if (eq) {
        this.nok++;
      } else {
        this.nerr++;
        var result_str = "[ERROR: expected " + Shen.xstr(def.expected) + "]";
      }
    } catch(e) {
      this.nerr++;
      var stack = e.stack;
      var result_str = "[EXCEPTION: " + e + " " + stack + "]";
      var eq = false;
    }
    if (0 && typeof(ret) === "object")
      for (var key in ret)
        print("  ret." + key + ": " + ret[key]);
    print("" + i + ": " + def.str + " => " + Shen.xstr(ret) + " "
          + result_str);
    return eq;
  },

  run: function(cases) {
    var t = Date.now();
    this.nerr = this.nok = 0;
    if (cases) {
      if (typeof(cases) === "number")
        var cases = [cases];
      var cases = cases.map(function(i) {return i});
    } else {
      cases = [];
      for (var i in this.cases)
        cases.push(i);
    }
    var errs = [];
    for (var i in cases)
      if (!this.run_case(this.cases[cases[i]], i))
        errs.push(i);
    var t = Date.now() - t;
    print("# DONE " + cases.length + " tests in " + t + "ms");
    if (this.nerr)
      print("" + this.nerr + " errors: [" + errs.join(", ") + "]");
  },

  init: function(cases) {
    this.init_shen();
    this.init_cases();
  }
}
