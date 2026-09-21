import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Terms of Use | TransformHer',
  description: 'Terms governing use of TransformHer and purchases of digital books.',
}

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" lastUpdated="21 September 2026">
      <p>
        These Terms govern your use of TransformHer, including your account,
        purchases, digital library, and access to digital books. By using the
        service, you agree to these Terms.
      </p>

      <h2>Accounts</h2>
      <p>
        You are responsible for providing accurate information, protecting your
        login credentials, and using your account lawfully. You must not share,
        sell, transfer, or misuse access in a way that compromises another
        person&apos;s account or TransformHer&apos;s systems.
      </p>

      <h2>Digital products and licences</h2>
      <p>
        Unless a product page expressly says otherwise, purchasing a digital
        book gives you a personal, non-exclusive, non-transferable right to
        access that book through TransformHer. A purchase does not transfer
        copyright or ownership of the underlying work.
      </p>
      <p>
        You may not unlawfully copy, redistribute, resell, publish, scrape,
        bypass access controls for, or make purchased content available to
        others.
      </p>

      <h2>Prices and payments</h2>
      <p>
        Prices are shown before checkout and may change for future purchases.
        Payments are processed by Paystack. Access is granted only after a
        payment is successfully confirmed by TransformHer.
      </p>

      <h2>Availability</h2>
      <p>
        We work to keep TransformHer available and reliable, but temporary
        outages, maintenance, provider failures, security incidents, or other
        technical problems can occur. We may modify, suspend, or discontinue
        features when reasonably necessary to maintain or improve the service.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You must not attempt to bypass authentication or payment controls,
        access another user&apos;s library or data, interfere with the service,
        upload malicious material, automate abusive requests, reverse engineer
        protected access controls, or use TransformHer for unlawful activity.
      </p>

      <h2>Account restrictions</h2>
      <p>
        We may freeze, restrict, suspend, or close accounts when reasonably
        necessary to protect users, investigate fraud or abuse, enforce these
        Terms, comply with law, or secure the platform. Where appropriate, we
        may provide a way to contact support regarding the action.
      </p>

      <h2>Intellectual property</h2>
      <p>
        TransformHer&apos;s branding, application code, design, and original
        materials are protected by applicable intellectual-property laws. Books
        and other third-party works remain the property of their respective
        rights holders.
      </p>

      <h2>Refunds</h2>
      <p>
        Refund and purchase-dispute handling is described in our Refund and
        Purchase Policy. Nothing in these Terms removes rights that cannot
        legally be excluded under applicable consumer law.
      </p>

      <h2>Limitation and responsibility</h2>
      <p>
        To the maximum extent permitted by applicable law, TransformHer is not
        responsible for indirect or consequential losses arising from events
        outside its reasonable control. Nothing here excludes liability that
        cannot legally be excluded.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these Terms as TransformHer evolves. The current version
        and effective date will be posted on this page.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms can be sent to{' '}
        <a href="mailto:transformher360@gmail.com">
          transformher360@gmail.com
        </a>.
      </p>
    </LegalPage>
  )
}
