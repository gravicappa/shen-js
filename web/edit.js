Shen_web_edit = {
  file: null,
  path: null,
  touched: false,

  set_title: function(title) {
    var t = document.getElementById("shen_edit_title");
    Shen_web.clean(t);
    t.appendChild(document.createTextNode(title));
  },

  load: function(root, path) {
    var file = root.get(path);
    if (!file)
      return;
    this.path = path;
    this.set_title(path);
    var text = document.getElementById("shen_edit_entry");
    text.value = file.str_data();
    this.file = file;
    this.touched = false;
  },

  save: function() {
    var text = document.getElementById("shen_edit_entry");
    if (this.touched && this.path)
      Shen_web_fs.root.put(this.path, text.value);
    this.touched = false;
  },

  mk: function(div) {
    var self = this;
    Shen_web.clean(div);
    var hdr = document.createElement("div");
    hdr.className = "shen_edit";

    var title = document.createElement("span");
    title.id = "shen_edit_title";
    title.className = "shen_edit_title";
    title.appendChild(document.createTextNode("unnamed"));

    var text = document.createElement("textarea");
    text.id = "shen_edit_entry";
    text.className = "shen_edit_entry";
    text.cols = 80;
    text.rows = 25;
    var fn = (function() {this.touched = true;}).bind(this);
    text.oninput = function() {fn();};

    var ctl = document.createElement("span");
    ctl.className = "shen_edit_ctl";

    hdr.appendChild(title);

    var btn_save = document.createElement("button");
    btn_save.className = "shen_edit_ctl_btn";
    btn_save.title = "Save";
    btn_save.appendChild(document.createTextNode("Save"));
    btn_save.onclick = function() {self.save();};
    ctl.appendChild(btn_save);

    var btn_reload = document.createElement("button");
    btn_reload.className = "shen_edit_ctl_btn";
    btn_reload.title = "Reload";
    btn_reload.appendChild(document.createTextNode("Reload"));
    ctl.appendChild(btn_reload);

    var btn_download = document.createElement("button");
    btn_download.className = "shen_edit_ctl_btn";
    btn_download.title = "Download";
    btn_download.appendChild(document.createTextNode("Download"));
    ctl.appendChild(btn_download);

    var btn_upload = document.createElement("button");
    btn_upload.className = "shen_edit_ctl_btn";
    btn_upload.title = "Upload";
    btn_upload.appendChild(document.createTextNode("Upload"));
    ctl.appendChild(btn_upload);

    hdr.appendChild(ctl);

    div.appendChild(hdr);
    div.appendChild(text);
  }
};
