import type { Metadata } from "next";
import { config } from "@/server/config";

export const metadata: Metadata = {
  title: "You're Pro — The Workout Tracker",
  description: "Your subscription is active.",
  // Return pages are per-user dead ends; keep them out of search results.
  robots: { index: false, follow: false },
};

/**
 * Where Stripe Checkout sends the user after paying. This page is cosmetic —
 * the entitlement is granted by the webhook, not by anyone reaching this URL.
 * Its real job is the deep link back into the app.
 */
export default function BillingSuccessPage() {
  const returnUrl = `${config.appScheme}://billing/return`;

  return (
    <div className="flex min-h-full items-center justify-center bg-black px-6 py-20 text-white">
      <main className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl">
          🎉
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">You're Pro</h1>
        <p className="mt-3 text-[15px] leading-7 text-zinc-400">
          Your subscription is active. Head back to the app — charts, full history, the muscle map
          and strength ratings are all unlocked.
        </p>

        <a
          href={returnUrl}
          className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-4 text-[15px] font-semibold text-black transition hover:bg-zinc-200"
        >
          Back to The Workout Tracker
        </a>

        <p className="mt-4 text-sm text-zinc-500">
          You can close this window if the app doesn't open automatically.
        </p>
      </main>
    </div>
  );
}
