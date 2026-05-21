import { createContext, useContext } from "react";

// Stub — venue app has no wishlist. EditProfileSheet imports useWishlist
// only for notifyChatRead; provide a no-op so the sheet compiles.
const WishlistContext = createContext({ notifyChatRead: () => {} });

export function WishlistProvider({ children }) {
  return <WishlistContext.Provider value={{ notifyChatRead: () => {} }}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  return useContext(WishlistContext);
}

export default WishlistContext;
