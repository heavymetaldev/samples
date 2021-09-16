import { Exception } from '@opentelemetry/api';
/**
 * This interface defines a fallback to read a timeOrigin when it is not available on performance.timeOrigin,
 * this happens for example on Safari Mac
 * then the timeOrigin is taken from fetchStart - which is the closest to timeOrigin
 */
export interface TimeOriginLegacy {
    timing: {
        fetchStart: number;
    };
}
/**
 * This interface defines the params that are be added to the wrapped function
 * using the "shimmer.wrap"
 */
export interface ShimWrapped {
    __wrapped: boolean;
    __unwrap: Function;
    __original: Function;
}
/**
 * An instrumentation library consists of the name and and optional version
 * used to obtain a tracer or meter from a provider. This metadata is made
 * available on ReadableSpan and MetricRecord for use by the export pipeline.
 */
export interface InstrumentationLibrary {
    readonly name: string;
    readonly version?: string;
}
/** Defines an error handler function */
export declare type ErrorHandler = (ex: Exception) => void;
//# sourceMappingURL=types.d.ts.map