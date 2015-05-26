(function() {
  var edit = {};
  edit.file = null;
  edit.path = null;
  edit.touched = false;
  edit.welcome = ".doc/welcome.html";

  edit.set_title = function(title) {
    var t = document.getElementById("editor_title");
    shen_web.clean(t);
    t.appendChild(document.createTextNode(title));
  };

  edit.load = function(root, path) {
    function load_html(html, where) {
      var html = str.replace(/(^.*<body[^>]*>)|(<\/body>.*$)/g, "");
      where.innerHTML = "<div>" + html + "</div>";
      var scr = where.getElementsByTagName("script");
      for (var i = 0; i < scr.length; ++i)
        eval(scr[i].innerHTML);
    }

    var file = root.get(path),
        edit_cont = document.getElementById("editor_edit_container"),
        edit = document.getElementById("editor_edit"),
        view_cont = document.getElementById("editor_view_container"),
        view = document.getElementById("editor_view"),
        ctl = document.getElementById("editor_toolbar"),
        in_html = false;
    this.unload();
    if (!file)
      return;
    this.path = path;
    this.set_title(path);
    this.file = file;
    try {
      var str = this.file.str_data();
    } catch(e) {
      in_html = true;
      var str = "<div class='warning'>File is binary</div>";
    }
    if (in_html || path.match(/\.doc\/.*\.html/))
      load_html(str, view);
    else {
      view_cont.classList.add("undisplayed");
      edit_cont.classList.remove("undisplayed");
      ctl.classList.remove("undisplayed");
      edit.value = str;
      edit.touched = false;
    }
  };

  edit.unload = function() {
    var edit_cont = document.getElementById("editor_edit_container"),
        view_cont = document.getElementById("editor_view_container"),
        view = document.getElementById("editor_view"),
        ctl = document.getElementById("editor_toolbar");
    this.set_title("");
    this.file = null;
    this.path = null;
    ctl.classList.add("undisplayed");
    view_cont.classList.remove("undisplayed");
    edit_cont.classList.add("undisplayed");
    shen_web.clean(view);
  };

  edit.reload = function(force) {
    var s = "Do you want to restore file? All unsaved changes will be lost";
    if (!force && !(this.file && this.touched && confirm(s)))
      return;
    var text = document.getElementById("shen_edit_entry");
    text.value = this.file.str_data();
    text.touched = false;
  };

  edit.save = function() {
    var text = document.getElementById("shen_edit_entry");
    if (this.touched && this.path)
      shen_web.fs.root.put(this.path, text.value);
    this.touched = false;
  };

  edit.run = function(fn) {
    if (this.path)
      fn(this.path);
  };

  edit.init = function(run) {
    var self = this;

    function init_text_entry() {
      var t = document.getElementById("editor_edit");
      t.wrap = "off";
      t.spellcheck = false;
      t.oninput = function() {self.touched = true;};
    }

    function init_toolbar() {
      var ctl = document.getElementById("editor_toolbar");
      shen_web.toolbar(ctl, [
        {
          title: "Send to REPL",
          icon: "web/run.png",
          onclick: function() {self.run(run);}
        },
        {
          title: "Save",
          icon: "web/save.png",
          onclick: function() {self.save();}
        },
        {
          title: "Reload",
          icon: "web/refresh.png",
          onclick: function() {self.reload();}
        },
        {
          title: "Download",
          icon: "web/down.png",
          onclick: function() {shen_web.fs.download(self.file, self.path);}
        },
        {
          title: "Upload",
          icon: "web/up.png",
          onclick: function() {
            if (self.file)
              shen_web.fs.upload(self.path, false, function(files) {
                if (files[0]) {
                  shen_web.fs.read_fileio(self.path, files[0]);
                  setTimeout(function() {
                    self.load(shen_web.fs.root, self.path);
                  }, 50);
                }
              });
          }
        }]);
    }
    init_text_entry();
    init_toolbar();
    this.unload();
    shen_web.init_maximize(document.getElementById("editor"));
  };

  edit.load_initial = function(root) {
    var start = location.hash.replace(/^#/, "");
    this.load(root, start || this.welcome);
  };

  shen_web.edit = edit;
})();
