#!/usr/bin/env node

var Shen = require('./shen'),
	repl = require('repl'),
	vm = require('vm'),
	fs = require('fs'),
	program = require('commander'),
	lib =  require('./runtime-node/lib.js').setup(Shen);

program
	.version('0.10.1')
	.usage('[options] <file ...>')
	.option('-c, --compile', 'Compile to JavaScript and save as .js files')
	.option('-i, --interactive', 'Run an interactive Shen REPL')
	.option('-p, --print', 'Print compiled JavaScript instead of writing to file')
	.parse(process.argv);

if(program.compile) {
	compileShen(program.args, program.print);
}
else if(program.interactive) {
	startRepl();
}
else if(program.args.length >= 1) {
	runShen(program.args);
}
else {
	startRepl();
}

function startRepl() {
	var shenRepl = repl.start({
		prompt: "(Shen)",
		input: process.stdin,
		output: process.stdout,
		ignoreUndefined: true,
		eval: shenEval,
		writer: function(x) {return x;}
	});
	// since shen.js takes a long time to load, it's faster copying it over than re-requiring it
	shenRepl.context = vm.createContext({'Shen': Shen});
}

function compileShen(filelist, print) {
	if (filelist.length === 0) {
		return console.error('Please specify source file to compile');
	}
	filelist.forEach(function(filename) {
		var hasExtension = false, kl, js;

		if(filename.slice(-5) === '.shen') {
			hasExtension = true;
		}
		if(!fs.existsSync(filename)) {
			if(hasExtension === false && fs.existsSync(filename + '.shen')) {
				filename += '.shen';
				hasExtension = true;
			}
			else {
				return console.error('Error:', filename, "doesn't exist!");
			}
		}

		try {
			kl = Shen.call_by_name("read-from-string", [fs.readFileSync(filename, 'utf-8')]);
		}
		catch(err) {
			return console.error('Error:', err.message);
		}
		js = Shen.call_by_name("js-from-shen", [kl[1]]);

		if(print) {
			console.info(js);
		}
		else {
			var jsPath = (hasExtension? filename.slice(0,-5) : filename) + '.js';
			fs.writeFileSync(jsPath, js, 'utf-8');
		}
	});
	console.info("========================================\n\n"+
		"All compilation done. Don't forget to include shen.js in your source library.");
}

function runShen(filename) {
	if (filename.length === 0) {
		return console.error('Please specify source file to execute');
	}
	filename = filename[0];
	if(!fs.existsSync(filename)) {
		if(filename.slice(-5) !== '.shen' && fs.existsSync(filename + '.shen')) {
			filename += '.shen';
		}
		else {
			return console.error('Error:', filename, "doesn't exist!");
		}
	}
	runCode(fs.readFileSync(filename, 'utf-8'), vm.createContext({'Shen': Shen}), filename, function(err, result) {
		if(err) {
			throw err;
		}
	});
}

function shenEval(cmd, context, filename, callback) {
	if(cmd[cmd.length-1] != ')') {
		// stop the trippy repl module from resending illegal commands
		return callback('SyntaxError');
	}

	// prevent repl from adding () around commands
	runCode(cmd.slice(1,-1), context, filename, function(err, result) {
		if (err) {
			if(err.message.indexOf('read error') != -1) {
				callback('SyntaxError');
			}
			else {
				callback(err);
			}
		}
		else {
			callback(null, result);
		}
	});
}

function runCode(cmd, context, filename, callback) {
	var kl, js, result = null, error = null;
	try {
		kl = Shen.call_by_name("read-from-string", [cmd]);
	}
	catch(err) {
		return callback(err);
	}
	if(kl.length === 0) {
		return callback(null, '');
	}
	js = Shen.call_by_name("js-from-shen", [kl[1]]);
	try {
		result = vm.runInContext('Shen.eval_to_shenstr('+JSON.stringify(js)+');', context, filename);
	}
	catch (err) {
		error = err;
	}
	callback(error, result);
}
