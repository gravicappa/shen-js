Shen_fs_html5 = {
  init: function(arg) {
    var div = document.getElementById(arg.div)
    if (div == null)
      return
    div.style.visibility = "visible"
    div.innerHTML = ""

    var title = document.createElement("div")
    title.id = "shenjs_fs_title"
    title.appendChild(document.createTextNode("Filesystem"))

    var help = document.getElementById("shenjs_repl_help")
    var help_items = [
      "Click on button below to add file to filesystem",
      "Click on file to save to local drive"
    ]
    if (help)
      for (var i = 0; i < help_items.length; ++i) {
        var helpi = document.createElement("li")
        helpi.appendChild(document.createTextNode(help_items[i]))
        help.appendChild(helpi)
      }
    var input = document.createElement("input")
    input.name = "dir[]"
    input.type = "file"
    input.multiple = 1
    input.addEventListener('change', this.onchange);

    var fs = document.createElement("table")
    fs.id = "shenjs_fs"

    div.appendChild(title)
    div.appendChild(input)
    div.appendChild(fs)

    arg.io.open = this.open
  },

  add_file: function(name, data) {
    this.fs.create(name, data)
    var fsdiv = document.getElementById("shenjs_fs")
    if(!fsdiv)
      return
    var row = document.createElement("tr")
    var id = btoa(name)
    row.id = "shenjs_fs_" + id

    var td_name = document.createElement("td")
    var f = document.createElement("a")
    f.id = "shenjs_fs_data_" + id
    f.href = "javascript:void(0)"
    var t = this
    f.onclick = (function() {t.download_file(name)});
    f.appendChild(document.createTextNode(name))
    td_name.appendChild(f)

    var td_rm = document.createElement("rm")
    td_rm.id = "shenjs_fs_rm"
    var rm = document.createElement("button")
    rm.appendChild(document.createTextNode("del"))
    rm.onclick = (function() {t.rm(name)})
    td_rm.appendChild(rm)

    row.appendChild(td_name)
    row.appendChild(td_rm)
    fsdiv.appendChild(row)
  },

  rm: function(name) {
    this.fs.rm(name)
    var item = document.getElementById("shenjs_fs_" + btoa(name))
    item.parentNode.removeChild(item)
  },

  download_file: function(name) {
    var data = this.fs.cat(name)
    try {
      var blob = new Blob([data], {type: "application/octet-stream"})
    } catch (e) {
      window.BlobBuilder = window.BlobBuilder
                           || window.MozBlobBuilder
                           || window.WebKitBlobBuilder
                           || window.MSBlobBuilder
      var bb = new BlobBuilder()
      bb.append(data.buffer)
      var blob = bb.getBlob("application/octet-stream")
    }
    window.URL = window.URL || window.webkitURL
    var url = URL.createObjectURL(blob)
    var a = document.createElement("a")
    a.href = url
    a.download = name
    if (document.createEvent) {
      var ev = document.createEvent("MouseEvents")
      ev.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0, false,
                        false, false, false, 0, null)
      a.dispatchEvent(ev)
    } else if (el.click)
      a.click()
    setTimeout(function (){URL.revokeObjectURL(url)}, 100)
  },

  onchange: function(ev) {
    ev.stopPropagation()
    ev.preventDefault()
    var files = ev.target.files || ev.target.webkitEntries;
    for (var i = 0, f; f = files[i]; ++i) {
      var reader = new FileReader()
      reader.onload = (function (f) {
        return function(e) {Shen_fs_html5.add_file(f.name, e.target.result)}
      })(f)
      reader.readAsArrayBuffer(f)
    }
  },

  write_byte: function(name, byte) {
    this.fs.write_bytes(name, [byte])
  },

  open: function(name, dir) {
    var filename = Shen.globals["*home-directory*"] + name
    if (dir[1] == "in") {
      try {
        var array = Shen_fs_html5.fs.cat(filename)
      } catch(e) {
        Shen.error(e)
        return Shen.fail_obj
      }
      var stream = [Shen.type_stream_in, null, function(){}]
      stream[1] = (function() {
        return Shen.file_instream_get_buf(stream, array, 0)
      })
      return stream
    } else if (dir[1] == "out") {
      Shen_fs_html5.add_file(filename, "")
      var s = [Shen.type_stream_out, null, null]
      var fs = Shen_fs_html5.fs
      fs.create(filename)
      s[1] = (function(byte) {fs.write_bytes(filename, [byte])})
      s[2] = (function() {})
      return s
    }
    Shen.error("Unsupported open flags")
    return Shen.fail_obj
  },

  fs : {
    files : {},
    create: function(name, data) {
      var f = this.files[name]
      if (f)
        this.rm(name)
      this.files[name] = {data: null}
      if (data)
        this.write_bytes(name, data)
    },

    rm: function(name) {delete this.files[name]},

    write_bytes: function(name, bytes) {
      var f = this.files[name]
      if (!f)
        throw("File '" + name + "' does not exist")
      if (f.data) {
        var newdata = new Uint8Array(f.data.length + bytes.length)
        newdata.set(f.data, 0)
        newdata.set(bytes, f.data.length)
      } else {
        var newdata = new Uint8Array(bytes)
      }
      this.files[name].data = newdata
    },

    cat: function(name) {
      var f = this.files[name]
      if (!f)
        throw("File '" + name + "' does not exist")
      return f.data
    }
  }
}
