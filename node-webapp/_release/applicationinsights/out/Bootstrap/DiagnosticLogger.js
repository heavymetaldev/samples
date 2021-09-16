"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticLogger = void 0;
var path = require("path");
var FileWriter_1 = require("./FileWriter");
var FileHelpers_1 = require("./Helpers/FileHelpers");
var DiagnosticLogger = /** @class */ (function () {
    function DiagnosticLogger(_writer) {
        if (_writer === void 0) { _writer = console; }
        this._writer = _writer;
    }
    DiagnosticLogger.prototype.logMessage = function (message, cb) {
        if (typeof cb === "function" && this._writer instanceof FileWriter_1.FileWriter) {
            this._writer.callback = cb;
        }
        if (typeof message === "string") {
            var diagnosticMessage = __assign(__assign({}, DiagnosticLogger.DefaultEnvelope), { message: message, level: "INFO" /* INFO */, time: new Date().toISOString() });
            this._writer.log(diagnosticMessage);
        }
        else {
            if (message.level === "ERROR" /* ERROR */) {
                this._writer.error(message);
            }
            else {
                this._writer.log(message);
            }
        }
    };
    DiagnosticLogger.prototype.logError = function (message, cb) {
        if (typeof cb === "function" && this._writer instanceof FileWriter_1.FileWriter) {
            this._writer.callback = cb;
        }
        if (typeof message === "string") {
            var diagnosticMessage = __assign(__assign({}, DiagnosticLogger.DefaultEnvelope), { message: message, level: "ERROR" /* ERROR */, time: new Date().toUTCString() });
            this._writer.error(diagnosticMessage);
        }
        else {
            this._writer.error(message);
        }
    };
    DiagnosticLogger.DEFAULT_FILE_NAME = "application-insights-extension.log";
    DiagnosticLogger.DEFAULT_LOG_DIR = process.env.APPLICATIONINSIGHTS_LOGDIR || path.join(FileHelpers_1.homedir, "LogFiles/ApplicationInsights");
    DiagnosticLogger.DefaultEnvelope = {
        message: null,
        level: null,
        time: null,
        logger: "applicationinsights.extension.diagnostics",
        properties: {
            language: "nodejs",
            operation: "Startup",
            siteName: process.env.WEBSITE_SITE_NAME,
            ikey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
            extensionVersion: process.env.ApplicationInsightsAgent_EXTENSION_VERSION,
            sdkVersion: "2.1.6",
            subscriptionId: process.env.WEBSITE_OWNER_NAME ? process.env.WEBSITE_OWNER_NAME.split("+")[0] : null,
        }
    };
    return DiagnosticLogger;
}());
exports.DiagnosticLogger = DiagnosticLogger;
//# sourceMappingURL=DiagnosticLogger.js.map