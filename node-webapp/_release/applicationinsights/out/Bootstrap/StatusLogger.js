"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusLogger = void 0;
var os = require("os");
var path = require("path");
var fs = require("fs");
var FileWriter_1 = require("./FileWriter");
function readPackageVersion() {
    var packageJsonPath = path.resolve(__dirname, "../../package.json");
    try {
        var packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
        if (packageJson && typeof packageJson.version === "string") {
            return packageJson.version;
        }
    }
    catch (e) { }
    return "unknown";
}
var StatusLogger = /** @class */ (function () {
    function StatusLogger(_writer) {
        if (_writer === void 0) { _writer = console; }
        this._writer = _writer;
    }
    StatusLogger.prototype.logStatus = function (data, cb) {
        if (typeof cb === "function" && this._writer instanceof FileWriter_1.FileWriter) {
            this._writer.callback = cb;
        }
        this._writer.log(data);
    };
    StatusLogger.DEFAULT_FILE_PATH = path.join(FileWriter_1.homedir, "status");
    StatusLogger.DEFAULT_FILE_NAME = "status_" + os.hostname() + "_" + process.pid + ".json";
    StatusLogger.DEFAULT_STATUS = {
        AgentInitializedSuccessfully: false,
        SDKPresent: false,
        Ikey: "unknown",
        AppType: "node.js",
        SdkVersion: readPackageVersion(),
        MachineName: os.hostname(),
        PID: String(process.pid)
    };
    return StatusLogger;
}());
exports.StatusLogger = StatusLogger;
//# sourceMappingURL=StatusLogger.js.map