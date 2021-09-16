"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAnswers = void 0;
var MockAnswers = /** @class */ (function () {
    function MockAnswers() {
    }
    MockAnswers.prototype.initialize = function (answers) {
        if (!answers) {
            throw new Error('Answers not supplied');
        }
        this._answers = answers;
    };
    MockAnswers.prototype.getResponse = function (cmd, key, debug) {
        debug("looking up mock answers for " + JSON.stringify(cmd) + ", key '" + JSON.stringify(key) + "'");
        if (!this._answers) {
            throw new Error('Must initialize');
        }
        if (!this._answers[cmd]) {
            debug("no mock responses registered for " + JSON.stringify(cmd));
            return null;
        }
        var cmd_answer = this._answers[cmd];
        //use this construction to avoid falsy zero
        if (cmd_answer[key] != null) {
            debug('found mock response');
            return cmd_answer[key];
        }
        if (key && process.env['MOCK_NORMALIZE_SLASHES'] === 'true') {
            // try normalizing the slashes
            var key2 = key.replace(/\\/g, "/");
            if (cmd_answer[key2]) {
                debug('found mock response for normalized key');
                return cmd_answer[key2];
            }
        }
        debug('mock response not found');
        return null;
    };
    return MockAnswers;
}());
exports.MockAnswers = MockAnswers;
