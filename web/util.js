Shen_web = {
  clean: function(obj) {
    if (obj)
      while (obj.firstChild)
        obj.removeChild(obj.firstChild);
  },

  rm_class: function(cls, obj) {
    obj.className = ((" " + obj.className + " ").replace(" " + cls + " ", "")
                     .trim());
  },

  in_class: function(obj, cls) {
    return (" " + obj.className + " ").indexOf(cls) > -1;
  },

  by_class: function(obj, classname) {
    if (obj.getElementsByClassName)
      return obj.getElementsByClassName(classname);
    else
      return obj.querySelectorAll('.' + classname);
  },

  by_tag: function(obj, tag) {
    for (var i = 0; i < obj.childNodes.length; i++) {
      var x = obj.childNodes[i];
      if (x.tagName === tag)
        return x;
    }
  },

  query: function(url, fn) {
    var req = new XMLHttpRequest();
    req.open('get', url, true);
    req.onreadystatechange = function() {
      if (req.readyState === 4 && req.status === 200)
        fn(req.responseText);
    }
    req.send();
  },
};
