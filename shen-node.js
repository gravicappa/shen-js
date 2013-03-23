#!/usr/bin/env node

var repl = require('repl'),
	vm = require('vm'),
	fs = require('fs'),
	program = require('commander');

/*
 * shen.js hacks
 * because the current runtime is not CommomJS compatible,
 * loading it via `require` will fail
 * Also, because the js port is incapable of handling strings,
 * we have to feed it via streams
 */
var shenJS = fs.readFileSync('./shen.js', 'utf-8');
var shenLib = fs.readFileSync('./runtime-node/lib.js', 'utf-8');

var shenVM = repl.REPLServer.prototype.createContext.call(null, {});
vm.runInContext(shenLib, shenVM, './runtime-node/lib.js');

console.info("Initializing Shen.js...");

vm.runInContext(shenJS, shenVM, 'shen.js');
vm.runInContext('runtime_init()', shenVM, 'runtime_init()');

// --end of shen.js hacks

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
	shenRepl.context = shenVM;
	vm.runInContext('displayPrompt();', shenVM, './runtime-node/lib.js');
}

function compileShen(file, print) {
	console.info('Work In Progress');
}

function runShen(file) {
	console.info('Work In Progress');
}

function evalWrapper(cmd, context, filename, callback) {
	var ret = vm.runInContext('reqFuncs.buffer = decodeURI("' + encodeURI(cmd.slice(1,-1)) + '");repl_line()', shenVM, './runtime-node/lib.js');
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
			vm.runInContext('displayPrompt();', shenVM, './runtime-node/lib.js');
		}
	};
