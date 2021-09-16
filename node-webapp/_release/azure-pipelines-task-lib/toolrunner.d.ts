/// <reference types="node" />
import Q = require('q');
import events = require('events');
/**
 * Interface for exec options
 */
export interface IExecOptions extends IExecSyncOptions {
    /** optional.  whether to fail if output to stderr.  defaults to false */
    failOnStdErr?: boolean;
    /** optional.  defaults to failing on non zero.  ignore will not fail leaving it up to the caller */
    ignoreReturnCode?: boolean;
}
/**
 * Interface for execSync options
 */
export interface IExecSyncOptions {
    /** optional working directory.  defaults to current */
    cwd?: string;
    /** optional envvar dictionary.  defaults to current process's env */
    env?: {
        [key: string]: string | undefined;
    };
    /** optional.  defaults to false */
    silent?: boolean;
    /** Optional. Default is process.stdout. */
    outStream?: NodeJS.WritableStream;
    /** Optional. Default is process.stderr. */
    errStream?: NodeJS.WritableStream;
    /** optional. Whether to skip quoting/escaping arguments if needed.  defaults to false. */
    windowsVerbatimArguments?: boolean;
    /** optional. Run command inside of the shell.  Defaults to false. */
    shell?: boolean;
}
/**
 * Interface for exec results returned from synchronous exec functions
 */
export interface IExecSyncResult {
    /** standard output */
    stdout: string;
    /** error output */
    stderr: string;
    /** return code */
    code: number;
    /** Error on failure */
    error: Error;
}
export declare class ToolRunner extends events.EventEmitter {
    constructor(toolPath: string);
    private readonly cmdSpecialChars;
    private toolPath;
    private args;
    private pipeOutputToTool;
    private pipeOutputToFile;
    private childProcess;
    private _debug;
    private _argStringToArray;
    private _getCommandString;
    private _processLineBuffer;
    /**
     * Wraps an arg string with specified char if it's not already wrapped
     * @returns {string} Arg wrapped with specified char
     * @param {string} arg Input argument string
     * @param {string} wrapChar A char input string should be wrapped with
     */
    private _wrapArg;
    /**
     * Unwraps an arg string wrapped with specified char
     * @param arg Arg wrapped with specified char
     * @param wrapChar A char to be removed
     */
    private _unwrapArg;
    /**
     * Determine if arg string is wrapped with specified char
     * @param arg Input arg string
     */
    private _isWrapped;
    private _getSpawnFileName;
    private _getSpawnArgs;
    /**
     * Escape specified character.
     * @param arg String to escape char in
     * @param charToEscape Char should be escaped
     */
    private _escapeChar;
    private _isCmdFile;
    /**
     * Determine whether the cmd arg needs to be quoted. Returns true if arg contains any of special chars array.
     * @param arg The cmd command arg.
     * @param additionalChars Additional chars which should be also checked.
     */
    private _needQuotesForCmd;
    private _windowsQuoteCmdArg;
    private _uv_quote_cmd_arg;
    private _cloneExecOptions;
    private _getSpawnOptions;
    private _getSpawnSyncOptions;
    private execWithPiping;
    /**
     * Add argument
     * Append an argument or an array of arguments
     * returns ToolRunner for chaining
     *
     * @param     val        string cmdline or array of strings
     * @returns   ToolRunner
     */
    arg(val: string | string[]): ToolRunner;
    /**
     * Parses an argument line into one or more arguments
     * e.g. .line('"arg one" two -z') is equivalent to .arg(['arg one', 'two', '-z'])
     * returns ToolRunner for chaining
     *
     * @param     val        string argument line
     * @returns   ToolRunner
     */
    line(val: string): ToolRunner;
    /**
     * Add argument(s) if a condition is met
     * Wraps arg().  See arg for details
     * returns ToolRunner for chaining
     *
     * @param     condition     boolean condition
     * @param     val     string cmdline or array of strings
     * @returns   ToolRunner
     */
    argIf(condition: any, val: any): this;
    /**
     * Pipe output of exec() to another tool
     * @param tool
     * @param file  optional filename to additionally stream the output to.
     * @returns {ToolRunner}
     */
    pipeExecOutputToTool(tool: ToolRunner, file?: string): ToolRunner;
    /**
     * Exec a tool.
     * Output will be streamed to the live console.
     * Returns promise with return code
     *
     * @param     tool     path to tool to exec
     * @param     options  optional exec options.  See IExecOptions
     * @returns   number
     */
    exec(options?: IExecOptions): Q.Promise<number>;
    /**
     * Exec a tool synchronously.
     * Output will be *not* be streamed to the live console.  It will be returned after execution is complete.
     * Appropriate for short running tools
     * Returns IExecSyncResult with output and return code
     *
     * @param     tool     path to tool to exec
     * @param     options  optional exec options.  See IExecSyncOptions
     * @returns   IExecSyncResult
     */
    execSync(options?: IExecSyncOptions): IExecSyncResult;
    /**
     * Used to close child process by sending SIGNINT signal.
     * It allows executed script to have some additional logic on SIGINT, before exiting.
     */
    killChildProcess(): void;
}