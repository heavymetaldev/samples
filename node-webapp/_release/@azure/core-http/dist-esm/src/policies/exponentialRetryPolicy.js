// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { BaseRequestPolicy } from "./requestPolicy";
import { DEFAULT_CLIENT_MAX_RETRY_INTERVAL, DEFAULT_CLIENT_RETRY_COUNT, DEFAULT_CLIENT_RETRY_INTERVAL, isNumber, updateRetryData, shouldRetry } from "../util/exponentialBackoffStrategy";
import { RestError } from "../restError";
import { logger } from "../log";
import { Constants } from "../util/constants";
import { delay } from "../util/delay";
export function exponentialRetryPolicy(retryCount, retryInterval, maxRetryInterval) {
    return {
        create: (nextPolicy, options) => {
            return new ExponentialRetryPolicy(nextPolicy, options, retryCount, retryInterval, maxRetryInterval);
        }
    };
}
/**
 * Describes the Retry Mode type. Currently supporting only Exponential.
 */
export var RetryMode;
(function (RetryMode) {
    RetryMode[RetryMode["Exponential"] = 0] = "Exponential";
})(RetryMode || (RetryMode = {}));
export const DefaultRetryOptions = {
    maxRetries: DEFAULT_CLIENT_RETRY_COUNT,
    retryDelayInMs: DEFAULT_CLIENT_RETRY_INTERVAL,
    maxRetryDelayInMs: DEFAULT_CLIENT_MAX_RETRY_INTERVAL
};
/**
 * Instantiates a new "ExponentialRetryPolicyFilter" instance.
 */
export class ExponentialRetryPolicy extends BaseRequestPolicy {
    /**
     * @param nextPolicy - The next RequestPolicy in the pipeline chain.
     * @param options - The options for this RequestPolicy.
     * @param retryCount - The client retry count.
     * @param retryInterval - The client retry interval, in milliseconds.
     * @param minRetryInterval - The minimum retry interval, in milliseconds.
     * @param maxRetryInterval - The maximum retry interval, in milliseconds.
     */
    constructor(nextPolicy, options, retryCount, retryInterval, maxRetryInterval) {
        super(nextPolicy, options);
        this.retryCount = isNumber(retryCount) ? retryCount : DEFAULT_CLIENT_RETRY_COUNT;
        this.retryInterval = isNumber(retryInterval) ? retryInterval : DEFAULT_CLIENT_RETRY_INTERVAL;
        this.maxRetryInterval = isNumber(maxRetryInterval)
            ? maxRetryInterval
            : DEFAULT_CLIENT_MAX_RETRY_INTERVAL;
    }
    sendRequest(request) {
        return this._nextPolicy
            .sendRequest(request.clone())
            .then((response) => retry(this, request, response))
            .catch((error) => retry(this, request, error.response, undefined, error));
    }
}
async function retry(policy, request, response, retryData, requestError) {
    function shouldPolicyRetry(responseParam) {
        const statusCode = responseParam === null || responseParam === void 0 ? void 0 : responseParam.status;
        if (statusCode === 503 && (response === null || response === void 0 ? void 0 : response.headers.get(Constants.HeaderConstants.RETRY_AFTER))) {
            return false;
        }
        if (statusCode === undefined ||
            (statusCode < 500 && statusCode !== 408) ||
            statusCode === 501 ||
            statusCode === 505) {
            return false;
        }
        return true;
    }
    retryData = updateRetryData({
        retryInterval: policy.retryInterval,
        minRetryInterval: 0,
        maxRetryInterval: policy.maxRetryInterval
    }, retryData, requestError);
    const isAborted = request.abortSignal && request.abortSignal.aborted;
    if (!isAborted && shouldRetry(policy.retryCount, shouldPolicyRetry, retryData, response)) {
        logger.info(`Retrying request in ${retryData.retryInterval}`);
        try {
            await delay(retryData.retryInterval);
            const res = await policy._nextPolicy.sendRequest(request.clone());
            return retry(policy, request, res, retryData);
        }
        catch (err) {
            return retry(policy, request, response, retryData, err);
        }
    }
    else if (isAborted || requestError || !response) {
        // If the operation failed in the end, return all errors instead of just the last one
        const err = retryData.error ||
            new RestError("Failed to send the request.", RestError.REQUEST_SEND_ERROR, response && response.status, response && response.request, response);
        throw err;
    }
    else {
        return response;
    }
}
//# sourceMappingURL=exponentialRetryPolicy.js.map