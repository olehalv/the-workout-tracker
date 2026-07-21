import jwt, {
  type JwtHeader,
  type JwtPayload,
  type SigningKeyCallback,
  type VerifyErrors,
  type VerifyOptions,
} from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";
import { config } from "../config";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys";

const jwks = new JwksClient({
  jwksUri: APPLE_KEYS_URL,
  cache: true,
  cacheMaxAge: 24 * 60 * 60 * 1000,
  rateLimit: true,
});

function getSigningKey(header: JwtHeader, callback: SigningKeyCallback): void {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err || !key) {
      callback(err ?? new Error("Apple signing key not found"));
      return;
    }
    callback(null, key.getPublicKey());
  });
}

export interface AppleIdentity {
  /** Stable, unique Apple user id (the token `sub`). Use this as the account key. */
  appleUserId: string;
  email?: string;
  emailVerified?: boolean;
}

/**
 * Verifies a Sign in with Apple identity token (a JWT) against Apple's public
 * keys, and validates issuer + audience. Throws if the token is invalid.
 */
export function verifyAppleIdentityToken(identityToken: string): Promise<AppleIdentity> {
  const verifyOptions: VerifyOptions = {
    issuer: APPLE_ISSUER,
    algorithms: ["RS256"],
    ...(config.appleClientIds.length > 0
      ? { audience: config.appleClientIds as [string, ...string[]] }
      : {}),
  };

  return new Promise((resolve, reject) => {
    jwt.verify(
      identityToken,
      getSigningKey,
      verifyOptions,
      (err: VerifyErrors | null, decoded: string | JwtPayload | undefined) => {
        if (err || !decoded || typeof decoded === "string") {
          reject(err ?? new Error("Invalid Apple identity token"));
          return;
        }

        const sub = decoded.sub;
        if (!sub) {
          reject(new Error("Apple identity token is missing `sub`"));
          return;
        }

        const emailVerifiedClaim = (decoded as Record<string, unknown>).email_verified;
        resolve({
          appleUserId: sub,
          email: typeof decoded.email === "string" ? decoded.email : undefined,
          emailVerified:
            emailVerifiedClaim === true || emailVerifiedClaim === "true" ? true : undefined,
        });
      },
    );
  });
}
