"use strict";
var CorrelationIdManager = require("./CorrelationIdManager");
var ConnectionStringParser = require("./ConnectionStringParser");
var Logging = require("./Logging");
var Constants = require("../Declarations/Constants");
var url = require("url");
var Config = /** @class */ (function () {
    function Config(setupString) {
        var _this = this;
        this.endpointBase = Constants.DEFAULT_BREEZE_ENDPOINT;
        var connectionStringEnv = process.env[Config.ENV_connectionString];
        var csCode = ConnectionStringParser.parse(setupString);
        var csEnv = ConnectionStringParser.parse(connectionStringEnv);
        var iKeyCode = !csCode.instrumentationkey && Object.keys(csCode).length > 0
            ? null // CS was valid but instrumentation key was not provided, null and grab from env var
            : setupString; // CS was invalid, so it must be an ikey
        this.instrumentationKey = csCode.instrumentationkey || iKeyCode /* === instrumentationKey */ || csEnv.instrumentationkey || Config._getInstrumentationKey();
        // validate ikey. If fails throw a warning
        if (!Config._validateInstrumentationKey(this.instrumentationKey)) {
            Logging.warn("An invalid instrumentation key was provided. There may be resulting telemetry loss", this.instrumentationKey);
        }
        this.endpointUrl = (csCode.ingestionendpoint || csEnv.ingestionendpoint || this.endpointBase) + "/v2.1/track";
        this.maxBatchSize = 250;
        this.maxBatchIntervalMs = 15000;
        this.disableAppInsights = false;
        this.samplingPercentage = 100;
        this.correlationIdRetryIntervalMs = 30 * 1000;
        this.correlationHeaderExcludedDomains = [
            "*.core.windows.net",
            "*.core.chinacloudapi.cn",
            "*.core.cloudapi.de",
            "*.core.usgovcloudapi.net",
            "*.core.microsoft.scloud",
            "*.core.eaglex.ic.gov"
        ];
        this.setCorrelationId = function (correlationId) { return _this.correlationId = correlationId; };
        this.proxyHttpUrl = process.env[Config.ENV_http_proxy] || undefined;
        this.proxyHttpsUrl = process.env[Config.ENV_https_proxy] || undefined;
        this.httpAgent = undefined;
        this.httpsAgent = undefined;
        this.profileQueryEndpoint = csCode.ingestionendpoint || csEnv.ingestionendpoint || process.env[Config.ENV_profileQueryEndpoint] || this.endpointBase;
        this._quickPulseHost = csCode.liveendpoint || csEnv.liveendpoint || process.env[Config.ENV_quickPulseHost] || Constants.DEFAULT_LIVEMETRICS_HOST;
        // Parse quickPulseHost if it starts with http(s)://
        if (this._quickPulseHost.match(/^https?:\/\//)) {
            this._quickPulseHost = new url.URL(this._quickPulseHost).host;
        }
    }
    Object.defineProperty(Config.prototype, "profileQueryEndpoint", {
        get: function () {
            return this._profileQueryEndpoint;
        },
        set: function (endpoint) {
            CorrelationIdManager.cancelCorrelationIdQuery(this, this.setCorrelationId);
            this._profileQueryEndpoint = endpoint;
            this.correlationId = CorrelationIdManager.correlationIdPrefix; // Reset the correlationId while we wait for the new query
            CorrelationIdManager.queryCorrelationId(this, this.setCorrelationId);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Config.prototype, "quickPulseHost", {
        get: function () {
            return this._quickPulseHost;
        },
        set: function (host) {
            this._quickPulseHost = host;
        },
        enumerable: false,
        configurable: true
    });
    Config._getInstrumentationKey = function () {
        // check for both the documented env variable and the azure-prefixed variable
        var iKey = process.env[Config.ENV_iKey]
            || process.env[Config.ENV_azurePrefix + Config.ENV_iKey]
            || process.env[Config.legacy_ENV_iKey]
            || process.env[Config.ENV_azurePrefix + Config.legacy_ENV_iKey];
        if (!iKey || iKey == "") {
            throw new Error("Instrumentation key not found, pass the key in the config to this method or set the key in the environment variable APPINSIGHTS_INSTRUMENTATIONKEY before starting the server");
        }
        return iKey;
    };
    /**
    * Validate UUID Format
    * Specs taken from breeze repo
    * The definition of a VALID instrumentation key is as follows:
    * Not none
    * Not empty
    * Every character is a hex character [0-9a-f]
    * 32 characters are separated into 5 sections via 4 dashes
    * First section has 8 characters
    * Second section has 4 characters
    * Third section has 4 characters
    * Fourth section has 4 characters
    * Fifth section has 12 characters
    */
    Config._validateInstrumentationKey = function (iKey) {
        var UUID_Regex = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        var regexp = new RegExp(UUID_Regex);
        return regexp.test(iKey);
    };
    // Azure adds this prefix to all environment variables
    Config.ENV_azurePrefix = "APPSETTING_";
    // This key is provided in the readme
    Config.ENV_iKey = "APPINSIGHTS_INSTRUMENTATIONKEY";
    Config.legacy_ENV_iKey = "APPINSIGHTS_INSTRUMENTATION_KEY";
    Config.ENV_profileQueryEndpoint = "APPINSIGHTS_PROFILE_QUERY_ENDPOINT";
    Config.ENV_quickPulseHost = "APPINSIGHTS_QUICKPULSE_HOST";
    // Azure Connection String
    Config.ENV_connectionString = "APPLICATIONINSIGHTS_CONNECTION_STRING";
    // Native Metrics Opt Outs
    Config.ENV_nativeMetricsDisablers = "APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC";
    Config.ENV_nativeMetricsDisableAll = "APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS";
    Config.ENV_http_proxy = "http_proxy";
    Config.ENV_https_proxy = "https_proxy";
    return Config;
}());
module.exports = Config;
//# sourceMappingURL=Config.js.map