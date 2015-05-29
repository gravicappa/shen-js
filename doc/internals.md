# Shen-js internals
## Translating to Javascript
There are several function for translating from different kind of source data
to Javascript code:

    (js.from-file Filename)
    (js.from-files List-of-filenames)
    (js.from-string String)
    (js.from-shen List-of-Shen-code)
    (js.from-kl List-of-Kl-code)
    (js.save-from-files List-of-filenames Target-filename)

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
