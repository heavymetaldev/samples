// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { isTokenCredential } from "@azure/core-auth";
import { logPolicy } from "./policies/logPolicy";
import { getPathStringFromParameter, getPathStringFromParameterPath } from "./operationParameter";
import { getStreamResponseStatusCodes } from "./operationSpec";
import { deserializationPolicy, DefaultDeserializationOptions } from "./policies/deserializationPolicy";
import { exponentialRetryPolicy, DefaultRetryOptions } from "./policies/exponentialRetryPolicy";
import { generateClientRequestIdPolicy } from "./policies/generateClientRequestIdPolicy";
import { userAgentPolicy, getDefaultUserAgentHeaderName, getDefaultUserAgentValue } from "./policies/userAgentPolicy";
import { redirectPolicy, DefaultRedirectOptions } from "./policies/redirectPolicy";
import { RequestPolicyOptions } from "./policies/requestPolicy";
import { rpRegistrationPolicy } from "./policies/rpRegistrationPolicy";
import { bearerTokenAuthenticationPolicy } from "./policies/bearerTokenAuthenticationPolicy";
import { systemErrorRetryPolicy } from "./policies/systemErrorRetryPolicy";
import { QueryCollectionFormat } from "./queryCollectionFormat";
import { MapperType } from "./serializer";
import { URLBuilder } from "./url";
import * as utils from "./util/utils";
import { stringifyXML } from "./util/xml";
import { WebResource, isWebResourceLike } from "./webResource";
import { isNode } from "./util/utils";
import { proxyPolicy } from "./policies/proxyPolicy";
import { throttlingRetryPolicy } from "./policies/throttlingRetryPolicy";
import { signingPolicy } from "./policies/signingPolicy";
import { logger } from "./log";
import { DefaultKeepAliveOptions, keepAlivePolicy } from "./policies/keepAlivePolicy";
import { tracingPolicy } from "./policies/tracingPolicy";
import { disableResponseDecompressionPolicy } from "./policies/disableResponseDecompressionPolicy";
import { ndJsonPolicy } from "./policies/ndJsonPolicy";
import { XML_ATTRKEY, XML_CHARKEY } from "./util/serializer.common";
import { URL } from "./url";
import { getCachedDefaultHttpClient } from "./httpClientCache";
/**
 * ServiceClient sends service requests and receives responses.
 */
export class ServiceClient {
    /**
     * The ServiceClient constructor
     * @param credentials - The credentials used for authentication with the service.
     * @param options - The service client options that govern the behavior of the client.
     */
    constructor(credentials, 
    /* eslint-disable-next-line @azure/azure-sdk/ts-naming-options */
    options) {
        if (!options) {
            options = {};
        }
        this._withCredentials = options.withCredentials || false;
        this._httpClient = options.httpClient || getCachedDefaultHttpClient();
        this._requestPolicyOptions = new RequestPolicyOptions(options.httpPipelineLogger);
        let requestPolicyFactories;
        if (Array.isArray(options.requestPolicyFactories)) {
            logger.info("ServiceClient: using custom request policies");
            requestPolicyFactories = options.requestPolicyFactories;
        }
        else {
            let authPolicyFactory = undefined;
            if (isTokenCredential(credentials)) {
                logger.info("ServiceClient: creating bearer token authentication policy from provided credentials");
                // Create a wrapped RequestPolicyFactory here so that we can provide the
                // correct scope to the BearerTokenAuthenticationPolicy at the first time
                // one is requested.  This is needed because generated ServiceClient
                // implementations do not set baseUri until after ServiceClient's constructor
                // is finished, leaving baseUri empty at the time when it is needed to
                // build the correct scope name.
                const wrappedPolicyFactory = () => {
                    let bearerTokenPolicyFactory = undefined;
                    // eslint-disable-next-line @typescript-eslint/no-this-alias
                    const serviceClient = this;
                    const serviceClientOptions = options;
                    return {
                        create(nextPolicy, createOptions) {
                            const credentialScopes = getCredentialScopes(serviceClientOptions, serviceClient.baseUri);
                            if (!credentialScopes) {
                                throw new Error(`When using credential, the ServiceClient must contain a baseUri or a credentialScopes in ServiceClientOptions. Unable to create a bearerTokenAuthenticationPolicy`);
                            }
                            if (bearerTokenPolicyFactory === undefined || bearerTokenPolicyFactory === null) {
                                bearerTokenPolicyFactory = bearerTokenAuthenticationPolicy(credentials, credentialScopes);
                            }
                            return bearerTokenPolicyFactory.create(nextPolicy, createOptions);
                        }
                    };
                };
                authPolicyFactory = wrappedPolicyFactory();
            }
            else if (credentials && typeof credentials.signRequest === "function") {
                logger.info("ServiceClient: creating signing policy from provided credentials");
                authPolicyFactory = signingPolicy(credentials);
            }
            else if (credentials !== undefined && credentials !== null) {
                throw new Error("The credentials argument must implement the TokenCredential interface");
            }
            logger.info("ServiceClient: using default request policies");
            requestPolicyFactories = createDefaultRequestPolicyFactories(authPolicyFactory, options);
            if (options.requestPolicyFactories) {
                // options.requestPolicyFactories can also be a function that manipulates
                // the default requestPolicyFactories array
                const newRequestPolicyFactories = options.requestPolicyFactories(requestPolicyFactories);
                if (newRequestPolicyFactories) {
                    requestPolicyFactories = newRequestPolicyFactories;
                }
            }
        }
        this._requestPolicyFactories = requestPolicyFactories;
    }
    /**
     * Send the provided httpRequest.
     */
    sendRequest(options) {
        if (options === null || options === undefined || typeof options !== "object") {
            throw new Error("options cannot be null or undefined and it must be of type object.");
        }
        let httpRequest;
        try {
            if (isWebResourceLike(options)) {
                options.validateRequestProperties();
                httpRequest = options;
            }
            else {
                httpRequest = new WebResource();
                httpRequest = httpRequest.prepare(options);
            }
        }
        catch (error) {
            return Promise.reject(error);
        }
        let httpPipeline = this._httpClient;
        if (this._requestPolicyFactories && this._requestPolicyFactories.length > 0) {
            for (let i = this._requestPolicyFactories.length - 1; i >= 0; --i) {
                httpPipeline = this._requestPolicyFactories[i].create(httpPipeline, this._requestPolicyOptions);
            }
        }
        return httpPipeline.sendRequest(httpRequest);
    }
    /**
     * Send an HTTP request that is populated using the provided OperationSpec.
     * @param operationArguments - The arguments that the HTTP request's templated values will be populated from.
     * @param operationSpec - The OperationSpec to use to populate the httpRequest.
     * @param callback - The callback to call when the response is received.
     */
    async sendOperationRequest(operationArguments, operationSpec, callback) {
        var _a;
        if (typeof operationArguments.options === "function") {
            callback = operationArguments.options;
            operationArguments.options = undefined;
        }
        const serializerOptions = (_a = operationArguments.options) === null || _a === void 0 ? void 0 : _a.serializerOptions;
        const httpRequest = new WebResource();
        let result;
        try {
            const baseUri = operationSpec.baseUrl || this.baseUri;
            if (!baseUri) {
                throw new Error("If operationSpec.baseUrl is not specified, then the ServiceClient must have a baseUri string property that contains the base URL to use.");
            }
            httpRequest.method = operationSpec.httpMethod;
            httpRequest.operationSpec = operationSpec;
            const requestUrl = URLBuilder.parse(baseUri);
            if (operationSpec.path) {
                requestUrl.appendPath(operationSpec.path);
            }
            if (operationSpec.urlParameters && operationSpec.urlParameters.length > 0) {
                for (const urlParameter of operationSpec.urlParameters) {
                    let urlParameterValue = getOperationArgumentValueFromParameter(this, operationArguments, urlParameter, operationSpec.serializer);
                    urlParameterValue = operationSpec.serializer.serialize(urlParameter.mapper, urlParameterValue, getPathStringFromParameter(urlParameter), serializerOptions);
                    if (!urlParameter.skipEncoding) {
                        urlParameterValue = encodeURIComponent(urlParameterValue);
                    }
                    requestUrl.replaceAll(`{${urlParameter.mapper.serializedName || getPathStringFromParameter(urlParameter)}}`, urlParameterValue);
                }
            }
            if (operationSpec.queryParameters && operationSpec.queryParameters.length > 0) {
                for (const queryParameter of operationSpec.queryParameters) {
                    let queryParameterValue = getOperationArgumentValueFromParameter(this, operationArguments, queryParameter, operationSpec.serializer);
                    if (queryParameterValue !== undefined && queryParameterValue !== null) {
                        queryParameterValue = operationSpec.serializer.serialize(queryParameter.mapper, queryParameterValue, getPathStringFromParameter(queryParameter), serializerOptions);
                        if (queryParameter.collectionFormat !== undefined &&
                            queryParameter.collectionFormat !== null) {
                            if (queryParameter.collectionFormat === QueryCollectionFormat.Multi) {
                                if (queryParameterValue.length === 0) {
                                    // The collection is empty, no need to try serializing the current queryParam
                                    continue;
                                }
                                else {
                                    for (const index in queryParameterValue) {
                                        const item = queryParameterValue[index];
                                        queryParameterValue[index] =
                                            item === undefined || item === null ? "" : item.toString();
                                    }
                                }
                            }
                            else if (queryParameter.collectionFormat === QueryCollectionFormat.Ssv ||
                                queryParameter.collectionFormat === QueryCollectionFormat.Tsv) {
                                queryParameterValue = queryParameterValue.join(queryParameter.collectionFormat);
                            }
                        }
                        if (!queryParameter.skipEncoding) {
                            if (Array.isArray(queryParameterValue)) {
                                for (const index in queryParameterValue) {
                                    if (queryParameterValue[index] !== undefined &&
                                        queryParameterValue[index] !== null) {
                                        queryParameterValue[index] = encodeURIComponent(queryParameterValue[index]);
                                    }
                                }
                            }
                            else {
                                queryParameterValue = encodeURIComponent(queryParameterValue);
                            }
                        }
                        if (queryParameter.collectionFormat !== undefined &&
                            queryParameter.collectionFormat !== null &&
                            queryParameter.collectionFormat !== QueryCollectionFormat.Multi &&
                            queryParameter.collectionFormat !== QueryCollectionFormat.Ssv &&
                            queryParameter.collectionFormat !== QueryCollectionFormat.Tsv) {
                            queryParameterValue = queryParameterValue.join(queryParameter.collectionFormat);
                        }
                        requestUrl.setQueryParameter(queryParameter.mapper.serializedName || getPathStringFromParameter(queryParameter), queryParameterValue);
                    }
                }
            }
            httpRequest.url = requestUrl.toString();
            const contentType = operationSpec.contentType || this.requestContentType;
            if (contentType && operationSpec.requestBody) {
                httpRequest.headers.set("Content-Type", contentType);
            }
            if (operationSpec.headerParameters) {
                for (const headerParameter of operationSpec.headerParameters) {
                    let headerValue = getOperationArgumentValueFromParameter(this, operationArguments, headerParameter, operationSpec.serializer);
                    if (headerValue !== undefined && headerValue !== null) {
                        headerValue = operationSpec.serializer.serialize(headerParameter.mapper, headerValue, getPathStringFromParameter(headerParameter), serializerOptions);
                        const headerCollectionPrefix = headerParameter.mapper
                            .headerCollectionPrefix;
                        if (headerCollectionPrefix) {
                            for (const key of Object.keys(headerValue)) {
                                httpRequest.headers.set(headerCollectionPrefix + key, headerValue[key]);
                            }
                        }
                        else {
                            httpRequest.headers.set(headerParameter.mapper.serializedName ||
                                getPathStringFromParameter(headerParameter), headerValue);
                        }
                    }
                }
            }
            const options = operationArguments.options;
            if (options) {
                if (options.customHeaders) {
                    for (const customHeaderName in options.customHeaders) {
                        httpRequest.headers.set(customHeaderName, options.customHeaders[customHeaderName]);
                    }
                }
                if (options.abortSignal) {
                    httpRequest.abortSignal = options.abortSignal;
                }
                if (options.timeout) {
                    httpRequest.timeout = options.timeout;
                }
                if (options.onUploadProgress) {
                    httpRequest.onUploadProgress = options.onUploadProgress;
                }
                if (options.onDownloadProgress) {
                    httpRequest.onDownloadProgress = options.onDownloadProgress;
                }
                if (options.spanOptions) {
                    // By passing spanOptions if they exist at runtime, we're backwards compatible with @azure/core-tracing@preview.13 and earlier.
                    httpRequest.spanOptions = options.spanOptions;
                }
                if (options.tracingContext) {
                    httpRequest.tracingContext = options.tracingContext;
                }
                if (options.shouldDeserialize !== undefined && options.shouldDeserialize !== null) {
                    httpRequest.shouldDeserialize = options.shouldDeserialize;
                }
            }
            httpRequest.withCredentials = this._withCredentials;
            serializeRequestBody(this, httpRequest, operationArguments, operationSpec);
            if (httpRequest.streamResponseStatusCodes === undefined) {
                httpRequest.streamResponseStatusCodes = getStreamResponseStatusCodes(operationSpec);
            }
            let rawResponse;
            let sendRequestError;
            try {
                rawResponse = await this.sendRequest(httpRequest);
            }
            catch (error) {
                sendRequestError = error;
            }
            if (sendRequestError) {
                if (sendRequestError.response) {
                    sendRequestError.details = flattenResponse(sendRequestError.response, operationSpec.responses[sendRequestError.statusCode] ||
                        operationSpec.responses["default"]);
                }
                result = Promise.reject(sendRequestError);
            }
            else {
                result = Promise.resolve(flattenResponse(rawResponse, operationSpec.responses[rawResponse.status]));
            }
        }
        catch (error) {
            result = Promise.reject(error);
        }
        const cb = callback;
        if (cb) {
            result
                .then((res) => cb(null, res._response.parsedBody, res._response.request, res._response))
                .catch((err) => cb(err));
        }
        return result;
    }
}
export function serializeRequestBody(serviceClient, httpRequest, operationArguments, operationSpec) {
    var _a, _b, _c, _d, _e, _f;
    const serializerOptions = (_b = (_a = operationArguments.options) === null || _a === void 0 ? void 0 : _a.serializerOptions) !== null && _b !== void 0 ? _b : {};
    const updatedOptions = {
        rootName: (_c = serializerOptions.rootName) !== null && _c !== void 0 ? _c : "",
        includeRoot: (_d = serializerOptions.includeRoot) !== null && _d !== void 0 ? _d : false,
        xmlCharKey: (_e = serializerOptions.xmlCharKey) !== null && _e !== void 0 ? _e : XML_CHARKEY
    };
    const xmlCharKey = serializerOptions.xmlCharKey;
    if (operationSpec.requestBody && operationSpec.requestBody.mapper) {
        httpRequest.body = getOperationArgumentValueFromParameter(serviceClient, operationArguments, operationSpec.requestBody, operationSpec.serializer);
        const bodyMapper = operationSpec.requestBody.mapper;
        const { required, xmlName, xmlElementName, serializedName, xmlNamespace, xmlNamespacePrefix } = bodyMapper;
        const typeName = bodyMapper.type.name;
        try {
            if ((httpRequest.body !== undefined && httpRequest.body !== null) || required) {
                const requestBodyParameterPathString = getPathStringFromParameter(operationSpec.requestBody);
                httpRequest.body = operationSpec.serializer.serialize(bodyMapper, httpRequest.body, requestBodyParameterPathString, updatedOptions);
                const isStream = typeName === MapperType.Stream;
                if (operationSpec.isXML) {
                    const xmlnsKey = xmlNamespacePrefix ? `xmlns:${xmlNamespacePrefix}` : "xmlns";
                    const value = getXmlValueWithNamespace(xmlNamespace, xmlnsKey, typeName, httpRequest.body, updatedOptions);
                    if (typeName === MapperType.Sequence) {
                        httpRequest.body = stringifyXML(utils.prepareXMLRootList(value, xmlElementName || xmlName || serializedName, xmlnsKey, xmlNamespace), {
                            rootName: xmlName || serializedName,
                            xmlCharKey
                        });
                    }
                    else if (!isStream) {
                        httpRequest.body = stringifyXML(value, {
                            rootName: xmlName || serializedName,
                            xmlCharKey
                        });
                    }
                }
                else if (typeName === MapperType.String &&
                    (((_f = operationSpec.contentType) === null || _f === void 0 ? void 0 : _f.match("text/plain")) || operationSpec.mediaType === "text")) {
                    // the String serializer has validated that request body is a string
                    // so just send the string.
                    return;
                }
                else if (!isStream) {
                    httpRequest.body = JSON.stringify(httpRequest.body);
                }
            }
        }
        catch (error) {
            throw new Error(`Error "${error.message}" occurred in serializing the payload - ${JSON.stringify(serializedName, undefined, "  ")}.`);
        }
    }
    else if (operationSpec.formDataParameters && operationSpec.formDataParameters.length > 0) {
        httpRequest.formData = {};
        for (const formDataParameter of operationSpec.formDataParameters) {
            const formDataParameterValue = getOperationArgumentValueFromParameter(serviceClient, operationArguments, formDataParameter, operationSpec.serializer);
            if (formDataParameterValue !== undefined && formDataParameterValue !== null) {
                const formDataParameterPropertyName = formDataParameter.mapper.serializedName || getPathStringFromParameter(formDataParameter);
                httpRequest.formData[formDataParameterPropertyName] = operationSpec.serializer.serialize(formDataParameter.mapper, formDataParameterValue, getPathStringFromParameter(formDataParameter), updatedOptions);
            }
        }
    }
}
/**
 * Adds an xml namespace to the xml serialized object if needed, otherwise it just returns the value itself
 */
function getXmlValueWithNamespace(xmlNamespace, xmlnsKey, typeName, serializedValue, options) {
    // Composite and Sequence schemas already got their root namespace set during serialization
    // We just need to add xmlns to the other schema types
    if (xmlNamespace && !["Composite", "Sequence", "Dictionary"].includes(typeName)) {
        const result = {};
        result[options.xmlCharKey] = serializedValue;
        result[XML_ATTRKEY] = { [xmlnsKey]: xmlNamespace };
        return result;
    }
    return serializedValue;
}
function getValueOrFunctionResult(value, defaultValueCreator) {
    let result;
    if (typeof value === "string") {
        result = value;
    }
    else {
        result = defaultValueCreator();
        if (typeof value === "function") {
            result = value(result);
        }
    }
    return result;
}
function createDefaultRequestPolicyFactories(authPolicyFactory, options) {
    const factories = [];
    if (options.generateClientRequestIdHeader) {
        factories.push(generateClientRequestIdPolicy(options.clientRequestIdHeaderName));
    }
    if (authPolicyFactory) {
        factories.push(authPolicyFactory);
    }
    const userAgentHeaderName = getValueOrFunctionResult(options.userAgentHeaderName, getDefaultUserAgentHeaderName);
    const userAgentHeaderValue = getValueOrFunctionResult(options.userAgent, getDefaultUserAgentValue);
    if (userAgentHeaderName && userAgentHeaderValue) {
        factories.push(userAgentPolicy({ key: userAgentHeaderName, value: userAgentHeaderValue }));
    }
    factories.push(redirectPolicy());
    factories.push(rpRegistrationPolicy(options.rpRegistrationRetryTimeout));
    if (!options.noRetryPolicy) {
        factories.push(exponentialRetryPolicy());
        factories.push(systemErrorRetryPolicy());
        factories.push(throttlingRetryPolicy());
    }
    factories.push(deserializationPolicy(options.deserializationContentTypes));
    if (isNode) {
        factories.push(proxyPolicy(options.proxySettings));
    }
    factories.push(logPolicy({ logger: logger.info }));
    return factories;
}
export function createPipelineFromOptions(pipelineOptions, authPolicyFactory) {
    const requestPolicyFactories = [];
    if (pipelineOptions.sendStreamingJson) {
        requestPolicyFactories.push(ndJsonPolicy());
    }
    let userAgentValue = undefined;
    if (pipelineOptions.userAgentOptions && pipelineOptions.userAgentOptions.userAgentPrefix) {
        const userAgentInfo = [];
        userAgentInfo.push(pipelineOptions.userAgentOptions.userAgentPrefix);
        // Add the default user agent value if it isn't already specified
        // by the userAgentPrefix option.
        const defaultUserAgentInfo = getDefaultUserAgentValue();
        if (userAgentInfo.indexOf(defaultUserAgentInfo) === -1) {
            userAgentInfo.push(defaultUserAgentInfo);
        }
        userAgentValue = userAgentInfo.join(" ");
    }
    const keepAliveOptions = Object.assign(Object.assign({}, DefaultKeepAliveOptions), pipelineOptions.keepAliveOptions);
    const retryOptions = Object.assign(Object.assign({}, DefaultRetryOptions), pipelineOptions.retryOptions);
    const redirectOptions = Object.assign(Object.assign({}, DefaultRedirectOptions), pipelineOptions.redirectOptions);
    if (isNode) {
        requestPolicyFactories.push(proxyPolicy(pipelineOptions.proxyOptions));
    }
    const deserializationOptions = Object.assign(Object.assign({}, DefaultDeserializationOptions), pipelineOptions.deserializationOptions);
    const loggingOptions = Object.assign({}, pipelineOptions.loggingOptions);
    requestPolicyFactories.push(tracingPolicy({ userAgent: userAgentValue }), keepAlivePolicy(keepAliveOptions), userAgentPolicy({ value: userAgentValue }), generateClientRequestIdPolicy(), deserializationPolicy(deserializationOptions.expectedContentTypes), throttlingRetryPolicy(), systemErrorRetryPolicy(), exponentialRetryPolicy(retryOptions.maxRetries, retryOptions.retryDelayInMs, retryOptions.maxRetryDelayInMs));
    if (redirectOptions.handleRedirects) {
        requestPolicyFactories.push(redirectPolicy(redirectOptions.maxRetries));
    }
    if (authPolicyFactory) {
        requestPolicyFactories.push(authPolicyFactory);
    }
    requestPolicyFactories.push(logPolicy(loggingOptions));
    if (isNode && pipelineOptions.decompressResponse === false) {
        requestPolicyFactories.push(disableResponseDecompressionPolicy());
    }
    return {
        httpClient: pipelineOptions.httpClient,
        requestPolicyFactories
    };
}
/**
 * Get the property parent for the property at the provided path when starting with the provided
 * parent object.
 */
export function getPropertyParent(parent, propertyPath) {
    if (parent && propertyPath) {
        const propertyPathLength = propertyPath.length;
        for (let i = 0; i < propertyPathLength - 1; ++i) {
            const propertyName = propertyPath[i];
            if (!parent[propertyName]) {
                parent[propertyName] = {};
            }
            parent = parent[propertyName];
        }
    }
    return parent;
}
function getOperationArgumentValueFromParameter(serviceClient, operationArguments, parameter, serializer) {
    return getOperationArgumentValueFromParameterPath(serviceClient, operationArguments, parameter.parameterPath, parameter.mapper, serializer);
}
export function getOperationArgumentValueFromParameterPath(serviceClient, operationArguments, parameterPath, parameterMapper, serializer) {
    var _a;
    let value;
    if (typeof parameterPath === "string") {
        parameterPath = [parameterPath];
    }
    const serializerOptions = (_a = operationArguments.options) === null || _a === void 0 ? void 0 : _a.serializerOptions;
    if (Array.isArray(parameterPath)) {
        if (parameterPath.length > 0) {
            if (parameterMapper.isConstant) {
                value = parameterMapper.defaultValue;
            }
            else {
                let propertySearchResult = getPropertyFromParameterPath(operationArguments, parameterPath);
                if (!propertySearchResult.propertyFound) {
                    propertySearchResult = getPropertyFromParameterPath(serviceClient, parameterPath);
                }
                let useDefaultValue = false;
                if (!propertySearchResult.propertyFound) {
                    useDefaultValue =
                        parameterMapper.required ||
                            (parameterPath[0] === "options" && parameterPath.length === 2);
                }
                value = useDefaultValue ? parameterMapper.defaultValue : propertySearchResult.propertyValue;
            }
            // Serialize just for validation purposes.
            const parameterPathString = getPathStringFromParameterPath(parameterPath, parameterMapper);
            serializer.serialize(parameterMapper, value, parameterPathString, serializerOptions);
        }
    }
    else {
        if (parameterMapper.required) {
            value = {};
        }
        for (const propertyName in parameterPath) {
            const propertyMapper = parameterMapper.type.modelProperties[propertyName];
            const propertyPath = parameterPath[propertyName];
            const propertyValue = getOperationArgumentValueFromParameterPath(serviceClient, operationArguments, propertyPath, propertyMapper, serializer);
            // Serialize just for validation purposes.
            const propertyPathString = getPathStringFromParameterPath(propertyPath, propertyMapper);
            serializer.serialize(propertyMapper, propertyValue, propertyPathString, serializerOptions);
            if (propertyValue !== undefined && propertyValue !== null) {
                if (!value) {
                    value = {};
                }
                value[propertyName] = propertyValue;
            }
        }
    }
    return value;
}
function getPropertyFromParameterPath(parent, parameterPath) {
    const result = { propertyFound: false };
    let i = 0;
    for (; i < parameterPath.length; ++i) {
        const parameterPathPart = parameterPath[i];
        // Make sure to check inherited properties too, so don't use hasOwnProperty().
        if (parent !== undefined && parent !== null && parameterPathPart in parent) {
            parent = parent[parameterPathPart];
        }
        else {
            break;
        }
    }
    if (i === parameterPath.length) {
        result.propertyValue = parent;
        result.propertyFound = true;
    }
    return result;
}
export function flattenResponse(_response, responseSpec) {
    const parsedHeaders = _response.parsedHeaders;
    const bodyMapper = responseSpec && responseSpec.bodyMapper;
    const addOperationResponse = (obj) => {
        return Object.defineProperty(obj, "_response", {
            value: _response
        });
    };
    if (bodyMapper) {
        const typeName = bodyMapper.type.name;
        if (typeName === "Stream") {
            return addOperationResponse(Object.assign(Object.assign({}, parsedHeaders), { blobBody: _response.blobBody, readableStreamBody: _response.readableStreamBody }));
        }
        const modelProperties = (typeName === "Composite" && bodyMapper.type.modelProperties) || {};
        const isPageableResponse = Object.keys(modelProperties).some((k) => modelProperties[k].serializedName === "");
        if (typeName === "Sequence" || isPageableResponse) {
            const arrayResponse = [...(_response.parsedBody || [])];
            for (const key of Object.keys(modelProperties)) {
                if (modelProperties[key].serializedName) {
                    arrayResponse[key] = _response.parsedBody[key];
                }
            }
            if (parsedHeaders) {
                for (const key of Object.keys(parsedHeaders)) {
                    arrayResponse[key] = parsedHeaders[key];
                }
            }
            addOperationResponse(arrayResponse);
            return arrayResponse;
        }
        if (typeName === "Composite" || typeName === "Dictionary") {
            return addOperationResponse(Object.assign(Object.assign({}, parsedHeaders), _response.parsedBody));
        }
    }
    if (bodyMapper ||
        _response.request.method === "HEAD" ||
        utils.isPrimitiveType(_response.parsedBody)) {
        // primitive body types and HEAD booleans
        return addOperationResponse(Object.assign(Object.assign({}, parsedHeaders), { body: _response.parsedBody }));
    }
    return addOperationResponse(Object.assign(Object.assign({}, parsedHeaders), _response.parsedBody));
}
function getCredentialScopes(options, baseUri) {
    if (options === null || options === void 0 ? void 0 : options.credentialScopes) {
        const scopes = options.credentialScopes;
        return Array.isArray(scopes)
            ? scopes.map((scope) => new URL(scope).toString())
            : new URL(scopes).toString();
    }
    if (baseUri) {
        return `${baseUri}/.default`;
    }
    return undefined;
}
//# sourceMappingURL=serviceClient.js.map