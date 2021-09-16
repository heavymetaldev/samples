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
var os = require("os");
var EnvelopeFactory = require("../Library/EnvelopeFactory");
var Logging = require("../Library/Logging");
var Sender = require("../Library/Sender");
var Constants = require("../Declarations/Constants");
var Contracts = require("../Declarations/Contracts");
var Vm = require("../Library/AzureVirtualMachine");
var Config = require("../Library/Config");
var Context = require("../Library/Context");
var Network = require("./NetworkStatsbeat");
var STATSBEAT_LANGUAGE = "node";
var Statsbeat = /** @class */ (function () {
    function Statsbeat(config) {
        this._attach = Constants.StatsbeatAttach.sdk; // Default is SDK
        this._feature = Constants.StatsbeatFeature.NONE;
        this._instrumentation = Constants.StatsbeatInstrumentation.NONE;
        this._isInitialized = false;
        this._statbeatMetrics = [];
        this._networkStatsbeatCollection = [];
        this._config = config;
        this._statsbeatConfig = new Config(Statsbeat.CONNECTION_STRING);
        this._sender = new Sender(this._statsbeatConfig);
    }
    Statsbeat.prototype.enable = function (isEnabled) {
        var _this = this;
        this._isEnabled = isEnabled;
        if (this._isEnabled && !this._isInitialized) {
            this._getCustomProperties();
            this._isInitialized = true;
        }
        if (isEnabled) {
            if (!this._handle) {
                this._handle = setInterval(function () {
                    _this.trackShortIntervalStatsbeats().catch(function (error) {
                        // Failed to send Statsbeat
                        Logging.info(Statsbeat.TAG, error);
                    });
                }, Statsbeat.STATS_COLLECTION_SHORT_INTERVAL);
                this._handle.unref(); // Allow the app to terminate even while this loop is going on
            }
            if (!this._longHandle) {
                // On first enablement
                this.trackLongIntervalStatsbeats().catch(function (error) {
                    // Failed to send Statsbeat
                    Logging.info(Statsbeat.TAG, error);
                });
                this._longHandle = setInterval(function () {
                    _this.trackLongIntervalStatsbeats().catch(function (error) {
                        // Failed to send Statsbeat
                        Logging.info(Statsbeat.TAG, error);
                    });
                }, Statsbeat.STATS_COLLECTION_LONG_INTERVAL);
                this._longHandle.unref(); // Allow the app to terminate even while this loop is going on
            }
        }
        else {
            if (this._handle) {
                clearInterval(this._handle);
                this._handle = null;
            }
            if (this._longHandle) {
                clearInterval(this._longHandle);
                this._longHandle = null;
            }
        }
    };
    Statsbeat.prototype.isInitialized = function () {
        return this._isInitialized;
    };
    Statsbeat.prototype.isEnabled = function () {
        return this._isEnabled;
    };
    Statsbeat.prototype.setCodelessAttach = function () {
        this._attach = Constants.StatsbeatAttach.codeless;
    };
    Statsbeat.prototype.addFeature = function (feature) {
        this._feature |= feature;
    };
    Statsbeat.prototype.removeFeature = function (feature) {
        this._feature &= ~feature;
    };
    Statsbeat.prototype.addInstrumentation = function (instrumentation) {
        this._instrumentation |= instrumentation;
    };
    Statsbeat.prototype.removeInstrumentation = function (instrumentation) {
        this._instrumentation &= ~instrumentation;
    };
    Statsbeat.prototype.countRequest = function (category, endpoint, duration, success) {
        if (!this.isEnabled()) {
            return;
        }
        var counter = this._getNetworkStatsbeatCounter(category, endpoint);
        counter.totalRequestCount++;
        counter.intervalRequestExecutionTime += duration;
        if (success === false) {
            counter.totalFailedRequestCount++;
        }
        else {
            counter.totalSuccesfulRequestCount++;
        }
    };
    Statsbeat.prototype.countException = function (category, endpoint) {
        if (!this.isEnabled()) {
            return;
        }
        var counter = this._getNetworkStatsbeatCounter(category, endpoint);
        counter.exceptionCount++;
    };
    Statsbeat.prototype.countThrottle = function (category, endpoint) {
        if (!this.isEnabled()) {
            return;
        }
        var counter = this._getNetworkStatsbeatCounter(category, endpoint);
        counter.throttleCount++;
    };
    Statsbeat.prototype.countRetry = function (category, endpoint) {
        if (!this.isEnabled()) {
            return;
        }
        var counter = this._getNetworkStatsbeatCounter(category, endpoint);
        counter.retryCount++;
    };
    Statsbeat.prototype.trackShortIntervalStatsbeats = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                this._getResourceProvider(function () { return __awaiter(_this, void 0, void 0, function () {
                    var networkProperties;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                networkProperties = {
                                    "os": this._os,
                                    "rp": this._resourceProvider,
                                    "cikey": this._cikey,
                                    "runtimeVersion": this._runtimeVersion,
                                    "language": this._language,
                                    "version": this._sdkVersion,
                                    "attach": this._attach,
                                };
                                this._trackRequestDuration(networkProperties);
                                this._trackRequestsCount(networkProperties);
                                return [4 /*yield*/, this._sendStatsbeats()];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        });
    };
    Statsbeat.prototype.trackLongIntervalStatsbeats = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                this._getResourceProvider(function () { return __awaiter(_this, void 0, void 0, function () {
                    var commonProperties, attachProperties, featureProperties, instrumentationProperties;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                commonProperties = {
                                    "os": this._os,
                                    "rp": this._resourceProvider,
                                    "cikey": this._cikey,
                                    "runtimeVersion": this._runtimeVersion,
                                    "language": this._language,
                                    "version": this._sdkVersion,
                                    "attach": this._attach,
                                };
                                attachProperties = Object.assign({
                                    "rpid": this._resourceIdentifier,
                                }, commonProperties);
                                this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.ATTACH, value: 1, properties: attachProperties });
                                featureProperties = Object.assign({ "feature": this._feature, "type": Constants.StatsbeatFeatureType.Feature }, commonProperties);
                                instrumentationProperties = Object.assign({ "feature": this._instrumentation, "type": Constants.StatsbeatFeatureType.Instrumentation }, commonProperties);
                                this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.FEATURE, value: 1, properties: instrumentationProperties });
                                this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.FEATURE, value: 1, properties: featureProperties });
                                return [4 /*yield*/, this._sendStatsbeats()];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        });
    };
    Statsbeat.prototype._getNetworkStatsbeatCounter = function (endpoint, host) {
        // Check if counter is available
        for (var i = 0; i < this._networkStatsbeatCollection.length; i++) {
            // Same object
            if (endpoint === this._networkStatsbeatCollection[i].endpoint &&
                host === this._networkStatsbeatCollection[i].host) {
                return this._networkStatsbeatCollection[i];
            }
        }
        // Create a new one if not found
        var newCounter = new Network.NetworkStatsbeat(endpoint, host);
        this._networkStatsbeatCollection.push(newCounter);
        return newCounter;
    };
    Statsbeat.prototype._trackRequestDuration = function (commonProperties) {
        for (var i = 0; i < this._networkStatsbeatCollection.length; i++) {
            var currentCounter = this._networkStatsbeatCollection[i];
            currentCounter.time = +new Date;
            var intervalRequests = (currentCounter.totalRequestCount - currentCounter.lastRequestCount) || 0;
            var elapsedMs = currentCounter.time - currentCounter.lastTime;
            var averageRequestExecutionTime = ((currentCounter.intervalRequestExecutionTime - currentCounter.lastIntervalRequestExecutionTime) / intervalRequests) || 0;
            currentCounter.lastIntervalRequestExecutionTime = currentCounter.intervalRequestExecutionTime; // reset
            if (elapsedMs > 0 && intervalRequests > 0) {
                // Add extra properties
                var properties = Object.assign({ "endpoint": this._networkStatsbeatCollection[i].endpoint, "host": this._networkStatsbeatCollection[i].host }, commonProperties);
                this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.REQUEST_DURATION, value: averageRequestExecutionTime, properties: properties });
            }
            // Set last counters
            currentCounter.lastRequestCount = currentCounter.totalRequestCount;
            currentCounter.lastTime = currentCounter.time;
        }
    };
    Statsbeat.prototype._trackRequestsCount = function (commonProperties) {
        for (var i = 0; i < this._networkStatsbeatCollection.length; i++) {
            var currentCounter = this._networkStatsbeatCollection[i];
            var properties = Object.assign({ "endpoint": currentCounter.endpoint, "host": currentCounter.host }, commonProperties);
            if (currentCounter.totalSuccesfulRequestCount > 0) {
                this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.REQUEST_SUCCESS, value: currentCounter.totalSuccesfulRequestCount, properties: properties });
                currentCounter.totalSuccesfulRequestCount = 0; //Reset
            }
            if (currentCounter.totalFailedRequestCount > 0) {
                this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.REQUEST_FAILURE, value: currentCounter.totalFailedRequestCount, properties: properties });
                currentCounter.totalFailedRequestCount = 0; //Reset
            }
            if (currentCounter.retryCount > 0) {
                this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.RETRY_COUNT, value: currentCounter.retryCount, properties: properties });
                currentCounter.retryCount = 0; //Reset
            }
            if (currentCounter.throttleCount > 0) {
                this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.THROTTLE_COUNT, value: currentCounter.throttleCount, properties: properties });
                currentCounter.throttleCount = 0; //Reset
            }
            if (currentCounter.exceptionCount > 0) {
                this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.EXCEPTION_COUNT, value: currentCounter.exceptionCount, properties: properties });
                currentCounter.exceptionCount = 0; //Reset
            }
        }
    };
    Statsbeat.prototype._sendStatsbeats = function () {
        return __awaiter(this, void 0, void 0, function () {
            var envelopes, i, statsbeat, envelope;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        envelopes = [];
                        for (i = 0; i < this._statbeatMetrics.length; i++) {
                            statsbeat = {
                                name: this._statbeatMetrics[i].name,
                                value: this._statbeatMetrics[i].value,
                                properties: this._statbeatMetrics[i].properties
                            };
                            envelope = EnvelopeFactory.createEnvelope(statsbeat, Contracts.TelemetryType.Metric, null, null, this._statsbeatConfig);
                            envelope.name = Constants.StatsbeatTelemetryName;
                            envelopes.push(envelope);
                        }
                        this._statbeatMetrics = [];
                        return [4 /*yield*/, this._sender.send(envelopes)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Statsbeat.prototype._getCustomProperties = function () {
        this._language = STATSBEAT_LANGUAGE;
        this._cikey = this._config.instrumentationKey;
        this._sdkVersion = Context.sdkVersion; // "node" or "node-nativeperf"
        this._os = os.type();
        this._runtimeVersion = process.version;
    };
    Statsbeat.prototype._getResourceProvider = function (callback) {
        var _this = this;
        // Check resource provider
        var waiting = false;
        this._resourceProvider = Constants.StatsbeatResourceProvider.unknown;
        this._resourceIdentifier = Constants.StatsbeatResourceProvider.unknown;
        if (process.env.WEBSITE_SITE_NAME) { // Web apps
            this._resourceProvider = Constants.StatsbeatResourceProvider.appsvc;
            this._resourceIdentifier = process.env.WEBSITE_SITE_NAME;
            if (process.env.WEBSITE_HOME_STAMPNAME) {
                this._resourceIdentifier += "/" + process.env.WEBSITE_HOME_STAMPNAME;
            }
        }
        else if (process.env.FUNCTIONS_WORKER_RUNTIME) { // Function apps
            this._resourceProvider = Constants.StatsbeatResourceProvider.function;
            if (process.env.WEBSITE_HOSTNAME) {
                this._resourceIdentifier = process.env.WEBSITE_HOSTNAME;
            }
        }
        else if (this._config) {
            if (this._isVM === undefined || this._isVM == true) {
                waiting = true;
                Vm.AzureVirtualMachine.getAzureComputeMetadata(this._config, function (vmInfo) {
                    _this._isVM = vmInfo.isVM;
                    if (_this._isVM) {
                        _this._resourceProvider = Constants.StatsbeatResourceProvider.vm;
                        _this._resourceIdentifier = vmInfo.id + "/" + vmInfo.subscriptionId;
                        // Override OS as VM info have higher precedence
                        if (vmInfo.osType) {
                            _this._os = vmInfo.osType;
                        }
                    }
                    callback();
                });
            }
            else {
                this._resourceProvider = Constants.StatsbeatResourceProvider.unknown;
            }
        }
        if (!waiting) {
            callback();
        }
    };
    Statsbeat.CONNECTION_STRING = "InstrumentationKey=c4a29126-a7cb-47e5-b348-11414998b11e;IngestionEndpoint=https://dc.services.visualstudio.com/";
    Statsbeat.STATS_COLLECTION_SHORT_INTERVAL = 900000; // 15 minutes
    Statsbeat.STATS_COLLECTION_LONG_INTERVAL = 1440000; // 1 day
    Statsbeat.TAG = "Statsbeat";
    return Statsbeat;
}());
module.exports = Statsbeat;
//# sourceMappingURL=Statsbeat.js.map