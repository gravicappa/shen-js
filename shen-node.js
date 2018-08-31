#!/usr/bin/env node

module.exports = (function() {
  var usage = ["Usage: shen-node.js [-noinit] [-c target_file] <files...>"],
      shen = require("./shen"),
      fs = require("fs"),
      stream = require("stream"),
      self = {},
      home = process.env[(process.platform == "win32")
                         ? "USERPROFILE" : "HOME"];

  function main() {
    var i, compile_dest, init = true;
    for (i = 2; i < process.argv.length && process.argv[i].match(/^-/); ++i) {
      switch (process.argv[i]) {
      case "-noinit": init = false; break;
      case "-c": case "-compile": compile_dest = process.argv[++i]; break;
      default: usage_die();
      }
    }
    if (init)
      read_init_file(start);
    else
      start();

    function start() {
      if (i >= process.argv.length)
        shen.start_repl();
      else if (compile_dest)
        compile(process.argv, i, compile_dest);
      else
        on_files(process.argv, i, load, function() {process.exit()});
    }
  }

  function mk_read_byte(stream, vm) {
    var chan = shen.Chan();
    chan.end = -1;
    stream.vm = vm;
    stream.on("error", function(err) {
      chan.write(new Error(err), stream.vm);
    });
    stream.on("data", function(data) {
      var i, vm = stream.vm;
      for (i = 0; i < data.length; ++i)
        chan.write(data[i], vm);
    });
    stream.on("end", function() {
      chan.close(stream.vm);
    });
    return function(vm) {
      stream.vm = vm;
      return chan.read(vm);
    };
  }

  function mk_write_byte(stream) {
    return function(byte, vm) {
      var ret = stream.write(new Buffer([byte]), null, function(err) {
        vm.resume(err ? err : byte);
      });
      vm.interrupt();
    }
  }

  function mk_close(stream) {
    return function() {
      if (stream.end)
        stream.end();
      stream.removeAllListeners();
      stream.on("error", function() {});
    }
  }

  function wrap_stream(stream, dir, vm) {
    switch (dir) {
    case "r":
      return shen.Stream(mk_read_byte(stream, vm), null, mk_close(stream));

    case "w":
      return shen.Stream(null, mk_write_byte(stream), mk_close(stream));

    case "rw": case "wr": case "w+": case "r+":
      return shen.Stream(mk_read_byte(stream, vm), mk_write_byte(stream),
                         mk_close(stream));

    default: throw new Error("Unsupported stream type: " + dir);
    }
  }

  function fix_path(path) {
    return path.replace(/^~/, home);
  }

  function open(name, dir, vm) {
    var path = fix_path(vm.glob["*home-directory*"] + name);
    switch (dir.str) {
    case "in":
      wait_result(fs.createReadStream(path), "readable", function(err) {
        vm.resume((err) ? err : wrap_stream(this, "r", vm));
      });
      break;

    case "out":
      wait_result(fs.createWriteStream(path), "drain", function(err) {
        vm.resume((err) ? err : wrap_stream(this, "w", vm));
      });
      break;

    default: return vm.error("Unsupported 'open' flags");
    }

    function wait_result(stream, ev, onready) {
      stream.once("error", onready);
      stream.once(ev, onready);
      vm.interrupt();
    }
  }

  function io(vm) {
    var io = {};
    io.open = open;
    vm.glob["*stinput*"] = wrap_stream(process.stdin, "r", vm);
    vm.glob["*stoutput*"] = wrap_stream(process.stdout, "w", vm);
    return io;
  }

  function load(src, callback) {
    shen.exec("load", [src], callback);
  }

  function on_files(files, i, fn, callback) {
    if (i < files.length)
      fn(files[i], function() {
        on_files(files, i + 1, fn, callback);
      });
    else if (callback)
      callback();
  }

  function compile(files, i, dest, callback) {
    var list = shen.list(files.slice(i))
    shen.exec("js.save-from-files", [list, dest], callback);
  }

  function read_init_file(callback) {
    var path = home + "/.shen.shen";
    fs.access(path, fs.R_OK, function(err) {
      if (err)
        callback();
      else {
        shen.glob["*hush*"] = true;
        shen.exec("load", [path], function() {
          shen.glob["*hush*"] = false;
          callback();
        });
      }
    });
  }

  function usage_die() {
    process.stdout.write(usage.join(" ") + "\n");
    process.exit(1);
  }

  self.wrap_stream = wrap_stream;
  self.main = main;

  shen.init({io: io, async: true});
  return self;
})();

if (require.main === module)
  module.exports.main();
