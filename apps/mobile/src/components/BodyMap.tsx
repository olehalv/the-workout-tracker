import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { theme } from "../theme";
import type { MuscleActivity } from "../workouts/muscleStats";
import type { Sex } from "../workouts/strengthStandards";
import { type BodyFigure, FEMALE, MALE } from "./bodyMapData";

const BASE = "#2C2F36"; // untrained muscle fill
const HOT = theme.colors.accent; // most-trained
const BODY = "#2A2D34";
const NEUTRAL = "#3A3D44"; // non-muscle anatomy
const NEUTRAL_FILL: Record<string, string> = { hair: "#2E313A" }; // per-slug overrides of NEUTRAL
const OUTLINE = "#6A7079";
const SEAM = "#454A54";

// Library muscle slug → our muscle group(s), taking the hottest contributor. The
// library has no separate "lats" path, so its "upper-back" covers Upper Back + Lats;
// abs+obliques → Core; tibialis → Calves. Unlisted slugs (head, hands, …) stay neutral.
const SLUG_TO_GROUPS: Record<string, string[]> = {
  chest: ["Chest"],
  deltoids: ["Shoulders"],
  biceps: ["Biceps"],
  triceps: ["Triceps"],
  forearm: ["Forearms"],
  abs: ["Core"],
  obliques: ["Core"],
  quadriceps: ["Quads"],
  adductors: ["Quads", "Hamstrings"],
  tibialis: ["Calves"],
  calves: ["Calves"],
  trapezius: ["Traps"],
  "upper-back": ["Upper Back", "Lats"],
  "lower-back": ["Lower Back"],
  gluteal: ["Glutes"],
  hamstring: ["Hamstrings"],
};

function lerpHex(a: string, b: string, t: number): string {
  const ai = Number.parseInt(a.slice(1), 16);
  const bi = Number.parseInt(b.slice(1), 16);
  const r = Math.round(((ai >> 16) & 255) + (((bi >> 16) & 255) - ((ai >> 16) & 255)) * t);
  const g = Math.round(((ai >> 8) & 255) + (((bi >> 8) & 255) - ((ai >> 8) & 255)) * t);
  const bl = Math.round((ai & 255) + ((bi & 255) - (ai & 255)) * t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

function regionFill(slug: string, activity: MuscleActivity): string {
  const groups = SLUG_TO_GROUPS[slug];
  if (!groups) return NEUTRAL_FILL[slug] ?? NEUTRAL;
  const sets = groups.reduce((m, g) => Math.max(m, activity.byGroup[g]?.sets ?? 0), 0);
  if (sets === 0 || activity.maxSets === 0) return BASE;
  // Lift low values so any trained muscle is clearly warmer than untrained.
  const t = 0.28 + 0.72 * Math.sqrt(sets / activity.maxSets);
  return lerpHex(BASE, HOT, Math.min(1, t));
}

// Pad the viewBox so the outline stroke at the figure's edges isn't clipped.
function padViewBox(viewBox: string): string {
  const [x, y, w, h] = viewBox.split(/\s+/).map(Number);
  const p = h * 0.02;
  return `${x - p} ${y - p} ${w + 2 * p} ${h + 2 * p}`;
}

export function heatRamp(steps: number): string[] {
  return Array.from({ length: steps }, (_, i) => lerpHex(BASE, HOT, i / (steps - 1)));
}

function Figure({
  figure,
  label,
  activity,
}: {
  figure: BodyFigure;
  label: string;
  activity: MuscleActivity;
}) {
  return (
    <View style={styles.figure}>
      <View style={styles.svgWrap}>
        <Svg
          width="100%"
          height="100%"
          viewBox={padViewBox(figure.viewBox)}
          preserveAspectRatio="xMidYMid meet"
        >
          <Path d={figure.outline} fill={BODY} />
          {figure.regions.map((region) => {
            const fill = regionFill(region.slug, activity);
            return (
              <Fragment key={region.slug}>
                {region.paths.map((d) => (
                  <Path
                    key={d}
                    d={d}
                    fill={fill}
                    stroke={SEAM}
                    strokeWidth={1.1}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </Fragment>
            );
          })}
          <Path
            d={figure.outline}
            fill="none"
            stroke={OUTLINE}
            strokeWidth={2.2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </Svg>
      </View>
      <Text style={styles.figureLabel}>{label}</Text>
    </View>
  );
}

export function BodyMap({ activity, sex }: { activity: MuscleActivity; sex: Sex }) {
  const figures = sex === "female" ? FEMALE : MALE;
  return (
    <View style={styles.row}>
      <Figure figure={figures.front} label="Front" activity={activity} />
      <Figure figure={figures.back} label="Back" activity={activity} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: theme.space(4),
  },
  figure: {
    flex: 1,
    alignItems: "center",
  },
  svgWrap: {
    width: "100%",
    aspectRatio: 0.5,
  },
  figureLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: theme.space(2),
  },
});
