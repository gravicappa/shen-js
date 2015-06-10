shen_web.init_repl = function() {
  shen_web.set_init_status("Initializing repl");
  var hist = [],
      max_hist_size = 300,
      hist_index = 0,
      saved_line = null,
      repl = {};

  function puts(str, tag) {
    var cont = repl.out.parentNode,
        sd = cont.scrollHeight - cont.scrollTop,
        diff = Math.abs(sd - cont.clientHeight),
        t = document.createTextNode(str);
    if (tag) {
      var s = document.createElement("span");
      s.className = "repl_tag_" + tag;
      s.appendChild(t);
      repl.out.insertBefore(s, repl.inp);
    } else
      repl.out.insertBefore(t, repl.inp);
    repl.out.normalize();
    if (diff < 5)
      cont.scrollTop = cont.scrollHeight;
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

  function init_input() {
    var t = document.getElementById("repl_in"),
        b = document.getElementById("repl_in_send"),
        out = document.getElementById("repl_out");

    repl.inp = t;
    repl.out = out;

    repl.inp.contentEditable = true;
    repl.inp.spellcheck = false;
    repl.out.onclick = function() {
      if (document.activeElement !== repl.inp)
        repl.inp.focus();
    };

    repl.inp.onkeyup = function(e) {
      var key = e.keyCode || e.which;
      if (key == 0xd && !e.ctrlKey) {
        var line = repl.inp.textContent || repl.inp.innerText;
        line = line.trimRight("\n");
        shen_web.send(line + "\n");
        shen_web.clean(repl.inp);

        if (hist.length == 0 || line != hist[hist.length - 1]) {
          hist.push(line);
          if (hist.length > max_hist_size)
            hist.shift();
        }
        hist_index = hist.length;
        return true;
      } else if (key == 0x26) {
        if (hist_index > 0) {
          var new_text = hist[--hist_index],
              t = (repl.inp.textContent || repl.inp.innerText);
          if (saved_line === null && t && t.length)
            saved_line = repl.inp.textContent || repl.inp.innerText;
          repl.inp.textContent = new_text;
          set_caret_pos();
        }
      } else if (key == 0x28) {
        if (hist_index < hist.length - 1) {
          hist_index++;
          repl.inp.textContent = hist[hist_index];
          set_caret_pos();
        } else if (saved_line !== null) {
          repl.inp.textContent = saved_line;
          saved_line = null;
          set_caret_pos();
        }
      }
      return false;
    };
  }

  shen_web.puts = puts;
  shen_web.init_maximize(document.getElementById("repl"));
  shen_web.repl = repl;
  init_input();
};
