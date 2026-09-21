import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Refund & Purchase Policy | TransformHer',
  description: 'TransformHer policy for digital-book purchases, payment issues, and refunds.',
}

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund & Purchase Policy" lastUpdated="21 September 2026">
      <p>
        TransformHer sells digital products that can become available shortly
        after payment confirmation. This policy explains how we handle purchase
        problems, duplicate charges, and refund requests.
      </p>

      <h2>Successful digital purchases</h2>
      <p>
        Because digital books can be delivered immediately and cannot be
        physically returned, completed purchases are generally final once access
        has been granted, except where applicable law requires otherwise or
        where this policy provides an exception.
      </p>

      <h2>When we will review a refund request</h2>
      <p>
        We will review requests involving duplicate charges, a payment that was
        taken but did not result in the purchased book being added to the
        customer&apos;s library, an incorrect amount charged by our checkout
        flow, or another verified technical or billing error attributable to the
        transaction.
      </p>

      <h2>Failed or pending payments</h2>
      <p>
        If Paystack or your financial institution reports a payment as failed or
        pending, access may not be granted until payment is confirmed. Some
        failed or reversed transactions may be released automatically by the
        payment provider or bank. If a charge remains unresolved, contact
        support with the transaction reference and the email address used for
        the purchase.
      </p>

      <h2>How to request help</h2>
      <p>
        Email{' '}
        <a href="mailto:transformher360@gmail.com">
          transformher360@gmail.com
        </a>{' '}
        with your account email, order or transaction reference, the book
        purchased, the amount charged, and a short description of the problem.
        Do not send full card details, passwords, or one-time codes.
      </p>

      <h2>Review and resolution</h2>
      <p>
        We may verify the order, payment status, entitlement history, and
        relevant technical logs before deciding the appropriate resolution.
        Depending on the issue, the resolution may be restored access, correction
        of the order, or a refund where appropriate.
      </p>

      <h2>Abuse and chargebacks</h2>
      <p>
        Fraudulent refund requests, payment abuse, or attempts to retain access
        after an improper reversal may result in account restrictions while the
        matter is investigated.
      </p>

      <h2>Consumer rights</h2>
      <p>
        This policy does not limit any refund, cancellation, or consumer rights
        that apply to you and cannot legally be waived.
      </p>
    </LegalPage>
  )
}
