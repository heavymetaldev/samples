export declare class MockTestRunner {
    constructor(testPath: string, taskJsonPath?: string);
    private _testPath;
    private _taskJsonPath;
    nodePath: string;
    stdout: string;
    stderr: string;
    cmdlines: {};
    invokedToolCount: number;
    succeeded: boolean;
    errorIssues: string[];
    warningIssues: string[];
    get failed(): boolean;
    ran(cmdline: string): boolean;
    createdErrorIssue(message: string): boolean;
    createdWarningIssue(message: string): boolean;
    stdOutContained(message: string): boolean;
    stdErrContained(message: string): boolean;
    run(nodeVersion?: number): void;
    private getNodePath;
    private getNodeVersion;
    private getTaskJsonPath;
    private downloadNode;
    private downloadFile;
    private downloadTarGz;
    private getPathToNodeExe;
    private getPlatform;
}
