"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enable = exports.subscriber = void 0;
var api_1 = require("@opentelemetry/api");
var Constants_1 = require("../../Declarations/Constants");
var diagnostic_channel_1 = require("diagnostic-channel");
var Traceparent = require("../../Library/Traceparent");
var SpanParser = require("./SpanParser");
var AsyncHooksScopeManager_1 = require("../AsyncHooksScopeManager");
var clients = [];
var subscriber = function (event) {
    try {
        var span_1 = event.data;
        var telemetry_1 = SpanParser.spanToTelemetryContract(span_1);
        var spanContext = span_1.spanContext ? span_1.spanContext() : span_1.context(); // context is available in OT API <v0.19.0
        var traceparent = new Traceparent();
        traceparent.traceId = spanContext.traceId;
        traceparent.spanId = spanContext.spanId;
        traceparent.traceFlag = Traceparent.formatOpenTelemetryTraceFlags(spanContext.traceFlags);
        traceparent.parentId = span_1.parentSpanId ? "|" + spanContext.traceId + "." + span_1.parentSpanId + "." : null;
        AsyncHooksScopeManager_1.AsyncScopeManager.with(span_1, function () {
            clients.forEach(function (client) {
                if (span_1.kind === api_1.SpanKind.SERVER) {
                    // Server or Consumer
                    client.trackRequest(telemetry_1);
                }
                else if (span_1.kind === api_1.SpanKind.CLIENT || span_1.kind === api_1.SpanKind.INTERNAL) {
                    // Client or Producer or Internal
                    client.trackDependency(telemetry_1);
                }
                // else - ignore producer/consumer spans for now until it is clear how this sdk should interpret them
            });
        });
    }
    catch (err) {
        { /** ignore errors */ }
    }
};
exports.subscriber = subscriber;
function enable(enabled, client) {
    var statsbeat = client.getStatsbeat();
    if (enabled) {
        if (clients.length === 0) {
            diagnostic_channel_1.channel.subscribe("azure-coretracing", exports.subscriber);
            if (statsbeat) {
                statsbeat.addInstrumentation(Constants_1.StatsbeatInstrumentation.AZURE_CORE_TRACING);
            }
        }
        ;
        clients.push(client);
    }
    else {
        clients = clients.filter(function (c) { return c != client; });
        if (clients.length === 0) {
            diagnostic_channel_1.channel.unsubscribe("azure-coretracing", exports.subscriber);
            if (statsbeat) {
                statsbeat.removeInstrumentation(Constants_1.StatsbeatInstrumentation.AZURE_CORE_TRACING);
            }
        }
    }
}
exports.enable = enable;
//# sourceMappingURL=azure-coretracing.sub.js.map