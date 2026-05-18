const listeners = new Map();
const wildcardKey = "*";

function normalizeEvent(event) {
  return String(event ?? "");
}

function getSet(event) {
  const key = normalizeEvent(event);
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  return listeners.get(key);
}

export function emitCacheEvent(event, payload) {
  const eventKey = normalizeEvent(event);
  const exact = listeners.get(eventKey);
  const wildcard = listeners.get(wildcardKey);

  if (exact) {
    exact.forEach((listener) => {
      try {
        listener(payload, eventKey);
      } catch {}
    });
  }

  if (wildcard) {
    wildcard.forEach((listener) => {
      try {
        listener(payload, eventKey);
      } catch {}
    });
  }
}

export function onCacheEvent(event, listener) {
  const set = getSet(event);
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) {
      listeners.delete(normalizeEvent(event));
    }
  };
}

export function onceCacheEvent(event, listener) {
  let unsubscribe = null;
  unsubscribe = onCacheEvent(event, (payload, eventKey) => {
    unsubscribe?.();
    listener(payload, eventKey);
  });
  return unsubscribe;
}

export function clearCacheEventListeners(event) {
  if (event == null) {
    listeners.clear();
    return;
  }
  listeners.delete(normalizeEvent(event));
}

const cacheEvents = {
  emit: emitCacheEvent,
  on: onCacheEvent,
  once: onceCacheEvent,
  clear: clearCacheEventListeners,
};

export default cacheEvents;
