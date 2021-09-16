"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockTestRunner = void 0;
var cp = require("child_process");
var fs = require("fs");
var ncp = require("child_process");
var os = require("os");
var path = require("path");
var cmdm = require("./taskcommand");
var shelljs = require("shelljs");
var sync_request_1 = require("sync-request");
var COMMAND_TAG = '[command]';
var COMMAND_LENGTH = COMMAND_TAG.length;
var downloadDirectory = path.join(process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE, 'azure-pipelines-task-lib', '_download');
var MockTestRunner = /** @class */ (function () {
    function MockTestRunner(testPath, taskJsonPath) {
        this._testPath = '';
        this._taskJsonPath = '';
        this.nodePath = '';
        this.stdout = '';
        this.stderr = '';
        this.cmdlines = {};
        this.invokedToolCount = 0;
        this.succeeded = false;
        this.errorIssues = [];
        this.warningIssues = [];
        this._taskJsonPath = taskJsonPath || '';
        this._testPath = testPath;
        this.nodePath = this.getNodePath();
    }
    Object.defineProperty(MockTestRunner.prototype, "failed", {
        get: function () {
            return !this.succeeded;
        },
        enumerable: false,
        configurable: true
    });
    MockTestRunner.prototype.ran = function (cmdline) {
        return this.cmdlines.hasOwnProperty(cmdline.trim());
    };
    MockTestRunner.prototype.createdErrorIssue = function (message) {
        return this.errorIssues.indexOf(message.trim()) >= 0;
    };
    MockTestRunner.prototype.createdWarningIssue = function (message) {
        return this.warningIssues.indexOf(message.trim()) >= 0;
    };
    MockTestRunner.prototype.stdOutContained = function (message) {
        return this.stdout.indexOf(message) > 0;
    };
    MockTestRunner.prototype.stdErrContained = function (message) {
        return this.stderr.indexOf(message) > 0;
    };
    MockTestRunner.prototype.run = function (nodeVersion) {
        var _this = this;
        this.cmdlines = {};
        this.invokedToolCount = 0;
        this.succeeded = true;
        this.errorIssues = [];
        this.warningIssues = [];
        var nodePath = this.nodePath;
        if (nodeVersion) {
            nodePath = this.getNodePath(nodeVersion);
        }
        var spawn = cp.spawnSync(nodePath, [this._testPath]);
        // Clean environment
        Object.keys(process.env)
            .filter(function (key) { return (key.substr(0, 'INPUT_'.length) === 'INPUT_' ||
            key.substr(0, 'SECRET_'.length) === 'SECRET_' ||
            key.substr(0, 'VSTS_TASKVARIABLE_'.length) === 'VSTS_TASKVARIABLE_'); })
            .forEach(function (key) { return delete process.env[key]; });
        if (spawn.error) {
            console.error('Running test failed');
            console.error(spawn.error.message);
            return;
        }
        this.stdout = spawn.stdout.toString();
        this.stderr = spawn.stderr.toString();
        if (process.env['TASK_TEST_TRACE']) {
            console.log('');
        }
        var lines = this.stdout.replace(/\r\n/g, '\n').split('\n');
        var traceFile = this._testPath + '.log';
        lines.forEach(function (line) {
            var ci = line.indexOf('##vso[');
            var cmd;
            var cmi = line.indexOf(COMMAND_TAG);
            if (ci >= 0) {
                cmd = cmdm.commandFromString(line.substring(ci));
                if (cmd.command === 'task.complete' && cmd.properties['result'] === 'Failed') {
                    _this.succeeded = false;
                }
                if (cmd.command === 'task.issue' && cmd.properties['type'] === 'error') {
                    _this.errorIssues.push(cmd.message.trim());
                }
                if (cmd.command === 'task.issue' && cmd.properties['type'] === 'warning') {
                    _this.warningIssues.push(cmd.message.trim());
                }
            }
            else if (cmi == 0 && line.length > COMMAND_LENGTH) {
                var cmdline = line.substr(COMMAND_LENGTH).trim();
                _this.cmdlines[cmdline] = true;
                _this.invokedToolCount++;
            }
            if (process.env['TASK_TEST_TRACE']) {
                fs.appendFileSync(traceFile, line + os.EOL);
                if (line && !cmd) {
                    console.log(line);
                }
                // don't print task.debug commands to console - too noisy.
                // otherwise omit command details - can interfere during CI.
                else if (cmd && cmd.command != 'task.debug') {
                    console.log(cmd.command + " details omitted");
                }
            }
        });
        if (this.stderr && process.env['TASK_TEST_TRACE']) {
            console.log('STDERR: ' + this.stderr);
            fs.appendFileSync(traceFile, 'STDERR: ' + this.stderr + os.EOL);
        }
        if (process.env['TASK_TEST_TRACE']) {
            console.log('TRACE FILE: ' + traceFile);
        }
    };
    // Returns a path to node.exe with the correct version for this task (based on if its node10 or node)
    MockTestRunner.prototype.getNodePath = function (nodeVersion) {
        var version = nodeVersion || this.getNodeVersion();
        var downloadVersion;
        switch (version) {
            case 5:
                downloadVersion = 'v5.10.1';
                break;
            case 6:
                downloadVersion = 'v6.17.1';
                break;
            case 10:
                downloadVersion = 'v10.21.0';
                break;
            case 14:
                downloadVersion = 'v14.11.0';
                break;
            default:
                throw new Error('Invalid node version, must be 5, 6, 10, or 14 (received ' + version + ')');
        }
        // Install node in home directory if it isn't already there.
        var downloadDestination = path.join(downloadDirectory, 'node' + version);
        var pathToExe = this.getPathToNodeExe(downloadVersion, downloadDestination);
        if (pathToExe) {
            return pathToExe;
        }
        else {
            return this.downloadNode(downloadVersion, downloadDestination);
        }
    };
    // Determines the correct version of node to use based on the contents of the task's task.json. Defaults to Node 14.
    MockTestRunner.prototype.getNodeVersion = function () {
        var taskJsonPath = this.getTaskJsonPath();
        if (!taskJsonPath) {
            console.warn('Unable to find task.json, defaulting to use Node 14');
            return 10;
        }
        var taskJsonContents = fs.readFileSync(taskJsonPath, { encoding: 'utf-8' });
        var taskJson = JSON.parse(taskJsonContents);
        var nodeVersionFound = false;
        var execution = (taskJson['execution']
            || taskJson['prejobexecution']
            || taskJson['postjobexecution']);
        var keys = Object.keys(execution);
        for (var i = 0; i < keys.length; i++) {
            if (keys[i].toLowerCase() == 'node14') {
                // Prefer node 14 and return immediately.
                return 14;
            }
            else if (keys[i].toLowerCase() == 'node10') {
                // Prefer node 10 and return immediately.
                return 10;
            }
            else if (keys[i].toLowerCase() == 'node') {
                nodeVersionFound = true;
            }
        }
        if (!nodeVersionFound) {
            console.warn('Unable to determine execution type from task.json, defaulting to use Node 10');
            return 10;
        }
        return 6;
    };
    // Returns the path to the task.json for the task being tested. Returns null if unable to find it.
    // Searches by moving up the directory structure from the initial starting point and checking at each level.
    MockTestRunner.prototype.getTaskJsonPath = function () {
        if (this._taskJsonPath) {
            return this._taskJsonPath;
        }
        var curPath = this._testPath;
        var newPath = path.join(this._testPath, '..');
        while (curPath != newPath) {
            curPath = newPath;
            var taskJsonPath = path.join(curPath, 'task.json');
            if (fs.existsSync(taskJsonPath)) {
                return taskJsonPath;
            }
            newPath = path.join(curPath, '..');
        }
        return '';
    };
    // Downloads the specified node version to the download destination. Returns a path to node.exe
    MockTestRunner.prototype.downloadNode = function (nodeVersion, downloadDestination) {
        shelljs.rm('-rf', downloadDestination);
        var nodeUrl = process.env['TASK_NODE_URL'] || 'https://nodejs.org/dist';
        nodeUrl = nodeUrl.replace(/\/$/, ''); // ensure there is no trailing slash on the base URL
        var downloadPath = '';
        switch (this.getPlatform()) {
            case 'darwin':
                this.downloadTarGz(nodeUrl + '/' + nodeVersion + '/node-' + nodeVersion + '-darwin-x64.tar.gz', downloadDestination);
                downloadPath = path.join(downloadDestination, 'node-' + nodeVersion + '-darwin-x64', 'bin', 'node');
                break;
            case 'linux':
                this.downloadTarGz(nodeUrl + '/' + nodeVersion + '/node-' + nodeVersion + '-linux-x64.tar.gz', downloadDestination);
                downloadPath = path.join(downloadDestination, 'node-' + nodeVersion + '-linux-x64', 'bin', 'node');
                break;
            case 'win32':
                this.downloadFile(nodeUrl + '/' + nodeVersion + '/win-x64/node.exe', downloadDestination, 'node.exe');
                this.downloadFile(nodeUrl + '/' + nodeVersion + '/win-x64/node.lib', downloadDestination, 'node.lib');
                downloadPath = path.join(downloadDestination, 'node.exe');
        }
        // Write marker to indicate download completed.
        var marker = downloadDestination + '.completed';
        fs.writeFileSync(marker, '');
        return downloadPath;
    };
    // Downloads file to the downloadDestination, making any necessary folders along the way.
    MockTestRunner.prototype.downloadFile = function (url, downloadDestination, fileName) {
        var filePath = path.join(downloadDestination, fileName);
        if (!url) {
            throw new Error('Parameter "url" must be set.');
        }
        if (!downloadDestination) {
            throw new Error('Parameter "downloadDestination" must be set.');
        }
        console.log('Downloading file:', url);
        shelljs.mkdir('-p', downloadDestination);
        var result = sync_request_1.default('GET', url);
        fs.writeFileSync(filePath, result.getBody());
    };
    // Downloads tarGz to the download destination, making any necessary folders along the way.
    MockTestRunner.prototype.downloadTarGz = function (url, downloadDestination) {
        if (!url) {
            throw new Error('Parameter "url" must be set.');
        }
        if (!downloadDestination) {
            throw new Error('Parameter "downloadDestination" must be set.');
        }
        var tarGzName = 'node.tar.gz';
        this.downloadFile(url, downloadDestination, tarGzName);
        // Extract file
        var originalCwd = process.cwd();
        process.chdir(downloadDestination);
        try {
            ncp.execSync("tar -xzf \"" + path.join(downloadDestination, tarGzName) + "\"");
        }
        catch (_a) {
            throw new Error('Failed to unzip node tar.gz from ' + url);
        }
        finally {
            process.chdir(originalCwd);
        }
    };
    // Checks if node is installed at downloadDestination. If it is, returns a path to node.exe, otherwise returns null.
    MockTestRunner.prototype.getPathToNodeExe = function (nodeVersion, downloadDestination) {
        var exePath = '';
        switch (this.getPlatform()) {
            case 'darwin':
                exePath = path.join(downloadDestination, 'node-' + nodeVersion + '-darwin-x64', 'bin', 'node');
                break;
            case 'linux':
                exePath = path.join(downloadDestination, 'node-' + nodeVersion + '-linux-x64', 'bin', 'node');
                break;
            case 'win32':
                exePath = path.join(downloadDestination, 'node.exe');
        }
        // Only use path if marker is found indicating download completed successfully (and not partially)
        var marker = downloadDestination + '.completed';
        if (fs.existsSync(exePath) && fs.existsSync(marker)) {
            return exePath;
        }
        else {
            return '';
        }
    };
    MockTestRunner.prototype.getPlatform = function () {
        var platform = os.platform();
        if (platform != 'darwin' && platform != 'linux' && platform != 'win32') {
            throw new Error('Unexpected platform: ' + platform);
        }
        return platform;
    };
    return MockTestRunner;
}());
exports.MockTestRunner = MockTestRunner;
