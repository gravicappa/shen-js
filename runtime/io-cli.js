
try {
	shenjs_open;
} catch (e) {
	function shenjs_open(type, name, dir) {
		if (type[1] != "file")
			return shen_fail_obj
		var filename = shenjs_globals["shen_*home-directory*"] + name
		if (dir[1] == "in") {
			try {
				var s = read(filename)
			} catch(e) {
				shenjs_error(e)
				return shen_fail_obj
			}
			var stream = [shen_type_stream_in, null, function(){}]
			stream[1] = (function() {
				return shenjs_file_instream_get(stream, s, 0)
			})
			return stream
		} else if (dir[1] == "out") {
			shenjs_error("Writing files is not supported in cli interpreter")
			return shen_fail_obj
		}
		shenjs_error("Unsupported open flags")
		return shen_fail_obj
	}
}

try {
	shenjs_puts;
} catch (e) {
	try {
		shenjs_puts = putstr;
	} catch (e) {
		shenjs_puts = write;
	}
}

try {
	shenjs_gets;
} catch (e) {
	shenjs_gets = readline;
}

try {
	shenjs_open_repl;
} catch (e) {
	function shenjs_open_repl() {
		var fout = [shen_type_stream_out, null, null]
		fout[1] = (function(byte) {
			return shenjs_repl_write_byte(byte)
		})
		fout[2] = (function() {})
		shenjs_globals["shen_*stoutput*"] = fout

		var fin = [shen_type_stream_in, null, null]
		fin[1] = (function() {
			return shenjs_repl_read_byte(fin, shenjs_gets(), 0)
		})
		fin[2] = (function() {quit()})

		var finout = [shen_type_stream_inout, fin, fout]
		shenjs_globals["shen_*stinput*"] = finout
	}
}
