import { redirect } from "next/navigation";
import { fetchStats, fetchUsers, type Plan } from "@/lib/admin";
import { isAdminAuthed } from "@/server/auth/adminAuth";
import { adminLogout, removeUser, setUserPlan } from "./actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; page?: string }>;
}) {
  if (!(await isAdminAuthed())) {
    redirect("/admin/login");
  }

  const sp = await searchParams;
  const search = first(sp.q)?.trim() || undefined;
  const planParam = first(sp.plan);
  const plan: Plan | undefined =
    planParam === "free" || planParam === "pro" ? planParam : undefined;
  const page = Math.max(1, Number(first(sp.page) ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [stats, usersPage] = await Promise.all([
    fetchStats(),
    fetchUsers({ search, plan, limit: PAGE_SIZE, offset }),
  ]);

  const totalPages = Math.max(1, Math.ceil(usersPage.total / PAGE_SIZE));

  const cards = [
    { label: "Total users", value: stats.totalUsers },
    { label: "Free", value: stats.freeUsers },
    { label: "Pro (paid)", value: stats.proUsers },
    { label: "New · 30 days", value: stats.newUsersLast30Days },
  ];

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-10 text-neutral-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Admin · Users</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Registered users, plans, and billing across the app.
            </p>
          </div>
          <form action={adminLogout}>
            <button
              type="submit"
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              Sign out
            </button>
          </form>
        </header>

        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="text-xs uppercase tracking-wide text-neutral-400">{c.label}</div>
              <div className="mt-2 text-3xl font-semibold tabular-nums">{c.value}</div>
            </div>
          ))}
        </section>

        <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search email or Apple ID…"
            className="min-w-56 flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-neutral-600"
          />
          <select
            name="plan"
            defaultValue={plan ?? ""}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-600"
          >
            <option value="">All plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
          >
            Filter
          </button>
          {(search || plan) && (
            <a href="/admin" className="px-2 py-2 text-sm text-neutral-400 hover:text-neutral-200">
              Reset
            </a>
          )}
        </form>

        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-neutral-900 text-xs uppercase tracking-wide text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Apple ID</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Paid until</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Last login</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {usersPage.users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                usersPage.users.map((u) => (
                  <tr key={u.id} className="hover:bg-neutral-900/60">
                    <td className="px-4 py-3">
                      {u.email ?? <span className="text-neutral-500">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-400">
                      {u.appleUserId.length > 22 ? `${u.appleUserId.slice(0, 22)}…` : u.appleUserId}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          u.plan === "pro"
                            ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400"
                            : "rounded-full bg-neutral-700/40 px-2 py-0.5 text-xs font-medium text-neutral-300"
                        }
                      >
                        {u.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{fmtDate(u.paidUntil)}</td>
                    <td className="px-4 py-3 text-neutral-400">{fmtDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-neutral-400">{fmtDate(u.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <form action={setUserPlan}>
                          <input type="hidden" name="id" value={u.id} />
                          <input
                            type="hidden"
                            name="plan"
                            value={u.plan === "pro" ? "free" : "pro"}
                          />
                          <button
                            type="submit"
                            className="rounded-md border border-neutral-700 px-2.5 py-1 text-xs text-neutral-200 hover:bg-neutral-800"
                          >
                            {u.plan === "pro" ? "Make free" : "Make pro"}
                          </button>
                        </form>
                        <form action={removeUser}>
                          <input type="hidden" name="id" value={u.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-red-900/60 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950/40"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-neutral-400">
          <span>
            {usersPage.total} user{usersPage.total === 1 ? "" : "s"} · page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <a
              aria-disabled={page <= 1}
              href={buildQuery({ q: search, plan, page: page - 1 })}
              className={
                page <= 1
                  ? "pointer-events-none rounded-lg border border-neutral-800 px-3 py-1.5 text-neutral-600"
                  : "rounded-lg border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800"
              }
            >
              Prev
            </a>
            <a
              aria-disabled={page >= totalPages}
              href={buildQuery({ q: search, plan, page: page + 1 })}
              className={
                page >= totalPages
                  ? "pointer-events-none rounded-lg border border-neutral-800 px-3 py-1.5 text-neutral-600"
                  : "rounded-lg border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800"
              }
            >
              Next
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
