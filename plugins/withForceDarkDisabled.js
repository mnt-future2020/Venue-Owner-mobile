// Expo config plugin: inject `android:forceDarkAllowed=false` into the
// generated Android theme XML at EAS build time so OEM-level "Force Dark"
// features (MIUI / HyperOS on Xiaomi, OneUI on Samsung, ColorOS on Oppo,
// Realme UI, etc.) cannot invert our app's colors when the user has
// System Dark Mode switched on.
//
// IMPORTANT: parent-agnostic. We find the existing `AppTheme` style block
// by NAME only and patch it in place. Hardcoding a parent value (e.g.
// `Theme.AppCompat.Light.NoActionBar`) would break in SDK 53+ where Expo
// switched the default parent to `Theme.EdgeToEdge`, and in older SDKs
// where the parent is `Theme.AppCompat.DayNight.NoActionBar`. By touching
// only the item list we stay compatible across every SDK version.
//
// Android attribute docs:
//   https://developer.android.com/develop/ui/views/theming/darktheme#force_dark

const { withAndroidStyles } = require("@expo/config-plugins");

const ATTR = "android:forceDarkAllowed";
const VALUE = "false";

const withForceDarkDisabled = (config) => {
  return withAndroidStyles(config, (cfg) => {
    const styles = cfg.modResults;

    // Defensive: schema may differ slightly across SDKs. Make sure the
    // basic structure exists before we touch anything.
    if (!styles?.resources?.style) return cfg;

    const appTheme = styles.resources.style.find(
      (s) => s.$ && s.$.name === "AppTheme"
    );
    if (!appTheme) {
      // No AppTheme block to patch — Expo prebuild would normally generate
      // one. If it really is missing we silently bail rather than
      // fabricating one with a wrong parent.
      return cfg;
    }

    if (!Array.isArray(appTheme.item)) appTheme.item = [];

    const existing = appTheme.item.find(
      (i) => i.$ && i.$.name === ATTR
    );
    if (existing) {
      existing._ = VALUE;
    } else {
      appTheme.item.push({ _: VALUE, $: { name: ATTR } });
    }

    return cfg;
  });
};

module.exports = withForceDarkDisabled;
