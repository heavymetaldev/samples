"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var fs = require("fs");
var os = require("os");
var path = require("path");
var zlib = require("zlib");
var child_process = require("child_process");
var Logging = require("./Logging");
var Constants = require("../Declarations/Constants");
var AutoCollectHttpDependencies = require("../AutoCollection/HttpDependencies");
var Util = require("./Util");
var url_1 = require("url");
var Sender = /** @class */ (function () {
    function Sender(config, onSuccess, onError, statsbeat) {
        this._redirectedHost = null;
        this._config = config;
        this._onSuccess = onSuccess;
        this._onError = onError;
        this._statsbeat = statsbeat;
        this._enableDiskRetryMode = false;
        this._resendInterval = Sender.WAIT_BETWEEN_RESEND;
        this._maxBytesOnDisk = Sender.MAX_BYTES_ON_DISK;
        this._numConsecutiveFailures = 0;
        this._numConsecutiveRedirects = 0;
        this._resendTimer = null;
        this._fileCleanupTimer = null;
        // tmpdir is /tmp for *nix and USERDIR/AppData/Local/Temp for Windows
        this._tempDir = path.join(os.tmpdir(), Sender.TEMPDIR_PREFIX + this._config.instrumentationKey);
        if (!Sender.OS_PROVIDES_FILE_PROTECTION) {
            // Node's chmod levels do not appropriately restrict file access on Windows
            // Use the built-in command line tool ICACLS on Windows to properly restrict
            // access to the temporary directory used for disk retry mode.
            if (Sender.USE_ICACLS) {
                // This should be async - but it's currently safer to have this synchronous
                // This guarantees we can immediately fail setDiskRetryMode if we need to
                try {
                    Sender.OS_PROVIDES_FILE_PROTECTION = fs.existsSync(Sender.ICACLS_PATH);
                }
                catch (e) { }
                if (!Sender.OS_PROVIDES_FILE_PROTECTION) {
                    Logging.warn(Sender.TAG, "Could not find ICACLS in expected location! This is necessary to use disk retry mode on Windows.");
                }
            }
            else {
                // chmod works everywhere else
                Sender.OS_PROVIDES_FILE_PROTECTION = true;
            }
        }
    }
    /**
    * Enable or disable offline mode
    */
    Sender.prototype.setDiskRetryMode = function (value, resendInterval, maxBytesOnDisk) {
        var _this = this;
        this._enableDiskRetryMode = Sender.OS_PROVIDES_FILE_PROTECTION && value;
        if (typeof resendInterval === 'number' && resendInterval >= 0) {
            this._resendInterval = Math.floor(resendInterval);
        }
        if (typeof maxBytesOnDisk === 'number' && maxBytesOnDisk >= 0) {
            this._maxBytesOnDisk = Math.floor(maxBytesOnDisk);
        }
        if (value && !Sender.OS_PROVIDES_FILE_PROTECTION) {
            this._enableDiskRetryMode = false;
            Logging.warn(Sender.TAG, "Ignoring request to enable disk retry mode. Sufficient file protection capabilities were not detected.");
        }
        if (this._enableDiskRetryMode) {
            if (this._statsbeat) {
                this._statsbeat.addFeature(Constants.StatsbeatFeature.DISK_RETRY);
            }
            // Starts file cleanup task
            if (!this._fileCleanupTimer) {
                this._fileCleanupTimer = setTimeout(function () { _this._fileCleanupTask(); }, Sender.CLEANUP_TIMEOUT);
                this._fileCleanupTimer.unref();
            }
        }
        else {
            if (this._statsbeat) {
                this._statsbeat.removeFeature(Constants.StatsbeatFeature.DISK_RETRY);
            }
            if (this._fileCleanupTimer) {
                clearTimeout(this._fileCleanupTimer);
            }
        }
    };
    Sender.prototype.send = function (envelopes, callback) {
        return __awaiter(this, void 0, void 0, function () {
            var endpointUrl, endpointHost, options, batch_1, payload_1;
            var _this = this;
            return __generator(this, function (_a) {
                if (envelopes) {
                    endpointUrl = this._redirectedHost || this._config.endpointUrl;
                    endpointHost = new url_1.URL(endpointUrl).hostname;
                    options = {
                        method: "POST",
                        withCredentials: false,
                        headers: {
                            "Content-Type": "application/x-json-stream"
                        }
                    };
                    batch_1 = "";
                    envelopes.forEach(function (envelope) {
                        var payload = _this._stringify(envelope);
                        if (typeof payload !== "string") {
                            return;
                        }
                        batch_1 += payload + "\n";
                    });
                    // Remove last \n
                    if (batch_1.length > 0) {
                        batch_1 = batch_1.substring(0, batch_1.length - 1);
                    }
                    payload_1 = Buffer.from ? Buffer.from(batch_1) : new Buffer(batch_1);
                    zlib.gzip(payload_1, function (err, buffer) {
                        var dataToSend = buffer;
                        if (err) {
                            Logging.warn(err);
                            dataToSend = payload_1; // something went wrong so send without gzip
                            options.headers["Content-Length"] = payload_1.length.toString();
                        }
                        else {
                            options.headers["Content-Encoding"] = "gzip";
                            options.headers["Content-Length"] = buffer.length.toString();
                        }
                        Logging.info(Sender.TAG, options);
                        // Ensure this request is not captured by auto-collection.
                        options[AutoCollectHttpDependencies.disableCollectionRequestOption] = true;
                        var startTime = +new Date();
                        var requestCallback = function (res) {
                            res.setEncoding("utf-8");
                            //returns empty if the data is accepted
                            var responseString = "";
                            res.on("data", function (data) {
                                responseString += data;
                            });
                            res.on("end", function () {
                                var endTime = +new Date();
                                var duration = endTime - startTime;
                                _this._numConsecutiveFailures = 0;
                                if (_this._enableDiskRetryMode) {
                                    // try to send any cached events if the user is back online
                                    if (res.statusCode === 200) {
                                        if (!_this._resendTimer) {
                                            _this._resendTimer = setTimeout(function () {
                                                _this._resendTimer = null;
                                                _this._sendFirstFileOnDisk();
                                            }, _this._resendInterval);
                                            _this._resendTimer.unref();
                                        }
                                    }
                                    else if (_this._isRetriable(res.statusCode)) {
                                        try {
                                            if (_this._statsbeat) {
                                                _this._statsbeat.countRetry(Constants.StatsbeatNetworkCategory.Breeze, endpointHost);
                                                if (res.statusCode === 429) {
                                                    _this._statsbeat.countThrottle(Constants.StatsbeatNetworkCategory.Breeze, endpointHost);
                                                }
                                            }
                                            var breezeResponse = JSON.parse(responseString);
                                            var filteredEnvelopes_1 = [];
                                            breezeResponse.errors.forEach(function (error) {
                                                if (_this._isRetriable(error.statusCode)) {
                                                    filteredEnvelopes_1.push(envelopes[error.index]);
                                                }
                                            });
                                            if (filteredEnvelopes_1.length > 0) {
                                                _this._storeToDisk(filteredEnvelopes_1);
                                            }
                                        }
                                        catch (ex) {
                                            _this._storeToDisk(envelopes); // Retriable status code with not valid Breeze response
                                        }
                                    }
                                }
                                // Redirect handling
                                if (res.statusCode === 307 || // Temporary Redirect
                                    res.statusCode === 308) { // Permanent Redirect
                                    _this._numConsecutiveRedirects++;
                                    // To prevent circular redirects
                                    if (_this._numConsecutiveRedirects < 10) {
                                        // Try to get redirect header
                                        var locationHeader = res.headers["location"] ? res.headers["location"].toString() : null;
                                        if (locationHeader) {
                                            _this._redirectedHost = locationHeader;
                                            // Send to redirect endpoint as HTTPs library doesn't handle redirect automatically
                                            _this.send(envelopes, callback);
                                        }
                                    }
                                    else {
                                        if (_this._statsbeat) {
                                            _this._statsbeat.countException(Constants.StatsbeatNetworkCategory.Breeze, endpointHost);
                                        }
                                        if (typeof callback === "function") {
                                            callback("Error sending telemetry because of circular redirects.");
                                        }
                                    }
                                }
                                else {
                                    if (_this._statsbeat) {
                                        _this._statsbeat.countRequest(Constants.StatsbeatNetworkCategory.Breeze, endpointHost, duration, res.statusCode === 200);
                                    }
                                    _this._numConsecutiveRedirects = 0;
                                    if (typeof callback === "function") {
                                        callback(responseString);
                                    }
                                    Logging.info(Sender.TAG, responseString);
                                    if (typeof _this._onSuccess === "function") {
                                        _this._onSuccess(responseString);
                                    }
                                }
                            });
                        };
                        var req = Util.makeRequest(_this._config, endpointUrl, options, requestCallback);
                        req.on("error", function (error) {
                            // todo: handle error codes better (group to recoverable/non-recoverable and persist)
                            _this._numConsecutiveFailures++;
                            if (_this._statsbeat) {
                                _this._statsbeat.countException(Constants.StatsbeatNetworkCategory.Breeze, endpointHost);
                            }
                            // Only use warn level if retries are disabled or we've had some number of consecutive failures sending data
                            // This is because warn level is printed in the console by default, and we don't want to be noisy for transient and self-recovering errors
                            // Continue informing on each failure if verbose logging is being used
                            if (!_this._enableDiskRetryMode || _this._numConsecutiveFailures > 0 && _this._numConsecutiveFailures % Sender.MAX_CONNECTION_FAILURES_BEFORE_WARN === 0) {
                                var notice = "Ingestion endpoint could not be reached. This batch of telemetry items has been lost. Use Disk Retry Caching to enable resending of failed telemetry. Error:";
                                if (_this._enableDiskRetryMode) {
                                    notice = "Ingestion endpoint could not be reached " + _this._numConsecutiveFailures + " consecutive times. There may be resulting telemetry loss. Most recent error:";
                                }
                                Logging.warn(Sender.TAG, notice, Util.dumpObj(error));
                            }
                            else {
                                var notice = "Transient failure to reach ingestion endpoint. This batch of telemetry items will be retried. Error:";
                                Logging.info(Sender.TAG, notice, Util.dumpObj(error));
                            }
                            _this._onErrorHelper(error);
                            if (typeof callback === "function") {
                                if (error) {
                                    callback(Util.dumpObj(error));
                                }
                                else {
                                    callback("Error sending telemetry");
                                }
                            }
                            if (_this._enableDiskRetryMode) {
                                _this._storeToDisk(envelopes);
                            }
                        });
                        req.write(dataToSend);
                        req.end();
                    });
                }
                return [2 /*return*/];
            });
        });
    };
    Sender.prototype.saveOnCrash = function (envelopes) {
        if (this._enableDiskRetryMode) {
            this._storeToDiskSync(this._stringify(envelopes));
        }
    };
    Sender.prototype._isRetriable = function (statusCode) {
        return (statusCode === 206 || // Retriable
            statusCode === 408 || // Timeout
            statusCode === 429 || // Throttle
            statusCode === 439 || // Quota
            statusCode === 500 || // Server Error
            statusCode === 503 // Server Unavilable
        );
    };
    Sender.prototype._runICACLS = function (args, callback) {
        var aclProc = child_process.spawn(Sender.ICACLS_PATH, args, { windowsHide: true });
        aclProc.on("error", function (e) { return callback(e); });
        aclProc.on("close", function (code, signal) {
            return callback(code === 0 ? null : new Error("Setting ACL restrictions did not succeed (ICACLS returned code " + code + ")"));
        });
    };
    Sender.prototype._runICACLSSync = function (args) {
        // Some very old versions of Node (< 0.11) don't have this
        if (child_process.spawnSync) {
            var aclProc = child_process.spawnSync(Sender.ICACLS_PATH, args, { windowsHide: true });
            if (aclProc.error) {
                throw aclProc.error;
            }
            else if (aclProc.status !== 0) {
                throw new Error("Setting ACL restrictions did not succeed (ICACLS returned code " + aclProc.status + ")");
            }
        }
        else {
            throw new Error("Could not synchronously call ICACLS under current version of Node.js");
        }
    };
    Sender.prototype._getACLIdentity = function (callback) {
        if (Sender.ACL_IDENTITY) {
            return callback(null, Sender.ACL_IDENTITY);
        }
        var psProc = child_process.spawn(Sender.POWERSHELL_PATH, ["-Command", "[System.Security.Principal.WindowsIdentity]::GetCurrent().Name"], {
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'] // Needed to prevent hanging on Win 7
        });
        var data = "";
        psProc.stdout.on("data", function (d) { return data += d; });
        psProc.on("error", function (e) { return callback(e, null); });
        psProc.on("close", function (code, signal) {
            Sender.ACL_IDENTITY = data && data.trim();
            return callback(code === 0 ? null : new Error("Getting ACL identity did not succeed (PS returned code " + code + ")"), Sender.ACL_IDENTITY);
        });
    };
    Sender.prototype._getACLIdentitySync = function () {
        if (Sender.ACL_IDENTITY) {
            return Sender.ACL_IDENTITY;
        }
        // Some very old versions of Node (< 0.11) don't have this
        if (child_process.spawnSync) {
            var psProc = child_process.spawnSync(Sender.POWERSHELL_PATH, ["-Command", "[System.Security.Principal.WindowsIdentity]::GetCurrent().Name"], {
                windowsHide: true,
                stdio: ['ignore', 'pipe', 'pipe'] // Needed to prevent hanging on Win 7
            });
            if (psProc.error) {
                throw psProc.error;
            }
            else if (psProc.status !== 0) {
                throw new Error("Getting ACL identity did not succeed (PS returned code " + psProc.status + ")");
            }
            Sender.ACL_IDENTITY = psProc.stdout && psProc.stdout.toString().trim();
            return Sender.ACL_IDENTITY;
        }
        else {
            throw new Error("Could not synchronously get ACL identity under current version of Node.js");
        }
    };
    Sender.prototype._getACLArguments = function (directory, identity) {
        return [directory,
            "/grant", "*S-1-5-32-544:(OI)(CI)F",
            "/grant", identity + ":(OI)(CI)F", // Full permission for current user
            "/inheritance:r"]; // Remove all inherited permissions
    };
    Sender.prototype._applyACLRules = function (directory, callback) {
        var _this = this;
        if (!Sender.USE_ICACLS) {
            return callback(null);
        }
        // For performance, only run ACL rules if we haven't already during this session
        if (Sender.ACLED_DIRECTORIES[directory] === undefined) {
            // Avoid multiple calls race condition by setting ACLED_DIRECTORIES to false for this directory immediately
            // If batches are being failed faster than the processes spawned below return, some data won't be stored to disk
            // This is better than the alternative of potentially infinitely spawned processes
            Sender.ACLED_DIRECTORIES[directory] = false;
            // Restrict this directory to only current user and administrator access
            this._getACLIdentity(function (err, identity) {
                if (err) {
                    Sender.ACLED_DIRECTORIES[directory] = false; // false is used to cache failed (vs undefined which is "not yet tried")
                    return callback(err);
                }
                else {
                    _this._runICACLS(_this._getACLArguments(directory, identity), function (err) {
                        Sender.ACLED_DIRECTORIES[directory] = !err;
                        return callback(err);
                    });
                }
            });
        }
        else {
            return callback(Sender.ACLED_DIRECTORIES[directory] ? null :
                new Error("Setting ACL restrictions did not succeed (cached result)"));
        }
    };
    Sender.prototype._applyACLRulesSync = function (directory) {
        if (Sender.USE_ICACLS) {
            // For performance, only run ACL rules if we haven't already during this session
            if (Sender.ACLED_DIRECTORIES[directory] === undefined) {
                this._runICACLSSync(this._getACLArguments(directory, this._getACLIdentitySync()));
                Sender.ACLED_DIRECTORIES[directory] = true; // If we get here, it succeeded. _runIACLSSync will throw on failures
                return;
            }
            else if (!Sender.ACLED_DIRECTORIES[directory]) { // falsy but not undefined
                throw new Error("Setting ACL restrictions did not succeed (cached result)");
            }
        }
    };
    Sender.prototype._confirmDirExists = function (directory, callback) {
        var _this = this;
        fs.lstat(directory, function (err, stats) {
            if (err && err.code === 'ENOENT') {
                fs.mkdir(directory, function (err) {
                    if (err && err.code !== 'EEXIST') { // Handle race condition by ignoring EEXIST
                        callback(err);
                    }
                    else {
                        _this._applyACLRules(directory, callback);
                    }
                });
            }
            else if (!err && stats.isDirectory()) {
                _this._applyACLRules(directory, callback);
            }
            else {
                callback(err || new Error("Path existed but was not a directory"));
            }
        });
    };
    /**
     * Computes the size (in bytes) of all files in a directory at the root level. Asynchronously.
     */
    Sender.prototype._getShallowDirectorySize = function (directory, callback) {
        // Get the directory listing
        fs.readdir(directory, function (err, files) {
            if (err) {
                return callback(err, -1);
            }
            var error = null;
            var totalSize = 0;
            var count = 0;
            if (files.length === 0) {
                callback(null, 0);
                return;
            }
            // Query all file sizes
            for (var i = 0; i < files.length; i++) {
                fs.stat(path.join(directory, files[i]), function (err, fileStats) {
                    count++;
                    if (err) {
                        error = err;
                    }
                    else {
                        if (fileStats.isFile()) {
                            totalSize += fileStats.size;
                        }
                    }
                    if (count === files.length) {
                        // Did we get an error?
                        if (error) {
                            callback(error, -1);
                        }
                        else {
                            callback(error, totalSize);
                        }
                    }
                });
            }
        });
    };
    /**
     * Computes the size (in bytes) of all files in a directory at the root level. Synchronously.
     */
    Sender.prototype._getShallowDirectorySizeSync = function (directory) {
        var files = fs.readdirSync(directory);
        var totalSize = 0;
        for (var i = 0; i < files.length; i++) {
            totalSize += fs.statSync(path.join(directory, files[i])).size;
        }
        return totalSize;
    };
    /**
     * Stores the payload as a json file on disk in the temp directory
     */
    Sender.prototype._storeToDisk = function (envelopes) {
        var _this = this;
        // This will create the dir if it does not exist
        // Default permissions on *nix are directory listing from other users but no file creations
        Logging.info(Sender.TAG, "Checking existence of data storage directory: " + this._tempDir);
        this._confirmDirExists(this._tempDir, function (error) {
            if (error) {
                Logging.warn(Sender.TAG, "Error while checking/creating directory: " + (error && error.message));
                _this._onErrorHelper(error);
                return;
            }
            _this._getShallowDirectorySize(_this._tempDir, function (err, size) {
                if (err || size < 0) {
                    Logging.warn(Sender.TAG, "Error while checking directory size: " + (err && err.message));
                    _this._onErrorHelper(err);
                    return;
                }
                else if (size > _this._maxBytesOnDisk) {
                    Logging.warn(Sender.TAG, "Not saving data due to max size limit being met. Directory size in bytes is: " + size);
                    return;
                }
                //create file - file name for now is the timestamp, a better approach would be a UUID but that
                //would require an external dependency
                var fileName = new Date().getTime() + ".ai.json";
                var fileFullPath = path.join(_this._tempDir, fileName);
                // Mode 600 is w/r for creator and no read access for others (only applies on *nix)
                // For Windows, ACL rules are applied to the entire directory (see logic in _confirmDirExists and _applyACLRules)
                Logging.info(Sender.TAG, "saving data to disk at: " + fileFullPath);
                fs.writeFile(fileFullPath, _this._stringify(envelopes), { mode: 384 }, function (error) { return _this._onErrorHelper(error); });
            });
        });
    };
    /**
     * Stores the payload as a json file on disk using sync file operations
     * this is used when storing data before crashes
     */
    Sender.prototype._storeToDiskSync = function (payload) {
        try {
            Logging.info(Sender.TAG, "Checking existence of data storage directory: " + this._tempDir);
            if (!fs.existsSync(this._tempDir)) {
                fs.mkdirSync(this._tempDir);
            }
            // Make sure permissions are valid
            this._applyACLRulesSync(this._tempDir);
            var dirSize = this._getShallowDirectorySizeSync(this._tempDir);
            if (dirSize > this._maxBytesOnDisk) {
                Logging.info(Sender.TAG, "Not saving data due to max size limit being met. Directory size in bytes is: " + dirSize);
                return;
            }
            //create file - file name for now is the timestamp, a better approach would be a UUID but that
            //would require an external dependency
            var fileName = new Date().getTime() + ".ai.json";
            var fileFullPath = path.join(this._tempDir, fileName);
            // Mode 600 is w/r for creator and no access for anyone else (only applies on *nix)
            Logging.info(Sender.TAG, "saving data before crash to disk at: " + fileFullPath);
            fs.writeFileSync(fileFullPath, payload, { mode: 384 });
        }
        catch (error) {
            Logging.warn(Sender.TAG, "Error while saving data to disk: " + (error && error.message));
            this._onErrorHelper(error);
        }
    };
    /**
     * Check for temp telemetry files
     * reads the first file if exist, deletes it and tries to send its load
     */
    Sender.prototype._sendFirstFileOnDisk = function () {
        var _this = this;
        fs.exists(this._tempDir, function (exists) {
            if (exists) {
                fs.readdir(_this._tempDir, function (error, files) {
                    if (!error) {
                        files = files.filter(function (f) { return path.basename(f).indexOf(".ai.json") > -1; });
                        if (files.length > 0) {
                            var firstFile = files[0];
                            var filePath = path.join(_this._tempDir, firstFile);
                            fs.readFile(filePath, function (error, buffer) {
                                if (!error) {
                                    // delete the file first to prevent double sending
                                    fs.unlink(filePath, function (error) {
                                        if (!error) {
                                            try {
                                                var envelopes = JSON.parse(buffer.toString());
                                                _this.send(envelopes);
                                            }
                                            catch (error) {
                                                Logging.warn("Failed to read persisted file", error);
                                            }
                                        }
                                        else {
                                            _this._onErrorHelper(error);
                                        }
                                    });
                                }
                                else {
                                    _this._onErrorHelper(error);
                                }
                            });
                        }
                    }
                    else {
                        _this._onErrorHelper(error);
                    }
                });
            }
        });
    };
    Sender.prototype._onErrorHelper = function (error) {
        if (typeof this._onError === "function") {
            this._onError(error);
        }
    };
    Sender.prototype._stringify = function (payload) {
        try {
            return JSON.stringify(payload);
        }
        catch (error) {
            Logging.warn("Failed to serialize payload", error, payload);
        }
    };
    Sender.prototype._fileCleanupTask = function () {
        var _this = this;
        fs.exists(this._tempDir, function (exists) {
            if (exists) {
                fs.readdir(_this._tempDir, function (error, files) {
                    if (!error) {
                        files = files.filter(function (f) { return path.basename(f).indexOf(".ai.json") > -1; });
                        if (files.length > 0) {
                            files.forEach(function (file) {
                                // Check expiration
                                var fileCreationDate = new Date(parseInt(file.split(".ai.json")[0]));
                                var expired = new Date(+(new Date()) - Sender.FILE_RETEMPTION_PERIOD) > fileCreationDate;
                                if (expired) {
                                    var filePath = path.join(_this._tempDir, file);
                                    fs.unlink(filePath, function (error) {
                                        if (error) {
                                            _this._onErrorHelper(error);
                                        }
                                    });
                                }
                            });
                        }
                    }
                    else {
                        _this._onErrorHelper(error);
                    }
                });
            }
        });
    };
    Sender.TAG = "Sender";
    Sender.ICACLS_PATH = process.env.systemdrive + "/windows/system32/icacls.exe";
    Sender.POWERSHELL_PATH = process.env.systemdrive + "/windows/system32/windowspowershell/v1.0/powershell.exe";
    Sender.ACLED_DIRECTORIES = {};
    Sender.ACL_IDENTITY = null;
    // the amount of time the SDK will wait between resending cached data, this buffer is to avoid any throttling from the service side
    Sender.WAIT_BETWEEN_RESEND = 60 * 1000; // 1 minute
    Sender.MAX_BYTES_ON_DISK = 50 * 1024 * 1024; // 50 mb
    Sender.MAX_CONNECTION_FAILURES_BEFORE_WARN = 5;
    Sender.CLEANUP_TIMEOUT = 60 * 60 * 1000; // 1 hour
    Sender.FILE_RETEMPTION_PERIOD = 7 * 24 * 60 * 60 * 1000; // 7 days
    Sender.TEMPDIR_PREFIX = "appInsights-node";
    Sender.OS_PROVIDES_FILE_PROTECTION = false;
    Sender.USE_ICACLS = os.type() === "Windows_NT";
    return Sender;
}());
module.exports = Sender;
//# sourceMappingURL=Sender.js.map