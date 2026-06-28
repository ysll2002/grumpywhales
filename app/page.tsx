import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/auth';

const ORG_LD = {
  '@context': 'https://schema.org',
  '@type':    'SportsClub',
  name:       'GA Football Club',
  url:        'https://grumpywhales.com',
  sport:      'Association Football',
  description:
    'GA Football Club plays Friday night football at Kings House School sports ground. Mixed-ability, friendly, all welcome.',
  location: {
    '@type': 'Place',
    name:    'Kings House School sports ground',
  },
};

const FAQS = [
  {
    q: 'When and where do you play?',
    a: 'Friday nights at Kings House School sports ground. Kick-off time and the joinable session for the week are shown on your dashboard once you sign in.',
  },
  {
    q: 'What level of player are you looking for?',
    a: 'Any. The club is mixed-ability — what we care about is that you turn up, play hard, and play fair. Beginners are welcome alongside experienced players.',
  },
  {
    q: 'How do I sign up for a Friday?',
    a: "Create an account, head to 'Join event', and request to attend the upcoming Friday. The club admin publishes the final list each week and you'll get an email when you're on it.",
  },
  {
    q: 'Is there a fee?',
    a: "Yes — a small per-session fee to cover pitch hire. The amount and your payment status show up on your dashboard once you're on the final list.",
  },
  {
    q: 'Can I bring a friend?',
    a: "Of course. Ask them to create an account and request to join — the more the merrier (as long as we don't blow past the pitch capacity).",
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

export default async function Home() {
  const session = await auth();
  const signedIn = !!session?.user?.profileId;
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />

      <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex justify-between items-center gap-3">
        <Link href="/" className="flex items-center gap-2 text-base sm:text-xl font-bold min-w-0" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)', textDecoration: 'none' }}>
          <Image src="/logo.png" alt="GA Football Club" width={32} height={32} priority style={{ borderRadius: 6 }} />
          <span className="truncate">GA Football Club</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4 text-sm flex-shrink-0">
          <Link href="#what-to-expect" className="text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] hidden sm:inline">What to expect</Link>
          <Link href="#faq"            className="text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] hidden sm:inline">FAQ</Link>
          {signedIn ? (
            <Link href="/dashboard/events" className="px-4 sm:px-5 py-2 rounded-full font-medium whitespace-nowrap" style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', textDecoration: 'none' }}>
              Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login"    className="text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] hidden sm:inline">Log in</Link>
              <Link href="/register" className="px-4 sm:px-5 py-2 rounded-full font-medium whitespace-nowrap" style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}>
                Join the club
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section className="pitch-bg">
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <div className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-6" style={{ backgroundColor: 'var(--color-yellow)', color: 'var(--color-dark)', letterSpacing: '0.06em' }}>
            FRIDAY NIGHT FOOTBALL
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            GA Football Club
          </h1>
          <p className="text-lg sm:text-xl mb-3" style={{ color: 'var(--color-fg)' }}>
            Friday night, <strong>Kings House School sports ground</strong>.
          </p>
          <p className="text-2xl sm:text-3xl font-bold mb-10" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}>
            Enjoy football. Enjoy friendship.
          </p>
          <Link href={signedIn ? '/dashboard/events' : '/register'} className="inline-block px-8 py-3 rounded-full font-medium text-base" style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', textDecoration: 'none' }}>
            {signedIn ? 'Open dashboard →' : 'Join the club →'}
          </Link>
        </div>
      </section>

      {/* WHAT TO EXPECT */}
      <section id="what-to-expect" className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-semibold mb-12 text-center" style={{ fontFamily: 'var(--font-display)' }}>
          What to expect
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              n: '1',
              title: 'Friday night kick-offs',
              body: 'Every Friday evening. Come straight from work, leave with a smile and tired legs.',
            },
            {
              n: '2',
              title: 'Kings House sports ground',
              body: 'A proper pitch under the lights. Showers and changing rooms on site.',
            },
            {
              n: '3',
              title: 'Mixed-ability, all welcome',
              body: 'Friendly games. Whether you used to play county or just love a kick-around, you fit in.',
            },
          ].map(step => (
            <div key={step.n} className="p-6 rounded-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center mb-4 font-bold" style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', fontFamily: 'var(--font-display)' }}>
                {step.n}
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>{step.title}</h3>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-semibold mb-3 text-center" style={{ fontFamily: 'var(--font-display)' }}>
          How to join a Friday
        </h2>
        <p className="text-center mb-12 max-w-2xl mx-auto" style={{ color: 'var(--color-muted)' }}>
          Three steps. No app to install, no group chats to chase.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {[
            { title: 'Create an account',     body: 'Email + password, or sign in with Google. Takes thirty seconds.' },
            { title: 'Request the next Friday', body: "From 'Join event', tap Request to attend on the upcoming session." },
            { title: 'Get confirmed & pay',   body: "We'll email you when you're on the final list, then settle the session fee right from your dashboard." },
          ].map(item => (
            <div key={item.title} className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <h3 className="text-base font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>{item.title}</h3>
              <p style={{ color: 'var(--color-muted)' }}>{item.body}</p>
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
          See you<br />
          <span style={{ color: 'var(--color-accent)' }}>on Friday night.</span>
        </h2>
        <Link href={signedIn ? '/dashboard/events' : '/register'} className="inline-block px-8 py-3 rounded-full font-medium" style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', textDecoration: 'none' }}>
          {signedIn ? 'Open dashboard →' : 'Join the club →'}
        </Link>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-sm flex flex-col sm:flex-row justify-between items-center gap-3" style={{ color: 'var(--color-muted)', borderTop: '1px solid var(--color-border)' }}>
        <p>© 2026 GA Football Club</p>
        <div className="flex gap-5">
          <Link href="/privacy" style={{ color: 'var(--color-muted)' }}>Privacy</Link>
          <Link href="/terms"   style={{ color: 'var(--color-muted)' }}>Terms</Link>
        </div>
      </footer>
    </main>
  );
}
