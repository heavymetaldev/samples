// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { BaseRequestPolicy } from "./requestPolicy";
import { shouldRetry, updateRetryData, DEFAULT_CLIENT_MAX_RETRY_INTERVAL, DEFAULT_CLIENT_RETRY_COUNT, DEFAULT_CLIENT_RETRY_INTERVAL, DEFAULT_CLIENT_MIN_RETRY_INTERVAL, isNumber } from "../util/exponentialBackoffStrategy";
import { delay } from "../util/delay";
export function systemErrorRetryPolicy(retryCount, retryInterval, minRetryInterval, maxRetryInterval) {
    return {
        create: (nextPolicy, options) => {
            return new SystemErrorRetryPolicy(nextPolicy, options, retryCount, retryInterval, minRetryInterval, maxRetryInterval);
        }
    };
}
/**
 * @param retryCount - The client retry count.
 * @param retryInterval - The client retry interval, in milliseconds.
 * @param minRetryInterval - The minimum retry interval, in milliseconds.
 * @param maxRetryInterval - The maximum retry interval, in milliseconds.
 */
export class SystemErrorRetryPolicy extends BaseRequestPolicy {
    constructor(nextPolicy, options, retryCount, retryInterval, minRetryInterval, maxRetryInterval) {
        super(nextPolicy, options);
        this.retryCount = isNumber(retryCount) ? retryCount : DEFAULT_CLIENT_RETRY_COUNT;
        this.retryInterval = isNumber(retryInterval) ? retryInterval : DEFAULT_CLIENT_RETRY_INTERVAL;
        this.minRetryInterval = isNumber(minRetryInterval)
            ? minRetryInterval
            : DEFAULT_CLIENT_MIN_RETRY_INTERVAL;
        this.maxRetryInterval = isNumber(maxRetryInterval)
            ? maxRetryInterval
            : DEFAULT_CLIENT_MAX_RETRY_INTERVAL;
    }
    sendRequest(request) {
        return this._nextPolicy
            .sendRequest(request.clone())
            .catch((error) => retry(this, request, error.response, error));
    }
}
async function retry(policy, request, operationResponse, err, retryData) {
    retryData = updateRetryData(policy, retryData, err);
    function shouldPolicyRetry(_response, error) {
        if (error &&
            error.code &&
            (error.code === "ETIMEDOUT" ||
                error.code === "ESOCKETTIMEDOUT" ||
                error.code === "ECONNREFUSED" ||
                error.code === "ECONNRESET" ||
                error.code === "ENOENT")) {
            return true;
        }
        return false;
    }
    if (shouldRetry(policy.retryCount, shouldPolicyRetry, retryData, operationResponse, err)) {
        // If previous operation ended with an error and the policy allows a retry, do that
        try {
            await delay(retryData.retryInterval);
            return policy._nextPolicy.sendRequest(request.clone());
        }
        catch (nestedErr) {
            return retry(policy, request, operationResponse, nestedErr, retryData);
        }
    }
    else {
        if (err) {
            // If the operation failed in the end, return all errors instead of just the last one
            return Promise.reject(retryData.error);
        }
        return operationResponse;
    }
}
//# sourceMappingURL=systemErrorRetryPolicy.js.map