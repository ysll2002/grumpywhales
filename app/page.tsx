import Link from 'next/link';
import Image from 'next/image';

const SOFTWARE_LD = {
  '@context':              'https://schema.org',
  '@type':                 'SoftwareApplication',
  name:                    'GrumpyWhales',
  applicationCategory:     'BusinessApplication',
  applicationSubCategory:  'Event management & paid registration',
  operatingSystem:         'Web',
  url:                     'https://grumpywhales.com',
  description:
    'Create paid events and get paid on time. GrumpyWhales is a free tool for hosts, community organisers, workshops and meet-ups to set up an event, collect attendee fees, and chase late payers automatically.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' },
  featureList: [
    'Create an event in under a minute (title, time, location, fee)',
    'You become the event admin — full control over settings',
    'Unique payment reference generated per event',
    'Automatic payment matching via UK Open Banking',
    'Chase emails for attendees who haven\'t paid',
    'Free forever — no card required, no hidden upgrade',
  ],
  inLanguage: 'en-GB',
};

const ORG_LD = {
  '@context': 'https://schema.org',
  '@type':    'Organization',
  name:       'GrumpyWhales',
  url:        'https://grumpywhales.com',
  logo:       'https://grumpywhales.com/logo.png',
  description:
    'GrumpyWhales is a free tool for hosting paid events. Create an event, set a fee, share with attendees, and get paid on time.',
};

const FAQS = [
  {
    q: 'What kind of events can I host on GrumpyWhales?',
    a: 'Anything with a host, a date, a location, and an attendance fee — meet-ups, workshops, classes, dinners, courses, ticketed gatherings, community memberships. If you can describe it in a title and a fee, you can run it on GrumpyWhales.',
  },
  {
    q: 'How does the payment side work?',
    a: 'When you create an event, we generate a unique payment reference (e.g. GW-EVT-ABC123). You share this reference with attendees. They pay you by bank transfer using the reference, and GrumpyWhales reconciles the incoming payment with the event automatically.',
  },
  {
    q: 'Is GrumpyWhales really free?',
    a: 'Yes. Creating events, managing attendees, collecting fees and chase emails are all free. No card required to sign up, no monthly limit on events, no upgrade prompts. A paid tier with extras may come later but the core stays free.',
  },
  {
    q: 'Do I need a bank account in the UK?',
    a: 'For automatic Open Banking matching, yes — a UK personal or business current account. You can still create events and track them manually without connecting a bank.',
  },
  {
    q: 'Who is the admin of an event I create?',
    a: 'You are. Whoever creates the event is the only admin and the only person who can edit its details, change its status, or delete it.',
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
          Create an event.<br />
          <span style={{ color: 'var(--color-accent)' }}>Get paid on time.</span>
        </h1>
        <p className="text-lg text-[color:var(--color-muted)] max-w-2xl mx-auto mb-10">
          GrumpyWhales lets you set up a paid event in under a minute, share it with attendees,
          and collect their fees without chasing. You stay the admin. We do the matching.
        </p>
        <Link href="/register" className="inline-block px-8 py-3 rounded-full font-medium text-base" style={{ backgroundColor: 'var(--color-accent)', color: '#0E1116' }}>
          Create your first event — it&apos;s free →
        </Link>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-semibold mb-12 text-center" style={{ fontFamily: 'var(--font-display)' }}>
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              n: '1',
              title: 'Create an event',
              body: 'Title, description, time, location, fee. Sixty seconds. You are now the event admin.',
            },
            {
              n: '2',
              title: 'Share the reference',
              body: 'We generate a unique payment reference per event. Attendees use it when they transfer their fee.',
            },
            {
              n: '3',
              title: 'Get paid, on time',
              body: 'GrumpyWhales matches incoming bank transfers to the event and flags anyone who hasn\'t paid yet.',
            },
          ].map(step => (
            <div key={step.n} className="p-6 rounded-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center mb-4 font-semibold" style={{ backgroundColor: 'var(--color-accent)', color: '#0E1116' }}>
                {step.n}
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>{step.title}</h3>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-semibold mb-3 text-center" style={{ fontFamily: 'var(--font-display)' }}>
          Built for hosts who hate chasing
        </h2>
        <p className="text-center mb-12 max-w-2xl mx-auto" style={{ color: 'var(--color-muted)' }}>
          If you organise something people pay to attend, GrumpyWhales is for you.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {[
            'Meet-ups & community events',
            'Workshops & classes',
            'Supper clubs & dinners',
            'Coaching cohorts',
            'Co-working days',
            'Memberships',
            'Tours & retreats',
            'Sports & fitness groups',
          ].map(item => (
            <div key={item} className="p-3 rounded-xl text-center" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }}>
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-semibold mb-8 text-center" style={{ fontFamily: 'var(--font-display)' }}>FAQ</h2>
        <div style={{ borderTop: '1px solid var(--color-border)' }}>
          {FAQS.map(item => (
            <details key={item.q} className="group py-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <summary className="flex justify-between items-center cursor-pointer list-none font-medium text-base">
                {item.q}
                <span style={{ color: 'var(--color-accent)', fontSize: '1.25rem', lineHeight: 1, flexShrink: 0, marginLeft: '1rem' }}>+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-4xl font-semibold mb-6" style={{ fontFamily: 'var(--font-display)' }}>
          Stop chasing.<br />
          <span style={{ color: 'var(--color-accent)' }}>Start hosting.</span>
        </h2>
        <Link href="/register" className="inline-block px-8 py-3 rounded-full font-medium" style={{ backgroundColor: 'var(--color-accent)', color: '#0E1116' }}>
          Create your first event →
        </Link>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-sm flex flex-col sm:flex-row justify-between items-center gap-3" style={{ color: 'var(--color-muted)', borderTop: '1px solid var(--color-border)' }}>
        <p>© 2026 GrumpyWhales</p>
        <div className="flex gap-5">
          <Link href="/privacy" style={{ color: 'var(--color-muted)' }}>Privacy</Link>
          <Link href="/terms"   style={{ color: 'var(--color-muted)' }}>Terms</Link>
        </div>
      </footer>
    </main>
  );
}
