import { __rest } from "tslib";
/**
 * Converts an OperationOptions to a RequestOptionsBase
 *
 * @param opts - OperationOptions object to convert to RequestOptionsBase
 */
export function operationOptionsToRequestOptionsBase(opts) {
    var _a;
    const { requestOptions, tracingOptions } = opts, additionalOptions = __rest(opts, ["requestOptions", "tracingOptions"]);
    let result = additionalOptions;
    if (requestOptions) {
        result = Object.assign(Object.assign({}, result), requestOptions);
    }
    if (tracingOptions) {
        result.tracingContext = tracingOptions.tracingContext;
        // By passing spanOptions if they exist at runtime, we're backwards compatible with @azure/core-tracing@preview.13 and earlier.
        result.spanOptions = (_a = tracingOptions) === null || _a === void 0 ? void 0 : _a.spanOptions;
    }
    return result;
}
//# sourceMappingURL=operationOptions.js.map