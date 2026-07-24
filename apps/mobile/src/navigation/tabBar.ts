// The native tab bar (UITabBarController) auto-insets scroll content on iOS, so tab
// screens need no manual bottom clearance. Kept as a no-op so the screens that spread
// it into their contentContainerStyle don't need to change.
export const tabScrollClearance = null;
