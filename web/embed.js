shen_web.embed_shen = function(opts) {
  function io(vm) {
    var io = {};
    io.open = open;
    vm.glob["*stoutput*"] = vm.Stream(null, write_byte);
    vm.ensure_chan_input();
    return io;

    function write_byte(byte, vm) {
      shen_web.puts(String.fromCharCode(byte));
    }
  }

  function open(name, dir, vm) {
    var filename = vm.glob["*home-directory*"] + name;
    var loader = shen_web.fs.find_loader(filename);
    if (loader)
      return loader(filename, dir, vm);
    switch (dir.str) {
    case "in":
      var file = shen_web.fs.root.get(filename);
      if (!file)
        return vm.error("open: '" + filename + "' does not exist");
      switch (file.type) {
      case "f": return vm.buf_stream(file.contents);
      case "d": return vm.error("open: '" + filename + "' is directory");
      default: return vm.error("open: '" + filename + "' has unknown type");
      }
    case "out": return file_out_stream(shen_web.fs.root.put(null, filename), vm);
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
    var buf = new Uint8Array(0);
    return vm.Stream(null,
                     function write_byte(byte, vm) {
                       buf = buf_append(buf, [byte]);
                       return byte;
                     },
                     function close(vm) {
                       file.put(buf);
                       file.data = buf;
                     });
  }

  function send(s) {
    shen_web.puts(s, "input");
    shen.send_str(s);
  }

  function send_file(path) {
    send("(load \"" + path + "\")\n");
  }

  function load_init() {
    var name = ".init.shen",
        f = shen_web.fs.root.get(name);
    if (f)
      send_file(name);
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

  shen.defun("js.redeploy-fs", function() {
    var vm = this;
    shen_web.fs.deploy(shen_web.fs_index, function() {
      vm.resume(true);
    });
    vm.interrupt();
  });

  this.file_out_stream = file_out_stream;
  window.addEventListener("message", recv_step, true);
  this.post = post;
  this.send = send;
  this.send_file = send_file;
  shen_web.fs_index = opts.fs_index || "fs.json";
  shen_web.set_init_status("Deploying stored filesystem");
  shen_web.init_store(function() {
    shen_web.set_init_status("Deploying remote filesystem");
    shen_web.fs.deploy(shen_web.fs_index, function() {
      shen_web.set_init_status("Initializing Shen runtime");
      shen.post_async = post;
      shen.init({io: io, async: true, ondone: opts.ondone, repl: true});
      load_init();
    });
  });
};
