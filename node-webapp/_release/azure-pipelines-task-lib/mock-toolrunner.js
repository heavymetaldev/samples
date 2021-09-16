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
exports.ToolRunner = exports.debug = exports.setAnswers = void 0;
var Q = require("q");
var os = require("os");
var events = require("events");
var ma = require("./mock-answer");
var mock = new ma.MockAnswers();
function setAnswers(answers) {
    mock.initialize(answers);
}
exports.setAnswers = setAnswers;
;
;
function debug(message) {
    // do nothing, overridden
}
exports.debug = debug;
var ToolRunner = /** @class */ (function (_super) {
    __extends(ToolRunner, _super);
    function ToolRunner(toolPath) {
        var _this = this;
        debug('toolRunner toolPath: ' + toolPath);
        _this = _super.call(this) || this;
        _this.toolPath = toolPath;
        _this.args = [];
        return _this;
    }
    ToolRunner.prototype._debug = function (message) {
        debug(message);
        this.emit('debug', message);
    };
    ToolRunner.prototype._argStringToArray = function (argString) {
        var args = [];
        var inQuotes = false;
        var escaped = false;
        var arg = '';
        var append = function (c) {
            // we only escape double quotes.
            if (escaped && c !== '"') {
                arg += '\\';
            }
            arg += c;
            escaped = false;
        };
        for (var i = 0; i < argString.length; i++) {
            var c = argString.charAt(i);
            if (c === '"') {
                if (!escaped) {
                    inQuotes = !inQuotes;
                }
                else {
                    append(c);
                }
                continue;
            }
            if (c === "\\" && inQuotes) {
                escaped = true;
                continue;
            }
            if (c === ' ' && !inQuotes) {
                if (arg.length > 0) {
                    args.push(arg);
                    arg = '';
                }
                continue;
            }
            append(c);
        }
        if (arg.length > 0) {
            args.push(arg.trim());
        }
        return args;
    };
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
    ToolRunner.prototype.argIf = function (condition, val) {
        if (condition) {
            this.arg(val);
        }
        return this;
    };
    ToolRunner.prototype.line = function (val) {
        if (!val) {
            return this;
        }
        this._debug(this.toolPath + ' arg: ' + val);
        this.args = this.args.concat(this._argStringToArray(val));
        return this;
    };
    ToolRunner.prototype.pipeExecOutputToTool = function (tool) {
        this.pipeOutputToTool = tool;
        return this;
    };
    ToolRunner.prototype.ignoreTempPath = function (cmdString) {
        this._debug('ignoreTempPath=' + process.env['MOCK_IGNORE_TEMP_PATH']);
        this._debug('tempPath=' + process.env['MOCK_TEMP_PATH']);
        if (process.env['MOCK_IGNORE_TEMP_PATH'] === 'true') {
            // Using split/join to replace the temp path
            cmdString = cmdString.split(process.env['MOCK_TEMP_PATH'] || "").join('');
        }
        return cmdString;
    };
    //
    // Exec - use for long running tools where you need to stream live output as it runs
    //        returns a promise with return code.
    //
    ToolRunner.prototype.exec = function (options) {
        var _this = this;
        var defer = Q.defer();
        this._debug('exec tool: ' + this.toolPath);
        this._debug('Arguments:');
        this.args.forEach(function (arg) {
            _this._debug('   ' + arg);
        });
        var success = true;
        options = options || {};
        var ops = {
            cwd: options.cwd || process.cwd(),
            env: options.env || process.env,
            silent: options.silent || false,
            outStream: options.outStream || process.stdout,
            errStream: options.errStream || process.stderr,
            failOnStdErr: options.failOnStdErr || false,
            ignoreReturnCode: options.ignoreReturnCode || false,
            windowsVerbatimArguments: options.windowsVerbatimArguments
        };
        var argString = this.args.join(' ') || '';
        var cmdString = this.toolPath;
        if (argString) {
            cmdString += (' ' + argString);
        }
        // Using split/join to replace the temp path
        cmdString = this.ignoreTempPath(cmdString);
        if (!ops.silent) {
            if (this.pipeOutputToTool) {
                var pipeToolArgString = this.pipeOutputToTool.args.join(' ') || '';
                var pipeToolCmdString = this.ignoreTempPath(this.pipeOutputToTool.toolPath);
                if (pipeToolArgString) {
                    pipeToolCmdString += (' ' + pipeToolArgString);
                }
                cmdString += ' | ' + pipeToolCmdString;
            }
            ops.outStream.write('[command]' + cmdString + os.EOL);
        }
        // TODO: filter process.env
        var res = mock.getResponse('exec', cmdString, debug);
        if (res.stdout) {
            this.emit('stdout', res.stdout);
            if (!ops.silent) {
                ops.outStream.write(res.stdout + os.EOL);
            }
            var stdLineArray = res.stdout.split(os.EOL);
            for (var _i = 0, _a = stdLineArray.slice(0, -1); _i < _a.length; _i++) {
                var line = _a[_i];
                this.emit('stdline', line);
            }
            if (stdLineArray.length > 0 && stdLineArray[stdLineArray.length - 1].length > 0) {
                this.emit('stdline', stdLineArray[stdLineArray.length - 1]);
            }
        }
        if (res.stderr) {
            this.emit('stderr', res.stderr);
            success = !ops.failOnStdErr;
            if (!ops.silent) {
                var s = ops.failOnStdErr ? ops.errStream : ops.outStream;
                s.write(res.stderr + os.EOL);
            }
            var stdErrArray = res.stderr.split(os.EOL);
            for (var _b = 0, _c = stdErrArray.slice(0, -1); _b < _c.length; _b++) {
                var line = _c[_b];
                this.emit('errline', line);
            }
            if (stdErrArray.length > 0 && stdErrArray[stdErrArray.length - 1].length > 0) {
                this.emit('errline', stdErrArray[stdErrArray.length - 1]);
            }
        }
        var code = res.code;
        if (!ops.silent) {
            ops.outStream.write('rc:' + res.code + os.EOL);
        }
        if (code != 0 && !ops.ignoreReturnCode) {
            success = false;
        }
        if (!ops.silent) {
            ops.outStream.write('success:' + success + os.EOL);
        }
        if (success) {
            defer.resolve(code);
        }
        else {
            defer.reject(new Error(this.toolPath + ' failed with return code: ' + code));
        }
        return defer.promise;
    };
    //
    // ExecSync - use for short running simple commands.  Simple and convenient (synchronous)
    //            but also has limits.  For example, no live output and limited to max buffer
    //
    ToolRunner.prototype.execSync = function (options) {
        var _this = this;
        var defer = Q.defer();
        this._debug('exec tool: ' + this.toolPath);
        this._debug('Arguments:');
        this.args.forEach(function (arg) {
            _this._debug('   ' + arg);
        });
        var success = true;
        options = options || {};
        var ops = {
            cwd: options.cwd || process.cwd(),
            env: options.env || process.env,
            silent: options.silent || false,
            outStream: options.outStream || process.stdout,
            errStream: options.errStream || process.stderr,
            windowsVerbatimArguments: options.windowsVerbatimArguments,
        };
        var argString = this.args.join(' ') || '';
        var cmdString = this.toolPath;
        // Using split/join to replace the temp path
        cmdString = this.ignoreTempPath(cmdString);
        if (argString) {
            cmdString += (' ' + argString);
        }
        if (!ops.silent) {
            ops.outStream.write('[command]' + cmdString + os.EOL);
        }
        var r = mock.getResponse('exec', cmdString, debug);
        if (!ops.silent && r.stdout && r.stdout.length > 0) {
            ops.outStream.write(r.stdout);
        }
        if (!ops.silent && r.stderr && r.stderr.length > 0) {
            ops.errStream.write(r.stderr);
        }
        return {
            code: r.code,
            stdout: (r.stdout) ? r.stdout.toString() : null,
            stderr: (r.stderr) ? r.stderr.toString() : null
        };
    };
    return ToolRunner;
}(events.EventEmitter));
exports.ToolRunner = ToolRunner;