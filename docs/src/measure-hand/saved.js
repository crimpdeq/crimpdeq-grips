// Values kept in the browser's IndexedDB so a reload loses nothing: the page state, and each
// photo under its own key, written only when the photo changes.

const DB = 'crimpdeq-grips';
const STORE = 'measure-hand';

// Runs use(store) in one transaction and resolves with the result of the request it returns.
function transaction(mode, use) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(STORE, mode);
      const req = use(tx.objectStore(STORE));
      tx.oncomplete = () => { db.close(); resolve(req?.result); };
      tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
    };
  });
}

// The value saved under key, or undefined.
export const load = key => transaction('readonly', store => store.get(key));
// Saves [[key, value]]: all of them or, when it fails, none.
export const save = entries => transaction('readwrite', store => {
  for (const [key, value] of entries) store.put(value, key);
});
