import Link from 'next/link'
import { CheckCircle2, Mail, TriangleAlert, UserPlus } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

type SignupPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams
  const error = first(params.error)
  const created = first(params.created) === '1'
  const mailState = first(params.mail)

  if (created) {
    const mailSent = mailState === 'sent'

    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="w-full max-w-md text-center">
            <CheckCircle2 className="mx-auto size-16 text-green-600" />
            <h1 className="mt-5 font-heading text-3xl text-foreground">Congratulations!</h1>
            <p className="mt-2 text-base text-foreground/90">
              Your TransformHer account has been created successfully.
            </p>

            <div className="mt-6 rounded-xl border border-border bg-card p-5 text-left">
              <div className="flex items-start gap-3">
                {mailSent ? (
                  <Mail className="mt-0.5 size-5 shrink-0 text-primary" />
                ) : (
                  <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
                )}
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">
                    {mailSent ? 'Check your email' : 'Account created; email delivery is delayed'}
                  </p>
                  <p className="mt-1 leading-relaxed">
                    {mailSent
                      ? 'We sent you a verification email. Open it and use the verification link, then sign in to continue.'
                      : 'Your account is safe, but we could not confirm that the verification email was accepted by the mail service. Please try signing in later or contact support if the message does not arrive.'}
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-5 text-sm text-muted-foreground">
              For security, creating an account does not automatically sign you in.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
              >
                Sign in
              </Link>
              <Link
                href="/books"
                className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Browse books
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="text-center">
            <UserPlus className="mx-auto size-8 text-primary" />
            <h1 className="mt-4 font-heading text-3xl text-foreground">Create your account</h1>
            <p className="mt-2 text-sm text-muted-foreground">Join our community</p>
          </div>

          <form action="/api/auth/register" method="post" className="mt-8 space-y-5">
            {error && (
              <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div>
              <label htmlFor="name" className="text-sm font-medium text-foreground">Full name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                className="mt-1 h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-1 h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1 h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="At least 8 characters"
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-9 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Create account
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
