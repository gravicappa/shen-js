shen_web = (function() {
  var files = ["web/util.js", "web/jsfile.js", "web/fs.js", "web/edit.js",
               "web/repl.js", "web/embed.js", "web/store.js", "shen.js",
               "web/loader_http.js", "web/loader_github.js"];

  if (Function.prototype.name === undefined && Object.defineProperty) {
    Object.defineProperty(Function.prototype, "name", {
      get: function() {
        var re = /function\s*([\w$_]*)\s*\(/,
            x = re.exec(this.toString())[1];
        return x ? x : "";
      },
      set: function() {}
    });
  }

  var self = {}, init_status;
  self.plugins = [];
  self.set_init_status = function(s) {
    init_status.innerHTML = "";
    init_status.appendChild(document.createTextNode(s));
  };

  self.init = function(opts) {
    self.opts = opts = opts || {};
    var ondone = opts.ondone;

    function init_plugins(i, done) {
      if (i < self.plugins.length)
        self.plugins[i](function() {init_plugins(i + 1, done);});
      else
        done();
    }

    function script(file, fn) {
      var s = document.createElement("script")
      s.type = "text/javascript";
      s.src = file;
      s.async = true;
      document.head.appendChild(s);
    }
    files.forEach(script);

    function apply_hash() {
      var path = location.hash.replace(/^#/, "");
      if (path === "")
        shen_web.edit.unload();
      else
        shen_web.edit.load(shen_web.fs.root, path);
      shen_web.fs.select(path);
    }

    function onerror(msg) {
      var p = document.getElementById("wait_pane"),
          t = document.getElementById("wait_text"),
          img = document.getElementById("wait_progress");
      p.classList.add("wait_error");
      while (t.firstChild)
        t.removeChild(t.firstChild);
      t.appendChild(document.createTextNode("Error occured: " + msg));
      if (img && img.parentNode === p)
        p.removeChild(img);
    }

    function done() {
      window.onhashchange = apply_hash;
      if (ondone)
        ondone();
      apply_hash();
      var wait = document.getElementById("wait_frame");
      if (wait)
        wait.parentNode.removeChild(wait);
      window.onerror = null;
    }

    window.onload = function() {
      window.onerror = onerror;
      init_status = document.getElementById("wait_status");
      shen_web.init_repl();
      shen_web.init_edit(function(path) {shen_web.send_file(path);});
      shen_web.init_fs(function(file, path) {
        window.location.hash = "#" + path;
      });
      shen_web.set_init_status("Initializing plug-ins");
      init_plugins(0, function() {
        opts.ondone = done;
        shen_web.embed_shen(opts);
      });
    };
  }
  return self;
})();
