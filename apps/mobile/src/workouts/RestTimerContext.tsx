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

export const DEFAULT_REST = 90;
export const REST_STEP = 15;

export interface RestTimer {
  running: boolean;
  remaining: number;
  duration: number;
  start: (seconds?: number) => void;
  skip: () => void;
  addTime: (delta: number) => void;
  setDuration: (seconds: number) => void;
}

const RestTimerContext = createContext<RestTimer | null>(null);

// Countdown driven by an end-timestamp (robust to timer drift); buzzes once on
// completion. Mounted above the workout screen and tab shell so it survives minimize.
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
