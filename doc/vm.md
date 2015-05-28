# Some Shen-js VM tricks
## Interrupting vm
Shen-js vm can be stopped at some point of time and resumed later. It can be
useful when dealing with asynchronous Javascript tasks:

    shen.defun("xml-http-req", function(arg) {
      this.interrupt();
      var vm = this;
      xml_http_req(function ondone(result) {
        vm.resume(result);
      }, function onerr(err) {
        vm.resume(vm.fail_obj);
      });
    );

To be used like

    (let Data (xml-http-req Url)
      (if (= Data (fail))
          (error "Request failed")
          (process-response Data)))
