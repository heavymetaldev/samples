"use strict";
var http = require("http");
var https = require("https");
var Logging = require("../Library/Logging");
var Util = require("../Library/Util");
var RequestResponseHeaders = require("../Library/RequestResponseHeaders");
var HttpRequestParser = require("./HttpRequestParser");
var CorrelationContextManager_1 = require("./CorrelationContextManager");
var AutoCollectPerformance = require("./Performance");
var AutoCollectHttpRequests = /** @class */ (function () {
    function AutoCollectHttpRequests(client) {
        if (!!AutoCollectHttpRequests.INSTANCE) {
            throw new Error("Server request tracking should be configured from the applicationInsights object");
        }
        AutoCollectHttpRequests.INSTANCE = this;
        this._client = client;
    }
    AutoCollectHttpRequests.prototype.enable = function (isEnabled) {
        this._isEnabled = isEnabled;
        // Autocorrelation requires automatic monitoring of incoming server requests
        // Disabling autocollection but enabling autocorrelation will still enable
        // request monitoring but will not produce request events
        if ((this._isAutoCorrelating || this._isEnabled || AutoCollectPerformance.isEnabled()) && !this._isInitialized) {
            this.useAutoCorrelation(this._isAutoCorrelating);
            this._initialize();
        }
    };
    AutoCollectHttpRequests.prototype.useAutoCorrelation = function (isEnabled, forceClsHooked) {
        if (isEnabled && !this._isAutoCorrelating) {
            CorrelationContextManager_1.CorrelationContextManager.enable(forceClsHooked);
        }
        else if (!isEnabled && this._isAutoCorrelating) {
            CorrelationContextManager_1.CorrelationContextManager.disable();
        }
        this._isAutoCorrelating = isEnabled;
    };
    AutoCollectHttpRequests.prototype.isInitialized = function () {
        return this._isInitialized;
    };
    AutoCollectHttpRequests.prototype.isAutoCorrelating = function () {
        return this._isAutoCorrelating;
    };
    AutoCollectHttpRequests.prototype._generateCorrelationContext = function (requestParser) {
        if (!this._isAutoCorrelating) {
            return;
        }
        return CorrelationContextManager_1.CorrelationContextManager.generateContextObject(requestParser.getOperationId(this._client.context.tags), requestParser.getRequestId(), requestParser.getOperationName(this._client.context.tags), requestParser.getCorrelationContextHeader(), requestParser.getTraceparent(), requestParser.getTracestate());
    };
    AutoCollectHttpRequests.prototype._initialize = function () {
        var _this = this;
        this._isInitialized = true;
        var wrapOnRequestHandler = function (onRequest) {
            if (!onRequest) {
                return undefined;
            }
            if (typeof onRequest !== 'function') {
                throw new Error('onRequest handler must be a function');
            }
            return function (request, response) {
                CorrelationContextManager_1.CorrelationContextManager.wrapEmitter(request);
                CorrelationContextManager_1.CorrelationContextManager.wrapEmitter(response);
                var shouldCollect = request && !request[AutoCollectHttpRequests.alreadyAutoCollectedFlag];
                if (request && shouldCollect) {
                    // Set up correlation context
                    var requestParser_1 = new HttpRequestParser(request);
                    var correlationContext = _this._generateCorrelationContext(requestParser_1);
                    // Note: Check for if correlation is enabled happens within this method.
                    // If not enabled, function will directly call the callback.
                    CorrelationContextManager_1.CorrelationContextManager.runWithContext(correlationContext, function () {
                        if (_this._isEnabled) {
                            // Mark as auto collected
                            request[AutoCollectHttpRequests.alreadyAutoCollectedFlag] = true;
                            // Auto collect request
                            AutoCollectHttpRequests.trackRequest(_this._client, { request: request, response: response }, requestParser_1);
                        }
                        if (typeof onRequest === "function") {
                            onRequest(request, response);
                        }
                    });
                }
                else {
                    if (typeof onRequest === "function") {
                        onRequest(request, response);
                    }
                }
            };
        };
        // The `http.createServer` function will instantiate a new http.Server object.
        // Inside the Server's constructor, it is using addListener to register the
        // onRequest handler. So there are two ways to inject the wrapped onRequest handler:
        // 1) Overwrite Server.prototype.addListener (and .on()) globally and not patching
        //    the http.createServer call. Or
        // 2) Overwrite the http.createServer method and add a patched addListener to the
        //    fresh server instance. This seems more stable for possible future changes as
        //    it also covers the case where the Server might not use addListener to manage
        //    the callback internally.
        //    And also as long as the constructor uses addListener to add the handle, it is
        //    ok to patch the addListener after construction only. Because if we would patch
        //    the prototype one and the createServer method, we would wrap the handler twice
        //    in case of the constructor call.
        var wrapServerEventHandler = function (server) {
            var originalAddListener = server.addListener.bind(server);
            server.addListener = function (eventType, eventHandler) {
                switch (eventType) {
                    case 'request':
                    case 'checkContinue':
                        return originalAddListener(eventType, wrapOnRequestHandler(eventHandler));
                    default:
                        return originalAddListener(eventType, eventHandler);
                }
            };
            // on is an alias to addListener only
            server.on = server.addListener;
        };
        var originalHttpServer = http.createServer;
        // options parameter was added in Node.js v9.6.0, v8.12.0
        // function createServer(requestListener?: RequestListener): Server;
        // function createServer(options: ServerOptions, requestListener?: RequestListener): Server;
        http.createServer = function (param1, param2) {
            // todo: get a pointer to the server so the IP address can be read from server.address
            if (param2 && typeof param2 === 'function') {
                var server = originalHttpServer(param1, wrapOnRequestHandler(param2));
                wrapServerEventHandler(server);
                return server;
            }
            else {
                var server = originalHttpServer(wrapOnRequestHandler(param1));
                wrapServerEventHandler(server);
                return server;
            }
        };
        var originalHttpsServer = https.createServer;
        https.createServer = function (options, onRequest) {
            var server = originalHttpsServer(options, wrapOnRequestHandler(onRequest));
            wrapServerEventHandler(server);
            return server;
        };
    };
    /**
     * Tracks a request synchronously (doesn't wait for response 'finish' event)
     */
    AutoCollectHttpRequests.trackRequestSync = function (client, telemetry) {
        if (!telemetry.request || !telemetry.response || !client) {
            Logging.info("AutoCollectHttpRequests.trackRequestSync was called with invalid parameters: ", !telemetry.request, !telemetry.response, !client);
            return;
        }
        AutoCollectHttpRequests.addResponseCorrelationIdHeader(client, telemetry.response);
        // store data about the request
        var correlationContext = CorrelationContextManager_1.CorrelationContextManager.getCurrentContext();
        var requestParser = new HttpRequestParser(telemetry.request, (correlationContext && correlationContext.operation.parentId));
        // Overwrite correlation context with request parser results
        if (correlationContext) {
            correlationContext.operation.id = requestParser.getOperationId(client.context.tags) || correlationContext.operation.id;
            correlationContext.operation.name = requestParser.getOperationName(client.context.tags) || correlationContext.operation.name;
            correlationContext.operation.parentId = requestParser.getRequestId() || correlationContext.operation.parentId;
            correlationContext.customProperties.addHeaderData(requestParser.getCorrelationContextHeader());
        }
        AutoCollectHttpRequests.endRequest(client, requestParser, telemetry, telemetry.duration, telemetry.error);
    };
    /**
     * Tracks a request by listening to the response 'finish' event
     */
    AutoCollectHttpRequests.trackRequest = function (client, telemetry, _requestParser) {
        if (!telemetry.request || !telemetry.response || !client) {
            Logging.info("AutoCollectHttpRequests.trackRequest was called with invalid parameters: ", !telemetry.request, !telemetry.response, !client);
            return;
        }
        // store data about the request
        var correlationContext = CorrelationContextManager_1.CorrelationContextManager.getCurrentContext();
        var requestParser = _requestParser || new HttpRequestParser(telemetry.request, correlationContext && correlationContext.operation.parentId);
        if (Util.canIncludeCorrelationHeader(client, requestParser.getUrl())) {
            AutoCollectHttpRequests.addResponseCorrelationIdHeader(client, telemetry.response);
        }
        // Overwrite correlation context with request parser results (if not an automatic track. we've already precalculated the correlation context in that case)
        if (correlationContext && !_requestParser) {
            correlationContext.operation.id = requestParser.getOperationId(client.context.tags) || correlationContext.operation.id;
            correlationContext.operation.name = requestParser.getOperationName(client.context.tags) || correlationContext.operation.name;
            correlationContext.operation.parentId = requestParser.getOperationParentId(client.context.tags) || correlationContext.operation.parentId;
            correlationContext.customProperties.addHeaderData(requestParser.getCorrelationContextHeader());
        }
        // response listeners
        if (telemetry.response.once) {
            telemetry.response.once("finish", function () {
                AutoCollectHttpRequests.endRequest(client, requestParser, telemetry, null, null);
            });
        }
        // track a failed request if an error is emitted
        if (telemetry.request.on) {
            telemetry.request.on("error", function (error) {
                AutoCollectHttpRequests.endRequest(client, requestParser, telemetry, null, error);
            });
        }
        // track an aborted request if an aborted event is emitted
        if (telemetry.request.on) {
            telemetry.request.on("aborted", function () {
                var errorMessage = "The request has been aborted and the network socket has closed.";
                AutoCollectHttpRequests.endRequest(client, requestParser, telemetry, null, errorMessage);
            });
        }
    };
    /**
     * Add the target correlationId to the response headers, if not already provided.
     */
    AutoCollectHttpRequests.addResponseCorrelationIdHeader = function (client, response) {
        if (client.config && client.config.correlationId &&
            response.getHeader && response.setHeader && !response.headersSent) {
            var correlationHeader = response.getHeader(RequestResponseHeaders.requestContextHeader);
            Util.safeIncludeCorrelationHeader(client, response, correlationHeader);
        }
    };
    AutoCollectHttpRequests.endRequest = function (client, requestParser, telemetry, ellapsedMilliseconds, error) {
        if (error) {
            requestParser.onError(error, ellapsedMilliseconds);
        }
        else {
            requestParser.onResponse(telemetry.response, ellapsedMilliseconds);
        }
        var requestTelemetry = requestParser.getRequestTelemetry(telemetry);
        requestTelemetry.tagOverrides = requestParser.getRequestTags(client.context.tags);
        if (telemetry.tagOverrides) {
            for (var key in telemetry.tagOverrides) {
                requestTelemetry.tagOverrides[key] = telemetry.tagOverrides[key];
            }
        }
        var legacyRootId = requestParser.getLegacyRootId();
        if (legacyRootId) {
            requestTelemetry.properties["ai_legacyRootId"] = legacyRootId;
        }
        requestTelemetry.contextObjects = requestTelemetry.contextObjects || {};
        requestTelemetry.contextObjects["http.ServerRequest"] = telemetry.request;
        requestTelemetry.contextObjects["http.ServerResponse"] = telemetry.response;
        client.trackRequest(requestTelemetry);
    };
    AutoCollectHttpRequests.prototype.dispose = function () {
        AutoCollectHttpRequests.INSTANCE = null;
        this.enable(false);
        this._isInitialized = false;
        CorrelationContextManager_1.CorrelationContextManager.disable();
        this._isAutoCorrelating = false;
    };
    AutoCollectHttpRequests.alreadyAutoCollectedFlag = '_appInsightsAutoCollected';
    return AutoCollectHttpRequests;
}());
module.exports = AutoCollectHttpRequests;
//# sourceMappingURL=HttpRequests.js.map