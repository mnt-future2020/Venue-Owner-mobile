import queryCache from "./queryCache";
import { safePush, safeReplace, safeOpen } from "./navigationGuard";
import { getRouteLoader, getRouteMeta } from "./routePrefetchRegistry";

const PREFETCH_STATE = new Map();
const DEFAULT_PREFETCH_TTL = 45 * 1000;
const MAX_CONCURRENT_PREFETCH = 2;

function normalizeRoute(route) {
  if (typeof route === "string") return route.trim();
  if (route && typeof route === "object" && typeof route.pathname === "string") {
    return route.pathname.trim();
  }
  return "";
}

function buildPrefetchKey(route) {
  return `route-prefetch:${normalizeRoute(route)}`;
}

class NavigationOrchestrator {
  constructor() {
    this.queue = [];
    this.running = 0;
    this.lastIntent = null;
  }

  markIntent(route, source = "unknown") {
    this.lastIntent = {
      route: normalizeRoute(route),
      source,
      at: Date.now(),
    };
    return this.lastIntent;
  }

  canReuseWarmRoute(route) {
    const key = buildPrefetchKey(route);
    const state = PREFETCH_STATE.get(key);
    if (!state?.updatedAt) return false;
    const ttl = state.ttl ?? DEFAULT_PREFETCH_TTL;
    return Date.now() - state.updatedAt < ttl;
  }

  async prefetch(route, options = {}) {
    const normalizedRoute = normalizeRoute(route);
    if (!normalizedRoute) return null;

    const loader = options.loader || getRouteLoader(normalizedRoute);
    if (typeof loader !== "function") return null;

    const prefetchKey = buildPrefetchKey(normalizedRoute);
    const current = PREFETCH_STATE.get(prefetchKey);
    if (current?.promise) return current.promise;
    if (!options.force && this.canReuseWarmRoute(normalizedRoute)) {
      return current?.data ?? queryCache.getData(prefetchKey) ?? null;
    }

    const ttl = options.ttl ?? getRouteMeta(normalizedRoute)?.ttl ?? DEFAULT_PREFETCH_TTL;

    const task = async () => {
      try {
        const data = await loader();
        PREFETCH_STATE.set(prefetchKey, {
          data,
          updatedAt: Date.now(),
          ttl,
          promise: null,
        });
        queryCache.set(prefetchKey, data, { ttl, gcTime: ttl * 3, meta: { route: normalizedRoute } });
        return data;
      } catch (error) {
        PREFETCH_STATE.delete(prefetchKey);
        throw error;
      }
    };

    const promise = this.enqueue(task, {
      priority: options.priority ?? getRouteMeta(normalizedRoute)?.priority ?? 0,
    });

    PREFETCH_STATE.set(prefetchKey, {
      ...(current || {}),
      promise,
      ttl,
      updatedAt: current?.updatedAt ?? 0,
    });

    try {
      return await promise;
    } finally {
      const latest = PREFETCH_STATE.get(prefetchKey);
      if (latest?.promise === promise) {
        PREFETCH_STATE.set(prefetchKey, {
          ...latest,
          promise: null,
        });
      }
    }
  }

  enqueue(task, options = {}) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        task,
        priority: options.priority ?? 0,
        resolve,
        reject,
      });
      this.queue.sort((a, b) => b.priority - a.priority);
      this.flush();
    });
  }

  flush() {
    while (this.running < MAX_CONCURRENT_PREFETCH && this.queue.length > 0) {
      const next = this.queue.shift();
      this.running += 1;
      Promise.resolve()
        .then(next.task)
        .then(next.resolve)
        .catch(next.reject)
        .finally(() => {
          this.running -= 1;
          this.flush();
        });
    }
  }

  warmRoutes(routes = [], options = {}) {
    return Promise.allSettled(
      routes
        .map((route) => normalizeRoute(route))
        .filter(Boolean)
        .map((route) => this.prefetch(route, options))
    );
  }

  fastPush(router, route, options = {}) {
    this.markIntent(route, options.source || "push");
    if (options.prefetchFirst) {
      this.prefetch(route, options).catch(() => {});
    }
    return safePush(router, route, options);
  }

  fastReplace(router, route, options = {}) {
    this.markIntent(route, options.source || "replace");
    if (options.prefetchFirst) {
      this.prefetch(route, options).catch(() => {});
    }
    return safeReplace(router, route, options);
  }

  fastOpen(opener, options = {}) {
    return safeOpen(opener, options);
  }

  getWarmSnapshot() {
    return Array.from(PREFETCH_STATE.entries()).map(([key, value]) => ({
      key,
      updatedAt: value.updatedAt || 0,
      ttl: value.ttl || DEFAULT_PREFETCH_TTL,
      hasData: value.data !== undefined,
      loading: !!value.promise,
    }));
  }

  clearWarmRoute(route) {
    const key = buildPrefetchKey(route);
    PREFETCH_STATE.delete(key);
    queryCache.remove(key);
  }

  clearAllWarmRoutes() {
    for (const key of PREFETCH_STATE.keys()) {
      queryCache.remove(key);
    }
    PREFETCH_STATE.clear();
  }
}

const navigationOrchestrator = new NavigationOrchestrator();

export function prefetchRoute(route, options = {}) {
  return navigationOrchestrator.prefetch(route, options);
}

export function warmRoutes(routes, options = {}) {
  return navigationOrchestrator.warmRoutes(routes, options);
}

export function fastPushRoute(router, route, options = {}) {
  return navigationOrchestrator.fastPush(router, route, options);
}

export function fastReplaceRoute(router, route, options = {}) {
  return navigationOrchestrator.fastReplace(router, route, options);
}

export function fastOpenSheet(opener, options = {}) {
  return navigationOrchestrator.fastOpen(opener, options);
}

export function getWarmRouteSnapshot() {
  return navigationOrchestrator.getWarmSnapshot();
}

export function clearWarmRoute(route) {
  return navigationOrchestrator.clearWarmRoute(route);
}

export function clearAllWarmRoutes() {
  return navigationOrchestrator.clearAllWarmRoutes();
}

export default navigationOrchestrator;
