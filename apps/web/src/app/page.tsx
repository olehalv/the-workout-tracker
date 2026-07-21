import Link from "next/link";

/** Marketing landing page. Intentionally tiny: a pitch and store links. */
export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-black text-white">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-10 px-6 py-24 text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium uppercase tracking-widest text-zinc-400">
            The #1 workout tracking app
          </span>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            The Workout Tracker
          </h1>
        </div>

        <p className="max-w-md text-balance text-lg leading-8 text-zinc-400">
          Log every set, build reusable templates, and run a rest timer — free, forever. Your entire
          training history stays on your device. Go Pro to unlock the analytics: progression charts,
          full exercise history, a muscle-activity map, and strength ratings.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <StoreButton
            href="#"
            eyebrow="Download on the"
            store="App Store"
            glyph={<AppleGlyph />}
          />
        </div>
        <p className="text-xs text-zinc-600">
          Coming soon to the App Store — link is a placeholder. iOS only for now.
        </p>

        <section className="w-full pt-6">
          <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-500">Pricing</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <PlanCard
              name="Free"
              price="$0"
              cadence="forever"
              tagline="Everything you need to train."
              features={[
                "Log workouts, sets & reps",
                "Reusable workout templates",
                "Rest timer between sets",
                "Full exercise library",
                "All your data, on your device",
              ]}
            />
            <PlanCard
              name="Pro"
              price="$1"
              cadence="per month"
              highlight
              tagline="See your progress like never before."
              features={[
                "Everything in Free",
                "Top-set progression charts",
                "Complete per-exercise history",
                "Muscle-activity body map",
                "Strength ratings for every lift",
              ]}
            />
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            Pro is <span className="text-zinc-300">14 days free</span>, then just $1/month — cancel
            anytime. Serious about progressive overload? Pro turns your logs into trends.
          </p>
        </section>
      </main>

      <footer className="border-t border-white/10 px-6 py-6">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-between gap-3 text-sm text-zinc-500 sm:flex-row">
          <span>© {new Date().getFullYear()} The Workout Tracker</span>
          <nav className="flex gap-6">
            <Link href="/privacy" className="hover:text-zinc-300">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-zinc-300">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function PlanCard({
  name,
  price,
  cadence,
  tagline,
  features,
  highlight,
}: {
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border p-6 text-left ${
        highlight ? "border-white/30 bg-white/[0.06]" : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-semibold">{name}</span>
        <span className="text-sm text-zinc-400">
          <span className="text-2xl font-bold text-white">{price}</span> {cadence}
        </span>
      </div>
      <p className="text-sm text-zinc-400">{tagline}</p>
      <ul className="flex flex-col gap-2 text-sm text-zinc-300">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-0.5 text-zinc-500">✓</span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StoreButton({
  href,
  eyebrow,
  store,
  glyph,
}: {
  href: string;
  eyebrow: string;
  store: string;
  glyph: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-left transition-colors hover:bg-white/10"
    >
      <span className="text-white">{glyph}</span>
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wide text-zinc-400">{eyebrow}</span>
        <span className="text-lg font-semibold">{store}</span>
      </span>
    </a>
  );
}

function AppleGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.417 2.2-1.11 2.99-.79.9-2.08 1.6-3.13 1.52-.13-1.09.42-2.24 1.06-2.98.77-.88 2.18-1.55 3.18-1.53zM20.5 17.02c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.39 3.5-4.12 3.51-1.54.02-1.93-1-4.02-.99-2.09.01-2.52 1.01-4.06.99-1.73-.02-3.05-1.77-4.04-3.33C-.13 15.9-.4 11.05 1.24 8.5c1.16-1.83 3-2.9 4.72-2.9 1.76 0 2.86 1 4.31 1 1.41 0 2.27-1 4.31-1 1.53 0 3.15.83 4.31 2.27-3.79 2.07-3.17 7.47.61 9.15z" />
    </svg>
  );
}
