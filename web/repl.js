shen_web.init_repl = function() {
  shen_web.set_init_status("Initializing repl");
  var hist = [],
      hist_index = 0,
      max_hist_size = 300,
      saved_line = null,
      repl = {};

  function puts(str, tag) {
    if (!str.length)
      return;
    var cont = repl.out.parentNode,
        sd = cont.scrollHeight - cont.scrollTop,
        diff = Math.abs(sd - cont.clientHeight),
        lines = str.split("\n"), i, objs = [];
    add_line(lines[0]);
    for (i = 1; i < lines.length; ++i) {
      objs.push(document.createElement("br"));
      add_line(lines[i]);
    }
    if (tag) {
      var s = document.createElement("span");
      s.className = "repl_tag_" + tag;
      for (i = 0; i < objs.length; ++i)
        s.appendChild(objs[i]);
      repl.out.insertBefore(s, repl.inp);
    } else
      for (i = 0; i < objs.length; ++i)
        repl.out.insertBefore(objs[i], repl.inp);
    repl.out.normalize();
    if (diff < 5)
      cont.scrollTop = cont.scrollHeight;

    function add_line(s) {
      if (s.length)
        objs.push(document.createTextNode(s));
    }
  }

  function set_caret_pos(off) {
    var range = document.createRange(),
        sel = window.getSelection(),
        obj = repl.inp.childNodes[0],
        t;
    if (!obj)
      return;
    if (off === undefined)
      off = (repl.inp.textContent || repl.inp.innerText).length;
    range.setStart(obj, off);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function selection_len() {
    var sel = window.getSelection(), len = 0;
    for (var i = 0; i < sel.rangeCount; ++i) {
      var r = sel.getRangeAt(i);
      len += r.endOffset - r.startOffset;
    }
    return len;
  }

  function init_input() {
    var t = document.getElementById("repl_in"),
        b = document.getElementById("repl_in_send"),
        out = document.getElementById("repl_out");

    repl.inp = t;
    repl.out = out;

    repl.inp.contentEditable = true;
    repl.inp.spellcheck = false;
    repl.out.onclick = function() {
      if (!selection_len() && document.activeElement !== repl.inp)
        repl.inp.focus();
    };

    repl.inp.onkeyup = function(e) {
      switch (e.keyCode || e.which) {
      case 0xd:
        var line = repl.inp.textContent || repl.inp.innerText;
        if (line !== undefined) {
          line = line.replace(/\n*$/, "");
          shen_web.send(line + "\n");
          if (hist.length == 0 || line != hist[hist.length - 1]) {
            hist.push(line);
            if (hist.length > max_hist_size)
              hist.shift();
          }
          hist_index = hist.length;
        }
        shen_web.clean(repl.inp);
        return true;

      case 0x26:
        if (hist_index > 0) {
          if (hist_index == hist.length)
            saved_line = (repl.inp.textContent || repl.inp.innerText || "");
          var new_text = hist[--hist_index];
          repl.inp.textContent = new_text;
          set_caret_pos();
        }
        break;

       case 0x28:
        if (hist_index < hist.length - 1) {
          repl.inp.textContent = hist[++hist_index];
          set_caret_pos();
        } else if (saved_line !== null) {
          hist_index = hist.length;
          repl.inp.textContent = saved_line;
          set_caret_pos();
        }
        break;
      }
      return false;
    };
  }

  shen_web.puts = puts;
  shen_web.init_maximize(document.getElementById("repl"));
  shen_web.repl = repl;
  init_input();
};
