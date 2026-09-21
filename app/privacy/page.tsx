import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Privacy Policy | TransformHer',
  description: 'How TransformHer collects, uses, stores, and protects personal information.',
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="21 September 2026">
      <p>
        This Privacy Policy explains how TransformHer handles information when
        you use our website, create an account, purchase digital books, contact
        support, or use your protected library.
      </p>

      <h2>Information we collect</h2>
      <p>
        We may collect account and profile information such as your name, email
        address, username, phone number when provided, authentication and
        security records, purchase and order information, library entitlements,
        support communications, and technical information needed to operate and
        protect the service.
      </p>

      <h2>Payments</h2>
      <p>
        Payments are processed through Paystack. TransformHer does not need to
        store your full payment-card details. Payment status, transaction
        references, amounts, and related order information may be stored so we
        can confirm purchases and grant access to digital products.
      </p>

      <h2>Email and service providers</h2>
      <p>
        We use service providers to operate TransformHer, including Courier for
        transactional email, Vercel for hosting and application infrastructure,
        Neon/PostgreSQL for application data, and Paystack for payments. These
        providers may process information only as needed to provide their
        services to TransformHer and subject to their own terms and privacy
        practices.
      </p>

      <h2>Translation</h2>
      <p>
        Public marketing and catalogue pages may use Translate.js to provide
        language translation. TransformHer does not load this third-party
        translator on authentication, account, cart, admin, verification, or
        protected-library routes.
      </p>

      <h2>How we use information</h2>
      <p>
        We use information to create and secure accounts, verify email
        addresses, process and confirm purchases, provide access to purchased
        books, send transactional messages, support users, prevent abuse,
        investigate security events, comply with legal obligations, and improve
        service reliability.
      </p>

      <h2>Data retention</h2>
      <p>
        We retain information for as long as reasonably necessary to provide the
        service, protect accounts and transactions, maintain required records,
        resolve disputes, prevent fraud, and meet applicable legal or compliance
        obligations. Some security, transaction, and account-lifecycle records
        may need to be retained after an account is closed.
      </p>

      <h2>Your choices and rights</h2>
      <p>
        Depending on applicable law, you may have rights to request access,
        correction, deletion, or other controls over your personal information.
        Some information may need to be retained where required for security,
        transaction records, fraud prevention, dispute handling, or legal
        obligations.
      </p>

      <h2>Security</h2>
      <p>
        We use technical and organizational safeguards designed to protect
        accounts, sessions, payments, administrative actions, and protected
        library access. No internet service can guarantee absolute security.
      </p>

      <h2>Children</h2>
      <p>
        TransformHer is not intended for children who are not legally able to
        create an account or make purchases without appropriate consent under
        applicable law.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this Privacy Policy as the service changes. The latest
        version will be posted on this page with its effective date.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy questions or requests, contact{' '}
        <a href="mailto:transformher360@gmail.com">
          transformher360@gmail.com
        </a>.
      </p>
    </LegalPage>
  )
}
