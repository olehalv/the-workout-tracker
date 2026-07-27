import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { CloudStorage, CloudStorageScope } from "react-native-cloud-storage";

export const STORAGE_KEYS = {
  workouts: "mwt.workouts.v1",
  library: "mwt.library.v1",
  presets: "mwt.presets.v1",
  settings: "mwt.settings.v1",
  active: "mwt.active.v1",
} as const;

const SYNCED_KEYS = new Set<string>([
  STORAGE_KEYS.workouts,
  STORAGE_KEYS.library,
  STORAGE_KEYS.presets,
  STORAGE_KEYS.settings,
]);

const CLOUD_SCOPE = CloudStorageScope.AppData;
const cloudPath = (key: string) => `/${key}.json`;
const CLOUD_WRITE_DEBOUNCE_MS = 800;

type Envelope<T> = { __mwtEnvelope: 1; updatedAt: number; data: T };

function wrap<T>(data: T, updatedAt: number): Envelope<T> {
  return { __mwtEnvelope: 1, updatedAt, data };
}

function isEnvelope<T>(value: unknown): value is Envelope<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { __mwtEnvelope?: unknown }).__mwtEnvelope === 1
  );
}

function parseEnvelope<T>(raw: string): Envelope<T> {
  const parsed = JSON.parse(raw);
  return isEnvelope<T>(parsed) ? parsed : wrap(parsed as T, 0);
}

const cloudEnabled = Platform.OS === "ios";

const CLOUD_TIMEOUT_MS = 8_000;
const TIMED_OUT = Symbol("cloud-timeout");

let cloudStalled = false;

async function runCloud<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  const result = await Promise.race([
    work().catch(() => fallback),
    new Promise<typeof TIMED_OUT>((resolve) => {
      setTimeout(() => resolve(TIMED_OUT), CLOUD_TIMEOUT_MS);
    }),
  ]);
  if (result === TIMED_OUT) {
    cloudStalled = true;
    return fallback;
  }
  return result;
}

let availabilityCache: { value: boolean; at: number } | null = null;
const AVAILABILITY_TTL_MS = 15_000;

async function cloudAvailable(): Promise<boolean> {
  if (!cloudEnabled || cloudStalled) return false;
  const now = Date.now();
  if (availabilityCache && now - availabilityCache.at < AVAILABILITY_TTL_MS) {
    return availabilityCache.value;
  }
  const value = await runCloud(() => CloudStorage.isCloudAvailable(), false);
  availabilityCache = { value, at: now };
  return value;
}

async function readLocal<T>(key: string): Promise<Envelope<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? null : parseEnvelope<T>(raw);
  } catch {
    return null;
  }
}

async function writeLocal<T>(key: string, env: Envelope<T>): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(env));
  } catch {}
}

async function readCloud<T>(key: string): Promise<Envelope<T> | null> {
  if (!(await cloudAvailable())) return null;
  return runCloud<Envelope<T> | null>(async () => {
    if (!(await CloudStorage.exists(cloudPath(key), CLOUD_SCOPE))) return null;
    return parseEnvelope<T>(await CloudStorage.readFile(cloudPath(key), CLOUD_SCOPE));
  }, null);
}

async function writeCloud<T>(key: string, env: Envelope<T>): Promise<void> {
  if (!(await cloudAvailable())) return;
  await runCloud<void>(
    () => CloudStorage.writeFile(cloudPath(key), JSON.stringify(env), CLOUD_SCOPE),
    undefined,
  );
}

const pendingCloudWrites = new Map<string, ReturnType<typeof setTimeout>>();

function writeCloudDebounced<T>(key: string, env: Envelope<T>): void {
  const existing = pendingCloudWrites.get(key);
  if (existing) clearTimeout(existing);
  pendingCloudWrites.set(
    key,
    setTimeout(() => {
      pendingCloudWrites.delete(key);
      void writeCloud(key, env);
    }, CLOUD_WRITE_DEBOUNCE_MS),
  );
}

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  const synced = SYNCED_KEYS.has(key);
  const [local, cloud] = await Promise.all([
    readLocal<T>(key),
    synced ? readCloud<T>(key) : Promise.resolve(null),
  ]);

  if (cloud && (!local || local.updatedAt < cloud.updatedAt)) {
    await writeLocal(key, cloud);
    return cloud.data;
  }

  if (!local) return fallback;

  if (synced && (!cloud || cloud.updatedAt < local.updatedAt)) {
    void writeCloud(key, local);
  }
  return local.data;
}

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  const env = wrap(value, Date.now());
  await writeLocal(key, env);
  if (SYNCED_KEYS.has(key)) writeCloudDebounced(key, env);
}

export function isCloudBackupAvailable(): Promise<boolean> {
  return cloudAvailable();
}

export async function wipeAllData(): Promise<void> {
  for (const timer of pendingCloudWrites.values()) clearTimeout(timer);
  pendingCloudWrites.clear();

  const keys = Object.values(STORAGE_KEYS);
  await AsyncStorage.multiRemove(keys).catch(() => {});

  if (await cloudAvailable()) {
    await runCloud<void>(async () => {
      await Promise.all(
        keys
          .filter((key) => SYNCED_KEYS.has(key))
          .map((key) => CloudStorage.unlink(cloudPath(key), CLOUD_SCOPE).catch(() => {})),
      );
    }, undefined);
  }
}
