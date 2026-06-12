import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The rules for using GrumpyWhales — free invoicing software for UK freelancers and small businesses.',
};

const EFFECTIVE = '12 June 2026';

export default function TermsPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm" style={{ color: 'var(--color-accent)' }}>← Back to home</Link>
        <h1 className="mt-6 mb-2 text-4xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Terms of Service</h1>
        <p className="text-sm mb-12" style={{ color: 'var(--color-muted)' }}>Effective {EFFECTIVE}</p>

        <Section title="1. Acceptance">
          <p>
            By creating an account or using GrumpyWhales (the &ldquo;Service&rdquo;), you agree to these Terms and our{' '}
            <Link className="underline" href="/privacy">Privacy Policy</Link>. If you do not agree, do not use the Service.
          </p>
        </Section>

        <Section title="2. What the Service does">
          <p>
            GrumpyWhales lets you create invoices, send them to your clients by email, optionally connect a UK bank account
            via Plaid Open Banking so we can automatically detect incoming payments matching your invoice references, and
            send polite reminder and thank-you emails on your behalf. The Service is provided as-is, free of charge.
          </p>
        </Section>

        <Section title="3. Eligibility">
          <p>
            You must be at least 18 years old and resident in the United Kingdom to use the Service. You confirm that the
            information you provide on registration is accurate, and that you have the authority to use the Service on behalf
            of any business or self-employment you represent.
          </p>
        </Section>

        <Section title="4. Your account">
          <p>
            You&apos;re responsible for the security of your credentials and for everything done under your account. Tell us
            immediately at <a className="underline" href="mailto:security@grumpywhales.com">security@grumpywhales.com</a> if
            you suspect unauthorised access.
          </p>
        </Section>

        <Section title="5. Free service — no warranties">
          <p>
            The Service is provided free of charge. To the maximum extent allowed by law, we disclaim all warranties
            (express or implied), including merchantability, fitness for purpose, and non-infringement. We don&apos;t guarantee
            that the Service will be uninterrupted, error-free, or that automatic payment detection will always succeed.
            <strong> You remain responsible for reconciling your own books and submitting your own VAT / self-assessment returns.</strong>
          </p>
        </Section>

        <Section title="6. What you may use the Service for">
          <p>You may use the Service for legitimate UK business invoicing. You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Send spam, fraudulent invoices, phishing emails or any content that violates UK law.</li>
            <li>Use the Service to invoice for goods or services you have not provided.</li>
            <li>Attempt to access another user&apos;s account or data.</li>
            <li>Scrape, reverse-engineer, or interfere with the Service or its underlying infrastructure.</li>
            <li>Use the Service in any way that breaches the acceptable use policies of Plaid, Resend, Supabase, Vercel or Google.</li>
          </ul>
          <p>We may suspend or terminate your account at any time if we reasonably believe you&apos;ve breached these terms.</p>
        </Section>

        <Section title="7. Emails sent to your clients">
          <p>
            When you press &ldquo;Send invoice&rdquo; or when we send a chase / thank-you email on your behalf, the email
            goes to the address you supplied. You confirm that you have a lawful basis (typically the performance of a
            contract with that client) to send them invoicing-related emails. You are the controller of your client&apos;s
            personal data; we act as your processor.
          </p>
        </Section>

        <Section title="8. Open Banking connections">
          <p>
            Bank connections are made via Plaid Financial Ltd, an FCA-authorised Account Information Service Provider.
            You give consent directly to Plaid and your bank when connecting. We only request read access to transactions.
            You may disconnect at any time. Re-authorisation is required every 90 days under PSD2 rules.
          </p>
        </Section>

        <Section title="9. Intellectual property">
          <p>
            The Service&apos;s software, branding, logos and content are owned by GrumpyWhales. You keep ownership of the
            invoices, client data and other content you upload. You grant us a worldwide, non-exclusive, royalty-free
            licence to host, display, transmit and back up that content solely as needed to operate the Service for you.
          </p>
        </Section>

        <Section title="10. Limitation of liability">
          <p>
            Because the Service is provided free of charge, to the maximum extent permitted by law our total aggregate
            liability to you for any claim arising from your use of the Service is limited to £100. We are not liable for
            indirect, consequential, or loss-of-profit damages, missed payments, mis-matched transactions, late chase
            emails, or HMRC penalties — even if we were advised of the possibility.
          </p>
          <p>
            Nothing in these Terms limits liability that cannot lawfully be limited, including liability for death or
            personal injury caused by our negligence, or for fraud.
          </p>
        </Section>

        <Section title="11. Termination">
          <p>
            You can delete your account at any time from <em>Dashboard → Settings → Delete account</em>, or by emailing us.
            We may also terminate or suspend the Service or your account on reasonable notice, except where we suspect
            abuse or a serious breach of these Terms, in which case we may act immediately. On termination, we will delete
            your data subject to the retention periods set out in the Privacy Policy.
          </p>
        </Section>

        <Section title="12. Changes to these terms">
          <p>
            We may update these Terms. If a change materially affects you, we&apos;ll email you at the address on your
            account and post a notice in the app. Continued use after the change takes effect counts as acceptance.
          </p>
        </Section>

        <Section title="13. Governing law">
          <p>
            These Terms are governed by the laws of England and Wales. Disputes will be heard exclusively by the courts
            of England and Wales, except where you are a consumer and the laws of your home country give you a
            non-overridable right to bring an action there.
          </p>
        </Section>

        <Section title="14. Contact">
          <p>
            Questions about these Terms: <a className="underline" href="mailto:hello@grumpywhales.com">hello@grumpywhales.com</a>.
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
