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
exports.setupAndStart = exports.setStatusLogger = exports.setUsagePrefix = exports.setLogger = void 0;
var Helpers = require("./Helpers");
var Constants = require("../Declarations/Constants");
var StatusLogger_1 = require("./StatusLogger");
var DiagnosticLogger_1 = require("./DiagnosticLogger");
// Private configuration vars
var _appInsights;
var _prefix = "ad_"; // App Services, Default
var _logger = new DiagnosticLogger_1.DiagnosticLogger(console);
var _statusLogger = new StatusLogger_1.StatusLogger(console);
// Env var local constants
var _setupString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || process.env.APPINSIGHTS_INSTRUMENTATIONKEY;
var forceStart = process.env.APPLICATIONINSIGHTS_FORCE_START === "true";
// Other local constants
var defaultStatus = __assign(__assign({}, StatusLogger_1.StatusLogger.DEFAULT_STATUS), { Ikey: _setupString });
/**
 * Sets the attach-time logger
 * @param logger logger which implements the `AgentLogger` interface
 */
function setLogger(logger) {
    return _logger = logger;
}
exports.setLogger = setLogger;
/**
 * Sets the string which is prefixed to the existing sdkVersion, e.g. `ad_`, `alr_`
 * @param prefix string prefix, including underscore. Defaults to `ad_`
 */
function setUsagePrefix(prefix) {
    _prefix = prefix;
}
exports.setUsagePrefix = setUsagePrefix;
function setStatusLogger(statusLogger) {
    _statusLogger = statusLogger;
}
exports.setStatusLogger = setStatusLogger;
/**
 * Try to setup and start this app insights instance if attach is enabled.
 * @param setupString connection string or instrumentation key
 */
function setupAndStart(setupString) {
    if (setupString === void 0) { setupString = _setupString; }
    // If app already contains SDK, skip agent attach
    if (!forceStart && Helpers.sdkAlreadyExists(_logger)) {
        _statusLogger.logStatus(__assign(__assign({}, defaultStatus), { AgentInitializedSuccessfully: false, SDKPresent: true, Reason: "SDK already exists" }));
        return null;
    }
    if (!setupString) {
        var message = "Application Insights wanted to be started, but no Connection String or Instrumentation Key was provided";
        _logger.logError(message);
        _statusLogger.logStatus(__assign(__assign({}, defaultStatus), { AgentInitializedSuccessfully: false, Reason: message }));
        return null;
    }
    try {
        _appInsights = require("../applicationinsights");
        if (_appInsights.defaultClient) {
            // setupAndStart was already called, return the result
            _logger.logError("Setup was attempted on the Application Insights Client multiple times. Aborting and returning the first client instance");
            return _appInsights;
        }
        var prefixInternalSdkVersion = function (envelope, _contextObjects) {
            try {
                var appInsightsSDKVersion = _appInsights.defaultClient.context.keys.internalSdkVersion;
                envelope.tags[appInsightsSDKVersion] = _prefix + envelope.tags[appInsightsSDKVersion];
            }
            catch (e) {
                _logger.logError("Error prefixing SDK version", e);
            }
            return true;
        };
        var copyOverPrefixInternalSdkVersionToHeartBeatMetric = function (envelope, _contextObjects) {
            var appInsightsSDKVersion = _appInsights.defaultClient.context.keys.internalSdkVersion;
            var sdkVersion = envelope.tags[appInsightsSDKVersion] || "";
            if (envelope.name === Constants.HeartBeatMetricName) {
                (envelope.data.baseData).properties = (envelope.data.baseData).properties || {};
                (envelope.data.baseData).properties["sdk"] = sdkVersion;
            }
            return true;
        };
        // Instrument the SDK
        _appInsights.setup(setupString).setSendLiveMetrics(true);
        _appInsights.defaultClient.setAutoPopulateAzureProperties(true);
        _appInsights.defaultClient.addTelemetryProcessor(prefixInternalSdkVersion);
        _appInsights.defaultClient.addTelemetryProcessor(copyOverPrefixInternalSdkVersionToHeartBeatMetric);
        _appInsights.start();
        // Add attach flag in Statsbeat
        var statsbeat = _appInsights.defaultClient.getStatsbeat();
        if (statsbeat) {
            statsbeat.setCodelessAttach();
        }
        // Agent successfully instrumented the SDK
        _logger.logMessage("Application Insights was started with setupString: " + setupString);
        _statusLogger.logStatus(__assign(__assign({}, defaultStatus), { AgentInitializedSuccessfully: true }));
    }
    catch (e) {
        _logger.logError("Error setting up Application Insights", e);
        _statusLogger.logStatus(__assign(__assign({}, defaultStatus), { AgentInitializedSuccessfully: false, Reason: "Error setting up Application Insights: " + (e && e.message) }));
    }
    return _appInsights;
}
exports.setupAndStart = setupAndStart;
//# sourceMappingURL=Default.js.map