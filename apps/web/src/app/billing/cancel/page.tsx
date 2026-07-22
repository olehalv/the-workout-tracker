import type { Metadata } from "next";
import { config } from "@/server/config";

export const metadata: Metadata = {
  title: "Checkout canceled — The Workout Tracker",
  description: "No charge was made.",
  robots: { index: false, follow: false },
};

/** Where Stripe sends the user if they back out of checkout. Nothing changed. */
export default function BillingCancelPage() {
  const returnUrl = `${config.appScheme}://billing/return`;

  return (
    <div className="flex min-h-full items-center justify-center bg-black px-6 py-20 text-white">
      <main className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold tracking-tight">Checkout canceled</h1>
        <p className="mt-3 text-[15px] leading-7 text-zinc-400">
          No charge was made. You can subscribe any time from the Me tab in the app.
        </p>

        <a
          href={returnUrl}
          className="mt-8 inline-flex w-full items-center justify-center rounded-xl border border-zinc-800 px-6 py-4 text-[15px] font-semibold text-white transition hover:bg-zinc-900"
        >
          Back to The Workout Tracker
        </a>
      </main>
    </div>
  );
}
