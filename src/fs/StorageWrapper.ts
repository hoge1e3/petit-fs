export interface IStorage {
    setItem(key: string, value: string): void;
    getItem(key: string): string | null;
    removeItem(key: string): void;
    itemExists(key: string): boolean;
    keys(): IterableIterator<string>; 
    reload(key:string):Promise<string|null>;
}
export class MemoryStorage implements IStorage {
    constructor(private store: Record<string, string> = {}){}
    setItem(key: string, value: string): void {
      this.store[key] = value;
    }
    getItem(key: string): string | null {
      return this.store.hasOwnProperty(key) ? this.store[key] : null;
    }
    removeItem(key: string): void {
      delete this.store[key];
    }
    itemExists(key: string): boolean {
        return key in this.store;
    }
    *keys(): IterableIterator<string> {
        for (const key in this.store) {
            yield key;
        }
    }
    async reload(key: string): Promise<string> {
        return this.store[key];
    }
  }
export class LocalStorageWrapper implements IStorage {
    constructor(private store: Storage = globalThis.localStorage){}
    setItem(key: string, value: string): void {
      this.store.setItem(key, value);
    }
    getItem(key: string): string | null {
      return this.store.getItem(key);
    }
    removeItem(key: string): void {
      this.store.removeItem(key);
    }
    itemExists(key: string): boolean {  
        return key in this.store;
    }
    *keys(): IterableIterator<string> { 
        for (let i = 0; i < this.store.length; i++) {
            yield this.store.key(i)!;
        }
    }
    async reload(key: string): Promise<string> {
      return this.store[key];
  }
}
export function wrap(storage: object): IStorage {
  if (storage instanceof Storage) {
    return new LocalStorageWrapper(storage);
  } else {
    return new MemoryStorage(storage as Record<string, string>);
  }
}