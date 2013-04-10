Shen_html_repl = {
  buf: "",
  ctrl_enter_to_send: 0,

  io: {
    gets: function() {
      if (Shen_html_repl.buf.length <= 0)
        return -1
      var s = Shen_html_repl.buf
      Shen_html_repl.buf = ""
      return s
    },
    puts: function(s) {
      var out = document.getElementById("shenjs_repl_out")
      if (out == null)
        return
      do {
        var pos = s.indexOf("\n")
        if (pos < 0)
          out.appendChild(document.createTextNode(s))
        else {
          out.appendChild(document.createTextNode(s.substring(0, pos)))
          out.appendChild(document.createElement("br"))
          s = s.substring(pos + 1)
        }
      } while (pos >= 0)
    },
    open: function(type, name, dir) {
      Shen.error("File access is unsupported")
      return Shen.fail_obj
    },
    init: function() {
      var fout = [Shen.type_stream_out, null, null]
      fout[1] = (function(byte) {
        return Shen.repl_write_byte(byte)
      })
      fout[2] = (function() {})
      Shen.globals["*stoutput*"] = fout

      var fin = [Shen.type_stream_in, null, null]
      fin[1] = (function() {
        return Shen.repl_read_byte(fin, Shen_html_repl.io.gets(), 0)
      })
      fin[2] = (function() {})

      var finout = [Shen.type_stream_inout, fin, fout]
      Shen.globals["*stinput*"] = finout
    }
  },

  start: function() {
    document.getElementById("shenjs_repl_out").innerHTML = ""

    Shen.init({io: Shen_html_repl.io})
    Shen.globals["*implementation*"] = "html5"
    Shen.call_by_name("shen.credits", [])
    Shen.call_by_name("shen.initialise_environment", [])
    Shen.call_by_name("shen.prompt", [])

    var input_pane = document.getElementById("shenjs_repl_input_pane")
    input_pane.style.visibility = "visible"
    var input = document.getElementById("shenjs_repl_in")
    input.disabled = false
    input.focus()
  },

  implode: function(list) {
    var ret = ""
    while (list.length == 3 && list[0] == Shen.type_cons) {
      ret += String.fromCharCode(list[1])
      list = list[2]
    }
    return ret
  },

  is_empty: function(s) {
    var n = s.length, i
    var space = " ".charCodeAt(0)
    for (i = 0; i < n ; ++i)
      if (s.charCodeAt(i) > space)
        return false
    return true
  },

  consume_line: function(s) {
    var buf, rest, bytes, x
    Shen_html_repl.buf += s

    while (1) {
      buf = Shen_html_repl.buf
      bytes = []
      for (var i = buf.length - 1; i >= 0; --i)
        bytes = [Shen.type_cons, buf.charCodeAt(i), bytes]
      x = Shen.call_by_name("shenjs.repl-split-input", [bytes])
      if (x.length != 3 || x[0] != Shen.fns["shen.tuple"])
        break
      Shen_html_repl.buf = Shen_html_repl.implode(x[1])
      Shen.io.puts(Shen_html_repl.buf + "\n")
      buf = Shen_html_repl.implode(x[2])
      try {
        Shen.call_by_name("shen.read-evaluate-print", [])
      } catch (e) {
        Shen.io.puts(Shen.error_to_string(e))
      }
      if (Shen_html_repl.is_empty(buf)) {
        Shen_html_repl.buf = ""
        break
      }
      Shen_html_repl.buf = buf
    }
    Shen.call_by_name("shen.initialise_environment", [])
    Shen.call_by_name("shen.prompt", [])
    Shen.io.puts(Shen_html_repl.buf)
  },

  load: function(src, onload) {
    var s = document.createElement("script")
    s.type = "text/javascript"
    s.src = src
    if (onload) {
      s.onload = onload
      s.onreadystatechange = function() {
        var state = Shen_html_repl.readyState || this.readyState
        if (state == 'complete')
          onload()
      }
    }
    document.getElementsByTagName("head")[0].appendChild(s)
  },

  load_files: function(files, i, donefunc) {
    if (typeof(files) == "string")
      files = [files]
    if (i < files.length)
      Shen_html_repl.load(files[i], function() {
        Shen_html_repl.load_files(files, i + 1, donefunc)
      })
    else
      donefunc()
  },

  init: function(arg) {
    var div = document.getElementById(arg.div)
    if (div == null)
      return

    div.innerHTML = ""

    var p = document.createElement("p")
    var pre = document.createElement("pre")
    var code = document.createElement("code")
    code.id = "shenjs_repl_out"
    pre.appendChild(code)
    p.appendChild(pre)

    code.appendChild(document.createTextNode("Loading Shen. Please, wait..."))

    var input = document.createElement("div")
    input.id = "shenjs_repl_input_pane"
    input.style.visibility = "hidden"

    var text = document.createElement("textarea")
    text.id = "shenjs_repl_in"
    text.name = "shenjs_repl_in"
    text.disabled = true
    text.setAttribute("cols", 72)
    text.setAttribute("rows", 5)
    text.setAttribute("onkeypress", "return Shen_html_repl.onkey(event)")

    var btn_submit = document.createElement("button")
    btn_submit.appendChild(document.createTextNode("Enter"))
    btn_submit.setAttribute("onclick", "Shen_html_repl.enter()")

    var btn_clear = document.createElement("button")
    btn_clear.appendChild(document.createTextNode("Clear"))
    btn_clear.setAttribute("onclick", "Shen_html_repl.clear()")

    var help = document.createElement("ul")
    help.id = "shenjs_repl_help"
    var help_items = [
      "Press 'Enter' to send text to interpreter",
      "Press 'Ctrl+Enter' to add new line"
    ]
    for (var i = 0; i < help_items.length; ++i) {
      var hi = document.createElement("li")
      hi.appendChild(document.createTextNode(help_items[i]))
      help.appendChild(hi)
    }

    var end = document.createElement("div")
    end.id = "shenjs_repl_end"

    input.appendChild(text)
    input.appendChild(document.createElement("br"))
    input.appendChild(btn_submit)
    input.appendChild(btn_clear)
    input.appendChild(help)
    input.appendChild(end)

    div.appendChild(p)
    div.appendChild(input)

    Shen_html_repl.load_files(arg.src, 0, arg.onready)
  },

  onkey: function(ev) {
    var evo = window.event ? event : ev
    if ((evo.keyCode != 0xa) && (evo.keyCode != 0xd))
      return true
    if (evo.ctrlKey) {
      var input = document.getElementById("shenjs_repl_in")
      input.value += "\n"
    } else
      Shen_html_repl.enter()
    return false
  },

  clear: function() {
    var input = document.getElementById("shenjs_repl_in")
    input.value = ""
  },

  enter: function() {
    var input = document.getElementById("shenjs_repl_in")
    if (input.value.length) {
      var lines = input.value.split("\n")
      var nlines = lines.length
      for (var i = 0; i < nlines; ++i)
        Shen_html_repl.consume_line(lines[i] + "\n")
    }
    input.value = ""
    window.location = "#shenjs_repl_end"
    window.location = "#shenjs_repl_in"
    input.focus()
  }
}
