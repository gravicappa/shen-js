function Jsfile(type, data, evhandlers) {
  if (!(this instanceof Jsfile))
    return new Jsfile(type, data);

  this.type = type;
  switch (type) {
  case "d": this.data = data || {}; break;
  case "f": this.data = ensure_array(data);
  }
  this.on = evhandlers || {};

  function split_path(path) {
    if (typeof(path) === "string")
      return path.replace(/\/\/*/g, "/").replace(/^\//, "").replace(/\/$/, "")
                 .split("/");
    return path;
  }

  function basename(path) {
    path = split_path(path);
    return path[path.length - 1];
  }

  function dirname(path) {
    path = split_path(path);
    return path.slice(0, path.length - 1);
  }

  this.get = function(path) {
    path = split_path(path);
    if (path.length === 1 && path[0] === "")
      return this;
    var file = this;
    for (var i = 0; i < path.length && file; ++i)
      file = file.data[path[i]];
    return file;
  };

  this.cat = function(path) {
    var file = this.get(path);
    if (!file || file.type === "d")
      return null;
    return file.data;
  };

  this.mkdir = function(path) {
    path = split_path(path);
    var file = this;
    for (var i = 0; i < path.length; ++i) {
      var dir = file.data[path[i]];
      if (!dir) {
        var dir = new Jsfile("d", {}, this.on);
        file.data[path[i]] = dir;
        if (file.oncreate_child)
          file.oncreate_child(dir, path.slice(0, i + 1).join("/"));
      } else if (dir.type !== "d")
        return null;
      file = dir;
    }
    return file;
  };

  function bytes_from_str(str) {
    return shen.utf8_from_str(str);
  }

  function str_from_bytes(arr) {
    return shen.str_from_utf8(arr);
  }

  this.str_data = function() {
    return str_from_bytes(this.data);
  };

  function ensure_array(x) {
    if (x instanceof Uint8Array)
      return x;
    if (typeof(x) === "string")
      return new Uint8Array(bytes_from_str(x));
    if (x instanceof Array || x instanceof ArrayBuffer)
      return new Uint8Array(x);
    return new Uint8Array();
  }

  this.put = function(path, data) {
    path = split_path(path);
    var dname = dirname(path);
    var name = basename(path);
    var dir = this.mkdir(dname);
    var file = dir.data[name];
    if (file) {
      if (file.type === "d")
        throw new Error("Directory " + path.join("/") + " already exists");
      file.data = ensure_array(data);
    } else {
      file = new Jsfile("f", ensure_array(data), this.on);
      dir.data[name] = file;
      if (dir.oncreate_child)
        dir.oncreate_child(file, path.join("/"));
    }
    return file;
  };

  this.is_empty = function() {
    return !data.length;
  }

  this.rm = function(path, recursive) {
    path = split_path(path);
    if (path.length == 1 && path[0] === "") {
      if (recursive) {
        for (var x in this.data.keys()) {
          var f = this.data[x];
          if (f.onrm)
            f.onrm();
        }
        this.data = {};
        return true;
      }
      return false;
    }
    var dir = this.get(dirname(path));
    if (!dir)
      return false;
    var name = basename(path);
    var file = dir.data[name];
    if (file.type === "d" && !file.is_empty() && !recursive)
      return false;
    if (file.onrm)
      file.onrm();
    delete dir.data[name];
    return true;
  };

  this.walk = function(fn, context, name, parent, path) {
    name = name || "";
    path = path || "";
    if (name)
      path = path + "/" + name;
    var x = fn({file: this, name: name, path: path, parent: parent}, context);
    if (this.type === "d")
      for (var i in this.data)
        this.data[i].walk(fn, x, i, this, path);
  };

  this.show = function(pr) {
    try {
      pr = pr || console.log.bind(console);
    } catch(e) {
      pr = pr || print;
    }
    function p(entry, prefix) {
      pr(entry.path + ((entry.file.type == "d") ? "/" : ""));
    }
    this.walk(p);
  };
}

(function() {
  var fs = {};
  fs.root = new Jsfile("d");
  fs.selected = {};

  fs.download = function(file, path) {
    if (!file)
      return;
    try {
      var blob = new Blob([file.data], {type: "application/octet-stream"});
    } catch (e) {
      window.BlobBuilder = window.BlobBuilder
                           || window.MozBlobBuilder
                           || window.WebKitBlobBuilder
                           || window.MSBlobBuilder;
      var bb = new window.BlobBuilder();
      bb.append(file.data.buffer);
      var blob = bb.getBlob("application/octet-stream");
    }
    window.URL = window.URL || window.webkitURL;
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.style["display"] = "none";
    a.target = "_blank";
    a.href = url;
    a.download = path.match(/[^/]*$/)[0];
    if (document.createEvent) {
      var ev = document.createEvent("MouseEvents");
      ev.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0, false,
                        false, false, false, 0, null);
      a.dispatchEvent(ev);
    } else if (a.click)
      a.click();
    setTimeout(function() {URL.revokeObjectURL(url)}, 100);
  };

  fs.read_fileio = function(path, file) {
    console.log("read_fileio", path, file);
    var fs = this;
    var reader = new FileReader();
    reader.onload = function(e) {
      fs.root.put(path, e.target.result);
    };
    reader.readAsArrayBuffer(file);
  };

  fs.upload = function(path, multiple, fn) {
    var fs = this;
    shen_web.dialog("Upload to file", function(dlg, content) {
      var text = document.createElement("div");
      text.appendChild(document.createTextNode("Choose a file to upload"));
      text.className = "dlg_msg";
      var input = document.createElement("input");
      input.type = "file";
      if (multiple)
        input.directory = input.webkitdirectory = input.multiple = true;
      input.onchange = function(ev) {
        var files = ev.target.files || ev.target.webkitEntries;
        fn(files);
        dlg.parentNode.removeChild(dlg);
      };
      content.appendChild(text);
      content.appendChild(input);
    });
  };

  fs.upload_to = function(path) {
    var fs = this;
    this.upload(path, true, function(files) {
      for (var i = 0; i < files.length; ++i) {
        var f = files[i];
        fs.read_fileio(path + "/" + f.name, f);
      }
    });
  };

  function init_handle() {
    var handle = document.getElementById("fs_toggle"),
        main = document.getElementById("main");
    handle.checked = main.classList.contains("fs_opened");
    handle.onclick = function() {
      if (this.checked)
        main.classList.add("fs_opened");
      else
        main.classList.remove("fs_opened");
    };
  }

  fs.init = function(file_fn) {
    var fs = this;

    function ctl_rm(path) {
      var btn = shen_web.img_btn("Delete", "web/rm.png");
      btn.classList.add("fs_ctl_rm_btn");
      btn.onclick = function() {
        var path = fs.selected.path;
        if (path && confirm("Do you want to delete '" + path + "'?"))
          fs.root.rm(path, true);
      };
      return btn;
    }

    function mkfile_dlg(text, fn) {
      return function() {
        if (!fs.selected.path)
          return;
        var name = prompt(text);
        if (!name || name === "")
          return;
        if (!fs.root.get(fs.selected.path + "/" + name))
          fn(fs.selected.path + "/" + name);
      };
    }

    function ctl_new(type) {
      var btn;
      switch (type) {
      case "f":
        btn = shen_web.img_btn("Create file", "web/new.png");
        btn.classList.add("fs_ctl_mk_btn");
        btn.onclick = mkfile_dlg("Enter file name", function(path) {
          fs.root.put(path, "");
        });
        break;
      case "d":
        btn = shen_web.img_btn("Create dir", "web/folder_new.png");
        btn.classList.add("fs_ctl_mk_btn");
        btn.onclick = mkfile_dlg("Enter directory name", function(path) {
          fs.root.mkdir(path);
        });
        break;
      }
      return btn;
    }

    function ctl_upload() {
      var btn = shen_web.img_btn("Upload file", "web/up.png");
      btn.classList.add("fs_ctl_upload_btn");
      btn.onclick = function() {
        console.log("fs.selected.path", fs.selected.path);
        var path = fs.selected.path;
        if (path || path === "")
          fs.upload_to(path);
      };
      return btn;
    }

    function ctl_download() {
      var btn = shen_web.img_btn("Download file", "web/down.png");
      btn.classList.add("fs_ctl_download_btn");
      btn.onclick = function() {
        var path = fs.selected.path;
        if (path)
          fs.download(fs.root.get(path), path);
      };
      return btn;
    }

    function init_file_ctl(div) {
      div.appendChild(ctl_download());
      div.appendChild(ctl_rm());
      return div;
    }

    function init_dir_ctl(div) {
      div.appendChild(ctl_new("f"));
      div.appendChild(ctl_new("d"));
      div.appendChild(ctl_upload());
      div.appendChild(ctl_rm());
      return div;
    }

    function dir_onclick_icon(icon, contents) {
      if (contents.classList.toggle("fs_subdir_collapsed"))
        icon.src = "web/folder.png";
      else
        icon.src = "web/folder_open.png";
      return true;
    }

    function toggle_item_select(entry, select) {
      var fn = (select) ? "add" : "remove";
      for (var c = entry.childNodes, i = 0; i < c.length; ++i) {
        var sub = c[i];
        if (sub.classList.contains("fs_name"))
          sub.classList[fn]("accent_bg", "accent_fg");
      }
    }

    function item_onclick(entry, path) {
      if (fs.selected.entry) {
        toggle_item_select(fs.selected.entry, false);
        fs.selected.entry.classList.remove("fs_selection");
      }
      var file = fs.root.get(path);
      file_fn(file, path);
      fs.file_ctl.classList.remove("undisplayed");
      fs.dir_ctl.classList.remove("undisplayed");
      switch (file.type) {
      case "f": fs.dir_ctl.classList.add("undisplayed"); break;
      case "d": fs.file_ctl.classList.add("undisplayed"); break;
      }
      fs.selected.entry = entry;
      fs.selected.path = path;
      entry.classList.add("fs_selection");
      toggle_item_select(fs.selected.entry, true);
    }

    function basename(path) {
      return path.match(/[^/]*$/)[0];
    }

    function file_icon(file, path) {
      var icon = document.createElement("img");
      icon.className = "fs_icon";
      if (file.type === "d") {
        icon.src = "web/folder_open.png";
      } else if (path.match(/\.html$/))
        icon.src = "web/html.png";
      else if (path.match(/\.shen$/))
        icon.src = "web/shen_source.png";
      else
        icon.src = "web/document.png";
      return icon;
    }

    function oncreate_dir(file, path, entry) {
      entry.classList.add("fs_entry", "fs_dir_entry");
      var name = document.createElement("div");
      name.className = "fs_name";
      name.onclick = function() {item_onclick(entry, path);};
      var name_text = document.createElement("span");
      name_text.className = "fs_name_text";
      name_text.appendChild(document.createTextNode(basename(path) + "/"));
      var subdir = document.createElement("ul");
      var icon = file_icon(file, path);
      icon.onclick = function() {return dir_onclick_icon(icon, subdir);};
      name.appendChild(icon);
      name.appendChild(name_text);
      entry.appendChild(name);
      entry.appendChild(subdir);
      file.oncreate_child = mkoncreate_child(subdir);
    }

    function oncreate_file(file, path, entry) {
      entry.classList.add("fs_entry", "fs_file_entry");
      var name = document.createElement("div");
      name.className = "fs_name";
      name.onclick = function() {item_onclick(entry, path);};
      var name_text = document.createElement("span");
      name_text.className = "fs_name_text";
      name_text.appendChild(document.createTextNode(basename(path)));
      name.appendChild(file_icon(file, path));
      name.appendChild(name_text);
      entry.appendChild(name);
    }

    function mkoncreate_child(container) {
      function fn(file, path) {
        var entry = document.createElement("li");
        container.appendChild(entry);
        switch (file.type) {
        case "d": oncreate_dir(file, path, entry); break;
        case "f": oncreate_file(file, path, entry); break;
        }
        file.onrm = mkonrm(entry);
      }
      return fn;
    }

    function mkonrm(container) {
      return function() {
        container.parentNode.removeChild(container);
      };
    }

    init_handle();

    fs.dir = document.getElementById("fs_tree");
    fs.file_ctl = init_file_ctl(document.getElementById("file_ctl"));
    fs.dir_ctl = init_dir_ctl(document.getElementById("dir_ctl"));
    oncreate_dir(this.root, "", fs.dir);
  };
  shen_web.fs = fs;
})();
