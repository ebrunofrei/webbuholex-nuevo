// TTL cache simple en memoria (enterprise-safe)
const store = new Map();

export function getCache(key) {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.exp) {
    store.delete(key);
    return null;
  }
  return hit.val;
}

export function setCache(key, val, ttlMs = 30_000) {
  store.set(key, { val, exp: Date.now() + ttlMs });
}
