import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { formatEventDateTime, formatMoney, RECURRENCE_LABELS, SIGNUP_MODE_LABELS, type Event } from '@/lib/events';
import type { SignupStatus, PaymentStatus } from '@/lib/signups';
import SignupButton from './SignupButton';

export const dynamic = 'force-dynamic';

export default async function PublicEventPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const session = await auth();

  const { data: eventRow } = await supabase
    .from('events')
    .select('*')
    .eq('payment_reference', ref)
    .maybeSingle();
  if (!eventRow || eventRow.status !== 'published') notFound();
  const event: Event = eventRow;

  // Host name (for the by-line) and current accepted-roster count (for capacity display)
  const [hostRes, countRes] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', event.admin_id).maybeSingle(),
    supabase.from('event_signups').select('id', { head: true, count: 'exact' }).eq('event_id', event.id).eq('status', 'accepted'),
  ]);
  const host: { name: string | null } | null = hostRes.data;
  const acceptedCount = countRes.count;

  // Current user's signup (if any)
  let currentStatus:  SignupStatus  | null = null;
  let paymentStatus:  PaymentStatus | null = null;
  if (session?.user?.profileId) {
    const { data: mine } = await supabase
      .from('event_signups')
      .select('status, payment_status')
      .eq('event_id', event.id)
      .eq('profile_id', session.user.profileId)
      .maybeSingle();
    if (mine) {
      currentStatus = mine.status as SignupStatus;
      paymentStatus = mine.payment_status as PaymentStatus;
    }
  }

  const isFull   = event.capacity != null && (acceptedCount ?? 0) >= event.capacity;
  const loginRef = `/login?redirect=${encodeURIComponent(`/e/${ref}`)}`;

  return (
    <main className="min-h-screen">
      <nav className="max-w-4xl mx-auto px-6 py-5 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)', textDecoration: 'none' }}>
          <Image src="/logo.png" alt="GrumpyWhales" width={36} height={36} priority style={{ borderRadius: 6 }} />
          GrumpyWhales
        </Link>
        {session ? (
          <Link href="/dashboard/attending" className="text-sm" style={{ color: 'var(--color-muted)' }}>My events →</Link>
        ) : (
          <Link href={loginRef} className="text-sm" style={{ color: 'var(--color-muted)' }}>Sign in</Link>
        )}
      </nav>

      <section className="max-w-2xl mx-auto px-6 pt-8 pb-12">
        <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--color-muted)' }}>
          {host?.name ? `Hosted by ${host.name}` : 'Hosted on GrumpyWhales'}
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6" style={{ fontFamily: 'var(--font-display)' }}>
          {event.title}
        </h1>

        {event.description && (
          <p className="text-base leading-relaxed mb-8 whitespace-pre-wrap" style={{ color: 'var(--color-fg)' }}>
            {event.description}
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <Tile label="When">
            <p className="text-sm font-medium">{formatEventDateTime(event.starts_at)}</p>
            {event.ends_at && <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>until {formatEventDateTime(event.ends_at)}</p>}
            {event.recurrence !== 'none' && <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>↻ Repeats {RECURRENCE_LABELS[event.recurrence].toLowerCase()}</p>}
          </Tile>
          <Tile label="Where">
            <p className="text-sm font-medium whitespace-pre-wrap">{event.location ?? 'TBA'}</p>
          </Tile>
          <Tile label="Fee">
            <p className="text-sm font-medium">{Number(event.fee_amount) > 0 ? formatMoney(event.fee_amount, event.fee_currency) : 'Free'}</p>
            {Number(event.fee_amount) > 0 && <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>per attendee</p>}
          </Tile>
          <Tile label="Sign-up">
            <p className="text-sm font-medium">{SIGNUP_MODE_LABELS[event.signup_mode]}</p>
            {event.capacity != null && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                {acceptedCount ?? 0} / {event.capacity} on the roster{isFull ? ' · full' : ''}
              </p>
            )}
          </Tile>
        </div>

        <div className="p-6 rounded-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <SignupButton
            eventId={event.id}
            eventStartsAt={event.starts_at}
            signedIn={!!session}
            loginHref={loginRef}
            currentStatus={currentStatus}
            paymentStatus={paymentStatus}
            signupMode={event.signup_mode}
            isFull={isFull}
          />
        </div>

        <p className="text-xs mt-8" style={{ color: 'var(--color-muted)' }}>
          Reference: <code>{event.payment_reference}</code>
        </p>
      </section>
    </main>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--color-muted)' }}>{label}</p>
      {children}
    </div>
  );
}
