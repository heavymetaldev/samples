"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enable = exports.subscriber = void 0;
var Constants_1 = require("../../Declarations/Constants");
var diagnostic_channel_1 = require("diagnostic-channel");
var clients = [];
var subscriber = function (event) {
    clients.forEach(function (client) {
        var q = event.data.query;
        var sql = (q.preparable && q.preparable.text) || q.plan || q.text || "unknown query";
        var success = !event.data.error;
        var conn = event.data.database.host + ":" + event.data.database.port;
        client.trackDependency({
            target: conn,
            data: sql,
            name: sql,
            duration: event.data.duration,
            success: success,
            resultCode: success ? "0" : "1",
            time: event.data.time,
            dependencyTypeName: "postgres"
        });
    });
};
exports.subscriber = subscriber;
function enable(enabled, client) {
    var statsbeat = client.getStatsbeat();
    if (enabled) {
        if (clients.length === 0) {
            diagnostic_channel_1.channel.subscribe("postgres", exports.subscriber);
            if (statsbeat) {
                statsbeat.addInstrumentation(Constants_1.StatsbeatInstrumentation.POSTGRES);
            }
        }
        ;
        clients.push(client);
    }
    else {
        clients = clients.filter(function (c) { return c != client; });
        if (clients.length === 0) {
            diagnostic_channel_1.channel.unsubscribe("postgres", exports.subscriber);
            if (statsbeat) {
                statsbeat.removeInstrumentation(Constants_1.StatsbeatInstrumentation.POSTGRES);
            }
        }
    }
}
exports.enable = enable;
//# sourceMappingURL=postgres.sub.js.map