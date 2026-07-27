import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAppleIdentityToken } from "@/server/auth/appleAuth";
import { issueSessionToken } from "@/server/auth/session";
import { upsertUserFromApple } from "@/server/db/users";
import { toPublicUser } from "@/server/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const appleLoginSchema = z.object({
  identityToken: z.string().min(1),
});

export async function POST(req: Request): Promise<NextResponse> {
  const body = await req.json().catch(() => null);
  const parsed = appleLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const identity = await verifyAppleIdentityToken(parsed.data.identityToken);
    const user = await upsertUserFromApple(identity);
    const session = issueSessionToken({ id: user.id, email: user.email });
    return NextResponse.json({
      token: session.token,
      expiresIn: session.expiresIn,
      user: toPublicUser(user),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "invalid_apple_token",
        message: err instanceof Error ? err.message : "Verification failed",
      },
      { status: 401 },
    );
  }
}
