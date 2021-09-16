import * as task from './task';
export interface TaskLibAnswerExecResult {
    code: number;
    stdout?: string;
    stderr?: string;
}
export interface TaskLibAnswers {
    checkPath?: {
        [key: string]: boolean;
    };
    cwd?: {
        [key: string]: string;
    };
    exec?: {
        [key: string]: TaskLibAnswerExecResult;
    };
    exist?: {
        [key: string]: boolean;
    };
    find?: {
        [key: string]: string[];
    };
    findMatch?: {
        [key: string]: string[];
    };
    getPlatform?: {
        [key: string]: task.Platform;
    };
    legacyFindFiles?: {
        [key: string]: string[];
    };
    ls?: {
        [key: string]: string;
    };
    osType?: {
        [key: string]: string;
    };
    rmRF?: {
        [key: string]: {
            success: boolean;
        };
    };
    stats?: {
        [key: string]: any;
    };
    which?: {
        [key: string]: string;
    };
}
export declare type MockedCommand = keyof TaskLibAnswers;
export declare class MockAnswers {
    private _answers;
    initialize(answers: TaskLibAnswers): void;
    getResponse(cmd: MockedCommand, key: string, debug: (message: string) => void): any;
}
