/// <reference types="node" />
import Q = require('q');
import fs = require('fs');
import task = require('./task');
import trm = require('./mock-toolrunner');
import ma = require('./mock-answer');
export declare function setAnswers(answers: ma.TaskLibAnswers): void;
export declare function setResourcePath(path: string): void;
export declare function loc(key: string, ...args: any[]): string;
export interface EndpointAuthorization {
    parameters: {
        [key: string]: string;
    };
    scheme: string;
}
export declare class FsStats implements fs.Stats {
    private m_isFile;
    private m_isDirectory;
    private m_isBlockDevice;
    private m_isCharacterDevice;
    private m_isSymbolicLink;
    private m_isFIFO;
    private m_isSocket;
    dev: number;
    ino: number;
    mode: number;
    nlink: number;
    uid: number;
    gid: number;
    rdev: number;
    size: number;
    blksize: number;
    blocks: number;
    atime: Date;
    mtime: Date;
    ctime: Date;
    birthtime: Date;
    atimeMs: number;
    mtimeMs: number;
    ctimeMs: number;
    birthtimeMs: number;
    setAnswers(mockResponses: any): void;
    isFile(): boolean;
    isDirectory(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
}
export declare function stats(path: string): FsStats;
export declare function exist(path: string): boolean;
export interface FsOptions {
    encoding?: string;
    mode?: number;
    flag?: string;
}
export declare function writeFile(file: string, data: string | Buffer, options?: string | FsOptions): void;
export declare function osType(): string;
export declare function getPlatform(): task.Platform;
export declare function cwd(): string;
export declare function cd(path: string): void;
export declare function pushd(path: string): void;
export declare function popd(): void;
export declare function checkPath(p: string, name: string): void;
export declare function mkdirP(p: any): void;
export declare function resolve(): string;
export declare function which(tool: string, check?: boolean): string;
export declare function ls(options: string, paths: string[]): string[];
export declare function cp(source: string, dest: string): void;
export declare function retry(func: Function, args: any[], retryOptions: task.RetryOptions): any;
export declare function find(findPath: string): string[];
export declare function rmRF(path: string): void;
export declare function mv(source: string, dest: string, force: boolean, continueOnError?: boolean): boolean;
export declare function exec(tool: string, args: any, options?: trm.IExecOptions): Q.Promise<number>;
export declare function execSync(tool: string, args: any, options?: trm.IExecSyncOptions): trm.IExecSyncResult;
export declare function tool(tool: string): trm.ToolRunner;
export interface MatchOptions {
    debug?: boolean;
    nobrace?: boolean;
    noglobstar?: boolean;
    dot?: boolean;
    noext?: boolean;
    nocase?: boolean;
    nonull?: boolean;
    matchBase?: boolean;
    nocomment?: boolean;
    nonegate?: boolean;
    flipNegate?: boolean;
}
export declare function findMatch(defaultRoot: string, patterns: string[] | string): string[];
export declare function legacyFindFiles(rootDirectory: string, pattern: string, includeFiles?: boolean, includeDirectories?: boolean): string[];
export declare class TestPublisher {
    testRunner: string;
    constructor(testRunner: string);
    publish(resultFiles?: string, mergeResults?: string, platform?: string, config?: string, runTitle?: string, publishRunAttachments?: string): void;
}
export declare class CodeCoveragePublisher {
    constructor();
    publish(codeCoverageTool?: string, summaryFileLocation?: string, reportDirectory?: string, additionalCodeCoverageFiles?: string): void;
}
export declare class CodeCoverageEnabler {
    private buildTool;
    private ccTool;
    constructor(buildTool: string, ccTool: string);
    enableCodeCoverage(buildProps: {
        [key: string]: string;
    }): void;
}
export declare function getHttpProxyConfiguration(requestUrl?: string): task.ProxyConfiguration | null;
export declare function getHttpCertConfiguration(): task.CertConfiguration | null;
