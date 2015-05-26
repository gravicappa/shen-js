#!/bin/sh
js="${1:-d8}"
tmp=shen_tmp.js
img=shen_boot_image.js

which $js >/dev/null 2>&1 || js=d8
which $js >/dev/null 2>&1 || js=js
code='
  shen_bootstrap = true;
  load("shen.js");
  load("boot.js");
'
$js -d -e "$code" >"$img"
cat shen.js  "$img" >"$tmp"
cp shen.js shen_bare.js
mv "$tmp" shen.js
