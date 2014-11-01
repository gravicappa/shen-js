Test = {
  cases: {},

  init_shen: function() {
    load('runtime.js');
    Shen.defun('+', 2, function(X) {return X[0] + X[1]});
    Shen.defun('-', 2, function(X) {return X[0] - X[1]});
    Shen.defun('or', 2, function(X) {return X[0] || X[1]});
    Shen.defun('and', 2, function(X) {return X[0] && X[1]});
    Shen.defun('vector->', 3, function(X) {
      X[0][X[1]] = X[2];
      return X[0];
    });
    Shen.defun('<-vector', 2, function(X) {return X[0][X[1]];});
    Shen.init({io: Shen.console_io});
    load('test1.js');
  },

  init_cases: function() {
    load('test_def.js');
    this.cases = this.t1;
  },

  runcase: function(x) {
    var expected = x[1];
    var fn = x[0][0];
    var args = x[0].slice(1);
    var msgfn = [fn].concat(args.map(function(x) {return Shen.xstr(x);}));
    var ret = Shen.call(Shen.fns[fn], args);
    var eq = Shen.$eq$(expected, ret);
    var result = eq ? "" : "[ERROR: expected " + Shen.xstr(expected) + "]";
    print('# (' + msgfn.join(' ') + ') => ' + Shen.xstr(ret) + ' ' + result);
    return eq;
  },

  run: function() {
    var t = new Date().getTime();
    var nerr = 0, nok = 0
    for (var i in this.cases)
      if (this.runcase(this.cases[i]))
        ++nok;
      else
        ++nerr;
    var t = (new Date().getTime()) - t;
    print('DONE ' + t + 'ms');
    if (nerr)
      print('Errors: ' + nerr);
    else
      print('OK');
  },

  main: function() {
    this.init_shen();
    this.init_cases();
    this.run();
  }
}
