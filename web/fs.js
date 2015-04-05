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
    return Shen.utf8_from_str(str);
  }

  function str_from_bytes(arr) {
    return Shen.str_from_utf8(arr);
  }

  this.str_data = function() {
    return str_from_bytes(this.data);
  };

  function ensure_array(x) {
    if (x instanceof Uint8Array)
      return x;
    if (typeof(x) === "string")
      return new Uint8Array(bytes_from_str(x));
    if (x instanceof Array)
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

Shen_web_fs = {
  root: new Jsfile("d"),
  selected: {},

  fake: function(root) {
    root.mkdir("one/two/three");
    root.mkdir("one/four");
    root.put("one/two/five", "one hundred and twenty five");
    root.put("one/two/three/six", "one thousand two hundreds and thirty six");
    root.put("one/two/three/seven", "one thousand two hundreds and thirty seven");
    root.mkdir("one/four/");
    root.put("one/four/eight", "one hundred and forty eight");
  },

  fake2: function(root) {
    root.put(".doc/repl", "one hundred and twenty five");
    root.put(".lessons/01/repl.shen", "one hundred and twenty five");
    root.put(".lessons/01/basics.shen", "one hundred and twenty five");
    root.put(".lessons/01/expr.shen", "one hundred and twenty five");
    root.put("one/two/three/six", "one thousand two hundreds and thirty six");
    root.put("one/two/three/seven", "one thousand two hundreds and thirty seven");
    root.mkdir("one/four/");
    root.put("one/four/eight", "one hundred and forty eight");
  },

  mk: function(div, file_fn) {
    var fs = this;

    function img_btn(title, icon) {
      var btn = document.createElement("button");
      btn.className = "shenfs_ctl_btn shenfs_ctl_icon_btn";
      btn.title = title;
      var img = document.createElement("img");
      img.src = icon;
      btn.appendChild(img);
      return btn;
    }

    function ctl_rm(path) {
      var btn = img_btn("Delete", "web/rm.png");
      btn.className += " shenfs_ctl_rm_btn";
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
        btn = img_btn("Create file", "web/new.png");
        btn.className += " shenfs_ctl_mk_btn";
        btn.onclick = mkfile_dlg("Enter file name", function(path) {
          fs.root.put(path, "");
        });
        break;
      case "d":
        btn = img_btn("Create dir", "web/folder_new.png");
        btn.className += " shenfs_ctl_mk_btn";
        btn.onclick = mkfile_dlg("Enter directory name", function(path) {
          fs.root.mkdir(path);
        });
        break;
      }
      return btn;
    }

    function ctl_upload() {
      var btn = img_btn("Upload file", "web/up.png");
      btn.className += " shenfs_ctl_upload_btn";
      return btn;
    }

    function ctl_download() {
      var btn = img_btn("Download file", "web/down.png");
      btn.className += " shenfs_ctl_download_btn";
      return btn;
    }

    function file_ctl() {
      var ctl = document.createElement("div");
      ctl.className = "shenfs_ctl shenfs_file_ctl";
      ctl.appendChild(ctl_upload());
      ctl.appendChild(ctl_download());
      ctl.appendChild(ctl_rm());
      return ctl;
    }

    function dir_ctl() {
      var ctl = document.createElement("div");
      ctl.className = "shenfs_ctl shenfs_dir_ctl";
      ctl.appendChild(ctl_new("f"));
      ctl.appendChild(ctl_new("d"));
      ctl.appendChild(ctl_rm());
      return ctl;
    }

    function dir_onclick_icon(icon, contents) {
      switch (contents.style.display) {
      case "none":
        icon.src = "web/folder_open.png";
        contents.style.display = "block";
        break;
      default:
        icon.src = "web/folder.png";
        contents.style.display = "none";
      }
      return true;
    }

    function item_onclick(entry, path) {
      file_fn(fs.root, path);
      if (fs.selected.entry)
        Shen_web.rm_class("shenfs_selection", fs.selected.entry);
      var file = fs.root.get(path);
      switch (file.type) {
      case "f":
        fs.dir_ctl.style["display"] = "none";
        fs.file_ctl.style["display"] = "block";
        break;
      case "d":
        fs.dir_ctl.style["display"] = "block";
        fs.file_ctl.style["display"] = "none";
        break;
      }
      fs.selected.entry = entry;
      fs.selected.path = path;
      entry.className += " shenfs_selection";
    }

    function basename(path) {
      return path.match(/[^/]*$/)[0];
    }

    function file_icon(file, path) {
      var icon = document.createElement("img");
      icon.className = "shenfs_icon";
      if (file.type === "d")
        icon.src = "web/folder_open.png";
      else if (path.match(/\.shen$/))
        icon.src = "web/shen_source.png";
      else
        icon.src = "web/document.png";
      return icon;
    }

    function oncreate_dir(file, path, entry) {
      entry.className += " shenfs_dir_entry";
      var name = document.createElement("div");
      name.className = "shenfs_dir_name";
      name.onclick = function() {item_onclick(entry, path);};
      var name_text = document.createElement("span");
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
      entry.className += " shenfs_file_entry";
      var name = document.createElement("div");
      name.className = "shenfs_file_name";
      name.onclick = function() {item_onclick(entry, path);};
      var name_text = document.createElement("span");
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

    var dir = document.createElement("div");
    dir.className += " shenfs";
    div.appendChild((fs.file_ctl = file_ctl()));
    div.appendChild((fs.dir_ctl = dir_ctl()));
    fs.file_ctl.style["display"] = "none";
    div.appendChild(dir);
    oncreate_dir(this.root, "", dir);
  },
};
