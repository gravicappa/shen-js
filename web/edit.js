shen_web.init_edit = function(run) {
  var edit = {};
  edit.file = null;
  edit.touched = false;
  edit.welcome = ".doc/welcome.html";

  edit.set_title = function(title) {
    var t = document.getElementById("editor_title");
    shen_web.clean(t);
    t.appendChild(document.createTextNode(title));
  };

  edit.load = function(root, file) {
    function process_links(where) {
      var links = where.getElementsByTagName("a"), i, n = links.length;
      for (i = 0; i < n; ++i) {
        var a = links[i];
        if (a.hostname !== window.location.hostname)
          a.target = "_blank";
      }
    }

    function load_html(html, where) {
      var html = str.replace(/(^.*<body[^>]*>)|(<\/body>.*$)/g, "");
      where.innerHTML = "<div>" + html + "</div>";
      var scr = where.getElementsByTagName("script");
      for (var i = 0; i < scr.length; ++i)
        eval(scr[i].innerHTML);
      process_links(where);
    }

    var file = (typeof(file) === "string") ? root.get(file) : file,
        edit_cont = document.getElementById("editor_edit_container"),
        edit = document.getElementById("editor_edit"),
        view_cont = document.getElementById("editor_view_container"),
        view = document.getElementById("editor_view"),
        ctl = document.getElementById("editor_toolbar"),
        in_html = false,
        str;
    this.unload();
    if (!file || file.type === "d")
      return;
    this.set_title(file.path());
    this.file = file;
    try {
      str = this.file.str();
    } catch(e) {
      in_html = true;
      str = "<div class='warning'>Cannot show. File is probably binary</div>";
    }
    if (in_html || file.path().match(/\.html$/))
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
    ctl.classList.add("undisplayed");
    view_cont.classList.remove("undisplayed");
    edit_cont.classList.add("undisplayed");
    shen_web.clean(view);
  };

  edit.reload = function(force) {
    var s = "Do you want to restore file? All unsaved changes will be lost";
    if (!force && !(this.file && this.touched && confirm(s)))
      return;
    var text = document.getElementById("editor_edit");
    text.value = this.file.str_data();
    text.touched = false;
  };

  edit.save = function() {
    var text = document.getElementById("editor_edit");
    if (this.touched && this.file)
      this.file.put(text.value);
    this.touched = false;
  };

  edit.run = function(fn) {
    this.save();
    if (this.file)
      fn(this.file.path());
  };

  function init_text_entry() {
    var t = document.getElementById("editor_edit");
    t.wrap = "off";
    t.spellcheck = false;
    t.oninput = function() {edit.touched = true;};
  }

  function init_toolbar() {
    var ctl = document.getElementById("editor_toolbar");
    shen_web.toolbar(ctl, [
      {
        title: "Save and send to REPL",
        icon: "web/run.png",
        onclick: function() {edit.run(run);}
      },
      {
        title: "Save",
        icon: "web/save.png",
        onclick: function() {edit.save();}
      },
      {
        title: "Reload",
        icon: "web/revert.png",
        onclick: function() {edit.reload();}
      },
      {
        title: "Download",
        icon: "web/download.png",
        onclick: function() {shen_web.fs.download(edit.file, edit.path);}
      },
      {
        title: "Upload",
        icon: "web/upload.png",
        onclick: function() {
          if (edit.file)
            shen_web.fs.upload(edit.file.path(), false, function(files) {
              if (files[0]) {
                shen_web.fs.read_fileio(edit.file.path(), files[0]);
                setTimeout(function() {
                  edit.load(shen_web.fs.root, edit.file.path());
                }, 50);
              }
            });
        }
      }]);
  }
  init_text_entry();
  init_toolbar();
  edit.unload();
  shen_web.init_maximize(document.getElementById("editor"));
  shen_web.edit = edit;
};
