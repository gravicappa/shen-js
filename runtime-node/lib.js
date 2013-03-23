/*global shen_fail_obj, shenjs_error, shen_type_stream_in, shen_type_stream_out, shen_type_stream_inout, shenjs_globals*/

var fs = require('fs');

var DEBUG = false;

if(DEBUG === true) {
	var debug = console.debug;
}
else {
	var debug = function() {};
}

var reqFuncs = {
	buffer: '',
	shenjs_open: function(type, name, direction) {
		if (type[1] != "file")
			return shen_fail_obj;
		if (direction[1] == "in") {
			try {
				var fileObj = fs.readFileSync(name);
			}
			catch(e) {
				shenjs_error(e);
				return shen_fail_obj;
			}
			var index = 0;
			var read_byte = function() {
				if(index >= fileObj.byteLength()) {
					return -1;
				}
				var byte = fileObj[index];
				index++;
				return byte;
			};
			var close_read = function() {
				fileObj = null;
			};
		return [shen_type_stream_in, read_byte, close_read];
		}
		else if (direction[1] == "out") {
			var stream = fs.createWriteStream(name);
			var write_byte = function(byte) {
				stream.write(new Buffer([byte]));
			};
			var close_write = function() {
				stream.end();
			};
			return [shen_type_stream_out, write_byte, close_write];
		}
		shenjs_error("Unsupported open flags");
		return shen_fail_obj;
	},

	shenjs_puts: function(str) {
		//console.trace();
		process.stdout.write(str.toString());
	},
	shenjs_gets: function() {
		var ret = reqFuncs.buffer;
		reqFuncs.buffer = '';
		return ret;
	},

	shenjs_open_repl: function() {
		var read_string = '', index = 0;
		var repl_read_byte = function() {
			if(index >= read_string.length) {
				read_string = shenjs_gets();
				if(read_string.length === 0) {
					return -1;
				}
				index = 0;
				return shenjs_call(shen_newline, []);
			}
			else {
				var byte = read_string.charCodeAt(index);
				//console.info('byte: ', byte, index);
				index++;
				return byte;
			}
		};
		var repl_write_byte = function (byte) {
			process.stdout.write(new Buffer([byte]));
		};

		var fout = [shen_type_stream_out, repl_write_byte, function(){}];

		var fin = [shen_type_stream_in, repl_read_byte, function() {process.exit();}];

		var finout = [shen_type_stream_inout, fin, fout];

		shenjs_globals["shen_*stoutput*"] = fout;
		shenjs_globals["shen_*stinput*"] = finout;
	}
};

for (var i in reqFuncs) {
	global[i] = reqFuncs[i];
}

function repl_line () {
	var buffer = reqFuncs.buffer, bytes = [];
	for (var i = buffer.length - 1; i >= 0; --i) {
		bytes = [shen_type_cons, buffer.charCodeAt(i), bytes];
	}
	var tokens = shenjs_call(shenjs_repl_split_input, [bytes]);
	if (tokens.length != 3 || tokens[0] != shen_tuple) {
		return ['incomplete_input'];
	}
	try {
		return [null, shenjs_call(shen_read_evaluate_print, [])];
	}
	catch (e) {
		return [shenjs_error_to_string(e)];
	}
}

function implode(list) {
    var ret = "";
    while (list.length == 3 && list[0] == shen_type_cons) {
      ret += String.fromCharCode(list[1]);
      list = list[2];
    }
    return ret;
  }

function is_empty(s) {
    var n = s.length, i;
    var space = " ".charCodeAt(0);
    for (i = 0; i < n ; ++i)
      if (s.charCodeAt(i) > space)
        return false;
    return true;
  }

function runtime_init() {
	for (var i in reqFuncs) {
		global[i] = reqFuncs[i];
	}
	shenjs_globals["shen_*implementation*"] = "html5";
    shenjs_call(shenjs_open_repl, []);
    shenjs_call(shen_credits, []);
    shenjs_call(shen_initialise$_environment, []);
}

function displayPrompt() {
	shenjs_call(shen_prompt, []);
}

function quit() {
}

// if this is not set, shen.js will attempt setting
// up its repl and cause a bloody mess
global.shenjs_external_repl = true;