shen_web.embed_shen = function(opts) {
  function io(vm) {
    var io = {};
    io.open = open;
    vm.glob["*stoutput*"] = vm.Stream("w", write_byte, function() {});
    vm.ensure_chan_input();
    return io;

    function write_byte(byte, vm) {
      shen_web.puts(String.fromCharCode(byte));
    }
  }

  function open(name, dir, vm) {
    var filename = vm.glob["*home-directory*"] + name;
    var loader = shen_web.fs.find_loader(name);
    if (loader)
      return loader(name, dir, vm);
    switch (dir.str) {
    case "in":
      var file = shen_web.fs.root.get(filename);
      if (!file)
        return vm.error("open: '" + filename + "' does not exist");
      switch (file.type) {
      case "f": return vm.buf_stream(file.data);
      case "d": return vm.error("open: '" + filename + "' is directory");
      default: return vm.error("open: '" + filename + "' has unknown type");
      }
    case "out": return file_out_stream(shen_web.fs.root.put(filename), vm);
    default: return vm.error("Unsupported 'open' flags");
    }
  }

  function buf_append(a, b) {
    var alen = a.length, blen = b.length, r = new Uint8Array(alen + blen);
    r.set(a);
    r.set(b, alen);
    return r;
  }

  function file_out_stream(file, vm) {
    file.data = new Uint8Array(0);
    function write_byte(byte, vm) {
      try {
        file.data = buf_append(file.data, [byte]);
      } catch (e) {
        console.log(e);
      }
      return byte;
    }
    return vm.Stream("w", write_byte, function() {});
  }

  function send(s) {
    shen_web.puts(s, "input");
    shen.send_str(s);
  }

  function send_file(path, file) {
    send("(load \"" + path + "\")\n");
  }

  var posts = {}, posts_id = 0;

  function recv_step(ev) {
    if (ev.source !== window)
      return;
    var data = ev.data, f = posts[data];
    if (f) {
      ev.stopPropagation();
      delete posts[data];
      if (!Object.keys(posts).length)
        posts_id = 0;
      f();
    }
  }

  function post(fn, ms) {
    if (!ms) {
      var id = posts_id++;
      posts[id] = fn;
      window.postMessage(id, "*");
    } else
      setTimeout(fn, ms);
  }

  this.file_out_stream = file_out_stream;
  window.addEventListener("message", recv_step, true);
  this.post = post;
  this.send = send;
  this.send_file = send_file;
  var fsindex = opts.fs_index || "fs.json";
  this.fs.deploy(fsindex, function() {
    shen.post_async = post;
    shen.init({io: io, async: true, ondone: opts.ondone, repl: true});
  });
};
