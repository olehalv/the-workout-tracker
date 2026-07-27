export const theme = {
  colors: {
    background: "#0A0A0A",
    surface: "#141414",
    border: "#262626",
    text: "#FFFFFF",
    textMuted: "#8A8A8E",
    accent: "#0A84FF",
    danger: "#FF453A",
    onAccent: "#FFFFFF",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  space: (steps: number): number => steps * 4,
  gutter: 16,
} as const;
