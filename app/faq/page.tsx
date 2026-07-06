import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about TransformHer.',
}

const FAQS = [
  {
    q: 'What is TransformHer?',
    a: 'TransformHer is a premium digital platform offering transformational eBooks curated for women. Every title is chosen to help you grow in confidence, wealth, wellness, relationships, purpose, and leadership.',
  },
  {
    q: 'How do I purchase a book?',
    a: 'Browse our library, choose a book, and click "Buy & Read Now" to pay via Paystack. You can also add multiple books to your cart and purchase them all at once.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major Nigerian debit and credit cards, bank transfers, and USSD through Paystack. All prices are in NGN (Nigerian Naira).',
  },
  {
    q: 'How do I access my purchased books?',
    a: 'After a successful purchase, the book is automatically added to your personal library at /library. You can access it anytime by signing into your account.',
  },
  {
    q: 'Can I read on any device?',
    a: 'Yes. Your books are available on any device with internet access — phone, tablet, or computer. Simply log into your account and visit your library.',
  },
  {
    q: 'Do I get lifetime access?',
    a: 'Yes. Once you purchase a book, you own it for life. No subscriptions, no recurring fees.',
  },
  {
    q: 'Can I read offline?',
    a: 'Currently our platform requires an internet connection to access your books. Offline reading is coming soon.',
  },
  {
    q: 'What is your refund policy?',
    a: 'Due to the digital nature of our products, all sales are final. If you experience any technical issues with accessing your purchase, please contact our support team.',
  },
  {
    q: 'How do I create an account?',
    a: 'Click "Sign up" in the top right corner, enter your name, email, and a password (minimum 8 characters). You will be signed in automatically after registration.',
  },
  {
    q: 'I forgot my password — what do I do?',
    a: 'Click "Sign in" then "Forgot password?" on the login page. Enter your email address and we will send you a password reset link.',
  },
  {
    q: 'Can I update my profile information?',
    a: 'Yes. Sign in and go to your Profile page. You can update your name, username, and phone number there.',
  },
  {
    q: 'What categories of books do you offer?',
    a: 'We currently offer books in six categories: Mindset & Confidence, Career & Wealth, Wellness & Self-Care, Relationships, Spirituality & Purpose, and Leadership.',
  },
  {
    q: 'Are the books physical or digital?',
    a: 'All books are digital eBooks. There are no physical products or shipping. You get instant access after purchase.',
  },
  {
    q: 'Is my payment information secure?',
    a: 'Absolutely. All payments are processed securely through Paystack, a PCI-DSS compliant payment gateway. We do not store your card or bank details.',
  },
  {
    q: 'How do I contact support?',
    a: 'For any inquiries or issues, please email our support team. We aim to respond within 24 hours.',
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
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-10 md:px-6">
          <AccordionGroup items={FAQS} />
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
