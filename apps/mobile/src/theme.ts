export const theme = {
  colors: {
    background: "#0A0A0A",
    surface: "#141414",
    border: "#262626",
    text: "#FFFFFF",
    textMuted: "#8A8A8E",
    accent: "#0A84FF",
    danger: "#FF453A",
    // Text/icons that sit on an accent (or otherwise saturated) fill.
    onAccent: "#FFFFFF",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  space: (steps: number): number => steps * 4,
} as const;
