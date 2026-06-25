import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/auth';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { stripe } from '@/lib/stripe';
import {
  formatEventDateTime, formatMoney,
  RECURRENCE_LABELS, SIGNUP_MODE_LABELS,
  computeNextOccurrences, occurrenceDate,
  type Event,
} from '@/lib/events';
import type { SignupStatus, PaymentStatus } from '@/lib/signups';
import SignupButton from './SignupButton';

export const dynamic = 'force-dynamic';

type MySignup = {
  id:              string;
  occurrence_date: string;
  status:          SignupStatus;
  payment_status:  PaymentStatus;
};

// Confirm Stripe payment directly from the session id, so the post-checkout
// redirect doesn't have to wait for the asynchronous webhook.
async function confirmPaymentFromSession(opts: { sessionId: string; signupId: string }): Promise<boolean> {
  try {
    const sess = await stripe().checkout.sessions.retrieve(opts.sessionId);
    if (sess.payment_status !== 'paid') return false;
    if (sess.client_reference_id !== opts.signupId) return false;
    const paymentIntentId = typeof sess.payment_intent === 'string' ? sess.payment_intent : null;
    await supabase.from('event_signups').update({
      payment_status:           'paid',
      paid_at:                  new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
      updated_at:               new Date().toISOString(),
    }).eq('id', opts.signupId).eq('payment_status', 'unpaid');
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
  params:       Promise<{ ref: string }>;
  searchParams: Promise<{ paid?: string; session_id?: string; occurrence?: string }>;
}) {
  const { ref } = await params;
  const { paid, session_id, occurrence } = await searchParams;
  const session = await auth();

  const { data: eventRow } = await supabase
    .from('events').select('*').eq('payment_reference', ref).maybeSingle();
  if (!eventRow || eventRow.status !== 'published') notFound();
  const event: Event = eventRow;

  // Upcoming occurrences (next 8 for recurring, single for one-off)
  const occurrencesIso = computeNextOccurrences(event, event.recurrence === 'none' ? 1 : 8);
  const occurrenceDates = occurrencesIso.map(occurrenceDate);

  // Host name + accepted-attendee counts per occurrence + current user's signups
  const [hostRes, acceptedRowsRes, mySignupsRes] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', event.admin_id).maybeSingle(),
    occurrenceDates.length
      ? supabase.from('event_signups').select('occurrence_date')
          .eq('event_id', event.id).eq('status', 'accepted').in('occurrence_date', occurrenceDates)
      : Promise.resolve({ data: [] as { occurrence_date: string }[] }),
    session?.user?.profileId && occurrenceDates.length
      ? supabase.from('event_signups')
          .select('id, occurrence_date, status, payment_status')
          .eq('event_id', event.id).eq('profile_id', session.user.profileId)
          .in('occurrence_date', occurrenceDates)
      : Promise.resolve({ data: [] as MySignup[] }),
  ]);

  const host: { name: string | null } | null = hostRes.data;
  const countByDate = new Map<string, number>();
  for (const r of (acceptedRowsRes.data ?? []) as { occurrence_date: string }[]) {
    countByDate.set(r.occurrence_date, (countByDate.get(r.occurrence_date) ?? 0) + 1);
  }
  const myByDate = new Map<string, MySignup>();
  for (const r of (mySignupsRes.data ?? []) as MySignup[]) myByDate.set(r.occurrence_date, r);

  // Post-checkout: confirm with Stripe synchronously for the right signup.
  if (paid === '1' && session_id && occurrence) {
    const mine = myByDate.get(occurrence);
    if (mine && mine.payment_status === 'unpaid') {
      const ok = await confirmPaymentFromSession({ sessionId: session_id, signupId: mine.id });
      if (ok) myByDate.set(occurrence, { ...mine, payment_status: 'paid' });
    }
  }

  const hasFee   = Number(event.fee_amount) > 0;
  const feeLabel = hasFee ? formatMoney(event.fee_amount, event.fee_currency) : 'Free';
  const loginRef = `/login?redirect=${encodeURIComponent(`/e/${ref}`)}`;
  const isRecurring = event.recurrence !== 'none';
  const isHost      = session?.user?.profileId === event.admin_id;

  return (
    <main className="min-h-screen">
      <nav className="max-w-4xl mx-auto px-6 py-5 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)', textDecoration: 'none' }}>
          <Image src="/logo.png" alt="GrumpyWhales" width={36} height={36} priority style={{ borderRadius: 6 }} />
          GrumpyWhales
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {isHost && (
            <Link href={`/dashboard/events/${event.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium"
              style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-fg)', border: '1px solid var(--color-border)', textDecoration: 'none' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Settings
            </Link>
          )}
          {session ? (
            <Link href="/dashboard/events" style={{ color: 'var(--color-muted)' }}>My events →</Link>
          ) : (
            <Link href={loginRef} style={{ color: 'var(--color-muted)' }}>Sign in</Link>
          )}
        </div>
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
          <Tile label="Where">
            <p className="text-sm font-medium whitespace-pre-wrap">{event.location ?? 'TBA'}</p>
          </Tile>
          <Tile label="Fee">
            <p className="text-sm font-medium">{feeLabel}</p>
            {hasFee && <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>per session</p>}
          </Tile>
          <Tile label="Sign-up">
            <p className="text-sm font-medium">{SIGNUP_MODE_LABELS[event.signup_mode]}</p>
            {event.capacity != null && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                Capacity: {event.capacity} per session
              </p>
            )}
          </Tile>
          {isRecurring && (
            <Tile label="Cadence">
              <p className="text-sm font-medium">{RECURRENCE_LABELS[event.recurrence]}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                Starts {formatEventDateTime(event.starts_at)}
              </p>
            </Tile>
          )}
        </div>

        <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          {isRecurring ? 'Upcoming sessions' : 'When'}
        </h2>

        {occurrencesIso.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>This event has already happened.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {occurrencesIso.map(iso => {
              const date = occurrenceDate(iso);
              const accepted = countByDate.get(date) ?? 0;
              const isFull = event.capacity != null && accepted >= event.capacity;
              const isCancelled    = (event.cancelled_dates ?? []).includes(date);
              const listPublished  = (event.published_occurrence_dates ?? []).includes(date);
              const mine = myByDate.get(date) ?? null;
              const justPaid = paid === '1' && occurrence === date && mine?.payment_status === 'paid';
              const justCancelled = paid === '0' && occurrence === date;
              return (
                <div key={date} className="p-5 rounded-2xl flex items-start justify-between gap-4 flex-wrap"
                  style={{
                    backgroundColor: isCancelled ? '#FAFAFA' : 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    opacity: isCancelled ? 0.75 : 1,
                  }}>
                  <div className="min-w-0">
                    <p className="text-base font-semibold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)', textDecoration: isCancelled ? 'line-through' : undefined }}>
                      {formatEventDateTime(iso)}
                    </p>
                    {isCancelled ? (
                      <p className="text-xs mt-1 font-semibold uppercase tracking-wider" style={{ color: 'var(--color-red)' }}>
                        Cancelled by host
                      </p>
                    ) : (
                      <>
                        {event.capacity != null && (
                          <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                            {accepted} / {event.capacity} on the list{isFull ? ' · full' : ''}
                          </p>
                        )}
                        {justPaid && (
                          <p className="text-xs mt-1" style={{ color: 'var(--color-accent-dk)' }}>✓ Payment received — see you there.</p>
                        )}
                        {justCancelled && (
                          <p className="text-xs mt-1" style={{ color: 'var(--color-red)' }}>Payment cancelled. You can try again.</p>
                        )}
                      </>
                    )}
                  </div>
                  {!isCancelled && (
                    <SignupButton
                      eventId={event.id}
                      occurrenceDate={date}
                      occurrenceIso={iso}
                      feeLabel={feeLabel}
                      hasFee={hasFee}
                      signedIn={!!session}
                      loginHref={loginRef}
                      currentStatus={mine?.status ?? null}
                      paymentStatus={mine?.payment_status ?? null}
                      signupMode={event.signup_mode}
                      isFull={isFull}
                      listPublished={listPublished}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

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
