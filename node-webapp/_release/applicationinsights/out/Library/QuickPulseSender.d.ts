/// <reference types="node" />
import Config = require("./Config");
import * as http from "http";
import * as Contracts from "../Declarations/Contracts";
declare class QuickPulseSender {
    private static TAG;
    private static MAX_QPS_FAILURES_BEFORE_WARN;
    private _config;
    private _consecutiveErrors;
    constructor(config: Config);
    ping(envelope: Contracts.EnvelopeQuickPulse, redirectedHostEndpoint: string, done: (shouldPOST?: boolean, res?: http.IncomingMessage, redirectedHost?: string, pollingIntervalHint?: number) => void): void;
    post(envelope: Contracts.EnvelopeQuickPulse, redirectedHostEndpoint: string, done: (shouldPOST?: boolean, res?: http.IncomingMessage, redirectedHost?: string, pollingIntervalHint?: number) => void): Promise<void>;
    private _submitData;
    private _onError;
}
export = QuickPulseSender;