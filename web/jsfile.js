function Jsfile(name, type, parent) {
  if (!(this instanceof Jsfile))
    return new Jsfile(name, type, parent);
  var keys = ["oncreate", "onrm", "onwrite"], files;

  this.name = name = name || "";
  this.type = type;
  this.parent = parent;

  this.toString = function() {
    return "[object Jsfile " + (this.name || "/") + "]";
  };

  switch (type) {
  case "d":
    files = {};
    this.get_file = function(name) {return files[name];};
    this.add = function(file) {files[file.name] = file;};
    this.detach_file = function(name) {delete files[name];};
    this.mkdir = mkdir;
    break;
  case "f":
    this.contents = null;
    this.get_file = function() {return null;};
    this.add = function() {return null;};
    this.mkdir = function() {return null;};
    this.set_contents = function(x) {
      this.contents = ensure_array(x);
      if (this.onwrite)
        this.onwrite();
    };
    break;
  }

  this.path = function() {
    return (parent) ? (parent.path() + "/" + name) : name;
  };

  this.get = function(path) {
    path = split_path(path);
    if (path.length === 1 && path[0] === "")
      return this;
    var file = this;
    for (var i = 0; i < path.length && file; ++i)
      file = file.get_file(path[i]);
    return (i >= path.length) ? file : null;
  };

  this.put = function(data, path) {
    path = split_path(path);
    var file = this.get(path);
    if (!file)
      file = Jsfile(basename(path), "f", this.mkdir(dirname(path)));
    file.set_contents(data);
    return file;
  };

  this.rm = function(path) {
    if (path) {
      var file = this.get(path);
      if (file)
        file.rm();
      return;
    }
    if (type === "d") {
      var fnames = Object.keys(files), n = fnames.length, i;
      for (i = 0; i < n; ++i)
        files[fnames[i]].rm();
    }
    if (this.onrm)
      this.onrm();
    if (this.parent)
      this.parent.detach_file(this.name);
  };

  this.walk = function(fn, context, name, parent, path) {
    name = name || "";
    path = path || "";
    if (name)
      path = path + "/" + name;
    var x = fn({file: this, name: name, path: path, parent: parent}, context);
    if (this.type === "d")
      for (var i in files)
        files[i].walk(fn, x, i, this, path);
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

  function mkdir(path) {
    path = split_path(path);
    var file = this, i, sub;
    for (i = 0; i < path.length; ++i) {
      sub = file.get_file(path[i]);
      if (!sub)
        sub = Jsfile(path[i], "d", file);
      file = sub;
    }
    return (i >= path.length) ? file : null;
  }

  function basename(path) {
    return path[path.length - 1];
  }

  function dirname(path) {
    return path.slice(0, path.length - 1);
  }

  function split_path(path) {
    if (!path)
      return [""];
    if (typeof(path) === "string")
      return path.replace(/\/\/*/g, "/").replace(/^\//, "").replace(/\/$/, "")
                 .split("/");
    return path;
  }

  function bytes_from_str(str) {
    return shen.utf8_from_str(str);
  }

  function str_from_bytes(arr) {
    return shen.str_from_utf8(arr);
  }

  this.str = function() {
    return str_from_bytes(this.contents);
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

  if (parent) {
    for (var i = 0; i < keys.length; ++i) {
      var key = keys[i];
      this[key] = parent[key];
    }
    parent.add(this);
  }
  if (this.oncreate)
    this.oncreate();
}
