"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerContextPreservation = exports.IsInitialized = void 0;
var AsyncHooksScopeManager_1 = require("../AsyncHooksScopeManager");
var Logging = require("../../Library/Logging");
exports.IsInitialized = !process.env["APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL"];
var TAG = "DiagnosticChannel";
if (exports.IsInitialized) {
    var publishers = require("diagnostic-channel-publishers");
    var individualOptOuts = process.env["APPLICATION_INSIGHTS_NO_PATCH_MODULES"] || "";
    var unpatchedModules = individualOptOuts.split(",");
    var modules = {
        bunyan: publishers.bunyan,
        console: publishers.console,
        mongodb: publishers.mongodb,
        mongodbCore: publishers.mongodbCore,
        mysql: publishers.mysql,
        redis: publishers.redis,
        pg: publishers.pg,
        pgPool: publishers.pgPool,
        winston: publishers.winston,
        azuresdk: publishers.azuresdk
    };
    for (var mod in modules) {
        if (unpatchedModules.indexOf(mod) === -1) {
            modules[mod].enable();
            Logging.info(TAG, "Subscribed to " + mod + " events");
        }
    }
    if (unpatchedModules.length > 0) {
        Logging.info(TAG, "Some modules will not be patched", unpatchedModules);
    }
}
else {
    Logging.info(TAG, "Not subscribing to dependency autocollection because APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL was set");
}
function registerContextPreservation(cb) {
    if (!exports.IsInitialized) {
        return;
    }
    var diagChannel = require("diagnostic-channel");
    diagChannel.channel.addContextPreservation(cb);
    diagChannel.channel.spanContextPropagator = AsyncHooksScopeManager_1.AsyncScopeManager;
}
exports.registerContextPreservation = registerContextPreservation;
//# sourceMappingURL=initialization.js.map