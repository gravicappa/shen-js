/*global shen_fail_obj, shenjs_error, shen_type_stream_in, shen_type_stream_out, shen_type_stream_inout, shenjs_globals*/

var fs = require('fs');

var DEBUG = false;

if(DEBUG === true) {
	var debug = console.debug;
}
else {
	var debug = function() {};
}

var setup = function(Shen) {
	var io = {
		buffer: '',
		open: function(type, name, direction) {
			if (type[1] != "file")
				return Shen.fail_obj;
			if (direction[1] == "in") {
				try {
					var file = fs.readFileSync(name);
				}
				catch(e) {
					Shen.error(e);
					return Shen.fail_obj;
				}
				var index = 0;
				var read_byte = function() {
					if(index >= file.byteLength()) {
						return -1;
					}
					var byte = file.charCodeAt(index);
					index++;
					return byte;
				};
				var close_read = function() {
					file = null;
				};
			return [Shen.type_stream_in, read_byte, close_read];
			}
			else if (direction[1] == "out") {
				var stream = fs.createWriteStream(name);
				var write_byte = function(byte) {
					stream.write(new Buffer([byte]));
				};
				var close_write = function() {
					stream.end();
				};
				return [Shen.type_stream_out, write_byte, close_write];
			}
			Shen.error("Unsupported open flags");
			return Shen.fail_obj;
		},
		puts: function(str) {
			//console.trace();
			process.stdout.write(str.toString());
		},
		gets: function() {
			var ret = Shen.io.buffer;
			Shen.io.buffer = '';
			return ret;
		},
		init: function() {
			var fout = [Shen.type_stream_out,
						function(byte) {return Shen.repl_write_byte(byte);},
						function() {}];
			Shen.globals["*stoutput*"] = fout;
			var fin = [Shen.type_stream_in,
						function() {return Shen.repl_read_byte(fin, Shen.io.gets(), 0);},
						function(){process.exit();}];
			var finout = [Shen.type_stream_inout, fin, fout];
			Shen.globals["*stinput*"] = finout;
		}
	};

	Shen.init({'io':io});
	Shen.call_by_name("shen.initialise_environment", []);

};

exports.setup = setup;