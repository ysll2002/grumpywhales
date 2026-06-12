import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen">
      <nav className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)', textDecoration: 'none' }}>
          <Image src="/logo.png" alt="GrumpyWhales" width={36} height={36} priority style={{ borderRadius: 6 }} />
          GrumpyWhales
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/login"    className="text-[color:var(--color-muted)] hover:text-white">Log in</Link>
          <Link href="/register" className="px-5 py-2 rounded-full font-medium" style={{ backgroundColor: 'var(--color-accent)', color: '#0E1116' }}>
            Get started
          </Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 pt-24 pb-12 text-center">
        <div className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-6" style={{ backgroundColor: '#1E4736', color: '#34D399', letterSpacing: '0.04em' }}>
          FREE · NO CARD REQUIRED
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6" style={{ fontFamily: 'var(--font-display)' }}>
          Get paid faster.<br />
          <span style={{ color: 'var(--color-accent)' }}>Without nagging.</span>
        </h1>
        <p className="text-lg text-[color:var(--color-muted)] max-w-2xl mx-auto mb-10">
          Send invoices to your clients. GrumpyWhales watches your bank account and chases overdue
          payments for you — politely, then less politely. Say thank you when the money arrives.
        </p>
        <Link href="/register" className="inline-block px-8 py-3 rounded-full font-medium text-base" style={{ backgroundColor: 'var(--color-accent)', color: '#0E1116' }}>
          Get started — it&apos;s free →
        </Link>
        <p className="text-xs text-[color:var(--color-muted)] mt-4">
          Always free · No card · No upgrade prompts · UK bank accounts via Plaid
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Send invoices',    body: 'Create, customise and send invoices to clients in seconds. PDF + payment reference auto-generated.' },
          { title: 'Auto-detect paid', body: 'We watch your UK bank account via Plaid Open Banking and mark invoices paid as soon as money lands.' },
          { title: 'Chase + thank',    body: 'Overdue? GrumpyWhales sends polite (then firmer) reminders. Paid? A thank-you note goes out automatically.' },
        ].map(f => (
          <div key={f.title} className="p-6 rounded-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-fg)' }}>{f.title}</h3>
            <p className="text-sm text-[color:var(--color-muted)]">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-20 text-center">
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

      <footer className="max-w-5xl mx-auto px-6 py-10 border-t text-sm flex justify-between" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
        <span>© {new Date().getFullYear()} GrumpyWhales</span>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/terms"   className="hover:text-white">Terms</Link>
        </div>
      </footer>
    </main>
  );
}
