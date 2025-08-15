// A simple IndexedDB wrapper for storing image data (base64 strings)
// This helps avoid the 5MB limit of localStorage.

const DB_NAME = 'ReStudyImageDB';
const STORE_NAME = 'images';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject('IndexedDB is not supported by this browser.');
                return;
            }
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = () => {
                request.result.createObjectStore(STORE_NAME);
            };
        });
    }
    return dbPromise;
}

/**
 * Stores a base64 string in IndexedDB.
 * @param base64 The base64 string of the image.
 * @returns A promise that resolves with a unique key for the stored image (e.g., "idb://...").
 */
export async function storeImage(base64: string): Promise<string> {
    const db = await getDb();
    const key = crypto.randomUUID();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(base64, key);
        request.onerror = () => reject(request.error);
        // Using oncomplete to ensure data is written
        transaction.oncomplete = () => resolve(`idb://${key}`);
        transaction.onerror = () => reject(transaction.error);
    });
}

/**
 * Retrieves an image's base64 string from IndexedDB.
 * @param key The full key (e.g., "idb://...").
 * @returns A promise that resolves with the base64 string, or undefined if not found.
 */
export async function getImage(key: string): Promise<string | undefined> {
    const db = await getDb();
    const actualKey = key.replace('idb://', '');
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(actualKey);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as string | undefined);
    });
}

/**
 * Deletes one or more images from IndexedDB.
 * @param keys An array of full keys (e.g., ["idb://...", "idb://..."]).
 * @returns A promise that resolves when all deletions are complete.
 */
export async function deleteImages(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        keys.forEach(key => {
            const actualKey = key.replace('idb://', '');
            store.delete(actualKey);
        });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}
