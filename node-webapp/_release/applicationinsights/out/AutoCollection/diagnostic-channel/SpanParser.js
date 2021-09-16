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
exports.spanToTelemetryContract = void 0;
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
var api_1 = require("@opentelemetry/api");
var Constants = require("../../Declarations/Constants");
function filterSpanAttributes(attributes) {
    var newAttributes = __assign({}, attributes);
    Object.keys(Constants.SpanAttribute).forEach(function (key) {
        delete newAttributes[key];
    });
    return newAttributes;
}
function spanToTelemetryContract(span) {
    var spanContext = span.spanContext ? span.spanContext() : span.context(); // context is available in OT API <v0.19.0
    var id = "|" + spanContext.traceId + "." + spanContext.spanId + ".";
    var duration = Math.round(span["_duration"][0] * 1e3 + span["_duration"][1] / 1e6);
    var peerAddress = span.attributes["peer.address"] ? span.attributes["peer.address"].toString() : "";
    var isHttp = (!!span.attributes[Constants.SpanAttribute.HttpStatusCode]) || (!!span.attributes[Constants.SpanAttribute.HttpUrl]);
    var isGrpc = (!!span.attributes[Constants.SpanAttribute.GrpcStatusCode]);
    if (isHttp) {
        // Read http span attributes
        var method = span.attributes[Constants.SpanAttribute.HttpMethod] || "GET";
        var url = new URL(span.attributes[Constants.SpanAttribute.HttpUrl]);
        var pathname = url.pathname || "/";
        // Translate to AI Dependency format
        var name_1 = method + " " + pathname;
        var dependencyTypeName = Constants.DependencyTypeName.Http;
        var target = span.attributes[Constants.SpanAttribute.HttpUrl] ? url.hostname : undefined;
        var data = url.toString();
        var resultCode = span.attributes[Constants.SpanAttribute.HttpStatusCode] || span.status.code || 0;
        var success = resultCode < 400; // Status.OK
        return {
            id: id, name: name_1, dependencyTypeName: dependencyTypeName,
            target: target, data: data,
            success: success, duration: duration,
            url: data,
            resultCode: String(resultCode),
            properties: filterSpanAttributes(span.attributes)
        };
    }
    else if (isGrpc) {
        var method = span.attributes[Constants.SpanAttribute.GrpcMethod] || "rpc";
        var service = span.attributes[Constants.SpanAttribute.GrpcService];
        var name_2 = service ? method + " " + service : span.name;
        return {
            id: id, duration: duration, name: name_2,
            target: method.toString(),
            data: service.toString() || name_2,
            url: service.toString() || name_2,
            dependencyTypeName: Constants.DependencyTypeName.Grpc,
            resultCode: String(span.attributes[Constants.SpanAttribute.GrpcStatusCode] || span.status.code || 0),
            success: span.status.code === api_1.SpanStatusCode.OK,
            properties: filterSpanAttributes(span.attributes),
        };
    }
    else {
        var name_3 = span.name;
        var links = span.links && span.links.map(function (link) {
            return {
                operation_Id: link.context.traceId,
                id: link.context.spanId
            };
        });
        return {
            id: id, duration: duration, name: name_3,
            target: span.attributes[Constants.SpanAttribute.HttpUrl] || undefined,
            data: peerAddress || name_3,
            url: peerAddress || name_3,
            dependencyTypeName: span.kind === api_1.SpanKind.INTERNAL ? Constants.DependencyTypeName.InProc : span.name,
            resultCode: String(span.status.code || 0),
            success: span.status.code !== api_1.SpanStatusCode.ERROR,
            properties: __assign(__assign({}, filterSpanAttributes(span.attributes)), { "_MS.links": links || undefined }),
        };
    }
}
exports.spanToTelemetryContract = spanToTelemetryContract;
//# sourceMappingURL=SpanParser.js.map