import Link from "next/link";
import Hero from "@/components/home/Hero";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="container mx-auto py-24">
        <div className="grid gap-16 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-8">
            <p className="inline-flex rounded-full border border-zinc-700 px-4 py-2 text-sm uppercase tracking-[0.35em] text-zinc-300">
              Luxury ebook marketplace
            </p>
            <div className="space-y-6">
              <h1 className="max-w-3xl text-6xl font-semibold leading-tight text-white sm:text-7xl">
                Every page changes a life.
              </h1>
              <p className="max-w-2xl text-xl leading-8 text-zinc-400">
                TransformHer is the premium reading destination for women who want beautiful books, elegant tools, and life-changing stories.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/books" className="inline-flex items-center justify-center rounded-full bg-gold px-8 py-4 text-sm font-semibold text-black transition hover:brightness-110">
                Browse Books
              </Link>
              <Link href="/auth/register" className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-8 py-4 text-sm font-semibold text-white transition hover:border-white">
                Join TransformHer
              </Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
            <Hero />
          </div>
        </div>
      </section>
    </main>
  );
}
