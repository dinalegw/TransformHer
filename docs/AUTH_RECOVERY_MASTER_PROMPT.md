# TransformHer Auth Recovery & Email Verification Master Prompt

Act as the Principal Engineer, Authentication/Security Engineer, SRE, Database Engineer, and Courier transactional-email engineer for TransformHer.

## Production context

- Repository: `dinalegw/TransformHer`
- Public production URL: `https://transformher.vercel.app`
- Official support/sender email: `transformher360@gmail.com`

## Mission

Audit, repair, harden, test, deploy, and verify password recovery and email verification end to end. Do not stop when code compiles or a deployment says READY; verify customer-facing links and runtime behavior on the stable production hostname.

## Password reset

1. Customer reset links must always use the stable public production hostname, or an explicitly configured canonical custom domain.
2. Never use `VERCEL_URL` for production customer links because it identifies an immutable deployment that can be protected by Vercel Authentication.
3. Reset tokens expire after one hour, are bound to the active account and current token version, and become unusable after a successful password change.
4. Never log reset tokens or passwords.
5. Courier acceptance alone is not proof of delivery; check immediate dispatch state where possible.
6. Old, expired, malformed and replayed reset tokens must fail safely.

## Registration verification

1. Create the account exactly once and do not automatically sign the new user in.
2. Generate the verification link using the canonical public production hostname.
3. Send the verification message through the published TransformHer Courier template and configured provider.
4. Verify the email only after a valid verification token is presented.
5. Do not allow registration email failures to corrupt or duplicate the newly-created account.

## Profile verification code flow

For a signed-in user whose account email is still unverified:

1. Show a clear `Not verified` state on Profile.
2. Let the user request a six-digit verification code to the email already attached to the account.
3. Generate the code cryptographically, store only an HMAC/hash, expire it after 10 minutes, enforce a resend cooldown, and limit incorrect attempts.
4. Bind the code to the authenticated user account. Never return or log the plaintext code from an API.
5. Protect request and confirmation routes with same-origin checks and shared rate limits suitable for horizontally-scaled/serverless instances.
6. If Courier immediately rejects the verification-code email, invalidate the issued code and tell the user delivery failed.
7. On successful verification, atomically mark `email_verified=true`, remove the code, show `Verified & locked`, and send a confirmation email.

## Email immutability

The current account email is the identity anchor. Once verified it must not be editable from profile settings. Profile update APIs must not accept an email field. Any future email-change feature must be a separate re-authenticated workflow that verifies the new address before replacing the old one.

## Courier

Maintain a published, routed, provider-backed template named `TransformHer Email Verification Code` using the TransformHer sender identity and official support address. Keep branded content concise, secure, and mobile-friendly.

## Edge cases

Cover database outages, Courier/provider failures, rate limits, duplicate requests, concurrent serverless instances, frozen/archived/deleted accounts, already-verified accounts, stale sessions, expired codes, too many attempts, and old password-reset links generated before canonical-domain hardening.

## Verification gate

Every change must pass dependency install, TypeScript, ESLint, tests and production build. Then verify the Vercel production deployment is READY, the canonical reset page is publicly reachable, auth health reports the canonical public base URL and verification email readiness, and recent production runtime logs show no new 5xx errors.
