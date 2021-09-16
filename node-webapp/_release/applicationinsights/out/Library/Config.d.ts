/// <reference types="node" />
import http = require('http');
import https = require('https');
declare class Config {
    static ENV_azurePrefix: string;
    static ENV_iKey: string;
    static legacy_ENV_iKey: string;
    static ENV_profileQueryEndpoint: string;
    static ENV_quickPulseHost: string;
    static ENV_connectionString: string;
    static ENV_nativeMetricsDisablers: string;
    static ENV_nativeMetricsDisableAll: string;
    static ENV_http_proxy: string;
    static ENV_https_proxy: string;
    /** An identifier for your Application Insights resource */
    instrumentationKey: string;
    /** The id for cross-component correlation. READ ONLY. */
    correlationId: string;
    /** The ingestion endpoint to send telemetry payloads to */
    endpointUrl: string;
    /** The maximum number of telemetry items to include in a payload to the ingestion endpoint (Default 250) */
    maxBatchSize: number;
    /** The maximum amount of time to wait for a payload to reach maxBatchSize (Default 15000) */
    maxBatchIntervalMs: number;
    /** A flag indicating if telemetry transmission is disabled (Default false) */
    disableAppInsights: boolean;
    /** The percentage of telemetry items tracked that should be transmitted (Default 100) */
    samplingPercentage: number;
    /** The time to wait before retrying to retrieve the id for cross-component correlation (Default 30000) */
    correlationIdRetryIntervalMs: number;
    /** A list of domains to exclude from cross-component header injection */
    correlationHeaderExcludedDomains: string[];
    /** A proxy server for SDK HTTP traffic (Optional, Default pulled from `http_proxy` environment variable) */
    proxyHttpUrl: string;
    /** A proxy server for SDK HTTPS traffic (Optional, Default pulled from `https_proxy` environment variable) */
    proxyHttpsUrl: string;
    /** An http.Agent to use for SDK HTTP traffic (Optional, Default undefined) */
    httpAgent: http.Agent;
    /** An https.Agent to use for SDK HTTPS traffic (Optional, Default undefined) */
    httpsAgent: https.Agent;
    /** Disable including legacy headers in outgoing requests, x-ms-request-id */
    ignoreLegacyHeaders?: boolean;
    private endpointBase;
    private setCorrelationId;
    private _profileQueryEndpoint;
    /** Host name for quickpulse service */
    private _quickPulseHost;
    constructor(setupString?: string);
    set profileQueryEndpoint(endpoint: string);
    get profileQueryEndpoint(): string;
    set quickPulseHost(host: string);
    get quickPulseHost(): string;
    private static _getInstrumentationKey;
    /**
    * Validate UUID Format
    * Specs taken from breeze repo
    * The definition of a VALID instrumentation key is as follows:
    * Not none
    * Not empty
    * Every character is a hex character [0-9a-f]
    * 32 characters are separated into 5 sections via 4 dashes
    * First section has 8 characters
    * Second section has 4 characters
    * Third section has 4 characters
    * Fourth section has 4 characters
    * Fifth section has 12 characters
    */
    private static _validateInstrumentationKey;
}
export = Config;
