const STORAGE_KEY_PREFIX = "pharmalink_history_";

const getKey = (email) => `${STORAGE_KEY_PREFIX}${email}`;

export const loadHistory = (email) => {
  const raw = localStorage.getItem(getKey(email));
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const addHistoryEntry = (email, entry) => {
  const key = getKey(email);
  const current = loadHistory(email);

  // make sure each entry has a stable id
  const withId = {
    id:
      entry.id ||
      (crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`),
    ...entry,
  };

  const updated = [withId, ...current];
  localStorage.setItem(key, JSON.stringify(updated));
  return updated;
};

export const clearHistory = (email) => {
  localStorage.removeItem(getKey(email));
};

// delete just one entry
export const deleteHistoryEntry = (email, id) => {
  const key = getKey(email);
  const current = loadHistory(email);
  const updated = current.filter((h) => h.id !== id);
  localStorage.setItem(key, JSON.stringify(updated));
  return updated; // so the component can update its state
};
