import jwt from "jsonwebtoken";
import { config } from "../config";

export interface SessionClaims {
  sub: string;
  email?: string;
}

/** Issues our own signed session JWT. `sub` is our DB user id. */
export function issueSessionToken(user: { id: string; email: string | null }): {
  token: string;
  expiresIn: string;
} {
  const claims: SessionClaims = {
    sub: user.id,
    ...(user.email ? { email: user.email } : {}),
  };

  const token = jwt.sign(claims, config.jwtSecret, {
    issuer: config.jwtIssuer,
    expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });

  return { token, expiresIn: config.jwtExpiresIn };
}

export function verifySessionToken(token: string): SessionClaims {
  const decoded = jwt.verify(token, config.jwtSecret, {
    issuer: config.jwtIssuer,
  });
  if (typeof decoded === "string") {
    throw new Error("Invalid session token");
  }
  return { sub: String(decoded.sub), email: decoded.email as string | undefined };
}
