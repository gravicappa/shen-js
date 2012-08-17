shenjs_external_repl = true

Shen_repl = {
  buf: "",
  ctrl_enter_to_send: 0,

  gets: function() {
    if (Shen_repl.buf.length <= 0)
      return -1
    var s = Shen_repl.buf
    Shen_repl.buf = ""
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

  start: function() {
    document.getElementById("shenjs_repl_out").innerHTML = ""

    shenjs_globals["shen_*implementation*"] = "html5"
    shenjs_call(shenjs_open_repl, [])
    shenjs_call(shen_credits, [])
    shenjs_call(shen_initialise$_environment, [])
    shenjs_call(shen_prompt, [])

    document.getElementById("shenjs_repl_input_pane").style.visibility = "visible"
    var input = document.getElementById("shenjs_repl_in")
    input.disabled = false
    input.focus()
  },

  implode: function(list) {
    var ret = ""
    while (list.length == 3 && list[0] == shen_type_cons) {
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
    Shen_repl.buf += s

    while (1) {
      buf = Shen_repl.buf
      bytes = []
      for (var i = buf.length - 1; i >= 0; --i)
        bytes = [shen_type_cons, buf.charCodeAt(i), bytes]
      x = shenjs_call(shenjs_repl_split_input, [bytes])
      if (x.length != 3 || x[0] != shen_tuple)
        break
      Shen_repl.buf = Shen_repl.implode(x[1])
      shenjs_puts(Shen_repl.buf + "\n")
      buf = Shen_repl.implode(x[2])
      try {
        shenjs_call(shen_read_evaluate_print, [])
      } catch (e) {
        shenjs_puts(shenjs_error_to_string(e))
      }
      if (Shen_repl.is_empty(buf)) {
        Shen_repl.buf = ""
        break
      }
      Shen_repl.buf = buf
    }
    shenjs_call(shen_initialise$_environment, [])
    shenjs_call(shen_prompt, [])
    shenjs_puts(Shen_repl.buf + "\n")
  },

  load: function(src, onload) {
    var s = document.createElement("script")
    s.type = "text/javascript"
    s.src = src
    if (onload) {
      s.onload = onload
      s.onreadystatechange = function() {
        if (Shen_repl.readyState == 'complete')
          onload()
      }
    }
    document.getElementsByTagName("head")[0].appendChild(s)
  },

  ensure_shen_loaded: function(arg) {
    try {
      if (shenjs_globals["shen_*language*"])
        return
    } catch (e) {
    }
    arg.src = arg.src || "shen.js"
    arg.iosrc = arg.iosrc || "io-html.js"
    arg.onready = arg.onready || function() {Shen_repl.start()}
    arg.start = arg.start || 1
    Shen_repl.load(arg.iosrc, function() {
      Shen_repl.load(arg.src, arg.onready)
    })
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
    text.setAttribute("onkeypress", "return Shen_repl.onkey(event)")

    var btn_submit = document.createElement("button")
    btn_submit.appendChild(document.createTextNode("Enter"))
    btn_submit.setAttribute("onclick", "Shen_repl.enter()")

    var btn_clear = document.createElement("button")
    btn_clear.appendChild(document.createTextNode("Clear"))
    btn_clear.setAttribute("onclick", "Shen_repl.clear()")

    var help = document.createElement("ul")
    help.id = "shenjs_repl_help"
    var hi = document.createElement("li")
    hi.appendChild(document.createTextNode("Press 'Enter' to send text to interpreter"))
    help.appendChild(hi)
    var hi = document.createElement("li")
    hi.appendChild(document.createTextNode("Press 'Ctrl+Enter' to add new line"))
    help.appendChild(hi)

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

    Shen_repl.ensure_shen_loaded(arg)

    shenjs_gets = Shen_repl.gets
    shenjs_puts = Shen_repl.puts
  },

  onkey: function(ev) {
    var evo = window.event ? event : ev
    if ((evo.keyCode != 0xa) && (evo.keyCode != 0xd))
      return true
    if (evo.ctrlKey) {
      var input = document.getElementById("shenjs_repl_in")
      input.value += "\n"
    } else
      Shen_repl.enter()
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
        Shen_repl.consume_line(lines[i] + "\n")
    }
    input.value = ""
    window.location = "#shenjs_repl_end"
    window.location = "#shenjs_repl_in"
    input.focus()
  },

  quit: function() {},
}
