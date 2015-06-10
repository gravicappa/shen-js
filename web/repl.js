shen_web.init_repl = function() {
  shen_web.set_init_status("Initializing repl");
  var line_buffer = [];
  var buffer_index = 0;
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
    repl.out.normalize();
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
      if (document.activeElement !== repl.inp)
        repl.inp.focus();
    };

    repl.inp.onkeyup = function(e) {
      var key = e.keyCode || e.which;
      if (key == 0xd && !e.ctrlKey) {
        var line = repl.inp.textContent || repl.inp.innerText;
        line = line.trimRight("\n") + "\n";
        shen_web.send(line);
        shen_web.clean(repl.inp);

        var stripped_line = line.slice(0, -1);
        if (line_buffer.length == 0 || stripped_line != line_buffer[line_buffer.length - 1]) {
          line_buffer.push(stripped_line);
        }
        buffer_index = line_buffer.length;
        return true;
      } else if (key == 0x26) {

        if (buffer_index > 0) {
          var new_text = line_buffer[--buffer_index];
          repl.inp.textContent = new_text;
        }
      } else if (key == 0x28) {
        if (buffer_index < line_buffer.length) {
          buffer_index++;
          repl.inp.textContent = line_buffer[buffer_index];
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
