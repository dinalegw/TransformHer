import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about TransformHer accounts, payments, reading access, email verification and support.',
}

const SUPPORT_EMAIL = 'transformher360@gmail.com'

const FAQS = [
  {
    q: 'What is TransformHer?',
    a: 'TransformHer is a digital bookstore and reading platform focused on transformational books for women across confidence, wealth, wellness, relationships, purpose, spirituality, and leadership.',
  },
  {
    q: 'How do I create an account?',
    a: 'Choose Sign up, enter your name, email address and a password of at least 8 characters, then submit the form. Registration creates the account but does not sign you in automatically. Use the verification link sent to your email, then sign in.',
  },
  {
    q: 'Why did I receive an email verification message?',
    a: 'Email verification helps confirm that the address belongs to you. Registration links are tied to the exact TransformHer account that requested them and expire automatically. You can also request a six-digit verification code from your Profile if needed.',
  },
  {
    q: 'Can an old verification link verify a new account with the same email?',
    a: 'No. Verification links are bound to the original account and its security version. If that account is deleted or its security state changes, the old link cannot verify a later replacement account.',
  },
  {
    q: 'Can I change my verified email address?',
    a: 'Your account email is treated as the account identity and is locked after verification. You can still update supported profile fields such as your name, username and phone number. Contact support if you have an account-email problem.',
  },
  {
    q: 'I forgot my password. What should I do?',
    a: 'Open Sign in and choose Forgot password. Enter your account email and, if the account is eligible, TransformHer will send a time-limited password-reset link. A successfully used reset link cannot be replayed.',
  },
  {
    q: 'How do I purchase a book?',
    a: 'Browse Books, open the title you want, and choose the purchase option. You can also add eligible books to your cart. Checkout is initialized by TransformHer and payment is completed through Paystack.',
  },
  {
    q: 'What payment methods can I use?',
    a: 'Available payment methods are the options Paystack presents for your transaction and account context. TransformHer does not store your card or bank credentials.',
  },
  {
    q: 'How does TransformHer confirm my payment?',
    a: 'TransformHer verifies the payment with Paystack on the server and checks the account, payment reference, book metadata, amount and currency before creating your entitlement. Repeated confirmation of the same purchase does not create a duplicate entitlement.',
  },
  {
    q: 'How do I access a purchased book?',
    a: 'After a verified purchase, the entitlement appears in your personal Library. Some purchases can have a release time before reading is enabled; when the entitlement is released, you can open it from your Library while signed in.',
  },
  {
    q: 'Why is a purchased book showing as pending release?',
    a: 'Some purchases use a delayed-release workflow. The Library keeps the purchase associated with your account while reading access remains locked until the configured release time or an authorized admin unlocks it.',
  },
  {
    q: 'Can I read on any device?',
    a: 'Yes. You can sign in on a supported phone, tablet or computer with internet access and open your Library. Reading access is checked against your authenticated account and book entitlement.',
  },
  {
    q: 'Can I read offline?',
    a: 'TransformHer currently requires an internet connection for protected library and reader access. Do not rely on offline access unless the product explicitly adds that feature.',
  },
  {
    q: 'Are the books physical or digital?',
    a: 'TransformHer currently provides digital books. There is no shipping step for an ebook purchase.',
  },
  {
    q: 'Is my payment information secure?',
    a: 'Payment processing is handled through Paystack. TransformHer verifies payment results server-side and does not intentionally store full card or bank credentials in the application database.',
  },
  {
    q: 'What happens if I submit the same successful payment confirmation more than once?',
    a: 'The purchase-recording flow is designed to be idempotent. Repeated or concurrent confirmation for the same account and book is serialized so only one entitlement is created.',
  },
  {
    q: 'What happens if my account is frozen or archived?',
    a: 'A frozen or archived account cannot use a normal authenticated session. When the status applies, TransformHer invalidates existing sessions and directs the affected user to the account-status/support path instead of treating the condition as a normal password error.',
  },
  {
    q: 'Can I delete my account?',
    a: 'Yes. A signed-in non-Master-Admin user can use Profile → Danger Zone. The deletion flow requires your current password, a deletion reason, typing DELETE, and final confirmation. The active account is removed and you are signed out.',
  },
  {
    q: 'Does account deletion erase absolutely everything immediately?',
    a: 'The active account is removed, but TransformHer may retain a restricted minimum record for legitimate purposes such as payment disputes, fraud prevention, accounting, security investigations, legal claims, or lawful requests. Authentication secrets, session cookies, reset tokens, verification tokens and payment credentials are not intentionally stored in that archive.',
  },
  {
    q: 'Can staff freely browse deleted-account records?',
    a: 'No. Retained deleted-account information is restricted to the Master Admin compliance workflow. Reviewing detailed retained information requires a documented purpose and the access is written to an audit trail. Legal holds require a documented case or lawful-request reference.',
  },
  {
    q: 'What successful sign-in information may be retained for security?',
    a: 'Security evidence can include the access time, observed network IP address, browser/device summary, user-agent, and coarse city/country supplied by the hosting platform. An IP address is network evidence and is not proof of a person\'s identity.',
  },
  {
    q: 'What is your refund policy?',
    a: 'Digital purchase eligibility and any refund or dispute handling are subject to the applicable TransformHer purchase terms and the specific circumstances of the transaction. If a verified purchase is not accessible as expected, contact support with your payment reference so the issue can be investigated.',
  },
  {
    q: 'I did not receive a TransformHer email. What should I do?',
    a: 'Check your spam/junk folder and confirm that you used the correct account email. You can retry the relevant verification or password-recovery flow after its cooldown. If the message still does not arrive, contact support.',
  },
  {
    q: 'If the verification email fails to send, is my new account lost?',
    a: 'No. Account creation and email delivery are handled separately. If the mail provider has a temporary problem after your account is created, the account remains valid. You can sign in later and use the Profile verification-code flow or retry the relevant verification step.',
  },
  {
    q: 'Why can I still see the Sign in page after my account was frozen or my session was invalidated?',
    a: 'That is intentional. TransformHer checks the live account and session state before redirecting away from authentication pages. A stale cookie is not treated as a valid active session, so affected users can reach the correct recovery or account-status message instead of being trapped in a redirect loop.',
  },
  {
    q: 'How does TransformHer protect actions such as checkout, cart changes and account administration?',
    a: 'Authenticated state-changing requests are checked against the signed-in account, protected with shared rate limits where appropriate, and reject explicit cross-origin browser requests. Sensitive admin actions also require the relevant administrator role or permission.',
  },
  {
    q: 'How do I contact support?',
    a: `Email ${SUPPORT_EMAIL}. For purchase problems, include your TransformHer account email and payment reference, but never send your password, card PIN, OTP, full card number, or authentication token.`,
  },
]

function AccordionGroup({ items }: { items: typeof FAQS }) {
  return (
    <div className="divide-y divide-border rounded-xl border border-border">
      {items.map((item, i) => (
        <details key={i} className="group">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium text-foreground transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
            {item.q}
            <svg
              className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <div className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
            {item.a}
          </div>
        </details>
      ))}
    </div>
  )
}

export default function FAQPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/40">
          <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
            <p className="text-xs uppercase tracking-luxe text-primary">Help</p>
            <h1 className="mt-2 font-heading text-3xl text-foreground md:text-4xl">
              Frequently Asked Questions
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Account, verification, purchase, reading-access, privacy and support answers for TransformHer.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-10 md:px-6">
          <AccordionGroup items={FAQS} />

          <div className="mt-8 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Still need help? Email{' '}
            <Link className="font-medium text-primary hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </Link>
            . Never send your password, OTP, card PIN, full card number, or authentication tokens.
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
