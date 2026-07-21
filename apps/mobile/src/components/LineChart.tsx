import { useState } from "react";
import { type LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

export interface LinePoint {
  key: string;
  label: string;
  value: number;
}

/**
 * Minimal progression line chart built from plain Views — no SVG/charting
 * dependency, so it renders identically in Expo Go. Each segment is a thin View
 * placed at the midpoint of two points and rotated about its own center (so no
 * `transformOrigin` is needed). The most recent point is emphasized.
 */
export function LineChart({ data, height = 160 }: { data: LinePoint[]; height?: number }) {
  const [w, setW] = useState(0);

  if (data.length === 0) return null;

  const values = data.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;
  const n = data.length;

  // Vertical padding leaves room for dots + value labels near the edges.
  const padTop = 22;
  const padBottom = 10;
  const usableH = Math.max(1, height - padTop - padBottom);

  const xOf = (i: number) => (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const yOf = (v: number) =>
    range === 0 ? padTop + usableH / 2 : padTop + (1 - (v - min) / range) * usableH;

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  return (
    <View>
      <View style={[styles.plot, { height }]} onLayout={onLayout}>
        {w > 0 &&
          data.map((d, i) => {
            if (i === 0) return null;
            const x1 = xOf(i - 1);
            const y1 = yOf(values[i - 1]);
            const x2 = xOf(i);
            const y2 = yOf(values[i]);
            const len = Math.hypot(x2 - x1, y2 - y1);
            const angle = Math.atan2(y2 - y1, x2 - x1);
            return (
              <View
                key={`seg-${d.key}`}
                style={[
                  styles.segment,
                  {
                    width: len,
                    left: (x1 + x2) / 2 - len / 2,
                    top: (y1 + y2) / 2 - 1,
                    transform: [{ rotateZ: `${angle}rad` }],
                  },
                ]}
              />
            );
          })}

        {w > 0 &&
          data.map((d, i) => {
            const last = i === n - 1;
            const size = last ? 10 : 6;
            const cx = xOf(i);
            const cy = yOf(d.value);
            const labelLeft = Math.min(Math.max(cx - 20, 0), Math.max(w - 40, 0));
            return (
              <View key={d.key}>
                <View style={[styles.labelWrap, { left: labelLeft, top: cy - 20 }]}>
                  <Text style={styles.valueLabel}>{d.value}</Text>
                </View>
                <View
                  style={[
                    styles.dot,
                    last && styles.dotLast,
                    {
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      left: cx - size / 2,
                      top: cy - size / 2,
                    },
                  ]}
                />
              </View>
            );
          })}
      </View>

      <View style={styles.xRow}>
        <Text style={styles.xLabel}>{data[0].label}</Text>
        {n > 1 ? <Text style={styles.xLabel}>{data[n - 1].label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    position: "relative",
  },
  segment: {
    position: "absolute",
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.colors.accent,
  },
  dot: {
    position: "absolute",
    backgroundColor: theme.colors.accent,
  },
  dotLast: {
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  labelWrap: {
    position: "absolute",
    width: 40,
    alignItems: "center",
  },
  valueLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  xRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.space(2),
  },
  xLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
});
