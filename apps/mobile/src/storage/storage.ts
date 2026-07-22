import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Tiny JSON-over-AsyncStorage repository. All workout data lives on-device
 * (see CLAUDE.md). Kept behind these two helpers so the backing store can be
 * swapped (e.g. expo-sqlite) later without touching callers.
 */
export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best-effort persistence; a failed write shouldn't crash the app.
  }
}

export const STORAGE_KEYS = {
  workouts: "mwt.workouts.v1",
  library: "mwt.library.v1",
  presets: "mwt.presets.v1",
  settings: "mwt.settings.v1",
  active: "mwt.active.v1",
} as const;
