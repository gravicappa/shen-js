shen_web.init_store = function(done) {
  var fsdb = {},
      idb = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB
            || window.OIndexedDB || window.msIndexedDB,
      ver = 1;

  function on(r, fn) {
    r[fn.name] = fn;
    return r;
  }

  function onreq(req) {
    for (var i = 1; i < arguments.length; ++i) {
      var fn = arguments[i];
      req[fn.name] = fn;
    }
    return req;
  }

  function with_db(self, fn) {
    if (self.db)
      fn.call(self);
    else
      return self.open(function(err) {fn.call(self, err);});
  }

  function get_store(self, access) {
    var trans = self.db.transaction(["fs"], access);
    return trans.objectStore("fs");
  }

  fsdb.open = function(done) {
    done = done || function() {};
    var self = this;
    if (idb)
      onreq(idb.open("shen", ver),
            function onsuccess(e) {
              self.db = e.target.result;
              done();
            },
            function onerror(err) {
              console.log("IndexedDB error", err);
              done(err);
            },
            function onupgradeneeded(e) {
              var db = e.target.result;
              if (!db.objectStoreNames.contains("fs")) {
                var store = db.createObjectStore("fs", {keyPath: "name"});
                store.createIndex("name", "name", {unique: true});
              }
            });
    else {
      console.log("IndexedDB is not supported");
      done();
    }
  };

  fsdb.deploy = function(done) {
    done = done || function() {};
    with_db(this, function(err) {
      var store = get_store(this, "readonly"),
          keys = [],
          root = shen_web.fs.root;
      onreq(store.index("name").openCursor(),
            function onsuccess(e) {
              var cur = e.target.result;
              if (cur) {
                switch(cur.value.type) {
                case "d": root.mkdir(cur.value.name); break;
                case "f": root.put(cur.value.data, cur.value.name); break;
                }
                cur.continue();
              } else {
                done();
              }
            },
            function onerror(e) {
              done(e);
            });
    });
  }

  fsdb.put = function(name, type, data, done) {
    done = done || function() {};
    if (idb)
      with_db(this, function(err) {
        var store = get_store(this, "readwrite"),
            file = {name: name, type: type, data: data};
        onreq(store.put(file),
              function onsuccess() {done();},
              function onerror(e) {done(e);});
      });
    else
      done();
  };

  fsdb.mkdir = function(name, done) {
    return fsdb.put(name, "d", null, done);
  };

  fsdb.touch = function(name, done) {
    return fsdb.put(name, "f", "", done);
  };

  fsdb.get = function(name, done) {
    done = done || function() {};
    if (idb)
      with_db(this, function(err) {
        var store = get_store(this, "readonly");
        onreq(store.get(name),
              function onsuccess(e) {
                var res = e.target.result;
                console.log("get res", res);
                done(res);
              },
              function onerror(e) {
                console.log("get err", e);
                done(null, e);
              });
      });
    else
      done();
  };

  fsdb.rm = function(name, done) {
    done = done || function() {};
    if (idb)
      with_db(this, function(err) {
        console.log("rm", err);
        var store = get_store(this, "readwrite");
        onreq(store.delete(name),
              function onsuccess() {done();},
              function onerror(e) {done(e);});
      });
    else
      done();
  };

  shen_web.store = fsdb;
  shen_web.store.deploy(done);
};
