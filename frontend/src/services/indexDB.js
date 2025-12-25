const DB_NAME = 'OfflineNotesDB';
const DB_VERSION = 1;
const NOTES_STORE = 'notes';

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        const objectStore = db.createObjectStore(NOTES_STORE, { keyPath: 'id' });
        objectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        objectStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        objectStore.createIndex('userId', 'userId', { unique: false });
      }
    };
  });
};

export const dbOperations = {
  async getAllNotes() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([NOTES_STORE], 'readonly');
      const objectStore = transaction.objectStore(NOTES_STORE);
      const request = objectStore.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  
  async getNote(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([NOTES_STORE], 'readonly');
      const objectStore = transaction.objectStore(NOTES_STORE);
      const request = objectStore.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  
  async saveNote(note) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([NOTES_STORE], 'readwrite');
      const objectStore = transaction.objectStore(NOTES_STORE);
      const request = objectStore.put(note);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  
  async deleteNote(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([NOTES_STORE], 'readwrite');
      const objectStore = transaction.objectStore(NOTES_STORE);
      const request = objectStore.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
  
  async getPendingNotes() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([NOTES_STORE], 'readonly');
      const objectStore = transaction.objectStore(NOTES_STORE);
      const index = objectStore.index('syncStatus');
      const request = index.getAll('pending');
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  
  async clearAllNotes() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([NOTES_STORE], 'readwrite');
      const objectStore = transaction.objectStore(NOTES_STORE);
      const request = objectStore.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};