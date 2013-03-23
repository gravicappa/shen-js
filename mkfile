MKSHELL = rc
name = shen.js

runtime_dir = runtime
shen_dir = shenjs/

rt_src = \
  $runtime_dir/runtime.js

runtime_src = $rt_src $shen_dir/primitives.js

shen_src = \
  $shen_dir/reg-kl.shen.js \
  $shen_dir/js-kl.shen.js \
  $shen_dir/shen-js.shen.js \
  $shen_dir/core.kl.js \
  $shen_dir/sys.kl.js \
  $shen_dir/sequent.kl.js \
  $shen_dir/yacc.kl.js \
  $shen_dir/writer.kl.js \
  $shen_dir/reader.kl.js \
  $shen_dir/prolog.kl.js \
  $shen_dir/track.kl.js \
  $shen_dir/declarations.kl.js \
  $shen_dir/load.kl.js \
  $shen_dir/macros.kl.js \
  $shen_dir/types.kl.js \
  $shen_dir/t-star.kl.js \
  $shen_dir/toplevel.kl.js

all:V: $name

$shen_dir/stamp:
  mkdir -p $shen_dir
  shen_run -ne ./make.shen $shen_dir
  touch $target

$name: $shen_dir/stamp $rt_src
  {
    echo '/*'
    cat LICENSE
    echo '*/'
    echo ''
    cat $runtime_src
    cat $shen_src | awk '
      /^"/ {str=1;next}
      /^$/ {str=0}
      str {next}
      {print}'
  } >shen.js

shen_repl_html.tar.gz: $name shen.html shen.css shen-repl-html.js io-html5.js
	dir=shen_repl_html
	rm -rf $dir
	mkdir $dir
	cp $prereq $dir
	tar c $dir | gzip >$target
