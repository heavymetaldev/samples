"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskMockRunner = void 0;
var mockery = require("mockery");
var im = require("./internal");
var TaskMockRunner = /** @class */ (function () {
    function TaskMockRunner(taskPath) {
        this._exports = {};
        this._moduleCount = 0;
        this._taskPath = taskPath;
    }
    TaskMockRunner.prototype.setInput = function (name, val) {
        var key = im._getVariableKey(name);
        process.env['INPUT_' + key] = val;
    };
    TaskMockRunner.prototype.setVariableName = function (name, val, isSecret) {
        var key = im._getVariableKey(name);
        if (isSecret) {
            process.env['SECRET_' + key] = val;
        }
        else {
            process.env['VSTS_TASKVARIABLE_' + key] = val;
        }
    };
    /**
     * Register answers for the mock "azure-pipelines-task-lib/task" instance.
     *
     * @param answers   Answers to be returned when the task lib functions are called.
     */
    TaskMockRunner.prototype.setAnswers = function (answers) {
        this._answers = answers;
    };
    /**
    * Register a mock module. When require() is called for the module name,
    * the mock implementation will be returned instead.
    *
    * @param modName    Module name to override.
    * @param val        Mock implementation of the module.
    * @returns          void
    */
    TaskMockRunner.prototype.registerMock = function (modName, mod) {
        this._moduleCount++;
        mockery.registerMock(modName, mod);
    };
    /**
    * Registers an override for a specific function on the mock "azure-pipelines-task-lib/task" instance.
    * This can be used in conjunction with setAnswers(), for cases where additional runtime
    * control is needed for a specific function.
    *
    * @param key    Function or field to override.
    * @param val    Function or field value.
    * @returns      void
    */
    TaskMockRunner.prototype.registerMockExport = function (key, val) {
        this._exports[key] = val;
    };
    /**
    * Runs a task script.
    *
    * @param noMockTask     Indicates whether to mock "azure-pipelines-task-lib/task". Default is to mock.
    * @returns              void
    */
    TaskMockRunner.prototype.run = function (noMockTask) {
        var _this = this;
        // determine whether to enable mockery
        if (!noMockTask || this._moduleCount) {
            mockery.enable({ warnOnUnregistered: false });
        }
        // answers and exports not compatible with "noMockTask" mode
        if (noMockTask) {
            if (this._answers || Object.keys(this._exports).length) {
                throw new Error('setAnswers() and registerMockExport() is not compatible with "noMockTask" mode');
            }
        }
        // register mock task lib
        else {
            var tlm = require('azure-pipelines-task-lib/mock-task');
            if (this._answers) {
                tlm.setAnswers(this._answers);
            }
            Object.keys(this._exports)
                .forEach(function (key) {
                tlm[key] = _this._exports[key];
            });
            mockery.registerMock('azure-pipelines-task-lib/task', tlm);
        }
        // run it
        require(this._taskPath);
    };
    return TaskMockRunner;
}());
exports.TaskMockRunner = TaskMockRunner;
