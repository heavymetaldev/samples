/// <reference types="node" />
import Q = require('q');
import events = require('events');
import ma = require('./mock-answer');
export declare function setAnswers(answers: ma.TaskLibAnswers): void;
export interface IExecOptions extends IExecSyncOptions {
    failOnStdErr?: boolean;
    ignoreReturnCode?: boolean;
}
export interface IExecSyncOptions {
    cwd?: string;
    env?: {
        [key: string]: string | undefined;
    };
    silent?: boolean;
    outStream: NodeJS.WritableStream;
    errStream: NodeJS.WritableStream;
    windowsVerbatimArguments?: boolean;
}
export interface IExecSyncResult {
    stdout: string;
    stderr: string;
    code: number;
    error: Error;
}
export declare function debug(message: any): void;
export declare class ToolRunner extends events.EventEmitter {
    constructor(toolPath: string);
    private toolPath;
    private args;
    private pipeOutputToTool;
    private _debug;
    private _argStringToArray;
    arg(val: any): ToolRunner;
    argIf(condition: any, val: any): ToolRunner;
    line(val: string): ToolRunner;
    pipeExecOutputToTool(tool: ToolRunner): ToolRunner;
    private ignoreTempPath;
    exec(options?: IExecOptions): Q.Promise<number>;
    execSync(options?: IExecSyncOptions): IExecSyncResult;
}
