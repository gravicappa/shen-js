Shen_fs_html5 = {
  files: [],
  files_cnt: 0,
  bufsize: 65536,

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

    arg.io.open = Shen_fs_html5.open
  },

  add_file: function(name, data) {
    var f = this.files["/" + name]
    var id
    if (f) {
      id = f.id
      this.rm(name)
    } else
    id = this.files_cnt++
    this.files["/" + name] = {
      id: id,
      name: name,
      data: data,
      buf: "",
      bufsize: this.bufsize
    }

    var fs = document.getElementById("shenjs_fs")
    if(!fs)
      return
    var row = document.createElement("tr")
    row.id = "shenjs_fs_" + id

    var td_name = document.createElement("td")
    var f = document.createElement("a")
    f.id = "shenjs_fs_data_" + id
    f.href = "data:application/octet-stream;base64," + btoa(data)
    f.download = name
    f.appendChild(document.createTextNode("/" + name))
    td_name.appendChild(f)

    var td_rm = document.createElement("rm")
    var rm = document.createElement("button")
    rm.appendChild(document.createTextNode("del"))
    rm.onclick = (function() {Shen_fs_html5.rm(name)})
    td_rm.appendChild(rm)

    row.appendChild(td_name)
    row.appendChild(td_rm)
    fs.appendChild(row)
  },

  rm: function(name) {
    var f = this.files["/" + name]
    if (!f)
      return
    this.files["/" + name] = undefined
    var item = document.getElementById("shenjs_fs_" + f.id)
    item.parentNode.removeChild(item)
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
      reader.readAsBinaryString(f)
    }
  },

  get_file_entry: function(name) {
    var f = this.files["/" + name]
    if (!f)
      return null
    var item = document.getElementById("shenjs_fs_data_" + f.id)
    if (!item)
      return null
    return item
  },

  cat: function(name) {
    var f = this.get_file_entry(name)
    if (!f)
      throw("File '" + name + "' does not exist")
    return atob(f.href.substring(f.href.indexOf(",") + 1))
  },

  append_file: function(name, data) {
    var f = this.get_file_entry(name)
    if (!f)
      return ""
    var d = atob(f.href.substring(f.href.indexOf(",") + 1)) + data
    f.href = "data:application/octet-stream;base64," + btoa(d)
  },

  close: function(name) {
    var f = this.files["/" + name]
    if (!f)
      return
    Shen_fs_html5.append_file(name, f.buf)
  },

  write: function(name, data) {
    var f = this.files["/" + name]
    if (!f)
      return ""
    f.buf += data
    if (f.buf.length >= f.bufsize) {
      Shen_fs_html5.append_file(name, f.buf)
      f.buf = ""
    }
  },

  open: function(type, name, dir) {
    if (type[1] != "file")
      return Shen.fail_obj
    var filename = Shen.globals["*home-directory*"] + name
    if (dir[1] == "in") {
      try {
        var s = Shen_fs_html5.cat(filename)
      } catch(e) {
        Shen.error(e)
        return Shen.fail_obj
      }
      var stream = [Shen.type_stream_in, null, function(){}]
      stream[1] = (function() {
        return Shen.file_instream_get(stream, s, 0)
      })
      return stream
    } else if (dir[1] == "out") {
      Shen_fs_html5.add_file(name, "")
      var s = [Shen.type_stream_out, null, null]
      s[1] = (function(byte) {
        Shen_fs_html5.write(name, String.fromCharCode(byte))
      })
      s[2] = (function() {Shen_fs_html5.close(name)})
      return s
    }
    Shen.error("Unsupported open flags")
    return Shen.fail_obj
  }
}
