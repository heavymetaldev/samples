import { Span } from "@opentelemetry/tracing";
import * as Contracts from "../../Declarations/Contracts";
export declare function spanToTelemetryContract(span: Span): (Contracts.DependencyTelemetry & Contracts.RequestTelemetry) & Contracts.Identified;