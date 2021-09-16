import * as types from "../applicationinsights";
import { StatusLogger } from "./StatusLogger";
import { DiagnosticLogger } from "./DiagnosticLogger";
/**
 * Sets the attach-time logger
 * @param logger logger which implements the `AgentLogger` interface
 */
export declare function setLogger(logger: DiagnosticLogger): DiagnosticLogger;
/**
 * Sets the string which is prefixed to the existing sdkVersion, e.g. `ad_`, `alr_`
 * @param prefix string prefix, including underscore. Defaults to `ad_`
 */
export declare function setUsagePrefix(prefix: string): void;
export declare function setStatusLogger(statusLogger: StatusLogger): void;
/**
 * Try to setup and start this app insights instance if attach is enabled.
 * @param setupString connection string or instrumentation key
 */
export declare function setupAndStart(setupString?: string): typeof types | null;