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
import { baggageEntryMetadataFromString } from '@opentelemetry/api';
import { BAGGAGE_ITEMS_SEPARATOR, BAGGAGE_PROPERTIES_SEPARATOR, BAGGAGE_KEY_PAIR_SEPARATOR, BAGGAGE_MAX_TOTAL_LENGTH, } from './constants';
export var serializeKeyPairs = function (keyPairs) {
    return keyPairs.reduce(function (hValue, current) {
        var value = "" + hValue + (hValue !== '' ? BAGGAGE_ITEMS_SEPARATOR : '') + current;
        return value.length > BAGGAGE_MAX_TOTAL_LENGTH ? hValue : value;
    }, '');
};
export var getKeyPairs = function (baggage) {
    return baggage
        .getAllEntries()
        .map(function (_a) {
        var key = _a[0], value = _a[1];
        return encodeURIComponent(key) + "=" + encodeURIComponent(value.value);
    });
};
export var parsePairKeyValue = function (entry) {
    var valueProps = entry.split(BAGGAGE_PROPERTIES_SEPARATOR);
    if (valueProps.length <= 0)
        return;
    var keyPairPart = valueProps.shift();
    if (!keyPairPart)
        return;
    var keyPair = keyPairPart.split(BAGGAGE_KEY_PAIR_SEPARATOR);
    if (keyPair.length !== 2)
        return;
    var key = decodeURIComponent(keyPair[0].trim());
    var value = decodeURIComponent(keyPair[1].trim());
    var metadata;
    if (valueProps.length > 0) {
        metadata = baggageEntryMetadataFromString(valueProps.join(BAGGAGE_PROPERTIES_SEPARATOR));
    }
    return { key: key, value: value, metadata: metadata };
};
/**
 * Parse a string serialized in the baggage HTTP Format (without metadata):
 * https://github.com/w3c/baggage/blob/master/baggage/HTTP_HEADER_FORMAT.md
 */
export var parseKeyPairsIntoRecord = function (value) {
    if (typeof value !== 'string' || value.length === 0)
        return {};
    return value
        .split(BAGGAGE_ITEMS_SEPARATOR)
        .map(function (entry) {
        return parsePairKeyValue(entry);
    })
        .filter(function (keyPair) { return keyPair !== undefined && keyPair.value.length > 0; })
        .reduce(function (headers, keyPair) {
        headers[keyPair.key] = keyPair.value;
        return headers;
    }, {});
};
//# sourceMappingURL=utils.js.map