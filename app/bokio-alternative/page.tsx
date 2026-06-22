import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

// ─── Bokio shutdown anchor ───────────────────────────────────────────────────
// Used for the days-left badge. If Bokio's announcement changes, edit this
// date and then grep the file for the previous human-readable form
// (e.g. '7 July 2026' / '7 Jul 2026' / 'Closing 7 July') and update those too.
// Source: official Bokio email announcement.
const BOKIO_END_DATE_ISO = '2026-07-07';

export const revalidate = 86400; // re-render once a day so the countdown moves

export const metadata: Metadata = {
  title: 'Bokio alternative — migrate before 7 July 2026, free forever',
  description:
    'Bokio is winding down its UK operations on 7 July 2026. Move your invoicing to GrumpyWhales — free for UK freelancers and small businesses, with automatic Open Banking payment matching and chase emails. No card required.',
  alternates: { canonical: 'https://grumpywhales.com/bokio-alternative' },
  keywords: [
    'bokio alternative',
    'bokio alternative UK',
    'bokio shutting down 2026',
    'bokio closing UK',
    'bokio replacement',
    'migrate from bokio',
    'free alternative to bokio',
    'invoicing software like bokio',
    'bokio sole trader alternative',
    'bokio limited company alternative',
    'UK freelancer invoicing after bokio',
    'export invoices from bokio',
    'bokio CSV export',
  ],
  openGraph: {
    title: 'Bokio alternative — migrate before 7 July 2026, free forever',
    description:
      'Bokio is leaving the UK. GrumpyWhales is free, UK-focused, and adds Open Banking auto-match and chase emails that Bokio never had.',
    url: 'https://grumpywhales.com/bokio-alternative',
    type: 'website',
    locale: 'en_GB',
  },
};

const FAQS = [
  {
    q: 'Is Bokio really shutting down in the UK?',
    a: 'Bokio has announced it is winding down its UK operations on 7 July 2026, after dropping its free tier in 2023. Existing customers have been notified to export their data and find an alternative. Please refer to Bokio\'s own announcement for the official details — they have offered refunds for unused subscription time.',
  },
  {
    q: 'Will GrumpyWhales import my Bokio data?',
    a: 'Yes — for the migration window, we will personally help. Export your clients and invoices as CSV from Bokio (Settings → Data Export), email the files to hello@grumpywhales.com, and we will load them into your GrumpyWhales account by hand within one working day. Self-serve CSV import is coming later in 2026; until then, the concierge route is faster and free.',
  },
  {
    q: 'Is GrumpyWhales actually free, or is this a trial?',
    a: 'It is free, full stop. Send invoices, connect your UK bank, receive chase emails — all free, no card required, no trial countdown. We may add an optional paid tier later for multi-user teams and white-labelling, but the core invoicing and payment-tracking features will stay free forever.',
  },
  {
    q: 'I am VAT registered. Will GrumpyWhales handle MTD VAT submission?',
    a: 'Not yet — direct HMRC MTD VAT submission is on the roadmap for late 2026. For now, GrumpyWhales produces VAT-aware invoices (with VAT amount lines and your VAT number on every invoice) but does not file the VAT return itself. If you are over the VAT threshold and need MTD filing today, pair us with a bookkeeping tool that does — or message us about an early-access integration.',
  },
  {
    q: 'Bokio did double-entry bookkeeping. Does GrumpyWhales?',
    a: 'No, intentionally. GrumpyWhales focuses on three things: sending invoices, automatically detecting payments via Open Banking, and chasing late payers. We do not maintain a general ledger or balance sheet. If you need full bookkeeping for end-of-year accounts, keep using your accountant\'s tool — we sit happily alongside it.',
  },
  {
    q: 'Which UK banks does Open Banking auto-match work with?',
    a: 'Any UK bank or building society that Plaid supports — which is essentially every major retail and business bank (Barclays, Lloyds, HSBC, NatWest, Santander, Nationwide, Monzo, Starling, Revolut, Tide, Mettle and most others). You connect once via Plaid\'s standard Open Banking flow, and we automatically match incoming credits to your invoices using a payment reference we generate (e.g. GW-0001-AB12X9).',
  },
  {
    q: 'How long does it take to migrate?',
    a: 'Setting up your GrumpyWhales account takes about 60 seconds. Connecting your bank takes another minute. Importing your client and invoice list from Bokio — if you send us the CSV — takes us under a working day. So you can be back to invoicing the same day you leave Bokio.',
  },
  {
    q: 'What if my Bokio invoice numbers were INV-2024-0042? Can I keep that sequence?',
    a: 'Yes. After we load your invoice history, your next new invoice will continue your existing sequence rather than restart at INV-2026-0001. If you prefer to start a fresh sequence, just say so — both are supported.',
  },
];

const FAQ_LD = {
  '@context': 'https://schema.org',
  '@type':    'FAQPage',
  mainEntity: FAQS.map(f => ({
    '@type': 'Question',
    name:    f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

const BREADCRUMB_LD = {
  '@context': 'https://schema.org',
  '@type':    'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'GrumpyWhales',         item: 'https://grumpywhales.com' },
    { '@type': 'ListItem', position: 2, name: 'Bokio alternative',    item: 'https://grumpywhales.com/bokio-alternative' },
  ],
};

function daysLeft(): number {
  const end = new Date(BOKIO_END_DATE_ISO + 'T23:59:59Z').getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
}

export default function BokioAlternativePage() {
  const left = daysLeft();
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_LD) }} />

      {/* Nav — mirrors / for consistency */}
      <nav className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)', textDecoration: 'none' }}>
          <Image src="/logo.png" alt="GrumpyWhales logo" width={36} height={36} priority style={{ borderRadius: 6 }} />
          GrumpyWhales
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/#how-it-works" className="text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] hidden sm:inline">How it works</Link>
          <Link href="/login"         className="text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]">Log in</Link>
          <Link href="/register"      className="px-5 py-2 rounded-full font-medium" style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* Urgency banner */}
      {left > 0 && (
        <div className="max-w-3xl mx-auto px-6 mt-4">
          <div
            className="rounded-2xl px-5 py-3 flex items-center justify-between text-sm"
            style={{ backgroundColor: '#FEE2E2', border: '1px solid var(--color-red)', color: '#7F1D1D' }}
            role="alert"
          >
            <span>
              <strong style={{ color: 'var(--color-red)' }}>Bokio is closing on 7 July 2026.</strong>{' '}
              <span>{left} days left to move your invoices.</span>
            </span>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-12 pb-10 text-center">
        <div className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-6" style={{ backgroundColor: 'var(--color-yellow)', color: 'var(--color-dark)', letterSpacing: '0.06em' }}>
          THE FREE BOKIO ALTERNATIVE FOR UK FREELANCERS
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-5" style={{ fontFamily: 'var(--font-display)' }}>
          Bokio shutting down?<br />
          <span style={{ color: 'var(--color-accent)' }}>Move your invoicing in 2 minutes.</span>
        </h1>
        <p className="text-lg leading-relaxed mb-8" style={{ color: 'var(--color-muted)' }}>
          GrumpyWhales is a free invoicing tool for UK freelancers, sole traders and small limited companies — with two things Bokio never had: <strong style={{ color: 'var(--color-fg)' }}>automatic Open Banking payment matching</strong>, and <strong style={{ color: 'var(--color-fg)' }}>polite-then-firm chase emails</strong> sent for you. Free forever, no card required, no trial countdown.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="px-8 py-3 rounded-full font-medium text-base"
            style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
          >
            Move to GrumpyWhales — free
          </Link>
          <a
            href="mailto:hello@grumpywhales.com?subject=Bokio%20CSV%20migration"
            className="px-8 py-3 rounded-full font-medium text-base border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-fg)' }}
          >
            Email us your Bokio CSV
          </a>
        </div>
      </section>

      {/* Comparison table */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-semibold mb-2 text-center" style={{ fontFamily: 'var(--font-display)' }}>
          Bokio vs GrumpyWhales
        </h2>
        <p className="text-sm text-center mb-8" style={{ color: 'var(--color-muted)' }}>
          What stays the same, what gets better, what you actually save.
        </p>

        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left px-5 py-3 font-medium" style={{ color: 'var(--color-muted)' }}>Feature</th>
                <th className="text-center px-5 py-3 font-medium" style={{ color: 'var(--color-muted)' }}>Bokio (until 7 Jul 2026)</th>
                <th className="text-center px-5 py-3 font-medium" style={{ color: 'var(--color-accent)' }}>GrumpyWhales</th>
              </tr>
            </thead>
            <tbody>
              <Row label="Available in the UK"                        bokio="Closing 7 July"         us="Yes, UK-first" usAccent />
              <Row label="Price"                                       bokio="£24.95/mo"              us="Free, forever" usAccent />
              <Row label="Send professional invoices"                  bokio="Yes"                    us="Yes" />
              <Row label="UK VAT-ready invoices (VAT number, lines)"   bokio="Yes"                    us="Yes" />
              <Row label="Open Banking auto-match (bank → invoice)"    bokio="No"                     us="Yes, any UK bank" usAccent />
              <Row label="Automatic chase emails for overdue invoices" bokio="No"                     us="Yes, escalating tone" usAccent />
              <Row label="Automatic thank-you on payment received"     bokio="No"                     us="Yes" usAccent />
              <Row label="HMRC MTD VAT submission"                     bokio="Yes"                    us="Coming late 2026" bokioAccent />
              <Row label="Double-entry bookkeeping ledger"             bokio="Yes (full)"             us="No — by design" bokioAccent />
              <Row label="Card required to sign up"                    bokio="Yes"                    us="No" usAccent />
              <Row label="Account closure deadline"                    bokio="7 July 2026"           us="None" usAccent last />
            </tbody>
          </table>
        </div>
      </section>

      {/* Migration steps */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-semibold mb-8 text-center" style={{ fontFamily: 'var(--font-display)' }}>
          How to migrate in under 10 minutes
        </h2>
        <ol className="space-y-5">
          <Step n={1} title="Export your Bokio data">
            Sign in to Bokio → <em>Settings → Data Export</em>. Download the <strong>Clients</strong> and <strong>Invoices</strong> CSVs. (Bokio is offering refunds for unused subscription time — worth checking.)
          </Step>
          <Step n={2} title="Create your GrumpyWhales account">
            Go to <Link href="/register" style={{ color: 'var(--color-accent)' }}>grumpywhales.com/register</Link>. Sign up with Google or email + password. 60 seconds, no card.
          </Step>
          <Step n={3} title="Email us your CSVs">
            Send the two CSV files to <a href="mailto:hello@grumpywhales.com" style={{ color: 'var(--color-accent)' }}>hello@grumpywhales.com</a> with the subject &ldquo;Bokio CSV migration&rdquo;. We load them into your account by hand within one working day. Your invoice number sequence is preserved.
          </Step>
          <Step n={4} title="Connect your bank" last>
            From the dashboard, go to <em>Banking → Connect a bank</em>. Pick your UK bank, authorise via Open Banking (Plaid handles this), and from then on every incoming credit is auto-matched to its invoice. Done.
          </Step>
        </ol>
      </section>

      {/* Why this exists */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-semibold mb-6 text-center" style={{ fontFamily: 'var(--font-display)' }}>
          Two things Bokio never gave you
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Card title="Automatic payment matching">
            Bokio could pull your bank feed but never matched incoming credits to specific invoices. GrumpyWhales does, on any UK bank, via Plaid Open Banking. The invoice flips to <em>paid</em> the moment your client&apos;s transfer lands.
          </Card>
          <Card title="Chase emails on autopilot">
            Bokio had no built-in late-payment reminders — that&apos;s a job you had to do yourself. GrumpyWhales sends polite-then-firmer chase emails on your schedule, and stops the moment the payment arrives.
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-semibold mb-6 text-center" style={{ fontFamily: 'var(--font-display)' }}>
          Bokio-specific questions
        </h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="rounded-xl px-5 py-4"
              style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
            >
              <summary className="cursor-pointer font-medium text-sm">{f.q}</summary>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-semibold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
          Stop watching the Bokio countdown.
        </h2>
        <p className="text-base mb-8" style={{ color: 'var(--color-muted)' }}>
          Open a free GrumpyWhales account now. Move your data when you&apos;re ready — same week, same day, same hour. We&apos;ll be here.
        </p>
        <Link
          href="/register"
          className="px-8 py-3 rounded-full font-medium text-base inline-block"
          style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
        >
          Get started — free forever
        </Link>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 text-center text-xs" style={{ color: 'var(--color-muted)' }}>
        <div className="flex justify-center gap-4 mb-2">
          <Link href="/privacy" className="hover:text-[color:var(--color-fg)]">Privacy</Link>
          <Link href="/terms"   className="hover:text-[color:var(--color-fg)]">Terms</Link>
        </div>
        © {new Date().getUTCFullYear()} GrumpyWhales
      </footer>
    </main>
  );
}

function Row({
  label, bokio, us, usAccent, bokioAccent, last,
}: {
  label: string; bokio: string; us: string;
  usAccent?: boolean; bokioAccent?: boolean; last?: boolean;
}) {
  const usStyle    = usAccent    ? { color: 'var(--color-accent)', fontWeight: 600 as const } : {};
  const bokioStyle = bokioAccent ? { color: 'var(--color-red)',    fontWeight: 600 as const } : { color: 'var(--color-muted)' };
  return (
    <tr style={last ? {} : { borderBottom: '1px solid var(--color-border)' }}>
      <td className="px-5 py-3">{label}</td>
      <td className="px-5 py-3 text-center" style={bokioStyle}>{bokio}</td>
      <td className="px-5 py-3 text-center" style={usStyle}>{us}</td>
    </tr>
  );
}

function Step({ n, title, children, last }: { n: number; title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <li className="flex gap-4">
      <div
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
        style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', fontFamily: 'var(--font-display)' }}
      >
        {n}
      </div>
      <div className={last ? '' : 'pb-5'} style={last ? {} : { borderBottom: '1px solid var(--color-border)' }}>
        <h3 className="font-medium mb-1">{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>{children}</p>
      </div>
    </li>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>{children}</p>
    </div>
  );
}
