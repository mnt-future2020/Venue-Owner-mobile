import { createContext, useCallback, useMemo, useState } from "react";

const TabRefreshContext = createContext({
  triggerRefresh: () => {},
  refreshSignals: {},
});

export function TabRefreshProvider({ children }) {
  const [refreshSignals, setRefreshSignals] = useState({});

  const triggerRefresh = useCallback((tabName) => {
    if (!tabName) return;
    setRefreshSignals((prev) => ({
      ...prev,
      [tabName]: (prev[tabName] || 0) + 1,
    }));
  }, []);

  const value = useMemo(
    () => ({
      triggerRefresh,
      refreshSignals,
    }),
    [refreshSignals, triggerRefresh]
  );

  return <TabRefreshContext.Provider value={value}>{children}</TabRefreshContext.Provider>;
}

export default TabRefreshContext;
