import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How GrumpyWhales collects, uses, stores, and shares personal data — under UK GDPR.',
};

const EFFECTIVE = '12 June 2026';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm" style={{ color: 'var(--color-accent)' }}>← Back to home</Link>
        <h1 className="mt-6 mb-2 text-4xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Privacy Policy</h1>
        <p className="text-sm mb-12" style={{ color: 'var(--color-muted)' }}>Effective {EFFECTIVE}</p>

        <Section title="1. Who we are">
          <p>
            GrumpyWhales (“we”, “us”, “our”) provides a free, web-based invoicing tool for UK freelancers,
            sole traders and small businesses, available at <a href="https://grumpywhales.com" className="underline">grumpywhales.com</a>.
            We are the data controller for personal data you give us when you create an account and use the
            service. For data you upload <em>about your own clients</em> (their names, emails, billing addresses)
            we act as a processor on your behalf, and you remain the controller of that data.
          </p>
          <p>
            For questions about this policy or to exercise your rights, email{' '}
            <a href="mailto:privacy@grumpywhales.com" className="underline">privacy@grumpywhales.com</a>.
          </p>
        </Section>

        <Section title="2. What personal data we collect">
          <ul className="list-disc pl-6 space-y-1.5">
            <li><strong>Account data:</strong> your name, email address, and (if you set a password) a salted bcrypt hash of that password.</li>
            <li><strong>Google sign-in:</strong> if you sign in with Google, we receive your Google email, name and profile picture URL via Google OAuth.</li>
            <li><strong>Business details:</strong> any company name, VAT registration number and business address you choose to add to your profile so they appear on invoices.</li>
            <li><strong>Client records:</strong> the names, emails and addresses of the clients you invoice, which you provide.</li>
            <li><strong>Invoice data:</strong> the invoices you create — amounts, line items, descriptions, dates, payment references.</li>
            <li><strong>Payment data (Stripe):</strong> if you pay for an event by card, Stripe processes the card transaction and returns to us a payment intent identifier and the paid status. We <strong>never</strong> see or store your full card number, CVC or expiry date — these stay with Stripe.</li>
            <li><strong>Email activity:</strong> the email address invoices and chase emails are sent to, the Resend message ID, the timestamp, and (when available) whether the email was opened.</li>
            <li><strong>Technical data:</strong> IP address, browser user agent, pages viewed (via Google Analytics 4 with IP anonymisation).</li>
            <li><strong>Cookies:</strong> a session cookie for authentication (essential) and a Google Analytics cookie (analytics).</li>
          </ul>
        </Section>

        <Section title="3. Why we use it (lawful basis — UK GDPR Article 6)">
          <table className="w-full text-sm mt-2 mb-2">
            <thead>
              <tr className="text-left" style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="py-2 pr-4">Purpose</th>
                <th className="py-2">Lawful basis</th>
              </tr>
            </thead>
            <tbody style={{ borderColor: 'var(--color-border)' }}>
              <Row purpose="Creating and managing your account; letting you log in" basis="Performance of a contract with you" />
              <Row purpose="Sending invoices and chase emails to your clients on your instruction" basis="Performance of a contract with you" />
              <Row purpose="Processing card payments for paid events via Stripe" basis="Performance of a contract with you" />
              <Row purpose="Keeping the service secure (rate-limiting, abuse detection, error logs)" basis="Our legitimate interest in operating a secure service" />
              <Row purpose="Anonymised product analytics" basis="Our legitimate interest in improving the product" />
              <Row purpose="Responding to legal requests" basis="Legal obligation" />
            </tbody>
          </table>
        </Section>

        <Section title="4. Card payments — what Stripe does on our behalf">
          <p>
            Paid events are processed by Stripe Payments UK, Ltd, an FCA-authorised electronic money institution. When
            you click Pay, you&apos;re redirected to Stripe&apos;s hosted checkout where you enter your card details. Those
            details never touch GrumpyWhales servers — Stripe handles them under PCI-DSS Level 1 compliance.
          </p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>We receive from Stripe only: a payment intent identifier, the paid amount and currency, and the paid timestamp.</li>
            <li>Refunds are arranged directly between you and the event host; GrumpyWhales doesn&apos;t hold or move funds.</li>
            <li>Stripe&apos;s own privacy notice: <a className="underline" href="https://stripe.com/gb/privacy" target="_blank" rel="noopener noreferrer">stripe.com/gb/privacy</a>.</li>
          </ul>
        </Section>

        <Section title="5. Who we share data with (third-party processors)">
          <p>We use the following processors to run the service. Each is bound by a data processing agreement and only uses data on our instructions:</p>
          <table className="w-full text-sm mt-2 mb-2">
            <thead>
              <tr className="text-left" style={{ color: 'var(--color-muted)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="py-2 pr-4">Processor</th>
                <th className="py-2 pr-4">Purpose</th>
                <th className="py-2">Location</th>
              </tr>
            </thead>
            <tbody>
              <Proc name="Vercel Inc." purpose="Hosting the application" location="EU / United States (SCC-protected transfer)" />
              <Proc name="Supabase Inc." purpose="Storing accounts, invoices and transactions" location="European Union (Frankfurt region)" />
              <Proc name="Stripe Payments UK, Ltd." purpose="Card payment processing" location="United Kingdom / United States (SCC-protected transfer)" />
              <Proc name="Resend, Inc." purpose="Delivering invoice and reminder emails" location="European Union" />
              <Proc name="Google LLC" purpose="Optional OAuth sign-in and anonymised analytics" location="United States (SCC-protected transfer)" />
            </tbody>
          </table>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Where data is transferred outside the UK / EEA, we rely on the UK Addendum to the EU Standard Contractual Clauses.
          </p>
        </Section>

        <Section title="6. How long we keep your data">
          <ul className="list-disc pl-6 space-y-1.5">
            <li><strong>Account, invoices, clients:</strong> while your account is active. After you close your account, we retain accounting-relevant records for 6 years to comply with UK accounting and tax-record obligations (Companies Act 2006 / HMRC).</li>
            <li><strong>Bank access tokens:</strong> deleted immediately on disconnect; in any case within 30 days.</li>
            <li><strong>Payment records:</strong> the payment intent identifier, amount and timestamp for each paid session, kept for 6 years for UK tax record-keeping.</li>
            <li><strong>Email send logs:</strong> 12 months.</li>
            <li><strong>Server logs (IP, user agent):</strong> 30 days.</li>
          </ul>
        </Section>

        <Section title="7. Your rights">
          <p>Under the UK GDPR you have the right to:</p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Ask us for a copy of the personal data we hold about you (right of access).</li>
            <li>Correct anything that&apos;s wrong (right to rectification).</li>
            <li>Ask us to delete your data (right to erasure / right to be forgotten), subject to legal retention requirements.</li>
            <li>Receive your data in a portable format (right to data portability).</li>
            <li>Object to or restrict processing.</li>
            <li>Withdraw consent at any time, where we rely on consent.</li>
            <li>Complain to the Information Commissioner&apos;s Office at <a className="underline" href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a> if you believe we&apos;ve mishandled your data.</li>
          </ul>
          <p>To exercise any of these rights, email <a href="mailto:privacy@grumpywhales.com" className="underline">privacy@grumpywhales.com</a>. We respond within 30 days.</p>
        </Section>

        <Section title="8. Cookies">
          <p>
            We use one essential cookie to keep you signed in (NextAuth session), and one analytics cookie set by Google
            Analytics 4 to measure aggregate usage. The analytics cookie does not include personally identifying information
            and IPs are anonymised before processing. We do not run any advertising cookies.
          </p>
        </Section>

        <Section title="9. Security">
          <p>
            Data is encrypted in transit (TLS 1.2+) and at rest. Passwords are hashed with bcrypt. Bank access tokens
            are only readable by our server-side service role and are never sent to the browser. Access to production data
            is limited to GrumpyWhales personnel under audited credentials.
          </p>
        </Section>

        <Section title="10. Children">
          <p>The service is not directed at people under 18. We do not knowingly collect data from minors.</p>
        </Section>

        <Section title="11. Changes to this policy">
          <p>
            If we change this policy in a way that meaningfully affects you, we&apos;ll email you and post a notice in the
            app. The &ldquo;Effective&rdquo; date at the top will always show when this policy was last revised.
          </p>
        </Section>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--color-fg)' }}>{children}</div>
    </section>
  );
}

function Row({ purpose, basis }: { purpose: string; basis: string }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
      <td className="py-2 pr-4">{purpose}</td>
      <td className="py-2" style={{ color: 'var(--color-muted)' }}>{basis}</td>
    </tr>
  );
}

function Proc({ name, purpose, location }: { name: string; purpose: string; location: string }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
      <td className="py-2 pr-4 font-medium">{name}</td>
      <td className="py-2 pr-4" style={{ color: 'var(--color-muted)' }}>{purpose}</td>
      <td className="py-2" style={{ color: 'var(--color-muted)' }}>{location}</td>
    </tr>
  );
}
