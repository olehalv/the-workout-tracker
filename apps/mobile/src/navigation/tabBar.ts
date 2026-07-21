import { isGlassEffectAPIAvailable } from "expo-glass-effect";
import { Platform } from "react-native";

/**
 * True only where the `UIGlassEffect` runtime API is actually present, so the tab
 * bar renders as a floating Liquid Glass capsule (see `AppTabs`). Everywhere else
 * it's `false` and the tab bar stays the opaque in-flow bar.
 *
 * We gate on `isGlassEffectAPIAvailable()` (not `isLiquidGlassAvailable()`): the
 * latter only reports that the binary adopts the Liquid Glass *design*, while the
 * former is the check the library requires before mounting `GlassView` /
 * `GlassContainer` — on runtimes where the effect API is missing they'd otherwise
 * fall back to empty transparent views (and can even crash). Evaluated once — this
 * doesn't change during a session.
 */
export const liquidGlassTabs = Platform.OS === "ios" && isGlassEffectAPIAvailable();

/**
 * Bottom clearance the tab screens must reserve when the glass tab bar floats
 * over their content (bar height + its bottom gap), so scroll content and the
 * Resume/Rest pills clear the floating capsule instead of hiding behind it.
 */
export const GLASS_TAB_BAR_CLEARANCE = 88;

/**
 * Drop-in scroll-content padding for the tab screens: reserves clearance under
 * the floating glass capsule on iOS 26+, and is `null` (no-op) everywhere else,
 * where the in-flow tab bar already takes its own space. Spread it into a
 * `contentContainerStyle` array.
 */
export const tabScrollClearance = liquidGlassTabs
  ? { paddingBottom: GLASS_TAB_BAR_CLEARANCE }
  : null;
