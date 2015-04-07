Shen_web_edit = {
  file: null,
  path: null,
  touched: false,
  welcome: ".doc/welcome.html",

  set_title: function(title) {
    var t = document.getElementById("shen_edit_title");
    Shen_web.clean(t);
    t.appendChild(document.createTextNode(title));
  },

  load: function(root, path) {
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
      var html = str.replace(/(^.*<body[^>]*>)|(<\/body>.*$)/g, "");
      container.innerHTML = "<div class='shen_edit_html'>" + html + "</div>";
    } else {
      ctl.style["visibility"] = "visible";
      var text = this.ensure_text_entry();
      container.appendChild(text);
      text.disabled = false;
      text.value = str;
      text.touched = false;
    }
  },

  unload: function() {
    var text = document.getElementById("shen_edit_entry"),
        container = document.getElementById("shen_edit_container"),
        ctl = document.getElementById("shen_edit_ctl");
    this.set_title("");
    this.file = null;
    this.path = null;
    ctl.style["visibility"] = "hidden";
    Shen_web.clean(container);
  },

  reload: function(force) {
    var s = "Do you want to restore file? All unsaved changes will be lost";
    if (!force && !(this.file && this.touched && confirm(s)))
      return;
    var text = document.getElementById("shen_edit_entry");
    text.value = this.file.str_data();
    text.touched = false;
  },

  save: function() {
    var text = document.getElementById("shen_edit_entry");
    if (this.touched && this.path)
      Shen_web_fs.root.put(this.path, text.value);
    this.touched = false;
  },

  run: function(fn) {
    if (this.path)
      fn(this.path);
  },

  ensure_text_entry: function() {
    var text = document.getElementById("shen_edit_entry");
    text = text || document.createElement("textarea");
    text.id = "shen_edit_entry";
    text.className = "shen_edit_entry shen_tt_font";
    text.cols = 80;
    text.rows = 25;
    text.disabled = true;
    text.wrap = "off";
    text.spellcheck = false;
    var fn = (function() {this.touched = true;}).bind(this);
    text.oninput = function() {fn();};
    return text;
  },

  mk: function(div, run) {
    var self = this;

    function mk_ctl() {
      var ctl = document.createElement("div");
      ctl.id = "shen_edit_ctl";
      ctl.className = "shen_ctl shen_edit_ctl";
      ctl.style["visibility"] = "hidden";

      var btn_run = Shen_web.img_btn("Run", "web/run.png");
      btn_run.className += " shen_edit_ctl_btn";
      btn_run.onclick = function() {self.run(run);};
      ctl.appendChild(btn_run);

      ctl.appendChild(Shen_web.tool_sep());

      var btn_save = Shen_web.img_btn("Save", "web/save.png");
      btn_save.className += " shen_edit_ctl_btn";
      btn_save.onclick = function() {self.save();};
      ctl.appendChild(btn_save);

      var btn_reload = Shen_web.img_btn("Reload", "web/refresh.png");
      btn_reload.className += " shen_edit_ctl_btn";
      btn_reload.onclick = function() {self.reload();};
      ctl.appendChild(btn_reload);

      var btn_down = Shen_web.img_btn("Download", "web/down.png");
      btn_down.className += " shen_edit_ctl_btn";
      btn_down.onclick = function() {Shen_web_fs.download(self.file, self.path);};
      ctl.appendChild(btn_down);

      var btn_up = Shen_web.img_btn("Upload", "web/up.png");
      btn_up.className += " shen_edit_ctl_btn";
      btn_up.onclick = function() {
        if (self.file)
          Shen_web_fs.upload(self.path, false, function(files) {
            if (files[0]) {
              Shen_web_fs.read_fileio(self.path, files[0]);
              setTimeout(function() {self.load(Shen_web_fs.root, self.path);}, 50);
            }
          });
      };
      ctl.appendChild(btn_up);
      return ctl;
    }

    div = Shen_web.ensure_obj(div);
    Shen_web.clean(div);
    var hdr = document.createElement("div");
    hdr.className = "shen_edit_hdr";

    var title = document.createElement("div");
    title.id = "shen_edit_title";
    title.className = "shen_edit_title";
    title.appendChild(document.createTextNode(""));

    var container = document.createElement("div");
    container.id = "shen_edit_container";
    container.className = "shen_edit_container";

    hdr.appendChild(title);
    hdr.appendChild(mk_ctl());
    hdr.appendChild(Shen_web.clear_div());

    div.appendChild(hdr);
    div.appendChild(container);
  },

  load_initial(root) {
    var start = location.hash.replace(/^#/, "");
    this.load(root, start || this.welcome);
  }
};
