# TransformHer Authentication Architecture

TransformHer supports two user-facing authentication paths that converge into one application authorization model:

1. email + password
2. Google OAuth through Better Auth

The important design rule is that Google authenticates identity, while TransformHer remains responsible for application authorization, account status, roles, permissions, entitlements and the final signed application session.

## Email/password flow

```text
User submits email + password
        |
        v
TransformHer validates credentials
        |
        v
Password hash is verified server-side
        |
        v
Account status / tokenVersion checked
        |
        v
TransformHer signed session cookie issued
```

Passwords are never stored as plaintext.

## Google OAuth flow

```text
User clicks "Continue with Google"
        |
        v
POST /api/auth/sign-in/social
        |
        v
Google account chooser / consent
        |
        v
GET /api/auth/callback/google
        |
        v
Better Auth verifies OAuth state + Google identity
        |
        v
Google provider account is created or linked
        |
        v
GET /api/auth/google/finalize
        |
        v
TransformHer rechecks local user + account status
        |
        v
TransformHer signed session cookie issued
        |
        v
Redirect to requested application page
```

## Existing-user linking policy

Existing email/password users may sign in with Google when the verified Google email exactly matches the TransformHer account email.

Current linking rules:

- Google is the only trusted social provider.
- Different-email implicit linking is disabled.
- Same-email linking reuses the existing TransformHer user ID.
- A successful link creates one Google provider row in `account`; it does not create a second user.
- The user's password credential remains available unless the user later changes/removes it through a supported account flow.
- Google verification is synchronized into TransformHer's email-verification state.
- Frozen or archived accounts are rejected before the normal TransformHer session is issued.

This prevents the common failure mode where adding social login creates duplicate customer accounts, duplicate libraries or split purchase histories.

## Session bridge

Better Auth uses its own short-lived OAuth/session state to complete the provider flow. After Google succeeds, `/api/auth/google/finalize` checks the local TransformHer account and issues the existing TransformHer signed `session` cookie.

This keeps the rest of the application consistent:

- profile authorization
- cart
- Paystack checkout
- library entitlements
- admin roles
- account lifecycle controls
- protected reader access

do not need separate Google-specific authorization logic.

## Database tables

Google OAuth uses the existing Neon tables:

- `user`
- `account`
- `session`
- `verification`

`lib/db/social-auth-schema.ts` intentionally maps Better Auth to the existing camelCase OAuth columns in production. This compatibility mapping avoids destructive schema rewrites while the broader TransformHer application schema uses its newer conventions.

## Important files

- `lib/auth.ts` — native TransformHer password/session/authz logic
- `lib/social-auth.ts` — Better Auth + Google provider configuration
- `lib/auth-client.ts` — browser social-auth client
- `lib/db/social-auth-schema.ts` — production OAuth table mapping
- `components/google-sign-in-button.tsx` — Google signup/sign-in UI
- `app/api/auth/[...all]/route.ts` — Better Auth request handler
- `app/api/auth/google/finalize/route.ts` — application session bridge
- `app/api/auth/logout/route.ts` — clears TransformHer and Better Auth cookies

## Required environment variables

```bash
AUTH_SECRET=...
BETTER_AUTH_SECRET=... # optional; falls back to AUTH_SECRET

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
BETTER_AUTH_URL=https://transformher.vercel.app
```

Production Google OAuth redirect URI:

```text
https://transformher.vercel.app/api/auth/callback/google
```

Local development redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

Never commit Google client secrets to the repository.

## Production verification

A complete Google-auth verification should confirm:

1. `Continue with Google` starts OAuth successfully.
2. Google returns to `/api/auth/callback/google`.
3. Same-email existing users link instead of duplicating.
4. New users create exactly one TransformHer user.
5. `/api/auth/google/finalize` issues the normal TransformHer session.
6. `/api/auth/me` recognizes the user.
7. Logout clears both authentication systems.
8. Re-login with Google reuses the same user/provider link.
9. Frozen/archived users do not receive an active application session.

The 22 September 2026 production verification confirmed the existing-user same-email case end-to-end without creating a duplicate user.
