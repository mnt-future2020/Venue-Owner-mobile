import { useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import navigationOrchestrator from "../services/navigationOrchestrator";

export default function useFastNavigation(defaultOptions = {}) {
  const router = useRouter();

  const push = useCallback(
    (route, options = {}) =>
      navigationOrchestrator.fastPush(router, route, {
        ...defaultOptions,
        ...options,
      }),
    [defaultOptions, router]
  );

  const replace = useCallback(
    (route, options = {}) =>
      navigationOrchestrator.fastReplace(router, route, {
        ...defaultOptions,
        ...options,
      }),
    [defaultOptions, router]
  );

  const prefetch = useCallback(
    (route, options = {}) =>
      navigationOrchestrator.prefetch(route, {
        ...defaultOptions,
        ...options,
      }),
    [defaultOptions]
  );

  const warm = useCallback(
    (routes = [], options = {}) =>
      navigationOrchestrator.warmRoutes(routes, {
        ...defaultOptions,
        ...options,
      }),
    [defaultOptions]
  );

  const open = useCallback(
    (opener, options = {}) =>
      navigationOrchestrator.fastOpen(opener, {
        ...defaultOptions,
        ...options,
      }),
    [defaultOptions]
  );

  return useMemo(
    () => ({
      push,
      replace,
      prefetch,
      warm,
      open,
      snapshot: () => navigationOrchestrator.getWarmSnapshot(),
      clear: (route) => navigationOrchestrator.clearWarmRoute(route),
      clearAll: () => navigationOrchestrator.clearAllWarmRoutes(),
    }),
    [open, prefetch, push, replace, warm]
  );
}
