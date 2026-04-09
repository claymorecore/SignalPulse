// locks.js

const LOCKS = new Map();
const now = () => Date.now();
const norm = (k) => String(k || "").trim(); // normalize key to string

// Check if a lock exists and is still valid
const isLocked = (key) => {
  const k = norm(key);
  if (!k) return false;

  const v = LOCKS.get(k);
  if (!v) return false;

  // Expired lock
  if (v.until && now() > v.until) {
    LOCKS.delete(k);
    return false;
  }

  return true;
};

// Set a lock with optional TTL in milliseconds
const lock = (key, ttlMs = 0) => {
  const k = norm(key);
  if (!k) return false;

  const until = ttlMs > 0 ? now() + Math.floor(ttlMs) : 0;
  LOCKS.set(k, { at: now(), until });

  return true;
};

// Remove a lock
const unlock = (key) => {
  const k = norm(key);
  if (!k) return false;
  return LOCKS.delete(k);
};

// Clear all locks
const clear = () => {
  LOCKS.clear();
  return true;
};

// Aliases
const acquire = lock;
const release = unlock;
const has = isLocked;

// Exports
export { isLocked, lock, unlock, clear, acquire, release, has };
export default { isLocked, lock, unlock, clear, acquire, release, has };