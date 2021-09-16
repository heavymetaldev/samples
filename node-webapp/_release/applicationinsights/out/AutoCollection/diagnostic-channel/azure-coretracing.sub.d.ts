import { Span } from "@opentelemetry/tracing";
import TelemetryClient = require("../../Library/TelemetryClient");
import { IStandardEvent } from "diagnostic-channel";
export declare const subscriber: (event: IStandardEvent<Span>) => void;
export declare function enable(enabled: boolean, client: TelemetryClient): void;
