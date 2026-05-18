const DEFAULT_TTL = 60 * 1000;
const DEFAULT_GC_TIME = 10 * 60 * 1000;

function normalizeKey(key) {
  return String(key ?? "");
}

function shallowEqualObject(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (let index = 0; index < aKeys.length; index += 1) {
    const currentKey = aKeys[index];
    if (a[currentKey] !== b[currentKey]) return false;
  }
  return true;
}

class QueryCache {
  constructor() {
    this.store = new Map();
    this.inFlight = new Map();
    this.subscribers = new Map();
    this.gcTimer = null;
  }

  now() {
    return Date.now();
  }

  buildEntry(key, data, previous, options = {}) {
    return {
      key,
      data,
      ttl: options.ttl ?? previous?.ttl ?? DEFAULT_TTL,
      gcTime: options.gcTime ?? previous?.gcTime ?? DEFAULT_GC_TIME,
      updatedAt: options.updatedAt ?? this.now(),
      accessedAt: this.now(),
      meta: options.meta ?? previous?.meta ?? {},
      version: (previous?.version || 0) + 1,
    };
  }

  getEntry(key) {
    const cacheKey = normalizeKey(key);
    const entry = this.store.get(cacheKey) || null;
    if (!entry) return null;
    entry.accessedAt = this.now();
    this.store.set(cacheKey, entry);
    return entry;
  }

  peekEntry(key) {
    return this.store.get(normalizeKey(key)) || null;
  }

  getData(key) {
    return this.getEntry(key)?.data;
  }

  has(key) {
    return this.store.has(normalizeKey(key));
  }

  isFresh(key, ttl = DEFAULT_TTL) {
    const entry = this.peekEntry(key);
    if (!entry) return false;
    const maxAge = entry.ttl ?? ttl;
    return this.now() - entry.updatedAt < maxAge;
  }

  isStale(key, ttl = DEFAULT_TTL) {
    return !this.isFresh(key, ttl);
  }

  shouldNotify(previous, next) {
    if (!previous) return true;
    if (previous.data !== next.data) return true;
    if (previous.updatedAt !== next.updatedAt) return true;
    return !shallowEqualObject(previous.meta, next.meta);
  }

  scheduleGc() {
    if (this.gcTimer) return;
    this.gcTimer = setTimeout(() => {
      this.gcTimer = null;
      this.gcSweep();
    }, 60 * 1000);
  }

  gcSweep() {
    const now = this.now();
    const removed = [];

    for (const [key, entry] of this.store.entries()) {
      const maxAge = entry.gcTime ?? DEFAULT_GC_TIME;
      const hasListeners = this.subscribers.has(key);
      if (!hasListeners && now - (entry.accessedAt || entry.updatedAt || now) > maxAge) {
        removed.push(key);
      }
    }

    removed.forEach((key) => this.remove(key));

    if (this.store.size > 0) {
      this.scheduleGc();
    }
  }

  set(key, data, options = {}) {
    const cacheKey = normalizeKey(key);
    const previous = this.peekEntry(cacheKey);
    const next = this.buildEntry(cacheKey, data, previous, options);

    this.store.set(cacheKey, next);
    this.scheduleGc();

    if (this.shouldNotify(previous, next)) {
      this.emit(cacheKey, next.data, next);
    }
    return next.data;
  }

  patch(key, updater, options = {}) {
    const cacheKey = normalizeKey(key);
    const previousData = this.peekEntry(cacheKey)?.data;
    const nextData = typeof updater === "function" ? updater(previousData) : updater;
    if (nextData === previousData && this.peekEntry(cacheKey)) {
      return previousData;
    }
    return this.set(cacheKey, nextData, options);
  }

  remove(key) {
    const cacheKey = normalizeKey(key);
    const previous = this.peekEntry(cacheKey);
    this.store.delete(cacheKey);
    this.inFlight.delete(cacheKey);
    this.emit(cacheKey, undefined, previous);
  }

  clear() {
    const keys = Array.from(this.store.keys());
    this.store.clear();
    this.inFlight.clear();
    if (this.gcTimer) {
      clearTimeout(this.gcTimer);
      this.gcTimer = null;
    }
    keys.forEach((key) => this.emit(key, undefined, null));
  }

  invalidate(key) {
    const cacheKey = normalizeKey(key);
    const entry = this.peekEntry(cacheKey);
    if (!entry) return;
    const next = {
      ...entry,
      updatedAt: 0,
      accessedAt: this.now(),
    };
    this.store.set(cacheKey, next);
    this.emit(cacheKey, next.data, next);
  }

  invalidatePrefix(prefix) {
    const target = normalizeKey(prefix);
    for (const key of this.store.keys()) {
      if (key.startsWith(target)) {
        this.invalidate(key);
      }
    }
  }

  removePrefix(prefix) {
    const target = normalizeKey(prefix);
    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(target)) {
        this.remove(key);
      }
    }
  }

  subscribe(key, listener) {
    const cacheKey = normalizeKey(key);
    if (!this.subscribers.has(cacheKey)) {
      this.subscribers.set(cacheKey, new Set());
    }
    const set = this.subscribers.get(cacheKey);
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) {
        this.subscribers.delete(cacheKey);
      }
    };
  }

  emit(key, data, entry) {
    const listeners = this.subscribers.get(normalizeKey(key));
    if (!listeners || listeners.size === 0) return;
    listeners.forEach((listener) => {
      try {
        listener(data, entry);
      } catch {}
    });
  }

  getInFlight(key) {
    return this.inFlight.get(normalizeKey(key)) || null;
  }

  setInFlight(key, promise) {
    this.inFlight.set(normalizeKey(key), promise);
    return promise;
  }

  clearInFlight(key) {
    this.inFlight.delete(normalizeKey(key));
  }

  async fetch(key, fetcher, options = {}) {
    const cacheKey = normalizeKey(key);
    const ttl = options.ttl ?? DEFAULT_TTL;
    const force = !!options.force;
    const useCacheOnError = options.useCacheOnError ?? true;

    if (!force && this.isFresh(cacheKey, ttl)) {
      return this.getData(cacheKey);
    }

    const running = this.getInFlight(cacheKey);
    if (running) return running;

    const promise = (async () => {
      try {
        const data = await fetcher();
        this.set(cacheKey, data, {
          ttl,
          gcTime: options.gcTime,
          meta: options.meta,
        });
        return data;
      } catch (error) {
        if (useCacheOnError && this.has(cacheKey)) {
          return this.getData(cacheKey);
        }
        throw error;
      } finally {
        this.clearInFlight(cacheKey);
      }
    })();

    this.setInFlight(cacheKey, promise);
    return promise;
  }

  async prefetch(key, fetcher, options = {}) {
    try {
      await this.fetch(key, fetcher, options);
    } catch {}
  }

  snapshot() {
    return Array.from(this.store.values()).map((entry) => ({ ...entry }));
  }
}

const queryCache = new QueryCache();

export const CACHE_TTL = {
  feed: 30 * 1000,
  dashboard: 60 * 1000,
  chatList: 20 * 1000,
  chatMessages: 15 * 1000,
  notifications: 10 * 1000,
  profile: 2 * 60 * 1000,
  venues: 3 * 60 * 1000,
  default: DEFAULT_TTL,
};

export default queryCache;
