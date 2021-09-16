export declare class Vault {
    constructor(keyPath: string);
    private _keyFile;
    private _store;
    initialize(): void;
    storeSecret(name: string, data: string): boolean;
    retrieveSecret(name: string): string | undefined;
    private getKey;
    private genKey;
}