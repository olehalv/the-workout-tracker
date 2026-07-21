import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { isAppleAuthAvailable } from "../auth/appleSignIn";
import { theme } from "../theme";

export function LoginScreen() {
  const { signInWithApple, isSigningIn } = useAuth();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    isAppleAuthAvailable()
      .then((value) => {
        if (!mounted) return;
        setAvailable(value);
        if (!value) {
          setUnavailableReason("isAvailableAsync() returned false");
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setAvailable(false);
        // A thrown error here usually means the native module isn't loaded
        // (e.g. a broken/stale bundle) rather than a genuine lack of support.
        setUnavailableReason(err instanceof Error ? err.message : String(err));
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSignIn = async () => {
    setError(null);
    try {
      await signInWithApple();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>The Workout Tracker</Text>
        <Text style={styles.subtitle}>Progressive overload, tracked.</Text>
      </View>

      <View style={styles.footer}>
        {available === null ? (
          <ActivityIndicator color={theme.colors.textMuted} />
        ) : available ? (
          <>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={theme.radius.sm}
              style={styles.appleButton}
              onPress={handleSignIn}
            />
            {isSigningIn ? (
              <ActivityIndicator style={styles.pending} color={theme.colors.textMuted} />
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.unavailable}>
              {Platform.OS === "ios"
                ? "Sign in with Apple isn't available right now."
                : "Sign in with Apple is only available on iOS."}
            </Text>
            {__DEV__ && unavailableReason ? (
              <Text style={styles.debug}>Reason: {unavailableReason}</Text>
            ) : null}
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space(6),
    paddingVertical: theme.space(16),
    justifyContent: "space-between",
  },
  header: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    color: theme.colors.text,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 16,
    marginTop: theme.space(2),
  },
  footer: {
    alignItems: "center",
  },
  appleButton: {
    width: "100%",
    height: 52,
  },
  pending: {
    marginTop: theme.space(4),
  },
  unavailable: {
    color: theme.colors.textMuted,
    fontSize: 15,
    textAlign: "center",
  },
  debug: {
    color: theme.colors.danger,
    fontSize: 12,
    textAlign: "center",
    marginTop: theme.space(2),
  },
  error: {
    color: theme.colors.danger,
    fontSize: 14,
    textAlign: "center",
    marginTop: theme.space(4),
  },
});
