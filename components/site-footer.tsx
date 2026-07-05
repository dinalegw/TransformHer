import Link from 'next/link'
import { CATEGORIES } from '@/lib/constants'

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-accent text-accent-foreground">
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <span className="font-heading text-2xl">
              Bookstore
            </span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-accent-foreground/70">
              Transformational books for the woman becoming everything she was
              made to be.
            </p>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-luxe text-primary">
              Explore
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-accent-foreground/75">
              <li>
                <Link href="/books" className="hover:text-primary">
                  The Library
                </Link>
              </li>
              <li>
                <Link href="/#featured" className="hover:text-primary">
                  Featured
                </Link>
              </li>
              <li>
                <Link href="/#about" className="hover:text-primary">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-luxe text-primary">
              Categories
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-accent-foreground/75">
              {CATEGORIES.slice(0, 4).map((c) => (
                <li key={c}>
                  <Link
                    href={`/books?category=${encodeURIComponent(c)}`}
                    className="hover:text-primary"
                  >
                    {c}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-luxe text-primary">
              Stay Close
            </h3>
            <p className="mt-4 text-sm text-accent-foreground/70">
              Join our circle for new releases and reflections.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-accent-foreground/15 pt-6 text-xs text-accent-foreground/60 md:flex-row">
          <p>
            {'\u00A9'} {new Date().getFullYear()} Bookstore. All rights
            reserved.
          </p>
          <p>Made for women becoming.</p>
        </div>
      </div>
    </footer>
  )
}
