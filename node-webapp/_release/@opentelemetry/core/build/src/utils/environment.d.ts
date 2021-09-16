import { DiagLogLevel } from '@opentelemetry/api';
/**
 * Environment interface to define all names
 */
declare const ENVIRONMENT_NUMBERS_KEYS: readonly ["OTEL_BSP_EXPORT_TIMEOUT", "OTEL_BSP_MAX_EXPORT_BATCH_SIZE", "OTEL_BSP_MAX_QUEUE_SIZE", "OTEL_BSP_SCHEDULE_DELAY", "OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT", "OTEL_SPAN_EVENT_COUNT_LIMIT", "OTEL_SPAN_LINK_COUNT_LIMIT"];
declare type ENVIRONMENT_NUMBERS = {
    [K in typeof ENVIRONMENT_NUMBERS_KEYS[number]]?: number;
};
declare const ENVIRONMENT_LISTS_KEYS: readonly ["OTEL_NO_PATCH_MODULES", "OTEL_PROPAGATORS"];
declare type ENVIRONMENT_LISTS = {
    [K in typeof ENVIRONMENT_LISTS_KEYS[number]]?: string[];
};
export declare type ENVIRONMENT = {
    CONTAINER_NAME?: string;
    ECS_CONTAINER_METADATA_URI_V4?: string;
    ECS_CONTAINER_METADATA_URI?: string;
    HOSTNAME?: string;
    KUBERNETES_SERVICE_HOST?: string;
    NAMESPACE?: string;
    OTEL_EXPORTER_JAEGER_AGENT_HOST?: string;
    OTEL_EXPORTER_JAEGER_ENDPOINT?: string;
    OTEL_EXPORTER_JAEGER_PASSWORD?: string;
    OTEL_EXPORTER_JAEGER_USER?: string;
    OTEL_EXPORTER_OTLP_ENDPOINT?: string;
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?: string;
    OTEL_EXPORTER_OTLP_METRICS_ENDPOINT?: string;
    OTEL_EXPORTER_OTLP_HEADERS?: string;
    OTEL_EXPORTER_OTLP_TRACES_HEADERS?: string;
    OTEL_EXPORTER_OTLP_METRICS_HEADERS?: string;
    OTEL_EXPORTER_ZIPKIN_ENDPOINT?: string;
    OTEL_LOG_LEVEL?: DiagLogLevel;
    OTEL_RESOURCE_ATTRIBUTES?: string;
    OTEL_SERVICE_NAME?: string;
    OTEL_TRACES_EXPORTER?: string;
    OTEL_TRACES_SAMPLER_ARG?: string;
    OTEL_TRACES_SAMPLER?: string;
} & ENVIRONMENT_NUMBERS & ENVIRONMENT_LISTS;
export declare type RAW_ENVIRONMENT = {
    [key: string]: string | number | undefined | string[];
};
/**
 * Default environment variables
 */
export declare const DEFAULT_ENVIRONMENT: Required<ENVIRONMENT>;
/**
 * Parses environment values
 * @param values
 */
export declare function parseEnvironment(values: RAW_ENVIRONMENT): ENVIRONMENT;
export {};
//# sourceMappingURL=environment.d.ts.map