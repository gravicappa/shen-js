(function() {
  var repl = {};
  function puts(str) {
    var out = document.getElementById("shen_repl_out");
    if (out == null)
      return;
    var sd = out.scrollHeight - out.scrollTop;
    var diff = Math.abs(sd - out.clientHeight);
    var s = str.split("\n"), n = s.length - 1;
    for (var j = 0; j < n; ++j) {
      out.appendChild(document.createTextNode(s[j]));
      out.appendChild(document.createElement("br"));
    }
    out.appendChild(document.createTextNode(s[n]));
    if (diff < 5)
      out.scrollTop = out.scrollHeight;
  }

  function mk_toolbar() {
    return shen_web.toolbar([
      {title: "Maximize", icon: "web/fullscreen.png"}
    ]);
  }

  function mk_output() {
    var div = document.createElement("div");
    div.id = "shen_repl_out";
    div.className = "shen_repl_out shen_tt_font";
    return div;
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

  function resize_input(div, out) {
    var t = shen_web.by_tag("TEXTAREA", div);
    var st = (window.getComputedStyle === undefined)
             ? t.currentStyle : getComputedStyle(t);
    var bt = parseInt(st.borderTopWidth, 10);
    var bb = parseInt(st.borderBottomWidth, 10);
    var mt = parseInt(st.marginTop, 10);
    var mb = parseInt(st.marginBottom, 10);
    var sd = out.scrollHeight - out.scrollTop;
    var diff = Math.abs(sd - out.clientHeight);

    t.style.height = 0;
    t.style.height = t.scrollHeight + bt + bb + mt + mb + "px";
    div.style.height = 0;
    div.style.height = t.style.height;
    out.style.bottom = (out.parentNode.offsetHeight - div.offsetTop) + "px";

    if (diff < 5)
      out.scrollTop = out.scrollHeight;
  }

  function mk_input(out) {
    var div = document.createElement("div");
    div.id = "shen_repl_in_container";
    div.className = "shen_repl_in_container";

    var t = document.createElement("textarea");
    t.id = "shen_repl_in";
    t.className += " shen_repl_in shen_tt_font";
    t.placeholder = "Type code here";
    t.cols = 72;
    t.rows = 1;
    t.spellcheck = false;
    t.addEventListener("change", deferred_resize_textarea);
    t.addEventListener("keyup", mk_input_keypress(deferred_resize_textarea));

    var b = document.createElement("div");
    b.className += " shen_repl_in_btn";
    b.appendChild(document.createTextNode("Send"));
    b.onclick = function() {
      if (t.value !== "")
        send_input(t, "\n");
    };

    div.appendChild(t);
    div.appendChild(b);
    return div;

    function deferred_resize_textarea() {
      setTimeout(function() {resize_input(div, out);}, 1);
    }
  }

  shen_web.mk_repl = function mk(div) {
    div = document.getElementById(div);
    shen_web.clean(div);
    var out = mk_output();
    var inp = mk_input(out);
    //div.appendChild(mk_toolbar());
    div.appendChild(out);
    div.appendChild(inp);
    resize_input(inp, out);
  }
})();
