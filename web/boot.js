shen_web = (function() {
  var self = {};
  self.init = function(opts) {
    var ondone = opts ? opts.ondone : null;

    function script(file, fn) {
      var s = document.createElement("script")
      s.type = "text/javascript";
      s.src = file;
      s.async = true;
      document.head.appendChild(s);
    }
    var files = ["web/util.js", "web/jsfile.js", "web/fs.js", "web/edit.js",
                 "web/repl.js", "web/embed.js", "shen.js"];
    files.forEach(script);

    function apply_hash() {
      var path = location.hash.replace(/^#/, "");
      if (path === "") {
        shen_web.edit.unload();
        shen_web.fs.select(null);
      } else {
        shen_web.edit.load(shen_web.fs.root, path);
        shen_web.fs.select(path);
      }
    }

    function onerror(msg) {
      var p = document.getElementById("wait_pane"),
          t = document.getElementById("wait_text"),
          img = document.getElementById("wait_progress");
      p.classList.add("wait_error");
      while (t.firstChild)
        t.removeChild(t.firstChild);
      t.appendChild(document.createTextNode("Error occured: " + msg));
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
      shen_web.init_repl();
      shen_web.init_edit(function(path) {
        var file = shen_web.fs.root.get(path);
        shen_web.send_file(path, file);
      });
      shen_web.init_fs(function(file, path) {
        if (file.type === "f")
          window.location.hash = "#" + path;
        else
          window.location.hash = "#";
      });
      opts.ondone = done;
      shen_web.embed_shen(opts);
    };
  }
  return self;
})();
