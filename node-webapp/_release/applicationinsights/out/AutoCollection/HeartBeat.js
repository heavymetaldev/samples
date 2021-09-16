"use strict";
var os = require("os");
var Vm = require("../Library/AzureVirtualMachine");
var Constants = require("../Declarations/Constants");
var Context = require("../Library/Context");
var HeartBeat = /** @class */ (function () {
    function HeartBeat(client) {
        this._collectionInterval = 900000;
        if (!HeartBeat.INSTANCE) {
            HeartBeat.INSTANCE = this;
        }
        this._isInitialized = false;
        this._client = client;
    }
    HeartBeat.prototype.enable = function (isEnabled, config) {
        var _this = this;
        this._isEnabled = isEnabled;
        if (this._isEnabled && !this._isInitialized) {
            this._isInitialized = true;
        }
        if (isEnabled) {
            if (!this._handle) {
                this._handle = setInterval(function () { return _this.trackHeartBeat(config, function () { }); }, this._collectionInterval);
                this._handle.unref(); // Allow the app to terminate even while this loop is going on
            }
        }
        else {
            if (this._handle) {
                clearInterval(this._handle);
                this._handle = null;
            }
        }
    };
    HeartBeat.prototype.isInitialized = function () {
        return this._isInitialized;
    };
    HeartBeat.isEnabled = function () {
        return HeartBeat.INSTANCE && HeartBeat.INSTANCE._isEnabled;
    };
    HeartBeat.prototype.trackHeartBeat = function (config, callback) {
        var _this = this;
        var waiting = false;
        var properties = {};
        var sdkVersion = Context.sdkVersion; // "node" or "node-nativeperf"
        properties["sdk"] = sdkVersion;
        properties["osType"] = os.type();
        if (process.env.WEBSITE_SITE_NAME) { // Web apps
            properties["appSrv_SiteName"] = process.env.WEBSITE_SITE_NAME || "";
            properties["appSrv_wsStamp"] = process.env.WEBSITE_HOME_STAMPNAME || "";
            properties["appSrv_wsHost"] = process.env.WEBSITE_HOSTNAME || "";
        }
        else if (process.env.FUNCTIONS_WORKER_RUNTIME) { // Function apps
            properties["azfunction_appId"] = process.env.WEBSITE_HOSTNAME;
        }
        else if (config) {
            if (this._isVM === undefined) {
                waiting = true;
                Vm.AzureVirtualMachine.getAzureComputeMetadata(config, function (vmInfo) {
                    _this._isVM = vmInfo.isVM;
                    if (_this._isVM) {
                        properties["azInst_vmId"] = vmInfo.id;
                        properties["azInst_subscriptionId"] = vmInfo.subscriptionId;
                        properties["azInst_osType"] = vmInfo.osType;
                    }
                    _this._client.trackMetric({ name: Constants.HeartBeatMetricName, value: 0, properties: properties });
                    callback();
                });
            }
        }
        if (!waiting) {
            this._client.trackMetric({ name: Constants.HeartBeatMetricName, value: 0, properties: properties });
            callback();
        }
    };
    HeartBeat.prototype.dispose = function () {
        HeartBeat.INSTANCE = null;
        this.enable(false);
        this._isInitialized = false;
    };
    return HeartBeat;
}());
module.exports = HeartBeat;
//# sourceMappingURL=HeartBeat.js.map