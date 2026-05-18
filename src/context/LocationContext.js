import { createContext, useCallback, useContext, useEffect, useState } from "react";
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

  return (
    <LocationContext.Provider value={{ location, setLocation, clearLocation, loaded }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}

export default LocationContext;
