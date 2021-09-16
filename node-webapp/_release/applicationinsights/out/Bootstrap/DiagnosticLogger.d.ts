import * as DataModel from "./DataModel";
export declare class DiagnosticLogger {
    private _writer;
    static readonly DEFAULT_FILE_NAME: string;
    static readonly DEFAULT_LOG_DIR: string;
    static DefaultEnvelope: DataModel.DiagnosticLog;
    constructor(_writer?: DataModel.AgentLogger);
    logMessage(message: DataModel.DiagnosticLog | string, cb?: (err: Error) => void): void;
    logError(message: DataModel.DiagnosticLog | string, cb?: (err: Error) => void): void;
}
