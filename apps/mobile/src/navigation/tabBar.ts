import { isGlassEffectAPIAvailable } from "expo-glass-effect";
import { Platform } from "react-native";

// Gate on isGlassEffectAPIAvailable() (not isLiquidGlassAvailable()): the latter
// only reports the binary adopts the Liquid Glass design, while this is the check
// the library requires before mounting GlassView/GlassContainer — without it they
// fall back to empty transparent views and can crash. Evaluated once per session.
export const liquidGlassTabs = Platform.OS === "ios" && isGlassEffectAPIAvailable();

// Clearance tab screens reserve when the glass bar floats over content (bar height + gap).
export const GLASS_TAB_BAR_CLEARANCE = 88;

// Scroll-content padding under the floating glass capsule; null (no-op) where the
// in-flow tab bar takes its own space. Spread into a contentContainerStyle array.
export const tabScrollClearance = liquidGlassTabs
  ? { paddingBottom: GLASS_TAB_BAR_CLEARANCE }
  : null;
