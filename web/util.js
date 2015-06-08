(function() {
  shen_web.clean = function(obj) {
    if (obj)
      while (obj.firstChild)
        obj.removeChild(obj.firstChild);
  };

  shen_web.by_class = function(classname, obj) {
    if (obj.getElementsByClassName)
      return obj.getElementsByClassName(classname);
    else
      return obj.querySelectorAll('.' + classname);
  };

  shen_web.by_tag = function(tag, obj) {
    tag = tag.toUpperCase();
    for (var i = 0; i < obj.childNodes.length; i++) {
      var x = obj.childNodes[i];
      if (x.tagName === tag)
        return x;
    }
  };

  shen_web.img_btn = function(title, icon) {
    var btn = document.createElement("button");
    btn.className = "icon_btn btn_bg btn_fg";
    btn.title = title;
    var img = document.createElement("img");
    img.src = icon;
    btn.appendChild(img);
    return btn;
  };

  shen_web.tool_sep = function() {
    var sep = document.createElement("div");
    sep.style["display"] = "inline-block";
    sep.style["width"] = "20px";
    return sep;
  };

  shen_web.toolbar = function(tb, items) {
    var i, n = items.length;
    for (i = 0; i < n; ++i) {
      var item = items[i];
      var b = this.img_btn(item.title, item.icon);
      b.classList.add("toolbar_btn");
      if (item.classes && item.classes.length)
        b.classList.add.apply(b.classList, item.classes);
      b.onclick = item.onclick;
      tb.appendChild(b);
    }
    return tb;
  };

  shen_web.init_maximize = function(div) {
    var btns = div.getElementsByClassName("maximize_btn");
    for (var i = 0; i < btns.length; ++i) {
      var b = btns[i];
      b.classList.add("alt_hdr_bg");
      b.title = "Maximize pane";
      b.onclick = function() {
        div.classList.toggle("maximized");
      };
    }
  };

  shen_web.dialog = function(opts) {
    var over = document.createElement("div");
    over.className = "overlay";
    over.onclick = function() {
      over.parentNode.removeChild(over);
    };

    var dlg = document.createElement("div");
    dlg.className = "dlg";
    dlg.onclick = function(ev) {
      if (ev.stopPropagation)
        ev.stopPropagation();
      else
        ev.cancelBubble = true;
      return true;
    };

    var t = el("dlg_title"),
        content = el("dlg_content"),
        ctl = document.createElement("div"),
        cancel = document.createElement("button");
    t.classList.add("hdr_title");
    t.appendChild(document.createTextNode(opts.title || ""));

    ctl.className = "dlg_ctl";

    cancel.appendChild(document.createTextNode("Cancel"));
    cancel.className = "btn_font dim_btn_fg dim_btn_bg dlg_cancel";
    cancel.onclick = function() {
      if (opts.onnegative)
        opts.onnegative();
      over.parentNode.removeChild(over);
      return false;
    };

    ctl.appendChild(cancel);
    if (opts.oncreate)
      opts.oncreate(content, ctl, close);
    dlg.appendChild(ctl);
    over.appendChild(dlg);
    document.body.appendChild(over);
    return over;

    function el(name) {
      var cont = document.createElement("div");
      cont.className = name + "_outer";
      var obj = document.createElement("div");
      obj.className = name;
      cont.appendChild(obj);
      dlg.appendChild(cont);
      return obj;
    }

    function close() {
      over.parentNode.removeChild(over);
    }
  };

  shen_web.prompt = function(opts) {
    opts.oncreate = function(dlg, ctl, close) {
      var lb = document.createElement("label"),
          inp = document.createElement("input");
      inp.id = "dlg_entry";
      inp.type = "text";
      inp.className = "entry_bg entry_fg";
      inp.onkeyup = function(e) {
        var key = e.keyCode || e.which;
        switch (key) {
        case 0xd: ok.onclick();
        }
      };
      lb.appendChild(document.createTextNode(opts.label || ""));
      lb.htmlFor = "dlg_entry";
      dlg.appendChild(lb);
      dlg.appendChild(inp);
      var ok = shen_web.btn(opts.action_text || "");
      ok.onclick = function() {
        if (inp.value && inp.value !== "" && opts.onpositive)
          opts.onpositive(inp.value);
        close();
      };
      ctl.appendChild(ok);
      setTimeout(function() {inp.focus()}, 50);
    };
    this.dialog(opts);
  };

  shen_web.confirm = function(opts) {
    opts.oncreate = function(dlg, ctl, close) {
      dlg.appendChild(document.createTextNode(opts.text || ""));
      var btn = shen_web.btn(opts.action_text || "");
      if (opts.positive_class_name)
        btn.className += " " + opts.positive_class_name;
      btn.onclick = function() {
        if (opts.onpositive)
          opts.onpositive();
        close();
      };
      ctl.appendChild(btn);
    };
    this.dialog(opts);
  }

  shen_web.btn = function(title) {
    var b = document.createElement("button");
    b.className = "btn_font btn_fg alt_hdr_bg btn_bg";
    b.appendChild(document.createTextNode(title));
    return b;
  }

  shen_web.dlg_okcancel = function(show, fn) {
    var div = document.createElement("div"), ok, cancel;
    div.className = "dlg_btns";

    if (!show || show.match(/[oy]/)) {
      ok = document.createElement("button");
      ok.className = "dlg_btn_ok";
      ok.appendChild(document.createTextNode("OK"));
      ok.onclick = function() {fn(true);};
    } else {
      ok = document.createElement("div");
      ok.className = "dlg_btn_ok";
      ok.appendChild(document.createTextNode(" "));
    }
    div.appendChild(ok);

    if (!show || show.match(/[cn]/)) {
      cancel = document.createElement("a");
      cancel.className = "dlg_btn_cancel";
      cancel.onclick = function() {fn(false);};

      var ct = document.createElement("span");
      ct.className = "dlg_btn_cancel_text";
      ct.appendChild(document.createTextNode("Cancel"));
      cancel.appendChild(ct);

      div.appendChild(cancel);
    }
    return div;
  };

  shen_web.xhr = function(opts, fn, errfn) {
    if (typeof(opts) === "string")
      opts = {url: opts};
    opts.method = opts.method || "GET";
    opts.req_headers = opts.req_headers || {};

    var keys = Object.keys(opts), i, key, hdrs = opts.req_headers,
        hkeys = Object.keys(hdrs), req = new XMLHttpRequest();

    req.open(opts.method, opts.url, true);
    for (i = 0; i < keys.length; ++i) {
      key = keys[i];
      switch (key) {
      case "method": case "url": case "req_headers": break;
      default: req[key] = opts[key];
      }
    }
    for (i = 0; i < hkeys.length; ++i) {
      key = hkeys[i];
      req.setRequestHeader(key, opts.req_headers[key]);
    }
    errfn = errfn || function() {};
    req.onreadystatechange = function() {
      if (req.readyState === 4)
        switch (req.status) {
        case 200: fn(req.response); break;
        default: errfn(req.statusText);
        }
    };
    try {
      req.send();
    } catch(e) {
      errfn(e);
    }
  };
})();
