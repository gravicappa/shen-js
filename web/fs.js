shen_web.init_fs = function(file_fn) {
  shen_web.set_init_status("Initializing filesystem");
  var fs = {};
  fs.root = new Jsfile(null, "d");
  fs.selected = null;
  fs.items = {};

  window.BlobBuilder = window.BlobBuilder
                       || window.MozBlobBuilder
                       || window.WebKitBlobBuilder
                       || window.MSBlobBuilder;

  fs.download = function(file) {
    if (!file || file.type !== "f")
      return;
    try {
      var b = new Blob([file.contents], {type: "application/octet-stream"});
    } catch (e) {
      var bb = new window.BlobBuilder();
      bb.append(file.contents.buffer);
      var b = bb.getBlob("application/octet-stream");
    }
    window.URL = window.URL || window.webkitURL;
    var url = window.URL.createObjectURL(b);
    var a = document.createElement("a");
    a.style["display"] = "none";
    a.target = "_blank";
    a.href = url;
    a.download = file.path().match(/[^/]*$/)[0];
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
    var fs = this;
    var reader = new FileReader();
    reader.onload = function(e) {
      fs.root.put(e.target.result, path);
    };
    reader.readAsArrayBuffer(file);
  };

  fs.upload = function(path, multiple, fn) {
    var fs = this;
    shen_web.dialog({
      title: "Upload",
      oncreate: function(content, ctl, close) {
        var text = document.createElement("div"),
            input = document.createElement("input"),
            msg;
        text.className = "dlg_msg";
        input.type = "file";
        msg = "Choose a file to upload";
        if (multiple) {
          msg = "Choose file(s) to upload";
          input.directory = input.webkitdirectory = input.multiple = true;
        }
        text.appendChild(document.createTextNode(msg));
        input.onchange = function(ev) {
          var files = ev.target.files || ev.target.webkitEntries;
          fn(files);
          close();
        };
        content.appendChild(text);
        content.appendChild(input);
      }
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

  fs.loaders = [];

  fs.find_loader = function(name) {
    var hs = this.loaders, f;
    for (i = hs.length - 1; i >= 0; --i) {
      f = hs[i](name);
      if (f)
        return f;
    }
    return null;
  };

  fs.mk_match_loader = function(re, fn) {
    return function(name) {
      return (name.match(re)) ? fn : null;
    };
  };

  fs.deploy = function deploy_fs(url, fn) {
    function load_index(fn) {
      shen_web.xhr({url: url, responseType: "text"}, function(data) {
        var obj = [];
        try {
          obj = JSON.parse(data);
        } catch(err) {
          console.log("fs.deploy", url, "parse error:", err);
        }
        fn(obj);
      }, function(err) {
        console.log("fs.deploy", url, "error:", err);
        fn([]);
      });
    }

    function load_files(entries, i, fn) {
      if (i < entries.length) {
        var entry = entries[i], from = entry.from, to = entry.to;
        if (from && to) {
          shen_web.xhr({url: from, responseType: "arraybuffer"},
                       function(data) {
            shen_web.fs.root.put(data, to);
            load_files(entries, i + 1, fn);
          }, function(err) {
            console.log("fs.deploy entry err", err);
            load_files(entries, i + 1, fn);
          });
        } else
          load_files(entries, i + 1, fn);
      } else
        fn();
    }

    load_index(function(index) {
      load_files(index, 0, function() {
        if (fn)
          fn();
      });
    });
  };

  function mk_file_dlg(dir, type) {
    if (!dir || dir.type !== "d")
      return;
    var fn, opts = {
      onpositive: function(name) {
        var path = dir.path() + "/" + name;
        if (!fs.root.get(path))
          fn(path);
      }
    };
    switch (type) {
    case "f":
      opts.action_text = "Create file";
      opts.label = "File name:";
      fn = function(path) {fs.root.put("", path);};
      break;
    case "d":
      opts.action_text = "Create directory";
      opts.label = "Directory name:";
      fn = function(path) {fs.root.mkdir(path);};
      break;
    }
    shen_web.prompt(opts);
  }

  function rm_dlg(file) {
    if (!file) 
      return;
    var path = file.path(), opts = {
      action_text: "Remove",
      text: "Remove '" + path + "'?",
      onpositive: function() {file.rm();}
    };
    if (!file.parent)
      opts.text = "Remove whole filesystem contents?";
    shen_web.confirm(opts);
  }

  var rm_btn_def = {
    title: "Delete",
    icon: "web/rm.png",
    onclick: function() {rm_dlg(fs.selected);}
  };

  function init_file_ctl(div) {
    return shen_web.toolbar(div, [
      {
        title: "Download file",
        icon: "web/download.png",
        onclick: function() {
          if (fs.selected)
            fs.download(fs.selected);
        }
      },
      rm_btn_def
    ]);
  }

  function init_dir_ctl(div) {
    return shen_web.toolbar(div, [
      {
        title: "Create file",
        icon: "web/new.png",
        onclick: function() {mk_file_dlg(fs.selected, "f");}
      },
      {
        title: "Create dir",
        icon: "web/folder_new.png",
        onclick: function() {mk_file_dlg(fs.selected, "d");}
      },
      {
        title: "Upload file",
        icon: "web/upload.png",
        onclick: function() {
          if (fs.selected && fs.selected.type === "d")
            fs.upload_to(fs.selected.path());
        }
      },
      rm_btn_def,
    ]);
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

  fs.select = function(file, call_event) {
    if (fs.selected) {
      toggle_item_select(fs.selected.container, false);
      fs.selected.container.classList.remove("fs_selection");
    }
    if (typeof(file) === "string")
      file = fs.root.get(file);
    if (!file)
      return;
    if (call_event === undefined || call_event)
      file_fn(file, file.path());
    fs.file_ctl.classList.remove("undisplayed");
    fs.dir_ctl.classList.remove("undisplayed");
    switch (file.type) {
    case "f": fs.dir_ctl.classList.add("undisplayed"); break;
    case "d": fs.file_ctl.classList.add("undisplayed"); break;
    }
    fs.selected = file;
    file.container.classList.add("fs_selection");
    toggle_item_select(fs.selected.container, true);
  };

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

  function mk_entry_name(file) {
    var name = document.createElement("div"),
        name_text = document.createElement("span"),
        icon = file_icon(file, file.name),
        caption = file.parent ? file.name : "Filesystem";

    if (file.type === "d") {
      icon.onclick = function(ev) {
        ev.stopPropagation();
        var subdir = shen_web.by_class("fs_dir", file.container)[0];
        return dir_onclick_icon(icon, subdir);
      };
    }

    name.className = "fs_name";
    name.onclick = function() {fs.select(file);};
    name_text.className = "fs_name_text";
    name_text.appendChild(document.createTextNode(caption));
    name.appendChild(icon);
    name.appendChild(name_text);
    return name;
  }

  function oncreate_dir(file) {
    file.container.classList.add("fs_entry", "fs_dir_entry");
    var subdir = document.createElement("ul");
    subdir.className = "fs_dir";
    file.container.appendChild(mk_entry_name(file));
    file.container.appendChild(subdir);
  }

  function oncreate_file(file) {
    file.container.classList.add("fs_entry", "fs_file_entry");
    file.container.appendChild(mk_entry_name(file));
  }

  function attach_sorted(entry, container) {
    var items = container.childNodes, n = items.length, i,
        name = entry.shen_file.name;
    for (i = 0; i < n; ++i) {
      var item = items[i];
      if (item.shen_file && item.shen_file.name > name)
        break;
    }
    if (i < n)
      container.insertBefore(entry, item);
    else
      container.appendChild(entry);
  }

  function oncreate() {
    var entry = document.createElement("li");
    this.container = entry;
    entry.shen_file = this;
    switch (this.type) {
    case "d":
      oncreate_dir(this);
      shen_web.store.mkdir(this.path());
      break;
    case "f":
      oncreate_file(this);
      shen_web.store.touch(this.path());
      break;
    }
    if (this.parent) {
      var container = shen_web.by_tag("ul", this.parent.container);
      attach_sorted(entry, container);
    }
  }

  function onrm() {
    var call_event;
    if (this === fs.selected)
      fs.select(this.parent ? this.parent : fs.root, (call_event = false));
    if (this.parent)
      this.container.parentNode.removeChild(this.container);
    shen_web.store.rm(this.path());
  }

  function onwrite() {
    shen_web.store.put(this.path(), this.type, this.contents);
  }

  init_handle();

  fs.dir = document.getElementById("fs_tree");
  fs.file_ctl = init_file_ctl(document.getElementById("file_ctl"));
  fs.dir_ctl = init_dir_ctl(document.getElementById("dir_ctl"));
  fs.root.oncreate = oncreate;
  fs.root.onwrite = onwrite;
  fs.root.onrm = onrm;
  fs.root.container = fs.dir;
  oncreate_dir(fs.root, "");
  this.fs = fs;
};
