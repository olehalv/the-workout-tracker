/** Shared dark, minimal design tokens for the app. */
export const theme = {
  colors: {
    background: "#0A0A0A",
    surface: "#141414",
    border: "#262626",
    text: "#FFFFFF",
    textMuted: "#8A8A8E",
    accent: "#0A84FF",
    danger: "#FF453A",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  /** 4pt spacing scale. */
  space: (steps: number): number => steps * 4,
} as const;
