function Shen_web_boot(opts) {
  function init(fn) {
    function load_index(fn) {
      Shen_web.query("web/fs.json", function(data) {
        var def = JSON.parse(data);
        var index = [];
        for (var i = 0; i < def.length; ++i) {
          var d = def[i];
          for (var j = 0; j < d.files.length; ++j) {
            var f = d.files[j];
            index.push({src: d.from + "/" + f, dst: d.to + "/" + f});
          }
        }
        fn(index);
      }, function(err) {
        fn([]);
      });
    }

    function load_files(entries, i, fn) {
      if (i < entries.length) {
        Shen_web.query(entries[i].src, function(data) {
          var w = entries[i].dst;
          Shen_web_fs.root.put(w, data);
          load_files(entries, i + 1, fn);
        }, function(err) {
          load_files(entries, i + 1, fn);
        });
      } else {
        fn();
      }
    }

    load_index(function(index) {
      load_files(index, 0, function() {
        if (fn)
          fn();
      });
    });
  }

  function mk(where) {
    function div(name) {
      var div = document.createElement("div");
      div.id = name;
      div.className = name;
      return div;
    }

    where = document.getElementById(where);
    Shen_web.clean(where);

    var edit = div("shen_edit"),
        fs = div("shen_fs"),
        text = div("shen_text"),
        repl = div("shen_repl");
    edit.appendChild(fs);
    edit.appendChild(text);
    where.appendChild(edit);
    where.appendChild(repl);

    Shen_web_fs.mk("shen_fs", function(file, path) {
      if (file.type === "f")
        Shen_web_edit.load(Shen_web_fs.root, path);
      else
        Shen_web_edit.unload();
    });
    Shen_web_edit.mk("shen_text", function(path) {
      console.log("TODO: send (load path) to shen", path);
    });
    Shen_repl("shen_repl");
  }

  function script(file, fn) {
    var s = document.createElement("script")
    s.type = "text/javascript";
    s.src = file;
    s.async = true;
    document.head.appendChild(s);
  }

  function wait_frame() {
    var div = document.createElement("div");
    div.className = "shen_wait_overlay";

    var pane = document.createElement("div");
    pane.className = "shen_wait_pane";

    var text = document.createElement("div");
    text.className = "shen_wait_text";
    text.appendChild(document.createTextNode("Please, wait..."));

    var anim = document.createElement("img");
    anim.src = "web/wait.gif";

    pane.appendChild(text);
    pane.appendChild(anim);
    div.appendChild(pane);
    return div;
  }

  where = document.getElementById(opts.into);
  while (where.firstChild)
    where.removeChild(where.firstChild);
  var wait = wait_frame();
  document.body.appendChild(wait);

  var files = ["web/util.js", "web/fs.js", "web/edit.js",
               "web/repl.js", "web/ui.js", "runtime.js"];
  files.forEach(script);

  window.onload = function() {
    mk(opts.into);
    init(function() {
      if (opts.ondone)
        opts.ondone();
      wait.parentNode.removeChild(wait);
    });
  };
}
