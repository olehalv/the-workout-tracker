import * as AppleAuthentication from "expo-apple-authentication";

export class AppleSignInCanceledError extends Error {
  constructor() {
    super("Apple sign-in was canceled.");
    this.name = "AppleSignInCanceledError";
  }
}

export function isAppleAuthAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync();
}

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
