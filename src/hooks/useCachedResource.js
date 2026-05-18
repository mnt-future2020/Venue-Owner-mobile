import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import queryCache, { CACHE_TTL } from "../services/queryCache";

export default function useCachedResource(queryKey, fetcher, options = {}) {
  const ttl = options.ttl ?? CACHE_TTL.default;
  const enabled = options.enabled ?? true;
  const revalidateOnMount = options.revalidateOnMount ?? true;
  const gcTime = options.gcTime;
  const meta = options.meta;

  const initialEntry = useMemo(() => queryCache.peekEntry(queryKey), [queryKey]);
  const initialData = initialEntry?.data;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled && initialData === undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const lastDataRef = useRef(initialData);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const nextData = queryCache.getData(queryKey);
    lastDataRef.current = nextData;
    setData(nextData);
  }, [queryKey]);

  useEffect(() => {
    return queryCache.subscribe(queryKey, (nextData) => {
      if (lastDataRef.current === nextData) return;
      lastDataRef.current = nextData;
      if (mountedRef.current) {
        setData(nextData);
      }
    });
  }, [queryKey]);

  const load = useCallback(
    async (loadOptions = {}) => {
      if (!enabled || typeof fetcher !== "function") return undefined;

      const force = !!loadOptions.force;
      if (mountedRef.current) {
        setError(null);
        if (force) setRefreshing(true);
        else if (!queryCache.peekEntry(queryKey)) setLoading(true);
      }

      try {
        const result = await queryCache.fetch(queryKey, fetcher, {
          ttl,
          gcTime,
          force,
          meta,
          useCacheOnError: loadOptions.useCacheOnError ?? true,
        });
        lastDataRef.current = result;
        if (mountedRef.current) {
          setData(result);
        }
        return result;
      } catch (err) {
        if (mountedRef.current) {
          setError(err);
        }
        throw err;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [enabled, fetcher, gcTime, meta, queryKey, ttl]
  );

  useEffect(() => {
    if (!enabled || typeof fetcher !== "function") return;

    const hasCache = queryCache.has(queryKey);
    const fresh = queryCache.isFresh(queryKey, ttl);

    if (!hasCache) {
      load().catch(() => {});
      return;
    }

    if (revalidateOnMount && !fresh) {
      load().catch(() => {});
    } else if (mountedRef.current) {
      setLoading(false);
    }
  }, [enabled, fetcher, load, queryKey, revalidateOnMount, ttl]);

  const invalidate = useCallback(() => {
    queryCache.invalidate(queryKey);
  }, [queryKey]);

  const patch = useCallback(
    (updater, patchOptions = {}) => {
      const next = queryCache.patch(queryKey, updater, {
        ttl,
        gcTime,
        meta,
        ...patchOptions,
      });
      lastDataRef.current = next;
      if (mountedRef.current) {
        setData(next);
      }
      return next;
    },
    [gcTime, meta, queryKey, ttl]
  );

  const entry = queryCache.peekEntry(queryKey);

  return {
    data,
    loading,
    refreshing,
    error,
    load,
    refresh: () => load({ force: true }),
    invalidate,
    patch,
    isFresh: queryCache.isFresh(queryKey, ttl),
    isStale: queryCache.isStale(queryKey, ttl),
    hasCache: !!entry,
    updatedAt: entry?.updatedAt ?? null,
  };
}
