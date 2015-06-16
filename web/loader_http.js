shen_web.plugins.push(function(done) {
  var match_re = /^(http|https):\/\/./;
  function load(name, dir, vm) {
    switch (dir.str) {
    case "out":
      return vm.error("open: writing files via http is not supported");
    case "in":
      // Let's hope that resource have CORS enabled
      shen_web.xhr({
                     url: name,
                     responseType: "arraybuffer",
                   }, function(data) {
        vm.resume(vm.buf_stream(data));
      }, function(err) {
        console.log("http loader err:", err);
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
