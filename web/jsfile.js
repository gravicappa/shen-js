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
        throw new Error("Jsfile.put: Directory " + path.join("/")
                        + " already exists");
      file.data = ensure_array(data);
    } else {
      file = new Jsfile("f", ensure_array(data), this.on);
      dir.data[name] = file;
      if (dir.oncreate_child)
        dir.oncreate_child(file, path.join("/"));
    }
    return file;
  };

  this.append = function(data) {
    if (this.type !== "f")
      throw new Error("Jsfile.append: not a file");
    var d = ensure_array(data);
    var n = new Uint8Array(this.data.byteLength + d.byteLength);
    n.set(this.data, 0);
    n.set(d, this.data.byteLength);
    this.data = n;
  };

  this.is_empty = function() {
    return !data.length;
  };

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
