"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHttpCertConfiguration = exports.getHttpProxyConfiguration = exports.CodeCoverageEnabler = exports.CodeCoveragePublisher = exports.TestPublisher = exports.legacyFindFiles = exports.findMatch = exports.tool = exports.execSync = exports.exec = exports.mv = exports.rmRF = exports.find = exports.retry = exports.cp = exports.ls = exports.which = exports.resolve = exports.mkdirP = exports.checkPath = exports.popd = exports.pushd = exports.cd = exports.cwd = exports.getPlatform = exports.osType = exports.writeFile = exports.exist = exports.stats = exports.FsStats = exports.loc = exports.setResourcePath = exports.setAnswers = void 0;
var path = require("path");
var task = require("./task");
var tcm = require("./taskcommand");
var trm = require("./mock-toolrunner");
var ma = require("./mock-answer");
var mock = new ma.MockAnswers();
function setAnswers(answers) {
    mock.initialize(answers);
    trm.setAnswers(answers);
}
exports.setAnswers = setAnswers;
//-----------------------------------------------------
// Enums
//-----------------------------------------------------
module.exports.TaskResult = task.TaskResult;
module.exports.TaskState = task.TaskState;
module.exports.IssueType = task.IssueType;
module.exports.ArtifactType = task.ArtifactType;
module.exports.FieldType = task.FieldType;
module.exports.Platform = task.Platform;
//-----------------------------------------------------
// Results and Exiting
//-----------------------------------------------------
module.exports.setStdStream = task.setStdStream;
module.exports.setErrStream = task.setErrStream;
module.exports.setResult = task.setResult;
//-----------------------------------------------------
// Loc Helpers
//-----------------------------------------------------
function setResourcePath(path) {
    // nothing in mock
}
exports.setResourcePath = setResourcePath;
function loc(key) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    var str = 'loc_mock_' + key;
    if (args.length) {
        str += ' ' + args.join(' ');
    }
    return str;
}
exports.loc = loc;
//-----------------------------------------------------
// Input Helpers
//-----------------------------------------------------
module.exports.assertAgent = task.assertAgent;
module.exports.getVariable = task.getVariable;
module.exports.getVariables = task.getVariables;
module.exports.setVariable = task.setVariable;
module.exports.setSecret = task.setSecret;
module.exports.getTaskVariable = task.getTaskVariable;
module.exports.setTaskVariable = task.setTaskVariable;
module.exports.getInput = task.getInput;
module.exports.getBoolInput = task.getBoolInput;
module.exports.getDelimitedInput = task.getDelimitedInput;
module.exports.filePathSupplied = task.filePathSupplied;
function getPathInput(name, required, check) {
    var inval = module.exports.getInput(name, required);
    if (inval) {
        if (check) {
            checkPath(inval, name);
        }
    }
    return inval;
}
module.exports.getPathInput = getPathInput;
//-----------------------------------------------------
// Endpoint Helpers
//-----------------------------------------------------
module.exports.getEndpointUrl = task.getEndpointUrl;
module.exports.getEndpointDataParameter = task.getEndpointDataParameter;
module.exports.getEndpointAuthorizationScheme = task.getEndpointAuthorizationScheme;
module.exports.getEndpointAuthorizationParameter = task.getEndpointAuthorizationParameter;
module.exports.getEndpointAuthorization = task.getEndpointAuthorization;
//-----------------------------------------------------
// SecureFile Helpers
//-----------------------------------------------------
module.exports.getSecureFileName = task.getSecureFileName;
module.exports.getSecureFileTicket = task.getSecureFileTicket;
//-----------------------------------------------------
// Fs Helpers
//-----------------------------------------------------
var FsStats = /** @class */ (function () {
    function FsStats() {
        this.m_isFile = false;
        this.m_isDirectory = false;
        this.m_isBlockDevice = false;
        this.m_isCharacterDevice = false;
        this.m_isSymbolicLink = false;
        this.m_isFIFO = false;
        this.m_isSocket = false;
        this.dev = 0;
        this.ino = 0;
        this.mode = 0;
        this.nlink = 0;
        this.uid = 0;
        this.gid = 0;
        this.rdev = 0;
        this.size = 0;
        this.blksize = 0;
        this.blocks = 0;
        this.atime = new Date();
        this.mtime = new Date();
        this.ctime = new Date();
        this.birthtime = new Date();
    }
    FsStats.prototype.setAnswers = function (mockResponses) {
        this.m_isFile = mockResponses['isFile'] || this.m_isFile;
        this.m_isDirectory = mockResponses['isDirectory'] || this.m_isDirectory;
        this.m_isBlockDevice = mockResponses['isBlockDevice'] || this.m_isBlockDevice;
        this.m_isCharacterDevice = mockResponses['isCharacterDevice'] || this.m_isCharacterDevice;
        this.m_isSymbolicLink = mockResponses['isSymbolicLink'] || this.m_isSymbolicLink;
        this.m_isFIFO = mockResponses['isFIFO'] || this.m_isFIFO;
        this.m_isSocket = mockResponses['isSocket'] || this.m_isSocket;
        this.dev = mockResponses['dev'] || this.dev;
        this.ino = mockResponses['ino'] || this.ino;
        this.mode = mockResponses['mode'] || this.mode;
        this.nlink = mockResponses['nlink'] || this.nlink;
        this.uid = mockResponses['uid'] || this.uid;
        this.gid = mockResponses['gid'] || this.gid;
        this.rdev = mockResponses['rdev'] || this.rdev;
        this.size = mockResponses['size'] || this.size;
        this.blksize = mockResponses['blksize'] || this.blksize;
        this.blocks = mockResponses['blocks'] || this.blocks;
        this.atime = mockResponses['atime'] || this.atime;
        this.mtime = mockResponses['mtime'] || this.mtime;
        this.ctime = mockResponses['ctime'] || this.ctime;
        this.m_isSocket = mockResponses['isSocket'] || this.m_isSocket;
    };
    FsStats.prototype.isFile = function () {
        return this.m_isFile;
    };
    FsStats.prototype.isDirectory = function () {
        return this.m_isDirectory;
    };
    FsStats.prototype.isBlockDevice = function () {
        return this.m_isBlockDevice;
    };
    FsStats.prototype.isCharacterDevice = function () {
        return this.m_isCharacterDevice;
    };
    FsStats.prototype.isSymbolicLink = function () {
        return this.m_isSymbolicLink;
    };
    FsStats.prototype.isFIFO = function () {
        return this.m_isFIFO;
    };
    FsStats.prototype.isSocket = function () {
        return this.m_isSocket;
    };
    return FsStats;
}());
exports.FsStats = FsStats;
function stats(path) {
    var fsStats = new FsStats();
    fsStats.setAnswers(mock.getResponse('stats', path, module.exports.debug) || {});
    return fsStats;
}
exports.stats = stats;
function exist(path) {
    return mock.getResponse('exist', path, module.exports.debug) || false;
}
exports.exist = exist;
function writeFile(file, data, options) {
    //do nothing
}
exports.writeFile = writeFile;
function osType() {
    return mock.getResponse('osType', 'osType', module.exports.debug);
}
exports.osType = osType;
function getPlatform() {
    return mock.getResponse('getPlatform', 'getPlatform', module.exports.debug);
}
exports.getPlatform = getPlatform;
function cwd() {
    return mock.getResponse('cwd', 'cwd', module.exports.debug);
}
exports.cwd = cwd;
//-----------------------------------------------------
// Cmd Helpers
//-----------------------------------------------------
module.exports.command = task.command;
module.exports.warning = task.warning;
module.exports.error = task.error;
module.exports.debug = task.debug;
function cd(path) {
    // do nothing.  TODO: keep stack with asserts
}
exports.cd = cd;
function pushd(path) {
    // do nothing.  TODO: keep stack with asserts
}
exports.pushd = pushd;
function popd() {
    // do nothing.  TODO: keep stack with asserts
}
exports.popd = popd;
//------------------------------------------------
// Validation Helpers
//------------------------------------------------
function checkPath(p, name) {
    module.exports.debug('check path : ' + p);
    if (!p || !mock.getResponse('checkPath', p, module.exports.debug)) {
        throw new Error('Not found ' + p);
    }
}
exports.checkPath = checkPath;
//-----------------------------------------------------
// Shell/File I/O Helpers
// Abstract these away so we can
// - default to good error handling
// - inject system.debug info
// - have option to switch internal impl (shelljs now)
//-----------------------------------------------------
function mkdirP(p) {
    module.exports.debug('creating path: ' + p);
}
exports.mkdirP = mkdirP;
function resolve() {
    // we can't do ...param if we target ES6 and node 5.  This is what <=ES5 compiles down to.
    //return the posix implementation in the mock, so paths will be consistent when L0 tests are run on Windows or Mac/Linux
    var absolutePath = path.posix.resolve.apply(this, arguments);
    module.exports.debug('Absolute path for pathSegments: ' + arguments + ' = ' + absolutePath);
    return absolutePath;
}
exports.resolve = resolve;
function which(tool, check) {
    var response = mock.getResponse('which', tool, module.exports.debug);
    if (check) {
        checkPath(response, tool);
    }
    return response;
}
exports.which = which;
function ls(options, paths) {
    var response = mock.getResponse('ls', paths[0], module.exports.debug);
    if (!response) {
        return [];
    }
    return response;
}
exports.ls = ls;
function cp(source, dest) {
    module.exports.debug('###copying###');
    module.exports.debug('copying ' + source + ' to ' + dest);
}
exports.cp = cp;
function retry(func, args, retryOptions) {
    module.exports.debug("trying to execute " + (func === null || func === void 0 ? void 0 : func.name) + "(" + args.toString() + ") with " + retryOptions.retryCount + " retries");
}
exports.retry = retry;
function find(findPath) {
    return mock.getResponse('find', findPath, module.exports.debug);
}
exports.find = find;
function rmRF(path) {
    module.exports.debug('rmRF ' + path);
    var response = mock.getResponse('rmRF', path, module.exports.debug);
    if (!response['success']) {
        module.exports.setResult(1, response['message']);
    }
}
exports.rmRF = rmRF;
function mv(source, dest, force, continueOnError) {
    module.exports.debug('moving ' + source + ' to ' + dest);
    return true;
}
exports.mv = mv;
//-----------------------------------------------------
// Exec convenience wrapper
//-----------------------------------------------------
function exec(tool, args, options) {
    var toolPath = which(tool, true);
    var tr = this.tool(toolPath);
    if (args) {
        tr.arg(args);
    }
    return tr.exec(options);
}
exports.exec = exec;
function execSync(tool, args, options) {
    var toolPath = which(tool, true);
    var tr = this.tool(toolPath);
    if (args) {
        tr.arg(args);
    }
    return tr.execSync(options);
}
exports.execSync = execSync;
function tool(tool) {
    var tr = new trm.ToolRunner(tool);
    tr.on('debug', function (message) {
        module.exports.debug(message);
    });
    return tr;
}
exports.tool = tool;
//-----------------------------------------------------
// Matching helpers
//-----------------------------------------------------
module.exports.filter = task.filter;
module.exports.match = task.match;
function findMatch(defaultRoot, patterns) {
    var responseKey = typeof patterns == 'object' ? patterns.join('\n') : patterns;
    return mock.getResponse('findMatch', responseKey, module.exports.debug);
}
exports.findMatch = findMatch;
function legacyFindFiles(rootDirectory, pattern, includeFiles, includeDirectories) {
    return mock.getResponse('legacyFindFiles', pattern, module.exports.debug);
}
exports.legacyFindFiles = legacyFindFiles;
//-----------------------------------------------------
// Test Publisher
//-----------------------------------------------------
var TestPublisher = /** @class */ (function () {
    function TestPublisher(testRunner) {
        this.testRunner = testRunner;
    }
    TestPublisher.prototype.publish = function (resultFiles, mergeResults, platform, config, runTitle, publishRunAttachments) {
        var properties = {};
        properties['type'] = this.testRunner;
        if (mergeResults) {
            properties['mergeResults'] = mergeResults;
        }
        if (platform) {
            properties['platform'] = platform;
        }
        if (config) {
            properties['config'] = config;
        }
        if (runTitle) {
            properties['runTitle'] = runTitle;
        }
        if (publishRunAttachments) {
            properties['publishRunAttachments'] = publishRunAttachments;
        }
        if (resultFiles) {
            properties['resultFiles'] = resultFiles;
        }
        module.exports.command('results.publish', properties, '');
    };
    return TestPublisher;
}());
exports.TestPublisher = TestPublisher;
//-----------------------------------------------------
// Code Coverage Publisher
//-----------------------------------------------------
var CodeCoveragePublisher = /** @class */ (function () {
    function CodeCoveragePublisher() {
    }
    CodeCoveragePublisher.prototype.publish = function (codeCoverageTool, summaryFileLocation, reportDirectory, additionalCodeCoverageFiles) {
        var properties = {};
        if (codeCoverageTool) {
            properties['codecoveragetool'] = codeCoverageTool;
        }
        if (summaryFileLocation) {
            properties['summaryfile'] = summaryFileLocation;
        }
        if (reportDirectory) {
            properties['reportdirectory'] = reportDirectory;
        }
        if (additionalCodeCoverageFiles) {
            properties['additionalcodecoveragefiles'] = additionalCodeCoverageFiles;
        }
        module.exports.command('codecoverage.publish', properties, "");
    };
    return CodeCoveragePublisher;
}());
exports.CodeCoveragePublisher = CodeCoveragePublisher;
//-----------------------------------------------------
// Code coverage Publisher
//-----------------------------------------------------
var CodeCoverageEnabler = /** @class */ (function () {
    function CodeCoverageEnabler(buildTool, ccTool) {
        this.buildTool = buildTool;
        this.ccTool = ccTool;
    }
    CodeCoverageEnabler.prototype.enableCodeCoverage = function (buildProps) {
        buildProps['buildtool'] = this.buildTool;
        buildProps['codecoveragetool'] = this.ccTool;
        module.exports.command('codecoverage.enable', buildProps, "");
    };
    return CodeCoverageEnabler;
}());
exports.CodeCoverageEnabler = CodeCoverageEnabler;
//-----------------------------------------------------
// Task Logging Commands
//-----------------------------------------------------
exports.uploadFile = task.uploadFile;
exports.prependPath = task.prependPath;
exports.uploadSummary = task.uploadSummary;
exports.addAttachment = task.addAttachment;
exports.setEndpoint = task.setEndpoint;
exports.setProgress = task.setProgress;
exports.logDetail = task.logDetail;
exports.logIssue = task.logIssue;
//-----------------------------------------------------
// Artifact Logging Commands
//-----------------------------------------------------
exports.uploadArtifact = task.uploadArtifact;
exports.associateArtifact = task.associateArtifact;
//-----------------------------------------------------
// Build Logging Commands
//-----------------------------------------------------
exports.uploadBuildLog = task.uploadBuildLog;
exports.updateBuildNumber = task.updateBuildNumber;
exports.addBuildTag = task.addBuildTag;
//-----------------------------------------------------
// Release Logging Commands
//-----------------------------------------------------
exports.updateReleaseName = task.updateReleaseName;
//-----------------------------------------------------
// Tools
//-----------------------------------------------------
exports.TaskCommand = tcm.TaskCommand;
exports.commandFromString = tcm.commandFromString;
exports.ToolRunner = trm.ToolRunner;
//-----------------------------------------------------
// Http Proxy Helper
//-----------------------------------------------------
function getHttpProxyConfiguration(requestUrl) {
    return null;
}
exports.getHttpProxyConfiguration = getHttpProxyConfiguration;
//-----------------------------------------------------
// Http Certificate Helper
//-----------------------------------------------------
function getHttpCertConfiguration() {
    return null;
}
exports.getHttpCertConfiguration = getHttpCertConfiguration;