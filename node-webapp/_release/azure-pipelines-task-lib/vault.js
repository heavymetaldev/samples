"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vault = void 0;
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var uuidV4 = require('uuid/v4');
var algorithm = "aes-256-ctr";
var encryptEncoding = 'hex';
var unencryptedEncoding = 'utf8';
//
// Store sensitive data in proc.
// Main goal: Protects tasks which would dump envvars from leaking secrets inadvertently
//            the task lib clears after storing.
// Also protects against a dump of a process getting the secrets
// The secret is generated and stored externally for the lifetime of the task.
//
var Vault = /** @class */ (function () {
    function Vault(keyPath) {
        this._keyFile = path.join(keyPath, '.taskkey');
        this._store = {};
        this.genKey();
    }
    Vault.prototype.initialize = function () {
    };
    Vault.prototype.storeSecret = function (name, data) {
        if (!name || name.length == 0) {
            return false;
        }
        name = name.toLowerCase();
        if (!data || data.length == 0) {
            if (this._store.hasOwnProperty(name)) {
                delete this._store[name];
            }
            return false;
        }
        var key = this.getKey();
        var iv = crypto.randomBytes(16);
        var cipher = crypto.createCipheriv(algorithm, key, iv);
        var crypted = cipher.update(data, unencryptedEncoding, encryptEncoding);
        var cryptedFinal = cipher.final(encryptEncoding);
        this._store[name] = iv.toString(encryptEncoding) + crypted + cryptedFinal;
        return true;
    };
    Vault.prototype.retrieveSecret = function (name) {
        var secret;
        name = (name || '').toLowerCase();
        if (this._store.hasOwnProperty(name)) {
            var key = this.getKey();
            var data = this._store[name];
            var ivDataBuffer = Buffer.from(data, encryptEncoding);
            var iv = ivDataBuffer.slice(0, 16);
            var encryptedText = ivDataBuffer.slice(16);
            var decipher = crypto.createDecipheriv(algorithm, key, iv);
            var dec = decipher.update(encryptedText, encryptEncoding, unencryptedEncoding);
            var decFinal = decipher.final(unencryptedEncoding);
            secret = dec + decFinal;
        }
        return secret;
    };
    Vault.prototype.getKey = function () {
        var key = fs.readFileSync(this._keyFile).toString('utf8');
        // Key needs to be hashed to correct length to match algorithm (aes-256-ctr)
        return crypto.createHash('sha256').update(key).digest();
    };
    Vault.prototype.genKey = function () {
        fs.writeFileSync(this._keyFile, uuidV4(), { encoding: 'utf8' });
    };
    return Vault;
}());
exports.Vault = Vault;