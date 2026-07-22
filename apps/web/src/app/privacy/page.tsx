import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — The Workout Tracker",
  description: "How The Workout Tracker handles your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-full bg-black text-white">
      <main className="mx-auto w-full max-w-2xl px-6 py-20">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Back
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated: July 2026</p>

        <div className="mt-8 flex flex-col gap-6 text-[15px] leading-7 text-zinc-300">
          <p>
            The Workout Tracker is built to keep your training data yours. This policy explains what
            we store and why.
          </p>

          <section>
            <h2 className="text-lg font-semibold text-white">Your workout data stays on device</h2>
            <p className="mt-2">
              Every workout, exercise, set, note, template, and progress statistic is stored{" "}
              <strong>locally on your phone</strong>. We do not upload, sync, or back up your
              training history to our servers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Your account</h2>
            <p className="mt-2">
              To sign in, we use Sign in with Apple. The only data we keep on our servers is your
              account: a unique identifier provided by Apple, your email address (if you choose to
              share it), and your subscription plan. We never receive your Apple password.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">How we use it</h2>
            <p className="mt-2">
              Account data is used solely to authenticate you and manage your plan. We do not sell
              your data, and we do not use it for advertising.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Payments</h2>
            <p className="mt-2">
              If you subscribe to Pro, payment is handled by <strong>Stripe</strong>. Your card
              details go directly to Stripe and are <strong>never seen or stored by us</strong> — we
              only keep a Stripe customer reference, your plan, and when the current period ends.
              When a subscription is created we share your email address with Stripe so they can
              issue receipts. Their handling of that data is covered by{" "}
              <a
                href="https://stripe.com/privacy"
                className="underline hover:text-white"
                target="_blank"
                rel="noreferrer"
              >
                Stripe&rsquo;s privacy policy
              </a>
              . The free trial requires no payment details at all.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Deleting your data</h2>
            <p className="mt-2">
              Uninstalling the app removes all on-device workout data. To delete your account,
              contact us and we will remove your account record.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Contact</h2>
            <p className="mt-2">
              Questions about privacy? Reach us at{" "}
              <a href="mailto:ole2005morten@outlook.com" className="text-white underline">
                ole2005morten@outlook.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
