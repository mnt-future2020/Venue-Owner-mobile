const NAV_LOCK_MS = 180;

function normalizeTarget(target) {
  if (typeof target !== "string") return "";
  return target.trim();
}

class NavigationGuard {
  constructor() {
    this.lastTarget = "";
    this.lastTs = 0;
    this.lastAction = "";
    this.locked = false;
    this.unlockTimer = null;
  }

  canNavigate(target, options = {}) {
    const route = normalizeTarget(target);
    const action = options.action || "push";
    const now = Date.now();
    const cooldown =
      options.cooldownMs ??
      (action === "replace" ? 120 : action === "open" ? 80 : NAV_LOCK_MS);
    const dedupeKey = `${action}:${route}`;

    if (this.locked && !options.allowWhileLocked) return false;

    if (route && this.lastTarget === dedupeKey && now - this.lastTs < cooldown) {
      return false;
    }

    this.lastTarget = dedupeKey;
    this.lastAction = action;
    this.lastTs = now;
    this.lock(cooldown);
    return true;
  }

  lock(duration = NAV_LOCK_MS) {
    this.locked = true;
    if (this.unlockTimer) clearTimeout(this.unlockTimer);
    this.unlockTimer = setTimeout(() => {
      this.locked = false;
      this.unlockTimer = null;
    }, duration);
  }

  completeSoon(duration = 90) {
    this.lock(duration);
  }

  reset() {
    this.lastTarget = "";
    this.lastAction = "";
    this.lastTs = 0;
    this.locked = false;
    if (this.unlockTimer) {
      clearTimeout(this.unlockTimer);
      this.unlockTimer = null;
    }
  }
}

const navigationGuard = new NavigationGuard();

function runNavigation(executor, target, options = {}) {
  if (!navigationGuard.canNavigate(target, options)) return false;
  try {
    executor();
    navigationGuard.completeSoon(options.postActionLockMs ?? 90);
    return true;
  } catch {
    navigationGuard.reset();
    return false;
  }
}

export function safePush(router, route, options = {}) {
  if (!router || !route) return false;
  return runNavigation(() => router.push(route), route, { ...options, action: "push" });
}

export function safeReplace(router, route, options = {}) {
  if (!router || !route) return false;
  return runNavigation(() => router.replace(route), route, { ...options, action: "replace" });
}

export function safeOpen(opener, options = {}) {
  if (typeof opener !== "function") return false;
  const key = options.key || "modal:open";
  return runNavigation(() => opener(), key, { ...options, action: "open" });
}

export function resetNavigationGuard() {
  navigationGuard.reset();
}

export default navigationGuard;
