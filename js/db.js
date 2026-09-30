/* Local-only persistence on IndexedDB. Everything stays in this browser. */
(function () {
  'use strict';

  const DB_NAME = 'siltline';
  const DB_VERSION = 2;
  const STORES = {
    jobs: [],
    logs: ['jobId', 'date'],
    requests: ['jobId', 'status'],
    messages: ['channel'],
    photos: ['logId', 'jobId'],
    people: [],
    rain: ['jobId'],
    kv: null, // key-value store for settings, keyed by explicit key
  };

  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const [name, indexes] of Object.entries(STORES)) {
          if (db.objectStoreNames.contains(name)) continue;
          const store = indexes === null
            ? db.createObjectStore(name)
            : db.createObjectStore(name, { keyPath: 'id' });
          (indexes || []).forEach((ix) => store.createIndex(ix, ix));
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function wrap(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function tx(store, mode, fn) {
    const db = await open();
    const t = db.transaction(store, mode);
    const result = fn(t.objectStore(store));
    await new Promise((resolve, reject) => {
      t.oncomplete = resolve;
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
    return result instanceof IDBRequest ? result.result : result;
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  const DB = {
    uid,

    async all(store) {
      return tx(store, 'readonly', (s) => s.getAll());
    },

    async get(store, id) {
      if (id == null) return undefined;
      return tx(store, 'readonly', (s) => s.get(id));
    },

    async by(store, index, value) {
      return tx(store, 'readonly', (s) => s.index(index).getAll(value));
    },

    async put(store, obj) {
      const now = new Date().toISOString();
      if (!obj.id) obj.id = uid();
      if (!obj.createdAt) obj.createdAt = now;
      obj.updatedAt = now;
      await tx(store, 'readwrite', (s) => s.put(obj));
      return obj;
    },

    async del(store, id) {
      return tx(store, 'readwrite', (s) => s.delete(id));
    },

    async getKV(key, fallback) {
      const v = await tx('kv', 'readonly', (s) => s.get(key));
      return v === undefined ? fallback : v;
    },

    async setKV(key, value) {
      return tx('kv', 'readwrite', (s) => s.put(value, key));
    },

    async deleteJob(jobId) {
      const [logs, reqs, photos, msgs, rain] = await Promise.all([
        DB.by('logs', 'jobId', jobId),
        DB.by('requests', 'jobId', jobId),
        DB.by('photos', 'jobId', jobId),
        DB.by('messages', 'channel', jobId),
        DB.by('rain', 'jobId', jobId),
      ]);
      const db = await open();
      const t = db.transaction(['jobs', 'logs', 'requests', 'photos', 'messages', 'rain'], 'readwrite');
      t.objectStore('jobs').delete(jobId);
      logs.forEach((x) => t.objectStore('logs').delete(x.id));
      reqs.forEach((x) => t.objectStore('requests').delete(x.id));
      photos.forEach((x) => t.objectStore('photos').delete(x.id));
      msgs.forEach((x) => t.objectStore('messages').delete(x.id));
      rain.forEach((x) => t.objectStore('rain').delete(x.id));
      await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
    },

    /* Export everything (photos as data URLs) so a crew can hand data to the office. */
    async exportAll(jobId) {
      const out = { app: 'siltline', version: 1, exportedAt: new Date().toISOString(), data: {} };
      for (const name of Object.keys(STORES)) {
        if (name === 'kv') continue;
        let rows = await DB.all(name);
        if (jobId) {
          if (name === 'jobs') rows = rows.filter((r) => r.id === jobId);
          else if (name === 'messages') rows = rows.filter((r) => r.channel === jobId);
          else if (name !== 'people') rows = rows.filter((r) => r.jobId === jobId);
        }
        out.data[name] = rows;
      }
      out.data.catalog = await DB.getKV('catalog', null);
      return out;
    },

    /* Merge an export: newer updatedAt wins, nothing is deleted. */
    async importAll(payload) {
      if (!payload || payload.app !== 'siltline' || !payload.data) throw new Error('Not a SiltLine backup file');
      let added = 0, updated = 0;
      for (const name of Object.keys(STORES)) {
        if (name === 'kv') continue;
        for (const row of payload.data[name] || []) {
          const existing = await DB.get(name, row.id);
          if (!existing) added++;
          else if ((row.updatedAt || '') > (existing.updatedAt || '')) updated++;
          else continue;
          await tx(name, 'readwrite', (s) => s.put(row));
        }
      }
      if (payload.data.catalog && !(await DB.getKV('catalog', null))) {
        await DB.setKV('catalog', payload.data.catalog);
      }
      return { added, updated };
    },

    async wipe() {
      const db = await open();
      const names = Object.keys(STORES);
      const t = db.transaction(names, 'readwrite');
      names.forEach((n) => t.objectStore(n).clear());
      await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
    },

    async estimate() {
      if (navigator.storage && navigator.storage.estimate) return navigator.storage.estimate();
      return null;
    },
  };

  window.DB = DB;
})();
