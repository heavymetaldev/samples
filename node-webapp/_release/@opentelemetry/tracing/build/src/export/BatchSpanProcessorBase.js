"use strict";
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchSpanProcessorBase = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
/**
 * Implementation of the {@link SpanProcessor} that batches spans exported by
 * the SDK then pushes them to the exporter pipeline.
 */
class BatchSpanProcessorBase {
    constructor(_exporter, config) {
        this._exporter = _exporter;
        this._finishedSpans = [];
        this._isShutdown = false;
        this._shuttingDownPromise = Promise.resolve();
        const env = core_1.getEnv();
        this._maxExportBatchSize =
            typeof (config === null || config === void 0 ? void 0 : config.maxExportBatchSize) === 'number'
                ? config.maxExportBatchSize
                : env.OTEL_BSP_MAX_EXPORT_BATCH_SIZE;
        this._maxQueueSize =
            typeof (config === null || config === void 0 ? void 0 : config.maxQueueSize) === 'number'
                ? config.maxQueueSize
                : env.OTEL_BSP_MAX_QUEUE_SIZE;
        this._scheduledDelayMillis =
            typeof (config === null || config === void 0 ? void 0 : config.scheduledDelayMillis) === 'number'
                ? config.scheduledDelayMillis
                : env.OTEL_BSP_SCHEDULE_DELAY;
        this._exportTimeoutMillis =
            typeof (config === null || config === void 0 ? void 0 : config.exportTimeoutMillis) === 'number'
                ? config.exportTimeoutMillis
                : env.OTEL_BSP_EXPORT_TIMEOUT;
    }
    forceFlush() {
        if (this._isShutdown) {
            return this._shuttingDownPromise;
        }
        return this._flushAll();
    }
    // does nothing.
    onStart(_span) { }
    onEnd(span) {
        if (this._isShutdown) {
            return;
        }
        this._addToBuffer(span);
    }
    shutdown() {
        if (this._isShutdown) {
            return this._shuttingDownPromise;
        }
        this._isShutdown = true;
        this._shuttingDownPromise = new Promise((resolve, reject) => {
            Promise.resolve()
                .then(() => {
                return this.onShutdown();
            })
                .then(() => {
                return this._flushAll();
            })
                .then(() => {
                return this._exporter.shutdown();
            })
                .then(resolve)
                .catch(e => {
                reject(e);
            });
        });
        return this._shuttingDownPromise;
    }
    /** Add a span in the buffer. */
    _addToBuffer(span) {
        if (this._finishedSpans.length >= this._maxQueueSize) {
            // limit reached, drop span
            return;
        }
        this._finishedSpans.push(span);
        this._maybeStartTimer();
    }
    /**
     * Send all spans to the exporter respecting the batch size limit
     * This function is used only on forceFlush or shutdown,
     * for all other cases _flush should be used
     * */
    _flushAll() {
        return new Promise((resolve, reject) => {
            const promises = [];
            // calculate number of batches
            const count = Math.ceil(this._finishedSpans.length / this._maxExportBatchSize);
            for (let i = 0, j = count; i < j; i++) {
                promises.push(this._flushOneBatch());
            }
            Promise.all(promises)
                .then(() => {
                resolve();
            })
                .catch(reject);
        });
    }
    _flushOneBatch() {
        this._clearTimer();
        if (this._finishedSpans.length === 0) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                // don't wait anymore for export, this way the next batch can start
                reject(new Error('Timeout'));
            }, this._exportTimeoutMillis);
            // prevent downstream exporter calls from generating spans
            api_1.context.with(core_1.suppressTracing(api_1.context.active()), () => {
                // Reset the finished spans buffer here because the next invocations of the _flush method
                // could pass the same finished spans to the exporter if the buffer is cleared
                // outside of the execution of this callback.
                this._exporter.export(this._finishedSpans.splice(0, this._maxExportBatchSize), result => {
                    var _a;
                    clearTimeout(timer);
                    if (result.code === core_1.ExportResultCode.SUCCESS) {
                        resolve();
                    }
                    else {
                        reject((_a = result.error) !== null && _a !== void 0 ? _a : new Error('BatchSpanProcessor: span export failed'));
                    }
                });
            });
        });
    }
    _maybeStartTimer() {
        if (this._timer !== undefined)
            return;
        this._timer = setTimeout(() => {
            this._flushOneBatch()
                .then(() => {
                if (this._finishedSpans.length > 0) {
                    this._clearTimer();
                    this._maybeStartTimer();
                }
            })
                .catch(e => {
                core_1.globalErrorHandler(e);
            });
        }, this._scheduledDelayMillis);
        core_1.unrefTimer(this._timer);
    }
    _clearTimer() {
        if (this._timer !== undefined) {
            clearTimeout(this._timer);
            this._timer = undefined;
        }
    }
}
exports.BatchSpanProcessorBase = BatchSpanProcessorBase;
//# sourceMappingURL=BatchSpanProcessorBase.js.map