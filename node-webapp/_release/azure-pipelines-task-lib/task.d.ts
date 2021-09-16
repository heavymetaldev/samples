/// <reference types="node" />
import Q = require('q');
import fs = require('fs');
import im = require('./internal');
import trm = require('./toolrunner');
export declare enum TaskResult {
    Succeeded = 0,
    SucceededWithIssues = 1,
    Failed = 2,
    Cancelled = 3,
    Skipped = 4
}
export declare enum TaskState {
    Unknown = 0,
    Initialized = 1,
    InProgress = 2,
    Completed = 3
}
export declare enum IssueType {
    Error = 0,
    Warning = 1
}
export declare enum ArtifactType {
    Container = 0,
    FilePath = 1,
    VersionControl = 2,
    GitRef = 3,
    TfvcLabel = 4
}
export declare enum FieldType {
    AuthParameter = 0,
    DataParameter = 1,
    Url = 2
}
/** Platforms supported by our build agent */
export declare enum Platform {
    Windows = 0,
    MacOS = 1,
    Linux = 2
}
export declare const setStdStream: typeof im._setStdStream;
export declare const setErrStream: typeof im._setErrStream;
/**
 * Sets the result of the task.
 * Execution will continue.
 * If not set, task will be Succeeded.
 * If multiple calls are made to setResult the most pessimistic call wins (Failed) regardless of the order of calls.
 *
 * @param result    TaskResult enum of Succeeded, SucceededWithIssues, Failed, Cancelled or Skipped.
 * @param message   A message which will be logged as an error issue if the result is Failed.
 * @param done      Optional. Instructs the agent the task is done. This is helpful when child processes
 *                  may still be running and prevent node from fully exiting. This argument is supported
 *                  from agent version 2.142.0 or higher (otherwise will no-op).
 * @returns         void
 */
export declare function setResult(result: TaskResult, message: string, done?: boolean): void;
export declare const setResourcePath: typeof im._setResourcePath;
export declare const loc: typeof im._loc;
export declare const getVariable: typeof im._getVariable;
/**
 * Asserts the agent version is at least the specified minimum.
 *
 * @param    minimum    minimum version version - must be 2.104.1 or higher
 */
export declare function assertAgent(minimum: string): void;
/**
 * Gets a snapshot of the current state of all job variables available to the task.
 * Requires a 2.104.1 agent or higher for full functionality.
 *
 * Limitations on an agent prior to 2.104.1:
 *  1) The return value does not include all public variables. Only public variables
 *     that have been added using setVariable are returned.
 *  2) The name returned for each secret variable is the formatted environment variable
 *     name, not the actual variable name (unless it was set explicitly at runtime using
 *     setVariable).
 *
 * @returns VariableInfo[]
 */
export declare function getVariables(): VariableInfo[];
/**
 * Sets a variable which will be available to subsequent tasks as well.
 *
 * @param     name     name of the variable to set
 * @param     val      value to set
 * @param     secret   whether variable is secret.  Multi-line secrets are not allowed.  Optional, defaults to false
 * @param     isOutput whether variable is an output variable.  Optional, defaults to false
 * @returns   void
 */
export declare function setVariable(name: string, val: string, secret?: boolean, isOutput?: boolean): void;
/**
 * Registers a value with the logger, so the value will be masked from the logs.  Multi-line secrets are not allowed.
 *
 * @param val value to register
 */
export declare function setSecret(val: string): void;
/** Snapshot of a variable at the time when getVariables was called. */
export interface VariableInfo {
    name: string;
    value: string;
    secret: boolean;
}
/**
 * Gets the value of an input.
 * If required is true and the value is not set, it will throw.
 *
 * @param     name     name of the input to get
 * @param     required whether input is required.  optional, defaults to false
 * @returns   string
 */
export declare function getInput(name: string, required?: boolean): string | undefined;
/**
 * Gets the value of an input and converts to a bool.  Convenience.
 * If required is true and the value is not set, it will throw.
 * If required is false and the value is not set, returns false.
 *
 * @param     name     name of the bool input to get
 * @param     required whether input is required.  optional, defaults to false
 * @returns   boolean
 */
export declare function getBoolInput(name: string, required?: boolean): boolean;
/**
 * Gets the value of an input and splits the value using a delimiter (space, comma, etc).
 * Empty values are removed.  This function is useful for splitting an input containing a simple
 * list of items - such as build targets.
 * IMPORTANT: Do not use this function for splitting additional args!  Instead use argString(), which
 * follows normal argument splitting rules and handles values encapsulated by quotes.
 * If required is true and the value is not set, it will throw.
 *
 * @param     name     name of the input to get
 * @param     delim    delimiter to split on
 * @param     required whether input is required.  optional, defaults to false
 * @returns   string[]
 */
export declare function getDelimitedInput(name: string, delim: string | RegExp, required?: boolean): string[];
/**
 * Checks whether a path inputs value was supplied by the user
 * File paths are relative with a picker, so an empty path is the root of the repo.
 * Useful if you need to condition work (like append an arg) if a value was supplied
 *
 * @param     name      name of the path input to check
 * @returns   boolean
 */
export declare function filePathSupplied(name: string): boolean;
/**
 * Gets the value of a path input
 * It will be quoted for you if it isn't already and contains spaces
 * If required is true and the value is not set, it will throw.
 * If check is true and the path does not exist, it will throw.
 *
 * @param     name      name of the input to get
 * @param     required  whether input is required.  optional, defaults to false
 * @param     check     whether path is checked.  optional, defaults to false
 * @returns   string
 */
export declare function getPathInput(name: string, required?: boolean, check?: boolean): string | undefined;
/**
 * Gets the url for a service endpoint
 * If the url was not set and is not optional, it will throw.
 *
 * @param     id        name of the service endpoint
 * @param     optional  whether the url is optional
 * @returns   string
 */
export declare function getEndpointUrl(id: string, optional: boolean): string | undefined;
export declare function getEndpointDataParameter(id: string, key: string, optional: boolean): string | undefined;
/**
 * Gets the endpoint authorization scheme for a service endpoint
 * If the endpoint authorization scheme is not set and is not optional, it will throw.
 *
 * @param id name of the service endpoint
 * @param optional whether the endpoint authorization scheme is optional
 * @returns {string} value of the endpoint authorization scheme
 */
export declare function getEndpointAuthorizationScheme(id: string, optional: boolean): string | undefined;
/**
 * Gets the endpoint authorization parameter value for a service endpoint with specified key
 * If the endpoint authorization parameter is not set and is not optional, it will throw.
 *
 * @param id name of the service endpoint
 * @param key key to find the endpoint authorization parameter
 * @param optional optional whether the endpoint authorization scheme is optional
 * @returns {string} value of the endpoint authorization parameter value
 */
export declare function getEndpointAuthorizationParameter(id: string, key: string, optional: boolean): string | undefined;
/**
 * Interface for EndpointAuthorization
 * Contains a schema and a string/string dictionary of auth data
 */
export interface EndpointAuthorization {
    /** dictionary of auth data */
    parameters: {
        [key: string]: string;
    };
    /** auth scheme such as OAuth or username/password etc... */
    scheme: string;
}
/**
 * Gets the authorization details for a service endpoint
 * If the authorization was not set and is not optional, it will set the task result to Failed.
 *
 * @param     id        name of the service endpoint
 * @param     optional  whether the url is optional
 * @returns   string
 */
export declare function getEndpointAuthorization(id: string, optional: boolean): EndpointAuthorization | undefined;
/**
 * Gets the name for a secure file
 *
 * @param     id        secure file id
 * @returns   string
 */
export declare function getSecureFileName(id: string): string | undefined;
/**
  * Gets the secure file ticket that can be used to download the secure file contents
  *
  * @param id name of the secure file
  * @returns {string} secure file ticket
  */
export declare function getSecureFileTicket(id: string): string | undefined;
/**
 * Gets a variable value that is set by previous step from the same wrapper task.
 * Requires a 2.115.0 agent or higher.
 *
 * @param     name     name of the variable to get
 * @returns   string
 */
export declare function getTaskVariable(name: string): string | undefined;
/**
 * Sets a task variable which will only be available to subsequent steps belong to the same wrapper task.
 * Requires a 2.115.0 agent or higher.
 *
 * @param     name    name of the variable to set
 * @param     val     value to set
 * @param     secret  whether variable is secret.  optional, defaults to false
 * @returns   void
 */
export declare function setTaskVariable(name: string, val: string, secret?: boolean): void;
export declare const command: typeof im._command;
export declare const warning: typeof im._warning;
export declare const error: typeof im._error;
export declare const debug: typeof im._debug;
export interface FsStats extends fs.Stats {
}
/**
 * Get's stat on a path.
 * Useful for checking whether a file or directory.  Also getting created, modified and accessed time.
 * see [fs.stat](https://nodejs.org/api/fs.html#fs_class_fs_stats)
 *
 * @param     path      path to check
 * @returns   fsStat
 */
export declare function stats(path: string): FsStats;
export declare const exist: typeof im._exist;
export declare function writeFile(file: string, data: string | Buffer, options?: BufferEncoding | fs.WriteFileOptions): void;
/**
 * @deprecated Use `getPlatform`
 * Useful for determining the host operating system.
 * see [os.type](https://nodejs.org/api/os.html#os_os_type)
 *
 * @return      the name of the operating system
 */
export declare function osType(): string;
/**
 * Determine the operating system the build agent is running on.
 * @returns {Platform}
 * @throws {Error} Platform is not supported by our agent
 */
export declare function getPlatform(): Platform;
/**
 * Returns the process's current working directory.
 * see [process.cwd](https://nodejs.org/api/process.html#process_process_cwd)
 *
 * @return      the path to the current working directory of the process
 */
export declare function cwd(): string;
export declare const checkPath: typeof im._checkPath;
/**
 * Change working directory.
 *
 * @param     path      new working directory path
 * @returns   void
 */
export declare function cd(path: string): void;
/**
 * Change working directory and push it on the stack
 *
 * @param     path      new working directory path
 * @returns   void
 */
export declare function pushd(path: string): void;
/**
 * Change working directory back to previously pushed directory
 *
 * @returns   void
 */
export declare function popd(): void;
/**
 * Make a directory.  Creates the full path with folders in between
 * Will throw if it fails
 *
 * @param     p       path to create
 * @returns   void
 */
export declare function mkdirP(p: string): void;
/**
 * Resolves a sequence of paths or path segments into an absolute path.
 * Calls node.js path.resolve()
 * Allows L0 testing with consistent path formats on Mac/Linux and Windows in the mock implementation
 * @param pathSegments
 * @returns {string}
 */
export declare function resolve(...pathSegments: any[]): string;
export declare const which: typeof im._which;
/**
 * Returns array of files in the given path, or in current directory if no path provided.  See shelljs.ls
 * @param  {string}   options  Available options: -R (recursive), -A (all files, include files beginning with ., except for . and ..)
 * @param  {string[]} paths    Paths to search.
 * @return {string[]}          An array of files in the given path(s).
 */
export declare function ls(options: string, paths: string[]): string[];
/**
 * Copies a file or folder.
 *
 * @param     source     source path
 * @param     dest       destination path
 * @param     options    string -r, -f or -rf for recursive and force
 * @param     continueOnError optional. whether to continue on error
 * @param     retryCount optional. Retry count to copy the file. It might help to resolve intermittent issues e.g. with UNC target paths on a remote host.
 */
export declare function cp(source: string, dest: string, options?: string, continueOnError?: boolean, retryCount?: number): void;
/**
 * Moves a path.
 *
 * @param     source     source path
 * @param     dest       destination path
 * @param     options    string -f or -n for force and no clobber
 * @param     continueOnError optional. whether to continue on error
 */
export declare function mv(source: string, dest: string, options?: string, continueOnError?: boolean): void;
/**
 * Interface for FindOptions
 * Contains properties to control whether to follow symlinks
 */
export interface FindOptions {
    /**
     * When true, broken symbolic link will not cause an error.
     */
    allowBrokenSymbolicLinks: boolean;
    /**
     * Equivalent to the -H command line option. Indicates whether to traverse descendants if
     * the specified path is a symbolic link directory. Does not cause nested symbolic link
     * directories to be traversed.
     */
    followSpecifiedSymbolicLink: boolean;
    /**
     * Equivalent to the -L command line option. Indicates whether to traverse descendants of
     * symbolic link directories.
     */
    followSymbolicLinks: boolean;
    /**
     * When true, missing files will not cause an error and will be skipped.
     */
    skipMissingFiles?: boolean;
}
/**
 * Interface for RetryOptions
 *
 * Contains "continueOnError" and "retryCount" options.
 */
export interface RetryOptions {
    /**
     * If true, code still continues to execute when all retries failed.
     */
    continueOnError: boolean;
    /**
     * Number of retries.
     */
    retryCount: number;
}
/**
 * Tries to execute a function a specified number of times.
 *
 * @param   func            a function to be executed.
 * @param   args            executed function arguments array.
 * @param   retryOptions    optional. Defaults to { continueOnError: false, retryCount: 0 }.
 * @returns the same as the usual function.
 */
export declare function retry(func: Function, args: any[], retryOptions?: RetryOptions): any;
/**
 * Recursively finds all paths a given path. Returns an array of paths.
 *
 * @param     findPath  path to search
 * @param     options   optional. defaults to { followSymbolicLinks: true }. following soft links is generally appropriate unless deleting files.
 * @returns   string[]
 */
export declare function find(findPath: string, options?: FindOptions): string[];
/**
 * Prefer tl.find() and tl.match() instead. This function is for backward compatibility
 * when porting tasks to Node from the PowerShell or PowerShell3 execution handler.
 *
 * @param    rootDirectory      path to root unrooted patterns with
 * @param    pattern            include and exclude patterns
 * @param    includeFiles       whether to include files in the result. defaults to true when includeFiles and includeDirectories are both false
 * @param    includeDirectories whether to include directories in the result
 * @returns  string[]
 */
export declare function legacyFindFiles(rootDirectory: string, pattern: string, includeFiles?: boolean, includeDirectories?: boolean): string[];
/**
 * Remove a path recursively with force
 *
 * @param     inputPath path to remove
 * @throws    when the file or directory exists but could not be deleted.
 */
export declare function rmRF(inputPath: string): void;
/**
 * Exec a tool.  Convenience wrapper over ToolRunner to exec with args in one call.
 * Output will be streamed to the live console.
 * Returns promise with return code
 *
 * @param     tool     path to tool to exec
 * @param     args     an arg string or array of args
 * @param     options  optional exec options.  See IExecOptions
 * @returns   number
 */
export declare function exec(tool: string, args: any, options?: trm.IExecOptions): Q.Promise<number>;
/**
 * Exec a tool synchronously.  Convenience wrapper over ToolRunner to execSync with args in one call.
 * Output will be *not* be streamed to the live console.  It will be returned after execution is complete.
 * Appropriate for short running tools
 * Returns IExecResult with output and return code
 *
 * @param     tool     path to tool to exec
 * @param     args     an arg string or array of args
 * @param     options  optional exec options.  See IExecSyncOptions
 * @returns   IExecSyncResult
 */
export declare function execSync(tool: string, args: string | string[], options?: trm.IExecSyncOptions): trm.IExecSyncResult;
/**
 * Convenience factory to create a ToolRunner.
 *
 * @param     tool     path to tool to exec
 * @returns   ToolRunner
 */
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
/**
 * Applies glob patterns to a list of paths. Supports interleaved exclude patterns.
 *
 * @param  list         array of paths
 * @param  patterns     patterns to apply. supports interleaved exclude patterns.
 * @param  patternRoot  optional. default root to apply to unrooted patterns. not applied to basename-only patterns when matchBase:true.
 * @param  options      optional. defaults to { dot: true, nobrace: true, nocase: process.platform == 'win32' }.
 */
export declare function match(list: string[], patterns: string[] | string, patternRoot?: string, options?: MatchOptions): string[];
/**
 * Filter to apply glob patterns
 *
 * @param  pattern  pattern to apply
 * @param  options  optional. defaults to { dot: true, nobrace: true, nocase: process.platform == 'win32' }.
 */
export declare function filter(pattern: string, options?: MatchOptions): (element: string, indexed: number, array: string[]) => boolean;
/**
 * Determines the find root from a list of patterns. Performs the find and then applies the glob patterns.
 * Supports interleaved exclude patterns. Unrooted patterns are rooted using defaultRoot, unless
 * matchOptions.matchBase is specified and the pattern is a basename only. For matchBase cases, the
 * defaultRoot is used as the find root.
 *
 * @param  defaultRoot   default path to root unrooted patterns. falls back to System.DefaultWorkingDirectory or process.cwd().
 * @param  patterns      pattern or array of patterns to apply
 * @param  findOptions   defaults to { followSymbolicLinks: true }. following soft links is generally appropriate unless deleting files.
 * @param  matchOptions  defaults to { dot: true, nobrace: true, nocase: process.platform == 'win32' }
 */
export declare function findMatch(defaultRoot: string, patterns: string[] | string, findOptions?: FindOptions, matchOptions?: MatchOptions): string[];
export interface ProxyConfiguration {
    proxyUrl: string;
    proxyUsername?: string;
    proxyPassword?: string;
    proxyBypassHosts?: string[];
}
/**
 * Gets http proxy configuration used by Build/Release agent
 *
 * @return  ProxyConfiguration
 */
export declare function getHttpProxyConfiguration(requestUrl?: string): ProxyConfiguration | null;
export interface CertConfiguration {
    caFile?: string;
    certFile?: string;
    keyFile?: string;
    certArchiveFile?: string;
    passphrase?: string;
}
/**
 * Gets http certificate configuration used by Build/Release agent
 *
 * @return  CertConfiguration
 */
export declare function getHttpCertConfiguration(): CertConfiguration | null;
export declare class TestPublisher {
    testRunner: string;
    constructor(testRunner: string);
    publish(resultFiles?: string | string[], mergeResults?: string, platform?: string, config?: string, runTitle?: string, publishRunAttachments?: string, testRunSystem?: string): void;
}
export declare class CodeCoveragePublisher {
    constructor();
    publish(codeCoverageTool?: string, summaryFileLocation?: string, reportDirectory?: string, additionalCodeCoverageFiles?: string | string[]): void;
}
export declare class CodeCoverageEnabler {
    private buildTool;
    private ccTool;
    constructor(buildTool: string, ccTool: string);
    enableCodeCoverage(buildProps: {
        [key: string]: string;
    }): void;
}
/**
 * Upload user interested file as additional log information
 * to the current timeline record.
 *
 * The file shall be available for download along with task logs.
 *
 * @param path      Path to the file that should be uploaded.
 * @returns         void
 */
export declare function uploadFile(path: string): void;
/**
 * Instruction for the agent to update the PATH environment variable.
 * The specified directory is prepended to the PATH.
 * The updated environment variable will be reflected in subsequent tasks.
 *
 * @param path      Local directory path.
 * @returns         void
 */
export declare function prependPath(path: string): void;
/**
 * Upload and attach summary markdown to current timeline record.
 * This summary shall be added to the build/release summary and
 * not available for download with logs.
 *
 * @param path      Local directory path.
 * @returns         void
 */
export declare function uploadSummary(path: string): void;
/**
 * Upload and attach attachment to current timeline record.
 * These files are not available for download with logs.
 * These can only be referred to by extensions using the type or name values.
 *
 * @param type      Attachment type.
 * @param name      Attachment name.
 * @param path      Attachment path.
 * @returns         void
 */
export declare function addAttachment(type: string, name: string, path: string): void;
/**
 * Set an endpoint field with given value.
 * Value updated will be retained in the endpoint for
 * the subsequent tasks that execute within the same job.
 *
 * @param id      Endpoint id.
 * @param field   FieldType enum of AuthParameter, DataParameter or Url.
 * @param key     Key.
 * @param value   Value for key or url.
 * @returns       void
 */
export declare function setEndpoint(id: string, field: FieldType, key: string, value: string): void;
/**
 * Set progress and current operation for current task.
 *
 * @param percent           Percentage of completion.
 * @param currentOperation  Current pperation.
 * @returns                 void
 */
export declare function setProgress(percent: number, currentOperation: string): void;
/**
 * Indicates whether to write the logging command directly to the host or to the output pipeline.
 *
 * @param id            Timeline record Guid.
 * @param parentId      Parent timeline record Guid.
 * @param recordType    Record type.
 * @param recordName    Record name.
 * @param order         Order of timeline record.
 * @param startTime     Start time.
 * @param finishTime    End time.
 * @param progress      Percentage of completion.
 * @param state         TaskState enum of Unknown, Initialized, InProgress or Completed.
 * @param result        TaskResult enum of Succeeded, SucceededWithIssues, Failed, Cancelled or Skipped.
 * @param message       current operation
 * @returns             void
 */
export declare function logDetail(id: string, message: string, parentId?: string, recordType?: string, recordName?: string, order?: number, startTime?: string, finishTime?: string, progress?: number, state?: TaskState, result?: TaskResult): void;
/**
 * Log error or warning issue to timeline record of current task.
 *
 * @param type          IssueType enum of Error or Warning.
 * @param sourcePath    Source file location.
 * @param lineNumber    Line number.
 * @param columnNumber  Column number.
 * @param code          Error or warning code.
 * @param message       Error or warning message.
 * @returns             void
 */
export declare function logIssue(type: IssueType, message: string, sourcePath?: string, lineNumber?: number, columnNumber?: number, errorCode?: string): void;
/**
 * Upload user interested file as additional log information
 * to the current timeline record.
 *
 * The file shall be available for download along with task logs.
 *
 * @param containerFolder   Folder that the file will upload to, folder will be created if needed.
 * @param path              Path to the file that should be uploaded.
 * @param name              Artifact name.
 * @returns                 void
 */
export declare function uploadArtifact(containerFolder: string, path: string, name?: string): void;
/**
 * Create an artifact link, artifact location is required to be
 * a file container path, VC path or UNC share path.
 *
 * The file shall be available for download along with task logs.
 *
 * @param name              Artifact name.
 * @param path              Path to the file that should be associated.
 * @param artifactType      ArtifactType enum of Container, FilePath, VersionControl, GitRef or TfvcLabel.
 * @returns                 void
 */
export declare function associateArtifact(name: string, path: string, artifactType: ArtifactType): void;
/**
 * Upload user interested log to build’s container “logs\tool” folder.
 *
 * @param path      Path to the file that should be uploaded.
 * @returns         void
 */
export declare function uploadBuildLog(path: string): void;
/**
 * Update build number for current build.
 *
 * @param value     Value to be assigned as the build number.
 * @returns         void
 */
export declare function updateBuildNumber(value: string): void;
/**
 * Add a tag for current build.
 *
 * @param value     Tag value.
 * @returns         void
 */
export declare function addBuildTag(value: string): void;
/**
 * Update release name for current release.
 *
 * @param value     Value to be assigned as the release name.
 * @returns         void
 */
export declare function updateReleaseName(name: string): void;
