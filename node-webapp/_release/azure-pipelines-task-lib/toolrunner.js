"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRunner = void 0;
var Q = require("q");
var os = require("os");
var events = require("events");
var child = require("child_process");
var im = require("./internal");
var fs = require("fs");
var ToolRunner = /** @class */ (function (_super) {
    __extends(ToolRunner, _super);
    function ToolRunner(toolPath) {
        var _this = _super.call(this) || this;
        _this.cmdSpecialChars = [' ', '\t', '&', '(', ')', '[', ']', '{', '}', '^', '=', ';', '!', '\'', '+', ',', '`', '~', '|', '<', '>', '"'];
        if (!toolPath) {
            throw new Error('Parameter \'toolPath\' cannot be null or empty.');
        }
        _this.toolPath = im._which(toolPath, true);
        _this.args = [];
        _this._debug('toolRunner toolPath: ' + toolPath);
        return _this;
    }
    ToolRunner.prototype._debug = function (message) {
        this.emit('debug', message);
    };
    ToolRunner.prototype._argStringToArray = function (argString) {
        var args = [];
        var inQuotes = false;
        var escaped = false;
        var lastCharWasSpace = true;
        var arg = '';
        var append = function (c) {
            // we only escape double quotes.
            if (escaped) {
                if (c !== '"') {
                    arg += '\\';
                }
                else {
                    arg.slice(0, -1);
                }
            }
            arg += c;
            escaped = false;
        };
        for (var i = 0; i < argString.length; i++) {
            var c = argString.charAt(i);
            if (c === ' ' && !inQuotes) {
                if (!lastCharWasSpace) {
                    args.push(arg);
                    arg = '';
                }
                lastCharWasSpace = true;
                continue;
            }
            else {
                lastCharWasSpace = false;
            }
            if (c === '"') {
                if (!escaped) {
                    inQuotes = !inQuotes;
                }
                else {
                    append(c);
                }
                continue;
            }
            if (c === "\\" && escaped) {
                append(c);
                continue;
            }
            if (c === "\\" && inQuotes) {
                escaped = true;
                continue;
            }
            append(c);
            lastCharWasSpace = false;
        }
        if (!lastCharWasSpace) {
            args.push(arg.trim());
        }
        return args;
    };
    ToolRunner.prototype._getCommandString = function (options, noPrefix) {
        var _this = this;
        var toolPath = this._getSpawnFileName();
        var args = this._getSpawnArgs(options);
        var cmd = noPrefix ? '' : '[command]'; // omit prefix when piped to a second tool
        var commandParts = [];
        if (process.platform == 'win32') {
            // Windows + cmd file
            if (this._isCmdFile()) {
                commandParts.push(toolPath);
                commandParts = commandParts.concat(args);
            }
            // Windows + verbatim
            else if (options.windowsVerbatimArguments) {
                commandParts.push("\"" + toolPath + "\"");
                commandParts = commandParts.concat(args);
            }
            else if (options.shell) {
                commandParts.push(this._windowsQuoteCmdArg(toolPath));
                commandParts = commandParts.concat(args);
            }
            // Windows (regular)
            else {
                commandParts.push(this._windowsQuoteCmdArg(toolPath));
                commandParts = commandParts.concat(args.map(function (arg) { return _this._windowsQuoteCmdArg(arg); }));
            }
        }
        else {
            // OSX/Linux - this can likely be improved with some form of quoting.
            // creating processes on Unix is fundamentally different than Windows.
            // on Unix, execvp() takes an arg array.
            commandParts.push(toolPath);
            commandParts = commandParts.concat(args);
        }
        cmd += commandParts.join(' ');
        // append second tool
        if (this.pipeOutputToTool) {
            cmd += ' | ' + this.pipeOutputToTool._getCommandString(options, /*noPrefix:*/ true);
        }
        return cmd;
    };
    ToolRunner.prototype._processLineBuffer = function (data, strBuffer, onLine) {
        try {
            var s = strBuffer + data.toString();
            var n = s.indexOf(os.EOL);
            while (n > -1) {
                var line = s.substring(0, n);
                onLine(line);
                // the rest of the string ...
                s = s.substring(n + os.EOL.length);
                n = s.indexOf(os.EOL);
            }
            strBuffer = s;
        }
        catch (err) {
            // streaming lines to console is best effort.  Don't fail a build.
            this._debug('error processing line');
        }
    };
    /**
     * Wraps an arg string with specified char if it's not already wrapped
     * @returns {string} Arg wrapped with specified char
     * @param {string} arg Input argument string
     * @param {string} wrapChar A char input string should be wrapped with
     */
    ToolRunner.prototype._wrapArg = function (arg, wrapChar) {
        if (!this._isWrapped(arg, wrapChar)) {
            return "" + wrapChar + arg + wrapChar;
        }
        return arg;
    };
    /**
     * Unwraps an arg string wrapped with specified char
     * @param arg Arg wrapped with specified char
     * @param wrapChar A char to be removed
     */
    ToolRunner.prototype._unwrapArg = function (arg, wrapChar) {
        if (this._isWrapped(arg, wrapChar)) {
            var pattern = new RegExp("(^\\\\?" + wrapChar + ")|(\\\\?" + wrapChar + "$)", 'g');
            return arg.trim().replace(pattern, '');
        }
        return arg;
    };
    /**
     * Determine if arg string is wrapped with specified char
     * @param arg Input arg string
     */
    ToolRunner.prototype._isWrapped = function (arg, wrapChar) {
        var pattern = new RegExp("^\\\\?" + wrapChar + ".+\\\\?" + wrapChar + "$");
        return pattern.test(arg.trim());
    };
    ToolRunner.prototype._getSpawnFileName = function (options) {
        if (process.platform == 'win32') {
            if (this._isCmdFile()) {
                return process.env['COMSPEC'] || 'cmd.exe';
            }
        }
        if (options && options.shell) {
            return this._wrapArg(this.toolPath, '"');
        }
        return this.toolPath;
    };
    ToolRunner.prototype._getSpawnArgs = function (options) {
        var _this = this;
        if (process.platform == 'win32') {
            if (this._isCmdFile()) {
                var argline = "/D /S /C \"" + this._windowsQuoteCmdArg(this.toolPath);
                for (var i = 0; i < this.args.length; i++) {
                    argline += ' ';
                    argline += options.windowsVerbatimArguments ? this.args[i] : this._windowsQuoteCmdArg(this.args[i]);
                }
                argline += '"';
                return [argline];
            }
            if (options.windowsVerbatimArguments) {
                // note, in Node 6.x options.argv0 can be used instead of overriding args.slice and args.unshift.
                // for more details, refer to https://github.com/nodejs/node/blob/v6.x/lib/child_process.js
                var args_1 = this.args.slice(0); // copy the array
                // override slice to prevent Node from creating a copy of the arg array.
                // we need Node to use the "unshift" override below.
                args_1.slice = function () {
                    if (arguments.length != 1 || arguments[0] != 0) {
                        throw new Error('Unexpected arguments passed to args.slice when windowsVerbatimArguments flag is set.');
                    }
                    return args_1;
                };
                // override unshift
                //
                // when using the windowsVerbatimArguments option, Node does not quote the tool path when building
                // the cmdline parameter for the win32 function CreateProcess(). an unquoted space in the tool path
                // causes problems for tools when attempting to parse their own command line args. tools typically
                // assume their arguments begin after arg 0.
                //
                // by hijacking unshift, we can quote the tool path when it pushed onto the args array. Node builds
                // the cmdline parameter from the args array.
                //
                // note, we can't simply pass a quoted tool path to Node for multiple reasons:
                //   1) Node verifies the file exists (calls win32 function GetFileAttributesW) and the check returns
                //      false if the path is quoted.
                //   2) Node passes the tool path as the application parameter to CreateProcess, which expects the
                //      path to be unquoted.
                //
                // also note, in addition to the tool path being embedded within the cmdline parameter, Node also
                // passes the tool path to CreateProcess via the application parameter (optional parameter). when
                // present, Windows uses the application parameter to determine which file to run, instead of
                // interpreting the file from the cmdline parameter.
                args_1.unshift = function () {
                    if (arguments.length != 1) {
                        throw new Error('Unexpected arguments passed to args.unshift when windowsVerbatimArguments flag is set.');
                    }
                    return Array.prototype.unshift.call(args_1, "\"" + arguments[0] + "\""); // quote the file name
                };
                return args_1;
            }
            else if (options.shell) {
                var args = [];
                for (var _i = 0, _a = this.args; _i < _a.length; _i++) {
                    var arg = _a[_i];
                    if (this._needQuotesForCmd(arg, '%')) {
                        args.push(this._wrapArg(arg, '"'));
                    }
                    else {
                        args.push(arg);
                    }
                }
                return args;
            }
        }
        else if (options.shell) {
            return this.args.map(function (arg) {
                if (_this._isWrapped(arg, "'")) {
                    return arg;
                }
                // remove wrapping double quotes to avoid escaping
                arg = _this._unwrapArg(arg, '"');
                arg = _this._escapeChar(arg, '"');
                return _this._wrapArg(arg, '"');
            });
        }
        return this.args;
    };
    /**
     * Escape specified character.
     * @param arg String to escape char in
     * @param charToEscape Char should be escaped
     */
    ToolRunner.prototype._escapeChar = function (arg, charToEscape) {
        var escChar = "\\";
        var output = '';
        var charIsEscaped = false;
        for (var _i = 0, arg_1 = arg; _i < arg_1.length; _i++) {
            var char = arg_1[_i];
            if (char === charToEscape && !charIsEscaped) {
                output += escChar + char;
            }
            else {
                output += char;
            }
            charIsEscaped = char === escChar && !charIsEscaped;
        }
        return output;
    };
    ToolRunner.prototype._isCmdFile = function () {
        var upperToolPath = this.toolPath.toUpperCase();
        return im._endsWith(upperToolPath, '.CMD') || im._endsWith(upperToolPath, '.BAT');
    };
    /**
     * Determine whether the cmd arg needs to be quoted. Returns true if arg contains any of special chars array.
     * @param arg The cmd command arg.
     * @param additionalChars Additional chars which should be also checked.
     */
    ToolRunner.prototype._needQuotesForCmd = function (arg, additionalChars) {
        var specialChars = this.cmdSpecialChars;
        if (additionalChars) {
            specialChars = this.cmdSpecialChars.concat(additionalChars);
        }
        var _loop_1 = function (char) {
            if (specialChars.some(function (x) { return x === char; })) {
                return { value: true };
            }
        };
        for (var _i = 0, arg_2 = arg; _i < arg_2.length; _i++) {
            var char = arg_2[_i];
            var state_1 = _loop_1(char);
            if (typeof state_1 === "object")
                return state_1.value;
        }
        return false;
    };
    ToolRunner.prototype._windowsQuoteCmdArg = function (arg) {
        // for .exe, apply the normal quoting rules that libuv applies
        if (!this._isCmdFile()) {
            return this._uv_quote_cmd_arg(arg);
        }
        // otherwise apply quoting rules specific to the cmd.exe command line parser.
        // the libuv rules are generic and are not designed specifically for cmd.exe
        // command line parser.
        //
        // for a detailed description of the cmd.exe command line parser, refer to
        // http://stackoverflow.com/questions/4094699/how-does-the-windows-command-interpreter-cmd-exe-parse-scripts/7970912#7970912
        // need quotes for empty arg
        if (!arg) {
            return '""';
        }
        // determine whether the arg needs to be quoted
        var needsQuotes = this._needQuotesForCmd(arg);
        // short-circuit if quotes not needed
        if (!needsQuotes) {
            return arg;
        }
        // the following quoting rules are very similar to the rules that by libuv applies.
        //
        // 1) wrap the string in quotes
        //
        // 2) double-up quotes - i.e. " => ""
        //
        //    this is different from the libuv quoting rules. libuv replaces " with \", which unfortunately
        //    doesn't work well with a cmd.exe command line.
        //
        //    note, replacing " with "" also works well if the arg is passed to a downstream .NET console app.
        //    for example, the command line:
        //          foo.exe "myarg:""my val"""
        //    is parsed by a .NET console app into an arg array:
        //          [ "myarg:\"my val\"" ]
        //    which is the same end result when applying libuv quoting rules. although the actual
        //    command line from libuv quoting rules would look like:
        //          foo.exe "myarg:\"my val\""
        //
        // 3) double-up slashes that preceed a quote,
        //    e.g.  hello \world    => "hello \world"
        //          hello\"world    => "hello\\""world"
        //          hello\\"world   => "hello\\\\""world"
        //          hello world\    => "hello world\\"
        //
        //    technically this is not required for a cmd.exe command line, or the batch argument parser.
        //    the reasons for including this as a .cmd quoting rule are:
        //
        //    a) this is optimized for the scenario where the argument is passed from the .cmd file to an
        //       external program. many programs (e.g. .NET console apps) rely on the slash-doubling rule.
        //
        //    b) it's what we've been doing previously (by deferring to node default behavior) and we
        //       haven't heard any complaints about that aspect.
        //
        // note, a weakness of the quoting rules chosen here, is that % is not escaped. in fact, % cannot be
        // escaped when used on the command line directly - even though within a .cmd file % can be escaped
        // by using %%.
        //
        // the saving grace is, on the command line, %var% is left as-is if var is not defined. this contrasts
        // the line parsing rules within a .cmd file, where if var is not defined it is replaced with nothing.
        //
        // one option that was explored was replacing % with ^% - i.e. %var% => ^%var^%. this hack would
        // often work, since it is unlikely that var^ would exist, and the ^ character is removed when the
        // variable is used. the problem, however, is that ^ is not removed when %* is used to pass the args
        // to an external program.
        //
        // an unexplored potential solution for the % escaping problem, is to create a wrapper .cmd file.
        // % can be escaped within a .cmd file.
        var reverse = '"';
        var quote_hit = true;
        for (var i = arg.length; i > 0; i--) { // walk the string in reverse
            reverse += arg[i - 1];
            if (quote_hit && arg[i - 1] == '\\') {
                reverse += '\\'; // double the slash
            }
            else if (arg[i - 1] == '"') {
                quote_hit = true;
                reverse += '"'; // double the quote
            }
            else {
                quote_hit = false;
            }
        }
        reverse += '"';
        return reverse.split('').reverse().join('');
    };
    ToolRunner.prototype._uv_quote_cmd_arg = function (arg) {
        // Tool runner wraps child_process.spawn() and needs to apply the same quoting as
        // Node in certain cases where the undocumented spawn option windowsVerbatimArguments
        // is used.
        //
        // Since this function is a port of quote_cmd_arg from Node 4.x (technically, lib UV,
        // see https://github.com/nodejs/node/blob/v4.x/deps/uv/src/win/process.c for details),
        // pasting copyright notice from Node within this function:
        //
        //      Copyright Joyent, Inc. and other Node contributors. All rights reserved.
        //
        //      Permission is hereby granted, free of charge, to any person obtaining a copy
        //      of this software and associated documentation files (the "Software"), to
        //      deal in the Software without restriction, including without limitation the
        //      rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
        //      sell copies of the Software, and to permit persons to whom the Software is
        //      furnished to do so, subject to the following conditions:
        //
        //      The above copyright notice and this permission notice shall be included in
        //      all copies or substantial portions of the Software.
        //
        //      THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
        //      IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
        //      FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
        //      AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
        //      LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
        //      FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
        //      IN THE SOFTWARE.
        if (!arg) {
            // Need double quotation for empty argument
            return '""';
        }
        if (arg.indexOf(' ') < 0 && arg.indexOf('\t') < 0 && arg.indexOf('"') < 0) {
            // No quotation needed
            return arg;
        }
        if (arg.indexOf('"') < 0 && arg.indexOf('\\') < 0) {
            // No embedded double quotes or backslashes, so I can just wrap
            // quote marks around the whole thing.
            return "\"" + arg + "\"";
        }
        // Expected input/output:
        //   input : hello"world
        //   output: "hello\"world"
        //   input : hello""world
        //   output: "hello\"\"world"
        //   input : hello\world
        //   output: hello\world
        //   input : hello\\world
        //   output: hello\\world
        //   input : hello\"world
        //   output: "hello\\\"world"
        //   input : hello\\"world
        //   output: "hello\\\\\"world"
        //   input : hello world\
        //   output: "hello world\\" - note the comment in libuv actually reads "hello world\"
        //                             but it appears the comment is wrong, it should be "hello world\\"
        var reverse = '"';
        var quote_hit = true;
        for (var i = arg.length; i > 0; i--) { // walk the string in reverse
            reverse += arg[i - 1];
            if (quote_hit && arg[i - 1] == '\\') {
                reverse += '\\';
            }
            else if (arg[i - 1] == '"') {
                quote_hit = true;
                reverse += '\\';
            }
            else {
                quote_hit = false;
            }
        }
        reverse += '"';
        return reverse.split('').reverse().join('');
    };
    ToolRunner.prototype._cloneExecOptions = function (options) {
        options = options || {};
        var result = {
            cwd: options.cwd || process.cwd(),
            env: options.env || process.env,
            silent: options.silent || false,
            failOnStdErr: options.failOnStdErr || false,
            ignoreReturnCode: options.ignoreReturnCode || false,
            windowsVerbatimArguments: options.windowsVerbatimArguments || false,
            shell: options.shell || false
        };
        result.outStream = options.outStream || process.stdout;
        result.errStream = options.errStream || process.stderr;
        return result;
    };
    ToolRunner.prototype._getSpawnOptions = function (options) {
        options = options || {};
        var result = {};
        result.cwd = options.cwd;
        result.env = options.env;
        result.shell = options.shell;
        result['windowsVerbatimArguments'] = options.windowsVerbatimArguments || this._isCmdFile();
        return result;
    };
    ToolRunner.prototype._getSpawnSyncOptions = function (options) {
        var result = {};
        result.cwd = options.cwd;
        result.env = options.env;
        result.shell = options.shell;
        result['windowsVerbatimArguments'] = options.windowsVerbatimArguments || this._isCmdFile();
        return result;
    };
    ToolRunner.prototype.execWithPiping = function (pipeOutputToTool, options) {
        var _this = this;
        var _a, _b, _c, _d;
        var defer = Q.defer();
        this._debug('exec tool: ' + this.toolPath);
        this._debug('arguments:');
        this.args.forEach(function (arg) {
            _this._debug('   ' + arg);
        });
        var success = true;
        var optionsNonNull = this._cloneExecOptions(options);
        if (!optionsNonNull.silent) {
            optionsNonNull.outStream.write(this._getCommandString(optionsNonNull) + os.EOL);
        }
        var cp;
        var toolPath = pipeOutputToTool.toolPath;
        var toolPathFirst;
        var successFirst = true;
        var returnCodeFirst;
        var fileStream;
        var waitingEvents = 0; // number of process or stream events we are waiting on to complete
        var returnCode = 0;
        var error;
        toolPathFirst = this.toolPath;
        // Following node documentation example from this link on how to pipe output of one process to another
        // https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options
        //start the child process for both tools
        waitingEvents++;
        var cpFirst = child.spawn(this._getSpawnFileName(optionsNonNull), this._getSpawnArgs(optionsNonNull), this._getSpawnOptions(optionsNonNull));
        waitingEvents++;
        cp = child.spawn(pipeOutputToTool._getSpawnFileName(optionsNonNull), pipeOutputToTool._getSpawnArgs(optionsNonNull), pipeOutputToTool._getSpawnOptions(optionsNonNull));
        fileStream = this.pipeOutputToFile ? fs.createWriteStream(this.pipeOutputToFile) : null;
        if (fileStream) {
            waitingEvents++;
            fileStream.on('finish', function () {
                waitingEvents--; //file write is complete
                fileStream = null;
                if (waitingEvents == 0) {
                    if (error) {
                        defer.reject(error);
                    }
                    else {
                        defer.resolve(returnCode);
                    }
                }
            });
            fileStream.on('error', function (err) {
                waitingEvents--; //there were errors writing to the file, write is done
                _this._debug("Failed to pipe output of " + toolPathFirst + " to file " + _this.pipeOutputToFile + ". Error = " + err);
                fileStream = null;
                if (waitingEvents == 0) {
                    if (error) {
                        defer.reject(error);
                    }
                    else {
                        defer.resolve(returnCode);
                    }
                }
            });
        }
        //pipe stdout of first tool to stdin of second tool
        (_a = cpFirst.stdout) === null || _a === void 0 ? void 0 : _a.on('data', function (data) {
            var _a;
            try {
                if (fileStream) {
                    fileStream.write(data);
                }
                (_a = cp.stdin) === null || _a === void 0 ? void 0 : _a.write(data);
            }
            catch (err) {
                _this._debug('Failed to pipe output of ' + toolPathFirst + ' to ' + toolPath);
                _this._debug(toolPath + ' might have exited due to errors prematurely. Verify the arguments passed are valid.');
            }
        });
        (_b = cpFirst.stderr) === null || _b === void 0 ? void 0 : _b.on('data', function (data) {
            if (fileStream) {
                fileStream.write(data);
            }
            successFirst = !optionsNonNull.failOnStdErr;
            if (!optionsNonNull.silent) {
                var s = optionsNonNull.failOnStdErr ? optionsNonNull.errStream : optionsNonNull.outStream;
                s.write(data);
            }
        });
        cpFirst.on('error', function (err) {
            var _a;
            waitingEvents--; //first process is complete with errors
            if (fileStream) {
                fileStream.end();
            }
            (_a = cp.stdin) === null || _a === void 0 ? void 0 : _a.end();
            error = new Error(toolPathFirst + ' failed. ' + err.message);
            if (waitingEvents == 0) {
                defer.reject(error);
            }
        });
        cpFirst.on('close', function (code, signal) {
            var _a;
            waitingEvents--; //first process is complete
            if (code != 0 && !optionsNonNull.ignoreReturnCode) {
                successFirst = false;
                returnCodeFirst = code;
                returnCode = returnCodeFirst;
            }
            _this._debug('success of first tool:' + successFirst);
            if (fileStream) {
                fileStream.end();
            }
            (_a = cp.stdin) === null || _a === void 0 ? void 0 : _a.end();
            if (waitingEvents == 0) {
                if (error) {
                    defer.reject(error);
                }
                else {
                    defer.resolve(returnCode);
                }
            }
        });
        var stdbuffer = '';
        (_c = cp.stdout) === null || _c === void 0 ? void 0 : _c.on('data', function (data) {
            _this.emit('stdout', data);
            if (!optionsNonNull.silent) {
                optionsNonNull.outStream.write(data);
            }
            _this._processLineBuffer(data, stdbuffer, function (line) {
                _this.emit('stdline', line);
            });
        });
        var errbuffer = '';
        (_d = cp.stderr) === null || _d === void 0 ? void 0 : _d.on('data', function (data) {
            _this.emit('stderr', data);
            success = !optionsNonNull.failOnStdErr;
            if (!optionsNonNull.silent) {
                var s = optionsNonNull.failOnStdErr ? optionsNonNull.errStream : optionsNonNull.outStream;
                s.write(data);
            }
            _this._processLineBuffer(data, errbuffer, function (line) {
                _this.emit('errline', line);
            });
        });
        cp.on('error', function (err) {
            waitingEvents--; //process is done with errors
            error = new Error(toolPath + ' failed. ' + err.message);
            if (waitingEvents == 0) {
                defer.reject(error);
            }
        });
        cp.on('close', function (code, signal) {
            waitingEvents--; //process is complete
            _this._debug('rc:' + code);
            returnCode = code;
            if (stdbuffer.length > 0) {
                _this.emit('stdline', stdbuffer);
            }
            if (errbuffer.length > 0) {
                _this.emit('errline', errbuffer);
            }
            if (code != 0 && !optionsNonNull.ignoreReturnCode) {
                success = false;
            }
            _this._debug('success:' + success);
            if (!successFirst) { //in the case output is piped to another tool, check exit code of both tools
                error = new Error(toolPathFirst + ' failed with return code: ' + returnCodeFirst);
            }
            else if (!success) {
                error = new Error(toolPath + ' failed with return code: ' + code);
            }
            if (waitingEvents == 0) {
                if (error) {
                    defer.reject(error);
                }
                else {
                    defer.resolve(returnCode);
                }
            }
        });
        return defer.promise;
    };
    /**
     * Add argument
     * Append an argument or an array of arguments
     * returns ToolRunner for chaining
     *
     * @param     val        string cmdline or array of strings
     * @returns   ToolRunner
     */
    ToolRunner.prototype.arg = function (val) {
        if (!val) {
            return this;
        }
        if (val instanceof Array) {
            this._debug(this.toolPath + ' arg: ' + JSON.stringify(val));
            this.args = this.args.concat(val);
        }
        else if (typeof (val) === 'string') {
            this._debug(this.toolPath + ' arg: ' + val);
            this.args = this.args.concat(val.trim());
        }
        return this;
    };
    /**
     * Parses an argument line into one or more arguments
     * e.g. .line('"arg one" two -z') is equivalent to .arg(['arg one', 'two', '-z'])
     * returns ToolRunner for chaining
     *
     * @param     val        string argument line
     * @returns   ToolRunner
     */
    ToolRunner.prototype.line = function (val) {
        if (!val) {
            return this;
        }
        this._debug(this.toolPath + ' arg: ' + val);
        this.args = this.args.concat(this._argStringToArray(val));
        return this;
    };
    /**
     * Add argument(s) if a condition is met
     * Wraps arg().  See arg for details
     * returns ToolRunner for chaining
     *
     * @param     condition     boolean condition
     * @param     val     string cmdline or array of strings
     * @returns   ToolRunner
     */
    ToolRunner.prototype.argIf = function (condition, val) {
        if (condition) {
            this.arg(val);
        }
        return this;
    };
    /**
     * Pipe output of exec() to another tool
     * @param tool
     * @param file  optional filename to additionally stream the output to.
     * @returns {ToolRunner}
     */
    ToolRunner.prototype.pipeExecOutputToTool = function (tool, file) {
        this.pipeOutputToTool = tool;
        this.pipeOutputToFile = file;
        return this;
    };
    /**
     * Exec a tool.
     * Output will be streamed to the live console.
     * Returns promise with return code
     *
     * @param     tool     path to tool to exec
     * @param     options  optional exec options.  See IExecOptions
     * @returns   number
     */
    ToolRunner.prototype.exec = function (options) {
        var _this = this;
        var _a, _b, _c;
        if (this.pipeOutputToTool) {
            return this.execWithPiping(this.pipeOutputToTool, options);
        }
        var defer = Q.defer();
        this._debug('exec tool: ' + this.toolPath);
        this._debug('arguments:');
        this.args.forEach(function (arg) {
            _this._debug('   ' + arg);
        });
        var optionsNonNull = this._cloneExecOptions(options);
        if (!optionsNonNull.silent) {
            optionsNonNull.outStream.write(this._getCommandString(optionsNonNull) + os.EOL);
        }
        var state = new ExecState(optionsNonNull, this.toolPath);
        state.on('debug', function (message) {
            _this._debug(message);
        });
        var cp = child.spawn(this._getSpawnFileName(options), this._getSpawnArgs(optionsNonNull), this._getSpawnOptions(options));
        this.childProcess = cp;
        // it is possible for the child process to end its last line without a new line.
        // because stdout is buffered, this causes the last line to not get sent to the parent
        // stream. Adding this event forces a flush before the child streams are closed.
        (_a = cp.stdout) === null || _a === void 0 ? void 0 : _a.on('finish', function () {
            if (!optionsNonNull.silent) {
                optionsNonNull.outStream.write(os.EOL);
            }
        });
        var stdbuffer = '';
        (_b = cp.stdout) === null || _b === void 0 ? void 0 : _b.on('data', function (data) {
            _this.emit('stdout', data);
            if (!optionsNonNull.silent) {
                optionsNonNull.outStream.write(data);
            }
            _this._processLineBuffer(data, stdbuffer, function (line) {
                _this.emit('stdline', line);
            });
        });
        var errbuffer = '';
        (_c = cp.stderr) === null || _c === void 0 ? void 0 : _c.on('data', function (data) {
            state.processStderr = true;
            _this.emit('stderr', data);
            if (!optionsNonNull.silent) {
                var s = optionsNonNull.failOnStdErr ? optionsNonNull.errStream : optionsNonNull.outStream;
                s.write(data);
            }
            _this._processLineBuffer(data, errbuffer, function (line) {
                _this.emit('errline', line);
            });
        });
        cp.on('error', function (err) {
            state.processError = err.message;
            state.processExited = true;
            state.processClosed = true;
            state.CheckComplete();
        });
        cp.on('exit', function (code, signal) {
            state.processExitCode = code;
            state.processExited = true;
            _this._debug("Exit code " + code + " received from tool '" + _this.toolPath + "'");
            state.CheckComplete();
        });
        cp.on('close', function (code, signal) {
            state.processExitCode = code;
            state.processExited = true;
            state.processClosed = true;
            _this._debug("STDIO streams have closed for tool '" + _this.toolPath + "'");
            state.CheckComplete();
        });
        state.on('done', function (error, exitCode) {
            if (stdbuffer.length > 0) {
                _this.emit('stdline', stdbuffer);
            }
            if (errbuffer.length > 0) {
                _this.emit('errline', errbuffer);
            }
            cp.removeAllListeners();
            if (error) {
                defer.reject(error);
            }
            else {
                defer.resolve(exitCode);
            }
        });
        return defer.promise;
    };
    /**
     * Exec a tool synchronously.
     * Output will be *not* be streamed to the live console.  It will be returned after execution is complete.
     * Appropriate for short running tools
     * Returns IExecSyncResult with output and return code
     *
     * @param     tool     path to tool to exec
     * @param     options  optional exec options.  See IExecSyncOptions
     * @returns   IExecSyncResult
     */
    ToolRunner.prototype.execSync = function (options) {
        var _this = this;
        this._debug('exec tool: ' + this.toolPath);
        this._debug('arguments:');
        this.args.forEach(function (arg) {
            _this._debug('   ' + arg);
        });
        var success = true;
        options = this._cloneExecOptions(options);
        if (!options.silent) {
            options.outStream.write(this._getCommandString(options) + os.EOL);
        }
        var r = child.spawnSync(this._getSpawnFileName(options), this._getSpawnArgs(options), this._getSpawnSyncOptions(options));
        if (!options.silent && r.stdout && r.stdout.length > 0) {
            options.outStream.write(r.stdout);
        }
        if (!options.silent && r.stderr && r.stderr.length > 0) {
            options.errStream.write(r.stderr);
        }
        var res = { code: r.status, error: r.error };
        res.stdout = (r.stdout) ? r.stdout.toString() : '';
        res.stderr = (r.stderr) ? r.stderr.toString() : '';
        return res;
    };
    /**
     * Used to close child process by sending SIGNINT signal.
     * It allows executed script to have some additional logic on SIGINT, before exiting.
     */
    ToolRunner.prototype.killChildProcess = function () {
        if (this.childProcess) {
            this.childProcess.kill();
        }
    };
    return ToolRunner;
}(events.EventEmitter));
exports.ToolRunner = ToolRunner;
var ExecState = /** @class */ (function (_super) {
    __extends(ExecState, _super);
    function ExecState(options, toolPath) {
        var _this = _super.call(this) || this;
        _this.delay = 10000; // 10 seconds
        _this.timeout = null;
        if (!toolPath) {
            throw new Error('toolPath must not be empty');
        }
        _this.options = options;
        _this.toolPath = toolPath;
        var delay = process.env['TASKLIB_TEST_TOOLRUNNER_EXITDELAY'];
        if (delay) {
            _this.delay = parseInt(delay);
        }
        return _this;
    }
    ExecState.prototype.CheckComplete = function () {
        if (this.done) {
            return;
        }
        if (this.processClosed) {
            this._setResult();
        }
        else if (this.processExited) {
            this.timeout = setTimeout(ExecState.HandleTimeout, this.delay, this);
        }
    };
    ExecState.prototype._debug = function (message) {
        this.emit('debug', message);
    };
    ExecState.prototype._setResult = function () {
        // determine whether there is an error
        var error;
        if (this.processExited) {
            if (this.processError) {
                error = new Error(im._loc('LIB_ProcessError', this.toolPath, this.processError));
            }
            else if (this.processExitCode != 0 && !this.options.ignoreReturnCode) {
                error = new Error(im._loc('LIB_ProcessExitCode', this.toolPath, this.processExitCode));
            }
            else if (this.processStderr && this.options.failOnStdErr) {
                error = new Error(im._loc('LIB_ProcessStderr', this.toolPath));
            }
        }
        // clear the timeout
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        this.done = true;
        this.emit('done', error, this.processExitCode);
    };
    ExecState.HandleTimeout = function (state) {
        if (state.done) {
            return;
        }
        if (!state.processClosed && state.processExited) {
            console.log(im._loc('LIB_StdioNotClosed', state.delay / 1000, state.toolPath));
            state._debug(im._loc('LIB_StdioNotClosed', state.delay / 1000, state.toolPath));
        }
        state._setResult();
    };
    return ExecState;
}(events.EventEmitter));