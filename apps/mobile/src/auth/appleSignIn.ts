import * as AppleAuthentication from "expo-apple-authentication";

/** Thrown when the user dismisses the Apple sign-in sheet. */
export class AppleSignInCanceledError extends Error {
  constructor() {
    super("Apple sign-in was canceled.");
    this.name = "AppleSignInCanceledError";
  }
}

/** Whether Sign in with Apple is available on this device (iOS 13+). */
export function isAppleAuthAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync();
}

/**
 * Triggers the native Sign in with Apple flow and returns the identity token
 * (a JWT) to send to the backend. Throws AppleSignInCanceledError on dismissal.
 */
export async function requestAppleIdentityToken(): Promise<string> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error("Apple did not return an identity token.");
    }
    return credential.identityToken;
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ERR_REQUEST_CANCELED") {
      throw new AppleSignInCanceledError();
    }
    throw err;
  }
}
