var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class MemoryStorage {
    constructor(store = {}) {
        this.store = store;
    }
    setItem(key, value) {
        this.store[key] = value;
    }
    getItem(key) {
        return this.store.hasOwnProperty(key) ? this.store[key] : null;
    }
    removeItem(key) {
        delete this.store[key];
    }
    itemExists(key) {
        return key in this.store;
    }
    *keys() {
        for (const key in this.store) {
            yield key;
        }
    }
    reload(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.store[key];
        });
    }
}
export class LocalStorageWrapper {
    constructor(store = globalThis.localStorage) {
        this.store = store;
    }
    setItem(key, value) {
        this.store.setItem(key, value);
    }
    getItem(key) {
        return this.store.getItem(key);
    }
    removeItem(key) {
        this.store.removeItem(key);
    }
    itemExists(key) {
        return key in this.store;
    }
    *keys() {
        for (let i = 0; i < this.store.length; i++) {
            yield this.store.key(i);
        }
    }
    reload(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.store[key];
        });
    }
}
export function wrap(storage) {
    if (storage instanceof Storage) {
        return new LocalStorageWrapper(storage);
    }
    else {
        return new MemoryStorage(storage);
    }
}
//# sourceMappingURL=StorageWrapper.js.map