import Config = require("./Config");
import Contracts = require("../Declarations/Contracts");
import Statsbeat = require("../AutoCollection/Statsbeat");
declare class Sender {
    private static TAG;
    private static ICACLS_PATH;
    private static POWERSHELL_PATH;
    private static ACLED_DIRECTORIES;
    private static ACL_IDENTITY;
    static WAIT_BETWEEN_RESEND: number;
    static MAX_BYTES_ON_DISK: number;
    static MAX_CONNECTION_FAILURES_BEFORE_WARN: number;
    static CLEANUP_TIMEOUT: number;
    static FILE_RETEMPTION_PERIOD: number;
    static TEMPDIR_PREFIX: string;
    static OS_PROVIDES_FILE_PROTECTION: boolean;
    static USE_ICACLS: boolean;
    private _config;
    private _statsbeat;
    private _onSuccess;
    private _onError;
    private _enableDiskRetryMode;
    private _numConsecutiveFailures;
    private _numConsecutiveRedirects;
    private _resendTimer;
    private _fileCleanupTimer;
    private _redirectedHost;
    private _tempDir;
    protected _resendInterval: number;
    protected _maxBytesOnDisk: number;
    constructor(config: Config, onSuccess?: (response: string) => void, onError?: (error: Error) => void, statsbeat?: Statsbeat);
    /**
    * Enable or disable offline mode
    */
    setDiskRetryMode(value: boolean, resendInterval?: number, maxBytesOnDisk?: number): void;
    send(envelopes: Contracts.EnvelopeTelemetry[], callback?: (v: string) => void): Promise<void>;
    saveOnCrash(envelopes: Contracts.EnvelopeTelemetry[]): void;
    private _isRetriable;
    private _runICACLS;
    private _runICACLSSync;
    private _getACLIdentity;
    private _getACLIdentitySync;
    private _getACLArguments;
    private _applyACLRules;
    private _applyACLRulesSync;
    private _confirmDirExists;
    /**
     * Computes the size (in bytes) of all files in a directory at the root level. Asynchronously.
     */
    private _getShallowDirectorySize;
    /**
     * Computes the size (in bytes) of all files in a directory at the root level. Synchronously.
     */
    private _getShallowDirectorySizeSync;
    /**
     * Stores the payload as a json file on disk in the temp directory
     */
    private _storeToDisk;
    /**
     * Stores the payload as a json file on disk using sync file operations
     * this is used when storing data before crashes
     */
    private _storeToDiskSync;
    /**
     * Check for temp telemetry files
     * reads the first file if exist, deletes it and tries to send its load
     */
    private _sendFirstFileOnDisk;
    private _onErrorHelper;
    private _stringify;
    private _fileCleanupTask;
}
export = Sender;