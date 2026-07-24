import * as SecureStore from "expo-secure-store";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState } from "react-native";
import {
  type AuthUser,
  deleteAccount as deleteAccountApi,
  fetchMe,
  normalizeUser,
  verifyAppleLogin,
} from "../api/client";
import { wipeAllData } from "../storage/storage";
import { AppleSignInCanceledError, requestAppleIdentityToken } from "./appleSignIn";

const TOKEN_KEY = "session_token";
const USER_KEY = "session_user";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isRestoring: boolean;
  isSigningIn: boolean;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  // Re-fetch the user + entitlement; the billing flow polls this after checkout.
  refresh: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const signOut = useCallback(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    setToken(null);
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (token) await deleteAccountApi(token);
    await wipeAllData();
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    setToken(null);
    setUser(null);
  }, [token]);

  // On an expired/rejected token we sign out; on a network error we keep the cached user.
  const refreshUser = useCallback(
    async (activeToken: string): Promise<AuthUser | null> => {
      try {
        const fresh = await fetchMe(activeToken);
        if (fresh === null) {
          await signOut();
          return null;
        }
        setUser(fresh);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(fresh));
        return fresh;
      } catch {
        // Unreachable — keep the cached user until next refresh.
        return null;
      }
    },
    [signOut],
  );

  const refresh = useCallback(async () => {
    if (!token) return null;
    return refreshUser(token);
  }, [token, refreshUser]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (active && storedToken && storedUser) {
          setToken(storedToken);
          // normalizeUser: a user cached before entitlement existed lacks the field
          // that the Pro gates read synchronously on first render.
          setUser(normalizeUser(JSON.parse(storedUser) as AuthUser));
          refreshUser(storedToken);
        }
      } finally {
        if (active) {
          setIsRestoring(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshUser]);

  // Refresh on foreground so an /admin plan toggle (or late webhook) shows up without a relaunch.
  useEffect(() => {
    if (!token) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshUser(token);
    });
    return () => sub.remove();
  }, [token, refreshUser]);

  const signInWithApple = useCallback(async () => {
    setIsSigningIn(true);
    try {
      const identityToken = await requestAppleIdentityToken();
      const session = await verifyAppleLogin(identityToken);
      await Promise.all([
        SecureStore.setItemAsync(TOKEN_KEY, session.token),
        SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user)),
      ]);
      setToken(session.token);
      setUser(session.user);
    } catch (err) {
      if (err instanceof AppleSignInCanceledError) {
        return;
      }
      throw err;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isRestoring,
      isSigningIn,
      signInWithApple,
      signOut,
      deleteAccount,
      refresh,
    }),
    [user, token, isRestoring, isSigningIn, signInWithApple, signOut, deleteAccount, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
