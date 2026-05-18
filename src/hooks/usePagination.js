import { useCallback, useEffect, useRef, useState } from "react";

export default function usePagination(fetchFn, { pageSize = 20, deps = [] } = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchPage = useCallback(async (page, isRefresh = false) => {
    try {
      const result = await fetchFn(page, pageSize);
      if (!mountedRef.current) return;
      const items = Array.isArray(result) ? result : result?.data || result?.items || [];
      if (isRefresh || page === 1) {
        setData(items);
      } else {
        setData((prev) => {
          const ids = new Set(prev.map((i) => i.id || i._id));
          const unique = items.filter((i) => !ids.has(i.id || i._id));
          return [...prev, ...unique];
        });
      }
      setHasMore(items.length >= pageSize);
    } catch {
      if (page === 1 && mountedRef.current) setData([]);
    }
  }, [fetchFn, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    pageRef.current = 1;
    await fetchPage(1);
    setLoading(false);
  }, [fetchPage]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    pageRef.current = 1;
    await fetchPage(1, true);
    setRefreshing(false);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    pageRef.current += 1;
    await fetchPage(pageRef.current);
  }, [hasMore, fetchPage]);

  useEffect(() => {
    load();
  }, deps);

  return { data, loading, refreshing, hasMore, loadMore, refresh, setData };
}
