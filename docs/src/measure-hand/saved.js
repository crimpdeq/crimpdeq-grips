// Values kept in the browser's IndexedDB so a reload loses nothing: the page state, and each
// photo under its own key, written only when the photo changes.

const DB = 'crimpdeq-grips';
const STORE = 'measure-hand';

function request(mode, use) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const req = use(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => { db.close(); resolve(req.result); };
      req.onerror = () => { db.close(); reject(req.error); };
    };
  });
}

// The value saved under key, or undefined.
export const load = key => request('readonly', store => store.get(key));
export const save = (key, value) => request('readwrite', store => store.put(value, key));
