const routeLoaders = new Map();
const routeMeta = new Map();

function normalizeRoute(route) {
  if (typeof route !== "string") return "";
  return route.trim();
}

export function registerRouteLoader(route, loader, options = {}) {
  const key = normalizeRoute(route);
  if (!key || typeof loader !== "function") return () => {};

  routeLoaders.set(key, loader);
  routeMeta.set(key, {
    priority: options.priority ?? 0,
    ttl: options.ttl ?? 60 * 1000,
    tags: Array.isArray(options.tags) ? options.tags : [],
  });

  return () => {
    routeLoaders.delete(key);
    routeMeta.delete(key);
  };
}

export function getRouteLoader(route) {
  return routeLoaders.get(normalizeRoute(route)) || null;
}

export function getRouteMeta(route) {
  return routeMeta.get(normalizeRoute(route)) || null;
}

export function getRegisteredRoutes() {
  return Array.from(routeLoaders.keys()).map((route) => ({
    route,
    ...(routeMeta.get(route) || {}),
  }));
}

export function clearRouteRegistry() {
  routeLoaders.clear();
  routeMeta.clear();
}

export default {
  register: registerRouteLoader,
  getLoader: getRouteLoader,
  getMeta: getRouteMeta,
  list: getRegisteredRoutes,
  clear: clearRouteRegistry,
};
