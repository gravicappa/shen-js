(function() {
  shen_web.clean = function(obj) {
    if (obj)
      while (obj.firstChild)
        obj.removeChild(obj.firstChild);
  };

  shen_web.rm_class = function(cls, obj) {
    obj.className = ((" " + obj.className + " ").replace(" " + cls + " ", "")
                     .trim());
  };

  shen_web.in_class = function(cls, obj) {
    return (" " + obj.className + " ").indexOf(cls) > -1;
  };

  shen_web.by_class = function(classname, obj) {
    if (obj.getElementsByClassName)
      return obj.getElementsByClassName(classname);
    else
      return obj.querySelectorAll('.' + classname);
  };

  shen_web.by_tag = function(tag, obj) {
    for (var i = 0; i < obj.childNodes.length; i++) {
      var x = obj.childNodes[i];
      if (x.tagName === tag)
        return x;
    }
  };

  shen_web.img_btn = function(title, icon) {
    var btn = document.createElement("button");
    btn.className = "shen_ctl_btn shen_ctl_icon_btn";
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

  shen_web.toolbar = function(items) {
    var i, n = items.length;
    var tb = document.createElement("div");
    tb.className = "shen_toolbar";
    for (i = 0; i < n; ++i) {
      var item = items[i];
      var b = this.img_btn(item.title, item.icon);
      b.onclick = item.onclick;
      tb.appendChild(b);
    }
    return tb;
  };

  shen_web.clear_div = function() {
    var div = document.createElement("div");
    div.style["clear"] = "both";
    return div;
  };

  shen_web.dialog = function(title, fn) {
    var over = document.createElement("div");
    over.className = "shen_dlg_overlay";
    over.onclick = function() {
      over.parentNode.removeChild(over);
    }
    over.style["cursor"] = "pointer";

    var dlg = document.createElement("div");
    dlg.className = "shen_dlg";
    dlg.onclick = function(ev) {
      if (ev.stopPropagation)
        ev.stopPropagation();
      else
        ev.cancelBubble = true;
      return true;
    };

    var t = document.createElement("div");
    t.className = "shen_dlg_title";
    t.appendChild(document.createTextNode(title));
    var x = this.img_btn("Close", "web/close.png");
    x.className += " shen_dlg_close";
    x.onclick = function() {
      over.parentNode.removeChild(over);
    };
    t.appendChild(x);

    var content = document.createElement("div");
    content.className = "shen_dlg_content";

    fn(over, content);
    dlg.appendChild(t);
    dlg.appendChild(content);
    over.appendChild(dlg);
    document.body.appendChild(over);
    return over;
  };

  shen_web.dlg_okcancel = function(show, fn) {
    var div = document.createElement("div"), ok, cancel;
    div.className = "shen_dlg_btns";

    if (!show || show.match(/[oy]/)) {
      ok = document.createElement("button");
      ok.className = "shen_dlg_btn_ok";
      ok.appendChild(document.createTextNode("OK"));
      ok.onclick = function() {fn(true);};
    } else {
      ok = document.createElement("div");
      ok.className = "shen_dlg_btn_ok";
      ok.appendChild(document.createTextNode(" "));
    }
    div.appendChild(ok);

    if (!show || show.match(/[cn]/)) {
      cancel = document.createElement("a");
      cancel.className = "shen_dlg_btn_cancel";
      cancel.onclick = function() {fn(false);};

      var ct = document.createElement("span");
      ct.className = "shen_dlg_btn_cancel_text";
      ct.appendChild(document.createTextNode("Cancel"));
      cancel.appendChild(ct);

      div.appendChild(cancel);
    }
    return div;
  };

  shen_web.query = function(url, fn, errfn) {
    var req = new XMLHttpRequest();
    req.open('get', url, true);
    req.onreadystatechange = function() {
      if (req.readyState === 4)
        switch (req.status) {
        case 200: fn(req.responseText); break;
        default:
          if (errfn)
            errfn(req.statusText);
        }
    };
    try {
      req.send();
    } catch(e) {
      errfn(e);
    }
  }
})();
