import { Span } from '../Span';
import { SpanProcessor } from '../SpanProcessor';
import { BufferConfig } from '../types';
import { ReadableSpan } from './ReadableSpan';
import { SpanExporter } from './SpanExporter';
/**
 * Implementation of the {@link SpanProcessor} that batches spans exported by
 * the SDK then pushes them to the exporter pipeline.
 */
export declare abstract class BatchSpanProcessorBase<T extends BufferConfig> implements SpanProcessor {
    private readonly _exporter;
    private readonly _maxExportBatchSize;
    private readonly _maxQueueSize;
    private readonly _scheduledDelayMillis;
    private readonly _exportTimeoutMillis;
    private _finishedSpans;
    private _timer;
    private _isShutdown;
    private _shuttingDownPromise;
    constructor(_exporter: SpanExporter, config?: T);
    forceFlush(): Promise<void>;
    onStart(_span: Span): void;
    onEnd(span: ReadableSpan): void;
    shutdown(): Promise<void>;
    /** Add a span in the buffer. */
    private _addToBuffer;
    /**
     * Send all spans to the exporter respecting the batch size limit
     * This function is used only on forceFlush or shutdown,
     * for all other cases _flush should be used
     * */
    private _flushAll;
    private _flushOneBatch;
    private _maybeStartTimer;
    private _clearTimer;
    protected abstract onShutdown(): void;
}
//# sourceMappingURL=BatchSpanProcessorBase.d.ts.map