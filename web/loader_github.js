shen_web.plugins.push(function(done) {
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
  done();
});
