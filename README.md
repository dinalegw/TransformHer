# TransformHer

TransformHer is a production-oriented digital bookstore and reading platform for women. It combines account management, a protected personal library, Paystack payments, Courier transactional email, role-based administration, account lifecycle controls, and audited compliance tooling.

**Production:** https://transformher.vercel.app  
**Official support / reply-to:** `transformher360@gmail.com`

## Current project state

TransformHer is no longer the original catalogue-only MVP. The current codebase includes production hardening across authentication, email delivery, payments, user lifecycle management, compliance evidence, scaling, and admin operations.

At the latest repository audit on 17 September 2026:

- `main` passes install, TypeScript, ESLint, Vitest, and production-build CI.
- The stable production hostname is `https://transformher.vercel.app`.
- Production customer email links are forced to the stable public hostname instead of an immutable `VERCEL_URL` deployment hostname.
- Courier uses the TransformHer sender identity and `transformher360@gmail.com` as the official support / reply-to address.
- The newest email-verification-code workflow is present on `main`. A Vercel Hobby build-rate limit can temporarily cause production to lag behind `main`; always verify the latest production deployment before declaring a feature live.

## Technology stack

- **Framework:** Next.js 16, React 19, TypeScript
- **UI:** Tailwind CSS, Base UI / shadcn primitives, Lucide icons
- **Database:** PostgreSQL / Neon with Drizzle ORM
- **Payments:** Paystack
- **Transactional email:** Courier
- **File storage:** Vercel Blob in production
- **Hosting / routing:** Vercel
- **Testing:** Vitest, TypeScript, ESLint, production build checks

## Core product capabilities

### Customer accounts and authentication

- Account registration with validation and duplicate-email protection
- Registration does **not** automatically sign the new user in
- Signed, stateless session cookies so any healthy Vercel instance can validate a session
- Login and logout with shared rate limiting
- Password reset links that:
  - use the canonical TransformHer production hostname
  - expire after one hour
  - are signed
  - are bound to the account's current `tokenVersion`
  - become invalid after a successful reset
- Registration email-verification links
- Profile-based six-digit email verification flow for users who skipped verification during signup
- Verified email shown as **Verified & locked**
- Profile API does not expose a normal email-edit operation
- Frozen and archived users are prevented from receiving normal authenticated sessions
- A correctly authenticated frozen/archived user receives a controlled account-status message and support contact instead of a misleading "wrong email or password" response

### Six-digit profile email verification

The profile verification workflow is designed for horizontally scaled/serverless execution:

- cryptographically generated 6-digit code
- only a HMAC/hash of the code is stored
- 10-minute expiration
- 60-second resend cooldown
- maximum 5 incorrect attempts
- issuing a new code replaces the previous code
- code is bound to the authenticated user ID
- successful verification atomically marks the email verified and removes the code
- same-origin checks and shared rate limiting protect request and confirmation routes

### Books, commerce and library

- Book catalogue and detail pages
- Cart
- Paystack checkout initialization
- Server-side Paystack verification
- Ownership, amount, currency, metadata and idempotency checks
- Purchase confirmation email
- Delayed-release books
- Protected personal library
- Protected reader access for entitled users
- Book-release email notification

### Admin and Master Admin

The administrative system includes role/rank/permission controls and account lifecycle operations.

Master Admin can:

- freeze / unfreeze an account
- archive / restore an account
- delete a non-master user
- review deleted-account archives
- inspect retained transaction references where permitted
- place or release a legal hold using a documented case/lawful-request reference

Admins also have catalogue management, pending-change approval/rejection, order visibility and user-management tooling according to their permissions.

### Self-service account deletion

A signed-in non-master user can delete their own account from **Profile → Danger Zone**.

The flow requires:

- a written deletion reason
- current password re-authentication
- typing `DELETE`
- final confirmation

The active account is removed and the user is signed out. A restricted archive is created first for narrowly defined retention purposes such as payment disputes, fraud prevention, accounting, security investigations, legal claims and lawful requests.

## Deleted-account compliance archive

Deleted accounts automatically appear in the Master Admin deleted-account dashboard.

Retained archive data can include:

- original user ID
- name and email
- optional username / phone
- email-verification state
- account-created and account-deleted timestamps
- deletion method and reason
- account status at deletion
- limited retained purchase references
- configured retention expiry
- legal-hold state / reference
- successful authenticated access evidence recorded after the access-history feature was deployed

### Authenticated access evidence

For successful sign-ins, TransformHer can retain security evidence consisting of:

- access timestamp
- observed IP address
- browser / device summary
- user-agent string
- coarse city / country where supplied by the hosting platform

When an account is deleted, those successful-login records are copied into the restricted deleted-account archive before the active account is removed.

TransformHer does **not** intentionally archive passwords, session cookies, reset tokens, verification tokens, API secrets or payment credentials.

An IP address is network evidence, not proof of a person's identity. It can represent a VPN, proxy, carrier gateway, NAT or shared network.

Access to retained personal, purchase or access-security evidence requires a documented purpose and is written to the compliance audit trail.

## Account lifecycle notifications

Courier transactional notifications cover the active account lifecycle, including:

- Welcome & Verify Email
- Email Verification Code
- Email Verified
- Verify New Email
- Password Reset
- Password Reset Confirmation
- Password Changed
- Login Notification
- Security Alert
- Invitation
- Account Frozen
- Account Archived
- Account Unfrozen
- Account Unarchived
- Order Confirmation
- Book Released
- Admin Order Notification

The build-time Courier synchronizer verifies managed templates, routing and provider-backed email channels in the connected Courier Production workspace.

Courier request acceptance is **not** treated as guaranteed inbox delivery. Critical flows can inspect Courier message status so immediate routing/provider failures are not presented to users as successful delivery.

## Courier branding

The managed TransformHer Courier templates use the application's black / cream / muted-gold visual language with logo/hero image blocks where appropriate, branded headings, CTAs and support information.

The expected public sender identity is:

```text
TransformHer <transformher360@gmail.com>
```

The Gmail provider configuration and the application-level email override should agree on that identity.

## Architecture

```text
User
  |
  v
Vercel Edge / Function Router
  |
  v
Healthy TransformHer function instance
  |
  +--> Neon PostgreSQL (shared persistent state)
  +--> Courier (transactional email)
  +--> Paystack (payments)
  +--> Vercel Blob (production uploads)
```

Important architectural decisions:

- sessions are stateless signed cookies
- application-level sticky sessions are not required
- rate-limit and login-notification deduplication state is shared rather than authoritative process-local memory
- production database access prefers pooled connections
- Vercel handles platform-level traffic distribution / autoscaling
- customer-facing transactional links use a canonical public hostname

Classic round-robin or sticky-session logic is intentionally not reimplemented inside the Next.js application because the platform router already distributes requests and the application is designed to remain instance-independent.

## Repository architecture

`app/` contains pages and route handlers. `lib/` contains the domain and infrastructure layer.

Important modules include:

- `lib/auth.ts` — users, password hashing, signed sessions, roles and email-verification state
- `lib/password-reset.ts` — single-use password-reset token lifecycle
- `lib/email-verification-code.ts` — six-digit profile verification codes
- `lib/email.ts` — Courier client and transactional email sends
- `lib/account-lifecycle.ts` — freeze, archive, restore and controlled deletion workflows
- `lib/access-history.ts` — successful authenticated access evidence
- `lib/compliance.ts` — deleted-account review, audit trail, retention and legal holds
- `lib/rate-limit.ts` — shared rate limiting
- `lib/books.ts`, `lib/library.ts`, `lib/admin-books.ts` — catalogue, purchases and admin workflows
- `lib/paystack.ts` — Paystack provider client
- `lib/db/schema.ts` — Drizzle schema
- `lib/db/connection.ts` — database connection and compatibility initialization
- `scripts/ensure-courier-templates.mjs` — production Courier template/routing synchronization
- `scripts/audit-courier-sender.mjs` — sender/provider identity audit

## Local setup

Requirements:

- Node.js `>=20.19.0`
- PostgreSQL-compatible database

```bash
npm ci
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`.

## Environment configuration

Use `.env.example` as the source of truth.

Core variables include:

```bash
AUTH_SECRET=long-random-secret
EMAIL_VERIFICATION_SECRET=optional-separate-verification-secret

POSTGRES_URL=postgres://pooled-connection
POSTGRES_URL_NON_POOLING=postgres://direct-connection

PAYSTACK_SECRET_KEY=sk_...
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_...

COURIER_API_KEY=...

ADMIN_EMAIL=...
ADMIN_PASSWORD=...

BLOB_READ_WRITE_TOKEN=...

TRANSFORMHER_PUBLIC_URL=https://transformher.vercel.app
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Courier template variables are documented in `.env.example`, including the email-verification-code and account-lifecycle templates.

`TRANSFORMHER_PUBLIC_URL` is the preferred explicit public URL. In Production, the application also falls back to Vercel's stable project production URL and finally `https://transformher.vercel.app`; it does not use an immutable `VERCEL_URL` for customer reset/verification links.

`ADMIN_PASSWORD` is used only to create the initial administrator when required. Existing administrator passwords are not reset at startup.

## Security model

- Passwords are stored as salted password hashes, never plaintext.
- Session cookies are signed and validated against `tokenVersion`.
- Password changes and account lifecycle restrictions invalidate existing sessions by incrementing `tokenVersion`.
- Password-reset tokens expire and become unusable after a successful reset.
- Email verification codes are stored hashed, not plaintext.
- Sensitive authentication values are excluded from application logs.
- Shared rate limiting protects authentication and other high-risk endpoints.
- Self-service deletion requires re-authentication and explicit confirmation.
- Retained deleted-account evidence is gated by documented compliance purpose.
- Payment entitlements are granted only after server-side Paystack verification.

## Storage warning

Do not store paid ebooks in `public/` or commit them into the public repository.

Production uploads require persistent storage. Configure `BLOB_READ_WRITE_TOKEN` for Vercel Blob or use another private storage system with access-controlled / short-lived download URLs before treating paid content as fully protected.

## Quality gates

Run the same core checks used by CI:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Current scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local Next.js development |
| `npm run build` | Audit Courier sender, synchronize Courier templates, build Next.js |
| `npm run start` | Start the production server |
| `npm run typecheck` | TypeScript check without emit |
| `npm run lint` | ESLint |
| `npm test` | Vitest suite |
| `npm run db:generate` | Generate Drizzle migration |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:push` | Drizzle push — development only; do not use as the normal production migration workflow |

## Production verification checklist

Before declaring a release complete, verify the actual production behavior rather than only a successful build:

1. Registration creates one account, does not auto-login, and sends a valid public-domain verification link.
2. Profile verification sends a six-digit code and correctly transitions to **Verified & locked**.
3. Forgot-password sends a reset URL under `transformher.vercel.app`, not an immutable Vercel deployment URL.
4. A used/expired reset link cannot be replayed.
5. A successful login creates one session and one deduplicated login notification.
6. Frozen / archived users receive the correct account-status behavior.
7. Self-delete archives permitted evidence and removes the active account.
8. Deleted-account access evidence is visible only through documented/audited Master Admin review.
9. Paystack test checkout creates exactly one entitlement.
10. Paid content remains inaccessible without the required entitlement/release state.
11. Courier message events show routing/provider success for critical email flows.
12. Production runtime logs contain no unexplained 5xx clusters.

## Engineering documentation

- [`docs/MASTER_PROMPT.md`](docs/MASTER_PROMPT.md) — general TransformHer engineering/hardening contract
- [`docs/AUTH_RECOVERY_MASTER_PROMPT.md`](docs/AUTH_RECOVERY_MASTER_PROMPT.md) — password recovery and email verification production contract

## License

MIT.
