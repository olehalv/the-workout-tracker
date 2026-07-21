import { redirect } from "next/navigation";
import { adminConfigured, isAdminAuthed } from "@/server/auth/adminAuth";
import { adminLogin } from "../actions";

export const dynamic = "force-dynamic";

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Already signed in → straight to the dashboard.
  if (await isAdminAuthed()) {
    redirect("/admin");
  }

  const configured = adminConfigured();
  const error = first((await searchParams).error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-neutral-100">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
        <h1 className="text-xl font-semibold tracking-tight">Admin sign in</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Enter the admin password to access the dashboard.
        </p>

        {!configured ? (
          <p className="mt-6 rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-300">
            No admin password is configured. Set <code>ADMIN_PASSWORD</code> in the web app&apos;s
            <code> .env</code> and restart the server.
          </p>
        ) : (
          <form action={adminLogin} className="mt-6 flex flex-col gap-3">
            {error && (
              <p className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-400">
                Incorrect password.
              </p>
            )}
            <input
              type="password"
              name="password"
              required
              placeholder="Password"
              aria-label="Admin password"
              className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-neutral-600"
            />
            <button
              type="submit"
              className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
            >
              Sign in
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
