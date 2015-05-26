(function() {
  function io() {
    var io = {};
    io.open = open;
    shen.glob["*stoutput*"] = new shen.Stream("w", write_byte, function() {});
    shen.ensure_chan_input();
    return io;

    function write_byte(byte, vm) {
      shen_web.puts(String.fromCharCode(byte));
    }
  }

  function open(name, dir, vm) {
    var filename = vm.glob["*home-directory*"] + name;
    var handler = find_handler(name);
    if (handler)
      return handler(name, dir, vm);
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
    case "out": return file_out_stream(shen_web.fs.root.put(filename));
    default: return vm.error("Unsupported 'open' flags");
    }
  }

  function file_out_stream(file, vm) {
    var pos = 0;
    function read_byte(vm) {
      if (pos < file.data.byteLength)
        return file.data[pos++];
      return -1;
    }
    return vm.Stream("w", read_byte, function() {});
  }

  function find_handler(name) {
    var hs = shen_web.vfs_handlers, n = hs.length, i, f;
    for (i = 0; i < n; ++i) {
      f = hs[i](name);
      if (f)
        return f;
    }
    return null;
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

  function post(fn) {
    var id = posts_id++;
    posts[id] = fn;
    window.postMessage(id, "*");
  }

  shen_web.vfs_handlers = [];
  shen_web.file_out_stream = file_out_stream;
  window.addEventListener("message", recv_step, true);
  shen_web.post = post;
  shen_web.embed_shen = function(ondone) {
    shen.post_async = post;
    //shen.post_async = function(fn) {setTimeout(fn, 100);};
    shen.init({io: io, async: true, ondone: ondone, repl: true});
  };
})();
