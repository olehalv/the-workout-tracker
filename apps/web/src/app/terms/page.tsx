import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — The Workout Tracker",
  description: "The terms for using The Workout Tracker.",
};

export default function TermsPage() {
  return (
    <div className="min-h-full bg-black text-white">
      <main className="mx-auto w-full max-w-2xl px-6 py-20">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Back
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated: July 2026</p>

        <div className="mt-8 flex flex-col gap-6 text-[15px] leading-7 text-zinc-300">
          <p>
            By downloading or using The Workout Tracker (the &ldquo;app&rdquo;), you agree to these
            terms. If you do not agree, please do not use the app.
          </p>

          <section>
            <h2 className="text-lg font-semibold text-white">Using the app</h2>
            <p className="mt-2">
              You may use the app for personal, non-commercial fitness tracking. You are responsible
              for keeping your device and account secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Your data</h2>
            <p className="mt-2">
              Your workout data is stored on your device. You are responsible for your own backups —
              uninstalling the app or losing your device may permanently erase your training
              history. See our{" "}
              <Link href="/privacy" className="text-white underline">
                Privacy Policy
              </Link>{" "}
              for details.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Not medical advice</h2>
            <p className="mt-2">
              The app helps you log training and estimates such as strength ratings and one-rep-max
              figures are approximate. It is not medical, health, or fitness advice. Consult a
              qualified professional before beginning any exercise program, and train within your
              limits.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Subscriptions</h2>
            <p className="mt-2">
              Logging workouts, templates, the rest timer, and the exercise library are free. The
              analytics features — progression charts, full exercise history, the muscle-activity
              map, and strength ratings — require <strong>Pro</strong>.
            </p>
            <p className="mt-2">
              Pro begins with a <strong>14-day free trial that requires no payment details</strong>.
              The trial simply ends; nothing is charged and the app reverts to the free features
              unless you choose to subscribe. One trial per account.
            </p>
            <p className="mt-2">
              Pro costs <strong>$10 per year</strong> or <strong>$1 per month</strong>. Payments are
              processed by <strong>Stripe</strong>, not through the App Store, and subscriptions
              renew automatically until canceled. You can cancel at any time from the Me tab in the
              app, which opens Stripe&rsquo;s billing portal; access continues until the end of the
              period you have already paid for.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Disclaimer</h2>
            <p className="mt-2">
              The app is provided &ldquo;as is&rdquo; without warranties of any kind. To the extent
              permitted by law, we are not liable for any injury, loss, or damages arising from use
              of the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Changes</h2>
            <p className="mt-2">
              We may update these terms from time to time. Continued use of the app after changes
              means you accept the revised terms.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
