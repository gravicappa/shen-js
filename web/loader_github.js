shen_web.init_github_loader = function() {
  var match_re = /^(http|https):\/\/github\.com\/./,
      path_re = /^(http|https):\/\/github\.com\/([^/]*\/[^/]*)\/(.*)$/;

  function api_url(name) {
    var p = name.match(path_re);
        repo = p[2].replace(/\/\/*/g, "/"),
        path = p[3].replace(/\/\/*/g, "/");
    return "https://api.github.com/repos/" + repo + "/contents/" + path;
  }

  function load(name, dir, vm) {
    switch (dir.str) {
    case "out":
      return vm.error("open: writing files to github is not supported");
    case "in":
      shen_web.xhr({
                     url: api_url(name),
                     responseType: "arraybuffer",
                     req_headers: {"Accept": "application/vnd.github.3.raw"}
                   }, function(data) {
        vm.resume(vm.buf_stream(data));
      }, function(err) {
        console.log("github err", err);
        vm.resume(new Error("open: Unable to load file " + name));
      });
      vm.interrupt();
      break;
    default: return vm.error("open: unsupported flags");
    }
  }
  shen_web.fs.loaders.push(shen_web.fs.mk_match_loader(match_re, load));

  shen_web.test_github_load = function(path) {
    var out = document.getElementById("out");
    out.innerHTML = "";
    shen_web.xhr({
                   url: api_url(path),
                   responseType: "arraybuffer",
                   req_headers: {"Accept": "application/vnd.github.3.raw"}
                 }, function(data) {
      var s = shen.str_from_utf8(new Uint8Array(data));
      console.log("loaded", data, s);
      out.appendChild(document.createTextNode(s));
    }, function(err) {
      console.log("github err", err);
      var e = document.createElement("div");
      e.className = "wait_error";
      e.appendChild(document.createTextNode(err));
      out.appendChild(e);
    });
  };
};
