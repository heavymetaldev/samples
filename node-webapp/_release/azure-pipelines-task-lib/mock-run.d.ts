import ma = require('./mock-answer');
export declare class TaskMockRunner {
    constructor(taskPath: string);
    _taskPath: string;
    _answers: ma.TaskLibAnswers | undefined;
    _exports: {
        [key: string]: any;
    };
    _moduleCount: number;
    setInput(name: string, val: string): void;
    setVariableName(name: string, val: string, isSecret?: boolean): void;
    /**
     * Register answers for the mock "azure-pipelines-task-lib/task" instance.
     *
     * @param answers   Answers to be returned when the task lib functions are called.
     */
    setAnswers(answers: ma.TaskLibAnswers): void;
    /**
    * Register a mock module. When require() is called for the module name,
    * the mock implementation will be returned instead.
    *
    * @param modName    Module name to override.
    * @param val        Mock implementation of the module.
    * @returns          void
    */
    registerMock(modName: string, mod: any): void;
    /**
    * Registers an override for a specific function on the mock "azure-pipelines-task-lib/task" instance.
    * This can be used in conjunction with setAnswers(), for cases where additional runtime
    * control is needed for a specific function.
    *
    * @param key    Function or field to override.
    * @param val    Function or field value.
    * @returns      void
    */
    registerMockExport(key: string, val: any): void;
    /**
    * Runs a task script.
    *
    * @param noMockTask     Indicates whether to mock "azure-pipelines-task-lib/task". Default is to mock.
    * @returns              void
    */
    run(noMockTask?: boolean): void;
}
