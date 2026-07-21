import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Vibration } from "react-native";

/** Default rest length (seconds) and the ± adjustment step. */
export const DEFAULT_REST = 90;
export const REST_STEP = 15;

export interface RestTimer {
  /** True while a rest is counting down. */
  running: boolean;
  /** Whole seconds left in the current rest. */
  remaining: number;
  /** Configured length (seconds) for the next rest. */
  duration: number;
  /** Start (or restart) a rest for `seconds`, defaulting to `duration`. */
  start: (seconds?: number) => void;
  /** End the current rest immediately. */
  skip: () => void;
  /** Extend/shorten the running rest by `delta` seconds. */
  addTime: (delta: number) => void;
  /** Set the length used for the next rest (when idle). */
  setDuration: (seconds: number) => void;
}

const RestTimerContext = createContext<RestTimer | null>(null);

/**
 * Rest countdown driven by an end-timestamp (robust to timer drift). Buzzes once
 * when a rest completes. Lives above the workout screen and the tab shell, so the
 * countdown keeps running when the workout is minimized and is still there on
 * resume.
 */
export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [duration, setDurationState] = useState(DEFAULT_REST);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) {
        setEndsAt(null);
        Vibration.vibrate();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const start = useCallback(
    (seconds?: number) => {
      const secs = Math.max(REST_STEP, seconds ?? duration);
      setDurationState(secs);
      setRemaining(secs);
      setEndsAt(Date.now() + secs * 1000);
    },
    [duration],
  );

  const skip = useCallback(() => {
    setEndsAt(null);
    setRemaining(0);
  }, []);

  const addTime = useCallback((delta: number) => {
    setEndsAt((prev) => (prev === null ? prev : Math.max(Date.now() + 1000, prev + delta * 1000)));
  }, []);

  const setDuration = useCallback((seconds: number) => {
    setDurationState(Math.max(REST_STEP, seconds));
  }, []);

  const value = useMemo<RestTimer>(
    () => ({ running: endsAt !== null, remaining, duration, start, skip, addTime, setDuration }),
    [endsAt, remaining, duration, start, skip, addTime, setDuration],
  );

  return <RestTimerContext.Provider value={value}>{children}</RestTimerContext.Provider>;
}

export function useRestTimer(): RestTimer {
  const ctx = useContext(RestTimerContext);
  if (!ctx) {
    throw new Error("useRestTimer must be used within a RestTimerProvider");
  }
  return ctx;
}
