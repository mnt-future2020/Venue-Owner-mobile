import { createContext } from "react";

const SwipeTabContext = createContext({
  /** true when the screen is inside the tab pager */
  inPager: false,
  /** current pager page index (0-4) */
  activeIndex: 0,
  /** whether the parent tab pager swipe is enabled */
  pagerSwipeEnabled: true,
  /** programmatically jump to a tab */
  goToTab: (_index) => {},
  /** enable/disable parent pager swipe */
  setPagerSwipeEnabled: (_enabled) => {},
  /** open the side drawer */
  openDrawer: () => {},
  /** whether the drawer is open (set by swipe gesture) */
  drawerOpen: false,
  /** reset drawer open flag */
  setDrawerOpen: (_open) => {},
  /** notify shared header of scroll position */
  onContentScroll: (_offsetY) => {},
  /** shared header height */
  headerHeight: 0,
});

export default SwipeTabContext;
