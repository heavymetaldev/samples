import vm = require('./vault');
/**
 * Hash table of known variable info. The formatted env var name is the lookup key.
 *
 * The purpose of this hash table is to keep track of known variables. The hash table
 * needs to be maintained for multiple reasons:
 *  1) to distinguish between env vars and job vars
 *  2) to distinguish between secret vars and public
 *  3) to know the real variable name and not just the formatted env var name.
 */
export declare var _knownVariableMap: {
    [key: string]: _KnownVariableInfo;
};
export declare var _vault: vm.Vault;
export declare function _startsWith(str: string, start: string): boolean;
export declare function _endsWith(str: string, end: string): boolean;
export declare function _writeLine(str: string): void;
export declare function _setStdStream(stdStream: any): void;
export declare function _setErrStream(errStream: any): void;
/**
 * Sets the location of the resources json.  This is typically the task.json file.
 * Call once at the beginning of the script before any calls to loc.
 * @param     path      Full path to the json.
 * @param     ignoreWarnings  Won't throw warnings if path already set.
 * @returns   void
 */
export declare function _setResourcePath(path: string, ignoreWarnings?: boolean): void;
/**
 * Gets the localized string from the json resource file.  Optionally formats with additional params.
 *
 * @param     key      key of the resources string in the resource file
 * @param     param    additional params for formatting the string
 * @returns   string
 */
export declare function _loc(key: string, ...param: any[]): string;
/**
 * Gets a variable value that is defined on the build/release definition or set at runtime.
 *
 * @param     name     name of the variable to get
 * @returns   string
 */
export declare function _getVariable(name: string): string | undefined;
export declare function _getVariableKey(name: string): string;
/**
 * Used to store the following information about job variables:
 *  1) the real variable name (not the formatted environment variable name)
 *  2) whether the variable is a secret variable
 */
export interface _KnownVariableInfo {
    name: string;
    secret: boolean;
}
export declare function _command(command: string, properties: any, message: string): void;
export declare function _warning(message: string): void;
export declare function _error(message: string): void;
export declare function _debug(message: string): void;
/**
 * Returns whether a path exists.
 *
 * @param     path      path to check
 * @returns   boolean
 */
export declare function _exist(path: string): boolean;
/**
 * Checks whether a path exists.
 * If the path does not exist, it will throw.
 *
 * @param     p         path to check
 * @param     name      name only used in error message to identify the path
 * @returns   void
 */
export declare function _checkPath(p: string, name: string): void;
/**
 * Returns path of a tool had the tool actually been invoked.  Resolves via paths.
 * If you check and the tool does not exist, it will throw.
 *
 * @param     tool       name of the tool
 * @param     check      whether to check if tool exists
 * @returns   string
 */
export declare function _which(tool: string, check?: boolean): string;
export declare function _legacyFindFiles_convertPatternToRegExp(pattern: string): RegExp;
export interface _MatchOptions {
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
export declare function _cloneMatchOptions(matchOptions: _MatchOptions): _MatchOptions;
export interface _PatternFindInfo {
    /** Adjusted pattern to use. Unrooted patterns are typically rooted using the default info, although this is not true for match-base scenarios. */
    adjustedPattern: string;
    /** Path interpreted from the pattern to call find() on. */
    findPath: string;
    /** Indicates whether to call stat() or find(). When all path segemnts in the pattern are literal, there is no need to call find(). */
    statOnly: boolean;
}
export declare function _getFindInfoFromPattern(defaultRoot: string, pattern: string, matchOptions: _MatchOptions): _PatternFindInfo;
export declare function _ensurePatternRooted(root: string, p: string): string;
export declare function _loadData(): void;
/**
 * Defines if path is unc-path.
 *
 * @param path  a path to a file.
 * @returns     true if path starts with double backslash, otherwise returns false.
 */
export declare function _isUncPath(path: string): boolean;
export declare function _ensureRooted(root: string, p: string): string;
/**
 * Determines the parent path and trims trailing slashes (when safe). Path separators are normalized
 * in the result. This function works similar to the .NET System.IO.Path.GetDirectoryName() method.
 * For example, C:\hello\world\ returns C:\hello\world (trailing slash removed). Returns empty when
 * no higher directory can be determined.
 */
export declare function _getDirectoryName(p: string): string;
/**
 * On OSX/Linux, true if path starts with '/'. On Windows, true for paths like:
 * \, \hello, \\hello\share, C:, and C:\hello (and corresponding alternate separator cases).
 */
export declare function _isRooted(p: string): boolean;
export declare function _normalizeSeparators(p: string): string;
export declare function _exposeProxySettings(): void;
export declare function _exposeCertSettings(): void;
