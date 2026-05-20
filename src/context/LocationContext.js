import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "LOBBI_USER_LOCATION";

const LocationContext = createContext({
  location: null,
  setLocation: () => {},
  clearLocation: () => {},
  loaded: false,
});

export function LocationProvider({ children }) {
  const [location, setLocationState] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val) {
          try { setLocationState(JSON.parse(val)); } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setLocation = useCallback(async (loc) => {
    setLocationState(loc);
    if (loc) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    }
  }, []);

  const clearLocation = useCallback(async () => {
    setLocationState(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  // Memoize so the provider doesn't hand out a new context-value object on
  // every render — keeps consumers (Header, profile screen) referentially
  // stable and prevents cascading re-renders.
  const value = useMemo(
    () => ({ location, setLocation, clearLocation, loaded }),
    [location, setLocation, clearLocation, loaded]
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}

export default LocationContext;
