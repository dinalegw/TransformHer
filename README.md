# TransformHer

TransformHer is a Next.js ebook commerce platform for discovering books, paying with Paystack, managing a personal library, and operating a role-based admin dashboard.

## Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS
- PostgreSQL/Neon with Drizzle ORM
- Paystack for payment initialization and server-side verification
- Courier for transactional email orchestration
- Vercel Blob for uploads in production

## Product capabilities

- Account registration, sign-in, email verification, password reset, and profile updates
- Book catalogue, cart, Paystack checkout, delayed library release, and protected reader endpoint
- Admin catalogue management, approval workflow, order review, user roles, and permissions
- Input validation, rate limiting, security headers, request IDs, and CI checks

## Architecture

`app/` contains pages and route handlers. `lib/` contains server-only domain logic:

- `auth.ts` — signed sessions, password hashing, user and role management
- `books.ts`, `library.ts`, `admin-books.ts` — catalogue, purchases, cart, and admin workflow
- `paystack.ts` — payment provider client
- `email.ts` — Courier notification client
- `db/schema.ts` — Drizzle schema and indexes

## Local setup

Requirements: Node.js 20.19+ and a PostgreSQL-compatible database.

```bash
npm ci
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`.

## Required environment variables

Set these in `.env.local` for development and in Vercel for Production, Preview, and Development as appropriate:

```bash
AUTH_SECRET=long-random-secret
POSTGRES_URL_NON_POOLING=postgres://...
POSTGRES_URL=postgres://...
PAYSTACK_SECRET_KEY=sk_...
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_...
COURIER_API_KEY=...
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-unique-long-password
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Every `COURIER_TEMPLATE_*` variable in `.env.example` is required only if the corresponding email is sent. Keep all templates published and use IDs from the same Courier environment as `COURIER_API_KEY`.

`ADMIN_PASSWORD` is only used to create the initial admin account. It is never safe to rely on a default password; no default is provided. Existing admin passwords are not reset at startup.

## Courier email: required setup

An accepted Courier request is not proof of delivery. Courier can accept a request and later show `UNMAPPED` when no active email provider/routing rule can handle it.

1. In the selected Courier environment, connect an email provider (for example Resend) and verify its sending domain.
2. Open Courier’s email channel/routing settings and make the connected provider the active route for email. `UNMAPPED` means this mapping is missing or inactive.
3. Publish each template used by the app. Copy its template ID into the matching `COURIER_TEMPLATE_*` variable.
4. Add `COURIER_API_KEY` and those template variables to Vercel, then redeploy.
5. Trigger a password-reset email and inspect Courier’s message event timeline. Record the application log’s Courier request ID; use it to distinguish accepted, delivered, bounced, and undeliverable messages.

Do not mix keys or template IDs from different Courier environments. The repository’s template helper currently creates only a subset of templates, so create or configure the remaining template IDs manually before enabling every notification type.

## Security notes

- Entitlements are granted only after server-side Paystack verification; client data is never trusted.
- The Paystack callback checks payment status, owner, customer email, exact amount, currency, and expected book/cart metadata.
- Do not store paid ebooks in `public/` or a public Git repository. Public Vercel Blob URLs are not access-controlled; use a private storage provider or signed, short-lived download URLs before treating content as protected.
- Uploaded files are intentionally ignored from Git. Existing public upload URLs should be rotated or removed.
- Run database migrations before deploying schema changes. Do not use `db:push` as a production migration workflow.

## Database and account deletion

The application persists user accounts, passwords, roles, sessions, carts, purchases, and verification records in PostgreSQL using Drizzle ORM. Configure `POSTGRES_URL_NON_POOLING` (or `POSTGRES_URL`) in Vercel, then run `npm run db:migrate` once against that database.

The master administrator can permanently delete a non-master user from the Admin dashboard. This removes the account and its sessions, cart, purchases, linked account data, verification records, and pending changes. The operation is irreversible; the person must register again to use TransformHer.

The catalogue is fictional sample content. The example prices are in NGN and are updated by migration `0002_update_sample_book_prices.sql`; change them in the Admin dashboard before offering real products for sale.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm run start` | Production build and server |
| `npm run db:generate` | Generate a Drizzle migration |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run typecheck`, `lint`, `test` | Quality gates |

## Deployment checklist

1. Configure all required production variables in Vercel.
2. Run and verify migrations against production safely.
3. Complete a real Paystack test payment and confirm one library record only.
4. Test Courier delivery—not merely enqueueing—from the correct Courier environment.
5. Verify non-admin, admin, and master-admin access paths.

## License

MIT.
