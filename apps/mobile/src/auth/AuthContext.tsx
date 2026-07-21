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
import { type AuthUser, fetchMe, verifyAppleLogin } from "../api/client";
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

  /**
   * Re-fetch the user from the server so a plan change made in /admin is picked
   * up without signing out. On an expired/rejected token we sign out; on a
   * network error we keep the cached user (offline).
   */
  const refreshUser = useCallback(
    async (activeToken: string) => {
      try {
        const fresh = await fetchMe(activeToken);
        if (fresh === null) {
          await signOut();
          return;
        }
        setUser(fresh);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(fresh));
      } catch {
        // Service unreachable — keep the cached user until next refresh.
      }
    },
    [signOut],
  );

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
          setUser(JSON.parse(storedUser) as AuthUser);
          // Pick up any server-side plan change since the app was last open.
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

  // Refresh whenever the app returns to the foreground, so an /admin plan toggle
  // shows up without a relaunch.
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
    () => ({ user, token, isRestoring, isSigningIn, signInWithApple, signOut }),
    [user, token, isRestoring, isSigningIn, signInWithApple, signOut],
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
