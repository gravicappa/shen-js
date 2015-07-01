#!/usr/bin/env node
var shen = require("./shen"),
    fs = require("fs"),
    stream = require("stream");

shen_node = (function() {
  var sn = {};

  function mk_read_byte(s) {
    var chan = shen.Chan(),
        started = false;
    chan.end = -1;
    function ensure_listeners(vm) {
      if (started)
        return;
      started = true;
      s.on("data", function(data) {
        for (var i = 0; i < data.length; ++i)
          chan.write(data[i], vm);
      });
      s.on("end", function() {
        chan.close(vm);
      });
      s.on("error", function(err) {
        chan.write(new Error(err), vm);
      });
    }
    return function(vm) {
      ensure_listeners(vm);
      return chan.read(vm);
    };
  }

  function mk_write_byte(s) {
    return function(byte, vm) {
      var ret = s.write(new Buffer([byte]), null, function(err) {
        vm.resume(err ? new Error(err) : byte);
      });
      vm.interrupt();
    }
  }

  function wrap_stream(s, dir) {
    function is_dir(str, type) {
      return dir === str || (!dir && s instanceof type);
    }
    if (is_dir("r", stream.Readable))
      return shen.Stream(mk_read_byte(s), null, function() {
        s.removeAllListeners();
      });
    if (is_dir("w", stream.Writable))
      return shen.Stream(null, mk_write_byte(s), function() {s.end();});
    if (is_dir("rw", stream.Duples))
      return shen.Stream(mk_read_byte(s), mk_write_byte(s), function() {
        s.end();
        s.removeAllListeners();
      });
    throw new Error("Unsupported stream type");
  }

  function open(name, dir, vm) {
    var filename = vm.glob["*home-directory*"] + name;
    switch (dir.str) {
    case "in": return wrap_stream(fs.createReadStream(filename), "r");
    case "out": return wrap_stream(fs.createWriteStream(filename), "w");
    default: return vm.error("Unsupported 'open' flags");
    }
  }

  function io(vm) {
    var io = {};
    io.open = open;
    vm.glob["*stinput*"] = wrap_stream(process.stdin, "r");
    vm.glob["*stoutput*"] = wrap_stream(process.stdout, "w");
    return io;
  }

  function repl() {
    shen.start_repl();
  }

  function init() {
    shen.init({io: io, async: true});
  }

  function usage_die() {
    process.stdout.write("Usage: shen-node.js [-c target_file] <source files...>\n");
    process.exit(1);
  }

  function load(src, callback) {
    shen.exec("load", [src], callback);
  }

  function on_files(files, i, fn, callback) {
    if (i < files.length)
      fn(files[i], function() {
        load_files(files, i + 1, callback);
      });
    else if (callback)
      callback();
  }

  function compile(files, i, dest, callback) {
    var list = shen.list(files.slice(i))
    shen.exec("js.save-from-files", [list, dest], callback);
  }

  function main() {
    var i, compile_dest;
    process.on("exit", function() {});
    for (i = 2; i < process.argv.length && process.argv[i].match(/^-/); ++i) {
      switch (process.argv[i]) {
      case "-c": compile_dest = process.argv[++i]; break;
      default: usage_die();
      }
    }
    if (i >= process.argv.length)
      shen.start_repl();
    else if (compile_dest)
      compile(process.argv, i, compile_dest);
    else
      on_files(process.argv, i, load);
  }

  sn.wrap_stream = wrap_stream;
  sn.init = init;
  sn.main = main;
  init();
  return sn;
})();

module.exports = shen_node;
if (require.main === module)
  shen_node.main();
