import { useEffect, useState } from "react";

/** Elapsed ms between a start and an end (defaults to now). Never negative. */
export function elapsedMs(startedAt: number, end: number = Date.now()): number {
  return Math.max(0, end - startedAt);
}

/** Stopwatch clock for a live timer: "M:SS" under an hour, "H:MM:SS" beyond. */
export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/** Human duration for a finished workout: "45 min", "1h 12m", "1h". */
export function formatDuration(ms: number): string {
  const totalMin = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Wall-clock time of day, e.g. "14:32". */
export function formatTimeOfDay(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/**
 * A `Date.now()` that re-renders every `intervalMs` while `active`, for live
 * timers (workout elapsed, etc.). Ticks stop when `active` is false so a
 * backgrounded/finished workout doesn't keep the interval alive.
 */
export function useNow(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}
