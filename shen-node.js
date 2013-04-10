#!/usr/bin/env node

var repl = require('repl'),
	Shen = require('./shen'),
	fs = require('fs'),
	lib = require('./runtime-node/lib.js'),
	program = require('commander');

Shen.init({'io':lib.consoleIO});
Shen.globals["shen_*implementation*"] = "nodejs";
Shen.call(Shen.fns["shen.credits"], []);
Shen.call(Shen.fns["shen.initialise_environment"], []);

program
	.version('0.0.1')
	.usage('[options] <file ...>')
	.option('-c, --compile', 'Compile to JavaScript and save as .js files')
	.option('-i, --interactive', 'Run an interactive Shen REPL')
	.option('-p, --print', 'Print version information and exit')
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
		prompt: "",
		input: process.stdin,
		output: process.stdout,
		ignoreUndefined: true,
		eval: evalWrapper
	});
	lib.displayPrompt();
}

function compileShen(file, print) {
	console.info('Work In Progress');
}

function runShen(file) {
	console.info('Work In Progress');
}

function evalWrapper(cmd, context, filename, callback) {
	var ret = lib.repl_line(cmd);
	if(ret[0] === null) {
		callback(null); // Shen is better at displaying the results, so we won't interfere
	}
	else if(ret[0] === 'incomplete_input') {
		callback('SyntaxError'); // will show ... prompt
	}
	else {
		callback(ret[0]);
	}
}

// shen.js demands using its own prompt
repl.REPLServer.prototype.displayPrompt = function() {
		if (this.bufferedCommand.length) {
			process.stdout.write('...');
		}
		else {
			lib.displayPrompt();
		}
	};
