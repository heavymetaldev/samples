// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { XML_ATTRKEY, XML_CHARKEY } from "./serializer.common";
if (!self.document || !self.DOMParser || !self.Node || !self.XMLSerializer) {
    throw new Error(`This library depends on the following DOM objects: ["document", "DOMParser", "Node", "XMLSerializer"] to parse XML, but some of these are undefined. You may provide a polyfill to make these globally available in order to support your environment. For more information, please refer to https://aka.ms/azsdk/js/web-workers. `);
}
const doc = document.implementation.createDocument(null, null, null);
const parser = new DOMParser();
export function parseXML(str, opts = {}) {
    var _a, _b, _c;
    try {
        const updatedOptions = {
            rootName: (_a = opts.rootName) !== null && _a !== void 0 ? _a : "",
            includeRoot: (_b = opts.includeRoot) !== null && _b !== void 0 ? _b : false,
            xmlCharKey: (_c = opts.xmlCharKey) !== null && _c !== void 0 ? _c : XML_CHARKEY
        };
        const dom = parser.parseFromString(str, "application/xml");
        throwIfError(dom);
        let obj;
        if (updatedOptions.includeRoot) {
            obj = domToObject(dom, updatedOptions);
        }
        else {
            obj = domToObject(dom.childNodes[0], updatedOptions);
        }
        return Promise.resolve(obj);
    }
    catch (err) {
        return Promise.reject(err);
    }
}
let errorNS;
function getErrorNamespace() {
    var _a;
    if (errorNS === undefined) {
        try {
            errorNS =
                (_a = parser.parseFromString("INVALID", "text/xml").getElementsByTagName("parsererror")[0]
                    .namespaceURI) !== null && _a !== void 0 ? _a : "";
        }
        catch (ignored) {
            // Most browsers will return a document containing <parsererror>, but IE will throw.
            errorNS = "";
        }
    }
    return errorNS;
}
function throwIfError(dom) {
    const parserErrors = dom.getElementsByTagName("parsererror");
    if (parserErrors.length > 0 && getErrorNamespace()) {
        for (let i = 0; i < parserErrors.length; i++) {
            if (parserErrors[i].namespaceURI === errorNS) {
                throw new Error(parserErrors[i].innerHTML);
            }
        }
    }
}
function isElement(node) {
    return !!node.attributes;
}
/**
 * Get the Element-typed version of the provided Node if the provided node is an element with
 * attributes. If it isn't, then undefined is returned.
 */
function asElementWithAttributes(node) {
    return isElement(node) && node.hasAttributes() ? node : undefined;
}
function domToObject(node, options) {
    let result = {};
    const childNodeCount = node.childNodes.length;
    const firstChildNode = node.childNodes[0];
    const onlyChildTextValue = (firstChildNode &&
        childNodeCount === 1 &&
        firstChildNode.nodeType === Node.TEXT_NODE &&
        firstChildNode.nodeValue) ||
        undefined;
    const elementWithAttributes = asElementWithAttributes(node);
    if (elementWithAttributes) {
        result[XML_ATTRKEY] = {};
        for (let i = 0; i < elementWithAttributes.attributes.length; i++) {
            const attr = elementWithAttributes.attributes[i];
            result[XML_ATTRKEY][attr.nodeName] = attr.nodeValue;
        }
        if (onlyChildTextValue) {
            result[options.xmlCharKey] = onlyChildTextValue;
        }
    }
    else if (childNodeCount === 0) {
        result = "";
    }
    else if (onlyChildTextValue) {
        result = onlyChildTextValue;
    }
    if (!onlyChildTextValue) {
        for (let i = 0; i < childNodeCount; i++) {
            const child = node.childNodes[i];
            // Ignore leading/trailing whitespace nodes
            if (child.nodeType !== Node.TEXT_NODE) {
                const childObject = domToObject(child, options);
                if (!result[child.nodeName]) {
                    result[child.nodeName] = childObject;
                }
                else if (Array.isArray(result[child.nodeName])) {
                    result[child.nodeName].push(childObject);
                }
                else {
                    result[child.nodeName] = [result[child.nodeName], childObject];
                }
            }
        }
    }
    return result;
}
const serializer = new XMLSerializer();
export function stringifyXML(content, opts = {}) {
    var _a, _b, _c;
    const updatedOptions = {
        rootName: (_a = opts.rootName) !== null && _a !== void 0 ? _a : "root",
        includeRoot: (_b = opts.includeRoot) !== null && _b !== void 0 ? _b : false,
        xmlCharKey: (_c = opts.xmlCharKey) !== null && _c !== void 0 ? _c : XML_CHARKEY
    };
    const dom = buildNode(content, updatedOptions.rootName, updatedOptions)[0];
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + serializer.serializeToString(dom));
}
function buildAttributes(attrs) {
    const result = [];
    for (const key of Object.keys(attrs)) {
        const attr = doc.createAttribute(key);
        attr.value = attrs[key].toString();
        result.push(attr);
    }
    return result;
}
function buildNode(obj, elementName, options) {
    if (obj === undefined ||
        obj === null ||
        typeof obj === "string" ||
        typeof obj === "number" ||
        typeof obj === "boolean") {
        const elem = doc.createElement(elementName);
        elem.textContent = obj === undefined || obj === null ? "" : obj.toString();
        return [elem];
    }
    else if (Array.isArray(obj)) {
        const result = [];
        for (const arrayElem of obj) {
            for (const child of buildNode(arrayElem, elementName, options)) {
                result.push(child);
            }
        }
        return result;
    }
    else if (typeof obj === "object") {
        const elem = doc.createElement(elementName);
        for (const key of Object.keys(obj)) {
            if (key === XML_ATTRKEY) {
                for (const attr of buildAttributes(obj[key])) {
                    elem.attributes.setNamedItem(attr);
                }
            }
            else if (key === options.xmlCharKey) {
                elem.textContent = obj[key].toString();
            }
            else {
                for (const child of buildNode(obj[key], key, options)) {
                    elem.appendChild(child);
                }
            }
        }
        return [elem];
    }
    else {
        throw new Error(`Illegal value passed to buildObject: ${obj}`);
    }
}
//# sourceMappingURL=xml.browser.js.map