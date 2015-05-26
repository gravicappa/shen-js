(function() {
  var repl = {};
  function puts(str) {
    var out = document.getElementById("repl_out");
    if (out == null)
      return;
    var cont = out.parentNode;
    var sd = cont.scrollHeight - cont.scrollTop;
    var diff = Math.abs(sd - cont.clientHeight);
    var s = str.split("\n"), n = s.length - 1;
    for (var j = 0; j < n; ++j) {
      out.appendChild(document.createTextNode(s[j]));
      out.appendChild(document.createElement("br"));
    }
    out.appendChild(document.createTextNode(s[n]));
    if (diff < 5)
      cont.scrollTop = cont.scrollHeight;
  }

  function send_input(t, extra) {
    puts(t.value + (extra || ""));
    t.value = "";
    t.rows = 1;
  }

  function mk_input_keypress(fn) {
    function onkeypress(e) {
      fn();
      var key = e.keyCode || e.which;
      if (key != 0xd)
        return true;
      if (e.ctrlKey) {
        this.value += "\n";
        return true;
      }
      send_input(this);
      return false;
    }
    return onkeypress;
  }

  function resize_input(t, out) {
    var cont = out.parentNode;
    var st = (window.getComputedStyle === undefined)
             ? t.currentStyle : getComputedStyle(t);
    var bt = parseInt(st.borderTopWidth, 10);
    var bb = parseInt(st.borderBottomWidth, 10);
    var mt = parseInt(st.marginTop, 10);
    var mb = parseInt(st.marginBottom, 10);

    var sd = cont.scrollHeight - cont.scrollTop;
    var diff = Math.abs(sd - cont.clientHeight);

    t.style.height = 0;
    t.style.height = t.scrollHeight + bt + bb + mt + mb + "px";

    if (diff < 5)
      cont.scrollTop = cont.scrollHeight;
  }

  function init_input() {
    var t = document.getElementById("repl_in"),
        b = document.getElementById("repl_in_send"),
        out = document.getElementById("repl_out");

    t.addEventListener("change", deferred_resize_textarea);
    t.addEventListener("keyup", mk_input_keypress(deferred_resize_textarea));

    b.onclick = function() {
      if (t.value !== "") {
        send_input(t, "\n");
        resize_input(t, out);
      }
    };

    function deferred_resize_textarea() {
      setTimeout(function() {resize_input(t, out);}, 1);
    }
  }

  shen_web.puts = puts;
  shen_web.init_repl = function() {
    shen_web.init_maximize(document.getElementById("repl"));
    init_input();
  };
})();
