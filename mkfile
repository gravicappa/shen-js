MKSHELL = rc
name = shen.js

runtime_dir = runtime
shen_dir = ../../shenjs/

runtime_src = \
	$runtime_dir/runtime.js \
	$runtime_dir/io-cli.js \
	$runtime_dir/io.js \
	$shen_dir/primitives.js \
	$runtime_dir/dummy.js

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

repl_src = $runtime_dir/repl.js

$name: $runtime_src $shen_src $repl_src
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
		cat $repl_src
	} >shen.js
