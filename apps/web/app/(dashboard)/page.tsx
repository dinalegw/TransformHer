import Link from "next/link";

export default function DashboardHomePage() {
  return (
    <div className="space-y-8 rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-zinc-400">Welcome back</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">Your TransformHer Library</h1>
        </div>
        <Link href="/books" className="inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110">
          Browse books
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <article className="rounded-[1.75rem] border border-white/10 bg-black/50 p-6">
          <h2 className="text-xl font-semibold text-white">Continue reading</h2>
          <p className="mt-3 text-zinc-400">Pick up where you left off across your premium ebooks.</p>
        </article>
        <article className="rounded-[1.75rem] border border-white/10 bg-black/50 p-6">
          <h2 className="text-xl font-semibold text-white">Wishlist</h2>
          <p className="mt-3 text-zinc-400">Curate your next set of transformative reads.</p>
        </article>
        <article className="rounded-[1.75rem] border border-white/10 bg-black/50 p-6">
          <h2 className="text-xl font-semibold text-white">Recent purchases</h2>
          <p className="mt-3 text-zinc-400">Review your latest book investments and downloads.</p>
        </article>
      </div>
    </div>
  );
}
