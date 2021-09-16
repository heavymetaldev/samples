'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var uuid = require('uuid');
var tough = require('tough-cookie');
var http = require('http');
var https = require('https');
var node_fetch = _interopDefault(require('node-fetch'));
var abortController = require('@azure/abort-controller');
var FormData = _interopDefault(require('form-data'));
var util = require('util');
var url = require('url');
var stream = require('stream');
var logger$1 = require('@azure/logger');
var tunnel = require('tunnel');
var tslib = require('tslib');
var coreAuth = require('@azure/core-auth');
var xml2js = require('xml2js');
var os = require('os');
var coreTracing = require('@azure/core-tracing');
require('@azure/core-asynciterator-polyfill');

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * A collection of HttpHeaders that can be sent with a HTTP request.
 */
function getHeaderKey(headerName) {
    return headerName.toLowerCase();
}
function isHttpHeadersLike(object) {
    if (object && typeof object === "object") {
        const castObject = object;
        if (typeof castObject.rawHeaders === "function" &&
            typeof castObject.clone === "function" &&
            typeof castObject.get === "function" &&
            typeof castObject.set === "function" &&
            typeof castObject.contains === "function" &&
            typeof castObject.remove === "function" &&
            typeof castObject.headersArray === "function" &&
            typeof castObject.headerValues === "function" &&
            typeof castObject.headerNames === "function" &&
            typeof castObject.toJson === "function") {
            return true;
        }
    }
    return false;
}
/**
 * A collection of HTTP header key/value pairs.
 */
class HttpHeaders {
    constructor(rawHeaders) {
        this._headersMap = {};
        if (rawHeaders) {
            for (const headerName in rawHeaders) {
                this.set(headerName, rawHeaders[headerName]);
            }
        }
    }
    /**
     * Set a header in this collection with the provided name and value. The name is
     * case-insensitive.
     * @param headerName - The name of the header to set. This value is case-insensitive.
     * @param headerValue - The value of the header to set.
     */
    set(headerName, headerValue) {
        this._headersMap[getHeaderKey(headerName)] = {
            name: headerName,
            value: headerValue.toString()
        };
    }
    /**
     * Get the header value for the provided header name, or undefined if no header exists in this
     * collection with the provided name.
     * @param headerName - The name of the header.
     */
    get(headerName) {
        const header = this._headersMap[getHeaderKey(headerName)];
        return !header ? undefined : header.value;
    }
    /**
     * Get whether or not this header collection contains a header entry for the provided header name.
     */
    contains(headerName) {
        return !!this._headersMap[getHeaderKey(headerName)];
    }
    /**
     * Remove the header with the provided headerName. Return whether or not the header existed and
     * was removed.
     * @param headerName - The name of the header to remove.
     */
    remove(headerName) {
        const result = this.contains(headerName);
        delete this._headersMap[getHeaderKey(headerName)];
        return result;
    }
    /**
     * Get the headers that are contained this collection as an object.
     */
    rawHeaders() {
        const result = {};
        for (const headerKey in this._headersMap) {
            const header = this._headersMap[headerKey];
            result[header.name.toLowerCase()] = header.value;
        }
        return result;
    }
    /**
     * Get the headers that are contained in this collection as an array.
     */
    headersArray() {
        const headers = [];
        for (const headerKey in this._headersMap) {
            headers.push(this._headersMap[headerKey]);
        }
        return headers;
    }
    /**
     * Get the header names that are contained in this collection.
     */
    headerNames() {
        const headerNames = [];
        const headers = this.headersArray();
        for (let i = 0; i < headers.length; ++i) {
            headerNames.push(headers[i].name);
        }
        return headerNames;
    }
    /**
     * Get the header values that are contained in this collection.
     */
    headerValues() {
        const headerValues = [];
        const headers = this.headersArray();
        for (let i = 0; i < headers.length; ++i) {
            headerValues.push(headers[i].value);
        }
        return headerValues;
    }
    /**
     * Get the JSON object representation of this HTTP header collection.
     */
    toJson() {
        return this.rawHeaders();
    }
    /**
     * Get the string representation of this HTTP header collection.
     */
    toString() {
        return JSON.stringify(this.toJson());
    }
    /**
     * Create a deep clone/copy of this HttpHeaders collection.
     */
    clone() {
        return new HttpHeaders(this.rawHeaders());
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Encodes a string in base64 format.
 * @param value - The string to encode
 */
function encodeString(value) {
    return Buffer.from(value).toString("base64");
}
/**
 * Encodes a byte array in base64 format.
 * @param value - The Uint8Aray to encode
 */
function encodeByteArray(value) {
    // Buffer.from accepts <ArrayBuffer> | <SharedArrayBuffer>-- the TypeScript definition is off here
    // https://nodejs.org/api/buffer.html#buffer_class_method_buffer_from_arraybuffer_byteoffset_length
    const bufferValue = value instanceof Buffer ? value : Buffer.from(value.buffer);
    return bufferValue.toString("base64");
}
/**
 * Decodes a base64 string into a byte array.
 * @param value - The base64 string to decode
 */
function decodeString(value) {
    return Buffer.from(value, "base64");
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
const Constants = {
    /**
     * The core-http version
     */
    coreHttpVersion: "2.2.0",
    /**
     * Specifies HTTP.
     */
    HTTP: "http:",
    /**
     * Specifies HTTPS.
     */
    HTTPS: "https:",
    /**
     * Specifies HTTP Proxy.
     */
    HTTP_PROXY: "HTTP_PROXY",
    /**
     * Specifies HTTPS Proxy.
     */
    HTTPS_PROXY: "HTTPS_PROXY",
    /**
     * Specifies NO Proxy.
     */
    NO_PROXY: "NO_PROXY",
    /**
     * Specifies ALL Proxy.
     */
    ALL_PROXY: "ALL_PROXY",
    HttpConstants: {
        /**
         * Http Verbs
         */
        HttpVerbs: {
            PUT: "PUT",
            GET: "GET",
            DELETE: "DELETE",
            POST: "POST",
            MERGE: "MERGE",
            HEAD: "HEAD",
            PATCH: "PATCH"
        },
        StatusCodes: {
            TooManyRequests: 429,
            ServiceUnavailable: 503
        }
    },
    /**
     * Defines constants for use with HTTP headers.
     */
    HeaderConstants: {
        /**
         * The Authorization header.
         */
        AUTHORIZATION: "authorization",
        AUTHORIZATION_SCHEME: "Bearer",
        /**
         * The Retry-After response-header field can be used with a 503 (Service
         * Unavailable) or 349 (Too Many Requests) responses to indicate how long
         * the service is expected to be unavailable to the requesting client.
         */
        RETRY_AFTER: "Retry-After",
        /**
         * The UserAgent header.
         */
        USER_AGENT: "User-Agent"
    }
};

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Default key used to access the XML attributes.
 */
const XML_ATTRKEY = "$";
/**
 * Default key used to access the XML value content.
 */
const XML_CHARKEY = "_";

// Copyright (c) Microsoft Corporation.
const validUuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;
/**
 * A constant that indicates whether the environment is node.js or browser based.
 */
const isNode = typeof process !== "undefined" &&
    !!process.version &&
    !!process.versions &&
    !!process.versions.node;
/**
 * Encodes an URI.
 *
 * @param uri - The URI to be encoded.
 * @returns The encoded URI.
 */
function encodeUri(uri) {
    return encodeURIComponent(uri)
        .replace(/!/g, "%21")
        .replace(/"/g, "%27")
        .replace(/\(/g, "%28")
        .replace(/\)/g, "%29")
        .replace(/\*/g, "%2A");
}
/**
 * Returns a stripped version of the Http Response which only contains body,
 * headers and the status.
 *
 * @param response - The Http Response
 * @returns The stripped version of Http Response.
 */
function stripResponse(response) {
    const strippedResponse = {};
    strippedResponse.body = response.bodyAsText;
    strippedResponse.headers = response.headers;
    strippedResponse.status = response.status;
    return strippedResponse;
}
/**
 * Returns a stripped version of the Http Request that does not contain the
 * Authorization header.
 *
 * @param request - The Http Request object
 * @returns The stripped version of Http Request.
 */
function stripRequest(request) {
    const strippedRequest = request.clone();
    if (strippedRequest.headers) {
        strippedRequest.headers.remove("authorization");
    }
    return strippedRequest;
}
/**
 * Validates the given uuid as a string
 *
 * @param uuid - The uuid as a string that needs to be validated
 * @returns True if the uuid is valid; false otherwise.
 */
function isValidUuid(uuid) {
    return validUuidRegex.test(uuid);
}
/**
 * Generated UUID
 *
 * @returns RFC4122 v4 UUID.
 */
function generateUuid() {
    return uuid.v4();
}
/**
 * Executes an array of promises sequentially. Inspiration of this method is here:
 * https://pouchdb.com/2015/05/18/we-have-a-problem-with-promises.html. An awesome blog on promises!
 *
 * @param promiseFactories - An array of promise factories(A function that return a promise)
 * @param kickstart - Input to the first promise that is used to kickstart the promise chain.
 * If not provided then the promise chain starts with undefined.
 * @returns A chain of resolved or rejected promises
 */
function executePromisesSequentially(promiseFactories, kickstart) {
    let result = Promise.resolve(kickstart);
    promiseFactories.forEach((promiseFactory) => {
        result = result.then(promiseFactory);
    });
    return result;
}
/**
 * Converts a Promise to a callback.
 * @param promise - The Promise to be converted to a callback
 * @returns A function that takes the callback `(cb: Function) => void`
 * @deprecated generated code should instead depend on responseToBody
 */
// eslint-disable-next-line @typescript-eslint/ban-types
function promiseToCallback(promise) {
    if (typeof promise.then !== "function") {
        throw new Error("The provided input is not a Promise.");
    }
    // eslint-disable-next-line @typescript-eslint/ban-types
    return (cb) => {
        promise
            .then((data) => {
            // eslint-disable-next-line promise/no-callback-in-promise
            return cb(undefined, data);
        })
            .catch((err) => {
            // eslint-disable-next-line promise/no-callback-in-promise
            cb(err);
        });
    };
}
/**
 * Converts a Promise to a service callback.
 * @param promise - The Promise of HttpOperationResponse to be converted to a service callback
 * @returns A function that takes the service callback (cb: ServiceCallback<T>): void
 */
function promiseToServiceCallback(promise) {
    if (typeof promise.then !== "function") {
        throw new Error("The provided input is not a Promise.");
    }
    return (cb) => {
        promise
            .then((data) => {
            return process.nextTick(cb, undefined, data.parsedBody, data.request, data);
        })
            .catch((err) => {
            process.nextTick(cb, err);
        });
    };
}
function prepareXMLRootList(obj, elementName, xmlNamespaceKey, xmlNamespace) {
    if (!Array.isArray(obj)) {
        obj = [obj];
    }
    if (!xmlNamespaceKey || !xmlNamespace) {
        return { [elementName]: obj };
    }
    const result = { [elementName]: obj };
    result[XML_ATTRKEY] = { [xmlNamespaceKey]: xmlNamespace };
    return result;
}
/**
 * Applies the properties on the prototype of sourceCtors to the prototype of targetCtor
 * @param targetCtor - The target object on which the properties need to be applied.
 * @param sourceCtors - An array of source objects from which the properties need to be taken.
 */
function applyMixins(targetCtorParam, sourceCtors) {
    const castTargetCtorParam = targetCtorParam;
    sourceCtors.forEach((sourceCtor) => {
        Object.getOwnPropertyNames(sourceCtor.prototype).forEach((name) => {
            castTargetCtorParam.prototype[name] = sourceCtor.prototype[name];
        });
    });
}
const validateISODuration = /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;
/**
 * Indicates whether the given string is in ISO 8601 format.
 * @param value - The value to be validated for ISO 8601 duration format.
 * @returns `true` if valid, `false` otherwise.
 */
function isDuration(value) {
    return validateISODuration.test(value);
}
/**
 * Replace all of the instances of searchValue in value with the provided replaceValue.
 * @param value - The value to search and replace in.
 * @param searchValue - The value to search for in the value argument.
 * @param replaceValue - The value to replace searchValue with in the value argument.
 * @returns The value where each instance of searchValue was replaced with replacedValue.
 */
function replaceAll(value, searchValue, replaceValue) {
    return !value || !searchValue ? value : value.split(searchValue).join(replaceValue || "");
}
/**
 * Determines whether the given entity is a basic/primitive type
 * (string, number, boolean, null, undefined).
 * @param value - Any entity
 * @returns true is it is primitive type, false otherwise.
 */
function isPrimitiveType(value) {
    return (typeof value !== "object" && typeof value !== "function") || value === null;
}
function getEnvironmentValue(name) {
    if (process.env[name]) {
        return process.env[name];
    }
    else if (process.env[name.toLowerCase()]) {
        return process.env[name.toLowerCase()];
    }
    return undefined;
}
/**
 * @internal
 * @returns true when input is an object type that is not null, Array, RegExp, or Date.
 */
function isObject(input) {
    return (typeof input === "object" &&
        input !== null &&
        !Array.isArray(input) &&
        !(input instanceof RegExp) &&
        !(input instanceof Date));
}

// Copyright (c) Microsoft Corporation.
class Serializer {
    constructor(modelMappers = {}, isXML) {
        this.modelMappers = modelMappers;
        this.isXML = isXML;
    }
    validateConstraints(mapper, value, objectName) {
        const failValidation = (constraintName, constraintValue) => {
            throw new Error(`"${objectName}" with value "${value}" should satisfy the constraint "${constraintName}": ${constraintValue}.`);
        };
        if (mapper.constraints && value != undefined) {
            const valueAsNumber = value;
            const { ExclusiveMaximum, ExclusiveMinimum, InclusiveMaximum, InclusiveMinimum, MaxItems, MaxLength, MinItems, MinLength, MultipleOf, Pattern, UniqueItems } = mapper.constraints;
            if (ExclusiveMaximum != undefined && valueAsNumber >= ExclusiveMaximum) {
                failValidation("ExclusiveMaximum", ExclusiveMaximum);
            }
            if (ExclusiveMinimum != undefined && valueAsNumber <= ExclusiveMinimum) {
                failValidation("ExclusiveMinimum", ExclusiveMinimum);
            }
            if (InclusiveMaximum != undefined && valueAsNumber > InclusiveMaximum) {
                failValidation("InclusiveMaximum", InclusiveMaximum);
            }
            if (InclusiveMinimum != undefined && valueAsNumber < InclusiveMinimum) {
                failValidation("InclusiveMinimum", InclusiveMinimum);
            }
            const valueAsArray = value;
            if (MaxItems != undefined && valueAsArray.length > MaxItems) {
                failValidation("MaxItems", MaxItems);
            }
            if (MaxLength != undefined && valueAsArray.length > MaxLength) {
                failValidation("MaxLength", MaxLength);
            }
            if (MinItems != undefined && valueAsArray.length < MinItems) {
                failValidation("MinItems", MinItems);
            }
            if (MinLength != undefined && valueAsArray.length < MinLength) {
                failValidation("MinLength", MinLength);
            }
            if (MultipleOf != undefined && valueAsNumber % MultipleOf !== 0) {
                failValidation("MultipleOf", MultipleOf);
            }
            if (Pattern) {
                const pattern = typeof Pattern === "string" ? new RegExp(Pattern) : Pattern;
                if (typeof value !== "string" || value.match(pattern) === null) {
                    failValidation("Pattern", Pattern);
                }
            }
            if (UniqueItems &&
                valueAsArray.some((item, i, ar) => ar.indexOf(item) !== i)) {
                failValidation("UniqueItems", UniqueItems);
            }
        }
    }
    /**
     * Serialize the given object based on its metadata defined in the mapper
     *
     * @param mapper - The mapper which defines the metadata of the serializable object
     * @param object - A valid Javascript object to be serialized
     * @param objectName - Name of the serialized object
     * @param options - additional options to deserialization
     * @returns A valid serialized Javascript object
     */
    serialize(mapper, object, objectName, options = {}) {
        var _a, _b, _c;
        const updatedOptions = {
            rootName: (_a = options.rootName) !== null && _a !== void 0 ? _a : "",
            includeRoot: (_b = options.includeRoot) !== null && _b !== void 0 ? _b : false,
            xmlCharKey: (_c = options.xmlCharKey) !== null && _c !== void 0 ? _c : XML_CHARKEY
        };
        let payload = {};
        const mapperType = mapper.type.name;
        if (!objectName) {
            objectName = mapper.serializedName;
        }
        if (mapperType.match(/^Sequence$/i) !== null) {
            payload = [];
        }
        if (mapper.isConstant) {
            object = mapper.defaultValue;
        }
        // This table of allowed values should help explain
        // the mapper.required and mapper.nullable properties.
        // X means "neither undefined or null are allowed".
        //           || required
        //           || true      | false
        //  nullable || ==========================
        //      true || null      | undefined/null
        //     false || X         | undefined
        // undefined || X         | undefined/null
        const { required, nullable } = mapper;
        if (required && nullable && object === undefined) {
            throw new Error(`${objectName} cannot be undefined.`);
        }
        if (required && !nullable && object == undefined) {
            throw new Error(`${objectName} cannot be null or undefined.`);
        }
        if (!required && nullable === false && object === null) {
            throw new Error(`${objectName} cannot be null.`);
        }
        if (object == undefined) {
            payload = object;
        }
        else {
            // Validate Constraints if any
            this.validateConstraints(mapper, object, objectName);
            if (mapperType.match(/^any$/i) !== null) {
                payload = object;
            }
            else if (mapperType.match(/^(Number|String|Boolean|Object|Stream|Uuid)$/i) !== null) {
                payload = serializeBasicTypes(mapperType, objectName, object);
            }
            else if (mapperType.match(/^Enum$/i) !== null) {
                const enumMapper = mapper;
                payload = serializeEnumType(objectName, enumMapper.type.allowedValues, object);
            }
            else if (mapperType.match(/^(Date|DateTime|TimeSpan|DateTimeRfc1123|UnixTime)$/i) !== null) {
                payload = serializeDateTypes(mapperType, object, objectName);
            }
            else if (mapperType.match(/^ByteArray$/i) !== null) {
                payload = serializeByteArrayType(objectName, object);
            }
            else if (mapperType.match(/^Base64Url$/i) !== null) {
                payload = serializeBase64UrlType(objectName, object);
            }
            else if (mapperType.match(/^Sequence$/i) !== null) {
                payload = serializeSequenceType(this, mapper, object, objectName, Boolean(this.isXML), updatedOptions);
            }
            else if (mapperType.match(/^Dictionary$/i) !== null) {
                payload = serializeDictionaryType(this, mapper, object, objectName, Boolean(this.isXML), updatedOptions);
            }
            else if (mapperType.match(/^Composite$/i) !== null) {
                payload = serializeCompositeType(this, mapper, object, objectName, Boolean(this.isXML), updatedOptions);
            }
        }
        return payload;
    }
    /**
     * Deserialize the given object based on its metadata defined in the mapper
     *
     * @param mapper - The mapper which defines the metadata of the serializable object
     * @param responseBody - A valid Javascript entity to be deserialized
     * @param objectName - Name of the deserialized object
     * @param options - Controls behavior of XML parser and builder.
     * @returns A valid deserialized Javascript object
     */
    deserialize(mapper, responseBody, objectName, options = {}) {
        var _a, _b, _c;
        const updatedOptions = {
            rootName: (_a = options.rootName) !== null && _a !== void 0 ? _a : "",
            includeRoot: (_b = options.includeRoot) !== null && _b !== void 0 ? _b : false,
            xmlCharKey: (_c = options.xmlCharKey) !== null && _c !== void 0 ? _c : XML_CHARKEY
        };
        if (responseBody == undefined) {
            if (this.isXML && mapper.type.name === "Sequence" && !mapper.xmlIsWrapped) {
                // Edge case for empty XML non-wrapped lists. xml2js can't distinguish
                // between the list being empty versus being missing,
                // so let's do the more user-friendly thing and return an empty list.
                responseBody = [];
            }
            // specifically check for undefined as default value can be a falsey value `0, "", false, null`
            if (mapper.defaultValue !== undefined) {
                responseBody = mapper.defaultValue;
            }
            return responseBody;
        }
        let payload;
        const mapperType = mapper.type.name;
        if (!objectName) {
            objectName = mapper.serializedName;
        }
        if (mapperType.match(/^Composite$/i) !== null) {
            payload = deserializeCompositeType(this, mapper, responseBody, objectName, updatedOptions);
        }
        else {
            if (this.isXML) {
                const xmlCharKey = updatedOptions.xmlCharKey;
                const castResponseBody = responseBody;
                /**
                 * If the mapper specifies this as a non-composite type value but the responseBody contains
                 * both header ("$" i.e., XML_ATTRKEY) and body ("#" i.e., XML_CHARKEY) properties,
                 * then just reduce the responseBody value to the body ("#" i.e., XML_CHARKEY) property.
                 */
                if (castResponseBody[XML_ATTRKEY] != undefined &&
                    castResponseBody[xmlCharKey] != undefined) {
                    responseBody = castResponseBody[xmlCharKey];
                }
            }
            if (mapperType.match(/^Number$/i) !== null) {
                payload = parseFloat(responseBody);
                if (isNaN(payload)) {
                    payload = responseBody;
                }
            }
            else if (mapperType.match(/^Boolean$/i) !== null) {
                if (responseBody === "true") {
                    payload = true;
                }
                else if (responseBody === "false") {
                    payload = false;
                }
                else {
                    payload = responseBody;
                }
            }
            else if (mapperType.match(/^(String|Enum|Object|Stream|Uuid|TimeSpan|any)$/i) !== null) {
                payload = responseBody;
            }
            else if (mapperType.match(/^(Date|DateTime|DateTimeRfc1123)$/i) !== null) {
                payload = new Date(responseBody);
            }
            else if (mapperType.match(/^UnixTime$/i) !== null) {
                payload = unixTimeToDate(responseBody);
            }
            else if (mapperType.match(/^ByteArray$/i) !== null) {
                payload = decodeString(responseBody);
            }
            else if (mapperType.match(/^Base64Url$/i) !== null) {
                payload = base64UrlToByteArray(responseBody);
            }
            else if (mapperType.match(/^Sequence$/i) !== null) {
                payload = deserializeSequenceType(this, mapper, responseBody, objectName, updatedOptions);
            }
            else if (mapperType.match(/^Dictionary$/i) !== null) {
                payload = deserializeDictionaryType(this, mapper, responseBody, objectName, updatedOptions);
            }
        }
        if (mapper.isConstant) {
            payload = mapper.defaultValue;
        }
        return payload;
    }
}
function trimEnd(str, ch) {
    let len = str.length;
    while (len - 1 >= 0 && str[len - 1] === ch) {
        --len;
    }
    return str.substr(0, len);
}
function bufferToBase64Url(buffer) {
    if (!buffer) {
        return undefined;
    }
    if (!(buffer instanceof Uint8Array)) {
        throw new Error(`Please provide an input of type Uint8Array for converting to Base64Url.`);
    }
    // Uint8Array to Base64.
    const str = encodeByteArray(buffer);
    // Base64 to Base64Url.
    return trimEnd(str, "=")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}
function base64UrlToByteArray(str) {
    if (!str) {
        return undefined;
    }
    if (str && typeof str.valueOf() !== "string") {
        throw new Error("Please provide an input of type string for converting to Uint8Array");
    }
    // Base64Url to Base64.
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    // Base64 to Uint8Array.
    return decodeString(str);
}
function splitSerializeName(prop) {
    const classes = [];
    let partialclass = "";
    if (prop) {
        const subwords = prop.split(".");
        for (const item of subwords) {
            if (item.charAt(item.length - 1) === "\\") {
                partialclass += item.substr(0, item.length - 1) + ".";
            }
            else {
                partialclass += item;
                classes.push(partialclass);
                partialclass = "";
            }
        }
    }
    return classes;
}
function dateToUnixTime(d) {
    if (!d) {
        return undefined;
    }
    if (typeof d.valueOf() === "string") {
        d = new Date(d);
    }
    return Math.floor(d.getTime() / 1000);
}
function unixTimeToDate(n) {
    if (!n) {
        return undefined;
    }
    return new Date(n * 1000);
}
function serializeBasicTypes(typeName, objectName, value) {
    if (value !== null && value !== undefined) {
        if (typeName.match(/^Number$/i) !== null) {
            if (typeof value !== "number") {
                throw new Error(`${objectName} with value ${value} must be of type number.`);
            }
        }
        else if (typeName.match(/^String$/i) !== null) {
            if (typeof value.valueOf() !== "string") {
                throw new Error(`${objectName} with value "${value}" must be of type string.`);
            }
        }
        else if (typeName.match(/^Uuid$/i) !== null) {
            if (!(typeof value.valueOf() === "string" && isValidUuid(value))) {
                throw new Error(`${objectName} with value "${value}" must be of type string and a valid uuid.`);
            }
        }
        else if (typeName.match(/^Boolean$/i) !== null) {
            if (typeof value !== "boolean") {
                throw new Error(`${objectName} with value ${value} must be of type boolean.`);
            }
        }
        else if (typeName.match(/^Stream$/i) !== null) {
            const objectType = typeof value;
            if (objectType !== "string" &&
                objectType !== "function" &&
                !(value instanceof ArrayBuffer) &&
                !ArrayBuffer.isView(value) &&
                !((typeof Blob === "function" || typeof Blob === "object") && value instanceof Blob)) {
                throw new Error(`${objectName} must be a string, Blob, ArrayBuffer, ArrayBufferView, or a function returning NodeJS.ReadableStream.`);
            }
        }
    }
    return value;
}
function serializeEnumType(objectName, allowedValues, value) {
    if (!allowedValues) {
        throw new Error(`Please provide a set of allowedValues to validate ${objectName} as an Enum Type.`);
    }
    const isPresent = allowedValues.some((item) => {
        if (typeof item.valueOf() === "string") {
            return item.toLowerCase() === value.toLowerCase();
        }
        return item === value;
    });
    if (!isPresent) {
        throw new Error(`${value} is not a valid value for ${objectName}. The valid values are: ${JSON.stringify(allowedValues)}.`);
    }
    return value;
}
function serializeByteArrayType(objectName, value) {
    let returnValue = "";
    if (value != undefined) {
        if (!(value instanceof Uint8Array)) {
            throw new Error(`${objectName} must be of type Uint8Array.`);
        }
        returnValue = encodeByteArray(value);
    }
    return returnValue;
}
function serializeBase64UrlType(objectName, value) {
    let returnValue = "";
    if (value != undefined) {
        if (!(value instanceof Uint8Array)) {
            throw new Error(`${objectName} must be of type Uint8Array.`);
        }
        returnValue = bufferToBase64Url(value) || "";
    }
    return returnValue;
}
function serializeDateTypes(typeName, value, objectName) {
    if (value != undefined) {
        if (typeName.match(/^Date$/i) !== null) {
            if (!(value instanceof Date ||
                (typeof value.valueOf() === "string" && !isNaN(Date.parse(value))))) {
                throw new Error(`${objectName} must be an instanceof Date or a string in ISO8601 format.`);
            }
            value =
                value instanceof Date
                    ? value.toISOString().substring(0, 10)
                    : new Date(value).toISOString().substring(0, 10);
        }
        else if (typeName.match(/^DateTime$/i) !== null) {
            if (!(value instanceof Date ||
                (typeof value.valueOf() === "string" && !isNaN(Date.parse(value))))) {
                throw new Error(`${objectName} must be an instanceof Date or a string in ISO8601 format.`);
            }
            value = value instanceof Date ? value.toISOString() : new Date(value).toISOString();
        }
        else if (typeName.match(/^DateTimeRfc1123$/i) !== null) {
            if (!(value instanceof Date ||
                (typeof value.valueOf() === "string" && !isNaN(Date.parse(value))))) {
                throw new Error(`${objectName} must be an instanceof Date or a string in RFC-1123 format.`);
            }
            value = value instanceof Date ? value.toUTCString() : new Date(value).toUTCString();
        }
        else if (typeName.match(/^UnixTime$/i) !== null) {
            if (!(value instanceof Date ||
                (typeof value.valueOf() === "string" && !isNaN(Date.parse(value))))) {
                throw new Error(`${objectName} must be an instanceof Date or a string in RFC-1123/ISO8601 format ` +
                    `for it to be serialized in UnixTime/Epoch format.`);
            }
            value = dateToUnixTime(value);
        }
        else if (typeName.match(/^TimeSpan$/i) !== null) {
            if (!isDuration(value)) {
                throw new Error(`${objectName} must be a string in ISO 8601 format. Instead was "${value}".`);
            }
        }
    }
    return value;
}
function serializeSequenceType(serializer, mapper, object, objectName, isXml, options) {
    if (!Array.isArray(object)) {
        throw new Error(`${objectName} must be of type Array.`);
    }
    const elementType = mapper.type.element;
    if (!elementType || typeof elementType !== "object") {
        throw new Error(`element" metadata for an Array must be defined in the ` +
            `mapper and it must of type "object" in ${objectName}.`);
    }
    const tempArray = [];
    for (let i = 0; i < object.length; i++) {
        const serializedValue = serializer.serialize(elementType, object[i], objectName, options);
        if (isXml && elementType.xmlNamespace) {
            const xmlnsKey = elementType.xmlNamespacePrefix
                ? `xmlns:${elementType.xmlNamespacePrefix}`
                : "xmlns";
            if (elementType.type.name === "Composite") {
                tempArray[i] = Object.assign({}, serializedValue);
                tempArray[i][XML_ATTRKEY] = { [xmlnsKey]: elementType.xmlNamespace };
            }
            else {
                tempArray[i] = {};
                tempArray[i][options.xmlCharKey] = serializedValue;
                tempArray[i][XML_ATTRKEY] = { [xmlnsKey]: elementType.xmlNamespace };
            }
        }
        else {
            tempArray[i] = serializedValue;
        }
    }
    return tempArray;
}
function serializeDictionaryType(serializer, mapper, object, objectName, isXml, options) {
    if (typeof object !== "object") {
        throw new Error(`${objectName} must be of type object.`);
    }
    const valueType = mapper.type.value;
    if (!valueType || typeof valueType !== "object") {
        throw new Error(`"value" metadata for a Dictionary must be defined in the ` +
            `mapper and it must of type "object" in ${objectName}.`);
    }
    const tempDictionary = {};
    for (const key of Object.keys(object)) {
        const serializedValue = serializer.serialize(valueType, object[key], objectName, options);
        // If the element needs an XML namespace we need to add it within the $ property
        tempDictionary[key] = getXmlObjectValue(valueType, serializedValue, isXml, options);
    }
    // Add the namespace to the root element if needed
    if (isXml && mapper.xmlNamespace) {
        const xmlnsKey = mapper.xmlNamespacePrefix ? `xmlns:${mapper.xmlNamespacePrefix}` : "xmlns";
        const result = tempDictionary;
        result[XML_ATTRKEY] = { [xmlnsKey]: mapper.xmlNamespace };
        return result;
    }
    return tempDictionary;
}
/**
 * Resolves the additionalProperties property from a referenced mapper
 * @param serializer - The serializer containing the entire set of mappers
 * @param mapper - The composite mapper to resolve
 * @param objectName - Name of the object being serialized
 */
function resolveAdditionalProperties(serializer, mapper, objectName) {
    const additionalProperties = mapper.type.additionalProperties;
    if (!additionalProperties && mapper.type.className) {
        const modelMapper = resolveReferencedMapper(serializer, mapper, objectName);
        return modelMapper === null || modelMapper === void 0 ? void 0 : modelMapper.type.additionalProperties;
    }
    return additionalProperties;
}
/**
 * Finds the mapper referenced by className
 * @param serializer - The serializer containing the entire set of mappers
 * @param mapper - The composite mapper to resolve
 * @param objectName - Name of the object being serialized
 */
function resolveReferencedMapper(serializer, mapper, objectName) {
    const className = mapper.type.className;
    if (!className) {
        throw new Error(`Class name for model "${objectName}" is not provided in the mapper "${JSON.stringify(mapper, undefined, 2)}".`);
    }
    return serializer.modelMappers[className];
}
/**
 * Resolves a composite mapper's modelProperties.
 * @param serializer - The serializer containing the entire set of mappers
 * @param mapper - The composite mapper to resolve
 */
function resolveModelProperties(serializer, mapper, objectName) {
    let modelProps = mapper.type.modelProperties;
    if (!modelProps) {
        const modelMapper = resolveReferencedMapper(serializer, mapper, objectName);
        if (!modelMapper) {
            throw new Error(`mapper() cannot be null or undefined for model "${mapper.type.className}".`);
        }
        modelProps = modelMapper === null || modelMapper === void 0 ? void 0 : modelMapper.type.modelProperties;
        if (!modelProps) {
            throw new Error(`modelProperties cannot be null or undefined in the ` +
                `mapper "${JSON.stringify(modelMapper)}" of type "${mapper.type.className}" for object "${objectName}".`);
        }
    }
    return modelProps;
}
function serializeCompositeType(serializer, mapper, object, objectName, isXml, options) {
    if (getPolymorphicDiscriminatorRecursively(serializer, mapper)) {
        mapper = getPolymorphicMapper(serializer, mapper, object, "clientName");
    }
    if (object != undefined) {
        const payload = {};
        const modelProps = resolveModelProperties(serializer, mapper, objectName);
        for (const key of Object.keys(modelProps)) {
            const propertyMapper = modelProps[key];
            if (propertyMapper.readOnly) {
                continue;
            }
            let propName;
            let parentObject = payload;
            if (serializer.isXML) {
                if (propertyMapper.xmlIsWrapped) {
                    propName = propertyMapper.xmlName;
                }
                else {
                    propName = propertyMapper.xmlElementName || propertyMapper.xmlName;
                }
            }
            else {
                const paths = splitSerializeName(propertyMapper.serializedName);
                propName = paths.pop();
                for (const pathName of paths) {
                    const childObject = parentObject[pathName];
                    if (childObject == undefined &&
                        (object[key] != undefined || propertyMapper.defaultValue !== undefined)) {
                        parentObject[pathName] = {};
                    }
                    parentObject = parentObject[pathName];
                }
            }
            if (parentObject != undefined) {
                if (isXml && mapper.xmlNamespace) {
                    const xmlnsKey = mapper.xmlNamespacePrefix
                        ? `xmlns:${mapper.xmlNamespacePrefix}`
                        : "xmlns";
                    parentObject[XML_ATTRKEY] = Object.assign(Object.assign({}, parentObject[XML_ATTRKEY]), { [xmlnsKey]: mapper.xmlNamespace });
                }
                const propertyObjectName = propertyMapper.serializedName !== ""
                    ? objectName + "." + propertyMapper.serializedName
                    : objectName;
                let toSerialize = object[key];
                const polymorphicDiscriminator = getPolymorphicDiscriminatorRecursively(serializer, mapper);
                if (polymorphicDiscriminator &&
                    polymorphicDiscriminator.clientName === key &&
                    toSerialize == undefined) {
                    toSerialize = mapper.serializedName;
                }
                const serializedValue = serializer.serialize(propertyMapper, toSerialize, propertyObjectName, options);
                if (serializedValue !== undefined && propName != undefined) {
                    const value = getXmlObjectValue(propertyMapper, serializedValue, isXml, options);
                    if (isXml && propertyMapper.xmlIsAttribute) {
                        // XML_ATTRKEY, i.e., $ is the key attributes are kept under in xml2js.
                        // This keeps things simple while preventing name collision
                        // with names in user documents.
                        parentObject[XML_ATTRKEY] = parentObject[XML_ATTRKEY] || {};
                        parentObject[XML_ATTRKEY][propName] = serializedValue;
                    }
                    else if (isXml && propertyMapper.xmlIsWrapped) {
                        parentObject[propName] = { [propertyMapper.xmlElementName]: value };
                    }
                    else {
                        parentObject[propName] = value;
                    }
                }
            }
        }
        const additionalPropertiesMapper = resolveAdditionalProperties(serializer, mapper, objectName);
        if (additionalPropertiesMapper) {
            const propNames = Object.keys(modelProps);
            for (const clientPropName in object) {
                const isAdditionalProperty = propNames.every((pn) => pn !== clientPropName);
                if (isAdditionalProperty) {
                    payload[clientPropName] = serializer.serialize(additionalPropertiesMapper, object[clientPropName], objectName + '["' + clientPropName + '"]', options);
                }
            }
        }
        return payload;
    }
    return object;
}
function getXmlObjectValue(propertyMapper, serializedValue, isXml, options) {
    if (!isXml || !propertyMapper.xmlNamespace) {
        return serializedValue;
    }
    const xmlnsKey = propertyMapper.xmlNamespacePrefix
        ? `xmlns:${propertyMapper.xmlNamespacePrefix}`
        : "xmlns";
    const xmlNamespace = { [xmlnsKey]: propertyMapper.xmlNamespace };
    if (["Composite"].includes(propertyMapper.type.name)) {
        if (serializedValue[XML_ATTRKEY]) {
            return serializedValue;
        }
        else {
            const result = Object.assign({}, serializedValue);
            result[XML_ATTRKEY] = xmlNamespace;
            return result;
        }
    }
    const result = {};
    result[options.xmlCharKey] = serializedValue;
    result[XML_ATTRKEY] = xmlNamespace;
    return result;
}
function isSpecialXmlProperty(propertyName, options) {
    return [XML_ATTRKEY, options.xmlCharKey].includes(propertyName);
}
function deserializeCompositeType(serializer, mapper, responseBody, objectName, options) {
    var _a;
    if (getPolymorphicDiscriminatorRecursively(serializer, mapper)) {
        mapper = getPolymorphicMapper(serializer, mapper, responseBody, "serializedName");
    }
    const modelProps = resolveModelProperties(serializer, mapper, objectName);
    let instance = {};
    const handledPropertyNames = [];
    for (const key of Object.keys(modelProps)) {
        const propertyMapper = modelProps[key];
        const paths = splitSerializeName(modelProps[key].serializedName);
        handledPropertyNames.push(paths[0]);
        const { serializedName, xmlName, xmlElementName } = propertyMapper;
        let propertyObjectName = objectName;
        if (serializedName !== "" && serializedName !== undefined) {
            propertyObjectName = objectName + "." + serializedName;
        }
        const headerCollectionPrefix = propertyMapper.headerCollectionPrefix;
        if (headerCollectionPrefix) {
            const dictionary = {};
            for (const headerKey of Object.keys(responseBody)) {
                if (headerKey.startsWith(headerCollectionPrefix)) {
                    dictionary[headerKey.substring(headerCollectionPrefix.length)] = serializer.deserialize(propertyMapper.type.value, responseBody[headerKey], propertyObjectName, options);
                }
                handledPropertyNames.push(headerKey);
            }
            instance[key] = dictionary;
        }
        else if (serializer.isXML) {
            if (propertyMapper.xmlIsAttribute && responseBody[XML_ATTRKEY]) {
                instance[key] = serializer.deserialize(propertyMapper, responseBody[XML_ATTRKEY][xmlName], propertyObjectName, options);
            }
            else {
                const propertyName = xmlElementName || xmlName || serializedName;
                if (propertyMapper.xmlIsWrapped) {
                    /* a list of <xmlElementName> wrapped by <xmlName>
                      For the xml example below
                        <Cors>
                          <CorsRule>...</CorsRule>
                          <CorsRule>...</CorsRule>
                        </Cors>
                      the responseBody has
                        {
                          Cors: {
                            CorsRule: [{...}, {...}]
                          }
                        }
                      xmlName is "Cors" and xmlElementName is"CorsRule".
                    */
                    const wrapped = responseBody[xmlName];
                    const elementList = (_a = wrapped === null || wrapped === void 0 ? void 0 : wrapped[xmlElementName]) !== null && _a !== void 0 ? _a : [];
                    instance[key] = serializer.deserialize(propertyMapper, elementList, propertyObjectName, options);
                }
                else {
                    const property = responseBody[propertyName];
                    instance[key] = serializer.deserialize(propertyMapper, property, propertyObjectName, options);
                }
            }
        }
        else {
            // deserialize the property if it is present in the provided responseBody instance
            let propertyInstance;
            let res = responseBody;
            // traversing the object step by step.
            for (const item of paths) {
                if (!res)
                    break;
                res = res[item];
            }
            propertyInstance = res;
            const polymorphicDiscriminator = mapper.type.polymorphicDiscriminator;
            // checking that the model property name (key)(ex: "fishtype") and the
            // clientName of the polymorphicDiscriminator {metadata} (ex: "fishtype")
            // instead of the serializedName of the polymorphicDiscriminator (ex: "fish.type")
            // is a better approach. The generator is not consistent with escaping '\.' in the
            // serializedName of the property (ex: "fish\.type") that is marked as polymorphic discriminator
            // and the serializedName of the metadata polymorphicDiscriminator (ex: "fish.type"). However,
            // the clientName transformation of the polymorphicDiscriminator (ex: "fishtype") and
            // the transformation of model property name (ex: "fishtype") is done consistently.
            // Hence, it is a safer bet to rely on the clientName of the polymorphicDiscriminator.
            if (polymorphicDiscriminator &&
                key === polymorphicDiscriminator.clientName &&
                propertyInstance == undefined) {
                propertyInstance = mapper.serializedName;
            }
            let serializedValue;
            // paging
            if (Array.isArray(responseBody[key]) && modelProps[key].serializedName === "") {
                propertyInstance = responseBody[key];
                const arrayInstance = serializer.deserialize(propertyMapper, propertyInstance, propertyObjectName, options);
                // Copy over any properties that have already been added into the instance, where they do
                // not exist on the newly de-serialized array
                for (const [k, v] of Object.entries(instance)) {
                    if (!Object.prototype.hasOwnProperty.call(arrayInstance, k)) {
                        arrayInstance[k] = v;
                    }
                }
                instance = arrayInstance;
            }
            else if (propertyInstance !== undefined || propertyMapper.defaultValue !== undefined) {
                serializedValue = serializer.deserialize(propertyMapper, propertyInstance, propertyObjectName, options);
                instance[key] = serializedValue;
            }
        }
    }
    const additionalPropertiesMapper = mapper.type.additionalProperties;
    if (additionalPropertiesMapper) {
        const isAdditionalProperty = (responsePropName) => {
            for (const clientPropName in modelProps) {
                const paths = splitSerializeName(modelProps[clientPropName].serializedName);
                if (paths[0] === responsePropName) {
                    return false;
                }
            }
            return true;
        };
        for (const responsePropName in responseBody) {
            if (isAdditionalProperty(responsePropName)) {
                instance[responsePropName] = serializer.deserialize(additionalPropertiesMapper, responseBody[responsePropName], objectName + '["' + responsePropName + '"]', options);
            }
        }
    }
    else if (responseBody) {
        for (const key of Object.keys(responseBody)) {
            if (instance[key] === undefined &&
                !handledPropertyNames.includes(key) &&
                !isSpecialXmlProperty(key, options)) {
                instance[key] = responseBody[key];
            }
        }
    }
    return instance;
}
function deserializeDictionaryType(serializer, mapper, responseBody, objectName, options) {
    const value = mapper.type.value;
    if (!value || typeof value !== "object") {
        throw new Error(`"value" metadata for a Dictionary must be defined in the ` +
            `mapper and it must of type "object" in ${objectName}`);
    }
    if (responseBody) {
        const tempDictionary = {};
        for (const key of Object.keys(responseBody)) {
            tempDictionary[key] = serializer.deserialize(value, responseBody[key], objectName, options);
        }
        return tempDictionary;
    }
    return responseBody;
}
function deserializeSequenceType(serializer, mapper, responseBody, objectName, options) {
    const element = mapper.type.element;
    if (!element || typeof element !== "object") {
        throw new Error(`element" metadata for an Array must be defined in the ` +
            `mapper and it must of type "object" in ${objectName}`);
    }
    if (responseBody) {
        if (!Array.isArray(responseBody)) {
            // xml2js will interpret a single element array as just the element, so force it to be an array
            responseBody = [responseBody];
        }
        const tempArray = [];
        for (let i = 0; i < responseBody.length; i++) {
            tempArray[i] = serializer.deserialize(element, responseBody[i], `${objectName}[${i}]`, options);
        }
        return tempArray;
    }
    return responseBody;
}
function getPolymorphicMapper(serializer, mapper, object, polymorphicPropertyName) {
    const polymorphicDiscriminator = getPolymorphicDiscriminatorRecursively(serializer, mapper);
    if (polymorphicDiscriminator) {
        const discriminatorName = polymorphicDiscriminator[polymorphicPropertyName];
        if (discriminatorName != undefined) {
            const discriminatorValue = object[discriminatorName];
            if (discriminatorValue != undefined) {
                const typeName = mapper.type.uberParent || mapper.type.className;
                const indexDiscriminator = discriminatorValue === typeName
                    ? discriminatorValue
                    : typeName + "." + discriminatorValue;
                const polymorphicMapper = serializer.modelMappers.discriminators[indexDiscriminator];
                if (polymorphicMapper) {
                    mapper = polymorphicMapper;
                }
            }
        }
    }
    return mapper;
}
function getPolymorphicDiscriminatorRecursively(serializer, mapper) {
    return (mapper.type.polymorphicDiscriminator ||
        getPolymorphicDiscriminatorSafely(serializer, mapper.type.uberParent) ||
        getPolymorphicDiscriminatorSafely(serializer, mapper.type.className));
}
function getPolymorphicDiscriminatorSafely(serializer, typeName) {
    return (typeName &&
        serializer.modelMappers[typeName] &&
        serializer.modelMappers[typeName].type.polymorphicDiscriminator);
}
// TODO: why is this here?
function serializeObject(toSerialize) {
    const castToSerialize = toSerialize;
    if (toSerialize == undefined)
        return undefined;
    if (toSerialize instanceof Uint8Array) {
        toSerialize = encodeByteArray(toSerialize);
        return toSerialize;
    }
    else if (toSerialize instanceof Date) {
        return toSerialize.toISOString();
    }
    else if (Array.isArray(toSerialize)) {
        const array = [];
        for (let i = 0; i < toSerialize.length; i++) {
            array.push(serializeObject(toSerialize[i]));
        }
        return array;
    }
    else if (typeof toSerialize === "object") {
        const dictionary = {};
        for (const property in toSerialize) {
            dictionary[property] = serializeObject(castToSerialize[property]);
        }
        return dictionary;
    }
    return toSerialize;
}
/**
 * Utility function to create a K:V from a list of strings
 */
function strEnum(o) {
    const result = {};
    for (const key of o) {
        result[key] = key;
    }
    return result;
}
// eslint-disable-next-line @typescript-eslint/no-redeclare
const MapperType = strEnum([
    "Base64Url",
    "Boolean",
    "ByteArray",
    "Composite",
    "Date",
    "DateTime",
    "DateTimeRfc1123",
    "Dictionary",
    "Enum",
    "Number",
    "Object",
    "Sequence",
    "String",
    "Stream",
    "TimeSpan",
    "UnixTime"
]);

// Copyright (c) Microsoft Corporation.
function isWebResourceLike(object) {
    if (object && typeof object === "object") {
        const castObject = object;
        if (typeof castObject.url === "string" &&
            typeof castObject.method === "string" &&
            typeof castObject.headers === "object" &&
            isHttpHeadersLike(castObject.headers) &&
            typeof castObject.validateRequestProperties === "function" &&
            typeof castObject.prepare === "function" &&
            typeof castObject.clone === "function") {
            return true;
        }
    }
    return false;
}
/**
 * Creates a new WebResource object.
 *
 * This class provides an abstraction over a REST call by being library / implementation agnostic and wrapping the necessary
 * properties to initiate a request.
 */
class WebResource {
    constructor(url, method, body, query, headers, streamResponseBody, withCredentials, abortSignal, timeout, onUploadProgress, onDownloadProgress, proxySettings, keepAlive, decompressResponse, streamResponseStatusCodes) {
        this.streamResponseBody = streamResponseBody;
        this.streamResponseStatusCodes = streamResponseStatusCodes;
        this.url = url || "";
        this.method = method || "GET";
        this.headers = isHttpHeadersLike(headers) ? headers : new HttpHeaders(headers);
        this.body = body;
        this.query = query;
        this.formData = undefined;
        this.withCredentials = withCredentials || false;
        this.abortSignal = abortSignal;
        this.timeout = timeout || 0;
        this.onUploadProgress = onUploadProgress;
        this.onDownloadProgress = onDownloadProgress;
        this.proxySettings = proxySettings;
        this.keepAlive = keepAlive;
        this.decompressResponse = decompressResponse;
        this.requestId = this.headers.get("x-ms-client-request-id") || generateUuid();
    }
    /**
     * Validates that the required properties such as method, url, headers["Content-Type"],
     * headers["accept-language"] are defined. It will throw an error if one of the above
     * mentioned properties are not defined.
     */
    validateRequestProperties() {
        if (!this.method) {
            throw new Error("WebResource.method is required.");
        }
        if (!this.url) {
            throw new Error("WebResource.url is required.");
        }
    }
    /**
     * Prepares the request.
     * @param options - Options to provide for preparing the request.
     * @returns Returns the prepared WebResource (HTTP Request) object that needs to be given to the request pipeline.
     */
    prepare(options) {
        if (!options) {
            throw new Error("options object is required");
        }
        if (options.method === undefined ||
            options.method === null ||
            typeof options.method.valueOf() !== "string") {
            throw new Error("options.method must be a string.");
        }
        if (options.url && options.pathTemplate) {
            throw new Error("options.url and options.pathTemplate are mutually exclusive. Please provide exactly one of them.");
        }
        if ((options.pathTemplate === undefined ||
            options.pathTemplate === null ||
            typeof options.pathTemplate.valueOf() !== "string") &&
            (options.url === undefined ||
                options.url === null ||
                typeof options.url.valueOf() !== "string")) {
            throw new Error("Please provide exactly one of options.pathTemplate or options.url.");
        }
        // set the url if it is provided.
        if (options.url) {
            if (typeof options.url !== "string") {
                throw new Error('options.url must be of type "string".');
            }
            this.url = options.url;
        }
        // set the method
        if (options.method) {
            const validMethods = ["GET", "PUT", "HEAD", "DELETE", "OPTIONS", "POST", "PATCH", "TRACE"];
            if (validMethods.indexOf(options.method.toUpperCase()) === -1) {
                throw new Error('The provided method "' +
                    options.method +
                    '" is invalid. Supported HTTP methods are: ' +
                    JSON.stringify(validMethods));
            }
        }
        this.method = options.method.toUpperCase();
        // construct the url if path template is provided
        if (options.pathTemplate) {
            const { pathTemplate, pathParameters } = options;
            if (typeof pathTemplate !== "string") {
                throw new Error('options.pathTemplate must be of type "string".');
            }
            if (!options.baseUrl) {
                options.baseUrl = "https://management.azure.com";
            }
            const baseUrl = options.baseUrl;
            let url = baseUrl +
                (baseUrl.endsWith("/") ? "" : "/") +
                (pathTemplate.startsWith("/") ? pathTemplate.slice(1) : pathTemplate);
            const segments = url.match(/({[\w-]*\s*[\w-]*})/gi);
            if (segments && segments.length) {
                if (!pathParameters) {
                    throw new Error(`pathTemplate: ${pathTemplate} has been provided. Hence, options.pathParameters must also be provided.`);
                }
                segments.forEach(function (item) {
                    const pathParamName = item.slice(1, -1);
                    const pathParam = pathParameters[pathParamName];
                    if (pathParam === null ||
                        pathParam === undefined ||
                        !(typeof pathParam === "string" || typeof pathParam === "object")) {
                        const stringifiedPathParameters = JSON.stringify(pathParameters, undefined, 2);
                        throw new Error(`pathTemplate: ${pathTemplate} contains the path parameter ${pathParamName}` +
                            ` however, it is not present in parameters: ${stringifiedPathParameters}.` +
                            `The value of the path parameter can either be a "string" of the form { ${pathParamName}: "some sample value" } or ` +
                            `it can be an "object" of the form { "${pathParamName}": { value: "some sample value", skipUrlEncoding: true } }.`);
                    }
                    if (typeof pathParam.valueOf() === "string") {
                        url = url.replace(item, encodeURIComponent(pathParam));
                    }
                    if (typeof pathParam.valueOf() === "object") {
                        if (!pathParam.value) {
                            throw new Error(`options.pathParameters[${pathParamName}] is of type "object" but it does not contain a "value" property.`);
                        }
                        if (pathParam.skipUrlEncoding) {
                            url = url.replace(item, pathParam.value);
                        }
                        else {
                            url = url.replace(item, encodeURIComponent(pathParam.value));
                        }
                    }
                });
            }
            this.url = url;
        }
        // append query parameters to the url if they are provided. They can be provided with pathTemplate or url option.
        if (options.queryParameters) {
            const queryParameters = options.queryParameters;
            if (typeof queryParameters !== "object") {
                throw new Error(`options.queryParameters must be of type object. It should be a JSON object ` +
                    `of "query-parameter-name" as the key and the "query-parameter-value" as the value. ` +
                    `The "query-parameter-value" may be fo type "string" or an "object" of the form { value: "query-parameter-value", skipUrlEncoding: true }.`);
            }
            // append question mark if it is not present in the url
            if (this.url && this.url.indexOf("?") === -1) {
                this.url += "?";
            }
            // construct queryString
            const queryParams = [];
            // We need to populate this.query as a dictionary if the request is being used for Sway's validateRequest().
            this.query = {};
            for (const queryParamName in queryParameters) {
                const queryParam = queryParameters[queryParamName];
                if (queryParam) {
                    if (typeof queryParam === "string") {
                        queryParams.push(queryParamName + "=" + encodeURIComponent(queryParam));
                        this.query[queryParamName] = encodeURIComponent(queryParam);
                    }
                    else if (typeof queryParam === "object") {
                        if (!queryParam.value) {
                            throw new Error(`options.queryParameters[${queryParamName}] is of type "object" but it does not contain a "value" property.`);
                        }
                        if (queryParam.skipUrlEncoding) {
                            queryParams.push(queryParamName + "=" + queryParam.value);
                            this.query[queryParamName] = queryParam.value;
                        }
                        else {
                            queryParams.push(queryParamName + "=" + encodeURIComponent(queryParam.value));
                            this.query[queryParamName] = encodeURIComponent(queryParam.value);
                        }
                    }
                }
            } // end-of-for
            // append the queryString
            this.url += queryParams.join("&");
        }
        // add headers to the request if they are provided
        if (options.headers) {
            const headers = options.headers;
            for (const headerName of Object.keys(options.headers)) {
                this.headers.set(headerName, headers[headerName]);
            }
        }
        // ensure accept-language is set correctly
        if (!this.headers.get("accept-language")) {
            this.headers.set("accept-language", "en-US");
        }
        // ensure the request-id is set correctly
        if (!this.headers.get("x-ms-client-request-id") && !options.disableClientRequestId) {
            this.headers.set("x-ms-client-request-id", this.requestId);
        }
        // default
        if (!this.headers.get("Content-Type")) {
            this.headers.set("Content-Type", "application/json; charset=utf-8");
        }
        // set the request body. request.js automatically sets the Content-Length request header, so we need not set it explicitly
        this.body = options.body;
        if (options.body !== undefined && options.body !== null) {
            // body as a stream special case. set the body as-is and check for some special request headers specific to sending a stream.
            if (options.bodyIsStream) {
                if (!this.headers.get("Transfer-Encoding")) {
                    this.headers.set("Transfer-Encoding", "chunked");
                }
                if (this.headers.get("Content-Type") !== "application/octet-stream") {
                    this.headers.set("Content-Type", "application/octet-stream");
                }
            }
            else {
                if (options.serializationMapper) {
                    this.body = new Serializer(options.mappers).serialize(options.serializationMapper, options.body, "requestBody");
                }
                if (!options.disableJsonStringifyOnBody) {
                    this.body = JSON.stringify(options.body);
                }
            }
        }
        if (options.spanOptions) {
            this.spanOptions = options.spanOptions;
        }
        if (options.tracingContext) {
            this.tracingContext = options.tracingContext;
        }
        this.abortSignal = options.abortSignal;
        this.onDownloadProgress = options.onDownloadProgress;
        this.onUploadProgress = options.onUploadProgress;
        return this;
    }
    /**
     * Clone this WebResource HTTP request object.
     * @returns The clone of this WebResource HTTP request object.
     */
    clone() {
        const result = new WebResource(this.url, this.method, this.body, this.query, this.headers && this.headers.clone(), this.streamResponseBody, this.withCredentials, this.abortSignal, this.timeout, this.onUploadProgress, this.onDownloadProgress, this.proxySettings, this.keepAlive, this.decompressResponse, this.streamResponseStatusCodes);
        if (this.formData) {
            result.formData = this.formData;
        }
        if (this.operationSpec) {
            result.operationSpec = this.operationSpec;
        }
        if (this.shouldDeserialize) {
            result.shouldDeserialize = this.shouldDeserialize;
        }
        if (this.operationResponseGetter) {
            result.operationResponseGetter = this.operationResponseGetter;
        }
        return result;
    }
}

// Copyright (c) Microsoft Corporation.
const custom = util.inspect.custom;

// Copyright (c) Microsoft Corporation.
/**
 * A class that handles the query portion of a URLBuilder.
 */
class URLQuery {
    constructor() {
        this._rawQuery = {};
    }
    /**
     * Get whether or not there any query parameters in this URLQuery.
     */
    any() {
        return Object.keys(this._rawQuery).length > 0;
    }
    /**
     * Get the keys of the query string.
     */
    keys() {
        return Object.keys(this._rawQuery);
    }
    /**
     * Set a query parameter with the provided name and value. If the parameterValue is undefined or
     * empty, then this will attempt to remove an existing query parameter with the provided
     * parameterName.
     */
    set(parameterName, parameterValue) {
        const caseParameterValue = parameterValue;
        if (parameterName) {
            if (caseParameterValue !== undefined && caseParameterValue !== null) {
                const newValue = Array.isArray(caseParameterValue)
                    ? caseParameterValue
                    : caseParameterValue.toString();
                this._rawQuery[parameterName] = newValue;
            }
            else {
                delete this._rawQuery[parameterName];
            }
        }
    }
    /**
     * Get the value of the query parameter with the provided name. If no parameter exists with the
     * provided parameter name, then undefined will be returned.
     */
    get(parameterName) {
        return parameterName ? this._rawQuery[parameterName] : undefined;
    }
    /**
     * Get the string representation of this query. The return value will not start with a "?".
     */
    toString() {
        let result = "";
        for (const parameterName in this._rawQuery) {
            if (result) {
                result += "&";
            }
            const parameterValue = this._rawQuery[parameterName];
            if (Array.isArray(parameterValue)) {
                const parameterStrings = [];
                for (const parameterValueElement of parameterValue) {
                    parameterStrings.push(`${parameterName}=${parameterValueElement}`);
                }
                result += parameterStrings.join("&");
            }
            else {
                result += `${parameterName}=${parameterValue}`;
            }
        }
        return result;
    }
    /**
     * Parse a URLQuery from the provided text.
     */
    static parse(text) {
        const result = new URLQuery();
        if (text) {
            if (text.startsWith("?")) {
                text = text.substring(1);
            }
            let currentState = "ParameterName";
            let parameterName = "";
            let parameterValue = "";
            for (let i = 0; i < text.length; ++i) {
                const currentCharacter = text[i];
                switch (currentState) {
                    case "ParameterName":
                        switch (currentCharacter) {
                            case "=":
                                currentState = "ParameterValue";
                                break;
                            case "&":
                                parameterName = "";
                                parameterValue = "";
                                break;
                            default:
                                parameterName += currentCharacter;
                                break;
                        }
                        break;
                    case "ParameterValue":
                        switch (currentCharacter) {
                            case "&":
                                result.set(parameterName, parameterValue);
                                parameterName = "";
                                parameterValue = "";
                                currentState = "ParameterName";
                                break;
                            default:
                                parameterValue += currentCharacter;
                                break;
                        }
                        break;
                    default:
                        throw new Error("Unrecognized URLQuery parse state: " + currentState);
                }
            }
            if (currentState === "ParameterValue") {
                result.set(parameterName, parameterValue);
            }
        }
        return result;
    }
}
/**
 * A class that handles creating, modifying, and parsing URLs.
 */
class URLBuilder {
    /**
     * Set the scheme/protocol for this URL. If the provided scheme contains other parts of a URL
     * (such as a host, port, path, or query), those parts will be added to this URL as well.
     */
    setScheme(scheme) {
        if (!scheme) {
            this._scheme = undefined;
        }
        else {
            this.set(scheme, "SCHEME");
        }
    }
    /**
     * Get the scheme that has been set in this URL.
     */
    getScheme() {
        return this._scheme;
    }
    /**
     * Set the host for this URL. If the provided host contains other parts of a URL (such as a
     * port, path, or query), those parts will be added to this URL as well.
     */
    setHost(host) {
        if (!host) {
            this._host = undefined;
        }
        else {
            this.set(host, "SCHEME_OR_HOST");
        }
    }
    /**
     * Get the host that has been set in this URL.
     */
    getHost() {
        return this._host;
    }
    /**
     * Set the port for this URL. If the provided port contains other parts of a URL (such as a
     * path or query), those parts will be added to this URL as well.
     */
    setPort(port) {
        if (port === undefined || port === null || port === "") {
            this._port = undefined;
        }
        else {
            this.set(port.toString(), "PORT");
        }
    }
    /**
     * Get the port that has been set in this URL.
     */
    getPort() {
        return this._port;
    }
    /**
     * Set the path for this URL. If the provided path contains a query, then it will be added to
     * this URL as well.
     */
    setPath(path) {
        if (!path) {
            this._path = undefined;
        }
        else {
            const schemeIndex = path.indexOf("://");
            if (schemeIndex !== -1) {
                const schemeStart = path.lastIndexOf("/", schemeIndex);
                // Make sure to only grab the URL part of the path before setting the state back to SCHEME
                // this will handle cases such as "/a/b/c/https://microsoft.com" => "https://microsoft.com"
                this.set(schemeStart === -1 ? path : path.substr(schemeStart + 1), "SCHEME");
            }
            else {
                this.set(path, "PATH");
            }
        }
    }
    /**
     * Append the provided path to this URL's existing path. If the provided path contains a query,
     * then it will be added to this URL as well.
     */
    appendPath(path) {
        if (path) {
            let currentPath = this.getPath();
            if (currentPath) {
                if (!currentPath.endsWith("/")) {
                    currentPath += "/";
                }
                if (path.startsWith("/")) {
                    path = path.substring(1);
                }
                path = currentPath + path;
            }
            this.set(path, "PATH");
        }
    }
    /**
     * Get the path that has been set in this URL.
     */
    getPath() {
        return this._path;
    }
    /**
     * Set the query in this URL.
     */
    setQuery(query) {
        if (!query) {
            this._query = undefined;
        }
        else {
            this._query = URLQuery.parse(query);
        }
    }
    /**
     * Set a query parameter with the provided name and value in this URL's query. If the provided
     * query parameter value is undefined or empty, then the query parameter will be removed if it
     * existed.
     */
    setQueryParameter(queryParameterName, queryParameterValue) {
        if (queryParameterName) {
            if (!this._query) {
                this._query = new URLQuery();
            }
            this._query.set(queryParameterName, queryParameterValue);
        }
    }
    /**
     * Get the value of the query parameter with the provided query parameter name. If no query
     * parameter exists with the provided name, then undefined will be returned.
     */
    getQueryParameterValue(queryParameterName) {
        return this._query ? this._query.get(queryParameterName) : undefined;
    }
    /**
     * Get the query in this URL.
     */
    getQuery() {
        return this._query ? this._query.toString() : undefined;
    }
    /**
     * Set the parts of this URL by parsing the provided text using the provided startState.
     */
    set(text, startState) {
        const tokenizer = new URLTokenizer(text, startState);
        while (tokenizer.next()) {
            const token = tokenizer.current();
            let tokenPath;
            if (token) {
                switch (token.type) {
                    case "SCHEME":
                        this._scheme = token.text || undefined;
                        break;
                    case "HOST":
                        this._host = token.text || undefined;
                        break;
                    case "PORT":
                        this._port = token.text || undefined;
                        break;
                    case "PATH":
                        tokenPath = token.text || undefined;
                        if (!this._path || this._path === "/" || tokenPath !== "/") {
                            this._path = tokenPath;
                        }
                        break;
                    case "QUERY":
                        this._query = URLQuery.parse(token.text);
                        break;
                    default:
                        throw new Error(`Unrecognized URLTokenType: ${token.type}`);
                }
            }
        }
    }
    toString() {
        let result = "";
        if (this._scheme) {
            result += `${this._scheme}://`;
        }
        if (this._host) {
            result += this._host;
        }
        if (this._port) {
            result += `:${this._port}`;
        }
        if (this._path) {
            if (!this._path.startsWith("/")) {
                result += "/";
            }
            result += this._path;
        }
        if (this._query && this._query.any()) {
            result += `?${this._query.toString()}`;
        }
        return result;
    }
    /**
     * If the provided searchValue is found in this URLBuilder, then replace it with the provided
     * replaceValue.
     */
    replaceAll(searchValue, replaceValue) {
        if (searchValue) {
            this.setScheme(replaceAll(this.getScheme(), searchValue, replaceValue));
            this.setHost(replaceAll(this.getHost(), searchValue, replaceValue));
            this.setPort(replaceAll(this.getPort(), searchValue, replaceValue));
            this.setPath(replaceAll(this.getPath(), searchValue, replaceValue));
            this.setQuery(replaceAll(this.getQuery(), searchValue, replaceValue));
        }
    }
    static parse(text) {
        const result = new URLBuilder();
        result.set(text, "SCHEME_OR_HOST");
        return result;
    }
}
class URLToken {
    constructor(text, type) {
        this.text = text;
        this.type = type;
    }
    static scheme(text) {
        return new URLToken(text, "SCHEME");
    }
    static host(text) {
        return new URLToken(text, "HOST");
    }
    static port(text) {
        return new URLToken(text, "PORT");
    }
    static path(text) {
        return new URLToken(text, "PATH");
    }
    static query(text) {
        return new URLToken(text, "QUERY");
    }
}
/**
 * Get whether or not the provided character (single character string) is an alphanumeric (letter or
 * digit) character.
 */
function isAlphaNumericCharacter(character) {
    const characterCode = character.charCodeAt(0);
    return ((48 /* '0' */ <= characterCode && characterCode <= 57) /* '9' */ ||
        (65 /* 'A' */ <= characterCode && characterCode <= 90) /* 'Z' */ ||
        (97 /* 'a' */ <= characterCode && characterCode <= 122) /* 'z' */);
}
/**
 * A class that tokenizes URL strings.
 */
class URLTokenizer {
    constructor(_text, state) {
        this._text = _text;
        this._textLength = _text ? _text.length : 0;
        this._currentState = state !== undefined && state !== null ? state : "SCHEME_OR_HOST";
        this._currentIndex = 0;
    }
    /**
     * Get the current URLToken this URLTokenizer is pointing at, or undefined if the URLTokenizer
     * hasn't started or has finished tokenizing.
     */
    current() {
        return this._currentToken;
    }
    /**
     * Advance to the next URLToken and return whether or not a URLToken was found.
     */
    next() {
        if (!hasCurrentCharacter(this)) {
            this._currentToken = undefined;
        }
        else {
            switch (this._currentState) {
                case "SCHEME":
                    nextScheme(this);
                    break;
                case "SCHEME_OR_HOST":
                    nextSchemeOrHost(this);
                    break;
                case "HOST":
                    nextHost(this);
                    break;
                case "PORT":
                    nextPort(this);
                    break;
                case "PATH":
                    nextPath(this);
                    break;
                case "QUERY":
                    nextQuery(this);
                    break;
                default:
                    throw new Error(`Unrecognized URLTokenizerState: ${this._currentState}`);
            }
        }
        return !!this._currentToken;
    }
}
/**
 * Read the remaining characters from this Tokenizer's character stream.
 */
function readRemaining(tokenizer) {
    let result = "";
    if (tokenizer._currentIndex < tokenizer._textLength) {
        result = tokenizer._text.substring(tokenizer._currentIndex);
        tokenizer._currentIndex = tokenizer._textLength;
    }
    return result;
}
/**
 * Whether or not this URLTokenizer has a current character.
 */
function hasCurrentCharacter(tokenizer) {
    return tokenizer._currentIndex < tokenizer._textLength;
}
/**
 * Get the character in the text string at the current index.
 */
function getCurrentCharacter(tokenizer) {
    return tokenizer._text[tokenizer._currentIndex];
}
/**
 * Advance to the character in text that is "step" characters ahead. If no step value is provided,
 * then step will default to 1.
 */
function nextCharacter(tokenizer, step) {
    if (hasCurrentCharacter(tokenizer)) {
        if (!step) {
            step = 1;
        }
        tokenizer._currentIndex += step;
    }
}
/**
 * Starting with the current character, peek "charactersToPeek" number of characters ahead in this
 * Tokenizer's stream of characters.
 */
function peekCharacters(tokenizer, charactersToPeek) {
    let endIndex = tokenizer._currentIndex + charactersToPeek;
    if (tokenizer._textLength < endIndex) {
        endIndex = tokenizer._textLength;
    }
    return tokenizer._text.substring(tokenizer._currentIndex, endIndex);
}
/**
 * Read characters from this Tokenizer until the end of the stream or until the provided condition
 * is false when provided the current character.
 */
function readWhile(tokenizer, condition) {
    let result = "";
    while (hasCurrentCharacter(tokenizer)) {
        const currentCharacter = getCurrentCharacter(tokenizer);
        if (!condition(currentCharacter)) {
            break;
        }
        else {
            result += currentCharacter;
            nextCharacter(tokenizer);
        }
    }
    return result;
}
/**
 * Read characters from this Tokenizer until a non-alphanumeric character or the end of the
 * character stream is reached.
 */
function readWhileLetterOrDigit(tokenizer) {
    return readWhile(tokenizer, (character) => isAlphaNumericCharacter(character));
}
/**
 * Read characters from this Tokenizer until one of the provided terminating characters is read or
 * the end of the character stream is reached.
 */
function readUntilCharacter(tokenizer, ...terminatingCharacters) {
    return readWhile(tokenizer, (character) => terminatingCharacters.indexOf(character) === -1);
}
function nextScheme(tokenizer) {
    const scheme = readWhileLetterOrDigit(tokenizer);
    tokenizer._currentToken = URLToken.scheme(scheme);
    if (!hasCurrentCharacter(tokenizer)) {
        tokenizer._currentState = "DONE";
    }
    else {
        tokenizer._currentState = "HOST";
    }
}
function nextSchemeOrHost(tokenizer) {
    const schemeOrHost = readUntilCharacter(tokenizer, ":", "/", "?");
    if (!hasCurrentCharacter(tokenizer)) {
        tokenizer._currentToken = URLToken.host(schemeOrHost);
        tokenizer._currentState = "DONE";
    }
    else if (getCurrentCharacter(tokenizer) === ":") {
        if (peekCharacters(tokenizer, 3) === "://") {
            tokenizer._currentToken = URLToken.scheme(schemeOrHost);
            tokenizer._currentState = "HOST";
        }
        else {
            tokenizer._currentToken = URLToken.host(schemeOrHost);
            tokenizer._currentState = "PORT";
        }
    }
    else {
        tokenizer._currentToken = URLToken.host(schemeOrHost);
        if (getCurrentCharacter(tokenizer) === "/") {
            tokenizer._currentState = "PATH";
        }
        else {
            tokenizer._currentState = "QUERY";
        }
    }
}
function nextHost(tokenizer) {
    if (peekCharacters(tokenizer, 3) === "://") {
        nextCharacter(tokenizer, 3);
    }
    const host = readUntilCharacter(tokenizer, ":", "/", "?");
    tokenizer._currentToken = URLToken.host(host);
    if (!hasCurrentCharacter(tokenizer)) {
        tokenizer._currentState = "DONE";
    }
    else if (getCurrentCharacter(tokenizer) === ":") {
        tokenizer._currentState = "PORT";
    }
    else if (getCurrentCharacter(tokenizer) === "/") {
        tokenizer._currentState = "PATH";
    }
    else {
        tokenizer._currentState = "QUERY";
    }
}
function nextPort(tokenizer) {
    if (getCurrentCharacter(tokenizer) === ":") {
        nextCharacter(tokenizer);
    }
    const port = readUntilCharacter(tokenizer, "/", "?");
    tokenizer._currentToken = URLToken.port(port);
    if (!hasCurrentCharacter(tokenizer)) {
        tokenizer._currentState = "DONE";
    }
    else if (getCurrentCharacter(tokenizer) === "/") {
        tokenizer._currentState = "PATH";
    }
    else {
        tokenizer._currentState = "QUERY";
    }
}
function nextPath(tokenizer) {
    const path = readUntilCharacter(tokenizer, "?");
    tokenizer._currentToken = URLToken.path(path);
    if (!hasCurrentCharacter(tokenizer)) {
        tokenizer._currentState = "DONE";
    }
    else {
        tokenizer._currentState = "QUERY";
    }
}
function nextQuery(tokenizer) {
    if (getCurrentCharacter(tokenizer) === "?") {
        nextCharacter(tokenizer);
    }
    const query = readRemaining(tokenizer);
    tokenizer._currentToken = URLToken.query(query);
    tokenizer._currentState = "DONE";
}

// Copyright (c) Microsoft Corporation.
const RedactedString = "REDACTED";
const defaultAllowedHeaderNames = [
    "x-ms-client-request-id",
    "x-ms-return-client-request-id",
    "x-ms-useragent",
    "x-ms-correlation-request-id",
    "x-ms-request-id",
    "client-request-id",
    "ms-cv",
    "return-client-request-id",
    "traceparent",
    "Access-Control-Allow-Credentials",
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Methods",
    "Access-Control-Allow-Origin",
    "Access-Control-Expose-Headers",
    "Access-Control-Max-Age",
    "Access-Control-Request-Headers",
    "Access-Control-Request-Method",
    "Origin",
    "Accept",
    "Accept-Encoding",
    "Cache-Control",
    "Connection",
    "Content-Length",
    "Content-Type",
    "Date",
    "ETag",
    "Expires",
    "If-Match",
    "If-Modified-Since",
    "If-None-Match",
    "If-Unmodified-Since",
    "Last-Modified",
    "Pragma",
    "Request-Id",
    "Retry-After",
    "Server",
    "Transfer-Encoding",
    "User-Agent"
];
const defaultAllowedQueryParameters = ["api-version"];
class Sanitizer {
    constructor({ allowedHeaderNames = [], allowedQueryParameters = [] } = {}) {
        allowedHeaderNames = Array.isArray(allowedHeaderNames)
            ? defaultAllowedHeaderNames.concat(allowedHeaderNames)
            : defaultAllowedHeaderNames;
        allowedQueryParameters = Array.isArray(allowedQueryParameters)
            ? defaultAllowedQueryParameters.concat(allowedQueryParameters)
            : defaultAllowedQueryParameters;
        this.allowedHeaderNames = new Set(allowedHeaderNames.map((n) => n.toLowerCase()));
        this.allowedQueryParameters = new Set(allowedQueryParameters.map((p) => p.toLowerCase()));
    }
    sanitize(obj) {
        const seen = new Set();
        return JSON.stringify(obj, (key, value) => {
            // Ensure Errors include their interesting non-enumerable members
            if (value instanceof Error) {
                return Object.assign(Object.assign({}, value), { name: value.name, message: value.message });
            }
            if (key === "_headersMap") {
                return this.sanitizeHeaders(value);
            }
            else if (key === "url") {
                return this.sanitizeUrl(value);
            }
            else if (key === "query") {
                return this.sanitizeQuery(value);
            }
            else if (key === "body") {
                // Don't log the request body
                return undefined;
            }
            else if (key === "response") {
                // Don't log response again
                return undefined;
            }
            else if (key === "operationSpec") {
                // When using sendOperationRequest, the request carries a massive
                // field with the autorest spec. No need to log it.
                return undefined;
            }
            else if (Array.isArray(value) || isObject(value)) {
                if (seen.has(value)) {
                    return "[Circular]";
                }
                seen.add(value);
            }
            return value;
        }, 2);
    }
    sanitizeHeaders(value) {
        return this.sanitizeObject(value, this.allowedHeaderNames, (v, k) => v[k].value);
    }
    sanitizeQuery(value) {
        return this.sanitizeObject(value, this.allowedQueryParameters, (v, k) => v[k]);
    }
    sanitizeObject(value, allowedKeys, accessor) {
        if (typeof value !== "object" || value === null) {
            return value;
        }
        const sanitized = {};
        for (const k of Object.keys(value)) {
            if (allowedKeys.has(k.toLowerCase())) {
                sanitized[k] = accessor(value, k);
            }
            else {
                sanitized[k] = RedactedString;
            }
        }
        return sanitized;
    }
    sanitizeUrl(value) {
        if (typeof value !== "string" || value === null) {
            return value;
        }
        const urlBuilder = URLBuilder.parse(value);
        const queryString = urlBuilder.getQuery();
        if (!queryString) {
            return value;
        }
        const query = URLQuery.parse(queryString);
        for (const k of query.keys()) {
            if (!this.allowedQueryParameters.has(k.toLowerCase())) {
                query.set(k, RedactedString);
            }
        }
        urlBuilder.setQuery(query.toString());
        return urlBuilder.toString();
    }
}

// Copyright (c) Microsoft Corporation.
const errorSanitizer = new Sanitizer();
class RestError extends Error {
    constructor(message, code, statusCode, request, response) {
        super(message);
        this.name = "RestError";
        this.code = code;
        this.statusCode = statusCode;
        this.request = request;
        this.response = response;
        Object.setPrototypeOf(this, RestError.prototype);
    }
    /**
     * Logging method for util.inspect in Node
     */
    [custom]() {
        return `RestError: ${this.message} \n ${errorSanitizer.sanitize(this)}`;
    }
}
RestError.REQUEST_SEND_ERROR = "REQUEST_SEND_ERROR";
RestError.PARSE_ERROR = "PARSE_ERROR";

// Copyright (c) Microsoft Corporation.
const logger = logger$1.createClientLogger("core-http");

// Copyright (c) Microsoft Corporation.
class ReportTransform extends stream.Transform {
    constructor(progressCallback) {
        super();
        this.progressCallback = progressCallback;
        this.loadedBytes = 0;
    }
    _transform(chunk, _encoding, callback) {
        this.push(chunk);
        this.loadedBytes += chunk.length;
        this.progressCallback({ loadedBytes: this.loadedBytes });
        callback(undefined);
    }
}
class FetchHttpClient {
    async sendRequest(httpRequest) {
        var _a;
        if (!httpRequest && typeof httpRequest !== "object") {
            throw new Error("'httpRequest' (WebResourceLike) cannot be null or undefined and must be of type object.");
        }
        const abortController$1 = new abortController.AbortController();
        let abortListener;
        if (httpRequest.abortSignal) {
            if (httpRequest.abortSignal.aborted) {
                throw new abortController.AbortError("The operation was aborted.");
            }
            abortListener = (event) => {
                if (event.type === "abort") {
                    abortController$1.abort();
                }
            };
            httpRequest.abortSignal.addEventListener("abort", abortListener);
        }
        if (httpRequest.timeout) {
            setTimeout(() => {
                abortController$1.abort();
            }, httpRequest.timeout);
        }
        if (httpRequest.formData) {
            const formData = httpRequest.formData;
            const requestForm = new FormData();
            const appendFormValue = (key, value) => {
                // value function probably returns a stream so we can provide a fresh stream on each retry
                if (typeof value === "function") {
                    value = value();
                }
                if (value &&
                    Object.prototype.hasOwnProperty.call(value, "value") &&
                    Object.prototype.hasOwnProperty.call(value, "options")) {
                    requestForm.append(key, value.value, value.options);
                }
                else {
                    requestForm.append(key, value);
                }
            };
            for (const formKey of Object.keys(formData)) {
                const formValue = formData[formKey];
                if (Array.isArray(formValue)) {
                    for (let j = 0; j < formValue.length; j++) {
                        appendFormValue(formKey, formValue[j]);
                    }
                }
                else {
                    appendFormValue(formKey, formValue);
                }
            }
            httpRequest.body = requestForm;
            httpRequest.formData = undefined;
            const contentType = httpRequest.headers.get("Content-Type");
            if (contentType && contentType.indexOf("multipart/form-data") !== -1) {
                if (typeof requestForm.getBoundary === "function") {
                    httpRequest.headers.set("Content-Type", `multipart/form-data; boundary=${requestForm.getBoundary()}`);
                }
                else {
                    // browser will automatically apply a suitable content-type header
                    httpRequest.headers.remove("Content-Type");
                }
            }
        }
        let body = httpRequest.body
            ? typeof httpRequest.body === "function"
                ? httpRequest.body()
                : httpRequest.body
            : undefined;
        if (httpRequest.onUploadProgress && httpRequest.body) {
            const onUploadProgress = httpRequest.onUploadProgress;
            const uploadReportStream = new ReportTransform(onUploadProgress);
            if (isReadableStream(body)) {
                body.pipe(uploadReportStream);
            }
            else {
                uploadReportStream.end(body);
            }
            body = uploadReportStream;
        }
        const platformSpecificRequestInit = await this.prepareRequest(httpRequest);
        const requestInit = Object.assign({ body: body, headers: httpRequest.headers.rawHeaders(), method: httpRequest.method, signal: abortController$1.signal, redirect: "manual" }, platformSpecificRequestInit);
        let operationResponse;
        try {
            const response = await this.fetch(httpRequest.url, requestInit);
            const headers = parseHeaders(response.headers);
            const streaming = ((_a = httpRequest.streamResponseStatusCodes) === null || _a === void 0 ? void 0 : _a.has(response.status)) ||
                httpRequest.streamResponseBody;
            operationResponse = {
                headers: headers,
                request: httpRequest,
                status: response.status,
                readableStreamBody: streaming
                    ? response.body
                    : undefined,
                bodyAsText: !streaming ? await response.text() : undefined
            };
            const onDownloadProgress = httpRequest.onDownloadProgress;
            if (onDownloadProgress) {
                const responseBody = response.body || undefined;
                if (isReadableStream(responseBody)) {
                    const downloadReportStream = new ReportTransform(onDownloadProgress);
                    responseBody.pipe(downloadReportStream);
                    operationResponse.readableStreamBody = downloadReportStream;
                }
                else {
                    const length = parseInt(headers.get("Content-Length")) || undefined;
                    if (length) {
                        // Calling callback for non-stream response for consistency with browser
                        onDownloadProgress({ loadedBytes: length });
                    }
                }
            }
            await this.processRequest(operationResponse);
            return operationResponse;
        }
        catch (error) {
            const fetchError = error;
            if (fetchError.code === "ENOTFOUND") {
                throw new RestError(fetchError.message, RestError.REQUEST_SEND_ERROR, undefined, httpRequest);
            }
            else if (fetchError.type === "aborted") {
                throw new abortController.AbortError("The operation was aborted.");
            }
            throw fetchError;
        }
        finally {
            // clean up event listener
            if (httpRequest.abortSignal && abortListener) {
                let uploadStreamDone = Promise.resolve();
                if (isReadableStream(body)) {
                    uploadStreamDone = isStreamComplete(body);
                }
                let downloadStreamDone = Promise.resolve();
                if (isReadableStream(operationResponse === null || operationResponse === void 0 ? void 0 : operationResponse.readableStreamBody)) {
                    downloadStreamDone = isStreamComplete(operationResponse.readableStreamBody);
                }
                Promise.all([uploadStreamDone, downloadStreamDone])
                    .then(() => {
                    var _a;
                    (_a = httpRequest.abortSignal) === null || _a === void 0 ? void 0 : _a.removeEventListener("abort", abortListener);
                    return;
                })
                    .catch((e) => {
                    logger.warning("Error when cleaning up abortListener on httpRequest", e);
                });
            }
        }
    }
}
function isReadableStream(body) {
    return body && typeof body.pipe === "function";
}
function isStreamComplete(stream) {
    return new Promise((resolve) => {
        stream.on("close", resolve);
        stream.on("end", resolve);
        stream.on("error", resolve);
    });
}
function parseHeaders(headers) {
    const httpHeaders = new HttpHeaders();
    headers.forEach((value, key) => {
        httpHeaders.set(key, value);
    });
    return httpHeaders;
}

// Copyright (c) Microsoft Corporation.
function createProxyAgent(requestUrl, proxySettings, headers) {
    const host = URLBuilder.parse(proxySettings.host).getHost();
    if (!host) {
        throw new Error("Expecting a non-empty host in proxy settings.");
    }
    if (!isValidPort(proxySettings.port)) {
        throw new Error("Expecting a valid port number in the range of [0, 65535] in proxy settings.");
    }
    const tunnelOptions = {
        proxy: {
            host: host,
            port: proxySettings.port,
            headers: (headers && headers.rawHeaders()) || {}
        }
    };
    if (proxySettings.username && proxySettings.password) {
        tunnelOptions.proxy.proxyAuth = `${proxySettings.username}:${proxySettings.password}`;
    }
    else if (proxySettings.username) {
        tunnelOptions.proxy.proxyAuth = `${proxySettings.username}`;
    }
    const isRequestHttps = isUrlHttps(requestUrl);
    const isProxyHttps = isUrlHttps(proxySettings.host);
    const proxyAgent = {
        isHttps: isRequestHttps,
        agent: createTunnel(isRequestHttps, isProxyHttps, tunnelOptions)
    };
    return proxyAgent;
}
function isUrlHttps(url) {
    const urlScheme = URLBuilder.parse(url).getScheme() || "";
    return urlScheme.toLowerCase() === "https";
}
function createTunnel(isRequestHttps, isProxyHttps, tunnelOptions) {
    if (isRequestHttps && isProxyHttps) {
        return tunnel.httpsOverHttps(tunnelOptions);
    }
    else if (isRequestHttps && !isProxyHttps) {
        return tunnel.httpsOverHttp(tunnelOptions);
    }
    else if (!isRequestHttps && isProxyHttps) {
        return tunnel.httpOverHttps(tunnelOptions);
    }
    else {
        return tunnel.httpOverHttp(tunnelOptions);
    }
}
function isValidPort(port) {
    // any port in 0-65535 range is valid (RFC 793) even though almost all implementations
    // will reserve 0 for a specific purpose, and a range of numbers for ephemeral ports
    return 0 <= port && port <= 65535;
}

// Copyright (c) Microsoft Corporation.
function getCachedAgent(isHttps, agentCache) {
    return isHttps ? agentCache.httpsAgent : agentCache.httpAgent;
}
class NodeFetchHttpClient extends FetchHttpClient {
    constructor() {
        super(...arguments);
        this.proxyAgents = {};
        this.keepAliveAgents = {};
        this.cookieJar = new tough.CookieJar(undefined, { looseMode: true });
    }
    getOrCreateAgent(httpRequest) {
        const isHttps = isUrlHttps(httpRequest.url);
        // At the moment, proxy settings and keepAlive are mutually
        // exclusive because the 'tunnel' library currently lacks the
        // ability to create a proxy with keepAlive turned on.
        if (httpRequest.proxySettings) {
            let agent = getCachedAgent(isHttps, this.proxyAgents);
            if (agent) {
                return agent;
            }
            const tunnel = createProxyAgent(httpRequest.url, httpRequest.proxySettings, httpRequest.headers);
            agent = tunnel.agent;
            if (tunnel.isHttps) {
                this.proxyAgents.httpsAgent = tunnel.agent;
            }
            else {
                this.proxyAgents.httpAgent = tunnel.agent;
            }
            return agent;
        }
        else if (httpRequest.keepAlive) {
            let agent = getCachedAgent(isHttps, this.keepAliveAgents);
            if (agent) {
                return agent;
            }
            const agentOptions = {
                keepAlive: httpRequest.keepAlive
            };
            if (isHttps) {
                agent = this.keepAliveAgents.httpsAgent = new https.Agent(agentOptions);
            }
            else {
                agent = this.keepAliveAgents.httpAgent = new http.Agent(agentOptions);
            }
            return agent;
        }
        else {
            return isHttps ? https.globalAgent : http.globalAgent;
        }
    }
    // eslint-disable-next-line @azure/azure-sdk/ts-apisurface-standardized-verbs
    async fetch(input, init) {
        return node_fetch(input, init);
    }
    async prepareRequest(httpRequest) {
        const requestInit = {};
        if (this.cookieJar && !httpRequest.headers.get("Cookie")) {
            const cookieString = await new Promise((resolve, reject) => {
                this.cookieJar.getCookieString(httpRequest.url, (err, cookie) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(cookie);
                    }
                });
            });
            httpRequest.headers.set("Cookie", cookieString);
        }
        // Set the http(s) agent
        requestInit.agent = this.getOrCreateAgent(httpRequest);
        requestInit.compress = httpRequest.decompressResponse;
        return requestInit;
    }
    async processRequest(operationResponse) {
        if (this.cookieJar) {
            const setCookieHeader = operationResponse.headers.get("Set-Cookie");
            if (setCookieHeader !== undefined) {
                await new Promise((resolve, reject) => {
                    this.cookieJar.setCookie(setCookieHeader, operationResponse.request.url, { ignoreError: true }, (err) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });
                });
            }
        }
    }
}

// Copyright (c) Microsoft Corporation.
(function (HttpPipelineLogLevel) {
    /**
     * A log level that indicates that no logs will be logged.
     */
    HttpPipelineLogLevel[HttpPipelineLogLevel["OFF"] = 0] = "OFF";
    /**
     * An error log.
     */
    HttpPipelineLogLevel[HttpPipelineLogLevel["ERROR"] = 1] = "ERROR";
    /**
     * A warning log.
     */
    HttpPipelineLogLevel[HttpPipelineLogLevel["WARNING"] = 2] = "WARNING";
    /**
     * An information log.
     */
    HttpPipelineLogLevel[HttpPipelineLogLevel["INFO"] = 3] = "INFO";
})(exports.HttpPipelineLogLevel || (exports.HttpPipelineLogLevel = {}));

/**
 * Converts an OperationOptions to a RequestOptionsBase
 *
 * @param opts - OperationOptions object to convert to RequestOptionsBase
 */
function operationOptionsToRequestOptionsBase(opts) {
    var _a;
    const { requestOptions, tracingOptions } = opts, additionalOptions = tslib.__rest(opts, ["requestOptions", "tracingOptions"]);
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

// Copyright (c) Microsoft Corporation.
class BaseRequestPolicy {
    constructor(_nextPolicy, _options) {
        this._nextPolicy = _nextPolicy;
        this._options = _options;
    }
    /**
     * Get whether or not a log with the provided log level should be logged.
     * @param logLevel - The log level of the log that will be logged.
     * @returns Whether or not a log with the provided log level should be logged.
     */
    shouldLog(logLevel) {
        return this._options.shouldLog(logLevel);
    }
    /**
     * Attempt to log the provided message to the provided logger. If no logger was provided or if
     * the log level does not meat the logger's threshold, then nothing will be logged.
     * @param logLevel - The log level of this log.
     * @param message - The message of this log.
     */
    log(logLevel, message) {
        this._options.log(logLevel, message);
    }
}
/**
 * Optional properties that can be used when creating a RequestPolicy.
 */
class RequestPolicyOptions {
    constructor(_logger) {
        this._logger = _logger;
    }
    /**
     * Get whether or not a log with the provided log level should be logged.
     * @param logLevel - The log level of the log that will be logged.
     * @returns Whether or not a log with the provided log level should be logged.
     */
    shouldLog(logLevel) {
        return (!!this._logger &&
            logLevel !== exports.HttpPipelineLogLevel.OFF &&
            logLevel <= this._logger.minimumLogLevel);
    }
    /**
     * Attempt to log the provided message to the provided logger. If no logger was provided or if
     * the log level does not meet the logger's threshold, then nothing will be logged.
     * @param logLevel - The log level of this log.
     * @param message - The message of this log.
     */
    log(logLevel, message) {
        if (this._logger && this.shouldLog(logLevel)) {
            this._logger.log(logLevel, message);
        }
    }
}

// Copyright (c) Microsoft Corporation.
function logPolicy(loggingOptions = {}) {
    return {
        create: (nextPolicy, options) => {
            return new LogPolicy(nextPolicy, options, loggingOptions);
        }
    };
}
class LogPolicy extends BaseRequestPolicy {
    constructor(nextPolicy, options, { logger: logger$1 = logger.info, allowedHeaderNames = [], allowedQueryParameters = [] } = {}) {
        super(nextPolicy, options);
        this.logger = logger$1;
        this.sanitizer = new Sanitizer({ allowedHeaderNames, allowedQueryParameters });
    }
    /**
     * Header names whose values will be logged when logging is enabled. Defaults to
     * Date, traceparent, x-ms-client-request-id, and x-ms-request id.  Any headers
     * specified in this field will be added to that list.  Any other values will
     * be written to logs as "REDACTED".
     * @deprecated Pass these into the constructor instead.
     */
    get allowedHeaderNames() {
        return this.sanitizer.allowedHeaderNames;
    }
    /**
     * Header names whose values will be logged when logging is enabled. Defaults to
     * Date, traceparent, x-ms-client-request-id, and x-ms-request id.  Any headers
     * specified in this field will be added to that list.  Any other values will
     * be written to logs as "REDACTED".
     * @deprecated Pass these into the constructor instead.
     */
    set allowedHeaderNames(allowedHeaderNames) {
        this.sanitizer.allowedHeaderNames = allowedHeaderNames;
    }
    /**
     * Query string names whose values will be logged when logging is enabled. By default no
     * query string values are logged.
     * @deprecated Pass these into the constructor instead.
     */
    get allowedQueryParameters() {
        return this.sanitizer.allowedQueryParameters;
    }
    /**
     * Query string names whose values will be logged when logging is enabled. By default no
     * query string values are logged.
     * @deprecated Pass these into the constructor instead.
     */
    set allowedQueryParameters(allowedQueryParameters) {
        this.sanitizer.allowedQueryParameters = allowedQueryParameters;
    }
    sendRequest(request) {
        if (!this.logger.enabled)
            return this._nextPolicy.sendRequest(request);
        this.logRequest(request);
        return this._nextPolicy.sendRequest(request).then((response) => this.logResponse(response));
    }
    logRequest(request) {
        this.logger(`Request: ${this.sanitizer.sanitize(request)}`);
    }
    logResponse(response) {
        this.logger(`Response status code: ${response.status}`);
        this.logger(`Headers: ${this.sanitizer.sanitize(response.headers)}`);
        return response;
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Get the path to this parameter's value as a dotted string (a.b.c).
 * @param parameter - The parameter to get the path string for.
 * @returns The path to this parameter's value as a dotted string.
 */
function getPathStringFromParameter(parameter) {
    return getPathStringFromParameterPath(parameter.parameterPath, parameter.mapper);
}
function getPathStringFromParameterPath(parameterPath, mapper) {
    let result;
    if (typeof parameterPath === "string") {
        result = parameterPath;
    }
    else if (Array.isArray(parameterPath)) {
        result = parameterPath.join(".");
    }
    else {
        result = mapper.serializedName;
    }
    return result;
}

// Copyright (c) Microsoft Corporation.
/**
 * Gets the list of status codes for streaming responses.
 * @internal
 */
function getStreamResponseStatusCodes(operationSpec) {
    const result = new Set();
    for (const statusCode in operationSpec.responses) {
        const operationResponse = operationSpec.responses[statusCode];
        if (operationResponse.bodyMapper &&
            operationResponse.bodyMapper.type.name === MapperType.Stream) {
            result.add(Number(statusCode));
        }
    }
    return result;
}

// Copyright (c) Microsoft Corporation.
// Note: The reason we re-define all of the xml2js default settings (version 2.0) here is because the default settings object exposed
// by the xm2js library is mutable. See https://github.com/Leonidas-from-XIV/node-xml2js/issues/536
// By creating a new copy of the settings each time we instantiate the parser,
// we are safeguarding against the possibility of the default settings being mutated elsewhere unintentionally.
const xml2jsDefaultOptionsV2 = {
    explicitCharkey: false,
    trim: false,
    normalize: false,
    normalizeTags: false,
    attrkey: XML_ATTRKEY,
    explicitArray: true,
    ignoreAttrs: false,
    mergeAttrs: false,
    explicitRoot: true,
    validator: undefined,
    xmlns: false,
    explicitChildren: false,
    preserveChildrenOrder: false,
    childkey: "$$",
    charsAsChildren: false,
    includeWhiteChars: false,
    async: false,
    strict: true,
    attrNameProcessors: undefined,
    attrValueProcessors: undefined,
    tagNameProcessors: undefined,
    valueProcessors: undefined,
    rootName: "root",
    xmldec: {
        version: "1.0",
        encoding: "UTF-8",
        standalone: true
    },
    doctype: undefined,
    renderOpts: {
        pretty: true,
        indent: "  ",
        newline: "\n"
    },
    headless: false,
    chunkSize: 10000,
    emptyTag: "",
    cdata: false
};
// The xml2js settings for general XML parsing operations.
const xml2jsParserSettings = Object.assign({}, xml2jsDefaultOptionsV2);
xml2jsParserSettings.explicitArray = false;
// The xml2js settings for general XML building operations.
const xml2jsBuilderSettings = Object.assign({}, xml2jsDefaultOptionsV2);
xml2jsBuilderSettings.explicitArray = false;
xml2jsBuilderSettings.renderOpts = {
    pretty: false
};
/**
 * Converts given JSON object to XML string
 * @param obj - JSON object to be converted into XML string
 * @param opts - Options that govern the parsing of given JSON object
 */
function stringifyXML(obj, opts = {}) {
    var _a;
    xml2jsBuilderSettings.rootName = opts.rootName;
    xml2jsBuilderSettings.charkey = (_a = opts.xmlCharKey) !== null && _a !== void 0 ? _a : XML_CHARKEY;
    const builder = new xml2js.Builder(xml2jsBuilderSettings);
    return builder.buildObject(obj);
}
/**
 * Converts given XML string into JSON
 * @param str - String containing the XML content to be parsed into JSON
 * @param opts - Options that govern the parsing of given xml string
 */
function parseXML(str, opts = {}) {
    var _a;
    xml2jsParserSettings.explicitRoot = !!opts.includeRoot;
    xml2jsParserSettings.charkey = (_a = opts.xmlCharKey) !== null && _a !== void 0 ? _a : XML_CHARKEY;
    const xmlParser = new xml2js.Parser(xml2jsParserSettings);
    return new Promise((resolve, reject) => {
        if (!str) {
            reject(new Error("Document is empty"));
        }
        else {
            xmlParser.parseString(str, (err, res) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(res);
                }
            });
        }
    });
}

// Copyright (c) Microsoft Corporation.
/**
 * Create a new serialization RequestPolicyCreator that will serialized HTTP request bodies as they
 * pass through the HTTP pipeline.
 */
function deserializationPolicy(deserializationContentTypes, parsingOptions) {
    return {
        create: (nextPolicy, options) => {
            return new DeserializationPolicy(nextPolicy, options, deserializationContentTypes, parsingOptions);
        }
    };
}
const defaultJsonContentTypes = ["application/json", "text/json"];
const defaultXmlContentTypes = ["application/xml", "application/atom+xml"];
const DefaultDeserializationOptions = {
    expectedContentTypes: {
        json: defaultJsonContentTypes,
        xml: defaultXmlContentTypes
    }
};
/**
 * A RequestPolicy that will deserialize HTTP response bodies and headers as they pass through the
 * HTTP pipeline.
 */
class DeserializationPolicy extends BaseRequestPolicy {
    constructor(nextPolicy, requestPolicyOptions, deserializationContentTypes, parsingOptions = {}) {
        var _a;
        super(nextPolicy, requestPolicyOptions);
        this.jsonContentTypes =
            (deserializationContentTypes && deserializationContentTypes.json) || defaultJsonContentTypes;
        this.xmlContentTypes =
            (deserializationContentTypes && deserializationContentTypes.xml) || defaultXmlContentTypes;
        this.xmlCharKey = (_a = parsingOptions.xmlCharKey) !== null && _a !== void 0 ? _a : XML_CHARKEY;
    }
    async sendRequest(request) {
        return this._nextPolicy.sendRequest(request).then((response) => deserializeResponseBody(this.jsonContentTypes, this.xmlContentTypes, response, {
            xmlCharKey: this.xmlCharKey
        }));
    }
}
function getOperationResponse(parsedResponse) {
    let result;
    const request = parsedResponse.request;
    const operationSpec = request.operationSpec;
    if (operationSpec) {
        const operationResponseGetter = request.operationResponseGetter;
        if (!operationResponseGetter) {
            result = operationSpec.responses[parsedResponse.status];
        }
        else {
            result = operationResponseGetter(operationSpec, parsedResponse);
        }
    }
    return result;
}
function shouldDeserializeResponse(parsedResponse) {
    const shouldDeserialize = parsedResponse.request.shouldDeserialize;
    let result;
    if (shouldDeserialize === undefined) {
        result = true;
    }
    else if (typeof shouldDeserialize === "boolean") {
        result = shouldDeserialize;
    }
    else {
        result = shouldDeserialize(parsedResponse);
    }
    return result;
}
function deserializeResponseBody(jsonContentTypes, xmlContentTypes, response, options = {}) {
    var _a, _b, _c;
    const updatedOptions = {
        rootName: (_a = options.rootName) !== null && _a !== void 0 ? _a : "",
        includeRoot: (_b = options.includeRoot) !== null && _b !== void 0 ? _b : false,
        xmlCharKey: (_c = options.xmlCharKey) !== null && _c !== void 0 ? _c : XML_CHARKEY
    };
    return parse(jsonContentTypes, xmlContentTypes, response, updatedOptions).then((parsedResponse) => {
        if (!shouldDeserializeResponse(parsedResponse)) {
            return parsedResponse;
        }
        const operationSpec = parsedResponse.request.operationSpec;
        if (!operationSpec || !operationSpec.responses) {
            return parsedResponse;
        }
        const responseSpec = getOperationResponse(parsedResponse);
        const { error, shouldReturnResponse } = handleErrorResponse(parsedResponse, operationSpec, responseSpec);
        if (error) {
            throw error;
        }
        else if (shouldReturnResponse) {
            return parsedResponse;
        }
        // An operation response spec does exist for current status code, so
        // use it to deserialize the response.
        if (responseSpec) {
            if (responseSpec.bodyMapper) {
                let valueToDeserialize = parsedResponse.parsedBody;
                if (operationSpec.isXML && responseSpec.bodyMapper.type.name === MapperType.Sequence) {
                    valueToDeserialize =
                        typeof valueToDeserialize === "object"
                            ? valueToDeserialize[responseSpec.bodyMapper.xmlElementName]
                            : [];
                }
                try {
                    parsedResponse.parsedBody = operationSpec.serializer.deserialize(responseSpec.bodyMapper, valueToDeserialize, "operationRes.parsedBody", options);
                }
                catch (innerError) {
                    const restError = new RestError(`Error ${innerError} occurred in deserializing the responseBody - ${parsedResponse.bodyAsText}`, undefined, parsedResponse.status, parsedResponse.request, parsedResponse);
                    throw restError;
                }
            }
            else if (operationSpec.httpMethod === "HEAD") {
                // head methods never have a body, but we return a boolean to indicate presence/absence of the resource
                parsedResponse.parsedBody = response.status >= 200 && response.status < 300;
            }
            if (responseSpec.headersMapper) {
                parsedResponse.parsedHeaders = operationSpec.serializer.deserialize(responseSpec.headersMapper, parsedResponse.headers.rawHeaders(), "operationRes.parsedHeaders", options);
            }
        }
        return parsedResponse;
    });
}
function isOperationSpecEmpty(operationSpec) {
    const expectedStatusCodes = Object.keys(operationSpec.responses);
    return (expectedStatusCodes.length === 0 ||
        (expectedStatusCodes.length === 1 && expectedStatusCodes[0] === "default"));
}
function handleErrorResponse(parsedResponse, operationSpec, responseSpec) {
    var _a;
    const isSuccessByStatus = 200 <= parsedResponse.status && parsedResponse.status < 300;
    const isExpectedStatusCode = isOperationSpecEmpty(operationSpec)
        ? isSuccessByStatus
        : !!responseSpec;
    if (isExpectedStatusCode) {
        if (responseSpec) {
            if (!responseSpec.isError) {
                return { error: null, shouldReturnResponse: false };
            }
        }
        else {
            return { error: null, shouldReturnResponse: false };
        }
    }
    const errorResponseSpec = responseSpec !== null && responseSpec !== void 0 ? responseSpec : operationSpec.responses.default;
    const streaming = ((_a = parsedResponse.request.streamResponseStatusCodes) === null || _a === void 0 ? void 0 : _a.has(parsedResponse.status)) ||
        parsedResponse.request.streamResponseBody;
    const initialErrorMessage = streaming
        ? `Unexpected status code: ${parsedResponse.status}`
        : parsedResponse.bodyAsText;
    const error = new RestError(initialErrorMessage, undefined, parsedResponse.status, parsedResponse.request, parsedResponse);
    // If the item failed but there's no error spec or default spec to deserialize the error,
    // we should fail so we just throw the parsed response
    if (!errorResponseSpec) {
        throw error;
    }
    const defaultBodyMapper = errorResponseSpec.bodyMapper;
    const defaultHeadersMapper = errorResponseSpec.headersMapper;
    try {
        // If error response has a body, try to deserialize it using default body mapper.
        // Then try to extract error code & message from it
        if (parsedResponse.parsedBody) {
            const parsedBody = parsedResponse.parsedBody;
            let parsedError;
            if (defaultBodyMapper) {
                let valueToDeserialize = parsedBody;
                if (operationSpec.isXML && defaultBodyMapper.type.name === MapperType.Sequence) {
                    valueToDeserialize =
                        typeof parsedBody === "object" ? parsedBody[defaultBodyMapper.xmlElementName] : [];
                }
                parsedError = operationSpec.serializer.deserialize(defaultBodyMapper, valueToDeserialize, "error.response.parsedBody");
            }
            const internalError = parsedBody.error || parsedError || parsedBody;
            error.code = internalError.code;
            if (internalError.message) {
                error.message = internalError.message;
            }
            if (defaultBodyMapper) {
                error.response.parsedBody = parsedError;
            }
        }
        // If error response has headers, try to deserialize it using default header mapper
        if (parsedResponse.headers && defaultHeadersMapper) {
            error.response.parsedHeaders = operationSpec.serializer.deserialize(defaultHeadersMapper, parsedResponse.headers.rawHeaders(), "operationRes.parsedHeaders");
        }
    }
    catch (defaultError) {
        error.message = `Error "${defaultError.message}" occurred in deserializing the responseBody - "${parsedResponse.bodyAsText}" for the default response.`;
    }
    return { error, shouldReturnResponse: false };
}
function parse(jsonContentTypes, xmlContentTypes, operationResponse, opts) {
    var _a;
    const errorHandler = (err) => {
        const msg = `Error "${err}" occurred while parsing the response body - ${operationResponse.bodyAsText}.`;
        const errCode = err.code || RestError.PARSE_ERROR;
        const e = new RestError(msg, errCode, operationResponse.status, operationResponse.request, operationResponse);
        return Promise.reject(e);
    };
    const streaming = ((_a = operationResponse.request.streamResponseStatusCodes) === null || _a === void 0 ? void 0 : _a.has(operationResponse.status)) ||
        operationResponse.request.streamResponseBody;
    if (!streaming && operationResponse.bodyAsText) {
        const text = operationResponse.bodyAsText;
        const contentType = operationResponse.headers.get("Content-Type") || "";
        const contentComponents = !contentType
            ? []
            : contentType.split(";").map((component) => component.toLowerCase());
        if (contentComponents.length === 0 ||
            contentComponents.some((component) => jsonContentTypes.indexOf(component) !== -1)) {
            return new Promise((resolve) => {
                operationResponse.parsedBody = JSON.parse(text);
                resolve(operationResponse);
            }).catch(errorHandler);
        }
        else if (contentComponents.some((component) => xmlContentTypes.indexOf(component) !== -1)) {
            return parseXML(text, opts)
                .then((body) => {
                operationResponse.parsedBody = body;
                return operationResponse;
            })
                .catch(errorHandler);
        }
    }
    return Promise.resolve(operationResponse);
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
const DEFAULT_CLIENT_RETRY_COUNT = 3;
// intervals are in ms
const DEFAULT_CLIENT_RETRY_INTERVAL = 1000 * 30;
const DEFAULT_CLIENT_MAX_RETRY_INTERVAL = 1000 * 90;
const DEFAULT_CLIENT_MIN_RETRY_INTERVAL = 1000 * 3;
function isNumber(n) {
    return typeof n === "number";
}
/**
 * @internal
 * Determines if the operation should be retried.
 *
 * @param retryLimit - Specifies the max number of retries.
 * @param predicate - Initial chekck on whether to retry based on given responses or errors
 * @param retryData -  The retry data.
 * @returns True if the operation qualifies for a retry; false otherwise.
 */
function shouldRetry(retryLimit, predicate, retryData, response, error) {
    if (!predicate(response, error)) {
        return false;
    }
    return retryData.retryCount < retryLimit;
}
/**
 * @internal
 * Updates the retry data for the next attempt.
 *
 * @param retryOptions - specifies retry interval, and its lower bound and upper bound.
 * @param retryData -  The retry data.
 * @param err - The operation"s error, if any.
 */
function updateRetryData(retryOptions, retryData = { retryCount: 0, retryInterval: 0 }, err) {
    if (err) {
        if (retryData.error) {
            err.innerError = retryData.error;
        }
        retryData.error = err;
    }
    // Adjust retry count
    retryData.retryCount++;
    // Adjust retry interval
    let incrementDelta = Math.pow(2, retryData.retryCount - 1) - 1;
    const boundedRandDelta = retryOptions.retryInterval * 0.8 +
        Math.floor(Math.random() * (retryOptions.retryInterval * 0.4));
    incrementDelta *= boundedRandDelta;
    retryData.retryInterval = Math.min(retryOptions.minRetryInterval + incrementDelta, retryOptions.maxRetryInterval);
    return retryData;
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Helper TypeGuard that checks if the value is not null or undefined.
 * @param thing - Anything
 * @internal
 */
function isDefined(thing) {
    return typeof thing !== "undefined" && thing !== null;
}

// Copyright (c) Microsoft Corporation.
const StandardAbortMessage = "The operation was aborted.";
/**
 * A wrapper for setTimeout that resolves a promise after delayInMs milliseconds.
 * @param delayInMs - The number of milliseconds to be delayed.
 * @param value - The value to be resolved with after a timeout of t milliseconds.
 * @param options - The options for delay - currently abort options
 *   @param abortSignal - The abortSignal associated with containing operation.
 *   @param abortErrorMsg - The abort error message associated with containing operation.
 * @returns - Resolved promise
 */
function delay(delayInMs, value, options) {
    return new Promise((resolve, reject) => {
        let timer = undefined;
        let onAborted = undefined;
        const rejectOnAbort = () => {
            return reject(new abortController.AbortError((options === null || options === void 0 ? void 0 : options.abortErrorMsg) ? options === null || options === void 0 ? void 0 : options.abortErrorMsg : StandardAbortMessage));
        };
        const removeListeners = () => {
            if ((options === null || options === void 0 ? void 0 : options.abortSignal) && onAborted) {
                options.abortSignal.removeEventListener("abort", onAborted);
            }
        };
        onAborted = () => {
            if (isDefined(timer)) {
                clearTimeout(timer);
            }
            removeListeners();
            return rejectOnAbort();
        };
        if ((options === null || options === void 0 ? void 0 : options.abortSignal) && options.abortSignal.aborted) {
            return rejectOnAbort();
        }
        timer = setTimeout(() => {
            removeListeners();
            resolve(value);
        }, delayInMs);
        if (options === null || options === void 0 ? void 0 : options.abortSignal) {
            options.abortSignal.addEventListener("abort", onAborted);
        }
    });
}

// Copyright (c) Microsoft Corporation.
function exponentialRetryPolicy(retryCount, retryInterval, maxRetryInterval) {
    return {
        create: (nextPolicy, options) => {
            return new ExponentialRetryPolicy(nextPolicy, options, retryCount, retryInterval, maxRetryInterval);
        }
    };
}
(function (RetryMode) {
    RetryMode[RetryMode["Exponential"] = 0] = "Exponential";
})(exports.RetryMode || (exports.RetryMode = {}));
const DefaultRetryOptions = {
    maxRetries: DEFAULT_CLIENT_RETRY_COUNT,
    retryDelayInMs: DEFAULT_CLIENT_RETRY_INTERVAL,
    maxRetryDelayInMs: DEFAULT_CLIENT_MAX_RETRY_INTERVAL
};
/**
 * Instantiates a new "ExponentialRetryPolicyFilter" instance.
 */
class ExponentialRetryPolicy extends BaseRequestPolicy {
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

// Copyright (c) Microsoft Corporation.
function generateClientRequestIdPolicy(requestIdHeaderName = "x-ms-client-request-id") {
    return {
        create: (nextPolicy, options) => {
            return new GenerateClientRequestIdPolicy(nextPolicy, options, requestIdHeaderName);
        }
    };
}
class GenerateClientRequestIdPolicy extends BaseRequestPolicy {
    constructor(nextPolicy, options, _requestIdHeaderName) {
        super(nextPolicy, options);
        this._requestIdHeaderName = _requestIdHeaderName;
    }
    sendRequest(request) {
        if (!request.headers.contains(this._requestIdHeaderName)) {
            request.headers.set(this._requestIdHeaderName, request.requestId);
        }
        return this._nextPolicy.sendRequest(request);
    }
}

// Copyright (c) Microsoft Corporation.
function getDefaultUserAgentKey() {
    return Constants.HeaderConstants.USER_AGENT;
}
function getPlatformSpecificData() {
    const runtimeInfo = {
        key: "Node",
        value: process.version
    };
    const osInfo = {
        key: "OS",
        value: `(${os.arch()}-${os.type()}-${os.release()})`
    };
    return [runtimeInfo, osInfo];
}

// Copyright (c) Microsoft Corporation.
function getRuntimeInfo() {
    const msRestRuntime = {
        key: "core-http",
        value: Constants.coreHttpVersion
    };
    return [msRestRuntime];
}
function getUserAgentString(telemetryInfo, keySeparator = " ", valueSeparator = "/") {
    return telemetryInfo
        .map((info) => {
        const value = info.value ? `${valueSeparator}${info.value}` : "";
        return `${info.key}${value}`;
    })
        .join(keySeparator);
}
const getDefaultUserAgentHeaderName = getDefaultUserAgentKey;
function getDefaultUserAgentValue() {
    const runtimeInfo = getRuntimeInfo();
    const platformSpecificData = getPlatformSpecificData();
    const userAgent = getUserAgentString(runtimeInfo.concat(platformSpecificData));
    return userAgent;
}
function userAgentPolicy(userAgentData) {
    const key = !userAgentData || userAgentData.key === undefined || userAgentData.key === null
        ? getDefaultUserAgentKey()
        : userAgentData.key;
    const value = !userAgentData || userAgentData.value === undefined || userAgentData.value === null
        ? getDefaultUserAgentValue()
        : userAgentData.value;
    return {
        create: (nextPolicy, options) => {
            return new UserAgentPolicy(nextPolicy, options, key, value);
        }
    };
}
class UserAgentPolicy extends BaseRequestPolicy {
    constructor(_nextPolicy, _options, headerKey, headerValue) {
        super(_nextPolicy, _options);
        this._nextPolicy = _nextPolicy;
        this._options = _options;
        this.headerKey = headerKey;
        this.headerValue = headerValue;
    }
    sendRequest(request) {
        this.addUserAgentHeader(request);
        return this._nextPolicy.sendRequest(request);
    }
    addUserAgentHeader(request) {
        if (!request.headers) {
            request.headers = new HttpHeaders();
        }
        if (!request.headers.get(this.headerKey) && this.headerValue) {
            request.headers.set(this.headerKey, this.headerValue);
        }
    }
}

// Copyright (c) Microsoft Corporation.
/**
 * Methods that are allowed to follow redirects 301 and 302
 */
const allowedRedirect = ["GET", "HEAD"];
const DefaultRedirectOptions = {
    handleRedirects: true,
    maxRetries: 20
};
function redirectPolicy(maximumRetries = 20) {
    return {
        create: (nextPolicy, options) => {
            return new RedirectPolicy(nextPolicy, options, maximumRetries);
        }
    };
}
class RedirectPolicy extends BaseRequestPolicy {
    constructor(nextPolicy, options, maxRetries = 20) {
        super(nextPolicy, options);
        this.maxRetries = maxRetries;
    }
    sendRequest(request) {
        return this._nextPolicy
            .sendRequest(request)
            .then((response) => handleRedirect(this, response, 0));
    }
}
function handleRedirect(policy, response, currentRetries) {
    const { request, status } = response;
    const locationHeader = response.headers.get("location");
    if (locationHeader &&
        (status === 300 ||
            (status === 301 && allowedRedirect.includes(request.method)) ||
            (status === 302 && allowedRedirect.includes(request.method)) ||
            (status === 303 && request.method === "POST") ||
            status === 307) &&
        (!policy.maxRetries || currentRetries < policy.maxRetries)) {
        const builder = URLBuilder.parse(request.url);
        builder.setPath(locationHeader);
        request.url = builder.toString();
        // POST request with Status code 303 should be converted into a
        // redirected GET request if the redirect url is present in the location header
        if (status === 303) {
            request.method = "GET";
            delete request.body;
        }
        return policy._nextPolicy
            .sendRequest(request)
            .then((res) => handleRedirect(policy, res, currentRetries + 1));
    }
    return Promise.resolve(response);
}

// Copyright (c) Microsoft Corporation.
function rpRegistrationPolicy(retryTimeout = 30) {
    return {
        create: (nextPolicy, options) => {
            return new RPRegistrationPolicy(nextPolicy, options, retryTimeout);
        }
    };
}
class RPRegistrationPolicy extends BaseRequestPolicy {
    constructor(nextPolicy, options, _retryTimeout = 30) {
        super(nextPolicy, options);
        this._retryTimeout = _retryTimeout;
    }
    sendRequest(request) {
        return this._nextPolicy
            .sendRequest(request.clone())
            .then((response) => registerIfNeeded(this, request, response));
    }
}
function registerIfNeeded(policy, request, response) {
    if (response.status === 409) {
        const rpName = checkRPNotRegisteredError(response.bodyAsText);
        if (rpName) {
            const urlPrefix = extractSubscriptionUrl(request.url);
            return (registerRP(policy, urlPrefix, rpName, request)
                // Autoregistration of ${provider} failed for some reason. We will not return this error
                // instead will return the initial response with 409 status code back to the user.
                // do nothing here as we are returning the original response at the end of this method.
                .catch(() => false)
                .then((registrationStatus) => {
                if (registrationStatus) {
                    // Retry the original request. We have to change the x-ms-client-request-id
                    // otherwise Azure endpoint will return the initial 409 (cached) response.
                    request.headers.set("x-ms-client-request-id", generateUuid());
                    return policy._nextPolicy.sendRequest(request.clone());
                }
                return response;
            }));
        }
    }
    return Promise.resolve(response);
}
/**
 * Reuses the headers of the original request and url (if specified).
 * @param originalRequest - The original request
 * @param reuseUrlToo - Should the url from the original request be reused as well. Default false.
 * @returns A new request object with desired headers.
 */
function getRequestEssentials(originalRequest, reuseUrlToo = false) {
    const reqOptions = originalRequest.clone();
    if (reuseUrlToo) {
        reqOptions.url = originalRequest.url;
    }
    // We have to change the x-ms-client-request-id otherwise Azure endpoint
    // will return the initial 409 (cached) response.
    reqOptions.headers.set("x-ms-client-request-id", generateUuid());
    // Set content-type to application/json
    reqOptions.headers.set("Content-Type", "application/json; charset=utf-8");
    return reqOptions;
}
/**
 * Validates the error code and message associated with 409 response status code. If it matches to that of
 * RP not registered then it returns the name of the RP else returns undefined.
 * @param body - The response body received after making the original request.
 * @returns The name of the RP if condition is satisfied else undefined.
 */
function checkRPNotRegisteredError(body) {
    let result, responseBody;
    if (body) {
        try {
            responseBody = JSON.parse(body);
        }
        catch (err) {
            // do nothing;
        }
        if (responseBody &&
            responseBody.error &&
            responseBody.error.message &&
            responseBody.error.code &&
            responseBody.error.code === "MissingSubscriptionRegistration") {
            const matchRes = responseBody.error.message.match(/.*'(.*)'/i);
            if (matchRes) {
                result = matchRes.pop();
            }
        }
    }
    return result;
}
/**
 * Extracts the first part of the URL, just after subscription:
 * https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/
 * @param url - The original request url
 * @returns The url prefix as explained above.
 */
function extractSubscriptionUrl(url) {
    let result;
    const matchRes = url.match(/.*\/subscriptions\/[a-f0-9-]+\//gi);
    if (matchRes && matchRes[0]) {
        result = matchRes[0];
    }
    else {
        throw new Error(`Unable to extract subscriptionId from the given url - ${url}.`);
    }
    return result;
}
/**
 * Registers the given provider.
 * @param policy - The RPRegistrationPolicy this function is being called against.
 * @param urlPrefix - https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/
 * @param provider - The provider name to be registered.
 * @param originalRequest - The original request sent by the user that returned a 409 response
 * with a message that the provider is not registered.
 */
async function registerRP(policy, urlPrefix, provider, originalRequest) {
    const postUrl = `${urlPrefix}providers/${provider}/register?api-version=2016-02-01`;
    const getUrl = `${urlPrefix}providers/${provider}?api-version=2016-02-01`;
    const reqOptions = getRequestEssentials(originalRequest);
    reqOptions.method = "POST";
    reqOptions.url = postUrl;
    const response = await policy._nextPolicy.sendRequest(reqOptions);
    if (response.status !== 200) {
        throw new Error(`Autoregistration of ${provider} failed. Please try registering manually.`);
    }
    return getRegistrationStatus(policy, getUrl, originalRequest);
}
/**
 * Polls the registration status of the provider that was registered. Polling happens at an interval of 30 seconds.
 * Polling will happen till the registrationState property of the response body is "Registered".
 * @param policy - The RPRegistrationPolicy this function is being called against.
 * @param url - The request url for polling
 * @param originalRequest - The original request sent by the user that returned a 409 response
 * with a message that the provider is not registered.
 * @returns True if RP Registration is successful.
 */
async function getRegistrationStatus(policy, url, originalRequest) {
    const reqOptions = getRequestEssentials(originalRequest);
    reqOptions.url = url;
    reqOptions.method = "GET";
    const res = await policy._nextPolicy.sendRequest(reqOptions);
    const obj = res.parsedBody;
    if (res.parsedBody && obj.registrationState && obj.registrationState === "Registered") {
        return true;
    }
    else {
        await delay(policy._retryTimeout * 1000);
        return getRegistrationStatus(policy, url, originalRequest);
    }
}

// Copyright (c) Microsoft Corporation.
// Default options for the cycler if none are provided
const DEFAULT_CYCLER_OPTIONS = {
    forcedRefreshWindowInMs: 1000,
    retryIntervalInMs: 3000,
    refreshWindowInMs: 1000 * 60 * 2 // Start refreshing 2m before expiry
};
/**
 * Converts an an unreliable access token getter (which may resolve with null)
 * into an AccessTokenGetter by retrying the unreliable getter in a regular
 * interval.
 *
 * @param getAccessToken - a function that produces a promise of an access
 * token that may fail by returning null
 * @param retryIntervalInMs - the time (in milliseconds) to wait between retry
 * attempts
 * @param timeoutInMs - the timestamp after which the refresh attempt will fail,
 * throwing an exception
 * @returns - a promise that, if it resolves, will resolve with an access token
 */
async function beginRefresh(getAccessToken, retryIntervalInMs, timeoutInMs) {
    // This wrapper handles exceptions gracefully as long as we haven't exceeded
    // the timeout.
    async function tryGetAccessToken() {
        if (Date.now() < timeoutInMs) {
            try {
                return await getAccessToken();
            }
            catch (_a) {
                return null;
            }
        }
        else {
            const finalToken = await getAccessToken();
            // Timeout is up, so throw if it's still null
            if (finalToken === null) {
                throw new Error("Failed to refresh access token.");
            }
            return finalToken;
        }
    }
    let token = await tryGetAccessToken();
    while (token === null) {
        await delay(retryIntervalInMs);
        token = await tryGetAccessToken();
    }
    return token;
}
/**
 * Creates a token cycler from a credential, scopes, and optional settings.
 *
 * A token cycler represents a way to reliably retrieve a valid access token
 * from a TokenCredential. It will handle initializing the token, refreshing it
 * when it nears expiration, and synchronizes refresh attempts to avoid
 * concurrency hazards.
 *
 * @param credential - the underlying TokenCredential that provides the access
 * token
 * @param scopes - the scopes to request authorization for
 * @param tokenCyclerOptions - optionally override default settings for the cycler
 *
 * @returns - a function that reliably produces a valid access token
 */
function createTokenCycler(credential, scopes, tokenCyclerOptions) {
    let refreshWorker = null;
    let token = null;
    const options = Object.assign(Object.assign({}, DEFAULT_CYCLER_OPTIONS), tokenCyclerOptions);
    /**
     * This little holder defines several predicates that we use to construct
     * the rules of refreshing the token.
     */
    const cycler = {
        /**
         * Produces true if a refresh job is currently in progress.
         */
        get isRefreshing() {
            return refreshWorker !== null;
        },
        /**
         * Produces true if the cycler SHOULD refresh (we are within the refresh
         * window and not already refreshing)
         */
        get shouldRefresh() {
            var _a;
            return (!cycler.isRefreshing &&
                ((_a = token === null || token === void 0 ? void 0 : token.expiresOnTimestamp) !== null && _a !== void 0 ? _a : 0) - options.refreshWindowInMs < Date.now());
        },
        /**
         * Produces true if the cycler MUST refresh (null or nearly-expired
         * token).
         */
        get mustRefresh() {
            return (token === null || token.expiresOnTimestamp - options.forcedRefreshWindowInMs < Date.now());
        }
    };
    /**
     * Starts a refresh job or returns the existing job if one is already
     * running.
     */
    function refresh(getTokenOptions) {
        var _a;
        if (!cycler.isRefreshing) {
            // We bind `scopes` here to avoid passing it around a lot
            const tryGetAccessToken = () => credential.getToken(scopes, getTokenOptions);
            // Take advantage of promise chaining to insert an assignment to `token`
            // before the refresh can be considered done.
            refreshWorker = beginRefresh(tryGetAccessToken, options.retryIntervalInMs, 
            // If we don't have a token, then we should timeout immediately
            (_a = token === null || token === void 0 ? void 0 : token.expiresOnTimestamp) !== null && _a !== void 0 ? _a : Date.now())
                .then((_token) => {
                refreshWorker = null;
                token = _token;
                return token;
            })
                .catch((reason) => {
                // We also should reset the refresher if we enter a failed state.  All
                // existing awaiters will throw, but subsequent requests will start a
                // new retry chain.
                refreshWorker = null;
                token = null;
                throw reason;
            });
        }
        return refreshWorker;
    }
    return async (tokenOptions) => {
        //
        // Simple rules:
        // - If we MUST refresh, then return the refresh task, blocking
        //   the pipeline until a token is available.
        // - If we SHOULD refresh, then run refresh but don't return it
        //   (we can still use the cached token).
        // - Return the token, since it's fine if we didn't return in
        //   step 1.
        //
        if (cycler.mustRefresh)
            return refresh(tokenOptions);
        if (cycler.shouldRefresh) {
            refresh(tokenOptions);
        }
        return token;
    };
}
// #endregion
/**
 * Creates a new factory for a RequestPolicy that applies a bearer token to
 * the requests' `Authorization` headers.
 *
 * @param credential - The TokenCredential implementation that can supply the bearer token.
 * @param scopes - The scopes for which the bearer token applies.
 */
function bearerTokenAuthenticationPolicy(credential, scopes) {
    // This simple function encapsulates the entire process of reliably retrieving the token
    const getToken = createTokenCycler(credential, scopes /* , options */);
    class BearerTokenAuthenticationPolicy extends BaseRequestPolicy {
        constructor(nextPolicy, options) {
            super(nextPolicy, options);
        }
        async sendRequest(webResource) {
            if (!webResource.url.toLowerCase().startsWith("https://")) {
                throw new Error("Bearer token authentication is not permitted for non-TLS protected (non-https) URLs.");
            }
            const { token } = await getToken({
                abortSignal: webResource.abortSignal,
                tracingOptions: {
                    tracingContext: webResource.tracingContext
                }
            });
            webResource.headers.set(Constants.HeaderConstants.AUTHORIZATION, `Bearer ${token}`);
            return this._nextPolicy.sendRequest(webResource);
        }
    }
    return {
        create: (nextPolicy, options) => {
            return new BearerTokenAuthenticationPolicy(nextPolicy, options);
        }
    };
}

// Copyright (c) Microsoft Corporation.
function systemErrorRetryPolicy(retryCount, retryInterval, minRetryInterval, maxRetryInterval) {
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
class SystemErrorRetryPolicy extends BaseRequestPolicy {
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
            .catch((error) => retry$1(this, request, error.response, error));
    }
}
async function retry$1(policy, request, operationResponse, err, retryData) {
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
            return retry$1(policy, request, operationResponse, nestedErr, retryData);
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

// Copyright (c) Microsoft Corporation.
(function (QueryCollectionFormat) {
    QueryCollectionFormat["Csv"] = ",";
    QueryCollectionFormat["Ssv"] = " ";
    QueryCollectionFormat["Tsv"] = "\t";
    QueryCollectionFormat["Pipes"] = "|";
    QueryCollectionFormat["Multi"] = "Multi";
})(exports.QueryCollectionFormat || (exports.QueryCollectionFormat = {}));

// Copyright (c) Microsoft Corporation.
/**
 * Stores the patterns specified in NO_PROXY environment variable.
 * @internal
 */
const globalNoProxyList = [];
let noProxyListLoaded = false;
/** A cache of whether a host should bypass the proxy. */
const globalBypassedMap = new Map();
function loadEnvironmentProxyValue() {
    if (!process) {
        return undefined;
    }
    const httpsProxy = getEnvironmentValue(Constants.HTTPS_PROXY);
    const allProxy = getEnvironmentValue(Constants.ALL_PROXY);
    const httpProxy = getEnvironmentValue(Constants.HTTP_PROXY);
    return httpsProxy || allProxy || httpProxy;
}
/**
 * Check whether the host of a given `uri` matches any pattern in the no proxy list.
 * If there's a match, any request sent to the same host shouldn't have the proxy settings set.
 * This implementation is a port of https://github.com/Azure/azure-sdk-for-net/blob/8cca811371159e527159c7eb65602477898683e2/sdk/core/Azure.Core/src/Pipeline/Internal/HttpEnvironmentProxy.cs#L210
 */
function isBypassed(uri, noProxyList, bypassedMap) {
    if (noProxyList.length === 0) {
        return false;
    }
    const host = URLBuilder.parse(uri).getHost();
    if (bypassedMap === null || bypassedMap === void 0 ? void 0 : bypassedMap.has(host)) {
        return bypassedMap.get(host);
    }
    let isBypassedFlag = false;
    for (const pattern of noProxyList) {
        if (pattern[0] === ".") {
            // This should match either domain it self or any subdomain or host
            // .foo.com will match foo.com it self or *.foo.com
            if (host.endsWith(pattern)) {
                isBypassedFlag = true;
            }
            else {
                if (host.length === pattern.length - 1 && host === pattern.slice(1)) {
                    isBypassedFlag = true;
                }
            }
        }
        else {
            if (host === pattern) {
                isBypassedFlag = true;
            }
        }
    }
    bypassedMap === null || bypassedMap === void 0 ? void 0 : bypassedMap.set(host, isBypassedFlag);
    return isBypassedFlag;
}
/**
 * @internal
 */
function loadNoProxy() {
    const noProxy = getEnvironmentValue(Constants.NO_PROXY);
    noProxyListLoaded = true;
    if (noProxy) {
        return noProxy
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item.length);
    }
    return [];
}
function getDefaultProxySettings(proxyUrl) {
    if (!proxyUrl) {
        proxyUrl = loadEnvironmentProxyValue();
        if (!proxyUrl) {
            return undefined;
        }
    }
    const { username, password, urlWithoutAuth } = extractAuthFromUrl(proxyUrl);
    const parsedUrl = URLBuilder.parse(urlWithoutAuth);
    const schema = parsedUrl.getScheme() ? parsedUrl.getScheme() + "://" : "";
    return {
        host: schema + parsedUrl.getHost(),
        port: Number.parseInt(parsedUrl.getPort() || "80"),
        username,
        password
    };
}
/**
 * A policy that allows one to apply proxy settings to all requests.
 * If not passed static settings, they will be retrieved from the HTTPS_PROXY
 * or HTTP_PROXY environment variables.
 * @param proxySettings - ProxySettings to use on each request.
 * @param options - additional settings, for example, custom NO_PROXY patterns
 */
function proxyPolicy(proxySettings, options) {
    if (!proxySettings) {
        proxySettings = getDefaultProxySettings();
    }
    if (!noProxyListLoaded) {
        globalNoProxyList.push(...loadNoProxy());
    }
    return {
        create: (nextPolicy, requestPolicyOptions) => {
            return new ProxyPolicy(nextPolicy, requestPolicyOptions, proxySettings, options === null || options === void 0 ? void 0 : options.customNoProxyList);
        }
    };
}
function extractAuthFromUrl(url) {
    const atIndex = url.indexOf("@");
    if (atIndex === -1) {
        return { urlWithoutAuth: url };
    }
    const schemeIndex = url.indexOf("://");
    const authStart = schemeIndex !== -1 ? schemeIndex + 3 : 0;
    const auth = url.substring(authStart, atIndex);
    const colonIndex = auth.indexOf(":");
    const hasPassword = colonIndex !== -1;
    const username = hasPassword ? auth.substring(0, colonIndex) : auth;
    const password = hasPassword ? auth.substring(colonIndex + 1) : undefined;
    const urlWithoutAuth = url.substring(0, authStart) + url.substring(atIndex + 1);
    return {
        username,
        password,
        urlWithoutAuth
    };
}
class ProxyPolicy extends BaseRequestPolicy {
    constructor(nextPolicy, options, proxySettings, customNoProxyList) {
        super(nextPolicy, options);
        this.proxySettings = proxySettings;
        this.customNoProxyList = customNoProxyList;
    }
    sendRequest(request) {
        var _a;
        if (!request.proxySettings &&
            !isBypassed(request.url, (_a = this.customNoProxyList) !== null && _a !== void 0 ? _a : globalNoProxyList, this.customNoProxyList ? undefined : globalBypassedMap)) {
            request.proxySettings = this.proxySettings;
        }
        return this._nextPolicy.sendRequest(request);
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Maximum number of retries for the throttling retry policy
 */
const DEFAULT_CLIENT_MAX_RETRY_COUNT = 3;

// Copyright (c) Microsoft Corporation.
const StatusCodes = Constants.HttpConstants.StatusCodes;
function throttlingRetryPolicy() {
    return {
        create: (nextPolicy, options) => {
            return new ThrottlingRetryPolicy(nextPolicy, options);
        }
    };
}
const StandardAbortMessage$1 = "The operation was aborted.";
/**
 * To learn more, please refer to
 * https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-manager-request-limits,
 * https://docs.microsoft.com/en-us/azure/azure-subscription-service-limits and
 * https://docs.microsoft.com/en-us/azure/virtual-machines/troubleshooting/troubleshooting-throttling-errors
 */
class ThrottlingRetryPolicy extends BaseRequestPolicy {
    constructor(nextPolicy, options, _handleResponse) {
        super(nextPolicy, options);
        this.numberOfRetries = 0;
        this._handleResponse = _handleResponse || this._defaultResponseHandler;
    }
    async sendRequest(httpRequest) {
        const response = await this._nextPolicy.sendRequest(httpRequest.clone());
        if (response.status !== StatusCodes.TooManyRequests &&
            response.status !== StatusCodes.ServiceUnavailable) {
            return response;
        }
        else {
            return this._handleResponse(httpRequest, response);
        }
    }
    async _defaultResponseHandler(httpRequest, httpResponse) {
        var _a;
        const retryAfterHeader = httpResponse.headers.get(Constants.HeaderConstants.RETRY_AFTER);
        if (retryAfterHeader) {
            const delayInMs = ThrottlingRetryPolicy.parseRetryAfterHeader(retryAfterHeader);
            if (delayInMs) {
                this.numberOfRetries += 1;
                await delay(delayInMs, undefined, {
                    abortSignal: httpRequest.abortSignal,
                    abortErrorMsg: StandardAbortMessage$1
                });
                if ((_a = httpRequest.abortSignal) === null || _a === void 0 ? void 0 : _a.aborted) {
                    throw new abortController.AbortError(StandardAbortMessage$1);
                }
                if (this.numberOfRetries < DEFAULT_CLIENT_MAX_RETRY_COUNT) {
                    return this.sendRequest(httpRequest);
                }
                else {
                    return this._nextPolicy.sendRequest(httpRequest);
                }
            }
        }
        return httpResponse;
    }
    static parseRetryAfterHeader(headerValue) {
        const retryAfterInSeconds = Number(headerValue);
        if (Number.isNaN(retryAfterInSeconds)) {
            return ThrottlingRetryPolicy.parseDateRetryAfterHeader(headerValue);
        }
        else {
            return retryAfterInSeconds * 1000;
        }
    }
    static parseDateRetryAfterHeader(headerValue) {
        try {
            const now = Date.now();
            const date = Date.parse(headerValue);
            const diff = date - now;
            return Number.isNaN(diff) ? undefined : diff;
        }
        catch (error) {
            return undefined;
        }
    }
}

// Copyright (c) Microsoft Corporation.
function signingPolicy(authenticationProvider) {
    return {
        create: (nextPolicy, options) => {
            return new SigningPolicy(nextPolicy, options, authenticationProvider);
        }
    };
}
class SigningPolicy extends BaseRequestPolicy {
    constructor(nextPolicy, options, authenticationProvider) {
        super(nextPolicy, options);
        this.authenticationProvider = authenticationProvider;
    }
    signRequest(request) {
        return this.authenticationProvider.signRequest(request);
    }
    sendRequest(request) {
        return this.signRequest(request).then((nextRequest) => this._nextPolicy.sendRequest(nextRequest));
    }
}

// Copyright (c) Microsoft Corporation.
const DefaultKeepAliveOptions = {
    enable: true
};
function keepAlivePolicy(keepAliveOptions) {
    return {
        create: (nextPolicy, options) => {
            return new KeepAlivePolicy(nextPolicy, options, keepAliveOptions || DefaultKeepAliveOptions);
        }
    };
}
/**
 * KeepAlivePolicy is a policy used to control keep alive settings for every request.
 */
class KeepAlivePolicy extends BaseRequestPolicy {
    /**
     * Creates an instance of KeepAlivePolicy.
     *
     * @param nextPolicy -
     * @param options -
     * @param keepAliveOptions -
     */
    constructor(nextPolicy, options, keepAliveOptions) {
        super(nextPolicy, options);
        this.keepAliveOptions = keepAliveOptions;
    }
    /**
     * Sends out request.
     *
     * @param request -
     * @returns
     */
    async sendRequest(request) {
        request.keepAlive = this.keepAliveOptions.enable;
        return this._nextPolicy.sendRequest(request);
    }
}

// Copyright (c) Microsoft Corporation.
const createSpan = coreTracing.createSpanFunction({
    packagePrefix: "",
    namespace: ""
});
function tracingPolicy(tracingOptions = {}) {
    return {
        create(nextPolicy, options) {
            return new TracingPolicy(nextPolicy, options, tracingOptions);
        }
    };
}
class TracingPolicy extends BaseRequestPolicy {
    constructor(nextPolicy, options, tracingOptions) {
        super(nextPolicy, options);
        this.userAgent = tracingOptions.userAgent;
    }
    async sendRequest(request) {
        if (!request.tracingContext) {
            return this._nextPolicy.sendRequest(request);
        }
        const span = this.tryCreateSpan(request);
        if (!span) {
            return this._nextPolicy.sendRequest(request);
        }
        try {
            const response = await this._nextPolicy.sendRequest(request);
            this.tryProcessResponse(span, response);
            return response;
        }
        catch (err) {
            this.tryProcessError(span, err);
            throw err;
        }
    }
    tryCreateSpan(request) {
        var _a;
        try {
            const path = URLBuilder.parse(request.url).getPath() || "/";
            // Passing spanOptions as part of tracingOptions to maintain compatibility @azure/core-tracing@preview.13 and earlier.
            // We can pass this as a separate parameter once we upgrade to the latest core-tracing.
            const { span } = createSpan(path, {
                tracingOptions: {
                    spanOptions: Object.assign(Object.assign({}, request.spanOptions), { kind: coreTracing.SpanKind.CLIENT }),
                    tracingContext: request.tracingContext
                }
            });
            // If the span is not recording, don't do any more work.
            if (!span.isRecording()) {
                span.end();
                return undefined;
            }
            const namespaceFromContext = (_a = request.tracingContext) === null || _a === void 0 ? void 0 : _a.getValue(Symbol.for("az.namespace"));
            if (typeof namespaceFromContext === "string") {
                span.setAttribute("az.namespace", namespaceFromContext);
            }
            span.setAttributes({
                "http.method": request.method,
                "http.url": request.url,
                requestId: request.requestId
            });
            if (this.userAgent) {
                span.setAttribute("http.user_agent", this.userAgent);
            }
            // set headers
            const spanContext = span.spanContext();
            const traceParentHeader = coreTracing.getTraceParentHeader(spanContext);
            if (traceParentHeader && coreTracing.isSpanContextValid(spanContext)) {
                request.headers.set("traceparent", traceParentHeader);
                const traceState = spanContext.traceState && spanContext.traceState.serialize();
                // if tracestate is set, traceparent MUST be set, so only set tracestate after traceparent
                if (traceState) {
                    request.headers.set("tracestate", traceState);
                }
            }
            return span;
        }
        catch (error) {
            logger.warning(`Skipping creating a tracing span due to an error: ${error.message}`);
            return undefined;
        }
    }
    tryProcessError(span, err) {
        try {
            span.setStatus({
                code: coreTracing.SpanStatusCode.ERROR,
                message: err.message
            });
            if (err.statusCode) {
                span.setAttribute("http.status_code", err.statusCode);
            }
            span.end();
        }
        catch (error) {
            logger.warning(`Skipping tracing span processing due to an error: ${error.message}`);
        }
    }
    tryProcessResponse(span, response) {
        try {
            span.setAttribute("http.status_code", response.status);
            const serviceRequestId = response.headers.get("x-ms-request-id");
            if (serviceRequestId) {
                span.setAttribute("serviceRequestId", serviceRequestId);
            }
            span.setStatus({
                code: coreTracing.SpanStatusCode.OK
            });
            span.end();
        }
        catch (error) {
            logger.warning(`Skipping tracing span processing due to an error: ${error.message}`);
        }
    }
}

// Copyright (c) Microsoft Corporation.
/**
 * Returns a request policy factory that can be used to create an instance of
 * {@link DisableResponseDecompressionPolicy}.
 */
function disableResponseDecompressionPolicy() {
    return {
        create: (nextPolicy, options) => {
            return new DisableResponseDecompressionPolicy(nextPolicy, options);
        }
    };
}
/**
 * A policy to disable response decompression according to Accept-Encoding header
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding
 */
class DisableResponseDecompressionPolicy extends BaseRequestPolicy {
    /**
     * Creates an instance of DisableResponseDecompressionPolicy.
     *
     * @param nextPolicy -
     * @param options -
     */
    // The parent constructor is protected.
    /* eslint-disable-next-line @typescript-eslint/no-useless-constructor */
    constructor(nextPolicy, options) {
        super(nextPolicy, options);
    }
    /**
     * Sends out request.
     *
     * @param request -
     * @returns
     */
    async sendRequest(request) {
        request.decompressResponse = false;
        return this._nextPolicy.sendRequest(request);
    }
}

// Copyright (c) Microsoft Corporation.
function ndJsonPolicy() {
    return {
        create: (nextPolicy, options) => {
            return new NdJsonPolicy(nextPolicy, options);
        }
    };
}
/**
 * NdJsonPolicy that formats a JSON array as newline-delimited JSON
 */
class NdJsonPolicy extends BaseRequestPolicy {
    /**
     * Creates an instance of KeepAlivePolicy.
     */
    constructor(nextPolicy, options) {
        super(nextPolicy, options);
    }
    /**
     * Sends a request.
     */
    async sendRequest(request) {
        // There currently isn't a good way to bypass the serializer
        if (typeof request.body === "string" && request.body.startsWith("[")) {
            const body = JSON.parse(request.body);
            if (Array.isArray(body)) {
                request.body = body.map((item) => JSON.stringify(item) + "\n").join("");
            }
        }
        return this._nextPolicy.sendRequest(request);
    }
}

// Copyright (c) Microsoft Corporation.
let cachedHttpClient;
function getCachedDefaultHttpClient() {
    if (!cachedHttpClient) {
        cachedHttpClient = new NodeFetchHttpClient();
    }
    return cachedHttpClient;
}

// Copyright (c) Microsoft Corporation.
/**
 * ServiceClient sends service requests and receives responses.
 */
class ServiceClient {
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
            if (coreAuth.isTokenCredential(credentials)) {
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
                            if (queryParameter.collectionFormat === exports.QueryCollectionFormat.Multi) {
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
                            else if (queryParameter.collectionFormat === exports.QueryCollectionFormat.Ssv ||
                                queryParameter.collectionFormat === exports.QueryCollectionFormat.Tsv) {
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
                            queryParameter.collectionFormat !== exports.QueryCollectionFormat.Multi &&
                            queryParameter.collectionFormat !== exports.QueryCollectionFormat.Ssv &&
                            queryParameter.collectionFormat !== exports.QueryCollectionFormat.Tsv) {
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
function serializeRequestBody(serviceClient, httpRequest, operationArguments, operationSpec) {
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
                        httpRequest.body = stringifyXML(prepareXMLRootList(value, xmlElementName || xmlName || serializedName, xmlnsKey, xmlNamespace), {
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
function createPipelineFromOptions(pipelineOptions, authPolicyFactory) {
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
function getOperationArgumentValueFromParameter(serviceClient, operationArguments, parameter, serializer) {
    return getOperationArgumentValueFromParameterPath(serviceClient, operationArguments, parameter.parameterPath, parameter.mapper, serializer);
}
function getOperationArgumentValueFromParameterPath(serviceClient, operationArguments, parameterPath, parameterMapper, serializer) {
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
function flattenResponse(_response, responseSpec) {
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
        isPrimitiveType(_response.parsedBody)) {
        // primitive body types and HEAD booleans
        return addOperationResponse(Object.assign(Object.assign({}, parsedHeaders), { body: _response.parsedBody }));
    }
    return addOperationResponse(Object.assign(Object.assign({}, parsedHeaders), _response.parsedBody));
}
function getCredentialScopes(options, baseUri) {
    if (options === null || options === void 0 ? void 0 : options.credentialScopes) {
        const scopes = options.credentialScopes;
        return Array.isArray(scopes)
            ? scopes.map((scope) => new url.URL(scope).toString())
            : new url.URL(scopes).toString();
    }
    if (baseUri) {
        return `${baseUri}/.default`;
    }
    return undefined;
}

// Copyright (c) Microsoft Corporation.
/**
 * This function is only here for compatibility. Use createSpanFunction in core-tracing.
 *
 * @deprecated This function is only here for compatibility. Use createSpanFunction in core-tracing.
 * @hidden

 * @param spanConfig - The name of the operation being performed.
 * @param tracingOptions - The options for the underlying http request.
 */
function createSpanFunction(args) {
    return coreTracing.createSpanFunction(args);
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Defines the default token refresh buffer duration.
 */
const TokenRefreshBufferMs = 2 * 60 * 1000; // 2 Minutes
/**
 * Provides an {@link AccessTokenCache} implementation which clears
 * the cached {@link AccessToken}'s after the expiresOnTimestamp has
 * passed.
 *
 * @deprecated No longer used in the bearer authorization policy.
 */
class ExpiringAccessTokenCache {
    /**
     * Constructs an instance of {@link ExpiringAccessTokenCache} with
     * an optional expiration buffer time.
     */
    constructor(tokenRefreshBufferMs = TokenRefreshBufferMs) {
        this.cachedToken = undefined;
        this.tokenRefreshBufferMs = tokenRefreshBufferMs;
    }
    setCachedToken(accessToken) {
        this.cachedToken = accessToken;
    }
    getCachedToken() {
        if (this.cachedToken &&
            Date.now() + this.tokenRefreshBufferMs >= this.cachedToken.expiresOnTimestamp) {
            this.cachedToken = undefined;
        }
        return this.cachedToken;
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Helps the core-http token authentication policies with requesting a new token if we're not currently waiting for a new token.
 *
 * @deprecated No longer used in the bearer authorization policy.
 */
class AccessTokenRefresher {
    constructor(credential, scopes, requiredMillisecondsBeforeNewRefresh = 30000) {
        this.credential = credential;
        this.scopes = scopes;
        this.requiredMillisecondsBeforeNewRefresh = requiredMillisecondsBeforeNewRefresh;
        this.lastCalled = 0;
    }
    /**
     * Returns true if the required milliseconds(defaulted to 30000) have been passed signifying
     * that we are ready for a new refresh.
     */
    isReady() {
        // We're only ready for a new refresh if the required milliseconds have passed.
        return (!this.lastCalled || Date.now() - this.lastCalled > this.requiredMillisecondsBeforeNewRefresh);
    }
    /**
     * Stores the time in which it is called,
     * then requests a new token,
     * then sets this.promise to undefined,
     * then returns the token.
     */
    async getToken(options) {
        this.lastCalled = Date.now();
        const token = await this.credential.getToken(this.scopes, options);
        this.promise = undefined;
        return token || undefined;
    }
    /**
     * Requests a new token if we're not currently waiting for a new token.
     * Returns null if the required time between each call hasn't been reached.
     */
    refresh(options) {
        if (!this.promise) {
            this.promise = this.getToken(options);
        }
        return this.promise;
    }
}

// Copyright (c) Microsoft Corporation.
const HeaderConstants = Constants.HeaderConstants;
const DEFAULT_AUTHORIZATION_SCHEME = "Basic";
class BasicAuthenticationCredentials {
    /**
     * Creates a new BasicAuthenticationCredentials object.
     *
     * @param userName - User name.
     * @param password - Password.
     * @param authorizationScheme - The authorization scheme.
     */
    constructor(userName, password, authorizationScheme = DEFAULT_AUTHORIZATION_SCHEME) {
        this.authorizationScheme = DEFAULT_AUTHORIZATION_SCHEME;
        if (userName === null || userName === undefined || typeof userName.valueOf() !== "string") {
            throw new Error("userName cannot be null or undefined and must be of type string.");
        }
        if (password === null || password === undefined || typeof password.valueOf() !== "string") {
            throw new Error("password cannot be null or undefined and must be of type string.");
        }
        this.userName = userName;
        this.password = password;
        this.authorizationScheme = authorizationScheme;
    }
    /**
     * Signs a request with the Authentication header.
     *
     * @param webResource - The WebResourceLike to be signed.
     * @returns The signed request object.
     */
    signRequest(webResource) {
        const credentials = `${this.userName}:${this.password}`;
        const encodedCredentials = `${this.authorizationScheme} ${encodeString(credentials)}`;
        if (!webResource.headers)
            webResource.headers = new HttpHeaders();
        webResource.headers.set(HeaderConstants.AUTHORIZATION, encodedCredentials);
        return Promise.resolve(webResource);
    }
}

// Copyright (c) Microsoft Corporation.
/**
 * Authenticates to a service using an API key.
 */
class ApiKeyCredentials {
    /**
     * @param options - Specifies the options to be provided for auth. Either header or query needs to be provided.
     */
    constructor(options) {
        if (!options || (options && !options.inHeader && !options.inQuery)) {
            throw new Error(`options cannot be null or undefined. Either "inHeader" or "inQuery" property of the options object needs to be provided.`);
        }
        this.inHeader = options.inHeader;
        this.inQuery = options.inQuery;
    }
    /**
     * Signs a request with the values provided in the inHeader and inQuery parameter.
     *
     * @param webResource - The WebResourceLike to be signed.
     * @returns The signed request object.
     */
    signRequest(webResource) {
        if (!webResource) {
            return Promise.reject(new Error(`webResource cannot be null or undefined and must be of type "object".`));
        }
        if (this.inHeader) {
            if (!webResource.headers) {
                webResource.headers = new HttpHeaders();
            }
            for (const headerName in this.inHeader) {
                webResource.headers.set(headerName, this.inHeader[headerName]);
            }
        }
        if (this.inQuery) {
            if (!webResource.url) {
                return Promise.reject(new Error(`url cannot be null in the request object.`));
            }
            if (webResource.url.indexOf("?") < 0) {
                webResource.url += "?";
            }
            for (const key in this.inQuery) {
                if (!webResource.url.endsWith("?")) {
                    webResource.url += "&";
                }
                webResource.url += `${key}=${this.inQuery[key]}`;
            }
        }
        return Promise.resolve(webResource);
    }
}

// Copyright (c) Microsoft Corporation.
class TopicCredentials extends ApiKeyCredentials {
    /**
     * Creates a new EventGrid TopicCredentials object.
     *
     * @param topicKey - The EventGrid topic key
     */
    constructor(topicKey) {
        if (!topicKey || (topicKey && typeof topicKey !== "string")) {
            throw new Error("topicKey cannot be null or undefined and must be of type string.");
        }
        const options = {
            inHeader: {
                "aeg-sas-key": topicKey
            }
        };
        super(options);
    }
}

Object.defineProperty(exports, 'isTokenCredential', {
    enumerable: true,
    get: function () {
        return coreAuth.isTokenCredential;
    }
});
exports.AccessTokenRefresher = AccessTokenRefresher;
exports.ApiKeyCredentials = ApiKeyCredentials;
exports.BaseRequestPolicy = BaseRequestPolicy;
exports.BasicAuthenticationCredentials = BasicAuthenticationCredentials;
exports.Constants = Constants;
exports.DefaultHttpClient = NodeFetchHttpClient;
exports.ExpiringAccessTokenCache = ExpiringAccessTokenCache;
exports.HttpHeaders = HttpHeaders;
exports.MapperType = MapperType;
exports.RequestPolicyOptions = RequestPolicyOptions;
exports.RestError = RestError;
exports.Serializer = Serializer;
exports.ServiceClient = ServiceClient;
exports.TopicCredentials = TopicCredentials;
exports.URLBuilder = URLBuilder;
exports.URLQuery = URLQuery;
exports.WebResource = WebResource;
exports.XML_ATTRKEY = XML_ATTRKEY;
exports.XML_CHARKEY = XML_CHARKEY;
exports.applyMixins = applyMixins;
exports.bearerTokenAuthenticationPolicy = bearerTokenAuthenticationPolicy;
exports.createPipelineFromOptions = createPipelineFromOptions;
exports.createSpanFunction = createSpanFunction;
exports.delay = delay;
exports.deserializationPolicy = deserializationPolicy;
exports.deserializeResponseBody = deserializeResponseBody;
exports.disableResponseDecompressionPolicy = disableResponseDecompressionPolicy;
exports.encodeUri = encodeUri;
exports.executePromisesSequentially = executePromisesSequentially;
exports.exponentialRetryPolicy = exponentialRetryPolicy;
exports.flattenResponse = flattenResponse;
exports.generateClientRequestIdPolicy = generateClientRequestIdPolicy;
exports.generateUuid = generateUuid;
exports.getDefaultProxySettings = getDefaultProxySettings;
exports.getDefaultUserAgentValue = getDefaultUserAgentValue;
exports.isDuration = isDuration;
exports.isNode = isNode;
exports.isValidUuid = isValidUuid;
exports.keepAlivePolicy = keepAlivePolicy;
exports.logPolicy = logPolicy;
exports.operationOptionsToRequestOptionsBase = operationOptionsToRequestOptionsBase;
exports.parseXML = parseXML;
exports.promiseToCallback = promiseToCallback;
exports.promiseToServiceCallback = promiseToServiceCallback;
exports.proxyPolicy = proxyPolicy;
exports.redirectPolicy = redirectPolicy;
exports.serializeObject = serializeObject;
exports.signingPolicy = signingPolicy;
exports.stringifyXML = stringifyXML;
exports.stripRequest = stripRequest;
exports.stripResponse = stripResponse;
exports.systemErrorRetryPolicy = systemErrorRetryPolicy;
exports.throttlingRetryPolicy = throttlingRetryPolicy;
exports.tracingPolicy = tracingPolicy;
exports.userAgentPolicy = userAgentPolicy;
//# sourceMappingURL=index.js.map
