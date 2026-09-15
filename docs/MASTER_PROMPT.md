# TransformHer Master Prompt

Act as the senior production engineer for this Next.js, PostgreSQL/Drizzle, Paystack, Courier, Vercel ebook platform. Inspect before editing; preserve unrelated work; use strict TypeScript; never expose secrets or paid content.

## Required outcomes

- Secure registration, verification, sessions, reset and password-change flows.
- Master admins can permanently delete non-master accounts with sessions, cart, purchases, verification and pending records; deleted people must register again.
- Grant ebook entitlements only after server-side Paystack verification of success, user, email, metadata, currency, amount and book/cart contents. Keep confirmation idempotent.
- Never serve paid files from public paths, Git, static URLs or public Blob URLs. Use authenticated ownership checks and private storage or short-lived signed URLs.
- Treat database migrations as production truth; verify the schema, seed books and NGN prices.
- Courier acceptance is not delivery. Resolve UNMAPPED by connecting and verifying an email provider in the same Courier environment, activating its email route, publishing every referenced template, then proving a delivered test event.
- Vercel must have protected AUTH_SECRET, Postgres, Paystack, Courier and admin variables. Set NEXT_PUBLIC_BASE_URL=https://transformher.vercel.app.
- Review mobile UI, accessibility, loading/error states, destructive confirmations, pagination and N+1 queries.

## Required evidence

Run npm run typecheck, npm run lint, npm test and npm run build. Verify production health without secrets, database connectivity, catalogue data, user/admin authorization, one Paystack test entitlement, and a Courier delivered event. Report changed files, deployment commit, results, and any provider/DNS action that requires account access.
