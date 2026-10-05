/* DayStart — storage.js
   Unified storage wrapper: chrome.storage.sync for settings,
   chrome.storage.local for bulky data. Falls back to localStorage. */

const Store = (() => {
  const hasChrome = typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync;

  function get(area, key, fallback) {
    if (hasChrome) {
      return new Promise((resolve) => {
        chrome.storage[area].get(key, (res) => {
          resolve(res && res[key] !== undefined ? res[key] : fallback);
        });
      });
    }
    try {
      const raw = localStorage.getItem("ds_" + area + "_" + key);
      return Promise.resolve(raw !== null ? JSON.parse(raw) : fallback);
    } catch (e) {
      return Promise.resolve(fallback);
    }
  }

  function set(area, key, value) {
    if (hasChrome) {
      return new Promise((resolve) => chrome.storage[area].set({ [key]: value }, resolve));
    }
    try {
      localStorage.setItem("ds_" + area + "_" + key, JSON.stringify(value));
    } catch (e) { /* quota */ }
    return Promise.resolve();
  }

  function remove(area, key) {
    if (hasChrome) {
      return new Promise((resolve) => chrome.storage[area].remove(key, resolve));
    }
    localStorage.removeItem("ds_" + area + "_" + key);
    return Promise.resolve();
  }

  return {
    // Settings (synced across devices)
    getSetting: (key, fallback) => get("sync", key, fallback),
    setSetting: (key, value) => set("sync", key, value),
    // Data (local, larger payloads)
    getData: (key, fallback) => get("local", key, fallback),
    setData: (key, value) => set("local", key, value),
    removeData: (key) => remove("local", key),
    // Export everything
    exportAll: async () => {
      const out = { version: 1, exported: new Date().toISOString(), sync: {}, local: {} };
      if (hasChrome) {
        out.sync = await new Promise((r) => chrome.storage.sync.get(null, r));
        out.local = await new Promise((r) => chrome.storage.local.get(null, r));
      } else {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k.startsWith("ds_sync_")) out.sync[k.slice(8)] = JSON.parse(localStorage.getItem(k));
          if (k.startsWith("ds_local_")) out.local[k.slice(9)] = JSON.parse(localStorage.getItem(k));
        }
      }
      return out;
    },
    // Import a full snapshot
    importAll: async (snapshot) => {
      if (!snapshot || typeof snapshot !== "object") return;
      if (snapshot.sync && hasChrome) chrome.storage.sync.set(snapshot.sync);
      if (snapshot.local && hasChrome) chrome.storage.local.set(snapshot.local);
      if (!hasChrome) {
        Object.entries(snapshot.sync || {}).forEach(([k, v]) =>
          localStorage.setItem("ds_sync_" + k, JSON.stringify(v)));
        Object.entries(snapshot.local || {}).forEach(([k, v]) =>
          localStorage.setItem("ds_local_" + k, JSON.stringify(v)));
      }
    }
  };
})();
