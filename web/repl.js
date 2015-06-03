shen_web.init_repl = function() {
  var repl = {};
  function puts(str, tag) {
    var cont = repl.out.parentNode;
    var sd = cont.scrollHeight - cont.scrollTop;
    var diff = Math.abs(sd - cont.clientHeight);
    var t = document.createTextNode(str);
    if (tag) {
      var s = document.createElement("span");
      s.className = "repl_tag_" + tag;
      s.appendChild(t);
      repl.out.insertBefore(s, repl.inp);
    } else
      repl.out.insertBefore(t, repl.inp);
    if (diff < 5)
      cont.scrollTop = cont.scrollHeight;
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
      repl.inp.focus();
    };

    repl.inp.onkeyup = function(e) {
      var key = e.keyCode || e.which;
      if (key == 0xd && !e.ctrlKey) {
        var line = repl.inp.textContent || repl.inp.innerText;
        line = line.trimRight("\n") + "\n";
        shen_web.send(line);
        shen_web.clean(repl.inp);
        return true;
      }
      return false;
    };
  }

  shen_web.puts = puts;
  shen_web.init_maximize(document.getElementById("repl"));
  shen_web.repl = repl;
  init_input();
};
