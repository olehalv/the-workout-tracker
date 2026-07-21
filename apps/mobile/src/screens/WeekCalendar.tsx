import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { theme } from "../theme";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** How far back the calendar can page — roughly one year of weeks. */
const MAX_WEEKS = 52;

/** Local calendar-day key (year-month-day) for grouping timestamps by date. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Midnight on the Sunday that begins the week containing `date`. */
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** The seven day-dates of the week `weeksBack` weeks before the current week. */
function weekDays(currentWeekStart: Date, weeksBack: number): Date[] {
  const start = new Date(currentWeekStart);
  start.setDate(currentWeekStart.getDate() - weeksBack * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/**
 * Paged week strip. Each page is one full week; the current week shows first and
 * swiping right pages one week further back in time. Weeks are loaded lazily — one
 * more each time you page back — up to {@link MAX_WEEKS} (~a year), so we never
 * build a year of cells at once.
 */
export function WeekCalendar({
  selectedKey,
  marked,
  onSelect,
}: {
  selectedKey: string;
  marked: Set<string>;
  onSelect: (ts: number) => void;
}) {
  const [width, setWidth] = useState(0);
  // How many weeks are currently loaded (index 0 = current week, growing back).
  const [count, setCount] = useState(2);

  const currentWeekStart = useMemo(() => startOfWeek(new Date()), []);
  // data[i] = "weeks back" for page i.
  const data = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

  // As the user pages back, keep one page ahead loaded (capped at a year).
  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width <= 0) return;
      const idx = Math.round(e.nativeEvent.contentOffset.x / width);
      setCount((c) => Math.min(MAX_WEEKS, Math.max(c, idx + 2)));
    },
    [width],
  );

  const renderItem = useCallback(
    ({ item: weeksBack }: { item: number }) => (
      <View style={[styles.page, { width }]}>
        {weekDays(currentWeekStart, weeksBack).map((d) => {
          const key = dayKey(d.getTime());
          const selected = key === selectedKey;
          const has = marked.has(key);
          const future = d.getTime() > Date.now();
          return (
            <Pressable
              key={key}
              disabled={future}
              style={[styles.cell, selected && styles.cellSelected, future && styles.cellFuture]}
              onPress={() => onSelect(d.getTime())}
            >
              <Text
                style={[
                  styles.weekday,
                  selected && styles.textSelected,
                  future && styles.textFuture,
                ]}
              >
                {WEEKDAYS[d.getDay()]}
              </Text>
              <Text
                style={[styles.day, selected && styles.textSelected, future && styles.textFuture]}
              >
                {d.getDate()}
              </Text>
              <View
                style={[styles.dot, has && styles.dotOn, selected && has && styles.dotOnSelected]}
              />
            </Pressable>
          );
        })}
      </View>
    ),
    [width, currentWeekStart, selectedKey, marked, onSelect],
  );

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <FlatList
          data={data}
          horizontal
          inverted
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(weeksBack) => String(weeksBack)}
          renderItem={renderItem}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={onScrollEnd}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={3}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Keep the strip content-height instead of filling the column.
  wrap: {
    flexGrow: 0,
  },
  page: {
    flexDirection: "row",
    gap: theme.space(2),
    paddingVertical: theme.space(1),
  },
  cell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.space(2),
    borderRadius: theme.radius.md,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.surface,
    gap: theme.space(1),
  },
  cellSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  cellFuture: {
    opacity: 0.35,
  },
  weekday: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  day: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  textSelected: {
    color: "#FFFFFF",
  },
  textFuture: {
    color: theme.colors.textMuted,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "transparent",
  },
  dotOn: {
    backgroundColor: theme.colors.accent,
  },
  dotOnSelected: {
    backgroundColor: "#FFFFFF",
  },
});
