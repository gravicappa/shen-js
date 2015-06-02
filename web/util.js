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
    var max = div.getElementsByClassName("maximize_btn");
    if (max.length) {
      max[0].title = "Maximize pane";
      max[0].onclick = function() {
        div.classList.toggle("maximized");
      };
    }
  };

  shen_web.dialog = function(title, fn) {
    var over = document.createElement("div");
    over.className = "overlay";
    over.onclick = function() {
      over.parentNode.removeChild(over);
    }

    var dlg = document.createElement("div");
    dlg.className = "dlg";
    dlg.onclick = function(ev) {
      if (ev.stopPropagation)
        ev.stopPropagation();
      else
        ev.cancelBubble = true;
      return true;
    };

    var t = document.createElement("div");
    t.className = "dlg_title";
    t.appendChild(document.createTextNode(title));

    var content = document.createElement("div");
    content.className = "dlg_content";

    var ctl = document.createElement("div");
    var cancel = document.createElement("a");
    cancel.href = "";
    cancel.className = "dlg_cancel link_btn";
    cancel.onclick = function() {
      over.parentNode.removeChild(over);
      return false;
    };
    cancel.appendChild(document.createTextNode("cancel"));

    fn(over, content, ctl);
    ctl.appendChild(cancel);
    dlg.appendChild(t);
    dlg.appendChild(content);
    content.appendChild(ctl);
    over.appendChild(dlg);
    document.body.appendChild(over);
    return over;
  };

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
    opts.resp_type = opts.resp_type || "text";
    errfn = errfn || function() {};
    var req = new XMLHttpRequest();
    req.open(opts.method, opts.url, true);
    req.responseType = opts.resp_type;
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

  shen_web.recv_jsonp = function(resp) {
    console.log("jsonp resp", resp.meta, resp.data);
  };

  shen_web.jsonp = function(url) {
    var script = document.createElement("script");
    script.src = url;
    script.onload = function() {
      console.log("jsonp script loaded");
      script.parentNode.removeChild(script);
    };
    document.getElementsByTagName("head")[0].appendChild(script);
  };
})();
