import Link from 'next/link';
import Image from 'next/image';

// ─── Structured data (JSON-LD) ───────────────────────────────────────────────
const SOFTWARE_LD = {
  '@context':              'https://schema.org',
  '@type':                 'SoftwareApplication',
  name:                    'GrumpyWhales',
  applicationCategory:     'FinanceApplication',
  applicationSubCategory:  'Invoicing software',
  operatingSystem:         'Web',
  url:                     'https://grumpywhales.com',
  description:
    'Free invoicing software for UK freelancers, sole traders, contractors and small limited companies. Send professional invoices, automatically detect bank payments via Open Banking, and chase overdue clients automatically.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' },
  featureList: [
    'Create and send professional invoices',
    'Automatic payment detection via UK Open Banking',
    'Auto-match bank transactions to invoices',
    'Automated polite, then firmer, chase emails for overdue invoices',
    'Automatic thank-you emails on payment received',
    'Free forever — no card required, no upgrade prompts',
    'VAT-ready invoicing',
    'Designed for sole traders, freelancers, consultants and small UK businesses',
  ],
  inLanguage: 'en-GB',
  audience: {
    '@type': 'BusinessAudience',
    audienceType: 'UK freelancers, sole traders, contractors, consultants, limited company directors',
    geographicArea: { '@type': 'Country', name: 'United Kingdom' },
  },
};

const ORG_LD = {
  '@context': 'https://schema.org',
  '@type':    'Organization',
  name:       'GrumpyWhales',
  url:        'https://grumpywhales.com',
  logo:       'https://grumpywhales.com/logo.png',
  description:
    'GrumpyWhales is a free invoicing platform for UK freelancers and small businesses. We use Open Banking to automatically match payments to invoices and send chase emails on your behalf.',
  areaServed: { '@type': 'Country', name: 'United Kingdom' },
};

const FAQS = [
  {
    q: 'Is GrumpyWhales really free to use?',
    a: 'Yes. Creating an account, sending invoices, connecting your bank for payment tracking, and the automated chase and thank-you emails are all free. No card required to sign up, no trial countdown, no monthly limit on invoices. We may eventually add an optional Pro tier with extras, but the core invoicing and payment-tracking features will stay free.',
  },
  {
    q: 'How does the automatic payment detection work?',
    a: 'When your client pays you by bank transfer, GrumpyWhales reads your bank transactions through the Plaid Open Banking connection (FCA-regulated, read-only) and matches the incoming amount and reference against your open invoices. When a match is found, the invoice is marked as paid and we send a thank-you email to your client automatically.',
  },
  {
    q: 'Which UK banks are supported?',
    a: 'All major UK banks are supported via Plaid, including Lloyds, Barclays, HSBC, NatWest, Santander, RBS, Halifax, Nationwide, Monzo, Starling, Revolut and Chase UK. Read-only access — we cannot move money or change anything in your account.',
  },
  {
    q: 'Is this suitable for sole traders, freelancers and limited companies?',
    a: 'Yes. GrumpyWhales is built specifically for UK self-employed people: sole traders, freelancers, contractors, consultants and directors of small limited companies. You can set your VAT number, business address and trading name on the invoice; we generate a sequential invoice number (INV-2026-0001) and a unique payment reference for each invoice.',
  },
  {
    q: 'How quickly are payments detected after a client pays?',
    a: 'Most UK Open Banking accounts refresh within 15 minutes to a few hours of a transaction posting. Plaid typically delivers transaction updates within this window — Monzo and Starling are usually fastest, traditional banks slower. You can always mark an invoice as paid manually if you need an instant status change.',
  },
  {
    q: 'When do the chase emails go out?',
    a: 'By default, the first polite reminder goes out 7 days after an invoice becomes overdue. You can change this delay in Settings. We send up to three escalating reminders (polite → firmer → final notice). All chase emails reference your original invoice number, amount due and bank payment reference.',
  },
  {
    q: 'Do you store my Government Gateway, HMRC, or bank login details?',
    a: 'No. Sign-in to your bank happens through Plaid’s own secure flow — we never see your bank password. We only store an opaque access token that lets us read your transactions. You can disconnect the bank at any time from your dashboard or directly with Plaid.',
  },
  {
    q: 'Is GrumpyWhales MTD compatible?',
    a: 'GrumpyWhales focuses on invoicing and accounts-receivable workflow. It is not currently an HMRC-recognised Making Tax Digital (MTD) bridging tool. For MTD VAT or MTD ITSA filing you’ll still need a separate HMRC-recognised tool; the invoice data inside GrumpyWhales can be exported as CSV to feed into one.',
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

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />

      <nav className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)', textDecoration: 'none' }}>
          <Image src="/logo.png" alt="GrumpyWhales logo" width={36} height={36} priority style={{ borderRadius: 6 }} />
          GrumpyWhales
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="#how-it-works" className="text-[color:var(--color-muted)] hover:text-white hidden sm:inline">How it works</Link>
          <Link href="#faq"          className="text-[color:var(--color-muted)] hover:text-white hidden sm:inline">FAQ</Link>
          <Link href="/login"        className="text-[color:var(--color-muted)] hover:text-white">Log in</Link>
          <Link href="/register"     className="px-5 py-2 rounded-full font-medium" style={{ backgroundColor: 'var(--color-accent)', color: '#0E1116' }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-12 text-center">
        <div className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ backgroundColor: '#1E4736', color: '#34D399', letterSpacing: '0.04em' }}>
          FREE · NO CARD REQUIRED
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6" style={{ fontFamily: 'var(--font-display)' }}>
          Get paid faster.<br />
          <span style={{ color: 'var(--color-accent)' }}>Without nagging.</span>
        </h1>
        <p className="text-lg text-[color:var(--color-muted)] max-w-2xl mx-auto mb-10">
          Free invoicing software for UK freelancers, sole traders and small limited companies.
          Send invoices, watch GrumpyWhales auto-match incoming bank payments via Open Banking,
          and let it chase overdue clients on your behalf.
        </p>
        <Link href="/register" className="inline-block px-8 py-3 rounded-full font-medium text-base" style={{ backgroundColor: 'var(--color-accent)', color: '#0E1116' }}>
          Get started — it&apos;s free →
        </Link>
        <p className="text-xs text-[color:var(--color-muted)] mt-4">
          Always free · No card · No upgrade prompts · UK bank accounts via Plaid Open Banking
        </p>
      </section>

      {/* 3 FEATURES */}
      <section className="max-w-5xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Send invoices',     body: 'Create, customise and email professional invoices to clients in under a minute. PDF download and a unique bank payment reference are generated automatically for each invoice.' },
          { title: 'Auto-detect paid',  body: 'GrumpyWhales watches your UK bank account via Plaid Open Banking and matches every incoming transaction against your open invoices, marking them paid the moment money lands.' },
          { title: 'Chase + thank',     body: 'When an invoice goes overdue, GrumpyWhales sends polite then progressively firmer reminders. When payment arrives, it sends a thank-you on your behalf.' },
        ].map(f => (
          <div key={f.title} className="p-6 rounded-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-fg)' }}>{f.title}</h3>
            <p className="text-sm text-[color:var(--color-muted)]">{f.body}</p>
          </div>
        ))}
      </section>

      {/* WHO IT'S FOR */}
      <section className="max-w-5xl mx-auto px-6 pb-20" id="who-its-for">
        <h2 className="text-3xl font-semibold text-center mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          Built for UK self-employed people
        </h2>
        <p className="text-center text-[color:var(--color-muted)] max-w-2xl mx-auto mb-10">
          Whether you trade as an individual or through a limited company, GrumpyWhales gives you
          everything you need to bill clients and get paid — without the bloat of full accounting suites.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { who: 'Sole traders & freelancers',        body: 'Self-employed designers, writers, developers, photographers and tradespeople billing clients direct. One bank, simple invoices, automatic payment tracking.' },
            { who: 'Consultants & contractors',         body: 'Day-rate consultants and IT contractors invoicing through their own company. Sequential invoice numbers and clear payment references on every invoice.' },
            { who: 'Small limited companies',           body: 'Directors of single-person and small Ltd companies who want polished invoicing without paying for FreshBooks or QuickBooks.' },
            { who: 'Side-hustlers & part-time traders', body: 'People earning self-employment income alongside a job. GrumpyWhales scales down to one invoice a year, with no minimum spend.' },
          ].map(item => (
            <div key={item.who} className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <h3 className="text-base font-semibold mb-1.5" style={{ color: 'var(--color-fg)' }}>{item.who}</h3>
              <p className="text-sm text-[color:var(--color-muted)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-4xl mx-auto px-6 pb-20" id="how-it-works">
        <h2 className="text-3xl font-semibold text-center mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          How GrumpyWhales works
        </h2>
        <p className="text-center text-[color:var(--color-muted)] max-w-2xl mx-auto mb-10">
          Four steps from sign-up to your first &ldquo;paid&rdquo; email.
        </p>
        <ol className="space-y-5">
          {[
            { step: 'Sign up with Google or email',  body: 'No card required. No phone number. Set your trading name, address and VAT number once in Settings — they appear on every invoice.' },
            { step: 'Connect your UK bank account',  body: 'A 30-second Plaid Open Banking flow links your business or personal account in read-only mode. We use the same FCA-regulated infrastructure used by Monzo, Starling and Revolut.' },
            { step: 'Create and send invoices',      body: 'Add clients, build line items, choose VAT rate (0 / 5 / 20 %). GrumpyWhales generates a sequential invoice number and a unique bank payment reference. Email it directly from the dashboard.' },
            { step: 'Sit back, GrumpyWhales watches', body: 'When your client pays, the incoming bank transaction is matched to the invoice and a thank-you email goes out. If they don’t pay, polite chase emails go out at the schedule you choose.' },
          ].map((s, i) => (
            <li key={s.step} className="flex gap-4 p-5 rounded-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <span className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-semibold" style={{ backgroundColor: 'var(--color-accent)', color: '#0E1116' }}>
                {i + 1}
              </span>
              <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--color-fg)' }}>{s.step}</h3>
                <p className="text-sm text-[color:var(--color-muted)]">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* PRICING */}
      <section className="max-w-3xl mx-auto px-6 pb-20 text-center" id="pricing">
        <div className="p-8 rounded-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h2 className="text-2xl font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            Pricing? There isn&apos;t one.
          </h2>
          <p className="text-sm text-[color:var(--color-muted)] mb-2">
            GrumpyWhales is <strong style={{ color: 'var(--color-fg)' }}>free</strong> — no trial countdown, no
            invoice limits, no &ldquo;upgrade to unlock&rdquo; popups. Every feature works the same whether you send
            one invoice a year or a hundred a month.
          </p>
          <p className="text-xs text-[color:var(--color-muted)] mt-4" style={{ opacity: 0.7 }}>
            We may later add a Pro tier with optional extras, but the core (invoicing + payment matching +
            chase emails) will stay free.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-24" id="faq">
        <h2 className="text-3xl font-semibold text-center mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          Frequently asked questions
        </h2>
        <p className="text-center text-[color:var(--color-muted)] mb-10">
          Everything else worth knowing before you sign up.
        </p>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <details key={i} className="p-5 rounded-2xl group" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <summary className="cursor-pointer font-semibold list-none flex justify-between items-center" style={{ color: 'var(--color-fg)' }}>
                <span>{f.q}</span>
                <span className="text-lg ml-3" style={{ color: 'var(--color-muted)' }}>+</span>
              </summary>
              <p className="text-sm mt-3" style={{ color: 'var(--color-muted)', lineHeight: 1.7 }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-3xl font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          Stop chasing. Start whaling.
        </h2>
        <p className="text-[color:var(--color-muted)] mb-8">
          Two minutes to your first invoice. No card. No upgrade screens. Just invoicing that gets out of your way.
        </p>
        <Link href="/register" className="inline-block px-8 py-3 rounded-full font-medium text-base" style={{ backgroundColor: 'var(--color-accent)', color: '#0E1116' }}>
          Create my free account →
        </Link>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-10 border-t text-sm flex justify-between" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
        <span>© {new Date().getFullYear()} GrumpyWhales · Built for UK freelancers</span>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/terms"   className="hover:text-white">Terms</Link>
        </div>
      </footer>
    </main>
  );
}
