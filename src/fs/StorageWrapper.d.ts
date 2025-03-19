export interface IStorage {
    setItem(key: string, value: string): void;
    getItem(key: string): string | null;
    removeItem(key: string): void;
    itemExists(key: string): boolean;
    keys(): IterableIterator<string>;
    reload(key: string): Promise<string | null>;
}
export declare class MemoryStorage implements IStorage {
    private store;
    constructor(store?: Record<string, string>);
    setItem(key: string, value: string): void;
    getItem(key: string): string | null;
    removeItem(key: string): void;
    itemExists(key: string): boolean;
    keys(): IterableIterator<string>;
    reload(key: string): Promise<string>;
}
export declare class LocalStorageWrapper implements IStorage {
    private store;
    constructor(store?: Storage);
    setItem(key: string, value: string): void;
    getItem(key: string): string | null;
    removeItem(key: string): void;
    itemExists(key: string): boolean;
    keys(): IterableIterator<string>;
    reload(key: string): Promise<string>;
}
export declare function wrap(storage: object): IStorage;
