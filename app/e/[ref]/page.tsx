import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { stripe } from '@/lib/stripe';
import { formatEventDateTime, formatMoney, RECURRENCE_LABELS, SIGNUP_MODE_LABELS, type Event } from '@/lib/events';
import type { SignupStatus, PaymentStatus } from '@/lib/signups';
import SignupButton from './SignupButton';

export const dynamic = 'force-dynamic';

// On the post-checkout redirect Stripe may take a few seconds to deliver the
// webhook. Bypass that latency by calling Stripe directly here to confirm the
// session is paid, and update the DB so this render shows the new state.
async function confirmPaymentFromSession(opts: {
  sessionId: string;
  signupId:  string;
}): Promise<boolean> {
  try {
    const sess = await stripe().checkout.sessions.retrieve(opts.sessionId);
    if (sess.payment_status !== 'paid') return false;
    if (sess.client_reference_id !== opts.signupId) return false;   // mismatched — ignore
    const paymentIntentId = typeof sess.payment_intent === 'string' ? sess.payment_intent : null;
    await supabase.from('event_signups').update({
      payment_status:           'paid',
      paid_at:                  new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
      updated_at:               new Date().toISOString(),
    }).eq('id', opts.signupId).eq('payment_status', 'unpaid');   // only flip from unpaid
    return true;
  } catch (err) {
    console.error('[event page] stripe session check failed', err);
    return false;
  }
}

export default async function PublicEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ paid?: string; session_id?: string }>;
}) {
  const { ref } = await params;
  const { paid, session_id } = await searchParams;
  const session = await auth();

  const { data: eventRow } = await supabase
    .from('events')
    .select('*')
    .eq('payment_reference', ref)
    .maybeSingle();
  if (!eventRow || eventRow.status !== 'published') notFound();
  const event: Event = eventRow;

  // Host name (for the by-line) and current accepted-attendee count (for capacity display)
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
      .select('id, status, payment_status')
      .eq('event_id', event.id)
      .eq('profile_id', session.user.profileId)
      .maybeSingle();
    if (mine) {
      currentStatus = mine.status as SignupStatus;
      paymentStatus = mine.payment_status as PaymentStatus;

      // Returned from Stripe Checkout — verify the session directly so we
      // don't have to wait for the asynchronous webhook to update the DB.
      if (paid === '1' && session_id && paymentStatus === 'unpaid') {
        const confirmed = await confirmPaymentFromSession({ sessionId: session_id, signupId: mine.id });
        if (confirmed) paymentStatus = 'paid';
      }
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
                {acceptedCount ?? 0} / {event.capacity} signed up{isFull ? ' · full' : ''}
              </p>
            )}
          </Tile>
        </div>

        {paid === '1' && paymentStatus === 'paid' && (
          <div className="rounded-2xl px-5 py-3 mb-4" style={{ backgroundColor: '#D1FAE5', border: '1px solid #A7F3D0', color: 'var(--color-accent-dk)' }}>
            ✓ <strong>Payment received.</strong> You&apos;re all set — see you at the event.
          </div>
        )}
        {paid === '1' && paymentStatus !== 'paid' && (
          <div className="rounded-2xl px-5 py-3 mb-4" style={{ backgroundColor: '#FFF4B8', border: '1px solid #FCD34D', color: '#7C5800' }}>
            Stripe is processing your payment. This page will refresh in a moment.
          </div>
        )}
        {paid === '0' && (
          <div className="rounded-2xl px-5 py-3 mb-4" style={{ backgroundColor: '#FEE2E2', border: '1px solid var(--color-red)', color: 'var(--color-red)' }}>
            Payment cancelled. You can try again any time.
          </div>
        )}

        <div className="p-6 rounded-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <SignupButton
            eventId={event.id}
            eventStartsAt={event.starts_at}
            feeLabel={Number(event.fee_amount) > 0 ? formatMoney(event.fee_amount, event.fee_currency) : 'Free'}
            hasFee={Number(event.fee_amount) > 0}
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
