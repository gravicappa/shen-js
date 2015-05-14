(function() {
  var edit = {};
  edit.file = null;
  edit.path = null;
  edit.touched = false;
  edit.welcome = ".doc/welcome.html";

  edit.set_title = function(title) {
    var t = document.getElementById("shen_edit_title");
    shen_web.clean(t);
    t.appendChild(document.createTextNode(title));
  };

  edit.load = function(root, path) {
    function load_html(html) {
      var html = str.replace(/(^.*<body[^>]*>)|(<\/body>.*$)/g, "");
      container.innerHTML = "<div class='shen_edit_html'>" + html + "</div>";
      var scr = container.getElementsByTagName("script");
      for (var i = 0; i < scr.length; ++i)
        eval(scr[i].innerHTML);
    }

    var file = root.get(path),
        container = document.getElementById("shen_edit_container"),
        ctl = document.getElementById("shen_edit_ctl"),
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
    if (in_html || path.match(/\.doc\/.*\.html/)) {
      container.style["display"] = "block";
      load_html(str);
    } else {
      ctl.style["visibility"] = "visible";
      var text = this.ensure_text_entry();
      container.appendChild(text);
      text.disabled = false;
      text.value = str;
      text.touched = false;
    }
  };

  edit.unload = function() {
    var text = document.getElementById("shen_edit_entry"),
        container = document.getElementById("shen_edit_container"),
        ctl = document.getElementById("shen_edit_ctl");
    this.set_title("");
    this.file = null;
    this.path = null;
    ctl.style["visibility"] = "hidden";
    shen_web.clean(container);
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

  edit.ensure_text_entry = function() {
    var text = document.getElementById("shen_edit_entry");
    text = text || document.createElement("textarea");
    text.id = "shen_edit_entry";
    text.className = "shen_edit_entry shen_tt_font entry_bg entry_fg";
    text.cols = 80;
    text.rows = 25;
    text.disabled = true;
    text.wrap = "off";
    text.spellcheck = false;
    var fn = (function() {this.touched = true;}).bind(this);
    text.oninput = function() {fn();};
    return text;
  };

  edit.mk = function(where, run) {
    var self = this;

    function mk_fs() {
      var fs = shen_web.toolbar([
        {
          title: "Show filesystem",
          icon: "web/folder.png",
          onclick: function() {},
        }
      ]);
      fs.className = "shen_ctl accent_bg";
      return fs;
    }

    function mk_ctl() {
      var ctl = shen_web.toolbar([
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
      ctl.id = "shen_edit_ctl";
      ctl.classList.add("shen_ctl",  "shen_edit_ctl");
      ctl.style["visibility"] = "hidden";
      return ctl;
    }

    div = document.getElementById(where);
    shen_web.clean(div);
    div.classList.add("norm_bg");
    var hdr = document.createElement("div");
    hdr.className = "shen_edit_hdr alt_bg alt_fg";

    var title = document.createElement("div");
    title.id = "shen_edit_title";
    title.className = "shen_edit_title";
    title.appendChild(document.createTextNode(""));

    var container = document.createElement("div");
    container.id = "shen_edit_container";
    container.className = "shen_edit_container";

    hdr.appendChild(mk_fs());
    hdr.appendChild(title);
    hdr.appendChild(mk_ctl());
    div.appendChild(hdr);
    div.appendChild(container);
  };

  edit.load_initial = function(root) {
    var start = location.hash.replace(/^#/, "");
    this.load(root, start || this.welcome);
  };

  shen_web.edit = edit;
})();
